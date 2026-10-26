import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { prepareSchema } from "./database-schema";
import { monthlyFixture } from "../test-support/monthly-fixture";
import {
  monthlyFlow,
  observedOperating,
  planningMargin,
} from "./flujo-mensual";
import { debtPeriod } from "./deudas";
import { ledgerRows } from "./movement-ledger";
import { getSaldo } from "./saldos";
const now = Date.parse("2026-10-25T12:00:00Z");
function setup() {
  const db = new Database(":memory:");
  prepareSchema(db, { origin: "demo", key_hash: null });
  monthlyFixture(db);
  return db;
}
function snapshot(db: Database) {
  return (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
  ).map((t) => [t.name, db.query(`SELECT * FROM "${t.name}"`).all()]);
}
test("F1 AC01–06/26/40/45/46: central inclusive interval, registered bank once, absent historical coverage", () => {
  const db = setup(),
    r = monthlyFlow(db, "1", now);
  expect(r.corteEfectivo).toBe("2026-07-19");
  expect(r.hechos.map((m) => m.id)).toEqual([
    "101",
    "102",
    "103",
    "104",
    "105",
    "106",
    "107",
    "108",
  ]);
  expect(r.metrics.nomina.subtotal).toBe("2000.00");
  expect(r.metrics.bonus.subtotal).toBe("200.00");
  expect(r.metrics.otros.subtotal).toBe("50.00");
  expect(r.metrics.interesesIngreso.subtotal).toBe("20.00");
  expect(r.metrics.restoOtros.subtotal).toBe("30.00");
  expect(r.metrics.ingresos.subtotal).toBe("2250.00");
  expect(r.metrics.ingresos.valor).toBeNull();
  expect(r.metrics.ingresos.estado).toBe("Parcial");
  expect(r.metrics.ingresos.motivo).toContain("no acreditada");
  expect(monthlyFlow(db, "2", now).metrics.nomina.subtotal).toBe("500.00");
  const f = monthlyFlow(db, "3", now);
  expect(f.corteEfectivo).toBeNull();
  expect(f.metrics.nomina.subtotal).toBeNull();
  expect(f.metrics.nomina.estado).toBe("No disponible");
  db.close();
});
test("F2 AC07–18/41/47: expense/terminal once, inactive valid debt, no double subtraction, absent components", () => {
  const db = setup(),
    r = monthlyFlow(db, "1", now);
  expect(r.metrics.gasto.subtotal).toBe("1800.00");
  expect(r.metrics.cuotas.subtotal).toBe("300.00");
  expect(r.metrics.extraordinaria.subtotal).toBe("100.00");
  expect(r.metrics.deudas.subtotal).toBe("400.00");
  expect(r.metrics.capital.subtotal).toBe("350.00");
  expect(r.metrics.interesesDeuda.subtotal).toBe("50.00");
  expect(r.metrics.operativo.valor).toBeNull();
  expect(observedOperating("2250", "1800", "100")).toBe("350.00");
  expect(observedOperating("1800", "1800", "0")).toBe("0.00");
  expect(observedOperating("0", "1", "0")).toBe("-1.00");
  expect(observedOperating("2250", null, "100")).toBeNull();
  expect(r.metrics.gasto.motivo).toContain("Difiere de H");
  expect(r.pendientes).toContain("Comida/compensaciones");
  expect(r.deuda.fuentes.every((x) => x.deuda === "D001")).toBe(true);
  db.close();
});
test("F3 AC13/15: invalid debt relation cannot be a complete payment; no inferred capital/interest", () => {
  const db = setup();
  const rows = ledgerRows(db).filter((r) => ["105", "108"].includes(r.id));
  let d = debtPeriod(db, rows);
  expect(d.desgloseVerificable).toBe(true);
  d = debtPeriod(
    db,
    rows.map((r) => (r.id === "105" ? { ...r, intereses: null } : r)),
  );
  expect(d.desgloseVerificable).toBe(false);
  expect(d.capital).toBeNull();
  d = debtPeriod(
    db,
    rows.map((r) => ({ ...r, partida: "UNKNOWN" })),
  );
  expect(d.invalidos).toContain("108");
  expect(d.desgloseVerificable).toBe(false);
  db.close();
});
test("F4 AC19–25/48–56: plan fields independent, structural margin exact, no bank completeness inferred", () => {
  const db = setup();
  let r = monthlyFlow(db, "1", now);
  expect(r.metrics.base.valor).toBe("1600.00");
  expect(r.metrics.delMes.valor).toBe("1900.00");
  expect(r.metrics.margenReal.valor).toBeNull();
  expect(r.metrics.media.valor).toBe("1750.00");
  expect(r.metrics.margenEstructural.valor).toBe("150.00");
  expect(r.metrics.margenEstructural.estado).toBe("Parcial");
  db.exec("UPDATE cycle_plan_lines SET base=NULL,del_mes=0 WHERE ciclo='1'");
  r = monthlyFlow(db, "1", now);
  expect(r.metrics.base.valor).toBeNull();
  expect(r.metrics.delMes.valor).toBe("0.00");
  expect(r.metrics.delMes.estado).toBe("Cero verificado");
  expect(r.metrics.margenEstructural.valor).toBeNull();
  db.exec("UPDATE cycle_plan_lines SET base=0,del_mes=NULL WHERE ciclo='1'");
  r = monthlyFlow(db, "1", now);
  expect(r.metrics.base.valor).toBe("0.00");
  expect(r.metrics.delMes.valor).toBeNull();
  expect(r.metrics.margenEstructural.valor).toBe("1750.00");
  expect(monthlyFlow(db, "2", now).plan.sinPlan).toBe(true);
  db.close();
});
test("F5 AC27–32/42–44: unique current position, partial membership, no historical/annual inference", () => {
  const db = setup();
  let r = monthlyFlow(db, "1", now);
  expect(r.metrics.liquidez.estado).toBe("Parcial");
  expect(r.metrics.liquidez.subtotal).toBe(
    getSaldo(db, "S001").posicion.importe,
  );
  expect(r.liquidez.excluidos.map((s) => s.id)).toContain("S003");
  expect(r.metrics.liquidezHistorica.valor).toBeNull();
  expect(r.metrics.variacionAhorro.valor).toBeNull();
  expect(r.metrics.ahorroCierre.valor).toBeNull();
  expect(r.metrics.ahorroResidual.valor).toBeNull();
  db.exec("UPDATE saldos SET liquidez=0 WHERE id='S003'");
  r = monthlyFlow(db, "1", now);
  expect(r.metrics.liquidez.valor).toBe(getSaldo(db, "S001").posicion.importe);
  const amount = r.metrics.liquidez.valor;
  db.exec(
    "UPDATE saldos SET finalidad='Niños',bolsa=1,nombre='Renombrado',revision=revision+1 WHERE id='S001'",
  );
  expect(monthlyFlow(db, "2", now).metrics.liquidez.valor).toBe(amount);
  db.exec("UPDATE saldos SET liquidez=NULL WHERE id='S003'");
  expect(monthlyFlow(db, "1", now).metrics.liquidez.estado).toBe("Parcial");
  db.exec("UPDATE saldos SET estado='Inactiva' WHERE id='S001'");
  expect(monthlyFlow(db, "1", now).metrics.liquidez.estado).toBe(
    "No disponible",
  );
  db.close();
});
test("F6 AC35/36/37: no mutations, snapshot context/revision, all facts and accounts beyond page 100", () => {
  const db = setup();
  db.exec("UPDATE saldos SET liquidez=0 WHERE id='S003'");
  const insert = db.query(
    "INSERT INTO saldos SELECT ?,?,'Efectivo','Manual','Activa','Otro',1,0,0,NULL,NULL,NULL,1,1,'f','f'",
  );
  for (let i = 20; i < 125; i++)
    insert.run("S" + String(i).padStart(3, "0"), "Saldo ficticio " + i);
  const before = snapshot(db);
  const a = monthlyFlow(db, "1", now);
  expect(a.liquidez.incluidos).toHaveLength(106);
  expect(snapshot(db)).toEqual(before);
  db.exec("UPDATE saldos SET revision=revision+1,manual=2 WHERE id='S124'");
  const b = monthlyFlow(db, "1", now);
  expect(b.revision).not.toBe(a.revision);
  expect(b.metrics.liquidez.valor).not.toBe(a.metrics.liquidez.valor);
  const add = db.query(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,concepto,nota,anulado,revision,creado,actualizado) VALUES(?,'2026-07-05','Ingreso',9223372036854775807,'S000','S001','Promoción','Fixture','',0,1,'f','f')",
  );
  for (let i = 1000; i < 1105; i++) add.run(String(i));
  const r = monthlyFlow(db, "1", now);
  expect(r.hechos).toHaveLength(113);
  expect(r.metrics.otros.subtotal).toBe(
    ((9223372036854775807n * 105n + 5000n) / 100n).toString() + ".35",
  );
  expect(() => monthlyFlow(db, "bad", now)).toThrow("inválido");
  expect(() => monthlyFlow(db, "999", now)).toThrow("encontrado");
  db.close();
});

test("F7 AC33/34/37/38: source failure isolated without SQL leakage, no stale monthly/plan number", () => {
  const db = setup();
  db.exec("UPDATE payroll SET data='invalid json'");
  let r = monthlyFlow(db, "1", now);
  expect(r.erroresFuente).toContain("Nómina");
  expect(r.metrics.media.valor).toBeNull();
  expect(r.metrics.ingresos.subtotal).toBe("2250.00");
  expect(r.metrics.liquidez.subtotal).not.toBeNull();
  db.exec(
    "ALTER TABLE cycle_plan_lines RENAME TO cycle_plan_lines_unavailable",
  );
  r = monthlyFlow(db, "1", now);
  expect(r.erroresFuente).toContain("Plan del ciclo");
  expect(r.plan.sinPlan).toBe(false);
  expect(r.metrics.base.valor).toBeNull();
  expect(JSON.stringify(r)).not.toContain("SELECT");
  db.close();
});
test("F8 AC26/27/29: empty registered interval is not verified zero; known empty liquidity universe is zero", () => {
  const db = new Database(":memory:");
  prepareSchema(db, { origin: "demo", key_hash: null });
  db.exec(
    "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2026-06-20',0,'fixture'),('2','2026-07-20',0,'fixture')",
  );
  let r = monthlyFlow(db, "1", now);
  expect(r.corteEfectivo).toBeNull();
  expect(r.metrics.ingresos.valor).toBeNull();
  expect(r.metrics.ingresos.subtotal).toBeNull();
  expect(r.metrics.liquidez.estado).toBe("Cero verificado");
  db.exec(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,concepto,nota,anulado,revision,creado,actualizado) VALUES('1','2026-07-21','Ingreso',1,'S000','S001','Nómina','F','',0,1,'f','f')",
  );
  r = monthlyFlow(db, "1", now);
  expect(r.corteEfectivo).toBe("2026-07-19");
  expect(r.metrics.ingresos.estado).toBe("No disponible");
  expect(r.metrics.ingresos.subtotal).toBeNull();
  expect(r.metrics.operativo.valor).toBeNull();
  db.close();
});
test("F9 AC38: protected read-only Effect HTTP, real MFA, no write endpoint, expired session and safe errors", async () => {
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
    headers: Record<string, string> = {},
  ) =>
    handler(
      new Request(origin + path, { method, headers: { origin, ...headers } }),
    );
  expect((await request("/api/flujo-mensual/1")).status).toBe(401);
  const auth = new Auth(db, key),
    enroll = await auth.enroll(
      provision(db),
      "Clave ficticia flujo " + crypto.randomUUID(),
    ),
    verified = auth.verify(
      new Request(origin, {
        headers: { cookie: auth.challengeName + "=" + enroll.challenge },
      }),
      totp(enroll.secret!).generate(),
    ),
    headers = { cookie: auth.cookieName + "=" + verified.session };
  const response = await request("/api/flujo-mensual/1", "GET", headers);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const r = await response.json();
  expect(r.metrics.ingresos.subtotal).toBe("2250.00");
  expect(r.metrics.ingresos.valor).toBeNull();
  const before = snapshot(db);
  expect(
    (
      await request("/api/flujo-mensual/1", "POST", {
        ...headers,
        "x-csrf-token": verified.csrf,
      })
    ).status,
  ).toBe(404);
  const bad = await request("/api/flujo-mensual/x", "GET", headers);
  expect(bad.status).toBe(422);
  expect(await bad.text()).not.toContain("SELECT");
  // GET authentication may update session seen; financial tables remain untouched.
  expect(snapshot(db).filter((t) => t[0] !== "sessions")).toEqual(
    before.filter((t) => t[0] !== "sessions"),
  );
  db.exec("DELETE FROM sessions");
  expect((await request("/api/flujo-mensual/1", "GET", headers)).status).toBe(
    401,
  );
  db.close();
});

test("F10 AC20–23: partial plan subtotals independent per field, unplanned execution R3, no annual/Essential leakage", () => {
  const db = setup();
  db.exec(`INSERT INTO presupuestos VALUES('PRE002','Ahorro por nombre no acredita identidad','Gasto real','S001','Activo',1,'f','f');
 UPDATE partidas SET presupuesto='PRE002' WHERE id='PAR001';
 INSERT INTO cycle_plan_lines VALUES('1','PRE002',NULL,999999,0);
 INSERT INTO annual_plan_lines VALUES(2026,'PAR001',999999,'Mensual','Sí',1);`);
  let r = monthlyFlow(db, "1", now);
  expect(r.metrics.base.estado).toBe("Parcial");
  expect(r.metrics.base.subtotal).toBe("1600.00");
  expect(r.metrics.base.valor).toBeNull();
  expect(r.metrics.delMes.valor).toBe("1900.00");
  expect(r.metrics.margenEstructural.valor).toBeNull();
  expect(r.metrics.ahorroResidual.valor).toBeNull();
  db.exec("DELETE FROM cycle_plan_lines WHERE presupuesto='PRE002'");
  r = monthlyFlow(db, "1", now);
  expect(r.plan.sinPlanificar).toContain("PRE002");
  expect(
    db
      .query(
        "SELECT presupuesto FROM cycle_plan_lines WHERE presupuesto='PRE002'",
      )
      .get(),
  ).toBeNull();
  db.close();
});
test("F11 AC02/37: effective cutoff limited to reference even when temporal end is later; context changes invalidate revision", () => {
  const db = setup();
  const a = monthlyFlow(db, "2", now);
  expect(a.ciclo.fin).toBe("2026-08-19");
  expect(a.corteEfectivo).toBe("2026-07-20");
  db.exec(
    "UPDATE movimientos SET fecha='2026-07-22',revision=revision+1 WHERE id='111'",
  );
  const b = monthlyFlow(db, "2", now);
  expect(b.corteEfectivo).toBe("2026-07-22");
  expect(b.revision).not.toBe(a.revision);
  db.close();
});

test("F12 AC06/40/44: N:M allocation never duplicates bank, renames preserve IDs and S015 is eligible liquidity", async () => {
  const { confirmPayroll, getPayroll } = await import("./nomina");
  const db = setup(),
    before = monthlyFlow(db, "1", now),
    pays = getPayroll(db).pagas;
  confirmPayroll(
    db,
    {
      accion: "repartir",
      contexto: getPayroll(db).contexto,
      motivo: "Reparto ficticio",
      movimiento: "101",
      asignaciones: [
        { paga: pays[0].id, importe: "1000", evidencia: "Primera parte" },
        { paga: pays[1].id, importe: "500", evidencia: "Segunda parte" },
      ],
    },
    crypto.randomUUID(),
    now,
  );
  db.exec(
    "UPDATE categorias SET nombre='Catálogo renombrado',estado='Inactiva',revision=revision+1 WHERE id='CAT001'",
  );
  db.exec(
    "INSERT INTO saldos SELECT 'S015','Ahorro físico anual S015','Efectivo','Manual','Activa','Ahorro',1,0,0,NULL,NULL,NULL,100,1,'f','f'",
  );
  const after = monthlyFlow(db, "1", now);
  expect(after.metrics.nomina.subtotal).toBe(before.metrics.nomina.subtotal);
  expect(after.metrics.ingresos.subtotal).toBe("2250.00");
  expect(after.hechos.filter((r) => r.id === "101")).toHaveLength(1);
  expect(after.deuda.fuentes.map((r) => r.movimiento)).toEqual(
    before.deuda.fuentes.map((r) => r.movimiento),
  );
  expect(after.liquidez.incluidos.map((s) => s.id)).toContain("S015");
  db.close();
});

test("F13 AC14/16–19/26: exact conditional formulas with verified operands, absence never zero", () => {
  expect(planningMargin("2000", "1900")).toBe("100.00");
  expect(planningMargin("2000", "0")).toBe("2000.00");
  expect(planningMargin("0", "1900")).toBe("-1900.00");
  expect(planningMargin(null, "0")).toBeNull();
  expect(planningMargin("2000", null)).toBeNull();
  expect(observedOperating("0", "0", "0")).toBe("0.00");
  const db = setup();
  const debtRows = ledgerRows(db).filter((r) => r.id === "108");
  expect(
    debtPeriod(
      db,
      debtRows.map((r) => ({ ...r, anulado: 1 })),
    ).extraordinarias,
  ).toHaveLength(0);
  db.close();
});
