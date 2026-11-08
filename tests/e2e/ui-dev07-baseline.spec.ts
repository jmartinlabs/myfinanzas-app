import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  audits: ScreenViewportAudit[];
  keyboard: { viewport: string; report: KeyboardReport }[];
  focusRings: { theme: Dev07Theme; report: FocusRingReport[] }[];
  motion: MotionReport | null;
};

const report: {
  generatedAt: string;
  base: string;
  pageErrors: string[];
  screens: Record<string, ScreenRecord>;
} = {
  generatedAt: new Date().toISOString(),
  base: "e221e51",
  pageErrors: [],
  screens: {},
};

function writeReport() {
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

async function settle(page: Page) {
  // `button { transition: background-color 0.12s }` deja el fondo a medio
  // camino justo tras cambiar de tema; se espera a que termine antes de medir.
  await page.waitForTimeout(220);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

async function auditScreen(
  page: Page,
  screen: string,
  fixture: string,
  path: string,
  heading: string,
): Promise<ScreenRecord> {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: heading, exact: true }).first(),
  ).toBeVisible();
  await settle(page);
  const record: ScreenRecord = {
    screen,
    fixture,
    path,
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
    // Overflow en el estado por defecto (details cerrados) y contraste/texto
    // con los details abiertos para no perder contenido plegado.
    await setDetailsOpen(page, false);
    const defaultOverflow = await measureOverflow(page);
    for (const theme of DEV07_THEMES) {
      await setTheme(page, theme);
      await settle(page);
      record.audits.push(
        await auditViewport(page, theme, viewport.id, "#main", {
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
  // Anillo de foco por tema a 1440.
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const theme of DEV07_THEMES) {
    await setTheme(page, theme);
    await settle(page);
    record.focusRings.push({
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
  // Movimiento reducido en dark-s a 1440.
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
        theme: focus.theme,
        rings: focus.report.map((item) => ({
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
