import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  api,
  ApiError,
  eur,
  type RepartoDTO,
  type RepartoEstado,
  type RepartoLineaDTO,
  type RepartoMotivoNoCompletar,
  type RepartoPropuestaDTO,
  type RepartoPropuestaItemDTO,
  type RepartoSeguimientoDTO,
  type RepartoWireDTO,
  type SaldoResumenDTO,
  type TransferenciaPendienteDTO,
} from "./api";
import { TransferenciaPendienteFicha } from "./TransferenciaPendienteFicha";
import {
  Alert,
  DataList,
  EmptyState,
  Field,
  focusFirstInvalidField,
  FormGrid,
  FormSection,
  Skeleton,
  Table,
  Tag,
  type TableColumn,
} from "./ui";

/**
 * SPEC36 · incremento 2 — reparto mensual asistido.
 *
 * El panel parte del equivalente mensual E2.3 que devuelve el servidor. No
 * recalcula importes ni prorratea el Plan anual. El estado del reparto es
 * independiente del estado y del editor del Plan del ciclo.
 */

const today = () => new Date().toLocaleDateString("sv-SE");
const date = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "—";
const amount = (value: string | null) =>
  value === null ? "No disponible" : eur(value);
const saldoLabel = (saldo: SaldoResumenDTO | null) =>
  saldo ? `${saldo.id} · ${saldo.nombre}` : "No disponible";
const lineLabel = (linea: RepartoLineaDTO) =>
  linea.presupuesto
    ? `${linea.presupuesto.nombre} · ${linea.presupuesto.id}`
    : "Transferencia adicional";

type ProposalLine = {
  clase: "Presupuesto";
  presupuesto: string;
  origen: string;
  destino: string | null;
  importe: string;
  fechaPrevista: string;
};

// Identity of a proposal line for "do not duplicate" checks (A5): same class,
// Presupuesto, amount and destination. Existing lines are never recreated.
const proposalIdentity = (line: {
  clase: string;
  presupuesto: string | null;
  importe: string | null;
  destino: string | null;
}) =>
  `${line.clase}|${line.presupuesto ?? ""}|${line.importe ?? ""}|${line.destino ?? ""}`;

// Deterministic per-line idempotency key: a retry after a partial failure
// replays the same attempt instead of inserting a duplicate.
function proposalKey(repartoId: number, line: ProposalLine) {
  const raw =
    `${repartoId}-${line.presupuesto}-${line.importe}-${line.destino ?? ""}`.replace(
      /[^a-zA-Z0-9-]/g,
      "",
    );
  return `reparto-prop-${raw}`.slice(0, 100);
}

const avisoLabels: Record<string, string> = {
  PRESUPUESTO_INACTIVO: "Histórico · no se generará un pendiente nuevo.",
  PRESUPUESTO_NO_DISPONIBLE: "El Presupuesto no está disponible.",
  PRESUPUESTO_DESTINO: "El destino del Presupuesto cambió.",
  FUENTE_NO_APORTACION: "El Presupuesto ya no es Aportación a saldo.",
  SALDO_ORIGEN_NO_ELEGIBLE: "El Saldo de origen ya no es elegible.",
  SALDO_DESTINO_NO_ELEGIBLE: "El Saldo de destino ya no es elegible.",
};
const avisoTexto = (aviso: string) => avisoLabels[aviso] ?? aviso;
const motivoTexto = (motivo: RepartoMotivoNoCompletar) => {
  if (motivo.code === "SIN_PENDIENTES")
    return "Todavía no hay Transferencias pendientes generadas.";
  if (motivo.code === "LINEA_SIN_PENDIENTE")
    return `Faltan pendientes para las líneas ${(motivo.lineas ?? []).join(", ")}.`;
  if (motivo.code === "PENDIENTE_NO_TERMINAL")
    return `Hay pendientes sin confirmar o cancelar: ${(motivo.pendientes ?? [])
      .map((id) => `#${id}`)
      .join(", ")}.`;
  return motivo.code;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

type GeneracionError = { lineaId: number; code: string; message: string };

function asGeneracionError(value: unknown): GeneracionError | null {
  const raw = asRecord(value);
  if (!raw || typeof raw.lineaId !== "number") return null;
  return {
    lineaId: raw.lineaId,
    code: typeof raw.code === "string" ? raw.code : "INTERNAL",
    message:
      typeof raw.message === "string"
        ? raw.message
        : "No se pudo generar la Transferencia pendiente.",
  };
}

function asSaldo(value: unknown): SaldoResumenDTO | null {
  if (typeof value === "string") {
    return {
      id: value,
      nombre: value,
      tipo: "",
      control: "",
      estado: "Activa",
    };
  }
  const raw = asRecord(value);
  if (raw) {
    if (typeof raw.id !== "string") return null;
    return {
      id: raw.id,
      nombre: typeof raw.nombre === "string" ? raw.nombre : raw.id,
      tipo: typeof raw.tipo === "string" ? raw.tipo : "",
      control: typeof raw.control === "string" ? raw.control : "",
      estado: typeof raw.estado === "string" ? raw.estado : "Activa",
    };
  }
  return null;
}

function asPresupuesto(
  value: unknown,
): RepartoLineaDTO["presupuesto"] {
  if (typeof value === "string")
    return {
      id: value,
      nombre: value,
      fuente: "",
      destino: null,
      estado: "Activo",
    };
  if (value && typeof value === "object") {
    const raw = value as Record<string, unknown>;
    if (typeof raw.id !== "string") return null;
    return {
      id: raw.id,
      nombre: typeof raw.nombre === "string" ? raw.nombre : raw.id,
      fuente: typeof raw.fuente === "string" ? raw.fuente : "",
      destino: typeof raw.destino === "string" ? raw.destino : null,
      estado: typeof raw.estado === "string" ? raw.estado : "Activo",
    };
  }
  return null;
}

function responseLine(value: unknown): RepartoLineaDTO | null {
  const raw = asRecord(value);
  return asLinea(raw?.linea ?? raw?.item ?? value);
}

function isFullPendiente(
  value: NonNullable<RepartoLineaDTO["pendiente"]>,
): value is TransferenciaPendienteDTO {
  return typeof (value as TransferenciaPendienteDTO).cicloOrigen === "string";
}

function asPendiente(value: unknown): TransferenciaPendienteDTO | null {
  const raw = asRecord(value);
  if (!raw) return null;
  if (typeof raw.id !== "number") return null;
  return {
    id: raw.id,
    estado:
      raw.estado === "Confirmada" || raw.estado === "Cancelada"
        ? raw.estado
        : "Pendiente de realizar",
    importe: String(raw.importe ?? "0"),
    origen: asSaldo(raw.origen),
    destino: asSaldo(raw.destino),
    cicloOrigen:
      typeof raw.cicloOrigen === "string"
        ? raw.cicloOrigen
        : typeof raw.ciclo_origen === "string"
          ? raw.ciclo_origen
          : "",
    fechaPrevista:
      typeof raw.fechaPrevista === "string" ? raw.fechaPrevista : "",
    fechaEfectiva:
      typeof raw.fechaEfectiva === "string" ? raw.fechaEfectiva : null,
    concepto: typeof raw.concepto === "string" ? raw.concepto : "",
    nota: typeof raw.nota === "string" ? raw.nota : "",
    origenTipo:
      raw.origenTipo === "RegistroCoordinado"
        ? "RegistroCoordinado"
        : "Reparto",
    repartoLinea:
      (raw.repartoLinea as TransferenciaPendienteDTO["repartoLinea"]) ?? null,
    reparto: (raw.reparto as TransferenciaPendienteDTO["reparto"]) ?? null,
    presupuesto: asPresupuesto(raw.presupuesto),
    gasto: typeof raw.gasto === "string" ? raw.gasto : null,
    anticipo: typeof raw.anticipo === "string" ? raw.anticipo : null,
    movimiento:
      (raw.movimiento as TransferenciaPendienteDTO["movimiento"]) ?? null,
    motivoCancelacion:
      typeof raw.motivoCancelacion === "string"
        ? raw.motivoCancelacion
        : null,
    revision: typeof raw.revision === "number" ? raw.revision : 1,
    creado: typeof raw.creado === "string" ? raw.creado : "",
    actualizado: typeof raw.actualizado === "string" ? raw.actualizado : "",
    requiereRevision: raw.requiereRevision === true,
    motivosRevision: Array.isArray(raw.motivosRevision)
      ? raw.motivosRevision
      : [],
    hoy: typeof raw.hoy === "string" ? raw.hoy : today(),
  };
}

function asLinea(value: unknown): RepartoLineaDTO | null {
  const raw = asRecord(value);
  if (!raw) return null;
  if (typeof raw.id !== "number") return null;
  const pendiente = raw.pendiente;
  return {
    id: raw.id,
    clase: raw.clase === "Adicional" ? "Adicional" : "Presupuesto",
    presupuesto: asPresupuesto(raw.presupuesto),
    origen: asSaldo(raw.origen),
    destino: asSaldo(raw.destino),
    importe:
      raw.importe === null || raw.importe === undefined
        ? null
        : String(raw.importe),
    fechaPrevista:
      typeof raw.fechaPrevista === "string" ? raw.fechaPrevista : "",
    concepto: typeof raw.concepto === "string" ? raw.concepto : null,
    nota: typeof raw.nota === "string" ? raw.nota : null,
    incluida: raw.incluida === true || raw.incluida === 1,
    motivoExclusion:
      typeof raw.motivoExclusion === "string" ? raw.motivoExclusion : null,
    revision: typeof raw.revision === "number" ? raw.revision : 1,
    pendiente: asPendiente(pendiente),
    avisos: Array.isArray(raw.avisos)
      ? raw.avisos.filter((aviso): aviso is string => typeof aviso === "string")
      : [],
    // Server-owned decision; never recomputed from avisos in the browser.
    puedeGenerarse: raw.puedeGenerarse === true,
  };
}

export function normalizeReparto(
  value: unknown,
  cicloFallback?: { id: string; inicio: string; fin: string | null },
): RepartoDTO | null {
  const outer = asRecord(value);
  if (!outer) return null;
  const raw =
    asRecord(outer.reparto) ?? asRecord(outer.item) ?? outer;
  if (typeof raw.id !== "number") return null;
  const cicloValue = raw.ciclo;
  const ciclo = asRecord(cicloValue);
  const cicloId =
    typeof cicloValue === "string"
      ? cicloValue
      : typeof ciclo?.id === "string"
        ? ciclo.id
        : "";
  return {
    id: raw.id,
    ciclo: {
      id: cicloId,
      inicio:
        typeof ciclo?.inicio === "string"
          ? ciclo.inicio
          : cicloFallback?.inicio ?? "",
      fin:
        typeof ciclo?.fin === "string"
          ? ciclo.fin
          : cicloFallback?.fin ?? null,
    },
    estado:
      raw.estado === "Generado" || raw.estado === "Completado"
        ? raw.estado
        : "Borrador",
    origenComun: asSaldo(raw.origenComun),
    revision: typeof raw.revision === "number" ? raw.revision : 1,
    lineas: Array.isArray(raw.lineas)
      ? raw.lineas
          .map(asLinea)
          .filter((line: RepartoLineaDTO | null): line is RepartoLineaDTO => !!line)
      : [],
    creado: typeof raw.creado === "string" ? raw.creado : "",
    actualizado: typeof raw.actualizado === "string" ? raw.actualizado : "",
    cicloCerrado: raw.cicloCerrado === true,
    puedeEditar: raw.puedeEditar === true,
    puedeAnadirLineas: raw.puedeAnadirLineas === true,
    puedeGenerar: raw.puedeGenerar === true,
    puedeCompletar: raw.puedeCompletar === true,
    motivosNoCompletar: Array.isArray(raw.motivosNoCompletar)
      ? raw.motivosNoCompletar.filter(
          (motivo): motivo is RepartoMotivoNoCompletar =>
            !!asRecord(motivo) && typeof asRecord(motivo)?.code === "string",
        )
      : [],
  };
}

function asPropuestaItem(value: unknown): RepartoPropuestaItemDTO | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const presupuesto = asPresupuesto(raw.presupuesto);
  if (!presupuesto) return null;
  const motivos: string[] = Array.isArray(raw.motivos)
    ? raw.motivos.filter((motivo): motivo is string => typeof motivo === "string")
    : [];
  const propuestaRaw = asRecord(raw.propuesta) ?? asRecord(raw.sugerencia);
  // The increment-2 contract returns `propuestaAutomatica` + `importeSugerido`
  // instead of a nested proposal object. The origin is intentionally absent:
  // only the common selector can resolve it.
  const automatica =
    raw.propuestaAutomatica === true &&
    raw.importeSugerido !== null &&
    raw.importeSugerido !== undefined;
  const propuesta = propuestaRaw
    ? {
        clase: "Presupuesto" as const,
        origen:
          typeof propuestaRaw.origen === "string"
            ? propuestaRaw.origen
            : asSaldo(propuestaRaw.origen)?.id ?? null,
        destino:
          typeof propuestaRaw.destino === "string"
            ? propuestaRaw.destino
            : asSaldo(propuestaRaw.destino)?.id ?? null,
        importe: String(propuestaRaw.importe ?? ""),
        fechaPrevista:
          typeof propuestaRaw.fechaPrevista === "string"
            ? propuestaRaw.fechaPrevista
            : today(),
      }
    : automatica
      ? {
          clase: "Presupuesto" as const,
          origen: null,
          destino: presupuesto.destino,
          importe: String(raw.importeSugerido),
          fechaPrevista: today(),
        }
      : null;
  const inactivo = presupuesto.estado !== "Activo";
  const mantenerEnOrigen =
    raw.mantenerEnOrigen === true ||
    motivos.includes("MANTENER_EN_ORIGEN") ||
    presupuesto.fuente === "Gasto real";
  const sinPropuesta =
    raw.sinPropuesta === true ||
    motivos.includes("NO_APLICA") ||
    presupuesto.fuente === "No aplica";
  const motivoNoElegible = inactivo
    ? "Histórico · no se generará un pendiente nuevo"
    : motivos.includes("SIN_DESTINO")
      ? "El Presupuesto no tiene destino configurado; no se propone automáticamente."
      : motivos.includes("SALDO_DESTINO_NO_ELEGIBLE")
        ? "El destino del Presupuesto está inactivo o no es elegible; no se propone automáticamente."
        : typeof raw.motivoNoElegible === "string"
          ? raw.motivoNoElegible
          : null;
  return {
    presupuesto,
    delMes:
      raw.delMes === null || raw.delMes === undefined
        ? null
        : String(raw.delMes),
    ejecutado:
      raw.ejecutado === null || raw.ejecutado === undefined
        ? null
        : String(raw.ejecutado),
    pendiente:
      raw.pendiente === null || raw.pendiente === undefined
        ? null
        : String(raw.pendiente),
    estado: typeof raw.estado === "string" ? raw.estado : null,
    motivo:
      typeof raw.motivoE2 === "string"
        ? raw.motivoE2
        : typeof raw.motivo === "string"
          ? raw.motivo
          : null,
    sinPlanificar: raw.sinPlanificar === true,
    // Server-owned: prefer the explicit flag and only derive it for older
    // payloads that predate the field.
    elegible:
      typeof raw.elegible === "boolean"
        ? raw.elegible
        : !inactivo && propuesta !== null,
    motivoNoElegible,
    propuesta,
    mantenerEnOrigen,
    sinPropuesta,
    efectoAcumulado:
      raw.efectoAcumulado === null || raw.efectoAcumulado === undefined
        ? null
        : String(raw.efectoAcumulado),
    restante:
      raw.restante === null || raw.restante === undefined
        ? null
        : String(raw.restante),
    excedePendiente: raw.excedePendiente === true,
  };
}

export function normalizePropuesta(value: unknown): RepartoPropuestaDTO {
  const raw = asRecord(value) ?? {};
  const cicloValue = raw.ciclo;
  const ciclo = asRecord(cicloValue);
  const cicloId =
    typeof cicloValue === "string"
      ? cicloValue
      : typeof ciclo?.id === "string"
        ? ciclo.id
        : "";
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const rawSaldos = Array.isArray(raw.origenes)
    ? raw.origenes
    : Array.isArray(raw.saldos)
      ? raw.saldos
      : [];
  const periodo = asRecord(raw.periodo);
  return {
    ciclo: {
      id: cicloId,
      inicio: typeof ciclo?.inicio === "string" ? ciclo.inicio : "",
      fin: typeof ciclo?.fin === "string" ? ciclo.fin : null,
    },
    revision: typeof raw.revision === "number" ? raw.revision : 1,
    contextRevision:
      typeof raw.contextRevision === "string" ? raw.contextRevision : "",
    sinPlan: raw.sinPlan === true,
    periodo: {
      inicio:
        typeof periodo?.inicio === "string"
          ? periodo.inicio
          : typeof ciclo?.inicio === "string"
            ? ciclo.inicio
            : "",
      fin:
        typeof periodo?.fin === "string"
          ? periodo.fin
          : typeof ciclo?.fin === "string"
            ? ciclo.fin
            : null,
      corte: typeof periodo?.corte === "string" ? periodo.corte : null,
      motivo: typeof periodo?.motivo === "string" ? periodo.motivo : null,
    },
    origenComunSugerido: asSaldo(raw.origenComunSugerido),
    motivoOrigen:
      typeof raw.motivoOrigen === "string"
        ? raw.motivoOrigen
        : typeof raw.origenComunMotivo === "string"
          ? raw.origenComunMotivo
          : null,
    origenes: rawSaldos
      .map(asSaldo)
      .filter((saldo): saldo is SaldoResumenDTO => !!saldo),
    items: rawItems
      .map(asPropuestaItem)
      .filter((item): item is RepartoPropuestaItemDTO => !!item),
  };
}

function asMotivosNoCompletar(value: unknown): RepartoMotivoNoCompletar[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const raw = asRecord(entry);
    if (!raw || typeof raw.code !== "string") return [];
    return [
      {
        code: raw.code,
        ...(Array.isArray(raw.lineas)
          ? {
              lineas: raw.lineas.filter(
                (linea): linea is number => typeof linea === "number",
              ),
            }
          : {}),
        ...(Array.isArray(raw.pendientes)
          ? {
              pendientes: raw.pendientes.filter(
                (pendiente): pendiente is number =>
                  typeof pendiente === "number",
              ),
            }
          : {}),
      },
    ];
  });
}

export function normalizeSeguimiento(
  value: unknown,
  pendientesCompletos: TransferenciaPendienteDTO[] = [],
): RepartoSeguimientoDTO | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const reparto = normalizeReparto(raw);
  if (!reparto) return null;
  const lineas = Array.isArray(raw.lineas)
    ? raw.lineas.map(asLinea)
    : reparto.lineas;
  const items = lineas
    .filter((line): line is RepartoLineaDTO => !!line)
    .map((line) => {
      if (!line.pendiente) return line;
      const completo = pendientesCompletos.find(
        (pending) => pending.id === line.pendiente!.id,
      );
      return completo ? { ...line, pendiente: completo } : line;
    });
  const pendientes = items.filter(
    (line) => line.pendiente?.estado === "Pendiente de realizar",
  ).length;
  const confirmadas = items.filter(
    (line) => line.pendiente?.estado === "Confirmada",
  ).length;
  const canceladas = items.filter(
    (line) => line.pendiente?.estado === "Cancelada",
  ).length;
  const resumenRaw = asRecord(raw.resumen) ?? {};
  const avisosRaw = asRecord(raw.avisos) ?? {};
  const d6 = asRecord(avisosRaw.d6) ?? {};
  return {
    reparto,
    lineas: items,
    resumen: {
      lineas:
        typeof resumenRaw.lineas === "number"
          ? resumenRaw.lineas
          : items.length,
      incluidas:
        typeof resumenRaw.incluidas === "number"
          ? resumenRaw.incluidas
          : items.filter((line) => line.incluida).length,
      pendientes:
        typeof resumenRaw.pendientesDeRealizar === "number"
          ? resumenRaw.pendientesDeRealizar
          : typeof resumenRaw.pendientes === "number"
            ? resumenRaw.pendientes
            : pendientes,
      confirmadas:
        typeof resumenRaw.confirmadas === "number"
          ? resumenRaw.confirmadas
          : confirmadas,
      canceladas:
        typeof resumenRaw.canceladas === "number"
          ? resumenRaw.canceladas
          : canceladas,
      importePendiente:
        typeof resumenRaw.importePendiente === "string"
          ? resumenRaw.importePendiente
          : null,
      importeConfirmado:
        typeof resumenRaw.importeConfirmado === "string"
          ? resumenRaw.importeConfirmado
          : null,
    },
    // Completion is decided by the server; no client-side fallback may enable
    // a completion the API would reject.
    puedeCompletar: raw.puedeCompletar === true,
    motivosNoCompletar: asMotivosNoCompletar(raw.motivosNoCompletar),
    avisos: {
      d8: Array.isArray(avisosRaw.d8)
        ? avisosRaw.d8.flatMap((entry) => {
            const value = asRecord(entry);
            if (!value || typeof value.linea !== "number") return [];
            return [
              {
                linea: value.linea,
                presupuesto:
                  typeof value.presupuesto === "string"
                    ? value.presupuesto
                    : null,
                motivo:
                  typeof value.motivo === "string" ? value.motivo : "",
              },
            ];
          })
        : [],
      d6: {
        pendientes:
          typeof d6.pendientes === "number" ? d6.pendientes : pendientes,
        incluidosEnFoto: d6.incluidosEnFoto === true,
        bloquea: d6.bloquea === true,
        motivo: typeof d6.motivo === "string" ? d6.motivo : "",
      },
      contexto: Array.isArray(avisosRaw.contexto)
        ? avisosRaw.contexto.flatMap((entry) => {
            const value = asRecord(entry);
            if (!value || typeof value.linea !== "number") return [];
            return [
              {
                linea: value.linea,
                presupuesto:
                  typeof value.presupuesto === "string"
                    ? value.presupuesto
                    : null,
                motivos: Array.isArray(value.motivos)
                  ? value.motivos.filter(
                      (motivo): motivo is string => typeof motivo === "string",
                    )
                  : [],
              },
            ];
          })
        : [],
      cicloCerrado: avisosRaw.cicloCerrado === true,
    },
  };
}

export function generarEtiqueta(n: number) {
  return n === 1 ? "Generar 1 pendiente" : `Generar ${n} pendientes`;
}

const propuestaColumns: TableColumn<RepartoPropuestaItemDTO>[] = [
  {
    id: "presupuesto",
    header: "Presupuesto / Fuente",
    cell: (item) => (
      <>
        <strong>{item.presupuesto.nombre}</strong>
        <small className="table-id">
          {item.presupuesto.id} · {item.presupuesto.fuente || "Fuente no disponible"}
        </small>
        {item.presupuesto.estado !== "Activo" && <Tag inactive>Histórico</Tag>}
        {item.motivo && <p className="help">{item.motivo}</p>}
      </>
    ),
  },
  {
    id: "destino",
    header: "Destino",
    cell: (item) => (
      <>
        {item.presupuesto.destino ?? "Sin destino configurado"}
        {item.presupuesto.fuente === "Gasto real" && (
          <p className="help">
            Destino del Presupuesto, no una reserva ni financiación necesaria.
          </p>
        )}
        {item.presupuesto.fuente === "No aplica" && (
          <p className="help">No aplica · sin propuesta de financiación.</p>
        )}
      </>
    ),
  },
  {
    id: "delMes",
    header: "Del mes",
    kind: "amount",
    cell: (item) => amount(item.delMes),
  },
  {
    id: "ejecutado",
    header: "Ejecutado",
    kind: "amount",
    cell: (item) => amount(item.ejecutado),
  },
  {
    id: "pendiente",
    header: "Pendiente E2.3 / Estado",
    cell: (item) => (
      <>
        {amount(item.pendiente)}
        <p>{item.estado ?? "Sin estado comparable"}</p>
        {(item.efectoAcumulado !== null || item.restante !== null) && (
          <p className="help">
            Acumulado en borrador: {amount(item.efectoAcumulado)} · Restante:{" "}
            {amount(item.restante)}
          </p>
        )}
        {item.excedePendiente && <Tag inactive>Excedido</Tag>}
      </>
    ),
  },
  {
    id: "propuesta",
    header: "Propuesta",
    cell: (item) => <PropuestaTexto item={item} />,
  },
];

function PropuestaTexto({ item }: { item: RepartoPropuestaItemDTO }) {
  if (item.presupuesto.estado !== "Activo")
    return (
      <>
        <Tag inactive>Histórico</Tag>
        <p className="help">No se generará un pendiente nuevo.</p>
      </>
    );
  if (item.mantenerEnOrigen)
    return (
      <>
        <strong>Mantener en origen</strong>
        <p className="help">Sin transferencia automática.</p>
      </>
    );
  if (item.sinPropuesta)
    return (
      <>
        <strong>Sin propuesta</strong>
        <p className="help">
          No se calculan Pendiente ni Estado comparables; no se inventa importe.
        </p>
      </>
    );
  if (item.motivoNoElegible)
    return (
      <>
        <strong>Sin propuesta automática</strong>
        <p className="help">{item.motivoNoElegible}</p>
      </>
    );
  if (!item.propuesta)
    return (
      <>
        <strong>Sin propuesta automática</strong>
        <p className="help">
          {item.delMes === null
            ? "Sin importe del mes; no se inventa un importe sugerido."
            : item.motivo ??
              "No hay un Pendiente positivo verificable. Puedes decidir un importe manual."}
        </p>
      </>
    );
  return (
    <>
      <strong>
        {item.propuesta.origen ?? "Origen a decidir"} →{" "}
        {item.propuesta.destino ?? item.presupuesto.destino ?? "Destino no disponible"}
      </strong>
      <p>
        {amount(item.propuesta.importe)} · prevista{" "}
        {date(item.propuesta.fechaPrevista)}
      </p>
    </>
  );
}

export function RepartoPropuestaTabla({
  items,
  empty,
}: {
  items: RepartoPropuestaItemDTO[];
  empty?: ReactNode;
}) {
  return (
    <>
      <div className="desktop-list">
        <Table
          caption="Propuesta de reparto mensual por Presupuesto"
          label="Tabla de propuesta de reparto mensual"
          columns={propuestaColumns}
          rows={items}
          rowKey={(item) => item.presupuesto.id}
          rowClassName={(item) =>
            item.presupuesto.estado !== "Activo" ? "ui-row-inactive" : undefined
          }
          empty={
            empty ?? (
              <EmptyState title="Sin presupuestos elegibles" icon="○">
                No hay líneas comparables. No se usan destinos inactivos ni
                importes inventados.
              </EmptyState>
            )
          }
        />
      </div>
      <DataList
        columns={propuestaColumns}
        rows={items}
        rowKey={(item) => item.presupuesto.id}
        rowClassName={(item) =>
          item.presupuesto.estado !== "Activo" ? "ui-row-inactive" : undefined
        }
        label="Propuesta de reparto móvil"
        className="mobile-list"
        empty={
          empty ?? (
            <EmptyState title="Sin presupuestos elegibles" icon="○">
              No hay líneas comparables. No se usan destinos inactivos ni
              importes inventados.
            </EmptyState>
          )
        }
      />
    </>
  );
}

const borradorColumns = (
  onEdit: (line: RepartoLineaDTO) => void,
  onExclude: (line: RepartoLineaDTO) => void,
  onInclude: (line: RepartoLineaDTO) => void,
  busy: boolean,
  puedeEditar: boolean,
): TableColumn<RepartoLineaDTO>[] => [
  {
    id: "linea",
    header: "Línea",
    cell: (line) => (
      <>
        <strong>{lineLabel(line)}</strong>
        <small className="table-id">
          {line.clase === "Adicional" ? "Transferencia adicional" : "Presupuesto"}
        </small>
      </>
    ),
  },
  {
    id: "origen",
    header: "Origen",
    cell: (line) => saldoLabel(line.origen),
  },
  {
    id: "destino",
    header: "Destino",
    cell: (line) => saldoLabel(line.destino),
  },
  {
    id: "importe",
    header: "Importe",
    kind: "amount",
    cell: (line) => amount(line.importe),
  },
  {
    id: "fecha",
    header: "Fecha prevista",
    cell: (line) => date(line.fechaPrevista),
  },
  {
    id: "estado",
    header: "Borrador",
    cell: (line) => (
      <>
        {line.incluida ? (
          <Tag>Incluida</Tag>
        ) : (
          <>
            <Tag inactive>Excluida</Tag>
            {line.motivoExclusion && (
              <p className="help">{line.motivoExclusion}</p>
            )}
          </>
        )}
        {line.pendiente ? (
          <Tag inactive>Pendiente #{line.pendiente.id}</Tag>
        ) : line.puedeGenerarse ? (
          <Tag>Lista para generar</Tag>
        ) : line.incluida ? (
          <p className="help">
            No se generará mientras existan avisos de contexto.
          </p>
        ) : null}
        {line.avisos.length > 0 && (
          <p className="help">
            {line.avisos.map(avisoTexto).join(" ")}
          </p>
        )}
      </>
    ),
  },
  {
    id: "acciones",
    header: "Acciones",
    kind: "actions",
    cell: (line) => (
      <div className="actions">
        {line.pendiente ? (
          <span className="help">Generada · no editable</span>
        ) : !puedeEditar ? (
          <span className="help">Solo lectura</span>
        ) : line.incluida ? (
          <>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => onEdit(line)}
            >
              Editar línea {line.id}
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => onExclude(line)}
            >
              Excluir línea {line.id}
            </button>
          </>
        ) : (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => onInclude(line)}
          >
            Incluir línea {line.id}
          </button>
        )}
      </div>
    ),
  },
];

export function RepartoBorradorTabla({
  lineas,
  onEdit,
  onExclude,
  onInclude,
  busy = false,
  puedeEditar = false,
}: {
  lineas: RepartoLineaDTO[];
  onEdit: (line: RepartoLineaDTO) => void;
  onExclude: (line: RepartoLineaDTO) => void;
  onInclude: (line: RepartoLineaDTO) => void;
  busy?: boolean;
  puedeEditar?: boolean;
}) {
  const columns = borradorColumns(
    onEdit,
    onExclude,
    onInclude,
    busy,
    puedeEditar,
  );
  return (
    <>
      <div className="desktop-list">
        <Table
          caption="Borrador de líneas del reparto"
          label="Tabla del borrador del reparto"
          columns={columns}
          rows={lineas}
          rowKey={(line) => line.id}
          empty="Sin líneas. Añade una transferencia o vuelve a la propuesta."
        />
      </div>
      <DataList
        columns={columns}
        rows={lineas}
        rowKey={(line) => line.id}
        label="Borrador del reparto móvil"
        className="mobile-list"
        empty="Sin líneas. Añade una transferencia o vuelve a la propuesta."
      />
    </>
  );
}

export function RepartoSeguimientoPanel({
  seguimiento,
  go,
  onChanged,
  onReload,
  onCompletar,
  busy = false,
}: {
  seguimiento: RepartoSeguimientoDTO;
  go?: (path: string) => void;
  onChanged?: () => void;
  onReload?: () => void;
  onCompletar?: () => void;
  busy?: boolean;
}) {
  const { resumen, reparto, avisos } = seguimiento;
  return (
    <section className="panel" aria-label="Seguimiento del reparto">
      <h3>Seguimiento del reparto · {reparto.estado}</h3>
      <p>
        {resumen.lineas} líneas · {resumen.incluidas} incluidas ·{" "}
        {resumen.pendientes} pendientes · {resumen.confirmadas} confirmadas ·{" "}
        {resumen.canceladas} canceladas.
      </p>
      {avisos.cicloCerrado && (
        <Alert>
          El Ciclo tiene un cierre financiero: no admite cambios de reparto. La
          lectura, la cancelación de pendientes y el completado permitido siguen
          disponibles.
        </Alert>
      )}
      {avisos.d8.length > 0 && (
        <Alert>
          <strong>Línea histórica.</strong>{" "}
          {avisos.d8.map((aviso) => aviso.motivo).join(" ")} No se crea un
          pendiente nuevo hacia un Presupuesto inactivo.
        </Alert>
      )}
      {avisos.contexto.length > 0 && (
        <Alert>
          Contexto cambiado en {avisos.contexto.length} línea(s):{" "}
          {avisos.contexto
            .flatMap((aviso) => aviso.motivos)
            .map(avisoTexto)
            .join(" ")}
        </Alert>
      )}
      {(resumen.importePendiente !== null ||
        resumen.importeConfirmado !== null) && (
        <p>
          Importe pendiente: {amount(resumen.importePendiente)} · Importe
          confirmado: {amount(resumen.importeConfirmado)}. Solo el Movimiento
          confirmado computa como hecho.
        </p>
      )}
      <Alert>
        Los pendientes no se incluyen en la foto de cierre y no bloquean el
        precierre. Confirmar una línea no confirma las demás ni las convierte en
        hechos por el paso del tiempo.
      </Alert>
      {seguimiento.lineas.length === 0 ? (
        <EmptyState title="Sin líneas generadas" icon="○">
          El reparto no tiene líneas que seguir.
        </EmptyState>
      ) : (
        <div className="reparto-seguimiento">
          {seguimiento.lineas.map((line) => (
            <article key={line.id} className="panel">
              <h4>
                {lineLabel(line)} · {line.incluida ? "Incluida" : "Excluida"}
                {line.presupuesto?.estado === "Inactivo" && (
                  <>
                    {" "}
                    <Tag inactive>Histórico</Tag>
                  </>
                )}
              </h4>
              <p>
                {saldoLabel(line.origen)} → {saldoLabel(line.destino)} ·{" "}
                {amount(line.importe)} · prevista {date(line.fechaPrevista)}
              </p>
              {line.avisos.length > 0 && (
                <p className="help">
                  {line.avisos.map(avisoTexto).join(" ")}
                </p>
              )}
              {line.pendiente ? (
                isFullPendiente(line.pendiente) ? (
                  <TransferenciaPendienteFicha
                    pendiente={line.pendiente}
                    go={go}
                    onChanged={onChanged}
                    onReload={onReload}
                  />
                ) : (
                  <p className="help">
                    Pendiente #{line.pendiente.id} · {line.pendiente.estado}.
                    Relee el seguimiento para operar desde la ficha.
                  </p>
                )
              ) : line.incluida ? (
                <p className="help">
                  Sin pendiente generado para esta línea. Añadir líneas nuevas no
                  regenera los pendientes existentes.
                </p>
              ) : (
                <p className="help">
                  Excluida antes de generar: no crea pendiente ni cuenta para
                  completar el reparto.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
      {reparto.estado === "Generado" && (
        <div className="actions">
          <button
            className="primary"
            disabled={busy || !seguimiento.puedeCompletar}
            onClick={onCompletar}
          >
            Completar reparto
          </button>
          {!seguimiento.puedeCompletar && (
            <div className="help" role="status">
              <p>
                Solo se completa cuando todas las líneas generadas están
                Confirmadas o Canceladas.
              </p>
              {seguimiento.motivosNoCompletar.length > 0 && (
                <ul>
                  {seguimiento.motivosNoCompletar.map((motivo) => (
                    <li key={`${motivo.code}:${(motivo.lineas ?? motivo.pendientes ?? []).join(",")}`}>
                      {motivoTexto(motivo)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      {reparto.estado === "Completado" && (
        <p className="help">
          Reparto completado. No se crea otro reparto automáticamente; las
          Transferencias posteriores usan el procedimiento ordinario.
        </p>
      )}
    </section>
  );
}

export function RepartoMensual({
  ciclo,
  go,
}: {
  ciclo: { id: string; inicio: string; fin: string | null };
  go?: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [propuesta, setPropuesta] = useState<RepartoPropuestaDTO | null>(null);
  const [reparto, setReparto] = useState<RepartoDTO | null>(null);
  const [seguimiento, setSeguimiento] = useState<RepartoSeguimientoDTO | null>(
    null,
  );
  const [origenComun, setOrigenComun] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<RepartoLineaDTO | null>(null);
  const [draft, setDraft] = useState({
    importe: "",
    origen: "",
    fechaPrevista: "",
    concepto: "",
    nota: "",
  });
  const [excluding, setExcluding] = useState<RepartoLineaDTO | null>(null);
  const [exclusion, setExclusion] = useState("");
  const [adding, setAdding] = useState(false);
  const [additional, setAdditional] = useState({
    origen: "",
    destino: "",
    importe: "",
    fechaPrevista: today(),
    concepto: "",
    nota: "",
  });
  const [createKey, setCreateKey] = useState(() => crypto.randomUUID());
  const [generateKey, setGenerateKey] = useState(() => crypto.randomUUID());
  const [addKey, setAddKey] = useState(() => crypto.randomUUID());
  const [generationErrors, setGenerationErrors] = useState<GeneracionError[]>(
    [],
  );
  const rootRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const request = useRef(0);

  useEffect(() => {
    setOpen(false);
    setPropuesta(null);
    setReparto(null);
    setSeguimiento(null);
    setOrigenComun("");
    setError("");
    setNotice("");
    setEditing(null);
    setExcluding(null);
    setAdding(false);
    setCreateKey(crypto.randomUUID());
    setGenerateKey(crypto.randomUUID());
    setAddKey(crypto.randomUUID());
    setGenerationErrors([]);
  }, [ciclo.id]);

  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(rootRef.current)) errorRef.current?.focus();
    });
  }, [error, fieldErrors]);

  async function cargarSeguimiento(id: number) {
    const [data, pendientesData] = await Promise.all([
      api(`/repartos/${id}/seguimiento`),
      api(
        "/transferencias-pendientes?" +
          new URLSearchParams({
            estado: "",
            page: "1",
            reparto: String(id),
          }),
      ),
    ]);
    const pendingList = asRecord(pendientesData)?.items;
    const items = Array.isArray(pendingList)
      ? pendingList
          .map(asPendiente)
          .filter((item): item is TransferenciaPendienteDTO => !!item)
      : [];
    setSeguimiento(normalizeSeguimiento(data, items));
  }

  async function refreshSeguimiento(id: number, estado: RepartoEstado) {
    if (estado === "Borrador") return;
    try {
      await cargarSeguimiento(id);
    } catch (e) {
      // The line was already persisted; surface the stale-panel problem
      // without pretending the creation failed.
      setError((e as Error).message);
    }
  }

  async function cargar() {
    const current = ++request.current;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const [propuestaResult, repartoResult, saldosResult] =
        await Promise.allSettled([
          api(`/ciclos/${ciclo.id}/reparto/propuesta`),
          api<{ reparto: RepartoWireDTO }>(`/ciclos/${ciclo.id}/reparto`),
          api("/saldos?estado=Activa&page=1"),
        ]);
      if (current !== request.current) return;
      if (propuestaResult.status === "rejected")
        throw propuestaResult.reason;
      const p = normalizePropuesta(propuestaResult.value);
      const saldosRaw =
        saldosResult.status === "fulfilled"
          ? asRecord(saldosResult.value)?.saldos
          : null;
      const origenes = Array.isArray(saldosRaw)
        ? saldosRaw
              .map(asSaldo)
              .filter(
                (saldo): saldo is SaldoResumenDTO =>
                  !!saldo &&
                  saldo.id !== "S000" &&
                  saldo.tipo !== "Exterior" &&
                  saldo.control !== "Exterior" &&
                  saldo.control !== "Manual" &&
                  saldo.estado === "Activa",
              )
          : [];
      setPropuesta({ ...p, origenes });
      if (!origenComun && p.origenComunSugerido)
        setOrigenComun(p.origenComunSugerido.id);
      let r: RepartoDTO | null = null;
      if (repartoResult.status === "fulfilled") {
        r = normalizeReparto(repartoResult.value, p.ciclo);
      } else if (
        !(repartoResult.reason instanceof ApiError) ||
        repartoResult.reason.status !== 404
      ) {
        throw repartoResult.reason;
      }
      setReparto(r);
      if (r?.origenComun) setOrigenComun(r.origenComun.id);
      if (r && r.estado !== "Borrador") {
        try {
          await cargarSeguimiento(r.id);
        } catch (e) {
          if (current === request.current) setError((e as Error).message);
        }
      } else {
        setSeguimiento(null);
      }
    } catch (e) {
      if (current === request.current) {
        setError((e as Error).message);
        if (e instanceof ApiError) setFieldErrors(e.fields);
      }
    } finally {
      if (current === request.current) setLoading(false);
    }
  }

  function abrir() {
    setOpen(true);
    void cargar();
  }

  function resetFieldErrors() {
    setFieldErrors({});
    setError("");
    setNotice("");
  }

  function updateAdditional(patch: Partial<typeof additional>) {
    setAdditional((value) => ({ ...value, ...patch }));
    // A changed draft is a new intent: its retry must not replay the previous
    // key/payload pair.
    setAddKey(crypto.randomUUID());
  }

  function propuestaLineas(origen: string): ProposalLine[] {
    return (propuesta?.items ?? [])
      .filter((item) => item.elegible && item.propuesta)
      .map((item) => ({
        clase: "Presupuesto" as const,
        presupuesto: item.presupuesto.id,
        origen,
        destino: item.presupuesto.destino,
        importe: item.propuesta!.importe,
        fechaPrevista: item.propuesta!.fechaPrevista || today(),
      }));
  }

  async function createProposalLines(repartoId: number, origen: string) {
    // Read the persisted state first: a previous partial attempt may already
    // have created some lines.
    const fresh = (await reloadReparto(repartoId).catch(() => null)) ?? reparto;
    const existing = new Set(
      (fresh?.lineas ?? []).map((line) =>
        proposalIdentity({
          clase: line.clase,
          presupuesto: line.presupuesto?.id ?? null,
          importe: line.importe,
          destino: line.destino?.id ?? null,
        }),
      ),
    );
    const lineas = propuestaLineas(origen).filter((line) => {
      // The server rejects origin === destination; never attempt it and let
      // the panel explain why the proposal is skipped.
      if (!line.destino || line.destino === origen) return false;
      return !existing.has(proposalIdentity(line));
    });
    try {
      for (const line of lineas) {
        await api(`/repartos/${repartoId}/lineas`, "POST", line, {
          "idempotency-key": proposalKey(repartoId, line),
        });
      }
    } catch (error) {
      // Whatever was created before the failure is reloaded so the next
      // attempt can skip it deterministically.
      await reloadReparto(repartoId).catch(() => null);
      throw error;
    }
    await reloadReparto(repartoId).catch(() => null);
    return lineas.length;
  }

  async function reloadReparto(id: number) {
    const data = await api<{ reparto: RepartoWireDTO }>(
      `/ciclos/${ciclo.id}/reparto`,
    );
    const r = normalizeReparto(data, propuesta?.ciclo);
    if (r) setReparto(r);
    return r;
  }

  async function preparar() {
    if (!propuesta) return;
    setBusy(true);
    resetFieldErrors();
    try {
      const data = await api(
        `/ciclos/${ciclo.id}/reparto`,
        "POST",
        { origenComun: origenComun || null },
        { "idempotency-key": createKey },
      );
      const creado = asRecord(data)?.creado !== false;
      const r = normalizeReparto(data, propuesta.ciclo);
      if (!r) throw new Error("El servidor no devolvió el reparto creado.");
      setCreateKey(crypto.randomUUID());
      if (!creado) {
        setReparto(r);
        setNotice("El Ciclo ya tenía un reparto. Se conserva sin duplicarlo.");
        return;
      }
      let added = 0;
      if (origenComun) {
        added = await createProposalLines(r.id, origenComun);
      }
      const refreshed = await reloadReparto(r.id);
      setSeguimiento(null);
      setNotice(
        origenComun
          ? added === 1
            ? "Borrador preparado con 1 línea propuesta. Revísala antes de generar."
            : added === 0
              ? "No se añadieron líneas nuevas: ya existían o el origen común coincide con su destino."
              : `Borrador preparado con ${added} líneas propuestas. Revísalas antes de generar.`
          : "Borrador creado sin líneas. Selecciona un origen común y añade las líneas propuestas o una transferencia manual.",
      );
      if (!refreshed) setReparto(r);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }

  async function addProposals() {
    if (!reparto?.puedeAnadirLineas || !propuesta) return;
    if (!origenComun) {
      setFieldErrors({
        origenComun: "Selecciona un origen común para las líneas propuestas.",
      });
      setError("Selecciona un origen común antes de añadir las líneas propuestas.");
      return;
    }
    setBusy(true);
    resetFieldErrors();
    try {
      const added = await createProposalLines(reparto.id, origenComun);
      const refreshed = await reloadReparto(reparto.id);
      await refreshSeguimiento(
        reparto.id,
        refreshed?.estado ?? reparto.estado,
      );
      setNotice(
        added === 0
          ? "No hay líneas propuestas nuevas que añadir: ya existían o el origen común coincide con su destino."
          : added === 1
            ? "Añadida 1 línea propuesta al borrador."
            : `Añadidas ${added} líneas propuestas al borrador.`,
      );
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }

  async function guardarBorrador() {
    if (!reparto?.puedeEditar) return;
    if ((reparto.origenComun?.id ?? "") === origenComun) {
      setNotice("Sin cambios en el borrador.");
      return;
    }
    setBusy(true);
    resetFieldErrors();
    try {
      const data = await api(
        `/repartos/${reparto.id}`,
        "PATCH",
        { revision: reparto.revision, origenComun: origenComun || null },
        { "idempotency-key": crypto.randomUUID() },
      );
      const r = normalizeReparto(data, propuesta?.ciclo) ?? reparto;
      setReparto(r);
      setNotice("Borrador guardado. Puedes cerrar y continuar más tarde.");
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(line: RepartoLineaDTO) {
    if (!reparto?.puedeEditar || line.pendiente) return;
    setEditing(line);
    setDraft({
      importe: line.importe ?? "",
      origen: line.origen?.id ?? "",
      fechaPrevista: line.fechaPrevista,
      concepto: line.concepto ?? "",
      nota: line.nota ?? "",
    });
    setExcluding(null);
    setAdding(false);
    resetFieldErrors();
  }

  async function saveEdit() {
    if (!reparto?.puedeEditar || !editing || editing.pendiente) return;
    setBusy(true);
    resetFieldErrors();
    try {
      const data = await api(
        `/repartos/${reparto.id}/lineas/${editing.id}`,
        "PATCH",
        {
          revision: editing.revision,
          importe: draft.importe.replace(",", "."),
          origen: draft.origen,
          fechaPrevista: draft.fechaPrevista,
          concepto: draft.concepto || null,
          nota: draft.nota || null,
        },
        { "idempotency-key": crypto.randomUUID() },
      );
      const line = responseLine(data);
      const updatedReparto = normalizeReparto(data, propuesta?.ciclo);
      if (updatedReparto) setReparto(updatedReparto);
      else if (line) {
        setReparto({
          ...reparto,
          lineas: reparto.lineas.map((value) =>
            value.id === line.id ? line : value,
          ),
        });
      }
      setEditing(null);
      setNotice("Línea actualizada en el borrador.");
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.status === 422 &&
        e.message.includes("No hay cambios")
      ) {
        setEditing(null);
        setNotice("Sin cambios en la línea.");
        return;
      }
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }

  async function toggleLine(line: RepartoLineaDTO, incluida: boolean) {
    if (!reparto?.puedeEditar || line.pendiente) return;
    if (!incluida && !exclusion.trim()) return;
    setBusy(true);
    resetFieldErrors();
    try {
      const data = await api(
        `/repartos/${reparto.id}/lineas/${line.id}`,
        "PATCH",
        {
          revision: line.revision,
          incluida: incluida ? 1 : 0,
          ...(incluida ? {} : { motivoExclusion: exclusion.trim() }),
        },
        { "idempotency-key": crypto.randomUUID() },
      );
      const updated = responseLine(data);
      const updatedReparto = normalizeReparto(data, propuesta?.ciclo);
      if (updatedReparto) setReparto(updatedReparto);
      else
        setReparto({
          ...reparto,
          lineas: reparto.lineas.map((value) =>
            value.id === line.id
              ? updated ?? {
                  ...value,
                  incluida,
                  motivoExclusion: incluida ? null : exclusion.trim(),
                  revision: value.revision + 1,
                }
              : value,
          ),
        });
      setExcluding(null);
      setExclusion("");
      setNotice(
        incluida ? "Línea incluida de nuevo." : "Línea excluida sin crear pendiente.",
      );
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }

  async function addLine() {
    if (!reparto?.puedeAnadirLineas) return;
    setBusy(true);
    resetFieldErrors();
    try {
      const data = await api(
        `/repartos/${reparto.id}/lineas`,
        "POST",
        {
          clase: "Adicional",
          origen: additional.origen,
          destino: additional.destino,
          importe: additional.importe.replace(",", "."),
          fechaPrevista: additional.fechaPrevista,
          concepto: additional.concepto || null,
          nota: additional.nota || null,
        },
        // Stable until success: a lost response can be retried without
        // duplicating the line. Renewed after success or when the form closes.
        { "idempotency-key": addKey },
      );
      const line = responseLine(data);
      const updatedReparto = normalizeReparto(data, propuesta?.ciclo);
      if (updatedReparto) setReparto(updatedReparto);
      else if (line)
        setReparto({ ...reparto, lineas: [...reparto.lineas, line] });
      await refreshSeguimiento(
        reparto.id,
        updatedReparto?.estado ?? reparto.estado,
      );
      setAdding(false);
      setAddKey(crypto.randomUUID());
      setAdditional({
        origen: "",
        destino: "",
        importe: "",
        fechaPrevista: today(),
        concepto: "",
        nota: "",
      });
      setNotice("Transferencia adicional añadida al borrador.");
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }

  async function generar() {
    if (!reparto) return;
    // Only server-approved, included and warning-free lines are sent.
    const lineas = reparto.lineas
      .filter((line) => line.puedeGenerarse)
      .map((line) => line.id);
    if (lineas.length === 0) {
      setNotice("No hay líneas generables sin pendiente.");
      return;
    }
    setBusy(true);
    resetFieldErrors();
    setGenerationErrors([]);
    try {
      const result = await api(
        `/repartos/${reparto.id}/generar`,
        "POST",
        { revision: reparto.revision, lineaIds: lineas },
        { "idempotency-key": generateKey },
      );
      setGenerateKey(crypto.randomUUID());
      const createdRaw = asRecord(result)?.creados;
      const created = Array.isArray(createdRaw)
        ? createdRaw.length
        : lineas.length;
      const r =
        normalizeReparto(result, propuesta?.ciclo) ??
        (await reloadReparto(reparto.id)) ??
        reparto;
      setReparto(r);
      await cargarSeguimiento(reparto.id);
      setNotice(
        created === 1
          ? "Generado 1 pendiente. No se ha ejecutado ningún pago."
          : `Generados ${created} pendientes. No se ha ejecutado ningún pago.`,
      );
    } catch (e) {
      if (e instanceof ApiError) {
        const rawErrors = asRecord(e.data)?.errores;
        setGenerationErrors(
          Array.isArray(rawErrors)
            ? rawErrors
                .map(asGeneracionError)
                .filter((error): error is GeneracionError => !!error)
            : [],
        );
        setFieldErrors(e.fields);
      }
      setError((e as Error).message);
      // The generation transaction rolled back, but reloading keeps the panel
      // aligned with the persisted draft after any failure.
      await reloadReparto(reparto.id).catch(() => null);
    } finally {
      setBusy(false);
    }
  }

  async function completar() {
    if (!reparto) return;
    setBusy(true);
    resetFieldErrors();
    try {
      const result = await api(
        `/repartos/${reparto.id}/completar`,
        "POST",
        { revision: reparto.revision },
        { "idempotency-key": crypto.randomUUID() },
      );
      setReparto(
        normalizeReparto(result, propuesta?.ciclo) ??
          (await reloadReparto(reparto.id)) ??
          reparto,
      );
      await cargarSeguimiento(reparto.id);
      setNotice("Reparto completado. Conserva el seguimiento de sus líneas.");
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }

  const saldos = propuesta?.origenes ?? [];
  const generables =
    reparto?.lineas.filter((line) => line.puedeGenerarse) ?? [];
  const existingLineIdentities = new Set(
    (reparto?.lineas ?? []).map((line) =>
      proposalIdentity({
        clase: line.clase,
        presupuesto: line.presupuesto?.id ?? null,
        importe: line.importe,
        destino: line.destino?.id ?? null,
      }),
    ),
  );
  const propuestasCandidatas = (propuesta?.items ?? []).filter(
    (item) => item.elegible && item.propuesta,
  );
  const propuestasDisponibles = propuestasCandidatas.filter((item) => {
    const destino = item.presupuesto.destino;
    if (!destino || destino === origenComun) return false;
    return !existingLineIdentities.has(
      proposalIdentity({
        clase: "Presupuesto",
        presupuesto: item.presupuesto.id,
        importe: item.propuesta!.importe,
        destino,
      }),
    );
  });
  const colisionesOrigen =
    origenComun === ""
      ? []
      : propuestasCandidatas.filter(
          (item) => item.presupuesto.destino === origenComun,
        );
  const propuestasPendientes = propuestasDisponibles.length;
  const estado: RepartoEstado = reparto?.estado ?? "Borrador";
  const borrador = !!reparto && estado === "Borrador";
  const puedeEditarReparto = reparto?.puedeEditar === true;
  const puedeAnadirLineas = reparto?.puedeAnadirLineas === true;

  return (
    <section
      ref={rootRef}
      className="panel reparto-panel"
      aria-label="Reparto mensual del ciclo"
    >
      <div className="ui-form-section-head">
        <div className="ui-form-section-copy">
          <h2 className="ui-form-section-title">Reparto mensual</h2>
          <p className="ui-form-section-description">
            Prepara Transferencias pendientes desde el equivalente mensual E2.3
            del Plan del ciclo. No ejecuta pagos ni da el plan por ejecutado; los
            hechos reales siguen siendo Movimientos.
          </p>
        </div>
        {!open ? (
          <button className="primary" onClick={abrir}>
            Preparar reparto del ciclo
          </button>
        ) : (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              setError("");
              setNotice("");
            }}
          >
            Cerrar reparto
          </button>
        )}
      </div>

      {!open ? (
        <p className="help">
          El reparto es independiente del plan: abrirlo, iniciarlo o modificarlo
          no crea Transferencias ni cambia Saldos, Ejecutado, Pendiente o Estado.
        </p>
      ) : (
        <>
          <div ref={errorRef} tabIndex={-1}>
            {error && <Alert retry={cargar}>{error}</Alert>}
          </div>
          {generationErrors.length > 0 && (
            <Alert>
              <strong>No se generó ningún pendiente.</strong> El borrador se
              conserva. Revisa estas líneas:
              <ul>
                {generationErrors.map((failure) => (
                  <li key={`${failure.lineaId}:${failure.code}`}>
                    Línea {failure.lineaId} · {failure.code}: {failure.message}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
          {notice && <p role="status">{notice}</p>}
          {loading ? (
            <Skeleton lines={4} label="Cargando reparto mensual" />
          ) : propuesta ? (
            <>
              <section className="panel" aria-label="Propuesta E2.3">
                <h3>Propuesta E2.3 · Ciclo {ciclo.id}</h3>
                <p>
                  Del mes, Ejecutado, Pendiente y Estado se leen del plan
                  mensual; el reparto no los recalcula ni prorratea el Plan
                  anual.
                </p>
                {propuesta.sinPlan ? (
                  <EmptyState title="Sin plan" icon="○">
                    El Ciclo no tiene líneas de planificación. No se inventan
                    líneas ni importes; solo puedes decidir transferencias
                    adicionales.
                  </EmptyState>
                ) : propuesta.periodo.motivo ? (
                  <Alert>
                    {propuesta.periodo.motivo}. Se mantiene el Del mes visible
                    si existe, pero no se inventa un importe sugerido ni un
                    Estado comparable.
                  </Alert>
                ) : null}
                {propuesta.items.length === 0 ? (
                  <EmptyState title="Sin presupuestos" icon="○">
                    No hay Presupuestos que mostrar en este Ciclo.
                  </EmptyState>
                ) : (
                  <RepartoPropuestaTabla items={propuesta.items} />
                )}
                <p className="help">
                  {propuesta.motivoOrigen ??
                    "El origen común es un valor por defecto. Cambiarlo no reescribe las líneas ya configuradas ni infiere una cuenta de nómina por nombre o banco."}
                </p>
              </section>

              {!reparto && (
                <section className="panel" aria-label="Preparar borrador">
                  <h3>Preparar borrador</h3>
                  <Field
                    id="reparto-origen-comun"
                    label="Origen común"
                    help="Valor por defecto para las líneas que no resuelvan un origen propio. Solo se ofrecen Saldos elegibles."
                    error={fieldErrors.origenComun}
                  >
                    <select
                      value={origenComun}
                      onChange={(e) => setOrigenComun(e.target.value)}
                    >
                      <option value="">Seleccionar origen</option>
                      {saldos.map((saldo) => (
                        <option key={saldo.id} value={saldo.id}>
                          {saldo.id} · {saldo.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <p className="help">
                    Gasto real se mantiene en origen y No aplica no recibe
                    propuesta automática. Las líneas con Pendiente positivo
                    verificable se propondrán; el importe se puede editar después.
                  </p>
                  <div className="actions">
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={preparar}
                    >
                      Preparar reparto del ciclo
                    </button>
                  </div>
                </section>
              )}

              {reparto && (
                <FormSection
                  title={borrador ? "Borrador del reparto" : "Líneas del reparto"}
                  description={
                    borrador
                      ? "Edita o excluye antes de generar. Excluir no crea pendiente y queda registrado con motivo. Generar no ejecuta ningún pago."
                      : "Las líneas ya generadas no se editan ni excluyen. Puedes añadir líneas nuevas y generar solo sus pendientes; no se regeneran los existentes."
                  }
                >
                  {reparto.cicloCerrado && (
                    <Alert>
                      El Ciclo tiene un cierre financiero. La lectura, la
                      cancelación de pendientes y el completado permitido siguen
                      disponibles, pero no se edita, añade ni genera.
                    </Alert>
                  )}
                  <Field
                    id="reparto-origen-comun-borrador"
                    label="Origen común"
                    help={
                      borrador
                        ? "Solo actúa como valor por defecto de líneas nuevas; no reescribe las ya configuradas."
                        : "El origen común guardado no se modifica tras generar; esta selección solo se usa para las líneas nuevas."
                    }
                    error={fieldErrors.origenComun}
                  >
                    <select
                      value={origenComun}
                      disabled={!puedeAnadirLineas}
                      onChange={(e) => setOrigenComun(e.target.value)}
                    >
                      <option value="">Seleccionar origen</option>
                      {saldos.map((saldo) => (
                        <option key={saldo.id} value={saldo.id}>
                          {saldo.id} · {saldo.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {colisionesOrigen.length > 0 && (
                    <Alert>
                      El origen común coincide con el destino de{" "}
                      {colisionesOrigen
                        .map((item) => item.presupuesto.nombre)
                        .join(", ")}
                      . Esas líneas no se crean porque origen y destino deben ser
                      distintos.
                    </Alert>
                  )}
                  <RepartoBorradorTabla
                    lineas={reparto.lineas}
                    busy={busy}
                    puedeEditar={puedeEditarReparto}
                    onEdit={beginEdit}
                    onExclude={(line) => {
                      setExcluding(line);
                      setEditing(null);
                      setAdding(false);
                      setExclusion("");
                      resetFieldErrors();
                    }}
                    onInclude={(line) => void toggleLine(line, true)}
                  />
                  <div className="actions">
                    <button
                      className="secondary"
                      disabled={
                        busy ||
                        !puedeAnadirLineas ||
                        !origenComun ||
                        propuestasPendientes === 0
                      }
                      onClick={addProposals}
                    >
                      {propuestasPendientes === 1
                        ? "Añadir 1 línea propuesta"
                        : `Añadir ${propuestasPendientes} líneas propuestas`}
                    </button>
                    <button
                      className="secondary"
                      disabled={busy || !puedeAnadirLineas}
                      onClick={() => {
                        setAdding(!adding);
                        // Opening or closing the form starts a new attempt.
                        setAddKey(crypto.randomUUID());
                        setEditing(null);
                        setExcluding(null);
                        resetFieldErrors();
                      }}
                    >
                      Añadir transferencia
                    </button>
                    <button
                      className="secondary"
                      disabled={busy || !puedeEditarReparto}
                      onClick={guardarBorrador}
                    >
                      Guardar borrador
                    </button>
                    <button
                      className="primary"
                      disabled={
                        busy || !reparto.puedeGenerar || generables.length === 0
                      }
                      onClick={generar}
                    >
                      {generarEtiqueta(generables.length)}
                    </button>
                  </div>
                  {generables.length === 0 && (
                    <p className="help">
                      {reparto.puedeGenerar
                        ? "Ninguna línea nueva es generable. Revisa los avisos de contexto."
                        : "No hay líneas generables en este momento. Incluye una línea completa con origen, destino, importe y fecha prevista, sin avisos."}
                    </p>
                  )}

                  {editing && (
                    <section className="panel" aria-label="Editar línea del reparto">
                      <h4>Editar línea {editing.id}</h4>
                      <FormGrid>
                        <Field
                          id={`reparto-linea-${editing.id}-importe`}
                          label="Importe (€)"
                          error={fieldErrors.importe}
                          required
                        >
                          <input
                            inputMode="decimal"
                            value={draft.importe}
                            onChange={(e) =>
                              setDraft((value) => ({
                                ...value,
                                importe: e.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field
                          id={`reparto-linea-${editing.id}-origen`}
                          label="Origen"
                          error={fieldErrors.origen}
                          required
                        >
                          <select
                            value={draft.origen}
                            onChange={(e) =>
                              setDraft((value) => ({
                                ...value,
                                origen: e.target.value,
                              }))
                            }
                          >
                            <option value="">Seleccionar origen</option>
                            {saldos.map((saldo) => (
                              <option key={saldo.id} value={saldo.id}>
                                {saldo.id} · {saldo.nombre}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field
                          id={`reparto-linea-${editing.id}-fecha`}
                          label="Fecha prevista"
                          error={fieldErrors.fechaPrevista}
                          required
                        >
                          <input
                            type="date"
                            value={draft.fechaPrevista}
                            onChange={(e) =>
                              setDraft((value) => ({
                                ...value,
                                fechaPrevista: e.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field
                          id={`reparto-linea-${editing.id}-concepto`}
                          label="Concepto"
                          error={fieldErrors.concepto}
                        >
                          <input
                            maxLength={500}
                            value={draft.concepto}
                            onChange={(e) =>
                              setDraft((value) => ({
                                ...value,
                                concepto: e.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field
                          id={`reparto-linea-${editing.id}-nota`}
                          label="Nota"
                          className="ui-form-span"
                          error={fieldErrors.nota}
                        >
                          <textarea
                            maxLength={2000}
                            value={draft.nota}
                            onChange={(e) =>
                              setDraft((value) => ({
                                ...value,
                                nota: e.target.value,
                              }))
                            }
                          />
                        </Field>
                      </FormGrid>
                      <p className="help">
                        El destino procede del Presupuesto y no se edita aquí. Si
                        el destino está inactivo, no se propone automáticamente.
                      </p>
                      <div className="actions">
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={saveEdit}
                        >
                          Guardar línea
                        </button>
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => setEditing(null)}
                        >
                          Cancelar edición
                        </button>
                      </div>
                    </section>
                  )}

                  {excluding && (
                    <section
                      className="panel"
                      aria-label={`Excluir línea ${excluding.id}`}
                    >
                      <h4>Excluir línea {excluding.id}</h4>
                      <p>
                        Excluir antes de generar no crea un pendiente ni cuenta
                        para completar el reparto. El motivo es obligatorio.
                      </p>
                      <Field
                        id={`reparto-linea-${excluding.id}-motivo-exclusion`}
                        label="Motivo de exclusión"
                        error={fieldErrors.motivoExclusion}
                        required
                      >
                        <textarea
                          maxLength={2000}
                          value={exclusion}
                          onChange={(e) => setExclusion(e.target.value)}
                        />
                      </Field>
                      <div className="actions">
                        <button
                          className="primary"
                          disabled={busy || !exclusion.trim()}
                          onClick={() => void toggleLine(excluding, false)}
                        >
                          Excluir línea
                        </button>
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => setExcluding(null)}
                        >
                          Volver al borrador
                        </button>
                      </div>
                    </section>
                  )}

                  {adding && (
                    <section className="panel" aria-label="Añadir transferencia">
                      <h4>Transferencia adicional</h4>
                      <p className="help">
                        Es una Transferencia ordinaria entre Saldos activos y
                        distintos. Si el destino es una Aportación a saldo,
                        ejecutará ese Presupuesto al confirmarse; si es Gasto
                        real, no ejecutará su fuente.
                      </p>
                      <FormGrid>
                        <Field
                          id="reparto-adicional-origen"
                          label="Origen"
                          error={fieldErrors.origen}
                          required
                        >
                          <select
                            value={additional.origen}
                            onChange={(e) =>
                              updateAdditional({ origen: e.target.value })
                            }
                          >
                            <option value="">Seleccionar origen</option>
                            {saldos.map((saldo) => (
                              <option key={saldo.id} value={saldo.id}>
                                {saldo.id} · {saldo.nombre}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field
                          id="reparto-adicional-destino"
                          label="Destino"
                          error={fieldErrors.destino}
                          required
                        >
                          <select
                            value={additional.destino}
                            onChange={(e) =>
                              updateAdditional({ destino: e.target.value })
                            }
                          >
                            <option value="">Seleccionar destino</option>
                            {saldos
                              .filter((saldo) => saldo.id !== additional.origen)
                              .map((saldo) => (
                                <option key={saldo.id} value={saldo.id}>
                                  {saldo.id} · {saldo.nombre}
                                </option>
                              ))}
                          </select>
                        </Field>
                        <Field
                          id="reparto-adicional-importe"
                          label="Importe (€)"
                          error={fieldErrors.importe}
                          required
                        >
                          <input
                            inputMode="decimal"
                            value={additional.importe}
                            onChange={(e) =>
                              updateAdditional({ importe: e.target.value })
                            }
                          />
                        </Field>
                        <Field
                          id="reparto-adicional-fecha"
                          label="Fecha prevista"
                          error={fieldErrors.fechaPrevista}
                          required
                        >
                          <input
                            type="date"
                            value={additional.fechaPrevista}
                            onChange={(e) =>
                              updateAdditional({ fechaPrevista: e.target.value })
                            }
                          />
                        </Field>
                        <Field
                          id="reparto-adicional-concepto"
                          label="Concepto"
                          error={fieldErrors.concepto}
                        >
                          <input
                            maxLength={500}
                            value={additional.concepto}
                            onChange={(e) =>
                              updateAdditional({ concepto: e.target.value })
                            }
                          />
                        </Field>
                        <Field
                          id="reparto-adicional-nota"
                          label="Nota"
                          className="ui-form-span"
                          error={fieldErrors.nota}
                        >
                          <textarea
                            maxLength={2000}
                            value={additional.nota}
                            onChange={(e) =>
                              updateAdditional({ nota: e.target.value })
                            }
                          />
                        </Field>
                      </FormGrid>
                      <div className="actions">
                        <button
                          className="primary"
                          disabled={
                            busy ||
                            !additional.origen ||
                            !additional.destino ||
                            !additional.importe ||
                            !additional.fechaPrevista
                          }
                          onClick={addLine}
                        >
                          Añadir línea adicional
                        </button>
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => setAdding(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </section>
                  )}
                </FormSection>
              )}

              {seguimiento && (
                <RepartoSeguimientoPanel
                  seguimiento={seguimiento}
                  go={go}
                  busy={busy}
                  onReload={() => {
                    if (reparto) void cargarSeguimiento(reparto.id);
                  }}
                  onChanged={() => {
                    if (reparto) {
                      void cargarSeguimiento(reparto.id);
                      void reloadReparto(reparto.id).catch(() => {});
                    }
                  }}
                  onCompletar={completar}
                />
              )}
            </>
          ) : (
            !error && (
              <EmptyState title="Reparto no disponible" icon="○">
                Vuelve a cargar la propuesta del Ciclo.
              </EmptyState>
            )
          )}
        </>
      )}
    </section>
  );
}
