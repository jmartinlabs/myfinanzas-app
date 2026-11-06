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
import { informativeFields } from "./e49-guards";
import { readActiveWindow, type CierrePosterior, type ReopeningEvent } from "./e410-window";
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
 * Known limits documented by QA:
 * - F2: the material comparison is intentionally conservative. Audited changes
 *   on material sources force `vN+1` even when the final state is equal; false
 *   positives are accepted because they only cost a new photo, never data.
 * - F3: concurrency tests use two real processes but no deterministic barrier;
 *   they prove SQLite IMMEDIATE serialisation and one-winner/one-replay, not a
 *   forced interleaving at a precise instruction.
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
 * Resolves the single active window for this cycle without throwing just
 * because a later closure exists. The I2 reader already distinguishes a later
 * closure and an inconsistent projection; a stale origin version is reported
 * as a version conflict, not as corruption. Callers that cannot tolerate a
 * later closure keep using `requireWindow`.
 */
export function resolveWindow(
  db: Database,
  ciclo: string,
  action = "re-cerrar",
  allowLaterClosure = false,
): { evento: ReopeningEvent; cierrePosterior: CierrePosterior | null } {
  const reading = readActiveWindow(db);
  if (reading.estado === "SinVentana")
    throw new Problem(
      409,
      "NO_REABIERTO",
      `El ciclo no tiene una reapertura activa que ${action}.`,
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
  if (reading.estado === "CierrePosterior") {
    if (!allowLaterClosure)
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
    return {
      evento: reading.ventana,
      cierrePosterior: reading.cierrePosterior,
    };
  }
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
  return { evento: reading.ventana, cierrePosterior: null };
}

export function requireWindow(
  db: Database,
  ciclo: string,
  action = "re-cerrar",
): ReopeningEvent {
  return resolveWindow(db, ciclo, action).evento;
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
  // `revision` and the informative names/group are T3 and may change without
  // altering the economic classification. Identity, hierarchy and reference
  // type remain material. T3-only audits are filtered in `sourceAuditChanges`.
  return {
    categorias: projectedRows(value, "categorias", ["id"]),
    subcategorias: projectedRows(value, "subcategorias", ["id", "padre"]),
    partidas: projectedRows(value, "partidas", ["id", "padre"]),
    referencias: projectedRows(value, "referencias", ["id", "tipo"]),
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
    instrumentos: projectedRows(value, "instrumentos", ["id"]),
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
    deuda: projectedRows(value, "deuda", ["id", "estado", "apertura"]),
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
function refsFromRows(value: unknown, field: string): string[] {
  const rows = asArray(value);
  if (!rows) return [];
  const refs = new Set<string>();
  for (const row of rows) {
    const record = asRecord(row);
    if (record && typeof record[field] === "string")
      refs.add(record[field] as string);
  }
  return [...refs];
}

function auditPagaRefs(paga: string | null, delta: unknown): string[] {
  const refs = new Set<string>();
  if (paga) refs.add(paga);
  const visit = (input: unknown, depth: number) => {
    if (depth > 3) return;
    if (Array.isArray(input)) {
      for (const item of input) visit(item, depth + 1);
      return;
    }
    const record = asRecord(input);
    if (!record) return;
    if (typeof record.paga === "string") refs.add(record.paga);
    // `guardar`/`resolver` audit rows identify the pay in delta.campos[].id.
    if (Array.isArray(record.campos))
      for (const entry of record.campos) {
        const item = asRecord(entry);
        if (item && typeof item.id === "string") refs.add(item.id);
      }
    for (const value of Object.values(record)) visit(value, depth + 1);
  };
  visit(delta, 0);
  return [...refs];
}

/** Collects `movimiento` ids from direct or nested audit payloads. */
function auditMovementRefs(value: unknown): string[] {
  const refs = new Set<string>();
  const visit = (input: unknown, depth: number) => {
    if (depth > 4) return;
    if (Array.isArray(input)) {
      for (const item of input) visit(item, depth + 1);
      return;
    }
    const record = asRecord(input);
    if (!record) return;
    if (typeof record.movimiento === "string") refs.add(record.movimiento);
    for (const value of Object.values(record)) visit(value, depth + 1);
  };
  visit(value, 0);
  return [...refs];
}

const auditVolatileFields = new Set([
  "revision",
  "revision_previa",
  "creado",
  "actualizado",
  "instante",
  "motivo",
  "fingerprint",
  "impacto",
]);

/**
 * T3 fields for audit payloads. The catalog entities reuse the canonical
 * `informativeFields` whitelist. `movimiento_revision_comida` has its own
 * metadata payload: evidence is informative; `etiqueta`/`estadoRevision`
 * remain material because they drive the food classification calculations.
 */
const auditInformativeFields: Record<string, readonly string[]> = {
  ...informativeFields,
  movimientoRevisionComida: ["evidenciaBancaria", "evidenciaComercial"],
};

function noVerificable(bloque: string, motivo: string): MaterialComparison {
  return { estado: "NoVerificable", bloques: [bloque], motivos: [motivo] };
}

/**
 * Compares an audit's previous/next payload against the T3 informative fields
 * of its entity. Only changes outside that whitelist (and outside volatile
 * metadata) are material. A null previous payload is an alta: a new entity is
 * material even when its eventual name is informative.
 */
function auditPayloadChange(
  before: unknown,
  after: unknown,
  entity: string,
  label: string,
  bloque: "inversion" | "auxiliares" | "clasificacion",
): MaterialComparison | null {
  if (before === null || before === undefined)
    return {
      estado: "ConCambios",
      bloques: [bloque],
      motivos: [`La auditoría registra un alta posterior a la reapertura en ${label}.`],
    };
  const left = asRecord(before),
    right = asRecord(after);
  if (!left || !right)
    return noVerificable(
      bloque,
      `La auditoría de ${label} no tiene un payload legible; no se acredita la ausencia de cambios.`,
    );
  const ignored = new Set([
    ...(auditInformativeFields[entity] ?? []),
    ...auditVolatileFields,
  ]);
  const project = (record: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(record).filter(([key]) => !ignored.has(key)),
    );
  if (canonical(project(left)) === canonical(project(right))) return null;
  return {
    estado: "ConCambios",
    bloques: [bloque],
    motivos: [
      `La auditoría registra un cambio material posterior a la reapertura en ${label}.`,
    ],
  };
}

/** Classification audits store the list of changed field names in `campos`. */
function classificationAuditChange(
  raw: string,
  label: string,
): MaterialComparison | null {
  let changed: unknown;
  try {
    changed = JSON.parse(raw);
  } catch {
    return noVerificable(
      "clasificacion",
      `La auditoría de ${label} no es legible; no se acredita la ausencia de cambios.`,
    );
  }
  if (!Array.isArray(changed) || changed.some((field) => typeof field !== "string"))
    return noVerificable(
      "clasificacion",
      `La auditoría de ${label} no contiene una lista de campos legible; no se acredita la ausencia de cambios.`,
    );
  const ignored = new Set(["nombre", "grupo", "revision"]);
  if ((changed as string[]).every((field) => ignored.has(field))) return null;
  return {
    estado: "ConCambios",
    bloques: ["clasificacion"],
    motivos: [
      `La auditoría registra un cambio material posterior a la reapertura en ${label}.`,
    ],
  };
}

function sourceAuditChanges(
  db: Database,
  inicio: string,
  fin: string,
  reopeningUtc: string,
  versionOrigen: number,
  capture: CaptureCierre,
): MaterialComparison | null {
  const cycleMovements = new Set<string>();
  try {
    const rows = db
      .query("SELECT id FROM movimientos WHERE fecha BETWEEN ? AND ?")
      .all(inicio, fin) as { id: string }[];
    for (const row of rows) cycleMovements.add(row.id);
  } catch {
    return {
      estado: "NoVerificable",
      bloques: ["auxiliares"],
      motivos: [
        "No se pudieron leer los movimientos del ciclo; no se acredita la ausencia de cambios.",
      ],
    };
  }

  // Material entities captured by vN and by the live capture. These references
  // survive deletion of the current attribution row and let audit rows without
  // a `movimiento` payload link back to the cycle (F1 compartidos/anticipos).
  let storedAux: Record<string, unknown> = {};
  try {
    const row = db
      .query(
        "SELECT auxiliares FROM fotos_cierre WHERE ciclo=? AND version=?",
      )
      .get(capture.ciclo.id, versionOrigen) as { auxiliares: string } | null;
    if (!row) throw new Error("missing");
    const parsed = JSON.parse(row.auxiliares);
    storedAux = asRecord(parsed) ?? {};
    if (!asRecord(parsed)) throw new Error("not object");
  } catch {
    return {
      estado: "NoVerificable",
      bloques: ["auxiliares"],
      motivos: [
        `No se pudo leer la foto v${versionOrigen}; no se acredita la ausencia de cambios.`,
      ],
    };
  }
  const liveAux = asRecord(capture.payload.auxiliares) ?? {};
  const attributionRefs = new Map<"anticipos" | "compartidos", Set<string>>([
    [
      "anticipos",
      new Set([
        ...refsFromRows(storedAux.anticipos, "referencia"),
        ...refsFromRows(liveAux.anticipos, "referencia"),
      ]),
    ],
    [
      "compartidos",
      new Set([
        ...refsFromRows(storedAux.compartidos, "referencia"),
        ...refsFromRows(liveAux.compartidos, "referencia"),
      ]),
    ],
  ]);
  const cyclePagas = new Set([
    ...refsFromRows(storedAux.nomina, "paga"),
    ...refsFromRows(liveAux.nomina, "paga"),
  ]);
  try {
    const rows = db
      .query(
        `SELECT DISTINCT p.paga FROM payroll_allocations p
         JOIN movimientos m ON m.id=p.movimiento
         WHERE m.fecha BETWEEN ? AND ?`,
      )
      .all(inicio, fin) as { paga: string }[];
    for (const row of rows) cyclePagas.add(row.paga);
  } catch {
    return {
      estado: "NoVerificable",
      bloques: ["auxiliares"],
      motivos: [
        "No se pudieron leer las asignaciones de nómina; no se acredita la ausencia de cambios.",
      ],
    };
  }
  try {
    const rows = db
      .query(
        `SELECT DISTINCT m.referencia,r.tipo FROM movimientos m
         JOIN referencias r ON r.id=m.referencia
         WHERE m.fecha BETWEEN ? AND ? AND m.referencia IS NOT NULL`,
      )
      .all(inicio, fin) as { referencia: string; tipo: string }[];
    for (const row of rows) {
      if (row.tipo === "Anticipo")
        attributionRefs.get("anticipos")!.add(row.referencia);
      if (row.tipo === "Gasto compartido")
        attributionRefs.get("compartidos")!.add(row.referencia);
    }
  } catch {
    return {
      estado: "NoVerificable",
      bloques: ["auxiliares"],
      motivos: [
        "No se pudieron leer las referencias de los movimientos; no se acredita la ausencia de cambios.",
      ],
    };
  }

  const found: {
    bloque: "inversion" | "auxiliares" | "clasificacion";
    label: string;
  }[] = [];

  // Investment operations: only their T3 fields (`concepto`/`nota`) are
  // informative. Price, quantity, commission, dates, amounts and relations stay
  // material even when audited after the reopening.
  let operationRows: {
    operacion: string;
    clase: string;
    revision: number;
    anterior: string | null;
    posterior: string;
  }[];
  try {
    operationRows = db
      .query(
        `SELECT a.operacion,a.revision,a.anterior,a.posterior,o.clase
         FROM operacion_inversion_audit a
         JOIN operaciones_inversion o ON o.id=a.operacion
         WHERE o.fecha <= ? AND a.instante > ?`,
      )
      .all(fin, reopeningUtc) as typeof operationRows;
  } catch {
    return noVerificable(
      "inversion",
      "No se pudo leer la auditoría de operaciones de inversión; no se acredita la ausencia de cambios.",
    );
  }
  for (const row of operationRows) {
    let before: unknown = null,
      after: unknown;
    try {
      before = row.anterior === null ? null : JSON.parse(row.anterior);
      after = JSON.parse(row.posterior);
    } catch {
      return noVerificable(
        "inversion",
        `La auditoría de la operación ${row.operacion} v${row.revision} no es legible; no se acredita la ausencia de cambios.`,
      );
    }
    const change = auditPayloadChange(
      before,
      after,
      row.clase === "Venta" ? "venta" : "compra",
      `operación ${row.operacion} v${row.revision}`,
      "inversion",
    );
    if (change?.estado === "NoVerificable") return change;
    if (change?.estado === "ConCambios") {
      found.push({ bloque: "inversion", label: "operaciones de inversión" });
      break;
    }
  }

  let instrumentRows: {
    instrumento: string;
    revision: number;
    anterior: string | null;
    posterior: string;
  }[];
  try {
    instrumentRows = db
      .query(
        `SELECT instrumento,revision,anterior,posterior
         FROM instrumento_audit WHERE instante > ?`,
      )
      .all(reopeningUtc) as typeof instrumentRows;
  } catch {
    return noVerificable(
      "inversion",
      "No se pudo leer la auditoría de instrumentos; no se acredita la ausencia de cambios.",
    );
  }
  for (const row of instrumentRows) {
    let before: unknown = null,
      after: unknown;
    try {
      before = row.anterior === null ? null : JSON.parse(row.anterior);
      after = JSON.parse(row.posterior);
    } catch {
      return noVerificable(
        "inversion",
        `La auditoría del instrumento ${row.instrumento} v${row.revision} no es legible; no se acredita la ausencia de cambios.`,
      );
    }
    const change = auditPayloadChange(
      before,
      after,
      "instrumento",
      `instrumento ${row.instrumento} v${row.revision}`,
      "inversion",
    );
    if (change?.estado === "NoVerificable") return change;
    if (change?.estado === "ConCambios") {
      found.push({ bloque: "inversion", label: "instrumentos" });
      break;
    }
  }

  let foodRows: {
    movimiento: string;
    revision: number;
    anterior: string | null;
    posterior: string;
  }[];
  try {
    foodRows = db
      .query(
        `SELECT a.movimiento,a.revision,a.anterior,a.posterior
         FROM movimiento_revision_comida_audit a
         JOIN movimiento_revision_comida c ON c.movimiento=a.movimiento
         JOIN movimientos m ON m.id=c.movimiento
         WHERE m.fecha BETWEEN ? AND ? AND a.instante > ?`,
      )
      .all(inicio, fin, reopeningUtc) as typeof foodRows;
  } catch {
    return noVerificable(
      "auxiliares",
      "No se pudo leer la auditoría de revisión de comida; no se acredita la ausencia de cambios.",
    );
  }
  for (const row of foodRows) {
    let before: unknown = null,
      after: unknown;
    try {
      before = row.anterior === null ? null : JSON.parse(row.anterior);
      after = JSON.parse(row.posterior);
    } catch {
      return noVerificable(
        "auxiliares",
        `La auditoría de revisión de comida ${row.movimiento} v${row.revision} no es legible; no se acredita la ausencia de cambios.`,
      );
    }
    const change = auditPayloadChange(
      before,
      after,
      "movimientoRevisionComida",
      `revisión de comida ${row.movimiento} v${row.revision}`,
      "auxiliares",
    );
    if (change?.estado === "NoVerificable") return change;
    if (change?.estado === "ConCambios") {
      found.push({ bloque: "auxiliares", label: "revisión de comida" });
      break;
    }
  }

  let debtRows: { entidad: string; campos: string }[];
  try {
    debtRows = db
      .query(
        `SELECT a.entidad,a.campos FROM audit a
         JOIN deudas d ON d.id=a.entidad
         WHERE a.instante > ?`,
      )
      .all(reopeningUtc) as typeof debtRows;
  } catch {
    return noVerificable(
      "auxiliares",
      "No se pudo leer la auditoría de deuda; no se acredita la ausencia de cambios.",
    );
  }
  for (const row of debtRows) {
    let wrapper: Record<string, unknown> | null;
    try {
      wrapper = asRecord(JSON.parse(row.campos));
    } catch {
      wrapper = null;
    }
    if (!wrapper)
      return noVerificable(
        "auxiliares",
        `La auditoría de deuda ${row.entidad} no es legible; no se acredita la ausencia de cambios.`,
      );
    const change = auditPayloadChange(
      wrapper.anterior,
      wrapper.posterior,
      "deuda",
      `deuda ${row.entidad}`,
      "auxiliares",
    );
    if (change?.estado === "NoVerificable") return change;
    if (change?.estado === "ConCambios") {
      found.push({ bloque: "auxiliares", label: "deuda" });
      break;
    }
  }

  // Classification catalogs write the changed field names as a JSON array.
  // Names/group are T3; hierarchy, state, economic attributes and reference
  // type remain material.
  let classificationRows: { entidad: string; campos: string }[];
  try {
    classificationRows = db
      .query(
        `SELECT a.entidad,a.campos FROM audit a
         WHERE a.instante > ?
           AND json_type(a.campos)='array'
           AND (
             EXISTS(SELECT 1 FROM categorias c WHERE c.id=a.entidad)
             OR EXISTS(SELECT 1 FROM subcategorias s WHERE s.id=a.entidad)
             OR EXISTS(SELECT 1 FROM partidas p WHERE p.id=a.entidad)
           )`,
      )
      .all(reopeningUtc) as typeof classificationRows;
  } catch {
    return noVerificable(
      "clasificacion",
      "No se pudo leer la auditoría de clasificación; no se acredita la ausencia de cambios.",
    );
  }
  for (const row of classificationRows) {
    const change = classificationAuditChange(
      row.campos,
      `clasificación ${row.entidad}`,
    );
    if (change?.estado === "NoVerificable") return change;
    if (change?.estado === "ConCambios") {
      found.push({ bloque: "clasificacion", label: "clasificación" });
      break;
    }
  }

  let referenceRows: { entidad: string; campos: string }[];
  try {
    referenceRows = db
      .query(
        `SELECT a.entidad,a.campos FROM audit a
         JOIN referencias r ON r.id=a.entidad
         WHERE a.instante > ? AND a.accion IN ('alta','edición')`,
      )
      .all(reopeningUtc) as typeof referenceRows;
  } catch {
    return noVerificable(
      "clasificacion",
      "No se pudo leer la auditoría de referencias; no se acredita la ausencia de cambios.",
    );
  }
  for (const row of referenceRows) {
    let wrapper: Record<string, unknown> | null;
    try {
      wrapper = asRecord(JSON.parse(row.campos));
    } catch {
      wrapper = null;
    }
    if (!wrapper)
      return noVerificable(
        "clasificacion",
        `La auditoría de la referencia ${row.entidad} no es legible; no se acredita la ausencia de cambios.`,
      );
    const change = auditPayloadChange(
      wrapper.anterior,
      wrapper.posterior,
      "referencia",
      `referencia ${row.entidad}`,
      "clasificacion",
    );
    if (change?.estado === "NoVerificable") return change;
    if (change?.estado === "ConCambios") {
      found.push({ bloque: "clasificacion", label: "referencias" });
      break;
    }
  }

  // Attribution audits can outlive the current `movimiento_anticipo` /
  // `movimiento_compartido` row. Link by payload movement when present, and by
  // reference against the material entities captured by vN/live capture when
  // the payload has no movement (F1).
  const attributionChecks = [
    {
      key: "anticipos" as const,
      sql: `SELECT id,referencia,anterior,posterior FROM anticipo_audit
            WHERE instante > ?`,
    },
    {
      key: "compartidos" as const,
      sql: `SELECT id,referencia,anterior,posterior FROM compartido_audit
            WHERE instante > ?`,
    },
  ];
  for (const check of attributionChecks) {
    let rows: {
      id: number;
      referencia: string;
      anterior: string | null;
      posterior: string;
    }[];
    try {
      rows = db.query(check.sql).all(reopeningUtc) as typeof rows;
    } catch {
      return {
        estado: "NoVerificable",
        bloques: ["auxiliares"],
        motivos: [
          `No se pudo leer la auditoría de ${check.key}; no se acredita la ausencia de cambios.`,
        ],
      };
    }
    const refs = attributionRefs.get(check.key)!;
    let changed = false;
    for (const row of rows) {
      if (refs.has(row.referencia)) {
        changed = true;
        break;
      }
      for (const raw of [row.anterior, row.posterior]) {
        if (raw === null) continue;
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return {
            estado: "NoVerificable",
            bloques: ["auxiliares"],
            motivos: [
              `La auditoría de ${check.key} no es legible; no se acredita la ausencia de cambios.`,
            ],
          };
        }
        if (auditMovementRefs(parsed).some((id) => cycleMovements.has(id))) {
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
    if (changed) found.push({ bloque: "auxiliares", label: check.key });
  }

  // Every payroll audit action after the reopening is inspected, not only
  // `repartir`: `guardar`/`resolver` identify the pay in `paga`/delta.campos,
  // and allocation deltas identify the cycle movement. A pay that is used by a
  // cycle allocation is material to the photo even when no allocation changed.
  let payrollRows: { id: number; paga: string | null; delta: string }[];
  try {
    payrollRows = db
      .query("SELECT id,paga,delta FROM payroll_audit WHERE instante > ?")
      .all(reopeningUtc) as typeof payrollRows;
  } catch {
    return {
      estado: "NoVerificable",
      bloques: ["auxiliares"],
      motivos: [
        "No se pudo leer la auditoría de nómina; no se acredita la ausencia de cambios.",
      ],
    };
  }
  let payrollChanged = false;
  for (const row of payrollRows) {
    let delta: unknown;
    try {
      delta = JSON.parse(row.delta);
    } catch {
      return {
        estado: "NoVerificable",
        bloques: ["auxiliares"],
        motivos: [
          "La auditoría de nómina no es legible; no se acredita la ausencia de cambios.",
        ],
      };
    }
    if (!asRecord(delta))
      return {
        estado: "NoVerificable",
        bloques: ["auxiliares"],
        motivos: [
          "La auditoría de nómina no contiene un delta legible.",
        ],
      };
    if (
      auditMovementRefs(delta).some((id) => cycleMovements.has(id)) ||
      auditPagaRefs(row.paga, delta).some((id) => cyclePagas.has(id))
    ) {
      payrollChanged = true;
      break;
    }
  }
  if (payrollChanged) found.push({ bloque: "auxiliares", label: "nómina" });

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
 * write. Any audited revision — T3 or material — accounts for the bump:
 * `sourceAuditChanges` decides whether that audit payload is material, so a T3
 * edit counts as baseline and a reverted material write still fails closed.
 * Only a revision bump with no audit row at all is flagged here.
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
    .query("SELECT 1 AS ok FROM cierres WHERE ciclo=? AND version=?")
    .get(ciclo, versionOrigen) as { ok: number } | null;
  if (!cierre)
    return {
      estado: "NoVerificable",
      bloques: [],
      motivos: [
        `No existe el cierre v${versionOrigen}; no se acredita la ausencia de cambios.`,
      ],
    };
  const checks: {
    bloque: "inversion" | "auxiliares" | "clasificacion";
    label: string;
    sql: string;
    params: (string | number)[];
  }[] = [
    {
      bloque: "inversion",
      label: "operaciones de inversión",
      // T3 concept/note audits count as the baseline; a material audit is
      // classified by `sourceAuditChanges`. Only an unaccounted bump fails.
      sql: `SELECT o.id,o.revision,
        (SELECT MAX(a.revision) FROM operacion_inversion_audit a
          WHERE a.operacion=o.id) baseline
       FROM operaciones_inversion o
       WHERE o.fecha <= ?`,
      params: [fin],
    },
    {
      bloque: "inversion",
      label: "instrumentos",
      // Any audited revision (including T3) accounts for the bump. Material
      // audit payloads are classified by `sourceAuditChanges`; this check only
      // catches a direct revision bump with no audit row at all.
      sql: `SELECT i.id,i.revision,
        (SELECT MAX(a.revision) FROM instrumento_audit a
          WHERE a.instrumento=i.id) baseline
       FROM instrumentos i`,
      params: [],
    },
    {
      bloque: "auxiliares",
      label: "revisión de comida",
      sql: `SELECT c.movimiento id,c.revision,
        (SELECT MAX(a.revision) FROM movimiento_revision_comida_audit a
          WHERE a.movimiento=c.movimiento) baseline
       FROM movimiento_revision_comida c
       JOIN movimientos m ON m.id=c.movimiento
       WHERE m.fecha BETWEEN ? AND ?`,
      params: [inicio, fin],
    },
    {
      bloque: "auxiliares",
      label: "deuda",
      sql: `SELECT d.id,d.revision,
        (SELECT MAX(a.revision) FROM audit a
          WHERE a.entidad=d.id) baseline
       FROM deudas d`,
      params: [],
    },
    {
      bloque: "clasificacion",
      label: "categorías",
      sql: `SELECT c.id,c.revision,
        (SELECT MAX(a.revision) FROM audit a WHERE a.entidad=c.id) baseline
       FROM categorias c`,
      params: [],
    },
    {
      bloque: "clasificacion",
      label: "subcategorías",
      sql: `SELECT s.id,s.revision,
        (SELECT MAX(a.revision) FROM audit a WHERE a.entidad=s.id) baseline
       FROM subcategorias s`,
      params: [],
    },
    {
      bloque: "clasificacion",
      label: "partidas",
      sql: `SELECT p.id,p.revision,
        (SELECT MAX(a.revision) FROM audit a WHERE a.entidad=p.id) baseline
       FROM partidas p`,
      params: [],
    },
    {
      bloque: "clasificacion",
      label: "referencias",
      sql: `SELECT r.id,r.revision,
        (SELECT MAX(a.revision) FROM audit a WHERE a.entidad=r.id) baseline
       FROM referencias r`,
      params: [],
    },
  ];
  const changed: {
    bloque: "inversion" | "auxiliares" | "clasificacion";
    label: string;
    id: string;
    revision: number;
  }[] = [];
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
              versionOrigen,
              capture,
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
