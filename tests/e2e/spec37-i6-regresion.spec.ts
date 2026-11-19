import { test, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
import { artifactDir, fixtureContext } from "./fixture";

/**
 * SPEC37 · I6 — regresión E2E de los casos base.
 *
 * Recorrido real con servidor aislado (puerto y estado propios de la ejecución),
 * MFA real y SQLite:
 *
 *  - AC-01: un Gasto normal es un único hecho, sin Transferencia, pendiente ni
 *    alerta (la bandeja queda en 0 y la lista no marca nada).
 *  - AC-02: la modalidad A sin Transferencia se registra por el formulario
 *    ordinario, desde Cuenta 2, sin crear pendiente y sin tocar Cuenta 1.
 *  - AC-19: cancelar el formulario coordinado no escribe Gasto, Transferencia
 *    ni pendiente.
 *
 * Las capturas se toman a 1440 y 390 y comprueban que no hay scroll horizontal.
 * Todo ficticio: sin datos reales y sin Excel.
 */

// Puerto y estado propios de la ejecución (#508): dos runs de esta spec no
// comparten listener ni base. El fixture conserva 3030/`.local/e2e-spec37-i6`
// como defaults para arranque manual.
const fixture = fixtureContext("spec37-i6");
const PORT = fixture.port;
const DIR = fixture.dir;
const artifacts = artifactDir("spec37-i6");
let child: ChildProcess | undefined;
/** Salida del fixture: el pipe se lee siempre y se muestra si algo falla. */
let fixtureOutput = "";
let fixtureExit: { code: number | null; signal: NodeJS.Signals | null } | null =
  null;

function fixtureFailure(): string {
  const detail = fixtureOutput.trim() || "(sin stderr)";
  const how = fixtureExit
    ? `código ${fixtureExit.code ?? "null"}${fixtureExit.signal ? ` / señal ${fixtureExit.signal}` : ""}`
    : "salida no registrada";
  return `El fixture SPEC37 I6 terminó antes de servir (${how}): ${detail}`;
}

/** Un fixture muerto no puede quedar enmascarado por un poll que responde. */
function assertFixtureAlive() {
  if (fixtureExit) throw new Error(fixtureFailure());
}

test.beforeAll(async ({ request }) => {
  // El origen lo publica el contexto de la ejecución (`APP_ORIGIN` y
  // `E2E_APP_ORIGIN`); sin él, el fixture usa el del `playwright.config.ts`.
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/spec37-i6-server.ts"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: fixture.env,
    },
  );
  child.stdout?.on("data", (chunk: Buffer) => {
    fixtureOutput += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    fixtureOutput += chunk.toString();
  });
  child.on("exit", (code, signal) => {
    fixtureExit = { code, signal };
  });
  await expect
    .poll(
      async () => {
        assertFixtureAlive();
        try {
          return (await request.get(`http://127.0.0.1:${PORT}/api/health`)).status();
        } catch {
          return 0;
        }
      },
      { timeout: 20000 },
    )
    .toBe(200);
  // El sondeo debe hablar con NUESTRO fixture: proceso vivo y base ficticia
  // provisionada por él en el directorio de esta run (no otro 200 ajeno).
  assertFixtureAlive();
  expect(
    existsSync(`${DIR}/bootstrap.txt`),
    `El fixture no provisionó ${DIR}/bootstrap.txt: ${fixtureOutput.trim()}`,
  ).toBe(true);
});

test.afterAll(() => {
  child?.kill();
  child?.stdout?.destroy();
  child?.stderr?.destroy();
});

test("SPEC37 I6: Gasto normal, modalidad A sin Transferencia y cancelación sin escritura", async ({
  page,
}) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });

  // ── Sesión real con MFA ──────────────────────────────────────────────────
  const password = "Contraseña ficticia SPEC37 I6 " + randomUUID();
  await page.goto("/movimientos");
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(`${DIR}/bootstrap.txt`, "utf8"));
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
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
  await expect(page.getByRole("heading", { name: "Movimientos", exact: true })).toBeVisible();

  const get = (path: string) =>
    page.evaluate(async (p) => (await fetch("/api" + p)).json(), path);
  const post = (path: string, body: Record<string, unknown>) =>
    page.evaluate(
      async ({ path, body }) => {
        const session = await (await fetch("/api/auth/session")).json();
        const r = await fetch("/api" + path, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": session.csrf,
            "idempotency-key": crypto.randomUUID(),
          },
          body: JSON.stringify(body),
        });
        return { status: r.status, data: await r.json() };
      },
      { path, body },
    );
  const settle = async () =>
    page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  const noOverflow = async () =>
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
  const shotBoth = async (name: string) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await settle();
    await noOverflow();
    await page.screenshot({ path: join(artifacts, `${name}-1440.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await settle();
    await noOverflow();
    await page.screenshot({ path: join(artifacts, `${name}-390.png`), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
  };

  // ── Fixtures sintéticas por la API pública ───────────────────────────────
  const hoy = await page.evaluate(() => new Date().toLocaleDateString("sv-SE"));
  const inicioCiclo = hoy.slice(0, 8) + "01";
  const contexto = await get("/ciclos/contexto");
  expect(
    (
      await post("/ciclos", {
        inicio: inicioCiclo,
        saldoInicialComida: "0",
        contextRevision: contexto.revision,
      })
    ).status,
  ).toBe(201);

  const saldo = async (
    nombre: string,
    apertura: string,
    extra: Record<string, unknown> = {},
  ) =>
    (
      await post("/saldos", {
        nombre,
        tipo: "Efectivo",
        control: "Movimientos",
        saldoApertura: apertura,
        fechaApertura: inicioCiclo,
        permiteSalidaExterior: false,
        ...extra,
      })
    ).data.saldo;

  // Cuenta 2 (paga) y Cuenta 1 (aporta, sin participar en AC-02).
  const pagador = await saldo("Pagador I6", "500", { permiteSalidaExterior: true });
  const aporta = await saldo("Aporta I6", "300");

  const categoria = (
    await post("/clasificacion/categorias", {
      nombre: "Categoría I6 ficticia",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    })
  ).data.item;
  const subcategoria = (
    await post("/clasificacion/subcategorias", {
      nombre: "Subcategoría I6 ficticia",
      padre: categoria.id,
    })
  ).data.item;
  const partida = (
    await post("/clasificacion/partidas", {
      nombre: "Partida I6 ficticia",
      padre: subcategoria.id,
    })
  ).data.item;

  const movimientos = () => get("/movimientos?page=1");
  const pendientes = () => get("/transferencias-pendientes?estado=Pendiente%20de%20realizar");
  const posicion = async () =>
    (await get("/saldos")).saldos.find((s: any) => s.id === aporta.id).posicion.importe;

  /**
   * Alta por la entrada unificada de I5 (§10.1): «Nuevo gasto» con el Gasto
   * normal predeterminado —sin elegir modalidad— sobre los mismos campos.
   */
  const registrarGasto = async (concepto: string, importe: string) => {
    await page.goto("/movimientos/nuevo?tipo=Gasto");
    await expect(
      page.getByRole("heading", { name: "Nuevo gasto", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: "Gasto normal" }),
    ).toBeChecked();
    await page.getByLabel("Fecha del Gasto").fill(hoy);
    await page.getByLabel("Importe del Gasto").fill(importe);
    await page.getByLabel("Saldo pagador").selectOption(pagador.id);
    await page.getByLabel(/^Partida/).selectOption(partida.id);
    await page.getByLabel("Concepto", { exact: true }).fill(concepto);
    await page.getByRole("button", { name: "Registrar movimiento", exact: true }).click();
    await expect(page.getByRole("heading", { name: concepto, exact: true })).toBeVisible();
  };

  // ── AC-01: Gasto normal ─────────────────────────────────────────────────
  await registrarGasto("Compra normal I6", "100,00");
  const primera = await movimientos();
  expect(primera.total).toBe(1);
  const gastoNormal = primera.movimientos[0];
  expect(gastoNormal).toMatchObject({ tipo: "Gasto", importe: "100.00", anulado: false });
  expect(gastoNormal.origen.id).toBe(pagador.id);
  expect((await pendientes()).total).toBe(0);
  // La alerta no existe en la lista: la bandeja está en cero y la fila del
  // Gasto no lleva marca de «Pendiente de realizar».
  await page.goto("/movimientos");
  const bandeja = page.getByRole("region", { name: "Pendientes de confirmar" });
  await expect(bandeja).toBeVisible();
  await expect(
    bandeja.getByText(/Pendientes de confirmar: 0 · Requieren atención: 0/),
  ).toBeVisible();
  await expect(
    page.locator(".movements-list").getByText("Pendiente de realizar", { exact: true }),
  ).toHaveCount(0);
  await shotBoth("gasto-normal");

  // ── AC-02: modalidad A sin Transferencia ────────────────────────────────
  // Cuenta 1 existe y no participa: solo el Gasto desde Cuenta 2.
  const aportaAntes = await posicion();
  await registrarGasto("Compra A sin Transferencia I6", "40,00");
  const segunda = await movimientos();
  expect(segunda.total).toBe(2);
  const gastoA = segunda.movimientos.find(
    (m: any) => m.concepto === "Compra A sin Transferencia I6",
  );
  expect(gastoA).toMatchObject({ tipo: "Gasto", importe: "40.00" });
  expect(gastoA.origen.id).toBe(pagador.id);
  expect((await pendientes()).total).toBe(0);
  expect(await posicion()).toBe(aportaAntes);
  await shotBoth("a-sin-transferencia");

  // ── AC-19: cancelar el formulario no escribe nada ───────────────────────
  const escrituras: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && request.url().includes("/api/"))
      escrituras.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await page.goto("/movimientos/nuevo?tipo=Gasto");
  await expect(
    page.getByRole("heading", { name: "Nuevo gasto", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("radio", { name: "Pago directo desde otro Saldo" })
    .check();
  await page.getByLabel("Fecha del Gasto").fill(hoy);
  await page.getByLabel("Importe del Gasto").fill("60,00");
  await page.getByLabel("Saldo pagador").selectOption(pagador.id);
  await page.getByLabel(/^Partida/).selectOption(partida.id);
  await page.getByLabel("Concepto", { exact: true }).fill("Borrador cancelado I6");
  await page.getByLabel("Saldo que aporta").selectOption(aporta.id);
  await page.getByLabel("Importe de la Transferencia prevista").fill("30,00");
  await page.getByLabel("Fecha prevista").fill(hoy);
  await shotBoth("borrador-cancelado");

  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Movimientos", exact: true })).toBeVisible();
  await settle();

  // Cero escrituras y cero hechos nuevos: ni Gasto, ni Transferencia, ni pendiente.
  expect(escrituras, escrituras.join("\n")).toEqual([]);
  expect((await movimientos()).total).toBe(2);
  expect((await pendientes()).total).toBe(0);
  expect(
    (await movimientos()).movimientos.filter(
      (m: any) => m.concepto === "Borrador cancelado I6",
    ),
  ).toEqual([]);
  await expect(
    page.getByText("Borrador cancelado I6", { exact: false }),
  ).toHaveCount(0);
  await shotBoth("tras-cancelar");

  expect(errors, errors.join("\n")).toEqual([]);
});
