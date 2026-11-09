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
 * E4.11 I6 — E2E, accesibilidad y evidencia de `/fotos`.
 *
 * Cada test arranca un servidor API aislado (`apps/api/test-support/e411-
 * server.ts`) con MFA real, rutas reales y fixtures ficticias. No se usa
 * producción, no se leen datos reales y las capturas son evidencia, no un
 * PASS visual ni una aceptación del testplan.
 *
 * Los fixtures no acreditan DT6 ni DT7. El testplan E4.11 sigue UNRUN.
 *
 * Cobertura de evidencia (no declara PASS): AC01/AC02 en el test 1; AC03 en
 * el test 2; AC04/AC05/AC08/AC09/AC11/AC15 en el test 3; AC06 en el test 4;
 * AC07 en el test 5; AC10/AC12/AC13/AC14 en el test 6; estados y
 * accesibilidad en los tests 7 y 8.
 */

const PORTS = {
  principal: 3050,
  reabierto: 3051,
  recierre: 3052,
  "sin-ciclo": 3053,
} as const;

type Scenario = keyof typeof PORTS;

const SERVER_NOW = Date.parse("2027-06-15T12:00:00Z");
const ARTIFACTS = "artifacts/e411-i6";
const ORIGIN = process.env.E411_ORIGIN ?? "http://127.0.0.1:5173";

type ApiResult = {
  status: number;
  allow: string | null;
  data: any;
};

/** By-id reads are explicit and never carry the automatic latest marker. */
function conConsultaPorId<T extends { seleccionVersion: { porDefecto: boolean } }>(
  dto: T,
): T {
  return {
    ...dto,
    seleccionVersion: { ...dto.seleccionVersion, porDefecto: false },
  };
}

function apiUrl(port: number, path: string) {
  return `http://127.0.0.1:${port}/api${path}`;
}

async function startServer(request: APIRequestContext, scenario: Scenario) {
  const port = PORTS[scenario];
  mkdirSync(ARTIFACTS, { recursive: true });
  const child: ChildProcess = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/e411-server.ts"],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        E411_SCENARIO: scenario,
        E411_PORT: String(port),
        E411_ORIGIN: ORIGIN,
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
      child.kill();
      throw error;
    });
  return { child, port, dir: `.local/e2e-e411-${scenario}` };
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

async function login(page: Page, dir: string, path = "/fotos") {
  await page.goto(path);
  await page
    .getByLabel("Código de activación")
    .fill(readFileSync(dir + "/bootstrap.txt", "utf8"));
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Clave ficticia E4.11 E2E " + randomUUID());
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".secret")).toBeVisible();
  const secret = (await page.locator(".secret").textContent())!;
  await page
    .getByLabel("Código de la aplicación autenticadora")
    .fill(totp(secret).generate({ timestamp: SERVER_NOW }));
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
    page.getByRole("heading", { name: "Fotografías", exact: true }),
  ).toBeVisible();
}

async function api(
  page: Page,
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<ApiResult> {
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
        allow: response.headers.get("allow"),
        data,
      };
    },
    { path, method, body, headers },
  ) as Promise<ApiResult>;
}

async function snapshot(request: APIRequestContext, port: number) {
  const response = await request.get(
    `http://127.0.0.1:${port}/__e411/snapshot`,
  );
  expect(response.status()).toBe(200);
  return response.json();
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
  const theme = page.getByLabel("Tema visual");
  for (const id of ["light-s", "dark-s", "hybrid-s"] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await theme.selectOption(id);
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    await expectNoOverflow(page);
    await page.screenshot({
      path: `${ARTIFACTS}/${name}-${id}-1440.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoOverflow(page);
    await page.screenshot({
      path: `${ARTIFACTS}/${name}-${id}-390.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await theme.selectOption("light-s");
}

test("E4.11 UI/API: foto v1 inmutable tras T2/T3 y contraste vivo etiquetado", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "principal");
  try {
    await routeApi(page, port);
    await login(page, dir, "/fotos?modo=ciclo&ciclo=1");

    const photo = page.getByRole("region", { name: "Foto del ciclo" });
    await expect(photo).toBeVisible();
    await expect(
      photo.getByRole("heading", { name: "Ciclo 1 · v1", exact: true }),
    ).toBeVisible();
    await expect(
      photo.locator(".ui-badge").filter({ hasText: "Foto" }).first(),
    ).toBeVisible();
    await expect(
      photo.locator(".ui-badge").filter({ hasText: "Vigente" }).first(),
    ).toBeVisible();
    await expect(
      photo.getByText("01/01/2026 → 31/01/2026", { exact: true }),
    ).toBeVisible();
    await expect(photo.getByText("usuario-unico", { exact: true })).toBeVisible();
    await expect(photo.getByText(/0\.0\.0-e2e · 27/)).toBeVisible();
    await expect(
      photo.getByText("2027-06-15 12:00 UTC", { exact: true }),
    ).toBeVisible();
    await expect(photo.getByText(/Sin hechos · 0 movimientos/)).toBeVisible();
    await expect(
      photo.getByText("Cierre ficticio E4.11 v1", { exact: true }),
    ).toBeVisible();
    const fingerprint = (
      await photo.locator(".fotos-fingerprint").first().textContent()
    )!;
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);

    const before = (await api(page, "/fotos/ciclos/1")).data;
    expect(before).toMatchObject({
      origen: "Foto",
      estadoFoto: "Disponible",
      estado: "Disponible",
      seleccionAplicada: { version: 1, porDefecto: true, regla: "P7-D" },
      vigente: true,
      foto: {
        version: 1,
        appVersion: "0.0.0-e2e",
        schemaVersion: 27,
        ventana: { inicio: "2026-01-01", fin: "2026-01-31" },
      },
    });
    const snapshotBefore = await snapshot(request, port);

    // T3: renombrar una Partida capturada por la foto. T2 queda representado
    // por el hecho sintético insertado por el fixture después de todos los
    // cierres; ninguna de las dos escrituras puede mover la foto.
    const renamed = await api(
      page,
      "/clasificacion/partidas/PAR411",
      "PATCH",
      { nombre: "Partida renombrada E4.11 E2E", revision: 1 },
    );
    expect(renamed.status).toBe(200);
    const after = (await api(page, "/fotos/ciclos/1")).data;
    expect(after).toEqual(before);
    expect(JSON.stringify(after)).toContain("Partida ficticia E4.11");
    expect(JSON.stringify(after)).not.toContain("Partida renombrada E4.11 E2E");
    expect(await snapshot(request, port)).toEqual(snapshotBefore);

    const live = page.getByRole("region", {
      name: "Cálculo vivo etiquetado",
    });
    await expect(live).toBeVisible();
    await expect(live.getByText("Actual", { exact: true })).toBeVisible();
    await expect(
      live.getByText("E2.6 flujo-mensual", { exact: true }),
    ).toBeVisible();
    await expect(
      live.getByText("Nómina", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      live.getByText("1.234,00 €", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      live.getByText("No · cálculo vivo", { exact: true }),
    ).toBeVisible();
    await expect(
      live.getByText(/no es la foto ni un cierre histórico/).first(),
    ).toBeVisible();
    const contrast = (await api(page, "/fotos/contraste?ciclo=1")).data;
    expect(contrast).toMatchObject({
      origen: "CalculoVivo",
      motor: "E2.6 flujo-mensual",
      noEsHistorico: true,
      noSustituyeFoto: true,
      soloLectura: true,
    });
    expect(contrast.revision).toMatch(/^[a-f0-9]{64}$/);
    expect(contrast.metricas.nomina).toMatchObject({
      origen: "CalculoVivo",
      noEsHistorico: true,
      subtotal: "1234.00",
    });

    const noDisponible = page.getByRole("region", {
      name: "Bloques no disponibles de la foto",
    });
    await expect(
      noDisponible.getByText("Valoración / patrimonio", { exact: true }),
    ).toBeVisible();
    await expect(
      noDisponible.getByText(/E4\.3 valoración\/patrimonio no implementado/),
    ).toBeVisible();
    await expect(
      noDisponible.getByText(/E4\.4 conciliaciones de Deuda fuera de la foto/),
    ).toBeVisible();

    // El contraste vivo no completa ningún bloque No disponible de la foto.
    const afterContrast = (await api(page, "/fotos/ciclos/1")).data;
    expect(afterContrast.foto.noDisponible).toEqual(before.foto.noDisponible);
    expect(afterContrast).toEqual(before);

    await capture(page, "ciclo-v1-contraste");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.11 UI/API: selector de versión, comparación v1/v2, SinFoto y 404 sin fallback", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "principal");
  try {
    await routeApi(page, port);
    await login(page, dir, "/fotos?modo=ciclo&ciclo=2");

    await expect(
      page.getByRole("heading", { name: "Ciclo 2 · v2", exact: true }),
    ).toBeVisible();
    const versionSelect = page.getByRole("combobox", {
      name: "Versión",
      exact: true,
    });
    await expect(versionSelect.locator("option")).toHaveCount(3);
    await expect(versionSelect.locator('option[value="2"]')).toContainText(
      "v2 · vigente",
    );
    await expect(versionSelect.locator('option[value="1"]')).toContainText(
      "v1 · histórica",
    );
    await expect(
      page.getByRole("button", { name: "Consultar la versión 2" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Consultar la versión 1" }).first(),
    ).toBeVisible();

    await versionSelect.selectOption("1");
    await expect(page).toHaveURL(/version=1/);
    await expect(
      page.getByRole("heading", { name: "Ciclo 2 · v1", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Versión v1 solicitada explícitamente; no hay fallback silencioso.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Foto del ciclo" })
        .locator(".ui-badge")
        .filter({ hasText: "No vigente" })
        .first(),
    ).toBeVisible();
    const v1 = (await api(page, "/fotos/ciclos/2?version=1")).data;
    expect(v1).toMatchObject({
      seleccionAplicada: { version: 1, porDefecto: false, regla: "P7-D" },
      vigente: false,
      foto: { version: 1 },
    });
    const v2 = (await api(page, "/fotos/ciclos/2?version=2")).data;
    expect(v2).toMatchObject({
      seleccionAplicada: { version: 2, porDefecto: false, regla: "P7-D" },
      vigente: true,
      foto: { version: 2 },
    });
    expect((await api(page, "/fotos/ciclos/2/versiones")).data).toEqual([
      expect.objectContaining({
        version: 2,
        esUltima: true,
        vigente: true,
      }),
      expect.objectContaining({
        version: 1,
        esUltima: false,
        vigente: false,
      }),
    ]);

    await versionSelect.selectOption("2");
    await expect(
      page.getByRole("heading", { name: "Ciclo 2 · v2", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Versión v2 solicitada explícitamente; no hay fallback silencioso.",
        { exact: true },
      ),
    ).toBeVisible();
    await versionSelect.selectOption("");
    await expect(
      page.getByText(
        "No se pidió versión: se consultó automáticamente la última persistida (regla P7-D).",
        { exact: true },
      ),
    ).toBeVisible();

    const v1BeforeCompare = (await api(page, "/fotos/ciclos/2?version=1"))
      .data;
    await expect(
      page.getByRole("combobox", { name: "Versión A", exact: true }),
    ).toHaveValue("1");
    await expect(
      page.getByRole("combobox", { name: "Versión B", exact: true }),
    ).toHaveValue("2");
    await page
      .getByRole("button", { name: "Comparar versiones", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Versión A · v1", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Versión B · v2", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/La comparación no recalcula importes/).first(),
    ).toBeVisible();
    await expect(page.locator(".fotos-compare-grid input")).toHaveCount(0);
    await expect(page.locator(".fotos-compare-grid textarea")).toHaveCount(0);
    expect((await api(page, "/fotos/ciclos/2?version=1")).data).toEqual(
      v1BeforeCompare,
    );

    await page
      .getByRole("combobox", { name: "Ciclo", exact: true })
      .selectOption("3");
    const sinFoto = page.getByRole("region", { name: "Sin foto del ciclo" });
    await expect(sinFoto).toBeVisible();
    await expect(sinFoto.getByText("SinFoto", { exact: true })).toBeVisible();
    await expect(
      sinFoto.getByText(/Sin cierre registrado/),
    ).toBeVisible();
    await expect(
      sinFoto.getByText(/No se crea una foto vacía ni se muestra 0/),
    ).toBeVisible();
    expect((await api(page, "/fotos/ciclos/3")).data).toMatchObject({
      estadoFoto: "SinFoto",
      estado: "SinFoto",
      motivo: "SIN_CIERRE",
      vigente: false,
      foto: null,
    });

    await page.goto("/fotos?modo=ciclo&ciclo=2&version=99");
    await expect(
      page.getByText(
        "No existe la foto o la versión solicitada. No se ha caído a otra versión en silencio.",
        { exact: true },
      ),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Consultar la última versión",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "Ciclo 2 · v2", exact: true }),
    ).toBeVisible();
    expect(
      (await api(page, "/fotos/ciclos/2?version=99")).status,
    ).toBe(404);

    await capture(page, "selector-versiones");
    await page.goto("/fotos?modo=ciclo&ciclo=2");
    await capture(page, "comparacion-v1-v2");
    await page.goto("/fotos?modo=ciclo&ciclo=3");
    await capture(page, "sin-foto");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.11 UI/API: composición de trimestre/año, cobertura, drill-down y continuidad 2026→2027", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "principal");
  try {
    await routeApi(page, port);
    const periodPath =
      "/fotos?modo=Trimestre&ejercicio=2026&trimestre=1";
    await login(page, dir, periodPath);

    await expect(
      page.getByRole("heading", { name: "T1 · 2026 · A1", exact: true }),
    ).toBeVisible();
    const identity = page.getByRole("region", {
      name: "Identidad del agregado",
    });
    await expect(
      identity.locator(".ui-badge").filter({ hasText: "Foto" }).first(),
    ).toBeVisible();
    await expect(
      identity
        .locator(".ui-badge")
        .filter({ hasText: "Última automática" })
        .first(),
    ).toBeVisible();
    await expect(
      identity.getByText(/P1-C\/P4-A\/P5-B · P3-B/),
    ).toBeVisible();
    await expect(
      identity.getByText(/Total del periodo: No disponible/),
    ).toBeVisible();
    await expect(
      identity.getByText(/No existe regla aditiva aprobada/),
    ).toBeVisible();

    const period = (
      await api(
        page,
        "/fotos/periodos?tipo=Trimestre&ejercicio=2026&trimestre=1",
      )
    ).data;
    expect(period.seleccionVersion).toEqual({
      version: "A1",
      porDefecto: true,
      regla: "P7-D",
    });
    expect(period.seleccionAplicada).toMatchObject({
      regla: "P1-C/P4-A/P5-B",
      reglaPeriodo: "P3-B",
      porDefecto: true,
    });
    expect(period.seleccionAplicada.seleccion).toEqual({
      "0": null,
      "1": 1,
      "2": 2,
    });
    expect(period.composicion).toEqual([
      expect.objectContaining({
        ciclo: "0",
        versionFoto: null,
        fingerprint: null,
        estado: "ExcluidoSinCierre",
        motivo: "SIN_CIERRE",
        mesFinanciado: "2026-01-01",
      }),
      expect.objectContaining({
        ciclo: "1",
        versionFoto: 1,
        estado: "Incluido",
        motivo: null,
        mesFinanciado: "2026-02-01",
      }),
      expect.objectContaining({
        ciclo: "2",
        versionFoto: 2,
        estado: "Incluido",
        motivo: null,
        mesFinanciado: "2026-03-01",
      }),
    ]);
    expect(period.cobertura).toMatchObject({
      estado: "Parcial",
      totalPeriodo: null,
    });
    expect(period.cobertura.motivos).toEqual(
      expect.arrayContaining(["SIN_REGLA_ADITIVA", "CICLO_SIN_CIERRE"]),
    );
    expect(period.valores.totalPeriodo).toBeNull();
    expect(period.valores.motivoTotal).toBe("SIN_REGLA_ADITIVA");
    const c1Values = period.valores.porCiclo.find(
      (item: { ciclo: string }) => item.ciclo === "1",
    );
    const c2Values = period.valores.porCiclo.find(
      (item: { ciclo: string }) => item.ciclo === "2",
    );
    expect(c1Values.hechos.movimientos).toEqual([]);
    expect(c2Values.hechos.movimientos).toHaveLength(1);
    expect(JSON.stringify(period)).not.toContain("CalculoVivo");
    expect(JSON.stringify(period)).not.toContain("E2.6");

    const photo1 = (await api(page, "/fotos/ciclos/1")).data;
    const photo2 = (await api(page, "/fotos/ciclos/2?version=2")).data;
    expect(period.composicion[1].fingerprint).toBe(photo1.foto.fingerprint);
    expect(period.composicion[2].fingerprint).toBe(photo2.foto.fingerprint);

    const composition = page.getByRole("region", {
      name: "Tabla de composición del periodo",
    });
    await expect(
      composition
        .getByRole("row")
        .filter({ hasText: "01/01/2026 → 31/01/2026" })
        .getByText("v1", { exact: true }),
    ).toBeVisible();
    await expect(
      composition
        .getByRole("row")
        .filter({ hasText: "01/02/2026 → 28/02/2026" })
        .getByText("v2", { exact: true }),
    ).toBeVisible();
    await expect(
      composition
        .getByRole("row")
        .filter({ hasText: "01/12/2025 → 31/12/2025" })
        .getByText("Sin cierre registrado", { exact: false }),
    ).toBeVisible();
    const coverage = page.getByRole("region", {
      name: "Cobertura del periodo",
    });
    await expect(
      coverage.getByText("Parcial", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      coverage.getByText("Sin regla aditiva aprobada: total no certificado", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      coverage.getByText("Ciclo sin cierre: excluido del agregado", {
        exact: true,
      }),
    ).toBeVisible();
    const values = page.getByRole("region", {
      name: "Tabla de cifras por ciclo",
    });
    await expect(values.getByText(/Sin hechos · 0 movimientos/)).toBeVisible();
    await expect(values.getByText(/Con hechos · 1 movimiento/)).toBeVisible();
    const aggregateNoDisponible = page.getByRole("region", {
      name: "Bloques no disponibles del periodo",
    });
    await expect(
      aggregateNoDisponible.getByText(/Valoración \/ patrimonio/).first(),
    ).toBeVisible();
    await expect(
      aggregateNoDisponible
        .getByText(/E4\.4 conciliaciones de Deuda fuera de la foto/)
        .first(),
    ).toBeVisible();

    // AC08: drill-down a la versión exacta de cada incluido y al motivo de
    // cada excluido.
    await composition
      .getByRole("row")
      .filter({ hasText: "01/01/2026 → 31/01/2026" })
      .getByRole("link", { name: "Abrir foto" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Ciclo 1 · v1", exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/ciclo=1/);
    await expect(page).toHaveURL(/version=1/);

    await page.goto(periodPath);
    await expect(
      page.getByRole("heading", { name: "T1 · 2026 · A1", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("region", { name: "Tabla de composición del periodo" })
      .getByRole("row")
      .filter({ hasText: "01/02/2026 → 28/02/2026" })
      .getByRole("link", { name: "Abrir foto" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Ciclo 2 · v2", exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/version=2/);

    await page.goto(periodPath);
    await expect(
      page.getByRole("heading", { name: "T1 · 2026 · A1", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("region", { name: "Tabla de composición del periodo" })
      .getByRole("row")
      .filter({ hasText: "01/12/2025 → 31/12/2025" })
      .getByRole("link", { name: "Ver ciclo" })
      .click();
    await expect(
      page.getByRole("region", { name: "Sin foto del ciclo" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/ciclo=0/);

    // AC11: 2026 no se reetiqueta al crear un agregado nuevo de 2027.
    const q1Before = period;
    const snapshotBefore2027 = await snapshot(request, port);
    const year2026 = (
      await api(page, "/fotos/periodos?tipo=Anio&ejercicio=2026")
    ).data;
    const year2027 = (
      await api(page, "/fotos/periodos?tipo=Anio&ejercicio=2027")
    ).data;
    expect(year2026.composicion.map((item: { ciclo: string }) => item.ciclo))
      .toEqual(["0", "1", "2", "3"]);
    expect(year2027.composicion.map((item: { ciclo: string }) => item.ciclo))
      .toEqual(["4", "5", "6"]);
    // AC08/P3-B: el ciclo 4 (inicio 2026-12-01, mes financiado 2027-01-01)
    // no compone 2026 y sí compone 2027. Un ciclo fuera del periodo no se
    // enumera como contexto ni recibe un estado `FueraDePeriodo`.
    expect(year2026.composicion.map((item: { ciclo: string }) => item.ciclo))
      .not.toContain("4");
    expect(year2027.composicion.map((item: { ciclo: string }) => item.ciclo))
      .toContain("4");
    expect(JSON.stringify(year2026)).not.toContain("FueraDePeriodo");
    expect(JSON.stringify(year2027)).not.toContain("FueraDePeriodo");
    expect(year2027.composicion[0]).toMatchObject({
      ciclo: "4",
      mesFinanciado: "2027-01-01",
      versionFoto: 1,
      estado: "Incluido",
      ventana: { inicio: "2026-12-01", fin: "2027-01-31" },
    });
    const created2027 = await api(
      page,
      "/fotos/periodos",
      "POST",
      { tipo: "Anio", ejercicio: 2027 },
      { "idempotency-key": randomUUID() },
    );
    expect(created2027.status).toBe(201);
    expect(created2027.data.identidad.versionAgregado).toBe("A2");
    expect(
      (await api(page, "/fotos/periodos?tipo=Anio&ejercicio=2026")).data,
    ).toEqual(year2026);
    expect(
      (
        await api(
          page,
          "/fotos/periodos?tipo=Trimestre&ejercicio=2026&trimestre=1",
        )
      ).data,
    ).toEqual(q1Before);
    expect(
      (await api(page, "/fotos/periodos?tipo=Anio&ejercicio=2027")).data,
    ).toMatchObject({
      identidad: { versionAgregado: "A2" },
    });
    const snapshotAfter2027 = await snapshot(request, port);
    for (const id of [q1Before.id, year2026.id]) {
      expect(
        snapshotAfter2027.periodos.find(
          (item: { id: number }) => item.id === id,
        ),
      ).toEqual(
        snapshotBefore2027.periodos.find(
          (item: { id: number }) => item.id === id,
        ),
      );
    }
    expect(snapshotAfter2027.periodos).toHaveLength(
      snapshotBefore2027.periodos.length + 1,
    );

    // Cruce 2026→2027 en UI: el ciclo de diciembre figura en 2027.
    await page.goto("/fotos?modo=Anio&ejercicio=2027");
    await expect(
      page.getByRole("heading", { name: "Año 2027 · A2", exact: true }),
    ).toBeVisible();
    const composition2027 = page.getByRole("region", {
      name: "Tabla de composición del periodo",
    });
    const crossYear = composition2027
      .getByRole("row")
      .filter({ hasText: "01/12/2026" });
    await expect(crossYear).toContainText("01/12/2026 → 31/01/2027");
    await expect(crossYear).toContainText("v1");
    await expect(
      composition2027
        .getByRole("row")
        .filter({ hasText: "01/04/2027" })
        .getByText("Sin foto", { exact: true }),
    ).toBeVisible();
    await capture(page, "periodo-2027-cruce");

    // Selector explícito de versión del agregado, sin fallback silencioso.
    await page.goto(periodPath);
    await expect(
      page.getByRole("heading", { name: "T1 · 2026 · A1", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Versión del agregado").fill("A1");
    await page
      .getByRole("button", { name: "Consultar foto", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "T1 · 2026 · A1", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Identidad del agregado" })
        .locator(".ui-badge")
        .filter({ hasText: "Consulta explícita" })
        .first(),
    ).toBeVisible();
    await page.getByLabel("Versión del agregado").fill("A9");
    await page
      .getByRole("button", { name: "Consultar foto", exact: true })
      .click();
    await expect(
      page.getByText("Sin fotos para este periodo", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/No se muestra 0 ni una foto vacía/),
    ).toBeVisible();

    await page.goto(periodPath);
    await expect(
      page.getByRole("heading", { name: "T1 · 2026 · A1", exact: true }),
    ).toBeVisible();
    await capture(page, "periodo-mixto");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByRole("list", { name: "Composición del periodo móvil" }),
    ).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Tabla de composición del periodo" }),
    ).toBeHidden();
    await expectNoOverflow(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.11 UI/API: ciclo reabierto sin v2, badge PendienteReCierre y exclusión del periodo", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "reabierto");
  try {
    await routeApi(page, port);
    await login(page, dir, "/fotos?modo=ciclo&ciclo=2");

    await expect(
      page.getByRole("heading", { name: "Ciclo 2 · v1", exact: true }),
    ).toBeVisible();
    const photo = page.getByRole("region", { name: "Foto del ciclo" });
    await expect(
      photo
        .locator(".ui-badge")
        .filter({ hasText: "PendienteReCierre" })
        .first(),
    ).toBeVisible();
    await expect(
      photo
        .locator(".ui-badge")
        .filter({ hasText: "No vigente" })
        .first(),
    ).toBeVisible();
    await expect(
      photo.getByText(/v1 se conserva y es consultable, pero no es vigente/),
    ).toBeVisible();
    const state = (await api(page, "/fotos/ciclos/2")).data;
    expect(state).toMatchObject({
      estadoFoto: "Disponible",
      estado: "PendienteReCierre",
      motivo: "PENDIENTE_RE_CIERRE",
      vigente: false,
      reapertura: { estado: "Reabierto", version: 1 },
      foto: { version: 1 },
    });
    const versions = (await api(page, "/fotos/ciclos/2/versiones")).data;
    expect(versions).toEqual([
      expect.objectContaining({
        version: 1,
        esUltima: true,
        vigente: false,
        estado: "PendienteReCierre",
      }),
    ]);
    await expect(
      page.getByRole("button", { name: "Consultar la versión 1" }).first(),
    ).toBeVisible();

    const before = await snapshot(request, port);
    await page.goto("/fotos?modo=Trimestre&ejercicio=2026&trimestre=1");
    await expect(
      page.getByRole("heading", { name: "T1 · 2026 · A1", exact: true }),
    ).toBeVisible();
    const period = (
      await api(
        page,
        "/fotos/periodos?tipo=Trimestre&ejercicio=2026&trimestre=1",
      )
    ).data;
    const reopened = period.composicion.find(
      (item: { ciclo: string }) => item.ciclo === "2",
    );
    expect(reopened).toMatchObject({
      versionFoto: null,
      fingerprint: null,
      estado: "PendienteReCierre",
      motivo: "PENDIENTE_RE_CIERRE",
    });
    expect(period.cobertura.motivos).toContain("PENDIENTE_RE_CIERRE");
    await expect(
      page
        .getByRole("region", { name: "Tabla de composición del periodo" })
        .getByRole("row")
        .filter({ hasText: "01/02/2026 → 28/02/2026" })
        .locator(".ui-badge")
        .filter({ hasText: "PendienteReCierre" })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Ciclo reabierto: pendiente de re-cierre/).first(),
    ).toBeVisible();
    await page
      .getByRole("region", { name: "Tabla de composición del periodo" })
      .getByRole("row")
      .filter({ hasText: "01/02/2026 → 28/02/2026" })
      .getByRole("link", { name: "Ver ciclo" })
      .click();
    await expect(
      page.getByRole("region", { name: "Foto del ciclo" }),
    ).toBeVisible();
    await expect(
      page.getByText("PendienteReCierre", { exact: true }).first(),
    ).toBeVisible();
    expect(await snapshot(request, port)).toEqual(before);

    await capture(page, "reabierto-sin-v2");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.11 API/UI: agregado persistido inmutable tras re-cierre v2 y nuevo agregado A2", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "recierre");
  try {
    await routeApi(page, port);
    await login(
      page,
      dir,
      "/fotos?modo=Trimestre&ejercicio=2026&trimestre=1",
    );
    await expect(
      page.getByRole("heading", { name: "T1 · 2026 · A1", exact: true }),
    ).toBeVisible();
    const a1 = (
      await api(
        page,
        "/fotos/periodos?tipo=Trimestre&ejercicio=2026&trimestre=1",
      )
    ).data;
    expect(a1.composicion).toEqual([
      expect.objectContaining({
        ciclo: "0",
        versionFoto: null,
        estado: "ExcluidoSinCierre",
      }),
      expect.objectContaining({ ciclo: "1", versionFoto: 1 }),
      expect.objectContaining({ ciclo: "2", versionFoto: 1 }),
    ]);
    const snapshotBefore = await snapshot(request, port);

    const reopened = await api(
      page,
      "/cierres/2/reabrir",
      "POST",
      { versionEsperada: 1, motivo: "Reapertura ficticia E2E E4.11" },
      { "idempotency-key": randomUUID() },
    );
    expect(reopened.status).toBe(201);
    const preview = await api(page, "/cierres/2/repreflight");
    expect(preview.status).toBe(200);
    expect(preview.data.bloqueos).toEqual([]);
    expect(preview.data.comparacion.estado).toBe("ConCambios");
    const reclosed = await api(
      page,
      "/cierres/2/recerrar",
      "POST",
      {
        versionEsperada: preview.data.origen.versionOrigen,
        motivo: "Re-cierre ficticio E2E E4.11",
        fingerprint: preview.data.fingerprint,
      },
      { "idempotency-key": randomUUID() },
    );
    expect(reclosed.status).toBe(201);
    expect(reclosed.data.foto.version).toBe(2);

    const snapshotAfterReclose = await snapshot(request, port);
    expect(snapshotAfterReclose.periodos).toEqual(snapshotBefore.periodos);
    expect(
      snapshotAfterReclose.tables.fotos_periodo,
    ).toEqual(snapshotBefore.tables.fotos_periodo);
    expect(
      snapshotAfterReclose.tables.cierres.count,
    ).toBe(snapshotBefore.tables.cierres.count + 1);
    expect(
      snapshotAfterReclose.tables.fotos_cierre.count,
    ).toBe(snapshotBefore.tables.fotos_cierre.count + 1);

    const a1After = (await api(page, `/fotos/periodos/${a1.id}`)).data;
    expect(a1After).toEqual(conConsultaPorId(a1));
    expect(a1After.seleccionVersion).toMatchObject({
      version: "A1",
      porDefecto: false,
    });
    const v1 = (await api(page, "/fotos/ciclos/2?version=1")).data;
    const v2 = (await api(page, "/fotos/ciclos/2?version=2")).data;
    expect(v1).toMatchObject({
      vigente: false,
      foto: {
        version: 1,
        fingerprint: a1.composicion.find(
          (item: { ciclo: string }) => item.ciclo === "2",
        ).fingerprint,
      },
    });
    expect(v2).toMatchObject({
      vigente: true,
      foto: { version: 2 },
    });

    const a2 = await api(
      page,
      "/fotos/periodos",
      "POST",
      { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
      { "idempotency-key": randomUUID() },
    );
    expect(a2.status).toBe(201);
    expect(a2.data.identidad.versionAgregado).toBe("A2");
    expect(a2.data.seleccionAplicada.seleccion["2"]).toBe(2);
    expect(
      a2.data.composicion.find(
        (item: { ciclo: string }) => item.ciclo === "2",
      ),
    ).toMatchObject({
      versionFoto: 2,
      fingerprint: v2.foto.fingerprint,
    });
    const a1AfterA2 = (await api(page, `/fotos/periodos/${a1.id}`)).data;
    expect(a1AfterA2).toEqual(conConsultaPorId(a1));
    expect(a1AfterA2.seleccionVersion).toMatchObject({
      version: "A1",
      porDefecto: false,
    });
    const latest = (
      await api(
        page,
        "/fotos/periodos?tipo=Trimestre&ejercicio=2026&trimestre=1",
      )
    ).data;
    expect(latest.identidad.versionAgregado).toBe("A2");
    expect(latest.seleccionVersion).toMatchObject({
      version: "A2",
      porDefecto: true,
    });
    const snapshotAfterA2 = await snapshot(request, port);
    expect(
      snapshotAfterA2.periodos.find(
        (item: { id: number }) => item.id === a1.id,
      ),
    ).toEqual(
      snapshotBefore.periodos.find(
        (item: { id: number }) => item.id === a1.id,
      ),
    );

    await page.getByLabel("ID del agregado").fill(String(a1.id));
    await page
      .getByRole("button", { name: "Consultar foto", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "T1 · 2026 · A1", exact: true }),
    ).toBeVisible();
    const identidadPorId = page.getByRole("region", {
      name: "Identidad del agregado",
    });
    await expect(
      identidadPorId
        .locator(".ui-badge")
        .filter({ hasText: "Consulta explícita" })
        .first(),
    ).toBeVisible();
    await expect(
      identidadPorId
        .locator(".ui-badge")
        .filter({ hasText: "Última automática" }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("region", { name: "Tabla de composición del periodo" })
        .getByRole("row")
        .filter({ hasText: "01/02/2026 → 28/02/2026" })
        .getByText("v1", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("ID del agregado").fill("");
    await page
      .getByRole("button", { name: "Consultar foto", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "T1 · 2026 · A2", exact: true }),
    ).toBeVisible();
    const identidadUltima = page.getByRole("region", {
      name: "Identidad del agregado",
    });
    await expect(
      identidadUltima
        .locator(".ui-badge")
        .filter({ hasText: "Última automática" })
        .first(),
    ).toBeVisible();
    await expect(
      identidadUltima
        .locator(".ui-badge")
        .filter({ hasText: "Consulta explícita" }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("region", { name: "Tabla de composición del periodo" })
        .getByRole("row")
        .filter({ hasText: "01/02/2026 → 28/02/2026" })
        .getByText("v2", { exact: true }),
    ).toBeVisible();

    await capture(page, "recierre-a1-a2");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.11 API: 401/404/405/422, matriz negativa, sin archivo/DT9 y snapshot sin altas", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const { child, port, dir } = await startServer(request, "principal");
  try {
    // Sin sesión no se expone ninguna consulta de fotos.
    expect((await request.get(apiUrl(port, "/fotos/ciclos/1"))).status()).toBe(
      401,
    );
    expect(
      (
        await request.get(
          apiUrl(port, "/fotos/periodos?tipo=Anio&ejercicio=2026"),
        )
      ).status(),
    ).toBe(401);
    expect(
      (await request.get(apiUrl(port, "/fotos/ciclos/1/versiones"))).status(),
    ).toBe(401);
    expect(
      (await request.get(apiUrl(port, "/fotos/contraste?ciclo=1"))).status(),
    ).toBe(401);

    await routeApi(page, port);
    await login(page, dir, "/fotos?modo=ciclo&ciclo=1");
    const before = await snapshot(request, port);

    const noKey = await api(page, "/fotos/periodos", "POST", {
      tipo: "Anio",
      ejercicio: 2027,
    });
    expect(noKey.status).toBe(422);
    expect(noKey.data.code).toBe("IDEMPOTENCY_REQUIRED");

    const badKey = await api(
      page,
      "/fotos/periodos",
      "POST",
      { tipo: "Anio", ejercicio: 2027 },
      { "idempotency-key": "corta" },
    );
    expect(badKey.status).toBe(422);
    expect(badKey.data.code).toBe("IDEMPOTENCY_REQUIRED");

    const forbiddenField = await api(
      page,
      "/fotos/periodos",
      "POST",
      { tipo: "Anio", ejercicio: 2027, tipoRegistro: "Archivo" },
      { "idempotency-key": randomUUID() },
    );
    expect(forbiddenField.status).toBe(422);
    expect(forbiddenField.data.fields.tipoRegistro).toContain("no editable");

    const futurePost = await api(
      page,
      "/fotos/periodos",
      "POST",
      { tipo: "Anio", ejercicio: 2028 },
      { "idempotency-key": randomUUID() },
    );
    expect(futurePost.status).toBe(422);
    expect(futurePost.data.fields.periodo).toContain("no futuro");

    for (const [path, method, allow] of [
      ["/fotos/ciclos/1", "POST", "GET"],
      ["/fotos/ciclos/1", "PUT", "GET"],
      ["/fotos/ciclos/1", "PATCH", "GET"],
      ["/fotos/ciclos/1", "DELETE", "GET"],
      ["/fotos/ciclos/1/versiones", "POST", "GET"],
      ["/fotos/periodos/1", "PUT", "GET"],
      ["/fotos/periodos/1", "PATCH", "GET"],
      ["/fotos/periodos/1", "DELETE", "GET"],
      ["/fotos/contraste?ciclo=1", "POST", "GET"],
      ["/fotos/contraste?ciclo=1", "PATCH", "GET"],
      ["/fotos/periodos", "PATCH", "GET, POST"],
      ["/fotos/periodos", "DELETE", "GET, POST"],
    ] as const) {
      const result = await api(page, path, method, {});
      expect(result.status, `${method} ${path}`).toBe(405);
      expect(result.allow, `${method} ${path}`).toBe(allow);
    }

    const invalidVersion = await api(
      page,
      "/fotos/ciclos/1?version=abc",
    );
    expect(invalidVersion.status).toBe(422);
    expect(invalidVersion.data.fields.version).toBeTruthy();
    expect((await api(page, "/fotos/ciclos/1?version=0")).status).toBe(422);
    expect((await api(page, "/fotos/ciclos/1?version=1.0")).status).toBe(422);
    const missingVersion = await api(page, "/fotos/ciclos/1?version=99");
    expect(missingVersion.status).toBe(404);
    expect(missingVersion.data.foto).toBeUndefined();
    expect((await api(page, "/fotos/ciclos/999")).status).toBe(404);

    const futureGet = await api(
      page,
      "/fotos/periodos?tipo=Anio&ejercicio=2028",
    );
    expect(futureGet.status).toBe(422);
    expect(futureGet.data.fields.periodo).toContain("no futuro");
    const foreignParam = await api(
      page,
      "/fotos/periodos?tipo=Trimestre&ejercicio=2026&trimestre=1&tipoRegistro=Archivo",
    );
    expect(foreignParam.status).toBe(422);
    expect(foreignParam.data.fields.tipoRegistro).toContain("no admitido");
    expect(
      (
        await api(
          page,
          "/fotos/periodos?tipo=Trimestre&ejercicio=2026&trimestre=1&version=A9",
        )
      ).status,
    ).toBe(404);
    expect((await api(page, "/fotos/periodos/999")).status).toBe(404);

    const live = await api(page, "/fotos/contraste?ciclo=1");
    expect(live.status).toBe(200);
    expect(live.data).toMatchObject({
      origen: "CalculoVivo",
      motor: "E2.6 flujo-mensual",
      noEsHistorico: true,
      noSustituyeFoto: true,
      soloLectura: true,
    });
    expect(JSON.stringify(live.data)).not.toContain("tipoRegistro");
    expect(JSON.stringify(live.data)).not.toContain("Archivo");
    const wrongSource = await api(
      page,
      "/fotos/contraste?ciclo=1&tipoRegistro=Archivo",
    );
    expect(wrongSource.status).toBe(422);
    expect(wrongSource.data.fields.tipoRegistro).toContain("no admitido");
    expect((await api(page, "/fotos/contraste?ciclo=abc")).status).toBe(422);
    expect((await api(page, "/fotos/contraste?ciclo=999")).status).toBe(404);

    // P8b-A: no hay ruta de archivo E4.5 ni tipoRegistro=Archivo.
    // P8a-A: no hay ruta DT9 ni «foto corregida».
    for (const path of [
      "/fotos",
      "/fotos?tipoRegistro=Archivo",
      "/fotos/archivo",
      "/fotos/archivo?ejercicio=2026",
      "/fotos/ciclos/1/corregir",
      "/fotos/ciclos/1/rectificar",
      "/fotos/ciclos/1/foto-corregida",
      "/fotos/corregida/1",
      "/fotos/rectificaciones/1",
    ]) {
      const absent = await api(page, path);
      expect(absent.status, path).toBe(404);
      expect(absent.data.code, path).toBe("NOT_FOUND");
    }
    // AC10: un ejercicio sin fotos no devuelve 0 ni una foto vacía.
    const emptyYear = await api(
      page,
      "/fotos/periodos?tipo=Anio&ejercicio=2025",
    );
    expect(emptyYear.status).toBe(404);
    expect(emptyYear.data.foto).toBeUndefined();

    expect(await snapshot(request, port)).toEqual(before);
  } finally {
    child.kill();
  }
});

test("E4.11 UI: estados vacío/carga/error/401/404/422, foco, teclado y regiones", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "principal");
  try {
    await routeApi(page, port);
    await login(page, dir, "/fotos?modo=ciclo&ciclo=1");

    // Teclado: el enlace de navegación enfoca el h1 y el orden natural llega
    // al selector de tipo, ciclo y versión.
    await page.getByRole("link", { name: /Fotos/ }).first().click();
    await expect(
      page.getByRole("heading", { name: "Fotografías", exact: true }),
    ).toBeFocused();
    const cycleSelect = page.getByRole("combobox", {
      name: "Ciclo",
      exact: true,
    });
    await expect(cycleSelect).toBeEnabled();
    await cycleSelect.selectOption("1");
    await expect(
      page.getByRole("heading", { name: "Ciclo 1 · v1", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("heading", { name: "Fotografías", exact: true })
      .focus();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => document.activeElement?.getAttribute("id")),
    ).toBe("fotos-modo");
    await expect(
      page.getByRole("combobox", { name: "Ciclo", exact: true }),
    ).toBeEnabled();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => document.activeElement?.getAttribute("id")),
    ).toBe("fotos-ciclo");
    await expect(
      page.getByRole("combobox", { name: "Versión", exact: true }),
    ).toBeEnabled();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => document.activeElement?.getAttribute("id")),
    ).toBe("fotos-version");
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(() => document.activeElement?.getAttribute("id")),
    ).toBe("fotos-ciclo");

    for (const name of [
      "Tipo de consulta",
      "Selector de ciclo y versión",
      "Foto del ciclo",
      "Cobertura de la foto",
      "Bloques no disponibles de la foto",
      "Versiones consultables de la foto",
      "Comparación de versiones de la foto",
      "Cálculo vivo etiquetado",
    ])
      await expect(page.getByRole("region", { name })).toBeVisible();

    // Carga: se muestra el estado de espera y luego el contenido.
    await page.route("**/api/fotos/ciclos/1/versiones", async (route) => {
      const url = new URL(route.request().url());
      url.port = String(port);
      const response = await route.fetch({ url: url.toString() });
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill({ response });
    });
    await page.goto("/fotos?modo=ciclo&ciclo=1");
    await expect(
      page.getByText("Cargando índice de versiones…", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Cargando índice de versiones…", { exact: true }),
    ).toBeHidden({ timeout: 5000 });
    await page.unroute("**/api/fotos/ciclos/1/versiones");

    // Error y reintento: el foco llega al aviso y el reintento recupera.
    await page.route("**/api/fotos/ciclos/1", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          code: "INTERNAL",
          error: "Fallo ficticio E4.11",
        }),
      });
    });
    await page.goto("/fotos?modo=ciclo&ciclo=1");
    await expect(
      page.getByText("Fallo ficticio E4.11", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Código: INTERNAL · HTTP 500", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.activeElement?.querySelector(".alert") !== null,
      ),
    ).toBe(true);
    await page.unroute("**/api/fotos/ciclos/1");
    await page
      .getByRole("button", { name: "Reintentar", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Ciclo 1 · v1", exact: true }),
    ).toBeVisible();

    // 401: la UI no muestra importes parciales y ofrece volver a identificarse.
    await page.route("**/api/fotos/ciclos/1", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          code: "AUTH_REQUIRED",
          error: "Inicia sesión para continuar.",
        }),
      });
    });
    await page.goto("/fotos?modo=ciclo&ciclo=1");
    await expect(
      page.getByText(/La sesión ha caducado\. Copia cualquier borrador/),
    ).toBeVisible();
    await expect(
      page.getByText(
        "La sesión ha caducado. Vuelve a identificarte; no se muestran importes ni fotos parciales.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.unroute("**/api/fotos/ciclos/1");

    // 422 de periodo futuro con campo, foco y aria-invalid.
    await page.goto("/fotos?modo=Anio&ejercicio=2028");
    await expect(
      page.getByText("El periodo todavía no ha comenzado.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/periodo: Indica un periodo no futuro\./),
    ).toBeVisible();
    const ejercicio = page.getByRole("textbox", {
      name: "Ejercicio",
      exact: true,
    });
    await expect(ejercicio).toBeFocused();
    await expect(ejercicio).toHaveAttribute("aria-invalid", "true");
    await capture(page, "estado-422-futuro");

    // 404 de periodo sin agregados: vacío declarado, nunca 0.
    await page.goto("/fotos?modo=Anio&ejercicio=2025");
    await expect(
      page.getByText("Sin fotos para este periodo", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/No se muestra 0 ni una foto vacía/),
    ).toBeVisible();
    await capture(page, "estado-404-periodo");

    // 404 de versión exacta: no hay fallback silencioso.
    await page.goto("/fotos?modo=ciclo&ciclo=2&version=99");
    await expect(
      page.getByText(
        "No existe la foto o la versión solicitada. No se ha caído a otra versión en silencio.",
        { exact: true },
      ),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Consultar la última versión",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "Ciclo 2 · v2", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});

test("E4.11 UI: sin ciclos no ofrece consulta ni crea datos", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const errors = pageErrors(page);
  const { child, port, dir } = await startServer(request, "sin-ciclo");
  try {
    await routeApi(page, port);
    await login(page, dir, "/fotos");
    const empty = page.getByRole("region", { name: "Sin ciclos" });
    await expect(empty).toBeVisible();
    await expect(
      empty.getByText("Sin ciclos", { exact: true }),
    ).toBeVisible();
    await expect(
      empty.getByText(
        /No hay ciclos para consultar\. Esta pantalla no crea ciclos ni fotografías\./,
      ),
    ).toBeVisible();
    await expect(
      empty.getByRole("button", { name: "Ir a Ciclos", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Selector de ciclo y versión" }),
    ).toHaveCount(0);
    expect((await request.get(apiUrl(port, "/ciclos?estado="))).status()).toBe(
      401,
    );
    const cycles = await api(page, "/ciclos?estado=");
    expect(cycles.status).toBe(200);
    expect(cycles.data.total).toBe(0);
    await capture(page, "sin-ciclos");
    expect(errors).toEqual([]);
  } finally {
    child.kill();
  }
});
