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
    public data: Record<string, any> = {},
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
