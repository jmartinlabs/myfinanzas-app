import { test, expect, type APIRequestContext } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * UI · DEV-05 I4 — Clasificación, Referencias y Presupuestos.
 *
 * Servidor aislado en 3024 con MFA real. Las capturas y los estados de error
 * usan datos ficticios creados con la API pública del propio servidor de test.
 */

const PORT = 3024;
const DIR = ".local/e2e-ui-dev05-i4";
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
    ["apps/api/test-support/ui-dev05-i4-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        APP_ORIGIN: process.env.APP_ORIGIN ?? "http://127.0.0.1:5173",
      },
    },
  );
  await waitForApi(request);
});

test.afterAll(() => {
  child?.kill();
});

test("UI DEV-05 I4: formularios, fichas, errores, foco y temas", async ({
  page,
}) => {
  test.setTimeout(240000);
  mkdirSync("artifacts/ui-dev05-i4", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });

  const password = "Contraseña ficticia UI DEV-05 I4 " + randomUUID();
  await page.goto("/referencias");
  await page
    .getByLabel("Token de configuración local")
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
  await page.goto("/referencias");
  await expect(
    page.getByRole("heading", { name: "Referencias", exact: true }),
  ).toBeVisible();

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
  const write = async (path: string, body: Record<string, unknown>) => {
    const result = await page.evaluate(
      async ({ path, body }) => {
        const session = await (await fetch("/api/auth/session")).json();
        const response = await fetch("/api" + path, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": session.csrf,
            "idempotency-key": crypto.randomUUID(),
          },
          body: JSON.stringify(body),
        });
        return { status: response.status, data: await response.json() };
      },
      { path, body },
    );
    expect(result.status, JSON.stringify(result.data)).toBe(201);
    return result.data;
  };
  const selectTheme = async (theme: (typeof THEMES)[number]) => {
    await page.getByLabel("Tema visual").selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  };
  const capture = async (
    name: string,
    path: string,
    ready: () => Promise<void>,
  ) => {
    await page.goto(path);
    await ready();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i4/${name}.png`,
      fullPage: true,
    });
  };

  const category = await write("/clasificacion/categorias", {
    nombre: "Categoría I4 ficticia",
    anual: "Gasto",
    mensual: "Gasto",
    referencia: false,
  });
  const subcategory = await write("/clasificacion/subcategorias", {
    nombre: "Subcategoría I4 ficticia",
    padre: category.item.id,
  });
  const partida = await write("/clasificacion/partidas", {
    nombre: "Partida I4 ficticia",
    padre: subcategory.item.id,
  });
  const reference = await write("/referencias", {
    nombre: "Referencia I4 ficticia",
    tipo: "Viaje",
  });
  const budget = await write("/presupuestos", {
    nombre: "Presupuesto I4 ficticio",
    fuente: "No aplica",
    destino: null,
  });

  const partidaReady = async () => {
    await expect(
      page.getByRole("heading", { name: "Nueva Partida", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByLabel("Subcategoría *", { exact: true })
        .locator(`option[value="${subcategory.item.id}"]`),
    ).toHaveCount(1);
  };
  const referenceReady = async () => {
    await expect(
      page.getByRole("heading", { name: "Nueva referencia", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Nombre de Referencia *", { exact: true }),
    ).toBeVisible();
  };
  const budgetReady = async () => {
    await expect(
      page.getByRole("heading", { name: "Nuevo presupuesto", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Nombre *", { exact: true })).toBeVisible();
  };

  const screens = [
    {
      name: "clasificacion",
      path: "/clasificacion/partidas/nuevo",
      ready: partidaReady,
    },
    {
      name: "referencias",
      path: "/referencias/nueva",
      ready: referenceReady,
    },
    {
      name: "presupuestos",
      path: "/presupuestos/nuevo",
      ready: budgetReady,
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
        await capture(
          `${screen.name}-${theme}-${width}`,
          screen.path,
          screen.ready,
        );
      }
    }
  }

  // Errores y foco: el primer campo inválido recibe el foco en cada formulario.
  for (const [width, height] of [
    [1440, 1000],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await selectTheme("dark-s");
    await page.goto("/clasificacion/partidas/nuevo");
    await partidaReady();
    await page
      .getByRole("button", { name: "Crear Partida", exact: true })
      .click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator("#error-nombre")).toHaveText(
      "Indica un nombre sin caracteres de control.",
    );
    await expect(page.getByLabel("Nombre *", { exact: true })).toBeFocused();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i4/clasificacion-error-${width}.png`,
      fullPage: true,
    });

    await page.goto("/referencias/nueva");
    await referenceReady();
    await page
      .getByRole("button", { name: "Guardar referencia", exact: true })
      .click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator("#ref-name-error")).toHaveText(
      "Indica un nombre válido.",
    );
    await expect(
      page.getByLabel("Nombre de Referencia *", { exact: true }),
    ).toBeFocused();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i4/referencias-error-${width}.png`,
      fullPage: true,
    });

    await page.goto("/presupuestos/nuevo");
    await budgetReady();
    await page
      .getByRole("button", { name: "Guardar presupuesto", exact: true })
      .click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator("#budget-name-error")).toHaveText(
      "Indica un nombre válido.",
    );
    await expect(page.getByLabel("Nombre *", { exact: true })).toBeFocused();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i4/presupuestos-error-${width}.png`,
      fullPage: true,
    });
  }

  // Fichas: jerarquía FormSection sin alterar datos ni acciones.
  await selectTheme("dark-s");
  for (const [width, height] of [
    [1440, 1000],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/clasificacion/partidas/" + partida.item.id);
    await expect(
      page.getByRole("heading", {
        name: "Partida I4 ficticia",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".classification-detail-grid")).toBeVisible();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i4/clasificacion-ficha-dark-${width}.png`,
      fullPage: true,
    });

    await page.goto("/referencias/" + reference.item.id);
    await expect(
      page.getByRole("heading", {
        name: "Referencia I4 ficticia",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Disponibilidad", exact: true }),
    ).toBeVisible();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i4/referencias-ficha-dark-${width}.png`,
      fullPage: true,
    });

    await page.goto("/presupuestos/" + budget.item.id);
    await expect(
      page.getByRole("heading", {
        name: "Presupuesto I4 ficticio",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Configuración", exact: true }),
    ).toBeVisible();
    await settle();
    await assertNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev05-i4/presupuestos-ficha-dark-${width}.png`,
      fullPage: true,
    });
  }

  expect(errors).toEqual([]);
});
