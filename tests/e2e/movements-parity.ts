import { expect, type Page } from "@playwright/test";

/**
 * Paridad explícita tabla/carta: cada campo de la tarjeta conserva la misma
 * etiqueta, texto y enlace que la columna de la fila. No sustituye las
 * aserciones de contenido existentes; demuestra que la adaptación móvil no
 * pierde ni duplica información.
 *
 * Vive fuera de las specs para que cualquier entrega de Movimientos la
 * reutilice en lugar de reescribir su propia comparación.
 */
export async function expectMovementsParity(page: Page) {
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