import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
export async function presupuestos(
  page: Page,
  debt: { id: string; bank: string },
) {
  mkdirSync("artifacts/e2-2", { recursive: true });
  const shot = async (name: string) => {
    await page.evaluate(() => scrollTo(0, 0));
    await page.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => r())),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/e2-2/${name}.png`,
      fullPage: true,
    });
  };
  const get = (p: string) =>
    page.evaluate(async (p) => (await fetch("/api" + p)).json(), p);
  const write = (p: string, body: Record<string, unknown>, method = "POST") =>
    page.evaluate(
      async ({ p, body, method }) => {
        const s = await (await fetch("/api/auth/session")).json();
        const r = await fetch("/api" + p, {
          method,
          headers: {
            "content-type": "application/json",
            "x-csrf-token": s.csrf,
            "idempotency-key": crypto.randomUUID(),
          },
          body: JSON.stringify(body),
        });
        return { status: r.status, data: await r.json() };
      },
      { p, body, method },
    );
  await page.goto("/presupuestos");
  await expect(
    page.getByRole("heading", { name: "Sin presupuestos que mostrar" }),
  ).toBeVisible();
  await shot("empty-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Nuevo presupuesto", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Nuevo presupuesto", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Guardar presupuesto", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByLabel("Nombre *", { exact: true })
    .fill("Presupuesto gasto ficticio");
  await page
    .getByLabel("Fuente ejecutado *", { exact: true })
    .selectOption("Gasto real");
  await page
    .getByLabel("Saldo destino *", { exact: true })
    .selectOption(debt.bank);
  await shot("form-mobile");
  await page
    .getByRole("button", { name: "Guardar presupuesto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Presupuesto gasto ficticio",
      exact: true,
    }),
  ).toBeVisible();
  const id = page.url().match(/PRE\d+/)![0];
  await shot("detail-mobile");
  const contribution = await write("/presupuestos", {
    nombre: "Aportación demo",
    fuente: "Aportación a saldo",
    destino: debt.bank,
  });
  expect(contribution.status).toBe(201);
  const dup = await write("/presupuestos", {
    nombre: "Otra aportación",
    fuente: "Aportación a saldo",
    destino: debt.bank,
  });
  expect(dup.status).toBe(422);
  expect(
    (
      await write("/presupuestos", {
        nombre: "PRESUPUESTO GASTO FICTICIO",
        fuente: "No aplica",
        destino: null,
      })
    ).status,
  ).toBe(422);
  const none = await write("/presupuestos", {
    nombre: "Sin ejecución demo",
    fuente: "No aplica",
    destino: null,
  });
  expect(none.status).toBe(201);
  expect(none.data.item.destino).toBeNull();
  expect(
    (
      await write("/presupuestos", {
        nombre: "No aplica inválido",
        fuente: "No aplica",
        destino: debt.bank,
      })
    ).status,
  ).toBe(422);
  const cat = (
    await write("/clasificacion/categorias", {
      nombre: "Categoría presupuesto demo",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    })
  ).data.item;
  const sub = (
    await write("/clasificacion/subcategorias", {
      nombre: "Sub presupuesto demo",
      padre: cat.id,
    })
  ).data.item;
  await page.goto("/clasificacion/partidas/nuevo");
  await page
    .getByLabel("Nombre *", { exact: true })
    .fill("Partida presupuesto demo");
  await page.getByLabel("Subcategoría *", { exact: true }).selectOption(sub.id);
  await page
    .getByLabel("Presupuesto opcional", { exact: true })
    .selectOption(id);
  await page
    .getByLabel("Deuda opcional", { exact: true })
    .selectOption(debt.id);
  await shot("partida-mobile");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Partida presupuesto demo",
      exact: true,
    }),
  ).toBeVisible();
  const partId = page.url().match(/PAR\d+/)![0];
  const p = (await get("/clasificacion/partidas/" + partId)).item;
  expect(p.presupuesto).toBe(id);
  expect(p.deuda).toBe(debt.id);
  // Used relation without facts is completely verifiable; reason/confirmation and stale context remain real.
  await page.goto("/presupuestos/" + id + "/editar");
  await page
    .getByLabel("Fuente ejecutado *", { exact: true })
    .selectOption("No aplica");
  await page
    .getByRole("button", { name: "Guardar / Revisar cambio", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("destino vacío");
  await page
    .getByRole("button", { name: "Vaciar destino expresamente", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Guardar / Revisar cambio", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Revisar cambio económico",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Motivo del cambio", { exact: true })
    .fill("Configuración demo sin hechos");
  await shot("impact-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("impact-desktop");
  await page
    .getByRole("button", { name: "Confirmar cambio", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Presupuesto gasto ficticio",
      exact: true,
    }),
  ).toBeVisible();
  expect((await get("/presupuestos/" + id)).item.destino).toBeNull();
  // Create a real debt quota via the existing preview/write pipeline; E2.3 must NOT be simulated.
  const body = {
    tipo: "Gasto",
    fecha: "2026-10-22",
    saldo: debt.bank,
    partida: partId,
    importe: "10",
    capital: "8",
    intereses: "2",
  };
  const plan = await write("/movimientos/impacto", body);
  expect(plan.status).toBe(200);
  const saved = await write("/movimientos", {
    ...body,
    fingerprint: plan.data.fingerprint,
    aceptarCoincidencia: true,
  });
  expect(saved.status).toBe(201);
  await page.goto("/presupuestos/" + id + "/editar");
  await page
    .getByLabel("Fuente ejecutado *", { exact: true })
    .selectOption("Gasto real");
  await page
    .getByLabel("Saldo destino *", { exact: true })
    .selectOption(debt.bank);
  await page
    .getByRole("button", { name: "Guardar / Revisar cambio", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Cambio bloqueado");
  await expect(
    page.getByRole("button", { name: "Confirmar cambio", exact: true }),
  ).toBeDisabled();
  await shot("blocked-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("blocked-mobile");
  await page
    .getByRole("button", { name: "Volver al borrador", exact: true })
    .click();
  await expect(
    page.getByLabel("Fuente ejecutado *", { exact: true }),
  ).toHaveValue("Gasto real");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Desactivar presupuesto", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar estado", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Partidas activas");
  await page.goto("/presupuestos");
  await expect(page.locator(".mobile-list li")).toHaveCount(3);
  await shot("list-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await shot("list-desktop");
  await page.getByLabel("Fuente", { exact: true }).selectOption("No aplica");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page
    .getByLabel("Buscar nombre o ID", { exact: true })
    .fill("inexistente");
  await expect(
    page.getByRole("heading", { name: "Sin presupuestos que mostrar" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  const contrast = await page
    .getByRole("button", { name: "Nuevo presupuesto", exact: true })
    .evaluate((el) => {
      const c = getComputedStyle(el);
      return { color: c.color, background: c.backgroundColor };
    });
  expect(contrast).toEqual({
    color: "rgb(36, 50, 14)",
    background: "rgb(141, 187, 46)",
  });
  await page.route("**/api/presupuestos?**", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Error transitorio de prueba" }),
    }),
  );
  await page.goto("/presupuestos");
  await expect(page.getByRole("alert")).toContainText("Error transitorio");
  await shot("error-desktop");
  await page.unroute("**/api/presupuestos?**");
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.route("**/api/presupuestos?**", async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await r.continue();
  });
  await page.goto("/presupuestos");
  await expect(
    page.getByRole("status").filter({ hasText: "Cargando Presupuestos" }),
  ).toBeVisible();
  await shot("loading-desktop");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.unroute("**/api/presupuestos?**");
  return { id, partida: partId, debt: debt.id };
}
