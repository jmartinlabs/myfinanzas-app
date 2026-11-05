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
import { randomBytes, randomUUID } from "node:crypto";
import { prepareSchema } from "./database-schema";
import { openDatabase } from "./database";
import { contract, contracts, manifest, verifyAdmittedContract, verifyContract } from "./schema-contract";
import { materializeContract } from "../test-support/inversiones-schema";
import { backup, restore } from "./backup";
import { Auth, provision, totp } from "./auth";

const t = "2026-01-01T00:00:00.000Z";
const c24 = "C24-E43-VALORACION";
const c26 = "C26-E410-REAPERTURA-V26";
const c23 = "C23-E44-DEUDA-COMPLETA";
const root = () => mkdtempSync(join(process.cwd(), ".tmp-e43-contract-"));

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

function valuation(db: Database, id = "VAL-000000000001") {
  db.run(
    `INSERT INTO instrumentos(id,nombre,estado,revision,creado_en,actualizado_en)
     VALUES('I1001','Fondo índice ficticio','Activa',1,?,?)`,
    [t, t],
  );
  db.run(
    `INSERT INTO valoracion_inversion(id,saldo_inversion,instrumento,fecha_vigencia,
      tipo,valor_eur,precio_unitario,divisa,cambio,cantidad_base,procedencia,
      cobertura,actor,creado_utc,actualizado_utc,revision,motivo_correccion)
     VALUES(?,'S004','I1001','2026-03-31','Automática',118125,105000000,'USD',
      900000,1250000000,'Precio y cambio declarados por el usuario','Completa',
      'usuario-unico',?,?,1,NULL)`,
    [id, t, t],
  );
  db.run(
    `INSERT INTO valoracion_inversion_audit(valoracion,revision,accion,anterior,
      posterior,motivo,instante,actor)
     VALUES(?,1,'alta',NULL,'{"valor":118125}',NULL,?,'usuario-unico')`,
    [id, t],
  );
  db.run("INSERT INTO valoracion_attempts VALUES('intento','hash','{}',1)");
}

test("E4.3 AC-24: C24 is exact and deterministic", () => {
  const c24Contract = contract(c24);
  expect(c24Contract.id).toBe(c24);
  expect(c24Contract.schemaVersion).toBe(24);
  expect(c24Contract.sourceCommit).toBe("8b5cf5c");
  expect(c24Contract.objects).toHaveLength(284);
  expect(c24Contract.sha256).toBe(
    "35caf6cca151bd1fd25cb18a6c34cc7bd906e9e581253819ce36eb4fd867162d",
  );
});

test("E4.3 AC-24: C14–C23 stay frozen and registered", () => {
  const frozen = contracts().filter((entry) => entry.schemaVersion < 24);
  expect(frozen).toHaveLength(11);
  expect(new Set(frozen.map((entry) => entry.id)).size).toBe(11);
  expect(contract(c23).sha256).toBe(
    "96b2425152883435005095af0f010e8ff488558773cf5b6f4c2d500b77df9026",
  );
  expect(contract("C22-E35-FIN-NETA").sha256).toBe(
    "3a951d9fec22ae4d9f25b9a00f8536b84b4bcd7b0fc24cffcb02bb4174bb5f1f",
  );
  for (const entry of frozen) {
    expect(entry.schemaVersion).toBeLessThan(24);
    expect(entry.objects.length).toBeGreaterThan(0);
    expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
  }
});

test("E4.10 AC-24: a fresh schema matches C26 exactly", () => {
  const db = new Database(":memory:");
  try {
    prepareSchema(db, { origin: "demo", key_hash: null });
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 26,
    });
    expect(manifest(db)).toEqual(contract(c26).objects);
    expect(verifyContract(db, 26)).toBe(c26);
  } finally {
    db.close();
  }
});

test("E4.10 AC-24: the v23→v26 upgrade matches C26 exactly", () => {
  const dir = root();
  try {
    const path = join(dir, "v23.sqlite");
    materializeContract(path, c23);
    const db = openDatabase(path);
    try {
      expect(manifest(db)).toEqual(contract(c26).objects);
      expect(verifyContract(db, 26)).toBe(c26);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.3 AC-24: C24 only adds the E4.3 objects and rewrites nothing else", () => {
  const before = new Map(
    contract(c23).objects.map((object) => [`${object.type}:${object.name}`, object]),
  );
  const after = new Map(
    contract(c24).objects.map((object) => [`${object.type}:${object.name}`, object]),
  );
  expect(after.size - before.size).toBe(14);
  for (const [key, object] of before) expect(after.get(key)).toEqual(object);

  const added = [...after.keys()].filter((key) => !before.has(key)).sort();
  expect(added).toEqual(
    [
      "index:valoracion_posicion_fecha",
      "table:valoracion_attempts",
      "table:valoracion_inversion",
      "table:valoracion_inversion_audit",
      "trigger:valoracion_audit_no_delete",
      "trigger:valoracion_audit_no_update",
      "trigger:valoracion_audit_revision",
      "trigger:valoracion_creado_immutable",
      "trigger:valoracion_id_immutable",
      "trigger:valoracion_insert_initial",
      "trigger:valoracion_no_delete",
      "trigger:valoracion_posicion_immutable",
      "trigger:valoracion_saldo_type",
      "trigger:valoracion_update_correction",
    ].sort(),
  );
});

test("E4.3 AC-24: C24 has no ciclo_id and does not touch E4.1/E4.2/E4.8", () => {
  const c24Contract = contract(c24);
  const addedSql = c24Contract.objects
    .filter((object) => object.name.startsWith("valoracion"))
    .map((object) => object.sql)
    .join("\n");
  expect(addedSql).not.toContain("ciclo_id");
  expect(addedSql).not.toContain("precierre");
  expect(addedSql).not.toContain("e43");
  expect(addedSql).not.toContain("foto");
  for (const name of ["instrumentos", "operaciones_inversion", "precierre"]) {
    const previous = contract(c23).objects.filter(
      (object) => object.tbl_name === name || object.name === name,
    );
    const current = c24Contract.objects.filter(
      (object) => object.tbl_name === name || object.name === name,
    );
    expect(current).toEqual(previous);
  }
});

test("E4.10 AC-24: unknown v27 contract is rejected without writes", () => {
  const db = new Database(":memory:");
  try {
    prepareSchema(db, { origin: "demo", key_hash: null });
    expect(verifyContract(db, 27)).toBe(null);
    db.exec("UPDATE schema_version SET version=27");
    expect(() => verifyAdmittedContract(db)).toThrow(
      "Esquema no compatible; no se modificará esta base.",
    );
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 27,
    });
  } finally {
    db.close();
  }
});

test("E4.3 AC-24: a physical v24 variant is rejected by the exact contract", () => {
  const dir = root();
  try {
    const path = join(dir, "variant.sqlite");
    materializeContract(path, c24);
    const db = new Database(path);
    db.exec("DROP TRIGGER valoracion_no_delete");
    expect(() => verifyContract(db, 24)).toThrow(
      "Contrato de esquema v24 desconocido o incompleto; no se modificará esta base.",
    );
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// publishNewDirectory is Linux-specific (libc.so.6/renameat2); the canonical
// backup gate runs on Linux CI. On macOS this test is reported as skipped.
test.skipIf(process.platform !== "linux")(
  "E4.10 AC-24: v26 backup/manifest/restore keeps the valuation, audit and MFA and clears attempts",
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
        valuation(db);
        db.run("INSERT INTO sessions VALUES('vieja','csrf',1,1)");
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
        app: "e4.10-v26",
        schema: 26,
        origin: "demo",
      });

      const restored = restore(source, join(dir, "restored"), identity);
      const copy = openDatabase(restored.database);
      try {
        expect(copy.query("SELECT version FROM schema_version").get()).toEqual({
          version: 26,
        });
        expect(
          copy
            .query(
              "SELECT id,saldo_inversion,instrumento,fecha_vigencia,tipo,valor_eur,revision FROM valoracion_inversion",
            )
            .all(),
        ).toEqual([
          {
            id: "VAL-000000000001",
            saldo_inversion: "S004",
            instrumento: "I1001",
            fecha_vigencia: "2026-03-31",
            tipo: "Automática",
            valor_eur: 118125,
            revision: 1,
          },
        ]);
        expect(
          copy.query("SELECT valoracion,revision,accion,actor FROM valoracion_inversion_audit").all(),
        ).toEqual([
          {
            valoracion: "VAL-000000000001",
            revision: 1,
            accion: "alta",
            actor: "usuario-unico",
          },
        ]);
        for (const table of [
          "sessions",
          "challenges",
          "bootstrap",
          "recovery",
          "auth_limits",
          "idempotency",
          "valoracion_attempts",
          "cierre_attempts",
          "reapertura_attempts",
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
  },
);

test.skipIf(process.platform !== "linux")(
  "E4.3 AC-24: historical v23 backups keep e4.4-v23 and restore unchanged",
  () => {
    process.env.NODE_ENV = "test";
    const dir = root();
    try {
      const sourcePath = join(dir, "v23.sqlite");
      materializeContract(sourcePath, c23);
      const sourceDb = new Database(sourcePath, { strict: true });
      const { identity, recipient } = ageKeys(dir);
      const source = join(dir, "v23-backup");
      try {
        backup(sourceDb, randomBytes(32), source, recipient);
      } finally {
        sourceDb.close();
      }

      const { bundle } = decryptBundle(identity, source);
      expect(bundle.manifest).toMatchObject({
        app: "e4.4-v23",
        schema: 23,
        origin: "demo",
      });

      const restored = restore(source, join(dir, "v23-restored"), identity);
      const copy = new Database(restored.database, {
        readonly: true,
        strict: true,
      });
      try {
        expect(copy.query("SELECT version FROM schema_version").get()).toEqual({
          version: 23,
        });
        expect(
          copy
            .query("SELECT COUNT(*) n FROM sqlite_master WHERE name='valoracion_inversion'")
            .get(),
        ).toEqual({ n: 0 });
        expect(copy.query("PRAGMA foreign_key_check").all()).toEqual([]);
      } finally {
        copy.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

test.skipIf(process.platform !== "linux")(
  "E4.10 AC-24: restoring a v27 package fails without a destination",
  () => {
    process.env.NODE_ENV = "test";
    const dir = root();
    try {
      const sourcePath = join(dir, "v23.sqlite");
      materializeContract(sourcePath, c23);
      const sourceDb = new Database(sourcePath, { strict: true });
      const { identity, recipient } = ageKeys(dir);
      const source = join(dir, "v23-backup");
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
      altered.manifest.schema = 27;
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
  },
);
