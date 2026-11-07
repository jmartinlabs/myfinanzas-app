import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Ciclos } from "../src/Ciclos";

test("CycleForm conserva la apertura y la vista previa con Field", () => {
  const html = renderToStaticMarkup(
    <Ciclos path="/ciclos/nuevo" go={() => {}} />,
  );

  for (const id of ["inicio", "saldoInicialComida"]) {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`id="${id}-error"`);
    expect(html).toContain(`for="${id}"`);
  }
  expect(html).toContain('aria-label="Inicio ciclo *"');
  expect(html).toContain('aria-label="Saldo inicial comida (€) *"');
  expect(html).toContain('type="date"');
  expect(html).toContain('inputMode="decimal"');

  for (const title of ["Apertura del ciclo", "Vista previa del periodo"])
    expect(html).toContain(`>${title}</h2>`);
  for (const text of [
    "Introduce el importe expresamente: cero y negativos son válidos. No se copia el cierre anterior.",
    "Ambos campos son obligatorios. Sin importe ni fecha preseleccionados.",
    "Cargando contexto…",
  ])
    expect(html).toContain(text);

  expect(html).toContain('class="ui-form-grid"');
  expect(html.match(/class="panel ui-form-section"/g)?.length).toBe(2);
  expect(html).not.toContain('class="form-grid"');
  expect(html).not.toContain('class="section-title"');
  expect(html).not.toContain('class="step-number"');
});

test("CycleOperationForm conserva entradas manuales y motivo con Field", () => {
  const html = renderToStaticMarkup(
    <Ciclos path="/ciclos/omitido" go={() => {}} />,
  );

  expect(html).toContain('id="inicio"');
  expect(html).toContain('id="saldoInicialComida"');
  expect(html).toContain('id="motivo"');
  expect(html).toContain('aria-label="Inicio ciclo *"');
  expect(html).toContain('aria-label="Saldo inicial comida (€) *"');
  expect(html).toContain('aria-label="Motivo *"');
  expect(html).toContain('maxLength="1000"');
  expect(html).toContain(">Entradas manuales</h2>");
  expect(html).toContain(
    "Importe manual explícito: cero y negativos válidos. No se copia un cierre ni se modifica la apertura del siguiente ciclo.",
  );
  expect(html).toContain('class="ui-form-grid"');
  expect(html).toContain('class="panel ui-form-section"');
  expect(html).not.toContain('class="form-grid"');
  expect(html).not.toContain('class="section-title"');
  expect(html).not.toContain('class="step-number"');
});
