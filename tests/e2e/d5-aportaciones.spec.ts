import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

test("D5 real MFA: aportación, preview, states, historical review and responsive 390/1440", async ({
  page,
  request,
}) => {
  const child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/d5-server.ts"],
      { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
    ),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
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
      (await request.get("http://127.0.0.1:3010/api/compartidos/fichas"))
        .status(),
    ).toBe(401);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3010";
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
    await page.goto("/compartidos");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-d5/bootstrap.txt", "utf8"));
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Contraseña ficticia D5 " + randomUUID());
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.locator(".secret")).toBeVisible();
    const secret = (await page.locator(".secret").textContent())!;
    await page
      .getByLabel("Código de la aplicación autenticadora")
      .fill(totp(secret).generate());
    await page.getByRole("button", { name: "Verificar código", exact: true }).click();
    await page
      .getByRole("button", {
        name: "He guardado los códigos · Continuar",
        exact: true,
      })
      .click();
    await page.goto("/compartidos");
    await expect(
      page.getByRole("heading", { name: "Gastos compartidos" }),
    ).toBeVisible();
    mkdirSync("artifacts/e3-2-d5", { recursive: true });
    const shots = async (name: string) => {
      for (const [width, height] of [
        [1440, 1000],
        [390, 844],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => scrollTo(0, 0));
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
        await page.evaluate(
          () =>
            new Promise<void>((r) =>
              requestAnimationFrame(() => requestAnimationFrame(() => r())),
            ),
        );
        await page.screenshot({
          animations: "disabled",
          path: `artifacts/e3-2-d5/${name}-${width}.png`,
          fullPage: true,
        });
      }
    };
    await page.getByRole("link", { name: "REF001", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Piso D5 2026", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Reparto parcial").first()).toBeVisible();
    const metrics = page.locator(".shared-metrics");
    await expect(metrics).toContainText("450,00 €");
    await expect(metrics).toContainText("0,00 €");
    await expect(
      page.getByRole("button", { name: "Registrar aportación" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Aportaciones históricas" }),
    ).toBeVisible();
    await expect(page.getByText("Bea pendiente 150,00 €")).toBeVisible();
    await shots("d5-ficha-inicial");

    await page.getByRole("button", { name: "Registrar aportación" }).click();
    await expect(
      page.getByRole("heading", { name: "Registrar aportación" }),
    ).toBeVisible();
    await expect(page.getByLabel("Caso (bloqueado)")).toHaveValue(
      /REF\d+ · Piso D5 2026/,
    );
    const participants = page.getByLabel("Quién paga");
    await expect(participants.locator("option")).toHaveCount(2);
    await expect(participants).not.toContainText("Yo");
    await expect(
      page.getByText("Es una Transferencia desde Exterior", { exact: false }),
    ).toBeVisible();
    await shots("d5-formulario");

    await page.getByLabel("Quién paga").selectOption({ label: "Álex · Tercero" });
    // 422 keeps the user's draft and marks the evidence field.
    await page.getByLabel("Importe (EUR)").fill("300");
    await page.getByLabel("Evidencia").fill("corta");
    await page.getByRole("button", { name: "Ver impacto" }).click();
    await expect(
      page.getByText("La evidencia debe ser un texto identificable", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Importe (EUR)")).toHaveValue("300");
    await page.getByLabel("Evidencia").fill("Extracto bancario ficticio D5 2026");

    // 409 keeps the draft and asks to review a new preview.
    await page.route("**/api/movimientos/impacto", async (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "El contexto ha cambiado. Revisa otra vista previa.",
        }),
      }),
    );
    await page.getByRole("button", { name: "Ver impacto" }).click();
    await expect(
      page.getByText("El contexto ha cambiado. Revisa otra vista previa."),
    ).toBeVisible();
    await expect(page.getByLabel("Evidencia")).toHaveValue(
      "Extracto bancario ficticio D5 2026",
    );
    await page.unroute("**/api/movimientos/impacto");
    await page.getByRole("button", { name: "Ver impacto" }).click();
    await expect(
      page.getByRole("heading", { name: "Antes y después de la aportación" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Después", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".shared-impact").getByText("Recuperado", { exact: true }),
    ).toHaveCount(2);
    await expect(page.getByText("300,00 €").first()).toBeVisible();
    await expect(page.getByText("150,00 €").first()).toBeVisible();
    await expect(
      page.getByText("Efecto banco: +importe en el Destino", { exact: false }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.activeElement?.textContent?.includes(
              "Antes y después",
            ) ?? false,
        ),
      )
      .toBe(true);
    await shots("d5-preview");

    await page.getByRole("button", { name: "Revisar aportación" }).click();
    await expect(
      page.getByRole("heading", { name: "Aportación registrada" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Volver a la ficha" }).click();
    await expect(page.getByText("Recuperado")).toBeVisible();
    const after = page.locator(".shared-metrics");
    await expect(after).toContainText("300,00 €");
    await expect(after).toContainText("150,00 €");
    await expect(page.getByText("Bea pendiente 150,00 €")).toBeVisible();
    await expect(page.getByText("Álex exceso 150,00 €")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Aportaciones de terceros" }),
    ).toBeVisible();
    await expect(page.getByText("Extracto bancario ficticio D5 2026")).toBeVisible();
    await shots("d5-ficha-acreditada");

    // Historical review: only an existing eligible Movement is accredited.
    await page.getByRole("button", { name: "Aportaciones históricas" }).click();
    await expect(
      page.getByRole("heading", { name: "Aportaciones históricas" }),
    ).toBeVisible();
    await expect(page.getByLabel("Movimiento existente")).toContainText("900");
    await page.getByLabel("Quién paga").selectOption({ label: "Bea · Tercero" });
    await page.getByLabel("Evidencia").fill("Documento bancario histórico D5 2026");
    await shots("d5-historico-formulario");
    await page.getByRole("button", { name: "Ver impacto" }).click();
    await expect(
      page.getByRole("heading", { name: "Revisión de acreditación histórica" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "se acredita sin reescribir importe, fecha, Origen, Destino ni Referencia",
        { exact: false },
      ),
    ).toBeVisible();
    await shots("d5-historico-preview");
    await page.getByRole("button", { name: "Confirmar acreditación" }).click();
    await expect(
      page.getByText("Aportación histórica acreditada", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "‹ Volver" }).click();
    await expect(page.getByText("Documento bancario histórico D5 2026")).toBeVisible();
    await expect(page.getByText("Álex exceso 150,00 €")).toBeVisible();
    await shots("d5-ficha-historico");

    // Session expiry preserves the form draft in memory.
    await page.getByRole("button", { name: "Registrar aportación" }).click();
    await page.getByLabel("Importe (EUR)").fill("25");
    await page.getByLabel("Evidencia").fill("Borrador ficticio antes de caducar");
    await page.route("**/api/movimientos/impacto", async (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Inicia sesión para continuar." }),
      }),
    );
    await page.getByRole("button", { name: "Ver impacto" }).click();
    await expect(page.getByText("La sesión ha caducado", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Evidencia")).toHaveValue(
      "Borrador ficticio antes de caducar",
    );
    await page.unroute("**/api/movimientos/impacto");

    // The common Transfer form is covered by the options contract in the API
    // tests: movementOptions never exposes S000 and the form filters Exterior.
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
