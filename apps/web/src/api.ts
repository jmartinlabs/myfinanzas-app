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
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
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
  if (value === null) return "Sin informar";
  const [whole, dec] = value.split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec} €`;
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
