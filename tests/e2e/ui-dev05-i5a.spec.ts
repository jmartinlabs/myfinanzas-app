import { test, expect, type APIRequestContext } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * UI · DEV-05 I5a — Compartidos y PlanesCiclo.
 *
 * Servidor aislado en 3025 con MFA real. Las capturas y los estados de error
 * usan datos ficticios creados por el propio servidor de test.
 */

const PORT = 3025;
const DIR = ".local/e2e-ui-dev05-i5a";
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
    ["apps/api/test-support/ui-dev05-i5a-server.ts"],
    { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
  );
  await waitForApi(request);
});

test.afterAll(() => {
  child?.kill();
});

test("UI DEV-05 I5a: formularios, error asociado, foco y temas", async ({
  page,
}) => {
  test.setTimeout(240000);
  mkdirSync("artifacts/ui-dev05-i5a", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });

  const password = "Contraseña ficticia UI DEV-05 I5a " + randomUUID();
  await page.goto("/compartidos/nuevo");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(`${DIR}/bootstrap.txt`, "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
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
  const openPlanEditor = async () => {
    await expect(
      page.getByRole("heading", { name: "Sin plan", exact: true }),
    ).toBeVisible();
    const add = page.getByLabel("Añadir Presupuesto al plan");
    await expect(add).toContainText("Presupuesto I5a ficticio");
    await add.selectOption({ index: 1 });
    await expect(
      page.getByRole("heading", {
        name: "Editar línea del plan",
        exact: true,
      }),
    ).toBeVisible();
  };
  const screens = [
    {
      name: "compartidos",
      path: "/compartidos/nuevo",
      ready: async () => {
        await expect(
          page.getByRole("heading", {
            name: "Nuevo caso compartido",
            exact: true,
          }),
        ).toBeVisible();
        await expect(page.getByLabel("Nombre del caso")).toBeVisible();
      },
    },
    {
      name: "planes-ciclo",
      path: "/planes-ciclo",
      ready: openPlanEditor,
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
        await settle();
        await assertNoOverflow();
        await page.screenshot({
          path: `artifacts/ui-dev05-i5a/${screen.name}-${theme}-${width}.png`,
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
    await page.goto("/compartidos/nuevo");
    await page
      .getByRole("button", { name: "Crear caso", exact: true })
      .click();
    await expect(page.locator("#shared-name-error")).toHaveText(
      "Indica un nombre válido.",
    );
    await expect(page.getByLabel("Nombre del caso")).toHaveAttribute(
      "aria-describedby",
      "shared-name-error",
    );
    await expect(page.getByLabel("Nombre del caso")).toBeFocused();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i5a/compartidos-error-${width}.png`,
      fullPage: true,
    });

    await page.goto("/planes-ciclo");
    await openPlanEditor();
    await page.getByLabel("Base", { exact: true }).fill("-1");
    await page
      .getByRole("button", { name: "Revisar cambios del plan", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("Importe negativo.");
    await expect(page.locator("#plan-error-base")).toHaveText(
      "No se admiten negativos.",
    );
    await expect(page.getByLabel("Base", { exact: true })).toHaveAttribute(
      "aria-describedby",
      "plan-base-error",
    );
    await expect(page.getByLabel("Base", { exact: true })).toBeFocused();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i5a/planes-ciclo-error-${width}.png`,
      fullPage: true,
    });
  }

  expect(errors).toEqual([]);
});
