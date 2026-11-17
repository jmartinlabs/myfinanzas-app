import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createCycle, cycleContext } from "./ciclos";
import { createClassification } from "./clasificacion";
import { createSaldo, getSaldo } from "./saldos";
import { createReference } from "./referencias";
import { getAnticipo } from "./anticipos";
import { previewMovement, writeMovement } from "./movimientos";
import { Problem } from "./problem";
import {
  cancelarTransferenciaPendiente,
  confirmarTransferenciaPendiente,
  crearTransferenciaPendiente,
  editarTransferenciaPendiente,
  getTransferenciaPendiente,
  listTransferenciasPendientes,
  previewImpactoTransferenciaPendiente,
} from "./transferencias-pendientes";

/**
 * SPEC37 · I2 — alta del pendiente `RegistroCoordinado`.
 *
 * Cubre AC-26, AC-29, AC-30, AC-32, AC-39 y AC-43 sobre el mecanismo único de
 * SPEC36 §6. Todo es ficticio: no hay datos reales ni Excel.
 */

const now = Date.parse("2026-10-25T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const stamp = "2026-01-01T00:00:00.000Z";

type Fixture = {
  db: Database;
  ciclo: string;
  /** Saldo que paga el Gasto: exige salida a Exterior. */
  pago: string;
  /** Saldo desde el que se aporta o adelanta. */
  habitual: string;
  partida: string;
  gasto: (over?: Record<string, unknown>) => string;
  ingreso: () => string;
  anticipo: (over?: Record<string, unknown>) => string;
};

function fixture(): Fixture {
  const db = openDatabase(":memory:");
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
  createClassification(
    db,
    "categorias",
    {
      nombre: "Categoría ficticia I2",
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
    { nombre: "Subcategoría ficticia I2", padre: categoria },
    randomUUID(),
  ).id;
  const partida = createClassification(
    db,
    "partidas",
    { nombre: "Partida ficticia I2", padre: subcategoria },
    randomUUID(),
  ).id;
  const pago = createSaldo(
    db,
    {
      nombre: "Cuenta pagadora ficticia I2",
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
      nombre: "Cuenta habitual ficticia I2",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500",
      fechaApertura: "2026-01-01",
    },
    randomUUID(),
    now,
  ).id;
  const save = (body: Record<string, unknown>) => {
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
    ).movimiento.id;
  };
  return {
    db,
    ciclo,
    pago,
    habitual,
    partida,
    gasto: (over = {}) =>
      save({
        tipo: "Gasto",
        fecha: "2026-01-05",
        importe: "100.00",
        saldo: pago,
        partida,
        concepto: "Gasto ficticio I2",
        nota: "",
        ...over,
      }),
    ingreso: () =>
      save({
        tipo: "Ingreso",
        fecha: "2026-01-05",
        importe: "100.00",
        saldo: pago,
        subtipo: "Bonus",
        concepto: "Ingreso ficticio I2",
        nota: "",
      }),
    anticipo: (over = {}) =>
      createReference(
        db,
        {
          nombre: "Anticipo ficticio I2 " + randomUUID(),
          tipo: "Anticipo",
          ...over,
        },
        randomUUID(),
        now,
      ).id,
  };
}

/** Cuerpo del alta coordinada; `modalidad` y la dirección se eligen por caso. */
function body(f: Fixture, gasto: string, over: Record<string, unknown> = {}) {
  return {
    gasto,
    modalidad: "A",
    importe: "60.00",
    origen: f.habitual,
    destino: f.pago,
    fechaPrevista: "2026-01-20",
    concepto: "Pendiente coordinado ficticio",
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
 * Hechos financieros y sus auditorías. El pendiente y su auditoría quedan
 * fuera a propósito: son lo único que el alta puede escribir (AC-26/AC-32).
 */
function financialSnapshot(db: Database) {
  const tables = [
    "saldos",
    "movimientos",
    "movement_audit",
    "fichas_anticipos",
    "movimiento_anticipo",
    "fotos_neto_apertura",
    "anticipo_audit",
    "contadores",
    "counters",
  ];
  const present = new Set(
    (
      db
        .query("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as { name: string }[]
    ).map((row) => row.name),
  );
  const snapshot = Object.fromEntries(
    tables
      .filter((table) => present.has(table))
      .map((table) => [
        table,
        db.query(`SELECT * FROM "${table}" ORDER BY rowid`).all(),
      ]),
  );
  return {
    ...snapshot,
    audit: db
      .query(
        "SELECT * FROM audit WHERE entidad NOT LIKE 'transferencia-pendiente:%' ORDER BY rowid",
      )
      .all(),
    // El alta no reserva identidades de Movimiento ni de Referencia.
    movimientos: db.query("SELECT * FROM movimientos ORDER BY id").all(),
  };
}

function pendingCount(db: Database) {
  return (db.query("SELECT COUNT(*) n FROM transferencia_pendiente").get() as {
    n: number;
  }).n;
}

test("SPEC37-I2 AC-26: el alta coordinada no crea Movimiento, ficha ni liquidez", () => {
  const f = fixture();
  const gasto = f.gasto();
  const before = financialSnapshot(f.db);
  const posicionPago = getSaldo(f.db, f.pago).posicion.importe;

  const item = crearTransferenciaPendiente(f.db, body(f, gasto), now);

  expect(item).toMatchObject({
    estado: "Pendiente de realizar",
    origenTipo: "RegistroCoordinado",
    importe: "60.00",
    modalidad: "A",
    gasto,
    anticipoPrevisto: null,
    anticipo: null,
    movimiento: null,
    fechaEfectiva: null,
    requiereRevision: false,
    motivosRevision: [],
  });
  // D2: el Ciclo del pendiente es el histórico de la fecha real del Gasto.
  expect(item.cicloOrigen).toBe(f.ciclo);
  expect(item.gastoRevision).toBe(1);
  // AC-26: ningún hecho financiero nuevo, ni siquiera la posición del Saldo.
  expect(financialSnapshot(f.db)).toEqual(before);
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe(posicionPago);
  expect(
    (f.db.query("SELECT COUNT(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(before.movimientos.length);
  expect(pendingCount(f.db)).toBe(1);
});

test("SPEC37-I2 AC-32: modalidad B no crea ficha, Adelantado, Recuperado ni Neto", () => {
  const f = fixture();
  const gasto = f.gasto();
  const referencia = f.anticipo();
  const fichasAntes = (
    f.db.query("SELECT COUNT(*) n FROM fichas_anticipos").get() as { n: number }
  ).n;

  const item = crearTransferenciaPendiente(
    f.db,
    body(f, gasto, {
      modalidad: "B",
      // §3.3: en modalidad B el Saldo que adelanta financia al pagador.
      origen: f.habitual,
      destino: f.pago,
      anticipoPrevisto: referencia,
    }),
    now,
  );

  expect(item.modalidad).toBe("B");
  expect(item.anticipoPrevisto).toBe(referencia);
  // La ficha real se escribe al confirmar (D2/I3); aquí no se vincula ninguna.
  expect(item.anticipo).toBeNull();
  expect(item.movimiento).toBeNull();
  expect(
    (f.db.query("SELECT COUNT(*) n FROM fichas_anticipos").get() as { n: number })
      .n,
  ).toBe(fichasAntes);
  expect(
    (
      f.db.query("SELECT COUNT(*) n FROM movimiento_anticipo").get() as {
        n: number;
      }
    ).n,
  ).toBe(0);
  expect(
    (
      f.db.query("SELECT COUNT(*) n FROM fotos_neto_apertura").get() as {
        n: number;
      }
    ).n,
  ).toBe(0);

  // El motor E3.1 no ve ninguna operación: sin Adelantado, Recuperado ni Neto
  // ficticios; la ficha vacía es la de la Referencia, no una nueva del pendiente.
  const ficha = getAnticipo(f.db, referencia);
  expect(ficha.operaciones).toHaveLength(0);
  expect(ficha.pendientesAcreditacion).toHaveLength(0);
  expect(ficha.pendientes).toBe(0);
  expect(ficha.adelantado).toBe("0.00");
  expect(ficha.recuperado).toBe("0.00");
  expect(ficha.neto).toBe("0.00");
});

test("SPEC37-I2 AC-30: Gasto anulado exige revisión y bloquea la confirmación", () => {
  const f = fixture();
  const gasto = f.gasto();
  const item = crearTransferenciaPendiente(f.db, body(f, gasto), now);
  expect(item.requiereRevision).toBe(false);

  // E1.4: anular el Gasto es un hecho real y sube su revisión.
  const row = f.db
    .query("SELECT revision FROM movimientos WHERE id=?")
    .get(gasto) as { revision: number };
  const annul = { revision: row.revision, motivo: "Anulación ficticia I2" };
  const plan = previewMovement(f.db, annul, gasto, true, now);
  writeMovement(
    f.db,
    { ...annul, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    randomUUID(),
    gasto,
    true,
    now,
  );

  const revisado = getTransferenciaPendiente(f.db, item.id, now).item;
  expect(revisado.requiereRevision).toBe(true);
  expect(revisado.motivosRevision).toContain("GASTO_ANULADO");
  // «Requiere revisión» no es un estado (AC-29).
  expect(revisado.estado).toBe("Pendiente de realizar");

  const movimientosAntes = (
    f.db.query("SELECT COUNT(*) n FROM movimientos").get() as { n: number }
  ).n;
  expectProblem(
    () =>
      confirmarTransferenciaPendiente(
        f.db,
        item.id,
        {
          revision: revisado.revision,
          fechaReal: "2026-01-10",
          fingerprint: "a".repeat(64),
        },
        randomUUID(),
        now,
      ),
    409,
    "REVIEW_REQUIRED",
  );
  // Nunca se confirma contra un Gasto anulado: sin Movimiento ni resolución.
  expect(
    (f.db.query("SELECT COUNT(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(movimientosAntes);
  const bloqueado = previewImpactoTransferenciaPendiente(
    f.db,
    item.id,
    { fechaReal: "2026-01-10" },
    now,
  );
  expect(bloqueado.movimiento).toBeNull();
  expect(bloqueado.condiciones.motivos).toContain("GASTO_ANULADO");
});

test("SPEC37-I2 AC-30: Gasto con otra revisión exige revisión y bloquea", () => {
  const f = fixture();
  const gasto = f.gasto();
  const item = crearTransferenciaPendiente(f.db, body(f, gasto), now);
  expect(item.gastoRevision).toBe(1);

  // Rectificación real del Gasto (importe): sube `revision` sin anularlo.
  const revision = (
    f.db.query("SELECT revision FROM movimientos WHERE id=?").get(gasto) as {
      revision: number;
    }
  ).revision;
  const patch = {
    tipo: "Gasto",
    fecha: "2026-01-05",
    importe: "120.00",
    saldo: f.pago,
    partida: f.partida,
    concepto: "Gasto ficticio I2 rectificado",
    nota: "",
    revision,
    motivo: "Rectificación ficticia I2",
  };
  const plan = previewMovement(f.db, patch, gasto, false, now);
  writeMovement(
    f.db,
    { ...patch, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    randomUUID(),
    gasto,
    false,
    now,
  );

  const revisado = getTransferenciaPendiente(f.db, item.id, now).item;
  expect(revisado.requiereRevision).toBe(true);
  expect(revisado.motivosRevision).toContain("GASTO_NO_COINCIDE");
  expect(revisado.motivosRevision).not.toContain("GASTO_ANULADO");
  // La línea base no se reescribe sola: sigue siendo la del alta.
  expect(revisado.gastoRevision).toBe(1);

  const movimientosAntes = (
    f.db.query("SELECT COUNT(*) n FROM movimientos").get() as { n: number }
  ).n;
  expectProblem(
    () =>
      confirmarTransferenciaPendiente(
        f.db,
        item.id,
        {
          revision: revisado.revision,
          fechaReal: "2026-01-10",
          fingerprint: "b".repeat(64),
        },
        randomUUID(),
        now,
      ),
    409,
    "REVIEW_REQUIRED",
  );
  // El bloqueo no escribe: el Gasto rectificado sigue siendo el único hecho.
  expect(
    (f.db.query("SELECT COUNT(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(movimientosAntes);
});

test("SPEC37-I2 AC-39: Referencia no elegible bloquea sin sustitución automática", () => {
  const f = fixture();
  const gasto = f.gasto();
  const referencia = f.anticipo();
  const item = crearTransferenciaPendiente(
    f.db,
    body(f, gasto, {
      modalidad: "B",
      anticipoPrevisto: referencia,
    }),
    now,
  );
  expect(item.requiereRevision).toBe(false);

  f.db.run(
    "UPDATE referencias SET estado='Inactiva',revision=revision+1,actualizado=? WHERE id=?",
    [stamp, referencia],
  );

  const revisado = getTransferenciaPendiente(f.db, item.id, now).item;
  expect(revisado.requiereRevision).toBe(true);
  expect(revisado.motivosRevision).toContain("REFERENCIA_NO_ELEGIBLE");
  // Sin sustitución automática: la Referencia prevista es la misma y no hay ficha.
  expect(revisado.anticipoPrevisto).toBe(referencia);
  expect(revisado.anticipo).toBeNull();
  expect(pendingCount(f.db)).toBe(1);

  expectProblem(
    () =>
      confirmarTransferenciaPendiente(
        f.db,
        item.id,
        {
          revision: revisado.revision,
          fechaReal: "2026-01-10",
          fingerprint: "c".repeat(64),
        },
        randomUUID(),
        now,
      ),
    409,
    "REVIEW_REQUIRED",
  );
  // Editar importe o cancelar con motivo siguen siendo las salidas (AC-39).
  const editado = editarTransferenciaPendiente(
    f.db,
    item.id,
    { revision: revisado.revision, importe: "70.00" },
    randomUUID(),
    now,
  );
  expect(editado.importe).toBe("70.00");
  expect(editado.anticipoPrevisto).toBe(referencia);
  const cancelado = cancelarTransferenciaPendiente(
    f.db,
    item.id,
    { revision: editado.revision, motivo: "La Referencia dejó de ser elegible." },
    randomUUID(),
    now,
  );
  expect(cancelado.estado).toBe("Cancelada");
});

test("SPEC37-I2 AC-43: la modalidad es inmutable en el servicio y en el trigger", () => {
  const f = fixture();
  const gasto = f.gasto();
  const item = crearTransferenciaPendiente(f.db, body(f, gasto), now);

  // Servicio: rechazo con motivo y sin escritura parcial.
  expectProblem(
    () =>
      editarTransferenciaPendiente(
        f.db,
        item.id,
        { revision: 1, modalidad: "B", importe: "90.00" },
        randomUUID(),
        now,
      ),
    422,
    "MODALIDAD_INMUTABLE",
  );
  const intacto = getTransferenciaPendiente(f.db, item.id, now).item;
  expect(intacto.revision).toBe(1);
  expect(intacto.modalidad).toBe("A");
  expect(intacto.importe).toBe("60.00");
  expect(intacto.origen?.id).toBe(f.habitual);
  expect(intacto.anticipoPrevisto).toBeNull();

  // Y aunque se intente saltar el servicio, el trigger de v30 lo aborta.
  expect(() =>
    f.db.run("UPDATE transferencia_pendiente SET modalidad='B' WHERE id=?", [
      item.id,
    ]),
  ).toThrow(/modalidad inmutable/i);
  expect(() =>
    f.db.run("UPDATE transferencia_pendiente SET modalidad=NULL WHERE id=?", [
      item.id,
    ]),
  ).toThrow();
  expect(
    (f.db.query("SELECT modalidad m FROM transferencia_pendiente WHERE id=?").get(
      item.id,
    ) as { m: string }).m,
  ).toBe("A");

  // La vía válida: cancelar con motivo y crear otro pendiente con su auditoría.
  const cancelado = cancelarTransferenciaPendiente(
    f.db,
    item.id,
    { revision: intacto.revision, motivo: "Cambio de modalidad decidido." },
    randomUUID(),
    now,
  );
  const nuevo = crearTransferenciaPendiente(
    f.db,
    body(f, gasto, { modalidad: "B", anticipoPrevisto: f.anticipo() }),
    now,
  );
  expect(cancelado.estado).toBe("Cancelada");
  expect(cancelado.modalidad).toBe("A");
  expect(nuevo.estado).toBe("Pendiente de realizar");
  expect(nuevo.modalidad).toBe("B");
  expect(nuevo.id).not.toBe(item.id);
  const auditoria = getTransferenciaPendiente(f.db, item.id, now).auditoria;
  expect(auditoria.map((a) => a.accion)).toEqual(["alta", "cancelacion"]);
});

test("SPEC37-I2 AC-29: tres estados y «Requiere revisión» como condición", () => {
  const f = fixture();
  const gasto = f.gasto();
  const item = crearTransferenciaPendiente(f.db, body(f, gasto), now);

  // Un cuarto estado no existe: ni en el filtro ni en la columna.
  expectProblem(
    () =>
      listTransferenciasPendientes(
        f.db,
        new URLSearchParams("estado=Requiere revisión"),
        now,
      ),
    422,
    "VALIDATION",
  );
  expect(() =>
    f.db.run("UPDATE transferencia_pendiente SET estado='Requiere revisión' WHERE id=?", [
      item.id,
    ]),
  ).toThrow();

  // Se anula el Gasto: el pendiente sigue en su estado y gana la condición.
  const row = f.db
    .query("SELECT revision FROM movimientos WHERE id=?")
    .get(gasto) as { revision: number };
  const annul = { revision: row.revision, motivo: "Anulación ficticia I2" };
  const plan = previewMovement(f.db, annul, gasto, true, now);
  writeMovement(
    f.db,
    { ...annul, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    randomUUID(),
    gasto,
    true,
    now,
  );

  const todos = listTransferenciasPendientes(f.db, new URLSearchParams(), now);
  expect(todos.items).toHaveLength(1);
  expect(todos.items[0]).toMatchObject({
    estado: "Pendiente de realizar",
    requiereRevision: true,
  });
  const conRevision = listTransferenciasPendientes(
    f.db,
    new URLSearchParams("requiereRevision=true"),
    now,
  );
  const sinRevision = listTransferenciasPendientes(
    f.db,
    new URLSearchParams("requiereRevision=false"),
    now,
  );
  expect(conRevision.total).toBe(1);
  expect(sinRevision.total).toBe(0);
  // Una sola pieza: la lista es la de SPEC36 §6, no un segundo mecanismo.
  expect(conRevision.items[0].id).toBe(item.id);
});

test("SPEC37-I2 validaciones del alta coordinada", () => {
  const f = fixture();
  const gasto = f.gasto();
  const ingreso = f.ingreso();
  const anulado = f.gasto({ fecha: "2026-01-06" });
  const row = f.db
    .query("SELECT revision FROM movimientos WHERE id=?")
    .get(anulado) as { revision: number };
  const annul = { revision: row.revision, motivo: "Anulación ficticia I2" };
  const plan = previewMovement(f.db, annul, anulado, true, now);
  writeMovement(
    f.db,
    { ...annul, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    randomUUID(),
    anulado,
    true,
    now,
  );
  const referencia = f.anticipo();
  const viaje = createReference(
    f.db,
    { nombre: "Viaje ficticio I2", tipo: "Viaje" },
    randomUUID(),
    now,
  ).id;
  const inactiva = f.anticipo();
  f.db.run(
    "UPDATE referencias SET estado='Inactiva',revision=revision+1,actualizado=? WHERE id=?",
    [stamp, inactiva],
  );

  const rechazos: [string, Record<string, unknown>, number, string][] = [
    ["Gasto inexistente", body(f, "999999"), 404, "NOT_FOUND"],
    [
      "Gasto de tipo Ingreso",
      body(f, ingreso),
      422,
      "GASTO_NO_DISPONIBLE",
    ],
    ["Gasto anulado", body(f, anulado), 422, "GASTO_ANULADO"],
    [
      "importe con tres decimales",
      body(f, gasto, { importe: "12.345" }),
      422,
      "VALIDATION",
    ],
    ["importe cero", body(f, gasto, { importe: "0.00" }), 422, "VALIDATION"],
    ["importe negativo", body(f, gasto, { importe: "-5.00" }), 422, "VALIDATION"],
    [
      "importe no exacto en céntimos",
      body(f, gasto, { importe: 6000 }),
      422,
      "VALIDATION",
    ],
    ["modalidad inválida", body(f, gasto, { modalidad: "C" }), 422, "VALIDATION"],
    [
      "modalidad ausente",
      body(f, gasto, { modalidad: undefined }),
      422,
      "VALIDATION",
    ],
    [
      "modalidad A con Referencia",
      body(f, gasto, { anticipoPrevisto: referencia }),
      422,
      "REFERENCIA_NO_ADMITIDA",
    ],
    [
      "modalidad B sin Referencia",
      body(f, gasto, { modalidad: "B" }),
      422,
      "VALIDATION",
    ],
    [
      "Referencia con formato inválido",
      body(f, gasto, { modalidad: "B", anticipoPrevisto: "REF-A" }),
      422,
      "VALIDATION",
    ],
    [
      "Referencia prevista inexistente",
      body(f, gasto, { modalidad: "B", anticipoPrevisto: "REF999999" }),
      422,
      "REFERENCIA_NO_ELEGIBLE",
    ],
    [
      "Referencia de Viaje en modalidad B",
      body(f, gasto, { modalidad: "B", anticipoPrevisto: viaje }),
      422,
      "REFERENCIA_NO_ELEGIBLE",
    ],
    [
      "Referencia inactiva",
      body(f, gasto, { modalidad: "B", anticipoPrevisto: inactiva }),
      422,
      "REFERENCIA_NO_ELEGIBLE",
    ],
    [
      "origen y destino iguales",
      body(f, gasto, { origen: f.pago }),
      422,
      "VALIDATION",
    ],
    [
      "Saldo no elegible",
      body(f, gasto, { origen: "S000" }),
      422,
      "SALDO_NO_ELEGIBLE",
    ],
    [
      "campo no editable",
      body(f, gasto, { origenTipo: "Reparto" }),
      422,
      "VALIDATION",
    ],
    [
      "fecha prevista inválida",
      body(f, gasto, { fechaPrevista: "20/01/2026" }),
      422,
      "VALIDATION",
    ],
  ];
  for (const [caso, payload, status, code] of rechazos) {
    expectProblem(
      () => crearTransferenciaPendiente(f.db, payload as Record<string, unknown>, now),
      status,
      code,
    );
  }
  expect(pendingCount(f.db)).toBe(0);

  // Un Gasto fuera de todo Ciclo no se puede registrar (la columna es NOT NULL).
  const fuera = f.gasto({ fecha: "2025-12-15" });
  expectProblem(
    () => crearTransferenciaPendiente(f.db, body(f, fuera), now),
    409,
    "CICLO_NO_DISPONIBLE",
  );
  expect(pendingCount(f.db)).toBe(0);

  // Segundo pendiente activo del mismo Gasto: error de dominio, no constraint.
  crearTransferenciaPendiente(f.db, body(f, gasto), now);
  expectProblem(
    () => crearTransferenciaPendiente(f.db, body(f, gasto, { importe: "70.00" }), now),
    409,
    "GASTO_YA_GENERADO",
  );
  expect(pendingCount(f.db)).toBe(1);
});

test("SPEC37-I2 HTTP: alta idempotente del pendiente coordinado", async () => {
  const f = fixture();
  const gasto = f.gasto();
  const key = randomBytes(32),
    password = "Ficticia " + randomUUID(),
    handler = HttpApp.toWebHandler(createApp(f.db, { key, now: () => now }));
  let cookie = "",
    csrf = "";
  function absorb(response: Response) {
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie
        .split("; ")
        .filter((value) => value && !value.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
  }
  async function request(
    path: string,
    method = "GET",
    payload?: unknown,
    headers: Record<string, string> = {},
  ) {
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
        body: payload === undefined ? undefined : JSON.stringify(payload),
      }),
    );
    absorb(response);
    const data = await response.json();
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data, headers: response.headers };
  }
  const bootstrap = provision(f.db, now);
  const enrolled = await request("/api/auth/enroll", "POST", {
    token: bootstrap,
    password,
  });
  await request("/api/auth/mfa", "POST", {
    code: totp(enrolled.data.secret).generate({ timestamp: now }),
  });

  const payload = body(f, gasto);
  const created = await request("/api/transferencias-pendientes", "POST", payload, {
    "idempotency-key": randomUUID(),
  });
  expect(created.status).toBe(201);
  expect(created.headers.get("location")).toBe(
    `/api/transferencias-pendientes/${created.data.item.id}`,
  );
  expect(created.data.item).toMatchObject({
    origenTipo: "RegistroCoordinado",
    estado: "Pendiente de realizar",
    modalidad: "A",
    gasto,
    cicloOrigen: f.ciclo,
  });

  // Otro Gasto para probar la idempotencia sin chocar con la unicidad por Gasto.
  const otro = f.gasto({ fecha: "2026-01-07", importe: "40.00" });
  const segundo = body(f, otro, { importe: "40.00" });
  const idempotent = randomUUID();
  const first = await request("/api/transferencias-pendientes", "POST", segundo, {
    "idempotency-key": idempotent,
  });
  const retry = await request("/api/transferencias-pendientes", "POST", segundo, {
    "idempotency-key": idempotent,
  });
  expect(first.status).toBe(201);
  expect(retry.status).toBe(201);
  expect(retry.data.item.id).toBe(first.data.item.id);

  const conflict = await request(
    "/api/transferencias-pendientes",
    "POST",
    { ...segundo, importe: "41.00" },
    { "idempotency-key": idempotent },
  );
  expect(conflict.status).toBe(409);
  expect(conflict.data.code).toBe("IDEMPOTENCY_CONFLICT");

  const duplicate = await request(
    "/api/transferencias-pendientes",
    "POST",
    segundo,
    { "idempotency-key": randomUUID() },
  );
  expect(duplicate.status).toBe(409);
  expect(duplicate.data.code).toBe("GASTO_YA_GENERADO");

  const listed = await request("/api/transferencias-pendientes");
  expect(listed.status).toBe(200);
  expect(listed.data.total).toBe(2);
  expect(listed.data.items[0].origenTipo).toBe("RegistroCoordinado");
});