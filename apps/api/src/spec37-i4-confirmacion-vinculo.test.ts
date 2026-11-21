import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { createCycle, cycleContext, cycleMaster } from "./ciclos";
import { createClassification } from "./clasificacion";
import { createSaldo, getSaldo } from "./saldos";
import { createReference } from "./referencias";
import { createBudget } from "./presupuestos";
import { getAnticipo } from "./anticipos";
import { getMovement, previewMovement, writeMovement } from "./movimientos";
import { Problem } from "./problem";
import {
  cancelarTransferenciaPendiente,
  candidatosTransferenciaPendiente,
  confirmarTransferenciaPendiente,
  crearTransferenciaPendiente,
  editarTransferenciaPendiente,
  getTransferenciaPendiente,
  listTransferenciasPendientes,
  previewImpactoTransferenciaPendiente,
  vincularTransferenciaPendiente,
} from "./transferencias-pendientes";

/**
 * SPEC37 · I4 — confirmación, vínculo y cancelación del pendiente coordinado.
 *
 * Cubre AC-10, AC-11, AC-12, AC-13, AC-31, AC-33, AC-35, AC-36, AC-37 y AC-42
 * sobre el mecanismo único de SPEC36 §6, sin un segundo motor:
 *
 *  - la confirmación escribe una única Transferencia real con la fecha bancaria;
 *    SPEC38 §7.6 retira el `HISTORY_LOCKED` por ventana cerrada, así que el
 *    cierre del Ciclo original nunca bloquea (D2, AC-42);
 *  - en modalidad B la Referencia prevista se revalida y la Transferencia lleva
 *    la atribución E3.1 del hecho real (D2/D9);
 *  - el vínculo exige coincidencia exacta y admite Referencia solo donde el
 *    origen la exige (D5); el camino Reparto no cambia;
 *  - la cancelación exige motivo y no escribe ningún efecto financiero.
 *
 * Todo ficticio: sin datos reales, sin Excel, sin UI.
 */

const now = Date.parse("2026-10-25T12:00:00Z");
const stamp = "2026-01-01T00:00:00.000Z";

type Fixture = {
  db: Database;
  /** Ciclo 2026-01: es el Ciclo del Gasto y el histórico del pendiente. */
  ciclo: string;
  /** Ciclo 2026-02: ventana abierta posterior para la fecha bancaria real. */
  ciclo2: string;
  /** Saldo que paga el Gasto: exige salida a Exterior. Es el destino. */
  pago: string;
  /** Saldo desde el que se aporta (modalidad A). */
  habitual: string;
  /** Saldo que adelanta los fondos (modalidad B). */
  adelanta: string;
  partida: string;
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
      nombre: "Cuenta pagadora ficticia I4",
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
      nombre: "Cuenta habitual ficticia I4",
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
      nombre: "Cuenta que adelanta ficticia I4",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500",
      fechaApertura: "2026-01-01",
    },
    randomUUID(),
    now,
  ).id;
  createClassification(
    db,
    "categorias",
    {
      nombre: "Categoría ficticia I4",
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
    { nombre: "Subcategoría ficticia I4", padre: categoria },
    randomUUID(),
  ).id;
  const partida = createClassification(
    db,
    "partidas",
    { nombre: "Partida ficticia I4", padre: subcategoria },
    randomUUID(),
  ).id;
  return { db, ciclo, ciclo2, pago, habitual, adelanta, partida };
}

/** Gasto real e íntegro desde el Saldo pagador (E1.4). */
function gasto(f: Fixture, over: Record<string, unknown> = {}) {
  const body = {
    tipo: "Gasto",
    fecha: "2026-01-05",
    importe: "100.00",
    saldo: f.pago,
    partida: f.partida,
    concepto: "Gasto ficticio I4",
    nota: "",
    ...over,
  };
  return realMovement(f, body);
}

/** Movimiento real por el servicio E1.4/E1.5, con su plan y su huella. */
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

/** Transferencia ordinaria real, sin Referencia. */
function transferenciaOrdinaria(
  f: Fixture,
  over: Record<string, unknown> = {},
) {
  return realMovement(f, {
    tipo: "Transferencia",
    fecha: "2026-01-08",
    importe: "60.00",
    origen: f.habitual,
    destino: f.pago,
    concepto: "Transferencia ficticia I4",
    nota: "",
    ...over,
  });
}

/** Transferencia real de Anticipo: Referencia + atribución E3.1.
 *  La atribución declara siempre el par del adelanto; en una devolución el
 *  Movimiento va en sentido inverso (E3.1).
 */
function transferenciaAnticipo(
  f: Fixture,
  referencia: string,
  over: Record<string, unknown> = {},
) {
  const origen = (over.origen as string) ?? f.adelanta;
  const destino = (over.destino as string) ?? f.pago;
  const rol = (over.rol as "Adelanto" | "Devolución") ?? "Adelanto";
  const { rol: _rol, ...rest } = over;
  const par =
    rol === "Adelanto"
      ? { origen, destino }
      : { origen: destino, destino: origen };
  return realMovement(f, {
    tipo: "Transferencia",
    fecha: "2026-01-18",
    importe: "60.00",
    origen,
    destino,
    referencia,
    anticipo: {
      rol,
      ...par,
      evidencia: "Extracto ficticio I4",
      procedencia: "Banco ficticio I4",
    },
    concepto: "Transferencia de Anticipo ficticia I4",
    nota: "",
    ...rest,
  });
}

/** Cuerpo del alta del pendiente coordinado. */
function body(f: Fixture, gastoId: string, over: Record<string, unknown> = {}) {
  return {
    gasto: gastoId,
    modalidad: "A",
    importe: "60.00",
    origen: f.habitual,
    destino: f.pago,
    fechaPrevista: "2026-01-25",
    concepto: "Pendiente coordinado ficticio I4",
    nota: "",
    ...over,
  };
}

function pendiente(f: Fixture, gastoId: string, over: Record<string, unknown> = {}) {
  return crearTransferenciaPendiente(f.db, body(f, gastoId, over), now);
}

function pendienteB(
  f: Fixture,
  gastoId: string,
  referencia: string,
  over: Record<string, unknown> = {},
) {
  return pendiente(f, gastoId, {
    modalidad: "B",
    origen: f.adelanta,
    destino: f.pago,
    anticipoPrevisto: referencia,
    ...over,
  });
}

const atribucion = {
  evidencia: "Extracto ficticio I4",
  procedencia: "Banco ficticio I4",
};

/** Vista previa de impacto + confirmación con la huella vigente. */
function confirmar(
  f: Fixture,
  id: number,
  over: {
    fechaReal: string;
    anticipo?: Record<string, unknown>;
    aceptarCoincidencia?: boolean;
  },
) {
  const item = getTransferenciaPendiente(f.db, id, now).item;
  const preview = {
    fechaReal: over.fechaReal,
    ...(over.anticipo === undefined ? {} : { anticipo: over.anticipo }),
  };
  const impacto = previewImpactoTransferenciaPendiente(f.db, id, preview, now);
  return confirmarTransferenciaPendiente(
    f.db,
    id,
    {
      revision: item.revision,
      fechaReal: over.fechaReal,
      fingerprint: impacto.fingerprint,
      ...(over.anticipo === undefined ? {} : { anticipo: over.anticipo }),
      ...(over.aceptarCoincidencia === undefined
        ? {}
        : { aceptarCoincidencia: over.aceptarCoincidencia }),
    },
    randomUUID(),
    now,
  );
}

function confirmarB(
  f: Fixture,
  id: number,
  fechaReal: string,
  over: Record<string, unknown> = {},
) {
  return confirmar(f, id, { fechaReal, anticipo: atribucion, ...over });
}

function cancelar(f: Fixture, id: number, motivo: unknown) {
  const item = getTransferenciaPendiente(f.db, id, now).item;
  return cancelarTransferenciaPendiente(
    f.db,
    id,
    { revision: item.revision, motivo },
    randomUUID(),
    now,
  );
}

function vincular(f: Fixture, id: number, movimientoId: unknown) {
  const item = getTransferenciaPendiente(f.db, id, now).item;
  return vincularTransferenciaPendiente(
    f.db,
    id,
    { revision: item.revision, movimientoId },
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

/**
 * Hechos financieros y sus auditorías. El pendiente y su auditoría quedan fuera
 * a propósito: son lo único que una resolución puede escribir además del
 * Movimiento real, y así la foto prueba que nada más cambia.
 */
function financialSnapshot(db: Database): Record<string, unknown[]> {
  const tables = [
    "saldos",
    "presupuestos",
    "movimientos",
    "movement_audit",
    "fichas_anticipos",
    "movimiento_anticipo",
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
  const snapshot: Record<string, unknown[]> = Object.fromEntries(
    tables
      .filter((table) => present.has(table))
      .map((table) => [
        table,
        db.query(`SELECT * FROM "${table}" ORDER BY rowid`).all(),
      ]),
  );
  snapshot.audit = db
    .query(
      "SELECT * FROM audit WHERE entidad NOT LIKE 'transferencia-pendiente:%' ORDER BY rowid",
    )
    .all();
  snapshot.referencias = db.query("SELECT * FROM referencias ORDER BY id").all();
  return snapshot;
}

/** Ventana cerrada de E4.9: cierre + foto, como en SPEC27. */
function closeWindow(db: Database, ciclo: string, inicio: string, fin: string) {
  const fingerprint = "a".repeat(64);
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(
        ciclo,version,inicio,fin,saldo_inicial,actor,creado_utc,motivo,
        fingerprint,estado
      ) VALUES(?,1,?,?,0,'usuario-unico',?,NULL,?,'Cerrado')`,
      [ciclo, inicio, fin, stamp, fingerprint],
    );
    db.run(
      `INSERT INTO fotos_cierre(
        ciclo,version,creado_utc,actor,motivo,fingerprint,app_version,
        schema_version,ventana_inicio,ventana_fin,saldo_inicial,
        estado_temporal,estado_hechos,estado_plan,hechos,plan,clasificacion,
        inversion,auxiliares,cobertura,backup,no_disponible
      ) VALUES(?,1,?,'usuario-unico',NULL,?,'test',30,?,?,0,
        'Cerrado','Sin hechos','SinPlan','{}','{}','{}','{}','{}','{}','{}','{}')`,
      [ciclo, stamp, fingerprint, inicio, fin],
    );
  }).immediate();
}

/**
 * Pendiente de modalidad B escrito por SQL: solo así se puede representar el
 * estado en que la Referencia prevista deja de ser válida, porque el alta de I2
 * lo rechaza (AC-11/AC-39).
 */
function pendienteBTamperizado(
  f: Fixture,
  gastoId: string,
  referencia: string,
) {
  const result = f.db.run(
    `INSERT INTO transferencia_pendiente(
      estado,importe,origen,destino,ciclo_origen,fecha_prevista,concepto,nota,
      origen_tipo,gasto,gasto_revision,modalidad,anticipo_previsto,revision,
      creado,actualizado
    ) VALUES('Pendiente de realizar',6000,?,?,?,'2026-01-25',
      'Pendiente ficticio I4','','RegistroCoordinado',?,1,'B',?,1,?,?)`,
    [f.adelanta, f.pago, f.ciclo, gastoId, referencia, stamp, stamp],
  );
  return Number(result.lastInsertRowid);
}

test("SPEC37-I4 AC-35/AC-10: confirmar modalidad A escribe una única Transferencia con la fecha real", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const item = pendiente(f, gastoId);
  const movimientosAntes = count(f.db, "SELECT COUNT(*) n FROM movimientos");

  const confirmado = confirmar(f, item.id, { fechaReal: "2026-01-08" });

  expect(confirmado).toMatchObject({
    id: item.id,
    estado: "Confirmada",
    fechaEfectiva: "2026-01-08",
    modalidad: "A",
    anticipoPrevisto: null,
    anticipo: null,
    requiereRevision: false,
    motivosRevision: [],
  });
  // §8.2: la fecha efectiva es la bancaria, nunca la prevista.
  expect(item.fechaPrevista).toBe("2026-01-25");
  expect(confirmado.movimiento).toMatchObject({
    fecha: "2026-01-08",
    tipo: "Transferencia",
    importe: "60.00",
    origen: f.habitual,
    destino: f.pago,
    referencia: null,
    anulado: false,
  });
  // Una sola Transferencia nueva: no hay hecho sustitutivo ni duplicado.
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(
    movimientosAntes + 1,
  );
  expect(
    count(f.db, "SELECT COUNT(*) n FROM movimientos WHERE tipo='Gasto'"),
  ).toBe(1);
  // §8.4: efectos de los motores vigentes sobre las posiciones reales.
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe("960.00");
  expect(getSaldo(f.db, f.habitual).posicion.importe).toBe("440.00");
  // La alerta desaparece: el pendiente ya no está «Pendiente de realizar».
  expect(
    listTransferenciasPendientes(
      f.db,
      new URLSearchParams("estado=Pendiente de realizar"),
      now,
    ).total,
  ).toBe(0);
  expect(
    getTransferenciaPendiente(f.db, item.id, now).auditoria.map((a) => a.accion),
  ).toEqual(["alta", "confirmacion"]);
});

test("SPEC37-I4 AC-33: la fecha futura rechaza sin escritura y el ciclo cerrado ya escribe", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const item = pendiente(f, gastoId);
  const antes = financialSnapshot(f.db);

  // §8.2: la fecha real no puede ser futura (día civil de España).
  expectProblem(
    () => confirmar(f, item.id, { fechaReal: "2026-10-26" }),
    422,
    "VALIDATION",
  );
  expectProblem(
    () =>
      previewImpactoTransferenciaPendiente(
        f.db,
        item.id,
        { fechaReal: "2026-10-26" },
        now,
      ),
    422,
    "VALIDATION",
  );

  // Las dos tentativas inválidas no escribieron nada.
  expect(financialSnapshot(f.db)).toEqual(antes);

  closeWindow(f.db, f.ciclo, "2026-01-01", "2026-01-31");
  // Sustituye el 409 HISTORY_LOCKED por ventana cerrada de preview y
  // confirmación: SPEC38 §7.6 retira el bloqueo y la corrección es ordinaria.
  const preview = previewImpactoTransferenciaPendiente(
    f.db,
    item.id,
    { fechaReal: "2026-01-15" },
    now,
  );
  expect(preview.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  const confirmado = confirmar(f, item.id, { fechaReal: "2026-01-15" });
  expect(confirmado).toMatchObject({
    estado: "Confirmada",
    fechaEfectiva: "2026-01-15",
  });

  // El pendiente queda confirmado con su fecha real, no bloqueado.
  const conservado = getTransferenciaPendiente(f.db, item.id, now).item;
  expect(conservado.estado).toBe("Confirmada");
  expect(conservado.fechaEfectiva).toBe("2026-01-15");
});

test("SPEC37-I4 AC-42: el Ciclo original cerrado y la fecha real cerrada ya no bloquean", () => {
  const f = fixture();
  // Dos Gastos y dos pendientes antes del cierre: nada se escribe en una
  // ventana cerrada.
  const gasto1 = gasto(f, { fecha: "2026-01-05" });
  const gasto2 = gasto(f, { fecha: "2026-01-06", importe: "40.00" });
  const p1 = pendiente(f, gasto1);
  const p2 = pendiente(f, gasto2, { importe: "40.00" });
  closeWindow(f.db, f.ciclo, "2026-01-01", "2026-01-31");
  const ciclosAntes = cycleMaster(f.db).map(({ id, inicio, fin }) => ({
    id,
    inicio,
    fin,
  }));
  const cierresAntes = f.db
    .query("SELECT * FROM cierres ORDER BY ciclo,version")
    .all();

  // (a) El Ciclo del Gasto está cerrado, la fecha bancaria real no: se confirma
  // sin HISTORY_LOCKED, el Movimiento pertenece al Ciclo de su fecha y
  // `ciclo_origen` no se reimputa (D2/§8.5).
  expect(p1.cicloOrigen).toBe(f.ciclo);
  const confirmado = confirmar(f, p1.id, { fechaReal: "2026-02-10" });
  expect(confirmado.estado).toBe("Confirmada");
  expect(confirmado.cicloOrigen).toBe(f.ciclo);
  expect(confirmado.fechaEfectiva).toBe("2026-02-10");
  expect(confirmado.movimiento).toMatchObject({
    fecha: "2026-02-10",
    importe: "60.00",
  });
  expect(
    getMovement(f.db, confirmado.movimiento!.id).movimiento.ciclo?.id,
  ).toBe(f.ciclo2);
  // Ni el Gasto ni los cierres se reescriben: sin imputación retroactiva.
  expect(getMovement(f.db, gasto1).movimiento.fecha).toBe("2026-01-05");
  expect(
    cycleMaster(f.db).map(({ id, inicio, fin }) => ({ id, inicio, fin })),
  ).toEqual(ciclosAntes);
  expect(f.db.query("SELECT * FROM cierres ORDER BY ciclo,version").all()).toEqual(
    cierresAntes,
  );

  // (b) SPEC38 §7.6 sustituye el 409 HISTORY_LOCKED por fecha en ventana
  // cerrada: la misma clase de pendiente se confirma con su fecha real y el
  // hecho queda en el Ciclo de esa fecha, sin reescribir cierres.
  const confirmado2 = confirmar(f, p2.id, { fechaReal: "2026-01-20" });
  expect(confirmado2).toMatchObject({
    estado: "Confirmada",
    fechaEfectiva: "2026-01-20",
  });
  expect(confirmado2.movimiento).toMatchObject({
    fecha: "2026-01-20",
    importe: "40.00",
  });
  expect(
    getMovement(f.db, confirmado2.movimiento!.id).movimiento.ciclo?.id,
  ).toBe(f.ciclo);
  expect(f.db.query("SELECT * FROM cierres ORDER BY ciclo,version").all()).toEqual(
    cierresAntes,
  );
});

test("SPEC37-I4 AC-10: la Referencia de Anticipo existente se revalida y alimenta E3.1", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const referencia = createReference(
    f.db,
    { nombre: "Anticipo ficticio I4", tipo: "Anticipo" },
    randomUUID(),
    now,
  ).id;
  const item = pendienteB(f, gastoId, referencia);
  const antes = financialSnapshot(f.db);
  expect(getAnticipo(f.db, referencia)).toMatchObject({
    adelantado: "0.00",
    recuperado: "0.00",
    neto: "0.00",
    estado: "Sin operaciones",
  });

  // La atribución E3.1 es del hecho real: sin ella la confirmación no escribe.
  expectProblem(
    () => confirmar(f, item.id, { fechaReal: "2026-01-18" }),
    422,
    "VALIDATION",
  );
  expect(financialSnapshot(f.db)).toEqual(antes);

  const confirmado = confirmarB(f, item.id, "2026-01-18");

  expect(confirmado).toMatchObject({
    estado: "Confirmada",
    modalidad: "B",
    fechaEfectiva: "2026-01-18",
    anticipoPrevisto: referencia,
    // `anticipo` es identidad inmutable del pendiente (SPEC36 §6): la Referencia
    // real vive en el Movimiento confirmado, que es la trazabilidad (§5.4).
    anticipo: null,
  });
  expect(confirmado.movimiento).toMatchObject({
    tipo: "Transferencia",
    fecha: "2026-01-18",
    importe: "60.00",
    origen: f.adelanta,
    destino: f.pago,
    referencia,
  });
  // El motor único de Anticipos refleja el adelanto: una única ficha, sin
  // Referencia nueva ni huérfana.
  const ficha = getAnticipo(f.db, referencia);
  expect(ficha).toMatchObject({
    adelantado: "60.00",
    recuperado: "0.00",
    neto: "60.00",
    estado: "Sin recuperar",
  });
  expect(ficha.operaciones).toHaveLength(1);
  expect(ficha.operaciones[0]).toMatchObject({
    id: confirmado.movimiento!.id,
    origen: f.adelanta,
    destino: f.pago,
    atribucion: {
      rol: "Adelanto",
      origen: f.adelanta,
      destino: f.pago,
      evidencia: atribucion.evidencia,
      procedencia: atribucion.procedencia,
    },
  });
  expect(
    count(f.db, "SELECT COUNT(*) n FROM fichas_anticipos WHERE referencia=?", referencia),
  ).toBe(1);
  expect(
    count(f.db, "SELECT COUNT(*) n FROM referencias"),
  ).toBe(antes.referencias.length);
  // El Gasto no hereda la Referencia del Anticipo (§5.4).
  expect(getMovement(f.db, gastoId).movimiento.referencia).toBeNull();
  expect(getSaldo(f.db, f.adelanta).posicion.importe).toBe("440.00");
  expect(getSaldo(f.db, f.pago).posicion.importe).toBe("960.00");
  // La auditoría no lista `anticipoPrevisto` como campo modificado: su valor no
  // cambia al confirmar —se fijó en el alta y el esquema no permite reescribirlo—.
  const confirmacion = f.db
    .query(
      "SELECT campos FROM audit WHERE entidad=? AND accion='confirmacion'",
    )
    .get(`transferencia-pendiente:${item.id}`) as { campos: string };
  expect(JSON.parse(confirmacion.campos)).toEqual([
    "estado",
    "movimiento",
    "fechaEfectiva",
  ]);
});

test("SPEC37-I4 AC-11: Referencia inexistente, inactiva o de otro tipo bloquean sin sustitución", () => {
  const f = fixture();
  const inexistente = "REF999999";
  const viaje = createReference(
    f.db,
    { nombre: "Viaje ficticio I4", tipo: "Viaje" },
    randomUUID(),
    now,
  ).id;
  const inactiva = createReference(
    f.db,
    { nombre: "Anticipo inactivo ficticio I4", tipo: "Anticipo" },
    randomUUID(),
    now,
  ).id;
  f.db.run(
    "UPDATE referencias SET estado='Inactiva',revision=revision+1,actualizado=? WHERE id=?",
    [stamp, inactiva],
  );

  const casos: [string, string][] = [
    ["inexistente", inexistente],
    ["de tipo Viaje", viaje],
    ["inactiva", inactiva],
  ];
  for (const [caso, referencia] of casos) {
    const gastoId = gasto(f, { fecha: "2026-01-05" });
    const id = pendienteBTamperizado(f, gastoId, referencia);
    const movimientosAntes = count(f.db, "SELECT COUNT(*) n FROM movimientos");
    const referenciasAntes = count(f.db, "SELECT COUNT(*) n FROM referencias");
    const fichasAntes = count(f.db, "SELECT COUNT(*) n FROM fichas_anticipos");

    const revisado = getTransferenciaPendiente(f.db, id, now).item;
    expect(revisado.requiereRevision).toBe(true);
    expect(revisado.motivosRevision).toContain("REFERENCIA_NO_ELEGIBLE");
    // Sin sustitución automática: la Referencia prevista no cambia.
    expect(revisado.anticipoPrevisto).toBe(referencia);
    expect(revisado.anticipo).toBeNull();

    expectProblem(
      () => confirmarB(f, id, "2026-01-18"),
      409,
      "REVIEW_REQUIRED",
    );
    expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(
      movimientosAntes,
    );
    expect(count(f.db, "SELECT COUNT(*) n FROM referencias")).toBe(
      referenciasAntes,
    );
    expect(count(f.db, "SELECT COUNT(*) n FROM fichas_anticipos")).toBe(
      fichasAntes,
    );
    // La salida prevista es cancelar con motivo, no confirmar.
    expect(cancelar(f, id, `Referencia ${caso}: se descarta el pendiente.`)).toMatchObject(
      { estado: "Cancelada" },
    );
  }
});

test("SPEC37-I4 AC-12: una dirección incompatible se rechaza y no se invierte", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const referencia = createReference(
    f.db,
    { nombre: "Anticipo dirección ficticio I4", tipo: "Anticipo" },
    randomUUID(),
    now,
  ).id;
  const item = pendienteB(f, gastoId, referencia);
  const antes = financialSnapshot(f.db);

  // El pendiente registra adelanta → pago. Declarar el par invertido no se
  // reinterpreta: se rechaza (E3.1/§5.1) sin escribir nada.
  expectProblem(
    () =>
      confirmarB(f, item.id, "2026-01-18", {
        anticipo: {
          ...atribucion,
          origen: f.pago,
          destino: f.adelanta,
        },
      }),
    422,
    "DIRECCION_INCOMPATIBLE",
  );
  expect(financialSnapshot(f.db)).toEqual(antes);
  expect(
    getTransferenciaPendiente(f.db, item.id, now).item,
  ).toMatchObject({
    estado: "Pendiente de realizar",
    anticipo: null,
    movimiento: null,
  });

  // El par declarado igual al del pendiente sí se admite: no hay inversión
  // silenciosa, solo coincidencia explícita.
  const confirmado = confirmarB(f, item.id, "2026-01-18", {
    anticipo: { ...atribucion, origen: f.adelanta, destino: f.pago },
  });
  expect(confirmado.estado).toBe("Confirmada");
  expect(confirmado.movimiento).toMatchObject({
    origen: f.adelanta,
    destino: f.pago,
  });
});

test("SPEC37-I4 AC-13: devolución parcial y completa con la misma Referencia", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const referencia = createReference(
    f.db,
    { nombre: "Anticipo devolución ficticio I4", tipo: "Anticipo" },
    randomUUID(),
    now,
  ).id;
  const item = pendienteB(f, gastoId, referencia);
  const confirmado = confirmarB(f, item.id, "2026-01-18");
  expect(getAnticipo(f.db, referencia).neto).toBe("60.00");

  // Devolución parcial: Transferencia inversa con la misma Referencia.
  transferenciaAnticipo(f, referencia, {
    fecha: "2026-01-22",
    importe: "20.00",
    origen: f.pago,
    destino: f.adelanta,
    rol: "Devolución",
  });
  expect(getAnticipo(f.db, referencia)).toMatchObject({
    adelantado: "60.00",
    recuperado: "20.00",
    neto: "40.00",
    estado: "Recuperación parcial",
  });

  // Devolución completa del resto.
  transferenciaAnticipo(f, referencia, {
    fecha: "2026-01-23",
    importe: "40.00",
    origen: f.pago,
    destino: f.adelanta,
    rol: "Devolución",
  });
  const ficha = getAnticipo(f.db, referencia);
  expect(ficha).toMatchObject({
    adelantado: "60.00",
    recuperado: "60.00",
    neto: "0.00",
    estado: "Recuperado",
  });
  expect(ficha.operaciones).toHaveLength(3);
  // Las devoluciones son hechos reales independientes, no una reapertura del
  // pendiente ya resuelto (§9.3).
  expect(
    getTransferenciaPendiente(f.db, item.id, now).item,
  ).toMatchObject({
    estado: "Confirmada",
    revision: confirmado.revision,
  });
});

test("SPEC37-I4 AC-31: vínculo con coincidencia exacta, sin Movimiento nuevo", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const item = pendiente(f, gastoId);
  const candidato = transferenciaOrdinaria(f, { fecha: "2026-01-09" });
  const filaAntes = f.db
    .query("SELECT * FROM movimientos WHERE id=?")
    .get(candidato);

  const items = candidatosTransferenciaPendiente(f.db, item.id).items;
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({
    id: candidato,
    importe: "60.00",
    origen: f.habitual,
    destino: f.pago,
    referencia: null,
  });

  // Rechazos: importe y dirección distintos no se ajustan ni se reinterpretan.
  const otroImporte = transferenciaOrdinaria(f, {
    fecha: "2026-01-10",
    importe: "10.00",
  });
  expectProblem(() => vincular(f, item.id, otroImporte), 422, "VALIDATION");
  const otraDireccion = transferenciaOrdinaria(f, {
    fecha: "2026-01-10",
    origen: f.pago,
    destino: f.habitual,
  });
  expectProblem(() => vincular(f, item.id, otraDireccion), 422, "VALIDATION");
  expect(
    candidatosTransferenciaPendiente(f.db, item.id).items.map((m) => m.id),
  ).toEqual([candidato]);
  expect(
    getTransferenciaPendiente(f.db, item.id, now).item.estado,
  ).toBe("Pendiente de realizar");
  const movimientosAlVincular = count(
    f.db,
    "SELECT COUNT(*) n FROM movimientos",
  );

  const vinculado = vincular(f, item.id, candidato);
  expect(vinculado).toMatchObject({
    estado: "Confirmada",
    fechaEfectiva: "2026-01-09",
    movimiento: { id: candidato },
  });
  // El hecho existente no se duplica ni se modifica.
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(
    movimientosAlVincular,
  );
  expect(f.db.query("SELECT * FROM movimientos WHERE id=?").get(candidato)).toEqual(
    filaAntes,
  );
  // Ya vinculado: no vuelve a resolverse ni admite un segundo Movimiento.
  expectProblem(() => vincular(f, item.id, candidato), 409, "STATE_CONFLICT");
  expect(financialSnapshot(f.db).saldos).toEqual(
    f.db.query("SELECT * FROM saldos ORDER BY rowid").all(),
  );
});

test("SPEC37-I4 AC-31: modalidad B solo vincula la Referencia exacta y el Reparto no admite Referencia", () => {
  const f = fixture();
  const referencia = createReference(
    f.db,
    { nombre: "Anticipo vínculo ficticio I4", tipo: "Anticipo" },
    randomUUID(),
    now,
  ).id;
  const otra = createReference(
    f.db,
    { nombre: "Anticipo vínculo alternativo I4", tipo: "Anticipo" },
    randomUUID(),
    now,
  ).id;
  const gastoB = gasto(f);
  const itemB = pendienteB(f, gastoB, referencia);

  // Una Transferencia ordinaria de la misma dirección e importe no vale para
  // un pendiente que exige Referencia (D5).
  const ordinaria = transferenciaOrdinaria(f, { fecha: "2026-01-09" });
  expectProblem(() => vincular(f, itemB.id, ordinaria), 422, "REFERENCIA_NO_COINCIDE");
  // Con otra Referencia tampoco: coincidencia exacta o nada.
  const conOtra = transferenciaAnticipo(f, otra, { fecha: "2026-01-10" });
  expectProblem(() => vincular(f, itemB.id, conOtra), 422, "REFERENCIA_NO_COINCIDE");
  expect(
    candidatosTransferenciaPendiente(f.db, itemB.id).items,
  ).toHaveLength(0);
  const conLaSuya = transferenciaAnticipo(f, referencia, { fecha: "2026-01-11" });
  expect(
    candidatosTransferenciaPendiente(f.db, itemB.id).items.map((m) => m.id),
  ).toEqual([conLaSuya]);
  const vinculado = vincular(f, itemB.id, conLaSuya);
  expect(vinculado).toMatchObject({
    estado: "Confirmada",
    modalidad: "B",
    anticipoPrevisto: referencia,
    anticipo: null,
    movimiento: { id: conLaSuya, referencia },
  });
  expect(getAnticipo(f.db, referencia).neto).toBe("60.00");

  // No regresión de Reparto: su pendiente conserva el contrato de I1 y rechaza
  // toda Transferencia con Referencia, aunque coincida en dirección e importe.
  const presupuesto = createBudget(
    f.db,
    {
      nombre: "Aportación ficticia I4",
      fuente: "Aportación a saldo",
      destino: f.pago,
    },
    randomUUID(),
    now,
  ).id;
  const reparto = f.db.run(
    "INSERT INTO repartos(id,ciclo,fuente_plan,estado,origen_comun,revision,creado,actualizado) VALUES(1,?,'PlanCiclo','Borrador',?,1,?,?)",
    [f.ciclo2, f.habitual, stamp, stamp],
  );
  expect(reparto.changes).toBe(1);
  const linea = Number(
    f.db.run(
      `INSERT INTO reparto_lineas(
        reparto,clase,presupuesto,origen,destino,importe,fecha_prevista,
        concepto,nota,incluida,motivo_exclusion,revision,creado,actualizado
      ) VALUES(1,'Presupuesto',?,?,?,2500,'2026-02-05','Reparto ficticio I4',
        NULL,1,NULL,1,?,?)`,
      [presupuesto, f.habitual, f.pago, stamp, stamp],
    ).lastInsertRowid,
  );
  f.db.run(
    "UPDATE repartos SET estado='Generado',revision=2,actualizado=? WHERE id=1",
    [stamp],
  );
  const itemReparto = crearTransferenciaPendiente(f.db, { lineaId: linea }, now);
  expect(itemReparto.origenTipo).toBe("Reparto");
  const ordinariaReparto = transferenciaOrdinaria(f, {
    fecha: "2026-02-06",
    importe: "25.00",
  });
  expect(
    candidatosTransferenciaPendiente(f.db, itemReparto.id).items.map((m) => m.id),
  ).toEqual([ordinariaReparto]);
  const conReferencia = transferenciaAnticipo(f, referencia, {
    fecha: "2026-02-06",
    importe: "25.00",
  });
  expectProblem(
    () => vincular(f, itemReparto.id, conReferencia),
    422,
    "REFERENCIA_NO_ADMITIDA",
  );
  expect(vincular(f, itemReparto.id, ordinariaReparto)).toMatchObject({
    estado: "Confirmada",
    origenTipo: "Reparto",
  });
});

test("SPEC37-I4 AC-36: editar antes de ejecutar revalida; el Gasto cambiado exige revisión", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const item = pendiente(f, gastoId);
  const impactoAntes = previewImpactoTransferenciaPendiente(
    f.db,
    item.id,
    { fechaReal: "2026-01-08" },
    now,
  );
  const movimientosAntes = count(f.db, "SELECT COUNT(*) n FROM movimientos");

  // Editar importe y fecha prevista no escribe ningún Movimiento.
  const editado = editarTransferenciaPendiente(
    f.db,
    item.id,
    {
      revision: item.revision,
      importe: "70.00",
      fechaPrevista: "2026-01-22",
    },
    randomUUID(),
    now,
  );
  expect(editado).toMatchObject({
    importe: "70.00",
    fechaPrevista: "2026-01-22",
    estado: "Pendiente de realizar",
    revision: item.revision + 1,
  });
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(
    movimientosAntes,
  );

  // La huella anterior ya no vale: no se confirma con validaciones antiguas.
  expectProblem(
    () =>
      confirmarTransferenciaPendiente(
        f.db,
        item.id,
        {
          revision: editado.revision,
          fechaReal: "2026-01-08",
          fingerprint: impactoAntes.fingerprint,
        },
        randomUUID(),
        now,
      ),
    409,
    "IMPACT_CHANGED",
  );
  // La confirmación usa el importe vigente del pendiente.
  const confirmado = confirmar(f, item.id, { fechaReal: "2026-01-08" });
  expect(confirmado.movimiento).toMatchObject({ importe: "70.00" });

  // Cambio del Gasto entre alta y confirmación: la línea base `gasto_revision`
  // no coincide → «Requiere revisión» y confirmación bloqueada (D6/§9.2).
  const gasto2 = gasto(f, { fecha: "2026-01-07", importe: "40.00" });
  const item2 = pendiente(f, gasto2, { importe: "40.00" });
  const revision = (
    f.db.query("SELECT revision FROM movimientos WHERE id=?").get(gasto2) as {
      revision: number;
    }
  ).revision;
  const patch = {
    tipo: "Gasto",
    fecha: "2026-01-07",
    importe: "45.00",
    saldo: f.pago,
    partida: f.partida,
    concepto: "Gasto ficticio I4 rectificado",
    nota: "",
    revision,
    motivo: "Rectificación ficticia I4",
  };
  const plan = previewMovement(f.db, patch, gasto2, false, now);
  writeMovement(
    f.db,
    {
      ...patch,
      fingerprint: plan.fingerprint,
      contextRevision: plan.contextRevision,
    },
    randomUUID(),
    gasto2,
    false,
    now,
  );
  const revisado = getTransferenciaPendiente(f.db, item2.id, now).item;
  expect(revisado.gastoRevision).toBe(1);
  expect(revisado.requiereRevision).toBe(true);
  expect(revisado.motivosRevision).toContain("GASTO_NO_COINCIDE");
  const antesDelBloqueo = count(f.db, "SELECT COUNT(*) n FROM movimientos");
  expectProblem(
    () => confirmar(f, item2.id, { fechaReal: "2026-01-08" }),
    409,
    "REVIEW_REQUIRED",
  );
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(
    antesDelBloqueo,
  );
  // El vínculo es otra forma de resolver el pendiente: también se bloquea, y no
  // se toca el hecho existente que sí coincide.
  const candidata = transferenciaOrdinaria(f, {
    fecha: "2026-01-09",
    importe: "40.00",
  });
  expectProblem(
    () => vincular(f, item2.id, candidata),
    409,
    "REVIEW_REQUIRED",
  );
  expect(getTransferenciaPendiente(f.db, item2.id, now).item).toMatchObject({
    estado: "Pendiente de realizar",
    movimiento: null,
  });
});

test("SPEC37-I4 AC-37: cancelación motivada con auditoría y sin efecto financiero", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const item = pendiente(f, gastoId);
  const antes = financialSnapshot(f.db);

  // El motivo es obligatorio y no puede ser vacío ni solo espacios.
  expectProblem(() => cancelar(f, item.id, undefined), 422, "VALIDATION");
  expectProblem(() => cancelar(f, item.id, ""), 422, "VALIDATION");
  expectProblem(() => cancelar(f, item.id, "   "), 422, "VALIDATION");
  expectProblem(
    () =>
      cancelarTransferenciaPendiente(
        f.db,
        item.id,
        { revision: 99, motivo: "Revisión obsoleta" },
        randomUUID(),
        now,
      ),
    409,
    "REVISION_CONFLICT",
  );
  expect(financialSnapshot(f.db)).toEqual(antes);

  const motivo = "La Transferencia no se realizó finalmente.";
  const cancelado = cancelar(f, item.id, `  ${motivo}  `);
  expect(cancelado).toMatchObject({
    estado: "Cancelada",
    motivoCancelacion: motivo,
    fechaEfectiva: null,
    movimiento: null,
    revision: item.revision + 1,
  });
  // Sin efecto financiero: ni Movimiento, ni posición, ni ficha.
  expect(financialSnapshot(f.db)).toEqual(antes);
  // Auditoría propia y de sistema, con el motivo.
  const auditoria = getTransferenciaPendiente(f.db, item.id, now).auditoria;
  expect(auditoria.map((a) => a.accion)).toEqual(["alta", "cancelacion"]);
  expect(auditoria.at(-1)!.posterior).toMatchObject({
    motivo,
    motivo_cancelacion: motivo,
  });
  expect(
    f.db
      .query(
        "SELECT motivo FROM audit WHERE entidad=? AND accion='cancelacion'",
      )
      .get(`transferencia-pendiente:${item.id}`),
  ).toEqual({ motivo });
  // La alerta se retira y el pendiente cancelado no se confirma ni se cancela
  // otra vez.
  expect(
    listTransferenciasPendientes(
      f.db,
      new URLSearchParams("estado=Pendiente de realizar"),
      now,
    ).total,
  ).toBe(0);
  expectProblem(
    () => confirmar(f, item.id, { fechaReal: "2026-01-08" }),
    409,
    "STATE_CONFLICT",
  );
  expectProblem(() => cancelar(f, item.id, "Otra"), 409, "STATE_CONFLICT");
});