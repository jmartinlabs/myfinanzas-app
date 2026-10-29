// Only synthetic acceptance state. Mounted into a disposable container, not shipped.
import { openDatabase } from '/app/apps/api/src/database.ts';
import { schemaVersion } from '/app/apps/api/src/database-identity.ts';
import { Auth, loadKey, provision, totp } from '/app/apps/api/src/auth.ts';
import { createApp } from '/app/apps/api/src/app.ts';
import { backup, restore } from '/app/apps/api/src/backup.ts';
import { HttpApp } from '@effect/platform';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { installFixture, linkFixture, snapshot } from './release-fixture.mjs';
const mode = process.argv[2];
const root = '/var/lib/myfinanzas';
const privatePath = root + '/fixture-private.json';
const check = (value, label) => { if (!value) throw new Error(label); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function main() {
  let db = openDatabase(process.env.DATABASE_PATH);
  let key = loadKey(db, process.env.AUTH_KEY_PATH);
  check(db.query('SELECT version FROM schema_version').get().version===schemaVersion,'actual SQLite schema contract');
  check(db.query('SELECT origin FROM database_origin').get().origin==='production','production identity contract');
  let saved = mode === 'seed' ? { password:'Synthetic fixture ' + randomUUID(), clock:Date.now(), cookie:'', csrf:'' } : JSON.parse(readFileSync(privatePath,'utf8'));
  if (mode !== 'seed') {
    check(snapshot(db) === saved.business, 'confirmed data changed between versions');
    check(hash(key) === saved.keyHash, 'key changed between versions');
    const owner = db.query('SELECT password,secret FROM owner').get();
    check(JSON.stringify(owner) === saved.owner, 'password or encrypted TOTP changed unexpectedly');
    saved.clock += 60000;
  }
  let handler = HttpApp.toWebHandler(createApp(db,{key,origin:process.env.APP_ORIGIN,now:()=>saved.clock}));
  async function request(path,method='GET',body,expected=200) {
    const response = await handler(new Request(process.env.APP_ORIGIN+'/api'+path,{method,headers:{
      origin:process.env.APP_ORIGIN,cookie:saved.cookie,'x-csrf-token':saved.csrf,
      'content-type':'application/json','idempotency-key':randomUUID()},body:body===undefined?undefined:JSON.stringify(body)}));
    for(const cookie of response.headers.getSetCookie()) {
      const part=cookie.split(';')[0],name=part.split('=')[0];
      saved.cookie=saved.cookie.split('; ').filter(x=>x&&!x.startsWith(name+'=')).concat(part).join('; ');
    }
    const data=await response.json();
    if(data.csrf)saved.csrf=data.csrf;
    check(response.status===expected,'API status contract mismatch');
    return data;
  }
  async function mfa() {
    return request('/auth/mfa','POST',{code:totp(saved.secret).generate({timestamp:saved.clock})});
  }
  async function moduleReads() {
    // Every post-v6 module must still be readable by the release under test.
    for(const path of ['/deudas','/presupuestos','/ciclos','/plan-anual/2026',
      '/planes-ciclo/9001','/nomina','/anticipos/fichas','/compartidos/fichas',
      '/vehiculos','/revision-comida','/instrumentos','/compras']) {
      const data=await request(path);
      check(data!==undefined&&data!==null,'module read contract: '+path);
    }
  }
  if(mode==='seed') {
    const enrollment=await request('/auth/enroll','POST',{token:provision(db,saved.clock),password:saved.password});
    saved.secret=enrollment.secret;
    saved.codes=(await mfa()).recoveryCodes;
    check(saved.codes.length===10,'first MFA recovery contract');
    await request('/saldos','POST',{nombre:'Synthetic infrastructure A',tipo:'Efectivo',control:'Movimientos'},201);
    installFixture(db,'seed');
    await moduleReads();
  } else if(mode==='restore') {
    const recipientFile=root+'/recipient.identity';
    const generated=Bun.spawnSync(['age-keygen','-o',recipientFile],{stdout:'pipe',stderr:'pipe'});
    check(generated.exitCode===0,'age identity generation');
    const recipient=Bun.spawnSync(['age-keygen','-y',recipientFile],{stdout:'pipe',stderr:'pipe'});
    check(recipient.exitCode===0,'age recipient');
    db.exec("PRAGMA wal_autocheckpoint=0; INSERT INTO counters VALUES('infra32_backup_wal',23)");
    saved.business=snapshot(db);
    check(readFileSync(process.env.DATABASE_PATH+'-wal').length>32,'backup must include an actual committed WAL');
    backup(db,key,root+'/encrypted-copy',recipient.stdout.toString().trim());
    check(readdirSync(root+'/encrypted-copy').sort().join(',')==='access-key.age,database.age','backup plaintext residue');
    db.close();
    process.env.DATABASE_PATH=root+'/restored/database.sqlite';
    process.env.AUTH_KEY_PATH=root+'/restored/auth.key';
    const result=restore(root+'/encrypted-copy',root+'/restored',recipientFile);
    db=openDatabase(result.database);key=loadKey(db,result.key);
    check(hash(key)===saved.keyHash,'restored key mismatch');
    check(snapshot(db)===saved.business,'restored data mismatch');
    for(const table of ['sessions','challenges','recovery','bootstrap']) check(db.query(`SELECT * FROM ${table}`).all().length===0,'restore revocation');
    handler=HttpApp.toWebHandler(createApp(db,{key,origin:process.env.APP_ORIGIN,now:()=>saved.clock}));
    await request('/saldos','GET',undefined,401);
    await request('/auth/recover','POST',{password:saved.password,code:saved.codes[0]},401);
    await request('/auth/login','POST',{password:saved.password});
    const verified=await mfa();check(verified.recoveryCodes.length===10,'restored MFA recovery reissue');
    await moduleReads();
    const list=await request('/movimientos');check(list.total===3,'restored confirmed writes');
    check((await request('/saldos/S001')).saldo.posicion.importe==='60.00','restored derived data contract');
    db.close();
    console.log('MFA restore integrity key revocation and confirmed writes verified');
    return;
  } else {
    // A prior version's session must survive a compatible binary update/rollback.
    await request('/saldos');
    await request('/auth/login','POST',{password:saved.password});
    check((await mfa()).recoveryCodes.length===0,'binary change unexpectedly regenerated recovery codes');
    if(mode==='update') {
      await request('/saldos','POST',{nombre:'Synthetic infrastructure B',tipo:'Efectivo',control:'Movimientos'},201);
      installFixture(db,'update');
    }
    await moduleReads();
  }
  const body={tipo:'Ingreso',fecha:'2026-01-01',importe:mode==='seed'?'50':mode==='update'?'7':'3',saldo:'S001',subtipo:'Bonus',concepto:'Synthetic infrastructure acceptance'};
  const preview=await request('/movimientos/impacto','POST',body);
  await request('/movimientos','POST',{...body,fingerprint:preview.fingerprint,aceptarCoincidencia:true},201);
  linkFixture(db,mode);
  if(mode==='rollback') {
    const oldCookie=saved.cookie;
    const recovered=await request('/auth/recover','POST',{password:saved.password,code:saved.codes[0]});
    saved.secret=recovered.secret;
    check(db.query('SELECT * FROM sessions').all().length===0,'recovery must revoke old sessions');
    saved.clock+=60000;
    saved.codes=(await mfa()).recoveryCodes;
    check(saved.codes.length===10&&oldCookie!==saved.cookie,'cross-version recovery/MFA contract');
  }
  saved.business=snapshot(db);saved.keyHash=hash(key);
  saved.owner=JSON.stringify(db.query('SELECT password,secret FROM owner').get());
  writeFileSync(privatePath,JSON.stringify(saved),{mode:0o600});
  db.close();
  console.log('Synthetic data authentication and committed-write contract verified');
}
main().catch(()=>{console.error('Synthetic release contract failed: '+mode);process.exit(1);});
