import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { getCycle } from "./ciclos";
import {
  actorDefault,
  captureCierre,
  getFotoCierre,
  type CaptureCierre,
  type CierreIssue,
  type CierreOptions,
} from "./e49";
import {
  getRevalidacion,
  type RevalidacionOptions,
  type RevalidacionResult,
} from "./e410-revalidacion";
import { readActiveWindow, type ReopeningEvent } from "./e410-window";
import { fingerprint } from "./movement-ledger";
import { Problem } from "./problem";
import { decimal } from "./saldos";

/**
 * E4.10 I4 — re-closure (`Reabierto(vN) -> Cerrado(vN+1)`).
 *
 * The operation reuses the E4.9 capture/preflight for the full photo contract,
 * the DT6/E3.5 blockers, the coherence list and the app/schema metadata. It
 * does not call or change `confirmCierre`: E4.9 keeps rejecting a second
 * closure with `ALREADY_CLOSED`, while this route is the only re-closure path.
 *
 * Atomicity: one IMMEDIATE transaction writes `cierres`, `fotos_cierre`,
 * `cierre_vinculos`, the `cierre` audit and the `recierre` attempt, and only
 * then removes the singleton `reapertura_activa` row. Any failure rolls the
 * whole transaction back and leaves the cycle `Reabierto(vN)`.
 *
 * Fingerprint C2 (DT-C): content + coherence + origin `{ciclo, versionOrigen}`
 * plus the I3 revalidation fingerprint. Motive and actor are immutable
 * metadata/audit, not part of the fingerprint. The revalidation evidence is
 * also persisted in the audit and the response.
 */

export type RecierreOptions = CierreOptions & RevalidacionOptions;

export type MaterialComparison = {
  estado: "SinCambios" | "ConCambios" | "NoVerificable";
  bloques: string[];
  motivos: string[];
};

type CierreRow = {
  version: number;
  inicio: string;
  fin: string;
  saldo_inicial: number;
  fingerprint: string;
};

type StoredPhotoRow = {
  ventana_inicio: string;
  ventana_fin: string;
  saldo_inicial: number;
  hechos: string;
  plan: string;
  clasificacion: string;
  inversion: string;
  auxiliares: string;
};

type MaterialSnapshot = {
  ventana: { inicio: string; fin: string; saldoInicial: string | null };
  hechos: unknown;
  plan: unknown;
  clasificacion: unknown;
  inversion: unknown;
  auxiliares: unknown;
};

const keyPattern = /^[a-zA-Z0-9-]{16,100}$/;
const hex64 = /^[a-f0-9]{64}$/;
const materialBlocks = [
  "ventana",
  "hechos",
  "plan",
  "clasificacion",
  "inversion",
  "auxiliares",
] as const;

function lastClosure(db: Database, ciclo: string): CierreRow | null {
  return (
    (db
      .query(
        `SELECT version,inicio,fin,saldo_inicial,fingerprint
         FROM cierres WHERE ciclo=? ORDER BY version DESC LIMIT 1`,
      )
      .get(ciclo) as CierreRow | null) ?? null
  );
}

/**
 * Resolves the single active window for this cycle. The I2 reader already
 * distinguishes a later closure and an inconsistent projection; a stale
 * origin version is reported as a version conflict, not as corruption.
 */
function requireWindow(db: Database, ciclo: string): ReopeningEvent {
  const reading = readActiveWindow(db);
  if (reading.estado === "SinVentana")
    throw new Problem(
      409,
      "NO_REABIERTO",
      "El ciclo no tiene una reapertura activa que re-cerrar.",
      {},
      { ciclo },
    );
  // Ownership first: a window/conflict of another cycle is not this cycle's
  // conflict. H5: never leak CIERRE_POSTERIOR or a 500 from a different cycle.
  const windowCiclo =
    reading.estado === "Abierta"
      ? reading.ventana.ciclo
      : reading.estado === "CierrePosterior" || reading.estado === "Inconsistente"
        ? reading.ciclo
        : null;
  if (windowCiclo !== null && windowCiclo !== ciclo)
    throw new Problem(
      409,
      "NO_REABIERTO",
      "La reapertura activa pertenece a otro ciclo.",
      {},
      { ciclo, ventana: windowCiclo },
    );
  if (reading.estado === "CierrePosterior")
    throw new Problem(
      409,
      "CIERRE_POSTERIOR",
      "Existe un cierre posterior durante la ventana; no se altera.",
      {},
      {
        cierrePosterior: reading.cierrePosterior,
        finVentana: reading.finVentana,
      },
    );
  if (reading.estado === "Inconsistente") {
    const versionOrigen = reading.comparado.versionOrigen;
    const ultimaVersion = reading.comparado.ultimaVersion;
    if (
      typeof versionOrigen === "number" &&
      typeof ultimaVersion === "number" &&
      versionOrigen !== ultimaVersion
    )
      throw new Problem(
        409,
        "VERSION_CONFLICTO",
        "La ventana no corresponde a la última versión cerrada.",
        {},
        reading.comparado,
      );
    throw new Problem(500, "ESTADO_INCONSISTENTE", reading.motivo, {}, reading.comparado);
  }
  return reading.ventana;
}

function revalidationBlockers(revalidacion: RevalidacionResult): CierreIssue[] {
  return revalidacion.comprobaciones
    .filter((check) => check.estado === "Bloqueante")
    .map((check) => ({
      code: check.codigo ?? "REVALIDACION_BLOQUEANTE",
      message:
        check.motivo ??
        `La revalidación de ${check.clave} bloquea el re-cierre.`,
    }));
}

/** Deduplicates by code while preserving the first, most specific message. */
function mergeBlockers(...groups: CierreIssue[][]): CierreIssue[] {
  const merged: CierreIssue[] = [];
  const seen = new Set<string>();
  for (const group of groups)
    for (const issue of group) {
      const id = `${issue.code}|${issue.message}`;
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(issue);
    }
  return merged;
}

/**
 * Capture never mutates E4.9. The cycle is closed by definition, so its
 * `YA_CERRADO` blocker is removed only after a valid active window has been
 * resolved; every other blocker (DT6, E3.5, plan, sources, coherence) remains.
 */
function captureForRecierre(
  db: Database,
  ciclo: string,
  options: RecierreOptions,
  now: number,
): { data: CaptureCierre; blockers: CierreIssue[] } {
  const data = captureCierre(db, ciclo, options, now);
  return {
    data,
    blockers: data.blockers.filter((issue) => issue.code !== "YA_CERRADO"),
  };
}

/**
 * C2 fingerprint: E4.9 content + coherence, the origin `{ciclo, versionOrigen}`
 * and the I3 revalidation fingerprint. A change in any of them between preview
 * and confirmation is a revision conflict, not a silent re-closure.
 */
export function fingerprintRecierre(
  capture: Pick<CaptureCierre, "payload" | "coherencia">,
  origen: { ciclo: string; versionOrigen: number },
  revalidacionFingerprint: string,
) {
  return fingerprint({
    payload: capture.payload,
    coherencia: capture.coherencia,
    origen,
    revalidacion: { fingerprint: revalidacionFingerprint },
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function projectedRows(
  value: unknown,
  key: string,
  fields: string[],
): unknown[] | null {
  const record = asRecord(value);
  if (!record) return null;
  const rows = asArray(record[key]);
  if (!rows) return null;
  return rows.map((row) => {
    const entry = asRecord(row);
    if (!entry) return null;
    return Object.fromEntries(fields.map((field) => [field, entry[field] ?? null]));
  });
}

function materialMovements(value: unknown): unknown[] | null {
  const rows = asArray(value);
  if (!rows) return null;
  return rows.map((row) => {
    const entry = asRecord(row);
    if (!entry) return null;
    return {
      id: entry.id ?? null,
      fecha: entry.fecha ?? null,
      tipo: entry.tipo ?? null,
      capital: entry.capital ?? null,
      intereses: entry.intereses ?? null,
      referencia: entry.referencia ?? null,
      importe: entry.importe ?? null,
      origen: entry.origen ?? null,
      destino: entry.destino ?? null,
      subtipo: entry.subtipo ?? null,
      partida: entry.partida ?? null,
      anulado: entry.anulado ?? null,
    };
  });
}

function materialHechos(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  return {
    estado: record.estado ?? null,
    totales: record.totales ?? null,
    movimientos: materialMovements(record.movimientos),
  };
}

function materialPlan(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  const items = asArray(record.items);
  return {
    estado: record.estado ?? null,
    revision: record.revision ?? null,
    sinPlanificar: record.sinPlanificar ?? null,
    // `contextRevision` is a volatile finance hash: excluded. The plan's own
    // revision and economic lines are enough to prove a rectification.
    items: items
      ? items.map((row) => {
          const entry = asRecord(row);
          if (!entry) return null;
          return {
            presupuesto: entry.presupuesto ?? null,
            fuente: entry.fuente ?? null,
            base: entry.base ?? null,
            esencial: entry.esencial ?? null,
            delMes: entry.delMes ?? null,
            aTransferir: entry.aTransferir ?? null,
            estado: entry.estado ?? null,
            sinPlanificar: entry.sinPlanificar ?? null,
          };
        })
      : null,
  };
}

function materialClasificacion(value: unknown) {
  return {
    categorias: projectedRows(value, "categorias", ["id", "revision"]),
    subcategorias: projectedRows(value, "subcategorias", [
      "id",
      "padre",
      "revision",
    ]),
    partidas: projectedRows(value, "partidas", ["id", "padre", "revision"]),
    referencias: projectedRows(value, "referencias", ["id", "tipo", "revision"]),
  };
}

function materialInversion(value: unknown) {
  const record = asRecord(value);
  return {
    efectivo: record?.efectivo ?? null,
    cuentas: projectedRows(value, "cuentas", ["saldo", "disponible"]),
    posiciones: projectedRows(value, "posiciones", [
      "instrumento",
      "saldoInversion",
      "cantidad",
    ]),
    operaciones: projectedRows(value, "operaciones", [
      "id",
      "clase",
      "fecha",
      "instrumento",
      "saldoEfectivo",
      "saldoInversion",
      "cantidad",
      "importeEur",
      "comisionEur",
      "estado",
    ]),
    instrumentos: projectedRows(value, "instrumentos", ["id", "revision"]),
  };
}

function materialAuxiliares(value: unknown) {
  const record = asRecord(value);
  const e35 = record ? asRecord(record.e35) : null;
  return {
    anticipos: projectedRows(value, "anticipos", [
      "movimiento",
      "referencia",
      "rol",
      "importe",
      "fecha",
    ]),
    compartidos: projectedRows(value, "compartidos", [
      "movimiento",
      "referencia",
      "participante",
      "importe",
      "fecha",
    ]),
    nomina: projectedRows(value, "nomina", [
      "paga",
      "movimiento",
      "importe",
      "fecha",
    ]),
    revisionComida: projectedRows(value, "revisionComida", [
      "movimiento",
      "estadoRevision",
      "importe",
      "fecha",
    ]),
    deuda: projectedRows(value, "deuda", ["id", "estado", "apertura", "revision"]),
    e35: e35
      ? { verificable: e35.verificable ?? null, huella: e35.huella ?? null }
      : null,
  };
}

function materialFromCapture(capture: CaptureCierre): MaterialSnapshot {
  return {
    ventana: {
      inicio: capture.payload.ventana.inicio,
      fin: capture.payload.ventana.fin ?? "",
      saldoInicial: capture.payload.ventana.saldoInicial,
    },
    hechos: materialHechos(capture.payload.hechos),
    plan: materialPlan(capture.payload.plan),
    clasificacion: materialClasificacion(capture.payload.clasificacion),
    inversion: materialInversion(capture.payload.inversion),
    auxiliares: materialAuxiliares(capture.payload.auxiliares),
  };
}

function materialFromPhoto(row: StoredPhotoRow): MaterialSnapshot {
  const hechos = JSON.parse(row.hechos);
  const plan = JSON.parse(row.plan);
  const clasificacion = JSON.parse(row.clasificacion);
  const inversion = JSON.parse(row.inversion);
  const auxiliares = JSON.parse(row.auxiliares);
  const requireRecord = (value: unknown, label: string) => {
    if (!asRecord(value)) throw new Error(`Bloque ${label} no legible.`);
    return value;
  };
  const requireArrayField = (value: unknown, field: string, label: string) => {
    const record = asRecord(value);
    if (!record || !Array.isArray(record[field]))
      throw new Error(`Bloque ${label}.${field} no legible.`);
  };
  for (const [value, label] of [
    [hechos, "hechos"],
    [plan, "plan"],
    [clasificacion, "clasificacion"],
    [inversion, "inversion"],
    [auxiliares, "auxiliares"],
  ] as const)
    requireRecord(value, label);
  requireArrayField(hechos, "movimientos", "hechos");
  requireArrayField(plan, "items", "plan");
  for (const field of ["categorias", "subcategorias", "partidas", "referencias"])
    requireArrayField(clasificacion, field, "clasificacion");
  for (const field of ["cuentas", "posiciones", "operaciones", "instrumentos"])
    requireArrayField(inversion, field, "inversion");
  for (const field of [
    "anticipos",
    "compartidos",
    "nomina",
    "revisionComida",
    "deuda",
  ])
    requireArrayField(auxiliares, field, "auxiliares");
  return {
    ventana: {
      inicio: row.ventana_inicio,
      fin: row.ventana_fin,
      saldoInicial: decimal(String(row.saldo_inicial)),
    },
    hechos: materialHechos(hechos),
    plan: materialPlan(plan),
    clasificacion: materialClasificacion(clasificacion),
    inversion: materialInversion(inversion),
    auxiliares: materialAuxiliares(auxiliares),
  };
}

/** Stable key order so two equivalent JSON blobs compare byte by byte. */
function canonical(value: unknown): string {
  const normalise = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalise);
    const record = asRecord(input);
    if (!record) return input;
    return Object.fromEntries(
      Object.keys(record)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, normalise(record[key])]),
    );
  };
  return JSON.stringify(normalise(value));
}

type AuditRow = {
  id: string;
  revision: number;
  accion: string;
  anterior: string | null;
  posterior: string;
  instante: string;
};

/**
 * A reverted material write is not equivalent to no write (DT-H). The live
 * photo cannot see the intermediate state, so the append-only movement audit
 * is compared over the reopened window. Non-material fields (note, concept,
 * volatile revision/timestamps) are projected away, so a T3 note edit does
 * not force a new photo. Unreadable audit evidence fails closed.
 */
function movementAuditChanges(
  db: Database,
  inicio: string,
  fin: string,
  reopeningUtc: string,
): MaterialComparison | null {
  let rows: AuditRow[];
  try {
    rows = db
      .query(
        `SELECT a.id,a.revision,a.accion,a.anterior,a.posterior,a.instante
         FROM movement_audit a JOIN movimientos m ON m.id=a.id
         WHERE m.fecha BETWEEN ? AND ? AND a.instante > ?
         ORDER BY a.id,a.revision`,
      )
      .all(inicio, fin, reopeningUtc) as AuditRow[];
  } catch {
    return {
      estado: "NoVerificable",
      bloques: ["hechos"],
      motivos: [
        "No se pudo leer la auditoría de movimientos; no se acredita la ausencia de cambios.",
      ],
    };
  }
  if (!rows.length) return null;
  const changes: string[] = [];
  for (const row of rows) {
    if (row.anterior === null) {
      try {
        JSON.parse(row.posterior);
      } catch {
        return {
          estado: "NoVerificable",
          bloques: ["hechos"],
          motivos: [
            `La auditoría del movimiento ${row.id} v${row.revision} no es legible; no se acredita la ausencia de cambios.`,
          ],
        };
      }
      changes.push(`${row.id} v${row.revision}: alta`);
      continue;
    }
    let before: unknown, after: unknown;
    try {
      before = JSON.parse(row.anterior);
      after = JSON.parse(row.posterior);
    } catch {
      return {
        estado: "NoVerificable",
        bloques: ["hechos"],
        motivos: [
          `La auditoría del movimiento ${row.id} v${row.revision} no es legible; no se acredita la ausencia de cambios.`,
        ],
      };
    }
    if (
      canonical(materialMovements([before])) !==
      canonical(materialMovements([after]))
    )
      changes.push(`${row.id} v${row.revision}: ${row.accion}`);
  }
  return changes.length
    ? {
        estado: "ConCambios",
        bloques: ["hechos"],
        motivos: changes.map(
          (change) =>
            `La auditoría registra una escritura material en ${change}.`,
        ),
      }
    : null;
}

/**
 * Audits of material sources outside Movimientos. Any audited revision after
 * the reopening is not accredited by the live photo alone and fails closed:
 * a rectification that was later reverted still leaves its audit trail. This
 * covers investment operations/instruments and the auxiliary sources captured
 * by the photo (anticipos, compartidos, revisión de comida, nómina and deuda).
 */
function sourceAuditChanges(
  db: Database,
  inicio: string,
  fin: string,
  reopeningUtc: string,
): MaterialComparison | null {
  const checks: {
    bloque: "inversion" | "auxiliares";
    label: string;
    sql: string;
    params: (string | number)[];
  }[] = [
    {
      bloque: "inversion",
      label: "operaciones de inversión",
      sql: `SELECT a.operacion FROM operacion_inversion_audit a
            JOIN operaciones_inversion o ON o.id=a.operacion
            WHERE o.fecha <= ? AND a.instante > ? LIMIT 1`,
      params: [fin, reopeningUtc],
    },
    {
      bloque: "inversion",
      label: "instrumentos",
      sql: `SELECT a.instrumento FROM instrumento_audit a
            WHERE a.instante > ? LIMIT 1`,
      params: [reopeningUtc],
    },
    {
      bloque: "auxiliares",
      label: "anticipos",
      sql: `SELECT a.id FROM anticipo_audit a
            JOIN movimiento_anticipo ma ON ma.referencia=a.referencia
            JOIN movimientos m ON m.id=ma.movimiento
            WHERE m.fecha BETWEEN ? AND ? AND a.instante > ? LIMIT 1`,
      params: [inicio, fin, reopeningUtc],
    },
    {
      bloque: "auxiliares",
      label: "compartidos",
      sql: `SELECT a.id FROM compartido_audit a
            JOIN movimiento_compartido mc ON mc.referencia=a.referencia
            JOIN movimientos m ON m.id=mc.movimiento
            WHERE m.fecha BETWEEN ? AND ? AND a.instante > ? LIMIT 1`,
      params: [inicio, fin, reopeningUtc],
    },
    {
      bloque: "auxiliares",
      label: "revisión de comida",
      sql: `SELECT a.id FROM movimiento_revision_comida_audit a
            JOIN movimiento_revision_comida c ON c.movimiento=a.movimiento
            JOIN movimientos m ON m.id=c.movimiento
            WHERE m.fecha BETWEEN ? AND ? AND a.instante > ? LIMIT 1`,
      params: [inicio, fin, reopeningUtc],
    },
    {
      bloque: "auxiliares",
      label: "nómina",
      sql: `SELECT a.id FROM payroll_audit a
            JOIN payroll_allocations p ON p.paga=a.paga
            JOIN movimientos m ON m.id=p.movimiento
            WHERE m.fecha BETWEEN ? AND ? AND a.instante > ? LIMIT 1`,
      params: [inicio, fin, reopeningUtc],
    },
    {
      bloque: "auxiliares",
      label: "deuda",
      sql: `SELECT a.id FROM audit a
            JOIN deudas d ON d.id=a.entidad
            WHERE a.instante > ? LIMIT 1`,
      params: [reopeningUtc],
    },
  ];
  const found: { bloque: "inversion" | "auxiliares"; label: string }[] = [];
  for (const check of checks) {
    try {
      if (db.query(check.sql).get(...check.params))
        found.push({ bloque: check.bloque, label: check.label });
    } catch {
      return {
        estado: "NoVerificable",
        bloques: [check.bloque],
        motivos: [
          `No se pudo leer la auditoría de ${check.label}; no se acredita la ausencia de cambios.`,
        ],
      };
    }
  }
  if (!found.length) return null;
  return {
    estado: "ConCambios",
    bloques: [...new Set(found.map((entry) => entry.bloque))],
    motivos: found.map(
      (entry) =>
        `La auditoría registra una revisión posterior a la reapertura en ${entry.label}.`,
    ),
  };
}

/**
 * Direct revision bumps that have no audit row are still not equivalent to no
 * write. The current revision is compared with the revision that was current
 * when `vN` was closed for sources that expose an audited revision
 * (investment operations, instruments, revisión de comida and deuda). A later
 * revision (even if reverted) fails closed. `baseline ?? 1` keeps manual
 * fixtures without audit usable while detecting any real increment.
 */
function revisionBumpChanges(
  db: Database,
  ciclo: string,
  versionOrigen: number,
  capture: CaptureCierre,
): MaterialComparison | null {
  const inicio = capture.payload.ventana.inicio;
  const fin = capture.payload.ventana.fin;
  if (!fin) return null;
  const cierre = db
    .query("SELECT creado_utc FROM cierres WHERE ciclo=? AND version=?")
    .get(ciclo, versionOrigen) as { creado_utc: string } | null;
  if (!cierre)
    return {
      estado: "NoVerificable",
      bloques: [],
      motivos: [
        `No existe el cierre v${versionOrigen}; no se acredita la ausencia de cambios.`,
      ],
    };
  const checks: {
    bloque: "inversion" | "auxiliares";
    label: string;
    sql: string;
    params: (string | number)[];
  }[] = [
    {
      bloque: "inversion",
      label: "operaciones de inversión",
      sql: `SELECT o.id,o.revision,
        (SELECT MAX(a.revision) FROM operacion_inversion_audit a
          WHERE a.operacion=o.id AND a.instante<=?) baseline
       FROM operaciones_inversion o
       WHERE o.fecha <= ?`,
      params: [cierre.creado_utc, fin],
    },
    {
      bloque: "inversion",
      label: "instrumentos",
      sql: `SELECT i.id,i.revision,
        (SELECT MAX(a.revision) FROM instrumento_audit a
          WHERE a.instrumento=i.id AND a.instante<=?) baseline
       FROM instrumentos i`,
      params: [cierre.creado_utc],
    },
    {
      bloque: "auxiliares",
      label: "revisión de comida",
      sql: `SELECT c.movimiento id,c.revision,
        (SELECT MAX(a.revision) FROM movimiento_revision_comida_audit a
          WHERE a.movimiento=c.movimiento AND a.instante<=?) baseline
       FROM movimiento_revision_comida c
       JOIN movimientos m ON m.id=c.movimiento
       WHERE m.fecha BETWEEN ? AND ?`,
      params: [cierre.creado_utc, inicio, fin],
    },
    {
      bloque: "auxiliares",
      label: "deuda",
      sql: `SELECT d.id,d.revision,
        (SELECT MAX(a.revision) FROM audit a
          WHERE a.entidad=d.id AND a.instante<=?) baseline
       FROM deudas d`,
      params: [cierre.creado_utc],
    },
  ];
  const changed: { bloque: "inversion" | "auxiliares"; label: string; id: string; revision: number }[] = [];
  for (const check of checks) {
    try {
      const rows = db.query(check.sql).all(...check.params) as {
        id: string;
        revision: number;
        baseline: number | null;
      }[];
      for (const row of rows)
        if (row.revision > (row.baseline ?? 1))
          changed.push({
            bloque: check.bloque,
            label: check.label,
            id: row.id,
            revision: row.revision,
          });
    } catch {
      return {
        estado: "NoVerificable",
        bloques: [check.bloque],
        motivos: [
          `No se pudo leer la revisión de ${check.label}; no se acredita la ausencia de cambios.`,
        ],
      };
    }
  }
  if (!changed.length) return null;
  return {
    estado: "ConCambios",
    bloques: [...new Set(changed.map((entry) => entry.bloque))],
    motivos: changed.map(
      (entry) =>
        `La revisión ${entry.revision} de ${entry.label} (${entry.id}) es posterior al cierre v${versionOrigen}.`,
    ),
  };
}

/**
 * Compares the live capture against the stored `vN` photo over the material
 * set approved in DT-H: frozen window/S0, facts and relations, plan, economic
 * classification/references, investment components and used auxiliaries.
 * Volatile metadata (app/schema, backup reference, timestamps, correlation,
 * plan context hash) is excluded. Any unreadable or missing evidence is
 * `NoVerificable`, never `SinCambios`.
 */
export function compareMaterial(
  db: Database,
  ciclo: string,
  versionOrigen: number,
  capture: CaptureCierre,
  reopeningUtc?: string,
): MaterialComparison {
  const row = db
    .query(
      `SELECT ventana_inicio,ventana_fin,saldo_inicial,hechos,plan,
        clasificacion,inversion,auxiliares
       FROM fotos_cierre WHERE ciclo=? AND version=?`,
    )
    .get(ciclo, versionOrigen) as StoredPhotoRow | null;
  if (!row)
    return {
      estado: "NoVerificable",
      bloques: [],
      motivos: [
        `No existe la foto de la versión ${versionOrigen}; no se acredita la ausencia de cambios.`,
      ],
    };
  let stored: MaterialSnapshot;
  try {
    stored = materialFromPhoto(row);
  } catch {
    return {
      estado: "NoVerificable",
      bloques: [],
      motivos: [
        `La foto de la versión ${versionOrigen} no es legible; no se acredita la ausencia de cambios.`,
      ],
    };
  }
  const live = materialFromCapture(capture);
  const bloques = materialBlocks.filter(
    (block) => canonical(stored[block]) !== canonical(live[block]),
  );
  const audits = reopeningUtc
    ? [
        movementAuditChanges(
          db,
          capture.payload.ventana.inicio,
          capture.payload.ventana.fin ?? "",
          reopeningUtc,
        ),
        capture.payload.ventana.fin
          ? sourceAuditChanges(
              db,
              capture.payload.ventana.inicio,
              capture.payload.ventana.fin,
              reopeningUtc,
            )
          : null,
        revisionBumpChanges(db, ciclo, versionOrigen, capture),
      ].filter((entry): entry is MaterialComparison => entry !== null)
    : [];
  const unreadable = audits.find((entry) => entry.estado === "NoVerificable");
  if (unreadable) return unreadable;
  const allBlocks = new Set<string>(bloques);
  const auditedMotivos: string[] = [];
  for (const audit of audits)
    if (audit.estado === "ConCambios") {
      for (const block of audit.bloques) allBlocks.add(block);
      auditedMotivos.push(...audit.motivos);
    }
  return allBlocks.size
    ? {
        estado: "ConCambios",
        bloques: [...allBlocks],
        motivos: [
          ...bloques.map(
            (block) =>
              `El bloque material ${block} difiere de la foto v${versionOrigen}.`,
          ),
          ...auditedMotivos,
        ],
      }
    : { estado: "SinCambios", bloques: [], motivos: [] };
}

/**
 * Read-only re-closure preview. It returns the C2 fingerprint that the
 * confirmation must echo, plus the I3 revalidation evidence and the material
 * comparison with `vN`. It never writes.
 */
export function previewRecierre(
  db: Database,
  cicloId: string,
  options: RecierreOptions = {},
  now = Date.now(),
) {
  const { ciclo } = getCycle(db, cicloId);
  const evento = requireWindow(db, ciclo.id);
  const { data, blockers } = captureForRecierre(db, ciclo.id, options, now);
  const revalidacion = getRevalidacion(db, ciclo.id, options);
  const comparacion = compareMaterial(
    db,
    ciclo.id,
    evento.versionOrigen,
    data,
    evento.creadoUtc,
  );
  const comparisonBlockers: CierreIssue[] =
    comparacion.estado === "NoVerificable"
      ? [
          {
            code: "IMPACTO_NO_VERIFICABLE",
            message: comparacion.motivos.join(" "),
          },
        ]
      : [];
  const revalidationWarnings: CierreIssue[] = revalidacion.comprobaciones
    .filter((check) => check.estado === "Aviso")
    .map((check) => ({
      code: check.codigo ?? "REVALIDACION_AVISO",
      message:
        check.motivo ?? `La revalidación de ${check.clave} deja un aviso.`,
    }));
  const allBlockers = mergeBlockers(
    blockers,
    revalidationBlockers(revalidacion),
    comparisonBlockers,
  );
  const fingerprintValue = fingerprintRecierre(
    data,
    {
      ciclo: ciclo.id,
      versionOrigen: evento.versionOrigen,
    },
    revalidacion.fingerprint,
  );
  const estado = allBlockers.length
    ? "Bloqueado"
    : comparacion.estado === "SinCambios"
      ? "Sin cambios"
      : data.warnings.length || revalidationWarnings.length
        ? "Listo con avisos"
        : "Listo";
  return {
    ciclo: ciclo.id,
    estado,
    e49Bloqueado: allBlockers.length > 0,
    ventana: data.ventana,
    siguienteInicio: data.siguienteInicio,
    plan: {
      estado: data.plan.estado,
      revision: data.plan.revision,
      sinPlanificar: data.plan.sinPlanificar,
      contextRevision: data.plan.contextRevision,
      lineas: data.plan.items.length,
    },
    e35: {
      verificable: data.e35.verificable === true,
      motivo: data.e35.motivo ?? null,
      huella: data.e35.huella ?? null,
      cobertura: data.e35.cobertura ?? null,
    },
    backup: data.backup,
    hechos: {
      estado: data.facts.estado,
      fuentes: data.facts.fuentes,
      totales: data.facts.totales,
    },
    coherencia: data.coherencia,
    inversion: {
      efectivo: data.investment.efectivo,
      posiciones: data.investment.posiciones,
      valoracion: "No disponible",
      motivo:
        "E4.3 valoración/patrimonio no implementado; no se inventa patrimonio.",
    },
    cobertura: data.payload.cobertura,
    noDisponible: data.payload.noDisponible,
    bloqueos: allBlockers,
    avisos: mergeBlockers(data.warnings, revalidationWarnings),
    fingerprint: fingerprintValue,
    appVersion: data.appVersion,
    schemaVersion: data.schemaVersion,
    cierre: data.estadoCierre,
    origen: {
      ciclo: ciclo.id,
      versionOrigen: evento.versionOrigen,
      reaperturaId: evento.id,
      correlacion: evento.correlacion,
    },
    revalidacion,
    comparacion,
    sinCambios: comparacion.estado === "SinCambios",
  };
}

/**
 * Confirms the re-closure of a cycle with an open window. The `Idempotency-Key`
 * lives in the separate `operacion='recierre'` namespace. A replay returns the
 * original vN+1 response; a different payload under the same key conflicts.
 */
export function reCerrarCiclo(
  db: Database,
  cicloId: string,
  body: Record<string, unknown>,
  key: string,
  options: RecierreOptions = {},
  now = Date.now(),
) {
  for (const name of Object.keys(body))
    if (!["versionEsperada", "motivo", "fingerprint"].includes(name))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`, {
        [name]: "Campo no editable.",
      });
  if (!keyPattern.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  if (
    typeof body.versionEsperada !== "number" ||
    !Number.isSafeInteger(body.versionEsperada) ||
    body.versionEsperada <= 0
  )
    throw new Problem(422, "VALIDATION", "Revisa la versión esperada.", {
      versionEsperada: "Indica una versión positiva.",
    });
  if (
    typeof body.motivo !== "string" ||
    body.motivo.trim().length === 0 ||
    body.motivo.trim().length > 1000
  )
    throw new Problem(422, "VALIDATION", "Indica un motivo válido.", {
      motivo: "Motivo obligatorio y de hasta 1000 caracteres.",
    });
  if (typeof body.fingerprint !== "string" || !hex64.test(body.fingerprint))
    throw new Problem(422, "VALIDATION", "Revisa el fingerprint de la vista previa.", {
      fingerprint: "Fingerprint inválido.",
    });
  const versionEsperada = body.versionEsperada,
    motivo = body.motivo.trim(),
    previewFingerprint = body.fingerprint;
  const rawActor = options.actor ?? actorDefault;
  if (typeof rawActor !== "string")
    throw new Problem(422, "VALIDATION", "Actor inválido.");
  const actor = rawActor.trim();
  if (actor.length === 0 || actor.length > 200)
    throw new Problem(422, "VALIDATION", "Actor inválido.");
  const requestHash = fingerprint({
    ciclo: cicloId,
    versionEsperada,
    motivo,
    fingerprint: previewFingerprint,
  });

  return db
    .transaction(() => {
      // Idempotency first: after a successful re-closure the projection is
      // gone, so a replay must still return the original vN+1 photo.
      const retry = db
        .query(
          "SELECT hash,response FROM reapertura_attempts WHERE operacion='recierre' AND key=?",
        )
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== requestHash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya tiene otros datos.",
          );
        db.run(
          "UPDATE reapertura_attempts SET expires=? WHERE operacion='recierre' AND key=?",
          [now + 86400000, key],
        );
        return { ...JSON.parse(retry.response), replayed: true };
      }
      db.run(
        "DELETE FROM reapertura_attempts WHERE expires<? AND NOT(operacion='recierre' AND key=?)",
        [now, key],
      );

      const { ciclo } = getCycle(db, cicloId);
      const evento = requireWindow(db, ciclo.id);
      if (evento.versionOrigen !== versionEsperada)
        throw new Problem(
          409,
          "VERSION_CONFLICTO",
          "La versión esperada no es la versión reabierta.",
          {},
          { version: evento.versionOrigen, versionEsperada },
        );
      const last = lastClosure(db, ciclo.id);
      if (!last)
        throw new Problem(
          409,
          "SIN_CIERRE",
          "El ciclo no tiene ningún cierre que re-cerrar.",
        );
      if (last.version !== versionEsperada)
        throw new Problem(
          409,
          "VERSION_CONFLICTO",
          "La versión esperada no es la última versión cerrada.",
          {},
          { version: last.version, versionEsperada },
        );

      const revalidacion = getRevalidacion(db, ciclo.id, options);
      const { data, blockers } = captureForRecierre(
        db,
        ciclo.id,
        options,
        now,
      );
      if (data.estadoCierre.estado !== "Cerrado")
        throw new Problem(
          500,
          "ESTADO_INCONSISTENTE",
          "La ventana activa no corresponde a un ciclo cerrado.",
        );
      if (blockers.length)
        throw new Problem(409, blockers[0].code, blockers[0].message, {}, {
          bloqueos: blockers,
        });
      if (revalidacion.bloquea) {
        const revalidationIssues = revalidationBlockers(revalidacion);
        throw new Problem(
          409,
          revalidationIssues[0]?.code ?? "REVALIDACION_BLOQUEANTE",
          revalidationIssues[0]?.message ??
            "La revalidación de dependencias posteriores bloquea el re-cierre.",
          {},
          { revalidacion },
        );
      }
      const expectedFingerprint = fingerprintRecierre(
        data,
        {
          ciclo: ciclo.id,
          versionOrigen: versionEsperada,
        },
        revalidacion.fingerprint,
      );
      if (previewFingerprint !== expectedFingerprint)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "La vista previa ha cambiado; revisa el preflight antes de re-cerrar.",
          {},
          { fingerprint: expectedFingerprint, bloqueos: blockers },
        );

      const comparacion = compareMaterial(
        db,
        ciclo.id,
        versionEsperada,
        data,
        evento.creadoUtc,
      );
      if (comparacion.estado === "NoVerificable")
        throw new Problem(
          409,
          "IMPACTO_NO_VERIFICABLE",
          comparacion.motivos.join(" "),
          {},
          { comparacion },
        );
      if (comparacion.estado === "SinCambios")
        throw new Problem(
          409,
          "SIN_CAMBIOS",
          "No hay cambios materiales acreditados; no se crea una foto nueva.",
          {},
          { comparacion },
        );

      // Frozen identity: v2 must repeat vN's window and S0. The cycle identity
      // triggers would reject a different S0 anyway; checking first fails
      // closed with a motivated conflict instead of a schema abort.
      const expectedSaldo = decimal(String(last.saldo_inicial));
      if (
        data.ventana.inicio !== last.inicio ||
        data.ventana.fin !== last.fin ||
        (data.ventana.saldoInicial ?? null) !== (expectedSaldo ?? null)
      )
        throw new Problem(
          409,
          "VENTANA_INCONSISTENTE",
          "La ventana o el Saldo inicial del ciclo cambiaron durante la reapertura.",
          {},
          {
            esperado: {
              inicio: last.inicio,
              fin: last.fin,
              saldoInicial: expectedSaldo,
            },
            observado: data.ventana,
          },
        );

      const versionDestino = last.version + 1;
      const tiempo = new Date(now).toISOString();
      const correlacion = evento.correlacion ?? randomUUID();
      const payload = data.payload;
      db.run(
        `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,
          creado_utc,motivo,fingerprint,estado)
         VALUES(?,?,?,?,?,?,?,?,?,'Cerrado')`,
        [
          ciclo.id,
          versionDestino,
          last.inicio,
          last.fin,
          last.saldo_inicial,
          actor,
          tiempo,
          motivo,
          expectedFingerprint,
        ],
      );
      db.run(
        `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,
          fingerprint,app_version,schema_version,ventana_inicio,ventana_fin,
          saldo_inicial,estado_temporal,estado_hechos,estado_plan,hechos,plan,
          clasificacion,inversion,auxiliares,cobertura,backup,no_disponible)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          ciclo.id,
          versionDestino,
          tiempo,
          actor,
          motivo,
          expectedFingerprint,
          data.appVersion,
          data.schemaVersion,
          last.inicio,
          last.fin,
          last.saldo_inicial,
          "Cerrado",
          payload.hechos.estado,
          payload.plan.estado,
          JSON.stringify(payload.hechos),
          JSON.stringify(payload.plan),
          JSON.stringify(payload.clasificacion),
          JSON.stringify(payload.inversion),
          JSON.stringify(payload.auxiliares),
          JSON.stringify(payload.cobertura),
          JSON.stringify(payload.backup),
          JSON.stringify(payload.noDisponible),
        ],
      );
      db.run(
        `INSERT INTO cierre_vinculos(ciclo,version_origen,version_destino,
          reapertura_id,correlacion) VALUES(?,?,?,?,?)`,
        [ciclo.id, last.version, versionDestino, evento.id, correlacion],
      );
      const auditAnterior = {
        ciclo: ciclo.id,
        version: last.version,
        fingerprint: last.fingerprint,
        fotoVersion: last.version,
      };
      const auditPosterior = {
        ciclo: ciclo.id,
        version: versionDestino,
        fingerprint: expectedFingerprint,
        fotoVersion: versionDestino,
        origen: {
          versionOrigen: versionEsperada,
          reaperturaId: evento.id,
          correlacion,
        },
        comparacion,
        revalidacion: {
          estado: revalidacion.estado,
          fingerprint: revalidacion.fingerprint,
          bloqueos: revalidacion.bloqueos,
          avisos: revalidacion.avisos,
          comprobaciones: revalidacion.comprobaciones,
        },
        coherencia: data.coherencia.cierres.map((entry) => ({
          ciclo: entry.ciclo,
          version: entry.version,
          fin: entry.fin,
          resultado: entry.coherente ? "Coherente" : "Incoherente",
          motivos: entry.motivos,
          comparado: entry.comparado,
        })),
      };
      db.run(
        `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,
          motivo,instante,actor) VALUES(?,?,'cierre',?,?,?,?,?)`,
        [
          ciclo.id,
          versionDestino,
          JSON.stringify(auditAnterior),
          JSON.stringify(auditPosterior),
          motivo,
          tiempo,
          actor,
        ],
      );
      const cleared = db.run(
        "DELETE FROM reapertura_activa WHERE id=1 AND ciclo=? AND reapertura_id=?",
        [ciclo.id, evento.id],
      );
      if (cleared.changes !== 1)
        throw new Problem(
          500,
          "ESTADO_INCONSISTENTE",
          "La proyección de reapertura cambió durante el re-cierre.",
        );
      const stored = getFotoCierre(db, ciclo.id, versionDestino);
      const vinculo = {
        ciclo: ciclo.id,
        versionOrigen: last.version,
        versionDestino,
        reaperturaId: evento.id,
        correlacion,
      };
      const response = {
        ...stored,
        estado: "Cerrado" as const,
        recierre: {
          ...vinculo,
          fingerprint: expectedFingerprint,
        },
        vinculo,
        comparacion,
        revalidacion: {
          estado: revalidacion.estado,
          fingerprint: revalidacion.fingerprint,
          bloqueos: revalidacion.bloqueos,
          avisos: revalidacion.avisos,
        },
      };
      db.run(
        `INSERT INTO reapertura_attempts(operacion,key,hash,response,expires)
         VALUES('recierre',?,?,?,?)`,
        [key, requestHash, JSON.stringify(response), now + 86400000],
      );
      options.hooks?.beforeCommit?.();
      return { ...response, replayed: false };
    })
    .immediate();
}
