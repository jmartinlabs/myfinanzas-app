import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * MFA · QR de alta TOTP.
 *
 * Servidor aislado en 3046 con MFA real y datos ficticios. Comprueba que el QR
 * generado en el navegador aparece solo en el alta (con la clave manual), que
 * desaparece al completar el segundo factor y que no existe en login ni en
 * recuperación. Captura el alta en los tres temas a 390 y 1440.
 */

const PORT = 3046;
const DIR = ".local/e2e-mfa-qr";
const ARTIFACTS = "artifacts/mfa-qr";
const THEMES = ["dark-s", "light-s", "hybrid-s"] as const;
const QR_LABEL = "Código QR para configurar la aplicación autenticadora";
let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(process.env.BUN_BIN ?? "bun", [
    "apps/api/test-support/mfa-qr-server.ts",
  ], { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } });
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

test("MFA QR: aparece solo en el alta, con clave manual, y desaparece al verificar", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  mkdirSync(ARTIFACTS, { recursive: true });
  const errors: string[] = [];
  const hosts = new Set<string>();
  const watch = (p: typeof page) => {
    p.on("pageerror", (error) => errors.push(error.message));
    p.on("request", (request) => hosts.add(new URL(request.url()).host));
  };
  const routeApi = async (p: typeof page) =>
    p.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = String(PORT);
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
  watch(page);
  await routeApi(page);

  const password = "Clave ficticia mfa qr " + randomUUID();
  const qr = page.getByRole("img", { name: QR_LABEL, exact: true });

  await page.goto("/saldos");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(`${DIR}/bootstrap.txt`, "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  // Alta: QR accesible y clave manual conviven, con los textos ya existentes.
  await expect(qr).toBeVisible();
  await expect(page.locator(".totp-qr svg")).toHaveCount(1);
  await expect(page.locator(".secret")).toBeVisible();
  await expect(page.locator(".secret")).toHaveCSS("user-select", "all");
  await expect(
    page.getByText("Introduce esta clave como cuenta TOTP (6 dígitos, 30 segundos)."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Abrir aplicación autenticadora" }),
  ).toBeVisible();
  // Marcado local: sin imágenes, scripts ni recursos remotos dentro del QR.
  const qrMarkup = await page.locator(".totp-qr").innerHTML();
  expect(qrMarkup).toContain("<svg");
  expect(qrMarkup).toContain('role="img"');
  expect(qrMarkup).not.toContain("http");
  expect(qrMarkup).not.toContain("<image");
  expect(qrMarkup).not.toContain("<script");
  expect(qrMarkup).not.toContain("data:");
  expect(qrMarkup).not.toContain("style=");
  await expect(page.locator(".totp-qr img")).toHaveCount(0);
  // La etiqueta no filtra el secreto ni el URI.
  const secret = (
    await page.locator(".secret").textContent()
  )!.trim();
  expect(secret).toMatch(/^[A-Z2-7]+$/);
  await expect(qr).not.toHaveAttribute("aria-label", new RegExp(secret));
  await expect(page.locator(".totp-qr")).not.toContainText("otpauth");

  const expectNoOverflow = async (p: typeof page) =>
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

  // Fondo blanco fijo del QR legible sobre las tres superficies.
  const expectQrSurface = async (p: typeof page) => {
    await expect(p.locator(".totp-qr")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    const box = (await p.locator(".totp-qr svg").boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(180);
    expect(box.width).toBeLessThanOrEqual(220);
  };

  const shoot = async (p: typeof page, theme: string) => {
    for (const [width, height] of [
      [1440, 1000],
      [390, 844],
    ] as const) {
      await p.setViewportSize({ width, height });
      await expect(qr).toBeVisible();
      await expectNoOverflow(p);
      await expectQrSurface(p);
      await p.screenshot({
        path: `${ARTIFACTS}/alta-qr-${theme}-${width}.png`,
        fullPage: true,
      });
    }
  };

  // dark-s (tema inicial) en la página del alta.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark-s");
  await shoot(page, "dark-s");

  // light-s y hybrid-s: sesión de login con el mismo dueño aún no verificado,
  // así que vuelve a mostrarse el alta con su propio QR.
  for (const theme of ["light-s", "hybrid-s"] as const) {
    const themed = await context.newPage();
    watch(themed);
    await routeApi(themed);
    await themed.addInitScript(
      (id) => localStorage.setItem("mf-theme", id),
      theme,
    );
    await themed.setViewportSize({ width: 1440, height: 1000 });
    await themed.goto("/saldos");
    await themed.getByLabel("Contraseña", { exact: true }).fill(password);
    await themed
      .getByRole("button", { name: "Continuar", exact: true })
      .click();
    await expect(themed.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(
      themed.getByRole("img", { name: QR_LABEL, exact: true }),
    ).toBeVisible();
    await expect(themed.locator(".secret")).toBeVisible();
    await shoot(themed, theme);
    // El QR ya verificado no reaparece al completar el alta en otra pestaña.
    await themed.close();
  }

  // Completa el alta: el QR desaparece al verificar el TOTP.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByLabel("Código de la aplicación autenticadora")
    .fill(totp(secret).generate());
  await page
    .getByRole("button", { name: "Verificar código", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "He guardado los códigos · Continuar" }),
  ).toBeVisible();
  await expect(page.locator(".totp-qr")).toHaveCount(0);
  await expect(page.locator(".secret")).toHaveCount(0);
  await page
    .getByRole("button", { name: "He guardado los códigos · Continuar" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saldos", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".totp-qr")).toHaveCount(0);

  // Login: el segundo factor ya no muestra QR porque no hay alta pendiente.
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByLabel("Código de la aplicación autenticadora"),
  ).toBeVisible();
  await expect(page.locator(".totp-qr")).toHaveCount(0);
  await expect(page.locator(".secret")).toHaveCount(0);
  await expect(page.getByRole("img", { name: QR_LABEL })).toHaveCount(0);

  // Recuperación: tampoco hay QR.
  await page
    .getByRole("button", { name: "Volver al inicio de sesión" })
    .click();
  await page
    .getByRole("button", { name: "He perdido mi segundo factor" })
    .click();
  await expect(
    page.getByLabel("Código de recuperación"),
  ).toBeVisible();
  await expect(page.locator(".totp-qr")).toHaveCount(0);
  await expect(page.getByRole("img", { name: QR_LABEL })).toHaveCount(0);
  await page.screenshot({
    path: `${ARTIFACTS}/login-recuperacion-sin-qr-1440.png`,
    fullPage: true,
  });

  // Solo se habló con la app local: ni imágenes ni peticiones remotas.
  expect([...hosts].filter((h) => !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(h))).toEqual([]);
  expect(errors).toEqual([]);
});
