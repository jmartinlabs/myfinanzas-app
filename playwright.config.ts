import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  use: {
    actionTimeout: 10000,
    navigationTimeout: 15000,
    locale: "es-ES",
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: [
    {
      command: "bun tests/e2e/server.ts",
      env: { NODE_ENV: "test" },
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: false,
    },
    {
      command: "bun run --filter @myfinanzas/web dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
    },
  ],
});
