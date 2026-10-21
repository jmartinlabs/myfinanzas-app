import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
export async function cycleJourney(page: Page) {
  mkdirSync("artifacts/e1-3", { recursive: true });
  const shot = async (name: string) => {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/e1-3/${name}.png`,
      fullPage: true,
    });
  };
  await page.goto("/ciclos");
  await expect(
    page.getByRole("heading", { name: "Todavía no hay ciclos" }),
  ).toBeVisible();
  await expect(page.locator(".global-header")).toContainText("Sin ciclos");
  await shot("empty-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("empty-desktop");
  await page.getByRole("button", { name: "Nuevo ciclo", exact: true }).click();
  const start = page.getByLabel("Inicio ciclo *", { exact: true });
  const money = page.getByLabel("Saldo inicial comida (€) *", { exact: true });
  await expect(start).toHaveValue("");
  await expect(money).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Crear ciclo", exact: true }),
  ).toBeEnabled();
  await shot("form-desktop");
  await page.getByRole("button", { name: "Crear ciclo", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(start).toHaveAttribute("aria-invalid", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("validation-mobile");
  await start.focus();
  await expect(start).toBeFocused();
  await start.fill("2028-02-28");
  await money.fill("-12,34");
  await expect(start).toHaveAttribute("aria-invalid", "false");
  await expect(money).toHaveAttribute("aria-invalid", "false");
  await shot("form-mobile");
  await page.getByRole("button", { name: "Crear ciclo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "marzo de 2028", exact: true }),
  ).toBeVisible();
  const first = page.url().split("/").at(-1)!;
  await expect(page.getByText("-12,34 €", { exact: true })).toBeVisible();
  await expect(page.locator(".global-header")).toContainText("No disponible");
  await expect(
    page.getByText("Funcionalidad no disponible.", { exact: true }),
  ).toBeVisible();
  await shot("detail-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("detail-desktop");
  await page.goto("/ciclos/nuevo");
  await start.fill("2028-02-29");
  await money.fill("0");
  await page.getByRole("button", { name: "Crear ciclo", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Ciclo duplicado");
  await expect(start).toHaveValue("2028-02-29");
  await shot("duplicate-desktop");
  await page.getByRole("button", { name: "Actualizar contexto" }).click();
  await start.fill("2028-03-01");
  await expect(page.getByText("29/02/2028", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Crear ciclo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "abril de 2028", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("0,00 €", { exact: true })).toBeVisible();
  await page.goto("/ciclos/nuevo");
  await expect(
    page.getByRole("button", { name: "Crear ciclo", exact: true }),
  ).toBeEnabled();
  await start.fill("2028-05-10");
  await money.fill("3,21");
  const concurrent = await page.evaluate(async () => {
    const session = await (await fetch("/api/auth/session")).json();
    const context = await (await fetch("/api/ciclos/contexto")).json();
    const response = await fetch("/api/ciclos", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": session.csrf,
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        inicio: "2028-04-10",
        saldoInicialComida: "1.00",
        contextRevision: context.revision,
      }),
    });
    return response.status;
  });
  expect(concurrent).toBe(201);
  await page.getByRole("button", { name: "Crear ciclo", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("campos se conservan");
  await expect(start).toHaveValue("2028-05-10");
  await expect(money).toHaveValue("3,21");
  await shot("conflict-desktop");
  await page.getByRole("button", { name: "Actualizar contexto" }).click();
  await page.getByRole("button", { name: "Crear ciclo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "junio de 2028", exact: true }),
  ).toBeVisible();
  await page.goto("/ciclos");
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(4);
  await expect(page.locator(".desktop-list")).toContainText("29/02/2028");
  await shot("list-desktop");
  await page
    .getByLabel("Estado temporal", { exact: true })
    .selectOption("Con fin temporal");
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(3);
  await page.getByLabel("Buscar por mes o Inicio").fill("marzo");
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(1);
  await expect(page.locator(".desktop-list")).toContainText("29/02/2028");
  await page.getByLabel("Buscar por mes o Inicio").fill("sin coincidencia");
  await expect(
    page.getByRole("heading", { name: "Sin coincidencias" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".mobile-list li")).toHaveCount(4);
  await shot("list-mobile");
  await page.route("**/api/ciclos?*", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Consulta de prueba no disponible." },
    }),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Consulta de prueba");
  await expect(page.getByRole("status")).toHaveText("Consulta no disponible");
  await shot("error-mobile");
  await page.unroute("**/api/ciclos?*");
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.locator(".mobile-list li")).toHaveCount(4);
  // Real database read delayed only to inspect loading, never a fabricated financial response.
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/ciclos?*", async (route) => {
    await gate;
    const response = await route.fetch();
    await route.fulfill({ response });
  });
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("Cargando ciclos…");
  await shot("loading-mobile");
  release();
  await expect(page.locator(".mobile-list li")).toHaveCount(4);
  await page.unroute("**/api/ciclos?*");
  await page.route("**/api/ciclos/contexto", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Contexto temporalmente no disponible." },
    }),
  );
  await page.reload();
  await expect(page.locator(".global-header")).toContainText(
    "Contexto no disponible",
  );
  await page.unroute("**/api/ciclos/contexto");
  await page
    .getByRole("button", { name: "Reintentar contexto", exact: true })
    .click();
  await expect(page.locator(".global-header")).toContainText("No disponible");
  await page.goto("/ciclos/nuevo");
  await start.fill("2028-06-01");
  await money.fill("7,50");
  await page.route("**/api/ciclos", async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.abort("failed"); // The real write succeeded but its response was lost.
  });
  await page.getByRole("button", { name: "Crear ciclo", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("No se pudo conectar");
  await expect(money).toHaveValue("7,50");
  await page.unroute("**/api/ciclos");
  await page.getByRole("button", { name: "Crear ciclo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "julio de 2028", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      async () => (await (await fetch("/api/ciclos")).json()).total,
    ),
  ).toBe(5);
  await page.goto("/ciclos/nuevo");
  await start.fill("2028-07-01");
  await money.fill("9,87");
  await page.route("**/api/ciclos", (route) =>
    route.fulfill({
      status: 401,
      json: { error: "Sesión caducada de prueba" },
    }),
  );
  await page.getByRole("button", { name: "Crear ciclo", exact: true }).click();
  await expect(
    page.getByText("La sesión ha caducado.", { exact: false }),
  ).toBeVisible();
  await expect(start).toHaveValue("2028-07-01");
  await expect(money).toHaveValue("9,87");
  await shot("session-draft-mobile");
  await page.unroute("**/api/ciclos");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(
    await page.evaluate(
      async () => (await (await fetch("/api/ciclos")).json()).total,
    ),
  ).toBe(5);
  await page.goto("/ciclos/999999");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.goto("/ciclos");
  return { first };
}
