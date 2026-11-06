import type { Database } from "bun:sqlite";

/**
 * E4.10 — single read-only reader of the `reapertura_activa` projection.
 *
 * Both the I2 API (`e410.ts`) and the T1 guards (`e49-guards.ts`) must see the
 * same window. This module is the only place that reads the projection and
 * decides whether it is open, inconsistent or invalidated by a later closure.
 * It never throws: callers choose whether to fail closed (guards) or expose a
 * structured blocking result (revalidation).
 */

export type ReopeningEvent = {
  id: number;
  ciclo: string;
  versionOrigen: number;
  actor: string;
  creadoUtc: string;
  motivo: string;
  correlacion: string | null;
  fingerprint: string;
};

export type CierrePosterior = {
  ciclo: string;
  version: number;
  fin: string;
};

export type ActiveWindowReading =
  | { estado: "SinVentana" }
  | { estado: "Abierta"; ventana: ReopeningEvent }
  | {
      estado: "Inconsistente";
      ciclo: string;
      motivo: string;
      evento: ReopeningEvent | null;
      comparado: Record<string, unknown>;
    }
  | {
      estado: "CierrePosterior";
      ciclo: string;
      ventana: ReopeningEvent;
      cierrePosterior: CierrePosterior;
      finVentana: string;
      comparado: Record<string, unknown>;
    };

type ActiveRow = {
  ciclo: string;
  reapertura_id: number;
  id: number | null;
  evento_ciclo: string | null;
  version_origen: number | null;
  tipo: string | null;
  actor: string | null;
  creado_utc: string | null;
  motivo: string | null;
  correlacion: string | null;
  fingerprint_peticion: string | null;
  resultado: string | null;
};

function hasTable(db: Database, name: string) {
  return !!db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
}

function eventOf(row: ActiveRow): ReopeningEvent | null {
  if (
    row.id === null ||
    typeof row.evento_ciclo !== "string" ||
    typeof row.version_origen !== "number" ||
    typeof row.actor !== "string" ||
    typeof row.creado_utc !== "string" ||
    typeof row.motivo !== "string" ||
    typeof row.fingerprint_peticion !== "string"
  )
    return null;
  return {
    id: row.id,
    ciclo: row.evento_ciclo,
    versionOrigen: row.version_origen,
    actor: row.actor,
    creadoUtc: row.creado_utc,
    motivo: row.motivo,
    correlacion: row.correlacion,
    fingerprint: row.fingerprint_peticion,
  };
}

export function readActiveWindow(db: Database): ActiveWindowReading {
  if (
    !hasTable(db, "reapertura_activa") ||
    !hasTable(db, "reaperturas") ||
    !hasTable(db, "cierres")
  )
    return { estado: "SinVentana" };
  const row = db
    .query(
      `SELECT p.ciclo,p.reapertura_id,r.id,r.ciclo AS evento_ciclo,
        r.version_origen,r.tipo,r.actor,r.creado_utc,r.motivo,r.correlacion,
        r.fingerprint_peticion,r.resultado
       FROM reapertura_activa p
       LEFT JOIN reaperturas r ON r.id=p.reapertura_id
       WHERE p.id=1`,
    )
    .get() as ActiveRow | null;
  if (!row) return { estado: "SinVentana" };
  const evento = eventOf(row);
  if (
    row.id === null ||
    !evento ||
    row.evento_ciclo !== row.ciclo ||
    row.tipo !== "reapertura" ||
    row.resultado !== "Abierta"
  )
    return {
      estado: "Inconsistente",
      ciclo: row.ciclo,
      motivo:
        "La proyección de reapertura no corresponde a una reapertura válida.",
      evento,
      comparado: {
        cicloProyeccion: row.ciclo,
        cicloEvento: row.evento_ciclo,
        tipo: row.tipo,
        resultado: row.resultado,
        reaperturaId: row.reapertura_id,
      },
    };
  const last = db
    .query(
      "SELECT version,fin FROM cierres WHERE ciclo=? ORDER BY version DESC LIMIT 1",
    )
    .get(row.ciclo) as { version: number; fin: string } | null;
  if (!last || row.version_origen !== last.version)
    return {
      estado: "Inconsistente",
      ciclo: row.ciclo,
      motivo:
        "La proyección de reapertura no corresponde a la última versión cerrada.",
      evento,
      comparado: {
        versionOrigen: row.version_origen,
        ultimaVersion: last?.version ?? null,
      },
    };
  const later = db
    .query(
      `SELECT c.ciclo,c.version,c.fin FROM cierres c
       WHERE c.ciclo<>?
         AND c.version=(SELECT MAX(v.version) FROM cierres v WHERE v.ciclo=c.ciclo)
         AND c.fin>=?
       ORDER BY c.fin,c.ciclo LIMIT 1`,
    )
    .get(row.ciclo, last.fin) as CierrePosterior | null;
  if (later)
    return {
      estado: "CierrePosterior",
      ciclo: row.ciclo,
      ventana: evento!,
      cierrePosterior: later,
      finVentana: last.fin,
      comparado: {
        versionOrigen: row.version_origen,
        finVentana: last.fin,
        cierrePosterior: later,
      },
    };
  return { estado: "Abierta", ventana: evento! };
}

/** Guards-only projection: the cycle with a valid open window, else `null`. */
export function activeReopenedCycle(db: Database): string | null {
  const reading = readActiveWindow(db);
  return reading.estado === "Abierta" ? reading.ventana.ciclo : null;
}
