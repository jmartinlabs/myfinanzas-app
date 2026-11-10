import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes, randomUUID } from "node:crypto";
import { prepareSchema } from "./database-schema";
import { openDatabase } from "./database";
import {
  contract,
  contracts,
  manifest,
  verifyAdmittedContract,
  verifyContract,
} from "./schema-contract";
import { materializeContract } from "../test-support/inversiones-schema";
import { backup, restore } from "./backup";
import { Auth, provision, totp } from "./auth";

process.env.NODE_ENV = "test";

const t = "2026-01-01T00:00:00.000Z";
const c24 = "C24-E43-VALORACION";
const c25 = "C25-E49-CIERRE-FINANCIERO";
const c27 = "C27-E411-FOTOS-PERIODO";
const c23 = "C23-E44-DEUDA-COMPLETA";
const root = () => mkdtempSync(join(tmpdir(), ".tmp-e49-contract-"));
const fingerprint = "a".repeat(64);

function ageKeys(dir: string) {
  const identity = join(dir, "identity.txt");
  const generated = Bun.spawnSync(["age-keygen", "-o", identity], {
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(generated.exitCode).toBe(0);
  const recipient = Bun.spawnSync(["age-keygen", "-y", identity], {
    stdout: "pipe",
    stderr: "pipe",
  })
    .stdout.toString()
    .trim();
  return { identity, recipient };
}

function decryptBundle(identity: string, source: string) {
  const decrypted = Bun.spawnSync(
    ["age", "-d", "-i", identity, join(source, "database.age")],
    { stdout: "pipe", stderr: "pipe" },
  );
  expect(decrypted.exitCode).toBe(0);
  return {
    bundle: JSON.parse(decrypted.stdout.toString()),
    bytes: decrypted.stdout,
  };
}

function closureFixture(db: Database) {
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
       VALUES('1',1,?,'usuario-unico',NULL,?,'0.0.0-fixture',26,
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
    db.run(
      `INSERT INTO reaperturas(ciclo,version_origen,tipo,actor,creado_utc,motivo,
        fingerprint_peticion,version_esperada,clave_intento,correlacion,
        reapertura_origen,resultado)
       VALUES('1',1,'reapertura','usuario-unico',?,'Motivo ficticio',?,1,
        'clave-reapertura','corr-reapertura',NULL,'Abierta')`,
      [t, fingerprint],
    );
    db.run(
      "INSERT INTO reapertura_activa(id,ciclo,reapertura_id) VALUES(1,'1',1)",
    );
    db.run(
      "INSERT INTO reapertura_attempts VALUES('reapertura','intento','hash','{}',1)",
    );
    const t2 = "2026-02-01T00:00:00.000Z";
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,creado_utc,
        motivo,fingerprint,estado) VALUES('1',2,'2026-01-01','2026-01-31',0,
        'usuario-unico',?,'Motivo del re-cierre',?,'Cerrado')`,
      [t2, fingerprint],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,fingerprint,
        app_version,schema_version,ventana_inicio,ventana_fin,saldo_inicial,
        estado_temporal,estado_hechos,estado_plan,hechos,plan,clasificacion,
        inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES('1',2,?,'usuario-unico','Motivo del re-cierre',?,'0.0.0-fixture',26,
        '2026-01-01','2026-01-31',0,'Cerrado','Sin hechos','SinPlan',
        '{"origen":"fixture"}','{"estado":"SinPlan"}','{}','{}','{}','{}',
        '{"verificado":false,"motivo":"fixture"}','{}')`,
      [t2, fingerprint],
    );
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES('1',2,'cierre',NULL,'{"version":2}',
        'Motivo del re-cierre',?,'usuario-unico')`,
      [t2],
    );
    db.run(
      `INSERT INTO cierre_vinculos(ciclo,version_origen,version_destino,
        reapertura_id,correlacion) VALUES('1',1,2,1,'corr-reapertura')`,
    );
  }).immediate();
}

test("E4.9 A: C25 is exact and deterministic", () => {
  const c25Contract = contract(c25);
  expect(c25Contract.id).toBe(c25);
  expect(c25Contract.schemaVersion).toBe(25);
  expect(c25Contract.sourceCommit).toBe("17d86c3");
  expect(c25Contract.objects).toHaveLength(297);
  expect(c25Contract.sha256).toBe(
    "5b6b649b2708a35af1fe23dfd63804c18c92c6923cb35065177532f51f8fa140",
  );
});

test("E4.9 A: C14–C24 stay frozen and registered", () => {
  const frozen = contracts().filter((entry) => entry.schemaVersion < 25);
  expect(frozen).toHaveLength(12);
  expect(new Set(frozen.map((entry) => entry.id)).size).toBe(12);
  expect(contract(c24).sha256).toBe(
    "35caf6cca151bd1fd25cb18a6c34cc7bd906e9e581253819ce36eb4fd867162d",
  );
  expect(contract(c23).sha256).toBe(
    "96b2425152883435005095af0f010e8ff488558773cf5b6f4c2d500b77df9026",
  );
  for (const entry of frozen) {
    expect(entry.schemaVersion).toBeLessThan(25);
    expect(entry.objects.length).toBeGreaterThan(0);
    expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
  }
});

test("E4.10 A: a fresh schema matches C27 exactly", () => {
  const db = new Database(":memory:");
  try {
    prepareSchema(db, { origin: "demo", key_hash: null });
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 27,
    });
    expect(manifest(db)).toEqual(contract(c27).objects);
    expect(verifyContract(db, 27)).toBe(c27);
  } finally {
    db.close();
  }
});

test("E4.10 A: the v24→v27 upgrade matches C27 exactly", () => {
  const dir = root();
  try {
    const path = join(dir, "v24.sqlite");
    materializeContract(path, c24);
    const db = openDatabase(path);
    try {
      expect(manifest(db)).toEqual(contract(c27).objects);
      expect(verifyContract(db, 27)).toBe(c27);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.9 A: C25 only adds the E4.9 objects and rewrites nothing else", () => {
  const before = new Map(
    contract(c24).objects.map((object) => [`${object.type}:${object.name}`, object]),
  );
  const after = new Map(
    contract(c25).objects.map((object) => [`${object.type}:${object.name}`, object]),
  );
  expect(after.size - before.size).toBe(13);
  for (const [key, object] of before) expect(after.get(key)).toEqual(object);

  const added = [...after.keys()].filter((key) => !before.has(key)).sort();
  expect(added).toEqual(
    [
      "table:cierre_attempts",
      "table:cierre_audit",
      "table:cierres",
      "table:fotos_cierre",
      "trigger:cierre_audit_no_delete",
      "trigger:cierre_audit_no_update",
      "trigger:cierre_cycle_identity",
      "trigger:cierre_no_delete",
      "trigger:cierre_no_update",
      "trigger:cierre_version_sequence",
      "trigger:foto_cierre_no_delete",
      "trigger:foto_cierre_no_update",
      "trigger:foto_cierre_requires_closure",
    ].sort(),
  );
});

test("E4.9 A: C25 has no ciclo_id and does not touch E4.1/E4.2/E4.3/E4.8", () => {
  const c25Contract = contract(c25);
  const addedSql = c25Contract.objects
    .filter((object) => object.name.startsWith("cierre") || object.name.startsWith("foto_cierre"))
    .map((object) => object.sql)
    .join("\n");
  expect(addedSql).not.toContain("ciclo_id");
  expect(addedSql).not.toContain("precierre");
  for (const name of [
    "instrumentos",
    "operaciones_inversion",
    "valoracion_inversion",
    "ciclos",
    "movimientos",
    "precierre",
  ]) {
    const previous = contract(c24).objects.filter(
      (object) => object.tbl_name === name || object.name === name,
    );
    const current = c25Contract.objects.filter(
      (object) => object.tbl_name === name || object.name === name,
    );
    expect(current).toEqual(previous);
  }
});

test("E4.10 A: unknown v28 contract is rejected without writes", () => {
  const db = new Database(":memory:");
  try {
    prepareSchema(db, { origin: "demo", key_hash: null });
    expect(verifyContract(db, 28)).toBe(null);
    db.exec("UPDATE schema_version SET version=28");
    expect(() => verifyAdmittedContract(db)).toThrow(
      "Esquema no compatible; no se modificará esta base.",
    );
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 28,
    });
  } finally {
    db.close();
  }
});

test("E4.9 A: a physical v25 variant is rejected by the exact contract", () => {
  const dir = root();
  try {
    const path = join(dir, "variant.sqlite");
    materializeContract(path, c25);
    const db = new Database(path);
    db.exec("DROP TRIGGER cierre_no_delete");
    expect(() => verifyContract(db, 25)).toThrow(
      "Contrato de esquema v25 desconocido o incompleto; no se modificará esta base.",
    );
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// publishNewDirectory is Linux-specific (libc.so.6/renameat2); the canonical
// backup gate runs on Linux CI. On macOS this test is reported as skipped.
test.skipIf(process.platform !== "linux")(
  "E4.10 A: v27 backup/manifest/restore keeps the closure, photo, audit and MFA and clears attempts",
  async () => {
    process.env.NODE_ENV = "test";
    const dir = root();
    try {
      const state = join(dir, "state");
      mkdirSync(state, { mode: 0o700 });
      const path = join(state, "database.sqlite");
      const db = openDatabase(path);
      const key = randomBytes(32);
      const auth = new Auth(db, key);
      const password = "Contraseña ficticia " + randomUUID();
      let enrolled: { secret?: string } = {};
      try {
        enrolled = await auth.enroll(provision(db), password);
        closureFixture(db);
        db.run("INSERT INTO sessions VALUES('vieja','csrf',1,1)");
        db.run("INSERT INTO periodo_attempts VALUES('intento','hash','{}',1)");
        expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      } finally {
        db.close();
      }

      const reopen = openDatabase(path);
      const { identity, recipient } = ageKeys(dir);
      const source = join(dir, "backup");
      try {
        backup(reopen, key, source, recipient);
      } finally {
        reopen.close();
      }

      const { bundle } = decryptBundle(identity, source);
      expect(bundle.manifest).toMatchObject({
        app: "e4.11-v27",
        schema: 27,
        origin: "demo",
      });

      const restored = restore(source, join(dir, "restored"), identity);
      const copy = openDatabase(restored.database);
      try {
        expect(copy.query("SELECT version FROM schema_version").get()).toEqual({
          version: 27,
        });
        expect(
          copy
            .query(
              "SELECT ciclo,version,inicio,fin,saldo_inicial,estado FROM cierres",
            )
            .all(),
        ).toEqual([
          {
            ciclo: "1",
            version: 1,
            inicio: "2026-01-01",
            fin: "2026-01-31",
            saldo_inicial: 0,
            estado: "Cerrado",
          },
          {
            ciclo: "1",
            version: 2,
            inicio: "2026-01-01",
            fin: "2026-01-31",
            saldo_inicial: 0,
            estado: "Cerrado",
          },
        ]);
        expect(
          copy
            .query(
              "SELECT ciclo,version,app_version,schema_version,estado_hechos,estado_plan FROM fotos_cierre",
            )
            .all(),
        ).toEqual([
          {
            ciclo: "1",
            version: 1,
            app_version: "0.0.0-fixture",
            schema_version: 26,
            estado_hechos: "Sin hechos",
            estado_plan: "SinPlan",
          },
          {
            ciclo: "1",
            version: 2,
            app_version: "0.0.0-fixture",
            schema_version: 26,
            estado_hechos: "Sin hechos",
            estado_plan: "SinPlan",
          },
        ]);
        expect(
          copy
            .query("SELECT ciclo,version,accion,actor FROM cierre_audit")
            .all(),
        ).toEqual([
          {
            ciclo: "1",
            version: 1,
            accion: "cierre",
            actor: "usuario-unico",
          },
          {
            ciclo: "1",
            version: 2,
            accion: "cierre",
            actor: "usuario-unico",
          },
        ]);
        expect(
          copy
            .query(
              "SELECT ciclo,version_origen,version_destino,reapertura_id FROM cierre_vinculos",
            )
            .all(),
        ).toEqual([
          {
            ciclo: "1",
            version_origen: 1,
            version_destino: 2,
            reapertura_id: 1,
          },
        ]);
        expect(
          copy
            .query(
              "SELECT ciclo,version_origen,tipo,motivo,resultado FROM reaperturas",
            )
            .all(),
        ).toEqual([
          {
            ciclo: "1",
            version_origen: 1,
            tipo: "reapertura",
            motivo: "Motivo ficticio",
            resultado: "Abierta",
          },
        ]);
        expect(
          copy.query("SELECT id,ciclo,reapertura_id FROM reapertura_activa").get(),
        ).toEqual({ id: 1, ciclo: "1", reapertura_id: 1 });
        for (const table of [
          "sessions",
          "challenges",
          "bootstrap",
          "recovery",
          "auth_limits",
          "idempotency",
          "cierre_attempts",
          "reapertura_attempts",
          "periodo_attempts",
        ])
          expect(copy.query(`SELECT COUNT(*) n FROM ${table}`).get()).toEqual({
            n: 0,
          });
        expect(copy.query("PRAGMA foreign_key_check").all()).toEqual([]);

        const restoredAuth = new Auth(copy, readFileSync(restored.key));
        const challenge = await restoredAuth.login(password);
        const verified = restoredAuth.verify(
          new Request("http://127.0.0.1:5173", {
            headers: {
              cookie: restoredAuth.challengeName + "=" + challenge.challenge,
            },
          }),
          totp(enrolled.secret!).generate({ timestamp: Date.now() + 30000 }),
        );
        expect(verified.session).toBeString();
      } finally {
        copy.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    // Backup v27 + restore real con MFA y age: mismo trabajo pesado que el
    // histórico v24; 30 s mantiene la verificación y solo amplía el margen.
  },
  30000,
);

test.skipIf(process.platform !== "linux")(
  "E4.9 A: historical v24 backups keep e4.3-v24 and restore unchanged",
  () => {
    process.env.NODE_ENV = "test";
    const dir = root();
    try {
      const sourcePath = join(dir, "v24.sqlite");
      materializeContract(sourcePath, c24);
      const sourceDb = new Database(sourcePath, { strict: true });
      const { identity, recipient } = ageKeys(dir);
      const source = join(dir, "v24-backup");
      try {
        backup(sourceDb, randomBytes(32), source, recipient);
      } finally {
        sourceDb.close();
      }

      const { bundle } = decryptBundle(identity, source);
      expect(bundle.manifest).toMatchObject({
        app: "e4.3-v24",
        schema: 24,
        origin: "demo",
      });

      const restored = restore(source, join(dir, "v24-restored"), identity);
      const copy = new Database(restored.database, {
        readonly: true,
        strict: true,
      });
      try {
        expect(copy.query("SELECT version FROM schema_version").get()).toEqual({
          version: 24,
        });
        expect(
          copy
            .query(
              "SELECT COUNT(*) n FROM sqlite_master WHERE name='cierres'",
            )
            .get(),
        ).toEqual({ n: 0 });
        expect(copy.query("PRAGMA foreign_key_check").all()).toEqual([]);
      } finally {
        copy.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    // Backup age + restore real medido en CI: 5,07 s; el límite por defecto lo
    // abortaba. 30 s mantiene la verificación y solo amplía el margen.
  },
  30000,
);

test.skipIf(process.platform !== "linux")(
  "E4.10 A: restoring a v28 package fails without a destination",
  () => {
    process.env.NODE_ENV = "test";
    const dir = root();
    try {
      const sourcePath = join(dir, "v24.sqlite");
      materializeContract(sourcePath, c24);
      const sourceDb = new Database(sourcePath, { strict: true });
      const { identity, recipient } = ageKeys(dir);
      const source = join(dir, "v24-backup");
      try {
        backup(sourceDb, randomBytes(32), source, recipient);
      } finally {
        sourceDb.close();
      }
      const { bundle } = decryptBundle(identity, source);

      const corrupt = join(dir, "unadmitted");
      mkdirSync(corrupt, { mode: 0o700 });
      const plaintext = join(corrupt, "bundle.tmp");
      const altered = structuredClone(bundle);
      altered.manifest.schema = 28;
      writeFileSync(plaintext, JSON.stringify(altered), { mode: 0o600 });
      cpSync(join(source, "access-key.age"), join(corrupt, "access-key.age"));
      expect(
        Bun.spawnSync(
          [
            "age",
            "--encrypt",
            "--recipient",
            recipient,
            "-o",
            join(corrupt, "database.age"),
            plaintext,
          ],
          { stdout: "pipe", stderr: "pipe" },
        ).exitCode,
      ).toBe(0);
      rmSync(plaintext);

      const destination = join(dir, "unadmitted-restored");
      expect(() => restore(corrupt, destination, identity)).toThrow(
        "Paquete o checksum inválido.",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    // Backup v24 + paquete v28 corrupto con age real: mismo criterio que el
    // histórico v24; 30 s solo amplía el margen, sin cambiar las aserciones.
  },
  30000,
);
