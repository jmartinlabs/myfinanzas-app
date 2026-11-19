import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
import { fixtureContext } from "./fixture";

// Puerto y estado propios de la ejecución (#514): dos runs simultáneos de esta
// misma spec no comparten listener ni SQLite.
const fixture = fixtureContext("vehiculos-empty");
const API_PORT = fixture.port;

/** Salida del fixture: el pipe se lee siempre y se muestra si algo falla. */
let child: ChildProcess | undefined;
let fixtureOutput = "";
let fixtureExit: { code: number | null; signal: NodeJS.Signals | null } | null =
  null;

function fixtureFailure(): string {
  const detail = fixtureOutput.trim() || "(sin salida)";
  const how = fixtureExit
    ? `código ${fixtureExit.code ?? "null"}${fixtureExit.signal ? ` / señal ${fixtureExit.signal}` : ""}`
    : "salida no registrada";
  return `El fixture vehiculos-empty terminó antes de servir (${how}): ${detail}`;
}

/** Un fixture muerto no puede quedar enmascarado por un poll que responde. */
function assertFixtureAlive() {
  if (fixtureExit) throw new Error(fixtureFailure());
}

test("E3.3 AC-29: carga y listado vacío reales, sin filas ni importes ficticios", async ({
  page,
  request,
}) => {
  child = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/vehiculos-empty-server.ts"],
      { stdio: ["ignore", "pipe", "pipe"], env: fixture.env },
    );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  child.stdout?.on("data", (chunk: Buffer) => {
    fixtureOutput += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    fixtureOutput += chunk.toString();
  });
  child.on("exit", (code, signal) => {
    fixtureExit = { code, signal };
  });
  try {
    await expect
      .poll(
        async () => {
          assertFixtureAlive();
          try {
            return (
              await request.get(`http://127.0.0.1:${API_PORT}/api/health`)
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(200);
    // El fixture provisionó su base ficticia antes de servir: se navega solo
    // cuando el estado de esta run está en disco.
    assertFixtureAlive();
    expect(
      existsSync(join(fixture.dir, "bootstrap.txt")),
      `El fixture vehiculos-empty no provisionó ${fixture.dir}/bootstrap.txt: ${fixtureOutput.trim()}`,
    ).toBe(true);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = String(API_PORT);
      await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
    });
    await page.goto("/vehiculos");
    await page
      .getByLabel("Código de activación")
      .fill(readFileSync(join(fixture.dir, "bootstrap.txt"), "utf8"));
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
    await page.goto("/vehiculos");
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
    child?.kill();
    child?.stdout?.destroy();
    child?.stderr?.destroy();
  }
});