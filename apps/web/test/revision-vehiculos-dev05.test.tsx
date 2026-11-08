import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RevisionComida } from "../src/RevisionComida";
import { Referencias } from "../src/Referencias";
import { Vehiculos } from "../src/Vehiculos";

const noop = () => {};

test("OperationForm de Detalle usa Field, FormSection y FormGrid", () => {
  const html = renderToStaticMarkup(
    <RevisionComida path="/revision-comida/nueva" go={noop} />,
  );

  for (const id of [
    "fecha",
    "concepto",
    "importe",
    "direccion",
    "esDevolucion",
    "clasificacion",
    "evidenciaBancaria",
    "evidenciaRelacionCompra",
    "cuentaOrigen",
  ]) {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`id="${id}-error"`);
    expect(html).toContain(`for="${id}"`);
  }
  for (const label of [
    "Fecha de operación",
    "Concepto",
    "Importe EUR",
    "Dirección",
    "Devolución identificada expresamente",
    "Clasificación",
    "Evidencia bancaria",
    "Relación con compra (opcional)",
    "Cuenta/origen descriptiva",
  ])
    expect(html).toContain(`>${label}</label>`);
  expect(html).toContain(">Datos de la operación</h2>");
  expect(html).toContain(
    "No crea ni modifica Movimientos, Saldos, Gastos ni ejecución presupuestaria. No se aceptan campos calculados por el cliente.",
  );
  expect(html).toContain('class="panel ui-form-section"');
  expect(html).toContain('class="ui-form-grid"');
  expect(html.match(/class="ui-field"/g)?.length).toBe(9);
  expect(html).not.toContain('class="form-grid"');
  expect(html).not.toContain('class="field-error"');
});

test("OperationForm de Reposición conserva sus campos y su ayuda", () => {
  const html = renderToStaticMarkup(
    <RevisionComida path="/revision-comida/reposiciones/nueva" go={noop} />,
  );

  for (const id of [
    "fecha",
    "concepto",
    "importe",
    "evidenciaBancaria",
    "cuentaOrigen",
  ]) {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`id="${id}-error"`);
    expect(html).toContain(`for="${id}"`);
  }
  expect(html).toContain(">Evidencia bancaria (obligatoria)</label>");
  for (const absent of [
    'id="direccion"',
    'id="esDevolucion"',
    'id="clasificacion"',
    'id="evidenciaRelacionCompra"',
  ])
    expect(html).not.toContain(absent);
  expect(html).toContain(
    "La reposición es una entrada real, no una devolución. Su asignación y cobertura pertenecen a E3.5.",
  );
  expect(html.match(/class="ui-field"/g)?.length).toBe(5);
  expect(html).not.toContain('class="form-grid"');
  expect(html).not.toContain('class="field-error"');
});

test("VehicleForm usa Field, FormSection y FormGrid sin perder etiquetas", () => {
  const html = renderToStaticMarkup(
    <Vehiculos path="/vehiculos/nuevo" go={noop} />,
  );

  for (const id of ["nombre", "matricula", "proximaITV", "cita"]) {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`id="${id}-error"`);
    expect(html).toContain(`for="${id}"`);
  }
  for (const label of [
    "Nombre *",
    "Matrícula (opcional)",
    "Próxima ITV (opcional)",
    "Cita (opcional)",
  ])
    expect(html).toContain(`>${label}</label>`);
  for (const ariaLabel of [
    "Nombre del vehículo *",
    "Matrícula del vehículo",
    "Próxima ITV",
    "Cita del vehículo",
  ])
    expect(html).toContain(`aria-label="${ariaLabel}"`);
  expect(html).toContain(">Identificación</h2>");
  expect(html).toContain(
    "Fechas en formato dd/mm/aaaa según el selector del navegador. La cita puede quedar vacía; las fechas pasadas son válidas. No se calcula periodicidad ni se envían avisos. Estado inicial Activa.",
  );
  expect(html).toContain('class="saldo-form"');
  expect(html).toContain('class="panel ui-form-section"');
  expect(html).toContain('class="ui-form-grid"');
  expect(html.match(/class="ui-field"/g)?.length).toBe(4);
  expect(html).not.toContain('class="form-grid"');
  expect(html).not.toContain('class="field-error"');
});

test("La ruta de conversión desde Referencias llega a VehicleForm", () => {
  // La carga de la Referencia ocurre en un efecto; sin DOM el formulario se
  // muestra en su estado de carga. La conversión completa se verifica en E2E.
  const html = renderToStaticMarkup(
    <Referencias path="/referencias/REF001/convertir" go={noop} />,
  );
  expect(html).toContain("Cargando vehículo…");
  expect(html).not.toContain("Página no encontrada.");
});
