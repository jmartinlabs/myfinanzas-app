import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";

export const schemaVersion = 18;
export type Identity = {
  origin: "demo" | "production";
  key_hash: string | null;
};
export const keyHash = (key: Buffer) =>
  createHash("sha256").update(key).digest("hex");
const has = (db: Database, name: string) =>
  !!db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);

export function inspectIdentity(db: Database): Identity | null {
  const marker = has(db, "database_origin");
  if (!has(db, "schema_version")) {
    if (
      db
        .query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .get()
    )
      throw new Error("Esquema sin versión no compatible.");
    return null;
  }
  const versions = db.query("SELECT version FROM schema_version").all() as {
    version: number;
  }[];
  if (
    versions.length !== 1 ||
    ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, schemaVersion].includes(
      versions[0].version,
    )
  )
    throw new Error("Esquema no compatible.");
  if (versions[0].version < 6) {
    if (marker)
      throw new Error("Identidad preliminar no compatible; no se adoptará.");
    return null;
  }
  if (!marker) throw new Error("Identidad ausente.");
  const rows = db
    .query("SELECT id,contract,origin,key_hash FROM database_origin")
    .all() as (Identity & { id: number; contract: number })[];
  const row = rows[0];
  if (
    rows.length !== 1 ||
    row.id !== 1 ||
    row.contract !== 1 ||
    !["demo", "production"].includes(row.origin) ||
    (row.origin === "demo"
      ? row.key_hash !== null
      : !/^[a-f0-9]{64}$/.test(row.key_hash ?? ""))
  )
    throw new Error("Identidad inválida.");
  return { origin: row.origin, key_hash: row.key_hash };
}

export function assertMode(identity: Identity | null, production: boolean) {
  if (
    production
      ? identity?.origin !== "production"
      : identity?.origin === "production"
  )
    throw new Error("El origen de la base no corresponde al entorno.");
}

export function installIdentity(db: Database, identity: Identity) {
  db.exec(`CREATE TABLE database_origin(
    id INTEGER PRIMARY KEY CHECK(id=1), contract INTEGER NOT NULL CHECK(contract=1),
    origin TEXT NOT NULL CHECK(origin IN ('demo','production')), key_hash TEXT,
    CHECK((origin='demo' AND key_hash IS NULL) OR (origin='production' AND length(key_hash)=64))
  ) STRICT;`);
  db.run("INSERT INTO database_origin VALUES(1,1,?,?)", [
    identity.origin,
    identity.key_hash,
  ]);
  db.exec(`CREATE TRIGGER origin_no_update BEFORE UPDATE ON database_origin BEGIN SELECT RAISE(ABORT,'immutable origin'); END;
    CREATE TRIGGER origin_no_delete BEFORE DELETE ON database_origin BEGIN SELECT RAISE(ABORT,'immutable origin'); END;
    UPDATE schema_version SET version=6;`);
}
