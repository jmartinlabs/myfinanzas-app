import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SaleForm } from "../src/Ventas";
import { Valoracion } from "../src/Valoracion";

test("SaleForm usa Field, FormSection y conserva campos y textos", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "location");
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: new URL("http://127.0.0.1/inversiones/ventas/nueva"),
    writable: true,
  });
  try {
    const html = renderToStaticMarkup(<SaleForm go={() => {}} />);

    for (const id of [
      "fecha",
      "saldoEfectivo",
      "saldoInversion",
      "instrumento",
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
    for (const label of [
      "Fecha *",
      "Saldo de efectivo *",
      "Saldo de inversión *",
      "Instrumento *",
      "Cantidad *",
      "Precio unitario *",
      "Divisa *",
      "Cambio histórico (EUR = 1 o vacío)",
      "EUR cobrado *",
      "Comisión EUR (incluida)",
      "Concepto",
      "Nota",
    ])
      expect(html).toContain(`>${label}</label>`);
    expect(html).toContain(">Datos de la venta</h2>");
    expect(html).toContain(
      "Referencia cantidad×precio×cambio: No calculable · Diferencia: No calculable.",
    );
    expect(html).toContain(
      "Cantidad disponible en el Saldo de inversión: selecciona Instrumento.",
    );
    expect(html.match(/class="panel ui-form-section"/g)?.length).toBe(1);
    expect(html.match(/class="ui-field"/g)?.length).toBe(11);
    expect(html.match(/class="ui-field ui-form-span"/g)?.length).toBe(1);
    expect(html).toContain('class="ui-form-grid"');
    expect(html).not.toContain('class="form-grid"');
    expect(html).not.toContain('class="field-error"');
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "location", descriptor);
    else delete (globalThis as { location?: Location }).location;
  }
});

test("ValuationForm usa secciones, Field y conserva campos de posición", () => {
  const html = renderToStaticMarkup(
    <Valoracion
      path="/inversiones/valoracion/S004/I1001/nueva?fecha=2026-06-30"
      go={() => {}}
      tabs={null}
    />,
  );

  for (const id of ["fecha", "procedencia", "valorEur"]) {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`id="${id}-error"`);
    expect(html).toContain(`for="${id}"`);
  }
  for (const label of [
    "Fecha de vigencia (DD/MM/AAAA) *",
    "Procedencia *",
    "Importe EUR *",
  ])
    expect(html).toContain(`>${label}</label>`);
  for (const title of [
    "Datos de la valoración",
    "Importe declarado",
    "Vista previa · no persiste",
  ])
    expect(html).toContain(`>${title}</h2>`);
  for (const text of [
    "Tipo de valoración *",
    "Posición derivada de Saldo de inversión + Instrumento; no editable.",
    "Cantidad en la fecha",
    "Recalculada en servidor; no se acepta cantidad base del cliente.",
    "Cobertura (derivada)",
    "Derivada y no editable. Solo Completa; sin lotes ni tramos.",
    "DD/MM/AAAA: 30/06/2026 · API ISO 2026-06-30 · no puede ser futura.",
    "Valor declarado por el usuario; hasta céntimos. 0,00 es válido y no es ausencia.",
  ])
    expect(html).toContain(text);
  expect(html).toContain('name="tipo"');
  expect(html).toContain('id="tipo-error"');
  expect(html.match(/class="panel ui-form-section"/g)?.length).toBe(3);
  expect(html.match(/class="ui-field"/g)?.length).toBe(3);
  expect(html).toContain('class="ui-form-grid"');
  expect(html).not.toContain('class="form-grid"');
  expect(html).not.toContain('class="field-error"');
});
