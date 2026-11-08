import type { Database } from "bun:sqlite";
import {
  DATABASE_RELATIVE,
  EXCLUDED_COLUMNS,
  EXCLUDED_TABLES,
  KEY_RELATIVE,
  SEED_BUN,
  SEED_DATA_CONTRACT,
  SEED_DATASET,
  SEED_DATASET_VERSION,
  SEED_FORMAT,
  SEED_SCHEMA_CONTRACT,
  SEED_SCHEMA_CONTRACT_SHA256,
  SEED_SCHEMA_VERSION,
  TEST_ORIGIN,
} from "./constants";
import { dataset, datasetFileSha256, datasetLogicalSha256 } from "./dataset/ft1";
import {
  emptyTables,
  logicalChecksums,
  readEntityCounts,
  readIds,
  tableCounts,
} from "./checksum";
import { canonicalJson } from "./canonical-json";
import { SeedError } from "./errors";

export type SeedManifest = {
  format: 1;
  dataset: {
    id: "FT-1";
    version: 1;
    file_sha256: string;
    logical_sha256: string;
    coverage: { covered: string[]; partial: string[] };
  };
  source: {
    commit: string;
    schema: number;
    schema_contract: string;
    schema_contract_sha256: string;
    data_contract: string;
    bun: string;
    seed_image: string | null;
  };
  environment: {
    name: "test";
    public_origin: string;
    database: string;
    key: string;
  };
  ids: Record<string, string[]>;
  counts: Record<string, number>;
  empty_tables: string[];
  logical_checksums: Record<string, string>;
  excluded_from_hash: {
    tables: string[];
    table_patterns: string[];
    columns: string[];
  };
  created_at: string;
};

export function assertSeedRuntime() {
  if (Bun.version !== SEED_BUN)
    throw new SeedError(
      2,
      `Bun ${Bun.version} distinto del contrato ${SEED_BUN}.`,
      "environment",
    );
}

export function staticManifest(
  commit: string,
  seedImage: string | null = null,
): Omit<
  SeedManifest,
  "ids" | "counts" | "empty_tables" | "logical_checksums"
> {
  return {
    format: SEED_FORMAT,
    dataset: {
      id: SEED_DATASET,
      version: SEED_DATASET_VERSION,
      file_sha256: datasetFileSha256,
      logical_sha256: datasetLogicalSha256,
      coverage: dataset.coverage,
    },
    source: {
      commit,
      schema: SEED_SCHEMA_VERSION,
      schema_contract: SEED_SCHEMA_CONTRACT,
      schema_contract_sha256: SEED_SCHEMA_CONTRACT_SHA256,
      data_contract: SEED_DATA_CONTRACT,
      bun: SEED_BUN,
      // I2 (release pareado) registra aquí el ID inmutable de la imagen seed.
      seed_image: seedImage,
    },
    environment: {
      name: "test",
      public_origin: TEST_ORIGIN,
      database: DATABASE_RELATIVE,
      key: KEY_RELATIVE,
    },
    excluded_from_hash: {
      tables: [...EXCLUDED_TABLES].sort(),
      table_patterns: ["*_attempts"],
      columns: [
        ...EXCLUDED_COLUMNS,
        "audit.id",
        "audit.campos.*.<columna temporal>",
        "*_audit.id",
        "*_audit.anterior",
        "*_audit.posterior",
      ].sort(),
    },
    created_at: dataset.anchor,
  };
}

export function effectiveManifest(
  db: Database,
  commit: string,
  seedImage: string | null = null,
): SeedManifest {
  const base = staticManifest(commit, seedImage),
    counts = tableCounts(db);
  return {
    ...base,
    ids: readIds(db),
    counts,
    empty_tables: emptyTables(counts),
    logical_checksums: logicalChecksums(db),
  };
}

export function assertExpectedDatasetState(
  db: Database,
  mode: "apply" | "verify",
) {
  const ids = readIds(db),
    counts = readEntityCounts(db);
  if (canonicalJson(ids) !== canonicalJson(dataset.expected.ids))
    throw new SeedError(
      mode === "apply" ? 1 : 3,
      "IDs generados distintos del dataset FT-1 congelado.",
      "dataset",
    );
  if (canonicalJson(counts) !== canonicalJson(dataset.expected.entity_counts))
    throw new SeedError(
      mode === "apply" ? 1 : 3,
      "Conteos generados distintos del dataset FT-1 congelado.",
      "dataset",
    );
}

export function validateManifestStatic(
  manifest: SeedManifest,
  commit: string,
  seedImage: string | null = null,
) {
  const expected = staticManifest(commit, seedImage);
  if (canonicalJson(manifest.format) !== canonicalJson(expected.format))
    return "formato de manifiesto distinto";
  if (canonicalJson(manifest.dataset) !== canonicalJson(expected.dataset))
    return "dataset del manifiesto distinto del fichero FT-1 actual";
  if (canonicalJson(manifest.source) !== canonicalJson(expected.source))
    return "origen o contrato del manifiesto distinto";
  if (canonicalJson(manifest.environment) !== canonicalJson(expected.environment))
    return "entorno del manifiesto distinto";
  if (canonicalJson(manifest.excluded_from_hash) !== canonicalJson(expected.excluded_from_hash))
    return "reglas de exclusión distintas";
  if (manifest.created_at !== expected.created_at)
    return "created_at distinto del ancla del dataset";
  return null;
}

export function validateManifestRuntime(db: Database, manifest: SeedManifest) {
  const effective = effectiveManifest(
    db,
    manifest.source.commit,
    manifest.source.seed_image,
  );
  for (const field of [
    "ids",
    "counts",
    "empty_tables",
    "logical_checksums",
  ] as const)
    if (canonicalJson(manifest[field]) !== canonicalJson(effective[field]))
      return `sección ${field} distinta del estado`;
  return null;
}
