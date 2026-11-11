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

  const expectedGroups = [
    ["Resumen y control", ["/flujo-mensual", "/pendientes", "/resumen-anual"]],
    ["Patrimonio", ["/saldos", "/inversiones", "/deudas"]],
    ["Presupuestos y planificación", ["/clasificacion/partidas", "/dprima", "/planes-ciclo", "/nomina", "/presupuestos", "/plan-anual"]],
    ["Casos y gastos especiales", ["/referencias", "/anticipos", "/compartidos", "/vehiculos", "/comida", "/revision-comida"]],
    ["Ciclos y cierres", ["/ciclos", "/precierre", "/cierre", "/fotos"]],
  ];
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

  // Solo las cabeceras llevan chevron; los enlaces no.
  expect(await nav.locator(".nav-group-chevron").count()).toBe(
    expectedGroups.length,
  );
  expect(await nav.locator("a .nav-chevron").count()).toBe(0);

  // El grupo activo está abierto y los demás contraídos.
  await expect(
    nav.locator("#nav-group-patrimonio"),
  ).toBeVisible();
  for (const id of ["resumen-control", "presupuestos-planificacion", "casos-gastos", "ciclos-cierres"])
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

  // Partidas conserva su ruta y las entradas heredadas quedan etiquetadas.
  await expect(nav.locator('a[href="/dprima"]')).toContainText("Partidas");
  await expect(nav.locator('a[href="/presupuestos"]')).toContainText(
    "Presupuestos (legado)",
  );
  await expect(nav.locator('a[href="/plan-anual"]')).toContainText(
    "Plan anual (legado)",
  );

  // Cabecera global fija y selector compacto; etiqueta Graphite Lime.
  const themeSelect = page.getByLabel("Apariencia");
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
  const select = page.getByLabel("Apariencia");
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
