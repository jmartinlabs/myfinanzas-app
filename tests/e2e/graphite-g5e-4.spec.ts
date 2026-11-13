import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const PORT = 3062;
const STATE = ".local/e2e-payroll-g5e";
let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/payroll-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        PAYROLL_PORT: String(PORT),
        PAYROLL_STATE: STATE,
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
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto("/nomina");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(STATE + "/bootstrap.txt", "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia Graphite nómina " + randomUUID());
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
  await page.goto("/nomina");
  await expect(
    page.getByRole("heading", { name: "Nómina", exact: true }),
  ).toBeVisible();
}

async function createPayroll(page: Page) {
  await page.getByRole("button", { name: "Añadir paga documentada" }).click();
  await page.getByLabel("Mes salarial", { exact: true }).fill("2026-06");
  await page.getByLabel("Guardia", { exact: true }).selectOption("No");
  for (const [label, value] of [
    ["Devengo €", "1200"],
    ["Base IRPF €", "1200"],
    ["IRPF %", "10"],
    ["Variable histórica €", "0"],
    ["Neto histórico €", "1000"],
    ["Neto documentado €", "1000"],
    ["Evidencia salarial", "fixture-salario"],
    ["Evidencia de Neto documentado", "fixture-doc"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("Originales salariales verificados").check();
  await page.getByLabel("Neto documentado verificado", { exact: true }).check();
  await page
    .getByLabel("Motivo de la revisión")
    .fill("Alta documental ficticia");
}

test("G5e-4: Nómina premium en Graphite, 1440/820/390", async ({ page }) => {
  test.setTimeout(240000);
  mkdirSync("artifacts/g5e-4", { recursive: true });
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
        const wrap = document.querySelector<HTMLElement>(".payroll-table");
        if (wrap && wrap.offsetParent && wrap.scrollWidth > wrap.clientWidth + 2)
          return "tabla de pagas";
        for (const selector of [".payroll-page > .filters", ".payroll-cards"]) {
          const block = document.querySelector<HTMLElement>(selector);
          if (block && block.offsetParent && block.scrollWidth > block.clientWidth + 2)
            return selector;
        }
        return "sin overflow";
      }),
    ).toBe("sin overflow");

  // Estado vacío y controles de la vista Histórico
  await page.goto("/nomina");
  await selectTheme("graphite-lime");
  const root = page.locator(".payroll-page");
  const tabs = root.locator('> .actions[role="group"]');
  await expect(root).toBeVisible();
  await expect(root.locator("> .page-head .eyebrow")).toHaveCSS("font-size", "12px");
  await expect(root.locator("> .page-head .eyebrow")).toHaveCSS(
    "color",
    "rgb(215, 255, 94)",
  );
  await expect(tabs.getByRole("button")).toHaveCount(3);
  for (const tab of ["Histórico", "Cobros/asociaciones", "Pronóstico"]) {
    await expect(
      tabs.getByRole("button", { name: tab, exact: true }),
    ).toHaveCSS("min-height", "44px");
  }
  await expect(
    tabs.getByRole("button", { name: "Histórico", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const filters = root.locator("> .filters");
  await expect(filters.locator("label").first()).toHaveCSS("font-size", "12px");
  await expect(filters.locator("label").first()).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await expect(filters.locator("input").first()).toHaveCSS("min-height", "44px");
  await expect(filters.locator("select").first()).toHaveCSS("min-height", "44px");
  await expect(
    root.getByText("Sin pagas documentadas. No se infiere nómina cero.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(root.locator(".payroll-table")).toBeHidden();
  await noOverflow();

  // Alta documentada: formulario y revisión
  await createPayroll(page);
  await expect(root.locator(".form-grid label").first()).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await expect(page.getByLabel("Mes salarial", { exact: true })).toHaveCSS(
    "min-height",
    "44px",
  );
  const checked = root.locator('.form-grid label:has(> input[type="checkbox"])');
  await expect(checked).toHaveCount(2);
  await expect(checked.first()).toHaveCSS("min-height", "44px");
  const box = await checked.first().locator("input").boundingBox();
  expect(Math.round(box!.width)).toBe(20);
  expect(Math.round(box!.height)).toBe(20);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/g5e-4/nomina-formulario-1440.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 720, height: 500 });
  await noOverflow();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Revisar impacto", exact: true }).click();
  const review = page.locator('.payroll-page .panel[aria-label="Confirmación de Nómina"]');
  await expect(review).toBeVisible();
  await expect(review).toHaveCSS("border-top-width", "2px");
  await expect(review).toHaveCSS("border-top-color", "rgb(215, 255, 94)");
  await expect(review.locator("p").first()).toHaveCSS("font-size", "12px");
  await expect(
    page.getByRole("button", { name: "Confirmar revisión de Nómina" }),
  ).toHaveCSS("min-height", "44px");
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-4/nomina-revision-1440.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Confirmar revisión de Nómina" }).click();
  await expect(page.locator(".payroll-card")).toHaveCount(1);

  // Filtro sin resultados: la tabla y su caption no desaparecen
  await page.getByLabel("Mes nómina", { exact: true }).fill("2026-01");
  await expect(
    page.getByText("Pagas documentadas · importes independientes", { exact: false }).first(),
  ).toBeVisible();
  await expect(root.locator(".payroll-table")).toBeVisible();
  await noOverflow();
  await page.getByLabel("Mes nómina", { exact: true }).fill("");

  // Histórico con datos: tabla y tarjetas
  const table = root.locator(".payroll-table");
  for (const [width, height] of [
    [1440, 1000],
    [1280, 900],
    [820, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/nomina");
    await expect(root).toBeVisible();
    await expect(
      (width >= 1280 ? table : root.locator(".payroll-cards")).getByText(
        "2026-06 · Ordinaria",
        { exact: true },
      ),
    ).toBeVisible();
    await noOverflow();
    if (width === 1440 || width === 1280) {
      await expect(table).toBeVisible();
      await expect(table.locator("th").first()).toHaveCSS("font-size", "12px");
      await expect(table.locator("td").first()).toHaveCSS("font-size", "13px");
      await expect(
        table.getByRole("button", { name: "Revisar originales", exact: true }),
      ).toHaveCSS("min-height", "44px");
      await expect(root.locator(".payroll-cards")).toBeHidden();
    } else {
      await expect(table).toBeHidden();
      const cards = root.locator(".payroll-cards");
      await expect(cards).toBeVisible();
      await expect(cards.locator(".ui-data-list-item")).toHaveCount(1);
      await expect(cards.locator(".ui-data-list-item .ui-data-list-field")).toHaveCount(6);
      await expect(cards.locator(".ui-data-list-label").first()).toHaveCSS(
        "font-size",
        "12px",
      );
      await expect(
        cards.getByRole("button", { name: "Documentar neto", exact: true }),
      ).toHaveCSS("min-height", "44px");
    }
    await page.screenshot({
      path: `artifacts/g5e-4/nomina-historico-${width}.png`,
      fullPage: true,
    });
  }

  // Auditoría
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/nomina");
  const audit = root.locator("> details.panel");
  await expect(audit.locator("> summary")).toHaveCSS("min-height", "44px");
  await audit.locator("> summary").click();
  await expect(audit.locator("> p").first()).toHaveCSS("font-size", "12px");

  // Cobros/asociaciones
  await page.getByRole("button", { name: "Cobros/asociaciones", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cobros bancarios y reparto global", exact: true }),
  ).toBeVisible();
  await expect(
    root.locator("> .panel > label").filter({ hasText: "Movimiento" }).first(),
  ).toHaveCSS("font-size", "12px");
  await expect(page.getByLabel("Movimiento", { exact: true })).toHaveCSS(
    "min-height",
    "44px",
  );
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-4/nomina-cobros-1440.png",
    fullPage: true,
  });

  // Pronóstico
  await page.getByRole("button", { name: "Pronóstico", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Estimado · simulación informativa", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Variable prevista €", { exact: true })).toHaveCSS(
    "min-height",
    "44px",
  );
  await expect(
    page.getByRole("button", { name: "Calcular pronóstico", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await expect(root.locator(".form-grid label").first()).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-4/nomina-pronostico-1440.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-4/nomina-pronostico-390.png",
    fullPage: true,
  });

  // 720x500: equivalencia de zoom sin overflow
  await page.setViewportSize({ width: 720, height: 500 });
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await noOverflow();
  await page.getByRole("button", { name: "Pronóstico", exact: true }).click();
  await noOverflow();

  // Los otros temas no heredan la capa Graphite
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/nomina");
  await expect(table).toBeVisible();
  for (const theme of ["casa", "light-s", "dark-s", "hybrid-s"] as const) {
    await selectTheme(theme);
    await expect(table).toHaveCSS("background-image", "none");
    await expect(root.locator("> .page-head .eyebrow")).not.toHaveCSS(
      "color",
      "rgb(215, 255, 94)",
    );
    await noOverflow();
  }

  expect(errors).toEqual([]);
});