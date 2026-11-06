/**
 * Formateador único de cifras exactas publicadas por el API.
 *
 * No convierte las cadenas decimales a `number`: conserva valor, signo y
 * redondeo tal como llegan. El guion de los negativos es ASCII (`-`) para no
 * romper las aserciones existentes que comparan `-12,34 €`.
 */

export type AmountUnit = "EUR" | "meses" | "conteo" | null;

/**
 * Agrupa miles con punto y separa decimales con coma, sin cambiar el valor.
 *
 * `1.234,56 €`, `12,00 meses` o `5,00` según la unidad.
 */
export function formatAmount(
  value: string,
  unit: AmountUnit = "EUR",
): string {
  const negative = value.startsWith("-");
  const raw = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = raw.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = fraction.padEnd(2, "0").slice(0, 2);
  const text = `${grouped},${decimals}`;
  const signed = negative ? `-${text}` : text;
  if (unit === "EUR") return `${signed} €`;
  if (unit === "meses") return `${signed} meses`;
  return signed;
}

/** Wrapper histórico para importes: `null` sigue siendo «Sin informar». */
export function eur(value: string | null): string {
  return value === null ? "Sin informar" : formatAmount(value, "EUR");
}

/** Wrapper de compatibilidad para las pantallas que ya usaban `formatDecimal`. */
export function formatDecimal(
  value: string,
  unit: AmountUnit = "EUR",
): string {
  return formatAmount(value, unit);
}
