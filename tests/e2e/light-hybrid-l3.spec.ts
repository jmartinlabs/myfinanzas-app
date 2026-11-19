import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

import { artifactDir, fixtureContext, requireFixtureState, startFixtureServer, type OwnedFixture } from "./fixture";

const fixture = fixtureContext("inicio-hybrid-l3");
let owned: OwnedFixture | undefined;

test.beforeAll(async ({ request }) => {
  const server = startFixtureServer(
    "apps/api/test-support/inicio-server.ts",
    fixture,
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
      { timeout: 20000 },
    )
    .toBe(200);
  requireFixtureState(server);
});

test.afterAll(() => {
  owned?.stop();
});

async function login(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(fixture.port);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto("/movimientos");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(`${fixture.dir}/bootstrap.txt`, "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill("Clave ficticia L3 " + randomUUID());
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".secret")).toBeVisible();
  const secret = (await page.locator(".secret").textContent())!;
  await page.getByLabel("Código de la aplicación autenticadora").fill(totp(secret).generate());
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await page.getByRole("button", { name: "He guardado los códigos · Continuar" }).click();
  await page.goto("/movimientos");
  await expect(
    page.getByRole("heading", { name: "Movimientos", exact: true }),
  ).toBeVisible();
}

test("L3: identidad de Movimientos en Claro y Mixto, 1440/820/390", async ({ page }) => {
  test.setTimeout(180000);
  const artifacts = artifactDir("l3");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);

  const selectTheme = async (theme: string) => {
    await page.getByLabel("Cambiar tema").selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  };
  const noOverflow = async () =>
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);

  for (const theme of ["light-s", "hybrid-s"] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/movimientos");
    await selectTheme(theme);
    const list = page.locator(".movements-list");
    await expect(list).toBeVisible();
    await expect(list.locator(".filters")).toHaveCSS(
      "background-color",
      theme === "light-s" ? "rgb(244, 236, 225)" : "rgb(242, 233, 222)",
    );
    await expect(list.locator(".filters label").first()).toHaveCSS("font-size", "12px");
    await expect(list.locator(".filters input").first()).toHaveCSS("min-height", "44px");
    await expect(list.locator(".ui-table th").first()).toHaveCSS(
      "background-color",
      "rgb(240, 232, 220)",
    );
    await expect(list.locator(".ui-table th").first()).toHaveCSS("font-size", "12px");
    await expect(
      page.locator('.movement-type[data-tipo="Gasto"] .movement-type-icon').first(),
    ).toHaveCSS("background-color", "rgb(249, 233, 230)");
    await expect(
      page.locator('.movement-type[data-tipo="Ingreso"] .movement-type-icon').first(),
    ).toHaveCSS("background-color", "rgb(230, 241, 241)");
    await expect(page.locator(".movement-status-dot").first()).toBeVisible();
    await expect(page.locator(".movement-status-dot").first()).toHaveCSS("width", "7px");
    await expect(page.locator(".movement-status-dot").first()).toHaveCSS(
      "background-color",
      "rgb(23, 97, 106)",
    );
    // D4: ningún importe recibe color financiero; todos comparten color.
    const amountColors = await page
      .locator(".movement-amount")
      .evaluateAll((nodes) => [...new Set(nodes.map((n) => getComputedStyle(n).color))]);
    expect(amountColors).toHaveLength(1);
    await expect(list).toHaveCSS("background-image", "none");

    for (const [width, height] of [
      [1440, 1000],
      [820, 900],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await noOverflow();
      await page.screenshot({
        path: join(artifacts, `movimientos-${theme}-${width}.png`),
        fullPage: true,
      });
      if (width === 1440) {
        await page.screenshot({ path: join(artifacts, `movimientos-${theme}-fold.png`) });
      }
    }
  }

  // Regresión: los otros temas no reciben la capa
  for (const theme of ["dark-s", "casa", "graphite-lime"] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/movimientos");
    await selectTheme(theme);
    await expect(page.locator(".movements-list")).toBeVisible();
    await expect(page.locator(".movements-list .filters")).not.toHaveCSS(
      "background-color",
      "rgb(244, 236, 225)",
    );
    await noOverflow();
  }

  expect(errors).toEqual([]);
});
