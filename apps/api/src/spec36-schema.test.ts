import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { openDatabase } from "./database";
import { prepareSchema } from "./database-schema";
import { backup, restore } from "./backup";
import {
  contract,
  contracts,
  manifest,
  verifyAdmittedContract,
  verifyContract,
} from "./schema-contract";
import { repartoMensualSchemaV28, repartoMensualSchemaV29 } from "./spec36-schema";
import { materializeContract } from "../test-support/inversiones-schema";

process.env.NODE_ENV = "test";

const t = "2026-01-01T00:00:00.000Z";
const t2 = "2026-01-02T00:00:00.000Z";
const t3 = "2026-01-03T00:00:00.000Z";
const c27 = "C27-E411-FOTOS-PERIODO";
const c28 = "C28-REPARTO-PENDIENTE-6A31C23";
const c29 = "C29-REPARTO-ORIGEN-86DED4B";
const root = () => mkdtempSync(join(tmpdir(), ".tmp-spec36-"));
const fp = "a".repeat(64);

function store() {
  const db = new Database(":memory:", { strict: true });
  prepareSchema(db, { origin: "demo", key_hash: null });
  return db;
}

function cycle(db: Database, id = "1", inicio = "2026-01-01") {
  db.run(
    "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,0,?)",
    [id, inicio, t],
  );
}

function budget(
  db: Database,
  id = "PRE0001",
  destino = "S002",
  estado = "Activo",
) {
  db.run(
    `INSERT INTO presupuestos(id,nombre,fuente,destino,estado,revision,creado,actualizado)
     VALUES(?,'Presupuesto ficticio','Aportación a saldo',?,?,1,?,?)`,
    [id, destino, estado, t, t],
  );
}

type RepartoOptions = Partial<{
  ciclo: string;
  fuente_plan: string;
  estado: string;
  origen_comun: string | null;
  revision: number;
}>;

function reparto(db: Database, options: RepartoOptions = {}): number {
  const row = {
    ciclo: "1",
    fuente_plan: "PlanCiclo",
    estado: "Borrador",
    origen_comun: "S001",
    revision: 1,
    ...options,
  };
  db.run(
    `INSERT INTO repartos(ciclo,fuente_plan,estado,origen_comun,revision,creado,actualizado)
     VALUES(?,?,?,?,?,?,?)`,
    [row.ciclo, row.fuente_plan, row.estado, row.origen_comun, row.revision, t, t],
  );
  return (
    db.query("SELECT last_insert_rowid() AS id").get() as { id: number }
  ).id;
}

type LineOptions = Partial<{
  reparto: number;
  clase: string;
  presupuesto: string | null;
  partida: string | null;
  origen: string | null;
  destino: string | null;
  importe: number | null;
  fecha_prevista: string;
  concepto: string | null;
  nota: string | null;
  incluida: number;
  motivo_exclusion: string | null;
  revision: number;
}>;

function line(db: Database, options: LineOptions = {}): number {
  const row = {
    reparto: 1,
    clase: "Presupuesto",
    presupuesto: "PRE0001",
    partida: null,
    origen: "S001",
    destino: "S002",
    importe: 10000,
    fecha_prevista: "2026-01-05",
    concepto: "Ficticio",
    nota: "",
    incluida: 1,
    motivo_exclusion: null,
    revision: 1,
    ...options,
  };
  db.run(
    `INSERT INTO reparto_lineas(reparto,clase,presupuesto,partida,origen,destino,importe,
       fecha_prevista,concepto,nota,incluida,motivo_exclusion,revision,creado,actualizado)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.reparto,
      row.clase,
      row.presupuesto,
      row.partida,
      row.origen,
      row.destino,
      row.importe,
      row.fecha_prevista,
      row.concepto,
      row.nota,
      row.incluida,
      row.motivo_exclusion,
      row.revision,
      t,
      t,
    ],
  );
  return (
    db.query("SELECT last_insert_rowid() AS id").get() as { id: number }
  ).id;
}

function generate(db: Database, repartoId = 1) {
  db.run(
    "UPDATE repartos SET estado='Generado',revision=revision+1,actualizado=? WHERE id=?",
    [t2, repartoId],
  );
}

type PendingOptions = Partial<{
  estado: string;
  importe: number;
  origen: string;
  destino: string;
  ciclo_origen: string;
  fecha_prevista: string;
  fecha_efectiva: string | null;
  concepto: string;
  nota: string;
  origen_tipo: string;
  reparto_linea: number | null;
  gasto: string | null;
  anticipo: string | null;
  movimiento: string | null;
  motivo_cancelacion: string | null;
  revision: number;
}>;

function pending(db: Database, options: PendingOptions = {}): number {
  const row = {
    estado: "Pendiente de realizar",
    importe: 10000,
    origen: "S001",
    destino: "S002",
    ciclo_origen: "1",
    fecha_prevista: "2026-01-05",
    fecha_efectiva: null,
    concepto: "Ficticio",
    nota: "",
    origen_tipo: "Reparto",
    reparto_linea: 1,
    gasto: null,
    anticipo: null,
    movimiento: null,
    motivo_cancelacion: null,
    revision: 1,
    ...options,
  };
  db.run(
    `INSERT INTO transferencia_pendiente(estado,importe,origen,destino,
       ciclo_origen,fecha_prevista,fecha_efectiva,concepto,nota,origen_tipo,
       reparto_linea,gasto,anticipo,movimiento,motivo_cancelacion,revision,creado,actualizado)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.estado,
      row.importe,
      row.origen,
      row.destino,
      row.ciclo_origen,
      row.fecha_prevista,
      row.fecha_efectiva,
      row.concepto,
      row.nota,
      row.origen_tipo,
      row.reparto_linea,
      row.gasto,
      row.anticipo,
      row.movimiento,
      row.motivo_cancelacion,
      row.revision,
      t,
      t,
    ],
  );
  return (
    db.query("SELECT last_insert_rowid() AS id").get() as { id: number }
  ).id;
}

function transfer(
  db: Database,
  id = "1",
  overrides: Partial<{
    fecha: string;
    importe: number;
    origen: string;
    destino: string;
    anulado: number;
  }> = {},
) {
  const row = {
    fecha: "2026-01-06",
    importe: 10000,
    origen: "S001",
    destino: "S002",
    anulado: 0,
    ...overrides,
  };
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,concepto,nota,
       anulado,revision,creado,actualizado)
     VALUES(?,?,'Transferencia',?,?,?,?,?,?,1,?,?)`,
    [
      id,
      row.fecha,
      row.importe,
      row.origen,
      row.destino,
      "Transferencia ficticia",
      "",
      row.anulado,
      t,
      t,
    ],
  );
}

function repartoAudit(
  db: Database,
  repartoId: number,
  revision: number,
  accion = "alta",
  anterior: string | null = null,
) {
  db.run(
    `INSERT INTO reparto_audit(reparto,revision,accion,anterior,posterior,instante,actor)
     VALUES(?,?,?,?,'{}',?,'usuario-ficticio')`,
    [repartoId, revision, accion, anterior, t],
  );
}

function pendingAudit(
  db: Database,
  pendiente: number,
  revision: number,
  accion = "alta",
  anterior: string | null = null,
) {
  db.run(
    `INSERT INTO transferencia_pendiente_audit(pendiente,revision,accion,anterior,posterior,instante,actor)
     VALUES(?,?,?,?,'{}',?,'usuario-ficticio')`,
    [pendiente, revision, accion, anterior, t],
  );
}

function v27(path: string) {
  materializeContract(path, c27, (db) => {
    const insertSaldo = db.prepare(
      `INSERT INTO saldos VALUES(?,?,?,?,'Activa',NULL,0,0,0,NULL,NULL,NULL,NULL,1,?,?)`,
    );
    const time = "2026-01-01T00:00:00Z";
    for (const [id, nombre, tipo, control] of [
      ["S001", "Cuenta ficticia", "Efectivo", "Movimientos"],
      ["S002", "Destino ficticio", "Efectivo", "Movimientos"],
      ["S003", "Terminal ficticio", "Efectivo", "Terminal"],
    ])
      insertSaldo.run(id, nombre, tipo, control, time, time);
    insertSaldo.finalize();
    db.run(
      "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2026-01-01',0,?)",
      [time],
    );
    db.run(
      `INSERT INTO presupuestos(id,nombre,fuente,destino,estado,revision,creado,actualizado)
       VALUES('PRE0001','Presupuesto histórico','Aportación a saldo','S002','Activo',1,?,?)`,
      [time, time],
    );
    db.run(
      `INSERT INTO fotos_periodo(tipo,ejercicio,trimestre,inicio,fin,version,
         creado_utc,actor,motivo,fingerprint,app_version,schema_version,
         regla_composicion,seleccion_aplicada,cobertura,valores,no_disponible)
       VALUES('Trimestre',2026,1,'2026-01-01','2026-03-31','A1',?,
         'usuario-ficticio',NULL,?,'0.0.0-fixture',27,'P1-C/P4-A/P5-B',
         '{}','{}','{}','{}')`,
      [t, fp],
    );
    db.run("INSERT INTO periodo_attempts VALUES('clave','hash','{}',1)");
    db.run(
      `INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo)
       VALUES('saldo','alta',1,'{}','2026-01-01T00:00:00Z',0,'usuario-ficticio',NULL)`,
    );
  });
}

function v28WithData(path: string) {
  materializeContract(path, c28, (db) => {
    const time = t;
    const time2 = t2;
    const time3 = t3;
    const insertSaldo = db.prepare(
      `INSERT INTO saldos VALUES(?,?,?,?,'Activa',NULL,0,0,0,NULL,NULL,NULL,NULL,1,?,?)`,
    );
    for (const [id, nombre, tipo, control] of [
      ["S001", "Cuenta ficticia", "Efectivo", "Movimientos"],
      ["S002", "Destino ficticio", "Efectivo", "Movimientos"],
      ["S003", "Terminal ficticio", "Efectivo", "Terminal"],
    ])
      insertSaldo.run(id, nombre, tipo, control, time, time);
    insertSaldo.finalize();
    for (const id of ["1", "2", "3"])
      db.run(
        "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,0,?)",
        [id, `2026-0${id}-01`, time],      );
    db.run(
      `INSERT INTO presupuestos(id,nombre,fuente,destino,estado,revision,creado,actualizado)
       VALUES('PRE0001','Presupuesto histórico','Aportación a saldo','S002','Activo',1,?,?)`,
      [time, time],
    );

    function header(id: number, ciclo: string): void {
      db.run(
        `INSERT INTO repartos(id,ciclo,estado,origen_comun,revision,creado,actualizado)
         VALUES(?,?,'Borrador','S001',1,?,?)`,
        [id, ciclo, time, time],
      );
      db.run(
        `INSERT INTO reparto_audit(reparto,revision,accion,anterior,posterior,instante,actor)
         VALUES(?,1,'alta',NULL,'{}',?,'usuario-ficticio')`,
        [id, time],
      );
    }
    function line(
      id: number,
      reparto: number,
      importe: number,
      fecha = "2026-01-05",
    ): void {
      db.run(
        `INSERT INTO reparto_lineas(id,reparto,clase,presupuesto,origen,destino,
           importe,fecha_prevista,concepto,nota,incluida,motivo_exclusion,
           revision,creado,actualizado)
         VALUES(?,?,'Presupuesto','PRE0001','S001','S002',?,?,'Ficticia','',1,NULL,1,?,?)`,
        [id, reparto, importe, fecha, time, time],
      );
    }
    function generate(reparto: number): void {
      db.run(
        "UPDATE repartos SET estado='Generado',revision=2,actualizado=? WHERE id=?",
        [time2, reparto],
      );
      db.run(
        `INSERT INTO reparto_audit(reparto,revision,accion,anterior,posterior,instante,actor)
         VALUES(?,2,'generacion','{}','{}',?,'usuario-ficticio')`,
        [reparto, time2],
      );
    }
    function pending(
      id: number,
      linea: number,
      ciclo: string,
      importe: number,
      fecha = "2026-01-05",
    ): void {
      db.run(
        `INSERT INTO transferencia_pendiente(id,estado,importe,origen,destino,
           ciclo_origen,fecha_prevista,fecha_efectiva,concepto,nota,origen_tipo,
           reparto_linea,gasto,anticipo,movimiento,motivo_cancelacion,revision,
           creado,actualizado)
         VALUES(?,'Pendiente de realizar',?,'S001','S002',?,?,NULL,
           'Ficticio','','Reparto',?,NULL,NULL,NULL,NULL,1,?,?)`,
        [id, importe, ciclo, fecha, linea, time, time],
      );
      db.run(
        `INSERT INTO transferencia_pendiente_audit(pendiente,revision,accion,anterior,posterior,instante,actor)
         VALUES(?,1,'alta',NULL,'{}',?,'usuario-ficticio')`,
        [id, time],
      );
    }

    // 1 — open draft without pendings.
    header(1, "1");
    line(1, 1, 10000);

    // 2 — generated distribution with a still-pending transfer.
    header(2, "2");
    line(2, 2, 10000);
    generate(2);
    pending(1, 2, "2", 10000);

    // 3 — completed distribution: one confirmed and one cancelled transfer.
    header(3, "3");
    line(3, 3, 10000);
    line(4, 3, 5000);
    generate(3);
    pending(2, 3, "3", 10000);
    pending(3, 4, "3", 5000);
    db.run(
      `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,concepto,nota,
         anulado,revision,creado,actualizado)
       VALUES('1','2026-01-06','Transferencia',10000,'S001','S002',
         'Transferencia ficticia','',0,1,?,?)`,
      [time, time],
    );
    db.run(
      `UPDATE transferencia_pendiente SET estado='Confirmada',movimiento='1',
         fecha_efectiva='2026-01-06',revision=2,actualizado=? WHERE id=2`,
      [time2],
    );
    db.run(
      `INSERT INTO transferencia_pendiente_audit(pendiente,revision,accion,anterior,posterior,instante,actor)
       VALUES(2,2,'confirmacion','{}','{}',?,'usuario-ficticio')`,
      [time2],
    );
    db.run(
      `UPDATE transferencia_pendiente SET estado='Cancelada',
         motivo_cancelacion='Motivo ficticio',revision=2,actualizado=? WHERE id=3`,
      [time2],
    );
    db.run(
      `INSERT INTO transferencia_pendiente_audit(pendiente,revision,accion,anterior,posterior,instante,actor)
       VALUES(3,2,'cancelacion','{}','{}',?,'usuario-ficticio')`,
      [time2],
    );
    db.run(
      "UPDATE repartos SET estado='Completado',revision=3,actualizado=? WHERE id=3",
      [time3],
    );
    db.run(
      `INSERT INTO reparto_audit(reparto,revision,accion,anterior,posterior,instante,actor)
       VALUES(3,3,'completado','{}','{}',?,'usuario-ficticio')`,
      [time3],
    );
    db.run(
      "INSERT INTO transferencia_pendiente_attempts VALUES('generacion','k','hash','{}',1)",
    );
  });
}

test("SPEC36: C28 stays frozen and byte-identical", () => {
  const c = contract(c28);
  expect(c.id).toBe(c28);
  expect(c.schemaVersion).toBe(28);
  expect(c.sourceCommit).toBe("6a31c23");
  expect(c.objects).toHaveLength(372);
  expect(c.sha256).toBe(
    "323458fcb9e9a0f5e0f6bba27d09e227fe14fa299a1555c2e0008dca38b8e35c",
  );
  expect(contract(c27).sha256).toBe(
    "ecc4306bfaa6e27cf41ed15d30f612684051ef53bdf557eb8535187bf1a57e23",
  );
});

test("SPEC36 v29: C29 is exact and deterministic", () => {
  const c = contract(c29);
  expect(c.id).toBe(c29);
  expect(c.schemaVersion).toBe(29);
  expect(c.sourceCommit).toBe("86ded4b");
  expect(c.objects).toHaveLength(375);
  expect(c.sha256).toBe(
    "be488dcc8809370096f76d0214712c731a1eacf661a59327e36e9705d20ea4cc",
  );
  expect(contracts().at(-1)?.id).toBe(c29);
  expect(contract(c28).sha256).toBe(
    "323458fcb9e9a0f5e0f6bba27d09e227fe14fa299a1555c2e0008dca38b8e35c",
  );
});

test("SPEC36 v29: a fresh schema matches C29 exactly", () => {
  const db = store();
  try {
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 29,
    });
    expect(manifest(db)).toEqual(contract(c29).objects);
    expect(verifyContract(db, 29)).toBe(c29);
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    for (const table of [
      "repartos",
      "reparto_lineas",
      "transferencia_pendiente",
      "reparto_audit",
      "transferencia_pendiente_audit",
      "transferencia_pendiente_attempts",
    ]) {
      const sql = (
        db
          .query("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
          .get(table) as { sql: string }
      ).sql;
      expect(sql.trimEnd().endsWith("STRICT")).toBe(true);
    }
    for (const index of [
      "repartos_ciclo_unico",
      "reparto_lineas_reparto",
      "transferencia_pendiente_movimiento_unico",
      "transferencia_pendiente_ciclo_estado",
      "transferencia_pendiente_linea_unica",
      "transferencia_pendiente_gasto",
      "reparto_audit_revision_unica",
      "transferencia_pendiente_audit_revision_unica",
    ])
      expect(
        db
          .query("SELECT name FROM sqlite_master WHERE type='index' AND name=?")
          .get(index),
      ).toEqual({ name: index });
  } finally {
    db.close();
  }
});

test("SPEC36 v29: v27→v29 is additive and preserves rows, IDs, audits and attempts", () => {
  const dir = root();
  try {
    const path = join(dir, "v27.sqlite");
    v27(path);
    const source = new Database(path);
    const rows = {
      saldos: source.query("SELECT * FROM saldos ORDER BY id").all(),
      ciclos: source.query("SELECT * FROM ciclos ORDER BY id").all(),
      presupuestos: source.query("SELECT * FROM presupuestos ORDER BY id").all(),
      fotos: source.query("SELECT * FROM fotos_periodo ORDER BY id").all(),
      attempts: source.query("SELECT * FROM periodo_attempts ORDER BY key").all(),
      audit: source.query("SELECT * FROM audit ORDER BY id").all(),
      identity: source.query("SELECT * FROM database_origin").all(),
    };
    expect(verifyContract(source, 27)).toBe(c27);
    source.close();

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 29,
      });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect({
        saldos: db.query("SELECT * FROM saldos ORDER BY id").all(),
        ciclos: db.query("SELECT * FROM ciclos ORDER BY id").all(),
        presupuestos: db.query("SELECT * FROM presupuestos ORDER BY id").all(),
        fotos: db.query("SELECT * FROM fotos_periodo ORDER BY id").all(),
        attempts: db.query("SELECT * FROM periodo_attempts ORDER BY key").all(),
        audit: db.query("SELECT * FROM audit ORDER BY id").all(),
        identity: db.query("SELECT * FROM database_origin").all(),
      }).toEqual(rows);
      expect(manifest(db)).toEqual(contract(c29).objects);
      expect(verifyContract(db, 29)).toBe(c29);

      const previous = new Map(
        contract(c27).objects.map((object) => [
          `${object.type}:${object.name}`,
          object,
        ]),
      );
      const current = new Map(
        contract(c29).objects.map((object) => [
          `${object.type}:${object.name}`,
          object,
        ]),
      );
      for (const [key, object] of previous)
        expect(current.get(key)).toEqual(object);
      expect(current.size - previous.size).toBe(55);
      for (const table of [
        "repartos",
        "reparto_lineas",
        "transferencia_pendiente",
        "reparto_audit",
        "transferencia_pendiente_audit",
        "transferencia_pendiente_attempts",
      ])
        expect(db.query(`SELECT COUNT(*) AS n FROM ${table}`).get()).toEqual({
          n: 0,
        });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SPEC36 v29: v28→v29 rebuild preserves every row, link and audit", () => {
  const dir = root();
  try {
    const path = join(dir, "v28.sqlite");
    v28WithData(path);
    const source = new Database(path);
    const before = {
      repartos: source
        .query(
          `SELECT id,ciclo,estado,origen_comun,revision,creado,actualizado
           FROM repartos ORDER BY id`,
        )
        .all(),
      lineas: source
        .query(
          `SELECT id,reparto,clase,presupuesto,origen,destino,importe,
             fecha_prevista,concepto,nota,incluida,motivo_exclusion,revision,
             creado,actualizado
           FROM reparto_lineas ORDER BY id`,
        )
        .all(),
      pendientes: source
        .query("SELECT * FROM transferencia_pendiente ORDER BY id")
        .all(),
      repartoAudit: source
        .query("SELECT * FROM reparto_audit ORDER BY id")
        .all(),
      pendingAudit: source
        .query("SELECT * FROM transferencia_pendiente_audit ORDER BY id")
        .all(),
      attempts: source
        .query("SELECT * FROM transferencia_pendiente_attempts ORDER BY key")
        .all(),
    };
    expect(verifyContract(source, 28)).toBe(c28);
    source.close();

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 29,
      });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(
        db
          .query(
            `SELECT id,ciclo,fuente_plan,estado,origen_comun,revision,
               creado,actualizado
             FROM repartos ORDER BY id`,
          )
          .all(),
      ).toEqual(
        (before.repartos as Record<string, unknown>[]).map((row) => ({
          id: row.id,
          ciclo: row.ciclo,
          fuente_plan: "PlanCiclo",
          estado: row.estado,
          origen_comun: row.origen_comun,
          revision: row.revision,
          creado: row.creado,
          actualizado: row.actualizado,
        })),
      );
      expect(
        db
          .query(
            `SELECT id,reparto,clase,presupuesto,origen,destino,importe,
               fecha_prevista,concepto,nota,incluida,motivo_exclusion,revision,
               creado,actualizado
             FROM reparto_lineas ORDER BY id`,
          )
          .all(),
      ).toEqual(before.lineas);
      expect(
        db
          .query("SELECT COUNT(*) AS n FROM reparto_lineas WHERE partida IS NOT NULL")
          .get(),
      ).toEqual({ n: 0 });
      expect(
        db.query("SELECT * FROM transferencia_pendiente ORDER BY id").all(),
      ).toEqual(before.pendientes);
      expect(
        db.query("SELECT * FROM reparto_audit ORDER BY id").all(),
      ).toEqual(before.repartoAudit);
      expect(
        db.query("SELECT * FROM transferencia_pendiente_audit ORDER BY id").all(),
      ).toEqual(before.pendingAudit);
      expect(
        db
          .query("SELECT * FROM transferencia_pendiente_attempts ORDER BY key")
          .all(),
      ).toEqual(before.attempts);
      expect(manifest(db)).toEqual(contract(c29).objects);
      expect(verifyContract(db, 29)).toBe(c29);
      const fresh = store();
      try {
        expect(manifest(fresh)).toEqual(manifest(db));
        expect(verifyContract(fresh, 29)).toBe(c29);
      } finally {
        fresh.close();
      }
      const previous = new Map(
        contract(c28).objects.map((object) => [
          `${object.type}:${object.name}`,
          object,
        ]),
      );
      const current = new Map(
        contract(c29).objects.map((object) => [
          `${object.type}:${object.name}`,
          object,
        ]),
      );
      expect(
        current.get("trigger:reparto_audit_revision"),
      ).toEqual(previous.get("trigger:reparto_audit_revision"));
      const addedTriggers = [...current.keys()]
        .filter((key) => key.startsWith("trigger:") && !previous.has(key))
        .sort();
      expect(addedTriggers).toEqual([
        "trigger:reparto_fuente_inmutable",
        "trigger:reparto_linea_fuente_insert",
        "trigger:reparto_linea_fuente_update",
      ]);
      const removedTriggers = [...previous.keys()]
        .filter((key) => key.startsWith("trigger:") && !current.has(key))
        .sort();
      expect(removedTriggers).toEqual([]);
      const modifiedTriggers = [...previous.entries()]
        .filter(
          ([key, object]) =>
            key.startsWith("trigger:") &&
            current.has(key) &&
            JSON.stringify(current.get(key)) !== JSON.stringify(object),
        )
        .map(([key]) => key)
        .sort();
      expect(modifiedTriggers).toEqual([
        "trigger:reparto_linea_presupuesto_destino_insert",
        "trigger:reparto_linea_presupuesto_destino_update",
        "trigger:transferencia_pendiente_linea_reparto",
        "trigger:transferencia_pendiente_linea_reparto_update",
      ]);
      expect(current.size - previous.size).toBe(3);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SPEC36 v29: a failing DDL rolls back the whole v29 migration", () => {
  const dir = root();
  try {
    const path = join(dir, "v28.sqlite");
    v28WithData(path);
    const db = new Database(path);
    try {
      const before = {
        version: db.query("SELECT version FROM schema_version").get(),
        repartos: db.query("SELECT * FROM repartos ORDER BY id").all(),
        lineas: db.query("SELECT * FROM reparto_lineas ORDER BY id").all(),
        pendientes: db
          .query("SELECT * FROM transferencia_pendiente ORDER BY id")
          .all(),
      };
      db.exec("PRAGMA foreign_keys=OFF");
      // The conflict on a new v29 trigger is reached after both tables were
      // dropped, recreated and copied, exercising the full rollback.
      db.exec(
        "CREATE TRIGGER reparto_fuente_inmutable BEFORE INSERT ON transferencia_pendiente BEGIN SELECT 1; END",
      );
      expect(() =>
        db.transaction(() => repartoMensualSchemaV29(db)).immediate(),
      ).toThrow();
      expect(db.query("SELECT version FROM schema_version").get()).toEqual(
        before.version,
      );
      expect(db.query("SELECT * FROM repartos ORDER BY id").all()).toEqual(
        before.repartos,
      );
      expect(db.query("SELECT * FROM reparto_lineas ORDER BY id").all()).toEqual(
        before.lineas,
      );
      expect(
        db.query("SELECT * FROM transferencia_pendiente ORDER BY id").all(),
      ).toEqual(before.pendientes);
      db.exec("DROP TRIGGER reparto_fuente_inmutable");
      expect(manifest(db)).toEqual(contract(c28).objects);
      expect(verifyContract(db, 28)).toBe(c28);
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      db.exec("PRAGMA foreign_keys=ON");
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function classification(db: Database) {
  db.run(
    `INSERT INTO categorias VALUES('CAT0001','Ficticia',NULL,'Gasto','Gasto',0,'Activa',1,?,?)`,
    [t, t],
  );
  db.run(
    `INSERT INTO subcategorias VALUES('SUB0001','Ficticia','CAT0001','Activa',1,?,?)`,
    [t, t],
  );
}

function partida(
  db: Database,
  id = "PAR0001",
  estado = "Activa",
  padre: string | null = null,
) {
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,padre_partida)
     VALUES(?,'Partida ficticia','SUB0001',?,1,?,?,?)`,
    [id, estado, t, t, padre],
  );
}

function dprimaPlan(
  db: Database,
  ciclo = "1",
  raiz = "PAR0001",
  destino = "S002",
) {
  db.run(
    `INSERT INTO dprima_plan_mensual(ciclo,raiz,fuente,destino,base,esencial,
       del_mes,corte_sugerencia,revision,creado,actualizado)
     VALUES(?,?,'Aportación a saldo',?,NULL,NULL,10000,NULL,1,?,?)`,
    [ciclo, raiz, destino, t, t],
  );
}

test("SPEC36 v29: fuente_plan is mandatory and immutable once lines exist", () => {
  const db = store();
  try {
    cycle(db);
    expect(() =>
      db.run(
        `INSERT INTO repartos(ciclo,estado,origen_comun,revision,creado,actualizado)
         VALUES('1','Borrador','S001',1,?,?)`,
        [t, t],
      ),
    ).toThrow();
    const id = reparto(db);
    expect(
      db.query("SELECT fuente_plan FROM repartos WHERE id=?").get(id),
    ).toEqual({ fuente_plan: "PlanCiclo" });
    db.run(
      "UPDATE repartos SET fuente_plan='Dprima',revision=2,actualizado=? WHERE id=?",
      [t2, id],
    );
    expect(
      db.query("SELECT fuente_plan FROM repartos WHERE id=?").get(id),
    ).toEqual({ fuente_plan: "Dprima" });

    cycle(db, "2", "2026-02-01");
    budget(db);
    const withLine = reparto(db, { ciclo: "2", fuente_plan: "PlanCiclo" });
    line(db, { reparto: withLine });
    expect(() =>
      db.run(
        "UPDATE repartos SET fuente_plan='Dprima',revision=revision+1,actualizado=? WHERE id=?",
        [t2, withLine],
      ),
    ).toThrow("reparto plan source is frozen after lines or generation");
    generate(db, withLine);
    expect(() =>
      db.run(
        "UPDATE repartos SET fuente_plan='Dprima',revision=revision+1,actualizado=? WHERE id=?",
        [t2, withLine],
      ),
    ).toThrow("reparto plan source is frozen after lines or generation");
  } finally {
    db.close();
  }
});

test("SPEC36 v29: class and plan source match; Partida uses the D′ destination", () => {
  const db = store();
  try {
    cycle(db);
    cycle(db, "2", "2026-02-01");
    budget(db);
    classification(db);
    partida(db, "PAR0001", "Activa");
    dprimaPlan(db, "1");
    dprimaPlan(db, "2");
    const plan = reparto(db, { fuente_plan: "PlanCiclo" });
    const dprima = reparto(db, {
      ciclo: "2",
      fuente_plan: "Dprima",
      origen_comun: "S001",
    });

    expect(() =>
      line(db, { reparto: dprima, clase: "Presupuesto", presupuesto: "PRE0001" }),
    ).toThrow("reparto line class must match plan source");
    expect(() =>
      line(db, {
        reparto: plan,
        clase: "Partida",
        presupuesto: null,
        partida: "PAR0001",
      }),
    ).toThrow("reparto line class must match plan source");
    const partidaLine = line(db, {
      reparto: dprima,
      clase: "Partida",
      presupuesto: null,
      partida: "PAR0001",
    });
    expect(partidaLine).toBeGreaterThan(0);
    expect(() =>
      line(db, {
        reparto: dprima,
        clase: "Partida",
        presupuesto: null,
        partida: "PAR0001",
        destino: "S003",
      }),
    ).toThrow("reparto line must match its budget destination");
    expect(() =>
      line(db, {
        reparto: plan,
        clase: "Adicional",
        presupuesto: null,
      }),
    ).not.toThrow();
    expect(() =>
      line(db, {
        reparto: dprima,
        clase: "Adicional",
        presupuesto: null,
      }),
    ).not.toThrow();
    expect(() =>
      line(db, {
        reparto: dprima,
        clase: "Partida",
        presupuesto: "PRE0001",
        partida: "PAR0001",
      }),
    ).toThrow();

    // Historical inactive Partida cannot receive a new line.
    partida(db, "PAR0002", "Inactiva");
    dprimaPlan(db, "2", "PAR0002", "S002");
    expect(() =>
      line(db, {
        reparto: dprima,
        clase: "Partida",
        presupuesto: null,
        partida: "PAR0002",
      }),
    ).toThrow("reparto line must match its budget destination");
  } finally {
    db.close();
  }
});

test("SPEC36 v29: D8 rejects a new pending without an active D′ line", () => {
  const db = store();
  try {
    cycle(db);
    classification(db);
    partida(db, "PAR0001", "Activa");
    dprimaPlan(db);
    const dprima = reparto(db, { fuente_plan: "Dprima" });
    const first = line(db, {
      reparto: dprima,
      clase: "Partida",
      presupuesto: null,
      partida: "PAR0001",
    });
    const second = line(db, {
      reparto: dprima,
      clase: "Partida",
      presupuesto: null,
      partida: "PAR0001",
    });
    generate(db, dprima);
    expect(
      pending(db, { ciclo_origen: "1", reparto_linea: first }),
    ).toBeGreaterThan(0);

    // A pending whose destination no longer matches the D′ plan is rejected.
    db.run("DELETE FROM dprima_plan_mensual");
    expect(() =>
      pending(db, {
        ciclo_origen: "1",
        reparto_linea: second,
        destino: "S002",
      }),
    ).toThrow("pending must match an included line of its cycle");
  } finally {
    db.close();
  }
});

test("SPEC36 v29: reparto_linea_fuente_update rejects a class change", () => {
  const db = store();
  try {
    cycle(db);
    budget(db);
    classification(db);
    partida(db, "PAR0001", "Activa");
    dprimaPlan(db);
    const dprima = reparto(db, { fuente_plan: "Dprima" });
    const lineId = line(db, {
      reparto: dprima,
      clase: "Adicional",
      presupuesto: null,
    });
    expect(() =>
      db.run(
        `UPDATE reparto_lineas SET clase='Presupuesto',presupuesto='PRE0001',
           destino='S002',revision=revision+1,actualizado=? WHERE id=?`,
        [t2, lineId],
      ),
    ).toThrow("reparto line class must match plan source");
  } finally {
    db.close();
  }
});

test("SPEC36 v29: reparto_linea_presupuesto_destino_update rejects a Partida destination", () => {
  const db = store();
  try {
    cycle(db);
    classification(db);
    partida(db, "PAR0001", "Activa");
    dprimaPlan(db);
    const dprima = reparto(db, { fuente_plan: "Dprima" });
    const lineId = line(db, {
      reparto: dprima,
      clase: "Partida",
      presupuesto: null,
      partida: "PAR0001",
    });
    expect(() =>
      db.run(
        `UPDATE reparto_lineas SET destino='S003',revision=revision+1,
           actualizado=? WHERE id=?`,
        [t2, lineId],
      ),
    ).toThrow("reparto line must match its budget destination");
  } finally {
    db.close();
  }
});

test("SPEC36 v29: transferencia_pendiente_linea_reparto_update rejects a Partida mismatch", () => {
  const db = store();
  try {
    cycle(db);
    classification(db);
    partida(db, "PAR0001", "Activa");
    dprimaPlan(db);
    const dprima = reparto(db, { fuente_plan: "Dprima" });
    line(db, {
      reparto: dprima,
      clase: "Partida",
      presupuesto: null,
      partida: "PAR0001",
    });
    generate(db, dprima);
    const pendingId = pending(db, { ciclo_origen: "1", reparto_linea: 1 });
    expect(() =>
      db.run(
        `UPDATE transferencia_pendiente SET destino='S003',
           revision=revision+1,actualizado=? WHERE id=?`,
        [t2, pendingId],
      ),
    ).toThrow("pending must match an included line of its cycle");
  } finally {
    db.close();
  }
});

test("SPEC36 v28: identities, revisions, terminal states and frozen lines are immutable", () => {
  const db = store();
  try {
    cycle(db);
    budget(db);
    const repartoId = reparto(db);
    const lineId = line(db);
    generate(db);

    expect(() =>
      db.run("UPDATE repartos SET revision=revision+2 WHERE id=?", [repartoId]),
    ).toThrow("reparto revision must advance by one");
    expect(() =>
      db.run("UPDATE repartos SET id=99,revision=revision+1 WHERE id=?", [
        repartoId,
      ]),
    ).toThrow("immutable reparto identity");
    expect(() =>
      db.run("UPDATE repartos SET estado='Borrador',revision=revision+1 WHERE id=?", [
        repartoId,
      ]),
    ).toThrow("invalid reparto state transition");
    expect(() =>
      db.run("UPDATE reparto_lineas SET concepto='otro',revision=revision+1 WHERE id=?", [
        lineId,
      ]),
    ).toThrow("reparto line is frozen");
    expect(() => db.run("DELETE FROM repartos")).toThrow("no delete");
    expect(() => db.run("DELETE FROM reparto_lineas")).toThrow("no delete");

    db.run(
      "UPDATE repartos SET estado='Completado',revision=revision+1,actualizado=? WHERE id=?",
      [t3, repartoId],
    );
    expect(() =>
      db.run("UPDATE repartos SET actualizado=?,revision=revision+1 WHERE id=?", [
        t3,
        repartoId,
      ]),
    ).toThrow("completed reparto is immutable");
    expect(() =>
      db.run("UPDATE repartos SET origen_comun='S003',revision=revision-1 WHERE id=?", [
        repartoId,
      ]),
    ).toThrow();
  } finally {
    db.close();
  }
});

test("SPEC36 v28: pendings enforce state shape and terminal immutability", () => {
  const db = store();
  try {
    cycle(db);
    budget(db);
    const repartoId = reparto(db);
    line(db);
    generate(db);

    expect(() => pending(db, { estado: "Confirmada" })).toThrow();
    expect(() =>
      pending(db, { fecha_efectiva: "2026-01-06" }),
    ).toThrow();
    const id = pending(db);
    expect(() =>
      db.run(
        "UPDATE transferencia_pendiente SET estado='Cancelada',revision=revision+1 WHERE id=?",
        [id],
      ),
    ).toThrow();
    db.run(
      "UPDATE transferencia_pendiente SET estado='Cancelada',motivo_cancelacion='Cancelación ficticia',revision=revision+1,actualizado=? WHERE id=?",
      [t2, id],
    );
    expect(() =>
      db.run(
        "UPDATE transferencia_pendiente SET motivo_cancelacion='otro',revision=revision+1 WHERE id=?",
        [id],
      ),
    ).toThrow("terminal pending is immutable");
    expect(() => db.run("DELETE FROM transferencia_pendiente")).toThrow(
      "no delete",
    );
    expect(() =>
      db.run(
        "UPDATE transferencia_pendiente SET revision=revision+2 WHERE id=?",
        [id],
      ),
    ).toThrow("terminal pending is immutable");
    expect(repartoId).toBeGreaterThan(0);
  } finally {
    db.close();
  }
});

test("SPEC36 v28: a confirmed pending matches its non-annulled Transferencia", () => {
  const db = store();
  try {
    cycle(db);
    budget(db);
    reparto(db);
    line(db);
    generate(db);
    const id = pending(db);
    transfer(db, "1");
    transfer(db, "2", { importe: 5000 });
    transfer(db, "3", { anulado: 1 });

    expect(() =>
      db.run(
        "UPDATE transferencia_pendiente SET estado='Confirmada',fecha_efectiva='2026-01-06',movimiento='1',revision=revision+1 WHERE id=?",
        [id],
      ),
    ).not.toThrow();
    expect(
      db
        .query(
          "SELECT estado,revision,movimiento,fecha_efectiva FROM transferencia_pendiente WHERE id=?",
        )
        .get(id),
    ).toEqual({
      estado: "Confirmada",
      revision: 2,
      movimiento: "1",
      fecha_efectiva: "2026-01-06",
    });

    const coordinated = (overrides: Partial<PendingOptions> = {}) =>
      pending(db, {
        origen_tipo: "RegistroCoordinado",
        reparto_linea: null,
        gasto: "1",
        importe: 5000,
        ...overrides,
      });
    const amount = coordinated({ gasto: "2", importe: 4000 });
    expect(() =>
      db.run(
        "UPDATE transferencia_pendiente SET estado='Confirmada',fecha_efectiva='2026-01-06',movimiento='2',revision=revision+1 WHERE id=?",
        [amount],
      ),
    ).toThrow("confirmed pending must match a non-annulled Transferencia");
    const wrongDate = coordinated({ gasto: "2", importe: 5000 });
    expect(() =>
      db.run(
        "UPDATE transferencia_pendiente SET estado='Confirmada',fecha_efectiva='2026-01-07',movimiento='2',revision=revision+1 WHERE id=?",
        [wrongDate],
      ),
    ).toThrow("confirmed pending must match a non-annulled Transferencia");
    const annulled = coordinated({ gasto: "3" });
    expect(() =>
      db.run(
        "UPDATE transferencia_pendiente SET estado='Confirmada',fecha_efectiva='2026-01-06',movimiento='3',revision=revision+1 WHERE id=?",
        [annulled],
      ),
    ).toThrow("confirmed pending must match a non-annulled Transferencia");

    // The partial unique index keeps one pending per real movement.
    const duplicate = coordinated({ gasto: "1" });
    expect(() =>
      db.run(
        "UPDATE transferencia_pendiente SET estado='Confirmada',fecha_efectiva='2026-01-06',movimiento='1',revision=revision+1 WHERE id=?",
        [duplicate],
      ),
    ).toThrow();
  } finally {
    db.close();
  }
});

test("SPEC36 v28: provenance XOR separates Reparto and RegistroCoordinado", () => {
  const db = store();
  try {
    cycle(db);
    budget(db);
    reparto(db);
    const lineId = line(db);
    generate(db);
    transfer(db, "1");

    expect(() =>
      pending(db, { origen_tipo: "Reparto", reparto_linea: lineId, gasto: "1" }),
    ).toThrow();
    expect(() =>
      pending(db, { origen_tipo: "Reparto", reparto_linea: null }),
    ).toThrow();
    expect(() =>
      pending(db, {
        origen_tipo: "RegistroCoordinado",
        reparto_linea: null,
        gasto: null,
      }),
    ).toThrow();
    expect(() =>
      pending(db, {
        origen_tipo: "RegistroCoordinado",
        reparto_linea: null,
        gasto: "1",
        importe: 2000,
      }),
    ).not.toThrow();
  } finally {
    db.close();
  }
});

test("SPEC36 v28: one reparto per cycle and a line frozen by generation or pending", () => {
  const db = store();
  try {
    cycle(db);
    budget(db);
    const repartoId = reparto(db);
    const lineId = line(db);
    expect(() => reparto(db)).toThrow();
    expect(() =>
      db.run("UPDATE reparto_lineas SET concepto='antes',revision=revision+1 WHERE id=?", [
        lineId,
      ]),
    ).not.toThrow();
    // A pending cannot be generated while the reparto is still a draft.
    expect(() => pending(db)).toThrow();
    generate(db);
    expect(() =>
      db.run("UPDATE reparto_lineas SET concepto='después',revision=revision+1 WHERE id=?", [
        lineId,
      ]),
    ).toThrow("reparto line is frozen");
    const pendingId = pending(db);
    expect(pendingId).toBeGreaterThan(0);
    // §7.3: a new line may be added after generation; it only creates its
    // own pending. It is born frozen because the reparto left Borrador.
    const lateLine = line(db);
    expect(lateLine).toBeGreaterThan(lineId);
    expect(() =>
      db.run("UPDATE reparto_lineas SET concepto='tarde',revision=revision+1 WHERE id=?", [
        lateLine,
      ]),
    ).toThrow("reparto line is frozen");
    db.run(
      "UPDATE repartos SET estado='Completado',revision=revision+1,actualizado=? WHERE id=?",
      [t3, repartoId],
    );
    expect(() => line(db)).toThrow("invalid initial reparto line");
    expect(repartoId).toBeGreaterThan(0);
  } finally {
    db.close();
  }
});

test("SPEC36 v28: one pending per reparto line and distinct lines stay allowed", () => {
  const db = store();
  try {
    cycle(db);
    budget(db);
    reparto(db);
    const firstLine = line(db);
    const secondLine = line(db);
    generate(db);

    const firstPending = pending(db, { reparto_linea: firstLine });
    expect(firstPending).toBeGreaterThan(0);
    expect(() => pending(db, { reparto_linea: firstLine })).toThrow();
    expect(() => pending(db, { reparto_linea: secondLine })).not.toThrow();
    expect(
      db
        .query(
          "SELECT reparto_linea FROM transferencia_pendiente ORDER BY reparto_linea",
        )
        .all(),
    ).toEqual([
      { reparto_linea: firstLine },
      { reparto_linea: secondLine },
    ]);
  } finally {
    db.close();
  }
});

test("SPEC36 v28: inactive budgets allow a historical line but no new pending", () => {
  const db = store();
  try {
    cycle(db, "1", "2026-01-01");
    cycle(db, "2", "2026-02-01");
    budget(db, "PRE0001", "S002", "Activo");
    budget(db, "PRE0002", "S003", "Inactivo");
    reparto(db);
    reparto(db, { ciclo: "2" });
    line(db, { reparto: 1 });
    const inactive = line(db, {
      reparto: 2,
      presupuesto: "PRE0002",
      destino: "S003",
    });
    generate(db, 1);
    generate(db, 2);
    expect(() =>
      pending(db, {
        ciclo_origen: "2",
        destino: "S003",
        reparto_linea: inactive,
      }),
    ).toThrow("pending must match an included line of its cycle");
  } finally {
    db.close();
  }
});

test("SPEC36 v28: lines and pendings reject ineligible saldos and destinations", () => {
  const db = store();
  try {
    cycle(db);
    budget(db);
    const r = reparto(db);
    expect(() =>
      line(db, { reparto: r, origen: "S000" }),
    ).toThrow();
    expect(() =>
      line(db, { reparto: r, destino: "S000" }),
    ).toThrow();
    expect(() =>
      line(db, { reparto: r, destino: "S003" }),
    ).toThrow("reparto line must match its budget destination");
    db.run("UPDATE saldos SET estado='Inactiva' WHERE id='S003'");
    expect(() =>
      line(db, {
        reparto: r,
        clase: "Adicional",
        presupuesto: null,
        destino: "S003",
      }),
    ).toThrow("invalid reparto line saldo");
  } finally {
    db.close();
  }
});

test("SPEC36 v28: audits are immutable, unique per revision and match the current revision", () => {
  const db = store();
  try {
    cycle(db);
    budget(db);
    const repartoId = reparto(db);
    const lineId = line(db);
    repartoAudit(db, repartoId, 1);
    expect(() => repartoAudit(db, repartoId, 1)).toThrow();
    expect(() => repartoAudit(db, repartoId, 2, "actualizacion", "{}")).toThrow(
      "audit revision must match reparto",
    );
    expect(() => db.run("UPDATE reparto_audit SET actor='otro'")).toThrow(
      "immutable reparto audit",
    );
    expect(() => db.run("DELETE FROM reparto_audit")).toThrow(
      "immutable reparto audit",
    );

    generate(db);
    repartoAudit(db, repartoId, 2, "generacion", "{}");
    expect(() => repartoAudit(db, repartoId, 1)).toThrow();

    const pendingId = pending(db);
    pendingAudit(db, pendingId, 1);
    expect(() => pendingAudit(db, pendingId, 1)).toThrow();
    expect(() => pendingAudit(db, pendingId, 2, "confirmacion", "{}")).toThrow(
      "audit revision must match pending",
    );
    expect(() =>
      db.run("UPDATE transferencia_pendiente_audit SET actor='otro'"),
    ).toThrow("immutable pending audit");
    expect(() => db.run("DELETE FROM transferencia_pendiente_audit")).toThrow(
      "immutable pending audit",
    );
    expect(lineId).toBeGreaterThan(0);
  } finally {
    db.close();
  }
});

test("SPEC36 v28: attempts are keyed for idempotent generation and confirmation", () => {
  const db = store();
  try {
    db.run(
      "INSERT INTO transferencia_pendiente_attempts VALUES('generacion','k','hash','{}',1)",
    );
    expect(() =>
      db.run(
        "INSERT INTO transferencia_pendiente_attempts VALUES('generacion','k','otro','{}',2)",
      ),
    ).toThrow();
    expect(() =>
      db.run(
        "INSERT INTO transferencia_pendiente_attempts VALUES('confirmacion','k','hash','no-json',1)",
      ),
    ).toThrow();
    expect(() =>
      db.run(
        "INSERT INTO transferencia_pendiente_attempts VALUES('confirmacion','k','hash','{}',1)",
      ),
    ).not.toThrow();
    expect(
      db
        .query(
          "SELECT operacion,key,hash FROM transferencia_pendiente_attempts ORDER BY operacion",
        )
        .all(),
    ).toEqual([
      { operacion: "confirmacion", key: "k", hash: "hash" },
      { operacion: "generacion", key: "k", hash: "hash" },
    ]);
  } finally {
    db.close();
  }
});

test("SPEC36 v29: unknown v30 is rejected before mutating", () => {
  const dir = root();
  try {
    const path = join(dir, "v27.sqlite");
    v27(path);
    const db = new Database(path);
    try {
      db.exec("UPDATE schema_version SET version=30");
      expect(verifyContract(db, 30)).toBeNull();
      expect(() => verifyAdmittedContract(db)).toThrow(
        "Esquema no compatible; no se modificará esta base.",
      );
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 30,
      });
      expect(
        db
          .query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='repartos'",
          )
          .get(),
      ).toBeNull();
    } finally {
      db.close();
    }
    expect(() => openDatabase(path)).toThrow(
      "Esquema no compatible; no se modificará esta base.",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test.skipIf(process.platform !== "linux")(
  "SPEC36 v29: encrypted backup/restore preserves v29 and clears pending attempts",
  () => {
    const dir = root();
    try {
      const path = join(dir, "source.sqlite");
      const db = openDatabase(path);
      let pendingId = 0;
      try {
        cycle(db);
        budget(db);
        reparto(db);
        line(db);
        generate(db);
        pendingId = pending(db);
        db.run(
          "INSERT INTO transferencia_pendiente_attempts VALUES('generacion','k','hash','{}',1)",
        );
      } finally {
        db.close();
      }
      const key = randomBytes(32);
      const identity = join(dir, "identity.txt");
      const keygen = Bun.spawnSync(
        [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-o", identity],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(keygen.exitCode).toBe(0);
      const recipient = Bun.spawnSync(
        [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-y", identity],
        { stdout: "pipe", stderr: "pipe" },
      )
        .stdout.toString()
        .trim();
      const source = new Database(path);
      try {
        backup(source, key, join(dir, "cut"), recipient);
        const restored = restore(join(dir, "cut"), join(dir, "restored"), identity);
        const copy = openDatabase(restored.database);
        try {
          expect(copy.query("SELECT version FROM schema_version").get()).toEqual({
            version: 29,
          });
          expect(
            copy.query("SELECT fuente_plan FROM repartos").get(),
          ).toEqual({ fuente_plan: "PlanCiclo" });
          expect(
            copy
              .query("SELECT id,estado,revision FROM transferencia_pendiente")
              .get(),
          ).toEqual({ id: pendingId, estado: "Pendiente de realizar", revision: 1 });
          expect(
            copy
              .query("SELECT COUNT(*) AS n FROM transferencia_pendiente_attempts")
              .get(),
          ).toEqual({ n: 0 });
        } finally {
          copy.close();
        }
      } finally {
        source.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
