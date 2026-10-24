import type { Database } from "bun:sqlite";
/** E2.3 extension, called inside the existing IMMEDIATE migration transaction. */
export function cyclePlanSchema(db: Database) {
  db.exec(`CREATE TABLE cycle_plans(ciclo TEXT PRIMARY KEY REFERENCES ciclos(id),revision INTEGER NOT NULL CHECK(revision>0)) STRICT;
    CREATE TABLE cycle_plan_lines(ciclo TEXT NOT NULL REFERENCES cycle_plans(ciclo),presupuesto TEXT NOT NULL REFERENCES presupuestos(id),base INTEGER CHECK(base IS NULL OR base>=0),esencial INTEGER CHECK(esencial IS NULL OR esencial>=0),del_mes INTEGER CHECK(del_mes IS NULL OR del_mes>=0),PRIMARY KEY(ciclo,presupuesto)) STRICT;
    CREATE TABLE cycle_plan_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
    CREATE TABLE cycle_plan_audit(id INTEGER PRIMARY KEY,ciclo TEXT NOT NULL REFERENCES ciclos(id),presupuesto TEXT NOT NULL REFERENCES presupuestos(id),revision INTEGER NOT NULL,actor TEXT NOT NULL,instante TEXT NOT NULL,motivo TEXT,delta TEXT NOT NULL) STRICT;
    CREATE TRIGGER cycle_plan_audit_immutable_update BEFORE UPDATE ON cycle_plan_audit BEGIN SELECT RAISE(ABORT,'append only'); END;
    CREATE TRIGGER cycle_plan_audit_immutable_delete BEFORE DELETE ON cycle_plan_audit BEGIN SELECT RAISE(ABORT,'append only'); END;
    DROP TRIGGER partida_used_budget;
    DROP TRIGGER budget_used_configuration;
    UPDATE schema_version SET version=10;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw Error("Plan migration FK validation failed.");
}
