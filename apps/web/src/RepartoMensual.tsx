import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  api,
  ApiError,
  eur,
  type RepartoDTO,
  type RepartoEstado,
  type RepartoLineaDTO,
  type RepartoPropuestaDTO,
  type RepartoPropuestaItemDTO,
  type RepartoSeguimientoDTO,
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

const avisoLabels: Record<string, string> = {
  PRESUPUESTO_INACTIVO: "Histórico · no se generará un pendiente nuevo.",
  PRESUPUESTO_NO_DISPONIBLE: "El Presupuesto no está disponible.",
  PRESUPUESTO_DESTINO: "El destino del Presupuesto cambió.",
  FUENTE_NO_APORTACION: "El Presupuesto ya no es Aportación a saldo.",
  SALDO_ORIGEN_NO_ELEGIBLE: "El Saldo de origen ya no es elegible.",
  SALDO_DESTINO_NO_ELEGIBLE: "El Saldo de destino ya no es elegible.",
};
const avisoTexto = (aviso: string) => avisoLabels[aviso] ?? aviso;

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
  if (value && typeof value === "object") {
    const raw = value as Record<string, unknown>;
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

function asPendiente(value: unknown): TransferenciaPendienteDTO | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, any>;
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
    repartoLinea: raw.repartoLinea ?? null,
    reparto: raw.reparto ?? null,
    presupuesto: asPresupuesto(raw.presupuesto),
    gasto: typeof raw.gasto === "string" ? raw.gasto : null,
    anticipo: typeof raw.anticipo === "string" ? raw.anticipo : null,
    movimiento: raw.movimiento ?? null,
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
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, any>;
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
    avisos: Array.isArray(raw.avisos) ? raw.avisos : [],
  };
}

export function normalizeReparto(
  value: unknown,
  cicloFallback?: { id: string; inicio: string; fin: string | null },
): RepartoDTO | null {
  if (!value || typeof value !== "object") return null;
  const outer = value as Record<string, any>;
  const raw =
    outer.reparto && typeof outer.reparto === "object"
      ? outer.reparto
      : outer.item && typeof outer.item === "object"
        ? outer.item
        : outer;
  if (typeof raw.id !== "number") return null;
  const ciclo = raw.ciclo;
  const cicloId =
    typeof ciclo === "string"
      ? ciclo
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
  };
}

function asPropuestaItem(value: unknown): RepartoPropuestaItemDTO | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, any>;
  const presupuesto = asPresupuesto(raw.presupuesto);
  if (!presupuesto) return null;
  const motivos: string[] = Array.isArray(raw.motivos)
    ? raw.motivos.filter((motivo: unknown) => typeof motivo === "string")
    : [];
  const propuestaRaw =
    raw.propuesta && typeof raw.propuesta === "object"
      ? raw.propuesta
      : raw.sugerencia && typeof raw.sugerencia === "object"
        ? raw.sugerencia
        : null;
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
    elegible:
      !inactivo &&
      propuesta !== null &&
      raw.elegible !== false,
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
  const raw = (value && typeof value === "object" ? value : {}) as Record<
    string,
    any
  >;
  const ciclo = raw.ciclo;
  const cicloId =
    typeof ciclo === "string"
      ? ciclo
      : typeof ciclo?.id === "string"
        ? ciclo.id
        : "";
  const rawItems = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw)
      ? raw
      : [];
  const rawSaldos = Array.isArray(raw.origenes)
    ? raw.origenes
    : Array.isArray(raw.saldos)
      ? raw.saldos
      : [];
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
        typeof raw.periodo?.inicio === "string"
          ? raw.periodo.inicio
          : typeof ciclo?.inicio === "string"
            ? ciclo.inicio
            : "",
      fin:
        typeof raw.periodo?.fin === "string"
          ? raw.periodo.fin
          : typeof ciclo?.fin === "string"
            ? ciclo.fin
            : null,
      corte:
        typeof raw.periodo?.corte === "string" ? raw.periodo.corte : null,
      motivo:
        typeof raw.periodo?.motivo === "string" ? raw.periodo.motivo : null,
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

export function normalizeSeguimiento(
  value: unknown,
  pendientesCompletos: TransferenciaPendienteDTO[] = [],
): RepartoSeguimientoDTO | null {
  const raw = (value && typeof value === "object" ? value : {}) as Record<
    string,
    any
  >;
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
  const resumenRaw = raw.resumen ?? {};
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
      todasTerminales:
        raw.puedeCompletar === true ||
        resumenRaw.todasTerminales === true ||
        (pendientes === 0 &&
          items.some((line) => line.incluida && line.pendiente)),
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
    cell: (line) =>
      line.incluida ? (
        <Tag>Incluida</Tag>
      ) : (
        <>
          <Tag inactive>Excluida</Tag>
          {line.motivoExclusion && (
            <p className="help">{line.motivoExclusion}</p>
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
        {line.incluida ? (
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
}: {
  lineas: RepartoLineaDTO[];
  onEdit: (line: RepartoLineaDTO) => void;
  onExclude: (line: RepartoLineaDTO) => void;
  onInclude: (line: RepartoLineaDTO) => void;
  busy?: boolean;
}) {
  const columns = borradorColumns(onEdit, onExclude, onInclude, busy);
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
  const { resumen, reparto } = seguimiento;
  return (
    <section className="panel" aria-label="Seguimiento del reparto">
      <h3>Seguimiento del reparto · {reparto.estado}</h3>
      <p>
        {resumen.lineas} líneas · {resumen.incluidas} incluidas ·{" "}
        {resumen.pendientes} pendientes · {resumen.confirmadas} confirmadas ·{" "}
        {resumen.canceladas} canceladas.
      </p>
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
                <TransferenciaPendienteFicha
                  pendiente={line.pendiente}
                  go={go}
                  onChanged={onChanged}
                  onReload={onReload}
                />
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
            disabled={busy || !resumen.todasTerminales}
            onClick={onCompletar}
          >
            Completar reparto
          </button>
          {!resumen.todasTerminales && (
            <span className="help">
              Solo se completa cuando todas las líneas generadas están
              Confirmadas o Canceladas.
            </span>
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
    const items = Array.isArray((pendientesData as any)?.items)
      ? ((pendientesData as any).items as unknown[])
          .map(asPendiente)
          .filter((item): item is TransferenciaPendienteDTO => !!item)
      : [];
    setSeguimiento(normalizeSeguimiento(data, items));
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
          api(`/ciclos/${ciclo.id}/reparto`),
          api("/saldos?estado=Activa&page=1"),
        ]);
      if (current !== request.current) return;
      if (propuestaResult.status === "rejected")
        throw propuestaResult.reason;
      const p = normalizePropuesta(propuestaResult.value);
      const origenes =
        saldosResult.status === "fulfilled"
          ? (((saldosResult.value as any)?.saldos ?? []) as unknown[])
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

  function propuestaLineas(origen: string) {
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
    const existing = new Set(
      (reparto?.lineas ?? [])
        .filter((line) => line.clase === "Presupuesto" && line.presupuesto)
        .map((line) => line.presupuesto!.id),
    );
    const lineas = propuestaLineas(origen).filter(
      (line) => !existing.has(line.presupuesto),
    );
    for (const line of lineas) {
      await api(
        `/repartos/${repartoId}/lineas`,
        "POST",
        line,
        { "idempotency-key": crypto.randomUUID() },
      );
    }
    return lineas.length;
  }

  async function reloadReparto(id: number) {
    const data = await api(`/ciclos/${ciclo.id}/reparto`);
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
      const creado = (data as any)?.creado !== false;
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
    if (!reparto || !propuesta) return;
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
      await reloadReparto(reparto.id);
      setNotice(
        added === 0
          ? "No hay líneas propuestas nuevas que añadir."
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
    if (!reparto) return;
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
    if (!reparto || !editing) return;
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
      const line = asLinea((data as any)?.linea ?? (data as any)?.item ?? data);
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
    if (!reparto) return;
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
      const updated = asLinea(
        (data as any)?.linea ?? (data as any)?.item ?? data,
      );
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
    if (!reparto) return;
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
        { "idempotency-key": crypto.randomUUID() },
      );
      const line = asLinea((data as any)?.linea ?? (data as any)?.item ?? data);
      const updatedReparto = normalizeReparto(data, propuesta?.ciclo);
      if (updatedReparto) setReparto(updatedReparto);
      else if (line)
        setReparto({ ...reparto, lineas: [...reparto.lineas, line] });
      setAdding(false);
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
    const lineas = reparto.lineas
      .filter((line) => line.incluida && !line.pendiente)
      .map((line) => line.id);
    if (lineas.length === 0) {
      setNotice("No hay líneas incluidas sin pendiente que generar.");
      return;
    }
    setBusy(true);
    resetFieldErrors();
    try {
      const result = await api(
        `/repartos/${reparto.id}/generar`,
        "POST",
        { revision: reparto.revision, lineaIds: lineas },
        { "idempotency-key": generateKey },
      );
      setGenerateKey(crypto.randomUUID());
      const r =
        normalizeReparto(result, propuesta?.ciclo) ??
        (await reloadReparto(reparto.id)) ??
        reparto;
      setReparto(r);
      await cargarSeguimiento(reparto.id);
      setNotice(
        lineas.length === 1
          ? "Generado 1 pendiente. No se ha ejecutado ningún pago."
          : `Generados ${lineas.length} pendientes. No se ha ejecutado ningún pago.`,
      );
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields);
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
  const incluidasSinPendiente =
    reparto?.lineas.filter((line) => line.incluida && !line.pendiente) ?? [];
  const presupuestosEnReparto = new Set(
    (reparto?.lineas ?? [])
      .filter((line) => line.clase === "Presupuesto" && line.presupuesto)
      .map((line) => line.presupuesto!.id),
  );
  const propuestasPendientes =
    propuesta?.items.filter(
      (item) =>
        item.elegible &&
        item.propuesta &&
        !presupuestosEnReparto.has(item.presupuesto.id),
    ).length ?? 0;
  const estado: RepartoEstado = reparto?.estado ?? "Borrador";
  const borrador = !!reparto && estado === "Borrador";

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

              {borrador && reparto && (
                <FormSection
                  title="Borrador del reparto"
                  description="Edita o excluye antes de generar. Excluir no crea pendiente y queda registrado con motivo. Generar no ejecuta ningún pago."
                >
                  <Field
                    id="reparto-origen-comun-borrador"
                    label="Origen común"
                    help="Solo actúa como valor por defecto de líneas nuevas; no reescribe las ya configuradas."
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
                  <RepartoBorradorTabla
                    lineas={reparto.lineas}
                    busy={busy}
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
                      disabled={busy || !origenComun || propuestasPendientes === 0}
                      onClick={addProposals}
                    >
                      {propuestasPendientes === 1
                        ? "Añadir 1 línea propuesta"
                        : `Añadir ${propuestasPendientes} líneas propuestas`}
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => {
                        setAdding((value) => !value);
                        setEditing(null);
                        setExcluding(null);
                        resetFieldErrors();
                      }}
                    >
                      Añadir transferencia
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={guardarBorrador}
                    >
                      Guardar borrador
                    </button>
                    <button
                      className="primary"
                      disabled={busy || incluidasSinPendiente.length === 0}
                      onClick={generar}
                    >
                      {generarEtiqueta(incluidasSinPendiente.length)}
                    </button>
                  </div>
                  {incluidasSinPendiente.length === 0 && (
                    <p className="help">
                      Incluye al menos una línea con origen, destino, importe y
                      fecha prevista para generar pendientes.
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
                              setAdditional((value) => ({
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
                          id="reparto-adicional-destino"
                          label="Destino"
                          error={fieldErrors.destino}
                          required
                        >
                          <select
                            value={additional.destino}
                            onChange={(e) =>
                              setAdditional((value) => ({
                                ...value,
                                destino: e.target.value,
                              }))
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
                              setAdditional((value) => ({
                                ...value,
                                importe: e.target.value,
                              }))
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
                              setAdditional((value) => ({
                                ...value,
                                fechaPrevista: e.target.value,
                              }))
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
                              setAdditional((value) => ({
                                ...value,
                                concepto: e.target.value,
                              }))
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
                              setAdditional((value) => ({
                                ...value,
                                nota: e.target.value,
                              }))
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
