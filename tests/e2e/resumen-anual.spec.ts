import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
import { RESUMEN_ANUAL_NOW } from "../../apps/api/test-support/resumen-anual-clock";

import { artifactDir, fixtureContext, type Fixture } from "./fixture";

const artifacts = artifactDir("e4-7");

/**
 * E4.7 — UI /resumen-anual con MFA real y un servidor aislado.
 *
 * El servidor de test siembra las fixtures ficticias C007/C008. Nunca toca una
 * base real. Las capturas van al directorio de artefactos de la run, fuera del
 * repositorio.
 *
 * Cada escenario tiene puerto y estado **propios de la ejecución** (#514): los
 * cinco listeners del archivo ya no ocupan los puertos históricos 3018-3022 ni
 * los directorios `.local/e2e-e47*`, así que dos runs simultáneos no comparten
 * nada y no chocan con los fixtures de `inicio`/`comida-dprima`.
 */

const BASE = fixtureContext("resumen-anual-base");
const EMPTY = fixtureContext("resumen-anual-vacio");
const ERROR = fixtureContext("resumen-anual-error");
const FILTERS = fixtureContext("resumen-anual-filtros");
const CONCURRENCY = fixtureContext("resumen-anual-concurrencia");

type OwnedFixture = {
  fixture: Fixture;
  child: ChildProcess;
  output: () => string;
  /** Un fixture muerto no puede quedar enmascarado por un poll que responde. */
  assertAlive: () => void;
};

/** Arranca el servidor del escenario con el puerto y estado de su contexto. */
function startFixture(fixture: Fixture, scenario?: "empty"): OwnedFixture {
  const child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/resumen-anual-server.ts"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...fixture.env,
        ...(scenario ? { E47_SCENARIO: scenario } : {}),
      },
    },
  );
  let output = "";
  let exit: { code: number | null; signal: NodeJS.Signals | null } | null = null;
  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.on("exit", (code, signal) => {
    exit = { code, signal };
  });
  const assertAlive = () => {
    const ended = exit;
    if (!ended) return;
    const how = `código ${ended.code ?? "null"}${ended.signal ? ` / señal ${ended.signal}` : ""}`;
    throw new Error(
      `El fixture ${fixture.name} terminó antes de servir (${how}): ${output.trim() || "(sin salida)"}`,
    );
  };
  return { fixture, child, output: () => output, assertAlive };
}

const served: OwnedFixture[] = [];

async function waitForApi(request: APIRequestContext, owned: OwnedFixture) {
  await expect
    .poll(
      async () => {
        owned.assertAlive();
        try {
          return (await request.get(`${owned.fixture.baseURL}/api/health`))
            .status();
        } catch {
          return 0;
        }
      },
      { timeout: 20000 },
    )
    .toBe(200);
  // El fixture provisionó su base ficticia antes de servir: se navega solo
  // cuando el estado de esta run está en disco.
  owned.assertAlive();
  expect(
    existsSync(join(owned.fixture.dir, "bootstrap.txt")),
    `El fixture ${owned.fixture.name} no provisionó ${owned.fixture.dir}/bootstrap.txt: ${owned.output().trim()}`,
  ).toBe(true);
}

test.beforeAll(async ({ request }) => {
  served.push(startFixture(BASE));
  served.push(startFixture(EMPTY, "empty"));
  served.push(startFixture(ERROR));
  served.push(startFixture(FILTERS));
  served.push(startFixture(CONCURRENCY));
  for (const owned of served) await waitForApi(request, owned);
});

test.afterAll(() => {
  for (const owned of served) {
    owned.child.kill();
    owned.child.stdout?.destroy();
    owned.child.stderr?.destroy();
  }
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
    .getByLabel("Código de activación")
    .fill(readFileSync(`${dir}/bootstrap.txt`, "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".secret")).toBeVisible();
  const secret = (await page.locator(".secret").textContent())!;
  await page
    .getByLabel("Código de la aplicación autenticadora")
    .fill(totp(secret).generate({ timestamp: RESUMEN_ANUAL_NOW }));
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

async function readKeyboardFocus(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) return null;
    const style = getComputedStyle(element);
    return {
      element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}`,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
}

/**
 * Comprueba el anillo de foco tras pulsar Tab desde un estado conocido.
 *
 * El navegador puede completar el cambio de foco o su recálculo de estilo en
 * un ciclo posterior a la pulsación, así que la lectura se reintenta con
 * `toPass` en lugar de evaluar `document.activeElement` de inmediato. `Tab` se
 * pulsa una única vez: si el foco sigue en `<body>` o no hay elemento enfocado
 * al agotar el timeout, el test falla en lugar de saltarse el primer focusable.
 * En ningún caso se acepta un elemento sin outline visible de al menos 1px.
 */
async function expectVisibleKeyboardFocus(page: Page) {
  // `blur()` no garantiza que `<body>` quede como activeElement en todos los
  // estados: la app puede tener un `requestAnimationFrame` pendiente que
  // enfoque el `<h1>`. Por eso se repite el anclaje a `<body>` y se comprueba
  // tras dos frames; solo entonces se pulsa un único Tab.
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const active = document.activeElement as HTMLElement | null;
          active?.blur();
          // `tabIndex=-1` hace `<body>` enfocable por programa sin añadirlo al
          // orden de tabulación.
          if (!document.body.hasAttribute("tabindex"))
            document.body.tabIndex = -1;
          document.body.focus();
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => resolve()),
            ),
          );
          return document.activeElement === document.body;
        }),
      {
        message: "El foco debe partir de <body> antes de pulsar Tab",
        timeout: 5000,
      },
    )
    .toBe(true);

  await page.keyboard.press("Tab");

  await expect(async () => {
    const focus = await readKeyboardFocus(page);
    expect(
      focus,
      "Tab debe mover el foco fuera de <body> a un elemento de la página",
    ).not.toBeNull();
    if (!focus) return;
    expect(focus.outlineStyle, `outlineStyle de <${focus.element}>`).not.toBe(
      "none",
    );
    expect(
      focus.outlineWidth,
      `outlineWidth de <${focus.element}>`,
    ).toBeGreaterThanOrEqual(1);
  }).toPass({ timeout: 10000 });
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
        "h1,h2,h3,h4,p,dt,dd,li,a,small,th,td,.ui-amount-value,.ui-badge",
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
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await routeApi(page, BASE.port);
  await login(page, BASE.dir);
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
  // AC02: la tabla no oculta IDs, contexto ni fuente de la cifra.
  const planGenericRow = plan
    .locator("tbody tr")
    .filter({ hasText: "18.000,00" })
    .first();
  await expect(planGenericRow).toContainText("E2.4 annualExecution");
  await expect(planGenericRow).toContainText("IDs:");
  await expect(planGenericRow).toContainText("contexto ejercicio 2026");

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
  // AC02: cada fila de realidad declara motor, IDs y contexto del Ciclo.
  const ingresosC007 = realidad
    .locator("tbody tr")
    .filter({ hasText: "Ingresos" })
    .first();
  await expect(ingresosC007).toContainText("E2.6 monthlyFlow");
  await expect(ingresosC007).toContainText("IDs:");
  await expect(ingresosC007).toContainText("contexto ciclo 7");

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
  await expect(patrimonio).toContainText("E4.4 getDeudaCompleta");
  const deuda = page.getByRole("article", { name: "Deuda E4.4" });
  await expect(deuda).toContainText("1.020,00 €");
  await expect(deuda).toContainText("PARCIAL");
  await expect(deuda).toContainText("Corte aplicado: 15/01/2027");

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
  await expectVisibleKeyboardFocus(page);

  const select = page.getByLabel("Cambiar tema");
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
      path: join(artifacts, `resumen-anual-${theme}-1440.png`),
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
      path: join(artifacts, `resumen-anual-${theme}-390.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });

  // AC22: ningún estado depende solo del color; icono y texto coexisten.
  const badges = page.locator(".e47-page .ui-badge[data-tipo='estado']");
  const badgeCount = await badges.count();
  expect(badgeCount).toBeGreaterThan(0);
  for (let index = 0; index < badgeCount; index += 1) {
    const badge = badges.nth(index);
    await expect(badge.locator(".ui-badge-icon")).toHaveCount(1);
    expect(await badge.getAttribute("data-estado")).toBeTruthy();
    expect((await badge.innerText()).trim().length).toBeGreaterThan(1);
  }

  // Foco visible también en 390.
  await page.setViewportSize({ width: 390, height: 844 });
  await expectVisibleKeyboardFocus(page);
  await page.setViewportSize({ width: 1440, height: 1000 });

  // N1: si la lectura de deuda falla, no se muestra «Corte aplicado».
  await page.route("**/api/resumen-anual*", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(BASE.port);
    const response = await route.fetch({ url: url.toString() });
    const json: any = await response.json();
    json.patrimonio.deuda = {
      ...json.patrimonio.deuda,
      estado: "No disponible",
      total: null,
      subtotal: null,
      corte: null,
      cobertura: {
        ...json.patrimonio.deuda.cobertura,
        estado: "NoDisponible",
        incluidos: 0,
        excluidos: 0,
        motivos: ["E4.4 no disponible: prueba de corte fallido."],
      },
      fuente: {
        ...json.patrimonio.deuda.fuente,
        motor: "E4.4 getDeudaCompleta",
        ids: [],
        revision: null,
      },
    };
    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      json,
    });
  });
  await page.reload();
  const deudaFallida = page.getByRole("article", { name: "Deuda E4.4" });
  await expect(deudaFallida).toContainText("NO DISPONIBLE");
  await expect(deudaFallida).not.toContainText("Corte aplicado");
  await expect(deudaFallida).not.toContainText("1.020,00 €");

  // AC20: si el alcance no incluye patrimonio, el bloque está ausente y el
  // resto del resumen conserva su lectura (sin inventar una cifra global).
  await page.unroute("**/api/resumen-anual*");
  await page.route("**/api/resumen-anual*", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(BASE.port);
    const response = await route.fetch({ url: url.toString() });
    const json: any = await response.json();
    json.patrimonio = null;
    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      json,
    });
  });
  await page.reload();
  await expect(
    page.locator("section[aria-labelledby='e47-patrimonio']"),
  ).toHaveCount(0);
  await expect(
    page.locator("section[aria-labelledby='e47-realidad']"),
  ).toContainText("2.250,00 €");
  await expect(page.locator(".e47-page")).not.toContainText("patrimonio neto");
  // AC19: el alcance Z-A declara visiblemente que el cociente no aplica.
  await expect(page.locator("#e47-pendientes")).toContainText(
    "No aplica mesesCubiertos",
  );

  expect(errors).toEqual([]);
});

test("AC23: sin datos no se convierte en 0,00 ni en filas inventadas", async ({
  page,
}) => {
  await routeApi(page, EMPTY.port);
  await login(page, EMPTY.dir);
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
  // AC20: sin corte comparable el patrimonio no fabrica cifras ni «Corte aplicado».
  const patrimonioVacio = page.locator(
    "section[aria-labelledby='e47-patrimonio']",
  );
  await expect(patrimonioVacio).toContainText(/no disponible/i);
  await expect(patrimonioVacio).not.toContainText("Corte aplicado");
  await expect(patrimonioVacio).not.toContainText("€");

  await resetScroll(page);
  await page.screenshot({
    path: join(artifacts, "resumen-anual-vacio-1440.png"),
    fullPage: true,
  });
});

test("AC23/24: error de fuente y sesión expirada sin cifras ni fugas", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await routeApi(page, ERROR.port);
  await login(page, ERROR.dir);
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

  // AC23: solo el carril afectado degrada; el resto conserva su lectura.
  await page.route("**/api/resumen-anual*", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(ERROR.port);
    const response = await route.fetch({ url: url.toString() });
    const json: any = await response.json();
    json.carriles.plan = {
      ...json.carriles.plan,
      estado: "No disponible",
      motivo: "E2.4 no disponible: prueba de degradación por carril.",
      items: [],
      cobertura: {
        ...json.carriles.plan.cobertura,
        estado: "NoDisponible",
        motivos: ["E2.4 no disponible: prueba de degradación por carril."],
      },
    };
    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      json,
    });
  });
  await page.reload();
  await expect(
    page.locator("section[aria-labelledby='e47-plan']"),
  ).toContainText("E2.4 no disponible");
  await expect(
    page.locator("section[aria-labelledby='e47-realidad']"),
  ).toContainText("2.250,00 €");
  await expect(
    page.locator("section[aria-labelledby='e47-realidad']"),
  ).toContainText("Ciclo 7");
  await expect(page.locator(".e47-page")).not.toContainText(
    /(?:^|\s)0,00 €/,
  );
  await page.unroute("**/api/resumen-anual*");

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

test("AC21: filtros funcionales y conservación al volver de un enlace", async ({
  page,
}) => {
  await routeApi(page, FILTERS.port);
  await login(page, FILTERS.dir);
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

  // AC21: activar el resto de enlaces y volver conservando la selección.
  const volverConFiltros = async () => {
    await expect(page).toHaveURL(/\/resumen-anual\?ejercicio=2026/);
    await expect(page).toHaveURL(/ciclo=8/);
    await expect(page).toHaveURL(/cobertura=Parcial/);
    await expect(ciclo).toHaveValue("8");
    await expect(cobertura).toHaveValue("Parcial");
    await expect(partida).toHaveValue(partidaValue!);
    await expect(
      page.getByRole("heading", { name: "Resumen anual", exact: true }),
    ).toBeVisible();
  };
  for (const target of [
    { section: "e47-prevision", name: "Ver Nómina", ruta: /\/nomina$/ },
    {
      section: "e47-realidad",
      name: "Ver flujo mensual del ciclo 8",
      ruta: /\/flujo-mensual\?ciclo=8$/,
    },
    { section: "e47-archivo", name: "Ver movimientos", ruta: /\/movimientos$/ },
    {
      section: "e47-patrimonio",
      name: "Ver inversiones",
      ruta: /\/inversiones$/,
    },
    { section: "e47-patrimonio", name: "Ver deudas", ruta: /\/deudas$/ },
  ]) {
    await page
      .locator(`section[aria-labelledby='${target.section}']`)
      .getByRole("link", { name: target.name, exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(target.ruta);
    await page.goBack();
    await volverConFiltros();
  }
});

test("AC25: descarta la respuesta antigua de una consulta retenida", async ({
  page,
}) => {
  await routeApi(page, CONCURRENCY.port);
  await login(page, CONCURRENCY.dir);
  await page.goto("/resumen-anual?ejercicio=2026");
  await expect(page.locator(".e47-context")).toContainText("2026");

  // Filtro secundario que debe sobrevivir al cambio de ejercicio.
  const cobertura = page.getByLabel("Cobertura", { exact: true });
  await cobertura.selectOption("Parcial");
  await expect(page).toHaveURL(/cobertura=Parcial/);

  let releaseFirst!: () => void;
  let firstStarted!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const firstStartedPromise = new Promise<void>((resolve) => {
    firstStarted = resolve;
  });
  let firstHeld = false;

  await page.route("**/api/resumen-anual*", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(CONCURRENCY.port);
    if (url.searchParams.get("ejercicio") === "2027") {
      firstHeld = true;
      firstStarted();
      const response = await route.fetch({ url: url.toString() });
      await firstGate;
      await route.fulfill({ response });
      return;
    }
    await route.fulfill({
      response: await route.fetch({ url: url.toString() }),
    });
  });

  const ejercicio = page.getByLabel("Ejercicio", { exact: true });
  await ejercicio.selectOption("2027");
  await firstStartedPromise;
  expect(firstHeld).toBe(true);
  await expect(page).toHaveURL(/ejercicio=2027/);

  // La segunda consulta (2028) termina antes de liberar la primera (2027).
  await ejercicio.selectOption("2028");
  await expect(page).toHaveURL(/ejercicio=2028/);
  await expect(page.getByLabel("Cobertura", { exact: true })).toHaveValue(
    "Parcial",
  );
  await expect(page.locator(".e47-empty-page")).toContainText(
    "Sin datos para este ejercicio",
  );
  await expect(
    page.locator("section[aria-labelledby='e47-plan']"),
  ).toContainText("Sin plan ni ejecución");
  await expect(page.locator(".e47-page")).not.toContainText("Ciclo 8");

  // Liberar la respuesta 2027 no debe sustituir la selección 2028.
  releaseFirst();
  await page.waitForTimeout(400);
  await expect(ejercicio).toHaveValue("2028");
  await expect(page).toHaveURL(/ejercicio=2028/);
  await expect(page).toHaveURL(/cobertura=Parcial/);
  await expect(page.getByLabel("Cobertura", { exact: true })).toHaveValue(
    "Parcial",
  );
  await expect(page.locator(".e47-empty-page")).toContainText(
    "Sin datos para este ejercicio",
  );
  await expect(page.locator(".e47-page")).not.toContainText("Ciclo 8");
  await expect(
    page.locator("section[aria-labelledby='e47-plan']"),
  ).not.toContainText("18.000,00 €");
});
