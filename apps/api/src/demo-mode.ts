import type { Database } from "bun:sqlite";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { inspectIdentity } from "./database-identity";
import { localHttpOrigin } from "./local-network";

/**
 * Modo DEMO local: cinco condiciones independientes antes de desactivar el
 * inicio de sesión. No basta NODE_ENV.
 *
 * 1. Activación explícita con `MYFINANZAS_DEMO=1`.
 * 2. `NODE_ENV=development` (nunca test ni production).
 * 3. Base y clave dentro de `<repo>/.local/demo/`.
 * 4. Base con identidad `demo` (key_hash nulo) y sin usuario configurado.
 * 5. Orígenes y bind acotados a loopback o IPv4 privada, coherentes entre sí.
 *
 * Cualquier desviación lanza y el proceso no arranca.
 */
export type DemoScope = {
  /** Orígenes HTTP exactos admitidos (loopback + red privada). */
  origins: readonly string[];
  /** Base SQLite canónica de la demo. */
  database: string;
  /** Clave local de la demo (nunca cifra credenciales porque no existen). */
  key: string;
  /** Bind exigido para que el alcance de red coincida con los orígenes. */
  bindHost: "127.0.0.1" | "0.0.0.0";
};

const DEMO_FLAG = "MYFINANZAS_DEMO";
const STATE_SEGMENTS = [".local", "demo"] as const;

function canonical(value: string, name: string) {
  if (
    !isAbsolute(value) ||
    value !== resolve(value) ||
    value !== value.trim() ||
    value.includes("\0")
  )
    throw new Error(`${name} debe ser una ruta absoluta canónica.`);
  const segments = value.split(sep);
  const demo = segments.lastIndexOf(STATE_SEGMENTS[1]);
  if (
    demo < 1 ||
    segments[demo - 1] !== STATE_SEGMENTS[0] ||
    demo === segments.length - 1
  )
    throw new Error(`${name} debe residir en .local/demo/ del repositorio.`);
}

function required(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name];
  if (!value) throw new Error(`${name} es obligatorio en modo DEMO.`);
  return value;
}

export function demoScope(
  env: NodeJS.ProcessEnv = process.env,
): DemoScope | null {
  if (env[DEMO_FLAG] !== "1") return null;
  if (env.NODE_ENV !== "development")
    throw new Error(
      "El modo DEMO solo se activa con NODE_ENV=development; nunca en TEST ni PROD.",
    );
  // Una configuración productiva jamás se reutiliza como demo.
  if (env.APP_ORIGIN !== undefined) localHttpOrigin(env.APP_ORIGIN);
  const raw = required(env, "DEMO_ORIGINS")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");
  if (raw.length === 0)
    throw new Error("DEMO_ORIGINS debe enumerar al menos un origen.");
  const origins = [...new Set(raw.map(localHttpOrigin))];
  const database = required(env, "DATABASE_PATH");
  const key = required(env, "AUTH_KEY_PATH");
  canonical(database, "DATABASE_PATH");
  canonical(key, "AUTH_KEY_PATH");
  if (database === key || dirname(database) !== dirname(key))
    throw new Error("La base y la clave DEMO deben ser archivos distintos del mismo directorio.");
  // La API DEMO nunca se publica: el iPhone habla con Vite, que hace de proxy
  // hacia 127.0.0.1:3001. Un bind distinto ampliaría el alcance sin necesidad.
  if (env.API_BIND_HOST !== undefined && env.API_BIND_HOST !== "127.0.0.1")
    throw new Error(
      "En modo DEMO la API solo escucha en 127.0.0.1; Vite es el único listener de red local.",
    );
  return { origins, database, key, bindHost: "127.0.0.1" };
}

/**
 * Comprueba la base efectivamente abierta: identidad demo, sin hash de clave
 * productiva y sin usuario configurado. Se ejecuta antes de servir peticiones.
 */
export function assertDemoDatabase(db: Database, scope: DemoScope) {
  if (db.filename !== scope.database)
    throw new Error("La conexión abierta no es la base DEMO declarada.");
  const identity = inspectIdentity(db);
  if (identity?.origin !== "demo" || identity.key_hash !== null)
    throw new Error("La base no está identificada como DEMO.");
  if (db.query("SELECT id FROM owner LIMIT 1").get())
    throw new Error("La base DEMO tiene credenciales configuradas; no se admite.");
}
