import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const comidaOrigin = "http://127.0.0.1:3020";
const comidaState = ".local/e2e-comida-dprima";
const dprimaOrigin = "http://127.0.0.1:3021";
const dprimaState = ".local/e2e-dprima";

async function login(page: any, request: any, origin: string, state: string) {
  await expect
    .poll(
      async () => {
        try {
          return (await request.get(origin + "/api/health")).status();
        } catch {
          return 0;
        }
      },
      { timeout: 20000 },
    )
    .toBe(200);
  expect((await request.get(origin + "/api/comida?estado=")).status()).toBe(401);
  await page.route("**/api/**", async (route: any) => {
    const url = new URL(route.request().url());
    url.port = new URL(origin).port;
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto("/comida");
  await page
    .getByLabel("Token de configuración local")
    .fill(readFileSync(state + "/bootstrap.txt", "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia E2E " + randomUUID());
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
}

function startServer(port: number, state: string) {
  return spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/e2e-comida-dprima-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        E2E_PORT: String(port),
        E2E_STATE: state,
      },
    },
  );
}

test("COMIDA-UNICO-01: métricas, clasificación, atribución, errores y persistencia 1440/390", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  mkdirSync("artifacts/e2e-comida", { recursive: true });
  const child = startServer(3020, comidaState);
    await login(page, request, comidaOrigin, comidaState);
    const shot = (name: string) =>
      page.screenshot({ path: `artifacts/e2e-comida/${name}.png`, fullPage: true });
    await page.goto("/comida");
    await expect(
      page.getByRole("heading", { name: "Revisión Comida", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Individual", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Comida bruto", { exact: true })).toBeVisible();
    await expect(page.getByText("Devoluciones de comida", { exact: true })).toBeVisible();
    await expect(page.getByText("Compensable neto", { exact: true })).toBeVisible();
    await expect(page.getByText("Cobertura:", { exact: false })).toBeVisible();
    await expect(
      page.locator(".metric", { hasText: "Comida bruto" }).locator("strong"),
    ).toHaveText("50,00 €");
    await expect(
      page
        .locator(".metric", { hasText: "Devoluciones compensables" })
        .locator("strong"),
    ).toHaveText("15,00 €");
    await expect(
      page.locator(".metric", { hasText: "Comida neto" }).locator("strong"),
    ).toHaveText("50,00 €");
    await expect(
      page.locator(".metric", { hasText: "Compensable neto" }).locator("strong"),
    ).toHaveText("35,00 €");
    await expect(
      page.locator(".metric", { hasText: "Falta por reponer" }),
    ).toContainText("No disponible");
    await expect(page.getByText("Cobertura:", { exact: false })).toContainText(
      "Parcial",
    );
    const comidaTable1440 = page.getByRole("region", {
      name: "Tabla de operaciones individuales",
    });
    await expect(comidaTable1440).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    expect(
      await comidaTable1440.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await expect(
      page.locator("tbody tr", { hasText: "Compra comida E2E" }),
    ).toHaveCount(1);
    await shot("comida-1440");

    // Clasificación persistente y sin duplicar el hecho.
    const foodRow = page.locator("tbody tr", { hasText: "Compra comida E2E" });
    await foodRow.getByRole("button", { name: "Clasificar" }).click();
    await page.getByLabel("Etiqueta").selectOption("Otros");
    await page.getByLabel("Motivo (si ya existía)").fill("Reclasificación E2E");
    await page.getByRole("button", { name: "Guardar metadatos" }).click();
    await expect(
      page.locator("tbody tr", { hasText: "Compra comida E2E" }),
    ).toContainText("Otros");
    await page.reload();
    await expect(
      page.locator("tbody tr", { hasText: "Compra comida E2E" }),
    ).toContainText("Otros");
    await expect(
      page.locator("tbody tr", { hasText: "Compra comida E2E" }),
    ).toHaveCount(1);

    // Compra del Saldo sin metadatos visible para clasificar.
    await expect(
      page.locator("tbody tr", { hasText: "Compra sin clasificar E2E" }),
    ).toContainText("Sin clasificar");

    // Atribución real y persistente.
    const refundRow = page.locator("tbody tr", { hasText: "Devolución ocio E2E" });
    await expect(refundRow).toContainText("Verificado");
    await refundRow.getByRole("button", { name: "Atribuir" }).click();
    await page.getByLabel("Estado del vínculo").selectOption("Revisar");
    await page.getByLabel("Motivo (si ya existía)").fill("Revisión E2E");
    await page.getByRole("button", { name: "Guardar atribución" }).click();
    await expect(
      page.locator("tbody tr", { hasText: "Devolución ocio E2E" }),
    ).toContainText("Revisar");
    await page.reload();
    await expect(
      page.locator("tbody tr", { hasText: "Devolución ocio E2E" }),
    ).toContainText("Revisar");

    // 422 real: compra inexistente conserva el formulario y muestra causa.
    await page
      .locator("tbody tr", { hasText: "Devolución ocio E2E" })
      .getByRole("button", { name: "Atribuir" })
      .click();
    await page.getByLabel("Compra (ID de Movimiento)").fill("4");
    await page.getByLabel("Estado del vínculo").selectOption("Verificado");
    await page.getByLabel("Evidencia de relación").fill("Evidencia E2E");
    await page.getByLabel("Motivo (si ya existía)").fill("Falló E2E");
    await page.getByRole("button", { name: "Guardar atribución" }).click();
    await expect(page.getByRole("alert")).toContainText("compra no es elegible");
    await expect(page.getByLabel("Compra (ID de Movimiento)")).toHaveValue("4");
    await page.getByRole("button", { name: "Cancelar" }).click();

    // Navegación al histórico legado.
    await page.getByRole("button", { name: "Ver histórico auxiliar legado" }).click();
    await expect(
      page.getByRole("heading", { name: "Revisión Comida", exact: true }),
    ).toBeVisible();

    // 390: la tabla conserva el contenido en una región desplazable.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/comida");
    await expect(page.getByText("Comida bruto", { exact: true })).toBeVisible();
    await expect(
      page.locator("tbody tr", { hasText: "Compra comida E2E" }),
    ).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    const comidaTable390 = page.getByRole("region", {
      name: "Tabla de operaciones individuales",
    });
    await expect(comidaTable390).toBeVisible();
    expect(
      await comidaTable390.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      ),
    ).toBe(true);
    await comidaTable390.focus();
    expect(
      await page.evaluate(() => document.activeElement?.className),
    ).toContain("table-scroll");
    expect(
      await comidaTable390.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
        return element.scrollLeft;
      }),
    ).toBeGreaterThan(0);
    await expect(
      page.locator("tbody tr", { hasText: "Compra comida E2E" }),
    ).toBeVisible();
    await shot("comida-390");
    expect(errors).toEqual([]);
  child.kill("SIGKILL");
});

test("D′: Partidas, previsión, apertura, mensual, mapping y errores 1440/390", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  mkdirSync("artifacts/e2e-dprima", { recursive: true });
  const child = startServer(3021, dprimaState);
    await login(page, request, dprimaOrigin, dprimaState);
    const shot = (name: string) =>
      page.screenshot({ path: `artifacts/e2e-dprima/${name}.png`, fullPage: true });
    await page.goto("/dprima");
    await expect(
      page.getByRole("heading", { name: "Planificación simplificada", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Maestro de Partidas", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Raíz aportación E2E", { exact: false }).first(),
    ).toBeVisible();
    await shot("dprima-1440");

    // Abrir la planificación de aportación y editar una línea.
    await page
      .locator("tbody tr", { hasText: "2026-11" })
      .getByRole("button", { name: "Abrir" })
      .click();
    await expect(page.getByRole("heading", { name: /DP/ })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    expect(
      await page
        .getByRole("region", { name: "Tabla de líneas previstas" })
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    const importe = page.locator('input[aria-label^="Importe LP"]').first();
    await importe.fill("320");
    await page.getByLabel("Motivo de las líneas").fill("Ajuste E2E");
    await page.getByRole("button", { name: "Guardar líneas" }).click();
    await expect(page.getByText("Operación registrada", { exact: false })).toBeVisible();
    await page.reload();
    await page
      .locator("tbody tr", { hasText: "2026-11" })
      .getByRole("button", { name: "Abrir" })
      .click();
    await expect(page.locator('input[aria-label^="Importe LP"]').first()).toHaveValue(
      "320.00",
    );

    // Apertura E1/E2: ciclo real y propuesta sin crear transferencia.
    await page
      .getByLabel("Ciclo real")
      .selectOption({ label: "20/10/2026 · financiado 2026-11" });
    await page.getByRole("button", { name: "Revisar apertura" }).click();
    await expect(page.getByText("Total previsto T", { exact: true })).toBeVisible();
    await expect(
      page.locator(".metric", { hasText: "Total previsto T" }).locator("dd"),
    ).toContainText("320,00 €");
    await expect(
      page.locator(".metric", { hasText: "S al corte" }).locator("dd"),
    ).toContainText("100,00 €");
    await expect(
      page.locator(".metric", { hasText: "Sugerida" }).locator("dd"),
    ).toContainText("110,00 €");
    const before = await page.evaluate(async () => {
      const r = await fetch("/api/movimientos?page=1", { credentials: "same-origin" });
      return (await r.json()).total;
    });
    await page.getByRole("button", { name: "Confirmar propuesta" }).click();
    await expect(page.getByText("Operación registrada", { exact: false })).toBeVisible();
    const after = await page.evaluate(async () => {
      const r = await fetch("/api/movimientos?page=1", { credentials: "same-origin" });
      return (await r.json()).total;
    });
    expect(after).toBe(before);

    // Mensual por raíz: gasto y aportación separados.
    await page.getByLabel("Ciclo del plan mensual").selectOption({ index: 1 });
    const monthlySection = page.getByRole("region", {
      name: "Plan Mensual D′",
    });
    const monthly = monthlySection
      .locator("tbody tr", { hasText: "Raíz aportación E2E" })
      .last();
    await expect(monthly).toContainText("Aportación a saldo");
    await expect(
      page.getByRole("columnheader", { name: "Ejecutado", exact: true }),
    ).toBeVisible();
    await monthly.locator('input[aria-label^="delMes "]').fill("60");
    await monthly.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Operación registrada", { exact: false })).toBeVisible();
    await page.reload();
    await page
      .getByLabel("Ciclo del plan mensual")
      .selectOption({ label: "20/10/2026 → abierto" });
    const monthlyReloaded = monthlySection
      .locator("tbody tr", { hasText: "Raíz aportación E2E" })
      .last();
    await expect(monthlyReloaded.locator('input[aria-label^="delMes "]')).toHaveValue(
      "60.00",
    );
    await expect(
      page.getByText("Gasto y aportación son magnitudes distintas", {
        exact: false,
      }),
    ).toBeVisible();
    const realMonthly = monthlySection
      .locator("tbody tr", { hasText: "Raíz gasto E2E" })
      .last();
    await expect(realMonthly).toContainText("Gasto real");
    await expect(realMonthly).not.toContainText("Aportación a saldo");
    await expect(monthlyReloaded).toContainText("Aportación a saldo");

    // 409 real: rango solapado del mismo padre.
    const overlapStatus = await page.evaluate(async () => {
      const session = await (
        await fetch("/api/auth/session", { credentials: "same-origin" })
      ).json();
      const response = await fetch("/api/dprima/planificaciones", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": session.csrf,
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          padre: "PAR003",
          saldo: "S001",
          mesInicial: "2026-10-01",
          mesFinal: "2026-10-01",
          saldoInicial: "100",
          saldoEvidencia: "Evidencia E2E",
          copiarHijas: false,
        }),
      });
      return { status: response.status, body: await response.json() };
    });
    expect(overlapStatus.status).toBe(409);
    expect(JSON.stringify(overlapStatus.body)).toContain("solapa");

    // Mapping diagnóstico: confirmación explícita disponible.
    await expect(page.getByText("Mapping Presupuestos → Partidas")).toBeVisible();
    await expect(page.getByText("PRE900", { exact: false }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Confirmar PRE900/ }),
    ).toBeVisible();

    // 390: la tabla de líneas conserva el contenido en una región desplazable.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dprima");
    await expect(page.getByText("Maestro de Partidas", { exact: true })).toBeVisible();
    await page
      .locator("tbody tr", { hasText: "2026-11" })
      .getByRole("button", { name: "Abrir" })
      .click();
    await expect(page.getByText("Revisión de apertura", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    const dprimaLines = page.getByRole("region", {
      name: "Tabla de líneas previstas",
    });
    await expect(dprimaLines).toBeVisible();
    expect(
      await dprimaLines.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      ),
    ).toBe(true);
    await dprimaLines.focus();
    expect(
      await page.evaluate(() => document.activeElement?.className),
    ).toContain("table-scroll");
    expect(
      await dprimaLines.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
        return element.scrollLeft;
      }),
    ).toBeGreaterThan(0);
    await expect(
      page.locator('input[aria-label^="Importe LP"]').first(),
    ).toBeEditable();
    await shot("dprima-390");
    expect(errors).toEqual([]);
  child.kill("SIGKILL");
});
