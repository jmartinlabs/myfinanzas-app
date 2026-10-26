import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

test("E3.3 vehículos: listado, ficha, cobertura, alta, edición, conversión e integridad 390/1440", async ({
  page,
  request,
}) => {
  const child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/vehiculos-server.ts"],
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
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3009";
      await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
    });
    await page.goto("/vehiculos");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-vehiculos/bootstrap.txt", "utf8"));
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Contraseña ficticia vehículos " + randomUUID());
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.locator(".secret")).toBeVisible();
    const secret = (await page.locator(".secret").textContent())!;
    await page
      .getByLabel("Código de la aplicación autenticadora")
      .fill(totp(secret).generate());
    await page.getByRole("button", { name: "Verificar código", exact: true }).click();
    await page
      .getByRole("button", { name: "He guardado los códigos · Continuar", exact: true })
      .click();
    await page.getByRole("link", { name: /Vehículos/ }).click();
    await expect(
      page.getByRole("heading", { name: "Vehículos", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".vehicle-table tbody tr")).toHaveCount(4);
    await expect(page.getByText("Coche principal", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("1.240,00 €", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Parcial", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("No informada", { exact: true }).first()).toBeVisible();
    mkdirSync("artifacts/e3-3", { recursive: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({ path: "artifacts/e3-3/vehiculos-list-1440.png", fullPage: true });
    const primary = page.getByRole("button", { name: "Nuevo vehículo" });
    await expect(primary).toHaveCSS("color", "rgb(36, 50, 14)");
    await expect(primary).toHaveCSS("background-color", "rgb(141, 187, 46)");

    await page.getByRole("link", { name: "Coche principal", exact: true }).first().click();
    await expect(
      page.getByRole("heading", { name: "Coche principal", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Gasto año y cobertura")).toContainText("1.240,00 €");
    await expect(page.getByLabel("Gasto año y cobertura")).toContainText("Parcial");
    await expect(page.getByLabel("Gasto año y cobertura")).toContainText("50,00 €");
    await expect(page.getByLabel("Gastos del año")).toContainText("Gastos del año (3)");
    await page.getByLabel("Ejercicio del gasto del vehículo").selectOption("2025");
    await expect(page.getByLabel("Gasto año y cobertura")).toContainText(
      "Cobertura anual: Completa",
    );
    await expect(page.getByLabel("Gasto año y cobertura")).toContainText(
      "Sí, al corte",
    );
    await page.getByLabel("Ejercicio del gasto del vehículo").selectOption("2027");
    await expect(page.getByLabel("Gasto año y cobertura")).toContainText("Futura");
    await expect(page.getByLabel("Gasto año y cobertura")).toContainText(
      /Total anual\s*No disponible/,
    );
    // Respuesta antigua: la selección vigente no se sustituye por una respuesta lenta.
    let delayed = false;
    await page.route("**/api/vehiculos/REF001?ejercicio=2027", async (route) => {
      if (!delayed) {
        delayed = true;
        await new Promise((r) => setTimeout(r, 500));
      }
      await route.fallback();
    });
    await page.getByLabel("Ejercicio del gasto del vehículo").selectOption("2026");
    await page.getByLabel("Ejercicio del gasto del vehículo").selectOption("2027");
    await page.getByLabel("Ejercicio del gasto del vehículo").selectOption("2026");
    await expect(page.getByLabel("Gasto año y cobertura")).toContainText("1.240,00 €");
    await page.unroute("**/api/vehiculos/REF001?ejercicio=2027");
    await expect(page.locator('input[type="number"]')).toHaveCount(0);
    await page.screenshot({ path: "artifacts/e3-3/vehiculos-detail-1440.png", fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/vehiculos");
    await expect(page.locator(".vehicle-table")).toBeHidden();
    await expect(page.locator(".vehicle-cards li")).toHaveCount(4);
    await expect(page.locator(".vehicle-cards").getByText("Coche principal", { exact: true })).toBeVisible();
    await page.screenshot({ path: "artifacts/e3-3/vehiculos-list-390.png", fullPage: true });

    // Error transitorio y reintento sin perder la identidad.
    let failedOnce = false;
    await page.route("**/api/vehiculos/REF001?ejercicio=2026", async (route) => {
      if (!failedOnce) {
        failedOnce = true;
        await route.abort();
        return;
      }
      await route.fallback();
    });
    await page.goto("/vehiculos/REF001");
    await expect(page.getByRole("alert")).toContainText("No se pudo conectar");
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(
      page.getByRole("heading", { name: "Coche principal", exact: true }),
    ).toBeVisible();
    await page.unroute("**/api/vehiculos/REF001?ejercicio=2026");
    await page.goto("/vehiculos");

    // Alta con dos dimensiones de duplicado: aviso y confirmación independiente.
    await page.getByRole("button", { name: "Nuevo vehículo", exact: true }).click();
    await page.getByLabel("Nombre del vehículo *").fill("Coche principal");
    await page.getByLabel("Matrícula del vehículo").fill("1234 ABC");
    await page.getByRole("button", { name: "Crear vehículo", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Duplicados confirmables" })).toBeVisible();
    await expect(page.getByText("Nombre coincide")).toBeVisible();
    await expect(page.getByText("Matrícula coincide")).toBeVisible();
    await page.screenshot({ path: "artifacts/e3-3/vehiculos-duplicado-390.png", fullPage: true });
    await page.getByRole("button", { name: "Confirmar nombre", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar matrícula", exact: true }).click();
    await page.getByRole("button", { name: "Crear vehículo", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Coche principal", exact: true })).toBeVisible();
    await expect(page.getByText("Ficha 1:1 correcta.")).toBeVisible();

    // Corrección de matrícula contra otra ficha: aviso server-side y confirmación.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/vehiculos/REF001");
    await page.getByRole("button", { name: "Editar ficha", exact: true }).click();
    await page.getByLabel("Matrícula del vehículo").fill("5678 DEF");
    await page.getByRole("button", { name: "Confirmar y guardar", exact: true }).click();
    await expect(page.getByText("Matrícula coincide")).toBeVisible();
    await page.getByRole("button", { name: "Confirmar matrícula", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar y guardar", exact: true }).click();
    await expect(page.getByText("5678 DEF", { exact: true })).toBeVisible();
    await page.screenshot({ path: "artifacts/e3-3/vehiculos-edicion-1440.png", fullPage: true });

    // Conversión explícita desde Referencias y bloqueo de una REF usada.
    await page.goto("/referencias/REF004");
    await page.getByRole("button", { name: "Convertir a Vehículo", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Convertir a Vehículo" })).toBeVisible();
    await page.getByLabel("Matrícula del vehículo").fill("9012 JKL");
    await page.getByLabel("Próxima ITV").fill("2025-01-10");
    await page.getByLabel("Confirmo la conversión explícita").check();
    await page.getByRole("button", { name: "Revisar y convertir", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Coche secundario", exact: true })).toBeVisible();
    await expect(page.getByText("9012 JKL", { exact: true })).toBeVisible();
    await page.screenshot({
      path: "artifacts/e3-3/vehiculos-conversion-1440.png",
      fullPage: true,
    });
    await page.goto("/referencias/REF005");
    await expect(
      page.getByText(/La Referencia tiene hechos y E1.5 protege su Tipo/),
    ).toBeVisible();

    await page.goto("/vehiculos/integridad");
    await expect(
      page.getByRole("heading", { name: "Integridad de vehículos" }),
    ).toBeVisible();
    await expect(page.getByText("Furgoneta sin ficha", { exact: false })).toBeVisible();
    await expect(page.getByText("Ficha de Viaje", { exact: false })).toBeVisible();
    await expect(page.getByText("REF_TIPO_INCORRECTO", { exact: false })).toBeVisible();
    await page.screenshot({ path: "artifacts/e3-3/vehiculos-integridad-1440.png", fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
