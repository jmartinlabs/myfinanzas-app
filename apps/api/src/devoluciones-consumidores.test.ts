import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { createSaldo } from "./saldos";
import { createClassification } from "./clasificacion";
import { createCycle, cycleContext } from "./ciclos";
import { previewMovement, writeMovement } from "./movimientos";
import {
  confirmPartidaConfig,
  getPlanMensualDprima,
  previewPartidaConfig,
} from "./dprima";
import { cycleExecution, executionDetail, getCyclePlan } from "./planes-ciclo";
import {
  agregarDescuentos,
  descuentoPorCompras,
  proyeccionDevolucionesCompra,
} from "./devoluciones";
import { gateAbiertoParaPruebas } from "../test-support/devolucion-gate-abierto";

/**
 * #538 F2a-1 · consumidores económicos de plan: Plan de ciclo y ejecución mensual
 * de Dprima restan SOLO el descuento de las compras que ellos mismos seleccionan
 * (SPEC39 §3, §10, §11.2). SQLite ficticia en memoria; ningún dato real.
 */
const now = Date.parse("2026-10-21T12:00:00Z");
process.env.NODE_ENV = "test";

function setup() {
  const db = openDatabase(":memory:");
  const cat = createClassification(
    db,
    "categorias",
    { nombre: "Gastos ficticios", anual: "Gasto", mensual: "Gasto", referencia: false },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Subcategoría ficticia", padre: cat.id },
    randomUUID(),
  );
  db.run(
    "INSERT INTO presupuestos VALUES('PRE900','Plan comida ficticio','Gasto real','S001','Activo',1,'f','f')",
  );
  db.run(
    "INSERT INTO presupuestos VALUES('PRE901','Plan ocio ficticio','Gasto real','S001','Activo',1,'f','f')",
  );
  const food = createClassification(
    db,
    "partidas",
    { nombre: "Supermercado ficticio", padre: sub.id, presupuesto: "PRE900" },
    randomUUID(),
  );
  const leisure = createClassification(
    db,
    "partidas",
    { nombre: "Ocio ficticio", padre: sub.id, presupuesto: "PRE901" },
    randomUUID(),
  );
  for (const p of [food, leisure]) {
    const cambios = { fuente: "Gasto real" };
    const pv = previewPartidaConfig(db, p.id, { cambios, motivo: "Configuración ficticia" });
    confirmPartidaConfig(
      db,
      p.id,
      { cambios, motivo: "Configuración ficticia", fingerprint: pv.fingerprint },
      randomUUID(),
      now,
    );
  }
  const mk = (nombre: string, opening: string) =>
    createSaldo(
      db,
      {
        nombre,
        tipo: "Efectivo",
        control: "Movimientos",
        saldoApertura: opening,
        fechaApertura: "2026-01-01",
        permiteSalidaExterior: true,
      },
      randomUUID(),
      now,
    );
  const account = mk("Cuenta ficticia", "5000");
  const other = mk("Otra cuenta ficticia", "100");
  const cycles = ["2026-06-20", "2026-07-20", "2026-08-20", "2026-09-20"].map(
    (inicio) =>
      createCycle(
        db,
        { inicio, saldoInicialComida: "0", contextRevision: cycleContext(db).revision },
        randomUUID(),
        now,
      ).ciclo,
  );
  return { db, food, leisure, account, other, A: cycles[0], B: cycles[1] };
}
type Ctx = ReturnType<typeof setup>;

function add(db: Database, body: Record<string, unknown>) {
  const plan = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    randomUUID(),
    null,
    false,
    now,
    undefined,
    gateAbiertoParaPruebas,
  );
}
let seq = 0;
/** Compra en el ciclo A (2026-06-20 .. 2026-07-19) salvo que se indique otra. */
function buy(c: Ctx, importe: string, over: Record<string, unknown> = {}) {
  return add(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-05",
    importe,
    saldo: c.account.id,
    partida: c.food.id,
    concepto: `Compra ficticia ${++seq}`,
    nota: "",
    ...over,
  }).movimiento.id as string;
}
/** Abono en el ciclo B (2026-07-20 .. 2026-08-19), otro saldo receptor. */
function refund(
  c: Ctx,
  compra: string,
  importe: string,
  link: Record<string, unknown> = {},
  over: Record<string, unknown> = {},
) {
  return add(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-08-10",
    importe,
    saldo: c.other.id,
    concepto: "Devolución ficticia",
    nota: "",
    ...over,
    devolucion: {
      estado: "Verificado",
      compra,
      evidenciaRelacion: "Evidencia ficticia",
      elegibilidad: "Acreditada",
      cicloOrigen: c.A.id,
      evidenciaOrigenTemporal: "Documento ficticio",
      ...link,
    },
  }).movimiento.id as string;
}
const sinAcreditar = {
  elegibilidad: "No acreditada",
  cicloOrigen: undefined,
  evidenciaOrigenTemporal: undefined,
};
const plan = (c: Ctx, ciclo: string, presupuesto = "PRE900") =>
  getCyclePlan(c.db, ciclo, now).items.find((i) => i.presupuesto.id === presupuesto)!;
const dprima = (c: Ctx, ciclo: string, raiz: string = c.food.id) =>
  getPlanMensualDprima(c.db, ciclo, now).items.find((i) => i.raiz === raiz)!;

test("F2A1-01 (AC-D18/AC-D03): compra 120 en A y abono 30 en B → GRE de A = 90, B sin cambio, banco B +30 en su fecha real", () => {
  const c = setup();
  const compra = buy(c, "120");
  // Antes del abono: A ejecuta 120.
  expect(plan(c, c.A.id).ejecutado).toBe("120.00");
  expect(dprima(c, c.A.id).ejecutado).toBe("120.00");
  refund(c, compra, "30");
  // Plan de ciclo
  const pa = plan(c, c.A.id);
  expect([pa.bruto, pa.devoluciones, pa.ejecutado]).toEqual(["120.00", "30.00", "90.00"]);
  const pb = plan(c, c.B.id);
  expect([pb.bruto, pb.devoluciones, pb.ejecutado]).toEqual(["0.00", "0.00", "0.00"]);
  // Dprima: A baja a GRE; B no recibe gasto negativo; el abono va aparte por su fecha real.
  const da = dprima(c, c.A.id);
  expect([da.bruto, da.devoluciones, da.ejecutado, da.abonosBancarios]).toEqual([
    "120.00",
    "30.00",
    "90.00",
    "0.00",
  ]);
  const db_ = dprima(c, c.B.id);
  expect([db_.bruto, db_.devoluciones, db_.ejecutado, db_.abonosBancarios]).toEqual([
    "0.00",
    "0.00",
    "0.00",
    "30.00",
  ]);
  // Banco real: el receptor sube 30 con la fecha del abono (hecho propio, no gasto negativo).
  const row = c.db
    .query("SELECT fecha,CAST(importe AS TEXT) importe,destino FROM movimientos WHERE tipo='Devolución de gasto'")
    .get() as { fecha: string; importe: string; destino: string };
  expect(row).toEqual({ fecha: "2026-08-10", importe: "3000", destino: c.other.id });
  c.db.close();
});

test("F2A1-02 (AC-D08): parciales 30+40 sobre 120 → descuento 70 y GRE 50 en Plan y Dprima", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "30");
  refund(c, compra, "40", {}, { fecha: "2026-08-11" });
  const p = plan(c, c.A.id);
  expect([p.devoluciones, p.ejecutado, p.cobertura, p.causas]).toEqual(["70.00", "50.00", "Completa", []]);
  const d = dprima(c, c.A.id);
  expect([d.devoluciones, d.ejecutado]).toEqual(["70.00", "50.00"]);
  expect(dprima(c, c.B.id).abonosBancarios).toBe("70.00");
  c.db.close();
});

test("F2A1-03 (AC-D09): devolución total → GRE 0,00 (cero con hechos, no ausencia ni null)", () => {
  const c = setup();
  const compra = buy(c, "121.45");
  refund(c, compra, "121.45");
  const p = plan(c, c.A.id);
  expect(p.ejecutado).toBe("0.00");
  expect(p.bruto).toBe("121.45");
  expect(dprima(c, c.A.id).ejecutado).toBe("0.00");
  expect(dprima(c, c.A.id).bruto).toBe("121.45");
  // Una raíz sin compras también es 0,00, pero distinguible por bruto 0,00 y sin hechos.
  expect(plan(c, c.A.id, "PRE901").bruto).toBe("0.00");
  c.db.close();
});

test("F2A1-04 (AC-D39): Verificada No acreditada → descuento 0, GRE 120, cobertura parcial; el abono sí es flujo bancario", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "30", sinAcreditar);
  const p = plan(c, c.A.id);
  expect([p.devoluciones, p.ejecutado, p.cobertura, p.causas]).toEqual([
    "0.00",
    "120.00",
    "Parcial",
    ["sinAcreditacion"],
  ]);
  const a = dprima(c, c.A.id);
  expect([a.devoluciones, a.ejecutado, a.cobertura, a.causas]).toEqual([
    "0.00",
    "120.00",
    "Parcial",
    ["sinAcreditacion"],
  ]);
  expect(dprima(c, c.B.id).abonosBancarios).toBe("30.00");
  c.db.close();
});

test("F2A1-05 (AC-D04): huérfano sinVinculo, con y sin fila de vínculo, no netea ni se atribuye a una Partida", () => {
  const c = setup();
  const compra = buy(c, "100");
  // Sin fila de vínculo, con Partida declarada en el movimiento.
  add(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-08-10",
    importe: "11",
    saldo: c.other.id,
    partida: c.food.id,
    concepto: "Huérfana ficticia",
    nota: "",
  });
  // Revisar + Acreditada + Partida + sin compra: lo que el mapa por Partida antiguo neteaba.
  const orphan = add(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-08-11",
    importe: "13",
    saldo: c.other.id,
    partida: c.food.id,
    concepto: "Huérfana acreditada ficticia",
    nota: "",
  }).movimiento.id as string;
  c.db.run(
    `INSERT INTO movimiento_devolucion(movimiento,compra,partida,ciclo_origen,evidencia_relacion,
       evidencia_origen_temporal,elegibilidad,estado,revision_movimiento,revision,creado,actualizado)
     VALUES(?,NULL,?,?,'Evidencia ficticia','Documento ficticio','Acreditada','Revisar',1,1,'f','f')`,
    [orphan, c.food.id, c.A.id],
  );
  expect(plan(c, c.A.id).ejecutado).toBe("100.00");
  expect(plan(c, c.A.id).devoluciones).toBe("0.00");
  expect(dprima(c, c.A.id).ejecutado).toBe("100.00");
  expect(dprima(c, c.B.id).abonosBancarios).toBe("0.00");
  // Y la pieza común no los ve como descuento de la compra.
  expect(descuentoPorCompras(c.db, [compra]).get(compra)!.descuentoEconomico).toBe(0n);
  c.db.close();
});

test("F2A1-06 (AC-D04): vínculo Revisar no netea y declara cobertura parcial con causa revisar", () => {
  const c = setup();
  const compra = buy(c, "100");
  refund(c, compra, "12", { estado: "Revisar" });
  const p = plan(c, c.A.id);
  expect([p.devoluciones, p.ejecutado, p.cobertura, p.causas]).toEqual([
    "0.00",
    "100.00",
    "Parcial",
    ["revisar"],
  ]);
  expect(dprima(c, c.A.id).causas).toEqual(["revisar"]);
  // Revisar no está confirmado: no es abono atribuible a la Partida.
  expect(dprima(c, c.B.id).abonosBancarios).toBe("0.00");
  c.db.close();
});

test("F2A1-07 (AC-D18/AC-D02): reclasificar la compra mueve bruto y descuento al mismo ámbito; la copia legacy contradictoria no prevalece", () => {
  const c = setup();
  const compra = buy(c, "120");
  const dev = refund(c, compra, "30", {}, { partida: c.food.id });
  // Copias legacy (fixture SQL ficticio) que siguen diciendo «food» tras reclasificar.
  c.db.run("UPDATE movimiento_devolucion SET partida=? WHERE movimiento=?", [c.food.id, dev]);
  expect(plan(c, c.A.id, "PRE900").ejecutado).toBe("90.00");
  // Reclasificación de la compra a Ocio (fixture SQL ficticio).
  c.db.run("UPDATE movimientos SET partida=? WHERE id=?", [c.leisure.id, compra]);
  const legacy = c.db
    .query("SELECT d.partida dp,m.partida mp FROM movimiento_devolucion d JOIN movimientos m ON m.id=d.movimiento WHERE d.movimiento=?")
    .get(dev) as { dp: string; mp: string };
  expect(legacy).toEqual({ dp: c.food.id, mp: c.food.id });
  expect(plan(c, c.A.id, "PRE900")).toMatchObject({ bruto: "0.00", devoluciones: "0.00", ejecutado: "0.00" });
  expect(plan(c, c.A.id, "PRE901")).toMatchObject({ bruto: "120.00", devoluciones: "30.00", ejecutado: "90.00" });
  expect(dprima(c, c.A.id, c.food.id)).toMatchObject({ bruto: "0.00", devoluciones: "0.00", ejecutado: "0.00", abonosBancarios: "0.00" });
  expect(dprima(c, c.A.id, c.leisure.id)).toMatchObject({ bruto: "120.00", devoluciones: "30.00", ejecutado: "90.00" });
  // El abono bancario sigue a la Partida vigente de la compra.
  expect(dprima(c, c.B.id, c.food.id).abonosBancarios).toBe("0.00");
  expect(dprima(c, c.B.id, c.leisure.id).abonosBancarios).toBe("30.00");
  c.db.close();
});

test("F2A1-08 (AC-D27): subconjunto por IDs/Partida resta solo sus devoluciones, sin bolsa global ni contaminación", () => {
  const c = setup();
  const f1 = buy(c, "120");
  const f2 = buy(c, "80");
  const l1 = buy(c, "60", { partida: c.leisure.id });
  refund(c, f1, "30");
  refund(c, f2, "5");
  refund(c, l1, "20");
  const all = descuentoPorCompras(c.db, [f1, f2, l1]);
  expect([f1, f2, l1].map((i) => all.get(i)!.descuentoEconomico)).toEqual([3000n, 500n, 2000n]);
  // Un subconjunto de IDs solo ve lo suyo, aunque haya otras devoluciones de la misma Partida.
  expect(descuentoPorCompras(c.db, [f2]).get(f2)!.descuentoEconomico).toBe(500n);
  expect([...descuentoPorCompras(c.db, [f2]).keys()]).toEqual([f2]);
  expect(agregarDescuentos(descuentoPorCompras(c.db, [f1, f2]).values()).descuento).toBe(3500n);
  // Un ID sin devoluciones (o inexistente) es cero con cobertura completa: nunca otra compra.
  const ninguno = descuentoPorCompras(c.db, ["999999"]).get("999999")!;
  expect([ninguno.descuentoEconomico, ninguno.cobertura, ninguno.devoluciones]).toEqual([0n, "Completa", []]);
  // Cada Presupuesto/raíz resta lo suyo.
  expect(plan(c, c.A.id, "PRE900")).toMatchObject({ bruto: "200.00", devoluciones: "35.00", ejecutado: "165.00" });
  expect(plan(c, c.A.id, "PRE901")).toMatchObject({ bruto: "60.00", devoluciones: "20.00", ejecutado: "40.00" });
  expect(dprima(c, c.A.id, c.food.id)).toMatchObject({ devoluciones: "35.00", ejecutado: "165.00" });
  expect(dprima(c, c.A.id, c.leisure.id)).toMatchObject({ devoluciones: "20.00", ejecutado: "40.00" });
  c.db.close();
});

test("F2A1-09 (AC-D03): reconciliación AL CÉNTIMO Plan de ciclo = Dprima = Σ R1 del mismo conjunto de compras, con detalle bruto − descuento", () => {
  const c = setup();
  const x = buy(c, "121.45");
  const y = buy(c, "33.33");
  const z = buy(c, "10.07", { fecha: "2026-07-18" });
  refund(c, x, "17.03");
  refund(c, x, "0.07", {}, { fecha: "2026-08-11" });
  refund(c, y, "33.33");
  const r1 = [x, y, z].map((id) => BigInt(proyeccionDevolucionesCompra(c.db, id).resumen.gastoRealEconomico!.replace(".", "")));
  const gre = r1.reduce((n, v) => n + v, 0n);
  expect(gre).toBe(12145n - 1703n - 7n + 3333n - 3333n + 1007n);
  const cents = (v: string | null) => BigInt(v!.replace(".", ""));
  const p = plan(c, c.A.id);
  const d = dprima(c, c.A.id);
  expect(cents(p.ejecutado)).toBe(gre);
  expect(p.ejecutado).toBe(d.ejecutado);
  expect(p.bruto).toBe(d.bruto);
  expect(p.devoluciones).toBe(d.devoluciones);
  expect(p.cobertura).toBe(d.cobertura);
  // Detalle: Σ bruto − Σ descuento = ejecutado, al céntimo.
  const det = executionDetail(c.db, c.A.id, "PRE900", new URLSearchParams(), now);
  const bruto = det.items.reduce((n, i) => n + cents(i.importe), 0n);
  const desc = det.items.reduce((n, i) => n + cents(i.descuentoEconomico), 0n);
  expect(bruto - desc).toBe(cents(det.ejecutado));
  expect(cents(det.ejecutado)).toBe(gre);
  expect(det.items.map((i) => i.descuentoEconomico)).toEqual(["17.10", "33.33", "0.00"]);
  c.db.close();
});

test("F2A1-10 (AC-D18): la ejecución de A baja al abonar en B y la de B no se mueve", () => {
  const c = setup();
  const compra = buy(c, "120");
  buy(c, "40", { fecha: "2026-07-25" }); // compra propia de B
  const antes = { a: dprima(c, c.A.id), b: dprima(c, c.B.id) };
  expect([antes.a.ejecutado, antes.b.ejecutado, antes.b.abonosBancarios]).toEqual(["120.00", "40.00", "0.00"]);
  refund(c, compra, "30");
  const despues = { a: dprima(c, c.A.id), b: dprima(c, c.B.id) };
  expect(despues.a.ejecutado).toBe("90.00");
  expect(despues.b.ejecutado).toBe(antes.b.ejecutado);
  expect(despues.b.bruto).toBe(antes.b.bruto);
  expect(despues.b.abonosBancarios).toBe("30.00");
  expect(plan(c, c.A.id).ejecutado).toBe("90.00");
  expect(plan(c, c.B.id).ejecutado).toBe("40.00");
  c.db.close();
});

test("F2A1-11: un abono anterior o posterior al ciclo queda fuera de abonosBancarios (ventana por fecha real)", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "30", {}, { fecha: "2026-07-19" }); // último día de A
  refund(c, compra, "10", {}, { fecha: "2026-08-20" }); // primer día de C
  expect(dprima(c, c.A.id).abonosBancarios).toBe("30.00");
  expect(dprima(c, c.B.id).abonosBancarios).toBe("0.00");
  // El descuento sigue a la compra: A descuenta ambos.
  expect(dprima(c, c.A.id)).toMatchObject({ devoluciones: "40.00", ejecutado: "80.00" });
  c.db.close();
});

test("F2A1-12: sin tabla de vínculos (esquema anterior) Plan y Dprima no fallan y no netean", () => {
  const c = setup();
  buy(c, "50");
  c.db.run("DROP TABLE movimiento_devolucion_audit");
  c.db.run("DROP TABLE movimiento_devolucion");
  const item = cycleExecution(c.db, c.A.id, now).items.find((i) => i.presupuesto.id === "PRE900")!;
  expect(item).toMatchObject({ bruto: "50.00", devoluciones: "0.00", ejecutado: "50.00" });
  expect(dprima(c, c.A.id)).toMatchObject({ ejecutado: "50.00", abonosBancarios: "0.00" });
  c.db.close();
});

test("F2A1-13: un histórico con devolución mayor que la compra no oculta el exceso (ejecución no verificable, sin max(0))", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "100");
  c.db.run("DROP TRIGGER IF EXISTS movimiento_devolucion_integrity");
  c.db.run("UPDATE movimientos SET importe=5000 WHERE id=?", [compra]);
  const p = plan(c, c.A.id);
  expect(p.ejecutado).toBeNull();
  expect(p.motivo).toContain("Devolución superior");
  expect(p.cobertura).toBe("Parcial");
  const d = dprima(c, c.A.id);
  expect(d.ejecutado).toBeNull();
  expect(d.estado).toBe("No disponible");
  c.db.close();
});
