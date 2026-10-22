import { inspectIdentity, assertMode, keyHash } from "./database-identity";
import {
  productionConfig,
  privateDirectory,
  publishNewDirectory,
  syncPath,
  verifyProductionFiles,
} from "./private-state";
import { basename } from "node:path";
import { Database } from "bun:sqlite";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  openSync,
  fsyncSync,
  closeSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { Auth } from "./auth";

const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
function age(args: string[]) {
  const r = Bun.spawnSync([process.env.AGE_BIN ?? "age", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (r.exitCode !== 0)
    throw new Error(
      "age no pudo completar la operación; comprueba instalación, destinatario, identidad y espacio.",
    );
}
function valid(path: string, expected?: number) {
  const db = new Database(path, { readonly: true, strict: true });
  try {
    if (
      (db.query("PRAGMA integrity_check").get() as { integrity_check: string })
        .integrity_check !== "ok" ||
      db.query("PRAGMA foreign_key_check").all().length
    )
      throw new Error("Snapshot inconsistente.");
    const versions = db.query("SELECT version FROM schema_version").all() as {
      version: number;
    }[];
    if (
      versions.length !== 1 ||
      ![1, 2, 3, 4, 5, 6, 7, 8].includes(versions[0].version) ||
      (expected !== undefined && versions[0].version !== expected)
    )
      throw new Error("Versión de snapshot no compatible.");
    inspectIdentity(db);
    return versions[0].version;
  } finally {
    db.close();
  }
}
/** Publica un directorio completo por rename; nunca modifica la base fuente. */
export function backup(
  db: Database,
  key: Buffer,
  destination: string,
  recipient: string,
  now = Date.now(),
) {
  if (
    !["development", "test", "production"].includes(process.env.NODE_ENV ?? "")
  )
    throw new Error("Entorno de copia inválido.");
  const sourceIdentity = inspectIdentity(db);
  assertMode(sourceIdentity, process.env.NODE_ENV === "production");
  if (sourceIdentity?.origin === "production") {
    const config = productionConfig();
    if (db.filename !== config.database)
      throw new Error("Origen distinto de DATABASE_PATH.");
    verifyProductionFiles(config);
    if (sourceIdentity.key_hash !== keyHash(key))
      throw new Error("Pareja DB/clave inválida.");
  }
  new Auth(db, key).checkKey();
  const target = resolve(destination);
  if (existsSync(target))
    throw new Error("El destino ya existe; no se sobrescriben copias.");
  if (!recipient.startsWith("age1") || key.length !== 32)
    throw new Error("Destinatario age o clave de aplicación inválidos.");
  if (process.env.NODE_ENV !== "production")
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  privateDirectory(dirname(target));
  const stage = mkdtempSync(join(dirname(target), ".backup-"));
  try {
    const snapshot = join(stage, "snapshot.sqlite");
    const mask = process.umask(0o077);
    try {
      db.run("VACUUM INTO ?", [snapshot]);
    } finally {
      process.umask(mask);
    }
    chmodSync(snapshot, 0o600);
    const sourceVersion = valid(snapshot);
    const bytes = readFileSync(snapshot);
    const manifest = {
      format: 1,
      app:
        sourceVersion === 1
          ? "e1.1-v1"
          : sourceVersion === 2
            ? "e1.2-v2"
            : sourceVersion === 3
              ? "e1.3-v3"
              : sourceVersion === 4
                ? "e1.4-v4"
                : sourceVersion === 5
                  ? "e1.5-v5"
                  : sourceVersion === 6
                    ? "sqlite-v6"
                    : sourceVersion === 7
                      ? "e1.6-v7"
                      : "e2.1-v8",
      schema: sourceVersion,
      ...(sourceVersion >= 6 ? { origin: sourceIdentity!.origin } : {}),
      id: randomUUID(),
      created: new Date(now).toISOString(),
      sha256: hash(bytes),
    };
    const bundle = join(stage, "bundle.tmp");
    writeFileSync(
      bundle,
      JSON.stringify({ manifest, database: bytes.toString("base64") }),
      { mode: 0o600 },
    );
    const secret = join(stage, "key.tmp");
    writeFileSync(secret, key, { mode: 0o600 });
    age([
      "--encrypt",
      "--recipient",
      recipient,
      "--output",
      join(stage, "database.age"),
      bundle,
    ]);
    age([
      "--encrypt",
      "--recipient",
      recipient,
      "--output",
      join(stage, "access-key.age"),
      secret,
    ]);
    rmSync(snapshot);
    rmSync(bundle);
    rmSync(secret);
    chmodSync(join(stage, "database.age"), 0o600);
    chmodSync(join(stage, "access-key.age"), 0o600);
    for (const name of ["database.age", "access-key.age"]) {
      const fd = openSync(join(stage, name), "r");
      try {
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    }
    const directory = openSync(stage, "r");
    try {
      fsyncSync(directory);
    } finally {
      closeSync(directory);
    }
    publishNewDirectory(stage, target);
    return { created: manifest.created };
  } catch (e) {
    rmSync(stage, { recursive: true, force: true });
    throw e;
  }
}
/** Restaura únicamente en directorio nuevo. Desconectar servidores antes de cambiar su ruta. */
export function restore(
  source: string,
  destination: string,
  identity: string,
  options: { now?: number; allowOlder?: boolean } = {},
) {
  if (
    !["development", "test", "production"].includes(process.env.NODE_ENV ?? "")
  )
    throw new Error("Entorno de restauración inválido.");
  const target = resolve(destination);
  const config =
    process.env.NODE_ENV === "production" ? productionConfig() : null;
  if (config && (destination !== target || config.state !== target))
    throw new Error("Destino distinto de configuración productiva.");
  if (existsSync(target))
    throw new Error("Restauración requiere un directorio nuevo.");
  if (config) privateDirectory(dirname(target));
  else {
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    privateDirectory(dirname(target));
  }
  const stage = mkdtempSync(join(dirname(target), ".restore-"));
  try {
    const raw = join(stage, "bundle.tmp"),
      keyPath = join(stage, config ? basename(config.key) : "auth.key");
    const mask = process.umask(0o077);
    try {
      age([
        "--decrypt",
        "--identity",
        identity,
        "--output",
        raw,
        join(source, "database.age"),
      ]);
      age([
        "--decrypt",
        "--identity",
        identity,
        "--output",
        keyPath,
        join(source, "access-key.age"),
      ]);
    } finally {
      process.umask(mask);
    }
    const bundle = JSON.parse(readFileSync(raw, "utf8"));
    const bytes = Buffer.from(bundle.database, "base64");
    if (
      bundle.manifest?.format !== 1 ||
      ![1, 2, 3, 4, 5, 6, 7, 8].includes(bundle.manifest.schema) ||
      hash(bytes) !== bundle.manifest.sha256
    )
      throw new Error("Paquete o checksum inválido.");
    const created = Date.parse(bundle.manifest.created),
      now = options.now ?? Date.now();
    if (
      !Number.isFinite(created) ||
      created > now + 60000 ||
      (!options.allowOlder && now - created > 86400000)
    )
      throw new Error(
        "Antigüedad de copia requiere aceptación explícita (--allow-older).",
      );
    const path = join(
      stage,
      config ? basename(config.database) : "demo.sqlite",
    );
    writeFileSync(path, bytes, { mode: 0o600 });
    valid(path, bundle.manifest.schema);
    const key = readFileSync(keyPath);
    if (key.length !== 32) throw new Error("Clave de aplicación inválida.");
    const db = new Database(path, { strict: true });
    try {
      const id = inspectIdentity(db);
      assertMode(id, !!config);
      if (bundle.manifest.schema >= 6 && bundle.manifest.origin !== id?.origin)
        throw new Error("Origen del manifiesto inválido.");
      if (id?.origin === "production" && id.key_hash !== keyHash(key))
        throw new Error("Pareja DB/clave inválida.");
      const auth = new Auth(db, key);
      auth.checkKey();
      db.transaction(() => {
        for (const table of [
          "sessions",
          "challenges",
          "bootstrap",
          "recovery",
          "auth_limits",
          "idempotency",
          ...(bundle.manifest.schema >= 2 ? ["classification_attempts"] : []),
          ...(bundle.manifest.schema >= 3 ? ["cycle_attempts"] : []),
          ...(bundle.manifest.schema >= 4 ? ["movement_attempts"] : []),
          ...(bundle.manifest.schema >= 5 ? ["reference_attempts"] : []),
          ...(bundle.manifest.schema >= 7 ? ["debt_attempts"] : []),
          ...(bundle.manifest.schema >= 8 ? ["cycle_operation_attempts"] : []),
        ])
          db.run(`DELETE FROM ${table}`);
      })();
    } finally {
      db.close();
    }
    rmSync(raw);
    chmodSync(keyPath, 0o600);
    syncPath(path);
    syncPath(keyPath);
    syncPath(stage);
    publishNewDirectory(stage, target);
    return {
      created: bundle.manifest.created,
      database: join(target, basename(path)),
      key: join(target, basename(keyPath)),
    };
  } catch (e) {
    rmSync(stage, { recursive: true, force: true });
    throw e;
  }
}
