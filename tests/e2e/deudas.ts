import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
export async function deudas(page: Page) {
  mkdirSync("artifacts/e1-6", { recursive: true });
  const shot = async (name: string) => {
    await page.evaluate(() => scrollTo(0, 0));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/e1-6/" + name + ".png",
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
  await page.goto("/deudas");
  await expect(
    page.getByRole("heading", { name: "Sin deudas que mostrar" }),
  ).toBeVisible();
  await shot("empty-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("empty-mobile");
  await page.getByRole("button", { name: "Nueva deuda", exact: true }).click();
  await page
    .getByRole("button", { name: "Guardar deuda", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByLabel("Nombre de Deuda *", { exact: true })
    .fill("Préstamo ficticio navegador");
  await page.getByLabel("Inicio control *", { exact: true }).fill("2026-10-01");
  await page.getByLabel("Capital apertura EUR *", { exact: true }).fill("1000");
  await shot("debt-form-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("debt-form-desktop");
  await page
    .getByRole("button", { name: "Guardar deuda", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Préstamo ficticio navegador",
      exact: true,
    }),
  ).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  expect(id).toMatch(/^D\d+$/);
  await shot("debt-detail-desktop");
  const cat = (
    await write("/clasificacion/categorias", {
      nombre: "Deuda navegador",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    })
  ).data.item;
  const sub = (
    await write("/clasificacion/subcategorias", {
      nombre: "Cuotas navegador",
      padre: cat.id,
    })
  ).data.item;
  await page.goto("/clasificacion/partidas/nuevo");
  await page
    .getByLabel("Nombre *", { exact: true })
    .fill("Cuota de préstamo navegador");
  await page.getByLabel("Subcategoría *", { exact: true }).selectOption(sub.id);
  await page.getByLabel("Deuda opcional", { exact: true }).selectOption(id);
  await page
    .getByRole("button", { name: "Crear Partida", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Cuota de préstamo navegador",
      exact: true,
    }),
  ).toBeVisible();
  const p = page.url().split("/").at(-1)!;
  const bank = (
    await write("/saldos", {
      nombre: "Banco deuda navegador",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500",
      fechaApertura: "2026-10-20",
      permiteSalidaExterior: true,
    })
  ).data.saldo;
  await page.goto("/movimientos/nuevo");
  await page.getByLabel("Tipo *", { exact: true }).selectOption("Gasto");
  await page
    .getByLabel("Fecha económica *", { exact: true })
    .fill("2026-10-01");
  await page.getByLabel("Importe (€) *", { exact: true }).fill("100");
  await page
    .getByLabel("Saldo origen *", { exact: true })
    .selectOption(bank.id);
  await page.getByLabel("Partida *", { exact: true }).selectOption(p);
  await page
    .getByLabel("Concepto", { exact: true })
    .fill("Cuota deuda ficticia");
  await page.getByLabel("Capital amortizado EUR *", { exact: true }).fill("80");
  await page.getByLabel("Intereses EUR *", { exact: true }).fill("19");
  await page
    .getByRole("button", { name: "Registrar movimiento", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Intereses EUR *", { exact: true }).fill("20");
  await shot("quota-form-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("quota-form-mobile");
  await page
    .getByRole("button", { name: "Registrar movimiento", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Vista previa de impacto" }),
  ).toBeVisible();
  await expect(page.getByText(/Capital D/)).toContainText("920");
  await shot("quota-preview-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("quota-preview-desktop");
  await page
    .getByRole("button", { name: "Confirmar pago de deuda", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cuota deuda ficticia", exact: true }),
  ).toBeVisible();
  await page.locator("summary").click();
  await expect(
    page
      .locator(".movement-audit")
      .getByText("Capital amortizado", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".movement-audit").getByText("Intereses", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".movement-audit")).toContainText("Después: 80,00");
  await expect(page.locator(".movement-audit")).toContainText("Después: 20,00");
  const quota = page.url().split("/").at(-1)!;
  expect((await get("/deudas/" + id)).item.capitalPendiente).toBe("920.00");
  expect((await get("/saldos/" + bank.id)).saldo.posicion.importe).toBe(
    "400.00",
  );
  await page.goto("/movimientos/nuevo");
  await page
    .getByLabel("Tipo *", { exact: true })
    .selectOption("Amortización deuda");
  await page
    .getByLabel("Fecha económica *", { exact: true })
    .fill("2026-10-02");
  await page.getByLabel("Importe (€) *", { exact: true }).fill("200");
  await page
    .getByLabel("Saldo origen *", { exact: true })
    .selectOption(bank.id);
  await page.getByLabel("Partida *", { exact: true }).selectOption(p);
  await page
    .getByLabel("Concepto", { exact: true })
    .fill("Extraordinaria ficticia");
  await expect(
    page.getByLabel("Capital amortizado EUR *", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Crear deuda conservando borrador",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Nueva deuda", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByLabel("Concepto", { exact: true })).toHaveValue(
    "Extraordinaria ficticia",
  );
  await expect(page.getByLabel("Importe (€) *", { exact: true })).toHaveValue(
    "200",
  );
  await page
    .getByRole("button", { name: "Registrar movimiento", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Vista previa de impacto" }),
  ).toBeVisible();
  await expect(page.getByText(/Capital D/)).toContainText("720");
  await page
    .getByRole("button", { name: "Confirmar pago de deuda", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Extraordinaria ficticia", exact: true }),
  ).toBeVisible();
  expect((await get("/deudas/" + id)).item.capitalPendiente).toBe("720.00");
  expect((await get("/saldos/" + bank.id)).saldo.posicion.importe).toBe(
    "200.00",
  );
  await page.goto("/deudas/" + id);
  await shot("capital-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("capital-mobile");
  await page.getByRole("button", { name: "Editar deuda", exact: true }).click();
  await expect(
    page.getByLabel("Inicio control *", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Capital apertura EUR *", { exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Consultar movimientos de esta deuda",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Deuda", { exact: true })).toHaveValue(id);
  await expect(page.locator(".mobile-list li")).toHaveCount(2);
  await shot("debt-movements-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await shot("debt-movements-desktop");
  const contrast = await page
    .locator("button.primary")
    .first()
    .evaluate((el) => {
      const c = getComputedStyle(el);
      return { color: c.color, background: c.backgroundColor };
    });
  expect(contrast).toEqual({
    color: "rgb(36, 50, 14)",
    background: "rgb(141, 187, 46)",
  });
  await page.goto("/deudas");
  await shot("debt-list-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("debt-list-mobile");
  await page.getByRole("button", { name: "Nueva deuda", exact: true }).focus();
  await expect(
    page.getByRole("button", { name: "Nueva deuda", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Nueva deuda", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  return { id, bank: bank.id, quota };
}
