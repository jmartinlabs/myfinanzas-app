import { test, expect, type Page } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { totp } from "../../apps/api/src/auth";

/*
 * E4.4 — Deuda completa y conciliación desde apertura.
 *
 * Isolated real Effect/Auth/SQLite process (no fixture endpoint, no MFA bypass),
 * fictional data only, 1440/390 screenshots in artifacts/e4-4. The E1.6 journey
 * in tests/e2e/deudas.ts is preserved and remains the regression entry point.
 *
 * AC-29: this spec covers empty, loading, network error/retry, 401/404/409/422,
 * focus and draft preservation. «Parcial»/«No calculable» remain covered at the
 * contract level by apps/api/src/deuda-completa.test.ts (E4.4 AC-29); the UI
 * preserves those server states without inventing totals. No E2E fixture adds a
 * legacy Deuda without opening because the public API requires it explicitly.
 */

const state = resolve(".local/e2e-deudas-completa");
const origin = "http://127.0.0.1:3013";

// Run from apps/api so the workspace's own Effect/SQLite dependencies resolve;
// the state directory is still the project-root `.local` one.
const serverProgram = [
  "import{mkdirSync,rmSync,writeFileSync}from'node:fs';",
  "import{BunHttpServer,BunRuntime}from'@effect/platform-bun';",
  "import{HttpServer}from'@effect/platform';",
  "import{Layer}from'effect';",
  "import{openDatabase}from'./src/database';",
  "import{loadKey,provision}from'./src/auth';",
  "import{createApp}from'./src/app';",
  "const dir=" +
    JSON.stringify(state) +
    ";",
  "rmSync(dir,{recursive:true,force:true});",
  "mkdirSync(dir,{recursive:true,mode:0o700});",
  "const db=openDatabase(dir+'/demo.sqlite'),key=loadKey(db,dir+'/auth.key');",
  "writeFileSync(dir+'/bootstrap.txt',provision(db),{mode:0o600});",
  "BunRuntime.runMain(Layer.launch(HttpServer.serve(createApp(db,{key})).pipe(Layer.provide(BunHttpServer.layer({hostname:'127.0.0.1',port:3013})))));",
].join("");

async function shot(page: Page, name: string) {
  await page.evaluate(() => scrollTo(0, 0));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/e4-4/" + name + ".png", fullPage: true });
}

test("E4.4 listado, ficha, condiciones, histórico, historia y conciliación 1440/390 sin datos reales", async ({
  page,
  request,
}) => {
  const child = spawn(process.env.BUN_BIN ?? "bun", ["-e", serverProgram], {
    stdio: "pipe",
    cwd: "apps/api",
    env: { ...process.env, NODE_ENV: "test" },
  });
  let serverLog = "";
  child.stderr.on("data", (chunk) => (serverLog += String(chunk)));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  mkdirSync("artifacts/e4-4", { recursive: true });
  try {
    try {
      await expect
        .poll(
          async () => {
            try {
              return (await request.get(origin + "/api/health")).status();
            } catch {
              return 0;
            }
          },
          { timeout: 20000 },
        )
        .toBe(200);
    } catch (e) {
      throw new Error("API E4.4 no arrancó. " + serverLog + " " + String(e));
    }
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3013";
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });

    const call = (
      path: string,
      method = "GET",
      body?: Record<string, unknown>,
    ) =>
      page.evaluate(
        async ({ path, method, body }) => {
          const session = await (await fetch("/api/auth/session")).json();
          const headers: Record<string, string> = {};
          if (method !== "GET") {
            headers["content-type"] = "application/json";
            headers["x-csrf-token"] = session.csrf;
            headers["idempotency-key"] = crypto.randomUUID();
          }
          const response = await fetch("/api" + path, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
          });
          return { status: response.status, data: await response.json() };
        },
        { path, method, body },
      );

    // Real MFA access.
    await page.goto("/deudas");
    await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
    await page
      .getByLabel("Código de activación")
      .fill(readFileSync(state + "/bootstrap.txt", "utf8"));
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("Clave ficticia E4.4 " + randomUUID());
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
    await page.goto("/deudas");

    // Empty listing at both widths.
    await expect(
      page.getByRole("heading", { name: "Sin deudas que mostrar", exact: true }),
    ).toBeVisible();
    await shot(page, "listado-vacio-1440");
    await page.setViewportSize({ width: 390, height: 844 });
    await shot(page, "listado-vacio-390");
    await page.setViewportSize({ width: 1440, height: 1000 });

    // Alta con validación, tipo y condiciones.
    await page.getByRole("button", { name: "Nueva deuda", exact: true }).first().click();
    await page
      .getByRole("button", { name: "Guardar deuda", exact: true })
      .click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page
      .getByLabel("Nombre de Deuda *", { exact: true })
      .fill("Préstamo ficticio E4.4");
    await page.getByLabel("Inicio control *", { exact: true }).fill("2026-10-01");
    await page
      .getByLabel("Capital apertura EUR *", { exact: true })
      .fill("1000");
    await page
      .getByLabel(/Tipo de Deuda/)
      .selectOption("No hipotecaria");
    await page.getByLabel("TIN %", { exact: true }).fill("2.5");
    await page.getByLabel("TAE %", { exact: true }).fill("2.8");
    await page
      .getByLabel("Cuota contractual EUR", { exact: true })
      .fill("100");
    await page
      .getByLabel("Condiciones informativas", { exact: true })
      .fill("Condiciones ficticias informativas");
    await shot(page, "formulario-1440");
    await page.setViewportSize({ width: 390, height: 844 });
    await shot(page, "formulario-390");
    await page.setViewportSize({ width: 1440, height: 1000 });
    // Alta: un fallo de red al guardar no ofrece «Reintentar» —el botón solo
    // existe para cargas— ni vacía el borrador.
    await page.route("**/api/deudas", (route) =>
      route.request().method() === "POST"
        ? route.abort("failed")
        : route.fallback(),
    );
    await page
      .getByRole("button", { name: "Guardar deuda", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "No se pudo conectar",
    );
    await expect(
      page.getByRole("button", { name: "Reintentar", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel("Nombre de Deuda *", { exact: true }),
    ).toHaveValue("Préstamo ficticio E4.4");
    await expect(
      page.getByLabel("Capital apertura EUR *", { exact: true }),
    ).toHaveValue("1000");
    await page.unroute("**/api/deudas");
    await page
      .getByRole("button", { name: "Guardar deuda", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Préstamo ficticio E4.4",
        exact: true,
      }),
    ).toBeVisible();
    const id = page.url().split("/").at(-1)!;
    expect(id).toMatch(/^D\d+$/);

    // Fictional executed history through the real movement pipeline.
    const category = (
      await call("/clasificacion/categorias", "POST", {
        nombre: "Deuda E4.4",
        anual: "Gasto",
        mensual: "Gasto",
        referencia: false,
      })
    ).data.item;
    const subcategory = (
      await call("/clasificacion/subcategorias", "POST", {
        nombre: "Cuotas E4.4",
        padre: category.id,
      })
    ).data.item;
    const partida = (
      await call("/clasificacion/partidas", "POST", {
        nombre: "Cuota E4.4",
        padre: subcategory.id,
        deuda: id,
      })
    ).data.item;
    const bank = (
      await call("/saldos", "POST", {
        nombre: "Banco E4.4",
        tipo: "Efectivo",
        control: "Movimientos",
        saldoApertura: "500",
        fechaApertura: "2026-10-20",
        permiteSalidaExterior: true,
      })
    ).data.saldo;
    const movement = async (input: Record<string, unknown>) => {
      const preview = await call("/movimientos/impacto", "POST", input);
      expect(preview.status).toBe(200);
      const written = await call("/movimientos", "POST", {
        ...input,
        fingerprint: preview.data.fingerprint,
      });
      expect(written.status).toBe(201);
      return written.data.movimiento.id as string;
    };
    await movement({
      tipo: "Gasto",
      fecha: "2026-09-30",
      importe: "70",
      saldo: bank.id,
      partida: partida.id,
      concepto: "Cuota precontrol ficticia",
      nota: "",
      capital: "50",
      intereses: "20",
    });
    await movement({
      tipo: "Gasto",
      fecha: "2026-10-01",
      importe: "100",
      saldo: bank.id,
      partida: partida.id,
      concepto: "Cuota ficticia",
      nota: "",
      capital: "80",
      intereses: "20",
    });
    await movement({
      tipo: "Amortización deuda",
      fecha: "2026-10-15",
      importe: "200",
      saldo: bank.id,
      partida: partida.id,
      concepto: "Extraordinaria ficticia",
      nota: "",
    });
    // R5 historical fields are read-only in E4.4; seed the fictional source
    // directly in the isolated database, never through a write endpoint.
    execFileSync(process.env.BUN_BIN ?? "bun", [
      "-e",
      [
        "import{Database}from'bun:sqlite';",
        "const db=new Database(" + JSON.stringify(state + "/demo.sqlite") + ");",
        "db.run('UPDATE deudas SET capital_inicial=?,capital_amortizado_historico=?,amortizacion_extra_historica=?,capital_historico_cuotas=?,intereses_historicos=?,total_pagado_historico=?,precontrol_ejercicio=?,precontrol_cuotas=?,precontrol_capital=?,precontrol_amortizacion_extra=? WHERE id=?',[120000,20000,0,120000,30000,150000,2026,3,5000,0," +
          JSON.stringify(id) +
          "]);db.close();",
      ].join(""),
    ]);

    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Préstamo ficticio E4.4",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("720,00 €", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("280,00 €", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Condiciones informativas \(3\)/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Histórico R5 \(6\)/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Historia ejecutada \(3\)/ }),
    ).toBeVisible();
    await expect(page.getByText("2,50 %", { exact: true })).toBeVisible();
    await expect(page.getByText("2,80 %", { exact: true })).toBeVisible();
    await expect(page.getByText("Total pagado histórico")).toBeVisible();
    await expect(
      page.getByText(/Comprobación histórica:\s*Consistente/),
    ).toBeVisible();
    await expect(page.getByText(/Totales desde control: capital 280,00/)).toBeVisible();
    await shot(page, "ficha-1440");

    // Inclusive historical cut-off.
    await page.getByLabel("Corte histórico", { exact: true }).fill("2026-10-01");
    await page.getByRole("button", { name: "Aplicar corte", exact: true }).click();
    await expect(page.getByText("920,00 €", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Excluidos por corte/)).toBeVisible();
    await page.getByRole("button", { name: "Todos los hechos", exact: true }).click();
    await expect(page.getByText("720,00 €", { exact: true }).first()).toBeVisible();

    // Future cut-off is rejected without inventing a value.
    await page.getByLabel("Corte histórico", { exact: true }).fill("2099-01-01");
    await page.getByRole("button", { name: "Aplicar corte", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("fecha futura");
    await expect(page.locator("#debt-corte")).toBeFocused();
    await shot(page, "corte-422-1440");
    await page.getByRole("button", { name: "Todos los hechos", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);

    // 390: stacked cards, complete sections, keyboard, visible focus.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Préstamo ficticio E4.4",
        exact: true,
      }),
    ).toBeVisible();
    const control = page.getByRole("button", { name: "Control y capital" });
    const conditions = page.getByRole("button", {
      name: /Condiciones informativas \(3\)/,
    });
    await expect(control).toHaveAttribute("aria-expanded", "true");
    await expect(conditions).toHaveAttribute("aria-expanded", "false");
    await conditions.focus();
    await expect(conditions).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(conditions).toHaveAttribute("aria-expanded", "true");
    await shot(page, "ficha-390");
    await page.keyboard.press("Space");
    await expect(conditions).toHaveAttribute("aria-expanded", "false");
    await conditions.click();
    await expect(page.getByText("Condiciones ficticias informativas")).toBeVisible();
    await page
      .getByRole("button", { name: /Historia ejecutada \(3\)/ })
      .click();
    await expect(
      page
        .locator(".e44-history-mobile")
        .getByText("Amortización deuda", { exact: false })
        .first(),
    ).toBeVisible();
    await shot(page, "historia-390");

    // Reconcile from opening: exact signed difference.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByRole("button", { name: /Conciliación desde apertura \(0\)/ })
      .click();
    await page
      .getByRole("button", { name: "Nueva conciliación", exact: true })
      .click();
    await page.getByLabel("Fecha de corte *", { exact: true }).fill("2026-10-20");
    await page
      .getByLabel("Capital declarado EUR *", { exact: true })
      .fill("750");
    await page.getByLabel("Fuente", { exact: true }).fill("Banco ficticio");
    await page.getByLabel("Nota", { exact: true }).fill("Extracto ficticio");
    await page
      .getByRole("button", { name: "Registrar declarado", exact: true })
      .click();
    await expect(page.getByText("+30,00 €", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("720,00 €", { exact: true }).first()).toBeVisible();
    await shot(page, "conciliacion-1440");

    // Duplicate vigente for the same Deuda/date: 409 keeps the draft.
    await page
      .getByRole("button", { name: "Nueva conciliación", exact: true })
      .click();
    await page.getByLabel("Fecha de corte *", { exact: true }).fill("2026-10-20");
    await page
      .getByLabel("Capital declarado EUR *", { exact: true })
      .fill("700");
    await page
      .getByRole("button", { name: "Registrar declarado", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Ya existe una conciliación vigente",
    );
    await expect(
      page.getByLabel("Capital declarado EUR *", { exact: true }),
    ).toHaveValue("700");
    await shot(page, "conciliacion-409-1440");
    await page
      .getByRole("button", { name: "Cancelar", exact: true })
      .last()
      .click();

    // 422 on conciliation: empty capital focuses its field; malformed amount
    // has no field metadata from the API, so the actionable alert takes focus
    // and the entered draft is preserved.
    await page
      .getByRole("button", { name: "Nueva conciliación", exact: true })
      .click();
    await page.getByLabel("Fecha de corte *", { exact: true }).fill("2026-10-21");
    await page
      .getByRole("button", { name: "Registrar declarado", exact: true })
      .click();
    await expect(
      page.locator("#debt-conc-capitalDeclarado-error"),
    ).toContainText("sin redondear");
    await expect(page.locator("#debt-capitalDeclarado")).toBeFocused();
    await page.locator("#debt-capitalDeclarado").fill("abc");
    await page
      .getByRole("button", { name: "Registrar declarado", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Importe EUR inválido",
    );
    await expect(page.locator(".focus-alert")).toBeFocused();
    await expect(page.locator("#debt-capitalDeclarado")).toHaveValue("abc");
    await page
      .getByRole("button", { name: "Cancelar", exact: true })
      .last()
      .click();

    // Network failure on conciliation keeps the declared draft.
    await page
      .getByRole("button", { name: "Nueva conciliación", exact: true })
      .click();
    await page.getByLabel("Fecha de corte *", { exact: true }).fill("2026-10-22");
    await page
      .getByLabel("Capital declarado EUR *", { exact: true })
      .fill("725");
    await page.getByLabel("Fuente", { exact: true }).fill("Banco ficticio red");
    await page.route(
      "**/api/deudas/" + id + "/conciliaciones",
      (route) => route.abort("failed"),
    );
    await page
      .getByRole("button", { name: "Registrar declarado", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "No se pudo conectar",
    );
    await expect(
      page.getByLabel("Capital declarado EUR *", { exact: true }),
    ).toHaveValue("725");
    await expect(page.getByLabel("Fuente", { exact: true })).toHaveValue(
      "Banco ficticio red",
    );
    await page.unroute("**/api/deudas/" + id + "/conciliaciones");
    await page
      .getByRole("button", { name: "Cancelar", exact: true })
      .last()
      .click();

    // A second date marks the listing as `Varias`.
    const second = await call("/deudas/" + id + "/conciliaciones", "POST", {
      fechaCorte: "2026-10-15",
      capitalDeclarado: "730",
      fuente: "Banco ficticio",
      nota: "Extracto ficticio anterior",
    });
    expect(second.status).toBe(201);
    await page.reload();
    await expect(
      page.getByRole("button", { name: /Conciliación desde apertura \(2\)/ }),
    ).toContainText("Varias");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page
      .getByRole("button", { name: /Conciliación desde apertura \(2\)/ })
      .click();
    await expect(page.getByText("+10,00 €", { exact: true }).first()).toBeVisible();
    await shot(page, "conciliacion-390");

    // Listing at both widths with vigente + Varias.
    await page.goto("/deudas");
    await expect(
      page
        .locator(".debt-cards")
        .getByRole("link", { name: "Préstamo ficticio E4.4" }),
    ).toBeVisible();
    await expect(page.locator(".debt-cards")).toContainText("+30,00 €");
    await expect(page.locator(".debt-cards")).toContainText("Varias");
    await shot(page, "listado-390");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.locator(".debt-list")).toContainText("No hipotecaria");
    await expect(page.locator(".debt-list")).toContainText("+30,00 €");
    await expect(page.locator(".debt-list")).toContainText("Varias");
    await shot(page, "listado-1440");

    // Correct then annul: audit requires revision + motive, no DELETE.
    await page
      .locator(".debt-list")
      .getByRole("link", { name: "Préstamo ficticio E4.4" })
      .click();
    const latest = page
      .locator(".e44-conciliation")
      .filter({ hasText: "20/10/2026" })
      .first();
    await latest
      .getByRole("button", { name: "Corregir declarado", exact: true })
      .click();
    await latest
      .getByLabel("Capital declarado EUR *", { exact: true })
      .fill("720");
    await latest
      .getByLabel("Motivo de la corrección *", { exact: true })
      .fill("Ajuste ficticio de prueba");
    await latest
      .getByRole("button", { name: "Guardar corrección", exact: true })
      .click();
    await expect(latest).toContainText("Conciliado");
    await latest.getByRole("button", { name: "Anular", exact: true }).click();
    await latest
      .getByLabel("Motivo de la anulación *", { exact: true })
      .fill("Anulación ficticia de prueba");
    await latest
      .getByRole("button", { name: "Confirmar anulación", exact: true })
      .click();
    await expect(latest).toContainText("Anulada");
    await expect(latest).toContainText("0,00 €");
    await shot(page, "conciliacion-anulada-1440");

    // 404 keeps a distinct state and never creates an empty entity.
    await page.goto("/deudas/D999");
    await expect(page.getByRole("alert")).toContainText(
      "Deuda no encontrada",
    );
    await shot(page, "deuda-404-1440");

    // Listing loading and error/retry states, with the real request resumed.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/deudas?*", async (route) => {
      await gate;
      await route.fallback();
    });
    await page.goto("/deudas");
    await expect(
      page.getByRole("status", { name: "Cargando Deudas…" }),
    ).toHaveAttribute("aria-busy", "true");
    await shot(page, "listado-cargando-1440");
    release();
    await expect(page.locator(".debt-list tbody tr")).toHaveCount(1);
    await page.unroute("**/api/deudas?*");
    await page.route("**/api/deudas?*", (route) =>
      route.fulfill({
        status: 500,
        json: { error: "Error ficticio de lectura E4.4." },
      }),
    );
    await page.reload();
    await expect(page.getByRole("alert")).toContainText(
      "Error ficticio de lectura E4.4.",
    );
    await expect(page.locator(".focus-alert")).toBeFocused();
    await shot(page, "listado-error-1440");
    await page.unroute("**/api/deudas?*");
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(page.locator(".debt-list tbody tr")).toHaveCount(1);

    // AC-29: a real network failure (not only HTTP 500) keeps retry available.
    await page.route("**/api/deudas?*", (route) => route.abort("failed"));
    await page.reload();
    await expect(page.getByRole("alert")).toContainText("No se pudo conectar");
    await expect(
      page.getByRole("button", { name: "Reintentar", exact: true }),
    ).toBeVisible();
    await page.unroute("**/api/deudas?*");
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(page.locator(".debt-list tbody tr")).toHaveCount(1);

    // Inactivate/reactivate requires a motive and keeps history.
    await page
      .locator(".debt-list")
      .getByRole("link", { name: "Préstamo ficticio E4.4" })
      .click();
    await page
      .getByRole("button", { name: "Desactivar deuda", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar desactivar", exact: true })
      .click();
    await expect(page.getByText("Indica el motivo del cambio de Estado.")).toBeVisible();
    await page
      .getByLabel(/Motivo del cambio \*/)
      .fill("Desactivación ficticia de prueba");
    await page
      .getByRole("button", { name: "Confirmar desactivar", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Reactivar deuda", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Reactivar deuda", exact: true })
      .click();
    await page
      .getByLabel(/Motivo del cambio \*/)
      .fill("Reactivación ficticia de prueba");
    await page
      .getByRole("button", { name: "Confirmar reactivar", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Desactivar deuda", exact: true }),
    ).toBeVisible();

    // AC-29: ficha and form use a reserved skeleton with role=status/aria-busy.
    let releaseDetail!: () => void;
    const detailGate = new Promise<void>((resolve) => {
      releaseDetail = resolve;
    });
    await page.route("**/api/deudas/" + id, async (route) => {
      await detailGate;
      await route.fallback();
    });
    await page.goto("/deudas/" + id);
    await expect(
      page.getByRole("status", { name: "Cargando Deuda…" }),
    ).toHaveAttribute("aria-busy", "true");
    await shot(page, "ficha-cargando-1440");
    releaseDetail();
    await expect(
      page.getByRole("heading", {
        name: "Préstamo ficticio E4.4",
        exact: true,
      }),
    ).toBeVisible();
    await page.unroute("**/api/deudas/" + id);

    let releaseEdit!: () => void;
    const editGate = new Promise<void>((resolve) => {
      releaseEdit = resolve;
    });
    await page.route("**/api/deudas/" + id, async (route) => {
      await editGate;
      await route.fallback();
    });
    await page.goto("/deudas/" + id + "/editar");
    await expect(
      page.getByRole("status", { name: "Cargando Deuda…" }),
    ).toHaveAttribute("aria-busy", "true");
    await shot(page, "formulario-cargando-1440");
    releaseEdit();
    await expect(
      page.locator("#debt-nombre"),
    ).toHaveValue("Préstamo ficticio E4.4");
    await page.unroute("**/api/deudas/" + id);

    // AC-29: network failure loading the edit form exposes retry, no empty form.
    await page.route("**/api/deudas/" + id, (route) =>
      route.abort("failed"),
    );
    await page.goto("/deudas/" + id + "/editar");
    await expect(page.locator(".focus-alert")).toContainText(
      "No se pudo conectar",
    );
    await expect(page.locator(".focus-alert")).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Reintentar", exact: true }),
    ).toBeVisible();
    await shot(page, "formulario-error-red-1440");
    await page.unroute("**/api/deudas/" + id);
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(
      page.locator("#debt-nombre"),
    ).toHaveValue("Préstamo ficticio E4.4");

    // AC-29: 422 focuses the first invalid field and keeps the draft.
    await page.locator("#debt-tin").fill("abc");
    await page
      .getByRole("button", { name: "Guardar deuda", exact: true })
      .click();
    await expect(page.locator("#debt-tin-error")).toContainText(
      "tasa decimal",
    );
    await expect(page.locator("#debt-tin")).toBeFocused();
    await expect(page.locator("#debt-tin")).toHaveValue("abc");
    await shot(page, "formulario-422-1440");
    await page.locator("#debt-tin").fill("3.1");

    // AC-29: a network failure on save keeps every entered value.
    await page
      .getByLabel("Nombre de Deuda *", { exact: true })
      .fill("Préstamo ficticio E4.4 editado");
    await page
      .getByLabel("Motivo del cambio", { exact: true })
      .fill("Motivo ficticio AC29");
    await page.route("**/api/deudas/" + id, (route) =>
      route.abort("failed"),
    );
    await page
      .getByRole("button", { name: "Guardar deuda", exact: true })
      .click();
    await expect(page.locator(".focus-alert")).toContainText(
      "Tus datos siguen en el formulario",
    );
    await expect(
      page.locator("#debt-nombre"),
    ).toHaveValue("Préstamo ficticio E4.4 editado");
    await expect(page.locator("#debt-tin")).toHaveValue("3.1");
    await expect(
      page.locator("#debt-motivo"),
    ).toHaveValue("Motivo ficticio AC29");
    await page.unroute("**/api/deudas/" + id);

    // AC-29: 409 keeps the draft; context refresh must not overwrite it.
    const current = (await call("/deudas/" + id)).data.item;
    const external = await call("/deudas/" + id, "PATCH", {
      revision: current.revision,
      nombre: "Nombre externo ficticio AC29",
    });
    expect(external.status).toBe(200);
    await page
      .getByRole("button", { name: "Guardar deuda", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "La Deuda ha cambiado",
    );
    await expect(
      page.getByRole("button", { name: "Actualizar contexto", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("#debt-nombre"),
    ).toHaveValue("Préstamo ficticio E4.4 editado");
    await shot(page, "formulario-409-1440");
    const refreshed = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/deudas/" + id &&
        response.status() === 200,
    );
    await page
      .getByRole("button", { name: "Actualizar contexto", exact: true })
      .click();
    await refreshed;
    await expect(
      page.locator("#debt-nombre"),
    ).toHaveValue("Préstamo ficticio E4.4 editado");
    await expect(page.locator("#debt-tin")).toHaveValue("3.1");
    await expect(
      page.locator("#debt-motivo"),
    ).toHaveValue("Motivo ficticio AC29");
    await page
      .getByRole("button", { name: "Guardar deuda", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Préstamo ficticio E4.4 editado",
        exact: true,
      }),
    ).toBeVisible();

    // AC-29: 401 shows a session message without exposing the draft values.
    await page.goto("/deudas/" + id + "/editar");
    await expect(
      page.locator("#debt-nombre"),
    ).toHaveValue("Préstamo ficticio E4.4 editado");
    await page
      .getByLabel("Nombre de Deuda *", { exact: true })
      .fill("Borrador 401 ficticio");
    await page.route("**/api/deudas/" + id, (route) =>
      route.fulfill({
        status: 401,
        json: { error: "Sesión no válida." },
      }),
    );
    await page
      .getByRole("button", { name: "Guardar deuda", exact: true })
      .click();
    await expect(page.locator(".focus-alert")).toContainText(
      "La sesión ha caducado",
    );
    await expect(page.locator(".focus-alert")).not.toContainText(
      "Borrador 401 ficticio",
    );
    await expect(
      page.locator("#debt-nombre"),
    ).toHaveValue("Borrador 401 ficticio");
    await expect(
      page.getByText("La sesión ha caducado. Copia cualquier borrador", {
        exact: false,
      }),
    ).toBeVisible();
    await page.unroute("**/api/deudas/" + id);

    // AC-29: 401 on conciliation keeps the declared draft and exposes no values.
    await page.goto("/deudas/" + id);
    await expect(
      page.getByRole("heading", {
        name: "Préstamo ficticio E4.4 editado",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Nueva conciliación", exact: true })
      .click();
    await page.getByLabel("Fecha de corte *", { exact: true }).fill("2026-10-23");
    await page
      .getByLabel("Capital declarado EUR *", { exact: true })
      .fill("999");
    await page.getByLabel("Fuente", { exact: true }).fill("Banco ficticio 401");
    await page.route(
      "**/api/deudas/" + id + "/conciliaciones",
      (route) =>
        route.fulfill({
          status: 401,
          json: { error: "Sesión no válida." },
        }),
    );
    await page
      .getByRole("button", { name: "Registrar declarado", exact: true })
      .click();
    await expect(page.locator(".focus-alert")).toContainText(
      "La sesión ha caducado",
    );
    await expect(page.locator(".focus-alert")).not.toContainText("999");
    await expect(page.locator("#debt-capitalDeclarado")).toHaveValue("999");
    await expect(page.getByLabel("Fuente", { exact: true })).toHaveValue(
      "Banco ficticio 401",
    );
    await expect(
      page.getByText("La sesión ha caducado. Copia cualquier borrador", {
        exact: false,
      }),
    ).toBeVisible();
    await page.unroute("**/api/deudas/" + id + "/conciliaciones");

    expect(errors).toEqual([]);
  } finally {
    child.kill("SIGTERM");
  }
});
