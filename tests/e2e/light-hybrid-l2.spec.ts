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
  await page.getByLabel("Contraseña", { exact: true }).fill("Clave ficticia L2 " + randomUUID());
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".secret")).toBeVisible();
  const secret = (await page.locator(".secret").textContent())!;
  await page.getByLabel("Código de la aplicación autenticadora").fill(totp(secret).generate());
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await page.getByRole("button", { name: "He guardado los códigos · Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Inicio", exact: true })).toBeVisible();
}

test("L2: identidad de Inicio en Claro y Mixto, 1440/820/390", async ({ page }) => {
  test.setTimeout(180000);
  mkdirSync("artifacts/l2", { recursive: true });
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
    await selectTheme(theme);
    const hero = page.locator(".inicio-page .graphite-control");
    await expect(hero).toBeVisible();
    await expect(hero).toHaveCSS("color", "rgb(244, 241, 232)");
    await expect(page.locator(".inicio-page .graphite-kpis")).toHaveCSS("padding", "8px");
    await expect(page.locator(".inicio-page .graphite-kpi").first()).toHaveCSS(
      "border-radius",
      "11px",
    );
    await expect(page.locator(".inicio-page .graphite-position")).toHaveCSS("padding", "8px");
    await expect(
      page.locator(".inicio-page .graphite-cycle .graphite-section-head"),
    ).toHaveCSS("background-color", "rgb(244, 236, 225)");
    if (theme === "light-s") {
      await expect(page.locator(".inicio-page .graphite-attention")).toHaveCSS(
        "border-top-color",
        "rgb(232, 201, 122)",
      );
      await expect(
        page.locator(".inicio-page .graphite-objective .eyebrow").first(),
      ).toHaveCSS("color", "rgb(168, 214, 207)");
      await expect(
        page.locator(".inicio-page .graphite-objective a").first(),
      ).toHaveCSS("color", "rgb(168, 214, 207)");
    } else {
      await expect(page.locator(".inicio-page .graphite-objective")).toHaveCSS(
        "border-top-color",
        "rgb(23, 97, 106)",
      );
      await expect(page.locator(".inicio-page .graphite-attention")).toHaveCSS(
        "border-top-color",
        "rgb(183, 212, 209)",
      );
    }
    for (const [width, height] of [
      [1440, 1000],
      [820, 900],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await noOverflow();
      await page.screenshot({
        path: `artifacts/l2/inicio-${theme}-${width}.png`,
        fullPage: true,
      });
      if (width === 1440) {
        await page.screenshot({ path: `artifacts/l2/inicio-${theme}-fold.png` });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator(".inicio-page .graphite-control").screenshot({
      path: `artifacts/l2/hero-${theme}.png`,
    });
  }

  // Regresión: los otros temas no reciben la capa de L2
  for (const theme of ["dark-s", "casa", "graphite-lime"] as const) {
    await selectTheme(theme);
    await expect(page.locator(".inicio-page .graphite-control")).toBeVisible();
    await expect(page.locator(".inicio-page .graphite-control")).not.toHaveCSS(
      "color",
      "rgb(244, 241, 232)",
    );
    await expect(page.locator(".inicio-page .graphite-kpis")).not.toHaveCSS(
      "background-color",
      "rgb(244, 236, 225)",
    );
    await noOverflow();
  }

  expect(errors).toEqual([]);
});
