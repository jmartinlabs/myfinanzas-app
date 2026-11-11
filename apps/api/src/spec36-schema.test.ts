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
import { repartoMensualSchemaV28 } from "./spec36-schema";
import { materializeContract } from "../test-support/inversiones-schema";

process.env.NODE_ENV = "test";

const t = "2026-01-01T00:00:00.000Z";
const t2 = "2026-01-02T00:00:00.000Z";
const t3 = "2026-01-03T00:00:00.000Z";
const c27 = "C27-E411-FOTOS-PERIODO";
const c28 = "C28-REPARTO-PENDIENTE-6A31C23";
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
  estado: string;
  origen_comun: string | null;
  revision: number;
}>;

function reparto(db: Database, options: RepartoOptions = {}): number {
  const row = {
    ciclo: "1",
    estado: "Borrador",
    origen_comun: "S001",
    revision: 1,
    ...options,
  };
  db.run(
    `INSERT INTO repartos(ciclo,estado,origen_comun,revision,creado,actualizado)
     VALUES(?,?,?,?,?,?)`,
    [row.ciclo, row.estado, row.origen_comun, row.revision, t, t],
  );
  return (
    db.query("SELECT last_insert_rowid() AS id").get() as { id: number }
  ).id;
}

type LineOptions = Partial<{
  reparto: number;
  clase: string;
  presupuesto: string | null;
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
    `INSERT INTO reparto_lineas(reparto,clase,presupuesto,origen,destino,importe,
       fecha_prevista,concepto,nota,incluida,motivo_exclusion,revision,creado,actualizado)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.reparto,
      row.clase,
      row.presupuesto,
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

test("SPEC36 v28: C28 is exact and deterministic", () => {
  const c = contract(c28);
  expect(c.id).toBe(c28);
  expect(c.schemaVersion).toBe(28);
  expect(c.sourceCommit).toBe("6a31c23");
  expect(c.objects).toHaveLength(372);
  expect(c.sha256).toBe(
    "323458fcb9e9a0f5e0f6bba27d09e227fe14fa299a1555c2e0008dca38b8e35c",
  );
  expect(contracts().at(-1)?.id).toBe(c28);
  expect(contract(c27).sha256).toBe(
    "ecc4306bfaa6e27cf41ed15d30f612684051ef53bdf557eb8535187bf1a57e23",
  );
});

test("SPEC36 v28: a fresh schema matches C28 exactly", () => {
  const db = store();
  try {
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 28,
    });
    expect(manifest(db)).toEqual(contract(c28).objects);
    expect(verifyContract(db, 28)).toBe(c28);
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

test("SPEC36 v28: v27→v28 is additive and preserves rows, IDs, audits and attempts", () => {
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
        version: 28,
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
      expect(manifest(db)).toEqual(contract(c28).objects);
      expect(verifyContract(db, 28)).toBe(c28);

      const previous = new Map(
        contract(c27).objects.map((object) => [
          `${object.type}:${object.name}`,
          object,
        ]),
      );
      const current = new Map(
        contract(c28).objects.map((object) => [
          `${object.type}:${object.name}`,
          object,
        ]),
      );
      for (const [key, object] of previous)
        expect(current.get(key)).toEqual(object);
      expect(current.size - previous.size).toBe(52);
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

test("SPEC36 v28: a failing DDL rolls back the whole v28 migration", () => {
  const dir = root();
  try {
    const path = join(dir, "v27.sqlite");
    v27(path);
    const db = new Database(path);
    try {
      // Conflict on the last created table forces a failure after tables,
      // indexes and earlier triggers were already emitted.
      db.exec("CREATE TABLE transferencia_pendiente_attempts(conflict TEXT) STRICT");
      expect(() =>
        db.transaction(() => repartoMensualSchemaV28(db)).immediate(),
      ).toThrow();
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 27,
      });
      for (const name of [
        "repartos",
        "reparto_lineas",
        "transferencia_pendiente",
        "reparto_audit",
        "transferencia_pendiente_audit",
        "repartos_ciclo_unico",
        "reparto_no_delete",
        "transferencia_pendiente_no_delete",
      ])
        expect(
          db.query("SELECT name FROM sqlite_master WHERE name=?").get(name),
        ).toBeNull();
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
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
    expect(() =>
      db.run("UPDATE reparto_lineas SET concepto='otra',revision=revision+1 WHERE id=?", [
        lineId,
      ]),
    ).toThrow("reparto line is frozen");
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

test("SPEC36 v28: unknown v29 is rejected before mutating", () => {
  const dir = root();
  try {
    const path = join(dir, "v27.sqlite");
    v27(path);
    const db = new Database(path);
    try {
      db.exec("UPDATE schema_version SET version=29");
      expect(verifyContract(db, 29)).toBeNull();
      expect(() => verifyAdmittedContract(db)).toThrow(
        "Esquema no compatible; no se modificará esta base.",
      );
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 29,
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
  "SPEC36 v28: encrypted backup/restore preserves v28 and clears pending attempts",
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
            version: 28,
          });
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
