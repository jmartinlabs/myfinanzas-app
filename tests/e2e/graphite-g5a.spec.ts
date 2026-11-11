import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const PORT = 3028;
let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/inicio-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test", E46_SCENARIO: "g5a" },
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
    .fill(readFileSync(".local/e2e-inicio-g5a/bootstrap.txt", "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(
    "Clave ficticia Graphite saldos " + randomUUID(),
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

test("G5a: Saldos premium en Graphite, 1440/820/390", async ({ page }) => {
  mkdirSync("artifacts/g5a", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await authenticate(page);
  await page.getByLabel("Apariencia").selectOption("graphite-lime");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    "graphite-lime",
  );

  const expectNoOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  const capture = async (name: string, width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await expectNoOverflow();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `artifacts/g5a/${name}-${width}.png`,
      fullPage: true,
    });
  };

  await page.goto("/saldos");
  await expect(
    page.getByRole("heading", { name: "Saldos", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".saldos-page .context-note")).toContainText(
    "Control Movimientos",
  );
  await expect(page.locator(".saldos-page .filters label")).toHaveCount(4);
  await expect(
    page.locator(".saldos-page .filters label").first(),
  ).toHaveCSS("text-transform", "uppercase");
  await expect(page.locator(".saldos-page .ui-table th").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(page.locator(".saldos-page .desktop-list tbody tr").first()).toBeVisible();
  await expect(page.locator(".saldos-page .position-label").first()).toHaveCSS(
    "font-size",
    "16px",
  );
  await expect(page.locator(".saldos-page")).toContainText("S001");
  await expect(page.locator(".saldos-page")).toContainText(
    "Cuenta cotidiana demo",
  );

  await capture("saldos-graphite", 1440, 1000);
  await capture("saldos-graphite", 820, 1000);
  await expect(page.locator(".saldos-page .desktop-list")).toBeHidden();
  await expect(page.locator(".saldos-page .mobile-list")).toBeVisible();
  await capture("saldos-graphite", 390, 844);
  await expect(
    page.locator(".saldos-page .mobile-list .ui-data-list-item"),
  ).not.toHaveCount(0);
  await expect(page.locator(".saldos-page .mobile-list")).toContainText(
    "Cuenta cotidiana demo",
  );

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .locator(".saldos-page .desktop-list tbody tr")
    .first()
    .locator("a")
    .first()
    .click();
  await expect(page).toHaveURL(/\/saldos\/S\d+$/);
  await expect(page.locator(".saldo-detail-page")).toBeVisible();
  await expect(page.locator(".saldo-detail-page")).toContainText(
    "POSICIÓN ACTUAL",
  );
  await expect(page.locator(".saldo-detail-page h1")).toBeVisible();
  await expect(page.locator(".saldo-detail-page .ui-form-section")).toHaveCount(
    3,
  );
  await expect(
    page.locator(".saldo-detail-page .position-placeholder"),
  ).toBeVisible();
  await capture("saldo-detalle-graphite", 1440, 1000);
  await capture("saldo-detalle-graphite", 820, 1000);
  expect(
    await page.locator(".saldo-detail-grid").evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns
          .split(" ")
          .filter(Boolean).length,
    ),
  ).toBe(1);
  await capture("saldo-detalle-graphite", 390, 844);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Editar Saldo", exact: true }).click();
  await expect(page).toHaveURL(/\/saldos\/S\d+\/editar$/);
  await expect(page.locator(".saldo-form-page")).toBeVisible();
  await expect(page.locator(".saldo-form-page .ui-form-step")).toHaveCount(3);
  await expect(
    page.locator(".saldo-form-page .ui-form-step").first(),
  ).toHaveText("01");
  await expect(page.locator("#nombre")).toBeVisible();
  await expect(page.locator(".saldo-form-page .ui-field-label").first()).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await capture("saldo-formulario-graphite", 1440, 1000);
  await capture("saldo-formulario-graphite", 820, 1000);
  await capture("saldo-formulario-graphite", 390, 844);

  // Misma fixture en Casa para la evaluación visual Graphite vs Casa.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/saldos");
  await page.getByLabel("Apariencia").selectOption("casa");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "casa");
  await expect(page.locator(".saldos-page")).toBeVisible();
  await expect(
    page.locator(".saldos-page .desktop-list tbody tr").first(),
  ).toBeVisible();
  await expect(page.locator(".saldos-page")).toContainText(
    "Cuenta cotidiana demo",
  );
  await capture("saldos-casa", 1440, 1000);
  await page
    .locator(".saldos-page .desktop-list tbody tr")
    .first()
    .locator("a")
    .first()
    .click();
  await expect(page.locator(".saldo-detail-page")).toBeVisible();
  await capture("saldo-detalle-casa", 1440, 1000);
  await page.getByRole("button", { name: "Editar Saldo", exact: true }).click();
  await expect(page.locator(".saldo-form-page")).toBeVisible();
  await capture("saldo-formulario-casa", 1440, 1000);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoOverflow();
  await expect(page.locator("#nombre")).toBeVisible();
  await capture("saldo-formulario-casa", 390, 844);

  expect(errors).toEqual([]);
});
