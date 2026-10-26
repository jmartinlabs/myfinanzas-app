import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type ContractObject = {
  type: string;
  name: string;
  tbl_name: string;
  sql: string;
};
export type SchemaContract = {
  id: string;
  sourceCommit: string;
  schemaVersion: number;
  objects: ContractObject[];
  sha256: string;
};

const file = join(import.meta.dir, "schema-contracts.json");
let cached: SchemaContract[] | null = null;

export function contracts(): SchemaContract[] {
  if (cached) return cached;
  const parsed = JSON.parse(readFileSync(file, "utf8")) as SchemaContract[];
  for (const contract of parsed) {
    const objects = contract.objects
      .map((object) => ({
        type: object.type,
        name: object.name,
        tbl_name: object.tbl_name,
        sql: object.sql.trim(),
      }))
      .sort((a, b) =>
        a.type < b.type ? -1 : a.type > b.type ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
      );
    const sha256 = createHash("sha256")
      .update(JSON.stringify(objects), "utf8")
      .digest("hex");
    if (sha256 !== contract.sha256 || objects.length !== contract.objects.length)
      throw new Error("Manifiesto de contrato de esquema corrupto.");
    contract.objects = objects;
  }
  cached = parsed;
  return parsed;
}

export function contract(id: string) {
  const found = contracts().find((entry) => entry.id === id);
  if (!found) throw new Error("Contrato de esquema no registrado.");
  return found;
}

export const admitted = {
  14: "C14-VEHICULOS-C69E343",
  15: "C15-COMPARTIDOS-AD2EDFE",
  // Historical evidence only; never an upgrade origin.
  historical14: "C14-COMPARTIDOS-FCE1107",
} as const;

export function manifest(db: Database): ContractObject[] {
  return (
    db
      .query(
        "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type,name",
      )
      .all() as ContractObject[]
  ).map((object) => ({
    type: object.type,
    name: object.name,
    tbl_name: object.tbl_name,
    sql: object.sql.trim(),
  }));
}

function literal(version: number) {
  return `Contrato de esquema v${version} desconocido o incompleto; no se modificará esta base.`;
}

/** Compares the exact canonical manifest before any persistent PRAGMA or write. */
export function verifyContract(db: Database, version: number) {
  const id =
    version === 14
      ? admitted[14]
      : version === 15
        ? admitted[15]
        : null;
  if (!id) return null;
  const expected = contract(id);
  if (
    JSON.stringify(manifest(db)) !== JSON.stringify(expected.objects) ||
    db.query("PRAGMA foreign_key_check").all().length !== 0
  )
    throw new Error(literal(version));
  return expected.id;
}

/** Reads the version and verifies either admitted v14/v15 contract before mutating. */
export function verifyAdmittedContract(db: Database) {
  const exists = db
    .query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'",
    )
    .get();
  if (!exists) return null;
  const rows = db.query("SELECT version FROM schema_version").all() as {
    version: number;
  }[];
  if (rows.length !== 1) throw new Error("Esquema no compatible; no se modificará esta base.");
  const version = rows[0].version;
  if (version > 16)
    throw new Error("Esquema no compatible; no se modificará esta base.");
  return verifyContract(db, version);
}
