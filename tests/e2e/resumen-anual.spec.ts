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
 * E4.7 — UI /resumen-anual con MFA real y un servidor aislado.
 *
 * El servidor de test siembra las fixtures ficticias C007/C008. Nunca toca una
 * base real. Las capturas van a `artifacts/e4-7/` (ignorado por Git).
 */

const BASE_PORT = 3018;
const EMPTY_PORT = 3019;
const ERROR_PORT = 3020;
const FILTERS_PORT = 3021;
const BASE_DIR = ".local/e2e-e47";
const EMPTY_DIR = ".local/e2e-e47-empty";
const ERROR_DIR = ".local/e2e-e47-error";
const FILTERS_DIR = ".local/e2e-e47-filters";
let base: ChildProcess | undefined;
let empty: ChildProcess | undefined;
let error: ChildProcess | undefined;
let filters: ChildProcess | undefined;

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
    ["apps/api/test-support/resumen-anual-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test" },
    },
  );
  empty = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/resumen-anual-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test", E47_SCENARIO: "empty" },
    },
  );
  error = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/resumen-anual-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        E47_PORT: String(ERROR_PORT),
        E47_DIR: ERROR_DIR,
      },
    },
  );
  filters = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/resumen-anual-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        E47_PORT: String(FILTERS_PORT),
        E47_DIR: FILTERS_DIR,
      },
    },
  );
  await waitForApi(request, BASE_PORT);
  await waitForApi(request, EMPTY_PORT);
  await waitForApi(request, ERROR_PORT);
  await waitForApi(request, FILTERS_PORT);
});

test.afterAll(() => {
  base?.kill();
  empty?.kill();
  error?.kill();
  filters?.kill();
});

async function routeApi(page: Page, port: number) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(port);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
}

async function login(page: Page, dir: string) {
  const password = "Clave ficticia resumen " + randomUUID();
  await page.goto("/inicio");
  await page
    .getByLabel("Token de configuración local")
    .fill(readFileSync(`${dir}/bootstrap.txt`, "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
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
  return { secret, password };
}

async function resetScroll(page: Page) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

async function expectNoOverflow(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function expectContrast(page: Page) {
  const ratios = await page.locator(".e47-page").evaluate((root) => {
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
    const nodes = Array.from(
      root.querySelectorAll(
        "h1,h2,h3,h4,p,dt,dd,li,a,small,th,td,.e47-amount-wrap strong",
      ),
    );
    const result: number[] = [];
    for (const node of nodes) {
      const element = node as HTMLElement;
      const style = getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        !element.offsetParent
      )
        continue;
      const text = (element.textContent ?? "").trim();
      if (!text) continue;
      let background = "rgba(0, 0, 0, 0)";
      let parent: HTMLElement | null = element;
      while (parent) {
        const candidate = getComputedStyle(parent).backgroundColor;
        if (candidate !== "rgba(0, 0, 0, 0)" && candidate !== "transparent") {
          background = candidate;
          break;
        }
        parent = parent.parentElement;
      }
      const foreground = luminance(style.color);
      const behind = luminance(background);
      if (foreground === 0 || behind === 0) continue;
      result.push(
        (Math.max(foreground, behind) + 0.05) /
          (Math.min(foreground, behind) + 0.05),
      );
    }
    return result;
  });
  expect(ratios.length).toBeGreaterThan(0);
  expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4.5);
}

test("AC02/05/06/18/21/22/27: carriles, estados, enlaces, 1440/390 y tres temas", async ({
  page,
}) => {
  mkdirSync("artifacts/e4-7", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await routeApi(page, BASE_PORT);
  await login(page, BASE_DIR);
  await page.goto("/resumen-anual?ejercicio=2026");

  await expect(
    page.getByRole("heading", { name: "Resumen anual", exact: true }),
  ).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator(".e47-live")).toContainText(
    "Cálculo vivo, sin foto",
  );
  await expect(page.locator(".e47-context")).toContainText("2026");
  await expect(page.locator(".e47-context")).toContainText("15/01/2027");
  // No existe un encabezado «Total anual» ni un atributo de cifra anual.
  await expect(
    page.locator(".e47-page").getByRole("heading", { name: /total anual/i }),
  ).toHaveCount(0);
  await expect(page.locator("[data-total-anual]")).toHaveCount(0);

  // Cuatro carriles separados.
  for (const id of ["e47-plan", "e47-prevision", "e47-realidad", "e47-archivo"])
    await expect(page.locator(`section[aria-labelledby='${id}']`)).toBeVisible();

  // Plan: presupuesto y subtotal parcial del propietario; sin total anual.
  const plan = page.locator("section[aria-labelledby='e47-plan']");
  await expect(plan).toContainText("18.000,00 €");
  await expect(plan).toContainText("1.620,00 €");
  await expect(plan).toContainText("Subtotal conocido");
  await expect(plan).toContainText("PARCIAL");
  await expect(plan).toContainText("E2.4 annualExecution");
  await expect(plan).toContainText("Diferencia");
  await expect(plan).not.toContainText("Total anual");

  // Realidad: C007 con el contrato real de E2.6 y C008 cruzando año.
  const realidad = page.locator("section[aria-labelledby='e47-realidad']");
  await expect(realidad).toContainText("Ciclo 7");
  await expect(realidad).toContainText("Ciclo 8");
  await expect(realidad).toContainText("2.250,00 €");
  await expect(realidad).toContainText("1.800,00 €");
  await expect(realidad).toContainText("2.000,00 €");
  await expect(realidad).toContainText("600,00 €");
  await expect(realidad).toContainText("Agregado anual:");
  await expect(realidad).toContainText("No aplica");
  await expect(realidad).toContainText("350,00 €");
  await expect(realidad).toContainText("NO DISPONIBLE");
  await expect(realidad).not.toContainText("100,00 € como margen real");

  // Márgenes del plan y ND de DT8.
  const margenes = page.locator("section[aria-labelledby='e47-margenes']");
  await expect(margenes).toContainText("Márgenes del plan");
  await expect(margenes).toContainText("Margen estructural");
  await expect(margenes).toContainText("Margen frente a nómina real");
  await expect(margenes).toContainText("Definición pendiente DT8");
  await expect(margenes).toContainText(
    "Sin agregación anual ni margen medio",
  );

  // Previsión separada y archivo bloqueado sin simulación.
  const prevision = page.locator("section[aria-labelledby='e47-prevision']");
  await expect(prevision).toContainText("E2.5");
  await expect(prevision).toContainText("NO DISPONIBLE");
  await expect(prevision).toContainText("no se suma");
  const archivo = page.locator("section[aria-labelledby='e47-archivo']");
  await expect(archivo).toContainText("Gate BLOQUEADO");
  await expect(archivo).toContainText("E4.5");
  await expect(archivo).toContainText("DT7");
  await expect(archivo).not.toContainText("0,00 €");

  // Patrimonio separado, sin patrimonio neto ni suma con el flujo.
  const patrimonio = page.locator(
    "section[aria-labelledby='e47-patrimonio']",
  );
  await expect(patrimonio).toContainText("Patrimonio al corte");
  await expect(patrimonio).toContainText("Valoración E4.3");
  await expect(patrimonio).toContainText("Deuda E4.4");
  await expect(patrimonio).toContainText("sin patrimonio neto");
  await expect(patrimonio).toContainText("E4.4 listDeudasCompletas");
  await expect(patrimonio).toContainText("Corte aplicado: 15/01/2027");

  // Enlaces sin importes en la URL.
  const hrefs = await page
    .locator(".e47-page a")
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
    );
  for (const href of [
    "/plan-anual",
    "/nomina",
    "/flujo-mensual",
    "/movimientos",
    "/inversiones",
    "/deudas",
  ])
    expect(hrefs.some((value) => value.startsWith(href))).toBe(true);
  for (const href of hrefs)
    expect(href).not.toMatch(/[0-9]{2,}[.,][0-9]{2}|€/);

  // Drill-down y vuelta conservando el ejercicio y los filtros.
  const flujoLink = realidad
    .locator('a[href*="/flujo-mensual?ciclo="]')
    .first();
  await flujoLink.click();
  await expect(page).toHaveURL(/\/flujo-mensual\?ciclo=/);
  await page.goBack();
  await expect(page).toHaveURL(/\/resumen-anual\?ejercicio=2026/);
  await expect(
    page.getByRole("heading", { name: "Resumen anual", exact: true }),
  ).toBeVisible();

  // Foco visible.
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element) return false;
      const style = getComputedStyle(element);
      return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 1;
    }),
  ).toBe(true);

  const select = page.getByLabel("Tema visual");
  for (const theme of ["light-s", "dark-s", "hybrid-s"] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await select.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator(".e47-lane").first()).toBeVisible();
    await expectNoOverflow(page);
    await expectContrast(page);
    await expectNoOverflow(page);
    await resetScroll(page);
    await page.screenshot({
      path: `artifacts/e4-7/resumen-anual-${theme}-1440.png`,
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await select.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator("section[aria-labelledby='e47-plan'] .e47-cards").first()).toBeVisible();
    await expect(page.locator("section[aria-labelledby='e47-plan'] .e47-table-wrap").first()).toBeHidden();
    await expectNoOverflow(page);
    await expectContrast(page);
    await resetScroll(page);
    await page.screenshot({
      path: `artifacts/e4-7/resumen-anual-${theme}-390.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(errors).toEqual([]);
});

test("AC23: sin datos no se convierte en 0,00 ni en filas inventadas", async ({
  page,
}) => {
  mkdirSync("artifacts/e4-7", { recursive: true });
  await routeApi(page, EMPTY_PORT);
  await login(page, EMPTY_DIR);
  await page.goto("/resumen-anual?ejercicio=2026");

  await expect(page.locator(".e47-empty-page")).toContainText(
    "Sin datos para este ejercicio",
  );
  await expect(page.locator("section[aria-labelledby='e47-plan']")).toContainText(
    "Sin plan ni ejecución",
  );
  await expect(
    page.locator("section[aria-labelledby='e47-realidad']"),
  ).toContainText("no tiene Ciclos");
  await expect(
    page.locator("section[aria-labelledby='e47-archivo']"),
  ).toContainText("Gate BLOQUEADO");
  await expect(page.locator(".e47-page")).not.toContainText("0,00 €");

  await resetScroll(page);
  await page.screenshot({
    path: "artifacts/e4-7/resumen-anual-vacio-1440.png",
    fullPage: true,
  });
});

test("AC23/24: error de fuente y sesión expirada sin cifras ni fugas", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await routeApi(page, ERROR_PORT);
  await login(page, ERROR_DIR);
  await page.goto("/resumen-anual?ejercicio=2026");
  await expect(
    page.getByRole("heading", { name: "Resumen anual", exact: true }),
  ).toBeVisible();

  await page.route("**/api/resumen-anual*", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify({
        code: "INTERNAL",
        error: "No se pudo completar la operación.",
      }),
    }),
  );
  await page.reload();
  const fallo = page
    .getByRole("alert")
    .filter({ hasText: "No se pudo completar la operación." });
  await expect(fallo).toBeVisible();
  await expect(
    fallo.getByRole("button", { name: "Reintentar", exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("1.620,00 €");
  await expect(page.locator("body")).not.toContainText("2.250,00 €");
  await expect(page.locator("body")).not.toContainText("SQLITE");
  await expect(page.locator("body")).not.toContainText("SELECT");

  await page.unroute("**/api/resumen-anual*");
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.locator("section[aria-labelledby='e47-plan']")).toContainText(
    "1.620,00 €",
  );

  await page.route("**/api/resumen-anual*", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify({
        code: "ACCESS_DENIED",
        error: "No se pudo verificar el acceso.",
      }),
    }),
  );
  await page.reload();
  await expect(page.getByText(/no se muestran importes/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("1.620,00 €");
  await expect(page.locator("body")).not.toContainText("2.250,00 €");
  expect(errors).toEqual([]);
});

test("AC25: filtros funcionales y conservación al volver de un enlace", async ({
  page,
}) => {
  await routeApi(page, FILTERS_PORT);
  await login(page, FILTERS_DIR);
  await page.goto("/resumen-anual?ejercicio=2026");
  await expect(
    page.getByRole("heading", { name: "Resumen anual", exact: true }),
  ).toBeVisible();

  const ciclo = page.getByLabel("Ciclo", { exact: true });
  await ciclo.selectOption("8");
  await expect(page).toHaveURL(/ciclo=8/);
  await expect(
    page.locator("section[aria-labelledby='e47-realidad'] .e47-ciclo"),
  ).toHaveCount(1);
  await expect(
    page.locator("section[aria-labelledby='e47-realidad']"),
  ).toContainText("Ciclo 8");
  await expect(
    page.locator("section[aria-labelledby='e47-realidad']"),
  ).not.toContainText("Ciclo 7");

  const cobertura = page.getByLabel("Cobertura", { exact: true });
  await cobertura.selectOption("Completa");
  await expect(page).toHaveURL(/cobertura=Completa/);
  await expect(
    page.locator("section[aria-labelledby='e47-plan']"),
  ).toContainText("Sin plan ni ejecución para el filtro");

  await cobertura.selectOption("Parcial");
  await expect(
    page.locator("section[aria-labelledby='e47-plan']"),
  ).toContainText("18.000,00 €");

  const partida = page.getByLabel("Partida", { exact: true });
  const partidaValue = await partida.locator("option").nth(1).getAttribute("value");
  expect(partidaValue).toBeTruthy();
  await partida.selectOption(partidaValue!);
  await expect(page).toHaveURL(/partida=/);

  // Volver de un enlace conserva ejercicio, ciclo, partida y cobertura.
  await page
    .locator("section[aria-labelledby='e47-plan']")
    .getByRole("link", { name: "Ver plan anual", exact: true })
    .click();
  await expect(page).toHaveURL(/\/plan-anual/);
  await page.goBack();
  await expect(page).toHaveURL(/\/resumen-anual\?ejercicio=2026&ciclo=8/);
  await expect(page).toHaveURL(/cobertura=Parcial/);
  await expect(ciclo).toHaveValue("8");
  await expect(cobertura).toHaveValue("Parcial");
  await expect(
    page.getByRole("heading", { name: "Resumen anual", exact: true }),
  ).toBeVisible();
});
