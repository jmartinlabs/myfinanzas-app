import { test, expect } from "bun:test";
import { HttpApp } from "@effect/platform";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createSaldo, getSaldo, updateSaldo } from "./saldos";
import { createClassification } from "./clasificacion";
import { previewMovement, writeMovement } from "./movimientos";
import { createDebt, updateDebt } from "./deudas";
import { createInstrumento } from "./instrumentos";
import { createPurchase } from "./compras";
import { createValuation } from "./e43";
import {
  confirmAnnualPlan,
  getAnnualPlan,
  previewAnnualPlan,
} from "./plan-anual";
import { createBudget } from "./presupuestos";
import { confirmCyclePlan, getCyclePlan, previewCyclePlan } from "./planes-ciclo";
import { resumenInicio, type ResumenInicio } from "./resumen-inicio";
import { monthlyFlow } from "./flujo-mensual";
import { e43Corte } from "./e43";
import { listDeudasCompletas } from "./deuda-completa";

const origin = "http://127.0.0.1:5173";
const NOW = Date.parse("2026-11-03T10:00:00Z");
const LATER = Date.parse("2027-12-31T12:00:00Z");
const password = "Solo pruebas locales " + randomUUID();

const ignoredTables = new Set([
  "sessions",
  "auth_events",
  "auth_limits",
  "challenges",
  "bootstrap",
  "recovery",
]);

function snapshot(db: Database) {
  return (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
  )
    .filter(({ name }) => !ignoredTables.has(name))
    .map(
      ({ name }) =>
        [name, db.query(`SELECT * FROM "${name}" ORDER BY rowid`).all()] as const,
    );
}

function harness(db: Database, at = NOW, appOptions = {}) {
  const key = randomBytes(32);
  let cookie = "",
    csrf = "";
  const handler = HttpApp.toWebHandler(
    createApp(db, { key, origin, now: () => at, ...appOptions }),
  );
  async function raw(
    path: string,
    method = "GET",
    headers: Record<string, string> = {},
  ) {
    const response = await handler(
      new Request(origin + path, { method, headers }),
    );
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  }
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const requestHeaders: Record<string, string> = {
      origin,
      cookie,
      "x-csrf-token": csrf,
      ...headers,
    };
    if (body !== undefined) requestHeaders["content-type"] = "application/json";
    const response = await handler(
      new Request(origin + path, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie
        .split("; ")
        .filter((part) => part && !part.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = await response.json();
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data, headers: response.headers };
  }
  async function enroll() {
    const bootstrap = provision(db, at);
    const response = await request("/api/auth/enroll", "POST", {
      token: bootstrap,
      password,
    });
    expect(response.status).toBe(200);
    const secret = response.data.secret as string;
    const mfa = await request("/api/auth/mfa", "POST", {
      code: totp(secret).generate({ timestamp: at }),
    });
    expect(mfa.status).toBe(200);
    return secret;
  }
  return { db, request, raw, enroll };
}

function saveMovement(
  db: Database,
  body: Record<string, unknown>,
  at = NOW,
) {
  const plan = previewMovement(db, body, null, false, at);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    null,
    false,
    at,
  ).movimiento;
}

function saveAnnual(
  db: Database,
  year: number,
  partida: string,
  changes: Record<string, unknown>,
  at = NOW,
) {
  const plan = getAnnualPlan(db, year, at);
  const proposal = {
    partida,
    revision: 0,
    contextRevision: plan.contextRevision,
    cambios: changes,
  };
  const preview = previewAnnualPlan(db, year, proposal, at);
  return confirmAnnualPlan(
    db,
    year,
    {
      propuesta: proposal,
      fingerprint: preview.fingerprint,
      motivo: "Fixture sintética E4.6",
    },
    randomUUID(),
    at,
  );
}

function saveCyclePlan(
  db: Database,
  cycle: string,
  lines: Record<string, unknown>[],
  at = NOW,
) {
  const plan = getCyclePlan(db, cycle, at);
  const proposal = {
    revision: plan.revision,
    contextRevision: plan.contextRevision,
    cambios: lines,
  };
  const preview = previewCyclePlan(db, cycle, proposal, at);
  return confirmCyclePlan(
    db,
    cycle,
    {
      propuesta: proposal,
      fingerprint: preview.fingerprint,
      motivo: "Fixture sintética E4.6",
    },
    randomUUID(),
    at,
  );
}

function metricaCifra(metrica: {
  valor: string | null;
  subtotal: string | null;
  estado: string;
  motivo: string;
  cobertura: unknown;
}) {
  return {
    valor: metrica.valor,
    subtotal: metrica.subtotal,
    estado: metrica.estado,
    motivo: metrica.motivo,
    cobertura: metrica.cobertura,
  };
}

function ahorroCifra({
  estado,
  valor,
  motivo,
  cobertura,
}: {
  estado: string;
  valor: string | null;
  motivo: string;
  cobertura: string | null;
}) {
  return { estado, valor, motivo, cobertura };
}

function baseFixture(at = NOW, options: { annual?: boolean } = {}) {
  const db = openDatabase(":memory:");

  // Saldos demo antes de crear hechos económicos. S001/S002/S003/S004/S005
  // existen en la base demo; S006 y S007 se añaden con la fixture E4.6.
  const update = (id: string, body: Record<string, unknown>) =>
    updateSaldo(
      db,
      id,
      { revision: getSaldo(db, id).revision, ...body },
      undefined,
      at,
    );
  update("S001", {
    saldoApertura: "850.00",
    fechaApertura: "2026-01-01",
    liquidez: true,
    permiteSalidaExterior: true,
    finalidad: null,
    mostrarComoBolsa: false,
  });
  update("S002", {
    nombre: "Ahorro demo",
    tipo: "Efectivo",
    control: "Movimientos",
    saldoApertura: "800.00",
    fechaApertura: "2026-01-01",
    liquidez: true,
    permiteSalidaExterior: true,
    finalidad: "Ahorro",
    mostrarComoBolsa: false,
  });
  update("S003", {
    saldoApertura: "2375.40",
    fechaApertura: "2026-01-01",
    liquidez: true,
    permiteSalidaExterior: true,
    finalidad: "Inversión",
    mostrarComoBolsa: false,
  });
  update("S004", {
    tipo: "Efectivo",
    control: "Inversiones",
    saldoApertura: "500.00",
    fechaApertura: "2026-01-01",
    liquidez: false,
    permiteSalidaExterior: true,
    finalidad: "Inversión",
    mostrarComoBolsa: false,
  });
  update("S005", {
    tipo: "Efectivo",
    control: "Movimientos",
    saldoApertura: "250.00",
    fechaApertura: "2026-01-01",
    liquidez: false,
    permiteSalidaExterior: true,
    finalidad: null,
    mostrarComoBolsa: true,
  });
  // El motor Saldos admite Liquidez ausente; updateSaldo exige booleano.
  db.run("UPDATE saldos SET liquidez=NULL WHERE id='S005'");
  createSaldo(
    db,
    {
      nombre: "Cuenta inactiva demo",
      tipo: "Efectivo",
      control: "Movimientos",
      estado: "Inactiva",
      liquidez: true,
      finalidad: null,
      mostrarComoBolsa: false,
      permiteSalidaExterior: true,
      fechaApertura: "2026-01-01",
      saldoApertura: "999.00",
    },
    randomUUID(),
    at,
  );
  const s007 = createSaldo(
    db,
    {
      nombre: "Cartera demo",
      tipo: "Inversión",
      control: "Inversiones",
      estado: "Activa",
      liquidez: false,
      finalidad: "Inversión",
      mostrarComoBolsa: false,
      permiteSalidaExterior: false,
      fechaApertura: "2026-01-01",
      saldoApertura: "0.00",
    },
    randomUUID(),
    at,
  );

  // C007 del testplan se materializa con el identificador numérico que exige
  // E2.6 (`monthlyFlow` solo acepta IDs numéricos). El mes financiado sigue
  // derivándose del Inicio: 2026-06-20 -> 2026-07-01.
  db.run(
    "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('7','2026-06-20',0,'2026-06-20T00:00:00.000Z')",
  );

  const category = createClassification(
    db,
    "categorias",
    {
      nombre: "Gasto ficticio E4.6",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
    at,
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub ficticia E4.6", padre: category.id },
    randomUUID(),
    at,
  );
  const partida = (nombre: string, deuda?: string) =>
    createClassification(
      db,
      "partidas",
      { nombre, padre: sub.id, ...(deuda ? { deuda } : {}) },
      randomUUID(),
      at,
    ).id;
  const pGeneric = partida("Gasto corriente ficticio");
  const debt = (nombre: string, tipoDeuda: string | null, apertura: string) =>
    createDebt(
      db,
      {
        nombre,
        inicioControl: "2026-01-01",
        capitalApertura: apertura,
        ...(tipoDeuda === null ? {} : { tipoDeuda }),
      },
      randomUUID(),
      at,
    );
  const d001 = debt("Préstamo demo", "No hipotecaria", "1000.00");
  const d002 = debt("Financiación demo", "No hipotecaria", "300.00");
  debt("Hipoteca demo", "Hipotecaria", "50000.00");
  const d004 = debt("Deuda sin informar demo", null, "200.00");
  const d005 = debt("Deuda incompleta demo", "No hipotecaria", "500.00");
  // Fixture heredada: la apertura ausente hace la deuda no calculable sin
  // introducir un desglose inválido que el esquema v24 prohíbe (capital>0).
  db.run("UPDATE deudas SET apertura=NULL WHERE id=?", [d005.id]);
  const d006 = debt("Deuda inactiva demo", "No hipotecaria", "400.00");
  updateDebt(
    db,
    d006.id,
    { revision: d006.revision, estado: "Inactiva" },
    at,
  );
  const pD001 = partida("Cuota préstamo demo", d001.id);
  const pD004 = partida("Cuota deuda sin informar demo", d004.id);

  // Ciclo: 2.250,00 ingresos, 1.800,00 gasto bruto y 100,00 extraordinaria.
  saveMovement(db, {
    tipo: "Ingreso",
    fecha: "2026-06-25",
    saldo: "S001",
    subtipo: "Nómina",
    importe: "2000.00",
    concepto: "Nómina ficticia E4.6",
  });
  saveMovement(db, {
    tipo: "Ingreso",
    fecha: "2026-06-26",
    saldo: "S001",
    subtipo: "Bonus",
    importe: "200.00",
    concepto: "Bonus ficticio E4.6",
  });
  saveMovement(db, {
    tipo: "Ingreso",
    fecha: "2026-07-19",
    saldo: "S001",
    subtipo: "Intereses",
    importe: "50.00",
    concepto: "Intereses ficticios E4.6",
  });
  saveMovement(db, {
    tipo: "Gasto",
    fecha: "2026-07-05",
    saldo: "S001",
    partida: pD001,
    importe: "300.00",
    capital: "280.00",
    intereses: "20.00",
    concepto: "Cuota ficticia E4.6",
  });
  saveMovement(db, {
    tipo: "Gasto",
    fecha: "2026-07-06",
    saldo: "S001",
    partida: pGeneric,
    importe: "300.00",
    concepto: "Compartido bruto ficticio E4.6",
  });
  const gastoCorriente = saveMovement(db, {
    tipo: "Gasto",
    fecha: "2026-07-08",
    saldo: "S001",
    partida: pGeneric,
    importe: "1050.00",
    concepto: "Gastos corrientes ficticios E4.6",
  });
  saveMovement(db, {
    tipo: "Gasto",
    fecha: "2026-07-16",
    saldo: "S001",
    partida: pGeneric,
    importe: "100.00",
    concepto: "Terminal ficticio E4.6",
  });
  saveMovement(db, {
    tipo: "Gasto",
    fecha: "2026-07-18",
    saldo: "S001",
    partida: pGeneric,
    importe: "50.00",
    concepto: "Comida auxiliar ficticia E4.6",
  });
  saveMovement(db, {
    tipo: "Amortización deuda",
    fecha: "2026-07-19",
    saldo: "S001",
    partida: pD004,
    importe: "100.00",
    concepto: "Amortización extraordinaria ficticia E4.6",
  });

  // Inversión E4.2/E4.3: S007 con I1001/I1002; efectivo en S003 y S004.
  const i1 = createInstrumento(
    db,
    {
      nombre: "Fondo índice demo",
      isin: "ES0000000101",
      isinEvidencia: "Extracto ficticio E4.6",
      divisaReferencia: "EUR",
    },
    randomUUID(),
    at,
  ).instrumento.id;
  const i2 = createInstrumento(
    db,
    {
      nombre: "Acción demo",
      isin: "ES0000000102",
      isinEvidencia: "Extracto ficticio E4.6",
      divisaReferencia: "EUR",
    },
    randomUUID(),
    at,
  ).instrumento.id;
  createPurchase(
    db,
    {
      fecha: "2026-06-25",
      instrumento: i1,
      saldoEfectivo: "S003",
      saldoInversion: s007.id,
      cantidad: "7.5",
      precio: "82.533333",
      divisa: "EUR",
      cambio: null,
      importeEur: "619.00",
      comisionEur: "0.00",
      concepto: "Compra ficticia I1001 E4.6",
      nota: null,
    },
    randomUUID(),
    at,
  );
  createPurchase(
    db,
    {
      fecha: "2026-06-26",
      instrumento: i2,
      saldoEfectivo: "S003",
      saldoInversion: s007.id,
      cantidad: "2",
      precio: "150.000000",
      divisa: "EUR",
      cambio: null,
      importeEur: "300.00",
      comisionEur: "0.00",
      concepto: "Compra ficticia I1002 E4.6",
      nota: null,
    },
    randomUUID(),
    at,
  );
  createValuation(
    db,
    s007.id,
    i1,
    {
      fecha: "2026-07-19",
      tipo: "Automática",
      precio: "117.000000",
      divisa: "EUR",
      cambio: "1.000000",
      procedencia: "Fixture sintética E4.6",
    },
    randomUUID(),
    at,
  );
  createValuation(
    db,
    s007.id,
    i2,
    {
      fecha: "2026-07-19",
      tipo: "Manual",
      valorEur: "320.00",
      procedencia: "Fixture sintética E4.6",
    },
    randomUUID(),
    at,
  );

  // Plan anual 2026: 18.000,00 esenciales -> 1.500,00/mes.
  if (options.annual !== false)
    saveAnnual(db, 2026, pGeneric, {
      presupuesto: "18000.00",
      esencial: "Sí",
      periodo: "Ejercicio 2026",
    });

  // Plan del ciclo: 4 líneas con Del mes = 1.900,00.
  const budgets = [
    createBudget(
      db,
      { nombre: "Presupuesto gasto A", fuente: "Gasto real", destino: "S001" },
      randomUUID(),
      at,
    ),
    createBudget(
      db,
      {
        nombre: "Presupuesto ahorro",
        fuente: "Aportación a saldo",
        destino: "S002",
      },
      randomUUID(),
      at,
    ),
    createBudget(
      db,
      {
        nombre: "Presupuesto inversión",
        fuente: "Aportación a saldo",
        destino: s007.id,
      },
      randomUUID(),
      at,
    ),
    createBudget(
      db,
      { nombre: "Presupuesto gasto B", fuente: "Gasto real", destino: "S001" },
      randomUUID(),
      at,
    ),
  ];
  saveCyclePlan(
    db,
    "7",
    budgets.map((budget, index) => ({
      presupuesto: budget.id,
      base: ["1000.00", "500.00", "300.00", "100.00"][index],
      delMes: ["1000.00", "500.00", "300.00", "100.00"][index],
    })),
  );

  return {
    db,
    cycleId: "7",
    saldos: { s007: s007.id },
    partidas: { pGeneric, pD001, pD004 },
    instruments: { i1, i2 },
    budgets: budgets.map((budget) => budget.id),
    movements: { gastoCorriente: gastoCorriente.id },
  };
}

function completeLiquidity(db: Database) {
  const update = (id: string, liquidez: boolean) =>
    updateSaldo(
      db,
      id,
      { revision: getSaldo(db, id).revision, liquidez },
      undefined,
      NOW,
    );
  update("S001", true);
  update("S002", true);
  update("S003", true);
  update("S004", false);
  update("S005", false);
}

test("AC-01/02/05/18/22/24/25: DTO compuesto contra el oráculo del testplan", async () => {
  const { db } = baseFixture();
  try {
    const h = harness(db);
    await h.enroll();
    const response = await h.request("/api/resumen-inicio");
    expect(response.status).toBe(200);
    const dto = response.data as ResumenInicio;

    expect(dto.contexto.ciclo).toMatchObject({
      id: "7",
      inicio: "2026-06-20",
      mesFinanciado: "2026-07",
      estadoTemporal: "Abierto",
      corte: "2026-07-19",
      estadoCorte: "disponible",
    });
    expect(dto.contexto.referencia).toMatchObject({
      fecha: "2026-07-19",
      estado: "disponible",
    });
    expect(dto.contexto.revision).toMatch(/^[a-f0-9]{64}$/);

    expect(dto.secciones.liquidez.metrica).toMatchObject({
      clave: "liquidez",
      clase: "posicion",
      valor: null,
      subtotal: "3456.40",
      estado: "Parcial",
      unidad: "EUR",
    });
    expect(dto.secciones.liquidez.metrica.cobertura).toMatchObject({
      estado: "Parcial",
      incluidos: 3,
      excluidos: 1,
    });
    expect(dto.secciones.liquidez.incluidos.map((item) => item.id)).toEqual([
      "S001",
      "S002",
      "S003",
    ]);
    expect(dto.secciones.liquidez.excluidos).toEqual([
      { id: "S005", motivo: "Liquidez sin informar" },
    ]);

    expect(dto.secciones.objetivo.costeEsencialMensual).toMatchObject({
      valor: "1500.00",
      estado: "Verificado",
      ejercicio: 2026,
      ejercicioOrigen: "mesFinanciado",
      estadoEquivalente: "Completo",
      cobertura: {
        estado: "Completa",
        importesSinInformar: 0,
        clasificacionesPendientes: 0,
        ejercicioSinPlan: false,
      },
    });
    expect(dto.secciones.objetivo.mesesObjetivo).toBeNull();
    expect(dto.secciones.objetivo.metrica).toMatchObject({
      clave: "minimoObjetivo",
      valor: null,
      estado: "No disponible",
      motivo: "Meses objetivo no configurados.",
    });
    expect(dto.secciones.objetivo.mesesCubiertos).toMatchObject({
      valor: null,
      estado: "No disponible",
      motivo: "Liquidez parcial: no se divide el subtotal conocido.",
    });
    expect(dto.secciones.objetivo.zona).toBe("Informativa");

    expect(dto.secciones.ciclo.ingresos).toMatchObject({
      valor: null,
      subtotal: "2250.00",
      estado: "Parcial",
      clase: "real",
    });
    expect(dto.secciones.ciclo.gasto).toMatchObject({
      valor: null,
      subtotal: "1800.00",
      estado: "Parcial",
      clase: "real",
    });
    expect(dto.secciones.ciclo.extraordinaria).toMatchObject({
      valor: null,
      subtotal: "100.00",
      estado: "Parcial",
      clase: "real",
    });
    // E2.6 publica `operativo` y `margenReal` como No disponible porque sus
    // componentes bancarios son subtotales Parciales, no totales. E4.6 no los
    // recalcula (P-05).
    expect(dto.secciones.ciclo.operativo).toMatchObject({
      valor: null,
      estado: "No disponible",
      clase: "real",
    });
    expect(dto.secciones.ciclo.margenReal).toMatchObject({
      valor: null,
      estado: "No disponible",
      clase: "plan",
    });
    expect(dto.secciones.ciclo.nomina).toMatchObject({
      valor: null,
      subtotal: "2000.00",
      clase: "real",
    });
    expect(dto.secciones.ciclo.delMes).toMatchObject({
      valor: "1900.00",
      clase: "plan",
    });

    expect(dto.secciones.saldos.conteos).toEqual({
      liquidez: 3,
      ahorro: 1,
      bolsas: 1,
    });
    expect(dto.secciones.saldos.items).toHaveLength(7); // S001-S007; S000 excluido
    expect(dto.secciones.saldos.cobertura).toMatchObject({
      estado: "Parcial",
      incluidos: 6,
      excluidos: 1,
    });
    const s005 = dto.secciones.saldos.items.find((item) => item.id === "S005");
    expect(s005).toMatchObject({ liquidez: null, bolsa: true });
    // E1.1 publica la condición de posición; se transporta por ítem.
    expect(
      dto.secciones.saldos.items.every(
        (item) => typeof item.condicion === "string" && item.condicion.length > 0,
      ),
    ).toBe(true);
    // El motivo de posición de E1.1 se conserva para no dejar cifras null sin
    // explicación en el consumidor.
    expect(
      dto.secciones.saldos.items.every(
        (item) => typeof item.motivo === "string" && item.motivo.length > 0,
      ),
    ).toBe(true);

    expect(dto.secciones.ahorro.posiciones).toEqual([
      expect.objectContaining({
        id: "S002",
        nombre: "Ahorro demo",
        valor: "800.00",
        estado: "Verificado",
        condicion: "calculado",
      }),
    ]);
    expect(dto.secciones.ahorro.ahorroCierre).toMatchObject({
      estado: "No disponible",
      valor: null,
      cobertura: expect.any(String),
      fuente: expect.objectContaining({ motor: expect.any(String) }),
    });
    expect(dto.secciones.ahorro.variacionAhorro).toMatchObject({
      estado: "No disponible",
      valor: null,
      cobertura: expect.any(String),
      fuente: expect.objectContaining({ motor: expect.any(String) }),
    });

    expect(dto.secciones.inversion.agregado).toMatchObject({
      coberturaValoracion: "Completa",
      valorEur: "1197.50",
      coberturaResultado: "Parcial 1/2",
      resultadoEur: null,
    });
    expect(dto.secciones.inversion.cobertura).toMatchObject({
      estado: "Parcial",
      incluidos: 2,
      excluidos: 0,
    });
    expect(dto.secciones.inversion.cobertura.motivos).toContain(
      "Resultado no disponible para valoración manual.",
    );
    expect(dto.secciones.inversion.posiciones).toHaveLength(2);
    const manual = dto.secciones.inversion.posiciones.find(
      (position) => position.instrumento === "I1002",
    );
    expect(manual).toMatchObject({
      nombre: "Acción demo",
      cantidad: "2",
      estado: "Abierta",
      tipoValoracion: "Manual",
      valorEur: "320.00",
      valoracionEstado: "Disponible",
      valoracionMotivo: null,
      valoracionCobertura: "Completa",
      resultadoEur: null,
      resultadoEstado: "No disponible",
    });
    expect(manual).not.toHaveProperty("rentabilidad");
    expect(dto.secciones.inversion.efectivo).toEqual([
      expect.objectContaining({ saldo: "S003", disponible: "1456.40" }),
      expect.objectContaining({ saldo: "S004", disponible: "500.00" }),
    ]);

    expect(dto.secciones.deudaNoHipotecaria.items.map((item) => item.id)).toEqual([
      "D001",
      "D002",
      "D005",
    ]);
    expect(dto.secciones.deudaNoHipotecaria.total).toMatchObject({
      valor: null,
      subtotal: "1020.00",
      estado: "Parcial",
    });
    expect(dto.secciones.deudaNoHipotecaria.total.cobertura).toMatchObject({
      estado: "Parcial",
      incluidos: 2,
      excluidos: 1,
    });
    expect(
      dto.secciones.deudaNoHipotecaria.items.find((item) => item.id === "D005"),
    ).toMatchObject({ capitalPendiente: null, calculable: false });
    expect(dto.secciones.deudaNoHipotecaria.aparte.hipotecaria).toEqual([
      expect.objectContaining({
        id: "D003",
        tipoDeuda: "Hipotecaria",
        estado: "Activa",
        capitalPendiente: "50000.00",
        revision: expect.any(Number),
      }),
    ]);
    expect(dto.secciones.deudaNoHipotecaria.aparte.sinInformar).toEqual([
      expect.objectContaining({
        id: "D004",
        tipoDeuda: null,
        estado: "Activa",
        capitalPendiente: "100.00",
        revision: expect.any(Number),
      }),
    ]);

    const serialized = JSON.stringify(dto);
    for (const forbidden of ["3153.90", "2436.40", "1400.00", "0.00\" como total"])
      expect(serialized).not.toContain(forbidden);
    expect(dto).not.toHaveProperty("patrimonio");
    expect(dto).not.toHaveProperty("totalSaldos");
    expect(dto.secciones.saldos).not.toHaveProperty("total");
    expect(dto.secciones.inversion).not.toHaveProperty("total");
    expect(dto.secciones.inversion).not.toHaveProperty("totalCombinado");
  } finally {
    db.close();
  }
});

test("AC-02: cada cifra del DTO coincide al céntimo con su motor propietario", () => {
  const { db, cycleId } = baseFixture();
  try {
    const dto = resumenInicio(db, NOW);
    const flow = monthlyFlow(db, cycleId, NOW);
    const annual = getAnnualPlan(db, 2026, NOW);
    const e43 = e43Corte(db, "2026-07-19");
    const deudas = listDeudasCompletas(
      db,
      new URLSearchParams({ estado: "" }),
    );

    expect(dto.secciones.liquidez.metrica.valor).toBe(
      flow.metrics.liquidez.valor,
    );
    expect(dto.secciones.liquidez.metrica.subtotal).toBe(
      flow.metrics.liquidez.subtotal,
    );
    expect(dto.secciones.liquidez.metrica.estado as string).toBe(
      flow.metrics.liquidez.estado,
    );
    for (const clave of [
      "ingresos",
      "gasto",
      "extraordinaria",
      "operativo",
      "margenReal",
    ] as const) {
      expect(dto.secciones.ciclo[clave].valor).toBe(
        flow.metrics[clave].valor,
      );
      expect(dto.secciones.ciclo[clave].subtotal).toBe(
        flow.metrics[clave].subtotal,
      );
      expect(dto.secciones.ciclo[clave].estado as string).toBe(
        flow.metrics[clave].estado,
      );
    }
    // Nómina conserva el subtotal parcial visible; base/delMes son PLAN
    // verificados y no se confunden con la ejecución real.
    expect(dto.secciones.ciclo.nomina).toMatchObject({
      valor: null,
      subtotal: "2000.00",
      estado: "Parcial",
      clase: "real",
    });
    expect(dto.secciones.ciclo.base).toMatchObject({
      valor: "1900.00",
      estado: "Verificado",
      clase: "plan",
    });
    expect(dto.secciones.ciclo.delMes).toMatchObject({
      valor: "1900.00",
      estado: "Verificado",
      clase: "plan",
    });
    expect(dto.secciones.objetivo.costeEsencialMensual.estadoEquivalente).toBe(
      annual.esencial.estado,
    );
    expect(dto.secciones.objetivo.costeEsencialMensual.racional).toEqual(
      annual.esencial.total,
    );
    expect(dto.secciones.inversion.agregado).toMatchObject({
      valorEur: e43.agregado.valorEur,
      coberturaValoracionFuente: e43.agregado.coberturaValoracion,
      coberturaResultadoFuente: e43.agregado.coberturaResultado,
      resultadoEur: e43.agregado.resultadoEur,
    });
    expect(dto.secciones.inversion.efectivo.map((item) => item.disponible)).toEqual(
      e43.efectivo.map((item) => item.disponible),
    );
    const d001 = deudas.items.find((item) => item.id === "D001");
    const d002 = deudas.items.find((item) => item.id === "D002");
    const d005 = deudas.items.find((item) => item.id === "D005");
    const dtoItems = dto.secciones.deudaNoHipotecaria.items;
    expect(dtoItems.find((item) => item.id === "D001")?.capitalPendiente).toBe(
      d001?.capitalPendiente,
    );
    expect(dtoItems.find((item) => item.id === "D002")?.capitalPendiente).toBe(
      d002?.capitalPendiente,
    );
    expect(dtoItems.find((item) => item.id === "D005")?.capitalPendiente).toBe(
      d005?.capitalPendiente,
    );
    expect(dto.secciones.deudaNoHipotecaria.total.subtotal).toBe("1020.00");
  } finally {
    db.close();
  }
});

test("AC-13/12/15: mesesCubiertos sin mesesObjetivo y mínimo con doble de contrato R6", async () => {
  const { db } = baseFixture();
  try {
    completeLiquidity(db);
    const h = harness(db);
    await h.enroll();
    const response = await h.request("/api/resumen-inicio");
    expect(response.status).toBe(200);
    const dto = response.data as ResumenInicio;
    expect(dto.secciones.liquidez.metrica).toMatchObject({
      valor: "3456.40",
      subtotal: null,
      estado: "Verificado",
    });
    expect(dto.secciones.objetivo.mesesObjetivo).toBeNull();
    expect(dto.secciones.objetivo.metrica.valor).toBeNull();
    expect(dto.secciones.objetivo.metrica.estado).toBe("No disponible");
    expect(dto.secciones.objetivo.mesesCubiertos).toMatchObject({
      valor: "2.30",
      estado: "Verificado",
      unidad: "meses",
      racional: { numeradorCentimos: "345640", divisor: "150000" },
    });

  } finally {
    db.close();
  }

  const providerFixture = baseFixture();
  try {
    completeLiquidity(providerFixture.db);
    const provider = harness(providerFixture.db, NOW, {
      resumenInicio: { mesesObjetivo: 6 },
    });
    await provider.enroll();
    const withProvider = await provider.request("/api/resumen-inicio");
    expect(withProvider.status).toBe(200);
    const dtoProvider = withProvider.data as ResumenInicio;
    expect(dtoProvider.secciones.objetivo.mesesObjetivo).toBe(6);
    expect(dtoProvider.secciones.objetivo.metrica).toMatchObject({
      valor: "9000.00",
      estado: "Verificado",
      racional: { numeradorCentimos: "900000", divisor: "1" },
    });
    expect(dtoProvider.secciones.objetivo.mesesCubiertos.valor).toBe("2.30");
    expect(dtoProvider.secciones.objetivo.zona).toBe("Informativa");
  } finally {
    providerFixture.db.close();
  }
});

test("AC-29/07: liquidez cero verificada produce 0.00, no No disponible", async () => {
  const { db } = baseFixture();
  try {
    for (const id of ["S001", "S002", "S003", "S004", "S005"])
      updateSaldo(
        db,
        id,
        { revision: getSaldo(db, id).revision, liquidez: false },
        undefined,
        NOW,
      );
    const h = harness(db);
    await h.enroll();
    const response = await h.request("/api/resumen-inicio");
    expect(response.status).toBe(200);
    const dto = response.data as ResumenInicio;
    expect(dto.secciones.liquidez.metrica).toMatchObject({
      valor: "0.00",
      subtotal: null,
      estado: "Cero verificado",
    });
    expect(dto.secciones.objetivo.mesesCubiertos).toMatchObject({
      valor: "0.00",
      estado: "Cero verificado",
      racional: { numeradorCentimos: "0", divisor: "150000" },
    });
    expect(dto.secciones.objetivo.metrica.valor).toBeNull();
    expect(dto.secciones.objetivo.metrica.estado).toBe("No disponible");
    expect(dto.secciones.deudaNoHipotecaria.total.valor).toBeNull();
    expect(dto.secciones.deudaNoHipotecaria.total.subtotal).toBe("1020.00");
  } finally {
    db.close();
  }
});

test("AC-14/16: plan incompleto, sin plan y coste cero dejan objetivos en ND", async () => {
  const { db } = baseFixture();
  try {
    db.run("UPDATE annual_plan_lines SET presupuesto=NULL WHERE ejercicio=2026");
    let dto = resumenInicio(db, NOW);
    expect(dto.secciones.objetivo.costeEsencialMensual).toMatchObject({
      valor: null,
      estado: "No disponible",
      estadoEquivalente: "Incompleto",
      ejercicio: 2026,
    });
    expect(dto.secciones.objetivo.mesesCubiertos.estado).toBe("No disponible");
    expect(dto.secciones.objetivo.metrica.estado).toBe("No disponible");

  } finally {
    db.close();
  }

  const { db: noAnnual } = baseFixture(NOW, { annual: false });
  try {
    const dto = resumenInicio(noAnnual, NOW);
    expect(dto.secciones.objetivo.costeEsencialMensual).toMatchObject({
      valor: null,
      estado: "No disponible",
      estadoEquivalente: "Sin plan anual",
      ejercicio: 2026,
    });
    expect(dto.secciones.objetivo.mesesCubiertos.estado).toBe("No disponible");
  } finally {
    noAnnual.close();
  }

  const { db: zero } = baseFixture();
  try {
    zero.run("UPDATE annual_plan_lines SET presupuesto=0 WHERE ejercicio=2026");
    const dto = resumenInicio(zero, NOW);
    expect(dto.secciones.objetivo.costeEsencialMensual).toMatchObject({
      valor: "0.00",
      estado: "Verificado",
      estadoEquivalente: "Completo",
    });
    expect(dto.secciones.objetivo.mesesCubiertos).toMatchObject({
      valor: null,
      estado: "No disponible",
      motivo: "Coste esencial verificado 0: denominador no aplicable.",
    });
    expect(dto.secciones.objetivo.metrica.estado).toBe("No disponible");
  } finally {
    zero.close();
  }
});

test("AC-06: error de una fuente degrada su sección sin tumbar el 200", async () => {
  const { db } = baseFixture();
  try {
    db.run("DROP TABLE annual_plan_lines");
    const h = harness(db);
    await h.enroll();
    const response = await h.request("/api/resumen-inicio");
    expect(response.status).toBe(200);
    const dto = response.data as ResumenInicio;
    expect(dto.secciones.objetivo.costeEsencialMensual.estado).toBe(
      "No disponible",
    );
    expect(dto.secciones.objetivo.costeEsencialMensual.motivo).toContain(
      "E2.4",
    );
    expect(dto.secciones.liquidez.metrica.subtotal).toBe("3456.40");
    expect(dto.secciones.ciclo.ingresos.subtotal).toBe("2250.00");
    expect(dto.secciones.ciclo.ingresos.estado).toBe("Parcial");
    expect(dto.secciones.deudaNoHipotecaria.total.subtotal).toBe("1020.00");
    expect(dto.contexto.motivos.join(" ")).toContain("E2.4");
  } finally {
    db.close();
  }
});

test("M-4: E3.6 con fuentes fallidas y cero filas publica Parcial, no Sin datos", () => {
  const db = openDatabase(":memory:");
  try {
    // Simula fuentes no legibles sin crear filas de pendientes: no hay ciclos
    // en esta base y Anticipos/Compartidos dejan de responder.
    db.run("ALTER TABLE fichas_anticipos RENAME TO fichas_anticipos_off");
    db.run("ALTER TABLE fichas_compartidos RENAME TO fichas_compartidos_off");
    const dto = resumenInicio(db, NOW);
    expect(dto.secciones.pendientes.items).toEqual([]);
    expect(dto.secciones.pendientes.fuenteFallos.length).toBeGreaterThan(0);
    expect(dto.secciones.pendientes.metrica.estado).toBe("Parcial");
    expect(dto.secciones.pendientes.metrica.cobertura.estado).toBe("Parcial");
    expect(dto.secciones.pendientes.metrica.motivo).toContain(
      "E3.6 con fuentes parciales",
    );
    expect(dto.secciones.pendientes.metrica.motivo).toContain("Anticipos");
  } finally {
    db.close();
  }
});

test("AC-03/27: GET autenticado, no-store, 401, 405 y 403 sin escrituras", async () => {
  const { db } = baseFixture();
  try {
    const h = harness(db);
    const anonymous = await h.raw("/api/resumen-inicio");
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get("cache-control")).toBe("no-store");

    await h.enroll();
    const before = snapshot(db);
    const ok = await h.request("/api/resumen-inicio");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(snapshot(db)).toEqual(before);

    for (const method of ["POST", "PATCH", "DELETE"] as const) {
      const unsupported = await h.request("/api/resumen-inicio", method, {});
      expect(unsupported.status).toBe(405);
      expect(unsupported.headers.get("allow")).toBe("GET");
      expect(snapshot(db)).toEqual(before);
    }

    const wrongOrigin = await h.request(
      "/api/resumen-inicio",
      "POST",
      {},
      { origin: "http://evil.example" },
    );
    expect(wrongOrigin.status).toBe(403);
    expect(snapshot(db)).toEqual(before);
  } finally {
    db.close();
  }
});

test("AC-04/11: revisión determinista y pertenencia solo por Liquidez", async () => {
  const { db } = baseFixture();
  try {
    const h = harness(db);
    await h.enroll();
    const first = (await h.request("/api/resumen-inicio")).data as ResumenInicio;
    const revision = first.contexto.revision;
    const liquidityIds = first.secciones.liquidez.incluidos.map((item) => item.id);

    updateSaldo(
      db,
      "S002",
      {
        revision: getSaldo(db, "S002").revision,
        nombre: "Ahorro demo renombrado",
        finalidad: "Inversión",
        mostrarComoBolsa: true,
      },
      undefined,
      NOW,
    );
    const second = (await h.request("/api/resumen-inicio")).data as ResumenInicio;
    expect(second.contexto.revision).not.toBe(revision);
    expect(second.secciones.liquidez.incluidos.map((item) => item.id)).toEqual(
      liquidityIds,
    );
    expect(second.secciones.liquidez.metrica.subtotal).toBe("3456.40");
    expect(second.secciones.liquidez.metrica.valor).toBeNull();
    expect(
      second.secciones.saldos.items.find((item) => item.id === "S002"),
    ).toMatchObject({
      nombre: "Ahorro demo renombrado",
      finalidad: "Inversión",
      bolsa: true,
    });
  } finally {
    db.close();
  }
});

test("AC-04: editar un Gasto cambia su sección y revisión sin alterar las independientes", () => {
  const fixture = baseFixture();
  const { db } = fixture;
  try {
    const before = resumenInicio(db, NOW);
    const row = db
      .query("SELECT revision FROM movimientos WHERE id=?")
      .get(fixture.movements.gastoCorriente) as { revision: number } | null;
    expect(row).not.toBeNull();
    const body = {
      tipo: "Gasto",
      fecha: "2026-07-08",
      saldo: "S001",
      partida: fixture.partidas.pGeneric,
      importe: "1150.00",
      concepto: "Gastos corrientes ficticios E4.6",
      revision: row!.revision,
      motivo: "Corrección ficticia AC-04",
    };
    const preview = previewMovement(
      db,
      body,
      fixture.movements.gastoCorriente,
      false,
      NOW,
    );
    writeMovement(
      db,
      { ...body, fingerprint: preview.fingerprint, aceptarCoincidencia: true },
      randomUUID(),
      fixture.movements.gastoCorriente,
      false,
      NOW,
    );
    const after = resumenInicio(db, NOW);
    const cifra = (metrica: {
      valor: string | null;
      subtotal: string | null;
      estado: string;
      motivo: string;
      cobertura: unknown;
    }) => ({
      valor: metrica.valor,
      subtotal: metrica.subtotal,
      estado: metrica.estado,
      motivo: metrica.motivo,
      cobertura: metrica.cobertura,
    });

    expect(after.contexto.revision).not.toBe(before.contexto.revision);
    expect(before.secciones.ciclo.gasto.subtotal).toBe("1800.00");
    expect(after.secciones.ciclo.gasto.subtotal).toBe("1900.00");
    // Las secciones que no dependen del Gasto conservan su cifra y cobertura.
    expect(cifra(after.secciones.ciclo.ingresos)).toEqual(
      cifra(before.secciones.ciclo.ingresos),
    );
    expect(cifra(after.secciones.ciclo.extraordinaria)).toEqual(
      cifra(before.secciones.ciclo.extraordinaria),
    );
    expect(after.secciones.inversion).toEqual(before.secciones.inversion);
    expect(after.secciones.deudaNoHipotecaria).toEqual(
      before.secciones.deudaNoHipotecaria,
    );
    expect(after.secciones.objetivo.costeEsencialMensual).toMatchObject({
      valor: before.secciones.objetivo.costeEsencialMensual.valor,
      estado: before.secciones.objetivo.costeEsencialMensual.estado,
      estadoEquivalente:
        before.secciones.objetivo.costeEsencialMensual.estadoEquivalente,
      ejercicio: before.secciones.objetivo.costeEsencialMensual.ejercicio,
      ejercicioOrigen:
        before.secciones.objetivo.costeEsencialMensual.ejercicioOrigen,
    });
    expect(after.secciones.ahorro.posiciones).toEqual(
      before.secciones.ahorro.posiciones,
    );
  } finally {
    db.close();
  }
});

test("AC-20: una línea de plan no altera liquidez ni ahorro ni resta lo presupuestado", () => {
  const fixture = baseFixture();
  const { db } = fixture;
  try {
    const before = resumenInicio(db, NOW);
    // E2.3: se eleva el Del mes de un Presupuesto del plan del ciclo. No se
    // toca ningún hecho, saldo, deuda ni operación.
    saveCyclePlan(db, fixture.cycleId, [
      { presupuesto: fixture.budgets[0], delMes: "2500.00" },
    ]);
    const after = resumenInicio(db, NOW);

    // El plan sí cambia: 1.000,00 -> 2.500,00 en una línea (+1.500,00).
    expect(before.secciones.ciclo.delMes.valor).toBe("1900.00");
    expect(after.secciones.ciclo.delMes.valor).toBe("3400.00");
    expect(after.contexto.revision).not.toBe(before.contexto.revision);

    // Liquidez y Ahorro conservan valor, subtotal, estado y cobertura.
    expect(after.secciones.liquidez.metrica).toEqual(
      before.secciones.liquidez.metrica,
    );
    expect(metricaCifra(after.secciones.liquidez.metrica)).toEqual(
      metricaCifra(before.secciones.liquidez.metrica),
    );
    expect(metricaCifra(after.secciones.liquidez.metrica)).toMatchObject({
      valor: null,
      subtotal: "3456.40",
      estado: "Parcial",
    });
    expect(after.secciones.ahorro.posiciones).toEqual(
      before.secciones.ahorro.posiciones,
    );
    const ahorroCifra = ({
      estado,
      valor,
      motivo,
      cobertura,
    }: {
      estado: string;
      valor: string | null;
      motivo: string;
      cobertura: string | null;
    }) => ({ estado, valor, motivo, cobertura });
    expect(ahorroCifra(after.secciones.ahorro.ahorroCierre)).toEqual(
      ahorroCifra(before.secciones.ahorro.ahorroCierre),
    );
    expect(ahorroCifra(after.secciones.ahorro.variacionAhorro)).toEqual(
      ahorroCifra(before.secciones.ahorro.variacionAhorro),
    );

    // Ninguna métrica de ejecución resta el importe presupuestado.
    expect(metricaCifra(after.secciones.ciclo.gasto)).toEqual(
      metricaCifra(before.secciones.ciclo.gasto),
    );
    expect(metricaCifra(after.secciones.ciclo.operativo)).toEqual(
      metricaCifra(before.secciones.ciclo.operativo),
    );
    expect(after.secciones.ciclo.gasto.subtotal).toBe("1800.00");
    expect(after.secciones.ciclo.operativo.estado).toBe("No disponible");
    expect(JSON.stringify(after.secciones.liquidez)).not.toContain("1956.40");
  } finally {
    db.close();
  }
});

test("AC-21: añadir deuda solo cambia deudaNoHipotecaria", () => {
  const fixture = baseFixture();
  const { db } = fixture;
  try {
    const before = resumenInicio(db, NOW);
    const created = createDebt(
      db,
      {
        nombre: "Deuda nueva ficticia AC-21",
        inicioControl: "2026-07-01",
        capitalApertura: "250.00",
        tipoDeuda: "No hipotecaria",
      },
      randomUUID(),
      NOW,
    );
    const after = resumenInicio(db, NOW);

    // Liquidez, Gasto y Operativo conservan valor/subtotal/estado/motivo.
    expect(metricaCifra(after.secciones.liquidez.metrica)).toEqual(
      metricaCifra(before.secciones.liquidez.metrica),
    );
    expect(metricaCifra(after.secciones.ciclo.gasto)).toEqual(
      metricaCifra(before.secciones.ciclo.gasto),
    );
    expect(metricaCifra(after.secciones.ciclo.operativo)).toEqual(
      metricaCifra(before.secciones.ciclo.operativo),
    );
    expect(after.secciones.ahorro.posiciones).toEqual(
      before.secciones.ahorro.posiciones,
    );
    expect(ahorroCifra(after.secciones.ahorro.ahorroCierre)).toEqual(
      ahorroCifra(before.secciones.ahorro.ahorroCierre),
    );
    expect(ahorroCifra(after.secciones.ahorro.variacionAhorro)).toEqual(
      ahorroCifra(before.secciones.ahorro.variacionAhorro),
    );

    // El único bloque que cambia es la deuda no hipotecaria.
    expect(before.secciones.deudaNoHipotecaria.total.subtotal).toBe("1020.00");
    expect(after.secciones.deudaNoHipotecaria.total.subtotal).toBe("1270.00");
    expect(after.secciones.deudaNoHipotecaria.total.estado).toBe("Parcial");
    expect(after.secciones.deudaNoHipotecaria.items.map((item) => item.id)).toContain(
      created.id,
    );
    expect(
      after.secciones.deudaNoHipotecaria.items.find(
        (item) => item.id === created.id,
      ),
    ).toMatchObject({ capitalPendiente: "250.00", calculable: true });
    expect(after.contexto.revision).not.toBe(before.contexto.revision);
  } finally {
    db.close();
  }
});

test("AC-08: el reloj de consulta no elige ciclo, corte ni cifras", () => {
  const { db } = baseFixture();
  try {
    const a = resumenInicio(db, NOW);
    const b = resumenInicio(db, LATER);
    expect(b.contexto.ciclo).toEqual(a.contexto.ciclo);
    expect(b.contexto.referencia).toEqual(a.contexto.referencia);
    expect(b.secciones.liquidez.metrica).toEqual(a.secciones.liquidez.metrica);
    expect(b.secciones.objetivo.costeEsencialMensual).toEqual(
      a.secciones.objetivo.costeEsencialMensual,
    );
    expect(b.secciones.ciclo.gasto.subtotal).toBe(
      a.secciones.ciclo.gasto.subtotal,
    );
    expect(b.secciones.ciclo.gasto.estado).toBe(a.secciones.ciclo.gasto.estado);
    expect(b.contexto.consulta).not.toBe(a.contexto.consulta);
    expect(new Date(b.contexto.consulta).valueOf()).toBeGreaterThan(
      new Date(a.contexto.consulta).valueOf(),
    );
  } finally {
    db.close();
  }
});

test("AC-17: sin ciclo, las secciones actuales siguen visibles y las del ciclo son ND", async () => {
  const db = openDatabase(":memory:");
  try {
    updateSaldo(
      db,
      "S001",
      {
        revision: getSaldo(db, "S001").revision,
        saldoApertura: "100.00",
        fechaApertura: "2026-01-01",
        liquidez: true,
        permiteSalidaExterior: true,
      },
      undefined,
      NOW,
    );
    const h = harness(db);
    await h.enroll();
    const response = await h.request("/api/resumen-inicio");
    expect(response.status).toBe(200);
    const dto = response.data as ResumenInicio;
    expect(dto.contexto.ciclo).toBeNull();
    expect(dto.contexto.motivos).toContain("Sin ciclos registrados.");
    expect(dto.secciones.ciclo.ingresos.estado).toBe("No disponible");
    expect(dto.secciones.inversion.agregado).toBeNull();
    expect(dto.secciones.liquidez.metrica.estado).toBe("No disponible");
    expect(dto.secciones.saldos.items.map((item) => item.id)).toEqual([
      "S001",
      "S002",
      "S003",
      "S004",
      "S005",
    ]);
    expect(dto.secciones.deudaNoHipotecaria.total.estado).toBe("Sin datos");
  } finally {
    db.close();
  }
});

test("AC-09/10/19/23: enlaces por ID, sin sumas cruzadas y pendientes sin total monetario", async () => {
  const { db } = baseFixture();
  try {
    const dto = resumenInicio(db, NOW);
    expect(dto.secciones.liquidez.metrica.enlace).toEqual({
      ruta: "/saldos",
      ids: ["S001", "S002", "S003"],
    });
    expect(dto.secciones.ciclo.ingresos.enlace).toEqual({
      ruta: "/flujo-mensual?ciclo=7",
      ids: [],
    });
    expect(dto.secciones.objetivo.metrica.enlace).toEqual({
      ruta: "/plan-anual",
      ids: [],
    });
    expect(dto.secciones.inversion.fuente.ids).toEqual(["I1001", "I1002"]);
    expect(dto.secciones.deudaNoHipotecaria.total.fuente.ids).toEqual([
      "D001",
      "D002",
      "D005",
    ]);
    expect(dto.secciones.saldos.items.filter((item) => item.bolsa)).toHaveLength(
      1,
    );
    expect(dto.secciones.saldos.enlace).toEqual({
      ruta: "/saldos",
      ids: ["S001", "S002", "S003", "S004", "S005", "S006", "S007"],
    });
    expect(dto.secciones.ahorro.enlace).toEqual({
      ruta: "/saldos",
      ids: ["S002"],
    });
    expect(dto.secciones.inversion.enlace).toEqual({
      ruta: "/inversiones",
      ids: ["I1001", "I1002"],
    });
    expect(dto.secciones.deudaNoHipotecaria.enlace).toEqual({
      ruta: "/deudas",
      ids: ["D001", "D002", "D005"],
    });
    expect(dto.secciones.objetivo.costeEsencialMensual.fuente.motor).toBe(
      "E2.4 annualEquivalent",
    );
    for (const enlace of [
      dto.secciones.saldos.enlace,
      dto.secciones.ahorro.enlace,
      dto.secciones.inversion.enlace,
      dto.secciones.deudaNoHipotecaria.enlace,
    ])
      for (const id of enlace.ids) expect(id).toMatch(/^(S|D|I)\d+$/);
    expect(dto.secciones.saldos).not.toHaveProperty("total");
    expect(dto.secciones.ahorro).not.toHaveProperty("total");
    expect(dto.secciones.pendientes.sinTotalEconomico).toBe(true);
    expect(dto.secciones.pendientes.metrica.clase).toBe("informativo");
    expect(dto.secciones.pendientes.metrica.valor).toBeNull();
    expect(dto.secciones.pendientes.metrica.enlace).toEqual({
      ruta: "/pendientes",
      ids: [],
    });
    expect(dto.secciones.pendientes.conteo).not.toBeNull();
    for (const item of dto.secciones.pendientes.items) {
      expect(item.fuente.motor).toBeTruthy();
      expect(Array.isArray(item.enlaces)).toBe(true);
    }
  } finally {
    db.close();
  }
});

test("AC-28: el ejercicio del coste esencial sale de mesFinanciado (Q4=A)", () => {
  const at = Date.parse("2027-02-10T12:00:00Z");
  const db = openDatabase(":memory:");
  try {
    updateSaldo(
      db,
      "S001",
      {
        revision: getSaldo(db, "S001").revision,
        saldoApertura: "0.00",
        fechaApertura: "2026-01-01",
        liquidez: true,
        permiteSalidaExterior: true,
      },
      undefined,
      at,
    );
    db.run(
      "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('8','2026-11-20',0,'2026-11-20T00:00:00.000Z')",
    );
    const category = createClassification(
      db,
      "categorias",
      {
        nombre: "Gasto ficticio C008",
        anual: "Gasto",
        mensual: "Gasto",
        referencia: false,
      },
      randomUUID(),
      at,
    );
    const sub = createClassification(
      db,
      "subcategorias",
      { nombre: "Sub ficticia C008", padre: category.id },
      randomUUID(),
      at,
    );
    const p = createClassification(
      db,
      "partidas",
      { nombre: "Partida ficticia C008", padre: sub.id },
      randomUUID(),
      at,
    ).id;
    saveMovement(
      db,
      {
        tipo: "Ingreso",
        fecha: "2027-01-19",
        saldo: "S001",
        subtipo: "Nómina",
        importe: "2000.00",
        concepto: "Nómina ficticia C008",
      },
      at,
    );
    saveAnnual(db, 2026, p, { presupuesto: "18000.00", esencial: "Sí" }, at);
    saveAnnual(db, 2027, p, { presupuesto: "24000.00", esencial: "Sí" }, at);

    const dto = resumenInicio(db, at);
    expect(dto.contexto.ciclo).toMatchObject({
      id: "8",
      inicio: "2026-11-20",
      mesFinanciado: "2026-12",
      corte: "2027-01-19",
    });
    expect(dto.secciones.objetivo.costeEsencialMensual).toMatchObject({
      valor: "1500.00",
      ejercicio: 2026,
      ejercicioOrigen: "mesFinanciado",
      estadoEquivalente: "Completo",
    });
    expect(dto.secciones.objetivo.costeEsencialMensual.valor).not.toBe(
      "2000.00",
    );
  } finally {
    db.close();
  }
});
