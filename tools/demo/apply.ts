import type { Database } from "bun:sqlite";
import { createSaldo, updateSaldo } from "../../apps/api/src/saldos";
import { createClassification } from "../../apps/api/src/clasificacion";
import { createBudget } from "../../apps/api/src/presupuestos";
import { createDebt } from "../../apps/api/src/deudas";
import {
  createCycle,
  cycleContext,
  getCycle,
} from "../../apps/api/src/ciclos";
import {
  previewCyclePlan,
  confirmCyclePlan,
  getCyclePlan,
} from "../../apps/api/src/planes-ciclo";
import { createAnticipo } from "../../apps/api/src/anticipos";
import { createReference } from "../../apps/api/src/referencias";
import { previewMovement, writeMovement } from "../../apps/api/src/movimientos";
import { createInstrumento } from "../../apps/api/src/instrumentos";
import { createPurchase } from "../../apps/api/src/compras";
import { createSale } from "../../apps/api/src/ventas";
import { createCompartido, createParticipante } from "../../apps/api/src/compartidos";
import {
  confirmPayroll,
  getPayroll,
} from "../../apps/api/src/nomina";
import {
  confirmAnnualPlan,
  getAnnualPlan,
  previewAnnualPlan,
} from "../../apps/api/src/plan-anual";
import { createRevisionComida } from "../../apps/api/src/revision-comida";
import { createPlanificacion, getPlanificacion } from "../../apps/api/src/dprima";
import { dataset, seedNow } from "./dataset/demo";

export const DEMO_DATASET_ID = "DEMO-1";
export type DemoSummary = { dataset: string; counts: Record<string, number> };

class ApplyFailure extends Error {
  constructor(
    public readonly step: string,
    public readonly cause: unknown,
  ) {
    super(`Fallo al aplicar ${step}.`);
    this.name = "ApplyFailure";
  }
}

const key = (entity: string, number: string | number) =>
  `demo-seed-${entity}-${number}`;

function expectId(actual: string, expected: string, step: string) {
  if (actual !== expected)
    throw new Error(`ID generado ${actual} distinto del esperado ${expected} (${step}).`);
}

const INITIAL_SALDOS = ["S000", "S001", "S002", "S003", "S004", "S005"];

const DATA_TABLES = [
  "ciclos",
  "movimientos",
  "categorias",
  "subcategorias",
  "partidas",
  "presupuestos",
  "deudas",
  "referencias",
  "instrumentos",
  "operaciones_inversion",
  "payroll",
  "fichas_compartidos",
  "participantes_compartido",
  "movimiento_compartido",
  "revision_comida",
  "annual_plan_lines",
  "cycle_plans",
  "cycle_plan_lines",
  "dprima_planificaciones",
] as const;

export function isFreshDemoDatabase(db: Database): boolean {
  if (
    db.query("SELECT id FROM saldos WHERE apertura IS NOT NULL LIMIT 1").get() ||
    db
      .query(
        `SELECT id FROM saldos WHERE id NOT IN (${INITIAL_SALDOS.map(() => "?").join(",")}) LIMIT 1`,
      )
      .get(...INITIAL_SALDOS)
  )
    return false;
  return DATA_TABLES.every(
    (table) =>
      !db.query(`SELECT 1 FROM ${table} LIMIT 1`).get(),
  );
}

export function applyDemoDataset(db: Database): DemoSummary {
  if (!isFreshDemoDatabase(db))
    throw new Error("La base DEMO ya contiene datos; no se aplica el dataset dos veces.");
  let step = "inicio";
  const run = <T>(name: string, action: () => T): T => {
    step = name;
    try {
      return action();
    } catch (error) {
      throw new ApplyFailure(name, error);
    }
  };
  try {
    run("saldos", () => {
      for (const saldo of dataset.saldos.updates) {
        const current = db
          .query("SELECT revision FROM saldos WHERE id=?")
          .get(saldo.id) as { revision: number } | null;
        if (!current) throw new Error(`Saldo inicial ${saldo.id} ausente.`);
        const { id, ...body } = saldo;
        updateSaldo(
          db,
          id,
          { ...body, revision: current.revision },
          () => false,
          seedNow,
        );
      }
      for (const saldo of dataset.saldos.creates) {
        const { id: expectedId, ...body } = saldo;
        const created = createSaldo(db, body, key("saldo", expectedId), seedNow);
        expectId(created.id, expectedId, "saldos");
      }
    });

    run("categorias", () => {
      for (const categoria of dataset.classifications.categorias) {
        const { id: expectedId, ...body } = categoria;
        const created = createClassification(
          db,
          "categorias",
          body,
          key("categoria", expectedId),
          seedNow,
        );
        expectId(created.id, expectedId, "categorias");
      }
    });

    run("subcategorias", () => {
      for (const subcategoria of dataset.classifications.subcategorias) {
        const { id: expectedId, ...body } = subcategoria;
        const created = createClassification(
          db,
          "subcategorias",
          body,
          key("subcategoria", expectedId),
          seedNow,
        );
        expectId(created.id, expectedId, "subcategorias");
      }
    });

    run("presupuestos", () => {
      for (const presupuesto of dataset.presupuestos) {
        const { id: expectedId, ...body } = presupuesto;
        const created = createBudget(
          db,
          body,
          key("presupuesto", expectedId),
          seedNow,
        );
        expectId(created.id, expectedId, "presupuestos");
      }
    });

    run("deuda", () => {
      const { id: expectedId, ...body } = dataset.deuda;
      const created = createDebt(db, body, key("deuda", expectedId), seedNow);
      expectId(created.id, expectedId, "deuda");
    });

    run("partidas", () => {
      for (const partida of dataset.classifications.partidas) {
        const { id: expectedId, ...body } = partida;
        const created = createClassification(
          db,
          "partidas",
          body,
          key("partida", expectedId),
          seedNow,
        );
        expectId(created.id, expectedId, "partidas");
      }
    });

    run("referencia-anticipo", () => {
      const ref = dataset.referencias.anticipo;
      const created = createAnticipo(
        db,
        { nombre: ref.nombre, apertura: ref.apertura, evidencia: ref.evidencia },
        key("referencia", "anticipo"),
        seedNow,
      );
      expectId(created.referencia.id, ref.id, "referencia-anticipo");
    });

    run("referencia-vehiculo", () => {
      const ref = dataset.referencias.vehiculo;
      const created = createReference(
        db,
        { nombre: ref.nombre, tipo: ref.tipo, vehiculo: ref.vehiculo },
        key("referencia", "vehiculo"),
        seedNow,
      );
      expectId(created.id, ref.id, "referencia-vehiculo");
    });

    run("referencia-compartido", () => {
      const ref = dataset.referencias.compartido;
      const created = createCompartido(
        db,
        { nombre: ref.nombre },
        key("referencia", "compartido"),
        seedNow,
      );
      expectId(created.referencia.id, ref.id, "referencia-compartido");
      for (const participante of ref.participantes) {
        const { id: expectedId, ...body } = participante;
        const next = createParticipante(
          db,
          ref.id,
          body,
          key("participante", expectedId),
          seedNow,
        );
        const stored = next.participantes.find(
          (p: { nombre: string }) => p.nombre === participante.nombre,
        );
        if (!stored) throw new Error(`Participante ${participante.nombre} ausente.`);
        expectId(stored.id, expectedId, "participantes");
      }
    });

    run("ciclos", () => {
      for (const ciclo of dataset.ciclos) {
        const created = createCycle(
          db,
          {
            inicio: ciclo.inicio,
            saldoInicialComida: ciclo.saldoInicialComida,
            contextRevision: cycleContext(db).revision,
          },
          key("ciclo", ciclo.id),
          seedNow,
        );
        expectId(created.ciclo.id, ciclo.id, "ciclos");
      }
    });

    run("movimientos", () => {
      for (const movement of dataset.movimientos) {
        const { id: expectedId, ...body } = movement;
        const input = body as Record<string, unknown>;
        const preview = previewMovement(db, input, null, false, seedNow);
        const saved = writeMovement(
          db,
          { ...input, fingerprint: preview.fingerprint, aceptarCoincidencia: true },
          key("movimiento", expectedId),
          null,
          false,
          seedNow,
        );
        expectId(saved.movimiento.id, expectedId, "movimientos");
      }
    });

    run("instrumento", () => {
      const instrumento = dataset.inversion.instrumento;
      const { id: expectedId, ...body } = instrumento;
      const created = createInstrumento(
        db,
        body,
        key("instrumento", expectedId),
        seedNow,
      );
      expectId(created.instrumento.id, expectedId, "instrumento");
    });

    run("compra", () => {
      const { id: expectedId, ...body } = dataset.inversion.compra;
      const created = createPurchase(db, body, key("compra", 1), seedNow);
      expectId(created.compra.id, expectedId, "compra");
    });

    run("venta", () => {
      const { id: expectedId, ...body } = dataset.inversion.venta;
      const created = createSale(db, body, key("venta", 1), seedNow);
      expectId(created.venta.id, expectedId, "venta");
    });

    run("nomina", () => {
      const first = confirmPayroll(
        db,
        {
          accion: "guardar",
          contexto: getPayroll(db).contexto,
          motivo: "Alta ficticia de nómina para la demo.",
          paga: dataset.nomina.paga,
        },
        key("nomina", "paga-1"),
        seedNow,
      );
      const paga = first.pagas.find(
        (p: { mes: string }) => p.mes === dataset.nomina.paga.mes,
      );
      if (!paga) throw new Error("Paga creada no localizada.");
      confirmPayroll(
        db,
        {
          accion: "repartir",
          contexto: getPayroll(db).contexto,
          motivo: "Reparto ficticio de la nómina.",
          movimiento: dataset.nomina.reparto.movimiento,
          asignaciones: [
            {
              paga: paga.id,
              importe: dataset.nomina.reparto.importe,
              evidencia: dataset.nomina.reparto.evidencia,
            },
          ],
        },
        key("nomina", "reparto-1"),
        seedNow,
      );
    });

    run("planes-ciclo", () => {
      for (const [index, plan] of dataset.planes_ciclo.entries()) {
        getCycle(db, plan.ciclo);
        const current = getCyclePlan(db, plan.ciclo, seedNow);
        const propuesta = {
          revision: current.revision,
          contextRevision: current.contextRevision,
          cambios: plan.cambios,
        };
        const preview = previewCyclePlan(db, plan.ciclo, propuesta, seedNow);
        confirmCyclePlan(
          db,
          plan.ciclo,
          { propuesta, fingerprint: preview.fingerprint, motivo: plan.motivo },
          key("plan-ciclo", index + 1),
          seedNow,
        );
      }
    });

    run("plan-anual", () => {
      for (const [index, linea] of dataset.plan_anual.lineas.entries()) {
        const current = getAnnualPlan(db, dataset.plan_anual.ejercicio, seedNow);
        const propuesta = {
          partida: linea.partida,
          revision: 0,
          contextRevision: current.contextRevision,
          cambios: linea.cambios,
        };
        const preview = previewAnnualPlan(
          db,
          dataset.plan_anual.ejercicio,
          propuesta,
          seedNow,
        );
        confirmAnnualPlan(
          db,
          dataset.plan_anual.ejercicio,
          { propuesta, fingerprint: preview.fingerprint },
          key("plan-anual", index + 1),
          seedNow,
        );
      }
    });

    run("revision-comida", () => {
      for (const [index, row] of dataset.revision_comida.entries()) {
        createRevisionComida(
          db,
          { tipo: "Detalle", ...row },
          key("revision-comida", index + 1),
          seedNow,
        );
      }
    });

    run("dprima", () => {
      const created = createPlanificacion(
        db,
        dataset.dprima,
        key("dprima", 1),
        seedNow,
      );
      expectId(created.planificacion.id, "DP0001", "dprima");
      getPlanificacion(db, created.planificacion.id);
    });

    return verifyDemoDataset(db);
  } catch (error) {
    if (error instanceof ApplyFailure) throw error;
    throw new ApplyFailure(step, error);
  }
}

const EXPECTED_MODULES: Record<string, string> = {
  saldos: "saldos",
  categorias: "categorias",
  subcategorias: "subcategorias",
  partidas: "partidas",
  presupuestos: "presupuestos",
  deudas: "deudas",
  ciclos: "ciclos",
  movimientos: "movimientos",
  referencias: "referencias",
  anticipos: "fichas_anticipos",
  vehiculos: "fichas_vehiculo",
  compartidos: "fichas_compartidos",
  participantes_compartido: "participantes_compartido",
  aportaciones: "movimiento_compartido",
  instrumentos: "instrumentos",
  operaciones_inversion: "operaciones_inversion",
  nomina: "payroll",
  reparto_nomina: "payroll_allocations",
  planes_ciclo: "cycle_plans",
  lineas_plan_ciclo: "cycle_plan_lines",
  plan_anual: "annual_plan_lines",
  revision_comida: "revision_comida",
  comida_movimientos: "movimiento_revision_comida",
  dprima: "dprima_planificaciones",
};

export function verifyDemoDataset(db: Database): DemoSummary {
  const counts: Record<string, number> = {};
  for (const [module, table] of Object.entries(EXPECTED_MODULES)) {
    const row = db.query(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number };
    if (!row || row.n === 0) throw new Error(`Módulo DEMO sin datos: ${module} (${table}).`);
    counts[module] = row.n;
  }
  return { dataset: DEMO_DATASET_ID, counts };
}
