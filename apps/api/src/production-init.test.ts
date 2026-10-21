import { test, expect } from "bun:test";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, initializeProductionDatabase } from "./database";

test("production requires explicit, clean, origin-marked SQLite", () => {
  const previous = process.env.NODE_ENV;
  const dir = mkdtempSync(join(tmpdir(), "myfinanzas-production-test-"));
  const demo = join(dir, "demo.sqlite");
  const real = join(dir, "real.sqlite");
  try {
    process.env.NODE_ENV = "test";
    const local = openDatabase(demo);
    expect((local.query("SELECT count(*) AS n FROM saldos").get() as {n:number}).n).toBe(6);
    local.close();
    const original = readFileSync(demo);

    process.env.NODE_ENV = "production";
    expect(() => openDatabase(real)).toThrow();
    expect(() => openDatabase(demo)).toThrow();
    expect(readFileSync(demo).equals(original)).toBe(true);
    const created = initializeProductionDatabase(real);
    expect((created.query("SELECT version FROM schema_version").get() as {version:number}).version).toBe(5);
    expect((created.query("SELECT count(*) AS n FROM saldos").get() as {n:number}).n).toBe(1);
    expect((created.query("SELECT id FROM saldos").get() as {id:string}).id).toBe("S000");
    expect((created.query("SELECT origin FROM database_origin").get() as {origin:string}).origin).toBe("production");
    expect((created.query("SELECT next FROM counters WHERE name='saldo'").get() as {next:number}).next).toBe(1);
    created.close();
    expect(() => initializeProductionDatabase(real)).toThrow();
    const reopened = openDatabase(real);
    expect((reopened.query("SELECT count(*) AS n FROM saldos").get() as {n:number}).n).toBe(1);
    reopened.close();
    process.env.NODE_ENV = "test";
    const again = openDatabase(demo);
    expect((again.query("SELECT count(*) AS n FROM saldos").get() as {n:number}).n).toBe(6);
    again.close();
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("production initializer fails for unsafe path or permissive directory", () => {
  const previous = process.env.NODE_ENV;
  const dir = mkdtempSync(join(tmpdir(), "myfinanzas-production-test-"));
  try {
    process.env.NODE_ENV = "production";
    expect(() => initializeProductionDatabase("relative.sqlite")).toThrow();
    expect(() => initializeProductionDatabase(join(dir, ".local", "demo.sqlite"))).toThrow();
    expect(() => initializeProductionDatabase(join(dir, "missing", "real.sqlite"))).toThrow();
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});
