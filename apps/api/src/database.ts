import { Database } from "bun:sqlite";
import { mkdirSync, chmodSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import {
  inspectIdentity,
  assertMode,
  type Identity,
  keyHash,
} from "./database-identity";
import { prepareSchema } from "./database-schema";
import { assertV14VehicleContract } from "./compartido-schema";
import { productionConfig, openProductionConnection } from "./private-state";

export function openDatabase(path: string) {
  const mode = process.env.NODE_ENV;
  if (!["development", "test", "production"].includes(mode ?? ""))
    throw new Error(
      "E1.1 solo admite development/test; producción exige configuración explícita válida.",
    );
  const production = mode === "production";
  if (production) {
    const config = productionConfig();
    if (path !== config.database)
      throw new Error("Ruta productiva distinta de DATABASE_PATH.");
    const { db, key } = openProductionConnection(config, false);
    try {
      assertV14VehicleContract(db);
      db.exec(
        "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;",
      );
      db.transaction(() => {
        const identity = inspectIdentity(db);
        assertMode(identity, true);
        if (identity?.key_hash !== keyHash(key))
          throw new Error("Pareja DB/clave inválida en conexión efectiva.");
      }).immediate();
      // E1.6 versioned upgrade only after the effective private pair is verified.
      prepareSchema(db, { origin: "production", key_hash: keyHash(key) });
      return db;
    } catch (error) {
      db.close();
      throw error;
    }
  }
  if (!production && path !== ":memory:")
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const mask = process.umask(0o077);
  let db: Database;
  try {
    db = new Database(path, { create: !production, strict: true });
  } finally {
    process.umask(mask);
  }
  try {
    // Connection-local only: install the existing wait policy before reading live metadata.
    db.exec("PRAGMA busy_timeout=3000");
    // 31-E1: verify origin and version from one read snapshot before any persistent
    // PRAGMA, chmod or migration (prepareSchema runs only after this check).
    assertMode(db.transaction(() => inspectIdentity(db))(), production);
    const identity: Identity = { origin: "demo", key_hash: null };
    prepareSchema(db, identity);
    if (!production && path !== ":memory:") chmodSync(path, 0o600);
    return db;
  } catch (error) {
    try {
      db.close();
    } catch {}
    throw error;
  }
}
