import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export type DemoSaldo = {
  id: string;
  nombre: string;
  tipo: string;
  control: string;
  finalidad: string | null;
  liquidez: boolean;
  mostrarComoBolsa: boolean;
  permiteSalidaExterior: boolean;
  fechaApertura: string;
  saldoApertura: string;
  objetivo: string | null;
};

export type DemoMovement = {
  id: string;
  tipo: string;
  fecha: string;
  importe: string;
  saldo?: string;
  origen?: string;
  destino?: string;
  subtipo?: string;
  partida?: string;
  referencia?: string;
  concepto: string;
  nota: string;
  comida?: { etiqueta: string };
  compartido?: {
    participante: string;
    evidencia: string;
    procedencia: string;
  };
};

export type DemoDataset = {
  format: 1;
  id: "DEMO-1";
  version: 1;
  anchor: string;
  saldos: { updates: DemoSaldo[]; creates: DemoSaldo[] };
  classifications: {
    categorias: {
      id: string;
      nombre: string;
      grupo: string | null;
      anual: string;
      mensual: string;
      referencia: boolean;
    }[];
    subcategorias: { id: string; nombre: string; padre: string }[];
    partidas: {
      id: string;
      nombre: string;
      padre: string;
      deuda: string | null;
      presupuesto: string | null;
    }[];
  };
  presupuestos: {
    id: string;
    nombre: string;
    fuente: string;
    destino: string;
  }[];
  deuda: {
    id: string;
    nombre: string;
    inicioControl: string;
    capitalApertura: string;
    tipoDeuda: string;
    tin: string;
    tae: string;
    cuotaContractual: string;
    condiciones: string;
  };
  ciclos: { id: string; inicio: string; saldoInicialComida: string }[];
  referencias: {
    anticipo: {
      id: string;
      nombre: string;
      apertura: string;
      evidencia: string;
    };
    vehiculo: {
      id: string;
      nombre: string;
      tipo: "Vehículo";
      vehiculo: {
        matricula: string;
        proximaITV: string;
        cita: string | null;
      };
    };
    compartido: {
      id: string;
      nombre: string;
      participantes: {
        id: string;
        nombre: string;
        rol: "Titular" | "Tercero";
        partes: number;
      }[];
    };
  };
  movimientos: DemoMovement[];
  inversion: {
    instrumento: {
      id: string;
      nombre: string;
      isin: string | null;
      isinEvidencia: string | null;
      divisaReferencia: string;
    };
    compra: Record<string, unknown> & { id: string };
    venta: Record<string, unknown> & { id: string };
  };
  nomina: {
    paga: Record<string, unknown>;
    reparto: {
      movimiento: string;
      importe: string;
      evidencia: string;
    };
  };
  gastos_compartidos: {
    referencia: string;
    aportacion: {
      participante: string;
      evidencia: string;
      procedencia: string;
    };
  };
  planes_ciclo: {
    ciclo: string;
    motivo: string;
    cambios: {
      presupuesto: string;
      base: string;
      esencial: string;
      delMes: string;
    }[];
  }[];
  plan_anual: {
    ejercicio: number;
    lineas: {
      partida: string;
      cambios: { presupuesto: string; periodo: string; esencial: string };
    }[];
  };
  revision_comida: {
    fecha: string;
    concepto: string;
    importe: string;
    direccion: "Salida" | "Entrada";
    esDevolucion: boolean;
    clasificacion: string;
    evidenciaBancaria: string;
    cuentaOrigen: string;
  }[];
  dprima: {
    padre: string;
    saldo: string;
    mesInicial: string;
    mesFinal: string;
    saldoInicial: string;
    saldoEvidencia: string;
    copiarHijas: boolean;
  };
};

const bytes = readFileSync(new URL("./demo.json", import.meta.url));
const parsed = JSON.parse(bytes.toString("utf8")) as DemoDataset;
if (parsed.format !== 1 || parsed.id !== "DEMO-1" || parsed.version !== 1)
  throw new Error("Dataset DEMO no reconocido.");
if (!Number.isFinite(Date.parse(parsed.anchor)))
  throw new Error("Ancla temporal del dataset DEMO inválida.");

export const dataset = parsed;
export const datasetFileSha256 = createHash("sha256")
  .update(bytes)
  .digest("hex");
export const seedNow = Date.parse(parsed.anchor);
