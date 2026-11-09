import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { release as osRelease } from "node:os";
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
  summarise,
  type Dev07Theme,
  type FocusRingReport,
  type KeyboardReport,
  type MotionReport,
  type ScreenViewportAudit,
} from "./ui-dev07-audit";

/**
 * UI DEV-07 · I1 — línea base diagnóstica (solo test).
 *
 * No declara PASS ni sustituye QA. Las aserciones duras entran en I2/I4.
 * Se ejecuta solo con UI_DEV07_AUDIT=1 para no añadir runtime ni fallos a CI.
 *
 * `720×500` no es zoom nativo: es la equivalencia de viewport a 200 % sobre
 * 1440×1000 declarada en el paquete DEV-07.
 */

// Sin la variable no se registra ninguna prueba: un `test.skip` contaría como
// skipped en el parser de cobertura de `scripts/verify` y rompería CI.
const ENABLED = process.env.UI_DEV07_AUDIT === "1";

const OUT = "artifacts/ui-dev07-baseline";
const INICIO_PORT = 3014;
const CIERRE_PORT = 3031;

type ScreenRecord = {
  screen: string;
  fixture: string;
  path: string;
  navigated: boolean;
  audits: ScreenViewportAudit[];
  keyboard: { viewport: string; report: KeyboardReport }[];
  focusRings: {
    viewport: string;
    theme: Dev07Theme;
    report: FocusRingReport[];
  }[];
  motion: MotionReport | null;
};

const playwrightVersion = (
  JSON.parse(
    readFileSync("node_modules/@playwright/test/package.json", "utf8"),
  ) as { version: string }
).version;

const report: {
  generatedAt: string;
  updatedAt: string;
  head: string;
  base: string;
  platform: { os: string; arch: string; release: string };
  runtime: { bun: string; playwright: string; chromium: string };
  command: string;
  jsonPath: string;
  pageErrors: string[];
  limitations: string[];
  exceptions: string[];
  resolved: string[];
  verification: {
    baseline: string;
    linuxFull: string;
    macosFull: string;
  };
  screens: Record<string, ScreenRecord>;
} = {
  generatedAt: new Date().toISOString(),
  updatedAt: "",
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  base: "5c6e762",
  platform: {
    os: process.platform,
    arch: process.arch,
    release: osRelease(),
  },
  runtime: {
    bun: readFileSync(".bun-version", "utf8").trim(),
    playwright: playwrightVersion,
    chromium: "",
  },
  command:
    "UI_DEV07_AUDIT=1 bunx playwright test tests/e2e/ui-dev07-baseline.spec.ts",
  jsonPath: "artifacts/ui-dev07-baseline/report.json",
  pageErrors: [],
  limitations: [
    "Linux full verification not executed on this host.",
    "macOS: scripts/verify API backup/production suites blocked by the /var symlink in safeAncestors and by libc.so.6; two E2E specs blocked because age-keygen is not installed.",
    "Screens: Inicio base, Movimientos E4.6 C007, Saldos ficha S001, Saldos alta /saldos/nuevo and Cierre E4.9 preflight listo with cycle 1. Critical states are covered by the I4 matrix, not this baseline.",
    "Zoom measured as a 720x500 viewport equivalence (200% over 1440x1000), not native browser zoom.",
    "Chromium only; no Firefox/WebKit and no screen reader.",
    "Contrast covers visible text, form-control borders and status glyphs; it does not cover placeholders, input values, pseudo-elements or SVG.",
  ],
  exceptions: [
    "Inline prose links in Inicio (S001-S005, Comida) and table-cell links in Movimientos are treated as inline target-size exceptions; manual QA must confirm.",
    "One internal segment of input#fechaApertura shows no outline in Chromium's native date control.",
    "Brand tagline is 7-8 px and decorative.",
    "Primitives outside the matrix keep their base sizes: .ui-badge 10 px, .ui-amount-note 11 px and .ui-metric-class 9 px.",
  ],
  resolved: [
    "hybrid-s sidebar focus ring was 2.83:1; I2 applies --sidebar-focus (6.66:1). No longer an exception.",
    "Cierre badges at 11 px and fingerprints at 11.52 px; I2 raises them to --text-xs (12 px).",
    "Target size findings: a.brand 40 px, a.back 101x18 px and Inicio list links 202/220x18 px; I2 sets --touch-min (44 px).",
  ],
  verification: {
    baseline: "PASS (python3.12 scripts/verify baseline)",
    linuxFull: "not executed",
    macosFull:
      "blocked: apps/api backup/private-state (macOS /var symlink, libc.so.6) and age-keygen missing in restore-server E2E",
  },
  screens: {},
};

function writeReport() {
  report.updatedAt = new Date().toISOString();
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
}

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

async function startServer(
  request: APIRequestContext,
  script: string,
  port: number,
  env: Record<string, string> = {},
): Promise<ChildProcess> {
  const child = spawn(process.env.BUN_BIN ?? "bun", [script], {
    stdio: "pipe",
    env: { ...process.env, NODE_ENV: "test", ...env },
  });
  await waitForApi(request, port).catch((error) => {
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
      await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
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
  await page.getByLabel("Contraseña", { exact: true }).fill(
    "Clave ficticia DEV-07 " + randomUUID(),
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
}

/**
 * Espera web-first: no hay timeout fijo. Deja que arranquen las transiciones
 * de tema y espera a que terminen las animaciones finitas.
 */
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

/** Contenido real por pantalla; nunca un sleep. */
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
    await expect(page.getByText("Listo", { exact: true }).first()).toBeVisible();
  }
}

async function auditScreen(
  page: Page,
  screen: string,
  fixture: string,
  path: string,
  heading: string,
  options: { navigate?: boolean } = {},
): Promise<ScreenRecord> {
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (options.navigate !== false) await page.goto(path);
  await expect(
    page.getByRole("heading", { name: heading, exact: true }).first(),
  ).toBeVisible();
  await waitForScreenReady(page, screen);
  await settle(page);
  const record: ScreenRecord = {
    screen,
    fixture,
    path,
    navigated: options.navigate !== false,
    audits: [],
    keyboard: [],
    focusRings: [],
    motion: null,
  };
  for (const viewport of DEV07_VIEWPORTS) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await waitForScreenReady(page, screen);
    // Overflow en el estado por defecto (details cerrados) y contraste/texto
    // con los details abiertos para no perder contenido plegado.
    await setDetailsOpen(page, false);
    const defaultOverflow = await measureOverflow(page);
    for (const theme of DEV07_THEMES) {
      await setTheme(page, theme);
      await settle(page);
      record.audits.push(
        await auditViewport(page, theme, viewport.id, "body", {
          expandDetails: true,
          defaultOverflow,
        }),
      );
    }
    await setDetailsOpen(page, false);
  }
  // Teclado: recorrido completo en dark-s (el orden no depende del tema).
  for (const viewport of DEV07_VIEWPORTS.filter(
    (item) => item.id !== "720",
  )) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await setTheme(page, "dark-s");
    await settle(page);
    record.keyboard.push({
      viewport: viewport.id,
      report: await auditKeyboard(page, 90),
    });
  }
  // Anillo de foco por tema a 1440 y 390; los selectores ocultos se omiten.
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
      record.focusRings.push({
        viewport: viewport.id,
        theme,
        report: await sampleFocusRing(page, [
          ".skip-link",
          ".nav-link",
          ".nav-active",
          ".menu-toggle",
          "#main a",
          "#main button",
          "#main select",
          ".theme-picker select",
        ]),
      });
    }
  }
  // Movimiento reducido en dark-s a 1440.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setTheme(page, "dark-s");
  record.motion = await auditReducedMotion(page);
  report.screens[screen] = record;
  writeReport();
  return record;
}

function printSummary(record: ScreenRecord) {
  console.log(`\n### ${record.screen} (${record.path})`);
  for (const audit of record.audits) {
    console.log(JSON.stringify(summarise(audit)));
  }
  for (const keyboard of record.keyboard) {
    console.log(
      JSON.stringify({
        screen: record.screen,
        viewport: keyboard.viewport,
        stops: keyboard.report.stopCount,
        missingFocus: keyboard.report.missingVisibleFocus.length,
        lowRing: keyboard.report.lowRingContrast.length,
        returnedToStart: keyboard.report.returnedToStart,
      }),
    );
  }
  for (const focus of record.focusRings) {
    console.log(
      JSON.stringify({
        screen: record.screen,
        viewport: focus.viewport,
        theme: focus.theme,
        rings: focus.report
          .filter((item) => item.matched)
          .map((item) => ({
            selector: item.selector,
            ratio: item.ratio,
            visible: item.visible,
          })),
      }),
    );
  }
  console.log(
    JSON.stringify({
      screen: record.screen,
      motion: record.motion
        ? {
            reduce: record.motion.reduceMatches,
            checked: record.motion.checked,
            transitions: record.motion.transitions.length,
            animations: record.motion.animations.length,
          }
        : null,
    }),
  );
}

if (ENABLED) {
  test.describe("UI DEV-07 I1 · línea base", () => {
  test.describe.configure({ mode: "serial" });

  test("Inicio, Movimientos, ficha y formulario de Saldos", async ({
    page,
    request,
  }) => {
    test.setTimeout(600000);
    report.runtime.chromium =
      page.context().browser()?.version() ?? "unknown";
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const child = await startServer(
      request,
      "apps/api/test-support/inicio-server.ts",
      INICIO_PORT,
    );
    try {
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
        const record = await auditScreen(
          page,
          id,
          "inicio-server · fixture C007",
          path,
          heading,
        );
        printSummary(record);
      }
      report.pageErrors.push(...errors);
      writeReport();
    } finally {
      child.kill();
    }
  });

  test("Cierre E4.9 preflight listo", async ({ page, request }) => {
    test.setTimeout(600000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const child = await startServer(
      request,
      "apps/api/test-support/cierre-server.ts",
      CIERRE_PORT,
      { E49_SCENARIO: "listo", E49_PORT: String(CIERRE_PORT) },
    );
    try {
      await routeApi(page, CIERRE_PORT);
      await login(page, ".local/e2e-cierre-listo", "/cierre");
      await expect(
        page.getByRole("heading", { name: "Cierre financiero", exact: true }),
      ).toBeVisible();
      await page.getByLabel("Ciclo").selectOption("1");
      await expect(page.getByText("Listo", { exact: true }).first()).toBeVisible();
      const record = await auditScreen(
        page,
        "cierre",
        "cierre-server · escenario listo",
        "/cierre",
        "Cierre financiero",
        { navigate: false },
      );
      printSummary(record);
      report.pageErrors.push(...errors);
      writeReport();
    } finally {
      child.kill();
    }
  });
  });
}
