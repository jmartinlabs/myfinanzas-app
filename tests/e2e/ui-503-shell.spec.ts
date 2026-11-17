import { test, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * #503 — shell compacto: selector de tema al ancho del catálogo, etiqueta
 * «Tema» en la misma línea y un único indicador de entorno por breakpoint.
 *
 * Recorrido real sobre el artefacto construido (`bun run build`): un fixture
 * propio levanta la API con SQLite ficticio en 3041 y sirve `apps/web/dist` con
 * proxy `/api` en 5291 (`E2E_WEB_PORT`), de modo que no depende del servidor de
 * desarrollo de 5173 ni de la API de 3001. Cada ejecución provisiona una única
 * cuenta nueva en `.local/e2e-shell` (el fixture borra el directorio).
 *
 * Comprueba, a 1440 y a 390:
 *  - «Tema» y el `select` comparten línea base (la etiqueta no queda encima);
 *  - el ancho del selector lo fija el catálogo, no una medida fija de 9rem;
 *  - exactamente UN indicador de entorno visible por anchura, contado por
 *    visibilidad real en el DOM (no por presencia);
 *  - sin scroll horizontal;
 *  - foco visible y nombre accesible que incluye «tema»;
 *  - los seis temas cambian y persisten en `mf-theme`.
 */

const BASE = process.env.E2E_SHELL_BASE ?? "http://127.0.0.1:5291";
const DIR = ".local/e2e-shell";
const SHOTS = "artifacts/ui-503";
const ENV_TOKEN = "TEST";
const API_HEALTH = "http://127.0.0.1:3041/api/health";
let child: ChildProcess | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/shell-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        APP_ENV: ENV_TOKEN,
        E2E_WEB_PORT: String(new URL(BASE).port),
      },
    },
  );
  await expect
    .poll(
      async () => {
        try {
          return (await request.get(API_HEALTH)).status();
        } catch {
          return 0;
        }
      },
      { timeout: 30000 },
    )
    .toBe(200);
  // El artefacto tiene que estar servido antes de navegar.
  await expect
    .poll(
      async () => {
        try {
          return (await request.get(`${BASE}/saldos`)).status();
        } catch {
          return 0;
        }
      },
      { timeout: 15000 },
    )
    .toBe(200);
});

test.afterAll(() => {
  child?.kill();
});

async function login(page: Page) {
  await page.goto(`${BASE}/saldos`);
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(`${DIR}/bootstrap.txt`, "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia shell " + randomUUID());
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
    page.getByRole("heading", { name: "Saldos", exact: true }),
  ).toBeVisible();
}

/**
 * Indicadores de entorno realmente visibles: se exige `display`/`visibility`
 * efectivos y caja con tamaño, no la mera presencia en el DOM. `.local-badge`
 * (cabecera) ya no debe existir ni una vez.
 */
async function visibleEnvIndicators(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden")
        return false;
      if (style.opacity === "0") return false;
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
    return Array.from(
      document.querySelectorAll(".sidebar-bottom, .app-version-env, .local-badge"),
    )
      .filter(visible)
      .map((element) => `${element.className}: ${(element.textContent ?? "").trim()}`);
  });
}

async function expectSingleEnvIndicator(
  page: Page,
  owner: "sidebar-bottom" | "app-version-env",
): Promise<string> {
  // El pie pinta su entorno cuando resuelve `GET /api/version`; se espera al
  // estado estable (exactamente uno) en vez de leer una foto intermedia.
  await expect
    .poll(async () => (await visibleEnvIndicators(page)).length, {
      timeout: 10000,
    })
    .toBe(1);
  const indicators = await visibleEnvIndicators(page);
  expect(indicators).toHaveLength(1);
  expect(indicators[0]).toContain(owner);
  return indicators[0];
}

async function expectNoHorizontalScroll(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    )
    .toBeLessThanOrEqual(0);
}

/**
 * «Tema» y el `select` comparten línea: la etiqueta no está encima ni suelta,
 * está a la izquierda y con el mismo centro vertical.
 */
async function expectLabelInlineWithSelect(page: Page) {
  const label = page.locator(".theme-picker-label");
  const select = page.getByLabel("Cambiar tema");
  await expect(label).toBeVisible();
  await expect(select).toBeVisible();
  const labelBox = (await label.boundingBox())!;
  const selectBox = (await select.boundingBox())!;
  expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(
    selectBox.y + selectBox.height,
  );
  expect(labelBox.y).toBeGreaterThanOrEqual(selectBox.y);
  expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(selectBox.x + 1);
  const labelCenter = labelBox.y + labelBox.height / 2;
  const selectCenter = selectBox.y + selectBox.height / 2;
  expect(Math.abs(labelCenter - selectCenter)).toBeLessThanOrEqual(4);
  // Ni el control ni la etiqueta se recortan: el texto visible está entero.
  expect(labelBox.width).toBeGreaterThan(0);
  return { labelBox, selectBox };
}

test("#503 selector compacto, etiqueta «Tema» y un solo indicador de entorno", async ({
  page,
}) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);

  const select = page.getByLabel("Cambiar tema");
  // Nombre accesible único que contiene el texto visible «Tema» (label-in-name).
  await expect(page.getByRole("combobox", { name: /tema/i })).toHaveCount(1);
  await expect(select).toHaveAttribute("aria-label", /tema/i);
  await expect(page.locator(".local-badge")).toHaveCount(0);
  await expect(page.locator(".theme-picker-label")).toHaveText("Tema");

  // ── 1440 ────────────────────────────────────────────────────────────────
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { selectBox } = await expectLabelInlineWithSelect(page);
  const afterWidth = selectBox.width;
  const rootFontSize = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).fontSize),
  );
  // Antes: `width: 9rem` fijo. Se mide el mismo control con la regla anterior
  // aplicada, no un número supuesto.
  await page.addStyleTag({
    content: "html .theme-picker select { width: 9rem; }",
  });
  const beforeWidth = (await select.boundingBox())!.width;
  await page.evaluate(() => {
    document.querySelectorAll("style").forEach((style) => {
      if (style.textContent?.includes("9rem")) style.remove();
    });
  });
  mkdirSync(SHOTS, { recursive: true });
  expect(beforeWidth).toBeCloseTo(9 * rootFontSize, 0);
  expect(afterWidth).toBeLessThan(beforeWidth);
  console.log(
    `#503 ancho del select a 1440: antes ${beforeWidth}px (9rem), después ${afterWidth}px; alto ${selectBox.height}px`,
  );
  // Alto intacto (área táctil >= 44 px) y sin recortar la opción más larga.
  expect(selectBox.height).toBeGreaterThanOrEqual(44);
  const optionWidth = await page.evaluate(() => {
    const element = document.querySelector<HTMLSelectElement>(
      ".theme-picker select",
    )!;
    return element.scrollWidth - element.clientWidth;
  });
  expect(optionWidth).toBeLessThanOrEqual(0);
  const tapHeight = await page.evaluate(
    () =>
      getComputedStyle(
        document.querySelector(".theme-picker select") as Element,
      ).minHeight,
  );
  expect(tapHeight).toBe("44px");

  // Un solo indicador de entorno: el del final de la navegación.
  const deskIndicator = await expectSingleEnvIndicator(page, "sidebar-bottom");
  // El entorno sale del servidor (`APP_ENV=TEST` en el fixture), no del host.
  expect(deskIndicator).toContain("TEST · Entorno de pruebas");
  await expect(page.locator(".app-version-env")).toBeHidden();
  await expectNoHorizontalScroll(page);
  await page.screenshot({ path: `${SHOTS}/shell-1440.png`, fullPage: false });

  // Foco visible con teclado.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  let reachable = false;
  for (let step = 0; step < 40 && !reachable; step += 1) {
    await page.keyboard.press("Tab");
    reachable = await page.evaluate(
      () =>
        document.activeElement?.classList.contains("theme-picker") ||
        document.activeElement ===
          document.querySelector(".theme-picker select"),
    );
  }
  expect(reachable).toBe(true);
  const focusStyle = await page.evaluate(() => {
    const element = document.querySelector(".theme-picker select") as Element;
    const style = getComputedStyle(element);
    return {
      matches: element.matches(":focus-visible"),
      width: parseFloat(style.outlineWidth),
      style: style.outlineStyle,
    };
  });
  expect(focusStyle.matches).toBe(true);
  expect(focusStyle.width).toBeGreaterThanOrEqual(2);
  expect(focusStyle.style).not.toBe("none");
  await page.screenshot({ path: `${SHOTS}/focus-1440.png`, fullPage: false });

  // Los seis temas cambian de inmediato y persisten en `mf-theme`.
  for (const id of [
    "light-s",
    "dark-s",
    "hybrid-s",
    "graphite-lime",
    "casa",
    "aurora",
  ]) {
    await select.selectOption(id);
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    expect(
      await page.evaluate(() => localStorage.getItem("mf-theme")),
    ).toBe(id);
    await expectLabelInlineWithSelect(page);
    await expectNoHorizontalScroll(page);
    await expectSingleEnvIndicator(page, "sidebar-bottom");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    await expect(select).toHaveValue(id);
    await expectLabelInlineWithSelect(page);
  }
  await page.screenshot({ path: `${SHOTS}/theme-casa-1440.png`, fullPage: false });

  // ── 390 (menú móvil cerrado) ────────────────────────────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".sidebar nav")).toBeHidden();
  const mobile = await expectLabelInlineWithSelect(page);
  expect(mobile.selectBox.height).toBeGreaterThanOrEqual(44);
  expect(mobile.selectBox.width).toBeLessThanOrEqual(390);
  const mobileIndicator = await expectSingleEnvIndicator(
    page,
    "app-version-env",
  );
  expect(mobileIndicator).toContain(ENV_TOKEN);
  await expect(page.locator(".sidebar-bottom")).toBeHidden();
  await expectNoHorizontalScroll(page);
  await page.screenshot({ path: `${SHOTS}/shell-390.png`, fullPage: false });

  // Persistencia también en móvil: el valor sobrevive a la recarga.
  await select.selectOption("dark-s");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark-s");
  await page.reload();
  await expect(select).toHaveValue("dark-s");
  await expectSingleEnvIndicator(page, "app-version-env");

  // ── Una sola fuente de entorno: el valor servido por /api/version ────────
  // Se recorren los cuatro entornos y el fallo de la fuente sin tocar el
  // backend: el front no debe inferir «Local» ni «Datos ficticios» por host.
  const entornos: [string, string][] = [
    ["DEMO", "DEMO · Datos ficticios"],
    ["DEV", "DEV · Desarrollo"],
    ["TEST", "TEST · Entorno de pruebas"],
    ["PROD", "PROD"],
  ];
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [environment, esperado] of entornos) {
    await page.route("**/api/version", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          app: { version: "0.2.0", sha: "a1b2c3d4e5f6", label: "release" },
          environment,
          schema: 31,
        }),
      }),
    );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Saldos", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".sidebar-bottom")).toContainText(esperado);
    await page.unroute("**/api/version");
  }
  // Sin fuente fiable no se inventa entorno.
  await page.route("**/api/version", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Saldos", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sidebar-bottom")).toContainText(
    "Entorno no disponible",
  );
  await page.unroute("**/api/version");
  await page.reload();
  await expect(page.locator(".sidebar-bottom")).toContainText(
    "TEST · Entorno de pruebas",
  );

  expect(errors).toEqual([]);
});