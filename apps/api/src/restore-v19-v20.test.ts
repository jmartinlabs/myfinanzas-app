import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { backup, restore } from "./backup";
import { openDatabase } from "./database";
import { comidaSchema } from "./comida-schema";
import { openDatabaseV18 } from "../test-support/database-v18";
import { materializeContract } from "../test-support/inversiones-schema";
import { revisionComidaFixture } from "../test-support/revision-comida-fixture";

const now = Date.parse("2026-10-31T12:00:00Z");

function ageIdentity(dir: string) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const identity = join(dir, "identity.txt");
  expect(
    Bun.spawnSync(["age-keygen", "-o", identity], { stderr: "pipe" }).exitCode,
  ).toBe(0);
  const recipient = Bun.spawnSync(["age-keygen", "-y", identity], {
    stderr: "pipe",
  });
  expect(recipient.exitCode).toBe(0);
  return { identity, recipient: recipient.stdout.toString().trim() };
}

function version(path: string) {
  const db = new Database(path, { readonly: true, strict: true });
  try {
    return (db.query("SELECT version FROM schema_version").get() as {
      version: number;
    }).version;
  } finally {
    db.close();
  }
}

function manifest(bundle: string, identity: string) {
  const decrypted = Bun.spawnSync(
    ["age", "-d", "-i", identity, join(bundle, "database.age")],
    { stdout: "pipe", stderr: "pipe" },
  );
  expect(decrypted.exitCode).toBe(0);
  return JSON.parse(decrypted.stdout.toString()).manifest as {
    app: string;
    schema: number;
    origin: string;
  };
}

function seedAccess(db: Database) {
  db.run(
    "INSERT INTO sessions(hash,csrf,created,seen) VALUES('session-fixture','csrf-fixture',1,1)",
  );
  db.run("INSERT INTO challenges(hash,expires,attempts) VALUES('challenge-fixture',9999999999,0)");
  db.run("INSERT INTO recovery(hash) VALUES('recovery-fixture')");
  db.run(
    "INSERT INTO movement_attempts(key,hash,response,expires) VALUES('move-attempt','hash','{}',9999999999)",
  );
}

function seedV19(path: string) {
  const db = openDatabaseV18(path);
  try {
    db.transaction(() => comidaSchema(db)).immediate();
    revisionComidaFixture(db);
    db.run(`
      INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,nota,anulado,revision,creado,actualizado,referencia,capital,intereses)
      VALUES
        ('301','2026-10-10','Gasto',10000,'S001','S000',NULL,'PAR001','Compra v19 ficticia','',0,1,'f','f',NULL,NULL,NULL),
        ('302','2026-10-11','Devolución de gasto',2000,'S000','S001',NULL,'PAR001','Devolución v19 ficticia','',0,1,'f','f',NULL,NULL,NULL);
      INSERT INTO movimiento_revision_comida(movimiento,etiqueta,evidencia_bancaria,evidencia_comercial,estado_revision,revision_movimiento,revision,creado,actualizado)
      VALUES('301','Comida','evidencia bancaria ficticia',NULL,'Revisada',1,1,'f','f');
      INSERT INTO movimiento_devolucion(movimiento,compra,partida,ciclo_origen,evidencia_relacion,evidencia_origen_temporal,elegibilidad,estado,revision_movimiento,revision,creado,actualizado)
      VALUES('302','301','PAR001','1','evidencia relación ficticia','evidencia temporal ficticia','Acreditada','Verificado',1,1,'f','f');
      INSERT INTO comida_devolucion_attempts(key,hash,response,expires)
      VALUES('comida-attempt','hash','{}',9999999999);
      INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo)
      VALUES('movimiento','alta',1,'{"id":"301"}','2026-10-10T00:00:00.000Z',0,'fixture','seed v19');
    `);
    seedAccess(db);
  } finally {
    db.close();
  }
}

function seedV20(path: string) {
  process.env.NODE_ENV = "test";
  materializeContract(path, "C20-DPRIMA-SIMPLIFICADA", (db) => {
    revisionComidaFixture(db);
    db.run(`
      INSERT INTO presupuestos(id,nombre,fuente,destino,estado,revision,creado,actualizado)
      VALUES('PRE0001','Presupuesto ficticio v20','No aplica',NULL,'Activo',1,'f','f');
      INSERT INTO annual_plan_lines(ejercicio,partida,presupuesto,periodo,esencial,revision)
      VALUES(2026,'PAR001',10000,'2026','Sí',1);
      INSERT INTO dprima_mapping(id,presupuesto,partida,relacion,motivo,evidencia,estado,revision,creado,actualizado)
      VALUES(1,'PRE0001','PAR001','Raíz','Mapping ficticio v20',NULL,'Confirmada',1,'f','f');
      INSERT INTO dprima_mapping_attempts(key,hash,response,expires)
      VALUES('mapping-attempt','hash','{}',9999999999);
    `);
    seedAccess(db);
    db.run(
      "INSERT INTO movement_attempts(key,hash,response,expires) VALUES('move-attempt-2','hash','{}',9999999999)",
    );
  });
}

test("RESTORE-19/20: v19 cifrado conserva Comida y migra a v20", () => {
  process.env.NODE_ENV = "test";
  const dir = mkdtempSync(join(tmpdir(), "restore-v19-"));
  try {
    const source = join(dir, "source.sqlite");
    seedV19(source);
    const { identity, recipient } = ageIdentity(dir);
    const key = randomBytes(32);
    const bundle = join(dir, "cut");
    const sourceDb = new Database(source, { strict: true });
    try {
      backup(sourceDb, key, bundle, recipient, now);
    } finally {
      sourceDb.close();
    }

    expect(manifest(bundle, identity)).toMatchObject({
      app: "e3.4-v19",
      schema: 19,
      origin: "demo",
    });

    const restored = restore(bundle, join(dir, "restored"), identity, { now });
    expect(version(restored.database)).toBe(19);

    const copy = new Database(restored.database, {
      readonly: true,
      strict: true,
    });
    try {
      expect(
        copy.query("SELECT COUNT(*) n FROM movimientos WHERE id IN ('301','302')").get(),
      ).toEqual({ n: 2 });
      expect(
        copy
          .query(
            "SELECT compra,estado,elegibilidad FROM movimiento_devolucion WHERE movimiento='302'",
          )
          .get(),
      ).toEqual({
        compra: "301",
        estado: "Verificado",
        elegibilidad: "Acreditada",
      });
      expect(
        copy.query("SELECT COUNT(*) n FROM movimiento_revision_comida WHERE movimiento='301'").get(),
      ).toEqual({ n: 1 });
      expect(copy.query("SELECT COUNT(*) n FROM sessions").get()).toEqual({ n: 0 });
      expect(copy.query("SELECT COUNT(*) n FROM challenges").get()).toEqual({ n: 0 });
      expect(copy.query("SELECT COUNT(*) n FROM recovery").get()).toEqual({ n: 0 });
      expect(copy.query("SELECT COUNT(*) n FROM movement_attempts").get()).toEqual({ n: 0 });
      expect(copy.query("SELECT COUNT(*) n FROM comida_devolucion_attempts").get()).toEqual({ n: 0 });
      expect(copy.query("SELECT COUNT(*) n FROM audit").get()).toEqual({ n: 1 });
    } finally {
      copy.close();
    }

    const migrated = openDatabase(restored.database);
    try {
      expect(migrated.query("SELECT version FROM schema_version").get()).toEqual({
        version: 21,
      });
      expect(
        migrated.query("SELECT COUNT(*) n FROM movimientos WHERE id IN ('301','302')").get(),
      ).toEqual({ n: 2 });
      expect(
        migrated
          .query(
            "SELECT compra,estado,elegibilidad FROM movimiento_devolucion WHERE movimiento='302'",
          )
          .get(),
      ).toEqual({
        compra: "301",
        estado: "Verificado",
        elegibilidad: "Acreditada",
      });
      expect(
        migrated.query("SELECT COUNT(*) n FROM movimiento_revision_comida WHERE movimiento='301'").get(),
      ).toEqual({ n: 1 });
    } finally {
      migrated.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RESTORE-19/20: v20 cifrado conserva D′ y revoca accesos", () => {
  process.env.NODE_ENV = "test";
  const dir = mkdtempSync(join(tmpdir(), "restore-v20-"));
  try {
    const source = join(dir, "source.sqlite");
    seedV20(source);
    const { identity, recipient } = ageIdentity(dir);
    const key = randomBytes(32);
    const bundle = join(dir, "cut");
    const sourceDb = new Database(source, { strict: true });
    try {
      backup(sourceDb, key, bundle, recipient, now);
    } finally {
      sourceDb.close();
    }

    expect(manifest(bundle, identity)).toMatchObject({
      app: "e2.7-v20",
      schema: 20,
      origin: "demo",
    });

    const restored = restore(bundle, join(dir, "restored"), identity, { now });
    expect(version(restored.database)).toBe(21);

    const copy = new Database(restored.database, {
      readonly: true,
      strict: true,
    });
    try {
      expect(
        copy.query("SELECT COUNT(*) n FROM presupuestos WHERE id='PRE0001'").get(),
      ).toEqual({ n: 1 });
      expect(
        copy
          .query(
            "SELECT presupuesto,relacion,estado FROM dprima_mapping WHERE id=1",
          )
          .get(),
      ).toEqual({
        presupuesto: "PRE0001",
        relacion: "Raíz",
        estado: "Confirmada",
      });
      expect(
        copy
          .query(
            "SELECT presupuesto,esencial FROM annual_plan_lines WHERE ejercicio=2026 AND partida='PAR001'",
          )
          .get(),
      ).toEqual({ presupuesto: 10000, esencial: "Sí" });
      expect(copy.query("SELECT COUNT(*) n FROM sessions").get()).toEqual({ n: 0 });
      expect(copy.query("SELECT COUNT(*) n FROM challenges").get()).toEqual({ n: 0 });
      expect(copy.query("SELECT COUNT(*) n FROM recovery").get()).toEqual({ n: 0 });
      expect(copy.query("SELECT COUNT(*) n FROM movement_attempts").get()).toEqual({ n: 0 });
      expect(copy.query("SELECT COUNT(*) n FROM dprima_mapping_attempts").get()).toEqual({ n: 0 });
    } finally {
      copy.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("RESTORE-19/20: negativos no publican destino parcial", () => {
  process.env.NODE_ENV = "test";
  const dir = mkdtempSync(join(tmpdir(), "restore-negative-"));
  try {
    const source = join(dir, "source.sqlite");
    seedV20(source);
    const { identity, recipient } = ageIdentity(dir);
    const bundle = join(dir, "cut");
    const sourceDb = new Database(source, { strict: true });
    try {
      backup(sourceDb, randomBytes(32), bundle, recipient, now);
    } finally {
      sourceDb.close();
    }

    const corrupt = join(dir, "corrupt");
    cpSync(bundle, corrupt, { recursive: true });
    writeFileSync(join(corrupt, "database.age"), "interrupted");
    expect(() => restore(corrupt, join(dir, "bad"), identity, { now })).toThrow();
    expect(existsSync(join(dir, "bad"))).toBe(false);

    expect(() =>
      restore(bundle, join(dir, "old"), identity, { now: now + 86400001 }),
    ).toThrow("Antigüedad");
    expect(existsSync(join(dir, "old"))).toBe(false);

    const other = ageIdentity(join(dir, "other"));
    expect(() => restore(bundle, join(dir, "wrong-key"), other.identity, { now })).toThrow();
    expect(existsSync(join(dir, "wrong-key"))).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
