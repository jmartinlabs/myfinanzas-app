import type { Database } from "bun:sqlite";
import { Problem } from "./saldos";
import { fingerprint } from "./movement-ledger";

export const budgetSources = [
  "Gasto real",
  "Aportación a saldo",
  "No aplica",
] as const;
export type Budget = {
  id: string;
  nombre: string;
  fuente: string;
  destino: string | null;
  estado: "Activo" | "Inactivo";
  revision: number;
  creado: string;
  actualizado: string;
  saldoDestino: { id: string; nombre: string; estado: string } | null;
};
export function budgetUsage(db: Database, id: string) {
  return db
    .query(
      "SELECT m.id,m.fecha,m.tipo,m.anulado,p.id partida FROM movimientos m JOIN partidas p ON p.id=m.partida WHERE p.presupuesto=? ORDER BY m.fecha,length(m.id),m.id",
    )
    .all(id);
}
export function budgetParts(db: Database, id: string) {
  return db
    .query(
      "SELECT id,nombre,estado,deuda FROM partidas WHERE presupuesto=? ORDER BY id",
    )
    .all(id);
}
export function getBudget(db: Database, id: string): Budget {
  const row = db.query("SELECT * FROM presupuestos WHERE id=?").get(id) as Omit<
    Budget,
    "saldoDestino"
  > | null;
  if (!row) throw new Problem(404, "NOT_FOUND", "Presupuesto no encontrado.");
  return {
    ...row,
    saldoDestino: row.destino
      ? (db
          .query("SELECT id,nombre,estado FROM saldos WHERE id=?")
          .get(row.destino) as Budget["saldoDestino"])
      : null,
  };
}
export function listBudgets(db: Database, params = new URLSearchParams()) {
  const page = Number(params.get("page") ?? 1),
    estado = params.get("estado") ?? "Activo",
    fuente = params.get("fuente") ?? "",
    destino = params.get("destino") ?? "";
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !["", "Activo", "Inactivo"].includes(estado) ||
    (fuente && !budgetSources.includes(fuente as any))
  )
    throw new Problem(422, "VALIDATION", "Filtros de Presupuestos inválidos.");
  const q = (params.get("q") ?? "").toLowerCase();
  return db.transaction(() => {
    const all = (
      db.query("SELECT id FROM presupuestos ORDER BY length(id),id").all() as {
        id: string;
      }[]
    )
      .map((r) => getBudget(db, r.id))
      .filter(
        (r) =>
          (!estado || r.estado === estado) &&
          (!fuente || r.fuente === fuente) &&
          (!destino || r.destino === destino) &&
          `${r.id} ${r.nombre}`.toLowerCase().includes(q),
      );
    return {
      items: all.slice((page - 1) * 100, page * 100),
      total: all.length,
      page,
    };
  })();
}
function fields(db: Database, body: Record<string, unknown>, old?: Budget) {
  for (const k of Object.keys(body))
    if (
      !["nombre", "fuente", "destino", ...(old ? ["revision"] : [])].includes(k)
    )
      throw new Problem(422, "VALIDATION", "Campo no editable: " + k);
  const v: Record<string, unknown> = { ...(old ?? { destino: null }), ...body };
  if (
    typeof v.nombre !== "string" ||
    !v.nombre.trim() ||
    v.nombre.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(v.nombre)
  )
    throw new Problem(
      422,
      "VALIDATION",
      "Nombre obligatorio, máximo 120 caracteres.",
      { nombre: "Indica un nombre válido." },
    );
  // Same approved comparator as SUB: no trim, accent removal, LIKE or normalization.
  if (
    (
      db.query("SELECT id,nombre FROM presupuestos").all() as {
        id: string;
        nombre: string;
      }[]
    ).some(
      (r) =>
        r.id !== old?.id &&
        r.nombre.toLowerCase() === (v.nombre as string).toLowerCase(),
    )
  )
    throw new Problem(
      422,
      "DUPLICATE_NAME",
      "El nombre ya existe, incluidos Presupuestos inactivos.",
      { nombre: "Nombre duplicado sin distinguir mayúsculas." },
    );
  if (!budgetSources.includes(v.fuente as any))
    throw new Problem(422, "VALIDATION", "Selecciona una fuente vigente.", {
      fuente: "Fuente obligatoria: Gasto real, Aportación a saldo o No aplica.",
    });
  if (v.fuente === "No aplica") {
    if (v.destino !== null)
      throw new Problem(
        422,
        "VALIDATION",
        "No aplica requiere destino vacío.",
        { destino: "Retira el destino expresamente." },
      );
  } else {
    if (typeof v.destino !== "string" || !v.destino || v.destino === "S000")
      throw new Problem(
        422,
        "VALIDATION",
        "Saldo destino interno obligatorio.",
        { destino: "Selecciona un Saldo interno activo." },
      );
    const saldo = db
      .query("SELECT id,estado FROM saldos WHERE id=?")
      .get(v.destino) as { id: string; estado: string } | null;
    if (
      !saldo ||
      ((!old || old.destino !== v.destino) && saldo.estado !== "Activa")
    )
      throw new Problem(
        422,
        "INVALID_DESTINATION",
        "Selecciona un Saldo interno activo.",
        { destino: "Destino inexistente o inactivo para nueva relación." },
      );
    if (
      v.fuente === "Aportación a saldo" &&
      db
        .query(
          "SELECT id FROM presupuestos WHERE fuente='Aportación a saldo' AND destino=? AND id!=?",
        )
        .get(v.destino, old?.id ?? "")
    )
      throw new Problem(
        422,
        "DESTINATION_USED",
        "Otra Aportación a saldo ya utiliza este destino.",
        {
          destino:
            "Destino único entre Aportaciones a saldo, incluidos inactivos.",
        },
      );
  }
  return {
    nombre: v.nombre as string,
    fuente: v.fuente as string,
    destino: v.destino as string | null,
  };
}
function audit(
  db: Database,
  item: Budget,
  old: Budget | null,
  action: string,
  now: number,
  motivo: string | null = null,
) {
  db.run(
    "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,?,?,?,?,?,'usuario-unico',?)",
    [
      item.id,
      action,
      item.revision,
      JSON.stringify({ anterior: old, posterior: item }),
      new Date(now).toISOString(),
      old?.revision ?? 0,
      motivo,
    ],
  );
}
export function createBudget(
  db: Database,
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
  const hash = fingerprint(
    Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
  );
  return db
    .transaction(() => {
      db.run("DELETE FROM budget_attempts WHERE expires<?", [now]);
      const retry = db
        .query("SELECT hash,response FROM budget_attempts WHERE key=?")
        .get(key) as any;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as Budget;
      }
      const v = fields(db, body),
        n = db
          .query(
            "UPDATE counters SET next=next+1 WHERE name='presupuestos' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
          )
          .get() as { n: string } | null;
      if (!n)
        throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
      const id = "PRE" + n.n.padStart(3, "0"),
        time = new Date(now).toISOString();
      db.run("INSERT INTO presupuestos VALUES(?,?,?,?,'Activo',1,?,?)", [
        id,
        v.nombre,
        v.fuente,
        v.destino,
        time,
        time,
      ]);
      const item = getBudget(db, id);
      audit(db, item, null, "alta", now);
      db.run("INSERT INTO budget_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(item),
        now + 86400000,
      ]);
      return item;
    })
    .immediate();
}
function plan(db: Database, id: string, body: Record<string, unknown>) {
  const old = getBudget(db, id);
  if (!Number.isSafeInteger(body.revision) || body.revision !== old.revision)
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      "El Presupuesto ha cambiado. Revisa su ficha; tu borrador se conserva.",
    );
  const value = fields(db, body, old),
    economic = value.fuente !== old.fuente || value.destino !== old.destino,
    usos = budgetUsage(db, id),
    partidas = budgetParts(db, id);
  // E2.3 does not exist. Existing history cannot be attributed completely by a fake total.
  const blocked = economic && usos.length > 0;
  return {
    old,
    value,
    economic,
    usos,
    partidas,
    blocked,
    coverage: blocked
      ? "Impacto histórico completo no verificable: motor presupuestario E2.3 pendiente."
      : "Relaciones y ausencia de hechos utilizados verificadas; sin cálculo de ejecución.",
    pending: blocked ? ["E2.3"] : [],
    fingerprint: fingerprint([old, value, partidas, usos]),
  };
}
export function previewBudget(
  db: Database,
  id: string,
  body: Record<string, unknown>,
) {
  return db.transaction(() => plan(db, id, body)).immediate();
}
export function updateBudget(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
  confirmation?: { fingerprint: unknown; motivo: unknown },
) {
  return db
    .transaction(() => {
      const p = plan(db, id, body);
      if (p.blocked) throw new Problem(409, "HISTORY_LOCKED", p.coverage);
      if (p.economic && p.partidas.length && !confirmation)
        throw new Problem(
          409,
          "RECTIFICATION_REQUIRED",
          "Revisa las relaciones utilizadas y confirma el cambio.",
        );
      if (confirmation) {
        if (confirmation.fingerprint !== p.fingerprint)
          throw new Problem(
            409,
            "IMPACT_CHANGED",
            "El impacto ha cambiado; genera otra revisión.",
          );
        if (
          typeof confirmation.motivo !== "string" ||
          !confirmation.motivo.trim() ||
          confirmation.motivo.length > 2000 ||
          /[\u0000-\u001f\u007f]/.test(confirmation.motivo)
        )
          throw new Problem(
            422,
            "VALIDATION",
            "Motivo obligatorio, máximo 2000 caracteres.",
            { motivo: "Indica el motivo del cambio." },
          );
      }
      if (p.old.nombre === p.value.nombre && !p.economic) return p.old;
      db.run(
        "UPDATE presupuestos SET nombre=?,fuente=?,destino=?,revision=revision+1,actualizado=? WHERE id=?",
        [
          p.value.nombre,
          p.value.fuente,
          p.value.destino,
          new Date(now).toISOString(),
          id,
        ],
      );
      const item = getBudget(db, id);
      audit(
        db,
        item,
        p.old,
        confirmation ? "rectificación" : "edición",
        now,
        confirmation ? String(confirmation.motivo).trim() : null,
      );
      return item;
    })
    .immediate();
}
export function changeBudgetState(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  active: boolean,
  now = Date.now(),
) {
  return db
    .transaction(() => {
      if (Object.keys(body).some((k) => k !== "revision"))
        throw new Problem(
          422,
          "VALIDATION",
          "Solo revisión para cambiar Estado.",
        );
      const old = getBudget(db, id);
      if (body.revision !== old.revision)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "El Presupuesto ha cambiado.",
        );
      if (
        !active &&
        (budgetParts(db, id) as { estado: string }[]).some(
          (p) => p.estado === "Activa",
        )
      )
        throw new Problem(
          409,
          "ACTIVE_PARTS",
          "Desactiva o desvincula primero las Partidas activas; sin cascadas.",
        );
      const estado = active ? "Activo" : "Inactivo";
      if (estado === old.estado) return old;
      db.run(
        "UPDATE presupuestos SET estado=?,revision=revision+1,actualizado=? WHERE id=?",
        [estado, new Date(now).toISOString(), id],
      );
      const item = getBudget(db, id);
      audit(db, item, old, active ? "reactivación" : "desactivación", now);
      return item;
    })
    .immediate();
}
