// Isolated E4.6 source with real MFA. Test-only; never imported by the app and
// never pointed at real data. Seeds the fictitious C007 fixture used by the
// specification/testplan with the public engines, exactly for E2E composition.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { loadKey, provision } from "../src/auth";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";
import { createSaldo, getSaldo, updateSaldo } from "../src/saldos";
import { createClassification } from "../src/clasificacion";
import { previewMovement, writeMovement } from "../src/movimientos";
import { createDebt, updateDebt } from "../src/deudas";
import { createInstrumento } from "../src/instrumentos";
import { createPurchase } from "../src/compras";
import { createValuation } from "../src/e43";
import {
  confirmAnnualPlan,
  getAnnualPlan,
  previewAnnualPlan,
} from "../src/plan-anual";
import { createBudget } from "../src/presupuestos";
import {
  confirmCyclePlan,
  getCyclePlan,
  previewCyclePlan,
} from "../src/planes-ciclo";

if (process.env.NODE_ENV !== "test") throw new Error("Test process only");

const NOW = Date.parse("2026-11-03T10:00:00Z");
const scenario = process.env.E46_SCENARIO ?? "base";
const zero = scenario === "zero";
const degraded = scenario === "degradado";
const auth = scenario === "auth";
const casa = scenario === "casa";
const dir = casa
  ? ".local/e2e-inicio-casa"
  : auth
    ? ".local/e2e-inicio-auth"
    : degraded
      ? ".local/e2e-inicio-degradado"
      : zero
        ? ".local/e2e-inicio-zero"
        : ".local/e2e-inicio";
const port = casa ? 3018 : auth ? 3017 : degraded ? 3016 : zero ? 3015 : 3014;

function saveMovement(db: Database, body: Record<string, unknown>) {
  const plan = previewMovement(db, body, null, false, NOW);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    null,
    false,
    NOW,
  ).movimiento;
}

function saveAnnual(
  db: Database,
  year: number,
  partida: string,
  changes: Record<string, unknown>,
) {
  const plan = getAnnualPlan(db, year, NOW);
  const proposal = {
    partida,
    revision: 0,
    contextRevision: plan.contextRevision,
    cambios: changes,
  };
  const preview = previewAnnualPlan(db, year, proposal, NOW);
  return confirmAnnualPlan(
    db,
    year,
    {
      propuesta: proposal,
      fingerprint: preview.fingerprint,
      motivo: "Fixture sintética E4.6",
    },
    randomUUID(),
    NOW,
  );
}

function saveCyclePlan(
  db: Database,
  cycle: string,
  lines: Record<string, unknown>[],
) {
  const plan = getCyclePlan(db, cycle, NOW);
  const proposal = {
    revision: plan.revision,
    contextRevision: plan.contextRevision,
    cambios: lines,
  };
  const preview = previewCyclePlan(db, cycle, proposal, NOW);
  return confirmCyclePlan(
    db,
    cycle,
    {
      propuesta: proposal,
      fingerprint: preview.fingerprint,
      motivo: "Fixture sintética E4.6",
    },
    randomUUID(),
    NOW,
  );
}

/** Fictitious C007 scenario from the E4.6 testplan. No personal data. */
function seedInicioFixture(db: Database) {
  const update = (id: string, body: Record<string, unknown>) =>
    updateSaldo(
      db,
      id,
      { revision: getSaldo(db, id).revision, ...body },
      undefined,
      NOW,
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
    NOW,
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
    NOW,
  );

  // C007 se materializa con el ID numérico que exige E2.6.
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
    NOW,
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub ficticia E4.6", padre: category.id },
    randomUUID(),
    NOW,
  );
  const partida = (nombre: string, deuda?: string) =>
    createClassification(
      db,
      "partidas",
      { nombre, padre: sub.id, ...(deuda ? { deuda } : {}) },
      randomUUID(),
      NOW,
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
      NOW,
    );
  const d001 = debt("Préstamo demo", "No hipotecaria", "1000.00");
  debt("Financiación demo", "No hipotecaria", "300.00");
  debt("Hipoteca demo", "Hipotecaria", "50000.00");
  const d004 = debt("Deuda sin informar demo", null, "200.00");
  const d005 = debt("Deuda incompleta demo", "No hipotecaria", "500.00");
  db.run("UPDATE deudas SET apertura=NULL WHERE id=?", [d005.id]);
  const d006 = debt("Deuda inactiva demo", "No hipotecaria", "400.00");
  updateDebt(
    db,
    d006.id,
    { revision: d006.revision, estado: "Inactiva" },
    NOW,
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
  saveMovement(db, {
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
    NOW,
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
    NOW,
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
    NOW,
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
    NOW,
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
    NOW,
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
    NOW,
  );

  // Plan anual 2026: 18.000,00 esenciales -> 1.500,00/mes.
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
      NOW,
    ),
    createBudget(
      db,
      {
        nombre: "Presupuesto ahorro",
        fuente: "Aportación a saldo",
        destino: "S002",
      },
      randomUUID(),
      NOW,
    ),
    createBudget(
      db,
      {
        nombre: "Presupuesto inversión",
        fuente: "Aportación a saldo",
        destino: s007.id,
      },
      randomUUID(),
      NOW,
    ),
    createBudget(
      db,
      { nombre: "Presupuesto gasto B", fuente: "Gasto real", destino: "S001" },
      randomUUID(),
      NOW,
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
}

/** V-LIQ-CERO: no eligible liquidity; E2.6 publishes 0.00 verified. */
function zeroLiquidity(db: Database) {
  for (const id of ["S001", "S002", "S003", "S004", "S005"])
    updateSaldo(
      db,
      id,
      { revision: getSaldo(db, id).revision, liquidez: false },
      undefined,
      NOW,
    );
}

rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
seedInicioFixture(db);
if (zero) zeroLiquidity(db);
const key = loadKey(db, dir + "/auth.key");
// Bootstrap uses the real clock so the real MFA window remains valid.
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port })),
    ),
  ),
);
