import type { Database } from "bun:sqlite";

/**
 * E4.3 — schema 24 (23 → 24). Additive and non-destructive:
 *  - creates the dated valuation series (`valoracion_inversion`) for one
 *    position (`saldo_inversion`, `instrumento`) and `fecha_vigencia`;
 *  - creates its append-only audit (`valoracion_inversion_audit`) and its
 *    idempotency attempts (`valoracion_attempts`);
 *  - preserves every earlier table, ID, counter, audit, attempt, MFA and the
 *    demo/production identity. There is no backfill.
 *
 * Exactness (DT2-E4.3): EUR is integer cents; quantity is scaled by 10^8,
 * price and exchange rate by 10^6. Every scaled integer stays in the
 * `1..2^53-1` range (EUR also accepts explicit 0); no field uses float.
 *
 * Immutability: ID, position and creation instant never change. A correction
 * advances `revision` by exactly one and requires a motive; DELETE is refused.
 * The audit table is append-only and keeps the previous/posterior state. The
 * row is corrected first and the audit row for the new revision is appended
 * inside the same transaction, so both revisions must match.
 *
 * Scope split: the DDL validates the civil date shape/calendar and the exact
 * scaled limits. The non-future check and the automatic product/cantidad_base
 * consistency belong to the API because `date('now')` is UTC while the
 * financial civil day is Europe/Madrid. Manual rows keep the automatic fields
 * null; an automatic row requires price, currency, exchange and quantity.
 *
 * Runs inside the opening IMMEDIATE transaction owned by `prepareSchema`. A
 * failure rolls the whole DDL back; the caller verifies foreign keys on reopen.
 */
export function valoracionSchema(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 23)
    throw new Error("Esquema previo inesperado para migración E4.3 v24.");

  // A separate statement so a counter conflict is reported (Bun's multi-statement
  // exec may swallow non-DDL constraint errors) and the caller's transaction rolls back.
  db.run("INSERT INTO counters(name,next) VALUES('valoraciones_inversion',1)");
  db.exec(`
    CREATE TABLE valoracion_inversion(
      id TEXT PRIMARY KEY CHECK(
        length(id)=16
        AND id GLOB 'VAL-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
      ),
      saldo_inversion TEXT NOT NULL REFERENCES saldos(id) ON DELETE RESTRICT,
      instrumento TEXT NOT NULL REFERENCES instrumentos(id) ON DELETE RESTRICT,
      fecha_vigencia TEXT NOT NULL CHECK(
        length(fecha_vigencia)=10
        AND fecha_vigencia GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND julianday(fecha_vigencia) IS NOT NULL
        AND date(julianday(fecha_vigencia))=fecha_vigencia
      ),
      tipo TEXT NOT NULL CHECK(tipo IN ('Manual','Automática')),
      valor_eur INTEGER NOT NULL
        CHECK(valor_eur>=0 AND valor_eur<=9007199254740991),
      precio_unitario INTEGER
        CHECK(precio_unitario IS NULL OR
          (precio_unitario>0 AND precio_unitario<=9007199254740991)),
      divisa TEXT
        CHECK(divisa IS NULL OR
          (length(divisa)=3 AND divisa NOT GLOB '*[^A-Z]*')),
      cambio INTEGER
        CHECK(cambio IS NULL OR
          (cambio>0 AND cambio<=9007199254740991)),
      cantidad_base INTEGER
        CHECK(cantidad_base IS NULL OR
          (cantidad_base>0 AND cantidad_base<=9007199254740991)),
      procedencia TEXT NOT NULL
        CHECK(length(trim(procedencia))>0 AND length(procedencia)<=200),
      cobertura TEXT NOT NULL CHECK(cobertura='Completa'),
      actor TEXT NOT NULL CHECK(length(trim(actor))>0),
      creado_utc TEXT NOT NULL,
      actualizado_utc TEXT NOT NULL,
      revision INTEGER NOT NULL CHECK(revision>0),
      motivo_correccion TEXT
        CHECK(motivo_correccion IS NULL OR
          (length(trim(motivo_correccion))>0 AND length(motivo_correccion)<=1000)),
      CHECK(actualizado_utc>=creado_utc),
      CHECK(
        (tipo='Manual'
          AND precio_unitario IS NULL AND divisa IS NULL
          AND cambio IS NULL AND cantidad_base IS NULL)
        OR
        (tipo='Automática'
          AND precio_unitario IS NOT NULL AND divisa IS NOT NULL
          AND cambio IS NOT NULL AND cantidad_base IS NOT NULL
          AND (divisa!='EUR' OR cambio=1000000))
      )
    ) STRICT;
    CREATE UNIQUE INDEX valoracion_posicion_fecha
      ON valoracion_inversion(saldo_inversion,instrumento,fecha_vigencia);

    CREATE TRIGGER valoracion_id_immutable
      BEFORE UPDATE OF id ON valoracion_inversion
      WHEN NEW.id!=OLD.id
      BEGIN SELECT RAISE(ABORT,'immutable valuation id'); END;
    CREATE TRIGGER valoracion_posicion_immutable
      BEFORE UPDATE OF saldo_inversion,instrumento ON valoracion_inversion
      WHEN NEW.saldo_inversion!=OLD.saldo_inversion OR NEW.instrumento!=OLD.instrumento
      BEGIN SELECT RAISE(ABORT,'immutable valuation position'); END;
    CREATE TRIGGER valoracion_creado_immutable
      BEFORE UPDATE OF creado_utc ON valoracion_inversion
      WHEN NEW.creado_utc!=OLD.creado_utc
      BEGIN SELECT RAISE(ABORT,'immutable valuation creation'); END;
    CREATE TRIGGER valoracion_no_delete
      BEFORE DELETE ON valoracion_inversion
      BEGIN SELECT RAISE(ABORT,'no delete'); END;
    CREATE TRIGGER valoracion_saldo_type
      BEFORE INSERT ON valoracion_inversion
      WHEN (SELECT tipo FROM saldos WHERE id=NEW.saldo_inversion) IS NOT 'Inversión'
        OR (SELECT control FROM saldos WHERE id=NEW.saldo_inversion) IS NOT 'Inversiones'
      BEGIN SELECT RAISE(ABORT,'invalid valuation saldo'); END;
    CREATE TRIGGER valoracion_insert_initial
      BEFORE INSERT ON valoracion_inversion
      WHEN NEW.revision!=1 OR NEW.motivo_correccion IS NOT NULL
      BEGIN SELECT RAISE(ABORT,'initial valuation requires revision 1 without motive'); END;
    CREATE TRIGGER valoracion_update_correction
      BEFORE UPDATE ON valoracion_inversion
      WHEN NEW.revision!=OLD.revision+1
        OR NEW.motivo_correccion IS NULL
        OR length(trim(NEW.motivo_correccion))=0
      BEGIN SELECT RAISE(ABORT,'correction requires next revision and motive'); END;

    CREATE TABLE valoracion_inversion_audit(
      valoracion TEXT NOT NULL REFERENCES valoracion_inversion(id) ON DELETE RESTRICT,
      revision INTEGER NOT NULL CHECK(revision>0),
      accion TEXT NOT NULL CHECK(accion IN ('alta','corrección')),
      anterior TEXT,
      posterior TEXT NOT NULL CHECK(length(posterior)>0),
      motivo TEXT,
      instante TEXT NOT NULL,
      actor TEXT NOT NULL CHECK(length(trim(actor))>0),
      PRIMARY KEY(valoracion,revision),
      CHECK(
        (accion='alta' AND revision=1 AND anterior IS NULL AND motivo IS NULL)
        OR
        (accion='corrección' AND revision>1
          AND anterior IS NOT NULL AND length(anterior)>0
          AND motivo IS NOT NULL AND length(trim(motivo))>0)
      )
    ) STRICT;
    CREATE TRIGGER valoracion_audit_revision
      BEFORE INSERT ON valoracion_inversion_audit
      WHEN (SELECT revision FROM valoracion_inversion WHERE id=NEW.valoracion) IS NOT NEW.revision
      BEGIN SELECT RAISE(ABORT,'audit revision must match valuation'); END;
    CREATE TRIGGER valoracion_audit_no_update
      BEFORE UPDATE ON valoracion_inversion_audit
      BEGIN SELECT RAISE(ABORT,'immutable valuation audit'); END;
    CREATE TRIGGER valoracion_audit_no_delete
      BEFORE DELETE ON valoracion_inversion_audit
      BEGIN SELECT RAISE(ABORT,'immutable valuation audit'); END;

    CREATE TABLE valoracion_attempts(
      key TEXT PRIMARY KEY, hash TEXT NOT NULL, response TEXT NOT NULL, expires INTEGER NOT NULL
    ) STRICT;

    UPDATE schema_version SET version=24;
  `);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error(
      "Migración v24 rechazada: claves foráneas inconsistentes.",
    );
}
