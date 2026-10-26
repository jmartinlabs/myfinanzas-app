import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { openDatabase as openV3 } from "../test-support/database-v3";
import { openDatabase } from "./database";
import { keyHash } from "./database-identity";
import { initializeProduction } from "./production-state";

const databaseModule = resolve(import.meta.dir, "database.ts");

// Runs SQL in a separate process that dies before closing: its committed transaction stays
// only in the WAL (no checkpoint), so the database file keeps the previous state.
function commitOnlyInWal(path: string, sql: string) {
  const r = Bun.spawnSync(
    [
      process.execPath,
      "-e",
      `import{Database}from"bun:sqlite";const d=new Database(${JSON.stringify(path)});d.exec("PRAGMA wal_autocheckpoint=0");d.exec(${JSON.stringify(sql)});process.kill(process.pid,"SIGKILL");`,
    ],
    { stderr: "pipe" },
  );
  expect(r.stderr.toString()).toBe("");
  expect(r.signalCode).toBe("SIGKILL");
  expect(fs.statSync(path + "-wal").size).toBeGreaterThan(32);
}
function runChild(code: string, env: Record<string, string | undefined>) {
  const r = Bun.spawnSync([process.execPath, "-e", code], {
    env,
    stderr: "pipe",
  });
  expect(r.stderr.toString()).toBe("");
  expect(r.exitCode).toBe(0);
}
// Test-only construction: the identity triggers are dropped and restored inside these
// fixtures to place a different, already-committed identity in the database file and in
// the WAL. Only a reader honouring SQLite's WAL/locking sees the current one.
const replaceIdentity = (set: string) =>
  `DROP TRIGGER origin_no_update;UPDATE database_origin SET ${set};CREATE TRIGGER origin_no_update BEFORE UPDATE ON database_origin BEGIN SELECT RAISE(ABORT,'immutable origin'); END;`;

// Each child opens through the real product path and reports technical error codes only.
function child(path: string, loopMs: number) {
  const code = `import{openDatabase}from${JSON.stringify(databaseModule)};
const end=performance.now()+${loopMs};let opens=0;const errors=[];
do{try{openDatabase(${JSON.stringify(path)}).close();opens++;}catch(e){errors.push(String(e.code??e.name)+"/"+String(e.errno??"-")+"/"+String(e.message).slice(0,40));}}while(performance.now()<end);
console.log(JSON.stringify({opens,errors}));`;
  return Bun.spawn([process.execPath, "-e", code], {
    env: { ...process.env, NODE_ENV: "test" },
    stdout: "pipe",
    stderr: "pipe",
  });
}

// 31-E1 AC-34: the AC23 scene. Two real upgraders migrate a genuine v3 database while a
// third process reopens it continuously; no opening may observe torn or mixed identity.
test("31 AC34: concurrent genuine v3 upgrades never yield SQLITE_CORRUPT or mixed identity on open", async () => {
  const root = fs.mkdtempSync(join(tmpdir(), "mf-ac34-"));
  const rounds = 40;
  const failures: string[] = [];
  let opens = 0;
  try {
    for (let r = 0; r < rounds; r++) {
      const path = join(root, `round-${r}.sqlite`);
      openV3(path).close();
      const procs = [child(path, 0), child(path, 0), child(path, 400)];
      const results = await Promise.all(
        procs.map(async (p) => {
          const [out, err, exit] = await Promise.all([
            new Response(p.stdout).text(),
            new Response(p.stderr).text(),
            p.exited,
          ]);
          return { out, err, exit };
        }),
      );
      for (const { out, err, exit } of results) {
        if (exit !== 0 || err !== "") {
          failures.push(`round ${r}: exit ${exit} stderr ${err.slice(0, 80)}`);
          continue;
        }
        const parsed = JSON.parse(out) as { opens: number; errors: string[] };
        opens += parsed.opens;
        failures.push(...parsed.errors.map((e) => `round ${r}: ${e}`));
      }
      const db = new Database(path, { readonly: true });
      try {
        expect(db.query("PRAGMA integrity_check").get()).toEqual({
          integrity_check: "ok",
        });
        expect(db.query("SELECT version FROM schema_version").get()).toEqual({
          version: 16,
        });
      } finally {
        db.close();
      }
    }
    expect(failures).toEqual([]);
    expect(opens).toBeGreaterThan(rounds * 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 120000);

// 31-E1 AC-34, deterministic half: a lock-free or WAL-ignoring pre-open read (the former
// immutable=1 probe) sees the stale file and rejects; the conventional check opens.
test("31 AC34: demo opening reads the identity committed in the WAL, not the stale file", () => {
  const root = fs.mkdtempSync(join(tmpdir(), "mf-ac34-wal-"));
  const saved = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "test";
    const path = join(root, "demo.sqlite");
    runChild(
      `import{openDatabase}from${JSON.stringify(databaseModule)};openDatabase(${JSON.stringify(path)}).close();`,
      { ...process.env },
    );
    runChild(
      `import{Database}from"bun:sqlite";const d=new Database(${JSON.stringify(path)});d.exec(${JSON.stringify(replaceIdentity("origin='production',key_hash=lower(hex(randomblob(32)))"))});d.exec("PRAGMA wal_checkpoint(TRUNCATE)");d.close();`,
      { ...process.env },
    );
    commitOnlyInWal(path, replaceIdentity("origin='demo',key_hash=NULL"));
    const db = openDatabase(path);
    try {
      expect(
        db.query("SELECT origin,key_hash FROM database_origin").get(),
      ).toEqual({ origin: "demo", key_hash: null });
    } finally {
      db.close();
    }
  } finally {
    if (saved === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("31 AC34: production opening binds the key to the identity committed in the WAL", () => {
  const names = ["NODE_ENV", "DATABASE_PATH", "AUTH_KEY_PATH", "APP_ORIGIN"];
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  const root = fs.mkdtempSync(join(tmpdir(), "mf-ac34-prod-"));
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      DATABASE_PATH: join(root, "state", "database.sqlite"),
      AUTH_KEY_PATH: join(root, "state", "auth.key"),
      APP_ORIGIN: "https://myfinanzas.pp.ua",
    });
    const path = process.env.DATABASE_PATH!;
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    initializeProduction();
    const next = randomBytes(32);
    commitOnlyInWal(path, replaceIdentity(`key_hash='${keyHash(next)}'`));
    fs.writeFileSync(process.env.AUTH_KEY_PATH!, next, { mode: 0o600 });
    const db = openDatabase(path);
    try {
      expect(
        (
          db.query("SELECT key_hash FROM database_origin").get() as {
            key_hash: string;
          }
        ).key_hash,
      ).toBe(keyHash(next));
    } finally {
      db.close();
    }
  } finally {
    for (const n of names)
      if (saved[n] === undefined) delete process.env[n];
      else process.env[n] = saved[n];
    fs.rmSync(root, { recursive: true, force: true });
  }
});
