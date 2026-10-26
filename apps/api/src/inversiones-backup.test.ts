import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { backup, restore } from "./backup";
import { openDatabase } from "./database";
import { loadKey } from "./auth";
import { createInstrumento } from "./instrumentos";
import { createPurchase } from "./compras";
import { getSaldo, updateSaldo } from "./saldos";
import { openDatabaseV13 } from "../test-support/database-v13";
import { materializeContract } from "../test-support/inversiones-schema";

const now = Date.parse("2026-10-26T12:00:00Z");

function ageIdentity(dir: string) {
  const identity = join(dir, "identity.txt");
  expect(
    Bun.spawnSync(["age-keygen", "-o", identity], { stderr: "pipe" }).exitCode,
  ).toBe(0);
  const recipient = Bun.spawnSync(["age-keygen", "-y", identity], {
    stderr: "pipe",
  });
  expect(recipient.exitCode).toBe(0);
  return { identity, recipient: recipient.stdout.toString().trim() };
}

function version(path: string) {
  const db = new Database(path, { readonly: true, strict: true });
  try {
    return (db.query("SELECT version FROM schema_version").get() as {
      version: number;
    }).version;
  } finally {
    db.close();
  }
}

function run(
  origin: string,
  schema: number,
  expectedLabel: string,
  open: (path: string) => Database,
  sourceRows?: (db: Database) => void,
) {
  const dir = mkdtempSync(join(tmpdir(), "e41-restore-"));
  try {
    const source = join(dir, "source.sqlite"),
      keyPath = join(dir, "auth.key"),
      db = open(source);
    db.run("INSERT INTO sessions VALUES('historic-session','csrf',1,1)");
    sourceRows?.(db);
    const key = loadKey(db, keyPath);
    const { identity, recipient } = ageIdentity(dir);
    const bundlePath = join(dir, "backup");
    backup(db, key, bundlePath, recipient);
    db.close();
    const decrypted = Bun.spawnSync(
      ["age", "-d", "-i", identity, join(bundlePath, "database.age")],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(decrypted.exitCode).toBe(0);
    const bundle = JSON.parse(decrypted.stdout.toString());
    expect(bundle.manifest).toMatchObject({
      app: expectedLabel,
      schema,
      origin,
    });
    const restoredPath = join(dir, "restored");
    const restored = restore(bundlePath, restoredPath, identity);
    expect(version(restored.database)).toBe(schema);
    const copy = new Database(restored.database, { readonly: true, strict: true });
    try {
      expect(copy.query("SELECT COUNT(*) n FROM sessions").get()).toEqual({
        n: 0,
      });
      const instruments = copy
        .query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='instrumentos'",
        )
        .get();
      if (schema >= 16) {
        expect(instruments).not.toBeNull();
        expect(copy.query("SELECT COUNT(*) n FROM instrumentos").get()).toEqual({
          n: 1,
        });
        expect(
          copy.query("SELECT COUNT(*) n FROM operaciones_inversion").get(),
        ).toEqual({ n: 1 });
        expect(
          copy.query("SELECT COUNT(*) n FROM instrumento_attempts").get(),
        ).toEqual({ n: 0 });
        expect(
          copy.query("SELECT COUNT(*) n FROM operacion_attempts").get(),
        ).toEqual({ n: 0 });
      } else expect(instruments).toBeNull();
    } finally {
      copy.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("E4.1-AC-33(h): backup/restore 13, 14, 15 y 16 en directorio nuevo", () => {
  run("demo", 13, "e3.1-v13", (path) => {
    const db = openDatabaseV13(path);
    db.run(
      "INSERT INTO referencias VALUES('REF500','Histórica v13','Viaje','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
    );
    return db;
  });

  const v14 = (path: string) => {
    materializeContract(path, "C14-VEHICULOS-C69E343", (db) => {
      db.run(
        "INSERT INTO referencias VALUES('REF900','Vehículo v14','Vehículo','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
      );
      db.run(
        "INSERT INTO fichas_vehiculo VALUES('REF900','1234ABC','2026-07-01','2026-06-01',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
      );
    });
    return new Database(path, { strict: true });
  };
  run("demo", 14, "e3.3-v14", v14);

  const v15 = (path: string) => {
    materializeContract(path, "C15-COMPARTIDOS-AD2EDFE", (db) => {
      db.run(
        "INSERT INTO referencias VALUES('REF9001','Compartido v15','Gasto compartido','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
      );
      db.run(
        "INSERT INTO fichas_compartidos VALUES('REF9001',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
      );
    });
    return new Database(path, { strict: true });
  };
  run("demo", 15, "e3.2-v15", v15);

  run("demo", 16, "e4.1-v16", (path) => openDatabase(path), (db) => {
    updateSaldo(db, "S003", {
      revision: getSaldo(db, "S003").revision,
      saldoApertura: "100.00",
      fechaApertura: "2026-01-01",
    });
    const instrumento = createInstrumento(
      db,
      { nombre: "Fondo restore v16" },
      randomUUID(),
      now,
    ).instrumento;
    createPurchase(
      db,
      {
        fecha: "2026-02-01",
        instrumento: instrumento.id,
        saldoEfectivo: "S003",
        saldoInversion: "S004",
        cantidad: "1",
        precio: "10.00",
        divisa: "EUR",
        cambio: null,
        importeEur: "10.00",
        comisionEur: null,
        concepto: "Restore v16",
        nota: null,
      },
      randomUUID(),
      now,
    );
  });
});

test("E4.1-AC-33(h): copia 14 desconocida no se publica", () => {
  const dir = mkdtempSync(join(tmpdir(), "e41-unknown-"));
  try {
    const source = join(dir, "source.sqlite");
    materializeContract(source, "C14-VEHICULOS-C69E343");
    const sourceDb = new Database(source, { strict: true });
    const key = loadKey(sourceDb, join(dir, "auth.key"));
    const { identity, recipient } = ageIdentity(dir);
    const validBundle = join(dir, "valid-backup");
    backup(sourceDb, key, validBundle, recipient);
    sourceDb.close();
    const decrypted = Bun.spawnSync(
      ["age", "-d", "-i", identity, join(validBundle, "database.age")],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(decrypted.exitCode).toBe(0);
    const bundle = JSON.parse(decrypted.stdout.toString());
    const altered = join(dir, "altered.sqlite");
    writeFileSync(altered, Buffer.from(bundle.database, "base64"));
    const alteredDb = new Database(altered);
    alteredDb.exec("CREATE TABLE synthetic_demo(x INTEGER)");
    alteredDb.close();
    bundle.database = readFileSync(altered).toString("base64");
    bundle.manifest.sha256 = createHash("sha256")
      .update(readFileSync(altered))
      .digest("hex");
    const unknownBundle = join(dir, "unknown-backup");
    mkdirSync(unknownBundle, { recursive: true, mode: 0o700 });
    const raw = join(dir, "bundle.tmp");
    writeFileSync(raw, JSON.stringify(bundle), { mode: 0o600 });
    expect(
      Bun.spawnSync(
        [
          "age",
          "--encrypt",
          "--recipient",
          recipient,
          "--output",
          join(unknownBundle, "database.age"),
          raw,
        ],
        { stderr: "pipe" },
      ).exitCode,
    ).toBe(0);
    writeFileSync(
      join(unknownBundle, "access-key.age"),
      readFileSync(join(validBundle, "access-key.age")),
    );
    const target = join(dir, "unknown-restored");
    expect(() => restore(unknownBundle, target, identity)).toThrow(
      "Contrato de esquema v14 desconocido o incompleto; no se modificará esta base.",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
