import { test, expect, spyOn } from "bun:test";
import * as sqlite from "bun:sqlite";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeProduction } from "./production-state";
import { openDatabase } from "./database";
import { readPrivateKey, publishNewDirectory } from "./private-state";
import { backup, restore } from "./backup";

async function isolated(
  run: (
    root: string,
    configure: (name: string, db?: string, key?: string) => string,
  ) => void | Promise<void>,
) {
  const names = [
    "NODE_ENV",
    "DATABASE_PATH",
    "AUTH_KEY_PATH",
    "APP_ORIGIN",
  ] as const;
  const previous = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  const root = fs.mkdtempSync(join(tmpdir(), "mf-security-review-"));
  const configure = (
    name: string,
    db = "database.sqlite",
    key = "auth.key",
  ) => {
    Object.assign(process.env, {
      NODE_ENV: "production",
      DATABASE_PATH: join(root, name, db),
      AUTH_KEY_PATH: join(root, name, key),
      APP_ORIGIN: "https://myfinanzas.pp.ua",
    });
    return process.env.DATABASE_PATH!;
  };
  try {
    await run(root, configure);
  } finally {
    for (const n of names)
      if (previous[n] === undefined) delete process.env[n];
      else process.env[n] = previous[n];
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("31 S1: runtime rejects a substituted SQLite connection with another production key binding", async () =>
  isolated((root, configure) => {
    const first = configure("first");
    initializeProduction();
    const other = configure("other");
    initializeProduction();
    configure("first");
    const provider = require("bun:sqlite") as typeof sqlite;
    const RealDatabase = provider.Database;
    let opened: sqlite.Database | undefined;
    // Inject the connection-resolution boundary; both on-disk databases are genuine and private.
    const injection = spyOn(provider, "Database") as unknown as {
      mockImplementation(
        fn: (
          ...args: ConstructorParameters<typeof RealDatabase>
        ) => sqlite.Database,
      ): void;
      mockRestore(): void;
    };
    injection.mockImplementation(function (
      ...args: ConstructorParameters<typeof RealDatabase>
    ) {
      if (
        args[0] === first &&
        typeof args[1] === "object" &&
        args[1]?.readwrite === true
      ) {
        opened = new RealDatabase(other, { create: false, strict: true });
        return opened;
      }
      return new RealDatabase(
        ...(args as ConstructorParameters<typeof RealDatabase>),
      );
    });
    try {
      expect(() => {
        openDatabase(first);
      }).toThrow();
      expect(!!opened).toBe(true);
    } finally {
      injection.mockRestore();
      try {
        opened?.close();
      } catch {}
    }
  }));

test("31 S2: key descriptor must reject replacement after pathname permission validation", async () =>
  isolated((_root, configure) => {
    configure("source");
    initializeProduction();
    const path = process.env.AUTH_KEY_PATH!;
    const originalOpen = fs.openSync,
      original = fs.readFileSync(path);
    let injected = false;
    const injection = spyOn(fs, "openSync").mockImplementation(((
      ...args: Parameters<typeof fs.openSync>
    ) => {
      if (args[0] === path && !injected) {
        injected = true;
        fs.renameSync(path, path + ".saved");
        fs.writeFileSync(path, original, { mode: 0o600, flag: "wx" });
      }
      return originalOpen(...args);
    }) as typeof fs.openSync);
    try {
      expect(() => {
        readPrivateKey(path);
      }).toThrow();
      expect(injected).toBe(true);
    } finally {
      injection.mockRestore();
    }
  }));

for (const [databaseName, keyName] of [
  ["bundle.tmp", "auth.key"],
  ["database.sqlite", "bundle.tmp"],
  ["database #?.sqlite", "key #?.bin"],
]) {
  test(`31 S3: reserved-name rejection / encrypted restore for ${databaseName}/${keyName}`, async () =>
    isolated((root, configure) => {
      const path = configure("source", databaseName, keyName);
      if ([databaseName, keyName].includes("bundle.tmp")) {
        expect(() => {
          initializeProduction();
        }).toThrow();
        expect(fs.existsSync(join(root, "source"))).toBe(false);
        return;
      }
      initializeProduction();
      const db = openDatabase(path),
        key = readPrivateKey(process.env.AUTH_KEY_PATH!);
      const identity = join(root, "identity.txt");
      const gen = Bun.spawnSync(["age-keygen", "-o", identity], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(gen.exitCode).toBe(0);
      const pub = Bun.spawnSync(["age-keygen", "-y", identity], {
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(pub.exitCode).toBe(0);
      const copy = join(root, "copy");
      try {
        backup(db, key, copy, pub.stdout.toString().trim());
      } finally {
        db.close();
      }
      configure("restored", databaseName, keyName);
      const result = restore(copy, join(root, "restored"), identity);
      expect(result.database).toBe(process.env.DATABASE_PATH!);
      expect(result.key).toBe(process.env.AUTH_KEY_PATH!);
      openDatabase(result.database).close();
    }));
}

test("31 S4: post-validation hardlink creation is rejected on the opened key descriptor", async () =>
  isolated((_root, configure) => {
    configure("source");
    initializeProduction();
    const path = process.env.AUTH_KEY_PATH!;
    const originalOpen = fs.openSync;
    let injected = false;
    const injection = spyOn(fs, "openSync").mockImplementation(((
      ...args: Parameters<typeof fs.openSync>
    ) => {
      if (args[0] === path && !injected) {
        injected = true;
        fs.linkSync(path, path + ".alias");
      }
      return originalOpen(...args);
    }) as typeof fs.openSync);
    try {
      expect(() => {
        readPrivateKey(path);
      }).toThrow();
      expect(injected).toBe(true);
    } finally {
      injection.mockRestore();
    }
  }));

test("31 S5: a competing directory appearing after root validation is not overwritten", async () =>
  isolated((root) => {
    const stage = fs.mkdtempSync(join(root, ".initialize-")),
      target = join(root, "published");
    fs.writeFileSync(join(stage, "sentinel"), "synthetic", { mode: 0o600 });
    const original = fs.realpathSync;
    let injected = false;
    const injection = spyOn(fs, "realpathSync").mockImplementation(((
      ...args: Parameters<typeof fs.realpathSync>
    ) => {
      const result = original(...args);
      if (args[0] === root && !injected) {
        injected = true;
        fs.mkdirSync(target, { mode: 0o700 });
      }
      return result;
    }) as typeof fs.realpathSync);
    try {
      expect(() => publishNewDirectory(stage, target)).toThrow();
      expect(injected).toBe(true);
      expect(fs.readdirSync(target)).toEqual([]);
      expect(fs.readFileSync(join(stage, "sentinel"), "utf8")).toBe(
        "synthetic",
      );
    } finally {
      injection.mockRestore();
    }
  }));

test("31 S6: restore sync failures leave either no target or a complete validated pair", async () =>
  isolated((root, configure) => {
    const path = configure("source");
    initializeProduction();
    const db = openDatabase(path),
      key = readPrivateKey(process.env.AUTH_KEY_PATH!);
    const identity = join(root, "identity.txt");
    expect(
      Bun.spawnSync(["age-keygen", "-o", identity], {
        stdout: "pipe",
        stderr: "pipe",
      }).exitCode,
    ).toBe(0);
    const pub = Bun.spawnSync(["age-keygen", "-y", identity], {
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(pub.exitCode).toBe(0);
    const copy = join(root, "copy");
    try {
      backup(db, key, copy, pub.stdout.toString().trim());
    } finally {
      db.close();
    }
    const rootStat = fs.statSync(root),
      original = fs.fsyncSync;
    for (const when of ["before", "after"]) {
      const target = join(root, when);
      configure(when);
      const injection = spyOn(fs, "fsyncSync").mockImplementation(
        (fd: number) => {
          const st = fs.fstatSync(fd);
          if (
            when === "before" ||
            (st.ino === rootStat.ino && st.dev === rootStat.dev)
          )
            throw new Error("synthetic sync failure");
          original(fd);
        },
      );
      try {
        expect(() => {
          restore(copy, target, identity);
        }).toThrow();
      } finally {
        injection.mockRestore();
      }
      if (when === "before") expect(fs.existsSync(target)).toBe(false);
      else {
        const restored = openDatabase(process.env.DATABASE_PATH!);
        restored.close();
      }
      expect(fs.readdirSync(root).some((n) => n.startsWith(".restore-"))).toBe(
        false,
      );
    }
  }));

// Logical content: every table's rows plus the schema, read through an existing handle.
function logical(db: sqlite.Database) {
  const tables = db
    .query(
      "SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name",
    )
    .all() as { name: string; sql: string }[];
  return JSON.stringify(
    tables.map((t) => [
      t.name,
      t.sql,
      db.query(`SELECT * FROM "${t.name}" ORDER BY rowid`).all(),
    ]),
  );
}

// 31-E1: with the writer still open there is no closing checkpoint, so DB and WAL bytes
// stay identical; -shm may change (read marks). Logical content and key bytes never change.
test("31 S7: cross-origin rejection keeps DB/WAL bytes with an open writer, logical content and key unchanged", async () =>
  isolated((_root, configure) => {
    for (const source of ["production", "demo"]) {
      const path = configure(source);
      let db: sqlite.Database;
      if (source === "production") {
        initializeProduction();
        db = openDatabase(path);
      } else {
        process.env.NODE_ENV = "test";
        db = openDatabase(path);
        fs.writeFileSync(process.env.AUTH_KEY_PATH!, Buffer.alloc(32), {
          mode: 0o600,
        });
      }
      try {
        db.exec(
          "CREATE TABLE review_fixture(n INTEGER);INSERT INTO review_fixture VALUES(1)",
        );
        const files = [path, path + "-wal", process.env.AUTH_KEY_PATH!],
          before = files.map((p) => fs.readFileSync(p)),
          content = logical(db);
        process.env.NODE_ENV = source === "production" ? "test" : "production";
        expect(() => {
          openDatabase(path);
        }).toThrow();
        for (let i = 0; i < files.length; i++)
          expect(fs.readFileSync(files[i]).equals(before[i])).toBe(true);
        expect(logical(db)).toBe(content);
      } finally {
        db.close();
      }
    }
  }));

// Rollback-journal databases of the other origin must not be converted to WAL or receive
// any persistent PRAGMA before the identity check rejects them.
test("31 AC35: foreign-origin rollback-mode databases are rejected without WAL conversion", async () =>
  isolated((_root, configure) => {
    for (const source of ["production", "demo"]) {
      const path = configure(source);
      if (source === "demo") process.env.NODE_ENV = "test";
      // Create and switch to rollback mode in a child that exits: leaving the WAL
      // mode needs exclusive access, which an in-process closed handle could block.
      const created = Bun.spawnSync(
        [
          process.execPath,
          "-e",
          source === "production"
            ? `import{initializeProduction}from${JSON.stringify(join(import.meta.dir, "production-state.ts"))};initializeProduction();`
            : `import{openDatabase}from${JSON.stringify(join(import.meta.dir, "database.ts"))};openDatabase(${JSON.stringify(path)}).close();`,
        ],
        { env: { ...process.env }, stderr: "pipe" },
      );
      expect(created.stderr.toString()).toBe("");
      expect(created.exitCode).toBe(0);
      if (source === "demo")
        fs.writeFileSync(process.env.AUTH_KEY_PATH!, Buffer.alloc(32), {
          mode: 0o600,
        });
      const converted = Bun.spawnSync(
        [
          process.execPath,
          "-e",
          `import{Database}from"bun:sqlite";const d=new Database(${JSON.stringify(path)});const m=d.query("PRAGMA journal_mode=DELETE").get();d.close();console.log(JSON.stringify(m));`,
        ],
        { stderr: "pipe", stdout: "pipe" },
      );
      expect(converted.stderr.toString()).toBe("");
      expect(JSON.parse(converted.stdout.toString())).toEqual({
        journal_mode: "delete",
      });
      for (const suffix of ["-wal", "-shm"])
        fs.rmSync(path + suffix, { force: true });
      const reader = new sqlite.Database(path, { readonly: true });
      const content = logical(reader);
      reader.close();
      const key = fs.readFileSync(process.env.AUTH_KEY_PATH!),
        header = fs.readFileSync(path).subarray(18, 20);
      expect([...header]).toEqual([1, 1]);
      process.env.NODE_ENV = source === "production" ? "test" : "production";
      expect(() => {
        openDatabase(path);
      }).toThrow(
        source === "production"
          ? "El origen de la base no corresponde al entorno."
          : "Identidad o pareja DB/clave inválida.",
      );
      expect([...fs.readFileSync(path).subarray(18, 20)]).toEqual([1, 1]);
      expect(fs.existsSync(path + "-wal")).toBe(false);
      expect(fs.readFileSync(process.env.AUTH_KEY_PATH!).equals(key)).toBe(
        true,
      );
      const after = new sqlite.Database(path, { readonly: true });
      try {
        expect(logical(after)).toBe(content);
        expect(after.query("PRAGMA journal_mode").get()).toEqual({
          journal_mode: "delete",
        });
      } finally {
        after.close();
      }
    }
  }));

// A key from another genuine pair is rejected inside the read transaction, before any
// persistent PRAGMA or migration, with and without an open writer on the database.
test("31 AC36: another pair's key is rejected before persistent PRAGMA, with and without a writer", async () =>
  isolated((_root, configure) => {
    configure("other");
    initializeProduction();
    const otherKey = fs.readFileSync(process.env.AUTH_KEY_PATH!);
    for (const withWriter of [false, true]) {
      const path = configure(withWriter ? "first-writer" : "first");
      initializeProduction();
      const own = new sqlite.Database(path, { strict: true });
      const content = logical(own);
      if (!withWriter) own.close();
      fs.writeFileSync(process.env.AUTH_KEY_PATH!, otherKey, { mode: 0o600 });
      const files = withWriter ? [path, path + "-wal"] : [path];
      const before = files.map((p) => fs.readFileSync(p));
      const persistent: string[] = [];
      const exec = sqlite.Database.prototype.exec;
      const spy = spyOn(sqlite.Database.prototype, "exec").mockImplementation(
        function (this: sqlite.Database, ...a: any[]) {
          if (/journal_mode|synchronous|foreign_keys/i.test(String(a[0])))
            persistent.push(String(a[0]));
          return (exec as Function).apply(this, a);
        } as any,
      );
      try {
        expect(() => {
          openDatabase(path);
        }).toThrow("Identidad o pareja DB/clave inválida.");
      } finally {
        spy.mockRestore();
      }
      expect(persistent).toEqual([]);
      for (let i = 0; i < files.length; i++)
        expect(fs.readFileSync(files[i]).equals(before[i])).toBe(true);
      expect(fs.readFileSync(process.env.AUTH_KEY_PATH!).equals(otherKey)).toBe(
        true,
      );
      const check = withWriter
        ? own
        : new sqlite.Database(path, { readonly: true });
      try {
        expect(logical(check)).toBe(content);
      } finally {
        check.close();
      }
    }
  }));

// No application module opens SQLite with immutable=1 or another lock-free URI mode.
test("31 AC37: application code has no immutable or lock-free SQLite opening", () => {
  const dir = import.meta.dir;
  const sources = (fs.readdirSync(dir, { recursive: true }) as string[]).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
  );
  expect(sources.length).toBeGreaterThan(10);
  for (const file of sources) {
    const text = fs.readFileSync(join(dir, file), "utf8");
    expect(
      `${file}: ${/immutable=|nolock=|readonly_shm|SQLITE_OPEN_URI/.test(text)}`,
    ).toBe(`${file}: false`);
  }
});

// AC35, pending WAL: committed frames left by a killed writer, no writer open. The rejection
// may let SQLite consolidate them (31-E1) but logical content and key bytes stay unchanged.
test("31 AC35: foreign-origin database with a pending WAL is rejected with logical content intact", async () =>
  isolated((_root, configure) => {
    for (const source of ["production", "demo"]) {
      const path = configure(source);
      if (source === "demo") process.env.NODE_ENV = "test";
      const created = Bun.spawnSync(
        [
          process.execPath,
          "-e",
          (source === "production"
            ? `import{initializeProduction}from${JSON.stringify(join(import.meta.dir, "production-state.ts"))};initializeProduction();`
            : `import{openDatabase}from${JSON.stringify(join(import.meta.dir, "database.ts"))};openDatabase(${JSON.stringify(path)}).close();`) +
            `import{Database}from"bun:sqlite";const d=new Database(${JSON.stringify(path)});d.exec("PRAGMA wal_autocheckpoint=0;CREATE TABLE pending_fixture(n INTEGER);INSERT INTO pending_fixture VALUES(7)");process.kill(process.pid,"SIGKILL");`,
        ],
        { env: { ...process.env }, stderr: "pipe" },
      );
      expect(created.signalCode).toBe("SIGKILL");
      expect(fs.statSync(path + "-wal").size).toBeGreaterThan(32);
      if (source === "demo")
        fs.writeFileSync(process.env.AUTH_KEY_PATH!, Buffer.alloc(32), {
          mode: 0o600,
        });
      const key = fs.readFileSync(process.env.AUTH_KEY_PATH!);
      const reader = new sqlite.Database(path, { readonly: true });
      const content = logical(reader);
      reader.close();
      expect(content).toContain("pending_fixture");
      process.env.NODE_ENV = source === "production" ? "test" : "production";
      expect(() => {
        openDatabase(path);
      }).toThrow(
        source === "production"
          ? "El origen de la base no corresponde al entorno."
          : "Identidad o pareja DB/clave inválida.",
      );
      expect(fs.readFileSync(process.env.AUTH_KEY_PATH!).equals(key)).toBe(
        true,
      );
      const after = new sqlite.Database(path, { readonly: true });
      try {
        expect(logical(after)).toBe(content);
      } finally {
        after.close();
      }
    }
  }));

// Backup binds the key FILE to the live identity, not only the key passed by the caller.
test("31 AC36: backup rejects a key file from another pair even with the right in-memory key", async () =>
  isolated((root, configure) => {
    configure("other");
    initializeProduction();
    const otherKey = fs.readFileSync(process.env.AUTH_KEY_PATH!);
    const path = configure("first");
    initializeProduction();
    const ownKey = fs.readFileSync(process.env.AUTH_KEY_PATH!);
    const db = openDatabase(path);
    try {
      fs.writeFileSync(process.env.AUTH_KEY_PATH!, otherKey, { mode: 0o600 });
      expect(() =>
        backup(
          db,
          ownKey,
          join(root, "backup-target"),
          "age1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqs3290gq",
        ),
      ).toThrow("Pareja DB/clave inválida.");
      expect(fs.existsSync(join(root, "backup-target"))).toBe(false);
    } finally {
      db.close();
    }
  }));
