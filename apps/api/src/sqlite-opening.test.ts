import { test, expect, spyOn } from "bun:test";
import * as sqlite from "bun:sqlite";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { openDatabase } from "./database";
import { initializeProduction } from "./production-state";
import { openProductionConnection, productionConfig } from "./private-state";

const envNames = [
  "NODE_ENV",
  "DATABASE_PATH",
  "AUTH_KEY_PATH",
  "APP_ORIGIN",
] as const;
async function fixture(run: (path: string) => Promise<void> | void) {
  const saved = Object.fromEntries(envNames.map((n) => [n, process.env[n]]));
  const root = fs.mkdtempSync(join(tmpdir(), "mf-opening-"));
  Object.assign(process.env, {
    NODE_ENV: "production",
    DATABASE_PATH: join(root, "state", "db.sqlite"),
    AUTH_KEY_PATH: join(root, "state", "auth.key"),
    APP_ORIGIN: "https://myfinanzas.pp.ua",
  });
  try {
    await run(process.env.DATABASE_PATH!);
  } finally {
    for (const n of envNames)
      if (saved[n] === undefined) delete process.env[n];
      else process.env[n] = saved[n];
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("SQLite B1: timeout is the first SQL on every demo and production handle; no immutable probe (31-E1)", async () =>
  fixture((path) => {
    initializeProduction();
    const traces = new Map<sqlite.Database, string[]>();
    const spies = [];
    const begin = sqlite.Database.prototype.transaction;
    spies.push(
      spyOn(sqlite.Database.prototype, "transaction").mockImplementation(
        function (this: sqlite.Database, ...a: any[]) {
          const calls = traces.get(this) ?? [];
          calls.push("<transaction>");
          traces.set(this, calls);
          return (begin as Function).apply(this, a);
        } as any,
      ),
    );
    for (const name of ["exec", "query", "prepare", "run"] as const) {
      const original = sqlite.Database.prototype[name];
      spies.push(
        spyOn(sqlite.Database.prototype, name).mockImplementation(function (
          this: sqlite.Database,
          ...a: any[]
        ) {
          const calls = traces.get(this) ?? [];
          calls.push(String(a[0]));
          traces.set(this, calls);
          return (original as Function).apply(this, a);
        } as any),
      );
    }
    try {
      openDatabase(path).close();
      openProductionConnection(productionConfig(), true).db.close();
      process.env.NODE_ENV = "test";
      openDatabase(join(resolve(path, "../.."), "demo.sqlite")).close();
      openDatabase(":memory:").close();
      const calls = [...traces.values()];
      // 31-E1: every connection is a conventional live handle; none is a separate probe.
      expect(calls).toHaveLength(4);
      for (const c of calls) {
        expect(c[0]).toBe("PRAGMA busy_timeout=3000");
        const firstRead = c.findIndex((s) =>
          s.startsWith("SELECT name FROM sqlite_master"),
        );
        const persistent = c.findIndex((s) =>
          /journal_mode|synchronous/i.test(s),
        );
        const opened = c.indexOf("<transaction>");
        expect(firstRead).toBeGreaterThan(0);
        // E4.1: the admitted contract manifest is verified before identity transaction.
        expect(opened).toBeGreaterThan(0);
        expect(firstRead).toBeLessThan(opened);
        if (persistent !== -1) expect(persistent).toBeGreaterThan(firstRead);
      }
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  }));

async function line(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  let text = "";
  while (!text.includes("\n")) {
    const next = await reader.read();
    if (next.done) throw new Error("Child ended before synchronization signal");
    text += new TextDecoder().decode(next.value);
  }
  reader.releaseLock();
  return text.trim();
}
async function remaining(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  let text = "";
  try {
    for (;;) {
      const n = await reader.read();
      if (n.done) return text;
      text += new TextDecoder().decode(n.value);
    }
  } finally {
    reader.releaseLock();
  }
}
const identityModule = resolve(import.meta.dir, "database-identity.ts");
const databaseModule = resolve(import.meta.dir, "database.ts");

async function crashedWAL(path: string) {
  // A confirmed commit, then SIGKILL: no graceful checkpoint/close and no synthetic SQLite errors.
  const script = `import{Database}from'bun:sqlite';const d=new Database(${JSON.stringify(path)});d.exec("PRAGMA wal_autocheckpoint=0;INSERT INTO counters VALUES('recovery_fixture',731)");console.log('committed');process.stdin.resume();`;
  const p = Bun.spawn([process.execPath, "-e", script], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(await line(p.stdout)).toBe("committed");
  p.kill("SIGKILL");
  await p.exited;
  expect(p.signalCode).toBe("SIGKILL");
  expect(await new Response(p.stderr).text()).toBe("");
  expect(fs.statSync(path + "-wal").size).toBeGreaterThan(32);
  // Immutable main-file reader proves the committed counter row has not been checkpointed.
  const inspect = Bun.spawnSync(
    [
      process.execPath,
      "-e",
      `import{Database,constants}from'bun:sqlite';const d=new Database(${JSON.stringify("file:" + path + "?mode=ro&immutable=1")},constants.SQLITE_OPEN_READONLY|constants.SQLITE_OPEN_URI);console.log(JSON.stringify(d.query("SELECT next FROM counters WHERE name='recovery_fixture'").get()));d.close();`,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  expect(inspect.exitCode).toBe(0);
  expect(inspect.stderr.toString()).toBe("");
  expect(JSON.parse(inspect.stdout.toString())).toBeNull();
  // All SQLite processes are dead. Removing only the disposable index forces real WAL recovery.
  fs.unlinkSync(path + "-shm");
}

test("SQLite B2: real SIGKILL WAL recovery preserves the uncheckpointed committed row in demo/production", async () =>
  fixture(async (path) => {
    initializeProduction();
    const prod = path;
    process.env.NODE_ENV = "test";
    const demo = join(resolve(path, "../.."), "demo.sqlite");
    openDatabase(demo).close();
    for (const [mode, p] of [
      ["test", demo],
      ["production", prod],
    ] as const) {
      process.env.NODE_ENV = mode;
      await crashedWAL(p);
      const db = openDatabase(p);
      try {
        expect(db.query("SELECT next AS n FROM counters WHERE name='recovery_fixture'").get()).toEqual({
          n: 731,
        });
        expect(db.query("PRAGMA integrity_check").get()).toEqual({
          integrity_check: "ok",
        });
        expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
        expect(db.query("PRAGMA busy_timeout").get()).toEqual({
          timeout: 3000,
        });
      } finally {
        db.close();
      }
    }
  }));

// SQLite's Unix WAL-index recovery lock is byte 122 (SHM base 120 + RECOVER index 2).
// Python/fcntl is a test-only standard-library lock holder, not an application dependency.
const lockScript = `import fcntl,sys,os
f=open(sys.argv[1], 'a+b', buffering=0)
os.fchmod(f.fileno(),0o600)
if os.fstat(f.fileno()).st_size==0: f.truncate(32768)
fcntl.lockf(f,fcntl.LOCK_EX,1,122)
print('locked',flush=True)
sys.stdin.readline()
fcntl.lockf(f,fcntl.LOCK_UN,1,122)
`;
async function recoveryLock(path: string) {
  const p = Bun.spawn(["python3", "-u", "-c", lockScript, path + "-shm"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(await line(p.stdout)).toBe("locked");
  return p;
}
async function contender(
  path: string,
  baseline: boolean,
  releaseWhenWaiting = false,
) {
  // Synchronize after path/immutable preflight and connection opening, before the first live read.
  // No sleeps: the parent installs a real OS recovery lock, then lets SQL proceed.
  const gate = `console.log('ready');const b=Buffer.alloc(1);require('node:fs').readSync(0,b,0,1,null);start=performance.now();`;
  const code = `import*as sqlite from'bun:sqlite';import{spyOn}from'bun:test';import{openDatabase}from${JSON.stringify(databaseModule)};import{inspectIdentity}from${JSON.stringify(identityModule)};
let live=false;const exec=sqlite.Database.prototype.exec,query=sqlite.Database.prototype.query;
${baseline ? "" : `spyOn(sqlite.Database.prototype,'exec').mockImplementation(function(sql){const r=exec.call(this,sql);if(sql==='PRAGMA busy_timeout=3000')live=true;return r;});spyOn(sqlite.Database.prototype,'query').mockImplementation(function(...args){if(live){live=false;${gate}}return query.apply(this,args);});`}
let start=performance.now();try{${baseline ? `const d=new sqlite.Database(${JSON.stringify(path)},{strict:true});${gate}inspectIdentity(d);d.close();` : `const d=openDatabase(${JSON.stringify(path)});d.close();`}console.log(JSON.stringify({ok:true,ms:performance.now()-start}));}catch(e){console.log(JSON.stringify({ok:false,ms:performance.now()-start,code:e.code,errno:e.errno}));process.exitCode=1;}`;
  const p = Bun.spawn([process.execPath, "-e", code], {
    env: { ...process.env },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(await line(p.stdout)).toBe("ready");
  const lock = await recoveryLock(path);
  let released = false;
  p.stdin.write("g");
  p.stdin.end();
  try {
    if (releaseWhenWaiting) {
      // Observe the native busy handler sleeping, not an arbitrary delay or SQL retry.
      // Linux is already the supported runtime for SQLite v6's atomic publication.
      const deadline = performance.now() + 3000;
      let waiting = false;
      while (performance.now() < deadline && p.exitCode === null) {
        if (
          fs.readFileSync(`/proc/${p.pid}/wchan`, "utf8").trim() ===
          "hrtimer_nanosleep"
        ) {
          waiting = true;
          break;
        }
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      expect(waiting).toBe(true);
      lock.stdin.write("release\n");
      lock.stdin.end();
      released = true;
    }
    const [exit, out, err] = await Promise.all([
      p.exited,
      remaining(p.stdout),
      new Response(p.stderr).text(),
    ]);
    expect(err).toBe("");
    return { exit, result: JSON.parse(out) };
  } finally {
    if (!released) {
      lock.stdin.write("release\n");
      lock.stdin.end();
    }
    expect(await lock.exited).toBe(0);
    expect(await new Response(lock.stderr).text()).toBe("");
    if (p.exitCode === null) {
      p.kill();
      await p.exited;
    }
  }
}

test("SQLite B3: actual recovery contention fails before policy, then exhausts the unchanged 3000ms limit", async () =>
  fixture(async (path) => {
    initializeProduction();
    await crashedWAL(path);
    {
      const before = await contender(path, true);
      expect(before.exit).toBe(1);
      expect(before.result.code).toBe("SQLITE_BUSY_RECOVERY");
      expect(before.result.errno).toBe(261);
      expect(before.result.ms).toBeLessThan(3000);
      const after = await contender(path, false);
      expect(after.exit).toBe(1);
      expect(after.result.code).toBe("SQLITE_BUSY_RECOVERY");
      expect(after.result.errno).toBe(261);
      expect(after.result.ms).toBeGreaterThanOrEqual(2900);
      console.info(
        "SQLite recovery contention",
        JSON.stringify({ before: before.result, after: after.result }),
      );
    }
    // The very same recovered WAL becomes readable after explicit lock release, no SQL retries.
    const db = openDatabase(path);
    try {
      expect(db.query("SELECT next AS n FROM counters WHERE name='recovery_fixture'").get()).toEqual({
        n: 731,
      });
    } finally {
      db.close();
    }
  }));

test("SQLite B4: release a real recovery lock only after observing the native wait; demo and production succeed", async () =>
  fixture(async (path) => {
    const init = Bun.spawnSync(
      [
        process.execPath,
        "-e",
        `import{initializeProduction}from${JSON.stringify(resolve(import.meta.dir, "production-state.ts"))};initializeProduction();`,
      ],
      { env: { ...process.env }, stdout: "pipe", stderr: "pipe" },
    );
    expect(init.exitCode).toBe(0);
    expect(init.stderr.toString()).toBe("");
    const demo = join(resolve(path, "../.."), "demo.sqlite");
    process.env.NODE_ENV = "test";
    openDatabase(demo).close();
    for (const [mode, p] of [
      ["test", demo],
      ["production", path],
    ] as const) {
      process.env.NODE_ENV = mode;
      await crashedWAL(p);
      const after = await contender(p, false, true);
      expect(after.exit).toBe(0);
      expect(after.result.ok).toBe(true);
      expect(after.result.ms).toBeLessThan(3000);
      const db = openDatabase(p);
      try {
        expect(db.query("SELECT next AS n FROM counters WHERE name='recovery_fixture'").get()).toEqual({
          n: 731,
        });
      } finally {
        db.close();
      }
    }
  }));
