import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { openDatabase } from "./database";
import { createDebt, debtPeriod, getDebt } from "./deudas";
import { createClassification } from "./clasificacion";
import { createSaldo, getSaldo } from "./saldos";
import {
  previewMovement,
  writeMovement,
} from "./movimientos";
import {
  getDeudaCompleta,
  listConciliacionesDeuda,
  listDeudasCompletas,
} from "./deuda-completa";
import { Auth, provision, totp } from "./auth";
import { createApp } from "./app";
import { Problem } from "./problem";
import { ledgerRows } from "./movement-ledger";

const now = Date.parse("2026-10-22T12:00:00Z");

function setup(db: Database) {
  const c = createClassification(
    db,
    "categorias",
    {
      nombre: "Gasto ficticio",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub ficticia", padre: c.id },
    randomUUID(),
  );
  const d = createDebt(
    db,
    {
      nombre: "Préstamo ficticio",
      inicioControl: "2026-10-01",
      capitalApertura: "1000",
    },
    randomUUID(),
  );
  const p = createClassification(
    db,
    "partidas",
    { nombre: "Cuota ficticia", padre: sub.id, deuda: d.id },
    randomUUID(),
  );
  const s = createSaldo(
    db,
    {
      nombre: "Banco ficticio",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500",
      fechaApertura: "2026-10-20",
      permiteSalidaExterior: true,
    },
    randomUUID(),
  );
  return { d, p, s, sub };
}

const quota = (s: string, p: string, extra: Record<string, unknown> = {}) => ({
  tipo: "Gasto",
  fecha: "2026-10-01",
  saldo: s,
  partida: p,
  importe: "100",
  capital: "80",
  intereses: "20",
  ...extra,
});

function save(
  db: Database,
  body: Record<string, unknown>,
  id: string | null = null,
  annul = false,
) {
  const plan = previewMovement(db, body, id, annul, now);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    id,
    annul,
    now,
  ).movimiento;
}

function annul(db: Database, id: string) {
  const revision = (
    db.query("SELECT revision FROM movimientos WHERE id=?").get(id) as {
      revision: number;
    }
  ).revision;
  const body = { revision, motivo: "Anulación ficticia de prueba" };
  const plan = previewMovement(db, body, id, true, now);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint },
    randomUUID(),
    id,
    true,
    now,
  ).movimiento;
}

function debtFixture(db: Database) {
  const base = setup(db);
  const h1 = save(
    db,
    quota(base.s.id, base.p.id, {
      fecha: "2026-09-30",
      importe: "70",
      capital: "50",
      intereses: "20",
    }),
  );
  const h2 = save(db, quota(base.s.id, base.p.id));
  const h3 = save(
    db,
    quota(base.s.id, base.p.id, {
      tipo: "Amortización deuda",
      fecha: "2026-10-15",
      importe: "200",
      capital: undefined,
      intereses: undefined,
    }),
  );
  return { ...base, h1, h2, h3 };
}

function record(
  db: Database,
  input: {
    id: string;
    fecha: string;
    tipo: "Gasto" | "Amortización deuda";
    importe: number;
    capital: number | null;
    intereses: number | null;
    partida: string;
    saldo: string;
    anulado?: number;
  },
) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,referencia,concepto,nota,capital,intereses,anulado,revision,creado,actualizado)
     VALUES(?,?,?,?,?,'S000',NULL,?,NULL,'Fixture','',?,?,?,1,'2026-10-22T00:00:00Z','2026-10-22T00:00:00Z')`,
    [
      input.id,
      input.fecha,
      input.tipo,
      input.importe,
      input.saldo,
      input.partida,
      input.capital,
      input.intereses,
      input.anulado ?? 0,
    ],
  );
}

function conciliation(
  db: Database,
  input: {
    id: string;
    deuda: string;
    fechaCorte: string;
    capitalDeclarado: number;
    estado?: "Vigente" | "Anulada";
    fuente?: string | null;
    nota?: string | null;
  },
) {
  db.run(
    `INSERT INTO conciliaciones_deuda(id,deuda,fecha_corte,capital_declarado,fuente,nota,estado,revision,actor,creado,actualizado)
     VALUES(?,?,?,?,?,?,?,1,'usuario-unico','2026-10-22T00:00:00Z','2026-10-22T00:00:00Z')`,
    [
      input.id,
      input.deuda,
      input.fechaCorte,
      input.capitalDeclarado,
      input.fuente ?? "Banco ficticio",
      input.nota ?? "Extracto ficticio",
      input.estado ?? "Vigente",
    ],
  );
}

function setHistorico(db: Database, id: string, amortizado = 20000) {
  db.run(
    `UPDATE deudas SET tipo_deuda='No hipotecaria',tin=2500000,tae=2800000,cuota_contractual=10000,
     condiciones='Condiciones ficticias informativas',capital_inicial=120000,
     capital_amortizado_historico=?,amortizacion_extra_historica=0,capital_historico_cuotas=120000,
     intereses_historicos=30000,total_pagado_historico=150000,precontrol_cuotas=3,
     precontrol_capital=5000,precontrol_amortizacion_extra=0,precontrol_ejercicio=2026 WHERE id=?`,
    [amortizado, id],
  );
}

test("E4.4 read model: listado y ficha con apertura, cuotas, extraordinaria, R5 y conciliación múltiple", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, s, h1, h2, h3 } = debtFixture(db);
    setHistorico(db, d.id);
    conciliation(db, {
      id: "C001",
      deuda: d.id,
      fechaCorte: "2026-10-10",
      capitalDeclarado: 93000,
    });
    conciliation(db, {
      id: "C002",
      deuda: d.id,
      fechaCorte: "2026-10-20",
      capitalDeclarado: 75000,
    });
    conciliation(db, {
      id: "C003",
      deuda: d.id,
      fechaCorte: "2026-09-01",
      capitalDeclarado: 100000,
      estado: "Anulada",
    });

    const list = listDeudasCompletas(db);
    expect(list.total).toBe(1);
    expect(list.page).toBe(1);
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({
      id: "D001",
      nombre: "Préstamo ficticio",
      tipoDeuda: "No hipotecaria",
      estado: "Activa",
      inicioControl: "2026-10-01",
      capitalApertura: "1000.00",
      capitalPendiente: "720.00",
    });
    expect(list.items[0].capital).toEqual({
      aplicado: "280.00",
      deudaViva: "720.00",
      calculable: true,
      motivoNoCalculable: null,
      hechosInvalidos: [],
    });
    expect(list.items[0].conciliacion).toMatchObject({
      id: "C002",
      fechaCorte: "2026-10-20",
      capitalDeclarado: "750.00",
      diferencia: "30.00",
      estadoConciliacion: "Diferencia",
    });
    expect(list.items[0].varias).toBe(true);

    const ficha = getDeudaCompleta(db, d.id, null, now);
    expect(ficha.control).toEqual({
      inicio: "2026-10-01",
      capitalApertura: "1000.00",
      capitalControl: "1000.00",
    });
    expect(ficha.condiciones).toEqual({
      tin: "2.500000",
      tae: "2.800000",
      cuotaContractual: "100.00",
      texto: "Condiciones ficticias informativas",
    });
    expect(ficha.corte).toBeNull();
    expect(ficha.capital).toEqual({
      aplicado: "280.00",
      deudaViva: "720.00",
      calculable: true,
      motivoNoCalculable: null,
      hechosInvalidos: [],
    });
    expect(ficha.cobertura).toEqual({
      desdeControl: true,
      hastaCorte: false,
      incluyePrecontrol: true,
      hechosAplicables: 2,
      hechosExcluidosPorCorte: 0,
      hechosAnulados: 0,
      desgloseVerificable: true,
    });
    expect(ficha.historia.map((h) => h.movimiento)).toEqual([
      h1.id,
      h2.id,
      h3.id,
    ]);
    expect(ficha.historia[0]).toMatchObject({
      fecha: "2026-09-30",
      tipo: "Gasto",
      total: "70.00",
      capital: "50.00",
      intereses: "20.00",
      gasto: "70.00",
      efectoBanco: "-70.00",
      aplicaAlCapital: false,
      estado: "Vigente",
    });
    expect(ficha.historia[1]).toMatchObject({
      fecha: "2026-10-01",
      total: "100.00",
      capital: "80.00",
      intereses: "20.00",
      gasto: "100.00",
      efectoBanco: "-100.00",
      aplicaAlCapital: true,
    });
    expect(ficha.historia[2]).toMatchObject({
      fecha: "2026-10-15",
      tipo: "Amortización deuda",
      total: "200.00",
      capital: "200.00",
      intereses: "0.00",
      gasto: "0.00",
      efectoBanco: "-200.00",
      aplicaAlCapital: true,
    });
    expect(ficha.totales).toEqual({
      capital: "280.00",
      intereses: "20.00",
      gasto: "100.00",
      banco: "-300.00",
      anulados: 0,
    });
    expect(ficha.historico).toMatchObject({
      capitalInicial: "1200.00",
      capitalAmortizadoHistorico: "200.00",
      amortizacionExtraHistorica: "0.00",
      capitalHistoricoCuotas: "1200.00",
      interesesHistoricos: "300.00",
      totalPagadoHistorico: "1500.00",
    });
    expect(ficha.historico.precontrol).toEqual({
      ejercicio: 2026,
      cuotas: 3,
      capital: "50.00",
      amortizacionExtra: "0.00",
    });
    expect(ficha.historico.comprobacion.capital).toEqual({
      aplicable: true,
      estado: "Consistente",
      diferencia: "0.00",
      motivo: null,
    });
    expect(ficha.historico.comprobacion.cuotas).toMatchObject({
      aplicable: false,
      estado: "No calculable",
      diferencia: null,
    });

    expect(ficha.conciliaciones.map((c) => c.id)).toEqual([
      "C002",
      "C001",
      "C003",
    ]);
    expect(ficha.conciliaciones[0]).toMatchObject({
      id: "C002",
      fechaCorte: "2026-10-20",
      diferencia: "30.00",
      estadoConciliacion: "Diferencia",
    });
    expect(ficha.conciliaciones[1]).toMatchObject({
      id: "C001",
      fechaCorte: "2026-10-10",
      diferencia: "10.00",
      estadoConciliacion: "Diferencia",
    });
    expect(ficha.conciliaciones[2]).toMatchObject({
      id: "C003",
      estado: "Anulada",
      diferencia: null,
      estadoConciliacion: "No comparable",
    });
    expect(ficha.conciliacionVigente?.id).toBe("C002");
    expect(ficha.varias).toBe(true);

    // E4.4 never turns Deuda into a Saldo; the bank keeps its own position.
    expect(getSaldo(db, s.id).posicion.importe).toBe("130.00");
    // Regression: the E1.6 reader keeps its behaviour.
    expect(getDebt(db, d.id).capitalPendiente).toBe("720.00");
    const period = debtPeriod(db, ledgerRows(db));
    expect(period.desgloseVerificable).toBe(true);
    expect(period.capital).toBe(33000n);
    expect(period.intereses).toBe(4000n);

    // R5 inconsistency is visible with the exact positive sign and never
    // changes the outstanding capital.
    db.run(
      "UPDATE deudas SET capital_amortizado_historico=21000 WHERE id=?",
      [d.id],
    );
    const inconsistent = getDeudaCompleta(db, d.id, null, now);
    expect(inconsistent.historico.comprobacion.capital).toEqual({
      aplicable: true,
      estado: "Inconsistente",
      diferencia: "10.00",
      motivo: null,
    });
    expect(inconsistent.capital.deudaViva).toBe("720.00");
  } finally {
    db.close();
  }
});

test("E4.4 corte: inclusivo, no futuro, anterior al control y conciliación con su propia fecha", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, h1, h2, h3 } = debtFixture(db);
    conciliation(db, {
      id: "C001",
      deuda: d.id,
      fechaCorte: "2026-10-10",
      capitalDeclarado: 93000,
    });
    conciliation(db, {
      id: "C002",
      deuda: d.id,
      fechaCorte: "2026-10-20",
      capitalDeclarado: 75000,
    });

    const at = (corte: string) => getDeudaCompleta(db, d.id, corte, now);

    const first = at("2026-10-01");
    expect(first.corte).toBe("2026-10-01");
    expect(first.capital).toMatchObject({
      aplicado: "80.00",
      deudaViva: "920.00",
      calculable: true,
    });
    expect(first.historia.map((h) => h.movimiento)).toEqual([h1.id, h2.id]);
    expect(first.cobertura).toMatchObject({
      desdeControl: true,
      hastaCorte: true,
      incluyePrecontrol: true,
      hechosAplicables: 1,
      hechosExcluidosPorCorte: 1,
    });
    expect(first.totales).toEqual({
      capital: "80.00",
      intereses: "20.00",
      gasto: "100.00",
      banco: "-100.00",
      anulados: 0,
    });

    expect(at("2026-10-14").capital).toMatchObject({
      aplicado: "80.00",
      deudaViva: "920.00",
    });
    expect(at("2026-10-15").capital).toMatchObject({
      aplicado: "280.00",
      deudaViva: "720.00",
    });
    expect(at("2026-10-15").historia.map((h) => h.movimiento)).toEqual([
      h1.id,
      h2.id,
      h3.id,
    ]);
    expect(at("2026-10-20").capital.deudaViva).toBe("720.00");
    expect(at("2026-10-22").capital.deudaViva).toBe("720.00");

    const beforeControl = at("2026-09-15");
    expect(beforeControl.capital).toEqual({
      aplicado: null,
      deudaViva: null,
      calculable: false,
      motivoNoCalculable: "El corte es anterior al Inicio control.",
      hechosInvalidos: [],
    });
    expect(beforeControl.historia).toEqual([]);
    expect(beforeControl.cobertura).toMatchObject({
      desdeControl: false,
      hastaCorte: true,
      incluyePrecontrol: false,
      hechosAplicables: 0,
      hechosExcluidosPorCorte: 3,
    });

    // The reconciliation always uses its own fechaCorte; the requested corte
    // does not rewrite the declared comparison.
    expect(first.conciliaciones.find((c) => c.id === "C001")).toMatchObject({
      fechaCorte: "2026-10-10",
      diferencia: "10.00",
    });
    expect(first.conciliaciones.find((c) => c.id === "C002")).toMatchObject({
      fechaCorte: "2026-10-20",
      diferencia: "30.00",
    });

    try {
      at("2026-10-23");
      throw new Error("El corte futuro debió rechazarse.");
    } catch (error) {
      expect(error).toBeInstanceOf(Problem);
      expect((error as Problem).status).toBe(422);
      expect((error as Problem).fields.corte).toBeDefined();
    }
    try {
      at("2026-02-30");
      throw new Error("La fecha inválida debió rechazarse.");
    } catch (error) {
      expect(error).toBeInstanceOf(Problem);
      expect((error as Problem).status).toBe(422);
    }
  } finally {
    db.close();
  }
});

test("E4.4 posición sin hechos, apertura cero y null distinto de cero", () => {
  const db = openDatabase(":memory:");
  try {
    const { sub } = setup(db);
    const noFacts = createDebt(
      db,
      {
        nombre: "Deuda sin hechos",
        inicioControl: "2026-10-01",
        capitalApertura: "500",
      },
      randomUUID(),
    );
    const zero = createDebt(
      db,
      {
        nombre: "Deuda apertura cero",
        inicioControl: "2026-10-01",
        capitalApertura: "0",
      },
      randomUUID(),
    );
    createDebt(
      db,
      {
        nombre: "Deuda apertura cero",
        inicioControl: "2026-10-01",
        capitalApertura: "0",
      },
      randomUUID(),
    );
    db.run(
      "INSERT INTO deudas(id,nombre,inicio,apertura,estado,revision,creado,actualizado) VALUES('D901','Sin Inicio control',NULL,100,'Activa',1,'2026-10-01T00:00:00Z','2026-10-01T00:00:00Z')",
    );
    db.run(
      "INSERT INTO deudas(id,nombre,inicio,apertura,estado,revision,creado,actualizado) VALUES('D900','Apertura no informada',NULL,NULL,'Activa',1,'2026-10-01T00:00:00Z','2026-10-01T00:00:00Z')",
    );

    const noFactsFicha = getDeudaCompleta(db, noFacts.id, null, now);
    expect(noFactsFicha.capital).toEqual({
      aplicado: "0.00",
      deudaViva: "500.00",
      calculable: true,
      motivoNoCalculable: null,
      hechosInvalidos: [],
    });
    expect(noFactsFicha.historia).toEqual([]);
    expect(noFactsFicha.totales).toEqual({
      capital: "0.00",
      intereses: "0.00",
      gasto: "0.00",
      banco: "0.00",
      anulados: 0,
    });

    const zeroFicha = getDeudaCompleta(db, zero.id, null, now);
    expect(zeroFicha.capital).toMatchObject({
      aplicado: "0.00",
      deudaViva: "0.00",
      calculable: true,
    });

    const missingOpening = getDeudaCompleta(db, "D900", null, now);
    expect(missingOpening.capital).toEqual({
      aplicado: null,
      deudaViva: null,
      calculable: false,
      motivoNoCalculable: "Falta el capital de apertura.",
      hechosInvalidos: [],
    });
    expect(missingOpening.capitalPendiente).toBeNull();

    const missingStart = getDeudaCompleta(db, "D901", null, now);
    expect(missingStart.capital).toMatchObject({
      aplicado: null,
      deudaViva: null,
      calculable: false,
      motivoNoCalculable: "Falta el Inicio control.",
    });

    const early = getDeudaCompleta(db, noFacts.id, "2026-09-15", now);
    expect(early.capital).toMatchObject({
      aplicado: null,
      deudaViva: null,
      calculable: false,
      motivoNoCalculable: "El corte es anterior al Inicio control.",
    });

    // Unknown conditions are null, never zero.
    expect(noFactsFicha.condiciones).toEqual({
      tin: null,
      tae: null,
      cuotaContractual: null,
      texto: null,
    });
    expect(noFactsFicha.historico.precontrol).toBeNull();
    expect(noFactsFicha.historico.comprobacion.capital.estado).toBe(
      "Sin datos",
    );
    // The Partida is intentionally unused by this fixture; keep the setup
    // helper's returned value meaningful for future cases.
    expect(sub.id.startsWith("SUB")).toBe(true);
  } finally {
    db.close();
  }
});

test("E4.4 desglose inválido bloquea solo esa deuda en ese corte; precontrol inválido no bloquea", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, p, s, sub } = setup(db);
    save(db, quota(s.id, p.id));
    const other = createDebt(
      db,
      {
        nombre: "Deuda válida",
        inicioControl: "2026-10-01",
        capitalApertura: "500",
      },
      randomUUID(),
    );
    const otherPartida = createClassification(
      db,
      "partidas",
      { nombre: "Cuota de la otra deuda", padre: sub.id, deuda: other.id },
      randomUUID(),
    );
    save(
      db,
      quota(s.id, otherPartida.id, {
        fecha: "2026-10-01",
        importe: "50",
        capital: "50",
        intereses: "0",
      }),
    );

    // Applicable fact with an absent breakdown (legacy/invalid fixture).
    record(db, {
      id: "9101",
      fecha: "2026-10-10",
      tipo: "Gasto",
      importe: 10000,
      capital: null,
      intereses: null,
      partida: p.id,
      saldo: s.id,
    });
    // Precontrol fact with an absent breakdown: visible but never an operand.
    record(db, {
      id: "9102",
      fecha: "2026-09-20",
      tipo: "Gasto",
      importe: 10000,
      capital: null,
      intereses: null,
      partida: otherPartida.id,
      saldo: s.id,
    });

    const before = getDeudaCompleta(db, d.id, "2026-10-05", now);
    expect(before.capital).toMatchObject({
      aplicado: "80.00",
      deudaViva: "920.00",
      calculable: true,
    });

    const onInvalid = getDeudaCompleta(db, d.id, "2026-10-10", now);
    expect(onInvalid.capital).toEqual({
      aplicado: null,
      deudaViva: null,
      calculable: false,
      motivoNoCalculable: "Desglose inválido en el Movimiento 9101.",
      hechosInvalidos: ["9101"],
    });
    expect(onInvalid.cobertura.desgloseVerificable).toBe(false);
    expect(onInvalid.totales.capital).toBeNull();
    expect(onInvalid.totales.intereses).toBeNull();
    expect(onInvalid.capitalPendiente).toBeNull();

    const withoutCorte = getDeudaCompleta(db, d.id, null, now);
    expect(withoutCorte.capital.calculable).toBe(false);
    expect(withoutCorte.capital.hechosInvalidos).toEqual(["9101"]);

    const otherFicha = getDeudaCompleta(db, other.id, null, now);
    expect(otherFicha.capital).toEqual({
      aplicado: "50.00",
      deudaViva: "450.00",
      calculable: true,
      motivoNoCalculable: null,
      hechosInvalidos: [],
    });
    expect(otherFicha.cobertura).toMatchObject({
      incluyePrecontrol: true,
      hechosAplicables: 1,
      desgloseVerificable: true,
    });
    expect(otherFicha.historia.find((h) => h.movimiento === "9102")).toMatchObject({
      aplicaAlCapital: false,
      estado: "Vigente",
    });

    const list = listDeudasCompletas(db);
    expect(
      list.items.find((item) => item.id === d.id)?.capitalPendiente,
    ).toBeNull();
    expect(
      list.items.find((item) => item.id === other.id)?.capitalPendiente,
    ).toBe("450.00");
  } finally {
    db.close();
  }
});

test("E4.4 anulados conservan historia y la conciliación se recalcula sin tocar capital", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, p, s, sub, h3 } = debtFixture(db);
    conciliation(db, {
      id: "C002",
      deuda: d.id,
      fechaCorte: "2026-10-20",
      capitalDeclarado: 75000,
    });

    const before = getDeudaCompleta(db, d.id, null, now);
    expect(before.capital.deudaViva).toBe("720.00");
    expect(before.conciliaciones[0]).toMatchObject({
      diferencia: "30.00",
      estadoConciliacion: "Diferencia",
    });
    // The read model never adds Debt to Saldos.
    expect(getSaldo(db, s.id).posicion.importe).toBe("130.00");

    annul(db, h3.id);
    const after = getDeudaCompleta(db, d.id, null, now);
    expect(after.capital.deudaViva).toBe("920.00");
    expect(after.historia.find((h) => h.movimiento === h3.id)).toMatchObject({
      estado: "Anulado",
      total: "200.00",
      capital: "200.00",
      efectoBanco: "0.00",
      aplicaAlCapital: false,
    });
    expect(after.totales).toEqual({
      capital: "80.00",
      intereses: "20.00",
      gasto: "100.00",
      banco: "-100.00",
      anulados: 1,
    });
    expect(after.conciliaciones[0]).toMatchObject({
      diferencia: "-170.00",
      estadoConciliacion: "Diferencia",
    });

    // Correcting the declared amount is the only way to reconcile; no
    // movement, capital or Saldo is created.
    const movementsBefore = (
      db.query("SELECT COUNT(*) n FROM movimientos").get() as { n: number }
    ).n;
    db.run(
      "UPDATE conciliaciones_deuda SET capital_declarado=92000,revision=revision+1 WHERE id='C002'",
    );
    const reconciled = getDeudaCompleta(db, d.id, null, now);
    expect(reconciled.conciliaciones[0]).toMatchObject({
      capitalDeclarado: "920.00",
      diferencia: "0.00",
      estadoConciliacion: "Conciliado",
    });
    expect(reconciled.capital.deudaViva).toBe("920.00");
    expect(
      db.query("SELECT COUNT(*) n FROM movimientos").get(),
    ).toEqual({ n: movementsBefore });

    // Inherited negative/positive positions are shown, never clamped.
    const negative = createDebt(
      db,
      {
        nombre: "Deuda heredada negativa",
        inicioControl: "2026-10-01",
        capitalApertura: "200",
      },
      randomUUID(),
    );
    const negativePartida = createClassification(
      db,
      "partidas",
      { nombre: "Extra negativa", padre: sub.id, deuda: negative.id },
      randomUUID(),
    );
    record(db, {
      id: "9201",
      fecha: "2026-10-01",
      tipo: "Amortización deuda",
      importe: 21000,
      capital: 21000,
      intereses: 0,
      partida: negativePartida.id,
      saldo: s.id,
    });
    conciliation(db, {
      id: "C005",
      deuda: negative.id,
      fechaCorte: "2026-10-05",
      capitalDeclarado: 0,
    });
    const negativeFicha = getDeudaCompleta(db, negative.id, null, now);
    expect(negativeFicha.capital.deudaViva).toBe("-10.00");
    expect(negativeFicha.conciliaciones[0]).toMatchObject({
      diferencia: "10.00",
      estadoConciliacion: "Diferencia",
    });

    const positive = createDebt(
      db,
      {
        nombre: "Deuda heredada positiva",
        inicioControl: "2026-10-01",
        capitalApertura: "200",
      },
      randomUUID(),
    );
    const positivePartida = createClassification(
      db,
      "partidas",
      { nombre: "Extra positiva", padre: sub.id, deuda: positive.id },
      randomUUID(),
    );
    record(db, {
      id: "9202",
      fecha: "2026-10-01",
      tipo: "Amortización deuda",
      importe: 19000,
      capital: 19000,
      intereses: 0,
      partida: positivePartida.id,
      saldo: s.id,
    });
    conciliation(db, {
      id: "C006",
      deuda: positive.id,
      fechaCorte: "2026-10-05",
      capitalDeclarado: 0,
    });
    const positiveFicha = getDeudaCompleta(db, positive.id, null, now);
    expect(positiveFicha.capital.deudaViva).toBe("10.00");
    expect(positiveFicha.conciliaciones[0]).toMatchObject({
      diferencia: "-10.00",
      estadoConciliacion: "Diferencia",
    });

    // The Partida fixture is used to keep the setup helper honest.
    expect(p.id.startsWith("PAR")).toBe(true);
  } finally {
    db.close();
  }
});

test("E4.4 rutas GET: MFA/sesión, Problem, corte y lectura sin escrituras financieras", async () => {
  const db = openDatabase(":memory:"),
    key = randomBytes(32);
  try {
    const { d } = debtFixture(db);
    conciliation(db, {
      id: "C001",
      deuda: d.id,
      fechaCorte: "2026-10-20",
      capitalDeclarado: 75000,
    });
    const auth = new Auth(db, key),
      enrolled = await auth.enroll(
        provision(db),
        "Contraseña ficticia " + randomUUID(),
      );
    const verified = auth.verify(
      new Request("http://127.0.0.1:5173", {
        headers: { cookie: auth.challengeName + "=" + enrolled.challenge },
      }),
      totp(enrolled.secret!).generate(),
    );
    const handler = HttpApp.toWebHandler(
      createApp(db, { key, now: () => now }),
    );
    const request = (path: string, cookie?: string) =>
      handler(
        new Request("http://127.0.0.1:3001/api" + path, {
          method: "GET",
          headers: cookie ? { cookie } : {},
        }),
      );
    const cookie = auth.cookieName + "=" + verified.session;

    expect((await request("/deudas")).status).toBe(401);
    expect((await request("/deudas/D001")).status).toBe(401);
    expect((await request("/deudas/D001/conciliaciones")).status).toBe(401);

    expect((await request("/deudas", cookie)).status).toBe(200);
    const ficha = await request("/deudas/D001", cookie);
    expect(ficha.status).toBe(200);
    const fichaBody = await ficha.json();
    expect(fichaBody.item.capital.deudaViva).toBe("720.00");
    expect(fichaBody.usos).toHaveLength(3);
    expect(fichaBody.partidas).toHaveLength(1);

    const cut = await request("/deudas/D001?corte=2026-10-01", cookie);
    expect(cut.status).toBe(200);
    expect((await cut.json()).item.capital.deudaViva).toBe("920.00");

    const future = await request("/deudas/D001?corte=2026-10-23", cookie);
    expect(future.status).toBe(422);
    expect(await future.json()).toMatchObject({
      code: "VALIDATION",
      fields: { corte: "Indica una fecha civil no futura." },
    });

    const listWithCut = await request("/deudas?corte=2026-10-01", cookie);
    expect(listWithCut.status).toBe(422);

    const history = await request("/deudas/D001/conciliaciones", cookie);
    expect(history.status).toBe(200);
    expect((await history.json()).items).toHaveLength(1);

    expect((await request("/deudas/D999", cookie)).status).toBe(404);

    const businessTables = [
      "deudas",
      "movimientos",
      "conciliaciones_deuda",
      "audit",
    ];
    const snapshot = () =>
      businessTables.map(
        (table) =>
          [
            table,
            db.query(`SELECT * FROM "${table}" ORDER BY rowid`).all(),
          ] as const,
      );
    const before = snapshot();
    for (const path of [
      "/deudas",
      "/deudas/D001",
      "/deudas/D001?corte=2026-10-01",
      "/deudas/D001/conciliaciones",
    ])
      expect((await request(path, cookie)).status).toBe(200);
    expect(snapshot()).toEqual(before);
    await request("/deudas/D001/conciliaciones", cookie);
    expect(listConciliacionesDeuda(db, d.id)).toHaveLength(1);
  } finally {
    db.close();
  }
});
