import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { openDatabase } from "./database";
import { prepareSchema } from "./database-schema";
import { backup, restore } from "./backup";
import { contract, manifest, verifyContract } from "./schema-contract";
import { spec37SchemaV30 } from "./spec37-schema";

process.env.NODE_ENV = "test";

/**
 * I1 · gate `G-v30` (SPEC37). Solo esquema: la migración, sus restricciones y su
 * reversibilidad. No hay consumidores de estas columnas todavía; su comportamiento
 * funcional se acredita en I2–I6 y los 43 AC siguen `UNRUN`.
 */
const t = "2026-01-01T00:00:00.000Z";
const c29 = "C29-REPARTO-ORIGEN-86DED4B";
const c30 = "C30-SPEC37-COORDINADO-0E1F34D";
const root = () => mkdtempSync(join(tmpdir(), ".tmp-spec37-"));

function store() {
  const db = new Database(":memory:", { strict: true });
  prepareSchema(db, { origin: "demo", key_hash: null });
  return db;
}

/**
 * Reconstruye una base v29 genuina desde una v30 retirando exactamente lo que
 * añade I1. Se verifica contra C29: si el contrato cuadra, es una v29 por el mismo
 * criterio que usa el proyecto, no una imitación.
 */
function revertToV29(db: Database) {
  db.exec(`
    DROP INDEX transferencia_pendiente_gasto_activo;
    DROP TABLE operacion_coordinada_attempts;
    DROP TRIGGER transferencia_pendiente_modalidad_inmutable;
    DROP TRIGGER transferencia_pendiente_modalidad_coherente_insert;
    DROP TRIGGER transferencia_pendiente_modalidad_coherente_update;
    ALTER TABLE transferencia_pendiente DROP COLUMN modalidad;
    ALTER TABLE transferencia_pendiente DROP COLUMN gasto_revision;
    ALTER TABLE transferencia_pendiente DROP COLUMN anticipo_previsto;
    UPDATE schema_version SET version=29;`);
  expect(verifyContract(db, 29)).toBe(c29);
}

function cycle(db: Database, id = "1") {
  db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,0,?)", [
    id,
    "2026-01-01",
    t,
  ]);
}

function classification(db: Database) {
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
}

function budget(db: Database, id = "PRE0001", destino = "S002") {
  db.run(
    `INSERT INTO presupuestos(id,nombre,fuente,destino,estado,revision,creado,actualizado)
     VALUES(?,'Presupuesto ficticio','Aportación a saldo',?,'Activo',1,?,?)`,
    [id, destino, t, t],
  );
}

function reparto(db: Database) {
  db.run(
    `INSERT INTO repartos(ciclo,fuente_plan,estado,origen_comun,revision,creado,actualizado)
     VALUES('1','PlanCiclo','Borrador','S001',1,?,?)`,
    [t, t],
  );
  return (db.query("SELECT last_insert_rowid() AS id").get() as { id: number }).id;
}

function generate(db: Database, repartoId: number) {
  db.run(
    "UPDATE repartos SET estado='Generado',revision=revision+1,actualizado=? WHERE id=?",
    [t, repartoId],
  );
}

function line(db: Database, repartoId: number) {
  db.run(
    `INSERT INTO reparto_lineas(reparto,clase,presupuesto,partida,origen,destino,importe,
       fecha_prevista,concepto,nota,incluida,motivo_exclusion,revision,creado,actualizado)
     VALUES(?,'Presupuesto','PRE0001',NULL,'S001','S002',10000,'2026-01-05','Ficticio','',1,NULL,1,?,?)`,
    [repartoId, t, t],
  );
  return (db.query("SELECT last_insert_rowid() AS id").get() as { id: number }).id;
}

/** Gasto real (válido por el CHECK de `movimientos`: destino S000 y partida). */
function gasto(db: Database, id: string, fecha = "2026-01-04") {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,
       concepto,nota,anulado,revision,creado,actualizado)
     VALUES(?,?,'Gasto',1000,'S001','S000',NULL,'PAR0001','Gasto ficticio','',0,1,?,?)`,
    [id, fecha, t, t],
  );
}

/** Transferencia real que puede confirmar el pendiente Reparto de `line`. */
function transferencia(db: Database, id: string, importe = 10000) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,concepto,nota,
       anulado,revision,creado,actualizado)
     VALUES(?, '2026-01-06','Transferencia',?,'S001','S002','Transferencia ficticia','',0,1,?,?)`,
    [id, importe, t, t],
  );
}

/** Pendiente `Reparto` válido en v29 y en v30 (las columnas nuevas quedan nulas). */
function repartoPendiente(db: Database, repartoLinea: number) {
  db.run(
    `INSERT INTO transferencia_pendiente(estado,importe,origen,destino,ciclo_origen,
       fecha_prevista,fecha_efectiva,concepto,nota,origen_tipo,reparto_linea,gasto,
       anticipo,movimiento,motivo_cancelacion,revision,creado,actualizado)
     VALUES('Pendiente de realizar',10000,'S001','S002','1','2026-01-05',NULL,
       'Ficticio','','Reparto',?,NULL,NULL,NULL,NULL,1,?,?)`,
    [repartoLinea, t, t],
  );
  return (db.query("SELECT last_insert_rowid() AS id").get() as { id: number }).id;
}

/** Pendiente `RegistroCoordinado`: sólo válido desde v30. */
function coordinadoPendiente(
  db: Database,
  options: {
    gasto?: string;
    modalidad?: string | null;
    gastoRevision?: number | null;
    anticipoPrevisto?: string | null;
  } = {},
) {
  const row = {
    gasto: "1",
    modalidad: "A" as string | null,
    gastoRevision: null as number | null,
    anticipoPrevisto: null as string | null,
    ...options,
  };
  db.run(
    `INSERT INTO transferencia_pendiente(estado,importe,origen,destino,ciclo_origen,
       fecha_prevista,fecha_efectiva,concepto,nota,origen_tipo,reparto_linea,gasto,
       anticipo,movimiento,motivo_cancelacion,anticipo_previsto,gasto_revision,
       modalidad,revision,creado,actualizado)
     VALUES('Pendiente de realizar',1000,'S001','S002','1','2026-01-05',NULL,
       'Ficticio','','RegistroCoordinado',NULL,?,NULL,NULL,NULL,?,?,?,1,?,?)`,
    [row.gasto, row.anticipoPrevisto, row.gastoRevision, row.modalidad, t, t],
  );
  return (db.query("SELECT last_insert_rowid() AS id").get() as { id: number }).id;
}

/** Base v29 con un reparto generado, un Gasto y su pendiente. */
function v29WithData(path: string) {
  const db = openDatabase(path);
  try {
    cycle(db);
    classification(db);
    budget(db);
    const repartoId = reparto(db);
    const linea = line(db, repartoId);
    generate(db, repartoId);
    gasto(db, "1");
    const pendiente = repartoPendiente(db, linea);
    db.run(
      "INSERT INTO transferencia_pendiente_attempts VALUES('generacion','k','hash','{}',1)",
    );
    revertToV29(db);
    return { pendiente, repartoId, linea };
  } finally {
    db.close();
  }
}

const hasAge = (() => {
  if (!Bun.which("age-keygen")) return false;
  // `backup` exige un árbol privado de confianza: si el temporal del entorno no
  // lo es (ocurre en macOS bajo algunos TMPDIR), la prueba no puede ejecutarse.
  const dir = mkdtempSync(join(tmpdir(), ".tmp-spec37-probe-"));
  const path = join(dir, "probe.sqlite");
  try {
    const db = openDatabase(path);
    const source = new Database(path);
    try {
      backup(source, randomBytes(32), join(dir, "cut"), "age1probe");
      return true;
    } finally {
      source.close();
      db.close();
    }
  } catch {
    return false;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
})();

test("SPEC37 I1: v29 → v30 is additive and leaves the new columns null", () => {
  const dir = root();
  try {
    const path = join(dir, "v29.sqlite");
    const seeded = (() => {
      const db = openDatabase(path);
      try {
        cycle(db);
        classification(db);
        budget(db);
        const repartoId = reparto(db);
        const linea = line(db, repartoId);
        generate(db, repartoId);
        gasto(db, "1");
        const pendiente = repartoPendiente(db, linea);
        db.run(
          "INSERT INTO transferencia_pendiente_attempts VALUES('generacion','k','hash','{}',1)",
        );
        revertToV29(db);
        return {
          pendiente,
          pendientes: db
            .query(
              "SELECT id,estado,importe,revision,origen_tipo FROM transferencia_pendiente ORDER BY id",
            )
            .all(),
          movimientos: db
            .query("SELECT id,tipo,importe FROM movimientos ORDER BY id")
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
        version: 30,
      });
      expect(verifyContract(db, 30)).toBe(c30);
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);

      // Ningún objeto de C29 desaparece y el único que cambia de forma es la tabla
      // extendida: `ALTER TABLE … ADD COLUMN` reescribe su SQL, es lo esperado.
      const current = new Map(manifest(db).map((o) => [`${o.type}:${o.name}`, o]));
      const changed = contract(c29).objects
        .filter((object) => {
          const now = current.get(`${object.type}:${object.name}`);
          return JSON.stringify(now) !== JSON.stringify(object);
        })
        .map((object) => `${object.type}:${object.name}`);
      expect(changed).toEqual(["table:transferencia_pendiente"]);
      for (const object of contract(c29).objects)
        expect(current.has(`${object.type}:${object.name}`)).toBe(true);

      expect(
        db
          .query(
            "SELECT id,estado,importe,revision,origen_tipo FROM transferencia_pendiente ORDER BY id",
          )
          .all(),
      ).toEqual(seeded.pendientes);
      expect(
        db.query("SELECT id,tipo,importe FROM movimientos ORDER BY id").all(),
      ).toEqual(seeded.movimientos);
      expect(db.query("SELECT * FROM database_origin").all()).toEqual(
        seeded.identity,
      );
      expect(
        db
          .query(
            "SELECT anticipo_previsto,gasto_revision,modalidad FROM transferencia_pendiente WHERE id=?",
          )
          .get(seeded.pendiente),
      ).toEqual({ anticipo_previsto: null, gasto_revision: null, modalidad: null });
      // Los intentos de v29 sobreviven: no se recrea ninguna tabla.
      expect(
        db.query("SELECT COUNT(*) AS n FROM transferencia_pendiente_attempts").get(),
      ).toEqual({ n: 1 });
      // Objetos que sólo existen desde v30.
      for (const [type, name] of [
        ["index", "transferencia_pendiente_gasto_activo"],
        ["table", "operacion_coordinada_attempts"],
        ["trigger", "transferencia_pendiente_modalidad_inmutable"],
        ["trigger", "transferencia_pendiente_modalidad_coherente_insert"],
        ["trigger", "transferencia_pendiente_modalidad_coherente_update"],
      ])
        expect(
          db
            .query("SELECT name FROM sqlite_master WHERE type=? AND name=?")
            .get(type, name),
        ).toEqual({ name });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SPEC37 I1: a migrated v30 keeps Reparto pendientes working", () => {
  const dir = root();
  try {
    const path = join(dir, "v29.sqlite");
    const seeded = v29WithData(path);
    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 30,
      });
      // El pendiente heredado se confirma con su Transferencia real.
      transferencia(db, "7", 10000);
      expect(() =>
        db.run(
          "UPDATE transferencia_pendiente SET estado='Confirmada',fecha_efectiva='2026-01-06',movimiento='7',revision=revision+1 WHERE id=?",
          [seeded.pendiente],
        ),
      ).not.toThrow();
      expect(
        db
          .query("SELECT estado,movimiento FROM transferencia_pendiente WHERE id=?")
          .get(seeded.pendiente),
      ).toEqual({ estado: "Confirmada", movimiento: "7" });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SPEC37 I1: the preflight rejects duplicate active pendientes without writing", () => {
  const dir = root();
  try {
    const path = join(dir, "v29.sqlite");
    const db = openDatabase(path);
    try {
      cycle(db);
      classification(db);
      gasto(db, "1");
      gasto(db, "2");
      revertToV29(db);
      // v29 no tenía el índice: dos pendientes activos del mismo Gasto eran posibles.
      db.run(
        `INSERT INTO transferencia_pendiente(estado,importe,origen,destino,ciclo_origen,
           fecha_prevista,fecha_efectiva,concepto,nota,origen_tipo,reparto_linea,gasto,
           anticipo,movimiento,motivo_cancelacion,revision,creado,actualizado)
         VALUES('Pendiente de realizar',1000,'S001','S002','1','2026-01-05',NULL,
           'Ficticio','','RegistroCoordinado',NULL,'1',NULL,NULL,NULL,1,?,?),
           ('Pendiente de realizar',2000,'S001','S002','1','2026-01-05',NULL,
           'Ficticio','','RegistroCoordinado',NULL,'1',NULL,NULL,NULL,1,?,?)`,
        [t, t, t, t],
      );
      expect(
        db
          .query(
            "SELECT COUNT(*) AS n FROM transferencia_pendiente WHERE gasto='1' AND estado='Pendiente de realizar'",
          )
          .get(),
      ).toEqual({ n: 2 });
      // El preflight de I1 aborta antes de escribir, sin cambiar la versión.
      expect(() => spec37SchemaV30(db)).toThrow(
        "Migración v30 rechazada: hay más de un pendiente activo para el mismo Gasto.",
      );
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 29,
      });
      expect(
        db
          .query(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='transferencia_pendiente_gasto_activo'",
          )
          .get(),
      ).toBeNull();
      expect(
        db.query("SELECT COUNT(*) AS n FROM transferencia_pendiente").get(),
      ).toEqual({ n: 2 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SPEC37 I1: modalidad is immutable, including NULL transitions", () => {
  const db = store();
  try {
    cycle(db);
    classification(db);
    gasto(db, "1");
    // Se aíslan los triggers de coherencia para probar sólo la inmutabilidad: con
    // ellos activos, cualquier cambio de modalidad ya está prohibido por origen.
    db.exec(`
      DROP TRIGGER transferencia_pendiente_modalidad_coherente_update;
      DROP TRIGGER transferencia_pendiente_modalidad_coherente_insert;`);
    const nula = coordinadoPendiente(db, { modalidad: null });
    // `NULL → 'A'` es el caso que un `!=` deja pasar en SQLite; `IS NOT` lo aborta.
    expect(() =>
      db.run("UPDATE transferencia_pendiente SET modalidad='A' WHERE id=?", [nula]),
    ).toThrow("modalidad inmutable");
    gasto(db, "2");
    const id = coordinadoPendiente(db, { gasto: "2", modalidad: "A" });
    expect(() =>
      db.run("UPDATE transferencia_pendiente SET modalidad='B' WHERE id=?", [id]),
    ).toThrow("modalidad inmutable");
    expect(() =>
      db.run("UPDATE transferencia_pendiente SET modalidad=NULL WHERE id=?", [id]),
    ).toThrow("modalidad inmutable");
    // El resto del pendiente sigue siendo editable.
    expect(() =>
      db.run(
        "UPDATE transferencia_pendiente SET estado='Cancelada',motivo_cancelacion='prueba',revision=revision+1 WHERE id=?",
        [id],
      ),
    ).not.toThrow();
  } finally {
    db.close();
  }
});

test("SPEC37 I1: coherence by origin rejects impossible pendientes on insert and update", () => {
  const db = store();
  try {
    cycle(db);
    classification(db);
    gasto(db, "1");
    // RegistroCoordinado exige modalidad.
    expect(() => coordinadoPendiente(db, { modalidad: null })).toThrow(
      "modalidad incoherente con el origen",
    );
    // Reparto no admite columnas del registro coordinado.
    expect(() =>
      db.run(
        `INSERT INTO transferencia_pendiente(estado,importe,origen,destino,ciclo_origen,
           fecha_prevista,fecha_efectiva,concepto,nota,origen_tipo,reparto_linea,gasto,
           anticipo,movimiento,motivo_cancelacion,anticipo_previsto,gasto_revision,
           modalidad,revision,creado,actualizado)
         VALUES('Pendiente de realizar',1000,'S001','S002','1','2026-01-05',NULL,
           'Ficticio','','Reparto',1,NULL,NULL,NULL,NULL,NULL,NULL,'A',1,?,?)`,
        [t, t],
      ),
    ).toThrow("modalidad incoherente con el origen");
    // Un UPDATE tampoco puede dejar el pendiente en un estado imposible.
    const id = coordinadoPendiente(db, { modalidad: "A" });
    expect(() =>
      db.run(
        "UPDATE transferencia_pendiente SET origen_tipo='Reparto',revision=revision+1 WHERE id=?",
        [id],
      ),
    ).toThrow();
    // Valores y formatos fuera de contrato.
    expect(() => coordinadoPendiente(db, { gasto: "1", modalidad: "C" })).toThrow();
    expect(() =>
      coordinadoPendiente(db, { gasto: "1", anticipoPrevisto: "ANT-1" }),
    ).toThrow();
    expect(() =>
      coordinadoPendiente(db, { gasto: "1", gastoRevision: 0 }),
    ).toThrow();
  } finally {
    db.close();
  }
});

test("SPEC37 I1: one active pendiente per Gasto", () => {
  const db = store();
  try {
    cycle(db);
    classification(db);
    gasto(db, "1");
    gasto(db, "2");
    const first = coordinadoPendiente(db, { gasto: "1" });
    expect(() => coordinadoPendiente(db, { gasto: "1" })).toThrow();
    // Un Gasto distinto sigue permitido.
    const other = coordinadoPendiente(db, { gasto: "2" });
    // Al cancelar el primero, el Gasto vuelve a admitir un pendiente.
    db.run(
      "UPDATE transferencia_pendiente SET estado='Cancelada',motivo_cancelacion='prueba',revision=revision+1 WHERE id=?",
      [first],
    );
    expect(() => coordinadoPendiente(db, { gasto: "1" })).not.toThrow();
    expect(other).toBeGreaterThan(0);
  } finally {
    db.close();
  }
});

test("SPEC37 I1: operacion_coordinada_attempts is keyed and JSON-validated", () => {
  const db = store();
  try {
    db.run(
      "INSERT INTO operacion_coordinada_attempts VALUES('alta','k','hash','{}',1)",
    );
    expect(() =>
      db.run(
        "INSERT INTO operacion_coordinada_attempts VALUES('alta','k','otro','{}',2)",
      ),
    ).toThrow();
    expect(() =>
      db.run(
        "INSERT INTO operacion_coordinada_attempts VALUES('alta','k2','hash','no-json',1)",
      ),
    ).toThrow();
    expect(() =>
      db.run("INSERT INTO operacion_coordinada_attempts VALUES(' ','k3','h','{}',1)"),
    ).toThrow();
    expect(
      db
        .query("SELECT operacion,key,hash FROM operacion_coordinada_attempts")
        .all(),
    ).toEqual([{ operacion: "alta", key: "k", hash: "hash" }]);
  } finally {
    db.close();
  }
});

test("SPEC37 I1: v31 is rejected before mutating", () => {
  const dir = root();
  try {
    const path = join(dir, "v31.sqlite");
    const seeded = openDatabase(path);
    cycle(seeded);
    const before = manifest(seeded);
    seeded.close();
    const db = new Database(path);
    try {
      db.exec("UPDATE schema_version SET version=31");
      expect(verifyContract(db, 31)).toBeNull();
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 31,
      });
      expect(() => prepareSchema(db, { origin: "demo", key_hash: null })).toThrow(
        "Esquema no compatible; no se modificará esta base.",
      );
    } finally {
      db.close();
    }
    // Ninguna escritura: el manifiesto y la versión son los del rechazo.
    const check = new Database(path);
    try {
      expect(manifest(check)).toEqual(before);
      expect(check.query("SELECT version FROM schema_version").get()).toEqual({
        version: 31,
      });
    } finally {
      check.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test.skipIf(!hasAge)(
  "SPEC37 I1: encrypted backup/restore preserves v30 and the new columns",
  () => {
    const dir = root();
    try {
      const path = join(dir, "source.sqlite");
      const db = openDatabase(path);
      let pendingId = 0;
      try {
        cycle(db);
        classification(db);
        gasto(db, "1");
        pendingId = coordinadoPendiente(db, {
          modalidad: "B",
          anticipoPrevisto: "REF001",
        });
      } finally {
        db.close();
      }
      const key = randomBytes(32);
      const identity = join(dir, "identity.txt");
      expect(
        Bun.spawnSync([process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-o", identity], {
          stdout: "pipe",
          stderr: "pipe",
        }).exitCode,
      ).toBe(0);
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
            version: 30,
          });
          expect(verifyContract(copy, 30)).toBe(c30);
          expect(
            copy
              .query(
                "SELECT modalidad,anticipo_previsto FROM transferencia_pendiente WHERE id=?",
              )
              .get(pendingId),
          ).toEqual({ modalidad: "B", anticipo_previsto: "REF001" });
          expect(() =>
            copy.run(
              "UPDATE transferencia_pendiente SET modalidad='A' WHERE id=?",
              [pendingId],
            ),
          ).toThrow("modalidad inmutable");
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

test("SPEC37 I1: the v30 manifest is deterministic", () => {
  const a = store();
  const b = store();
  try {
    expect(manifest(a)).toEqual(manifest(b));
    expect(contract(c30).objects).toHaveLength(380);
    expect(verifyContract(a, 30)).toBe(c30);
  } finally {
    a.close();
    b.close();
  }
});