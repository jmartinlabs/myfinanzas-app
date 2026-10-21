import type { Database } from "bun:sqlite";
export const schemaVersion = 3;
/** Runs under the opening IMMEDIATE transaction; no data or credentials are re-seeded. */
export function cycleSchema(db: Database) {
  db.exec(`CREATE TABLE ciclos(
    id TEXT PRIMARY KEY,
    inicio TEXT NOT NULL UNIQUE CHECK(length(inicio)=10 AND inicio GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(inicio) IS NOT NULL AND date(inicio)=inicio),
    mes_financiado TEXT GENERATED ALWAYS AS (date(substr(inicio,1,7)||'-01','+1 month')) VIRTUAL NOT NULL UNIQUE,
    saldo_comida INTEGER NOT NULL,
    creado TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER ciclo_no_update BEFORE UPDATE ON ciclos BEGIN SELECT RAISE(ABORT,'cycle correction requires future procedure'); END;
  CREATE TRIGGER ciclo_no_delete BEFORE DELETE ON ciclos BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TRIGGER ciclo_append BEFORE INSERT ON ciclos
    WHEN EXISTS(SELECT 1 FROM ciclos WHERE inicio >= NEW.inicio)
    BEGIN SELECT RAISE(ABORT,'cycle must follow latest start'); END;
  CREATE TABLE cycle_attempts(
    key TEXT PRIMARY KEY, hash TEXT NOT NULL, ciclo TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
    expires INTEGER NOT NULL
  ) STRICT;
  INSERT INTO counters VALUES('ciclos',1);
  UPDATE schema_version SET version=3;`);
}
