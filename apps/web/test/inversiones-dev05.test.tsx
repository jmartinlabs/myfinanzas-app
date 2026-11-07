import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Inversiones } from "../src/Inversiones";

test("InstrumentForm usa Field, FormSection y conserva sus campos", () => {
  const html = renderToStaticMarkup(
    <Inversiones path="/inversiones/instrumentos/nuevo" go={() => {}} />,
  );

  for (const id of ["nombre", "isin", "isinEvidencia", "divisaReferencia"]) {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`id="${id}-error"`);
    expect(html).toContain(`for="${id}"`);
  }
  for (const label of [
    "Nombre *",
    "ISIN (opcional)",
    "Evidencia del ISIN",
    "Divisa de referencia (opcional)",
  ])
    expect(html).toContain(`>${label}</label>`);
  expect(html).toContain(">Identificación</h2>");
  expect(html).toContain(
    "Renombrar conserva el ID y las Compras. Un Instrumento inactivo no se ofrece para nuevas Compras.",
  );
  expect(html.match(/class="panel ui-form-section"/g)?.length).toBe(1);
  expect(html.match(/class="ui-field"/g)?.length).toBe(4);
  expect(html).toContain('class="ui-form-grid"');
  expect(html).not.toContain('class="form-grid"');
  expect(html).not.toContain('class="field-error"');
});

test("PurchaseForm usa secciones y conserva los campos y la ayuda", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "location");
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: new URL("http://127.0.0.1/inversiones/compras/nueva"),
    writable: true,
  });
  try {
    const html = renderToStaticMarkup(
      <Inversiones path="/inversiones/compras/nueva" go={() => {}} />,
    );

    for (const id of [
      "fecha",
      "instrumento",
      "saldoEfectivo",
      "saldoInversion",
      "cantidad",
      "precio",
      "divisa",
      "cambio",
      "importeEur",
      "comisionEur",
      "concepto",
      "nota",
    ]) {
      expect(html).toContain(`id="${id}"`);
      expect(html).toContain(`id="${id}-error"`);
      expect(html).toContain(`for="${id}"`);
    }
    for (const title of [
      "Datos de la operación",
      "Importe y divisa",
      "Detalle",
    ])
      expect(html).toContain(`>${title}</h2>`);
    expect(html).toMatch(
      /<label class="ui-field-label" for="fecha">Fecha \*<\/label>/,
    );
    expect(html).toContain(
      'class="ui-field ui-form-span"',
    );
    expect(html).toContain(
      "Referencia cantidad×precio×cambio: No calculable · Diferencia: No calculable.",
    );
    expect(html.match(/class="panel ui-form-section"/g)?.length).toBe(3);
    expect(html.match(/class="ui-field"/g)?.length).toBe(11);
    expect(html.match(/class="ui-field ui-form-span"/g)?.length).toBe(1);
    expect(html).not.toContain('class="form-grid"');
    expect(html).not.toContain('class="field-error"');
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "location", descriptor);
    else delete (globalThis as { location?: Location }).location;
  }
});
