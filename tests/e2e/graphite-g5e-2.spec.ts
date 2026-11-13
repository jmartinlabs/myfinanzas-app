import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const PORT = 3060;
const STATE = ".local/e2e-pendientes-g5e";
let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/pendientes-g5e-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        PENDIENTES_G5E_PORT: String(PORT),
        PENDIENTES_G5E_STATE: STATE,
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
  await page.goto("/pendientes");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(STATE + "/bootstrap.txt", "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia Graphite pendientes " + randomUUID());
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
  await page.goto("/pendientes");
  await expect(
    page.getByRole("heading", { name: "Pendientes y conciliación", exact: true }),
  ).toBeVisible();
}

test("G5e-2: Pendientes premium en Graphite, 1440/820/390", async ({ page }) => {
  test.setTimeout(180000);
  mkdirSync("artifacts/g5e-2", { recursive: true });
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
          ".pendientes-list .ui-table-wrap",
        );
        if (wrap && wrap.offsetParent && wrap.scrollWidth > wrap.clientWidth + 2)
          return "tabla del catálogo";
        return "sin overflow";
      }),
    ).toBe("sin overflow");

  // Catálogo
  await page.goto("/pendientes");
  await selectTheme("graphite-lime");
  const root = page.locator(".pendientes-page");
  const list = page.locator(".pendientes-list");
  await expect(root).toBeVisible();
  await expect(page.getByText("3 filas · sin total económico global", { exact: true })).toBeVisible();
  await expect(root.locator(".page-head .eyebrow").first()).toHaveCSS("font-size", "12px");
  await expect(root.locator(".page-head .eyebrow").first()).toHaveCSS(
    "color",
    "rgb(215, 255, 94)",
  );
  await expect(root.locator("> .notice")).toHaveCSS("border-left-width", "3px");
  await expect(root.locator("> .notice")).toHaveCSS("font-size", "12px");

  // Filtros táctiles y etiquetas legibles
  const tipo = page.getByLabel("Tipo", { exact: true });
  await expect(tipo).toHaveCSS("min-height", "44px");
  await expect(list.locator(".pendientes-filters label").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(list.locator(".pendientes-filters label").first()).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await expect(page.getByRole("button", { name: "Buscar", exact: true })).toHaveCSS(
    "min-height",
    "44px",
  );

  // Tabla: 9 columnas legibles, sin solapes y con cifras tabulares
  const table = list.locator(".pendientes-table");
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await expect(table.locator("th")).toHaveCount(9);
  await expect(table.locator("th").first()).toHaveCSS("font-size", "12px");
  await expect(table.locator("td").first()).toHaveCSS("font-size", "13px");
  await expect(table.locator("tbody tr").first().locator(".tag")).toHaveCSS(
    "white-space",
    "nowrap",
  );
  await expect(table.locator("td.ui-table-amount").first()).toHaveCSS(
    "font-variant-numeric",
    "tabular-nums",
  );
  await expect(table.locator(".pendiente-motive").first()).toHaveCSS("font-size", "12px");
  const open = table.getByRole("link", { name: "Abrir", exact: true }).first();
  expect((await open.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(list.locator(".list-toolbar")).toHaveCSS("font-size", "12px");
  await expect(list.locator(".list-footer")).toHaveCSS("font-size", "12px");
  await expect(
    list.getByRole("button", { name: "Siguiente", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await expect(list.locator(".pendientes-fallos ul")).toHaveCSS("font-size", "12px");

  for (const [width, height] of [
    [1440, 1000],
    [1280, 900],
    [1100, 900],
    [820, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/pendientes");
    await expect(page.getByText("3 filas · sin total económico global", { exact: true })).toBeVisible();
    await noOverflow();
    if (width === 1440) {
      await expect(list.locator(".desktop-list")).toBeVisible();
      await expect(list.locator(".pendientes-cards")).toBeHidden();
      await expect(list.locator(".pendientes-table th")).toHaveCount(9);
      // Las fechas se parten como mucho en el guion, nunca dentro del número.
      // Se mide cada fecha por separado: un fragmento de línea propio por fecha
      // (lineas === 1) y nunca más estrecho que su propio texto medido.
      const dateLines = await page.evaluate(() => {
        const row = Array.from(
          document.querySelectorAll<HTMLElement>(".pendientes-table tbody tr"),
        ).find((tr) => tr.textContent?.includes("Apertura 2026"));
        const cell = row?.children[2] as HTMLElement | undefined;
        if (!cell) return null;
        const style = getComputedStyle(cell);
        const context = document.createElement("canvas").getContext("2d");
        if (!context) return null;
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        return {
          text: cell.textContent ?? "",
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          cellWidth: cell.getBoundingClientRect().width,
          fechas: Array.from(
            cell.querySelectorAll<HTMLElement>(".pendiente-ciclo-fecha"),
          ).map((span) => {
            const texto = span.textContent ?? "";
            const rects = Array.from(span.getClientRects()).map((rect) => rect.width);
            return {
              texto,
              lineas: rects.length,
              min: rects.length ? Math.min(...rects) : 0,
              full: context.measureText(texto).width,
            };
          }),
        };
      });
      expect(dateLines?.text).toContain("01/11/2026");
      expect(dateLines!.fechas.length).toBe(2);
      // El mensaje conserva las cifras medidas para distinguir corte real de
      // artefacto de medición sin relajar la aserción.
      for (const fecha of dateLines!.fechas) {
        const detalle = `${fecha.texto} · ${JSON.stringify(dateLines)}`;
        expect(fecha.lineas, detalle).toBe(1);
        expect(fecha.min, detalle).toBeGreaterThanOrEqual(fecha.full - 3);
      }
      await expect(list).toHaveCSS("padding-top", "0px");
    }
    if (width === 1280 || width === 1100) {
      await expect(list.locator(".desktop-list")).toBeHidden();
      await expect(list.locator(".pendientes-cards")).toBeVisible();
    }
    if (width === 820) {
      await expect(list.locator(".desktop-list")).toBeHidden();
      await expect(list.locator(".pendientes-cards")).toBeVisible();
      const cards = list.locator(".pendientes-cards .ui-data-list-item");
      await expect(cards).toHaveCount(3);
      await expect(cards.first().locator(".ui-data-list-field")).toHaveCount(9);
      await expect(cards.first().locator(".ui-data-list-label").first()).toHaveCSS(
        "font-size",
        "12px",
      );
      const detail = cards
        .first()
        .getByRole("link", { name: "Abrir detalle", exact: true });
      expect((await detail.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    if (width === 390) {
      await expect(list.locator(".pendientes-cards")).toBeVisible();
      await expect(list).toHaveCSS("padding-top", "0px");
    }
    await page.screenshot({
      path: `artifacts/g5e-2/pendientes-lista-${width}.png`,
      fullPage: true,
    });
  }

  // Estado vacío por filtro
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/pendientes?texto=sin-coincidencia");
  const empty = list.locator(".empty");
  await expect(empty).toBeVisible();
  await expect(empty.locator("h2")).toHaveCSS("font-size", "15px");
  await expect(empty.locator("p").first()).toHaveCSS("font-size", "12px");
  await expect(
    empty.getByRole("button", { name: "Limpiar filtros", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-2/pendientes-vacio-1440.png",
    fullPage: true,
  });

  // Estado de carga: el esqueleto aparece mientras la consulta está en curso
  await page.route("**/api/pendientes?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.fallback();
  });
  await page.goto("/pendientes?texto=carga-ficticia");
  await expect(page.locator(".pendientes-skeleton")).toBeVisible();
  await expect(page.locator(".pendientes-skeleton li").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(page.locator(".pendientes-skeleton")).toBeHidden({ timeout: 10000 });
  await page.unroute("**/api/pendientes?**");

  // Estado de error de consulta
  await page.route("**/api/pendientes?**", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Fallo ficticio de consulta." }),
    }),
  );
  await page.goto("/pendientes?texto=error-ficticio");
  const errorGroup = page.getByRole("group", { name: "Error de consulta", exact: true });
  await expect(errorGroup).toBeVisible();
  await expect(
    errorGroup.getByRole("button", { name: "Reintentar", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await expect(page.getByLabel("Buscar por REF/ID/nombre", { exact: true })).toHaveValue(
    "error-ficticio",
  );
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-2/pendientes-error-1440.png",
    fullPage: true,
  });
  await page.unroute("**/api/pendientes?**");

  // Detalle de conciliación
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/pendientes/Conciliacion/1");
  await expect(
    page.getByRole("heading", { name: "Detalle · Apertura 2026-11-01", exact: true }),
  ).toBeVisible();
  await expect(root.locator("> .back")).toHaveCSS("min-height", "44px");
  await expect(root.locator("> .panel").first()).toHaveCSS(
    "border-top-color",
    "rgb(42, 47, 40)",
  );
  await expect(root.locator("> .panel > h2").first()).toHaveCSS("font-size", "15px");
  await expect(page.locator(".pendiente-detail-grid dt").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(page.locator(".pendiente-detail-grid dt").first()).toHaveCSS(
    "text-transform",
    "uppercase",
  );
  await expect(page.locator(".pendiente-metrics th").first()).toHaveCSS(
    "font-size",
    "12px",
  );
  await expect(page.locator(".pendiente-metrics th").first()).toHaveCSS(
    "text-align",
    "left",
  );
  await expect(page.locator(".pendiente-metrics td").first()).toHaveCSS(
    "font-size",
    "13px",
  );
  await expect(
    page.getByRole("button", { name: "Abrir Comida del ciclo", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await expect(root.locator("> .panel").first()).toHaveCSS("padding-top", "16px");
  for (const [width, height] of [
    [1440, 1000],
    [820, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/pendientes/Conciliacion/1");
    await expect(page.locator(".pendiente-metrics")).toBeVisible();
    if (width === 390) {
      await expect(root.locator("> .panel").first()).toHaveCSS("padding-top", "12px");
    }
    await noOverflow();
    await page.screenshot({
      path: `artifacts/g5e-2/pendientes-detalle-conciliacion-${width}.png`,
      fullPage: true,
    });
  }

  // Detalle de anticipo sin importe sustituto
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/pendientes/Anticipo/REF001");
  await expect(
    page.getByRole("heading", {
      name: "Detalle · Histórico ficticio G5e pendiente",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/No disponible —/).first()).toBeVisible();
  await expect(page.getByText("0,00 €")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Abrir Anticipo", exact: true }),
  ).toHaveCSS("min-height", "44px");
  await noOverflow();
  await page.screenshot({
    path: "artifacts/g5e-2/pendientes-detalle-anticipo-1440.png",
    fullPage: true,
  });

  // 720x500: equivalencia de zoom sin overflow
  await page.setViewportSize({ width: 720, height: 500 });
  for (const path of ["/pendientes", "/pendientes/Conciliacion/1"]) {
    await page.goto(path);
    await noOverflow();
  }

  // Los otros temas no heredan la capa Graphite
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/pendientes");
  const cards = list.locator(".pendientes-cards .ui-data-list-item");
  const panel = list;
  for (const theme of ["casa", "light-s", "dark-s", "hybrid-s"] as const) {
    await selectTheme(theme);
    await expect(panel).toHaveCSS("background-image", "none");
    await expect(root.locator(".page-head .eyebrow").first()).not.toHaveCSS(
      "color",
      "rgb(215, 255, 94)",
    );
    await noOverflow();
  }

  expect(errors).toEqual([]);
});
