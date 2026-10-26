import type { Database } from "bun:sqlite";
/** E2.4, within the existing IMMEDIATE migration; no changes to database opening. */
export function annualPlanSchema(db: Database) {
  db.exec(`CREATE TABLE annual_plan_lines(
    ejercicio INTEGER NOT NULL CHECK(ejercicio BETWEEN 1 AND 9999),
    partida TEXT NOT NULL REFERENCES partidas(id), presupuesto INTEGER CHECK(presupuesto IS NULL OR presupuesto>=0),
    periodo TEXT, esencial TEXT NOT NULL CHECK(esencial IN ('Sí','No','Pendiente')),
    revision INTEGER NOT NULL CHECK(revision>0), PRIMARY KEY(ejercicio,partida)
  ) STRICT;
  CREATE TRIGGER annual_line_identity BEFORE UPDATE OF ejercicio,partida ON annual_plan_lines BEGIN SELECT RAISE(ABORT,'immutable identity'); END;
  CREATE TRIGGER annual_line_no_delete BEFORE DELETE ON annual_plan_lines BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TABLE annual_plan_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  CREATE TABLE annual_plan_audit(id INTEGER PRIMARY KEY,ejercicio INTEGER NOT NULL,partida TEXT NOT NULL REFERENCES partidas(id),revision INTEGER NOT NULL,actor TEXT NOT NULL,instante TEXT NOT NULL,motivo TEXT,delta TEXT NOT NULL) STRICT;
  CREATE TRIGGER annual_audit_no_update BEFORE UPDATE ON annual_plan_audit BEGIN SELECT RAISE(ABORT,'append only'); END;
  CREATE TRIGGER annual_audit_no_delete BEFORE DELETE ON annual_plan_audit BEGIN SELECT RAISE(ABORT,'append only'); END;
  UPDATE schema_version SET version=11;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw Error("Annual plan migration FK validation failed.");
}
