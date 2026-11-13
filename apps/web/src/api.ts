import { formatAmount } from "./format";

export type Saldo = {
  id: string;
  nombre: string;
  tipo: string;
  control: string;
  estado: string;
  finalidad: string | null;
  liquidez: boolean | null;
  mostrarComoBolsa: boolean | null;
  permiteSalidaExterior: boolean | null;
  fechaApertura: string | null;
  saldoApertura: string | null;
  objetivo: string | null;
  revision: number;
  posicion: { importe: string | null; condicion: string; motivo: string };
};
export class ApiError extends Error {
  code: string;
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
    public data: Record<string, any> = {},
  ) {
    super(message);
    this.code = typeof data.code === "string" ? data.code : "";
  }
}
let csrf = "";
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  extra: Record<string, string> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "No se pudo conectar. Tus datos siguen en el formulario; vuelve a intentarlo.",
    );
  }
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      "Respuesta no válida. Vuelve a intentarlo.",
    );
  }
  if (!response.ok && response.status === 401 && !path.startsWith("/auth/"))
    window.dispatchEvent(new Event("session-expired"));
  if (!response.ok)
    throw new ApiError(
      response.status,
      data.error ?? "No se pudo completar la operación.",
      data.fields ?? {},
      data,
    );
  if (data.csrf) csrf = data.csrf;
  return data as T;
}
export const flags = [
  "liquidez",
  "mostrarComoBolsa",
  "permiteSalidaExterior",
] as const;
export const flagLabels = {
  liquidez: "Liquidez",
  mostrarComoBolsa: "Mostrar como bolsa",
  permiteSalidaExterior: "Permite salida a Exterior",
};
export const controls: Record<string, string[]> = {
  Efectivo: ["Movimientos", "Terminal", "No controlado", "Inversiones"],
  Inversión: ["Inversiones"],
};
export function eur(value: string | null) {
  return value === null ? "Sin informar" : formatAmount(value, "EUR");
}

// E2.6 wire contract only; the browser never imports server modules.
export type FlowMetric = {
  valor: string | null;
  subtotal: string | null;
  estado: string;
  motivo: string;
  fuente: string;
  ids: string[];
  cobertura: string;
};
type FlowCycle = {
  id: string;
  mesFinanciado: string;
  inicio: string;
  fin: string | null;
};
type FlowPay = {
  id: string;
  revision: number;
  mes: string;
  motivo: string;
  fuente: string | null;
};
export type MonthlyFlowDTO = {
  ciclo: FlowCycle;
  ciclos: FlowCycle[];
  corteEfectivo: string | null;
  consulta: string;
  metrics: Record<string, FlowMetric>;
  erroresFuente: string[];
  alcance: string;
  procedencia: string;
  coberturaBancaria: { verificada: boolean; motivo: string };
  mensual: {
    ancla: string | null;
    inicio: string | null;
    fin: string | null;
    n: number;
    meses: {
      mes: string;
      valido: boolean;
      motivo: string;
      subtotalConocido: string | null;
      pagas: FlowPay[];
    }[];
    avisos: FlowPay[];
  };
  plan: { sinPlan: boolean; sinPlanificar: string[] };
  liquidez: { fuente: string; excluidos: { id: string; motivo: string }[] };
  pendientes: string[];
};

// E3.2 base B central read model (AC-20 contract only; reports/E3.6 consumption is B-T11).
export type SharedMetricState =
  | "Verificada"
  | "Parcial"
  | "No disponible"
  | "No aplica";
export type SharedMetric = {
  valor: string | null;
  subtotal: string | null;
  estado: SharedMetricState;
  motivo: string;
  fuente: string;
  cobertura: string;
};
export type SharedParticipant = {
  id: string;
  nombre: string;
  rol: "Titular" | "Tercero";
  partes: number;
  estado: "Activa" | "Baja";
  revision: number;
  creado: string;
  actualizado: string;
  asignado: SharedMetric;
  aportado: SharedMetric;
  pendiente: SharedMetric;
  exceso: SharedMetric;
  costePropio: SharedMetric | null;
};
export type SharedExpense = {
  id: string;
  fecha: string;
  importe: string;
  partida: { id: string; nombre: string } | null;
  valido: boolean;
  anulado: boolean;
  motivo: string | null;
  revision: number;
  saldoPagador: { id: string; nombre: string } | null;
  computaEnBruto: boolean;
  asignaciones: { participanteId: string; importe: string | null }[];
  recuperado: SharedMetric;
  neto: SharedMetric;
};
export type SharedPartida = {
  id: string;
  nombre: string;
  bruto: string;
  gastos: string[];
  neto: SharedMetric;
};
export type SharedContribution = {
  movimiento: string;
  fecha: string;
  importe: string;
  origen: string;
  destino: string;
  anulado: boolean;
  participante: {
    id: string;
    nombre: string;
    rol: "Titular" | "Tercero";
    estado: "Activa" | "Baja";
  };
  evidencia: string;
  procedencia:
    | "Registro del titular"
    | "Documento bancario"
    | "Importación histórica autorizada";
  revision: number;
  revisionMovimiento: number;
  creado: string;
  actualizado: string;
  computa: boolean;
};
export type SharedHistorical = {
  movimiento: string;
  fecha: string;
  importe: string;
  origen: string;
  destino: string;
  revision: number;
  concepto: string;
};
// SPEC36 — wire contract for Transferencia pendiente and reparto mensual.
// The browser never imports server modules; these shapes mirror the JSON DTOs.
export type SaldoResumenDTO = {
  id: string;
  nombre: string;
  tipo: string;
  control: string;
  estado: string;
};

export type TransferenciaPendienteEstado =
  | "Pendiente de realizar"
  | "Confirmada"
  | "Cancelada";

export type TransferenciaPendienteDTO = {
  id: number;
  estado: TransferenciaPendienteEstado;
  importe: string;
  origen: SaldoResumenDTO | null;
  destino: SaldoResumenDTO | null;
  cicloOrigen: string;
  fechaPrevista: string;
  fechaEfectiva: string | null;
  concepto: string;
  nota: string;
  origenTipo: "Reparto" | "RegistroCoordinado";
  repartoLinea: {
    id: number;
    reparto: number;
    clase: "Presupuesto" | "Adicional" | "Partida";
    presupuesto: string | null;
    partida?: string | null;
    incluida: boolean;
    motivoExclusion: string | null;
  } | null;
  reparto: {
    id: number;
    ciclo: string;
    estado: RepartoEstado;
    revision: number;
  } | null;
  presupuesto: {
    id: string;
    nombre: string;
    fuente: string;
    destino: string | null;
    estado: string;
  } | null;
  gasto: string | null;
  anticipo: string | null;
  movimiento: {
    id: string;
    fecha: string;
    tipo: string;
    importe: string;
    origen: string;
    destino: string;
    referencia: string | null;
    anulado: boolean;
    revision: number;
  } | null;
  motivoCancelacion: string | null;
  revision: number;
  creado: string;
  actualizado: string;
  requiereRevision: boolean;
  motivosRevision: string[];
  hoy: string;
};

export type TransferenciaPendienteListaDTO = {
  items: TransferenciaPendienteDTO[];
  total: number;
  page: number;
};

export type TransferenciaPendienteImpactoDTO = {
  estado: TransferenciaPendienteEstado;
  revision: number;
  pendiente: number;
  fechaReal: string;
  cicloFechaReal: { id: string; inicio: string; fin: string | null } | null;
  condiciones: { requiereRevision: boolean; motivos: string[] };
  efectoPresupuestario: {
    aplica: boolean;
    presupuesto: string | null;
    fuente: string | null;
    destino: string | null;
    motivo: string;
  };
  movimiento: {
    tipo?: string;
    fecha?: string;
    importe?: string;
    origen?: string;
    destino?: string;
    concepto?: string;
    nota?: string;
    fingerprint?: string;
    duplicados?: { id: string; fecha: string; importe: string }[];
  } | null;
  duplicados: { id: string; fecha: string; importe: string }[];
  fingerprint: string;
  hoy: string;
  motivoNoDisponible?: string;
};

export type RepartoEstado = "Borrador" | "Generado" | "Completado";

// Server-decided completion blockers; the client only renders them.
export type RepartoMotivoNoCompletar = {
  code: string;
  lineas?: number[];
  pendientes?: number[];
};

// Line-level pending summary returned inside a reparto. The full ficha is
// merged separately from the pending list by `normalizeSeguimiento`.
export type RepartoLineaPendienteDTO = {
  id: number;
  estado: TransferenciaPendienteEstado;
  importe: string;
};

export type RepartoLineaDTO = {
  id: number;
  clase: "Presupuesto" | "Adicional" | "Partida";
  presupuesto: {
    id: string;
    nombre: string;
    fuente: string;
    destino: string | null;
    estado: string;
  } | null;
  // D′ origin entity (SPEC36 amendment C). Wire-only for now: the UI increment
  // (Issue #411) is the consumer that renders it.
  partida?: {
    id: string;
    nombre: string;
    estado: string;
    raiz?: boolean;
    fuente?: string | null;
    destino?: string | null;
  } | null;
  origen: SaldoResumenDTO | null;
  destino: SaldoResumenDTO | null;
  importe: string | null;
  fechaPrevista: string;
  concepto: string | null;
  nota: string | null;
  incluida: boolean;
  motivoExclusion: string | null;
  revision: number;
  pendiente: RepartoLineaPendienteDTO | null;
  avisos: string[];
  puedeGenerarse: boolean;
};

export type RepartoDTO = {
  id: number;
  ciclo: { id: string; inicio: string; fin: string | null };
  /** Active plan source declared by the reparto (SPEC36 amendment C). */
  fuentePlan?: "PlanCiclo" | "Dprima";
  estado: RepartoEstado;
  origenComun: SaldoResumenDTO | null;
  revision: number;
  lineas: RepartoLineaDTO[];
  creado: string;
  actualizado: string;
  cicloCerrado: boolean;
  puedeEditar: boolean;
  puedeAnadirLineas: boolean;
  puedeGenerar: boolean;
  puedeCompletar: boolean;
  motivosNoCompletar: RepartoMotivoNoCompletar[];
};

// Raw JSON shapes. `RepartoDTO` is the normalized view (cycle object and full
// ficha); these types reflect exactly what the API writes on the wire.
export type RepartoWireLineaDTO = Omit<RepartoLineaDTO, "pendiente"> & {
  pendiente: RepartoLineaPendienteDTO | null;
};

export type RepartoWireDTO = Omit<RepartoDTO, "ciclo" | "lineas"> & {
  ciclo: string;
  lineas: RepartoWireLineaDTO[];
};

export type RepartoPropuestaItemDTO = {
  presupuesto: {
    id: string;
    nombre: string;
    fuente: string;
    destino: string | null;
    estado: string;
  };
  delMes: string | null;
  ejecutado: string | null;
  pendiente: string | null;
  estado: string | null;
  motivo: string | null;
  sinPlanificar: boolean;
  elegible: boolean;
  motivoNoElegible: string | null;
  propuesta: {
    clase: "Presupuesto" | "Adicional";
    origen: string | null;
    destino: string | null;
    importe: string;
    fechaPrevista: string;
  } | null;
  mantenerEnOrigen: boolean;
  sinPropuesta: boolean;
  efectoAcumulado: string | null;
  restante: string | null;
  excedePendiente: boolean;
};

export type RepartoPropuestaDTO = {
  ciclo: { id: string; inicio: string; fin: string | null };
  revision: number;
  contextRevision: string;
  sinPlan: boolean;
  periodo: {
    inicio: string;
    fin: string | null;
    corte: string | null;
    motivo: string | null;
  };
  origenComunSugerido: SaldoResumenDTO | null;
  motivoOrigen: string | null;
  origenes: SaldoResumenDTO[];
  items: RepartoPropuestaItemDTO[];
};

export type RepartoSeguimientoDTO = {
  reparto: RepartoDTO;
  resumen: {
    lineas: number;
    incluidas: number;
    pendientes: number;
    confirmadas: number;
    canceladas: number;
    importePendiente: string | null;
    importeConfirmado: string | null;
  };
  lineas: RepartoLineaDTO[];
  puedeCompletar: boolean;
  motivosNoCompletar: RepartoMotivoNoCompletar[];
  avisos: {
    d8: { linea: number; presupuesto: string | null; motivo: string }[];
    d6: {
      pendientes: number;
      incluidosEnFoto: boolean;
      bloquea: boolean;
      motivo: string;
    };
    contexto: {
      linea: number;
      presupuesto: string | null;
      motivos: string[];
    }[];
    cicloCerrado: boolean;
  };
};

export type SharedCase = {
  referencia: {
    id: string;
    nombre: string;
    tipo: "Gasto compartido";
    estado: "Activa" | "Inactiva";
    revision: number;
    creado: string;
    actualizado: string;
  };
  ficha: { referencia: string; revision: number; creado: string; actualizado: string };
  contexto: string;
  resumen: {
    bruto: SharedMetric;
    recuperado: SharedMetric;
    neto: SharedMetric;
    costePropio: SharedMetric;
    pendienteTerceros: SharedMetric;
    exceso: SharedMetric;
    cobertura: { estado: SharedMetricState; motivo: string };
    estado: "Sin repartir" | "Reparto parcial" | "Cerrado" | "Revisar";
    estadoReparto: "Sin repartir" | "Reparto parcial" | "Cerrado";
    puedeCerrar: boolean;
    hayTercerosConCuota: boolean;
    alertas: {
      tipo: "revisar" | "cobertura" | "exceso";
      participanteId?: string;
      gastoId?: string;
      importe?: string;
      motivo: string;
    }[];
    fechas: {
      ultimoGasto: string | null;
      ultimaAportacion: string | null;
      repartoSoportado: string | null;
      exceso: string | null;
      motivos: Record<string, string>;
    };
    d5: string;
  };
  participantes: SharedParticipant[];
  gastos: SharedExpense[];
  partidas: SharedPartida[];
  aportaciones: SharedContribution[];
  historicos: SharedHistorical[];
  relacionados: {
    id: string;
    fecha: string;
    tipo: string;
    importe: string;
    origen: string;
    destino: string;
    anulado: boolean;
    computaEnBruto: false;
    motivo: string;
  }[];
  historia: {
    id: number;
    accion: string;
    anterior: Record<string, any> | null;
    posterior: Record<string, any>;
    motivo: string | null;
    instante: string;
    actor: string;
  }[];
};
