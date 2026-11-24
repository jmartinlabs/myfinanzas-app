import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { createSaldo } from "./saldos";
import { createClassification } from "./clasificacion";
import { createCycle, cycleContext } from "./ciclos";
import { previewMovement, writeMovement } from "./movimientos";
import { confirmPartidaConfig, getPlanMensualDprima, previewPartidaConfig } from "./dprima";
import { getCyclePlan } from "./planes-ciclo";
import { activateRegimen, comidaMetrics, prepareRegimen, writeComidaMetadata } from "./comida";
import { descuentoPorCompras } from "./devoluciones";
import { gateAbiertoParaPruebas } from "../test-support/devolucion-gate-abierto";

/**
 * #538 F2b · Comida y e35 con la proyección única (SPEC39 §3, §8, §10).
 * El descuento sigue a la COMPRA de Comida, no a la fecha ni al saldo del abono.
 * SQLite ficticia en memoria; ningún dato real. El gate se inyecta abierto solo en pruebas.
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
  db.run("INSERT INTO presupuestos VALUES('PRE900','Plan comida ficticio','Gasto real','S001','Activo',1,'f','f')");
  db.run("INSERT INTO presupuestos VALUES('PRE901','Plan ocio ficticio','Gasto real','S001','Activo',1,'f','f')");
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
  const ing = mk("ING Comida ficticia", "5000");
  const other = mk("Otra cuenta ficticia", "5000");
  const cycles = ["2026-06-20", "2026-07-20", "2026-08-20", "2026-09-20"].map(
    (inicio) =>
      createCycle(
        db,
        { inicio, saldoInicialComida: "5000", contextRevision: cycleContext(db).revision },
        randomUUID(),
        now,
      ).ciclo,
  );
  const A = cycles[0],
    B = cycles[1];
  const ready = prepareRegimen(
    db,
    {
      saldo: ing.id,
      cicloCorte: A.id,
      apertura: "5000",
      evidencia: "Extracto ficticio",
      cobertura: "Verificable",
      motivo: "Preparación ficticia",
    },
    randomUUID(),
    now,
  );
  activateRegimen(
    db,
    { revision: ready.regimen.regimen!.revision, motivo: "Activación ficticia", confirmar: true },
    randomUUID(),
    now,
  );
  return { db, food, leisure, ing, other, A, B };
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
/** Compra de Comida: sale del saldo ING (régimen activo) con etiqueta Comida; ciclo A. */
function buy(c: Ctx, importe: string, over: Record<string, unknown> = {}) {
  return add(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-05",
    importe,
    saldo: c.ing.id,
    partida: c.food.id,
    concepto: `Compra ficticia ${++seq}`,
    nota: "",
    comida: { etiqueta: "Comida" },
    ...over,
  }).movimiento.id as string;
}
/** Compra AJENA a Comida: sale de otro saldo, sin metadato de Comida. */
function buyAjena(c: Ctx, importe: string) {
  return add(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-05",
    importe,
    saldo: c.other.id,
    partida: c.leisure.id,
    concepto: `Compra ajena ficticia ${++seq}`,
    nota: "",
  }).movimiento.id as string;
}
function refund(
  c: Ctx,
  compra: string,
  importe: string,
  link: Record<string, unknown> = {},
  over: Record<string, unknown> = {},
) {
  return add(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-07-25",
    importe,
    saldo: c.ing.id,
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
const m = (c: Ctx, ciclo: string) => comidaMetrics(c.db, ciclo, now);
const plan = (c: Ctx, ciclo: string, p = "PRE900") =>
  getCyclePlan(c.db, ciclo, now).items.find((i) => i.presupuesto.id === p)!;
const dprima = (c: Ctx, ciclo: string, raiz: string) =>
  getPlanMensualDprima(c.db, ciclo, now).items.find((i) => i.raiz === raiz)!;

test("F2B-01 (AC-D20/AC-D18): compra 120 en A y abono 30 en B → neto A 90, B sin cambio; el abono no es financiación ni duplica", () => {
  const c = setup();
  const before = m(c, c.A.id);
  const compra = buy(c, "120");
  const sin = m(c, c.A.id);
  expect(sin.compras.neto.valor).toBe("120.00");
  const dev = refund(c, compra, "30");
  const a = m(c, c.A.id);
  expect([a.compras.bruto.valor, a.compras.devoluciones.valor, a.compras.neto.valor]).toEqual([
    "120.00",
    "30.00",
    "90.00",
  ]);
  expect(a.compras.devoluciones.ids).toEqual([dev]);
  expect(a.cobertura.estado).toBe("Verificable");
  const b = m(c, c.B.id);
  expect([b.compras.bruto.valor, b.compras.devoluciones.valor, b.compras.neto.valor]).toEqual([
    "0.00",
    "0.00",
    "0.00",
  ]);
  // OTRO_CICLO informa en ambos extremos y no impide el neteo ni degrada la cobertura.
  expect(a.devoluciones.otroCiclo).toEqual([dev]);
  expect(b.devoluciones.otroCiclo).toEqual([dev]);
  expect(b.cobertura.estado).toBe("Verificable");
  // El abono (saldo ING) no es financiación nueva: F/Rcaja intactos; el hecho bancario
  // es único (un solo movimiento de devolución) y el banco lo ve por su fecha real.
  expect(a.financiacion).toMatchObject({ f: before.financiacion.f, reposicionesCaja: before.financiacion.reposicionesCaja });
  expect(
    (c.db.query("SELECT COUNT(*) n FROM movimientos WHERE tipo='Devolución de gasto'").get() as { n: number }).n,
  ).toBe(1);
  expect(b.devolucionesObservadas.valor).toBe("30.00");
  c.db.close();
});

test("F2B-02 (AC-D21): compra de Comida frente a compra ajena; la devolución ajena no degrada la cobertura de Comida", () => {
  const c = setup();
  const comida = buy(c, "100");
  refund(c, comida, "20");
  const ajena = buyAjena(c, "60");
  // Devoluciones ajenas con causas que, de ser de Comida, degradarían: Revisar y No acreditada.
  refund(c, ajena, "10", { estado: "Revisar" }, { saldo: c.other.id });
  refund(c, ajena, "5", sinAcreditar, { saldo: c.other.id });
  const a = m(c, c.A.id);
  expect([a.compras.bruto.valor, a.compras.devoluciones.valor, a.compras.neto.valor]).toEqual([
    "100.00",
    "20.00",
    "80.00",
  ]);
  expect(a.cobertura.estado).toBe("Verificable");
  expect(a.cobertura.devolucionesPendientes).toEqual([]);
  expect(a.compras.neto.estado).toBe("Verificado");
  expect(a.devoluciones.revisar).toEqual([]);
  expect(a.devoluciones.sinAcreditacion).toEqual([]);
  c.db.close();
});

test("F2B-03 (AC-D22): parciales 30+40, total, No acreditada, Revisar", () => {
  const c = setup();
  const p = buy(c, "120");
  refund(c, p, "30");
  const d2 = refund(c, p, "40", {}, { fecha: "2026-07-26" });
  let a = m(c, c.A.id);
  expect([a.compras.devoluciones.valor, a.compras.neto.valor]).toEqual(["70.00", "50.00"]);
  expect(a.compras.devoluciones.ids).toContain(d2);
  expect(a.compras.devoluciones.ids.length).toBe(2);
  // Total (importe de la compra entera): neto 0,00 verificado, no ausencia.
  const t = buy(c, "10.50", { fecha: "2026-07-06" });
  refund(c, t, "10.50", {}, { fecha: "2026-07-27" });
  a = m(c, c.A.id);
  expect([a.compras.bruto.valor, a.compras.neto.valor]).toEqual(["130.50", "50.00"]);
  c.db.close();
});

test("F2B-04 (AC-D22): No acreditada → descuento 0 y cobertura Parcial con causa visible; Revisar igual; ninguno es «verificado»", () => {
  const c = setup();
  const p1 = buy(c, "120");
  const na = refund(c, p1, "30", sinAcreditar);
  let a = m(c, c.A.id);
  expect([a.compras.devoluciones.valor, a.compras.neto.valor]).toEqual(["0.00", "120.00"]);
  expect(a.devoluciones.sinAcreditacion).toEqual([na]);
  expect(a.cobertura.estado).toBe("Parcial");
  expect(a.compras.neto.estado).toBe("Parcial");
  expect(a.compras.neto.motivo).toContain(na);
  const p2 = buy(c, "100", { fecha: "2026-07-06" });
  const rv = refund(c, p2, "12", { estado: "Revisar" });
  a = m(c, c.A.id);
  expect(a.devoluciones.revisar).toEqual([rv]);
  expect(a.compras.devoluciones.valor).toBe("0.00");
  expect(a.compras.neto.valor).toBe("220.00");
  expect(a.compras.neto.motivo).toContain("Revisar");
  expect(a.faltaPorReponer.valor).toBeNull();
  c.db.close();
});

test("F2B-05 (AC-D23/AC-D04): sinVinculo no netea; en ING degrada la cobertura, en otro saldo solo se informa", () => {
  const c = setup();
  buy(c, "100");
  const huerfanaIng = add(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-07-10",
    importe: "11",
    saldo: c.ing.id,
    partida: c.food.id,
    concepto: "Huérfana ficticia",
    nota: "",
  }).movimiento.id as string;
  let a = m(c, c.A.id);
  expect(a.compras.devoluciones.valor).toBe("0.00");
  expect(a.compras.neto.valor).toBe("100.00");
  expect(a.devoluciones.sinVinculo).toEqual([huerfanaIng]);
  expect(a.cobertura.estado).toBe("Parcial");
  const huerfanaOtro = add(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-07-11",
    importe: "7",
    saldo: c.other.id,
    concepto: "Huérfana ajena ficticia",
    nota: "",
  }).movimiento.id as string;
  a = m(c, c.A.id);
  expect(a.devoluciones.sinVinculo).toEqual([huerfanaIng]);
  expect(a.devoluciones.noAtribuibles).toEqual([huerfanaOtro]);
  c.db.close();
});

test("F2B-06 (AC-D02/AC-D18): reclasificar la compra (etiqueta) mueve bruto y descuento juntos, sin copias legacy", () => {
  const c = setup();
  const p = buy(c, "120");
  const dev = refund(c, p, "30");
  // Copia legacy contradictoria (fixture SQL ficticio): no debe prevalecer.
  c.db.run("UPDATE movimiento_devolucion SET partida=? WHERE movimiento=?", [c.leisure.id, dev]);
  c.db.run("UPDATE movimientos SET partida=? WHERE id=?", [c.leisure.id, dev]);
  let a = m(c, c.A.id);
  expect([a.compras.bruto.valor, a.compras.devoluciones.valor, a.compensable.bruto.valor]).toEqual([
    "120.00",
    "30.00",
    "0.00",
  ]);
  writeComidaMetadata(
    c.db,
    p,
    { revision: 1, etiqueta: "Ocio", motivo: "Reclasificación ficticia" },
    randomUUID(),
    now,
  );
  a = m(c, c.A.id);
  expect([a.compras.bruto.valor, a.compras.devoluciones.valor, a.compras.neto.valor]).toEqual([
    "0.00",
    "0.00",
    "0.00",
  ]);
  expect([a.compensable.bruto.valor, a.compensable.devoluciones.valor, a.compensable.neto.valor]).toEqual([
    "120.00",
    "30.00",
    "90.00",
  ]);
  expect(a.compensable.devoluciones.ids).toEqual([dev]);
  c.db.close();
});

test("F2B-07: Comida sin clasificación requerida → sinClasificacion visible; sin descontar dos veces", () => {
  const c = setup();
  const p = buy(c, "120");
  // Fixture SQL ficticio: la Partida pierde su Subcategoría (clasificación requerida ausente).
  c.db.run("PRAGMA foreign_keys=OFF");
  c.db.run("UPDATE partidas SET padre='SUB999' WHERE id=?", [c.food.id]);
  refund(c, p, "30");
  const a = m(c, c.A.id);
  expect(a.compras.neto.valor).toBe("90.00");
  expect(a.compras.neto.estado).toBe("Parcial");
  expect(a.cobertura.motivos.join(" ")).toContain("sinClasificacion");
  c.db.close();
});

test("F2B-08 (AC-D20/AC-D18): reconciliación al céntimo Plan = Dprima = Comida para el mismo conjunto de compras", () => {
  const c = setup();
  const p1 = buy(c, "120.35");
  const p2 = buy(c, "80.10", { fecha: "2026-07-10" });
  const p3 = buy(c, "40", { fecha: "2026-07-11" });
  refund(c, p1, "30.07");
  refund(c, p1, "40.05", {}, { fecha: "2026-08-02" });
  refund(c, p2, "80.10", {}, { fecha: "2026-08-03" });
  refund(c, p3, "9", sinAcreditar);
  const a = m(c, c.A.id);
  const pl = plan(c, c.A.id);
  const dp = dprima(c, c.A.id, c.food.id);
  expect([a.compras.bruto.valor, a.compras.devoluciones.valor, a.compras.neto.valor]).toEqual([
    "240.45",
    "150.22",
    "90.23",
  ]);
  expect([pl.bruto, pl.devoluciones, pl.ejecutado]).toEqual(["240.45", "150.22", "90.23"]);
  expect([dp.bruto, dp.devoluciones, dp.ejecutado]).toEqual(["240.45", "150.22", "90.23"]);
  // Misma pieza común por IDs de compras.
  const d = descuentoPorCompras(c.db, [p1, p2, p3]);
  expect([...d.values()].reduce((s, x) => s + x.descuentoEconomico, 0n)).toBe(15022n);
  // La no acreditada coincide en cobertura Parcial en las tres vistas.
  expect([a.cobertura.estado, pl.cobertura, dp.cobertura]).toEqual(["Parcial", "Parcial", "Parcial"]);
  c.db.close();
});
