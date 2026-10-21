import { Database } from "bun:sqlite";
import { mkdirSync, chmodSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import {
  inspectIdentity,
  assertMode,
  type Identity,
} from "./database-identity";
import { prepareSchema } from "./database-schema";
import { productionConfig, verifyProductionFiles } from "./private-state";

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
    verifyProductionFiles(config);
  }
  if (path !== ":memory:" && existsSync(path)) {
    const probe = new Database(path, { readonly: true, strict: true });
    try {
      assertMode(inspectIdentity(probe), production);
    } finally {
      probe.close();
    }
  } else if (production) throw new Error("Base productiva inexistente.");
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
    assertMode(inspectIdentity(db), production);
    const identity: Identity = { origin: "demo", key_hash: null };
    if (production) {
      // Configuration/key validated before any writable PRAGMA. Recheck in the effective connection.
      verifyProductionFiles(productionConfig());
      db.exec(
        "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;",
      );
      db.transaction(() => assertMode(inspectIdentity(db), true)).immediate();
    } else prepareSchema(db, identity);
    if (!production && path !== ":memory:") chmodSync(path, 0o600);
    return db;
  } catch (error) {
    try {
      db.close();
    } catch {}
    throw error;
  }
}
