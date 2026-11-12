import { afterEach, describe, expect, test } from "bun:test";
import type { Database } from "bun:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "./database";
import {
  DEMO_DATASET_ID,
  applyDemoDataset,
  isFreshDemoDatabase,
  verifyDemoDataset,
} from "../../../tools/demo/apply";
import { dataset, seedNow } from "../../../tools/demo/dataset/demo";

const roots: string[] = [];
const ENV = process.env.NODE_ENV;

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "mf-demo-seed-"));
  roots.push(root);
  process.env.NODE_ENV = "development";
  try {
    return { root, db: openDatabase(join(root, "demo.sqlite")) };
  } finally {
    process.env.NODE_ENV = ENV;
  }
}

function seed(db: Database) {
  process.env.NODE_ENV = "development";
  try {
    return applyDemoDataset(db);
  } finally {
    process.env.NODE_ENV = ENV;
  }
}

function scalar(db: Database, sql: string, ...args: unknown[]) {
  const row = db.query(sql).get(...(args as never[])) as
    | Record<string, unknown>
    | null;
  return row ? Object.values(row)[0] : null;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("dataset DEMO-1", () => {
  test("aplica sobre una base demo recién creada y publica recuentos reales", () => {
    const { db } = fixture();
    try {
      expect(isFreshDemoDatabase(db)).toBe(true);
      const summary = seed(db);
      expect(summary.dataset).toBe(DEMO_DATASET_ID);
      expect(isFreshDemoDatabase(db)).toBe(false);

      const verified = verifyDemoDataset(db);
      expect(verified).toEqual(summary);
      for (const [module, count] of Object.entries(summary.counts)) {
        expect(count, module).toBeGreaterThan(0);
      }
      expect(summary.counts).toMatchObject({
        saldos: 8,
        categorias: 14,
        subcategorias: 15,
        partidas: 16,
        presupuestos: 4,
        deudas: 1,
        ciclos: 10,
        movimientos: dataset.movimientos.length,
        referencias: 3,
        anticipos: 1,
        vehiculos: 1,
        compartidos: 1,
        participantes_compartido: 2,
        aportaciones: 1,
        instrumentos: 1,
        operaciones_inversion: 2,
        nomina: 1,
        reparto_nomina: 1,
        planes_ciclo: dataset.planes_ciclo.length,
        lineas_plan_ciclo: 8,
        plan_anual: dataset.plan_anual.lineas.length,
        revision_comida: dataset.revision_comida.length,
        comida_movimientos: 1,
        dprima: 1,
      });

      expect(db.query("PRAGMA foreign_key_check").all()).toHaveLength(0);
      expect(() => applyDemoDataset(db)).toThrow(/ya contiene datos/i);
    } finally {
      db.close();
    }
  });

  test("coherencia económica por módulo", () => {
    const { db } = fixture();
    try {
      seed(db);

      // Saldos: posición = apertura + entradas − salidas.
      const aperture = BigInt(scalar(db, "SELECT CAST(apertura AS TEXT) FROM saldos WHERE id='S001'") as string);
      const entries = BigInt(
        scalar(
          db,
          "SELECT COALESCE(SUM(importe),0) FROM movimientos WHERE anulado=0 AND destino='S001'",
        ) as number,
      );
      const exits = BigInt(
        scalar(
          db,
          "SELECT COALESCE(SUM(importe),0) FROM movimientos WHERE anulado=0 AND origen='S001'",
        ) as number,
      );
      const expected = aperture + entries - exits;
      const positionRow = db
        .query(
          `SELECT CAST(CAST(apertura AS TEXT) AS INTEGER)
             + COALESCE((SELECT SUM(importe) FROM movimientos WHERE anulado=0 AND destino='S001'),0)
             - COALESCE((SELECT SUM(importe) FROM movimientos WHERE anulado=0 AND origen='S001'),0) AS cents
           FROM saldos WHERE id='S001'`,
        )
        .get() as { cents: number };
      expect(positionRow.cents).toBe(Number(expected));

      // Deuda: capital vivo = apertura − amortizaciones acumuladas.
      const debt = db
        .query(
          `SELECT CAST(d.apertura AS TEXT) apertura,
             COALESCE((SELECT SUM(m.importe) FROM movimientos m JOIN partidas p ON p.id=m.partida
               WHERE p.deuda=d.id AND m.anulado=0 AND m.tipo='Amortización deuda'),0) amortizado
           FROM deudas d WHERE d.id='D001'`,
        )
        .get() as { apertura: string; amortizado: number };
      expect(Number(debt.apertura) - debt.amortizado).toBe(816000);

      // Compartido: el reparto usa partes enteras y la aportación del tercero es exacta.
      const parts = scalar(
        db,
        "SELECT COALESCE(SUM(partes),0) FROM participantes_compartido WHERE referencia='REF003' AND estado='Activa'",
      ) as number;
      expect(parts).toBe(2);
      const contributed = scalar(
        db,
        "SELECT COALESCE(SUM(m.importe),0) FROM movimiento_compartido a JOIN movimientos m ON m.id=a.movimiento WHERE a.referencia='REF003' AND m.anulado=0",
      ) as number;
      expect(contributed).toBe(4500);
      const sharedExpense = scalar(
        db,
        "SELECT COALESCE(SUM(importe),0) FROM movimientos WHERE referencia='REF003' AND tipo='Gasto' AND anulado=0",
      ) as number;
      expect(sharedExpense).toBe(9000);
      expect(2 * contributed).toBe(sharedExpense);

      // Nómina: la paga confirmada y el reparto cubren el ingreso asignado.
      const payroll = db
        .query("SELECT data FROM payroll")
        .all() as { data: string }[];
      expect(payroll).toHaveLength(1);
      const paga = JSON.parse(payroll[0].data) as { mes: string; historico: string };
      expect(paga.mes).toBe("2026-01");
      expect(paga.historico).toBe("2200.00");
      expect(
        scalar(
          db,
          "SELECT COALESCE(SUM(CAST(importe AS INTEGER)),0) FROM payroll_allocations",
        ),
      ).toBe(2200);

      // Inversión: 10 compradas − 2 vendidas, y caja de inversión coherente.
      const bought = scalar(
        db,
        "SELECT COALESCE(SUM(CAST(cantidad AS INTEGER)),0) FROM operaciones_inversion WHERE clase='Compra' AND estado='Vigente'",
      ) as number;
      const sold = scalar(
        db,
        "SELECT COALESCE(SUM(CAST(cantidad AS INTEGER)),0) FROM operaciones_inversion WHERE clase='Venta' AND estado='Vigente'",
      ) as number;
      expect(bought - sold).toBe(800_000_000);
      const cash = db
        .query(
          `SELECT CAST(CAST(s.apertura AS TEXT) AS INTEGER)
             + COALESCE((SELECT SUM(importe) FROM movimientos WHERE anulado=0 AND destino=s.id),0)
             - COALESCE((SELECT SUM(importe) FROM movimientos WHERE anulado=0 AND origen=s.id),0)
             - COALESCE((SELECT SUM(importe_eur) FROM operaciones_inversion WHERE clase='Compra' AND estado='Vigente' AND saldo_efectivo=s.id),0)
             + COALESCE((SELECT SUM(importe_eur) FROM operaciones_inversion WHERE clase='Venta' AND estado='Vigente' AND saldo_efectivo=s.id),0) AS cents
           FROM saldos s WHERE s.id='S003'`,
        )
        .get() as { cents: number };
      expect(cash.cents).toBe(72000);

      // Fechas de hecho dentro del ancla lógica declarada.
      const maxDate = scalar(db, "SELECT MAX(fecha) FROM movimientos") as string;
      expect(maxDate <= dataset.anchor.slice(0, 10)).toBe(true);
      expect(seedNow).toBe(Date.parse(dataset.anchor));

      // Planes de ciclo y plan anual con líneas persistidas.
      expect(
        scalar(db, "SELECT COUNT(*) FROM cycle_plan_lines"),
      ).toBe(8);
      expect(
        scalar(db, "SELECT COUNT(*) FROM annual_plan_lines"),
      ).toBe(3);
      expect(
        scalar(
          db,
          "SELECT COUNT(*) FROM annual_plan_lines WHERE ejercicio=2026",
        ),
      ).toBe(3);
    } finally {
      db.close();
    }
  });

  test("el seed usa servicios y no SQL de escritura para entidades", () => {
    const tools = join(import.meta.dir, "../../../tools/demo");
    const files = ["apply.ts", "dataset/demo.ts"]
      .map((name) => readFileSync(join(tools, name), "utf8"))
      .join("\n");
    expect(files).not.toMatch(/db\.run\s*\(/);
    expect(files).not.toMatch(
      /db\.exec\s*\(\s*["'`][^"'`]*(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i,
    );
    expect(files).not.toMatch(
      /import\s*\{\s*Database\s*\}\s*from\s+["']bun:sqlite["']/,
    );
  });
});
