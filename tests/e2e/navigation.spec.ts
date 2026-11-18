import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * UI · DEV-03 — navegación.
 *
 * Comprueba que los 24 enlaces se conservan sin cambiar sus `href`,
 * que el enlace autorizado `/fotos` se declara una sola vez, que los grupos y
 * el activo son perceptibles, que el título sigue a la ruta y que el menú móvil
 * funciona con teclado. El servidor es aislado y ficticio.
 */

const API_PORT = 3023;
const DIR = ".local/e2e-navigation";
let child: ReturnType<typeof spawn> | undefined;

const EXPECTED_HREFS = [
  "/inicio",
  "/flujo-mensual",
  "/pendientes",
  "/anticipos",
  "/compartidos",
  "/saldos",
  "/clasificacion/partidas",
  "/inversiones",
  "/deudas",
  "/vehiculos",
  "/referencias",
  "/movimientos",
  "/ciclos",
  "/precierre",
  "/cierre",
  "/fotos",
  "/dprima",
  "/comida",
  "/revision-comida",
  "/planes-ciclo",
  "/nomina",
  "/plan-anual",
  "/resumen-anual",
  "/presupuestos",
];

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/navigation-server.ts"],
    {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test" },
    },
  );
  await expect
    .poll(
      async () => {
        try {
          return (await request.get(`http://127.0.0.1:${API_PORT}/api/health`))
            .status();
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

async function routeApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(API_PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });
}

async function login(page: Page) {
  await page.goto("/saldos");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(`${DIR}/bootstrap.txt`, "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(
    "Clave ficticia navegación " + randomUUID(),
  );
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
  await expect(
    page.getByRole("heading", { name: "Saldos", exact: true }),
  ).toBeVisible();
}

test("UI-01: 24 enlaces, accesos directos, grupos desplegables, activo, títulos y menú móvil accesible", async ({
  page,
}) => {
  mkdirSync("artifacts/ui-dev-03", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await routeApi(page);
  await login(page);

  const nav = page.locator("#main-nav");
  const toggle = page.locator(".menu-toggle");
  const expectNoOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

  // Los 24 enlaces se conservan y /fotos se declara una sola vez.
  const hrefs = await nav
    .locator("a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(hrefs).toHaveLength(24);
  expect(new Set(hrefs).size).toBe(24);
  expect([...hrefs].sort()).toEqual([...EXPECTED_HREFS].sort());
  expect(hrefs).not.toContain("/");
  expect(hrefs).not.toContain("/saldos/nuevo");

  // UI-02 (#504): cinco grupos principales y «Funciones anteriores» al final.
  const expectedGroups = [
    ["Resumen y control", ["/flujo-mensual", "/pendientes", "/resumen-anual"]],
    ["Patrimonio", ["/saldos", "/inversiones", "/deudas"]],
    ["Presupuestos y planificación", ["/dprima", "/planes-ciclo", "/nomina", "/clasificacion/partidas"]],
    ["Casos y gastos especiales", ["/referencias", "/anticipos", "/compartidos", "/vehiculos", "/comida", "/revision-comida"]],
    ["Ciclos y cierres", ["/ciclos", "/precierre", "/cierre", "/fotos"]],
    ["Funciones anteriores", ["/presupuestos", "/plan-anual"]],
  ];
  // Los dos accesos directos viven fuera de los grupos, en su propio bloque.
  expect(
    await nav.locator(".nav-direct a").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    ),
  ).toEqual(["/inicio", "/movimientos"]);

  // #504 (delta 17/11/2026): divisoria horizontal fina y decorativa entre la
  // identidad y los accesos directos, con espaciado equilibrado a ambos lados.
  // No sustituye la separación existente entre accesos directos y grupos.
  const divider = nav.locator(".nav-divider");
  await expect(divider).toBeVisible();
  const dividerMetrics = await divider.evaluate((element) => {
    const brand = document
      .querySelector(".sidebar .brand")!
      .getBoundingClientRect();
    const direct = document
      .querySelector(".sidebar .nav-direct")!
      .getBoundingClientRect();
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      borderTopWidth: style.borderTopWidth,
      height: box.height,
      gapAbove: box.top - brand.bottom,
      gapBelow: direct.top - box.bottom,
      followedByDirect:
        (element.nextElementSibling as HTMLElement | null)?.classList.contains(
          "nav-direct",
        ) ?? false,
    };
  });
  expect(dividerMetrics.followedByDirect).toBe(true);
  expect(dividerMetrics.borderTopWidth).toBe("1px");
  expect(dividerMetrics.height).toBeLessThanOrEqual(1);
  expect(dividerMetrics.gapAbove).toBeGreaterThanOrEqual(8);
  expect(dividerMetrics.gapBelow).toBeGreaterThanOrEqual(8);
  expect(dividerMetrics.gapAbove).toBeCloseTo(dividerMetrics.gapBelow, 0);

  const sections = nav.locator(".nav-section");
  expect(await nav.locator(".nav-group-toggle").count()).toBe(expectedGroups.length);
  expect(await sections.count()).toBe(expectedGroups.length);
  for (const [index, [label, expected]] of expectedGroups.entries()) {
    const section = sections.nth(index);
    const toggle = section.locator(".nav-group-toggle");
    await expect(toggle).toContainText(label);
    expect(
      await section.locator(".nav-group-body a").evaluateAll((links) =>
        links.map((link) => link.getAttribute("href")),
      ),
    ).toEqual(expected);
  }

  // #504: las rutas históricas ya no viven en «Presupuestos y planificación»;
  // no quedan encabezados «Heredado» ni «Auxiliar» en la navegación.
  const presupuestos = sections.filter({ hasText: "Presupuestos y planificación" });
  await presupuestos.locator(".nav-group-toggle").click();
  await expect(presupuestos.locator(".nav-legacy-label")).toHaveCount(0);
  await expect(presupuestos.locator(".nav-link-legacy")).toHaveCount(0);
  await expect(nav.getByText("Heredado", { exact: true })).toHaveCount(0);
  await expect(nav.getByText("Auxiliar", { exact: true })).toHaveCount(0);
  const funciones = sections.filter({ hasText: "Funciones anteriores" });
  await expect(funciones).toHaveClass(/nav-section-legacy/);
  await expect(funciones.locator(".nav-group-hint")).toContainText(
    "Retirada prevista",
  );
  await funciones.locator(".nav-group-toggle").click();
  await expect(
    funciones.locator(".nav-link-legacy").first(),
  ).toContainText("Presupuestos (legado)");
  await funciones.locator(".nav-group-toggle").click();
  const casos = sections.filter({ hasText: "Casos y gastos especiales" });
  await casos.locator(".nav-group-toggle").click();
  // #504 (delta 17/11/2026): «Comida del ciclo» y «Revisión Comida» son dos
  // entradas independientes, consecutivas y del mismo nivel: misma clase de
  // enlace, mismo relleno y tono, sin marca de subordinación ni de legado.
  const comidaLink = casos.getByRole("link", {
    name: "Comida del ciclo",
    exact: true,
  });
  const revisionLink = casos.getByRole("link", {
    name: "Revisión Comida",
    exact: true,
  });
  await expect(comidaLink).toBeVisible();
  await expect(revisionLink).toBeVisible();
  await expect(comidaLink).toHaveAttribute("href", "/comida");
  await expect(revisionLink).toHaveAttribute("href", "/revision-comida");
  const casoEntries = await casos.locator(".nav-group-body a").evaluateAll(
    (links) =>
      links.map((link) => {
        const style = getComputedStyle(link);
        return {
          href: link.getAttribute("href"),
          className: link.className,
          paddingLeft: style.paddingLeft,
          color: style.color,
        };
      }),
  );
  const comidaEntry = casoEntries.find((entry) => entry.href === "/comida")!;
  const revisionEntry = casoEntries.find(
    (entry) => entry.href === "/revision-comida",
  )!;
  expect(comidaEntry.className).toBe("nav-link");
  expect(revisionEntry.className).toBe("nav-link");
  expect(revisionEntry.paddingLeft).toBe(comidaEntry.paddingLeft);
  expect(revisionEntry.color).toBe(comidaEntry.color);
  await expect(casos.locator(".nav-link-secondary")).toHaveCount(0);
  await expect(casos.locator(".nav-legacy-label, .nav-secondary-label")).toHaveCount(0);
  // La etiqueta corta anterior ya no existe y no hay jerga de origen.
  await expect(
    casos.getByRole("link", { name: "Comida", exact: true }),
  ).toHaveCount(0);
  const navLabels = await nav
    .locator(".nav-label, .nav-group-label, .nav-group-hint")
    .allTextContents();
  for (const word of ["auxiliar", "heredado", "ing"])
    expect(
      navLabels.filter((label) => new RegExp(`\\b${word}\\b`, "i").test(label)),
    ).toEqual([]);
  mkdirSync("artifacts/ui-02", { recursive: true });
  await page.screenshot({
    path: "artifacts/ui-02/nav-legacy-1440.png",
    fullPage: true,
  });
  await presupuestos.locator(".nav-group-toggle").click();
  await casos.locator(".nav-group-toggle").click();

  // Solo las cabeceras llevan chevron; los enlaces no.
  expect(await nav.locator(".nav-group-chevron").count()).toBe(
    expectedGroups.length,
  );
  expect(await nav.locator("a .nav-chevron").count()).toBe(0);

  // El grupo activo está abierto y los demás contraídos.
  await expect(
    nav.locator("#nav-group-patrimonio"),
  ).toBeVisible();
  for (const id of ["resumen-control", "presupuestos-planificacion", "casos-gastos", "ciclos-cierres", "funciones-anteriores"])
    await expect(nav.locator(`#nav-group-${id}`)).toBeHidden();
  await expect(
    nav.locator('.nav-group-toggle[aria-expanded="true"]'),
  ).toHaveCount(1);

  // Los grupos no activos se abren y contraen con el botón de cabecera.
  const resumenToggle = nav
    .locator(".nav-group-toggle")
    .filter({ hasText: "Resumen y control" });
  await expect(resumenToggle).toHaveAttribute("aria-expanded", "false");
  await resumenToggle.click();
  await expect(resumenToggle).toHaveAttribute("aria-expanded", "true");
  await expect(nav.locator("#nav-group-resumen-control")).toBeVisible();
  await resumenToggle.click();
  await expect(resumenToggle).toHaveAttribute("aria-expanded", "false");
  await expect(nav.locator("#nav-group-resumen-control")).toBeHidden();

  // La cabecera también responde a Enter y Space.
  await resumenToggle.focus();
  await page.keyboard.press("Enter");
  await expect(resumenToggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Space");
  await expect(resumenToggle).toHaveAttribute("aria-expanded", "false");

  // Partidas conserva su ruta y las entradas heredadas quedan etiquetadas.
  await expect(nav.locator('a[href="/dprima"]')).toContainText("Partidas");
  await expect(nav.locator('a[href="/presupuestos"]')).toContainText(
    "Presupuestos (legado)",
  );
  await expect(nav.locator('a[href="/plan-anual"]')).toContainText(
    "Plan anual (legado)",
  );

  // Cabecera global fija y selector compacto; etiqueta Graphite Lime.
  const themeSelect = page.getByLabel("Cambiar tema");
  await expect(themeSelect.locator("option").nth(3)).toHaveText("Graphite Lime");
  await expect(page.locator(".global-header")).toHaveCSS("position", "sticky");
  expect(
    await themeSelect.evaluate((element) => element.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(150);

  // Activo: aria-current + barra + peso, no solo color.
  const saldos = nav.getByRole("link", { name: "Saldos", exact: true });
  await expect(saldos).toHaveAttribute("aria-current", "page");
  await expect(saldos).toHaveClass(/nav-active/);
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(saldos).toHaveCSS("font-weight", "750");
  const bar = await saldos.evaluate((element) => {
    const style = getComputedStyle(element, "::before");
    return { width: style.width, background: style.backgroundColor };
  });
  expect(bar.width).toBe("4px");
  expect(bar.background).not.toBe("rgba(0, 0, 0, 0)");

  // Título de documento por ruta, incluidos alias y subvistas.
  await expect(page).toHaveTitle("Saldos · MyFinanzas");
  await nav.getByRole("link", { name: "Inicio", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Inicio", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Inicio · MyFinanzas");
  await expect(
    nav.getByRole("link", { name: "Inicio", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Saldos", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Saldos · MyFinanzas");
  await expect(saldos).toHaveAttribute("aria-current", "page");

  await page.goto("/saldos/nuevo");
  await expect(
    page.getByRole("heading", { name: "Nuevo Saldo", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Nuevo Saldo · MyFinanzas");
  await expect(saldos).toHaveAttribute("aria-current", "page");

  await page.goto("/saldos/S001");
  await expect(page).toHaveTitle("Saldo S001 · MyFinanzas");
  await expect(saldos).toHaveAttribute("aria-current", "page");

  await page.goto("/saldos/S001/editar");
  await expect(
    page.getByRole("heading", { name: "Editar Saldo", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Editar Saldo S001 · MyFinanzas");

  // Menú móvil: cerrado por defecto, Escape cierra y devuelve el foco.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inicio");
  await expect(
    page.getByRole("button", { name: "Abrir menú", exact: true }),
  ).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAttribute("aria-controls", "main-nav");
  await expect(nav).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: "Cerrar menú", exact: true }),
  ).toBeVisible();
  await expect(nav).toBeVisible();
  const first = nav.getByRole("link", { name: "Inicio", exact: true });
  await expect(first).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    nav.getByRole("link", { name: "Movimientos", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();

  // Abrir con teclado mantiene el foco visible en el primer enlace.
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(first).toBeFocused();
  await expect(first).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Escape");

  // Cinco temas a 390 con el menú abierto: sin desbordamiento horizontal.
  const select = page.getByLabel("Cambiar tema");
  for (const [id, file] of [
    ["dark-s", "390-dark-s-menu.png"],
    ["light-s", "390-light-s-menu.png"],
    ["hybrid-s", "390-hybrid-s-menu.png"],
    ["graphite-lime", "390-graphite-lime-menu.png"],
    ["casa", "390-casa-menu.png"],
  ] as const) {
    await select.selectOption(id);
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(nav).toBeVisible();
    for (const group of [
      "Resumen y control",
      "Patrimonio",
      "Presupuestos y planificación",
      "Casos y gastos especiales",
      "Ciclos y cierres",
    ])
      await expect(
        nav.locator(".nav-group-toggle").filter({ hasText: group }),
      ).toBeVisible();
    await expectNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev-03/${file}`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
  }

  // Cinco temas a 1440 con la barra lateral completa.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/saldos");
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(5);
  await expect(toggle).toBeHidden();
  await expect(nav).toBeVisible();
  for (const [id, file] of [
    ["dark-s", "1440-dark-s.png"],
    ["light-s", "1440-light-s.png"],
    ["hybrid-s", "1440-hybrid-s.png"],
    ["graphite-lime", "1440-graphite-lime.png"],
    ["casa", "1440-casa.png"],
  ] as const) {
    await select.selectOption(id);
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    await expect(nav).toBeVisible();
    await expectNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev-03/${file}`,
      fullPage: true,
    });
  }

  expect(errors).toEqual([]);
});
