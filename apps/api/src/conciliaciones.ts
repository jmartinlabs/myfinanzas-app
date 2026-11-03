import type { Database } from "bun:sqlite";
import { Problem } from "./problem";
import { decimal, money } from "./saldos";
import { civil, spanishToday } from "./investment-engine";
import { fingerprint } from "./movement-ledger";

/**
 * E4.4 conciliación register. Only the declared external balance, its civil
 * cut-off date and its evidence are persisted. Derived values (difference and
 * state) are always calculated by the read model in `deuda-completa.ts`.
 *
 * There is no DELETE: an annulled row is conserved and audited. Creation is
 * idempotent through `conciliacion_attempts`; every edit requires the current
 * revision and a motive.
 */
export type Conciliacion = {
  id: string;
  deuda: string;
  fechaCorte: string;
  capitalDeclarado: string;
  fuente: string | null;
  nota: string | null;
  estado: "Vigente" | "Anulada";
  revision: number;
  creado: string;
  actualizado: string;
};

type ConciliationRow = {
  id: string;
  deuda: string;
  fecha_corte: string;
  capital_declarado: string;
  fuente: string | null;
  nota: string | null;
  estado: "Vigente" | "Anulada";
  revision: number;
  creado: string;
  actualizado: string;
};

const SELECT = `SELECT id,deuda,fecha_corte,CAST(capital_declarado AS TEXT) capital_declarado,
  fuente,nota,estado,revision,creado,actualizado FROM conciliaciones_deuda`;
const CREATE_KEYS = ["fechaCorte", "capitalDeclarado", "fuente", "nota"];
const PATCH_KEYS = [
  "revision",
  "motivo",
  "fechaCorte",
  "capitalDeclarado",
  "fuente",
  "nota",
  "estado",
];

function dto(row: ConciliationRow): Conciliacion {
  return {
    id: row.id,
    deuda: row.deuda,
    fechaCorte: row.fecha_corte,
    capitalDeclarado: decimal(row.capital_declarado)!,
    fuente: row.fuente,
    nota: row.nota,
    estado: row.estado,
    revision: row.revision,
    creado: row.creado,
    actualizado: row.actualizado,
  };
}

function findRow(db: Database, deuda: string, id: string): ConciliationRow {
  const row = db
    .query(SELECT + " WHERE id=? AND deuda=?")
    .get(id, deuda) as ConciliationRow | null;
  if (!row) throw new Problem(404, "NOT_FOUND", "Conciliación no encontrada.");
  return row;
}

export function getConciliacion(
  db: Database,
  deuda: string,
  id: string,
): Conciliacion {
  return dto(findRow(db, deuda, id));
}

function assertDebt(db: Database, id: string) {
  if (!db.query("SELECT id FROM deudas WHERE id=?").get(id))
    throw new Problem(404, "NOT_FOUND", "Deuda no encontrada.");
}

function fechaCorteValue(value: unknown, now: number): string {
  const fecha = civil(value, "fechaCorte");
  if (fecha > spanishToday(now))
    throw new Problem(
      422,
      "VALIDATION",
      "La fecha de corte no puede ser futura.",
      { fechaCorte: "Indica una fecha civil no futura." },
    );
  return fecha;
}

function declaredValue(value: unknown): bigint {
  const cents = money(value);
  if (cents === null)
    throw new Problem(
      422,
      "VALIDATION",
      "Saldo declarado EUR explícito y exacto.",
      { capitalDeclarado: "Indica el saldo declarado, sin redondear." },
    );
  return cents;
}

function evidenceText(
  value: unknown,
  field: "fuente" | "nota",
  max: number,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || [...value].length > max)
    throw new Problem(
      422,
      "VALIDATION",
      `Texto de ${max} caracteres como máximo.`,
      { [field]: `Máximo ${max} caracteres.` },
    );
  return value;
}

function motivoValue(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new Problem(422, "VALIDATION", "Motivo obligatorio.", {
      motivo: "Indica el motivo de la corrección o anulación.",
    });
  return value.trim();
}

function createFields(body: Record<string, unknown>, now: number) {
  for (const k of Object.keys(body))
    if (!CREATE_KEYS.includes(k))
      throw new Problem(422, "VALIDATION", "Campo no editable: " + k);
  return {
    fechaCorte: fechaCorteValue(body.fechaCorte, now),
    capitalDeclarado: declaredValue(body.capitalDeclarado),
    fuente: evidenceText(body.fuente, "fuente", 200),
    nota: evidenceText(body.nota, "nota", 1000),
  };
}

function updateFields(
  body: Record<string, unknown>,
  old: ConciliationRow,
  now: number,
) {
  for (const k of Object.keys(body))
    if (!PATCH_KEYS.includes(k))
      throw new Problem(422, "VALIDATION", "Campo no editable: " + k);
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key),
    motivo = motivoValue(body.motivo);
  if (has("estado") && !["Vigente", "Anulada"].includes(body.estado as string))
    throw new Problem(422, "VALIDATION", "Estado de conciliación inválido.", {
      estado: "Vigente o Anulada según la operación.",
    });
  if (body.estado === "Anulada") {
    const changed =
      (has("fechaCorte") &&
        fechaCorteValue(body.fechaCorte, now) !== old.fecha_corte) ||
      (has("capitalDeclarado") &&
        declaredValue(body.capitalDeclarado) !==
          BigInt(old.capital_declarado)) ||
      (has("fuente") &&
        evidenceText(body.fuente, "fuente", 200) !== old.fuente) ||
      (has("nota") && evidenceText(body.nota, "nota", 1000) !== old.nota);
    if (changed)
      throw new Problem(
        422,
        "VALIDATION",
        "La anulación no admite cambios del saldo declarado.",
        { estado: "Corrige y anula en operaciones separadas." },
      );
    return {
      accion: "anulación" as const,
      fechaCorte: old.fecha_corte,
      capitalDeclarado: BigInt(old.capital_declarado),
      fuente: old.fuente,
      nota: old.nota,
      estado: "Anulada" as const,
      motivo,
    };
  }
  if (!["fechaCorte", "capitalDeclarado", "fuente", "nota"].some(has))
    throw new Problem(
      422,
      "VALIDATION",
      "Indica al menos un campo a corregir.",
      { motivo: "La corrección necesita un cambio." },
    );
  return {
    accion: "corrección" as const,
    fechaCorte: has("fechaCorte")
      ? fechaCorteValue(body.fechaCorte, now)
      : old.fecha_corte,
    capitalDeclarado: has("capitalDeclarado")
      ? declaredValue(body.capitalDeclarado)
      : BigInt(old.capital_declarado),
    fuente: has("fuente")
      ? evidenceText(body.fuente, "fuente", 200)
      : old.fuente,
    nota: has("nota") ? evidenceText(body.nota, "nota", 1000) : old.nota,
    estado: "Vigente" as const,
    motivo,
  };
}

function reserveId(db: Database): string {
  for (let attempt = 0; attempt < 10000; attempt++) {
    const n = db
      .query(
        "UPDATE counters SET next=next+1 WHERE name='conciliaciones_deuda' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
      )
      .get() as { n: string } | null;
    if (!n)
      throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
    const id = "C" + n.n.padStart(3, "0");
    if (!db.query("SELECT id FROM conciliaciones_deuda WHERE id=?").get(id))
      return id;
  }
  throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
}

function vigenteAt(
  db: Database,
  deuda: string,
  fechaCorte: string,
  exclude: string | null = null,
) {
  return db
    .query(
      "SELECT id FROM conciliaciones_deuda WHERE deuda=? AND fecha_corte=? AND estado='Vigente' AND id<>?",
    )
    .get(deuda, fechaCorte, exclude ?? "");
}

function duplicateProblem(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (
    /SQLITE_CONSTRAINT/.test(
      (error as { code?: string } | null)?.code ?? "",
    ) ||
    /UNIQUE constraint failed: conciliaciones_deuda/.test(message)
  )
    throw new Problem(
      409,
      "DUPLICATE_CONCILIATION",
      "Ya existe una conciliación vigente para esa Deuda y fecha.",
    );
  throw error;
}

export function createConciliacion(
  db: Database,
  deuda: string,
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
    deuda,
    Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
  ]);
  return db
    .transaction(() => {
      assertDebt(db, deuda);
      db.run("DELETE FROM conciliacion_attempts WHERE expires<?", [now]);
      const retry = db
        .query("SELECT hash,response FROM conciliacion_attempts WHERE key=?")
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as Conciliacion;
      }
      const v = createFields(body, now);
      if (vigenteAt(db, deuda, v.fechaCorte))
        throw new Problem(
          409,
          "DUPLICATE_CONCILIATION",
          "Ya existe una conciliación vigente para esa Deuda y fecha.",
        );
      const id = reserveId(db),
        time = new Date(now).toISOString();
      try {
        db.run(
          "INSERT INTO conciliaciones_deuda(id,deuda,fecha_corte,capital_declarado,fuente,nota,estado,revision,actor,creado,actualizado) VALUES(?,?,?,?,?,?,'Vigente',1,'usuario-unico',?,?)",
          [
            id,
            deuda,
            v.fechaCorte,
            v.capitalDeclarado,
            v.fuente,
            v.nota,
            time,
            time,
          ],
        );
      } catch (error) {
        duplicateProblem(error);
      }
      const item = dto(findRow(db, deuda, id));
      db.run(
        "INSERT INTO conciliaciones_deuda_audit(conciliacion,accion,revision,anterior,posterior,motivo,instante,actor) VALUES(?,'alta',1,NULL,?,NULL,?,'usuario-unico')",
        [id, JSON.stringify(item), time],
      );
      db.run("INSERT INTO conciliacion_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(item),
        now + 86400000,
      ]);
      return item;
    })
    .immediate();
}

export function updateConciliacion(
  db: Database,
  deuda: string,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db
    .transaction(() => {
      const old = findRow(db, deuda, id);
      if (body.revision !== old.revision)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "La conciliación ha cambiado. Vuelve a cargarla.",
        );
      if (old.estado === "Anulada")
        throw new Problem(
          409,
          "CONCILIATION_ANNULLED",
          "La conciliación está anulada y no se edita.",
        );
      const v = updateFields(body, old, now);
      if (v.estado === "Vigente" && vigenteAt(db, deuda, v.fechaCorte, id))
        throw new Problem(
          409,
          "DUPLICATE_CONCILIATION",
          "Ya existe una conciliación vigente para esa Deuda y fecha.",
        );
      const time = new Date(now).toISOString();
      try {
        db.run(
          "UPDATE conciliaciones_deuda SET fecha_corte=?,capital_declarado=?,fuente=?,nota=?,estado=?,revision=revision+1,actualizado=? WHERE id=? AND deuda=?",
          [
            v.fechaCorte,
            v.capitalDeclarado,
            v.fuente,
            v.nota,
            v.estado,
            time,
            id,
            deuda,
          ],
        );
      } catch (error) {
        duplicateProblem(error);
      }
      const next = findRow(db, deuda, id),
        anterior = dto(old),
        posterior = dto(next);
      db.run(
        "INSERT INTO conciliaciones_deuda_audit(conciliacion,accion,revision,anterior,posterior,motivo,instante,actor) VALUES(?,?,?,?,?,?,?,'usuario-unico')",
        [
          id,
          v.accion,
          next.revision,
          JSON.stringify(anterior),
          JSON.stringify(posterior),
          v.motivo,
          time,
        ],
      );
      return posterior;
    })
    .immediate();
}
