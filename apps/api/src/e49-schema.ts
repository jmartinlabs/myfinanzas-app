import type { Database } from "bun:sqlite";

/**
 * E4.9 — schema 25 (24 → 25). Additive and non-destructive:
 *  - creates the financial closure (`cierres`) and its immutable photo
 *    (`fotos_cierre`) for one cycle and closure version;
 *  - creates the append-only closure audit (`cierre_audit`) and the
 *    idempotency attempts (`cierre_attempts`);
 *  - preserves v24 and every earlier table, ID, counter, audit, attempt, MFA
 *    and the demo/production identity. There is no backfill.
 *
 * Scope split: A (this migration) only prepares the store and the C25
 * contract. The D4 preflight, the T1/T2/T3 locks, the closure transaction,
 * the photo payload and the API/UI belong to E4.9 B/C and are not
 * implemented here.
 *
 * Immutability: a closure and its photo are never updated or deleted. A
 * re-closure must create the next version (v1, v2, ...) and keep every
 * previous version. The photo must match the identity/window/S0 of its
 * closure and the closure must reference an existing photo at commit; the
 * deferred foreign key and the insertion trigger enforce both directions
 * without allowing a half-written closure. Inside the closure transaction,
 * insert the `cierres` row first and the `fotos_cierre` row second.
 *
 * Metadata (DT4): the photo keeps the application and schema versions at the
 * moment of capture, the frozen window and S0, and one JSON block per
 * contract block (facts, plan, classification/references, investment,
 * auxiliaries, coverage, backup and unavailable sources). No financial value
 * is recalculated by this migration.
 *
 * Runs inside the opening IMMEDIATE transaction owned by `prepareSchema`. A
 * failure rolls the whole DDL back; the caller verifies foreign keys on
 * reopen.
 */
export function cierreFinancieroSchema(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 24)
    throw new Error("Esquema previo inesperado para migración E4.9 v25.");

  db.exec(`
    CREATE TABLE cierres(
      ciclo TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
      version INTEGER NOT NULL CHECK(version>0),
      inicio TEXT NOT NULL CHECK(
        length(inicio)=10
        AND inicio GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND julianday(inicio) IS NOT NULL
        AND date(julianday(inicio))=inicio
      ),
      fin TEXT NOT NULL CHECK(
        length(fin)=10
        AND fin GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND julianday(fin) IS NOT NULL
        AND date(julianday(fin))=fin
      ),
      saldo_inicial INTEGER NOT NULL
        CHECK(saldo_inicial>=-9007199254740991 AND saldo_inicial<=9007199254740991),
      actor TEXT NOT NULL CHECK(length(trim(actor))>0 AND length(actor)<=200),
      creado_utc TEXT NOT NULL CHECK(
        length(creado_utc)=24
        AND creado_utc GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      motivo TEXT CHECK(
        motivo IS NULL OR (length(trim(motivo))>0 AND length(motivo)<=1000)
      ),
      fingerprint TEXT NOT NULL CHECK(
        length(fingerprint)=64 AND fingerprint NOT GLOB '*[^a-f0-9]*'
      ),
      estado TEXT NOT NULL CHECK(estado='Cerrado'),
      PRIMARY KEY(ciclo,version),
      CHECK(fin>=inicio),
      FOREIGN KEY(ciclo,version) REFERENCES fotos_cierre(ciclo,version)
        ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
    ) STRICT;

    CREATE TABLE fotos_cierre(
      ciclo TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
      version INTEGER NOT NULL CHECK(version>0),
      creado_utc TEXT NOT NULL CHECK(
        length(creado_utc)=24
        AND creado_utc GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      actor TEXT NOT NULL CHECK(length(trim(actor))>0 AND length(actor)<=200),
      motivo TEXT CHECK(
        motivo IS NULL OR (length(trim(motivo))>0 AND length(motivo)<=1000)
      ),
      fingerprint TEXT NOT NULL CHECK(
        length(fingerprint)=64 AND fingerprint NOT GLOB '*[^a-f0-9]*'
      ),
      app_version TEXT NOT NULL CHECK(
        length(trim(app_version))>0 AND length(app_version)<=200
      ),
      schema_version INTEGER NOT NULL CHECK(schema_version>0),
      ventana_inicio TEXT NOT NULL CHECK(
        length(ventana_inicio)=10
        AND ventana_inicio GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND julianday(ventana_inicio) IS NOT NULL
        AND date(julianday(ventana_inicio))=ventana_inicio
      ),
      ventana_fin TEXT NOT NULL CHECK(
        length(ventana_fin)=10
        AND ventana_fin GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND julianday(ventana_fin) IS NOT NULL
        AND date(julianday(ventana_fin))=ventana_fin
      ),
      saldo_inicial INTEGER NOT NULL
        CHECK(saldo_inicial>=-9007199254740991 AND saldo_inicial<=9007199254740991),
      estado_temporal TEXT NOT NULL CHECK(estado_temporal='Cerrado'),
      estado_hechos TEXT NOT NULL CHECK(estado_hechos IN ('Con hechos','Sin hechos')),
      estado_plan TEXT NOT NULL CHECK(estado_plan IN ('SinPlan','Capturado')),
      hechos TEXT NOT NULL CHECK(json_valid(hechos)),
      plan TEXT NOT NULL CHECK(json_valid(plan)),
      clasificacion TEXT NOT NULL CHECK(json_valid(clasificacion)),
      inversion TEXT NOT NULL CHECK(json_valid(inversion)),
      auxiliares TEXT NOT NULL CHECK(json_valid(auxiliares)),
      cobertura TEXT NOT NULL CHECK(json_valid(cobertura)),
      backup TEXT NOT NULL CHECK(json_valid(backup)),
      no_disponible TEXT NOT NULL CHECK(json_valid(no_disponible)),
      PRIMARY KEY(ciclo,version),
      CHECK(ventana_fin>=ventana_inicio)
    ) STRICT;

    CREATE TABLE cierre_audit(
      id INTEGER PRIMARY KEY,
      ciclo TEXT NOT NULL,
      version INTEGER NOT NULL,
      accion TEXT NOT NULL
        CHECK(accion IN ('cierre','cierre_fuera_de_orden')),
      anterior TEXT,
      posterior TEXT NOT NULL CHECK(json_valid(posterior)),
      motivo TEXT,
      instante TEXT NOT NULL CHECK(
        length(instante)=24
        AND instante GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      actor TEXT NOT NULL CHECK(length(trim(actor))>0 AND length(actor)<=200),
      FOREIGN KEY(ciclo,version) REFERENCES cierres(ciclo,version)
        ON DELETE RESTRICT,
      CHECK(anterior IS NULL OR json_valid(anterior)),
      CHECK(
        accion='cierre'
        OR (motivo IS NOT NULL AND length(trim(motivo))>0)
      )
    ) STRICT;

    CREATE TABLE cierre_attempts(
      key TEXT PRIMARY KEY,
      hash TEXT NOT NULL,
      response TEXT NOT NULL,
      expires INTEGER NOT NULL
    ) STRICT;

    CREATE TRIGGER cierre_no_update
      BEFORE UPDATE ON cierres
      BEGIN SELECT RAISE(ABORT,'immutable closure'); END;
    CREATE TRIGGER cierre_no_delete
      BEFORE DELETE ON cierres
      BEGIN SELECT RAISE(ABORT,'no delete'); END;
    CREATE TRIGGER cierre_version_sequence
      BEFORE INSERT ON cierres
      WHEN NEW.version != (
        SELECT COALESCE(MAX(version),0)+1 FROM cierres WHERE ciclo=NEW.ciclo
      )
      BEGIN SELECT RAISE(ABORT,'closure version must follow the previous one'); END;
    CREATE TRIGGER cierre_cycle_identity
      BEFORE INSERT ON cierres
      WHEN NOT EXISTS (
        SELECT 1 FROM ciclos c
        WHERE c.id=NEW.ciclo
          AND c.inicio=NEW.inicio
          AND c.saldo_comida=NEW.saldo_inicial
      )
      BEGIN SELECT RAISE(ABORT,'closure must match its cycle window and S0'); END;

    CREATE TRIGGER foto_cierre_no_update
      BEFORE UPDATE ON fotos_cierre
      BEGIN SELECT RAISE(ABORT,'immutable closure photo'); END;
    CREATE TRIGGER foto_cierre_no_delete
      BEFORE DELETE ON fotos_cierre
      BEGIN SELECT RAISE(ABORT,'no delete'); END;
    CREATE TRIGGER foto_cierre_requires_closure
      BEFORE INSERT ON fotos_cierre
      WHEN NOT EXISTS (
        SELECT 1 FROM cierres c
        WHERE c.ciclo=NEW.ciclo
          AND c.version=NEW.version
          AND c.inicio=NEW.ventana_inicio
          AND c.fin=NEW.ventana_fin
          AND c.saldo_inicial=NEW.saldo_inicial
          AND c.actor=NEW.actor
          AND c.creado_utc=NEW.creado_utc
          AND c.fingerprint=NEW.fingerprint
          AND c.motivo IS NEW.motivo
      )
      BEGIN SELECT RAISE(ABORT,'photo must match its closure identity'); END;

    CREATE TRIGGER cierre_audit_no_update
      BEFORE UPDATE ON cierre_audit
      BEGIN SELECT RAISE(ABORT,'immutable closure audit'); END;
    CREATE TRIGGER cierre_audit_no_delete
      BEFORE DELETE ON cierre_audit
      BEGIN SELECT RAISE(ABORT,'immutable closure audit'); END;

    UPDATE schema_version SET version=25;
  `);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error(
      "Migración v25 rechazada: claves foráneas inconsistentes.",
    );
}
