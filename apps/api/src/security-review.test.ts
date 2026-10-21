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

test("31 S7: cross-origin rejection leaves live database, WAL and SHM bytes unchanged", async () =>
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
        const files = [path, path + "-wal", path + "-shm"],
          before = files.map((p) => fs.readFileSync(p));
        process.env.NODE_ENV = source === "production" ? "test" : "production";
        expect(() => {
          openDatabase(path);
        }).toThrow();
        for (let i = 0; i < files.length; i++)
          expect(fs.readFileSync(files[i]).equals(before[i])).toBe(true);
      } finally {
        db.close();
      }
    }
  }));
