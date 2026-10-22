import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
export async function cycleOperationsJourney(page: Page) {
  mkdirSync("artifacts/e2-1", { recursive: true });
  const get = (path: string) =>
    page.evaluate(
      async (path) => await (await fetch("/api" + path)).json(),
      path,
    );
  const post = (path: string, body: Record<string, unknown>) =>
    page.evaluate(
      async ({ path, body }) => {
        const session = await (await fetch("/api/auth/session")).json(),
          r = await fetch("/api" + path, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-csrf-token": session.csrf,
              "idempotency-key": crypto.randomUUID(),
            },
            body: JSON.stringify(body),
          });
        return { status: r.status, body: await r.json() };
      },
      { path, body },
    );
  const shot = async (name: string) => {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/e2-1/${name}.png`,
      fullPage: true,
    });
  };
  const canonical = (items: any[]) =>
    items.map(
      ({
        id,
        fecha,
        tipo,
        importe,
        origen,
        destino,
        partida,
        referencia,
        concepto,
        nota,
        anulado,
        revision,
        capital,
        intereses,
      }) => ({
        id,
        fecha,
        tipo,
        importe,
        origen,
        destino,
        partida,
        referencia,
        concepto,
        nota,
        anulado,
        revision,
        capital,
        intereses,
      }),
    );
  const beforeMovements = (await get("/movimientos?estado=")).movimientos,
    original = canonical(beforeMovements),
    audits = await Promise.all(
      beforeMovements.map(
        async (m: any) => (await get("/movimientos/" + m.id)).auditoria,
      ),
    );
  const all = (await get("/ciclos")).ciclos,
    target = all.find((c: any) => c.inicio === "2026-10-25"),
    next = all.find((c: any) => c.inicio === "2027-01-01");
  expect(target).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/ciclos/" + target.id);
  await expect(
    page.getByText("No disponible · Revisión Comida pendiente", {
      exact: true,
    }),
  ).toBeVisible();
  await shot("cycle-detail-desktop");
  await page
    .getByRole("button", { name: "Rectificar ciclo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Revisar impacto", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("motivo");
  await page.getByLabel("Inicio ciclo *", { exact: true }).fill("2026-10-02");
  await page
    .getByLabel("Saldo inicial comida (€) *", { exact: true })
    .fill("-5,00");
  await page
    .getByLabel("Motivo *", { exact: true })
    .fill("Rectificación ficticia de periodo");
  await shot("correction-form-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("correction-form-mobile");
  await page.getByLabel("Motivo *", { exact: true }).focus();
  await expect(page.getByLabel("Motivo *", { exact: true })).toBeFocused();
  const endpoint = "**/api/ciclos/" + target.id + "/rectificar/preview*";
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Revisión temporalmente no disponible" },
    }),
  );
  await page
    .getByRole("button", { name: "Revisar impacto", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("temporalmente");
  await expect(page.getByLabel("Inicio ciclo *", { exact: true })).toHaveValue(
    "2026-10-02",
  );
  await shot("preview-error-mobile");
  await page.unroute(endpoint);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(endpoint, async (route) => {
    await gate;
    const url = new URL(route.request().url());
    url.port = "3003";
    await route.fulfill({
      response: await route.fetch({ url: url.toString() }),
    });
  });
  await page
    .getByRole("button", { name: "Revisar impacto", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Revisando…", exact: true }),
  ).toBeDisabled();
  await shot("preview-loading-mobile");
  release();
  await expect(
    page.getByRole("region", { name: "Revisión de impacto de Ciclos" }),
  ).toBeVisible();
  await page.unroute(endpoint);
  await expect(page.locator(".cycle-facts li")).not.toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Revisión de impacto de Ciclos" }),
  ).toBeFocused();
  await shot("impact-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("impact-desktop");
  await page
    .getByRole("button", { name: "Volver al borrador", exact: true })
    .click();
  await expect(page.getByLabel("Motivo *", { exact: true })).toHaveValue(
    "Rectificación ficticia de periodo",
  );
  await page
    .getByRole("button", { name: "Revisar impacto", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirmar rectificación", exact: true }),
  ).toBeVisible();
  const confirm = page.getByRole("button", {
    name: "Confirmar rectificación",
    exact: true,
  });
  await page
    .getByRole("button", { name: "Volver al borrador", exact: true })
    .focus();
  await page.keyboard.press("Tab");
  await expect(confirm).toBeFocused();
  await expect(confirm).toHaveCSS("background-color", "rgb(141, 187, 46)");
  await expect(confirm).toHaveCSS("color", "rgb(36, 50, 14)");
  const context = await get("/ciclos/contexto");
  expect(
    (
      await post("/ciclos", {
        inicio: "2027-02-01",
        saldoInicialComida: "0",
        contextRevision: context.revision,
      })
    ).status,
  ).toBe(201);
  await page
    .getByRole("button", { name: "Confirmar rectificación", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Revisa nuevamente");
  await expect(page.getByLabel("Motivo *", { exact: true })).toHaveValue(
    "Rectificación ficticia de periodo",
  );
  await page
    .getByRole("button", { name: "Revisar impacto", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar rectificación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "noviembre de 2026", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".cycle-history")).toContainText(
    "Rectificación ficticia de periodo",
  );
  await expect(page.locator(".cycle-history")).toContainText("02/10/2026");
  await shot("history-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("history-mobile");
  expect((await get("/ciclos/" + next.id)).ciclo.saldoInicialComida).toBe(
    next.saldoInicialComida,
  );
  const after = (await get("/movimientos?estado=")).movimientos;
  expect(canonical(after)).toEqual(original);
  expect(
    await Promise.all(
      after.map(
        async (m: any) => (await get("/movimientos/" + m.id)).auditoria,
      ),
    ),
  ).toEqual(audits);
  expect(
    after.some(
      (m: any, i: number) =>
        JSON.stringify(m.ciclo) !== JSON.stringify(beforeMovements[i].ciclo),
    ),
  ).toBe(true);
  await page.goto("/ciclos");
  await page
    .getByRole("button", { name: "Registrar ciclo omitido", exact: true })
    .click();
  await page.getByLabel("Inicio ciclo *", { exact: true }).fill("2026-08-01");
  await page
    .getByLabel("Saldo inicial comida (€) *", { exact: true })
    .fill("0");
  await page
    .getByLabel("Motivo *", { exact: true })
    .fill("Ciclo omitido ficticio");
  await page
    .getByRole("button", { name: "Revisar impacto", exact: true })
    .click();
  await expect(
    page.getByText("No hay hechos que cambien de ciclo.", { exact: true }),
  ).toBeVisible();
  await shot("omitted-preview-mobile");
  const priorTotal = (await get("/ciclos")).total;
  await page.route("**/api/ciclos/omitido", async (route) => {
    const url = new URL(route.request().url());
    url.port = "3003";
    const response = await route.fetch({ url: url.toString() });
    expect(response.status()).toBe(201);
    await route.abort("failed");
  });
  await page
    .getByRole("button", { name: "Confirmar ciclo omitido", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("No se pudo conectar");
  await expect(page.getByLabel("Motivo *", { exact: true })).toHaveValue(
    "Ciclo omitido ficticio",
  );
  await page.unroute("**/api/ciclos/omitido");
  await page
    .getByRole("button", { name: "Confirmar ciclo omitido", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "septiembre de 2026", exact: true }),
  ).toBeVisible();
  const omittedId = page.url().split("/").at(-1)!;
  expect((await get("/ciclos")).total).toBe(priorTotal + 1);
  expect((await get("/ciclos/" + omittedId + "/historial")).items).toHaveLength(
    1,
  );
  await page.goto("/ciclos");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("list-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("list-mobile");
  return {
    correctedId: target.id,
    omittedId,
    history: (await get("/ciclos/" + target.id + "/historial")).items,
  };
}
