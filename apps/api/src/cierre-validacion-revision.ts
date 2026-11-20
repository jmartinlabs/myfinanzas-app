import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import {
  construirDetalleValidacion,
  esDecimalCanonico,
  serializarDetalleValidacion,
  type CoberturaValidada,
  type DetalleValidacion,
} from "./cierre-validacion-dto";
import { Problem } from "./problem";

/**
 * SPEC38 · I1 — guarda de la revisión humana (§2.4).
 *
 * Confirmar la revisión de un ciclo pendiente es la **única** limpieza de la
 * marca `dirty`. Por eso no basta con que la fila cambie: la limpieza exige una
 * referencia humana **nueva** del estado actual, y esta guarda es la puerta del
 * servicio, gemela de los triggers `cierre_validacion_referencia_nueva` y
 * `cierre_validacion_confirmacion`.
 *
 * Una confirmación válida cumple las tres condiciones a la vez:
 *  (a) `huella_validacion` y `version_conjunto` describen el conjunto vigente:
 *      no se puede reapuntar una validación existente a otra versión de
 *      conjunto ni inventar una huella que no se midió;
 *  (b) `revision_instante` es **estrictamente posterior** a `dirty_ultimo`, a
 *      `dirty_desde` y a la referencia humana anterior: reutilizar
 *      actor+instante+huella de la validación previa falla;
 *  (c) la fila avanza exactamente a `revision+1`.
 *
 * La huella puede coincidir con la anterior —caso `pendienteSinDelta`, donde el
 * conjunto volvió a la referencia— porque lo que no puede repetirse es la
 * evidencia (actor+instante), no el valor medido. Un instante igual o anterior
 * se rechaza siempre, así que la repetición literal del recibo de validación es
 * imposible, no solo improbable.
 *
 * El módulo no expone rutas ni UI: es la guarda y el escritor mínimo que I2
 * reutiliza, y lo que las pruebas ejercitan junto al trigger equivalente.
 */

const HUELLA = /^[a-f0-9]{64}$/;
const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Estado de la fila que la guarda necesita leer, sin campos financieros. */
export type EstadoValidacionActual = {
  ciclo: string;
  revision: number;
  dirty: boolean;
  dirtyDesde: string | null;
  dirtyUltimo: string | null;
  huella: string | null;
  versionConjunto: string | null;
  actor: string | null;
  instante: string | null;
  cobertura: string;
};

/** Referencia humana normalizada: la que se escribe si la guarda la acepta. */
export type ReferenciaHumana = {
  huella: string;
  versionConjunto: string;
  actor: string;
  instante: string;
  motivo: string | null;
};

/** Entrada del servicio de confirmación: la revisión leída en la transacción. */
export type ConfirmacionRevision = {
  huella: string;
  versionConjunto: string;
  actor: string;
  instante: string;
  motivo?: string | null;
  revisionEsperada: number;
};

function rechazo(campo: string, motivo: string, code = "VALIDATION"): never {
  throw new Problem(422, code, `Revisión de validación inválida en «${campo}»: ${motivo}.`, {
    [campo]: motivo,
  });
}

function conflicto(campo: string, motivo: string, code: string): never {
  throw new Problem(409, code, `Revisión de validación rechazada: ${motivo}.`, {
    [campo]: motivo,
  });
}

/**
 * Compara instantes del dominio: el formato es fijo (UTC con milisegundos), así
 * que el orden lexicográfico es el orden temporal. Se comprueba el formato
 * antes de comparar para no comparar textos que no son instantes.
 */
function instanteValido(valor: unknown, campo: string): string {
  if (typeof valor !== "string" || !INSTANTE.test(valor))
    rechazo(campo, "se esperaba un instante UTC con milisegundos");
  if (Number.isNaN(Date.parse(valor)))
    rechazo(campo, "instante de calendario imposible");
  return valor;
}

/**
 * Guarda pura de §2.4. No escribe: devuelve la referencia normalizada o lanza
 * `Problem` 422/409. Cualquier intento de reutilizar evidencia anterior cae
 * aquí antes de tocar la base.
 */
export function exigirRevisionHumanaNueva(
  actual: EstadoValidacionActual,
  entrada: ConfirmacionRevision,
): ReferenciaHumana {
  if (!actual.dirty)
    conflicto("ciclo", "el ciclo no está pendiente de revisión", "VALIDATION_NOT_PENDING");

  if (!Number.isSafeInteger(entrada.revisionEsperada) || entrada.revisionEsperada < 1)
    rechazo("revisionEsperada", "se esperaba una revisión positiva");
  if (entrada.revisionEsperada !== actual.revision)
    conflicto(
      "revisionEsperada",
      `la revisión cambió: se leyó ${actual.revision} y se envió ${entrada.revisionEsperada}`,
      "VALIDATION_REVISION_CONFLICT",
    );

  const huella =
    typeof entrada.huella === "string" && HUELLA.test(entrada.huella)
      ? entrada.huella
      : rechazo("huella", "se esperaba una huella SHA-256 en minúsculas");

  const versionConjunto = esDecimalCanonico(entrada.versionConjunto)
    ? entrada.versionConjunto
    : rechazo("versionConjunto", "se esperaba texto decimal canónico");

  const actor =
    typeof entrada.actor === "string" &&
    entrada.actor.trim().length > 0 &&
    entrada.actor.length <= 200
      ? entrada.actor
      : rechazo("actor", "se esperaba un actor humano no vacío");

  const instante = instanteValido(entrada.instante, "instante");

  const motivo =
    entrada.motivo === undefined || entrada.motivo === null
      ? null
      : typeof entrada.motivo === "string" &&
          entrada.motivo.trim().length > 0 &&
          entrada.motivo.length <= 1000
        ? entrada.motivo
        : rechazo("motivo", "se esperaba un motivo humano acotado");

  // (a) El conjunto vigente no se cambia al confirmar una revisión.
  if (actual.versionConjunto !== null && versionConjunto !== actual.versionConjunto)
    rechazo(
      "versionConjunto",
      `la confirmación no reapunta la referencia: el conjunto vigente es ${actual.versionConjunto}`,
      "VALIDATION_CONTEXT_CHANGED",
    );

  // (b) Evidencia nueva: posterior a las marcas de pendiente y a la referencia previa.
  for (const [campo, anterior] of [
    ["dirtyDesde", actual.dirtyDesde],
    ["dirtyUltimo", actual.dirtyUltimo],
    ["instante", actual.instante],
  ] as const) {
    if (anterior === null) continue;
    if (instante <= anterior)
      rechazo(
        "instante",
        `la revisión humana exige un instante posterior a ${campo} (${anterior})`,
        "VALIDATION_EVIDENCE_REUSED",
      );
  }

  if (
    actual.actor !== null &&
    actual.instante !== null &&
    actual.huella !== null &&
    actual.actor === actor &&
    actual.instante === instante &&
    actual.huella === huella
  )
    rechazo(
      "huella",
      "reutiliza actor, instante y huella de la revisión anterior",
      "VALIDATION_EVIDENCE_REUSED",
    );

  return { huella, versionConjunto, actor, instante, motivo };
}

type FilaValidacion = {
  ciclo: string;
  revision: number;
  dirty: number;
  dirty_desde: string | null;
  dirty_ultimo: string | null;
  huella_validacion: string | null;
  version_conjunto: string | null;
  revision_actor: string | null;
  revision_instante: string | null;
  revision_motivo: string | null;
  cobertura: string;
};

function leerEstado(db: Database, ciclo: string): EstadoValidacionActual {
  const fila = db
    .query(
      `SELECT ciclo,revision,dirty,dirty_desde,dirty_ultimo,huella_validacion,
              version_conjunto,revision_actor,revision_instante,revision_motivo,cobertura
         FROM cierre_validacion WHERE ciclo=?`,
    )
    .get(ciclo) as FilaValidacion | null;
  if (!fila) conflicto("ciclo", "el ciclo no tiene fila de validación", "VALIDATION_NOT_FOUND");
  return {
    ciclo: fila.ciclo,
    revision: fila.revision,
    dirty: fila.dirty === 1,
    dirtyDesde: fila.dirty_desde,
    dirtyUltimo: fila.dirty_ultimo,
    huella: fila.huella_validacion,
    versionConjunto: fila.version_conjunto,
    actor: fila.revision_actor,
    instante: fila.revision_instante,
    cobertura: fila.cobertura,
  };
}

export type ResultadoConfirmacion = {
  ciclo: string;
  revision: number;
  auditId: number;
  huella: string;
};

/**
 * Confirmación de la revisión de un ciclo pendiente: guarda de §2.4 y escritura
 * de la nueva referencia + evento `confirmar_revision` en una sola transacción.
 * No hay ruta HTTP: I2 es quien la expone.
 */
export function confirmarRevisionValidacion(
  db: Database,
  ciclo: string,
  entrada: ConfirmacionRevision,
): ResultadoConfirmacion {
  if (!esDecimalCanonico(ciclo))
    rechazo("ciclo", "se esperaba un id de ciclo decimal canónico");

  return db
    .transaction((): ResultadoConfirmacion => {
      const actual = leerEstado(db, ciclo);
      const referencia = exigirRevisionHumanaNueva(actual, entrada);
      const revision = actual.revision + 1;

      const cambio = db.run(
        `UPDATE cierre_validacion
            SET revision=?,dirty=0,dirty_desde=NULL,dirty_ultimo=NULL,
                dirty_origen=NULL,dirty_motivos=NULL,huella_validacion=?,
                version_conjunto=?,revision_actor=?,revision_instante=?,revision_motivo=?
          WHERE ciclo=? AND revision=? AND dirty=1`,
        [
          revision,
          referencia.huella,
          referencia.versionConjunto,
          referencia.actor,
          referencia.instante,
          referencia.motivo,
          ciclo,
          actual.revision,
        ],
      );
      if (cambio.changes !== 1)
        conflicto("ciclo", "la fila cambió durante la confirmación", "VALIDATION_REVISION_CONFLICT");

      const detalle: DetalleValidacion = construirDetalleValidacion({
        hechos: [],
        ciclos: [{ id: ciclo, impactos: [] }],
        cobertura: JSON.parse(actual.cobertura) as CoberturaValidada[],
        procedencia: null,
      });
      const evento = db.run(
        `INSERT INTO cierre_validacion_audit(ciclo,revision,accion,actor,instante,
           motivo,intento,correlacion,origen,huella_anterior,huella_posterior,detalle)
         VALUES(?,?,'confirmar_revision',?,?,?,NULL,?,NULL,?,?,?)`,
        [
          ciclo,
          revision,
          referencia.actor,
          referencia.instante,
          referencia.motivo,
          `REVISION:${revision}:${createHash("sha256")
            .update(`${actual.huella ?? ""}|${referencia.huella}`, "utf8")
            .digest("hex")
            .slice(0, 32)}`,
          actual.huella,
          referencia.huella,
          serializarDetalleValidacion(detalle),
        ],
      );

      return {
        ciclo,
        revision,
        auditId: Number(evento.lastInsertRowid),
        huella: referencia.huella,
      };
    })
    .immediate();
}
