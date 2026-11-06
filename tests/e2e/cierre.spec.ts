import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

/**
 * E4.9 — UI/E2E del cierre y la fotografía.
 *
 * Cada test arranca un servidor API aislado (`apps/api/test-support/cierre-
 * server.ts`) con datos ficticios y evidencia de test inyectada (E3.5 y
 * DT6/T-BKP). No se usa producción, no se leen datos reales y la evidencia
 * inyectada NO acredita DT6 ni autoriza un cierre real.
 */

const PORTS = {
  listo: 3031,
  replay: 3032,
  conflicto: 3033,
  bloqueado: 3034,
  "sin-siguiente": 3035,
  fuente: 3036,
  "fuera-orden": 3037,
  incoherente: 3038,
  "sin-ciclo": 3039,
  nav: 3040,
  "backup-sin-referencia": 3041,
  "e410-reabierto": 3042,
  "e410-no-ultimo": 3043,
  "e410-sin-cambios": 3044,
} as const;

const ARTIFACTS = "artifacts/e4-9";
const dirFor = (scenario: string) => `.local/e2e-cierre-${scenario}`;

async function startServer(
  request: APIRequestContext,
  scenario: keyof typeof PORTS,
) {
  const port = PORTS[scenario];
  mkdirSync(ARTIFACTS, { recursive: true });
  const child: ChildProcess = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/cierre-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        E49_SCENARIO: scenario,
        E49_PORT: String(port),
        E410_ORIGIN:
          process.env.E410_ORIGIN ?? "http://127.0.0.1:5173",
      },
    },
  );
  await expect
    .poll(
      async () => {
        try {
          return (
            await request.get(`http://127.0.0.1:${port}/api/health`)
          ).status();
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
  return { child, port, dir: dirFor(scenario) };
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
    .getByLabel("Token de configuración local")
    .fill(readFileSync(dir + "/bootstrap.txt", "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia cierre E2E " + randomUUID());
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
    page.getByRole("heading", { name: "Cierre financiero", exact: true }),
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

test("E4.9 UI: 401, preflight listo, cierre v1, foto inmutable y 390/1440 con tres temas", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  mkdirSync(ARTIFACTS, { recursive: true });
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "listo");
  try {
    // Sin sesión no se expone ni preflight ni foto.
    expect(
      (await request.get(`http://127.0.0.1:${port}/api/cierres/1/preflight`))
        .status(),
    ).toBe(401);
    expect(
      (await request.get(`http://127.0.0.1:${port}/api/cierres/1/foto`)).status(),
    ).toBe(401);

    await routeApi(page, port);
    await login(page, dir);
    await expect(page).toHaveURL(/\/cierre/);

    await page.getByLabel("Ciclo").selectOption("1");
    await expect(page.getByText("Listo", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("01/01/2026 → 31/01/2026", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("1.000,00 €", { exact: true })).toBeVisible();
    const fingerprint = page.locator(".cierre-fingerprint").first();
    await expect(fingerprint).toHaveText(/^[a-f0-9]{64}$/);
    await expect(page.getByText("SinPlan", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("SinPlan es válido; no se inventan líneas.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("Sin hechos", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Verificable", { exact: true })).toBeVisible();
    await expect(page.getByText("Acreditado", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Referencia documental", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar cierre", exact: true }),
    ).toBeEnabled();

    // Evidencia visual: 1440 y 390, tres temas, sin scroll horizontal.
    const theme = page.getByLabel("Tema visual");
    for (const id of ["light-s", "dark-s", "hybrid-s"] as const) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await theme.selectOption(id);
      await expect(page.locator("html")).toHaveAttribute("data-theme", id);
      await expectNoOverflow(page);
      await page.screenshot({
        path: `${ARTIFACTS}/preflight-${id}-1440.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expectNoOverflow(page);
      await page.screenshot({
        path: `${ARTIFACTS}/preflight-${id}-390.png`,
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await theme.selectOption("light-s");

    await page.getByLabel("Motivo del cierre").fill("Cierre ficticio E2E");
    await page.getByRole("button", { name: "Confirmar cierre", exact: true }).click();

    await expect(
      page.getByRole("region", { name: "Fotografía de cierre" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Fotografía v1", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Fotografía v1", exact: true }),
    ).toBeFocused();
    await expect(page.getByText("Cerrado · v1", { exact: true })).toBeVisible();
    await expect(page.getByText(/Ciclo 1 · v1/)).toBeVisible();
    await expect(page.getByText("Cierre ficticio E2E", { exact: true })).toBeVisible();
    const photoRegion = page.getByRole("region", {
      name: "Fotografía de cierre",
    });
    await expect(
      photoRegion.getByText(/App 0\.0\.0-e2e · esquema \d+/),
    ).toBeVisible();
    await expect(
      photoRegion.getByText(/Registro inmutable\. Fingerprint propio/),
    ).toBeVisible();
    await expect(
      photoRegion.getByText("Sin hechos", { exact: true }),
    ).toBeVisible();
    await expect(
      photoRegion.getByText("SinPlan", { exact: true }),
    ).toBeVisible();
    await expect(photoRegion.getByText(/0 movimiento\(s\)/)).toBeVisible();
    await expect(photoRegion.getByText(/0 línea\(s\)/)).toBeVisible();
    await expect(
      photoRegion.getByText("1.000,00 €", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Ciclo ya cerrado", { exact: true })).toBeVisible();
    await expect(
      page.getByText("evidencia-ficticia-e49", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar cierre", exact: true }),
    ).toHaveCount(0);

    // El cierre no crea el ciclo siguiente: siguen existiendo dos ciclos.
    const cycles = await page.request.get(
      `http://127.0.0.1:${port}/api/ciclos?estado=`,
    );
    expect(cycles.status()).toBe(200);
    expect((await cycles.json()).total).toBe(2);

    // Foto inmutable frente a T3: se renombra una Partida no usada y la foto
    // persistida no cambia ni se recalcula.
    const before = await page.evaluate(async () =>
      (await fetch("/api/cierres/1/foto")).json(),
    );
    const renamed = await page.evaluate(async () => {
      const session = await (await fetch("/api/auth/session")).json();
      return (
        await fetch("/api/clasificacion/partidas/PAR001", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": session.csrf,
          },
          body: JSON.stringify({
            nombre: "Partida renombrada E4.9",
            revision: 1,
          }),
        })
      ).status;
    });
    expect(renamed).toBe(200);
    const after = await page.evaluate(async () =>
      (await fetch("/api/cierres/1/foto")).json(),
    );
    expect(after.foto).toEqual(before.foto);
    await page.getByRole("button", { name: "Volver a leer la foto" }).click();
    await expect(page.getByText("Partida ficticia E4.9")).toHaveCount(0);
    await expect(page.getByText("Partida renombrada E4.9")).toHaveCount(0);

    // Foto: 1440/390 y tres temas.
    for (const id of ["light-s", "dark-s", "hybrid-s"] as const) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await theme.selectOption(id);
      await expect(page.locator("html")).toHaveAttribute("data-theme", id);
      await expectNoOverflow(page);
      await page.screenshot({
        path: `${ARTIFACTS}/foto-${id}-1440.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expectNoOverflow(page);
      await page.screenshot({
        path: `${ARTIFACTS}/foto-${id}-390.png`,
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.9 UI: reintento idempotente tras un fallo devuelve la misma foto v1", async ({
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
    await page.getByLabel("Motivo del cierre").fill("Reintento ficticio E2E");

    let first = true;
    await page.route("**/api/cierres/1/cerrar", async (route) => {
      if (!first) return route.continue();
      first = false;
      const target = new URL(route.request().url());
      target.port = String(port);
      // El servidor de test procesa el cierre; la UI recibe un fallo ficticio.
      await route.fetch({ url: target.toString() });
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          code: "INTERNAL",
          error: "Fallo ficticio de red tras el cierre.",
        }),
      });
    });

    await page.getByRole("button", { name: "Confirmar cierre", exact: true }).click();
    await expect(
      page.getByText("Fallo ficticio de red tras el cierre.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Código: INTERNAL", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Fotografía de cierre" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `${ARTIFACTS}/replay-error-1440.png`,
      fullPage: true,
    });

    await page.unroute("**/api/cierres/1/cerrar");
    await page
      .getByRole("button", { name: "Reintentar cierre (misma clave)" })
      .click();
    await expect(
      page.getByText("Reintento idempotente: se conserva la misma fotografía.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Fotografía v1", exact: true }),
    ).toBeVisible();

    // No hay segunda foto ni v2: el estado conserva la versión 1.
    const state = await page.request.get(
      `http://127.0.0.1:${port}/api/cierres/1/estado`,
    );
    expect(state.status()).toBe(200);
    const body = await state.json();
    expect(body.cierre.version).toBe(1);
    expect(body.cierre.fotoVersion).toBe(1);
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.9 UI: conflicto 409 por revisión obsoleta y recuperación", async ({
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
    await page.getByLabel("Motivo del cierre").fill("Conflicto ficticio E2E");
    const attemptKey = page.getByTestId("cierre-attempt-key");
    await expect(attemptKey).toHaveText(/^[0-9a-f-]{36}$/);
    const keyBefore = await attemptKey.innerText();

    let stale = true;
    await page.route("**/api/cierres/1/cerrar", async (route) => {
      if (!stale) return route.continue();
      stale = false;
      const body = JSON.parse(route.request().postData() ?? "{}");
      const target = new URL(route.request().url());
      target.port = String(port);
      const response = await route.fetch({
        url: target.toString(),
        postData: JSON.stringify({ ...body, fingerprint: "0".repeat(64) }),
      });
      await route.fulfill({ response });
    });

    await page.getByRole("button", { name: "Confirmar cierre", exact: true }).click();
    await expect(
      page.getByText(/La vista previa ha cambiado/),
    ).toBeVisible();
    await expect(page.getByText("Código: REVISION_CONFLICT")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Fotografía de cierre" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `${ARTIFACTS}/conflicto-409-1440.png`,
      fullPage: true,
    });

    await page.unroute("**/api/cierres/1/cerrar");
    await page
      .getByRole("button", { name: "Actualizar revisión y reintentar" })
      .click();
    // La recarga del preflight termina cuando la clave de intento cambia.
    await expect(attemptKey).not.toHaveText(keyBefore);
    await expect(
      page.getByRole("button", { name: "Confirmar cierre", exact: true }),
    ).toBeEnabled();
    // El motivo escrito se conserva tras actualizar la revisión.
    await expect(page.getByLabel("Motivo del cierre")).toHaveValue(
      "Conflicto ficticio E2E",
    );
    await page.getByRole("button", { name: "Confirmar cierre", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Fotografía v1", exact: true }),
    ).toBeVisible();

    const state = await page.request.get(
      `http://127.0.0.1:${port}/api/cierres/1/estado`,
    );
    expect((await state.json()).cierre.version).toBe(1);
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.9 UI: preflight bloqueado por E3.5 y backup, sin foto parcial", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "bloqueado");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    await expect(page.getByText("Bloqueado", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("E35_NO_VERIFICABLE", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(/E3\.5\/FIN_NETA no verificable \(fixture de bloqueo\)/).first(),
    ).toBeVisible();
    await expect(
      page.getByText("BACKUP_NO_VERIFICABLE", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("El cierre está bloqueado", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar cierre", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("region", { name: "Fotografía de cierre" }),
    ).toHaveCount(0);
    expect(
      (await page.request.get(`http://127.0.0.1:${port}/api/cierres/1/foto`))
        .status(),
    ).toBe(404);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoOverflow(page);
    await page.screenshot({
      path: `${ARTIFACTS}/bloqueado-390.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.9 UI: DT6 sin referencia no se marca Acreditado y bloquea", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "backup-sin-referencia");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    await expect(
      page.getByText("BACKUP_NO_VERIFICABLE", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("No acreditado", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Acreditado", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/Falta la referencia de manifiesto\/checksum\/clave/).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar cierre", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("region", { name: "Fotografía de cierre" }),
    ).toHaveCount(0);
    expect(
      (await page.request.get(`http://127.0.0.1:${port}/api/cierres/1/foto`))
        .status(),
    ).toBe(404);

    await page.screenshot({
      path: `${ARTIFACTS}/backup-sin-referencia-1440.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.9 UI: SIN_SIGUIENTE_INICIO no inventa Fin ni permite cerrar", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "sin-siguiente");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    await expect(
      page.getByText("SIN_SIGUIENTE_INICIO", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("No derivable", { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Sin siguiente Inicio no se inventa un Fin/),
    ).toBeVisible();
    await page.screenshot({
      path: `${ARTIFACTS}/sin-siguiente-1440.png`,
      fullPage: true,
    });
    await expect(
      page.getByRole("button", { name: "Confirmar cierre", exact: true }),
    ).toBeDisabled();
  } finally {
    child.kill();
  }
});

test("E4.9 UI: «Sin hechos» no acreditado por fuente ilegible bloquea", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "fuente");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    await expect(page.getByText("FUENTE_NO_LEGIBLE").first()).toBeVisible();
    await expect(
      page.getByText(/no se acredita ausencia|no se acreditó la ausencia/i).first(),
    ).toBeVisible();
    await expect(page.getByText("Con hechos", { exact: true })).toBeVisible();
    await expect(page.getByText("Sin hechos", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Confirmar cierre", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("region", { name: "Fotografía de cierre" }),
    ).toHaveCount(0);
  } finally {
    child.kill();
  }
});

test("E4.9 UI: cierre fuera de orden exige motivo y audita", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "fuera-orden");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    await expect(
      page.getByText("CIERRE_FUERA_DE_ORDEN", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Hay cierres posteriores coherentes/),
    ).toBeVisible();
    await expect(
      page.getByText("Fuera de orden", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("obligatorio", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `${ARTIFACTS}/fuera-de-orden-1440.png`,
      fullPage: true,
    });

    await page.getByRole("button", { name: "Confirmar cierre", exact: true }).click();
    await expect(page.getByText("Código: MOTIVO_REQUERIDO")).toBeVisible();
    await expect(
      page.getByText("Indica el motivo del cierre fuera de orden.", {
        exact: true,
      }),
    ).toBeVisible();
    // Un 422 de motivo no es reintentable con la misma clave: se corrige el motivo.
    await expect(
      page.getByRole("button", { name: "Reintentar cierre (misma clave)" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Fotografía de cierre" }),
    ).toHaveCount(0);

    await page
      .getByLabel("Motivo del cierre")
      .fill("Cierre tardío ficticio E2E");
    await page.getByRole("button", { name: "Confirmar cierre", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Fotografía v1", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Cierre tardío ficticio E2E", { exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.9 UI: INCOHERENCIA_CON_CIERRE_POSTERIOR bloquea sin foto", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "incoherente");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");
    await expect(
      page.getByText("INCOHERENCIA_CON_CIERRE_POSTERIOR", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Incoherencia", { exact: true }).first()).toBeVisible();
    await page.screenshot({
      path: `${ARTIFACTS}/incoherencia-1440.png`,
      fullPage: true,
    });
    await expect(
      page.getByRole("button", { name: "Confirmar cierre", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("region", { name: "Fotografía de cierre" }),
    ).toHaveCount(0);
    expect(
      (await page.request.get(`http://127.0.0.1:${port}/api/cierres/1/foto`))
        .status(),
    ).toBe(404);
  } finally {
    child.kill();
  }
});

test("E4.9 UI: sin ciclos no ofrece cierre", async ({ page, request }) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "sin-ciclo");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await expect(
      page.getByRole("heading", { name: "Sin ciclos para cerrar", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `${ARTIFACTS}/sin-ciclos-1440.png`,
      fullPage: true,
    });
    await expect(
      page.getByRole("button", { name: "Confirmar cierre", exact: true }),
    ).toHaveCount(0);
  } finally {
    child.kill();
  }
});

test("E4.9 navegación: shell y /inicio enlazan al cierre sin romper rutas", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "nav");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page
      .getByRole("link", { name: /Cierre/ })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Cierre financiero", exact: true }),
    ).toBeVisible();

    await page.goto("/inicio");
    await expect(
      page.getByRole("heading", { name: "Inicio", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Ver cierre del ciclo" }).click();
    await expect(page).toHaveURL(/\/cierre\?ciclo=\d+$/);
    await expect(
      page.getByRole("heading", { name: "Cierre financiero", exact: true }),
    ).toBeVisible();
  } finally {
    child.kill();
  }
});

/**
 * E4.10 I7 — UI de reapertura, rectificación y re-cierre.
 *
 * Fixtures sintéticas: un ciclo con v1 cerrada y ventana abierta, y un cierre
 * no último para comprobar que la acción no se ofrece. No se usan datos reales
 * ni se acredita DT6: la evidencia de backup es inyectada por el servidor de
 * test y sigue sin autorizar un cierre real.
 */
const ARTIFACTS_E410 = "artifacts/e4-10";

test("E4.10 UI: reabrir v1, ver el impacto y re-cerrar v2 con comparación", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  mkdirSync(ARTIFACTS_E410, { recursive: true });
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "e410-reabierto");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");

    // Elegibilidad: el último cierre ofrece reabrir y explica qué no cambia.
    await expect(
      page.getByText(
        /v1 es la última versión cerrada y no existe un cierre posterior/,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reabrir el último cierre", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Reabrir el último cierre", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Confirmar reapertura de v1", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/v1 y su foto quedan\s+intactas/),
    ).toBeVisible();
    await expect(page.getByText(/S0,\s+inicio,\s+Fin/)).toBeVisible();
    await expect(page.getByTestId("e410-reopen-key")).toHaveText(
      /^[0-9a-f-]{36}$/,
    );

    await page
      .getByLabel("Motivo de la reapertura", { exact: false })
      .fill("Reapertura ficticia E4.10");
    await page
      .getByRole("button", { name: "Confirmar reapertura", exact: true })
      .click();

    // Estado reabierto y advertencia de foto no vigente.
    await expect(
      page.getByRole("heading", { name: "Ciclo reabierto", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Reabierto · v1", { exact: true }).first()).toBeVisible();
    const statusPanel = page.locator('[aria-label="Estado del cierre"]');
    await expect(statusPanel.getByText("Reabierto · v1", { exact: true })).toBeVisible();
    await expect(statusPanel.getByText("Cerrado", { exact: true })).toHaveCount(0);
    await expect(
      statusPanel.getByText(/Ciclo reabierto: ventana de rectificación activa/),
    ).toBeVisible();
    await expect(
      page.getByText(/Ventana de rectificación abierta sobre v1/),
    ).toBeVisible();
    await expect(
      page.getByText(/La fotografía v1 no es la vista viva/),
    ).toBeVisible();
    await expect(
      page.getByText("Reabierto · foto v1 no vigente", { exact: true }),
    ).toBeVisible();
    // Preparación del re-cierre: diferencias, revalidación y backup visibles.
    await expect(
      page.getByRole("heading", { name: "Preparación del re-cierre", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("ConCambios", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/El bloque material hechos difiere/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Revalidación de dependencias posteriores", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Acreditado", { exact: true }).first()).toBeVisible();
    // La cancelación sin foto no se ofrece cuando hay cambios materiales.
    await expect(
      page.getByText(/La comparación actual es/),
    ).toBeVisible();
    await expect(
      page.getByText(/No se\s+ofrece la cancelación sin foto/),
    ).toBeVisible();

    await expect(page.getByTestId("e410-recierre-key")).toHaveText(
      /^[0-9a-f-]{36}$/,
    );
    await page
      .getByLabel("Motivo del re-cierre", { exact: false })
      .fill("Hecho rectificado en la ventana");
    await page
      .getByRole("button", { name: "Confirmar re-cierre v2", exact: true })
      .click();

    // Resultado: v2 creada, v1 conservada y comparación lado a lado.
    await expect(
      page.getByRole("heading", { name: "Fotografía v2 creada", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/v1 se conserva intacta y consultable/),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "v1 (persistida)", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "v2 (persistida)", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Gasto ficticio de rectificación E4.10", { exact: false }),
    ).not.toBeVisible();
    await expect(
      page.getByText(/Con hechos · 1 movimiento/).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Consultar v1", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Consultar v2", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Valores persistidos de cada fotografía/),
    ).toBeVisible();

    const state = await page.request.get(
      `http://127.0.0.1:${port}/api/cierres/1/estado`,
    );
    expect(state.status()).toBe(200);
    const body = await state.json();
    expect(body.cierre.version).toBe(2);
    expect(body.reapertura.estado).toBe("Cerrado");
    expect(body.reapertura.version).toBe(2);
    expect(body.reapertura.elegibilidad.puedeReabrir).toBe(true);
    expect(
      (await page.request.get(`http://127.0.0.1:${port}/api/cierres/1/foto?version=1`))
        .status(),
    ).toBe(200);
    expect(
      (await page.request.get(`http://127.0.0.1:${port}/api/cierres/1/foto?version=2`))
        .status(),
    ).toBe(200);

    // Evidencia visual 1440/390 en los tres temas vigentes.
    const theme = page.getByLabel("Tema visual");
    for (const id of ["light-s", "dark-s", "hybrid-s"] as const) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await theme.selectOption(id);
      await expect(page.locator("html")).toHaveAttribute("data-theme", id);
      await expectNoOverflow(page);
      await page.screenshot({
        path: `${ARTIFACTS_E410}/resultado-${id}-1440.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expectNoOverflow(page);
      await page.screenshot({
        path: `${ARTIFACTS_E410}/resultado-${id}-390.png`,
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.10 UI: un cierre no último no ofrece reabrir y muestra el motivo", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  mkdirSync(ARTIFACTS_E410, { recursive: true });
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "e410-no-ultimo");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");

    await expect(
      page.getByRole("button", { name: "Reabrir el último cierre", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText(/No reabrible\./)).toBeVisible();
    await expect(
      page.getByText(/existe un cierre posterior del ciclo 2/),
    ).toBeVisible();
    await expect(page.getByText(/Cierre posterior: ciclo 2 · v1/)).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACTS_E410}/no-ultimo-1440.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoOverflow(page);
    await page.screenshot({
      path: `${ARTIFACTS_E410}/no-ultimo-390.png`,
      fullPage: true,
    });

    // El ciclo 2 sí es último y ofrece la acción.
    await page.getByLabel("Ciclo").selectOption("2");
    await expect(
      page.getByRole("button", { name: "Reabrir el último cierre", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.10 UI: SIN_CAMBIOS no crea foto y permite cancelar la reapertura (D8)", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  mkdirSync(ARTIFACTS_E410, { recursive: true });
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "e410-sin-cambios");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");

    await page
      .getByRole("button", { name: "Reabrir el último cierre", exact: true })
      .click();
    await page
      .getByLabel("Motivo de la reapertura", { exact: false })
      .fill("Reapertura sin cambios ficticia E4.10");
    await page
      .getByRole("button", { name: "Confirmar reapertura", exact: true })
      .click();

    await expect(
      page.getByRole("heading", { name: "Ciclo reabierto", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("SinCambios", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(/SIN_CAMBIOS\. No se crea una foto nueva/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Confirmar re-cierre v2/ }),
    ).toHaveCount(0);

    const cancelButton = page.getByRole("button", {
      name: "Cancelar reapertura sin foto",
      exact: true,
    });
    await expect(cancelButton).toBeEnabled();
    await cancelButton.click();
    await page
      .getByLabel("Motivo de la cancelación", { exact: false })
      .fill("No hubo cambios materiales");
    await expect(page.getByTestId("e410-cancel-key")).toHaveText(
      /^[0-9a-f-]{36}$/,
    );
    await page
      .getByRole("button", { name: "Confirmar cancelación sin foto", exact: true })
      .click();

    await expect(
      page.getByText(/Cancelación registrada: el ciclo vuelve a Cerrado\(v1\) sin foto nueva/),
    ).toBeVisible();

    const state = await page.request.get(
      `http://127.0.0.1:${port}/api/cierres/1/estado`,
    );
    expect(state.status()).toBe(200);
    const body = await state.json();
    expect(body.cierre.version).toBe(1);
    expect(body.reapertura.estado).toBe("Cerrado");
    expect(body.reapertura.version).toBe(1);
    expect(body.reapertura.reapertura).toBeNull();
    expect(
      (await page.request.get(`http://127.0.0.1:${port}/api/cierres/1/foto?version=1`))
        .status(),
    ).toBe(200);
    expect(
      (
        await page.request.get(
          `http://127.0.0.1:${port}/api/cierres/1/foto?version=2`,
        )
      ).status(),
    ).toBe(404);

    await page.screenshot({
      path: `${ARTIFACTS_E410}/cancelacion-sin-cambios-1440.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoOverflow(page);
    await page.screenshot({
      path: `${ARTIFACTS_E410}/cancelacion-sin-cambios-390.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
