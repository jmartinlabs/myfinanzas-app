import type { Database } from "bun:sqlite";
import { cycleContext, cycleMaster, type Cycle } from "./ciclos";
import { monthlyFlow, type Metric } from "./flujo-mensual";
import { annualYear, getAnnualPlan, type AnnualProvider } from "./plan-anual";
import { e43Corte } from "./e43";
import { getDeudaCompleta, listDeudasCompletas } from "./deuda-completa";
import { decimal } from "./saldos";
import { fingerprint } from "./movement-ledger";
import { Problem } from "./problem";

/**
 * E4.7 — resumen anual de solo lectura.
 *
 * Compone respuestas de E2.4, E2.6, E3.6, E4.3 y E4.4 para un ejercicio
 * natural. No calcula plan, flujo, archivo, márgenes ni patrimonio; no crea
 * tablas, snapshots, fotos ni cierres. `null` es `No disponible` y nunca se
 * normaliza a `0.00`; un `0` solo aparece como `Cero verificado` cuando el
 * propietario lo publica.
 *
 * El DTO no tiene `totalAnual` ni un agregado monetario anual. Los Ciclos se
 * listan con sus fechas porque un Ciclo puede cruzar diciembre/enero.
 */

export type EstadoMetrica =
  | "Verificado"
  | "Cero verificado"
  | "Parcial"
  | "No disponible"
  | "No aplica"
  | "Sin datos";

export type EstadoCobertura =
  | "Completa"
  | "Parcial"
  | "NoAcreditada"
  | "NoDisponible"
  | "Solapada";

export type EstadoTotal = "Verificado" | "NoVerificable" | "NoDisponible";

export type Fuente = {
  motor: string;
  ids: string[];
  revision: string | null;
  intervalo?: { desde: string | null; hasta: string | null };
};

export type Cobertura = {
  estado: EstadoMetrica | EstadoCobertura;
  fuente: string;
  detalle: string;
  incluidos: number | null;
  excluidos: number | null;
  motivos: string[];
};

export type ContextoMetrica =
  | { tipo: "ciclo"; cicloId: string; corte: string | null }
  | { tipo: "ejercicio"; ejercicio: number; corte: string | null }
  | { tipo: "corte"; fecha: string | null; fuente: string };

export type Enlace = { etiqueta: string; ruta: string; ids: string[] };

export type Metrica = {
  clave: string;
  etiqueta: string;
  clase: "plan" | "real" | "archivo" | "informativo" | "patrimonio";
  valor: string | null;
  subtotal: string | null;
  estado: EstadoMetrica;
  unidad: "EUR" | "meses" | "conteo";
  motivo: string;
  cobertura: Cobertura;
  fuente: Fuente;
  contexto: ContextoMetrica;
  alcance: "Ciclo" | "Ejercicio" | "HastaCorte" | "No aplica";
  enlace: Enlace | null;
};

export type CicloRef = {
  cicloId: string;
  inicio: string;
  fin: string | null;
  corte: string | null;
  ejercicios: number[];
};

export type CarrilPlanItem = {
  partidaId: string;
  presupuesto: string | null;
  esencial: "Sí" | "No" | "Pendiente" | null;
  ejecutado: Metrica;
  diferencia: Metrica | null;
  cobertura: Cobertura;
};

export type CarrilPlan = {
  estado: EstadoMetrica;
  motivo: string;
  items: CarrilPlanItem[];
  cobertura: Cobertura;
  fuente: Fuente;
  enlace: Enlace;
};

export type CarrilPrevision = {
  estado: EstadoMetrica;
  motivo: string;
  simulacion: Metrica | null;
  cobertura: Cobertura;
  enlace: Enlace;
};

export type AjusteCompartidos = {
  gNeto: string | null;
  sAjustado: string | null;
  estado: EstadoMetrica;
  motivo: string;
  cobertura: Cobertura;
  fuente: Fuente;
};

export type CicloRealidad = CicloRef & {
  ingresos: Metrica;
  gasto: Metrica;
  extraordinaria: Metrica;
  nomina: Metrica;
  operativo: Metrica;
  margenReal: Metrica;
  margenEstructural: Metrica;
  ajusteCompartidos: AjusteCompartidos;
};

export type CarrilRealidad = {
  estado: EstadoMetrica;
  motivo: string;
  ciclos: CicloRealidad[];
  agregadoAnual: { estado: "No aplica"; motivo: string };
  cobertura: Cobertura;
  enlace: Enlace;
};

export type ArchivoItem = {
  partidaId: string | null;
  archivo: string | null;
  detalleControl: string | null;
  detallePrecontrol: string | null;
  total: string | null;
  alcanceTotal: "Anual" | "HastaCorte";
  subtotalConocido: string | null;
  estadoCobertura: EstadoCobertura;
  estadoTotal: EstadoTotal;
  cobertura: Cobertura;
  corte: string | null;
  fuentes: Fuente[];
  procedencia: string[];
  motivoCodigo: string;
  motivo: string;
  sinClasificar: { importe: string | null; motivo: string }[];
};

export type CarrilArchivo = {
  estado: EstadoMetrica;
  motivo: string;
  gate: "BLOCKED";
  items: ArchivoItem[];
  cobertura: Cobertura;
  enlace: Enlace;
};

export type MargenPublicado = {
  clave: "margenEstructural" | "margenReal";
  etiqueta: string;
  clase: "plan";
  valor: string | null;
  subtotal: string | null;
  estado: EstadoMetrica;
  motivo: string;
  cobertura: Cobertura;
  fuente: Fuente;
  cicloId: string;
  corte: string | null;
  alcance: "Ciclo";
};

export type Margenes = {
  estado: "Parcial" | "No disponible";
  etiqueta: "Márgenes del plan";
  publicados: MargenPublicado[];
  noDefinidos: {
    clave: "margenMedio" | "margenRealPuntual";
    etiqueta: string;
    estado: "No disponible";
    motivo: "Definición pendiente DT8";
  }[];
  nota: "Sin agregación anual ni margen medio; AC3 parcial";
};

export type Patrimonio = {
  incluido: true;
  corte: { fecha: string | null; estado: EstadoMetrica; motivo: string };
  valoracion: {
    valorEur: string | null;
    estado: EstadoMetrica;
    coberturaValoracion: string;
    resultadoEur: string | null;
    coberturaResultado: string;
    corte: string | null;
    fuente: Fuente;
    enlace: Enlace;
  };
  deuda: {
    total: string | null;
    subtotal: string | null;
    estado: EstadoMetrica;
    cobertura: Cobertura;
    corte: string | null;
    fuente: Fuente;
    enlace: Enlace;
  };
  nota: "Bloques separados al mismo corte; sin patrimonio neto, sin suma de valoración + deuda + flujo";
};

export type ResumenAnual = {
  contexto: {
    consulta: string;
    corte: {
      fecha: string | null;
      fuente: string;
      estado: "disponible" | "parcial" | "no_disponible";
    };
    calculo: "Vivo" | "Foto";
    fotoId: string | null;
    etiqueta: "Cálculo vivo, sin foto" | "Foto";
    revision: string;
  };
  ejercicio: {
    natural: number;
    desde: string;
    hasta: string;
    ciclos: CicloRef[];
  };
  filtros: {
    ejercicio: number;
    ciclo: string | null;
    partida: string | null;
    cobertura: EstadoCobertura | null;
  };
  cobertura: {
    estado: EstadoMetrica | EstadoCobertura;
    fuentes: Fuente[];
    motivos: string[];
    porCarril: {
      plan: Cobertura;
      prevision: Cobertura;
      realidad: Cobertura;
      archivo: Cobertura;
    };
  };
  carriles: {
    plan: CarrilPlan;
    prevision: CarrilPrevision;
    realidad: CarrilRealidad;
    archivo: CarrilArchivo;
  };
  margenes: Margenes;
  patrimonio: Patrimonio | null;
  enlaces: Enlace[];
  pendientesDelModelo: string[];
};

export type ResumenAnualOptions = {
  annualProvider?: AnnualProvider;
};

const MOTOR = {
  ciclos: "E1.3 cycleContext/cycleMaster",
  plan: "E2.4 annualExecution",
  prevision: "E2.5 previsión de nómina",
  flujo: "E2.6 monthlyFlow",
  ajuste: "E3.6 flujoAjustado (E2.6)",
  archivo: "E4.5 histórico/precontrol",
  valoracion: "E4.3 e43Corte",
  deuda: "E4.4 listDeudasCompletas",
} as const;

const COBERTURAS: EstadoCobertura[] = [
  "Completa",
  "Parcial",
  "NoAcreditada",
  "NoDisponible",
  "Solapada",
];

const errorMessage = (error: unknown) =>
  error instanceof Problem
    ? error.message
    : "error de fuente no verificable";

function normalizarEstado(value: string): EstadoMetrica {
  if (
    value === "Verificado" ||
    value === "Cero verificado" ||
    value === "Parcial" ||
    value === "No disponible" ||
    value === "No aplica" ||
    value === "Sin datos"
  )
    return value;
  if (/^Cero verificad/i.test(value)) return "Cero verificado";
  if (/^Parcial/i.test(value)) return "Parcial";
  if (/^No disponible/i.test(value)) return "No disponible";
  if (/^No aplica/i.test(value)) return "No aplica";
  if (/^Sin datos/i.test(value)) return "Sin datos";
  if (/^Verificad/i.test(value)) return "Verificado";
  return "No disponible";
}

function coberturaDe(estado: EstadoMetrica): EstadoMetrica | EstadoCobertura {
  if (estado === "Verificado" || estado === "Cero verificado")
    return "Completa";
  if (estado === "Parcial") return "Parcial";
  if (estado === "No aplica") return "No aplica";
  if (estado === "Sin datos") return "Sin datos";
  return "NoDisponible";
}

function cobertura(args: {
  estado: EstadoMetrica | EstadoCobertura;
  fuente: string;
  detalle: string;
  incluidos?: number | null;
  excluidos?: number | null;
  motivos?: string[];
}): Cobertura {
  return {
    estado: args.estado,
    fuente: args.fuente,
    detalle: args.detalle,
    incluidos: args.incluidos ?? null,
    excluidos: args.excluidos ?? null,
    motivos: args.motivos ?? [],
  };
}

function ndMetric(args: {
  clave: string;
  etiqueta: string;
  clase: Metrica["clase"];
  motivo: string;
  motor: string;
  contexto: ContextoMetrica;
  enlace?: Enlace | null;
  unidad?: Metrica["unidad"];
  alcance?: Metrica["alcance"];
}): Metrica {
  const estado: EstadoMetrica = "No disponible";
  return {
    clave: args.clave,
    etiqueta: args.etiqueta,
    clase: args.clase,
    valor: null,
    subtotal: null,
    estado,
    unidad: args.unidad ?? "EUR",
    motivo: args.motivo,
    cobertura: cobertura({
      estado: "NoDisponible",
      fuente: args.motor,
      detalle: args.motivo,
      motivos: [args.motivo],
    }),
    fuente: { motor: args.motor, ids: [], revision: null },
    contexto: args.contexto,
    alcance: args.alcance ?? "No aplica",
    enlace: args.enlace ?? null,
  };
}

function centsOf(value: string | null): bigint | null {
  if (value === null) return null;
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace("-", "").split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

function sumCents(values: (string | null)[]): bigint | null {
  let total = 0n;
  for (const value of values) {
    const cents = centsOf(value);
    if (cents === null) return null;
    total += cents;
  }
  return total;
}

function parseFiltros(params: URLSearchParams) {
  const ejercicio = annualYear(params.get("ejercicio") ?? "");
  const rawCiclo = params.get("ciclo")?.trim() ?? "";
  if (rawCiclo !== "" && !/^\d+$/.test(rawCiclo))
    throw new Problem(422, "VALIDATION", "Ciclo inválido.");
  const rawPartida = params.get("partida")?.trim() ?? "";
  if (
    rawPartida !== "" &&
    (rawPartida.length > 64 || /[\u0000-\u001f\u007f]/.test(rawPartida))
  )
    throw new Problem(422, "VALIDATION", "Partida inválida.");
  const rawCobertura = params.get("cobertura")?.trim() ?? "";
  if (
    rawCobertura !== "" &&
    !COBERTURAS.includes(rawCobertura as EstadoCobertura)
  )
    throw new Problem(422, "VALIDATION", "Cobertura inválida.");
  return {
    ejercicio,
    ciclo: rawCiclo === "" ? null : rawCiclo,
    partida: rawPartida === "" ? null : rawPartida,
    cobertura:
      rawCobertura === "" ? null : (rawCobertura as EstadoCobertura),
  };
}

function cicloRef(cycle: Cycle): CicloRef {
  const startYear = Number(cycle.inicio.slice(0, 4));
  const end = cycle.fin ?? cycle.corte ?? cycle.inicio;
  const endYear = Number(end.slice(0, 4));
  const ejercicios: number[] = [];
  if (Number.isSafeInteger(startYear) && Number.isSafeInteger(endYear))
    for (let year = startYear; year <= endYear; year += 1)
      ejercicios.push(year);
  return {
    cicloId: cycle.id,
    inicio: cycle.inicio,
    fin: cycle.fin,
    corte: cycle.corte,
    ejercicios,
  };
}

function tocaEjercicio(cycle: Cycle, year: number) {
  const start = `${String(year).padStart(4, "0")}-01-01`;
  const end = `${String(year).padStart(4, "0")}-12-31`;
  // Un Ciclo abierto (fin null) solo llega hasta su corte/referencia. Sin
  // corte verificable no se extiende a años futuros: solo toca su año civil.
  const cycleEnd = cycle.fin ?? cycle.corte ?? cycle.inicio;
  return cycle.inicio <= end && cycleEnd >= start;
}

function metricFromFlow(
  cycle: Cycle,
  flow: ReturnType<typeof monthlyFlow>,
  clave: string,
  etiqueta: string,
  clase: Metrica["clase"],
): Metrica {
  const source: Metric = flow.metrics[clave];
  const estado = normalizarEstado(source.estado);
  return {
    clave,
    etiqueta,
    clase,
    valor: source.valor,
    subtotal: source.subtotal,
    estado,
    unidad: "EUR",
    motivo: source.motivo,
    cobertura: cobertura({
      estado: coberturaDe(estado),
      fuente: source.fuente,
      detalle: source.cobertura,
      incluidos: source.ids.length,
      motivos:
        estado === "No disponible" || estado === "Parcial"
          ? [source.motivo]
          : [],
    }),
    fuente: {
      motor: MOTOR.flujo,
      ids: source.ids,
      revision: flow.revision,
      intervalo: { desde: cycle.inicio, hasta: flow.corteEfectivo },
    },
    contexto: {
      tipo: "ciclo",
      cicloId: cycle.id,
      corte: flow.corteEfectivo,
    },
    alcance: "Ciclo",
    enlace: {
      etiqueta: "Ver flujo mensual",
      ruta: `/flujo-mensual?ciclo=${cycle.id}`,
      ids: [],
    },
  };
}

function cicloVacio(
  cycle: Cycle,
  motivo: string,
  clave: string,
  etiqueta: string,
  clase: Metrica["clase"],
): Metrica {
  return ndMetric({
    clave,
    etiqueta,
    clase,
    motivo,
    motor: MOTOR.flujo,
    contexto: {
      tipo: "ciclo",
      cicloId: cycle.id,
      corte: cycle.corte,
    },
    enlace: {
      etiqueta: "Ver flujo mensual",
      ruta: `/flujo-mensual?ciclo=${cycle.id}`,
      ids: [],
    },
    alcance: "Ciclo",
  });
}

function realidadCiclo(db: Database, cycle: Cycle, now: number): CicloRealidad {
  const ref = cicloRef(cycle);
  let flow: ReturnType<typeof monthlyFlow>;
  try {
    flow = monthlyFlow(db, cycle.id, now);
  } catch (error) {
    const motivo = `E2.6 no disponible para el ciclo ${cycle.id}: ${errorMessage(error)}.`;
    const metrica = (clave: string, etiqueta: string, clase: Metrica["clase"]) =>
      cicloVacio(cycle, motivo, clave, etiqueta, clase);
    return {
      ...ref,
      ingresos: metrica("ingresos", "Ingresos", "real"),
      gasto: metrica("gasto", "Gasto bruto", "real"),
      extraordinaria: metrica(
        "extraordinaria",
        "Amortización extraordinaria",
        "real",
      ),
      nomina: metrica("nomina", "Nómina cobrada", "real"),
      operativo: metrica(
        "operativo",
        "Saldo operativo bruto observado",
        "real",
      ),
      margenReal: metrica(
        "margenReal",
        "Margen frente a nómina real",
        "plan",
      ),
      margenEstructural: metrica(
        "margenEstructural",
        "Margen estructural",
        "plan",
      ),
      ajusteCompartidos: {
        gNeto: null,
        sAjustado: null,
        estado: "No disponible",
        motivo,
        cobertura: cobertura({
          estado: "NoDisponible",
          fuente: MOTOR.ajuste,
          detalle: motivo,
          motivos: [motivo],
        }),
        fuente: { motor: MOTOR.ajuste, ids: [], revision: null },
      },
    };
  }
  const ajuste = flow.ajusteCompartidos;
  const ajusteEstado = normalizarEstado(ajuste.cobertura);
  return {
    ...ref,
    ingresos: metricFromFlow(cycle, flow, "ingresos", "Ingresos", "real"),
    gasto: metricFromFlow(cycle, flow, "gasto", "Gasto bruto", "real"),
    extraordinaria: metricFromFlow(
      cycle,
      flow,
      "extraordinaria",
      "Amortización extraordinaria",
      "real",
    ),
    nomina: metricFromFlow(cycle, flow, "nomina", "Nómina cobrada", "real"),
    operativo: metricFromFlow(
      cycle,
      flow,
      "operativo",
      "Saldo operativo bruto observado",
      "real",
    ),
    margenReal: metricFromFlow(
      cycle,
      flow,
      "margenReal",
      "Margen frente a nómina real",
      "plan",
    ),
    margenEstructural: metricFromFlow(
      cycle,
      flow,
      "margenEstructural",
      "Margen estructural",
      "plan",
    ),
    ajusteCompartidos: {
      gNeto: ajuste.gastoNeto.importe,
      sAjustado: ajuste.resultadoAjustado.importe,
      estado: ajusteEstado,
      motivo: ajuste.motivo ?? "Ajuste compartido sin motivo publicado.",
      cobertura: cobertura({
        estado: coberturaDe(ajusteEstado),
        fuente: MOTOR.ajuste,
        detalle: ajuste.formula,
        incluidos: ajuste.recuperado.gastos.length,
        motivos:
          ajusteEstado === "No disponible" || ajusteEstado === "Parcial"
            ? [ajuste.motivo ?? "Ajuste compartido sin motivo publicado."]
            : [],
      }),
      fuente: {
        motor: MOTOR.ajuste,
        ids: ajuste.recuperado.gastos.map((gasto) => gasto.fuenteId),
        revision: ajuste.revisionAjuste,
        intervalo: { desde: cycle.inicio, hasta: flow.corteEfectivo },
      },
    },
  };
}

function coberturaRealidad(ciclos: CicloRealidad[]): Cobertura {
  const errores = ciclos.filter((ciclo) =>
    ciclo.ingresos.motivo.startsWith("E2.6 no disponible para el ciclo"),
  ).length;
  const motivos = [
    "E2.6 publica métricas por Ciclo; no hay agregado anual ni suma de Ciclos.",
  ];
  if (errores > 0)
    motivos.push(`${errores} Ciclo(s) sin lectura de E2.6.`);
  return cobertura({
    estado: "Parcial",
    fuente: MOTOR.flujo,
    detalle:
      "Cobertura histórica del intervalo no acreditada; los importes son subtotales parciales.",
    incluidos: ciclos.length - errores,
    excluidos: errores,
    motivos,
  });
}

function planItemCoverage(
  item: {
    ejecutado: string | null;
    cobertura: string;
    corte: string | null;
  },
  year: number,
): EstadoCobertura {
  if (item.ejecutado === null) return "Parcial";
  if (item.cobertura === "Verificable al corte")
    return item.corte === `${String(year).padStart(4, "0")}-12-31`
      ? "Completa"
      : "Parcial";
  return "Parcial";
}

function planSection(
  db: Database,
  ejercicio: number,
  now: number,
  filtros: ReturnType<typeof parseFiltros>,
  options: ResumenAnualOptions,
): CarrilPlan {
  const enlace: Enlace = {
    etiqueta: "Ver plan anual",
    ruta: "/plan-anual",
    ids: [],
  };
  try {
    const plan = getAnnualPlan(db, ejercicio, now, options.annualProvider);
    const raw = [...plan.items, ...plan.sinLinea];
    const items = raw
      .map((item): CarrilPlanItem => {
        const linea = item.linea;
        const ejecutadoEstado: EstadoMetrica =
          item.ejecutado !== null
            ? item.ejecutado === "0.00"
              ? "Cero verificado"
              : "Verificado"
            : item.subtotalRegistrado !== null
              ? "Parcial"
              : "No disponible";
        const motivoEjecutado = item.motivo
          ? `Ejecutado parcial: ${item.motivo}`
          : "Ejecutado verificado hasta el corte; no es total anual.";
        const itemCoberturaEstado = planItemCoverage(item, ejercicio);
        const yearEnd = `${String(ejercicio).padStart(4, "0")}-12-31`;
        const itemCobertura = cobertura({
          estado: itemCoberturaEstado,
          fuente: MOTOR.plan,
          detalle:
            itemCoberturaEstado === "Completa"
              ? `E2.4: Verificable al corte ${item.corte}; año completo.`
              : `E2.4: ${item.cobertura}${
                  item.corte ? ` hasta ${item.corte}` : " sin corte verificable"
                }.`,
          incluidos: item.hechos.length,
          motivos:
            itemCoberturaEstado === "Completa"
              ? []
              : item.motivo
                ? [item.motivo]
                : [
                    "Cobertura anual no acreditada; el Ejecutado no es total anual.",
                  ],
        });
        const ejecutado: Metrica = {
          clave: "ejecutado",
          etiqueta: "Ejecutado",
          clase: "plan",
          valor: item.ejecutado,
          subtotal: item.subtotalRegistrado,
          estado: ejecutadoEstado,
          unidad: "EUR",
          motivo: motivoEjecutado,
          cobertura: itemCobertura,
          fuente: {
            motor: MOTOR.plan,
            ids: item.hechos.map((hecho) => hecho.id),
            revision: plan.contextRevision,
            intervalo: {
              desde: `${String(ejercicio).padStart(4, "0")}-01-01`,
              hasta: item.corte,
            },
          },
          contexto: {
            tipo: "ejercicio",
            ejercicio,
            corte: item.corte,
          },
          alcance:
            item.corte === yearEnd
              ? "Ejercicio"
              : item.corte
                ? "HastaCorte"
                : "Ejercicio",
          enlace,
        };
        const diferencia =
          linea === null || linea.presupuesto === null
            ? null
            : {
                clave: "diferencia",
                etiqueta: "Diferencia",
                clase: "plan" as const,
                valor: item.diferencia,
                subtotal: null,
                estado:
                  item.diferencia === null
                    ? ("No disponible" as const)
                    : item.diferencia === "0.00"
                      ? ("Cero verificado" as const)
                      : ("Verificado" as const),
                unidad: "EUR" as const,
                motivo:
                  item.diferencia === null
                    ? item.motivo ??
                      "Diferencia no verificable sin un Ejecutado completo."
                    : "Diferencia = Presupuesto − Ejecutado verificado.",
                cobertura: itemCobertura,
                fuente: ejecutado.fuente,
                contexto: ejecutado.contexto,
                alcance: ejecutado.alcance,
                enlace,
              };
        return {
          partidaId: item.partida.id,
          presupuesto: linea?.presupuesto ?? null,
          esencial: linea?.esencial ?? null,
          ejecutado,
          diferencia,
          cobertura: itemCobertura,
        };
      })
      .filter(
        (item) =>
          (filtros.partida === null ||
            item.partidaId === filtros.partida) &&
          (filtros.cobertura === null ||
            item.cobertura.estado === filtros.cobertura),
      );
    const fuente: Fuente = {
      motor: MOTOR.plan,
      ids: items.map((item) => item.partidaId),
      revision: plan.contextRevision,
      intervalo: {
        desde: `${String(ejercicio).padStart(4, "0")}-01-01`,
        hasta: `${String(ejercicio).padStart(4, "0")}-12-31`,
      },
    };
    const completa =
      items.length > 0 &&
      items.every((item) => item.cobertura.estado === "Completa");
    const estado: EstadoMetrica =
      items.length === 0 ? "Sin datos" : completa ? "Verificado" : "Parcial";
    return {
      estado,
      motivo:
        items.length === 0
          ? "Sin líneas de plan ni ejecución para el filtro seleccionado."
          : completa
            ? "Plan y Ejecutado se leen de E2.4 con cobertura completa del año; no se suman Partidas."
            : "Plan y Ejecutado se leen de E2.4; no se suman Partidas ni se crea un total anual.",
      items,
      cobertura: cobertura({
        estado:
          items.length === 0 ? "Sin datos" : completa ? "Completa" : "Parcial",
        fuente: MOTOR.plan,
        detalle: completa
          ? "Cada Partida conserva la cobertura completa de E2.4 para el año natural."
          : "Cada Partida conserva la cobertura de E2.4; la cobertura anual no está acreditada.",
        incluidos: items.length,
        motivos:
          items.length === 0
            ? ["Sin líneas de plan ni ejecución para el filtro."]
            : completa
              ? []
              : [
                  "El Ejecutado se verifica, si procede, solo hasta el corte.",
                ],
      }),
      fuente,
      enlace,
    };
  } catch (error) {
    const motivo = `E2.4 no disponible: ${errorMessage(error)}.`;
    return {
      estado: "No disponible",
      motivo,
      items: [],
      cobertura: cobertura({
        estado: "NoDisponible",
        fuente: MOTOR.plan,
        detalle: motivo,
        motivos: [motivo],
      }),
      fuente: { motor: MOTOR.plan, ids: [], revision: null },
      enlace,
    };
  }
}

function previsionSection(): CarrilPrevision {
  const motivo =
    "E2.5 solo simula por paga/mes y no publica un contrato anual consumible para el ejercicio; no se suma como realidad.";
  return {
    estado: "No disponible",
    motivo,
    simulacion: null,
    cobertura: cobertura({
      estado: "NoDisponible",
      fuente: MOTOR.prevision,
      detalle: motivo,
      motivos: [motivo],
    }),
    enlace: { etiqueta: "Ver Nómina", ruta: "/nomina", ids: [] },
  };
}

function archivoSection(): CarrilArchivo {
  const motivo =
    "E4.5 no desarrollado y DT7 sin universo acreditado: el archivo histórico no está disponible. No se simula ni se suma al flujo.";
  return {
    estado: "No disponible",
    motivo,
    gate: "BLOCKED",
    items: [],
    cobertura: cobertura({
      estado: "NoAcreditada",
      fuente: MOTOR.archivo,
      detalle: motivo,
      motivos: [motivo],
    }),
    enlace: { etiqueta: "Ver movimientos", ruta: "/movimientos", ids: [] },
  };
}

function margenesSection(ciclos: CicloRealidad[]): Margenes {
  const publicados: MargenPublicado[] = [];
  for (const ciclo of ciclos)
    for (const [clave, etiqueta] of [
      ["margenEstructural", "Margen estructural"],
      ["margenReal", "Margen frente a nómina real"],
    ] as const) {
      const metrica = ciclo[clave];
      publicados.push({
        clave,
        etiqueta,
        clase: "plan",
        valor: metrica.valor,
        subtotal: metrica.subtotal,
        estado: metrica.estado,
        motivo: metrica.motivo,
        cobertura: metrica.cobertura,
        fuente: metrica.fuente,
        cicloId: ciclo.cicloId,
        corte:
          metrica.contexto.tipo === "ciclo" ? metrica.contexto.corte : null,
        alcance: "Ciclo",
      });
    }
  const conValor = publicados.some(
    (margen) => margen.valor !== null || margen.subtotal !== null,
  );
  return {
    estado:
      publicados.length === 0 || !conValor ? "No disponible" : "Parcial",
    etiqueta: "Márgenes del plan",
    publicados,
    noDefinidos: [
      {
        clave: "margenMedio",
        etiqueta: "Margen medio",
        estado: "No disponible",
        motivo: "Definición pendiente DT8",
      },
      {
        clave: "margenRealPuntual",
        etiqueta: "Margen real puntual",
        estado: "No disponible",
        motivo: "Definición pendiente DT8",
      },
    ],
    nota: "Sin agregación anual ni margen medio; AC3 parcial",
  };
}

function activeNonHypothecaryDebts(db: Database) {
  const items: ReturnType<typeof listDeudasCompletas>["items"] = [];
  let page = 1;
  let total = 0;
  do {
    const result = listDeudasCompletas(
      db,
      new URLSearchParams({
        estado: "Activa",
        tipoDeuda: "No hipotecaria",
        page: String(page),
      }),
    );
    items.push(...result.items);
    total = result.total;
    if (result.items.length === 0) break;
    page += 1;
  } while (items.length < total && page <= 100000);
  return items;
}

function valoracionEstado(cobertura: string): EstadoMetrica {
  if (/^(Verificada|Completa)$/i.test(cobertura)) return "Verificado";
  if (/^Parcial/i.test(cobertura)) return "Parcial";
  if (/^No aplica$/i.test(cobertura)) return "No aplica";
  return "No disponible";
}

function patrimonioSection(
  db: Database,
  corte: string | null,
  now: number,
): Patrimonio {
  const nota =
    "Bloques separados al mismo corte; sin patrimonio neto, sin suma de valoración + deuda + flujo";
  const valoracionBase: Patrimonio["valoracion"] = {
    valorEur: null,
    estado: "No disponible",
    coberturaValoracion: "No disponible",
    resultadoEur: null,
    coberturaResultado: "No disponible",
    corte: null,
    fuente: { motor: MOTOR.valoracion, ids: [], revision: null },
    enlace: { etiqueta: "Ver inversiones", ruta: "/inversiones", ids: [] },
  };
  const deudaBase: Patrimonio["deuda"] = {
    total: null,
    subtotal: null,
    estado: "No disponible",
    cobertura: cobertura({
      estado: "NoDisponible",
      fuente: MOTOR.deuda,
      detalle: "Sin corte verificable común.",
    }),
    corte: null,
    fuente: { motor: MOTOR.deuda, ids: [], revision: null },
    enlace: { etiqueta: "Ver deudas", ruta: "/deudas", ids: [] },
  };
  if (corte === null)
    return {
      incluido: true,
      corte: {
        fecha: null,
        estado: "No disponible",
        motivo:
          "Sin corte verificable común para E4.3 y E4.4; no se fabrica una cifra patrimonial.",
      },
      valoracion: { ...valoracionBase },
      deuda: { ...deudaBase },
      nota,
    };

  let valoracion = { ...valoracionBase };
  try {
    const source = e43Corte(db, corte);
    const valorEstado = valoracionEstado(source.agregado.coberturaValoracion);
    const resultadoEstado = valoracionEstado(
      source.agregado.coberturaResultado,
    );
    valoracion = {
      valorEur: source.agregado.valorEur,
      estado: valorEstado,
      coberturaValoracion: source.agregado.coberturaValoracion,
      resultadoEur:
        resultadoEstado === "No disponible"
          ? null
          : source.agregado.resultadoEur,
      coberturaResultado: source.agregado.coberturaResultado,
      corte,
      fuente: {
        motor: MOTOR.valoracion,
        ids: source.posiciones.map((posicion) => posicion.instrumento.id),
        revision: null,
        intervalo: { desde: null, hasta: corte },
      },
      enlace: {
        etiqueta: "Ver inversiones",
        ruta: "/inversiones",
        ids: [],
      },
    };
  } catch (error) {
    valoracion.estado = "No disponible";
    valoracion.corte = corte;
    valoracion.fuente = {
      ...valoracion.fuente,
      motor: `${MOTOR.valoracion}: ${errorMessage(error)}`,
    };
  }

  let deuda = { ...deudaBase, corte };
  try {
    // Q7 de presentación: solo deuda no hipotecaria activa. El capital de cada
    // ficha se lee de E4.4 en el mismo corte con `getDeudaCompleta`; no se usa
    // el capital actual del listado ni se reimplementa la regla de E4.6.
    const fichas = activeNonHypothecaryDebts(db).map((item) =>
      getDeudaCompleta(db, item.id, corte, now),
    );
    const calculables = fichas.filter((ficha) => ficha.capital.calculable);
    const subtotal =
      fichas.length === 0
        ? null
        : sumCents(calculables.map((ficha) => ficha.capitalPendiente));
    const completa =
      fichas.length > 0 &&
      calculables.length === fichas.length &&
      subtotal !== null;
    const total = completa ? decimal(subtotal!) : null;
    const estado: EstadoMetrica =
      fichas.length === 0
        ? "Sin datos"
        : completa
          ? total === "0.00"
            ? "Cero verificado"
            : "Verificado"
          : "Parcial";
    const motivos = fichas
      .filter((ficha) => !ficha.capital.calculable)
      .map(
        (ficha) =>
          `${ficha.id}: ${ficha.capital.motivoNoCalculable ?? "capital no calculable"}`,
      );
    deuda = {
      total,
      subtotal: subtotal === null ? null : decimal(subtotal),
      estado,
      cobertura: cobertura({
        estado: coberturaDe(estado),
        fuente: MOTOR.deuda,
        detalle: `E4.4 al corte ${corte}; solo deuda no hipotecaria activa; capital pendiente es stock, no flujo.`,
        incluidos: calculables.length,
        excluidos: fichas.length - calculables.length,
        motivos,
      }),
      corte,
      fuente: {
        motor: MOTOR.deuda,
        ids: fichas.map((ficha) => ficha.id),
        revision: fingerprint(
          fichas.map((ficha) => ({
            id: ficha.id,
            revision: ficha.revision,
            corte: ficha.corte,
            capitalPendiente: ficha.capitalPendiente,
            calculable: ficha.capital.calculable,
          })),
        ),
      },
      enlace: { etiqueta: "Ver deudas", ruta: "/deudas", ids: [] },
    };
  } catch (error) {
    deuda.estado = "No disponible";
    deuda.corte = corte;
    deuda.cobertura = cobertura({
      estado: "NoDisponible",
      fuente: MOTOR.deuda,
      detalle: `E4.4 no disponible al corte ${corte}: ${errorMessage(error)}.`,
      motivos: [`E4.4 no disponible: ${errorMessage(error)}.`],
    });
  }

  const corteEstado: EstadoMetrica =
    valoracion.estado === "No disponible" && deuda.estado === "No disponible"
      ? "No disponible"
      : valoracion.estado === "No disponible" ||
          deuda.estado === "No disponible" ||
          valoracion.estado === "Parcial" ||
          deuda.estado === "Parcial"
        ? "Parcial"
        : "Verificado";
  return {
    incluido: true,
    corte: {
      fecha: corte,
      estado: corteEstado,
      motivo:
        corteEstado === "No disponible"
          ? "Ni E4.3 ni E4.4 publican un corte verificable común."
          : "Mismo corte de referencia para E4.3 y E4.4; sin suma entre bloques.",
    },
    valoracion,
    deuda,
    nota,
  };
}

function coberturaGlobal(
  porCarril: ResumenAnual["cobertura"]["porCarril"],
): EstadoMetrica | EstadoCobertura {
  const estados = Object.values(porCarril).map((item) => item.estado);
  if (estados.includes("Solapada")) return "Solapada";
  if (estados.includes("NoAcreditada")) return "NoAcreditada";
  if (estados.includes("NoDisponible")) return "NoDisponible";
  if (estados.includes("Parcial")) return "Parcial";
  if (estados.every((estado) => estado === "Completa")) return "Completa";
  return "Sin datos";
}

export function resumenAnual(
  db: Database,
  params: URLSearchParams,
  now = Date.now(),
  options: ResumenAnualOptions = {},
): ResumenAnual {
  const filtros = parseFiltros(params);
  const desde = `${String(filtros.ejercicio).padStart(4, "0")}-01-01`;
  const hasta = `${String(filtros.ejercicio).padStart(4, "0")}-12-31`;

  let context: ReturnType<typeof cycleContext> | null = null;
  try {
    context = cycleContext(db);
  } catch {
    context = null;
  }
  const cycles = cycleMaster(db);
  const delEjercicio = cycles.filter((cycle) =>
    tocaEjercicio(cycle, filtros.ejercicio),
  );
  if (
    filtros.ciclo !== null &&
    !delEjercicio.some((cycle) => cycle.id === filtros.ciclo)
  )
    throw new Problem(
      422,
      "VALIDATION",
      "El ciclo no pertenece al ejercicio consultado.",
    );
  const seleccionados =
    filtros.ciclo === null
      ? delEjercicio
      : delEjercicio.filter((cycle) => cycle.id === filtros.ciclo);

  const plan = planSection(db, filtros.ejercicio, now, filtros, options);
  const prevision = previsionSection();
  const realidadCiclos = seleccionados.map((cycle) =>
    realidadCiclo(db, cycle, now),
  );
  const realidad: CarrilRealidad = {
    estado:
      realidadCiclos.length === 0
        ? "Sin datos"
        : realidadCiclos.every((ciclo) =>
              ciclo.ingresos.motivo.startsWith(
                "E2.6 no disponible para el ciclo",
              ),
            )
          ? "No disponible"
          : "Parcial",
    motivo:
      realidadCiclos.length === 0
        ? "El ejercicio no tiene Ciclos que lo toquen."
        : "Métricas por Ciclo; un Ciclo puede cruzar diciembre/enero y no se prorratea.",
    ciclos: realidadCiclos,
    agregadoAnual: {
      estado: "No aplica",
      motivo:
        "E2.6 no publica año natural. No se suman subtotales de varios Ciclos ni se crea un total anual de flujo.",
    },
    cobertura: coberturaRealidad(realidadCiclos),
    enlace: {
      etiqueta: "Ver flujo mensual",
      ruta:
        filtros.ciclo === null
          ? "/flujo-mensual"
          : `/flujo-mensual?ciclo=${filtros.ciclo}`,
      ids: [],
    },
  };
  const archivo = archivoSection();
  const margenes = margenesSection(realidadCiclos);
  const corte = context?.referencia.fecha ?? null;
  // Un ejercicio posterior al corte vivo no hereda patrimonio de otro año.
  const patrimonioCorte =
    corte !== null && Number(corte.slice(0, 4)) >= filtros.ejercicio
      ? corte
      : null;
  const patrimonio = patrimonioSection(db, patrimonioCorte, now);

  const porCarril = {
    plan: plan.cobertura,
    prevision: prevision.cobertura,
    realidad: realidad.cobertura,
    archivo: archivo.cobertura,
  };
  const fuentes = [
    plan.fuente,
    { motor: MOTOR.flujo, ids: realidadCiclos.map((c) => c.cicloId), revision: null },
    { motor: MOTOR.archivo, ids: [], revision: null },
  ];
  const motivos = [
    ...new Set([
      plan.motivo,
      prevision.motivo,
      realidad.motivo,
      archivo.motivo,
    ]),
  ];
  const revision = fingerprint([
    context?.revision ?? null,
    corte,
    filtros,
    cicloRefs(delEjercicio),
    plan.fuente,
    plan.items.map((item) => ({
      partidaId: item.partidaId,
      ejecutado: item.ejecutado.valor,
      subtotal: item.ejecutado.subtotal,
      estado: item.ejecutado.estado,
    })),
    realidadCiclos.map((ciclo) => ({
      cicloId: ciclo.cicloId,
      ingresos: ciclo.ingresos.fuente.revision,
      gasto: ciclo.gasto.subtotal,
      extraordinaria: ciclo.extraordinaria.subtotal,
      nomina: ciclo.nomina.subtotal,
      ajuste: ciclo.ajusteCompartidos.fuente.revision,
      margenEstructural: ciclo.margenEstructural.valor,
      margenReal: ciclo.margenReal.valor,
    })),
    margenes.publicados.map((margen) => ({
      clave: margen.clave,
      cicloId: margen.cicloId,
      valor: margen.valor,
    })),
    patrimonio === null
      ? null
      : {
          corte: patrimonio.corte,
          valoracion: {
            valorEur: patrimonio.valoracion.valorEur,
            resultadoEur: patrimonio.valoracion.resultadoEur,
            coberturaValoracion: patrimonio.valoracion.coberturaValoracion,
            coberturaResultado: patrimonio.valoracion.coberturaResultado,
            fuenteRevision: patrimonio.valoracion.fuente.revision,
          },
          deuda: {
            total: patrimonio.deuda.total,
            subtotal: patrimonio.deuda.subtotal,
            cobertura: patrimonio.deuda.cobertura,
            corte: patrimonio.deuda.corte,
            fuenteRevision: patrimonio.deuda.fuente.revision,
          },
        },
  ]);

  return {
    contexto: {
      consulta: new Date(now).toISOString(),
      corte: {
        fecha: corte,
        fuente: MOTOR.ciclos,
        estado:
          context?.referencia.estado === "disponible"
            ? "disponible"
            : "no_disponible",
      },
      calculo: "Vivo",
      fotoId: null,
      etiqueta: "Cálculo vivo, sin foto",
      revision,
    },
    ejercicio: {
      natural: filtros.ejercicio,
      desde,
      hasta,
      ciclos: cicloRefs(delEjercicio),
    },
    filtros,
    cobertura: {
      estado: coberturaGlobal(porCarril),
      fuentes,
      motivos,
      porCarril,
    },
    carriles: { plan, prevision, realidad, archivo },
    margenes,
    patrimonio,
    enlaces: [plan.enlace, prevision.enlace, realidad.enlace, archivo.enlace],
    pendientesDelModelo: [
      "E4.5/DT7: archivo histórico y universo acreditado.",
      "E4.9/E4.11: foto y cierre; el resumen sigue siendo cálculo vivo.",
      "DT8: definición de margen medio y margen real puntual.",
      "E2.5: contrato anual de previsión consumible.",
    ],
  };
}

function cicloRefs(cycles: Cycle[]) {
  return cycles.map(cicloRef);
}
