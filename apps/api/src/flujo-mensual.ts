import type { Database } from "bun:sqlite";
import { getCycle, cycleMaster } from "./ciclos";
import { ledgerRows, movementSource, fingerprint } from "./movement-ledger";
import { getSaldo, decimal, Problem } from "./saldos";
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
          " Cobertura histórica no importada: la posición de inversión solo incluye Compras registradas en la aplicación.";
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
