import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * E3.6 — UI de pendientes y flujo ajustado.
 *
 * Servidores de fixture ya existentes (proceso real, MFA real, sin endpoint de
 * fixture ni bypass). Las escrituras de preparación de paginación usan el API
 * autorizado de Compartidos desde la sesión autenticada; la vista E3.6 solo
 * emite GET y no ofrece acciones de escritura.
 */

const ARTIFACTS = "artifacts/e3-6";

function start(script: string): ChildProcess {
  return spawn(process.env.BUN_BIN ?? "bun", [script], {
    stdio: "pipe",
    env: { ...process.env, NODE_ENV: "test" },
  });
}

async function ready(
  request: any,
  origin: string,
  path = "/api/pendientes",
) {
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
  expect((await request.get(origin + path)).status()).toBe(401);
}

async function login(
  page: any,
  request: any,
  origin: string,
  bootstrap: string,
  target: string,
) {
  await ready(request, origin);
  await page.route("**/api/**", async (route: any) => {
    const url = new URL(route.request().url());
    url.port = new URL(origin).port;
    await route.continue({ url: url.toString() });
  });
  await page.goto(target);
  await page
    .getByLabel("Token de configuración local")
    .fill(readFileSync(bootstrap, "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia E3.6 " + randomUUID());
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
    .getByRole("button", {
      name: "He guardado los códigos · Continuar",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Pendientes y conciliación",
      exact: true,
    }),
  ).toBeVisible();
}

type SeedOptions = { saldo: string; partida: string };

/** Real authorized reads through the source module API. */
async function movementOptions(page: any): Promise<SeedOptions> {
  const options = await page.evaluate(async () => {
    const data = await (await fetch("/api/movimientos/opciones")).json();
    const saldo =
      data.saldos.find((s: { nombre: string }) =>
        s.nombre.includes("Banco compartido"),
      )?.id ?? data.saldos[0]?.id;
    const partida =
      data.partidas.find((p: { nombre: string }) =>
        p.nombre.includes("Piso ficticio"),
      )?.id ?? data.partidas[0]?.id;
    return { saldo, partida };
  });
  expect(options.saldo).toBeTruthy();
  expect(options.partida).toBeTruthy();
  return options;
}

/** Real authorized write through Ciclos; the cycle makes W4 available. */
async function createCycleForFlow(page: any): Promise<string> {
  const result = await page.evaluate(async () => {
    const session = await (await fetch("/api/auth/session")).json();
    const context = await (await fetch("/api/ciclos/contexto")).json();
    const response = await fetch("/api/ciclos", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": session.csrf,
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        inicio: "2026-10-01",
        saldoInicialComida: "0",
        contextRevision: context.revision,
      }),
    });
    const body = await response.json();
    return { status: response.status, id: body.ciclo?.id, error: body.error };
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(201);
  return result.id as string;
}

/** Real authorized writes through Compartidos/Movimientos, never through E3.6. */
async function createCompartido(
  page: any,
  nombre: string,
  options: SeedOptions,
  index: number,
) {
  const result = await page.evaluate(
    async ({
      nombre,
      options,
      index,
    }: {
      nombre: string;
      options: SeedOptions;
      index: number;
    }) => {
      const session = await (await fetch("/api/auth/session")).json();
      const base = {
        "content-type": "application/json",
        "x-csrf-token": session.csrf,
      };
      const ficha = await fetch("/api/compartidos/fichas", {
        method: "POST",
        headers: { ...base, "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ nombre }),
      });
      if (ficha.status !== 201) return { error: ficha.status };
      const ref = (await ficha.json()).referencia.id as string;
      for (const participante of [
        { nombre: "Yo", rol: "Titular", partes: 1 },
        { nombre: "Tercero " + index, rol: "Tercero", partes: 1 },
      ]) {
        const response = await fetch(
          `/api/compartidos/fichas/${ref}/participantes`,
          {
            method: "POST",
            headers: { ...base, "idempotency-key": crypto.randomUUID() },
            body: JSON.stringify(participante),
          },
        );
        if (!response.ok) return { error: response.status, ref };
      }
      const body = {
        tipo: "Gasto",
        fecha: `2026-10-${String(4 + index).padStart(2, "0")}`,
        importe: "10.00",
        saldo: options.saldo,
        partida: options.partida,
        referencia: ref,
        concepto: "Gasto paginación ficticio",
        nota: "",
      };
      const preview = await fetch("/api/movimientos/impacto", {
        method: "POST",
        headers: base,
        body: JSON.stringify(body),
      });
      if (!preview.ok) return { error: preview.status, ref };
      const plan = await preview.json();
      const movement = await fetch("/api/movimientos", {
        method: "POST",
        headers: { ...base, "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          ...body,
          fingerprint: plan.fingerprint,
          aceptarCoincidencia: true,
        }),
      });
      return { status: movement.status, ref };
    },
    { nombre, options, index },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(201);
}

test("E3.6 W1/W2/W3: MFA real, listado, filtros, detalle, paginación y 1440/390", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  mkdirSync(ARTIFACTS, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const child = start("apps/api/test-support/compartido-server.ts");
  try {
    await login(
      page,
      request,
      "http://127.0.0.1:3009",
      ".local/e2e-compartidos/bootstrap.txt",
      "/pendientes",
    );

    // Lista por defecto: una fila por caso/tipo, sin total económico global.
    const piso = page
      .getByRole("link", { name: "Piso 2026", exact: true })
      .first();
    await expect(piso).toBeVisible();
    await expect(
      page.getByText(/sin total económico global/).first(),
    ).toBeVisible();
    await expect(page.getByText("Total pendiente", { exact: false })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("columnheader", { name: "Magnitud", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Importe", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Caso / fuente", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: ARTIFACTS + "/w1-pendientes-1440.png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    // Contraste de texto sobre el shell claro existente.
    const contrast = await page.evaluate(() => {
      function rgb(v: string) {
        return v
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((x) => {
            const s = x / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
      }
      function luminance(v: string) {
        const [r, g, b] = rgb(v);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
      return Array.from(
        document.querySelectorAll(
          ".pendientes-table th,.pendientes-table td,.pendiente-motive,.tag,.pendiente-alerts li",
        ),
      ).map((el) => {
        const style = getComputedStyle(el);
        let parent: Element | null = el;
        let background = "";
        while (parent) {
          background = getComputedStyle(parent).backgroundColor;
          if (background !== "rgba(0, 0, 0, 0)" && background !== "transparent")
            break;
          parent = parent.parentElement;
        }
        const a = luminance(style.color),
          b = luminance(background || "rgb(255, 255, 255)");
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
    });
    expect(Math.min(...contrast)).toBeGreaterThanOrEqual(4.5);

    // W2 — 390: tarjetas, sin overflow y sin depender del color.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/pendientes");
    await expect(
      page.getByRole("heading", { name: "Pendientes y conciliación" }),
    ).toBeVisible();
    await expect(page.locator(".pendientes-cards")).toBeVisible();
    await expect(page.locator(".pendientes-cards li")).toHaveCount(1);
    await expect(
      page.locator(".pendientes-cards").getByText("Pendiente", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".pendientes-cards").getByText("Verificada", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: ARTIFACTS + "/w2-pendientes-390.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/pendientes");

    // Filtros: tipo, estado, cobertura, ejercicio, alcance y texto.
    await page.getByLabel("Tipo", { exact: true }).selectOption("Compartido");
    await page.getByLabel("Estado", { exact: true }).selectOption("Pendiente");
    await page.getByLabel("Cobertura", { exact: true }).selectOption("Verificada");
    await page.getByLabel("Ejercicio", { exact: true }).selectOption("2026");
    await page
      .getByLabel("Buscar por REF/ID/nombre", { exact: true })
      .fill("REF001");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(
      page.getByRole("link", { name: "Piso 2026", exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText(/^1 fila/).first()).toBeVisible();
    const url = new URL(page.url());
    expect(url.searchParams.get("tipo")).toBe("Compartido");
    expect(url.searchParams.get("estado")).toBe("Pendiente");
    expect(url.searchParams.get("texto")).toBe("REF001");
    expect(url.search).not.toMatch(/importe|amount/i);
    expect(url.search).not.toMatch(/\d+\.\d{2}/);

    // W3 — detalle de fila Compartido con métricas separadas y enlaces.
    await page
      .getByRole("link", { name: "Piso 2026", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Detalle · Piso 2026", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Neto central (B − R)").first()).toBeVisible();
    await expect(page.getByText("Coste propio del Titular")).toBeVisible();
    await expect(page.getByText("Recuperado acreditado")).toBeVisible();
    await expect(page.getByText("Pendiente de terceros").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Abrir Compartido", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Volver a pendientes/ }),
    ).toBeVisible();
    await page.screenshot({
      path: ARTIFACTS + "/w3-detalle-compartido-1440.png",
      fullPage: true,
    });

    // Volver conserva los filtros y la selección.
    await page
      .getByRole("link", { name: /Volver a pendientes/ })
      .click();
    await expect(page.getByLabel("Estado", { exact: true })).toHaveValue(
      "Pendiente",
    );
    await expect(
      page.getByLabel("Buscar por REF/ID/nombre", { exact: true }),
    ).toHaveValue("REF001");
    // Foco gestionado al volver del detalle.
    await expect(
      page.getByRole("heading", {
        name: "Pendientes y conciliación",
        exact: true,
      }),
    ).toBeFocused();

    // Histórico explícito: Resuelto no se mezcla con abiertos.
    await page.getByLabel("Tipo", { exact: true }).selectOption("");
    await page.getByLabel("Estado", { exact: true }).selectOption("");
    await page.getByLabel("Cobertura", { exact: true }).selectOption("");
    await page.getByLabel("Ejercicio", { exact: true }).selectOption("");
    await page.getByLabel("Alcance", { exact: true }).selectOption("historico");
    await page
      .getByLabel("Buscar por REF/ID/nombre", { exact: true })
      .fill("");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(
      page.locator(".desktop-list").getByText("Solo mío", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".desktop-list").getByText("Resuelto", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".desktop-list").getByText("Piso 2026", { exact: true }),
    ).toHaveCount(0);

    // 404 seguro en detalle.
    await page.goto("/pendientes/Compartido/REF999");
    await expect(
      page.getByText(/El caso ya no existe o no es accesible/),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Volver a pendientes/ }),
    ).toBeVisible();

    // Paginación real: casos con Gastos creados por sus módulos (no por E3.6).
    const seed = await movementOptions(page);
    for (let index = 1; index <= 12; index++)
      await createCompartido(
        page,
        "Caso paginación ficticio " + index,
        seed,
        index,
      );
    await page.goto("/pendientes");
    await expect(page.getByText(/página 1 de 2/)).toBeVisible();
    await page.getByRole("button", { name: "Siguiente", exact: true }).click();
    await expect(page.getByText(/página 2 de 2/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Caso paginación ficticio 1", exact: true }),
    ).toBeVisible();

    // R3 — W4 muestra las métricas por caso sin sumarlas al flujo.
    const cycleId = await createCycleForFlow(page);
    await page.goto(`/flujo-mensual?ciclo=${cycleId}`);
    await expect(
      page.getByRole("heading", {
        name: "Flujo ajustado por Recuperado (E3.6)",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByText(/Ver Neto, coste propio, pendiente y exceso por caso/)
      .click();
    const casos = page.locator(".flow-case-metrics");
    await expect(casos).toBeVisible();
    await expect(casos).toContainText("REF001");
    await expect(casos).toContainText("450,00 €");
    await expect(casos).toContainText("150,00 €");
    await expect(casos).toContainText("300,00 €");
    await expect(
      page.getByText(/No se suman a G_b, R_adj, G_n ni S_aj/),
    ).toBeVisible();
    await page.screenshot({
      path: ARTIFACTS + "/w4-casos-ajuste-1440.png",
      fullPage: true,
    });

    // La vista E3.6 no escribe: solo GET tras la preparación autorizada.
    const writes: string[] = [];
    page.on("request", (route: any) => {
      const target = new URL(route.url());
      if (target.pathname.startsWith("/api/") && route.method() !== "GET")
        writes.push(route.method() + " " + target.pathname);
    });
    await page.goto("/pendientes");
    await page.getByLabel("Tipo", { exact: true }).selectOption("Compartido");
    await page
      .getByRole("link", { name: "Piso 2026", exact: true })
      .first()
      .click();
    await page
      .getByRole("link", { name: /Volver a pendientes/ })
      .click();
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E3.6 W5: Comida/anticipo No disponible, alertas separadas, filtros y 390", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  mkdirSync(ARTIFACTS, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const child = start("apps/api/test-support/anticipo-server.ts");
  try {
    await login(
      page,
      request,
      "http://127.0.0.1:3008",
      ".local/e2e-anticipos/bootstrap.txt",
      "/pendientes",
    );

    await expect(
      page.getByRole("link", {
        name: "Histórico ficticio pendiente",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText(/^4 filas/).first()).toBeVisible();
    // Error de una fuente aislado; el resto de la lista se conserva.
    await expect(
      page.getByText(/No se pudo leer Comida E3\.5 \(2\)/),
    ).toBeVisible();
    await expect(
      page.getByText(/El resto de fuentes sigue disponible/).first(),
    ).toBeVisible();
    // Alerta separada de la métrica principal, sin cifra simulada.
    await expect(
      page
        .locator(".desktop-list")
        .getByText("Sin ciclo de contexto para la foto de Neto apertura.")
        .first(),
    ).toBeVisible();
    await expect(
      page
        .locator(".desktop-list .tag")
        .filter({ hasText: "No disponible" })
        .first(),
    ).toBeVisible();

    // R1: los ciclos inactivos conservan su conciliación y Comida ND.
    await page.getByLabel("Ciclo", { exact: true }).selectOption("2");
    await expect(page.getByText(/^2 filas/).first()).toBeVisible();
    await page.getByLabel("Ciclo", { exact: true }).selectOption("1");
    await expect(page.getByText(/^2 filas/).first()).toBeVisible();
    await page
      .getByLabel("Buscar por REF/ID/nombre", { exact: true })
      .fill("sin-coincidencia");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(
      page.getByText("No hay pendientes abiertos para este filtro."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(page.getByText(/^4 filas/).first()).toBeVisible();

    await page.getByLabel("Estado", { exact: true }).selectOption("No disponible");
    await expect(page.getByText(/^4 filas/).first()).toBeVisible();
    await page
      .getByLabel("Cobertura", { exact: true })
      .selectOption("No disponible");
    await expect(page.getByText(/^4 filas/).first()).toBeVisible();
    await page.getByLabel("Ejercicio", { exact: true }).selectOption("2026");
    await expect(page.getByText(/^4 filas/).first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/pendientes");
    await expect(page.locator(".pendientes-cards")).toBeVisible();
    await expect(
      page.locator(".pendientes-cards").getByText("No disponible").first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: ARTIFACTS + "/w5-estados-390.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/pendientes");

    // W3 — detalle Anticipo: motivo visible y sin 0,00 € sustituto.
    await page
      .getByRole("link", {
        name: "Histórico ficticio pendiente",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Detalle · Histórico ficticio pendiente",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Hechos pendientes de acreditación"),
    ).toBeVisible();
    await expect(page.getByText(/No disponible —/).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Abrir Anticipo", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("0,00 €")).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E3.6 R1: conciliación de ciclo sin movimientos aparece como Alerta", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  mkdirSync(ARTIFACTS, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const child = start("apps/api/test-support/pendientes-server.ts");
  try {
    await login(
      page,
      request,
      "http://127.0.0.1:3010",
      ".local/e2e-pendientes/bootstrap.txt",
      "/pendientes",
    );

    const apertura = page
      .getByRole("link", { name: "Apertura 2026-11-01", exact: true })
      .first();
    await expect(apertura).toBeVisible();
    await expect(page.getByText(/^2 filas/).first()).toBeVisible();
    await expect(
      page.locator(".desktop-list").getByText("Alerta", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("100,00 €").first()).toBeVisible();
    await expect(
      page.locator(".desktop-list").getByText(/Cobertura: Verificada/).first(),
    ).toBeVisible();

    // Histórico: solo Resuelto; la alerta del ciclo inactivo no se mezcla.
    await page.getByLabel("Alcance", { exact: true }).selectOption("historico");
    await expect(
      page
        .locator(".desktop-list")
        .getByRole("link", { name: "Apertura 2026-12-01", exact: true })
        .first(),
    ).toBeVisible();
    await expect(
      page
        .locator(".desktop-list")
        .getByRole("link", { name: "Apertura 2026-11-01", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.locator(".desktop-list").getByText("Alerta", { exact: true }),
    ).toHaveCount(0);

    await page.getByLabel("Alcance", { exact: true }).selectOption("abiertos");
    await page
      .getByRole("link", { name: "Apertura 2026-11-01", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", {
        name: /Detalle · Apertura 2026-11-01/,
      }),
    ).toBeVisible();
    await expect(page.getByText("DIF_S0_SIGUIENTE").first()).toBeVisible();
    await expect(page.getByText("100,00 €").first()).toBeVisible();
    await expect(page.getByText(/Alerta de conciliación/).first()).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E3.6 W4/W5: flujo ajustado, conciliación no disponible, carga, error y sesión", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  mkdirSync(ARTIFACTS, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const child = start("apps/api/test-support/monthly-server.ts");
  try {
    await login(
      page,
      request,
      "http://127.0.0.1:3008",
      ".local/e2e-monthly/bootstrap.txt",
      "/pendientes",
    );

    await expect(page.getByText(/^5 filas/).first()).toBeVisible();
    await expect(
      page.getByText(/No se pudo leer Comida E3\.5 \(3\)/),
    ).toBeVisible();

    // Carga sin importes provisionales.
    let held!: () => void, release!: () => void;
    const started = new Promise<void>((resolve) => (held = resolve)),
      gate = new Promise<void>((resolve) => (release = resolve));
    await page.route(
      "**/api/pendientes?*",
      async (route: any) => {
        const target = new URL(route.request().url());
        target.port = "3008";
        const response = await route.fetch({ url: target.toString() });
        held();
        await gate;
        await route.fulfill({ response });
      },
      { times: 1 },
    );
    await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await started;
    await expect(
      page.getByRole("status").filter({ hasText: "Cargando pendientes" }).first(),
    ).toBeVisible();
    await expect(page.locator(".pendientes-skeleton")).toBeVisible();
    await expect(page.getByText("0,00 €")).toHaveCount(0);
    release();
    await expect(page.getByText(/^5 filas/).first()).toBeVisible();

    // Error de consulta: conserva filtros y ofrece reintento.
    await page.getByLabel("Tipo", { exact: true }).selectOption("Conciliacion");
    await expect(page.getByText(/Apertura 2026-08-20/).first()).toBeVisible();
    await page.route(
      "**/api/pendientes?*",
      (route: any) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Error de prueba controlado" }),
        }),
      { times: 1 },
    );
    await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Error de prueba controlado",
    );
    await expect(page.getByLabel("Tipo", { exact: true })).toHaveValue(
      "Conciliacion",
    );
    await expect(
      page.getByRole("group", { name: "Error de consulta", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(page.getByText(/Apertura 2026-08-20/).first()).toBeVisible();

    // 409 de revisión en detalle: mensaje seguro, sin datos.
    await page.route(
      "**/api/pendientes/Conciliacion/*",
      (route: any) =>
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "La revisión cambió." }),
        }),
      { times: 1 },
    );
    await page
      .getByRole("link", { name: "Apertura 2026-08-20", exact: true })
      .first()
      .click();
    await expect(
      page.getByText(/La revisión cambió\. Vuelve a leer la lista/),
    ).toBeVisible();
    await page.getByRole("link", { name: "Volver a pendientes" }).click();
    await expect(page.getByLabel("Tipo", { exact: true })).toHaveValue(
      "Conciliacion",
    );

    // 422 seguro en detalle.
    await page.goto("/pendientes/TipoInvalido/1");
    await expect(
      page.getByText(/La consulta del detalle no es válida/),
    ).toBeVisible();

    // W3 — conciliación: Base, Cierre, DIF_S0_SIGUIENTE y DIF_BANCO.
    await page.goto("/pendientes?tipo=Conciliacion");
    await page
      .getByRole("link", { name: "Apertura 2026-08-20", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: /Detalle · Apertura 2026-08-20/ }),
    ).toBeVisible();
    await expect(page.getByText("Conciliación de apertura")).toBeVisible();
    await expect(
      page.getByText("Base analítica", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Cierre analítico", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("DIF_S0_SIGUIENTE").first()).toBeVisible();
    await expect(page.getByText("DIF_BANCO").first()).toBeVisible();
    await expect(page.getByText(/Conciliación no disponible —/)).toBeVisible();
    await expect(
      page.getByText(/no es un cierre financiero ni modifica el saldo inicial/),
    ).toBeVisible();
    await page.screenshot({
      path: ARTIFACTS + "/w3-conciliacion-1440.png",
      fullPage: true,
    });

    // W4 — vista ajustada separada; la base E2.6 sigue intacta.
    await page.goto("/flujo-mensual?ciclo=1");
    await expect(
      page.getByRole("heading", {
        name: "Flujo ajustado por Recuperado (E3.6)",
        exact: true,
      }),
    ).toBeVisible();
    const gb = page.getByRole("article", {
      name: "Gasto bruto E2.6 (G_b)",
      exact: true,
    });
    await expect(gb).toContainText("1.800,00 €");
    const radj = page.getByRole("article", {
      name: "Ajuste por Recuperado (R_adj)",
      exact: true,
    });
    await expect(radj).toContainText("0,00 €");
    await expect(radj).toContainText("Verificada");
    const gn = page.getByRole("article", {
      name: "Gasto neto del ciclo por Recuperado (G_n)",
      exact: true,
    });
    await expect(gn).toContainText("1.800,00 €");
    await expect(gn).toContainText("Parcial");
    const sbruto = page.getByRole("article", {
      name: "S bruto E2.6",
      exact: true,
    });
    await expect(sbruto).toContainText("350,00 €");
    const sajustado = page.getByRole("article", {
      name: "S ajustado (S_aj)",
      exact: true,
    });
    await expect(sajustado).toContainText("350,00 €");
    await expect(sajustado).toContainText("Parcial");
    await expect(
      page.getByRole("article", {
        name: "Memoria de caja: aportaciones cobradas",
        exact: true,
      }),
    ).toContainText("0,00 €");
    await expect(page.getByText(/G_n = G_b − R_adj/).first()).toBeVisible();
    // La base E2.6 sigue visible y etiquetada.
    await expect(
      page.getByRole("article", {
        name: "Gasto bruto registrado",
        exact: true,
      }),
    ).toContainText("1.800,00 €");
    await page.screenshot({
      path: ARTIFACTS + "/w4-flujo-ajustado-1440.png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);

    // Sesión expirada: sin datos financieros en la URL ni en pantalla.
    await page.context().clearCookies();
    await page.goto("/pendientes");
    await expect(
      page.getByRole("heading", { name: "Bienvenido a MyFinanzas", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Pendientes y conciliación",
        exact: true,
      }),
    ).toHaveCount(0);
    expect(page.url()).not.toMatch(/importe|\d+\.\d{2}/);
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
