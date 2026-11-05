import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { openDatabase } from "./database";
import { prepareSchema } from "./database-schema";
import { contract, manifest, verifyContract } from "./schema-contract";
import { materializeContract } from "../test-support/inversiones-schema";
import { cierreFinancieroSchema } from "./e49-schema";

process.env.NODE_ENV = "test";

const t = "2026-01-01T00:00:00.000Z";
const c24 = "C24-E43-VALORACION";
const c26 = "C26-E410-REAPERTURA-V26";
const root = () => mkdtempSync(join(process.cwd(), ".tmp-e49-"));

/** Genuine v24 contract plus fictional rows covering every preserved area. */
function v24(path: string, rows = true) {
  materializeContract(path, c24, (db) => {
    if (!rows) return;
    db.run(
      `INSERT INTO saldos(id,nombre,tipo,control,estado,revision,creado,actualizado)
       VALUES('S001','Banco ficticio','Efectivo','Movimientos','Activa',1,?,?),
             ('S003','Efectivo de inversión ficticio','Efectivo','Inversiones','Activa',1,?,?),
             ('S004','Cartera ficticia','Inversión','Inversiones','Activa',1,?,?)`,
      [t, t, t, t, t, t],
    );
    db.run(
      `INSERT INTO instrumentos(id,nombre,estado,revision,creado_en,actualizado_en)
       VALUES('I1001','Fondo índice ficticio','Activa',1,?,?)`,
      [t, t],
    );
    db.run(
      `INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,
        saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,
        concepto,nota,estado,revision,creado,actualizado)
       VALUES('1','Compra','2026-02-10','I1001','S003','S004',1250000000,100000000,
        'USD',900000,112500,500,'Compra ficticia','', 'Vigente',1,?,?)`,
      [t, t],
    );
    db.run(
      `INSERT INTO valoracion_inversion(id,saldo_inversion,instrumento,fecha_vigencia,
        tipo,valor_eur,precio_unitario,divisa,cambio,cantidad_base,procedencia,
        cobertura,actor,creado_utc,actualizado_utc,revision,motivo_correccion)
       VALUES('VAL-000000000001','S004','I1001','2026-03-31','Automática',118125,
        105000000,'USD',900000,1250000000,'Precio y cambio declarados por el usuario',
        'Completa','usuario-unico',?,?,1,NULL)`,
      [t, t],
    );
    db.run(
      `INSERT INTO valoracion_inversion_audit(valoracion,revision,accion,anterior,
        posterior,motivo,instante,actor)
       VALUES('VAL-000000000001',1,'alta',NULL,'{"valor":118125}',NULL,?,'usuario-unico')`,
      [t],
    );
    db.run(
      `INSERT INTO ciclos(id,inicio,saldo_comida,creado,revision,actualizado)
       VALUES('1','2026-01-01',0,?,1,?)`,
      [t, t],
    );
    db.run(
      `INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo)
       VALUES('D001','alta',1,'{}',?,0,'usuario-unico',NULL)`,
      [t],
    );
    db.run(
      "INSERT INTO owner(id,password,secret,enabled,last_step) VALUES(1,'hash','sealed',1,0)",
    );
    db.run("INSERT INTO sessions(hash,csrf,created,seen) VALUES('sesion','csrf',1,1)");
    db.run("INSERT INTO auth_limits(id,failures,window,blocked) VALUES(1,0,0,0)");
    db.run("INSERT INTO valoracion_attempts VALUES('intento-valoracion','hash','{}',1)");
    db.run("INSERT INTO counters(name,next) VALUES('deudas',9)");
  });
}

function snapshot(db: Database) {
  const table = (name: string, order = "rowid") =>
    db.query(`SELECT * FROM ${name} ORDER BY ${order}`).all();
  return {
    saldos: table("saldos", "id"),
    instrumentos: table("instrumentos", "id"),
    operaciones_inversion: table("operaciones_inversion", "id"),
    valoracion_inversion: table("valoracion_inversion", "id"),
    valoracion_inversion_audit: table(
      "valoracion_inversion_audit",
      "valoracion,revision",
    ),
    ciclos: table("ciclos", "id"),
    audit: table("audit", "id"),
    owner: table("owner", "id"),
    sessions: table("sessions", "hash"),
    auth_limits: table("auth_limits", "id"),
    valoracion_attempts: table("valoracion_attempts", "key"),
    counters: table("counters", "name"),
  };
}

const newTables = [
  "cierres",
  "fotos_cierre",
  "cierre_audit",
  "cierre_attempts",
] as const;

function counts(db: Database) {
  const has = (name: string) =>
    Boolean(
      db
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(name),
    );
  return Object.fromEntries(
    newTables.map((name) => [
      name,
      has(name)
        ? (db.query(`SELECT COUNT(*) n FROM ${name}`).get() as { n: number }).n
        : 0,
    ]),
  );
}

const fingerprint = "a".repeat(64);

function cycle(db: Database, id = "1", inicio = "2026-01-01") {
  db.run(
    `INSERT INTO ciclos(id,inicio,saldo_comida,creado,revision,actualizado)
     VALUES(?,?,0,?,1,?)`,
    [id, inicio, t, t],
  );
}

type Closure = {
  ciclo: string;
  version: number;
  inicio: string;
  fin: string;
  saldo: number;
  actor: string;
  creado: string;
  motivo: string | null;
  fingerprint: string;
};

const closure = (overrides: Partial<Closure> = {}): Closure => ({
  ciclo: "1",
  version: 1,
  inicio: "2026-01-01",
  fin: "2026-01-31",
  saldo: 0,
  actor: "usuario-unico",
  creado: t,
  motivo: null,
  fingerprint,
  ...overrides,
});

function insertClosure(db: Database, row: Closure = closure()) {
  return db.run(
    `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,creado_utc,
      motivo,fingerprint,estado) VALUES(?,?,?,?,?,?,?,?,?,'Cerrado')`,
    [
      row.ciclo,
      row.version,
      row.inicio,
      row.fin,
      row.saldo,
      row.actor,
      row.creado,
      row.motivo,
      row.fingerprint,
    ],
  );
}

type Photo = {
  appVersion: string;
  schemaVersion: number;
  estadoTemporal: string;
  estadoHechos: string;
  estadoPlan: string;
  hechos: string;
  plan: string;
  clasificacion: string;
  inversion: string;
  auxiliares: string;
  cobertura: string;
  backup: string;
  noDisponible: string;
};

const photo = (overrides: Partial<Photo> = {}): Photo => ({
  appVersion: "0.0.0-fixture",
  schemaVersion: 26,
  estadoTemporal: "Cerrado",
  estadoHechos: "Sin hechos",
  estadoPlan: "SinPlan",
  hechos: '{"origen":"fixture"}',
  plan: '{"estado":"SinPlan"}',
  clasificacion: "{}",
  inversion: "{}",
  auxiliares: "{}",
  cobertura: "{}",
  backup: '{"verificado":false,"motivo":"fixture"}',
  noDisponible: "{}",
  ...overrides,
});

function insertPhoto(
  db: Database,
  row: Closure = closure(),
  values: Photo = photo(),
) {
  return db.run(
    `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,fingerprint,
      app_version,schema_version,ventana_inicio,ventana_fin,saldo_inicial,
      estado_temporal,estado_hechos,estado_plan,hechos,plan,clasificacion,
      inversion,auxiliares,cobertura,backup,no_disponible)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.ciclo,
      row.version,
      row.creado,
      row.actor,
      row.motivo,
      row.fingerprint,
      values.appVersion,
      values.schemaVersion,
      row.inicio,
      row.fin,
      row.saldo,
      values.estadoTemporal,
      values.estadoHechos,
      values.estadoPlan,
      values.hechos,
      values.plan,
      values.clasificacion,
      values.inversion,
      values.auxiliares,
      values.cobertura,
      values.backup,
      values.noDisponible,
    ],
  );
}

function insertClosureAndPhoto(db: Database, row: Closure = closure()) {
  db.transaction(() => {
    insertClosure(db, row);
    insertPhoto(db, row);
  })();
}

function store() {
  const db = new Database(":memory:", { strict: true });
  prepareSchema(db, { origin: "demo", key_hash: null });
  cycle(db);
  return db;
}

test("E4.10 A: v24→v26 is additive, preserves IDs/audit/MFA and exposes the exact C26 contract", () => {
  const dir = root();
  try {
    const path = join(dir, "v24.sqlite");
    v24(path);
    const source = new Database(path);
    const before = snapshot(source);
    source.close();

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 26,
      });
      expect(snapshot(db)).toEqual(before);
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
      expect(verifyContract(db, 26)).toBe(c26);
      expect(manifest(db)).toEqual(contract(c26).objects);
      expect(counts(db)).toEqual({
        cierres: 0,
        fotos_cierre: 0,
        cierre_audit: 0,
        cierre_attempts: 0,
      });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.9 A: the v25 DDL is empty after migration (no backfill)", () => {
  const dir = root();
  try {
    const path = join(dir, "no-backfill.sqlite");
    v24(path);
    const db = openDatabase(path);
    try {
      expect(counts(db)).toEqual({
        cierres: 0,
        fotos_cierre: 0,
        cierre_audit: 0,
        cierre_attempts: 0,
      });
      expect(
        db
          .query("SELECT COUNT(*) n FROM operaciones_inversion WHERE id='1'")
          .get(),
      ).toEqual({ n: 1 });
      expect(
        db.query("SELECT COUNT(*) n FROM valoracion_inversion").get(),
      ).toEqual({ n: 1 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.10 A: inconsistent foreign keys reject without a partial v26 base and reopen with FK active", () => {
  const dir = root();
  try {
    const path = join(dir, "v24-fk.sqlite");
    v24(path);
    const broken = new Database(path);
    try {
      broken.exec("PRAGMA foreign_keys=OFF");
      broken.run(
        `INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,
          saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,
          concepto,nota,estado,revision,creado,actualizado)
         VALUES('9','Compra','2026-02-11','I9999','S003','S004',1,1000000,
          'EUR',NULL,100,0,'Compra inconsistente','', 'Vigente',1,?,?)`,
        [t, t],
      );
      expect(broken.query("PRAGMA foreign_key_check").all()).toHaveLength(1);
    } finally {
      broken.close();
    }

    expect(() => openDatabase(path)).toThrow(
      "Contrato de esquema v24 desconocido o incompleto; no se modificará esta base.",
    );

    const check = new Database(path);
    try {
      expect(check.query("SELECT version FROM schema_version").get()).toEqual({
        version: 24,
      });
      expect(counts(check)).toEqual({
        cierres: 0,
        fotos_cierre: 0,
        cierre_audit: 0,
        cierre_attempts: 0,
      });
      expect(check.query("PRAGMA foreign_key_check").all()).toHaveLength(1);
      // Repair the synthetic inconsistency without deleting an immutable operation.
      check.run(
        `INSERT INTO instrumentos(id,nombre,estado,revision,creado_en,actualizado_en)
         VALUES('I9999','Instrumento reparado','Activa',1,?,?)`,
        [t, t],
      );
    } finally {
      check.close();
    }

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 26,
      });
      expect(db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.9 A: a failed v25 migration rolls back to an intact v24 base", () => {
  const dir = root();
  try {
    const path = join(dir, "v24-rollback.sqlite");
    v24(path);
    const raw = new Database(path);
    const before = snapshot(raw);
    const original = raw.exec.bind(raw);
    // Fail the v25 statement only; the opening transaction must roll back every
    // earlier migration step and every object created by this migration.
    raw.exec = ((sql: string, ...args: never[]) => {
      if (sql.includes("CREATE TABLE cierres"))
        throw new Error("Injected v25 failure");
      return original(sql, ...args);
    }) as Database["exec"];
    expect(() =>
      prepareSchema(raw, { origin: "demo", key_hash: null }),
    ).toThrow("Injected v25 failure");

    const check = new Database(path);
    try {
      expect(check.query("SELECT version FROM schema_version").get()).toEqual({
        version: 24,
      });
      expect(counts(check)).toEqual({
        cierres: 0,
        fotos_cierre: 0,
        cierre_audit: 0,
        cierre_attempts: 0,
      });
      expect(snapshot(check)).toEqual(before);
      expect(check.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      check.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.9 A: a failure inside the v25 DDL rolls back the created tables", () => {
  const dir = root();
  try {
    const path = join(dir, "v24-mid-ddl.sqlite");
    v24(path);
    const db = new Database(path);
    try {
      // The dummy table makes the first CREATE TABLE fail after cierreFinancieroSchema
      // has passed its version check. The caller's transaction must roll back the rest.
      db.run("CREATE TABLE cierres(id TEXT)");
      expect(() =>
        db.transaction(() => cierreFinancieroSchema(db)).immediate(),
      ).toThrow();
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 24,
      });
      expect(
        db
          .query(
            "SELECT COUNT(*) n FROM sqlite_master WHERE name IN ('fotos_cierre','cierre_audit','cierre_attempts')",
          )
          .get(),
      ).toEqual({ n: 0 });
      expect(
        db
          .query("SELECT COUNT(*) n FROM sqlite_master WHERE name='cierres'")
          .get(),
      ).toEqual({ n: 1 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const unknown of [27, 999]) {
  test(`E4.9 A: unknown schema version ${unknown} stays intact`, () => {
    const dir = root();
    try {
      const path = join(dir, `unknown-${unknown}.sqlite`);
      v24(path);
      const unknownDb = new Database(path);
      const before = snapshot(unknownDb);
      unknownDb.exec(`UPDATE schema_version SET version=${unknown}`);
      const schema = unknownDb
        .query("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name")
        .all();
      unknownDb.close();

      expect(() => openDatabase(path)).toThrow(
        "Esquema no compatible; no se modificará esta base.",
      );
      const intact = new Database(path);
      try {
        expect(intact.query("SELECT version FROM schema_version").get()).toEqual({
          version: unknown,
        });
        expect(snapshot(intact)).toEqual(before);
        expect(
          intact
            .query("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name")
            .all(),
        ).toEqual(schema);
      } finally {
        intact.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("E4.9 A: two starts are idempotent", () => {
  const dir = root();
  try {
    const path = join(dir, "twice.sqlite");
    v24(path);
    const first = openDatabase(path);
    const firstManifest = manifest(first);
    const firstData = snapshot(first);
    first.close();

    const second = openDatabase(path);
    try {
      expect(second.query("SELECT version FROM schema_version").get()).toEqual({
        version: 26,
      });
      expect(manifest(second)).toEqual(firstManifest);
      expect(snapshot(second)).toEqual(firstData);
      expect(second.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      second.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.9 A: a closure and its photo are stored atomically and match their identity", () => {
  const db = store();
  try {
    insertClosureAndPhoto(db);
    expect(
      db.query("SELECT ciclo,version,inicio,fin,saldo_inicial,estado FROM cierres").get(),
    ).toEqual({
      ciclo: "1",
      version: 1,
      inicio: "2026-01-01",
      fin: "2026-01-31",
      saldo_inicial: 0,
      estado: "Cerrado",
    });
    expect(
      db.query(
        "SELECT app_version,schema_version,ventana_inicio,ventana_fin,estado_hechos,estado_plan FROM fotos_cierre",
      ).get(),
    ).toEqual({
      app_version: "0.0.0-fixture",
      schema_version: 26,
      ventana_inicio: "2026-01-01",
      ventana_fin: "2026-01-31",
      estado_hechos: "Sin hechos",
      estado_plan: "SinPlan",
    });
  } finally {
    db.close();
  }
});

test("E4.9 A: a photo without its closure is rejected and a closure without its photo rolls back", () => {
  const db = store();
  try {
    expect(() => insertPhoto(db)).toThrow(
      "photo must match its closure identity",
    );
    expect(() => db.transaction(() => insertClosure(db))()).toThrow();
    expect(db.query("SELECT COUNT(*) n FROM cierres").get()).toEqual({ n: 0 });
    expect(db.query("SELECT COUNT(*) n FROM fotos_cierre").get()).toEqual({
      n: 0,
    });
  } finally {
    db.close();
  }
});

test("E4.9 A: the photo must repeat the closure window, S0, actor, instant, motive and fingerprint", () => {
  for (const changed of [
    closure({ fin: "2026-02-01" }),
    closure({ saldo: 1 }),
    closure({ actor: "otro-actor" }),
    closure({ creado: "2026-01-02T00:00:00.000Z" }),
    closure({ motivo: "Motivo distinto" }),
    closure({ fingerprint: "b".repeat(64) }),
  ]) {
    const db = store();
    try {
      expect(() =>
        db.transaction(() => {
          insertClosure(db);
          insertPhoto(db, changed);
        })(),
      ).toThrow("photo must match its closure identity");
    } finally {
      db.close();
    }
  }
});

test("E4.9 A: a closure must match the cycle start and S0", () => {
  const db = store();
  try {
    expect(() =>
      db.transaction(() => insertClosure(db, closure({ saldo: 1 })))(),
    ).toThrow("closure must match its cycle window and S0");
    expect(() =>
      db.transaction(() =>
        insertClosure(db, closure({ inicio: "2026-02-01" })),
      )(),
    ).toThrow("closure must match its cycle window and S0");
  } finally {
    db.close();
  }
});

test("E4.9 A: closure versions are consecutive per cycle and preserve every version", () => {
  const db = store();
  try {
    expect(() =>
      db.transaction(() => {
        insertClosure(db, closure({ version: 2 }));
        insertPhoto(db, closure({ version: 2 }));
      })(),
    ).toThrow("closure version must follow the previous one");

    insertClosureAndPhoto(db, closure({ version: 1 }));
    insertClosureAndPhoto(
      db,
      closure({ version: 2, creado: "2026-02-01T00:00:00.000Z" }),
    );
    expect(
      db.query("SELECT version FROM cierres ORDER BY version").all(),
    ).toEqual([{ version: 1 }, { version: 2 }]);
    expect(
      db.query("SELECT version FROM fotos_cierre ORDER BY version").all(),
    ).toEqual([{ version: 1 }, { version: 2 }]);

    expect(() =>
      db.transaction(() => {
        insertClosure(db, closure({ version: 4 }));
        insertPhoto(db, closure({ version: 4 }));
      })(),
    ).toThrow("closure version must follow the previous one");
  } finally {
    db.close();
  }
});

test("E4.9 A: the closure, photo and audit are immutable", () => {
  const db = store();
  try {
    insertClosureAndPhoto(db);
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES('1',1,'cierre',NULL,'{}',NULL,?,'usuario-unico')`,
      [t],
    );
    expect(() => db.run("UPDATE cierres SET actor='otro'")).toThrow(
      "immutable closure",
    );
    expect(() => db.run("DELETE FROM cierres")).toThrow("no delete");
    expect(() => db.run("UPDATE fotos_cierre SET actor='otro'")).toThrow(
      "immutable closure photo",
    );
    expect(() => db.run("DELETE FROM fotos_cierre")).toThrow("no delete");
    expect(() => db.run("UPDATE cierre_audit SET actor='otro'")).toThrow(
      "immutable closure audit",
    );
    expect(() => db.run("DELETE FROM cierre_audit")).toThrow(
      "immutable closure audit",
    );
  } finally {
    db.close();
  }
});

test("E4.9 A: closure foreign keys reject unknown cycles and orphan audits", () => {
  const db = store();
  try {
    expect(() =>
      db.transaction(() => insertClosure(db, closure({ ciclo: "999" })))(),
    ).toThrow();
    expect(() =>
      db.run(
        `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
          instante,actor) VALUES('1',1,'cierre',NULL,'{}',NULL,?,'usuario-unico')`,
        [t],
      ),
    ).toThrow();
  } finally {
    db.close();
  }
});

test("E4.9 A: out-of-order closure requires a motive in the audit", () => {
  const db = store();
  try {
    insertClosureAndPhoto(db);
    expect(() =>
      db.run(
        `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
          instante,actor) VALUES('1',1,'cierre_fuera_de_orden',NULL,'{}',NULL,?,'usuario-unico')`,
        [t],
      ),
    ).toThrow();
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES('1',1,'cierre_fuera_de_orden',NULL,'{}','Motivo ficticio',?,'usuario-unico')`,
      [t],
    );
    expect(db.query("SELECT COUNT(*) n FROM cierre_audit").get()).toEqual({
      n: 1,
    });
  } finally {
    db.close();
  }
});

for (const [name, overrides] of [
  ["invalid window date", { inicio: "2026-02-30" }],
  ["reversed window", { inicio: "2026-02-01", fin: "2026-01-31" }],
  ["blank actor", { actor: "  " }],
  ["non-UTC instant", { creado: "2026-01-01 00:00:00" }],
  ["blank motive", { motivo: "  " }],
  ["non-hex fingerprint", { fingerprint: "z".repeat(64) }],
] as const) {
  test(`E4.9 A: closure rejects ${name}`, () => {
    const db = store();
    try {
      expect(() =>
        db.transaction(() =>
          insertClosure(db, closure(overrides as Partial<Closure>)),
        )(),
      ).toThrow();
    } finally {
      db.close();
    }
  });
}

for (const [name, values] of [
  ["invalid facts JSON", { hechos: "not-json" }],
  ["blank application version", { appVersion: "  " }],
  ["non-positive schema version", { schemaVersion: 0 }],
  ["invalid facts state", { estadoHechos: "Quizá" }],
  ["invalid plan state", { estadoPlan: "PlanNoVerificable" }],
  ["invalid temporal state", { estadoTemporal: "Abierto" }],
] as const) {
  test(`E4.9 A: photo rejects ${name}`, () => {
    const db = store();
    try {
      expect(() =>
        db.transaction(() => {
          insertClosure(db);
          insertPhoto(db, closure(), photo(values as Partial<Photo>));
        })(),
      ).toThrow();
    } finally {
      db.close();
    }
  });
}
