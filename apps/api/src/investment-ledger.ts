import type { Database } from "bun:sqlite";

export const INVESTMENT_SOURCE = "Operaciones de inversión" as const;

export type InvestmentReferenceSource =
  | { source: typeof INVESTMENT_SOURCE; state: "pendiente" }
  | {
      source: typeof INVESTMENT_SOURCE;
      state: "disponible";
      maxDate: string | null;
    }
  | { source: typeof INVESTMENT_SOURCE; state: "error" };

/**
 * E4.2 «Operaciones de inversión» source of the shared temporal reference
 * (SPEC22 §4.5, D6). Only vigente Compras and Ventas contribute; a rectified
 * operation contributes its current date and an annulled one none. The source
 * has the four states of E1.3/E3.4 instead of an ambiguous null, and never uses
 * `creado`, audit instants, the wall clock or `Date.now`.
 *
 * Consumed by `financialReference` exactly like `movementSource` and
 * `revisionComidaSource`; this module does not reimplement the aggregation.
 */
export function investmentSource(db: Database): InvestmentReferenceSource {
  if (
    !db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='operaciones_inversion'",
      )
      .get()
  )
    return { source: INVESTMENT_SOURCE, state: "pendiente" };
  try {
    const row = db
      .query(
        "SELECT MAX(fecha) fecha FROM operaciones_inversion WHERE estado='Vigente'",
      )
      .get() as { fecha: string | null };
    return { source: INVESTMENT_SOURCE, state: "disponible", maxDate: row.fecha };
  } catch {
    return { source: INVESTMENT_SOURCE, state: "error" };
  }
}
