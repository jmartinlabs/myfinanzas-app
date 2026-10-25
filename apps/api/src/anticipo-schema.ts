import type { Database } from "bun:sqlite";
/** Runs only inside the existing opening IMMEDIATE transaction. No historical attribution. */
export function anticipoSchema(db: Database) {
  const tables = [
    "referencias",
    "movimientos",
    "movement_audit",
    "payroll_allocations",
  ];
  const objects = db
    .query(
      `SELECT type,name,tbl_name,sql FROM sqlite_master WHERE tbl_name IN ('referencias','movimientos','movement_audit','payroll_allocations') AND sql IS NOT NULL`,
    )
    .all() as { type: string; name: string; tbl_name: string; sql: string }[];
  for (const table of tables)
    db.exec(
      `CREATE TEMP TABLE saved_anticipo_${table} AS SELECT * FROM ${table}`,
    );
  for (const o of objects)
    if (o.type === "trigger") db.exec(`DROP TRIGGER "${o.name}"`);
  for (const table of [...tables].reverse()) db.exec(`DROP TABLE ${table}`);
  for (const table of tables) {
    let sql = objects.find((o) => o.name === table)!.sql;
    if (table === "referencias")
      sql = sql.replace("'Viaje','Evento'", "'Viaje','Evento','Anticipo'");
    db.exec(sql);
    db.exec(
      `INSERT INTO ${table} SELECT * FROM saved_anticipo_${table}; DROP TABLE saved_anticipo_${table}`,
    );
  }
  for (const o of objects) if (o.type !== "table") db.exec(o.sql);
  db.exec(`CREATE TABLE fichas_anticipos(
    referencia TEXT PRIMARY KEY REFERENCES referencias(id), apertura TEXT, evidencia TEXT,
    creado TEXT NOT NULL, actualizado TEXT NOT NULL,
    CHECK((apertura IS NULL AND evidencia IS NULL) OR (apertura IS NOT NULL AND length(trim(evidencia))>0))
  ) STRICT;
  CREATE TABLE movimiento_anticipo(
    movimiento TEXT PRIMARY KEY REFERENCES movimientos(id), referencia TEXT NOT NULL REFERENCES fichas_anticipos(referencia),
    rol TEXT NOT NULL CHECK(rol IN ('Adelanto','Devolución')), origen TEXT NOT NULL REFERENCES saldos(id), destino TEXT NOT NULL REFERENCES saldos(id),
    revision_movimiento INTEGER NOT NULL, evidencia TEXT NOT NULL CHECK(length(trim(evidencia))>0), procedencia TEXT NOT NULL CHECK(length(trim(procedencia))>0),
    revision INTEGER NOT NULL, actualizado TEXT NOT NULL, CHECK(origen!=destino)
  ) STRICT;
  CREATE TABLE fotos_neto_apertura(
    referencia TEXT NOT NULL REFERENCES fichas_anticipos(referencia), ciclo TEXT NOT NULL REFERENCES ciclos(id), inicio TEXT NOT NULL,
    importe INTEGER NOT NULL, evidencia TEXT NOT NULL, procedencia TEXT NOT NULL, cobertura TEXT NOT NULL,
    confirmado TEXT NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY(referencia,ciclo)
  ) STRICT;
  CREATE TABLE anticipo_audit(id INTEGER PRIMARY KEY, referencia TEXT NOT NULL REFERENCES fichas_anticipos(referencia), accion TEXT NOT NULL,
    anterior TEXT, posterior TEXT NOT NULL, motivo TEXT, instante TEXT NOT NULL, actor TEXT NOT NULL) STRICT;
  CREATE TRIGGER anticipo_audit_no_update BEFORE UPDATE ON anticipo_audit BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER anticipo_audit_no_delete BEFORE DELETE ON anticipo_audit BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER anticipo_no_delete BEFORE DELETE ON fichas_anticipos BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TRIGGER anticipo_photo_no_delete BEFORE DELETE ON fotos_neto_apertura BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TRIGGER anticipo_cycle_photo BEFORE UPDATE OF inicio ON ciclos WHEN NEW.inicio!=OLD.inicio AND EXISTS(SELECT 1 FROM fotos_neto_apertura WHERE ciclo=OLD.id) BEGIN SELECT RAISE(ABORT,'protected anticipo opening'); END;
  CREATE TABLE anticipo_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  UPDATE schema_version SET version=13;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw Error("Upgrade FK validation failed.");
}
