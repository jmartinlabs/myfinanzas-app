import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
test("E3.2 base B real MFA, ficha, participants, impact, statuses and no D5 form 390/1440", async ({
  page,
  request,
}) => {
  const child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/compartido-server.ts"],
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
              await request.get("http://127.0.0.1:3009/api/health")
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(200);
    expect(
      (await request.get("http://127.0.0.1:3009/api/compartidos/fichas"))
        .status(),
    ).toBe(401);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3009";
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
    await page.goto("/compartidos");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-compartidos/bootstrap.txt", "utf8"));
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Contraseña ficticia compartidos " + randomUUID());
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
    await page.goto("/compartidos");
    await expect(page.getByRole("heading", { name: "Gastos compartidos" })).toBeVisible();
    await expect(page.getByText("Piso 2026", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Solo mío", { exact: true }).first()).toBeVisible();
    mkdirSync("artifacts/e3-2", { recursive: true });
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
          path: `artifacts/e3-2/${name}-${width}.png`,
          fullPage: true,
        });
      }
    };
    await shots("compartidos-listado");
    await page
      .locator("a:visible", { hasText: "Piso 2026" })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Piso 2026", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Reparto parcial").first()).toBeVisible();
    const metrics = page.locator(".shared-metrics");
    await expect(metrics).toContainText("450,00 €");
    await expect(metrics).toContainText("150,00 €");
    await expect(metrics).toContainText("No disponible");
    await expect(metrics).toContainText("No disponible — D5 no habilitado");
    await expect(page.getByText("Cobertura de aportaciones no disponible")).toBeVisible();
    await expect(page.getByRole("button", { name: /Aportación/ })).toHaveCount(0);
    await expect(page.getByText("Quién paga")).toHaveCount(0);
    await expect(
      page.getByText("Movimiento interno con la Referencia del caso", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("no acredita Recuperado", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Registrar Gasto CAT013" }),
    ).toBeVisible();
    await shots("compartidos-ficha");
    // Focus/contrast checks over real rendered controls.
    const contrast = await page.evaluate(() => {
      const el = [...document.querySelectorAll("button.primary")].find(
        (b) => (b as HTMLElement).offsetParent !== null,
      ) as HTMLElement;
      const rgb = (value: string) =>
        value
          .match(/\d+/g)!
          .slice(0, 3)
          .map(Number)
          .map((v) => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
      const lum = (c: number[]) =>
        0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      const style = getComputedStyle(el);
      const a = lum(rgb(style.color)),
        b = lum(rgb(style.backgroundColor));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    // A real 409 from the API must keep the draft and show a safe error.
    await page.setViewportSize({ width: 1440, height: 1000 });
    const beaRow = page.getByRole("row", { name: /Bea/ });
    await beaRow.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByLabel("Partes enteras").fill("2");
    await page.route(
      "**/api/compartidos/fichas/*/participantes/*/impacto",
      async (route) =>
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: "El participante ha cambiado. Revisa su ficha actual.",
          }),
        }),
    );
    await page.getByRole("button", { name: "Ver impacto" }).click();
    await expect(
      page.getByText("El participante ha cambiado. Revisa su ficha actual."),
    ).toBeVisible();
    await expect(page.getByLabel("Partes enteras")).toHaveValue("2");
    await page.unroute("**/api/compartidos/fichas/*/participantes/*/impacto");
    await page.getByRole("button", { name: "Ver impacto" }).click();
    await expect(
      page.getByRole("heading", { name: "Impacto del cambio de reparto" }),
    ).toBeVisible();
    await expect(page.getByText("225,00 €").first()).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.activeElement?.textContent?.includes(
              "Impacto del cambio de reparto",
            ) ?? false,
        ),
      )
      .toBe(true);
    await shots("compartidos-impacto");
    await page.getByLabel("Motivo (obligatorio)").fill("Cambio ficticio de reparto");
    await page.getByRole("button", { name: "Aplicar cambio" }).click();
    await expect(page.getByRole("heading", { name: "Piso 2026" })).toBeVisible();
    await expect(page.getByRole("row", { name: /Bea/ })).toContainText("225,00 €");
    await expect(
      page.getByText("rectificar participante", { exact: false }),
    ).toBeVisible();
    // 422 keeps the form values and shows the field message.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await beaRow.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByLabel("Partes enteras").fill("-1");
    await page.getByRole("button", { name: "Ver impacto" }).click();
    await expect(page.getByText("Partes enteras entre 0 y 1000000.")).toBeVisible();
    await expect(page.getByLabel("Partes enteras")).toHaveValue("-1");
    await page.getByRole("button", { name: "Cancelar" }).first().click();
    // 100% Titular closes with Neto = Bruto = Coste propio.
    await page.getByRole("link", { name: "Compartidos", exact: true }).click();
    await page.getByRole("link", { name: "REF002", exact: true }).click();
    await expect(page.getByText("Cerrado").first()).toBeVisible();
    const soloMetrics = page.locator(".shared-metrics");
    await expect(soloMetrics).toContainText("50,00 €");
    await expect(soloMetrics).toContainText("No aplica");
    await expect(
      page.getByText("Sin pendientes ni excesos de terceros", { exact: false }),
    ).toBeVisible();
    await shots("compartidos-cerrado");
    // Loading and error/retry over the real read model.
    await page.route("**/api/compartidos/fichas/REF002", async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "No se pudo cargar el caso ficticio." }),
      });
    });
    await page.goto("/compartidos/REF002");
    await expect(page.getByRole("status")).toContainText(
      "Cargando ficha compartida",
    );
    await expect(
      page.getByText("No se pudo cargar el caso ficticio."),
    ).toBeVisible();
    await page.unroute("**/api/compartidos/fichas/REF002");
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByText("Cerrado").first()).toBeVisible();
    // Logical baja with mandatory motive and preserved history.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/compartidos/REF001");
    const beaAfter = page.getByRole("row", { name: /Bea/ });
    await beaAfter.getByRole("button", { name: "Baja", exact: true }).click();
    await page.getByLabel("Motivo (obligatorio)").fill("Baja ficticia de QA");
    await page
      .getByRole("button", { name: "Confirmar baja lógica" })
      .click();
    await expect(page.getByRole("row", { name: /Bea/ })).toContainText("Baja");
    await expect(page.getByText("baja participante", { exact: false })).toBeVisible();
    // A legally admitted long name stays contained in the 1440 participant table.
    const longName = "A".repeat(120);
    await page.getByRole("button", { name: "Añadir participante" }).click();
    await page.getByLabel("Nombre", { exact: true }).fill(longName);
    await page.locator(".shared-form").getByRole("button", {
      name: "Añadir participante",
    }).click();
    await expect(page.getByText(longName, { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      .toBe(true);
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
