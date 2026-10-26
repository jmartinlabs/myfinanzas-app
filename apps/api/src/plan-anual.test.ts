import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { prepareSchema } from "./database-schema";
import { prepareV9 } from "../test-support/database-v9";
import { cyclePlanSchema } from "./cycle-plan-schema";
import { annualPlanSchema } from "./annual-plan-schema";
import {
  annualEquivalent,
  annualExecution,
  getAnnualPlan,
  previewAnnualPlan,
  confirmAnnualPlan,
  type AnnualSources,
  type AnnualHistory,
} from "./plan-anual";
import type { LedgerRow } from "./movement-ledger";
import { previewClassification, updateClassification } from "./clasificacion";
const now = Date.parse("2026-10-24T12:00:00Z");
function setup(path = ":memory:") {
  const db = new Database(path);
  prepareSchema(db, { origin: "demo", key_hash: null });
  db.exec(
    `INSERT INTO categorias VALUES('CAT900','Fixture',NULL,'Gasto','Gasto',0,'Activa',1,'f','f'); INSERT INTO subcategorias VALUES('SUB900','Fixture','CAT900','Activa',1,'f','f'); INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado) VALUES('PAR900','Seguro','SUB900','Activa',1,'f','f'),('PAR901','Reserva','SUB900','Activa',1,'f','f');`,
  );
  return db;
}
const sources = (): AnnualSources => ({
  revision: "fixture",
  control: { inicio: "2026-04-01", fin: "2026-06-30" },
  historico: [],
  historicoDisponible: true,
  protecciones: [],
  cierresDisponibles: true,
});
const historical = (p: Partial<AnnualHistory> = {}): AnnualHistory => ({
  partida: "PAR900",
  ejercicio: 2026,
  importeCentimos: "10000",
  fecha: "2026-03-10",
  intervalo: { inicio: "2026-01-01", fin: "2026-03-31" },
  procedencia: "Fixture aislada aprobada",
  verificado: true,
  representadoEnMovimientos: false,
  ...p,
});
const fact = (p: Partial<LedgerRow> = {}): LedgerRow => ({
  id: "1",
  fecha: "2026-06-15",
  tipo: "Gasto",
  capital: null,
  intereses: null,
  importe: "4000",
  origen: "S001",
  destino: "S000",
  partida: "PAR900",
  subtipo: null,
  concepto: "",
  nota: "",
  anulado: 0,
  revision: 1,
  creado: "f",
  actualizado: "f",
  ...p,
});
function prop(
  db: Database,
  year = 2026,
  changes: Record<string, unknown> = { presupuesto: "100", esencial: "Sí" },
  partida = "PAR900",
  provider?: () => AnnualSources,
) {
  const p = getAnnualPlan(db, year, now, provider);
  return {
    partida,
    revision:
      p.items.find((i) => i.partida.id === partida)?.linea?.revision ?? 0,
    contextRevision: p.contextRevision,
    cambios: changes,
  };
}
function save(
  db: Database,
  year = 2026,
  changes: Record<string, unknown> = { presupuesto: "100", esencial: "Sí" },
  partida = "PAR900",
  provider?: () => AnnualSources,
) {
  const p = prop(db, year, changes, partida, provider),
    v = previewAnnualPlan(db, year, p, now, provider);
  return confirmAnnualPlan(
    db,
    year,
    { propuesta: p, fingerprint: v.fingerprint, motivo: "Ensayo sintético" },
    randomUUID(),
    now,
    provider,
  );
}
test("AC01–07/16/18/21: stable year/Partida, explicit null/zero, partial PATCH and validation", () => {
  const db = setup();
  try {
    expect(getAnnualPlan(db, 2026, now).sinPlan).toBe(true);
    expect(getAnnualPlan(db, 2027, now).items).toHaveLength(0);
    let p = save(db, 2026, {
      presupuesto: null,
      periodo: "Mayo - Octubre",
      esencial: "Sí",
    });
    expect(p.items[0].linea).toMatchObject({
      presupuesto: null,
      periodo: "Mayo - Octubre",
    });
    expect(p.esencial.estado).toBe("Incompleto");
    p = save(db, 2026, { presupuesto: "0" });
    expect(p.items[0].linea).toMatchObject({
      presupuesto: "0.00",
      esencial: "Sí",
      periodo: "Mayo - Octubre",
    });
    expect(p.esencial.estado).toBe("Completo");
    save(db, 2025, {
      presupuesto: "120",
      periodo: "Julio - Agosto",
      esencial: "Pendiente",
    });
    db.run("UPDATE partidas SET nombre='Renombrada' WHERE id='PAR900'");
    expect(getAnnualPlan(db, 2026, now).items[0].partida.nombre).toBe(
      "Renombrada",
    );
    expect(getAnnualPlan(db, 2025, now).items[0].linea?.presupuesto).toBe(
      "120.00",
    );
    for (const change of [
      { presupuesto: "-1" },
      { presupuesto: 4 },
      { esencial: null },
      { ejecutado: "5" },
      { importeEsencial: "6" },
      { fechaEjecutada: "2026-01-01" },
      { periodo: "x".repeat(501) },
    ])
      expect(() =>
        previewAnnualPlan(db, 2026, prop(db, 2026, change), now),
      ).toThrow();
    expect(() =>
      previewAnnualPlan(
        db,
        2026,
        prop(db, 2026, { presupuesto: "1" }, "PAR901"),
        now,
      ),
    ).toThrow("Elige Esencial");
    db.run("UPDATE partidas SET estado='Inactiva' WHERE id='PAR900'");
    save(db, 2026, { periodo: null });
    expect(getAnnualPlan(db, 2026, now).items[0].partida.estado).toBe(
      "Inactiva",
    );
    expect(() => save(db, 2027, { esencial: "No" })).toThrow("activas");
    expect(db.query("SELECT * FROM annual_plan_lines").all()).toHaveLength(2);
  } finally {
    db.close();
  }
});
test("AC08–15/20/25–29: exact annual actual-date ledger, known subtotal, verified intervals/history and dates", () => {
  const s = sources();
  s.historico = [historical()];
  let r = annualExecution("PAR900", 2026, [fact()], s, now);
  expect(r).toMatchObject({
    ejecutado: "140.00",
    fechaEjecutada: "2026-06-15",
    subtotalRegistrado: "40.00",
  });
  s.historico = [historical({ fecha: "2026-03-30" })];
  r = annualExecution("PAR900", 2026, [fact({ fecha: "2026-04-01" })], s, now);
  expect(r.fechaEjecutada).toBe("2026-04-01");
  // The verified cutoff and control interval are separate: a valid later historical interval retains its date.
  const later = sources();
  later.control = { inicio: "2026-01-01", fin: "2026-03-31" };
  later.corte = "2026-06-30";
  later.historico = [
    historical({
      fecha: "2026-06-20",
      intervalo: { inicio: "2026-04-01", fin: "2026-06-30" },
    }),
  ];
  expect(
    annualExecution(
      "PAR900",
      2026,
      [fact({ fecha: "2026-03-10" })],
      later,
      now,
    ),
  ).toMatchObject({ ejecutado: "140.00", fechaEjecutada: "2026-06-20" });
  // The supplied verified cutoff governs the service; there is no silent wall-clock cutoff inside the current exercise.

  s.control = { inicio: "2026-01-01", fin: "2026-12-31" };
  s.historico = [];
  expect(
    annualExecution("PAR900", 2026, [fact({ fecha: "2026-12-31" })], s, now)
      .ejecutado,
  ).toBe("40.00");
  const rows = [
    fact({ fecha: "2026-12-31" }),
    fact({ tipo: "Ingreso" }),
    fact({ tipo: "Transferencia" }),
    fact({ tipo: "Amortización deuda" }),
    fact({ anulado: 1 }),
    fact({ partida: "PAR901" }),
    fact({ fecha: "2027-01-01" }),
  ];
  expect(
    annualExecution("PAR900", 2026, rows, s, Date.parse("2027-01-02T12:00:00Z"))
      .ejecutado,
  ).toBe("40.00");
  expect(annualExecution("PAR900", 2027, rows, s, now).ejecutado).toBeNull();
  const partial = sources();
  partial.historicoDisponible = false;
  expect(annualExecution("PAR900", 2026, [fact()], partial, now)).toMatchObject(
    {
      ejecutado: null,
      subtotalRegistrado: "40.00",
      fechaEjecutada: "2026-06-15",
    },
  );
  const noControl = { ...partial, control: null };
  expect(annualExecution("PAR900", 2026, [], noControl, now)).toMatchObject({
    ejecutado: null,
    subtotalRegistrado: "0.00",
    fechaEjecutada: null,
  });
  const full = sources();
  full.control = { inicio: "2026-01-01", fin: "2026-06-30" };
  expect(annualExecution("PAR900", 2026, [], full, now).ejecutado).toBe("0.00");
  full.historico = [historical()];
  expect(annualExecution("PAR900", 2026, [fact()], full, now)).toMatchObject({
    ejecutado: null,
    subtotalRegistrado: "40.00",
    historicoConocido: "0.00",
  });
  full.historico = [historical({ representadoEnMovimientos: true })];
  expect(annualExecution("PAR900", 2026, [fact()], full, now).ejecutado).toBe(
    "40.00",
  );
  const emptyDate = sources();
  emptyDate.historico = [historical({ fecha: null })];
  expect(annualExecution("PAR900", 2026, [], emptyDate, now)).toMatchObject({
    ejecutado: "100.00",
    fechaEjecutada: null,
  });
  emptyDate.historico = [historical({ fecha: "2025-12-01" })];
  expect(
    annualExecution("PAR900", 2026, [], emptyDate, now).ejecutado,
  ).toBeNull();
  const db = setup();
  try {
    const provider = () => ({
      ...sources(),
      control: { inicio: "2026-01-01", fin: "2026-06-30" },
    });
    let p = save(
      db,
      2026,
      { presupuesto: "100", esencial: "Sí" },
      "PAR900",
      provider,
    );
    expect(p.items[0].diferencia).toBe("100.00");
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,concepto,nota,anulado,revision,creado,actualizado) VALUES('1','2026-06-15','Gasto',12000,'S001','S000','PAR900','f','',0,1,'f','f')",
    );
    p = getAnnualPlan(db, 2026, now, provider);
    expect(p.items[0].diferencia).toBe("-20.00");
    p = save(db, 2026, { presupuesto: null }, "PAR900", provider);
    expect(p.items[0]).toMatchObject({ ejecutado: "120.00", diferencia: null });
    db.run(
      "UPDATE movimientos SET partida='PAR901',fecha='2025-12-31',importe=4000",
    );
    expect(getAnnualPlan(db, 2026, now, provider).items[0].ejecutado).toBe(
      "0.00",
    );
    expect(getAnnualPlan(db, 2025, now).sinLinea[0].subtotalRegistrado).toBe(
      "40.00",
    );
    db.run("UPDATE movimientos SET anulado=1");
    expect(getAnnualPlan(db, 2025, now).sinLinea).toHaveLength(0);
  } finally {
    db.close();
  }
});
test("AC16–19/30/31: sum first, rational cents/12, missing amounts separate from pending classifications; no global consumer fabricated", () => {
  const e = annualEquivalent([
    { presupuesto: "3", esencial: "Sí" },
    { presupuesto: "3", esencial: "Sí" },
    { presupuesto: "3", esencial: "No" },
    { presupuesto: "3", esencial: "Pendiente" },
  ]);
  expect(e.total).toEqual({ numeradorCentimos: "6", divisor: "12" });
  expect(e.clasificacionesPendientes).toBe(1);
  const p = annualEquivalent([
    { presupuesto: null, esencial: "Sí" },
    { presupuesto: null, esencial: "Sí" },
    { presupuesto: "0", esencial: "Sí" },
    { presupuesto: "200", esencial: "Pendiente" },
  ]);
  expect(p).toMatchObject({
    estado: "Incompleto",
    total: null,
    parcial: { numeradorCentimos: "0", divisor: "12" },
    importesSinInformar: 2,
    clasificacionesPendientes: 1,
  });
  expect(annualEquivalent([]).estado).toBe("Sin plan anual");
  const db = setup();
  try {
    db.run(
      "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2026-01-01',0,'f')",
    );
    db.run(
      "INSERT INTO presupuestos VALUES('PRE900','Fixture','No aplica',NULL,'Activo',1,'f','f')",
    );
    db.run("INSERT INTO cycle_plans VALUES('1',1)");
    db.run("INSERT INTO cycle_plan_lines VALUES('1','PRE900',100,200,300)");
    const before = db.query("SELECT * FROM cycle_plan_lines").all();
    save(db);
    expect(db.query("SELECT * FROM cycle_plan_lines").all()).toEqual(before);
  } finally {
    db.close();
  }
});
test("AC01/22/32–34: idempotence, atomic conflict, past reason, context/catalog/protection revalidation and immutable audit", () => {
  const db = setup();
  try {
    const p = prop(db),
      v = previewAnnualPlan(db, 2026, p, now),
      body = { propuesta: p, fingerprint: v.fingerprint },
      key = randomUUID();
    const first = confirmAnnualPlan(db, 2026, body, key, now);
    expect(confirmAnnualPlan(db, 2026, body, key, now)).toEqual(first);
    expect(db.query("SELECT * FROM annual_plan_audit").all()).toHaveLength(1);
    expect(() => confirmAnnualPlan(db, 2026, body, randomUUID(), now)).toThrow(
      "contexto",
    );
    expect(() =>
      confirmAnnualPlan(db, 2026, { ...body, motivo: "other" }, key, now),
    ).toThrow("Clave utilizada");
    const past = prop(db, 2025),
      pv = previewAnnualPlan(db, 2025, past, now);
    expect(pv.requiereMotivo).toBe(true);
    expect(() =>
      confirmAnnualPlan(
        db,
        2025,
        { propuesta: past, fingerprint: pv.fingerprint },
        randomUUID(),
        now,
      ),
    ).toThrow("Motivo");
    expect(getAnnualPlan(db, 2025, now).items).toHaveLength(0);
    const source = sources(),
      provider = () => source;
    const pp = prop(db, 2026, { periodo: "Borrador" }, "PAR900", provider),
      ppv = previewAnnualPlan(db, 2026, pp, now, provider);
    source.protecciones.push({
      id: "foto-ciclo-1",
      ejercicio: 2026,
      partida: "PAR900",
      verificada: false,
      motivo: "Fotografía de ciclo vinculada no verificable",
    });
    expect(() =>
      confirmAnnualPlan(
        db,
        2026,
        { propuesta: pp, fingerprint: ppv.fingerprint },
        randomUUID(),
        now,
        provider,
      ),
    ).toThrow("contexto");
    const fresh = prop(db, 2026, { periodo: "Borrador" }, "PAR900", provider),
      fp = previewAnnualPlan(db, 2026, fresh, now, provider);
    expect(fp.bloqueado).toBe(true);
    expect(() =>
      confirmAnnualPlan(
        db,
        2026,
        { propuesta: fresh, fingerprint: fp.fingerprint },
        randomUUID(),
        now,
        provider,
      ),
    ).toThrow("Fotografía");
    expect(getAnnualPlan(db, 2026, now).items[0].linea?.periodo).toBeNull();
    expect(db.query("SELECT * FROM annual_plan_audit").all()).toHaveLength(1);
    expect(() => db.run("UPDATE annual_plan_audit SET motivo='x'")).toThrow(
      "append only",
    );
    expect(() => db.run("DELETE FROM annual_plan_lines")).toThrow("no delete");
    const pending = prop(
        db,
        2026,
        { presupuesto: "1", esencial: "No" },
        "PAR901",
      ),
      pendingPreview = previewAnnualPlan(db, 2026, pending, now);
    db.run("UPDATE partidas SET estado='Inactiva' WHERE id='PAR901'");
    expect(() =>
      confirmAnnualPlan(
        db,
        2026,
        { propuesta: pending, fingerprint: pendingPreview.fingerprint },
        randomUUID(),
        now,
      ),
    ).toThrow("contexto");
  } finally {
    db.close();
  }
});
test("v10→v11 continuity preserves financial/auth data, migration rollback and annual classification relations", () => {
  const db = new Database(":memory:");
  try {
    prepareV9(db, { origin: "demo", key_hash: null });
    cyclePlanSchema(db);
    db.run("INSERT INTO sessions VALUES('hash','csrf',1,2)");
    const rows = db.query("SELECT * FROM saldos").all();
    prepareSchema(db, { origin: "demo", key_hash: null });
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 15,
    });
    expect(db.query("SELECT * FROM saldos").all()).toEqual(rows);
    expect(db.query("SELECT * FROM sessions").all()).toHaveLength(1);
  } finally {
    db.close();
  }
  const broken = new Database(":memory:");
  try {
    prepareV9(broken, { origin: "demo", key_hash: null });
    cyclePlanSchema(broken);
    broken.exec("CREATE TABLE annual_plan_attempts(x TEXT)");
    expect(() =>
      broken.transaction(() => annualPlanSchema(broken)).immediate(),
    ).toThrow();
    expect(broken.query("SELECT version FROM schema_version").get()).toEqual({
      version: 10,
    });
    expect(
      broken
        .query("SELECT name FROM sqlite_master WHERE name='annual_plan_lines'")
        .get(),
    ).toBeNull();
  } finally {
    broken.close();
  }
  const live = setup();
  try {
    save(live);
    const change = { revision: 1, padre: "SUB900" };
    const preview = previewClassification(live, "partidas", "PAR900", change);
    expect(preview.annualPlans).toHaveLength(1);
    expect(preview.used).toBe(true);
  } finally {
    live.close();
  }
});

test("AC01 two real processes compete for the same Partida/year; one atomic write and audit", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-annual-race-"));
  try {
    const path = join(dir, "race.sqlite"),
      db = setup(path);
    try {
      const p = prop(db),
        review = previewAnnualPlan(db, 2026, p, now),
        body = { propuesta: p, fingerprint: review.fingerprint };
      const input = join(dir, "proposal.json");
      writeFileSync(input, JSON.stringify(body), { mode: 0o600 });
      const workers = [1, 2].map(() =>
        Bun.spawn(
          [
            process.execPath,
            "apps/api/test-support/annual-race-worker.ts",
            path,
            input,
            String(now),
          ],
          {
            stdout: "pipe",
            stderr: "pipe",
            env: { ...process.env, NODE_ENV: "test" },
          },
        ),
      );
      const results = await Promise.all(
        workers.map(async (w) => ({
          exit: await w.exited,
          out: await new Response(w.stdout).text(),
          err: await new Response(w.stderr).text(),
        })),
      );
      expect(results.every((r) => r.exit === 0 && r.err === "")).toBe(true);
      expect(results.map((r) => r.out.trim()).sort()).toEqual([
        "CONTEXT_CHANGED",
        "SAVED",
      ]);
      expect(db.query("SELECT * FROM annual_plan_lines").all()).toHaveLength(1);
      expect(db.query("SELECT * FROM annual_plan_audit").all()).toHaveLength(1);
      expect(db.query("SELECT * FROM annual_plan_attempts").all()).toHaveLength(
        1,
      );
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("aggregate execution exceeds int64 while each fact remains valid; difference uses bigint without money input bounds", () => {
  const db = setup();
  try {
    const provider = () => ({
      ...sources(),
      control: { inicio: "2026-01-01", fin: "2026-06-30" },
    });
    save(db, 2026, { presupuesto: "0", esencial: "No" }, "PAR900", provider);
    for (const id of ["1", "2"])
      db.run(
        "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,concepto,nota,anulado,revision,creado,actualizado) VALUES(?,'2026-06-15','Gasto',9223372036854775807,'S001','S000','PAR900','f','',0,1,'f','f')",
        [id],
      );
    expect(getAnnualPlan(db, 2026, now, provider).items[0]).toMatchObject({
      ejecutado: "184467440737095516.14",
      diferencia: "-184467440737095516.14",
    });
  } finally {
    db.close();
  }
});

test("annual Effect HTTP endpoints require MFA/Origin/CSRF and reject derived fields without disclosing SQL", async () => {
  const { HttpApp } = await import("@effect/platform"),
    { createApp } = await import("./app"),
    { Auth, provision, totp } = await import("./auth"),
    { randomBytes } = await import("node:crypto");
  const db = setup(),
    key = randomBytes(32),
    handler = HttpApp.toWebHandler(createApp(db, { key })),
    origin = "http://127.0.0.1:5173";
  const request = (
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    handler(
      new Request(origin + path, {
        method,
        headers: { origin, "content-type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  try {
    expect((await request("/api/plan-anual/2026")).status).toBe(401);
    const auth = new Auth(db, key),
      enroll = await auth.enroll(
        provision(db),
        "Clave HTTP anual ficticia " + randomUUID(),
      ),
      verified = auth.verify(
        new Request(origin, {
          headers: { cookie: auth.challengeName + "=" + enroll.challenge },
        }),
        totp(enroll.secret!).generate(),
      ),
      headers = {
        cookie: auth.cookieName + "=" + verified.session,
        "x-csrf-token": verified.csrf,
      };
    expect(
      (
        await request(
          "/api/plan-anual/2026/impacto",
          "POST",
          {},
          { cookie: headers.cookie },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          "/api/plan-anual/2026/impacto",
          "POST",
          {},
          { ...headers, origin: "https://invalid.example" },
        )
      ).status,
    ).toBe(403);
    const response = await request(
      "/api/plan-anual/2026",
      "GET",
      undefined,
      headers,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const data = (await response.json()) as ReturnType<typeof getAnnualPlan>;
    const p = {
      partida: "PAR900",
      revision: 0,
      contextRevision: data.contextRevision,
      cambios: { presupuesto: "0", esencial: "Sí", periodo: "Mayo - Octubre" },
    };
    const rejected = await request(
      "/api/plan-anual/2026/impacto",
      "POST",
      { ...p, cambios: { ejecutado: "25" } },
      headers,
    );
    expect(rejected.status).toBe(422);
    expect(await rejected.text()).not.toContain("SELECT");
    const preview = await request(
      "/api/plan-anual/2026/impacto",
      "POST",
      p,
      headers,
    );
    expect(preview.status).toBe(200);
    const review = (await preview.json()) as { fingerprint: string };
    const written = await request(
      "/api/plan-anual/2026/confirmar",
      "POST",
      { propuesta: p, fingerprint: review.fingerprint },
      { ...headers, "idempotency-key": randomUUID() },
    );
    expect(written.status).toBe(200);
    expect(
      ((await written.json()) as ReturnType<typeof getAnnualPlan>).items[0]
        .linea?.presupuesto,
    ).toBe("0.00");
    expect(
      (await request("/api/plan-anual/2026", "DELETE", undefined, headers))
        .status,
    ).toBe(404);
  } finally {
    db.close();
  }
});

test("QA10 P2 preview includes exact derived/equivalent before/after and only cycles intersecting the exercise", () => {
  const db = setup();
  try {
    db.run(
      "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2025-01-01',0,'f'),('2','2026-01-01',0,'f'),('3','2027-01-01',0,'f')",
    );
    const provider = () => ({
      ...sources(),
      control: { inicio: "2026-01-01", fin: "2026-06-30" },
    });
    save(db, 2026, { presupuesto: "100", esencial: "Sí" }, "PAR900", provider);
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,concepto,nota,anulado,revision,creado,actualizado) VALUES('1','2026-06-15','Gasto',12000,'S001','S000','PAR900','f','',0,1,'f','f')",
    );
    const preview = previewAnnualPlan(
      db,
      2026,
      prop(db, 2026, { presupuesto: "200" }, "PAR900", provider),
      now,
      provider,
    );
    expect(preview.derivadosAntes).toMatchObject({
      ejecutado: "120.00",
      diferencia: "-20.00",
      fechaEjecutada: "2026-06-15",
      cobertura: "Verificable al corte",
      motivo: null,
    });
    expect(preview.derivadosDespues).toMatchObject({
      ejecutado: "120.00",
      diferencia: "80.00",
      fechaEjecutada: "2026-06-15",
    });
    expect(preview.equivalenteAntes.total).toEqual({
      numeradorCentimos: "10000",
      divisor: "12",
    });
    expect(preview.equivalenteDespues.total).toEqual({
      numeradorCentimos: "20000",
      divisor: "12",
    });
    expect(preview.relaciones.ciclos.map((c) => c.id)).toEqual(["2"]);
    const partial = previewAnnualPlan(
      db,
      2026,
      prop(db, 2026, { presupuesto: null }),
      now,
    );
    expect(partial.derivadosAntes).toMatchObject({
      ejecutado: null,
      diferencia: null,
      fechaEjecutada: "2026-06-15",
      cobertura: "Parcial",
    });
    expect(partial.derivadosAntes.motivo).toContain("no verificable");
    expect(partial.derivadosDespues.motivoDiferencia).toBe(
      "Presupuesto sin informar",
    );
  } finally {
    db.close();
  }
});
