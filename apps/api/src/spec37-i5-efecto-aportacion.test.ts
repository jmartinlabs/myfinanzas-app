import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { createCycle, cycleContext } from "./ciclos";
import { createClassification } from "./clasificacion";
import { createSaldo } from "./saldos";
import { createReference } from "./referencias";
import { createBudget, efectoAportacion } from "./presupuestos";
import { previewMovement, writeMovement } from "./movimientos";
import {
  crearTransferenciaPendiente,
  previewImpactoTransferenciaPendiente,
} from "./transferencias-pendientes";

/**
 * SPEC37 · I5 — aviso presupuestario del alta coordinada (AC-28 sigue UNRUN).
 *
 * Este archivo **no** ejecuta AC-28. Solo fija que la lectura que la UI muestra
 * coincide con el motor R3 vigente (`executionFacts` en `planes-ciclo.ts`), que
 * cuenta como ejecución de una «Aportación a saldo» solo las Transferencias sin
 * Referencia hacia el Saldo del Presupuesto:
 *
 *  - modalidad A (Transferencia ordinaria, sin Referencia) → el Presupuesto que
 *    corresponde al destino aparece como ejecutado por ese hecho;
 *  - modalidad B (Transferencia de Anticipo, con Referencia) → no lo ejecuta.
 *
 * AC-28 pide además comprobar los dos escenarios contra el motor existente con
 * la ejecución del Plan del ciclo; eso queda pendiente y declarado en
 * `specs/37-registro-coordinado-gastos-progress.md` como `UNRUN`.
 *
 * Todo ficticio: sin datos reales, sin Excel, sin UI.
 */

const now = Date.parse("2026-10-25T12:00:00Z");

type Fixture = {
  db: Database;
  pago: string;
  habitual: string;
  adelanta: string;
  partida: string;
};

function fixture(): Fixture {
  const db = openDatabase(":memory:");
  createCycle(
    db,
    {
      inicio: "2026-01-01",
      saldoInicialComida: "0",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  );
  createClassification(
    db,
    "categorias",
    {
      nombre: "Categoría ficticia I5",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
  );
  const categoria = (
    db.query("SELECT id FROM categorias ORDER BY id LIMIT 1").get() as {
      id: string;
    }
  ).id;
  const subcategoria = createClassification(
    db,
    "subcategorias",
    { nombre: "Subcategoría ficticia I5", padre: categoria },
    randomUUID(),
  ).id;
  const partida = createClassification(
    db,
    "partidas",
    { nombre: "Partida ficticia I5", padre: subcategoria },
    randomUUID(),
  ).id;
  const pago = createSaldo(
    db,
    {
      nombre: "Cuenta pagadora ficticia I5",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "1000",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  ).id;
  const habitual = createSaldo(
    db,
    {
      nombre: "Cuenta habitual ficticia I5",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500",
      fechaApertura: "2026-01-01",
    },
    randomUUID(),
    now,
  ).id;
  const adelanta = createSaldo(
    db,
    {
      nombre: "Cuenta que adelanta ficticia I5",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500",
      fechaApertura: "2026-01-01",
    },
    randomUUID(),
    now,
  ).id;
  return { db, pago, habitual, adelanta, partida };
}

function gasto(f: Fixture, over: Record<string, unknown> = {}) {
  const body = {
    tipo: "Gasto",
    fecha: "2026-01-05",
    importe: "100.00",
    saldo: f.pago,
    partida: f.partida,
    concepto: "Gasto ficticio I5",
    nota: "",
    ...over,
  };
  const plan = previewMovement(f.db, body, null, false, now);
  return writeMovement(
    f.db,
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
  ).movimiento.id;
}

test("SPEC37-I5: efectoAportacion distingue la Transferencia con Referencia de la ordinaria", () => {
  const f = fixture();
  createBudget(
    f.db,
    { nombre: "Aportación ficticia I5", fuente: "Aportación a saldo", destino: f.pago },
    randomUUID(),
    now,
  );

  // A: la Transferencia ordinaria hacia el destino sí ejecuta la Aportación.
  expect(efectoAportacion(f.db, f.pago, false)).toMatchObject({
    aplica: true,
    fuente: "Aportación a saldo",
    destino: f.pago,
  });
  // B: con Referencia de Anticipo, el motor R3 no la cuenta.
  const conReferencia = efectoAportacion(f.db, f.pago, true);
  expect(conReferencia.aplica).toBe(false);
  expect(conReferencia.presupuesto).toBeNull();
  expect(conReferencia.motivo).toContain("no ejecuta la Aportación a saldo");

  // Sin Presupuesto de Aportación a saldo hacia el destino, no se atribuye nada.
  expect(efectoAportacion(f.db, f.habitual, false)).toMatchObject({
    aplica: false,
    presupuesto: null,
    destino: f.habitual,
  });
});

test("SPEC37-I5: el pendiente coordinado B no declara ejecución de Aportación a saldo", () => {
  const f = fixture();
  const presupuesto = createBudget(
    f.db,
    { nombre: "Aportación ficticia I5 B", fuente: "Aportación a saldo", destino: f.pago },
    randomUUID(),
    now,
  ).id;
  const referencia = createReference(
    f.db,
    { nombre: "Anticipo ficticio I5", tipo: "Anticipo" },
    randomUUID(),
    now,
  ).id;
  const gastoA = gasto(f);
  const gastoB = gasto(f, { concepto: "Gasto ficticio I5 B", importe: "70.00" });

  const base = {
    gasto: gastoA,
    importe: "60.00",
    destino: f.pago,
    fechaPrevista: "2026-01-20",
    concepto: "Pendiente coordinado ficticio I5",
    nota: "",
  };
  const pendienteA = crearTransferenciaPendiente(
    f.db,
    { ...base, modalidad: "A", origen: f.habitual },
    now,
  );
  const pendienteB = crearTransferenciaPendiente(
    f.db,
    {
      ...base,
      modalidad: "B",
      gasto: gastoB,
      origen: f.adelanta,
      anticipoPrevisto: referencia,
    },
    now,
  );

  const efectoA = previewImpactoTransferenciaPendiente(
    f.db,
    pendienteA.id,
    { fechaReal: "2026-01-22" },
    now,
  ).efectoPresupuestario;
  expect(efectoA).toMatchObject({ aplica: true, presupuesto });

  const efectoB = previewImpactoTransferenciaPendiente(
    f.db,
    pendienteB.id,
    {
      fechaReal: "2026-01-22",
      anticipo: { evidencia: "Extracto ficticio I5", procedencia: "Banco ficticio I5" },
    },
    now,
  ).efectoPresupuestario;
  expect(efectoB.aplica).toBe(false);
  expect(efectoB.presupuesto).toBeNull();
  expect(efectoB.motivo).toContain("Referencia de Anticipo");
});