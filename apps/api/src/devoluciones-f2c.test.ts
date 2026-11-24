import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { createSaldo, getSaldo } from "./saldos";
import { createClassification } from "./clasificacion";
import { createCycle, cycleContext } from "./ciclos";
import { previewMovement, writeMovement } from "./movimientos";
import {
  confirmPartidaConfig,
  getPlanMensualDprima,
  previewPartidaConfig,
} from "./dprima";
import { getCyclePlan } from "./planes-ciclo";
import { monthlyFlow } from "./flujo-mensual";
import { resumenInicio } from "./resumen-inicio";
import { resumenAnual } from "./resumen-anual";
import { getAnnualPlan, type AnnualHistory, type AnnualProvider } from "./plan-anual";
import {
  createCompartido,
  createParticipante,
  getCompartido,
} from "./compartidos";
import { gateAbiertoParaPruebas } from "../test-support/devolucion-gate-abierto";

/**
 * #538 F2c · Flujo base, ajusteCompartidos/flujoAjustado, Resumen anual e Inicio
 * sobre la proyección única de devoluciones (SPEC39 §2, §10; AC-D01/D30/D31/D32/D34).
 * SQLite ficticia en memoria; ningún dato real.
 */
const now = Date.parse("2026-10-21T12:00:00Z");
process.env.NODE_ENV = "test";

function setup(
  inicios = ["2026-06-20", "2026-07-20", "2026-08-20", "2026-09-20"],
  at = now,
) {
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
      at,
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
      at,
    );
  const account = mk("Cuenta ficticia", "5000");
  const other = mk("Otra cuenta ficticia", "100");
  const cycles = inicios.map(
    (inicio) =>
      createCycle(
        db,
        { inicio, saldoInicialComida: "0", contextRevision: cycleContext(db).revision },
        randomUUID(),
        at,
      ).ciclo,
  );
  return { db, food, leisure, account, other, A: cycles[0], B: cycles[1], cycles, at };
}
type Ctx = ReturnType<typeof setup>;

function add(c: Ctx, body: Record<string, unknown>) {
  const plan = previewMovement(c.db, body, null, false, c.at);
  return writeMovement(
    c.db,
    { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    randomUUID(),
    null,
    false,
    c.at,
    undefined,
    gateAbiertoParaPruebas,
  );
}
let seq = 0;
/** Compra en el ciclo A (2026-06-20 .. 2026-07-19) salvo que se indique otra. */
function buy(c: Ctx, importe: string, over: Record<string, unknown> = {}) {
  return add(c, {
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
/** Abono por defecto en el ciclo B (2026-07-20 .. 2026-08-19), otro receptor. */
function refund(
  c: Ctx,
  compra: string,
  importe: string,
  link: Record<string, unknown> = {},
  over: Record<string, unknown> = {},
) {
  return add(c, {
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
const flow = (c: Ctx, ciclo: string) => monthlyFlow(c.db, ciclo, c.at);
const plan = (c: Ctx, ciclo: string, presupuesto = "PRE900") =>
  getCyclePlan(c.db, ciclo, c.at).items.find((i) => i.presupuesto.id === presupuesto)!;
const dprima = (c: Ctx, ciclo: string, raiz: string = c.food.id) =>
  getPlanMensualDprima(c.db, ciclo, c.at).items.find((i) => i.raiz === raiz)!;
const cents = (v: string | null) => BigInt(v!.replace(".", ""));
const decimalSum = (v: string, euros: bigint) => {
  const n = cents(v) + euros * 100n;
  return `${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
};
type Anual = ReturnType<typeof resumenAnual>;
/** GRE natural de una Partida (publicado por Partida, sin total anual). */
const nat = (r: Anual, partida: string) =>
  r.carriles.plan.gastoRealEconomicoNatural.partidas.find((p) => p.partidaId === partida);

const tablasLectura = [
  "movimientos",
  "movimiento_devolucion",
  "movimiento_devolucion_audit",
  "saldos",
  "ciclos",
];
function snapshot(db: Database) {
  return tablasLectura.map(
    (t) => [t, db.query(`SELECT * FROM ${t} ORDER BY rowid`).all()] as const,
  );
}
function dirtyTables(db: Database) {
  return (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%dirty%' OR name LIKE '%impact%')")
      .all() as { name: string }[]
  ).map(({ name }) => [name, db.query(`SELECT * FROM "${name}"`).all()] as const);
}

test("F2C-01 (AC-D32): sin devolución no hay regresión: gasto bruto = GRE y la fórmula base no cambia", () => {
  const c = setup();
  buy(c, "120");
  const f = flow(c, c.A.id);
  expect(f.metrics.gasto.subtotal).toBe("120.00");
  expect(f.gastoRealEconomico.subtotal).toBe("120.00");
  expect(f.gastoRealEconomico.bruto).toBe("120.00");
  expect(f.gastoRealEconomico.descuentoEconomico).toBe("0.00");
  expect(f.gastoRealEconomico.devoluciones).toMatchObject({ cobertura: "Completa", causas: [], exceso: false });
  // Sin cobros comerciales: ausencia, no cero inventado.
  expect(f.metrics.devolucionesCobradas.subtotal).toBeNull();
  expect(f.metrics.devolucionesCobradas.estado).toBe("No disponible");
  expect(f.metrics.operativo.subtotal ?? f.metrics.operativo.valor).toBeNull();
  c.db.close();
});

test("F2C-02 (AC-D32/D01): devolución parcial en el MISMO ciclo: gasto y S brutos intactos; GRE 90; cobro 30 aparte por fecha real", () => {
  const c = setup();
  const compra = buy(c, "120");
  add(c, { tipo: "Ingreso", fecha: "2026-07-06", importe: "1000", saldo: c.account.id, subtipo: "Nómina", concepto: "Ingreso ficticio", nota: "" });
  const antes = flow(c, c.A.id);
  refund(c, compra, "30", {}, { fecha: "2026-07-10" });
  const f = flow(c, c.A.id);
  // Fórmula base bruta: ni gasto ni S se mueven.
  expect(f.metrics.gasto.subtotal).toBe(antes.metrics.gasto.subtotal);
  expect(f.metrics.gasto.subtotal).toBe("120.00");
  expect(f.metrics.operativo.valor ?? f.metrics.operativo.subtotal).toBe(
    antes.metrics.operativo.valor ?? antes.metrics.operativo.subtotal,
  );
  expect(f.metrics.ingresos.subtotal).toBe("1000.00"); // la devolución no es Ingreso
  expect(f.gastoRealEconomico).toMatchObject({ bruto: "120.00", descuentoEconomico: "30.00", subtotal: "90.00" });
  expect(f.metrics.devolucionesCobradas.subtotal).toBe("30.00");
  expect(f.metrics.devolucionesCobradas.ids).toHaveLength(1);
  expect(f.exclusionesDevoluciones.length).toBeGreaterThan(0);
  // Misma cifra que Plan de ciclo y Dprima para el mismo conjunto de compras.
  expect(f.gastoRealEconomico.subtotal).toBe(plan(c, c.A.id).ejecutado!);
  expect(f.gastoRealEconomico.subtotal).toBe(dprima(c, c.A.id).ejecutado!);
  c.db.close();
});

test("F2C-03 (AC-D32/D34): abono en OTRO ciclo: GRE retroactivo en el ciclo de la compra, flujo bancario en el del abono", () => {
  const c = setup();
  const compra = buy(c, "120");
  buy(c, "40", { fecha: "2026-07-25" }); // compra propia de B
  const antes = { a: flow(c, c.A.id), b: flow(c, c.B.id) };
  const posAntes = { cuenta: getSaldo(c.db, c.account.id).posicion.importe, otra: getSaldo(c.db, c.other.id).posicion.importe };
  refund(c, compra, "30");
  // Banco real por el motor de posiciones: solo el receptor sube 30; la cuenta de la compra no se mueve.
  expect(getSaldo(c.db, c.other.id).posicion.importe).toBe(decimalSum(posAntes.otra!, 30n));
  expect(getSaldo(c.db, c.account.id).posicion.importe).toBe(posAntes.cuenta!);
  const a = flow(c, c.A.id);
  const b = flow(c, c.B.id);
  // A: bruto igual; GRE baja; el abono no está en A.
  expect(a.metrics.gasto.subtotal).toBe(antes.a.metrics.gasto.subtotal);
  expect(a.gastoRealEconomico.subtotal).toBe("90.00");
  expect(a.metrics.devolucionesCobradas.subtotal).toBeNull();
  // B: GRE sin cambio (no recibe gasto negativo); el cobro aparece por su fecha real.
  expect(b.metrics.gasto.subtotal).toBe(antes.b.metrics.gasto.subtotal);
  expect(b.gastoRealEconomico.subtotal).toBe(antes.b.gastoRealEconomico.subtotal);
  expect(b.gastoRealEconomico.subtotal).toBe("40.00");
  expect(b.metrics.devolucionesCobradas.subtotal).toBe("30.00");
  // Conciliación con Plan y Dprima (A y B) al céntimo.
  expect(a.gastoRealEconomico.subtotal).toBe(plan(c, c.A.id).ejecutado!);
  expect(b.gastoRealEconomico.subtotal).toBe(plan(c, c.B.id).ejecutado!);
  expect(a.gastoRealEconomico.subtotal).toBe(dprima(c, c.A.id).ejecutado!);
  expect(b.gastoRealEconomico.subtotal).toBe(dprima(c, c.B.id).ejecutado!);
  expect(dprima(c, c.B.id).abonosVinculadosVerificados).toBe(b.metrics.devolucionesCobradas.subtotal!);
  // Banco real: el receptor sube 30 con la fecha del abono, no en A.
  const dev = c.db.query("SELECT fecha,destino FROM movimientos WHERE tipo='Devolución de gasto'").get() as { fecha: string; destino: string };
  expect(dev).toEqual({ fecha: "2026-08-10", destino: c.other.id });
  c.db.close();
});

test("F2C-04 (AC-D01): devolución total: GRE 0,00 con hechos (no null), bruto conservado", () => {
  const c = setup();
  const compra = buy(c, "121.45");
  refund(c, compra, "121.45");
  const f = flow(c, c.A.id);
  expect(f.gastoRealEconomico.subtotal).toBe("0.00");
  expect(f.gastoRealEconomico.estado).toBe("Parcial");
  expect(f.gastoRealEconomico.bruto).toBe("121.45");
  expect(f.metrics.gasto.subtotal).toBe("121.45");
  // Sin compras en el ciclo, en cambio, es ausencia (null), nunca «0.00».
  const b = flow(c, c.B.id);
  expect(b.gastoRealEconomico.subtotal).toBeNull();
  expect(b.gastoRealEconomico.estado).toBe("No disponible");
  c.db.close();
});

test("F2C-05 (AC-D01/D32): no acreditada, Revisar y sin vínculo no netean y declaran cobertura parcial con causa", () => {
  const c = setup();
  const x = buy(c, "100");
  const y = buy(c, "50");
  const z = buy(c, "30");
  refund(c, x, "10", sinAcreditar);
  refund(c, y, "5", { estado: "Revisar" });
  add(c, { tipo: "Devolución de gasto", fecha: "2026-07-12", importe: "7", saldo: c.other.id, concepto: "Huérfana ficticia", nota: "" });
  const f = flow(c, c.A.id);
  expect(f.gastoRealEconomico.subtotal).toBe("180.00");
  expect(f.gastoRealEconomico.descuentoEconomico).toBe("0.00");
  expect(f.gastoRealEconomico.devoluciones.cobertura).toBe("Parcial");
  expect(f.gastoRealEconomico.devoluciones.causas).toEqual(["sinVinculo", "revisar", "sinAcreditacion"]);
  expect(f.gastoRealEconomico.devoluciones.sinVinculoEnIntervalo).toHaveLength(1);
  expect(f.gastoRealEconomico.motivo).toContain("no se netean");
  // El flujo bancario sí ve el hecho (huérfana en A); no netea, no se atribuye.
  expect(f.metrics.devolucionesCobradas.subtotal).toBe("7.00");
  expect(z).toBeTruthy();
  c.db.close();
});

test("F2C-06 (AC-D01): exceso histórico: GRE no disponible (sin max(0)) y cobertura parcial", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "100");
  c.db.run("DROP TRIGGER IF EXISTS movimiento_devolucion_integrity");
  c.db.run("UPDATE movimientos SET importe=5000 WHERE id=?", [compra]);
  const f = flow(c, c.A.id);
  expect(f.gastoRealEconomico.subtotal).toBeNull();
  expect(f.gastoRealEconomico.estado).toBe("No disponible");
  expect(f.gastoRealEconomico.devoluciones.exceso).toBe(true);
  expect(f.metrics.gasto.subtotal).toBe("50.00"); // bruto intacto
  c.db.close();
});

test("F2C-07 (AC-D32): revisión del flujo cambia al acreditar un vínculo aunque la fila bancaria no cambie", () => {
  const c = setup();
  const compra = buy(c, "100");
  const dev = refund(c, compra, "20", sinAcreditar);
  const r1 = flow(c, c.A.id);
  expect(r1.gastoRealEconomico.subtotal).toBe("100.00");
  c.db.run(
    "UPDATE movimiento_devolucion SET elegibilidad='Acreditada',evidencia_origen_temporal='Doc',evidencia_relacion='Ev',ciclo_origen=?,revision=revision+1 WHERE movimiento=?",
    [c.A.id, dev],
  );
  const r2 = flow(c, c.A.id);
  expect(r2.gastoRealEconomico.subtotal).toBe("80.00");
  expect(r2.revision).not.toBe(r1.revision);
  c.db.close();
});

test("F2C-08 (AC-D32): ajusteCompartidos/flujoAjustado sin doble descuento y sin absorber el descuento comercial", () => {
  const c = setup();
  const created = createCompartido(c.db, { nombre: "Caso compartido ficticio" }, randomUUID(), c.at);
  const ref = created.referencia.id;
  for (const p of [
    { nombre: "Yo", rol: "Titular" as const, partes: 1 },
    { nombre: "Bea", rol: "Tercero" as const, partes: 1 },
  ])
    createParticipante(c.db, ref, p, randomUUID(), c.at);
  const bea = getCompartido(c.db, ref).participantes.find((p) => p.nombre === "Bea")!;
  // CAT013 es la categoría de Gastos compartidos: se crean CAT002..CAT013 (11-13 con Referencia).
  for (let i = 2; i <= 13; i++)
    createClassification(
      c.db,
      "categorias",
      { nombre: "Categoría ficticia " + i, anual: "Gasto", mensual: "Gasto", referencia: [11, 12, 13].includes(i) },
      randomUUID(),
    );
  const sub13 = createClassification(c.db, "subcategorias", { nombre: "Sub compartida ficticia", padre: "CAT013" }, randomUUID());
  const shared = createClassification(c.db, "partidas", { nombre: "Partida compartida ficticia", padre: sub13.id }, randomUUID()).id;
  const gasto = buy(c, "400", { partida: shared, referencia: ref, fecha: "2026-07-05" });
  add(c, {
    tipo: "Transferencia",
    fecha: "2026-07-10",
    importe: "150",
    origen: "S000",
    destino: c.other.id,
    referencia: ref,
    concepto: "Aportación ficticia",
    nota: "",
    compartido: { participante: bea.id, evidencia: "Extracto ficticio", procedencia: "Documento bancario" },
  });
  const antes = flow(c, c.A.id);
  refund(c, gasto, "100", {}, { fecha: "2026-07-12" });
  const f = flow(c, c.A.id);
  expect(antes.ajusteCompartidos.recuperado.importe).toBe("150.00");
  // El descuento comercial no entra en Recuperado ni se resta otra vez: G_b sigue bruto.
  expect(f.ajusteCompartidos.recuperado.importe).toBe(antes.ajusteCompartidos.recuperado.importe);
  expect(f.ajusteCompartidos.base.importe).toBe(antes.ajusteCompartidos.base.importe);
  expect(f.ajusteCompartidos.gastoNeto.importe).toBe("250.00"); // 400 − 150
  expect(f.ajusteCompartidos.resultadoAjustado.importe).toBe(antes.ajusteCompartidos.resultadoAjustado.importe);
  expect(f.flujoAjustado.ajuste).toMatchObject({ rAdj: "150.00", gNeto: "250.00" });
  expect(f.ajusteCompartidos.recuperado.gastos.map((g) => g.fuenteId)).not.toContain(
    f.gastoRealEconomico.devoluciones.ids[0],
  );
  // El GRE es otro bloque: 400 − 100, distinto del gasto neto por participantes.
  expect(f.gastoRealEconomico.subtotal).toBe("300.00");
  expect(f.ajusteCompartidos.gastoNeto.importe).not.toBe(f.gastoRealEconomico.subtotal);
  expect(f.flujoAjustado.advertencias.join(" ")).toContain("no es el Gasto real económico (neto)");
  expect(f.flujoAjustado.advertencias.join(" ")).toContain("F6");
  expect(f.ajusteCompartidos.formula).toContain("G_n = G_b − R_adj");
  c.db.close();
});

test("F2C-09 (AC-D31): Inicio: KPI de gasto del ciclo = GRE = Plan = Dprima; «gasto» sigue bruto; saldos y disponibles aparte", () => {
  const c = setup();
  const compra = buy(c, "120");
  buy(c, "40", { fecha: "2026-07-18" });
  refund(c, compra, "30", {}, { fecha: "2026-07-10" });
  const ini = resumenInicio(c.db, c.at);
  const ciclo = ini.secciones.ciclo;
  const cid = ini.contexto.ciclo?.id ?? null;
  expect(cid).toBe(c.A.id);
  expect(ciclo.gasto.etiqueta).toBe("Flujo bancario bruto");
  expect(ciclo.gasto.subtotal).toBe("160.00");
  expect(ciclo.gastoRealEconomico.etiqueta).toBe("Gasto real económico (neto)");
  expect(ciclo.gastoRealEconomico.subtotal).toBe("130.00");
  expect(ciclo.devolucionesCobradas.subtotal).toBe("30.00");
  expect(ciclo.gastoRealEconomico.subtotal).toBe(plan(c, c.A.id).ejecutado!);
  expect(ciclo.gastoRealEconomico.subtotal).toBe(dprima(c, c.A.id).ejecutado!);
  // Sin devoluciones inelegibles, la cobertura de devoluciones es completa (el estado Parcial es el del banco).
  expect(ciclo.gastoRealEconomico.cobertura.motivos).toEqual([]);
  // Saldo real aparte y sin financiación automática: la posición del receptor sube 30 por el abono
  // (hecho bancario) y ninguna sección de objetivo/ahorro cambia por el neteo del GRE.
  const sinDev = setup();
  const compra2 = buy(sinDev, "120");
  buy(sinDev, "40", { fecha: "2026-07-18" });
  const cifras = (d: ReturnType<typeof resumenInicio>) =>
    JSON.stringify(
      [d.secciones.objetivo.metrica, d.secciones.objetivo.mesesCubiertos, d.secciones.ahorro.ahorroResidual].map(
        (m) => [m.valor, m.estado],
      ),
    );
  const objetivoAntes = cifras(resumenInicio(sinDev.db, sinDev.at));
  refund(sinDev, compra2, "30", {}, { fecha: "2026-07-10" });
  const dtoDespues = resumenInicio(sinDev.db, sinDev.at);
  expect(cifras(dtoDespues)).toBe(objetivoAntes);
  expect(getSaldo(sinDev.db, sinDev.other.id).posicion.importe).toBe("130.00");
  sinDev.db.close();
  c.db.close();
});

test("F2C-10 (AC-D31): Inicio declara cobertura parcial con Revisar y la causa; no netea", () => {
  const c = setup();
  const compra = buy(c, "100");
  refund(c, compra, "12", { estado: "Revisar" }, { fecha: "2026-07-10" });
  const g = resumenInicio(c.db, c.at).secciones.ciclo.gastoRealEconomico;
  expect(g.subtotal).toBe("100.00");
  expect(g.motivo).toContain("revisar");
  expect(g.cobertura.motivos.length).toBeGreaterThan(0);
  c.db.close();
});

test("F2C-11 (AC-D30/D32): Resumen anual: cada ciclo coincide con Flujo; bloque GRE natural = Σ Plan anual; bruto, GRE y ajustado separados", () => {
  const c = setup();
  const compra = buy(c, "120");
  const ocio = buy(c, "60", { partida: c.leisure.id });
  refund(c, compra, "30");
  refund(c, ocio, "10", {}, { fecha: "2026-08-11" });
  const r = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), c.at);
  for (const ciclo of r.carriles.realidad.ciclos) {
    const f = flow(c, ciclo.cicloId);
    expect(ciclo.gasto.etiqueta).toBe("Flujo bancario bruto");
    expect(ciclo.gasto.subtotal).toBe(f.metrics.gasto.subtotal);
    expect(ciclo.gastoRealEconomico.subtotal).toBe(f.gastoRealEconomico.subtotal);
    expect(ciclo.devolucionesCobradas.subtotal).toBe(f.metrics.devolucionesCobradas.subtotal);
    expect(ciclo.ajusteCompartidos.gNeto).toBe(f.ajusteCompartidos.gastoNeto.importe);
    expect(ciclo.ajusteCompartidos.sAjustado).toBe(f.ajusteCompartidos.resultadoAjustado.importe);
  }
  const A = r.carriles.realidad.ciclos.find((x) => x.cicloId === c.A.id)!;
  expect(A.gasto.subtotal).toBe("180.00");
  expect(A.gastoRealEconomico.subtotal).toBe("140.00");
  // Natural: misma fuente que Plan anual, por Partida y SIN total (SPEC25 P-10).
  const anual = getAnnualPlan(c.db, 2026, c.at);
  for (const i of [...anual.items, ...anual.sinLinea]) {
    const p = nat(r, i.partida.id)!;
    expect([p.bruto, p.descuentoAtribuido, p.gastoRealEconomico]).toEqual([
      i.brutoRegistrado,
      i.devoluciones.descuentoAtribuido,
      i.subtotalRegistrado,
    ]);
  }
  expect(nat(r, c.food.id)).toMatchObject({ bruto: "120.00", descuentoAtribuido: "30.00", gastoRealEconomico: "90.00" });
  expect(nat(r, c.leisure.id)).toMatchObject({ bruto: "60.00", descuentoAtribuido: "10.00", gastoRealEconomico: "50.00" });
  const natural = r.carriles.plan.gastoRealEconomicoNatural;
  expect(natural.total.estado).toBe("No aplica");
  expect("subtotal" in natural || "valor" in natural).toBe(false);
  expect(natural.etiqueta).toBe("Gasto real económico (neto) · ejercicio natural");
  expect(natural.estado).toBe("Parcial"); // sin control/histórico acreditado
  expect(natural.motivo).toContain("Sin total anual");
  expect(natural.motivo).toContain("vivo");
  // Un año sin compras no hereda ni inventa nada.
  const otro = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2025" }), c.at);
  expect(otro.carriles.plan.gastoRealEconomicoNatural.partidas).toEqual([]);
  expect(otro.carriles.plan.gastoRealEconomicoNatural.estado).toBe("No disponible");
  c.db.close();
});

test("F2C-12 (AC-D30/D01): REF/Partida sin contaminar: la devolución de Supermercado no mueve Ocio ni en Flujo ni en el año natural", () => {
  const c = setup();
  const f1 = buy(c, "120");
  buy(c, "60", { partida: c.leisure.id });
  refund(c, f1, "30");
  const anual = getAnnualPlan(c.db, 2026, c.at);
  const by = (p: string) => [...anual.items, ...anual.sinLinea].find((i) => i.partida.id === p)!;
  expect([by(c.food.id).subtotalRegistrado, by(c.food.id).devoluciones.descuentoAtribuido]).toEqual(["90.00", "30.00"]);
  expect([by(c.leisure.id).subtotalRegistrado, by(c.leisure.id).devoluciones.descuentoAtribuido]).toEqual(["60.00", "0.00"]);
  const r = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), c.at);
  const A = r.carriles.realidad.ciclos.find((x) => x.cicloId === c.A.id)!;
  expect(A.gastoRealEconomico.subtotal).toBe("150.00");
  expect(nat(r, c.food.id)!.gastoRealEconomico).toBe("90.00");
  expect(nat(r, c.leisure.id)!.gastoRealEconomico).toBe("60.00");
  expect(nat(r, c.leisure.id)!.descuentoAtribuido).toBe("0.00");
  c.db.close();
});

test("F2C-13 (AC-D30/D01): frontera diciembre/enero: la compra de diciembre baja en 2026 aunque el abono llegue en enero; no se reparte entre años", () => {
  const at = Date.parse("2027-02-10T12:00:00Z");
  const c = setup(["2026-11-20", "2026-12-20", "2027-01-20"], at);
  const compra = buy(c, "100", { fecha: "2026-12-30" });
  // Abono en enero 2027, ciclo siguiente.
  refund(c, compra, "40", { cicloOrigen: c.cycles[1].id }, { fecha: "2027-01-25" });
  const mid = c.cycles[1];
  const next = c.cycles[2];
  const fm = flow(c, mid.id);
  const fn = flow(c, next.id);
  expect(fm.gastoRealEconomico.subtotal).toBe("60.00");
  expect(fm.metrics.gasto.subtotal).toBe("100.00");
  expect(fm.metrics.devolucionesCobradas.subtotal).toBeNull();
  expect(fn.gastoRealEconomico.subtotal).toBeNull();
  expect(fn.metrics.devolucionesCobradas.subtotal).toBe("40.00");
  const y26 = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), at);
  const y27 = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2027" }), at);
  expect(nat(y26, c.food.id)).toMatchObject({ bruto: "100.00", descuentoAtribuido: "40.00", gastoRealEconomico: "60.00" });
  expect(nat(y27, c.food.id)).toBeUndefined();
  expect(y27.carriles.plan.gastoRealEconomicoNatural.estado).toBe("No disponible");
  // El ciclo que cruza el año aparece en ambos ejercicios con la misma cifra (sin prorrateo).
  const ids = (r: typeof y26) => r.carriles.realidad.ciclos.map((x) => x.cicloId);
  expect(ids(y26)).toContain(mid.id);
  expect(ids(y27)).toContain(mid.id);
  const g = (r: typeof y26) => r.carriles.realidad.ciclos.find((x) => x.cicloId === mid.id)!.gastoRealEconomico.subtotal;
  expect(g(y26)).toBe("60.00");
  expect(g(y27)).toBe("60.00");
  // El cobro de enero 2027 está en el ciclo del abono, no en el de la compra.
  const cobro = (r: typeof y26, id: string) => r.carriles.realidad.ciclos.find((x) => x.cicloId === id)?.devolucionesCobradas.subtotal;
  expect(cobro(y27, next.id)).toBe("40.00");
  expect(cobro(y26, mid.id)).toBeNull();
  c.db.close();
});

test("F2C-14 (AC-D30): con control anual acreditado el natural es Verificado y reconcilia con Plan anual y con el flujo", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "30");
  const provider: AnnualProvider = () => ({
    revision: "proveedor-prueba",
    control: { inicio: "2026-01-01", fin: "2026-12-31" },
    corte: "2026-12-31",
    historico: [],
    historicoDisponible: true,
    protecciones: [],
    cierresDisponibles: true,
  });
  const r = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), c.at, { annualProvider: provider });
  const natural = r.carriles.plan.gastoRealEconomicoNatural;
  expect(natural.estado).toBe("Verificado");
  expect(nat(r, c.food.id)!.gastoRealEconomico).toBe("90.00");
  const anual = getAnnualPlan(c.db, 2026, c.at, provider);
  expect([...anual.items, ...anual.sinLinea].find((i) => i.partida.id === c.food.id)!.ejecutado).toBe("90.00");
  expect(nat(r, c.food.id)!.gastoRealEconomico).toBe(flow(c, c.A.id).gastoRealEconomico.subtotal!);
  // El Ejecutado del carril es la misma cifra.
  expect(r.carriles.plan.items.find((i) => i.partidaId === c.food.id)!.ejecutado.valor).toBe("90.00");
  c.db.close();
});

test("F2C-15 (AC-D01/D30): cobertura parcial en el natural con Revisar; cero neto con hechos distinto de ausencia", () => {
  const c = setup();
  const compra = buy(c, "100");
  refund(c, compra, "10", { estado: "Revisar" });
  const r = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), c.at);
  const n = r.carriles.plan.gastoRealEconomicoNatural;
  expect(nat(r, c.food.id)).toMatchObject({ gastoRealEconomico: "100.00", cobertura: "Parcial", causas: ["revisar"] });
  expect(n.estado).toBe("Parcial");
  expect(n.motivo).toContain("revisar");
  const c2 = setup();
  const t = buy(c2, "50");
  refund(c2, t, "50");
  const r2 = resumenAnual(c2.db, new URLSearchParams({ ejercicio: "2026" }), c2.at);
  // Cero neto con hechos: «0.00», no null ni ausencia.
  expect(nat(r2, c2.food.id)).toMatchObject({ bruto: "50.00", gastoRealEconomico: "0.00", compras: 1 });
  c.db.close();
  c2.db.close();
});

test("F2C-22 (AC-D01): exceso histórico: el natural no publica cifra para la Partida (sin max(0)) y declara que no es verificable", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "100");
  c.db.run("DROP TRIGGER IF EXISTS movimiento_devolucion_integrity");
  c.db.run("UPDATE movimientos SET importe=5000 WHERE id=?", [compra]);
  const r = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), c.at);
  expect(nat(r, c.food.id)).toMatchObject({ exceso: true, gastoRealEconomico: null });
  expect(r.carriles.plan.gastoRealEconomicoNatural.estado).toBe("Parcial");
  expect(r.carriles.plan.gastoRealEconomicoNatural.motivo).toContain("sin max(0)");
  c.db.close();
});

test("F2C-16 (AC-D01): las lecturas son GET puros: no mutan filas, revisiones ni tablas dirty", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "30");
  const antes = { s: snapshot(c.db), d: dirtyTables(c.db) };
  flow(c, c.A.id);
  flow(c, c.B.id);
  resumenInicio(c.db, c.at);
  resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), c.at);
  const despues = { s: snapshot(c.db), d: dirtyTables(c.db) };
  expect(despues).toEqual(antes);
  c.db.close();
});

test("F2C-17 (AC-D01): sin tabla de vínculos pero con abonos bancarios (también de OTRO ciclo) no hay cobertura Completa ni GRE verificado: Parcial con causa sinVinculo", () => {
  const c = setup();
  const compra = buy(c, "50");
  buy(c, "10", { fecha: "2026-07-25" }); // compra del ciclo B, el actual para Inicio
  // Abono bancario real cobrado en OTRO ciclo (B); luego el esquema pierde las tablas de vínculos.
  refund(c, compra, "20");
  c.db.run("DROP TABLE movimiento_devolucion_audit");
  c.db.run("DROP TABLE movimiento_devolucion");
  const f = flow(c, c.A.id);
  // Sin tabla no se netea (el bruto no se inventa a la baja) pero tampoco se declara completo.
  expect(f.gastoRealEconomico.subtotal).toBe("50.00");
  expect(f.gastoRealEconomico.devoluciones.cobertura).toBe("Parcial");
  expect(f.gastoRealEconomico.devoluciones.causas).toContain("sinVinculo");
  expect(f.gastoRealEconomico.estado).toBe("Parcial");
  expect(f.metrics.devolucionesCobradas.subtotal).toBeNull(); // el abono es de B, no de A
  expect(flow(c, c.B.id).metrics.devolucionesCobradas.subtotal).toBe("20.00");
  const ini = resumenInicio(c.db, c.at).secciones.ciclo.gastoRealEconomico;
  expect(ini.subtotal).toBe("10.00");
  expect(ini.cobertura.motivos.length).toBeGreaterThan(0);
  expect(ini.motivo).toContain("sinVinculo");
  const r = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), c.at);
  const cicloA = r.carriles.realidad.ciclos.find((x) => x.cicloId === c.A.id)!;
  expect(cicloA.gastoRealEconomico.motivo).toContain("sinVinculo");
  expect(cicloA.gastoRealEconomico.cobertura.motivos.length).toBeGreaterThan(0);
  // El natural (E2.4) no puede leerse sin la tabla: nunca Verificado ni Completo.
  const n = r.carriles.plan.gastoRealEconomicoNatural;
  expect(n.estado).not.toBe("Verificado");
  expect(n.cobertura.estado).not.toBe("Completa");
  c.db.close();
});

test("F2C-17b: sin tabla y SIN abonos bancarios el esquema anterior no se rompe: cobertura Completa", () => {
  const c = setup();
  buy(c, "50");
  c.db.run("DROP TABLE movimiento_devolucion_audit");
  c.db.run("DROP TABLE movimiento_devolucion");
  const f = flow(c, c.A.id);
  expect(f.gastoRealEconomico.subtotal).toBe("50.00");
  expect(f.gastoRealEconomico.devoluciones.cobertura).toBe("Completa");
  expect(resumenInicio(c.db, c.at).secciones.ciclo.gastoRealEconomico.subtotal).toBe("50.00");
  const r = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), c.at);
  // E2.4 ya no lee sin la tabla de vínculos (comportamiento previo): el natural no inventa cifra.
  expect(r.carriles.plan.gastoRealEconomicoNatural.estado).toBe("No disponible");
  expect(r.carriles.plan.gastoRealEconomicoNatural.partidas).toEqual([]);
  c.db.close();
});

const annualSources = (historico: AnnualHistory[], control = { inicio: "2026-03-01", fin: "2026-12-31" }): AnnualProvider => () => ({
  revision: "fixture-f2c",
  control,
  historico,
  historicoDisponible: true,
  protecciones: [],
  cierresDisponibles: true,
});
const hist = (c: Ctx, over: Partial<AnnualHistory>): AnnualHistory => ({
  partida: c.food.id,
  ejercicio: 2026,
  importeCentimos: "5000",
  fecha: null,
  intervalo: { inicio: "2026-01-01", fin: "2026-02-28" },
  procedencia: "Archivo ficticio",
  verificado: true,
  representadoEnMovimientos: false,
  ...over,
});

test("F2C-23 (AC-D30): con histórico acreditado NO solapado, Ejecutado = registrado + histórico; el natural separa ambas magnitudes y no se declara equivalente ni completo", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "30");
  const provider = annualSources([hist(c, {})]);
  const r = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), c.at, { annualProvider: provider });
  const anual = getAnnualPlan(c.db, 2026, c.at, provider);
  const e = [...anual.items, ...anual.sinLinea].find((i) => i.partida.id === c.food.id)!;
  expect([e.subtotalRegistrado, e.historicoConocido, e.ejecutado]).toEqual(["90.00", "50.00", "140.00"]);
  const p = nat(r, c.food.id)!;
  expect(p).toMatchObject({
    gastoRealEconomico: "90.00", // reconcilia con subtotalRegistrado
    historicoConocido: "50.00",
    ejecutadoPlanAnual: "140.00",
    equivaleAEjecutado: false,
  });
  expect(p.gastoRealEconomico).toBe(e.subtotalRegistrado);
  expect(r.carriles.plan.items.find((i) => i.partidaId === c.food.id)!.ejecutado.valor).toBe("140.00");
  const n = r.carriles.plan.gastoRealEconomicoNatural;
  expect(n.estado).toBe("Parcial");
  expect(n.cobertura.estado).not.toBe("Completa");
  expect(n.nota).toContain("NO son comparables");
  // Sin histórico, en cambio, ambas coinciden.
  const sin = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), c.at, { annualProvider: annualSources([], { inicio: "2026-01-01", fin: "2026-12-31" }) });
  expect(nat(sin, c.food.id)).toMatchObject({ historicoConocido: "0.00", equivaleAEjecutado: true, ejecutadoPlanAnual: "90.00" });
  c.db.close();
});

test("F2C-24 (AC-D30): histórico solapado con el control: Ejecutado null, el natural conserva solo compras registradas y sin falsa completitud", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "30");
  const provider = annualSources([hist(c, { intervalo: { inicio: "2026-01-01", fin: "2026-04-30" } })]);
  const r = resumenAnual(c.db, new URLSearchParams({ ejercicio: "2026" }), c.at, { annualProvider: provider });
  const p = nat(r, c.food.id)!;
  expect(p.ejecutadoPlanAnual).toBeNull();
  expect(p.equivaleAEjecutado).toBe(false);
  expect(p.gastoRealEconomico).toBe("90.00");
  const n = r.carriles.plan.gastoRealEconomicoNatural;
  expect(n.estado).toBe("Parcial");
  expect(n.cobertura.estado).toBe("Parcial");
  c.db.close();
});
