import { Database } from "bun:sqlite";
import { randomBytes } from "node:crypto";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  chmodSync,
} from "node:fs";
import { dirname, basename, join } from "node:path";
import { prepareSchema } from "./database-schema";
import { keyHash, inspectIdentity } from "./database-identity";
import {
  productionConfig,
  privateDirectory,
  syncPath,
  publishNewDirectory,
} from "./private-state";

export function initializeProduction() {
  if (process.env.NODE_ENV !== "production")
    throw new Error("Inicialización requiere NODE_ENV=production.");
  const config = productionConfig();
  const root = dirname(config.state);
  privateDirectory(root);
  const stage = mkdtempSync(join(root, ".initialize-"));
  let db: Database | undefined;
  try {
    const key = randomBytes(32);
    const keyPath = join(stage, basename(config.key)),
      databasePath = join(stage, basename(config.database));
    writeFileSync(keyPath, key, { mode: 0o600, flag: "wx" });
    // Exclusive creation before SQLite opens the path; never act on an existing target.
    writeFileSync(databasePath, Buffer.alloc(0), { mode: 0o600, flag: "wx" });
    db = new Database(databasePath, { strict: true });
    prepareSchema(db, { origin: "production", key_hash: keyHash(key) });
    if (
      inspectIdentity(db)?.origin !== "production" ||
      (db.query("SELECT count(*) AS n FROM saldos").get() as { n: number })
        .n !== 1 ||
      (db.query("PRAGMA integrity_check").get() as { integrity_check: string })
        .integrity_check !== "ok" ||
      db.query("PRAGMA foreign_key_check").all().length
    )
      throw new Error("Inicialización no íntegra.");
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    db.close();
    db = undefined;
    chmodSync(databasePath, 0o600);
    syncPath(databasePath);
    syncPath(keyPath);
    syncPath(stage);
    publishNewDirectory(stage, config.state);
    return config;
  } finally {
    if (db) db.close();
    rmSync(stage, { recursive: true, force: true });
  }
}
