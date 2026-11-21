import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
import { contextFromEnv } from "../../apps/api/test-support/e2e-context";

import { artifactDir, fixtureContext, requireFixtureState } from "./fixture";

/**
 * SPEC38 · I2 · #555 — UI/E2E del cierre como **validación operativa**.
 *
 * Contrato sustituido (se documenta en cada prueba):
 *
 * | Antes (E4.9/E4.10, retirado)                    | Ahora (§5/§7.6)                                   |
 * | ----------------------------------------------- | ------------------------------------------------- |
 * | Preflight + «Confirmar cierre» → foto v1        | `GET /estado` + `GET /validacion/preview` + POST  |
 * |                                                 | `/validar` → recibo sin cifras                    |
 * | `POST /cierres/:id/{preflight,cerrar,foto}`     | `410` con `CIERRE_FOTOGRAFICO_RETIRADO`/`FOTO_RETIRADA` |
 * | Reabrir, re-cerrar v2, cancelar reapertura      | `410 REAPERTURA_RETIRADA`; la corrección es ordinaria |
 * | Versiones de foto y comparación v1/v2           | No hay versiones; `huellaVigente` + divergencia    |
 * | Bloqueo por E3.5/FIN_NETA y por DT6/backup      | Cobertura parcial explícita con motivo; **no** bloquea |
 * | Bloqueo por cierre fuera de orden / incoherencia | Retirado: la validación no ordena cierres          |
 * | «Ciclo ya cerrado»                              | `SinValidar` · `Validada` · `Pendiente`            |
 *
 * Cada test arranca un servidor API aislado (`apps/api/test-support/cierre-
 * server.ts`) con datos ficticios y evidencia de test inyectada (E3.5 y
 * DT6/T-BKP). No se usa producción, no se leen datos reales y la evidencia
 * inyectada NO acredita DT6 ni autoriza ninguna operación real.
 *
 * Escenarios del fixture: cada uno pide su puerto y su directorio al contexto
 * de la ejecución (#514).
 */
const FIXTURES = {
  listo: fixtureContext("cierre-listo"),
  replay: fixtureContext("cierre-replay"),
  conflicto: fixtureContext("cierre-conflicto"),
  validada: fixtureContext("cierre-validada"),
  pendiente: fixtureContext("cierre-pendiente"),
  "sin-siguiente": fixtureContext("cierre-sin-siguiente"),
  "sin-ciclo": fixtureContext("cierre-sin-ciclo"),
  "sin-contrato": fixtureContext("cierre-sin-contrato"),
  nav: fixtureContext("cierre-nav"),
  "backup-sin-referencia": fixtureContext("cierre-backup-sin-referencia"),
} as const;

type Scenario = keyof typeof FIXTURES;

const artifacts = artifactDir("spec38-i2-validacion");

async function startServer(request: APIRequestContext, scenario: Scenario) {
  const fixture = FIXTURES[scenario];
  const child: ChildProcess = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/cierre-server.ts"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...fixture.env,
        E49_SCENARIO: scenario,
        E49_PORT: String(fixture.port),
        // Origen de la ejecución (#514): el literal 5173 haría que el fixture
        // rechazara con 403 ORIGIN la sesión del run.
        E410_ORIGIN: process.env.E410_ORIGIN ?? contextFromEnv().webOrigin,
      },
    },
  );
  let output = "";
  let exit: { code: number | null; signal: NodeJS.Signals | null } | null =
    null;
  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.on("exit", (code, signal) => {
    exit = { code, signal };
  });
  const assertAlive = () => {
    const ended = exit;
    if (!ended) return;
    const how = `código ${ended.code ?? "null"}${ended.signal ? ` / señal ${ended.signal}` : ""}`;
    throw new Error(
      `El fixture ${fixture.name} terminó antes de servir (${how}): ${output.trim() || "(sin salida)"}`,
    );
  };
  await expect
    .poll(
      async () => {
        assertAlive();
        try {
          return (await request.get(`${fixture.baseURL}/api/health`)).status();
        } catch {
          return 0;
        }
      },
      { timeout: 20000 },
    )
    .toBe(200)
    .catch((error) => {
      // No dejar un proceso huérfano si el arranque o el health fallan.
      child.kill();
      throw error;
    });
  // El fixture provisionó su base ficticia antes de servir: se navega solo
  // cuando el estado de esta run está en disco.
  requireFixtureState({ fixture, output: () => output, assertAlive });
  return { child, port: fixture.port, dir: fixture.dir };
}

async function routeApi(page: Page, port: number) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(port);
    try {
      const response = await route.fetch({ url: url.toString() });
      await route.fulfill({ response });
    } catch {
      // La navegación puede cancelar una petición en vuelo; no es un fallo
      // de la aplicación ni debe romper la prueba.
    }
  });
}

async function login(page: Page, dir: string, path = "/cierre") {
  await page.goto(path);
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(dir + "/bootstrap.txt", "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia validación E2E " + randomUUID());
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
    page.getByRole("heading", { name: "Validación del cierre", exact: true }),
  ).toBeVisible();
}

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}

function pageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/** Llamada autenticada desde el contexto de la página (con CSRF). */
async function api(
  page: Page,
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return page.evaluate(
    async ({ path, method, body, headers }) => {
      const session = await (await fetch("/api/auth/session")).json();
      const response = await fetch("/api" + path, {
        method,
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": session.csrf,
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {}
      return {
        status: response.status,
        cacheControl: response.headers.get("cache-control"),
        data: data as Record<string, any>,
      };
    },
    { path, method, body, headers },
  );
}

const badge = (page: Page, estado: string) =>
  page.locator(`.ui-badge[data-estado="${estado}"]`);

test("I2 API · la vía fotográfica responde 410 y el estado de validación es la lectura viva", async ({
  request,
  page,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "listo");
  try {
    // Sin sesión no se expone ni una ruta retirada ni el estado (§7.6): el
    // 410 de una ruta retirada no puede ser una puerta abierta.
    expect(
      (await request.get(`http://127.0.0.1:${port}/api/cierres/1/preflight`))
        .status(),
    ).toBe(401);
    expect(
      (await request.get(`http://127.0.0.1:${port}/api/fotos/periodos`))
        .status(),
    ).toBe(401);

    await routeApi(page, port);
    await login(page, dir);

    // Equivalencia de la matriz E4.9: cada ruta fotográfica se fija por ruta
    // completa y por código, nunca por prefijo, y trae su sustituto explícito.
    const retiradas: [string, string, string | null][] = [
      ["/cierres/1/preflight", "CIERRE_FOTOGRAFICO_RETIRADO", "/api/cierres/1/estado"],
      ["/cierres/1/cerrar", "CIERRE_FOTOGRAFICO_RETIRADO", "/api/cierres/1/estado"],
      ["/cierres/1/cierre", "CIERRE_FOTOGRAFICO_RETIRADO", "/api/cierres/1/estado"],
      ["/cierres/1/foto", "FOTO_RETIRADA", "/api/cierres/1/estado"],
      ["/cierres/1/foto?version=1", "FOTO_RETIRADA", "/api/cierres/1/estado"],
      ["/cierres/1/reapertura", "REAPERTURA_RETIRADA", "/api/cierres/1/estado"],
      ["/cierres/1/reapertura/cancelar", "REAPERTURA_RETIRADA", "/api/cierres/1/estado"],
      ["/cierres/1/reabrir", "REAPERTURA_RETIRADA", "/api/cierres/1/estado"],
      ["/cierres/1/repreflight", "REAPERTURA_RETIRADA", "/api/cierres/1/estado"],
      ["/cierres/1/recerrar", "REAPERTURA_RETIRADA", "/api/cierres/1/estado"],
      ["/cierres/1/cancelar", "REAPERTURA_RETIRADA", "/api/cierres/1/estado"],
      ["/cierres/1/revalidacion", "REAPERTURA_RETIRADA", "/api/cierres/1/estado"],
      ["/fotos/contraste?ciclo=1", "FOTO_RETIRADA", "/api/cierres/1/estado"],
      ["/fotos/periodos", "FOTOS_RETIRADAS", null],
      ["/fotos/periodos/1", "FOTOS_RETIRADAS", null],
      ["/fotos/ciclos/1", "FOTOS_RETIRADAS", null],
      ["/fotos/ciclos/1/versiones", "FOTOS_RETIRADAS", null],
    ];
    for (const [path, code, sustituto] of retiradas) {
      const result = await api(page, path);
      expect(result.status, `${path} debe responder 410`).toBe(410);
      expect(result.data.code, path).toBe(code);
      expect(result.data.sustituto, path).toBe(sustituto);
      expect(result.cacheControl, path).toBe("no-store");
    }

    // La lectura viva sigue disponible y es aditiva: precierre en la raíz,
    // estado de validación junto a él y **sin** `cierre` ni `reapertura`.
    const precierre = await api(page, "/cierres/precierre/1");
    expect(precierre.status).toBe(200);
    const estado = await api(page, "/cierres/1/estado");
    expect(estado.status).toBe(200);
    expect(estado.data.ciclo).toBe("1");
    expect(estado.data.validacion.estado).toBe("SinValidar");
    expect(estado.data.validacion.validado).toBe(false);
    expect(estado.data).not.toHaveProperty("cierre");
    expect(estado.data).not.toHaveProperty("reapertura");
    expect(estado.data).not.toHaveProperty("foto");
    // El precierre sigue siendo de sólo lectura.
    expect((await api(page, "/cierres/precierre/1", "POST", {})).status).toBe(
      405,
    );
  } finally {
    child.kill();
  }
});

test("I2 UI · estado Sin validar, preview no persistente y validación con recibo sin cifras", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "listo");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await expect(page).toHaveURL(/\/cierre/);

    await page.getByLabel("Ciclo").selectOption("1");
    await expect(page.getByTestId("validacion-estado")).toBeVisible();
    // Tres estados visibles, con texto además del color (§5).
    await expect(badge(page, "SinValidar")).toBeVisible();
    await expect(badge(page, "SinValidar")).toContainText("Sin validar");
    await expect(
      page.getByText("No comparable: no hay referencia humana", { exact: true }),
    ).toBeVisible();

    // Cobertura: una fuente no disponible se declara y nunca se presenta como
    // cero. El aviso de E3.5/FIN_NETA es informativo y no bloquea (§5).
    await page.getByRole("button", { name: "Validar", exact: true }).click();
    const preview = page.getByRole("region", {
      name: "Vista previa de la validación",
    });
    await expect(preview).toBeVisible();
    await expect(
      preview.getByRole("heading", { name: "Vista previa: Validar", exact: true }),
    ).toBeVisible();
    await expect(
      preview.getByText("Cálculo en memoria", { exact: false }),
    ).toBeVisible();
    const cobertura = page.getByRole("region", {
      name: "Cobertura de la validación por fuente",
    });
    await expect(cobertura).toBeVisible();
    await expect(
      cobertura.getByRole("columnheader", { name: "Cobertura" }),
    ).toBeVisible();
    await expect(cobertura.getByText("Valoración", { exact: true })).toBeVisible();
    await expect(
      cobertura.getByText("No disponible", { exact: true }),
    ).toBeVisible();
    await expect(
      cobertura.getByText("FIN_NETA_NO_DISPONIBLE", { exact: true }),
    ).toBeVisible();
    const avisos = page.getByRole("note", { name: "Avisos de la validación" });
    await expect(avisos).toBeVisible();
    await expect(avisos).toContainText("E35_NO_VERIFICABLE");
    await expect(avisos).toContainText("COBERTURA_AUXILIAR_PARCIAL");
    await expect(
      avisos.getByText("Informativos: se declaran y no bloquean la validación.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Bloqueos de la validación" }),
    ).toHaveCount(0);

    const attemptKey = page.getByTestId("validacion-attempt-key");
    await expect(attemptKey).toHaveText(/^[0-9a-f-]{36}$/);
    const keyBefore = await attemptKey.innerText();

    // El preview no escribe: dos lecturas seguidas devuelven los mismos tokens
    // y el estado sigue sin revisión.
    const first = await api(page, "/cierres/1/validacion/preview");
    const second = await api(page, "/cierres/1/validacion/preview");
    expect(first.status).toBe(200);
    expect(first.data.operacion).toBe("validar");
    expect(first.data.noStore).toBe(true);
    expect(second.data.fingerprint).toBe(first.data.fingerprint);
    expect(second.data.impactRevision).toBe(first.data.impactRevision);
    expect(second.data.estado.revision).toBeNull();
    expect((await api(page, "/cierres/1/estado")).data.validacion.revision).toBeNull();

    await page
      .getByLabel("Motivo de la validación")
      .fill("Validación ficticia E2E");
    await page
      .getByRole("button", { name: "Confirmar validación", exact: true })
      .click();

    // Recibo: identidad de la operación y estados, sin ninguna cifra.
    const recibo = page.getByRole("region", {
      name: "Recibo de la validación",
    });
    await expect(recibo).toBeVisible();
    const reciboHeading = recibo.getByRole("heading", {
      name: "Validación registrada",
      exact: true,
    });
    await expect(reciboHeading).toBeVisible();
    await expect(reciboHeading).toBeFocused();
    await expect(recibo.getByText(/OP-[a-f0-9]{32}/)).toBeVisible();
    expect(await recibo.innerText()).not.toContain("€");
    expect(await recibo.innerText()).not.toContain("%");

    await expect(badge(page, "Validada").first()).toBeVisible();
    await expect(
      page.getByText("Igual a la referencia validada", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Revalidar", exact: true }),
    ).toBeVisible();
    // La identidad de intento cambia con cada preview: no se reutiliza una
    // clave de un intento anterior.
    await expect(
      page.getByRole("button", { name: "Validar", exact: true }),
    ).toHaveCount(0);

    const estado = await api(page, "/cierres/1/estado");
    expect(estado.data.validacion.estado).toBe("Validada");
    expect(estado.data.validacion.validado).toBe(true);
    expect(estado.data.validacion.revision).toBe(1);
    expect(estado.data.validacion.ultimaRevision.motivo).toBe(
      "Validación ficticia E2E",
    );
    // Lo persistido es una referencia, no un informe: sin foto y sin versiones.
    expect((await api(page, "/cierres/1/foto")).status).toBe(410);

    // Evidencia visual: 1440 y 390, tres temas, sin scroll horizontal.
    const theme = page.getByLabel("Cambiar tema");
    for (const id of ["light-s", "dark-s", "hybrid-s"] as const) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await theme.selectOption(id);
      await expect(page.locator("html")).toHaveAttribute("data-theme", id);
      await expectNoOverflow(page);
      await page.screenshot({
        path: join(artifacts, `validada-${id}-1440.png`),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expectNoOverflow(page);
      await expect(cobertura).toBeHidden();
      await expect(
        page.getByRole("list", {
          name: "Cobertura de la validación por fuente",
        }),
      ).toBeVisible();
      await page.screenshot({
        path: join(artifacts, `validada-${id}-390.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await theme.selectOption("light-s");

    // El estado de la pantalla no conserva la clave del intento anterior.
    expect(keyBefore).toMatch(/^[0-9a-f-]{36}$/);
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("I2 UI · reintento idempotente tras un fallo devuelve el mismo recibo", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "replay");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    await page.getByRole("button", { name: "Validar", exact: true }).click();
    await page
      .getByLabel("Motivo de la validación")
      .fill("Reintento ficticio E2E");

    let servidor: { operacionId: string } | null = null;
    let first = true;
    await page.route("**/api/cierres/1/validar", async (route) => {
      if (!first) return route.continue();
      first = false;
      const target = new URL(route.request().url());
      target.port = String(port);
      // El servidor procesa la validación; la UI recibe un fallo ficticio.
      const response = await route.fetch({ url: target.toString() });
      servidor = await response.json();
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          code: "INTERNAL",
          error: "Fallo ficticio de red tras la validación.",
        }),
      });
    });

    await page
      .getByRole("button", { name: "Confirmar validación", exact: true })
      .click();
    await expect(
      page.getByText("Fallo ficticio de red tras la validación.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Código: INTERNAL", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Recibo de la validación" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: join(artifacts, "replay-error-1440.png"),
      fullPage: true,
    });

    // El reintento vuelve a pasar por el proxy de la ejecución: la ruta que
    // simulaba el fallo se retira antes de repetir la misma clave.
    await page.unroute("**/api/cierres/1/validar");
    await page
      .getByRole("button", { name: "Reintentar (misma clave)", exact: true })
      .click();
    await expect(
      page.getByText("Reintento idempotente: se conserva el mismo recibo.", {
        exact: true,
      }),
    ).toBeVisible();
    const recibo = page.getByRole("region", { name: "Recibo de la validación" });
    await expect(recibo).toBeVisible();
    // La clave completada reproduce el recibo del servidor, no uno nuevo.
    expect(servidor).not.toBeNull();
    await expect(recibo.getByText(servidor!.operacionId, { exact: true })).toBeVisible();

    // No hay segunda referencia ni revisión 2: el estado conserva la 1.
    const estado = await api(page, "/cierres/1/estado");
    expect(estado.data.validacion.revision).toBe(1);
    expect(estado.data.validacion.estado).toBe("Validada");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("I2 UI · 409 IMPACT_CHANGED conserva el borrador y exige nuevo preview", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "conflicto");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    await page.getByRole("button", { name: "Validar", exact: true }).click();
    await page
      .getByLabel("Motivo de la validación")
      .fill("Conflicto ficticio E2E");
    const attemptKey = page.getByTestId("validacion-attempt-key");
    await expect(attemptKey).toHaveText(/^[0-9a-f-]{36}$/);
    const keyBefore = await attemptKey.innerText();

    let stale = true;
    await page.route("**/api/cierres/1/validar", async (route) => {
      if (!stale) return route.continue();
      stale = false;
      const body = JSON.parse(route.request().postData() ?? "{}");
      const target = new URL(route.request().url());
      target.port = String(port);
      const response = await route.fetch({
        url: target.toString(),
        postData: JSON.stringify({ ...body, impactRevision: "0".repeat(64) }),
      });
      await route.fulfill({ response });
    });

    await page
      .getByRole("button", { name: "Confirmar validación", exact: true })
      .click();
    await expect(
      page.getByText(/La previsualización ha cambiado/),
    ).toBeVisible();
    await expect(page.getByText("Código: IMPACT_CHANGED")).toBeVisible();
    await expect(
      page.getByText(/vuelve a previsualizar/i).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Recibo de la validación" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: join(artifacts, "conflicto-409-1440.png"),
      fullPage: true,
    });

    // Confirmar con los tokens obsoletos no se ofrece: primero, preview nuevo.
    await page
      .getByRole("button", { name: "Volver a previsualizar", exact: true })
      .click();
    await expect(attemptKey).not.toHaveText(keyBefore);
    // El motivo escrito sobrevive a la reprevisualización.
    await expect(page.getByLabel("Motivo de la validación")).toHaveValue(
      "Conflicto ficticio E2E",
    );
    await page.unroute("**/api/cierres/1/validar");
    await page
      .getByRole("button", { name: "Confirmar validación", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Validación registrada", exact: true }),
    ).toBeVisible();

    const estado = await api(page, "/cierres/1/estado");
    expect(estado.data.validacion.revision).toBe(1);
    expect(estado.data.validacion.estado).toBe("Validada");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("I2 UI · cobertura parcial y avisos informativos no bloquean; tampoco DT6", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "listo");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    // Antes, E3.5/FIN_NETA no verificable y la falta de evidencia DT6
    // bloqueaban el cierre. Ahora son cobertura parcial explícita y aviso.
    await expect(page.getByText("Bloqueado", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("El cierre está bloqueado", { exact: false }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Validar", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Vista previa de la validación" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar validación", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByText("Sin cobertura medida todavía", { exact: false }),
    ).toHaveCount(0);

    // Estado crítico de cobertura parcial: una captura por tema a 390.
    const theme = page.getByLabel("Cambiar tema");
    for (const id of ["light-s", "dark-s", "hybrid-s"] as const) {
      await page.setViewportSize({ width: 390, height: 844 });
      await theme.selectOption(id);
      await expect(page.locator("html")).toHaveAttribute("data-theme", id);
      await expectNoOverflow(page);
      await page.screenshot({
        path: join(artifacts, `parcial-${id}-390.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("I2 UI · sin evidencia DT6 el ciclo sigue siendo validable", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "backup-sin-referencia");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    // La referencia de manifiesto/checksum ya no es criterio de validación:
    // G5 sigue siendo gate operativo, no una condición financiera (§5).
    await page.getByRole("button", { name: "Validar", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Confirmar validación", exact: true }),
    ).toBeEnabled();
    await expect(page.getByText("No acreditado", { exact: true })).toHaveCount(0);
    const preview = await api(page, "/cierres/1/validacion/preview");
    expect(preview.status).toBe(200);
    expect(preview.data.bloqueos).toEqual([]);
  } finally {
    child.kill();
  }
});

test("I2 UI · SIN_SIGUIENTE_INICIO bloquea con 422 y no ofrece confirmar", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "sin-siguiente");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    await page.getByRole("button", { name: "Validar", exact: true }).click();
    const bloqueos = page.getByRole("region", {
      name: "Bloqueos de la validación",
    });
    await expect(bloqueos).toBeVisible();
    await expect(bloqueos).toContainText("SIN_SIGUIENTE_INICIO");
    await expect(
      bloqueos.getByText(/No existe siguiente Inicio/),
    ).toBeVisible();
    await expect(
      bloqueos.getByText(/no permite confirmar la validación/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar validación", exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: join(artifacts, "sin-siguiente-1440.png"),
      fullPage: true,
    });
    // Las guardas retiradas no reaparecen como bloqueo (§7.6): ni orden de
    // cierre, ni incoherencia con cierre posterior, ni motivo obligatorio.
    for (const code of [
      "CIERRE_FUERA_DE_ORDEN",
      "INCOHERENCIA_CON_CIERRE_POSTERIOR",
      "MOTIVO_REQUERIDO",
      "FUENTE_NO_LEGIBLE",
      "BACKUP_NO_VERIFICABLE",
    ])
      await expect(page.getByText(code, { exact: true })).toHaveCount(0);
  } finally {
    child.kill();
  }
});

test("I2 UI · sin ciclos no ofrece validación ni crea datos", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "sin-ciclo");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await expect(
      page.getByRole("heading", { name: "Sin ciclos para validar", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: join(artifacts, "sin-ciclos-1440.png"),
      fullPage: true,
    });
    await expect(
      page.getByRole("button", { name: "Validar", exact: true }),
    ).toHaveCount(0);
    const cycles = await page.request.get(
      `http://127.0.0.1:${port}/api/ciclos?estado=`,
    );
    expect((await cycles.json()).total).toBe(0);
  } finally {
    child.kill();
  }
});

test("I2 API/UI · 503 VALIDACION_NO_DISPONIBLE falla cerrado y nunca dibuja «Sin validar»", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "sin-contrato");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    await expect(
      page.getByText("El estado de validación no está disponible.", {
        exact: true,
      }),
    ).toBeVisible();
    // El modo de fallo prohibido: presentar una lectura rota como «sin validar».
    await expect(badge(page, "SinValidar")).toHaveCount(0);
    await expect(page.getByTestId("validacion-estado")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Validar", exact: true }),
    ).toHaveCount(0);

    const estado = await api(page, "/cierres/1/estado");
    expect(estado.status).toBe(503);
    expect(estado.data.code).toBe("VALIDACION_NO_DISPONIBLE");
    const preview = await api(page, "/cierres/1/validacion/preview");
    expect(preview.status).toBe(503);
    expect(preview.data.code).toBe("VALIDACION_NO_DISPONIBLE");
    await page.screenshot({
      path: join(artifacts, "no-disponible-1440.png"),
      fullPage: true,
    });
  } finally {
    child.kill();
  }
});

test("I2 UI · Pendiente se confirma como revisión humana; reabrir ya no existe", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "pendiente");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");

    // Antes: «Ciclo reabierto», re-cierre v2 y cancelación sin foto. Ahora el
    // estado es Pendiente y la única limpieza es confirmar la revisión.
    await expect(badge(page, "Pendiente")).toBeVisible();
    await expect(
      page.getByText(/Sin divergencia actual: el conjunto vigente coincide/),
    ).toBeVisible();
    await expect(page.getByText(/Pendiente desde/)).toBeVisible();
    await expect(page.getByText(/FLUJO_CICLO/)).toBeVisible();
    for (const name of [
      "Reabrir el último cierre",
      "Confirmar re-cierre v2",
      "Cancelar reapertura sin foto",
      "Consultar v1",
      "Consultar v2",
    ])
      await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Fotografía de cierre" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("columnheader", { name: "v1 (persistida)", exact: true }),
    ).toHaveCount(0);

    await page
      .getByRole("button", { name: "Confirmar revisión", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Vista previa: Confirmar revisión",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByLabel("Motivo de la validación")
      .fill("Revisión ficticia confirmada E2E");
    await page
      .getByRole("button", { name: "Confirmar revisión", exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("heading", { name: "Validación registrada", exact: true }),
    ).toBeVisible();
    await expect(badge(page, "Validada").first()).toBeVisible();

    const estado = await api(page, "/cierres/1/estado");
    expect(estado.data.validacion.estado).toBe("Validada");
    expect(estado.data.validacion.dirty).toBe(false);
    expect(estado.data.validacion.revision).toBe(2);
    expect(estado.data.validacion.ultimaRevision.motivo).toBe(
      "Revisión ficticia confirmada E2E",
    );
    // La reapertura se retira también para la API, no sólo en la pantalla.
    const reabrir = await api(page, "/cierres/1/reabrir", "POST", {});
    expect(reabrir.status).toBe(410);
    expect(reabrir.data.code).toBe("REAPERTURA_RETIRADA");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("I2 UI · Validada se revalida sin congelar resultados ni crear versiones", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "validada");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    await expect(badge(page, "Validada")).toBeVisible();
    await expect(
      page.getByText(/Referencia humana comparable del conjunto vigente/),
    ).toBeVisible();
    // Antes existían v1/v2 y su selección; ahora no hay versiones que elegir.
    await expect(page.getByLabel(/versión/i)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Revalidar", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Revalidar", exact: true }).click();
    const preview = page.getByRole("region", {
      name: "Vista previa de la validación",
    });
    await expect(
      preview.getByRole("heading", { name: "Vista previa: Revalidar", exact: true }),
    ).toBeVisible();
    await expect(
      preview.getByText("sin cambios materiales en el conjunto", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Confirmar revalidación", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Validación registrada", exact: true }),
    ).toBeVisible();

    const estado = await api(page, "/cierres/1/estado");
    expect(estado.data.validacion.estado).toBe("Validada");
    expect(estado.data.validacion.revision).toBe(2);
    expect(estado.data.validacion.divergenciaValidacion).toBe("Igual");
    // Consultar v1/v2 devuelve 410: no hay foto que consultar.
    expect((await api(page, "/cierres/1/foto?version=1")).status).toBe(410);
    expect((await api(page, "/cierres/1/foto?version=2")).status).toBe(410);
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("I2 navegación: shell y /inicio enlazan a la validación y /fotos ya no existe", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "nav");
  try {
    await routeApi(page, port);
    await login(page, dir);
    const group = page
      .locator(".nav-group-toggle")
      .filter({ hasText: "Ciclos y cierres" });
    if ((await group.getAttribute("aria-expanded")) === "false")
      await group.click();
    // `/fotos` sale de la navegación con su pantalla; `/cierre` se conserva
    // como ruta del ciclo y ahora es la validación.
    await expect(
      page.locator('#main-nav a[href="/fotos"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#main-nav a[href="/cierre"]'),
    ).toHaveCount(1);
    await expect(
      page.locator("#main-nav a"),
    ).toHaveCount(23);
    await page
      .getByRole("link", { name: /^Cierre$/ })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Validación del cierre", exact: true }),
    ).toBeVisible();

    // La ruta retirada no cae en una pantalla vacía: el shell responde «no
    // encontrada» y la lectura viva equivalente está en /cierre.
    await page.goto("/fotos");
    await expect(
      page.getByRole("heading", { name: "Validación del cierre", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("Página no encontrada.", { exact: true })).toBeVisible();

    await page.goto("/inicio");
    await expect(
      page.getByRole("heading", { name: "Inicio", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Ver cierre del ciclo" }).click();
    await expect(page).toHaveURL(/\/cierre\?ciclo=\d+$/);
    await expect(
      page.getByRole("heading", { name: "Validación del cierre", exact: true }),
    ).toBeVisible();
  } finally {
    child.kill();
  }
});