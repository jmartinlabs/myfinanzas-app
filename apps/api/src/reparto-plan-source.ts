import type { Database } from "bun:sqlite";
import { getCyclePlan } from "./planes-ciclo";
import { getPlanMensualDprima, listDprimaPartidas } from "./dprima";

/**
 * SPEC36 amendment C — read-only adapter between the active plan source and the
 * future monthly distribution engine.
 *
 * This module deliberately does not write reparto rows, generate pendientes or
 * recalculate Del mes / Ejecutado / Pendiente. It only normalizes the values
 * already published by Plan del ciclo (E2.3) or Plan mensual D′ so the same
 * reparto rules can consume either source explicitly.
 */
export type RepartoPlanSource = "PlanCiclo" | "Dprima";
export type RepartoPlanFuente =
  | "Gasto real"
  | "Aportación a saldo"
  | "No aplica";

export type RepartoPlanLine = {
  source: RepartoPlanSource;
  ciclo: string;
  referencia: string;
  nombre: string;
  fuente: RepartoPlanFuente;
  destino: string | null;
  delMes: string | null;
  ejecutado: string | null;
  pendiente: string | null;
  estado: string | null;
  motivo: string | null;
  sinPlanificar: boolean;
  entidadEstado: string | null;
  revision: number;
};

export type RepartoPlan = {
  source: RepartoPlanSource;
  ciclo: string;
  revision: number;
  lines: RepartoPlanLine[];
  /** Destinos repetidos entre líneas de Aportación a saldo del mismo plan. */
  destinosCompartidos: string[];
};

type CyclePlanView = ReturnType<typeof getCyclePlan>;
type DprimaPlanView = ReturnType<typeof getPlanMensualDprima>;
type DprimaPartidasView = ReturnType<typeof listDprimaPartidas>;

function repeatedDestinations(lines: RepartoPlanLine[]) {
  const counts = new Map<string, number>();
  for (const line of lines) {
    if (line.fuente !== "Aportación a saldo" || !line.destino) continue;
    counts.set(line.destino, (counts.get(line.destino) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([destino]) => destino)
    .sort();
}

export function normalizePlanCiclo(plan: CyclePlanView): RepartoPlan {
  const lines: RepartoPlanLine[] = plan.items.map((item) => ({
    source: "PlanCiclo",
    ciclo: plan.ciclo.id,
    referencia: item.presupuesto.id,
    nombre: item.presupuesto.nombre,
    fuente: item.presupuesto.fuente as RepartoPlanFuente,
    destino: item.presupuesto.destino,
    delMes: item.aTransferir,
    ejecutado: item.ejecutado,
    pendiente: item.pendiente,
    estado: item.estado,
    motivo: item.motivo,
    sinPlanificar: item.sinPlanificar,
    entidadEstado: item.presupuesto.estado,
    revision: plan.revision,
  }));
  return {
    source: "PlanCiclo",
    ciclo: plan.ciclo.id,
    revision: plan.revision,
    lines,
    destinosCompartidos: repeatedDestinations(lines),
  };
}

export function normalizeDprima(
  plan: DprimaPlanView,
  partidas: DprimaPartidasView,
): RepartoPlan {
  const estados = new Map(partidas.raices.map((root) => [root.id, root.estado]));
  const lines: RepartoPlanLine[] = plan.items.map((item) => ({
    source: "Dprima",
    ciclo: plan.ciclo.id,
    referencia: item.raiz,
    nombre: item.nombre,
    fuente: item.fuente as RepartoPlanFuente,
    destino: item.destino,
    delMes: item.delMes,
    ejecutado: item.ejecutado,
    pendiente: item.pendiente,
    estado: item.estado,
    motivo: item.motivo,
    sinPlanificar: false,
    entidadEstado: estados.get(item.raiz) ?? null,
    revision: item.revision,
  }));
  return {
    source: "Dprima",
    ciclo: plan.ciclo.id,
    revision: lines.reduce((max, line) => Math.max(max, line.revision), 0),
    lines,
    destinosCompartidos: repeatedDestinations(lines),
  };
}

/**
 * Reads one explicit source for one cycle. There is intentionally no default
 * and no fallback: mixing sources or switching silently would violate AC-26.
 */
export function readRepartoPlan(
  db: Database,
  ciclo: string,
  source: RepartoPlanSource,
  now = Date.now(),
): RepartoPlan {
  if (source === "PlanCiclo")
    return normalizePlanCiclo(getCyclePlan(db, ciclo, now));
  if (source === "Dprima")
    return normalizeDprima(
      getPlanMensualDprima(db, ciclo, now),
      listDprimaPartidas(db),
    );
  throw new Error(`Origen de plan no soportado: ${String(source)}`);
}
