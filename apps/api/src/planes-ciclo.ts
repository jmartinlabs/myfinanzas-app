import type { Database } from "bun:sqlite";
import { getCycle, cycleMaster } from "./ciclos";
import {
  ledgerRows,
  financeRevision,
  fingerprint,
  type LedgerRow,
} from "./movement-ledger";
import { Problem, money, decimal } from "./saldos";
import { spanishToday } from "./movimientos";

export type PlanBudget = {
  id: string;
  nombre: string;
  fuente: string;
  destino: string | null;
  estado: string;
};
export type PlanLine = {
  presupuesto: string;
  base: string | null;
  esencial: string | null;
  delMes: string | null;
};
const aggregateCents = (v: string) => {
  const [whole, fraction = ""] = v.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
};
const fields = ["base", "esencial", "delMes"] as const;
const fail: (message: string) => never = (message: string) => {
  throw new Problem(400, "VALIDATION", message);
};
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    return fail("Objeto de cambios inválido.");
  return v as Record<string, unknown>;
}
function only(v: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(v).some((k) => !keys.includes(k)))
    fail("Campo no editable o desconocido.");
}
export function planLines(db: Database, ciclo: string): PlanLine[] {
  return db
    .query(
      "SELECT presupuesto,CAST(base AS TEXT) base,CAST(esencial AS TEXT) esencial,CAST(del_mes AS TEXT) delMes FROM cycle_plan_lines WHERE ciclo=? ORDER BY presupuesto",
    )
    .all(ciclo) as PlanLine[];
}
function budgets(db: Database): PlanBudget[] {
  return db
    .query(
      "SELECT id,nombre,fuente,destino,estado FROM presupuestos ORDER BY length(id),id",
    )
    .all() as PlanBudget[];
}
function parts(db: Database) {
  return db.query("SELECT id,presupuesto FROM partidas ORDER BY id").all() as {
    id: string;
    presupuesto: string | null;
  }[];
}
/** Pure R3: actual facts, no reservations or reference exclusions on expenses. */
export function executionFacts(
  budget: PlanBudget,
  rows: LedgerRow[],
  relations: { id: string; presupuesto: string | null }[],
  start: string,
  end: string,
) {
  const ids = new Set(
    relations.filter((p) => p.presupuesto === budget.id).map((p) => p.id),
  );
  return rows.filter(
    (r) =>
      !r.anulado &&
      start <= r.fecha &&
      r.fecha <= end &&
      (budget.fuente === "Gasto real"
        ? r.tipo === "Gasto" && r.partida !== null && ids.has(r.partida)
        : budget.fuente === "Aportación a saldo" &&
          r.tipo === "Transferencia" &&
          r.destino === budget.destino &&
          r.origen !== "S000" &&
          !r.referencia),
  );
}
export function planResult(
  budget: PlanBudget,
  line: PlanLine | undefined,
  total: bigint | null,
  reason: string | null,
) {
  const planned = line?.delMes ?? null,
    pending =
      planned === null || total === null ? null : BigInt(planned) - total;
  return {
    presupuesto: budget,
    linea: line
      ? {
          ...line,
          base: decimal(line.base),
          esencial: decimal(line.esencial),
          delMes: decimal(line.delMes),
        }
      : null,
    aTransferir: decimal(planned),
    ejecutado: total === null ? null : decimal(total),
    pendiente: pending === null ? null : decimal(pending),
    estado:
      pending === null
        ? null
        : pending > 0n
          ? "Pendiente"
          : pending === 0n
            ? "Completo"
            : "Excedido",
    motivo: reason,
    sinPlanificar:
      !line && total !== null && total > 0n && budget.fuente !== "No aplica",
  };
}
function context(db: Database, ciclo: string) {
  return fingerprint([
    ciclo,
    financeRevision(db),
    db.query("SELECT * FROM presupuestos ORDER BY id").all(),
    db.query("SELECT ciclo,revision FROM cycle_plans ORDER BY ciclo").all(),
    db
      .query(
        "SELECT ciclo,presupuesto,CAST(base AS TEXT) base,CAST(esencial AS TEXT) esencial,CAST(del_mes AS TEXT) del_mes FROM cycle_plan_lines ORDER BY ciclo,presupuesto",
      )
      .all(),
  ]);
}
export function cycleExecution(
  db: Database,
  ciclo: string,
  now = Date.now(),
  overrides?: {
    budgets?: PlanBudget[];
    parts?: { id: string; presupuesto: string | null }[];
  },
) {
  const cycle = getCycle(db, ciclo).ciclo,
    lines = planLines(db, ciclo),
    rows = ledgerRows(db),
    catalog = overrides?.budgets ?? budgets(db),
    links = overrides?.parts ?? parts(db);
  const periodReason =
    cycle.inicio > spanishToday(now)
      ? "Ciclo no iniciado"
      : !(cycle.fin ?? cycle.corte)
        ? "Periodo/corte no verificable"
        : null;
  return {
    ciclo: cycle,
    revision:
      (
        db
          .query("SELECT revision FROM cycle_plans WHERE ciclo=?")
          .get(ciclo) as { revision: number } | null
      )?.revision ?? 0,
    sinPlan: lines.length === 0,
    items: catalog.map((b) => {
      const reason = b.fuente === "No aplica" ? "No comparable" : periodReason;
      const facts = reason
        ? []
        : executionFacts(
            b,
            rows,
            links,
            cycle.inicio,
            (cycle.fin ?? cycle.corte)!,
          );
      return planResult(
        b,
        lines.find((l) => l.presupuesto === b.id),
        reason ? null : facts.reduce((n, r) => n + BigInt(r.importe), 0n),
        reason,
      );
    }),
  };
}
export function getCyclePlan(db: Database, ciclo: string, now = Date.now()) {
  return db.transaction(() => ({
    ...cycleExecution(db, ciclo, now),
    contextRevision: context(db, ciclo),
    auditoria: db
      .query("SELECT * FROM cycle_plan_audit WHERE ciclo=? ORDER BY id")
      .all(ciclo),
  }))();
}
export function executionDetail(
  db: Database,
  ciclo: string,
  presupuesto: string,
  params = new URLSearchParams(),
  now = Date.now(),
) {
  return db.transaction(() => {
    const data = cycleExecution(db, ciclo, now),
      item = data.items.find((i) => i.presupuesto.id === presupuesto);
    if (!item)
      throw new Problem(404, "NOT_FOUND", "Presupuesto no encontrado.");
    const page = Number(params.get("page") ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
      fail("Página inválida.");
    const all = item.motivo
      ? []
      : executionFacts(
          item.presupuesto,
          ledgerRows(db),
          parts(db),
          data.ciclo.inicio,
          (data.ciclo.fin ?? data.ciclo.corte)!,
        );
    return {
      ...item,
      periodo: data.ciclo,
      total: all.length,
      page,
      items: all
        .slice((page - 1) * 100, page * 100)
        .map((r) => ({
          id: r.id,
          fecha: r.fecha,
          tipo: r.tipo,
          importe: decimal(r.importe),
          partida: r.partida,
          referencia: r.referencia,
          origen: r.origen,
          destino: r.destino,
        })),
    };
  })();
}
function proposal(
  db: Database,
  ciclo: string,
  body: Record<string, unknown>,
  now: number,
) {
  only(body, ["revision", "contextRevision", "cambios", "copia"]);
  const before = cycleExecution(db, ciclo, now),
    current = planLines(db, ciclo),
    catalog = budgets(db);
  if (
    body.revision !== before.revision ||
    body.contextRevision !== context(db, ciclo)
  )
    throw new Problem(
      409,
      "CONTEXT_CHANGED",
      "El contexto ha cambiado; actualiza y revisa conservando el borrador.",
    );
  if (body.cambios !== undefined && body.copia !== undefined)
    fail("Elige edición o copia.");
  const changes: PlanLine[] = [],
    omitted: { presupuesto: string; campo: string; motivo: string }[] = [];
  if (body.copia !== undefined) {
    const copy = object(body.copia);
    only(copy, ["ciclo", "campos"]);
    if (typeof copy.ciclo !== "string" || copy.ciclo === ciclo)
      fail("Selecciona otro ciclo origen.");
    getCycle(db, copy.ciclo);
    if (
      !Array.isArray(copy.campos) ||
      new Set(copy.campos).size !== copy.campos.length ||
      copy.campos.some((f) => !fields.includes(f as any))
    )
      fail("Campos de copia inválidos.");
    for (const source of planLines(db, copy.ciclo)) {
      const budget = catalog.find((b) => b.id === source.presupuesto)!,
        old = current.find((l) => l.presupuesto === source.presupuesto),
        next: PlanLine = {
          ...(old ?? {
            presupuesto: source.presupuesto,
            base: null,
            esencial: null,
            delMes: null,
          }),
        };
      for (const f of copy.campos as (typeof fields)[number][]) {
        const reason =
          budget.estado !== "Activo"
            ? "inactivo"
            : next[f] !== null
              ? "ya informado"
              : source[f] === null
                ? "origen vacío"
                : null;
        if (reason)
          omitted.push({
            presupuesto: source.presupuesto,
            campo: f,
            motivo: reason,
          });
        else next[f] = source[f];
      }
      if (fields.some((f) => next[f] !== (old?.[f] ?? null)))
        changes.push(next);
    }
  } else {
    if (!Array.isArray(body.cambios) || body.cambios.length > 100)
      fail("Envía hasta 100 líneas por revisión.");
    const seen = new Set<string>();
    for (const raw of body.cambios as unknown[]) {
      const input = object(raw);
      only(input, ["presupuesto", ...fields]);
      const id = input.presupuesto;
      if (typeof id !== "string" || seen.has(id))
        fail("Identidad de Presupuesto inválida o duplicada.");
      seen.add(id);
      const budget = catalog.find((b) => b.id === id);
      if (!budget)
        throw new Problem(404, "NOT_FOUND", "Presupuesto no encontrado.");
      const old = current.find((l) => l.presupuesto === id);
      if (!old && budget.estado !== "Activo")
        fail("No se permiten nuevas líneas de Presupuestos inactivos.");
      const next: PlanLine = {
        ...(old ?? {
          presupuesto: id,
          base: null,
          esencial: null,
          delMes: null,
        }),
      };
      for (const f of fields)
        if (Object.hasOwn(input, f)) {
          let amount: bigint | null;
          try {
            amount = money(input[f]);
          } catch {
            throw new Problem(400, "VALIDATION", "Importe inválido.", {
              [f]: "EUR no negativo, máximo dos decimales y rango int64.",
            });
          }
          if (amount !== null && amount < 0n)
            throw new Problem(400, "VALIDATION", "Importe negativo.", {
              [f]: "No se admiten negativos.",
            });
          next[f] = amount?.toString() ?? null;
        }
      if (!old || fields.some((f) => next[f] !== old[f])) changes.push(next);
    }
  }
  const requiresReason =
    before.revision > 0 ||
    (before.ciclo.fin !== null && before.ciclo.fin < spanishToday(now));
  const after = before.items.map((i) => {
    const line =
      changes.find((l) => l.presupuesto === i.presupuesto.id) ??
      current.find((l) => l.presupuesto === i.presupuesto.id);
    return planResult(
      i.presupuesto,
      line,
      i.ejecutado === null ? null : aggregateCents(i.ejecutado),
      i.motivo,
    );
  });
  const fingerprintValue = fingerprint([
    body,
    before,
    changes,
    omitted,
    requiresReason,
  ]);
  return {
    antes: before,
    despues: after,
    cambios: changes,
    omisiones: omitted,
    requiereMotivo: requiresReason,
    sinCambios: !changes.length,
    fingerprint: fingerprintValue,
  };
}
export function previewCyclePlan(
  db: Database,
  ciclo: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db.transaction(() => proposal(db, ciclo, body, now)).immediate();
}
export function confirmCyclePlan(
  db: Database,
  ciclo: string,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  only(body, ["propuesta", "fingerprint", "motivo"]);
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key)) fail("Clave de intento inválida.");
  const hash = fingerprint([ciclo, body]);
  return db
    .transaction(() => {
      db.run("DELETE FROM cycle_plan_attempts WHERE expires<?", [now]);
      const retry = db
        .query("SELECT hash,response FROM cycle_plan_attempts WHERE key=?")
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
      const p = proposal(db, ciclo, object(body.propuesta), now);
      if (body.fingerprint !== p.fingerprint)
        throw new Problem(
          409,
          "IMPACT_CHANGED",
          "La revisión ha cambiado; revisa de nuevo.",
        );
      if (
        p.requiereMotivo &&
        !p.sinCambios &&
        (typeof body.motivo !== "string" ||
          !body.motivo.trim() ||
          body.motivo.length > 2000 ||
          /[\u0000-\u001f\u007f]/.test(body.motivo))
      )
        fail("Motivo obligatorio, máximo 2000 caracteres.");
      if (!p.sinCambios) {
        db.run(
          "INSERT INTO cycle_plans VALUES(?,1) ON CONFLICT(ciclo) DO UPDATE SET revision=revision+1",
          [ciclo],
        );
        const revision = p.antes.revision + 1;
        for (const line of p.cambios) {
          const old = planLines(db, ciclo).find(
            (l) => l.presupuesto === line.presupuesto,
          );
          db.run(
            "INSERT INTO cycle_plan_lines VALUES(?,?,?,?,?) ON CONFLICT(ciclo,presupuesto) DO UPDATE SET base=excluded.base,esencial=excluded.esencial,del_mes=excluded.del_mes",
            [ciclo, line.presupuesto, line.base, line.esencial, line.delMes],
          );
          const delta = Object.fromEntries(
            fields
              .filter((f) => !old || old[f] !== line[f])
              .map((f) => [
                f,
                {
                  anterior: decimal(old?.[f] ?? null),
                  posterior: decimal(line[f]),
                },
              ]),
          );
          db.run(
            "INSERT INTO cycle_plan_audit(ciclo,presupuesto,revision,actor,instante,motivo,delta) VALUES(?,?,?,'usuario-unico',?,?,?)",
            [
              ciclo,
              line.presupuesto,
              revision,
              new Date(now).toISOString(),
              typeof body.motivo === "string" ? body.motivo.trim() : null,
              JSON.stringify(delta),
            ],
          );
        }
      }
      const result = getCyclePlan(db, ciclo, now);
      db.run("INSERT INTO cycle_plan_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(result),
        now + 86400000,
      ]);
      return result;
    })
    .immediate();
}
/** Full set, no pagination truncation; hypothetical configuration does not mutate facts. */
export function planConfigurationImpact(
  db: Database,
  change: {
    budget?: { id: string; value: Partial<PlanBudget> };
    part?: { id: string; presupuesto: string | null };
  },
  now = Date.now(),
) {
  const beforeBudgets = budgets(db),
    beforeParts = parts(db);
  const afterBudgets = beforeBudgets.map((b) =>
      b.id === change.budget?.id ? { ...b, ...change.budget.value } : b,
    ),
    afterParts = beforeParts.map((p) =>
      p.id === change.part?.id
        ? { ...p, presupuesto: change.part.presupuesto }
        : p,
    );
  const cycles = cycleMaster(db)
    .map((c) => {
      const before = cycleExecution(db, c.id, now),
        after = cycleExecution(db, c.id, now, {
          budgets: afterBudgets,
          parts: afterParts,
        });
      const differences = before.items
        .map((b, i) => ({
          presupuesto: b.presupuesto.id,
          antes: b,
          despues: after.items[i],
        }))
        .filter(
          (d) =>
            (d.antes.linea !== null ||
              d.despues.linea !== null ||
              (d.antes.ejecutado !== null &&
                aggregateCents(d.antes.ejecutado) > 0n) ||
              (d.despues.ejecutado !== null &&
                aggregateCents(d.despues.ejecutado) > 0n)) &&
            fingerprint(d.antes) !== fingerprint(d.despues),
        );
      return { ciclo: c.id, diferencias: differences };
    })
    .filter((c) => c.diferencias.length);
  const master = cycleMaster(db),
    facts = ledgerRows(db).filter((r) => !r.anulado);
  const affectedBudgets = new Set(
    change.budget
      ? [change.budget.id]
      : [
          beforeParts.find((p) => p.id === change.part?.id)?.presupuesto,
          change.part?.presupuesto,
        ],
  );
  const relevantFacts = facts.filter((r) =>
    [...affectedBudgets]
      .filter((id): id is string => typeof id === "string")
      .some((id) => {
        const before = beforeBudgets.find((b) => b.id === id),
          after = afterBudgets.find((b) => b.id === id);
        return [
          before && executionFacts(before, [r], beforeParts, r.fecha, r.fecha),
          after && executionFacts(after, [r], afterParts, r.fecha, r.fecha),
        ].some((rows) => rows && rows.length > 0);
      }),
  );
  const uncovered = relevantFacts.some(
    (r) =>
      !master.some(
        (c) => c.inicio <= r.fecha && r.fecha <= (c.fin ?? c.corte ?? ""),
      ),
  );
  const blocked =
    uncovered ||
    cycles.some((c) =>
      c.diferencias.some((d) =>
        [d.antes, d.despues].some(
          (i) => i.motivo !== null && i.motivo !== "No comparable",
        ),
      ),
    );
  return {
    ciclos: cycles,
    blocked,
    contextRevision: context(db, "impacto"),
    coverage: blocked
      ? "Impacto de periodos no verificable; cambio bloqueado."
      : "Motor R3 y planes comprobados íntegramente por ciclo.",
  };
}
