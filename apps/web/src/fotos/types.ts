/**
 * Contratos de lectura y tipos de vista de `/fotos`.
 *
 * Solo tipos: no hay cálculos, acceso a red ni estado de React. Los DTO deben
 * reproducir exactamente los contratos publicados de E4.11/E2.6.
 */

export type Modo = "ciclo" | "Trimestre" | "Anio";

export type Vista = {
  modo: Modo;
  ciclo: string;
  version: string;
  ejercicio: string;
  trimestre: string;
  versionAgregado: string;
  periodoId: string;
};

export type Failure = {
  status: number;
  code: string;
  message: string;
  fields: Record<string, string>;
  requestId?: string;
};

export type FailureContext = "foto" | "periodo" | "contraste" | "comparacion";

export type EstadoFotoCiclo = "Disponible" | "SinFoto" | "PendienteReCierre";

export type VersionFotoDto = {
  version: number;
  creadoUtc: string;
  actor: string;
  motivo: string | null;
  fingerprint: string;
  appVersion: string;
  schemaVersion: number;
  esUltima: boolean;
  vigente: boolean;
  estado: "Disponible" | "PendienteReCierre";
};

export type FotoPersistida = {
  ciclo: string;
  version: number;
  creadoUtc: string;
  actor: string;
  motivo: string | null;
  fingerprint: string;
  appVersion: string;
  schemaVersion: number;
  ventana: {
    inicio: string;
    fin: string;
    saldoInicial: string | null;
    estadoTemporal: string;
  };
  estadoHechos: string;
  estadoPlan: string;
  hechos: unknown;
  plan: unknown;
  clasificacion: unknown;
  inversion: unknown;
  auxiliares: unknown;
  cobertura: unknown;
  backup: unknown;
  noDisponible: unknown;
};

export type FotoCicloDto = {
  origen: "Foto";
  estadoFoto: "Disponible" | "SinFoto";
  estado: EstadoFotoCiclo;
  motivo: string | null;
  seleccionAplicada: {
    version: number | null;
    porDefecto: boolean;
    regla: string;
  };
  vigente: boolean;
  reapertura: { estado: string };
  cierre: {
    ciclo: string;
    version: number;
    inicio: string;
    fin: string;
    saldoInicial: string;
  } | null;
  foto: FotoPersistida | null;
};

export type ComponentePeriodoDto = {
  ciclo: string;
  mesFinanciado: string;
  ventana: { inicio: string; fin: string | null } | null;
  versionFoto: number | null;
  fingerprint: string | null;
  estado: "Incluido" | "ExcluidoSinCierre" | "PendienteReCierre";
  estadoReapertura: string | null;
  motivo: string | null;
};

export type BloqueCoberturaDto = {
  ciclo: string;
  versionFoto: number | null;
  estado: string;
  motivos: string[];
};

export type CoberturaPeriodoDto = {
  estado: "Parcial" | "NoDisponible";
  motivos: string[];
  totalPeriodo: null;
  bloques: BloqueCoberturaDto[];
};

export type ValorCicloDto = {
  ciclo: string;
  versionFoto: number;
  fingerprint: string;
  ventana: {
    inicio: string;
    fin: string;
    saldoInicial: string | null;
    estadoTemporal: string;
  };
  estadoHechos: string;
  estadoPlan: string;
  hechos: unknown;
  plan: unknown;
  clasificacion: unknown;
  inversion: unknown;
  auxiliares: unknown;
  cobertura: unknown;
  noDisponible: unknown;
};

export type NoDisponiblePeriodoDto = {
  ciclo: string;
  versionFoto: number;
  bloque: string;
  estado: string;
  motivo: string | null;
};

export type FotoPeriodoDto = {
  origen: "Foto";
  id: number;
  tipo: "Trimestre" | "Anio";
  periodo: {
    ejercicio: number;
    trimestre: number | null;
    inicio: string;
    fin: string;
  };
  seleccionAplicada: {
    regla: string;
    reglaPeriodo: string;
    porDefecto: boolean;
    solicitada: Record<string, number>;
    seleccion: Record<string, number | null>;
    porCiclo: unknown[];
  };
  seleccionVersion: {
    version: string;
    porDefecto: boolean;
    regla: string;
  };
  identidad: {
    versionAgregado: string;
    fechaUtc: string;
    fingerprint: string;
    versionApp: string;
    versionEsquema: number;
    actor: string;
    motivo: string | null;
  };
  composicion: ComponentePeriodoDto[];
  cobertura: CoberturaPeriodoDto;
  valores: {
    totalPeriodo: null;
    motivoTotal: string;
    porCiclo: ValorCicloDto[];
  };
  noDisponible: NoDisponiblePeriodoDto[];
};

export type ContrasteMetricaDto = {
  valor: string | null;
  subtotal: string | null;
  estado: string;
  motivo: string;
  fuente: string;
  ids: string[];
  cobertura: string;
  origen: "CalculoVivo";
  noEsHistorico: true;
};

export type ContrasteDto = {
  origen: "CalculoVivo";
  motor: string;
  etiqueta: string;
  ciclo: string;
  revision: string;
  corte: string | null;
  consulta: string;
  metricas: Record<string, ContrasteMetricaDto>;
  cobertura: {
    estado: string;
    verificada: boolean;
    motivo: string;
    motivos: string[];
    total: null;
    certificada: false;
    coberturaBancaria: { verificada: boolean; motivo: string };
    bloques: { clave: string; estado: string; motivo: string }[];
  };
  noDisponible: { clave: string; fuente: string; motivo: string }[];
  noEsHistorico: true;
  noSustituyeFoto: true;
  soloLectura: true;
};

export type CicloResumen = {
  id: string;
  inicio: string;
  mesFinanciado: string;
};

export type PaginaCiclos = { ciclos: CicloResumen[]; total: number };

export type CoverageRow = { bloque: string; estado: string; motivo: string };

export type NoDisponibleRow = {
  bloque: string;
  estado: string;
  motivo: string | null;
  ciclo?: string;
  version?: number;
};
