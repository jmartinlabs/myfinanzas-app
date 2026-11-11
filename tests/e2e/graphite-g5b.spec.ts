import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const PORT = 3029;
let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/inicio-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test", E46_SCENARIO: "g5b" },
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
    .fill(readFileSync(".local/e2e-inicio-g5b/bootstrap.txt", "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(
    "Clave ficticia Graphite inversiones " + randomUUID(),
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

test("G5b: Inversiones y Deudas premium en Graphite, 1440/820/390", async ({ page }) => {
  test.setTimeout(180000);
  mkdirSync("artifacts/g5b", { recursive: true });
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
      path: `artifacts/g5b/${name}-${width}.png`,
      fullPage: true,
    });
  };

  /* Instrumentos -------------------------------------------------------- */
  await page.goto("/inversiones");
  await expect(
    page.getByRole("heading", { name: "Inversiones", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".inversiones-page .inversiones-cash")).toContainText(
    "S003",
  );
  await expect(
    page.locator(".inversiones-page .filters label").first(),
  ).toHaveCSS("text-transform", "uppercase");
  await expect(
    page.locator(".inversiones-page .classification-tabs a[aria-current='page']"),
  ).toHaveCSS("color", "rgb(215, 255, 94)");
  await expect(page.locator(".inversiones-page .classification-tabs")).toHaveCSS(
    "border-radius",
    "10px",
  );
  expect(
    (await page.locator(".inversiones-page .classification-tabs a").first().boundingBox())!
      .height,
  ).toBeGreaterThanOrEqual(44);
  await expect(page.locator(".inversiones-page .ui-table th").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(page.locator(".inversiones-page .filters")).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  await expect(page.locator(".inversiones-page .ui-table tbody tr")).toHaveCount(2);
  await expect(page.locator(".inversiones-page")).toContainText("Fondo índice demo");
  await expect(page.locator(".inversiones-page")).toContainText("Acción demo");
  await capture("inversiones-listado-graphite", 1440, 1000);
  await capture("inversiones-listado-graphite", 820, 1000);
  await expect(page.locator(".inversiones-page .desktop-list")).toBeHidden();
  await expect(page.locator(".inversiones-page .ui-data-list")).toBeVisible();
  await capture("inversiones-listado-graphite", 390, 844);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Fondo índice demo", exact: true }).first().click();
  await expect(page).toHaveURL(/\/inversiones\/instrumentos\/I\d+$/);
  await expect(page.locator(".inversion-detail-page")).toBeVisible();
  await expect(page.locator(".inversion-detail-page .detail-grid > div")).toHaveCount(5);
  await expect(
    page.getByRole("heading", { name: "Posiciones por Saldo de inversión" }),
  ).toBeVisible();
  await expect(page.locator(".inversion-detail-page")).toContainText("S007");
  await capture("inversion-ficha-graphite", 1440, 1000);
  await capture("inversion-ficha-graphite", 820, 1000);
  await capture("inversion-ficha-graphite", 390, 844);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Editar instrumento" }).click();
  await expect(page.locator(".inversion-form-page")).toBeVisible();
  await expect(page.locator(".inversion-form-page .ui-form-section")).toHaveCount(1);
  await expect(page.locator(".inversion-form-page .ui-field-label").first()).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await capture("inversion-formulario-graphite", 1440, 1000);
  await capture("inversion-formulario-graphite", 390, 844);

  /* Compras ------------------------------------------------------------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/inversiones/compras");
  await expect(page.locator(".compras-page")).toBeVisible();
  await expect(page.locator(".compras-page .ui-table tbody tr")).toHaveCount(2);
  await expect(page.locator(".compras-page")).toContainText("I1001 · Fondo índice demo");
  await expect(page.locator(".compras-page .ui-table th").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(page.locator(".compras-page .ui-table td").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(page.locator(".compras-page .ui-table .tag").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  const actionBox = (await page
    .getByRole("button", { name: "Ver", exact: true })
    .first()
    .boundingBox())!;
  expect(actionBox.width).toBeGreaterThanOrEqual(44);
  expect(actionBox.height).toBeGreaterThanOrEqual(44);
  await capture("compras-listado-graphite", 1440, 1000);
  await capture("compras-listado-graphite", 820, 1000);
  await capture("compras-listado-graphite", 390, 844);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Ver", exact: true }).first().click();
  await expect(page.locator(".compra-detail-page")).toBeVisible();
  await expect(page.locator(".compra-detail-page .detail-grid > div")).toHaveCount(10);
  await capture("compra-ficha-graphite", 1440, 1000);
  await page.getByRole("button", { name: "Rectificar", exact: true }).click();
  await expect(page.locator(".compra-form-page")).toBeVisible();
  await expect(page.locator(".compra-form-page .ui-form-section")).toHaveCount(4);
  await capture("compra-formulario-graphite", 1440, 1000);
  await capture("compra-formulario-graphite", 390, 844);

  /* Ventas -------------------------------------------------------------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/inversiones/ventas");
  await expect(page.locator(".ventas-page")).toBeVisible();
  await expect(page.locator(".ventas-page .ui-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".ventas-page")).toContainText("I1001 · Fondo índice demo");
  await capture("ventas-listado-graphite", 1440, 1000);
  await capture("ventas-listado-graphite", 820, 1000);
  await capture("ventas-listado-graphite", 390, 844);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Ver", exact: true }).first().click();
  await expect(page.locator(".venta-detail-page")).toBeVisible();
  await expect(page.locator(".venta-detail-page .detail-grid > div")).toHaveCount(10);
  await capture("venta-ficha-graphite", 1440, 1000);

  await page.goto("/inversiones/ventas/nueva");
  await expect(page.locator(".venta-form-page")).toBeVisible();
  await expect(page.locator(".venta-form-page .ui-form-section")).toHaveCount(1);
  await capture("venta-formulario-graphite", 1440, 1000);
  await capture("venta-formulario-graphite", 390, 844);

  /* Deudas -------------------------------------------------------------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/deudas");
  await expect(page.getByRole("heading", { name: "Deudas", exact: true })).toBeVisible();
  await expect(page.locator(".deudas-page .filters label")).toHaveCount(3);
  await expect(page.locator(".deudas-page .filters label").first()).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await expect(page.locator(".deudas-page .ui-table tbody tr")).not.toHaveCount(0);
  await expect(page.locator(".deudas-page")).toContainText("Préstamo demo");
  await expect(page.locator(".deudas-page .ui-table th").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  const debtOpenBox = (await page
    .getByRole("button", { name: "Ver ficha", exact: true })
    .first()
    .boundingBox())!;
  expect(debtOpenBox.height).toBeGreaterThanOrEqual(44);
  await capture("deudas-listado-graphite", 1440, 1000);
  await capture("deudas-listado-graphite", 820, 1000);
  await expect(page.locator(".deudas-page .desktop-list")).toBeHidden();
  await expect(page.locator(".deudas-page .ui-data-list")).toBeVisible();
  await expect(
    page.locator(".deudas-page .debt-cards .debt-open").first(),
  ).toBeHidden();
  await capture("deudas-listado-graphite", 390, 844);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Préstamo demo", exact: true }).first().click();
  await expect(page).toHaveURL(/\/deudas\/D\d+$/);
  await expect(page.locator(".debt-detail")).toBeVisible();
  await expect(page.locator(".debt-detail .e44-section")).toHaveCount(5);
  await expect(page.locator(".debt-detail")).toContainText("Deuda viva");
  await expect(page.locator(".debt-detail .e44-facts dt").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(
    page.locator(".debt-detail .e44-history-desktop th").last(),
  ).toHaveCSS("font-size", "12px");
  await capture("deuda-ficha-graphite", 1440, 1000);
  await capture("deuda-ficha-graphite", 820, 1000);
  await capture("deuda-ficha-graphite", 390, 844);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Editar deuda" }).click();
  await expect(page.locator(".deuda-form-page")).toBeVisible();
  await expect(page.locator(".deuda-form-page .form-grid")).toHaveCount(2);
  await capture("deuda-formulario-graphite", 1440, 1000);
  await capture("deuda-formulario-graphite", 390, 844);

  /* Misma fixture en Casa ---------------------------------------------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/inversiones");
  await page.getByLabel("Apariencia").selectOption("casa");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "casa");
  await expect(page.locator(".inversiones-page .ui-table tbody tr")).toHaveCount(2);
  await expect(page.locator(".inversiones-page .classification-tabs")).toHaveCSS(
    "border-radius",
    "0px",
  );
  await expect(page.locator(".inversiones-page .inversiones-cash")).toHaveCSS(
    "box-shadow",
    "none",
  );
  await capture("inversiones-listado-casa", 1440, 1000);
  await page.getByRole("link", { name: "Fondo índice demo", exact: true }).first().click();
  await expect(page.locator(".inversion-detail-page")).toBeVisible();
  await capture("inversion-ficha-casa", 1440, 1000);
  await page.getByRole("button", { name: "Editar instrumento" }).click();
  await expect(page.locator(".inversion-form-page")).toBeVisible();
  await capture("inversion-formulario-casa", 1440, 1000);

  await page.goto("/inversiones/compras");
  await expect(page.locator(".compras-page .ui-table tbody tr")).toHaveCount(2);
  await capture("compras-listado-casa", 1440, 1000);

  await page.goto("/deudas");
  await expect(page.locator(".deudas-page .ui-table tbody tr")).not.toHaveCount(0);
  await capture("deudas-listado-casa", 1440, 1000);
  await page.getByRole("link", { name: "Préstamo demo", exact: true }).first().click();
  await expect(page.locator(".debt-detail")).toBeVisible();
  await capture("deuda-ficha-casa", 1440, 1000);
  await page.getByRole("button", { name: "Editar deuda" }).click();
  await expect(page.locator(".deuda-form-page")).toBeVisible();
  await capture("deuda-formulario-casa", 1440, 1000);

  /* Graphite no se filtra a Claro, Oscuro ni Mixto. */
  for (const theme of ["light-s", "dark-s", "hybrid-s"]) {
    await page.goto("/inversiones");
    await page.getByLabel("Apariencia").selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(
      page.locator(".inversiones-page .classification-tabs"),
    ).not.toHaveCSS("border-radius", "10px");
    await expect(page.locator(".inversiones-page .filters")).toHaveCSS(
      "background-image",
      "none",
    );
    await page.goto("/deudas");
    await expect(
      page.locator(".deudas-page .debt-open").first(),
    ).not.toHaveCSS("min-height", "44px");
  }

  expect(errors).toEqual([]);
});
