import type { Database } from "bun:sqlite";
import { Problem } from "./problem";
import { fingerprint } from "./movement-ledger";

/**
 * E4.9 closure guards shared by the real write paths.
 *
 * T1 — facts and windows: any fact whose previous or next date falls inside a
 * closed window is rejected with 409 `HISTORY_LOCKED` (SPEC27 AC-03/AC-04),
 * even when a note-only edit would leave the numbers intact. A fact dated
 * before a closed window is rejected when it could alter cash, positions,
 * income, expenses, net, S0, windows or auxiliaries captured by a later
 * photo; when that impact cannot be verified it is also rejected. Cycle
 * `inicio`/derived `fin`/S0 remain hard-locked.
 * T2 — attributes that change captured numbers: photo-material Saldo changes
 * stay blocked; changes that only affect a live economic state go through the
 * impact preview + motive + fingerprint + audit flow. Economic classification
 * keeps its existing review flow.
 * T3 — names/labels keep working; catalogs that a photo captured only accept
 * their informative fields after a close (e.g. Instrumento nombre) while
 * identity fields are rejected field by field, not by date.
 *
 * Every helper tolerates databases created before v25 (some focused tests and
 * migration fixtures open older schemas), where `cierres` does not exist yet.
 * There is nothing closed in those databases, so the guards are inert.
 */

export type ClosedWindow = {
  ciclo: string;
  version: number;
  inicio: string;
  fin: string;
};

export type CycleGuardValue = {
  id: string;
  inicio: string;
  fin: string | null;
  saldoInicialComida: string;
};

export type SaldoGuardValue = {
  tipo: string;
  control: string;
  saldoApertura: string | null;
};

type PhotoCash = { saldo: string; disponible: string };
type PhotoPosition = {
  instrumento: string;
  saldoInversion: string;
  cantidad: string;
};

type PhotoSnapshot = ClosedWindow & {
  cuentas: PhotoCash[];
  posiciones: PhotoPosition[];
  /**
   * A stored photo whose `inversion` payload cannot be read cannot prove the
   * absence of impact; any economic fact dated at or before its `fin` is
   * treated as impacting it.
   */
  unverifiable: boolean;
};

function hasTable(db: Database, name: string) {
  return !!db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
}

/** Latest close version of every closed cycle, in chronological order. */
export function closedWindows(db: Database): ClosedWindow[] {
  if (!hasTable(db, "cierres")) return [];
  return db
    .query(
      `SELECT c.ciclo,c.version,c.inicio,c.fin
       FROM cierres c
       WHERE c.estado='Cerrado'
         AND c.version=(SELECT MAX(v.version) FROM cierres v WHERE v.ciclo=c.ciclo)
       ORDER BY c.inicio,c.ciclo`,
    )
    .all() as ClosedWindow[];
}

export function hasClosures(db: Database) {
  return closedWindows(db).length > 0;
}

/** Closed windows touched by any of the received dates, without duplicates. */
export function closedWindowsForDates(
  db: Database,
  dates: readonly (string | null | undefined)[],
): ClosedWindow[] {
  const windows = closedWindows(db);
  const hits = new Map<string, ClosedWindow>();
  for (const date of dates) {
    if (!date) continue;
    for (const window of windows)
      if (window.inicio <= date && date <= window.fin)
        hits.set(`${window.ciclo}|${window.version}`, window);
  }
  return [...hits.values()];
}

/**
 * Strict SPEC27 AC-03/AC-04 date lock: the previous and the next date are
 * both checked. A date inside a closed window is rejected even when the
 * operation would not change a captured number; the approved T1 rule is
 * date-based and has no "no impact" exception.
 */
export function assertDatesWritable(
  db: Database,
  dates: readonly (string | null | undefined)[],
  action: string,
) {
  const hits = closedWindowsForDates(db, dates);
  if (!hits.length) return;
  const list = hits
    .map((window) => `${window.ciclo} (v${window.version})`)
    .join(", ");
  throw new Problem(
    409,
    "HISTORY_LOCKED",
    `No se puede ${action}: la fecha pertenece a una ventana cerrada (${list}).`,
    { fecha: "La fecha afecta a un ciclo cerrado." },
    {
      cierres: hits.map(({ ciclo, version, inicio, fin }) => ({
        ciclo,
        version,
        inicio,
        fin,
      })),
    },
  );
}

/**
 * Every stored photo is permanent (DT4). The impact computation reads all of
 * them, not only the latest closure version, because an older version may
 * still be consulted and must not silently diverge from live data.
 */
function photoSnapshots(db: Database): PhotoSnapshot[] {
  if (!hasTable(db, "cierres") || !hasTable(db, "fotos_cierre")) return [];
  const rows = db
    .query(
      `SELECT c.ciclo,c.version,c.inicio,c.fin,f.inversion
       FROM cierres c JOIN fotos_cierre f
         ON f.ciclo=c.ciclo AND f.version=c.version
       ORDER BY c.fin,c.ciclo,c.version`,
    )
    .all() as {
    ciclo: string;
    version: number;
    inicio: string;
    fin: string;
    inversion: string;
  }[];
  return rows.map((row) => {
    try {
      const value = JSON.parse(row.inversion) as {
        cuentas?: unknown;
        posiciones?: unknown;
      };
      const cuentas = Array.isArray(value?.cuentas)
        ? value.cuentas
            .filter(
              (item): item is PhotoCash =>
                !!item &&
                typeof item === "object" &&
                typeof (item as { saldo?: unknown }).saldo === "string" &&
                typeof (item as { disponible?: unknown }).disponible ===
                  "string",
            )
            .map((item) => ({
              saldo: item.saldo,
              disponible: item.disponible,
            }))
        : [];
      const posiciones = Array.isArray(value?.posiciones)
        ? value.posiciones
            .filter(
              (item): item is PhotoPosition =>
                !!item &&
                typeof item === "object" &&
                typeof (item as { instrumento?: unknown }).instrumento ===
                  "string" &&
                typeof (item as { saldoInversion?: unknown }).saldoInversion ===
                  "string" &&
                typeof (item as { cantidad?: unknown }).cantidad === "string",
            )
            .map((item) => ({
              instrumento: item.instrumento,
              saldoInversion: item.saldoInversion,
              cantidad: item.cantidad,
            }))
        : [];
      const unverifiable =
        !value ||
        typeof value !== "object" ||
        !Array.isArray(value.cuentas) ||
        !Array.isArray(value.posiciones);
      return {
        ciclo: row.ciclo,
        version: row.version,
        inicio: row.inicio,
        fin: row.fin,
        cuentas,
        posiciones,
        unverifiable,
      };
    } catch {
      return {
        ciclo: row.ciclo,
        version: row.version,
        inicio: row.inicio,
        fin: row.fin,
        cuentas: [],
        posiciones: [],
        unverifiable: true,
      };
    }
  });
}

function windowOf(photo: PhotoSnapshot): ClosedWindow {
  return {
    ciclo: photo.ciclo,
    version: photo.version,
    inicio: photo.inicio,
    fin: photo.fin,
  };
}

function closureProblem(
  windows: ClosedWindow[],
  action: string,
  detail: string,
): never {
  const list = windows
    .map((window) => `${window.ciclo} (v${window.version})`)
    .join(", ");
  throw new Problem(
    409,
    "HISTORY_LOCKED",
    `No se puede ${action}: ${detail} (${list}).`,
    { fecha: "La operación altera el estado económico de un cierre." },
    {
      cierres: windows.map(({ ciclo, version, inicio, fin }) => ({
        ciclo,
        version,
        inicio,
        fin,
      })),
    },
  );
}

/**
 * T1 window/S0 lock for cycle operations. `before`/`after` are the derived
 * cycle lists; a closed cycle must keep its `inicio`, derived `fin` and S0.
 * Comparing the derived lists also covers neighbours whose Fin moves when a
 * cycle is inserted or rectified in the middle.
 */
export function assertClosedCyclesUnchanged(
  db: Database,
  before: readonly CycleGuardValue[],
  after: readonly CycleGuardValue[],
) {
  const windows = closedWindows(db);
  if (!windows.length) return;
  for (const window of windows) {
    const previous = before.find((cycle) => cycle.id === window.ciclo);
    const next = after.find((cycle) => cycle.id === window.ciclo);
    if (
      !previous ||
      !next ||
      previous.inicio !== next.inicio ||
      previous.fin !== next.fin ||
      previous.saldoInicialComida !== next.saldoInicialComida
    )
      throw new Problem(
        409,
        "HISTORY_LOCKED",
        `El ciclo ${window.ciclo} está cerrado (v${window.version}); no se puede cambiar su ventana ni su Saldo inicial.`,
        { ciclo: "El ciclo está cerrado." },
        {
          cierres: [
            {
              ciclo: window.ciclo,
              version: window.version,
              inicio: window.inicio,
              fin: window.fin,
            },
          ],
        },
      );
  }
}

export type MovementEffectRow = {
  fecha: string;
  importe: string;
  origen: string;
  destino: string;
  anulado?: number;
};

function movementDeltas(
  row: MovementEffectRow | null | undefined,
  fin: string,
): Map<string, bigint> {
  const deltas = new Map<string, bigint>();
  if (!row || row.anulado === 1 || row.fecha > fin) return deltas;
  const amount = BigInt(row.importe);
  deltas.set(row.origen, (deltas.get(row.origen) ?? 0n) - amount);
  deltas.set(row.destino, (deltas.get(row.destino) ?? 0n) + amount);
  return deltas;
}

/**
 * T1 fact lock for a date before the closed windows. A fact that could alter
 * cash, positions, income, expenses, net, S0, windows or auxiliaries captured
 * by a later photo is blocked; when the photo cannot prove the absence of
 * impact (unreadable inversion payload or a closure without its photo) it is
 * also blocked. Dates inside a closed window never reach this check: they are
 * rejected earlier by `assertDatesWritable`.
 */
export function movementClosureImpact(
  db: Database,
  before: MovementEffectRow | null | undefined,
  after: MovementEffectRow | null | undefined,
): ClosedWindow[] {
  const hits = new Map<string, ClosedWindow>();
  const photos = photoSnapshots(db);
  const photographed = new Set<string>();
  for (const photo of photos) {
    photographed.add(`${photo.ciclo}|${photo.version}`);
    const touched =
      (before && before.fecha <= photo.fin) ||
      (after && after.fecha <= photo.fin);
    if (!touched) continue;
    if (photo.unverifiable) {
      hits.set(`${photo.ciclo}|${photo.version}`, windowOf(photo));
      continue;
    }
    const previous = movementDeltas(before, photo.fin);
    const next = movementDeltas(after, photo.fin);
    if (
      photo.cuentas.some(
        (account) =>
          (previous.get(account.saldo) ?? 0n) !==
          (next.get(account.saldo) ?? 0n),
      )
    )
      hits.set(`${photo.ciclo}|${photo.version}`, windowOf(photo));
  }
  for (const window of closedWindows(db)) {
    if (photographed.has(`${window.ciclo}|${window.version}`)) continue;
    if (
      (before && before.fecha <= window.fin) ||
      (after && after.fecha <= window.fin)
    )
      hits.set(`${window.ciclo}|${window.version}`, window);
  }
  return [...hits.values()];
}

/** T1 Movement lock: closed-window dates plus demonstrable/unverifiable impact. */
export function assertMovementClosureImpact(
  db: Database,
  before: MovementEffectRow | null | undefined,
  after: MovementEffectRow | null | undefined,
  action: string,
) {
  assertDatesWritable(db, [before?.fecha, after?.fecha], action);
  const windows = movementClosureImpact(db, before, after);
  if (windows.length)
    closureProblem(
      windows,
      action,
      "el hecho anterior o el nuevo puede alterar valores capturados por una foto posterior",
    );
}

export type OperationEffectRow = {
  clase: string;
  fecha: string;
  estado: string;
  cantidad: string;
  importe: string;
  instrumento: string;
  saldoEfectivo: string;
  saldoInversion: string;
};

type OperationEffect = {
  saldoEfectivo: string;
  cash: bigint;
  instrumento: string;
  saldoInversion: string;
  quantity: bigint;
};

function operationEffect(
  row: OperationEffectRow | null | undefined,
  fin: string,
): OperationEffect | null {
  if (!row || row.estado !== "Vigente" || row.fecha > fin) return null;
  const amount = BigInt(row.importe);
  const quantity = BigInt(row.cantidad);
  return {
    saldoEfectivo: row.saldoEfectivo,
    cash: row.clase === "Compra" ? -amount : amount,
    instrumento: row.instrumento,
    saldoInversion: row.saldoInversion,
    quantity: row.clase === "Compra" ? quantity : -quantity,
  };
}

/**
 * T1 E4.1 operation lock. A Compra/Venta is blocked when its previous or next
 * date falls in a closed window, and also when an earlier date could change
 * the cash or positions captured at a later `fin`. An unreadable photo or a
 * closure without its photo is treated as unverifiable impact and blocks.
 */
export function operationClosureImpact(
  db: Database,
  before: OperationEffectRow | null | undefined,
  after: OperationEffectRow | null | undefined,
): ClosedWindow[] {
  const hits = new Map<string, ClosedWindow>();
  const photos = photoSnapshots(db);
  const photographed = new Set<string>();
  for (const photo of photos) {
    photographed.add(`${photo.ciclo}|${photo.version}`);
    const touched =
      (before && before.fecha <= photo.fin) ||
      (after && after.fecha <= photo.fin);
    if (!touched) continue;
    if (photo.unverifiable) {
      hits.set(`${photo.ciclo}|${photo.version}`, windowOf(photo));
      continue;
    }
    const previous = operationEffect(before, photo.fin);
    const next = operationEffect(after, photo.fin);
    const cashAccounts = new Set(
      [previous?.saldoEfectivo, next?.saldoEfectivo].filter(
        (value): value is string => !!value,
      ),
    );
    const cashChanged = [...cashAccounts].some((account) => {
      if (!photo.cuentas.some((captured) => captured.saldo === account))
        return false;
      const previousCash =
        previous?.saldoEfectivo === account ? previous.cash : 0n;
      const nextCash = next?.saldoEfectivo === account ? next.cash : 0n;
      return previousCash !== nextCash;
    });
    const previousKey = previous
      ? `${previous.instrumento}|${previous.saldoInversion}|${previous.quantity}`
      : "";
    const nextKey = next
      ? `${next.instrumento}|${next.saldoInversion}|${next.quantity}`
      : "";
    if (cashChanged || previousKey !== nextKey)
      hits.set(`${photo.ciclo}|${photo.version}`, windowOf(photo));
  }
  for (const window of closedWindows(db)) {
    if (photographed.has(`${window.ciclo}|${window.version}`)) continue;
    if (
      (before && before.fecha <= window.fin) ||
      (after && after.fecha <= window.fin)
    )
      hits.set(`${window.ciclo}|${window.version}`, window);
  }
  return [...hits.values()];
}

/** T1 E4.1 lock: closed-window dates plus impact on a later captured `fin`. */
export function assertOperationClosureImpact(
  db: Database,
  before: OperationEffectRow | null | undefined,
  after: OperationEffectRow | null | undefined,
  action: string,
) {
  assertDatesWritable(db, [before?.fecha, after?.fecha], action);
  const windows = operationClosureImpact(db, before, after);
  if (windows.length)
    closureProblem(
      windows,
      action,
      "la operación anterior o la nueva puede alterar valores capturados por una foto posterior",
    );
}

function capturedCashAccount(db: Database, saldo: string) {
  return photoSnapshots(db).some((photo) =>
    photo.cuentas.some((account) => account.saldo === saldo),
  );
}

const saldoClosureFields = ["tipo", "control", "saldoApertura"];

function isInvestmentCash(value: { tipo?: string; control?: string }) {
  return value.tipo === "Efectivo" && value.control === "Inversiones";
}

/**
 * T2 Saldo guard. Only blocks when an existing close depends on the value:
 * - `tipo`/`control` of an investment cash account, or a change that turns a
 *   Saldo into one, modifies the account list captured by every photo.
 * - `apertura` of an account already captured by a photo changes its cash.
 * Names, finality, liquidity flags and state are not part of the closure
 * computation and remain editable (T2/T3).
 */
export function saldoClosureConflict(
  db: Database,
  id: string,
  changed: readonly string[],
  next?: SaldoGuardValue,
): ClosedWindow[] {
  if (!hasClosures(db)) return [];
  if (!changed.some((field) => saldoClosureFields.includes(field)))
    return [];
  const old = db
    .query(
      "SELECT tipo,control,CAST(apertura AS TEXT) apertura FROM saldos WHERE id=?",
    )
    .get(id) as { tipo: string; control: string; apertura: string | null } | null;
  if (!old) return [];
  const before: SaldoGuardValue = {
    tipo: old.tipo,
    control: old.control,
    saldoApertura: old.apertura,
  };
  const after: SaldoGuardValue = next ?? before;
  if (
    (changed.includes("tipo") || changed.includes("control")) &&
    (isInvestmentCash(before) || isInvestmentCash(after))
  )
    return closedWindows(db);
  if (changed.includes("saldoApertura") && capturedCashAccount(db, id))
    return closedWindows(db);
  return [];
}

/**
 * T2 Saldo review. An economic change that no photo captured still needs an
 * explicit motive, fingerprint and audit because it rewrites a live position
 * history. Photo-material changes stay hard-blocked (`saldoClosureConflict`).
 */
export function saldoEconomicReview(
  db: Database,
  changed: readonly string[],
): ClosedWindow[] {
  if (!hasClosures(db)) return [];
  const economic = changed.filter((field) => !["nombre"].includes(field));
  return economic.length ? closedWindows(db) : [];
}

/**
 * T3 catalog whitelist. Field-by-field, never date-based: only the listed
 * informative attributes may change once a closure exists; identity or
 * economic fields are rejected instead of trusting a justification.
 */
export const informativeFields: Record<string, readonly string[]> = {
  movimiento: ["concepto", "nota"],
  compra: ["concepto", "nota"],
  venta: ["concepto", "nota"],
  saldo: ["nombre"],
  referencia: ["nombre"],
  instrumento: ["nombre"],
  deuda: ["nombre"],
  presupuesto: ["nombre"],
  participante: ["nombre"],
  revisionComida: [
    "concepto",
    "evidenciaBancaria",
    "evidenciaRelacionCompra",
    "cuentaOrigen",
  ],
  categoria: ["nombre"],
  subcategoria: ["nombre"],
  partida: ["nombre"],
};

export type ClosedFieldDecision = {
  windows: ClosedWindow[];
  informative: string[];
  economic: string[];
};

/** Classify a field change against the T3 whitelist and the closures. */
export function closedFieldDecision(
  db: Database,
  entity: string,
  changed: readonly string[],
): ClosedFieldDecision {
  const windows = closedWindows(db);
  if (!windows.length)
    return { windows: [], informative: [...changed], economic: [] };
  const allowed = informativeFields[entity] ?? [];
  return {
    windows,
    informative: changed.filter((field) => allowed.includes(field)),
    economic: changed.filter((field) => !allowed.includes(field)),
  };
}

/** Hard T3 block: a field outside the informative whitelist cannot be written. */
export function assertClosedInformativeFields(
  db: Database,
  entity: string,
  changed: readonly string[],
  action: string,
) {
  const decision = closedFieldDecision(db, entity, changed);
  if (!decision.economic.length) return;
  throw new Problem(
    409,
    "HISTORY_LOCKED",
    `No se puede ${action}: con cierres existentes solo se admiten campos informativos (${decision.informative.join(", ") || "ninguno"}); bloqueados: ${decision.economic.join(", ")}.`,
    Object.fromEntries(
      decision.economic.map((field) => [
        field,
        "Campo económico o de identidad bloqueado por cierre.",
      ]),
    ),
    {
      cierres: decision.windows.map(({ ciclo, version, inicio, fin }) => ({
        ciclo,
        version,
        inicio,
        fin,
      })),
      campos: decision.economic,
    },
  );
}

/**
 * T2 motive gate for entities whose review flow is motive + audit (no
 * fingerprint). Returns the affected windows so callers can record them; it
 * throws 422 when an economic field changes without an explicit motive.
 */
export function assertClosedEconomicMotive(
  db: Database,
  entity: string,
  changed: readonly string[],
  motive: unknown,
  action: string,
): ClosedWindow[] {
  const decision = closedFieldDecision(db, entity, changed);
  if (!decision.economic.length) return [];
  if (
    typeof motive !== "string" ||
    !motive.trim() ||
    motive.length > 2000 ||
    /[\u0000-\u001f\u007f]/.test(motive)
  )
    throw new Problem(
      422,
      "VALIDATION",
      `Indica el motivo de ${action}; el cambio es económico y existe un cierre.`,
      { motivo: "Motivo obligatorio para el cambio económico." },
      {
        cierres: decision.windows.map(({ ciclo, version, inicio, fin }) => ({
          ciclo,
          version,
          inicio,
          fin,
        })),
        campos: decision.economic,
      },
    );
  return decision.windows;
}

/**
 * T2 consumer-impact fingerprint. The value is computed over the entity, the
 * changed economic fields and the consumer rows a photo or a live view could
 * depend on, so a free-text motive is never enough after a close (DEV-06).
 */
export function consumerImpactFingerprint(
  entity: string,
  id: string,
  changed: readonly string[],
  consumers: unknown,
): string {
  return fingerprint([
    entity,
    id,
    [...changed].sort((a, b) => a.localeCompare(b)),
    consumers,
  ]);
}

/**
 * T2 guarded review for Referencias/Deudas: informative fields keep working
 * (T3), while an economic field after a close requires the impact fingerprint
 * built from the affected consumers plus motive and audit. When the impact
 * cannot be credited the write is blocked instead of weakening the certificate.
 */
export function assertClosedEconomicImpact(
  db: Database,
  entity: string,
  changed: readonly string[],
  motive: unknown,
  impactFingerprint: unknown,
  expectedFingerprint: string,
  action: string,
): ClosedWindow[] {
  const decision = closedFieldDecision(db, entity, changed);
  if (!decision.economic.length) return [];
  if (
    typeof motive !== "string" ||
    !motive.trim() ||
    motive.length > 2000 ||
    /[\u0000-\u001f\u007f]/.test(motive)
  )
    throw new Problem(
      422,
      "VALIDATION",
      `Indica el motivo de ${action}; el cambio es económico y existe un cierre.`,
      { motivo: "Motivo obligatorio para el cambio económico." },
      {
        cierres: decision.windows.map(({ ciclo, version, inicio, fin }) => ({
          ciclo,
          version,
          inicio,
          fin,
        })),
        campos: decision.economic,
      },
    );
  if (
    typeof impactFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/.test(impactFingerprint)
  )
    throw new Problem(
      409,
      "IMPACTO_NO_VERIFICABLE",
      `No se puede ${action}: falta la huella de impacto de los consumidores afectados.`,
      {
        fingerprint:
          "Genera la vista de impacto y envía su huella junto al motivo.",
      },
      {
        cierres: decision.windows.map(({ ciclo, version, inicio, fin }) => ({
          ciclo,
          version,
          inicio,
          fin,
        })),
        campos: decision.economic,
      },
    );
  if (impactFingerprint !== expectedFingerprint)
    throw new Problem(
      409,
      "IMPACT_CHANGED",
      `No se puede ${action}: el impacto sobre los consumidores ha cambiado; vuelve a revisarlo.`,
      { fingerprint: "La huella de impacto no coincide con el estado actual." },
      {
        cierres: decision.windows.map(({ ciclo, version, inicio, fin }) => ({
          ciclo,
          version,
          inicio,
          fin,
        })),
        campos: decision.economic,
      },
    );
  return decision.windows;
}

/** Closures whose frozen window belongs to the given cycle. */
export function closedWindowsForCycle(
  db: Database,
  ciclo: string,
): ClosedWindow[] {
  return closedWindows(db).filter((window) => window.ciclo === ciclo);
}

/**
 * Read the plan block of every photo that captured the cycle. A missing or
 * unreadable plan block cannot prove the impact, so the live plan review is
 * blocked rather than silently accepted.
 */
function assertPlanPhotosVerifiable(db: Database, ciclo: string) {
  if (!hasTable(db, "fotos_cierre")) return;
  const rows = db
    .query(
      `SELECT f.plan FROM cierres c JOIN fotos_cierre f
        ON f.ciclo=c.ciclo AND f.version=c.version
       WHERE c.ciclo=?`,
    )
    .all(ciclo) as { plan: string }[];
  for (const row of rows) {
    try {
      const plan = JSON.parse(row.plan) as { estado?: unknown; items?: unknown };
      if (
        !plan ||
        typeof plan !== "object" ||
        !["SinPlan", "Capturado"].includes(plan.estado as string) ||
        !Array.isArray(plan.items)
      )
        throw new Error("plan no verificable");
    } catch {
      throw new Problem(
        409,
        "HISTORY_LOCKED",
        `No se puede cambiar el plan del ciclo ${ciclo}: la foto no permite acreditar el impacto.`,
        { plan: "Bloque de plan ilegible en la foto de cierre." },
        {
          cierres: closedWindowsForCycle(db, ciclo).map(
            ({ ciclo: id, version, inicio, fin }) => ({
              ciclo: id,
              version,
              inicio,
              fin,
            }),
          ),
        },
      );
    }
  }
}

/**
 * T2 live-plan guard: once a cycle is closed, changing its plan keeps the
 * frozen photo intact but needs an explicit motive/fingerprint review (already
 * provided by the plan flow) and a verifiable captured plan block.
 */
export function assertPlanClosureReview(
  db: Database,
  ciclo: string,
  hasChanges: boolean,
  motive: unknown,
  action: string,
): ClosedWindow[] {
  const windows = closedWindowsForCycle(db, ciclo);
  if (!windows.length) return [];
  if (!hasChanges) return windows;
  if (
    typeof motive !== "string" ||
    !motive.trim() ||
    motive.length > 2000 ||
    /[\u0000-\u001f\u007f]/.test(motive)
  )
    throw new Problem(
      422,
      "VALIDATION",
      `Indica el motivo de ${action}; el ciclo está cerrado.`,
      { motivo: "Motivo obligatorio para cambiar el plan de un ciclo cerrado." },
      {
        cierres: windows.map(({ ciclo: id, version, inicio, fin }) => ({
          ciclo: id,
          version,
          inicio,
          fin,
        })),
      },
    );
  assertPlanPhotosVerifiable(db, ciclo);
  return windows;
}

/**
 * T2 Revisión Comida guard. Modifying, annulling or linking an auxiliary fact
 * whose date falls inside a closed window keeps the photo intact but needs a
 * motive/audit review and a readable `auxiliares` block to credit the impact.
 * Creation is not guarded here because a new row does not alter a stored photo;
 * that gap is documented in the DEV-06 matrix.
 */
export function assertRevisionComidaClosureImpact(
  db: Database,
  dates: readonly (string | null | undefined)[],
  hasChanges: boolean,
  motive: unknown,
  action: string,
): ClosedWindow[] {
  const windows = closedWindowsForDates(db, dates);
  if (!windows.length) return [];
  if (!hasChanges) return windows;
  if (
    typeof motive !== "string" ||
    !motive.trim() ||
    motive.length > 2000 ||
    /[\u0000-\u001f\u007f]/.test(motive)
  )
    throw new Problem(
      422,
      "VALIDATION",
      `Indica el motivo de ${action}; la operación pertenece a una ventana cerrada.`,
      { motivo: "Motivo obligatorio para cambiar Revisión Comida tras un cierre." },
      {
        cierres: windows.map(({ ciclo, version, inicio, fin }) => ({
          ciclo,
          version,
          inicio,
          fin,
        })),
      },
    );
  if (!hasTable(db, "fotos_cierre")) return windows;
  for (const window of windows) {
    const row = db
      .query(
        `SELECT f.auxiliares FROM cierres c JOIN fotos_cierre f
          ON f.ciclo=c.ciclo AND f.version=c.version
         WHERE c.ciclo=? AND c.version=?`,
      )
      .get(window.ciclo, window.version) as { auxiliares: string } | null;
    try {
      const aux = JSON.parse(row?.auxiliares ?? "");
      const e35 =
        aux && typeof aux === "object"
          ? (aux as { e35?: unknown }).e35
          : undefined;
      if (
        !e35 ||
        typeof e35 !== "object" ||
        typeof (e35 as { verificable?: unknown }).verificable !== "boolean" ||
        !("huella" in (e35 as object))
      )
        throw new Error("auxiliares no verificables");
    } catch {
      throw new Problem(
        409,
        "HISTORY_LOCKED",
        `No se puede ${action}: la foto del ciclo ${window.ciclo} no permite acreditar el impacto sobre Revisión Comida.`,
        { auxiliares: "Bloque auxiliar ilegible en la foto de cierre." },
        {
          cierres: windows.map(({ ciclo, version, inicio, fin }) => ({
            ciclo,
            version,
            inicio,
            fin,
          })),
        },
      );
    }
  }
  return windows;
}


/**
 * Creation of a new investment cash account would add a line to the account
 * breakdown of every existing photo, so it is locked while a close exists.
 * Other Saldos (movements, terminal, investment portfolio without operations)
 * do not alter the captured cash breakdown and remain creatable.
 */
export function assertSaldoCreationWritable(
  db: Database,
  saldo: { tipo: string; control: string },
) {
  if (!hasClosures(db)) return;
  if (!isInvestmentCash(saldo)) return;
  throw new Problem(
    409,
    "HISTORY_LOCKED",
    "No se puede crear una cuenta de efectivo de inversión mientras existan cierres: cambiaría el desglose de las fotos.",
    { tipo: "Cuenta de efectivo de inversión bloqueada por cierre." },
    {
      cierres: closedWindows(db).map(({ ciclo, version, inicio, fin }) => ({
        ciclo,
        version,
        inicio,
        fin,
      })),
    },
  );
}

/**
 * T2 classification guard: economic changes (hierarchy/attribution) after a
 * close must go through the existing preview + fingerprint + motive + audit
 * flow. Name-only changes stay allowed (T3). This hook only marks the impact as
 * used; `updateClassification` remains the decision point.
 */
export function classificationClosureImpact(
  db: Database,
  economic: readonly string[],
) {
  return economic.length > 0 && hasClosures(db);
}
