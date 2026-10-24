import { createSaldo } from "./saldos";
import { confirmPayroll, getPayroll } from "./nomina";
import {
  getAnnualPlan,
  previewAnnualPlan,
  confirmAnnualPlan,
} from "./plan-anual";
import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { prepareSchema } from "./database-schema";
import { prepareV9 } from "../test-support/database-v9";
import { cyclePlanSchema } from "./cycle-plan-schema";
import { createBudget } from "./presupuestos";
import {
  executionFacts,
  planResult,
  getCyclePlan,
  previewCyclePlan,
  confirmCyclePlan,
  executionDetail,
  planConfigurationImpact,
  type PlanBudget,
  type PlanLine,
} from "./planes-ciclo";
import type { LedgerRow } from "./movement-ledger";
const now = Date.parse("2026-10-24T12:00:00Z"),
  key = () => randomUUID();
const budget: PlanBudget = {
  id: "PRE001",
  nombre: "Prueba",
  fuente: "Gasto real",
  destino: "S001",
  estado: "Activo",
};
const row = (input: Partial<LedgerRow>): LedgerRow => ({
  id: "1",
  fecha: "2026-10-01",
  tipo: "Gasto",
  importe: "2500",
  partida: "PAR001",
  origen: "S001",
  destino: "S000",
  capital: null,
  intereses: null,
  referencia: null,
  subtipo: null,
  concepto: "",
  nota: "",
  anulado: 0,
  revision: 1,
  creado: "",
  actualizado: "",
  ...input,
});
function setup() {
  const db = new Database(":memory:");
  prepareSchema(db, { origin: "demo", key_hash: null });
  db.run(
    "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2026-10-01',0,'fixture'),('2','2026-11-01',0,'fixture')",
  );
  const b = createBudget(
    db,
    { nombre: "Fixture", fuente: "No aplica", destino: null },
    key(),
  );
  return { db, b };
}
function proposal(db: Database, id: string, changes: unknown[]) {
  const p = getCyclePlan(db, id, now);
  return {
    revision: p.revision,
    contextRevision: p.contextRevision,
    cambios: changes,
  };
}
function save(
  db: Database,
  id: string,
  changes: unknown[],
  motivo = "Ensayo sintético",
) {
  const p = proposal(db, id, changes),
    v = previewCyclePlan(db, id, p, now);
  return confirmCyclePlan(
    db,
    id,
    { propuesta: p, fingerprint: v.fingerprint, motivo },
    key(),
    now,
  );
}
test("P1 V1–V10: exact nullable amounts, No aplica, no unplanned existing line", () => {
  for (const fuente of ["Gasto real", "Aportación a saldo"]) {
    const b = { ...budget, fuente };
    const line: PlanLine = {
      presupuesto: b.id,
      base: null,
      esencial: "0",
      delMes: null,
    };
    for (const total of [0n, 2500n]) {
      const v = planResult(b, line, total, null);
      expect(v.ejecutado).toBe(total === 0n ? "0.00" : "25.00");
      expect(v.aTransferir).toBeNull();
      expect(v.pendiente).toBeNull();
      expect(v.estado).toBeNull();
      expect(v.sinPlanificar).toBe(false);
    }
    for (const total of [0n, 2500n]) {
      const v = planResult(b, { ...line, delMes: "0" }, total, null);
      expect(v.aTransferir).toBe("0.00");
      expect(v.pendiente).toBe(total === 0n ? "0.00" : "-25.00");
      expect(v.estado).toBe(total === 0n ? "Completo" : "Excedido");
    }
    expect(planResult(b, undefined, 2500n, null).sinPlanificar).toBe(true);
    expect(planResult(b, undefined, 0n, null).sinPlanificar).toBe(false);
    expect(
      planResult(b, { ...line, delMes: "0" }, null, "Ciclo no iniciado").estado,
    ).toBeNull();
    for (const amount of [null, "0", "10000"]) {
      const v = planResult(
        { ...b, fuente: "No aplica" },
        { ...line, delMes: amount },
        null,
        "No comparable",
      );
      expect(v.ejecutado).toBeNull();
      expect(v.pendiente).toBeNull();
      expect(v.estado).toBeNull();
      expect(v.sinPlanificar).toBe(false);
    }
    for (const [total, state, pending] of [
      [6000n, "Pendiente", "40.00"],
      [10000n, "Completo", "0.00"],
      [12000n, "Excedido", "-20.00"],
    ] as const) {
      const v = planResult(b, { ...line, delMes: "10000" }, total, null);
      expect(v.estado).toBe(state);
      expect(v.pendiente).toBe(pending);
    }
  }
});
test("P2 R3 boundaries, real expenses include reference/full ordinary cuota; transfers ordinary only", () => {
  const rows = [
    row({}),
    row({ id: "2", referencia: "REF001", capital: "2000", intereses: "500" }),
    row({ id: "3", tipo: "Amortización deuda" }),
    row({ id: "4", anulado: 1 }),
    row({ id: "5", fecha: "2026-09-30" }),
    row({ id: "6", fecha: "2026-11-01" }),
    row({ id: "7", origen: "S002" }),
  ];
  expect(
    executionFacts(
      budget,
      rows,
      [{ id: "PAR001", presupuesto: budget.id }],
      "2026-10-01",
      "2026-10-31",
    ).map((r) => r.id),
  ).toEqual(["1", "2", "7"]);
  const b = { ...budget, fuente: "Aportación a saldo", destino: "S002" };
  const transfers = [
    row({ tipo: "Transferencia", destino: "S002" }),
    row({
      id: "2",
      tipo: "Transferencia",
      destino: "S002",
      referencia: "REF001",
    }),
    row({ id: "3", tipo: "Transferencia", destino: "S002", origen: "S000" }),
    row({ id: "4", origen: "S002" }),
  ];
  expect(
    executionFacts(b, transfers, [], "2026-10-01", "2026-10-31").map(
      (r) => r.id,
    ),
  ).toEqual(["1"]);
});
test("P3 GET side effect free, nullable writes, omitted preserve, validation atomic and delta audit", () => {
  const { db, b } = setup();
  try {
    expect(getCyclePlan(db, "1", now).sinPlan).toBe(true);
    expect(db.query("SELECT * FROM cycle_plans").all()).toHaveLength(0);
    save(db, "1", [
      { presupuesto: b.id, base: "1", esencial: "20", delMes: "0" },
    ]);
    save(db, "1", [{ presupuesto: b.id, base: null }]);
    const line = getCyclePlan(db, "1", now).items[0].linea!;
    expect(line).toMatchObject({
      base: null,
      esencial: "20.00",
      delMes: "0.00",
    });
    for (const amount of ["-1", "0.001", "92233720368547758.08", 1])
      expect(() =>
        previewCyclePlan(
          db,
          "1",
          proposal(db, "1", [{ presupuesto: b.id, base: amount }]),
          now,
        ),
      ).toThrow();
    expect(() =>
      previewCyclePlan(
        db,
        "1",
        proposal(db, "1", [{ presupuesto: b.id, ejecutado: "1" }]),
        now,
      ),
    ).toThrow();
    expect(() =>
      previewCyclePlan(
        db,
        "1",
        proposal(db, "1", [{ presupuesto: b.id }, { presupuesto: b.id }]),
        now,
      ),
    ).toThrow();
    expect(db.query("SELECT * FROM cycle_plan_audit").all()).toHaveLength(2);
    expect(() => db.run("DELETE FROM cycle_plan_audit")).toThrow();
  } finally {
    db.close();
  }
});
test("P4 retries, revision/context conflicts and rollback multilines", () => {
  const { db, b } = setup();
  try {
    const p = proposal(db, "1", [{ presupuesto: b.id, delMes: "1" }]),
      v = previewCyclePlan(db, "1", p, now),
      body = { propuesta: p, fingerprint: v.fingerprint, motivo: "Ensayo" },
      k = key();
    const result = confirmCyclePlan(db, "1", body, k, now);
    expect(confirmCyclePlan(db, "1", body, k, now)).toEqual(result);
    expect(() =>
      confirmCyclePlan(db, "1", { ...body, motivo: "Otro" }, k, now),
    ).toThrow();
    expect(() => confirmCyclePlan(db, "1", body, key(), now)).toThrow();
    const b2 = createBudget(
      db,
      { nombre: "Otra", fuente: "No aplica", destino: null },
      key(),
    );
    db.exec(
      "CREATE TRIGGER injected_failure BEFORE INSERT ON cycle_plan_lines WHEN NEW.presupuesto='" +
        b2.id +
        "' BEGIN SELECT RAISE(ABORT,'injected'); END;",
    );
    expect(() =>
      save(db, "2", [
        { presupuesto: b.id, delMes: "1" },
        { presupuesto: b2.id, delMes: "2" },
      ]),
    ).toThrow();
    expect(getCyclePlan(db, "2", now).sinPlan).toBe(true);
  } finally {
    db.close();
  }
});
test("P5 explicit copy preserves zeros, empty source and inactive history; source/context protected", () => {
  const { db, b } = setup();
  try {
    save(db, "1", [
      { presupuesto: b.id, base: "1", esencial: "0", delMes: "9" },
    ]);
    save(db, "2", [{ presupuesto: b.id, base: "0" }]);
    let dest = getCyclePlan(db, "2", now),
      p = {
        revision: dest.revision,
        contextRevision: dest.contextRevision,
        copia: { ciclo: "1", campos: ["base", "esencial"] },
      },
      v = previewCyclePlan(db, "2", p, now);
    expect(v.omisiones).toContainEqual({
      presupuesto: b.id,
      campo: "base",
      motivo: "ya informado",
    });
    expect(v.cambios[0].esencial).toBe("0");
    confirmCyclePlan(
      db,
      "2",
      { propuesta: p, fingerprint: v.fingerprint, motivo: "Copiar" },
      key(),
      now,
    );
    expect(getCyclePlan(db, "2", now).items[0].linea).toMatchObject({
      base: "0.00",
      esencial: "0.00",
      delMes: null,
    });
    db.run("UPDATE presupuestos SET estado='Inactivo' WHERE id=?", [b.id]);
    save(db, "1", [{ presupuesto: b.id, delMes: "2" }]);
    db.run(
      "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('3','2026-12-01',0,'fixture')",
    );
    expect(() => save(db, "3", [{ presupuesto: b.id }])).toThrow();
    expect(getCyclePlan(db, "1", now).items[0].linea!.delMes).toBe("2.00");
  } finally {
    db.close();
  }
});
test("P6 genuine v9 upgrade and transactional DDL rollback preserves v9 identity", () => {
  const db = new Database(":memory:");
  try {
    prepareV9(db, { origin: "demo", key_hash: null });
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 9,
    });
    expect(
      db.query("SELECT name FROM sqlite_master WHERE name='cycle_plans'").get(),
    ).toBeNull();
    expect(() =>
      db
        .transaction(() => {
          cyclePlanSchema(db);
          throw Error("rollback");
        })
        .immediate(),
    ).toThrow();
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 9,
    });
    prepareSchema(db, { origin: "demo", key_hash: null });
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 12,
    });
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    db.close();
  }
});

test("P7 real stored R3 + API-shaped read/reload, full total pagination and stale facts/config", () => {
  const { db, b } = setup();
  try {
    db.run(
      "UPDATE presupuestos SET fuente='Gasto real',destino='S001' WHERE id=?",
      [b.id],
    );
    db.run(
      "INSERT INTO categorias VALUES('CAT900','Fixture',NULL,'Gasto','Gasto',0,'Activa',1,'fixture','fixture')",
    );
    db.run(
      "INSERT INTO subcategorias VALUES('SUB900','Fixture','CAT900','Activa',1,'fixture','fixture')",
    );
    db.run(
      "INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,presupuesto) VALUES('PAR900','Fixture','SUB900','Activa',1,'fixture','fixture',?)",
      [b.id],
    );
    const insert = db.query(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,concepto,nota,anulado,revision,creado,actualizado) VALUES(?,'2026-10-01','Gasto',?,'S001','S000','PAR900','Fixture','',0,1,'fixture','fixture')",
    );
    for (let n = 1; n <= 105; n++) insert.run(String(n), "9223372036854775807");
    const initial = getCyclePlan(db, "1", now);
    expect(initial.sinPlan).toBe(true);
    expect(initial.items[0].sinPlanificar).toBe(true);
    const expected = (9223372036854775807n * 105n).toString();
    expect(initial.items[0].ejecutado).toBe(
      (BigInt(expected) / 100n).toString() +
        "." +
        (BigInt(expected) % 100n).toString().padStart(2, "0"),
    );
    save(db, "1", [{ presupuesto: b.id, delMes: null }]);
    const after = getCyclePlan(db, "1", now).items[0];
    expect(after.ejecutado).toBe(initial.items[0].ejecutado);
    expect(after.sinPlanificar).toBe(false);
    expect(after.estado).toBeNull();
    expect(after.pendiente).toBeNull();
    const detail = executionDetail(
      db,
      "1",
      b.id,
      new URLSearchParams("page=2"),
      now,
    );
    expect(detail.items).toHaveLength(5);
    expect(detail.total).toBe(105);
    expect(detail.ejecutado).toBe(initial.items[0].ejecutado);
    const p = proposal(db, "1", [{ presupuesto: b.id, base: "1" }]),
      v = previewCyclePlan(db, "1", p, now);
    db.run("UPDATE movimientos SET anulado=1,revision=revision+1 WHERE id='1'");
    expect(() =>
      confirmCyclePlan(
        db,
        "1",
        { propuesta: p, fingerprint: v.fingerprint, motivo: "Ensayo" },
        key(),
        now,
      ),
    ).toThrow();
    expect(
      planConfigurationImpact(
        db,
        { budget: { id: b.id, value: { fuente: "No aplica", destino: null } } },
        now,
      ).ciclos,
    ).toHaveLength(1);
    expect(
      planConfigurationImpact(
        db,
        { part: { id: "PAR900", presupuesto: null } },
        now,
      ).blocked,
    ).toBe(false);
  } finally {
    db.close();
  }
});

test("P8 actual HTTP MFA, CSRF/Origin, nullable read/reload, invalid fields and no-store", async () => {
  const { Auth, provision, totp } = await import("./auth"),
    { HttpApp } = await import("@effect/platform"),
    { createApp } = await import("./app"),
    { randomBytes } = await import("node:crypto");
  const { db, b } = setup(),
    secret = randomBytes(32);
  try {
    const auth = new Auth(db, secret),
      enrollment = await auth.enroll(
        provision(db),
        "Contraseña de prueba plan " + key(),
      ),
      verified = auth.verify(
        new Request("http://127.0.0.1:5173", {
          headers: { cookie: auth.challengeName + "=" + enrollment.challenge },
        }),
        totp(enrollment.secret!).generate(),
      );
    const handler = HttpApp.toWebHandler(createApp(db, { key: secret }));
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
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
    const cookie = auth.cookieName + "=" + verified.session,
      good = {
        cookie,
        origin: "http://127.0.0.1:5173",
        "x-csrf-token": verified.csrf,
        "idempotency-key": key(),
      };
    for (const suffix of ["", "/ejecucion/" + b.id])
      expect((await request("/planes-ciclo/1" + suffix)).status).toBe(401);
    expect(
      (await request("/planes-ciclo/1/impacto", "POST", {}, { cookie })).status,
    ).toBe(403);
    expect(
      (
        await request(
          "/planes-ciclo/1/impacto",
          "POST",
          {},
          { ...good, origin: "https://hostile.invalid" },
        )
      ).status,
    ).toBe(403);
    const r = await request("/planes-ciclo/1", "GET", undefined, { cookie });
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const p = proposal(db, "1", [
        { presupuesto: b.id, delMes: null, esencial: "0" },
      ]),
      v = await request("/planes-ciclo/1/impacto", "POST", p, good);
    expect(v.status).toBe(200);
    const preview = await v.json();
    const body = {
      propuesta: p,
      fingerprint: preview.fingerprint,
      motivo: "Primera captura HTTP",
    };
    expect(
      (await request("/planes-ciclo/1/confirmar", "POST", body, good)).status,
    ).toBe(200);
    const reload = await (
      await request("/planes-ciclo/1", "GET", undefined, { cookie })
    ).json();
    expect(reload.items[0].linea).toMatchObject({
      delMes: null,
      esencial: "0.00",
    });
    expect(reload.items[0].estado).toBeNull();
    expect(
      (await request("/planes-ciclo/999", "GET", undefined, { cookie })).status,
    ).toBe(404);
    const invalid = proposal(db, "1", [{ presupuesto: b.id, ejecutado: "12" }]);
    const error = await request(
      "/planes-ciclo/1/impacto",
      "POST",
      invalid,
      good,
    );
    expect(error.status).toBe(400);
    expect(await error.text()).not.toMatch(
      /SELECT|INSERT|sqlite|password|secret/i,
    );
  } finally {
    db.close();
  }
});

test("P9 two actual processes confirm one old revision: one commit and one conflict", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs"),
    { tmpdir } = await import("node:os"),
    { join, resolve } = await import("node:path"),
    { openDatabase } = await import("./database");
  const dir = mkdtempSync(join(tmpdir(), "mf-plan-race-")),
    path = join(dir, "demo.sqlite");
  let db = openDatabase(path);
  try {
    db.run(
      "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2020-01-01',0,'fixture')",
    );
    const b = createBudget(
        db,
        { nombre: "Concurrente", fuente: "No aplica", destino: null },
        key(),
      ),
      p = proposal(db, "1", [{ presupuesto: b.id, delMes: "1" }]),
      v = previewCyclePlan(db, "1", p, now),
      body = {
        propuesta: p,
        fingerprint: v.fingerprint,
        motivo: "Concurrencia real",
      };
    const script = `import{openDatabase}from${JSON.stringify(resolve(import.meta.dir, "database.ts"))};import{confirmCyclePlan}from${JSON.stringify(resolve(import.meta.dir, "planes-ciclo.ts"))};const db=openDatabase(${JSON.stringify(path)});try{confirmCyclePlan(db,'1',${JSON.stringify(body)},process.argv[1],${now});console.log('200');}catch(e){if(e.status!==409)throw e;console.log('409');}finally{db.close();}`;
    const children = [key(), key()].map((k) =>
      Bun.spawn([process.execPath, "-e", script, k], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, NODE_ENV: "test" },
      }),
    );
    const output = await Promise.all(
      children.map(async (c) => {
        const [code, text, err] = await Promise.all([
          c.exited,
          new Response(c.stdout).text(),
          new Response(c.stderr).text(),
        ]);
        expect(code).toBe(0);
        expect(err).toBe("");
        return text.trim();
      }),
    );
    expect(output.sort()).toEqual(["200", "409"]);
    expect(db.query("SELECT revision FROM cycle_plans").get()).toEqual({
      revision: 1,
    });
    expect(db.query("SELECT * FROM cycle_plan_audit").all()).toHaveLength(1);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("P10 copy source and cycle changes invalidate preview, no effective change writes no plan/audit", () => {
  const { db, b } = setup();
  try {
    const empty = proposal(db, "2", []),
      v = previewCyclePlan(db, "2", empty, now);
    expect(v.sinCambios).toBe(true);
    confirmCyclePlan(
      db,
      "2",
      { propuesta: empty, fingerprint: v.fingerprint },
      key(),
      now,
    );
    expect(db.query("SELECT * FROM cycle_plans").all()).toHaveLength(0);
    save(db, "1", [{ presupuesto: b.id, delMes: "1" }]);
    const target = getCyclePlan(db, "2", now),
      p = {
        revision: target.revision,
        contextRevision: target.contextRevision,
        copia: { ciclo: "1", campos: ["delMes"] },
      },
      preview = previewCyclePlan(db, "2", p, now);
    save(db, "1", [{ presupuesto: b.id, delMes: "2" }]);
    expect(() =>
      confirmCyclePlan(
        db,
        "2",
        { propuesta: p, fingerprint: preview.fingerprint },
        key(),
        now,
      ),
    ).toThrow();
    const fresh = proposal(db, "1", [{ presupuesto: b.id, base: "1" }]),
      review = previewCyclePlan(db, "1", fresh, now);
    db.run("INSERT INTO cycle_operation_guard VALUES(1)");
    db.run(
      "UPDATE ciclos SET inicio='2026-10-02',revision=revision+1 WHERE id='1'",
    );
    db.run("DELETE FROM cycle_operation_guard");
    expect(() =>
      confirmCyclePlan(
        db,
        "1",
        {
          propuesta: fresh,
          fingerprint: review.fingerprint,
          motivo: "Nuevo periodo",
        },
        key(),
        now,
      ),
    ).toThrow();
  } finally {
    db.close();
  }
});

test("P11 genuine v9 demo/production migration retains MFA/key; encrypted v12 restore revokes cycle/annual/payroll attempts and retains delta audit", async () => {
  const fs = await import("node:fs"),
    { tmpdir } = await import("node:os"),
    { join } = await import("node:path"),
    { randomBytes } = await import("node:crypto"),
    { openDatabase } = await import("./database"),
    { inspectIdentity, keyHash } = await import("./database-identity"),
    { Auth, provision, totp } = await import("./auth"),
    { backup, restore } = await import("./backup");
  const dir = fs.mkdtempSync(join(tmpdir(), "mf-plan-v9-")),
    env = { ...process.env };
  try {
    for (const origin of ["demo", "production"] as const) {
      const state = join(dir, origin);
      fs.mkdirSync(state, { mode: 0o700 });
      const path = join(state, "database.sqlite"),
        keyPath = join(state, "key.bin"),
        secret = randomBytes(32);
      fs.writeFileSync(keyPath, secret, { mode: 0o600 });
      const oldMask = process.umask(0o077);
      let db: Database;
      try {
        db = new Database(path);
        prepareV9(db, {
          origin,
          key_hash: origin === "production" ? keyHash(secret) : null,
        });
      } finally {
        process.umask(oldMask);
      }
      try {
        db.run(
          "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2020-01-01',0,'fixture')",
        );
        const b = createBudget(
          db,
          { nombre: "Persistente", fuente: "No aplica", destino: null },
          key(),
        );
        const auth = new Auth(db, secret),
          enrolled = await auth.enroll(
            provision(db),
            "Contraseña migración " + key(),
          ),
          verified = auth.verify(
            new Request("http://127.0.0.1:5173", {
              headers: {
                cookie: auth.challengeName + "=" + enrolled.challenge,
              },
            }),
            totp(enrolled.secret!).generate(),
          );
        const identityBefore = inspectIdentity(db),
          priorBudget = db.query("SELECT * FROM presupuestos").all();
        db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
        db.close();
        Object.assign(process.env, {
          NODE_ENV: origin === "production" ? "production" : "test",
          DATABASE_PATH: path,
          AUTH_KEY_PATH: keyPath,
          APP_ORIGIN: "https://fixture.invalid",
        });
        db = openDatabase(path);
        expect(inspectIdentity(db)).toEqual(identityBefore);
        expect(fs.readFileSync(keyPath)).toEqual(secret);
        expect(db.query("SELECT * FROM presupuestos").all()).toEqual(
          priorBudget,
        );
        expect(
          new Auth(db, secret).session(
            new Request("http://127.0.0.1:5173", {
              headers: { cookie: auth.cookieName + "=" + verified.session },
            }),
          ).csrf,
        ).toBe(verified.csrf);
        save(db, "1", [
          { presupuesto: b.id, base: null, esencial: "0", delMes: "25" },
        ]);
        save(db, "1", [{ presupuesto: b.id, base: "10" }]);
        db.exec(`INSERT INTO categorias VALUES('CAT900','Fixture',NULL,'Gasto','Gasto',0,'Activa',1,'f','f');
          INSERT INTO subcategorias VALUES('SUB900','Fixture','CAT900','Activa',1,'f','f');
          INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado) VALUES('PAR900','Anual fixture','SUB900','Activa',1,'f','f');`);
        for (const presupuesto of [null, "0"]) {
          const annualBefore = getAnnualPlan(db, 2026, now),
            annualProposal = {
              partida: "PAR900",
              revision: annualBefore.items[0]?.linea?.revision ?? 0,
              contextRevision: annualBefore.contextRevision,
              cambios: {
                presupuesto,
                periodo: "Mayo - Octubre",
                esencial: "Sí",
              },
            },
            annualPreview = previewAnnualPlan(db, 2026, annualProposal, now);
          confirmAnnualPlan(
            db,
            2026,
            {
              propuesta: annualProposal,
              fingerprint: annualPreview.fingerprint,
            },
            key(),
            now,
          );
        }
        let payroll = confirmPayroll(
          db,
          {
            accion: "guardar",
            contexto: getPayroll(db).contexto,
            motivo: "Fixture continuidad Nómina",
            paga: {
              mes: "2026-06",
              tipo: "Ordinaria",
              guardia: "No",
              devengo: "1200",
              base: "1200",
              irpf: "10",
              variable: "0",
              historico: "1000",
              documentado: "1000",
              evidencia: "Fixture salarial",
              evidenciaDocumentado: "Fixture documento",
              verificado: true,
              documentadoVerificado: true,
              nota: "Ficticio",
            },
          },
          key(),
          now,
        );
        // Production has no demo accounts: provision the fixture destination explicitly.
        const payrollDestination = createSaldo(
          db,
          {
            nombre: "Cuenta salarial ficticia",
            tipo: "Efectivo",
            control: "Movimientos",
          },
          key(),
          now,
        ).id;
        db.query(
          "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,concepto,nota,anulado,revision,creado,actualizado) VALUES('9001','2026-07-05','Ingreso',100000,'S000',?,'Nómina','Fixture salarial','',0,1,'fixture','fixture')",
        ).run(payrollDestination);
        payroll = confirmPayroll(
          db,
          {
            accion: "repartir",
            movimiento: "9001",
            asignaciones: [
              {
                paga: payroll.pagas[0].id,
                importe: "1000",
                evidencia: "Desglose restauración ficticio",
              },
            ],
            contexto: getPayroll(db).contexto,
            motivo: "Fixture asociación Nómina",
          },
          key(),
          now,
        );
        expect(payroll.pagas[0].cobrado).toBe("1000.00");
        expect(payroll.pagas[0].fechaCompleta).toBe("2026-07-05");
        expect(db.query("SELECT * FROM payroll_attempts").all()).toHaveLength(
          2,
        );
        const annualPlan = getAnnualPlan(db, 2026, now);
        expect(
          db.query("SELECT * FROM annual_plan_attempts").all(),
        ).toHaveLength(2);
        const plan = getCyclePlan(db, "1", now);
        expect(
          db.query("SELECT * FROM cycle_plan_attempts").all(),
        ).toHaveLength(2);
        const ageIdentity = join(state, "age-identity");
        expect(
          Bun.spawnSync(["age-keygen", "-o", ageIdentity], { stderr: "pipe" })
            .exitCode,
        ).toBe(0);
        const recipient = Bun.spawnSync(["age-keygen", "-y", ageIdentity], {
          stdout: "pipe",
          stderr: "pipe",
        })
          .stdout.toString()
          .trim();
        const backupPath = join(state, "backup");
        backup(db, secret, backupPath, recipient);
        const encrypted = Bun.spawnSync(
          [
            "age",
            "--decrypt",
            "-i",
            ageIdentity,
            join(backupPath, "database.age"),
          ],
          { stdout: "pipe", stderr: "pipe" },
        );
        expect(encrypted.exitCode).toBe(0);
        const manifest = JSON.parse(encrypted.stdout.toString()).manifest;
        expect(manifest.schema).toBe(12);
        expect(manifest.app).toBe("e2.5-v12");
        const target = join(state, "restored");
        if (origin === "production")
          Object.assign(process.env, {
            DATABASE_PATH: join(target, "database.sqlite"),
            AUTH_KEY_PATH: join(target, "key.bin"),
          });
        const restored = restore(backupPath, target, ageIdentity);
        Object.assign(process.env, {
          DATABASE_PATH: restored.database,
          AUTH_KEY_PATH: restored.key,
        });
        const copy = openDatabase(restored.database);
        try {
          expect(getCyclePlan(copy, "1", now)).toMatchObject({
            revision: plan.revision,
            items: plan.items,
            auditoria: plan.auditoria,
          });
          expect(
            copy.query("SELECT * FROM cycle_plan_attempts").all(),
          ).toHaveLength(0);
          expect(getAnnualPlan(copy, 2026, now)).toMatchObject({
            items: annualPlan.items,
            esencial: annualPlan.esencial,
            auditoria: annualPlan.auditoria,
          });
          expect(
            copy.query("SELECT * FROM annual_plan_attempts").all(),
          ).toHaveLength(0);
          expect(getPayroll(copy).pagas).toEqual(payroll.pagas);
          expect(getPayroll(copy).auditoria).toEqual(payroll.auditoria);
          expect(
            copy.query("SELECT * FROM payroll_attempts").all(),
          ).toHaveLength(0);
          expect(copy.query("SELECT * FROM sessions").all()).toHaveLength(0);
          expect(copy.query("PRAGMA foreign_key_check").all()).toEqual([]);
          expect(copy.query("PRAGMA integrity_check").get()).toEqual({
            integrity_check: "ok",
          });
        } finally {
          copy.close();
        }
      } finally {
        try {
          db.close();
        } catch {}
      }
    }
  } finally {
    for (const k of Object.keys(process.env))
      if (!(k in env)) delete process.env[k];
    Object.assign(process.env, env);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("P12 verified empty period is zero; open no-reference/future remain null without invented coverage", () => {
  const { db, b } = setup();
  try {
    db.run(
      "UPDATE presupuestos SET fuente='Gasto real',destino='S001' WHERE id=?",
      [b.id],
    );
    expect(getCyclePlan(db, "1", now).items[0]).toMatchObject({
      ejecutado: "0.00",
      sinPlanificar: false,
    });
    expect(getCyclePlan(db, "2", now).items[0]).toMatchObject({
      ejecutado: null,
      motivo: "Ciclo no iniciado",
      estado: null,
    });
    db.run(
      "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('3','2090-01-01',0,'fixture'),('4','2090-02-01',0,'fixture')",
    );
    expect(getCyclePlan(db, "3", now).items[0]).toMatchObject({
      ejecutado: null,
      motivo: "Ciclo no iniciado",
    });
    expect(
      getCyclePlan(db, "2", Date.parse("2026-11-15T12:00:00Z")).items[0]
        .ejecutado,
    ).toBe("0.00");
    db.run("INSERT INTO cycle_operation_guard VALUES(1)");
    db.run("UPDATE ciclos SET inicio='2026-09-01' WHERE id='4'");
    db.run("DELETE FROM cycle_operation_guard");
    // The remaining last cycle has no financial reference; no wall-clock fallback.
    expect(
      getCyclePlan(db, "3", Date.parse("2090-01-15T12:00:00Z")).items[0],
    ).toMatchObject({
      ejecutado: null,
      motivo: "Periodo/corte no verificable",
    });
  } finally {
    db.close();
  }
});

test("P13 real configuration consumers preview/confirm historical R3 and preserve movements; uncovered blocks", async () => {
  const { previewBudget, updateBudget } = await import("./presupuestos"),
    { previewClassification, updateClassification } = await import(
      "./clasificacion"
    );
  const { db, b } = setup();
  try {
    db.run(
      "UPDATE presupuestos SET fuente='Gasto real',destino='S001' WHERE id=?",
      [b.id],
    );
    db.run(
      "INSERT INTO categorias VALUES('CAT900','Fixture',NULL,'Gasto','Gasto',0,'Activa',1,'fixture','fixture')",
    );
    db.run(
      "INSERT INTO subcategorias VALUES('SUB900','Fixture','CAT900','Activa',1,'fixture','fixture')",
    );
    db.run(
      "INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,presupuesto) VALUES('PAR900','Fixture','SUB900','Activa',1,'fixture','fixture',?)",
      [b.id],
    );
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,concepto,nota,anulado,revision,creado,actualizado) VALUES('1','2026-10-01','Gasto',2500,'S001','S000','PAR900','Fixture','',0,1,'fixture','fixture')",
    );
    save(db, "1", [{ presupuesto: b.id, delMes: "100" }]);
    const original = db.query("SELECT * FROM movimientos").all();
    const body = { revision: 1, fuente: "No aplica", destino: null },
      p = previewBudget(db, b.id, body);
    expect(p.blocked).toBe(false);
    expect(p.execution!.ciclos[0].diferencias[0].antes.pendiente).toBe("75.00");
    expect(p.execution!.ciclos[0].diferencias[0].despues.pendiente).toBeNull();
    expect(() => updateBudget(db, b.id, body, now)).toThrow("Revisa");
    updateBudget(db, b.id, body, now, {
      fingerprint: p.fingerprint,
      motivo: "Cambio de fuente verificado",
    });
    expect(db.query("SELECT * FROM movimientos").all()).toEqual(original);
    const reverse = { revision: 2, fuente: "Gasto real", destino: "S001" },
      rp = previewBudget(db, b.id, reverse);
    updateBudget(db, b.id, reverse, now, {
      fingerprint: rp.fingerprint,
      motivo: "Restaurar fuente",
    });
    const cb = { revision: 1, presupuesto: null },
      cp = previewClassification(db, "partidas", "PAR900", cb);
    expect(cp.blocked).toBe(false);
    expect(cp.budgetExecution!.ciclos[0].diferencias[0].despues.ejecutado).toBe(
      "0.00",
    );
    updateClassification(db, "partidas", "PAR900", cb, undefined, now, {
      fingerprint: cp.fingerprint,
      motivo: "Desvincular con ejecución verificada",
    });
    expect(db.query("SELECT * FROM movimientos").all()).toEqual(original);
    db.run("UPDATE partidas SET presupuesto=? WHERE id='PAR900'", [b.id]);
    db.run("UPDATE movimientos SET fecha='2010-01-01'");
    expect(
      previewBudget(db, b.id, {
        revision: 3,
        fuente: "No aplica",
        destino: null,
      }).blocked,
    ).toBe(true);
    expect(
      previewClassification(db, "partidas", "PAR900", {
        revision: 2,
        presupuesto: null,
      }).blocked,
    ).toBe(true);
  } finally {
    db.close();
  }
});
