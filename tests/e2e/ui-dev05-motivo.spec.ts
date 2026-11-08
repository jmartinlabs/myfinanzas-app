import { test, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * UI · DEV-05 — reservas de motivo.
 *
 * Servidor aislado en 3036 con MFA real y datos ficticios. Los tres estados
 * de error usan la respuesta real del servidor. En las anulaciones se envía un
 * motivo por encima del máximo del servidor para alcanzar el 422 sin desactivar
 * la confirmación que la UI exige con motivo (AC-32).
 */

const PORT = 3036;
const DIR = ".local/e2e-ui-dev05-motivo";
const ARTIFACTS = "artifacts/ui-dev05-motivo";
let child: ChildProcess | undefined;

async function login(page: Page) {
  await page.goto("/inversiones");
  await page
    .getByLabel("Token de configuración local")
    .fill(readFileSync(`${DIR}/bootstrap.txt`, "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia motivo " + randomUUID());
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

const tooLong = "x".repeat(2001);

async function expectMotivoError(
  page: Page,
  input: ReturnType<Page["getByLabel"]>,
  message: string,
  alert: string,
) {
  await expect(page.locator("#motivo-error")).toHaveText(message);
  await expect(input).toHaveAttribute("aria-describedby", "motivo-error");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toBeFocused();
  await expect(page.getByRole("alert")).toContainText(alert);
}

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

test("UI DEV-05 motivo: error asociado y foco en venta, compra y ciclo", async ({
  page,
}) => {
  test.setTimeout(180000);
  mkdirSync(ARTIFACTS, { recursive: true });
  const ids = JSON.parse(readFileSync(`${DIR}/ids.json`, "utf8")) as {
    compra: string;
    venta: string;
  };
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await login(page);

  // El servidor real devuelve fields.motivo; la UI no inventa el mapeo.
  const probes = await page.evaluate(
    async ({ compra, venta }) => {
      const csrf = (await (await fetch("/api/auth/session")).json()).csrf;
      const call = async (path: string, body: unknown) => {
        const response = await fetch("/api" + path, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrf,
          },
          body: JSON.stringify(body),
        });
        return { status: response.status, body: await response.json() };
      };
      return {
        compra: await call(`/compras/${compra}/anular`, {
          revision: 1,
          motivo: "",
        }),
        venta: await call(`/ventas/${venta}/anular`, {
          revision: 1,
          motivo: "",
        }),
        ciclo: await call("/ciclos/omitido/preview", {
          inicio: "2026-01-01",
          saldoInicialComida: "100.00",
          motivo: "",
        }),
      };
    },
    ids,
  );
  expect(probes.compra.status).toBe(422);
  expect(probes.compra.body.fields.motivo).toBe("Motivo obligatorio.");
  expect(probes.venta.status).toBe(422);
  expect(probes.venta.body.fields.motivo).toBe("Motivo obligatorio.");
  expect(probes.ciclo.status).toBe(422);
  expect(probes.ciclo.body.fields.motivo).toBe(
    "Motivo obligatorio, máximo 1000 caracteres.",
  );

  // Anulación de compra.
  await page.goto(`/inversiones/compras/${ids.compra}/anular`);
  await expect(
    page.getByRole("heading", { name: "Anular compra", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ver impacto de anulación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Impacto (no escribe hasta confirmar)",
      exact: true,
    }),
  ).toBeVisible();
  const compraMotivo = page.getByLabel("Motivo *", { exact: true });
  await compraMotivo.fill(tooLong);
  await expect(
    page.getByRole("button", { name: "Anular compra", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Anular compra", exact: true })
    .click();
  await expectMotivoError(
    page,
    compraMotivo,
    "Texto válido de hasta 2000 caracteres, sin controles.",
    "Revisa los campos indicados.",
  );
  await page.screenshot({
    path: `${ARTIFACTS}/anular-compra-error-1440.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(compraMotivo).toBeFocused();
  await page.screenshot({
    path: `${ARTIFACTS}/anular-compra-error-390.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });

  // Anulación de venta.
  await page.goto(`/inversiones/ventas/${ids.venta}/anular`);
  await expect(
    page.getByRole("heading", { name: "Anular venta", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ver impacto de anulación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Impacto (no escribe hasta confirmar)",
      exact: true,
    }),
  ).toBeVisible();
  const ventaMotivo = page.getByLabel("Motivo *", { exact: true });
  await ventaMotivo.fill(tooLong);
  await expect(
    page.getByRole("button", { name: "Anular venta", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Anular venta", exact: true })
    .click();
  await expectMotivoError(
    page,
    ventaMotivo,
    "Texto válido de hasta 2000 caracteres, sin controles.",
    "Revisa los campos indicados.",
  );
  await page.screenshot({
    path: `${ARTIFACTS}/anular-venta-error-1440.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(ventaMotivo).toBeFocused();
  await page.screenshot({
    path: `${ARTIFACTS}/anular-venta-error-390.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });

  // Operación de ciclo: el propio formulario envía el motivo vacío.
  await page.goto("/ciclos/omitido");
  await expect(
    page.getByRole("heading", {
      name: "Registrar ciclo omitido",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Inicio ciclo *", { exact: true }).fill("2026-01-01");
  await page
    .getByLabel("Saldo inicial comida (€) *", { exact: true })
    .fill("100.00");
  await page
    .getByRole("button", { name: "Revisar impacto", exact: true })
    .click();
  const cicloMotivo = page.getByLabel("Motivo *", { exact: true });
  await expectMotivoError(
    page,
    cicloMotivo,
    "Motivo obligatorio, máximo 1000 caracteres.",
    "Indica el motivo de la operación.",
  );
  await page.screenshot({
    path: `${ARTIFACTS}/ciclo-omitido-error-1440.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(cicloMotivo).toBeFocused();
  await page.screenshot({
    path: `${ARTIFACTS}/ciclo-omitido-error-390.png`,
    fullPage: true,
  });

  expect(errors).toEqual([]);
});
