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
    "Clave ficticia Graphite G1 " + randomUUID(),
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

test("G1: shell, componentes, responsive y regresión de temas", async ({
  page,
}) => {
  mkdirSync("artifacts/graphite-g1", { recursive: true });
  await authenticate(page);
  const themeSelect = page.getByLabel(/Tema visual|Apariencia/);
  await themeSelect.selectOption("graphite-lime");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite-lime");

  const panel = page.locator(".panel").first();
  await expect(panel).toHaveCSS(
    "background-image",
    "linear-gradient(160deg, rgb(23, 26, 22) 0%, rgb(17, 19, 17) 100%)",
  );
  await expect(panel).toHaveCSS("border-color", "rgb(42, 47, 40)");
  await expect(panel).not.toHaveCSS("box-shadow", "none");

  await expect(page.locator(".page-head h1")).toHaveCSS("font-size", "34px");
  await expect(page.locator(".nav-active")).toHaveCSS(
    "background-color",
    "rgb(215, 255, 94)",
  );
  await expect(page.locator(".primary").first()).toHaveCSS(
    "background-color",
    "rgb(215, 255, 94)",
  );
  await expect(page.locator(".primary").first()).not.toHaveCSS(
    "box-shadow",
    "none",
  );
  await expect(page.locator(".desktop-list th").first()).toHaveCSS(
    "background-color",
    "rgb(14, 17, 14)",
  );
  await expect(page.locator(".desktop-list th").first()).toHaveCSS(
    "text-transform",
    "uppercase",
  );

  await expect(page.locator(".desktop-list tbody tr").first()).toBeVisible();
  await page.locator("h1").blur();
  await page.screenshot({
    path: "artifacts/graphite-g1/saldos-1440.png",
    fullPage: true,
  });

  await page.goto("/inicio");
  await expect(page.getByRole("heading", { name: "Inicio", exact: true })).toBeVisible();
  await expect(page.locator(".inicio-context")).toBeVisible();
  await expect(page.locator(".inicio-page .ui-badge").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await page.screenshot({
    path: "artifacts/graphite-g1/inicio-1440.png",
    fullPage: true,
  });

  await page.goto("/movimientos");
  await expect(page.getByRole("heading", { name: "Movimientos", exact: true })).toBeVisible();
  await expect(page.locator(".movements-list")).toBeVisible();
  await expect(page.locator(".movements-list")).toHaveCSS(
    "background-image",
    "linear-gradient(160deg, rgb(23, 26, 22) 0%, rgb(17, 19, 17) 100%)",
  );
  await page.screenshot({
    path: "artifacts/graphite-g1/movimientos-1440.png",
    fullPage: true,
  });

  await page.goto("/saldos/nuevo");
  const nameInput = page.locator("#nombre");
  await nameInput.focus();
  await expect(nameInput).toHaveCSS("outline-color", "rgb(215, 255, 94)");
  await expect(nameInput).toHaveCSS("outline-width", "3px");
  await expect(nameInput).toHaveCSS("outline-offset", "3px");

  const informLiquidez = page.getByRole("button", {
    name: /Informar Liquidez como No/,
  });
  if (await informLiquidez.count()) await informLiquidez.click();
  const liquidezSwitch = page.getByRole("switch", { name: "Liquidez" });
  await liquidezSwitch.click();
  await expect(liquidezSwitch).toHaveAttribute("aria-checked", "true");
  await expect(liquidezSwitch).toHaveCSS("background-color", "rgb(35, 40, 25)");
  await expect(liquidezSwitch).toHaveCSS("color", "rgb(215, 255, 94)");
  const switchContrast = await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>(".switch.on");
    if (!element) return 0;
    const parse = (value: string) => {
      const match = value.match(/\d+/g)?.map(Number) ?? [];
      return match.length >= 3 ? match.slice(0, 3) : null;
    };
    const luminance = (rgb: number[]) => {
      const channels = rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928
          ? value / 12.92
          : Math.pow((value + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const style = getComputedStyle(element);
    const foreground = parse(style.color);
    const background = parse(style.backgroundColor);
    if (!foreground || !background) return 0;
    const a = luminance(foreground);
    const b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(switchContrast).toBeGreaterThanOrEqual(4.5);
  await liquidezSwitch.focus();
  await page.keyboard.press("Space");
  await expect(liquidezSwitch).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Space");
  await expect(liquidezSwitch).toHaveAttribute("aria-checked", "true");

  const noOverflow = async () =>
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);

  await page.setViewportSize({ width: 820, height: 1000 });
  await page.goto("/saldos");
  await expect(page.locator(".saldos-page .desktop-list")).toBeHidden();
  await expect(page.locator(".saldos-page .mobile-list")).toBeVisible();
  await expect(
    page.locator(".saldos-page .mobile-list .ui-data-list-item").first(),
  ).toBeVisible();
  await page.locator("h1").blur();
  await page.screenshot({
    path: "artifacts/graphite-g1/saldos-820.png",
    fullPage: true,
  });
  await noOverflow();

  await page.goto("/inicio");
  await expect(page.getByRole("heading", { name: "Inicio", exact: true })).toBeVisible();
  await expect(page.locator(".inicio-context")).toBeVisible();
  await page.screenshot({
    path: "artifacts/graphite-g1/inicio-820.png",
    fullPage: true,
  });
  await noOverflow();

  await page.goto("/movimientos");
  await expect(page.getByRole("heading", { name: "Movimientos", exact: true })).toBeVisible();
  await page.screenshot({
    path: "artifacts/graphite-g1/movimientos-820.png",
    fullPage: true,
  });
  await noOverflow();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/saldos");
  const card = page.locator(".ui-data-list-item").first();
  await expect(card).toBeVisible();
  await page.locator("h1").blur();
  await expect(card).toHaveCSS("border-radius", "12px");
  await expect(card).not.toHaveCSS("box-shadow", "none");
  await expect(card).toHaveCSS(
    "background-image",
    "linear-gradient(160deg, rgb(23, 26, 22) 0%, rgb(17, 19, 17) 100%)",
  );
  await page.screenshot({
    path: "artifacts/graphite-g1/saldos-390.png",
    fullPage: true,
  });
  await noOverflow();

  await page.goto("/inicio");
  await expect(page.getByRole("heading", { name: "Inicio", exact: true })).toBeVisible();
  await expect(page.locator(".inicio-context")).toBeVisible();
  await page.screenshot({
    path: "artifacts/graphite-g1/inicio-390.png",
    fullPage: true,
  });
  await noOverflow();

  await page.goto("/movimientos");
  await expect(page.getByRole("heading", { name: "Movimientos", exact: true })).toBeVisible();
  await page.screenshot({
    path: "artifacts/graphite-g1/movimientos-390.png",
    fullPage: true,
  });
  await noOverflow();

  await page.setViewportSize({ width: 720, height: 900 });
  await page.goto("/saldos");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite-lime");
  await noOverflow();
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto("/saldos");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite-lime");
  await noOverflow();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/saldos");
  await themeSelect.selectOption("dark-s");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark-s");
  await expect(page.locator(".panel").first()).toHaveCSS("background-image", "none");
  await expect(page.locator(".page-head h1")).toHaveCSS("font-size", "28px");
  await expect(page.locator(".primary").first()).toHaveCSS("box-shadow", "none");

  for (const id of ["light-s", "hybrid-s"]) {
    await themeSelect.selectOption(id);
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    await expect(page.locator(".panel").first()).toHaveCSS("background-image", "none");
    await expect(page.locator(".page-head h1")).toHaveCSS("font-size", "28px");
    await expect(page.locator(".primary").first()).toHaveCSS("box-shadow", "none");
  }
});
