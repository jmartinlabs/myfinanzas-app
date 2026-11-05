import type { Database } from "bun:sqlite";
import { listDeudasCompletas } from "./deuda-completa";
import { decimal } from "./saldos";

/**
 * Agregación compartida de deuda no hipotecaria activa.
 *
 * E4.6 y E4.7 solo difieren en cómo obtienen las fichas: E4.6 usa el listado
 * actual y E4.7 aplica `getDeudaCompleta` al corte. La regla Q7 y la aritmética
 * de subtotal/total viven aquí una sola vez para no duplicarlas.
 */

export type DeudaNoHipotecariaAgregable = {
  id: string;
  capitalPendiente: string | null;
  capital: { calculable: boolean; motivoNoCalculable: string | null };
  revision: number;
};

export type ResumenDeudaNoHipotecaria = {
  subtotal: string | null;
  total: string | null;
  estado: "Verificado" | "Cero verificado" | "Parcial" | "Sin datos";
  incluidos: number;
  excluidos: number;
  motivos: string[];
  ids: string[];
  revisiones: string[];
};

export function listarDeudasCompletas(db: Database) {
  const items: ReturnType<typeof listDeudasCompletas>["items"] = [];
  let page = 1;
  let total = 0;
  do {
    const result = listDeudasCompletas(
      db,
      new URLSearchParams({ estado: "", page: String(page) }),
    );
    items.push(...result.items);
    total = result.total;
    if (result.items.length === 0) break;
    page += 1;
  } while (items.length < total && page <= 100000);
  return items;
}

export function esDeudaNoHipotecariaActiva(item: {
  estado: string;
  tipoDeuda: string | null;
}) {
  return item.estado === "Activa" && item.tipoDeuda === "No hipotecaria";
}

function centsOf(value: string | null): bigint | null {
  if (value === null) return null;
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace("-", "").split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

export function agregarDeudaNoHipotecaria(
  items: DeudaNoHipotecariaAgregable[],
): ResumenDeudaNoHipotecaria {
  const calculables = items.filter((item) => item.capital.calculable);
  const subtotalCents =
    items.length === 0
      ? null
      : calculables.reduce<bigint | null>((total, item) => {
          if (total === null) return null;
          const cents = centsOf(item.capitalPendiente);
          return cents === null ? null : total + cents;
        }, 0n);
  const completa =
    items.length > 0 &&
    calculables.length === items.length &&
    subtotalCents !== null;
  const total = completa ? decimal(subtotalCents!) : null;
  const estado: ResumenDeudaNoHipotecaria["estado"] =
    items.length === 0
      ? "Sin datos"
      : completa
        ? total === "0.00"
          ? "Cero verificado"
          : "Verificado"
        : "Parcial";
  return {
    subtotal: subtotalCents === null ? null : decimal(subtotalCents),
    total,
    estado,
    incluidos: calculables.length,
    excluidos: items.length - calculables.length,
    motivos: items
      .filter((item) => !item.capital.calculable)
      .map(
        (item) =>
          `${item.id}: ${item.capital.motivoNoCalculable ?? "capital no calculable"}`,
      ),
    ids: items.map((item) => item.id),
    revisiones: items.map((item) => `${item.id}@${item.revision}`),
  };
}
