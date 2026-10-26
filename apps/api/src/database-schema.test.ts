import { test, expect, spyOn } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readdirSync, readlinkSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { prepareSchema } from "./database-schema";

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
