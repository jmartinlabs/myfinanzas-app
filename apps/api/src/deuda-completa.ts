import type { Database } from "bun:sqlite";
import { Problem } from "./problem";
import { decimal } from "./saldos";
import { civil, spanishToday } from "./investment-engine";

/**
 * E4.4 read model. It deliberately does not import `getDebt`/`debtPeriod`: the
 * existing E1.6 reader keeps its behaviour and this module computes the position
 * from the recorded facts with a complete-breakdown guard.
 *
 * Conventions:
 * - EUR values travel as exact decimal strings (two decimals); null is never 0.
 * - Rates are stored scaled by 10^6 and rendered with six decimals.
 * - A corte is an inclusive civil date and is never persisted.
 * - `aplicaAlCapital` is false for precontrol and annulled facts; precontrol
 *   facts conserve their bank/gasto effect but never reduce the opening capital.
 * - An applicable fact with an absent or inconsistent breakdown makes the whole
 *   outstanding capital of that Deuda at that corte non-calculable (m8).
 */

type DebtRow = {
  id: string;
  nombre: string;
  inicio: string | null;
  apertura: string | null;
  estado: string;
  revision: number;
  creado: string;
  actualizado: string;
  tipo_deuda: string | null;
  tin: string | null;
  tae: string | null;
  cuota_contractual: string | null;
  condiciones: string | null;
  capital_inicial: string | null;
  capital_amortizado_historico: string | null;
  amortizacion_extra_historica: string | null;
  capital_historico_cuotas: string | null;
  intereses_historicos: string | null;
  total_pagado_historico: string | null;
  precontrol_cuotas: number | null;
  precontrol_capital: string | null;
  precontrol_amortizacion_extra: string | null;
  precontrol_ejercicio: number | null;
};

type FactRow = {
  id: string;
  fecha: string;
  tipo: "Gasto" | "Amortización deuda";
  importe: string;
  capital: string | null;
  intereses: string | null;
  origen: string;
  destino: string;
  anulado: number;
};

type ConciliationRow = {
  id: string;
  deuda: string;
  fecha_corte: string;
  capital_declarado: string;
  fuente: string | null;
  nota: string | null;
  estado: "Vigente" | "Anulada";
  revision: number;
};

export type CapitalDeuda = {
  aplicado: string | null;
  deudaViva: string | null;
  calculable: boolean;
  motivoNoCalculable: string | null;
  hechosInvalidos: string[];
};

export type CoberturaDeuda = {
  desdeControl: boolean;
  hastaCorte: boolean;
  incluyePrecontrol: boolean;
  hechosAplicables: number;
  hechosExcluidosPorCorte: number;
  hechosAnulados: number;
  desgloseVerificable: boolean;
};

export type HistoriaDeuda = {
  movimiento: string;
  fecha: string;
  tipo: string;
  total: string;
  capital: string | null;
  intereses: string | null;
  gasto: string;
  efectoBanco: string;
  aplicaAlCapital: boolean;
  estado: "Vigente" | "Anulado";
};

export type TotalesDeuda = {
  capital: string | null;
  intereses: string | null;
  gasto: string;
  banco: string;
  anulados: number;
};

export type ConciliacionDeuda = {
  id: string;
  deuda: string;
  fechaCorte: string;
  capitalDeclarado: string;
  fuente: string | null;
  nota: string | null;
  estado: "Vigente" | "Anulada";
  revision: number;
  diferencia: string | null;
  estadoConciliacion: "Conciliado" | "Diferencia" | "No comparable";
  motivoNoComparable: string | null;
};

export type DeudaListado = {
  id: string;
  nombre: string;
  estado: string;
  revision: number;
  tipoDeuda: string | null;
  inicioControl: string | null;
  capitalApertura: string | null;
  capitalPendiente: string | null;
  capital: CapitalDeuda;
  conciliacion: ConciliacionDeuda | null;
  varias: boolean;
};

export type ComprobacionRelacion = {
  aplicable: boolean;
  estado: "Consistente" | "Inconsistente" | "Sin datos" | "No calculable";
  diferencia: string | null;
  motivo: string | null;
};

export type DeudaFicha = DeudaListado & {
  creado: string;
  actualizado: string;
  control: {
    inicio: string | null;
    capitalApertura: string | null;
    capitalControl: string | null;
  };
  condiciones: {
    tin: string | null;
    tae: string | null;
    cuotaContractual: string | null;
    texto: string | null;
  };
  historico: {
    capitalInicial: string | null;
    capitalAmortizadoHistorico: string | null;
    amortizacionExtraHistorica: string | null;
    capitalHistoricoCuotas: string | null;
    interesesHistoricos: string | null;
    totalPagadoHistorico: string | null;
    precontrol: {
      ejercicio: number | null;
      cuotas: number | null;
      capital: string | null;
      amortizacionExtra: string | null;
    } | null;
    comprobacion: {
      capital: ComprobacionRelacion;
      cuotas: ComprobacionRelacion;
    };
  };
  corte: string | null;
  cobertura: CoberturaDeuda;
  historia: HistoriaDeuda[];
  totales: TotalesDeuda;
  conciliaciones: ConciliacionDeuda[];
  conciliacionVigente: ConciliacionDeuda | null;
};

const ROW_SELECT = `SELECT id,nombre,inicio,CAST(apertura AS TEXT) apertura,estado,revision,creado,actualizado,
  tipo_deuda,CAST(tin AS TEXT) tin,CAST(tae AS TEXT) tae,CAST(cuota_contractual AS TEXT) cuota_contractual,
  condiciones,CAST(capital_inicial AS TEXT) capital_inicial,
  CAST(capital_amortizado_historico AS TEXT) capital_amortizado_historico,
  CAST(amortizacion_extra_historica AS TEXT) amortizacion_extra_historica,
  CAST(capital_historico_cuotas AS TEXT) capital_historico_cuotas,
  CAST(intereses_historicos AS TEXT) intereses_historicos,
  CAST(total_pagado_historico AS TEXT) total_pagado_historico,
  precontrol_cuotas,CAST(precontrol_capital AS TEXT) precontrol_capital,
  CAST(precontrol_amortizacion_extra AS TEXT) precontrol_amortizacion_extra,
  precontrol_ejercicio
  FROM deudas`;

const FACT_SELECT = `SELECT m.id,m.fecha,m.tipo,CAST(m.importe AS TEXT) importe,
  CAST(m.capital AS TEXT) capital,CAST(m.intereses AS TEXT) intereses,
  m.origen,m.destino,m.anulado
  FROM movimientos m JOIN partidas p ON p.id=m.partida
  WHERE p.deuda=? AND m.tipo IN ('Gasto','Amortización deuda')
  ORDER BY m.fecha,length(m.id),m.id`;

const CONCILIATION_SELECT = `SELECT id,deuda,fecha_corte,CAST(capital_declarado AS TEXT) capital_declarado,
  fuente,nota,estado,revision
  FROM conciliaciones_deuda WHERE deuda=?
  ORDER BY fecha_corte DESC,length(id) DESC,id DESC`;

function findRow(db: Database, id: string): DebtRow {
  const row = db.query(ROW_SELECT + " WHERE id=?").get(id) as DebtRow | null;
  if (!row) throw new Problem(404, "NOT_FOUND", "Deuda no encontrada.");
  return row;
}

function factsFor(db: Database, id: string): FactRow[] {
  return db.query(FACT_SELECT).all(id) as FactRow[];
}

function conciliationRowsFor(db: Database, id: string): ConciliationRow[] {
  return db.query(CONCILIATION_SELECT).all(id) as ConciliationRow[];
}

function rateText(value: string | null): string | null {
  if (value === null) return null;
  const n = BigInt(value),
    abs = n < 0n ? -n : n;
  return `${n < 0n ? "-" : ""}${abs / 1000000n}.${String(abs % 1000000n).padStart(6, "0")}`;
}

function centsText(value: string): bigint {
  const negative = value.startsWith("-"),
    [whole, fraction = ""] = value.replace("-", "").split("."),
    n = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative ? -n : n;
}

function notCalculable(
  motivo: string,
  hechosInvalidos: string[] = [],
): CapitalDeuda {
  return {
    aplicado: null,
    deudaViva: null,
    calculable: false,
    motivoNoCalculable: motivo,
    hechosInvalidos,
  };
}

function invalidBreakdown(fact: FactRow): boolean {
  if (fact.capital === null || fact.intereses === null) return true;
  const capital = BigInt(fact.capital),
    intereses = BigInt(fact.intereses),
    importe = BigInt(fact.importe);
  if (fact.tipo === "Amortización deuda")
    return capital !== importe || intereses !== 0n;
  return capital <= 0n || intereses < 0n || capital + intereses !== importe;
}

function applicableFacts(
  row: DebtRow,
  facts: FactRow[],
  corte: string | null,
): FactRow[] {
  if (row.inicio === null) return [];
  return facts.filter(
    (fact) =>
      fact.anulado === 0 &&
      fact.fecha >= row.inicio! &&
      (corte === null || fact.fecha <= corte),
  );
}

function capitalAt(
  row: DebtRow,
  facts: FactRow[],
  corte: string | null,
): CapitalDeuda {
  if (row.apertura === null)
    return notCalculable("Falta el capital de apertura.");
  if (row.inicio === null) return notCalculable("Falta el Inicio control.");
  if (corte !== null && corte < row.inicio)
    return notCalculable("El corte es anterior al Inicio control.");
  const applicable = applicableFacts(row, facts, corte),
    invalid = applicable.filter(invalidBreakdown).map((fact) => fact.id);
  if (invalid.length)
    return notCalculable(
      `Desglose inválido en el Movimiento ${invalid.join(", ")}.`,
      invalid,
    );
  const apertura = BigInt(row.apertura),
    aplicado = applicable.reduce(
      (sum, fact) => sum + BigInt(fact.capital!),
      0n,
    );
  return {
    aplicado: decimal(aplicado),
    deudaViva: decimal(apertura - aplicado),
    calculable: true,
    motivoNoCalculable: null,
    hechosInvalidos: [],
  };
}

function coverageAt(
  row: DebtRow,
  facts: FactRow[],
  corte: string | null,
): CoberturaDeuda {
  const visible =
      corte === null ? facts : facts.filter((fact) => fact.fecha <= corte),
    applicable = applicableFacts(row, facts, corte),
    invalid = applicable.filter(invalidBreakdown);
  return {
    desdeControl:
      row.inicio !== null && (corte === null || corte >= row.inicio),
    hastaCorte: corte !== null,
    incluyePrecontrol:
      row.inicio !== null &&
      visible.some((fact) => fact.fecha < row.inicio!),
    hechosAplicables: applicable.length,
    hechosExcluidosPorCorte:
      corte === null
        ? 0
        : facts.filter(
            (fact) => fact.anulado === 0 && fact.fecha > corte,
          ).length,
    hechosAnulados: visible.filter((fact) => fact.anulado === 1).length,
    desgloseVerificable: invalid.length === 0,
  };
}

function bankEffect(fact: FactRow): string {
  const importe = BigInt(fact.importe);
  return decimal(fact.destino === "S000" ? -importe : importe)!;
}

function historyAt(
  row: DebtRow,
  facts: FactRow[],
  corte: string | null,
): HistoriaDeuda[] {
  return facts
    .filter((fact) => corte === null || fact.fecha <= corte)
    .map((fact) => {
      const anulado = fact.anulado === 1,
        aplica =
          !anulado &&
          row.inicio !== null &&
          fact.fecha >= row.inicio &&
          (corte === null || fact.fecha <= corte);
      return {
        movimiento: fact.id,
        fecha: fact.fecha,
        tipo: fact.tipo,
        total: decimal(fact.importe)!,
        capital: decimal(fact.capital),
        intereses: decimal(fact.intereses),
        gasto: fact.tipo === "Gasto" ? decimal(fact.importe)! : "0.00",
        efectoBanco: anulado ? "0.00" : bankEffect(fact),
        aplicaAlCapital: aplica,
        estado: anulado ? "Anulado" : "Vigente",
      };
    });
}

function totalsAt(
  row: DebtRow,
  facts: FactRow[],
  corte: string | null,
  capital: CapitalDeuda,
): TotalesDeuda {
  const visible =
      corte === null ? facts : facts.filter((fact) => fact.fecha <= corte),
    applicable = applicableFacts(row, facts, corte),
    invalid = applicable.some(invalidBreakdown);
  return {
    capital: capital.calculable ? capital.aplicado : null,
    intereses: invalid
      ? null
      : decimal(
          applicable.reduce(
            (sum, fact) => sum + BigInt(fact.intereses!),
            0n,
          ),
        ),
    gasto: decimal(
      applicable
        .filter((fact) => fact.tipo === "Gasto")
        .reduce((sum, fact) => sum + BigInt(fact.importe), 0n),
    )!,
    banco: decimal(
      applicable.reduce(
        (sum, fact) =>
          sum +
          (fact.destino === "S000"
            ? -BigInt(fact.importe)
            : BigInt(fact.importe)),
        0n,
      ),
    )!,
    anulados: visible.filter((fact) => fact.anulado === 1).length,
  };
}

function capitalRelation(row: DebtRow): ComprobacionRelacion {
  if (
    row.capital_inicial === null ||
    row.apertura === null ||
    row.capital_amortizado_historico === null
  )
    return {
      aplicable: false,
      estado: "Sin datos",
      diferencia: null,
      motivo:
        "Faltan capital inicial, capital de apertura o amortizado histórico.",
    };
  // Observed minus expected so a positive value means more historical
  // amortisation than the relation predicts.
  const diferencia =
    BigInt(row.capital_amortizado_historico) -
    (BigInt(row.capital_inicial) - BigInt(row.apertura));
  return {
    aplicable: true,
    estado: diferencia === 0n ? "Consistente" : "Inconsistente",
    diferencia: decimal(diferencia),
    motivo: null,
  };
}

function historicFields(row: DebtRow) {
  const hasPrecontrol =
    row.precontrol_ejercicio !== null ||
    row.precontrol_cuotas !== null ||
    row.precontrol_capital !== null ||
    row.precontrol_amortizacion_extra !== null;
  return {
    capitalInicial: decimal(row.capital_inicial),
    capitalAmortizadoHistorico: decimal(
      row.capital_amortizado_historico,
    ),
    amortizacionExtraHistorica: decimal(
      row.amortizacion_extra_historica,
    ),
    capitalHistoricoCuotas: decimal(row.capital_historico_cuotas),
    interesesHistoricos: decimal(row.intereses_historicos),
    totalPagadoHistorico: decimal(row.total_pagado_historico),
    precontrol: hasPrecontrol
      ? {
          ejercicio: row.precontrol_ejercicio,
          cuotas: row.precontrol_cuotas,
          capital: decimal(row.precontrol_capital),
          amortizacionExtra: decimal(row.precontrol_amortizacion_extra),
        }
      : null,
    comprobacion: {
      capital: capitalRelation(row),
      cuotas: {
        aplicable: false,
        estado: "No calculable" as const,
        diferencia: null,
        motivo:
          "La fuente no identifica el capital histórico; la relación no se calcula.",
      },
    },
  };
}

function conciliacionesAt(
  row: DebtRow,
  facts: FactRow[],
  rows: ConciliationRow[],
): ConciliacionDeuda[] {
  return rows.map((conciliacion) => {
    const capital = capitalAt(row, facts, conciliacion.fecha_corte),
      declared = BigInt(conciliacion.capital_declarado),
      diferencia =
        capital.deudaViva === null
          ? null
          : declared - centsText(capital.deudaViva);
    return {
      id: conciliacion.id,
      deuda: conciliacion.deuda,
      fechaCorte: conciliacion.fecha_corte,
      capitalDeclarado: decimal(conciliacion.capital_declarado)!,
      fuente: conciliacion.fuente,
      nota: conciliacion.nota,
      estado: conciliacion.estado,
      revision: conciliacion.revision,
      diferencia: diferencia === null ? null : decimal(diferencia),
      estadoConciliacion:
        diferencia === null
          ? "No comparable"
          : diferencia === 0n
            ? "Conciliado"
            : "Diferencia",
      motivoNoComparable:
        diferencia === null ? capital.motivoNoCalculable : null,
    };
  });
}

function ficha(row: DebtRow, facts: FactRow[], corte: string | null, conciliaciones: ConciliacionDeuda[]): DeudaFicha {
  const capital = capitalAt(row, facts, corte),
    vigentes = conciliaciones.filter(
      (conciliacion) => conciliacion.estado === "Vigente",
    );
  return {
    id: row.id,
    nombre: row.nombre,
    estado: row.estado,
    revision: row.revision,
    creado: row.creado,
    actualizado: row.actualizado,
    tipoDeuda: row.tipo_deuda,
    inicioControl: row.inicio,
    capitalApertura: decimal(row.apertura),
    capitalPendiente: capital.deudaViva,
    capital,
    conciliacion: vigentes[0] ?? null,
    varias: vigentes.length > 1,
    control: {
      inicio: row.inicio,
      capitalApertura: decimal(row.apertura),
      capitalControl: decimal(row.apertura),
    },
    condiciones: {
      tin: rateText(row.tin),
      tae: rateText(row.tae),
      cuotaContractual: decimal(row.cuota_contractual),
      texto: row.condiciones,
    },
    historico: historicFields(row),
    corte,
    cobertura: coverageAt(row, facts, corte),
    historia: historyAt(row, facts, corte),
    totales: totalsAt(row, facts, corte, capital),
    conciliaciones,
    conciliacionVigente: vigentes[0] ?? null,
  };
}

function listado(row: DebtRow, facts: FactRow[], conciliaciones: ConciliacionDeuda[]): DeudaListado {
  const capital = capitalAt(row, facts, null),
    vigentes = conciliaciones.filter(
      (conciliacion) => conciliacion.estado === "Vigente",
    );
  return {
    id: row.id,
    nombre: row.nombre,
    estado: row.estado,
    revision: row.revision,
    tipoDeuda: row.tipo_deuda,
    inicioControl: row.inicio,
    capitalApertura: decimal(row.apertura),
    capitalPendiente: capital.deudaViva,
    capital,
    conciliacion: vigentes[0] ?? null,
    varias: vigentes.length > 1,
  };
}

/**
 * Validates the optional `corte` query parameter. It is inclusive and never
 * future (Europe/Madrid); an empty value means "all recorded facts".
 */
export function parseCorte(
  value: string | null | undefined,
  now = Date.now(),
): string | null {
  if (value === null || value === undefined || value === "") return null;
  const corte = civil(value, "corte");
  if (corte > spanishToday(now))
    throw new Problem(
      422,
      "VALIDATION",
      "El corte no puede ser una fecha futura.",
      { corte: "Indica una fecha civil no futura." },
    );
  return corte;
}

export function getDeudaCompleta(
  db: Database,
  id: string,
  corteParam: string | null | undefined = null,
  now = Date.now(),
) {
  const corte = parseCorte(corteParam, now),
    row = findRow(db, id),
    facts = factsFor(db, id),
    conciliaciones = conciliacionesAt(
      row,
      facts,
      conciliationRowsFor(db, id),
    );
  return ficha(row, facts, corte, conciliaciones);
}

export function listDeudasCompletas(
  db: Database,
  params = new URLSearchParams(),
) {
  const page = Number(params.get("page") ?? 1),
    state = params.get("estado") ?? "Activa",
    tipo = params.get("tipoDeuda") ?? "",
    corteParam = params.get("corte");
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !["", "Activa", "Inactiva"].includes(state) ||
    !["", "Hipotecaria", "No hipotecaria", "Sin informar"].includes(tipo)
  )
    throw new Problem(422, "VALIDATION", "Filtro inválido.");
  // The listing always uses every recorded fact; a corte is only accepted by
  // the ficha, so a caller cannot mistake the list for a historical snapshot.
  if (corteParam !== null && corteParam !== "")
    throw new Problem(
      422,
      "VALIDATION",
      "El listado no admite corte.",
      { corte: "Consulta la ficha para aplicar un corte histórico." },
    );
  return db.transaction(() => {
    const q = (params.get("q") ?? "").toLocaleLowerCase("es"),
      rows = db
        .query(ROW_SELECT + " ORDER BY length(id),id")
        .all() as DebtRow[],
      filtered = rows.filter(
        (row) =>
          (!state || row.estado === state) &&
          (!tipo ||
            (tipo === "Sin informar"
              ? row.tipo_deuda === null
              : row.tipo_deuda === tipo)) &&
          `${row.id} ${row.nombre}`.toLocaleLowerCase("es").includes(q),
      );
    return {
      items: filtered.slice((page - 1) * 100, page * 100).map((row) => {
        const facts = factsFor(db, row.id);
        return listado(
          row,
          facts,
          conciliacionesAt(row, facts, conciliationRowsFor(db, row.id)),
        );
      }),
      total: filtered.length,
      page,
    };
  })();
}

export function listConciliacionesDeuda(db: Database, id: string) {
  return db.transaction(() => {
    const row = findRow(db, id),
      facts = factsFor(db, id);
    return conciliacionesAt(row, facts, conciliationRowsFor(db, id));
  })();
}
