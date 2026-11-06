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
import { fotosPeriodoSchemaV27 } from "./e411-schema";
import { materializeContract } from "../test-support/inversiones-schema";

process.env.NODE_ENV = "test";

const t = "2026-01-01T00:00:00.000Z";
const c26 = "C26-E410-REAPERTURA-V26";
const c27 = "C27-E411-FOTOS-PERIODO";
const fp = "a".repeat(64);
const otherFp = "b".repeat(64);
const root = () => mkdtempSync(join(tmpdir(), ".tmp-e411-"));

function v26(path: string, rows = true) {
  materializeContract(path, c26, (db) => {
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
        [t, fp],
      );
      db.run(
        `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,fingerprint,
          app_version,schema_version,ventana_inicio,ventana_fin,saldo_inicial,
          estado_temporal,estado_hechos,estado_plan,hechos,plan,clasificacion,
          inversion,auxiliares,cobertura,backup,no_disponible)
         VALUES('1',1,?,'usuario-unico',NULL,?,'0.0.0-fixture',26,
          '2026-01-01','2026-01-31',0,'Cerrado','Sin hechos','SinPlan',
          '{"origen":"fixture"}','{"estado":"SinPlan"}','{}','{}','{}','{}',
          '{"verificado":false,"motivo":"fixture"}','{}')`,
        [t, fp],
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

function cycle(db: Database, id: string, inicio: string) {
  db.run(
    `INSERT INTO ciclos(id,inicio,saldo_comida,creado,revision,actualizado)
     VALUES(?,?,0,?,1,?)`,
    [id, inicio, t, t],
  );
}

function closure(db: Database, version = 1, fingerprint = fp) {
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
       VALUES('1',?,?,'usuario-unico',NULL,?,'0.0.0-fixture',27,
        '2026-01-01','2026-01-31',0,'Cerrado','Sin hechos','SinPlan',
        '{"origen":"fixture"}','{"estado":"SinPlan"}','{}','{}','{}','{}',
        '{"verificado":false,"motivo":"fixture"}','{}')`,
      [version, creado, fingerprint],
    );
  })();
}

type PeriodOverrides = Partial<{
  tipo: string;
  ejercicio: number;
  trimestre: number | null;
  inicio: string;
  fin: string;
  version: string;
  creado_utc: string;
  actor: string;
  motivo: string | null;
  fingerprint: string;
  app_version: string;
  schema_version: number;
  regla_composicion: string;
  seleccion_aplicada: string;
  cobertura: string;
  valores: string;
  no_disponible: string;
}>;

function period(db: Database, overrides: PeriodOverrides = {}): number {
  const row = {
    tipo: "Trimestre",
    ejercicio: 2026,
    trimestre: 1,
    inicio: "2026-01-01",
    fin: "2026-03-31",
    version: "A1",
    creado_utc: t,
    actor: "usuario-unico",
    motivo: null,
    fingerprint: fp,
    app_version: "0.0.0-fixture",
    schema_version: 27,
    regla_composicion: "P1-C/P4-A/P5-B",
    seleccion_aplicada:
      '{"regla":"P1-C/P4-A/P5-B","reglaPeriodo":"P3-B","porDefecto":true}',
    cobertura: "{}",
    valores: "{}",
    no_disponible: "{}",
    ...overrides,
  };
  db.run(
    `INSERT INTO fotos_periodo(tipo,ejercicio,trimestre,inicio,fin,version,
      creado_utc,actor,motivo,fingerprint,app_version,schema_version,
      regla_composicion,seleccion_aplicada,cobertura,valores,no_disponible)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.tipo,
      row.ejercicio,
      row.trimestre,
      row.inicio,
      row.fin,
      row.version,
      row.creado_utc,
      row.actor,
      row.motivo,
      row.fingerprint,
      row.app_version,
      row.schema_version,
      row.regla_composicion,
      row.seleccion_aplicada,
      row.cobertura,
      row.valores,
      row.no_disponible,
    ],
  );
  return (
    db.query("SELECT last_insert_rowid() AS id").get() as { id: number }
  ).id;
}

type ComponentOverrides = Partial<{
  periodo_id: number;
  ciclo: string;
  version_foto: number | null;
  fingerprint_foto: string | null;
  estado: string;
  motivo: string | null;
}>;

function component(db: Database, overrides: ComponentOverrides = {}) {
  const row = {
    periodo_id: overrides.periodo_id ?? 1,
    ciclo: "1",
    version_foto: 1 as number | null,
    fingerprint_foto: fp as string | null,
    estado: "Incluido",
    motivo: null as string | null,
    ...overrides,
  };
  return db.run(
    `INSERT INTO foto_periodo_componentes(periodo_id,ciclo,version_foto,
      fingerprint_foto,estado,motivo) VALUES(?,?,?,?,?,?)`,
    [
      row.periodo_id,
      row.ciclo,
      row.version_foto,
      row.fingerprint_foto,
      row.estado,
      row.motivo,
    ],
  );
}

test("E4.11 I2: C27 is exact and deterministic", () => {
  const c27Contract = contract(c27);
  expect(c27Contract.id).toBe(c27);
  expect(c27Contract.schemaVersion).toBe(27);
  expect(c27Contract.sourceCommit).toBe("b02f546");
  expect(c27Contract.objects).toHaveLength(320);
  expect(c27Contract.sha256).toBe(
    "ecc4306bfaa6e27cf41ed15d30f612684051ef53bdf557eb8535187bf1a57e23",
  );
  expect(contracts().at(-1)?.id).toBe(c27);
  expect(contract(c26).sha256).toBe(
    "65534e0148385e85352962a686188c69c11edd3d34aa72ec101dad81ddaf6265",
  );
});

test("E4.11 I2: a fresh schema matches C27 exactly", () => {
  const db = store();
  try {
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 27,
    });
    expect(manifest(db)).toEqual(contract(c27).objects);
    expect(verifyContract(db, 27)).toBe(c27);
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    for (const table of [
      "fotos_periodo",
      "foto_periodo_componentes",
      "periodo_attempts",
    ]) {
      const sql = (
        db
          .query("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
          .get(table) as { sql: string }
      ).sql;
      expect(sql.trimEnd().endsWith("STRICT")).toBe(true);
    }
    for (const index of [
      "fotos_periodo_trimestre_unico",
      "fotos_periodo_anio_unico",
    ])
      expect(
        db
          .query("SELECT name FROM sqlite_master WHERE type='index' AND name=?")
          .get(index),
      ).toEqual({ name: index });
    for (const trigger of [
      "fotos_periodo_no_update",
      "fotos_periodo_no_delete",
      "foto_periodo_componente_no_update",
      "foto_periodo_componente_no_delete",
      "fotos_periodo_secuencia",
      "foto_periodo_componente_foto",
      "foto_periodo_componente_motivo",
    ])
      expect(
        db
          .query(
            "SELECT name FROM sqlite_master WHERE type='trigger' AND name=?",
          )
          .get(trigger),
      ).toEqual({ name: trigger });
  } finally {
    db.close();
  }
});

test("E4.11 I2: v26→v27 is additive and preserves rows, IDs, audit, attempts and triggers", () => {
  const dir = root();
  try {
    const path = join(dir, "v26.sqlite");
    v26(path);
    const source = new Database(path);
    const rows = {
      ciclos: source.query("SELECT * FROM ciclos ORDER BY id").all(),
      cierres: source
        .query("SELECT * FROM cierres ORDER BY ciclo,version")
        .all(),
      fotos: source
        .query("SELECT * FROM fotos_cierre ORDER BY ciclo,version")
        .all(),
      audit: source.query("SELECT * FROM cierre_audit ORDER BY id").all(),
      attempts: source
        .query("SELECT * FROM cierre_attempts ORDER BY key")
        .all(),
    };
    const previousTriggers = (
      source
        .query("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name")
        .all() as { name: string }[]
    ).map((row) => row.name);
    source.close();

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 27,
      });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(db.query("PRAGMA recursive_triggers").get()).toEqual({
        recursive_triggers: 1,
      });
      expect({
        ciclos: db.query("SELECT * FROM ciclos ORDER BY id").all(),
        cierres: db.query("SELECT * FROM cierres ORDER BY ciclo,version").all(),
        fotos: db
          .query("SELECT * FROM fotos_cierre ORDER BY ciclo,version")
          .all(),
        audit: db.query("SELECT * FROM cierre_audit ORDER BY id").all(),
        attempts: db.query("SELECT * FROM cierre_attempts ORDER BY key").all(),
      }).toEqual(rows);
      const currentTriggers = new Set(
        (
          db
            .query("SELECT name FROM sqlite_master WHERE type='trigger'")
            .all() as { name: string }[]
        ).map((row) => row.name),
      );
      for (const trigger of previousTriggers)
        expect(currentTriggers.has(trigger)).toBe(true);

      const previous = new Map(
        contract(c26).objects.map((object) => [
          `${object.type}:${object.name}`,
          object,
        ]),
      );
      const current = new Map(
        contract(c27).objects.map((object) => [
          `${object.type}:${object.name}`,
          object,
        ]),
      );
      for (const [key, object] of previous)
        expect(current.get(key)).toEqual(object);
      expect(current.size - previous.size).toBe(12);
      for (const table of [
        "fotos_periodo",
        "foto_periodo_componentes",
        "periodo_attempts",
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

test("E4.11 I2: a failing DDL rolls back the whole v27 migration", () => {
  const dir = root();
  try {
    const path = join(dir, "v26.sqlite");
    v26(path, false);
    const db = new Database(path);
    try {
      // A conflict on the last created table forces a failure after the first
      // tables, indexes and triggers were already emitted.
      db.exec("CREATE TABLE periodo_attempts(conflict TEXT) STRICT");
      expect(() =>
        db.transaction(() => fotosPeriodoSchemaV27(db)).immediate(),
      ).toThrow();
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 26,
      });
      for (const name of [
        "fotos_periodo",
        "foto_periodo_componentes",
        "fotos_periodo_trimestre_unico",
        "fotos_periodo_anio_unico",
        "fotos_periodo_no_update",
        "fotos_periodo_no_delete",
        "foto_periodo_componente_no_update",
        "foto_periodo_componente_no_delete",
        "fotos_periodo_secuencia",
        "foto_periodo_componente_foto",
        "foto_periodo_componente_motivo",
      ])
        expect(
          db
            .query("SELECT name FROM sqlite_master WHERE name=?")
            .get(name),
        ).toBeNull();
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.11 I2: period photos and components are immutable", () => {
  const db = store();
  try {
    closure(db);
    const id = period(db);
    const second = period(db, { version: "A2" });
    component(db, { periodo_id: id });
    expect(db.query("PRAGMA recursive_triggers").get()).toEqual({
      recursive_triggers: 1,
    });
    expect(() => db.run("UPDATE fotos_periodo SET actor='otro'")).toThrow(
      "immutable period photo",
    );
    expect(() => db.run("DELETE FROM fotos_periodo")).toThrow("no delete");
    expect(() =>
      db.run("UPDATE foto_periodo_componentes SET estado='Incluido'"),
    ).toThrow("immutable period component");
    expect(() => db.run("DELETE FROM foto_periodo_componentes")).toThrow(
      "no delete",
    );
    expect(() =>
      db.run(
        "INSERT OR REPLACE INTO fotos_periodo SELECT * FROM fotos_periodo WHERE id=?",
        [second],
      ),
    ).toThrow("no delete");
    expect(() =>
      db.run(
        "INSERT OR REPLACE INTO foto_periodo_componentes SELECT * FROM foto_periodo_componentes WHERE periodo_id=? AND ciclo='1'",
        [id],
      ),
    ).toThrow("no delete");
  } finally {
    db.close();
  }
});

test("E4.11 I2: versions follow A1→A2 per natural period", () => {
  const db = store();
  try {
    closure(db);
    const first = period(db);
    expect(() => period(db, { version: "A1" })).toThrow();
    expect(() => period(db, { version: "A3" })).toThrow();
    expect(() =>
      period(db, { trimestre: 2, version: "A2" }),
    ).toThrow("period photo version must follow the previous one");
    const second = period(db, { version: "A2" });
    expect(second).not.toBe(first);
    expect(() => period(db, { version: "A2" })).toThrow();
    expect(() => period(db, { version: "A4" })).toThrow();
    expect(period(db, { trimestre: 2, version: "A1" })).not.toBe(first);

    const annual = period(db, {
      tipo: "Anio",
      trimestre: null,
      ejercicio: 2026,
      inicio: "2026-01-01",
      fin: "2026-12-31",
      version: "A1",
    });
    expect(annual).not.toBe(first);
    expect(() =>
      period(db, {
        tipo: "Anio",
        trimestre: null,
        inicio: "2026-01-01",
        fin: "2026-12-31",
        version: "A3",
      }),
    ).toThrow("period photo version must follow the previous one");
    expect(
      period(db, {
        tipo: "Anio",
        trimestre: null,
        inicio: "2026-01-01",
        fin: "2026-12-31",
        version: "A2",
      }),
    ).not.toBe(annual);

    expect(
      db.query("SELECT tipo,trimestre,version FROM fotos_periodo ORDER BY id").all(),
    ).toEqual([
      { tipo: "Trimestre", trimestre: 1, version: "A1" },
      { tipo: "Trimestre", trimestre: 1, version: "A2" },
      { tipo: "Trimestre", trimestre: 2, version: "A1" },
      { tipo: "Anio", trimestre: null, version: "A1" },
      { tipo: "Anio", trimestre: null, version: "A2" },
    ]);
  } finally {
    db.close();
  }
});

test("E4.11 I2: partial uniqueness separates Trimestre and Anio versions", () => {
  const db = store();
  try {
    closure(db);
    period(db);
    period(db, {
      tipo: "Anio",
      trimestre: null,
      inicio: "2026-01-01",
      fin: "2026-12-31",
    });
    expect(() => period(db)).toThrow();
    expect(() =>
      period(db, {
        tipo: "Anio",
        trimestre: null,
        inicio: "2026-01-01",
        fin: "2026-12-31",
      }),
    ).toThrow();
    expect(period(db, { trimestre: 2 })).toBeGreaterThan(0);
    expect(period(db, { ejercicio: 2027, inicio: "2027-01-01", fin: "2027-03-31" })).toBeGreaterThan(0);
    expect(() =>
      period(db, {
        tipo: "Trimestre",
        trimestre: null,
        inicio: "2026-01-01",
        fin: "2026-03-31",
      }),
    ).toThrow();
    expect(() =>
      period(db, {
        tipo: "Anio",
        trimestre: 1,
        inicio: "2026-01-01",
        fin: "2026-12-31",
      }),
    ).toThrow();
    expect(() => period(db, { trimestre: 5 })).toThrow();
  } finally {
    db.close();
  }
});

test("E4.11 I2: included components must match their closure photo and fingerprint", () => {
  const db = store();
  try {
    closure(db);
    cycle(db, "2", "2026-02-01");
    cycle(db, "3", "2026-03-01");
    cycle(db, "4", "2026-04-01");
    cycle(db, "5", "2026-05-01");
    const id = period(db);
    expect(() => component(db, { periodo_id: id })).not.toThrow();
    expect(() => component(db, { periodo_id: id, ciclo: "2" })).toThrow();
    expect(() =>
      component(db, { periodo_id: id, version_foto: 9 }),
    ).toThrow();
    expect(() =>
      component(db, { periodo_id: id, fingerprint_foto: otherFp }),
    ).toThrow("included component must match its closure photo");
    expect(() =>
      component(db, { periodo_id: id, version_foto: null }),
    ).toThrow();
    expect(() =>
      db.run(
        `INSERT INTO foto_periodo_componentes(periodo_id,ciclo,version_foto,
          fingerprint_foto,estado,motivo) VALUES(?, '5', NULL, NULL,
          'ExcluidoSinCierre', 'sin cierre ficticio')`,
        [id],
      ),
    ).not.toThrow();
    expect(() =>
      db.run(
        `INSERT INTO foto_periodo_componentes(periodo_id,ciclo,version_foto,
          fingerprint_foto,estado,motivo) VALUES(?, '2', NULL, NULL,
          'PendienteReCierre', 'reabierto sin v2')`,
        [id],
      ),
    ).not.toThrow();
    expect(() =>
      db.run(
        `INSERT INTO foto_periodo_componentes(periodo_id,ciclo,version_foto,
          fingerprint_foto,estado,motivo) VALUES(?, '999', NULL, NULL,
          'ExcluidoSinCierre', 'ciclo inexistente')`,
        [id],
      ),
    ).toThrow();
    expect(() =>
      db.run(
        `INSERT INTO foto_periodo_componentes(periodo_id,ciclo,version_foto,
          fingerprint_foto,estado,motivo) VALUES(?, '3', NULL, NULL,
          'ExcluidoSinCierre', NULL)`,
        [id],
      ),
    ).toThrow("excluded component requires a motive");
    expect(() =>
      db.run(
        `INSERT INTO foto_periodo_componentes(periodo_id,ciclo,version_foto,
          fingerprint_foto,estado,motivo) VALUES(?, '4', 1, ?, 'PendienteReCierre', 'motivo')`,
        [id, fp],
      ),
    ).toThrow();
    expect(() => component(db, { periodo_id: 999 })).toThrow();
  } finally {
    db.close();
  }
});

test("E4.11 I2: period photos enforce identity, window and JSON coherence", () => {
  const db = store();
  try {
    expect(() => period(db, { inicio: "2026-02-30" })).toThrow();
    expect(() =>
      period(db, { inicio: "2026-04-01", fin: "2026-03-31" }),
    ).toThrow();
    expect(() => period(db, { fingerprint: "z".repeat(64) })).toThrow();
    expect(() => period(db, { fingerprint: "a".repeat(63) })).toThrow();
    expect(() => period(db, { actor: "   " })).toThrow();
    expect(() => period(db, { regla_composicion: " " })).toThrow();
    expect(() => period(db, { seleccion_aplicada: "{" })).toThrow();
    expect(() => period(db, { trimestre: 2, cobertura: "[]" })).not.toThrow();
    expect(() => period(db, { trimestre: 3, valores: "null" })).not.toThrow();
    expect(() =>
      period(db, { trimestre: 4, no_disponible: "{}" }),
    ).not.toThrow();
    for (const version of ["1", "A0", "A01", "B1", "A"]) {
      expect(() => period(db, { version })).toThrow();
    }
    expect(() =>
      period(db, { tipo: "Anio", trimestre: 0, inicio: "2026-01-01", fin: "2026-12-31" }),
    ).toThrow();
  } finally {
    db.close();
  }
});

test("E4.11 I2: periodo_attempts is keyed for idempotent creation", () => {
  const db = store();
  try {
    db.run("INSERT INTO periodo_attempts VALUES('k','hash','{}',1)");
    expect(() =>
      db.run("INSERT INTO periodo_attempts VALUES('k','otro','{}',2)"),
    ).toThrow();
    expect(
      db.query("SELECT key,hash,response,expires FROM periodo_attempts").get(),
    ).toEqual({ key: "k", hash: "hash", response: "{}", expires: 1 });
  } finally {
    db.close();
  }
});

test("E4.11 I2: a v27 database reopens without rewriting the aggregate store", () => {
  const dir = root();
  try {
    const path = join(dir, "v27.sqlite");
    const first = openDatabase(path);
    closure(first);
    const id = period(first);
    first.close();

    const reopened = openDatabase(path);
    try {
      expect(reopened.query("SELECT version FROM schema_version").get()).toEqual({
        version: 27,
      });
      expect(manifest(reopened)).toEqual(contract(c27).objects);
      expect(
        reopened.query("SELECT id,version FROM fotos_periodo").all(),
      ).toEqual([{ id, version: "A1" }]);
    } finally {
      reopened.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.11 I2: unknown v28 is rejected before mutating", () => {
  const dir = root();
  try {
    const path = join(dir, "v26.sqlite");
    v26(path, false);
    const db = new Database(path);
    try {
      db.exec("UPDATE schema_version SET version=28");
      expect(verifyContract(db, 28)).toBeNull();
      expect(() => verifyAdmittedContract(db)).toThrow(
        "Esquema no compatible; no se modificará esta base.",
      );
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 28,
      });
      expect(
        db
          .query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='fotos_periodo'",
          )
          .get(),
      ).toBeNull();
    } finally {
      db.close();
    }
    expect(() => openDatabase(path)).toThrow(
      "Esquema no compatible; no se modificará esta base.",
    );
    const check = new Database(path);
    try {
      expect(check.query("SELECT version FROM schema_version").get()).toEqual({
        version: 28,
      });
      expect(
        check
          .query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='fotos_periodo'",
          )
          .get(),
      ).toBeNull();
    } finally {
      check.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
