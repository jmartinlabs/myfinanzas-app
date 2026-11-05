import type { Database } from "bun:sqlite";

/**
 * E4.10 — schema 26 (25 → 26). Additive and non-destructive:
 *  - creates the append-only reopening events (`reaperturas`) and the global
 *    singleton projection (`reapertura_activa`) that serialises one window;
 *  - creates the immutable closure link (`cierre_vinculos`) from the reopened
 *    version to the re-closed version;
 *  - creates the per-operation idempotency attempts (`reapertura_attempts`);
 *  - preserves v25 and every earlier table, ID, counter, audit, attempt, MFA
 *    and the demo/production identity. There is no backfill.
 *
 * Scope split: I1 (this migration) only prepares the store and the C26
 * contract. Reopening, guards, T1/T2/T3, re-closure, cancellation, idempotency
 * handling and the API/UI belong to later E4.10 increments and are not
 * implemented here.
 *
 * Immutability: reopening events and closure links are never updated or
 * deleted. `reapertura_activa` is only a derived projection; it can be
 * rebuilt from the events inside the owning transaction. `cierre_audit` keeps
 * its E4.9 shape and gains one new trigger that requires a motive for every
 * re-closure (`accion='cierre'` with `version>1`).
 *
 * Runs inside the opening IMMEDIATE transaction owned by `prepareSchema`. A
 * failure rolls the whole DDL back; the caller verifies foreign keys on
 * reopen.
 */
export function reaperturaSchemaV26(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 25)
    throw new Error("Esquema previo inesperado para migración E4.10 v26.");

  db.exec(`
    CREATE TABLE reaperturas(
      id INTEGER PRIMARY KEY,
      ciclo TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
      version_origen INTEGER NOT NULL CHECK(version_origen>0),
      tipo TEXT NOT NULL CHECK(tipo IN ('reapertura','cancelacion')),
      actor TEXT NOT NULL CHECK(length(trim(actor))>0 AND length(actor)<=200),
      creado_utc TEXT NOT NULL CHECK(
        length(creado_utc)=24
        AND creado_utc GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      motivo TEXT NOT NULL CHECK(
        length(trim(motivo))>0 AND length(motivo)<=1000
      ),
      fingerprint_peticion TEXT NOT NULL CHECK(
        length(fingerprint_peticion)=64
        AND fingerprint_peticion NOT GLOB '*[^a-f0-9]*'
      ),
      version_esperada INTEGER NOT NULL CHECK(version_esperada>0),
      clave_intento TEXT,
      correlacion TEXT,
      reapertura_origen INTEGER REFERENCES reaperturas(id) ON DELETE RESTRICT,
      resultado TEXT NOT NULL,
      CHECK(tipo<>'cancelacion' OR reapertura_origen IS NOT NULL),
      FOREIGN KEY(ciclo,version_origen) REFERENCES cierres(ciclo,version)
        ON DELETE RESTRICT
    ) STRICT;

    CREATE TABLE reapertura_activa(
      id INTEGER PRIMARY KEY CHECK(id=1),
      ciclo TEXT NOT NULL,
      reapertura_id INTEGER NOT NULL REFERENCES reaperturas(id)
        ON DELETE RESTRICT
    ) STRICT;

    CREATE TABLE cierre_vinculos(
      ciclo TEXT NOT NULL,
      version_origen INTEGER NOT NULL CHECK(version_origen>0),
      version_destino INTEGER NOT NULL CHECK(version_destino>0),
      reapertura_id INTEGER NOT NULL REFERENCES reaperturas(id)
        ON DELETE RESTRICT,
      correlacion TEXT,
      PRIMARY KEY(ciclo,version_destino),
      FOREIGN KEY(ciclo,version_origen) REFERENCES cierres(ciclo,version)
        ON DELETE RESTRICT,
      FOREIGN KEY(ciclo,version_destino) REFERENCES cierres(ciclo,version)
        ON DELETE RESTRICT
    ) STRICT;

    CREATE TABLE reapertura_attempts(
      operacion TEXT NOT NULL
        CHECK(operacion IN ('reapertura','cancelacion','recierre')),
      key TEXT NOT NULL,
      hash TEXT NOT NULL,
      response TEXT NOT NULL,
      expires INTEGER NOT NULL,
      PRIMARY KEY(operacion,key)
    ) STRICT;

    CREATE TRIGGER reapertura_no_update
      BEFORE UPDATE ON reaperturas
      BEGIN SELECT RAISE(ABORT,'immutable reopening'); END;
    CREATE TRIGGER reapertura_no_delete
      BEFORE DELETE ON reaperturas
      BEGIN SELECT RAISE(ABORT,'no delete'); END;

    CREATE TRIGGER cierre_vinculo_no_update
      BEFORE UPDATE ON cierre_vinculos
      BEGIN SELECT RAISE(ABORT,'immutable closure link'); END;
    CREATE TRIGGER cierre_vinculo_no_delete
      BEFORE DELETE ON cierre_vinculos
      BEGIN SELECT RAISE(ABORT,'no delete'); END;

    CREATE TRIGGER cierre_audit_recierre_motivo
      BEFORE INSERT ON cierre_audit
      WHEN NEW.accion='cierre'
        AND NEW.version>1
        AND (NEW.motivo IS NULL OR length(trim(NEW.motivo)) = 0)
      BEGIN SELECT RAISE(ABORT,'re-closure requires a motive'); END;

    UPDATE schema_version SET version=26;
  `);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error(
      "Migración v26 rechazada: claves foráneas inconsistentes.",
    );
}
