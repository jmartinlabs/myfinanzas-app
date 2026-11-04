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

test("temas light-s/dark-s/hybrid-s: selector, persistencia, shell y arranque", async ({
  page,
}) => {
  mkdirSync("artifacts/theme", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(API_PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto("/saldos");
  await page
    .getByLabel("Token de configuración local")
    .fill(readFileSync(".local/e2e-theme/bootstrap.txt", "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(
    "Clave ficticia temas " + randomUUID(),
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
  await expect(
    page.getByRole("heading", { name: "Saldos", exact: true }),
  ).toBeVisible();

  const html = page.locator("html");
  const body = page.locator("body");
  const sidebar = page.locator(".sidebar");
  const select = page.getByLabel("Tema visual");
  const expectNoOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

  await expect(select).toHaveValue("dark-s");
  await expect(html).toHaveAttribute("data-theme", "dark-s");
  await expect(body).toHaveCSS("background-color", "rgb(20, 20, 20)");
  await expect(sidebar).toHaveCSS("background-color", "rgb(16, 16, 16)");
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(5);
  await expect(
    page.locator(".desktop-list").getByText("Cuenta cotidiana demo", { exact: true }).first(),
  ).toBeVisible();
  await expectNoOverflow();
  const primary = page.getByRole("button", { name: "Nuevo Saldo" });
  await primary.hover();
  await expect(primary).toHaveCSS("background-color", "rgb(240, 106, 69)");
  await page.mouse.move(0, 0);
  await expect(primary).toHaveCSS("background-color", "rgb(228, 87, 46)");
  await page.screenshot({ path: "artifacts/theme/dark-s-1440.png", fullPage: true });

  await select.selectOption("light-s");
  await expect(html).toHaveAttribute("data-theme", "light-s");
  await expect(body).toHaveCSS("background-color", "rgb(247, 245, 241)");
  await expect(sidebar).toHaveCSS("background-color", "rgb(236, 233, 226)");
  await page.reload();
  await expect(select).toHaveValue("light-s");
  await expect(body).toHaveCSS("background-color", "rgb(247, 245, 241)");
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(5);
  await page.screenshot({ path: "artifacts/theme/light-s-1440.png", fullPage: true });

  await select.selectOption("hybrid-s");
  await expect(html).toHaveAttribute("data-theme", "hybrid-s");
  await expect(sidebar).toHaveCSS("background-color", "rgb(31, 31, 31)");
  await expect(body).toHaveCSS("background-color", "rgb(247, 245, 241)");
  await expect(page.locator(".panel").first()).toHaveCSS(
    "background-color",
    "rgb(255, 252, 247)",
  );
  await page.reload();
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(5);
  await page.screenshot({ path: "artifacts/theme/hybrid-s-1440.png", fullPage: true });
  await expect(select).toHaveValue("hybrid-s");
  await expect(sidebar).toHaveCSS("background-color", "rgb(31, 31, 31)");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".mobile-list li")).toHaveCount(5);
  await expectNoOverflow();
  for (const [id, file] of [
    ["light-s", "light-s-390.png"],
    ["dark-s", "dark-s-390.png"],
    ["hybrid-s", "hybrid-s-390.png"],
  ] as const) {
    await select.selectOption(id);
    await expect(html).toHaveAttribute("data-theme", id);
    await expectNoOverflow();
    await page.screenshot({ path: `artifacts/theme/${file}`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await select.selectOption("dark-s");
  await expect(errors).toEqual([]);
});

test("el tema se aplica antes de React y no hay flash de otro tema", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("mf-theme", "light-s");
  });
  await page.route("**/src/main.tsx", (route) => route.abort());
  await page.goto("/saldos", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light-s");
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(247, 245, 241)",
  );
  await expect(page.locator("#root")).toBeEmpty();
});
