import type { Database } from "bun:sqlite";
import { cycleMaster, getCycle, type Cycle } from "./ciclos";
import { e35Metrics } from "./e35";
import { decimal, money, Problem } from "./saldos";

/**
 * E3.6 — conciliación analítica entre ciclos.
 *
 * Consume el read model E3.5 (`e35Metrics`) sin recalcular Neto, FIN_NETA,
 * Base ni Cierre. `DIF_S0_SIGUIENTE` y `DIF_BANCO` se exponen separadas:
 * usan ventanas y fuentes distintas y nunca se fusionan ni se convierten en
 * cero. No hay foto ni cierre: AC-31 sigue BLOCKED por E4.8/E4.9.
 */

export type E35Metrics = ReturnType<typeof e35Metrics>;
export type LecturaE35 = {
  metrics: E35Metrics | null;
  error: string | null;
};
export type ConciliacionCobertura = "Verificada" | "No disponible";
export type ConciliacionEstado = "Alerta" | "Coincide" | "No disponible";
export type ConciliacionCiclo = {
  tipo: "Conciliacion";
  claveEfimera: string;
  ciclo: {
    id: string;
    inicio: string;
    fin: string | null;
    estado: "Abierto" | "Con fin temporal";
    revision: number;
    s0: string;
  };
  siguiente: {
    id: string;
    inicio: string;
    s0: string;
  } | null;
  baseAnalitica: string | null;
  otrosEfectos: string | null;
  cierreAnalitico: string | null;
  /** Saldo inicial comida manual del ciclo conciliado; nunca se modifica. */
  s0: string;
  s0Siguiente: string | null;
  /** Posición bancaria al Inicio del ciclo (B_A), si E3.5 la acredita. */
  bA: string | null;
  /** S0 siguiente − Cierre analítico. Solo aviso. */
  difS0Siguiente: string | null;
  /** S0 del ciclo − B_A. Ventana distinta; nunca se suma a la anterior. */
  difBanco: string | null;
  cobertura: ConciliacionCobertura;
  estado: ConciliacionEstado;
  motivo: string | null;
  motivoBanco: string | null;
  fuente: {
    motor: "Comida E3.5";
    ciclo: string;
    revision: null;
    soloLectura: true;
  };
  calculoVivo: true;
  /** No existe fotografía/cierre persistido; AC-31 no se implementa aquí. */
  foto: null;
  noEsCierreFinanciero: true;
  enlaces: { tipo: "Comida" | "Ciclo"; href: string }[];
};

const diferencia = (a: string | null, b: string | null) => {
  if (a === null || b === null) return null;
  const x = money(a),
    y = money(b);
  return x === null || y === null ? null : decimal(x - y);
};

export function leerE35(
  db: Database,
  cicloId: string,
  now = Date.now(),
): LecturaE35 {
  try {
    return { metrics: e35Metrics(db, cicloId, now), error: null };
  } catch (error) {
    return {
      metrics: null,
      error:
        error instanceof Problem ? error.message : "Fuente Comida E3.5 no legible.",
    };
  }
}

export function cicloSiguiente(cycles: readonly Cycle[], ciclo: Cycle) {
  return (
    cycles
      .filter((c) => c.inicio > ciclo.inicio)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))[0] ?? null
  );
}

export type ConciliacionInput = {
  ciclo: Cycle;
  siguiente: Cycle | null;
  metrics: E35Metrics | null;
  error: string | null;
};

export function calcularConciliacion(
  input: ConciliacionInput,
): ConciliacionCiclo {
  const { ciclo, siguiente, metrics, error } = input;
  const puente = metrics?.puente ?? null;
  const pb = metrics?.posicionBancaria;
  const bA =
    pb && "alInicio" in pb && typeof pb.alInicio === "string"
      ? pb.alInicio
      : null;
  const s0 = ciclo.saldoInicialComida;
  const s0Siguiente = siguiente?.saldoInicialComida ?? null;

  const motivoCobertura =
    metrics === null
      ? (error ?? "Fuente Comida E3.5 no disponible.")
      : (metrics.proveedor.motivo ??
        (metrics.cobertura.motivos.length
          ? metrics.cobertura.motivos.join(" ")
          : null) ??
        "Sin proveedor/cobertura verificable.");
  const cobertura: ConciliacionCobertura =
    metrics !== null &&
    metrics.proveedor.cobertura === "Verificada" &&
    metrics.proveedor.bloqueo.verificable &&
    puente !== null
      ? "Verificada"
      : "No disponible";

  const cierre = puente?.cierreAnalitico ?? null;
  const difS0Siguiente =
    cobertura === "Verificada" && siguiente !== null
      ? diferencia(s0Siguiente, cierre)
      : null;
  const difBanco = bA === null ? null : diferencia(s0, bA);

  const estado: ConciliacionEstado =
    error !== null || metrics === null
      ? "No disponible"
      : siguiente === null
        ? "No disponible"
        : cobertura !== "Verificada" || difS0Siguiente === null
          ? "No disponible"
          : difS0Siguiente === "0.00"
            ? "Coincide"
            : "Alerta";

  const motivo =
    estado === "Alerta"
      ? "Alerta de conciliación: el saldo inicial siguiente no coincide con el cierre analítico de Comida. Solo aviso; no modifica el S0 ni crea asiento."
      : estado === "Coincide"
        ? null
        : error !== null || metrics === null
          ? `No disponible: ${motivoCobertura}`
          : siguiente === null
            ? "No disponible: sin siguiente Inicio; no se calcula la apertura del ciclo siguiente."
            : cobertura !== "Verificada"
              ? `No disponible: ${motivoCobertura}`
              : "No disponible: cierre analítico no calculable con la cobertura actual.";

  const motivoBanco =
    difBanco === null
      ? "DIF_BANCO no disponible: B_A no acreditado por el motor E3.5."
      : difBanco === "0.00"
        ? "DIF_BANCO cero verificado; no se suma a DIF_S0_SIGUIENTE."
        : "DIF_BANCO informada aparte; no se fusiona con DIF_S0_SIGUIENTE.";

  return {
    tipo: "Conciliacion",
    claveEfimera: `Conciliacion:${ciclo.id}:${siguiente?.inicio ?? "sin-siguiente"}`,
    ciclo: {
      id: ciclo.id,
      inicio: ciclo.inicio,
      fin: ciclo.fin,
      estado: ciclo.estadoTemporal,
      revision: ciclo.revision,
      s0,
    },
    siguiente: siguiente
      ? { id: siguiente.id, inicio: siguiente.inicio, s0: siguiente.saldoInicialComida }
      : null,
    baseAnalitica: puente?.baseAnalitica ?? null,
    otrosEfectos: puente?.otrosEfectos ?? null,
    cierreAnalitico: cierre,
    s0,
    s0Siguiente,
    bA,
    difS0Siguiente,
    difBanco,
    cobertura,
    estado,
    motivo,
    motivoBanco,
    fuente: {
      motor: "Comida E3.5",
      ciclo: ciclo.id,
      revision: null,
      soloLectura: true,
    },
    calculoVivo: true,
    foto: null,
    noEsCierreFinanciero: true,
    enlaces: [
      { tipo: "Comida", href: `/comida?ciclo=${encodeURIComponent(ciclo.id)}` },
      {
        tipo: "Ciclo",
        href: `/ciclos/${encodeURIComponent(siguiente?.id ?? ciclo.id)}`,
      },
    ],
  };
}

export function conciliacionDesde(
  db: Database,
  cicloId: string,
  lectura?: LecturaE35,
  now = Date.now(),
): ConciliacionCiclo {
  const { ciclo } = getCycle(db, cicloId);
  const siguiente = cicloSiguiente(cycleMaster(db), ciclo);
  const result = lectura ?? leerE35(db, cicloId, now);
  return calcularConciliacion({
    ciclo,
    siguiente,
    metrics: result.metrics,
    error: result.error,
  });
}

export function conciliacionCiclo(
  db: Database,
  cicloId: string,
  now = Date.now(),
) {
  return conciliacionDesde(db, cicloId, undefined, now);
}

export function listConciliaciones(
  db: Database,
  params = new URLSearchParams(),
) {
  return db.transaction(() => {
    const page = Number(params.get("page") ?? 1);
    const pageSize = Number(params.get("pageSize") ?? 100);
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    )
      throw new Problem(422, "VALIDATION", "Página o tamaño inválidos.");
    const cycles = cycleMaster(db),
      selected = params.get("ciclo");
    if (selected && !cycles.some((c) => c.id === selected))
      throw new Problem(422, "VALIDATION", "Ciclo no encontrado.");
    const items = cycles
      .filter((c) => !selected || c.id === selected)
      .map((c) => conciliacionDesde(db, c.id, leerE35(db, c.id)));
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
    };
  })();
}
