import type { Database } from "bun:sqlite";
import {
  AUDIT_PAYLOAD_COLUMNS,
  ENTITY_COUNT_QUERIES,
  EXCLUDED_COLUMNS,
  EXCLUDED_TABLES,
  ID_QUERIES,
} from "./constants";
import { canonicalJson } from "./canonical-json";
import { sha256Hex } from "./files";

type Column = { name: string; pk: number };

function quote(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function includedTables(db: Database): string[] {
  return (
    db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[]
  )
    .map((row) => row.name)
    .filter(
      (name) =>
        !EXCLUDED_TABLES.has(name) && !name.endsWith("_attempts"),
    );
}

function columns(db: Database, table: string): Column[] {
  return (
    db.query(`PRAGMA table_info(${quote(table)})`).all() as {
      name: string;
      pk: number;
    }[]
  ).map((row) => ({ name: row.name, pk: row.pk }));
}

function projection(table: string, all: Column[]) {
  if (table === "movement_audit")
    return ["id", "revision", "accion", "motivo", "actor"];
  if (table === "audit")
    return [
      "entidad",
      "accion",
      "revision",
      "campos",
      "revision_previa",
      "actor",
      "motivo",
    ];
  if (table === "database_origin")
    return all
      .map((column) => column.name)
      .filter((name) => name !== "key_hash");
  if (table.endsWith("_audit"))
    return all
      .map((column) => column.name)
      .filter(
        (name) =>
          name !== "id" &&
          !EXCLUDED_COLUMNS.has(name) &&
          !AUDIT_PAYLOAD_COLUMNS.has(name),
      );
  return all
    .map((column) => column.name)
    .filter((name) => !EXCLUDED_COLUMNS.has(name));
}

function order(table: string, all: Column[], selected: string[]) {
  const primary = all
    .filter((column) => column.pk > 0)
    .sort((a, b) => a.pk - b.pk)
    .map((column) => column.name);
  const usable = primary.filter((name) => selected.includes(name));
  const orderColumns = usable.length ? usable : selected;
  if (!orderColumns.length) return "";
  return ` ORDER BY ${orderColumns.map(quote).join(",")}`;
}

/** Proyección estable y de solo lectura; nunca escribe ni usa rowid físico. */
export function logicalChecksums(db: Database) {
  const result: Record<string, string> = {};
  for (const table of includedTables(db)) {
    const all = columns(db, table),
      selected = projection(table, all);
    const rows = (
      db
        .query(
          `SELECT ${selected.map(quote).join(",")} FROM ${quote(table)}${order(table, all, selected)}`,
        )
        .all() as Record<string, unknown>[]
    ).map((row) => selected.map((name) => row[name] ?? null));
    result[table] = sha256Hex(
      canonicalJson({ table, columns: selected, rows }),
    );
  }
  return result;
}

export function tableCounts(db: Database) {
  const result: Record<string, number> = {};
  for (const table of includedTables(db))
    result[table] = (
      db.query(`SELECT count(*) AS n FROM ${quote(table)}`).get() as {
        n: number;
      }
    ).n;
  return result;
}

export function emptyTables(counts: Record<string, number>) {
  return Object.entries(counts)
    .filter(([, count]) => count === 0)
    .map(([table]) => table)
    .sort();
}

export function readIds(db: Database) {
  const result: Record<string, string[]> = {};
  for (const [name, query] of Object.entries(ID_QUERIES))
    result[name] = (db.query(query).all() as { id: string }[]).map(
      (row) => row.id,
    );
  return result;
}

export function readEntityCounts(db: Database) {
  const result: Record<string, number> = {};
  for (const [name, query] of Object.entries(ENTITY_COUNT_QUERIES))
    result[name] = (
      db.query(query).get() as { n: number }
    ).n;
  return result;
}

export function assertDatabaseIntegrity(db: Database) {
  const integrity = db.query("PRAGMA integrity_check").get() as {
    integrity_check: string;
  };
  if (integrity.integrity_check !== "ok") return "integrity_check distinto de ok";
  if (db.query("PRAGMA foreign_key_check").all().length)
    return "foreign_key_check con filas";
  return null;
}
