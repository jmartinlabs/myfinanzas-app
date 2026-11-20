import type { Database } from "bun:sqlite";
import { aplicarOperacionCiclo, cycleMaster, operationPlan } from "./ciclos";
import { planReanclaje } from "./cierre-anticipo-apertura";
import { huellaUniverso, universoFinanciero } from "./cierre-validacion-impacto";
import {
  confirmarOperacion,
  operacionIdDe,
  previsualizarOperacion,
  type PreviewOperacionDto,
  type Procedimiento,
  type ReciboConfirmacion,
} from "./cierre-validacion-operaciones";
import { Problem } from "./problem";
import { decimal } from "./saldos";

/**
 * SPEC38 · I2 — rectificaciones estructurales de §4 por HTTP.
 *
 * Corregir el **Inicio** de un ciclo o su **Saldo inicial** (S0) es operación
 * ordinaria: no hay reapertura ni versiones. Lo que sí exige la SPEC es
 * previsualización con la ventana antes/después del corregido y de su
 * predecesor, motivo obligatorio, integridad del maestro, auditoría natural del
 * ciclo y de su estado enlazada por intento, idempotencia y el orden de
 * escritura de las declaraciones de Anticipos.
 *
 * El sucesor permanece **frontera fija**: su ventana no se desplaza por cruzar
 * el Inicio corregido, y por eso los candidatos se miden —no se marcan por
 * pertenecer— con el mismo procedimiento que confirma.
 */

/** Cuerpo de §4 sin tipar de más: la validación de dominio la hace el plan. */
export type EntradaRectificacion = Record<string, unknown>;

export type CuerpoConfirmacionRectificacion = EntradaRectificacion & {
  fingerprint: string;
  contextRevision: string;
  impactRevision: string;
};

export type PreviewRectificacionDto = PreviewOperacionDto & {
  ciclo: string;
  operacion: "rectificar_inicio" | "rectificar_s0";
  ventana: {
    antes: { inicio: string; fin: string | null; saldoInicialComida: string };
    despues: { inicio: string; fin: string | null; saldoInicialComida: string };
    predecesor: { id: string; inicio: string; fin: string | null } | null;
    sucesor: { id: string; inicio: string; fin: string | null } | null;
  };
  movimientosReasignados: unknown[];
  claseAnticipos: "A" | "B" | null;
  causasAnticipos: string[];
};

function datosCiclo(db: Database, ciclo: string) {
  const maestro = cycleMaster(db);
  const indice = maestro.findIndex((entrada) => entrada.id === ciclo);
  const actual = indice >= 0 ? maestro[indice] : null;
  if (!actual) throw new Problem(404, "NOT_FOUND", "Ciclo no encontrado.");
  return {
    maestro,
    indice,
    actual,
    predecesor: indice > 0 ? maestro[indice - 1] : null,
    sucesor: indice >= 0 && indice + 1 < maestro.length ? maestro[indice + 1] : null,
  };
}

/**
 * Procedimiento compartido por preview y confirmación: el `guardas` es la
 * validación de dominio (cronología, duplicados, revisión, clase de Anticipos)
 * y el `aplicar` es la **misma** escritura que la ruta histórica, para que el
 * antes/después medido sea el real y no una reconstrucción.
 */
function procedimientoRectificacion(
  db: Database,
  ciclo: string,
  cuerpo: EntradaRectificacion,
  now: number,
  intencion: { intento: () => string; actor: string; instante: string },
): { procedimiento: Procedimiento; plan: () => ReturnType<typeof operationPlan> } {
  let plan: ReturnType<typeof operationPlan> | null = null;
  const calcular = () => {
    plan = operationPlan(db, "rectificar", ciclo, {
      inicio: cuerpo.inicio,
      saldoInicialComida: cuerpo.saldoInicialComida,
      motivo: cuerpo.motivo,
      revision: cuerpo.revision,
      anticipos: cuerpo.anticipos,
    });
    return plan;
  };
  const datos = datosCiclo(db, ciclo);
  const operacion =
    cuerpo.inicio === datos.actual.inicio ? "rectificar_s0" : "rectificar_inicio";
  const procedimiento: Procedimiento = {
    operacion,
    familia: "rectificacion_ciclo",
    ciclos: [ciclo],
    candidatos: candidatosDe(db, datos.maestro, ciclo, datos.indice, cuerpo.inicio),
    payload: {
      ciclo,
      inicio: cuerpo.inicio,
      saldoInicialComida: cuerpo.saldoInicialComida,
      motivo: cuerpo.motivo,
      revision: cuerpo.revision,
      anticipos: cuerpo.anticipos ?? null,
    },
    contexto: () => ({
      ciclo,
      revision: datos.actual.revision,
      inicio: datos.actual.inicio,
      saldoInicialComida: datos.actual.saldoInicialComida,
      vecinos: {
        predecesor: datos.predecesor
          ? [datos.predecesor.id, datos.predecesor.inicio, datos.predecesor.fin]
          : null,
        sucesor: datos.sucesor
          ? [datos.sucesor.id, datos.sucesor.inicio, datos.sucesor.fin]
          : null,
      },
    }),
    // REVISION_CONFLICT antes que IMPACT_CHANGED (ANEXO §1).
    revisiones: [{ tipo: "ciclo", ciclo, revision: Number(cuerpo.revision) }],
    guardas: () => {
      calcular();
    },
    aplicar: () => {
      const actual = calcular();
      const universoAntes = universoFinanciero(db, ciclo);
      aplicarOperacionCiclo(db, "rectificar", ciclo, actual, now, {
        intento: intencion.intento(),
        actor: intencion.actor,
        instante: intencion.instante,
        huellaAnterior: huellaUniverso(universoAntes),
        huellaPosterior: null,
      });
    },
    cobertura: () => universoFinanciero(db, ciclo).cobertura,
  };
  return { procedimiento, plan: () => calcular() };
}

/**
 * Candidatos de §3.3: el ciclo corregido y su predecesor por sus ventanas, y los
 * ciclos que cierran en o después de la fecha mínima afectada. El sucesor entra
 * sólo como límite fijo: si su ventana no cambia, su huella tampoco.
 */
function candidatosDe(
  db: Database,
  maestro: readonly { id: string; inicio: string; fin: string | null }[],
  ciclo: string,
  indice: number,
  inicioNuevo: unknown,
): string[] {
  const anterior = maestro[indice]?.inicio ?? null;
  const fechas = [anterior, typeof inicioNuevo === "string" ? inicioNuevo : null].filter(
    (fecha): fecha is string => typeof fecha === "string",
  );
  const minimo = fechas.length ? [...fechas].sort()[0] : null;
  const candidatos = new Set<string>([ciclo]);
  if (indice > 0) candidatos.add(maestro[indice - 1].id);
  if (minimo)
    for (const entrada of maestro)
      if (entrada.inicio <= minimo || entrada.fin === null || entrada.fin >= minimo)
        candidatos.add(entrada.id);
  return [...candidatos].sort((a, b) => Number(a) - Number(b));
}

/** `POST /api/impacto/preview` con `tipo: "ciclo"`: preview no persistente. */
export function previewRectificacion(
  db: Database,
  ciclo: string,
  cuerpo: EntradaRectificacion,
  now = Date.now(),
): PreviewRectificacionDto {
  const datos = datosCiclo(db, ciclo);
  const { procedimiento, plan } = procedimientoRectificacion(db, ciclo, cuerpo, now, {
    intento: () => "PREVIEW",
    actor: "preview",
    instante: new Date(now).toISOString(),
  });
  const preview = previsualizarOperacion(db, procedimiento);
  const calculado = plan();
  const reanclaje = planReanclaje(
    db,
    ciclo,
    datos.actual.inicio,
    typeof cuerpo.inicio === "string" ? cuerpo.inicio : datos.actual.inicio,
    cuerpo.anticipos,
  );
  const finDespues = datos.sucesor
    ? datos.sucesor.inicio
    : null;
  const diaAnterior = (fecha: string) => {
    const valor = new Date(`${fecha}T00:00:00Z`);
    valor.setUTCDate(valor.getUTCDate() - 1);
    return valor.toISOString().slice(0, 10);
  };
  return {
    ...preview,
    ciclo,
    operacion: procedimiento.operacion as "rectificar_inicio" | "rectificar_s0",
    ventana: {
      antes: {
        inicio: datos.actual.inicio,
        fin: datos.actual.fin,
        saldoInicialComida: datos.actual.saldoInicialComida,
      },
      despues: {
        inicio: calculado.values.inicio,
        fin: finDespues ? diaAnterior(finDespues) : null,
        saldoInicialComida: decimal(calculado.values.saldo) ?? String(calculado.values.saldo),
      },
      predecesor: datos.predecesor
        ? {
            id: datos.predecesor.id,
            inicio: datos.predecesor.inicio,
            fin: datos.predecesor.fin,
          }
        : null,
      sucesor: datos.sucesor
        ? { id: datos.sucesor.id, inicio: datos.sucesor.inicio, fin: datos.sucesor.fin }
        : null,
    },
    movimientosReasignados: calculado.movimientos,
    claseAnticipos: reanclaje?.clase ?? null,
    causasAnticipos: reanclaje?.causas ?? [],
  };
}

/**
 * `POST /api/impacto/confirmar` con `tipo: "ciclo"`. La confirmación revalida
 * revisiones, vuelve a medir y aplica dentro de `BEGIN IMMEDIATE`; el motivo es
 * obligatorio y la integridad del maestro se comprueba igual que en el preview.
 */
export function confirmarRectificacion(
  db: Database,
  ciclo: string,
  cuerpo: CuerpoConfirmacionRectificacion,
  key: string,
  now = Date.now(),
  actor = "usuario-unico",
): ReciboConfirmacion {
  const instante = new Date(now).toISOString();
  const { procedimiento } = procedimientoRectificacion(db, ciclo, cuerpo, now, {
    intento: () => operacionIdDe(key),
    actor,
    instante,
  });
  return confirmarOperacion(db, procedimiento, {
    key,
    fingerprint: cuerpo.fingerprint,
    contextRevision: cuerpo.contextRevision,
    impactRevision: cuerpo.impactRevision,
    motivo: typeof cuerpo.motivo === "string" ? cuerpo.motivo : null,
    actor,
    instante,
  });
}