import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { openDatabase } from "./database";
import { createCycle, cycleContext } from "./ciclos";
import { createClassification } from "./clasificacion";
import { createSaldo, getSaldo } from "./saldos";
import { createReference } from "./referencias";
import { createBudget, budgetUsage } from "./presupuestos";
import { getAnticipo } from "./anticipos";
import { cycleExecution } from "./planes-ciclo";
import { getMovement, previewMovement, writeMovement } from "./movimientos";
import { Problem } from "./problem";
import { registrarOperacionCoordinada } from "./registro-coordinado";
import {
  confirmarTransferenciaPendiente,
  crearTransferenciaPendiente,
  getTransferenciaPendiente,
  listTransferenciasPendientes,
  previewImpactoTransferenciaPendiente,
} from "./transferencias-pendientes";

/**
 * SPEC37 · I6 — regresión de los casos base y de los bordes que I1–I5 no
 * ejercitaban.
 *
 * Cubre AC-01, AC-02, AC-07/AC-08 (mitad de motor), AC-16, AC-19 (sin escritura
 * por la vía de servicio), AC-23, AC-25 y la concurrencia real de AC-21 en la
 * **confirmación** de un pendiente `RegistroCoordinado`.
 *
 * Todo ficticio: sin datos reales, sin Excel y sin UI. Las pruebas no tocan las
 * suites de I1–I5; solo añaden evidencia donde no existía.
 */

const now = Date.parse("2026-10-25T12:00:00Z");

type Fixture = {
  db: Database;
  ciclo: string;
  ciclo2: string;
  /** Cuenta 2: paga el Gasto y exige salida a Exterior. */
  pago: string;
  /** Cuenta 1 en modalidad A: aporta. */
  habitual: string;
  /** Cuenta 2 en modalidad B: adelanta. */
  adelanta: string;
  /** Saldo pagador **sin** permiso de salida a Exterior. */
  cerrado: string;
  /** Saldo Terminal: no publica posición convencional. */
  terminal: string;
  partida: string;
  presupuestoGasto: string;
  presupuestoAportacion: string;
};

function fixture(path = ":memory:"): Fixture {
  const db = openDatabase(path);
  const ciclo = createCycle(
    db,
    {
      inicio: "2026-01-01",
      saldoInicialComida: "0",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  ).ciclo.id;
  const ciclo2 = createCycle(
    db,
    {
      inicio: "2026-02-01",
      saldoInicialComida: "0",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  ).ciclo.id;
  const pago = createSaldo(
    db,
    {
      nombre: "Cuenta pagadora ficticia I6",
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
      nombre: "Cuenta habitual ficticia I6",
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
      nombre: "Cuenta que adelanta ficticia I6",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500",
      fechaApertura: "2026-01-01",
    },
    randomUUID(),
    now,
  ).id;
  const cerrado = createSaldo(
    db,
    {
      nombre: "Cuenta sin salida a Exterior ficticia I6",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: false,
    },
    randomUUID(),
    now,
  ).id;
  const terminal = createSaldo(
    db,
    {
      nombre: "Terminal ficticia I6",
      tipo: "Efectivo",
      control: "Terminal",
      saldoApertura: "0",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  ).id;
  const presupuestoGasto = createBudget(
    db,
    {
      nombre: "Presupuesto Gasto real ficticio I6",
      fuente: "Gasto real",
      destino: pago,
    },
    randomUUID(),
    now,
  ).id;
  const presupuestoAportacion = createBudget(
    db,
    {
      nombre: "Presupuesto Aportación ficticio I6",
      fuente: "Aportación a saldo",
      destino: pago,
    },
    randomUUID(),
    now,
  ).id;
  createClassification(
    db,
    "categorias",
    {
      nombre: "Categoría ficticia I6",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
  );
  const categoria = (
    db.query("SELECT id FROM categorias ORDER BY id DESC LIMIT 1").get() as {
      id: string;
    }
  ).id;
  const subcategoria = createClassification(
    db,
    "subcategorias",
    { nombre: "Subcategoría ficticia I6", padre: categoria },
    randomUUID(),
  ).id;
  const partida = createClassification(
    db,
    "partidas",
    {
      nombre: "Partida ficticia I6",
      padre: subcategoria,
      presupuesto: presupuestoGasto,
    },
    randomUUID(),
  ).id;
  return {
    db,
    ciclo,
    ciclo2,
    pago,
    habitual,
    adelanta,
    cerrado,
    terminal,
    partida,
    presupuestoGasto,
    presupuestoAportacion,
  };
}

/** Gasto real e íntegro por el servicio E1.4. */
function realMovement(f: Fixture, body: Record<string, unknown>) {
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

function gasto(f: Fixture, over: Record<string, unknown> = {}) {
  return realMovement(f, {
    tipo: "Gasto",
    fecha: "2026-01-05",
    importe: "100.00",
    saldo: f.pago,
    partida: f.partida,
    concepto: "Gasto ficticio I6",
    nota: "",
    ...over,
  });
}

function pendienteA(f: Fixture, gastoId: string, over: Record<string, unknown> = {}) {
  return crearTransferenciaPendiente(
    f.db,
    {
      gasto: gastoId,
      modalidad: "A",
      importe: "60.00",
      origen: f.habitual,
      destino: f.pago,
      fechaPrevista: "2026-01-25",
      concepto: "Pendiente coordinado ficticio I6",
      nota: "",
      ...over,
    },
    now,
  );
}

/** Vista previa de impacto + confirmación con la huella vigente. */
function confirmar(f: Fixture, id: number, over: Record<string, unknown> = {}) {
  const item = getTransferenciaPendiente(f.db, id, now).item;
  const fechaReal = (over.fechaReal as string) ?? "2026-01-08";
  const impacto = previewImpactoTransferenciaPendiente(f.db, id, { fechaReal }, now);
  return confirmarTransferenciaPendiente(
    f.db,
    id,
    {
      revision: item.revision,
      fechaReal,
      fingerprint: impacto.fingerprint,
      ...(over.anticipo === undefined ? {} : { anticipo: over.anticipo }),
    },
    randomUUID(),
    now,
  );
}

function expectProblem(fn: () => unknown, status: number, code: string) {
  try {
    fn();
    throw new Error("Se esperaba un Problem.");
  } catch (error) {
    expect(error).toBeInstanceOf(Problem);
    expect((error as Problem).status).toBe(status);
    expect((error as Problem).code).toBe(code);
  }
}

function count(db: Database, sql: string, ...params: (string | number)[]) {
  return (db.query(sql).get(...params) as { n: number }).n;
}

function rows(db: Database, sql: string, ...params: (string | number)[]) {
  return db.query(sql).all(...params) as Record<string, unknown>[];
}

/** Foto de todo lo que una operación descartada no debe tocar. */
function snapshot(db: Database) {
  const tables = [
    "movimientos",
    "movement_audit",
    "audit",
    "counters",
    "transferencia_pendiente",
    "transferencia_pendiente_audit",
    "operacion_coordinada_attempts",
    "transferencia_pendiente_attempts",
    "fichas_anticipos",
    "referencias",
    "movimiento_anticipo",
    "saldos",
    "presupuestos",
  ];
  const present = new Set(
    (
      db.query("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[]
    ).map((row) => row.name),
  );
  return Object.fromEntries(
    tables
      .filter((table) => present.has(table))
      .map((table) => [
        table,
        db.query(`SELECT * FROM "${table}" ORDER BY rowid`).all(),
      ]),
  );
}

test("SPEC37-I6 AC-01: un Gasto normal es un único hecho íntegro, sin Transferencia, pendiente ni alerta", () => {
  const f = fixture();
  const id = gasto(f, { importe: "100.00" });

  // Un solo hecho, por el importe íntegro y en su Saldo pagador.
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(1);
  expect(getMovement(f.db, id).movimiento).toMatchObject({
    tipo: "Gasto",
    importe: "100.00",
    origen: { id: f.pago },
    partida: { id: f.partida },
    anulado: false,
  });
  // Sin Transferencia y sin pendiente: el Gasto normal no abre deuda interna.
  expect(
    count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Transferencia'"),
  ).toBe(0);
  expect(count(f.db, "SELECT COUNT(*) n FROM transferencia_pendiente")).toBe(0);
  // Sin alerta: la bandeja de «Pendiente de realizar» queda vacía.
  expect(
    listTransferenciasPendientes(
      f.db,
      new URLSearchParams("estado=Pendiente de realizar"),
      now,
    ).total,
  ).toBe(0);
  // El efecto se limita a la liquidez del Saldo pagador.
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe("900.00");
  expect(getSaldo(f.db, f.habitual).posicion.importe).toBe("500.00");
});

test("SPEC37-I6 AC-02: la modalidad A sin Transferencia es solo el Gasto desde Cuenta 2, sin pendiente", () => {
  const f = fixture();
  // Cuenta 2 paga; Cuenta 1 no participa porque el usuario no ha decidido aportar.
  const id = gasto(f, { importe: "60.00" });

  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(1);
  expect(getMovement(f.db, id).movimiento).toMatchObject({
    tipo: "Gasto",
    importe: "60.00",
    origen: { id: f.pago },
    referencia: null,
    anticipo: null,
  });
  expect(count(f.db, "SELECT COUNT(*) n FROM transferencia_pendiente")).toBe(0);
  // Cuenta 1 queda intacta: no hay aportación implícita.
  expect(getSaldo(f.db, f.habitual).posicion.importe).toBe("500.00");
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe("940.00");

  // La operación coordinada no inventa un pendiente cuando no se declara
  // Transferencia: exige una de las dos formas y no escribe nada.
  const antes = snapshot(f.db);
  expectProblem(
    () =>
      registrarOperacionCoordinada(
        f.db,
        {
          gasto: {
            fecha: "2026-01-05",
            importe: "60.00",
            saldo: f.pago,
            partida: f.partida,
            concepto: "Sin compañero financiero I6",
            nota: "",
          },
        },
        randomUUID(),
        now,
      ),
    422,
    "VALIDATION",
  );
  expect(snapshot(f.db)).toEqual(antes);
});

test("SPEC37-I6 AC-07/AC-08: en modalidad B el sobrante del Anticipo es dinero real y no amplía el Presupuesto de la Partida", () => {
  const f = fixture();
  const referencia = crearAnticipoReferencia(f).id;
  // El Saldo pagador tiene fondos suficientes: el anticipo de 80,00 es un
  // sobrante real, no una necesidad de financiación.
  const result = registrarOperacionCoordinada(
    f.db,
    {
      gasto: {
        fecha: "2026-01-20",
        importe: "100.00",
        saldo: f.pago,
        partida: f.partida,
        concepto: "Gasto ficticio I6 B sobrante",
        nota: "",
      },
      transferencia: {
        fecha: "2026-01-18",
        importe: "80.00",
        origen: f.adelanta,
        destino: f.pago,
        referencia,
        atribucion: {
          evidencia: "Extracto ficticio I6",
          procedencia: "Banco ficticio I6",
        },
        concepto: "Transferencia de Anticipo ficticia I6",
        nota: "",
      },
    },
    randomUUID(),
    now,
  );

  // La Transferencia positiva existe aunque el pagador tuviera fondos: en B no
  // se omite ni se sustituye por el saldo disponible.
  expect(result.modalidad).toBe("B");
  expect(result.transferencia!.movimiento).toMatchObject({
    tipo: "Transferencia",
    importe: "80.00",
    origen: { id: f.adelanta },
    destino: { id: f.pago },
  });
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(2);
  // El sobrante es dinero real del Saldo pagador.
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe("980.00");
  expect(getSaldo(f.db, f.adelanta).posicion.importe).toBe("420.00");
  // Y no amplía el Presupuesto de la Partida: la única imputación es el Gasto.
  const usos = budgetUsage(f.db, f.presupuestoGasto) as {
    id: string;
    tipo: string;
    importe?: string;
  }[];
  expect(usos).toHaveLength(1);
  expect(usos[0]).toMatchObject({ id: result.gasto.movimiento.id, tipo: "Gasto" });
  expect(
    count(
      f.db,
      "SELECT COUNT(*) n FROM movimientos WHERE tipo='Gasto' AND partida=?",
      f.partida,
    ),
  ).toBe(1);
  // E3.1 refleja el adelanto íntegro, sin ejecutar Aportación a saldo.
  expect(getAnticipo(f.db, result.transferencia!.movimiento.referencia!.id)).toMatchObject({
    adelantado: "80.00",
    recuperado: "0.00",
    neto: "80.00",
  });
  expect(budgetUsage(f.db, f.presupuestoAportacion)).toHaveLength(0);

  // §3.3: una modalidad B sin ninguna forma de Referencia no es «B sin
  // Transferencia», se rechaza; el pendiente tampoco admite B sin Referencia.
  expectProblem(
    () =>
      registrarOperacionCoordinada(
        f.db,
        {
          gasto: {
            fecha: "2026-01-21",
            importe: "10.00",
            saldo: f.pago,
            partida: f.partida,
            concepto: "B sin Referencia I6",
            nota: "",
          },
          pendiente: {
            modalidad: "B",
            importe: "10.00",
            origen: f.adelanta,
            destino: f.pago,
            fechaPrevista: "2026-01-25",
            concepto: "B sin Referencia I6",
            nota: "",
          },
        },
        randomUUID(),
        now,
      ),
    422,
    "VALIDATION",
  );
});

/** Referencia de Anticipo existente, creada por el maestro único de E3.1. */
function crearAnticipoReferencia(f: Fixture) {
  return createReference(
    f.db,
    { nombre: "Anticipo ficticio existente I6", tipo: "Anticipo" },
    randomUUID(),
    now,
  );
}

test("SPEC37-I6 AC-16: un Saldo pagador sin salida a Exterior se rechaza sin elegir otro Saldo", () => {
  const f = fixture();
  const antes = snapshot(f.db);
  expectProblem(
    () =>
      realMovement(f, {
        tipo: "Gasto",
        fecha: "2026-01-05",
        importe: "20.00",
        saldo: f.cerrado,
        partida: f.partida,
        concepto: "Gasto sin permiso I6",
        nota: "",
      }),
    422,
    "EXTERIOR_PERMISSION",
  );
  expect(snapshot(f.db)).toEqual(antes);

  // La operación coordinada arrastra la misma regla de E1.4 y tampoco sustituye
  // el Saldo pagador por otro: el destino declarado es el que paga.
  expectProblem(
    () =>
      registrarOperacionCoordinada(
        f.db,
        {
          gasto: {
            fecha: "2026-01-05",
            importe: "20.00",
            saldo: f.cerrado,
            partida: f.partida,
            concepto: "Gasto sin permiso I6",
            nota: "",
          },
          pendiente: {
            modalidad: "A",
            importe: "20.00",
            origen: f.habitual,
            destino: f.cerrado,
            fechaPrevista: "2026-01-25",
            concepto: "Pendiente sin permiso I6",
            nota: "",
          },
        },
        randomUUID(),
        now,
      ),
    422,
    "EXTERIOR_PERMISSION",
  );
  expect(snapshot(f.db)).toEqual(antes);
  // Ningún Saldo cambió de papel: el pagador sigue sin permiso.
  expect(getSaldo(f.db, f.cerrado).permiteSalidaExterior).toBe(false);
});

test("SPEC37-I6 AC-19: abandonar el alta no escribe Gasto, Transferencia ni pendiente", () => {
  const f = fixture();
  gasto(f, { concepto: "Gasto previo ficticio I6" });
  const antes = snapshot(f.db);

  // Un borrador que nunca se envía no llega al servidor; la vía de servicio
  // equivalente es un alta incompleta: rechazo y cero escrituras. El recorrido
  // de «Cancelar» en el formulario real vive en el E2E de I6.
  expectProblem(
    () =>
      registrarOperacionCoordinada(
        f.db,
        {
          gasto: {
            fecha: "2026-01-06",
            importe: "60.00",
            saldo: f.pago,
            partida: f.partida,
            concepto: "Borrador abandonado I6",
            nota: "",
          },
          pendiente: {
            modalidad: "A",
            importe: "60.00",
            origen: f.habitual,
            destino: f.pago,
            concepto: "Borrador abandonado I6",
            nota: "",
          },
        },
        randomUUID(),
        now,
      ),
    422,
    "VALIDATION",
  );
  expect(snapshot(f.db)).toEqual(antes);
  expect(
    listTransferenciasPendientes(
      f.db,
      new URLSearchParams("estado=Pendiente de realizar"),
      now,
    ).total,
  ).toBe(0);
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(1);
});

test("SPEC37-I6 AC-23: rectificar y anular el Gasto de un pendiente confirmado no duplica hechos ni inventa devoluciones", () => {
  const f = fixture();
  const gastoId = gasto(f, { importe: "100.00" });
  const item = pendienteA(f, gastoId, { importe: "60.00" });
  const confirmado = confirmar(f, item.id, { fechaReal: "2026-01-08" });
  const transferenciaId = confirmado.movimiento!.id;
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(2);

  // ── Rectificación del Gasto: auditoría y una sola fila ──────────────────
  const revision = (
    f.db.query("SELECT revision FROM movimientos WHERE id=?").get(gastoId) as {
      revision: number;
    }
  ).revision;
  const patch = {
    tipo: "Gasto",
    fecha: "2026-01-05",
    importe: "120.00",
    saldo: f.pago,
    partida: f.partida,
    concepto: "Gasto ficticio I6 rectificado",
    nota: "",
    revision,
    motivo: "Rectificación ficticia I6",
  };
  const plan = previewMovement(f.db, patch, gastoId, false, now);
  writeMovement(
    f.db,
    { ...patch, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    randomUUID(),
    gastoId,
    false,
    now,
  );

  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(2);
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Gasto'")).toBe(1);
  expect(getMovement(f.db, gastoId).movimiento).toMatchObject({
    importe: "120.00",
    anulado: false,
    revision: revision + 1,
  });
  expect(
    rows(
      f.db,
      "SELECT accion FROM movement_audit WHERE id=? ORDER BY revision",
      gastoId,
    ).map((r) => r.accion),
  ).toEqual(["alta", "rectificación"]);
  // La Transferencia confirmada no se toca ni se duplica (§9.3).
  expect(
    count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Transferencia'"),
  ).toBe(1);
  expect(getMovement(f.db, transferenciaId).movimiento).toMatchObject({
    importe: "60.00",
    anulado: false,
  });
  expect(getTransferenciaPendiente(f.db, item.id, now).item).toMatchObject({
    estado: "Confirmada",
    movimiento: { id: transferenciaId },
  });

  // ── Anulación del Gasto: ningún efecto compensatorio inventado ──────────
  const revisionAnulada = (
    f.db.query("SELECT revision FROM movimientos WHERE id=?").get(gastoId) as {
      revision: number;
    }
  ).revision;
  const planAnulacion = previewMovement(
    f.db,
    { revision: revisionAnulada, motivo: "Anulación ficticia I6" },
    gastoId,
    true,
    now,
  );
  writeMovement(
    f.db,
    {
      revision: revisionAnulada,
      motivo: "Anulación ficticia I6",
      fingerprint: planAnulacion.fingerprint,
      contextRevision: planAnulacion.contextRevision,
    },
    randomUUID(),
    gastoId,
    true,
    now,
  );

  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(2);
  expect(getMovement(f.db, gastoId).movimiento).toMatchObject({
    anulado: true,
    estado: "Anulado",
  });
  expect(
    rows(
      f.db,
      "SELECT accion FROM movement_audit WHERE id=? ORDER BY revision",
      gastoId,
    ).map((r) => r.accion),
  ).toEqual(["alta", "rectificación", "anulación"]);
  // Ni devolución ni Transferencia sustitutiva; el pendiente confirmado no se
  // reabre ni se cancela solo (§9.2: decide el usuario).
  expect(
    count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Devolución de gasto'"),
  ).toBe(0);
  expect(getTransferenciaPendiente(f.db, item.id, now).item).toMatchObject({
    estado: "Confirmada",
    movimiento: { id: transferenciaId },
  });
  // El saldo pagador solo refleja los hechos vigentes: 1000 + 60 (la
  // Transferencia entra en Cuenta 2) y el Gasto anulado ya no resta.
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe("1060.00");
});

test("SPEC37-I6 AC-23: anular la Transferencia de Anticipo devuelve E3.1 a cero sin inventar una devolución", () => {
  const f = fixture();
  const result = registrarOperacionCoordinada(
    f.db,
    {
      gasto: {
        fecha: "2026-01-20",
        importe: "100.00",
        saldo: f.pago,
        partida: f.partida,
        concepto: "Gasto ficticio I6 B anulación",
        nota: "",
      },
      transferencia: {
        fecha: "2026-01-18",
        importe: "60.00",
        origen: f.adelanta,
        destino: f.pago,
        anticipoNuevo: {
          nombre: "Anticipo nuevo ficticio I6",
          apertura: "2026-01-10",
          evidencia: "Apertura ficticia I6",
        },
        atribucion: {
          evidencia: "Extracto ficticio I6",
          procedencia: "Banco ficticio I6",
        },
        concepto: "Transferencia de Anticipo ficticia I6",
        nota: "",
      },
    },
    randomUUID(),
    now,
  );
  const referencia = result.transferencia!.movimiento.referencia!.id;
  const transferenciaId = result.transferencia!.movimiento.id;
  expect(getAnticipo(f.db, referencia)).toMatchObject({
    adelantado: "60.00",
    neto: "60.00",
  });

  const revision = (
    f.db.query("SELECT revision FROM movimientos WHERE id=?").get(transferenciaId) as {
      revision: number;
    }
  ).revision;
  const plan = previewMovement(
    f.db,
    { revision, motivo: "Anulación ficticia del Anticipo I6" },
    transferenciaId,
    true,
    now,
  );
  writeMovement(
    f.db,
    {
      revision,
      motivo: "Anulación ficticia del Anticipo I6",
      fingerprint: plan.fingerprint,
      contextRevision: plan.contextRevision,
    },
    randomUUID(),
    transferenciaId,
    true,
    now,
  );

  // El hecho se anula, no se compensa: ni devolución ni Movimiento nuevo.
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(2);
  expect(getMovement(f.db, transferenciaId).movimiento).toMatchObject({
    anulado: true,
    importe: "60.00",
    referencia: { id: referencia },
  });
  expect(
    count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Devolución de gasto'"),
  ).toBe(0);
  // E3.1 se recalcula desde los hechos vigentes: el Anticipo queda en cero y la
  // ficha sigue existiendo (no se borra ni se duplica).
  const ficha = getAnticipo(f.db, referencia);
  expect(ficha).toMatchObject({
    adelantado: "0.00",
    recuperado: "0.00",
    neto: "0.00",
  });
  expect(
    count(f.db, "SELECT COUNT(*) n FROM fichas_anticipos WHERE referencia=?", referencia),
  ).toBe(1);
  // El Gasto sigue siendo el hecho real e íntegro.
  expect(getMovement(f.db, result.gasto.movimiento.id).movimiento).toMatchObject({
    tipo: "Gasto",
    importe: "100.00",
    anulado: false,
  });
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe("900.00");
});

test("SPEC37-I6 AC-25: un Terminal no publica posición y su Gasto depende solo de «Permite salida a Exterior»", () => {
  const f = fixture();
  // D8: sin posiciones ni límites calculados; nunca un cero inventado.
  const terminal = getSaldo(f.db, f.terminal);
  expect(terminal.posicion).toMatchObject({ importe: null, condicion: "no_aplica" });

  // Con permiso expreso, el Gasto se registra sin déficit, mínimo ni restante.
  const id = gasto(f, { saldo: f.terminal, importe: "25.00" });
  expect(getMovement(f.db, id).movimiento).toMatchObject({
    tipo: "Gasto",
    importe: "25.00",
    origen: { id: f.terminal },
  });
  expect(getSaldo(f.db, f.terminal).posicion.importe).toBeNull();

  // Sin permiso, el mismo Terminal rechaza por E1.4 y no se sustituye el Saldo.
  const sinPermiso = createSaldo(
    f.db,
    {
      nombre: "Terminal sin permiso ficticia I6",
      tipo: "Efectivo",
      control: "Terminal",
      saldoApertura: "0",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: false,
    },
    randomUUID(),
    now,
  ).id;
  const antes = count(f.db, "SELECT COUNT(*) n FROM movimientos");
  expectProblem(
    () => gasto(f, { saldo: sinPermiso, importe: "25.00" }),
    422,
    "EXTERIOR_PERMISSION",
  );
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(antes);
  expect(getSaldo(f.db, sinPermiso).posicion.importe).toBeNull();
});

test("SPEC37-I6 AC-17: un importe superior al disponible se registra sin bloqueo nuevo por saldo calculado", () => {
  const f = fixture();
  // 1.200,00 € sobre una posición de 1.000,00 €: el déficit es informativo y la
  // única vía de bloqueo sigue siendo E1.4/E1.5 (D3), no una posición calculada.
  const id = gasto(f, { importe: "1200.00" });
  expect(getMovement(f.db, id).movimiento).toMatchObject({
    tipo: "Gasto",
    importe: "1200.00",
    anulado: false,
  });
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe("-200.00");
  // Ningún límite presupuestario se inventa: el motor no bloquea por posición.
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(1);
});

type ConcurrentChild = {
  exited: Promise<number>;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
};

/** Dos procesos reales confirman el mismo pendiente con claves distintas. */
function runConcurrentConfirm(input: { path: string; id: number }) {
  const database = resolve("apps/api/src/database.ts"),
    pendientes = resolve("apps/api/src/transferencias-pendientes.ts");
  const script = `import{openDatabase}from${JSON.stringify(database)};import{getTransferenciaPendiente,previewImpactoTransferenciaPendiente,confirmarTransferenciaPendiente}from${JSON.stringify(pendientes)};const db=openDatabase(process.argv[1]);const id=Number(process.argv[2]);try{const item=getTransferenciaPendiente(db,id,${now}).item;const fechaReal="2026-01-08";const impacto=previewImpactoTransferenciaPendiente(db,id,{fechaReal},${now});const r=confirmarTransferenciaPendiente(db,id,{revision:item.revision,fechaReal,fingerprint:impacto.fingerprint},crypto.randomUUID(),${now});process.stdout.write(JSON.stringify({ok:true,movimiento:r.movimiento.id}));}catch(e){process.stdout.write(JSON.stringify({ok:false,code:e?.code??String(e)}));}finally{db.close();}`;
  return Bun.spawn([process.execPath, "-e", script, input.path, String(input.id)], {
    env: { ...process.env, NODE_ENV: "test" },
    stdout: "pipe",
    stderr: "pipe",
  }) as unknown as ConcurrentChild;
}

test("SPEC37-I6 AC-21: dos confirmaciones concurrentes dejan una única Transferencia y una única resolución", async () => {
  const dir = mkdtempSync(join(tmpdir(), "spec37-i6-"));
  const path = join(dir, "confirmacion.sqlite");
  try {
    const f = fixture(path);
    const gastoId = gasto(f, { importe: "100.00" });
    const item = pendienteA(f, gastoId, { importe: "60.00" });
    f.db.close();

    const children = [0, 1].map(() => runConcurrentConfirm({ path, id: item.id }));
    const out = await Promise.all(
      children.map(async (child) => {
        expect(await child.exited).toBe(0);
        expect(await new Response(child.stderr).text()).toBe("");
        return JSON.parse(await new Response(child.stdout).text()) as {
          ok: boolean;
          code?: string;
          movimiento?: string;
        };
      }),
    );

    const db = openDatabase(path);
    try {
      // Un único hecho real y una única resolución, gane quien gane.
      expect(count(db, "SELECT COUNT(*) n FROM movimientos")).toBe(2);
      expect(
        count(db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Transferencia'"),
      ).toBe(1);
      expect(
        count(db, "SELECT COUNT(*) n FROM transferencia_pendiente WHERE estado='Confirmada'"),
      ).toBe(1);
      expect(
        count(db, "SELECT COUNT(*) n FROM transferencia_pendiente_audit WHERE accion='confirmacion'"),
      ).toBe(1);
      expect(count(db, "SELECT COUNT(*) n FROM transferencia_pendiente_attempts")).toBe(1);
      const ok = out.filter((r) => r.ok);
      expect(ok).toHaveLength(1);
      const perdido = out.find((r) => !r.ok)!;
      // El perdedor no escribe ni reproduce una segunda resolución.
      expect(["STATE_CONFLICT", "REVISION_CONFLICT"]).toContain(perdido.code!);
      expect(
        count(db, "SELECT COUNT(*) n FROM movimientos WHERE id=?", ok[0].movimiento!),
      ).toBe(1);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * AC-28 — el flujo coordinado no necesita ningún motor nuevo: la ejecución de un
 * Presupuesto «Aportación a saldo» la decide `executionFacts` por la
 * Transferencia real (destino del Presupuesto y **sin** Referencia). Estas
 * pruebas lo miden contra `cycleExecution`, que es el motor real, en los tres
 * casos: A ordinaria, B con Referencia y pendiente sin confirmar.
 */
function ejecutado(f: Fixture) {
  const item = cycleExecution(f.db, f.ciclo, now).items.find(
    (i) => i.presupuesto.id === f.presupuestoAportacion,
  );
  return item?.ejecutado;
}

test("SPEC37-I6 AC-28: una Transferencia ordinaria real ejecuta la Aportación a saldo de su destino", () => {
  const f = fixture();
  expect(ejecutado(f)).toBe("0.00");
  realMovement(f, {
    tipo: "Transferencia",
    fecha: "2026-01-10",
    importe: "30.00",
    origen: f.habitual,
    destino: f.pago,
    concepto: "Aportación ficticia I6",
    nota: "",
  });
  expect(ejecutado(f)).toBe("30.00");
});

test("SPEC37-I6 AC-28: una Transferencia de Anticipo (con Referencia) no ejecuta la Aportación a saldo", () => {
  const f = fixture();
  const referencia = crearAnticipoReferencia(f).id;
  registrarOperacionCoordinada(
    f.db,
    {
      gasto: {
        fecha: "2026-01-20",
        importe: "100.00",
        saldo: f.pago,
        partida: f.partida,
        concepto: "Gasto ficticio I6 AC-28 B",
        nota: "",
      },
      transferencia: {
        fecha: "2026-01-18",
        importe: "80.00",
        origen: f.adelanta,
        destino: f.pago,
        referencia,
        atribucion: {
          evidencia: "Extracto ficticio I6",
          procedencia: "Banco ficticio I6",
        },
        concepto: "Transferencia de Anticipo ficticia I6",
        nota: "",
      },
    },
    randomUUID(),
    now,
  );
  // El hecho existe y mueve dinero, pero el motor R3 no lo imputa a la
  // Aportación a saldo: la Referencia lo excluye.
  expect(ejecutado(f)).toBe("0.00");
});

test("SPEC37-I6 AC-28: un pendiente coordinado no ejecuta nada hasta confirmarlo", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const item = pendienteA(f, gastoId);
  expect(ejecutado(f)).toBe("0.00");
  confirmar(f, item.id);
  // Al confirmar nace la Transferencia real ordinaria y el motor la imputa.
  expect(ejecutado(f)).toBe("60.00");
});
