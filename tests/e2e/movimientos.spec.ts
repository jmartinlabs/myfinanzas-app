import { cyclePlanJourney } from "./planes-ciclo";
import { cycleOperationsJourney } from "./cycle-operations";
import { presupuestos } from "./presupuestos";
import { deudas } from "./deudas";
import { transferencias } from "./transferencias";
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { totp } from "../../apps/api/src/auth";

const THEMES = ["light-s", "dark-s", "hybrid-s", "graphite-lime"] as const;

/**
 * Paridad explícita tabla/carta: cada campo de la tarjeta conserva la misma
 * etiqueta, texto y enlace que la columna de la fila. No sustituye las
 * aserciones de contenido existentes; demuestra que la adaptación móvil no
 * pierde ni duplica información.
 */
async function expectMovementsParity(page: Page) {
  const table = await page.locator(".desktop-list").evaluate((root) => {
    const clean = (value: string | null) =>
      (value ?? "").replace(/\s+/g, " ").trim();
    const headers = Array.from(root.querySelectorAll("thead th")).map((th) =>
      clean(th.textContent),
    );
    return {
      hrefs: Array.from(root.querySelectorAll("tbody a")).map((anchor) =>
        anchor.getAttribute("href"),
      ),
      rows: Array.from(root.querySelectorAll("tbody tr")).map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        return Object.fromEntries(
          headers.map((header, index) => [
            header,
            clean(cells[index]?.textContent ?? ""),
          ]),
        );
      }),
    };
  });
  const cards = await page.locator(".movements-cards").evaluate((root) => {
    const clean = (value: string | null) =>
      (value ?? "").replace(/\s+/g, " ").trim();
    return {
      hrefs: Array.from(root.querySelectorAll(":scope > li a")).map((anchor) =>
        anchor.getAttribute("href"),
      ),
      rows: Array.from(root.querySelectorAll(":scope > li")).map((card) =>
        Object.fromEntries(
          Array.from(card.querySelectorAll(".ui-data-list-field")).map(
            (field) => [
              field.getAttribute("data-label") ?? "",
              clean(
                field.querySelector(".ui-data-list-value")?.textContent ?? "",
              ),
            ],
          ),
        ),
      ),
    };
  });
  expect(table.rows.length).toBeGreaterThan(0);
  expect(cards.rows).toEqual(table.rows);
  expect(cards.hrefs).toEqual(table.hrefs);
  await expect(
    page.locator(".desktop-list tbody tr td[data-kind='amount']"),
  ).toHaveCount(table.rows.length);
  await expect(
    page.locator(
      ".movements-cards > li .ui-data-list-field[data-kind='amount']",
    ),
  ).toHaveCount(table.rows.length);
}

test("E1.4 + E1.5: registro, cálculo, rectificación, anulación, guardas y restauración con MFA", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const child = spawn(
    process.env.BUN_BIN ?? "bun",
    ["apps/api/test-support/movimientos-server.ts"],
    { stdio: "pipe", env: { ...process.env, NODE_ENV: "test" } },
  );
  mkdirSync("artifacts/e1-4", { recursive: true });
  mkdirSync("artifacts/dev-06-i2", { recursive: true });
  const shot = async (name: string) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/e1-4/${name}.png`,
      fullPage: true,
    });
  };
  const expectNoOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  const evidence = async (name: string) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expectNoOverflow();
    await page.screenshot({
      path: `artifacts/dev-06-i2/${name}.png`,
      fullPage: true,
    });
  };
  const navigate = async (path: string) => {
    await page.goto(path);
  };
  const post = async (path: string, body: Record<string, unknown>) =>
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
  const get = async (path: string) =>
    page.evaluate(
      async (path) => await (await fetch("/api" + path)).json(),
      path,
    );
  try {
    await expect
      .poll(
        async () => {
          try {
            return (
              await request.get("http://127.0.0.1:3003/api/health")
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(200);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3003";
      const response = await route.fetch({ url: url.toString() });
      await route.fulfill({ response });
    });
    const password = "Contraseña ficticia navegador " + randomUUID();
    await navigate("/movimientos");
    await page
      .getByLabel("Código de activación")
      .fill(readFileSync(".local/e2e-movimientos/bootstrap.txt", "utf8"));
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
    await navigate("/movimientos");
    await expect(
      page.getByRole("heading", {
        name: "Todavía no hay movimientos",
        exact: true,
      }),
    ).toBeVisible();
    await shot("empty-desktop");
    const cat = (
      await post("/clasificacion/categorias", {
        nombre: "Vida cotidiana ficticia",
        anual: "Gasto",
        mensual: "Gasto",
        referencia: false,
      })
    ).data.item;
    const other = (
      await post("/clasificacion/categorias", {
        nombre: "Categoría revisada ficticia",
        anual: "No aplica",
        mensual: "Gasto",
        referencia: false,
      })
    ).data.item;
    const ref = (
      await post("/clasificacion/categorias", {
        nombre: "Caso con Referencia ficticio",
        anual: "Gasto",
        mensual: "Gasto",
        referencia: true,
      })
    ).data.item;
    const sub = (
      await post("/clasificacion/subcategorias", {
        nombre: "Compras ficticias",
        padre: cat.id,
      })
    ).data.item;
    const rs = (
      await post("/clasificacion/subcategorias", {
        nombre: "Caso ficticio",
        padre: ref.id,
      })
    ).data.item;
    const partida = (
      await post("/clasificacion/partidas", {
        nombre: "Consumo ficticio",
        padre: sub.id,
      })
    ).data.item;
    const rp = (
      await post("/clasificacion/partidas", {
        nombre: "Partida con Referencia",
        padre: rs.id,
      })
    ).data.item;
    const saldo = (
      await post("/saldos", {
        nombre: "Cuenta operativa ficticia",
        tipo: "Efectivo",
        control: "Movimientos",
        saldoApertura: "100",
        fechaApertura: "2026-10-20",
        permiteSalidaExterior: true,
      })
    ).data.saldo;
    const nc = (
      await post("/saldos", {
        nombre: "Saldo no controlado ficticio",
        tipo: "Efectivo",
        control: "No controlado",
        permiteSalidaExterior: true,
      })
    ).data.saldo;
    for (const inicio of ["2026-09-25", "2026-10-25", "2027-01-01"]) {
      const context = await get("/ciclos/contexto");
      expect(
        (
          await post("/ciclos", {
            inicio,
            saldoInicialComida: "0",
            contextRevision: context.revision,
          })
        ).status,
      ).toBe(201);
    }
    await navigate("/movimientos");
    await page.setViewportSize({ width: 390, height: 844 });
    await shot("empty-mobile");
    // Hold the real options request to exercise the loading boundary before tabbing.
    let releaseOptions!: () => void;
    const optionsReady = new Promise<void>((resolve) => {
      releaseOptions = resolve;
    });
    await page.route("**/api/movimientos/opciones", async (route) => {
      await optionsReady;
      await route.fallback();
    });
    await page
      .getByRole("button", { name: "Nuevo movimiento", exact: true })
      .click();
    const register = page.getByRole("button", {
      name: "Registrar movimiento",
      exact: true,
    });
    await expect(register).toBeDisabled();
    await expect(
      page.getByRole("heading", { name: "Nuevo movimiento", exact: true }),
    ).toBeFocused();
    const type = page.getByLabel("Tipo *", { exact: true }),
      date = page.getByLabel("Fecha económica *", { exact: true }),
      money = page.getByLabel("Importe (€) *", { exact: true }),
      concept = page.getByLabel("Concepto", { exact: true });
    await expect(type).toHaveValue("");
    await expect(date).toHaveValue("");
    await expect(money).toHaveValue("");
    releaseOptions();
    await expect(register).toBeEnabled();
    await page.unroute("**/api/movimientos/opciones");
    await page.getByRole("button", { name: "Cancelar", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Registrar movimiento", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Registrar movimiento", exact: true })
      .click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator("#error-mov-tipo")).toHaveText(
      "Selecciona un Tipo válido.",
    );
    await expect(type).toBeFocused();
    await shot("validation-mobile");
    const fill = async (
      kind: string,
      name: string,
      when: string,
      amount: string,
      balance: string,
    ) => {
      await type.selectOption(kind);
      await date.fill(when);
      await money.fill(amount);
      await page
        .getByLabel(
          kind === "Ingreso" ? "Saldo receptor *" : "Saldo origen *",
          { exact: true },
        )
        .selectOption(balance);
      if (kind === "Ingreso")
        await page
          .getByLabel("Subtipo *", { exact: true })
          .selectOption("Bonus");
      else
        await page
          .getByLabel("Partida *", { exact: true })
          .selectOption(partida.id);
      await concept.fill(name);
    };
    const create = async (
      kind: string,
      name: string,
      when: string,
      amount: string,
      balance = saldo.id,
    ) => {
      await navigate("/movimientos/nuevo");
      await fill(kind, name, when, amount, balance);
      await page
        .getByRole("button", { name: "Registrar movimiento", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name, exact: true }),
      ).toBeVisible();
      return page.url().split("/").at(-1)!;
    };
    await fill(
      "Ingreso",
      "Ingreso de auditoría ficticio",
      "2026-10-12",
      "50",
      saldo.id,
    );
    await shot("form-mobile");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await shot("form-desktop");
    await page
      .getByRole("button", { name: "Registrar movimiento", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Ingreso de auditoría ficticio",
        exact: true,
      }),
    ).toBeVisible();
    const first = page.url().split("/").at(-1)!;
    await expect(page.locator(".global-header")).toContainText(
      "octubre de 2026",
    );
    await shot("detail-desktop");
    await page.setViewportSize({ width: 390, height: 844 });
    await shot("detail-mobile");
    expect((await get("/saldos/" + saldo.id)).saldo.posicion.importe).toBe(
      "150.00",
    );
    await navigate("/saldos/" + saldo.id);
    await expect(page.locator(".position-panel")).toContainText("150,00 €");
    await expect(page.locator(".position-placeholder.calculated")).toHaveCSS(
      "color",
      "rgb(247, 245, 241)",
    );
    await shot("position-mobile");
    const gasto = await create(
      "Gasto",
      "Gasto de auditoría ficticio",
      "2026-10-13",
      "20",
    );
    expect((await get("/saldos/" + saldo.id)).saldo.posicion.importe).toBe(
      "130.00",
    );
    await navigate("/movimientos/nuevo");
    await fill(
      "Gasto",
      "Referencia todavía no disponible",
      "2026-10-13",
      "2",
      saldo.id,
    );
    await page.getByLabel("Partida *", { exact: true }).selectOption(rp.id);
    await expect(
      page.getByText("Esta Partida exige una Referencia verificable.", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Registrar movimiento", exact: true }),
    ).toBeDisabled();
    await shot("reference-blocked-mobile");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await create(
      "Gasto",
      "Gasto desde No controlado",
      "2026-10-13",
      "2",
      nc.id,
    );
    expect((await get("/saldos/" + nc.id)).saldo.posicion.importe).toBeNull();
    await navigate("/movimientos/nuevo");
    await fill(
      "Ingreso",
      "Otro hecho económico ficticio",
      "2026-10-12",
      "50",
      saldo.id,
    );
    await page
      .getByRole("button", { name: "Registrar movimiento", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Posible coincidencia", exact: true }),
    ).toBeVisible();
    await shot("duplicate-mobile");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await shot("duplicate-desktop");
    await page
      .getByRole("button", { name: "Registrar otro hecho real", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Otro hecho económico ficticio",
        exact: true,
      }),
    ).toBeVisible();
    const duplicate = page.url().split("/").at(-1)!;
    expect(duplicate).not.toBe(first);
    await navigate("/movimientos/nuevo");
    await fill(
      "Ingreso",
      "Respuesta perdida ficticia",
      "2026-10-14",
      "1",
      saldo.id,
    );
    await page.route("**/api/movimientos", async (route) => {
      const url = new URL(route.request().url());
      url.port = "3003";
      const response = await route.fetch({ url: url.toString() });
      expect(response.status()).toBe(201);
      await route.abort("failed");
    });
    await page
      .getByRole("button", { name: "Registrar movimiento", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("No se pudo conectar");
    await expect(money).toHaveValue("1");
    await page.unroute("**/api/movimientos");
    await page
      .getByRole("button", { name: "Reintentar registro", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Respuesta perdida ficticia",
        exact: true,
      }),
    ).toBeVisible();
    const lost = page.url().split("/").at(-1)!;
    expect((await get("/movimientos")).total).toBe(5);
    await navigate("/movimientos");
    await expect(page.locator(".desktop-list tbody tr")).toHaveCount(5);
    await expect(
      page.getByRole("region", { name: "Registro de Movimientos" }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("region", { name: "Tabla de Movimientos" }),
    ).toHaveCount(1);
    await shot("list-desktop");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.locator('[aria-label="Tabla de Movimientos"]'),
    ).toBeHidden();
    await expect(
      page.locator('[role="region"][tabindex="0"]:visible'),
    ).toHaveCount(0);
    await shot("list-mobile");
    // UI DEV-06 I2: el tramo 1051-1120 conserva dos columnas sin recortar filtros.
    await page.setViewportSize({ width: 1100, height: 1000 });
    const filtersLayout = await page
      .locator(".movements-list .filters")
      .evaluate((element) => ({
        tracks: getComputedStyle(element).gridTemplateColumns.split(" ").length,
        overflow: element.scrollWidth - element.clientWidth,
      }));
    expect(filtersLayout.tracks).toBe(2);
    expect(filtersLayout.overflow).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 390, height: 844 });
    // UI DEV-06 I2: 6 capturas base (3 temas × 1440/390) y paridad tabla/carta.
    await expectMovementsParity(page);
    const themeSelect = page.getByLabel("Apariencia");
    for (const theme of THEMES) {
      await themeSelect.selectOption(theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await expect(page.locator(".desktop-list")).toBeVisible();
      await expect(page.locator(".movements-cards")).toBeHidden();
      await evidence(`movimientos-${theme}-1440`);
      if (theme !== "graphite-lime")
        await expect(page.locator(".list-footer-total")).toBeHidden();
      if (theme === "graphite-lime") {
        const tracks = await page
          .locator(".movements-list .filters")
          .evaluate(
            (element) =>
              getComputedStyle(element).gridTemplateColumns
                .split(" ")
                .filter(Boolean).length,
          );
        expect(tracks).toBe(5);
        await expect(page.locator(".movement-search-icon")).toBeVisible();
        await expect(page.locator(".movement-status-dot")).toBeVisible();
        await expect(page.locator(".movement-type-icon").first()).toBeVisible();
        await expect(page.locator(".list-footer-total")).toBeVisible();
        const flows = await page
          .locator(".movement-amount")
          .evaluateAll((nodes) =>
            nodes.map((node) => ({
              flow: node.getAttribute("data-flow"),
              color: getComputedStyle(node).color,
            })),
          );
        expect(flows.find((flow) => flow.flow === "inflow")?.color).toBe(
          "rgb(127, 224, 168)",
        );
        expect(flows.find((flow) => flow.flow === "outflow")?.color).toBe(
          "rgb(255, 154, 140)",
        );
        await page.setViewportSize({ width: 820, height: 1000 });
        await expect(page.locator(".desktop-list")).toBeHidden();
        await expect(page.locator(".movements-cards")).toBeVisible();
        await expect(page.locator(".movements-cards .ui-data-list-item")).toHaveCount(
          5,
        );
        await expectNoOverflow();
        await evidence("movimientos-graphite-lime-820");
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator(".desktop-list")).toBeHidden();
      await expect(page.locator(".movements-cards")).toBeVisible();
      await expectMovementsParity(page);
      if (theme === "graphite-lime") {
        const tracks = await page
          .locator(".movements-list .filters")
          .evaluate(
            (element) =>
              getComputedStyle(element).gridTemplateColumns
                .split(" ")
                .filter(Boolean).length,
          );
        expect(tracks).toBe(1);
        await expect(page.locator(".movement-search-icon")).toBeVisible();
        await expect(
          page.locator(".movements-cards .movement-type-icon").first(),
        ).toBeVisible();
        await expect(page.locator(".list-footer-total")).toBeVisible();
      }
      await evidence(`movimientos-${theme}-390`);
    }
    await themeSelect.selectOption("light-s");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByText("Más filtros", { exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Desde", { exact: true })).toBeVisible();
    await page.getByLabel("Categoría", { exact: true }).selectOption(cat.id);
    await page.getByLabel("Subcategoría", { exact: true }).selectOption(sub.id);
    await page.getByLabel("Partida", { exact: true }).selectOption(partida.id);
    await expect(page.locator(".mobile-list li")).toHaveCount(2);
    await page.getByLabel("Saldo", { exact: true }).selectOption(saldo.id);
    await expect(page.locator(".mobile-list li")).toHaveCount(1);
    await shot("filters-mobile");
    await page.getByLabel("Saldo", { exact: true }).selectOption("");
    await page.getByLabel("Tipo", { exact: true }).selectOption("Gasto");
    await expect(page.locator(".mobile-list li")).toHaveCount(2);
    await page
      .getByLabel("Buscar Concepto, Nota o ID")
      .fill("sin coincidencias");
    await expect(
      page.getByRole("heading", { name: "Sin coincidencias", exact: true }),
    ).toBeVisible();
    for (const theme of THEMES) {
      await themeSelect.selectOption(theme);
      await expect(
        page.getByRole("heading", { name: "Sin coincidencias", exact: true }),
      ).toBeVisible();
      await expectNoOverflow();
      await evidence(`movimientos-vacio-${theme}-390`);
    }
    await themeSelect.selectOption("hybrid-s");
    await page
      .getByRole("button", { name: "Limpiar filtros", exact: true })
      .click();
    await navigate(`/movimientos/${first}/rectificar`);
    await expect(money).toHaveValue("50.00");
    await money.fill("40");
    await page
      .getByLabel("Motivo *", { exact: true })
      .fill("Corrección de importe capturado");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Impacto económico", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Impacto económico", exact: true }),
    ).toBeFocused();
    await shot("rectification-mobile");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await shot("rectification-desktop");
    await page
      .getByRole("button", { name: "Confirmar rectificación", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Ingreso de auditoría ficticio",
        exact: true,
      }),
    ).toBeVisible();
    expect((await get("/movimientos/" + first)).auditoria).toHaveLength(2);
    expect((await get("/saldos/" + saldo.id)).saldo.posicion.importe).toBe(
      "171.00",
    );
    // Actual financial dependency preview, not only catalogue descendants.
    await navigate(`/clasificacion/subcategorias/${sub.id}/rectificar`);
    await page
      .getByLabel("Categoría *", { exact: true })
      .selectOption(other.id);
    await page
      .getByRole("button", { name: "Revisar dependencias", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Movimientos afectados: 2",
        exact: true,
      }),
    ).toBeVisible();
    await shot("classification-impact-desktop");
    await page
      .getByLabel("Motivo de rectificación *")
      .fill("Jerarquía revisada con hechos reales ficticios");
    await page
      .getByRole("button", { name: "Confirmar rectificación", exact: true })
      .click();
    expect(
      (await get("/movimientos/" + gasto)).movimiento.partida.categoria.id,
    ).toBe(other.id);
    for (const id of [duplicate, lost]) {
      await navigate(`/movimientos/${id}/anular`);
      await page
        .getByLabel("Motivo *", { exact: true })
        .fill("Captura por error sin hecho económico real");
      await page
        .getByRole("button", { name: "Revisar impacto", exact: true })
        .click();
      if (id === duplicate) {
        await shot("annulment-desktop");
        await page.setViewportSize({ width: 390, height: 844 });
        await shot("annulment-mobile");
      }
      await page
        .getByRole("button", { name: "Confirmar anulación", exact: true })
        .click();
      await expect(
        page.getByText("Registro anulado:", { exact: false }),
      ).toBeVisible();
    }
    expect((await get("/saldos/" + saldo.id)).saldo.posicion.importe).toBe(
      "120.00",
    );
    expect((await get("/ciclos/contexto")).referencia.fecha).toBe("2026-10-13");
    await navigate("/movimientos");
    await page
      .getByLabel("Estado de Movimiento", { exact: true })
      .selectOption("Anulado");
    await expect(page.locator(".mobile-list li")).toHaveCount(2);
    await shot("annulled-mobile");
    await themeSelect.selectOption("graphite-lime");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.locator(".desktop-list tbody tr.annulled")).toHaveCount(2);
    await expect(
      page.locator(".desktop-list tbody tr.annulled .tag").first(),
    ).toBeVisible();
    expect(
      await page
        .locator(".desktop-list tbody tr.annulled .movement-amount")
        .first()
        .evaluate((element) => getComputedStyle(element).color),
    ).toBe("rgb(143, 152, 139)");
    await evidence("movimientos-anulados-graphite-lime-1440");
    await page.setViewportSize({ width: 820, height: 1000 });
    await evidence("movimientos-anulados-graphite-lime-820");
    await page.setViewportSize({ width: 390, height: 844 });
    await evidence("movimientos-anulados-graphite-lime-390");
    await themeSelect.selectOption("hybrid-s");
    await navigate("/movimientos/nuevo");
    await fill("Ingreso", "Fecha futura inválida", "2026-10-12", "1", saldo.id);
    const options = await get("/movimientos/opciones"),
      tomorrow = new Date(options.hoy + "T00:00:00Z");
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    await date.fill(tomorrow.toISOString().slice(0, 10));
    await page
      .getByRole("button", { name: "Registrar movimiento", exact: true })
      .click();
    await expect(
      page.getByText("No se admiten fechas futuras.", { exact: false }),
    ).toBeVisible();
    await shot("future-date-mobile");
    // Concurrent real write invalidates the financial preview; draft stays intact.
    await navigate(`/movimientos/${first}/rectificar`);
    await money.fill("39");
    await page
      .getByLabel("Motivo *", { exact: true })
      .fill("Borrador concurrente");
    await page
      .getByRole("button", { name: "Revisar impacto", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Impacto económico", exact: true }),
    ).toBeVisible();
    const competing = await post("/movimientos/impacto", {
      tipo: "Ingreso",
      fecha: "2026-10-10",
      importe: "1",
      saldo: saldo.id,
      subtipo: "Bonus",
    });
    expect(
      (
        await post("/movimientos", {
          tipo: "Ingreso",
          fecha: "2026-10-10",
          importe: "1",
          saldo: saldo.id,
          subtipo: "Bonus",
          fingerprint: competing.data.fingerprint,
        })
      ).status,
    ).toBe(201);
    await page
      .getByRole("button", { name: "Confirmar rectificación", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("contexto");
    await expect(money).toHaveValue("39");
    await shot("conflict-mobile");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.route("**/api/movimientos?*", (route) =>
      route.fulfill({
        status: 503,
        json: { error: "Consulta de prueba no disponible" },
      }),
    );
    await navigate("/movimientos");
    await expect(page.getByRole("alert")).toContainText("Consulta de prueba");
    for (const theme of THEMES) {
      await themeSelect.selectOption(theme);
      await expect(page.getByRole("alert")).toContainText("Consulta de prueba");
      if (theme === "graphite-lime")
        await expect(page.locator(".movement-status-dot")).toHaveAttribute(
          "data-state",
          "error",
        );
      await expectNoOverflow();
      await evidence(`movimientos-error-${theme}-390`);
    }
    await themeSelect.selectOption("hybrid-s");
    await shot("error-mobile");
    await page.unroute("**/api/movimientos?*");
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(page.locator(".mobile-list li")).toHaveCount(4);

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/movimientos?*", async (route) => {
      await gate;
      const url = new URL(route.request().url());
      url.port = "3003";
      await route.fulfill({
        response: await route.fetch({ url: url.toString() }),
      });
    });
    await navigate("/movimientos");
    await expect(page.getByRole("status")).toHaveText("Cargando Movimientos…");
    for (const theme of THEMES) {
      await themeSelect.selectOption(theme);
      await expect(page.getByRole("status")).toHaveText("Cargando Movimientos…");
      if (theme === "graphite-lime")
        await expect(page.locator(".movement-status-dot")).toHaveAttribute(
          "data-state",
          "loading",
        );
      await expectNoOverflow();
      await evidence(`movimientos-carga-${theme}-390`);
    }
    await themeSelect.selectOption("hybrid-s");
    await shot("loading-mobile");
    release();
    await expect(page.locator(".mobile-list li")).toHaveCount(4);
    await page.unroute("**/api/movimientos?*");
    // Paginación: mismos parámetros, mismos botones y mismo límite de 100.
    const listQueries: string[] = [];
    let pagedRows: unknown[] | null = null;
    await page.route("**/api/movimientos?*", async (route) => {
      const url = new URL(route.request().url());
      listQueries.push(url.search);
      url.port = "3003";
      const response = await route.fetch({ url: url.toString() });
      const json = await response.json();
      if (json.movimientos.length) pagedRows = json.movimientos;
      else if (pagedRows) json.movimientos = pagedRows;
      json.total = 250;
      await route.fulfill({ response, json });
    });
    await navigate("/movimientos");
    const previous = page.getByRole("button", {
      name: "Anterior",
      exact: true,
    });
    const next = page.getByRole("button", {
      name: "Siguiente",
      exact: true,
    });
    await expect(page.getByText("Página 1", { exact: true })).toBeVisible();
    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    await expect(page.locator(".desktop-list tbody tr")).toHaveCount(4);
    expect(listQueries.at(-1)).toContain("page=1");
    expect(listQueries.at(-1)).toContain("estado=Vigente");
    await next.click();
    await expect(page.getByText("Página 2", { exact: true })).toBeVisible();
    await expect(previous).toBeEnabled();
    await expect(next).toBeEnabled();
    await expect(page.locator(".movements-cards > li")).toHaveCount(4);
    expect(listQueries.at(-1)).toContain("page=2");
    expect(listQueries.at(-1)).toContain("estado=Vigente");
    for (const theme of THEMES) {
      await themeSelect.selectOption(theme);
      await expect(page.getByText("Página 2", { exact: true })).toBeVisible();
      await expectNoOverflow();
      if (theme === "graphite-lime")
        await expect(page.locator(".list-footer-total")).toContainText(
          "de 3 · 100 por página",
        );
      await evidence(`movimientos-paginacion-${theme}-390`);
    }
    await themeSelect.selectOption("hybrid-s");
    await next.click();
    await expect(page.getByText("Página 3", { exact: true })).toBeVisible();
    await expect(next).toBeDisabled();
    await previous.click();
    await expect(page.getByText("Página 2", { exact: true })).toBeVisible();
    await page.unroute("**/api/movimientos?*");
    await navigate("/movimientos");
    await expect(page.getByText("Página 1", { exact: true })).toBeVisible();
    await navigate("/movimientos/999999");
    await expect(page.getByRole("alert")).toContainText("no encontrado");
    await navigate("/movimientos/nuevo");
    await fill("Ingreso", "Borrador conservado", "2026-10-12", "3", saldo.id);
    await page.route("**/api/movimientos/impacto", (route) =>
      route.fulfill({
        status: 401,
        json: { error: "Sesión caducada de prueba" },
      }),
    );
    await page
      .getByRole("button", { name: "Registrar movimiento", exact: true })
      .click();
    await expect(
      page.getByText("La sesión ha caducado.", { exact: false }),
    ).toBeVisible();
    await expect(concept).toHaveValue("Borrador conservado");
    await shot("session-draft-mobile");
    await page.unroute("**/api/movimientos/impacto");
    expect((await get("/movimientos")).movimientos).toHaveLength(4);
    const e15 = await transferencias(page);
    const e16 = await deudas(page);
    const e21 = await cycleOperationsJourney(page);
    const e22 = await presupuestos(page, e16);
    const e23 = await cyclePlanJourney(page, e22.id);
    const expectedDebt = (await get("/deudas/" + e16.id)).item.capitalPendiente;
    const expectedBank = (await get("/saldos/" + e16.bank)).saldo.posicion
      .importe;
    expect(expectedDebt).toBe("712.00");
    expect(expectedBank).toBe("190.00");
    const snapshotCyclePlan = await get("/planes-ciclo/" + e23.cycle);
    const snapshotMovements = (await get("/movimientos?estado=")).movimientos;
    // Genuine VACUUM INTO/age restoration, normal login/TOTP in a second Effect server.
    const restored = spawn(
      process.env.BUN_BIN ?? "bun",
      ["apps/api/test-support/restore-server.ts"],
      {
        stdio: "pipe",
        env: {
          ...process.env,
          NODE_ENV: "test",
          E2E_RESTORE_DIR: ".local/e2e-movimientos",
          E2E_RESTORE_PORT: "3004",
        },
      },
    );
    try {
      await expect
        .poll(
          async () => {
            try {
              return (
                await request.get("http://127.0.0.1:3004/api/health")
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
        url.port = "3004";
        await route.fulfill({
          response: await route.fetch({ url: url.toString() }),
        });
      });
      await navigate("/movimientos");
      await page.getByLabel("Contraseña", { exact: true }).fill(password);
      await page
        .getByRole("button", { name: "Continuar", exact: true })
        .click();
      await page
        .getByLabel("Código de la aplicación autenticadora")
        .fill(totp(secret).generate({ timestamp: Date.now() + 30000 }));
      await page.getByRole("button", { name: "Verificar código" }).click();
      await expect(page.locator(".recovery-codes code")).toHaveCount(10);
      await page
        .getByRole("button", { name: "He guardado los códigos · Continuar" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Saldos", exact: true }),
      ).toBeVisible();
      await navigate("/movimientos");
      await expect(page.locator(".mobile-list li")).toHaveCount(
        snapshotMovements.filter((m: { anulado: boolean }) => !m.anulado)
          .length,
      );
      expect((await get("/movimientos?estado=")).movimientos).toEqual(
        snapshotMovements,
      );
      const restoredPlan = await get("/planes-ciclo/" + e23.cycle);
      expect(restoredPlan.items).toEqual(snapshotCyclePlan.items);
      expect(restoredPlan.auditoria).toEqual(snapshotCyclePlan.auditoria);
      expect(restoredPlan.revision).toBe(snapshotCyclePlan.revision);
      await navigate("/planes-ciclo");
      await page
        .getByLabel("Ciclo del plan", { exact: true })
        .selectOption(e23.cycle);
      await expect(
        page
          .locator(".plan-card:visible, .plan-row:visible")
          .filter({ hasText: e23.budget }),
      ).toContainText("Excedido");
      await page.screenshot({
        path: "artifacts/e2-3/restored-mobile.png",
        fullPage: true,
      });
      expect(
        (await get("/ciclos/" + e21.correctedId + "/historial")).items,
      ).toEqual(e21.history);
      expect((await get("/ciclos/" + e21.omittedId)).ciclo.inicio).toBe(
        "2026-08-01",
      );
      expect((await get("/deudas/" + e16.id)).item.capitalPendiente).toBe(
        expectedDebt,
      );
      expect((await get("/saldos/" + e16.bank)).saldo.posicion.importe).toBe(
        expectedBank,
      );
      expect((await get("/presupuestos/" + e22.id)).item.nombre).toBe(
        "Presupuesto gasto ficticio",
      );
      expect(
        (await get("/clasificacion/partidas/" + e22.partida)).item.presupuesto,
      ).toBe(e22.id);
      expect(
        (await get("/clasificacion/partidas/" + e22.partida)).item.deuda,
      ).toBe(e22.debt);
      expect((await get("/referencias/" + e15.travel)).item.nombre).toBe(
        "Caso concurrentemente renombrado",
      );
      expect((await get("/saldos/" + e15.a)).saldo.posicion.importe).toBe(
        e15.position,
      );
      expect(
        (await get("/movimientos/" + e15.transfer)).auditoria,
      ).toHaveLength(3);
      expect((await get("/saldos/" + saldo.id)).saldo.posicion.importe).toBe(
        "121.00",
      );
      expect((await get("/movimientos/" + duplicate)).movimiento.anulado).toBe(
        true,
      );
      expect((await get("/movimientos/" + first)).auditoria).toHaveLength(2);
      await navigate("/movimientos/" + first);
      await expect(
        page.getByRole("heading", {
          name: "Ingreso de auditoría ficticio",
          exact: true,
        }),
      ).toBeVisible();
      await shot("restored-mobile");
      await navigate("/referencias/" + e15.travel);
      await expect(
        page.getByRole("heading", {
          name: "Caso concurrentemente renombrado",
          exact: true,
        }),
      ).toBeVisible();
      await page.screenshot({
        path: "artifacts/e1-5/restored-mobile.png",
        fullPage: true,
      });
    } finally {
      restored.kill("SIGTERM");
    }
    expect(errors).toEqual([]);
  } finally {
    child.kill("SIGTERM");
    await page.unroute("**/api/**");
  }
});
