import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const PORT = 3009;
let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/vehiculos-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test" },
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
  await page.goto("/vehiculos");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(".local/e2e-vehiculos/bootstrap.txt", "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(
    "Clave ficticia Graphite vehículos " + randomUUID(),
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
  await page.goto("/vehiculos");
  await expect(page.getByRole("heading", { name: "Vehículos", exact: true })).toBeVisible();
}

test("G5c: Vehículos premium en Graphite, 1440/820/390", async ({ page }) => {
  test.setTimeout(180000);
  mkdirSync("artifacts/g5c", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await authenticate(page);
  await page.getByLabel("Apariencia").selectOption("graphite-lime");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite-lime");

  const expectNoOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  const capture = async (name: string, width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await expectNoOverflow();
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `artifacts/g5c/${name}-${width}.png`,
      fullPage: true,
    });
  };

  /* Catálogo ------------------------------------------------------------ */
  await expect(page.locator(".vehicle-table tbody tr")).toHaveCount(4);
  await expect(page.locator(".vehiculos-page")).toContainText("Coche principal");
  await expect(page.locator(".vehiculos-page")).toContainText("1.240,00 €");
  await expect(page.locator(".vehicle-table th").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(page.locator(".vehiculos-page .page-head .primary")).toHaveCSS(
    "background-color",
    "rgb(215, 255, 94)",
  );
  await expect(page.locator(".vehiculos-page .plan-controls label")).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await capture("vehiculos-listado-graphite", 1440, 1000);
  await capture("vehiculos-listado-graphite", 820, 1000);
  await expect(page.locator(".vehiculos-page .vehicle-table")).toBeHidden();
  await expect(page.locator(".vehiculos-page .vehicle-cards")).toBeVisible();
  await capture("vehiculos-listado-graphite", 390, 844);

  /* Ficha --------------------------------------------------------------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Coche principal", exact: true }).first().click();
  await expect(page.locator(".vehicle-detail-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coche principal", exact: true })).toBeVisible();
  await expect(page.locator(".vehicle-detail-page .vehicle-fields > div")).not.toHaveCount(0);
  await expect(page.locator(".vehicle-detail-page")).toContainText("1.240,00 €");
  await expect(page.locator(".vehicle-detail-page")).toContainText("Parcial");
  await capture("vehiculo-ficha-graphite", 1440, 1000);
  await capture("vehiculo-ficha-graphite", 820, 1000);
  await capture("vehiculo-ficha-graphite", 390, 844);

  /* Formulario ---------------------------------------------------------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Editar ficha", exact: true }).click();
  await expect(page.locator(".vehicle-form-page")).toBeVisible();
  await expect(page.locator(".vehicle-form-page .ui-form-section")).not.toHaveCount(0);
  await expect(page.locator(".vehicle-form-page .ui-field-label").first()).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await capture("vehiculo-formulario-graphite", 1440, 1000);
  await capture("vehiculo-formulario-graphite", 390, 844);

  /* Integridad ---------------------------------------------------------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/vehiculos/integridad");
  await expect(page.locator(".vehicle-integrity-page")).toBeVisible();
  await expect(page.locator(".vehicle-integrity-page .integrity-list")).toBeVisible();
  await capture("vehiculos-integridad-graphite", 1440, 1000);
  await capture("vehiculos-integridad-graphite", 390, 844);

  /* Misma fixture en Casa ---------------------------------------------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/vehiculos");
  await page.getByLabel("Apariencia").selectOption("casa");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "casa");
  await expect(page.locator(".vehicle-table tbody tr")).toHaveCount(4);
  await capture("vehiculos-listado-casa", 1440, 1000);
  await page.getByRole("link", { name: "Coche principal", exact: true }).first().click();
  await expect(page.locator(".vehicle-detail-page")).toBeVisible();
  await capture("vehiculo-ficha-casa", 1440, 1000);

  expect(errors).toEqual([]);
});
