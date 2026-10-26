import { anticipoSchema } from "./anticipo-schema";
import { assertV14VehicleContract, compartidoSchema } from "./compartido-schema";
import { vehicleSchema } from "./vehicle-schema";
import { payrollSchema } from "./payroll-schema";
import { annualPlanSchema } from "./annual-plan-schema";
import { cyclePlanSchema } from "./cycle-plan-schema";
import { cycleOperationSchema } from "./cycle-operation-schema";
import { budgetSchema, assertBudgetContract } from "./budget-schema";
import { debtSchema } from "./debt-schema";
import { Database } from "bun:sqlite";
import { classificationSchema } from "./classification-schema";
import { cycleSchema } from "./cycle-schema";
import { movementSchema } from "./movement-schema";
import { referenceSchema } from "./reference-schema";
import {
  installIdentity,
  inspectIdentity,
  type Identity,
} from "./database-identity";

// Internal schema builder: receives a connection, never opens a path or grants runtime access.
export function prepareSchema(db: Database, identity: Identity) {
  if (
    db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'",
      )
      .get()
  ) {
    const versions = db.query("SELECT version FROM schema_version").all() as {
      version: number;
    }[];
    if (
      versions.length !== 1 ||
      ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(
        versions[0].version,
      )
    ) {
      db.close();
      throw new Error("Esquema no compatible; no se modificará esta base.");
    }
    if (versions[0].version >= 8) assertBudgetContract(db);
    try {
      assertV14VehicleContract(db);
    } catch (error) {
      db.close();
      throw error;
    }
  } else if (
    db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .get()
  ) {
    db.close();
    throw new Error(
      "Esquema sin versión no compatible; no se modificará esta base.",
    );
  }
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;",
  );
  // Acquire the writer lock before schema reads; a deferred read-to-write upgrade can fail
  // immediately with SQLITE_BUSY even with busy_timeout configured.
  try {
    db.transaction(() => {
      const observed = inspectIdentity(db);
      if (observed && observed.origin !== identity.origin)
        throw new Error("Origen incompatible bajo bloqueo.");
      // Recheck under writer lock: another process may already have upgraded.
      const versionTable = db
        .query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'",
        )
        .get();
      const versions = versionTable
        ? (db.query("SELECT version FROM schema_version").all() as {
            version: number;
          }[])
        : [];
      if (versionTable) {
        if (
          versions.length !== 1 ||
          ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(
            versions[0].version,
          )
        )
          throw new Error("Esquema no compatible; no se modificará esta base.");
        if (versions[0].version === 1) classificationSchema(db);
        if (versions[0].version <= 2) cycleSchema(db);
        if (versions[0].version <= 3) movementSchema(db);
        if (versions[0].version <= 4) referenceSchema(db);
        if (versions[0].version < 6) installIdentity(db, identity);
        if (versions[0].version < 7) debtSchema(db);
        if (versions[0].version < 8) budgetSchema(db);
        else assertBudgetContract(db);
        if (versions[0].version < 9) cycleOperationSchema(db);
        if (versions[0].version < 10) cyclePlanSchema(db);
        if (versions[0].version < 11) annualPlanSchema(db);
        if (versions[0].version < 12) payrollSchema(db);
        if (versions[0].version < 13) anticipoSchema(db);
        // v14 belongs to Vehículos. Shared cases advance the schema to v15 and
        // require the v14 vehicle contract to be present before rebuilding tables.
        if (versions[0].version < 14) vehicleSchema(db);
        if (versions[0].version < 15) compartidoSchema(db);
        return; // Existing data is never re-seeded.
      }
      if (
        db
          .query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
          )
          .get()
      )
        throw new Error(
          "Esquema sin versión no compatible; no se modificará esta base.",
        );
      db.exec(`CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY) STRICT;
      CREATE TABLE IF NOT EXISTS saldos(
        id TEXT PRIMARY KEY, nombre TEXT NOT NULL, tipo TEXT NOT NULL CHECK(tipo IN ('Exterior','Efectivo','Inversión')),
        control TEXT NOT NULL CHECK(control IN ('Exterior','Movimientos','Terminal','No controlado','Inversiones','Manual')),
        estado TEXT NOT NULL CHECK(estado IN ('Activa','Inactiva')), finalidad TEXT,
        liquidez INTEGER CHECK(liquidez IN (0,1)), bolsa INTEGER CHECK(bolsa IN (0,1)), exterior INTEGER CHECK(exterior IN (0,1)),
        apertura INTEGER, fecha_apertura TEXT, objetivo INTEGER, manual INTEGER,
        revision INTEGER NOT NULL CHECK(revision>0), creado TEXT NOT NULL, actualizado TEXT NOT NULL
      ) STRICT;
      CREATE TRIGGER IF NOT EXISTS saldo_id_immutable BEFORE UPDATE OF id ON saldos
        WHEN NEW.id != OLD.id BEGIN SELECT RAISE(ABORT,'immutable id'); END;
      CREATE TRIGGER IF NOT EXISTS saldo_no_delete BEFORE DELETE ON saldos BEGIN SELECT RAISE(ABORT,'no delete'); END;
      CREATE TRIGGER IF NOT EXISTS exterior_protected BEFORE UPDATE ON saldos
        WHEN OLD.id='S000' BEGIN SELECT RAISE(ABORT,'protected system saldo'); END;
      CREATE TABLE IF NOT EXISTS counters(name TEXT PRIMARY KEY, next INTEGER NOT NULL CHECK(next>0)) STRICT;
      CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, entidad TEXT NOT NULL, accion TEXT NOT NULL,
        revision INTEGER NOT NULL, campos TEXT NOT NULL, instante TEXT NOT NULL,
        revision_previa INTEGER NOT NULL, actor TEXT NOT NULL, motivo TEXT) STRICT;
      CREATE TABLE IF NOT EXISTS auth_events(id INTEGER PRIMARY KEY, accion TEXT NOT NULL, instante INTEGER NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS idempotency(key TEXT PRIMARY KEY, hash TEXT NOT NULL, saldo TEXT NOT NULL REFERENCES saldos(id) ON DELETE RESTRICT,
        expires INTEGER NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS owner(id INTEGER PRIMARY KEY CHECK(id=1), password TEXT NOT NULL, secret TEXT NOT NULL,
        enabled INTEGER NOT NULL CHECK(enabled IN(0,1)), last_step INTEGER NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS bootstrap(hash TEXT PRIMARY KEY, expires INTEGER NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS challenges(hash TEXT PRIMARY KEY, expires INTEGER NOT NULL, attempts INTEGER NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, created INTEGER NOT NULL, seen INTEGER NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS recovery(hash TEXT PRIMARY KEY) STRICT;
      CREATE TABLE IF NOT EXISTS auth_limits(id INTEGER PRIMARY KEY CHECK(id=1), failures INTEGER NOT NULL,
        window INTEGER NOT NULL, blocked INTEGER NOT NULL) STRICT;
      INSERT OR IGNORE INTO schema_version VALUES(1);`);
      if (!db.query("SELECT id FROM saldos LIMIT 1").get()) {
        const insert = db.prepare(
          `INSERT INTO saldos VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        );
        const time = "2026-01-01T00:00:00.000Z";
        try {
          insert.run(
            "S000",
            "Exterior técnico",
            "Exterior",
            "Exterior",
            "Activa",
            null,
            0,
            0,
            0,
            null,
            null,
            null,
            null,
            1,
            time,
            time,
          );
          if (identity.origin === "demo")
            for (const [id, nombre, tipo, control] of [
              ["S001", "Cuenta cotidiana demo", "Efectivo", "Movimientos"],
              ["S002", "Tarjeta terminal demo", "Efectivo", "Terminal"],
              ["S003", "Efectivo de inversión demo", "Efectivo", "Inversiones"],
              ["S004", "Cartera de inversión demo", "Inversión", "Inversiones"],
              ["S005", "Reserva sin control demo", "Efectivo", "No controlado"],
            ])
              insert.run(
                id,
                nombre,
                tipo,
                control,
                "Activa",
                null,
                0,
                0,
                0,
                null,
                null,
                null,
                null,
                1,
                time,
                time,
              );
        } finally {
          insert.finalize();
        }
        db.run("INSERT OR IGNORE INTO counters VALUES('saldo',?)", [
          identity.origin === "demo" ? 6 : 1,
        ]);
      }
      classificationSchema(db);
      cycleSchema(db);
      movementSchema(db);
      referenceSchema(db);
      installIdentity(db, identity);
      debtSchema(db);
      budgetSchema(db);
      cycleOperationSchema(db);
      cyclePlanSchema(db);
      annualPlanSchema(db);
      payrollSchema(db);
      anticipoSchema(db);
      vehicleSchema(db);
      compartidoSchema(db);
    }).immediate();
  } catch (error) {
    db.close();
    throw error;
  }
}
