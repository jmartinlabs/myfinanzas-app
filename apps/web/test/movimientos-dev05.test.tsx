import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Movimientos } from "../src/Movimientos";

const html = renderToStaticMarkup(
  <Movimientos path="/movimientos/nuevo" go={() => {}} />,
);

test("MovementForm conserva etiquetas, ids y jerarquía con Field", () => {
  for (const id of [
    "tipo",
    "fecha",
    "importe",
    "concepto",
    "nota",
    "saldo",
    "referencia",
  ]) {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`id="${id}-error"`);
  }
  expect(html).toContain('for="tipo"');
  expect(html).toContain('for="fecha"');
  expect(html).toContain('for="importe"');
  expect(html).toContain('for="concepto"');
  expect(html).toContain('for="nota"');

  for (const label of [
    "Tipo *",
    "Fecha económica *",
    "Importe (€) *",
    "Concepto",
    "Nota",
    "Saldo receptor *",
    "Referencia opcional",
  ])
    expect(html).toContain(`aria-label="${label}"`);

  for (const title of [
    "Hecho ejecutado",
    "Relación financiera",
    "Contexto derivado",
  ])
    expect(html).toContain(`>${title}</h2>`);

  for (const text of [
    "Importe mayor que cero.",
    "Cambiar Tipo elimina campos incompatibles, sin convertir el hecho.",
    "Selecciona el Tipo para definir la dirección.",
    "No se copia el importe de ningún presupuesto ni se infiere una clasificación.",
  ])
    expect(html).toContain(text);

  expect(html).toContain('class="ui-form-grid"');
  expect(html.match(/class="panel ui-form-section"/g)?.length).toBe(3);
  expect(html).toContain("ui-form-span full-width");
  expect(html).not.toContain('class="form-grid"');
  expect(html).not.toContain('class="section-title"');
  expect(html).not.toContain('class="step-number"');
});

test("MovementForm mantiene el desglose de Deuda y su ayuda", () => {
  const debtHtml = renderToStaticMarkup(
    <Movimientos path="/movimientos/nuevo?tipo=Gasto" go={() => {}} />,
  );
  expect(debtHtml).toContain("Deuda vinculada");
  expect(debtHtml).toContain(
    "Sin Deuda: selecciona una Partida vinculada para un pago de Deuda.",
  );
  expect(debtHtml).toContain("Crear deuda conservando borrador");
  expect(debtHtml).toContain("Crear Viaje o Evento conservando borrador");
});
