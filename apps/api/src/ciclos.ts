import { movementSource, ledgerRows } from "./movement-ledger";
import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { Schema } from "effect";
import { Problem, money, decimal } from "./saldos";

export function civil(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith("0000-")
  )
    throw new Problem(422, "VALIDATION", "Indica una fecha civil válida.", {
      inicio: "Fecha civil inválida.",
    });
  const date = new Date(value + "T00:00:00.000Z");
  if (
    !Number.isFinite(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new Problem(422, "VALIDATION", "Indica una fecha civil válida.", {
      inicio: "Fecha civil inválida.",
    });
  return value;
}
export function fundedMonth(start: string) {
  const value = civil(start),
    [y, m] = value.split("-").map(Number);
  const year = m === 12 ? y + 1 : y;
  if (year > 9999)
    throw new Problem(
      422,
      "DATE_RANGE",
      "Mes financiado fuera del formato técnico de cuatro cifras.",
      { inicio: "El mes derivado debe ser representable como fecha civil." },
    );
  return `${String(year).padStart(4, "0")}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
}
export function dayBefore(value: string) {
  return new Date(
    new Date(civil(value) + "T00:00:00.000Z").valueOf() - 86400000,
  )
    .toISOString()
    .slice(0, 10);
}
export const sourceNames = [
  "Movimientos",
  "Revisión Comida",
  "Operaciones de inversión",
] as const;
export type Source = { source: (typeof sourceNames)[number] } & (
  | { state: "pendiente" }
  | { state: "disponible"; maxDate: string | null }
  | { state: "error" }
);
// Pure contract for future readers. The running application has no financial providers or fake dates.
export function financialReference(sources: readonly Source[]) {
  const known = new Map<string, Source>();
  for (const source of sources) {
    if (!sourceNames.includes(source.source) || known.has(source.source))
      throw new Error("Contrato de fuente duplicado o desconocido.");
    known.set(source.source, source);
  }
  const coverage: Source[] = sourceNames.map(
    (source) => known.get(source) ?? { source, state: "pendiente" },
  );
  if (coverage.some((s) => s.state === "error"))
    return { fecha: null, estado: "error" as const, coverage };
  const dates = coverage.flatMap((s) =>
    s.state === "disponible" && s.maxDate !== null ? [civil(s.maxDate)] : [],
  );
  return {
    fecha: dates.length ? dates.sort().at(-1)! : null,
    estado: dates.length
      ? ("disponible" as const)
      : ("sin_referencia" as const),
    coverage,
  };
}
export type Reference = ReturnType<typeof financialReference>;
type Row = {
  id: string;
  inicio: string;
  mes_financiado: string;
  saldo_comida: string;
  creado: string;
  revision: number;
  actualizado: string | null;
};
export type Cycle = {
  id: string;
  inicio: string;
  mesFinanciado: string;
  saldoInicialComida: string;
  fin: string | null;
  estadoTemporal: "Abierto" | "Con fin temporal";
  corte: string | null;
  revision: number;
  estadoCorte:
    "disponible" | "sin_referencia" | "no_aplicable" | "no_abierto" | "error";
};
const select =
  "SELECT id,inicio,mes_financiado,CAST(saldo_comida AS TEXT) saldo_comida,creado,revision,actualizado FROM ciclos ORDER BY inicio";
const fingerprint = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
function rows(db: Database) {
  return db.query(select).all() as Row[];
}
export function deriveCycles(
  input: readonly Pick<
    Row,
    "id" | "inicio" | "mes_financiado" | "saldo_comida"
  >[],
  reference: Reference,
): Cycle[] {
  const ordered = [...input].sort((a, b) => a.inicio.localeCompare(b.inicio));
  return ordered.map((row, i) => {
    const fin = ordered[i + 1] ? dayBefore(ordered[i + 1].inicio) : null;
    const state =
      fin !== null
        ? "no_abierto"
        : reference.estado === "error"
          ? "error"
          : reference.fecha === null
            ? "sin_referencia"
            : reference.fecha < row.inicio
              ? "no_aplicable"
              : "disponible";
    return {
      revision: (row as Partial<Row>).revision ?? 1,
      id: row.id,
      inicio: row.inicio,
      mesFinanciado: row.mes_financiado,
      saldoInicialComida: decimal(row.saldo_comida)!,
      fin,
      estadoTemporal: fin === null ? "Abierto" : "Con fin temporal",
      corte: state === "disponible" ? reference.fecha : null,
      estadoCorte: state,
    };
  });
}
export function cycleContext(db: Database) {
  // No date from wall clock, cycle creation or non-delivered sources enters this reference.
  return contextFrom(rows(db), financialReference([movementSource(db)]));
}
export function contextFrom(
  input: Parameters<typeof deriveCycles>[0],
  reference: Reference,
) {
  const cycles = deriveCycles(input, reference);
  const current =
    reference.fecha === null
      ? null
      : (cycles.find(
          (c) =>
            c.inicio <= reference.fecha! &&
            (c.fin === null || reference.fecha! <= c.fin),
        ) ?? null);
  return {
    referencia: reference,
    actual: current,
    motivo:
      cycles.length === 0
        ? "sin_ciclos"
        : reference.estado === "error"
          ? "error_referencia"
          : reference.fecha === null
            ? "sin_referencia"
            : current
              ? "actual"
              : "sin_ciclo_actual",
    ultimoInicio: cycles.at(-1)?.inicio ?? null,
    // Includes the full master rather than just filtered/paginated data.
    revision: fingerprint(input),
  };
}
export function listCycles(db: Database, params = new URLSearchParams()) {
  const input = rows(db),
    context = contextFrom(input, financialReference([movementSource(db)]));
  const page = Number(params.get("page") ?? 1),
    query = (params.get("q") ?? "").toLocaleLowerCase("es"),
    state = params.get("estado") ?? "";
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !["", "Abierto", "Con fin temporal"].includes(state)
  )
    throw new Problem(422, "VALIDATION", "Filtro o página inválidos.");
  const cycles = deriveCycles(input, context.referencia)
    .reverse()
    .filter(
      (c) =>
        (!state || c.estadoTemporal === state) &&
        `${c.mesFinanciado} ${new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(c.mesFinanciado + "T00:00:00Z"))} ${c.inicio} ${c.inicio.split("-").reverse().join("/")}`
          .toLocaleLowerCase("es")
          .includes(query),
    );
  return {
    ciclos: cycles.slice((page - 1) * 100, page * 100),
    total: cycles.length,
    page,
    contexto: context,
  };
}
export function getCycle(db: Database, id: string) {
  const input = rows(db),
    reference = financialReference([movementSource(db)]);
  const item = deriveCycles(input, reference).find((c) => c.id === id);
  if (!item) throw new Problem(404, "NOT_FOUND", "Ciclo no encontrado.");
  return { ciclo: item, contexto: contextFrom(input, reference) };
}
export function createCycle(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  for (const name of Object.keys(body))
    if (!["inicio", "saldoInicialComida", "contextRevision"].includes(name))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`, {
        [name]: "Campo no editable.",
      });
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  const errors: Record<string, string> = Object.create(null);
  let inicio = "",
    saldo: bigint | null = null;
  try {
    inicio = civil(body.inicio);
    fundedMonth(inicio);
  } catch (e) {
    errors.inicio = (e as Error).message;
  }
  try {
    if (
      !Schema.is(Schema.String)(body.saldoInicialComida) ||
      body.saldoInicialComida === ""
    )
      throw Error(
        "Indica el saldo inicial comida; cero es válido si lo introduces.",
      );
    saldo = money(body.saldoInicialComida);
    if (saldo === null) throw Error("Saldo inicial obligatorio.");
  } catch (e) {
    errors.saldoInicialComida = (e as Error).message;
  }
  if (
    typeof body.contextRevision !== "string" ||
    !/^[a-f0-9]{64}$/.test(body.contextRevision)
  )
    errors.contextRevision = "Revisa el contexto actual del maestro.";
  if (Object.keys(errors).length)
    throw new Problem(
      422,
      "VALIDATION",
      "Revisa los campos indicados.",
      errors,
    );
  const hash = fingerprint([inicio, String(saldo)]);
  return db
    .transaction(() => {
      db.run("DELETE FROM cycle_attempts WHERE expires<?", [now]);
      const prev = db
        .query("SELECT hash,ciclo FROM cycle_attempts WHERE key=?")
        .get(key) as { hash: string; ciclo: string } | null;
      if (prev) {
        if (prev.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya tiene otros datos.",
          );
        return getCycle(db, prev.ciclo);
      }
      const context = cycleContext(db),
        month = fundedMonth(inicio);
      if (db.query("SELECT id FROM ciclos WHERE mes_financiado=?").get(month))
        throw new Problem(409, "DUPLICATE_CYCLE", "ERROR · Ciclo duplicado", {
          inicio: "Ya existe un ciclo para ese mes y año financiados.",
        });
      if (context.ultimoInicio !== null && inicio <= context.ultimoInicio)
        throw new Problem(
          409,
          "CHRONOLOGY",
          "El Inicio debe ser posterior al último. Las rectificaciones corresponden a E2.1.",
          { inicio: "Indica un Inicio posterior al último ciclo." },
        );
      if (context.revision !== body.contextRevision)
        throw new Problem(
          409,
          "CONTEXT_CHANGED",
          "El maestro ha cambiado. Revisa el contexto actualizado antes de crear.",
        );
      const n = db
        .query(
          "UPDATE counters SET next=next+1 WHERE name='ciclos' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
        )
        .get() as { n: string } | null;
      if (!n)
        throw new Problem(
          503,
          "ID_SPACE",
          "No se pudo reservar identidad de ciclo.",
        );
      const time = new Date(now).toISOString();
      db.run(
        "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,?,?)",
        [n.n, inicio, saldo!, time],
      );
      db.run(
        "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,?,1,?,?,0,'usuario-unico',NULL)",
        [
          "ciclo:" + n.n,
          "alta",
          JSON.stringify(["inicio", "saldoInicialComida"]),
          time,
        ],
      );
      db.run("INSERT INTO cycle_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        n.n,
        now + 86400000,
      ]);
      return getCycle(db, n.n);
    })
    .immediate();
}

export function cycleForDate(db: Database, date: string) {
  return (
    deriveCycles(rows(db), financialReference([movementSource(db)])).find(
      (c) => c.inicio <= date && (c.fin === null || date <= c.fin),
    ) ?? null
  );
}

export function cycleMaster(db: Database) {
  return deriveCycles(rows(db), financialReference([movementSource(db)]));
}

export type CycleOperation = "omitido" | "rectificar";
const operationKeys = [
  "inicio",
  "saldoInicialComida",
  "motivo",
  "revision",
  "contextRevision",
  "impactRevision",
  "confirmado",
];
function operationInput(
  body: Record<string, unknown>,
  operation: CycleOperation,
  old?: Row,
) {
  for (const key of Object.keys(body))
    if (!operationKeys.includes(key))
      throw new Problem(422, "VALIDATION", "Campo no editable: " + key);
  const inicio = civil(body.inicio),
    month = fundedMonth(inicio);
  if (
    typeof body.saldoInicialComida !== "string" ||
    body.saldoInicialComida.trim() === ""
  )
    throw new Problem(
      422,
      "VALIDATION",
      "Indica el saldo inicial comida explícitamente.",
      { saldoInicialComida: "Importe obligatorio; cero y negativos válidos." },
    );
  const saldo = money(body.saldoInicialComida);
  if (saldo === null)
    throw new Problem(422, "VALIDATION", "Saldo inicial obligatorio.");
  if (
    typeof body.motivo !== "string" ||
    !body.motivo.trim() ||
    body.motivo.length > 1000
  )
    throw new Problem(422, "VALIDATION", "Indica el motivo de la operación.", {
      motivo: "Motivo obligatorio, máximo 1000 caracteres.",
    });
  if (operation === "rectificar" && body.revision !== old?.revision)
    throw new Problem(
      409,
      "REVISION_CHANGED",
      "El ciclo ha cambiado. Revisa su estado actual.",
    );
  return { inicio, month, saldo, motivo: body.motivo.trim() };
}
function operationPlan(
  db: Database,
  operation: CycleOperation,
  id: string | null,
  body: Record<string, unknown>,
  page = 1,
) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
    throw new Problem(422, "VALIDATION", "Página inválida.");
  const beforeRows = rows(db),
    old =
      operation === "rectificar"
        ? beforeRows.find((r) => r.id === id)
        : undefined;
  if (operation === "rectificar" && !old)
    throw new Problem(404, "NOT_FOUND", "Ciclo no encontrado.");
  const v = operationInput(body, operation, old);
  if (
    beforeRows.some(
      (r) =>
        r.id !== old?.id &&
        (r.inicio === v.inicio || r.mes_financiado === v.month),
    )
  )
    throw new Problem(409, "DUPLICATE_CYCLE", "ERROR · Ciclo duplicado", {
      inicio: "Ya existe ese Inicio o mes financiado.",
    });
  if (old) {
    const at = beforeRows.indexOf(old),
      left = beforeRows[at - 1],
      right = beforeRows[at + 1];
    if (
      (left && v.inicio <= left.inicio) ||
      (right && v.inicio >= right.inicio)
    )
      throw new Problem(
        409,
        "CHRONOLOGY",
        "El Inicio debe permanecer entre sus vecinos.",
        { inicio: "No se permite saltar un ciclo vecino." },
      );
  } else if (beforeRows.length && v.inicio > beforeRows.at(-1)!.inicio)
    throw new Problem(
      422,
      "ORDINARY_CREATE",
      "Para un Inicio posterior utiliza Nuevo ciclo.",
    );
  const facts = ledgerRows(db),
    reference = financialReference([movementSource(db)]);
  if (reference.estado === "error")
    throw new Problem(
      409,
      "REFERENCE_ERROR",
      "Una fuente instalada ha fallado. No puede confirmarse el impacto.",
    );
  const key = old?.id ?? "nuevo";
  const proposed: Row = {
    id: key,
    inicio: v.inicio,
    mes_financiado: v.month,
    saldo_comida: String(v.saldo),
    creado: old?.creado ?? "",
    revision: (old?.revision ?? 0) + 1,
    actualizado: old?.actualizado ?? null,
  };
  const afterRows = [
    ...beforeRows.filter((r) => r.id !== old?.id),
    proposed,
  ].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const before = deriveCycles(beforeRows, reference),
    after = deriveCycles(afterRows, reference);
  const atDate = (all: Cycle[], date: string) =>
    all.find((c) => c.inicio <= date && (c.fin === null || date <= c.fin)) ??
    null;
  const affected = facts.flatMap((m) => {
    const a = atDate(before, m.fecha),
      b = atDate(after, m.fecha);
    return a?.id !== b?.id
      ? [
          {
            id: m.id,
            fecha: m.fecha,
            tipo: m.tipo,
            vigencia: m.anulado ? "Anulado" : "Vigente",
            antes: a,
            despues: b,
          },
        ]
      : [];
  });
  const cycles = after.flatMap((c) => {
    const a = before.find((v) => v.id === c.id) ?? null;
    return JSON.stringify(a) !== JSON.stringify(c)
      ? [{ antes: a, despues: c }]
      : [];
  });
  const contextRevision = fingerprint([beforeRows, facts, reference]);
  const impactRevision = fingerprint([
    operation,
    id,
    v.inicio,
    String(v.saldo),
    v.motivo,
    old?.revision,
    contextRevision,
  ]);
  return {
    values: v,
    contextRevision,
    impactRevision,
    operation,
    id,
    before: old ? before.find((c) => c.id === old.id)! : null,
    after: after.find((c) => c.id === key)!,
    ciclos: cycles,
    movimientos: affected.slice((page - 1) * 100, page * 100),
    totalMovimientos: affected.length,
    page,
    contextoAntes: contextFrom(beforeRows, reference),
    contextoDespues: contextFrom(afterRows, reference),
    conciliacion: { estado: "pendiente", motivo: "Revisión Comida pendiente" },
  };
}
export function previewCycleOperation(
  db: Database,
  operation: CycleOperation,
  id: string | null,
  body: Record<string, unknown>,
  page = 1,
) {
  return db.transaction(() => {
    const { values, ...result } = operationPlan(db, operation, id, body, page);
    return result;
  })();
}
export function writeCycleOperation(
  db: Database,
  operation: CycleOperation,
  id: string | null,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  const hash = fingerprint([
    operation,
    id,
    ...operationKeys
      .filter(
        (k) => !["contextRevision", "impactRevision", "confirmado"].includes(k),
      )
      .map((k) => [k, body[k]]),
  ]);
  return db
    .transaction(() => {
      db.run("DELETE FROM cycle_operation_attempts WHERE expires<?", [now]);
      const prior = db
        .query("SELECT hash,response FROM cycle_operation_attempts WHERE key=?")
        .get(key) as { hash: string; response: string } | null;
      if (prior) {
        if (prior.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya tiene otros datos.",
          );
        return JSON.parse(prior.response);
      }
      const plan = operationPlan(db, operation, id, body);
      if (
        body.confirmado !== true ||
        body.contextRevision !== plan.contextRevision ||
        body.impactRevision !== plan.impactRevision
      )
        throw new Problem(
          409,
          "CONTEXT_CHANGED",
          "Revisa nuevamente el impacto antes de confirmar.",
        );
      let target = id;
      if (operation === "omitido") {
        const r = db
          .query(
            "UPDATE counters SET next=next+1 WHERE name='ciclos' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
          )
          .get() as { n: string } | null;
        if (!r)
          throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
        target = r.n;
      }
      const time = new Date(now).toISOString();
      db.run("INSERT INTO cycle_operation_guard VALUES(1)");
      try {
        if (operation === "omitido")
          db.run(
            "INSERT INTO ciclos(id,inicio,saldo_comida,creado,revision,actualizado) VALUES(?,?,?,?,1,?)",
            [target!, plan.values.inicio, plan.values.saldo, time, time],
          );
        else
          db.run(
            "UPDATE ciclos SET inicio=?,saldo_comida=?,revision=revision+1,actualizado=? WHERE id=?",
            [plan.values.inicio, plan.values.saldo, time, target!],
          );
      } finally {
        db.run("DELETE FROM cycle_operation_guard");
      }
      const result = getCycle(db, target!);
      db.run("INSERT INTO cycle_audit VALUES(?,?,?,?,?,'usuario-unico',?,?)", [
        target!,
        result.ciclo.revision,
        operation,
        plan.values.motivo,
        time,
        plan.before ? JSON.stringify(plan.before) : null,
        JSON.stringify(result.ciclo),
      ]);
      db.run(
        "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,?,?,?,?,?,'usuario-unico',?)",
        [
          "ciclo:" + target,
          operation,
          result.ciclo.revision,
          JSON.stringify(["inicio", "saldoInicialComida"]),
          time,
          plan.before?.revision ?? 0,
          plan.values.motivo,
        ],
      );
      db.run("INSERT INTO cycle_operation_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(result),
        now + 86400000,
      ]);
      return result;
    })
    .immediate();
}
export function cycleHistory(db: Database, id: string) {
  getCycle(db, id);
  return (
    db
      .query("SELECT * FROM cycle_audit WHERE ciclo=? ORDER BY revision DESC")
      .all(id) as any[]
  ).map((r) => ({
    ...r,
    anterior: r.anterior ? JSON.parse(r.anterior) : null,
    posterior: JSON.parse(r.posterior),
  }));
}
