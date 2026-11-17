// UI-02 · #504 — jerarquía del menú lateral.
// Fixture propio: instancia aislada del servidor de navegación con su propio
// puerto, su propio directorio de datos y una única cuenta provisionada por
// ejecución (nunca datos reales). Solo presentación: no cambia rutas.
import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const API_PORT = Number(process.env.E2E_API_PORT ?? 3024);
const DIR = ".local/e2e-nav-504";
const ART = "artifacts/ui-02-navegacion";

const DIRECT = ["/inicio", "/movimientos"];
const GROUPS = [
  ["Resumen y control", ["/flujo-mensual", "/pendientes", "/resumen-anual"]],
  ["Patrimonio", ["/saldos", "/inversiones", "/deudas"]],
  [
    "Presupuestos y planificación",
    ["/dprima", "/planes-ciclo", "/nomina", "/clasificacion/partidas"],
  ],
  [
    "Casos y gastos especiales",
    ["/referencias", "/anticipos", "/compartidos", "/vehiculos", "/comida", "/revision-comida"],
  ],
  ["Ciclos y cierres", ["/ciclos", "/precierre", "/cierre", "/fotos"]],
] as const;
const LEGACY = ["/presupuestos", "/plan-anual"];

let child: ReturnType<typeof spawn> | undefined;

test.beforeAll(async ({ request }) => {
  // El origen autorizado de la API es el mismo que sirve la web en esta
  // ejecución (5173 en CI, 5292 en el chequeo local con puerto libre).
  const baseURL = test.info().project.use.baseURL ?? "http://127.0.0.1:5173";
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/navigation-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        E2E_PORT: String(API_PORT),
        E2E_DIR: DIR,
        E2E_APP_ORIGIN: process.env.E2E_APP_ORIGIN ?? baseURL,
      },
    },
  );
  await expect
    .poll(
      async () => {
        try {
          return (
            await request.get(`http://127.0.0.1:${API_PORT}/api/health`)
          ).status();
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

/** Una sola cuenta por ejecución: el fixture la provisiona al arrancar. */
async function login(page: Page) {
  await page.goto("/saldos");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(`${DIR}/bootstrap.txt`, "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia jerarquía " + randomUUID());
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

/** Captura en reposo: sin anillo de foco del último clic. */
async function shot(page: Page, name: string) {
  // Estado en reposo: sin foco ni hover del último clic.
  const width = page.viewportSize()?.width ?? 1440;
  await page.mouse.move(width - 20, 4);
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );
  await page.screenshot({ path: `${ART}/${name}`, fullPage: true });
}

/** Sin desbordamiento horizontal, sin etiquetas truncadas ni `nowrap`. */
async function expectNoTruncation(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  const truncated = await page.evaluate(() => {
    const problems: string[] = [];
    document
      .querySelectorAll(
        "#main-nav .nav-label, #main-nav .nav-group-label, #main-nav .nav-group-hint",
      )
      .forEach((element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || element.clientWidth === 0) return;
        if (element.scrollWidth > element.clientWidth + 1)
          problems.push(`recortado: ${element.textContent}`);
        if (style.textOverflow === "ellipsis" || style.whiteSpace === "nowrap")
          problems.push(`sin envolver: ${element.textContent}`);
      });
    return problems;
  });
  expect(truncated).toEqual([]);
}

test("#504: accesos directos, grupos en caja normal y «Funciones anteriores» plegable", async ({
  page,
}) => {
  test.setTimeout(180_000);
  mkdirSync(ART, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await routeApi(page);
  await login(page);

  const nav = page.locator("#main-nav");
  const sections = nav.locator(".nav-section");
  const legacySection = nav.locator(".nav-section-legacy");
  const legacyBody = nav.locator("#nav-group-funciones-anteriores");
  const legacyToggle = legacySection.locator(".nav-group-toggle");

  // (a) Dos accesos directos fuera de grupos y cinco grupos principales.
  expect(
    await nav.locator(".nav-direct a").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    ),
  ).toEqual(DIRECT);
  expect(await sections.count()).toBe(GROUPS.length + 1);
  expect(
    await nav.locator(".nav-group-label").allTextContents(),
  ).toEqual([...GROUPS.map(([label]) => label), "Funciones anteriores"]);
  for (const [index, [label, hrefs]] of GROUPS.entries()) {
    const section = sections.nth(index);
    await expect(section.locator(".nav-group-label")).toHaveText(label);
    expect(
      await section.locator(".nav-group-body a").evaluateAll((links) =>
        links.map((link) => link.getAttribute("href")),
      ),
    ).toEqual([...hrefs]);
  }

  // Caja normal: sin mayúsculas sostenidas ni tracking, con tamaño legible.
  const headerStyles = await nav.locator(".nav-group-label").evaluateAll((labels) =>
    labels.map((label) => {
      const style = getComputedStyle(label.closest(".nav-group-toggle")!);
      return {
        text: label.textContent,
        transform: style.textTransform,
        spacing: style.letterSpacing,
        size: style.fontSize,
        weight: Number(style.fontWeight),
        clipped: (label as HTMLElement).scrollHeight >
          (label as HTMLElement).clientHeight + 1,
      };
    }),
  );
  for (const header of headerStyles) {
    expect(header.transform, header.text!).toBe("none");
    expect(header.spacing, header.text!).toBe("normal");
    expect(Number.parseFloat(header.size), header.text!).toBeGreaterThanOrEqual(13);
    expect(header.weight, header.text!).toBeGreaterThanOrEqual(600);
    // Envolver no recorta: el contenido cabe en la caja de la etiqueta.
    expect(header.clipped, header.text!).toBe(false);
  }

  // «Funciones anteriores» es el último grupo, secundario y con las dos rutas.
  await expect(sections.last()).toHaveClass(/nav-section-legacy/);
  await expect(legacySection.locator(".nav-group-label")).toHaveText(
    "Funciones anteriores",
  );
  await expect(legacySection.locator(".nav-group-hint")).toContainText(
    "Retirada prevista",
  );
  expect(
    await legacyBody.locator("a").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    ),
  ).toEqual(LEGACY);
  expect(
    await legacyBody.locator(".nav-label").allTextContents(),
  ).toEqual(["Presupuestos (legado)", "Plan anual (legado)"]);

  // (b) Plegado por defecto salvo que contenga la página activa.
  await expect(legacyToggle).toHaveAttribute("aria-expanded", "false");
  await shot(page, "1440-oscuro-plegado.png");
  await legacyToggle.click();
  await expect(legacyToggle).toHaveAttribute("aria-expanded", "true");
  await expect(legacyBody).toBeVisible();
  await shot(page, "1440-oscuro-abierto.png");
  await legacyToggle.click();
  await expect(legacyBody).toBeHidden();

  // (c) Sin encabezados «Heredado» ni «Auxiliar» en ningún grupo.
  const planificacion = sections.filter({ hasText: "Presupuestos y planificación" });
  await planificacion.locator(".nav-group-toggle").click();
  await expect(planificacion.locator(".nav-group-body a")).toHaveCount(4);
  await expect(planificacion.locator(".nav-legacy-label")).toHaveCount(0);
  await expect(nav.getByText("Heredado", { exact: true })).toHaveCount(0);
  await expect(nav.getByText("Auxiliar", { exact: true })).toHaveCount(0);

  // (d) «Revisión Comida» sigue bajo «Comida», subordinada y accesible.
  const casos = sections.filter({ hasText: "Casos y gastos especiales" });
  await casos.locator(".nav-group-toggle").click();
  const comida = casos.getByRole("link", { name: "Comida", exact: true });
  const revision = casos.getByRole("link", { name: "Revisión Comida", exact: true });
  await expect(comida).toBeVisible();
  await expect(revision).toBeVisible();
  await expect(revision).toHaveClass(/nav-link-secondary/);
  await expect(revision).not.toHaveClass(/nav-link-legacy/);
  expect(
    await casos.locator(".nav-group-body a").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    ),
  ).toContain("/revision-comida");
  const [comidaIndent, revisionIndent] = await Promise.all([
    comida.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingLeft)),
    revision.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingLeft)),
  ]);
  expect(revisionIndent).toBeGreaterThan(comidaIndent);
  // Alcanzable con teclado desde su entrada principal.
  await comida.focus();
  await page.keyboard.press("Tab");
  await expect(revision).toBeFocused();
  await planificacion.locator(".nav-group-toggle").click();
  await casos.locator(".nav-group-toggle").click();

  // (e) 1440: sin scroll horizontal ni recortes con los grupos cerrados.
  await expectNoTruncation(page);

  // (b, continuación) Carga directa, recarga y atrás/adelante abren el grupo.
  for (const [path, href] of [
    ["/presupuestos", "/presupuestos"],
    ["/plan-anual", "/plan-anual"],
  ] as const) {
    await page.goto(path);
    await expect(legacyToggle).toHaveAttribute("aria-expanded", "true");
    await expect(legacyBody).toBeVisible();
    const link = nav.locator(`a[href="${href}"]`);
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await page.reload();
    await expect(legacyToggle).toHaveAttribute("aria-expanded", "true");
    await expect(legacyBody).toBeVisible();
    await expect(nav.locator(`a[href="${href}"]`)).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
  // Atrás/adelante entre las dos rutas históricas mantiene el grupo abierto.
  await page.goBack();
  await expect(page).toHaveURL(/\/presupuestos$/);
  await expect(legacyToggle).toHaveAttribute("aria-expanded", "true");
  await expect(nav.locator('a[href="/presupuestos"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.goForward();
  await expect(page).toHaveURL(/\/plan-anual$/);
  await expect(legacyToggle).toHaveAttribute("aria-expanded", "true");
  await expect(nav.locator('a[href="/plan-anual"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  await shot(page, "1440-plan-anual-funciones-abierto.png");

  // (f) Teclado: la cabecera de grupo abre y cierra con Enter y Space.
  await page.goto("/saldos");
  await expect(nav.locator("#nav-group-patrimonio")).toBeVisible();
  await expect(legacyBody).toBeHidden();
  await legacyToggle.focus();
  await page.keyboard.press("Enter");
  await expect(legacyToggle).toHaveAttribute("aria-expanded", "true");
  await expect(legacyBody).toBeVisible();
  await page.keyboard.press("Space");
  await expect(legacyToggle).toHaveAttribute("aria-expanded", "false");
  await expect(legacyBody).toBeHidden();
  await expect(legacyToggle).toBeFocused();

  // Tema claro (distinto del oscuro): misma jerarquía, sin desbordamiento.
  const select = page.getByLabel("Apariencia");
  await select.selectOption("light-s");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light-s");
  await expectNoTruncation(page);
  await legacyToggle.click();
  await shot(page, "1440-claro-funciones-abierto.png");
  await legacyToggle.click();

  // (e, móvil) 390: menú abierto, grupos abiertos, sin scroll horizontal.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inicio");
  const toggle = page.locator(".menu-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await shot(page, "390-plegado.png");
  await toggle.click();
  await expect(nav).toBeVisible();
  // Los dos accesos directos siguen siendo los primeros destinos del teclado.
  await expect(nav.getByRole("link", { name: "Inicio", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    nav.getByRole("link", { name: "Movimientos", exact: true }),
  ).toBeFocused();
  await expectNoTruncation(page);
  for (const [label] of GROUPS) {
    const group = sections.filter({ hasText: label });
    if ((await group.locator(".nav-group-toggle").getAttribute("aria-expanded")) === "false")
      await group.locator(".nav-group-toggle").click();
  }
  await legacyToggle.click();
  await expect(legacyBody).toBeVisible();
  await expectNoTruncation(page);
  await shot(page, "390-grupos-abiertos.png");

  // Escape cierra el menú móvil y devuelve el foco al botón.
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();

  // 390 con la ruta histórica activa: el grupo se abre solo y no desborda.
  await page.goto("/plan-anual");
  await toggle.click();
  await expect(legacyToggle).toHaveAttribute("aria-expanded", "true");
  await expect(legacyBody).toBeVisible();
  await expect(nav.locator('a[href="/plan-anual"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expectNoTruncation(page);
  await shot(page, "390-plan-anual-funciones-abierto.png");

  expect(errors).toEqual([]);
});