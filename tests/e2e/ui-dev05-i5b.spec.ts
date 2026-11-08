import { test, expect, type APIRequestContext } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * UI · DEV-05 I5b — Inversiones.
 *
 * Servidor aislado en 3026 con MFA real. Las capturas y los estados de error
 * usan datos ficticios creados por el propio servidor de test.
 */

const PORT = 3026;
const DIR = ".local/e2e-ui-dev05-i5b";
const THEMES = ["light-s", "dark-s", "hybrid-s"] as const;
let child: ChildProcess | undefined;

async function waitForApi(request: APIRequestContext) {
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
}

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/ui-dev05-i5b-server.ts"],
    { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
  );
  await waitForApi(request);
});

test.afterAll(() => {
  child?.kill();
});

test("UI DEV-05 I5b: formularios, error asociado, foco y temas", async ({
  page,
}) => {
  test.setTimeout(240000);
  mkdirSync("artifacts/ui-dev05-i5b", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });

  const password = "Contraseña ficticia UI DEV-05 I5b " + randomUUID();
  await page.goto("/inversiones/instrumentos/nuevo");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(`${DIR}/bootstrap.txt`, "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
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

  const settle = async () =>
    page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  const assertNoOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  const selectTheme = async (theme: (typeof THEMES)[number]) => {
    await page.getByLabel("Tema visual").selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  };
  const screens = [
    {
      name: "instrumento",
      path: "/inversiones/instrumentos/nuevo",
      ready: async () => {
        await expect(
          page.getByRole("heading", {
            name: "Nuevo instrumento",
            exact: true,
          }),
        ).toBeVisible();
        await expect(page.getByLabel("Nombre *", { exact: true })).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Identificación", exact: true }),
        ).toBeVisible();
      },
    },
    {
      name: "compra",
      path: "/inversiones/compras/nueva",
      ready: async () => {
        await expect(
          page.getByRole("heading", { name: "Nueva compra", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", {
            name: "Datos de la operación",
            exact: true,
          }),
        ).toBeVisible();
        await expect(page.getByLabel("Fecha *", { exact: true })).toBeVisible();
        await expect(
          page.getByLabel("Saldo de efectivo *", { exact: true }),
        ).toBeVisible();
      },
    },
  ];

  for (const theme of THEMES) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await selectTheme(theme);
    for (const screen of screens) {
      for (const [width, height] of [
        [1440, 1000],
        [390, 844],
      ] as const) {
        await page.setViewportSize({ width, height });
        await page.goto(screen.path);
        await screen.ready();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await settle();
        await assertNoOverflow();
        await page.screenshot({
          path: `artifacts/ui-dev05-i5b/${screen.name}-${theme}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }

  // Error y foco: el mensaje vive en el contenedor al que apunta
  // aria-describedby y el primer control inválido recibe el foco.
  await selectTheme("dark-s");
  for (const [width, height] of [
    [1440, 1000],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/inversiones/instrumentos/nuevo");
    await page
      .getByRole("button", { name: "Guardar instrumento", exact: true })
      .click();
    await expect(page.locator("#nombre-error")).toHaveText(
      "Nombre de 1–120 caracteres, sin caracteres de control.",
    );
    await expect(page.getByLabel("Nombre *", { exact: true })).toHaveAttribute(
      "aria-describedby",
      "nombre-error",
    );
    await expect(page.getByLabel("Nombre *", { exact: true })).toBeFocused();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i5b/instrumento-error-${width}.png`,
      fullPage: true,
    });

    await page.goto("/inversiones/compras/nueva");
    await page
      .getByRole("button", { name: "Revisar compra", exact: true })
      .click();
    await expect(page.locator("#fecha-error")).toHaveText(
      "Indica una fecha civil válida.",
    );
    await expect(page.getByLabel("Fecha *", { exact: true })).toHaveAttribute(
      "aria-describedby",
      "fecha-error",
    );
    await expect(page.getByLabel("Fecha *", { exact: true })).toBeFocused();
    await expect(page.getByRole("alert")).toContainText(
      "Revisa los campos indicados.",
    );
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i5b/compra-error-${width}.png`,
      fullPage: true,
    });
  }

  expect(errors).toEqual([]);
});
