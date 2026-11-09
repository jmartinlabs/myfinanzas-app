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
import {
  DEV07_THEMES,
  DEV07_VIEWPORTS,
  auditKeyboard,
  auditReducedMotion,
  auditViewport,
  measureOverflow,
  sampleFocusRing,
  setDetailsOpen,
  setTheme,
  type Dev07Theme,
  type FocusRingReport,
  type KeyboardReport,
  type MotionReport,
  type ScreenViewportAudit,
} from "./ui-dev07-audit";

/**
 * UI DEV-07 · I4 — matriz de evidencia y aserciones AA (solo test).
 *
 * I3 (auditoría de línea base sobre `ba24c29`, I2 fusionado) no encontró
 * residuo de producto: contraste, texto, objetivos, overflow, foco, teclado y
 * movimiento reducido cumplen en las cinco pantallas. El único hueco medido es
 * el segmento interno del control nativo `input[type=date]` de Chromium, que no
 * es corregible desde CSS del documento; se aísla con
 * `nativeDateShadowFocus` y se compensa verificando que el host sí dibuja el
 * anillo al enfocarse.
 *
 * Esta spec produce 30 capturas base (5 pantallas × 3 temas × 1440/390) y 15
 * críticas (un estado por pantalla y tema), y convierte las comprobaciones en
 * aserciones duras. Forma parte del E2E normal (`bun run test:e2e`), igual que
 * las specs de evidencia de DEV-05.
 *
 * `720×500` no es zoom nativo: es la equivalencia de viewport a 200 % sobre
 * 1440×1000 declarada en el paquete DEV-07.
 */

const BASE_OUT = "artifacts/ui-dev07/base";
const CRITICAL_OUT = "artifacts/ui-dev07/critical";

const INICIO_PORT = 3014;
const ZERO_PORT = 3015;
const THEME_PORT = 3013;
const CIERRE_LISTO_PORT = 3031;
const CIERRE_BLOQUEADO_PORT = 3034;

type ServerSpec = {
  id: string;
  script: string;
  port: number;
  env?: Record<string, string>;
};

const SERVERS: readonly ServerSpec[] = [
  {
    id: "theme",
    script: "apps/api/test-support/theme-server.ts",
    port: THEME_PORT,
  },
  {
    id: "inicio",
    script: "apps/api/test-support/inicio-server.ts",
    port: INICIO_PORT,
  },
  {
    id: "inicio-zero",
    script: "apps/api/test-support/inicio-server.ts",
    port: ZERO_PORT,
    env: { E46_SCENARIO: "zero" },
  },
  {
    id: "cierre-listo",
    script: "apps/api/test-support/cierre-server.ts",
    port: CIERRE_LISTO_PORT,
    env: { E49_SCENARIO: "listo", E49_PORT: String(CIERRE_LISTO_PORT) },
  },
  {
    id: "cierre-bloqueado",
    script: "apps/api/test-support/cierre-server.ts",
    port: CIERRE_BLOQUEADO_PORT,
    env: {
      E49_SCENARIO: "bloqueado",
      E49_PORT: String(CIERRE_BLOQUEADO_PORT),
    },
  },
];

const active: ChildProcess[] = [];

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
      { timeout: 30000 },
    )
    .toBe(200);
}

async function startServer(request: APIRequestContext, spec: ServerSpec) {
  const child = spawn(process.env.BUN_BIN ?? "bun", [spec.script], {
    stdio: "pipe",
    env: { ...process.env, NODE_ENV: "test", ...spec.env },
  });
  active.push(child);
  await waitForApi(request, spec.port).catch((error) => {
    child.kill();
    throw error;
  });
  return child;
}

async function routeApi(page: Page, port: number) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(port);
    try {
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    } catch {
      // Una navegación puede cancelar una petición en vuelo.
    }
  });
}

async function login(page: Page, dir: string, path: string) {
  await page.goto(path);
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(`${dir}/bootstrap.txt`, "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia DEV-07 I4 " + randomUUID());
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
}

/** Espera web-first: sin timeouts fijos y sin ocultar animaciones en curso. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    const frame = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    await frame();
    await frame();
    for (let round = 0; round < 3; round += 1) {
      const running = document.getAnimations().filter((animation) => {
        if (animation.playState !== "running") return false;
        const timing = animation.effect?.getComputedTiming();
        return timing?.iterations !== Infinity;
      });
      if (running.length === 0) break;
      await Promise.all(
        running.map((animation) =>
          animation.finished.catch(() => undefined),
        ),
      );
      await frame();
    }
  });
}

async function waitForScreenReady(page: Page, screen: string) {
  await expect(
    page
      .locator('#main [role="status"]')
      .filter({ hasText: /Cargando/i }),
  ).toHaveCount(0);
  if (screen === "inicio") {
    await expect(page.locator(".inicio-context")).toBeVisible();
    await expect(page.locator(".inicio-metric").first()).toBeVisible();
  } else if (screen === "movimientos") {
    await expect(page.locator(".movements-list")).toBeVisible();
    await expect(
      page.locator(".movements-list .list-toolbar [role='status']"),
    ).toContainText(/\d+ movimientos/);
    await expect
      .poll(
        async () =>
          (await page.locator(".desktop-list tbody tr").count()) +
          (await page.locator(".movements-cards > li").count()),
      )
      .toBeGreaterThan(0);
  } else if (screen === "saldo-ficha") {
    await expect(page.locator(".position-panel")).toBeVisible();
  } else if (screen === "saldo-form") {
    await expect(page.locator("form.saldo-form")).toBeVisible();
    await expect(page.locator("#nombre")).toBeVisible();
  } else if (screen === "cierre") {
    await expect(page.locator(".cierre-e49-status")).toBeVisible();
    await expect(page.getByLabel("Ciclo")).toHaveValue("1");
    await expect(
      page.getByText("Listo", { exact: true }).first(),
    ).toBeVisible();
  }
}

function describeOverflow(report: { offenders: { selector: string }[] }) {
  return JSON.stringify(report.offenders);
}

/** Aserciones duras de contraste AA, overflow, objetivos y texto. */
function assertViewportAudit(screen: string, audit: ScreenViewportAudit) {
  const label = `${screen}/${audit.viewport}/${audit.theme}`;

  expect(audit.contrast.checked, `${label}: sin texto medido`).toBeGreaterThan(
    0,
  );
  if (audit.contrast.minNormal !== null) {
    expect(
      audit.contrast.minNormal,
      `${label}: texto normal ${audit.contrast.minEntry?.selector} ${audit.contrast.minEntry?.ratio}`,
    ).toBeGreaterThanOrEqual(4.5);
  }
  if (audit.contrast.minLarge !== null) {
    expect(
      audit.contrast.minLarge,
      `${label}: texto grande ${audit.contrast.minEntry?.selector} ${audit.contrast.minEntry?.ratio}`,
    ).toBeGreaterThanOrEqual(3);
  }
  expect(
    audit.contrast.failures,
    `${label}: fallos de contraste`,
  ).toEqual([]);
  expect(
    audit.contrast.unresolved,
    `${label}: fondos no resueltos`,
  ).toEqual([]);

  // Details cerrados (estado por defecto) y abiertos (contenido plegado).
  expect(
    audit.overflow.pageOverflow,
    `${label}: overflow con details cerrados ${describeOverflow(audit.overflow)}`,
  ).toBe(false);
  expect(
    audit.overflowExpanded,
    `${label}: falta la medición con details abiertos`,
  ).toBeDefined();
  expect(
    audit.overflowExpanded!.pageOverflow,
    `${label}: overflow con details abiertos ${describeOverflow(audit.overflowExpanded!)}`,
  ).toBe(false);

  // Allowlist explícita: solo enlaces en prosa/celda pueden medir < 44 px.
  const nonInline = audit.targets.filter((target) => !target.inlineProse);
  expect(
    nonInline,
    `${label}: objetivos no-inline < 44 px`,
  ).toEqual([]);
  for (const target of audit.targets) {
    expect(target.inlineProse, `${label}: ${target.selector}`).toBe(true);
    expect(target.tag, `${label}: ${target.selector}`).toBe("a");
    expect(target.scope, `${label}: ${target.selector}`).toBe("main");
  }

  // Ningún texto funcional < 12 px en `main`; la tagline decorativa se permite.
  const functional = audit.smallText.filter(
    (item) => item.classification === "functional",
  );
  expect(functional, `${label}: texto funcional < 12 px`).toEqual([]);
  for (const item of audit.smallText) {
    expect(item.classification, `${label}: ${item.selector}`).toBe(
      "decorative",
    );
  }
  for (const item of audit.smallText.filter(
    (entry) => entry.text === "CONTROL FINANCIERO PERSONAL",
  )) {
    expect(item.classification, `${label}: tagline`).toBe("decorative");
  }
}

function assertKeyboard(
  screen: string,
  viewport: string,
  report: KeyboardReport,
) {
  const label = `${screen}/teclado/${viewport}`;
  expect(report.stopCount, `${label}: sin paradas`).toBeGreaterThan(0);
  expect(report.trapped, `${label}: trampa de teclado`).toBe(false);
  expect(report.stops[0]?.selector, `${label}: skip link no es el primero`)
    .toContain("skip-link");
  expect(report.lowRingContrast, `${label}: anillo < 3`).toEqual([]);

  const missing = report.missingVisibleFocus.filter(
    (stop) => !stop.nativeDateShadowFocus,
  );
  expect(missing, `${label}: paradas sin foco visible`).toEqual([]);
  for (const stop of report.missingVisibleFocus) {
    // Única excepción admitida: el segmento interno del date nativo de
    // Chromium, donde el host no recibe :focus. El anillo del host se
    // comprueba aparte con sampleFocusRing.
    expect(stop.nativeDateShadowFocus, `${label}: ${stop.selector}`).toBe(
      true,
    );
    expect(stop.tag, `${label}: ${stop.selector}`).toBe("input");
    expect(stop.inputType, `${label}: ${stop.selector}`).toBe("date");
    expect(screen, `${label}: excepción fuera del formulario`).toBe(
      "saldo-form",
    );
  }
}

function assertFocusRings(
  screen: string,
  viewport: string,
  theme: Dev07Theme,
  report: FocusRingReport[],
) {
  const label = `${screen}/foco/${viewport}/${theme}`;
  const matched = report.filter((item) => item.matched);
  expect(matched.length, `${label}: sin anillos muestreados`).toBeGreaterThan(
    0,
  );
  for (const item of matched) {
    expect(item.visible, `${label}: ${item.selector}`).toBe(true);
    expect(item.ratio, `${label}: ${item.selector}`).not.toBeNull();
    expect(
      item.ratio!,
      `${label}: ${item.selector} = ${item.ratio}`,
    ).toBeGreaterThanOrEqual(3);
  }
  expect(
    report.find((item) => item.selector === ".skip-link")?.matched,
    `${label}: skip link no muestreado`,
  ).toBe(true);
  const navigation = viewport === "1440" ? ".nav-link" : ".menu-toggle";
  const nav = report.find((item) => item.selector === navigation);
  expect(nav?.matched, `${label}: ${navigation} no muestreado`).toBe(true);
  expect(
    nav!.ratio!,
    `${label}: ${navigation} = ${nav!.ratio}`,
  ).toBeGreaterThanOrEqual(3);
}

function assertMotion(screen: string, report: MotionReport | null) {
  expect(report, `${screen}: sin medición de movimiento reducido`).not.toBeNull();
  expect(report!.reduceMatches, `${screen}: reduce no emulado`).toBe(true);
  expect(
    report!.transitions,
    `${screen}: transición con reduce`,
  ).toEqual([]);
  expect(report!.animations, `${screen}: animación con reduce`).toEqual([]);
}

async function assertSkipLink(page: Page, screen: string, viewport: string) {
  const label = `${screen}/skip/${viewport}`;
  const skip = page.getByRole("link", {
    name: "Saltar al contenido",
    exact: true,
  });
  await skip.focus();
  await expect(skip, `${label}: skip link oculto`).toBeVisible();
  await page.keyboard.press("Enter");
  // El shell enfoca el `h1` tras cargar datos; el contrato del skip link es
  // mover el foco dentro de `main`, no necesariamente al contenedor.
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const main = document.getElementById("main");
          return Boolean(
            main &&
              (document.activeElement === main ||
                main.contains(document.activeElement)),
          );
        }),
      { message: `${label}: el foco no entra en #main` },
    )
    .toBe(true);
}

/** Zoom 200 % (viewport equivalente 720): el menú móvil sigue operativo. */
async function assertZoomMenu(page: Page, screen: string) {
  const label = `${screen}/720`;
  const toggle = page.getByRole("button", {
    name: "Abrir menú",
    exact: true,
  });
  await expect(toggle, `${label}: sin botón de menú`).toBeVisible();
  await toggle.click();
  const nav = page.getByRole("navigation");
  await expect(nav, `${label}: menú no abre`).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cerrar menú", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nav, `${label}: menú no cierra`).toBeHidden();
  await expect(toggle, `${label}: foco no vuelve`).toBeFocused();
}

async function prepareShot(page: Page) {
  await setDetailsOpen(page, false);
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => resolve()),
      ),
    );
  });
  await settle(page);
}

async function shot(page: Page, directory: string, name: string) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
    `${directory}/${name}: scroll horizontal`,
  ).toBe(true);
  mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
}

const WIDTH_NAME: Record<string, string> = {
  "1440": "1440x1000",
  "390": "390x844",
};

/** Auditoría completa + capturas base de una pantalla. */
async function auditAndCapture(
  page: Page,
  screen: string,
  path: string,
  heading: string,
  options: { navigate?: boolean } = {},
) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (options.navigate !== false) await page.goto(path);
  await expect(
    page.getByRole("heading", { name: heading, exact: true }).first(),
  ).toBeVisible();
  await waitForScreenReady(page, screen);
  await settle(page);

  for (const viewport of DEV07_VIEWPORTS) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await waitForScreenReady(page, screen);
    await setDetailsOpen(page, false);
    const defaultOverflow = await measureOverflow(page);
    for (const theme of DEV07_THEMES) {
      await setTheme(page, theme);
      await settle(page);
      const audit = await auditViewport(
        page,
        theme,
        viewport.id,
        "body",
        { expandDetails: true, defaultOverflow },
      );
      assertViewportAudit(screen, audit);
    }
    await setDetailsOpen(page, false);
    if (viewport.id === "720") await assertZoomMenu(page, screen);
  }

  for (const viewport of DEV07_VIEWPORTS.filter(
    (item) => item.id !== "720",
  )) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await setTheme(page, "dark-s");
    await settle(page);
    const keyboard = await auditKeyboard(page, 90);
    assertKeyboard(screen, viewport.id, keyboard);
    for (const theme of DEV07_THEMES) {
      await setTheme(page, theme);
      await settle(page);
      const rings = await sampleFocusRing(page, [
        ".skip-link",
        ".nav-link",
        ".nav-active",
        ".menu-toggle",
        "#main a",
        "#main button",
        "#main select",
        ".theme-picker select",
      ]);
      assertFocusRings(screen, viewport.id, theme, rings);
    }
    await assertSkipLink(page, screen, viewport.id);
  }

  if (screen === "saldo-form") {
    // El segmento interno del date nativo no recibe el outline del host; el
    // host sí debe dibujar anillo visible al enfocarse normalmente.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await setTheme(page, "dark-s");
    const [dateRing] = await sampleFocusRing(page, ["#fechaApertura"]);
    expect(dateRing?.matched, "saldo-form: date no enfocable").toBe(true);
    expect(dateRing?.visible, "saldo-form: date sin anillo").toBe(true);
    expect(dateRing?.ratio ?? 0).toBeGreaterThanOrEqual(3);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await setTheme(page, "dark-s");
  const motion = await auditReducedMotion(page);
  assertMotion(screen, motion);

  for (const viewport of DEV07_VIEWPORTS.filter(
    (item) => item.id !== "720",
  )) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    for (const theme of DEV07_THEMES) {
      await setTheme(page, theme);
      await settle(page);
      await prepareShot(page);
      await shot(
        page,
        BASE_OUT,
        `${screen}-${theme}-${WIDTH_NAME[viewport.id]}`,
      );
    }
  }
}

async function captureCritical(
  page: Page,
  screen: string,
  state: string,
  width: number,
  height: number,
  options: { focus?: () => Promise<void> } = {},
) {
  await page.setViewportSize({ width, height });
  for (const theme of DEV07_THEMES) {
    await setTheme(page, theme);
    await settle(page);
    await setDetailsOpen(page, false);
    const defaultOverflow = await measureOverflow(page);
    const audit = await auditViewport(
      page,
      theme,
      String(width),
      "body",
      { expandDetails: true, defaultOverflow },
    );
    assertViewportAudit(`${screen}-${state}`, audit);
    await prepareShot(page);
    if (options.focus) await options.focus();
    await shot(page, CRITICAL_OUT, `${screen}-${state}-${theme}`);
  }
}

test.beforeAll(async ({ request }) => {
  for (const server of SERVERS) await startServer(request, server);
});

test.afterAll(() => {
  for (const child of active) child.kill();
});

test.describe("UI DEV-07 I4 · matriz base y AA", () => {
  test("Inicio, Movimientos, ficha y formulario de Saldos", async ({
    page,
  }) => {
    test.setTimeout(600000);
    await routeApi(page, INICIO_PORT);
    await login(page, ".local/e2e-inicio", "/inicio");
    await expect(
      page.getByRole("heading", { name: "Inicio", exact: true }),
    ).toBeVisible();
    const screens: [string, string, string][] = [
      ["inicio", "/inicio", "Inicio"],
      ["movimientos", "/movimientos", "Movimientos"],
      ["saldo-ficha", "/saldos/S001", "Cuenta cotidiana demo"],
      ["saldo-form", "/saldos/nuevo", "Nuevo Saldo"],
    ];
    for (const [id, path, heading] of screens) {
      await auditAndCapture(page, id, path, heading);
      if (id === "movimientos") {
        // Estado crítico con la misma sesión del fixture: sin coincidencias.
        await page.setViewportSize({ width: 390, height: 844 });
        await page
          .getByLabel("Buscar Concepto, Nota o ID")
          .fill("sin coincidencias");
        await expect(
          page.getByRole("heading", {
            name: "Sin coincidencias",
            exact: true,
          }),
        ).toBeVisible();
        await captureCritical(
          page,
          "movimientos",
          "sin-coincidencias",
          390,
          844,
        );
      }
    }
  });

  test("Cierre E4.9 preflight listo", async ({ page }) => {
    test.setTimeout(600000);
    await routeApi(page, CIERRE_LISTO_PORT);
    await login(page, ".local/e2e-cierre-listo", "/cierre");
    await expect(
      page.getByRole("heading", {
        name: "Cierre financiero",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByLabel("Ciclo").selectOption("1");
    await expect(
      page.getByText("Listo", { exact: true }).first(),
    ).toBeVisible();
    await auditAndCapture(
      page,
      "cierre",
      "/cierre",
      "Cierre financiero",
      { navigate: false },
    );
  });
});

test.describe("UI DEV-07 I4 · estados críticos", () => {
  test("Inicio cero verificado", async ({ page }) => {
    test.setTimeout(300000);
    await routeApi(page, ZERO_PORT);
    await login(page, ".local/e2e-inicio-zero", "/inicio");
    const liquidez = page.getByRole("article", {
      name: "Liquidez",
      exact: true,
    });
    await expect(liquidez).toContainText("0,00 €");
    await expect(liquidez).toContainText("Cero verificado");
    await captureCritical(page, "inicio", "zero", 390, 844);
  });

  test("Saldos ficha S000 y alta con error de validación", async ({
    page,
  }) => {
    test.setTimeout(300000);
    await routeApi(page, THEME_PORT);
    await login(page, ".local/e2e-theme", "/saldos");
    await page.goto("/saldos/S000");
    await expect(page.locator(".position-panel")).toBeVisible();
    await expect(
      page.getByText("Contraparte técnica protegida.", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(page.locator(".position-panel")).toContainText(
      "No aplicable",
    );
    await expect(page.locator(".position-placeholder")).toHaveText("—");
    await captureCritical(page, "saldo-ficha", "s000", 390, 844);

    await page.goto("/saldos/nuevo");
    await expect(page.locator("form.saldo-form")).toBeVisible();
    await page
      .getByRole("button", { name: "Crear Saldo", exact: true })
      .click();
    await expect(
      page.getByText("Indica un nombre sin caracteres de control."),
    ).toBeVisible();
    const nombre = page.getByLabel("Nombre *", { exact: true });
    await expect(nombre).toBeFocused();
    await expect(nombre).toHaveAttribute("aria-invalid", "true");
    await captureCritical(page, "saldo-form", "validacion", 390, 844, {
      focus: async () => {
        await nombre.focus();
      },
    });
  });

  test("Cierre bloqueado, sin foto parcial", async ({ page }) => {
    test.setTimeout(300000);
    await routeApi(page, CIERRE_BLOQUEADO_PORT);
    await login(page, ".local/e2e-cierre-bloqueado", "/cierre");
    await page.getByLabel("Ciclo").selectOption("1");
    await expect(
      page.getByText("Bloqueado", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("El cierre está bloqueado", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar cierre", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("region", { name: "Fotografía de cierre" }),
    ).toHaveCount(0);
    await captureCritical(page, "cierre", "bloqueado", 1440, 1000);
  });
});
