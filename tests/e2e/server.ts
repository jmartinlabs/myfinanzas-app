// Test process only; the real app has no fixture endpoint or authentication bypass.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openDatabase } from "../../apps/api/src/database";
import { provision, loadKey } from "../../apps/api/src/auth";
import { contextFromEnv } from "../../apps/api/test-support/e2e-context";

/**
 * Servidor de fixture de la ejecución E2E (issue #508).
 *
 * El estado vive en el directorio propio del run (`<runRoot>/state/app`), no en
 * un `.local/e2e` compartido: dos ejecuciones simultáneas no comparten SQLite,
 * clave ni código de activación, y terminar una no borra el estado de la otra.
 * El puerto lo aporta el contexto de la ejecución (`API_PORT`).
 */
const context = contextFromEnv();
const dir = context.stateDir("app");
mkdirSync(dir, { recursive: true, mode: 0o700 });

process.env.DATABASE_PATH = join(dir, "demo.sqlite");
process.env.AUTH_KEY_PATH = join(dir, "auth.key");
const db = openDatabase(process.env.DATABASE_PATH);
loadKey(db, process.env.AUTH_KEY_PATH);
writeFileSync(join(dir, "bootstrap.txt"), provision(db), { mode: 0o600 });
db.close();

await import("../../apps/api/src/main");