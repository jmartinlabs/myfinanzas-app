import type { Database } from "bun:sqlite";
import {
  CAUSAS_COBERTURA,
  FUENTES_COBERTURA,
  type CoberturaValidada,
} from "./cierre-validacion-dto";
import { leerFilaValidacion, proyectarValidacion, type ValidacionDto } from "./cierre-validacion-estado";
import {
  VERSION_CONJUNTO,
  huellaUniverso,
  universoFinanciero,
  type UniversoFinanciero,
} from "./cierre-validacion-impacto";
import {
  confirmarOperacion,
  previsualizarOperacion,
  type PreviewOperacionDto,
  type Procedimiento,
  type ReciboConfirmacion,
} from "./cierre-validacion-operaciones";
import {
  accionDeValidacion,
  escribirReferenciaHumana,
  type EstadoValidacionActual,
} from "./cierre-validacion-revision";
import { cycleMaster } from "./ciclos";
import { Problem } from "./problem";

/**
 * SPEC38 · I2 — validación, revalidación y confirmación de revisión por HTTP
 * (§5 y §6.1).
 *
 * Validar **no** crea foto ni congela resultados: escribe una referencia humana
 * —huella del universo vigente, versión de conjunto, actor, instante y motivo—
 * y un evento. La única limpieza de una fila pendiente es la confirmación
 * humana, y cualquier intento de reutilizar evidencia anterior lo rechazan la
 * guarda de servicio y el trigger gemelo (§2.4).
 *
 * Requisitos de §5 conservados: ventana finita, S0 presente, núcleo y plan
 * verificables. **Retirados** por la SPEC: el contraste con fotos posteriores,
 * el bloqueo por cierre fuera de orden, `e4_9Bloqueado` como autoridad y el
 * backup como criterio financiero (AC-26: G5 sigue siendo gate operativo, no un
 * requisito de validación). E3.5/FIN_NETA no disponible exige cobertura parcial
 * visible con motivo y no bloquea por sí sola.
 */

export type RequisitoValidacion = { code: string; message: string };

export type RequisitosValidacion = {
  bloqueos: RequisitoValidacion[];
  avisos: RequisitoValidacion[];
  cobertura: CoberturaValidada[];
  /** Cobertura parcial: validar/confirmar exige un motivo humano explícito. */
  requiereMotivo: boolean;
};

const CAUSAS = new Set<string>(CAUSAS_COBERTURA);
const FUENTES = new Set<string>(FUENTES_COBERTURA);

function coberturaDe(universo: UniversoFinanciero): CoberturaValidada[] {
  return universo.cobertura
    .filter((entrada) => FUENTES.has(entrada.fuente))
    .filter((entrada) => entrada.causas.every((causa) => CAUSAS.has(causa)));
}

/**
 * Requisitos que sí deciden (§5). Sin siguiente Inicio o sin S0 no se valida;
 * un plan no verificable bloquea; la ausencia de backup no aparece aquí porque
 * es gate operativo G5, no criterio financiero.
 */
export function requisitosDeValidacion(
  db: Database,
  ciclo: string,
  _now = Date.now(),
): RequisitosValidacion {
  const maestro = cycleMaster(db).find((entrada) => entrada.id === ciclo);
  if (!maestro) throw new Problem(404, "NOT_FOUND", "Ciclo no encontrado.");
  const universo = universoFinanciero(db, ciclo);
  const bloqueos: RequisitoValidacion[] = [];
  const avisos: RequisitoValidacion[] = [];
  if (!maestro.fin)
    bloqueos.push({
      code: "SIN_SIGUIENTE_INICIO",
      message: "No existe siguiente Inicio; no se deriva Fin ni se valida el conjunto.",
    });
  if (universo.ventana.s0 === null)
    bloqueos.push({ code: "S0_AUSENTE", message: "Falta el Saldo inicial manual del ciclo." });
  const cobertura = coberturaDe(universo);
  const devoluciones = cobertura.find((entrada) => entrada.fuente === "devoluciones");
  // SPEC39 §3.3/§4: el exceso histórico (descuento > compra) impide medir el
  // GRE, así que bloquea la validación financiera; el saneamiento individual
  // (rectificar/anular la devolución causante) sigue su propio procedimiento.
  if (devoluciones?.estado === "NoDisponible")
    bloqueos.push({
      code: "DEVOLUCIONES_NO_DISPONIBLE",
      message:
        "Las devoluciones tienen un exceso histórico: no se puede medir el GRE del ciclo. Sanea individualmente la devolución causante antes de validar.",
    });
  const requiereMotivo = cobertura.some((entrada) => entrada.estado === "Parcial");
  const plan = db.query("SELECT revision FROM cycle_plans WHERE ciclo=?").get(ciclo) as
    | { revision: number }
    | null;
  if (plan) {
    try {
      const lineas = db
        .query("SELECT base,esencial,del_mes FROM cycle_plan_lines WHERE ciclo=?")
        .all(ciclo) as { base: string | null; esencial: string | null; del_mes: string | null }[];
      for (const linea of lineas)
        if (linea.base === null || linea.del_mes === null)
          throw new Error("línea no verificable");
    } catch {
      bloqueos.push({
        code: "PLAN_NO_VERIFICABLE",
        message: "El plan tiene líneas o revisión no verificables.",
      });
    }
  } else {
    avisos.push({
      code: "SIN_PLANIFICAR",
      message: "El ciclo no tiene plan de ciclo; validar SinPlan está permitido.",
    });
  }
  const sinHechos = universo.atribucion.length === 0;
  if (sinHechos)
    avisos.push({
      code: "CICLO_SIN_HECHOS_VERIFICADOS",
      message: "El ciclo no tiene hechos verificados; no se declara cero.",
    });
  return { bloqueos, avisos, cobertura, requiereMotivo };
}

function filaActual(db: Database, ciclo: string): EstadoValidacionActual {
  const fila = leerFilaValidacion(db, ciclo);
  return {
    ciclo,
    revision: fila?.revision ?? 0,
    dirty: (fila?.dirty ?? 0) === 1,
    dirtyDesde: fila?.dirty_desde ?? null,
    dirtyUltimo: fila?.dirty_ultimo ?? null,
    huella: fila?.huella_validacion ?? null,
    versionConjunto: fila?.version_conjunto ?? null,
    actor: fila?.revision_actor ?? null,
    instante: fila?.revision_instante ?? null,
    cobertura: fila?.cobertura ?? "[]",
  };
}

type EntradaValidacion = {
  actor: string;
  instante: string;
  motivo?: string | null;
};

/**
 * Procedimiento de validación/revalidación para el envoltorio: el `aplicar` es
 * la referencia humana, y como el universo no incluye el estado de validación,
 * el impacto medido es nulo. Revalidar no marca nada; sólo reescribe la
 * referencia con evidencia nueva.
 */
function procedimientoValidar(
  db: Database,
  ciclo: string,
  revalidar: boolean,
  entrada: EntradaValidacion,
): Procedimiento & { huella: string; versionConjunto: string; coberturaVigente: CoberturaValidada[] } {
  const requisitos = requisitosDeValidacion(db, ciclo);
  const universo = universoFinanciero(db, ciclo);
  const huella = huellaUniverso(universo);
  const cobertura = requisitos.cobertura;
  return {
    operacion: revalidar ? "revalidar" : "validar",
    familia: "validacion_revision",
    ciclos: [ciclo],
    candidatos: [ciclo],
    // Payload = lo que confirma el humano (el ciclo). La huella vigente, la
    // revisión y la cobertura son **estado medido**: si cambian entre preview y
    // confirmación, el contrato exige `IMPACT_CHANGED` (ANEXO §1), no un
    // `VALIDATION` de estructura, y una clave completada se resuelve antes de
    // revalidar contexto (§3.4/AC-10).
    payload: { ciclo },
    contexto: () => ({
      ciclo,
      revision: filaActual(db, ciclo).revision,
      hasFila: leerFilaValidacion(db, ciclo) !== null,
    }),
    guardas: () => {
      if (requisitos.bloqueos.length)
        throw new Problem(
          422,
          "VALIDATION",
          "No se puede validar: " + requisitos.bloqueos.map((b) => b.code).join(", ") + ".",
          Object.fromEntries(requisitos.bloqueos.map((b) => [b.code, b.message])),
        );
    },
    aplicar: () => {
      const fila = leerFilaValidacion(db, ciclo);
      if (revalidar && (!fila || fila.dirty === 1))
        throw new Problem(
          409,
          "VALIDATION_NOT_VALIDATED",
          "Sólo se revalida un ciclo ya validado; un ciclo pendiente se confirma.",
        );
      if (!revalidar && fila && fila.dirty === 1)
        throw new Problem(
          409,
          "VALIDATION_PENDING",
          "El ciclo está pendiente: confirma la revisión en lugar de validarlo de nuevo.",
        );
      escribirReferenciaHumana(
        db,
        ciclo,
        {
          huella,
          versionConjunto: VERSION_CONJUNTO,
          actor: entrada.actor,
          instante: entrada.instante,
          motivo: entrada.motivo ?? null,
        },
        accionDeValidacion(revalidar),
        cobertura,
      );
    },
    cobertura: () => cobertura,
    huella,
    versionConjunto: VERSION_CONJUNTO,
    coberturaVigente: cobertura,
    // Validar no requiere medir impacto material: su bloqueo financiero propio
    // (`DEVOLUCIONES_NO_DISPONIBLE` y el resto de §5) prevalece sobre el 409
    // genérico de impacto no verificable.
    requiereImpactoMedible: false,
    requiereMotivo: () => requisitos.requiereMotivo,
  };
}

export type PreviewValidacionDto = PreviewOperacionDto & {
  estado: ValidacionDto;
  bloqueos: RequisitoValidacion[];
  avisos: RequisitoValidacion[];
  huellaVigente: string;
  versionConjunto: string;
};

/** `GET /api/cierres/:id/validacion/preview`: preview no persistente (§6.1). */
export function previewValidacion(
  db: Database,
  ciclo: string,
  now = Date.now(),
): PreviewValidacionDto {
  const requisitos = requisitosDeValidacion(db, ciclo, now);
  const estado = proyectarValidacion(db, ciclo);
  const solicitud: EntradaValidacion = {
    actor: "preview",
    instante: new Date(now).toISOString(),
  };
  // Pendiente no se valida ni se revalida: se confirma la revisión. El preview
  // lo declara para que el cliente no tenga que inferir la acción.
  if (estado.estado === "Pendiente")
    return {
      ...previsualizarOperacion(db, procedimientoConfirmarRevision(db, ciclo, solicitud)),
      estado,
      bloqueos: requisitos.bloqueos,
      avisos: requisitos.avisos,
      huellaVigente: estado.huellaVigente,
      versionConjunto: VERSION_CONJUNTO,
    };
  const procedimiento = procedimientoValidar(
    db,
    ciclo,
    estado.estado === "Validada",
    solicitud,
  );
  const preview = previsualizarOperacion(db, procedimiento);
  return {
    ...preview,
    estado,
    bloqueos: requisitos.bloqueos,
    avisos: requisitos.avisos,
    huellaVigente: procedimiento.huella,
    versionConjunto: procedimiento.versionConjunto,
  };
}

export type EntradaConfirmarValidacion = EntradaValidacion & {
  key: string;
  fingerprint: string;
  contextRevision: string;
  impactRevision: string;
};

/** `POST /api/cierres/:id/validar` (o `/revalidar`): recibo de §2, no informe. */
export function validarCiclo(
  db: Database,
  ciclo: string,
  entrada: EntradaConfirmarValidacion,
  now = Date.now(),
): ReciboConfirmacion {
  const estado = proyectarValidacion(db, ciclo);
  const revalidar = estado.estado === "Validada";
  const procedimiento = procedimientoValidar(db, ciclo, revalidar, entrada);
  return confirmarOperacion(db, procedimiento, {
    ...entrada,
    instante: entrada.instante ?? new Date(now).toISOString(),
  });
}

/**
 * Procedimiento de confirmación de revisión: única limpieza humana de una fila
 * pendiente. Lo usan la ruta `/revision/confirmar` y el preview de validación
 * cuando el ciclo está pendiente, para que la UI sepa qué acción confirmar.
 */
function procedimientoConfirmarRevision(
  db: Database,
  ciclo: string,
  entrada: EntradaValidacion,
): Procedimiento {
  const universo = universoFinanciero(db, ciclo);
  const huella = huellaUniverso(universo);
  const requisitos = requisitosDeValidacion(db, ciclo);
  return {
    operacion: "confirmar_revision",
    familia: "validacion_revision",
    ciclos: [ciclo],
    candidatos: [ciclo],
    // Payload = lo que confirma el humano (el ciclo). La huella vigente, la
    // revisión y la cobertura son **estado medido**: si cambian entre preview y
    // confirmación, el contrato exige `IMPACT_CHANGED` (ANEXO §1), no un
    // `VALIDATION` de estructura, y una clave completada se resuelve antes de
    // revalidar contexto (§3.4/AC-10).
    payload: { ciclo },
    contexto: () => ({
      ciclo,
      revision: filaActual(db, ciclo).revision,
      dirty: filaActual(db, ciclo).dirty,
    }),
    guardas: () => {
      const actual = filaActual(db, ciclo);
      if (!actual.dirty)
        throw new Problem(
          409,
          "VALIDATION_NOT_PENDING",
          "El ciclo no está pendiente de revisión.",
        );
    },
    aplicar: () => {
      escribirReferenciaHumana(
        db,
        ciclo,
        {
          huella,
          versionConjunto: VERSION_CONJUNTO,
          actor: entrada.actor,
          instante: entrada.instante,
          motivo: entrada.motivo ?? null,
        },
        "confirmar_revision",
        requisitos.cobertura,
      );
    },
    cobertura: () => requisitos.cobertura,
    requiereImpactoMedible: false,
    requiereMotivo: () => requisitos.requiereMotivo,
  };
}

/** `POST /api/cierres/:id/revision/confirmar` con el envoltorio atómico. */
export function confirmarRevisionCiclo(
  db: Database,
  ciclo: string,
  entrada: EntradaConfirmarValidacion,
): ReciboConfirmacion {
  return confirmarOperacion(
    db,
    procedimientoConfirmarRevision(db, ciclo, entrada),
    entrada,
  );
}

/** Estado proyectado con el ciclo ya resuelto, para `GET /estado`. */
export function estadoDeCiclo(db: Database, ciclo: string): ValidacionDto {
  return proyectarValidacion(db, ciclo);
}