import type { Database } from "bun:sqlite";
import { openProductionConnection, type ProductionConfig } from "../../apps/api/src/private-state";
import { schemaVersion } from "../../apps/api/src/database-identity";
import {
  APPLY_PRAGMAS,
} from "./constants";
import { loadSeedConfig, assertEnvironment } from "./config";
import { assertSeedRuntime } from "./manifest";
import {
  optionalPrivateJson,
  replacePrivateFile,
  sha256Hex,
  writeNewPrivateFile,
} from "./files";
import {
  effectiveManifest,
  assertExpectedDatasetState,
  validateManifestRuntime,
  validateManifestStatic,
  type SeedManifest,
} from "./manifest";
import {
  assertDatabaseIntegrity,
  readEntityCounts,
} from "./checksum";
import {
  assertFreshState,
  assertSchema28,
  expectedInitMarker,
  failurePath,
  freshStateProblem,
  manifestPath,
  markerJson,
  markerPath,
  ownerCount,
  validateMarker,
  writeFailure,
  type SeedFailure,
  type TestInstanceMarker,
} from "./state";
import { dataset } from "./dataset/ft1";
import { applyDataset, ApplyFailure } from "./apply";
import {
  SeedError,
  type SeedExitCode,
} from "./errors";

export type SeedCommand = "init" | "apply" | "verify" | "status";

export type SeedResult = {
  command: SeedCommand;
  code: SeedExitCode;
  message: string;
  noop?: boolean;
  manifestSha256?: string | null;
  status?: string;
  detail?: Record<string, unknown>;
};

type ParsedArguments = {
  command: SeedCommand;
  dataRoot: string;
  seedCommit?: string;
  expectedManifestSha256?: string;
  seedImage?: string;
};

const SEED_IMAGE = /^sha256:[a-f0-9]{64}$/;

const COMMANDS = new Set(["init", "apply", "verify", "status"]);

export function parseArguments(argv: readonly string[]): ParsedArguments {
  const command = argv[0];
  if (!command || !COMMANDS.has(command))
    throw new SeedError(1, "Comando requerido: init, apply, verify o status.");
  const flags = new Map<string, string>();
  for (let index = 1; index < argv.length; index++) {
    const argument = argv[index];
    if (!argument.startsWith("--"))
      throw new SeedError(2, "No se aceptan argumentos posicionales ni ficheros.");
    const equals = argument.indexOf("=");
    const name = equals > 0 ? argument.slice(0, equals) : argument;
    const value =
      equals > 0 ? argument.slice(equals + 1) : argv[++index] ?? "";
    if (!value || value.startsWith("--"))
      throw new SeedError(2, `Falta el valor de ${name}.`);
    if (flags.has(name)) throw new SeedError(2, `Parámetro repetido: ${name}.`);
    flags.set(name, value);
  }
  const allowed =
    command === "init" || command === "apply"
      ? ["--data-root", "--seed-commit", "--seed-image"]
      : command === "verify"
        ? ["--data-root", "--expected-manifest-sha256", "--seed-image"]
        : ["--data-root"];
  for (const name of flags.keys())
    if (!allowed.includes(name))
      throw new SeedError(2, `Parámetro no admitido: ${name}.`);
  const dataRoot = flags.get("--data-root");
  if (!dataRoot) throw new SeedError(2, "Falta --data-root.");
  const seedCommit = flags.get("--seed-commit")?.toLowerCase();
  if (command === "init" || command === "apply") {
    if (!seedCommit || !/^[a-f0-9]{40}$/.test(seedCommit))
      throw new SeedError(2, "--seed-commit debe ser un SHA de 40 hex.");
  }
  const expectedManifestSha256 = flags
    .get("--expected-manifest-sha256")
    ?.toLowerCase();
  if (
    command === "verify" &&
    expectedManifestSha256 !== undefined &&
    !/^[a-f0-9]{64}$/.test(expectedManifestSha256)
  )
    throw new SeedError(2, "--expected-manifest-sha256 debe ser SHA-256 hex.");
  const seedImage = flags.get("--seed-image")?.toLowerCase();
  if (seedImage !== undefined && !SEED_IMAGE.test(seedImage))
    throw new SeedError(
      2,
      "--seed-image debe ser un ID inmutable sha256:<64 hex>.",
    );
  return {
    command: command as SeedCommand,
    dataRoot,
    seedCommit,
    expectedManifestSha256,
    seedImage,
  };
}

function readConnection(config: ProductionConfig) {
  try {
    return openProductionConnection(config, true);
  } catch {
    throw new SeedError(
      2,
      "El estado productivo no supera identidad, pareja DB/clave o contrato 28.",
      "schema",
    );
  }
}

function writeConnection(config: ProductionConfig) {
  try {
    return openProductionConnection(config, false);
  } catch {
    throw new SeedError(
      2,
      "El estado productivo no supera identidad, pareja DB/clave o contrato 28.",
      "schema",
    );
  }
}

function readState(root: string) {
  return {
    marker: optionalPrivateJson<TestInstanceMarker>(
      markerPath(root),
      2,
      "marcador TEST",
    ),
    manifest: optionalPrivateJson<SeedManifest>(
      manifestPath(root),
      3,
      "manifiesto de seed",
    ),
    failure: optionalPrivateJson<SeedFailure>(
      failurePath(root),
      3,
      "marcador de fallo",
    ),
  };
}

function markerOrThrow(root: string): TestInstanceMarker {
  const marker = optionalPrivateJson<TestInstanceMarker>(
    markerPath(root),
    2,
    "marcador TEST",
  );
  if (!marker)
    throw new SeedError(2, "Marcador TEST ausente; ejecuta seed init.", "marker");
  const problem = validateMarker(marker.value);
  if (problem)
    throw new SeedError(2, `Marcador TEST ajeno: ${problem}.`, "marker");
  return marker.value;
}

function assertNoFailure(root: string) {
  const failure = optionalPrivateJson<SeedFailure>(
    failurePath(root),
    3,
    "marcador de fallo",
  );
  if (failure)
    throw new SeedError(
      3,
      "Existe un fallo previo registrado; no se reintenta sin reset autorizado.",
      "failure",
    );
}

function assertManifestStaticAndRuntime(
  db: Database,
  manifest: SeedManifest,
  commit: string,
  seedImage: string | null,
) {
  const staticProblem = validateManifestStatic(manifest, commit, seedImage);
  if (staticProblem)
    throw new SeedError(3, `Manifiesto de seed inválido: ${staticProblem}.`, "manifest");
  const runtimeProblem = validateManifestRuntime(db, manifest);
  if (runtimeProblem)
    throw new SeedError(3, `Drift lógico: ${runtimeProblem}.`, "checksums");
}

function assertIntegrity(db: Database) {
  const problem = assertDatabaseIntegrity(db);
  if (problem) throw new SeedError(3, `Verificación fallida: ${problem}.`, "integrity");
}

function assertNoManifest(root: string) {
  if (
    optionalPrivateJson<SeedManifest>(
      manifestPath(root),
      3,
      "manifiesto de seed",
    )
  )
    throw new SeedError(2, "Manifiesto de seed presente sin marcador TEST válido.", "manifest");
}

export function initSeed(parsed: ParsedArguments): SeedResult {
  assertEnvironment();
  assertSeedRuntime();
  const { root, config } = loadSeedConfig(parsed.dataRoot);
  assertNoFailure(root);
  const commit = parsed.seedCommit!;
  const existing = optionalPrivateJson<TestInstanceMarker>(
    markerPath(root),
    2,
    "marcador TEST",
  );
  const seedImage =
    parsed.seedImage ?? existing?.value.seed_image ?? null;
  if (existing) {
    const problem = validateMarker(existing.value, commit, seedImage);
    if (problem)
      throw new SeedError(2, `Marcador TEST ajeno: ${problem}.`, "marker");
    if (existing.value.seed_manifest_sha256 !== null)
      throw new SeedError(
        2,
        "El marcador ya apunta a un seed aplicado; usa verify.",
        "marker",
      );
    return {
      command: "init",
      code: 0,
      noop: true,
      message: "Marcador TEST ya inicializado con el mismo contenido.",
    };
  }
  assertNoManifest(root);
  const { db } = readConnection(config);
  try {
    assertSchema28(db);
    assertFreshState(db);
  } finally {
    db.close();
  }
  try {
    writeNewPrivateFile(
      markerPath(root),
      markerJson(expectedInitMarker(commit, seedImage)),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new SeedError(2, "El marcador TEST apareció durante init.", "marker");
    throw error;
  }
  return {
    command: "init",
    code: 0,
    noop: false,
    message: "Marcador TEST creado; ejecuta seed apply.",
  };
}

type ApplyState = {
  root: string;
  config: ProductionConfig;
  marker: TestInstanceMarker;
  manifestSha256: string | null;
};

function applyState(
  db: Database,
  root: string,
  commit: string,
  requestedImage?: string,
): ApplyState {
  const marker = markerOrThrow(root);
  const problem = validateMarker(marker, commit, requestedImage);
  if (problem)
    throw new SeedError(2, `Marcador TEST ajeno: ${problem}.`, "marker");
  const seedImage = requestedImage ?? marker.seed_image ?? null;
  assertNoFailure(root);
  const manifest = optionalPrivateJson<SeedManifest>(
    manifestPath(root),
    3,
    "manifiesto de seed",
  );
  if (marker.seed_manifest_sha256 === null) {
    if (manifest)
      throw new SeedError(
        3,
        "Estado parcial: manifiesto presente con marcador sin aplicar.",
        "partial",
      );
    assertFreshState(db);
    return {
      root,
      config: loadSeedConfig(root).config,
      marker,
      manifestSha256: null,
    };
  }
  if (!manifest)
    throw new SeedError(
      3,
      "Estado parcial: el marcador apunta a un manifiesto ausente.",
      "partial",
    );
  if (manifest.sha256 !== marker.seed_manifest_sha256)
    throw new SeedError(
      3,
      "Drift: el manifiesto no coincide con la huella del marcador.",
      "manifest",
    );
  assertManifestStaticAndRuntime(
    db,
    manifest.value,
    marker.seed_commit,
    seedImage,
  );
  assertExpectedDatasetState(db, "verify");
  return {
    root,
    config: loadSeedConfig(root).config,
    marker,
    manifestSha256: manifest.sha256,
  };
}

export function applySeed(parsed: ParsedArguments): SeedResult {
  assertEnvironment();
  assertSeedRuntime();
  const { root, config } = loadSeedConfig(parsed.dataRoot);
  const commit = parsed.seedCommit!;
  const readDb = readConnection(config).db;
  let state: ApplyState;
  try {
    assertSchema28(readDb);
    state = applyState(readDb, root, commit, parsed.seedImage);
  } finally {
    readDb.close();
  }
  if (state.manifestSha256 !== null)
    return {
      command: "apply",
      code: 0,
      noop: true,
      manifestSha256: state.manifestSha256,
      message: "FT-1 ya sembrado; no se escribió nada.",
    };

  const { db } = writeConnection(config);
  try {
    assertSchema28(db);
    const current = applyState(db, root, commit, parsed.seedImage);
    if (current.manifestSha256 !== null)
      return {
        command: "apply",
        code: 0,
        noop: true,
        manifestSha256: current.manifestSha256,
        message: "FT-1 ya sembrado; no se escribió nada.",
      };
    db.exec(APPLY_PRAGMAS);
    let step = "inicio";
    let failureWritten = false;
    const recordFailure = (at: string, cause: unknown) => {
      if (failureWritten) return;
      try {
        writeFailure(root, config, at, cause);
        failureWritten = true;
      } catch {}
    };
    try {
      step = "dataset";
      applyDataset(db);
      step = "manifiesto";
      const manifest = effectiveManifest(
        db,
        commit,
        parsed.seedImage ?? state.marker.seed_image ?? null,
      );
      step = "verificacion";
      assertExpectedDatasetState(db, "apply");
      assertIntegrity(db);
      const text = JSON.stringify(manifest, null, 2) + "\n";
      step = "manifiesto";
      writeNewPrivateFile(manifestPath(root), text);
      const manifestSha256 = sha256Hex(text);
      step = "marcador";
      replacePrivateFile(
        markerPath(root),
        markerJson({ ...state.marker, seed_manifest_sha256: manifestSha256 }),
      );
      try {
        db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      } catch {}
      return {
        command: "apply",
        code: 0,
        noop: false,
        manifestSha256,
        message: "FT-1 aplicado y manifiesto publicado.",
      };
    } catch (error) {
      const failure =
        error instanceof ApplyFailure
          ? error
          : new ApplyFailure(step, error);
      recordFailure(failure.step, failure.cause);
      throw new SeedError(
        1,
        `Aplicación fallida en ${failure.step}; no se declara éxito parcial.`,
        failure.step,
      );
    }
  } finally {
    db.close();
  }
}

export function verifySeed(parsed: ParsedArguments): SeedResult {
  assertEnvironment();
  assertSeedRuntime();
  const { root, config } = loadSeedConfig(parsed.dataRoot);
  const { db } = readConnection(config);
  try {
    assertSchema28(db);
    const marker = markerOrThrow(root);
    const manifest = optionalPrivateJson<SeedManifest>(
      manifestPath(root),
      3,
      "manifiesto de seed",
    );
    if (!manifest)
      throw new SeedError(3, "Manifiesto de seed ausente.", "manifest");
    if (marker.seed_manifest_sha256 === null)
      throw new SeedError(
        3,
        "El marcador no registra un seed aplicado.",
        "manifest",
      );
    if (manifest.sha256 !== marker.seed_manifest_sha256)
      throw new SeedError(
        3,
        "El manifiesto no coincide con la huella del marcador.",
        "manifest",
      );
    if (
      parsed.expectedManifestSha256 !== undefined &&
      parsed.expectedManifestSha256 !== manifest.sha256
    )
      throw new SeedError(
        3,
        "El manifiesto no coincide con --expected-manifest-sha256.",
        "manifest",
      );
    const declaredImage = manifest.value.source.seed_image ?? null;
    if ((marker.seed_image ?? null) !== null && marker.seed_image !== declaredImage)
      throw new SeedError(
        3,
        "El marcador y el manifiesto declaran seed_image distinto.",
        "manifest",
      );
    if (declaredImage !== null && parsed.seedImage === undefined)
      throw new SeedError(
        3,
        "El manifiesto declara seed_image; verify exige --seed-image.",
        "manifest",
      );
    if (
      parsed.seedImage !== undefined &&
      parsed.seedImage !== declaredImage
    )
      throw new SeedError(
        3,
        "El manifiesto no coincide con --seed-image.",
        "manifest",
      );
    assertManifestStaticAndRuntime(
      db,
      manifest.value,
      marker.seed_commit,
      parsed.seedImage ?? declaredImage,
    );
    assertExpectedDatasetState(db, "verify");
    assertIntegrity(db);
    return {
      command: "verify",
      code: 0,
      manifestSha256: manifest.sha256,
      message: "FT-1 verificado sin drift.",
    };
  } finally {
    db.close();
  }
}

export function statusSeed(parsed: ParsedArguments): SeedResult {
  try {
    assertEnvironment();
  assertSeedRuntime();
    const { root, config } = loadSeedConfig(parsed.dataRoot);
    let files: ReturnType<typeof readState>;
    try {
      files = readState(root);
    } catch (error) {
      if (error instanceof SeedError && error.code === 3)
        return {
          command: "status",
          code: 0,
          status: "drift",
          message: "Metadatos de seed inválidos o incompletos.",
        };
      throw error;
    }
    const detail: Record<string, unknown> = {
      marker: files.marker !== null,
      manifest: files.manifest !== null,
      failure: files.failure !== null,
      dataset: dataset.id,
      dataset_version: dataset.version,
    };
    if (files.marker) {
      const problem = validateMarker(files.marker.value);
      detail.marker_sha256 = files.marker.sha256;
      if (problem) {
        detail.marker_problem = problem;
        return {
          command: "status",
          code: 0,
          status: "foreign",
          message: "Marcador TEST ajeno.",
          detail,
        };
      }
      detail.seed_commit = files.marker.value.seed_commit;
      detail.seed_manifest_sha256 =
        files.marker.value.seed_manifest_sha256;
      detail.seed_image = files.marker.value.seed_image ?? null;
    }
    if (files.manifest) {
      detail.manifest_sha256 = files.manifest.sha256;
      detail.manifest_matches_marker =
        files.marker?.value.seed_manifest_sha256 === files.manifest.sha256;
    }
    let db: Database;
    try {
      db = readConnection(config).db;
    } catch (error) {
      return {
        command: "status",
        code: 2,
        status: "invalid",
        message: (error as Error).message,
        detail,
      };
    }
    try {
      const version = (
        db.query("SELECT version FROM schema_version").get() as {
          version: number;
        }
      ).version;
      detail.schema_version = version;
      detail.owner = ownerCount(db) > 0;
      detail.entity_counts = readEntityCounts(db);
      if (files.failure) return statusResult("failed", detail);
      if (version !== schemaVersion) return statusResult("invalid", detail);
      if (files.marker && files.manifest) {
        if (files.marker.value.seed_manifest_sha256 === null)
          return statusResult("partial", detail);
        if (files.manifest.sha256 !== files.marker.value.seed_manifest_sha256)
          return statusResult("drift", detail);
        try {
          assertManifestStaticAndRuntime(
            db,
            files.manifest.value,
            files.marker.value.seed_commit,
            files.manifest.value.source.seed_image ?? null,
          );
          assertExpectedDatasetState(db, "verify");
          assertIntegrity(db);
          detail.checksums_match = true;
          return statusResult("seeded", detail);
        } catch {
          detail.checksums_match = false;
          return statusResult("drift", detail);
        }
      }
      if (!files.marker && !files.manifest)
        return statusResult(
          freshStateProblem(db) === null ? "empty" : "partial",
          detail,
        );
      if (
        files.marker &&
        !files.manifest &&
        files.marker.value.seed_manifest_sha256 === null &&
        freshStateProblem(db) === null
      )
        return statusResult("initialized", detail);
      return statusResult("partial", detail);
    } finally {
      db.close();
    }
  } catch (error) {
    return {
      command: "status",
      code: error instanceof SeedError ? error.code : 1,
      status: "rejected",
      message:
        error instanceof SeedError ? error.message : "Error técnico al inspeccionar.",
    };
  }
}

function statusResult(status: string, detail: Record<string, unknown>): SeedResult {
  return {
    command: "status",
    code: 0,
    status,
    message: `Estado ${status}.`,
    detail,
  };
}

export function runSeed(argv: readonly string[]): SeedResult {
  let parsed: ParsedArguments;
  try {
    parsed = parseArguments(argv);
  } catch (error) {
    const seedError =
      error instanceof SeedError
        ? error
        : new SeedError(1, "Argumentos inválidos.");
    return {
      command: (argv[0] as SeedCommand) ?? "status",
      code: seedError.code,
      message: seedError.message,
    };
  }
  try {
    switch (parsed.command) {
      case "init":
        return initSeed(parsed);
      case "apply":
        return applySeed(parsed);
      case "verify":
        return verifySeed(parsed);
      case "status":
        return statusSeed(parsed);
    }
  } catch (error) {
    if (error instanceof SeedError)
      return {
        command: parsed.command,
        code: error.code,
        message: error.message,
      };
    return {
      command: parsed.command,
      code: 1,
      message: "Error técnico; no se declara éxito.",
    };
  }
}
