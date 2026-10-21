import { classificationMovementImpact } from "./movement-impact";
import type { Database } from "bun:sqlite";
import { Schema } from "effect";
import { createHash } from "node:crypto";
import { entities, type Entity } from "./classification-schema";
import { Problem } from "./saldos";

export const annualMethods = ["Ingreso", "Gasto", "No aplica"];
export const monthlyMethods = [
  "Ingreso",
  "Gasto",
  "Gasto compartido neto",
  "No aplica",
];
export type Classification = {
  id: string;
  nombre: string;
  estado: "Activa" | "Inactiva";
  revision: number;
  padre: string | null;
  grupo: string | null;
  anual: string | null;
  mensual: string | null;
  referencia: boolean | null;
  categoria: { id: string; nombre: string } | null;
  subcategoria: { id: string; nombre: string } | null;
  integridad: string | null;
};
// Financial consumers must supply real checks when delivered, not simulated engines.
export type ClassificationGuard = (
  kind: Entity,
  id: string,
  changed: string[],
) => { blocked: boolean; reason?: string; used?: boolean };
type Row = {
  id: string;
  nombre: string;
  estado: "Activa" | "Inactiva";
  revision: number;
  padre?: string;
  grupo?: string | null;
  anual?: string | null;
  mensual?: string | null;
  referencia?: number | null;
};
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
export function entity(value: string): Entity {
  if (!Object.hasOwn(entities, value))
    throw new Problem(404, "NOT_FOUND", "Catálogo no encontrado.");
  return value as Entity;
}
function raw(db: Database, kind: Entity, id: string): Row {
  const row = db
    .query(`SELECT * FROM ${entities[kind].table} WHERE id=?`)
    .get(id) as Row | null;
  if (!row) throw new Problem(404, "NOT_FOUND", "Elemento no encontrado.");
  return row;
}
export function getClassification(
  db: Database,
  kind: Entity,
  id: string,
): Classification {
  const r = raw(db, kind, id);
  const sub = kind === "partidas" ? raw(db, "subcategorias", r.padre!) : null;
  const cat =
    kind === "categorias"
      ? null
      : raw(db, "categorias", sub ? sub.padre! : r.padre!);
  return {
    id: r.id,
    nombre: r.nombre,
    estado: r.estado,
    revision: r.revision,
    padre: r.padre ?? null,
    grupo: r.grupo ?? null,
    anual: r.anual ?? null,
    mensual: r.mensual ?? null,
    referencia: r.referencia == null ? null : r.referencia === 1,
    categoria: cat && { id: cat.id, nombre: cat.nombre },
    subcategoria: sub && { id: sub.id, nombre: sub.nombre },
    integridad:
      kind !== "subcategorias"
        ? null
        : !r.id
          ? "ERROR · ID no informado"
          : !r.nombre.trim()
            ? "ERROR · Nombre no informado"
            : (
                  db.query("SELECT id,nombre FROM subcategorias").all() as {
                    id: string;
                    nombre: string;
                  }[]
                ).some(
                  (other) =>
                    other.id !== r.id &&
                    other.nombre.toLowerCase() === r.nombre.toLowerCase(),
                )
              ? "ERROR · Subcategoría duplicada"
              : "OK",
  };
}
export function listClassification(
  db: Database,
  kind: Entity,
  params: URLSearchParams,
) {
  const page = Number(params.get("page") ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
    throw new Problem(422, "VALIDATION", "Página inválida.");
  const query = (params.get("q") ?? "").toLocaleLowerCase("es");
  const rows = (
    db.query(`SELECT id FROM ${entities[kind].table} ORDER BY id`).all() as {
      id: string;
    }[]
  )
    .map((r) => getClassification(db, kind, r.id))
    .filter(
      (r) =>
        (!(params.get("estado") ?? "Activa") ||
          r.estado === (params.get("estado") ?? "Activa")) &&
        (!params.get("categoria") ||
          (kind === "categorias" ? r.id : r.categoria?.id) ===
            params.get("categoria")) &&
        (!params.get("subcategoria") ||
          (kind === "subcategorias" ? r.id : r.subcategoria?.id) ===
            params.get("subcategoria")) &&
        `${r.id} ${r.nombre}`.toLocaleLowerCase("es").includes(query),
    );
  return {
    items: rows.slice((page - 1) * 100, page * 100),
    total: rows.length,
    page,
  };
}
export function descendants(db: Database, kind: Entity, id: string) {
  raw(db, kind, id);
  const result: { kind: Entity; id: string; nombre: string; estado: string }[] =
    [];
  if (kind === "partidas") return result;
  const child: Entity = kind === "categorias" ? "subcategorias" : "partidas";
  const rows = db
    .query(
      `SELECT id,nombre,estado FROM ${entities[child].table} WHERE padre=? ORDER BY id`,
    )
    .all(id) as Row[];
  for (const r of rows) {
    result.push({ kind: child, id: r.id, nombre: r.nombre, estado: r.estado });
    if (child === "subcategorias") result.push(...descendants(db, child, r.id));
  }
  return result;
}
const common = ["nombre"];
const categoryFields = ["grupo", "anual", "mensual", "referencia"];
function validate(
  db: Database,
  kind: Entity,
  body: Record<string, unknown>,
  old?: Classification,
  retryId?: string,
) {
  const fields = [
    ...common,
    ...(kind === "categorias" ? categoryFields : ["padre"]),
  ];
  const errors: Record<string, string> = {};
  for (const name of Object.keys(body))
    if (![...fields, "revision"].includes(name))
      errors[name] = "Campo no editable.";
  const v: Record<string, unknown> = {
    ...(old ?? { grupo: null, anual: null, mensual: null, referencia: null }),
    ...body,
  };
  if (
    !Schema.is(Schema.String)(v.nombre) ||
    !(v.nombre as string).trim() ||
    /[\u0000-\u001f\u007f]/.test(v.nombre as string)
  )
    errors.nombre = "Indica un nombre sin caracteres de control.";
  if (kind === "categorias") {
    if (
      v.grupo !== null &&
      (!Schema.is(Schema.String)(v.grupo) ||
        /[\u0000-\u001f\u007f]/.test(v.grupo as string))
    )
      errors.grupo = "Grupo debe ser texto.";
    for (const [name, choices] of [
      ["anual", annualMethods],
      ["mensual", monthlyMethods],
    ] as const) {
      // Missing legacy data is retained only when that field is not written.
      if ((!old || name in body) && !choices.includes(v[name] as string))
        errors[name] = "Selecciona un método válido.";
    }
    if (
      (!old || "referencia" in body) &&
      !Schema.is(Schema.Boolean)(v.referencia)
    )
      errors.referencia = "Elige Sí o No expresamente.";
  } else if (typeof v.padre !== "string" || !v.padre)
    errors.padre = "Selecciona un padre existente.";
  if (Object.keys(errors).length)
    throw new Problem(
      422,
      "VALIDATION",
      "Revisa los campos indicados.",
      errors,
    );
  if (kind !== "categorias") {
    const parent = raw(db, entities[kind].parent!, v.padre as string);
    if ((!old || old.padre !== v.padre) && parent.estado !== "Activa")
      throw new Problem(
        409,
        "INACTIVE_PARENT",
        "El padre debe estar activo para una nueva relación.",
      );
  }
  if (kind === "subcategorias" && (!old || old.nombre !== v.nombre)) {
    // Approved application comparator: Unicode lowercase, literal accents/spaces/wildcards.
    // The IMMEDIATE transaction serializes check + write, including cross-category names.
    const nameKey = (v.nombre as string).toLowerCase();
    const duplicate = (
      db.query("SELECT id,nombre FROM subcategorias").all() as {
        id: string;
        nombre: string;
      }[]
    ).some(
      (row) =>
        row.id !== (old?.id ?? retryId) && row.nombre.toLowerCase() === nameKey,
    );
    if (duplicate)
      throw new Problem(
        422,
        "DUPLICATE_NAME",
        "ERROR · Subcategoría duplicada",
        {
          nombre:
            "El nombre ya existe en el catálogo global (sin distinguir mayúsculas).",
        },
      );
  }
  const result: Record<string, unknown> = {};
  for (const f of fields) result[f] = v[f];
  return result;
}
function audit(
  db: Database,
  id: string,
  action: string,
  revision: number,
  changed: string[],
  now: number,
  reason: string | null = null,
) {
  db.run(
    "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,?,?,?,?,?,?,?)",
    [
      id,
      action,
      revision,
      JSON.stringify(changed),
      new Date(now).toISOString(),
      revision - 1,
      "usuario-unico",
      reason,
    ],
  );
}
export function createClassification(
  db: Database,
  kind: Entity,
  body: Record<string, unknown>,
  attempt: string,
  now = Date.now(),
) {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(attempt))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  return db
    .transaction(() => {
      db.run("DELETE FROM classification_attempts WHERE expires<?", [now]);
      const prev = db
        .query("SELECT * FROM classification_attempts WHERE key=?")
        .get(attempt) as { entidad: string; hash: string; id: string } | null;
      if (prev && prev.entidad !== kind)
        throw new Problem(
          409,
          "IDEMPOTENCY_CONFLICT",
          "El intento ya pertenece a otro catálogo.",
        );
      const v = validate(db, kind, body, undefined, prev?.id);
      if ("revision" in body)
        throw new Problem(422, "VALIDATION", "Revisión no admitida al crear.");
      const payload = hash(v);
      if (prev) {
        if (prev.entidad !== kind || prev.hash !== payload)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya tiene otros datos.",
          );
        return getClassification(db, kind, prev.id);
      }
      const counter = db
        .query(
          "UPDATE counters SET next=next+1 WHERE name=? AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
        )
        .get(kind) as { n: string } | null;
      if (!counter)
        throw new Problem(503, "ID_SPACE", "No se pudo reservar ID.");
      const id = entities[kind].prefix + counter.n.padStart(3, "0"),
        time = new Date(now).toISOString();
      if (kind === "categorias")
        db.run("INSERT INTO categorias VALUES(?,?,?,?,?,?,'Activa',1,?,?)", [
          id,
          v.nombre as string,
          v.grupo as string | null,
          v.anual as string,
          v.mensual as string,
          Number(v.referencia),
          time,
          time,
        ]);
      else
        db.run(
          `INSERT INTO ${entities[kind].table} VALUES(?,?,?,'Activa',1,?,?)`,
          [id, v.nombre as string, v.padre as string, time, time],
        );
      audit(db, id, "alta", 1, Object.keys(v), now);
      db.run("INSERT INTO classification_attempts VALUES(?,?,?,?,?)", [
        attempt,
        kind,
        payload,
        id,
        now + 86400000,
      ]);
      return getClassification(db, kind, id);
    })
    .immediate();
}
function revision(old: Classification, value: unknown) {
  if (!Number.isSafeInteger(value) || value !== old.revision)
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      "El elemento ha cambiado. Revisa su versión actual.",
    );
}
function snapshot(db: Database) {
  return Object.keys(entities).map((k) =>
    db.query(`SELECT * FROM ${entities[k as Entity].table} ORDER BY id`).all(),
  );
}
function impact(
  db: Database,
  kind: Entity,
  id: string,
  body: Record<string, unknown>,
  guard?: ClassificationGuard,
) {
  const old = getClassification(db, kind, id);
  revision(old, body.revision);
  const value = validate(db, kind, body, old);
  const changed = Object.keys(value).filter(
    (k) => value[k] !== old[k as keyof Classification],
  );
  const economic = changed.filter((k) =>
    ["padre", "anual", "mensual", "referencia"].includes(k),
  );
  const dependencies = descendants(db, kind, id);
  const financial = classificationMovementImpact(db, kind, id, value, economic);
  const protection = guard?.(kind, id, economic);
  if (protection?.blocked)
    throw new Problem(
      409,
      "HISTORY_LOCKED",
      protection.reason ?? "Rectificación financiera protegida.",
    );
  return {
    old,
    value,
    changed,
    economic,
    dependencies,
    used: financial?.used === true || protection?.used === true,
    financial,
    fingerprint: hash([kind, id, value, snapshot(db), financial?.revision]),
    coverage: financial
      ? "Catálogo y Movimientos comprobados. Otros consumidores financieros no comprobados; pendientes."
      : "Solo dependencias verificables del catálogo. Impacto financiero no comprobado; consumidores pendientes.",
    pending: [
      ...(financial ? [] : ["Movimientos"]),
      "Presupuestos",
      "Deudas",
      "Indicadores",
      "Cierres",
    ],
  };
}
export function previewClassification(
  db: Database,
  kind: Entity,
  id: string,
  body: Record<string, unknown>,
  guard?: ClassificationGuard,
) {
  return db.transaction(() => impact(db, kind, id, body, guard)).immediate();
}
export function updateClassification(
  db: Database,
  kind: Entity,
  id: string,
  body: Record<string, unknown>,
  guard?: ClassificationGuard,
  now = Date.now(),
  confirmation?: { fingerprint: unknown; motivo: unknown },
) {
  return db
    .transaction(() => {
      const plan = impact(db, kind, id, body, guard);
      // Used catalog branches require explicit review; unused records remain editable.
      if (
        plan.economic.length &&
        (plan.dependencies.length > 0 || plan.used) &&
        !confirmation
      )
        throw new Problem(
          409,
          "RECTIFICATION_REQUIRED",
          "Revisa las dependencias y confirma una rectificación explícita.",
        );
      if (confirmation) {
        if (confirmation.fingerprint !== plan.fingerprint)
          throw new Problem(
            409,
            "IMPACT_CHANGED",
            "Las dependencias han cambiado. Genera otra vista previa.",
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
            "Indica un motivo sin caracteres de control.",
            { motivo: "Motivo obligatorio (máximo 2000 caracteres)." },
          );
      }
      if (!plan.changed.length) return plan.old;
      const v = plan.value;
      if (kind === "categorias")
        db.run(
          "UPDATE categorias SET nombre=?,grupo=?,anual=?,mensual=?,referencia=?,revision=revision+1,actualizado=? WHERE id=?",
          [
            v.nombre as string,
            v.grupo as string | null,
            v.anual as string | null,
            v.mensual as string | null,
            v.referencia === null ? null : Number(v.referencia),
            new Date(now).toISOString(),
            id,
          ],
        );
      else
        db.run(
          `UPDATE ${entities[kind].table} SET nombre=?,padre=?,revision=revision+1,actualizado=? WHERE id=?`,
          [
            v.nombre as string,
            v.padre as string,
            new Date(now).toISOString(),
            id,
          ],
        );
      audit(
        db,
        id,
        confirmation ? "rectificación" : "edición",
        plan.old.revision + 1,
        plan.changed,
        now,
        confirmation ? (confirmation.motivo as string).trim() : null,
      );
      return getClassification(db, kind, id);
    })
    .immediate();
}
export function changeClassificationState(
  db: Database,
  kind: Entity,
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
          "Solo se admite revisión para cambiar Estado.",
        );
      const old = getClassification(db, kind, id);
      revision(old, body.revision);
      if (!active) {
        const deps = descendants(db, kind, id).filter(
          (d) => d.estado === "Activa",
        );
        if (deps.length)
          throw new Problem(
            409,
            "ACTIVE_DESCENDANTS",
            "Desactiva primero: " +
              deps.map((d) => `${d.id} · ${d.nombre}`).join(", "),
          );
      } else if (
        kind !== "categorias" &&
        raw(db, entities[kind].parent!, old.padre!).estado !== "Activa"
      )
        throw new Problem(409, "INACTIVE_PARENT", "Reactiva primero el padre.");
      const state = active ? "Activa" : "Inactiva";
      if (old.estado === state) return old;
      db.run(
        `UPDATE ${entities[kind].table} SET estado=?,revision=revision+1,actualizado=? WHERE id=?`,
        [state, new Date(now).toISOString(), id],
      );
      audit(
        db,
        id,
        active ? "reactivación" : "desactivación",
        old.revision + 1,
        ["estado"],
        now,
      );
      return getClassification(db, kind, id);
    })
    .immediate();
}
