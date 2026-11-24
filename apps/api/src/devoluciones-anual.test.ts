import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { createSaldo } from "./saldos";
import { createClassification } from "./clasificacion";
import { createCycle, cycleContext } from "./ciclos";
import { previewMovement, writeMovement } from "./movimientos";
import { createReference } from "./referencias";
import { getVehicle } from "./vehiculos";
import { resumenAnual } from "./resumen-anual";
import {
  annualExecution,
  getAnnualPlan,
  type AnnualProvider,
  type AnnualSources,
} from "./plan-anual";
import { ledgerRows } from "./movement-ledger";
import { gateAbiertoParaPruebas } from "../test-support/devolucion-gate-abierto";

/**
 * #538 F2a-2 · Plan anual y Vehículos netean SOLO el descuento de las compras
 * del ejercicio natural (fecha de COMPRA). SQLite ficticia en memoria.
 */
const now = Date.parse("2027-02-10T12:00:00Z");
process.env.NODE_ENV = "test";

const sources = (): AnnualSources => ({
  revision: "fixture-f2a2",
  control: { inicio: "2026-01-01", fin: "2027-12-31" },
  historico: [],
  historicoDisponible: true,
  protecciones: [],
  cierresDisponibles: true,
});
const provider: AnnualProvider = () => sources();

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
    { nombre: "Sub ficticia", padre: cat.id },
    randomUUID(),
  );
  const mkP = (nombre: string) =>
    createClassification(db, "partidas", { nombre, padre: sub.id }, randomUUID());
  const a = mkP("Mantenimiento ficticio"),
    b = mkP("Otra partida ficticia");
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
  const account = mk("Cuenta ficticia", "5000"),
    other = mk("Otra cuenta ficticia", "100");
  const cycles = ["2026-12-20", "2027-01-20"].map(
    (inicio) =>
      createCycle(
        db,
        { inicio, saldoInicialComida: "0", contextRevision: cycleContext(db).revision },
        randomUUID(),
        now,
      ).ciclo,
  );
  const ref = (nombre: string) =>
    createReference(
      db,
      { nombre, tipo: "Vehículo", vehiculo: { matricula: nombre, proximaITV: "2027-09-12" } },
      randomUUID(),
      now,
    );
  return { db, a, b, account, other, cycles, ref };
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
function buy(c: Ctx, importe: string, over: Record<string, unknown> = {}) {
  return add(c.db, {
    tipo: "Gasto",
    fecha: "2026-12-28",
    importe,
    saldo: c.account.id,
    partida: c.a.id,
    concepto: `Compra ficticia ${++seq}`,
    nota: "",
    ...over,
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
    fecha: "2027-01-25",
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
      cicloOrigen: c.cycles[0].id,
      evidenciaOrigenTemporal: "Documento ficticio",
      ...link,
    },
  }).movimiento.id as string;
}
const item = (c: Ctx, year: number, partida: string) => {
  const p = getAnnualPlan(c.db, year, now, provider);
  return [...p.items, ...p.sinLinea].find((i) => i.partida.id === partida);
};
const annual = (c: Ctx, year: number, partida = c.a.id) =>
  annualExecution(partida, year, ledgerRows(c.db), sources(), now, undefined);

test("F2A2-01 (AC-D07/D29): frontera - compra dic 2026 + abono ene 2027: natural 2026 netea, 2027 no; ciclo por maestro; sin suma de ciclos", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "30");
  const y26 = item(c, 2026, c.a.id)!;
  expect([y26.brutoRegistrado, y26.devoluciones.descuentoAtribuido, y26.ejecutado]).toEqual([
    "120.00",
    "30.00",
    "90.00",
  ]);
  expect(y26.hechos).toEqual([
    { id: compra, fecha: "2026-12-28", importe: "120.00", descuento: "30.00" },
  ]);
  // El abono de enero NO mueve la compra de ejercicio: 2027 no ve compra ni descuento.
  const y27 = item(c, 2027, c.a.id);
  expect(y27 === undefined || (y27.ejecutado === "0.00" && y27.hechos.length === 0)).toBe(true);
  // Sin pasar `descuentos`, el motor conserva el bruto (contrato pre-F2a-2 de la función pura).
  expect(annual(c, 2026).ejecutado).toBe("120.00");
  // Ciclo financiado por el maestro: compra y abono caen en ciclos distintos, y el
  // ejercicio natural NO se obtiene sumando ciclos ni por la fecha del abono.
  const [cA, cB] = c.cycles;
  expect(cA.inicio <= "2026-12-28" && "2026-12-28" < cB.inicio).toBe(true);
  expect("2027-01-25" >= cB.inicio).toBe(true);
  c.db.close();
});

test("F2A2-02 (AC-D29): Vehiculos - dos REF de la misma Partida, devolucion en otro ano: solo cambia el vehiculo y el ano de la compra", () => {
  const c = setup();
  const r1 = c.ref("Coche uno"),
    r2 = c.ref("Coche dos");
  const x = buy(c, "100", { referencia: r1.id }),
    y = buy(c, "50", { referencia: r2.id }),
    enero27 = buy(c, "40", { referencia: r1.id, fecha: "2027-01-05" });
  refund(c, x, "30");
  const g = (r: string, year: string) => getVehicle(c.db, r, year, now, provider).gastoAnual!;
  const v1 = g(r1.id, "2026"),
    v2 = g(r2.id, "2026");
  expect([v1.totalAlCorte, v1.subtotalRegistrado]).toEqual(["70.00", "70.00"]);
  expect(v1.resultadosPorPartida[0].devoluciones.descuentoAtribuido).toBe("30.00");
  // Otra REF de la misma Partida no se contamina con la devolucion de x.
  expect([v2.totalAlCorte, v2.devoluciones.descuentoAtribuido]).toEqual(["50.00", "0.00"]);
  // El ejercicio 2027 del mismo vehiculo no recibe el abono de enero 2027.
  const v1_27 = g(r1.id, "2027");
  expect([v1_27.totalAlCorte, v1_27.devoluciones.descuentoAtribuido]).toEqual(["40.00", "0.00"]);
  expect(enero27).toBeTruthy();
  c.db.close();
});

test("F2A2-03 (AC-D29): neto 0 con hechos es distinto de ausencia (Plan anual y Vehiculos)", () => {
  const c = setup();
  const r1 = c.ref("Coche uno");
  const x = buy(c, "40", { referencia: r1.id });
  refund(c, x, "40");
  const withFacts = item(c, 2026, c.a.id)!;
  expect([withFacts.ejecutado, withFacts.hechos.length, withFacts.netoCeroConHechos]).toEqual(["0.00", 1, true]);
  const absent = annualExecution(c.b.id, 2026, ledgerRows(c.db), sources(), now, undefined);
  expect([absent.ejecutado, absent.hechos.length, absent.netoCeroConHechos]).toEqual(["0.00", 0, false]);
  const v = getVehicle(c.db, r1.id, "2026", now, provider).gastoAnual!;
  expect([v.totalAlCorte, v.hechosConocidos, v.netoCeroConHechos, v.ceroVerificado]).toEqual(["0.00", 1, true, false]);
  const empty = getVehicle(c.db, c.ref("Sin gasto").id, "2026", now, provider).gastoAnual!;
  expect([empty.totalAlCorte, empty.netoCeroConHechos, empty.ceroVerificado]).toEqual(["0.00", false, true]);
  c.db.close();
});

test("F2A2-04 (AC-D02/D18): reclasificar la compra mueve bruto y descuento de Partida anual", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "30");
  c.db.run("UPDATE movimientos SET partida=? WHERE id=?", [c.b.id, compra]);
  const a = item(c, 2026, c.a.id);
  expect(a === undefined || a.hechos.length === 0).toBe(true);
  expect(item(c, 2026, c.b.id)).toMatchObject({ brutoRegistrado: "120.00", ejecutado: "90.00" });
  c.db.close();
});

test("F2A2-05 (AC-D04): sin vinculo no netea; Revisar y No acreditada declaran causa; descuento > compra no verificable", () => {
  const c = setup();
  const compra = buy(c, "100");
  add(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2027-01-25",
    importe: "11",
    saldo: c.other.id,
    partida: c.a.id,
    concepto: "Huérfana ficticia",
    nota: "",
  });
  let r = item(c, 2026, c.a.id)!;
  expect([r.ejecutado, r.devoluciones.descuentoAtribuido]).toEqual(["100.00", "0.00"]);
  refund(c, compra, "12", { estado: "Revisar" });
  r = item(c, 2026, c.a.id)!;
  expect([r.ejecutado, r.devoluciones.cobertura, r.devoluciones.causas]).toEqual(["100.00", "Parcial", ["revisar"]]);
  c.db.close();
  const d = setup();
  const k = buy(d, "100");
  refund(d, k, "30", { elegibilidad: "No acreditada", cicloOrigen: undefined, evidenciaOrigenTemporal: undefined });
  r = item(d, 2026, d.a.id)!;
  expect([r.ejecutado, r.devoluciones.cobertura, r.devoluciones.causas]).toEqual(["100.00", "Parcial", ["sinAcreditacion"]]);
  d.db.close();
  // Exceso: la pieza comun lo declara; el motor anual no verifica la ejecucion.
  const e = setup();
  const q = buy(e, "100");
  const over = new Map([
    [q, { compra: q, descuentoEconomico: 15000n, devueltoVerificado: 15000n, pendienteRevision: 0n, exceso: true, cobertura: "Parcial" as const, causas: [], devoluciones: ["x"] }],
  ]);
  const ex = annualExecution(e.a.id, 2026, ledgerRows(e.db), sources(), now, over);
  expect(ex.ejecutado).toBeNull();
  expect(ex.motivo).toContain("Devolución superior a la compra");
  e.db.close();
});

test("F2A2-06 (AC-D01/D30 parcial): Resumen anual consume el neto y neto 0 con hechos no es Cero verificado", () => {
  const c = setup();
  const x = buy(c, "120"),
    y = buy(c, "40", { partida: c.b.id });
  refund(c, x, "30");
  refund(c, y, "40");
  for (const [partida, presupuesto] of [[c.a.id, "200"], [c.b.id, "100"]] as const)
    c.db.run(
      "INSERT INTO annual_plan_lines(ejercicio,partida,presupuesto,periodo,esencial,revision) VALUES(2026,?,?,NULL,'No',1)",
      [partida, presupuesto + "00"],
    );
  const r = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), now, { annualProvider: provider });
  const pa = r.carriles.plan.items.find((i) => i.partidaId === c.a.id)!,
    pb = r.carriles.plan.items.find((i) => i.partidaId === c.b.id)!;
  expect([pa.ejecutado.valor, pa.ejecutado.estado]).toEqual(["90.00", "Verificado"]);
  expect([pb.ejecutado.valor, pb.ejecutado.estado]).toEqual(["0.00", "Verificado"]);
  c.db.close();
});
