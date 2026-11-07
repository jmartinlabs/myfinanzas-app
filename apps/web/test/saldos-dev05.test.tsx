import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Saldo } from "../src/api";
import { SaldoForm } from "../src/SaldoForm";
import { SaldoDetail } from "../src/Saldos";

const saldo: Saldo = {
  id: "S006",
  nombre: "Cuenta principal",
  tipo: "Efectivo",
  control: "Movimientos",
  estado: "Activa",
  finalidad: "Ahorro",
  liquidez: true,
  mostrarComoBolsa: false,
  permiteSalidaExterior: null,
  fechaApertura: "2026-04-12",
  saldoApertura: "-123.45",
  objetivo: "0.00",
  revision: 3,
  posicion: {
    importe: "-123.45",
    condicion: "calculado",
    motivo: "Apertura + entradas − salidas vigentes.",
  },
};

test("SaldoForm conserva ids, etiquetas, ayudas y jerarquía con Field", () => {
  const html = renderToStaticMarkup(
    <SaldoForm onSaved={() => {}} onCancel={() => {}} />,
  );
  for (const key of [
    "nombre",
    "tipo",
    "control",
    "fechaApertura",
    "saldoApertura",
    "finalidad",
    "objetivo",
  ]) {
    expect(html).toContain(`id="${key}"`);
    expect(html).toContain(`id="${key}-error"`);
  }
  for (const key of ["nombre", "tipo", "control"]) {
    expect(html).toContain(`for="${key}"`);
  }
  for (const name of [
    "Nombre *",
    "Tipo *",
    "Control *",
    "Fecha apertura · opcional",
    "Saldo apertura (€) · opcional",
    "Objetivo (€) · opcional",
  ])
    expect(html).toContain(`aria-label="${name}"`);
  for (const title of [
    "Identificación",
    "Configuración económica",
    "Atributos de control",
  ])
    expect(html).toContain(`>${title}</h2>`);
  for (const description of [
    "Un nombre reconocible para tu Saldo.",
    "La apertura es una posición inicial, no un Movimiento.",
    "Independientes entre sí, del Tipo y del Control.",
  ])
    expect(html).toContain(description);
  for (const help of [
    "Solo combinaciones contrastadas. Manual aún no está habilitado.",
    "Fecha civil del inicio del control; no filtra el Saldo actual.",
    "Admite negativos y cero explícito. Máximo dos decimales.",
    "Sin objetivo no significa objetivo cero.",
  ])
    expect(html).toContain(help);

  expect(html).toContain('class="ui-form-grid"');
  expect(html.match(/class="panel ui-form-section"/g)?.length).toBe(3);
  expect(html).toContain('class="ui-field-required" aria-hidden="true">*');
  expect(html).toMatch(/<input[^>]*id="nombre"[^>]*required=""/);
  expect(html).toContain('role="switch"');
  expect(html).not.toContain('class="section-title"');
  expect(html).not.toContain('class="step-number"');
  expect(html).not.toContain('class="form-grid"');
});

test("SaldoDetail conserva la jerarquía y los datos de la ficha", () => {
  const html = renderToStaticMarkup(
    <SaldoDetail saldo={saldo} go={() => {}} onReload={() => {}} />,
  );

  expect(html).toContain(
    'class="ui-form-grid detail-grid saldo-detail-grid"',
  );
  expect(html.match(/class="panel ui-form-section"/g)?.length).toBe(3);
  for (const title of [
    "Identificación",
    "Configuración financiera",
    "Atributos de control",
  ])
    expect(html).toContain(`>${title}</h2>`);

  expect(html).toContain("<code>S006</code>");
  expect(html).toContain("Cuenta principal");
  expect(html).toContain("2026-04-12");
  expect(html).toContain("-123,45 €");
  expect(html).toContain("0,00 €");
  expect(html).toContain("Ahorro");
  expect(html).toContain("POSICIÓN ACTUAL");
  expect(html).toContain("Saldo actual");
  expect(html).toContain("Apertura + entradas − salidas vigentes.");
  expect(html).toContain('class="panel position-panel"');
});
