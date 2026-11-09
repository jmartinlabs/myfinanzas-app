/**
 * Lectura defensiva de campos `unknown` de los DTO de `/fotos`.
 *
 * Las ausencias se muestran como «No disponible»; nunca se convierten en 0 ni
 * se inventan bloques. Las funciones no mutan la entrada.
 */

import type {
  CoverageRow,
  NoDisponiblePeriodoDto,
  NoDisponibleRow,
} from "./types";

export function property(value: unknown, key: string): unknown {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

export function countPhrase(
  value: unknown,
  singular: string,
  plural: string,
): string {
  if (!Array.isArray(value)) return "No disponible";
  return `${value.length} ${value.length === 1 ? singular : plural}`;
}

export function coverageState(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { estado?: unknown }).estado === "string"
  )
    return (value as { estado: string }).estado;
  return "No disponible";
}

export function coverageRows(value: unknown): CoverageRow[] {
  if (!value || typeof value !== "object") return [];
  const totales = (value as { totales?: unknown }).totales;
  if (!totales || typeof totales !== "object" || Array.isArray(totales))
    return [];
  const rows: CoverageRow[] = [];
  for (const [bloque, item] of Object.entries(
    totales as Record<string, unknown>,
  )) {
    if (!item || typeof item !== "object") continue;
    const row = item as { estado?: unknown; motivo?: unknown };
    rows.push({
      bloque,
      estado: typeof row.estado === "string" ? row.estado : "No disponible",
      motivo: typeof row.motivo === "string" ? row.motivo : "",
    });
  }
  return rows;
}

export function noDisponibleRows(value: unknown): NoDisponibleRow[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index): NoDisponibleRow[] => {
      if (!item || typeof item !== "object") return [];
      const row = item as {
        bloque?: unknown;
        estado?: unknown;
        motivo?: unknown;
        codigoAusencia?: unknown;
      };
      return [
        {
          bloque:
            typeof row.bloque === "string" ? row.bloque : String(index),
          estado:
            typeof row.estado === "string" ? row.estado : "No disponible",
          motivo: typeof row.motivo === "string" ? row.motivo : null,
          ...(typeof row.codigoAusencia === "string"
            ? { codigoAusencia: row.codigoAusencia }
            : {}),
        },
      ];
    });
  }
  if (!value || typeof value !== "object") return [];
  const rows: NoDisponibleRow[] = [];
  for (const [bloque, item] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (!item || typeof item !== "object") {
      rows.push({ bloque, estado: "No disponible", motivo: null });
      continue;
    }
    const row = item as {
      estado?: unknown;
      motivo?: unknown;
      codigoAusencia?: unknown;
    };
    rows.push({
      bloque,
      estado: typeof row.estado === "string" ? row.estado : "No disponible",
      motivo: typeof row.motivo === "string" ? row.motivo : null,
      ...(typeof row.codigoAusencia === "string"
        ? { codigoAusencia: row.codigoAusencia }
        : {}),
    });
  }
  return rows;
}

export function periodNoDisponibleRows(
  rows: NoDisponiblePeriodoDto[] | null,
): NoDisponibleRow[] {
  // AC09-H: a persisted `null` is an uncertified absence, not `[]`. Never
  // traverse it as an array and never invent rows.
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    bloque: row.bloque,
    estado: row.estado,
    motivo: row.motivo,
    ...(row.codigoAusencia ? { codigoAusencia: row.codigoAusencia } : {}),
    ciclo: row.ciclo,
    version: row.versionFoto,
  }));
}
