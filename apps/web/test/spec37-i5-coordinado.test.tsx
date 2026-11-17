import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { TransferenciaPendienteDTO } from "../src/api";
import {
  GastoCoordinado,
  deficit,
  etiquetaModalidad,
  importeApi,
  mensajeCoordinado,
  payloadCoordinado,
  posicionEstimada,
  remanente,
} from "../src/GastoCoordinado";
import {
  AlertaPendienteDeRealizar,
  EtiquetaPendienteDeRealizar,
  TransferenciaPendienteFicha,
} from "../src/TransferenciaPendienteFicha";

/**
 * SPEC37 · I5 — UI coordinada.
 *
 * Lo que se comprueba aquí es lo que el marcado puede demostrar sin navegador:
 * estructura, etiquetas accesibles, campos por modalidad y la aritmética
 * informativa de §6. Los recorridos reales (alta, 409 con borrador, capturas)
 * viven en `tests/e2e/spec37-i5-ui-coordinada.spec.ts`.
 */

const saldo = (id: string, nombre: string, importe: string | null) => ({
  id,
  nombre,
  tipo: "Efectivo",
  control: "Movimientos",
  estado: "Activa",
  finalidad: null,
  liquidez: true,
  mostrarComoBolsa: false,
  permiteSalidaExterior: false,
  fechaApertura: null,
  saldoApertura: null,
  objetivo: null,
  revision: 1,
  posicion: {
    importe,
    condicion: importe === null ? "pendiente_motor" : "calculado",
    motivo: importe === null ? "Sin posición convencional" : "Apertura + movimientos",
  },
});

const pendiente = (
  overrides: Partial<TransferenciaPendienteDTO> = {},
): TransferenciaPendienteDTO => ({
  id: 12,
  estado: "Pendiente de realizar",
  importe: "30.00",
  origen: { id: "S001", nombre: "Cuenta principal", tipo: "Efectivo", control: "Movimientos", estado: "Activa" },
  destino: { id: "S002", nombre: "Cuenta pagadora", tipo: "Efectivo", control: "Movimientos", estado: "Activa" },
  cicloOrigen: "C1",
  fechaPrevista: "2026-11-20",
  fechaEfectiva: null,
  concepto: "Compra coordinada",
  nota: "",
  origenTipo: "RegistroCoordinado",
  repartoLinea: null,
  reparto: null,
  presupuesto: null,
  gasto: "42",
  gastoRevision: 3,
  modalidad: "B",
  anticipoPrevisto: null,
  anticipoIntencion: {
    nombre: "Anticipo sintético I5",
    apertura: "2026-11-01",
    evidencia: null,
  },
  anticipo: null,
  movimiento: null,
  motivoCancelacion: null,
  revision: 2,
  creado: "2026-11-10T00:00:00.000Z",
  actualizado: "2026-11-10T00:00:00.000Z",
  requiereRevision: false,
  motivosRevision: [],
  hoy: "2026-11-17",
  ...overrides,
});

test("importeApi conserva los céntimos y acepta la coma decimal", () => {
  expect(importeApi("1234,56")).toBe("1234.56");
  expect(importeApi("1234.56")).toBe("1234.56");
  expect(importeApi(" 30,5 ")).toBe("30.5");
  // No redondea: una tercera decimal sigue siendo un dato a corregir.
  expect(importeApi("10,555")).toBe("10.555");
});

test("§6 déficit verificable: MAX(0, Gasto − Disponible real)", () => {
  expect(deficit("60.00", "40.00")).toBe("20.00");
  expect(deficit("40.00", "40.00")).toBe("0.00");
  expect(deficit("30.00", "40.00")).toBe("0.00");
  // Terminal o Saldo sin posición convencional: no se inventa cero (AC-25).
  expect(deficit("60.00", null)).toBeNull();
  expect(deficit("", "40.00")).toBeNull();
});

test("§6 remanente positivo y posición estimada", () => {
  expect(remanente("40.00", "20.00")).toBe("20.00");
  expect(remanente("20.00", "20.00")).toBe("0.00");
  expect(remanente("10.00", "20.00")).toBe("0.00");
  expect(remanente("10.00", null)).toBeNull();
  expect(posicionEstimada("100.00", "20.00")).toBe("120.00");
  expect(posicionEstimada("100.00", "-130.00")).toBe("-30.00");
  expect(posicionEstimada(null, "20.00")).toBeNull();
});

test("§3 las etiquetas visibles son las de la spec", () => {
  expect(etiquetaModalidad("A")).toBe("Pago directo desde otro Saldo");
  expect(etiquetaModalidad("B")).toBe("Financiación mediante Anticipo");
});

test("payloadCoordinado: la modalidad decide qué forma de Referencia viaja", () => {
  const base = {
    fecha: "2026-11-15",
    importe: "60,00",
    saldo: "S002",
    partida: "PAR-1",
    concepto: "Compra",
    nota: "",
    modalidad: "A" as const,
    origen: "S001",
    importeTransferencia: "30,00",
    fechaPrevista: "2026-11-20",
    formaReferencia: "existente" as const,
    referencia: "REF001",
    anticipoNombre: "Anticipo",
    anticipoApertura: "2026-11-01",
    anticipoEvidencia: "evidencia",
  };
  const a = payloadCoordinado(base);
  expect(a.gasto).toEqual({
    fecha: "2026-11-15",
    importe: "60.00",
    saldo: "S002",
    partida: "PAR-1",
    concepto: "Compra",
    nota: "",
  });
  expect(a.pendiente).toEqual({
    modalidad: "A",
    importe: "30.00",
    origen: "S001",
    destino: "S002",
    fechaPrevista: "2026-11-20",
    concepto: "Compra",
    nota: "",
  });
  // A no admite Referencia: aunque el formulario conserve un valor antiguo.
  expect("anticipoPrevisto" in a.pendiente!).toBe(false);

  const existente = payloadCoordinado({ ...base, modalidad: "B" });
  expect(existente.pendiente!.anticipoPrevisto).toBe("REF001");
  expect("anticipoNombre" in existente.pendiente!).toBe(false);

  const intencion = payloadCoordinado({
    ...base,
    modalidad: "B",
    formaReferencia: "intencion",
  });
  expect(intencion.pendiente!.anticipoNombre).toBe("Anticipo");
  expect(intencion.pendiente!.anticipoApertura).toBe("2026-11-01");
  expect(intencion.pendiente!.anticipoEvidencia).toBe("evidencia");
  expect("anticipoPrevisto" in intencion.pendiente!).toBe(false);

  // Sin apertura no se envía evidencia: la regla del esquema no se sortea.
  const sinApertura = payloadCoordinado({
    ...base,
    modalidad: "B",
    formaReferencia: "intencion",
    anticipoApertura: "",
  });
  expect("anticipoApertura" in sinApertura.pendiente!).toBe(false);
  expect("anticipoEvidencia" in sinApertura.pendiente!).toBe(false);
});

test("los errores se mapean por code sin inventar códigos nuevos", () => {
  const conflicto = mensajeCoordinado(
    "IDEMPOTENCY_CONFLICT",
    "El intento ya corresponde a otros datos.",
  );
  expect(conflicto).toContain("Tu borrador se conserva");
  expect(conflicto).toContain("El intento ya corresponde a otros datos.");

  const revision = mensajeCoordinado("REVISION_CONFLICT", "La Transferencia pendiente ha cambiado.");
  expect(revision).toContain("El pendiente ha cambiado mientras editabas");

  const cerrado = mensajeCoordinado("HISTORY_LOCKED", "Ventana cerrada.");
  expect(cerrado).toContain("no se ha escrito nada");

  // Un código desconocido conserva el mensaje del servidor tal cual.
  const otro = mensajeCoordinado("CODIGO_QUE_NO_EXISTE", "Mensaje del servidor.");
  expect(otro).toBe("Mensaje del servidor.");
});

test("el formulario coordinado conserva etiquetas, ids y modalidades", () => {
  const html = renderToStaticMarkup(<GastoCoordinado go={() => {}} />);

  for (const id of [
    "coordinado-fecha",
    "coordinado-importe",
    "coordinado-saldo",
    "coordinado-partida",
    "coordinado-concepto",
    "coordinado-nota",
    "coordinado-origen",
    "coordinado-importeTransferencia",
    "coordinado-fechaPrevista",
  ]) {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`for="${id}"`);
    expect(html).toContain(`id="${id}-error"`);
  }

  for (const label of [
    "Fecha del Gasto *",
    "Importe del Gasto (€) *",
    "Saldo pagador *",
    "Partida *",
    "Saldo que aporta *",
    "Importe de la Transferencia prevista (€) *",
    "Fecha prevista *",
  ])
    expect(html).toContain(label);

  // §10.1: las dos modalidades con los nombres de §3, más la barra sincronizada.
  expect(html.match(/name="coordinado-modalidad"/g)?.length).toBe(2);
  expect(html).toContain("Pago directo desde otro Saldo");
  expect(html).toContain("Financiación mediante Anticipo");
  expect(html).toContain("Barra del importe previsto");
  expect(html).toContain('type="range"');
  expect(html).toContain('step="0.01"');
  expect(html).toContain("Vista previa");

  // La modalidad A es la predeterminada y no ofrece Referencia de Anticipo.
  expect(html).toContain(
    'type="radio" name="coordinado-modalidad" checked="" value="A"',
  );
  expect(html).not.toContain("Referencia de Anticipo existente");
  expect(html).toContain("Disponibilidad real");
  // Sin Saldo elegido no se publica un cero disfrazado de posición.
  expect(html).toContain("Déficit verificable: No disponible");
});

test("la alerta de §10.3 lleva icono y texto, no solo color", () => {
  const completa = renderToStaticMarkup(<AlertaPendienteDeRealizar />);
  expect(completa).toContain("pendiente-alerta-icono");
  expect(completa).toContain("Pendiente de realizar.");

  const chip = renderToStaticMarkup(<EtiquetaPendienteDeRealizar />);
  expect(chip).toContain("pendiente-alerta-chip");
  expect(chip).toContain("Pendiente de realizar");
});

test("la ficha muestra modalidad, Gasto, referencia prevista y acciones", () => {
  const html = renderToStaticMarkup(
    <TransferenciaPendienteFicha pendiente={pendiente()} go={() => {}} />,
  );

  expect(html).toContain("Pendiente de realizar.");
  expect(html).toContain("Financiación mediante Anticipo");
  expect(html).toContain("Gasto vinculado");
  expect(html).toContain("revisión 3");
  expect(html).toContain("Referencia de Anticipo prevista");
  expect(html).toContain("Intención de alta: Anticipo sintético I5");
  expect(html).toContain("Confirmar transferencia");
  expect(html).toContain("Editar importe y fecha prevista");
  expect(html).toContain("Vincular a una Transferencia existente");
  expect(html).toContain("Cancelar pendiente");
  // La evidencia y la procedencia son del acto de confirmar, no de la ficha.
  expect(html).not.toContain("Evidencia de la Transferencia de Anticipo");
});

test("la ficha de modalidad A no anuncia Referencia ni Anticipo", () => {
  const html = renderToStaticMarkup(
    <TransferenciaPendienteFicha
      pendiente={pendiente({
        modalidad: "A",
        anticipoIntencion: null,
        anticipoPrevisto: null,
        origenTipo: "Reparto",
        gasto: null,
        gastoRevision: null,
        repartoLinea: {
          id: 3,
          reparto: 1,
          clase: "Presupuesto",
          presupuesto: "PRE-A",
          incluida: true,
          motivoExclusion: null,
        },
        presupuesto: {
          id: "PRE-A",
          nombre: "Provisión",
          fuente: "Aportación a saldo",
          destino: "S002",
          estado: "Activo",
        },
      })}
      go={() => {}}
    />,
  );
  expect(html).toContain("Pago directo desde otro Saldo");
  expect(html).not.toContain("Referencia de Anticipo prevista");
  expect(html).toContain("Pendiente de realizar.");
});

test("los motivos de revisión del origen coordinado se explican en español", () => {
  const html = renderToStaticMarkup(
    <TransferenciaPendienteFicha
      pendiente={pendiente({
        requiereRevision: true,
        motivosRevision: ["GASTO_NO_COINCIDE", "REFERENCIA_NO_ELEGIBLE"],
      })}
      go={() => {}}
    />,
  );
  expect(html).toContain("El Gasto cambió");
  expect(html).toContain("ya no es elegible");
  expect(html).toContain("La confirmación queda bloqueada");
});