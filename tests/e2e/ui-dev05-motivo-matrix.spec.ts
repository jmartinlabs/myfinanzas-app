import { test, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * UI · DEV-05 — matriz visual reproducible de reservas de motivo.
 *
 * Reutiliza el servidor aislado en 3036 y los tres errores reales del servidor
 * (`fields.motivo`) del spec `ui-dev05-motivo.spec.ts`. Repite cada error en los
 * tres temas reales (`localStorage["mf-theme"]` + `theme-boot.js`) y en los dos
 * anchos de referencia, y deja 18 capturas en
 * `artifacts/ui-dev05-motivo-matrix/` (ignorado por Git).
 *
 * No modifica producto, `style.css` ni el spec existente.
 */

const PORT = 3036;
const DIR = ".local/e2e-ui-dev05-motivo";
const ARTIFACTS = "artifacts/ui-dev05-motivo-matrix";

const THEMES = [
  { name: "light", storage: "light-s" },
  { name: "dark", storage: "dark-s" },
  { name: "hybrid", storage: "hybrid-s" },
] as const;

const VIEWPORTS = [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
] as const;

const tooLong = "x".repeat(2001);
let child: ChildProcess | undefined;

type Ids = { compra: string; venta: string };
type MotivoInput = ReturnType<Page["getByLabel"]>;
type Scenario = {
  key: "venta" | "compra" | "ciclo";
  message: string;
  alert: string;
  trigger: (page: Page, ids: Ids) => Promise<MotivoInput>;
};

async function login(page: Page) {
  await page.goto("/inversiones");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(`${DIR}/bootstrap.txt`, "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia motivo matriz " + randomUUID());
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".secret")).toBeVisible();
  const secret = (await page.locator(".secret").textContent())!;
  await page
    .getByLabel("Código de la aplicación autenticadora")
    .fill(
      totp(secret).generate({
        timestamp: Date.parse("2026-10-26T12:00:00Z"),
      }),
    );
  await page
    .getByRole("button", { name: "Verificar código", exact: true })
    .click();
  await page
    .getByRole("button", { name: "He guardado los códigos · Continuar" })
    .click();
}

/** Cambia el tema con el mecanismo real: storage + recarga + theme-boot.js. */
async function applyTheme(page: Page, storage: string) {
  await page.evaluate(
    (value) => localStorage.setItem("mf-theme", value),
    storage,
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", storage);
}

async function expectMotivoError(
  page: Page,
  input: MotivoInput,
  message: string,
  alert: string,
) {
  const error = page.locator("#motivo-error");
  await expect(error).toBeVisible();
  await expect(error).toHaveText(message);
  await expect(input).toHaveAttribute("aria-describedby", "motivo-error");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toBeFocused();
  await expect(page.getByRole("alert")).toContainText(alert);
}

async function expectNoHorizontalOverflow(page: Page, width: number) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(metrics.innerWidth).toBe(width);
  expect(metrics.scrollWidth).toBe(metrics.innerWidth);
}

const scenarios: Scenario[] = [
  {
    key: "venta",
    message: "Texto válido de hasta 2000 caracteres, sin controles.",
    alert: "Revisa los campos indicados.",
    trigger: async (page, ids) => {
      await page.goto(`/inversiones/ventas/${ids.venta}/anular`);
      await expect(
        page.getByRole("heading", { name: "Anular venta", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: "Ver impacto de anulación",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "Impacto (no escribe hasta confirmar)",
          exact: true,
        }),
      ).toBeVisible();
      const input = page.getByLabel("Motivo *", { exact: true });
      await input.fill(tooLong);
      await expect(
        page.getByRole("button", { name: "Anular venta", exact: true }),
      ).toBeEnabled();
      await page
        .getByRole("button", { name: "Anular venta", exact: true })
        .click();
      return input;
    },
  },
  {
    key: "compra",
    message: "Texto válido de hasta 2000 caracteres, sin controles.",
    alert: "Revisa los campos indicados.",
    trigger: async (page, ids) => {
      await page.goto(`/inversiones/compras/${ids.compra}/anular`);
      await expect(
        page.getByRole("heading", { name: "Anular compra", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: "Ver impacto de anulación",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "Impacto (no escribe hasta confirmar)",
          exact: true,
        }),
      ).toBeVisible();
      const input = page.getByLabel("Motivo *", { exact: true });
      await input.fill(tooLong);
      await expect(
        page.getByRole("button", { name: "Anular compra", exact: true }),
      ).toBeEnabled();
      await page
        .getByRole("button", { name: "Anular compra", exact: true })
        .click();
      return input;
    },
  },
  {
    key: "ciclo",
    message: "Motivo obligatorio, máximo 1000 caracteres.",
    alert: "Indica el motivo de la operación.",
    trigger: async (page) => {
      await page.goto("/ciclos/omitido");
      await expect(
        page.getByRole("heading", {
          name: "Registrar ciclo omitido",
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByLabel("Inicio ciclo *", { exact: true })
        .fill("2026-01-01");
      await page
        .getByLabel("Saldo inicial comida (€) *", { exact: true })
        .fill("100.00");
      await page
        .getByRole("button", { name: "Revisar impacto", exact: true })
        .click();
      return page.getByLabel("Motivo *", { exact: true });
    },
  },
];

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/ui-dev05-motivo-server.ts"],
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

test("UI DEV-05 matriz motivo: 3 errores × 3 temas × 2 anchos", async ({
  page,
}) => {
  test.setTimeout(900000);
  mkdirSync(ARTIFACTS, { recursive: true });
  const ids = JSON.parse(readFileSync(`${DIR}/ids.json`, "utf8")) as Ids;
  const errors: string[] = [];
  const screenshots: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await login(page);

  for (const scenario of scenarios) {
    for (const theme of THEMES) {
      await applyTheme(page, theme.storage);
      const input = await scenario.trigger(page, ids);

      for (const viewport of VIEWPORTS) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await expectMotivoError(
          page,
          input,
          scenario.message,
          scenario.alert,
        );
        await expectNoHorizontalOverflow(page, viewport.width);
        const file = `${ARTIFACTS}/${scenario.key}-${theme.name}-${viewport.width}.png`;
        await page.screenshot({ path: file, fullPage: true });
        screenshots.push(file);
      }
    }
  }

  expect(errors).toEqual([]);
  expect(screenshots).toHaveLength(scenarios.length * THEMES.length * VIEWPORTS.length);
  for (const file of screenshots) {
    expect(statSync(file).size).toBeGreaterThan(0);
  }
});
