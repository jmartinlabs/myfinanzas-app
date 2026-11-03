import type { Database } from "bun:sqlite";
import { getCycle, cycleMaster, type Cycle } from "./ciclos";
import { ledgerRows, movementSource, fingerprint } from "./movement-ledger";
import { getSaldo, decimal, money, Problem } from "./saldos";
import { getCompartido } from "./compartidos";
import { planLines, getCyclePlan } from "./planes-ciclo";
import {
  payrollMonthlyReference,
  monthlyReference,
  ratioMoney,
} from "./nomina-mensual";
import { debtPeriod } from "./deudas";
import { D } from "./payroll-decimal";
export type Metric = {
  valor: string | null;
  subtotal: string | null;
  estado: string;
  motivo: string;
  fuente: string;
  ids: string[];
  cobertura: string;
};
const metric = (
  valor: string | null,
  fuente: string,
  motivo: string,
  ids: string[] = [],
  parcial = false,
  subtotal: string | null = null,
  cobertura = "Definición acotada; no flujo global ni historia precontrol",
): Metric => ({
  valor,
  subtotal,
  fuente,
  motivo,
  ids,
  cobertura,
  estado:
    parcial && (valor !== null || subtotal !== null)
      ? "Parcial"
      : valor === null
        ? "No disponible"
        : D(valor).cmp(D("0")) === 0
          ? "Cero verificado"
          : "Verificado",
});
const absent = (motivo: string, fuente = "Motor no instalado") =>
  metric(null, fuente, motivo);
const sum = (rows: { importe: string }[]) =>
  decimal(rows.reduce((s, r) => s + BigInt(r.importe), 0n))!;
/** Only recorded arithmetic; the caller must separately establish interval coverage. */
export function observedOperating(
  income: string | null,
  expense: string | null,
  extra: string | null,
) {
  return income === null || expense === null || extra === null
    ? null
    : D(income).sub(D(expense)).sub(D(extra)).money();
}
export function planningMargin(
  reference: string | null,
  planned: string | null,
) {
  return reference === null || planned === null
    ? null
    : D(reference).sub(D(planned)).money();
}

/**
 * E3.6 — vista ajustada por Recuperado. Aditiva: no sustituye ni reinterpreta
 * las métricas E2.6. `G_n = G_b − R_adj`; `S_aj` se deriva de E2.6 y siempre es
 * Parcial. Comida, devoluciones de Anticipo y reposiciones no se restan aquí.
 */
export type CoberturaAjuste = "Verificada" | "Parcial" | "No disponible";
export type AjusteMetrica = {
  clave: string;
  importe: string | null;
  cobertura: CoberturaAjuste;
  motivo: string | null;
};
export type AjusteGastoCompartido = {
  fuenteId: string;
  casoId: string;
  fecha: string;
  bruto: string;
  recuperado: string | null;
  estadoRecuperado: string;
};
export type MemoriaCajaAportacion = {
  movimiento: string;
  fecha: string;
  importe: string;
  casoId: string;
  participanteId: string;
  participanteNombre: string;
};
export type AjusteCompartidos = {
  cicloId: string;
  corte: string | null;
  base: AjusteMetrica;
  recuperado: AjusteMetrica & { gastos: AjusteGastoCompartido[] };
  gastoNeto: AjusteMetrica;
  resultadoAjustado: AjusteMetrica & {
    ingresos: string | null;
    extraordinaria: string | null;
  };
  memoriaCaja: {
    total: string | null;
    cobertura: CoberturaAjuste;
    motivo: string | null;
    aportaciones: MemoriaCajaAportacion[];
    noEsIngreso: true;
  };
  cobertura: CoberturaAjuste;
  motivo: string | null;
  formula: string;
  calculoVivo: true;
  sinFoto: true;
  noEsCierreFinanciero: true;
  soloLectura: true;
  revisionAjuste: string;
};
export type FlujoAjustado = {
  conservaE26: true;
  base: {
    gastoBruto: string | null;
    sBruto: string | null;
    cobertura: CoberturaAjuste;
    motivo: string | null;
  };
  ajuste: {
    rAdj: string | null;
    gNeto: string | null;
    sAjustado: string | null;
    cobertura: CoberturaAjuste;
    motivo: string | null;
  };
  memoriaCaja: {
    total: string | null;
    cobertura: CoberturaAjuste;
    motivo: string | null;
    aportaciones: MemoriaCajaAportacion[];
    noEsIngreso: true;
  };
  parcial: true;
  calculoVivo: true;
  noEsAhorroReal: true;
  advertencias: string[];
};

function ajusteCompartidos(
  db: Database,
  ciclo: Cycle,
  corte: string | null,
  gastoBruto: string | null,
  ingresos: string | null,
  extraordinaria: string | null,
): { ajusteCompartidos: AjusteCompartidos; flujoAjustado: FlujoAjustado } {
  // E2.6 puede exponer sumas registradas fuera del rango técnico de un importe
  // individual; en ese caso la métrica derivada queda No disponible, sin lanzar.
  const safeCents = (value: string | null): bigint | null => {
    if (value === null) return null;
    try {
      return money(value);
    } catch {
      return null;
    }
  };
  const periodoVerificable = corte !== null;
  const gastos: AjusteGastoCompartido[] = [];
  const aportaciones: MemoriaCajaAportacion[] = [];
  let recuperadoCents = 0n;
  let memoriaCents = 0n;
  let recuperadoParcial = false;
  let recuperadoNd = false;
  let recuperadoMotivo: string | null = null;
  let memoriaNd = false;
  let memoriaMotivo: string | null = null;

  if (!periodoVerificable) {
    recuperadoNd = true;
    recuperadoMotivo =
      "Periodo/corte central no verificable; no se calcula R_adj ni se rellena con cero.";
    memoriaNd = true;
    memoriaMotivo = recuperadoMotivo;
  } else {
    let referencias: string[] = [];
    try {
      referencias = (
        db
          .query("SELECT referencia FROM fichas_compartidos ORDER BY referencia")
          .all() as { referencia: string }[]
      ).map((r) => r.referencia);
    } catch {
      recuperadoNd = true;
      recuperadoMotivo =
        "Fichas de Compartidos no legibles; el ajuste queda No disponible.";
      memoriaNd = true;
      memoriaMotivo = recuperadoMotivo;
    }
    for (const referencia of referencias) {
      let dto: ReturnType<typeof getCompartido>;
      try {
        dto = getCompartido(db, referencia);
      } catch (error) {
        const detalle =
          error instanceof Problem ? error.message : "lectura no verificable";
        recuperadoNd = true;
        recuperadoMotivo = `Error de fuente Compartidos para ${referencia}: ${detalle}.`;
        memoriaNd = true;
        memoriaMotivo = recuperadoMotivo;
        continue;
      }
      for (const gasto of dto.gastos) {
        if (!gasto.computaEnBruto) continue;
        if (gasto.fecha < ciclo.inicio || gasto.fecha > corte!) continue;
        const recuperadoCentsGasto = safeCents(gasto.recuperado.valor);
        if (recuperadoCentsGasto === null) {
          recuperadoNd = true;
          recuperadoMotivo =
            gasto.recuperado.motivo ||
            `Recuperado no disponible en el Gasto ${gasto.id} de ${referencia}.`;
        } else {
          recuperadoCents += recuperadoCentsGasto;
          if (gasto.recuperado.estado !== "Verificada")
            recuperadoParcial = true;
        }
        gastos.push({
          fuenteId: gasto.id,
          casoId: referencia,
          fecha: gasto.fecha,
          bruto: gasto.importe,
          recuperado: gasto.recuperado.valor,
          estadoRecuperado: gasto.recuperado.estado,
        });
      }
      for (const aportacion of dto.aportaciones) {
        if (!aportacion.computa) continue;
        if (aportacion.fecha < ciclo.inicio || aportacion.fecha > corte!)
          continue;
        const importe = safeCents(aportacion.importe);
        if (importe === null) {
          memoriaNd = true;
          memoriaMotivo = `Aportación ${aportacion.movimiento} sin importe verificable.`;
          continue;
        }
        memoriaCents += importe;
        aportaciones.push({
          movimiento: aportacion.movimiento,
          fecha: aportacion.fecha,
          importe: aportacion.importe,
          casoId: referencia,
          participanteId: aportacion.participante.id,
          participanteNombre: aportacion.participante.nombre,
        });
      }
    }
  }

  const rAdj: string | null = recuperadoNd
    ? null
    : decimal(recuperadoCents);
  const recuperadoCobertura: CoberturaAjuste = recuperadoNd
    ? "No disponible"
    : recuperadoParcial
      ? "Parcial"
      : "Verificada";
  const recuperadoMotivoFinal = recuperadoNd
    ? recuperadoMotivo
    : recuperadoParcial
      ? `Recuperado atribuido parcial${
          recuperadoMotivo ? `: ${recuperadoMotivo}` : "."
        }`
      : gastos.length
        ? "Recuperado atribuido por Gasto con céntimos exactos; no es Ingreso ni un segundo Gasto."
        : "Periodo verificable sin Gastos compartidos: R_adj = 0 verificado.";
  const recuperadoMetrica: AjusteMetrica & {
    gastos: AjusteGastoCompartido[];
  } = {
    clave: "R_adj",
    importe: rAdj,
    cobertura: recuperadoCobertura,
    motivo: recuperadoMotivoFinal,
    gastos,
  };

  const baseMetrica: AjusteMetrica = {
    clave: "G_b",
    importe: gastoBruto,
    cobertura:
      gastoBruto === null ? "No disponible" : "Parcial",
    motivo:
      gastoBruto === null
        ? "Gasto bruto E2.6 no disponible con la cobertura actual."
        : "Gasto bruto E2.6 conservado una vez; base de la sustitución G_b − R_adj.",
  };

  const gastoBrutoCents = safeCents(gastoBruto);
  const rAdjCents = safeCents(rAdj);
  const gastoNetoCents =
    gastoBrutoCents === null || rAdjCents === null
      ? null
      : gastoBrutoCents - rAdjCents;
  const gastoNeto: string | null =
    gastoNetoCents === null ? null : decimal(gastoNetoCents);
  const gastoNetoMetrica: AjusteMetrica = {
    clave: "G_n",
    importe: gastoNeto,
    cobertura:
      gastoNeto === null
        ? "No disponible"
        : "Parcial",
    motivo:
      gastoNeto === null
        ? `G_n No disponible: ${
            gastoBruto === null
              ? "falta G_b E2.6."
              : "R_adj no es verificable."
          }`
        : "G_n = G_b − R_adj; cálculo vivo sin foto/cierre. Nunca se muestra G_b + Neto.",
  };

  const ingresosCents = safeCents(ingresos);
  const extraordinariaCents = safeCents(extraordinaria);
  const sAjustadoCents =
    ingresosCents === null ||
    gastoNetoCents === null ||
    extraordinariaCents === null
      ? null
      : ingresosCents - gastoNetoCents - extraordinariaCents;
  const sAjustado: string | null =
    sAjustadoCents === null ? null : decimal(sAjustadoCents);
  const sAjustadoMotivo =
    sAjustado === null
      ? `S_aj No disponible: ${
          ingresosCents === null
            ? "faltan Ingresos E2.6."
            : gastoNetoCents === null
              ? "falta G_n."
              : "falta la Amortización extraordinaria E2.6."
        }`
      : "Resultado ajustado por Recuperado; siempre Parcial. No es ahorro real, caja total ni flujo completo. Comida y devoluciones no se restan.";
  const resultadoMetrica: AjusteMetrica & {
    ingresos: string | null;
    extraordinaria: string | null;
  } = {
    clave: "S_aj",
    importe: sAjustado,
    cobertura: sAjustado === null ? "No disponible" : "Parcial",
    motivo: sAjustadoMotivo,
    ingresos,
    extraordinaria,
  };

  const memoriaTotal = memoriaNd ? null : decimal(memoriaCents);
  const memoriaCobertura: CoberturaAjuste = memoriaNd
    ? "No disponible"
    : "Verificada";
  const memoriaMotivoFinal = memoriaNd
    ? memoriaMotivo
    : aportaciones.length
      ? "Aportaciones de Compartidos cobradas en el ciclo; no son Ingresos ni se suman al flujo."
      : "Periodo verificable sin aportaciones de Compartidos: 0 verificado.";
  const memoriaCaja = {
    total: memoriaTotal,
    cobertura: memoriaCobertura,
    motivo: memoriaMotivoFinal,
    aportaciones,
    noEsIngreso: true as const,
  };

  const cobertura: CoberturaAjuste = recuperadoNd
    ? "No disponible"
    : "Parcial";
  const motivo = recuperadoNd
    ? recuperadoMotivoFinal
    : "Vista ajustada viva: G_n sustituye a G_b; S_aj es Parcial. La base E2.6 se conserva intacta.";

  const ajusteCompartidosDto: AjusteCompartidos = {
    cicloId: ciclo.id,
    corte,
    base: baseMetrica,
    recuperado: recuperadoMetrica,
    gastoNeto: gastoNetoMetrica,
    resultadoAjustado: resultadoMetrica,
    memoriaCaja,
    cobertura,
    motivo,
    formula:
      "R_adj = Σ Recuperado atribuido a Gastos compartidos del ciclo; G_n = G_b − R_adj; S_aj = Ingresos − G_n − Extraordinaria (Parcial).",
    calculoVivo: true,
    sinFoto: true,
    noEsCierreFinanciero: true,
    soloLectura: true,
    revisionAjuste: fingerprint([
      ciclo.id,
      corte,
      gastoBruto,
      rAdj,
      gastoNeto,
      sAjustado,
      memoriaTotal,
      gastos,
      aportaciones,
      recuperadoCobertura,
      memoriaCobertura,
    ]),
  };

  const flujoAjustadoDto: FlujoAjustado = {
    conservaE26: true,
    base: {
      gastoBruto,
      sBruto: observedOperating(ingresos, gastoBruto, extraordinaria),
      cobertura: gastoBruto === null ? "No disponible" : "Parcial",
      motivo: baseMetrica.motivo,
    },
    ajuste: {
      rAdj,
      gNeto: gastoNeto,
      sAjustado,
      cobertura,
      motivo,
    },
    memoriaCaja,
    parcial: true,
    calculoVivo: true,
    noEsAhorroReal: true,
    advertencias: [
      "S_aj es un resultado ajustado por Recuperado; no es ahorro real, caja total ni flujo completo.",
      "Comida no se resta de G_n ni de S_aj: su bloque analítico es independiente.",
      "Las aportaciones de la memoria de caja no son Ingresos.",
    ],
  };

  return {
    ajusteCompartidos: ajusteCompartidosDto,
    flujoAjustado: flujoAjustadoDto,
  };
}

export function monthlyFlow(db: Database, id: string, now = Date.now()) {
  if (!/^\d+$/.test(id))
    throw new Problem(422, "VALIDATION", "ID Ciclo inválido.");
  return db
    .transaction(() => {
      const { ciclo, contexto } = getCycle(db, id),
        reference = contexto.referencia.fecha;
      // The master temporal end may be beyond the central financial reference.
      const cutoff =
        reference && reference >= ciclo.inicio
          ? ciclo.fin && ciclo.fin < reference
            ? ciclo.fin
            : reference
          : null;
      const source = movementSource(db),
        valid = cutoff !== null && source.state === "disponible";
      const all = ledgerRows(db),
        rows = valid
          ? all.filter(
              (r) =>
                !r.anulado && r.fecha >= ciclo.inicio && r.fecha <= cutoff!,
            )
          : [];
      const bankMetric = (
        facts: typeof rows,
        description: string,
        available = true,
      ) =>
        metric(
          null,
          "Movimientos vigentes · fechas bancarias del ciclo",
          valid
            ? (available
                ? description
                : description + ". Relaciones Deuda pendientes de verificar") +
                ". Cobertura histórica del intervalo no acreditada; subtotal registrado, sin total completo"
            : "Periodo/corte central o fuente no verificable",
          facts.map((r) => r.id),
          valid,
          valid && facts.length ? sum(facts) : null,
        );
      const income = rows.filter((r) => r.tipo === "Ingreso"),
        salary = income.filter((r) => r.subtipo === "Nómina"),
        bonus = income.filter((r) => r.subtipo === "Bonus"),
        other = income.filter(
          (r) => !["Nómina", "Bonus"].includes(r.subtipo ?? ""),
        );
      const expenses = rows.filter((r) => r.tipo === "Gasto");
      const erroresFuente: string[] = [];
      let debt: ReturnType<typeof debtPeriod>;
      try {
        debt = debtPeriod(db, rows);
      } catch {
        erroresFuente.push("Deudas");
        debt = {
          cuotas: [],
          extraordinarias: [],
          invalidos: rows
            .filter((r) => ["Gasto", "Amortización deuda"].includes(r.tipo))
            .map((r) => r.id),
          fuentes: [],
          desgloseVerificable: false,
          capital: null,
          intereses: null,
        };
      }

      const metrics: Record<string, Metric> = {
        nomina: bankMetric(
          salary,
          "Nómina cobrada; sin documentos ni pronóstico",
        ),
        bonus: bankMetric(bonus, "Bonus cobrado"),
        otros: bankMetric(other, "Incluye Intereses una vez"),
        interesesIngreso: bankMetric(
          other.filter((r) => r.subtipo === "Intereses"),
          "Parte de Otros ingresos",
        ),
        restoOtros: bankMetric(
          other.filter((r) => r.subtipo !== "Intereses"),
          "Otros sin Intereses",
        ),
        ingresos: bankMetric(
          income,
          "Suma de hechos bancarios únicos; sin duplicar asociaciones N:M",
        ),
        gasto: bankMetric(
          expenses,
          "Todos los Gastos brutos registrados, incluidas cuotas/compartidos/terminal/sin plan. Difiere de H física; sin netos E3",
        ),
        cuotas: bankMetric(
          debt.cuotas,
          "Subconjunto de Gasto con relación Deuda válida, también inactiva",
          debt.invalidos.length === 0,
        ),
        extraordinaria: bankMetric(
          debt.extraordinarias,
          "Amortización deuda con relación válida",
          debt.invalidos.length === 0,
        ),
        deudas: bankMetric(
          [...debt.cuotas, ...debt.extraordinarias],
          "Informativo; no se resta de nuevo",
          debt.invalidos.length === 0,
        ),
        capital: metric(
          null,
          "Deudas · desglose de pagos del intervalo",
          "No es capital pendiente actual ni apertura; cobertura histórica no acreditada; desconocido no se deriva por diferencia",
          debt.fuentes.map((r) => r.movimiento),
          true,
          valid && debt.desgloseVerificable && debt.fuentes.length
            ? decimal(debt.capital)
            : null,
        ),
        interesesDeuda: metric(
          null,
          "Deudas · desglose de pagos del intervalo",
          "Solo componentes explícitos verificables; cobertura histórica no acreditada",
          debt.fuentes.map((r) => r.movimiento),
          true,
          valid && debt.desgloseVerificable && debt.fuentes.length
            ? decimal(debt.intereses)
            : null,
        ),
      };
      metrics.operativo = metric(
        observedOperating(
          metrics.ingresos.valor,
          metrics.gasto.valor,
          metrics.extraordinaria.valor,
        ),
        "Movimientos · Ingresos − Gasto bruto − Extraordinaria",
        "No disponible sin los tres componentes completos. Cuando sea calculable será PARCIAL por definición; no representa ahorro real ni variación patrimonial completa",
        rows.map((r) => r.id),
        true,
      );
      let lines: ReturnType<typeof planLines> = [];
      let plan: ReturnType<typeof getCyclePlan> | null = null;
      try {
        lines = planLines(db, id);
        plan = getCyclePlan(db, id, now);
      } catch {
        erroresFuente.push("Plan del ciclo");
      }
      for (const field of ["base", "delMes"] as const) {
        const known = lines.filter((l) => l[field] !== null),
          complete =
            plan !== null && lines.length > 0 && known.length === lines.length;
        metrics[field] = metric(
          complete
            ? decimal(known.reduce((s, l) => s + BigInt(l[field]!), 0n))
            : null,
          "Plan del ciclo · " + field,
          plan === null
            ? "Error de fuente Plan del ciclo; no se presupone un plan vacío"
            : !lines.length
              ? "Sin plan"
              : !complete
                ? "Campo incompleto; subtotal conocido no es objetivo total"
                : "Completo para líneas registradas, incluidas inactivas; no plan anual ni Esencial",
          known.map((l) => l.presupuesto),
          !complete,
          !complete && known.length
            ? decimal(known.reduce((s, l) => s + BigInt(l[field]!), 0n))
            : null,
          `${known.length}/${lines.length} líneas informadas`,
        );
      }
      let monthly: ReturnType<typeof payrollMonthlyReference>;
      try {
        monthly = payrollMonthlyReference(db, cutoff);
      } catch {
        erroresFuente.push("Nómina");
        monthly = {
          ...monthlyReference([], cutoff),
          motivo: "Error de fuente Nómina; reintenta la consulta",
          revision: "fuente-error",
        };
      }
      metrics.media = metric(
        monthly.valor,
        monthly.procedencia,
        monthly.motivo,
        monthly.meses.flatMap((m) => m.pagas.map((p) => p.id)),
        monthly.estado === "Parcial",
        null,
        `${monthly.n}/12 meses válidos`,
      );
      metrics.margenReal = metric(
        planningMargin(metrics.nomina.valor, metrics.delMes.valor),
        "Nómina cobrada del ciclo − Del mes",
        "Margen del PLAN; no ahorro ejecutado ni Bonus/forecast",
      );
      metrics.margenEstructural = metric(
        monthly.exacto && metrics.base.valor !== null
          ? ratioMoney(monthly.exacto, metrics.base.valor)
          : null,
        "Motor Nómina · Media mensual exacta − Base",
        "Margen del PLAN; cobertura heredada de la media y Base",
        metrics.media.ids,
        monthly.estado === "Parcial",
        null,
        `${monthly.n}/12 meses válidos; ${metrics.base.cobertura}`,
      );
      // Read every identity using the unique position motor; no first-page truncation.
      const saldos: ReturnType<typeof getSaldo>[] = [];
      const saldoErrors: { id: string; revision: number; motivo: string }[] =
        [];
      try {
        for (const r of db
          .query("SELECT id FROM saldos WHERE id!='S000' ORDER BY id")
          .all() as { id: string }[]) {
          try {
            saldos.push(getSaldo(db, r.id));
          } catch {
            saldoErrors.push({
              id: r.id,
              revision: 0,
              motivo:
                "Posición/pertenencia no verificable: error de fuente Saldos",
            });
          }
        }
      } catch {
        saldoErrors.push({
          id: "universo-saldos",
          revision: 0,
          motivo: "Universo Saldos no verificable",
        });
      }
      if (saldoErrors.length) erroresFuente.push("Saldos");
      const active = saldos.filter((s) => s.estado === "Activa"),
        eligible = active.filter((s) => s.liquidez === true),
        unknown = active.filter((s) => s.liquidez === null);
      const included = eligible.filter((s) => s.posicion.importe !== null),
        excluded = [
          ...eligible.filter((s) => s.posicion.importe === null),
          ...unknown,
        ];
      const liquidity = included
        .reduce((s, r) => s.add(D(r.posicion.importe!)), D("0"))
        .money();
      metrics.liquidez = metric(
        excluded.length || saldoErrors.length ? null : liquidity,
        "Saldos · posición actual de activos con Liquidez Sí",
        "Contexto actual independiente del ciclo. No existe fecha bancaria única de valoración; no es cierre histórico",
        included.map((s) => s.id),
        excluded.length > 0 || saldoErrors.length > 0,
        (excluded.length || saldoErrors.length) && included.length
          ? liquidity
          : null,
        `${included.length}/${eligible.length} posiciones elegibles; ${unknown.length} pertenencias sin informar`,
      );
      if (
        included.some(
          (s) => s.tipo === "Efectivo" && s.control === "Inversiones",
        )
      )
        metrics.liquidez.motivo +=
          " Cobertura histórica no importada: la posición de inversión solo incluye Compras y Ventas registradas en la aplicación.";
      metrics.liquidezHistorica = absent(
        "Sin reconstrucción/fotografía verificable compatible con el corte financiado",
      );
      metrics.variacionAhorro = absent(
        "Faltan posiciones verificables en dos cortes consecutivos",
      );
      metrics.ahorroCierre = absent(
        "Sin proveedor de posiciones de ahorro al corte",
      );
      metrics.ahorroResidual = absent(
        "Identidad de Presupuesto de Ahorro no acreditada; no se infiere del nombre",
        "Presupuestos · R3",
      );
      const pendientes = [
        "Neto Compartido/recuperaciones",
        "Comida/compensaciones",
        "Netos E3 y gasto ajustado",
        "Ahorro económico generado",
        "Variación patrimonial",
        "Flujo completo/márgenes netos/cierre definitivo",
      ];
      const ajuste = ajusteCompartidos(
        db,
        ciclo,
        cutoff,
        metrics.gasto.valor ?? metrics.gasto.subtotal,
        metrics.ingresos.valor ?? metrics.ingresos.subtotal,
        metrics.extraordinaria.valor ?? metrics.extraordinaria.subtotal,
      );
      return {
        ciclo,
        corteEfectivo: cutoff,
        contexto,
        consulta: new Date(now).toISOString(),
        metrics,
        mensual: monthly,
        liquidez: {
          fechaValoracion: null,
          fuente:
            "Posiciones actuales del motor Saldos; consulta no equivale a valoración bancaria",
          incluidos: included.map((s) => ({
            id: s.id,
            revision: s.revision,
            valor: s.posicion.importe,
          })),
          excluidos: [
            ...excluded.map((s) => ({
              id: s.id,
              revision: s.revision,
              motivo:
                s.liquidez === null
                  ? "Liquidez sin informar"
                  : s.posicion.motivo,
            })),
            ...saldoErrors,
          ],
        },
        hechos: rows.map((r) => ({
          id: r.id,
          revision: r.revision,
          tipo: r.tipo,
          fecha: r.fecha,
          importe: decimal(r.importe),
        })),
        deuda: { fuentes: debt.fuentes, invalidos: debt.invalidos },
        plan: {
          sinPlan: plan !== null && lines.length === 0,
          sinPlanificar:
            plan?.items
              .filter((i) => i.sinPlanificar)
              .map((i) => i.presupuesto.id) ?? [],
          revision: plan?.revision ?? null,
          contextRevision: plan?.contextRevision ?? null,
        },
        pendientes,
        ajusteCompartidos: ajuste.ajusteCompartidos,
        flujoAjustado: ajuste.flujoAjustado,
        coberturaBancaria: {
          verificada: false,
          motivo:
            "Cobertura histórica del intervalo no acreditada. Los importes registrados se muestran como subtotales parciales.",
        },
        alcance:
          "Hechos registrados del intervalo y fuentes de cada métrica. No acredita operaciones ausentes ni historia anterior al control; no flujo global completo.",
        procedencia:
          "C49 física usa último ciclo; aquí Nómina bancaria del ciclo seleccionado. C48 física cuenta filas; aquí meses documentales válidos. Regla anual Excel excluye S015 en su subtotal e incluye Niños/inversión: no se aplica a Liquidez ni se importa B54:B59.",
        erroresFuente,
        revision: fingerprint([
          ciclo,
          contexto,
          all,
          lines,
          monthly.revision,
          saldos,
          saldoErrors,
          plan?.contextRevision,
          erroresFuente,
        ]),
        ciclos: cycleMaster(db),
      };
    })
    .deferred();
}
export type MonthlyFlow = ReturnType<typeof monthlyFlow>;
