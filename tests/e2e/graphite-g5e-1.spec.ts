import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const PORT = 3056;
const STATE = ".local/e2e-anticipos-g5e";
let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/anticipo-g5e-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        ANTICIPO_G5E_PORT: String(PORT),
        ANTICIPO_G5E_STATE: STATE,
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
  await page.goto("/anticipos");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(STATE + "/bootstrap.txt", "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia Graphite anticipos " + randomUUID());
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
  await page.goto("/anticipos");
  await expect(
    page.getByRole("heading", { name: "Anticipos", exact: true }),
  ).toBeVisible();
}

test("G5e-1: Anticipos premium en Graphite, 1440/820/390", async ({ page }) => {
  test.setTimeout(180000);
  mkdirSync("artifacts/g5e-1", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await authenticate(page);

  const selectTheme = async (theme: string) => {
    await page.getByLabel("Apariencia").selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  };
  const noOverflow = async () =>
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);

  // Catálogo
  await page.goto("/anticipos");
  await selectTheme("graphite-lime");
  const root = page.locator(".anticipo-page");
  const cards = page.locator(".anticipo-list .panel");
  await expect(root).toBeVisible();
  await expect(page.getByText("3 fichas · página 1", { exact: true })).toBeVisible();
  await expect(cards).toHaveCount(3);
  await expect(root.locator(".page-head .eyebrow").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(root.locator(".page-head .eyebrow").first()).toHaveCSS(
    "color",
    "rgb(215, 255, 94)",
  );
  await expect(cards.first()).toHaveCSS("border-top-color", "rgb(42, 47, 40)");
  await expect(cards.first().locator("p").first()).toHaveCSS("font-size", "12px");
  const cardLink = cards.first().locator("h2 a");
  const cardBox = await cardLink.boundingBox();
  expect(cardBox!.height).toBeGreaterThanOrEqual(44);
  await expect(
    page.getByRole("button", { name: "Anterior", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Anterior", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await expect(
    page.getByRole("button", { name: "Siguiente", exact: true }),
  ).toBeDisabled();

  for (const [width, height] of [
    [1440, 1000],
    [820, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/anticipos");
    await expect(page.getByText("3 fichas · página 1", { exact: true })).toBeVisible();
    await noOverflow();
    await page.screenshot({
      path: `artifacts/g5e-1/anticipos-lista-${width}.png`,
      fullPage: true,
    });
  }

  // Ficha con hechos históricos y revisión de acreditación
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/anticipos/REF001");
  await expect(
    page.getByRole("heading", { name: "REF001 · Adelanto ficticio formación", exact: true }),
  ).toBeVisible();
  const metrics = page.locator(".anticipo-metrics .metric");
  await expect(metrics).toHaveCount(4);
  await expect(metrics.first().locator("span")).toHaveCSS("font-size", "12px");
  await expect(metrics.first().locator("span")).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await expect(metrics.first().locator("strong")).toHaveCSS("font-size", "20px");
  await expect(metrics.first().locator("strong")).toHaveCSS(
    "font-variant-numeric",
    "tabular-nums",
  );
  await expect(metrics.first()).toHaveCSS("border-top-color", "rgb(42, 47, 40)");
  await expect(page.locator(".detail-grid > div")).toHaveCount(4);
  await expect(page.locator(".detail-grid dt").first()).toHaveCSS("font-size", "12px");
  await expect(page.locator(".detail-grid dt").first()).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await expect(page.locator(".anticipo-table .ui-table tbody tr")).toHaveCount(2);
  await expect(page.locator(".anticipo-table .ui-table th").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(
    page.getByText("No disponible: sin par acreditado verificable.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("No disponible: sin Ciclos registrados.", { exact: true }),
  ).toBeVisible();

  const acreditar = page.getByRole("button", {
    name: "Acreditar Movimiento 201",
    exact: true,
  });
  await expect(acreditar).toHaveCSS("min-height", "44px");
  await acreditar.click();
  await page
    .getByLabel("Rol acreditado", { exact: true })
    .selectOption("Adelanto");
  await page
    .getByLabel("Evidencia identificable", { exact: true })
    .fill("Documento ficticio de adelanto G5e");
  await page
    .getByLabel("Fuente / procedencia", { exact: true })
    .fill("Archivo histórico ficticio G5e");
  await page.getByRole("button", { name: "Revisar impacto", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Revisar y confirmar", exact: true }),
  ).toBeFocused();
  const review = page.locator(".anticipo-review");
  await expect(review).toHaveCSS("border-top-width", "2px");
  await expect(review).toHaveCSS("border-top-color", "rgb(59, 68, 38)");
  await page.screenshot({
    path: "artifacts/g5e-1/anticipos-revision-1440.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Confirmar acreditación", exact: true })
    .click();
  await expect(
    page.getByText("Subtotales acreditados, parciales.", { exact: false }),
  ).toBeVisible();
  await expect(metrics.first().locator("strong")).toHaveText("1.000,00 €");
  const pair = page.locator(".anticipo-pair").first();
  await expect(pair).toBeVisible();
  const pairBox = await pair.boundingBox();
  expect(pairBox!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator(".anticipo-page details summary").first()).toHaveCSS(
    "min-height",
    "44px",
  );

  for (const [width, height] of [
    [1440, 1000],
    [820, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/anticipos/REF001");
    await expect(metrics).toHaveCount(4);
    if (width === 820) {
      await expect(page.locator(".desktop-list.anticipo-table")).toBeHidden();
      const cardAction = page.locator(".mobile-list .ui-data-list-item button").first();
      await expect(cardAction).toBeVisible();
      expect((await cardAction.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await noOverflow();
    await page.screenshot({
      path: `artifacts/g5e-1/anticipos-ficha-${width}.png`,
      fullPage: true,
    });
  }

  // Caso sin hechos: estados existentes conservados y legibles
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/anticipos/REF002");
  await expect(
    page.getByRole("heading", { name: "REF002 · Anticipo ficticio viaje", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Sin operaciones registradas.", { exact: true })).toBeVisible();
  await expect(page.locator(".anticipo-metrics strong").first()).toHaveText(
    "0,00 €",
  );
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-1/anticipos-caso-vacio-390.png",
    fullPage: true,
  });

  // Formulario de alta
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/anticipos/nuevo");
  await expect(
    page.getByRole("heading", { name: "Nuevo Anticipo", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Nombre del Anticipo", { exact: true }),
  ).toHaveCSS("min-height", "44px");
  await expect(page.locator(".anticipo-page .form-grid label").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(
    page.getByRole("button", { name: "Crear ficha", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-1/anticipos-form-1440.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-1/anticipos-form-390.png",
    fullPage: true,
  });

  // Casa y Claro no heredan la capa Graphite
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/anticipos");
  for (const theme of ["casa", "light-s"] as const) {
    await selectTheme(theme);
    await expect(cards.first()).toHaveCSS("background-image", "none");
    await expect(cards.first()).not.toHaveCSS(
      "border-top-color",
      "rgb(42, 47, 40)",
    );
    await expect(root.locator(".page-head .eyebrow").first()).not.toHaveCSS(
      "color",
      "rgb(215, 255, 94)",
    );
    await noOverflow();
  }

  expect(errors).toEqual([]);
});