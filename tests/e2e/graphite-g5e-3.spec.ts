import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const PORT = 3061;
const STATE = ".local/e2e-compartidos-g5e";
let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/compartido-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        COMPARTIDO_PORT: String(PORT),
        COMPARTIDO_STATE: STATE,
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
      { timeout: 20000 },
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
    await route.continue({ url: url.toString() });
  });
  await page.goto("/compartidos");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(STATE + "/bootstrap.txt", "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia Graphite compartidos " + randomUUID());
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
  await page.goto("/compartidos");
  await expect(
    page.getByRole("heading", { name: "Gastos compartidos", exact: true }),
  ).toBeVisible();
}

test("G5e-3: Compartidos premium en Graphite, 1440/820/390", async ({ page }) => {
  test.setTimeout(240000);
  mkdirSync("artifacts/g5e-3", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await authenticate(page);

  const selectTheme = async (theme: string) => {
    await page.getByLabel("Apariencia").selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  };
  const noOverflow = async () =>
    expect(
      await page.evaluate(() => {
        const doc = document.documentElement;
        if (doc.scrollWidth > doc.clientWidth) return "documento";
        const wrap = document.querySelector<HTMLElement>(
          ".shared-list .ui-table-wrap",
        );
        if (wrap && wrap.offsetParent && wrap.scrollWidth > wrap.clientWidth + 2)
          return "tabla del catálogo";
        return "sin overflow";
      }),
    ).toBe("sin overflow");

  // Catálogo
  await page.goto("/compartidos");
  await selectTheme("graphite-lime");
  const root = page.locator(".shared-page");
  const list = page.locator(".shared-list");
  await expect(root).toBeVisible();
  await expect(root.locator("> .page-head .eyebrow")).toHaveCSS("font-size", "12px");
  await expect(root.locator("> .page-head .eyebrow")).toHaveCSS(
    "color",
    "rgb(215, 255, 94)",
  );
  await expect(list.locator("tbody tr")).toHaveCount(2);
  await expect(list.locator("th").first()).toHaveCSS("font-size", "12px");
  await expect(list.locator("td").first()).toHaveCSS("font-size", "13px");
  // El chip «Cerrado» era texto oscuro sobre fondo oscuro en la base.
  const closed = list.getByText("Cerrado", { exact: true }).first();
  await expect(closed).toBeVisible();
  await expect(closed).toHaveCSS("text-transform", "uppercase");
  await expect(closed).toHaveCSS("color", "rgb(241, 244, 236)");
  await expect(closed).toHaveCSS("background-color", "rgb(14, 16, 14)");
  const link = list.getByRole("link", { name: "REF001", exact: true });
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(root.locator(".shared-scope-note p")).toHaveCSS("font-size", "12px");
  await expect(
    page.getByRole("button", { name: "Nuevo caso compartido", exact: true }),
  ).toHaveCSS("min-height", "44px");

  for (const [width, height] of [
    [1440, 1000],
    [1200, 900],
    [820, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/compartidos");
    await expect(root).toBeVisible();
    await noOverflow();
    if (width === 1440) {
      await expect(list).toBeVisible();
      await expect(root.locator("> .page-head ~ .shared-cards")).toBeHidden();
    } else {
      await expect(list).toBeHidden();
      const cards = root.locator("> .page-head ~ .shared-cards");
      await expect(cards).toBeVisible();
      await expect(cards.locator(".ui-data-list-item")).toHaveCount(2);
      await expect(cards.locator(".ui-data-list-item").first().locator(".ui-data-list-field")).toHaveCount(6);
      await expect(
        cards.locator(".ui-data-list-label").first(),
      ).toHaveCSS("font-size", "12px");
      const cardLink = cards
        .getByRole("link", { name: "Piso 2026", exact: true })
        .first();
      expect((await cardLink.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({
      path: `artifacts/g5e-3/compartidos-lista-${width}.png`,
      fullPage: true,
    });
  }

  // Ficha: participantes en tarjeta con los seis campos y acciones táctiles
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/compartidos/REF001");
  await expect(
    page.getByRole("heading", { name: "Piso 2026", exact: true }),
  ).toBeVisible();
  const participants = page.locator('[aria-label="Participantes"]');
  await expect(participants.locator(".desktop-list")).toBeHidden();
  const people = participants.locator(".shared-cards .ui-data-list-item");
  await expect(people).toHaveCount(3);
  await expect(people.first().locator(".ui-data-list-field")).toHaveCount(6);
  await expect(people.first().locator(".ui-data-list-field[data-kind='actions'] button")).toHaveCount(2);
  for (const action of ["Editar reparto", "Dar de baja"]) {
    await expect(
      people.first().getByRole("button", { name: action, exact: true }),
    ).toHaveCSS("min-height", "44px");
  }
  await expect(
    page.locator(".shared-page .shared-metrics dt").first(),
  ).toHaveCSS("font-size", "12px");
  await expect(
    page.locator(".shared-page .shared-metrics dt").first(),
  ).toHaveCSS("text-transform", "uppercase");
  await expect(
    page.locator(".shared-page .shared-metrics dd").first(),
  ).toHaveCSS("font-size", "20px");
  await expect(page.locator(".shared-alert").first()).toHaveCSS("font-size", "12px");
  await expect(
    page.getByRole("button", { name: "Registrar aportación", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await expect(
    page.getByRole("button", { name: "Registrar Gasto CAT013", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await expect(page.locator(".shared-history li").first()).toHaveCSS("font-size", "12px");

  for (const [width, height] of [
    [1440, 1000],
    [820, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/compartidos/REF001");
    await expect(people).toHaveCount(3);
    await noOverflow();
    await page.screenshot({
      path: `artifacts/g5e-3/compartidos-detalle-${width}.png`,
      fullPage: true,
    });
  }

  // Alta de participante
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/compartidos/REF001");
  await page
    .getByRole("button", { name: "Añadir participante", exact: true })
    .first()
    .click();
  const personLabel = page.getByText("Nombre", { exact: true }).last();
  await expect(personLabel).toHaveCSS("font-size", "12px");
  await expect(
    page.getByLabel("Nombre", { exact: true }),
  ).toHaveCSS("min-height", "44px");
  await expect(
    page.getByRole("button", { name: "Añadir participante", exact: true }).last(),
  ).toHaveCSS("min-height", "44px");
  await page.screenshot({
    path: "artifacts/g5e-3/compartidos-participante-1440.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cancelar", exact: true }).first().click();

  // Baja lógica
  await page.goto("/compartidos/REF001");
  await page.getByRole("button", { name: "Dar de baja", exact: true }).first().click();
  await expect(
    page.locator(".shared-page .ui-field-label").filter({ hasText: "Motivo" }).first(),
  ).toHaveCSS("font-size", "12px");
  await expect(
    page.getByRole("button", { name: "Confirmar baja lógica", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await page.screenshot({
    path: "artifacts/g5e-3/compartidos-baja-1440.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cancelar", exact: true }).first().click();

  // Formulario y previsualización de aportación
  await page.goto("/compartidos/REF001/aportacion");
  await expect(
    page.getByRole("heading", { name: "Registrar aportación", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Importe (EUR)", { exact: true })).toHaveCSS(
    "min-height",
    "44px",
  );
  await expect(
    page.getByRole("button", { name: "Ver impacto", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await page.getByLabel("Importe (EUR)", { exact: true }).fill("100");
  await page
    .getByLabel("Evidencia", { exact: true })
    .fill("Documento ficticio G5e-3");
  await page.getByRole("button", { name: "Ver impacto", exact: true }).click();
  const impact = page.locator(".shared-impact").first();
  await expect(impact).toBeVisible();
  await expect(impact.locator(".shared-metrics dt").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(
    page.getByRole("button", { name: "Revisar aportación", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-3/compartidos-impacto-1440.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-3/compartidos-impacto-390.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cancelar", exact: true }).first().click();

  // Alta de caso y estados vacíos de históricos
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/compartidos/nuevo");
  await expect(
    page.getByLabel("Nombre del caso", { exact: true }),
  ).toHaveCSS("min-height", "44px");
  await expect(
    page.getByRole("button", { name: "Crear caso", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-3/compartidos-nuevo-1440.png",
    fullPage: true,
  });
  await page.goto("/compartidos/REF001/aportaciones");
  await expect(page.getByText("Sin históricos elegibles", { exact: true })).toBeVisible();
  await expect(
    page.locator(".shared-page > .panel h2").first(),
  ).toHaveCSS("font-size", "15px");
  await noOverflow();

  // 720x500: equivalencia de zoom sin overflow
  await page.setViewportSize({ width: 720, height: 500 });
  for (const path of ["/compartidos", "/compartidos/REF001"]) {
    await page.goto(path);
    await noOverflow();
  }

  // Los otros temas no heredan la capa Graphite
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/compartidos");
  await expect(list).toBeVisible();
  for (const theme of ["casa", "light-s", "dark-s", "hybrid-s"] as const) {
    await selectTheme(theme);
    await expect(list).toHaveCSS("background-image", "none");
    await expect(root.locator("> .page-head .eyebrow")).not.toHaveCSS(
      "color",
      "rgb(215, 255, 94)",
    );
    await noOverflow();
  }

  expect(errors).toEqual([]);
});