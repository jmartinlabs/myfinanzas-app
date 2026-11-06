import type { Database } from "bun:sqlite";
import { monthlyFlow, type Metric } from "./flujo-mensual";

/**
 * E4.11 I4 — etiquetado de contraste vivo.
 *
 * This is a read-only adapter over E2.6 `monthlyFlow`. It is deliberately not
 * a historical source: it never reads `cierres`/`fotos_cierre`, never writes,
 * never reuses a photo total and never completes a `No disponible` block.
 *
 * Every metric keeps its E2.6 value/subtotal, state, motive, source and
 * coverage, and is explicitly labelled as a live calculation. The top-level
 * `origen`/`motor` and `noEsHistorico` make the DTO unusable as a closure
 * photo by mistake.
 */

export const MOTOR_CONTRASTE = "E2.6 flujo-mensual" as const;
export const ETIQUETA_CONTRASTE =
  "Cálculo vivo — no es la foto ni un cierre histórico" as const;

export type ContrasteMetricaDto = Metric & {
  origen: "CalculoVivo";
  noEsHistorico: true;
};

export type ContrasteMetricasDto = Record<string, ContrasteMetricaDto>;

export type ContrasteBloqueDto = {
  clave: string;
  estado: string;
  motivo: string;
};

export type ContrasteCoberturaDto = {
  estado: "Parcial" | "NoDisponible";
  verificada: boolean;
  motivo: string;
  motivos: string[];
  /** No period total is defined from a live calculation. */
  total: null;
  certificada: false;
  coberturaBancaria: {
    verificada: boolean;
    motivo: string;
  };
  bloques: ContrasteBloqueDto[];
};

export type ContrasteNoDisponibleDto = {
  clave: string;
  fuente: string;
  motivo: string;
};

export type ContrasteDto = {
  origen: "CalculoVivo";
  motor: typeof MOTOR_CONTRASTE;
  etiqueta: typeof ETIQUETA_CONTRASTE;
  ciclo: string;
  revision: string;
  corte: string | null;
  consulta: string;
  metricas: ContrasteMetricasDto;
  cobertura: ContrasteCoberturaDto;
  noDisponible: ContrasteNoDisponibleDto[];
  noEsHistorico: true;
  noSustituyeFoto: true;
  soloLectura: true;
};

export function getContraste(
  db: Database,
  cicloId: string,
  now = Date.now(),
): ContrasteDto {
  const flow = monthlyFlow(db, cicloId, now);

  const metricas: ContrasteMetricasDto = Object.fromEntries(
    Object.entries(flow.metrics).map(([clave, metric]) => [
      clave,
      {
        ...metric,
        origen: "CalculoVivo" as const,
        noEsHistorico: true as const,
      },
    ]),
  );

  const noDisponible = Object.entries(metricas)
    .filter(([, metric]) => metric.estado === "No disponible")
    .map(([clave, metric]) => ({
      clave,
      fuente: metric.fuente,
      motivo: metric.motivo,
    }));

  const motivos = new Set<string>();
  motivos.add(
    "Cálculo vivo: no certifica cierre, cobertura histórica ni total.",
  );
  if (flow.corteEfectivo === null)
    motivos.add(
      "Sin periodo/corte central verificable: las métricas bancarias quedan No disponible.",
    );
  motivos.add(flow.coberturaBancaria.motivo);
  for (const error of flow.erroresFuente)
    motivos.add(`Fuente con error: ${error}.`);

  const conEvidencia = Object.values(metricas).some(
    (metric) => metric.estado !== "No disponible",
  );

  return {
    origen: "CalculoVivo",
    motor: MOTOR_CONTRASTE,
    etiqueta: ETIQUETA_CONTRASTE,
    ciclo: flow.ciclo.id,
    revision: flow.revision,
    corte: flow.corteEfectivo,
    consulta: flow.consulta,
    metricas,
    cobertura: {
      estado: conEvidencia ? "Parcial" : "NoDisponible",
      verificada: flow.coberturaBancaria.verificada,
      motivo: conEvidencia
        ? "Cobertura parcial: cálculo vivo, sin certificación histórica."
        : "Sin evidencia viva verificable; no se sustituye por cero.",
      motivos: [...motivos],
      total: null,
      certificada: false,
      coberturaBancaria: flow.coberturaBancaria,
      bloques: Object.entries(metricas).map(([clave, metric]) => ({
        clave,
        estado: metric.estado,
        motivo: metric.motivo,
      })),
    },
    noDisponible,
    noEsHistorico: true,
    noSustituyeFoto: true,
    soloLectura: true,
  };
}
