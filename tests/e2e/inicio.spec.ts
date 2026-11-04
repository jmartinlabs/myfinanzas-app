import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * E4.6 — UI /inicio con MFA real y un servidor aislado.
 *
 * El servidor de test siembra la fixture ficticia C007 (ID numérico 7) y nunca
 * toca una base real. El escenario `zero` reutiliza el mismo fixture con
 * liquidez cero verificada para AC-07/29.
 */

const BASE_PORT = 3014;
const ZERO_PORT = 3015;
const BASE_DIR = ".local/e2e-inicio";
const ZERO_DIR = ".local/e2e-inicio-zero";
let base: ChildProcess | undefined;
let zero: ChildProcess | undefined;

async function waitForApi(request: APIRequestContext, port: number) {
  await expect
    .poll(
      async () => {
        try {
          return (await request.get(`http://127.0.0.1:${port}/api/health`))
            .status();
        } catch {
          return 0;
        }
      },
      { timeout: 20000 },
    )
    .toBe(200);
}

test.beforeAll(async ({ request }) => {
  base = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/inicio-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test" },
    },
  );
  zero = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/inicio-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test", E46_SCENARIO: "zero" },
    },
  );
  await waitForApi(request, BASE_PORT);
  await waitForApi(request, ZERO_PORT);
});

test.afterAll(() => {
  base?.kill();
  zero?.kill();
});

async function routeApi(page: Page, port: number) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(port);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
}

async function login(page: Page, dir: string) {
  await page.goto("/inicio");
  await page
    .getByLabel("Token de configuración local")
    .fill(readFileSync(`${dir}/bootstrap.txt`, "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(
    "Clave ficticia inicio " + randomUUID(),
  );
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
    .getByRole("button", { name: "He guardado los códigos · Continuar" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Inicio", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".inicio-context")).toBeVisible();
}

function luminance(rgb: string) {
  const values = rgb.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number);
  if (!values || values.length !== 3) return 0;
  const [r, g, b] = values.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test("AC-01/05/09/26: composición visible, cobertura, drill-down y responsive", async ({
  page,
}) => {
  mkdirSync("artifacts/e4-6", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await routeApi(page, BASE_PORT);
  await login(page, BASE_DIR);

  // Un solo h1 y contexto derivado de la referencia, no del reloj.
  await expect(page.locator("h1")).toHaveCount(1);
  const contexto = page.locator(".inicio-context");
  await expect(contexto).toContainText("Ciclo 7");
  await expect(contexto).toContainText("20/06/2026");
  await expect(contexto).toContainText("19/07/2026");
  await expect(contexto).toContainText("Referencia financiera");
  await expect(contexto).toContainText("disponible");

  // AC-01/05: la liquidez es Parcial, con subtotal, motivo y 3/4.
  const liquidezSection = page.locator(
    "section[aria-labelledby='inicio-liquidez']",
  );
  const liquidez = page.getByRole("article", { name: "Liquidez", exact: true });
  await expect(liquidez).toContainText("Subtotal conocido");
  await expect(liquidez).toContainText("3.456,40 €");
  await expect(liquidez).toContainText("PARCIAL");
  await expect(liquidez).toContainText("3/4");
  await expect(liquidez).toContainText("S005: Liquidez sin informar");
  await expect(liquidez).toContainText("E2.6 monthlyFlow");
  await expect(liquidez).toContainText("S001");
  await expect(liquidez).toContainText("Contexto: actual");
  await liquidezSection
    .getByText("Ver posiciones incluidas y excluidas")
    .click();
  await expect(liquidezSection).toContainText("Incluidas (3)");
  await expect(liquidezSection).toContainText("Excluidas (1)");
  await expect(liquidezSection).toContainText("Cuenta cotidiana demo");

  // Objetivo R6: coste completo, mínimo ND y meses cubiertos ND por liquidez parcial.
  const objetivo = page.getByRole("article", { name: "Objetivo R6", exact: true });
  await expect(objetivo).toContainText("1.500,00 €");
  await expect(objetivo).toContainText("COMPLETO");
  await expect(objetivo).toContainText("No configurados");
  await expect(objetivo).toContainText("NO DISPONIBLE");
  await expect(objetivo).toContainText(
    "Liquidez parcial: no se divide el subtotal conocido.",
  );
  await expect(objetivo).toContainText("Ejercicio 2026");
  await expect(objetivo).toContainText("Zona informativa");
  await expect(objetivo).not.toContainText("9.000,00 €");

  // Ciclo: subtotales parciales y operativo/margen No disponible, sin fabricar 350.
  const ciclo = page.locator("section[aria-labelledby='inicio-ciclo']");
  const ingresos = ciclo.getByRole("article", { name: "Ingresos", exact: true });
  await expect(ingresos).toContainText("2.250,00 €");
  await expect(ingresos).toContainText("Subtotal conocido");
  await expect(ingresos).toContainText("PARCIAL");
  const gasto = ciclo.getByRole("article", { name: "Gasto bruto", exact: true });
  await expect(gasto).toContainText("1.800,00 €");
  await expect(gasto).toContainText("PARCIAL");
  const extraordinaria = ciclo.getByRole("article", {
    name: "Amortización extraordinaria",
    exact: true,
  });
  await expect(extraordinaria).toContainText("100,00 €");
  await expect(extraordinaria).toContainText("PARCIAL");
  const operativo = ciclo.getByRole("article", {
    name: "Saldo operativo bruto observado",
    exact: true,
  });
  await expect(operativo).toContainText("NO DISPONIBLE");
  await expect(operativo).not.toContainText("350,00 €");
  const margen = ciclo.getByRole("article", {
    name: "Margen frente a nómina real",
    exact: true,
  });
  await expect(margen).toContainText("NO DISPONIBLE");
  await expect(margen).not.toContainText("100,00 €");
  const nomina = ciclo.getByRole("article", {
    name: "Nómina cobrada",
    exact: true,
  });
  await expect(nomina).toContainText("2.000,00 €");
  await expect(nomina).toContainText("Subtotal conocido");
  await expect(page.locator("body")).not.toContainText("350,00 €");

  // Saldos: conteos y ausencia de total.
  const saldos = page.locator("section[aria-labelledby='inicio-saldos']");
  await expect(saldos).toContainText("Sin total de Saldos");
  await expect(saldos).toContainText("cobertura 6/7");
  await saldos.getByText("Ver Saldos y su pertenencia").click();
  await expect(saldos.locator(".inicio-item-list li")).toHaveCount(7);

  // Inversión: agregado valorado y efectivo separados, sin total combinado.
  const inversion = page.locator("section[aria-labelledby='inicio-inversion']");
  await expect(inversion).toContainText("1.197,50 €");
  await expect(inversion).toContainText("Resultado");
  await expect(inversion).toContainText("Parcial 1/2");
  await expect(inversion).toContainText("1.456,40 €");
  await expect(inversion).toContainText("500,00 €");
  await expect(inversion).toContainText("Sin total combinado");
  await expect(inversion).not.toContainText("3.153,90 €");

  // Deuda: subtotal parcial 2/3, D005 no calculable y aparte fuera del total.
  const deuda = page.locator("section[aria-labelledby='inicio-deuda']");
  const deudaTotal = page.getByRole("article", {
    name: "Total de deuda no hipotecaria",
    exact: true,
  });
  await expect(deudaTotal).toContainText("1.020,00 €");
  await expect(deudaTotal).toContainText("PARCIAL");
  await expect(deudaTotal).toContainText("2/3");
  await expect(deuda).toContainText("D005");
  await expect(deuda).toContainText("no calculable");
  await expect(deuda).toContainText("Hipotecaria");
  await expect(deuda).toContainText("Sin informar");
  await expect(deuda).not.toContainText("2.436,40 €");

  // AC-01: cada tarjeta declara motor, IDs (cuando existen) y contexto.
  await expect(objetivo).toContainText("E2.4 annualEquivalent");
  await expect(saldos).toContainText("E1.1 listSaldos/getSaldo");
  await expect(inversion).toContainText("E4.3 e43Corte + E4.2 cashAt");
  await expect(deuda).toContainText("E4.4 listDeudasCompletas/getDeudaCompleta");
  const sourceLines = page.locator(".inicio-metric .inicio-source");
  expect(await sourceLines.count()).toBeGreaterThanOrEqual(10);
  for (const text of await sourceLines.allInnerTexts())
    expect(text).toContain("Fuente:");

  // Pendientes: sin total monetario.
  const pendientes = page.locator("section[aria-labelledby='inicio-pendientes']");
  await expect(pendientes).toContainText("Sin total monetario");
  await expect(pendientes).toContainText("E3.6 listPendientes");

  // AC-09: enlaces reales y sin importes en la URL.
  const hrefs = await page
    .locator(".inicio-page a")
    .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""));
  expect(hrefs).toContain("/saldos");
  expect(hrefs).toContain("/flujo-mensual?ciclo=7");
  expect(hrefs).toContain("/inversiones");
  expect(hrefs).toContain("/deudas");
  expect(hrefs).toContain("/deudas/D001");
  expect(hrefs).toContain("/pendientes");
  expect(hrefs).toContain("/saldos/S001");
  for (const href of hrefs)
    expect(href).not.toMatch(/[0-9]{2,}[.,][0-9]{2}|€/);

  await ciclo
    .getByRole("link", { name: "Ver flujo mensual", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/flujo-mensual\?ciclo=7$/);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Inicio", exact: true })).toBeVisible();
  await expect(page.locator(".inicio-context")).toContainText("Ciclo 7");

  await deuda.getByRole("link", { name: "Ver Deudas", exact: true }).click();
  await expect(page).toHaveURL(/\/deudas$/);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Inicio", exact: true })).toBeVisible();

  // AC-26: teclado/foco visible.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Tab");
  const outlined = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element) return false;
    const style = getComputedStyle(element);
    return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 1;
  });
  expect(outlined).toBe(true);

  const select = page.getByLabel("Tema visual");
  const expectNoOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const theme of ["light-s", "dark-s", "hybrid-s"] as const) {
    await select.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expectNoOverflow();
    await page.screenshot({
      path: `artifacts/e4-6/inicio-${theme}-1440.png`,
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["light-s", "dark-s", "hybrid-s"] as const) {
    await select.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expectNoOverflow();
    await page.screenshot({
      path: `artifacts/e4-6/inicio-${theme}-390.png`,
      fullPage: true,
    });
    const contrast = await page.locator(".inicio-estado").evaluateAll((nodes) => {
      const luminance = (rgb: string) => {
        const values = rgb.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number);
        if (!values || values.length !== 3) return 0;
        const [r, g, b] = values.map((value) => {
          const channel = value / 255;
          return channel <= 0.04045
            ? channel / 12.92
            : Math.pow((channel + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      return nodes.map((node) => {
        const element = node as HTMLElement;
        const style = getComputedStyle(element);
        const foreground = luminance(style.color);
        const background = luminance(style.backgroundColor);
        return (
          (Math.max(foreground, background) + 0.05) /
          (Math.min(foreground, background) + 0.05)
        );
      });
    });
    expect(Math.min(...contrast)).toBeGreaterThanOrEqual(4.5);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(errors).toEqual([]);
});

test("AC-07/29: cero verificado se muestra 0,00 y null sigue No disponible", async ({
  page,
}) => {
  mkdirSync("artifacts/e4-6", { recursive: true });
  await routeApi(page, ZERO_PORT);
  await login(page, ZERO_DIR);

  const liquidez = page.getByRole("article", { name: "Liquidez", exact: true });
  await expect(liquidez).toContainText("0,00 €");
  await expect(liquidez).toContainText("CERO VERIFICADO");
  await expect(liquidez).not.toContainText("Subtotal conocido");

  const objetivo = page.getByRole("article", { name: "Objetivo R6", exact: true });
  await expect(objetivo).toContainText("0,00 meses");
  await expect(objetivo).toContainText("CERO VERIFICADO");
  await expect(objetivo).toContainText("No configurados");
  await expect(objetivo).toContainText("NO DISPONIBLE");

  const operativo = page
    .locator("section[aria-labelledby='inicio-ciclo']")
    .getByRole("article", {
      name: "Saldo operativo bruto observado",
      exact: true,
    });
  await expect(operativo).toContainText("NO DISPONIBLE");
  await expect(operativo).not.toContainText("0,00 €");

  const deudaTotal = page.getByRole("article", {
    name: "Total de deuda no hipotecaria",
    exact: true,
  });
  await expect(deudaTotal).toContainText("PARCIAL");
  await expect(deudaTotal).toContainText("1.020,00 €");

  await page.screenshot({
    path: "artifacts/e4-6/inicio-cero-1440.png",
    fullPage: true,
  });
});

test("AC-27: acceso anónimo 401 y respuesta no-store", async ({ request }) => {
  const anonymous = await request.get(
    `http://127.0.0.1:${BASE_PORT}/api/resumen-inicio`,
  );
  expect(anonymous.status()).toBe(401);
  expect(anonymous.headers()["cache-control"]).toContain("no-store");

  const post = await request.post(
    `http://127.0.0.1:${BASE_PORT}/api/resumen-inicio`,
  );
  expect(post.status()).toBe(401);
});
