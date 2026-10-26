/**
 * PRE-DEV-SCHEMA evidence generator for E4.1. Not imported by the application.
 * Usage: bun run generate-schema-contract.ts <id> <commit> <database-schema.ts> <db> <out.json>
 */
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";

const [id, sourceCommit, modulePath, dbPath, outPath] = process.argv.slice(2);
if (!id || !sourceCommit || !modulePath || !dbPath || !outPath) {
  throw new Error("usage: generate-schema-contract.ts <id> <commit> <database-schema.ts> <db> <out.json>");
}

try { unlinkSync(dbPath); } catch {}
const { prepareSchema } = await import(modulePath);
const db = new Database(dbPath, { create: true, strict: true });
try {
  prepareSchema(db, { origin: "demo", key_hash: null });
} finally {
  db.close();
}

const check = new Database(dbPath, { readonly: true, strict: true });
const version = (check.query("SELECT version FROM schema_version").get() as { version: number }).version;
const rows = check
  .query("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type,name")
  .all() as Array<{ type: string; name: string; tbl_name: string; sql: string }>;
check.close();

const objects = rows.map((r) => ({ type: r.type, name: r.name, tbl_name: r.tbl_name, sql: r.sql.trim() }));
const sha256 = createHash("sha256").update(JSON.stringify(objects), "utf8").digest("hex");
writeFileSync(outPath, JSON.stringify({ id, sourceCommit, schemaVersion: version, objects, sha256 }, null, 2) + "\n");
console.log(JSON.stringify({ id, sourceCommit, schemaVersion: version, objects: objects.length, sha256 }));
