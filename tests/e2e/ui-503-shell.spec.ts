import { test, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * #503 — shell compacto: selector de tema al ancho del catálogo y un único
 * indicador de entorno por breakpoint.
 *
 * Recorrido real sobre el artefacto construido (`bun run build`): un fixture
 * propio levanta la API con SQLite ficticio y sirve `apps/web/dist` con proxy
 * `/api` en **los puertos del contexto de la ejecución** (#508), de modo que no
 * depende del servidor de desarrollo de 5173 ni de la API de 3001. Los puertos
 * se leen de `E2E_WEB_PORT`/`E2E_API_PORT`, que publica el contexto de la
 * ejecución; si la spec arranca sin ellos falla de forma explícita en vez de
 * caer a un puerto fijo. Cada ejecución provisiona una única cuenta nueva en
 * `.local/e2e-shell` (el fixture borra el directorio).
 *
 * Comprueba, a 1440 y a 390:
 *  - el encabezado muestra solo el `select` (sin texto suelto ni etiqueta encima);
 *  - el ancho del selector lo fija el catálogo, no una medida fija de 9rem;
 *  - la altura es compacta en escritorio con puntero fino (36–38 px); el CSS
 *    excluye cualquier puntero grueso (`not (any-pointer: coarse)`), así que en
 *    móvil, con emulación táctil aislada a ancho de escritorio y en equipos
 *    híbridos se conserva el objetivo de 44 px, sin recortar texto, flecha ni
 *    anillo de foco;
 *  - exactamente UN indicador de entorno visible por anchura, contado por
 *    visibilidad real en el DOM (no por presencia);
 *  - sin scroll horizontal;
 *  - foco visible y nombre accesible que incluye «tema»;
 *  - los seis temas cambian y persisten en `mf-theme`.
 */

// #508 — puertos propios de la ejecución: `playwright.config.ts` publica
// `E2E_WEB_PORT` y `E2E_API_PORT` en el entorno de las specs. Sin ellos la spec
// falla de forma explícita: ni literales 5291/3041 ni caída silenciosa a
// 5173/3001.
function requiredPort(name: "E2E_WEB_PORT" | "E2E_API_PORT"): number {
  const raw = process.env[name];
  const port = Number(raw);
  if (!raw || !Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(
      `Falta un puerto E2E válido (${name}): la ejecución debe arrancar con el contexto de #508.`,
    );
  return port;
}

const WEB_PORT = requiredPort("E2E_WEB_PORT");
const API_PORT = requiredPort("E2E_API_PORT");
const BASE = `http://127.0.0.1:${WEB_PORT}`;
const API_HEALTH = `http://127.0.0.1:${API_PORT}/api/health`;
const DIR = ".local/e2e-shell";
const SHOTS = "artifacts/ui-503";
const ENV_TOKEN = "TEST";
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
        E2E_WEB_PORT: String(WEB_PORT),
        E2E_API_PORT: String(API_PORT),
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

/**
 * Métricas reales del selector: caja, `min-height` aplicado y alto de cabecera.
 * Con ellas se comprueba que el contenido cabe (sin recorte) y que el anillo de
 * foco (outline + offset = 6 px por lado) no se sale del encabezado.
 */
async function selectMetrics(page: Page) {
  return page.evaluate(() => {
    const element = document.querySelector<HTMLSelectElement>(
      ".theme-picker select",
    )!;
    const style = getComputedStyle(element);
    const fontSize = parseFloat(style.fontSize);
    // El `select` nativo resuelve `line-height: normal` (no un px): se usa un
    // factor conservador sobre el tamaño de fuente para no dar por bueno un
    // recorte que sí existe.
    const declaredLineHeight = parseFloat(style.lineHeight);
    return {
      height: element.getBoundingClientRect().height,
      minHeight: style.minHeight,
      fontSize,
      lineHeight: Number.isFinite(declaredLineHeight)
        ? declaredLineHeight
        : fontSize * 1.5,
      paddingBlock:
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
      borderBlock:
        parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth),
      headerHeight: document
        .querySelector(".global-header")!
        .getBoundingClientRect().height,
    };
  });
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
 * Decisión final: el encabezado muestra **solo** el `select` con el tema actual.
 * No hay texto visible «Tema», pero sí nombre accesible y foco visible.
 */
async function expectSelectOnly(page: Page, minHeight = 0) {
  const select = page.getByLabel("Cambiar tema");
  await expect(select).toBeVisible();
  await expect(page.locator(".theme-picker-label")).toHaveCount(0);
  const picker = page.locator(".theme-picker");
  await expect(picker).toHaveCount(1);
  const box = (await select.boundingBox())!;
  const host = (await picker.boundingBox())!;
  // Sin etiqueta a la izquierda: el control ocupa el ancho disponible del host.
  expect(box.width).toBeGreaterThan(host.width - 2);
  expect(box.height).toBeGreaterThanOrEqual(minHeight);
  // Sin texto suelto ni elementos de etiqueta: solo el select.
  expect(await picker.locator("span, p, strong, b, em").count()).toBe(0);
  expect(
    await picker.evaluate(
      (element) =>
        Array.from(element.childNodes).filter(
          (node) =>
            node.nodeType === Node.TEXT_NODE &&
            (node.textContent ?? "").trim().length > 0,
        ).length,
    ),
  ).toBe(0);
  // El valor visible es el nombre del tema activo (lo fija el catálogo).
  await expect(select).toHaveValue(/light-s|dark-s|hybrid-s|graphite-lime|casa|aurora/);
  return { selectBox: box, hostBox: host };
}

test("#503 selector de tema sin etiqueta visible y un solo indicador de entorno", async ({
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
  await expect(page.locator(".theme-picker-label")).toHaveCount(0);

  // ── 1440 ────────────────────────────────────────────────────────────────
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { selectBox } = await expectSelectOnly(page, 36);
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
  // Altura compacta en escritorio con puntero fino (objetivo 36–38 px) y sin
  // recortar la opción más larga («Graphite Lime»).
  expect(selectBox.height).toBeGreaterThanOrEqual(36);
  expect(selectBox.height).toBeLessThanOrEqual(38);
  const deskMetrics = await selectMetrics(page);
  expect(deskMetrics.minHeight).toBe("38px");
  // El contenido (línea, padding y bordes) cabe en la caja: nada se recorta.
  expect(
    deskMetrics.lineHeight + deskMetrics.paddingBlock + deskMetrics.borderBlock,
  ).toBeLessThanOrEqual(selectBox.height);
  // La cabecera aloja el control con su anillo de foco (6 px por lado).
  expect(deskMetrics.headerHeight).toBeGreaterThanOrEqual(
    selectBox.height + 12,
  );
  const optionWidth = await page.evaluate(() => {
    const element = document.querySelector<HTMLSelectElement>(
      ".theme-picker select",
    )!;
    return element.scrollWidth - element.clientWidth;
  });
  expect(optionWidth).toBeLessThanOrEqual(0);

  // La compactación está condicionada en el propio CSS a la ausencia de
  // cualquier puntero grueso; Chromium no permite emular esa combinación
  // (fino + táctil a la vez), así que se verifica sobre el CSS servido.
  const themePickerRules = await page.evaluate(() => {
    const found: { media: string; minHeight: string }[] = [];
    const walk = (rules: CSSRuleList, media = "") => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSMediaRule) {
          const condition = media
            ? `${media} :: ${rule.conditionText}`
            : rule.conditionText;
          walk(rule.cssRules, condition);
          continue;
        }
        if (
          rule instanceof CSSStyleRule &&
          rule.selectorText === ".theme-picker select"
        ) {
          found.push({ media, minHeight: rule.style.minHeight });
        }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        walk(sheet.cssRules);
      } catch {
        // Hojas de otro origen: no existen en este artefacto.
      }
    }
    return found;
  });
  const compactIndex = themePickerRules.findIndex(
    (rule) =>
      rule.media.includes("pointer:") &&
      rule.media.includes("fine") &&
      rule.media.includes("761px"),
  );
  expect(compactIndex).toBeGreaterThanOrEqual(0);
  expect(themePickerRules[compactIndex].minHeight).toBe("38px");
  // La misma regla excluye cualquier puntero grueso (equipos híbridos).
  expect(themePickerRules[compactIndex].media).toContain("any-pointer");
  expect(themePickerRules[compactIndex].media).toContain("coarse");

  // Con entrada táctil a ancho de escritorio (tableta) NO se compacta: el
  // objetivo interactivo sigue en 44 px. La emulación se hace en una pestaña
  // aislada del mismo contexto (cookies y `localStorage` compartidos) porque en
  // Chromium Linux desactivar `Emulation.setTouchEmulationEnabled` no siempre
  // devuelve `pointer: fine`, y esta página debe quedarse intacta.
  const touchPage = await page.context().newPage();
  const touchCdp = await page.context().newCDPSession(touchPage);
  await touchCdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  await touchPage.goto(`${BASE}/saldos`);
  await expect(
    touchPage.getByRole("heading", { name: "Saldos", exact: true }),
  ).toBeVisible();
  const touchMetrics = await selectMetrics(touchPage);
  expect(
    await touchPage.evaluate(() => ({
      primary: matchMedia("(pointer: coarse)").matches,
      any: matchMedia("(any-pointer: coarse)").matches,
    })),
  ).toEqual({ primary: true, any: true });
  expect(touchMetrics.minHeight).toBe("44px");
  expect(touchMetrics.height).toBeGreaterThanOrEqual(44);
  console.log(
    `#503 alto del select a 1440: puntero fino ${selectBox.height}px; táctil ${touchMetrics.height}px`,
  );
  await touchPage.close();
  // La página principal nunca cambió de puntero: sigue fina y compacta.
  expect(
    await page.evaluate(() => ({
      fine: matchMedia("(pointer: fine)").matches,
      anyCoarse: matchMedia("(any-pointer: coarse)").matches,
    })),
  ).toEqual({ fine: true, anyCoarse: false });
  expect((await selectMetrics(page)).minHeight).toBe("38px");

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
    // La altura compacta no depende del tema (Graphite Lime incluido).
    const themed = await expectSelectOnly(page, 36);
    expect(themed.selectBox.height).toBeLessThanOrEqual(38);
    await expectNoHorizontalScroll(page);
    await expectSingleEnvIndicator(page, "sidebar-bottom");
    // Evidencia de la opción más larga («Graphite Lime») con la altura compacta.
    if (id === "graphite-lime") {
      await page.screenshot({
        path: `${SHOTS}/theme-graphite-lime-1440.png`,
        fullPage: false,
      });
    }
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    await expect(select).toHaveValue(id);
    await expectSelectOnly(page);
  }
  await page.screenshot({ path: `${SHOTS}/theme-casa-1440.png`, fullPage: false });

  // ── 390 (menú móvil cerrado) ────────────────────────────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".sidebar nav")).toBeHidden();
  const mobile = await expectSelectOnly(page, 44);
  // En móvil se recupera el objetivo táctil completo, más alto que escritorio.
  expect(mobile.selectBox.height).toBeGreaterThanOrEqual(44);
  expect(mobile.selectBox.height).toBeGreaterThan(selectBox.height);
  expect((await selectMetrics(page)).minHeight).toBe("44px");
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