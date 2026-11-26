import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backup, restore } from "./backup";
import { restaurarTriggerDevolucionV32 } from "./cierre-validacion-test-support";
import { devolucionTriggerV33 } from "./comida-schema";
import { openDatabase } from "./database";
import { prepareSchema } from "./database-schema";
import { admitted, schemaVersion } from "./schema-catalog";
import { contract, manifest, verifyContract } from "./schema-contract";
import { materializeContract } from "../test-support/inversiones-schema";
import { sembrarDevolucionHuerfana } from "../test-support/devoluciones-historicas";

process.env.NODE_ENV = "test";

/**
 * #597 · SPEC39 §11.1 / AC-D43 — esquema v33: paridad entre base nueva y
 * migrada, atomicidad, preservación de hechos y rechazo de versiones o
 * contratos inesperados. Solo bases SQLite ficticias temporales.
 */
const c32 = "C32-SPEC38-VALIDACION-CIERRE";
const c33 = "C33-SPEC39-DEVOLUCION-TRIGGER";
const identidad = { origin: "demo", key_hash: null } as const;
const TRIGGER = "movimiento_devolucion_update_purchase";
const t = "2026-01-01T00:00:00.000Z";

const raiz = () => mkdtempSync(join(tmpdir(), "mf-v33-"));
const version = (db: Database) =>
  (db.query("SELECT version FROM schema_version").get() as { version: number })
    .version;

function nueva(path = ":memory:") {
  const db = new Database(path, { strict: true });
  prepareSchema(db, identidad);
  return db;
}

/** Contenido de todas las tablas salvo la propia marca de versión. */
function filas(db: Database) {
  return (
    db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'schema_version' ORDER BY name",
      )
      .all() as { name: string }[]
  ).map(({ name }) => [name, db.query(`SELECT * FROM "${name}"`).all()]);
}

/**
 * Base v32 genuina con hechos: compra vigente con abono Verificado, compra
 * anulada con vínculo histórico inconsistente (v32 lo admitía), huérfana y
 * auditoría. Se verifica contra C32 antes de devolverla.
 */
function v32ConHechos(path: string) {
  const db = nueva(path);
  db.run(
    `INSERT INTO categorias VALUES('CAT0001','Ficticia',NULL,'Gasto','Gasto',0,'Activa',1,?,?)`,
    [t, t],
  );
  db.run(
    `INSERT INTO subcategorias VALUES('SUB0001','Ficticia','CAT0001','Activa',1,?,?)`,
    [t, t],
  );
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR0001','Ficticia','SUB0001','Activa',1,?,?)`,
    [t, t],
  );
  const gasto = (id: string) =>
    db.run(
      `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,concepto,nota,revision,creado,actualizado)
       VALUES(?,'2026-01-04','Gasto',1000,'S001','S000','PAR0001','Gasto ficticio','',1,?,?)`,
      [id, t, t],
    );
  gasto("901");
  gasto("902");
  gasto("903");
  const vinculo = (compra: string) => {
    const id = sembrarDevolucionHuerfana(
      db,
      { fecha: "2026-01-10", importe: "3.00", saldo: "S001", concepto: "Abono ficticio" },
      Date.parse(t),
    );
    db.run(
      `INSERT INTO movimiento_devolucion(movimiento,compra,evidencia_relacion,elegibilidad,estado,revision_movimiento,revision,creado,actualizado)
       VALUES(?,?,'Evidencia ficticia','No acreditada','Verificado',1,1,?,?)`,
      [id, compra, t, t],
    );
    db.run(
      `INSERT INTO movimiento_devolucion_audit(movimiento,accion,revision,anterior,posterior,motivo,instante,actor)
       VALUES(?,'alta',1,NULL,'{}',NULL,?,'usuario-unico')`,
      [id, t],
    );
    return id;
  };
  const vigente = vinculo("901");
  const inconsistente = vinculo("902");
  db.run("UPDATE movimientos SET anulado=1 WHERE id='902'");
  sembrarDevolucionHuerfana(
    db,
    { fecha: "2026-01-11", importe: "1.00", saldo: "S001", concepto: "Huérfana ficticia" },
    Date.parse(t),
  );
  restaurarTriggerDevolucionV32(db);
  db.exec("UPDATE schema_version SET version=32");
  expect(verifyContract(db, 32)).toBe(c32);
  return { db, vigente, inconsistente };
}

test("v33: la base nueva cumple C33 y solo difiere de C32 en el trigger de compra", () => {
  const db = nueva();
  try {
    expect(schemaVersion).toBe(33);
    expect(version(db)).toBe(33);
    expect(manifest(db)).toEqual(contract(c33).objects);
    expect(verifyContract(db, 33)).toBe(c33);
    const clave = (o: { type: string; name: string }) => `${o.type}:${o.name}`;
    const previos = new Map(contract(c32).objects.map((o) => [clave(o), o.sql]));
    expect(contract(c33).objects.map(clave)).toEqual([...previos.keys()]);
    expect(
      contract(c33)
        .objects.filter((o) => previos.get(clave(o)) !== o.sql)
        .map(clave),
    ).toEqual([`trigger:${TRIGGER}`]);
    expect(
      contract(c33).objects.find((o) => o.name === TRIGGER)!.sql,
    ).toContain("c.anulado=0");
  } finally {
    db.close();
  }
});

for (const [origen, id] of Object.entries(admitted).filter(
  ([v]) => Number(v) < 33,
))
  test(`v33: una base v${origen} materializada desde su contrato migra al mismo C33 que una nueva`, () => {
    const dir = raiz();
    try {
      const path = materializeContract(join(dir, "origen.sqlite"), id);
      const db = new Database(path, { strict: true });
      expect(verifyContract(db, Number(origen))).toBe(id);
      prepareSchema(db, identidad);
      const fresca = nueva();
      expect(version(db)).toBe(33);
      expect(manifest(db)).toEqual(manifest(fresca));
      expect(verifyContract(db, 33)).toBe(c33);
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      fresca.close();
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

test("v33: v32→v33 preserva filas y auditoría, no degrada el histórico y es idempotente", () => {
  const dir = raiz();
  try {
    const path = join(dir, "v32.sqlite");
    const { db: antigua, vigente, inconsistente } = v32ConHechos(path);
    const antes = filas(antigua);
    antigua.close();

    const db = new Database(path, { strict: true });
    prepareSchema(db, identidad);
    expect(version(db)).toBe(33);
    expect(verifyContract(db, 33)).toBe(c33);
    expect(filas(db)).toEqual(antes);
    expect(db.query("PRAGMA integrity_check").get()).toEqual({
      integrity_check: "ok",
    });
    // El histórico se conserva Verificado; reescribirlo contra la compra anulada
    // queda impedido y la reatribución a una compra vigente sigue siendo posible.
    const actualizar = (compra: string) =>
      db.run(
        "UPDATE movimiento_devolucion SET compra=?,revision=revision+1 WHERE movimiento=?",
        [compra, inconsistente],
      );
    expect(() => actualizar("902")).toThrow("invalid purchase attribution");
    expect(() =>
      db.run("UPDATE movimiento_devolucion SET compra='902' WHERE movimiento=?", [
        vigente,
      ]),
    ).toThrow("invalid purchase attribution");
    expect(filas(db)).toEqual(antes);
    expect(() => actualizar("903")).not.toThrow();
    const despues = filas(db);
    db.close();

    const reabierta = new Database(path, { strict: true });
    prepareSchema(reabierta, identidad);
    expect(version(reabierta)).toBe(33);
    expect(filas(reabierta)).toEqual(despues);
    expect(manifest(reabierta)).toEqual(contract(c33).objects);
    reabierta.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Hace fallar la migración justo después de ejecutar `sentencias` del bloque que
 * rehace el trigger, dentro de la transacción de `prepareSchema`.
 */
function sabotear(db: Database, sentencias: "drop" | "bloque") {
  const original = db.exec.bind(db);
  let activado = false;
  db.exec = ((sql: string, ...resto: never[]) => {
    if (sql.includes(`DROP TRIGGER IF EXISTS ${TRIGGER}`)) {
      activado = true;
      original(
        sentencias === "drop" ? `DROP TRIGGER IF EXISTS ${TRIGGER};` : sql,
      );
      throw new Error("fallo ficticio de migración");
    }
    return original(sql, ...resto);
  }) as Database["exec"];
  return () => activado;
}

for (const punto of ["drop", "bloque"] as const)
  test(`v33: un fallo en v32→v33 (${punto}) revierte DDL, versión y filas`, () => {
    const dir = raiz();
    try {
      const path = join(dir, "v32.sqlite");
      const { db: antigua } = v32ConHechos(path);
      const antes = { filas: filas(antigua), manifiesto: manifest(antigua) };
      antigua.close();

      const db = new Database(path, { strict: true });
      const activado = sabotear(db, punto);
      expect(() => prepareSchema(db, identidad)).toThrow(
        "fallo ficticio de migración",
      );
      expect(activado()).toBe(true);

      const tras = new Database(path, { strict: true });
      expect(version(tras)).toBe(32);
      expect(manifest(tras)).toEqual(antes.manifiesto);
      expect(verifyContract(tras, 32)).toBe(c32);
      expect(filas(tras)).toEqual(antes.filas);
      // La misma base migra después sin intervención.
      prepareSchema(tras, identidad);
      expect(verifyContract(tras, 33)).toBe(c33);
      expect(filas(tras)).toEqual(antes.filas);
      tras.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

test("v33: un fallo al final de una cadena v31→v33 deja la base íntegramente en v31", () => {
  const dir = raiz();
  try {
    const id = admitted[31];
    const path = materializeContract(join(dir, "v31.sqlite"), id);
    const db = new Database(path, { strict: true });
    const activado = sabotear(db, "bloque");
    expect(() => prepareSchema(db, identidad)).toThrow(
      "fallo ficticio de migración",
    );
    expect(activado()).toBe(true);
    const tras = new Database(path, { strict: true });
    expect(version(tras)).toBe(31);
    expect(manifest(tras)).toEqual(contract(id).objects);
    tras.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("v33: la migración rechaza cualquier versión previa distinta de 32 sin escribir", () => {
  for (const inesperada of [31, 33, 34]) {
    const db = nueva();
    db.exec(`UPDATE schema_version SET version=${inesperada}`);
    const antes = manifest(db);
    expect(() => devolucionTriggerV33(db)).toThrow(
      "Esquema previo inesperado para migración Devoluciones v33.",
    );
    expect(manifest(db)).toEqual(antes);
    expect(version(db)).toBe(inesperada);
    db.close();
  }
});

test("v33: contratos inesperados o versión desconocida se rechazan antes de escribir", () => {
  const casos: [string, (db: Database) => void, string][] = [
    [
      "v32 con el trigger ya cambiado",
      (db) => db.exec("UPDATE schema_version SET version=32"),
      "Contrato de esquema v32 desconocido o incompleto; no se modificará esta base.",
    ],
    [
      "v33 con el trigger anterior",
      (db) => restaurarTriggerDevolucionV32(db),
      "Contrato de esquema v33 desconocido o incompleto; no se modificará esta base.",
    ],
    [
      "v34",
      (db) => db.exec("UPDATE schema_version SET version=34"),
      "Esquema no compatible; no se modificará esta base.",
    ],
  ];
  for (const [nombre, alterar, mensaje] of casos) {
    const dir = raiz();
    try {
      const path = join(dir, "x.sqlite");
      const db = nueva(path);
      alterar(db);
      const antes = { version: version(db), manifiesto: manifest(db) };
      db.close();
      const abierta = new Database(path, { strict: true });
      expect(() => prepareSchema(abierta, identidad), nombre).toThrow(mensaje);
      const tras = new Database(path, { strict: true });
      expect({ version: version(tras), manifiesto: manifest(tras) }).toEqual(antes);
      tras.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

/** Tablas que la restauración vacía a propósito (sesiones e intentos). */
const revocada = (tabla: string) =>
  tabla.endsWith("_attempts") ||
  ["sessions", "challenges", "bootstrap", "recovery", "auth_limits", "idempotency"].includes(tabla);
const conservadas = (db: Database) =>
  filas(db).filter(([tabla]) => !revocada(tabla as string));

function destinatario(dir: string) {
  const identity = join(dir, "identity.txt");
  const age = process.env.AGE_KEYGEN_BIN ?? "age-keygen";
  expect(Bun.spawnSync([age, "-o", identity]).exitCode).toBe(0);
  const recipient = Bun.spawnSync([age, "-y", identity], { stdout: "pipe" })
    .stdout.toString()
    .trim();
  return { identity, recipient };
}

// `publishNewDirectory` es específico de Linux (libc.so.6/renameat2).
for (const origen of [32, 33] as const)
  test.skipIf(process.platform !== "linux")(
    `v33: backup/restore cifrado de un snapshot v${origen} abre en v33 con los mismos hechos`,
    () => {
      const dir = raiz();
      try {
        const path = join(dir, "origen.sqlite");
        const { db: antigua, inconsistente } = v32ConHechos(path);
        if (origen === 33) prepareSchema(antigua, identidad);
        // `prepareSchema` fija el modo WAL; la copia parte de la base tal cual.
        const antes = conservadas(antigua);
        const { identity, recipient } = destinatario(dir);
        backup(antigua, randomBytes(32), join(dir, "corte"), recipient);
        antigua.close();

        const restaurada = restore(join(dir, "corte"), join(dir, "restaurada"), identity);
        const copia = new Database(restaurada.database, { strict: true });
        expect(version(copia)).toBe(origen);
        expect(verifyContract(copia, origen)).toBe(origen === 32 ? c32 : c33);
        expect(conservadas(copia)).toEqual(antes);
        copia.close();

        for (let apertura = 0; apertura < 2; apertura++) {
          const abierta = openDatabase(restaurada.database);
          expect(version(abierta)).toBe(33);
          expect(verifyContract(abierta, 33)).toBe(c33);
          expect(conservadas(abierta)).toEqual(antes);
          expect(
            abierta
              .query("SELECT compra,estado,revision FROM movimiento_devolucion WHERE movimiento=?")
              .get(inconsistente),
          ).toEqual({ compra: "902", estado: "Verificado", revision: 1 });
          expect(abierta.query("PRAGMA foreign_key_check").all()).toEqual([]);
          abierta.close();
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );
