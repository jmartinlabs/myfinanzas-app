import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { prepareSchema } from "./database-schema";
import { openDatabase } from "./database";
import { contract, manifest, verifyContract } from "./schema-contract";
import { materializeContract } from "../test-support/inversiones-schema";
import { backup, restore } from "./backup";
import { Auth, provision, totp } from "./auth";

const t = "2026-01-01T00:00:00.000Z";
const root = () => mkdtempSync(join(process.cwd(), ".tmp-e44-"));
const c24 = "C24-E43-VALORACION";
const c23 = "C23-E44-DEUDA-COMPLETA";
const c22 = "C22-E35-FIN-NETA";

function ageKeys(dir: string) {
  const identity = join(dir, "identity.txt");
  const generated = Bun.spawnSync(["age-keygen", "-o", identity], {
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(generated.exitCode).toBe(0);
  const recipient = Bun.spawnSync(["age-keygen", "-y", identity], {
    stdout: "pipe",
    stderr: "pipe",
  })
    .stdout.toString()
    .trim();
  return { identity, recipient };
}

function decryptBundle(identity: string, source: string) {
  const decrypted = Bun.spawnSync(
    ["age", "-d", "-i", identity, join(source, "database.age")],
    { stdout: "pipe", stderr: "pipe" },
  );
  expect(decrypted.exitCode).toBe(0);
  return {
    bundle: JSON.parse(decrypted.stdout.toString()),
    bytes: decrypted.stdout,
  };
}

function v22(path: string) {
  materializeContract(path, c22, (db) => {
    db.run(
      `INSERT INTO deudas(id,nombre,inicio,apertura,estado,revision,creado,actualizado)
       VALUES('D001','Deuda v22 ficticia','2026-10-01',100000,'Activa',1,?,?)`,
      [t, t],
    );
    db.run(
      `INSERT INTO saldos(id,nombre,tipo,control,estado,revision,creado,actualizado)
       VALUES('S000','Exterior técnico','Exterior','Exterior','Activa',1,?,?)`,
      [t, t],
    );
  });
}

test("E4.4 AC-24: C23 stays frozen and the v22→v24 upgrade exposes the exact C24 contract", () => {
  const c23Contract = contract(c23);
  expect(c23Contract.schemaVersion).toBe(23);
  expect(c23Contract.objects).toHaveLength(270);
  expect(c23Contract.sha256).toBe(
    "96b2425152883435005095af0f010e8ff488558773cf5b6f4c2d500b77df9026",
  );
  expect(c23Contract.id).toBe("C23-E44-DEUDA-COMPLETA");
  const c24Contract = contract(c24);
  expect(c24Contract.schemaVersion).toBe(24);

  const fresh = new Database(":memory:");
  try {
    prepareSchema(fresh, { origin: "demo", key_hash: null });
    expect(manifest(fresh)).toEqual(c24Contract.objects);
    expect(verifyContract(fresh, 24)).toBe(c24);
  } finally {
    fresh.close();
  }

  const frozen = contract(c22);
  expect(frozen.objects).toHaveLength(260);
  expect(frozen.sha256).toBe(
    "3a951d9fec22ae4d9f25b9a00f8536b84b4bcd7b0fc24cffcb02bb4174bb5f1f",
  );

  const dir = root();
  try {
    const genuine = join(dir, "genuine-v22.sqlite");
    materializeContract(genuine, c22);
    const raw = new Database(genuine);
    try {
      expect(verifyContract(raw, 22)).toBe(c22);
      expect(raw.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      raw.close();
    }

    const upgradedPath = join(dir, "upgraded.sqlite");
    materializeContract(upgradedPath, c22);
    const upgraded = openDatabase(upgradedPath);
    try {
      expect(upgraded.query("SELECT version FROM schema_version").get()).toEqual({
        version: 24,
      });
      expect(manifest(upgraded)).toEqual(c24Contract.objects);
      expect(verifyContract(upgraded, 24)).toBe(c24);
    } finally {
      upgraded.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// publishNewDirectory is Linux-specific (libc.so.6/renameat2); the canonical
// backup gate runs on Linux CI. On macOS this test is reported as skipped.
test.skipIf(process.platform !== "linux")(
  "E4.4 AC-24: v24 backup/manifest/restore keeps new fields, reconciliation and MFA",
  async () => {
  process.env.NODE_ENV = "test";
  const dir = root();
  try {
    const state = join(dir, "state");
    mkdirSync(state, { mode: 0o700 });
    const path = join(state, "database.sqlite");
    const db = openDatabase(path);
    const key = randomBytes(32);
    const auth = new Auth(db, key);
    const password = "Contraseña ficticia " + randomUUID();
    let enrolled: { secret?: string } = {};
    try {
      enrolled = await auth.enroll(provision(db), password);
      db.run(
        `INSERT INTO deudas(id,nombre,inicio,apertura,estado,revision,creado,actualizado,
          tipo_deuda,tin,tae,cuota_contractual,condiciones,capital_inicial,
          capital_amortizado_historico,amortizacion_extra_historica,capital_historico_cuotas,
          intereses_historicos,total_pagado_historico,precontrol_cuotas,precontrol_capital,
          precontrol_amortizacion_extra,precontrol_ejercicio)
         VALUES('D001','Deuda v23 ficticia','2026-10-01',100000,'Activa',1,?,?,
          'No hipotecaria',2500000,2800000,10000,'Condiciones ficticias',120000,20000,0,
          120000,30000,150000,3,5000,0,2026)`,
        [t, t],
      );
      db.run(
        `INSERT INTO conciliaciones_deuda(id,deuda,fecha_corte,capital_declarado,fuente,nota,estado,revision,actor,creado,actualizado)
         VALUES('C001','D001','2026-10-20',75000,'Banco ficticio','Extracto ficticio','Vigente',1,'usuario-unico',?,?)`,
        [t, t],
      );
      db.run(
        "INSERT INTO conciliacion_attempts VALUES('intento','hash','{}',1)",
      );
      db.run("INSERT INTO sessions VALUES('vieja','csrf',1,1)");
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      db.close();
    }

    const reopen = openDatabase(path);
    const { identity, recipient } = ageKeys(dir);
    const source = join(dir, "backup");
    try {
      backup(reopen, key, source, recipient);
    } finally {
      reopen.close();
    }

    const { bundle } = decryptBundle(identity, source);
    expect(bundle.manifest).toMatchObject({
      app: "e4.3-v24",
      schema: 24,
      origin: "demo",
    });

    const restored = restore(source, join(dir, "restored"), identity);
    const copy = openDatabase(restored.database);
    try {
      expect(copy.query("SELECT version FROM schema_version").get()).toEqual({
        version: 24,
      });
      expect(
        copy
          .query(
            `SELECT tipo_deuda,tin,tae,cuota_contractual,condiciones,capital_inicial,
                    precontrol_cuotas,precontrol_ejercicio
             FROM deudas WHERE id='D001'`,
          )
          .get(),
      ).toEqual({
        tipo_deuda: "No hipotecaria",
        tin: 2500000,
        tae: 2800000,
        cuota_contractual: 10000,
        condiciones: "Condiciones ficticias",
        capital_inicial: 120000,
        precontrol_cuotas: 3,
        precontrol_ejercicio: 2026,
      });
      expect(
        copy
          .query(
            "SELECT id,deuda,fecha_corte,capital_declarado,fuente,nota,estado FROM conciliaciones_deuda",
          )
          .all(),
      ).toEqual([
        {
          id: "C001",
          deuda: "D001",
          fecha_corte: "2026-10-20",
          capital_declarado: 75000,
          fuente: "Banco ficticio",
          nota: "Extracto ficticio",
          estado: "Vigente",
        },
      ]);
      for (const table of [
        "sessions",
        "challenges",
        "bootstrap",
        "recovery",
        "auth_limits",
        "idempotency",
        "debt_attempts",
        "conciliacion_attempts",
        "valoracion_attempts",
      ])
        expect(copy.query(`SELECT COUNT(*) n FROM ${table}`).get()).toEqual({
          n: 0,
        });
      expect(copy.query("PRAGMA foreign_key_check").all()).toEqual([]);

      const restoredAuth = new Auth(copy, readFileSync(restored.key));
      const challenge = await restoredAuth.login(password);
      const verified = restoredAuth.verify(
        new Request("http://127.0.0.1:5173", {
          headers: {
            cookie: restoredAuth.challengeName + "=" + challenge.challenge,
          },
        }),
        totp(enrolled.secret!).generate({ timestamp: Date.now() + 30000 }),
      );
      expect(verified.session).toBeString();
    } finally {
      copy.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test.skipIf(process.platform !== "linux")(
  "E4.4 AC-24: historical v22 backups keep e35-v22 and restore; unadmitted versions fail",
  () => {
  process.env.NODE_ENV = "test";
  const dir = root();
  try {
    const sourcePath = join(dir, "v22.sqlite");
    v22(sourcePath);
    const sourceDb = new Database(sourcePath, { strict: true });
    const { identity, recipient } = ageKeys(dir);
    const source = join(dir, "v22-backup");
    try {
      backup(sourceDb, randomBytes(32), source, recipient);
    } finally {
      sourceDb.close();
    }

    const { bundle } = decryptBundle(identity, source);
    expect(bundle.manifest).toMatchObject({
      app: "e35-v22",
      schema: 22,
      origin: "demo",
    });

    const restored = restore(source, join(dir, "v22-restored"), identity);
    const copy = new Database(restored.database, {
      readonly: true,
      strict: true,
    });
    try {
      expect(copy.query("SELECT version FROM schema_version").get()).toEqual({
        version: 22,
      });
      expect(copy.query("SELECT id,nombre FROM deudas").all()).toEqual([
        { id: "D001", nombre: "Deuda v22 ficticia" },
      ]);
      expect(copy.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      copy.close();
    }

    const corrupt = join(dir, "unadmitted");
    mkdirSync(corrupt, { mode: 0o700 });
    const plaintext = join(corrupt, "bundle.tmp");
    const altered = structuredClone(bundle);
    altered.manifest.schema = 25;
    writeFileSync(plaintext, JSON.stringify(altered), { mode: 0o600 });
    cpSync(join(source, "access-key.age"), join(corrupt, "access-key.age"));
    expect(
      Bun.spawnSync(
        [
          "age",
          "--encrypt",
          "--recipient",
          recipient,
          "-o",
          join(corrupt, "database.age"),
          plaintext,
        ],
        { stdout: "pipe", stderr: "pipe" },
      ).exitCode,
    ).toBe(0);
    rmSync(plaintext);
    expect(() => restore(corrupt, join(dir, "unadmitted-restored"), identity)).toThrow(
      "Paquete o checksum inválido.",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
