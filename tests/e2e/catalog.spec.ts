import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { totp } from "../../apps/api/src/auth";

test("E1.1: acceso real, altas/ediciones/estados, errores y restauración responsive", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const password = "Contraseña ficticia de navegador " + randomUUID();
  mkdirSync("artifacts/e1-1", { recursive: true });
  const shot = async (name: string) => {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/e1-1/${name}.png`,
      fullPage: true,
    });
  };
  expect((await request.get("/api/saldos")).status()).toBe(401);
  await page.goto("/saldos");
  await page
    .getByLabel("Token de configuración local")
    .fill(readFileSync(".local/e2e/bootstrap.txt", "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".secret")).toBeVisible();
  const secret = (await page.locator(".secret").textContent())!;
  await page
    .getByLabel("Código de la aplicación autenticadora")
    .fill(totp(secret).generate());
  await page.getByRole("button", { name: "Verificar código" }).click();
  await expect(page.locator(".recovery-codes code")).toHaveCount(10);
  await page
    .getByRole("button", { name: "He guardado los códigos · Continuar" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saldos", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(5);
  await expect(page.getByText("No disponible", { exact: true })).toBeVisible();
  const skip = page.getByRole("link", { name: "Saltar al contenido" });
  await skip.focus();
  await expect(skip).toHaveCSS("opacity", "1");
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await expect(skip).toHaveCSS("opacity", "0");
  await page.getByRole("heading", { name: "Saldos", exact: true }).focus();
  await shot("list-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    ),
  ).toBe("light");
  await expect(page.locator(".desktop-list")).toBeHidden();
  await expect(page.locator(".mobile-list li")).toHaveCount(5);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar menú" }).click();
  await shot("list-mobile");
  await page.getByRole("button", { name: "Nuevo Saldo" }).click();
  await expect(
    page.getByRole("heading", { name: "Nuevo Saldo", exact: true }),
  ).toBeVisible();
  for (const name of [
    "Liquidez",
    "Mostrar como bolsa",
    "Permite salida a Exterior",
  ])
    await expect(
      page.getByRole("switch", { name, exact: true }),
    ).toHaveAttribute("aria-checked", "false");
  for (const name of [
    "Liquidez",
    "Mostrar como bolsa",
    "Permite salida a Exterior",
  ]) {
    const sw = page.getByRole("switch", { name, exact: true });
    await sw.focus();
    await page.keyboard.press("Space");
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Space");
    await expect(sw).toHaveAttribute("aria-checked", "false");
  }
  await shot("form-mobile");
  await page.getByRole("button", { name: "Crear Saldo", exact: true }).click();
  await expect(
    page.getByText("Indica un nombre sin caracteres de control."),
  ).toBeVisible();
  await shot("validation-mobile");
  await page
    .getByLabel("Nombre *", { exact: true })
    .fill("Reserva ficticia E1.1");
  await page.getByLabel("Saldo apertura (€)").fill("-123,45");
  await page.getByLabel("Fecha apertura").fill("2026-04-12");
  const liquidity = page.getByRole("switch", { name: "Liquidez", exact: true });
  await liquidity.focus();
  await page.keyboard.press("Space");
  await expect(liquidity).toHaveAttribute("aria-checked", "true");
  await expect(liquidity).toBeFocused();
  await expect(liquidity).toHaveCSS("outline-style", "solid");
  await expect(liquidity).toHaveCSS("background-color", "rgb(141, 187, 46)");
  await page.getByRole("button", { name: "Crear Saldo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reserva ficticia E1.1", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("-123,45 €", { exact: true })).toBeVisible();
  await shot("detail-mobile");
  const id = page.url().split("/").at(-1)!;
  expect(id).toBe("S006");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("detail-desktop");
  await page.getByRole("button", { name: "Editar Saldo" }).click();
  await expect(
    page.getByRole("heading", { name: "Editar Saldo", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "Liquidez", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await shot("form-desktop");
  await page.getByLabel("Objetivo (€)").fill("0");
  await page
    .getByRole("switch", { name: "Mostrar como bolsa", exact: true })
    .click();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("0,00 €", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Desactivar Saldo", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar desactivar" }).click();
  await expect(
    page.locator(".page-head").getByText("Inactiva", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Volver a Saldos" }).click();
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(5);
  await page.getByLabel("Estado", { exact: true }).selectOption("Inactiva");
  await expect(
    page
      .locator(".desktop-list")
      .getByRole("link", { name: "Reserva ficticia E1.1" }),
  ).toBeVisible();
  await page
    .locator(".desktop-list")
    .getByRole("link", { name: "Reserva ficticia E1.1" })
    .click();
  await page
    .getByRole("button", { name: "Reactivar Saldo", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar reactivar" }).click();
  await expect(
    page.locator(".page-head").getByText("Activa", { exact: true }),
  ).toBeVisible();
  // Real second client edit: the browser must retain the conflicting draft.
  await page.getByRole("button", { name: "Editar Saldo" }).click();
  await page
    .getByLabel("Nombre *", { exact: true })
    .fill("Borrador conservado");
  await page.evaluate(async (id) => {
    const session = await (await fetch("/api/auth/session")).json();
    const s = (await (await fetch("/api/saldos/" + id)).json()).saldo;
    await fetch("/api/saldos/" + id, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": session.csrf,
      },
      body: JSON.stringify({
        revision: s.revision,
        nombre: "Reserva ficticia E1.1",
      }),
    });
  }, id);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("alert")).toContainText("borrador se conserva");
  await expect(page.getByLabel("Nombre *", { exact: true })).toHaveValue(
    "Borrador conservado",
  );
  await shot("conflict-desktop");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("link", { name: "Volver a Saldos" }).click();
  // Deterministic latency/error fixtures only for transient UI states, never for successful domain writes.
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  await page.route("**/api/saldos?*", async (route) => {
    await gate;
    await route.fulfill({ json: { saldos: [], total: 0, page: 1 } });
  });
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("Cargando Saldos…");
  await shot("loading-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("loading-mobile");
  release();
  await expect(
    page.getByRole("heading", { name: "Sin resultados" }),
  ).toBeVisible();
  await shot("empty-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("empty-desktop");
  await page.unroute("**/api/saldos?*");
  await page.route("**/api/saldos?*", (route) =>
    route.fulfill({
      status: 500,
      json: { error: "Error de prueba sin datos internos." },
    }),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Error de prueba");
  await shot("error-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("error-mobile");
  await page.unroute("**/api/saldos?*");
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.locator(".mobile-list li")).toHaveCount(6);
  await page.getByLabel("Incluir técnico S000").check();
  await page
    .locator(".mobile-list")
    .getByRole("link", { name: "Exterior técnico" })
    .click();
  await expect(page.getByRole("button", { name: "Editar Saldo" })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Contraparte técnica protegida.", { exact: false }),
  ).toBeVisible();
  // Future-import absence is an isolated fictitious fixture, not a new import feature.
  execFileSync(process.env.BUN_BIN ?? "bun", [
    "-e",
    `import{Database}from'bun:sqlite';const db=new Database('.local/e2e/demo.sqlite');db.run("UPDATE saldos SET liquidez=NULL WHERE id='S001'");db.close();`,
  ]);
  await page.goto("/saldos/S001/editar");
  await expect(
    page.getByRole("button", {
      name: "Informar Liquidez como No",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "Liquidez", exact: true }),
  ).toHaveCount(0);
  await shot("absence-mobile");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Editar Saldo" }).click();
  await page
    .getByLabel("Nombre *", { exact: true })
    .fill("Cuenta cotidiana demo");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  expect(
    await page.evaluate(
      async () =>
        (await (await fetch("/api/saldos/S001")).json()).saldo.liquidez,
    ),
  ).toBeNull();
  await page.getByRole("button", { name: "Editar Saldo" }).click();
  await page
    .getByRole("button", { name: "Informar Liquidez como No", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "Liquidez", exact: true }),
  ).toHaveAttribute("aria-checked", "false");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  expect(
    await page.evaluate(
      async () =>
        (await (await fetch("/api/saldos/S001")).json()).saldo.liquidez,
    ),
  ).toBe(false);
  // Actual encrypted snapshot of the running WAL database, isolated restoration + second Effect server.
  const restoreStarted = Date.now();
  const bun = process.env.BUN_BIN ?? "bun";
  const restored = spawn(bun, ["apps/api/test-support/restore-server.ts"], {
    stdio: "pipe",
    env: process.env,
  });
  try {
    await expect
      .poll(
        async () => {
          try {
            return (
              await request.get("http://127.0.0.1:3002/api/health")
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 20000 },
      )
      .toBe(200);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3002";
      const response = await route.fetch({ url: url.toString() });
      await route.fulfill({ response });
    });
    await page.goto("/saldos");
    await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    // Reject TOTP replay after restore too; use next admissible 30s step, never bypass MFA.
    const next = totp(secret).generate({ timestamp: Date.now() + 30000 });
    await page.getByLabel("Código de la aplicación autenticadora").fill(next);
    await page.getByRole("button", { name: "Verificar código" }).click();
    await expect(page.locator(".recovery-codes code")).toHaveCount(10);
    await page
      .getByRole("button", { name: "He guardado los códigos · Continuar" })
      .click();
    await page
      .locator(".mobile-list")
      .getByRole("link", { name: "Reserva ficticia E1.1" })
      .click();
    await expect(page.getByText("-123,45 €", { exact: true })).toBeVisible();
    await expect(page.getByText("0,00 €", { exact: true })).toBeVisible();
    await shot("restored-mobile");
    console.log(
      `Ensayo local de restauración + MFA + lectura UI: ${Date.now() - restoreStarted} ms (ficticio; no SLA).`,
    );
  } finally {
    restored.kill("SIGTERM");
    await page.unroute("**/api/**");
  }
  // Contrast of the actual shared palette pairs (not a full WCAG/reader audit).
  const ratio = (a: string, b: string) => {
    const lum = (hex: string) => {
      const n = hex
        .match(/../g)!
        .map((c) => parseInt(c, 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return n[0] * 0.2126 + n[1] * 0.7152 + n[2] * 0.0722;
    };
    const x = lum(a),
      y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  for (const [fg, bg] of [
    ["2B2B2B", "ffffff"],
    ["536147", "ffffff"],
    ["536147", "EEF7E8"],
    ["24320e", "8DBB2E"],
    ["253b0d", "DCECB3"],
  ])
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  expect(errors).toEqual([]);
});
