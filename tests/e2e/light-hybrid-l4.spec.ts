import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const PORT = 3014;
const STATE = ".local/e2e-inicio";
let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(process.env.BUN_BIN ?? "bun", ["apps/api/test-support/inicio-server.ts"], {
    stdio: "pipe",
    env: { ...process.env, NODE_ENV: "test" },
  });
  await expect
    .poll(
      async () => {
        try {
          return (await request.get(`http://127.0.0.1:${PORT}/api/health`)).status();
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

async function login(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto("/inicio");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(STATE + "/bootstrap.txt", "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill("Clave ficticia L4 " + randomUUID());
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".secret")).toBeVisible();
  const secret = (await page.locator(".secret").textContent())!;
  await page.getByLabel("Código de la aplicación autenticadora").fill(totp(secret).generate());
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await page.getByRole("button", { name: "He guardado los códigos · Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Inicio", exact: true })).toBeVisible();
}

test("L4: responsive 820/390 y estados de Claro y Mixto", async ({ page }) => {
  test.setTimeout(180000);
  mkdirSync("artifacts/l4", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);

  const selectTheme = async (theme: string) => {
    await page.getByLabel("Apariencia").selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  };
  const noOverflow = async () =>
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);

  for (const theme of ["light-s", "hybrid-s"] as const) {
    for (const [width, height] of [
      [820, 900],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await selectTheme(theme);

      // Inicio: sin overflow y con objetivos táctiles completos
      await page.goto("/inicio");
      await expect(page.locator(".inicio-page .graphite-control")).toBeVisible();
      await noOverflow();
      await expect(page.locator(".inicio-page details summary").first()).toHaveCSS(
        "min-height",
        "44px",
      );
      const attention = page.locator(".inicio-page .graphite-attention-list a").first();
      await expect(attention).toBeVisible();
      const attentionBox = await attention.boundingBox();
      expect(attentionBox!.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: `artifacts/l4/inicio-${theme}-${width}.png` });

      // Movimientos: sin overflow, enlaces de concepto y casillas sin recorte
      await page.goto("/movimientos");
      await expect(page.locator(".movements-list")).toBeVisible();
      await noOverflow();
      if (width === 820) {
        const link = page.locator(".movements-list .ui-table td:nth-child(3) a").first();
        await expect(link).toBeVisible();
        const box = await link.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      const checkbox = page.locator(".movements-page .checkbox").first();
      await expect(checkbox).toBeVisible();
      const fits = await checkbox.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
      expect(fits).toBe(true);
      const checkboxBox = await checkbox.boundingBox();
      expect(checkboxBox!.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: `artifacts/l4/movimientos-${theme}-${width}.png` });

      // Estado vacío: filtros sin resultados
      await page.getByLabel("Buscar Concepto, Nota o ID").fill("zzzz-sin-resultados");
      const empty = page.locator(".movements-list .empty");
      await expect(empty).toBeVisible();
      await expect(empty).toHaveCSS("background-color", "rgb(255, 253, 249)");
      await expect(empty.locator("p").first()).toHaveCSS("font-size", "12px");
      await noOverflow();
      await page.screenshot({ path: `artifacts/l4/estado-vacio-${theme}-${width}.png` });
    }
  }

  // Smoke a 1440: los objetivos táctiles también aplican en escritorio
  await page.setViewportSize({ width: 1440, height: 1000 });
  await selectTheme("light-s");
  await page.goto("/inicio");
  const desktopAttention = page.locator(".inicio-page .graphite-attention-list a").first();
  await expect(desktopAttention).toBeVisible();
  expect((await desktopAttention.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  // Regresión: los otros temas conservan su responsive y su identidad
  for (const theme of ["dark-s", "casa", "graphite-lime"] as const) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/inicio");
    await selectTheme(theme);
    await expect(page.locator(".inicio-page .graphite-control")).toBeVisible();
    // La fila de 44 px es la política de accesibilidad compartida por las cinco
    // apariencias (inicio-shared): ya no es exclusiva de Claro/Mixto.
    await expect(page.locator(".inicio-page details summary").first()).toHaveCSS(
      "min-height",
      "44px",
    );
    await noOverflow();
  }

  expect(errors).toEqual([]);
});