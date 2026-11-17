import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createCycle, cycleContext } from "./ciclos";
import { createClassification } from "./clasificacion";
import { createSaldo, getSaldo } from "./saldos";
import { createReference } from "./referencias";
import { budgetUsage, createBudget } from "./presupuestos";
import { getAnticipo } from "./anticipos";
import { monthlyFlow } from "./flujo-mensual";
import { Problem } from "./problem";
import { registrarOperacionCoordinada } from "./registro-coordinado";

/**
 * SPEC37 · I3 — operación coordinada atómica.
 *
 * Cubre AC-03, AC-06, AC-09, AC-14, AC-15, AC-20, AC-21, AC-34, AC-40 y AC-41
 * sobre los motores ya entregados (E1.4/E1.5, E3.1 y SPEC36 §6). Todo ficticio:
 * sin datos reales, sin Excel y sin UI.
 *
 * La atomicidad se prueba por el efecto observable que el contrato exige
 * (rollback íntegro), no por leer el código: se fuerza un fallo en la última
 * escritura y se compara la foto completa de las tablas implicadas.
 */

const now = Date.parse("2026-10-25T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const stamp = "2026-01-01T00:00:00.000Z";

type Fixture = {
  db: Database;
  ciclo: string;
  ciclo2: string;
  /** Saldo que paga el Gasto: exige salida a Exterior. */
  pago: string;
  /** Saldo habitual desde el que se aporta (modalidad A). */
  habitual: string;
  /** Saldo que adelanta los fondos (modalidad B). */
  adelanta: string;
  /** Saldo pagador alternativo: permite salida a Exterior, pero no es destino. */
  pago2: string;
  partida: string;
  presupuestoGasto: string;
  presupuestoAportacion: string;
  referencia: string;
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
      nombre: "Cuenta pagadora ficticia I3",
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
      nombre: "Cuenta habitual ficticia I3",
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
      nombre: "Cuenta que adelanta ficticia I3",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500",
      fechaApertura: "2026-01-01",
    },
    randomUUID(),
    now,
  ).id;
  const pago2 = createSaldo(
    db,
    {
      nombre: "Cuenta pagadora alternativa ficticia I3",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "300",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  ).id;
  const presupuestoGasto = createBudget(
    db,
    {
      nombre: "Presupuesto Gasto real ficticio I3",
      fuente: "Gasto real",
      destino: pago,
    },
    randomUUID(),
    now,
  ).id;
  const presupuestoAportacion = createBudget(
    db,
    {
      nombre: "Presupuesto Aportación ficticio I3",
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
      nombre: "Categoría ficticia I3",
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
    { nombre: "Subcategoría ficticia I3", padre: categoria },
    randomUUID(),
  ).id;
  const partida = createClassification(
    db,
    "partidas",
    {
      nombre: "Partida ficticia I3",
      padre: subcategoria,
      presupuesto: presupuestoGasto,
    },
    randomUUID(),
  ).id;
  const referencia = createReference(
    db,
    { nombre: "Anticipo ficticio existente I3", tipo: "Anticipo" },
    randomUUID(),
    now,
  ).id;
  return {
    db,
    ciclo,
    ciclo2,
    pago,
    habitual,
    adelanta,
    pago2,
    partida,
    presupuestoGasto,
    presupuestoAportacion,
    referencia,
  };
}

/** Gasto real e íntegro pagado desde `f.pago`. */
function gasto(f: Fixture, over: Record<string, unknown> = {}) {
  return {
    fecha: "2026-01-20",
    importe: "100.00",
    saldo: f.pago,
    partida: f.partida,
    concepto: "Gasto ficticio I3",
    nota: "",
    ...over,
  };
}

/** Modalidad A: Cuenta habitual → Cuenta pagadora, sin Referencia. */
function transferenciaA(f: Fixture, over: Record<string, unknown> = {}) {
  return {
    fecha: "2026-01-18",
    importe: "60.00",
    origen: f.habitual,
    destino: f.pago,
    concepto: "Transferencia ordinaria ficticia I3",
    nota: "",
    ...over,
  };
}

/** Modalidad B: el Saldo que adelanta → el Saldo que paga. */
function transferenciaB(f: Fixture, over: Record<string, unknown> = {}) {
  return {
    fecha: "2026-01-18",
    importe: "60.00",
    origen: f.adelanta,
    destino: f.pago,
    atribucion: {
      evidencia: "Extracto ficticio I3",
      procedencia: "Banco ficticio I3",
    },
    concepto: "Transferencia de Anticipo ficticia I3",
    nota: "",
    ...over,
  };
}

function pendienteA(f: Fixture, over: Record<string, unknown> = {}) {
  return {
    modalidad: "A",
    importe: "60.00",
    origen: f.habitual,
    destino: f.pago,
    fechaPrevista: "2026-11-10",
    concepto: "Pendiente coordinado ficticio I3",
    nota: "",
    ...over,
  };
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

/**
 * Foto de todo lo que la operación puede tocar: hechos, auditorías, fichas,
 * Referencias, contadores e intentos. Un rollback íntegro la deja idéntica.
 */
function snapshot(db: Database) {
  const tables = [
    "movimientos",
    "movement_audit",
    "audit",
    "counters",
    "transferencia_pendiente",
    "transferencia_pendiente_audit",
    "operacion_coordinada_attempts",
    "fichas_anticipos",
    "referencias",
    "reference_attempts",
    "anticipo_audit",
    "anticipo_attempts",
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

function rows(db: Database, sql: string, ...params: (string | number)[]) {
  return db.query(sql).all(...params) as Record<string, unknown>[];
}

function count(db: Database, sql: string, ...params: (string | number)[]) {
  return (db.query(sql).get(...params) as { n: number }).n;
}

test("SPEC37-I3 AC-03: Gasto + Transferencia ordinaria en una operación, con fechas propias", () => {
  const f = fixture();
  const result = registrarOperacionCoordinada(
    f.db,
    { gasto: gasto(f), transferencia: transferenciaA(f) },
    randomUUID(),
    now,
  );

  expect(result.modalidad).toBe("A");
  expect(result.pendiente).toBeNull();
  expect(result.anticipo).toBeNull();
  // El Gasto es el hecho real e íntegro desde el Saldo pagador (D4).
  expect(result.gasto.movimiento).toMatchObject({
    tipo: "Gasto",
    fecha: "2026-01-20",
    importe: "100.00",
    referencia: null,
  });
  expect(result.gasto.movimiento.origen.id).toBe(f.pago);
  expect(result.gasto.movimiento.destino.id).toBe("S000");
  expect(result.gasto.movimiento.partida?.id).toBe(f.partida);
  // La Transferencia ordinaria es otro hecho, con su propia fecha real.
  expect(result.transferencia!.movimiento).toMatchObject({
    tipo: "Transferencia",
    fecha: "2026-01-18",
    importe: "60.00",
    referencia: null,
  });
  expect(result.transferencia!.movimiento.origen.id).toBe(f.habitual);
  expect(result.transferencia!.movimiento.destino.id).toBe(f.pago);
  expect(result.transferencia!.movimiento.fecha).not.toBe(
    result.gasto.movimiento.fecha,
  );
  // Una única escritura de cada hecho: no hay Gasto ni Transferencia duplicados.
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Gasto'")).toBe(1);
  expect(
    count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Transferencia'"),
  ).toBe(1);
  // Los motores ven el Gasto una sola vez y la Transferencia mueve los Saldos.
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe("960.00");
  expect(getSaldo(f.db, f.habitual).posicion.importe).toBe("440.00");
  const flujo = monthlyFlow(f.db, f.ciclo, now);
  // El motor de flujo ve el Gasto una sola vez, por su importe íntegro.
  expect(flujo.metrics.gasto.subtotal).toBe("100.00");
  expect(flujo.metrics.gasto.ids).toEqual([result.gasto.movimiento.id]);
});

test("SPEC37-I3 AC-06: Gasto + Transferencia de Anticipo con Referencia existente alimenta E3.1", () => {
  const f = fixture();
  const antes = snapshot(f.db);
  const result = registrarOperacionCoordinada(
    f.db,
    {
      gasto: gasto(f),
      transferencia: transferenciaB(f, { referencia: f.referencia }),
    },
    randomUUID(),
    now,
  );

  expect(result.modalidad).toBe("B");
  // Referencia existente: no se crea ficha nueva ni Referencia nueva.
  expect(result.anticipo).toBeNull();
  expect(result.transferencia!.movimiento.referencia?.id).toBe(f.referencia);
  expect(snapshot(f.db).referencias.length).toBe(antes.referencias.length);
  // El motor único de Anticipos refleja el adelanto íntegro.
  const ficha = getAnticipo(f.db, f.referencia);
  expect(ficha).toMatchObject({
    adelantado: "60.00",
    recuperado: "0.00",
    neto: "60.00",
    estado: "Sin recuperar",
    cobertura: "Verificada",
    primerAdelanto: "2026-01-18",
  });
  expect(ficha.operaciones).toHaveLength(1);
  expect(ficha.operaciones[0]).toMatchObject({
    id: result.transferencia!.movimiento.id,
    importe: "60.00",
    origen: f.adelanta,
    destino: f.pago,
    elegible: true,
    atribucion: {
      rol: "Adelanto",
      origen: f.adelanta,
      destino: f.pago,
      evidencia: "Extracto ficticio I3",
      procedencia: "Banco ficticio I3",
    },
  });
  expect(ficha.pares[0]).toMatchObject({
    origen: f.adelanta,
    destino: f.pago,
    adelantado: "60.00",
    neto: "60.00",
  });
  // El Gasto sigue siendo íntegro: el Anticipo no lo reduce ni lo divide.
  expect(result.gasto.movimiento.importe).toBe("100.00");
  expect(result.gasto.movimiento.referencia).toBeNull();
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe("960.00");
  expect(getSaldo(f.db, f.adelanta).posicion.importe).toBe("440.00");
});

test("SPEC37-I3 AC-09: Referencia y ficha nuevas se crean en la misma transacción, sin huérfanos", () => {
  const f = fixture();
  const antes = snapshot(f.db);
  const result = registrarOperacionCoordinada(
    f.db,
    {
      gasto: gasto(f),
      transferencia: transferenciaB(f, {
        anticipoNuevo: {
          nombre: "Anticipo nuevo ficticio I3",
          apertura: "2026-01-10",
          evidencia: "Apertura ficticia I3",
        },
      }),
    },
    randomUUID(),
    now,
  );

  expect(result.modalidad).toBe("B");
  const referencia = result.anticipo!.referencia.id;
  expect(referencia).toMatch(/^REF\d{3,}$/);
  // La respuesta ya refleja el adelanto, no la foto de la ficha recién creada.
  expect(result.anticipo).toMatchObject({ neto: "60.00", adelantado: "60.00" });
  // La Transferencia apunta a la Referencia recién creada en la misma operación.
  expect(result.transferencia!.movimiento.referencia?.id).toBe(referencia);
  // Ficha 1:1, exactamente una, con su apertura y sin hechos huérfanos.
  expect(
    count(f.db, "SELECT COUNT(*) n FROM fichas_anticipos WHERE referencia=?", referencia),
  ).toBe(1);
  expect(
    count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE referencia=?", referencia),
  ).toBe(1);
  expect(snapshot(f.db).referencias.length).toBe(antes.referencias.length + 1);
  expect(getAnticipo(f.db, referencia)).toMatchObject({
    neto: "60.00",
    adelantado: "60.00",
    fechaApertura: { fecha: "2026-01-10", tipo: "Manual" },
  });
  // El Gasto no hereda la Referencia del Anticipo (§5.4).
  expect(result.gasto.movimiento.referencia).toBeNull();
});

test("SPEC37-I3 AC-14/AC-15: el Gasto imputa su Partida una sola vez y el Anticipo no ejecuta Aportación a saldo", () => {
  const f = fixture();
  const result = registrarOperacionCoordinada(
    f.db,
    {
      gasto: gasto(f),
      transferencia: transferenciaB(f, {
        anticipoNuevo: { nombre: "Anticipo nuevo ficticio I3" },
      }),
    },
    randomUUID(),
    now,
  );

  // Imputación exacta: un único Movimiento de Gasto contra la Partida.
  const usos = budgetUsage(f.db, f.presupuestoGasto) as {
    id: string;
    tipo: string;
    partida: string;
  }[];
  expect(usos).toHaveLength(1);
  expect(usos[0]).toMatchObject({
    id: result.gasto.movimiento.id,
    tipo: "Gasto",
    partida: f.partida,
    anulado: 0,
  });
  expect(
    count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Gasto' AND partida=?", f.partida),
  ).toBe(1);
  // AC-14: el Anticipo es financiación, no ejecución presupuestaria.
  expect(budgetUsage(f.db, f.presupuestoAportacion)).toHaveLength(0);
  // La Transferencia no lleva Partida: no hay doble imputación.
  expect(result.transferencia!.movimiento).toMatchObject({
    partida: null,
    importe: "60.00",
  });
  expect(result.gasto.movimiento.importe).toBe("100.00");
});

test("SPEC37-I3 AC-20/AC-34: un fallo al escribir el Gasto revierte Transferencia, Referencia y ficha", () => {
  const f = fixture();
  f.db.run(
    "CREATE TRIGGER i3_fallo_gasto BEFORE INSERT ON movimientos WHEN NEW.tipo='Gasto' BEGIN SELECT RAISE(ABORT,'fallo forzado I3 gasto'); END",
  );
  const antes = snapshot(f.db);
  const posiciones = {
    pago: getSaldo(f.db, f.pago).posicion.importe,
    adelanta: getSaldo(f.db, f.adelanta).posicion.importe,
  };
  try {
    // La Transferencia y la ficha se escriben antes que el Gasto (§4): el fallo
    // en el último paso debe deshacerlas junto con su auditoría y contadores.
    expect(() =>
      registrarOperacionCoordinada(
        f.db,
        {
          gasto: gasto(f),
          transferencia: transferenciaB(f, {
            anticipoNuevo: { nombre: "Anticipo nuevo ficticio I3" },
          }),
        },
        randomUUID(),
        now,
      ),
    ).toThrow(/fallo forzado I3 gasto/);
  } finally {
    f.db.run("DROP TRIGGER i3_fallo_gasto");
  }
  expect(snapshot(f.db)).toEqual(antes);
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe(posiciones.pago);
  expect(getSaldo(f.db, f.adelanta).posicion.importe).toBe(posiciones.adelanta);
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(0);
  // La única ficha es la de la Referencia del fixture: la nueva no sobrevive.
  expect(count(f.db, "SELECT COUNT(*) n FROM fichas_anticipos")).toBe(
    antes.fichas_anticipos.length,
  );
  expect(count(f.db, "SELECT COUNT(*) n FROM referencias")).toBe(1);
  expect(count(f.db, "SELECT COUNT(*) n FROM operacion_coordinada_attempts")).toBe(0);
});

test("SPEC37-I3 AC-20/AC-34: un fallo al escribir el pendiente revierte el Gasto real", () => {
  const f = fixture();
  f.db.run(
    "CREATE TRIGGER i3_fallo_pendiente BEFORE INSERT ON transferencia_pendiente BEGIN SELECT RAISE(ABORT,'fallo forzado I3 pendiente'); END",
  );
  const antes = snapshot(f.db);
  const posicion = getSaldo(f.db, f.pago).posicion.importe;
  try {
    expect(() =>
      registrarOperacionCoordinada(
        f.db,
        { gasto: gasto(f), pendiente: pendienteA(f) },
        randomUUID(),
        now,
      ),
    ).toThrow(/fallo forzado I3 pendiente/);
  } finally {
    f.db.run("DROP TRIGGER i3_fallo_pendiente");
  }
  // Ni Gasto, ni Movimiento, ni pendiente, ni auditoría parcial, ni intento.
  expect(snapshot(f.db)).toEqual(antes);
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe(posicion);
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(0);
  expect(count(f.db, "SELECT COUNT(*) n FROM transferencia_pendiente")).toBe(0);
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Gasto'")).toBe(0);
});

test("SPEC37-I3 AC-34/AC-40: la clave devuelve la misma respuesta y rechaza otro payload sin escribir", () => {
  const f = fixture();
  const key = randomUUID();
  const body = { gasto: gasto(f), transferencia: transferenciaA(f) };
  const first = registrarOperacionCoordinada(f.db, body, key, now);
  const despues = snapshot(f.db);
  const posiciones = {
    pago: getSaldo(f.db, f.pago).posicion.importe,
    habitual: getSaldo(f.db, f.habitual).posicion.importe,
  };

  // Replay: misma clave y mismo payload ⇒ misma respuesta, sin duplicar hechos.
  const replay = registrarOperacionCoordinada(f.db, body, key, now);
  expect(replay).toEqual(first);
  expect(snapshot(f.db)).toEqual(despues);
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe(posiciones.pago);
  expect(getSaldo(f.db, f.habitual).posicion.importe).toBe(posiciones.habitual);
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(2);
  expect(
    count(f.db, "SELECT COUNT(*) n FROM operacion_coordinada_attempts WHERE operacion='registrar' AND key=?", key),
  ).toBe(1);

  // Mismo clave con otro payload ⇒ conflicto y sin escritura (AC-40).
  const antes = snapshot(f.db);
  expectProblem(
    () =>
      registrarOperacionCoordinada(
        f.db,
        { ...body, transferencia: { ...transferenciaA(f), importe: "70.00" } },
        key,
        now,
      ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  expect(snapshot(f.db)).toEqual(antes);

  // Y la clave es obligatoria: sin ella no hay operación.
  expectProblem(
    () => registrarOperacionCoordinada(f.db, body, "", now),
    422,
    "IDEMPOTENCY_REQUIRED",
  );
  expect(snapshot(f.db)).toEqual(antes);
});

test("SPEC37-I3 AC-03/AC-06: importes inválidos se rechazan sin escribir nada", () => {
  const f = fixture();
  const antes = snapshot(f.db);
  for (const importe of ["0.00", "-5.00", "10.005", "", 100] as unknown[]) {
    expectProblem(
      () =>
        registrarOperacionCoordinada(
          f.db,
          { gasto: gasto(f, { importe }), transferencia: transferenciaA(f) },
          randomUUID(),
          now,
        ),
      422,
      "VALIDATION",
    );
    expectProblem(
      () =>
        registrarOperacionCoordinada(
          f.db,
          { gasto: gasto(f), transferencia: transferenciaA(f, { importe }) },
          randomUUID(),
          now,
        ),
      422,
      "VALIDATION",
    );
    expectProblem(
      () =>
        registrarOperacionCoordinada(
          f.db,
          { gasto: gasto(f, { importe }), pendiente: pendienteA(f) },
          randomUUID(),
          now,
        ),
      422,
      "VALIDATION",
    );
    expectProblem(
      () =>
        registrarOperacionCoordinada(
          f.db,
          { gasto: gasto(f), pendiente: pendienteA(f, { importe }) },
          randomUUID(),
          now,
        ),
      422,
      "VALIDATION",
    );
  }
  expect(snapshot(f.db)).toEqual(antes);
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(0);
  expect(count(f.db, "SELECT COUNT(*) n FROM operacion_coordinada_attempts")).toBe(0);
});

test("SPEC37-I3 AC-09: fechas no futuras, hoy admitido y límites de Ciclo por fecha real", () => {
  const f = fixture();
  const antes = snapshot(f.db);
  // Mañana respecto del día civil de España: rechazo en el Gasto y en la
  // Transferencia, con el mismo criterio de `movimientos.ts`.
  for (const body of [
    { gasto: gasto(f, { fecha: "2026-10-26" }), transferencia: transferenciaA(f) },
    { gasto: gasto(f), transferencia: transferenciaA(f, { fecha: "2026-10-26" }) },
    { gasto: gasto(f, { fecha: "2026-13-01" }), transferencia: transferenciaA(f) },
    { gasto: gasto(f), pendiente: pendienteA(f, { fechaPrevista: "2026-13-01" }) },
  ]) {
    expectProblem(
      () => registrarOperacionCoordinada(f.db, body, randomUUID(), now),
      422,
      "VALIDATION",
    );
  }
  expect(snapshot(f.db)).toEqual(antes);

  // Hoy (día civil de España) sí es un hecho real: la Transferencia cae en el
  // Ciclo de su propia fecha y el Gasto en el suyo, sin reordenar ni imputar.
  const hoy = registrarOperacionCoordinada(
    f.db,
    {
      gasto: gasto(f, { fecha: "2026-02-05" }),
      transferencia: transferenciaA(f, { fecha: "2026-10-25" }),
    },
    randomUUID(),
    now,
  );
  expect(hoy.gasto.movimiento.fecha).toBe("2026-02-05");
  expect(hoy.gasto.movimiento.ciclo?.id).toBe(f.ciclo2);
  expect(hoy.transferencia!.movimiento.fecha).toBe("2026-10-25");
  // `ciclo_origen` del pendiente es el Ciclo histórico del Gasto (D2).
  const pendiente = registrarOperacionCoordinada(
    f.db,
    {
      gasto: gasto(f, { fecha: "2026-01-20" }),
      pendiente: pendienteA(f, { fechaPrevista: "2026-11-10" }),
    },
    randomUUID(),
    now,
  );
  expect(pendiente.pendiente!.cicloOrigen).toBe(f.ciclo);
  // La fecha prevista es una intención: puede ser futura y no se escribe como hecho.
  expect(pendiente.pendiente!.fechaPrevista).toBe("2026-11-10");
  expect(pendiente.pendiente!.fechaEfectiva).toBeNull();
  expect(pendiente.pendiente!.movimiento).toBeNull();
});

test("SPEC37-I3 D4/AC-26: Gasto real + pendiente (A) no crea liquidez ni ficha", () => {
  const f = fixture();
  const antes = snapshot(f.db);
  const result = registrarOperacionCoordinada(
    f.db,
    { gasto: gasto(f), pendiente: pendienteA(f) },
    randomUUID(),
    now,
  );

  expect(result.modalidad).toBe("A");
  expect(result.transferencia).toBeNull();
  expect(result.anticipo).toBeNull();
  expect(result.pendiente).toMatchObject({
    estado: "Pendiente de realizar",
    origenTipo: "RegistroCoordinado",
    modalidad: "A",
    gasto: result.gasto.movimiento.id,
    gastoRevision: 1,
    importe: "60.00",
    anticipoPrevisto: null,
    movimiento: null,
    fechaEfectiva: null,
  });
  // D4: el Gasto es el único hecho; el pendiente no es liquidez.
  expect(result.gasto.movimiento.importe).toBe("100.00");
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe("900.00");
  expect(getSaldo(f.db, f.habitual).posicion.importe).toBe("500.00");
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(1);
  expect(count(f.db, "SELECT COUNT(*) n FROM fichas_anticipos")).toBe(
    antes.fichas_anticipos.length,
  );
  expect(count(f.db, "SELECT COUNT(*) n FROM transferencia_pendiente")).toBe(1);
  // Sin Movimiento de Transferencia: la financiación pendiente no se inventa.
  expect(
    count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Transferencia'"),
  ).toBe(0);
  expect(snapshot(f.db).referencias.length).toBe(antes.referencias.length);
});

test("SPEC37-I3 AC-06/AC-32: el pendiente en modalidad B conserva la referencia prevista sin crear ficha", () => {
  const f = fixture();
  const antes = snapshot(f.db);
  const result = registrarOperacionCoordinada(
    f.db,
    {
      gasto: gasto(f),
      pendiente: pendienteA(f, {
        modalidad: "B",
        origen: f.adelanta,
        anticipoPrevisto: f.referencia,
      }),
    },
    randomUUID(),
    now,
  );

  expect(result.modalidad).toBe("B");
  expect(result.pendiente).toMatchObject({
    modalidad: "B",
    anticipoPrevisto: f.referencia,
    anticipo: null,
    estado: "Pendiente de realizar",
  });
  // AC-32: sin ficha, Adelantado, Recuperado ni Neto ficticios.
  expect(count(f.db, "SELECT COUNT(*) n FROM fichas_anticipos")).toBe(1);
  expect(snapshot(f.db).fichas_anticipos).toEqual(antes.fichas_anticipos);
  expect(getAnticipo(f.db, f.referencia)).toMatchObject({
    adelantado: "0.00",
    recuperado: "0.00",
    neto: "0.00",
    estado: "Sin operaciones",
  });
  expect(result.transferencia).toBeNull();
});

test("SPEC37-I3: el Gasto debe pagarse desde el Saldo que recibe la Transferencia", () => {
  const f = fixture();
  const antes = snapshot(f.db);
  // Dirección incompatible: el Gasto saldría de un Saldo distinto del destino.
  expectProblem(
    () =>
      registrarOperacionCoordinada(
        f.db,
        {
          gasto: gasto(f, { saldo: f.pago2 }),
          transferencia: transferenciaA(f),
        },
        randomUUID(),
        now,
      ),
    422,
    "VALIDATION",
  );
  // Y el pendiente debe apuntar al Saldo pagador del Gasto ya real.
  expectProblem(
    () =>
      registrarOperacionCoordinada(
        f.db,
        {
          gasto: gasto(f, { saldo: f.pago2 }),
          pendiente: pendienteA(f),
        },
        randomUUID(),
        now,
      ),
    422,
    "VALIDATION",
  );
  // Ni ambas formas ni ninguna: la operación no duplica el alta de un Gasto suelto.
  for (const body of [
    { gasto: gasto(f) },
    { gasto: gasto(f), transferencia: transferenciaA(f), pendiente: pendienteA(f) },
  ]) {
    expectProblem(
      () => registrarOperacionCoordinada(f.db, body, randomUUID(), now),
      422,
      "VALIDATION",
    );
  }
  expect(snapshot(f.db)).toEqual(antes);
});

test("SPEC37-I3 AC-41: la ruta exige sesión, Origin/CSRF y clave de intento", async () => {
  const f = fixture();
  const key = randomBytes(32);
  const password = "Ficticia I3 " + randomUUID();
  const handler = HttpApp.toWebHandler(createApp(f.db, { key, now: () => now }));
  let cookie = "",
    csrf = "";
  const request = async (
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) => {
    const response = await handler(
      new Request(origin + path, {
        method,
        headers: {
          origin,
          "content-type": "application/json",
          cookie,
          "x-csrf-token": csrf,
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie
        .split("; ")
        .filter((value) => value && !value.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = await response.json();
    if (data && typeof data === "object" && typeof data.csrf === "string")
      csrf = data.csrf;
    return { status: response.status, data };
  };
  const body = { gasto: gasto(f), transferencia: transferenciaA(f) };
  const antes = snapshot(f.db);

  // Sin sesión: 401 y sin escritura (AC-41).
  expect(
    (await request("/api/operaciones-coordinadas", "POST", body, {
      "idempotency-key": randomUUID(),
    })).status,
  ).toBe(401);
  expect(snapshot(f.db)).toEqual(antes);

  const bootstrap = provision(f.db, now);
  const enrolled = await request("/api/auth/enroll", "POST", {
    token: bootstrap,
    password,
  });
  await request("/api/auth/mfa", "POST", {
    code: totp(enrolled.data.secret).generate({ timestamp: now }),
  });

  // Origin no confiable: 403 y sin escritura.
  const evil = await request("/api/operaciones-coordinadas", "POST", body, {
    origin: "http://evil.example",
    "idempotency-key": randomUUID(),
  });
  expect(evil.status).toBe(403);
  expect(snapshot(f.db)).toEqual(antes);

  // Sin Origin/CSRF válidos: rechazo y sin escritura.
  const noCsrf = await request("/api/operaciones-coordinadas", "POST", body, {
    "x-csrf-token": "invalido",
    "idempotency-key": randomUUID(),
  });
  expect([401, 403]).toContain(noCsrf.status);
  expect(snapshot(f.db)).toEqual(antes);

  // Sin clave de intento: 422 y sin escritura.
  const noKey = await request("/api/operaciones-coordinadas", "POST", body);
  expect(noKey.status).toBe(422);
  expect(snapshot(f.db)).toEqual(antes);

  // Con sesión, Origin/CSRF y clave: 201 y hechos reales.
  const created = await request("/api/operaciones-coordinadas", "POST", body, {
    "idempotency-key": randomUUID(),
  });
  expect(created.status).toBe(201);
  expect(created.data.gasto.movimiento.tipo).toBe("Gasto");
  expect(created.data.transferencia.movimiento.tipo).toBe("Transferencia");
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(2);
});

test("SPEC37-I3 AC-21/AC-34: la coincidencia exacta exige confirmación y no duplica hechos", () => {
  const f = fixture();
  const body = { gasto: gasto(f), transferencia: transferenciaA(f) };
  const first = registrarOperacionCoordinada(f.db, body, randomUUID(), now);
  const antes = snapshot(f.db);

  // Segundo envío idéntico con otra clave: el control de duplicados de E1.4/E1.5
  // sigue vigente y no se escribe nada sin confirmación explícita.
  expectProblem(
    () => registrarOperacionCoordinada(f.db, body, randomUUID(), now),
    409,
    "DUPLICATE_REVIEW",
  );
  expect(snapshot(f.db)).toEqual(antes);

  // Con confirmación explícita es un segundo hecho real y distinto.
  const second = registrarOperacionCoordinada(
    f.db,
    { ...body, aceptarCoincidencia: true },
    randomUUID(),
    now,
  );
  expect(second.gasto.movimiento.id).not.toBe(first.gasto.movimiento.id);
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Gasto'")).toBe(2);
  expect(
    count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Transferencia'"),
  ).toBe(2);
});

test("SPEC37-I3 AC-40: el reintento del pendiente devuelve la misma resolución sin duplicarlo", () => {
  const f = fixture();
  const key = randomUUID();
  const body = { gasto: gasto(f), pendiente: pendienteA(f) };
  const first = registrarOperacionCoordinada(f.db, body, key, now);
  const despues = snapshot(f.db);

  // Sin la tabla de intentos, el reintento chocaría con `GASTO_YA_GENERADO`
  // del índice único de pendiente activo: el replay devuelve la misma respuesta.
  const replay = registrarOperacionCoordinada(f.db, body, key, now);
  expect(replay).toEqual(first);
  expect(replay.pendiente!.id).toBe(first.pendiente!.id);
  expect(snapshot(f.db)).toEqual(despues);
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(1);
  expect(count(f.db, "SELECT COUNT(*) n FROM transferencia_pendiente")).toBe(1);
});

type ConcurrentChild = {
  exited: Promise<number>;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
};

/** Dos procesos reales con la misma clave: prueba la serialización IMMEDIATE. */
function runConcurrent(input: { path: string; body: string; key: string }) {
  const database = resolve("apps/api/src/database.ts"),
    coordinada = resolve("apps/api/src/registro-coordinado.ts");
  const script = `import{openDatabase}from${JSON.stringify(database)};import{registrarOperacionCoordinada}from${JSON.stringify(coordinada)};const db=openDatabase(process.argv[1]);try{const r=registrarOperacionCoordinada(db,JSON.parse(process.argv[2]),process.argv[3],${now});process.stdout.write(JSON.stringify({ok:true,gasto:r.gasto.movimiento.id,transferencia:r.transferencia.movimiento.id}));}catch(e){process.stdout.write(JSON.stringify({ok:false,code:e?.code??String(e)}));}finally{db.close();}`;
  return Bun.spawn(
    [process.execPath, "-e", script, input.path, input.body, input.key],
    { env: { ...process.env, NODE_ENV: "test" }, stdout: "pipe", stderr: "pipe" },
  ) as unknown as ConcurrentChild;
}

test("SPEC37-I3 AC-21: dos envíos concurrentes de la misma clave dejan un único Gasto y una única Transferencia", async () => {
  const dir = mkdtempSync(join(tmpdir(), "spec37-i3-"));
  const path = join(dir, "concurrente.sqlite");
  try {
    const f = fixture(path);
    const body = JSON.stringify({
      gasto: gasto(f),
      transferencia: transferenciaA(f),
    });
    const key = randomUUID();
    f.db.close();

    const children = [0, 1].map(() => runConcurrent({ path, body, key }));
    const out = await Promise.all(
      children.map(async (child) => {
        expect(await child.exited).toBe(0);
        expect(await new Response(child.stderr).text()).toBe("");
        return JSON.parse(await new Response(child.stdout).text()) as {
          ok: boolean;
          code?: string;
          gasto?: string;
          transferencia?: string;
        };
      }),
    );

    // Un único hecho de cada tipo, aunque haya dos envíos.
    const db = openDatabase(path);
    try {
      expect(count(db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Gasto'")).toBe(1);
      expect(
        count(db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Transferencia'"),
      ).toBe(1);
      expect(
        count(db, "SELECT COUNT(*) n FROM operacion_coordinada_attempts"),
      ).toBe(1);
      const ok = out.filter((r) => r.ok);
      // El ganador crea; el otro reproduce la misma respuesta (serialización
      // IMMEDIATE + intento). Nunca hay dos Gastos ni un éxito parcial.
      expect(ok.length).toBeGreaterThanOrEqual(1);
      expect(new Set(ok.map((r) => r.gasto)).size).toBe(1);
      const gastoId = ok[0].gasto!;
      expect(
        count(db, "SELECT COUNT(*) n FROM movimientos WHERE id=?", gastoId),
      ).toBe(1);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});