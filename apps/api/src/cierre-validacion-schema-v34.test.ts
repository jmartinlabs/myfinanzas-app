import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backup, restore } from "./backup";
import { cierreValidacionTriggerV34 } from "./cierre-validacion-schema";
import { restaurarTriggerConfirmacionV33 } from "./cierre-validacion-test-support";
import { openDatabase } from "./database";
import { prepareSchema } from "./database-schema";
import { admitted, schemaVersion } from "./schema-catalog";
import { contract, manifest, verifyContract } from "./schema-contract";
import { materializeContract } from "../test-support/inversiones-schema";

process.env.NODE_ENV = "test";

/**
 * #598 · SPEC38 — esquema v34: paridad entre base nueva y migrada, atomicidad,
 * preservación de filas `"2"`, avance `"2" → "3"`, rechazo `"3" → "2"` y
 * rechazo de versiones o contratos inesperados.
 */
const c33 = "C33-SPEC39-DEVOLUCION-TRIGGER";
const c34 = "C34-SPEC38-VALIDACION-VERSION-CONJUNTO";
const identidad = { origin: "demo", key_hash: null } as const;
const TRIGGER = "cierre_validacion_confirmacion";
const t0 = "2026-01-01T00:00:00.000Z";
const t1 = "2026-01-02T00:00:00.000Z";
const t2 = "2026-01-03T00:00:00.000Z";
const HUELLA_A = "a".repeat(64);
const HUELLA_B = "b".repeat(64);
const DETALLE_VACIO = '{"hechos":[],"ciclos":[],"cobertura":[],"procedencia":[]}';

const raiz = () => mkdtempSync(join(tmpdir(), "mf-v34-"));
const version = (db: Database) =>
  (db.query("SELECT version FROM schema_version").get() as { version: number })
    .version;

function nueva(path = ":memory:") {
  const db = new Database(path, { strict: true });
  prepareSchema(db, identidad);
  return db;
}

function v33ConFilas(path: string) {
  const db = nueva(path);
  db.run(
    `INSERT INTO ciclos(id,inicio,saldo_comida,creado)
     VALUES('2026-01','2026-01-01',0,?)`,
    [t0],
  );
  db.run(
    `INSERT INTO ciclos(id,inicio,saldo_comida,creado)
     VALUES('2026-02','2026-02-01',0,?)`,
    [t0],
  );
  db.run(
    `INSERT INTO cierre_validacion(ciclo,huella_validacion,version_conjunto,revision,revision_actor,revision_instante,dirty,cobertura)
     VALUES('2026-01',?,'2',1,'usuario',?,0,'[]')`,
    [HUELLA_A, t0],
  );
  db.run(
    `UPDATE cierre_validacion SET dirty=1, dirty_desde=?, dirty_ultimo=?, dirty_origen='Operacion', dirty_motivos='["FLUJO_CICLO"]' WHERE ciclo='2026-01'`,
    [t1, t1],
  );
  db.run(
    `INSERT INTO cierre_validacion(ciclo,huella_validacion,version_conjunto,revision,revision_actor,revision_instante,dirty,cobertura)
     VALUES('2026-02',?,'2',1,'usuario',?,0,'[]')`,
    [HUELLA_A, t0],
  );
  restaurarTriggerConfirmacionV33(db);
  db.exec("UPDATE schema_version SET version=33");
  expect(verifyContract(db, 33)).toBe(c33);
  return db;
}

test("v34: la base nueva cumple C34 y solo difiere de C33 en el trigger de confirmación", () => {
  const db = nueva();
  try {
    expect(schemaVersion).toBe(34);
    expect(version(db)).toBe(34);
    expect(manifest(db)).toEqual(contract(c34).objects);
    expect(verifyContract(db, 34)).toBe(c34);
    const clave = (o: { type: string; name: string }) => `${o.type}:${o.name}`;
    const prev = new Map(contract(c33).objects.map((o) => [clave(o), o]));
    const curr = new Map(contract(c34).objects.map((o) => [clave(o), o]));
    expect([...curr.keys()]).toEqual([...prev.keys()]);
    const distintas = [...curr.keys()].filter(
      (k) => JSON.stringify(curr.get(k)) !== JSON.stringify(prev.get(k)),
    );
    expect(distintas).toEqual([`trigger:${TRIGGER}`]);
  } finally {
    db.close();
  }
});

test("v34: migración desde v14..v33 alcanza C34 con foreign_key_check limpio", () => {
  for (const v of [14, 20, 25, 31, 32, 33] as const) {
    const id = admitted[v];
    const dir = raiz();
    const path = join(dir, `v${v}.sqlite`);
    materializeContract(path, id);
    const migrated = openDatabase(path);
    try {
      expect(version(migrated)).toBe(34);
      expect(verifyContract(migrated, 34)).toBe(c34);
      expect(migrated.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      migrated.close();
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("v34: preserva filas '2' sin reescribir ni limpiar dirty, permite '2'->'3' y rechaza '3'->'2'", () => {
  const dir = raiz();
  const path = join(dir, "v33.sqlite");
  v33ConFilas(path).close();

  const db = openDatabase(path);
  try {
    expect(version(db)).toBe(34);
    const filas = db
      .query("SELECT ciclo, version_conjunto, dirty, revision FROM cierre_validacion ORDER BY ciclo")
      .all() as { ciclo: string; version_conjunto: string; dirty: number; revision: number }[];
    expect(filas).toEqual([
      { ciclo: "2026-01", version_conjunto: "2", dirty: 1, revision: 1 },
      { ciclo: "2026-02", version_conjunto: "2", dirty: 0, revision: 1 },
    ]);

    // Confirmación '2' -> '3'
    db.run(
      `UPDATE cierre_validacion
       SET huella_validacion=?, version_conjunto='3',
           revision=2, revision_actor='usuario', revision_instante=?,
           dirty=0, dirty_desde=NULL, dirty_ultimo=NULL, dirty_origen=NULL, dirty_motivos=NULL
       WHERE ciclo='2026-01'`,
      [HUELLA_B, t2],
    );

    // Revalidación '2' -> '3'
    db.run(
      `UPDATE cierre_validacion
       SET huella_validacion=?, version_conjunto='3',
           revision=2, revision_actor='usuario', revision_instante=?
       WHERE ciclo='2026-02'`,
      [HUELLA_B, t2],
    );

    // Rechazo '3' -> '2' al confirmar tras marcar dirty
    db.run(
      `UPDATE cierre_validacion SET dirty=1, dirty_desde=?, dirty_ultimo=?, dirty_origen='Operacion', dirty_motivos='["FLUJO_CICLO"]' WHERE ciclo='2026-01'`,
      ["2026-01-04T00:00:00.000Z", "2026-01-04T00:00:00.000Z"],
    );
    expect(() =>
      db.run(
        `UPDATE cierre_validacion
         SET huella_validacion=?, version_conjunto='2',
             revision=3, revision_actor='usuario', revision_instante=?,
             dirty=0, dirty_desde=NULL, dirty_ultimo=NULL, dirty_origen=NULL, dirty_motivos=NULL
         WHERE ciclo='2026-01'`,
        [HUELLA_A, "2026-01-05T00:00:00.000Z"],
      ),
    ).toThrow(/confirmar la revision exige referencia nueva del conjunto actual/);

    // Idempotencia al reabrir
    db.close();
    const reopened = openDatabase(path);
    expect(version(reopened)).toBe(34);
    expect(verifyContract(reopened, 34)).toBe(c34);
    reopened.close();
  } finally {
    try {
      db.close();
    } catch {
      /* already closed */
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

test("v34: atomicidad ante fallo en el bloque y rechazo de versiones/contratos corruptos", () => {
  const dir = raiz();
  const path = join(dir, "atomic.sqlite");
  const db = v33ConFilas(path);
  try {
    expect(() =>
      db.transaction(() => {
        db.exec(`DROP TRIGGER IF EXISTS ${TRIGGER};`);
        throw new Error("fallo simulado");
      })(),
    ).toThrow("fallo simulado");
    expect(version(db)).toBe(33);
    expect(verifyContract(db, 33)).toBe(c33);

    expect(() => cierreValidacionTriggerV34(db)).not.toThrow();
    expect(version(db)).toBe(34);
    expect(() => cierreValidacionTriggerV34(db)).toThrow(
      "Esquema previo inesperado para migración Validación v34.",
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("v34: rechaza contrato C33 corrupto y versión desconocida 35", () => {
  const dir = raiz();
  const path = join(dir, "corrupt.sqlite");
  const db = v33ConFilas(path);
  db.exec(`DROP TRIGGER ${TRIGGER}`);
  db.close();
  expect(() => openDatabase(path)).toThrow();

  const path35 = join(dir, "v35.sqlite");
  const db35 = nueva(path35);
  db35.exec("UPDATE schema_version SET version=35");
  db35.close();
  expect(() => openDatabase(path35)).toThrow();
  rmSync(dir, { recursive: true, force: true });
});

function destinatario(dir: string) {
  const identity = join(dir, "identity.txt");
  const age = process.env.AGE_KEYGEN_BIN ?? "age-keygen";
  expect(Bun.spawnSync([age, "-o", identity]).exitCode).toBe(0);
  const recipient = Bun.spawnSync([age, "-y", identity], { stdout: "pipe" })
    .stdout.toString()
    .trim();
  return { identity, recipient };
}

test.skipIf(process.platform !== "linux")(
  "v34: backup y restore preservan C34 y e39.2-v34",
  () => {
    const dir = raiz();
    const path = join(dir, "src.sqlite");
    const db = nueva(path);
    const { identity, recipient } = destinatario(dir);
    try {
      backup(db, randomBytes(32), join(dir, "corte"), recipient);
    } finally {
      db.close();
    }
    const restaurada = restore(join(dir, "corte"), join(dir, "restored"), identity);
    const restored = openDatabase(restaurada.database);
    try {
      expect(version(restored)).toBe(34);
      expect(verifyContract(restored, 34)).toBe(c34);
    } finally {
      restored.close();
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
