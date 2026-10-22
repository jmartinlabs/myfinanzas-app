import type { Database } from "bun:sqlite";
/** Extension of the sole cycle master, under the existing opening IMMEDIATE. */
export function cycleOperationSchema(db: Database) {
  db.exec(`DROP TRIGGER ciclo_no_update; DROP TRIGGER ciclo_append;
 ALTER TABLE ciclos ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0);
 ALTER TABLE ciclos ADD COLUMN actualizado TEXT;
 CREATE TABLE cycle_operation_guard(id INTEGER PRIMARY KEY CHECK(id=1)) STRICT;
 CREATE TRIGGER ciclo_no_update BEFORE UPDATE ON ciclos WHEN NOT EXISTS(SELECT 1 FROM cycle_operation_guard) BEGIN SELECT RAISE(ABORT,'cycle correction requires reviewed procedure'); END;
 CREATE TRIGGER ciclo_append BEFORE INSERT ON ciclos WHEN EXISTS(SELECT 1 FROM ciclos WHERE inicio>=NEW.inicio) AND NOT EXISTS(SELECT 1 FROM cycle_operation_guard) BEGIN SELECT RAISE(ABORT,'cycle must follow latest start'); END;
 CREATE TRIGGER ciclo_id_immutable BEFORE UPDATE OF id ON ciclos WHEN NEW.id IS NOT OLD.id BEGIN SELECT RAISE(ABORT,'immutable cycle id'); END;
 CREATE TABLE cycle_audit(ciclo TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT, revision INTEGER NOT NULL, accion TEXT NOT NULL, motivo TEXT NOT NULL, instante TEXT NOT NULL, actor TEXT NOT NULL, anterior TEXT, posterior TEXT NOT NULL, PRIMARY KEY(ciclo,revision)) STRICT;
 CREATE TRIGGER cycle_audit_no_update BEFORE UPDATE ON cycle_audit BEGIN SELECT RAISE(ABORT,'immutable cycle audit'); END;
 CREATE TRIGGER cycle_audit_no_delete BEFORE DELETE ON cycle_audit BEGIN SELECT RAISE(ABORT,'immutable cycle audit'); END;
 CREATE TABLE cycle_operation_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
 UPDATE schema_version SET version=8;`);
}
