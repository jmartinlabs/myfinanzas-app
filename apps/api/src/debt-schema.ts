import type { Database } from "bun:sqlite";
export function debtSchema(db: Database) {
  db.exec(`CREATE TABLE deudas(
 id TEXT PRIMARY KEY CHECK(id GLOB 'D[0-9]*' AND substr(id,2) NOT GLOB '*[^0-9]*' AND length(id)>=4),
 nombre TEXT NOT NULL CHECK(length(trim(nombre))>0), inicio TEXT, apertura INTEGER,
 estado TEXT NOT NULL CHECK(estado IN ('Activa','Inactiva')), revision INTEGER NOT NULL CHECK(revision>0), creado TEXT NOT NULL, actualizado TEXT NOT NULL
 ) STRICT;
 CREATE TRIGGER deuda_id_immutable BEFORE UPDATE OF id ON deudas WHEN NEW.id!=OLD.id BEGIN SELECT RAISE(ABORT,'immutable id'); END;
 CREATE TRIGGER deuda_no_delete BEFORE DELETE ON deudas BEGIN SELECT RAISE(ABORT,'no delete'); END;
 CREATE TABLE debt_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
 INSERT INTO counters VALUES('deudas',1);
 ALTER TABLE partidas ADD COLUMN deuda TEXT REFERENCES deudas(id) ON DELETE RESTRICT;`);
  const objects = db
    .query(
      "SELECT type,name,sql FROM sqlite_master WHERE tbl_name IN ('movimientos','movement_audit') AND sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END",
    )
    .all() as { type: string; name: string; sql: string }[];
  const referenceTrigger = db
    .query(
      "SELECT sql FROM sqlite_master WHERE type='trigger' AND name='referencia_used_type'",
    )
    .get() as { sql: string };
  db.exec("DROP TRIGGER referencia_used_type");
  const movement = objects.find((o) => o.name === "movimientos")!.sql;
  db.exec(
    `CREATE TEMP TABLE saved_debt_audit AS SELECT * FROM movement_audit; DROP TABLE movement_audit;`,
  );
  const next = movement
    .replace('CREATE TABLE "movimientos"', "CREATE TABLE movimientos_v7")
    .replace("CREATE TABLE movimientos(", "CREATE TABLE movimientos_v7(")
    .replace(
      "'Ingreso','Gasto','Transferencia'",
      "'Ingreso','Gasto','Transferencia','Amortización deuda'",
    )
    .replace(
      "(tipo='Gasto' AND",
      "(tipo IN ('Gasto','Amortización deuda') AND",
    );
  db.exec(next);
  db.exec(`ALTER TABLE movimientos_v7 ADD COLUMN capital INTEGER CHECK(capital>0);
 ALTER TABLE movimientos_v7 ADD COLUMN intereses INTEGER CHECK(intereses>=0);
 INSERT INTO movimientos_v7 SELECT *,NULL,NULL FROM movimientos;
 DROP TABLE movimientos; ALTER TABLE movimientos_v7 RENAME TO movimientos;`);
  for (const o of objects) if (o.name !== "movimientos") db.exec(o.sql);
  db.exec(referenceTrigger.sql);
  db.exec(`INSERT INTO movement_audit SELECT * FROM saved_debt_audit; DROP TABLE saved_debt_audit;
 CREATE TRIGGER deuda_used_opening BEFORE UPDATE OF inicio,apertura ON deudas WHEN (NEW.inicio IS NOT OLD.inicio OR NEW.apertura IS NOT OLD.apertura) AND EXISTS(SELECT 1 FROM movimientos m JOIN partidas p ON p.id=m.partida WHERE p.deuda=OLD.id) BEGIN SELECT RAISE(ABORT,'used debt opening'); END;
 CREATE TRIGGER partida_used_debt BEFORE UPDATE OF deuda ON partidas WHEN NEW.deuda IS NOT OLD.deuda AND EXISTS(SELECT 1 FROM movimientos WHERE partida=OLD.id) BEGIN SELECT RAISE(ABORT,'used debt relation'); END;
 UPDATE schema_version SET version=7;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw Error("Upgrade FK validation failed.");
}
