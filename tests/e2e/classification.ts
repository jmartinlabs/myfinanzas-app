import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

export async function classificationJourney(page: Page) {
  mkdirSync("artifacts/e1-2", { recursive: true });
  const shot = async (name: string) => {
    await page.evaluate(() => scrollTo(0, 0));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/e1-2/${name}.png`,
      fullPage: true,
    });
  };
  const heading = (name: string) =>
    page.getByRole("heading", { name, exact: true });
  const navigate = async (path: string) => {
    await page.goto(path);
    await expect(page.locator("#main")).toBeVisible();
  };
  async function createCategory(name: string) {
    await navigate("/clasificacion/categorias/nuevo");
    await expect(heading("Nueva Categoría")).toBeVisible();
    await page.getByLabel("Nombre *", { exact: true }).fill(name);
    await page
      .getByLabel("Grupo (opcional)")
      .fill("Grupo descriptivo ficticio");
    await page
      .getByLabel("Cálculo anual *", { exact: true })
      .selectOption("No aplica");
    await page
      .getByLabel("Cálculo mensual *", { exact: true })
      .selectOption("Gasto");
    await page
      .getByLabel("Referencia obligatoria *", { exact: true })
      .selectOption("false");
    await page
      .getByRole("button", { name: "Crear Categoría", exact: true })
      .click();
    await expect(heading(name)).toBeVisible();
    return page.url().split("/").at(-1)!;
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await navigate("/clasificacion/partidas");
  await expect(
    page.getByText("Todavía no hay elementos activos"),
  ).toBeVisible();
  await shot("empty-desktop");
  await navigate("/clasificacion/categorias/nuevo");
  await expect(page.getByLabel("Referencia obligatoria *")).toHaveValue("");
  await page
    .getByRole("button", { name: "Crear Categoría", exact: true })
    .click();
  await expect(page.locator(".field-error")).toHaveCount(4);
  await shot("validation-desktop");
  const first = await createCategory("Vida cotidiana ficticia");
  const second = await createCategory("Destino de corrección ficticio");
  await navigate("/clasificacion/subcategorias/nuevo");
  await page.getByLabel("Nombre *", { exact: true }).fill("Café de prueba");
  await page.getByLabel("Categoría *", { exact: true }).selectOption(first);
  await page
    .getByRole("button", { name: "Crear Subcategoría", exact: true })
    .click();
  await expect(heading("Café de prueba")).toBeVisible();
  const sub = page.url().split("/").at(-1)!;
  await navigate("/clasificacion/subcategorias/nuevo");
  await page.getByLabel("Nombre *", { exact: true }).fill("CAFÉ DE PRUEBA");
  await page.getByLabel("Categoría *", { exact: true }).selectOption(second);
  await page
    .getByRole("button", { name: "Crear Subcategoría", exact: true })
    .click();
  await expect(
    page.getByText("ERROR · Subcategoría duplicada", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre *", { exact: true })).toHaveValue(
    "CAFÉ DE PRUEBA",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await navigate("/clasificacion/partidas/nuevo");
  await page
    .getByLabel("Nombre *", { exact: true })
    .fill("Gasto cotidiano ficticio");
  await page.getByLabel("Subcategoría *", { exact: true }).selectOption(sub);
  await shot("form-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("form-mobile");
  await page
    .getByRole("button", { name: "Crear Partida", exact: true })
    .click();
  await expect(heading("Gasto cotidiano ficticio")).toBeVisible();
  const partida = page.url().split("/").at(-1)!;
  await expect(page.getByText("Presupuesto: Sin asignación")).toBeVisible();
  await shot("detail-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("detail-desktop");
  await navigate("/clasificacion/partidas");
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(1);
  await expect(page.locator(".desktop-list")).toContainText(
    "Vida cotidiana ficticia / Café de prueba",
  );
  await shot("list-desktop");
  const primary = page.getByRole("button", {
    name: "Nueva Partida",
    exact: true,
  });
  await expect(primary).toHaveCSS("color", "rgb(36, 50, 14)");
  await expect(primary).toHaveCSS("background-color", "rgb(141, 187, 46)");
  await page.getByLabel("Buscar nombre o ID").fill("No coincide");
  await expect(
    page.getByRole("heading", { name: "Sin coincidencias" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(1);
  await page.getByLabel("Categoría", { exact: true }).selectOption(second);
  await expect(
    page.getByRole("heading", { name: "Sin coincidencias" }),
  ).toBeVisible();
  await page.getByLabel("Categoría", { exact: true }).selectOption(first);
  await page.getByLabel("Subcategoría", { exact: true }).selectOption(sub);
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".desktop-list")).toBeHidden();
  await expect(page.locator(".mobile-list li")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    ),
  ).toBe("light");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("link", { name: "Clasificación", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "Abrir menú" }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".mobile-list li")).toHaveCount(1);
  await shot("list-mobile");
  // State guard shows actual descendant identities, then bottom-up changes without cascades.
  await navigate(`/clasificacion/categorias/${first}`);
  await page
    .getByRole("button", { name: "Desactivar Categoría", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar desactivar", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(partida);
  await shot("blocked-mobile");
  for (const [kind, id, name] of [
    ["partidas", partida, "Partida"],
    ["subcategorias", sub, "Subcategoría"],
    ["categorias", first, "Categoría"],
  ]) {
    await navigate(`/clasificacion/${kind}/${id}`);
    await page
      .getByRole("button", { name: `Desactivar ${name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar desactivar", exact: true })
      .click();
    await expect(page.locator(".page-head .tag")).toHaveText("Inactiva");
  }
  await navigate("/clasificacion/partidas");
  await page.getByLabel("Estado", { exact: true }).selectOption("Inactiva");
  await expect(page.locator(".mobile-list li")).toHaveCount(1);
  await shot("inactive-mobile");
  for (const [kind, id, name] of [
    ["categorias", first, "Categoría"],
    ["subcategorias", sub, "Subcategoría"],
    ["partidas", partida, "Partida"],
  ]) {
    await navigate(`/clasificacion/${kind}/${id}`);
    await expect(page.locator(".page-head .tag")).toHaveText("Inactiva");
    await page
      .getByRole("button", { name: `Reactivar ${name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar reactivar", exact: true })
      .click();
    await expect(page.locator(".page-head .tag")).toHaveText("Activa");
  }
  // Explicit reparenting checks real catalog dependencies, not hypothetical financial engines.
  await navigate(`/clasificacion/subcategorias/${sub}/editar`);
  await page.getByLabel("Categoría *", { exact: true }).selectOption(second);
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("rectificación");
  await navigate(`/clasificacion/subcategorias/${sub}/rectificar`);
  await page.getByLabel("Categoría *", { exact: true }).selectOption(second);
  await page
    .getByRole("button", { name: "Revisar dependencias", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Vista previa del catálogo" }),
  ).toBeVisible();
  await expect(
    page.getByText("Catálogo y Movimientos comprobados.", {
      exact: false,
    }),
  ).toContainText("no comprobado");
  await expect(
    page.getByRole("button", { name: "Confirmar rectificación", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Motivo de rectificación *")
    .fill("Corrección ficticia revisada");
  await shot("rectification-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("rectification-desktop");
  await page
    .getByRole("button", { name: "Confirmar rectificación", exact: true })
    .click();
  await expect(heading("Café de prueba")).toBeVisible();
  await navigate(`/clasificacion/partidas/${partida}`);
  await expect(page.locator(".detail-grid")).toContainText(
    "Destino de corrección ficticio",
  );
  // Real competing edit retains the browser draft, including field errors and focus.
  await page
    .getByRole("button", { name: "Editar Partida", exact: true })
    .click();
  await page
    .getByLabel("Nombre *", { exact: true })
    .fill("Borrador conservado de clasificación");
  await page.evaluate(async (id) => {
    const session = await (await fetch("/api/auth/session")).json();
    const { item } = await (
      await fetch("/api/clasificacion/partidas/" + id)
    ).json();
    await fetch("/api/clasificacion/partidas/" + id, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": session.csrf,
      },
      body: JSON.stringify({
        revision: item.revision,
        nombre: "Edición concurrente ficticia",
      }),
    });
  }, partida);
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("ha cambiado");
  await expect(page.getByLabel("Nombre *", { exact: true })).toHaveValue(
    "Borrador conservado de clasificación",
  );
  await shot("conflict-desktop");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  // Loading is distinct from an empty catalog; no fake financial consumers.
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/clasificacion/partidas?*", async (route) => {
    await gate;
    await route.continue();
  });
  await navigate("/clasificacion/partidas");
  await expect(
    page.getByText("Cargando catálogo…", { exact: true }),
  ).toBeVisible();
  await shot("loading-desktop");
  release();
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(1);
  await page.unroute("**/api/clasificacion/partidas?*");
  // Transient HTTP errors are not replaced with empty lists.
  await page.route("**/api/clasificacion/partidas?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Fallo transitorio de prueba" }),
    }),
  );
  await navigate("/clasificacion/partidas");
  await expect(page.getByRole("alert")).toContainText("Fallo transitorio");
  await expect(
    page.getByText("Consulta no disponible", { exact: true }),
  ).toBeVisible();
  await shot("error-desktop");
  await page.unroute("**/api/clasificacion/partidas?*");
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(1);
  // Keyboard navigation and cancellation do not create records.
  await page
    .getByRole("button", { name: "Nueva Partida", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(heading("Nueva Partida")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.locator(".desktop-list tbody tr")).toHaveCount(1);
  // Historical absence is a local test fixture, not a real import or financial engine.
  execFileSync(
    process.env.BUN_BIN ?? "bun",
    [
      "-e",
      `import { Database } from 'bun:sqlite'; const db=new Database('.local/e2e/demo.sqlite'); db.run('UPDATE categorias SET anual=NULL,mensual=NULL,referencia=NULL WHERE id=?',[process.argv[1]]); db.close();`,
      second,
    ],
    { env: { ...process.env, NODE_ENV: "test" }, stdio: "pipe" },
  );
  await navigate(`/clasificacion/categorias/${second}/editar`);
  for (const name of [
    "Cálculo anual *",
    "Cálculo mensual *",
    "Referencia obligatoria *",
  ])
    await expect(page.getByLabel(name, { exact: true })).toHaveValue("");
  await page.getByLabel("Grupo (opcional)").fill("Grupo descriptivo revisado");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(heading("Destino de corrección ficticio")).toBeVisible();
  const absent = await page.evaluate(
    async (id) =>
      (await (await fetch("/api/clasificacion/categorias/" + id)).json()).item,
    second,
  );
  expect([absent.anual, absent.mensual, absent.referencia]).toEqual([
    null,
    null,
    null,
  ]);
  // Expired-session presentation retains an unsaved classification draft.
  await navigate("/clasificacion/partidas/nuevo");
  await page
    .getByLabel("Nombre *", { exact: true })
    .fill("Borrador tras sesión caducada");
  await page.getByLabel("Subcategoría *", { exact: true }).selectOption(sub);
  await page.route("**/api/clasificacion/partidas", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Sesión caducada de prueba" }),
    }),
  );
  await page
    .getByRole("button", { name: "Crear Partida", exact: true })
    .click();
  await expect(
    page.getByText("La sesión ha caducado.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre *", { exact: true })).toHaveValue(
    "Borrador tras sesión caducada",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("session-draft-mobile");
  await page.unroute("**/api/clasificacion/partidas");
  await navigate("/clasificacion/partidas");
  // Return to the viewport expected by the existing E1.1 restored-database journey.
  await page.setViewportSize({ width: 390, height: 844 });
  return { partida, sub, category: second };
}
