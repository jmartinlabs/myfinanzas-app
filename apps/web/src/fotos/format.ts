/**
 * Formateo de presentación de `/fotos`.
 *
 * Conserva las mismas cadenas que la UI anterior: fechas civiles `dd/mm/aaaa`,
 * instantes UTC `aaaa-mm-dd hh:mm UTC` e importes publicados como string.
 */

import { eur } from "../api";

export function date(value: string | null | undefined): string {
  if (!value) return "No disponible";
  return value.split("-").reverse().join("/");
}

export function utc(value: string | null | undefined): string {
  if (!value) return "No disponible";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function money(value: string | null | undefined): string {
  if (value === null || value === undefined) return "No disponible";
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return value;
  return eur(value);
}
