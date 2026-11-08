import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * UI · contraste del switch.
 *
 * Servidor aislado en 3045 con MFA real y datos ficticios. Mide el contraste
 * computado del texto sobre la pista del switch en estado OFF y ON para los
 * tres temas, sin sustituir colores por constantes del test.
 */

const PORT = 3045;
const DIR = ".local/e2e-ui-switch";
const ARTIFACTS = "artifacts/ui-switch";
const THEMES = ["light-s", "dark-s", "hybrid-s"] as const;
let child: ChildProcess | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/ui-switch-server.ts"],
    { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
  );
  await expect
    .poll(
      async () => {
        try {
          return (await request.get(`http://127.0.0.1:${PORT}/api/health`))
            .status();
        } catch {
          return 0;
        }
      },
      { timeout: 20000 },
    )
    .toBe(200);
});

test.afterAll(() => {
  child?.kill();
});

test("UI switch: contraste ON/OFF ≥ 4,5:1 en light-s/dark-s/hybrid-s", async ({
  page,
}) => {
  test.setTimeout(180000);
  mkdirSync(ARTIFACTS, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto("/saldos");
  await page
    .getByLabel("Token de configuración local")
    .fill(readFileSync(`${DIR}/bootstrap.txt`, "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia switch " + randomUUID());
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

  const select = page.getByLabel("Tema visual");
  const html = page.locator("html");
  await page.getByRole("button", { name: "Nuevo Saldo" }).click();
  await expect(
    page.getByRole("heading", { name: "Nuevo Saldo", exact: true }),
  ).toBeVisible();
  const sw = page.getByRole("switch", { name: "Liquidez", exact: true });

  // Contraste WCAG 2.1 entre el color del texto y el fondo real del control.
  const contrast = () =>
    sw.evaluate((el) => {
      const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (color: string) => {
        const [r, g, b] = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number);
        return (
          0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
        );
      };
      const text = getComputedStyle(el.querySelector("span:last-child")!)
        .color;
      const background = getComputedStyle(el).backgroundColor;
      const foregroundLuminance = luminance(text);
      const backgroundLuminance = luminance(background);
      const [high, low] =
        foregroundLuminance >= backgroundLuminance
          ? [foregroundLuminance, backgroundLuminance]
          : [backgroundLuminance, foregroundLuminance];
      return {
        ratio: (high + 0.05) / (low + 0.05),
        text,
        background,
      };
    });

  const expectNoOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

  const expected = {
    "light-s": {
      offBg: "rgb(236, 233, 226)",
      positive: "rgb(30, 111, 122)",
      onText: "rgb(255, 255, 255)",
    },
    "dark-s": {
      offBg: "rgb(38, 38, 38)",
      positive: "rgb(87, 178, 186)",
      onText: "rgb(20, 20, 20)",
    },
    "hybrid-s": {
      offBg: "rgb(236, 233, 226)",
      positive: "rgb(30, 111, 122)",
      onText: "rgb(255, 255, 255)",
    },
  } as const;

  for (const theme of THEMES) {
    await select.selectOption(theme);
    await expect(html).toHaveAttribute("data-theme", theme);

    // OFF: la pista conserva el fondo de sección y el texto positivo.
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await expect(sw).toHaveCSS("background-color", expected[theme].offBg);
    await expect(sw).toHaveCSS("color", expected[theme].positive);
    expect((await contrast()).ratio).toBeGreaterThanOrEqual(4.5);

    // ON: texto legible sobre la pista positiva.
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await expect(sw).toHaveCSS("background-color", expected[theme].positive);
    await expect(sw).toHaveCSS("color", expected[theme].onText);
    expect((await contrast()).ratio).toBeGreaterThanOrEqual(4.5);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await expectNoOverflow();
    await page.screenshot({
      path: `${ARTIFACTS}/switch-on-${theme}-1440.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoOverflow();
    await page.screenshot({
      path: `${ARTIFACTS}/switch-on-${theme}-390.png`,
      fullPage: true,
    });

    // Vuelve a OFF antes del siguiente tema; la estructura y ARIA no cambian.
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await page.setViewportSize({ width: 1440, height: 1000 });
  }

  await select.selectOption("dark-s");
  await expect(errors).toEqual([]);
});
