import type { Database } from "bun:sqlite";
import { join } from "node:path";
import { schemaVersion } from "../../apps/api/src/database-identity";
import {
  FAILURE_FILE,
  INITIAL_EMPTY_EXCEPTIONS,
  MANIFEST_FILE,
  MARKER_FILE,
  SEED_DATASET,
  SEED_DATASET_VERSION,
  SEED_FORMAT,
  SEED_SCHEMA_CONTRACT,
  SEED_SCHEMA_VERSION,
  TEST_ORIGIN,
} from "./constants";
import { dataset } from "./dataset/ft1";
import { includedTables, tableCounts } from "./checksum";
import { writeNewPrivateFile } from "./files";
import { SeedError } from "./errors";

export type TestInstanceMarker = {
  format: 1;
  environment: "test";
  public_origin: string;
  dataset: "FT-1";
  dataset_version: 1;
  schema_version: number;
  schema_contract: string;
  seed_manifest_sha256: string | null;
  seed_commit: string;
  created_at: string;
};

export type SeedFailure = {
  format: 1;
  environment: "test";
  dataset: "FT-1";
  dataset_version: 1;
  code: 1 | 2 | 3;
  step: string;
  message: string;
  created_at: string;
};

export const markerPath = (root: string) => join(root, MARKER_FILE);
export const manifestPath = (root: string) => join(root, MANIFEST_FILE);
export const failurePath = (root: string) => join(root, FAILURE_FILE);

export function expectedInitMarker(commit: string): TestInstanceMarker {
  return {
    format: SEED_FORMAT,
    environment: "test",
    public_origin: TEST_ORIGIN,
    dataset: SEED_DATASET,
    dataset_version: SEED_DATASET_VERSION,
    schema_version: SEED_SCHEMA_VERSION,
    schema_contract: SEED_SCHEMA_CONTRACT,
    seed_manifest_sha256: null,
    seed_commit: commit,
    created_at: dataset.anchor,
  };
}

export function markerJson(marker: TestInstanceMarker) {
  return JSON.stringify(marker, null, 2) + "\n";
}

export function validateMarker(
  marker: unknown,
  commit?: string,
): string | null {
  if (!marker || typeof marker !== "object" || Array.isArray(marker))
    return "marcador no es un objeto";
  const value = marker as Record<string, unknown>;
  if (value.format !== SEED_FORMAT) return "format distinto";
  if (value.environment !== "test") return "environment distinto de test";
  if (value.public_origin !== TEST_ORIGIN) return "public_origin distinto";
  if (value.dataset !== SEED_DATASET) return "dataset distinto";
  if (value.dataset_version !== SEED_DATASET_VERSION)
    return "dataset_version distinta";
  if (value.schema_version !== SEED_SCHEMA_VERSION)
    return "schema_version distinta";
  if (value.schema_contract !== SEED_SCHEMA_CONTRACT)
    return "schema_contract distinto";
  if (
    typeof value.seed_commit !== "string" ||
    !/^[a-f0-9]{40}$/.test(value.seed_commit)
  )
    return "seed_commit inválido";
  if (commit !== undefined && value.seed_commit !== commit)
    return "seed_commit distinto del solicitado";
  if (
    value.seed_manifest_sha256 !== null &&
    (typeof value.seed_manifest_sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(value.seed_manifest_sha256))
  )
    return "seed_manifest_sha256 inválido";
  if (value.created_at !== dataset.anchor) return "created_at distinto";
  return null;
}

export function assertSchema27(db: Database) {
  const rows = db.query("SELECT version FROM schema_version").all() as {
    version: number;
  }[];
  if (rows.length !== 1 || rows[0].version !== schemaVersion)
    throw new SeedError(
      2,
      "El esquema no es exactamente 27; no se migra ni se repara.",
      "schema",
    );
}

export function ownerCount(db: Database) {
  return (
    db.query("SELECT count(*) AS n FROM owner").get() as { n: number }
  ).n;
}

export function saldoIds(db: Database) {
  return (db.query("SELECT id FROM saldos ORDER BY id").all() as {
    id: string;
  }[]).map((row) => row.id);
}

export function freshStateProblem(db: Database): string | null {
  if (ownerCount(db) !== 0)
    return "El estado ya tiene propietario; no es un TEST limpio.";
  const saldos = saldoIds(db);
  if (saldos.length !== 1 || saldos[0] !== "S000")
    return "El estado no tiene solo el Saldo técnico S000.";
  const counts = tableCounts(db);
  for (const table of includedTables(db))
    if (
      !INITIAL_EMPTY_EXCEPTIONS.has(table) &&
      (counts[table] ?? 0) !== 0
    )
      return "El estado contiene datos ajenos al seed; no se limpia ni se repara.";
  return null;
}

export function assertFreshState(db: Database) {
  const problem = freshStateProblem(db);
  if (problem)
    throw new SeedError(
      2,
      problem,
      problem.includes("propietario")
        ? "owner"
        : problem.includes("S000")
          ? "empty"
          : "empty",
    );
}

export function writeFailure(
  root: string,
  configPaths: { database: string; key: string },
  step: string,
  error: unknown,
) {
  const path = failurePath(root);
  try {
    const raw = error instanceof Error ? error.message : String(error);
    const message = raw
      .replaceAll(root, "<data-root>")
      .replaceAll(configPaths.database, "<database>")
      .replaceAll(configPaths.key, "<key>")
      .replaceAll(/[\u0000-\u001f\u007f]/g, " ")
      .slice(0, 500);
    const value: SeedFailure = {
      format: 1,
      environment: "test",
      dataset: "FT-1",
      dataset_version: 1,
      code: 1,
      step,
      message,
      created_at: dataset.anchor,
    };
    writeNewPrivateFile(path, JSON.stringify(value, null, 2) + "\n");
  } catch (writeError) {
    if ((writeError as NodeJS.ErrnoException).code !== "EEXIST") throw writeError;
  }
}
