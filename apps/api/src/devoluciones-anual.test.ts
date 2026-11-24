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
  NOTA_TEMPORAL_GRE,
  type AnnualProvider,
  type AnnualSources,
} from "./plan-anual";
import { ledgerRows } from "./movement-ledger";
import { descuentoPorCompras } from "./devoluciones";
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
  // Ciclo financiado por el maestro: el ciclo que empieza el 20-dic financia enero de 2027
  // (mes del maestro, no el año del Inicio), y aun así la compra del 28-dic es natural 2026.
  const dec = c.db
    .query("SELECT mes_financiado m FROM ciclos WHERE inicio='2026-12-20'")
    .get() as { m: string };
  expect(dec.m).toBe("2027-01-01");
  expect(y26.hechos[0].fecha).toBe("2026-12-28");
  expect(y27 === undefined || y27.hechos.length === 0).toBe(true);
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
  const absent = annualExecution(c.b.id, 2026, ledgerRows(c.db), sources(), now, new Map());
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

test("F2A2-07: el mapa de descuentos es obligatorio; compras sin devoluciones dan bruto con descuento cero explicito; mapa incompleto no es verificable", () => {
  const c = setup();
  const compra = buy(c, "120");
  const rows = ledgerRows(c.db);
  // @ts-expect-error omitir `descuentos` no compila: no hay fallback silencioso a bruto.
  const omitted = () => annualExecution(c.a.id, 2026, rows, sources(), now);
  expect(typeof omitted).toBe("function");
  // Cero explicito calculado por la pieza comun: bruto, cobertura completa.
  const zero = annualExecution(c.a.id, 2026, rows, sources(), now, descuentoPorCompras(c.db, [compra]));
  expect([zero.ejecutado, zero.brutoRegistrado, zero.devoluciones.descuentoAtribuido, zero.devoluciones.cobertura]).toEqual([
    "120.00",
    "120.00",
    "0.00",
    "Completa",
  ]);
  // Mapa incompleto: la ausencia NO se lee como descuento cero ni cobertura completa.
  const missing = annualExecution(c.a.id, 2026, rows, sources(), now, new Map());
  expect(missing.ejecutado).toBeNull();
  expect(missing.cobertura).toBe("Parcial");
  expect(missing.motivo).toContain("Descuento no calculado para 1 compra(s)");
  c.db.close();
});

test("F2A2-08 (AC-D01/D30 parcial): Resumen anual con devoluciones Revisar / No acreditada declara Parcial y causa; GRE correcto; neto 0 no es Cero verificado; nota temporal", () => {
  const c = setup();
  const x = buy(c, "100"), // Revisar: no netea
    y = buy(c, "100", { partida: c.b.id }), // No acreditada: no netea
    z = buy(c, "40", { partida: c.b.id }); // Verificada y acreditada total
  refund(c, x, "12", { estado: "Revisar" });
  refund(c, y, "30", { elegibilidad: "No acreditada", cicloOrigen: undefined, evidenciaOrigenTemporal: undefined });
  refund(c, z, "40");
  for (const [partida, presupuesto] of [[c.a.id, "200"], [c.b.id, "300"]] as const)
    c.db.run(
      "INSERT INTO annual_plan_lines(ejercicio,partida,presupuesto,periodo,esencial,revision) VALUES(2026,?,?,NULL,'No',1)",
      [partida, presupuesto + "00"],
    );
  const r = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), now, { annualProvider: provider });
  const pa = r.carriles.plan.items.find((i) => i.partidaId === c.a.id)!,
    pb = r.carriles.plan.items.find((i) => i.partidaId === c.b.id)!;
  expect([pa.ejecutado.valor, pa.ejecutado.estado, pa.cobertura.estado]).toEqual(["100.00", "Parcial", "Parcial"]);
  expect(pa.ejecutado.motivo).toContain("revisar");
  expect(pa.diferencia!.estado).toBe("Parcial");
  expect(pa.diferencia!.motivo).toContain("provisional");
  expect(pa.diferencia!.motivo).not.toContain("verificado.");
  // GRE de b: 100 + 40 - (0 + 40) = 100; parcial por sinAcreditacion, nunca «Cero verificado».
  expect([pb.ejecutado.valor, pb.ejecutado.estado]).toEqual(["100.00", "Parcial"]);
  expect(pb.ejecutado.motivo).toContain("sinAcreditacion");
  expect(r.carriles.plan.estado).toBe("Parcial");
  // Nota temporal visible en la métrica y en la API del Plan anual (la web la muestra).
  expect(pa.ejecutado.motivo).toContain("devoluciones posteriores al corte");
  expect(getAnnualPlan(c.db, 2026, now, provider).fuentes.notaTemporal).toBe(NOTA_TEMPORAL_GRE);
  c.db.close();
  // Neto 0 con hechos y devoluciones completas: «Verificado», no «Cero verificado».
  const d = setup();
  const k = buy(d, "40");
  refund(d, k, "40");
  d.db.run(
    "INSERT INTO annual_plan_lines(ejercicio,partida,presupuesto,periodo,esencial,revision) VALUES(2026,?,'10000',NULL,'No',1)",
    [d.a.id],
  );
  const r2 = resumenAnual(d.db, new URLSearchParams({ ejercicio: "2026" }), now, { annualProvider: provider });
  const it = r2.carriles.plan.items.find((i) => i.partidaId === d.a.id)!;
  expect([it.ejecutado.valor, it.ejecutado.estado]).toEqual(["0.00", "Verificado"]);
  expect(it.ejecutado.motivo).toContain("devoluciones posteriores al corte");
  d.db.close();
});
