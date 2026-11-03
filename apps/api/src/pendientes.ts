import type { Database } from "bun:sqlite";
import { getAnticipo } from "./anticipos";
import { getCompartido } from "./compartidos";
import { cycleMaster, type Cycle } from "./ciclos";
import {
  calcularConciliacion,
  cicloSiguiente,
  leerE35,
  type ConciliacionCiclo,
  type LecturaE35,
} from "./conciliacion-ciclos";
import { ledgerRows } from "./movement-ledger";
import { monthlyFlow, observedOperating } from "./flujo-mensual";
import { Problem, money } from "./saldos";

/**
 * E3.6 — read model transversal de pendientes.
 *
 * Compone una fila por caso/tipo a partir de los motores propietarios
 * (Anticipos, Compartidos, Comida E3.5 y Ciclos/Conciliación). No persiste
 * casos, estados ni importes, no crea una tabla ni un total económico global
 * entre tipos y no escribe hechos. Las claves de fila son efímeras.
 *
 * Reglas de lectura:
 * - `R_caja` y `R_obl` no se suman: cada motor expone la suya.
 * - `C_n` y `J_n` ya son netos; aquí solo se transportan.
 * - `null` (No disponible) nunca se serializa como `"0.00"`.
 * - Un fallo de una fuente por fila produce `No disponible` con motivo y no
 *   tumba el resto de la lista; el 409 de `e35Metrics` se aísla por ciclo.
 */

export type EstadoItem =
  | "Pendiente"
  | "Exceso"
  | "Revisar"
  | "Alerta"
  | "No disponible"
  | "Resuelto";
export type TipoItem = "Anticipo" | "Compartido" | "Comida" | "Conciliacion";
export type Cobertura = "Verificada" | "Parcial" | "No disponible" | "No aplica";
export type Severidad = "Alerta de conciliación" | "No disponible" | null;
export type Alcance = "abiertos" | "historico";

export type MetricaItem = {
  clave: string;
  etiqueta: string;
  importe: string | null;
  estado: EstadoItem | null;
  cobertura: Cobertura;
  motivo: string | null;
};
export type ContextoHecho = {
  tipo:
    | "Gasto"
    | "Ingreso"
    | "Transferencia"
    | "Amortizacion"
    | "Aportacion"
    | "Adelanto"
    | "Devolucion"
    | "Comida"
    | "Cierre";
  fuenteId: string;
  fecha: string | null;
  cicloId: string | null;
  ejercicio: number | null;
};
export type TransversalItem = {
  claveEfimera: string;
  tipo: TipoItem;
  fuente: {
    motor: "Anticipos" | "Compartidos" | "Comida E3.5" | "Ciclos/Conciliación";
    id: string;
    revision: number | null;
  };
  caso: { id: string; nombre: string | null } | null;
  ciclo: {
    id: string;
    inicio: string;
    fin: string | null;
    estado: "Abierto" | "Con fin temporal";
  } | null;
  ejercicio: number | null;
  fechaHecho: string | null;
  magnitud: string;
  importe: string | null;
  signo: "Deuda" | "Exceso" | "Diferencia" | "Informativo" | null;
  estado: EstadoItem;
  cobertura: Cobertura;
  severidad: Severidad;
  motivo: string | null;
  detalle: { etiqueta: string; valor: string | null }[];
  metricas: MetricaItem[];
  contextos: ContextoHecho[];
  alertas: {
    tipo: "Exceso" | "Revisar" | "No disponible";
    importe: string | null;
    participanteId: string | null;
    motivo: string;
  }[];
  enlaces: {
    tipo: "Anticipo" | "Compartido" | "Comida" | "Flujo" | "Plan" | "Ciclo";
    href: string;
  }[];
};
export type FuenteFallo = {
  motor: string;
  id: string | null;
  motivo: string;
};
export type FiltrosPendientes = {
  tipo: TipoItem | null;
  estado: EstadoItem | null;
  ciclo: string | null;
  ejercicio: number | null;
  cobertura: Cobertura | null;
  alcance: Alcance;
  texto: string | null;
  page: number;
  pageSize: number;
};
export type FlujoBase = {
  cicloId: string;
  gastoBruto: string | null;
  sBruto: string | null;
  cobertura: "Parcial" | "No disponible";
  motivo: string | null;
};
export type ListaPendientes = {
  filas: TransversalItem[];
  total: number;
  page: number;
  pageSize: number;
  conteos: Record<EstadoItem, number>;
  fuenteFallos: FuenteFallo[];
  /** No existe un total económico entre tipos; solo conteos de filas. */
  sinTotalEconomico: true;
  soloLectura: true;
  filtros: Omit<FiltrosPendientes, "page" | "pageSize">;
  /** Contexto E2.6 del ciclo filtrado, nunca un total de pendientes. */
  flujoBase: FlujoBase | null;
};

const TIPOS: TipoItem[] = ["Anticipo", "Compartido", "Comida", "Conciliacion"];
const ESTADOS: EstadoItem[] = [
  "Pendiente",
  "Exceso",
  "Revisar",
  "Alerta",
  "No disponible",
  "Resuelto",
];
const COBERTURAS: Cobertura[] = [
  "Verificada",
  "Parcial",
  "No disponible",
  "No aplica",
];
const RANGO: Record<EstadoItem, number> = {
  Revisar: 0,
  Pendiente: 1,
  Exceso: 2,
  Alerta: 3,
  "No disponible": 4,
  Resuelto: 5,
};

type EngineMetric = {
  valor: string | null;
  subtotal?: string | null;
  estado: string;
  motivo: string;
};
type AnticipoDTO = ReturnType<typeof getAnticipo>;
type CompartidoDTO = ReturnType<typeof getCompartido>;

const yearOf = (fecha: string | null) =>
  fecha === null ? null : Number(fecha.slice(0, 4));
const cents = (value: string | null | undefined) =>
  value === null || value === undefined ? null : money(value);
const cycleAt = (cycles: readonly Cycle[], fecha: string) =>
  cycles.find(
    (c) => c.inicio <= fecha && (c.fin === null || fecha <= c.fin),
  ) ?? null;

function coberturaDe(estado: string | null | undefined): Cobertura {
  if (
    estado === "Verificada" ||
    estado === "Verificado" ||
    estado === "Cero verificado" ||
    estado === "Verificable"
  )
    return "Verificada";
  if (estado === "Parcial") return "Parcial";
  if (estado === "No aplica") return "No aplica";
  return "No disponible";
}

/** `null` no se rellena con cero; un subtotal parcial sí puede mostrarse como subtotal. */
function importeDe(metrica: EngineMetric): string | null {
  if (metrica.valor !== null) return metrica.valor;
  if (metrica.estado === "Parcial" && metrica.subtotal != null)
    return metrica.subtotal;
  return null;
}

function metricaDesde(
  clave: string,
  etiqueta: string,
  metrica: EngineMetric,
  estado: EstadoItem | null = null,
): MetricaItem {
  return {
    clave,
    etiqueta,
    importe: importeDe(metrica),
    estado,
    cobertura: coberturaDe(metrica.estado),
    motivo: metrica.motivo || null,
  };
}

function cicloDto(ciclo: Cycle | null): TransversalItem["ciclo"] {
  return ciclo
    ? {
        id: ciclo.id,
        inicio: ciclo.inicio,
        fin: ciclo.fin,
        estado: ciclo.estadoTemporal,
      }
    : null;
}

function contextoTipo(tipo: string): ContextoHecho["tipo"] {
  if (tipo === "Gasto") return "Gasto";
  if (tipo === "Ingreso") return "Ingreso";
  if (tipo === "Transferencia") return "Transferencia";
  if (tipo === "Devolución de gasto") return "Devolucion";
  if (tipo === "Amortización deuda") return "Amortizacion";
  return "Gasto";
}

function contexto(
  tipo: ContextoHecho["tipo"],
  fuenteId: string,
  fecha: string | null,
  cycles: readonly Cycle[],
): ContextoHecho {
  return {
    tipo,
    fuenteId,
    fecha,
    cicloId: fecha === null ? null : (cycleAt(cycles, fecha)?.id ?? null),
    ejercicio: yearOf(fecha),
  };
}

function ultimaFecha(contextos: ContextoHecho[]) {
  return (
    contextos
      .map((c) => c.fecha)
      .filter((f): f is string => f !== null)
      .sort()
      .at(-1) ?? null
  );
}

function motivoDeAlertas(
  motivo: string | null,
  alertas: TransversalItem["alertas"],
) {
  if (motivo) return motivo;
  const unicos = [...new Set(alertas.map((a) => a.motivo))];
  return unicos.length ? unicos.join(" ") : null;
}

function severidadDe(estado: EstadoItem): Severidad {
  if (estado === "Alerta") return "Alerta de conciliación";
  if (estado === "No disponible") return "No disponible";
  return null;
}

function filaNoDisponible(
  db: Database,
  tipo: TipoItem,
  fuenteId: string,
  motivo: string,
  enlaces: TransversalItem["enlaces"],
): TransversalItem {
  let nombre: string | null = null;
  try {
    nombre =
      (
        db.query("SELECT nombre FROM referencias WHERE id=?").get(fuenteId) as {
          nombre: string;
        } | null
      )?.nombre ?? null;
  } catch {
    nombre = null;
  }
  const motor =
    tipo === "Anticipo"
      ? "Anticipos"
      : tipo === "Compartido"
        ? "Compartidos"
        : tipo === "Comida"
          ? "Comida E3.5"
          : "Ciclos/Conciliación";
  return {
    claveEfimera: `${tipo}:${fuenteId}:sin-contexto`,
    tipo,
    fuente: { motor, id: fuenteId, revision: null },
    caso: nombre === null ? null : { id: fuenteId, nombre },
    ciclo: null,
    ejercicio: null,
    fechaHecho: null,
    magnitud: "No disponible",
    importe: null,
    signo: null,
    estado: "No disponible",
    cobertura: "No disponible",
    severidad: "No disponible",
    motivo,
    detalle: [],
    metricas: [],
    contextos: [],
    alertas: [{ tipo: "No disponible", importe: null, participanteId: null, motivo }],
    enlaces,
  };
}

function filaAnticipo(
  db: Database,
  dto: AnticipoDTO,
  cycles: readonly Cycle[],
): TransversalItem {
  const ref = dto.referencia,
    id = ref.id,
    contextos = [
      ...dto.operaciones
        .filter((o) => o.tipo === "Transferencia")
        .map((o) =>
          contexto(
            !o.elegible
              ? "Transferencia"
              : o.atribucion?.rol === "Devolución"
                ? "Devolucion"
                : o.atribucion?.rol === "Adelanto"
                  ? "Adelanto"
                  : "Transferencia",
            o.id,
            o.fecha,
            cycles,
          ),
        ),
      ...dto.relacionados.map((r) =>
        contexto(contextoTipo(r.tipo), r.id, r.fecha, cycles),
      ),
    ],
    fechaHecho = dto.ultimaActividad ?? ultimaFecha(contextos),
    ciclo = fechaHecho === null ? null : cycleAt(cycles, fechaHecho);
  const foto = ciclo ? dto.fotos.find((f) => f.ciclo === ciclo.id) : null;
  const fotoVerificada =
    foto != null && /^Verificada/i.test(foto.cobertura ?? "");
  const neto = dto.neto,
    exceso = dto.exceso,
    netoCents = cents(neto),
    excesoCents = cents(exceso);
  const pendientes = dto.pendientesAcreditacion.length;
  const motivoCobertura = pendientes
    ? `Cobertura ${dto.cobertura}: ${dto.pendientesAcreditacion
        .map((o) => `${o.id} ${o.motivo ?? "sin acreditar"}`)
        .join("; ")}.`
    : `Cobertura ${dto.cobertura}.`;

  let estado: EstadoItem;
  let importe: string | null;
  let cobertura: Cobertura;
  let motivo: string | null = null;
  let magnitud = "Neto pendiente";
  let signo: TransversalItem["signo"] = null;

  if (neto === null || dto.cobertura === "No disponible") {
    estado = "No disponible";
    importe = null;
    cobertura = "No disponible";
    motivo =
      pendientes > 0
        ? motivoCobertura
        : "Neto actual no disponible: sin hechos acreditados verificables.";
  } else if (dto.estado === "Revisar") {
    estado = "Revisar";
    importe = importeDe({
      valor: neto,
      subtotal: dto.subtotal.neto,
      estado: "Parcial",
      motivo: motivoCobertura,
    });
    cobertura = "Parcial";
    motivo = motivoCobertura;
  } else if (netoCents !== null && netoCents > 0) {
    estado = "Pendiente";
    importe = neto;
    cobertura = "Verificada";
    magnitud = "Neto pendiente";
    signo = "Deuda";
  } else if (excesoCents !== null && excesoCents > 0) {
    estado = "Exceso";
    importe = exceso;
    cobertura = "Verificada";
    magnitud = "Exceso";
    signo = "Exceso";
  } else {
    estado = "Resuelto";
    importe = neto;
    cobertura = "Verificada";
    magnitud = "Neto recuperado";
  }

  const alertas: TransversalItem["alertas"] = [];
  if (estado === "Pendiente" && excesoCents !== null && excesoCents > 0)
    alertas.push({
      tipo: "Exceso",
      importe: exceso,
      participanteId: null,
      motivo: "Exceso en el caso; se conserva íntegro y no se compensa con el pendiente.",
    });
  if (contextos.length > 0 && !fotoVerificada)
    alertas.push({
      tipo: "No disponible",
      importe: null,
      participanteId: null,
      motivo: ciclo
        ? `Sin foto de Neto apertura verificada para el ciclo ${ciclo.id}.`
        : "Sin ciclo de contexto para la foto de Neto apertura.",
    });
  if (pendientes > 0 && estado !== "Revisar" && estado !== "No disponible")
    alertas.push({
      tipo: "Revisar",
      importe: null,
      participanteId: null,
      motivo: motivoCobertura,
    });

  const metricas: MetricaItem[] = [
    {
      clave: "neto",
      etiqueta: "Neto actual",
      importe,
      estado,
      cobertura,
      motivo: motivo ?? "Importe actual, no un pendiente al corte.",
    },
    metricaDesde(
      "exceso",
      "Exceso actual",
      {
        valor: exceso,
        subtotal: dto.subtotal.exceso,
        estado: dto.cobertura,
        motivo:
          dto.cobertura === "No disponible"
            ? "Exceso no verificable con la cobertura actual."
            : "Exceso íntegro; no se compensa con otros pares.",
      },
      excesoCents !== null && excesoCents > 0 ? "Exceso" : null,
    ),
    {
      clave: "netoApertura",
      etiqueta: "Neto apertura (foto por REF+Ciclo)",
      importe: fotoVerificada ? (foto?.importe ?? null) : null,
      estado: null,
      cobertura: fotoVerificada ? "Verificada" : "No disponible",
      motivo: fotoVerificada
        ? "Foto del instante de apertura; no se sustituye por el Neto actual."
        : ciclo
          ? `Sin foto de Neto apertura verificada para el ciclo ${ciclo.id}.`
          : "Sin ciclo de contexto para la foto de apertura.",
    },
    {
      clave: "hechosPendientes",
      etiqueta: "Hechos pendientes de acreditación",
      importe: null,
      estado: pendientes > 0 ? "Revisar" : null,
      cobertura:
        pendientes > 0
          ? coberturaDe(dto.cobertura)
          : ("No aplica" as Cobertura),
      motivo:
        pendientes > 0
          ? `Transferencias sin acreditar: ${dto.pendientesAcreditacion.map((o) => o.id).join(", ")}.`
          : "Sin Transferencias pendientes de acreditación.",
    },
  ];

  const detalle: TransversalItem["detalle"] = [
    { etiqueta: "Neto actual (no al corte)", valor: neto },
    { etiqueta: "Exceso", valor: exceso },
    {
      etiqueta: "Neto apertura (foto)",
      valor: fotoVerificada ? (foto?.importe ?? null) : null,
    },
    { etiqueta: "Hechos sin acreditar", valor: String(pendientes) },
    { etiqueta: "Cobertura del motor", valor: dto.cobertura },
  ];

  return {
    claveEfimera: `Anticipo:${id}:${ciclo?.id ?? "sin-ciclo"}:${yearOf(fechaHecho) ?? "sin-ejercicio"}`,
    tipo: "Anticipo",
    fuente: {
      motor: "Anticipos",
      id,
      revision: ref.revision ?? null,
    },
    caso: { id, nombre: ref.nombre },
    ciclo: cicloDto(ciclo),
    ejercicio: yearOf(fechaHecho),
    fechaHecho,
    magnitud,
    importe,
    signo,
    estado,
    cobertura,
    severidad: severidadDe(estado),
    motivo: motivoDeAlertas(motivo, alertas),
    detalle,
    metricas,
    contextos,
    alertas,
    enlaces: [{ tipo: "Anticipo", href: `/anticipos/${encodeURIComponent(id)}` }],
  };
}

function filaCompartido(
  dto: CompartidoDTO,
  cycles: readonly Cycle[],
): TransversalItem {
  const ref = dto.referencia,
    id = ref.id,
    resumen = dto.resumen;
  const contextos = [
    ...dto.gastos.map((g) => contexto("Gasto", g.id, g.fecha, cycles)),
    ...dto.aportaciones.map((a) =>
      contexto("Aportacion", a.movimiento, a.fecha, cycles),
    ),
    ...dto.historicos.map((h) =>
      contexto("Transferencia", h.movimiento, h.fecha, cycles),
    ),
    ...dto.relacionados.map((r) =>
      contexto(contextoTipo(r.tipo), r.id, r.fecha, cycles),
    ),
  ];
  const fechaHecho = ultimaFecha(contextos),
    ciclo = fechaHecho === null ? null : cycleAt(cycles, fechaHecho);
  const pendiente = resumen.pendienteTerceros,
    exceso = resumen.exceso,
    pendienteCents = cents(pendiente.valor),
    excesoCents = cents(exceso.valor);
  const caseState = resumen.estado;

  let estado: EstadoItem;
  let importe: string | null;
  let cobertura: Cobertura;
  let motivo: string | null = null;
  let magnitud = "Pendiente de terceros";
  let signo: TransversalItem["signo"] = null;

  if (caseState === "Sin repartir") {
    estado = "No disponible";
    importe = null;
    cobertura = "No disponible";
    motivo = resumen.cobertura.motivo;
    magnitud = "Estado del reparto";
  } else if (caseState === "Revisar") {
    estado = "Revisar";
    importe = importeDe(pendiente);
    cobertura = coberturaDe(pendiente.estado);
    motivo =
      resumen.alertas.find((a) => a.tipo === "revisar")?.motivo ??
      resumen.cobertura.motivo;
    magnitud = "Estado del reparto";
  } else if (pendienteCents !== null && pendienteCents > 0) {
    estado = "Pendiente";
    importe = importeDe(pendiente);
    cobertura = coberturaDe(pendiente.estado);
    magnitud = "Pendiente de terceros";
    signo = "Deuda";
  } else if (excesoCents !== null && excesoCents > 0) {
    estado = "Exceso";
    importe = importeDe(exceso);
    cobertura = coberturaDe(exceso.estado);
    magnitud = "Exceso de terceros";
    signo = "Exceso";
  } else {
    estado = "Resuelto";
    importe = importeDe(pendiente);
    cobertura =
      pendiente.estado === "No aplica"
        ? "No aplica"
        : coberturaDe(pendiente.estado);
    magnitud = "Pendiente de terceros";
    if (importe === null)
      motivo =
        "No aplica: el caso no tiene terceros con cuota; no hay pendiente estructural.";
  }

  const alertas: TransversalItem["alertas"] = [];
  const avisosExceso = resumen.alertas.filter((a) => a.tipo === "exceso");
  if (avisosExceso.length)
    for (const a of avisosExceso)
      alertas.push({
        tipo: "Exceso",
        importe: a.importe ?? null,
        participanteId: a.participanteId ?? null,
        motivo: a.motivo,
      });
  else if (excesoCents !== null && excesoCents > 0)
    alertas.push({
      tipo: "Exceso",
      importe: exceso.valor,
      participanteId: null,
      motivo:
        "Exceso de tercero; se conserva íntegro y no se compensa con pendientes.",
    });
  for (const a of resumen.alertas)
    if (a.tipo === "revisar")
      alertas.push({
        tipo: "Revisar",
        importe: a.importe ?? null,
        participanteId: a.participanteId ?? null,
        motivo: a.motivo,
      });

  const metricas: MetricaItem[] = [
    metricaDesde(
      "pendienteTerceros",
      "Pendiente de terceros",
      pendiente,
      pendienteCents !== null && pendienteCents > 0 ? "Pendiente" : null,
    ),
    metricaDesde(
      "exceso",
      "Exceso de terceros",
      exceso,
      excesoCents !== null && excesoCents > 0 ? "Exceso" : null,
    ),
    metricaDesde("neto", "Neto central (B − R)", resumen.neto),
    metricaDesde("costePropio", "Coste propio del Titular", resumen.costePropio),
    metricaDesde("bruto", "Bruto compartido", resumen.bruto),
    metricaDesde("recuperado", "Recuperado acreditado", resumen.recuperado),
  ];
  const detalle: TransversalItem["detalle"] = [
    { etiqueta: "Estado del caso", valor: caseState },
    { etiqueta: "Neto central (B − R)", valor: importeDe(resumen.neto) },
    { etiqueta: "Coste propio", valor: importeDe(resumen.costePropio) },
    { etiqueta: "Bruto", valor: importeDe(resumen.bruto) },
    { etiqueta: "Recuperado", valor: importeDe(resumen.recuperado) },
    { etiqueta: "Cobertura", valor: resumen.cobertura.estado },
  ];

  return {
    claveEfimera: `Compartido:${id}:${ciclo?.id ?? "sin-ciclo"}:${yearOf(fechaHecho) ?? "sin-ejercicio"}`,
    tipo: "Compartido",
    fuente: {
      motor: "Compartidos",
      id,
      revision: ref.revision ?? dto.ficha.revision ?? null,
    },
    caso: { id, nombre: ref.nombre },
    ciclo: cicloDto(ciclo),
    ejercicio: yearOf(fechaHecho),
    fechaHecho,
    magnitud,
    importe,
    signo,
    estado,
    cobertura,
    severidad: severidadDe(estado),
    motivo: motivoDeAlertas(motivo, alertas),
    detalle,
    metricas,
    contextos,
    alertas,
    enlaces: [
      { tipo: "Compartido", href: `/compartidos/${encodeURIComponent(id)}` },
    ],
  };
}

function filaComida(
  db: Database,
  ciclo: Cycle,
  lectura: LecturaE35,
  cycles: readonly Cycle[],
): TransversalItem {
  if (lectura.metrics === null) {
    const motivo = `No disponible: ${lectura.error ?? "Fuente Comida E3.5 no legible."}`;
    const fila = filaNoDisponible(db, "Comida", ciclo.id, motivo, [
      { tipo: "Comida", href: `/comida?ciclo=${encodeURIComponent(ciclo.id)}` },
      { tipo: "Ciclo", href: `/ciclos/${encodeURIComponent(ciclo.id)}` },
    ]);
    return {
      ...fila,
      ciclo: cicloDto(ciclo),
      caso: { id: ciclo.id, nombre: `Ciclo ${ciclo.inicio}` },
      fechaHecho: ciclo.fin ?? ciclo.inicio,
      ejercicio: yearOf(ciclo.fin ?? ciclo.inicio),
      claveEfimera: `Comida:${ciclo.id}:${yearOf(ciclo.fin ?? ciclo.inicio) ?? "sin-ejercicio"}`,
    };
  }

  const m = lectura.metrics;
  const falta = m.faltaPorReponer,
    recursos = m.recursos,
    cierre = m.cierreAnalitico;
  const faltaImp = importeDe(falta),
    faltaCents = cents(faltaImp);
  const coberturaFalta = coberturaDe(falta.estado);
  const financiacionNd = m.financiacion.estado !== "Verificado";

  const contextos: ContextoHecho[] = [];
  const ledger = new Map(ledgerRows(db).map((row) => [row.id, row]));
  for (const id of [
    ...m.compras.bruto.ids,
    ...m.compensable.bruto.ids,
    ...m.fueraPresupuesto,
    ...m.reposiciones.ids,
  ]) {
    contextos.push(
      contexto("Comida", id, ledger.get(id)?.fecha ?? null, cycles),
    );
  }
  const fechaHecho = ultimaFecha(contextos) ?? ciclo.fin ?? ciclo.inicio;
  const principal = cycleAt(cycles, fechaHecho) ?? ciclo;

  let estado: EstadoItem;
  let importe: string | null;
  let cobertura: Cobertura = coberturaFalta;
  let motivo: string | null = null;
  let magnitud = "Falta por reponer";
  let signo: TransversalItem["signo"] = null;

  if (faltaImp === null) {
    estado = "No disponible";
    importe = null;
    cobertura = "No disponible";
    motivo = falta.motivo || "Falta por reponer no disponible con la cobertura actual.";
  } else if (faltaCents !== null && faltaCents > 0) {
    estado = "Pendiente";
    importe = faltaImp;
    signo = "Deuda";
    motivo = falta.motivo || null;
  } else if (financiacionNd || recursos.valor === null || cierre.valor === null) {
    // Cero conocido en una métrica no autoriza a presentar Recursos/Cierre
    // como cero: la fila queda No disponible con motivo.
    estado = "No disponible";
    importe = null;
    cobertura = "No disponible";
    motivo =
      m.financiacion.estado === "No disponible"
        ? (m.financiacion.motivo ?? "Financiación no disponible.")
        : (recursos.motivo ||
          cierre.motivo ||
          "Recursos/Cierre analítico no disponibles con la cobertura actual.");
  } else if (m.cobertura.estado === "Parcial" || m.cobertura.motivos.length) {
    estado = "Revisar";
    importe = faltaImp;
    cobertura = "Parcial";
    motivo = m.cobertura.motivos.join(" ") || "Cobertura parcial de Comida.";
  } else {
    estado = "Resuelto";
    importe = faltaImp;
    cobertura = "Verificada";
  }

  const alertas: TransversalItem["alertas"] = [];
  if (financiacionNd && estado !== "No disponible")
    alertas.push({
      tipo: "No disponible",
      importe: null,
      participanteId: null,
      motivo:
        m.financiacion.motivo ?? "Financiación no verificable.",
    });
  if (m.cobertura.motivos.length && estado !== "Revisar")
    alertas.push({
      tipo: "Revisar",
      importe: null,
      participanteId: null,
      motivo: m.cobertura.motivos.join(" "),
    });

  const metricas: MetricaItem[] = [
    {
      clave: "faltaPorReponer",
      etiqueta: "Falta por reponer",
      importe: faltaImp,
      estado: faltaCents !== null && faltaCents > 0 ? "Pendiente" : null,
      cobertura: coberturaFalta,
      motivo: falta.motivo || null,
    },
    metricaDesde("comidaNeta", "J_n (Gasto comida neto)", m.compras.neto),
    metricaDesde(
      "compensableNeto",
      "C_n (Compensable neto; no se resta dos veces)",
      m.compensable.neto,
    ),
    metricaDesde("recursos", "Recursos (S0 + FIN_NETA + R_caja − C_n)", recursos),
    metricaDesde("cierreAnalitico", "Cierre analítico", cierre),
    {
      clave: "reposicionesObligacion",
      etiqueta: "R_obl (obligación acreditada)",
      importe: m.reposiciones.obligacion,
      estado: null,
      cobertura: "Verificada",
      motivo: "Reposiciones con obligación explicada; no se suma a R_caja.",
    },
    {
      clave: "financiacion",
      etiqueta: "FIN_NETA (ya neta)",
      importe: m.financiacion.f,
      estado: null,
      cobertura:
        m.financiacion.estado === "Verificado" ? "Verificada" : "No disponible",
      motivo:
        m.financiacion.estado === "Verificado"
          ? "Se usa una sola vez; DEV_ANT no se resta otra vez."
          : (m.financiacion.motivo ?? "FIN_NETA no disponible."),
    },
  ];

  const detalle: TransversalItem["detalle"] = [
    { etiqueta: "J_n (Gasto comida neto)", valor: importeDe(m.compras.neto) },
    {
      etiqueta: "C_n (Compensable neto)",
      valor: importeDe(m.compensable.neto),
    },
    { etiqueta: "R_obl", valor: m.reposiciones.obligacion },
    {
      etiqueta: "R_caja",
      valor: m.financiacion.reposicionesCaja ?? null,
    },
    { etiqueta: "FIN_NETA", valor: m.financiacion.f ?? null },
    { etiqueta: "Recursos", valor: importeDe(recursos) },
    { etiqueta: "Cierre analítico", valor: importeDe(cierre) },
    {
      etiqueta: "Fuera presupuesto (excluido, conservado en banco)",
      valor: m.fueraPresupuesto.length ? m.fueraPresupuesto.join(", ") : null,
    },
    {
      etiqueta: "Obligación (R_obl vs C_n)",
      valor: m.obligacion.estado,
    },
    {
      etiqueta: "Cálculo",
      valor: "Vivo, sin foto; Comida no se suma ni se resta al flujo central.",
    },
  ];

  return {
    claveEfimera: `Comida:${ciclo.id}:${yearOf(fechaHecho) ?? "sin-ejercicio"}`,
    tipo: "Comida",
    fuente: {
      motor: "Comida E3.5",
      id: ciclo.id,
      revision: principal.revision,
    },
    caso: { id: ciclo.id, nombre: `Ciclo ${ciclo.inicio}` },
    ciclo: cicloDto(principal),
    ejercicio: yearOf(fechaHecho),
    fechaHecho,
    magnitud,
    importe,
    signo,
    estado,
    cobertura,
    severidad: severidadDe(estado),
    motivo: motivoDeAlertas(motivo, alertas),
    detalle,
    metricas,
    contextos,
    alertas,
    enlaces: [
      { tipo: "Comida", href: `/comida?ciclo=${encodeURIComponent(ciclo.id)}` },
      { tipo: "Ciclo", href: `/ciclos/${encodeURIComponent(ciclo.id)}` },
      { tipo: "Flujo", href: `/flujo-mensual?ciclo=${encodeURIComponent(ciclo.id)}` },
    ],
  };
}

function filaConciliacion(
  conciliacion: ConciliacionCiclo,
  cycles: readonly Cycle[],
): TransversalItem {
  const siguiente = conciliacion.siguiente;
  const abierto = siguiente
    ? (cycles.find((c) => c.id === siguiente.id) ?? null)
    : null;
  const fechaHecho = siguiente?.inicio ?? conciliacion.ciclo.fin;
  const contextos: ContextoHecho[] =
    conciliacion.ciclo.fin === null
      ? []
      : [
          contexto(
            "Cierre",
            conciliacion.ciclo.id,
            conciliacion.ciclo.fin,
            cycles,
          ),
        ];
  const estado: EstadoItem =
    conciliacion.estado === "Alerta"
      ? "Alerta"
      : conciliacion.estado === "Coincide"
        ? "Resuelto"
        : "No disponible";
  const alertas: TransversalItem["alertas"] =
    estado === "No disponible"
      ? [
          {
            tipo: "No disponible",
            importe: null,
            participanteId: null,
            motivo:
              conciliacion.motivo ?? "Conciliación no disponible con la cobertura actual.",
          },
        ]
      : [];
  const metricas: MetricaItem[] = [
    {
      clave: "diferenciaS0Siguiente",
      etiqueta: "DIF_S0_SIGUIENTE",
      importe: conciliacion.difS0Siguiente,
      estado:
        conciliacion.difS0Siguiente === null
          ? "No disponible"
          : estado === "Alerta"
            ? "Alerta"
            : null,
      cobertura:
        conciliacion.difS0Siguiente === null
          ? "No disponible"
          : conciliacion.cobertura,
      motivo: conciliacion.motivo,
    },
    {
      clave: "diferenciaBanco",
      etiqueta: "DIF_BANCO",
      importe: conciliacion.difBanco,
      estado: null,
      cobertura:
        conciliacion.difBanco === null ? "No disponible" : "Verificada",
      motivo: conciliacion.motivoBanco,
    },
    {
      clave: "baseAnalitica",
      etiqueta: "Base analítica",
      importe: conciliacion.baseAnalitica,
      estado: null,
      cobertura:
        conciliacion.baseAnalitica === null ? "No disponible" : "Verificada",
      motivo: conciliacion.baseAnalitica === null ? conciliacion.motivo : null,
    },
    {
      clave: "cierreAnalitico",
      etiqueta: "Cierre analítico",
      importe: conciliacion.cierreAnalitico,
      estado: null,
      cobertura:
        conciliacion.cierreAnalitico === null ? "No disponible" : "Verificada",
      motivo:
        conciliacion.cierreAnalitico === null ? conciliacion.motivo : null,
    },
  ];
  const detalle: TransversalItem["detalle"] = [
    { etiqueta: "Base analítica", valor: conciliacion.baseAnalitica },
    { etiqueta: "Otros efectos bancarios", valor: conciliacion.otrosEfectos },
    { etiqueta: "Cierre analítico", valor: conciliacion.cierreAnalitico },
    { etiqueta: "S0 siguiente (manual)", valor: conciliacion.s0Siguiente },
    { etiqueta: "B_A (posición al Inicio)", valor: conciliacion.bA },
    { etiqueta: "DIF_BANCO (separada)", valor: conciliacion.difBanco },
    { etiqueta: "Cobertura", valor: conciliacion.cobertura },
    {
      etiqueta: "Alcance",
      valor:
        "Cálculo vivo; no es cierre financiero ni foto E4 (AC-31 BLOCKED).",
    },
  ];

  return {
    claveEfimera: conciliacion.claveEfimera,
    tipo: "Conciliacion",
    fuente: {
      motor: "Ciclos/Conciliación",
      id: conciliacion.ciclo.id,
      revision: conciliacion.ciclo.revision,
    },
    caso: {
      id: siguiente?.id ?? conciliacion.ciclo.id,
      nombre: `Apertura ${siguiente?.inicio ?? "sin siguiente Inicio"}`,
    },
    ciclo: cicloDto(abierto),
    ejercicio: yearOf(fechaHecho),
    fechaHecho,
    magnitud: "Diferencia S0 siguiente",
    importe: conciliacion.difS0Siguiente,
    signo: estado === "Alerta" ? "Diferencia" : null,
    estado,
    cobertura: conciliacion.cobertura,
    severidad: severidadDe(estado),
    motivo: conciliacion.motivo,
    detalle,
    metricas,
    contextos,
    alertas,
    enlaces: conciliacion.enlaces,
  };
}

function actividadPorCiclo(db: Database, cycles: readonly Cycle[]) {
  const result = new Set<string>();
  for (const row of ledgerRows(db)) {
    if (row.anulado) continue;
    const ciclo = cycleAt(cycles, row.fecha);
    if (ciclo) result.add(ciclo.id);
  }
  return result;
}

function componer(db: Database, now: number) {
  const fuenteFallos: FuenteFallo[] = [];
  const cycles = cycleMaster(db);
  const actividad = actividadPorCiclo(db, cycles);
  const cache = new Map<string, LecturaE35>();
  const leer = (cicloId: string) => {
    if (!cache.has(cicloId)) cache.set(cicloId, leerE35(db, cicloId, now));
    return cache.get(cicloId)!;
  };
  const filas: TransversalItem[] = [];

  let anticipos: string[] = [];
  try {
    anticipos = (
      db.query("SELECT referencia FROM fichas_anticipos ORDER BY referencia").all() as {
        referencia: string;
      }[]
    ).map((r) => r.referencia);
  } catch {
    fuenteFallos.push({
      motor: "Anticipos",
      id: null,
      motivo: "Fichas de Anticipo no legibles; el resto de fuentes sigue disponible.",
    });
  }
  for (const id of anticipos) {
    try {
      filas.push(filaAnticipo(db, getAnticipo(db, id), cycles));
    } catch (error) {
      const motivo = `Error de fuente Anticipos para ${id}: ${
        error instanceof Problem ? error.message : "lectura no verificable"
      }.`;
      fuenteFallos.push({ motor: "Anticipos", id, motivo });
      filas.push(
        filaNoDisponible(db, "Anticipo", id, motivo, [
          { tipo: "Anticipo", href: `/anticipos/${encodeURIComponent(id)}` },
        ]),
      );
    }
  }

  let compartidos: string[] = [];
  try {
    compartidos = (
      db.query("SELECT referencia FROM fichas_compartidos ORDER BY referencia").all() as {
        referencia: string;
      }[]
    ).map((r) => r.referencia);
  } catch {
    fuenteFallos.push({
      motor: "Compartidos",
      id: null,
      motivo: "Fichas de Compartidos no legibles; el resto de fuentes sigue disponible.",
    });
  }
  for (const id of compartidos) {
    try {
      filas.push(filaCompartido(getCompartido(db, id), cycles));
    } catch (error) {
      const motivo = `Error de fuente Compartidos para ${id}: ${
        error instanceof Problem ? error.message : "lectura no verificable"
      }.`;
      fuenteFallos.push({ motor: "Compartidos", id, motivo });
      filas.push(
        filaNoDisponible(db, "Compartido", id, motivo, [
          { tipo: "Compartido", href: `/compartidos/${encodeURIComponent(id)}` },
        ]),
      );
    }
  }

  for (const ciclo of cycles) {
    const lectura = leer(ciclo.id);
    if (lectura.error !== null) {
      // El 409 de e35Metrics (periodo sin corte) se aísla en esta fila.
      filas.push(filaComida(db, ciclo, lectura, cycles));
      fuenteFallos.push({
        motor: "Comida E3.5",
        id: ciclo.id,
        motivo: lectura.error,
      });
      continue;
    }
    const fila = filaComida(db, ciclo, lectura, cycles);
    // Un ciclo sin movimientos solo se omite cuando no hay nada que revisar:
    // Resuelto con cobertura verificada. Un ND o Revisar se conserva.
    if (
      !actividad.has(ciclo.id) &&
      fila.estado === "Resuelto" &&
      fila.cobertura === "Verificada"
    )
      continue;
    filas.push(fila);
  }

  for (const ciclo of cycles) {
    const siguiente = cicloSiguiente(cycles, ciclo);
    if (!siguiente) continue;
    const lectura = leer(ciclo.id);
    if (lectura.error !== null)
      fuenteFallos.push({
        motor: "Comida E3.5",
        id: ciclo.id,
        motivo: lectura.error,
      });
    const conciliacion = calcularConciliacion({
      ciclo,
      siguiente,
      metrics: lectura.metrics,
      error: lectura.error,
    });
    filas.push(filaConciliacion(conciliacion, cycles));
  }

  const byKey = new Map<string, TransversalItem>();
  for (const fila of filas) if (!byKey.has(fila.claveEfimera)) byKey.set(fila.claveEfimera, fila);
  const fallos = new Map<string, FuenteFallo>();
  for (const fallo of fuenteFallos)
    fallos.set(`${fallo.motor}|${fallo.id ?? ""}|${fallo.motivo}`, fallo);
  return { filas: [...byKey.values()], fuenteFallos: [...fallos.values()] };
}

function leerFlujoBase(
  db: Database,
  cicloId: string,
  now: number,
): FlujoBase {
  try {
    const flow = monthlyFlow(db, cicloId, now);
    // E2.6 expone los hechos bancarios como subtotal Parcial (no como total):
    // se conserva ese subtotal, sin convertirlo en cifra verificada.
    const gasto = flow.metrics.gasto;
    const gastoBruto = gasto.valor ?? gasto.subtotal;
    const ingresos =
      flow.metrics.ingresos.valor ?? flow.metrics.ingresos.subtotal;
    const extraordinaria =
      flow.metrics.extraordinaria.valor ??
      flow.metrics.extraordinaria.subtotal;
    const sBruto = observedOperating(ingresos, gastoBruto, extraordinaria);
    return {
      cicloId,
      gastoBruto,
      sBruto,
      cobertura: gastoBruto === null ? "No disponible" : "Parcial",
      motivo:
        gastoBruto === null
          ? gasto.motivo
          : "Subtotal E2.6 conservado; E3.6 no lo sustituye por un ajuste y Comida no se resta otra vez.",
    };
  } catch (error) {
    return {
      cicloId,
      gastoBruto: null,
      sBruto: null,
      cobertura: "No disponible",
      motivo: `Error de fuente Flujo mensual: ${
        error instanceof Problem ? error.message : "lectura no verificable"
      }.`,
    };
  }
}

export function parseFiltros(params: URLSearchParams): FiltrosPendientes {
  const raw = (name: string) => params.get(name)?.trim() || null;
  const tipo = raw("tipo"),
    estado = raw("estado"),
    cobertura = raw("cobertura"),
    alcance = raw("alcance") ?? "abiertos",
    ejercicioRaw = raw("ejercicio"),
    texto = raw("texto"),
    ciclo = raw("ciclo");
  if (tipo !== null && !TIPOS.includes(tipo as TipoItem))
    throw new Problem(422, "VALIDATION", "Filtro tipo inválido.");
  if (estado !== null && !ESTADOS.includes(estado as EstadoItem))
    throw new Problem(422, "VALIDATION", "Filtro estado inválido.");
  if (cobertura !== null && !COBERTURAS.includes(cobertura as Cobertura))
    throw new Problem(422, "VALIDATION", "Filtro cobertura inválido.");
  if (!["abiertos", "historico"].includes(alcance))
    throw new Problem(422, "VALIDATION", "Filtro alcance inválido.");
  let ejercicio: number | null = null;
  if (ejercicioRaw !== null) {
    if (!/^\d{4}$/.test(ejercicioRaw))
      throw new Problem(422, "VALIDATION", "Filtro ejercicio inválido.");
    ejercicio = Number(ejercicioRaw);
    if (ejercicio < 1000 || ejercicio > 9999)
      throw new Problem(422, "VALIDATION", "Filtro ejercicio inválido.");
  }
  if (texto !== null && texto.length > 120)
    throw new Problem(422, "VALIDATION", "Texto de búsqueda demasiado largo.");
  if (estado === "Resuelto" && alcance !== "historico")
    throw new Problem(
      422,
      "VALIDATION",
      "Resuelto requiere alcance=historico; no se mezcla con abiertos.",
    );
  const page = Number(params.get("page") ?? 1),
    pageSize = Number(params.get("pageSize") ?? 100);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
    throw new Problem(422, "VALIDATION", "Página inválida.");
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100)
    throw new Problem(422, "VALIDATION", "Tamaño de página inválido.");
  return {
    tipo: tipo as TipoItem | null,
    estado: estado as EstadoItem | null,
    ciclo,
    ejercicio,
    cobertura: cobertura as Cobertura | null,
    alcance: alcance as Alcance,
    texto,
    page,
    pageSize,
  };
}

/** Ficha Compartido creada sin hechos ni reparto: no es un pendiente abierto. */
function fichaSinHechosSinRepartir(fila: TransversalItem) {
  return (
    fila.tipo === "Compartido" &&
    fila.estado === "No disponible" &&
    fila.magnitud === "Estado del reparto" &&
    fila.contextos.length === 0
  );
}

function enPeriodo(
  fila: TransversalItem,
  ciclo: Cycle,
  inicio: string,
  fin: string,
) {
  if (fila.ciclo?.id === ciclo.id) return true;
  return fila.contextos.some(
    (c) => c.fecha !== null && c.fecha >= inicio && c.fecha <= fin,
  );
}

export function listPendientes(
  db: Database,
  params = new URLSearchParams(),
  now = Date.now(),
): ListaPendientes {
  const filtros = parseFiltros(params);
  const { filas, fuenteFallos } = componer(db, now);
  const cycles = cycleMaster(db);
  let seleccion: Cycle | null = null;
  let finPeriodo = "9999-12-31";
  if (filtros.ciclo) {
    seleccion = cycles.find((c) => c.id === filtros.ciclo) ?? null;
    if (!seleccion)
      throw new Problem(422, "VALIDATION", "Ciclo no encontrado.");
    finPeriodo = seleccion.fin ?? seleccion.corte ?? "9999-12-31";
  }
  const text = filtros.texto?.toLocaleLowerCase("es") ?? null;
  const historico = filtros.alcance === "historico";
  const filtered = filas.filter(
    (f) =>
      (filtros.tipo === null || f.tipo === filtros.tipo) &&
      (filtros.estado === null || f.estado === filtros.estado) &&
      (filtros.cobertura === null || f.cobertura === filtros.cobertura) &&
      (filtros.ejercicio === null || f.ejercicio === filtros.ejercicio) &&
      (historico
        ? f.estado === "Resuelto"
        : f.estado !== "Resuelto" && !fichaSinHechosSinRepartir(f)) &&
      (seleccion === null ||
        enPeriodo(f, seleccion, seleccion.inicio, finPeriodo)) &&
      (text === null ||
        `${f.tipo} ${f.fuente.id} ${f.caso?.nombre ?? ""} ${f.magnitud}`
          .toLocaleLowerCase("es")
          .includes(text)),
  );
  filtered.sort((a, b) => {
    const rank = RANGO[a.estado] - RANGO[b.estado];
    if (rank !== 0) return rank;
    if (a.fechaHecho !== b.fechaHecho) {
      if (a.fechaHecho === null) return 1;
      if (b.fechaHecho === null) return -1;
      return b.fechaHecho.localeCompare(a.fechaHecho);
    }
    const id = a.fuente.id.localeCompare(b.fuente.id, "es");
    return id !== 0 ? id : a.claveEfimera.localeCompare(b.claveEfimera);
  });
  const conteos = Object.fromEntries(
    ESTADOS.map((estado) => [
      estado,
      filtered.filter((f) => f.estado === estado).length,
    ]),
  ) as Record<EstadoItem, number>;
  return {
    filas: filtered.slice(
      (filtros.page - 1) * filtros.pageSize,
      filtros.page * filtros.pageSize,
    ),
    total: filtered.length,
    page: filtros.page,
    pageSize: filtros.pageSize,
    conteos,
    fuenteFallos,
    sinTotalEconomico: true,
    soloLectura: true,
    filtros: {
      tipo: filtros.tipo,
      estado: filtros.estado,
      ciclo: filtros.ciclo,
      ejercicio: filtros.ejercicio,
      cobertura: filtros.cobertura,
      alcance: filtros.alcance,
      texto: filtros.texto,
    },
    flujoBase: filtros.ciclo
      ? leerFlujoBase(db, filtros.ciclo, now)
      : null,
  };
}

export function getPendiente(
  db: Database,
  tipo: TipoItem,
  fuenteId: string,
  now = Date.now(),
) {
  if (!TIPOS.includes(tipo))
    throw new Problem(422, "VALIDATION", "Tipo de pendiente inválido.");
  const { filas, fuenteFallos } = componer(db, now);
  const fila = filas.find((f) => f.tipo === tipo && f.fuente.id === fuenteId);
  if (!fila)
    throw new Problem(404, "NOT_FOUND", "Pendiente o fuente no encontrada.");
  return { fila, fuenteFallos, soloLectura: true as const };
}
