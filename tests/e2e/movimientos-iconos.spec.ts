import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
import { artifactDir, fixtureContext, requireFixtureState, startFixtureServer, type OwnedFixture } from "./fixture";
import { expectMovementsParity } from "./movements-parity";
import { measureComponentContrast } from "./ui-dev07-audit";

/**
 * #448 — iconos por Tipo en Movimientos (opción B de L3).
 *
 * Un fixture propio (#448) siembra un Movimiento por cada uno de los cinco
 * Tipos del contrato y esta spec recorre las seis apariencias. Comprueba:
 *  - un SVG propio por Tipo dentro del nodo compartido `.movement-type-icon`,
 *    en tabla y en tarjeta, con la misma caja de 24 px;
 *  - que el glifo sea decorativo: `aria-hidden`, sin texto propio y sin
 *    duplicar la lectura del Tipo;
 *  - color semántico por significado en las seis apariencias (positivo y
 *    negativo agrupan sus dos Tipos) y `stroke` heredado del chip;
 *  - paridad tabla/tarjetas con el helper compartido y sin desbordamiento a
 *    820 y 390 px con los dos textos largos («Amortización deuda» y
 *    «Devolución de gasto»).
 *
 * El fixture reserva su puerto en esta spec (#508): no usa literales ni cae a
 * 5173/3001, y nunca toca el `.local` de desarrollo.
 */

const fixture = fixtureContext("iconos-448");
const artifacts = artifactDir("iconos-448");
const TIPOS = [
  "Ingreso",
  "Gasto",
  "Transferencia",
  "Amortización deuda",
  "Devolución de gasto",
] as const;
const TEMAS = [
  "light-s",
  "dark-s",
  "hybrid-s",
  "graphite-lime",
  "casa",
  "aurora",
] as const;

let owned: OwnedFixture | undefined;
let apiOrigin = "";

test.beforeAll(async ({ request }) => {
  apiOrigin = fixture.baseURL;
  const server = startFixtureServer(
    "apps/api/test-support/iconos-server.ts",
    fixture,
  );
  owned = server;
  await expect
    .poll(
      async () => {
        server.assertAlive();
        try {
          return (await request.get(`${apiOrigin}/api/health`)).status();
        } catch {
          return 0;
        }
      },
      { timeout: 30000 },
    )
    .toBe(200);
  requireFixtureState(server);
});

test.afterAll(() => {
  owned?.stop();
});

async function login(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = new URL(apiOrigin).port;
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
  await page.goto("/movimientos");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(`${fixture.dir}/bootstrap.txt`, "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia 448 " + randomUUID());
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
  await page.goto("/movimientos");
  await expect(
    page.getByRole("heading", { name: "Movimientos", exact: true }),
  ).toBeVisible();
}

const setTheme = async (page: Page, theme: string) => {
  await page.getByLabel("Cambiar tema").selectOption(theme);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
};

const expectNoOverflow = async (page: Page) =>
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);

/** Lista visible a este ancho: tabla por encima del paso a tarjetas. */
async function visibleList(page: Page) {
  return (await page.locator(".desktop-list").isVisible())
    ? ".desktop-list"
    : ".movements-cards";
}

/** Caja, glifo y lectura accesible del chip de un Tipo. */
async function expectChippedType(page: Page, scope: string, tipo: string) {
  const chip = page.locator(
    `${scope} .movement-type[data-tipo="${tipo}"] .movement-type-icon`,
  );
  await expect(chip).toHaveCount(1);
  await expect(chip).toBeVisible();
  await expect(chip).toHaveCSS("width", "24px");
  await expect(chip).toHaveCSS("height", "24px");
  const glyph = chip.locator("svg");
  await expect(glyph).toHaveCount(1);
  await expect(glyph).toBeVisible();
  await expect(glyph).toHaveAttribute("aria-hidden", "true");
  const lectura = await glyph.evaluate((node) => ({
    texto: node.textContent ?? "",
    trazos: node.querySelectorAll("path").length,
    stroke: getComputedStyle(node).stroke,
    titulo: node.querySelectorAll("title").length,
  }));
  expect(lectura.texto, `${tipo}: el glifo no aporta texto`).toBe("");
  expect(lectura.trazos, `${tipo}: sin trazo`).toBeGreaterThan(0);
  expect(lectura.titulo, `${tipo}: sin <title>`).toBe(0);
  expect(lectura.stroke, `${tipo}: stroke sin pintar`).not.toBe("none");
  // El Tipo se lee una sola vez: el chip completo mide exactamente lo mismo
  // que su texto visible, así que el SVG no aporta nombre ni texto.
  const [chipTexto, copia] = await page
    .locator(`${scope} .movement-type[data-tipo="${tipo}"]`)
    .evaluate((node) => {
      const clean = (value: string | null | undefined) =>
        (value ?? "").replace(/\s+/g, " ").trim();
      return [
        clean(node.textContent),
        clean(node.querySelector(".movement-type-copy")?.textContent),
      ];
    });
  expect(copia.startsWith(tipo), `${tipo}: el Tipo no se lee`).toBe(true);
  expect(chipTexto, `${tipo}: lectura duplicada`).toBe(copia);
}

async function chipColors(page: Page, scope: string) {
  const filas = await page.locator(`${scope} .movement-type`).evaluateAll((nodes) =>
    nodes.map((node) => {
      const icon = node.querySelector(".movement-type-icon")!;
      const style = getComputedStyle(icon);
      return {
        tipo: node.getAttribute("data-tipo"),
        color: style.color,
        fondo: style.backgroundColor,
      };
    }),
  );
  const porTipo = (tipo: string) => filas.find((fila) => fila.tipo === tipo);
  return { filas, porTipo };
}

test("#448 · cinco glifos propios en tabla y tarjeta, seis apariencias, sin desbordamiento", async ({
  page,
}) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);

  for (const tema of TEMAS) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/movimientos");
    await setTheme(page, tema);
    await expect(page.locator(".desktop-list")).toBeVisible();

    // 1) Tabla a 1440: un chip por Tipo, caja única y glifo propio.
    for (const tipo of TIPOS)
      await expectChippedType(page, ".desktop-list", tipo);

    // 2) Los cinco trazos son distintos entre sí.
    const trazos = await page
      .locator(".desktop-list .movement-type-icon svg")
      .evaluateAll((nodes) => nodes.map((node) => node.innerHTML));
    expect(trazos.length).toBe(TIPOS.length);
    expect(new Set(trazos).size).toBe(TIPOS.length);

    // 3) Color semántico por significado con el token de cada apariencia.
    const { filas, porTipo } = await chipColors(page, ".desktop-list");
    expect(filas.length).toBe(TIPOS.length);
    for (const fila of filas) {
      expect(fila.fondo, `${tema}/${fila.tipo}: chip sin fondo`).not.toBe(
        "rgba(0, 0, 0, 0)",
      );
      expect(fila.color, `${tema}/${fila.tipo}: chip sin color`).not.toBe(
        "rgba(0, 0, 0, 0)",
      );
    }
    expect(porTipo("Ingreso")?.color).toBe(porTipo("Devolución de gasto")?.color);
    expect(porTipo("Gasto")?.color).toBe(porTipo("Amortización deuda")?.color);
    expect(porTipo("Ingreso")?.color).not.toBe(porTipo("Gasto")?.color);

    // 4) Contraste efectivo del glifo (≥ 3:1) con la misma mecánica de la
    //    matriz DEV-07: tinta computada del SVG sobre el fondo real del chip.
    const componentes = await measureComponentContrast(page, "#main");
    expect(
      componentes.movementTypeGlyphs,
      `${tema}: sin glifos de Tipo medidos`,
    ).toBeGreaterThanOrEqual(TIPOS.length);
    expect(
      componentes.minMovementTypeGlyph,
      `${tema}: glifo del chip por debajo de 3:1`,
    ).toBeGreaterThanOrEqual(3);
    await page.screenshot({
      path: join(artifacts, `movimientos-${tema}-1440.png`),
      fullPage: true,
    });

    // 4) 1050: criterio de aceptación; la tabla sigue con iconos y sin
    //    desbordamiento (no hay regla de ocultación por ancho).
    await page.setViewportSize({ width: 1050, height: 1000 });
    const lista1050 = await visibleList(page);
    for (const tipo of TIPOS)
      await expectChippedType(page, lista1050, tipo);
    await expectNoOverflow(page);

    // 5) 820: donde hay tarjetas los iconos siguen visibles; donde hay tabla,
    //    también. Nunca ocultación general por ancho.
    await page.setViewportSize({ width: 820, height: 1000 });
    const lista820 = await visibleList(page);
    for (const tipo of TIPOS)
      await expectChippedType(page, lista820, tipo);
    await expectNoOverflow(page);
    const chips820 = await page
      .locator(`${lista820} .movement-type`)
      .evaluateAll((nodes) =>
        nodes.map((node) => node.scrollWidth - node.clientWidth),
      );
    expect(chips820.filter((ancho) => ancho > 1)).toEqual([]);
    await page.screenshot({
      path: join(artifacts, `movimientos-${tema}-820.png`),
      fullPage: true,
    });

    // 5) 390: tarjetas con icono, paridad con la tabla y sin desbordamiento
    //    con «Amortización deuda» y «Devolución de gasto».
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".movements-cards")).toBeVisible();
    await expectNoOverflow(page);
    for (const tipo of TIPOS)
      await expectChippedType(page, ".movements-cards", tipo);
    const chips390 = await page
      .locator(".movements-cards .movement-type")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.scrollWidth - node.clientWidth),
      );
    expect(chips390.filter((ancho) => ancho > 1)).toEqual([]);
    await expect(
      page.locator('.movements-cards .movement-type[data-tipo="Amortización deuda"]'),
    ).toBeVisible();
    await expect(
      page.locator(
        '.movements-cards .movement-type[data-tipo="Devolución de gasto"]',
      ),
    ).toBeVisible();
    await expectMovementsParity(page);
    await page.screenshot({
      path: join(artifacts, `movimientos-${tema}-390.png`),
      fullPage: true,
    });
  }

  expect(errors).toEqual([]);
});
