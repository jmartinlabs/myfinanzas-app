import type { Database } from "bun:sqlite";
import { Problem } from "./saldos";
import { fingerprint } from "./movement-ledger";
import { getReference, operationalReferenceTypes } from "./reference-rules";
export { getReference } from "./reference-rules";
export function referenceUsage(db: Database, id: string) {
  getReference(db, id);
  return db
    .query(
      "SELECT id,fecha,tipo,anulado FROM movimientos WHERE referencia=? ORDER BY fecha DESC,length(id) DESC,id DESC",
    )
    .all(id) as { id: string; fecha: string; tipo: string; anulado: number }[];
}
export function listReferences(db: Database, params = new URLSearchParams()) {
  return db.transaction(() => {
    const page = Number(params.get("page") ?? 1),
      estado = params.get("estado") ?? "Activa",
      tipo = params.get("tipo") ?? "";
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !["", "Activa", "Inactiva"].includes(estado) ||
      !["", ...operationalReferenceTypes].includes(tipo)
    )
      throw new Problem(422, "VALIDATION", "Filtro o página inválidos.");
    const q = (params.get("q") ?? "").toLocaleLowerCase("es");
    const all = (
      db.query("SELECT id FROM referencias ORDER BY length(id),id").all() as {
        id: string;
      }[]
    )
      .map((r) => getReference(db, r.id))
      .filter(
        (r) =>
          (!estado || r.estado === estado) &&
          (!tipo || r.tipo === tipo) &&
          `${r.id} ${r.nombre}`.toLocaleLowerCase("es").includes(q),
      );
    return {
      items: all.slice((page - 1) * 100, page * 100),
      total: all.length,
      page,
    };
  })();
}
function fields(body: Record<string, unknown>, creating: boolean) {
  const allowed = creating
    ? ["nombre", "tipo"]
    : ["nombre", "tipo", "estado", "revision"];
  for (const key of Object.keys(body))
    if (!allowed.includes(key))
      throw new Problem(422, "VALIDATION", "Campo no editable: " + key);
  if (
    (creating || "nombre" in body) &&
    (typeof body.nombre !== "string" ||
      !body.nombre.trim() ||
      body.nombre.length > 120 ||
      /[\u0000-\u001f\u007f]/.test(body.nombre))
  )
    throw new Problem(
      422,
      "VALIDATION",
      "Nombre obligatorio, máximo 120 caracteres.",
      { nombre: "Indica un nombre válido." },
    );
  if (
    (creating || "tipo" in body) &&
    !operationalReferenceTypes.includes(
      body.tipo as (typeof operationalReferenceTypes)[number],
    )
  )
    throw new Problem(
      422,
      "REFERENCE_UNAVAILABLE",
      "Viaje, Evento, Anticipo y Gasto compartido disponibles; otros Tipos esperan sus fichas E3.",
      { tipo: "Selecciona Viaje, Evento, Anticipo o Gasto compartido." },
    );
  if (
    "estado" in body &&
    !["Activa", "Inactiva"].includes(body.estado as string)
  )
    throw new Problem(422, "VALIDATION", "Estado inválido.");
}
export function createReference(
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
      db.run("DELETE FROM reference_attempts WHERE expires<?", [now]);
      const retry = db
        .query("SELECT hash,response FROM reference_attempts WHERE key=?")
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (hash !== retry.hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as ReturnType<typeof getReference>;
      }
      fields(body, true);
      const n = db
        .query(
          "UPDATE counters SET next=next+1 WHERE name='referencias' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
        )
        .get() as { n: string } | null;
      if (!n)
        throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
      const id = "REF" + n.n.padStart(3, "0"),
        time = new Date(now).toISOString();
      db.run("INSERT INTO referencias VALUES(?,?,?,'Activa',1,?,?)", [
        id,
        body.nombre as string,
        body.tipo as string,
        time,
        time,
      ]);
      if (body.tipo === "Anticipo")
        db.run("INSERT INTO fichas_anticipos VALUES(?,NULL,NULL,?,?)", [
          id,
          time,
          time,
        ]);
      if (body.tipo === "Gasto compartido") {
        db.run("INSERT INTO fichas_compartidos VALUES(?,1,?,?)", [
          id,
          time,
          time,
        ]);
        db.run(
          "INSERT INTO compartido_audit(referencia,accion,anterior,posterior,motivo,instante,actor) VALUES(?,'alta ficha',NULL,?,NULL,?,'usuario-unico')",
          [id, JSON.stringify({ revision: 1 }), time],
        );
      }
      db.run(
        "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,'alta',1,?,?,0,'usuario-unico',NULL)",
        [id, JSON.stringify(["nombre", "tipo", "estado"]), time],
      );
      const r = getReference(db, id);
      db.run("INSERT INTO reference_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(r),
        now + 86400000,
      ]);
      return r;
    })
    .immediate();
}
export function updateReference(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db
    .transaction(() => {
      fields(body, false);
      const old = getReference(db, id);
      if (body.revision !== old.revision)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "La Referencia ha cambiado. Actualiza su ficha; tu borrador se conserva.",
        );
      if (
        "tipo" in body &&
        body.tipo !== old.tipo &&
        (old.tipo === "Anticipo" ||
          body.tipo === "Anticipo" ||
          old.tipo === "Gasto compartido" ||
          body.tipo === "Gasto compartido" ||
          referenceUsage(db, id).length)
      )
        throw new Problem(
          409,
          "HISTORY_LOCKED",
          "Tipo protegido: la Referencia ya está utilizada o tiene ficha 1:1, incluso en hechos anulados.",
        );
      const next = { ...old, ...body },
        time = new Date(now).toISOString();
      db.run(
        "UPDATE referencias SET nombre=?,tipo=?,estado=?,revision=revision+1,actualizado=? WHERE id=?",
        [next.nombre, next.tipo, next.estado, time, id],
      );
      db.run(
        "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,'edición',?,?,?,?, 'usuario-unico',?)",
        [
          id,
          old.revision + 1,
          JSON.stringify({ anterior: old, posterior: getReference(db, id) }),
          time,
          old.revision,
          "Cambios de catálogo; identidad preservada",
        ],
      );
      return getReference(db, id);
    })
    .immediate();
}
