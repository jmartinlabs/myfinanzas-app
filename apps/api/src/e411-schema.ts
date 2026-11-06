import type { Database } from "bun:sqlite";

/**
 * E4.11 — schema 27 (26 → 27). Additive and non-destructive:
 *  - creates the immutable quarter/year photo store (`fotos_periodo`) with its
 *    own version (`A1`, `A2`, ...), fingerprint, composition rule, applied
 *    selection, coverage, values and unavailable sources;
 *  - creates the exact composition of each period (`foto_periodo_componentes`)
 *    referencing the E4.9 closure photo of every included cycle;
 *  - creates the per-request idempotency attempts (`periodo_attempts`);
 *  - preserves v26 and every earlier table, ID, counter, audit, attempt, MFA
 *    and the demo/production identity. There is no backfill and no reseed.
 *
 * Scope split: I2 (this migration) only prepares the store and the C27
 * contract. Composition, routes, DTOs and UI belong to later E4.11 increments
 * and are not implemented here.
 *
 * Immutability (P2-A/P6-A): a period photo and its components are never
 * updated or deleted. A new aggregate creates the next version (`A1 → A2`)
 * only after the previous one exists. The partial unique indexes keep one
 * version per natural period without relying on `NULL` semantics:
 *  - `(tipo, ejercicio, trimestre, version)` for `Trimestre`;
 *  - `(tipo, ejercicio, version)` for `Anio`.
 *
 * Composition coherence: an `Incluido` component must reference an existing
 * `fotos_cierre(ciclo, version)` row with the same fingerprint; an excluded
 * component (`ExcluidoSinCierre`, `PendienteReCierre`) stores no photo
 * reference and requires a motive. Foreign keys never cascade.
 *
 * Runs inside the opening IMMEDIATE transaction owned by `prepareSchema`. A
 * failure rolls the whole DDL back; the caller verifies foreign keys on
 * reopen.
 */
export function fotosPeriodoSchemaV27(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 26)
    throw new Error("Esquema previo inesperado para migración E4.11 v27.");

  db.exec(`
    CREATE TABLE fotos_periodo(
      id INTEGER PRIMARY KEY,
      tipo TEXT NOT NULL CHECK(tipo IN ('Trimestre','Anio')),
      ejercicio INTEGER NOT NULL CHECK(ejercicio>=1000 AND ejercicio<=9999),
      trimestre INTEGER CHECK(
        trimestre IS NULL OR (trimestre>=1 AND trimestre<=4)
      ),
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
      version TEXT NOT NULL CHECK(
        length(version) BETWEEN 2 AND 20
        AND version GLOB 'A[0-9]*'
        AND substr(version,2) NOT GLOB '*[^0-9]*'
        AND CAST(substr(version,2) AS INTEGER)>0
        AND version='A'||CAST(CAST(substr(version,2) AS INTEGER) AS TEXT)
      ),
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
      regla_composicion TEXT NOT NULL CHECK(
        length(trim(regla_composicion))>0
        AND length(regla_composicion)<=200
      ),
      seleccion_aplicada TEXT NOT NULL CHECK(json_valid(seleccion_aplicada)),
      cobertura TEXT NOT NULL CHECK(json_valid(cobertura)),
      valores TEXT NOT NULL CHECK(json_valid(valores)),
      no_disponible TEXT NOT NULL CHECK(json_valid(no_disponible)),
      CHECK(fin>=inicio),
      CHECK(
        (tipo='Trimestre' AND trimestre IS NOT NULL)
        OR (tipo='Anio' AND trimestre IS NULL)
      )
    ) STRICT;

    CREATE UNIQUE INDEX fotos_periodo_trimestre_unico
      ON fotos_periodo(tipo,ejercicio,trimestre,version)
      WHERE tipo='Trimestre';
    CREATE UNIQUE INDEX fotos_periodo_anio_unico
      ON fotos_periodo(tipo,ejercicio,version)
      WHERE tipo='Anio';

    CREATE TABLE foto_periodo_componentes(
      periodo_id INTEGER NOT NULL
        REFERENCES fotos_periodo(id) ON DELETE RESTRICT,
      ciclo TEXT NOT NULL,
      version_foto INTEGER CHECK(version_foto IS NULL OR version_foto>0),
      fingerprint_foto TEXT CHECK(
        fingerprint_foto IS NULL OR (
          length(fingerprint_foto)=64
          AND fingerprint_foto NOT GLOB '*[^a-f0-9]*'
        )
      ),
      estado TEXT NOT NULL CHECK(
        estado IN ('Incluido','ExcluidoSinCierre','PendienteReCierre')
      ),
      motivo TEXT CHECK(
        motivo IS NULL OR (length(trim(motivo))>0 AND length(motivo)<=1000)
      ),
      PRIMARY KEY(periodo_id,ciclo),
      CHECK(
        (
          estado='Incluido'
          AND version_foto IS NOT NULL
          AND fingerprint_foto IS NOT NULL
        )
        OR (
          estado IN ('ExcluidoSinCierre','PendienteReCierre')
          AND version_foto IS NULL
          AND fingerprint_foto IS NULL
        )
      ),
      FOREIGN KEY(ciclo,version_foto) REFERENCES fotos_cierre(ciclo,version)
        ON DELETE RESTRICT
    ) STRICT;

    CREATE TABLE periodo_attempts(
      key TEXT PRIMARY KEY,
      hash TEXT NOT NULL,
      response TEXT NOT NULL,
      expires INTEGER NOT NULL
    ) STRICT;

    CREATE TRIGGER fotos_periodo_no_update
      BEFORE UPDATE ON fotos_periodo
      BEGIN SELECT RAISE(ABORT,'immutable period photo'); END;
    CREATE TRIGGER fotos_periodo_no_delete
      BEFORE DELETE ON fotos_periodo
      BEGIN SELECT RAISE(ABORT,'no delete'); END;
    CREATE TRIGGER foto_periodo_componente_no_update
      BEFORE UPDATE ON foto_periodo_componentes
      BEGIN SELECT RAISE(ABORT,'immutable period component'); END;
    CREATE TRIGGER foto_periodo_componente_no_delete
      BEFORE DELETE ON foto_periodo_componentes
      BEGIN SELECT RAISE(ABORT,'no delete'); END;

    CREATE TRIGGER fotos_periodo_secuencia
      BEFORE INSERT ON fotos_periodo
      WHEN (
        CAST(substr(NEW.version,2) AS INTEGER)=1
        AND EXISTS (
          SELECT 1 FROM fotos_periodo f
          WHERE f.tipo=NEW.tipo
            AND f.ejercicio=NEW.ejercicio
            AND (NEW.tipo='Anio' OR f.trimestre=NEW.trimestre)
        )
      ) OR (
        CAST(substr(NEW.version,2) AS INTEGER)>1
        AND NOT EXISTS (
          SELECT 1 FROM fotos_periodo f
          WHERE f.tipo=NEW.tipo
            AND f.ejercicio=NEW.ejercicio
            AND (NEW.tipo='Anio' OR f.trimestre=NEW.trimestre)
            AND CAST(substr(f.version,2) AS INTEGER)
              = CAST(substr(NEW.version,2) AS INTEGER)-1
        )
      )
      BEGIN SELECT RAISE(ABORT,'period photo version must follow the previous one'); END;

    CREATE TRIGGER foto_periodo_componente_foto
      BEFORE INSERT ON foto_periodo_componentes
      WHEN NEW.estado='Incluido'
        AND NOT EXISTS (
          SELECT 1 FROM fotos_cierre f
          WHERE f.ciclo=NEW.ciclo
            AND f.version=NEW.version_foto
            AND f.fingerprint=NEW.fingerprint_foto
        )
      BEGIN SELECT RAISE(ABORT,'included component must match its closure photo'); END;

    CREATE TRIGGER foto_periodo_componente_motivo
      BEFORE INSERT ON foto_periodo_componentes
      WHEN NEW.estado<>'Incluido'
        AND (NEW.motivo IS NULL OR length(trim(NEW.motivo))=0)
      BEGIN SELECT RAISE(ABORT,'excluded component requires a motive'); END;

    UPDATE schema_version SET version=27;
  `);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error(
      "Migración v27 rechazada: claves foráneas inconsistentes.",
    );
}
