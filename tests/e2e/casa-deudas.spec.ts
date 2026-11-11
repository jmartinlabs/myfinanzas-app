import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const PORT = 3021;
let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/inicio-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test", E46_SCENARIO: "casa-deudas" },
    },
  );
  await expect
    .poll(
      async () => {
        try {
          return (await request.get(`http://127.0.0.1:${PORT}/api/health`)).status();
        } catch {
          return 0;
        }
      },
      { timeout: 15000 },
    )
    .toBe(200);
});

test.afterAll(() => {
  child?.kill();
});

async function authenticate(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto("/inicio");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(".local/e2e-inicio-casa-deudas/bootstrap.txt", "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(
    "Clave ficticia Casa deudas " + randomUUID(),
  );
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".secret")).toBeVisible();
  const secret = (await page.locator(".secret").textContent())!;
  await page
    .getByLabel("Código de la aplicación autenticadora")
    .fill(totp(secret).generate());
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await page
    .getByRole("button", { name: "He guardado los códigos · Continuar" })
    .click();
  await expect(page.getByRole("heading", { name: "Inicio", exact: true })).toBeVisible();
}

test("Casa: Deudas editorial, listado y ficha", async ({ page }) => {
  mkdirSync("artifacts/ui-casa-deudas", { recursive: true });
  await authenticate(page);
  await page.getByLabel("Apariencia").selectOption("casa");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "casa");

  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Deudas", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Deudas", exact: true })).toBeVisible();
  await expect(page.locator(".deudas-page")).toBeVisible();
  const rows = page.locator(".deuda-list tbody tr, .debt-list tbody tr");
  await expect(rows.first()).toBeVisible();
  await expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/ui-casa-deudas/deudas-1440.png",
    fullPage: true,
  });

  await rows.first().locator("a, button").first().click();
  await expect(page.locator(".debt-detail")).toBeVisible();
  await expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/ui-casa-deudas/deuda-detalle-1440.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/ui-casa-deudas/deuda-detalle-390.png",
    fullPage: true,
  });
});
