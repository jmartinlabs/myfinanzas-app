import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const origin = "http://127.0.0.1:3030";
const state = ".local/e2e-precierre";

async function login(page: any, request: any) {
  await expect
    .poll(
      async () => {
        try {
          return (await request.get(origin + "/api/health")).status();
        } catch {
          return 0;
        }
      },
      { timeout: 20000 },
    )
    .toBe(200);
  expect((await request.get(origin + "/api/cierres/precierre/1")).status()).toBe(401);
  await page.route("**/api/**", async (route: any) => {
    const url = new URL(route.request().url());
    url.port = new URL(origin).port;
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto("/precierre");
  await page
    .getByLabel("Token de configuración local")
    .fill(readFileSync(state + "/bootstrap.txt", "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia E2E " + randomUUID());
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
    .getByRole("button", { name: "He guardado los códigos · Continuar", exact: true })
    .click();
}

test("E4.8 precierre: solo lectura, estados y 1440/390", async ({ page, request }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  mkdirSync("artifacts/e2e-precierre", { recursive: true });
  const child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/precierre-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test", E2E_PORT: "3030", E2E_STATE: state },
    },
  );
  try {
    await login(page, request);
    await page.goto("/precierre");
    await expect(
      page.getByRole("heading", { name: "Revisión de precierre", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Wireframes W1–W6 pendientes de aprobación visual")).toBeVisible();
    await page.getByLabel("Ciclo").selectOption("1");
    await expect(page.getByText("Listo con avisos", { exact: true })).toBeVisible();
    await expect(page.getByText("Cobertura: Parcial", { exact: true })).toBeVisible();
    await expect(page.getByText("1.000,00 €", { exact: true })).toBeVisible();
    await expect(page.getByText("Verificado", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Cerrar ciclo \(E4\.9\)/ }),
    ).toBeDisabled();
    await expect(
      page.getByRole("region", { name: "Fuentes y cobertura del precierre" }),
    ).toBeVisible();
    await page.screenshot({
      path: "artifacts/e2e-precierre/precierre-1440.png",
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.getByLabel("Ciclo").selectOption("1");
    await expect(page.getByText("Listo con avisos", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({
      path: "artifacts/e2e-precierre/precierre-390.png",
      fullPage: true,
    });

    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
