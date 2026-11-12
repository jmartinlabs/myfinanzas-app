import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { canonicalJson } from "../canonical-json";

export type Ft1Saldo = {
  id: string;
  nombre: string;
  tipo: string;
  control: string;
  saldoApertura: string;
  fechaApertura: string;
  permiteSalidaExterior: boolean;
};

export type Ft1Category = {
  id: string;
  nombre: string;
  grupo: string | null;
  anual: string;
  mensual: string;
  referencia: boolean;
};

export type Ft1Subcategory = { id: string; nombre: string; padre: string };

export type Ft1Partida = {
  id: string;
  nombre: string;
  padre: string;
  deuda: string | null;
  presupuesto: string | null;
};

export type Ft1Movement = {
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
  anticipo?: {
    rol: "Adelanto" | "Devolución";
    origen: string;
    destino: string;
    evidencia: string;
    procedencia: string;
  };
};

export type Ft1Dataset = {
  format: 1;
  id: "FT-1";
  version: 1;
  anchor: string;
  environment: { name: "test"; public_origin: string };
  saldos: Ft1Saldo[];
  classifications: {
    categorias: Ft1Category[];
    subcategorias: Ft1Subcategory[];
    partidas: Ft1Partida[];
  };
  presupuesto: {
    id: string;
    nombre: string;
    fuente: string;
    destino: string;
  };
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
  ciclo: { id: string; inicio: string; saldoInicialComida: string };
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
  };
  movimientos: Ft1Movement[];
  inversion: {
    instrumento: {
      id: string;
      nombre: string;
      isin: string | null;
      isinEvidencia: string | null;
      divisaReferencia: string;
    };
    compra: {
      id: string;
      fecha: string;
      instrumento: string;
      saldoEfectivo: string;
      saldoInversion: string;
      cantidad: string;
      precio: string;
      divisa: string;
      importeEur: string;
      comisionEur: string;
      concepto: string;
      nota: string;
    };
  };
  expected: {
    ids: Record<string, string[]>;
    entity_counts: Record<string, number>;
  };
  coverage: { covered: string[]; partial: string[] };
};

const bytes = readFileSync(new URL("./ft1.json", import.meta.url));
const parsed = JSON.parse(bytes.toString("utf8")) as Ft1Dataset;
if (parsed.format !== 1 || parsed.id !== "FT-1" || parsed.version !== 1)
  throw new Error("Dataset FT-1 no reconocido.");
if (!Number.isFinite(Date.parse(parsed.anchor)))
  throw new Error("Ancla temporal de FT-1 inválida.");

export const dataset = parsed;
export const datasetFileSha256 = createHash("sha256")
  .update(bytes)
  .digest("hex");
export const datasetLogicalSha256 = createHash("sha256")
  .update(canonicalJson(parsed), "utf8")
  .digest("hex");
export const seedNow = Date.parse(parsed.anchor);
