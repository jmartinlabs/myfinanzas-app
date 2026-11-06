import type { Database } from "bun:sqlite";
import { dayBefore, getCycle } from "./ciclos";
import { readActiveWindow, type ReopeningEvent } from "./e410-window";
import { fingerprint } from "./movement-ledger";
import { Problem } from "./problem";
import { decimal } from "./saldos";

/**
 * E4.10 I3 — read-only revalidation of later dependencies (SPEC28 §9, D4).
 *
 * The operation never writes: it does not update S0, plans, photos,
 * `reaperturas` or any precontrol/aggregate source. It returns the compared
 * values, the result per dependency and a deterministic fingerprint so I4 can
 * persist the same evidence with the re-closure (the persistence/audit chain
 * belongs to I4 and is deliberately not anticipated here).
 *
 * E4.5 (precontrol) and E4.11 (aggregates) are not implemented. When no
 * provider is supplied the result is `NoDisponible` with an explicit motive:
 * never `0`, never `Verificado` and never a blocker by itself. A provider may
 * be wired by the future increment; unreadable, contradictory or unaccredited
 * evidence fails closed.
 */

export type RevalidacionCheckEstado =
  | "Verificado"
  | "NoDisponible"
  | "Aviso"
  | "Bloqueante";

export type RevalidacionCheck = {
  clave:
    | "version"
    | "cierrePosterior"
    | "fotosPosteriores"
    | "s0PlanSiguiente"
    | "auxiliares"
    | "agregadosE411"
    | "precontrolE45";
  estado: RevalidacionCheckEstado;
  codigo: string | null;
  motivo: string | null;
  /** Values read and compared, never a recomputed financial total. */
  comparado: unknown;
};

export type RevalidacionEstado =
  | "Verificado"
  | "Parcial"
  | "ConAvisos"
  | "Bloqueante";

export type RevalidacionBody = {
  ciclo: string;
  estado: RevalidacionEstado;
  bloquea: boolean;
  version: number | null;
  reapertura: { id: number; versionOrigen: number } | null;
  comprobaciones: RevalidacionCheck[];
  bloqueos: string[];
  avisos: string[];
};

export type RevalidacionResult = RevalidacionBody & { fingerprint: string };

export type RevalidacionAporte = {
  estado:
    | "Verificado"
    | "NoDisponible"
    | "Ilegible"
    | "Contradiccion"
    | "Aviso";
  codigo?: string | null;
  motivo?: string | null;
  /** Present on `Verificado`: read-only values to record. */
  datos?: unknown;
  /** Present on `Contradiccion`/`Aviso`: expected and observed values. */
  esperado?: unknown;
  observado?: unknown;
  /** Required on `Aviso`: why the difference is non-blocking. */
  acreditacion?: string | null;
};

export type RevalidacionProveedor = () => RevalidacionAporte;

export type RevalidacionOptions = {
  /** E4.5 precontrol/historical read model. Absent means not implemented. */
  precontrol?: RevalidacionProveedor;
  /** E4.11 aggregate read model. Absent means not implemented. */
  agregados?: RevalidacionProveedor;
};

type ClosureRow = { version: number; inicio: string; fin: string };

function lastClosure(db: Database, ciclo: string): ClosureRow | null {
  return (
    (db
      .query(
        "SELECT version,inicio,fin FROM cierres WHERE ciclo=? ORDER BY version DESC LIMIT 1",
      )
      .get(ciclo) as ClosureRow | null) ?? null
  );
}

function hasTable(db: Database, name: string) {
  return !!db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function blocked(
  clave: RevalidacionCheck["clave"],
  motivo: string,
  codigo = "REVALIDACION_BLOQUEANTE",
  comparado: unknown = null,
): RevalidacionCheck {
  return { clave, estado: "Bloqueante", codigo, motivo, comparado };
}

function externalCheck(
  clave: RevalidacionCheck["clave"],
  proveedor: RevalidacionProveedor | undefined,
  absent: { codigo: string; motivo: string },
): RevalidacionCheck {
  if (!proveedor)
    return {
      clave,
      estado: "NoDisponible",
      codigo: absent.codigo,
      motivo: absent.motivo,
      comparado: null,
    };
  let raw: unknown;
  try {
    raw = proveedor();
  } catch {
    return blocked(
      clave,
      `No se pudo leer la fuente ${clave}; no se asume que no bloquee.`,
    );
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return blocked(clave, `La fuente ${clave} no devolvió datos legibles.`);
  const aporte = raw as RevalidacionAporte;
  switch (aporte.estado) {
    case "Verificado":
      if (aporte.datos === undefined || aporte.datos === null)
        return blocked(
          clave,
          `La fuente ${clave} se declaró verificada sin datos comparables.`,
        );
      return {
        clave,
        estado: "Verificado",
        codigo: null,
        motivo: null,
        comparado: aporte.datos,
      };
    case "NoDisponible": {
      const motivo = text(aporte.motivo);
      if (!motivo)
        return blocked(
          clave,
          `La fuente ${clave} no explicó por qué no está disponible.`,
        );
      return {
        clave,
        estado: "NoDisponible",
        codigo: text(aporte.codigo) ?? absent.codigo,
        motivo,
        comparado: null,
      };
    }
    case "Ilegible":
      return blocked(
        clave,
        text(aporte.motivo) ??
          `La fuente ${clave} existe pero no se pudo leer; no se asume no bloqueante.`,
      );
    case "Contradiccion": {
      const motivo = text(aporte.motivo);
      if (!motivo)
        return blocked(
          clave,
          `La fuente ${clave} informa contradicción sin motivo.`,
        );
      return blocked(clave, motivo, "REVALIDACION_BLOQUEANTE", {
        esperado: aporte.esperado ?? null,
        observado: aporte.observado ?? null,
      });
    }
    case "Aviso": {
      const motivo = text(aporte.motivo);
      const acreditacion = text(aporte.acreditacion);
      if (!motivo || !acreditacion)
        return blocked(
          clave,
          `La diferencia de ${clave} no está acreditada como no bloqueante.`,
        );
      return {
        clave,
        estado: "Aviso",
        codigo: text(aporte.codigo) ?? "AVISO_NO_MATERIAL",
        motivo,
        comparado: {
          esperado: aporte.esperado ?? null,
          observado: aporte.observado ?? null,
          acreditacion,
        },
      };
    }
    default:
      return blocked(
        clave,
        `La fuente ${clave} devolvió un resultado no reconocido.`,
      );
  }
}

function nextCycle(db: Database, ciclo: string) {
  return (
    (db
      .query(
        `SELECT id,inicio,CAST(saldo_comida AS TEXT) saldo_comida,revision
         FROM ciclos WHERE inicio>? ORDER BY inicio LIMIT 1`,
      )
      .get(ciclo) as {
      id: string;
      inicio: string;
      saldo_comida: string;
      revision: number;
    } | null) ?? null
  );
}

type PlanReading =
  | {
      estado: "SinPlan" | "Capturado" | "PlanNoVerificable";
      revision: number | null;
      auditRevision: number | null;
      lineas: number;
      motivo: string | null;
    }
  | { error: string };

/**
 * Mirrors `planSnapshot` in `e49.ts`: a plan is only verifiable when its
 * current revision matches the latest `cycle_plan_audit` revision. A missing
 * plan with no lines is a valid `SinPlan`; unreadable or mismatched plan data
 * blocks instead of being reported as verified.
 */
function nextPlan(db: Database, ciclo: string): PlanReading {
  if (
    !hasTable(db, "cycle_plans") ||
    !hasTable(db, "cycle_plan_lines") ||
    !hasTable(db, "cycle_plan_audit")
  )
    return { error: "El plan del ciclo siguiente no es legible." };
  try {
    const header = db
      .query("SELECT revision FROM cycle_plans WHERE ciclo=?")
      .get(ciclo) as { revision: number } | null;
    const lines = db
      .query("SELECT COUNT(*) n FROM cycle_plan_lines WHERE ciclo=?")
      .get(ciclo) as { n: number };
    const audit = db
      .query("SELECT MAX(revision) m FROM cycle_plan_audit WHERE ciclo=?")
      .get(ciclo) as { m: number | null } | null;
    if (!header && lines.n > 0)
      return {
        error: "Hay líneas de plan sin cabecera para el ciclo siguiente.",
      };
    if (header && (!Number.isSafeInteger(header.revision) || header.revision < 1))
      return { error: "La revisión del plan siguiente es ilegible." };
    const mismatch =
      !!header &&
      audit?.m !== null &&
      audit?.m !== undefined &&
      audit.m !== header.revision;
    const sinPlan = lines.n === 0;
    return {
      estado: sinPlan ? "SinPlan" : mismatch ? "PlanNoVerificable" : "Capturado",
      revision: header?.revision ?? null,
      auditRevision: audit?.m ?? null,
      lineas: lines.n,
      motivo: mismatch
        ? "La revisión del plan no coincide con su auditoría; no es verificable."
        : null,
    };
  } catch {
    return { error: "No se pudo leer el plan del ciclo siguiente." };
  }
}

type AuxiliaryRows = {
  anticipos: Record<string, unknown>[];
  compartidos: Record<string, unknown>[];
  nomina: Record<string, unknown>[];
  revisionComida: Record<string, unknown>[];
  deuda: Record<string, unknown>[];
};

const auxiliarySources = [
  "anticipos",
  "compartidos",
  "nomina",
  "revisionComida",
  "deuda",
] as const;

function auxiliaryRows(
  db: Database,
  inicio: string,
  fin: string,
): AuxiliaryRows {
  const required = [
    "movimiento_anticipo",
    "movimiento_compartido",
    "payroll_allocations",
    "movimiento_revision_comida",
    "deudas",
  ];
  for (const table of required)
    if (!hasTable(db, table))
      throw new Error(`Falta la tabla auxiliar ${table}.`);
  return {
    anticipos: db
      .query(
        `SELECT a.movimiento,a.referencia,a.rol,CAST(m.importe AS TEXT) importe,m.fecha
         FROM movimiento_anticipo a JOIN movimientos m ON m.id=a.movimiento
         WHERE m.fecha BETWEEN ? AND ? ORDER BY a.movimiento`,
      )
      .all(inicio, fin) as Record<string, unknown>[],
    compartidos: db
      .query(
        `SELECT c.movimiento,c.referencia,c.participante,CAST(m.importe AS TEXT) importe,m.fecha
         FROM movimiento_compartido c JOIN movimientos m ON m.id=c.movimiento
         WHERE m.fecha BETWEEN ? AND ? ORDER BY c.movimiento`,
      )
      .all(inicio, fin) as Record<string, unknown>[],
    nomina: db
      .query(
        `SELECT p.paga,p.movimiento,CAST(p.importe AS TEXT) importe,m.fecha
         FROM payroll_allocations p JOIN movimientos m ON m.id=p.movimiento
         WHERE m.fecha BETWEEN ? AND ? ORDER BY p.movimiento`,
      )
      .all(inicio, fin) as Record<string, unknown>[],
    revisionComida: db
      .query(
        `SELECT c.movimiento,c.etiqueta,c.estado_revision estadoRevision,
           CAST(m.importe AS TEXT) importe,m.fecha
         FROM movimiento_revision_comida c JOIN movimientos m ON m.id=c.movimiento
         WHERE m.fecha BETWEEN ? AND ? ORDER BY c.movimiento`,
      )
      .all(inicio, fin) as Record<string, unknown>[],
    deuda: db
      .query(
        "SELECT id,nombre,estado,revision,CAST(apertura AS TEXT) apertura FROM deudas ORDER BY id",
      )
      .all() as Record<string, unknown>[],
  };
}

function photoAuxiliaryRows(
  db: Database,
  ciclo: string,
  version: number,
): AuxiliaryRows {
  const row = db
    .query(
      "SELECT auxiliares FROM fotos_cierre WHERE ciclo=? AND version=?",
    )
    .get(ciclo, version) as { auxiliares: string } | null;
  if (!row) throw new Error("La foto no contiene bloque de auxiliares.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.auxiliares);
  } catch {
    throw new Error("El bloque de auxiliares de la foto no es legible.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("El bloque de auxiliares de la foto no es legible.");
  const value = parsed as Record<string, unknown>;
  const result = {} as AuxiliaryRows;
  for (const source of auxiliarySources) {
    if (!Array.isArray(value[source]))
      throw new Error(`El auxiliar ${source} de la foto no es legible.`);
    result[source] = value[source] as Record<string, unknown>[];
  }
  return result;
}

function auxiliaryKey(
  source: (typeof auxiliarySources)[number],
  row: Record<string, unknown>,
): string {
  const field = (name: string) => String(row[name] ?? "");
  switch (source) {
    case "anticipos":
      return `${field("movimiento")}|${field("referencia")}|${field("rol")}`;
    case "compartidos":
      return `${field("movimiento")}|${field("referencia")}|${field("participante")}`;
    case "nomina":
      return `${field("paga")}|${field("movimiento")}`;
    case "revisionComida":
      return `${field("movimiento")}|${field("etiqueta")}`;
    case "deuda":
      return field("id");
  }
}

function auxiliaryKeys(
  source: (typeof auxiliarySources)[number],
  rows: Record<string, unknown>[],
): Set<string> {
  return new Set(rows.map((row) => auxiliaryKey(source, row)));
}

function auxiliaryCounts(rows: AuxiliaryRows): Record<string, number> {
  return Object.fromEntries(
    auxiliarySources.map((source) => [source, rows[source].length]),
  );
}

function canonical(value: Record<string, unknown>): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

function compareAuxiliary(stored: AuxiliaryRows, live: AuxiliaryRows) {
  const faltan: string[] = [],
    nuevos: string[] = [],
    cambiados: string[] = [];
  for (const source of auxiliarySources) {
    const storedRows = new Map(
      stored[source].map((row) => [auxiliaryKey(source, row), row]),
    );
    const liveRows = new Map(
      live[source].map((row) => [auxiliaryKey(source, row), row]),
    );
    for (const [key, row] of storedRows) {
      const current = liveRows.get(key);
      if (!current) faltan.push(`${source}:${key}`);
      else if (canonical(row) !== canonical(current))
        cambiados.push(`${source}:${key}`);
    }
    for (const key of liveRows.keys())
      if (!storedRows.has(key)) nuevos.push(`${source}:${key}`);
  }
  return { faltan, nuevos, cambiados };
}

/**
 * A stored auxiliary row whose movement no longer exists is a real
 * contradiction: the photo captured a reference that the live database cannot
 * explain. A row merely unlinked inside the window is a T2 rectification and
 * is reported as a warning, not a blocker.
 */
function danglingAuxiliaryRows(
  db: Database,
  stored: AuxiliaryRows,
): string[] {
  const dangling: string[] = [];
  for (const source of ["anticipos", "compartidos", "nomina", "revisionComida"] as const)
    for (const row of stored[source]) {
      const movimiento = row.movimiento;
      if (
        typeof movimiento === "string" &&
        !db.query("SELECT 1 FROM movimientos WHERE id=?").get(movimiento)
      )
        dangling.push(`${source}:${auxiliaryKey(source, row)}`);
    }
  return dangling;
}

/**
 * Compute the read-only revalidation for a cycle with an open window. It
 * throws 409 `NO_REBIERTO` when there is no active window for that cycle.
 */
export function getRevalidacion(
  db: Database,
  cicloId: string,
  options: RevalidacionOptions = {},
): RevalidacionResult {
  const { ciclo } = getCycle(db, cicloId);
  const reading = readActiveWindow(db);
  const noActive = () =>
    new Problem(
      409,
      "NO_REBIERTO",
      "El ciclo no tiene una reapertura activa que revalidar.",
      {},
      { ciclo: ciclo.id },
    );
  if (reading.estado === "SinVentana") throw noActive();
  if (
    (reading.estado === "Abierta" &&
      reading.ventana.ciclo !== ciclo.id) ||
    ((reading.estado === "CierrePosterior" ||
      reading.estado === "Inconsistente") &&
      reading.ciclo !== ciclo.id)
  )
    throw noActive();

  const last = lastClosure(db, ciclo.id);
  const event: ReopeningEvent | null =
    reading.estado === "Abierta" || reading.estado === "CierrePosterior"
      ? reading.ventana
      : reading.estado === "Inconsistente"
        ? reading.evento
        : null;
  const versionOrigen = event?.versionOrigen ?? null;
  const comprobaciones: RevalidacionCheck[] = [];

  if (!last)
    comprobaciones.push(
      blocked(
        "version",
        "No existe un cierre que revalidar.",
        "SIN_CIERRE",
        { versionOrigen, ultimaVersion: null },
      ),
    );
  else if (reading.estado !== "Inconsistente" && versionOrigen === last.version)
    comprobaciones.push({
      clave: "version",
      estado: "Verificado",
      codigo: null,
      motivo: null,
      comparado: { versionOrigen, ultimaVersion: last.version },
    });
  else
    comprobaciones.push(
      blocked(
        "version",
        reading.estado === "Inconsistente"
          ? reading.motivo
          : "La ventana no corresponde a la última versión cerrada.",
        "ESTADO_INCONSISTENTE",
        { versionOrigen, ultimaVersion: last.version },
      ),
    );

  if (!last)
    comprobaciones.push({
      clave: "cierrePosterior",
      estado: "NoDisponible",
      codigo: "SIN_CIERRE",
      motivo: "No hay cierre con el que comparar un cierre posterior.",
      comparado: null,
    });
  else if (reading.estado === "CierrePosterior")
    comprobaciones.push(
      blocked(
        "cierrePosterior",
        "Existe un cierre posterior durante la ventana; no se altera.",
        "CIERRE_POSTERIOR",
        {
          cierrePosterior: reading.cierrePosterior,
          finVentana: last.fin,
        },
      ),
    );
  else {
    const laterClosure = db
      .query(
        `SELECT c.ciclo,c.version,c.fin FROM cierres c
         WHERE c.ciclo<>?
           AND c.version=(SELECT MAX(v.version) FROM cierres v WHERE v.ciclo=c.ciclo)
           AND c.fin>=?
         ORDER BY c.fin,c.ciclo LIMIT 1`,
      )
      .get(ciclo.id, last.fin) as {
      ciclo: string;
      version: number;
      fin: string;
    } | null;
    comprobaciones.push(
      laterClosure
        ? blocked(
            "cierrePosterior",
            "Existe un cierre posterior durante la ventana; no se altera.",
            "CIERRE_POSTERIOR",
            laterClosure,
          )
        : {
            clave: "cierrePosterior",
            estado: "Verificado",
            codigo: null,
            motivo: null,
            comparado: { cierrePosterior: null },
          },
    );
  }

  if (!last)
    comprobaciones.push({
      clave: "fotosPosteriores",
      estado: "NoDisponible",
      codigo: "SIN_CIERRE",
      motivo: "No hay foto de cierre que comparar.",
      comparado: null,
    });
  else if (versionOrigen !== null && versionOrigen < last.version)
    comprobaciones.push(
      blocked(
        "fotosPosteriores",
        "Apareció una versión posterior del mismo ciclo durante la ventana.",
        "VERSION_POSTERIOR",
        { versionOrigen, ultimaVersion: last.version },
      ),
    );
  else {
    const laterVersion = db
      .query(
        "SELECT version,creado_utc FROM cierres WHERE ciclo=? AND version>? ORDER BY version LIMIT 1",
      )
      .get(ciclo.id, last.version) as {
      version: number;
      creado_utc: string;
    } | null;
    comprobaciones.push(
      laterVersion
        ? blocked(
            "fotosPosteriores",
            "Apareció una versión posterior del mismo ciclo durante la ventana.",
            "VERSION_POSTERIOR",
            laterVersion,
          )
        : {
            clave: "fotosPosteriores",
            estado: "Verificado",
            codigo: null,
            motivo: null,
            comparado: { ultimaVersion: last.version },
          },
    );
  }

  const siguiente = last ? nextCycle(db, ciclo.inicio) : null;
  const esperadoFin = siguiente ? dayBefore(siguiente.inicio) : null;
  if (!last)
    comprobaciones.push({
      clave: "s0PlanSiguiente",
      estado: "NoDisponible",
      codigo: "SIN_CIERRE",
      motivo: "No hay ventana cerrada desde la que revalidar el ciclo siguiente.",
      comparado: null,
    });
  else if (!siguiente)
    comprobaciones.push({
      clave: "s0PlanSiguiente",
      estado: "NoDisponible",
      codigo: "SIN_CICLO_SIGUIENTE",
      motivo: "No existe un ciclo siguiente que revalidar.",
      comparado: null,
    });
  else {
    const plan = nextPlan(db, siguiente.id);
    const comparado = {
      siguiente: {
        id: siguiente.id,
        inicio: siguiente.inicio,
        saldoInicialComida: decimal(String(siguiente.saldo_comida)),
        revision: siguiente.revision,
      },
      finFoto: last.fin,
      esperadoFin,
      plan,
    };
    if (esperadoFin !== last.fin)
      comprobaciones.push(
        blocked(
          "s0PlanSiguiente",
          "La ventana congelada del cierre no coincide con el ciclo siguiente.",
          "S0_PLAN_INCOHERENTE",
          comparado,
        ),
      );
    else if ("error" in plan)
      comprobaciones.push(
        blocked(
          "s0PlanSiguiente",
          plan.error,
          "PLAN_ILEGIBLE",
          comparado,
        ),
      );
    else if (plan.estado === "PlanNoVerificable")
      comprobaciones.push(
        blocked(
          "s0PlanSiguiente",
          plan.motivo ??
            "La revisión del plan no coincide con su auditoría; no es verificable.",
          "PLAN_NO_VERIFICABLE",
          comparado,
        ),
      );
    else
      comprobaciones.push({
        clave: "s0PlanSiguiente",
        estado: "Verificado",
        codigo: null,
        motivo: null,
        comparado,
      });
  }

  if (!last)
    comprobaciones.push({
      clave: "auxiliares",
      estado: "NoDisponible",
      codigo: "SIN_CIERRE",
      motivo: "No hay foto de cierre con la que contrastar auxiliares.",
      comparado: null,
    });
  else
    try {
      const stored = photoAuxiliaryRows(db, ciclo.id, last.version);
      const live = auxiliaryRows(db, last.inicio, last.fin);
      const nextAuxiliary =
        siguiente && esperadoFin
          ? auxiliaryRows(db, siguiente.inicio, esperadoFin)
          : null;
      const comparison = compareAuxiliary(stored, live);
      const dangling = danglingAuxiliaryRows(db, stored);
      const comparado = {
        foto: {
          version: last.version,
          ...auxiliaryCounts(stored),
        },
        cicloReabierto: auxiliaryCounts(live),
        cicloSiguiente: nextAuxiliary
          ? auxiliaryCounts(nextAuxiliary)
          : null,
        faltan: comparison.faltan,
        nuevos: comparison.nuevos,
        cambiados: comparison.cambiados,
        dangling,
      };
      if (dangling.length)
        comprobaciones.push(
          blocked(
            "auxiliares",
            "Auxiliares capturados por la foto apuntan a movimientos inexistentes; no se acredita su ausencia de impacto.",
            "AUXILIARES_INCOHERENTES",
            comparado,
          ),
        );
      else if (
        comparison.faltan.length ||
        comparison.nuevos.length ||
        comparison.cambiados.length
      )
        // New, changed or unlinked auxiliary rows inside the reopened window
        // are the authorized rectification itself, not an external
        // contradiction. They still must not be reported as `Verificado`:
        // the difference is recorded as a warning for the re-closure audit.
        comprobaciones.push({
          clave: "auxiliares",
          estado: "Aviso",
          codigo: "AUXILIARES_RECTIFICADOS",
          motivo:
            "Los auxiliares vivos difieren de la foto dentro de la ventana de rectificación.",
          comparado: {
            ...comparado,
            acreditacion:
              "Diferencia dentro de la ventana de rectificación; se registra para el re-cierre.",
          },
        });
      else
        comprobaciones.push({
          clave: "auxiliares",
          estado: "Verificado",
          codigo: null,
          motivo: null,
          comparado,
        });
    } catch {
      comprobaciones.push(
        blocked(
          "auxiliares",
          "Una fuente auxiliar o el bloque de la foto no se pudo leer; no se acredita su ausencia de impacto.",
        ),
      );
    }

  comprobaciones.push(
    externalCheck("agregadosE411", options.agregados, {
      codigo: "E4_11_NO_DISPONIBLE",
      motivo:
        "E4.11 no está implementado; no hay agregados que revalidar y no se declara verificado.",
    }),
  );
  comprobaciones.push(
    externalCheck("precontrolE45", options.precontrol, {
      codigo: "E4_5_NO_DISPONIBLE",
      motivo:
        "E4.5 no está implementado; no hay precontrol que revalidar y no se declara verificado.",
    }),
  );

  const bloqueos = comprobaciones
    .filter((check) => check.estado === "Bloqueante")
    .map((check) => check.clave);
  const avisos = comprobaciones
    .filter((check) => check.estado === "Aviso")
    .map((check) => check.clave);
  const estado: RevalidacionEstado = bloqueos.length
    ? "Bloqueante"
    : avisos.length
      ? "ConAvisos"
      : comprobaciones.some((check) => check.estado === "NoDisponible")
        ? "Parcial"
        : "Verificado";
  const body: RevalidacionBody = {
    ciclo: ciclo.id,
    estado,
    bloquea: bloqueos.length > 0,
    version: last?.version ?? null,
    reapertura:
      reading.estado === "Abierta" || reading.estado === "CierrePosterior"
        ? {
            id: reading.ventana.id,
            versionOrigen: reading.ventana.versionOrigen,
          }
        : null,
    comprobaciones,
    bloqueos,
    avisos,
  };
  return { ...body, fingerprint: fingerprint(body) };
}
