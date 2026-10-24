import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { createDebt, getDebt, updateDebt, listDebts } from "./deudas";
import { createClassification, updateClassification } from "./clasificacion";
import { createSaldo, getSaldo, updateSaldo } from "./saldos";
import {
  previewMovement,
  writeMovement,
  listMovements,
  movementOptions,
  spanishToday,
} from "./movimientos";
import { cycleContext } from "./ciclos";
const now = Date.parse("2026-10-22T12:00:00Z");
function setup(db: Database) {
  const c = createClassification(
    db,
    "categorias",
    {
      nombre: "Gasto ficticio",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub ficticia", padre: c.id },
    randomUUID(),
  );
  const d = createDebt(
    db,
    {
      nombre: "Deuda ficticia",
      inicioControl: "2026-10-01",
      capitalApertura: "1000",
    },
    randomUUID(),
  );
  const p = createClassification(
    db,
    "partidas",
    { nombre: "Cuota ficticia", padre: sub.id, deuda: d.id },
    randomUUID(),
  );
  const s = createSaldo(
    db,
    {
      nombre: "Banco ficticio",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500",
      fechaApertura: "2026-10-20",
      permiteSalidaExterior: true,
    },
    randomUUID(),
  );
  return { d, p, s, sub };
}
const quota = (s: string, p: string, extra: Record<string, unknown> = {}) => ({
  tipo: "Gasto",
  fecha: "2026-10-01",
  saldo: s,
  partida: p,
  importe: "100",
  capital: "80",
  intereses: "20",
  ...extra,
});
function save(
  db: Database,
  b: Record<string, unknown>,
  id: string | null = null,
  annul = false,
) {
  const plan = previewMovement(db, b, id, annul, now);
  return writeMovement(
    db,
    { ...b, fingerprint: plan.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    id,
    annul,
    now,
  ).movimiento;
}
test("06 D1 AC01/03/04/06/09/13/16/17/24: oráculo independiente precontrol/banco/gasto/capital y tipo único", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, p, s } = setup(db);
    expect(d.id).toBe("D001");
    expect(listDebts(db).total).toBe(1);
    save(
      db,
      quota(s.id, p.id, {
        fecha: "2026-09-30",
        importe: "70",
        capital: "50",
        intereses: "20",
      }),
    );
    save(db, quota(s.id, p.id));
    const extra = save(
      db,
      quota(s.id, p.id, {
        tipo: "Amortización deuda",
        fecha: "2026-10-02",
        importe: "200",
        capital: undefined,
        intereses: undefined,
      }),
    );
    expect(extra.capital).toBe("200.00");
    expect(extra.intereses).toBe("0.00");
    expect(getDebt(db, d.id).capitalPendiente).toBe("720.00");
    expect(getSaldo(db, s.id).posicion.importe).toBe("130.00");
    expect(
      listMovements(db, new URLSearchParams("tipo=Gasto")).movimientos.reduce(
        (n, r) => n + Number(r.importe),
        0,
      ),
    ).toBe(170);
    expect(listMovements(db, new URLSearchParams("deuda=" + d.id)).total).toBe(
      3,
    );
    expect(cycleContext(db).referencia.fecha).toBe("2026-10-02");
    expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual({
      n: 3,
    });
    expect(extra.ciclo).toBeNull();
  } finally {
    db.close();
  }
});
test("06 D2 AC05/07/08/10/12/14/19/20/22: invalidaciones, relaciones usadas, rectificación ambas Deudas y anulación", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, p, s, sub } = setup(db);
    for (const b of [
      { capital: undefined },
      { intereses: undefined },
      { capital: "0", intereses: "100" },
      { capital: "80", intereses: "19.99" },
      { capital: "80.001" },
      { intereses: "-1" },
      { importe: "0" },
      { importe: "100.001" },
    ])
      expect(() =>
        previewMovement(db, quota(s.id, p.id, b), null, false, now),
      ).toThrow();
    const ordinary = createClassification(
      db,
      "partidas",
      { nombre: "Ordinaria", padre: sub.id },
      randomUUID(),
    );
    save(
      db,
      quota(s.id, ordinary.id, { capital: undefined, intereses: undefined }),
    );
    expect(() =>
      updateClassification(db, "partidas", ordinary.id, {
        revision: ordinary.revision,
        deuda: d.id,
      }),
    ).toThrow("Partida utilizada");
    expect(() =>
      previewMovement(db, quota(s.id, ordinary.id), null, false, now),
    ).toThrow();
    expect(() =>
      previewMovement(
        db,
        quota(s.id, ordinary.id, {
          tipo: "Amortización deuda",
          capital: undefined,
          intereses: undefined,
        }),
        null,
        false,
        now,
      ),
    ).toThrow();
    const m = save(db, quota(s.id, p.id));
    expect(() =>
      updateDebt(db, d.id, { revision: 1, inicioControl: "2026-10-02" }),
    ).toThrow();
    expect(() =>
      updateClassification(db, "partidas", p.id, {
        revision: p.revision,
        deuda: null,
      }),
    ).toThrow();
    const d2 = createDebt(
      db,
      { nombre: "Otra", inicioControl: "2026-10-01", capitalApertura: "200" },
      randomUUID(),
    );
    const p2 = createClassification(
      db,
      "partidas",
      { nombre: "Otra cuota", padre: sub.id, deuda: d2.id },
      randomUUID(),
    );
    const b = quota(s.id, p2.id, {
        revision: m.revision,
        motivo: "Corregir Deuda",
      }),
      plan = previewMovement(db, b, m.id, false, now);
    expect(plan.impacto.deudas.map((d) => d.id)).toEqual([d.id, d2.id]);
    save(db, b, m.id);
    expect(getDebt(db, d.id).capitalPendiente).toBe("1000.00");
    expect(getDebt(db, d2.id).capitalPendiente).toBe("120.00");
    const changed = listMovements(db).movimientos.find((x) => x.id === m.id)!;
    save(
      db,
      { revision: changed.revision, motivo: "No era un hecho real" },
      m.id,
      true,
    );
    expect(getDebt(db, d2.id).capitalPendiente).toBe("200.00");
    const full = save(
      db,
      quota(s.id, p.id, { importe: "1000", capital: "1000", intereses: "0" }),
    );
    expect(getDebt(db, d.id).capitalPendiente).toBe("0.00");
    expect(() =>
      previewMovement(
        db,
        quota(s.id, p.id, { importe: "0.01", capital: "0.01", intereses: "0" }),
        null,
        false,
        now,
      ),
    ).toThrow("exceso");
    expect(full.capital).toBe("1000.00");
    const pending = previewMovement(db, quota(s.id, p2.id), null, false, now);
    updateDebt(db, d2.id, { revision: 1, nombre: "Renombrada" });
    expect(() =>
      writeMovement(
        db,
        { ...quota(s.id, p2.id), fingerprint: pending.fingerprint },
        randomUUID(),
        null,
        false,
        now,
      ),
    ).toThrow();
  } finally {
    db.close();
  }
});
test("06 D3 AC11/15/21/23/30: permisos, Terminal/no controlado, idempotencia, rollback completo y Madrid", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, p, s } = setup(db);
    for (const control of ["Terminal", "No controlado"]) {
      const a = createSaldo(
        db,
        {
          nombre: control,
          tipo: "Efectivo",
          control,
          permiteSalidaExterior: true,
        },
        randomUUID(),
      );
      const m = save(
        db,
        quota(a.id, p.id, {
          tipo: "Amortización deuda",
          importe: "1",
          capital: undefined,
          intereses: undefined,
        }),
      );
      expect(m.tipo).toBe("Amortización deuda");
      expect(getSaldo(db, a.id).posicion.importe).toBeNull();
    }
    expect(() =>
      previewMovement(
        db,
        quota(s.id, p.id, { fecha: "2026-10-23" }),
        null,
        false,
        now,
      ),
    ).toThrow();
    expect(spanishToday(Date.parse("2026-03-28T23:30:00Z"))).toBe("2026-03-29");
    expect(spanishToday(Date.parse("2026-10-25T23:30:00Z"))).toBe("2026-10-26");
    const b = quota(s.id, p.id),
      plan = previewMovement(db, b, null, false, now),
      key = randomUUID(),
      request = { ...b, fingerprint: plan.fingerprint };
    const r = writeMovement(db, request, key, null, false, now);
    expect(writeMovement(db, request, key, null, false, now)).toEqual(r);
    const snap = () =>
      [
        "movimientos",
        "movement_audit",
        "movement_attempts",
        "counters",
        "audit",
      ].map((t) => db.query(`SELECT * FROM ${t} ORDER BY rowid`).all());
    const before = snap();
    db.exec(
      "CREATE TRIGGER fail_debt_attempt BEFORE INSERT ON movement_attempts BEGIN SELECT RAISE(ABORT,'synthetic attempt failure'); END",
    );
    expect(() =>
      save(
        db,
        quota(s.id, p.id, { importe: "2", capital: "2", intereses: "0" }),
      ),
    ).toThrow();
    expect(snap()).toEqual(before);
    db.exec("DROP TRIGGER fail_debt_attempt");
    expect(getDebt(db, d.id).capitalPendiente).toBe("918.00");
    expect(() =>
      previewMovement(
        db,
        {
          tipo: "Transferencia",
          origen: s.id,
          destino: "S000",
          importe: "1",
          fecha: "2026-10-01",
        },
        null,
        false,
        now,
      ),
    ).toThrow();
  } finally {
    db.close();
  }
});

import { openDatabaseV6 } from "../test-support/database-v6";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createReference } from "./referencias";
import { keyHash, inspectIdentity } from "./database-identity";
import { Auth, loadKey, provision, totp } from "./auth";
import { backup, restore } from "./backup";
import { createApp } from "./app";
import { HttpApp } from "@effect/platform";
import { randomBytes } from "node:crypto";
const snapshot = (db: Database) =>
  (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
  ).map(
    ({ name }) =>
      [name, db.query(`SELECT * FROM "${name}" ORDER BY rowid`).all()] as const,
  );
test("06 D4 AC28/29: v6 genuina demo/producción ficticia, acceso/clave/historia y age7/MFA", async () => {
  const saved = {
    APP_ORIGIN: process.env.APP_ORIGIN,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_PATH: process.env.DATABASE_PATH,
    AUTH_KEY_PATH: process.env.AUTH_KEY_PATH,
  };
  const dir = mkdtempSync(join(tmpdir(), "mf-debt-v6-"));
  try {
    for (const origin of ["demo", "production"] as const) {
      const state = join(dir, origin);
      mkdirSync(state, { mode: 0o700 });
      const path = join(state, "database.sqlite"),
        keyPath = join(state, "auth.key"),
        key = randomBytes(32);
      let db = openDatabaseV6(path, {
        origin,
        key_hash: origin === "production" ? keyHash(key) : null,
      });
      // Assert the genuine fixture is private before any production open, even
      // when the runner starts with umask 022. Do not repair runtime sidecars.
      for (const file of [path, path + "-wal", path + "-shm"])
        expect(statSync(file).mode & 0o777).toBe(0o600);
      writeFileSync(keyPath, key, { mode: 0o600 });
      Object.assign(process.env, {
        NODE_ENV: origin === "production" ? "production" : "test",
        DATABASE_PATH: path,
        AUTH_KEY_PATH: keyPath,
        APP_ORIGIN: "https://myfinanzas.pp.ua",
      });
      const auth = new Auth(db, key),
        password = "Contraseña ficticia " + randomUUID();
      const token = provision(db),
        enrolled = await auth.enroll(token, password);
      const verified = auth.verify(
        new Request("http://127.0.0.1:5173", {
          headers: { cookie: auth.challengeName + "=" + enrolled.challenge },
        }),
        totp(enrolled.secret!).generate(),
      );
      const legacyBank = createSaldo(
        db,
        {
          nombre: "Banco histórico v6 ficticio",
          tipo: "Efectivo",
          control: "Movimientos",
          saldoApertura: "100",
          permiteSalidaExterior: true,
        },
        randomUUID(),
      );
      const legacyRef = createReference(
        db,
        { nombre: "Caso histórico v6 ficticio", tipo: "Evento" },
        randomUUID(),
      );
      const stamp = "2026-10-01T00:00:00.000Z";
      db.run(
        "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,nota,anulado,revision,creado,actualizado,referencia) VALUES('1','2026-09-30','Ingreso',1000,'S000',?,'Bonus',NULL,'Hecho histórico ficticio','',0,1,?,?,?)",
        [legacyBank.id, stamp, stamp, legacyRef.id],
      );
      const auditJson = JSON.stringify({
        id: "1",
        tipo: "Ingreso",
        importe: "10.00",
        referencia: legacyRef.id,
      });
      db.run(
        "INSERT INTO movement_audit VALUES('1',1,'alta',NULL,?,'usuario-unico',NULL,?)",
        [stamp, auditJson],
      );
      db.run(
        "INSERT INTO movement_attempts VALUES('legacy-attempt','legacy-hash',?,?)",
        [auditJson, Date.now() + 86400000],
      );
      db.run("UPDATE counters SET next=2 WHERE name='movimientos'");
      const before = snapshot(db),
        identity = inspectIdentity(db);
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      if (origin === "production") {
        // A genuinely unsafe sidecar must still fail closed before migration.
        // This deliberate negative changes only this fixture's mode, never data.
        chmodSync(path + "-wal", 0o644);
        expect(() => openDatabase(path)).toThrow(
          "Archivo privado regular 0600 requerido.",
        );
        expect(snapshot(db)).toEqual(before);
        expect(inspectIdentity(db)).toEqual(identity);
        expect(readFileSync(keyPath)).toEqual(key);
        chmodSync(path + "-wal", 0o600);
      }
      db.close();
      db = openDatabase(path);
      try {
        for (const [table, rows] of before) {
          if (table === "schema_version" || table === "counters") continue;
          const expected =
            table === "partidas"
              ? rows.map((r: any) => ({ ...r, deuda: null, presupuesto: null }))
              : table === "movimientos"
                ? rows.map((r: any) => ({
                    ...r,
                    capital: null,
                    intereses: null,
                  }))
                : table === "ciclos"
                  ? rows.map((r: any) => ({
                      ...r,
                      revision: 1,
                      actualizado: null,
                    }))
                  : rows;
          expect(
            db.query(`SELECT * FROM "${table}" ORDER BY rowid`).all(),
          ).toEqual(expected);
        }
        expect(inspectIdentity(db)).toEqual(identity);
        expect(readFileSync(keyPath)).toEqual(key);
        expect(
          new Auth(db, key).session(
            new Request("http://127.0.0.1:5173", {
              headers: { cookie: auth.cookieName + "=" + verified.session },
            }),
          ).csrf,
        ).toBe(verified.csrf);
        expect(db.query("SELECT version FROM schema_version").get()).toEqual({
          version: 12,
        });
        const { d, p, s } = setup(db);
        save(db, quota(s.id, p.id));
        const ageIdentity = join(dir, origin + ".agekey");
        const generated = Bun.spawnSync(["age-keygen", "-o", ageIdentity], {
          stdout: "pipe",
          stderr: "pipe",
        });
        expect(generated.exitCode).toBe(0);
        const recipient = Bun.spawnSync(["age-keygen", "-y", ageIdentity], {
          stdout: "pipe",
          stderr: "pipe",
        })
          .stdout.toString()
          .trim();
        const dest = join(dir, origin + "-backup");
        backup(db, key, dest, recipient);
        const decrypted = Bun.spawnSync(
          ["age", "-d", "-i", ageIdentity, join(dest, "database.age")],
          { stdout: "pipe", stderr: "pipe" },
        );
        expect(decrypted.exitCode).toBe(0);
        const bundle = JSON.parse(decrypted.stdout.toString());
        expect(bundle.manifest.schema).toBe(12);
        expect(bundle.manifest.app).toBe("e2.5-v12");
        expect(bundle.manifest.origin).toBe(origin);
        const target = join(dir, origin + "-restored");
        if (origin === "production")
          Object.assign(process.env, {
            DATABASE_PATH: join(target, "database.sqlite"),
            AUTH_KEY_PATH: join(target, "auth.key"),
          });
        const result = restore(dest, target, ageIdentity);
        const copy = openDatabase(result.database);
        try {
          expect(getDebt(copy, d.id).capitalPendiente).toBe("920.00");
          expect(getSaldo(copy, s.id).posicion.importe).toBe("400.00");
          expect(copy.query("SELECT * FROM sessions").all()).toEqual([]);
          expect(copy.query("SELECT * FROM debt_attempts").all()).toEqual([]);
          const a = new Auth(copy, readFileSync(result.key)),
            challenge = await a.login(password);
          expect(
            a.verify(
              new Request("http://127.0.0.1:5173", {
                headers: {
                  cookie: a.challengeName + "=" + challenge.challenge,
                },
              }),
              totp(enrolled.secret!).generate({
                timestamp: Date.now() + 30000,
              }),
            ).session,
          ).toBeString();
          expect(copy.query("PRAGMA foreign_key_check").all()).toEqual([]);
        } finally {
          copy.close();
        }
      } finally {
        db.close();
      }
    }
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
test("06 D5 AC28: fallo DDL de v6 rollback de esquema/datos e identidad; versión desconocida intacta", () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-debt-failure-")),
    path = join(dir, "database.sqlite");
  try {
    let db = openDatabaseV6(path);
    db.exec("CREATE TABLE movimientos_v7(conflict TEXT) STRICT");
    const before = snapshot(db),
      schema = db.query("SELECT * FROM sqlite_master ORDER BY name").all();
    db.close();
    expect(() => openDatabase(path)).toThrow();
    db = new Database(path);
    expect(snapshot(db)).toEqual(before);
    expect(db.query("SELECT * FROM sqlite_master ORDER BY name").all()).toEqual(
      schema,
    );
    db.exec("UPDATE schema_version SET version=999");
    const unknown = snapshot(db);
    db.close();
    expect(() => openDatabase(path)).toThrow();
    db = new Database(path);
    expect(snapshot(db)).toEqual(unknown);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("06 D6 AC27: rutas Effect reales protegidas y derivados rechazados", async () => {
  const db = openDatabase(":memory:"),
    key = randomBytes(32);
  try {
    const auth = new Auth(db, key),
      enrolled = await auth.enroll(
        provision(db),
        "Contraseña ficticia " + randomUUID(),
      );
    const verified = auth.verify(
      new Request("http://127.0.0.1:5173", {
        headers: { cookie: auth.challengeName + "=" + enrolled.challenge },
      }),
      totp(enrolled.secret!).generate(),
    );
    const handler = HttpApp.toWebHandler(createApp(db, { key }));
    const request = (
      path: string,
      method = "GET",
      body?: unknown,
      headers: Record<string, string> = {},
    ) =>
      handler(
        new Request("http://127.0.0.1:3001/api" + path, {
          method,
          headers: { "content-type": "application/json", ...headers },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
      );
    for (const path of ["/deudas", "/deudas/D001"])
      expect((await request(path)).status).toBe(401);
    const cookie = auth.cookieName + "=" + verified.session;
    expect(
      (await request("/deudas", "POST", { nombre: "Sin CSRF" }, { cookie }))
        .status,
    ).toBe(403);
    const good = {
      cookie,
      origin: "http://127.0.0.1:5173",
      "x-csrf-token": verified.csrf,
      "idempotency-key": randomUUID(),
    };
    const r = await request(
      "/deudas",
      "POST",
      {
        nombre: "Deuda API",
        inicioControl: "2026-10-01",
        capitalApertura: "100",
      },
      good,
    );
    expect(r.status).toBe(201);
    const id = (await r.json()).item.id;
    expect(
      (await request("/deudas/" + id, "GET", undefined, { cookie })).status,
    ).toBe(200);
    expect(
      (
        await request(
          "/deudas/" + id,
          "PATCH",
          { revision: 1, capitalPendiente: "0" },
          good,
        )
      ).status,
    ).toBe(422);
    expect(
      (await request("/deudas/" + id, "DELETE", undefined, good)).status,
    ).toBe(404);
  } finally {
    db.close();
  }
});

test("06 D7 AC09/13: payload UI null deriva extraordinaria y apertura negativa precontrol no impone exceso", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, p, s } = setup(db);
    const m = save(
      db,
      quota(s.id, p.id, {
        tipo: "Amortización deuda",
        importe: "10",
        capital: null,
        intereses: null,
      }),
    );
    expect(m.capital).toBe("10.00");
    expect(m.intereses).toBe("0.00");
    const negative = createDebt(
      db,
      {
        nombre: "Apertura negativa ficticia",
        inicioControl: "2026-10-01",
        capitalApertura: "-10",
      },
      randomUUID(),
    );
    const np = createClassification(
      db,
      "partidas",
      { nombre: "Precontrol ficticia", padre: p.padre, deuda: negative.id },
      randomUUID(),
    );
    save(db, quota(s.id, np.id, { fecha: "2026-09-30" }));
    expect(getDebt(db, negative.id).capitalPendiente).toBe("-10.00");
    expect(getSaldo(db, s.id).posicion.importe).toBe("390.00");
  } finally {
    db.close();
  }
});
test("06 D8 AC02/14/21/22/28: procesos reales v6→7, D1000, reintento y pagos admisibles separados excesivos juntos", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-debt-process-")),
    path = join(dir, "database.sqlite");
  try {
    const original = openDatabaseV6(path);
    original.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    original.close();
    const script = `import{openDatabase}from ${JSON.stringify(resolve("apps/api/src/database.ts"))};import{createDebt}from ${JSON.stringify(resolve("apps/api/src/deudas.ts"))};const db=openDatabase(process.argv[1]);const d=createDebt(db,{nombre:'Ficticia proceso',inicioControl:'2026-10-01',capitalApertura:'100'},process.argv[2]);console.log(d.id);db.close();`;
    const key = randomUUID(),
      children = [key, key, randomUUID()].map((k) =>
        Bun.spawn([process.execPath, "-e", script, path, k], {
          env: { ...process.env, NODE_ENV: "test" },
          stdout: "pipe",
          stderr: "pipe",
        }),
      );
    const ids = [];
    for (const child of children) {
      const status = await child.exited;
      const diagnostic = await new Response(child.stderr).text();
      expect(diagnostic).toBe("");
      expect(status).toBe(0);
      ids.push((await new Response(child.stdout).text()).trim());
    }
    expect(ids[0]).toBe(ids[1]);
    expect(new Set(ids).size).toBe(2);
    const db = openDatabase(path);
    try {
      db.run("UPDATE counters SET next=1000 WHERE name='deudas'");
      expect(
        createDebt(
          db,
          {
            nombre: "D1000",
            inicioControl: "2026-10-01",
            capitalApertura: "0",
          },
          randomUUID(),
        ).id,
      ).toBe("D1000");
      const { d, p, s } = setup(db);
      const b = quota(s.id, p.id, {
          importe: "600",
          capital: "600",
          intereses: "0",
        }),
        plan = previewMovement(db, b, null, false, now);
      db.close();
      const pay = `import{openDatabase}from ${JSON.stringify(resolve("apps/api/src/database.ts"))};import{writeMovement}from ${JSON.stringify(resolve("apps/api/src/movimientos.ts"))};const db=openDatabase(process.argv[1]);try{writeMovement(db,JSON.parse(process.argv[2]),crypto.randomUUID(),null,false,${now});console.log('saved');}catch(e){if(e.code!=='IMPACT_CHANGED')throw e;console.log('stale');}finally{db.close();}`;
      const racers = [0, 1].map(() =>
        Bun.spawn(
          [
            process.execPath,
            "-e",
            pay,
            path,
            JSON.stringify({
              ...b,
              fingerprint: plan.fingerprint,
              contextRevision: plan.contextRevision,
            }),
          ],
          {
            env: { ...process.env, NODE_ENV: "test" },
            stdout: "pipe",
            stderr: "pipe",
          },
        ),
      );
      const outputs = [];
      for (const child of racers) {
        expect(await new Response(child.stderr).text()).toBe("");
        expect(await child.exited).toBe(0);
        outputs.push((await new Response(child.stdout).text()).trim());
      }
      expect(outputs.sort()).toEqual(["saved", "stale"]);
      const check = openDatabase(path);
      try {
        expect(getDebt(check, d.id).capitalPendiente).toBe("400.00");
        expect(() => previewMovement(check, b, null, false, now)).toThrow(
          "exceso",
        );
        expect(
          check.query("SELECT COUNT(*) n FROM movement_attempts").get(),
        ).toEqual({ n: 1 });
        expect(check.query("PRAGMA foreign_key_check").all()).toEqual([]);
      } finally {
        check.close();
      }
    } finally {
      try {
        db.close();
      } catch {}
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("06 D9 AC13: apertura ausente no es cero, fecha frontera y mismo ID con varias Partidas", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, p, s, sub } = setup(db);
    const second = createClassification(
      db,
      "partidas",
      { nombre: "Segunda Partida misma deuda", padre: sub.id, deuda: d.id },
      randomUUID(),
    );
    save(db, quota(s.id, p.id, { fecha: "2026-09-30" }));
    expect(getDebt(db, d.id).capitalPendiente).toBe("1000.00");
    const m = save(db, quota(s.id, second.id, { fecha: "2026-10-01" }));
    expect(getDebt(db, d.id).capitalPendiente).toBe("920.00");
    save(
      db,
      quota(s.id, second.id, {
        fecha: "2026-09-30",
        revision: m.revision,
        motivo: "Fecha anterior al control",
      }),
      m.id,
    );
    expect(getDebt(db, d.id).capitalPendiente).toBe("1000.00");
    db.run(
      "INSERT INTO deudas VALUES('D9999','Apertura no informada','2026-10-01',NULL,'Activa',1,'2026-10-01T00:00:00Z','2026-10-01T00:00:00Z')",
    );
    expect(getDebt(db, "D9999").capitalPendiente).toBeNull();
    const unknown = createClassification(
      db,
      "partidas",
      { nombre: "Histórica apertura ausente", padre: sub.id, deuda: "D9999" },
      randomUUID(),
    );
    expect(() =>
      previewMovement(db, quota(s.id, unknown.id), null, false, now),
    ).toThrow("no calculable");
    expect(getSaldo(db, s.id).posicion.importe).toBe("300.00");
  } finally {
    db.close();
  }
});

test("06 D10 AC03/11/18/22/23: inactivos, permiso negativo, REF requerida en extraordinaria y rollback auditoría", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, p, s } = setup(db);
    const no = createSaldo(
      db,
      { nombre: "Sin permiso", tipo: "Efectivo", control: "No controlado" },
      randomUUID(),
    );
    expect(() =>
      previewMovement(
        db,
        quota(no.id, p.id, {
          tipo: "Amortización deuda",
          capital: null,
          intereses: null,
        }),
        null,
        false,
        now,
      ),
    ).toThrow("Exterior");
    const before = previewMovement(db, quota(s.id, p.id), null, false, now);
    updateDebt(db, d.id, { revision: 1, estado: "Inactiva" });
    expect(() =>
      writeMovement(
        db,
        {
          ...quota(s.id, p.id),
          fingerprint: before.fingerprint,
          contextRevision: before.contextRevision,
        },
        randomUUID(),
        null,
        false,
        now,
      ),
    ).toThrow("contexto");
    expect(() =>
      previewMovement(db, quota(s.id, p.id), null, false, now),
    ).toThrow("inactiva");
    updateDebt(db, d.id, { revision: 2, estado: "Activa" });
    const m = save(db, quota(s.id, p.id));
    updateDebt(db, d.id, { revision: 3, estado: "Inactiva" });
    save(
      db,
      { revision: m.revision, motivo: "Anular error con Deuda inactiva" },
      m.id,
      true,
    );
    expect(getDebt(db, d.id).capitalPendiente).toBe("1000.00");
    updateDebt(db, d.id, { revision: 4, estado: "Activa" });
    const a = snapshot(db);
    db.exec(
      "CREATE TRIGGER debt_audit_failure BEFORE INSERT ON movement_audit BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END",
    );
    expect(() => save(db, quota(s.id, p.id))).toThrow();
    expect(snapshot(db)).toEqual(a);
    db.exec("DROP TRIGGER debt_audit_failure");
    for (let i = 2; i <= 11; i++)
      createClassification(
        db,
        "categorias",
        {
          nombre: "Categoría prueba " + i,
          anual: "Gasto",
          mensual: "Gasto",
          referencia: i === 11,
        },
        randomUUID(),
      );
    const sub = createClassification(
      db,
      "subcategorias",
      { nombre: "Viajes deuda", padre: "CAT011" },
      randomUUID(),
    );
    const travelPart = createClassification(
      db,
      "partidas",
      { nombre: "Cuota viaje", padre: sub.id, deuda: d.id },
      randomUUID(),
    );
    expect(() =>
      previewMovement(
        db,
        quota(s.id, travelPart.id, {
          tipo: "Amortización deuda",
          capital: null,
          intereses: null,
        }),
        null,
        false,
        now,
      ),
    ).toThrow();
    const ref = createReference(
      db,
      { nombre: "Viaje ficticio", tipo: "Viaje" },
      randomUUID(),
    );
    expect(
      save(
        db,
        quota(s.id, travelPart.id, {
          tipo: "Amortización deuda",
          capital: null,
          intereses: null,
          referencia: ref.id,
        }),
      ).referencia?.id,
    ).toBe(ref.id);
  } finally {
    db.close();
  }
});
