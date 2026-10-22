import { test, expect } from "bun:test";
import { mkdtempSync, rmSync, constants, openSync, writeSync, closeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { openDatabase as legacyV3 } from "../test-support/database-v3";

async function firstLine(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  let value = "";
  try {
    while (!value.includes("\n")) {
      const next = await reader.read();
      if (next.done) throw new Error("Identity reader ended before barrier.");
      value += new TextDecoder().decode(next.value);
    }
    return value.trim();
  } finally { reader.releaseLock(); }
}
async function rest(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  let value = "";
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) return value;
      value += new TextDecoder().decode(next.value);
    }
  } finally { reader.releaseLock(); }
}

test("SQLite B5: live identity uses one snapshot across a real concurrent v3 migration", async () => {
  const root = mkdtempSync(join(tmpdir(), "mf32-identity-snapshot-"));
  const path = join(root, "legacy.sqlite"), gate = join(root, "reader.gate");
  const env = { ...process.env, NODE_ENV: "test" };
  const savedMode = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  const seed = legacyV3(path);
  seed.exec("INSERT INTO counters VALUES('infra32_snapshot',17); PRAGMA wal_checkpoint(TRUNCATE)");
  seed.close();
  if (savedMode === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = savedMode;
  expect(Bun.spawnSync(["mkfifo", gate], { stdout: "pipe", stderr: "pipe" }).exitCode).toBe(0);
  const database = resolve(import.meta.dir, "database.ts");
  // Only a scheduling barrier is instrumented; every SQLite result/lock/write is real.
  // Stop after has(database_origin)=false and before reading schema_version.
  const code = `import*as sqlite from'bun:sqlite';import{spyOn}from'bun:test';import{openDatabase}from${JSON.stringify(database)};
const query=sqlite.Database.prototype.query,exec=sqlite.Database.prototype.exec;
let live=null,paused=false;
spyOn(sqlite.Database.prototype,'exec').mockImplementation(function(sql){const result=exec.call(this,sql);if(sql==='PRAGMA busy_timeout=3000')live=this;return result});
spyOn(sqlite.Database.prototype,'query').mockImplementation(function(sql,...args){if(this===live&&!paused&&sql==='SELECT version FROM schema_version'){paused=true;const fs=require('node:fs'),fd=fs.openSync(${JSON.stringify(gate)},'r+');console.log('ready');try{fs.readSync(fd,Buffer.alloc(1),0,1,null)}finally{fs.closeSync(fd)}}return query.call(this,sql,...args)});
try{const db=openDatabase(${JSON.stringify(path)});const ok=db.query('SELECT version FROM schema_version').get().version===6&&db.query('SELECT next FROM counters WHERE name=?').get('infra32_snapshot').next===17&&db.query('PRAGMA integrity_check').get().integrity_check==='ok'&&db.query('PRAGMA foreign_key_check').all().length===0;db.close();console.log(ok?'valid':'invalid');process.exitCode=ok?0:1}catch(error){console.log(error.message==='Identidad ausente.'?'IDENTITY_ABSENT':'TECHNICAL_ERROR');process.exitCode=1}`;
  const reader = Bun.spawn([process.execPath, "-e", code], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  try {
    expect(await firstLine(reader.stdout)).toBe("ready");
    const writer = Bun.spawnSync([process.execPath, "-e", `import{openDatabase}from${JSON.stringify(database)};const db=openDatabase(${JSON.stringify(path)});console.log(db.query('SELECT version FROM schema_version').get().version);db.close();`], { env, stdout: "pipe", stderr: "pipe" });
    expect(writer.exitCode).toBe(0);
    expect(writer.stdout.toString().trim()).toBe("6");
    expect(writer.stderr.toString()).toBe("");
    const gateFD = openSync(gate, constants.O_WRONLY | constants.O_NONBLOCK);
    try { writeSync(gateFD, "g"); } finally { closeSync(gateFD); }
    const output = await rest(reader.stdout);
    const exit = await reader.exited;
    const stderr = await new Response(reader.stderr).text();
    expect({ exit, output: output.trim(), stderrEmpty: stderr === "" }).toEqual({ exit: 0, output: "valid", stderrEmpty: true });
  } finally {
    reader.kill();
    await reader.exited;
    rmSync(root, { recursive: true, force: true });
  }
});
