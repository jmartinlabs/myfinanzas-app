import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { Auth, provision } from "./auth";
import {
  openProductionConnection,
  productionConfig,
} from "./private-state";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { prepareSchema } from "./database-schema";
import { keyHash } from "./database-identity";
import { runSeed, type SeedResult } from "../../../tools/test-seed/commands";
import { TEST_ORIGIN } from "../../../tools/test-seed/constants";
import { dataset } from "../../../tools/test-seed/dataset/ft1";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const ENV_KEYS = [
  "NODE_ENV",
  "APP_ORIGIN",
  "DATABASE_PATH",
  "AUTH_KEY_PATH",
] as const;
const roots: string[] = [];

function fixtureRoot() {
  const created = mkdtempSync(join(tmpdir(), "mf-seed-ft1-")),
    root = realpathSync(created);
  chmodSync(root, 0o700);
  roots.push(root);
  const state = join(root, "state");
  mkdirSync(state, { mode: 0o700 });
  const key = randomBytes(32);
  writeFileSync(join(state, "auth.key"), key, { mode: 0o600 });
  const database = join(state, "database.sqlite");
  const mask = process.umask(0o077);
  let db: Database;
  try {
    db = new Database(database, { create: true, strict: true });
  } finally {
    process.umask(mask);
  }
  prepareSchema(db, { origin: "production", key_hash: keyHash(key) });
  db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  db.close();
  for (const suffix of ["", "-wal", "-shm"])
    if (existsSync(database + suffix)) chmodSync(database + suffix, 0o600);
  return root;
}

function withEnv<T>(root: string, run: () => T): T {
  const saved = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, {
    NODE_ENV: "production",
    APP_ORIGIN: TEST_ORIGIN,
    DATABASE_PATH: join(root, "state", "database.sqlite"),
    AUTH_KEY_PATH: join(root, "state", "auth.key"),
  });
  try {
    return run();
  } finally {
    for (const key of ENV_KEYS) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function command(root: string, args: string[]): SeedResult {
  return withEnv(root, () => runSeed(args));
}

function init(root: string) {
  return command(root, [
    "init",
    "--data-root",
    root,
    "--seed-commit",
    COMMIT,
  ]);
}

function apply(root: string) {
  return command(root, [
    "apply",
    "--data-root",
    root,
    "--seed-commit",
    COMMIT,
  ]);
}

function verify(root: string, extra: string[] = []) {
  return command(root, ["verify", "--data-root", root, ...extra]);
}

function status(root: string) {
  return command(root, ["status", "--data-root", root]);
}

function seed(root: string) {
  expect(init(root).code).toBe(0);
  expect(apply(root).code).toBe(0);
}

function readManifest(root: string) {
  return JSON.parse(
    readFileSync(join(root, "seed-manifest.json"), "utf8"),
  ) as Record<string, any>;
}

function readMarker(root: string) {
  return JSON.parse(
    readFileSync(join(root, "test-instance.json"), "utf8"),
  ) as Record<string, any>;
}

function dbBytes(root: string) {
  return readFileSync(join(root, "state", "database.sqlite"));
}

function openFixtureDb(root: string) {
  return new Database(join(root, "state", "database.sqlite"));
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("FT-1 minimal v27", () => {
  test("init/apply/verify/status happy path and frozen dataset evidence", () => {
    const root = fixtureRoot();
    expect(status(root).status).toBe("empty");
    const initialized = init(root);
    expect(initialized.code).toBe(0);
    expect(initialized.noop).toBe(false);
    expect(status(root).status).toBe("initialized");
    const marker = readMarker(root);
    expect(marker.seed_manifest_sha256).toBeNull();
    const applied = apply(root);
    expect(applied.code).toBe(0);
    expect(applied.noop).toBe(false);
    expect(applied.manifestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(verify(root).code).toBe(0);
    const report = status(root);
    expect(report.code).toBe(0);
    expect(report.status).toBe("seeded");
    const manifest = readManifest(root);
    expect(manifest.dataset.id).toBe("FT-1");
    expect(manifest.dataset.version).toBe(1);
    expect(manifest.source.schema).toBe(27);
    expect(manifest.source.schema_contract).toBe("C27-E411-FOTOS-PERIODO");
    expect(manifest.source.data_contract).toBe("e4.11-v27");
    expect(manifest.source.commit).toBe(COMMIT);
    expect(manifest.counts.saldos).toBe(6);
    expect(manifest.counts.movimientos).toBe(6);
    expect(manifest.counts.ciclos).toBe(1);
    expect(manifest.counts.deudas).toBe(1);
    expect(manifest.counts.presupuestos).toBe(1);
    expect(manifest.counts.referencias).toBe(2);
    expect(manifest.counts.instrumentos).toBe(1);
    expect(manifest.counts.operaciones_inversion).toBe(1);
    expect(manifest.counts.payroll).toBe(0);
    expect(manifest.counts.fichas_compartidos).toBe(0);
    expect(manifest.empty_tables).toContain("cierres");
    expect(manifest.empty_tables).toContain("fotos_periodo");
    expect(manifest.ids.saldos).toEqual(dataset.expected.ids.saldos);
    expect(manifest.ids.movimientos).toEqual(dataset.expected.ids.movimientos);
    expect(manifest.dataset.coverage.partial.join(" ")).toContain("H2");
    expect(manifest.dataset.coverage.partial.join(" ")).toContain("H6");
    expect(readMarker(root).seed_manifest_sha256).toBe(
      applied.manifestSha256,
    );
    expect(JSON.stringify(report)).not.toContain(root);
  });

  test("two clean runs produce byte-identical manifest, marker and checksums", () => {
    const first = fixtureRoot(),
      second = fixtureRoot();
    seed(first);
    seed(second);
    expect(readFileSync(join(first, "seed-manifest.json")).equals(
      readFileSync(join(second, "seed-manifest.json")),
    )).toBe(true);
    expect(readFileSync(join(first, "test-instance.json")).equals(
      readFileSync(join(second, "test-instance.json")),
    )).toBe(true);
    expect(readManifest(first).logical_checksums).toEqual(
      readManifest(second).logical_checksums,
    );
  });

  test("second apply is a no-op and writes nothing", () => {
    const root = fixtureRoot();
    seed(root);
    const database = dbBytes(root),
      manifest = readFileSync(join(root, "seed-manifest.json")),
      marker = readFileSync(join(root, "test-instance.json"));
    const again = apply(root);
    expect(again.code).toBe(0);
    expect(again.noop).toBe(true);
    expect(dbBytes(root).equals(database)).toBe(true);
    expect(readFileSync(join(root, "seed-manifest.json")).equals(manifest)).toBe(
      true,
    );
    expect(readFileSync(join(root, "test-instance.json")).equals(marker)).toBe(
      true,
    );
  });

  test("apply is a no-op after owner activation, before the owner guard", async () => {
    const root = fixtureRoot();
    seed(root);
    const saved = Object.fromEntries(
      ENV_KEYS.map((key) => [key, process.env[key]]),
    );
    Object.assign(process.env, {
      NODE_ENV: "production",
      APP_ORIGIN: TEST_ORIGIN,
      DATABASE_PATH: join(root, "state", "database.sqlite"),
      AUTH_KEY_PATH: join(root, "state", "auth.key"),
    });
    try {
      const { db, key } = openProductionConnection(productionConfig(), false);
      try {
        const token = provision(db);
        await new Auth(db, key, TEST_ORIGIN).enroll(
          token,
          "Synthetic test password with enough length",
        );
      } finally {
        db.close();
      }
    } finally {
      for (const key of ENV_KEYS) {
        const value = saved[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
    const database = dbBytes(root);
    const again = apply(root);
    expect(again.code).toBe(0);
    expect(again.noop).toBe(true);
    expect(dbBytes(root).equals(database)).toBe(true);
    expect(status(root).detail?.owner).toBe(true);
    expect(status(root).status).toBe("seeded");
    expect(verify(root).code).toBe(0);
  });

  test("init is idempotent and refuses to run after apply", () => {
    const root = fixtureRoot();
    expect(init(root).code).toBe(0);
    const marker = readFileSync(join(root, "test-instance.json"));
    const again = init(root);
    expect(again.code).toBe(0);
    expect(again.noop).toBe(true);
    expect(readFileSync(join(root, "test-instance.json")).equals(marker)).toBe(
      true,
    );
    expect(apply(root).code).toBe(0);
    expect(init(root).code).toBe(2);
  });

  test("partial state is rejected without repair", () => {
    const root = fixtureRoot();
    seed(root);
    const database = dbBytes(root);
    unlinkSync(join(root, "seed-manifest.json"));
    expect(verify(root).code).toBe(3);
    expect(apply(root).code).toBe(3);
    expect(status(root).status).toBe("partial");
    expect(dbBytes(root).equals(database)).toBe(true);
  });

  test("foreign or missing marker is rejected", () => {
    const missing = fixtureRoot();
    expect(apply(missing).code).toBe(2);
    expect(verify(missing).code).toBe(2);
    expect(status(missing).status).toBe("empty");

    const root = fixtureRoot();
    expect(init(root).code).toBe(0);
    const marker = readMarker(root);
    marker.public_origin = "https://myfinanzas.pp.ua";
    writeFileSync(
      join(root, "test-instance.json"),
      JSON.stringify(marker, null, 2) + "\n",
      { mode: 0o600 },
    );
    const database = dbBytes(root);
    expect(apply(root).code).toBe(2);
    expect(verify(root).code).toBe(2);
    expect(status(root).status).toBe("foreign");
    expect(dbBytes(root).equals(database)).toBe(true);
  });

  test("tampered manifest and drift are rejected without repair", () => {
    const tampered = fixtureRoot();
    seed(tampered);
    const manifest = readManifest(tampered);
    manifest.counts.movimientos = 999;
    writeFileSync(
      join(tampered, "seed-manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
      { mode: 0o600 },
    );
    const tamperedBytes = dbBytes(tampered);
    expect(verify(tampered).code).toBe(3);
    expect(apply(tampered).code).toBe(3);
    expect(status(tampered).status).toBe("drift");
    expect(dbBytes(tampered).equals(tamperedBytes)).toBe(true);

    const drifted = fixtureRoot();
    seed(drifted);
    const db = openFixtureDb(drifted);
    db.run("UPDATE saldos SET nombre=? WHERE id=?", [
      "Efectivo TEST alterado",
      "S001",
    ]);
    db.close();
    const driftedBytes = dbBytes(drifted);
    expect(verify(drifted).code).toBe(3);
    expect(apply(drifted).code).toBe(3);
    expect(status(drifted).status).toBe("drift");
    expect(dbBytes(drifted).equals(driftedBytes)).toBe(true);
  });

  test("production origin and non-production environment are rejected", () => {
    const root = fixtureRoot();
    const database = dbBytes(root);
    withEnv(root, () => {
      process.env.APP_ORIGIN = "https://myfinanzas.pp.ua";
      expect(
        runSeed(["init", "--data-root", root, "--seed-commit", COMMIT]).code,
      ).toBe(2);
    });
    withEnv(root, () => {
      process.env.NODE_ENV = "test";
      expect(
        runSeed(["init", "--data-root", root, "--seed-commit", COMMIT]).code,
      ).toBe(2);
    });
    expect(dbBytes(root).equals(database)).toBe(true);
  });

  test("schema other than 27 is rejected without migration", () => {
    const root = fixtureRoot();
    expect(init(root).code).toBe(0);
    const db = openFixtureDb(root);
    db.exec("UPDATE schema_version SET version=26");
    db.close();
    const before = dbBytes(root);
    expect(apply(root).code).toBe(2);
    expect(verify(root).code).toBe(2);
    expect(status(root).status).toBe("invalid");
    expect(dbBytes(root).equals(before)).toBe(true);
    const check = new Database(join(root, "state", "database.sqlite"), {
      readonly: true,
    });
    try {
      expect(
        (check.query("SELECT version FROM schema_version").get() as {
          version: number;
        }).version,
      ).toBe(26);
    } finally {
      check.close();
    }
  });

  test("path, permission and symlink guards reject before writing", () => {
    const root = fixtureRoot();
    chmodSync(root, 0o755);
    expect(init(root).code).toBe(2);
    chmodSync(root, 0o700);
    chmodSync(join(root, "state"), 0o755);
    expect(init(root).code).toBe(2);
    chmodSync(join(root, "state"), 0o700);
    chmodSync(join(root, "state", "database.sqlite"), 0o644);
    expect(init(root).code).toBe(2);
    chmodSync(join(root, "state", "database.sqlite"), 0o600);
    const link = join(root, "linked-root");
    symlinkSync(root, link);
    expect(command(link, ["init", "--data-root", link, "--seed-commit", COMMIT]).code).toBe(
      2,
    );
    expect(
      command(root, ["init", "--data-root", "relative", "--seed-commit", COMMIT])
        .code,
    ).toBe(2);
    expect(init(root).code).toBe(0);
  });

  test("post-apply failure writes seed-failure.json and does not declare success", () => {
    const root = fixtureRoot();
    expect(init(root).code).toBe(0);
    // Fuerza un fallo después de aplicar el dataset y publicar el manifiesto:
    // el temporal del marcador ya existe, así que el reemplazo falla.
    writeFileSync(join(root, "test-instance.json.tmp"), "ocupado\n", {
      mode: 0o600,
    });
    const result = apply(root);
    expect(result.code).not.toBe(0);
    const failure = JSON.parse(
      readFileSync(join(root, "seed-failure.json"), "utf8"),
    ) as Record<string, any>;
    expect(failure.environment).toBe("test");
    expect(failure.step).toBe("marcador");
    expect(failure.message).not.toContain(root);
    // El manifiesto se publicó, pero el marcador no apunta al seed: no hay éxito.
    expect(existsSync(join(root, "seed-manifest.json"))).toBe(true);
    expect(readMarker(root).seed_manifest_sha256).toBeNull();
  });

  test("owner preexistente y estado ajeno se rechazan sin reparar", () => {
    const root = fixtureRoot();
    expect(init(root).code).toBe(0);
    const db = openFixtureDb(root);
    db.run(
      "INSERT INTO owner(id,password,secret,enabled,last_step) VALUES(1,'hash','sealed',1,0)",
    );
    db.close();
    const result = apply(root);
    expect(result.code).toBe(2);
    expect(existsSync(join(root, "seed-manifest.json"))).toBe(false);
  });

  test("un estado TEST con datos ajenos y sin marcador se rechaza", () => {
    const root = fixtureRoot();
    const db = openFixtureDb(root);
    db.run(
      "INSERT INTO saldos(id,nombre,tipo,control,estado,revision,creado,actualizado) VALUES('S999','Ajeno','Efectivo','Movimientos','Activa',1,'2025-01-01T00:00:00.000Z','2025-01-01T00:00:00.000Z')",
    );
    db.close();
    const result = command(root, [
      "init",
      "--data-root",
      root,
      "--seed-commit",
      COMMIT,
    ]);
    expect(result.code).toBe(2);
  });

  test("verify detecta manipulacion de audit.campos", () => {
    const root = fixtureRoot();
    expect(init(root).code).toBe(0);
    expect(apply(root).code).toBe(0);
    expect(verify(root).code).toBe(0);
    const db = openFixtureDb(root);
    db.run("UPDATE audit SET campos = '[\"tipo\"]' WHERE rowid = (SELECT min(rowid) FROM audit)");
    db.close();
    const result = verify(root);
    expect(result.code).toBe(3);
    expect(result.message).toContain("Drift");
  });

  test("la huella normaliza timestamps del payload de auditoria y detecta el resto", () => {
    const root = fixtureRoot();
    expect(init(root).code).toBe(0);
    expect(apply(root).code).toBe(0);
    const db = openFixtureDb(root);
    const row = db
      .query(
        "SELECT rowid AS rid, campos FROM audit WHERE campos LIKE '{%' ORDER BY rowid LIMIT 1",
      )
      .get() as { rid: number; campos: string } | null;
    expect(row).not.toBeNull();
    const parsed = JSON.parse(row!.campos) as Record<string, any>;
    // Cambia solo una marca temporal anidada: la huella no debe moverse.
    const strip = (value: any): any => {
      if (Array.isArray(value)) return value.map(strip);
      if (value && typeof value === "object") {
        const out: Record<string, any> = {};
        for (const [key, nested] of Object.entries(value))
          out[key] = ["creado", "actualizado"].includes(key)
            ? "2099-01-01T00:00:00.000Z"
            : strip(nested);
        return out;
      }
      return value;
    };
    db.run("UPDATE audit SET campos = ? WHERE rowid = ?", [
      JSON.stringify(strip(parsed)),
      row!.rid,
    ]);
    db.close();
    expect(verify(root).code).toBe(0);
    // Cambia un campo no temporal: la huella debe cambiar.
    const db2 = openFixtureDb(root);
    const again = db2
      .query(
        "SELECT rowid AS rid, campos FROM audit WHERE campos LIKE '{%' ORDER BY rowid LIMIT 1",
      )
      .get() as { rid: number; campos: string };
    const value = JSON.parse(again.campos) as Record<string, any>;
    value.manipulado = true;
    db2.run("UPDATE audit SET campos = ? WHERE rowid = ?", [
      JSON.stringify(value),
      again.rid,
    ]);
    db2.close();
    expect(verify(root).code).toBe(3);
  });

  test("verify honours --expected-manifest-sha256 and rejects a mismatch", () => {
    const root = fixtureRoot();
    seed(root);
    const sha = readManifest(root).dataset.file_sha256 as string;
    const manifestSha = verify(root).manifestSha256 as string;
    expect(verify(root, ["--expected-manifest-sha256", manifestSha]).code).toBe(
      0,
    );
    expect(verify(root, ["--expected-manifest-sha256", "0".repeat(64)]).code).toBe(
      3,
    );
    expect(sha).toMatch(/^[a-f0-9]{64}$/);
  });

  test("status is read-only and CLI arguments are strict", () => {
    const root = fixtureRoot();
    seed(root);
    const database = dbBytes(root),
      manifest = readFileSync(join(root, "seed-manifest.json"));
    expect(status(root).code).toBe(0);
    expect(dbBytes(root).equals(database)).toBe(true);
    expect(readFileSync(join(root, "seed-manifest.json")).equals(manifest)).toBe(
      true,
    );
    expect(runSeed([]).code).toBe(1);
    expect(
      command(root, ["apply", "--data-root", root]).code,
    ).toBe(2);
    expect(
      command(root, [
        "verify",
        "--data-root",
        root,
        "--from",
        join(root, "other"),
      ]).code,
    ).toBe(2);
    expect(
      command(root, [
        "verify",
        "--data-root",
        root,
        "--expected-manifest-sha256",
        "bad",
      ]).code,
    ).toBe(2);
  });

  test("seed creation uses app services, not write SQL", () => {
    const tools = join(import.meta.dir, "../../../tools/test-seed");
    const files = readdirSync(tools)
      .filter((name) => name.endsWith(".ts"))
      .map((name) => readFileSync(join(tools, name), "utf8"))
      .concat(readFileSync(join(tools, "dataset", "ft1.ts"), "utf8"))
      .join("\n");
    expect(files).not.toMatch(/db\.run\s*\(/);
    expect(files).not.toMatch(
      /db\.exec\s*\(\s*["'`][^"'`]*(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i,
    );
    expect(files).not.toMatch(
      /import\s*\{\s*Database\s*\}\s*from\s+["']bun:sqlite["']/,
    );

    const runtime = [
      join(import.meta.dir, "main.ts"),
      join(import.meta.dir, "app.ts"),
      join(import.meta.dir, "../../../infra/Containerfile"),
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(runtime).not.toContain("test-seed");
    expect(runtime).not.toContain("seed-manifest");
    expect(runtime).not.toContain("test-instance");
  });
});
