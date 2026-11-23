import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEVOLUCION_G1,
  DEVOLUCION_G1_ID,
  capacidadAbierta,
  leerCapacidadDevolucion,
  rectificarAnularCerrado,
} from "../src/devolucion-capacidad";
import { Movimientos } from "../src/Movimientos";

/** #572 · F2g de #538 · guarda de cliente de las escrituras de devolución. */

test("F2G-AC-09: el texto G-1 del cliente es el canónico de specs/38 §4", () => {
  expect(DEVOLUCION_G1).toBe(
    "Las operaciones de devolución no están disponibles hasta que el aviso de impacto y la confirmación estén integrados. Las devoluciones existentes se pueden consultar.",
  );
});

test("F2G-AC-10: campo ausente, forma inesperada o no booleano verdadero = CERRADO", () => {
  expect(capacidadAbierta({ disponible: true })).toBe(true);
  for (const raw of [
    {},
    { disponible: false },
    { disponible: "true" },
    { disponible: 1 },
    { disponible: null },
    { Disponible: true },
    null,
    undefined,
    "true",
    true,
    [],
    [{ disponible: true }],
  ])
    expect(capacidadAbierta(raw)).toBe(false);
});

test("F2G-AC-11: un error de carga (red, HTTP, JSON) = CERRADO y solo {disponible:true} abre", async () => {
  expect(await leerCapacidadDevolucion(async () => ({ disponible: true }))).toBe(true);
  expect(await leerCapacidadDevolucion(async () => ({ disponible: false }))).toBe(false);
  expect(await leerCapacidadDevolucion(async () => ({}))).toBe(false);
  expect(await leerCapacidadDevolucion(async () => undefined)).toBe(false);
  expect(
    await leerCapacidadDevolucion(async () => {
      throw new Error("No se pudo conectar.");
    }),
  ).toBe(false);
  expect(
    await leerCapacidadDevolucion(() => {
      throw new Error("fallo síncrono");
    }),
  ).toBe(false);
});

test("F2G-AC-12: el formulario de Movimientos arranca cerrado con la opción Devolución de gasto deshabilitada, sin ruido de G-1 fuera de ella", () => {
  const html = renderToStaticMarkup(<Movimientos path="/movimientos/nuevo" go={() => {}} />);
  expect(html).toMatch(/<option disabled=""[^>]*>Devolución de gasto<\/option>/);
  // La nota y el aria-describedby aparecen solo junto al control bloqueado.
  expect(html).not.toContain(`id="${DEVOLUCION_G1_ID}"`);
  expect(html).not.toContain(`aria-describedby="${DEVOLUCION_G1_ID}"`);
  for (const tipo of ["Ingreso", "Gasto", "Transferencia", "Amortización deuda"])
    expect(html).toMatch(new RegExp(`<option>${tipo}</option>`));
});

test("F2G-AC-13: un enlace directo con tipo Devolución de gasto deja el envío deshabilitado y descrito por G-1", () => {
  const html = renderToStaticMarkup(
    <Movimientos path="/movimientos/nuevo?tipo=Devolución de gasto" go={() => {}} />,
  );
  expect(html).toContain(`id="${DEVOLUCION_G1_ID}"`);
  expect(html).toContain(DEVOLUCION_G1);
  expect(html).toMatch(new RegExp(`<select[^>]*aria-label="Tipo \\*"[^>]*aria-describedby="${DEVOLUCION_G1_ID}"`));
  const submit = html.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? "";
  expect(submit).toContain("disabled");
  expect(submit).toContain(`aria-describedby="${DEVOLUCION_G1_ID}"`);
});

test("F2G-AC-15: rectificar/anular se cierra para una devolución o una compra con vínculo (R3 en la raíz) y solo con el gate cerrado", () => {
  const cerrado = (tipo: string, count?: number) =>
    rectificarAnularCerrado({
      disponible: false,
      tipo,
      devolucionesResumen: count === undefined ? undefined : { count },
    });
  expect(cerrado("Devolución de gasto")).toBe(true);
  expect(cerrado("Gasto", 2)).toBe(true);
  expect(cerrado("Gasto", 0)).toBe(false);
  expect(cerrado("Gasto")).toBe(false);
  expect(cerrado("Ingreso")).toBe(false);
  expect(
    rectificarAnularCerrado({ disponible: false, tipo: "Gasto", devolucionesResumen: null }),
  ).toBe(false);
  expect(
    rectificarAnularCerrado({
      disponible: true,
      tipo: "Devolución de gasto",
      devolucionesResumen: { count: 3 },
    }),
  ).toBe(false);
});

test("F2G-AC-16: una compra con vínculo cuya devolución se anuló (count 0) cierra por tieneVinculosDevolucion, igual que el servidor", () => {
  expect(
    rectificarAnularCerrado({
      disponible: false,
      tipo: "Gasto",
      devolucionesResumen: { count: 0 },
      tieneVinculosDevolucion: true,
    }),
  ).toBe(true);
  expect(
    rectificarAnularCerrado({
      disponible: false,
      tipo: "Gasto",
      devolucionesResumen: { count: 0 },
      tieneVinculosDevolucion: false,
    }),
  ).toBe(false);
  expect(
    rectificarAnularCerrado({ disponible: true, tipo: "Gasto", tieneVinculosDevolucion: true }),
  ).toBe(false);
});
