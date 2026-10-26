import { test, expect, spyOn } from "bun:test";
import { Database } from "bun:sqlite";
import {
  chmodSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { prepareSchema } from "./database-schema";
import { prepareV13 } from "../test-support/database-v13";
import { openDatabase } from "./database";
import { keyHash } from "./database-identity";

for (const journal of ["DELETE", "WAL"] as const) {
  for (const entry of ["builder", "demo", "production"] as const) {
    test(`v14 rejection preserves file bytes and ${journal} journal through ${entry}`, () => {
      const dir = mkdtempSync(join(tmpdir(), "mf-v14-reject-"));
      const path = join(dir, "fixture.sqlite"),
        keyPath = join(dir, "auth.key");
      const names = [
        "NODE_ENV",
        "DATABASE_PATH",
        "AUTH_KEY_PATH",
        "APP_ORIGIN",
      ] as const;
      const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
      let db: Database | undefined;
      try {
        db = new Database(path);
        chmodSync(path, 0o600);
        prepareV13(db);
        // A historical Base B variant has version 14 but no vehicle sheet.
        db.run("UPDATE schema_version SET version=14");
        if (entry === "production") {
          const key = randomBytes(32);
          writeFileSync(keyPath, key, { mode: 0o600 });
          const trigger = db
            .query(
              "SELECT sql FROM sqlite_master WHERE name='origin_no_update'",
            )
            .get() as { sql: string };
          db.exec("DROP TRIGGER origin_no_update");
          db.run("UPDATE database_origin SET origin='production',key_hash=?", [
            keyHash(key),
          ]);
          db.exec(trigger.sql);
        }
        db.exec(`PRAGMA journal_mode=${journal}`);
        const objects = db
          .query(
            "SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name",
          )
          .all();
        db.close();
        chmodSync(path, 0o600);
        const bytes = readFileSync(path);
        const files = readdirSync(dir).sort();
        Object.assign(process.env, {
          NODE_ENV: entry === "production" ? "production" : "test",
          DATABASE_PATH: path,
          AUTH_KEY_PATH: keyPath,
          APP_ORIGIN: "https://example.invalid",
        });
        expect(() => {
          if (entry === "builder") {
            db = new Database(path);
            prepareSchema(db, { origin: "demo", key_hash: null });
          } else {
            db = openDatabase(path);
          }
        }).toThrow("Variante v14 sin contrato de Vehículos");
        // Check before reopening: the rejected attempt must not rewrite the file.
        expect(readFileSync(path)).toEqual(bytes);
        expect(readdirSync(dir).sort()).toEqual(files);
        db = new Database(path, { readonly: true });
        expect(db.query("PRAGMA journal_mode").get()).toEqual({
          journal_mode: journal.toLowerCase(),
        });
        expect(db.query("SELECT version FROM schema_version").get()).toEqual({
          version: 14,
        });
        expect(
          db
            .query(
              "SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name",
            )
            .all(),
        ).toEqual(objects);
      } finally {
        db?.close();
        for (const n of names) {
          if (saved[n] === undefined) delete process.env[n];
          else process.env[n] = saved[n];
        }
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
}

// Observe only the current test process's own synthetic files. No SQLite
// connection, checkpoint, retry or GC is used to make the close assertion pass.
function retainedFiles(path: string) {
  const targets = new Set([path, path + "-wal", path + "-shm"]);
  if (process.platform === "linux")
    return readdirSync("/proc/self/fd").flatMap((fd) => {
      try {
        const target = readlinkSync("/proc/self/fd/" + fd);
        return targets.has(target.replace(/ \(deleted\)$/, "")) ? [fd] : [];
      } catch {
        return [];
      }
    });
  if (process.platform === "darwin") {
    const result = Bun.spawnSync(
      ["/usr/sbin/lsof", "-nP", "-p", String(process.pid), "-Fn"],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(result.exitCode).toBe(0);
    return result.stdout.toString().split("\n")
      .filter((line) => line.startsWith("n") && targets.has(line.slice(1)));
  }
  throw new Error("Resource-close regression requires supported Linux/macOS runtime.");
}

for (const origin of ["demo", "production"] as const) {
  const identity = { origin, key_hash: origin === "production" ? "0".repeat(64) : null };

  test(`schema seed ${origin}: ordinary close releases files immediately and preserves seed/identity`, () => {
    const dir = mkdtempSync(join(tmpdir(), "mf-seed-close-"));
    const path = join(dir, "fixture.sqlite");
    const db = new Database(path);
    try {
      prepareSchema(db, identity);
      const ids = db.query("SELECT id FROM saldos ORDER BY id").all();
      expect(ids).toEqual(origin === "demo"
        ? ["S000", "S001", "S002", "S003", "S004", "S005"].map(id => ({ id }))
        : [{ id: "S000" }]);
      expect(db.query("PRAGMA integrity_check").get()).toEqual({ integrity_check: "ok" });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      db.close();
      expect(retainedFiles(path)).toEqual([]);
      const reopened = new Database(path, { readonly: true });
      try {
        expect(reopened.query("SELECT id FROM saldos ORDER BY id").all()).toEqual(ids);
        expect(reopened.query("SELECT origin,key_hash FROM database_origin").get()).toEqual(identity);
      } finally { reopened.close(); }
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`schema seed ${origin}: insert failure rolls back all DDL and releases the closed connection`, () => {
    const dir = mkdtempSync(join(tmpdir(), "mf-seed-rollback-"));
    const path = join(dir, "fixture.sqlite");
    const db = new Database(path);
    const failure = new Error("Injected synthetic seed failure");
    const prepare = db.prepare;
    const runSpies: { mockRestore(): void }[] = [];
    const prepareSpy = spyOn(db, "prepare").mockImplementation((function (...args: Parameters<Database["prepare"]>) {
      const statement = prepare.apply(db, args);
      if (args[0].startsWith("INSERT INTO saldos")) {
        const run = statement.run;
        runSpies.push(spyOn(statement, "run").mockImplementation(function (...values) {
          run.apply(statement, values);
          throw failure; // Fail after a real insertion, before commit.
        }));
      }
      return statement;
    }) as Database["prepare"]);
    try {
      let caught: unknown;
      try { prepareSchema(db, identity); } catch (error) { caught = error; }
      expect(caught).toBe(failure);
      expect(retainedFiles(path)).toEqual([]);
      const reopened = new Database(path);
      try {
        expect(reopened.query("SELECT name FROM sqlite_master WHERE type='table'").all()).toEqual([]);
        expect(reopened.query("PRAGMA integrity_check").get()).toEqual({ integrity_check: "ok" });
      } finally { reopened.close(); }
    } finally {
      for (const spy of runSpies) spy.mockRestore();
      prepareSpy.mockRestore();
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
