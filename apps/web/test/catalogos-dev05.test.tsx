import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Clasificacion } from "../src/Clasificacion";
import { Referencias } from "../src/Referencias";

test("ClassificationForm de Partida conserva ids, etiquetas y jerarquía", () => {
  const html = renderToStaticMarkup(
    <Clasificacion path="/clasificacion/partidas/nuevo" go={() => {}} />,
  );

  for (const id of ["nombre", "presupuesto", "deuda"]) {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`id="${id}-error"`);
    expect(html).toContain(`for="${id}"`);
  }
  for (const label of [
    "Nombre *",
    "Presupuesto opcional",
    "Deuda opcional",
  ])
    expect(html).toContain(`aria-label="${label}"`);
  for (const title of ["Identificación", "Jerarquía"])
    expect(html).toContain(`>${title}</h2>`);

  expect(html).toContain("Cargando opciones…");
  expect(html).toContain(
    "0..1 Presupuesto por Partida. El impacto del vínculo presupuestario se comprueba al cambiarlo; no se recalculan importes aquí. La Deuda es independiente.",
  );
  expect(html).toContain(
    "Una Partida puede enlazar una Deuda. El enlace de una Partida utilizada está protegido; crea una nueva para el futuro. Presupuesto y Deuda son opcionales; la protección se conserva.",
  );
  expect(html).toContain('id="classification-groups"');
  expect(html).toContain('class="ui-form-grid"');
  expect(html.match(/class="ui-field classification-optional-field"/g)?.length).toBe(2);
  expect(html.match(/class="panel ui-form-section"/g)?.length).toBe(2);
  expect(html).not.toContain('class="form-grid"');
  expect(html).not.toContain('class="section-title"');
  expect(html).not.toContain('class="step-number"');
});

test("ClassificationForm de Categoría conserva sus campos y secciones", () => {
  const html = renderToStaticMarkup(
    <Clasificacion path="/clasificacion/categorias/nuevo" go={() => {}} />,
  );

  for (const id of ["nombre", "grupo"]) {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`id="${id}-error"`);
    expect(html).toContain(`for="${id}"`);
  }
  expect(html).toContain('aria-label="Nombre *"');
  expect(html).toContain('aria-label="Grupo (opcional)"');
  for (const title of ["Identificación", "Configuración"])
    expect(html).toContain(`>${title}</h2>`);
  expect(html).toContain("Cargando opciones…");
  expect(html).toContain('class="ui-form-grid"');
  expect(html.match(/class="panel ui-form-section"/g)?.length).toBe(2);
  expect(html).not.toContain('class="form-grid"');
  expect(html).not.toContain('class="section-title"');
  expect(html).not.toContain('class="step-number"');
});

test("ReferenceForm conserva ids, etiquetas y error asociado", () => {
  const html = renderToStaticMarkup(
    <Referencias path="/referencias/nueva" go={() => {}} />,
  );

  for (const id of ["nombre", "tipo"]) {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`id="${id}-error"`);
    expect(html).toContain(`for="${id}"`);
  }
  expect(html).toContain('aria-label="Nombre de Referencia *"');
  expect(html).toContain('aria-label="Tipo de Referencia *"');
  expect(html).toContain(">Identificación</h2>");
  for (const text of [
    "Estado inicial Activa. El alta de Vehículo se realiza desde «Nuevo vehículo» para crear la ficha 1:1 en la misma transacción.",
    "Sin importes ni cálculos propios",
  ])
    expect(html).toContain(text);
  expect(html).not.toContain("ID inmutable:");
  expect(html).toContain('class="ui-form-grid"');
  expect(html.match(/class="panel ui-form-section"/g)?.length).toBe(1);
  expect(html).not.toContain('class="form-grid"');
  expect(html).not.toContain('class="section-title"');
  expect(html).not.toContain('class="step-number"');
});
