import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const API_PORT = 3013;
let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(process.env.BUN_BIN ?? "bun", ["apps/api/test-support/theme-server.ts"], {
    stdio: "pipe",
    env: { ...process.env, NODE_ENV: "test" },
  });
  await expect
    .poll(
      async () => {
        try {
          return (await request.get(`http://127.0.0.1:${API_PORT}/api/health`)).status();
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

async function authenticate(page: import("@playwright/test").Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(API_PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto("/saldos");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(".local/e2e-theme/bootstrap.txt", "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(
    "Clave ficticia Casa " + randomUUID(),
  );
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".secret")).toBeVisible();
  const secret = (await page.locator(".secret").textContent())!;
  await page
    .getByLabel("Código de la aplicación autenticadora")
    .fill(totp(secret).generate());
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await page
    .getByRole("button", { name: "He guardado los códigos · Continuar" })
    .click();
  await expect(page.getByRole("heading", { name: "Saldos", exact: true })).toBeVisible();
}

test("Casa: quinta apariencia, persistencia, tipografía y 1440/390", async ({ page }) => {
  mkdirSync("artifacts/theme", { recursive: true });
  await authenticate(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const html = page.locator("html");
  const body = page.locator("body");
  const sidebar = page.locator(".sidebar");
  const select = page.getByLabel("Apariencia");
  const expectNoOverflow = async () =>
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);

  await expect(select.locator("option")).toHaveCount(5);
  await expect(select.locator("option").nth(4)).toHaveAttribute("value", "casa");
  await expect(select.locator("option").nth(4)).toHaveText("Casa");

  await select.selectOption("casa");
  await expect(html).toHaveAttribute("data-theme", "casa");
  await expect(body).toHaveCSS("background-color", "rgb(244, 241, 232)");
  await expect(sidebar).toHaveCSS("background-color", "rgb(239, 236, 225)");
  await expect(page.locator(".nav-active")).toHaveCSS(
    "background-color",
    "rgb(221, 229, 218)",
  );
  await expect(page.locator(".nav-active")).toHaveCSS(
    "color",
    "rgb(30, 75, 58)",
  );
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(5);
  await expect(page.locator(".saldos-page")).toBeVisible();
  await expect(page.locator(".saldos-page .ui-table th").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(
    page.locator(".saldos-page .position-label").first(),
  ).toHaveCSS("font-family", /Newsreader/);
  await expectNoOverflow();
  await page.screenshot({
    path: "artifacts/theme/casa-saldos-1440.png",
    fullPage: true,
  });

  await page.locator(".saldos-page .desktop-list tbody tr a").first().click();
  await expect(page.locator(".saldo-detail-page")).toBeVisible();
  await expect(
    page.locator(".saldo-detail-page .position-panel"),
  ).toContainText("Saldo actual");
  await page.screenshot({
    path: "artifacts/theme/casa-saldo-detalle-1440.png",
    fullPage: true,
  });
  await page.locator(".saldo-detail-page > .back").click();
  await expect(page.locator(".saldos-page")).toBeVisible();

  await page.evaluate(() => document.fonts.ready);
  const headingFont = await page
    .locator(".page-head h1")
    .evaluate((node) => getComputedStyle(node).fontFamily);
  const bodyFont = await body.evaluate((node) => getComputedStyle(node).fontFamily);
  expect(headingFont).toContain("Newsreader");
  expect(bodyFont).toContain("IBM Plex Sans");
  expect(await page.evaluate(() => document.fonts.check("16px Newsreader"))).toBe(
    true,
  );

  const primary = page.getByRole("button", { name: "Nuevo Saldo" });
  await expect(primary).toHaveCSS("background-color", "rgb(30, 75, 58)");
  await primary.hover();
  await expect(primary).toHaveCSS("background-color", "rgb(42, 92, 72)");
  await page.mouse.move(0, 0);

  const contrast = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const value = (name: string) => style.getPropertyValue(name).trim();
    const parse = (color: string) => {
      const match = color.match(/^#([0-9a-f]{6})$/i);
      if (!match) return null;
      const n = parseInt(match[1], 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    const luminance = (color: { r: number; g: number; b: number }) => {
      const channels = [color.r, color.g, color.b].map((channel) => {
        const v = channel / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const ratio = (foreground: string, background: string) => {
      const fg = parse(foreground);
      const bg = parse(background);
      if (!fg || !bg) return null;
      const a = luminance(fg);
      const b = luminance(bg);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    const pairs = [
      ["text/surface", "--text", "--surface", 4.5],
      ["text/bg", "--text", "--bg", 4.5],
      ["muted/surface", "--muted", "--surface", 4.5],
      ["muted/surface-2", "--muted", "--surface-2", 4.5],
      ["on-action/action", "--on-action", "--action", 4.5],
      ["on-accent/accent", "--on-accent", "--accent", 4.5],
      ["positive/positive-soft", "--positive", "--positive-soft", 4.5],
      ["accent/accent-soft", "--accent", "--accent-soft", 4.5],
      ["negative/surface", "--negative", "--surface", 4.5],
      ["warning/warning-soft", "--warning", "--warning-soft", 4.5],
      ["sidebar-text/sidebar", "--sidebar-text", "--sidebar", 4.5],
      ["sidebar-active/sidebar-active-bg", "--sidebar-active-text", "--sidebar-active-bg", 4.5],
      ["control-border/surface", "--control-border", "--surface", 3],
      ["control-border/bg", "--control-border", "--bg", 3],
      ["control-border/input", "--control-border", "--input-bg", 3],
      ["focus/surface", "--focus", "--surface", 3],
      ["focus/bg", "--focus", "--bg", 3],
      ["sidebar-focus/sidebar", "--sidebar-focus", "--sidebar", 3],
    ] as const;
    return Object.fromEntries(
      pairs.map(([name, fg, bg, minimum]) => [
        name,
        { ratio: ratio(value(fg), value(bg)), minimum },
      ]),
    );
  });
  for (const [name, result] of Object.entries(contrast)) {
    expect(result.ratio, name).not.toBeNull();
    expect(result.ratio!, name).toBeGreaterThanOrEqual(result.minimum);
  }

  await page.screenshot({
    path: "artifacts/theme/casa-1440.png",
    fullPage: true,
  });

  await page.reload();
  await expect(select).toHaveValue("casa");
  await expect(html).toHaveAttribute("data-theme", "casa");
  await expect(body).toHaveCSS("background-color", "rgb(244, 241, 232)");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".mobile-list li")).toHaveCount(5);
  await expectNoOverflow();
  await page.screenshot({
    path: "artifacts/theme/casa-390.png",
    fullPage: true,
  });


  await page.setViewportSize({ width: 1440, height: 1000 });
  await select.selectOption("graphite-lime");
  await expect(html).toHaveAttribute("data-theme", "graphite-lime");
  await expect(body).toHaveCSS("background-color", "rgb(11, 12, 11)");
  await expect(errors).toEqual([]);
});

test("Casa se aplica antes de React y un tema desconocido cae a dark-s", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("mf-theme", "casa");
  });
  await page.route("**/src/main.tsx", (route) => route.abort());
  await page.goto("/saldos", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "casa");
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(244, 241, 232)",
  );
  await expect(page.locator("#root")).toBeEmpty();

  const fallback = await page.context().newPage();
  await fallback.addInitScript(() => {
    localStorage.setItem("mf-theme", "desconocido");
  });
  await fallback.route("**/src/main.tsx", (route) => route.abort());
  await fallback.goto("/saldos", { waitUntil: "domcontentloaded" });
  await expect(fallback.locator("html")).toHaveAttribute("data-theme", "dark-s");
  await expect(fallback.locator("html")).toHaveCSS(
    "background-color",
    "rgb(20, 20, 20)",
  );
  await expect(fallback.locator("#root")).toBeEmpty();
  await fallback.close();
});
