import { test, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * #502 — pie persistente de versión.
 *
 * Recorrido real con servidor aislado (3040), MFA real y SQLite; el build de
 * `apps/web/dist` se sirve en un puerto libre (5290 por defecto) con proxy a la
 * API, de modo que el navegador habla con la aplicación tal como se despliega.
 *
 * Comprueba:
 *  - pie visible sin desplazarse a 1440 y a 390, pegado al fondo del viewport;
 *  - sin desbordamiento horizontal en ambas anchuras;
 *  - panel «Información de la aplicación» con versión, entorno, SHA corto y
 *    esquema SQLite, sin cadenas sensibles;
 *  - apertura con teclado, cierre con `Escape` y foco devuelto al control;
 *  - viewport bajo (390×500) sin controles importantes ocultos por el pie;
 *  - fallback explícito si `/api/version` no responde.
 *
 * Todo ficticio: sin datos reales, sin Excel y sin estado persistente entre
 * ejecuciones (el fixture borra `.local/e2e-version` al arrancar).
 */

const PORT = 3040;
const DIR = ".local/e2e-version";
const SHOTS = "artifacts/version-footer";
const APP_VERSION = "0.2.0";
const APP_SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
const SHORT_SHA = APP_SHA.slice(0, 7);
const SCHEMA = 31;
let child: ChildProcess | undefined;

test.beforeAll(async ({ request }) => {
  const appOrigin = process.env.E2E_APP_ORIGIN ?? "http://127.0.0.1:5290";
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/version-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        APP_ENV: "TEST",
        APP_VERSION,
        APP_SHA,
        APP_ORIGIN: appOrigin,
      },
    },
  );
  await expect
    .poll(
      async () => {
        try {
          return (
            await request.get(`http://127.0.0.1:${PORT}/api/health`)
          ).status();
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

async function login(page: Page) {
  await page.goto("/saldos");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(DIR + "/bootstrap.txt", "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia versión " + randomUUID());
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

/** Pie visible sin scroll, pegado al borde inferior y sin scroll horizontal. */
async function expectPinnedFooter(page: Page) {
  const footer = page.locator("footer.global-footer");
  await expect(footer).toBeVisible();
  await expect(footer).toBeInViewport();
  const viewport = page.viewportSize()!;
  const box = (await footer.boundingBox())!;
  expect(box).not.toBeNull();
  expect(viewport.width).toBeGreaterThan(0);
  // El borde inferior del pie coincide con el borde inferior del viewport.
  expect(Math.abs(box.y + box.height - viewport.height)).toBeLessThanOrEqual(1);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  const metrics = await page.evaluate(() => ({
    scrollY: window.scrollY,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(metrics.scrollY).toBe(0);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
  return footer;
}

test("#502 pie de versión persistente, panel accesible y viewport bajo", async ({
  page,
}) => {
  test.setTimeout(300000);
  mkdirSync(SHOTS, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await login(page);

  // ── Fallback explícito: sin /api/version no se inventa una release ────────
  await page.route("**/api/version", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Saldos", exact: true }),
  ).toBeVisible();
  const toggle = page.locator(".app-version-toggle");
  await expect(toggle).toContainText(
    "Versión no disponible · build de desarrollo",
  );
  await page.unroute("**/api/version");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Saldos", exact: true }),
  ).toBeVisible();

  // ── Identidad servida: misma fuente que /api/version ─────────────────────
  const response = await page.request.get("/api/version");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    app: { version: APP_VERSION, sha: SHORT_SHA, label: "release" },
    environment: "TEST",
    schema: SCHEMA,
  });

  const versionToggle = page.getByRole("button", {
    name: /MyFinanzas · v0\.2\.0/,
  });
  await expect(versionToggle).toBeVisible();
  // #503 — en escritorio el entorno del pie no se pinta: el único indicador es
  // `.sidebar-bottom`, al final de la navegación.
  await expect(page.locator(".app-version-env")).toBeHidden();
  await expect(page.locator(".sidebar-bottom")).toBeVisible();
  await expect(versionToggle).toHaveAttribute("aria-expanded", "false");
  await expectPinnedFooter(page);
  await expect(page.locator(".app-version-panel")).toBeHidden();

  // ── Panel con ratón y con teclado ────────────────────────────────────────
  await versionToggle.click();
  await expect(versionToggle).toHaveAttribute("aria-expanded", "true");
  const panel = page.getByRole("dialog", {
    name: "Información de la aplicación",
  });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Versión de aplicación");
  await expect(panel).toContainText("v0.2.0");
  await expect(panel).toContainText("Entorno");
  await expect(panel).toContainText("TEST");
  await expect(panel).toContainText("SHA corto");
  await expect(panel).toContainText(SHORT_SHA);
  await expect(panel).toContainText("Esquema SQLite");
  await expect(panel).toContainText(`SQLite v${SCHEMA}`);
  await expect(panel).toContainText(
    "no es la versión de la aplicación",
  );
  // El panel no tapa el propio control ni atrapa el foco: `Escape` lo cierra y
  // devuelve el foco al botón.
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(versionToggle).toHaveAttribute("aria-expanded", "false");
  expect(
    await page.evaluate(() => document.activeElement?.className ?? ""),
  ).toContain("app-version-toggle");

  await versionToggle.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  // Un clic fuera también cierra el panel.
  await versionToggle.click();
  await expect(panel).toBeVisible();
  await page
    .getByRole("heading", { name: "Saldos", exact: true })
    .click();
  await expect(panel).toBeHidden();

  // ── Cierre explícito con «×», foco devuelto y clic dentro que no cierra ──
  await versionToggle.click();
  await expect(panel).toBeVisible();
  const closeButton = page.getByRole("button", {
    name: "Cerrar información de la aplicación",
  });
  await expect(closeButton).toBeVisible();
  await expect(closeButton).toHaveText("×");
  const closeBox = (await closeButton.boundingBox())!;
  const closeParent = (await panel.boundingBox())!;
  // Objetivo táctil suficiente y dentro del panel (no recortado por el borde).
  expect(closeBox.width).toBeGreaterThanOrEqual(24);
  expect(closeBox.height).toBeGreaterThanOrEqual(24);
  expect(closeBox.x).toBeGreaterThanOrEqual(closeParent.x);
  expect(closeBox.y).toBeGreaterThanOrEqual(closeParent.y);
  expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(
    closeParent.x + closeParent.width,
  );
  expect(
    await page.evaluate(() => document.activeElement?.className ?? ""),
  ).toContain("app-version-close");
  await panel.click({ position: { x: 8, y: 60 } });
  await expect(panel).toBeVisible();
  await closeButton.click();
  await expect(panel).toBeHidden();
  expect(
    await page.evaluate(() => document.activeElement?.className ?? ""),
  ).toContain("app-version-toggle");

  // ── Sin cadenas sensibles en pantalla ───────────────────────────────────
  const visibleText = await page.locator("body").innerText();
  for (const forbidden of [
    process.cwd(),
    "/Users",
    ".sqlite",
    "auth.key",
    "DATABASE_PATH",
    "AUTH_KEY_PATH",
    "password",
    "Bearer",
    "127.0.0.1:3040",
  ])
    expect(visibleText).not.toContain(forbidden);

  // ── Móvil 390×844 y 390×500: panel separado del pie, sin recortes ───────
  const geometry = () =>
    page.evaluate(() => {
      const panelEl = document.querySelector<HTMLElement>(".app-version-panel")!;
      const footerEl = document.querySelector<HTMLElement>("footer.global-footer")!;
      const p = panelEl.getBoundingClientRect();
      const f = footerEl.getBoundingClientRect();
      return {
        panelTop: p.top,
        panelBottom: p.bottom,
        footerTop: f.top,
        viewport: window.innerHeight,
        scrollHeight: panelEl.scrollHeight,
        clientHeight: panelEl.clientHeight,
        overflowY: getComputedStyle(panelEl).overflowY,
        horizontal: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
  for (const height of [844, 500]) {
    await page.setViewportSize({ width: 390, height });
    await expectPinnedFooter(page);
    await versionToggle.click();
    await expect(panel).toBeVisible();
    const box = await geometry();
    // Separado del pie (no se monta sobre él) y dentro del viewport.
    expect(box.panelBottom, `390x${height}`).toBeLessThanOrEqual(box.footerTop - 1);
    expect(box.panelTop, `390x${height}`).toBeGreaterThanOrEqual(0);
    expect(box.panelBottom, `390x${height}`).toBeLessThanOrEqual(box.viewport);
    expect(box.horizontal, `390x${height}`).toBeLessThanOrEqual(0);
    expect(box.overflowY).toBe("auto");
    // Si no cabe, el panel se desplaza por dentro en lugar de recortarse.
    if (box.scrollHeight > box.clientHeight) {
      const scrolled = await page.evaluate(() => {
        const el = document.querySelector<HTMLElement>(".app-version-panel")!;
        el.scrollTop = el.scrollHeight;
        return el.scrollTop;
      });
      expect(scrolled).toBeGreaterThan(0);
      // Con el panel desplazado hasta el final, el cierre sigue alcanzable.
      await expect(
        page.getByRole("button", {
          name: "Cerrar información de la aplicación",
        }),
      ).toBeInViewport();
      await page.evaluate(() => {
        const el = document.querySelector<HTMLElement>(".app-version-panel")!;
        el.scrollTop = 0;
      });
    }
    await page.screenshot({
      path: `${SHOTS}/panel-390x${height}-abierto.png`,
      fullPage: false,
    });
    // Recorte del panel completo: evidencia de su cabecera, cierre y scroll.
    await panel.screenshot({
      path: `${SHOTS}/panel-elemento-390x${height}.png`,
    });
    // El disparador del pie sigue accesible con el panel abierto.
    await expect(versionToggle).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  }

  // Panel abierto también en Casa a 390×500 (identidad, no solo estructura).
  await page.setViewportSize({ width: 390, height: 500 });
  await page.getByLabel("Apariencia").selectOption({ value: "casa" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "casa");
  await versionToggle.click();
  await expect(panel).toBeVisible();
  const casaBox = await geometry();
  expect(casaBox.panelBottom).toBeLessThanOrEqual(casaBox.footerTop - 1);
  await page.screenshot({
    path: `${SHOTS}/panel-390x500-casa.png`,
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await page.getByLabel("Apariencia").selectOption({ value: "dark-s" });

  // ── 1440 y ventana ancha: el panel se abre junto al disparador ──────────
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expectPinnedFooter(page);
  await expect(versionToggle).toBeVisible();
  for (const width of [1440, 2048]) {
    await page.setViewportSize({ width, height: 1000 });
    await versionToggle.click();
    await expect(panel).toBeVisible();
    const trigger = (await versionToggle.boundingBox())!;
    const opened = (await panel.boundingBox())!;
    // Alineado con el borde izquierdo del disparador y por encima de él.
    expect(Math.abs(opened.x - trigger.x), `ancho ${width}`).toBeLessThanOrEqual(2);
    expect(opened.y + opened.height, `ancho ${width}`).toBeLessThanOrEqual(
      trigger.y - 1,
    );
    // Sin desplazarse al extremo derecho ni salir del viewport.
    expect(opened.x + opened.width, `ancho ${width}`).toBeLessThanOrEqual(width);
    expect(opened.x + opened.width / 2, `ancho ${width}`).toBeLessThan(width / 2);
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await versionToggle.click();
  await expect(panel).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/panel-1440-anclado.png`, fullPage: false });
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.screenshot({
    path: `${SHOTS}/pie-1440.png`,
    fullPage: false,
  });

  // ── Todas las apariencias comparten estructura y contenido ──────────────
  const themeSelect = page.getByLabel("Cambiar tema");
  for (const id of [
    "light-s",
    "hybrid-s",
    "graphite-lime",
    "casa",
    "aurora",
    "dark-s",
  ]) {
    await themeSelect.selectOption({ value: id });
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    await expectPinnedFooter(page);
    await expect(versionToggle).toBeVisible();
    // Misma estructura y contenido en todas: misma identidad de una línea.
    // #503 — el entorno va en su propio nodo y solo se ve en móvil.
    expect(
      (await page.locator(".app-version-label").innerText()).trim(),
    ).toBe("MyFinanzas · v0.2.0");
    await expect(page.locator(".app-version-env")).toBeHidden();
    await versionToggle.click();
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(`SQLite v${SCHEMA}`);
    // Segunda apariencia con el panel abierto: mismo anclaje, otra identidad.
    if (id === "casa")
      await page.screenshot({
        path: `${SHOTS}/panel-1440-casa.png`,
        fullPage: false,
      });
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    const themeOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(themeOverflow.scrollWidth).toBeLessThanOrEqual(
      themeOverflow.innerWidth,
    );
    expect(errors).toEqual([]);
  }
  // Evidencia visual de la apariencia Casa: el recorrido anterior termina en
  // `dark-s`, así que se selecciona Casa de forma explícita antes de capturar.
  await themeSelect.selectOption({ value: "casa" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "casa");
  await expectPinnedFooter(page);
  await page.screenshot({ path: `${SHOTS}/pie-1440-casa.png`, fullPage: false });

  // ── 390 ─────────────────────────────────────────────────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  await expectPinnedFooter(page);
  await expect(versionToggle).toBeVisible();
  // #503 — con el menú móvil cerrado, el pie es el único indicador de entorno.
  await expect(page.locator(".app-version-env")).toBeVisible();
  await expect(page.locator(".app-version-env")).toHaveText("· TEST");
  await expect(page.locator(".sidebar-bottom")).toBeHidden();
  await page.screenshot({
    path: `${SHOTS}/pie-390.png`,
    fullPage: false,
  });
  await versionToggle.click();
  await expect(panel).toBeVisible();
  const panelBox = (await panel.boundingBox())!;
  expect(panelBox.x).toBeGreaterThanOrEqual(0);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(391);
  await page.screenshot({
    path: `${SHOTS}/panel-390.png`,
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();

  // ── Viewport bajo: ningún control importante queda bajo el pie ──────────
  await page.setViewportSize({ width: 390, height: 500 });
  const shortFooter = await expectPinnedFooter(page);
  // Con poca altura el panel sigue abriéndose hacia arriba sin salirse.
  await versionToggle.click();
  await expect(panel).toBeVisible();
  const lowPanel = (await panel.boundingBox())!;
  expect(lowPanel.y).toBeGreaterThanOrEqual(0);
  expect(lowPanel.y + lowPanel.height).toBeLessThanOrEqual(500);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  const cta = page.getByRole("button", { name: /Nuevo Saldo/ });
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page).toHaveURL(/\/saldos\/nuevo$/);
  const submit = page.getByRole("button", { name: "Crear Saldo" });
  await expect(submit).toBeVisible();
  // Al final del documento la acción principal queda por encima del pie: el
  // shell reserva la altura real del pie, así que nada queda tapado. El sondeo
  // repite el desplazamiento hasta que el layout del formulario se estabiliza.
  await expect
    .poll(
      async () => {
        await page.evaluate(() =>
          window.scrollTo(0, document.documentElement.scrollHeight),
        );
        const submitBox = await submit.boundingBox();
        const footerBox = await shortFooter.boundingBox();
        if (!submitBox || !footerBox) return Number.POSITIVE_INFINITY;
        return Math.round(submitBox.y + submitBox.height - footerBox.y);
      },
      { timeout: 10000 },
    )
    .toBeLessThanOrEqual(1);
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
  await page.screenshot({ path: `${SHOTS}/pie-390x500.png`, fullPage: false });

  expect(errors).toEqual([]);
});