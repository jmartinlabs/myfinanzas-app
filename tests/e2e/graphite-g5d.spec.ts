import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const PORT = 3054;
const STATE = ".local/e2e-referencias-g5d";
let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/referencias-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        REFERENCIAS_PORT: String(PORT),
        REFERENCIAS_STATE: STATE,
      },
    },
  );
  await expect
    .poll(
      async () => {
        try {
          return (await request.get(`http://127.0.0.1:${PORT}/api/health`)).status();
        } catch {
          return 0;
        }
      },
      { timeout: 15000 },
    )
    .toBe(200);
});

test.afterAll(() => {
  child?.kill();
});

async function authenticate(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto("/referencias");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(STATE + "/bootstrap.txt", "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(
    "Clave ficticia Graphite referencias " + randomUUID(),
  );
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".secret")).toBeVisible();
  const secret = (await page.locator(".secret").textContent())!;
  await page
    .getByLabel("Código de la aplicación autenticadora")
    .fill(totp(secret).generate());
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await page
    .getByRole("button", { name: "He guardado los códigos · Continuar" })
    .click();
  await page.goto("/referencias");
  await expect(
    page.getByRole("heading", { name: "Referencias", exact: true }),
  ).toBeVisible();
}

test("G5d: Referencias premium en Graphite, 1440/820/390", async ({ page }) => {
  test.setTimeout(180000);
  mkdirSync("artifacts/g5d", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await authenticate(page);

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
    expect([200, 201], JSON.stringify(result.data)).toContain(result.status);
    return result.data;
  };

  const created = [];
  for (const [nombre, tipo] of [
    ["Viaje G5d ficticio", "Viaje"],
    ["Evento G5d ficticio", "Evento"],
    ["Anticipo G5d ficticio", "Anticipo"],
    ["Gasto compartido G5d ficticio", "Gasto compartido"],
    ["Viaje G5d inactivo", "Viaje"],
  ] as const) {
    created.push((await write("/referencias", { nombre, tipo })).item);
  }
  await write(`/referencias/${created[4].id}/desactivar`, {
    revision: created[4].revision,
  });

  const selectTheme = async (theme: string) => {
    await page.getByLabel("Apariencia").selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  };
  const noOverflow = async () =>
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);

  await page.goto("/referencias");
  await selectTheme("graphite-lime");
  const list = page.locator(".references-list");
  await expect(page.locator(".references-page")).toBeVisible();
  await expect(page.getByText("4 referencias", { exact: false })).toBeVisible();
  await expect(list.locator(".ui-table th").first()).toHaveCSS("font-size", "12px");
  await expect(list.locator(".filters input").first()).toHaveCSS("min-height", "44px");
  await expect(list.locator(".filters label").first()).toHaveCSS("font-size", "12px");
  await expect(list).toHaveCSS("border-top-color", "rgb(42, 47, 40)");

  // Filtros y estado inactivo
  await page.getByLabel("Tipo de Referencia", { exact: true }).selectOption("Evento");
  await expect(page.getByText("1 referencias", { exact: false })).toBeVisible();
  await page.getByLabel("Tipo de Referencia", { exact: true }).selectOption("");
  await page.getByLabel("Estado de Referencia", { exact: true }).selectOption("");
  await expect(page.getByText("5 referencias", { exact: false })).toBeVisible();
  await expect(list.locator(".desktop-list .ui-row-inactive")).toHaveCount(1);

  for (const [width, height] of [
    [1440, 1000],
    [820, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/referencias");
    await page.getByLabel("Estado de Referencia", { exact: true }).selectOption("");
    await expect(page.getByText("5 referencias", { exact: false })).toBeVisible();
    await noOverflow();
    await page.screenshot({
      path: `artifacts/g5d/referencias-lista-${width}.png`,
      fullPage: true,
    });
  }

  // Ficha
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/referencias/${created[0].id}`);
  await expect(page.locator(".reference-detail")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Identificación", exact: true })).toBeVisible();
  await expect(page.locator(".reference-detail dt").first()).toHaveCSS("font-size", "12px");
  await expect(
    page.getByRole("button", { name: "Desactivar referencia", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await noOverflow();
  await page.screenshot({ path: "artifacts/g5d/referencias-ficha-1440.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({ path: "artifacts/g5d/referencias-ficha-390.png", fullPage: true });

  // Ficha a 820
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto(`/referencias/${created[0].id}`);
  await expect(
    page.getByRole("heading", { name: "Identificación", exact: true }),
  ).toBeVisible();
  await noOverflow();
  await page.screenshot({ path: "artifacts/g5d/referencias-ficha-820.png", fullPage: true });

  // Formulario
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/referencias/nueva");
  await expect(page.locator(".reference-form-page")).toBeVisible();
  await expect(page.locator(".reference-form-page .ui-field input").first()).toHaveCSS(
    "min-height",
    "44px",
  );
  await expect(
    page.getByRole("button", { name: "Guardar referencia", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await noOverflow();
  await page.screenshot({ path: "artifacts/g5d/referencias-form-1440.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({ path: "artifacts/g5d/referencias-form-390.png", fullPage: true });

  // Formulario a 820
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto("/referencias/nueva");
  await expect(page.getByLabel("Nombre de Referencia *", { exact: true })).toBeVisible();
  await noOverflow();
  await page.screenshot({ path: "artifacts/g5d/referencias-form-820.png", fullPage: true });

  // Estado inválido: el borde conserva el color de error
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/referencias/nueva");
  await page.getByRole("button", { name: "Guardar referencia", exact: true }).click();
  await expect(page.getByLabel("Nombre de Referencia *", { exact: true })).toHaveCSS(
    "border-color",
    "rgb(255, 129, 120)",
  );

  // Comparativa de identidad: mismas pantallas en Casa
  await page.setViewportSize({ width: 1440, height: 1000 });
  await selectTheme("casa");
  for (const [name, path] of [
    ["lista", "/referencias"],
    ["ficha", `/referencias/${created[0].id}`],
    ["form", "/referencias/nueva"],
  ] as const) {
    await page.goto(path);
    if (name === "lista") {
      await page
        .getByLabel("Estado de Referencia", { exact: true })
        .selectOption("");
      await expect(page.getByText("5 referencias", { exact: false })).toBeVisible();
    } else if (name === "ficha") {
      await expect(
        page.getByRole("heading", { name: "Identificación", exact: true }),
      ).toBeVisible();
    } else {
      await expect(page.getByLabel("Nombre de Referencia *", { exact: true })).toBeVisible();
    }
    await noOverflow();
    await page.screenshot({
      path: `artifacts/g5d/casa-referencias-${name}-1440.png`,
      fullPage: true,
    });
  }

  // Regresión: Casa, Oscuro, Claro y Mixto no cambian de estructura ni desbordan
  for (const theme of ["casa", "dark-s", "light-s", "hybrid-s"] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/referencias");
    await selectTheme(theme);
    await expect(page.locator(".references-page")).toBeVisible();
    if (theme === "light-s" || theme === "hybrid-s") {
      await expect(list).not.toHaveCSS("border-top-color", "rgb(42, 47, 40)");
    }
    await noOverflow();
  }

  expect(errors).toEqual([]);
});
