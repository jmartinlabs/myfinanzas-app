import { join, resolve } from "node:path";
import {
  canonical,
  privateDirectory,
  privateFile,
  privateSidecars,
  productionConfig,
  type ProductionConfig,
} from "../../apps/api/src/private-state";
import {
  DATABASE_RELATIVE,
  KEY_RELATIVE,
  TEST_ORIGIN,
} from "./constants";
import { SeedError, guardError } from "./errors";

export type SeedConfig = {
  root: string;
  config: ProductionConfig;
};

export function assertEnvironment() {
  if (process.env.NODE_ENV !== "production")
    guardError("NODE_ENV debe ser production.", "environment");
  if (process.env.APP_ORIGIN !== TEST_ORIGIN)
    guardError("APP_ORIGIN debe ser el origen TEST exacto.", "environment");
}

export function loadSeedConfig(dataRoot: string): SeedConfig {
  let root: string;
  try {
    canonical(dataRoot);
    if (resolve(dataRoot) !== dataRoot)
      guardError("--data-root debe ser una ruta absoluta canónica.", "path");
    root = dataRoot;
  } catch (error) {
    if (error instanceof SeedError) throw error;
    guardError("--data-root debe ser una ruta absoluta canónica.", "path");
  }
  try {
    privateDirectory(root);
  } catch {
    guardError(
      "La raíz de datos debe ser un directorio 0700 del UID efectivo, sin enlaces.",
      "path",
    );
  }
  let config: ProductionConfig;
  try {
    config = productionConfig();
  } catch {
    guardError(
      "Configuración productiva incompleta o inválida (DATABASE_PATH, AUTH_KEY_PATH, APP_ORIGIN).",
      "path",
    );
  }
  if (config.origin !== TEST_ORIGIN)
    guardError("APP_ORIGIN distinto del origen TEST exacto.", "environment");
  const expectedState = join(root, "state");
  if (config.state !== expectedState)
    guardError("El estado debe ser <data-root>/state.", "path");
  if (config.database !== join(root, DATABASE_RELATIVE))
    guardError("DATABASE_PATH debe ser <data-root>/state/database.sqlite.", "path");
  if (config.key !== join(root, KEY_RELATIVE))
    guardError("AUTH_KEY_PATH debe ser <data-root>/state/auth.key.", "path");
  try {
    privateDirectory(config.state);
    privateFile(config.database);
    privateFile(config.key);
    privateSidecars(config.database);
  } catch {
    guardError(
      "Estado TEST con permisos o enlaces no válidos (state 0700, DB/clave 0600).",
      "path",
    );
  }
  return { root, config };
}
