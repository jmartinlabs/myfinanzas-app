import type { Database } from "bun:sqlite";

/**
 * E4.4 — schema 23 (22 → 23). Additive and non-destructive:
 *  - adds the nullable descriptive/historical fields of a Deuda without backfill
 *    (null is kept distinct from zero);
 *  - adds the dated reconciliation register (one current row per Deuda/date),
 *    its append-only audit and its idempotency attempts;
 *  - preserves IDs, Deudas, Partidas, Movimientos, Ciclos, auditoría, intentos,
 *    MFA and the demo/production identity.
 *
 * Exactness: EUR amounts are integer cents; TIN/TAE are exact decimal rates
 * scaled by 10^6 and bounded by ±(2^53−1) so they never rely on float. The
 * technical bound is not a business maximum (rate > 100 is allowed).
 *
 * Runs inside the existing opening IMMEDIATE transaction. A failure rolls the
 * whole DDL back; the caller verifies foreign keys on reopen.
 */
export function debtCompletaSchema(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 22)
    throw new Error(
      "Esquema previo inesperado para migración de Deuda completa v23.",
    );

  // A separate statement so a counter conflict is reported (Bun's multi-statement
  // exec may swallow non-DDL constraint errors) and the caller's transaction rolls back.
  db.run("INSERT INTO counters(name,next) VALUES('conciliaciones_deuda',1)");
  db.exec(`
    ALTER TABLE deudas ADD COLUMN tipo_deuda TEXT
      CHECK(tipo_deuda IS NULL OR tipo_deuda IN ('Hipotecaria','No hipotecaria'));
    ALTER TABLE deudas ADD COLUMN tin INTEGER
      CHECK(tin IS NULL OR (tin BETWEEN -9007199254740991 AND 9007199254740991));
    ALTER TABLE deudas ADD COLUMN tae INTEGER
      CHECK(tae IS NULL OR (tae BETWEEN -9007199254740991 AND 9007199254740991));
    ALTER TABLE deudas ADD COLUMN cuota_contractual INTEGER
      CHECK(cuota_contractual IS NULL OR cuota_contractual>=0);
    ALTER TABLE deudas ADD COLUMN condiciones TEXT
      CHECK(condiciones IS NULL OR length(condiciones)<=1000);
    ALTER TABLE deudas ADD COLUMN capital_inicial INTEGER;
    ALTER TABLE deudas ADD COLUMN capital_amortizado_historico INTEGER;
    ALTER TABLE deudas ADD COLUMN amortizacion_extra_historica INTEGER;
    ALTER TABLE deudas ADD COLUMN capital_historico_cuotas INTEGER;
    ALTER TABLE deudas ADD COLUMN intereses_historicos INTEGER;
    ALTER TABLE deudas ADD COLUMN total_pagado_historico INTEGER;
    ALTER TABLE deudas ADD COLUMN precontrol_cuotas INTEGER
      CHECK(precontrol_cuotas IS NULL OR precontrol_cuotas BETWEEN 1 AND 9999);
    ALTER TABLE deudas ADD COLUMN precontrol_capital INTEGER;
    ALTER TABLE deudas ADD COLUMN precontrol_amortizacion_extra INTEGER;
    ALTER TABLE deudas ADD COLUMN precontrol_ejercicio INTEGER
      CHECK(precontrol_ejercicio IS NULL OR precontrol_ejercicio BETWEEN 1 AND 9999);

    CREATE TABLE conciliaciones_deuda(
      id TEXT PRIMARY KEY CHECK(id GLOB 'C[0-9]*' AND substr(id,2) NOT GLOB '*[^0-9]*' AND length(id)>=4),
      deuda TEXT NOT NULL REFERENCES deudas(id) ON DELETE RESTRICT,
      fecha_corte TEXT NOT NULL,
      capital_declarado INTEGER NOT NULL,
      fuente TEXT CHECK(fuente IS NULL OR length(fuente)<=200),
      nota TEXT CHECK(nota IS NULL OR length(nota)<=1000),
      estado TEXT NOT NULL CHECK(estado IN ('Vigente','Anulada')),
      revision INTEGER NOT NULL CHECK(revision>0),
      actor TEXT NOT NULL CHECK(length(trim(actor))>0),
      creado TEXT NOT NULL,
      actualizado TEXT NOT NULL
    ) STRICT;
    CREATE UNIQUE INDEX conciliacion_vigente_unica
      ON conciliaciones_deuda(deuda,fecha_corte) WHERE estado='Vigente';
    CREATE INDEX conciliacion_historial
      ON conciliaciones_deuda(deuda,estado,fecha_corte);
    CREATE TRIGGER conciliacion_id_immutable BEFORE UPDATE OF id ON conciliaciones_deuda
      WHEN NEW.id!=OLD.id BEGIN SELECT RAISE(ABORT,'immutable id'); END;
    CREATE TRIGGER conciliacion_deuda_immutable BEFORE UPDATE OF deuda ON conciliaciones_deuda
      WHEN NEW.deuda!=OLD.deuda BEGIN SELECT RAISE(ABORT,'immutable debt'); END;
    CREATE TRIGGER conciliacion_no_delete BEFORE DELETE ON conciliaciones_deuda
      BEGIN SELECT RAISE(ABORT,'no delete'); END;

    CREATE TABLE conciliaciones_deuda_audit(
      id INTEGER PRIMARY KEY,
      conciliacion TEXT NOT NULL REFERENCES conciliaciones_deuda(id) ON DELETE RESTRICT,
      accion TEXT NOT NULL CHECK(accion IN ('alta','corrección','anulación')),
      revision INTEGER NOT NULL CHECK(revision>0),
      anterior TEXT,
      posterior TEXT NOT NULL,
      motivo TEXT,
      instante TEXT NOT NULL,
      actor TEXT NOT NULL CHECK(length(trim(actor))>0)
    ) STRICT;
    CREATE TRIGGER conciliacion_audit_no_update BEFORE UPDATE ON conciliaciones_deuda_audit
      BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
    CREATE TRIGGER conciliacion_audit_no_delete BEFORE DELETE ON conciliaciones_deuda_audit
      BEGIN SELECT RAISE(ABORT,'immutable audit'); END;

    CREATE TABLE conciliacion_attempts(
      key TEXT PRIMARY KEY, hash TEXT NOT NULL, response TEXT NOT NULL, expires INTEGER NOT NULL
    ) STRICT;

    UPDATE schema_version SET version=23;
  `);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error(
      "Migración v23 rechazada: claves foráneas inconsistentes.",
    );
}
