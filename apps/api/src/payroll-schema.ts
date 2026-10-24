import type { Database } from "bun:sqlite";
export function payrollSchema(db: Database) {
  db.exec(`CREATE TABLE payroll(id TEXT PRIMARY KEY, revision INTEGER NOT NULL CHECK(revision>0), data TEXT NOT NULL) STRICT;
  CREATE TABLE payroll_allocations(paga TEXT NOT NULL REFERENCES payroll(id), movimiento TEXT NOT NULL REFERENCES movimientos(id), importe TEXT NOT NULL, revision_movimiento INTEGER NOT NULL, evidencia TEXT NOT NULL, PRIMARY KEY(paga,movimiento)) STRICT;
  CREATE TABLE payroll_attempts(key TEXT PRIMARY KEY, hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  CREATE TABLE payroll_audit(id INTEGER PRIMARY KEY,paga TEXT REFERENCES payroll(id),actor TEXT NOT NULL,instante TEXT NOT NULL,motivo TEXT NOT NULL,delta TEXT NOT NULL) STRICT;
  CREATE TRIGGER payroll_identity BEFORE UPDATE OF id ON payroll BEGIN SELECT RAISE(ABORT,'immutable identity'); END;
  CREATE TRIGGER payroll_no_delete BEFORE DELETE ON payroll BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TRIGGER payroll_audit_no_update BEFORE UPDATE ON payroll_audit BEGIN SELECT RAISE(ABORT,'append only'); END;
  CREATE TRIGGER payroll_audit_no_delete BEFORE DELETE ON payroll_audit BEGIN SELECT RAISE(ABORT,'append only'); END;
  UPDATE schema_version SET version=12;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw Error("Payroll migration FK validation failed");
}
