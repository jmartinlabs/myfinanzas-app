import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * UI · DEV-03 — navegación.
 *
 * Comprueba que los 23 enlaces actuales se conservan sin cambiar sus `href`,
 * que los grupos y el activo son perceptibles, que el título sigue a la ruta y
 * que el menú móvil funciona con teclado. El servidor es aislado y ficticio.
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
    .getByLabel("Token de configuración local")
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

test("UI · DEV-03: 23 enlaces, grupos, activo, títulos y menú móvil accesible", async ({
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

  // Los 23 enlaces se conservan exactamente, sin duplicados ni rutas nuevas.
  const hrefs = await nav
    .locator("a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(hrefs).toHaveLength(23);
  expect(new Set(hrefs).size).toBe(23);
  expect([...hrefs].sort()).toEqual([...EXPECTED_HREFS].sort());
  expect(hrefs).not.toContain("/");
  expect(hrefs).not.toContain("/saldos/nuevo");

  const expectedGroups = [
    ["Mi espacio", ["/inicio", "/flujo-mensual", "/pendientes", "/anticipos", "/compartidos"]],
    ["Patrimonio", ["/saldos", "/clasificacion/partidas", "/inversiones", "/deudas", "/vehiculos", "/referencias"]],
    ["Operación", ["/movimientos", "/ciclos", "/precierre", "/cierre"]],
    ["Planificación", ["/dprima", "/comida", "/revision-comida", "/planes-ciclo", "/nomina", "/plan-anual", "/resumen-anual", "/presupuestos"]],
  ];
  const sections = nav.locator(".nav-section");
  expect(await sections.count()).toBe(expectedGroups.length);
  for (const [index, [label, expected]] of expectedGroups.entries()) {
    const section = sections.nth(index);
    await expect(section.locator(".nav-group")).toHaveText(label);
    expect(
      await section.locator("a").evaluateAll((links) =>
        links.map((link) => link.getAttribute("href")),
      ),
    ).toEqual(expected);
  }

  // Cuatro grupos de dominio con etiquetas estables.
  for (const group of ["Mi espacio", "Patrimonio", "Operación", "Planificación"])
    await expect(
      nav.locator(".nav-group").filter({ hasText: group }),
    ).toHaveCount(1);

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
    nav.getByRole("link", { name: "Flujo mensual", exact: true }),
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

  // Tres temas a 390 con el menú abierto: sin desbordamiento horizontal.
  const select = page.getByLabel("Tema visual");
  for (const [id, file] of [
    ["dark-s", "390-dark-s-menu.png"],
    ["light-s", "390-light-s-menu.png"],
    ["hybrid-s", "390-hybrid-s-menu.png"],
  ] as const) {
    await select.selectOption(id);
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(nav).toBeVisible();
    for (const group of [
      "Mi espacio",
      "Patrimonio",
      "Operación",
      "Planificación",
    ])
      await expect(
        nav.locator(".nav-group").filter({ hasText: group }),
      ).toBeVisible();
    await expectNoOverflow();
    await page.screenshot({
      path: `artifacts/ui-dev-03/${file}`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
  }

  // Tres temas a 1440 con la barra lateral completa.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/saldos");
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(5);
  await expect(toggle).toBeHidden();
  await expect(nav).toBeVisible();
  for (const [id, file] of [
    ["dark-s", "1440-dark-s.png"],
    ["light-s", "1440-light-s.png"],
    ["hybrid-s", "1440-hybrid-s.png"],
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
