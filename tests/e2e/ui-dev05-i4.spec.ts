import { test, expect, type APIRequestContext } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
import { fixtureContext } from "./fixture";

import { artifactDir } from "./fixture";

/**
 * UI · DEV-05 I4 — Clasificación, Referencias y Presupuestos.
 *
 * Servidor aislado con MFA real, en el puerto y el estado que el contexto de la
 * ejecución reserva para este fixture (#514). Las capturas y los estados de
 * error usan datos ficticios creados con la API pública del propio servidor de
 * test.
 */

// Puerto y estado propios de la ejecución (#514): dos runs simultáneos de esta
// misma spec no comparten listener ni SQLite.
const fixture = fixtureContext("ui-dev05-i4");
const API_PORT = fixture.port;
const THEMES = ["light-s", "dark-s", "hybrid-s"] as const;
let child: ChildProcess | undefined;

/** Salida del fixture: el pipe se lee siempre y se muestra si algo falla. */
let fixtureOutput = "";
let fixtureExit: { code: number | null; signal: NodeJS.Signals | null } | null =
  null;

function fixtureFailure(): string {
  const detail = fixtureOutput.trim() || "(sin salida)";
  const how = fixtureExit
    ? `código ${fixtureExit.code ?? "null"}${fixtureExit.signal ? ` / señal ${fixtureExit.signal}` : ""}`
    : "salida no registrada";
  return `El fixture ui-dev05-i4 terminó antes de servir (${how}): ${detail}`;
}

/** Un fixture muerto no puede quedar enmascarado por un poll que responde. */
function assertFixtureAlive() {
  if (fixtureExit) throw new Error(fixtureFailure());
}

async function waitForApi(request: APIRequestContext) {
  await expect
    .poll(
      async () => {
        assertFixtureAlive();
        try {
          return (await request.get(`http://127.0.0.1:${API_PORT}/api/health`))
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
    { stdio: ["ignore", "pipe", "pipe"], env: fixture.env },
  );
  child.stdout?.on("data", (chunk: Buffer) => {
    fixtureOutput += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    fixtureOutput += chunk.toString();
  });
  child.on("exit", (code, signal) => {
    fixtureExit = { code, signal };
  });
  await waitForApi(request);
  // El fixture provisionó su base ficticia antes de servir: se navega solo
  // cuando el estado de esta run está en disco.
  assertFixtureAlive();
  expect(
    existsSync(join(fixture.dir, "bootstrap.txt")),
    `El fixture ui-dev05-i4 no provisionó ${fixture.dir}/bootstrap.txt: ${fixtureOutput.trim()}`,
  ).toBe(true);
});

test.afterAll(() => {
  child?.kill();
  child?.stdout?.destroy();
  child?.stderr?.destroy();
});

test("UI DEV-05 I4: formularios, fichas, errores, foco y temas", async ({
  page,
}) => {
  test.setTimeout(240000);
  const artifacts = artifactDir("ui-dev05-i4");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(API_PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });

  const password = "Contraseña ficticia UI DEV-05 I4 " + randomUUID();
  await page.goto("/referencias");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(join(fixture.dir, "bootstrap.txt"), "utf8"));
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
    await page.getByLabel("Cambiar tema").selectOption(theme);
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
      path: join(artifacts, `${name}.png`),
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
      path: join(artifacts, `clasificacion-error-${width}.png`),
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
      path: join(artifacts, `referencias-error-${width}.png`),
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
      path: join(artifacts, `presupuestos-error-${width}.png`),
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
      path: join(artifacts, `clasificacion-ficha-dark-${width}.png`),
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
      path: join(artifacts, `referencias-ficha-dark-${width}.png`),
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
      path: join(artifacts, `presupuestos-ficha-dark-${width}.png`),
      fullPage: true,
    });
  }

  expect(errors).toEqual([]);
});
