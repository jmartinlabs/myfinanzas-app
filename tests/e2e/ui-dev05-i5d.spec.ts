import { test, expect, type APIRequestContext } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * UI · DEV-05 I5d — Revisión Comida y Vehículos.
 *
 * Servidor aislado en 3027 con MFA real. Las capturas y los estados de error
 * usan datos ficticios creados por el propio servidor de test.
 */

const PORT = 3027;
const DIR = ".local/e2e-ui-dev05-i5d";
const THEMES = ["light-s", "dark-s", "hybrid-s"] as const;
let child: ChildProcess | undefined;

type Ids = { vehicle: string; conversion: string; detail: string };

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
    ["apps/api/test-support/ui-dev05-i5d-server.ts"],
    { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
  );
  await waitForApi(request);
});

test.afterAll(() => {
  child?.kill();
});

test("UI DEV-05 I5d: formularios, error asociado, foco y temas", async ({
  page,
}) => {
  test.setTimeout(240000);
  mkdirSync("artifacts/ui-dev05-i5d", { recursive: true });
  const ids = JSON.parse(readFileSync(`${DIR}/ids.json`, "utf8")) as Ids;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });

  const password = "Contraseña ficticia UI DEV-05 I5d " + randomUUID();
  await page.goto("/revision-comida/nueva");
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
  const detailPath = `/revision-comida/${ids.detail}`;
  const conversionPath = `/referencias/${ids.conversion}/convertir`;
  const screens = [
    {
      name: "revision-operacion",
      path: "/revision-comida/nueva",
      ready: async () => {
        await expect(
          page.getByRole("heading", { name: "Nueva operación", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", {
            name: "Datos de la operación",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByLabel("Fecha de operación", { exact: true }),
        ).toBeVisible();
      },
    },
    {
      name: "revision-reposicion",
      path: "/revision-comida/reposiciones/nueva",
      ready: async () => {
        await expect(
          page.getByRole("heading", { name: "Nueva reposición", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByLabel("Evidencia bancaria (obligatoria)", { exact: true }),
        ).toBeVisible();
      },
    },
    {
      name: "vehiculo-nuevo",
      path: "/vehiculos/nuevo",
      ready: async () => {
        await expect(
          page.getByRole("heading", { name: "Nuevo vehículo", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Identificación", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByLabel("Nombre del vehículo *", { exact: true }),
        ).toBeVisible();
      },
    },
    {
      name: "vehiculo-conversion",
      path: conversionPath,
      ready: async () => {
        await expect(
          page.getByRole("heading", {
            name: "Convertir a Vehículo",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", {
            name: "Impacto de la conversión",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByLabel("Nombre del vehículo *", { exact: true }),
        ).toHaveValue("Conversión I5d ficticia");
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
          path: `artifacts/ui-dev05-i5d/${screen.name}-${theme}-${width}.png`,
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

    await page.goto("/revision-comida/nueva");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.locator("#fecha-error")).toHaveText(
      "Indica una fecha civil válida.",
    );
    await expect(page.getByLabel("Fecha de operación")).toHaveAttribute(
      "aria-describedby",
      "fecha-error",
    );
    await expect(page.getByLabel("Fecha de operación")).toBeFocused();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i5d/revision-operacion-error-${width}.png`,
      fullPage: true,
    });

    await page.goto("/vehiculos/nuevo");
    await page
      .getByRole("button", { name: "Crear vehículo", exact: true })
      .click();
    await expect(page.locator("#nombre-error")).toHaveText(
      "Indica un nombre válido.",
    );
    await expect(page.getByLabel("Nombre del vehículo *")).toHaveAttribute(
      "aria-describedby",
      "nombre-error",
    );
    await expect(page.getByLabel("Nombre del vehículo *")).toBeFocused();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i5d/vehiculo-error-${width}.png`,
      fullPage: true,
    });

    // Fallback: el servidor devuelve 409 sin `fields`; el foco va al bloque
    // de alerta, no a un campo inventado.
    await page.getByLabel("Nombre del vehículo *").fill("Coche I5d ficticio");
    await page.getByLabel("Matrícula del vehículo").fill("1111 I5D");
    await page
      .getByRole("button", { name: "Crear vehículo", exact: true })
      .click();
    await expect(
      page
        .locator(".alert")
        .filter({ hasText: "Hay vehículos con el mismo nombre o matrícula." }),
    ).toBeVisible();
    await expect(
      page
        .locator('div[tabindex="-1"]')
        .filter({ hasText: "Hay vehículos con el mismo nombre o matrícula." }),
    ).toBeFocused();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i5d/vehiculo-duplicado-${width}.png`,
      fullPage: true,
    });

    await page.goto(conversionPath);
    await expect(
      page.getByLabel("Nombre del vehículo *", { exact: true }),
    ).toHaveValue("Conversión I5d ficticia");
    await page.getByLabel("Nombre del vehículo *").fill("");
    await page.getByLabel("Confirmo la conversión explícita").check();
    await page
      .getByRole("button", { name: "Revisar y convertir", exact: true })
      .click();
    await expect(page.locator("#nombre-error")).toHaveText(
      "Indica un nombre válido.",
    );
    await expect(page.getByLabel("Nombre del vehículo *")).toBeFocused();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i5d/vehiculo-conversion-error-${width}.png`,
      fullPage: true,
    });

    await page.goto(detailPath);
    await page.getByRole("button", { name: "Anular", exact: true }).click();
    await page
      .getByRole("button", { name: "Confirmar anulación", exact: true })
      .click();
    await expect(page.locator("#annul-motivo-error")).toHaveText(
      "Campo obligatorio.",
    );
    await expect(page.getByLabel("Motivo", { exact: true })).toHaveAttribute(
      "aria-describedby",
      "annul-motivo-error",
    );
    await expect(page.getByLabel("Motivo", { exact: true })).toBeFocused();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i5d/revision-anulacion-error-${width}.png`,
      fullPage: true,
    });

    await page.goto(detailPath);
    await page.getByRole("button", { name: "Vincular", exact: true }).click();
    await page.getByLabel("Movimiento elegible").selectOption("202");
    await page.getByLabel("Motivo", { exact: true }).fill("Motivo I5d ficticio");
    await page
      .getByRole("button", { name: "Guardar vínculo", exact: true })
      .click();
    await expect(page.locator("#link-evidenciaVinculo-error")).toHaveText(
      "Campo obligatorio.",
    );
    await expect(page.getByLabel("Evidencia del vínculo")).toHaveAttribute(
      "aria-describedby",
      "link-evidenciaVinculo-error",
    );
    await expect(page.getByLabel("Evidencia del vínculo")).toBeFocused();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i5d/revision-vinculo-error-${width}.png`,
      fullPage: true,
    });
  }

  expect(errors).toEqual([]);
});
