import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

import { artifactDir, fixtureContext, requireFixtureState, startFixtureServer, type OwnedFixture } from "./fixture";

const fixture = fixtureContext("inicio-casa-deudas");
let owned: OwnedFixture | undefined;

test.beforeAll(async ({ request }) => {
  const server = startFixtureServer(
    "apps/api/test-support/inicio-server.ts",
    fixture,
    { E46_SCENARIO: "casa-deudas" },
  );
  owned = server;
  await expect
    .poll(
      async () => {
        server.assertAlive();
        try {
          return (await request.get(`${fixture.baseURL}/api/health`)).status();
        } catch {
          return 0;
        }
      },
      { timeout: 15000 },
    )
    .toBe(200);
  requireFixtureState(server);
});

test.afterAll(() => {
  owned?.stop();
});

async function authenticate(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(fixture.port);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto("/inicio");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(`${fixture.dir}/bootstrap.txt`, "utf8"));
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
  const artifacts = artifactDir("ui-casa-deudas");
  await authenticate(page);
  await page.getByLabel("Cambiar tema").selectOption("casa");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "casa");

  await page
    .locator(".nav-group-toggle")
    .filter({ hasText: "Patrimonio" })
    .click();
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
    path: join(artifacts, "deudas-1440.png"),
    fullPage: true,
  });

  await rows.first().locator("a, button").first().click();
  await expect(page.locator(".debt-detail")).toBeVisible();
  await expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: join(artifacts, "deuda-detalle-1440.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: join(artifacts, "deuda-detalle-390.png"),
    fullPage: true,
  });
});
