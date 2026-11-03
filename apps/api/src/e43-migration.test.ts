import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { openDatabase } from "./database";
import { contract, manifest, verifyContract } from "./schema-contract";
import { materializeContract } from "../test-support/inversiones-schema";
import { valoracionSchema } from "./e43-schema";

const t = "2026-01-01T00:00:00.000Z";
const c23 = "C23-E44-DEUDA-COMPLETA";
const c24 = "C24-E43-VALORACION";
const root = () => mkdtempSync(join(process.cwd(), ".tmp-e43-"));

/** Genuine v23 contract plus fictional rows covering every preserved area. */
function v23(path: string, rows = true) {
  materializeContract(path, c23, (db) => {
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
       VALUES('I1001','Fondo índice ficticio','Activa',1,?,?),
             ('I1002','Acción ficticia','Activa',1,?,?)`,
      [t, t, t, t],
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
      `INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo)
       VALUES('D001','alta',1,'{}',?,0,'usuario-unico',NULL)`,
      [t],
    );
    db.run(
      "INSERT INTO owner(id,password,secret,enabled,last_step) VALUES(1,'hash','sealed',1,0)",
    );
    db.run("INSERT INTO sessions(hash,csrf,created,seen) VALUES('sesion','csrf',1,1)");
    db.run("INSERT INTO auth_limits(id,failures,window,blocked) VALUES(1,0,0,0)");
    db.run("INSERT INTO debt_attempts VALUES('intento-deuda','hash','{}',1)");
    db.run("INSERT INTO conciliacion_attempts VALUES('intento-conciliacion','hash','{}',1)");
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
    audit: table("audit", "id"),
    owner: table("owner", "id"),
    sessions: table("sessions", "hash"),
    auth_limits: table("auth_limits", "id"),
    debt_attempts: table("debt_attempts", "key"),
    conciliacion_attempts: table("conciliacion_attempts", "key"),
    origen: table("database_origin", "id"),
  };
}

const counterSnapshot = (db: Database) =>
  db
    .query("SELECT * FROM counters WHERE name!='valoraciones_inversion' ORDER BY name")
    .all();

function memory() {
  const db = openDatabase(":memory:");
  db.run(
    `INSERT INTO instrumentos(id,nombre,estado,revision,creado_en,actualizado_en)
     VALUES('I1001','Fondo índice ficticio','Activa',1,?,?),
           ('I1002','Acción ficticia','Activa',1,?,?)`,
    [t, t, t, t],
  );
  return db;
}

type Row = {
  id: string;
  saldo: string;
  instrumento: string;
  fecha: string;
  tipo: "Manual" | "Automática";
  valor: number;
  precio: number | null;
  divisa: string | null;
  cambio: number | null;
  cantidad: number | null;
  procedencia: string;
  cobertura: string;
  actor: string;
  creado: string;
  actualizado: string;
  revision: number;
  motivo: string | null;
};

const automatic = (overrides: Partial<Row> = {}): Row => ({
  id: "VAL-000000000001",
  saldo: "S004",
  instrumento: "I1001",
  fecha: "2026-03-31",
  tipo: "Automática",
  valor: 118125,
  precio: 105000000,
  divisa: "USD",
  cambio: 900000,
  cantidad: 1250000000,
  procedencia: "Precio y cambio declarados por el usuario",
  cobertura: "Completa",
  actor: "usuario-unico",
  creado: t,
  actualizado: t,
  revision: 1,
  motivo: null,
  ...overrides,
});

const manual = (overrides: Partial<Row> = {}): Row =>
  automatic({
    tipo: "Manual",
    valor: 20500,
    precio: null,
    divisa: null,
    cambio: null,
    cantidad: null,
    procedencia: "Valor declarado por el usuario",
    ...overrides,
  });

function insert(db: Database, row: Row) {
  return db.run(
    `INSERT INTO valoracion_inversion(id,saldo_inversion,instrumento,fecha_vigencia,
      tipo,valor_eur,precio_unitario,divisa,cambio,cantidad_base,procedencia,
      cobertura,actor,creado_utc,actualizado_utc,revision,motivo_correccion)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.saldo,
      row.instrumento,
      row.fecha,
      row.tipo,
      row.valor,
      row.precio,
      row.divisa,
      row.cambio,
      row.cantidad,
      row.procedencia,
      row.cobertura,
      row.actor,
      row.creado,
      row.actualizado,
      row.revision,
      row.motivo,
    ],
  );
}

function correct(db: Database, row: Row, changes: Partial<Row>) {
  const next = { ...row, ...changes, revision: row.revision + 1 };
  db.run(
    `UPDATE valoracion_inversion
     SET fecha_vigencia=?,tipo=?,valor_eur=?,precio_unitario=?,divisa=?,cambio=?,
         cantidad_base=?,procedencia=?,cobertura=?,actor=?,actualizado_utc=?,
         revision=?,motivo_correccion=?
     WHERE id=?`,
    [
      next.fecha,
      next.tipo,
      next.valor,
      next.precio,
      next.divisa,
      next.cambio,
      next.cantidad,
      next.procedencia,
      next.cobertura,
      next.actor,
      next.actualizado,
      next.revision,
      next.motivo,
      next.id,
    ],
  );
}

function audit(db: Database, row: Row, action: "alta" | "corrección" = "alta") {
  const correction = action === "corrección";
  db.run(
    `INSERT INTO valoracion_inversion_audit(valoracion,revision,accion,anterior,
      posterior,motivo,instante,actor) VALUES(?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.revision,
      action,
      correction ? "{}" : null,
      "{}",
      correction ? "Motivo ficticio" : null,
      t,
      "usuario-unico",
    ],
  );
}

test("E4.3 AC-24: v23→v24 is additive, preserves IDs/audit/MFA and exposes the exact C24 contract", () => {
  const dir = root();
  try {
    const path = join(dir, "v23.sqlite");
    v23(path);
    const source = new Database(path);
    const before = snapshot(source);
    const counters = counterSnapshot(source);
    source.close();

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 24,
      });
      expect(snapshot(db)).toEqual(before);
      expect(counterSnapshot(db)).toEqual(counters);
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
      expect(verifyContract(db, 24)).toBe(c24);
      expect(manifest(db)).toEqual(contract(c24).objects);
      expect(
        db.query("SELECT COUNT(*) n FROM valoracion_inversion").get(),
      ).toEqual({ n: 0 });
      expect(
        db.query("SELECT next FROM counters WHERE name='valoraciones_inversion'").get(),
      ).toEqual({ next: 1 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.3 AC-24: the v24 DDL is empty after migration (no backfill)", () => {
  const dir = root();
  try {
    const path = join(dir, "no-backfill.sqlite");
    v23(path);
    const db = openDatabase(path);
    try {
      expect(
        db.query("SELECT COUNT(*) n FROM valoracion_inversion").get(),
      ).toEqual({ n: 0 });
      expect(
        db.query("SELECT COUNT(*) n FROM valoracion_inversion_audit").get(),
      ).toEqual({ n: 0 });
      expect(
        db.query("SELECT COUNT(*) n FROM valoracion_attempts").get(),
      ).toEqual({ n: 0 });
      expect(
        db
          .query("SELECT COUNT(*) n FROM operaciones_inversion WHERE id='1'")
          .get(),
      ).toEqual({ n: 1 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.3 AC-24: inconsistent foreign keys reject without a partial v24 base and reopen with FK active", () => {
  const dir = root();
  try {
    const path = join(dir, "v23-fk.sqlite");
    v23(path);
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
      "Contrato de esquema v23 desconocido o incompleto; no se modificará esta base.",
    );

    const check = new Database(path);
    try {
      expect(check.query("SELECT version FROM schema_version").get()).toEqual({
        version: 23,
      });
      expect(
        check
          .query(
            "SELECT COUNT(*) n FROM sqlite_master WHERE name IN ('valoracion_inversion','valoracion_inversion_audit','valoracion_attempts')",
          )
          .get(),
      ).toEqual({ n: 0 });
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
        version: 24,
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

test("E4.3 AC-24: a failed v24 migration rolls back to an intact v23 base", () => {
  const dir = root();
  try {
    const path = join(dir, "v23-rollback.sqlite");
    v23(path);
    const raw = new Database(path);
    const before = snapshot(raw);
    // The counter row is valid v23 data but collides with the v24 seed; the
    // migration must roll back every table instead of leaving a partial base.
    raw.run("INSERT INTO counters(name,next) VALUES('valoraciones_inversion',1)");
    raw.close();

    expect(() => openDatabase(path)).toThrow();

    const check = new Database(path);
    try {
      expect(check.query("SELECT version FROM schema_version").get()).toEqual({
        version: 23,
      });
      expect(
        check
          .query(
            "SELECT COUNT(*) n FROM sqlite_master WHERE name IN ('valoracion_inversion','valoracion_inversion_audit','valoracion_attempts')",
          )
          .get(),
      ).toEqual({ n: 0 });
      expect(snapshot(check)).toEqual(before);
      expect(
        check
          .query("SELECT next FROM counters WHERE name='valoraciones_inversion'")
          .get(),
      ).toEqual({ next: 1 });
    } finally {
      check.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.3 AC-24: a failure inside the v24 DDL rolls back the created tables", () => {
  const dir = root();
  try {
    const path = join(dir, "v23-mid-ddl.sqlite");
    v23(path);
    const db = new Database(path);
    try {
      // Force the first CREATE TABLE to fail after valoracionSchema has already
      // inserted the counter. Calling the function inside its transaction is the
      // only way to exercise the partial-DDL rollback: openDatabase rejects the
      // dummy table in the contract preflight before reaching this point.
      db.run("CREATE TABLE valoracion_inversion(id TEXT)");
      expect(() =>
        db.transaction(() => valoracionSchema(db)).immediate(),
      ).toThrow();
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 23,
      });
      expect(
        db
          .query("SELECT COUNT(*) n FROM counters WHERE name='valoraciones_inversion'")
          .get(),
      ).toEqual({ n: 0 });
      expect(
        db
          .query(
            "SELECT COUNT(*) n FROM sqlite_master WHERE name IN ('valoracion_inversion_audit','valoracion_attempts')",
          )
          .get(),
      ).toEqual({ n: 0 });
      expect(
        db
          .query("SELECT COUNT(*) n FROM sqlite_master WHERE name='valoracion_inversion'")
          .get(),
      ).toEqual({ n: 1 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
for (const unknown of [25, 999]) {
  test(`E4.3 AC-24: unknown schema version ${unknown} stays intact`, () => {
    const dir = root();
    try {
      const path = join(dir, `unknown-${unknown}.sqlite`);
      v23(path);
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

test("E4.3 AC-24: two starts are idempotent", () => {
  const dir = root();
  try {
    const path = join(dir, "twice.sqlite");
    v23(path);
    const first = openDatabase(path);
    const firstManifest = manifest(first);
    const firstData = snapshot(first);
    const firstCounters = counterSnapshot(first);
    first.close();

    const second = openDatabase(path);
    try {
      expect(second.query("SELECT version FROM schema_version").get()).toEqual({
        version: 24,
      });
      expect(manifest(second)).toEqual(firstManifest);
      expect(snapshot(second)).toEqual(firstData);
      expect(counterSnapshot(second)).toEqual(firstCounters);
      expect(second.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      second.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.3 AC-24: the valuation table has no ciclo_id and no DELETE", () => {
  const db = memory();
  try {
    const columns = (
      db.query("PRAGMA table_info(valoracion_inversion)").all() as {
        name: string;
      }[]
    ).map((column) => column.name);
    expect(columns).not.toContain("ciclo_id");
    insert(db, automatic());
    expect(() =>
      db.run("DELETE FROM valoracion_inversion WHERE id='VAL-000000000001'"),
    ).toThrow();
  } finally {
    db.close();
  }
});

test("E4.3 AC-24: manual zero is explicit and valid; negative is rejected", () => {
  const db = memory();
  try {
    insert(db, manual({ valor: 0 }));
    expect(
      db.query("SELECT valor_eur,tipo FROM valoracion_inversion").get(),
    ).toEqual({ valor_eur: 0, tipo: "Manual" });
    expect(() => insert(db, manual({ id: "VAL-000000000002", valor: -1 }))).toThrow();
  } finally {
    db.close();
  }
});

for (const [name, overrides] of [
  ["price", { precio: 1, divisa: "USD", cambio: 900000, cantidad: 1250000000 }],
  ["currency", { divisa: "EUR", cambio: 1000000 }],
  ["change", { cambio: 900000 }],
  ["quantity", { cantidad: 1250000000 }],
] as const) {
  test(`E4.3 AC-24: Manual rejects automatic field ${name}`, () => {
    const db = memory();
    try {
      expect(() => insert(db, manual(overrides as Partial<Row>))).toThrow();
    } finally {
      db.close();
    }
  });
}

for (const [name, overrides] of [
  ["price", { precio: null }],
  ["currency", { divisa: null }],
  ["change", { cambio: null }],
  ["quantity", { cantidad: null }],
] as const) {
  test(`E4.3 AC-24: Automática requires ${name}`, () => {
    const db = memory();
    try {
      expect(() => insert(db, automatic(overrides as Partial<Row>))).toThrow();
    } finally {
      db.close();
    }
  });
}

test("E4.3 AC-24: Automática EUR requires exchange exactly 1", () => {
  const db = memory();
  try {
    expect(() =>
      insert(db, automatic({ divisa: "EUR", cambio: 900000 })),
    ).toThrow();
    insert(db, automatic({ divisa: "EUR", cambio: 1000000 }));
  } finally {
    db.close();
  }
});

for (const [field, value] of [
  ["precio", 0],
  ["precio", -1],
  ["cambio", 0],
  ["cambio", -1],
  ["cantidad", 0],
  ["cantidad", -1],
  ["valor", -1],
] as const) {
  test(`E4.3 AC-24: rejects ${field}=${value}`, () => {
    const db = memory();
    try {
      const overrides =
        field === "valor"
          ? { valor: value }
          : field === "precio"
            ? { precio: value }
            : field === "cambio"
              ? { cambio: value }
              : { cantidad: value };
      expect(() => insert(db, automatic(overrides as Partial<Row>))).toThrow();
    } finally {
      db.close();
    }
  });
}

for (const [field, value] of [
  ["valor", 9007199254740992],
  ["precio", 9007199254740992],
  ["cambio", 9007199254740992],
  ["cantidad", 9007199254740992],
] as const) {
  test(`E4.3 AC-24: rejects ${field} above 2^53-1`, () => {
    const db = memory();
    try {
      const overrides =
        field === "valor"
          ? { valor: value }
          : field === "precio"
            ? { precio: value }
            : field === "cambio"
              ? { cambio: value }
              : { cantidad: value };
      expect(() => insert(db, automatic(overrides as Partial<Row>))).toThrow();
    } finally {
      db.close();
    }
  });
}

test("E4.3 AC-24: accepts the technical maximum 2^53-1", () => {
  const db = memory();
  try {
    insert(
      db,
      automatic({
        valor: 9007199254740991,
        precio: 9007199254740991,
        cambio: 9007199254740991,
        cantidad: 9007199254740991,
        divisa: "USD",
      }),
    );
  } finally {
    db.close();
  }
});

for (const [name, overrides] of [
  ["id without prefix", { id: "000000000001" }],
  ["id with wrong width", { id: "VAL-1" }],
  ["invalid calendar date", { fecha: "2026-02-30" }],
  ["invalid date shape", { fecha: "31/03/2026" }],
  ["blank procedure", { procedencia: "   " }],
  ["long procedure", { procedencia: "x".repeat(201) }],
  ["coverage other than Completa", { cobertura: "Parcial" }],
  ["blank actor", { actor: "  " }],
] as const) {
  test(`E4.3 AC-24: rejects ${name}`, () => {
    const db = memory();
    try {
      expect(() => insert(db, automatic(overrides as Partial<Row>))).toThrow();
    } finally {
      db.close();
    }
  });
}

test("E4.3 AC-24: one valuation per position and validity date", () => {
  const db = memory();
  try {
    insert(db, automatic());
    expect(() =>
      insert(db, automatic({ id: "VAL-000000000002", valor: 1 })),
    ).toThrow();
    insert(db, automatic({ id: "VAL-000000000003", instrumento: "I1002" }));
    insert(db, automatic({ id: "VAL-000000000004", fecha: "2026-04-30" }));
  } finally {
    db.close();
  }
});

test("E4.3 AC-24: the position must be an Inversión/Inversiones saldo", () => {
  const db = memory();
  try {
    expect(() => insert(db, automatic({ saldo: "S003" }))).toThrow();
    expect(() => insert(db, automatic({ instrumento: "I9999" }))).toThrow();
  } finally {
    db.close();
  }
});

test("E4.3 AC-24: initial insert must be revision 1 and carry no correction motive", () => {
  const db = memory();
  try {
    expect(() => insert(db, automatic({ revision: 2 }))).toThrow();
    expect(() => insert(db, automatic({ motivo: "Motivo no permitido" }))).toThrow();
  } finally {
    db.close();
  }
});

test("E4.3 AC-24: correction advances by one revision and requires a motive", () => {
  const db = memory();
  try {
    const row = automatic();
    insert(db, row);
    expect(() =>
      correct(db, row, { valor: 120000, motivo: null }),
    ).toThrow();
    // A revision jump is rejected even with a motive.
    expect(() =>
      db.run(
        `UPDATE valoracion_inversion SET revision=3,motivo_correccion='Motivo'
         WHERE id=?`,
        [row.id],
      ),
    ).toThrow();
    correct(db, row, { valor: 120000, motivo: "Corrección ficticia" });
    expect(
      db.query("SELECT revision,valor_eur,motivo_correccion FROM valoracion_inversion").get(),
    ).toEqual({
      revision: 2,
      valor_eur: 120000,
      motivo_correccion: "Corrección ficticia",
    });
  } finally {
    db.close();
  }
});

for (const [name, changes] of [
  ["id", { id: "VAL-000000000009" }],
  ["saldo", { saldo: "S003" }],
  ["instrument", { instrumento: "I1002" }],
  ["creation instant", { creado: "2026-01-02T00:00:00.000Z" }],
] as const) {
  test(`E4.3 AC-24: ${name} is immutable`, () => {
    const db = memory();
    try {
      const row = automatic();
      insert(db, row);
      const next = { ...row, ...changes, revision: 2, motivo: "Corrección ficticia" };
      const id = row.id;
      expect(() =>
        db.run(
          `UPDATE valoracion_inversion
           SET id=?,saldo_inversion=?,instrumento=?,creado_utc=?,revision=?,motivo_correccion=?
           WHERE id=?`,
          [
            next.id,
            next.saldo,
            next.instrumento,
            next.creado,
            next.revision,
            next.motivo,
            id,
          ],
        ),
      ).toThrow();
    } finally {
      db.close();
    }
  });
}

test("E4.3 AC-24: the audit is append-only", () => {
  const db = memory();
  try {
    const row = automatic();
    insert(db, row);
    audit(db, row);
    expect(() =>
      db.run("UPDATE valoracion_inversion_audit SET actor='otro' WHERE revision=1"),
    ).toThrow();
    expect(() => db.run("DELETE FROM valoracion_inversion_audit")).toThrow();
  } finally {
    db.close();
  }
});

test("E4.3 AC-24: the audit revision must match the valuation revision", () => {
  const db = memory();
  try {
    const row = automatic();
    insert(db, row);
    expect(() =>
      db.run(
        `INSERT INTO valoracion_inversion_audit(valoracion,revision,accion,anterior,
          posterior,motivo,instante,actor)
         VALUES('VAL-000000000001',2,'corrección','{}','{}','Motivo',?,'usuario-unico')`,
        [t],
      ),
    ).toThrow();
    audit(db, row);
  } finally {
    db.close();
  }
});

test("E4.3 AC-24: audit action payloads are constrained", () => {
  const db = memory();
  try {
    const row = automatic();
    insert(db, row);
    expect(() =>
      db.run(
        `INSERT INTO valoracion_inversion_audit(valoracion,revision,accion,anterior,
          posterior,motivo,instante,actor)
         VALUES('VAL-000000000001',1,'alta','{}','{}','Motivo',?,'usuario-unico')`,
        [t],
      ),
    ).toThrow();
    audit(db, row);
  } finally {
    db.close();
  }
});

test("E4.3 AC-24: audit correction requires previous state and motive", () => {
  const db = memory();
  try {
    const row = automatic();
    insert(db, row);
    correct(db, row, { valor: 120000, motivo: "Corrección ficticia" });
    expect(() =>
      db.run(
        `INSERT INTO valoracion_inversion_audit(valoracion,revision,accion,anterior,
          posterior,motivo,instante,actor)
         VALUES('VAL-000000000001',2,'corrección',NULL,'{}',NULL,?,'usuario-unico')`,
        [t],
      ),
    ).toThrow();
  } finally {
    db.close();
  }
});
