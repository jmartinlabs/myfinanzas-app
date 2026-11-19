import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

import { artifactDir } from "./fixture";

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
    "Clave ficticia Aurora " + randomUUID(),
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

test("Aurora: sexta apariencia, degradados, persistencia y 1440/820/390", async ({
  page,
}) => {
  const artifacts = artifactDir("theme");
  await authenticate(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const html = page.locator("html");
  const body = page.locator("body");
  const sidebar = page.locator(".sidebar");
  const select = page.getByLabel("Cambiar tema");
  const expectNoOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

  // El catálogo conserva las cinco apariencias y añade Aurora al final.
  await expect(select.locator("option")).toHaveCount(6);
  for (const [index, value, label] of [
    [0, "light-s", "Claro"],
    [1, "dark-s", "Oscuro"],
    [2, "hybrid-s", "Mixto"],
    [3, "graphite-lime", "Graphite Lime"],
    [4, "casa", "Casa"],
    [5, "aurora", "Aurora"],
  ] as const) {
    await expect(select.locator("option").nth(index)).toHaveAttribute(
      "value",
      value,
    );
    await expect(select.locator("option").nth(index)).toHaveText(label);
  }

  // Aurora: identidad oscura azul-negro con reflejos, no plana.
  await select.selectOption("aurora");
  await expect(html).toHaveAttribute("data-theme", "aurora");
  await expect(body).toHaveCSS("background-color", "rgb(9, 17, 21)");
  await expect(body).toHaveCSS("background-image", /gradient/);
  await expect(sidebar).toHaveCSS("background-color", "rgb(11, 17, 21)");
  await expect(sidebar).toHaveCSS("background-image", /gradient/);
  await expect(page.locator(".nav-active")).toHaveCSS(
    "background-image",
    /gradient/,
  );
  await expect(page.locator(".global-header")).toHaveCSS(
    "background-color",
    "rgba(9, 17, 21, 0.72)",
  );
  await expect(page.locator(".panel").first()).toHaveCSS(
    "background-image",
    /gradient/,
  );
  await expectNoOverflow();

  // Inicio: el hero de control y la banda KPI llevan luz propia.
  await page.goto("/inicio");
  await expect(page.locator(".inicio-page")).toBeVisible();
  await expect(page.locator(".graphite-control")).toHaveCSS(
    "background-image",
    /gradient/,
  );
  await expect(page.locator(".graphite-kpis")).toHaveCSS(
    "background-image",
    /gradient/,
  );
  await expectNoOverflow();
  await page.screenshot({
    path: join(artifacts, "aurora-inicio-1440.png"),
    fullPage: true,
  });

  // Movimientos: misma composición, distinta presentación.
  await page.goto("/movimientos");
  await expect(page.locator(".movements-list")).toBeVisible();
  await expect(page.locator(".movements-list")).toHaveCSS(
    "background-image",
    /gradient/,
  );
  await expectNoOverflow();
  await page.screenshot({
    path: join(artifacts, "aurora-movimientos-1440.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 820, height: 1000 });
  await expectNoOverflow();
  await page.screenshot({
    path: join(artifacts, "aurora-movimientos-820.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoOverflow();
  await page.screenshot({
    path: join(artifacts, "aurora-movimientos-390.png"),
    fullPage: true,
  });

  // Persistencia real: recarga y conserva Aurora.
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "aurora");
  await expect(select).toHaveValue("aurora");

  // Los cinco temas anteriores siguen funcionando y vuelven a su identidad.
  for (const [theme, background] of [
    ["light-s", "rgb(246, 242, 234)"],
    ["dark-s", "rgb(20, 20, 20)"],
    ["hybrid-s", "rgb(242, 237, 227)"],
    ["graphite-lime", "rgb(11, 12, 11)"],
    ["casa", "rgb(244, 241, 232)"],
  ] as const) {
    await select.selectOption(theme);
    await expect(html).toHaveAttribute("data-theme", theme);
    await expect(body).toHaveCSS("background-color", background);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await select.selectOption("dark-s");
  await expect(html).toHaveAttribute("data-theme", "dark-s");
  await expect(errors).toEqual([]);
});

test("Aurora se aplica antes de React y un tema desconocido cae a dark-s", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("mf-theme", "aurora");
  });
  await page.route("**/src/main.tsx", (route) => route.abort());
  await page.goto("/saldos", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "aurora");
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(9, 17, 21)",
  );
  await expect(page.locator("#root")).toBeEmpty();

  const fallback = await page.context().newPage();
  await fallback.addInitScript(() => {
    localStorage.setItem("mf-theme", "desconocido");
  });
  await fallback.route("**/src/main.tsx", (route) => route.abort());
  await fallback.goto("/saldos", { waitUntil: "domcontentloaded" });
  await expect(fallback.locator("html")).toHaveAttribute(
    "data-theme",
    "dark-s",
  );
  await expect(fallback.locator("html")).toHaveCSS(
    "background-color",
    "rgb(20, 20, 20)",
  );
  await fallback.close();
});
