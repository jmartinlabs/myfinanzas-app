import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  RepartoLineaDTO,
  RepartoPropuestaItemDTO,
  RepartoSeguimientoDTO,
  TransferenciaPendienteDTO,
} from "../src/api";
import {
  RepartoBorradorTabla,
  RepartoMensual,
  RepartoPropuestaTabla,
  RepartoSeguimientoPanel,
  generarEtiqueta,
  normalizePropuesta,
  normalizeReparto,
  normalizeSeguimiento,
} from "../src/RepartoMensual";
import {
  PendientesDeConfirmar,
  TransferenciaPendienteFicha,
} from "../src/TransferenciaPendienteFicha";

const saldo = (id: string, nombre: string) => ({
  id,
  nombre,
  tipo: "Efectivo",
  control: "Movimientos",
  estado: "Activa",
});

const presupuesto = (
  id: string,
  nombre: string,
  fuente: string,
  estado = "Activo",
) => ({
  id,
  nombre,
  fuente,
  destino: fuente === "No aplica" ? null : "S002",
  estado,
});

const item = (
  overrides: Partial<RepartoPropuestaItemDTO> & {
    presupuesto: RepartoPropuestaItemDTO["presupuesto"];
  },
): RepartoPropuestaItemDTO => ({
  delMes: "100.00",
  ejecutado: "40.00",
  pendiente: "60.00",
  estado: "Pendiente",
  motivo: null,
  sinPlanificar: false,
  elegible: true,
  motivoNoElegible: null,
  propuesta: {
    clase: "Presupuesto",
    origen: "S001",
    destino: "S002",
    importe: "60.00",
    fechaPrevista: "2026-01-05",
  },
  mantenerEnOrigen: false,
  sinPropuesta: false,
  efectoAcumulado: null,
  restante: null,
  excedePendiente: false,
  ...overrides,
});

const pendiente = (
  overrides: Partial<TransferenciaPendienteDTO> = {},
): TransferenciaPendienteDTO => ({
  id: 7,
  estado: "Pendiente de realizar",
  importe: "60.00",
  origen: saldo("S001", "Cuenta principal"),
  destino: saldo("S002", "Fondo provisión"),
  cicloOrigen: "C1",
  fechaPrevista: "2026-01-05",
  fechaEfectiva: null,
  concepto: "Reparto PRE-A",
  nota: "",
  origenTipo: "Reparto",
  repartoLinea: {
    id: 3,
    reparto: 1,
    clase: "Presupuesto",
    presupuesto: "PRE-A",
    incluida: true,
    motivoExclusion: null,
  },
  reparto: { id: 1, ciclo: "C1", estado: "Generado", revision: 2 },
  presupuesto: presupuesto("PRE-A", "Provisión", "Aportación a saldo"),
  gasto: null,
  anticipo: null,
  movimiento: null,
  motivoCancelacion: null,
  revision: 3,
  creado: "2026-01-01T00:00:00.000Z",
  actualizado: "2026-01-01T00:00:00.000Z",
  requiereRevision: false,
  motivosRevision: [],
  hoy: "2026-01-31",
  ...overrides,
});

const linea = (
  overrides: Partial<RepartoLineaDTO> = {},
): RepartoLineaDTO => ({
  id: 3,
  clase: "Presupuesto",
  presupuesto: presupuesto("PRE-A", "Provisión", "Aportación a saldo"),
  origen: saldo("S001", "Cuenta principal"),
  destino: saldo("S002", "Fondo provisión"),
  importe: "60.00",
  fechaPrevista: "2026-01-05",
  concepto: "Reparto PRE-A",
  nota: null,
  incluida: true,
  motivoExclusion: null,
  revision: 1,
  pendiente: null,
  avisos: [],
  puedeGenerarse: true,
  ...overrides,
});

const repartoFlags = {
  cicloCerrado: false,
  puedeEditar: true,
  puedeAnadirLineas: true,
  puedeGenerar: true,
  puedeCompletar: false,
  motivosNoCompletar: [],
};

const avisosSeguimiento = {
  d8: [],
  d6: {
    pendientes: 0,
    incluidosEnFoto: false,
    bloquea: false,
    motivo: "El precierre solo avisa.",
  },
  contexto: [],
  cicloCerrado: false,
};

test("la propuesta distingue Aportación, Gasto real, No aplica, histórico y parcial", () => {
  const html = renderToStaticMarkup(
    <RepartoPropuestaTabla
      items={[
        item({
          presupuesto: presupuesto("PRE-A", "Provisión", "Aportación a saldo"),
          efectoAcumulado: "80.00",
          restante: "-20.00",
          excedePendiente: true,
        }),
        item({
          presupuesto: presupuesto("PRE-G", "Gastos", "Gasto real"),
          mantenerEnOrigen: true,
          propuesta: null,
        }),
        item({
          presupuesto: presupuesto("PRE-N", "Reserva", "No aplica"),
          delMes: "50.00",
          ejecutado: null,
          pendiente: null,
          estado: null,
          sinPropuesta: true,
          propuesta: null,
        }),
        item({
          presupuesto: presupuesto(
            "PRE-H",
            "Histórico",
            "Aportación a saldo",
            "Inactivo",
          ),
          elegible: false,
          propuesta: null,
          motivoNoElegible: "Histórico · no se generará un pendiente nuevo",
        }),
        item({
          presupuesto: presupuesto("PRE-X", "Sin datos", "Aportación a saldo"),
          delMes: null,
          ejecutado: null,
          pendiente: null,
          estado: null,
          propuesta: null,
          motivo: "Periodo/corte no verificable",
        }),
      ]}
    />,
  );

  expect(html).toContain("Pendiente E2.3 / Estado");
  expect(html).toContain("S001 → S002");
  expect(html).toContain("60,00 €");
  expect(html).toContain("Mantener en origen");
  expect(html).toContain("Sin transferencia automática.");
  expect(html).toContain("Sin propuesta");
  expect(html).toContain("Histórico");
  expect(html).toContain("No se generará un pendiente nuevo.");
  expect(html).toContain("Sin importe del mes; no se inventa un importe sugerido.");
  expect(html).toContain("No disponible");
  expect(html).toContain("Periodo/corte no verificable");
  expect(html).toContain("Acumulado en borrador:");
  expect(html).toContain("Excedido");
  expect(html).not.toContain(">0,00 €<");
});

test("el borrador permite editar y excluir antes de generar", () => {
  const html = renderToStaticMarkup(
    <RepartoBorradorTabla
      lineas={[
        linea(),
        linea({
          id: 4,
          incluida: false,
          motivoExclusion: "No se realizará este mes",
        }),
      ]}
      puedeEditar
      onEdit={() => {}}
      onExclude={() => {}}
      onInclude={() => {}}
    />,
  );

  expect(html).toContain("Editar línea 3");
  expect(html).toContain("Excluir línea 3");
  expect(html).toContain("Incluir línea 4");
  expect(html).toContain("No se realizará este mes");
  expect(html).toContain("Incluida");
  expect(html).toContain("Excluida");
  expect(html).not.toContain("Ejecutar");
});

test("D8 y Generado: avisos por línea, lectura y sin editar/excluir lo generado", () => {
  const readOnly = renderToStaticMarkup(
    <RepartoBorradorTabla
      lineas={[
        linea({
          avisos: ["PRESUPUESTO_INACTIVO"],
          puedeGenerarse: false,
        }),
        linea({ id: 4, pendiente: pendiente() }),
      ]}
      onEdit={() => {}}
      onExclude={() => {}}
      onInclude={() => {}}
    />,
  );
  expect(readOnly).toContain("Histórico · no se generará un pendiente nuevo.");
  expect(readOnly).toContain("No se generará mientras existan avisos");
  expect(readOnly).toContain("Generada · no editable");
  expect(readOnly).toContain("Solo lectura");
  expect(readOnly).not.toContain("Editar línea 3");
  expect(readOnly).not.toContain("Excluir línea 4");

  const editable = renderToStaticMarkup(
    <RepartoBorradorTabla
      lineas={[linea({ avisos: ["PRESUPUESTO_INACTIVO"], puedeGenerarse: false })]}
      puedeEditar
      onEdit={() => {}}
      onExclude={() => {}}
      onInclude={() => {}}
    />,
  );
  // D8 keeps the historical line editable but never generable.
  expect(editable).toContain("Editar línea 3");
  expect(editable).toContain("Excluir línea 3");
});

test("un pendiente parcial no abre la ficha hasta fusionar la lista completa", () => {
  const repartoRaw = {
    id: 10,
    ciclo: "C1",
    estado: "Generado",
    origenComun: saldo("S001", "Cuenta principal"),
    revision: 3,
    creado: "",
    actualizado: "",
    cicloCerrado: false,
    puedeEditar: false,
    puedeAnadirLineas: true,
    puedeGenerar: true,
    puedeCompletar: false,
    motivosNoCompletar: [
      { code: "PENDIENTE_NO_TERMINAL", pendientes: [7] },
    ],
    lineas: [
      {
        id: 11,
        clase: "Presupuesto",
        presupuesto: presupuesto("PRE-A", "Provisión", "Aportación a saldo"),
        origen: saldo("S001", "Cuenta principal"),
        destino: saldo("S002", "Fondo provisión"),
        importe: "60.00",
        fechaPrevista: "2026-01-05",
        concepto: null,
        nota: null,
        incluida: true,
        motivoExclusion: null,
        revision: 1,
        pendiente: {
          id: 7,
          estado: "Pendiente de realizar",
          importe: "60.00",
        },
        avisos: [],
        puedeGenerarse: false,
      },
    ],
  };
  const reparto = normalizeReparto({ reparto: repartoRaw });
  if (!reparto) throw new Error("El reparto normalizado es obligatorio.");
  const seguimientoRaw = {
    reparto: repartoRaw,
    lineas: repartoRaw.lineas,
    resumen: {
      lineas: 1,
      incluidas: 1,
      pendientesDeRealizar: 1,
      confirmadas: 0,
      canceladas: 0,
    },
    puedeCompletar: false,
    motivosNoCompletar: [
      { code: "PENDIENTE_NO_TERMINAL", pendientes: [7] },
    ],
    avisos: avisosSeguimiento,
  };
  const parcial = normalizeSeguimiento(seguimientoRaw);
  if (!parcial) throw new Error("El seguimiento normalizado es obligatorio.");
  const parcialHtml = renderToStaticMarkup(
    <RepartoSeguimientoPanel seguimiento={parcial} />,
  );
  expect(parcialHtml).toContain(
    "Relee el seguimiento para operar desde la ficha.",
  );
  expect(parcialHtml).not.toContain("Transferencia pendiente #7");
  expect(parcialHtml).not.toContain("Confirmar transferencia");

  // Normal path: the full ficha merged from the auxiliary pending list.
  const completa = normalizeSeguimiento(seguimientoRaw, [pendiente()]);
  if (!completa) throw new Error("El seguimiento completo es obligatorio.");
  const completaHtml = renderToStaticMarkup(
    <RepartoSeguimientoPanel seguimiento={completa} />,
  );
  expect(completaHtml).toContain("Transferencia pendiente #7");
  expect(completaHtml).toContain("Confirmar transferencia");
});

test("el completado depende de puedeCompletar y muestra los motivos del servidor", () => {
  const seguimiento: RepartoSeguimientoDTO = {
    reparto: {
      id: 1,
      ciclo: { id: "C1", inicio: "2026-01-01", fin: "2026-01-31" },
      estado: "Generado",
      origenComun: saldo("S001", "Cuenta principal"),
      revision: 2,
      lineas: [],
      creado: "",
      actualizado: "",
      ...repartoFlags,
      puedeEditar: false,
      puedeCompletar: false,
      motivosNoCompletar: [
        { code: "LINEA_SIN_PENDIENTE", lineas: [4] },
      ],
    },
    resumen: {
      lineas: 2,
      incluidas: 2,
      pendientes: 0,
      confirmadas: 1,
      canceladas: 0,
      importePendiente: "0.00",
      importeConfirmado: "60.00",
    },
    lineas: [],
    puedeCompletar: false,
    motivosNoCompletar: [{ code: "LINEA_SIN_PENDIENTE", lineas: [4] }],
    avisos: { ...avisosSeguimiento, cicloCerrado: true },
  };
  const html = renderToStaticMarkup(
    <RepartoSeguimientoPanel seguimiento={seguimiento} />,
  );
  expect(html).toContain("cierre financiero");
  expect(html).toContain("Faltan pendientes para las líneas 4.");
  expect(html).toMatch(/<button[^>]*disabled[^>]*>Completar reparto/);
});

test("el seguimiento no ofrece editar/excluir y conserva la cancelación con motivo", () => {
  const seguimiento: RepartoSeguimientoDTO = {
    reparto: {
      id: 1,
      ciclo: { id: "C1", inicio: "2026-01-01", fin: "2026-01-31" },
      estado: "Generado",
      origenComun: saldo("S001", "Cuenta principal"),
      revision: 2,
      lineas: [],
      creado: "2026-01-01T00:00:00.000Z",
      actualizado: "2026-01-01T00:00:00.000Z",
      ...repartoFlags,
      puedeEditar: false,
      puedeCompletar: false,
      motivosNoCompletar: [
        { code: "PENDIENTE_NO_TERMINAL", pendientes: [7] },
      ],
    },
    resumen: {
      lineas: 2,
      incluidas: 2,
      pendientes: 1,
      confirmadas: 1,
      canceladas: 0,
      importePendiente: "60.00",
      importeConfirmado: "40.00",
    },
    puedeCompletar: false,
    motivosNoCompletar: [{ code: "PENDIENTE_NO_TERMINAL", pendientes: [7] }],
    avisos: { ...avisosSeguimiento, d6: { ...avisosSeguimiento.d6, pendientes: 1 } },
    lineas: [
      linea({ pendiente: pendiente() }),
      linea({
        id: 4,
        pendiente: pendiente({
          id: 8,
          estado: "Confirmada",
          fechaEfectiva: "2026-01-06",
          movimiento: {
            id: "M1",
            fecha: "2026-01-06",
            tipo: "Transferencia",
            importe: "40.00",
            origen: "S001",
            destino: "S002",
            referencia: null,
            anulado: false,
            revision: 1,
          },
        }),
      }),
    ],
  };
  const html = renderToStaticMarkup(
    <RepartoSeguimientoPanel seguimiento={seguimiento} />,
  );

  expect(html).toContain("no se incluyen en la foto de cierre");
  expect(html).toContain("no bloquean el precierre");
  expect(html).toContain("Transferencia pendiente #7");
  expect(html).toContain("Cancelar pendiente");
  expect(html).toContain("Confirmar transferencia");
  expect(html).toContain("Movimiento confirmado");
  expect(html).not.toContain("Editar línea");
  expect(html).not.toContain("Excluir línea");
  expect(html).not.toContain("Ejecutar");
  expect(html).toContain("Completar reparto");
});

test("un reparto completado se presenta como terminal", () => {
  const html = renderToStaticMarkup(
    <RepartoSeguimientoPanel
      seguimiento={{
        reparto: {
          id: 1,
          ciclo: { id: "C1", inicio: "2026-01-01", fin: "2026-01-31" },
          estado: "Completado",
          origenComun: null,
          revision: 4,
          lineas: [],
          creado: "",
          actualizado: "",
          ...repartoFlags,
          puedeEditar: false,
          puedeAnadirLineas: false,
          puedeGenerar: false,
          puedeCompletar: true,
        },
        resumen: {
          lineas: 1,
          incluidas: 1,
          pendientes: 0,
          confirmadas: 1,
          canceladas: 0,
          importePendiente: null,
          importeConfirmado: "60.00",
        },
        puedeCompletar: true,
        motivosNoCompletar: [],
        avisos: avisosSeguimiento,
        lineas: [
          linea({
            pendiente: pendiente({
              estado: "Confirmada",
              fechaEfectiva: "2026-01-06",
            }),
          }),
        ],
      }}
    />,
  );

  expect(html).toContain("Reparto completado");
  expect(html).toContain("No se crea otro reparto automáticamente");
  expect(html).not.toContain("Completar reparto");
});

test("la ficha compartida confirma con fecha real y cancela con motivo", () => {
  const html = renderToStaticMarkup(
    <TransferenciaPendienteFicha pendiente={pendiente()} />,
  );

  expect(html).toContain("Transferencia pendiente #7");
  expect(html).toContain("Registro operativo: no es un Movimiento");
  expect(html).toContain("Fecha prevista");
  expect(html).toContain("Todavía no confirmada");
  expect(html).toContain("Confirmar transferencia");
  expect(html).toContain("Cancelar pendiente");
  expect(html).not.toContain("Ejecutar");
});

test("Requiere revisión bloquea la confirmación y muestra el motivo", () => {
  const html = renderToStaticMarkup(
    <TransferenciaPendienteFicha
      pendiente={pendiente({
        requiereRevision: true,
        motivosRevision: ["PRESUPUESTO_INACTIVO"],
      })}
    />,
  );

  expect(html).toContain("Requiere revisión.");
  expect(html).toContain("El Presupuesto está inactivo.");
  expect(html).toContain("La confirmación queda bloqueada");
  expect(html).toContain("disabled");
});

test("una confirmada no se desmarca y conserva el vínculo al Movimiento", () => {
  const html = renderToStaticMarkup(
    <TransferenciaPendienteFicha
      pendiente={pendiente({
        estado: "Confirmada",
        fechaEfectiva: "2026-01-06",
        movimiento: {
          id: "M1",
          fecha: "2026-01-06",
          tipo: "Transferencia",
          importe: "60.00",
          origen: "S001",
          destino: "S002",
          referencia: null,
          anulado: false,
          revision: 1,
        },
      })}
    />,
  );

  expect(html).toContain("Confirmada");
  expect(html).toContain("06/01/2026");
  expect(html).toContain("#M1");
  expect(html).not.toContain("Confirmar transferencia");
  expect(html).not.toContain("Cancelar pendiente");
});

test("Movimientos separa los pendientes de confirmar de los totales", () => {
  const html = renderToStaticMarkup(<PendientesDeConfirmar />);

  expect(html).toContain("Pendientes de confirmar");
  expect(html).toContain("Requieren atención");
  expect(html).toContain("No suman en totales, balances ni ejecución");
  expect(html).toContain("Cargando pendientes de confirmar");
});

test("el panel cerrado solo ofrece preparar el reparto sin tocar el plan", () => {
  const html = renderToStaticMarkup(
    <RepartoMensual
      ciclo={{ id: "C1", inicio: "2026-01-01", fin: "2026-01-31" }}
    />,
  );

  expect(html).toContain("Reparto mensual");
  expect(html).toContain("Preparar reparto del ciclo");
  expect(html).toContain("El reparto es independiente del plan");
  expect(html).not.toContain("Generar");
  expect(html).not.toContain("Ejecutar");
});

test("la etiqueta de generación cuenta pendientes y nunca dice Ejecutar", () => {
  expect(generarEtiqueta(0)).toBe("Generar 0 pendientes");
  expect(generarEtiqueta(1)).toBe("Generar 1 pendiente");
  expect(generarEtiqueta(3)).toBe("Generar 3 pendientes");
  expect(generarEtiqueta(3)).not.toContain("Ejecutar");
});

test("los normalizadores aceptan el contrato real del incremento 2", () => {
  const propuesta = normalizePropuesta({
    ciclo: { id: "C1", inicio: "2026-01-01", fin: "2026-01-31" },
    revision: 2,
    contextRevision: "ctx",
    sinPlan: false,
    origenComunSugerido: null,
    origenComunMotivo: "Selecciona el Saldo de origen.",
    items: [
      {
        presupuesto: presupuesto("PRE-A", "Provisión", "Aportación a saldo"),
        delMes: "100.00",
        ejecutado: "40.00",
        pendiente: "60.00",
        estado: "Pendiente",
        motivoE2: null,
        importeSugerido: "60.00",
        propuestaAutomatica: true,
        elegible: true,
        motivos: [],
        efectoAcumulado: "0.00",
        restante: "60.00",
        excedePendiente: false,
      },
      {
        presupuesto: presupuesto("PRE-G", "Gastos", "Gasto real"),
        delMes: null,
        ejecutado: null,
        pendiente: null,
        estado: null,
        motivoE2: "Sin plan",
        importeSugerido: null,
        propuestaAutomatica: false,
        elegible: false,
        motivos: ["MANTENER_EN_ORIGEN"],
        efectoAcumulado: "0.00",
        restante: null,
        excedePendiente: false,
      },
      {
        presupuesto: presupuesto("PRE-N", "Reserva", "No aplica"),
        delMes: "50.00",
        ejecutado: null,
        pendiente: null,
        estado: null,
        motivoE2: null,
        importeSugerido: null,
        propuestaAutomatica: false,
        elegible: false,
        motivos: ["NO_APLICA"],
        efectoAcumulado: "0.00",
        restante: null,
        excedePendiente: false,
      },
    ],
  });

  expect(propuesta.ciclo.id).toBe("C1");
  expect(propuesta.motivoOrigen).toBe("Selecciona el Saldo de origen.");
  expect(propuesta.items[0].propuesta?.importe).toBe("60.00");
  expect(propuesta.items[0].elegible).toBe(true);
  expect(propuesta.items[1].mantenerEnOrigen).toBe(true);
  expect(propuesta.items[2].sinPropuesta).toBe(true);

  const sinDestino = normalizePropuesta({
    items: [
      {
        presupuesto: {
          ...presupuesto("PRE-D", "Sin destino", "Aportación a saldo"),
          destino: null,
        },
        delMes: "100.00",
        pendiente: "60.00",
        importeSugerido: "60.00",
        propuestaAutomatica: false,
        elegible: false,
        motivos: ["SIN_DESTINO"],
      },
    ],
  });
  expect(sinDestino.items[0].elegible).toBe(false);
  expect(sinDestino.items[0].motivoNoElegible).toContain(
    "no tiene destino configurado",
  );

  const reparto = normalizeReparto({
    creado: false,
    reparto: {
      id: 9,
      ciclo: "C1",
      estado: "Borrador",
      origenComun: saldo("S001", "Cuenta principal"),
      revision: 1,
      cicloCerrado: false,
      puedeEditar: true,
      puedeAnadirLineas: true,
      puedeGenerar: true,
      puedeCompletar: false,
      motivosNoCompletar: [{ code: "SIN_PENDIENTES" }],
      lineas: [
        {
          id: 4,
          clase: "Presupuesto",
          presupuesto: presupuesto("PRE-A", "Provisión", "Aportación a saldo"),
          origen: saldo("S001", "Cuenta principal"),
          destino: saldo("S002", "Fondo provisión"),
          importe: "60.00",
          fechaPrevista: "2026-01-05",
          incluida: true,
          revision: 1,
          pendiente: { id: 7, estado: "Pendiente de realizar", importe: "60.00" },
          avisos: [],
          puedeGenerarse: false,
        },
      ],
    },
  });
  expect(reparto?.id).toBe(9);
  expect(reparto?.ciclo.id).toBe("C1");
  expect(reparto?.lineas[0].pendiente?.id).toBe(7);
  expect(reparto?.lineas[0].incluida).toBe(true);
  expect(reparto?.lineas[0].puedeGenerarse).toBe(false);
  expect(reparto?.puedeEditar).toBe(true);
  expect(reparto?.puedeAnadirLineas).toBe(true);
  expect(reparto?.puedeGenerar).toBe(true);
  expect(reparto?.motivosNoCompletar).toEqual([{ code: "SIN_PENDIENTES" }]);

  const seguimiento = normalizeSeguimiento(
    {
      reparto,
      lineas: reparto!.lineas,
      resumen: {
        lineas: 1,
        incluidas: 1,
        pendientesDeRealizar: 1,
        confirmadas: 0,
        canceladas: 0,
      },
      puedeCompletar: false,
    },
    [pendiente()],
  );
  expect(seguimiento?.resumen.pendientes).toBe(1);
  expect(seguimiento?.puedeCompletar).toBe(false);
  expect(seguimiento?.motivosNoCompletar).toEqual([]);
  expect(seguimiento?.avisos.cicloCerrado).toBe(false);
  expect(
    (seguimiento?.lineas[0].pendiente as TransferenciaPendienteDTO | null)
      ?.origen?.id,
  ).toBe("S001");

  // No client fallback: a terminal-looking summary never enables completion
  // when the server says it is blocked.
  const blocked = normalizeSeguimiento({
    reparto,
    lineas: [],
    resumen: {
      lineas: 1,
      incluidas: 0,
      pendientesDeRealizar: 0,
      confirmadas: 0,
      canceladas: 0,
    },
    puedeCompletar: false,
    motivosNoCompletar: [{ code: "SIN_PENDIENTES" }],
    avisos: {
      cicloCerrado: false,
      d6: { pendientes: 0, incluidosEnFoto: false, bloquea: false },
    },
  });
  expect(blocked?.puedeCompletar).toBe(false);
  expect(blocked?.motivosNoCompletar).toEqual([{ code: "SIN_PENDIENTES" }]);
});
