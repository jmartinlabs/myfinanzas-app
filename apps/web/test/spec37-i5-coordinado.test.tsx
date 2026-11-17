import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { TransferenciaPendienteDTO } from "../src/api";
import {
  SeccionAltaCoordinada,
  coordinadoVacio,
  deficit,
  erroresCoordinado,
  etiquetaModalidad,
  etiquetaModalidadAlta,
  importeApi,
  mensajeCoordinado,
  payloadCoordinado,
  posicionEstimada,
  remanente,
  type CoordinadoForm,
  type ModalidadAlta,
  type ModoTransferencia,
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
  const gasto = {
    fecha: "2026-11-15",
    // El llamador envía el importe ya normalizado (`importeApi`); el payload no
    // lo reinterpreta.
    importe: "60.00",
    saldo: "S002",
    partida: "PAR-1",
    concepto: "Compra",
    nota: "",
  };
  const valores: CoordinadoForm = {
    ...coordinadoVacio("2026-11-15"),
    origen: "S001",
    importe: "30,00",
    fecha: "2026-11-20",
    referencia: "REF001",
    anticipoNombre: "Anticipo",
    anticipoApertura: "2026-11-01",
    anticipoEvidencia: "evidencia",
    evidencia: "Extracto",
    procedencia: "Banco",
  };

  const a = payloadCoordinado({ gasto, modalidad: "A", modo: "pendiente", valores });
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

  const existente = payloadCoordinado({ gasto, modalidad: "B", modo: "pendiente", valores });
  expect(existente.pendiente!.anticipoPrevisto).toBe("REF001");
  expect("anticipoNombre" in existente.pendiente!).toBe(false);

  const intencion = payloadCoordinado({
    gasto,
    modalidad: "B",
    modo: "pendiente",
    valores: { ...valores, formaReferencia: "intencion" },
  });
  expect(intencion.pendiente!.anticipoNombre).toBe("Anticipo");
  expect(intencion.pendiente!.anticipoApertura).toBe("2026-11-01");
  expect(intencion.pendiente!.anticipoEvidencia).toBe("evidencia");
  expect("anticipoPrevisto" in intencion.pendiente!).toBe(false);

  // Sin apertura no se envía evidencia: la regla del esquema no se sortea.
  const sinApertura = payloadCoordinado({
    gasto,
    modalidad: "B",
    modo: "pendiente",
    valores: { ...valores, formaReferencia: "intencion", anticipoApertura: "" },
  });
  expect("anticipoApertura" in sinApertura.pendiente!).toBe(false);
  expect("anticipoEvidencia" in sinApertura.pendiente!).toBe(false);
});

test("payloadCoordinado: la Transferencia ya realizada viaja como hecho real", () => {
  const gasto = {
    fecha: "2026-11-15",
    importe: "60.00",
    saldo: "S002",
    partida: "PAR-1",
    concepto: "Compra",
    nota: "",
  };
  const valores: CoordinadoForm = {
    ...coordinadoVacio("2026-11-15"),
    origen: "S001",
    importe: "40,00",
    fecha: "2026-11-14",
    referencia: "REF001",
    evidencia: "Extracto",
    procedencia: "Banco",
  };

  // A realizada: Transferencia ordinaria, sin Referencia ni atribución.
  const a = payloadCoordinado({ gasto, modalidad: "A", modo: "realizada", valores });
  expect(a.pendiente).toBeUndefined();
  expect(a.transferencia).toEqual({
    fecha: "2026-11-14",
    importe: "40.00",
    origen: "S001",
    destino: "S002",
    concepto: "Compra",
    nota: "",
  });

  // B realizada: Referencia existente + atribución E3.1 del hecho real.
  const b = payloadCoordinado({ gasto, modalidad: "B", modo: "realizada", valores });
  expect(b.pendiente).toBeUndefined();
  expect(b.transferencia).toMatchObject({
    fecha: "2026-11-14",
    importe: "40.00",
    origen: "S001",
    destino: "S002",
    referencia: "REF001",
    atribucion: { evidencia: "Extracto", procedencia: "Banco" },
  });
  expect("anticipoNuevo" in b.transferencia!).toBe(false);

  // B realizada con Referencia nueva: el alta viaja junto a la Transferencia.
  const nueva = payloadCoordinado({
    gasto,
    modalidad: "B",
    modo: "realizada",
    valores: {
      ...valores,
      formaReferencia: "intencion",
      anticipoNombre: "Anticipo nuevo",
      anticipoApertura: "2026-11-01",
      anticipoEvidencia: "Resguardo",
    },
  });
  expect(nueva.transferencia).toMatchObject({
    anticipoNuevo: {
      nombre: "Anticipo nuevo",
      apertura: "2026-11-01",
      evidencia: "Resguardo",
    },
    atribucion: { evidencia: "Extracto", procedencia: "Banco" },
  });
  expect("referencia" in nueva.transferencia!).toBe(false);
});

test("erroresCoordinado exige lo que el servidor exige, sin inventar reglas", () => {
  const vacio = coordinadoVacio("");
  expect(Object.keys(erroresCoordinado("A", "pendiente", vacio)).sort()).toEqual([
    "fecha",
    "importe",
    "origen",
  ]);

  const completo: CoordinadoForm = {
    ...vacio,
    fecha: "2026-11-17",
    origen: "S001",
    importe: "30,00",
    referencia: "REF001",
  };
  expect(erroresCoordinado("A", "pendiente", completo)).toEqual({});
  // B necesita Referencia aunque el resto esté completo.
  expect(
    Object.keys(
      erroresCoordinado("B", "pendiente", { ...completo, referencia: "" }),
    ),
  ).toEqual(["referencia"]);
  // B ya realizada exige además la atribución del Anticipo.
  expect(
    Object.keys(erroresCoordinado("B", "realizada", completo)).sort(),
  ).toEqual(["evidencia", "procedencia"]);
  // Un importe no positivo no se acepta como cero.
  expect(
    erroresCoordinado("A", "pendiente", { ...completo, importe: "0" }).importe,
  ).toContain("mayor que cero");
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

test("§3 las tres opciones del alta usan los nombres de la spec", () => {
  expect(etiquetaModalidadAlta("normal")).toBe("Gasto normal");
  expect(etiquetaModalidadAlta("A")).toBe("Pago directo desde otro Saldo");
  expect(etiquetaModalidadAlta("B")).toBe("Financiación mediante Anticipo");
});

function seccion(
  modalidad: ModalidadAlta,
  modo: ModoTransferencia = "pendiente",
  over: Partial<CoordinadoForm> = {},
) {
  return renderToStaticMarkup(
    <SeccionAltaCoordinada
      id="mov-coordinado"
      modalidad={modalidad}
      modo={modo}
      valores={{ ...coordinadoVacio("2026-11-17"), ...over }}
      onModalidad={() => {}}
      onModo={() => {}}
      onChange={() => {}}
      saldos={[
        saldo("S001", "Cuenta principal", "500.00"),
        saldo("S002", "Cuenta pagadora", "40.00"),
      ]}
      pagador={saldo("S002", "Cuenta pagadora", "40.00")}
      referencias={[
        { id: "REF001", nombre: "Anticipo sintético", tipo: "Anticipo", estado: "Activa" },
      ]}
      hoy="2026-11-17"
      importeGasto="60,00"
      errors={{}}
    />,
  );
}

test("§10.1 el alta ofrece Gasto normal, A y B en la misma pantalla", () => {
  const normal = seccion("normal");
  expect(normal.match(/name="mov-coordinado-modalidad"/g)?.length).toBe(3);
  expect(normal).toContain("Gasto normal");
  expect(normal).toContain("Pago directo desde otro Saldo");
  expect(normal).toContain("Financiación mediante Anticipo");
  // El Gasto normal es el predeterminado y no abre la Transferencia asociada.
  expect(normal).toContain('checked="" value="normal"');
  expect(normal).not.toContain("Saldo que aporta");
  expect(normal).not.toContain('type="range"');
  expect(normal).toContain("sin Transferencia, sin pendiente y sin alerta");
});

test("§10.1 modalidad A: Transferencia real o pendiente, sin Referencia de Anticipo", () => {
  const html = seccion("A", "pendiente", { origen: "S001", importe: "40,00" });
  for (const id of [
    "mov-coordinado-origen",
    "mov-coordinado-importe",
    "mov-coordinado-fecha",
  ]) {
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`for="${id}"`);
    expect(html).toContain(`id="${id}-error"`);
  }
  expect(html).toContain("Saldo que aporta");
  expect(html).toContain("Importe de la Transferencia prevista (€)");
  expect(html).toContain("Fecha prevista");
  expect(html).toContain("Barra del importe previsto");
  expect(html).toContain('type="range"');
  expect(html).toContain('step="0.01"');
  expect(html).toContain("Transferencia ya realizada");
  // §6: mínimo informativo 60 − 40 = 20 y posición posterior 40 + 40 − 60 = 20.
  expect(html).toContain("Mínimo informativo: 20,00 €");
  expect(html).toContain("Remanente sobre el déficit: 20,00 €");
  expect(html).toContain("Disponible posterior estimado en S002: 20,00 €");
  expect(html).toContain("Posición estimada de S001");
  expect(html).not.toContain("Referencia de Anticipo existente");
});

test("§10.1 modalidad A con Transferencia ya realizada cambia la fecha a real", () => {
  const html = seccion("A", "realizada");
  expect(html).toContain("Importe de la Transferencia realizada (€)");
  expect(html).toContain("Fecha real de la Transferencia");
  expect(html).toContain('max="2026-11-17"');
  expect(html).toContain("Barra del importe de la Transferencia");
  expect(html).toContain("El Gasto y la Transferencia se registran juntos");
});

test("§5.3 modalidad B: Referencia existente o intención, y atribución si ya se realizó", () => {
  const pendienteB = seccion("B");
  expect(pendienteB).toContain("Saldo que adelanta");
  expect(pendienteB).toContain("Referencia de Anticipo existente");
  expect(pendienteB).toContain("Intención de Referencia nueva");
  // La atribución E3.1 es del hecho real, no del pendiente.
  expect(pendienteB).not.toContain("Evidencia de la Transferencia de Anticipo");

  const realizadaB = seccion("B", "realizada");
  expect(realizadaB).toContain("Evidencia de la Transferencia de Anticipo");
  expect(realizadaB).toContain("Procedencia de la Transferencia de Anticipo");
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