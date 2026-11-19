import { test, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";
import { artifactDir, fixtureContext } from "./fixture";

/**
 * SPEC37 · I5 — alta unificada de Gasto, Transferencia realizada o pendiente,
 * bandeja y alertas.
 *
 * §10.1: «Nuevo gasto» ofrece en la misma pantalla el Gasto normal
 * (predeterminado) y las modalidades A/B. El Gasto normal sigue por el camino
 * ordinario (`POST /api/movimientos`); A y B entran en la operación coordinada,
 * con su Transferencia ya realizada o pendiente.
 *
 * Recorrido real con servidor aislado (puerto y estado propios de la ejecución),
 * MFA real y SQLite: alta normal, alta A con pendiente, bandeja, ficha,
 * cancelación motivada, alta B con intención de Referencia, confirmación B con
 * evidencia y procedencia, alta A con Transferencia ya realizada y 409 que
 * conserva el borrador. Capturas a 1440 y 390 con comprobación de que no hay
 * scroll horizontal.
 *
 * AC cubiertos por este archivo: AC-01, AC-03, AC-04, AC-05, AC-07, AC-08,
 * AC-17, AC-18, AC-22, AC-24, AC-25, AC-27 y AC-38. AC-28 sigue `UNRUN`: aquí
 * solo se comprueba que el aviso presupuestario que muestra la UI es la
 * respuesta del servidor —una Transferencia sin Referencia ejecuta la
 * Aportación a saldo de su destino, una de Anticipo no—; la ejecución contra el
 * Plan del ciclo no se mide en este spec.
 */

// Puerto y estado propios de la ejecución (#508): dos runs de esta spec no
// comparten listener ni base. El fixture conserva 3029/`.local/e2e-spec37-i5`
// como defaults para arranque manual.
const fixture = fixtureContext("spec37-i5");
const PORT = fixture.port;
const DIR = fixture.dir;
const artifacts = artifactDir("spec37-i5");
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
  return `El fixture SPEC37 I5 terminó antes de servir (${how}): ${detail}`;
}

/** Un fixture muerto no puede quedar enmascarado por un poll que responde. */
function assertFixtureAlive() {
  if (fixtureExit) throw new Error(fixtureFailure());
}

test.beforeAll(async ({ request }) => {
  child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/spec37-i5-server.ts"],
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

test("SPEC37 I5: alta unificada, realizada o pendiente, bandeja, alertas y 409 con borrador", async ({
  page,
}) => {
  test.setTimeout(420000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    url.port = String(PORT);
    await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
  });

  // ── Sesión real con MFA ──────────────────────────────────────────────────
  const password = "Contraseña ficticia SPEC37 I5 " + randomUUID();
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
  const shot = async (name: string) => {
    await settle();
    await noOverflow();
    await page.screenshot({ path: join(artifacts, `${name}.png`), fullPage: true });
  };
  /** Captura la misma pantalla a 1440 y 390 (AC-24). */
  const shotBoth = async (name: string) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await shot(`${name}-1440`);
    await page.setViewportSize({ width: 390, height: 844 });
    await shot(`${name}-390`);
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

  // El Gasto normal usa su propio Saldo para no mover las posiciones de A y B.
  const pagadorNormal = await saldo("Pagador normal I5", "100", {
    permiteSalidaExterior: true,
  });
  // Saldos de la modalidad A: el pagador tiene 40,00 € y el Gasto será de 60,00 €.
  const pagadorA = await saldo("Pagador A I5", "40", { permiteSalidaExterior: true });
  const aportaA = await saldo("Aporta A I5", "500");
  // Saldos de la modalidad B: el pagador no tiene fondos y el otro Saldo adelanta.
  const pagadorB = await saldo("Pagador B I5", "0", { permiteSalidaExterior: true });
  const adelantaB = await saldo("Adelanta B I5", "200");
  // Terminal: sin posición convencional (AC-25).
  const terminal = await saldo("Terminal I5", "0", {
    control: "Terminal",
    permiteSalidaExterior: true,
  });

  const categoria = (
    await post("/clasificacion/categorias", {
      nombre: "Categoría I5 ficticia",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    })
  ).data.item;
  const subcategoria = (
    await post("/clasificacion/subcategorias", {
      nombre: "Subcategoría I5 ficticia",
      padre: categoria.id,
    })
  ).data.item;
  const partida = (
    await post("/clasificacion/partidas", {
      nombre: "Partida I5 ficticia",
      padre: subcategoria.id,
    })
  ).data.item;
  const referencia = (
    await post("/referencias", { nombre: "Anticipo I5 existente", tipo: "Anticipo" })
  ).data.item;

  // «Aportación a saldo» hacia cada Saldo pagador: es la fuente que el motor R3
  // mira al atribuir una Transferencia. El aviso de la UI debe ser la respuesta
  // del servidor, no un cálculo del cliente.
  for (const [nombre, destino] of [
    ["Aportación A I5", pagadorA.id],
    ["Aportación B I5", pagadorB.id],
  ] as const) {
    const creado = await post("/presupuestos", {
      nombre,
      fuente: "Aportación a saldo",
      destino,
    });
    expect(creado.status, JSON.stringify(creado.data)).toBe(201);
  }

  const fecha = page.getByLabel("Fecha del Gasto");
  const importe = page.getByLabel("Importe del Gasto");
  const pagador = page.getByLabel("Saldo pagador");
  const origen = page.getByLabel("Saldo que aporta");
  const importeTransferencia = page.getByLabel("Importe de la Transferencia prevista");
  const barra = page.getByLabel("Barra del importe previsto");
  const previa = page.getByRole("region", {
    name: "Transferencia asociada",
    exact: true,
  });

  // ── 1. Entrada unificada: «Nuevo gasto» con el Gasto normal predeterminado ─
  await page.getByRole("button", { name: "Nuevo gasto" }).click();
  await expect(
    page.getByRole("heading", { name: "Nuevo gasto", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "Gasto normal" })).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Pago directo desde otro Saldo" }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Financiación mediante Anticipo" }),
  ).not.toBeChecked();
  // Sin modalidad no hay Transferencia asociada, ni barra, ni pendiente.
  await expect(page.getByLabel("Saldo que aporta")).toHaveCount(0);
  await expect(page.getByLabel("Barra del importe previsto")).toHaveCount(0);

  await fecha.fill(hoy);
  await importe.fill("12,00");
  await pagador.selectOption(pagadorNormal.id);
  await page.getByLabel(/^Partida/).selectOption(partida.id);
  await page.getByLabel("Concepto", { exact: true }).fill("Compra normal I5");
  await shotBoth("alta-gasto-normal");
  await page.getByRole("button", { name: "Registrar movimiento" }).click();

  // AC-01: un único Gasto, sin Transferencia, pendiente ni alerta.
  await expect(
    page.getByRole("heading", { name: "Compra normal I5" }),
  ).toBeVisible();
  await expect(page.getByText(/Pendiente de realizar/)).toHaveCount(0);
  expect(
    (await get("/transferencias-pendientes?estado=Pendiente%20de%20realizar")).total,
  ).toBe(0);

  // ── 2. Modalidad A con Transferencia pendiente (AC-04, AC-05, AC-18, AC-27) ─
  await page.goto("/movimientos/nuevo?tipo=Gasto");
  await expect(
    page.getByRole("heading", { name: "Nuevo gasto", exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Pago directo desde otro Saldo" }).check();
  await expect(page.getByLabel("Saldo que aporta")).toBeVisible();
  // La Transferencia queda pendiente salvo que se marque lo contrario.
  await expect(
    page.getByRole("checkbox", { name: "Transferencia ya realizada" }),
  ).not.toBeChecked();

  await fecha.fill(hoy);
  await importe.fill("60,00");
  await pagador.selectOption(pagadorA.id);
  await page.getByLabel(/^Partida/).selectOption(partida.id);
  await page.getByLabel("Concepto", { exact: true }).fill("Compra coordinada A");
  await origen.selectOption(aportaA.id);
  await importeTransferencia.fill("40,00");
  await page.getByLabel("Fecha prevista").fill(hoy);

  // §6/AC-27: disponibilidad real del Saldo y déficit verificable, separados.
  await expect(page.getByText(/Disponibilidad real .*: 40,00 €/)).toBeVisible();
  await expect(page.getByText(/Déficit verificable: 20,00 €/)).toBeVisible();
  await expect(page.getByText(/Remanente sobre el déficit: 20,00 €/)).toBeVisible();
  await expect(
    page.getByText(/Disponible posterior estimado en .*: 20,00 €/),
  ).toBeVisible();
  await expect(page.getByText(/El déficit presupuestario y la falta de dinero/)).toBeVisible();

  // AC-17: un importe por encima del disponible es información, no un bloqueo.
  await importe.fill("90,00");
  await expect(page.getByText(/Déficit verificable: 50,00 €/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Vista previa" })).toBeEnabled();
  await importe.fill("60,00");
  await expect(page.getByText(/Déficit verificable: 20,00 €/)).toBeVisible();

  // AC-18: la barra y el campo exacto comparten valor, sin redondear céntimos.
  await expect(barra).toHaveValue("40");
  await importeTransferencia.fill("40,55");
  await expect(barra).toHaveValue("40.55");
  const caja = (await barra.boundingBox())!;
  await barra.click({ position: { x: caja.width * 0.25, y: caja.height / 2 } });
  const valorBarra = Number(await barra.inputValue());
  const valorCampo = Number((await importeTransferencia.inputValue()).replace(",", "."));
  expect(Math.abs(valorBarra - valorCampo)).toBeLessThan(0.005);
  await importeTransferencia.fill("40,00");
  await expect(barra).toHaveValue("40");

  await shotBoth("formulario-a");

  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(previa).toBeVisible();
  await expect(previa.getByText("Pago directo desde otro Saldo")).toBeVisible();
  await expect(previa.getByText(/Efecto presupuestario/)).toBeVisible();
  // AC-28 (solo el aviso): una Transferencia ordinaria sin Referencia ejecuta la
  // Aportación a saldo de su destino según el servidor.
  await expect(previa.getByText(/ejecuta esa Aportación a saldo/)).toBeVisible();
  // Y el alta no estima importes ejecutados por su cuenta.
  await expect(previa.getByText(/El alta no estima importes ejecutados/)).toBeVisible();
  await shotBoth("previa-a");

  await page.getByRole("button", { name: "Registrar operación" }).click();
  await expect(
    page.getByRole("heading", { name: "Compra coordinada A" }),
  ).toBeVisible();
  await expect(page.getByText(/Pendiente de realizar\./)).toBeVisible();
  await shotBoth("resultado-a");

  const pendientesTrasA = await get("/transferencias-pendientes?estado=Pendiente%20de%20realizar");
  expect(pendientesTrasA.total).toBe(1);
  const pendienteA = pendientesTrasA.items[0];
  expect(pendienteA.modalidad).toBe("A");
  expect(pendienteA.anticipoPrevisto).toBeNull();
  expect(pendienteA.estado).toBe("Pendiente de realizar");
  // AC-26/AC-32: el pendiente no es un hecho real.
  expect(pendienteA.movimiento).toBeNull();

  // ── Bandeja: alerta «Pendiente de realizar» en la lista (AC-38) ──────────
  await page.goto("/movimientos");
  const bandeja = page.getByRole("region", { name: "Pendientes de confirmar" });
  await expect(bandeja).toBeVisible();
  await expect(bandeja.getByText("Pendiente de realizar", { exact: false }).first()).toBeVisible();
  await expect(bandeja.getByText("Pago directo desde otro Saldo")).toBeVisible();
  await expect(
    bandeja.getByRole("link", { name: new RegExp(`Gasto #${pendienteA.gasto}`) }),
  ).toBeVisible();
  await expect(bandeja.getByText(/Requieren atención \(0\)/)).toBeVisible();
  // AC-38: la alerta también aparece en la lista general de Movimientos.
  await expect(
    page
      .locator(".movements-list")
      .getByText("Pendiente de realizar", { exact: true })
      .first(),
  ).toBeVisible();
  await shotBoth("bandeja");

  // ── Detalle del Gasto: alerta y ficha del pendiente (AC-38) ─────────────
  await page.goto(`/movimientos/${pendienteA.gasto}`);
  await expect(
    page.getByRole("heading", { name: "Compra coordinada A" }),
  ).toBeVisible();
  await expect(page.getByText(/Pendiente de realizar\./)).toBeVisible();
  const ficha = page.getByRole("region", { name: /Transferencia pendiente/ });
  await expect(ficha.getByText("Pago directo desde otro Saldo")).toBeVisible();
  await expect(ficha.getByText("Gasto vinculado")).toBeVisible();
  await shotBoth("gasto-detalle");

  // ── Edición del pendiente A: importe y fecha prevista, sin tocar la
  // modalidad ni el Gasto (ambos inmutables en la práctica) ───────────────
  await ficha.getByRole("button", { name: "Editar importe y fecha prevista" }).click();
  await ficha.getByLabel("Importe previsto (€)").fill("41,00");
  await ficha.getByRole("button", { name: "Guardar cambios del pendiente" }).click();
  await expect(ficha.getByText(/Pendiente actualizado/)).toBeVisible();
  await expect(ficha.getByText("41,00 €", { exact: true })).toBeVisible();
  const editado = await get(`/transferencias-pendientes/${pendienteA.id}`);
  expect(editado.item.importe).toBe("41.00");
  expect(editado.item.revision).toBe(pendienteA.revision + 1);

  // ── Cancelación motivada del pendiente A ────────────────────────────────
  await ficha.getByRole("button", { name: "Cancelar pendiente" }).click();
  await ficha.getByLabel("Motivo de cancelación").fill("Motivo ficticio de cancelación I5");
  await ficha.getByRole("button", { name: "Confirmar cancelación" }).click();
  await expect(ficha.getByText("Pendiente cancelado con motivo")).toBeVisible();
  await expect(ficha.getByText("Cancelada", { exact: true })).toBeVisible();
  await expect(page.getByText(/Pendiente de realizar\./)).toHaveCount(0);
  const cancelado = await get(`/transferencias-pendientes/${pendienteA.id}`);
  expect(cancelado.item.estado).toBe("Cancelada");
  expect(cancelado.item.motivoCancelacion).toBe("Motivo ficticio de cancelación I5");
  await shotBoth("cancelacion");

  // ── Alta B con intención de Referencia (§5.3, AC-07) ────────────────────
  // La ruta heredada de I5 abre la misma alta unificada de Gasto.
  await page.goto("/movimientos/coordinado");
  await expect(
    page.getByRole("heading", { name: "Nuevo gasto", exact: true }),
  ).toBeVisible();
  await fecha.fill(hoy);
  await importe.fill("60,00");
  await pagador.selectOption(pagadorB.id);
  await page.getByLabel(/^Partida/).selectOption(partida.id);
  await page.getByLabel("Concepto", { exact: true }).fill("Compra coordinada B");
  await page.getByRole("radio", { name: "Financiación mediante Anticipo" }).check();
  await page.getByLabel("Saldo que adelanta").selectOption(adelantaB.id);
  await importeTransferencia.fill("30,00");
  await page.getByLabel("Fecha prevista").fill(hoy);

  await page.getByRole("radio", { name: "Intención de Referencia nueva" }).check();
  await page.getByLabel("Nombre de la Referencia nueva").fill("Anticipo intención I5");
  await page.getByLabel("Apertura de la Referencia nueva").fill(hoy);
  await page.getByLabel("Evidencia de la Referencia nueva").fill("Resguardo ficticio I5");
  // AC-25: un Saldo Terminal no publica posición; nunca se muestra 0.
  await pagador.selectOption(terminal.id);
  await expect(page.getByText(/Déficit verificable: No disponible/)).toBeVisible();
  await pagador.selectOption(pagadorB.id);
  await page.getByLabel("Saldo que adelanta").selectOption(adelantaB.id);

  await shotBoth("formulario-b");
  // AC-08: la Transferencia de la modalidad B es obligatoria y positiva; el
  // formulario no la omite ni la sustituye aunque hubiera fondos.
  await importeTransferencia.fill("");
  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(page.getByText(/Indica un importe exacto mayor que cero/)).toBeVisible();
  await expect(previa).toHaveCount(0);
  await importeTransferencia.fill("30,00");
  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(previa.getByText("Financiación mediante Anticipo")).toBeVisible();
  await expect(previa.getByText("Intención: Anticipo intención I5")).toBeVisible();
  // AC-28 (solo el aviso): una Transferencia con Referencia de Anticipo no
  // ejecuta la Aportación a saldo de su destino, según el servidor.
  await expect(previa.getByText(/no ejecuta la Aportación a saldo/)).toBeVisible();
  await shotBoth("previa-b");

  await page.getByRole("button", { name: "Registrar operación" }).click();
  await expect(
    page.getByRole("heading", { name: "Compra coordinada B" }),
  ).toBeVisible();
  await shotBoth("resultado-b");

  const pendientesB = await get("/transferencias-pendientes?estado=Pendiente%20de%20realizar");
  const pendienteB = pendientesB.items.find((item: any) => item.modalidad === "B");
  expect(pendienteB.anticipoPrevisto).toBeNull();
  expect(pendienteB.anticipoIntencion).toMatchObject({
    nombre: "Anticipo intención I5",
    apertura: hoy,
    evidencia: "Resguardo ficticio I5",
  });
  // §5.3: la intención no ha creado Referencia ni ficha.
  const referencias = await get("/referencias");
  expect(
    (referencias.items ?? referencias.referencias ?? []).some(
      (r: any) => r.nombre === "Anticipo intención I5",
    ),
  ).toBe(false);

  // ── Confirmación B con evidencia y procedencia (§8, AC-07) ──────────────
  await page.goto(`/movimientos/${pendienteB.gasto}`);
  await expect(page.getByText(/Pendiente de realizar\./)).toBeVisible();
  const fichaB = page.getByRole("region", { name: /Transferencia pendiente/ });
  await expect(fichaB.getByText("Financiación mediante Anticipo")).toBeVisible();
  await expect(fichaB.getByText(/Intención de alta: Anticipo intención I5/)).toBeVisible();
  await fichaB.getByRole("button", { name: "Confirmar transferencia" }).click();

  const revisar = fichaB.getByRole("button", { name: "Revisar confirmación" });
  await expect(revisar).toBeDisabled();
  await fichaB.getByLabel("Fecha real del banco").fill(hoy);
  await expect(revisar).toBeDisabled();
  await fichaB
    .getByLabel("Evidencia de la Transferencia de Anticipo")
    .fill("Transferencia ficticia verificada en el banco");
  await expect(revisar).toBeDisabled();
  await fichaB
    .getByLabel("Procedencia de la Transferencia de Anticipo")
    .fill("Extracto ficticio de la cuenta");
  await expect(revisar).toBeEnabled();
  await shotBoth("confirmacion-b");

  await revisar.click();
  const confirmacion = fichaB.getByRole("region", {
    name: "Vista previa de confirmación",
  });
  await expect(confirmacion).toBeVisible();
  await expect(confirmacion.getByText(/Efecto presupuestario/)).toBeVisible();
  // El servidor ya no anuncia ejecución de la Aportación a saldo para una B.
  await expect(confirmacion.getByText(/no ejecuta la Aportación a saldo/)).toBeVisible();
  await confirmacion.getByLabel("Transferencia realizada").check();
  await confirmacion
    .getByRole("button", { name: "Confirmar transferencia realizada" })
    .click();
  await expect(fichaB.getByText("Transferencia confirmada. El Movimiento real ya existe.")).toBeVisible();
  await expect(fichaB.getByText("Confirmada", { exact: true })).toBeVisible();
  await expect(page.getByText(/Pendiente de realizar\./)).toHaveCount(0);

  // §5.3: la Referencia real nace al confirmar, con su propio ID.
  const trasConfirmar = await get("/transferencias-pendientes/" + pendienteB.id);
  expect(trasConfirmar.item.estado).toBe("Confirmada");
  expect(trasConfirmar.item.fechaEfectiva).toBe(hoy);
  expect(trasConfirmar.item.movimiento).not.toBeNull();
  const referenciasCreadas = await get("/referencias");
  const nueva = (referenciasCreadas.items ?? referenciasCreadas.referencias ?? []).find(
    (r: any) => r.nombre === "Anticipo intención I5",
  );
  expect(nueva).toBeTruthy();
  const movimiento = await get("/movimientos/" + trasConfirmar.item.movimiento.id);
  expect(movimiento.movimiento.referencia.id).toBe(nueva.id);
  await shotBoth("confirmada-b");

  // ── 3. Modalidad A con Transferencia ya realizada (§4, AC-03) ───────────
  await page.goto("/movimientos/nuevo?tipo=Gasto");
  await page.getByRole("radio", { name: "Pago directo desde otro Saldo" }).check();
  await page.getByRole("checkbox", { name: "Transferencia ya realizada" }).check();
  await expect(page.getByLabel("Fecha real de la Transferencia")).toBeVisible();
  await fecha.fill(hoy);
  await importe.fill("20,00");
  await pagador.selectOption(pagadorA.id);
  await page.getByLabel(/^Partida/).selectOption(partida.id);
  await page.getByLabel("Concepto", { exact: true }).fill("Compra realizada I5");
  await page.getByLabel("Saldo que aporta").selectOption(aportaA.id);
  await page.getByLabel("Importe de la Transferencia realizada").fill("20,00");
  await page.getByLabel("Fecha real de la Transferencia").fill(hoy);
  await shotBoth("formulario-a-realizada");

  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(previa.getByText("Ya realizada")).toBeVisible();
  await page.getByRole("button", { name: "Registrar operación" }).click();
  await expect(
    page.getByRole("heading", { name: "Compra realizada I5" }),
  ).toBeVisible();
  const gastoRealizada = page.url().split("/").pop()!;
  const detalleRealizada = await get("/movimientos/" + gastoRealizada);
  expect(detalleRealizada.movimiento.tipo).toBe("Gasto");
  // No se crea ningún pendiente: los dos hechos ya son reales.
  expect(
    (await get("/transferencias-pendientes?estado=Pendiente%20de%20realizar")).total,
  ).toBe(0);
  const hechos = await get(
    "/movimientos?" + new URLSearchParams({ tipo: "Transferencia", page: "1" }),
  );
  const traspaso = (hechos.movimientos ?? []).find(
    (m: any) =>
      m.origen?.id === aportaA.id &&
      m.destino?.id === pagadorA.id &&
      m.importe === "20.00",
  );
  expect(traspaso, JSON.stringify(hechos.movimientos)).toBeTruthy();
  await shotBoth("resultado-realizada");

  // ── AC-22: 409 de coincidencia sin perder el borrador ───────────────────
  await page.goto("/movimientos/nuevo?tipo=Gasto");
  await page.getByRole("radio", { name: "Pago directo desde otro Saldo" }).check();
  await fecha.fill(hoy);
  await importe.fill("15,00");
  await pagador.selectOption(pagadorA.id);
  await page.getByLabel(/^Partida/).selectOption(partida.id);
  await page.getByLabel("Concepto", { exact: true }).fill("Compra 409 I5");
  await origen.selectOption(aportaA.id);
  await importeTransferencia.fill("10,00");
  await page.getByLabel("Fecha prevista").fill(hoy);
  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(previa).toBeVisible();
  await expect(
    page.getByLabel("Es otro hecho económico real y no un duplicado"),
  ).toHaveCount(0);

  // El mismo hecho aparece por otro flujo entre la vista previa y el registro.
  const borradorAjeno = {
    tipo: "Gasto",
    fecha: hoy,
    importe: "15.00",
    saldo: pagadorA.id,
    partida: partida.id,
    concepto: "Compra 409 I5",
    nota: "",
  };
  const impactoAjeno = await post("/movimientos/impacto", borradorAjeno);
  expect(impactoAjeno.status, JSON.stringify(impactoAjeno.data)).toBe(200);
  const ajeno = await post("/movimientos", {
    ...borradorAjeno,
    fingerprint: impactoAjeno.data.fingerprint,
  });
  expect(ajeno.status, JSON.stringify(ajeno.data)).toBe(201);

  await page.getByRole("button", { name: "Registrar operación" }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "Hay Movimientos coincidentes",
  );
  await expect(page.getByText(/borrador se conserva/)).toBeVisible();
  // El borrador sigue escrito, campo a campo.
  await expect(importe).toHaveValue("15,00");
  await expect(page.getByLabel("Concepto", { exact: true })).toHaveValue("Compra 409 I5");
  await expect(importeTransferencia).toHaveValue("10,00");
  await expect(page.getByRole("radio", { name: "Pago directo desde otro Saldo" })).toBeChecked();
  await expect(pagador.locator("option:checked")).toHaveText(new RegExp(pagadorA.id));
  await shotBoth("conflicto-409");

  // Y el borrador es utilizable: se confirma la coincidencia y se registra.
  await page.getByLabel("Es otro hecho económico real y no un duplicado").check();
  await page.getByRole("button", { name: "Registrar operación" }).click();
  await expect(page.getByRole("heading", { name: "Compra 409 I5" })).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});
