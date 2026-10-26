import type { Database } from "bun:sqlite";

/**
 * v13 → v14 (base B de E3.2). Runs only inside the existing opening IMMEDIATE
 * transaction. Extends the Reference type list and adds the shared-case sheet,
 * participants, append-only history and retries. No historical data is classified
 * or re-seeded; no D5 movement metadata is created.
 */
export function compartidoSchema(db: Database) {
  const tables = [
    "referencias",
    "movimientos",
    "movement_audit",
    "payroll_allocations",
    "fichas_anticipos",
    "movimiento_anticipo",
    "fotos_neto_apertura",
    "anticipo_audit",
  ];
  const objects = db
    .query(
      `SELECT type,name,tbl_name,sql FROM sqlite_master WHERE tbl_name IN ('referencias','movimientos','movement_audit','payroll_allocations','fichas_anticipos','movimiento_anticipo','fotos_neto_apertura','anticipo_audit') AND sql IS NOT NULL`,
    )
    .all() as { type: string; name: string; tbl_name: string; sql: string }[];
  for (const table of tables) {
    const sql = objects.find((o) => o.type === "table" && o.name === table)
      ?.sql;
    if (!sql) throw new Error("Esquema previo incompleto para migración v14.");
    db.exec(
      `CREATE TEMP TABLE saved_v14_${table} AS SELECT * FROM ${table}`,
    );
  }
  for (const o of objects)
    if (o.type === "trigger") db.exec(`DROP TRIGGER "${o.name}"`);
  for (const o of objects)
    if (o.type === "index") db.exec(`DROP INDEX "${o.name}"`);
  // Children first; the rebuilt parent is never dropped with live dependants.
  for (const table of [...tables].reverse()) db.exec(`DROP TABLE ${table}`);
  for (const table of tables) {
    let sql = objects.find((o) => o.type === "table" && o.name === table)!.sql;
    if (table === "referencias") {
      const next = sql.replace(
        "'Viaje','Evento','Anticipo'",
        "'Viaje','Evento','Anticipo','Gasto compartido'",
      );
      if (next === sql)
        throw new Error("Restricción de Tipos de Referencia inesperada.");
      sql = next;
    }
    db.exec(sql);
    db.exec(
      `INSERT INTO ${table} SELECT * FROM saved_v14_${table}; DROP TABLE saved_v14_${table}`,
    );
  }
  for (const o of objects) if (o.type !== "table") db.exec(o.sql);
  db.exec(`CREATE TABLE fichas_compartidos(
    referencia TEXT PRIMARY KEY REFERENCES referencias(id),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL, actualizado TEXT NOT NULL
  ) STRICT;
  CREATE TABLE participantes_compartido(
    id TEXT PRIMARY KEY CHECK(id GLOB 'CP[0-9]*' AND substr(id,3) NOT GLOB '*[^0-9]*' AND length(id)>=5),
    referencia TEXT NOT NULL REFERENCES fichas_compartidos(referencia),
    nombre TEXT NOT NULL CHECK(length(trim(nombre))>0),
    rol TEXT NOT NULL CHECK(rol IN ('Titular','Tercero')),
    partes INTEGER NOT NULL CHECK(partes>=0 AND partes<=1000000),
    estado TEXT NOT NULL CHECK(estado IN ('Activa','Baja')),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL, actualizado TEXT NOT NULL
  ) STRICT;
  CREATE INDEX participantes_compartido_referencia ON participantes_compartido(referencia);
  CREATE UNIQUE INDEX participantes_compartido_titular ON participantes_compartido(referencia) WHERE rol='Titular' AND estado='Activa';
  CREATE TABLE compartido_audit(id INTEGER PRIMARY KEY, referencia TEXT NOT NULL REFERENCES fichas_compartidos(referencia),
    accion TEXT NOT NULL, anterior TEXT, posterior TEXT NOT NULL, motivo TEXT, instante TEXT NOT NULL, actor TEXT NOT NULL) STRICT;
  CREATE TABLE compartido_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  CREATE TRIGGER compartido_no_delete BEFORE DELETE ON fichas_compartidos BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TRIGGER participante_compartido_id_immutable BEFORE UPDATE OF id ON participantes_compartido WHEN NEW.id!=OLD.id BEGIN SELECT RAISE(ABORT,'immutable id'); END;
  CREATE TRIGGER participante_compartido_no_delete BEFORE DELETE ON participantes_compartido BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TRIGGER compartido_audit_no_update BEFORE UPDATE ON compartido_audit BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER compartido_audit_no_delete BEFORE DELETE ON compartido_audit BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  INSERT OR IGNORE INTO counters VALUES('participantes_compartido',1);
  UPDATE schema_version SET version=14;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error("Upgrade FK validation failed.");
}
