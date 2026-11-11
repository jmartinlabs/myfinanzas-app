import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { prepareSchema } from "./database-schema";
import { openDatabase } from "./database";
import { createSaldo } from "./saldos";
import { createClassification } from "./clasificacion";
import { createCycle, cycleContext } from "./ciclos";
import { createBudget } from "./presupuestos";
import {
  confirmCyclePlan,
  getCyclePlan,
  previewCyclePlan,
} from "./planes-ciclo";
import {
  confirmPartidaConfig,
  getPlanMensualDprima,
  previewPartidaConfig,
  writeMensual,
} from "./dprima";
import {
  normalizeDprima,
  normalizePlanCiclo,
  readRepartoPlan,
} from "./reparto-plan-source";

const now = Date.parse("2026-10-21T12:00:00Z");

const legacyView = {
  ciclo: { id: "C1" },
  revision: 4,
  items: [
    {
      presupuesto: {
        id: "PRE001",
        nombre: "Aportación ficticia",
        fuente: "Aportación a saldo",
        destino: "S002",
        estado: "Activo",
      },
      aTransferir: "100.00",
      ejecutado: "40.00",
      pendiente: "999.00",
      estado: "Pendiente",
      motivo: null,
      sinPlanificar: false,
    },
    {
      presupuesto: {
        id: "PRE002",
        nombre: "Gasto ficticio",
        fuente: "Gasto real",
        destino: "S003",
        estado: "Inactivo",
      },
      aTransferir: "50.00",
      ejecutado: "20.00",
      pendiente: "30.00",
      estado: "Pendiente",
      motivo: null,
      sinPlanificar: false,
    },
    {
      presupuesto: {
        id: "PRE003",
        nombre: "Segunda aportación",
        fuente: "Aportación a saldo",
        destino: "S004",
        estado: "Activo",
      },
      aTransferir: "10.00",
      ejecutado: "0.00",
      pendiente: "10.00",
      estado: "Pendiente",
      motivo: null,
      sinPlanificar: false,
    },
  ],
} as any;

const dprimaView = {
  ciclo: { id: "C1" },
  items: [
    {
      raiz: "PAR001",
      nombre: "Vivienda D′",
      fuente: "Aportación a saldo",
      destino: "S002",
      delMes: "100.00",
      ejecutado: "40.00",
      pendiente: "777.00",
      estado: "Pendiente",
      motivo: "Destino compartido por varias raíces: atribución automática bloqueada.",
      revision: 3,
    },
    {
      raiz: "PAR002",
      nombre: "Comida D′",
      fuente: "Gasto real",
      destino: null,
      delMes: "80.00",
      ejecutado: "80.00",
      pendiente: "0.00",
      estado: "Completo",
      motivo: null,
      revision: 2,
    },
    {
      raiz: "PAR003",
      nombre: "Segunda aportación D′",
      fuente: "Aportación a saldo",
      destino: "S002",
      delMes: "10.00",
      ejecutado: "0.00",
      pendiente: "10.00",
      estado: "Pendiente",
      motivo: null,
      revision: 1,
    },
  ],
  nota: "Fixture D′",
} as any;

const partidasView = {
  raices: [
    { id: "PAR001", estado: "Activa" },
    { id: "PAR002", estado: "Inactiva" },
    { id: "PAR003", estado: "Activa" },
  ],
  hijasSinRaiz: [],
} as any;

test("normaliza PlanCiclo sin mezclar ni recalcular valores publicados", () => {
  const plan = normalizePlanCiclo(legacyView);
  expect(plan.source).toBe("PlanCiclo");
  expect(plan.ciclo).toBe("C1");
  expect(plan.revision).toBe(4);
  expect(plan.lines.map((line) => line.referencia)).toEqual([
    "PRE001",
    "PRE002",
    "PRE003",
  ]);
  expect(plan.lines.every((line) => line.source === "PlanCiclo")).toBe(true);
  expect(plan.lines[0]).toMatchObject({
    fuente: "Aportación a saldo",
    destino: "S002",
    delMes: "100.00",
    ejecutado: "40.00",
    pendiente: "999.00",
    estado: "Pendiente",
    entidadEstado: "Activa",
  });
  expect(plan.lines[1].entidadEstado).toBe("Inactiva");
  expect(plan.destinosCompartidos).toEqual([]);
});

test("normaliza Dprima sin mezclar ni recalcular valores publicados", () => {
  const plan = normalizeDprima(dprimaView, partidasView);
  expect(plan.source).toBe("Dprima");
  expect(plan.ciclo).toBe("C1");
  expect(plan.revision).toBeNull();
  expect(plan.lines.map((line) => line.referencia)).toEqual([
    "PAR001",
    "PAR002",
    "PAR003",
  ]);
  expect(plan.lines.every((line) => line.source === "Dprima")).toBe(true);
  expect(plan.lines[0]).toMatchObject({
    fuente: "Aportación a saldo",
    destino: "S002",
    delMes: "100.00",
    ejecutado: "40.00",
    pendiente: "777.00",
    estado: "Pendiente",
    entidadEstado: "Activa",
    atribucionAmbigua: true,
  });
  expect(plan.lines[1]).toMatchObject({
    fuente: "Gasto real",
    entidadEstado: "Inactiva",
    sinPlanificar: null,
  });
  expect(plan.destinosCompartidos).toEqual(["S002"]);
  expect(plan.lines[2].atribucionAmbigua).toBe(true);
});

test("marca ambigüedad D′ solo por motivo publicado sin destino repetido", () => {
  const plan = normalizeDprima(
    {
      ciclo: { id: "C1" },
      items: [
        {
          raiz: "PAR001",
          nombre: "Raíz sin destino",
          fuente: "Aportación a saldo",
          destino: null,
          delMes: "100.00",
          ejecutado: null,
          pendiente: null,
          estado: "No disponible",
          motivo:
            "Destino compartido por varias raíces: atribución automática bloqueada.",
          revision: 1,
        },
      ],
      nota: "Fixture D′",
    } as any,
    { raices: [{ id: "PAR001", estado: "Activa" }], hijasSinRaiz: [] } as any,
  );
  expect(plan.destinosCompartidos).toEqual([]);
  expect(plan.lines[0].atribucionAmbigua).toBe(true);
});

test("exige un origen explícito y no cae a otro plan", () => {
  for (const source of ["Otro", "", undefined, null]) {
    expect(() =>
      readRepartoPlan({} as Database, "C1", source as any, now),
    ).toThrow("Origen de plan no soportado");
  }
});

test("lee el Plan del ciclo real sin recalcular sus importes", () => {
  const db = new Database(":memory:");
  prepareSchema(db, { origin: "demo", key_hash: null });
  const cycle = createCycle(
    db,
    {
      inicio: "2026-10-20",
      saldoInicialComida: "0",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  ).ciclo;
  const budget = createBudget(
    db,
    {
      nombre: "Aportación real ficticia",
      fuente: "Aportación a saldo",
      destino: "S001",
    },
    randomUUID(),
    now,
  );
  const body = {
    revision: 0,
    contextRevision: getCyclePlan(db, cycle.id, now).contextRevision,
    cambios: [
      {
        presupuesto: budget.id,
        base: "100.00",
        esencial: null,
        delMes: "100.00",
      },
    ],
  };
  const preview = previewCyclePlan(db, cycle.id, body, now);
  confirmCyclePlan(
    db,
    cycle.id,
    {
      propuesta: body,
      fingerprint: preview.fingerprint,
      motivo: "Fixture adaptador C",
    },
    randomUUID(),
    now,
  );
  const source = getCyclePlan(db, cycle.id, now);
  const sourceItem = source.items.find((item) => item.presupuesto.id === budget.id)!;
  const plan = readRepartoPlan(db, cycle.id, "PlanCiclo", now);
  expect(plan.source).toBe("PlanCiclo");
  expect(plan.lines).toHaveLength(1);
  expect(plan.lines[0]).toMatchObject({
    referencia: budget.id,
    delMes: sourceItem.aTransferir,
    ejecutado: sourceItem.ejecutado,
    pendiente: sourceItem.pendiente,
    fuente: "Aportación a saldo",
    entidadEstado: "Activa",
  });
  db.close();
});

test("lee el Plan mensual D′ real sin recalcular sus importes", () => {
  const db = openDatabase(":memory:");
  const category = createClassification(
    db,
    "categorias",
    {
      nombre: "Gastos adaptador C",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub adaptador C", padre: category.id },
    randomUUID(),
  );
  const account = createSaldo(
    db,
    {
      nombre: "Cuenta adaptador C",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "1000",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  );
  const root = createClassification(
    db,
    "partidas",
    { nombre: "Raíz adaptador C", padre: sub.id },
    randomUUID(),
  );
  const config = previewPartidaConfig(db, root.id, {
    cambios: { fuente: "Aportación a saldo" },
    motivo: "Fixture adaptador C",
  });
  confirmPartidaConfig(
    db,
    root.id,
    {
      cambios: { fuente: "Aportación a saldo" },
      motivo: "Fixture adaptador C",
      fingerprint: config.fingerprint,
    },
    randomUUID(),
    now,
  );
  const cycle = createCycle(
    db,
    {
      inicio: "2026-10-20",
      saldoInicialComida: "0",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  ).ciclo;
  writeMensual(
    db,
    cycle.id,
    {
      raiz: root.id,
      fuente: "Aportación a saldo",
      destino: account.id,
      base: "100.00",
      esencial: null,
      delMes: "100.00",
      revision: 0,
    },
    randomUUID(),
    now,
  );
  const source = getPlanMensualDprima(db, cycle.id, now);
  const sourceItem = source.items.find((item) => item.raiz === root.id)!;
  const plan = readRepartoPlan(db, cycle.id, "Dprima", now);
  expect(plan.source).toBe("Dprima");
  expect(plan.lines).toHaveLength(1);
  expect(plan.lines[0]).toMatchObject({
    referencia: root.id,
    delMes: sourceItem.delMes,
    ejecutado: sourceItem.ejecutado,
    pendiente: sourceItem.pendiente,
    fuente: "Aportación a saldo",
    entidadEstado: "Activa",
  });
  db.close();
});
