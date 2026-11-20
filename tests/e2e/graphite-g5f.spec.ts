import { test, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
import { RESUMEN_ANUAL_NOW } from "../../apps/api/test-support/resumen-anual-clock";

import { artifactDir, fixtureContext, requireFixtureState, type Fixture } from "./fixture";

const artifacts = artifactDir("g5f");

// Puerto y estado de los tres fixtures salen del contexto de la ejecución
// (#514): el servidor ya no ocupa 3055/3056/3057 ni escribe en
// `.local/e2e-cierre-listo`, `.local/e2e-e411-principal` ni `.local/e2e-e47-g5f`.
const CIERRE = fixtureContext("g5f-cierre-listo");
// Fixture propio para la evidencia de la ruta retirada: la cuenta se enrola una
// sola vez por instancia, así que cada prueba necesita su propio estado.
const RETIRADA = fixtureContext("g5f-cierre-retirada");
const RESUMEN = fixtureContext("g5f-resumen-anual");
const CIERRE_PORT = CIERRE.port;
const RETIRADA_PORT = RETIRADA.port;

type OwnedServer = {
  child: ChildProcess;
  output: () => string;
  assertAlive: () => void;
  stop: () => void;
};

const children: OwnedServer[] = [];

async function start(
  request: import("@playwright/test").APIRequestContext,
  file: string,
  port: number,
  env: Record<string, string>,
): Promise<OwnedServer> {
  const child = spawn(process.env.BUN_BIN ?? "bun", ["apps/api/test-support/" + file], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "test", ...env },
  });
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
      `El fixture ${file} terminó antes de servir (${how}): ${output.trim() || "(sin salida)"}`,
    );
  };
  const owned: OwnedServer = {
    child,
    output: () => output,
    assertAlive,
    stop: () => {
      child.kill();
      child.stdout?.destroy();
      child.stderr?.destroy();
    },
  };
  children.push(owned);
  await expect
    .poll(
      async () => {
        assertAlive();
        try {
          return (await request.get(`http://127.0.0.1:${port}/api/health`)).status();
        } catch {
          return 0;
        }
      },
      { timeout: 20000 },
    )
    .toBe(200);
  return owned;
}

test.beforeAll(async ({ request }) => {
  const cierre = await start(request, "cierre-server.ts", CIERRE_PORT, {
    ...CIERRE.env,
    E49_SCENARIO: "listo",
    E49_PORT: String(CIERRE_PORT),
  });
  // El cierre provisionó su estado antes de servir: se navega solo entonces.
  requireFixtureState({ ...cierre, fixture: CIERRE });
  const retirada = await start(request, "cierre-server.ts", RETIRADA_PORT, {
    ...RETIRADA.env,
    E49_SCENARIO: "listo",
    E49_PORT: String(RETIRADA_PORT),
  });
  requireFixtureState({ ...retirada, fixture: RETIRADA });
  const resumen = await start(request, "resumen-anual-server.ts", RESUMEN.port, {
    ...RESUMEN.env,
    E2E_PORT: String(RESUMEN.port),
    E2E_STATE_DIR: RESUMEN.dir,
  });
  // El resumen provisionó su estado antes de servir: se navega solo entonces.
  requireFixtureState({ ...resumen, fixture: RESUMEN });
});

test.afterAll(() => {
  for (const server of children) server.stop();
});

async function login(
  page: Page,
  port: number,
  dir: string,
  path: string,
  timestamp?: number,
) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(port);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto(path);
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(dir + "/bootstrap.txt", "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia G5f " + randomUUID());
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".secret")).toBeVisible();
  const secret = (await page.locator(".secret").textContent())!;
  await page
    .getByLabel("Código de la aplicación autenticadora")
    .fill(totp(secret).generate(timestamp ? { timestamp } : undefined));
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await page
    .getByRole("button", { name: "He guardado los códigos · Continuar" })
    .click();
}

const noOverflow = async (page: Page) =>
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);

async function graphite(page: Page) {
  await page.getByLabel("Cambiar tema").selectOption("graphite-lime");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite-lime");
}

test("G5f: Validación del cierre en Graphite, 1440/820/390", async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, CIERRE_PORT, CIERRE.dir, "/cierre");
  await page.goto("/cierre");
  await expect(
    page.getByRole("heading", { name: "Validación del cierre", exact: true }),
  ).toBeVisible();
  await graphite(page);
  await page.getByLabel("Ciclo").selectOption("1");
  // #555: la lectura principal es el estado de validación y su preview; el
  // preflight fotográfico ya no existe.
  await page.getByRole("button", { name: "Validar", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Vista previa de la validación" }),
  ).toBeVisible();
  await expect(page.locator(".cierre-page")).toBeVisible();
  await expect(page.locator(".cierre-page .panel").first()).toHaveCSS(
    "border-top-color",
    "rgb(42, 47, 40)",
  );
  await expect(page.locator(".cierre-page .ui-table th").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(
    page.getByRole("button", { name: "Actualizar estado", exact: true }),
  ).toHaveCSS("min-height", "44px");
  for (const [width, height] of [
    [1440, 1000],
    [820, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await noOverflow(page);
    await page.screenshot({
      path: join(artifacts, `cierre-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("Cambiar tema").selectOption("casa");
  await expect(page.locator(".cierre-page")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: join(artifacts, "casa-cierre-1440.png"), fullPage: true });
  await page.getByLabel("Cambiar tema").selectOption("light-s");
  await expect(page.locator(".cierre-page")).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("G5f: /fotos retirada en Graphite y lectura viva equivalente, 1440/820/390", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, RETIRADA_PORT, RETIRADA.dir, "/cierre");
  // #555 · §7.6: la consulta de fotografías se retira. La ruta no existe y su
  // lectura viva equivalente es el estado de validación del ciclo.
  await page.goto("/fotos");
  await expect(page.getByText("Página no encontrada.", { exact: true })).toBeVisible();
  await expect(page.locator(".fotos-page")).toHaveCount(0);

  await page.goto("/cierre");
  await expect(
    page.getByRole("heading", { name: "Validación del cierre", exact: true }),
  ).toBeVisible();
  await graphite(page);
  await page.getByLabel("Ciclo").selectOption("1");
  await expect(page.locator(".cierre-page")).toBeVisible();
  await expect(page.locator(".cierre-page .panel").first()).toHaveCSS(
    "border-top-color",
    "rgb(42, 47, 40)",
  );
  for (const [width, height] of [
    [1440, 1000],
    [820, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await noOverflow(page);
    await page.screenshot({
      path: join(artifacts, `fotos-retirada-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("Cambiar tema").selectOption("casa");
  await expect(page.locator(".cierre-page")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: join(artifacts, "casa-fotos-retirada-1440.png"),
    fullPage: true,
  });
  await page.getByLabel("Cambiar tema").selectOption("light-s");
  await expect(page.locator(".cierre-page")).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("G5f: Resumen anual en Graphite, 1440/820/390", async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(
    page,
    RESUMEN.port,
    RESUMEN.dir,
    "/resumen-anual",
    RESUMEN_ANUAL_NOW,
  );
  await page.goto("/resumen-anual");
  await expect(
    page.getByRole("heading", { name: "Resumen anual", exact: true }),
  ).toBeVisible();
  await graphite(page);
  await expect(page.locator(".e47-page")).toBeVisible();
  await expect(page.locator(".e47-page .panel").first()).toHaveCSS(
    "border-top-color",
    "rgb(42, 47, 40)",
  );
  await expect(page.getByText("Plan", { exact: false }).first()).toBeVisible();
  await expect(page.locator(".e47-page .e47-facts dt").first()).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await expect(page.locator(".e47-page .e47-table th").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(page.locator(".e47-page .e47-card").first()).not.toHaveCSS(
    "box-shadow",
    "none",
  );
  await expect(page.locator('.e47-page .e47-card[data-clase="real"]').first()).toHaveCSS(
    "border-left-color",
    "rgb(127, 224, 168)",
  );
  const filters = page.locator(".e47-filters");
  if (await filters.count()) {
    await expect(filters.locator("input, select").first()).toHaveCSS(
      "min-height",
      "44px",
    );
  }
  for (const [width, height] of [
    [1440, 1000],
    [820, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await noOverflow(page);
    await page.screenshot({
      path: join(artifacts, `resumen-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("Cambiar tema").selectOption("casa");
  await expect(page.locator(".e47-page")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: join(artifacts, "casa-resumen-1440.png"), fullPage: true });
  await page.getByLabel("Cambiar tema").selectOption("light-s");
  await expect(page.locator(".e47-page")).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});
