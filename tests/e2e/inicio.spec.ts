import {
  test,
  expect,
  type APIRequestContext,
  type Locator,
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
const DEGRADED_PORT = 3016;
const AUTH_PORT = 3017;
const CASA_PORT = 3018;
const BASE_DIR = ".local/e2e-inicio";
const ZERO_DIR = ".local/e2e-inicio-zero";
const DEGRADED_DIR = ".local/e2e-inicio-degradado";
const AUTH_DIR = ".local/e2e-inicio-auth";
const CASA_DIR = ".local/e2e-inicio-casa";
let base: ChildProcess | undefined;
let zero: ChildProcess | undefined;
let degraded: ChildProcess | undefined;
let auth: ChildProcess | undefined;
let casa: ChildProcess | undefined;

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
  degraded = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/inicio-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test", E46_SCENARIO: "degradado" },
    },
  );
  auth = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/inicio-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test", E46_SCENARIO: "auth" },
    },
  );
  casa = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/inicio-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test", E46_SCENARIO: "casa" },
    },
  );
  await waitForApi(request, BASE_PORT);
  await waitForApi(request, ZERO_PORT);
  await waitForApi(request, DEGRADED_PORT);
  await waitForApi(request, AUTH_PORT);
  await waitForApi(request, CASA_PORT);
});

test.afterAll(() => {
  base?.kill();
  zero?.kill();
  degraded?.kill();
  auth?.kill();
  casa?.kill();
});

async function routeApi(page: Page, port: number) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(port);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
}

async function login(page: Page, dir: string) {
  const password = "Clave ficticia inicio " + randomUUID();
  await page.goto("/inicio");
  await page
    .getByLabel("Código de activación")
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
  await expect(page.locator(".inicio-context")).toBeVisible();
  return { secret, password };
}

/** Reautentica un usuario ya configurado sin repetir el alta ni los códigos. */
async function reauthenticate(
  page: Page,
  credentials: { secret: string; password: string },
) {
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(credentials.password);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByLabel("Código de la aplicación autenticadora")
    .fill(totp(credentials.secret).generate({ timestamp: Date.now() + 30000 }));
  await page
    .getByRole("button", { name: "Verificar código", exact: true })
    .click();
}

async function resetScroll(page: Page) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

async function expectInicio(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Inicio", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".inicio-context")).toContainText("Ciclo 7");
}

/** Texto funcional de Inicio que debe leerse a ≥12 px (UI DEV-06 I1). */
const FUNCTIONAL_TEXT_SELECTOR = [
  ".inicio-readonly",
  ".inicio-clase",
  ".inicio-estado",
  ".inicio-metric-meta",
  ".inicio-metric-motivo",
  ".inicio-source",
  ".inicio-note",
  ".inicio-ref-coverage",
  ".inicio-item-list li",
  ".inicio-item-meta",
  ".inicio-item-value",
  ".inicio-value-note",
  ".inicio-metric-coverage",
  ".inicio-zona",
  ".inicio-context-ref",
  ".inicio-context-meta",
  ".inicio-context-facts dt",
  ".inicio-counts dt",
  ".inicio-objetivo-facts dt",
  ".inicio-nd-list dt",
  ".inicio-detail h4",
  ".inicio-detail ul",
  ".inicio-submetric h4",
  ".inicio-aparte",
  ".inicio-degradado",
  ".inicio-coverage-list",
  ".inicio-motivo",
  ".ui-metric-class",
  ".ui-badge",
  ".ui-amount-note",
  ".ui-amount-state",
  ".graphite-kicker",
  ".graphite-control-meta",
  ".graphite-control-note",
  ".graphite-plan-item > span",
  ".graphite-facts dt",
  ".graphite-kpi-meta",
  ".graphite-control-link",
  ".graphite-cycle-note",
  ".graphite-cycle-coverage",
  ".graphite-cycle-detail summary",
  ".graphite-cycle-detail li > span",
  ".graphite-rail-meta",
  ".graphite-rail-empty",
  ".graphite-rail-alert",
  ".graphite-objective-facts dt",
  ".graphite-objective-facts dd",
  ".graphite-rail-link",
  ".graphite-position-meta",
  ".graphite-position-note",
  ".graphite-position-cell > a",
  ".graphite-coverage",
  ".graphite-detail-heading p",
  "small",
].join(",");

async function expectInicioFunctionalText(page: Page) {
  await page.locator(".inicio-page details").evaluateAll((nodes) => {
    for (const node of nodes) (node as HTMLDetailsElement).open = true;
  });
  const undersized = await page.locator(".inicio-page").evaluate((root, selector) => {
    const found: { className: string; text: string; fontSize: number }[] = [];
    for (const node of Array.from(root.querySelectorAll(selector))) {
      const element = node as HTMLElement;
      const style = getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        !element.offsetParent
      )
        continue;
      if (!(element.textContent ?? "").trim()) continue;
      const fontSize = Number.parseFloat(style.fontSize);
      if (fontSize < 12) {
        found.push({
          className: element.className,
          text: (element.textContent ?? "").trim().slice(0, 80),
          fontSize,
        });
      }
    }
    return found;
  }, FUNCTIONAL_TEXT_SELECTOR);
  expect(undersized).toEqual([]);
  await page.locator(".inicio-page details").evaluateAll((nodes) => {
    for (const node of nodes) (node as HTMLDetailsElement).open = false;
  });
}

async function expectGraphiteComposition(page: Page) {
  const hero = page.locator('[data-inicio-section="hero"]');
  const kpis = page.locator('[data-inicio-section="kpis"]');
  const cycle = page.locator('[data-inicio-section="cycle"]');
  const rail = page.locator('[data-inicio-section="rail"]');
  const position = page.locator('[data-inicio-section="position"]');
  const coverage = page.locator('[data-inicio-section="coverage"]');
  await expect(hero).toBeVisible();
  await expect(kpis).toBeVisible();
  await expect(cycle).toBeVisible();
  await expect(rail).toBeVisible();
  await expect(position).toBeVisible();
  await expect(coverage).toBeVisible();

  // G2a: hero y banda KPI con cifras publicadas.
  await expect(hero).toContainText("Liquidez disponible");
  await expect(hero).toContainText("3.456,40 €");
  await expect(hero).toContainText("3/4");
  await expect(hero).toContainText("1.800,00 €");
  await expect(hero).toContainText("1.900,00 €");
  await expect(hero).toContainText("NO DISPONIBLE");
  await expect(kpis).toContainText("2.250,00 €");
  await expect(kpis).toContainText("1.800,00 €");
  await expect(kpis).toContainText("1.197,50 €");
  await expect(kpis).toContainText("1.020,00 €");
  await expect(kpis).toContainText("2/2");
  await expect(hero).not.toContainText("%");
  await expect(kpis).not.toContainText("%");
  await expect(hero.locator(".graphite-hero-margin")).toContainText("ND");
  await expect(hero.locator(".graphite-hero-margin")).not.toContainText(
    "0,00 €",
  );
  const planItem = (label: string) =>
    hero.locator(".graphite-plan-item").filter({ hasText: label });
  await expect(planItem("Gasto bruto")).toContainText("1.800,00 €");
  await expect(planItem("Del mes planificado")).toContainText("1.900,00 €");
  const kpi = (label: string) =>
    kpis.locator(".graphite-kpi").filter({ hasText: label });
  await expect(kpi("Ingresos del ciclo")).toContainText("2.250,00 €");
  await expect(kpi("Gasto bruto")).toContainText("1.800,00 €");
  await expect(kpi("Inversión valorada")).toContainText("1.197,50 €");
  await expect(kpi("Deuda no hipotecaria")).toContainText("1.020,00 €");
  const fact = (label: string) =>
    hero.locator(".graphite-facts > div").filter({ hasText: label });
  await expect(fact("Ingresos")).toContainText("2.250,00 €");
  await expect(fact("Gasto bruto")).toContainText("1.800,00 €");
  await expect(fact("Nómina")).toContainText("2.000,00 €");
  await expect(fact("Ingresos")).toContainText("PARCIAL");

  // G2b: ciclo publicado, sin duplicar el panel antiguo.
  await expect(
    page.getByRole("heading", { name: "Métricas publicadas del ciclo" }),
  ).toBeVisible();
  await expect(
    page.locator("section[aria-labelledby='inicio-ciclo']"),
  ).toHaveCount(0);
  const cycleRows = cycle.locator(".graphite-cycle-desktop tbody tr");
  await expect(cycleRows).toHaveCount(8);
  const row = (label: string) => cycleRows.filter({ hasText: label });
  await expect(row("Ingresos")).toContainText("2.250,00 €");
  await expect(row("Ingresos")).toContainText("PARCIAL");
  await expect(row("Gasto bruto")).toContainText("1.800,00 €");
  await expect(row("Amortización extraordinaria")).toContainText("100,00 €");
  await expect(row("Nómina cobrada")).toContainText("2.000,00 €");
  await expect(row("Saldo operativo bruto observado")).toContainText("ND");
  await expect(row("Margen frente a nómina real")).toContainText("ND");
  await expect(row("Base planificada")).toContainText("1.900,00 €");
  await expect(row("Del mes planificado")).toContainText("1.900,00 €");
  await expect(row("Base planificada")).toContainText("COMPLETO");
  await expect(cycle).toContainText("Motivos y fuentes de cada métrica");
  await expect(cycle).not.toContainText("Ver flujo mensual");
  await expect(cycle).not.toContainText("%");
  await expect(hero).toContainText("Ver flujo mensual");

  // G2b: rail de atención y objetivo.
  await expect(rail).toContainText("Pendientes y cobertura");
  await expect(rail).toContainText(/\d+ visibles?/);
  await expect(
    rail.getByRole("heading", { name: "Coste esencial y meses" }),
  ).toBeVisible();
  await expect(rail).toContainText("1.500,00 €");
  await expect(rail).toContainText("No configurados");
  await expect(rail).toContainText("Meses cubiertos");
  await expect(rail).toContainText("Ver Pendientes");
  await expect(rail).toContainText("Ver coste esencial");
  await expect(rail).not.toContainText("%");

  // G2b: banda de posición y cobertura publicadas.
  await expect(position.locator(".graphite-position-value")).toHaveText("7");
  await expect(position).toContainText("Sin total entre vistas");
  await expect(position).toContainText("Sin total de Ahorro");
  await expect(position).toContainText("Efectivo del bróker aparte");
  await expect(position).toContainText("hipotecaria aparte");
  await expect(position).toContainText("Inversión ·");
  await expect(position).not.toContainText("%");
  const positionCell = (label: string) =>
    position
      .locator(".graphite-position-cell")
      .filter({ has: page.locator(".graphite-kicker", { hasText: label }) });
  const ahorroCell = positionCell("Ahorro");
  await expect(ahorroCell).toContainText("800,00 €");
  await expect(ahorroCell).toContainText("COMPLETO");
  await expect(ahorroCell.locator(".ui-badge")).toHaveAttribute(
    "data-estado",
    "Verificado",
  );
  await expect(ahorroCell).not.toContainText("ND");
  const inversionCell = positionCell("Inversión valorada");
  await expect(inversionCell).toContainText("1.197,50 €");
  await expect(inversionCell).toContainText("COMPLETO");
  const deudaCell = positionCell("Deuda no hipotecaria");
  await expect(deudaCell).toContainText("1.020,00 €");
  await expect(deudaCell).toContainText("PARCIAL");
  await expect(deudaCell).toContainText("2/3");
  await expect(deudaCell.locator(".ui-badge")).toHaveAttribute(
    "data-estado",
    "Parcial",
  );
  const coverageCell = positionCell("Cobertura");
  await expect(coverageCell.locator(".ui-badge")).toHaveAttribute(
    "data-estado",
    "Verificado",
  );
  await expect(coverageCell).toContainText("Inversión · Completa");

  // Taxonomía única también en la composición Graphite.
  const graphiteBadges = page.locator(
    ".inicio-page .ui-badge[data-estado]",
  );
  expect(await graphiteBadges.count()).toBeGreaterThan(0);
  for (const badge of await graphiteBadges.all()) {
    expect([
      "Verificado",
      "Cero verificado",
      "Parcial",
      "No disponible",
      "No aplica",
      "Sin datos",
    ]).toContain(await badge.getAttribute("data-estado"));
    expect((await badge.getAttribute("data-tipo")) ?? "").toBeTruthy();
  }
  await expect(coverage).toContainText("Cobertura del modelo");
  await expect(coverage).toContainText("motivos de contexto");
  await expect(page.locator(".graphite-detail-heading")).toContainText(
    "Información completa",
  );
  for (const section of [
    "inicio-saldos",
    "inicio-ahorro",
    "inicio-inversion",
    "inicio-deuda",
    "inicio-objetivo",
  ])
    await expect(
      page.locator(`section[aria-labelledby='${section}']`),
    ).toBeVisible();
  await expect(page.locator("#inicio-cobertura")).toBeVisible();

  // Los drill-down usan rutas publicadas sin importes.
  const hrefs = await page
    .locator(".inicio-page [data-inicio-section] a")
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
    );
  expect(hrefs).toContain("/flujo-mensual?ciclo=7");
  expect(hrefs).toContain("/saldos");
  expect(hrefs).toContain("/inversiones");
  expect(hrefs).toContain("/deudas");
  expect(hrefs).toContain("/pendientes");
  for (const href of hrefs)
    expect(href).not.toMatch(/[0-9]{2,}[.,][0-9]{2}|€/);
}

async function gridColumnCount(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const columns = getComputedStyle(element).gridTemplateColumns;
    return columns.split(/\s+/).filter(Boolean).length;
  });
}

async function drillDown(page: Page, link: Locator, url: RegExp) {
  await link.click();
  await expect(page).toHaveURL(url);
  expect(page.url()).not.toMatch(/[0-9]{2,}[.,][0-9]{2}|€/);
  await page.goBack();
  await expectInicio(page);
}

/** Contraste de texto, motivos y enlaces principales, no solo de los badges. */
async function expectInicioContrast(page: Page) {
  // Abre los detalles para que small/meta/summary no queden fuera por offsetParent.
  await page.locator(".inicio-page details").evaluateAll((nodes) => {
    for (const node of nodes) (node as HTMLDetailsElement).open = true;
  });
  const ratios = await page.locator(".inicio-page").evaluate((root) => {
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
        "h1,h2,h3,h4,p,dt,dd,li,a,small,summary,.ui-amount-value,.ui-amount-state,.ui-amount-note,.ui-badge,.inicio-item-meta,.inicio-clase,.graphite-kicker,.graphite-plan-item > span,.graphite-facts dt,.graphite-kpi-meta,.graphite-control-note,.graphite-control-link",
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

test("AC-01/05/09/26: composición visible, cobertura, drill-down y responsive", async ({
  page,
}) => {
  mkdirSync("artifacts/e4-6", { recursive: true });
  mkdirSync("artifacts/dev-06", { recursive: true });
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
  await expect(objetivo).toContainText("Cobertura Completa");
  await expect(objetivo).toContainText("0 importes esenciales sin informar");
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
  await expect(nomina).toContainText("PARCIAL");
  const base = ciclo.getByRole("article", {
    name: "Base planificada",
    exact: true,
  });
  await expect(base).toContainText("1.900,00 €");
  await expect(base).toContainText("Total verificado");
  await expect(base).toContainText("COMPLETO");
  const delMes = ciclo.getByRole("article", {
    name: "Del mes planificado",
    exact: true,
  });
  await expect(delMes).toContainText("1.900,00 €");
  await expect(delMes).toContainText("Total verificado");
  await expect(delMes).toContainText("COMPLETO");
  await expect(page.locator("body")).not.toContainText("350,00 €");

  // B1: ningún motivo se repite como bullet de cobertura en la misma tarjeta.
  for (const card of await page.locator(".inicio-metric").all()) {
    const motivo = (
      await card.locator(".inicio-metric-motivo").first().innerText()
    ).trim();
    if (!motivo) continue;
    for (const bullet of await card
      .locator(".inicio-metric-coverage li")
      .allInnerTexts())
      expect(bullet.trim()).not.toBe(motivo);
    // Un solo CTA por destino dentro de la misma tarjeta.
    const cardHrefs = await card
      .locator("a")
      .evaluateAll((anchors) =>
        anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
      );
    expect(new Set(cardHrefs).size).toBe(cardHrefs.length);
  }

  // Taxonomía única: los badges no muestran estados crudos en minúsculas.
  const badges = page.locator(".ui-badge");
  expect(await badges.count()).toBeGreaterThan(0);
  for (const badge of await badges.all()) {
    expect([
      "Verificado",
      "Cero verificado",
      "Parcial",
      "No disponible",
      "No aplica",
      "Sin datos",
    ]).toContain(await badge.getAttribute("data-estado"));
    const text = (await badge.innerText()).trim();
    expect(text).not.toBe("No disponible");
    expect(text).not.toBe("Completa");
    expect(text).not.toMatch(/^Parcial \d/);
  }

  // Saldos: conteos y ausencia de total.
  const saldos = page.locator("section[aria-labelledby='inicio-saldos']");
  await expect(saldos).toContainText("Sin total de Saldos");
  await expect(saldos).toContainText("cobertura 6/7");
  await saldos.getByText("Ver Saldos y su pertenencia").click();
  await expect(saldos.locator(".inicio-item-list li")).toHaveCount(7);
  await expect(saldos).toContainText("posición calculado");

  // Ahorro: la posición y las métricas declaran su fuente y cobertura.
  const ahorro = page.locator("section[aria-labelledby='inicio-ahorro']");
  await expect(ahorro).toContainText("posición calculado");
  await expect(ahorro).toContainText("Cobertura:");
  await expect(ahorro).toContainText("Fuente: Motor no instalado");

  // Inversión: agregado valorado y efectivo separados, sin total combinado.
  const inversion = page.locator("section[aria-labelledby='inicio-inversion']");
  await expect(inversion).toContainText("1.197,50 €");
  await expect(inversion).toContainText("Resultado");
  await expect(inversion).toContainText("Parcial 1/2");
  await expect(inversion).toContainText("1.456,40 €");
  await expect(inversion).toContainText("500,00 €");
  await expect(inversion).toContainText("Sin total combinado");
  await expect(inversion).not.toContainText("3.153,90 €");
  await inversion.getByText("Ver posiciones").click();
  await expect(inversion).toContainText("cobertura Completa");
  await expect(inversion).toContainText("Acción demo");

  // Deuda: subtotal parcial 2/3, D005 no calculable y aparte fuera del total.
  const deuda = page.locator("section[aria-labelledby='inicio-deuda']");
  const deudaTotal = page.getByRole("article", {
    name: "Deuda no hipotecaria",
    exact: true,
  });
  await expect(deudaTotal).toContainText("Subtotal conocido");
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
  expect(hrefs).toContain("/plan-anual");
  expect(
    hrefs.filter((href) => href === "/flujo-mensual?ciclo=7"),
  ).toHaveLength(1);
  for (const href of hrefs)
    expect(href).not.toMatch(/[0-9]{2,}[.,][0-9]{2}|€/);

  // Activa todos los drill-down y vuelve comprobando el contexto del ciclo.
  await drillDown(
    page,
    liquidezSection.getByRole("link", { name: "Ver Saldos", exact: true }),
    /\/saldos$/,
  );
  await saldos.getByText("Ver Saldos y su pertenencia").click();
  await drillDown(
    page,
    saldos.getByRole("link", { name: /^S001 / }),
    /\/saldos\/S001$/,
  );
  await drillDown(
    page,
    ciclo.getByRole("link", { name: "Ver flujo mensual", exact: true }).first(),
    /\/flujo-mensual\?ciclo=7$/,
  );
  await drillDown(
    page,
    inversion.getByRole("link", { name: "Ver Inversión", exact: true }),
    /\/inversiones$/,
  );
  await drillDown(
    page,
    deuda.getByRole("link", { name: "Ver Deudas", exact: true }),
    /\/deudas$/,
  );
  await drillDown(
    page,
    deuda.getByRole("link", { name: /^D001 / }),
    /\/deudas\/D001$/,
  );
  await drillDown(
    page,
    pendientes.getByRole("link", { name: "Ver Pendientes", exact: true }),
    /\/pendientes$/,
  );
  await drillDown(
    page,
    objetivo.getByRole("link", { name: "Ver coste esencial", exact: true }),
    /\/plan-anual$/,
  );

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

  const select = page.getByLabel("Apariencia");
  const expectNoOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

  // UI DEV-06 I1: rejilla 4/2/1, texto funcional ≥12 px y coste R6 como
  // lectura principal por encima de sus submétricas.
  await expectInicioFunctionalText(page);
  for (const [width, four, two, metric] of [
    [1440, 4, 2, 2],
    [900, 2, 2, 2],
    [390, 1, 1, 1],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await gridColumnCount(page, ".inicio-grid-4")).toBe(four);
    expect(await gridColumnCount(page, ".inicio-grid-2")).toBe(two);
    expect(await gridColumnCount(page, ".inicio-metric-grid")).toBe(metric);
    await expectNoOverflow();
    await expectInicioFunctionalText(page);
  }
  const objetivoSizes = await page.evaluate(() => {
    const fontSize = (selector: string) => {
      const node = document.querySelector(selector);
      return node ? Number.parseFloat(getComputedStyle(node).fontSize) : 0;
    };
    return {
      coste: fontSize(
        ".inicio-objetivo > .ui-metric-main .ui-amount-value",
      ),
      submetrica: fontSize(".inicio-submetric .ui-amount-value"),
    };
  });
  expect(objetivoSizes.coste).toBeGreaterThan(objetivoSizes.submetrica);
  expect(objetivoSizes.submetrica).toBeGreaterThanOrEqual(12);

  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const theme of [
    "light-s",
    "dark-s",
    "hybrid-s",
    "graphite-lime",
  ] as const) {
    await select.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator(".inicio-context")).toContainText("Ciclo 7");
    await expect(page.locator(".inicio-metric").first()).toBeVisible();
    await expectNoOverflow();
    await expectInicioContrast(page);
    await expectNoOverflow();
    await expect(
      page.locator("section[aria-labelledby='inicio-ciclo']"),
    ).toHaveCount(theme === "graphite-lime" ? 0 : 1);
    if (theme === "graphite-lime") {
      await expectGraphiteComposition(page);
      await expectInicioFunctionalText(page);
    }
    // La captura conserva el estado compacto; el contraste ya midió con details abiertos.
    await page.locator(".inicio-page details").evaluateAll((nodes) => {
      for (const node of nodes) (node as HTMLDetailsElement).open = false;
    });
    await resetScroll(page);
    if (theme === "graphite-lime")
      await page.screenshot({
        path: "artifacts/e4-6/inicio-graphite-lime-1440-fold.png",
      });
    await page.screenshot({
      path: `artifacts/e4-6/inicio-${theme}-1440.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: `artifacts/dev-06/inicio-${theme}-1440.png`,
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of [
    "light-s",
    "dark-s",
    "hybrid-s",
    "graphite-lime",
  ] as const) {
    await select.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator(".inicio-context")).toContainText("Ciclo 7");
    await expect(page.locator(".inicio-metric").first()).toBeVisible();
    await expectNoOverflow();
    await expectInicioContrast(page);
    await expectNoOverflow();
    await expect(
      page.locator("section[aria-labelledby='inicio-ciclo']"),
    ).toHaveCount(theme === "graphite-lime" ? 0 : 1);
    if (theme === "graphite-lime") {
      await expectGraphiteComposition(page);
      await expect(page.locator(".graphite-cycle-cards")).toBeVisible();
      await expect(page.locator(".graphite-cycle-desktop")).toBeHidden();
      await expectInicioFunctionalText(page);
    }
    await page.locator(".inicio-page details").evaluateAll((nodes) => {
      for (const node of nodes) (node as HTMLDetailsElement).open = false;
    });
    await resetScroll(page);
    await page.screenshot({
      path: `artifacts/e4-6/inicio-${theme}-390.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: `artifacts/dev-06/inicio-${theme}-390.png`,
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 820, height: 1000 });
  await select.selectOption("graphite-lime");
  await expectGraphiteComposition(page);
  await expect(page.locator(".graphite-cycle-cards")).toBeVisible();
  await expect(page.locator(".graphite-cycle-desktop")).toBeHidden();
  await expect(page.locator(".graphite-cycle-cards .ui-data-list-item")).toHaveCount(
    8,
  );
  await expectNoOverflow();
  await expectInicioContrast(page);
  await expectInicioFunctionalText(page);
  await page.screenshot({
    path: "artifacts/e4-6/inicio-graphite-lime-820.png",
    fullPage: true,
  });
  await page.screenshot({
    path: "artifacts/dev-06/inicio-graphite-lime-820.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(errors).toEqual([]);
});

test("AC-07/29: cero verificado se muestra 0,00 y null sigue No disponible", async ({
  page,
}) => {
  mkdirSync("artifacts/e4-6", { recursive: true });
  mkdirSync("artifacts/dev-06", { recursive: true });
  await routeApi(page, ZERO_PORT);
  await login(page, ZERO_DIR);
  await expectInicioFunctionalText(page);

  const liquidez = page.getByRole("article", { name: "Liquidez", exact: true });
  await expect(liquidez).toContainText("0,00 €");
  await expect(liquidez).toContainText("Cero verificado");
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
    name: "Deuda no hipotecaria",
    exact: true,
  });
  await expect(deudaTotal).toContainText("PARCIAL");
  await expect(deudaTotal).toContainText("1.020,00 €");
  await expect(deudaTotal).toContainText("Subtotal conocido");

  // Evidencia: tres temas a 1440 y 390, también en el escenario cero.
  const select = page.getByLabel("Apariencia");
  for (const theme of ["light-s", "dark-s", "hybrid-s"] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await select.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const [width, height] of [
      [1440, 1000],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (width === 390 && theme === "light-s")
        await expectInicioFunctionalText(page);
      await resetScroll(page);
      await page.screenshot({
        path: `artifacts/e4-6/inicio-cero-${theme}-${width}.png`,
        fullPage: true,
      });
      if (width === 390)
        await page.screenshot({
          path: `artifacts/dev-06/inicio-cero-${theme}-390.png`,
          fullPage: true,
        });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
});

test("M-4: estados degradados no se presentan como vacío real", async ({
  page,
}) => {
  mkdirSync("artifacts/e4-6", { recursive: true });
  mkdirSync("artifacts/dev-06", { recursive: true });
  await routeApi(page, DEGRADED_PORT);
  await page.route("**/api/resumen-inicio", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(DEGRADED_PORT);
    const response = await route.fetch({ url: url.toString() });
    const json: any = await response.json();
    json.secciones.deudaNoHipotecaria.total = {
      valor: null,
      subtotal: null,
      estado: "No disponible",
      motivo: "E4.4 no disponible: fuente no verificable.",
      cobertura: {
        estado: "No disponible",
        incluidos: 0,
        excluidos: 0,
        motivos: ["E4.4 no disponible: fuente no verificable."],
      },
      fuente: {
        motor: "E4.4 listDeudasCompletas/getDeudaCompleta",
        ids: [],
        revisiones: [],
      },
    };
    json.secciones.deudaNoHipotecaria.items = [];
    json.secciones.deudaNoHipotecaria.aparte = {
      hipotecaria: [],
      sinInformar: [],
    };
    json.secciones.pendientes.fuenteFallos = [
      {
        motor: "E4.2 cashAt",
        id: "S003",
        motivo: "Efectivo no verificable",
      },
    ];
    json.secciones.pendientes.items = [];
    json.secciones.pendientes.conteo = null;
    json.secciones.pendientes.metrica.estado = "Sin datos";
    const saldo = json.secciones.saldos.items.find(
      (item: any) => item.id === "S001",
    );
    saldo.posicion = null;
    saldo.motivo = "Control de movimientos no verificado";
    const ahorro = json.secciones.ahorro.posiciones[0];
    ahorro.valor = null;
    ahorro.estado = "No disponible";
    ahorro.motivo = "Posición de ahorro no verificable por el motor";
    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      json,
    });
  });
  await login(page, DEGRADED_DIR);
  await expectInicioFunctionalText(page);

  const deuda = page.locator("section[aria-labelledby='inicio-deuda']");
  await expect(deuda).toContainText("Bloque no disponible por fallo de fuente");
  await expect(deuda).toContainText("E4.4 no disponible: fuente no verificable.");
  await expect(deuda).not.toContainText("Sin deudas no hipotecarias activas");

  const pendientes = page.locator("section[aria-labelledby='inicio-pendientes']");
  await expect(pendientes).toContainText("PARCIAL · FUENTES CON FALLO");
  await expect(pendientes).toContainText(
    "E4.2 cashAt S003: Efectivo no verificable",
  );
  await expect(pendientes).not.toContainText("Sin pendientes");
  await expect(pendientes).not.toContainText("SIN DATOS");

  const saldos = page.locator("section[aria-labelledby='inicio-saldos']");
  await saldos.getByText("Ver Saldos y su pertenencia").click();
  await expect(saldos).toContainText(
    "Motivo: Control de movimientos no verificado",
  );
  const ahorro = page.locator("section[aria-labelledby='inicio-ahorro']");
  await expect(ahorro).toContainText(
    "Posición de ahorro no verificable por el motor",
  );

  await page.locator(".inicio-page details").evaluateAll((nodes) => {
    for (const node of nodes) (node as HTMLDetailsElement).open = false;
  });

  // Graphite: un fallo de fuente no se presenta como bloque vacío.
  const select = page.getByLabel("Apariencia");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await select.selectOption("graphite-lime");
  const railDegradado = page.locator('[data-inicio-section="rail"]');
  await expect(railDegradado).toContainText(
    "Hay fuentes de pendientes con fallo",
  );
  await expect(railDegradado).not.toContainText("Sin pendientes visibles");
  const posicionDegradada = page.locator('[data-inicio-section="position"]');
  await expect(posicionDegradada).toContainText("NO DISPONIBLE");
  await expect(posicionDegradada).not.toContainText("0,00 €");
  await expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await resetScroll(page);
  await page.screenshot({
    path: "artifacts/e4-6/inicio-degradado-graphite-lime-1440.png",
    fullPage: true,
  });

  // Evidencia: tres temas a 1440 y 390, también en el escenario degradado.
  for (const theme of ["light-s", "dark-s", "hybrid-s"] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await select.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const [width, height] of [
      [1440, 1000],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (width === 390 && theme === "light-s")
        await expectInicioFunctionalText(page);
      await resetScroll(page);
      await page.screenshot({
        path: `artifacts/e4-6/inicio-degradado-${theme}-${width}.png`,
        fullPage: true,
      });
      if (width === 390)
        await page.screenshot({
          path: `artifacts/dev-06/inicio-degradado-${theme}-390.png`,
          fullPage: true,
        });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
});

test("AC-27: error 500 y sesión expirada sin datos inventados ni pérdida de contexto", async ({
  page,
}) => {
  await routeApi(page, AUTH_PORT);
  mkdirSync("artifacts/dev-06", { recursive: true });
  const credentials = await login(page, AUTH_DIR);
  await expectInicio(page);

  // Error 500 del endpoint: estado genérico con reintento, sin cifras ni fuga.
  await page.route("**/api/resumen-inicio", (route) =>
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
  await expect(page.locator("body")).not.toContainText("3.456,40 €");
  await expect(page.locator("body")).not.toContainText("1.197,50 €");
  await expect(page.locator("body")).not.toContainText("1.020,00 €");
  await expect(page.locator("body")).not.toContainText("SQLITE");
  await expect(page.locator("body")).not.toContainText("SELECT");
  await expect(page).toHaveURL(/\/inicio$/);

  await page.unroute("**/api/resumen-inicio");
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expectInicio(page);

  // Sesión expirada durante /inicio: 401, sin importes y con reautenticación.
  await page.route("**/api/resumen-inicio", (route) =>
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
  await expect(
    page.getByRole("button", { name: "Volver a iniciar sesión" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("3.456,40 €");
  await expect(page.locator("body")).not.toContainText("1.020,00 €");
  // El contexto de cabecera sigue montado; solo desaparecen los datos.
  await expect(page.locator(".cycle-context")).toContainText(
    "CICLO FINANCIADO",
  );
  await expect(page.locator(".cycle-context")).toContainText("Referencia financiera");

  // El estado 401 conserva el texto funcional legible y no desborda a 390.
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const alertFontSize = await page
    .locator(".alert")
    .filter({ hasText: "no se muestran importes" })
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(alertFontSize).toBeGreaterThanOrEqual(12);
  await resetScroll(page);
  await page.screenshot({
    path: "artifacts/dev-06/inicio-401-390.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.unroute("**/api/resumen-inicio");
  await page
    .getByRole("button", { name: "Volver a iniciar sesión" })
    .click();
  await reauthenticate(page, credentials);
  await expect(page).toHaveURL(/\/inicio$/);
  await expectInicio(page);
  await expect(
    page.getByRole("article", { name: "Liquidez", exact: true }),
  ).toContainText("3.456,40 €");
});

test("Casa 1B: portada editorial de Inicio, datos publicados y responsive", async ({
  page,
}) => {
  mkdirSync("artifacts/ui-casa-1b", { recursive: true });
  await routeApi(page, CASA_PORT);
  await login(page, CASA_DIR);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const select = page.getByLabel("Apariencia");
  await select.selectOption("casa");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "casa");
  await expect(page.locator(".inicio-page")).toHaveClass(/inicio-casa/);

  const cover = page.locator(".casa-cover");
  await expect(cover).toBeVisible();
  await expect(cover).toContainText("Casa de cuentas · Ciclo 7");
  await expect(cover).toContainText("3.456,40 €");
  await expect(cover).toContainText("3/4");
  await expect(cover).toContainText("Saldos listados");
  await expect(cover.locator(".casa-cover-counts dt").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(cover.locator(".casa-cover-counts dd").first()).toHaveCSS(
    "font-family",
    /Newsreader/,
  );
  await expect(cover.locator(".casa-cover-coverage dd")).toHaveCSS(
    "font-family",
    /IBM Plex Sans/,
  );
  await expect(
    cover.getByRole("link", { name: "Registrar movimiento", exact: true }),
  ).toBeVisible();
  await expect(
    cover.getByRole("link", { name: "Ver Movimientos", exact: true }),
  ).toBeVisible();
  await expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/ui-casa-1b/inicio-casa-1440.png",
    fullPage: true,
  });

  await select.selectOption("light-s");
  await expect(cover).toHaveCount(0);
  await select.selectOption("casa");
  await expect(cover).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/ui-casa-1b/inicio-casa-390.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
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
