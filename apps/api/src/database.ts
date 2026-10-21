import { Database } from "bun:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { classificationSchema } from "./classification-schema";
import { cycleSchema } from "./cycle-schema";
import { movementSchema } from "./movement-schema";

import {
  referenceSchema,
  referenceSchemaVersion as schemaVersion,
} from "./reference-schema";

// Only fictional bootstrap data. Original Excel and real migration are outside this module.
export function openDatabase(path: string) {
  // E1.1 is demo-only. Reject before mkdir/open/PRAGMA/seed, including existing databases.
  if (!["development", "test"].includes(process.env.NODE_ENV ?? "")) {
    throw new Error(
      "E1.1 solo admite NODE_ENV=development o test y datos ficticios. Producción requiere inicialización limpia y migración autorizada.",
    );
  }
  if (path !== ":memory:")
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const mask = process.umask(0o077);
  let db: Database;
  try {
    db = new Database(path, { create: true, strict: true });
  } finally {
    process.umask(mask);
  }
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
      ![1, 2, 3, 4, schemaVersion].includes(versions[0].version)
    ) {
      db.close();
      throw new Error("Esquema no compatible; no se modificará esta base.");
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
          ![1, 2, 3, 4, schemaVersion].includes(versions[0].version)
        )
          throw new Error("Esquema no compatible; no se modificará esta base.");
        if (versions[0].version === 1) classificationSchema(db);
        if (versions[0].version <= 2) cycleSchema(db);
        if (versions[0].version <= 3) movementSchema(db);
        if (versions[0].version <= 4) referenceSchema(db);
        return; // Existing E1.1 data is never re-seeded (even if no Saldo exists).
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
        db.run("INSERT OR IGNORE INTO counters VALUES('saldo',6)");
      }
      classificationSchema(db);
      cycleSchema(db);
      movementSchema(db);
      referenceSchema(db);
    }).immediate();
  } catch (error) {
    db.close();
    throw error;
  }
  if (path !== ":memory:") chmodSync(path, 0o600);
  return db;
}
