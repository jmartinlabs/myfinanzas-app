import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { prepareSchema } from "./database-schema";
import {
  getPayroll,
  confirmPayroll,
  payrollForecast,
  previewPayroll,
} from "./nomina";
import { D } from "./payroll-decimal";
const now = Date.parse("2026-10-24T12:00:00Z");
function setup() {
  const db = new Database(":memory:");
  prepareSchema(db, { origin: "demo", key_hash: null });
  return db;
}
const pay = (p: Record<string, unknown> = {}) => ({
  mes: "2026-06",
  tipo: "Ordinaria",
  guardia: "No",
  devengo: "1200",
  base: "1200",
  irpf: "10",
  variable: "0",
  historico: "1000",
  documentado: null,
  evidencia: "fixture-salarial",
  evidenciaDocumentado: "",
  verificado: true,
  documentadoVerificado: false,
  nota: "Ficticio",
  ...p,
});
function change(
  db: Database,
  b: Record<string, unknown>,
  key = crypto.randomUUID(),
) {
  return confirmPayroll(
    db,
    { ...b, contexto: getPayroll(db).contexto, motivo: "Fixture revisada" },
    key,
    now,
  );
}
function create(db: Database, p = {}) {
  const ids = getPayroll(db).pagas.map((p) => p.id);
  return change(db, { accion: "guardar", paga: pay(p) }).pagas.find(
    (p: any) => !ids.includes(p.id),
  )!;
}
function movement(
  db: Database,
  id = "101",
  amount = "150000",
  subtype = "Nómina",
) {
  db.query(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,concepto,nota,anulado,revision,creado,actualizado) VALUES(?,'2026-07-05','Ingreso',?,'S000','S001',?,'fixture','',0,1,'f','f')",
  ).run(id, amount, subtype);
}
test("P1 originales independientes, duplicados de Mes/Tipo, ceros y auditoría", () => {
  const db = setup();
  const a = create(db, {
    historico: "0",
    documentado: "0",
    evidenciaDocumentado: "doc",
    documentadoVerificado: true,
  });
  create(db);
  expect(getPayroll(db).pagas).toHaveLength(2);
  expect(a.neto).toBe("0.00");
  expect(a.origenNeto).toBe("Histórico");
  expect(a.fechaCompleta).toBeNull();
  expect(getPayroll(db).auditoria).toHaveLength(2);
  db.close();
});
test("P2 N:M global, dos pagas, remanente, mezcla, no ledger duplicado", () => {
  const db = setup();
  const a = create(db),
    b = create(db, { tipo: "Bonus", mes: "2026-05" });
  movement(db);
  const r = change(db, {
    accion: "repartir",
    movimiento: "101",
    asignaciones: [
      { paga: a.id, importe: "1000", evidencia: "desglose" },
      { paga: b.id, importe: "500", evidencia: "mixto" },
    ],
  });
  expect(r.movimientos[0].remanente).toBe("0.00");
  expect(r.pagas.find((p: any) => p.id === b.id).estructural).toBeNull();
  expect(db.query("SELECT count(*) n FROM movimientos").get()).toEqual({
    n: 1,
  });
  expect(() =>
    change(db, {
      accion: "repartir",
      movimiento: "101",
      asignaciones: [
        { paga: a.id, importe: "1500", evidencia: "x" },
        { paga: b.id, importe: "0.01", evidencia: "x" },
      ],
    }),
  ).toThrow("global");
  db.close();
});
test("P3 parcial bancario no es referencia fiscal ni documento, fechas reales", () => {
  const db = setup();
  const a = create(db, { historico: null });
  movement(db, "101", "100000");
  const r = change(db, {
      accion: "repartir",
      movimiento: "101",
      asignaciones: [{ paga: a.id, importe: "600", evidencia: "parcial" }],
    }),
    p = r.pagas[0];
  expect(p.cobrado).toBe("600.00");
  expect(p.neto).toBe("600.00");
  expect(p.documentado).toBeNull();
  expect(p.diferencia).toBeNull();
  expect(p.fechaCompleta).toBeNull();
  expect(p.primeraFecha).toBe("2026-07-05");
  expect(p.mes).toBe("2026-06");
  expect(r.movimientos[0].remanente).toBe("400.00");
  expect(
    payrollForecast(db, { variable: "0", ajuste: "0" }, now).disponible,
  ).toBe(false);
  db.close();
});
test("P4 revisión banco invalida links y contexto; revalidación explícita", () => {
  const db = setup();
  const a = create(db);
  movement(db);
  change(db, {
    accion: "repartir",
    movimiento: "101",
    asignaciones: [{ paga: a.id, importe: "1000", evidencia: "x" }],
  });
  const context = getPayroll(db).contexto;
  db.exec("UPDATE movimientos SET importe=50000,revision=2 WHERE id='101'");
  expect(getPayroll(db).pagas[0].cobrado).toBe("0.00");
  expect(getPayroll(db).movimientos[0].requiereRevision).toBe(true);
  expect(() =>
    confirmPayroll(
      db,
      {
        accion: "repartir",
        contexto: context,
        motivo: "x",
        movimiento: "101",
        asignaciones: [],
      },
      crypto.randomUUID(),
      now,
    ),
  ).toThrow("contexto");
  db.close();
});
test("P5 discrepancia, resolución y modificación original revoca selección", () => {
  const db = setup();
  let p = create(db, {
    documentado: "900",
    evidenciaDocumentado: "doc",
    documentadoVerificado: true,
  });
  expect(p.diferencia).toBeNull();
  expect(p.motivo).toBe("Discrepancia documental");
  p = change(db, {
    accion: "resolver",
    id: p.id,
    fuente: "Documentado",
    evidencia: "revisión ambas fuentes",
  }).pagas[0];
  expect(p.referencia).toBe("900.00");
  p = change(db, {
    accion: "guardar",
    id: p.id,
    paga: pay({
      documentado: "800",
      evidenciaDocumentado: "doc2",
      documentadoVerificado: true,
    }),
  }).pagas[0];
  expect(p.referencia).toBeNull();
  expect(p.historico).toBe("1000");
  db.close();
});
test("P6 fórmulas exactas, tasa cero y signos escenarios independientes", () => {
  const db = setup();
  create(db, { irpf: "0", devengo: "1200", base: "1200", historico: "1000" });
  const r = payrollForecast(db, { variable: "0", ajuste: "1" }, now);
  expect(r.base?.neto).toBe("988.00");
  expect(r.prudente?.neto).toBe("996.76");
  expect(r.diferencia).toBe("8.76");
  expect(() =>
    payrollForecast(db, { variable: "-1", ajuste: "0" }, now),
  ).toThrow("no negativa");
  db.close();
});
test("P7 precisión decimal, medio céntimo y sin resta de visuales", () => {
  expect(D("1.005").money()).toBe("1.01");
  expect(D("-1.005").money()).toBe("-1.01");
  expect(D("100.0001").mul(D("0.123456789")).exact()).toBe("12.3456912456789");
  expect(D("1.004").sub(D("0.995")).money()).toBe("0.01");
});
test("P8 preview no persiste y doble envío idempotente; contexto obsoleto", () => {
  const db = setup();
  const payload = { accion: "guardar", paga: pay(), motivo: "revisión" };
  const preview = previewPayroll(db, payload);
  expect(getPayroll(db).pagas).toHaveLength(0);
  const body = { ...payload, contexto: preview.contexto },
    key = crypto.randomUUID();
  const a = confirmPayroll(db, body, key, now);
  expect(confirmPayroll(db, body, key, now)).toEqual(a);
  expect(getPayroll(db).pagas).toHaveLength(1);
  expect(getPayroll(db).auditoria).toHaveLength(1);
  expect(() => confirmPayroll(db, body, crypto.randomUUID(), now)).toThrow(
    "contexto",
  );
  db.close();
});
test("P9 varios abonos, conciliación completa/exceso, anulación y exclusión", () => {
  const db = setup();
  const p = create(db);
  movement(db, "101", "60000");
  movement(db, "102", "40000");
  movement(db, "103", "1000", "Intereses");
  for (const [id, importe] of [
    ["101", "600"],
    ["102", "400"],
  ])
    change(db, {
      accion: "repartir",
      movimiento: id,
      asignaciones: [{ paga: p.id, importe, evidencia: "documento" }],
    });
  let detail = getPayroll(db).pagas[0];
  expect(detail.numeroIngresos).toBe(2);
  expect(detail.fechaCompleta).toBe("2026-07-05");
  expect(detail.diferencia).toBe("0.00");
  expect(getPayroll(db).movimientos).toHaveLength(2);
  db.exec("UPDATE movimientos SET anulado=1,revision=2 WHERE id='102'");
  detail = getPayroll(db).pagas[0];
  expect(detail.cobrado).toBe("600.00");
  expect(detail.fechaCompleta).toBeNull();
  expect(detail.diferencia).toBeNull();
  db.close();
});
test("P10 forecast empate, futura incompleta, guardia y escenarios inválidos separados", () => {
  const db = setup();
  const p = create(db, {
    irpf: "99.9",
    guardia: "Sí",
    variable: "100",
    historico: "-50",
  });
  expect(p.estructural).toBe("-50.10");
  let r = payrollForecast(db, { variable: "0", ajuste: "-1" }, now);
  expect(r.base?.disponible).toBe(true);
  expect(r.prudente?.disponible).toBe(false);
  create(db, { irpf: "0" });
  r = payrollForecast(db, { variable: "0", ajuste: "0" }, now);
  expect(r.disponible).toBe(false);
  expect(() =>
    payrollForecast(db, { variable: "0", ajuste: "0", id: p.id }, now),
  ).toThrow("Evidencia");
  expect(
    payrollForecast(
      db,
      { variable: "0", ajuste: "0", id: p.id, evidencia: "selección" },
      now,
    ).disponible,
  ).toBe(true);
  create(db, { mes: "2027-01" });
  expect(
    payrollForecast(db, { variable: "0", ajuste: "0" }, now).disponible,
  ).toBe(false);
  db.close();
});
test("P11 genuine v11 migration preserves all original rows and rollback", async () => {
  const { prepareV11 } = await import("../test-support/database-v11");
  const db = new Database(":memory:");
  prepareV11(db);
  expect(db.query("SELECT version FROM schema_version").get()).toEqual({
    version: 11,
  });
  const before = db.query("SELECT * FROM saldos ORDER BY id").all();
  prepareSchema(db, { origin: "demo", key_hash: null });
  expect(db.query("SELECT version FROM schema_version").get()).toEqual({
    version: 19,
  });
  expect(db.query("SELECT * FROM saldos ORDER BY id").all()).toEqual(before);
  expect(getPayroll(db).pagas).toHaveLength(0);
  expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
  db.close();
});
test("P12 two real processes reserve one global remanent atomically", async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs"),
    { tmpdir } = await import("node:os"),
    { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "mf-payroll-race-"));
  const path = join(dir, "db.sqlite"),
    db = new Database(path);
  try {
    prepareSchema(db, { origin: "demo", key_hash: null });
    const p = create(db);
    movement(db, "101", "100000");
    const input = join(dir, "proposal.json");
    writeFileSync(
      input,
      JSON.stringify({
        accion: "repartir",
        movimiento: "101",
        asignaciones: [{ paga: p.id, importe: "700", evidencia: "fixture" }],
        motivo: "Reparto revisado",
        contexto: getPayroll(db).contexto,
      }),
      { mode: 0o600 },
    );
    const workers = [1, 2].map(() =>
      Bun.spawn(
        [
          process.execPath,
          "apps/api/test-support/payroll-race-worker.ts",
          path,
          input,
          String(now),
        ],
        {
          env: { ...process.env, NODE_ENV: "test" },
          stdout: "pipe",
          stderr: "pipe",
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
    expect(results.map((r) => r.out).sort()).toEqual(["CONFLICT", "SAVED"]);
    expect(getPayroll(db).movimientos[0].totalAsignado).toBe("700.00");
    expect(getPayroll(db).movimientos[0].remanente).toBe("300.00");
    expect(db.query("SELECT * FROM payroll_allocations").all()).toHaveLength(1);
    expect(getPayroll(db).auditoria).toHaveLength(2);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("P13 authenticated Effect HTTP: MFA, Origin, CSRF, exact DTO and validation", async () => {
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
    expect((await request("/api/nomina")).status).toBe(401);
    const auth = new Auth(db, key),
      enroll = await auth.enroll(
        provision(db),
        "Clave HTTP Nómina ficticia " + crypto.randomUUID(),
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
          "/api/nomina/impacto",
          "POST",
          {},
          { cookie: headers.cookie },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          "/api/nomina/impacto",
          "POST",
          {},
          { ...headers, origin: "https://invalid.example" },
        )
      ).status,
    ).toBe(403);
    const response = await request("/api/nomina", "GET", undefined, headers);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const bad = await request(
      "/api/nomina/impacto",
      "POST",
      {
        accion: "guardar",
        motivo: "fixture",
        paga: { ...pay(), cobrado: "1000" },
      },
      headers,
    );
    expect(bad.status).toBe(422);
    expect(await bad.text()).not.toContain("SELECT");
    const body = { accion: "guardar", paga: pay(), motivo: "fixture" },
      preview = await request("/api/nomina/impacto", "POST", body, headers);
    expect(preview.status).toBe(200);
    const review = (await preview.json()) as { contexto: string };
    const written = await request(
      "/api/nomina/confirmar",
      "POST",
      { ...body, contexto: review.contexto },
      { ...headers, "idempotency-key": crypto.randomUUID() },
    );
    expect(written.status).toBe(200);
    expect(((await written.json()) as any).pagas[0].historico).toBe("1000");
    expect(
      (await request("/api/nomina", "DELETE", undefined, headers)).status,
    ).toBe(404);
  } finally {
    db.close();
  }
});
test("P14 migration rollback, preservation of auth/audit, immutable originals and delta audit", async () => {
  const { prepareV11 } = await import("../test-support/database-v11"),
    { payrollSchema } = await import("./payroll-schema");
  const db = new Database(":memory:");
  prepareV11(db);
  db.run("INSERT INTO sessions VALUES('hash','csrf',1,2)");
  const auth = db.query("SELECT * FROM sessions").all();
  prepareSchema(db, { origin: "demo", key_hash: null });
  expect(db.query("SELECT * FROM sessions").all()).toEqual(auth);
  const p = create(db);
  change(db, {
    accion: "guardar",
    id: p.id,
    paga: pay({
      documentado: "1000",
      evidenciaDocumentado: "doc",
      documentadoVerificado: true,
    }),
  });
  const audit = JSON.parse((getPayroll(db).auditoria[0] as any).delta);
  expect(audit.campos[0].campos.historico).toBeUndefined();
  expect(audit.campos[0].campos.documentado).toEqual({
    antes: null,
    despues: "1000",
  });
  expect(() => db.exec("DELETE FROM payroll_audit")).toThrow("append only");
  expect(() => db.exec("DELETE FROM payroll")).toThrow("no delete");
  db.close();
  const broken = new Database(":memory:");
  prepareV11(broken);
  broken.exec("CREATE TABLE payroll_attempts(x TEXT)");
  expect(() =>
    broken.transaction(() => payrollSchema(broken)).immediate(),
  ).toThrow();
  expect(broken.query("SELECT version FROM schema_version").get()).toEqual({
    version: 11,
  });
  expect(
    broken.query("SELECT name FROM sqlite_master WHERE name='payroll'").get(),
  ).toBeNull();
  broken.close();
});
test("P15 zero complete fiscal source, no inferred link, excess and explicit cutoff", () => {
  const db = setup();
  const p = create(db, { base: "0", devengo: "0", irpf: "0", historico: "0" });
  movement(db, "101", "1000");
  expect(getPayroll(db).pagas[0].numeroIngresos).toBe(0);
  expect(getPayroll(db).pagas[0].fechaCompleta).toBeNull();
  expect(
    payrollForecast(db, { variable: "0", ajuste: "0", corte: "2026-06" }, now)
      .base?.neto,
  ).toBe("0.00");
  expect(
    payrollForecast(db, { variable: "0", ajuste: "0", corte: "2026-05" }, now)
      .disponible,
  ).toBe(false);
  const r = change(db, {
    accion: "repartir",
    movimiento: "101",
    asignaciones: [{ paga: p.id, importe: "10", evidencia: "fixture" }],
  });
  expect(r.pagas[0].historico).toBe("0");
  expect(r.pagas[0].diferencia).toBe("-10.00");
  expect(r.pagas[0].neto).toBe("0.00");
  expect(r.pagas[0].fechaCompleta).toBeNull();
  expect(() =>
    payrollForecast(db, { variable: "0", ajuste: "0", contexto: "stale" }, now),
  ).toThrow("contexto");
  db.close();
});
test("P16 allocation ABA cannot revive stale context revision", () => {
  const db = setup(),
    p = create(db);
  movement(db, "101", "100000");
  const initial = getPayroll(db).contexto;
  change(db, {
    accion: "repartir",
    movimiento: "101",
    asignaciones: [{ paga: p.id, importe: "100", evidencia: "fixture" }],
  });
  change(db, { accion: "repartir", movimiento: "101", asignaciones: [] });
  expect(getPayroll(db).contexto).not.toBe(initial);
  expect(() =>
    confirmPayroll(
      db,
      {
        accion: "repartir",
        movimiento: "101",
        asignaciones: [],
        contexto: initial,
        motivo: "Obsoleto",
      },
      crypto.randomUUID(),
      now,
    ),
  ).toThrow("contexto");
  db.close();
});

test("P17 AC16/21/35/36 mixed payroll allocation keeps each fact once in its real cycle", async () => {
  const { listMovements } = await import("./movimientos");
  const { cycleForDate } = await import("./ciclos");
  const db = setup();
  try {
    db.exec(
      "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2026-06-01',0,'fixture'),('2','2026-07-01',0,'fixture'),('3','2026-08-01',0,'fixture')",
    );
    const ordinary = create(db, {
      mes: "2026-06",
      historico: "1000",
      documentado: "1000",
      evidenciaDocumentado: "documento ordinaria",
      documentadoVerificado: true,
    });
    const bonus = create(db, {
      mes: "2026-05",
      tipo: "Bonus",
      historico: "400",
      documentado: "400",
      evidenciaDocumentado: "documento bonus",
      documentadoVerificado: true,
    });
    movement(db, "101", "100000", "Nómina");
    movement(db, "102", "40000", "Nómina");
    db.exec("UPDATE movimientos SET fecha='2026-08-10' WHERE id='102'");
    const ledgerBefore = db
      .query("SELECT * FROM movimientos ORDER BY id")
      .all();
    change(db, {
      accion: "repartir",
      movimiento: "101",
      asignaciones: [
        {
          paga: ordinary.id,
          importe: "600",
          evidencia: "desglose mixto Ordinaria junio",
        },
        {
          paga: bonus.id,
          importe: "400",
          evidencia: "desglose mixto Bonus mayo",
        },
      ],
    });
    change(db, {
      accion: "repartir",
      movimiento: "102",
      asignaciones: [
        {
          paga: ordinary.id,
          importe: "400",
          evidencia: "segundo abono agosto",
        },
      ],
    });
    const data = getPayroll(db),
      p = data.pagas.find((p) => p.id === ordinary.id)!,
      b = data.pagas.find((p) => p.id === bonus.id)!;
    expect(p).toMatchObject({
      mes: "2026-06",
      historico: "1000",
      documentado: "1000",
      cobrado: "1000.00",
      numeroIngresos: 2,
      primeraFecha: "2026-07-05",
      ultimaFecha: "2026-08-10",
      fechaCompleta: "2026-08-10",
      diferencia: "0.00",
    });
    expect(b).toMatchObject({
      mes: "2026-05",
      tipo: "Bonus",
      historico: "400",
      documentado: "400",
      cobrado: "400.00",
      numeroIngresos: 1,
      fechaCompleta: "2026-07-05",
    });
    expect(p.asignaciones.map((a) => a.evidencia)).toContain(
      "desglose mixto Ordinaria junio",
    );
    expect(b.asignaciones[0].evidencia).toBe("desglose mixto Bonus mayo");
    expect(
      data.movimientos.find((m) => m.id === "101")?.asignaciones,
    ).toHaveLength(2);
    expect(data.movimientos.find((m) => m.id === "101")?.subtipo).toBe(
      "Nómina",
    );
    expect(db.query("SELECT * FROM movimientos ORDER BY id").all()).toEqual(
      ledgerBefore,
    );
    expect(cycleForDate(db, p.primeraFecha!)?.id).toBe("2");
    expect(cycleForDate(db, p.ultimaFecha!)?.id).toBe("3");
    const june = listMovements(
      db,
      new URLSearchParams({ ciclo: "1", tipo: "Ingreso" }),
    );
    const july = listMovements(
      db,
      new URLSearchParams({ ciclo: "2", tipo: "Ingreso" }),
    );
    const august = listMovements(
      db,
      new URLSearchParams({ ciclo: "3", tipo: "Ingreso" }),
    );
    expect(june.total).toBe(0);
    expect(july.total).toBe(1);
    expect(
      july.movimientos.map((m) => ({
        id: m.id,
        importe: m.importe,
        ciclo: m.ciclo?.id,
      })),
    ).toEqual([{ id: "101", importe: "1000.00", ciclo: "2" }]);
    expect(august.total).toBe(1);
    expect(
      august.movimientos.map((m) => ({
        id: m.id,
        importe: m.importe,
        ciclo: m.ciclo?.id,
      })),
    ).toEqual([{ id: "102", importe: "400.00", ciclo: "3" }]);
    expect(
      [...july.movimientos, ...august.movimientos]
        .reduce((sum, m) => sum.add(D(m.importe!)), D("0"))
        .money(),
    ).toBe("1400.00");
  } finally {
    db.close();
  }
});

test("P18 AC04/06 Guardia formulas, absence branch and partial net propagation", () => {
  const db = setup();
  try {
    const complete = {
      devengo: "2000",
      base: "1800",
      irpf: "15",
      variable: "200",
      historico: "1500",
    };
    const guarded = create(db, { ...complete, guardia: "Sí" });
    expect(guarded).toMatchObject({
      guardia: "Sí",
      retencion: "270.00",
      deducciones: "230.00",
      estructural: "1330.00",
      neto: "1500.00",
      origenNeto: "Histórico",
      derivadosParciales: false,
    });
    const noGuard = create(db, { ...complete, guardia: "No" });
    expect(noGuard.estructural).toBe("1500.00");
    const unknownGuard = create(db, { ...complete, guardia: null });
    expect(unknownGuard.guardia).toBeNull();
    expect(unknownGuard.estructural).toBe("1500.00");
    const bonus = create(db, { ...complete, tipo: "Bonus", guardia: "Sí" });
    expect(bonus.estructural).toBeNull();
    const missingOperand = create(db, {
      ...complete,
      guardia: "Sí",
      variable: null,
    });
    expect(missingOperand.estructural).toBeNull();
    const partial = create(db, {
      ...complete,
      mes: "2026-07",
      guardia: "Sí",
      historico: null,
      documentado: "1500",
      evidenciaDocumentado: "Documento parcial verificado",
      documentadoVerificado: true,
    });
    movement(db, "101", "60000");
    change(db, {
      accion: "repartir",
      movimiento: "101",
      asignaciones: [
        {
          paga: partial.id,
          importe: "600",
          evidencia: "abono parcial documentado",
        },
      ],
    });
    const p = getPayroll(db).pagas.find((p) => p.id === partial.id)!;
    expect(p).toMatchObject({
      neto: "600.00",
      origenNeto: "Movimientos",
      netoCompleto: false,
      derivadosParciales: true,
      deducciones: "1130.00",
      estructural: "430.00",
      documentado: "1500",
      historico: null,
      diferencia: "900.00",
      fechaCompleta: null,
    });
    const forecast = payrollForecast(
      db,
      { variable: "0", ajuste: "0", corte: "2026-07" },
      now,
    );
    expect(
      forecast.candidatas.every(
        (p) =>
          p.id !== partial.id &&
          p.id !== unknownGuard.id &&
          p.id !== missingOperand.id &&
          p.id !== bonus.id,
      ),
    ).toBe(true);
    expect(db.query("SELECT count(*) n FROM payroll").get()).toEqual({ n: 6 });
    expect(db.query("SELECT count(*) n FROM movimientos").get()).toEqual({
      n: 1,
    });
  } finally {
    db.close();
  }
});

test("P19 AC02/18/20/21 forecast scenarios never mutate any persisted table or original", () => {
  const db = setup();
  try {
    db.exec(`INSERT INTO categorias VALUES('CAT900','Fixture',NULL,'Gasto','Gasto',0,'Activa',1,'f','f');
      INSERT INTO subcategorias VALUES('SUB900','Fixture','CAT900','Activa',1,'f','f');
      INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado) VALUES('PAR900','Fixture','SUB900','Activa',1,'f','f');
      INSERT INTO presupuestos VALUES('PRE900','Fixture','No aplica',NULL,'Activo',1,'f','f');
      INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2026-07-01',0,'fixture');
      INSERT INTO cycle_plans VALUES('1',1);
      INSERT INTO cycle_plan_lines VALUES('1','PRE900',12000,10000,5000);
      INSERT INTO annual_plan_lines VALUES(2026,'PAR900',120000,'Mensual','Sí',1);`);
    const reference = create(db, {
      mes: "2026-06",
      historico: "1000",
      documentado: "1000",
      evidenciaDocumentado: "Doc base",
      documentadoVerificado: true,
    });
    const future = create(db, {
      mes: "2027-01",
      historico: "9000",
      devengo: "10000",
      base: "10000",
    });
    const incomplete = create(db, {
      mes: "2026-07",
      devengo: null,
      historico: null,
    });
    movement(db, "101", "100000");
    change(db, {
      accion: "repartir",
      movimiento: "101",
      asignaciones: [
        { paga: reference.id, importe: "1000", evidencia: "abono documentado" },
      ],
    });
    const tables = (
      db
        .query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as { name: string }[]
    ).map((r) => r.name);
    const snapshot = () =>
      Object.fromEntries(
        tables.map((table) => [
          table,
          db.query('SELECT * FROM "' + table.replaceAll('"', '""') + '"').all(),
        ]),
      );
    const before = snapshot();
    for (const scenario of [
      { variable: "0", ajuste: "0" },
      { variable: "100", ajuste: "1.5" },
      { variable: "10.005", ajuste: "-0.123456789" },
      { variable: "0", ajuste: "91" },
    ]) {
      const result = payrollForecast(
        db,
        { ...scenario, corte: "2026-10" },
        now,
      );
      expect(result.referencia?.id).toBe(reference.id);
      expect(
        result.candidatas.some(
          (p) => p.id === future.id || p.id === incomplete.id,
        ),
      ).toBe(false);
      expect(snapshot()).toEqual(before);
    }
    expect(() =>
      payrollForecast(db, { variable: "-1", ajuste: "0" }, now),
    ).toThrow("no negativa");
    expect(snapshot()).toEqual(before);
    const empty = payrollForecast(
      db,
      { variable: "0", ajuste: "0", corte: "2026-05" },
      now,
    );
    expect(empty.disponible).toBe(false);
    expect(snapshot()).toEqual(before);
    expect(db.query("SELECT count(*) n FROM movimientos").get()).toEqual({
      n: 1,
    });
  } finally {
    db.close();
  }
});

test("P20 AC30/34 explicit same-month source keeps coherent operands and exact compound forecast", () => {
  const db = setup();
  try {
    const a = create(db, {
      devengo: "2000",
      base: "1800",
      irpf: "15.123456789",
      historico: "1500",
      variable: "200",
      mes: "2026-06",
    });
    const b = create(db, {
      devengo: "3000",
      base: "2500",
      irpf: "20",
      historico: "2000",
      variable: "100",
      mes: "2026-06",
    });
    expect(
      payrollForecast(db, { variable: "123.45", ajuste: "-0.223456789" }, now)
        .disponible,
    ).toBe(false);
    const selectedA = payrollForecast(
      db,
      {
        variable: "123.45",
        ajuste: "-0.223456789",
        id: a.id,
        revision: a.revision,
        evidencia: "Fuente A revisada",
      },
      now,
    );
    expect(selectedA.referencia).toMatchObject({
      id: a.id,
      devengo: "2000",
      base: "1800",
      irpf: "15.123456789",
      historico: "1500",
    });
    expect(selectedA.referencia?.exactos.deducciones).toBe("227.77777779800");
    expect(D(selectedA.base!.exacto!).cmp(D("1609.07817220200"))).toBe(0);
    expect(D(selectedA.prudente!.exacto!).cmp(D("1599.5867775939795"))).toBe(0);
    expect(selectedA.prudente?.neto).toBe("1599.59");
    expect(selectedA.diferencia).toBe("-9.49");
    expect(selectedA.base?.neto).toBe("1609.08");
    const selectedB = payrollForecast(
      db,
      {
        variable: "0",
        ajuste: "0",
        id: b.id,
        revision: b.revision,
        evidencia: "Fuente B revisada",
      },
      now,
    );
    expect(selectedB.referencia).toMatchObject({
      id: b.id,
      devengo: "3000",
      base: "2500",
      irpf: "20",
      historico: "2000",
      deducciones: "500.00",
    });
    expect(selectedB.base?.neto).toBe("2000.00");
    expect(selectedA.referencia?.id).not.toBe(selectedB.referencia?.id);
  } finally {
    db.close();
  }
});

test("P21 forecast default and future-cutoff guard follow Madrid civil month at UTC boundary", () => {
  const db = setup();
  try {
    const october = create(db, { mes: "2026-10" });
    const november = create(db, { mes: "2026-11" });
    const before = Date.parse("2026-10-31T21:30:00Z"),
      after = Date.parse("2026-10-31T23:30:00Z");
    expect(
      payrollForecast(db, { variable: "0", ajuste: "0" }, before).referencia
        ?.id,
    ).toBe(october.id);
    expect(() =>
      payrollForecast(
        db,
        { variable: "0", ajuste: "0", corte: "2026-11" },
        before,
      ),
    ).toThrow("futuro");
    const current = payrollForecast(db, { variable: "0", ajuste: "0" }, after);
    expect(current.corte).toBe("2026-11");
    expect(current.referencia?.id).toBe(november.id);
    expect(
      payrollForecast(
        db,
        { variable: "0", ajuste: "0", corte: "2026-11" },
        after,
      ).referencia?.id,
    ).toBe(november.id);
  } finally {
    db.close();
  }
});

test("P22 production-origin migration has no demo account: explicit fixture account supports payroll allocation", async () => {
  const { prepareV9 } = await import("../test-support/database-v9");
  const { createSaldo } = await import("./saldos");
  const db = new Database(":memory:");
  try {
    const identity = {
      origin: "production" as const,
      key_hash: "f".repeat(64),
    };
    prepareV9(db, identity);
    prepareSchema(db, identity);
    expect(db.query("SELECT id FROM saldos ORDER BY id").all()).toEqual([
      { id: "S000" },
    ]);
    const destination = createSaldo(
      db,
      {
        nombre: "Cuenta ficticia explícita",
        tipo: "Efectivo",
        control: "Movimientos",
      },
      crypto.randomUUID(),
      now,
    );
    expect(destination.id).toBe("S001");
    const p = create(db);
    movement(db, "101", "100000");
    change(db, {
      accion: "repartir",
      movimiento: "101",
      asignaciones: [
        { paga: p.id, importe: "1000", evidencia: "Fixture explícita" },
      ],
    });
    expect(getPayroll(db).pagas[0].cobrado).toBe("1000.00");
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    db.close();
  }
});
