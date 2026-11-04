import type { Database } from "bun:sqlite";
import { Problem } from "./problem";

/**
 * E4.9 closure guards shared by the real write paths.
 *
 * T1 — facts and windows: a date inside a closed `[inicio, fin]` cannot be
 * created, moved into/out of or annulled; a closed cycle cannot change its
 * `inicio`, derived `fin` or S0.
 * T2 — attributes that change the numbers already captured by a photo:
 * `tipo`/`control` decide whether a Saldo is part of the investment snapshot
 * and `apertura` changes its cash; economic classification changes require the
 * existing impact/motive/audit review flow (they are not hard-blocked).
 * T3 — names/labels keep working; the photo stores ID + revision.
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
 * T1 date lock. Throws 409 `HISTORY_LOCKED` when any date belongs to a closed
 * window. The response exposes only the closure identity (cycle/version and
 * window), never financial values.
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

function capturedCashAccount(db: Database, saldo: string) {
  if (!hasTable(db, "fotos_cierre")) return false;
  const rows = db
    .query("SELECT inversion FROM fotos_cierre")
    .all() as { inversion: string }[];
  return rows.some((row) => {
    try {
      const photo = JSON.parse(row.inversion) as {
        cuentas?: { saldo?: unknown }[];
      };
      return (
        Array.isArray(photo?.cuentas) &&
        photo.cuentas.some((account) => account?.saldo === saldo)
      );
    } catch {
      return false;
    }
  });
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
