import { test, expect, spyOn } from "bun:test";
import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { initializeProduction } from "./production-state";
import { productionConfig, publishNewDirectory, syncPath } from "./private-state";
import { inspectIdentity } from "./database-identity";
import { openDatabase } from "./database";
import { openDatabaseV5 } from "../test-support/database-v5";
import { openDatabase as openDatabaseV1 } from "../test-support/database-v1";
import { Auth, loadKey, provision, totp, digest } from "./auth";
import { createApp } from "./app";
import { backup, restore } from "./backup";

const variables = ["NODE_ENV", "DATABASE_PATH", "AUTH_KEY_PATH", "APP_ORIGIN"] as const;
async function production(run: (root: string, path: string, key: string) => void | Promise<void>) {
  const saved = Object.fromEntries(variables.map(k => [k, process.env[k]]));
  const root = fs.mkdtempSync(join(tmpdir(), "mf-production-"));
  const path = join(root, "state", "database.sqlite"), key = join(root, "state", "auth.key");
  Object.assign(process.env, { NODE_ENV: "production", DATABASE_PATH: path, AUTH_KEY_PATH: key, APP_ORIGIN: "https://myfinanzas.pp.ua" });
  try { await run(root, path, key); }
  finally {
    for (const k of variables) if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    fs.rmSync(root, { recursive: true, force: true });
  }
}
const spawn = (script: string, args: string[] = [], env = process.env) => Bun.spawnSync([process.execPath, script, ...args], { env, stdout: "pipe", stderr: "pipe" });
function readonly(path: string, read: (db: Database) => void) { const db = new Database(path, { readonly: true }); try { read(db); } finally { db.close(); } }

test("31 P1 AC01–07/10/11: explicit clean creation, first ID and symmetric fail-closed origins", async () => production(async (root, path, key) => {
  expect(() => openDatabase(path)).toThrow();
  expect(fs.existsSync(dirname(path))).toBe(false);
  initializeProduction();
  expect(fs.readFileSync(key)).toHaveLength(32);
  const before = fs.readFileSync(path);
  readonly(path, db => {
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({version:6});
    expect(db.query("SELECT id FROM saldos").all()).toEqual([{id:"S000"}]);
    expect(db.query("SELECT next FROM counters WHERE name='saldo'").get()).toEqual({next:1});
    for (const table of ["owner","bootstrap","movimientos","categorias","subcategorias","partidas","ciclos","referencias"])
      expect(db.query(`SELECT * FROM ${table}`).all()).toEqual([]);
  });
  for (const mode of ["development","test",undefined,"staging"]) {
    if (mode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=mode;
    expect(() => openDatabase(path)).toThrow();
    expect(fs.readFileSync(path)).toEqual(before);
  }
  process.env.NODE_ENV="production";
  for (let i=0;i<2;i++) openDatabase(path).close();
  const reopened=fs.readFileSync(path), originalKey=fs.readFileSync(key);
  expect(() => initializeProduction()).toThrow();
  expect(fs.readFileSync(path)).toEqual(reopened); expect(fs.readFileSync(key).equals(originalKey)).toBe(true);
  // Legacy/demo contents are never a source of production identity, even with private paths.
  const demo=join(root,"demo.sqlite"); process.env.NODE_ENV="test"; openDatabase(demo).close();
  process.env.NODE_ENV="production"; process.env.DATABASE_PATH=demo; process.env.AUTH_KEY_PATH=join(root,"demo.key");
  const demoBefore=fs.readFileSync(demo); expect(() => openDatabase(demo)).toThrow(); expect(fs.readFileSync(demo)).toEqual(demoBefore);
}));

test("31 P2 AC08/09: genuine v1/v5 upgrade conserves rows; preliminary and unknown identity rejected", async () => production((root) => {
  process.env.NODE_ENV="test";
  for (const [version, init] of [[1,openDatabaseV1],[5,openDatabaseV5]] as const) {
    const path=join(root,`legacy-${version}.sqlite`); const old=init(path);
    const saldos=old.query("SELECT * FROM saldos ORDER BY id").all(); old.close();
    const db=openDatabase(path); expect(inspectIdentity(db)?.origin).toBe("demo");
    expect(db.query("SELECT * FROM saldos ORDER BY id").all()).toEqual(saldos); db.close();
  }
  const preliminary=join(root,"preliminary.sqlite"), p=openDatabaseV5(preliminary);
  p.exec("CREATE TABLE database_origin(origin TEXT); INSERT INTO database_origin VALUES('production')"); p.close();
  const bytes=fs.readFileSync(preliminary); expect(()=>openDatabase(preliminary)).toThrow(); expect(fs.readFileSync(preliminary)).toEqual(bytes);
  const unknown=join(root,"unknown.sqlite"), u=openDatabaseV5(unknown); u.exec("UPDATE schema_version SET version=999"); u.close();
  const before=fs.readFileSync(unknown); expect(()=>openDatabase(unknown)).toThrow(); expect(fs.readFileSync(unknown)).toEqual(before);
  // Fail metadata installation after older migrations have run: rollback must include version/data.
  const rollback=join(root,"rollback.sqlite"), r=openDatabaseV5(rollback);
  r.exec("CREATE TRIGGER origin_no_update BEFORE UPDATE ON schema_version BEGIN SELECT RAISE(ABORT,'synthetic failure'); END"); r.close();
  expect(()=>openDatabase(rollback)).toThrow(); readonly(rollback, db=>expect(db.query("SELECT version FROM schema_version").get()).toEqual({version:5}));
}));

test("31 P3 AC11–14/18: unsafe paths, aliases, permissions and lost key never repaired", async () => production((root,path,key) => {
  const config=productionConfig();
  process.env.DATABASE_PATH="relative.sqlite"; expect(()=>initializeProduction()).toThrow(); process.env.DATABASE_PATH=path;
  process.env.APP_ORIGIN="http://127.0.0.1:5173"; expect(()=>initializeProduction()).toThrow(); process.env.APP_ORIGIN=config.origin;
  process.env.AUTH_KEY_PATH=path; expect(()=>initializeProduction()).toThrow(); process.env.AUTH_KEY_PATH=key;
  fs.chmodSync(root,0o755); expect(()=>initializeProduction()).toThrow(); fs.chmodSync(root,0o700);
  initializeProduction(); const bytes=fs.readFileSync(path), originalKey=fs.readFileSync(key);
  fs.chmodSync(key,0o644); expect(()=>openDatabase(path)).toThrow(); expect(fs.statSync(key).mode & 0o777).toBe(0o644); fs.chmodSync(key,0o600);
  fs.unlinkSync(key); expect(()=>openDatabase(path)).toThrow(); expect(fs.existsSync(key)).toBe(false);
  fs.writeFileSync(key,randomBytes(32),{mode:0o600}); expect(()=>openDatabase(path)).toThrow();
  fs.writeFileSync(key,Buffer.alloc(3)); expect(()=>openDatabase(path)).toThrow();
  fs.unlinkSync(key); fs.symlinkSync(path,key); expect(()=>openDatabase(path)).toThrow(); fs.unlinkSync(key);
  fs.linkSync(path,key); expect(()=>openDatabase(path)).toThrow(); fs.unlinkSync(key);
  fs.writeFileSync(key,originalKey,{mode:0o600});
  const alias=join(root,"alias"); fs.symlinkSync(dirname(path),alias);
  process.env.DATABASE_PATH=join(alias,"database.sqlite");process.env.AUTH_KEY_PATH=join(alias,"auth.key");
  expect(()=>openDatabase(process.env.DATABASE_PATH!)).toThrow();
  expect(fs.readFileSync(path)).toEqual(bytes);
}));

test("31 P4 AC15/16: two real initializers, exclusive publication and injected sync failure", async () => production(async (root,path) => {
  const children=[0,1].map(()=>Bun.spawn([process.execPath,"apps/api/src/production-init.ts"],{env:process.env,stdout:"pipe",stderr:"pipe"}));
  const results=await Promise.all(children.map(async c=>({exit:await c.exited,out:await new Response(c.stdout).text(),err:await new Response(c.stderr).text()})));
  expect(results.filter(r=>r.exit===0)).toHaveLength(1); expect(results.filter(r=>r.exit!==0)).toHaveLength(1);
  openDatabase(path).close();
  const stage=fs.mkdtempSync(join(root,"stage-")), target=join(root,"existing");fs.mkdirSync(target,{mode:0o700});
  expect(()=>publishNewDirectory(stage,target)).toThrow();expect(fs.existsSync(stage)).toBe(true);expect(fs.readdirSync(target)).toEqual([]);
  process.env.DATABASE_PATH=join(root,"failure","database.sqlite");process.env.AUTH_KEY_PATH=join(root,"failure","auth.key");
  const injected=spyOn(fs,"fsyncSync").mockImplementation(()=>{throw new Error("synthetic ENOSPC");});
  try {expect(()=>initializeProduction()).toThrow();expect(fs.existsSync(join(root,"failure"))).toBe(false);} finally {injected.mockRestore();}
  expect(fs.readdirSync(root).some(n=>n.startsWith(".initialize-"))).toBe(false);
}));

async function api(db: Database,key: Buffer, origin="https://myfinanzas.pp.ua") {
  const handler=HttpApp.toWebHandler(createApp(db,{key,origin}));let cookie="",csrf="";
  const request=async(path:string,method="GET",body?:unknown,extra:Record<string,string>={})=>{
    const response=await handler(new Request(origin+"/api"+path,{method,headers:{origin,cookie,"content-type":"application/json","x-csrf-token":csrf,...extra},body:body===undefined?undefined:JSON.stringify(body)}));
    for(const s of response.headers.getSetCookie()) { const part=s.split(";")[0],name=part.split("=")[0];cookie=cookie.split("; ").filter(p=>p&&!p.startsWith(name+"=")).concat(part).join("; "); }
    const data=await response.json(); if(data.csrf) csrf=data.csrf;
    return {status:response.status,data,headers:response.headers};
  };
  return {request};
}

test("31 P5 AC04/18–23: private CLI token and complete production MFA/API contract",async()=>production(async(root,path,keyPath)=>{
  initializeProduction(); const output=join(dirname(path),"token.txt");
  const setup=spawn("apps/api/src/setup.ts",[output]); expect(setup.exitCode).toBe(0);
  const token=fs.readFileSync(output,"utf8");expect(token).toHaveLength(43);expect(setup.stdout.toString().includes(token)).toBe(false);expect(setup.stderr.toString().includes(token)).toBe(false);
  expect(fs.statSync(output).mode & 0o777).toBe(0o600);
  const db=openDatabase(path),key=loadKey(db,keyPath);
  try {
    const hash=db.query("SELECT hash FROM bootstrap").get();
    expect(spawn("apps/api/src/setup.ts",[output]).exitCode).not.toBe(0); expect(db.query("SELECT hash FROM bootstrap").get()).toEqual(hash);
    const f=await api(db,key);expect((await f.request("/saldos")).status).toBe(401);
    const pass="Synthetic testing "+randomUUID();
    const enrolled=await f.request("/auth/enroll","POST",{token,password:pass});expect(enrolled.status).toBe(200);
    expect((await f.request("/saldos")).status).toBe(401);
    const verified=await f.request("/auth/mfa","POST",{code:totp(enrolled.data.secret).generate()});expect(verified.status).toBe(200);expect(verified.data.recoveryCodes).toHaveLength(10);
    expect(verified.headers.getSetCookie().join(";")).toContain("Secure");expect(verified.headers.getSetCookie().join(";")).toContain("__Host-mf_session");
    expect((await f.request("/saldos")).data.total).toBe(0);
    const input={nombre:"Synthetic",tipo:"Efectivo",control:"Movimientos"};
    expect((await f.request("/saldos","POST",input,{origin:"https://wrong.invalid","idempotency-key":randomUUID()})).status).toBe(403);
    const saldo=await f.request("/saldos","POST",input,{"idempotency-key":randomUUID()});expect(saldo.status).toBe(201);expect(saldo.data.saldo.id).toBe("S001");
    expect((await f.request("/referencias")).data.total).toBe(0);expect((await f.request("/movimientos")).data.total).toBe(0);
    const next=join(dirname(path),"next-token.txt");expect(spawn("apps/api/src/setup.ts",[next]).exitCode).not.toBe(0);expect(fs.existsSync(next)).toBe(false);
    fs.unlinkSync(output);
    // Key remains mandatory after owner activation too.
    const original=fs.readFileSync(keyPath); fs.unlinkSync(keyPath);expect(()=>openDatabase(path)).toThrow();fs.writeFileSync(keyPath,original,{mode:0o600});
  } finally {db.close();}
}));

test("31 P6 AC24–29: encrypted production identity roundtrip and crossing rejection",async()=>production(async(root,path,keyPath)=>{
  initializeProduction();let db=openDatabase(path);const key=loadKey(db,keyPath);
  const identity=join(root,"identity.txt");
  const generated=Bun.spawnSync([process.env.AGE_KEYGEN_BIN??"age-keygen","-o",identity],{stdout:"pipe",stderr:"pipe"});expect(generated.exitCode).toBe(0);
  const recipient=Bun.spawnSync([process.env.AGE_KEYGEN_BIN??"age-keygen","-y",identity],{stdout:"pipe",stderr:"pipe"}).stdout.toString().trim();
  const pass="Synthetic "+randomUUID(),auth=new Auth(db,key,process.env.APP_ORIGIN);const enrollment=await auth.enroll(provision(db),pass);
  const tokenState=db.query("SELECT hash FROM challenges").get() as {hash:string};
  // Use API for MFA so returned session/codes never enter test output.
  const f=await api(db,key); const login=await f.request("/auth/login","POST",{password:pass});expect(login.status).toBe(200);
  const verification=await f.request("/auth/mfa","POST",{code:totp(enrollment.secret!).generate()});expect(verification.status).toBe(200);
  const copy=join(root,"copy");backup(db,key,copy,recipient);db.close();
  const target=join(root,"restored");process.env.DATABASE_PATH=join(target,"database.sqlite");process.env.AUTH_KEY_PATH=join(target,"auth.key");
  const restored=restore(copy,target,identity);db=openDatabase(restored.database);
  try {
    expect(inspectIdentity(db)?.origin).toBe("production");expect(db.query("SELECT * FROM sessions").all()).toEqual([]);expect(db.query("SELECT * FROM recovery").all()).toEqual([]);
    expect(db.query("SELECT * FROM challenges").all()).toEqual([]);expect(db.query("SELECT * FROM bootstrap").all()).toEqual([]);
    const a=new Auth(db,loadKey(db,restored.key),process.env.APP_ORIGIN,()=>Date.now()+30000);
    const challenge=await a.login(pass);
    const result=a.verify(new Request(process.env.APP_ORIGIN!,{headers:{cookie:a.challengeName+"="+challenge.challenge}}),totp(enrollment.secret!).generate({timestamp:Date.now()+30000}));expect(result.recoveryCodes).toHaveLength(10);
  } finally {db.close();}
  process.env.NODE_ENV="test";expect(()=>restore(copy,join(root,"crossed"),identity)).toThrow();expect(fs.existsSync(join(root,"crossed"))).toBe(false);
  expect(()=>openDatabase(restored.database)).toThrow();
}));
