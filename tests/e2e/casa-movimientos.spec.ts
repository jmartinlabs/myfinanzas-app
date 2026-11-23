import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

import { artifactDir, fixtureContext, requireFixtureState, startFixtureServer, type OwnedFixture } from "./fixture";

const fixture = fixtureContext("inicio-casa-mov");
let owned: OwnedFixture | undefined;

test.beforeAll(async ({ request }) => {
  const server = startFixtureServer(
    "apps/api/test-support/inicio-server.ts",
    fixture,
    { E46_SCENARIO: "casa-mov" },
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
    "Clave ficticia Casa movimientos " + randomUUID(),
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

test("Casa 1C/1D: Movimientos, detalle y formulario a 1440/390", async ({ page }) => {
  const artifactsUiCasa1c = artifactDir("ui-casa-1c");
  const artifactsUiCasa1d = artifactDir("ui-casa-1d");
  await authenticate(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.getByLabel("Cambiar tema").selectOption("casa");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "casa");
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Movimientos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Movimientos", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".movements-list .desktop-list tbody tr")).toHaveCount(9);
  await expect(page.locator(".movements-list .ui-table th").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(
    page.locator(".movements-list .ui-table td.ui-table-amount").first(),
  ).toHaveCSS("font-family", /Newsreader/);
  await expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: join(artifactsUiCasa1c, "movimientos-casa-1440.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".movements-cards > li")).toHaveCount(9);
  await expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: join(artifactsUiCasa1c, "movimientos-casa-390.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .locator(".desktop-list tbody tr")
    .first()
    .locator("a")
    .first()
    .click();
  await expect(page).toHaveURL(/\/movimientos\/\d+$/);
  await expect(page.locator(".movement-detail")).toBeVisible();
  await expect(page.locator(".movement-detail")).toContainText(
    "Hecho registrado",
  );
  await expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: join(artifactsUiCasa1d, "detalle-casa-1440.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "Rectificar", exact: true }).click();
  await expect(page.locator(".movement-form-page")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rectificar movimiento", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: join(artifactsUiCasa1d, "formulario-casa-1440.png"),
    fullPage: true,
  });
  await page
    .locator(".movement-form-page .form-footer")
    .scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Cancelar", exact: true })).toBeVisible();
  await page.screenshot({
    path: join(artifactsUiCasa1d, "formulario-casa-1440-acciones.png"),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: join(artifactsUiCasa1d, "formulario-casa-390.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
