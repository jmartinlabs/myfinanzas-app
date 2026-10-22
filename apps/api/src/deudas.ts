import type { Database } from "bun:sqlite";
import { Problem, money, decimal } from "./saldos";
import { civil } from "./ciclos";
import { fingerprint } from "./movement-ledger";
export type Debt = {
  id: string;
  nombre: string;
  inicioControl: string | null;
  capitalApertura: string | null;
  capitalPendiente: string | null;
  estado: string;
  revision: number;
  creado: string;
  actualizado: string;
};
export function debtUsage(db: Database, id: string) {
  return db
    .query(
      "SELECT m.id,m.fecha,m.tipo,m.anulado FROM movimientos m JOIN partidas p ON p.id=m.partida WHERE p.deuda=? ORDER BY m.fecha,length(m.id),m.id",
    )
    .all(id);
}
export function getDebt(db: Database, id: string): Debt {
  const r = db
    .query(
      "SELECT id,nombre,inicio,CAST(apertura AS TEXT) apertura,estado,revision,creado,actualizado FROM deudas WHERE id=?",
    )
    .get(id) as any;
  if (!r) throw new Problem(404, "NOT_FOUND", "Deuda no encontrada.");
  let remaining: bigint | null =
    r.apertura === null || r.inicio === null ? null : BigInt(r.apertura);
  if (remaining !== null)
    for (const m of db
      .query(
        "SELECT CAST(m.capital AS TEXT) capital FROM movimientos m JOIN partidas p ON p.id=m.partida WHERE p.deuda=? AND m.anulado=0 AND m.fecha>=?",
      )
      .all(id, r.inicio) as { capital: string | null }[])
      remaining -= BigInt(m.capital ?? "0");
  return {
    id: r.id,
    nombre: r.nombre,
    inicioControl: r.inicio,
    capitalApertura: decimal(r.apertura),
    capitalPendiente: remaining === null ? null : decimal(remaining.toString()),
    estado: r.estado,
    revision: r.revision,
    creado: r.creado,
    actualizado: r.actualizado,
  };
}
export function listDebts(db: Database, p = new URLSearchParams()) {
  return db.transaction(() => {
    const page = Number(p.get("page") ?? 1),
      state = p.get("estado") ?? "Activa";
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !["", "Activa", "Inactiva"].includes(state)
    )
      throw new Problem(422, "VALIDATION", "Filtro inválido.");
    const q = (p.get("q") ?? "").toLocaleLowerCase("es");
    const all = (
      db.query("SELECT id FROM deudas ORDER BY length(id),id").all() as {
        id: string;
      }[]
    )
      .map((r) => getDebt(db, r.id))
      .filter(
        (r) =>
          (!state || r.estado === state) &&
          `${r.id} ${r.nombre}`.toLocaleLowerCase("es").includes(q),
      );
    return {
      items: all.slice((page - 1) * 100, page * 100),
      total: all.length,
      page,
    };
  })();
}
function fields(body: Record<string, unknown>, old?: Debt) {
  for (const k of Object.keys(body))
    if (
      ![
        "nombre",
        "inicioControl",
        "capitalApertura",
        ...(old ? ["revision", "estado"] : []),
      ].includes(k)
    )
      throw new Problem(422, "VALIDATION", "Campo no editable: " + k);
  const v = { ...old, ...body };
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
  // New calculable debts require explicit opening. Legacy absence remains absence when not edited.
  if (!old || "inicioControl" in body) civil(v.inicioControl);
  if (!old || "capitalApertura" in body) {
    if (
      typeof v.capitalApertura !== "string" ||
      money(v.capitalApertura) === null
    )
      throw new Problem(422, "VALIDATION", "Apertura EUR explícita y exacta.", {
        capitalApertura: "Indica la apertura, sin redondear.",
      });
  }
  if (old && !["Activa", "Inactiva"].includes(v.estado as string))
    throw new Problem(422, "VALIDATION", "Estado inválido.");
  return v as Debt;
}
export function createDebt(
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
      db.run("DELETE FROM debt_attempts WHERE expires<?", [now]);
      const retry = db
        .query("SELECT hash,response FROM debt_attempts WHERE key=?")
        .get(key) as any;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as Debt;
      }
      const v = fields(body),
        n = db
          .query(
            "UPDATE counters SET next=next+1 WHERE name='deudas' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
          )
          .get() as { n: string } | null;
      if (!n)
        throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
      const id = "D" + n.n.padStart(3, "0"),
        time = new Date(now).toISOString();
      db.run("INSERT INTO deudas VALUES(?,?,?,?,'Activa',1,?,?)", [
        id,
        v.nombre,
        v.inicioControl,
        money(v.capitalApertura),
        time,
        time,
      ]);
      db.run(
        "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,'alta',1,?,?,0,'usuario-unico',NULL)",
        [id, JSON.stringify(Object.keys(body)), time],
      );
      const r = getDebt(db, id);
      db.run("INSERT INTO debt_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(r),
        now + 86400000,
      ]);
      return r;
    })
    .immediate();
}
export function updateDebt(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db
    .transaction(() => {
      const old = getDebt(db, id);
      if (body.revision !== old.revision)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "La Deuda ha cambiado. Revisa su ficha; tu borrador se conserva.",
        );
      const v = fields(body, old);
      if (
        (v.inicioControl !== old.inicioControl ||
          v.capitalApertura !== old.capitalApertura) &&
        debtUsage(db, id).length
      )
        throw new Problem(
          409,
          "HISTORY_LOCKED",
          "Apertura e Inicio control protegidos: Deuda utilizada.",
        );
      db.run(
        "UPDATE deudas SET nombre=?,inicio=?,apertura=?,estado=?,revision=revision+1,actualizado=? WHERE id=?",
        [
          v.nombre,
          v.inicioControl,
          money(v.capitalApertura),
          v.estado,
          new Date(now).toISOString(),
          id,
        ],
      );
      const next = getDebt(db, id);
      db.run(
        "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,'edición',?,?,?,?, 'usuario-unico',?)",
        [
          id,
          next.revision,
          JSON.stringify({ anterior: old, posterior: next }),
          new Date(now).toISOString(),
          old.revision,
          "Identidad preservada",
        ],
      );
      return next;
    })
    .immediate();
}
