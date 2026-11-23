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
 * SPEC38 · I2 · #555 — la consulta de fotografías se retira.
 *
 * Esta spec conserva **la intención** de cada prueba de E4.11 y la reescribe
 * contra el contrato vigente; no se borra ninguna expectativa, se sustituye:
 *
 * | E4.11 (retirado)                                   | Equivalente nuevo                                             |
 * | -------------------------------------------------- | ------------------------------------------------------------- |
 * | Foto v1 inmutable frente a T2/T3                   | No hay foto que congelar: `410 FOTO_RETIRADA` y lectura viva   |
 * | Selector de versión y comparación v1/v2            | No hay versiones: `410`; la divergencia la da `validacion`     |
 * | Composición de trimestre/año y drill-down          | `410 FOTOS_RETIRADAS` sin sustituto: no se promete ese informe |
 * | Ciclo reabierto sin v2 y badge `PendienteReCierre` | `Pendiente` del conjunto, único estado con limpieza humana     |
 * | Agregado persistido inmutable tras re-cierre       | Sin agregados persistidos: `huellaVigente` de la lectura viva  |
 * | Matriz negativa 401/404/405/422 y snapshot         | 401, `410` por código, `405` de sólo lectura y cero escrituras |
 * | Estados vacío/carga/error y regiones               | Estados de la validación, foco en el `h1` y regiones rotuladas |
 * | Sin ciclos no ofrece consulta ni crea datos        | Sin ciclos no ofrece validación ni crea datos                  |
 *
 * Cada test arranca el fixture aislado `cierre-server.ts` (fixtures ficticias y
 * MFA real). No se usa producción ni datos reales; las capturas son evidencia,
 * no un PASS visual ni una aceptación del testplan.
 */
const FIXTURES = {
  principal: fixtureContext("fotos-principal"),
  reabierto: fixtureContext("fotos-reabierto"),
  recierre: fixtureContext("fotos-recierre"),
  "sin-ciclo": fixtureContext("fotos-sin-ciclo"),
  "sin-contrato": fixtureContext("fotos-sin-contrato"),
} as const;

type Scenario = keyof typeof FIXTURES;

/** Escenario del fixture de validación para cada alias de esta spec. */
const SCENARIO: Record<Scenario, string> = {
  principal: "listo",
  reabierto: "pendiente",
  recierre: "validada",
  "sin-ciclo": "sin-ciclo",
  "sin-contrato": "sin-contrato",
};

const artifacts = artifactDir("e411-i6-retirada");
const ORIGIN = process.env.E411_ORIGIN ?? contextFromEnv().webOrigin;

async function startServer(request: APIRequestContext, alias: Scenario) {
  const fixture = FIXTURES[alias];
  const scenario = SCENARIO[alias];
  const child: ChildProcess = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/cierre-server.ts"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...fixture.env,
        E49_SCENARIO: scenario,
        E49_PORT: String(fixture.port),
        E410_ORIGIN: ORIGIN,
      },
    },
  );
  let output = "";
  let exit: { code: number | null; signal: NodeJS.Signals | null } | null = null;
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
      child.kill();
      throw error;
    });
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
      // La navegación puede cancelar una petición en vuelo.
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
    .fill("Clave ficticia E4.11 retirada " + randomUUID());
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

async function api(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(
    async ({ path, method, body }) => {
      const session = await (await fetch("/api/auth/session")).json();
      const response = await fetch("/api" + path, {
        method,
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": session.csrf,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {}
      return { status: response.status, data: data as Record<string, any> };
    },
    { path, method, body },
  );
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

/** Evidencia visual en 1440×1000 y 390×844 con los tres temas vigentes. */
async function capture(page: Page, name: string) {
  const theme = page.getByLabel("Cambiar tema");
  for (const id of ["light-s", "dark-s", "hybrid-s"] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await theme.selectOption(id);
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    await expectNoOverflow(page);
    await page.screenshot({
      path: join(artifacts, `${name}-${id}-1440.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoOverflow(page);
    await page.screenshot({
      path: join(artifacts, `${name}-${id}-390.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await theme.selectOption("light-s");
}

test("I2 API/UI · no hay foto que congelar: 410 FOTO_RETIRADA y lectura viva tras T3", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "principal");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");

    // La foto de cierre no existe: ni lectura, ni captura inmutable.
    const foto = await api(page, "/cierres/1/foto");
    expect(foto.status).toBe(410);
    expect(foto.data.code).toBe("FOTO_RETIRADA");
    expect(foto.data.sustituto).toBe("/api/cierres/1/estado");
    await expect(
      page.getByRole("region", { name: "Fotografía de cierre" }),
    ).toHaveCount(0);
    await expect(page.getByText(/Registro inmutable/)).toHaveCount(0);

    // T3 equivalente: renombrar una Partida es una escritura ordinaria; no hay
    // registro congelado que comparar ni recálculo que proteger.
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
            nombre: "Partida renombrada E2E",
            revision: 1,
          }),
        })
      ).status;
    });
    expect(renamed).toBe(200);
    const estado = await api(page, "/cierres/1/estado");
    expect(estado.status).toBe(200);
    expect(estado.data.validacion.estado).toBe("SinValidar");
    // La lectura viva expone su huella; ninguna foto la duplica ni la sustituye.
    expect(estado.data.validacion.huellaVigente).toMatch(/^[a-f0-9]{64}$/);
    expect(estado.data.validacion.huellaValidacion).toBeNull();
    expect((await api(page, "/cierres/1/foto")).status).toBe(410);

    await capture(page, "retirada-foto");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("I2 API/UI · sin selector de versión ni comparación v1/v2", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "principal");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");

    for (const version of [1, 2]) {
      const foto = await api(page, `/cierres/1/foto?version=${version}`);
      expect(foto.status, `v${version}`).toBe(410);
      expect(foto.data.code).toBe("FOTO_RETIRADA");
    }
    const versiones = await api(page, "/fotos/ciclos/1/versiones");
    expect(versiones.status).toBe(410);
    expect(versiones.data.code).toBe("FOTOS_RETIRADAS");

    // La pantalla no ofrece versión ni comparación: no hay nada que elegir.
    await expect(page.getByLabel(/versión/i)).toHaveCount(0);
    await expect(
      page.getByRole("columnheader", { name: "v1 (persistida)", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Consultar v1", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText(/Valores persistidos/)).toHaveCount(0);
  } finally {
    child.kill();
  }
});

test("I2 API/UI · la composición de periodo se retira sin sustituto declarado", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "principal");
  try {
    await routeApi(page, port);
    await login(page, dir);

    for (const path of ["/fotos/periodos", "/fotos/periodos/1", "/fotos/ciclos/1"]) {
      const result = await api(page, path);
      expect(result.status, path).toBe(410);
      expect(result.data.code, path).toBe("FOTOS_RETIRADAS");
      // No se promete un informe vivo equivalente: `sustituto` es null.
      expect(result.data.sustituto, path).toBeNull();
    }

    // La ruta de la aplicación ya no existe: no hay formulario de periodo,
    // ni selector de trimestre/año.
    await page.goto("/fotos");
    await expect(
      page.getByText("Página no encontrada.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Fotografías", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel(/Trimestre/)).toHaveCount(0);
  } finally {
    child.kill();
  }
});

test("I2 API/UI · un ciclo marcado es «Pendiente», no «reabierto»", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "reabierto");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");

    // Sustitución de «Reabierto · v1» y `PendienteReCierre`: hay un único
    // estado pendiente y su limpieza es humana, no una nueva foto.
    await expect(
      page.locator('.ui-badge[data-estado="Pendiente"]'),
    ).toBeVisible();
    await expect(page.getByText(/Reabierto/)).toHaveCount(0);
    await expect(page.getByText(/PendienteReCierre/)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Confirmar revisión", exact: true }),
    ).toBeVisible();

    const estado = await api(page, "/cierres/1/estado");
    expect(estado.data.validacion.estado).toBe("Pendiente");
    expect(estado.data.validacion.dirty).toBe(true);
    // La exclusión del periodo era una regla de la foto; sin foto, la lectura
    // es el estado y la reapertura responde 410.
    expect(estado.data).not.toHaveProperty("reapertura");
    expect((await api(page, "/cierres/1/reapertura")).status).toBe(410);
    await capture(page, "pendiente");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("I2 API · sin agregado persistido: la huella vigente es la única lectura", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "recierre");
  try {
    await routeApi(page, port);
    await login(page, dir);
    await page.getByLabel("Ciclo").selectOption("1");

    const first = await api(page, "/cierres/1/estado");
    const second = await api(page, "/cierres/1/estado");
    expect(first.data.validacion.estado).toBe("Validada");
    expect(second.data.validacion.huellaVigente).toBe(
      first.data.validacion.huellaVigente,
    );
    // No hay agregado A1/A2 que consultar: las rutas de agregado se retiraron.
    const agregado = await api(page, "/fotos/periodos/1");
    expect(agregado.status).toBe(410);
    expect(agregado.data.code).toBe("FOTOS_RETIRADAS");
    await expect(page.getByText(/\bA2\b/)).toHaveCount(0);
  } finally {
    child.kill();
  }
});

test("I2 API · matriz negativa: 401, 410 por código, 405 de sólo lectura y cero escrituras", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "principal");
  try {
    // Sin sesión, ninguna ruta retirada se expone.
    for (const path of ["/cierres/1/foto", "/fotos/periodos", "/cierres/1/estado"])
      expect(
        (await request.get(`http://127.0.0.1:${port}/api${path}`)).status(),
        path,
      ).toBe(401);

    await routeApi(page, port);
    await login(page, dir);
    const before = await api(page, "/cierres/1/estado");

    // Retiradas: 410 con su código, nunca 3xx, 404 ambiguo o 500.
    for (const [path, code] of [
      ["/cierres/1/cerrar", "CIERRE_FOTOGRAFICO_RETIRADO"],
      ["/cierres/1/cierre", "CIERRE_FOTOGRAFICO_RETIRADO"],
      ["/cierres/1/preflight", "CIERRE_FOTOGRAFICO_RETIRADO"],
      ["/cierres/1/foto", "FOTO_RETIRADA"],
      ["/cierres/1/reabrir", "REAPERTURA_RETIRADA"],
      ["/cierres/1/recerrar", "REAPERTURA_RETIRADA"],
      ["/cierres/1/cancelar", "REAPERTURA_RETIRADA"],
      ["/cierres/1/revalidacion", "REAPERTURA_RETIRADA"],
      ["/fotos/periodos", "FOTOS_RETIRADAS"],
      ["/fotos/contraste?ciclo=1", "FOTO_RETIRADA"],
    ] as const) {
      const result = await api(page, path);
      expect(result.status, path).toBe(410);
      expect(result.data.code, path).toBe(code);
    }

    // Sólo lectura: el estado y su preview se leen con GET.
    for (const path of ["/cierres/1/estado", "/cierres/1/validacion/preview"]) {
      const result = await api(page, path, "POST", {});
      expect(result.status, path).toBe(405);
    }
    const validarGet = await api(page, "/cierres/1/validar");
    expect(validarGet.status).toBe(405);

    // Las rutas retiradas no escriben: el estado sigue siendo el mismo.
    const after = await api(page, "/cierres/1/estado");
    expect(after.data.validacion).toEqual(before.data.validacion);
    expect(after.data.revision).toBe(before.data.revision);
  } finally {
    child.kill();
  }
});

test("I2 UI · estados de la validación: foco en el título y regiones rotuladas", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const { child, port, dir } = await startServer(request, "principal");
  try {
    await routeApi(page, port);
    await login(page, dir);
    // El shell enfoca el `h1` al cambiar de ruta, como en el resto de pantallas.
    const heading = page.getByRole("heading", {
      name: "Validación del cierre",
      exact: true,
    });
    await expect(heading).toBeFocused();

    await page.getByLabel("Ciclo").selectOption("1");
    await expect(
      page.locator('[aria-label="Contexto de la validación"]'),
    ).toBeVisible();
    await expect(page.locator('[aria-label="Estado de validación"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Actualizar estado", exact: true }),
    ).toBeEnabled();
  } finally {
    child.kill();
  }
});

test("I2 UI · 503 visible, sin «Sin validar» y sin convertir el fallo en vacío", async ({
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
      page.getByRole("alert").filter({
        hasText: "El estado de validación no está disponible.",
      }),
    ).toBeVisible();
    await expect(page.locator('.ui-badge[data-estado="SinValidar"]')).toHaveCount(0);
    await expect(page.getByText("Sin ciclos para validar")).toHaveCount(0);
    await capture(page, "no-disponible");
  } finally {
    child.kill();
  }
});

test("I2 UI · sin ciclos no ofrece consulta ni crea datos", async ({
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
    await expect(
      page.getByRole("button", { name: "Validar", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Confirmar revisión", exact: true }),
    ).toHaveCount(0);
    await capture(page, "sin-ciclos");
    const cycles = await page.request.get(
      `http://127.0.0.1:${port}/api/ciclos?estado=`,
    );
    expect((await cycles.json()).total).toBe(0);
  } finally {
    child.kill();
  }
});