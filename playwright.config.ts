import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', browserName: 'chromium', launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: [
    { command: 'bun apps/api/src/main.ts', env: { DATABASE_PATH: ':memory:' }, url: 'http://127.0.0.1:3001/api/saldos', reuseExistingServer: false },
    { command: 'bun run --filter @myfinanzas/web dev', url: 'http://127.0.0.1:5173', reuseExistingServer: false },
  ],
});
