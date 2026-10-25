import { openDatabase as openDatabaseV2 } from "../test-support/database-v2";
import { openDatabase as openDatabaseV3 } from "../test-support/database-v3";
import { openDatabase as openDatabaseV4 } from "../test-support/database-v4";
import { createSaldo } from "./saldos";
import { createReference } from "./referencias";
import { previewMovement, writeMovement } from "./movimientos";
import { test, expect, spyOn } from "bun:test";
import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { initializeProduction } from "./production-state";
import {
  productionConfig,
  publishNewDirectory,
  readPrivateKey,
  verifyProductionFiles,
  openProductionConnection,
} from "./private-state";
import { inspectIdentity } from "./database-identity";
import { openDatabase } from "./database";
import { openDatabaseV5 } from "../test-support/database-v5";
import { openDatabase as openDatabaseV1 } from "../test-support/database-v1";
import { Auth, loadKey, provision, totp } from "./auth";
import { createApp } from "./app";
import { backup, restore } from "./backup";

const variables = [
  "NODE_ENV",
  "DATABASE_PATH",
  "AUTH_KEY_PATH",
  "APP_ORIGIN",
] as const;
async function production(
  run: (root: string, path: string, key: string) => void | Promise<void>,
) {
  const saved = Object.fromEntries(variables.map((k) => [k, process.env[k]]));
  const root = fs.mkdtempSync(join(tmpdir(), "mf-production-"));
  const path = join(root, "state", "database.sqlite"),
    key = join(root, "state", "auth.key");
  Object.assign(process.env, {
    NODE_ENV: "production",
    DATABASE_PATH: path,
    AUTH_KEY_PATH: key,
    APP_ORIGIN: "https://myfinanzas.pp.ua",
  });
  try {
    await run(root, path, key);
  } finally {
    for (const k of variables)
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    fs.rmSync(root, { recursive: true, force: true });
  }
}
const spawn = (script: string, args: string[] = [], env = process.env) =>
  Bun.spawnSync([process.execPath, script, ...args], {
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
function readonly(path: string, read: (db: Database) => void) {
  const db = new Database(path, { readonly: true });
  try {
    read(db);
  } finally {
    db.close();
  }
}

test("31 P1 AC01–07/10/11: explicit clean creation, first ID and symmetric fail-closed origins", async () =>
  production(async (root, path, key) => {
    expect(() => openDatabase(path)).toThrow();
    expect(fs.existsSync(dirname(path))).toBe(false);
    initializeProduction();
    expect(fs.readFileSync(key)).toHaveLength(32);
    const before = fs.readFileSync(path);
    readonly(path, (db) => {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 13,
      });
      expect(db.query("SELECT id FROM saldos").all()).toEqual([{ id: "S000" }]);
      expect(
        db.query("SELECT next FROM counters WHERE name='saldo'").get(),
      ).toEqual({ next: 1 });
      for (const table of [
        "owner",
        "bootstrap",
        "movimientos",
        "categorias",
        "subcategorias",
        "partidas",
        "ciclos",
        "referencias",
      ])
        expect(db.query(`SELECT * FROM ${table}`).all()).toEqual([]);
    });
    for (const mode of ["development", "test", undefined, "staging"]) {
      if (mode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = mode;
      expect(() => openDatabase(path)).toThrow();
      if (mode === "development" || mode === "test") {
        for (const [script, args] of [
          ["apps/api/src/main.ts", []],
          ["apps/api/src/setup.ts", [join(dirname(path), "token")]],
          [
            "apps/api/src/backup-cli.ts",
            ["create", join(root, "wrong-copy"), "age1invalid"],
          ],
          ["apps/api/src/production-init.ts", []],
        ] as const)
          expect(spawn(script, [...args]).exitCode).not.toBe(0);
      }
      expect(fs.readFileSync(path).equals(before)).toBe(true);
    }
    process.env.NODE_ENV = "production";
    for (let i = 0; i < 2; i++) openDatabase(path).close();
    const reopened = fs.readFileSync(path),
      originalKey = fs.readFileSync(key);
    expect(() => initializeProduction()).toThrow();
    expect(fs.readFileSync(path)).toEqual(reopened);
    expect(fs.readFileSync(key).equals(originalKey)).toBe(true);
    // Legacy/demo contents are never a source of production identity, even with private paths.
    const demo = join(root, "demo.sqlite");
    process.env.NODE_ENV = "test";
    openDatabase(demo).close();
    process.env.NODE_ENV = "production";
    process.env.DATABASE_PATH = demo;
    process.env.AUTH_KEY_PATH = join(root, "demo.key");
    fs.writeFileSync(process.env.AUTH_KEY_PATH!, randomBytes(32), {
      mode: 0o600,
    });
    const demoBefore = fs.readFileSync(demo);
    expect(() => openDatabase(demo)).toThrow();
    for (const [script, args] of [
      ["apps/api/src/main.ts", []],
      ["apps/api/src/setup.ts", [join(root, "token")]],
      [
        "apps/api/src/backup-cli.ts",
        ["create", join(root, "wrong-copy"), "age1invalid"],
      ],
    ] as const)
      expect(spawn(script, [...args]).exitCode).not.toBe(0);
    expect(fs.readFileSync(demo).equals(demoBefore)).toBe(true);
    const scrubbed = new Database(demo);
    scrubbed.exec(
      "DROP TRIGGER saldo_no_delete; DELETE FROM saldos WHERE id<>'S000'",
    );
    scrubbed.close();
    const scrubbedBefore = fs.readFileSync(demo);
    expect(() => openDatabase(demo)).toThrow();
    expect(fs.readFileSync(demo).equals(scrubbedBefore)).toBe(true);
  }));

test("31 P2 AC08/09: genuine v1–v5 upgrade conserves rows; preliminary and unknown identity rejected", async () =>
  production((root) => {
    process.env.NODE_ENV = "test";
    for (const [version, init] of [
      [1, openDatabaseV1],
      [2, openDatabaseV2],
      [3, openDatabaseV3],
      [4, openDatabaseV4],
      [5, openDatabaseV5],
    ] as const) {
      const path = join(root, `legacy-${version}.sqlite`);
      const old = init(path);
      const saldos = old.query("SELECT * FROM saldos ORDER BY id").all();
      old.close();
      const legacyBefore = fs.readFileSync(path);
      process.env.NODE_ENV = "production";
      process.env.DATABASE_PATH = path;
      process.env.AUTH_KEY_PATH = join(root, `legacy-${version}.key`);
      fs.writeFileSync(process.env.AUTH_KEY_PATH!, randomBytes(32), {
        mode: 0o600,
      });
      expect(() => openDatabase(path)).toThrow();
      expect(fs.readFileSync(path).equals(legacyBefore)).toBe(true);
      process.env.NODE_ENV = "test";
      const db = openDatabase(path);
      expect(inspectIdentity(db)?.origin).toBe("demo");
      expect(db.query("SELECT * FROM saldos ORDER BY id").all()).toEqual(
        saldos,
      );
      db.close();
    }
    const preliminary = join(root, "preliminary.sqlite"),
      p = openDatabaseV5(preliminary);
    p.exec(
      "CREATE TABLE database_origin(origin TEXT); INSERT INTO database_origin VALUES('production')",
    );
    p.close();
    const bytes = fs.readFileSync(preliminary);
    expect(() => openDatabase(preliminary)).toThrow();
    expect(fs.readFileSync(preliminary).equals(bytes)).toBe(true);
    const unknown = join(root, "unknown.sqlite"),
      u = openDatabaseV5(unknown);
    u.exec("UPDATE schema_version SET version=999");
    u.close();
    const before = fs.readFileSync(unknown);
    expect(() => openDatabase(unknown)).toThrow();
    expect(fs.readFileSync(unknown).equals(before)).toBe(true);
    // Fail metadata installation after older migrations have run: rollback must include version/data.
    const rollback = join(root, "rollback.sqlite"),
      r = openDatabaseV5(rollback);
    r.exec(
      "CREATE TRIGGER origin_no_update BEFORE UPDATE ON schema_version BEGIN SELECT RAISE(ABORT,'synthetic failure'); END",
    );
    r.close();
    expect(() => openDatabase(rollback)).toThrow();
    readonly(rollback, (db) =>
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 5,
      }),
    );
  }));

test("31 P3 AC11–14/18: unsafe paths, aliases, permissions and lost key never repaired", async () =>
  production((root, path, key) => {
    const config = productionConfig();
    for (const invalid of [
      "relative.sqlite",
      ":memory:",
      path + " ",
      join(dirname(path), "bundle.tmp"),
      root + "/state/../escaped.sqlite",
    ]) {
      process.env.DATABASE_PATH = invalid;
      expect(() => initializeProduction()).toThrow();
    }
    process.env.DATABASE_PATH = path;
    process.env.APP_ORIGIN = "http://127.0.0.1:5173";
    expect(() => initializeProduction()).toThrow();
    process.env.APP_ORIGIN = config.origin;
    process.env.AUTH_KEY_PATH = path;
    expect(() => initializeProduction()).toThrow();
    process.env.AUTH_KEY_PATH = path + "-wal";
    expect(() => initializeProduction()).toThrow();
    process.env.AUTH_KEY_PATH = key;
    fs.chmodSync(root, 0o755);
    expect(() => initializeProduction()).toThrow();
    fs.chmodSync(root, 0o700);
    initializeProduction();
    const bytes = fs.readFileSync(path),
      originalKey = fs.readFileSync(key);
    fs.chmodSync(key, 0o644);
    expect(() => openDatabase(path)).toThrow();
    expect(fs.statSync(key).mode & 0o777).toBe(0o644);
    fs.chmodSync(key, 0o600);
    fs.unlinkSync(key);
    expect(() => openDatabase(path)).toThrow();
    expect(fs.existsSync(key)).toBe(false);
    fs.writeFileSync(key, randomBytes(32), { mode: 0o600 });
    expect(() => openDatabase(path)).toThrow();
    fs.writeFileSync(key, Buffer.alloc(3));
    expect(() => openDatabase(path)).toThrow();
    fs.unlinkSync(key);
    fs.symlinkSync(path, key);
    expect(() => openDatabase(path)).toThrow();
    fs.unlinkSync(key);
    fs.linkSync(path, key);
    expect(() => openDatabase(path)).toThrow();
    fs.unlinkSync(key);
    fs.writeFileSync(key, originalKey, { mode: 0o600 });
    const alias = join(root, "alias");
    fs.symlinkSync(dirname(path), alias);
    process.env.DATABASE_PATH = join(alias, "database.sqlite");
    process.env.AUTH_KEY_PATH = join(alias, "auth.key");
    expect(() => openDatabase(process.env.DATABASE_PATH!)).toThrow();
    expect(fs.readFileSync(path).equals(bytes)).toBe(true);
  }));

test("31 P4 AC15/16: two real initializers, exclusive publication and injected sync failure", async () =>
  production(async (root, path) => {
    const children = [0, 1].map(() =>
      Bun.spawn([process.execPath, "apps/api/src/production-init.ts"], {
        env: process.env,
        stdout: "pipe",
        stderr: "pipe",
      }),
    );
    const results = await Promise.all(
      children.map(async (c) => ({
        exit: await c.exited,
        out: await new Response(c.stdout).text(),
        err: await new Response(c.stderr).text(),
      })),
    );
    expect(results.filter((r) => r.exit === 0)).toHaveLength(1);
    expect(results.filter((r) => r.exit !== 0)).toHaveLength(1);
    openDatabase(path).close();
    const stage = fs.mkdtempSync(join(root, "stage-")),
      target = join(root, "existing");
    fs.mkdirSync(target, { mode: 0o700 });
    expect(() => publishNewDirectory(stage, target)).toThrow();
    expect(fs.existsSync(stage)).toBe(true);
    expect(fs.readdirSync(target)).toEqual([]);
    process.env.DATABASE_PATH = join(root, "failure", "database.sqlite");
    process.env.AUTH_KEY_PATH = join(root, "failure", "auth.key");
    const injected = spyOn(fs, "fsyncSync").mockImplementation(() => {
      throw new Error("synthetic ENOSPC");
    });
    try {
      expect(() => initializeProduction()).toThrow();
      expect(fs.existsSync(join(root, "failure"))).toBe(false);
    } finally {
      injected.mockRestore();
    }
    expect(fs.readdirSync(root).some((n) => n.startsWith(".initialize-"))).toBe(
      false,
    );
  }));

async function api(
  db: Database,
  key: Buffer,
  origin = "https://myfinanzas.pp.ua",
  now = Date.now,
) {
  const handler = HttpApp.toWebHandler(createApp(db, { key, origin, now }));
  let cookie = "",
    csrf = "";
  const request = async (
    path: string,
    method = "GET",
    body?: unknown,
    extra: Record<string, string> = {},
  ) => {
    const response = await handler(
      new Request(origin + "/api" + path, {
        method,
        headers: {
          origin,
          cookie,
          "content-type": "application/json",
          "x-csrf-token": csrf,
          ...extra,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    for (const s of response.headers.getSetCookie()) {
      const part = s.split(";")[0],
        name = part.split("=")[0];
      cookie = cookie
        .split("; ")
        .filter((p) => p && !p.startsWith(name + "="))
        .concat(part)
        .join("; ");
    }
    const data = await response.json();
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data, headers: response.headers };
  };
  return { request };
}

test("31 P5 AC04/18–23: private CLI token and complete production MFA/API contract", async () =>
  production(async (root, path, keyPath) => {
    initializeProduction();
    const output = join(dirname(path), "token.txt");
    const setup = spawn("apps/api/src/setup.ts", [output]);
    expect(setup.exitCode).toBe(0);
    const token = fs.readFileSync(output, "utf8");
    expect(token).toHaveLength(43);
    expect(setup.stdout.toString().includes(token)).toBe(false);
    expect(setup.stderr.toString().includes(token)).toBe(false);
    expect(fs.statSync(output).mode & 0o777).toBe(0o600);
    const db = openDatabase(path),
      key = loadKey(db, keyPath);
    try {
      const hash = db.query("SELECT hash FROM bootstrap").get();
      expect(spawn("apps/api/src/setup.ts", [output]).exitCode).not.toBe(0);
      expect(db.query("SELECT hash FROM bootstrap").get()).toEqual(hash);
      const f = await api(db, key);
      expect((await f.request("/saldos")).status).toBe(401);
      const pass = "Synthetic testing " + randomUUID();
      const enrolled = await f.request("/auth/enroll", "POST", {
        token,
        password: pass,
      });
      expect(enrolled.status).toBe(200);
      expect((await f.request("/saldos")).status).toBe(401);
      const verified = await f.request("/auth/mfa", "POST", {
        code: totp(enrolled.data.secret).generate(),
      });
      expect(verified.status).toBe(200);
      expect(verified.data.recoveryCodes).toHaveLength(10);
      expect(verified.headers.getSetCookie().join(";")).toContain("Secure");
      expect(verified.headers.getSetCookie().join(";")).toContain(
        "__Host-mf_session",
      );
      expect((await f.request("/saldos")).data.total).toBe(0);
      const input = {
        nombre: "Synthetic",
        tipo: "Efectivo",
        control: "Movimientos",
      };
      expect(
        (
          await f.request("/saldos", "POST", input, {
            origin: "https://wrong.invalid",
            "idempotency-key": randomUUID(),
          })
        ).status,
      ).toBe(403);
      const saldo = await f.request("/saldos", "POST", input, {
        "idempotency-key": randomUUID(),
      });
      expect(saldo.status).toBe(201);
      expect(saldo.data.saldo.id).toBe("S001");
      expect((await f.request("/referencias")).data.total).toBe(0);
      expect((await f.request("/movimientos")).data.total).toBe(0);
      const second = await f.request(
        "/saldos",
        "POST",
        { ...input, nombre: "Synthetic second" },
        { "idempotency-key": randomUUID() },
      );
      const write = async (body: Record<string, unknown>) => {
        const preview = await f.request("/movimientos/impacto", "POST", body);
        expect(preview.status).toBe(200);
        const saved = await f.request(
          "/movimientos",
          "POST",
          {
            ...body,
            fingerprint: preview.data.fingerprint,
            aceptarCoincidencia: true,
          },
          { "idempotency-key": randomUUID() },
        );
        expect(saved.status).toBe(201);
        return saved;
      };
      await write({
        tipo: "Ingreso",
        fecha: "2026-01-01",
        importe: "50",
        saldo: "S001",
        subtipo: "Bonus",
        concepto: "Synthetic income",
      });
      await write({
        tipo: "Transferencia",
        fecha: "2026-01-01",
        importe: "20",
        origen: "S001",
        destino: second.data.saldo.id,
        concepto: "Synthetic transfer",
      });
      expect((await f.request("/movimientos")).data.total).toBe(2);
      expect(
        (await f.request("/saldos/S001")).data.saldo.posicion.importe,
      ).toBe("30.00");
      expect(
        (
          await f.request("/saldos", "POST", input, {
            "x-csrf-token": "invalid",
            "idempotency-key": randomUUID(),
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await f.request("/auth/mfa", "POST", {
            code: totp(enrolled.data.secret).generate(),
          })
        ).status,
      ).not.toBe(200);
      const next = join(dirname(path), "next-token.txt");
      expect(spawn("apps/api/src/setup.ts", [next]).exitCode).not.toBe(0);
      expect(fs.existsSync(next)).toBe(false);
      fs.unlinkSync(output);
      // Key remains mandatory after owner activation too.
      const original = fs.readFileSync(keyPath);
      fs.unlinkSync(keyPath);
      expect(() => openDatabase(path)).toThrow();
      fs.writeFileSync(keyPath, original, { mode: 0o600 });
    } finally {
      db.close();
    }
  }));

test("31 P6 AC24–29: encrypted production identity roundtrip and crossing rejection", async () =>
  production(async (root, path, keyPath) => {
    initializeProduction();
    let db = openDatabase(path);
    const key = loadKey(db, keyPath);
    const identity = join(root, "identity.txt");
    const generated = Bun.spawnSync(
      [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-o", identity],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(generated.exitCode).toBe(0);
    const recipient = Bun.spawnSync(
      [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-y", identity],
      { stdout: "pipe", stderr: "pipe" },
    )
      .stdout.toString()
      .trim();
    const pass = "Synthetic " + randomUUID(),
      auth = new Auth(db, key, process.env.APP_ORIGIN);
    const enrollment = await auth.enroll(provision(db), pass);
    // Use API for MFA so returned session/codes never enter test output.
    const f = await api(db, key);
    const login = await f.request("/auth/login", "POST", { password: pass });
    expect(login.status).toBe(200);
    const verification = await f.request("/auth/mfa", "POST", {
      code: totp(enrollment.secret!).generate(),
    });
    expect(verification.status).toBe(200);
    const a = createSaldo(
      db,
      {
        nombre: "Synthetic restored A",
        tipo: "Efectivo",
        control: "Movimientos",
      },
      randomUUID(),
    );
    const b = createSaldo(
      db,
      {
        nombre: "Synthetic restored B",
        tipo: "Efectivo",
        control: "Movimientos",
      },
      randomUUID(),
    );
    const ref = createReference(
      db,
      { nombre: "Synthetic restored case", tipo: "Viaje" },
      randomUUID(),
    );
    for (const body of [
      {
        tipo: "Ingreso",
        fecha: "2026-01-01",
        importe: "50",
        saldo: a.id,
        subtipo: "Bonus",
        concepto: "Synthetic income",
      },
      {
        tipo: "Transferencia",
        fecha: "2026-01-01",
        importe: "20",
        origen: a.id,
        destino: b.id,
        referencia: ref.id,
        concepto: "Synthetic transfer",
      },
    ]) {
      const plan = previewMovement(db, body);
      writeMovement(
        db,
        { ...body, fingerprint: plan.fingerprint, aceptarCoincidencia: true },
        randomUUID(),
      );
    }
    const business = [
      "saldos",
      "movimientos",
      "movement_audit",
      "referencias",
      "audit",
      "counters",
    ].map(
      (table) =>
        [
          table,
          db.query(`SELECT * FROM ${table} ORDER BY rowid`).all(),
        ] as const,
    );
    const copy = join(root, "copy");
    backup(db, key, copy, recipient);
    db.close();
    const target = join(root, "restored");
    process.env.DATABASE_PATH = join(target, "database.sqlite");
    process.env.AUTH_KEY_PATH = join(target, "auth.key");
    const restored = restore(copy, target, identity);
    db = openDatabase(restored.database);
    try {
      for (const [table, rows] of business)
        expect(db.query(`SELECT * FROM ${table} ORDER BY rowid`).all()).toEqual(
          rows,
        );
      expect(inspectIdentity(db)?.origin).toBe("production");
      expect(db.query("SELECT * FROM sessions").all()).toEqual([]);
      expect(db.query("SELECT * FROM recovery").all()).toEqual([]);
      expect(db.query("SELECT * FROM challenges").all()).toEqual([]);
      expect(db.query("SELECT * FROM bootstrap").all()).toEqual([]);
      const restoredAPI = await api(
        db,
        loadKey(db, restored.key),
        process.env.APP_ORIGIN,
        () => Date.now() + 30000,
      );
      expect((await restoredAPI.request("/movimientos")).status).toBe(401);
      expect(
        (await restoredAPI.request("/auth/login", "POST", { password: pass }))
          .status,
      ).toBe(200);
      const result = await restoredAPI.request("/auth/mfa", "POST", {
        code: totp(enrollment.secret!).generate({
          timestamp: Date.now() + 30000,
        }),
      });
      expect(result.status).toBe(200);
      expect(result.data.recoveryCodes).toHaveLength(10);
      expect((await restoredAPI.request("/movimientos")).data.total).toBe(2);
      expect((await restoredAPI.request("/referencias")).data.total).toBe(1);
    } finally {
      db.close();
    }
    process.env.NODE_ENV = "test";
    expect(() => restore(copy, join(root, "crossed"), identity)).toThrow();
    expect(fs.existsSync(join(root, "crossed"))).toBe(false);
    expect(() => openDatabase(restored.database)).toThrow();
  }));

test("31 P7 AC01/02/05/06/19–21: all CLI entrypoints preserve rejection boundary and private delivery rollback", async () =>
  production(async (root, path, key) => {
    for (const mode of [undefined, "staging", "production"]) {
      for (const [script, args] of [
        ["apps/api/src/main.ts", []],
        ["apps/api/src/setup.ts", [join(dirname(path), "token")]],
        [
          "apps/api/src/backup-cli.ts",
          ["create", join(root, "copy"), "age1invalid"],
        ],
      ] as const) {
        const env = { ...process.env };
        if (mode === undefined) delete env.NODE_ENV;
        else env.NODE_ENV = mode;
        const result = spawn(script, [...args], env);
        expect(result.exitCode).not.toBe(0);
        expect(fs.existsSync(dirname(path))).toBe(false);
      }
    }
    for (const mode of [undefined, "staging", "development", "test"]) {
      const env = { ...process.env };
      if (mode === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = mode;
      expect(
        spawn("apps/api/src/production-init.ts", [], env).exitCode,
      ).not.toBe(0);
      expect(fs.existsSync(dirname(path))).toBe(false);
    }
    initializeProduction();
    const output = join(dirname(path), "delivered.txt");
    const code = `import {spyOn} from 'bun:test';import * as fs from 'node:fs';process.argv[2]=${JSON.stringify(output)};spyOn(fs,'writeFileSync').mockImplementation(()=>{throw new Error('synthetic ENOSPC')});await import('./apps/api/src/setup.ts');`;
    const result = Bun.spawnSync([process.execPath, "-e", code], {
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(result.exitCode).not.toBe(0);
    expect(fs.existsSync(output)).toBe(false);
    const db = openDatabase(path);
    try {
      expect(db.query("SELECT * FROM bootstrap").all()).toEqual([]);
      const now = Date.now();
      const value = provision(db, now);
      const auth = new Auth(
        db,
        loadKey(db, key),
        process.env.APP_ORIGIN,
        () => now + 600001,
      );
      let rejected = false;
      try {
        await auth.enroll(value, "Synthetic " + randomUUID());
      } catch {
        rejected = true;
      }
      expect(rejected).toBe(true);
    } finally {
      db.close();
    }
  }));

test("31 P8 AC16: actual process death before/after publication never accepts a partial pair", async () =>
  production(async (root) => {
    for (const killAt of [1, 4]) {
      const state = join(root, `crash-${killAt}`);
      process.env.DATABASE_PATH = join(state, "database.sqlite");
      process.env.AUTH_KEY_PATH = join(state, "auth.key");
      const code = `import {spyOn} from 'bun:test';import * as fs from 'node:fs';import {initializeProduction} from './apps/api/src/production-state';const original=fs.fsyncSync;let count=0;spyOn(fs,'fsyncSync').mockImplementation(fd=>{original(fd);if(++count===${killAt})process.kill(process.pid,'SIGKILL')});initializeProduction();`;
      const result = Bun.spawnSync([process.execPath, "-e", code], {
        env: process.env,
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(result.exitCode).not.toBe(0);
      if (killAt === 1) {
        expect(() => openDatabase(process.env.DATABASE_PATH!)).toThrow();
        expect(fs.existsSync(state)).toBe(false);
      } else {
        const db = openDatabase(process.env.DATABASE_PATH!);
        expect(inspectIdentity(db)?.origin).toBe("production");
        db.close();
      }
    }
    const leftovers = fs
      .readdirSync(root)
      .filter((n) => n.startsWith(".initialize-"));
    expect(leftovers.length).toBeGreaterThan(0);
    for (const entry of leftovers) {
      expect(fs.statSync(join(root, entry)).mode & 0o777).toBe(0o700);
      process.env.DATABASE_PATH = join(root, entry, "database.sqlite");
      process.env.AUTH_KEY_PATH = join(root, entry, "auth.key");
      expect(() => openDatabase(process.env.DATABASE_PATH!)).toThrow();
    }
  }));

test("31 P9 AC09/24/28/29: malformed markers and encrypted manifest/key corruption fail closed", async () =>
  production(async (root, path, keyPath) => {
    initializeProduction();
    const db = openDatabase(path),
      key = loadKey(db, keyPath);
    const identity = join(root, "identity.txt");
    expect(
      Bun.spawnSync(["age-keygen", "-o", identity], {
        stdout: "pipe",
        stderr: "pipe",
      }).exitCode,
    ).toBe(0);
    const recipient = Bun.spawnSync(["age-keygen", "-y", identity], {
      stdout: "pipe",
      stderr: "pipe",
    })
      .stdout.toString()
      .trim();
    const source = join(root, "copy");
    backup(db, key, source, recipient);
    db.close();
    const raw = Bun.spawnSync(
      [
        "age",
        "--decrypt",
        "--identity",
        identity,
        join(source, "database.age"),
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(raw.exitCode).toBe(0);
    const original = JSON.parse(raw.stdout.toString());
    for (const kind of ["origin", "version", "checksum", "key", "age"]) {
      const copy = join(root, `corrupt-${kind}`);
      fs.mkdirSync(copy, { mode: 0o700 });
      const bundle = structuredClone(original);
      if (kind === "origin") bundle.manifest.origin = "demo";
      if (kind === "version") bundle.manifest.schema = 999;
      if (kind === "checksum") bundle.manifest.sha256 = "0".repeat(64);
      if (kind === "age")
        bundle.manifest.created = new Date(
          Date.now() - 2 * 86400000,
        ).toISOString();
      const plaintext = join(copy, "bundle.tmp");
      fs.writeFileSync(plaintext, JSON.stringify(bundle), { mode: 0o600 });
      expect(
        Bun.spawnSync(
          [
            "age",
            "--encrypt",
            "--recipient",
            recipient,
            "-o",
            join(copy, "database.age"),
            plaintext,
          ],
          { stdout: "pipe", stderr: "pipe" },
        ).exitCode,
      ).toBe(0);
      fs.unlinkSync(plaintext);
      if (kind === "key") {
        fs.writeFileSync(plaintext, randomBytes(32), { mode: 0o600 });
        expect(
          Bun.spawnSync(
            [
              "age",
              "--encrypt",
              "--recipient",
              recipient,
              "-o",
              join(copy, "access-key.age"),
              plaintext,
            ],
            { stdout: "pipe", stderr: "pipe" },
          ).exitCode,
        ).toBe(0);
        fs.unlinkSync(plaintext);
      } else
        fs.copyFileSync(
          join(source, "access-key.age"),
          join(copy, "access-key.age"),
        );
      const target = join(root, `restore-${kind}`);
      process.env.DATABASE_PATH = join(target, "database.sqlite");
      process.env.AUTH_KEY_PATH = join(target, "auth.key");
      expect(() => restore(copy, target, identity)).toThrow();
      expect(fs.existsSync(target)).toBe(false);
      if (kind === "age") {
        restore(copy, target, identity, { allowOlder: true });
        openDatabase(process.env.DATABASE_PATH!).close();
        const before = fs.readFileSync(process.env.DATABASE_PATH!);
        expect(() =>
          restore(copy, target, identity, { allowOlder: true }),
        ).toThrow();
        expect(fs.readFileSync(process.env.DATABASE_PATH!).equals(before)).toBe(
          true,
        );
      }
    }
    // Even without a schema-level constraint, duplicate/contradictory identity is rejected.
    const invalid = join(root, "invalid.sqlite");
    process.env.NODE_ENV = "test";
    openDatabase(invalid).close();
    const rawDB = new Database(invalid);
    rawDB.exec(
      "DROP TABLE database_origin; CREATE TABLE database_origin(id INTEGER,contract INTEGER,origin TEXT,key_hash TEXT); INSERT INTO database_origin VALUES(1,1,'demo',NULL),(1,1,'production',NULL)",
    );
    rawDB.close();
    const before = fs.readFileSync(invalid);
    expect(() => openDatabase(invalid)).toThrow();
    expect(fs.readFileSync(invalid).equals(before)).toBe(true);
  }));

test("31 P10 AC14/16/17/20: wrong UID, write failure, private token symlink and concurrent runtime", async () =>
  production(async (root, path, key) => {
    const original = fs.lstatSync;
    const owner = spyOn(fs, "lstatSync").mockImplementation(((
      p: fs.PathLike,
      ...args: unknown[]
    ) => {
      const st = original(p);
      if (p === root)
        Object.defineProperty(st, "uid", { value: process.getuid!() + 1 });
      return st;
    }) as typeof fs.lstatSync);
    try {
      expect(() => initializeProduction()).toThrow();
    } finally {
      owner.mockRestore();
    }
    let writes = 0;
    const originalWrite = fs.writeFileSync;
    const failed = spyOn(fs, "writeFileSync").mockImplementation(((
      ...args: Parameters<typeof fs.writeFileSync>
    ) => {
      if (++writes === 2) throw new Error("synthetic ENOSPC");
      return originalWrite(...args);
    }) as typeof fs.writeFileSync);
    try {
      expect(() => initializeProduction()).toThrow();
      expect(fs.existsSync(dirname(path))).toBe(false);
    } finally {
      failed.mockRestore();
    }
    initializeProduction();
    const output = join(dirname(path), "token-link");
    fs.symlinkSync(key, output);
    const keyBefore = fs.readFileSync(key);
    expect(spawn("apps/api/src/setup.ts", [output]).exitCode).not.toBe(0);
    expect(fs.readFileSync(key).equals(keyBefore)).toBe(true);
    const db = openDatabase(path);
    db.exec("BEGIN IMMEDIATE");
    const marker = join(root, "started");
    const code = `import {openDatabase} from './apps/api/src/database';import {writeFileSync} from 'node:fs';writeFileSync(${JSON.stringify(marker)},'ready');openDatabase(process.env.DATABASE_PATH!).close();`;
    const child = Bun.spawn([process.execPath, "-e", code], {
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    try {
      const deadline = Date.now() + 2000;
      while (!fs.existsSync(marker) && Date.now() < deadline)
        await Bun.sleep(5);
      expect(fs.existsSync(marker)).toBe(true);
      await Bun.sleep(30);
      db.exec("COMMIT");
      expect(await child.exited).toBe(0);
      expect(
        (
          db.query("PRAGMA integrity_check").get() as {
            integrity_check: string;
          }
        ).integrity_check,
      ).toBe("ok");
    } finally {
      child.kill();
      db.close();
    }
  }));

test("31 P11 AC02/03/10/22: real production main serves minimal health and denies anonymous data", async () =>
  production(async (_root, path) => {
    initializeProduction();
    const child = Bun.spawn([process.execPath, "apps/api/src/main.ts"], {
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = new Response(child.stdout).text(),
      errors = new Response(child.stderr).text();
    try {
      let ready = false;
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        try {
          const r = await fetch("http://127.0.0.1:3001/api/health", {
            signal: AbortSignal.timeout(300),
          });
          if (r.ok) {
            expect(await r.json()).toEqual({ ok: true });
            ready = true;
            break;
          }
        } catch {}
        await Bun.sleep(20);
      }
      expect(ready).toBe(true);
      expect(
        await (await fetch("http://127.0.0.1:3001/api/auth/status")).json(),
      ).toEqual({ configured: false });
      const denied = await fetch("http://127.0.0.1:3001/api/movimientos");
      expect(denied.status).toBe(401);
      expect(denied.headers.get("cache-control")).toBe("no-store");
    } finally {
      child.kill();
      await child.exited;
      await output;
      await errors;
    }
    openDatabase(path).close();
  }));

test("31 P12 AC13/14/18: revalidate actual key descriptor after a path replacement", async () =>
  production((root, path, key) => {
    initializeProduction();
    const originalOpen = fs.openSync;
    const other = join(root, "linked-key");
    fs.writeFileSync(other, fs.readFileSync(key), { mode: 0o600 });
    let swapped = false;
    const swap = spyOn(fs, "openSync").mockImplementation(((
      ...args: Parameters<typeof fs.openSync>
    ) => {
      if (args[0] === key && !swapped) {
        swapped = true;
        fs.unlinkSync(key);
        fs.linkSync(other, key);
      }
      return originalOpen(...args);
    }) as typeof fs.openSync);
    try {
      expect(() => {
        readPrivateKey(key);
      }).toThrow();
    } finally {
      swap.mockRestore();
    }
    expect(swapped).toBe(true);
    expect(fs.statSync(other).nlink).toBe(2);
  }));

test("31 P13 AC13/14/24: reject SQLite sidecar links and unsafe backup parent before snapshot", async () =>
  production((root, path, key) => {
    initializeProduction();
    const foreign = join(root, "foreign-file");
    fs.writeFileSync(foreign, "unchanged fictitious sentinel", { mode: 0o600 });
    const rejected: boolean[] = [];
    for (const link of [fs.symlinkSync, fs.linkSync]) {
      for (const suffix of ["-wal", "-shm", "-journal"]) {
        fs.rmSync(path + suffix, { force: true });
        link(foreign, path + suffix);
        try {
          verifyProductionFiles(productionConfig());
          rejected.push(false);
        } catch {
          rejected.push(true);
        } finally {
          fs.rmSync(path + suffix, { force: true });
        }
        expect(fs.readFileSync(foreign, "utf8")).toBe(
          "unchanged fictitious sentinel",
        );
      }
    }
    expect(rejected).toEqual([true, true, true, true, true, true]);
  }));

test("31 P15 AC14/24: validate backup parent before producing a snapshot", async () =>
  production((root, path, key) => {
    initializeProduction();
    const db = openDatabase(path),
      appKey = loadKey(db, key);
    const unsafe = join(root, "unsafe");
    fs.mkdirSync(unsafe, { mode: 0o777 });
    fs.chmodSync(unsafe, 0o777);
    const run = db.run.bind(db);
    let snapshots = 0;
    const spy = spyOn(db, "run").mockImplementation(((
      ...args: Parameters<typeof db.run>
    ) => {
      if (String(args[0]).startsWith("VACUUM")) {
        snapshots++;
        throw Error("snapshot must not start");
      }
      return run(...args);
    }) as typeof db.run);
    try {
      expect(() =>
        backup(db, appKey, join(unsafe, "copy"), "age1invalid-test-recipient"),
      ).toThrow();
      expect(snapshots).toBe(0);
      expect(fs.readdirSync(unsafe)).toEqual([]);
    } finally {
      spy.mockRestore();
      db.close();
    }
  }));

test("31 P14 AC18/24: bind the key to the effective database handle, not another configured pair", async () =>
  production((root, path, key) => {
    initializeProduction();
    const db = openDatabase(path);
    process.env.DATABASE_PATH = join(root, "second", "database.sqlite");
    process.env.AUTH_KEY_PATH = join(root, "second", "auth.key");
    initializeProduction();
    try {
      expect(() => {
        loadKey(db, process.env.AUTH_KEY_PATH!);
      }).toThrow();
    } finally {
      db.close();
    }
  }));

test("31 P16 AC02/13/18: removal between validation and SQLite open never recreates a database", async () =>
  production((root, path) => {
    initializeProduction();
    const config = productionConfig(),
      saved = join(root, "saved.sqlite");
    const close = fs.closeSync;
    let removed = false,
      closes = 0;
    const race = spyOn(fs, "closeSync").mockImplementation((fd) => {
      if (++closes === 2 && !removed) {
        removed = true;
        fs.renameSync(path, saved);
      }
      return close(fd);
    });
    try {
      expect(() => {
        openProductionConnection(config, false);
      }).toThrow();
    } finally {
      race.mockRestore();
    }
    expect(removed).toBe(true);
    expect(fs.existsSync(path)).toBe(false);
    readonly(saved, (db) =>
      expect(inspectIdentity(db)?.origin).toBe("production"),
    );
  }));

test("31 P17 AC13/15/16: publication pins the parent and rejects its concurrent replacement", async () =>
  production((root) => {
    const parent = join(root, "publication"),
      moved = join(root, "moved");
    fs.mkdirSync(parent, { mode: 0o700 });
    const stage = fs.mkdtempSync(join(parent, ".initialize-")),
      target = join(parent, "state");
    fs.writeFileSync(join(stage, "sentinel"), "fictitious", { mode: 0o600 });
    const open = fs.openSync;
    let replaced = false;
    const race = spyOn(fs, "openSync").mockImplementation(((
      ...args: Parameters<typeof fs.openSync>
    ) => {
      const fd = open(...args);
      if (args[0] === parent && !replaced) {
        replaced = true;
        fs.renameSync(parent, moved);
        fs.mkdirSync(parent, { mode: 0o700 });
      }
      return fd;
    }) as typeof fs.openSync);
    try {
      expect(() => publishNewDirectory(stage, target)).toThrow();
    } finally {
      race.mockRestore();
    }
    expect(replaced).toBe(true);
    expect(fs.readdirSync(parent)).toEqual([]);
    expect(
      fs.readFileSync(
        join(moved, stage.slice(parent.length + 1), "sentinel"),
        "utf8",
      ),
    ).toBe("fictitious");
  }));

test("31 P18 AC20: failed token delivery never unlinks a replacement owned by another operation", async () =>
  production((root, path) => {
    initializeProduction();
    const output = join(dirname(path), "bootstrap-token");
    const code = `import {spyOn} from 'bun:test';import * as fs from 'node:fs';const write=fs.writeFileSync;process.argv[2]=${JSON.stringify(output)};spyOn(fs,'writeFileSync').mockImplementation((...args)=>{if(typeof args[0]==='number'){fs.unlinkSync(${JSON.stringify(output)});write(${JSON.stringify(output)},'separate fictitious operation',{mode:0o600});throw Error('synthetic delivery failure');}return write(...args)});await import('./apps/api/src/setup.ts');`;
    const result = spawn("-e", [code]);
    expect(result.exitCode).not.toBe(0);
    expect(fs.existsSync(output)).toBe(true);
    expect(fs.readFileSync(output, "utf8")).toBe(
      "separate fictitious operation",
    );
    readonly(path, (db) =>
      expect(db.query("SELECT * FROM bootstrap").all()).toEqual([]),
    );
  }));
