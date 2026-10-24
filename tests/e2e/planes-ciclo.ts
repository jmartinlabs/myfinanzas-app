import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
/** Real authenticated continuation, no parallel fixture app or synthetic closure provider. */
export async function cyclePlanJourney(page: Page, budgetId: string) {
  mkdirSync("artifacts/e2-3", { recursive: true });
  const get = (path: string) =>
    page.evaluate(async (path) => (await fetch("/api" + path)).json(), path);
  const catalog = await get("/ciclos");
  let selected = "";
  for (const c of catalog.ciclos) {
    const p = await get("/planes-ciclo/" + c.id);
    if (
      p.items.some((i: any) => i.presupuesto.id === budgetId && i.sinPlanificar)
    ) {
      selected = c.id;
      break;
    }
  }
  expect(selected).not.toBe("");
  const catalogEndpoint = /\/api\/ciclos\?estado=&page=\d+$/;
  await page.route(catalogEndpoint, (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Catálogo temporalmente no disponible" },
    }),
  );
  await page.goto("/planes-ciclo");
  await expect(page.getByRole("alert")).toContainText(
    "Catálogo temporalmente no disponible",
  );
  await page.unroute(catalogEndpoint);
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await page
    .getByLabel("Ciclo del plan", { exact: true })
    .selectOption(selected);
  await expect(
    page.getByRole("heading", { name: "Sin plan", exact: true }),
  ).toBeVisible();
  const card = page
    .locator(".plan-card:visible, .plan-row:visible")
    .filter({ hasText: budgetId });
  await expect(card).toContainText("Sin planificar");
  const before = await get("/planes-ciclo/" + selected),
    real = before.items.find(
      (i: any) => i.presupuesto.id === budgetId,
    ).ejecutado;
  await page.getByLabel("Añadir Presupuesto al plan").selectOption(budgetId);
  await page.getByLabel("Esencial", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Revisar cambios del plan", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Revisión del plan" }),
  ).toBeFocused();
  await page
    .getByLabel("Motivo del cambio de plan")
    .fill("Captura ficticia sin importe del mes");
  await page
    .getByRole("button", { name: "Confirmar cambios del plan", exact: true })
    .click();
  await expect(page.getByText("Plan guardado.", { exact: true })).toBeVisible();
  await expect(card).toContainText("Sin importe del mes · Línea existente");
  await expect(card).not.toContainText("Sin planificar");
  const saved = await get("/planes-ciclo/" + selected);
  const item = saved.items.find((i: any) => i.presupuesto.id === budgetId);
  expect(item.ejecutado).toBe(real);
  expect(item.aTransferir).toBeNull();
  expect(item.pendiente).toBeNull();
  expect(item.estado).toBeNull();
  expect(item.linea.esencial).toBe("0.00");
  await page.reload();
  await page
    .getByLabel("Ciclo del plan", { exact: true })
    .selectOption(selected);
  await expect(card).toContainText("Sin importe del mes");
  const shot = async (name: string) => {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if ((page.viewportSize()?.width ?? 0) > 760) {
      expect(
        await page
          .locator(".plan-table th")
          .evaluateAll((headers) =>
            headers.every(
              (header) =>
                header.clientWidth >= 50 &&
                header.scrollWidth <= header.clientWidth + 1,
            ),
          ),
      ).toBe(true);
    }
    if (name.startsWith("review")) {
      const contrast = await page
        .locator("button.primary:visible")
        .first()
        .evaluate((button) => {
          const style = getComputedStyle(button);
          const luminance = (color: string) => {
            const channels = color
              .match(/[\d.]+/g)!
              .slice(0, 3)
              .map(Number)
              .map((value) => {
                const channel = value / 255;
                return channel <= 0.04045
                  ? channel / 12.92
                  : ((channel + 0.055) / 1.055) ** 2.4;
              });
            return (
              channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
            );
          };
          const foreground = luminance(style.color),
            background = luminance(style.backgroundColor);
          return (
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05)
          );
        });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
    await page.screenshot({
      path: `artifacts/e2-3/${name}.png`,
      fullPage: true,
    });
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("null-month-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("null-month-mobile");
  await card.getByRole("button", { name: /Ver ejecución/ }).click();
  await expect(
    page.getByRole("region", { name: "Detalle de ejecución" }),
  ).toContainText("hechos elegibles");
  await shot("execution-mobile");
  await page
    .getByRole("button", { name: "Cerrar detalle", exact: true })
    .click();
  await card.getByRole("button", { name: /Editar/ }).click();
  await page.getByLabel("Del mes", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Revisar cambios del plan", exact: true })
    .click();
  await page
    .getByLabel("Motivo del cambio de plan")
    .fill("Cero explícito y ejecución positiva");
  await shot("review-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("review-desktop");
  await page
    .getByRole("button", { name: "Confirmar cambios del plan", exact: true })
    .click();
  await expect(card).toContainText("Excedido");
  const zero = await get("/planes-ciclo/" + selected);
  expect(
    zero.items.find((i: any) => i.presupuesto.id === budgetId).aTransferir,
  ).toBe("0.00");
  await page
    .getByRole("button", { name: "Copiar desde otro ciclo", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Base", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Esencial", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Del mes", exact: true }),
  ).not.toBeChecked();
  const origin = catalog.ciclos.find((c: any) => c.id !== selected);
  await page
    .getByLabel("Ciclo origen", { exact: true })
    .selectOption(origin.id);
  await page
    .getByRole("button", { name: "Revisar cambios del plan", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Revisión del plan" }),
  ).toContainText("Sin cambios");
  await page
    .getByRole("button", { name: "Cancelar edición", exact: true })
    .click();
  // Source plan entered explicitly, then effective copy into empty destination field.
  await page
    .getByLabel("Ciclo del plan", { exact: true })
    .selectOption(origin.id);
  await page.getByLabel("Añadir Presupuesto al plan").selectOption(budgetId);
  await page.getByLabel("Base", { exact: true }).fill("3");
  await page.getByLabel("Esencial", { exact: true }).fill("4");
  await page.getByLabel("Del mes", { exact: true }).fill("5");
  await page
    .getByRole("button", { name: "Revisar cambios del plan", exact: true })
    .click();
  await page
    .getByLabel("Motivo del cambio de plan")
    .fill("Origen de copia explícito");
  await page
    .getByRole("button", { name: "Confirmar cambios del plan", exact: true })
    .click();
  await expect(page.getByText("Plan guardado.", { exact: true })).toBeVisible();
  await page
    .getByLabel("Ciclo del plan", { exact: true })
    .selectOption(selected);
  await expect(card).toContainText("Excedido");
  await page
    .getByRole("button", { name: "Copiar desde otro ciclo", exact: true })
    .click();
  await page
    .getByLabel("Ciclo origen", { exact: true })
    .selectOption(origin.id);
  await page
    .getByRole("button", { name: "Revisar cambios del plan", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Revisión del plan" }),
  ).toContainText("ya informado");
  await page
    .getByLabel("Motivo del cambio de plan")
    .fill("Copiar Base conservando ceros");
  await page
    .getByRole("button", { name: "Confirmar cambios del plan", exact: true })
    .click();
  await expect(page.getByText("Plan guardado.", { exact: true })).toBeVisible();
  const copied = (await get("/planes-ciclo/" + selected)).items.find(
    (i: any) => i.presupuesto.id === budgetId,
  );
  expect(copied.linea).toMatchObject({
    base: "3.00",
    esencial: "0.00",
    delMes: "0.00",
  });
  const noApply = (await get("/planes-ciclo/" + selected)).items.find(
    (i: any) =>
      i.presupuesto.fuente === "No aplica" &&
      i.presupuesto.estado === "Activo" &&
      !i.linea,
  );
  expect(noApply).toBeTruthy();
  {
    await page
      .getByLabel("Añadir Presupuesto al plan")
      .selectOption(noApply.presupuesto.id);
    await page.getByLabel("Del mes", { exact: true }).fill("0");
    await page
      .getByRole("button", { name: "Revisar cambios del plan", exact: true })
      .click();
    await page
      .getByLabel("Motivo del cambio de plan")
      .fill("No comparable con cero explícito");
    await page
      .getByRole("button", { name: "Confirmar cambios del plan", exact: true })
      .click();
    await expect(
      page
        .locator(".plan-card:visible, .plan-row:visible")
        .filter({ hasText: noApply.presupuesto.id }),
    ).toContainText("No comparable");
  }
  // Server conflict keeps input and requires explicit context refresh/review.
  await card.getByRole("button", { name: /Editar/ }).click();
  await page.getByLabel("Base", { exact: true }).fill("12");
  await page.route("**/api/planes-ciclo/*/impacto", (route) =>
    route.fulfill({
      status: 409,
      json: { error: "Contexto modificado de prueba" },
    }),
  );
  await page
    .getByRole("button", { name: "Revisar cambios del plan", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Contexto modificado");
  await expect(page.getByLabel("Base", { exact: true })).toHaveValue("12");
  await page.unroute("**/api/planes-ciclo/*/impacto");
  await page
    .getByRole("button", { name: "Actualizar contexto", exact: true })
    .click();
  await expect(page.getByLabel("Base", { exact: true })).toHaveValue("12");
  await page
    .getByRole("button", { name: "Revisar cambios del plan", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Revisión del plan" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancelar edición", exact: true })
    .click();
  // An old manual refresh must not replace the newly selected cycle's plan.
  const planEndpoint = `**/api/planes-ciclo/${selected}`;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(planEndpoint, async (route) => {
    await gate;
    await route.fallback();
  });
  const oldResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/planes-ciclo/${selected}`) &&
      response.request().method() === "GET",
  );
  await page
    .getByRole("button", { name: "Actualizar contexto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cargando plan");
  await page
    .getByLabel("Ciclo del plan", { exact: true })
    .selectOption(origin.id);
  await expect(card).toContainText("5,00");
  release();
  await oldResponse;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(card).toContainText("5,00");
  await expect(page.getByLabel("Ciclo del plan", { exact: true })).toHaveValue(
    origin.id,
  );
  await page.unroute(planEndpoint);
  await page
    .getByLabel("Ciclo del plan", { exact: true })
    .selectOption(selected);
  await expect(card).toContainText("Excedido");
  return { cycle: selected, budget: budgetId };
}
