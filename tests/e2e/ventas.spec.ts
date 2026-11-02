import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * E4.2 acceptance walkthrough (SPEC22 AC-19/20/23/27/32/33/44 UI).
 * Reuses the E4.1 Playwright shell, real MFA and an isolated fictional API.
 * Every amount is synthetic; no real database, key or personal figure is used.
 */
test("E4.2 ventas: listado, alta, impacto, rectificación, anulación, ficha, estados y 390/1440", async ({
  page,
  request,
}) => {
  const child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/ventas-server.ts"],
      { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
    ),
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const light = () =>
    page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const rgb = style.backgroundColor.match(/\d+/g)!.map(Number);
      return {
        luminance: (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000,
        scheme: style.colorScheme,
      };
    });
  const noOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  const ventasTab = () =>
    page.getByRole("link", { name: "Ventas", exact: true }).click();
  const instrumentsTab = () =>
    page.getByRole("link", { name: /Instrumentos/ }).first().click();
  const reviewSale = async () => {
    await page.getByRole("button", { name: "Revisar venta" }).focus();
    await page.keyboard.press("Enter");
  };
  try {
    await expect
      .poll(
        async () => {
          try {
            return (
              await request.get("http://127.0.0.1:3011/api/health")
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(200);
    expect(
      (await request.get("http://127.0.0.1:3011/api/ventas")).status(),
    ).toBe(401);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3011";
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
    await page.goto("/inversiones");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-ventas/bootstrap.txt", "utf8"));
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Clave ficticia ventas " + randomUUID());
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
    mkdirSync("artifacts/e4-2", { recursive: true });

    // ---- W11: listing, cash and filters (1440) ----
    await ventasTab();
    await expect(
      page.getByRole("heading", { name: "Ventas de inversión", exact: true }),
    ).toBeVisible();
    const cash = page.getByLabel("Efectivo del bróker");
    await expect(cash).toContainText("S003 · Efectivo de inversión demo");
    await expect(cash).toContainText("1.810,40 €");
    await expect(cash).toContainText("S007 · Efectivo secundario demo");
    await expect(cash).toContainText("100,00 €");
    await expect(cash).toContainText("sin total agregado");
    await expect(
      page.getByText(
        /Todas \(3\) · 2 vigentes · 1 anulada\(s\)\. Posición calculada solo con las operaciones registradas; no incluye histórico anterior no importado/,
      ),
    ).toBeVisible();
    for (const header of [
      "Fecha",
      "Instrumento",
      "Efvo.",
      "Inv.",
      "Cantidad",
      "Precio",
      "Divisa",
      "Cambio",
      "EUR cobrado",
      "Comisión",
      "Estado",
      "Acciones",
    ])
      await expect(
        page.getByRole("columnheader", { name: header, exact: true }),
      ).toBeVisible();
    await expect(page.locator(".inversiones-list tbody tr")).toHaveCount(3);
    await expect(page.getByText("10/03/2026", { exact: true })).toBeVisible();
    await expect(page.getByText("12/03/2026", { exact: true })).toBeVisible();
    await expect(page.getByText("15/03/2026", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-2/ventas-list-1440.png",
      fullPage: true,
    });
    await page.getByLabel("Estado").selectOption("Anulada");
    await expect(page.locator(".inversiones-list tbody tr")).toHaveCount(1);
    await expect(page.getByText("15/03/2026", { exact: true })).toBeVisible();
    const annulledRow = page.locator("tr", { hasText: "15/03/2026" });
    await expect(annulledRow.getByRole("button", { name: "Ver" })).toBeVisible();
    await expect(
      annulledRow.getByRole("button", { name: "Rectificar" }),
    ).toHaveCount(0);
    await expect(annulledRow.getByRole("button", { name: "Anular" })).toHaveCount(
      0,
    );
    await page.getByLabel("Estado").selectOption("Vigente");
    await expect(page.locator(".inversiones-list tbody tr")).toHaveCount(2);
    await expect(page.getByText("15/03/2026", { exact: true })).toHaveCount(0);
    await page.getByLabel("Estado").selectOption("");

    // ---- AC-19: positions including zero, no valuation and no «Cerrada» ----
    await instrumentsTab();
    await expect(
      page.getByRole("heading", { name: "Inversiones", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Listado de Instrumentos" })
        .getByText(
          /Posición calculada solo con las operaciones registradas; no incluye histórico anterior no importado/,
        ),
    ).toBeVisible();
    const zeroRow = page.locator("tr", { hasText: "Fondo cerrado demo" });
    await expect(zeroRow).toContainText(
      "S004 Cartera de inversión demo · 0",
    );
    await expect(page.getByText("Fondo inactivo demo", { exact: true })).toBeVisible();
    await expect(page.getByText("Cerrada", { exact: true })).toHaveCount(0);
    await page
      .getByRole("link", { name: "Fondo cerrado demo", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Fondo cerrado demo", exact: true }),
    ).toBeVisible();
    const positions = page.getByLabel("Posiciones por Saldo de inversión");
    await expect(positions).toContainText("S004 · Cartera de inversión demo");
    await expect(positions).toContainText("0");
    await expect(positions).toContainText("2");
    await expect(page.getByText(/No disponible hasta E4.3/)).toBeVisible();
    await expect(page.getByText(/Valoración E4.3 no entregada/)).toBeVisible();
    await expect(page.getByText("Cerrada", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Rentabilidad|Valor actual/)).toHaveCount(0);
    await page.screenshot({
      path: "artifacts/e4-2/instrumento-ficha-cero-1440.png",
      fullPage: true,
    });
    await ventasTab();

    // ---- W13: keyboard-driven alta and real impact ----
    await page.getByRole("button", { name: "Nueva venta" }).click();
    await expect(
      page.getByRole("heading", { name: "Nueva venta", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel(/Saldo de efectivo \*/)).toHaveValue("");
    await expect(page.getByLabel(/Saldo de inversión \*/)).toHaveValue("");
    await page.getByLabel(/Fecha \*/).fill("2026-04-10");
    await page.getByLabel(/Saldo de efectivo \*/).selectOption("S003");
    await page.getByLabel(/Saldo de inversión \*/).selectOption("S004");
    await page.getByLabel(/Instrumento \*/).selectOption("I1001");
    await page.getByLabel(/Cantidad \*/).fill("5");
    await page.getByLabel(/Precio unitario \*/).fill("110.00");
    await page.getByLabel(/Divisa \*/).selectOption("USD");
    await page.getByLabel(/Cambio histórico/).fill("0.920000");
    await page.getByLabel(/EUR cobrado \*/).fill("506.00");
    await page.getByLabel(/Comisión EUR \(incluida\)/).fill("2.00");
    await page.getByLabel("Concepto", { exact: true }).fill("Venta parcial demo");
    await expect(
      page.getByText(
        /Referencia cantidad×precio×cambio: 506,00 € · Diferencia: 0,00 €/,
      ),
    ).toBeVisible();
    await page.getByLabel("Concepto", { exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Nota", { exact: true })).toBeFocused();
    await reviewSale();
    await expect(
      page.getByRole("heading", { name: /Impacto \(no escribe hasta confirmar\)/ }),
    ).toBeVisible();
    await expect(page.locator(".inversiones-impact h2")).toBeFocused();
    const impact = page.getByLabel("Impacto de la operación");
    await expect(impact).toContainText(
      "antes 1.810,40 € → después 2.316,40 €",
    );
    await expect(impact).toContainText("antes 12,5 → después 7,5");
    await page.screenshot({
      path: "artifacts/e4-2/venta-impacto-1440.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Confirmar venta" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", {
        name: "I1001 · Fondo índice demo",
        exact: true,
      }),
    ).toBeVisible();
    const detail = page.getByLabel("Datos de la Venta");
    await expect(detail).toContainText("506,00 €");
    await expect(detail).toContainText("2,00 €");
    await expect(page.getByText(/10\/04\/2026 · Vigente/)).toBeVisible();
    await expect(page.getByText(/Revisión/).first()).toBeVisible();
    await page.screenshot({
      path: "artifacts/e4-2/venta-ficha-1440.png",
      fullPage: true,
    });

    // ---- W15: rectification, real impact, 409 and stale confirmation ----
    await page.getByRole("button", { name: "Rectificar" }).click();
    await expect(
      page.getByRole("heading", { name: /Rectificar venta/ }),
    ).toBeVisible();
    await expect(page.getByLabel(/Cantidad \*/)).toHaveValue("5");
    await expect(page.getByLabel(/Saldo de efectivo \*/)).toBeDisabled();
    await page.getByLabel(/Cantidad \*/).fill("3");
    await page.getByLabel(/EUR cobrado \*/).fill("303.00");
    await page.getByLabel(/Comisión EUR \(incluida\)/).fill("1.00");
    await page.getByLabel(/Motivo \*/).fill("Corrección de cantidad ficticia");
    await reviewSale();
    await expect(impact).toContainText(
      "antes 2.316,40 € → después 2.113,40 €",
    );
    await expect(impact).toContainText("antes 7,5 → después 9,5");
    await expect(
      page.getByText(/Referencia cantidad×precio×cambio: 303,60 €/),
    ).toBeVisible();
    await page.screenshot({
      path: "artifacts/e4-2/rectificar-impacto-1440.png",
      fullPage: true,
    });
    await page.route(
      /\/api\/ventas\/\d+\/rectificar$/,
      (route) =>
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            code: "REVISION_CONFLICT",
            error: "La Venta ha cambiado. Revisa la versión actual.",
          }),
        }),
      { times: 1 },
    );
    await page
      .getByRole("button", { name: "Confirmar rectificación" })
      .click();
    await expect(
      page.getByText("La Venta ha cambiado. Revisa la versión actual."),
    ).toBeVisible();
    await expect(page.locator(".focus-alert")).toBeFocused();
    await expect(page.getByLabel(/Cantidad \*/)).toHaveValue("3");
    await expect(page.getByLabel(/EUR cobrado \*/)).toHaveValue("303.00");
    await expect(page.getByLabel(/Motivo \*/)).toHaveValue(
      "Corrección de cantidad ficticia",
    );
    await expect(
      page.getByRole("button", { name: "Confirmar rectificación" }),
    ).toBeDisabled();
    await page.screenshot({
      path: "artifacts/e4-2/rectificar-409-1440.png",
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "Actualizar revisión conservando el borrador",
      })
      .click();
    await expect(page.locator(".focus-alert")).toHaveCount(0);
    await expect(page.getByLabel(/Cantidad \*/)).toHaveValue("3");
    await page
      .getByRole("button", { name: "Confirmar rectificación" })
      .click();
    await expect(detail).toContainText("303,00 €");
    await expect(detail).toContainText("1,00 €");
    await expect(page.getByText(/revisión 2/).first()).toBeVisible();
    await page.screenshot({
      path: "artifacts/e4-2/venta-rectificada-1440.png",
      fullPage: true,
    });

    // ---- W15: annulment impact, disabled confirmation and annulled detail ----
    await page.getByRole("button", { name: "Anular" }).click();
    await expect(
      page.getByRole("heading", { name: "Anular venta", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Anular venta" }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Ver impacto de anulación" })
      .click();
    await expect(impact).toContainText(
      "antes 2.113,40 € → después 1.810,40 €",
    );
    await expect(impact).toContainText("antes 9,5 → después 12,5");
    await expect(page.getByRole("button", { name: "Anular venta" })).toBeDisabled();
    await page.screenshot({
      path: "artifacts/e4-2/anular-impacto-1440.png",
      fullPage: true,
    });
    await page.getByLabel(/Motivo \*/).fill("Duplicado ficticio");
    await expect(page.getByRole("button", { name: "Anular venta" })).toBeEnabled();
    await page.getByRole("button", { name: "Anular venta" }).click();
    await expect(
      page.getByText(/La Venta está anulada: no computa/),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Rectificar" })).toHaveCount(0);
    await page.screenshot({
      path: "artifacts/e4-2/venta-anulada-1440.png",
      fullPage: true,
    });

    // ---- AC-30/D2 UI: real INSUFFICIENT_CASH on annulment, draft preserved ----
    await ventasTab();
    const d2Row = page.locator("tr", { hasText: "12/03/2026" });
    await d2Row.getByRole("button", { name: "Anular" }).click();
    await page.getByLabel(/Motivo \*/).fill("Anulación D2 demo");
    await page.getByRole("button", { name: "Ver impacto de anulación" }).click();
    await expect(page.getByText(/Efectivo insuficiente/)).toBeVisible();
    await expect(
      page.getByText(
        /Disponible 100\.00 · necesario 500\.00 · mínimo -400\.00 · 2026-03-13/,
      ),
    ).toBeVisible();
    await expect(page.getByLabel(/Motivo \*/)).toHaveValue("Anulación D2 demo");
    await expect(page.getByRole("button", { name: "Anular venta" })).toHaveCount(
      0,
    );
    await page.screenshot({
      path: "artifacts/e4-2/anular-d2-1440.png",
      fullPage: true,
    });

    // ---- AC-05/D1 UI: quantity, exact detail, preserved draft and recovery ----
    await ventasTab();
    await page.getByRole("button", { name: "Nueva venta" }).click();
    await page.getByLabel(/Fecha \*/).fill("2026-04-10");
    await page.getByLabel(/Saldo de efectivo \*/).selectOption("S003");
    await page.getByLabel(/Saldo de inversión \*/).selectOption("S004");
    await page.getByLabel(/Instrumento \*/).selectOption("I1001");
    await page.getByLabel(/Cantidad \*/).fill("13");
    await page.getByLabel(/Precio unitario \*/).fill("110.00");
    await page.getByLabel(/Divisa \*/).selectOption("EUR");
    await page.getByLabel(/EUR cobrado \*/).fill("1430.00");
    await reviewSale();
    await expect(page.getByText(/Cantidad insuficiente/)).toBeVisible();
    await expect(
      page.getByText(
        /Disponible 12\.5 · necesario 13 · mínimo -0\.5 · 2026-04-10/,
      ),
    ).toBeVisible();
    await expect(page.locator(".focus-alert")).toBeFocused();
    await expect(page.getByLabel(/Cantidad \*/)).toHaveValue("13");
    await expect(page.getByLabel(/Instrumento \*/)).toHaveValue("I1001");
    await expect(page.getByLabel(/Saldo de inversión \*/)).toHaveValue("S004");
    await page.screenshot({
      path: "artifacts/e4-2/venta-cantidad-1440.png",
      fullPage: true,
    });
    await page.getByLabel(/Cantidad \*/).fill("5");
    await page.getByLabel(/EUR cobrado \*/).fill("506.00");
    await expect(page.getByText(/Cantidad insuficiente/)).toHaveCount(0);
    await reviewSale();
    await expect(impact).toContainText(
      "antes 1.810,40 € → después 2.316,40 €",
    );
    await page.getByRole("button", { name: "Cancelar" }).click();

    // ---- AC-27/D3 UI: inactive Instrument with quantity is marked and warned ----
    await page.getByRole("button", { name: "Nueva venta" }).click();
    await page.getByLabel(/Saldo de inversión \*/).selectOption("S006");
    const instrumentOptions = page.getByLabel(/Instrumento \*/).locator("option");
    await expect(instrumentOptions.filter({ hasText: "I1002" })).toHaveCount(0);
    await page.getByLabel(/Saldo de inversión \*/).selectOption("S004");
    await expect(instrumentOptions.filter({ hasText: "I1002" })).toHaveCount(1);
    await page.getByLabel(/Instrumento \*/).selectOption("I1002");
    await expect(
      page.getByText(/Aviso: el Instrumento está inactivo/),
    ).toBeVisible();
    await expect(
      page.getByLabel(/Instrumento \*/).locator("option", { hasText: "I1002" }),
    ).toContainText("inactivo");
    await page.getByRole("button", { name: "Cancelar" }).click();

    // ---- AC-33: empty, loading, source error and cash source error ----
    await page.route("**/api/ventas?*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ventas: [],
          total: 0,
          page: 1,
          resumen: { total: 0, vigentes: 0, anuladas: 0 },
          cobertura:
            "Posición calculada solo con las operaciones registradas; no incluye histórico anterior no importado",
        }),
      }),
    );
    await instrumentsTab();
    await ventasTab();
    await expect(
      page.getByRole("heading", { name: "Sin ventas registradas", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Listado de Ventas" })
        .getByText("0,00 €"),
    ).toHaveCount(0);
    await page.screenshot({
      path: "artifacts/e4-2/ventas-vacio-1440.png",
      fullPage: true,
    });
    await page.unroute("**/api/ventas?*");
    await page.route("**/api/ventas?*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.fallback();
    });
    await instrumentsTab();
    await ventasTab();
    await expect(page.getByText("Cargando ventas…")).toBeVisible();
    await expect(page.locator(".inversiones-list tbody tr")).toHaveCount(4);
    await page.unroute("**/api/ventas?*");
    await page.route("**/api/ventas?*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Fallo ficticio de fuente" }),
      }),
    );
    await instrumentsTab();
    await ventasTab();
    await expect(
      page.getByText(
        /No se pudo leer el registro de Ventas\. Fallo ficticio de fuente/,
      ),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Listado de Ventas" })
        .getByText("0,00 €"),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await page.screenshot({
      path: "artifacts/e4-2/ventas-error-1440.png",
      fullPage: true,
    });
    await page.unroute("**/api/ventas?*");
    await page.route("**/api/instrumentos/opciones", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Fallo ficticio de opciones" }),
      }),
    );
    await instrumentsTab();
    await ventasTab();
    await expect(
      page.getByText(
        /No disponible\. No se pudo calcular el efectivo del bróker; no se declara cero\./,
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Efectivo del bróker")).not.toContainText(
      "0,00 €",
    );
    await page.screenshot({
      path: "artifacts/e4-2/efectivo-no-disponible-1440.png",
      fullPage: true,
    });
    await page.unroute("**/api/instrumentos/opciones");

    // ---- AC-44 UI: missing references are shown as «Revisar», never repaired ----
    await page.route("**/api/ventas?*", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3011";
      const response = await route.fetch({ url: url.toString() });
      const body = await response.json();
      body.ventas[0] = {
        ...body.ventas[0],
        instrumento: null,
        saldoEfectivo: null,
        saldoInversion: null,
      };
      await route.fulfill({
        response,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await page.route(/\/api\/ventas\/\d+$/, async (route) => {
      const url = new URL(route.request().url());
      url.port = "3011";
      const response = await route.fetch({ url: url.toString() });
      const body = await response.json();
      body.venta = {
        ...body.venta,
        instrumento: null,
        saldoEfectivo: null,
        saldoInversion: null,
      };
      await route.fulfill({
        response,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await instrumentsTab();
    await ventasTab();
    await expect(page.getByText(/Incidencia «Revisar»/).first()).toBeVisible();
    await expect(page.getByText("Revisar", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Ver" }).first().click();
    await expect(
      page.getByRole("heading", {
        name: "Revisar · Venta sin Instrumento",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Incidencia «Revisar»/).first()).toBeVisible();
    await page.screenshot({
      path: "artifacts/e4-2/venta-revisar-1440.png",
      fullPage: true,
    });
    await page.unroute("**/api/ventas?*");
    await page.unroute(/\/api\/ventas\/\d+$/);

    // ---- AC-23/33 UI: fuente pendiente declarada, sin fecha inventada ----
    const pendingContext = {
      referencia: {
        fecha: "2026-04-10",
        estado: "parcial",
        coverage: [
          { source: "Movimientos", state: "disponible", maxDate: "2026-04-10" },
          { source: "Revisión Comida", state: "pendiente" },
          { source: "Operaciones de inversión", state: "pendiente" },
        ],
      },
      actual: null,
      motivo: "sin_referencia",
      ultimoInicio: null,
      revision: "demo",
    };
    await page.route("**/api/ciclos/contexto*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(pendingContext),
      }),
    );
    await page.route("**/api/ciclos?*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ciclos: [],
          total: 0,
          page: 1,
          contexto: pendingContext,
        }),
      }),
    );
    await page.goto("/ciclos");
    await expect(page.getByText(/pendientes/).first()).toBeVisible();
    await page.unroute("**/api/ciclos/contexto*");
    await page.unroute("**/api/ciclos?*");

    // ---- AC-23 UI: an error reference is declared, never replaced by a clock ----
    const errorContext = {
      referencia: {
        fecha: null,
        estado: "error",
        coverage: [
          { source: "Movimientos", state: "pendiente" },
          { source: "Revisión Comida", state: "pendiente" },
          { source: "Operaciones de inversión", state: "error" },
        ],
      },
      actual: null,
      motivo: "error_referencia",
      ultimoInicio: null,
      revision: "demo",
    };
    await page.route("**/api/ciclos/contexto", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(errorContext),
      }),
    );
    await page.goto("/inversiones");
    await expect(page.getByText("Error de referencia", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Referencia financiera: No disponible", { exact: true }),
    ).toBeVisible();
    await page.route("**/api/ciclos?*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ciclos: [],
          total: 0,
          page: 1,
          contexto: errorContext,
        }),
      }),
    );
    await page.goto("/ciclos");
    await expect(
      page.getByText(
        /No se puede obtener una referencia fiable: una fuente ha fallado\./,
      ),
    ).toBeVisible();
    await page.unroute("**/api/ciclos/contexto");
    await page.unroute("**/api/ciclos?*");

    // ---- 390 viewport: labels, keyboard, overflow, light theme and captures ----
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/inversiones");
    await expect(
      page.getByRole("heading", { name: "Inversiones", exact: true }),
    ).toBeVisible();
    const theme = await light();
    expect(theme.luminance).toBeGreaterThan(180);
    expect(theme.scheme).toBe("light");
    await ventasTab();
    await expect(page.locator(".inversiones-mobile li")).toHaveCount(4);
    await noOverflow();
    await page.screenshot({
      path: "artifacts/e4-2/ventas-list-390.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Nueva venta" }).click();
    await expect(page.getByLabel(/Fecha \*/)).toBeVisible();
    await expect(page.getByLabel(/Cantidad \*/)).toBeVisible();
    await expect(page.getByLabel(/Cambio histórico/)).toBeVisible();
    await page.getByLabel(/Cantidad \*/).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/Precio unitario \*/)).toBeFocused();
    await noOverflow();
    await page.screenshot({
      path: "artifacts/e4-2/venta-form-390.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cancelar" }).click();
    const zeroMobile = page.locator(".inversiones-mobile li", {
      hasText: "10/03/2026",
    });
    await zeroMobile.getByRole("button", { name: "Ver" }).click();
    await expect(
      page.getByRole("heading", { name: "I1003 · Fondo cerrado demo" }),
    ).toBeVisible();
    await noOverflow();
    await page.screenshot({
      path: "artifacts/e4-2/venta-ficha-390.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Rectificar" }).click();
    await page.getByLabel(/Cantidad \*/).fill("1");
    await page.getByLabel(/EUR cobrado \*/).fill("110.00");
    await page.getByLabel(/Motivo \*/).fill("Rectificación móvil ficticia");
    await reviewSale();
    await expect(impact).toContainText(
      "antes 1.810,40 € → después 1.700,40 €",
    );
    await expect(impact).toContainText("antes 0 → después 1");
    await noOverflow();
    await page.screenshot({
      path: "artifacts/e4-2/rectificar-impacto-390.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cancelar" }).click();
    await page.getByRole("button", { name: "Anular" }).click();
    await page.getByRole("button", { name: "Ver impacto de anulación" }).click();
    await expect(impact).toContainText(
      "antes 1.810,40 € → después 1.590,40 €",
    );
    await expect(impact).toContainText("antes 0 → después 2");
    await noOverflow();
    await page.screenshot({
      path: "artifacts/e4-2/anular-impacto-390.png",
      fullPage: true,
    });
    await page.getByRole("link", { name: "‹ Volver" }).click();
    await instrumentsTab();
    await page
      .locator(".inversiones-mobile a", { hasText: "Fondo cerrado demo" })
      .click();
    await expect(
      page.getByLabel("Posiciones por Saldo móvil"),
    ).toContainText("S004 · Cartera de inversión demo");
    await expect(
      page
        .getByLabel("Posiciones por Saldo móvil")
        .locator("li", { hasText: "S004 · Cartera de inversión demo" }),
    ).toContainText("0");
    await expect(page.getByText(/No disponible hasta E4.3/)).toBeVisible();
    await noOverflow();
    await page.screenshot({
      path: "artifacts/e4-2/instrumento-ficha-cero-390.png",
      fullPage: true,
    });

    // ---- AC-40 UI: Transferencia previsualizada e invalidada por una Venta ----
    await page.goto("/movimientos/nuevo");
    await page.getByLabel("Tipo *", { exact: true }).selectOption("Transferencia");
    await page.getByLabel("Fecha económica *", { exact: true }).fill("2026-04-05");
    await page.getByLabel("Importe (€) *", { exact: true }).fill("10");
    await page.getByLabel("Saldo origen *", { exact: true }).selectOption("S001");
    await page.getByLabel("Saldo destino *", { exact: true }).selectOption("S002");
    await page.getByLabel("Concepto", { exact: true }).fill("Transferencia AC-40");
    await page
      .getByRole("button", { name: "Revisar transferencia", exact: true })
      .click();
    await expect(page.getByLabel("Vista previa de impacto")).toBeVisible();
    const session = await page.evaluate(async () =>
      (await fetch("/api/auth/session")).json(),
    );
    const sale = await page.request.post(
      "http://127.0.0.1:3011/api/ventas",
      {
        headers: {
          origin: "http://127.0.0.1:5173",
          "x-csrf-token": session.csrf,
          "idempotency-key": randomUUID(),
        },
        data: {
          fecha: "2026-04-10",
          instrumento: "I1001",
          saldoEfectivo: "S003",
          saldoInversion: "S004",
          cantidad: "1",
          precio: "100.00",
          divisa: "EUR",
          cambio: null,
          importeEur: "100.00",
          comisionEur: null,
          concepto: "Venta AC-40",
          nota: null,
        },
      },
    );
    expect(sale.status()).toBe(201);
    await page
      .getByRole("button", { name: "Confirmar transferencia", exact: true })
      .click();
    await expect(page.getByText(/Tus campos se conservan/)).toBeVisible();
    await expect(
      page.getByLabel("Concepto", { exact: true }),
    ).toHaveValue("Transferencia AC-40");
    expect(errors).toEqual([]);
    await page.screenshot({
      path: "artifacts/e4-2/movimiento-impacto-invalidado-390.png",
      fullPage: true,
    });

    // ---- AC-33: expired session keeps the draft and asks to reauthenticate ----
    await page.goto("/inversiones");
    await ventasTab();
    await page.getByRole("button", { name: "Nueva venta" }).click();
    await page.getByLabel(/Fecha \*/).fill("2026-04-11");
    await page.getByLabel(/Cantidad \*/).fill("2");
    await page.route("**/api/ventas/impacto", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Sesión expirada ficticia" }),
      }),
    );
    await reviewSale();
    await expect(
      page.getByText(/La sesión ha caducado\. Copia cualquier borrador/),
    ).toBeVisible();
    await expect(page.getByLabel(/Fecha \*/)).toHaveValue("2026-04-11");
    await expect(page.getByLabel(/Cantidad \*/)).toHaveValue("2");
    await page.screenshot({
      path: "artifacts/e4-2/sesion-expirada-390.png",
      fullPage: true,
    });
    await page.unroute("**/api/ventas/impacto");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
