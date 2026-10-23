import { expect } from "bun:test";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { openDatabase } from "../../apps/api/src/database";
import { initializeProduction } from "../../apps/api/src/production-state";

// Diagnostic copies of B3 helpers; existing tests remain untouched.
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
const identityModule = resolve("apps/api/src/database-identity.ts");
const databaseModule = resolve("apps/api/src/database.ts");

async function crashedWAL(path: string) {
  // A confirmed commit, then SIGKILL: no graceful checkpoint/close and no synthetic SQLite errors.
  const script = `import{Database}from'bun:sqlite';const d=new Database(${JSON.stringify(path)});d.exec("PRAGMA wal_autocheckpoint=0;CREATE TABLE recovery_fixture(n INTEGER);INSERT INTO recovery_fixture VALUES(731)");console.log('committed');process.stdin.resume();`;
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
  // Immutable main-file reader proves the committed table has not been checkpointed.
  const inspect = Bun.spawnSync(
    [
      process.execPath,
      "-e",
      `import{Database,constants}from'bun:sqlite';const d=new Database(${JSON.stringify("file:" + path + "?mode=ro&immutable=1")},constants.SQLITE_OPEN_READONLY|constants.SQLITE_OPEN_URI);console.log(JSON.stringify(d.query("SELECT name FROM sqlite_master WHERE name='recovery_fixture'").get()));d.close();`,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  expect(inspect.exitCode).toBe(0);
  expect(inspect.stderr.toString()).toBe("");
  expect(JSON.parse(inspect.stdout.toString())).toBeNull();
  // All SQLite processes are dead. Removing only the disposable index forces real WAL recovery.
  fs.unlinkSync(path + "-shm");
}


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


function metadata(path: string) {
  return Object.fromEntries(["", "-wal", "-shm"].map(suffix => {
    try {
      const s = fs.lstatSync(path + suffix);
      return [suffix || "db", { exists: true, inode: s.ino, bytes: s.size, mode: s.mode & 0o777 }];
    } catch (e: any) {
      if (e.code === "ENOENT") return [suffix || "db", { exists: false }];
      throw e;
    }
  }));
}
function readInParent(path: string) {
  let db: ReturnType<typeof openDatabase> | undefined;
  try {
    db = openDatabase(path);
    const row = db.query("SELECT n FROM recovery_fixture").get() as { n: number };
    const integrity = db.query("PRAGMA integrity_check").get() as { integrity_check: string };
    return { ok: row?.n === 731 && integrity?.integrity_check === "ok", rowOK: row?.n === 731, integrityOK: integrity?.integrity_check === "ok" };
  } catch (e: any) {
    return { ok: false, code: String(e.code ?? e.name), errno: e.errno ?? null };
  } finally {
    if (db) db.close();
  }
}
async function readInFreshProcess(path: string) {
  const code = `import {openDatabase} from ${JSON.stringify(databaseModule)};let d;try{d=openDatabase(${JSON.stringify(path)});const row=d.query("SELECT n FROM recovery_fixture").get();const integrity=d.query("PRAGMA integrity_check").get();console.log(JSON.stringify({ok:row?.n===731&&integrity?.integrity_check==="ok",rowOK:row?.n===731,integrityOK:integrity?.integrity_check==="ok"}));}catch(e){console.log(JSON.stringify({ok:false,code:String(e.code??e.name),errno:e.errno??null}));}finally{if(d)d.close();}`;
  const p = Bun.spawn([process.execPath, "-e", code], { env: {...process.env}, stdout: "pipe", stderr: "pipe" });
  const [out, err, exit] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  if (exit !== 0 || err !== "") return { ok: false, code: "PROBE_CHILD_FAILURE", exit };
  return JSON.parse(out);
}
async function oneScenario(initializer: string, reader: string, round: number) {
  const root = fs.mkdtempSync(join(tmpdir(), "mf-b3-probe-"));
  const path = join(root, "state", "db.sqlite");
  Object.assign(process.env, { NODE_ENV: "production", DATABASE_PATH: path,
    AUTH_KEY_PATH: join(root, "state", "auth.key"), APP_ORIGIN: "https://fixture.invalid" });
  const record: any = { initializer, reader, round, pid: process.pid, stages: [] };
  const mark = (phase: string) => record.stages.push({ phase, files: metadata(path) });
  try {
    if (initializer === "parent") initializeProduction();
    else {
      const initModule = resolve("apps/api/src/production-state.ts");
      const init = Bun.spawnSync([process.execPath, "-e", `import{initializeProduction}from${JSON.stringify(initModule)};initializeProduction();`], {env:{...process.env},stdout:"pipe",stderr:"pipe"});
      if (init.exitCode !== 0 || init.stderr.toString() !== "") throw new Error("PROBE_INITIALIZER_FAILURE");
    }
    mark("initialized");
    await crashedWAL(path);
    mark("crashed-wal-shm-removed");
    record.before = await contender(path, true);
    mark("after-baseline-contender-and-lock-release");
    record.after = await contender(path, false);
    mark("after-timeout-contender-and-lock-release");
    record.contentionExpected = record.before.exit === 1 && record.before.result.code === "SQLITE_BUSY_RECOVERY"
      && record.before.result.errno === 261 && record.before.result.ms < 3000
      && record.after.exit === 1 && record.after.result.code === "SQLITE_BUSY_RECOVERY"
      && record.after.result.errno === 261 && record.after.result.ms >= 2900;
    record.reopen = reader === "parent" ? readInParent(path) : await readInFreshProcess(path);
    mark("after-primary-reopen");
    if (!record.reopen.ok) {
      // Capture pre-read metadata above before an independent recovery can change it.
      record.independentFollowup = await readInFreshProcess(path);
      mark("after-independent-followup");
    }
  } catch (e: any) {
    record.probeError = { code: String(e.code ?? e.name), errno: e.errno ?? null };
    mark("probe-error");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log(JSON.stringify(record));
}
if (process.argv[2] === "worker") {
  await oneScenario(process.argv[3], process.argv[4], Number(process.argv[5]));
} else {
  const records: any[] = [];
  for (let round = 1; round <= 4; round++) {
    for (const initializer of ["parent", "fresh-process"]) {
      for (const reader of ["parent", "fresh-process"]) {
        // Every scenario has a fresh controller, so prior cases cannot contaminate PID state.
        const child = Bun.spawn([process.execPath, import.meta.path, "worker", initializer, reader, String(round)],
          {env:{...process.env},stdout:"pipe",stderr:"pipe"});
        const [out,err,exit] = await Promise.all([new Response(child.stdout).text(),new Response(child.stderr).text(),child.exited]);
        if (exit !== 0 || err !== "") throw new Error("PROBE_WORKER_FAILURE");
        const record = JSON.parse(out.trim());
        records.push(record);
        console.log(JSON.stringify(record));
      }
    }
  }
  const summary = [];
  for (const initializer of ["parent", "fresh-process"]) for (const reader of ["parent", "fresh-process"]) {
    const group = records.filter(r => r.initializer === initializer && r.reader === reader);
    summary.push({initializer,reader,cases:group.length,contentionExpected:group.filter(r=>r.contentionExpected).length,
      reopenOK:group.filter(r=>r.reopen?.ok).length,reopenErrors:group.filter(r=>r.reopen&&!r.reopen.ok).map(r=>r.reopen),
      setupErrors:group.filter(r=>r.probeError).length});
  }
  console.log(JSON.stringify({diagnosticSummary:summary}));
  // An observed bad read remains a failure; collecting diagnostics does not accept it.
  if (records.some(r=>r.probeError||!r.contentionExpected||!r.reopen?.ok)) process.exitCode=1;
}
