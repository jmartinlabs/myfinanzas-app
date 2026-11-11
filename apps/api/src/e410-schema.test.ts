import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "./database";
import { prepareSchema } from "./database-schema";
import {
  contract,
  contracts,
  manifest,
  verifyAdmittedContract,
  verifyContract,
} from "./schema-contract";
import { materializeContract } from "../test-support/inversiones-schema";

process.env.NODE_ENV = "test";

const t = "2026-01-01T00:00:00.000Z";
const c25 = "C25-E49-CIERRE-FINANCIERO";
const c26 = "C26-E410-REAPERTURA-V26";
const c28 = "C28-REPARTO-PENDIENTE-6A31C23";
const root = () => mkdtempSync(join(tmpdir(), ".tmp-e410-"));
const fingerprint = "a".repeat(64);

function v25(path: string, rows = true) {
  materializeContract(path, c25, (db) => {
    if (!rows) return;
    db.transaction(() => {
      db.run(
        `INSERT INTO ciclos(id,inicio,saldo_comida,creado,revision,actualizado)
         VALUES('1','2026-01-01',0,?,1,?)`,
        [t, t],
      );
      db.run(
        `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,creado_utc,
          motivo,fingerprint,estado) VALUES('1',1,'2026-01-01','2026-01-31',0,
          'usuario-unico',?,NULL,?,'Cerrado')`,
        [t, fingerprint],
      );
      db.run(
        `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,fingerprint,
          app_version,schema_version,ventana_inicio,ventana_fin,saldo_inicial,
          estado_temporal,estado_hechos,estado_plan,hechos,plan,clasificacion,
          inversion,auxiliares,cobertura,backup,no_disponible)
         VALUES('1',1,?,'usuario-unico',NULL,?,'0.0.0-fixture',25,
          '2026-01-01','2026-01-31',0,'Cerrado','Sin hechos','SinPlan',
          '{"origen":"fixture"}','{"estado":"SinPlan"}','{}','{}','{}','{}',
          '{"verificado":false,"motivo":"fixture"}','{}')`,
        [t, fingerprint],
      );
      db.run(
        `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
          instante,actor) VALUES('1',1,'cierre',NULL,'{"version":1}',NULL,?,'usuario-unico')`,
        [t],
      );
      db.run("INSERT INTO cierre_attempts VALUES('intento','hash','{}',1)");
    })();
  });
}

function store() {
  const db = new Database(":memory:", { strict: true });
  prepareSchema(db, { origin: "demo", key_hash: null });
  return db;
}

function closure(db: Database, version = 1) {
  const creado = `2026-0${version}-01T00:00:00.000Z`;
  db.transaction(() => {
    if (!db.query("SELECT id FROM ciclos WHERE id='1'").get())
      db.run(
        `INSERT INTO ciclos(id,inicio,saldo_comida,creado,revision,actualizado)
         VALUES('1','2026-01-01',0,?,1,?)`,
        [t, t],
      );
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,creado_utc,
        motivo,fingerprint,estado) VALUES('1',?,'2026-01-01','2026-01-31',0,
        'usuario-unico',?,NULL,?,'Cerrado')`,
      [version, creado, fingerprint],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,fingerprint,
        app_version,schema_version,ventana_inicio,ventana_fin,saldo_inicial,
        estado_temporal,estado_hechos,estado_plan,hechos,plan,clasificacion,
        inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES('1',?,?,'usuario-unico',NULL,?,'0.0.0-fixture',26,
        '2026-01-01','2026-01-31',0,'Cerrado','Sin hechos','SinPlan',
        '{"origen":"fixture"}','{"estado":"SinPlan"}','{}','{}','{}','{}',
        '{"verificado":false,"motivo":"fixture"}','{}')`,
      [version, creado, fingerprint],
    );
  })();
}

function reopening(
  db: Database,
  overrides: Partial<{
    ciclo: string;
    version_origen: number;
    tipo: string;
    actor: string;
    creado_utc: string;
    motivo: string;
    fingerprint_peticion: string;
    version_esperada: number;
    clave_intento: string | null;
    correlacion: string | null;
    reapertura_origen: number | null;
    resultado: string;
  }> = {},
) {
  const row = {
    ciclo: "1",
    version_origen: 1,
    tipo: "reapertura",
    actor: "usuario-unico",
    creado_utc: t,
    motivo: "Motivo ficticio",
    fingerprint_peticion: fingerprint,
    version_esperada: 1,
    clave_intento: "clave-1",
    correlacion: "corr-1",
    reapertura_origen: null,
    resultado: "Abierta",
    ...overrides,
  };
  return db.run(
    `INSERT INTO reaperturas(ciclo,version_origen,tipo,actor,creado_utc,motivo,
      fingerprint_peticion,version_esperada,clave_intento,correlacion,
      reapertura_origen,resultado)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.ciclo,
      row.version_origen,
      row.tipo,
      row.actor,
      row.creado_utc,
      row.motivo,
      row.fingerprint_peticion,
      row.version_esperada,
      row.clave_intento,
      row.correlacion,
      row.reapertura_origen,
      row.resultado,
    ],
  );
}

test("E4.10 A: C26 is exact and deterministic", () => {
  const c26Contract = contract(c26);
  expect(c26Contract.id).toBe(c26);
  expect(c26Contract.schemaVersion).toBe(26);
  expect(c26Contract.sourceCommit).toBe("baa673e");
  expect(c26Contract.objects).toHaveLength(308);
  expect(c26Contract.sha256).toBe(
    "65534e0148385e85352962a686188c69c11edd3d34aa72ec101dad81ddaf6265",
  );
  expect(contracts().at(-1)?.id).toBe(c28);
  expect(contract(c25).sha256).toBe(
    "5b6b649b2708a35af1fe23dfd63804c18c92c6923cb35065177532f51f8fa140",
  );
});

test("E4.10 A: a fresh schema matches C28 exactly", () => {
  const db = store();
  try {
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 28,
    });
    expect(manifest(db)).toEqual(contract(c28).objects);
    expect(verifyContract(db, 28)).toBe(c28);
    for (const table of [
      "reaperturas",
      "reapertura_activa",
      "cierre_vinculos",
      "reapertura_attempts",
    ]) {
      const sql = (
        db
          .query("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
          .get(table) as { sql: string }
      ).sql;
      expect(sql.trimEnd().endsWith("STRICT")).toBe(true);
    }
  } finally {
    db.close();
  }
});

test("E4.10 A: v25→v28 is additive and rewrites no C25 object or row", () => {
  const dir = root();
  try {
    const path = join(dir, "v25.sqlite");
    v25(path);
    const source = new Database(path);
    const before = {
      ciclos: source.query("SELECT * FROM ciclos ORDER BY id").all(),
      cierres: source.query("SELECT * FROM cierres ORDER BY ciclo,version").all(),
      fotos: source.query("SELECT * FROM fotos_cierre ORDER BY ciclo,version").all(),
      audit: source.query("SELECT * FROM cierre_audit ORDER BY id").all(),
      attempts: source.query("SELECT * FROM cierre_attempts ORDER BY key").all(),
    };
    source.close();

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 28,
      });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect({
        ciclos: db.query("SELECT * FROM ciclos ORDER BY id").all(),
        cierres: db.query("SELECT * FROM cierres ORDER BY ciclo,version").all(),
        fotos: db.query("SELECT * FROM fotos_cierre ORDER BY ciclo,version").all(),
        audit: db.query("SELECT * FROM cierre_audit ORDER BY id").all(),
        attempts: db.query("SELECT * FROM cierre_attempts ORDER BY key").all(),
      }).toEqual(before);

      const previous = new Map(
        contract(c25).objects.map((object) => [
          `${object.type}:${object.name}`,
          object,
        ]),
      );
      const c26Objects = new Map(
        contract(c26).objects.map((object) => [
          `${object.type}:${object.name}`,
          object,
        ]),
      );
      for (const [key, object] of previous)
        expect(c26Objects.get(key)).toEqual(object);
      expect(c26Objects.size - previous.size).toBe(11);

      const current = new Map(
        contract(c28).objects.map((object) => [
          `${object.type}:${object.name}`,
          object,
        ]),
      );
      for (const [key, object] of c26Objects)
        expect(current.get(key)).toEqual(object);
      expect(current.size - c26Objects.size).toBe(64);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  // Migración v25→v28 real: 5,07 s medidos en CI con carga paralela; el límite
  // por defecto de 5 s la abortaba. Sin cambios en aserciones ni en el esquema.
}, 30000);

test("E4.10 A: reopening and closure links reject orphan cycles, closures and events", () => {
  const db = store();
  try {
    closure(db);
    expect(() => reopening(db, { ciclo: "999" })).toThrow();
    expect(() => reopening(db, { version_origen: 9 })).toThrow();
    expect(() =>
      db.run(
        `INSERT INTO reapertura_activa(id,ciclo,reapertura_id)
         VALUES(1,'1',99)`,
      ),
    ).toThrow();
    expect(() =>
      db.run(
        `INSERT INTO cierre_vinculos(ciclo,version_origen,version_destino,reapertura_id,correlacion)
         VALUES('1',1,9,1,'corr')`,
      ),
    ).toThrow();

    reopening(db);
    expect(() =>
      db.run(
        `INSERT INTO reapertura_activa(id,ciclo,reapertura_id)
         VALUES(1,'999',1)`,
      ),
    ).toThrow();
    expect(() =>
      db.run(
        `INSERT INTO cierre_vinculos(ciclo,version_origen,version_destino,reapertura_id,correlacion)
         VALUES('1',1,9,1,'corr')`,
      ),
    ).toThrow();
    expect(() =>
      db.run(
        `INSERT INTO cierre_vinculos(ciclo,version_origen,version_destino,reapertura_id,correlacion)
         VALUES('1',9,2,1,'corr')`,
      ),
    ).toThrow();
    expect(() =>
      db.run(
        `INSERT INTO cierre_vinculos(ciclo,version_origen,version_destino,reapertura_id,correlacion)
         VALUES('1',1,3,1,'corr')`,
      ),
    ).toThrow();
    expect(() => reopening(db, { reapertura_origen: 1 })).toThrow();
    expect(() => reopening(db, { version_esperada: 2 })).toThrow();

    reopening(db, {
      tipo: "cancelacion",
      reapertura_origen: 1,
      clave_intento: "clave-2",
      resultado: "Cancelada",
    });
    expect(() =>
      db.run(
        `INSERT INTO cierre_vinculos(ciclo,version_origen,version_destino,reapertura_id,correlacion)
         VALUES('1',1,2,2,'corr')`,
      ),
    ).toThrow();
    expect(() =>
      reopening(db, {
        tipo: "cancelacion",
        reapertura_origen: 2,
        clave_intento: "clave-3",
        resultado: "Cancelada",
      }),
    ).toThrow();
    closure(db, 2);
    expect(() =>
      reopening(db, {
        tipo: "cancelacion",
        reapertura_origen: 1,
        version_origen: 2,
        version_esperada: 2,
        clave_intento: "clave-4",
        resultado: "Cancelada",
      }),
    ).toThrow();
  } finally {
    db.close();
  }
});

test("E4.10 A: reopening events and closure links are append-only", () => {
  const db = store();
  try {
    closure(db);
    reopening(db);
    db.run(
      `INSERT INTO reapertura_activa(id,ciclo,reapertura_id) VALUES(1,'1',1)`,
    );
    expect(() => db.run("UPDATE reaperturas SET actor='otro'")).toThrow(
      "immutable reopening",
    );
    expect(() => db.run("DELETE FROM reaperturas")).toThrow("no delete");

    closure(db, 2);
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES('1',2,'cierre',NULL,'{}','Motivo del re-cierre',?,'usuario-unico')`,
      [t],
    );
    db.run(
      `INSERT INTO cierre_vinculos(ciclo,version_origen,version_destino,reapertura_id,correlacion)
       VALUES('1',1,2,1,'corr-1')`,
    );
    expect(() =>
      db.run("UPDATE cierre_vinculos SET correlacion='otra'"),
    ).toThrow("immutable closure link");
    expect(() => db.run("DELETE FROM cierre_vinculos")).toThrow("no delete");
  } finally {
    db.close();
  }
});

test("E4.10 A: the active window is a singleton projection", () => {
  const db = store();
  try {
    closure(db);
    reopening(db);
    db.run(
      `INSERT INTO reapertura_activa(id,ciclo,reapertura_id) VALUES(1,'1',1)`,
    );
    expect(() =>
      db.run(
        `INSERT INTO reapertura_activa(id,ciclo,reapertura_id) VALUES(2,'1',1)`,
      ),
    ).toThrow();
    expect(db.query("SELECT id,ciclo,reapertura_id FROM reapertura_activa").get()).toEqual(
      { id: 1, ciclo: "1", reapertura_id: 1 },
    );
  } finally {
    db.close();
  }
});

for (const [name, overrides] of [
  ["blank motive", { motivo: "  " }],
  ["blank actor", { actor: "  " }],
  ["non-hex fingerprint", { fingerprint_peticion: "z".repeat(64) }],
  ["short fingerprint", { fingerprint_peticion: "a".repeat(63) }],
  ["non-UTC instant", { creado_utc: "2026-01-01 00:00:00" }],
  ["zero expected version", { version_esperada: 0 }],
  ["invalid type", { tipo: "otra" }],
  ["cancellation without origin", { tipo: "cancelacion", reapertura_origen: null }],
] as const) {
  test(`E4.10 A: reopening rejects ${name}`, () => {
    const db = store();
    try {
      closure(db);
      expect(() => reopening(db, overrides as never)).toThrow();
    } finally {
      db.close();
    }
  });
}

test("E4.10 A: cancellation requires the reopening it cancels", () => {
  const db = store();
  try {
    closure(db);
    reopening(db);
    reopening(db, {
      tipo: "cancelacion",
      reapertura_origen: 1,
      clave_intento: "clave-2",
      correlacion: "corr-2",
      resultado: "Cancelada",
    });
    expect(
      db.query("SELECT id,tipo,reapertura_origen FROM reaperturas ORDER BY id").all(),
    ).toEqual([
      { id: 1, tipo: "reapertura", reapertura_origen: null },
      { id: 2, tipo: "cancelacion", reapertura_origen: 1 },
    ]);
  } finally {
    db.close();
  }
});

test("E4.10 A: re-closure audit requires a motive from version 2 onwards", () => {
  const db = store();
  try {
    closure(db);
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES('1',1,'cierre',NULL,'{}',NULL,?,'usuario-unico')`,
      [t],
    );
    closure(db, 2);
    expect(() =>
      db.run(
        `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
          instante,actor) VALUES('1',2,'cierre',NULL,'{}',NULL,?,'usuario-unico')`,
        [t],
      ),
    ).toThrow("re-closure requires a motive");
    expect(() =>
      db.run(
        `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
          instante,actor) VALUES('1',2,'cierre',NULL,'{}','  ',?,'usuario-unico')`,
        [t],
      ),
    ).toThrow("re-closure requires a motive");
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES('1',2,'cierre',NULL,'{}','Motivo del re-cierre',?,'usuario-unico')`,
      [t],
    );
    expect(db.query("SELECT COUNT(*) n FROM cierre_audit").get()).toEqual({ n: 2 });
  } finally {
    db.close();
  }
});

test("E4.10 A: attempts are keyed per operation", () => {
  const db = store();
  try {
    db.run(
      "INSERT INTO reapertura_attempts VALUES('reapertura','k','hash','{}',1)",
    );
    db.run(
      "INSERT INTO reapertura_attempts VALUES('cancelacion','k','hash','{}',1)",
    );
    expect(() =>
      db.run(
        "INSERT INTO reapertura_attempts VALUES('reapertura','k','hash','{}',1)",
      ),
    ).toThrow();
    expect(() =>
      db.run(
        "INSERT INTO reapertura_attempts VALUES('otra','k','hash','{}',1)",
      ),
    ).toThrow();
    expect(
      db.query("SELECT operacion,key FROM reapertura_attempts ORDER BY operacion").all(),
    ).toEqual([
      { operacion: "cancelacion", key: "k" },
      { operacion: "reapertura", key: "k" },
    ]);
  } finally {
    db.close();
  }
});

test("E4.10 A: unknown v29 is rejected without writes", () => {
  const db = store();
  try {
    expect(verifyContract(db, 29)).toBe(null);
    db.exec("UPDATE schema_version SET version=29");
    expect(() => verifyAdmittedContract(db)).toThrow(
      "Esquema no compatible; no se modificará esta base.",
    );
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 29,
    });
  } finally {
    db.close();
  }
});
