import type { Database } from "bun:sqlite";

/**
 * E3.3 schema 14. Runs inside the existing opening IMMEDIATE transaction.
 * SQLite cannot alter the referencias CHECK in place, so the parent table and its
 * direct dependants are rebuilt with their exact SQL and rows. No data is reseeded.
 */
export function vehicleSchema(db: Database) {
  const tables = [
    "referencias",
    "movimientos",
    "fichas_anticipos",
    "movimiento_anticipo",
    "fotos_neto_apertura",
    "anticipo_audit",
    "movement_audit",
    "payroll_allocations",
  ] as const;
  const placeholders = tables.map(() => "?").join(",");
  const objects = db
    .query(
      `SELECT type,name,tbl_name,sql FROM sqlite_master WHERE tbl_name IN (${placeholders}) AND sql IS NOT NULL`,
    )
    .all(...tables) as {
    type: string;
    name: string;
    tbl_name: string;
    sql: string;
  }[];
  const missing = tables.filter(
    (table) => !objects.some((o) => o.type === "table" && o.name === table),
  );
  if (missing.length)
    throw new Error("Esquema13 incompleto: faltan tablas " + missing.join(","));
  for (const table of tables)
    db.exec(`CREATE TEMP TABLE saved_vehicle_${table} AS SELECT * FROM ${table}`);
  for (const object of objects)
    if (object.type === "trigger") db.exec(`DROP TRIGGER "${object.name}"`);
  for (const table of [
    "payroll_allocations",
    "movement_audit",
    "movimiento_anticipo",
    "fotos_neto_apertura",
    "anticipo_audit",
    "fichas_anticipos",
    "movimientos",
    "referencias",
  ])
    db.exec(`DROP TABLE ${table}`);
  const referenceSql = objects.find(
    (o) => o.type === "table" && o.name === "referencias",
  )!.sql;
  const upgradedReferenceSql = referenceSql.replace(
    "CHECK(tipo IN ('Viaje','Evento','Anticipo'))",
    "CHECK(tipo IN ('Viaje','Evento','Anticipo','Vehículo'))",
  );
  if (upgradedReferenceSql === referenceSql)
    throw new Error("No se pudo habilitar el Tipo Vehículo en Referencias.");
  for (const table of [
    "referencias",
    "movimientos",
    "fichas_anticipos",
    "movimiento_anticipo",
    "fotos_neto_apertura",
    "anticipo_audit",
    "movement_audit",
    "payroll_allocations",
  ]) {
    const sql =
      table === "referencias"
        ? upgradedReferenceSql
        : objects.find((o) => o.type === "table" && o.name === table)!.sql;
    db.exec(sql);
    db.exec(
      `INSERT INTO ${table} SELECT * FROM saved_vehicle_${table}; DROP TABLE saved_vehicle_${table}`,
    );
  }
  for (const object of objects)
    if (object.type !== "table") db.exec(object.sql);
  db.exec(`CREATE TABLE fichas_vehiculo(
    referencia TEXT PRIMARY KEY REFERENCES referencias(id) ON DELETE RESTRICT,
    matricula TEXT CHECK(matricula IS NULL OR (length(matricula)>0 AND length(matricula)<=32)),
    proxima_itv TEXT CHECK(proxima_itv IS NULL OR (length(proxima_itv)=10 AND proxima_itv GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(proxima_itv) IS NOT NULL AND date(proxima_itv)=proxima_itv)),
    fecha_cita TEXT CHECK(fecha_cita IS NULL OR (length(fecha_cita)=10 AND fecha_cita GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha_cita) IS NOT NULL AND date(fecha_cita)=fecha_cita)),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL, actualizado TEXT NOT NULL
  ) STRICT;
  CREATE INDEX fichas_vehiculo_matricula ON fichas_vehiculo(matricula);
  CREATE TRIGGER ficha_vehiculo_identity BEFORE UPDATE OF referencia ON fichas_vehiculo
    WHEN NEW.referencia!=OLD.referencia BEGIN SELECT RAISE(ABORT,'immutable vehicle reference'); END;
  CREATE TRIGGER ficha_vehiculo_no_delete BEFORE DELETE ON fichas_vehiculo
    BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TRIGGER ficha_vehiculo_type BEFORE INSERT ON fichas_vehiculo
    WHEN (SELECT tipo FROM referencias WHERE id=NEW.referencia) IS NOT 'Vehículo'
    BEGIN SELECT RAISE(ABORT,'invalid vehicle reference type'); END;
  CREATE TRIGGER referencia_vehicle_type BEFORE UPDATE OF tipo ON referencias
    WHEN OLD.tipo='Vehículo' AND NEW.tipo!='Vehículo'
      AND EXISTS(SELECT 1 FROM fichas_vehiculo WHERE referencia=OLD.id)
    BEGIN SELECT RAISE(ABORT,'vehicle reference type locked'); END;
  CREATE TRIGGER audit_ficha_no_update BEFORE UPDATE ON audit
    WHEN OLD.entidad='ficha_vehiculo' BEGIN SELECT RAISE(ABORT,'immutable vehicle audit'); END;
  CREATE TRIGGER audit_ficha_no_delete BEFORE DELETE ON audit
    WHEN OLD.entidad='ficha_vehiculo' BEGIN SELECT RAISE(ABORT,'immutable vehicle audit'); END;
  UPDATE schema_version SET version=14;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error("Upgrade FK validation failed.");
}
