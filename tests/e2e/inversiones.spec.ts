import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

test("E4.1 inversiones: listado, ficha, alta, compras, impacto, rectificación y anulación 390/1440", async ({
  page,
  request,
}) => {
  const child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/inversiones-server.ts"],
      { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
    ),
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await expect
      .poll(
        async () => {
          try {
            return (
              await request.get("http://127.0.0.1:3010/api/health")
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(200);
    expect(
      (await request.get("http://127.0.0.1:3010/api/instrumentos")).status(),
    ).toBe(401);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3010";
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
    await page.goto("/inversiones");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-inversiones/bootstrap.txt", "utf8"));
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Clave ficticia inversiones " + randomUUID());
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.locator(".secret")).toBeVisible();
    const secret = (await page.locator(".secret").textContent())!;
    await page
      .getByLabel("Código de la aplicación autenticadora")
      .fill(
        totp(secret).generate({
          timestamp: Date.parse("2026-10-26T12:00:00Z"),
        }),
      );
    await page
      .getByRole("button", { name: "Verificar código", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "He guardado los códigos · Continuar",
        exact: true,
      })
      .click();
    await page.getByRole("link", { name: /Inversiones/ }).click();
    await expect(
      page.getByRole("heading", { name: "Inversiones", exact: true }),
    ).toBeVisible();
    const cash = page.getByLabel("Efectivo del bróker");
    await expect(cash).toContainText("S003 · Efectivo de inversión demo");
    await expect(cash).toContainText("1.810,40 €");
    await expect(cash).toContainText("sin total agregado");
    await expect(cash).toContainText("Ventas: no disponibles hasta E4.2");
    await expect(
      page.getByText(/histórico anterior no importado/).first(),
    ).toBeVisible();
    await expect(
      page.locator(".inversiones-list tbody tr"),
    ).toHaveCount(3);
    for (const header of ["ID", "Nombre", "ISIN", "Estado", "Compras"])
      await expect(
        page.getByRole("columnheader", { name: header, exact: true }),
      ).toBeVisible();
    await expect(
      page.getByText("Fondo antiguo", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Inactiva", { exact: true }).first()).toBeVisible();
    mkdirSync("artifacts/e4-1", { recursive: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-1/instrumentos-list-1440.png",
      fullPage: true,
    });
    await page.getByLabel("Estado").selectOption("Activa");
    await expect(page.locator(".inversiones-list tbody tr")).toHaveCount(2);
    await expect(page.getByText("Fondo antiguo", { exact: true })).toHaveCount(0);
    await page.getByLabel("Estado").selectOption("");

    await page
      .getByRole("link", { name: "Fondo índice demo", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Fondo índice demo", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Posiciones por Saldo de inversión")).toContainText(
      "S004 · Cartera de inversión demo",
    );
    await expect(page.getByLabel("Posiciones por Saldo de inversión")).toContainText(
      "12,5",
    );
    await expect(page.getByLabel("Posiciones por Saldo de inversión")).toContainText(
      "S006 · Cartera secundaria demo",
    );
    await expect(
      page.getByText(/Valoración y resultado: No disponible/),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Compras del Instrumento \(3\)/ }),
    ).toBeVisible();
    await page.screenshot({
      path: "artifacts/e4-1/instrumento-ficha-1440.png",
      fullPage: true,
    });

    await page.getByRole("link", { name: "Compras", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Compras de inversión", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Todas \(3\) · 2 vigentes · 1 anulada/)).toBeVisible();
    for (const header of ["EUR cargado", "Comisión", "Estado", "Acciones"]) {
      const cell = page.getByRole("columnheader", { name: header, exact: true });
      await cell.scrollIntoViewIfNeeded();
      await expect(cell).toBeVisible();
    }
    const amountCell = page
      .locator(".inversiones-list tbody tr", { hasText: "10/02/2026" })
      .locator("td")
      .filter({ hasText: "1.125,00 €" });
    expect(
      await amountCell.evaluate((cell) => getComputedStyle(cell).whiteSpace),
    ).toBe("nowrap");
    await page.locator(".inversiones-desktop").evaluateAll((containers) => {
      for (const container of containers) container.scrollLeft = 0;
    });
    const annulledRow = page.locator("tr", { hasText: "Anulada" });
    await expect(annulledRow).toHaveCount(1);
    await expect(annulledRow.getByRole("button", { name: "Ver" })).toBeVisible();
    await expect(
      annulledRow.getByRole("button", { name: "Rectificar" }),
    ).toHaveCount(0);
    await expect(
      annulledRow.getByRole("button", { name: "Anular" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-1/compras-list-1440.png",
      fullPage: true,
    });

    await page.getByRole("button", { name: "Nueva compra" }).click();
    await expect(
      page.getByRole("heading", { name: "Nueva compra", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel(/Saldo de efectivo/)).toHaveValue("");
    await page.getByLabel(/Fecha \*/).fill("2026-04-01");
    await page.getByLabel(/Instrumento \*/).selectOption("I1001");
    await page.getByLabel(/Saldo de efectivo \*/).selectOption("S003");
    await page.getByLabel(/Saldo de inversión \*/).selectOption("S004");
    await page.getByLabel(/Cantidad \*/).fill("1");
    await page.getByLabel(/Precio unitario \*/).fill("10.00");
    await page.getByLabel(/Divisa \*/).selectOption("USD");
    await expect(
      page.getByText(/Referencia cantidad×precio×cambio: No calculable/),
    ).toBeVisible();
    await page.getByLabel(/Divisa \*/).selectOption("EUR");
    await page.getByLabel(/Importe EUR cargado \*/).fill("10.00");
    await page.getByRole("button", { name: "Revisar compra" }).click();
    await expect(
      page.getByRole("heading", { name: /Impacto \(no escribe hasta confirmar\)/ }),
    ).toBeVisible();
    const impact = page.getByLabel("Impacto de la operación");
    await expect(impact).toContainText("antes 1.810,40 € → después 1.800,40 €");
    await page.screenshot({
      path: "artifacts/e4-1/compra-impacto-1440.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Confirmar compra" }).click();
    await expect(page.getByText("10,00 €").first()).toBeVisible();
    await expect(page.getByText(/01\/04\/2026 · Vigente/)).toBeVisible();

    await page.getByRole("link", { name: "Compras", exact: true }).click();
    await expect(page.getByText(/Todas \(4\) · 3 vigentes · 1 anulada/)).toBeVisible();
    const first = page.locator("tr", { hasText: "10/02/2026" });
    await first.getByRole("button", { name: "Rectificar" }).click();
    await expect(
      page.getByRole("heading", { name: /Rectificar compra/ }),
    ).toBeVisible();
    await expect(page.getByLabel(/Cantidad \*/)).toHaveValue("12.5");
    await page.getByLabel(/Cantidad \*/).fill("10");
    await page.getByLabel(/Importe EUR cargado \*/).fill("900.00");
    await page.getByLabel(/Motivo \*/).fill("Corrección de cantidad ficticia");
    await page.getByRole("button", { name: "Revisar compra" }).click();
    await expect(impact).toContainText("antes 1.800,40 € → después 2.025,40 €");
    await page.screenshot({
      path: "artifacts/e4-1/rectificar-impacto-1440.png",
    });
    await page.route(
      /\/api\/compras\/\d+\/rectificar$/,
      (route) =>
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            code: "REVISION_CONFLICT",
            error: "La Compra ha cambiado. Revisa la versión actual.",
          }),
        }),
      { times: 1 },
    );
    await page.getByRole("button", { name: "Confirmar rectificación" }).click();
    await expect(
      page.getByText("La Compra ha cambiado. Revisa la versión actual."),
    ).toBeVisible();
    await expect(page.locator(".focus-alert")).toBeFocused();
    await page
      .getByRole("button", {
        name: "Actualizar revisión conservando el borrador",
      })
      .click();
    await expect(page.locator(".focus-alert")).toHaveCount(0);
    await page.unroute(/\/api\/compras\/\d+\/rectificar$/);
    await page.getByRole("button", { name: "Confirmar rectificación" }).click();
    await expect(page.getByText("900,00 €").first()).toBeVisible();
    await expect(page.getByText(/revisión 2/).first()).toBeVisible();

    await page.getByRole("link", { name: "Compras", exact: true }).click();
    const second = page.locator("tr", { hasText: "03/03/2026" });
    await second.getByRole("button", { name: "Anular" }).click();
    await page.getByRole("button", { name: "Ver impacto de anulación" }).click();
    await expect(impact).toContainText("antes 2.025,40 € → después 2.290,00 €");
    await page.getByLabel(/Motivo \*/).fill("Duplicado ficticio de la compra");
    await page.getByRole("button", { name: "Anular compra" }).click();
    await expect(page.getByText(/03\/03\/2026 · Anulada/)).toBeVisible();

    await page.unroute("**/api/compras?*");
    await page.route("**/api/instrumentos?*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          instrumentos: [],
          total: 0,
          page: 1,
          cobertura:
            "Posición calculada solo con las compras registradas; no incluye histórico anterior no importado",
        }),
      }),
    );
    await page.getByRole("link", { name: /Instrumentos/ }).click();
    await expect(
      page.getByRole("heading", { name: "Sin Instrumentos", exact: true }),
    ).toBeVisible();
    await page.unroute("**/api/instrumentos?*");
    await page.route("**/api/compras?*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Fallo ficticio de fuente" }),
      }),
    );
    await page.getByRole("link", { name: "Compras", exact: true }).click();
    await expect(
      page.getByText(/No se pudo leer el registro de Compras\./),
    ).toBeVisible();
    await expect(page.getByText("0,00 €")).toHaveCount(0);

    await page.route("**/api/instrumentos/opciones", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Sesión expirada ficticia" }),
      }),
    );
    await page.getByRole("link", { name: /Instrumentos/ }).click();
    await expect(
      page.getByText(/La sesión ha caducado\. Copia cualquier borrador/),
    ).toBeVisible();

    await page.unroute("**/api/compras?*");
    await page.unroute("**/api/instrumentos/opciones");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/inversiones");
    await expect(
      page.getByRole("heading", { name: "Inversiones", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".inversiones-mobile li")).toHaveCount(3);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-1/instrumentos-list-390.png",
      fullPage: true,
    });
    await page.getByRole("link", { name: "Compras", exact: true }).click();
    await expect(page.locator(".inversiones-mobile li").first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-1/compras-list-390.png",
      fullPage: true,
    });
    await page.locator(".inversiones-mobile li").first().getByRole("button", { name: "Rectificar" }).click();
    await expect(
      page.getByRole("heading", { name: /Rectificar compra/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-1/rectificar-390.png",
    });
    await page.getByRole("link", { name: /Instrumentos/ }).click();
    await page.locator(".inversiones-mobile a", { hasText: "Fondo índice demo" }).click();
    await expect(
      page.getByLabel("Posiciones por Saldo móvil"),
    ).toContainText("S004 · Cartera de inversión demo");
    await expect(
      page.getByLabel("Compras del Instrumento móvil"),
    ).toContainText("EUR cargado");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-1/instrumento-ficha-390.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
