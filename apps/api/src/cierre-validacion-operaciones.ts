import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { cycleMaster } from "./ciclos";
import {
  construirDetalleValidacion,
  serializarDetalleValidacion,
  type CoberturaValidada,
  type DetalleValidacion,
  type ImpactoMaterial,
} from "./cierre-validacion-dto";
import {
  exigirEstadoValidacionDisponible,
  leerFilaValidacion,
  proyectarValidacion,
  type EstadoVisible,
} from "./cierre-validacion-estado";
import {
  huellaDe,
  impactoDeCandidatos,
  jsonCanonico,
  medirCandidatos,
  universoFinanciero,
  type ImpactoMedido,
  type UniversoFinanciero,
} from "./cierre-validacion-impacto";
import { Problem } from "./problem";

/**
 * SPEC38 · I2 — envoltorio de previsualización y confirmación (§3.4, G9).
 *
 * El envoltorio es **uno** para todas las escrituras que I2 expone, y cumple
 * las cuatro garantías que la SPEC separa:
 *
 * 1. **Dry-run sin efectos.** El preview toma `antes`, abre un `SAVEPOINT`,
 *    aplica el mismo procedimiento de dominio, mide el `después` y deshace
 *    **todo** —hechos, auditorías, marcas, capacidades y contadores—. Cancelar
 *    no deja intento ni auditoría porque no hay ninguna escritura confirmada.
 * 2. **Precedencia normativa** (ANEXO §1): clave completada → gate → estructura
 *    y existencia → revisión de movimiento → revisión de vínculo → contexto e
 *    impacto → guardas de dominio. Una clave completada se resuelve **antes** de
 *    evaluar revisiones ya obsoletas: mismo hash reproduce el recibo, hash
 *    distinto es `409 IDEMPOTENCY_CONFLICT`.
 * 3. **Tokens del estado, no del payload.** `contextRevision` cubre el estado
 *    estructural que la operación lee; `impactRevision` cubre el resultado
 *    medido. Ninguno sustituye a `fingerprint`, que identifica el payload.
 *    Cualquier diferencia con lo mostrado es `409 IMPACT_CHANGED` sin efectos.
 * 4. **Atomicidad.** `BEGIN IMMEDIATE` con `busy_timeout=3000`, un único
 *    `COMMIT` y verificación de invariantes antes de él: hecho, autorización,
 *    auditoría, estado e idempotencia confirman juntos o no confirman.
 *
 * La materialidad la decide `impactoOperacion` —antes/después del mismo
 * universo—, nunca la divergencia con la referencia humana.
 */

export const OPERACIONES_CONFIRMABLES = [
  "validar",
  "revalidar",
  "confirmar_revision",
  "rectificar_inicio",
  "rectificar_s0",
] as const;
export type OperacionConfirmable = (typeof OPERACIONES_CONFIRMABLES)[number];

/** Revisión estructural que la operación espera leer (§2.4). */
export type RevisionEsperada = {
  tipo: "ciclo" | "vinculo";
  ciclo: string;
  revision: number;
};

export type Procedimiento = {
  operacion: OperacionConfirmable;
  /**
   * Familia estable de la operación para `fingerprint` e idempotencia. No
   * depende del estado: validar y revalidar comparten familia, porque el mismo
   * intento repetido debe reproducir su recibo aunque la fila ya haya pasado a
   * `Validada` (§3.4 paso 4, AC-10).
   */
  familia?: string;
  /** Ciclos cuyo estado/revisión toca la operación; ordenados. */
  ciclos: readonly string[];
  /** Ciclos que se miden antes/después (§3.3). */
  candidatos: readonly string[];
  /** Payload funcional de la operación: identifica `fingerprint`. */
  payload: unknown;
  /** Estado estructural que la operación lee: `contextRevision`. */
  contexto: () => unknown;
  /** Revisiones que deben seguir vigentes al confirmar. */
  revisiones?: readonly RevisionEsperada[];
  /** Guardas reales de dominio, evaluadas por su propio motivo. */
  guardas?: () => void;
  /** Procedimiento de dominio: escribe hechos y auditoría propia. */
  aplicar: () => void;
  /** Cobertura declarada por la lectura que hizo el procedimiento. */
  cobertura?: () => CoberturaValidada[];
};

export type AfectadoDto = {
  ciclo: string;
  rango: { desde: string; hasta: string };
  material: boolean;
  motivos: ImpactoMaterial[];
  noDisponible: string[];
  estadoValidacion: EstadoVisible;
  validado: boolean;
  dirtyPrevio: boolean;
};

export type PreviewOperacionDto = {
  operacion: OperacionConfirmable;
  fingerprint: string;
  contextRevision: string;
  impactRevision: string;
  /** `null` cuando nada medido cambió pero algún componente no es medible. */
  material: boolean | null;
  afectados: AfectadoDto[];
  cobertura: CoberturaValidada[];
  requiereMotivo: boolean;
  noStore: true;
};

export type ReciboConfirmacion = {
  operacionId: string;
  ciclos: { id: string; revision: string; estado: EstadoVisible }[];
  auditIds: string[];
  cierresDirty: {
    ciclo: string;
    rango: { desde: string; hasta: string };
    estadoValidacion: EstadoVisible;
    validado: boolean;
    dirtyPrevio: boolean;
  }[];
};

export type EntradaConfirmacion = {
  key: string;
  fingerprint: string;
  contextRevision: string;
  impactRevision: string;
  motivo?: string | null;
  actor: string;
  instante: string;
};

const CLAVE = /^[A-Za-z0-9][A-Za-z0-9:._-]{7,199}$/;
const HUELLA = /^[a-f0-9]{64}$/;

function rechazo(campo: string, motivo: string, code = "VALIDATION"): never {
  throw new Problem(422, code, `Operación de validación inválida en «${campo}»: ${motivo}.`, {
    [campo]: motivo,
  });
}

function conflicto(code: string, mensaje: string, detalle?: Record<string, string>): never {
  throw new Problem(409, code, mensaje, detalle);
}

/** Rango del ciclo para el recibo; un ciclo sin Fin no se valida, pero el
 * recibo de otras operaciones todavía puede nombrarlo con su Inicio. */
function rangoDe(db: Database, ciclo: string): { desde: string; hasta: string } {
  const maestro = cycleMaster(db).find((entrada) => entrada.id === ciclo);
  if (!maestro) throw new Problem(404, "NOT_FOUND", "Ciclo no encontrado.");
  const desde = maestro.inicio;
  const hasta = maestro.fin ?? desde;
  return { desde, hasta: hasta >= desde ? hasta : desde };
}

function afectadosDe(
  db: Database,
  impactos: readonly ImpactoMedido[],
): AfectadoDto[] {
  return impactos
    .filter((impacto) => impacto.material)
    .map((impacto) => {
      const validacion = proyectarValidacion(db, impacto.ciclo);
      return {
        ciclo: impacto.ciclo,
        rango: rangoDe(db, impacto.ciclo),
        material: impacto.material,
        motivos: impacto.motivos,
        noDisponible: impacto.noDisponible,
        estadoValidacion: validacion.estado,
        validado: validadoDe(validacion),
        dirtyPrevio: validacion.estado === "Pendiente",
      };
    });
}

/** `validado` de ANEXO §3: referencia humana comparable, no «existe fila». */
function validadoDe(validacion: ReturnType<typeof proyectarValidacion>): boolean {
  return validacion.validado;
}

function contextRevisionDe(procedimiento: Procedimiento): string {
  return huellaDe({
    operacion: procedimiento.operacion,
    ciclos: [...procedimiento.ciclos].sort(),
    contexto: procedimiento.contexto(),
  });
}

function impactRevisionDe(
  fingerprint: string,
  antes: ReadonlyMap<string, UniversoFinanciero>,
  despues: ReadonlyMap<string, UniversoFinanciero>,
  impactos: readonly ImpactoMedido[],
): string {
  return huellaDe({
    fingerprint,
    antes: [...antes.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([ciclo, lectura]) => [ciclo, huellaDe(lectura)]),
    despues: [...despues.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([ciclo, lectura]) => [ciclo, huellaDe(lectura)]),
    impactos: impactos.map((impacto) => ({
      ciclo: impacto.ciclo,
      motivos: impacto.motivos,
      noDisponible: impacto.noDisponible,
    })),
  });
}

const SAVEPOINT = "validacion_dry_run";

/**
 * Ejecuta el procedimiento en un `SAVEPOINT` y lo deshace siempre. Devuelve las
 * dos lecturas del universo; ninguna escritura sobrevive a esta función.
 */
function medirEnDryRun(
  db: Database,
  procedimiento: Procedimiento,
): { antes: Map<string, UniversoFinanciero>; despues: Map<string, UniversoFinanciero> } {
  const candidatos = [...new Set(procedimiento.candidatos)].sort();
  const antes = medirCandidatos(db, candidatos);
  db.run(`SAVEPOINT ${SAVEPOINT}`);
  try {
    procedimiento.guardas?.();
    procedimiento.aplicar();
  } catch (error) {
    db.run(`ROLLBACK TO ${SAVEPOINT}`);
    db.run(`RELEASE ${SAVEPOINT}`);
    throw error;
  }
  const despues = medirCandidatos(db, candidatos);
  db.run(`ROLLBACK TO ${SAVEPOINT}`);
  db.run(`RELEASE ${SAVEPOINT}`);
  return { antes, despues };
}

/**
 * Preview de §3.4 paso 3: cifras del antes/después sólo en memoria, afectados
 * con motivo, cobertura, revisiones y la necesidad de motivo. No persiste
 * intento, contador ni auditoría.
 */
export function previsualizarOperacion(
  db: Database,
  procedimiento: Procedimiento,
): PreviewOperacionDto {
  exigirEstadoValidacionDisponible(db);
  for (const ciclo of procedimiento.ciclos)
    if (!db.query("SELECT 1 FROM ciclos WHERE id=?").get(ciclo))
      throw new Problem(404, "NOT_FOUND", "Ciclo no encontrado.", {
        ciclo: "No existe el ciclo indicado.",
      });
  const fingerprint = huellaDePayload(procedimiento);
  const contextRevision = contextRevisionDe(procedimiento);
  const { antes, despues } = medirEnDryRun(db, procedimiento);
  const impactos = impactoDeCandidatos(antes, despues);
  const impactRevision = impactRevisionDe(fingerprint, antes, despues, impactos);
  const afectados = afectadosDe(db, impactos);
  const cobertura = procedimiento.cobertura?.() ?? [];
  const noMedible = impactos.some((impacto) => impacto.noDisponible.length > 0);
  return {
    operacion: procedimiento.operacion,
    fingerprint,
    contextRevision,
    impactRevision,
    material: afectados.length ? true : noMedible ? null : false,
    afectados,
    cobertura,
    requiereMotivo: afectados.length > 0,
    noStore: true,
  };
}

type FilaIntento = { hash: string; response: string };

function huellaDePayload(procedimiento: Procedimiento): string {
  return huellaDe({
    familia: procedimiento.familia ?? procedimiento.operacion,
    ciclos: [...procedimiento.ciclos].sort(),
    payload: procedimiento.payload,
  });
}

function operacionId(key: string): string {
  return `OP-${createHash("sha256").update(key, "utf8").digest("hex").slice(0, 32)}`;
}

/** Identificador técnico del intento, reutilizable por los procedimientos. */
export const operacionIdDe = operacionId;

/**
 * Marca de pendiente de §3.2: sólo la produce un impacto **real** medido.
 * Sin fila no crea validación; Pendiente sin cambio no reitera; Pendiente con
 * impacto nuevo conserva el primer instante; una operación material que deja el
 * ciclo en la referencia comparable registra `reversion`, no una reiteración.
 */
export function marcarImpacto(
  db: Database,
  entrada: {
    ciclo: string;
    motivos: readonly ImpactoMaterial[];
    cobertura: readonly CoberturaValidada[];
    actor: string;
    instante: string;
    intento: string;
    huellaAnterior: string;
    huellaPosterior: string;
    referenciaHumana: string | null;
    referenciaActual: string;
  },
): number | null {
  const fila = leerFilaValidacion(db, entrada.ciclo);
  if (!fila) return null;
  if (!entrada.motivos.length) return null;
  const detalle = construirDetalleValidacion({
    hechos: [],
    ciclos: [{ id: entrada.ciclo, impactos: [...entrada.motivos] }],
    cobertura: [...entrada.cobertura],
    procedencia: null,
  });
  const payloadDetalle = serializarDetalleValidacion(detalle);
  const motivos = JSON.stringify([...entrada.motivos]);
  const reversion =
    fila.dirty === 1 && entrada.referenciaHumana === entrada.referenciaActual;
  if (fila.dirty === 1) {
    const accion = reversion ? "reversion" : "dirty_reiterado";
    if (!reversion)
      db.run(
        "UPDATE cierre_validacion SET dirty_ultimo=?,dirty_motivos=? WHERE ciclo=? AND dirty=1",
        [entrada.instante, motivos, entrada.ciclo],
      );
    const evento = db.run(
      `INSERT INTO cierre_validacion_audit(ciclo,revision,accion,actor,instante,motivo,
         intento,correlacion,origen,huella_anterior,huella_posterior,detalle)
       VALUES(?,?,?,?,?,NULL,?,NULL,NULL,?,?,?)`,
      [
        entrada.ciclo,
        fila.revision,
        accion,
        entrada.actor,
        entrada.instante,
        entrada.intento,
        entrada.huellaAnterior,
        entrada.huellaPosterior,
        payloadDetalle,
      ],
    );
    return Number(evento.lastInsertRowid);
  }
  const cambio = db.run(
    `UPDATE cierre_validacion
        SET dirty=1,dirty_desde=?,dirty_ultimo=?,dirty_origen='Operacion',dirty_motivos=?
      WHERE ciclo=? AND dirty=0 AND revision=?`,
    [entrada.instante, entrada.instante, motivos, entrada.ciclo, fila.revision],
  );
  if (cambio.changes !== 1)
    conflicto("VALIDATION_REVISION_CONFLICT", "La marca de validación cambió durante la operación.");
  const evento = db.run(
    `INSERT INTO cierre_validacion_audit(ciclo,revision,accion,actor,instante,motivo,
       intento,correlacion,origen,huella_anterior,huella_posterior,detalle)
     VALUES(?,?,'dirty_marcado',?,?,NULL,?,NULL,NULL,?,?,?)`,
    [
      entrada.ciclo,
      fila.revision,
      entrada.actor,
      entrada.instante,
      entrada.intento,
      entrada.huellaAnterior,
      entrada.huellaPosterior,
      payloadDetalle,
    ],
  );
  return Number(evento.lastInsertRowid);
}

/**
 * Clave completada: reproduce recibo antes de mirar nada más (§3.4 paso 4). Se
 * busca por **clave**, no por operación: la clave de intento es única y una
 * repetición no debe depender de qué variante decidió el estado de la fila.
 */
export function resolverIdempotencia(
  db: Database,
  key: string,
  hash: string,
): ReciboConfirmacion | null {
  const fila = db
    .query("SELECT hash,response FROM validacion_attempts WHERE key=? AND completado=1")
    .get(key) as FilaIntento | null;
  if (!fila) return null;
  if (fila.hash !== hash)
    conflicto(
      "IDEMPOTENCY_CONFLICT",
      "La clave de intento ya corresponde a otros datos.",
      { key: "Reutiliza la clave sólo con el mismo payload." },
    );
  return JSON.parse(fila.response) as ReciboConfirmacion;
}

/**
 * Confirmación atómica de §3.4 pasos 4–7. Devuelve el recibo durable, que se
 * escribe en la **misma** transacción que el hecho, la autorización, la
 * auditoría y la marca.
 */
export function confirmarOperacion(
  db: Database,
  procedimiento: Procedimiento,
  entrada: EntradaConfirmacion,
): ReciboConfirmacion {
  if (!CLAVE.test(entrada.key)) rechazo("Idempotency-Key", "clave de intento inválida");
  if (!HUELLA.test(entrada.fingerprint)) rechazo("fingerprint", "se esperaba una huella SHA-256");
  if (!HUELLA.test(entrada.contextRevision)) rechazo("contextRevision", "token inválido");
  if (!HUELLA.test(entrada.impactRevision)) rechazo("impactRevision", "token inválido");
  if (typeof entrada.actor !== "string" || !entrada.actor.trim())
    rechazo("actor", "se esperaba un actor de sesión");
  db.run("PRAGMA busy_timeout=3000");
  const hash = huellaDePayload(procedimiento);
  return db
    .transaction((): ReciboConfirmacion => {
      // 4 · Idempotencia completada antes de revalidar revisiones obsoletas.
      const completado = resolverIdempotencia(db, entrada.key, hash);
      if (completado) return completado;
      // 5a · Gate de contrato: falla cerrado, nunca «sin validar».
      exigirEstadoValidacionDisponible(db);
      // 5b · Estructura y existencia.
      for (const ciclo of procedimiento.ciclos)
        if (!db.query("SELECT 1 FROM ciclos WHERE id=?").get(ciclo))
          throw new Problem(404, "NOT_FOUND", "Ciclo no encontrado.", {
            ciclo: "El ciclo ya no existe.",
          });
      if (entrada.fingerprint !== hash)
        rechazo("fingerprint", "el payload no corresponde a esta operación");
      // 5c · Revisiones específicas antes que el impacto.
      for (const esperada of procedimiento.revisiones ?? []) {
        const actual =
          esperada.tipo === "ciclo"
            ? (db.query("SELECT revision FROM ciclos WHERE id=?").get(esperada.ciclo) as
                | { revision: number }
                | null)
            : null;
        if (esperada.tipo === "ciclo" && (!actual || actual.revision !== esperada.revision))
          conflicto(
            "REVISION_CONFLICT",
            "La revisión del movimiento o del ciclo está obsoleta.",
            { revision: "Refresca el estado antes de confirmar." },
          );
      }
      // 5d · Contexto e impacto medidos con el mismo procedimiento.
      const contextRevision = contextRevisionDe(procedimiento);
      const { antes, despues } = medirEnDryRun(db, procedimiento);
      const impactos = impactoDeCandidatos(antes, despues);
      const impactRevision = impactRevisionDe(
        entrada.fingerprint,
        antes,
        despues,
        impactos,
      );
      if (
        contextRevision !== entrada.contextRevision ||
        impactRevision !== entrada.impactRevision
      )
        conflicto(
          "IMPACT_CHANGED",
          "Cambió el contexto, la validación o el impacto desde la previsualización; vuelve a previsualizar.",
          { revisar: "El borrador se conserva; hace falta un preview nuevo." },
        );
      // 6 · Aplicación real, medición real, marcas y recibo.
      // `dirtyPrevio` describe el estado **anterior** de cada ciclo: un ciclo
      // que esta misma operación deja pendiente no estaba pendiente antes.
      const pendientePrevio = new Map<string, boolean>();
      for (const ciclo of antes.keys())
        pendientePrevio.set(ciclo, proyectarValidacion(db, ciclo).estado === "Pendiente");
      procedimiento.guardas?.();
      procedimiento.aplicar();
      const despuesReal = medirCandidatos(db, [...antes.keys()]);
      const impactosReales = impactoDeCandidatos(antes, despuesReal);
      const cobertura = procedimiento.cobertura?.() ?? [];
      const intento = operacionId(entrada.key);
      const auditIds: string[] = [];
      for (const impacto of impactosReales) {
        if (!impacto.material) continue;
        const referencia = leerFilaValidacion(db, impacto.ciclo);
        const auditId = marcarImpacto(db, {
          ciclo: impacto.ciclo,
          motivos: impacto.motivos,
          cobertura,
          actor: entrada.actor,
          instante: entrada.instante,
          intento,
          huellaAnterior: impacto.huellaAntes,
          huellaPosterior: impacto.huellaDespues,
          referenciaHumana: referencia?.huella_validacion ?? null,
          referenciaActual: impacto.huellaDespues,
        });
        if (auditId !== null) auditIds.push(String(auditId));
      }
      const estados = procedimiento.ciclos.map((ciclo) => {
        const validacion = proyectarValidacion(db, ciclo);
        return {
          id: ciclo,
          revision: String(validacion.revision ?? 0),
          estado: validacion.estado,
        };
      });
      // `cierresDirty` enumera los ciclos que **quedaron** pendientes desde el
      // estado real —incluidos los que ya lo estaban por otra causa—, nunca
      // derivados de `afectados` y nunca con cifras.
      const cierresDirty = [...antes.keys()]
        .map((ciclo) => ({ ciclo, validacion: proyectarValidacion(db, ciclo) }))
        .filter(({ validacion }) => validacion.estado === "Pendiente")
        .map(({ ciclo, validacion }) => ({
          ciclo,
          rango: rangoDe(db, ciclo),
          estadoValidacion: validacion.estado,
          validado: validacion.validado,
          dirtyPrevio: pendientePrevio.get(ciclo) === true,
        }));
      const recibo: ReciboConfirmacion = {
        operacionId: intento,
        ciclos: estados,
        auditIds,
        cierresDirty,
      };
      db.run(
        `INSERT INTO validacion_attempts(operacion,key,hash,response,completado,expira)
         VALUES(?,?,?,?,1,?)`,
        [
          procedimiento.operacion,
          entrada.key,
          hash,
          JSON.stringify({
            operacionId: recibo.operacionId,
            ciclos: recibo.ciclos,
            auditIds: recibo.auditIds,
            cierresDirty: recibo.cierresDirty,
          }),
          Date.now() + 86_400_000,
        ],
      );
      // 7 · Invariantes antes del único COMMIT.
      const capacidades = db
        .query("SELECT COUNT(*) n FROM anticipo_apertura_autorizacion")
        .get() as { n: number };
      if (capacidades.n !== 0)
        throw new Problem(
          500,
          "INVARIANT",
          "La transacción dejó una capacidad de apertura viva.",
        );
      return recibo;
    })
    .immediate();
}

/** Recepción de la confirmación de revisión humana (I1) dentro de este flujo. */
export function detalleDeImpacto(
  ciclo: string,
  motivos: readonly ImpactoMaterial[],
  cobertura: readonly CoberturaValidada[],
): DetalleValidacion {
  return construirDetalleValidacion({
    hechos: [],
    ciclos: [{ id: ciclo, impactos: [...motivos] }],
    cobertura: [...cobertura],
    procedencia: null,
  });
}

/** Texto canónico del estado de un ciclo, para logs y comparaciones de prueba. */
export function estadoCanonico(db: Database, ciclo: string): string {
  return jsonCanonico(proyectarValidacion(db, ciclo));
}