import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { prepareSchema } from "./database-schema";
import { contract, manifest, verifyContract } from "./schema-contract";
import { createCycle, cycleContext } from "./ciclos";
import { createClassification } from "./clasificacion";
import { createSaldo } from "./saldos";
import { createReference } from "./referencias";
import { getAnticipo } from "./anticipos";
import { previewMovement, writeMovement } from "./movimientos";
import { Problem } from "./problem";
import {
  candidatosTransferenciaPendiente,
  confirmarTransferenciaPendiente,
  crearTransferenciaPendiente,
  editarTransferenciaPendiente,
  getTransferenciaPendiente,
  previewImpactoTransferenciaPendiente,
  vincularTransferenciaPendiente,
} from "./transferencias-pendientes";

/**
 * SPEC37 · I4.5 — gate `G-v31`: intención de Referencia de Anticipo.
 *
 * El pendiente coordinado conserva la **intención** de Referencia (§5.3, D2)
 * sin crear ningún hecho: al guardar no hay `referencias`, `fichas_anticipos`,
 * `movimiento_anticipo` ni contador consumido (AC-26/AC-32). La Referencia real,
 * su ficha y el Movimiento nacen juntos al confirmar, reutilizando
 * `createAnticipoInTransaction` dentro de la misma transacción (D2).
 *
 * La identidad de una Referencia es su **ID**: una intención cuyo nombre coincide
 * con una Referencia existente no reutiliza, no renombra y no bloquea; se crea
 * una Referencia nueva y la preexistente queda intacta.
 *
 * Todo ficticio: sin datos reales, sin Excel, sin UI.
 */

const now = Date.parse("2026-10-25T12:00:00Z");
const stamp = "2026-01-01T00:00:00.000Z";
const c30 = "C30-SPEC37-COORDINADO-0E1F34D";
const c32 = "C32-SPEC38-VALIDACION-CIERRE";
const root = () => mkdtempSync(join(tmpdir(), ".tmp-spec37-i45-"));

type Fixture = {
  db: Database;
  ciclo: string;
  pago: string;
  habitual: string;
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
  const pago = createSaldo(
    db,
    {
      nombre: "Cuenta pagadora ficticia I4.5",
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
      nombre: "Cuenta habitual ficticia I4.5",
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
      nombre: "Cuenta que adelanta ficticia I4.5",
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
      nombre: "Categoría ficticia I4.5",
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
    { nombre: "Subcategoría ficticia I4.5", padre: categoria },
    randomUUID(),
  ).id;
  const partida = createClassification(
    db,
    "partidas",
    { nombre: "Partida ficticia I4.5", padre: subcategoria },
    randomUUID(),
  ).id;
  return { db, ciclo, pago, habitual, adelanta, partida };
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

/** Gasto real e íntegro desde el Saldo pagador (E1.4). */
function gasto(f: Fixture, over: Record<string, unknown> = {}) {
  return realMovement(f, {
    tipo: "Gasto",
    fecha: "2026-01-05",
    importe: "100.00",
    saldo: f.pago,
    partida: f.partida,
    concepto: "Gasto ficticio I4.5",
    nota: "",
    ...over,
  });
}

/** Cuerpo del alta del pendiente coordinado. */
function body(f: Fixture, gastoId: string, over: Record<string, unknown> = {}) {
  return {
    gasto: gastoId,
    modalidad: "B",
    importe: "60.00",
    origen: f.adelanta,
    destino: f.pago,
    fechaPrevista: "2026-01-25",
    concepto: "Pendiente coordinado ficticio I4.5",
    nota: "",
    ...over,
  };
}

const intencion = {
  anticipoNombre: "Anticipo ficticio I4.5",
  anticipoApertura: "2026-01-02",
  anticipoEvidencia: "Extracto ficticio de apertura I4.5",
};

const atribucion = {
  evidencia: "Extracto ficticio I4.5",
  procedencia: "Banco ficticio I4.5",
};

function pendiente(f: Fixture, gastoId: string, over: Record<string, unknown> = {}) {
  return crearTransferenciaPendiente(f.db, body(f, gastoId, over), now);
}

/** Vista previa de impacto + confirmación con la huella vigente. */
function confirmar(
  f: Fixture,
  id: number,
  over: { fechaReal: string; anticipo?: Record<string, unknown> },
  guard?: Parameters<typeof confirmarTransferenciaPendiente>[5],
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
    },
    randomUUID(),
    now,
    guard,
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
 * a propósito: son lo único que un alta o una confirmación puede escribir
 * además del Movimiento real.
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

/* ------------------------------------------------------------------ */
/* v30 → v31: migración aditiva                                        */
/* ------------------------------------------------------------------ */

function cycle(db: Database) {
  db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,0,?)", [
    "1",
    "2026-01-01",
    stamp,
  ]);
}

function classification(db: Database) {
  db.run(
    `INSERT INTO categorias VALUES('CAT0001','Ficticia',NULL,'Gasto','Gasto',0,'Activa',1,?,?)`,
    [stamp, stamp],
  );
  db.run(
    `INSERT INTO subcategorias VALUES('SUB0001','Ficticia','CAT0001','Activa',1,?,?)`,
    [stamp, stamp],
  );
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR0001','Ficticia','SUB0001','Activa',1,?,?)`,
    [stamp, stamp],
  );
}

function gastoReal(db: Database) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,
       concepto,nota,anulado,revision,creado,actualizado)
     VALUES('1','2026-01-04','Gasto',1000,'S001','S000',NULL,'PAR0001','Gasto ficticio','',0,1,?,?)`,
    [stamp, stamp],
  );
}

/** Pendiente de modalidad B con Referencia prevista existente: válido en v30 y v31. */
function pendienteV30(db: Database) {
  db.run(
    `INSERT INTO transferencia_pendiente(estado,importe,origen,destino,ciclo_origen,
       fecha_prevista,fecha_efectiva,concepto,nota,origen_tipo,reparto_linea,gasto,
       anticipo,movimiento,motivo_cancelacion,anticipo_previsto,gasto_revision,
       modalidad,revision,creado,actualizado)
     VALUES('Pendiente de realizar',6000,'S001','S002','1','2026-01-25',NULL,
       'Pendiente ficticio','','RegistroCoordinado',NULL,'1',NULL,NULL,NULL,'REF001',1,'B',1,?,?)`,
    [stamp, stamp],
  );
  return (db.query("SELECT last_insert_rowid() AS id").get() as { id: number }).id;
}

/**
 * Reconstruye una base v30 genuina desde la vigente retirando exactamente lo que
 * añade I4.5: primero los triggers, después las columnas que sus `CHECK`
 * referencian. Se verifica contra C30, que es el criterio del proyecto para
 * afirmar que la base anterior es genuina y no una imitación.
 */
function revertToV30(db: Database) {
  db.exec(`
    DROP TABLE validacion_attempts;
    DROP TABLE cierre_validacion_audit;
    DROP TABLE cierre_validacion;
    DROP TRIGGER transferencia_pendiente_intencion_forma_insert;
    DROP TRIGGER transferencia_pendiente_intencion_forma_update;
    DROP TRIGGER transferencia_pendiente_intencion_datos_insert;
    DROP TRIGGER transferencia_pendiente_intencion_datos_update;
    ALTER TABLE transferencia_pendiente DROP COLUMN anticipo_evidencia;
    ALTER TABLE transferencia_pendiente DROP COLUMN anticipo_apertura;
    ALTER TABLE transferencia_pendiente DROP COLUMN anticipo_nombre;
    UPDATE schema_version SET version=30;`);
  expect(verifyContract(db, 30)).toBe(c30);
}

test("SPEC37-I4.5 G-v32: v30 → v32 es aditiva y conserva filas e identidad", () => {
  const dir = root();
  try {
    const path = join(dir, "v30.sqlite");
    const seeded = (() => {
      const db = openDatabase(path);
      try {
        cycle(db);
        classification(db);
        gastoReal(db);
        const pendienteId = pendienteV30(db);
        revertToV30(db);
        return {
          pendienteId,
          pendientes: db
            .query(
              `SELECT id,estado,importe,revision,origen_tipo,modalidad,anticipo_previsto
                 FROM transferencia_pendiente ORDER BY id`,
            )
            .all(),
          movimientos: db
            .query("SELECT id,tipo,importe,referencia FROM movimientos ORDER BY id")
            .all(),
          identity: db.query("SELECT * FROM database_origin").all(),
        };
      } finally {
        db.close();
      }
    })();

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 32,
      });
      expect(verifyContract(db, 32)).toBe(c32);
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);

      // Aditividad: ningún objeto de C30 desaparece y el único que cambia de
      // forma es la tabla extendida (`ALTER TABLE … ADD COLUMN` reescribe su SQL).
      const current = new Map(manifest(db).map((o) => [`${o.type}:${o.name}`, o]));
      const changed = contract(c30)
        .objects.filter((object) => {
          const now = current.get(`${object.type}:${object.name}`);
          return JSON.stringify(now) !== JSON.stringify(object);
        })
        .map((object) => `${object.type}:${object.name}`);
      expect(changed).toEqual(["table:transferencia_pendiente"]);
      for (const object of contract(c30).objects)
        expect(current.has(`${object.type}:${object.name}`)).toBe(true);

      // Sólo v31 añade estos objetos.
      for (const name of [
        "transferencia_pendiente_intencion_forma_insert",
        "transferencia_pendiente_intencion_forma_update",
        "transferencia_pendiente_intencion_datos_insert",
        "transferencia_pendiente_intencion_datos_update",
      ])
        expect(
          db
            .query("SELECT name FROM sqlite_master WHERE type='trigger' AND name=?")
            .get(name),
        ).toEqual({ name });

      // Las filas previas sobreviven y la intención nace vacía en ellas.
      expect(
        db
          .query(
            `SELECT id,estado,importe,revision,origen_tipo,modalidad,anticipo_previsto
               FROM transferencia_pendiente ORDER BY id`,
          )
          .all(),
      ).toEqual(seeded.pendientes);
      expect(
        db
          .query(
            `SELECT anticipo_nombre,anticipo_apertura,anticipo_evidencia
               FROM transferencia_pendiente WHERE id=?`,
          )
          .get(seeded.pendienteId),
      ).toEqual({
        anticipo_nombre: null,
        anticipo_apertura: null,
        anticipo_evidencia: null,
      });
      expect(
        db.query("SELECT id,tipo,importe,referencia FROM movimientos ORDER BY id").all(),
      ).toEqual(seeded.movimientos);
      expect(db.query("SELECT * FROM database_origin").all()).toEqual(
        seeded.identity,
      );
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SPEC37-I4.5 G-v32: el preflight rechaza pendientes v30 incoherentes sin escribir nada", () => {
  const dir = root();
  try {
    const path = join(dir, "v30-incoherente.sqlite");
    const db = openDatabase(path);
    try {
      cycle(db);
      classification(db);
      gastoReal(db);
      revertToV30(db);
      // Estado que v30 admitía y v31 ya no: modalidad B sin ninguna de las dos
      // formas de Referencia prevista (el trigger de v30 solo exigía modalidad,
      // y por eso el alta directa por SQL lo dejaba pasar).
      db.run(
        `INSERT INTO transferencia_pendiente(estado,importe,origen,destino,
           ciclo_origen,fecha_prevista,fecha_efectiva,concepto,nota,origen_tipo,
           reparto_linea,gasto,anticipo,movimiento,motivo_cancelacion,revision,
           creado,actualizado,modalidad)
         VALUES('Pendiente de realizar',1000,'S001','S002','1','2026-01-05',NULL,
           'Ficticio','','RegistroCoordinado',NULL,'1',NULL,NULL,NULL,1,?,?,'B')`,
        [stamp, stamp],
      );
    } finally {
      db.close();
    }

    // La migración real aborta antes de tocar el esquema y no cambia la versión.
    expect(() => openDatabase(path)).toThrow(
      "Migración v31 rechazada: hay pendientes coordinados con una forma de Referencia prevista incoherente.",
    );
    const check = new Database(path);
    try {
      expect(check.query("SELECT version FROM schema_version").get()).toEqual({
        version: 30,
      });
      const columnas = (
        check.query("PRAGMA table_info(transferencia_pendiente)").all() as {
          name: string;
        }[]
      ).map((c) => c.name);
      expect(columnas).not.toContain("anticipo_nombre");
    } finally {
      check.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SPEC37-I4.5 G-v32: una base v30 genuina migra y sigue confirmando su Referencia prevista", () => {
  const dir = root();
  try {
    const path = join(dir, "v30.sqlite");
    const db = openDatabase(path);
    let pendienteId = 0;
    try {
      cycle(db);
      classification(db);
      gastoReal(db);
      pendienteId = pendienteV30(db);
      revertToV30(db);
    } finally {
      db.close();
    }
    const migrated = openDatabase(path);
    try {
      expect(verifyContract(migrated, 32)).toBe(c32);
      // El trigger de v30 sigue vigente y la columna nueva no lo altera.
      expect(() =>
        migrated.run(
          "UPDATE transferencia_pendiente SET modalidad='A' WHERE id=?",
          [pendienteId],
        ),
      ).toThrow("modalidad inmutable");
      // La forma XOR de v31 acepta la REF prevista heredada y rechaza las dos.
      expect(() =>
        migrated.run(
          "UPDATE transferencia_pendiente SET anticipo_nombre='Intención tardía' WHERE id=?",
          [pendienteId],
        ),
      ).toThrow("forma de Referencia prevista incoherente");
    } finally {
      migrated.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ------------------------------------------------------------------ */
/* Alta: la intención no crea hechos                                   */
/* ------------------------------------------------------------------ */

test("SPEC37-I4.5 AC-26/AC-32: guardar la intención no crea Referencia, ficha, atribución ni contador", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const antes = financialSnapshot(f.db);
  const contadorAntes = (f.db
    .query("SELECT next FROM counters WHERE name='referencias'")
    .get() as { next: number }).next;

  const item = pendiente(f, gastoId, intencion);

  expect(item).toMatchObject({
    modalidad: "B",
    anticipoPrevisto: null,
    anticipo: null,
    anticipoIntencion: {
      nombre: intencion.anticipoNombre,
      apertura: intencion.anticipoApertura,
      evidencia: intencion.anticipoEvidencia,
    },
    requiereRevision: false,
    motivosRevision: [],
    estado: "Pendiente de realizar",
  });
  // AC-26/AC-32: ningún hecho, ninguna ficha, ninguna atribución, ningún ID.
  expect(financialSnapshot(f.db)).toEqual(antes);
  expect(
    count(f.db, "SELECT COUNT(*) n FROM referencias WHERE nombre=?", intencion.anticipoNombre),
  ).toBe(0);
  expect(
    count(f.db, "SELECT COUNT(*) n FROM fichas_anticipos"),
  ).toBe(0);
  expect(
    count(f.db, "SELECT COUNT(*) n FROM movimiento_anticipo"),
  ).toBe(0);
  expect(
    (f.db.query("SELECT next FROM counters WHERE name='referencias'").get() as {
      next: number;
    }).next,
  ).toBe(contadorAntes);
  // La intención queda auditada y no admite edición: es la forma del pendiente.
  expect(
    getTransferenciaPendiente(f.db, item.id, now).auditoria.map((a) => a.accion),
  ).toEqual(["alta"]);
  expectProblem(
    () =>
      editarTransferenciaPendiente(
        f.db,
        item.id,
        { revision: item.revision, anticipoNombre: "Otro nombre" },
        randomUUID(),
        now,
      ),
    422,
    "VALIDATION",
  );
});

test("SPEC37-I4.5 §5.3: la intención admite nombre solo y con apertura+evidencia", () => {
  const f = fixture();
  const soloNombre = pendiente(f, gasto(f), {
    anticipoNombre: "Anticipo sin apertura ficticio I4.5",
  });
  expect(soloNombre.anticipoIntencion).toEqual({
    nombre: "Anticipo sin apertura ficticio I4.5",
    apertura: null,
    evidencia: null,
  });
  // Un segundo Gasto: un único pendiente activo por Gasto (D6).
  const conApertura = pendiente(f, gasto(f, { importe: "50.00" }), intencion);
  expect(conApertura.anticipoIntencion).toEqual({
    nombre: intencion.anticipoNombre,
    apertura: intencion.anticipoApertura,
    evidencia: intencion.anticipoEvidencia,
  });
});

/* ------------------------------------------------------------------ */
/* XOR y coherencia apertura/evidencia                                 */
/* ------------------------------------------------------------------ */

test("SPEC37-I4.5 §5.3: los cuatro rechazos del alta (XOR y coherencia)", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const referencia = createReference(
    f.db,
    { nombre: "Anticipo existente ficticio I4.5", tipo: "Anticipo" },
    randomUUID(),
    now,
  ).id;

  const rechazos: [string, Record<string, unknown>, number, string][] = [
    [
      "B con Referencia existente e intención",
      body(f, gastoId, { anticipoPrevisto: referencia, ...intencion }),
      422,
      "VALIDATION",
    ],
    [
      "B sin Referencia y sin intención",
      body(f, gastoId, { anticipoPrevisto: null }),
      422,
      "VALIDATION",
    ],
    [
      "evidencia sin apertura",
      body(f, gastoId, {
        anticipoNombre: "Anticipo incoherente ficticio I4.5",
        anticipoEvidencia: "Evidencia sin apertura",
      }),
      422,
      "VALIDATION",
    ],
    [
      "modalidad A con intención",
      body(f, gastoId, { modalidad: "A", ...intencion }),
      422,
      "REFERENCIA_NO_ADMITIDA",
    ],
  ];
  for (const [caso, payload, status, code] of rechazos) {
    try {
      crearTransferenciaPendiente(f.db, payload, now);
      throw new Error(`Se esperaba rechazo: ${caso}`);
    } catch (error) {
      expect(error).toBeInstanceOf(Problem);
      expect((error as Problem).status).toBe(status);
      expect((error as Problem).code).toBe(code);
    }
  }
  // Ningún rechazo escribió nada: ni pendiente ni hecho.
  expect(count(f.db, "SELECT COUNT(*) n FROM transferencia_pendiente")).toBe(0);
  expect(count(f.db, "SELECT COUNT(*) n FROM fichas_anticipos")).toBe(1);
  expect(count(f.db, "SELECT COUNT(*) n FROM movimientos")).toBe(1);
});

test("SPEC37-I4.5 §5.3: el esquema impone el XOR y la coherencia también por SQL directo", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const insert = (
    modalidad: string | null,
    extra: { nombre?: string | null; apertura?: string | null; evidencia?: string | null; previsto?: string | null } = {},
  ) =>
    f.db.run(
      `INSERT INTO transferencia_pendiente(
        estado,importe,origen,destino,ciclo_origen,fecha_prevista,concepto,nota,
        origen_tipo,gasto,gasto_revision,modalidad,anticipo_previsto,
        anticipo_nombre,anticipo_apertura,anticipo_evidencia,revision,creado,actualizado
      ) VALUES('Pendiente de realizar',6000,?,?,?,'2026-01-25','Pendiente ficticio','',
        'RegistroCoordinado',?,1,?,?,?,?,?,1,?,?)`,
      [
        f.adelanta,
        f.pago,
        f.ciclo,
        gastoId,
        modalidad,
        extra.previsto ?? null,
        extra.nombre ?? null,
        extra.apertura ?? null,
        extra.evidencia ?? null,
        stamp,
        stamp,
      ],
    );

  // B con las dos formas de Referencia prevista.
  expect(() =>
    insert("B", { previsto: "REF001", nombre: "Intención ficticia I4.5" }),
  ).toThrow("forma de Referencia prevista incoherente");
  // B sin ninguna de las dos.
  expect(() => insert("B")).toThrow("forma de Referencia prevista incoherente");
  // A con intención.
  expect(() => insert("A", { nombre: "Intención ficticia I4.5" })).toThrow(
    "forma de Referencia prevista incoherente",
  );
  // Evidencia sin apertura y apertura sin nombre.
  expect(() =>
    insert("B", { nombre: "Intención ficticia I4.5", evidencia: "Sin apertura" }),
  ).toThrow("datos de intencion incoherentes");
  expect(() =>
    insert("B", { apertura: "2026-01-02", evidencia: "Apertura sin nombre" }),
  ).toThrow("datos de intencion incoherentes");
  // Reparto no admite la intención: conserva su contrato de v29/v30.
  expect(() =>
    f.db.run(
      `INSERT INTO transferencia_pendiente(
        estado,importe,origen,destino,ciclo_origen,fecha_prevista,concepto,nota,
        origen_tipo,reparto_linea,anticipo_nombre,revision,creado,actualizado
      ) VALUES('Pendiente de realizar',6000,'S001','S002','1','2026-01-25','Ficticio','',
        'Reparto',NULL,'Intención ficticia I4.5',1,?,?)`,
      [stamp, stamp],
    ),
  ).toThrow("forma de Referencia prevista incoherente");
  // Una forma sola sigue siendo válida por SQL: el trigger no prohíbe la B. Se
  // libera el Gasto entre altas válidas porque el índice único parcial de v30
  // admite un solo pendiente activo por Gasto (D6).
  const liberar = () =>
    f.db.run(
      `UPDATE transferencia_pendiente SET estado='Cancelada',motivo_cancelacion='prueba',
         revision=revision+1 WHERE estado='Pendiente de realizar'`,
    );
  expect(() => insert("B", { nombre: "Intención ficticia I4.5" })).not.toThrow();
  liberar();
  expect(() =>
    insert("B", {
      nombre: "Intención con apertura ficticia I4.5",
      apertura: "2026-01-02",
      evidencia: "Evidencia de apertura",
    }),
  ).not.toThrow();
  liberar();
  // El CHECK de columna rechaza formatos imposibles de la intención.
  expect(() => insert("B", { nombre: "   " })).toThrow();
  expect(() =>
    insert("B", {
      nombre: "Intención con apertura inválida I4.5",
      apertura: "02/01/2026",
      evidencia: "Evidencia de apertura",
    }),
  ).toThrow();
  expect(() =>
    insert("B", {
      nombre: "Intención con evidencia vacía I4.5",
      apertura: "2026-01-02",
      evidencia: "  ",
    }),
  ).toThrow();
});

/* ------------------------------------------------------------------ */
/* Confirmación: Referencia, ficha y Movimiento en una transacción      */
/* ------------------------------------------------------------------ */

test("SPEC37-I4.5 D2: confirmar con intención crea Referencia, ficha y Movimiento juntos", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const item = pendiente(f, gastoId, intencion);
  const contadorAntes = (f.db
    .query("SELECT next FROM counters WHERE name='referencias'")
    .get() as { next: number }).next;

  const confirmado = confirmar(f, item.id, {
    fechaReal: "2026-01-08",
    anticipo: atribucion,
  });

  const referencia = f.db
    .query("SELECT id,nombre,tipo,estado FROM referencias WHERE nombre=?")
    .get(intencion.anticipoNombre) as {
    id: string;
    nombre: string;
    tipo: string;
    estado: string;
  };
  expect(referencia).toMatchObject({
    nombre: intencion.anticipoNombre,
    tipo: "Anticipo",
    estado: "Activa",
  });
  // La identidad la asigna el sistema, una sola vez.
  expect(
    (f.db.query("SELECT next FROM counters WHERE name='referencias'").get() as {
      next: number;
    }).next,
  ).toBe(contadorAntes + 1);
  // La ficha nace con los datos mínimos de la intención, no vacía.
  const anticipo = getAnticipo(f.db, referencia.id);
  expect(anticipo.ficha).toMatchObject({
    referencia: referencia.id,
    apertura: intencion.anticipoApertura,
    evidencia: intencion.anticipoEvidencia,
  });
  expect(confirmado).toMatchObject({
    estado: "Confirmada",
    fechaEfectiva: "2026-01-08",
    modalidad: "B",
    // El pendiente conserva la intención; la Referencia real vive en el hecho.
    anticipoPrevisto: null,
    anticipoIntencion: {
      nombre: intencion.anticipoNombre,
      apertura: intencion.anticipoApertura,
      evidencia: intencion.anticipoEvidencia,
    },
    requiereRevision: false,
  });
  const movimiento = f.db
    .query(
      "SELECT id,tipo,fecha,importe,origen,destino,referencia FROM movimientos WHERE id=?",
    )
    .get(confirmado.movimiento!.id);
  expect(movimiento).toEqual({
    id: confirmado.movimiento!.id,
    tipo: "Transferencia",
    fecha: "2026-01-08",
    importe: 6000,
    origen: f.adelanta,
    destino: f.pago,
    referencia: referencia.id,
  });
  // La atribución E3.1 del hecho real se escribe con el Movimiento.
  expect(
    f.db
      .query(
        "SELECT referencia,rol,origen,destino,evidencia,procedencia FROM movimiento_anticipo WHERE movimiento=?",
      )
      .get((movimiento as { id: string }).id),
  ).toEqual({
    referencia: referencia.id,
    rol: "Adelanto",
    origen: f.adelanta,
    destino: f.pago,
    evidencia: atribucion.evidencia,
    procedencia: atribucion.procedencia,
  });
  expect(
    getTransferenciaPendiente(f.db, item.id, now).auditoria.map((a) => a.accion),
  ).toEqual(["alta", "confirmacion"]);
});

test("SPEC37-I4.5 D2: un fallo al escribir el Movimiento revierte Referencia, ficha e intentos", () => {
  const f = fixture();
  const gastoId = gasto(f);
  const item = pendiente(f, gastoId, intencion);
  const antes = financialSnapshot(f.db);
  const pendienteAntes = f.db
    .query("SELECT * FROM transferencia_pendiente WHERE id=?")
    .get(item.id);
  const attemptsAntes = count(
    f.db,
    "SELECT COUNT(*) n FROM transferencia_pendiente_attempts",
  );
  const referenceAttemptsAntes = count(
    f.db,
    "SELECT COUNT(*) n FROM reference_attempts",
  );

  // El guardia de cierre simula el fallo en la escritura: se bloquea sólo cuando
  // la ficha ya existe, es decir después de crear la Referencia dentro de la
  // transacción de confirmación.
  const guard = () => ({
    blocked:
      count(f.db, "SELECT COUNT(*) n FROM fichas_anticipos") >
      (antes.fichas_anticipos as unknown[]).length,
    reason: "Rollback forzado I4.5",
  });
  expectProblem(
    () =>
      confirmar(
        f,
        item.id,
        { fechaReal: "2026-01-08", anticipo: atribucion },
        guard,
      ),
    409,
    "HISTORY_LOCKED",
  );

  // Nada sobrevive: ni Referencia, ni ficha, ni Movimiento, ni atribución, ni
  // contador, ni intento de la operación.
  expect(financialSnapshot(f.db)).toEqual(antes);
  expect(
    count(
      f.db,
      "SELECT COUNT(*) n FROM referencias WHERE nombre=?",
      intencion.anticipoNombre,
    ),
  ).toBe(0);
  expect(count(f.db, "SELECT COUNT(*) n FROM reference_attempts")).toBe(
    referenceAttemptsAntes,
  );
  expect(
    f.db.query("SELECT * FROM transferencia_pendiente WHERE id=?").get(item.id),
  ).toEqual(pendienteAntes);
  expect(
    count(f.db, "SELECT COUNT(*) n FROM transferencia_pendiente_attempts"),
  ).toBe(attemptsAntes);
  expect(
    getTransferenciaPendiente(f.db, item.id, now).auditoria.map((a) => a.accion),
  ).toEqual(["alta"]);
});

/* ------------------------------------------------------------------ */
/* AC-39: el nombre no es identidad                                    */
/* ------------------------------------------------------------------ */

test("SPEC37-I4.5 AC-39: un nombre repetido no bloquea ni reutiliza; crea una Referencia nueva", () => {
  const f = fixture();
  const gastoId = gasto(f);
  // Referencia preexistente con el mismo nombre que la intención.
  const existente = createReference(
    f.db,
    { nombre: intencion.anticipoNombre, tipo: "Anticipo" },
    randomUUID(),
    now,
  ).id;
  const existenteAntes = f.db
    .query("SELECT * FROM referencias WHERE id=?")
    .get(existente);
  const fichaExistenteAntes = f.db
    .query("SELECT * FROM fichas_anticipos WHERE referencia=?")
    .get(existente);

  const item = pendiente(f, gastoId, intencion);
  expect(item.requiereRevision).toBe(false);

  const confirmado = confirmar(f, item.id, {
    fechaReal: "2026-01-08",
    anticipo: atribucion,
  });
  expect(confirmado.estado).toBe("Confirmada");

  const mismas = f.db
    .query("SELECT id FROM referencias WHERE nombre=? ORDER BY id")
    .all(intencion.anticipoNombre) as { id: string }[];
  expect(mismas).toHaveLength(2);
  const nueva = mismas.map((r) => r.id).filter((id) => id !== existente);
  expect(nueva).toHaveLength(1);
  expect(nueva[0]).not.toBe(existente);
  // La preexistente queda intacta: misma fila, misma ficha, sin hechos nuevos.
  expect(f.db.query("SELECT * FROM referencias WHERE id=?").get(existente)).toEqual(
    existenteAntes,
  );
  expect(
    f.db.query("SELECT * FROM fichas_anticipos WHERE referencia=?").get(existente),
  ).toEqual(fichaExistenteAntes);
  expect(
    count(
      f.db,
      "SELECT COUNT(*) n FROM movimiento_anticipo WHERE referencia=?",
      existente,
    ),
  ).toBe(0);
  // La Transferencia real usa la Referencia nueva, no la homónima.
  expect(
    (
      f.db
        .query("SELECT referencia FROM movimientos WHERE id=?")
        .get(confirmado.movimiento!.id) as { referencia: string }
    ).referencia,
  ).toBe(nueva[0]);
  expect(getAnticipo(f.db, nueva[0]).ficha).toMatchObject({
    apertura: intencion.anticipoApertura,
    evidencia: intencion.anticipoEvidencia,
  });
});
test("SPEC37-I4.5 §9.1: con intención no hay candidatos ni vínculo posible", () => {
  const f = fixture();
  const gastoId = gasto(f);
  // Transferencia real ordinaria, sin Referencia, con la dirección e importe
  // exactos del pendiente: antes de I4.5 habría sido un candidato.
  const ordinaria = realMovement(f, {
    tipo: "Transferencia",
    fecha: "2026-01-08",
    importe: "60.00",
    origen: f.adelanta,
    destino: f.pago,
    concepto: "Transferencia ordinaria ficticia I4.5",
    nota: "",
  });
  const item = pendiente(f, gastoId, intencion);

  // La Referencia prevista no existe: no se ofrece ningún vínculo por nombre.
  expect(candidatosTransferenciaPendiente(f.db, item.id)).toEqual({
    items: [],
  });
  try {
    vincularTransferenciaPendiente(
      f.db,
      item.id,
      { revision: getTransferenciaPendiente(f.db, item.id, now).item.revision, movimientoId: ordinaria },
      randomUUID(),
      now,
    );
    throw new Error("Se esperaba un rechazo.");
  } catch (error) {
    expect(error).toBeInstanceOf(Problem);
    expect((error as Problem).status).toBe(422);
    expect((error as Problem).code).toBe("REFERENCIA_NO_COINCIDE");
  }
  // La Transferencia ordinaria sigue sin vínculo y el pendiente intacto.
  expect(
    count(
      f.db,
      "SELECT COUNT(*) n FROM transferencia_pendiente WHERE movimiento=?",
      ordinaria,
    ),
  ).toBe(0);
  expect(getTransferenciaPendiente(f.db, item.id, now).item.estado).toBe(
    "Pendiente de realizar",
  );
  // La salida sigue siendo confirmar: crea su propia Referencia.
  const confirmado = confirmar(f, item.id, {
    fechaReal: "2026-01-09",
    anticipo: atribucion,
  });
  expect(confirmado.estado).toBe("Confirmada");
  expect(confirmado.movimiento!.id).not.toBe(ordinaria);
});
