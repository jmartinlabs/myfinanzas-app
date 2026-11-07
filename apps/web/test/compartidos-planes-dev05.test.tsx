import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Compartidos } from "../src/Compartidos";

test("NewShared conserva ids y usa Field, FormSection y FormGrid", () => {
  const html = renderToStaticMarkup(
    <Compartidos path="/compartidos/nuevo" go={() => {}} />,
  );

  expect(html).toContain('class="panel ui-form-section"');
  expect(html).toContain('class="ui-form-grid"');
  expect(html).toContain('class="ui-field ui-form-span"');
  expect(html).toContain('id="shared-name"');
  expect(html).toContain('id="shared-name-error"');
  expect(html).toContain('for="shared-name"');
  expect(html).toContain("Nombre del caso");
  expect(html).toContain(
    "Ejemplo ficticio: «Piso 2026». El nombre se puede editar después desde Referencias; el Tipo queda protegido al tener ficha.",
  );
  expect(html).not.toContain('class="form-grid"');
  expect(html).not.toContain('class="section-title"');
  expect(html).not.toContain('class="step-number"');
});
