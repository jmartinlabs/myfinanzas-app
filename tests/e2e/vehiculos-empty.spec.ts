import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

test("E3.3 AC-29: carga y listado vacío reales, sin filas ni importes ficticios", async ({
  page,
  request,
}) => {
  const child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/vehiculos-empty-server.ts"],
      { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
    ),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await expect
      .poll(
        async () => {
          try {
            return (
              await request.get("http://127.0.0.1:3010/api/health")
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(200);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3010";
      await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
    });
    await page.goto("/vehiculos");
    await page
      .getByLabel("Token de configuración local")
      .fill(readFileSync(".local/e2e-vehiculos-empty/bootstrap.txt", "utf8"));
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Contraseña ficticia vacía " + randomUUID());
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
      .getByRole("button", {
        name: "He guardado los códigos · Continuar",
        exact: true,
      })
      .click();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/vehiculos?*", async (route) => {
      await gate;
      await route.fallback();
    });
    mkdirSync("artifacts/e3-3", { recursive: true });
    await page.getByRole("link", { name: /Vehículos/ }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Cargando vehículos…" }),
    ).toBeVisible();
    await expect(page.locator(".vehicle-table")).toHaveCount(0);
    await expect(page.locator(".vehicle-cards li")).toHaveCount(0);
    await expect(page.locator("main").getByText(/€/)).toHaveCount(0);
    await page.screenshot({
      path: "artifacts/e3-3/vehiculos-empty-loading-1440.png",
      fullPage: true,
    });
    release();
    await expect(
      page.getByRole("heading", { name: "Sin vehículos", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".vehicle-table")).toHaveCount(0);
    await expect(page.locator(".vehicle-cards li")).toHaveCount(0);
    await expect(page.locator("main").getByText(/€/)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Nuevo vehículo", exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: "artifacts/e3-3/vehiculos-empty-1440.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".vehicle-table")).toHaveCount(0);
    await expect(page.locator(".vehicle-cards li")).toHaveCount(0);
    await expect(page.locator("main").getByText(/€/)).toHaveCount(0);
    await page.screenshot({
      path: "artifacts/e3-3/vehiculos-empty-390.png",
      fullPage: true,
    });
    await page.unroute("**/api/vehiculos?*");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
