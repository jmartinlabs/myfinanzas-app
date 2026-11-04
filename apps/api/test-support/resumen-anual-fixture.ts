import { randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";
import { getSaldo, updateSaldo, createSaldo } from "../src/saldos";
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

/**
 * Fixture sintética de E4.7. Solo IDs e importes ficticios de SPEC20/24/25.
 * No usa Excel, bases reales ni datos personales.
 *
 * `7` reproduce el contrato real de E2.6 (C007): 2.250,00 de ingresos,
 * 1.800,00 de gasto bruto, 100,00 de extraordinaria y 2.000,00 de nómina.
 * `8` cruza diciembre/enero (2026-11-20 a 2027-01-15) para comprobar que un
 * Ciclo aparece en dos ejercicios sin prorrateo.
 */
export const SEED_NOW = Date.parse("2027-02-01T10:00:00Z");

function saveMovement(
  db: Database,
  body: Record<string, unknown>,
  now = SEED_NOW,
) {
  const plan = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    null,
    false,
    now,
  ).movimiento;
}

function saveAnnual(
  db: Database,
  year: number,
  partida: string,
  changes: Record<string, unknown>,
  now = SEED_NOW,
) {
  const plan = getAnnualPlan(db, year, now);
  const proposal = {
    partida,
    revision: 0,
    contextRevision: plan.contextRevision,
    cambios: changes,
  };
  const preview = previewAnnualPlan(db, year, proposal, now);
  return confirmAnnualPlan(
    db,
    year,
    {
      propuesta: proposal,
      fingerprint: preview.fingerprint,
      motivo: "Fixture sintética E4.7",
    },
    randomUUID(),
    now,
  );
}

export function seedResumenAnualFixture(db: Database, at = SEED_NOW) {
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
  update("S003", {
    saldoApertura: "2375.40",
    fechaApertura: "2026-01-01",
    liquidez: true,
    permiteSalidaExterior: true,
    finalidad: "Inversión",
    mostrarComoBolsa: false,
  });

  // C007 (2026) y C008 (cruza 2026/2027). Los IDs de ciclo son numéricos
  // porque monthlyFlow lo exige.
  db.run(
    "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('7','2026-06-20',0,'2026-06-20T00:00:00.000Z')",
  );
  db.run(
    "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('8','2026-11-20',0,'2026-11-20T00:00:00.000Z')",
  );

  const category = createClassification(
    db,
    "categorias",
    {
      nombre: "Gasto ficticio E4.7",
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
    { nombre: "Sub ficticia E4.7", padre: category.id },
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
  const pGeneric = partida("Gasto corriente ficticio E4.7");

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
  const d001 = debt("Préstamo demo E4.7", "No hipotecaria", "1000.00");
  debt("Financiación demo E4.7", "No hipotecaria", "300.00");
  debt("Hipoteca demo E4.7", "Hipotecaria", "50000.00");
  const d004 = debt("Deuda sin informar demo E4.7", null, "200.00");
  const d005 = debt("Deuda incompleta demo E4.7", "No hipotecaria", "500.00");
  db.run("UPDATE deudas SET apertura=NULL WHERE id=?", [d005.id]);
  const d006 = debt("Deuda inactiva demo E4.7", "No hipotecaria", "400.00");
  updateDebt(
    db,
    d006.id,
    { revision: d006.revision, estado: "Inactiva" },
    at,
  );
  const pD001 = partida("Cuota préstamo demo E4.7", d001.id);
  const pD004 = partida("Cuota deuda sin informar demo E4.7", d004.id);

  // C007: 2.250,00 ingresos, 1.800,00 gasto bruto y 100,00 extraordinaria.
  saveMovement(db, {
    tipo: "Ingreso",
    fecha: "2026-06-25",
    saldo: "S001",
    subtipo: "Nómina",
    importe: "2000.00",
    concepto: "Nómina ficticia E4.7",
  });
  saveMovement(db, {
    tipo: "Ingreso",
    fecha: "2026-06-26",
    saldo: "S001",
    subtipo: "Bonus",
    importe: "200.00",
    concepto: "Bonus ficticio E4.7",
  });
  saveMovement(db, {
    tipo: "Ingreso",
    fecha: "2026-07-19",
    saldo: "S001",
    subtipo: "Intereses",
    importe: "50.00",
    concepto: "Intereses ficticios E4.7",
  });
  saveMovement(db, {
    tipo: "Gasto",
    fecha: "2026-07-05",
    saldo: "S001",
    partida: pD001,
    importe: "300.00",
    capital: "280.00",
    intereses: "20.00",
    concepto: "Cuota ficticia E4.7",
  });
  saveMovement(db, {
    tipo: "Gasto",
    fecha: "2026-07-06",
    saldo: "S001",
    partida: pGeneric,
    importe: "300.00",
    concepto: "Compartido bruto ficticio E4.7",
  });
  saveMovement(db, {
    tipo: "Gasto",
    fecha: "2026-07-08",
    saldo: "S001",
    partida: pGeneric,
    importe: "1050.00",
    concepto: "Gastos corrientes ficticios E4.7",
  });
  saveMovement(db, {
    tipo: "Gasto",
    fecha: "2026-07-16",
    saldo: "S001",
    partida: pGeneric,
    importe: "100.00",
    concepto: "Terminal ficticio E4.7",
  });
  saveMovement(db, {
    tipo: "Gasto",
    fecha: "2026-07-18",
    saldo: "S001",
    partida: pGeneric,
    importe: "50.00",
    concepto: "Comida auxiliar ficticia E4.7",
  });
  saveMovement(db, {
    tipo: "Amortización deuda",
    fecha: "2026-07-19",
    saldo: "S001",
    partida: pD004,
    importe: "100.00",
    concepto: "Amortización extraordinaria ficticia E4.7",
  });

  // C008 cruza diciembre/enero: el Gasto de diciembre pertenece a 2026 y el
  // ingreso de enero a 2027; el Ciclo se muestra en ambos ejercicios.
  saveMovement(db, {
    tipo: "Gasto",
    fecha: "2026-12-28",
    saldo: "S001",
    partida: pGeneric,
    importe: "120.00",
    concepto: "Gasto de diciembre ficticio E4.7",
  });
  saveMovement(db, {
    tipo: "Ingreso",
    fecha: "2027-01-10",
    saldo: "S001",
    subtipo: "Nómina",
    importe: "600.00",
    concepto: "Nómina de enero ficticia E4.7",
  });
  saveMovement(db, {
    tipo: "Gasto",
    fecha: "2027-01-15",
    saldo: "S001",
    partida: pGeneric,
    importe: "80.00",
    concepto: "Gasto de enero ficticio E4.7",
  });

  // Contexto patrimonial E4.3: una posición con valoración ficticia.
  const s007 = createSaldo(
    db,
    {
      nombre: "Cartera demo E4.7",
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
  const i1 = createInstrumento(
    db,
    {
      nombre: "Fondo índice demo E4.7",
      isin: "ES0000000107",
      isinEvidencia: "Extracto ficticio E4.7",
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
      concepto: "Compra ficticia E4.7",
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
      procedencia: "Fixture sintética E4.7",
    },
    randomUUID(),
    at,
  );

  // Plan anual 2026: 18.000,00 esenciales. El Ejecutado queda parcial porque
  // no hay proveedor histórico/control (E4.5/DT7).
  saveAnnual(db, 2026, pGeneric, {
    presupuesto: "18000.00",
    esencial: "Sí",
    periodo: "Ejercicio 2026",
  });

  return {
    db,
    partidas: { pGeneric, pD001, pD004 },
    ciclos: ["7", "8"],
    posiciones: { s003: s007 },
    instrumentos: { i1 },
  };
}

export type ResumenAnualFixture = ReturnType<typeof seedResumenAnualFixture>;
