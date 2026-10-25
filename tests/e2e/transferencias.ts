import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
export async function transferencias(page: Page) {
  mkdirSync("artifacts/e1-5", { recursive: true });
  const shot = async (name: string) => {
    await page.evaluate(() => scrollTo(0, 0));
    await page.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => r())),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/e1-5/${name}.png`,
      fullPage: true,
    });
  };
  const get = (p: string) =>
    page.evaluate(async (p) => (await fetch("/api" + p)).json(), p);
  const write = (p: string, body: Record<string, unknown>, method = "POST") =>
    page.evaluate(
      async ({ p, body, method }) => {
        const s = await (await fetch("/api/auth/session")).json();
        const r = await fetch("/api" + p, {
          method,
          headers: {
            "content-type": "application/json",
            "x-csrf-token": s.csrf,
            "idempotency-key": crypto.randomUUID(),
          },
          body: JSON.stringify(body),
        });
        return { status: r.status, data: await r.json() };
      },
      { p, body, method },
    );
  const nav = (p: string) => page.goto(p);
  await nav("/referencias");
  await expect(
    page.getByRole("heading", { name: "Todavía no hay referencias" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("empty-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("empty-mobile");
  await page
    .getByRole("button", { name: "Nueva referencia", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Guardar referencia", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await shot("validation-mobile");
  await page
    .getByLabel("Nombre de Referencia *", { exact: true })
    .fill("Escapada ficticia");
  await page
    .getByLabel("Tipo de Referencia *", { exact: true })
    .selectOption("Viaje");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await shot("reference-form-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("reference-form-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Guardar referencia", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Escapada ficticia", exact: true }),
  ).toBeVisible();
  const travel = page.url().split("/").at(-1)!;
  expect(travel).toMatch(/^REF\d+$/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("reference-detail-desktop");
  await nav("/referencias/nueva");
  await page
    .getByLabel("Nombre de Referencia *", { exact: true })
    .fill("Evento ficticio");
  await page
    .getByLabel("Tipo de Referencia *", { exact: true })
    .selectOption("Evento");
  await page
    .getByRole("button", { name: "Guardar referencia", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Evento ficticio", exact: true }),
  ).toBeVisible();
  const event = page.url().split("/").at(-1)!;
  await nav("/referencias");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await shot("reference-list-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("reference-list-mobile");
  await page.getByLabel("Buscar nombre o ID").fill("Escapada");
  await expect(page.locator(".mobile-list li")).toHaveCount(1);
  await page.getByLabel("Buscar nombre o ID").fill("");
  await page
    .getByLabel("Tipo de Referencia", { exact: true })
    .selectOption("Evento");
  await expect(page.locator(".mobile-list li")).toHaveCount(1);
  await page.getByLabel("Tipo de Referencia", { exact: true }).selectOption("");
  await expect(page.locator(".mobile-list li")).toHaveCount(2);
  const account = async (
    nombre: string,
    opening: string,
    control = "Movimientos",
    exterior = false,
  ) => {
    const r = await write("/saldos", {
      nombre,
      tipo: "Efectivo",
      control,
      saldoApertura: opening,
      fechaApertura: "2026-10-20",
      permiteSalidaExterior: exterior,
    });
    expect(r.status).toBe(201);
    return r.data.saldo;
  };
  const a = await account("Banco A ficticio E1.5", "100"),
    b = await account("Banco B ficticio E1.5", "20"),
    terminal = await account("Terminal ficticio E1.5", "0", "Terminal", true),
    nc = await account("Sin control ficticio E1.5", "0", "No controlado");
  const cats = await get("/clasificacion/categorias?estado=");
  for (let i = cats.total + 1; i <= 14; i++)
    expect(
      (
        await write("/clasificacion/categorias", {
          nombre: "Clasificación ficticia " + i,
          anual: "Gasto",
          mensual: "Gasto",
          referencia: [11, 12, 13].includes(i),
        })
      ).status,
    ).toBe(201);
  const part = async (cat: string) => {
    const s = await write("/clasificacion/subcategorias", {
      nombre: "Sub E1.5 " + cat,
      padre: cat,
    });
    return (
      await write("/clasificacion/partidas", {
        nombre: "Partida E1.5 " + cat,
        padre: s.data.item.id,
      })
    ).data.item;
  };
  const travelPart = await part("CAT011"),
    optionalPart = await part("CAT014"),
    blockedPart = await part("CAT013"),
    anticipoPart = await part("CAT012");
  async function fillTransfer(
    concept: string,
    amount = "30",
    destination = b.id,
  ) {
    await page
      .getByLabel("Tipo *", { exact: true })
      .selectOption("Transferencia");
    await page
      .getByLabel("Fecha económica *", { exact: true })
      .fill("2026-10-12");
    await page.getByLabel("Importe (€) *", { exact: true }).fill(amount);
    await page.getByLabel("Saldo origen *", { exact: true }).selectOption(a.id);
    await page
      .getByLabel("Saldo destino *", { exact: true })
      .selectOption(destination);
    await page.getByLabel("Concepto", { exact: true }).fill(concept);
    await page
      .getByLabel("Referencia opcional", { exact: true })
      .selectOption(travel);
  }
  await nav("/movimientos/nuevo");
  await fillTransfer("Transferencia ficticia E1.5");
  await expect(page.getByLabel("Partida *", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Subtipo *", { exact: true })).toHaveCount(0);
  await expect(
    page
      .getByLabel("Saldo origen *", { exact: true })
      .locator('option[value="S000"]'),
  ).toHaveCount(0);
  await expect(
    page
      .getByLabel("Saldo destino *", { exact: true })
      .locator('option[value="S000"]'),
  ).toHaveCount(0);
  await shot("transfer-form-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("transfer-form-desktop");
  await page
    .getByRole("button", { name: "Revisar transferencia", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Impacto económico", exact: true }),
  ).toBeFocused();
  await expect(page.getByLabel("Vista previa de impacto")).toContainText(
    "70,00",
  );
  await expect(page.getByLabel("Vista previa de impacto")).toContainText(
    "50,00",
  );
  await shot("transfer-impact-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("transfer-impact-mobile");
  await page
    .getByRole("button", { name: "Confirmar transferencia", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Transferencia ficticia E1.5",
      exact: true,
    }),
  ).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  await shot("transfer-detail-mobile");
  expect((await get("/saldos/" + a.id)).saldo.posicion.importe).toBe("70.00");
  expect((await get("/saldos/" + b.id)).saldo.posicion.importe).toBe("50.00");
  await nav("/movimientos/nuevo");
  await fillTransfer("Hecho distinto coincidente E1.5");
  await page
    .getByRole("button", { name: "Revisar transferencia", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Posible coincidencia", exact: true }),
  ).toBeVisible();
  await shot("duplicate-mobile");
  await page
    .getByRole("button", { name: "Registrar otro hecho real", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Hecho distinto coincidente E1.5",
      exact: true,
    }),
  ).toBeVisible();
  await nav("/movimientos/" + id + "/rectificar");
  await page.getByLabel("Importe (€) *", { exact: true }).fill("25");
  await page
    .getByLabel("Motivo *", { exact: true })
    .fill("Corrección de importe capturado");
  await page
    .getByRole("button", { name: "Revisar impacto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Impacto económico", exact: true }),
  ).toBeFocused();
  await shot("rectification-mobile");
  await page
    .getByRole("button", { name: "Confirmar rectificación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Transferencia ficticia E1.5",
      exact: true,
    }),
  ).toBeVisible();
  expect((await get("/movimientos/" + id)).auditoria).toHaveLength(2);
  await nav("/movimientos/" + id + "/anular");
  await page
    .getByLabel("Motivo *", { exact: true })
    .fill("Captura equivocada sin hecho económico");
  await page
    .getByRole("button", { name: "Revisar impacto", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Impacto económico", exact: true }),
  ).toBeFocused();
  await shot("annulment-mobile");
  await page
    .getByRole("button", { name: "Confirmar anulación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Transferencia ficticia E1.5",
      exact: true,
    }),
  ).toBeVisible();
  expect((await get("/saldos/" + a.id)).saldo.posicion.importe).toBe("70.00");
  await nav("/referencias/" + travel + "/editar");
  await expect(
    page.getByLabel("Tipo de Referencia *", { exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Nombre de Referencia *", { exact: true })
    .fill("Escapada renombrada ficticia");
  await shot("reference-edit-mobile");
  await page
    .getByRole("button", { name: "Guardar referencia", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Escapada renombrada ficticia",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Consultar movimientos de esta referencia" })
    .click();
  await expect(page.locator(".mobile-list li")).toHaveCount(1);
  await shot("reference-filter-mobile");
  await nav("/referencias/" + travel);
  await page
    .getByRole("button", { name: "Desactivar referencia", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Confirmar cambio de Estado",
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Reactivar referencia", exact: true }),
  ).toBeVisible();
  await shot("reference-inactive-mobile");
  await nav("/movimientos/nuevo");
  await page.getByLabel("Tipo *", { exact: true }).selectOption("Ingreso");
  await expect(
    page
      .getByLabel("Referencia opcional", { exact: true })
      .locator(`option[value="${travel}"]`),
  ).toHaveCount(0);
  await nav("/referencias/" + travel);
  await page
    .getByRole("button", { name: "Reactivar referencia", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar cambio de Estado", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Desactivar referencia", exact: true }),
  ).toBeVisible();
  // Finance a terminal once, then spend from that terminal, never again from the bank.
  await nav("/movimientos/nuevo");
  await fillTransfer("Financiación terminal E1.5", "5", terminal.id);
  await page
    .getByRole("button", { name: "Revisar transferencia", exact: true })
    .click();
  await expect(page.getByLabel("Vista previa de impacto")).toContainText(
    "Posición no calculable",
  );
  await shot("terminal-impact-mobile");
  await page
    .getByRole("button", { name: "Confirmar transferencia", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Financiación terminal E1.5",
      exact: true,
    }),
  ).toBeVisible();
  async function fillExpense(concept: string, p: string, reference = travel) {
    await page.getByLabel("Tipo *", { exact: true }).selectOption("Gasto");
    await page
      .getByLabel("Fecha económica *", { exact: true })
      .fill("2026-10-13");
    await page.getByLabel("Importe (€) *", { exact: true }).fill("12");
    await page
      .getByLabel("Saldo origen *", { exact: true })
      .selectOption(terminal.id);
    await page.getByLabel("Partida *", { exact: true }).selectOption(p);
    await page.getByLabel("Concepto", { exact: true }).fill(concept);
    if (reference)
      await page
        .getByLabel(
          p === travelPart.id ? "Referencia *" : "Referencia opcional",
          { exact: true },
        )
        .selectOption(reference);
  }
  await nav("/movimientos/nuevo");
  await fillExpense("Gasto terminal con Viaje", travelPart.id);
  await shot("required-reference-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("required-reference-desktop");
  await page
    .getByRole("button", { name: "Registrar movimiento", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Gasto terminal con Viaje",
      exact: true,
    }),
  ).toBeVisible();
  expect((await get("/saldos/" + a.id)).saldo.posicion.importe).toBe("65.00");
  expect(
    (await get("/saldos/" + terminal.id)).saldo.posicion.importe,
  ).toBeNull();
  await nav("/movimientos/nuevo");
  await fillExpense(
    "Opcional sin compatibilidad extra",
    optionalPart.id,
    travel,
  );
  await page
    .getByRole("button", { name: "Registrar movimiento", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Posible coincidencia", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Opcional sin compatibilidad extra",
      exact: true,
    }),
  ).toBeVisible();
  await nav("/movimientos/nuevo");
  await page.getByLabel("Tipo *", { exact: true }).selectOption("Gasto");
  await page
    .getByLabel("Partida *", { exact: true })
    .selectOption(blockedPart.id);
  await expect(
    page.getByRole("button", { name: "Registrar movimiento", exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("e3-blocked-mobile");
  // Round trip to a real Reference form preserves a memory-only movement draft.
  await nav("/movimientos/nuevo");
  await fillTransfer("Borrador para crear caso", "1", nc.id);
  await page
    .getByRole("button", { name: "Crear Viaje o Evento conservando borrador" })
    .click();
  await page
    .getByLabel("Nombre de Referencia *", { exact: true })
    .fill("Caso creado desde borrador");
  await page
    .getByLabel("Tipo de Referencia *", { exact: true })
    .selectOption("Evento");
  await page
    .getByRole("button", { name: "Guardar referencia", exact: true })
    .click();
  await expect(page.getByLabel("Concepto", { exact: true })).toHaveValue(
    "Borrador para crear caso",
  );
  await expect(page.getByLabel("Saldo destino *", { exact: true })).toHaveValue(
    nc.id,
  );
  await shot("draft-return-mobile");
  const today = (await get("/movimientos/opciones")).hoy,
    tomorrow = new Date(Date.parse(today + "T12:00:00Z") + 86400000)
      .toISOString()
      .slice(0, 10);
  await page.getByLabel("Fecha económica *", { exact: true }).fill(tomorrow);
  await page
    .getByRole("button", { name: "Revisar transferencia", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("fechas futuras");
  await shot("future-date-mobile");
  await page
    .getByLabel("Fecha económica *", { exact: true })
    .fill("2026-10-12");
  await page
    .getByRole("button", { name: "Revisar transferencia", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Impacto económico", exact: true }),
  ).toBeFocused();
  await write(
    "/referencias/" + travel,
    {
      revision: (await get("/referencias/" + travel)).item.revision,
      nombre: "Caso concurrentemente renombrado",
    },
    "PATCH",
  );
  await page
    .getByRole("button", { name: "Confirmar transferencia", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("contexto");
  await expect(page.getByLabel("Concepto", { exact: true })).toHaveValue(
    "Borrador para crear caso",
  );
  await shot("conflict-mobile");
  await nav("/referencias/REF999999");
  await expect(page.getByRole("alert")).toContainText("no encontrada");
  await shot("not-found-mobile");
  await page.route("**/api/referencias?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Consulta no disponible temporalmente" }),
    }),
  );
  await nav("/referencias");
  await expect(page.getByRole("alert")).toContainText("temporalmente");
  await shot("error-mobile");
  await page.unroute("**/api/referencias?*");
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.locator(".mobile-list li")).toHaveCount(3);
  let releaseReferences!: () => void;
  const referenceGate = new Promise<void>((resolve) => {
    releaseReferences = resolve;
  });
  await page.route("**/api/referencias?*", async (route) => {
    await referenceGate;
    await route.fallback();
  });
  await nav("/referencias");
  await expect(
    page
      .getByRole("status", { name: "" })
      .filter({ hasText: "Cargando Referencias" }),
  ).toBeVisible();
  await shot("loading-mobile");
  releaseReferences();
  await expect(page.locator(".mobile-list li")).toHaveCount(3);
  await page.unroute("**/api/referencias?*");
  await nav("/movimientos?referencia=" + travel);
  await expect(page.locator(".mobile-list li")).toHaveCount(4);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("movement-list-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("movement-list-mobile");
  // E3.1 enables CAT012; CAT013 above still proves the unavailable E3 guard.
  const created = await write("/anticipos/fichas", {
    nombre: "Anticipo ficticio H1 E2E",
  });
  expect(created.status).toBe(201);
  const anticipo = created.data.referencia.id;
  const source = await account(
    "Origen ficticio H1 E2E",
    "100",
    "Movimientos",
    true,
  );
  const target = await account("Destino ficticio H1 E2E", "0");
  const advance = {
    tipo: "Transferencia",
    fecha: "2026-10-13",
    importe: "10",
    origen: source.id,
    destino: target.id,
    referencia: anticipo,
    concepto: "Adelanto ficticio H1 E2E",
    anticipo: {
      rol: "Adelanto",
      origen: source.id,
      destino: target.id,
      evidencia: "Declaración ficticia E2E",
      procedencia: "Prueba H1",
    },
  };
  const impact = await write("/movimientos/impacto", advance);
  expect(impact.status).toBe(200);
  expect(
    (
      await write("/movimientos", {
        ...advance,
        fingerprint: impact.data.fingerprint,
        contextRevision: impact.data.contextRevision,
      })
    ).status,
  ).toBe(201);
  const before = await get("/anticipos/fichas/" + anticipo);
  expect(before.referencia.estado).toBe("Activa");
  expect(before.ficha).toBeTruthy();
  expect(before.cobertura).toBe("Verificada");
  expect(before.neto).toBe("10.00");
  const expense = {
    tipo: "Gasto",
    fecha: "2026-10-13",
    importe: "12",
    saldo: source.id,
    partida: anticipoPart.id,
    concepto: "Gasto relacionado H1 E2E",
  };
  // Exercise real authenticated validation; failed writes must leave bank/motor intact.
  for (const [reference, code] of [
    [null, "REFERENCE_REQUIRED"],
    ["REF999999", "REFERENCE_NOT_FOUND"],
    [travel, "REFERENCE_TYPE"],
  ] as const) {
    const rejected = await write("/movimientos", {
      ...expense,
      ...(reference ? { referencia: reference } : {}),
    });
    expect(rejected.status).toBe(422);
    expect(rejected.data.code).toBe(code);
  }
  expect((await get("/saldos/" + source.id)).saldo.posicion.importe).toBe(
    "90.00",
  );
  expect(await get("/anticipos/fichas/" + anticipo)).toEqual(before);
  await nav("/movimientos/nuevo");
  await fillExpense(expense.concepto, anticipoPart.id, "");
  await page
    .getByLabel("Saldo origen *", { exact: true })
    .selectOption(source.id);
  await page.getByLabel("Referencia *", { exact: true }).selectOption(anticipo);
  await expect(
    page.getByRole("region", { name: "Atribución Anticipo" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Rol Anticipo obligatorio", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Registrar movimiento", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: expense.concepto, exact: true }),
  ).toBeVisible();
  const movement = (await get("/movimientos/" + page.url().split("/").at(-1)!))
    .movimiento;
  expect(movement).toMatchObject({
    tipo: "Gasto",
    referencia: { id: anticipo, tipo: "Anticipo", estado: "Activa" },
    importe: "12.00",
  });
  expect(movement.anticipo ?? null).toBeNull();
  expect((await get("/saldos/" + source.id)).saldo.posicion.importe).toBe(
    "78.00",
  );
  expect((await get("/saldos/" + target.id)).saldo.posicion.importe).toBe(
    "10.00",
  );
  const after = await get("/anticipos/fichas/" + anticipo);
  for (const key of [
    "adelantado",
    "recuperado",
    "neto",
    "exceso",
    "cobertura",
    "pendientes",
    "operaciones",
    "pendientesAcreditacion",
    "pares",
  ])
    expect(after[key]).toEqual(before[key]);
  expect(after.relacionados).toHaveLength(1);
  expect(after.relacionados[0]).toMatchObject({
    id: movement.id,
    tipo: "Gasto",
    importe: "12.00",
    motivo: null,
  });
  await shot("anticipo-related-expense-mobile");
  return { travel, event, transfer: id, a: a.id, b: b.id, position: "65.00" };
}
