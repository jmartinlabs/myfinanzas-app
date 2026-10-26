import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const origin = "http://127.0.0.1:3009";
test("E3.4 Revisión Comida: MFA, devolución explícita, vínculo, reposiciones, errores y 390/1440", async ({
  page,
  request,
}) => {
  const child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/revision-comida-server.ts"],
    { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  mkdirSync("artifacts/e3-4", { recursive: true });
  const shot = (name: string) =>
    page.screenshot({ path: `artifacts/e3-4/${name}.png`, fullPage: true });
  try {
    await expect
      .poll(
        async () => {
          try {
            return (await request.get(origin + "/api/health")).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(200);
    expect((await request.get(origin + "/api/revision-comida")).status()).toBe(
      401,
    );
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3009";
      await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
    });
    await page.goto("/revision-comida");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-revision-comida/bootstrap.txt", "utf8"));
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Clave ficticia revisión " + randomUUID());
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.locator(".secret")).toBeVisible();
    const secret = (await page.locator(".secret").textContent())!;
    await page
      .getByLabel("Código de la aplicación autenticadora")
      .fill(totp(secret).generate());
    await page
      .getByRole("button", { name: "Verificar código", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "He guardado los códigos · Continuar",
        exact: true,
      })
      .click();
    await page.goto("/revision-comida");
    await expect(
      page.getByRole("heading", { name: "Revisión Comida", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Cobertura histórica parcial", { exact: false })).toBeVisible();
    await expect(page.getByText("Referencia central:", { exact: false })).toContainText(
      "12/10/2026",
    );
    await expect(page.locator(".desktop-list").getByText("Devolución", { exact: true }).first()).toBeVisible();
    await expect(page.locator(".desktop-list").getByText("Sin evidencia", { exact: true }).first()).toBeVisible();
    await shot("revision-comida-listado-1440");

    await page.getByRole("combobox", { name: "Clasificación", exact: true }).selectOption("Ocio");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr")).toContainText("Cine ficticio");
    await page.getByRole("combobox", { name: "Clasificación", exact: true }).selectOption("");
    await page.getByRole("combobox", { name: "Vínculo", exact: true }).selectOption("Verificado");
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await page.getByRole("combobox", { name: "Vínculo", exact: true }).selectOption("");

    await page
      .locator(".desktop-list button", { hasText: "Supermercado ficticio" })
      .click();
    await expect(page.getByRole("heading", { name: /Operación 1/ })).toBeVisible();
    await expect(page.getByText("Devolución No", { exact: false })).toBeVisible();
    await expect(page.getByText("Sin relación acreditada", { exact: false })).toBeVisible();
    await expect(
      page.getByText("Agregado terminal · sin conciliación de importes", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(page.getByText("#7 · 12/10/2026", { exact: false })).toBeVisible();
    await shot("revision-comida-ficha-1440");

    await page.getByRole("button", { name: "Cambiar vínculo" }).click();
    await page.getByLabel("Movimiento elegible").selectOption("202");
    await page.getByLabel("Evidencia del vínculo").fill("evidencia UI ficticia");
    await page.getByLabel("Motivo", { exact: true }).fill("cambio de vínculo UI");
    await page.getByRole("button", { name: "Guardar vínculo" }).click();
    await expect(page.getByText("Movimiento #202", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Cambiar vínculo" }).click();
    await page.getByLabel("Motivo", { exact: true }).fill("desvínculo UI");
    await page.getByRole("button", { name: "Desvincular" }).click();
    await expect(page.getByText("Sin vínculo", { exact: false }).first()).toBeVisible();

    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByRole("combobox", { name: "Clasificación", exact: true }).selectOption("Otros");
    await page.getByLabel("Motivo de rectificación").fill("Reclasificación ficticia");
    await page.getByRole("button", { name: "Guardar rectificación" }).click();
    await expect(page.getByText("Otros", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Anular", exact: true }).click();
    await page.getByLabel("Motivo", { exact: true }).fill("Anulación ficticia");
    await page.getByRole("button", { name: "Confirmar anulación" }).click();
    await expect(page.getByText("Anulado", { exact: false })).toBeVisible();
    await page.goto("/revision-comida");
    await page.getByText("Más filtros", { exact: true }).click();
    await page.getByRole("combobox", { name: "Estado", exact: true }).selectOption("");
    await expect(page.locator(".desktop-list")).toContainText("Anulado");

    await page.goto("/revision-comida/nueva");
    await page.getByLabel("Fecha de operación").fill("2026-10-14");
    await page.getByLabel("Concepto", { exact: true }).fill("Compra nueva ficticia");
    await page.getByLabel("Importe EUR").fill("7.77");
    await page.getByLabel("Evidencia bancaria", { exact: true }).fill("banco ficticio 2");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Operación 8/ })).toBeVisible();
    await expect(page.getByText("7,77 €", { exact: false })).toBeVisible();

    await page.goto("/revision-comida/reposiciones");
    await expect(
      page.getByRole("heading", { name: "Reposiciones", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Sin asignación", { exact: false }).first()).toBeVisible();
    await expect(
      page.getByText("Cobertura de compensación: E3.5", { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Asignar (E3.5)" }).first(),
    ).toBeDisabled();
    await page.goto("/revision-comida/reposiciones/nueva");
    await page.getByLabel("Fecha de operación").fill("2026-10-13");
    await page.getByLabel("Concepto", { exact: true }).fill("Reposición nueva ficticia");
    await page.getByLabel("Importe EUR").fill("5.00");
    await page
      .getByLabel("Evidencia bancaria (obligatoria)")
      .fill("operación ficticia E-10");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Operación 9/ })).toBeVisible();

    // A legitimate coincident operation is warned, not rejected.
    await page.goto("/revision-comida/nueva");
    await page.getByLabel("Fecha de operación").fill("2026-10-04");
    await page.getByLabel("Concepto", { exact: true }).fill("Cine ficticio");
    await page.getByLabel("Importe EUR").fill("8.50");
    await page.getByRole("combobox", { name: "Clasificación", exact: true }).selectOption(
      "Ocio",
    );
    await page.getByLabel("Evidencia bancaria", { exact: true }).fill("banco ficticio 3");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(
      page.getByText("Operación guardada con coincidencia", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Ver operación" }).click();
    await expect(page.getByRole("heading", { name: /Operación 10/ })).toBeVisible();

    // Real 422 keeps the draft and associates the field error.
    await page.goto("/revision-comida/nueva");
    await page.getByLabel("Concepto", { exact: true }).fill("Borrador conservado");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Revisa los campos", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Concepto", { exact: true })).toHaveValue(
      "Borrador conservado",
    );

    // 409 presentation uses a real protected endpoint but an intercepted conflict.
    await page.goto("/revision-comida/2/editar");
    await page.getByLabel("Motivo de rectificación").fill("Conflicto ficticio");
    await page.route("**/api/revision-comida/2/rectificar", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          code: "REVISION_CONFLICT",
          error: "La operación ha cambiado. Revisa su ficha antes de continuar.",
        }),
      });
    });
    await page.getByRole("button", { name: "Guardar rectificación" }).click();
    await expect(page.getByText("La operación ha cambiado", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Motivo de rectificación")).toHaveValue(
      "Conflicto ficticio",
    );
    await page.unroute("**/api/revision-comida/2/rectificar");

    await page.goto("/revision-comida/99999");
    await expect(page.getByText("Operación no encontrada", { exact: false })).toBeVisible();

    // Empty coverage is not zero and is distinguished from no operations.
    await page.goto("/revision-comida");
    await page.getByText("Más filtros", { exact: true }).click();
    await page.getByLabel("Desde", { exact: true }).fill("2026-10-09");
    await page.getByLabel("Hasta", { exact: true }).fill("2026-10-09");
    await expect(page.getByRole("heading", { name: "Sin operaciones", exact: true })).toBeVisible();
    await page.getByLabel("Desde", { exact: true }).fill("2020-01-01");
    await page.getByLabel("Hasta", { exact: true }).fill("2020-01-02");
    await expect(page.getByText("Sin cobertura histórica", { exact: false }).first()).toBeVisible();

    // Mobile cards, keyboard use and no horizontal overflow.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/revision-comida");
    await expect(page.locator(".mobile-list")).toBeVisible();
    const search = page.getByLabel("Buscar ID o concepto");
    await search.focus();
    await page.keyboard.type("Compra nueva");
    await expect(page.locator(".mobile-list li")).toHaveCount(1);
    await expect(page.locator(".mobile-list li")).toContainText("Compra nueva ficticia");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await shot("revision-comida-listado-390");
    await page
      .locator(".mobile-list button", { hasText: "Compra nueva ficticia" })
      .click();
    await expect(page.getByRole("heading", { name: /Operación 8/ })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await expect(page.getByLabel("Fecha de operación")).toBeVisible();
    await page.getByRole("button", { name: "Guardar rectificación" }).click();
    await expect(page.getByText("Revisa los campos", { exact: false })).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Error del formulario" }),
    ).toBeFocused();
    await page.context().clearCookies();
    await page.goto("/revision-comida");
    await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
