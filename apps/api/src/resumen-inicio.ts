import type { Database } from "bun:sqlite";
import { cycleContext, type Cycle, type Reference } from "./ciclos";
import { monthlyFlow, type MonthlyFlow, type Metric } from "./flujo-mensual";
import { getAnnualPlan, type AnnualProvider } from "./plan-anual";
import { getSaldo, decimal, type Saldo } from "./saldos";
import { e43Corte } from "./e43";
import { listDeudasCompletas } from "./deuda-completa";
import { listPendientes } from "./pendientes";
import { fingerprint } from "./movement-ledger";
import { Problem } from "./problem";

/**
 * E4.6 — read model de composición del inicio.
 *
 * Solo lee motores propietarios: no calcula liquidez, coste esencial, valoración,
 * resultado, capital de deuda ni pendientes. No escribe hechos, planes, cierres,
 * auditoría ni configuración; no crea tablas ni una segunda contabilidad.
 *
 * `null` es `No disponible` y nunca se normaliza a `0.00`. Un `0.00` solo se
 * publica cuando el motor propietario lo verifica (`Cero verificado`).
 */

export type ResumenInicioOptions = {
  annualProvider?: AnnualProvider;
  /** Doble de contrato de prueba para R6; no es un almacén ni un valor por defecto. */
  mesesObjetivo?: number | null;
};

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
  | "No disponible"
  | "No aplica"
  | "Sin datos";

export type ClaseMetrica =
  | "real"
  | "plan"
  | "posicion"
  | "objetivo"
  | "informativo";

export type FuenteDto = {
  motor: string;
  ids: string[];
  revisiones: string[];
};

export type CoberturaDto = {
  estado: EstadoCobertura;
  incluidos: number;
  excluidos: number;
  motivos: string[];
};

export type ContextoDto = {
  tipo: "actual" | "ciclo" | "corte";
  cicloId?: string | null;
  corte?: string | null;
};

export type EnlaceDto = { ruta: string; ids: string[] } | null;

export type RacionalDto = {
  numeradorCentimos: string;
  divisor: string;
};

export type MetricaDto = {
  clave: string;
  etiqueta: string;
  clase: ClaseMetrica;
  valor: string | null;
  subtotal: string | null;
  estado: EstadoMetrica;
  unidad: "EUR" | "meses" | null;
  motivo: string;
  cobertura: CoberturaDto;
  fuente: FuenteDto;
  contexto: ContextoDto;
  enlace: EnlaceDto;
  racional?: RacionalDto;
};

const MOTOR = {
  ciclo: "E2.6 monthlyFlow",
  anual: "E2.4 annualEquivalent",
  saldos: "E1.1 listSaldos/getSaldo",
  inversion: "E4.3 e43Corte",
  efectivo: "E4.2 cashAt",
  deuda: "E4.4 listDeudasCompletas/getDeudaCompleta",
  pendientes: "E3.6 listPendientes",
} as const;

const errorMessage = (error: unknown) =>
  error instanceof Problem
    ? error.message
    : "error de fuente no verificable";

function coberturaEstado(estado: EstadoMetrica): EstadoCobertura {
  if (estado === "Verificado" || estado === "Cero verificado")
    return "Completa";
  if (estado === "Parcial") return "Parcial";
  if (estado === "No aplica") return "No aplica";
  if (estado === "Sin datos") return "Sin datos";
  return "No disponible";
}

function cobertura(
  estado: EstadoMetrica,
  incluidos: number,
  excluidos: number,
  motivos: string[] = [],
): CoberturaDto {
  return {
    estado: coberturaEstado(estado),
    incluidos,
    excluidos,
    motivos,
  };
}

function metric(args: {
  clave: string;
  etiqueta: string;
  clase: ClaseMetrica;
  valor: string | null;
  subtotal?: string | null;
  estado: EstadoMetrica;
  unidad?: "EUR" | "meses" | null;
  motivo: string;
  cobertura?: CoberturaDto;
  fuente: FuenteDto;
  contexto: ContextoDto;
  enlace?: EnlaceDto;
  racional?: RacionalDto;
}): MetricaDto {
  return {
    clave: args.clave,
    etiqueta: args.etiqueta,
    clase: args.clase,
    valor: args.valor,
    subtotal: args.subtotal ?? null,
    estado: args.estado,
    unidad: args.unidad ?? "EUR",
    motivo: args.motivo,
    cobertura:
      args.cobertura ??
      cobertura(args.estado, 0, 0, args.motivo ? [args.motivo] : []),
    fuente: args.fuente,
    contexto: args.contexto,
    enlace: args.enlace ?? null,
    ...(args.racional ? { racional: args.racional } : {}),
  };
}

function ndMetric(args: {
  clave: string;
  etiqueta: string;
  clase: ClaseMetrica;
  motivo: string;
  motor: string;
  contexto: ContextoDto;
  enlace?: EnlaceDto;
  unidad?: "EUR" | "meses" | null;
}): MetricaDto {
  return metric({
    clave: args.clave,
    etiqueta: args.etiqueta,
    clase: args.clase,
    valor: null,
    estado: "No disponible",
    unidad: args.unidad ?? "EUR",
    motivo: args.motivo,
    cobertura: cobertura("No disponible", 0, 0, [args.motivo]),
    fuente: { motor: args.motor, ids: [], revisiones: [] },
    contexto: args.contexto,
    enlace: args.enlace ?? null,
  });
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

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x === 0n ? 1n : x;
}

function reduceRational(numerator: bigint, divisor: bigint): RacionalDto {
  if (divisor === 0n) return { numeradorCentimos: "0", divisor: "0" };
  const negative = (numerator < 0n) !== (divisor < 0n);
  const n = numerator < 0n ? -numerator : numerator;
  const d = divisor < 0n ? -divisor : divisor;
  const factor = gcd(n, d);
  return {
    numeradorCentimos: `${negative ? "-" : ""}${n / factor}`,
    divisor: `${d / factor}`,
  };
}

/** Formatea un racional de céntimos a EUR con dos decimales, redondeando una vez. */
function rationalMoneyText(numerator: bigint, divisor: bigint): string | null {
  if (divisor === 0n) return null;
  const negative = (numerator < 0n) !== (divisor < 0n);
  const n = numerator < 0n ? -numerator : numerator;
  const d = divisor < 0n ? -divisor : divisor;
  const rounded = (n + d / 2n) / d;
  return `${negative ? "-" : ""}${rounded / 100n}.${String(rounded % 100n).padStart(2, "0")}`;
}

/** Formatea un racional de meses a dos decimales (propuesta DT8), redondeando una vez. */
function ratioText(numerator: bigint, divisor: bigint): string | null {
  if (divisor === 0n) return null;
  const negative = (numerator < 0n) !== (divisor < 0n);
  const n = numerator < 0n ? -numerator : numerator;
  const d = divisor < 0n ? -divisor : divisor;
  const scaled = (n * 100n + d / 2n) / d;
  return `${negative ? "-" : ""}${scaled / 100n}.${String(scaled % 100n).padStart(2, "0")}`;
}

function annualMonthlyRational(total: RacionalDto) {
  return {
    numerator: BigInt(total.numeradorCentimos),
    divisor: BigInt(total.divisor),
  };
}

function saldoItem(saldo: Saldo) {
  return {
    id: saldo.id,
    nombre: saldo.nombre,
    estado: saldo.estado,
    posicion: saldo.posicion.importe,
    // E1.1 publica la condición de la posición y su motivo; se conservan para
    // que una posición null no quede sin explicación en el consumidor.
    condicion: saldo.posicion.condicion,
    motivo: saldo.posicion.motivo,
    liquidez: saldo.liquidez,
    finalidad: saldo.finalidad,
    bolsa: saldo.mostrarComoBolsa,
    revision: saldo.revision,
  };
}

type SaldosRead = {
  items: ReturnType<typeof saldoItem>[];
  failures: { id: string; motivo: string }[];
  error: string | null;
};

function readSaldos(db: Database): SaldosRead {
  const items: SaldosRead["items"] = [];
  const failures: SaldosRead["failures"] = [];
  try {
    const ids = db
      .query("SELECT id FROM saldos WHERE id!='S000' ORDER BY id")
      .all() as { id: string }[];
    for (const row of ids) {
      try {
        items.push(saldoItem(getSaldo(db, row.id)));
      } catch (error) {
        failures.push({
          id: row.id,
          motivo: `Posición/pertenencia no verificable: ${errorMessage(error)}`,
        });
      }
    }
  } catch (error) {
    return {
      items,
      failures,
      error: `Universo Saldos no verificable: ${errorMessage(error)}`,
    };
  }
  return { items, failures, error: null };
}

function saldosSection(read: SaldosRead) {
  const names = new Map(read.items.map((item) => [item.id, item.nombre]));
  const active = read.items.filter((item) => item.estado === "Activa");
  const inactive = read.items.filter((item) => item.estado !== "Activa");
  const motivos = [
    ...inactive.map((item) => `${item.id}: Saldo inactivo`),
    ...read.failures.map((failure) => `${failure.id}: ${failure.motivo}`),
  ];
  const excluidos = inactive.length + read.failures.length;
  const estado: EstadoMetrica =
    read.error !== null
      ? "No disponible"
      : read.items.length === 0
        ? "Sin datos"
        : excluidos > 0
          ? "Parcial"
          : "Verificado";
  return {
    contexto: { tipo: "actual" as const },
    conteos: {
      liquidez: active.filter((item) => item.liquidez === true).length,
      ahorro: active.filter((item) => item.finalidad === "Ahorro").length,
      bolsas: active.filter((item) => item.bolsa === true).length,
    },
    items: read.items,
    cobertura: cobertura(
      estado,
      active.length,
      excluidos,
      read.error !== null ? [read.error, ...motivos] : motivos,
    ),
    fuente: {
      motor: MOTOR.saldos,
      ids: read.items.map((item) => item.id),
      revisiones: read.items.map((item) => `${item.id}@${item.revision}`),
    },
    enlace: { ruta: "/saldos", ids: read.items.map((item) => item.id) },
    names,
  };
}

function liquidezSection(
  flow: MonthlyFlow | null,
  names: Map<string, string>,
  flowError: string | null,
) {
  if (flow === null)
    return {
      metrica: ndMetric({
        clave: "liquidez",
        etiqueta: "Liquidez",
        clase: "posicion",
        motivo:
          flowError ?? "E2.6 no publica liquidez sin un ciclo actual verificable.",
        motor: MOTOR.ciclo,
        contexto: { tipo: "actual" },
        enlace: { ruta: "/saldos", ids: [] },
      }),
      incluidos: [],
      excluidos: [],
    };
  const source = flow.metrics.liquidez;
  const incluidos = flow.liquidez.incluidos.map((item) => ({
    id: item.id,
    nombre: names.get(item.id) ?? null,
    valor: item.valor,
    revision: item.revision,
  }));
  const excluidos = flow.liquidez.excluidos.map((item) => ({
    id: item.id,
    motivo: item.motivo,
  }));
  const estado = source.estado as EstadoMetrica;
  return {
    metrica: metric({
      clave: "liquidez",
      etiqueta: "Liquidez",
      clase: "posicion",
      valor: source.valor,
      subtotal: source.subtotal,
      estado,
      unidad: "EUR",
      motivo: source.motivo,
      cobertura: cobertura(
        estado,
        incluidos.length,
        excluidos.length,
        excluidos.map((item) => `${item.id}: ${item.motivo}`),
      ),
      fuente: {
        motor: MOTOR.ciclo,
        ids: source.ids,
        revisiones: incluidos.length
          ? incluidos.map((item) => `${item.id}@${item.revision}`)
          : [`monthlyFlow@${flow.revision}`],
      },
      contexto: { tipo: "actual" as const },
      enlace: { ruta: "/saldos", ids: source.ids },
    }),
    incluidos,
    excluidos,
  };
}

function cicloMetric(
  clave: string,
  etiqueta: string,
  clase: ClaseMetrica,
  flow: MonthlyFlow | null,
  cycle: Cycle | null,
  flowError: string | null,
): MetricaDto {
  const context: ContextoDto = {
    tipo: "ciclo",
    cicloId: cycle?.id ?? null,
    corte: flow?.corteEfectivo ?? cycle?.corte ?? null,
  };
  if (flow === null)
    return ndMetric({
      clave,
      etiqueta,
      clase,
      motivo:
        flowError ??
        "Sin ciclo actual: E2.6 no publica ejecución ni márgenes.",
      motor: MOTOR.ciclo,
      contexto: context,
      enlace: null,
    });
  const source: Metric = flow.metrics[clave];
  const estado = source.estado as EstadoMetrica;
  const ids = source.ids;
  return metric({
    clave,
    etiqueta,
    clase,
    valor: source.valor,
    subtotal: source.subtotal,
    estado,
    unidad: "EUR",
    motivo: source.motivo,
    cobertura: cobertura(
      estado,
      ids.length,
      0,
      estado === "No disponible" ? [source.motivo] : [],
    ),
    fuente: {
      motor: MOTOR.ciclo,
      ids,
      revisiones: [`monthlyFlow@${flow.revision}`],
    },
    contexto: context,
    enlace: cycle
      ? { ruta: `/flujo-mensual?ciclo=${cycle.id}`, ids: [] }
      : null,
  });
}

function objetivoSection(
  flow: MonthlyFlow | null,
  cycle: Cycle | null,
  now: number,
  options: ResumenInicioOptions,
  db: Database,
) {
  const exercise =
    cycle === null ? null : Number(cycle.mesFinanciado.slice(0, 4));
  const context: ContextoDto = { tipo: "actual" };
  let annualPlan: ReturnType<typeof getAnnualPlan> | null = null;
  let annualError: string | null = null;
  if (exercise !== null)
    try {
      annualPlan = getAnnualPlan(
        db,
        exercise,
        now,
        options.annualProvider,
      );
    } catch (error) {
      annualError = errorMessage(error);
    }
  const equivalent = annualPlan?.esencial ?? null;
  const complete =
    equivalent !== null &&
    equivalent.estado === "Completo" &&
    equivalent.total !== null;
  const monthly =
    equivalent !== null && equivalent.total !== null
      ? annualMonthlyRational(equivalent.total)
      : null;
  const monthlyExactCents =
    monthly !== null && monthly.numerator % monthly.divisor === 0n
      ? monthly.numerator / monthly.divisor
      : null;
  const costeValor =
    monthly === null
      ? null
      : rationalMoneyText(monthly.numerator, monthly.divisor);
  const subtotalConocido =
    equivalent?.parcial != null
      ? rationalMoneyText(
          BigInt(equivalent.parcial.numeradorCentimos),
          BigInt(equivalent.parcial.divisor),
        )
      : null;
  const costeMotivo =
    cycle === null
      ? "Sin ciclo actual: no hay mesFinanciado para elegir ejercicio."
      : annualError !== null
        ? `E2.4 no disponible: ${annualError}`
        : equivalent?.estado === "Sin plan anual"
          ? "Sin plan anual para el ejercicio de mesFinanciado."
          : equivalent?.estado === "Incompleto"
            ? "Coste esencial incompleto: faltan importes en líneas esenciales."
            : "Coste esencial mensual derivado del racional de E2.4.";
  const costeEstado: EstadoMetrica =
    complete ? "Verificado" : "No disponible";

  // Cobertura publicada por E2.4: no se inventan recuentos de líneas. El
  // estado se deriva del `estado` del equivalente y el resto se transporta.
  const equivalenteEstado = equivalent?.estado ?? "No disponible";
  const coberturaCosteEstado: EstadoCobertura =
    equivalenteEstado === "Completo"
      ? "Completa"
      : equivalenteEstado === "Incompleto"
        ? "Parcial"
        : equivalenteEstado === "Sin plan anual"
          ? "Sin datos"
          : "No disponible";
  const coberturaCosteMotivos: string[] = [];
  if (annualError !== null)
    coberturaCosteMotivos.push(`E2.4 no disponible: ${annualError}`);
  else if (equivalenteEstado === "Incompleto")
    coberturaCosteMotivos.push(
      `${equivalent?.importesSinInformar ?? 0} importes esenciales sin informar; el equivalente mensual no es un total.`,
    );
  else if (equivalenteEstado === "Sin plan anual")
    coberturaCosteMotivos.push(
      "Sin plan anual para el ejercicio de mesFinanciado.",
    );
  if ((equivalent?.clasificacionesPendientes ?? 0) > 0)
    coberturaCosteMotivos.push(
      `${equivalent?.clasificacionesPendientes} clasificaciones esenciales pendientes.`,
    );

  const mesesObjetivo =
    options.mesesObjetivo === undefined || options.mesesObjetivo === null
      ? null
      : Number.isSafeInteger(options.mesesObjetivo) &&
          options.mesesObjetivo > 0 &&
          options.mesesObjetivo <= 1200
        ? options.mesesObjetivo
        : null;
  let minimoValor: string | null = null;
  let minimoRacional: RacionalDto | null = null;
  let minimoMotivo = "";
  if (monthly === null) minimoMotivo = "Coste esencial no verificado.";
  else if (mesesObjetivo === null)
    minimoMotivo = "Meses objetivo no configurados.";
  else if (monthlyExactCents === 0n) {
    minimoMotivo =
      "Coste esencial verificado 0: el mínimo objetivo no se declara (Q11).";
  } else if (monthlyExactCents !== null) {
    const minimoCents = monthlyExactCents * BigInt(mesesObjetivo);
    minimoValor = decimal(minimoCents);
    minimoRacional = {
      numeradorCentimos: minimoCents.toString(),
      divisor: "1",
    };
    minimoMotivo =
      "Mínimo objetivo informativo; no genera transferencias ni reservas.";
  } else {
    const numerator = monthly.numerator * BigInt(mesesObjetivo);
    minimoValor = rationalMoneyText(numerator, monthly.divisor);
    minimoRacional = reduceRational(numerator, monthly.divisor);
    minimoMotivo =
      "Mínimo objetivo informativo; no genera transferencias ni reservas.";
  }
  const minimoEstado: EstadoMetrica =
    minimoValor === null
      ? "No disponible"
      : minimoValor === "0.00"
        ? "Cero verificado"
        : "Verificado";

  let mesesValor: string | null = null;
  let mesesRacional: RacionalDto | null = null;
  let mesesEstado: EstadoMetrica = "No disponible";
  let mesesMotivo = "";
  const liquidityState = flow?.metrics.liquidez.estado;
  const liquidityValue = flow?.metrics.liquidez.valor ?? null;
  if (monthly === null) mesesMotivo = "Coste esencial no verificado.";
  else if (monthly.numerator === 0n)
    mesesMotivo = "Coste esencial verificado 0: denominador no aplicable.";
  else if (liquidityState === "Parcial")
    mesesMotivo = "Liquidez parcial: no se divide el subtotal conocido.";
  else if (liquidityValue === null || flow === null)
    mesesMotivo = "Liquidez no disponible.";
  else {
    const liquidityCents = centsOf(liquidityValue)!;
    if (monthlyExactCents !== null) {
      mesesRacional = {
        numeradorCentimos: liquidityCents.toString(),
        divisor: monthlyExactCents.toString(),
      };
      mesesValor = ratioText(liquidityCents, monthlyExactCents);
    } else {
      const numerator = liquidityCents * monthly.divisor;
      const denominator = monthly.numerator;
      mesesRacional = reduceRational(numerator, denominator);
      mesesValor = ratioText(numerator, denominator);
    }
    if (liquidityCents === 0n) {
      mesesEstado = "Cero verificado";
      mesesMotivo = "Liquidez cero verificada y coste esencial completo.";
    } else {
      mesesEstado = "Verificado";
      mesesMotivo =
        "Liquidez verificada / coste esencial completo; formato de meses DT8.";
    }
  }

  return {
    metrica: metric({
      clave: "minimoObjetivo",
      etiqueta: "Mínimo objetivo",
      clase: "objetivo",
      valor: minimoValor,
      estado: minimoEstado,
      unidad: "EUR",
      motivo: minimoMotivo,
      cobertura: cobertura(
        minimoEstado,
        0,
        0,
        minimoEstado === "No disponible" ? [minimoMotivo] : [],
      ),
      fuente: {
        motor: "E2.4 annualEquivalent + configuración R6",
        ids: [],
        revisiones: minimoRacional ? ["configuracion@prueba"] : [],
      },
      contexto: context,
      enlace: { ruta: "/plan-anual", ids: [] },
      ...(minimoRacional ? { racional: minimoRacional } : {}),
    }),
    costeEsencialMensual: {
      valor: costeValor,
      subtotal: subtotalConocido,
      estado: costeEstado,
      ejercicio: exercise,
      ejercicioOrigen: "mesFinanciado" as const,
      estadoEquivalente: equivalent?.estado ?? "No disponible",
      motivo: costeMotivo,
      cobertura: {
        estado: coberturaCosteEstado,
        motivos: coberturaCosteMotivos,
        importesSinInformar: equivalent?.importesSinInformar ?? null,
        clasificacionesPendientes:
          equivalent?.clasificacionesPendientes ?? null,
        ejercicioSinPlan: equivalent?.ejercicioSinPlan ?? null,
        fuenteMotivo: annualPlan?.fuentes.motivo ?? annualError,
      },
      racional:
        equivalent?.total != null
          ? equivalent.total
          : (equivalent?.parcial ?? null),
      fuente: {
        motor: MOTOR.anual,
        ids: [],
        revisiones: annualPlan
          ? [`annual@${annualPlan.contextRevision}`]
          : [],
      },
      contexto: {
        tipo: "ciclo",
        cicloId: cycle?.id ?? null,
        corte: flow?.corteEfectivo ?? cycle?.corte ?? null,
      },
    },
    mesesObjetivo,
    mesesCubiertos: {
      valor: mesesValor,
      estado: mesesEstado,
      unidad: "meses" as const,
      motivo: mesesMotivo,
      cobertura: cobertura(
        mesesEstado,
        mesesValor === null ? 0 : 1,
        mesesValor === null ? 1 : 0,
        mesesValor === null ? [mesesMotivo] : [],
      ),
      fuente: {
        motor: "E2.6 monthlyFlow / E2.4 annualEquivalent",
        ids: flow?.metrics.liquidez.ids ?? [],
        revisiones: flow ? [`monthlyFlow@${flow.revision}`] : [],
      },
      contexto: { tipo: "actual" as const },
      ...(mesesRacional ? { racional: mesesRacional } : {}),
    },
    zona: "Informativa" as const,
    error: annualError,
    contextRevision: annualPlan?.contextRevision ?? null,
  };
}

function ahorroSection(
  flow: MonthlyFlow | null,
  saldos: SaldosRead,
  flowError: string | null,
) {
  const posiciones = saldos.items
    .filter((item) => item.estado === "Activa" && item.finalidad === "Ahorro")
    .map((item) => ({
      id: item.id,
      nombre: item.nombre,
      valor: item.posicion,
      estado: item.posicion === null ? "No disponible" : "Verificado",
      condicion: item.condicion,
      revision: item.revision,
      // Motivo real de E1.1 cuando la posición no es verificable. No se
      // fabrica un texto nuevo si el motor no lo publica.
      ...(item.posicion === null ? { motivo: item.motivo } : {}),
    }));
  const estadoMetrica = (metric: Metric | null): EstadoMetrica =>
    (metric?.estado as EstadoMetrica | undefined) ?? "No disponible";
  const fromFlow = (key: "ahorroCierre" | "variacionAhorro" | "ahorroResidual") => {
    const metric = flow?.metrics[key] ?? null;
    return {
      estado: estadoMetrica(metric),
      valor: metric?.valor ?? null,
      motivo:
        metric?.motivo ??
        flowError ??
        "E2.6 no publica esta métrica sin un ciclo actual verificable.",
      // E2.6 publica fuente, IDs y cobertura como texto; se transportan sin
      // reinterpretarlos. No existe un objeto de cobertura estructurado.
      cobertura: metric?.cobertura ?? null,
      fuente: {
        motor: metric?.fuente ?? MOTOR.ciclo,
        ids: metric?.ids ?? [],
        revisiones: flow ? [`monthlyFlow@${flow.revision}`] : [],
      },
    };
  };
  return {
    contexto: { tipo: "actual" as const },
    posiciones,
    ahorroCierre: fromFlow("ahorroCierre"),
    variacionAhorro: fromFlow("variacionAhorro"),
    ahorroResidual: fromFlow("ahorroResidual"),
    fuente: {
      motor: "E2.6 monthlyFlow + E1.1 Saldos",
      ids: posiciones.map((item) => item.id),
      revisiones: posiciones.map((item) => `${item.id}@${item.revision}`),
    },
    enlace: { ruta: "/saldos", ids: posiciones.map((item) => item.id) },
  };
}

function inversionSection(db: Database, corte: string | null) {
  const context: ContextoDto = { tipo: "corte", corte };
  if (corte === null)
    return {
      contexto: context,
      agregado: null,
      posiciones: [],
      efectivo: [],
      cobertura: cobertura("No disponible", 0, 0, [
        "Sin corte efectivo: E4.3 exige una fecha civil; no se sustituye por el reloj.",
      ]),
      fuente: { motor: `${MOTOR.inversion} + ${MOTOR.efectivo}`, ids: [], revisiones: [] },
      enlace: { ruta: "/inversiones", ids: [] },
    };
  try {
    const source = e43Corte(db, corte);
    const open = source.posiciones.filter(
      (position) => position.estado === "Abierta",
    );
    const valued = open.filter(
      (position) => position.valoracion?.estado === "Disponible",
    );
    const resultadoParcial =
      source.agregado.coberturaResultado !== "Verificada" &&
      source.agregado.coberturaResultado !== "Completa";
    const motivos: string[] = [];
    if (open.length > valued.length)
      motivos.push("Posiciones abiertas sin valoración verificable.");
    if (resultadoParcial && open.some((position) => position.tipoValoracion === "Manual"))
      motivos.push("Resultado no disponible para valoración manual.");
    const valuationState: EstadoMetrica =
      source.agregado.coberturaValoracion === "Verificada" ||
      source.agregado.coberturaValoracion === "Completa"
        ? "Verificado"
        : /^Parcial/.test(source.agregado.coberturaValoracion)
          ? "Parcial"
          : source.agregado.coberturaValoracion === "No aplica"
            ? "No aplica"
            : "No disponible";
    const resultState: EstadoMetrica =
      source.agregado.coberturaResultado === "Verificada" ||
      source.agregado.coberturaResultado === "Completa"
        ? "Verificado"
        : /^Parcial/.test(source.agregado.coberturaResultado)
          ? "Parcial"
          : source.agregado.coberturaResultado === "No aplica"
            ? "No aplica"
            : "No disponible";
    const sourceState: EstadoMetrica =
      valuationState === "No disponible" || resultState === "No disponible"
        ? "No disponible"
        : valuationState === "No aplica" && resultState === "No aplica"
          ? "No aplica"
          : valuationState === "Parcial" || resultState === "Parcial"
            ? "Parcial"
            : "Verificado";
    const posiciones = source.posiciones.map((position) => ({
      instrumento: position.instrumento.id,
      nombre: position.instrumento.nombre,
      cantidad: position.cantidad,
      estado: position.estado,
      tipoValoracion: position.tipoValoracion,
      valorEur: position.valoracion?.valorEur ?? null,
      fechaValoracion: position.valoracion?.fecha ?? null,
      valoracionEstado: position.valoracion?.estado ?? null,
      // E4.3 publica el motivo de la valoración y su cobertura; E4.6 los
      // descartaba. Se transportan sin recalcular la valoración.
      valoracionMotivo:
        position.valoracion?.estado === "Disponible"
          ? null
          : (position.valoracion?.motivo ?? null),
      valoracionCobertura: position.valoracion?.cobertura ?? null,
      elegibilidadFechaExacta:
        position.valoracion?.elegibilidadFechaExacta ?? null,
      resultadoEur:
        position.resultado.estado === "Disponible"
          ? position.resultado.importeEur
          : null,
      resultadoEstado: position.resultado.estado,
      resultadoMotivo:
        position.resultado.estado === "Disponible"
          ? null
          : (position.resultado.motivo ?? null),
      revision: position.valoracion?.revision ?? null,
    }));
    return {
      contexto: context,
      agregado: {
        ...source.agregado,
        coberturaValoracion:
          source.agregado.coberturaValoracion === "Verificada"
            ? "Completa"
            : source.agregado.coberturaValoracion,
        coberturaValoracionFuente: source.agregado.coberturaValoracion,
        coberturaResultado:
          source.agregado.coberturaResultado === "Verificada"
            ? "Completa"
            : source.agregado.coberturaResultado,
        coberturaResultadoFuente: source.agregado.coberturaResultado,
      },
      posiciones,
      efectivo: source.efectivo.map((item) => ({
        saldo: item.saldo.id,
        nombre: item.saldo.nombre,
        disponible: item.disponible,
        fecha: item.fecha,
      })),
      cobertura: cobertura(
        sourceState,
        valued.length,
        open.length - valued.length,
        motivos,
      ),
      fuente: {
        motor: `${MOTOR.inversion} + ${MOTOR.efectivo}`,
        ids: posiciones.map((position) => position.instrumento),
        revisiones: source.posiciones.flatMap((position) =>
          position.valoracion
            ? [`${position.valoracion.id}@${position.valoracion.revision}`]
            : [],
        ),
      },
      enlace: {
        ruta: "/inversiones",
        ids: posiciones.map((position) => position.instrumento),
      },
    };
  } catch (error) {
    const motivo = `Inversión no disponible: ${errorMessage(error)}.`;
    return {
      contexto: context,
      agregado: null,
      posiciones: [],
      efectivo: [],
      cobertura: cobertura("No disponible", 0, 0, [motivo]),
      fuente: { motor: `${MOTOR.inversion} + ${MOTOR.efectivo}`, ids: [], revisiones: [] },
      enlace: { ruta: "/inversiones", ids: [] },
    };
  }
}

function allDebts(db: Database) {
  const items: ReturnType<typeof listDeudasCompletas>["items"] = [];
  let page = 1;
  let total = 0;
  do {
    const result = listDeudasCompletas(
      db,
      new URLSearchParams({ estado: "", page: String(page) }),
    );
    items.push(...result.items);
    total = result.total;
    if (result.items.length === 0) break;
    page += 1;
  } while (items.length < total && page <= 100000);
  return items;
}

function deudaSection(db: Database) {
  try {
    const all = allDebts(db);
    const activas = all.filter((item) => item.estado === "Activa");
    const noHipotecarias = activas.filter(
      (item) => item.tipoDeuda === "No hipotecaria",
    );
    const calculables = noHipotecarias.filter(
      (item) => item.capital.calculable,
    );
    const subtotal =
      noHipotecarias.length === 0
        ? null
        : sumCents(calculables.map((item) => item.capitalPendiente));
    const completa =
      noHipotecarias.length > 0 &&
      calculables.length === noHipotecarias.length &&
      subtotal !== null;
    const totalEstado: EstadoMetrica =
      noHipotecarias.length === 0
        ? "Sin datos"
        : completa
          ? subtotal === 0n
            ? "Cero verificado"
            : "Verificado"
          : "Parcial";
    const motivos = noHipotecarias
      .filter((item) => !item.capital.calculable)
      .map(
        (item) =>
          `${item.id}: ${item.capital.motivoNoCalculable ?? "capital no calculable"}`,
      );
    const items = noHipotecarias.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      tipoDeuda: item.tipoDeuda,
      estado: item.estado,
      capitalPendiente: item.capitalPendiente,
      calculable: item.capital.calculable,
      revision: item.revision,
      ...(item.capital.calculable
        ? {}
        : { motivo: item.capital.motivoNoCalculable }),
    }));
    const aparte = {
      hipotecaria: activas
        .filter((item) => item.tipoDeuda === "Hipotecaria")
        .map((item) => ({
          id: item.id,
          nombre: item.nombre,
          tipoDeuda: item.tipoDeuda,
          estado: item.estado,
          capitalPendiente: item.capitalPendiente,
          calculable: item.capital.calculable,
          revision: item.revision,
          ...(item.capital.calculable
            ? {}
            : { motivo: item.capital.motivoNoCalculable }),
        })),
      sinInformar: activas
        .filter((item) => item.tipoDeuda === null)
        .map((item) => ({
          id: item.id,
          nombre: item.nombre,
          tipoDeuda: item.tipoDeuda,
          estado: item.estado,
          capitalPendiente: item.capitalPendiente,
          calculable: item.capital.calculable,
          revision: item.revision,
          ...(item.capital.calculable
            ? {}
            : { motivo: item.capital.motivoNoCalculable }),
        })),
    };
    const totalValor = completa ? decimal(subtotal!) : null;
    return {
      contexto: { tipo: "actual" as const },
      items,
      total: {
        valor: totalValor,
        subtotal: subtotal === null ? null : decimal(subtotal),
        estado: totalEstado,
        motivo:
          totalEstado === "Parcial"
            ? motivos.join("; ") || "Hay deudas no calculables."
            : totalEstado === "Sin datos"
              ? "Sin deudas no hipotecarias activas."
              : "Total de deuda no hipotecaria calculable.",
        cobertura: cobertura(
          totalEstado,
          calculables.length,
          noHipotecarias.length - calculables.length,
          motivos,
        ),
        fuente: {
          motor: MOTOR.deuda,
          ids: noHipotecarias.map((item) => item.id),
          revisiones: noHipotecarias.map(
            (item) => `${item.id}@${item.revision}`,
          ),
        },
      },
      aparte,
      fuente: {
        motor: MOTOR.deuda,
        ids: all.map((item) => item.id),
        revisiones: all.map((item) => `${item.id}@${item.revision}`),
      },
      enlace: {
        ruta: "/deudas",
        ids: noHipotecarias.map((item) => item.id),
      },
    };
  } catch (error) {
    const motivo = `E4.4 no disponible: ${errorMessage(error)}.`;
    return {
      contexto: { tipo: "actual" as const },
      items: [],
      total: {
        valor: null,
        subtotal: null,
        estado: "No disponible" as EstadoMetrica,
        motivo,
        cobertura: cobertura("No disponible", 0, 0, [motivo]),
        fuente: { motor: MOTOR.deuda, ids: [], revisiones: [] },
      },
      aparte: { hipotecaria: [], sinInformar: [] },
      fuente: { motor: MOTOR.deuda, ids: [], revisiones: [] },
      enlace: { ruta: "/deudas", ids: [] },
    };
  }
}

function allPendientes(db: Database, now: number) {
  const first = listPendientes(
    db,
    new URLSearchParams({ pageSize: "100", page: "1" }),
    now,
  );
  const items = [...first.filas];
  const fuenteFallos = [...first.fuenteFallos];
  let page = 2;
  while (items.length < first.total && page <= 100000) {
    const result = listPendientes(
      db,
      new URLSearchParams({ pageSize: "100", page: String(page) }),
      now,
    );
    items.push(...result.filas);
    fuenteFallos.push(...result.fuenteFallos);
    if (result.filas.length === 0) break;
    page += 1;
  }
  const uniqueFallos = [
    ...new Map(
      fuenteFallos.map((fallo) => [
        `${fallo.motor}|${fallo.id ?? ""}|${fallo.motivo}`,
        fallo,
      ]),
    ).values(),
  ];
  return { items, conteos: first.conteos, fuenteFallos: uniqueFallos };
}

function pendientesSection(db: Database, now: number) {
  const context: ContextoDto = { tipo: "actual" };
  try {
    const source = allPendientes(db, now);
    const ids = [...new Set(source.items.map((item) => item.fuente.id))];
    const revisiones = [
      ...new Set(
        source.items.flatMap((item) =>
          item.fuente.revision === null
            ? []
            : [`${item.fuente.motor}:${item.fuente.id}@${item.fuente.revision}`],
        ),
      ),
    ];
    const motivos = source.fuenteFallos.map(
      (fallo) => `${fallo.motor}${fallo.id ? ` ${fallo.id}` : ""}: ${fallo.motivo}`,
    );
    // Un fallo de fuente nunca se presenta como universo vacío verificado.
    const estado: EstadoMetrica =
      source.fuenteFallos.length > 0
        ? "Parcial"
        : source.items.length === 0
          ? "Sin datos"
          : "No aplica";
    const motivoBase =
      "E3.6 publica pendientes por tipo/estado; no existe un total monetario entre tipos.";
    return {
      contexto: context,
      metrica: metric({
        clave: "pendientes",
        etiqueta: "Pendientes",
        clase: "informativo",
        valor: null,
        estado,
        unidad: null,
        motivo:
          source.fuenteFallos.length > 0
            ? `E3.6 con fuentes parciales: ${motivos.join("; ")}. ${motivoBase}`
            : motivoBase,
        cobertura: cobertura(
          estado,
          source.items.length,
          0,
          motivos,
        ),
        fuente: { motor: MOTOR.pendientes, ids, revisiones },
        contexto: context,
        enlace: { ruta: "/pendientes", ids: [] },
      }),
      items: source.items,
      conteo: source.conteos,
      fuenteFallos: source.fuenteFallos,
      sinTotalEconomico: true as const,
    };
  } catch (error) {
    const motivo = `E3.6 no disponible: ${errorMessage(error)}.`;
    return {
      contexto: context,
      metrica: ndMetric({
        clave: "pendientes",
        etiqueta: "Pendientes",
        clase: "informativo",
        motivo,
        motor: MOTOR.pendientes,
        contexto: context,
        enlace: { ruta: "/pendientes", ids: [] },
        unidad: null,
      }),
      items: [],
      conteo: null,
      fuenteFallos: [],
      sinTotalEconomico: true as const,
    };
  }
}

function contextDto(context: ReturnType<typeof cycleContext> | null): {
  ciclo: {
    id: string;
    inicio: string;
    fin: string | null;
    mesFinanciado: string;
    estadoTemporal: Cycle["estadoTemporal"];
    corte: string | null;
    estadoCorte: Cycle["estadoCorte"];
  } | null;
  referencia: {
    fecha: string | null;
    estado: Reference["estado"];
    cobertura: Reference["coverage"];
  };
  motivos: string[];
} {
  const motivos: string[] = [];
  if (context === null) {
    motivos.push("Contexto de ciclos no disponible.");
    return {
      ciclo: null,
      referencia: { fecha: null, estado: "error", cobertura: [] },
      motivos,
    };
  }
  if (context.motivo === "sin_ciclos")
    motivos.push("Sin ciclos registrados.");
  else if (context.motivo === "sin_referencia")
    motivos.push("Sin referencia financiera central.");
  else if (context.motivo === "error_referencia")
    motivos.push("Error en una fuente de referencia.");
  else if (context.motivo === "sin_ciclo_actual")
    motivos.push("Sin ciclo actual para la referencia financiera.");
  const actual = context.actual;
  return {
    ciclo: actual
      ? {
          id: actual.id,
          inicio: actual.inicio,
          fin: actual.fin,
          mesFinanciado: actual.mesFinanciado.slice(0, 7),
          estadoTemporal: actual.estadoTemporal,
          corte: actual.corte,
          estadoCorte: actual.estadoCorte,
        }
      : null,
    referencia: {
      fecha: context.referencia.fecha,
      estado: context.referencia.estado,
      cobertura: context.referencia.coverage,
    },
    motivos,
  };
}

function revisionOf(input: {
  context: ReturnType<typeof cycleContext> | null;
  flow: MonthlyFlow | null;
  annual: RacionalDto | null;
  annualRevision: string | null;
  saldos: SaldosRead;
  ahorro: ReturnType<typeof ahorroSection>;
  inversion: ReturnType<typeof inversionSection>;
  deuda: ReturnType<typeof deudaSection>;
  pendientes: ReturnType<typeof pendientesSection>;
  exercise: number | null;
}) {
  return fingerprint([
    input.context === null
      ? null
      : {
          actual: input.context.actual
            ? {
                id: input.context.actual.id,
                inicio: input.context.actual.inicio,
                fin: input.context.actual.fin,
                mesFinanciado: input.context.actual.mesFinanciado,
                corte: input.context.actual.corte,
                revision: input.context.actual.revision,
              }
            : null,
          referencia: input.context.referencia,
          motivo: input.context.motivo,
          revision: input.context.revision,
        },
    input.flow?.revision ?? null,
    input.flow?.metrics ?? null,
    input.exercise,
    input.annual,
    input.annualRevision,
    input.saldos.items,
    input.saldos.failures,
    input.ahorro.posiciones,
    input.inversion.agregado,
    input.inversion.posiciones,
    input.inversion.efectivo,
    input.inversion.cobertura,
    input.deuda.items,
    input.deuda.total,
    input.deuda.aparte,
    input.pendientes.items.map((item) => item.fuente),
    input.pendientes.fuenteFallos.map((fallo) => ({
      motor: fallo.motor,
      id: fallo.id,
    })),
  ]);
}

export function resumenInicio(
  db: Database,
  now = Date.now(),
  options: ResumenInicioOptions = {},
) {
  const motivos: string[] = [];

  let context: ReturnType<typeof cycleContext> | null = null;
  try {
    context = cycleContext(db);
  } catch (error) {
    motivos.push(`Contexto de ciclos no disponible: ${errorMessage(error)}.`);
  }
  const contextBase = contextDto(context);
  motivos.push(...contextBase.motivos);
  const cycle = context?.actual ?? null;

  const saldosRead = readSaldos(db);
  if (saldosRead.error !== null) motivos.push(saldosRead.error);
  for (const failure of saldosRead.failures)
    motivos.push(`${failure.id}: ${failure.motivo}`);

  let flow: MonthlyFlow | null = null;
  let flowError: string | null = null;
  if (cycle === null) flowError = "Sin ciclo actual";
  else
    try {
      flow = monthlyFlow(db, cycle.id, now);
    } catch (error) {
      flowError = errorMessage(error);
      motivos.push(`E2.6 monthlyFlow no disponible: ${flowError}.`);
    }

  const saldos = saldosSection(saldosRead);
  const names = saldos.names;
  const liquidez = liquidezSection(flow, names, flowError);
  const objetivo = objetivoSection(flow, cycle, now, options, db);
  const ahorro = ahorroSection(flow, saldosRead, flowError);
  const corte = flow?.corteEfectivo ?? cycle?.corte ?? null;
  const inversion = inversionSection(db, corte);
  const deuda = deudaSection(db);
  const pendientes = pendientesSection(db, now);
  if (objetivo.error !== null)
    motivos.push(`E2.4 annualEquivalent no disponible: ${objetivo.error}.`);
  if (inversion.agregado === null) {
    motivos.push("Inversión no disponible.");
    motivos.push(...inversion.cobertura.motivos);
  }
  if (deuda.total.estado === "No disponible")
    motivos.push(deuda.total.motivo);
  if (pendientes.fuenteFallos.length > 0)
    motivos.push("E3.6 con fuentes parciales; consulta su cobertura.");

  const exercise =
    cycle === null ? null : Number(cycle.mesFinanciado.slice(0, 4));
  const revision = revisionOf({
    context,
    flow,
    annual: objetivo.costeEsencialMensual.racional,
    annualRevision: objetivo.contextRevision,
    saldos: saldosRead,
    ahorro,
    inversion,
    deuda,
    pendientes,
    exercise,
  });

  const pendientesDelModelo: string[] = [
    "Configuración R6 de meses objetivo y umbrales (solo mínimo objetivo; meses cubiertos no depende).",
  ];
  if (ahorro.ahorroCierre.estado === "No disponible")
    pendientesDelModelo.push(
      "Proveedor histórico de posiciones de ahorro (ahorroCierre y variación de ahorro).",
    );
  if (flow?.coberturaBancaria.verificada !== true)
    pendientesDelModelo.push(
      "Cobertura histórica del intervalo de E2.6 no acreditada; los importes se conservan como subtotales parciales.",
    );

  return {
    contexto: {
      ...contextBase,
      consulta: new Date(now).toISOString(),
      revision,
      motivos,
    },
    secciones: {
      liquidez: {
        metrica: liquidez.metrica,
        incluidos: liquidez.incluidos,
        excluidos: liquidez.excluidos,
      },
      objetivo: {
        metrica: objetivo.metrica,
        costeEsencialMensual: objetivo.costeEsencialMensual,
        mesesObjetivo: objetivo.mesesObjetivo,
        mesesCubiertos: objetivo.mesesCubiertos,
        zona: objetivo.zona,
      },
      ciclo: {
        ingresos: cicloMetric(
          "ingresos",
          "Ingresos",
          "real",
          flow,
          cycle,
          flowError,
        ),
        gasto: cicloMetric(
          "gasto",
          "Gasto bruto",
          "real",
          flow,
          cycle,
          flowError,
        ),
        extraordinaria: cicloMetric(
          "extraordinaria",
          "Amortización extraordinaria",
          "real",
          flow,
          cycle,
          flowError,
        ),
        operativo: cicloMetric(
          "operativo",
          "Saldo operativo bruto observado",
          "real",
          flow,
          cycle,
          flowError,
        ),
        margenReal: cicloMetric(
          "margenReal",
          "Margen frente a nómina real",
          "plan",
          flow,
          cycle,
          flowError,
        ),
        nomina: cicloMetric(
          "nomina",
          "Nómina cobrada",
          "real",
          flow,
          cycle,
          flowError,
        ),
        base: cicloMetric(
          "base",
          "Base planificada",
          "plan",
          flow,
          cycle,
          flowError,
        ),
        delMes: cicloMetric(
          "delMes",
          "Del mes planificado",
          "plan",
          flow,
          cycle,
          flowError,
        ),
        ...(flowError !== null && flow === null
          ? { motivo: flowError }
          : {}),
      },
      saldos: {
        contexto: saldos.contexto,
        conteos: saldos.conteos,
        items: saldos.items,
        cobertura: saldos.cobertura,
        fuente: saldos.fuente,
        enlace: saldos.enlace,
      },
      ahorro: {
        contexto: ahorro.contexto,
        posiciones: ahorro.posiciones,
        ahorroCierre: ahorro.ahorroCierre,
        variacionAhorro: ahorro.variacionAhorro,
        ahorroResidual: ahorro.ahorroResidual,
        fuente: ahorro.fuente,
        enlace: ahorro.enlace,
      },
      inversion,
      deudaNoHipotecaria: deuda,
      pendientes,
    },
    pendientesDelModelo,
  };
}

export type ResumenInicio = ReturnType<typeof resumenInicio>;
