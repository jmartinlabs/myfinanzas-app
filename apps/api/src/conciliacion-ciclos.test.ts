import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { prepareSchema } from "./database-schema";
import { createClassification } from "./clasificacion";
import { createSaldo } from "./saldos";
import { createCycle, cycleContext, type Cycle } from "./ciclos";
import { previewMovement, writeMovement } from "./movimientos";
import { activateRegimen, prepareRegimen, writeComidaRol } from "./comida";
import {
  calcularConciliacion,
  conciliacionCiclo,
  listConciliaciones,
  type E35Metrics,
} from "./conciliacion-ciclos";

const now = Date.parse("2026-11-05T12:00:00Z");

const cycle = (over: Partial<Cycle> = {}): Cycle => ({
  id: "1",
  inicio: "2026-10-01",
  mesFinanciado: "2026-11-01",
  saldoInicialComida: "300.00",
  fin: "2026-10-31",
  estadoTemporal: "Con fin temporal",
  corte: null,
  revision: 1,
  estadoCorte: "no_abierto",
  ...over,
});

const metrics = (
  puente: { base: string; otros: string; cierre: string } | null,
  options: {
    cobertura?: "Verificada" | "Parcial";
    motivo?: string | null;
    bA?: string | null;
  } = {},
) =>
  ({
    puente: puente
      ? {
          baseAnalitica: puente.base,
          otrosEfectos: puente.otros,
          cierreAnalitico: puente.cierre,
        }
      : null,
    proveedor: {
      cobertura: options.cobertura ?? "Verificada",
      bloqueo: {
        requerido: true,
        verificable: (options.cobertura ?? "Verificada") === "Verificada",
        motivo: options.motivo ?? null,
      },
      motivo: options.motivo ?? null,
    },
    cobertura: {
      estado:
        (options.cobertura ?? "Verificada") === "Verificada"
          ? "Verificable"
          : "Parcial",
      motivos: options.motivo ? [options.motivo] : [],
    },
    posicionBancaria:
      options.bA === null
        ? { estado: "No disponible", motivo: "B_A no acreditado." }
        : {
            apertura: "100.00",
            alInicio: options.bA ?? "100.00",
            alCorte: "90.00",
            diferenciaAnaliticoBanco: null,
          },
  }) as unknown as E35Metrics;

test("AC-13: DIF_S0_SIGUIENTE y DIF_BANCO se calculan por separado, sin mutar S0", () => {
  const result = calcularConciliacion({
    ciclo: cycle(),
    siguiente: cycle({
      id: "2",
      inicio: "2026-11-01",
      fin: null,
      estadoTemporal: "Abierto",
      saldoInicialComida: "295.00",
    }),
    metrics: metrics({ base: "205.00", otros: "-15.00", cierre: "190.00" }),
    error: null,
  });
  expect(result.baseAnalitica).toBe("205.00");
  expect(result.cierreAnalitico).toBe("190.00");
  expect(result.difS0Siguiente).toBe("105.00");
  expect(result.difBanco).toBe("200.00");
  expect(result.estado).toBe("Alerta");
  expect(result.cobertura).toBe("Verificada");
  expect(result.motivo).toContain("no modifica el S0");
  expect(result.calculoVivo).toBe(true);
  expect(result.foto).toBeNull();
  expect(result.noEsCierreFinanciero).toBe(true);
  expect(result.ciclo.s0).toBe("300.00");
  // La diferencia no se convierte en asiento ni en apertura.
  expect(result.siguiente?.s0).toBe("295.00");
});

test("AC-13 límites: cero Coincide, negativo conserva signo y DIF_BANCO no se fusiona", () => {
  const cero = calcularConciliacion({
    ciclo: cycle(),
    siguiente: cycle({ id: "2", inicio: "2026-11-01", saldoInicialComida: "190.00" }),
    metrics: metrics({ base: "205.00", otros: "-15.00", cierre: "190.00" }),
    error: null,
  });
  expect(cero.difS0Siguiente).toBe("0.00");
  expect(cero.estado).toBe("Coincide");
  expect(cero.motivo).toBeNull();

  const negativo = calcularConciliacion({
    ciclo: cycle(),
    siguiente: cycle({ id: "2", inicio: "2026-11-01", saldoInicialComida: "180.00" }),
    metrics: metrics({ base: "205.00", otros: "-15.00", cierre: "190.00" }),
    error: null,
  });
  expect(negativo.difS0Siguiente).toBe("-10.00");
  expect(negativo.estado).toBe("Alerta");

  const sinBanco = calcularConciliacion({
    ciclo: cycle(),
    siguiente: cycle({ id: "2", inicio: "2026-11-01", saldoInicialComida: "295.00" }),
    metrics: metrics(
      { base: "205.00", otros: "-15.00", cierre: "190.00" },
      { bA: null },
    ),
    error: null,
  });
  expect(sinBanco.difS0Siguiente).toBe("105.00");
  expect(sinBanco.difBanco).toBeNull();
  expect(sinBanco.motivoBanco).toContain("B_A no acreditado");
});

test("AC-13/AC-14: sin siguiente Inicio, sin cobertura o con error de fuente → No disponible", () => {
  const sinSiguiente = calcularConciliacion({
    ciclo: cycle(),
    siguiente: null,
    metrics: metrics({ base: "205.00", otros: "-15.00", cierre: "190.00" }),
    error: null,
  });
  expect(sinSiguiente.difS0Siguiente).toBeNull();
  expect(sinSiguiente.difBanco).toBe("200.00");
  expect(sinSiguiente.estado).toBe("No disponible");
  expect(sinSiguiente.motivo).toContain("sin siguiente Inicio");

  const sinCobertura = calcularConciliacion({
    ciclo: cycle(),
    siguiente: cycle({ id: "2", inicio: "2026-11-01", saldoInicialComida: "295.00" }),
    metrics: metrics(
      { base: "205.00", otros: "-15.00", cierre: "190.00" },
      { cobertura: "Parcial", motivo: "Régimen individual no activado." },
    ),
    error: null,
  });
  expect(sinCobertura.difS0Siguiente).toBeNull();
  expect(sinCobertura.estado).toBe("No disponible");
  expect(sinCobertura.cobertura).toBe("No disponible");
  expect(sinCobertura.motivo).toContain("Régimen individual no activado");

  const error = calcularConciliacion({
    ciclo: cycle(),
    siguiente: cycle({ id: "2", inicio: "2026-11-01", saldoInicialComida: "295.00" }),
    metrics: null,
    error: "El ciclo no tiene corte verificable; no se calculan métricas.",
  });
  expect(error.difS0Siguiente).toBeNull();
  expect(error.estado).toBe("No disponible");
  expect(error.motivo).toContain("corte verificable");
});

// ---------------------------------------------------------------------------
// Integración con el read model E3.5 real (fixtures deterministas, céntimos).

function setup() {
  const db = new Database(":memory:");
  prepareSchema(db, { origin: "demo", key_hash: null });
  const category = createClassification(
    db,
    "categorias",
    {
      nombre: "Gastos ficticios Comida",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
    now,
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub ficticia Comida", padre: category.id },
    randomUUID(),
    now,
  );
  const food = createClassification(
    db,
    "partidas",
    { nombre: "Supermercado ficticio", padre: sub.id },
    randomUUID(),
    now,
  );
  const leisure = createClassification(
    db,
    "partidas",
    { nombre: "Ocio ficticio", padre: sub.id },
    randomUUID(),
    now,
  );
  const account = createSaldo(
    db,
    {
      nombre: "Cuenta ficticia origen",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "1000",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  );
  const ing = createSaldo(
    db,
    {
      nombre: "ING Comida ficticia",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "100",
      fechaApertura: "2026-06-20",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  );
  const cycle1 = createCycle(
    db,
    {
      inicio: "2026-10-01",
      saldoInicialComida: "300",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  ).ciclo;
  const cycle2 = createCycle(
    db,
    {
      inicio: "2026-11-01",
      saldoInicialComida: "295",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  ).ciclo;
  return { db, account, ing, food, leisure, cycle1, cycle2 };
}

function add(db: Database, body: Record<string, unknown>) {
  const plan = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    {
      ...body,
      fingerprint: plan.fingerprint,
      contextRevision: plan.contextRevision,
      aceptarCoincidencia: true,
    },
    randomUUID(),
    null,
    false,
    now,
  );
}

function purchase(
  db: Database,
  ing: { id: string },
  partida: string,
  importe: string,
  fecha: string,
  etiqueta: string,
) {
  return add(db, {
    tipo: "Gasto",
    fecha,
    importe,
    saldo: ing.id,
    partida,
    concepto: "Compra ficticia",
    nota: "",
    comida: { etiqueta, evidenciaBancaria: "Extracto ficticio" },
  });
}

function transfer(
  db: Database,
  from: string,
  to: string,
  importe: string,
  fecha: string,
) {
  return add(db, {
    tipo: "Transferencia",
    fecha,
    importe,
    origen: from,
    destino: to,
    concepto: "Financiación ficticia",
    nota: "",
  });
}

test("AC-13 integración: Base 205 / Cierre 190 / DIF 105 desde e35Metrics sin escrituras", () => {
  const { db, account, ing, food, leisure, cycle1, cycle2 } = setup();
  try {
    purchase(db, ing, food.id, "40", "2026-10-01", "Comida");
    purchase(db, ing, food.id, "30", "2026-10-03", "Pendiente revisar");
    purchase(db, ing, leisure.id, "25", "2026-10-05", "Ocio");
    purchase(db, ing, leisure.id, "10", "2026-10-08", "Niños");
    purchase(db, ing, leisure.id, "10", "2026-10-10", "Otros");
    purchase(db, ing, leisure.id, "15", "2026-10-12", "Fuera presupuesto");
    const last = purchase(db, ing, food.id, "60", "2026-10-31", "Comida");
    const refund = add(db, {
      tipo: "Devolución de gasto",
      fecha: "2026-10-15",
      importe: "10",
      saldo: ing.id,
      partida: food.id,
      concepto: "Devolución ficticia",
      nota: "",
      devolucion: {
        estado: "Verificado",
        compra: last.movimiento.id,
        evidenciaRelacion: "Motivo comercial ficticio",
        elegibilidad: "Acreditada",
        cicloOrigen: cycle1.id,
        evidenciaOrigenTemporal: "Documento de compra ficticio",
      },
    });
    expect(refund.movimiento.tipo).toBe("Devolución de gasto");
    const ready = prepareRegimen(
      db,
      {
        saldo: ing.id,
        cicloCorte: cycle1.id,
        apertura: "100",
        evidencia: "Extracto ficticio",
        cobertura: "Verificable",
        motivo: "Preparación ficticia",
      },
      randomUUID(),
      now,
    );
    activateRegimen(
      db,
      {
        revision: ready.regimen.regimen!.revision,
        motivo: "Activación ficticia",
        confirmar: true,
      },
      randomUUID(),
      now,
    );
    const finance = transfer(db, account.id, ing.id, "50", "2026-10-02");
    writeComidaRol(
      db,
      finance.movimiento.id,
      { revision: 1, rol: "Financiación", evidencia: "Evidencia ficticia" },
      randomUUID(),
      now,
    );
    const repo = transfer(db, account.id, ing.id, "20", "2026-10-20");
    writeComidaRol(
      db,
      repo.movimiento.id,
      {
        revision: 1,
        rol: "Reposición",
        obligacionCiclo: cycle1.id,
        evidencia: "Cobro ficticio",
      },
      randomUUID(),
      now,
    );

    const before = {
      ciclos: db.query("SELECT * FROM ciclos ORDER BY id").all(),
      movimientos: db.query("SELECT COUNT(*) n FROM movimientos").get(),
      fotos: db.query("SELECT COUNT(*) n FROM fotos_neto_apertura").get(),
    };
    const result = conciliacionCiclo(db, cycle1.id, now);
    expect(result.cobertura).toBe("Verificada");
    expect(result.baseAnalitica).toBe("205.00");
    expect(result.otrosEfectos).toBe("-15.00");
    expect(result.cierreAnalitico).toBe("190.00");
    expect(result.s0).toBe("300.00");
    expect(result.s0Siguiente).toBe("295.00");
    expect(result.bA).toBe("100.00");
    expect(result.difS0Siguiente).toBe("105.00");
    expect(result.difBanco).toBe("200.00");
    expect(result.estado).toBe("Alerta");
    expect(result.foto).toBeNull();
    expect(db.query("SELECT * FROM ciclos ORDER BY id").all()).toEqual(
      before.ciclos,
    );
    expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual(
      before.movimientos,
    );
    expect(
      db.query("SELECT COUNT(*) n FROM fotos_neto_apertura").get(),
    ).toEqual(before.fotos);

    const list = listConciliaciones(db, new URLSearchParams());
    expect(list.total).toBe(2);
    const first = list.items.find((i) => i.ciclo.id === cycle1.id)!;
    expect(first.estado).toBe("Alerta");
    expect(first.difS0Siguiente).toBe("105.00");
    // El último ciclo no tiene siguiente Inicio: se aísla como No disponible,
    // sin tumbar la lista ni inventar un cierre.
    const lastCycle = list.items.find((i) => i.ciclo.id === cycle2.id)!;
    expect(lastCycle.estado).toBe("No disponible");
    expect(lastCycle.difS0Siguiente).toBeNull();
  } finally {
    db.close();
  }
});
