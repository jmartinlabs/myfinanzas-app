import type { Database } from "bun:sqlite";
import { civil, getCycle } from "./ciclos";
import { closedWindows } from "./e49-guards";
import { fingerprint } from "./movement-ledger";
import { Problem } from "./problem";
import {
  readRepartoPlan,
  type RepartoPlanSource,
} from "./reparto-plan-source";
import { decimal, money } from "./saldos";
import { spanishToday } from "./movimientos";
import { crearTransferenciaPendiente } from "./transferencias-pendientes";

/**
 * SPEC36 — increments 2 and 3: monthly assisted distribution (Reparto).
 *
 * The Reparto is an operational preparation. It never moves money, creates
 * Movimientos, writes financial tables, changes E2.3/D′ figures or prorates the
 * annual plan. It reads the published lines of the active plan source through
 * `readRepartoPlan` (amendment C) and delegates every pending insertion to the
 * increment-1 `crearTransferenciaPendiente` inside the generation transaction.
 *
 * Rules enforced here (SPEC36 §0.1, §0.2, §5–§9, §16):
 *  - one Reparto per Cycle (`repartos_ciclo_unico`), re-opening returns it;
 *  - every Reparto declares one plan source (`PlanCiclo`|`Dprima`) and it is
 *    immutable: sources are never mixed and never switched;
 *  - `Presupuesto` lines belong to `PlanCiclo`, `Partida` lines to `Dprima`;
 *    `Adicional` lines belong to both; exactly one reference per class;
 *  - a Presupuesto/Partida line derives its destination from its source and it
 *    is not editable;
 *  - one pending per line; several partial lines toward the same entity are
 *    valid because uniqueness is by line;
 *  - D8 applies to the active source entity (inactive Presupuesto for
 *    `PlanCiclo`, inactive Partida for `Dprima`) and to the destination Saldo:
 *    a historical line stays visible, but no new line and no pending is created
 *    for an inactive entity or an ineligible destination;
 *  - a closed Cycle blocks create/edit/add/exclude/generate; reading,
 *    cancelling pendings and completing remain available;
 *  - precierre only warns and never includes pendings in its photo;
 *  - strict completion: at least one pending, every included line has its
 *    pending and every pending is terminal. Excluded lines do not count.
 *
 * Idempotency reuses `transferencia_pendiente_attempts` with explicit
 * `reparto:*` operations so both flows share one mechanism. Generation owns a
 * single IMMEDIATE transaction, a SAVEPOINT per line and a full rollback when
 * any line fails (`409 GENERACION_INCOMPLETA`).
 */

const repartoStates = ["Borrador", "Generado", "Completado"] as const;
type RepartoEstado = (typeof repartoStates)[number];

const planSources = ["PlanCiclo", "Dprima"] as const;
const lineClasses = ["Presupuesto", "Adicional", "Partida"] as const;
type RepartoClase = (typeof lineClasses)[number];

type RepartoRow = {
  id: number;
  ciclo: string;
  fuente_plan: "PlanCiclo" | "Dprima";
  estado: RepartoEstado;
  origen_comun: string | null;
  revision: number;
  creado: string;
  actualizado: string;
};

type LineRow = {
  id: number;
  reparto: number;
  clase: RepartoClase;
  presupuesto: string | null;
  partida: string | null;
  origen: string | null;
  destino: string | null;
  importe: number | null;
  fecha_prevista: string;
  concepto: string | null;
  nota: string | null;
  incluida: number;
  motivo_exclusion: string | null;
  revision: number;
  creado: string;
  actualizado: string;
};

type SaldoRow = {
  id: string;
  nombre: string;
  tipo: string;
  control: string;
  estado: string;
};

type BudgetRow = {
  id: string;
  nombre: string;
  fuente: string;
  destino: string | null;
  estado: "Activo" | "Inactivo";
};

type PartidaRow = {
  id: string;
  nombre: string;
  estado: "Activa" | "Inactiva";
  padre_partida: string | null;
  fuente: string | null;
};

/** Published D′ monthly plan row for one root and Cycle (never recalculated). */
type MonthlyPlanRow = {
  fuente: "Gasto real" | "Aportación a saldo" | "No aplica";
  destino: string | null;
  revision: number;
};

type PendingRow = {
  id: number;
  estado: "Pendiente de realizar" | "Confirmada" | "Cancelada";
  reparto_linea: number | null;
  importe: number;
};

function identifier(value: unknown, field = "id"): number {
  const id =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : NaN;
  if (!Number.isSafeInteger(id) || id < 1)
    throw new Problem(422, "VALIDATION", "Identificador inválido.", {
      [field]: "Indica un identificador positivo.",
    });
  return id;
}

function civilField(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Problem(422, "VALIDATION", "Indica una fecha civil válida.", {
      [field]: "Fecha civil válida (AAAA-MM-DD).",
    });
  try {
    return civil(value);
  } catch {
    throw new Problem(422, "VALIDATION", "Indica una fecha civil válida.", {
      [field]: "Fecha civil válida (AAAA-MM-DD).",
    });
  }
}

function text(value: unknown, field: string, max: number): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      [field]: `Texto válido, máximo ${max} caracteres.`,
    });
  return value;
}

function optionalText(value: unknown, field: string, max: number): string {
  return text(value, field, max);
}

/**
 * SQLite stores cents as a signed 64-bit integer, but the current service
 * contract still converts them to a JavaScript number before writing
 * (`Number(cents)`). Values above `Number.MAX_SAFE_INTEGER` would be rounded
 * silently, so they are rejected instead of stored altered. Removing this
 * ceiling requires moving the whole chain (API, wire, UI) to bigint or string
 * amounts and is intentionally out of this increment.
 */
const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER);

function amount(value: unknown, field = "importe"): { cents: bigint; text: string } {
  if (typeof value !== "string" || !value)
    throw new Problem(
      422,
      "VALIDATION",
      "Indica un importe EUR exacto mayor que cero, hasta dos decimales.",
      { [field]: "Importe exacto en euros con céntimos." },
    );
  try {
    const value_ = money(value);
    if (value_ === null || value_ <= 0n) throw new Error("non-positive");
    if (value_ > MAX_SAFE_CENTS) throw new Error("out-of-safe-range");
    return { cents: value_, text: decimal(value_)! };
  } catch {
    throw new Problem(
      422,
      "VALIDATION",
      "Indica un importe EUR exacto mayor que cero, hasta dos decimales y dentro del rango admitido.",
      { [field]: "Importe exacto en euros con céntimos, hasta 90.071.992.547.409,91 €." },
    );
  }
}

function saldoRow(db: Database, id: string): SaldoRow | null {
  return (
    (db
      .query("SELECT id,nombre,tipo,control,estado FROM saldos WHERE id=?")
      .get(id) as SaldoRow | null) ?? null
  );
}

function ineligibleReason(db: Database, id: string): string | null {
  const row = saldoRow(db, id);
  if (!row) return "SALDO_NO_DISPONIBLE";
  if (row.id === "S000") return "SALDO_NO_ELEGIBLE";
  if (row.tipo === "Exterior" || row.control === "Exterior")
    return "SALDO_NO_ELEGIBLE";
  if (row.control === "Manual") return "SALDO_NO_ELEGIBLE";
  if (row.estado !== "Activa") return "SALDO_NO_ELEGIBLE";
  return null;
}

function assertEligible(db: Database, id: unknown, field: string): string {
  if (typeof id !== "string" || !id)
    throw new Problem(422, "VALIDATION", "Saldo inválido.", {
      [field]: "Selecciona un Saldo interno activo.",
    });
  const reason = ineligibleReason(db, id);
  if (reason)
    throw new Problem(
      422,
      "SALDO_NO_ELEGIBLE",
      "El Saldo no es elegible para el reparto.",
      { [field]: "Selecciona un Saldo interno activo y operativo." },
      { motivo: reason },
    );
  return id;
}

function budgetRow(db: Database, id: string): BudgetRow | null {
  return (
    (db
      .query("SELECT id,nombre,fuente,destino,estado FROM presupuestos WHERE id=?")
      .get(id) as BudgetRow | null) ?? null
  );
}

function partidaRow(db: Database, id: string): PartidaRow | null {
  return (
    (db
      .query(
        "SELECT id,nombre,estado,padre_partida,fuente FROM partidas WHERE id=?",
      )
      .get(id) as PartidaRow | null) ?? null
  );
}

/**
 * Published D′ monthly plan row. It is read as-is: Del mes, Ejecutado and
 * Pendiente are never recomputed here (amendment C).
 */
function monthlyPlanRow(
  db: Database,
  ciclo: string,
  raiz: string,
): MonthlyPlanRow | null {
  return (
    (db
      .query(
        "SELECT fuente,destino,revision FROM dprima_plan_mensual WHERE ciclo=? AND raiz=?",
      )
      .get(ciclo, raiz) as MonthlyPlanRow | null) ?? null
  );
}

function planSource(value: unknown, field = "fuentePlan"): RepartoPlanSource {
  if (typeof value !== "string" || !(planSources as readonly string[]).includes(value))
    throw new Problem(
      422,
      "VALIDATION",
      "Indica el origen del plan del reparto.",
      { [field]: "Origen PlanCiclo o Dprima." },
    );
  return value as RepartoPlanSource;
}

function cycleOfReparto(db: Database, reparto: number): string {
  return (
    db.query("SELECT ciclo FROM repartos WHERE id=?").get(reparto) as {
      ciclo: string;
    }
  ).ciclo;
}

function requireCycle(db: Database, value: unknown) {
  if (typeof value !== "string" || !value)
    throw new Problem(422, "VALIDATION", "ID de ciclo inválido.");
  return getCycle(db, value).ciclo;
}

function cycleClosed(db: Database, ciclo: string) {
  return closedWindows(db).some((window) => window.ciclo === ciclo);
}

function assertOpenCycle(db: Database, ciclo: string) {
  if (cycleClosed(db, ciclo))
    throw new Problem(
      409,
      "CICLO_CERRADO",
      "El Ciclo tiene un cierre financiero; no admite cambios de reparto.",
      { ciclo },
    );
}

function repartoRow(db: Database, id: number): RepartoRow | null {
  return (
    (db
      .query("SELECT * FROM repartos WHERE id=?")
      .get(id) as RepartoRow | null) ?? null
  );
}

function repartoByCycle(db: Database, ciclo: string): RepartoRow | null {
  return (
    (db
      .query("SELECT * FROM repartos WHERE ciclo=?")
      .get(ciclo) as RepartoRow | null) ?? null
  );
}

function lineRows(db: Database, reparto: number): LineRow[] {
  return db
    .query("SELECT * FROM reparto_lineas WHERE reparto=? ORDER BY id")
    .all(reparto) as LineRow[];
}

function lineRow(db: Database, reparto: number, id: number): LineRow | null {
  return (
    (db
      .query("SELECT * FROM reparto_lineas WHERE id=? AND reparto=?")
      .get(id, reparto) as LineRow | null) ?? null
  );
}

function pendingRows(db: Database, reparto: number): PendingRow[] {
  return db
    .query(
      `SELECT p.id,p.estado,p.reparto_linea,p.importe
       FROM transferencia_pendiente p
       JOIN reparto_lineas l ON l.id=p.reparto_linea
       WHERE l.reparto=? ORDER BY p.id`,
    )
    .all(reparto) as PendingRow[];
}

function snapshot(row: RepartoRow) {
  return {
    id: row.id,
    ciclo: row.ciclo,
    fuentePlan: row.fuente_plan,
    estado: row.estado,
    origenComun: row.origen_comun,
    revision: row.revision,
  };
}

function audit(
  db: Database,
  row: RepartoRow,
  accion: "alta" | "actualizacion" | "generacion" | "completado",
  before: ReturnType<typeof snapshot> | null,
  now: number,
) {
  db.run(
    "INSERT INTO reparto_audit(reparto,revision,accion,anterior,posterior,instante,actor) VALUES(?,?,?,?,?,?,'usuario-unico')",
    [
      row.id,
      row.revision,
      accion,
      before ? JSON.stringify(before) : null,
      JSON.stringify(snapshot(row)),
      new Date(now).toISOString(),
    ],
  );
}

/**
 * Line-level trace. `reparto_audit` keeps covering header transitions only;
 * draft-line changes are recorded in the generic `audit` table under
 * `reparto-linea:{id}`, reusing the existing audit infrastructure without a
 * new table or migration.
 */
function auditLinea(
  db: Database,
  line: LineRow,
  accion: "alta" | "edición" | "exclusión",
  revisionPrevia: number,
  campos: Record<string, unknown>,
  now: number,
  motivo: string | null = null,
) {
  db.run(
    `INSERT INTO audit(
       entidad,accion,revision,campos,instante,revision_previa,actor,motivo
     ) VALUES(?,?,?,?,?,?,'usuario-unico',?)`,
    [
      `reparto-linea:${line.id}`,
      accion,
      line.revision,
      JSON.stringify(campos),
      new Date(now).toISOString(),
      revisionPrevia,
      motivo,
    ],
  );
}

function lineSnapshot(line: LineRow) {
  return {
    id: line.id,
    reparto: line.reparto,
    clase: line.clase,
    presupuesto: line.presupuesto,
    partida: line.partida,
    origen: line.origen,
    destino: line.destino,
    importe: decimal(line.importe === null ? null : String(line.importe)),
    fechaPrevista: line.fecha_prevista,
    concepto: line.concepto,
    nota: line.nota,
    incluida: line.incluida === 1,
    motivoExclusion: line.motivo_exclusion,
    revision: line.revision,
  };
}

function requireRevision(current: number, value: unknown, what: "reparto" | "linea") {
  if (!Number.isSafeInteger(value) || value !== current)
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      `El ${what === "reparto" ? "reparto" : "línea del reparto"} ha cambiado. Revisa y vuelve a intentarlo.`,
    );
}

function partidaDto(db: Database, ciclo: string, row: PartidaRow) {
  const plan = monthlyPlanRow(db, ciclo, row.id);
  return {
    id: row.id,
    nombre: row.nombre,
    estado: row.estado,
    raiz: row.padre_partida === null,
    /** Fuente publicada por el origen activo para este Ciclo. */
    fuente: plan?.fuente ?? row.fuente ?? null,
    /** Destino publicado por el origen; nunca editable en el reparto. */
    destino: plan?.destino ?? null,
  };
}

function lineDto(db: Database, row: LineRow, pending?: PendingRow) {
  const budget = row.presupuesto ? budgetRow(db, row.presupuesto) : null;
  const partida =
    row.clase === "Partida" && row.partida
      ? partidaRow(db, row.partida)
      : null;
  const ciclo = row.clase === "Partida" ? cycleOfReparto(db, row.reparto) : null;
  const pendiente =
    pending ??
    ((db
      .query(
        "SELECT id,estado,reparto_linea,importe FROM transferencia_pendiente WHERE reparto_linea=?",
      )
      .get(row.id) as PendingRow | null) ??
      undefined);
  const avisos: string[] = [];
  if (row.clase === "Presupuesto") {
    if (!budget) avisos.push("PRESUPUESTO_NO_DISPONIBLE");
    else {
      if (budget.estado !== "Activo") avisos.push("PRESUPUESTO_INACTIVO");
      if (budget.fuente !== "Aportación a saldo")
        avisos.push("FUENTE_NO_APORTACION");
      if (budget.destino !== row.destino) avisos.push("PRESUPUESTO_DESTINO");
    }
  }
  if (row.clase === "Partida") {
    if (!partida) avisos.push("PARTIDA_NO_DISPONIBLE");
    else {
      if (partida.estado !== "Activa") avisos.push("PARTIDA_INACTIVA");
      const plan = monthlyPlanRow(db, ciclo!, partida.id);
      if (!plan) avisos.push("SIN_PLAN");
      else {
        if (plan.fuente !== "Aportación a saldo")
          avisos.push("FUENTE_NO_APORTACION");
        if (plan.destino !== row.destino) avisos.push("PARTIDA_DESTINO");
      }
    }
  }
  if (row.origen && ineligibleReason(db, row.origen))
    avisos.push("SALDO_ORIGEN_NO_ELEGIBLE");
  if (row.destino && ineligibleReason(db, row.destino))
    avisos.push("SALDO_DESTINO_NO_ELEGIBLE");
  return {
    id: row.id,
    reparto: row.reparto,
    clase: row.clase,
    presupuesto: budget,
    partida: partida && ciclo ? partidaDto(db, ciclo, partida) : null,
    origen: row.origen ? saldoRow(db, row.origen) : null,
    destino: row.destino ? saldoRow(db, row.destino) : null,
    importe: decimal(row.importe === null ? null : String(row.importe)),
    fechaPrevista: row.fecha_prevista,
    concepto: row.concepto,
    nota: row.nota,
    incluida: row.incluida === 1,
    motivoExclusion: row.motivo_exclusion,
    revision: row.revision,
    pendiente: pendiente
      ? { id: pendiente.id, estado: pendiente.estado, importe: decimal(String(pendiente.importe)) }
      : null,
    avisos,
    puedeGenerarse:
      row.incluida === 1 && !pendiente && avisos.length === 0,
  };
}

function completionState(lines: LineRow[], pendings: PendingRow[]) {
  const motivos: { code: string; lineas?: number[]; pendientes?: number[] }[] = [];
  if (pendings.length === 0) motivos.push({ code: "SIN_PENDIENTES" });
  const withPending = new Set(
    pendings.map((pending) => pending.reparto_linea).filter((id): id is number => id !== null),
  );
  const missing = lines
    .filter((line) => line.incluida === 1 && !withPending.has(line.id))
    .map((line) => line.id);
  if (missing.length) motivos.push({ code: "LINEA_SIN_PENDIENTE", lineas: missing });
  const open = pendings
    .filter((pending) => pending.estado === "Pendiente de realizar")
    .map((pending) => pending.id);
  if (open.length) motivos.push({ code: "PENDIENTE_NO_TERMINAL", pendientes: open });
  return { puedeCompletar: motivos.length === 0, motivosNoCompletar: motivos };
}

function repartoDto(db: Database, row: RepartoRow) {
  const lines = lineRows(db, row.id);
  const pendings = pendingRows(db, row.id);
  const byLine = new Map(
    pendings
      .filter((pending) => pending.reparto_linea !== null)
      .map((pending) => [pending.reparto_linea!, pending]),
  );
  const items = lines.map((line) => lineDto(db, line, byLine.get(line.id)));
  const completion = completionState(lines, pendings);
  return {
    id: row.id,
    ciclo: row.ciclo,
    fuentePlan: row.fuente_plan,
    estado: row.estado,
    origenComun: row.origen_comun ? saldoRow(db, row.origen_comun) : null,
    revision: row.revision,
    creado: row.creado,
    actualizado: row.actualizado,
    lineas: items,
    resumen: {
      lineas: items.length,
      incluidas: items.filter((line) => line.incluida).length,
      excluidas: items.filter((line) => !line.incluida).length,
      conPendiente: items.filter((line) => line.pendiente).length,
      creados: pendings.length,
      pendientesDeRealizar: pendings.filter(
        (pending) => pending.estado === "Pendiente de realizar",
      ).length,
      confirmadas: pendings.filter((pending) => pending.estado === "Confirmada")
        .length,
      canceladas: pendings.filter((pending) => pending.estado === "Cancelada")
        .length,
    },
    cicloCerrado: cycleClosed(db, row.ciclo),
    puedeEditar: row.estado === "Borrador" && !cycleClosed(db, row.ciclo),
    puedeAnadirLineas:
      row.estado !== "Completado" && !cycleClosed(db, row.ciclo),
    puedeGenerar:
      row.estado !== "Completado" &&
      !cycleClosed(db, row.ciclo) &&
      items.some((line) => line.puedeGenerarse),
    ...completion,
  };
}

/* ------------------------------------------------------------------ */
/* Shared idempotency wrapper (same attempts table as increment 1).     */
/* ------------------------------------------------------------------ */

function conIntento<T>(
  db: Database,
  operation: string,
  payload: Record<string, unknown>,
  key: string,
  now: number,
  run: () => T,
): T {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  const hash = fingerprint([
    operation,
    Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)),
  ]);
  return db
    .transaction(() => {
      db.run("DELETE FROM transferencia_pendiente_attempts WHERE expires<?", [now]);
      const retry = db
        .query(
          "SELECT hash,response FROM transferencia_pendiente_attempts WHERE operacion=? AND key=?",
        )
        .get(operation, key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as T;
      }
      const result = run();
      db.run(
        "INSERT INTO transferencia_pendiente_attempts(operacion,key,hash,response,expires) VALUES(?,?,?,?,?)",
        [operation, key, hash, JSON.stringify(result), now + 86400000],
      );
      return result;
    })
    .immediate();
}

/* ------------------------------------------------------------------ */
/* Creation and reads.                                                  */
/* ------------------------------------------------------------------ */

export function crearReparto(
  db: Database,
  cicloValue: unknown,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  for (const name of Object.keys(body))
    if (!["origenComun", "fuentePlan"].includes(name))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`);
  // The intent key is validated before the body: R-09 fixes that precedence even
  // though `conIntento` checks it again inside the transaction.
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  if (body.fuentePlan === undefined)
    throw new Problem(
      422,
      "VALIDATION",
      "Indica el origen del plan del reparto.",
      { fuentePlan: "Origen obligatorio: PlanCiclo o Dprima." },
    );
  const fuentePlan = planSource(body.fuentePlan);
  const ciclo = requireCycle(db, cicloValue);
  return conIntento(
    db,
    "reparto:crear",
    { ciclo: ciclo.id, ...body, fuentePlan },
    key,
    now,
    () => {
      const existing = repartoByCycle(db, ciclo.id);
      if (existing) {
        // One plan source per Cycle and it is never switched (AC-26).
        if (existing.fuente_plan !== fuentePlan)
          throw new Problem(
            409,
            "FUENTE_PLAN_INMUTABLE",
            "El reparto del Ciclo ya declaró otro origen de plan; no se cambia.",
            {},
            { fuentePlan: existing.fuente_plan },
          );
        return { creado: false, reparto: repartoDto(db, existing) };
      }
      assertOpenCycle(db, ciclo.id);
      let origenComun: string | null = null;
      if (body.origenComun !== undefined && body.origenComun !== null)
        origenComun = assertEligible(db, body.origenComun, "origenComun");
      const time = new Date(now).toISOString();
      const result = db.run(
        "INSERT INTO repartos(ciclo,fuente_plan,estado,origen_comun,revision,creado,actualizado) VALUES(?,?,'Borrador',?,1,?,?)",
        [ciclo.id, fuentePlan, origenComun, time, time],
      );
      const created = repartoRow(db, Number(result.lastInsertRowid))!;
      audit(db, created, "alta", null, now);
      return { creado: true, reparto: repartoDto(db, created) };
    },
  );
}

export function getRepartoPorCiclo(
  db: Database,
  cicloValue: unknown,
  _now = Date.now(),
) {
  const ciclo = requireCycle(db, cicloValue);
  const row = repartoByCycle(db, ciclo.id);
  if (!row)
    throw new Problem(404, "NOT_FOUND", "El Ciclo no tiene reparto.");
  return { reparto: repartoDto(db, row) };
}

function aggregateCents(value: string): bigint {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

export function previewReparto(
  db: Database,
  cicloValue: unknown,
  now = Date.now(),
  sourceValue?: unknown,
) {
  return db.transaction(() => {
    const ciclo = requireCycle(db, cicloValue);
    const existing = repartoByCycle(db, ciclo.id);
    const requested =
      sourceValue === undefined || sourceValue === null || sourceValue === ""
        ? null
        : planSource(sourceValue);
    if (existing && requested && requested !== existing.fuente_plan)
      throw new Problem(
        409,
        "FUENTE_PLAN_INMUTABLE",
        "El reparto del Ciclo ya declaró otro origen de plan; no se cambia.",
        {},
        { fuentePlan: existing.fuente_plan },
      );
    /**
     * Before the reparto exists the preview needs an explicit source. Without
     * one it reads the operational legacy source (`PlanCiclo`): D′ is never
     * activated implicitly (SPEC36 §0.1).
     */
    const fuentePlan: RepartoPlanSource = existing
      ? existing.fuente_plan
      : (requested ?? "PlanCiclo");
    const plan = readRepartoPlan(db, ciclo.id, fuentePlan, now);
    const existingDto = existing ? repartoDto(db, existing) : null;
    const periodReason =
      ciclo.inicio > spanishToday(now)
        ? "Ciclo no iniciado"
        : !(ciclo.fin ?? ciclo.corte)
          ? "Periodo/corte no verificable"
          : null;
    const dprima = fuentePlan === "Dprima";
    const items = plan.lines.map((line) => {
      const entidad = {
        id: line.referencia,
        nombre: line.nombre,
        fuente: line.fuente,
        destino: line.destino,
        estado:
          line.entidadEstado === null
            ? null
            : line.entidadEstado === "Activa"
              ? dprima
                ? "Activa"
                : "Activo"
              : dprima
                ? "Inactiva"
                : "Inactivo",
      };
      const pendiente = line.pendiente;
      const importeSugerido =
        line.fuente === "Aportación a saldo" &&
        pendiente !== null &&
        aggregateCents(pendiente) > 0n
          ? pendiente
          : null;
      const motivos: string[] = [];
      if (line.fuente !== "Aportación a saldo") {
        if (line.fuente === "Gasto real") motivos.push("MANTENER_EN_ORIGEN");
        else motivos.push("NO_APLICA");
      } else {
        if (line.entidadEstado !== "Activa")
          motivos.push(dprima ? "PARTIDA_INACTIVA" : "PRESUPUESTO_INACTIVO");
        if (!line.destino) motivos.push("SIN_DESTINO");
        else if (ineligibleReason(db, line.destino))
          motivos.push("SALDO_DESTINO_NO_ELEGIBLE");
        if (line.atribucionAmbigua) motivos.push("ATRIBUCION_AMBIGUA");
        if (!importeSugerido) motivos.push("SIN_PENDIENTE_VERIFICABLE");
      }
      const lineasExistentes = existing
        ? (db
            .query(
              // Static, server-owned column per class; no user input.
              `SELECT id, CAST(importe AS TEXT) importe FROM reparto_lineas
               WHERE reparto=? AND clase=? AND ${dprima ? "partida" : "presupuesto"}=?
                 AND incluida=1 ORDER BY id`,
            )
            .all(existing.id, dprima ? "Partida" : "Presupuesto", line.referencia) as {
            id: number;
            importe: string;
          }[])
        : [];
      const acumulado = lineasExistentes.reduce(
        (total, existingLine) => total + BigInt(existingLine.importe),
        0n,
      );
      const restante =
        pendiente === null ? null : aggregateCents(pendiente) - acumulado;
      return {
        clase: dprima ? "Partida" : "Presupuesto",
        referencia: line.referencia,
        presupuesto: dprima ? null : entidad,
        partida: dprima ? entidad : null,
        delMes: line.delMes,
        ejecutado: line.ejecutado,
        pendiente,
        estado: line.estado,
        motivoE2: line.motivo,
        sinPlanificar: line.sinPlanificar,
        entidadEstado: line.entidadEstado,
        importeSugerido,
        propuestaAutomatica:
          importeSugerido !== null && motivos.length === 0,
        elegible:
          line.entidadEstado === "Activa" &&
          line.fuente === "Aportación a saldo" &&
          importeSugerido !== null &&
          line.destino !== null &&
          !ineligibleReason(db, line.destino) &&
          !line.atribucionAmbigua,
        motivos,
        lineasExistentes,
        efectoAcumulado: decimal(acumulado)!,
        restante: restante === null ? null : decimal(restante),
        excedePendiente: pendiente !== null && restante !== null && restante < 0n,
      };
    });
    // A Cycle without published lines has no plan: no invented lines/amounts.
    const sinPlan = !db
      .query(
        `SELECT 1 FROM ${dprima ? "dprima_plan_mensual" : "cycle_plan_lines"} WHERE ciclo=? LIMIT 1`,
      )
      .get(ciclo.id);
    return {
      ciclo,
      fuentePlan,
      reparto: existingDto,
      revision: plan.revision,
      // Opaque revision of the previewed data (adapter output, not recalculated).
      contextRevision: fingerprint([
        fuentePlan,
        plan.revision,
        plan.lines.map((line) => [
          line.referencia,
          line.delMes,
          line.ejecutado,
          line.pendiente,
          line.estado,
          line.motivo,
          line.entidadEstado,
        ]),
      ]),
      sinPlan,
      periodo: {
        inicio: ciclo.inicio,
        fin: ciclo.fin,
        corte: ciclo.corte,
        motivo: periodReason,
      },
      origenComunSugerido: null,
      origenComunMotivo:
        "Sin candidato único verificable de cuenta receptora; selecciona el Saldo de origen.",
      items,
      avisos: existing ? [] : ["SIN_REPARTO"],
    };
  })();
}

/* ------------------------------------------------------------------ */
/* Draft mutations.                                                     */
/* ------------------------------------------------------------------ */

export function actualizarReparto(
  db: Database,
  idValue: unknown,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  const id = identifier(idValue);
  for (const name of Object.keys(body))
    if (!["revision", "origenComun", "fuentePlan"].includes(name))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`);
  return conIntento(db, "reparto:actualizar", { id, ...body }, key, now, () => {
    const row = repartoRow(db, id);
    if (!row) throw new Problem(404, "NOT_FOUND", "Reparto no encontrado.");
    // The plan source is decided when the reparto is created and never changes
    // (SPEC36 §0.1, AC-26), even while it is still a Borrador without lines.
    if (
      body.fuentePlan !== undefined &&
      planSource(body.fuentePlan) !== row.fuente_plan
    )
      throw new Problem(
        409,
        "FUENTE_PLAN_INMUTABLE",
        "El origen del plan del reparto no se cambia después de crearlo.",
        {},
        { fuentePlan: row.fuente_plan },
      );
    requireRevision(row.revision, body.revision, "reparto");
    assertOpenCycle(db, row.ciclo);
    if (row.estado !== "Borrador")
      throw new Problem(
        409,
        "STATE_CONFLICT",
        "Solo un reparto en Borrador admite cambios de origen común.",
      );
    const before = snapshot(row);
    let origenComun: string | null = row.origen_comun;
    if (body.origenComun === null) origenComun = null;
    else if (body.origenComun !== undefined)
      origenComun = assertEligible(db, body.origenComun, "origenComun");
    if (origenComun === row.origen_comun)
      throw new Problem(422, "VALIDATION", "No hay cambios que guardar.");
    db.run(
      "UPDATE repartos SET origen_comun=?,revision=revision+1,actualizado=? WHERE id=? AND revision=?",
      [origenComun, new Date(now).toISOString(), id, row.revision],
    );
    const after = repartoRow(db, id)!;
    audit(db, after, "actualizacion", before, now);
    return { reparto: repartoDto(db, after) };
  });
}

function presupuestoLineInput(db: Database, body: Record<string, unknown>) {
  if (body.presupuesto === undefined)
    throw new Problem(422, "VALIDATION", "Indica el Presupuesto de la línea.", {
      presupuesto: "Identificador obligatorio.",
    });
  if (typeof body.presupuesto !== "string" || !body.presupuesto)
    throw new Problem(422, "VALIDATION", "Presupuesto inválido.");
  const budget = budgetRow(db, body.presupuesto);
  if (!budget)
    throw new Problem(
      422,
      "PRESUPUESTO_NO_DISPONIBLE",
      "El Presupuesto de la línea no está disponible.",
    );
  if (budget.estado !== "Activo")
    throw new Problem(
      422,
      "PRESUPUESTO_INACTIVO",
      "No se crean líneas nuevas para un Presupuesto inactivo.",
      { presupuesto: "Reactiva el Presupuesto o usa una línea adicional." },
    );
  if (budget.fuente !== "Aportación a saldo")
    throw new Problem(
      422,
      "FUENTE_NO_APORTACION",
      "Solo una Aportación a saldo genera una línea de Presupuesto.",
      { presupuesto: "La fuente debe ser Aportación a saldo." },
    );
  if (!budget.destino)
    throw new Problem(
      422,
      "PRESUPUESTO_DESTINO",
      "El Presupuesto no tiene destino configurado.",
    );
  if (body.destino !== undefined && body.destino !== budget.destino)
    throw new Problem(
      422,
      "PRESUPUESTO_DESTINO",
      "El destino procede del Presupuesto y no es editable.",
      { destino: "El destino se deriva del Presupuesto." },
    );
  return budget;
}

/**
 * A `Partida` line belongs to a `Dprima` reparto. Its destination and source
 * are the ones already published by the D′ monthly plan for that root and
 * Cycle: they are read, never recomputed, and never editable (SPEC36 §4, §5.1,
 * §16.1). D8: an inactive Partida receives no new line.
 */
function partidaLineInput(
  db: Database,
  ciclo: string,
  body: Record<string, unknown>,
) {
  if (body.partida === undefined)
    throw new Problem(422, "VALIDATION", "Indica la Partida de la línea.", {
      partida: "Identificador obligatorio.",
    });
  if (typeof body.partida !== "string" || !body.partida)
    throw new Problem(422, "VALIDATION", "Partida inválida.");
  const partida = partidaRow(db, body.partida);
  if (!partida)
    throw new Problem(
      422,
      "PARTIDA_NO_DISPONIBLE",
      "La Partida de la línea no está disponible.",
    );
  if (partida.padre_partida !== null)
    throw new Problem(
      422,
      "PARTIDA_NO_RAIZ",
      "Solo una Partida raíz genera una línea de reparto.",
      { partida: "Selecciona una Partida raíz." },
    );
  if (partida.estado !== "Activa")
    throw new Problem(
      422,
      "PARTIDA_INACTIVA",
      "No se crean líneas nuevas para una Partida inactiva.",
      { partida: "Reactiva la Partida o usa una línea adicional." },
    );
  const plan = monthlyPlanRow(db, ciclo, partida.id);
  if (!plan)
    throw new Problem(
      422,
      "SIN_PLAN",
      "La Partida no tiene línea en el Plan mensual D′ de este Ciclo.",
      { partida: "Informa el Plan mensual D′ antes de repartir." },
    );
  if (plan.fuente !== "Aportación a saldo")
    throw new Problem(
      422,
      "FUENTE_NO_APORTACION",
      "Solo una Aportación a saldo genera una línea de Partida.",
      { partida: "La fuente del Plan mensual D′ debe ser Aportación a saldo." },
    );
  if (!plan.destino)
    throw new Problem(
      422,
      "SIN_DESTINO",
      "La línea del Plan mensual D′ no tiene destino configurado.",
      { destino: "Configura el destino en el Plan mensual D′." },
    );
  if (body.destino !== undefined && body.destino !== plan.destino)
    throw new Problem(
      422,
      "PARTIDA_DESTINO",
      "El destino procede del Plan mensual D′ y no es editable.",
      { destino: "El destino se deriva de la Partida." },
    );
  return { id: partida.id, destino: plan.destino, fuente: plan.fuente };
}

function lineFields(
  db: Database,
  body: Record<string, unknown>,
  clase: RepartoClase,
  budget: BudgetRow | null,
  partida: { id: string; destino: string } | null,
) {
  const origen = assertEligible(db, body.origen, "origen");
  const destino =
    clase === "Presupuesto"
      ? assertEligible(db, budget!.destino, "destino")
      : clase === "Partida"
        ? assertEligible(db, partida!.destino, "destino")
        : assertEligible(db, body.destino, "destino");
  if (origen === destino)
    throw new Problem(422, "VALIDATION", "Origen y destino deben ser distintos.");
  const importe = amount(body.importe);
  if (body.fechaPrevista === undefined)
    throw new Problem(422, "VALIDATION", "Indica la fecha prevista.", {
      fechaPrevista: "Fecha prevista obligatoria.",
    });
  const fechaPrevista = civilField(body.fechaPrevista, "fechaPrevista");
  const concepto =
    body.concepto === undefined || body.concepto === null
      ? null
      : optionalText(body.concepto, "concepto", 2000);
  const nota =
    body.nota === undefined || body.nota === null
      ? null
      : optionalText(body.nota, "nota", 4000);
  return {
    origen,
    destino,
    importe: Number(importe.cents),
    fechaPrevista,
    concepto,
    nota,
  };
}

export function crearLineaReparto(
  db: Database,
  idValue: unknown,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  const id = identifier(idValue);
  for (const name of Object.keys(body))
    if (
      ![
        "clase",
        "presupuesto",
        "partida",
        "origen",
        "destino",
        "importe",
        "fechaPrevista",
        "concepto",
        "nota",
        "referencia",
      ].includes(name)
    )
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`);
  if (body.referencia !== undefined && body.referencia !== null && body.referencia !== "")
    throw new Problem(
      422,
      "VALIDATION",
      "Incremento 2 no admite Referencia en una línea adicional (D10).",
      { referencia: "La línea se confirma sin Referencia." },
    );
  if (
    body.clase !== undefined &&
    !(lineClasses as readonly unknown[]).includes(body.clase)
  )
    throw new Problem(422, "VALIDATION", "Clase de línea inválida.", {
      clase: "Presupuesto, Partida o Adicional.",
    });
  const clase: RepartoClase =
    body.clase === "Adicional"
      ? "Adicional"
      : body.clase === "Partida"
        ? "Partida"
        : body.clase === "Presupuesto"
          ? "Presupuesto"
          : body.partida !== undefined
            ? "Partida"
            : body.presupuesto !== undefined
              ? "Presupuesto"
              : "Adicional";
  if (
    clase === "Adicional" &&
    (body.presupuesto !== undefined || body.partida !== undefined)
  )
    throw new Problem(
      422,
      "VALIDATION",
      "Una línea adicional no referencia Presupuesto ni Partida.",
    );
  if (clase === "Presupuesto" && body.partida !== undefined)
    throw new Problem(
      422,
      "VALIDATION",
      "Una línea de Presupuesto no referencia Partida.",
    );
  if (clase === "Partida" && body.presupuesto !== undefined)
    throw new Problem(
      422,
      "VALIDATION",
      "Una línea de Partida no referencia Presupuesto.",
    );
  if (clase === "Presupuesto" && body.destino !== undefined && body.presupuesto === undefined)
    throw new Problem(422, "VALIDATION", "Indica el Presupuesto de la línea.");
  if (clase === "Partida" && body.destino !== undefined && body.partida === undefined)
    throw new Problem(422, "VALIDATION", "Indica la Partida de la línea.");
  return conIntento(
    db,
    "reparto:linea-alta",
    { reparto: id, ...body, clase },
    key,
    now,
    () => {
      const reparto = repartoRow(db, id);
      if (!reparto) throw new Problem(404, "NOT_FOUND", "Reparto no encontrado.");
      assertOpenCycle(db, reparto.ciclo);
      if (reparto.estado === "Completado")
        throw new Problem(
          409,
          "STATE_CONFLICT",
          "Un reparto Completado no admite líneas nuevas.",
        );
      // One plan source per reparto: the class must belong to that source.
      if (clase === "Presupuesto" && reparto.fuente_plan !== "PlanCiclo")
        throw new Problem(
          422,
          "FUENTE_PLAN_INCOMPATIBLE",
          "El reparto usa el Plan mensual D′; no admite líneas de Presupuesto.",
          { clase: "Usa una línea de Partida o un reparto con origen PlanCiclo." },
        );
      if (clase === "Partida" && reparto.fuente_plan !== "Dprima")
        throw new Problem(
          422,
          "FUENTE_PLAN_INCOMPATIBLE",
          "El reparto usa el Plan del ciclo; no admite líneas de Partida.",
          { clase: "Usa una línea de Presupuesto o un reparto con origen Dprima." },
        );
      const budget = clase === "Presupuesto" ? presupuestoLineInput(db, body) : null;
      const partida =
        clase === "Partida" ? partidaLineInput(db, reparto.ciclo, body) : null;
      const input =
        body.origen === undefined && reparto.origen_comun
          ? { ...body, origen: reparto.origen_comun }
          : body;
      const fields = lineFields(db, input, clase, budget, partida);
      const time = new Date(now).toISOString();
      const result = db.run(
        `INSERT INTO reparto_lineas(
           reparto,clase,presupuesto,partida,origen,destino,importe,fecha_prevista,
           concepto,nota,incluida,motivo_exclusion,revision,creado,actualizado
         ) VALUES(?,?,?,?,?,?,?,?,?,?,1,NULL,1,?,?)`,
        [
          id,
          clase,
          budget?.id ?? null,
          partida?.id ?? null,
          fields.origen,
          fields.destino,
          fields.importe,
          fields.fechaPrevista,
          fields.concepto,
          fields.nota,
          time,
          time,
        ],
      );
      const line = lineRow(db, id, Number(result.lastInsertRowid))!;
      auditLinea(db, line, "alta", 0, lineSnapshot(line), now);
      return {
        item: lineDto(db, line),
        reparto: repartoDto(db, repartoRow(db, id)!),
      };
    },
  );
}

export function actualizarLineaReparto(
  db: Database,
  idValue: unknown,
  lineaValue: unknown,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  const id = identifier(idValue);
  const lineaId = identifier(lineaValue, "lineaId");
  for (const name of Object.keys(body))
    if (
      ![
        "revision",
        "origen",
        "destino",
        "importe",
        "fechaPrevista",
        "concepto",
        "nota",
        "incluida",
        "motivoExclusion",
      ].includes(name)
    )
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`);
  return conIntento(
    db,
    "reparto:linea-actualizar",
    { reparto: id, linea: lineaId, ...body },
    key,
    now,
    () => {
      const reparto = repartoRow(db, id);
      if (!reparto) throw new Problem(404, "NOT_FOUND", "Reparto no encontrado.");
      const line = lineRow(db, id, lineaId);
      if (!line)
        throw new Problem(404, "NOT_FOUND", "Línea de reparto no encontrada.");
      assertOpenCycle(db, reparto.ciclo);
      const frozen = db
        .query("SELECT id FROM transferencia_pendiente WHERE reparto_linea=?")
        .get(line.id) as { id: number } | null;
      if (frozen)
        throw new Problem(
          409,
          "LINEA_CONGELADA",
          "La línea ya generó una Transferencia pendiente y no se edita.",
          {},
          { pendiente: frozen.id },
        );
      if (reparto.estado !== "Borrador")
        throw new Problem(
          409,
          "STATE_CONFLICT",
          "Solo se editan líneas de un reparto en Borrador.",
        );
      requireRevision(line.revision, body.revision, "linea");
      const changes: Record<string, string | number | null> = {};
      if (body.destino !== undefined && line.clase !== "Adicional") {
        if (body.destino !== line.destino)
          throw new Problem(
            422,
            line.clase === "Partida" ? "PARTIDA_DESTINO" : "PRESUPUESTO_DESTINO",
            line.clase === "Partida"
              ? "El destino procede del Plan mensual D′ y no es editable."
              : "El destino procede del Presupuesto y no es editable.",
            { destino: "El destino se deriva de su origen." },
          );
      }
      const excluded =
        body.incluida === 0 ||
        (body.incluida === undefined && line.incluida === 0);
      if (body.incluida !== undefined && ![0, 1].includes(body.incluida as number))
        throw new Problem(422, "VALIDATION", "incluida debe ser 0 o 1.");
      if (excluded) {
        const motive =
          body.motivoExclusion !== undefined
            ? text(body.motivoExclusion, "motivoExclusion", 2000).trim()
            : (line.motivo_exclusion ?? "");
        if (!motive)
          throw new Problem(422, "VALIDATION", "Indica el motivo de exclusión.", {
            motivoExclusion: "Motivo obligatorio para excluir.",
          });
        if (line.incluida === 1) changes.incluida = 0;
        if (motive !== line.motivo_exclusion) changes.motivo_exclusion = motive;
      } else {
        if (line.incluida === 0) {
          changes.incluida = 1;
          changes.motivo_exclusion = null;
        }
        if (body.motivoExclusion !== undefined && line.incluida === 1)
          throw new Problem(
            422,
            "VALIDATION",
            "Una línea incluida no lleva motivo de exclusión.",
          );
      }
      for (const side of ["origen", "destino"] as const) {
        if (body[side] === undefined) continue;
        if (line.clase !== "Adicional" && side === "destino") continue;
        const value = assertEligible(db, body[side], side);
        if (value !== line[side]) changes[side] = value;
      }
      if (body.importe !== undefined) {
        const value = amount(body.importe);
        if (Number(value.cents) !== line.importe) changes.importe = Number(value.cents);
      }
      if (body.fechaPrevista !== undefined) {
        const value = civilField(body.fechaPrevista, "fechaPrevista");
        if (value !== line.fecha_prevista) changes.fecha_prevista = value;
      }
      if (body.concepto !== undefined) {
        const value =
          body.concepto === null ? null : optionalText(body.concepto, "concepto", 2000);
        if (value !== line.concepto) changes.concepto = value;
      }
      if (body.nota !== undefined) {
        const value =
          body.nota === null ? null : optionalText(body.nota, "nota", 4000);
        if (value !== line.nota) changes.nota = value;
      }
      if (!Object.keys(changes).length)
        throw new Problem(422, "VALIDATION", "No hay cambios que guardar.");
      const origin = (changes.origen ?? line.origen) as string;
      const destination = (changes.destino ?? line.destino) as string;
      if (!origin || !destination)
        throw new Problem(422, "VALIDATION", "La línea necesita origen y destino.");
      if (origin === destination)
        throw new Problem(422, "VALIDATION", "Origen y destino deben ser distintos.");
      const time = new Date(now).toISOString();
      const sets = ["revision=revision+1", "actualizado=?"];
      const values: (string | number | null)[] = [time];
      for (const [column, value] of Object.entries(changes)) {
        sets.push(`${column}=?`);
        values.push(value);
      }
      values.push(line.id, line.revision);
      const result = db.run(
        `UPDATE reparto_lineas SET ${sets.join(",")} WHERE id=? AND revision=?`,
        values,
      );
      if (result.changes !== 1)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "La línea del reparto ha cambiado. Revisa y vuelve a intentarlo.",
        );
      const updated = lineRow(db, id, line.id)!;
      auditLinea(
        db,
        updated,
        changes.incluida === 0 ? "exclusión" : "edición",
        line.revision,
        { cambios: changes, linea: lineSnapshot(updated) },
        now,
        typeof changes.motivo_exclusion === "string"
          ? changes.motivo_exclusion
          : null,
      );
      return {
        item: lineDto(db, updated),
        reparto: repartoDto(db, repartoRow(db, id)!),
      };
    },
  );
}

/* ------------------------------------------------------------------ */
/* Generation — single IMMEDIATE transaction, SAVEPOINT per line.       */
/* ------------------------------------------------------------------ */

export function generarReparto(
  db: Database,
  idValue: unknown,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  const id = identifier(idValue);
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  for (const name of Object.keys(body))
    if (!["revision", "lineaIds"].includes(name))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`);
  let requested: number[] | null = null;
  if (body.lineaIds !== undefined) {
    if (!Array.isArray(body.lineaIds) || body.lineaIds.length > 500)
      throw new Problem(422, "VALIDATION", "lineaIds debe ser una lista de líneas.");
    requested = body.lineaIds.map((value) => identifier(value, "lineaIds"));
    if (new Set(requested).size !== requested.length)
      throw new Problem(422, "VALIDATION", "lineaIds contiene identificadores duplicados.");
  }
  const hash = fingerprint([
    "reparto:generar",
    id,
    body.revision,
    requested ? [...requested].sort((a, b) => a - b) : null,
  ]);
  return db
    .transaction(() => {
      db.run("DELETE FROM transferencia_pendiente_attempts WHERE expires<?", [now]);
      const retry = db
        .query(
          "SELECT hash,response FROM transferencia_pendiente_attempts WHERE operacion='reparto:generar' AND key=?",
        )
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento corresponde a otros datos.",
          );
        return JSON.parse(retry.response);
      }
      const row = repartoRow(db, id);
      if (!row) throw new Problem(404, "NOT_FOUND", "Reparto no encontrado.");
      assertOpenCycle(db, row.ciclo);
      if (row.estado === "Completado")
        throw new Problem(
          409,
          "STATE_CONFLICT",
          "Un reparto Completado no admite una nueva generación.",
        );
      requireRevision(row.revision, body.revision, "reparto");
      const lines = lineRows(db, id);
      const byId = new Map(lines.map((line) => [line.id, line]));
      let selected: LineRow[];
      if (requested) {
        selected = requested.map((lineId) => {
          const line = byId.get(lineId);
          if (!line)
            throw new Problem(404, "NOT_FOUND", "Línea de reparto no encontrada.");
          return line;
        });
        const excluded = selected.filter((line) => line.incluida !== 1);
        if (excluded.length)
          throw new Problem(
            422,
            "VALIDATION",
            "Una línea excluida no genera pendiente.",
            {},
            { lineas: excluded.map((line) => line.id) },
          );
      } else selected = lines;
      const existingRows = pendingRows(db, id);
      const existingByLine = new Map(
        existingRows
          .filter((pending) => pending.reparto_linea !== null)
          .map((pending) => [pending.reparto_linea!, pending]),
      );
      const existentes = selected
        .filter((line) => existingByLine.has(line.id))
        .map((line) => ({
          lineaId: line.id,
          pendiente: {
            id: existingByLine.get(line.id)!.id,
            estado: existingByLine.get(line.id)!.estado,
          },
        }));
      const targets = selected.filter(
        (line) => line.incluida === 1 && !existingByLine.has(line.id),
      );
      if (row.estado === "Borrador" && !targets.length)
        throw new Problem(
          422,
          "VALIDATION",
          "El reparto no tiene líneas incluidas que generar.",
        );
      if (!targets.length) {
        const result = {
          reparto: repartoDto(db, row),
          creados: [],
          existentes,
          errores: [],
        };
        db.run(
          "INSERT INTO transferencia_pendiente_attempts(operacion,key,hash,response,expires) VALUES('reparto:generar',?,?,?,?)",
          [key, hash, JSON.stringify(result), now + 86400000],
        );
        return result;
      }
      const before = snapshot(row);
      const time = new Date(now).toISOString();
      if (row.estado === "Borrador")
        db.run(
          "UPDATE repartos SET estado='Generado',revision=revision+1,actualizado=? WHERE id=? AND revision=?",
          [time, id, row.revision],
        );
      else
        db.run(
          "UPDATE repartos SET revision=revision+1,actualizado=? WHERE id=? AND revision=?",
          [time, id, row.revision],
        );
      const creados: unknown[] = [];
      const errores: {
        lineaId: number;
        code: string;
        message: string;
      }[] = [];
      for (const line of targets) {
        db.run("SAVEPOINT reparto_generacion_linea");
        try {
          const item = crearTransferenciaPendiente(
            db,
            { lineaId: line.id },
            now,
          );
          db.run("RELEASE SAVEPOINT reparto_generacion_linea");
          creados.push(item);
        } catch (error) {
          db.run("ROLLBACK TO SAVEPOINT reparto_generacion_linea");
          db.run("RELEASE SAVEPOINT reparto_generacion_linea");
          const problem = error instanceof Problem ? error : null;
          if (!problem)
            // Internal detail (possibly SQL/constraint text) stays in the
            // server log; the wire response never echoes it.
            console.error("reparto:generar", line.id, error);
          const code = problem
            ? ["PRESUPUESTO_DESTINO", "PARTIDA_DESTINO", "FUENTE_NO_APORTACION"].includes(
                problem.code,
              )
              ? "CONTEXT_CHANGED"
              : problem.code
            : "INTERNAL";
          errores.push({
            lineaId: line.id,
            code,
            message: problem
              ? problem.message
              : "No se pudo generar la Transferencia pendiente.",
          });
        }
      }
      if (errores.length)
        throw new Problem(
          409,
          "GENERACION_INCOMPLETA",
          "No se generó ningún pendiente. El borrador se conserva.",
          {},
          { creados: [], existentes, errores },
        );
      const after = repartoRow(db, id)!;
      audit(db, after, "generacion", before, now);
      const result = {
        reparto: repartoDto(db, after),
        creados,
        existentes,
        errores: [],
      };
      db.run(
        "INSERT INTO transferencia_pendiente_attempts(operacion,key,hash,response,expires) VALUES('reparto:generar',?,?,?,?)",
        [key, hash, JSON.stringify(result), now + 86400000],
      );
      return result;
    })
    .immediate();
}

/* ------------------------------------------------------------------ */
/* Follow-up and strict completion.                                     */
/* ------------------------------------------------------------------ */

function seguimientoData(db: Database, row: RepartoRow) {
  const lines = lineRows(db, row.id);
  const pendings = pendingRows(db, row.id);
  const lineas = lines.map((line) => lineDto(db, line));
  const completion = completionState(lines, pendings);
  const d8 = lineas
    .filter(
      (line) =>
        line.avisos.includes("PRESUPUESTO_INACTIVO") ||
        line.avisos.includes("PARTIDA_INACTIVA"),
    )
    .map((line) => ({
      linea: line.id,
      presupuesto: line.presupuesto?.id ?? null,
      partida: line.partida?.id ?? null,
      motivo: line.avisos.includes("PARTIDA_INACTIVA")
        ? "Partida inactiva: línea histórica visible, sin pendiente nuevo."
        : "Presupuesto inactivo: línea histórica visible, sin pendiente nuevo.",
    }));
  const contexto = lineas
    .filter(
      (line) =>
        line.avisos.includes("PRESUPUESTO_DESTINO") ||
        line.avisos.includes("PARTIDA_DESTINO") ||
        line.avisos.includes("FUENTE_NO_APORTACION") ||
        line.avisos.includes("PRESUPUESTO_NO_DISPONIBLE") ||
        line.avisos.includes("PARTIDA_NO_DISPONIBLE"),
    )
    .map((line) => ({
      linea: line.id,
      presupuesto: line.presupuesto?.id ?? null,
      partida: line.partida?.id ?? null,
      motivos: line.avisos.filter((aviso) =>
        [
          "PRESUPUESTO_DESTINO",
          "PARTIDA_DESTINO",
          "FUENTE_NO_APORTACION",
          "PRESUPUESTO_NO_DISPONIBLE",
          "PARTIDA_NO_DISPONIBLE",
        ].includes(aviso),
      ),
    }));
  return {
    reparto: repartoDto(db, row),
    lineas,
    pendientes: pendings.map((pending) => ({
      id: pending.id,
      linea: pending.reparto_linea,
      estado: pending.estado,
      importe: decimal(String(pending.importe)),
    })),
    resumen: {
      lineas: lines.length,
      incluidas: lines.filter((line) => line.incluida === 1).length,
      excluidas: lines.filter((line) => line.incluida === 0).length,
      conPendiente: pendings.length,
      pendientesDeRealizar: pendings.filter(
        (pending) => pending.estado === "Pendiente de realizar",
      ).length,
      confirmadas: pendings.filter((pending) => pending.estado === "Confirmada")
        .length,
      canceladas: pendings.filter((pending) => pending.estado === "Cancelada")
        .length,
    },
    puedeCompletar: completion.puedeCompletar,
    motivosNoCompletar: completion.motivosNoCompletar,
    avisos: {
      d8,
      d6: {
        pendientes: pendings.filter(
          (pending) => pending.estado === "Pendiente de realizar",
        ).length,
        incluidosEnFoto: false,
        bloquea: false,
        motivo:
          "El precierre solo avisa: las Transferencias pendientes no entran en la foto.",
      },
      contexto,
      cicloCerrado: cycleClosed(db, row.ciclo),
    },
  };
}

export function getSeguimientoReparto(
  db: Database,
  idValue: unknown,
  _now = Date.now(),
) {
  return db.transaction(() => {
    const id = identifier(idValue);
    const row = repartoRow(db, id);
    if (!row) throw new Problem(404, "NOT_FOUND", "Reparto no encontrado.");
    return seguimientoData(db, row);
  })();
}

export function completarReparto(
  db: Database,
  idValue: unknown,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  const id = identifier(idValue);
  for (const name of Object.keys(body))
    if (name !== "revision")
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`);
  return conIntento(db, "reparto:completar", { id, ...body }, key, now, () => {
    const row = repartoRow(db, id);
    if (!row) throw new Problem(404, "NOT_FOUND", "Reparto no encontrado.");
    requireRevision(row.revision, body.revision, "reparto");
    if (row.estado === "Completado")
      throw new Problem(
        409,
        "STATE_CONFLICT",
        "El reparto ya está Completado.",
      );
    const estado = seguimientoData(db, row);
    if (!estado.puedeCompletar)
      throw new Problem(
        409,
        "REPARTO_NO_COMPLETABLE",
        "El reparto no puede completarse todavía.",
        {},
        { motivosNoCompletar: estado.motivosNoCompletar },
      );
    const before = snapshot(row);
    db.run(
      "UPDATE repartos SET estado='Completado',revision=revision+1,actualizado=? WHERE id=? AND revision=?",
      [new Date(now).toISOString(), id, row.revision],
    );
    const after = repartoRow(db, id)!;
    audit(db, after, "completado", before, now);
    return { reparto: repartoDto(db, after) };
  });
}
