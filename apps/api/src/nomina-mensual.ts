/** Central payroll reference for E2.6. Documentary sources never become bank receipts. */
import type { Database } from "bun:sqlite";
import { payRows, structuralDocumentReference, type Pay } from "./nomina";
import { D, Decimal } from "./payroll-decimal";
import { fingerprint } from "./movement-ledger";
import { civil } from "./ciclos";
export type Ratio = { numerador: string; escala: number; divisor: string };
export function ratioMoney(r: Ratio, subtract = "0") {
  const delta = new Decimal(BigInt(r.numerador), r.escala).sub(
    D(subtract).mul(D(r.divisor)),
  );
  let numerator = delta.n * 100n;
  const denominator = 10n ** BigInt(delta.scale) * BigInt(r.divisor);
  const sign = numerator < 0n ? -1n : 1n;
  numerator = numerator < 0n ? -numerator : numerator;
  return new Decimal(
    sign *
      (numerator / denominator +
        ((numerator % denominator) * 2n >= denominator ? 1n : 0n)),
    2,
  ).money();
}
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const absolute = y * 12 + m - 1 + delta;
  return (
    String(Math.floor(absolute / 12)).padStart(4, "0") +
    "-" +
    String((absolute % 12) + 1).padStart(2, "0")
  );
}
export function monthlyReference(pays: Pay[], cutoff: string | null) {
  if (cutoff !== null) civil(cutoff);
  // ID/revision identifies repeated representations, never month/type/amount.
  const unique = new Map<string, Pay>();
  const conflicts = new Set<string>();
  for (const p of pays) {
    const old = unique.get(p.id);
    if (
      old &&
      old.revision === p.revision &&
      fingerprint(old) !== fingerprint(p)
    )
      conflicts.add(p.id);
    if (!old || p.revision > old.revision) unique.set(p.id, p);
  }
  const ordinary = [...unique.values()].filter(
    (p) =>
      p.tipo === "Ordinaria" && cutoff !== null && p.mes <= cutoff.slice(0, 7),
  );
  const references = ordinary.map((p) => ({
    ...structuralDocumentReference(p),
    id: p.id,
    revision: p.revision,
    mes: p.mes,
    evidencia: p.evidencia,
    evidenciaDocumentado: p.evidenciaDocumentado,
  }));
  // Equal evidence on distinct IDs cannot establish whether these are distinct pays.
  const evidence = new Map<string, Set<string>>();
  for (const p of ordinary)
    for (const key of new Set(
      [p.evidencia, p.evidenciaDocumentado].filter(Boolean),
    )) {
      if (!evidence.has(key)) evidence.set(key, new Set());
      evidence.get(key)!.add(p.id);
    }
  for (const p of references)
    if (
      conflicts.has(p.id) ||
      [p.evidencia, p.evidenciaDocumentado].some(
        (key) => (evidence.get(key)?.size ?? 0) > 1,
      )
    ) {
      p.exacto = null;
      p.motivo =
        "Identidad/evidencia documental duplicada pendiente de revisión";
    }
  const anchor =
    references
      .filter((p) => p.exacto !== null)
      .map((p) => p.mes)
      .sort()
      .at(-1) ?? null;
  const months = anchor
    ? Array.from({ length: 12 }, (_, i) => {
        const mes = shiftMonth(anchor, i - 11),
          rows = references.filter((p) => p.mes === mes);
        const known = rows
          .filter((p) => p.exacto !== null)
          .reduce((s, p) => s.add(D(p.exacto!)), D("0"));
        const valid = rows.length > 0 && rows.every((p) => p.exacto !== null);
        return {
          mes,
          valido: valid,
          exacto: valid ? known.exact() : null,
          subtotalConocido: rows.some((p) => p.exacto !== null)
            ? known.money()
            : null,
          motivo: !rows.length
            ? "Sin Ordinaria documentada"
            : valid
              ? "Total mensual documental verificado"
              : "Mes incompleto: revisar las pagas indicadas",
          pagas: rows,
        };
      })
    : [];
  const valid = months.filter((m) => m.valido),
    n = valid.length;
  const sum = valid.reduce((s, m) => s.add(D(m.exacto!)), D("0"));
  const exacto: Ratio | null = n
    ? { numerador: sum.n.toString(), escala: sum.scale, divisor: String(n) }
    : null;
  return {
    corte: cutoff,
    ancla: anchor,
    inicio: anchor ? shiftMonth(anchor, -11) : null,
    fin: anchor,
    n,
    denominadorCobertura: 12,
    estado: !n ? "No disponible" : n < 12 ? "Parcial" : "Verificado",
    valor: exacto ? ratioMoney(exacto) : null,
    exacto,
    meses: months,
    avisos: references.filter((p) => p.exacto === null),
    motivo:
      cutoff === null
        ? "Sin corte verificable"
        : !n
          ? "Sin mensualidades documentales válidas"
          : "Media de totales mensuales válidos; no de filas ni divisor 12 fijo",
    procedencia:
      "Nómina · referencia documental estructural; diferente de C48 física por filas",
    revision: fingerprint([cutoff, pays]),
  };
}
export function payrollMonthlyReference(db: Database, cutoff: string | null) {
  return monthlyReference(payRows(db), cutoff);
}
