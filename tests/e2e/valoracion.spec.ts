import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const API_PORT = 3011;
const LIST = "/inversiones/valoracion";

test("E4.3 valoración: listado/agregado, detalle, alta, rectificación, ficha, errores y 390/1440", async ({
  page,
  request,
}) => {
  const child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/valoracion-server.ts"],
      { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
    ),
    errors: string[] = [],
    serverLog: string[] = [];
  child.stderr?.on("data", (chunk) => serverLog.push(String(chunk)));
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await expect
      .poll(
        async () => {
          try {
            return (
              await request.get(`http://127.0.0.1:${API_PORT}/api/health`)
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(200);
    expect(
      (
        await request.get(
          `http://127.0.0.1:${API_PORT}/api/e43/corte?fecha=2026-06-30`,
        )
      ).status(),
    ).toBe(401);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = String(API_PORT);
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
    await page.goto("/inversiones");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-valoracion/bootstrap.txt", "utf8"));
    const password = "Clave ficticia valoración " + randomUUID();
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill(password);
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
    await page.getByRole("link", { name: "Valoración", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Valoración y resultados" }),
    ).toBeVisible();
    mkdirSync("artifacts/e4-3", { recursive: true });

    const consultar = async (fecha: string, rows: number) => {
      await page.getByLabel(/Fecha de corte/).fill(fecha);
      await page.getByRole("button", { name: "Consultar" }).click();
      await expect(page.locator(".valoracion-table tbody tr")).toHaveCount(rows);
    };
    const row = (text: string) =>
      page.locator(".valoracion-table tbody tr", { hasText: text });
    const summary = page.getByLabel("Agregado a corte");
    const mobileCards = page.locator(".valoracion-mobile li");
    const listState = page.locator(".valoracion-list-state");
    const apiPost = async (path: string, body: unknown) => {
      const session = await page.evaluate(async () =>
        (await fetch("/api/auth/session")).json(),
      );
      return page.request.post(
        `http://127.0.0.1:${API_PORT}/api${path}`,
        {
          headers: {
            origin: "http://127.0.0.1:5173",
            "x-csrf-token": session.csrf,
            "idempotency-key": randomUUID(),
          },
          data: body,
        },
      );
    };

    // S2 · loading keeps the cutoff and never shows a provisional total.
    await page.route(
      "**/api/e43/corte?*",
      async (route) => {
        const url = new URL(route.request().url());
        url.port = String(API_PORT);
        await new Promise((resolve) => setTimeout(resolve, 900));
        await route.fulfill({
          response: await route.fetch({ url: url.toString() }),
        });
      },
      { times: 1 },
    );
    await page.getByLabel(/Fecha de corte/).fill("2026-03-31");
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(page.getByRole("status")).toContainText("Cargando posiciones");
    await expect(page.getByRole("status")).toContainText("sin totales provisionales");
    await expect(page.locator(".valoracion-table tbody tr")).toHaveCount(4);
    await expect(summary).toContainText("Parcial 1/4");
    await expect(row("S004 · I1001")).toContainText("1.181,25 €");
    await expect(row("S004 · I1001")).toContainText("56,25 €");
    await expect(row("S004 · I1001")).toContainText("16 días");

    // W1/W2 · 2026-06-30: partial coverage, closed position, inactive position,
    // manual position and separate broker cash.
    await consultar("2026-06-30", 5);
    await expect(summary).toContainText("Parcial 3/4");
    await expect(summary).toContainText("No se muestra");
    await expect(summary).toContainText("Parcial 3/5");
    await expect(summary).toContainText("No elegible por fecha exacta en E4.3");
    await expect(
      page.getByText(/Estado del listado: 4 abiertas · 1 cerrada/),
    ).toBeVisible();
    await expect(listState).toContainText("1 cerrada incluida");
    await expect(listState).not.toContainText("cerrada(s)");
    const p1 = row("S004 · I1001");
    await expect(p1).toContainText("877,50 €");
    await expect(p1).toContainText("258,50 €");
    await expect(p1).toContainText("Automática · 30/06/2026 · 0 días");
    await expect(p1).toContainText(
      "Elegible por fecha exacta (E4.9 no evaluado)",
    );
    await expect(row("S006 · I1001")).toContainText("342,00 €");
    await expect(row("S006 · I1001")).toContainText("77,40 €");
    await expect(row("S006 · I1001")).toContainText("61 días");
    await expect(row("S004 · I1002")).toContainText("Cerrada");
    await expect(row("S004 · I1002")).toContainText("No aplica");
    await expect(row("S004 · I1002")).toContainText("40,00 €");
    await expect(row("S006 · I1003")).toContainText("Inactiva");
    await expect(row("S006 · I1003")).toContainText("No disponible");
    await expect(row("S006 · I1005")).toContainText("205,00 €");
    await expect(row("S006 · I1005")).toContainText("Manual");
    const cash = page.getByLabel("Efectivo del bróker");
    await expect(cash).toContainText("S003 · Efectivo de inversión demo");
    await expect(cash).toContainText("1.456,40 €");
    await expect(cash).toContainText("S007 · Efectivo secundario demo");
    await expect(cash).toContainText("500,00 €");
    await expect(cash).toContainText("No suma al agregado de posiciones");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-list-1440.png",
      fullPage: true,
    });

    // Serie vacía · 06-30 base, antes de mutar: P4 no tiene valoración.
    await page.goto(`${LIST}/S006/I1003?fecha=2026-06-30`);
    await expect(
      page.getByRole("heading", {
        name: "S006 · I1003 · Fondo heredado demo",
      }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Serie histórica", { exact: true }),
    ).toContainText("Serie vacía");
    await expect(page.getByText("0,00 €")).toHaveCount(0);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-serie-vacia-1440.png",
      fullPage: true,
    });

    // W2 · 390 parcial al 06-30 base, antes de mutar.
    await page.goto(`${LIST}?fecha=2026-06-30`);
    await expect(
      page.getByRole("heading", { name: "Valoración y resultados" }),
    ).toBeVisible();
    await expect(page.locator(".valoracion-table tbody tr")).toHaveCount(5);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".valoracion-desktop").first()).toBeHidden();
    await expect(page.locator(".valoracion-mobile").first()).toBeVisible();
    await expect(mobileCards).toHaveCount(5);
    await expect(summary).toContainText("Parcial 3/4");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-list-390.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });

    // Closed position detail must say No aplica, never "No disponible"/null.
    await row("S004 · I1002")
      .getByRole("link", { name: "Ver detalle de S004 · I1002" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "S004 · I1002 · Acción demo",
      }),
    ).toBeVisible();
    const closedSummary = page.getByLabel("Resumen de la posición");
    await expect(closedSummary).toContainText("No aplica");
    await expect(closedSummary).toContainText("40,00 €");
    await expect(page.getByText("null", { exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Valoración", exact: true }).click();
    await consultar("2026-06-30", 5);

    // W3 · detail: used valuation, dates, quantities, result, series and links.
    await p1
      .getByRole("link", { name: "Ver detalle de S004 · I1001" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "S004 · I1001 · Fondo índice demo",
      }),
    ).toBeVisible();
    const resumen = page.getByLabel("Resumen de la posición");
    await expect(resumen).toContainText("7,5");
    await expect(resumen).toContainText("877,50 €");
    await expect(resumen).toContainText("258,50 €");
    await expect(
      page.getByLabel("Última valoración ≤ T"),
    ).toContainText("Cantidad base = cantidad al corte");
    await expect(
      page.getByLabel("Serie histórica", { exact: true }),
    ).toContainText("1.181,25 €");
    await expect(
      page.getByLabel("Serie histórica", { exact: true }),
    ).toContainText("855,00 €");
    await expect(
      page.getByLabel("Serie histórica", { exact: true }),
    ).toContainText("877,50 €");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-detail-1440.png",
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Ficha y auditoría" })
      .click();
    await expect(
      page.getByRole("heading", { name: /Valoración VAL-/ }),
    ).toBeVisible();
    await expect(page.getByLabel("Auditoría de la valoración")).toContainText(
      "revisión 1",
    );
    await expect(page.getByLabel("Auditoría de la valoración")).toContainText(
      "alta",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-ficha-1440.png",
      fullPage: true,
    });
    await page.getByRole("link", { name: "Ver posición al corte" }).click();
    await expect(
      page.getByRole("heading", {
        name: "S004 · I1001 · Fondo índice demo",
      }),
    ).toBeVisible();

    // S1 · empty source: no invented 0,00 row.
    await page.getByRole("link", { name: "Valoración", exact: true }).click();
    await page.getByLabel(/Fecha de corte/).fill("2026-01-01");
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(page.getByText("Sin posiciones", { exact: true })).toBeVisible();
    await expect(page.locator(".valoracion-table tbody tr")).toHaveCount(0);
    await expect(summary).toContainText("No aplica");

    // S3 · source error is never presented as an empty list.
    await page.route(
      "**/api/e43/corte?*",
      (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Fallo ficticio de fuente" }),
        }),
      { times: 1 },
    );
    await page.getByLabel(/Fecha de corte/).fill("2026-02-15");
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(
      page.getByText(/No se pudo leer la fuente de valoración al corte/),
    ).toBeVisible();
    await expect(page.getByText("Sin posiciones", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.locator(".valoracion-table tbody tr")).toHaveCount(3);

    // 2026-04-30 partial aggregate and exact expected values.
    await consultar("2026-04-30", 4);
    await expect(listState).toContainText(/Estado del listado: 4 abiertas\./);
    await expect(listState).not.toContainText("cerrada");
    await expect(summary).toContainText("Parcial 3/4");
    await expect(summary).toContainText("Parcial 2/4");
    await expect(row("S004 · I1001")).toContainText("855,00 €");
    await expect(row("S004 · I1001")).toContainText("236,00 €");
    await expect(row("S006 · I1001")).toContainText("342,00 €");
    await expect(row("S006 · I1001")).toContainText("77,40 €");
    await expect(row("S006 · I1005")).toContainText("205,00 €");
    await expect(page.getByLabel("Efectivo del bróker")).toContainText(
      "1.416,40 €",
    );

    // W5/W6 · automatic manual-equivalent flow: register the missing P4 value.
    await row("S006 · I1003")
      .getByRole("link", { name: "Ver detalle de S006 · I1003" })
      .click();
    await expect(
      page.getByRole("heading", { name: "S006 · I1003 · Fondo heredado demo" }),
    ).toBeVisible();
    await expect(page.getByText(/Sin valoración ≤ T/).first()).toBeVisible();
    await page.getByRole("link", { name: "Nueva valoración" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Registrar valoración Manual" }),
    ).toBeVisible();
    await page.getByRole("radio", { name: "Automática" }).check();
    await expect(
      page.getByRole("heading", { name: "Registrar valoración Automática" }),
    ).toBeVisible();
    await page.getByLabel(/Precio unitario/).fill("25.00");
    await page.getByLabel(/Procedencia/).fill(
      "Precio y cambio declarados por el usuario",
    );
    await expect(page.getByLabel("Vista previa · no persiste")).toContainText(
      "250,00 €",
    );
    await expect(page.getByLabel("Vista previa · no persiste")).toContainText(
      "10 × 25,00 × 1,000000",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-alta-automatica-1440.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Guardar valoración" }).click();
    await expect(
      page.getByRole("heading", { name: /Valoración VAL-/ }),
    ).toBeVisible();
    await expect(page.getByLabel("Datos de la valoración")).toContainText(
      "250,00 €",
    );
    await expect(page.getByLabel("Datos de la valoración")).toContainText(
      "Automática",
    );

    // Verified value coverage after the missing valuation exists.
    await page.getByRole("link", { name: "Valoración", exact: true }).click();
    await consultar("2026-04-30", 4);
    await expect(summary).toContainText("Verificada");
    await expect(summary).toContainText("1.652,00 €");
    await expect(summary).toContainText(
      "Elegible por fecha exacta (E4.9 no evaluado)",
    );

    // W2 · 390 verificado al 06-30, antes de la venta A-01.
    await consultar("2026-06-30", 5);
    await expect(summary).toContainText("Verificada");
    await expect(summary).toContainText("1.674,50 €");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(mobileCards).toHaveCount(5);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-list-390-verificada.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });

    // A-01 / R-E43-13 · venta real posterior a la valoración de P4.
    const sale = await apiPost("/ventas", {
      fecha: "2026-05-10",
      instrumento: "I1003",
      saldoEfectivo: "S003",
      saldoInversion: "S006",
      cantidad: "2",
      precio: "20.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "40.00",
      comisionEur: null,
      concepto: "Venta A-01 ficticia de P4",
      nota: null,
    });
    expect(sale.status()).toBe(201);
    await page.goto(`${LIST}?fecha=2026-06-30`);
    await expect(
      page.getByRole("heading", { name: "Valoración y resultados" }),
    ).toBeVisible();
    await expect(page.locator(".valoracion-table tbody tr")).toHaveCount(5);
    await expect(summary).toContainText("Parcial 3/4");
    await expect(cash).toContainText("1.496,40 €");
    await row("S006 · I1003")
      .getByRole("link", { name: "Ver detalle de S006 · I1003" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "S006 · I1003 · Fondo heredado demo",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Resumen de la posición")).toContainText(
      "No disponible",
    );
    const p4Detail = page.getByLabel("Última valoración ≤ T");
    await expect(p4Detail).toContainText(
      "Cantidad modificada desde la valoración",
    );
    await expect(
      p4Detail.locator(".valoracion-lines > div", { hasText: "Cantidad base" }),
    ).toContainText("10");
    await expect(
      p4Detail.locator(".valoracion-lines > div", {
        hasText: "Cantidad al corte",
      }),
    ).toContainText("8");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/a01-detail-1440.png",
      fullPage: true,
    });

    // Manual 0,00 · valor explícito que cuenta en cobertura, no ausencia.
    const zero = await apiPost("/e43/posiciones/S006/I1005/valoraciones", {
      fecha: "2026-05-31",
      tipo: "Manual",
      valorEur: "0.00",
      procedencia: "Valor cero ficticio declarado por el usuario",
    });
    expect(zero.status()).toBe(201);
    await page.goto(`${LIST}?fecha=2026-06-30`);
    await expect(
      page.getByRole("heading", { name: "Valoración y resultados" }),
    ).toBeVisible();
    await expect(page.locator(".valoracion-table tbody tr")).toHaveCount(5);
    const p5Value = row("S006 · I1005").locator("td").nth(3);
    await expect(p5Value).toContainText("0,00 €");
    await expect(p5Value).not.toContainText("No disponible");
    await expect(p5Value).toContainText("Manual");
    await expect(p5Value).toContainText("31/05/2026");
    await expect(summary).toContainText("Parcial 3/4");

    // Resultado negativo · P1 al 05-31 con precio 70 USD y cambio 0,95.
    const negative = await apiPost("/e43/posiciones/S004/I1001/valoraciones", {
      fecha: "2026-05-31",
      tipo: "Automática",
      precio: "70.000000",
      divisa: "USD",
      cambio: "0.950000",
      procedencia: "Precio y cambio ficticios declarados por el usuario",
    });
    expect(negative.status()).toBe(201);
    await page.goto(`${LIST}?fecha=2026-05-31`);
    await expect(
      page.getByRole("heading", { name: "Valoración y resultados" }),
    ).toBeVisible();
    await expect(page.locator(".valoracion-table tbody tr")).toHaveCount(5);
    await expect(row("S004 · I1001")).toContainText("498,75 €");
    await expect(row("S004 · I1001")).toContainText("-120,25 €");
    await row("S004 · I1001")
      .getByRole("link", { name: "Ver detalle de S004 · I1001" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "S004 · I1001 · Fondo índice demo",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Resumen de la posición")).toContainText(
      "-120,25 €",
    );
    await expect(page.getByLabel("Resultado de la posición")).toContainText(
      "-120,25 €",
    );
    await page.goto(`${LIST}?fecha=2026-06-30`);
    await expect(
      page.getByRole("heading", { name: "Valoración y resultados" }),
    ).toBeVisible();

    // W5/W6 · Manual alta and 409/422 draft preservation.
    await consultar("2026-06-30", 5);
    await row("S006 · I1005")
      .getByRole("link", { name: "Ver detalle de S006 · I1005" })
      .click();
    await page.getByRole("link", { name: "Nueva valoración" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Registrar valoración Manual" }),
    ).toBeVisible();
    await page.getByLabel(/Importe EUR/).fill("205.00");
    await page.getByLabel(/Procedencia/).fill("Valor declarado por el usuario");
    await expect(page.getByLabel("Vista previa · no persiste")).toContainText(
      "205,00 €",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-alta-manual-1440.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Guardar valoración" }).click();
    await expect(
      page.getByRole("heading", { name: /Valoración VAL-/ }),
    ).toBeVisible();
    await expect(page.getByLabel("Datos de la valoración")).toContainText(
      "Manual",
    );
    await page.getByRole("link", { name: "Ver posición al corte" }).click();
    await page.getByRole("link", { name: "Nueva valoración" }).first().click();
    await page.getByLabel(/Importe EUR/).fill("210.00");
    await page.getByLabel(/Procedencia/).fill("Valor duplicado ficticio");
    await page.getByRole("button", { name: "Guardar valoración" }).click();
    await expect(
      page.getByText(/Ya existe una valoración para esa posición y fecha/),
    ).toBeVisible();
    await expect(page.locator(".focus-alert")).toBeFocused();
    await expect(page.getByLabel(/Importe EUR/)).toHaveValue("210.00");
    await expect(page.getByLabel(/Procedencia/)).toHaveValue(
      "Valor duplicado ficticio",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-409-duplicado-1440.png",
      fullPage: true,
    });
    await page.getByLabel(/Importe EUR/).fill("-5.00");
    await page.getByRole("button", { name: "Guardar valoración" }).click();
    await expect(page.getByText(/No puede ser negativo/)).toBeVisible();
    await expect(page.getByLabel(/Importe EUR/)).toHaveValue("-5.00");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-422-1440.png",
      fullPage: true,
    });

    // W9/W10 · audited correction: 422, 409 and successful revision 2.
    await page.getByRole("link", { name: "Valoración", exact: true }).click();
    await consultar("2026-04-30", 4);
    await row("S004 · I1001")
      .getByRole("link", { name: "Ver detalle de S004 · I1001" })
      .click();
    await page.getByRole("link", { name: "Ficha y auditoría" }).click();
    await page.getByRole("link", { name: "Rectificar" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Corrección auditada de valoración",
      }),
    ).toBeVisible();
    await expect(page.getByText("Revisión vigente enviada")).toBeVisible();
    await page.getByLabel(/Precio unitario/).fill("0");
    await page.getByLabel(/Motivo de corrección/).fill(
      "Corrección ficticia de precio",
    );
    await page.getByRole("button", { name: "Guardar corrección" }).click();
    await expect(page.getByText(/Debe ser mayor que cero/)).toBeVisible();
    await expect(page.getByLabel(/Precio unitario/)).toHaveValue("0");
    await page.getByLabel(/Precio unitario/).fill("125.000000");
    const concurrent = await page.evaluate(async () => {
      const id = location.pathname.match(/VAL-\d{12}/)![0];
      const session = await fetch("/api/auth/session").then((response) =>
        response.json(),
      );
      const response = await fetch(`/api/e43/valoraciones/${id}/rectificar`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": session.csrf,
        },
        body: JSON.stringify({
          revision: 1,
          motivo: "Cambio concurrente ficticio",
          fecha: "2026-04-30",
          tipo: "Automática",
          precio: "124.000000",
          divisa: "USD",
          cambio: "0.950000",
          procedencia: "Corrección concurrente ficticia",
        }),
      });
      return { status: response.status, body: await response.json() };
    });
    expect(concurrent.status).toBe(200);
    expect(concurrent.body.valoracion.revision).toBe(2);
    await page.getByRole("button", { name: "Guardar corrección" }).click();
    await expect(
      page.getByText("La valoración ha cambiado. Revisa la versión actual."),
    ).toBeVisible();
    await expect(page.locator(".focus-alert")).toBeFocused();
    await expect(page.getByLabel(/Precio unitario/)).toHaveValue("125.000000");
    await expect(page.getByLabel(/Motivo de corrección/)).toHaveValue(
      "Corrección ficticia de precio",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-409-revision-1440.png",
      fullPage: true,
    });
    await expect(
      page.getByText(/Cambios concurrentes en la revisión 2/),
    ).toBeVisible();
    await expect(page.getByText(/obsoleta; vigente 2/)).toBeVisible();
    await expect(page.locator(".valoracion-conflict")).toContainText("Precio");
    const overwrite = page.getByRole("checkbox", {
      name: /reemplazará la revisión vigente/,
    });
    await expect(overwrite).not.toBeChecked();
    await expect(
      page.getByRole("button", { name: /Usar mi borrador sobre la revisión/ }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Guardar corrección" }),
    ).toBeDisabled();
    await overwrite.check();
    await expect(
      page.getByRole("button", { name: /Usar mi borrador sobre la revisión/ }),
    ).toBeEnabled();
    await page.getByLabel(/Precio unitario/).fill("126.000000");
    await expect(overwrite).not.toBeChecked();
    await expect(
      page.getByRole("button", { name: /Usar mi borrador sobre la revisión/ }),
    ).toBeDisabled();
    await expect(
      page.getByText(/Cambios concurrentes en la revisión 2/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guardar corrección" }),
    ).toBeDisabled();
    await page
      .getByRole("button", {
        name: "Descartar mi borrador y cargar la revisión vigente",
      })
      .click();
    await expect(page.locator(".focus-alert")).toHaveCount(0);
    await expect(page.getByLabel(/Precio unitario/)).toHaveValue("124.00");
    await expect(page.getByLabel(/Motivo de corrección/)).toHaveValue("");
    await page.getByLabel(/Precio unitario/).fill("125.000000");
    await page.getByLabel(/Motivo de corrección/).fill(
      "Corrección ficticia de precio",
    );
    await page.getByRole("button", { name: "Guardar corrección" }).click();
    await expect(
      page.getByRole("heading", { name: /Valoración VAL-/ }),
    ).toBeVisible();
    await expect(page.getByLabel("Datos de la valoración")).toContainText(
      "890,63 €",
    );
    await expect(page.getByText(/revisión 3/).first()).toBeVisible();
    await expect(page.getByLabel("Auditoría de la valoración")).toContainText(
      "corrección",
    );
    await expect(page.getByLabel("Auditoría de la valoración")).toContainText(
      "Corrección ficticia de precio",
    );
    await expect(page.getByLabel("Auditoría de la valoración")).toContainText(
      "Cambio concurrente ficticio",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-ficha-auditoria-1440.png",
      fullPage: true,
    });

    // S12 · 404 is an explicit error, never a zero position.
    await page.goto(`${LIST}/S004/I9999?fecha=2026-06-30`);
    await expect(
      page.getByText(/No se pudo leer la posición S004 · I9999/),
    ).toBeVisible();
    await expect(page.getByText("Sin posiciones", { exact: true })).toHaveCount(0);

    // Keyboard: Tab reaches Consultar with a visible focus ring; Enter queries.
    await page.goto(`${LIST}?fecha=2026-06-30`);
    await expect(
      page.getByRole("heading", { name: "Valoración y resultados" }),
    ).toBeVisible();
    await page.getByLabel(/Fecha de corte/).focus();
    let reachedConsultar = false;
    for (let index = 0; index < 8; index += 1) {
      await page.keyboard.press("Tab");
      if (
        await page.evaluate(
          () => document.activeElement?.textContent?.trim() === "Consultar",
        )
      ) {
        reachedConsultar = true;
        break;
      }
    }
    expect(reachedConsultar).toBe(true);
    await expect(page.getByRole("button", { name: "Consultar" })).toBeFocused();
    expect(
      await page.evaluate(() => {
        const element = document.activeElement;
        return element ? getComputedStyle(element).outlineWidth : "0px";
      }),
    ).not.toBe("0px");
    await page.keyboard.press("Enter");
    await expect(page.locator(".valoracion-table tbody tr")).toHaveCount(5);

    // 390 · cards, stacked forms and no page-level horizontal overflow.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${LIST}?fecha=2026-06-30`);
    await expect(
      page.getByRole("heading", { name: "Valoración y resultados" }),
    ).toBeVisible();
    await expect(page.locator(".valoracion-desktop").first()).toBeHidden();
    await expect(page.locator(".valoracion-mobile").first()).toBeVisible();
    await expect(mobileCards).toHaveCount(5);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page
      .getByRole("link", { name: "Abrir detalle de S004 · I1001" })
      .click();
    await expect(
      page.getByRole("heading", { name: "S004 · I1001 · Fondo índice demo" }),
    ).toBeVisible();
    await expect(page.getByLabel("Serie histórica móvil")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-detail-390.png",
      fullPage: true,
    });
    await page.getByRole("link", { name: "Nueva valoración" }).first().click();
    await page.getByRole("radio", { name: "Automática" }).check();
    await page.getByLabel(/Precio unitario/).fill("130.000000");
    await page.getByLabel(/Divisa/).fill("USD");
    await page.getByLabel(/Cambio a EUR/).fill("0.900000");
    await page.getByLabel(/Procedencia/).fill(
      "Precio y cambio declarados por el usuario",
    );
    await expect(page.getByLabel("Vista previa · no persiste")).toContainText(
      "877,50 €",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e4-3/valoracion-alta-390.png",
      fullPage: true,
    });

    // R5 · sesión expirada: se conserva el corte consultado y el contexto de /inversiones.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${LIST}?fecha=2026-06-30`);
    await expect(
      page.getByRole("heading", { name: "Valoración y resultados" }),
    ).toBeVisible();
    await expect(page.getByLabel(/Fecha de corte/)).toHaveValue("2026-06-30");
    await page.getByLabel(/Fecha de corte/).fill("2026-03-31");
    await page.route(
      "**/api/e43/corte?*",
      (route) =>
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Sesión expirada ficticia" }),
        }),
      { times: 1 },
    );
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(
      page.getByText(/La sesión ha caducado\. Copia cualquier borrador/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Volver a iniciar sesión", exact: true })
      .click();
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page
      .getByLabel("Código de la aplicación autenticadora")
      .fill(
        totp(secret).generate({
          timestamp: Date.parse("2026-10-26T12:00:30Z"),
        }),
      );
    await page
      .getByRole("button", { name: "Verificar código", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Valoración y resultados" }),
    ).toBeVisible();
    await expect(page.getByLabel(/Fecha de corte/)).toHaveValue("2026-03-31");
    await expect(page).toHaveURL(/fecha=2026-03-31/);
    await expect(page.locator(".valoracion-table tbody tr")).toHaveCount(4);
    await expect(page.getByLabel("Agregado a corte")).toContainText(
      "Parcial 1/4",
    );
    await expect(page.getByText(/La sesión ha caducado/)).toHaveCount(0);

    expect(errors).toEqual([]);
  } finally {
    child.kill();
    if (serverLog.length && errors.length)
      console.error("valoracion-server:\n" + serverLog.join(""));
  }
});
