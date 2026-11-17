import { defineConfig } from "@playwright/test";
import { join } from "node:path";
import {
  CONTEXT_ENV,
  reservePorts,
  buildContext,
  contextFromEnv,
  writeContext,
} from "./apps/api/test-support/e2e-context";

/**
 * Contexto de la ejecución (issue #508).
 *
 * Los puertos y el estado son **propios de cada run**: se reservan puertos
 * libres al SO y se genera `.local/e2e-runs/<run-id>/` antes de arrancar
 * cualquier servidor. El entorno habitual del usuario (web 5173 / API 3001) no
 * se consulta, no se adopta y no se detiene.
 *
 * Si `E2E_CONTEXT_FILE` ya existe —una segunda config, un probe o un runner
 * externo— se reutiliza ese contexto en lugar de crear otro.
 */
function resolveContext() {
  if (process.env[CONTEXT_ENV]) return contextFromEnv();
  const runId = `run-${Date.now()}-${process.pid}`;
  const [webPort, apiPort] = reservePorts(2);
  const context = buildContext({
    runId,
    runRoot: join(".local", "e2e-runs", runId),
    webPort,
    apiPort,
  });
  process.env[CONTEXT_ENV] = writeContext(context);
  return context;
}

const context = resolveContext();

// Los servidores de fixture que cada spec arranca con `...process.env` heredan
// el mismo origen y los mismos puertos: sin esto, hablarían con 5173/3001.
Object.assign(process.env, context.childEnv());

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  use: {
    actionTimeout: 10000,
    navigationTimeout: 15000,
    locale: "es-ES",
    baseURL: context.webOrigin,
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: [
    {
      command: "bun tests/e2e/server.ts",
      env: { NODE_ENV: "test", ...context.childEnv() },
      url: `${context.apiOrigin}/api/health`,
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: "bun run --filter @myfinanzas/web dev",
      env: { ...context.childEnv() },
      url: context.webOrigin,
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});