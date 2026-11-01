import type { Database } from "bun:sqlite";
import { getCycle } from "./ciclos";
import { getCyclePlan } from "./planes-ciclo";
import {
  cashAt,
  investmentInstalled,
  positionsFor,
} from "./investment-engine";
import { decimal } from "./saldos";
import { fingerprint, financeRevision, ledgerRows, type LedgerRow } from "./movement-ledger";

export type PrecierreEstado =
  | "Listo"
  | "Listo con avisos"
  | "Parcial"
  | "Bloqueado";
export type PrecierreSourceStatus =
  | "Verificado"
  | "Válido"
  | "Integrado"
  | "Parcial"
  | "Vacío"
  | "No disponible"
  | "Bloqueado"
  | "Error";
export type PrecierreSource = {
  key: string;
  label: string;
  cobertura: string;
  estado: PrecierreSourceStatus;
  motivo: string;
  enlace: string | null;
  aplicable: boolean;
};
export type PrecierreIssue = { code: string; message: string };
export type PrecierreOptions = {
  /** Test-only seam: force an absent S0 without inventing a database row. */
  s0?: string | null;
  /** Test-only seam: force the derived window. */
  fin?: string | null;
  /** Test-only seam for the DT6 preflight. Defaults to no evidence. */
  backup?: { verified: boolean; reason?: string } | null;
  /** Test-only seam for SPEC27 closure photos. Defaults to none. */
  closures?: { id: string; fin: string; coherent: boolean }[];
  /** Test-only seam for an inconsistent plan. */
  planState?: "PlanVerificado" | "PlanNoVerificable";
};

const empty = "Sin hechos";
const unavailable = (key: string, label: string, motivo: string): PrecierreSource => ({
  key,
  label,
  cobertura: "No disponible",
  estado: "No disponible",
  motivo,
  enlace: null,
  aplicable: false,
});
function count(
  db: Database,
  sql: string,
  start: string,
  end: string,
): number | null {
  try {
    return (
      db.query(sql).get(start, end) as { n: number } | null
    )?.n ?? 0;
  } catch {
    return null;
  }
}
function movementSource(
  db: Database,
  rows: LedgerRow[],
  start: string,
  end: string,
): PrecierreSource {
  const inWindow = rows.filter(
    (r) => !r.anulado && start <= r.fecha && r.fecha <= end,
  );
  let inconsistent: { id: string }[] = [];
  try {
    inconsistent = db
      .query(
        `SELECT m.id FROM movimientos m JOIN referencias r ON r.id=m.referencia
         WHERE m.anulado=0 AND m.fecha BETWEEN ? AND ? AND r.estado<>'Activa'`,
      )
      .all(start, end) as { id: string }[];
  } catch {
    return {
      key: "movimientos",
      label: "Movimientos / clasificación / Referencias",
      cobertura: "Error de lectura",
      estado: "Error",
      motivo: "No se pudo comprobar la consistencia de Movimientos.",
      enlace: "/movimientos",
      aplicable: true,
    };
  }
  if (inconsistent.length)
    return {
      key: "movimientos",
      label: "Movimientos / clasificación / Referencias",
      cobertura: `${inWindow.length} hechos · ${inconsistent.length} inconsistencias`,
      estado: "Bloqueado",
      motivo: `Referencias inactivas usadas: ${inconsistent
        .map((r) => r.id)
        .join(", ")}.`,
      enlace: "/movimientos",
      aplicable: true,
    };
  return {
    key: "movimientos",
    label: "Movimientos / clasificación / Referencias",
    cobertura: inWindow.length ? `${inWindow.length} hechos` : empty,
    estado: inWindow.length ? "Verificado" : "Vacío",
    motivo: inWindow.length ? "Núcleo verificado." : "Sin operaciones imputables.",
    enlace: "/movimientos",
    aplicable: true,
  };
}
function planSource(
  db: Database,
  id: string,
  now: number,
  options: PrecierreOptions,
): {
  source: PrecierreSource;
  sinPlanificar: boolean;
  planState: "SinPlan" | "PlanVerificado" | "PlanNoVerificable";
} {
  try {
    const plan = getCyclePlan(db, id, now);
    const planState = plan.sinPlan
      ? "SinPlan"
      : (options.planState ?? "PlanVerificado");
    const sinPlanificar = plan.items.some((i) => i.sinPlanificar);
    if (planState === "PlanNoVerificable")
      return {
        sinPlanificar,
        planState,
        source: {
          key: "plan",
          label: "Plan del ciclo",
          cobertura: `${plan.items.length} líneas`,
          estado: "Bloqueado",
          motivo: "Líneas o revisión del plan no verificables.",
          enlace: "/planes-ciclo",
          aplicable: true,
        },
      };
    return {
      sinPlanificar,
      planState,
      source: {
        key: "plan",
        label: "Plan del ciclo",
        cobertura: plan.sinPlan ? "SinPlan" : `${plan.items.length} líneas`,
        estado: plan.sinPlan ? "Válido" : "Verificado",
        motivo: plan.sinPlan ? "Sin líneas; no bloquea." : "Plan consistente.",
        enlace: "/planes-ciclo",
        aplicable: true,
      },
    };
  } catch {
    return {
      sinPlanificar: false,
      planState: "PlanNoVerificable",
      source: {
        key: "plan",
        label: "Plan del ciclo",
        cobertura: "Error de lectura",
        estado: "Error",
        motivo: "No se pudo leer el plan del ciclo.",
        enlace: "/planes-ciclo",
        aplicable: true,
      },
    };
  }
}
function auxiliary(
  db: Database,
  key: string,
  label: string,
  sql: string,
  start: string,
  end: string,
  enlace: string,
): PrecierreSource {
  const n = count(db, sql, start, end);
  if (n === null)
    return {
      key,
      label,
      cobertura: "Error de lectura",
      estado: "Error",
      motivo: "No se pudo leer la fuente.",
      enlace,
      aplicable: false,
    };
  return {
    key,
    label,
    cobertura: n ? `${n} hechos` : empty,
    estado: n ? "Verificado" : "Vacío",
    motivo: n ? "Con hechos en la ventana." : "Sin hechos imputables.",
    enlace,
    aplicable: false,
  };
}
function investmentSource(
  db: Database,
  end: string,
): { source: PrecierreSource; efectivo: string | null; instrumentos: number } {
  if (!investmentInstalled(db))
    return {
      instrumentos: 0,
      efectivo: null,
      source: {
        key: "inversion",
        label: "E4.1 Inversión",
        cobertura: "No disponible",
        estado: "No disponible",
        motivo: "Motor de inversión no instalado.",
        enlace: "/inversiones",
        aplicable: true,
      },
    };
  try {
    const cash = cashAt(db, "S003", end);
    const instruments = db
      .query("SELECT id FROM instrumentos WHERE estado='Activa' ORDER BY id")
      .all() as { id: string }[];
    let positions = 0;
    for (const instrument of instruments)
      positions += positionsFor(db, instrument.id).length;
    const value = decimal(cash.disponible) ?? "0.00";
    const empty = instruments.length === 0 && cash.disponible === 0n;
    return {
      efectivo: value,
      instrumentos: instruments.length,
      source: {
        key: "inversion",
        label: "E4.1 Inversión",
        cobertura: empty
          ? "Vacío"
          : `${instruments.length} instrumentos · ${positions} posiciones · efectivo ${value}`,
        estado: empty ? "Vacío" : "Integrado",
        motivo: empty
          ? "Sin posiciones ni efectivo de inversión."
          : "Instrumentos, efectivo y posiciones a Fin.",
        enlace: "/inversiones",
        aplicable: true,
      },
    };
  } catch {
    return {
      instrumentos: 0,
      efectivo: null,
      source: {
        key: "inversion",
        label: "E4.1 Inversión",
        cobertura: "Error de lectura",
        estado: "Error",
        motivo: "No se pudo leer la posición de inversión al corte.",
        enlace: "/inversiones",
        aplicable: true,
      },
    };
  }
}
export function getPrecierre(
  db: Database,
  id: string,
  now = Date.now(),
  options: PrecierreOptions = {},
) {
  const { ciclo } = getCycle(db, id);
  const fin = options.fin !== undefined ? options.fin : ciclo.fin;
  const s0 = options.s0 !== undefined ? options.s0 : ciclo.saldoInicialComida;
  const end = fin ?? ciclo.corte ?? ciclo.inicio;
  const bloqueos: PrecierreIssue[] = [];
  const avisos: PrecierreIssue[] = [];
  if (!fin)
    bloqueos.push({
      code: "SIN_SIGUIENTE_INICIO",
      message: "No existe siguiente Inicio; no se deriva Fin ni se permite cerrar.",
    });
  if (s0 === null || s0 === undefined)
    bloqueos.push({
      code: "S0_AUSENTE",
      message: "Falta el Saldo inicial manual del ciclo.",
    });
  const rows = ledgerRows(db);
  const movements = movementSource(db, rows, ciclo.inicio, end);
  if (movements.estado === "Bloqueado")
    bloqueos.push({
      code: "INCONSISTENCIA_NUCLEO",
      message: movements.motivo,
    });
  const plan = planSource(db, id, now, options);
  if (plan.planState === "PlanNoVerificable")
    bloqueos.push({
      code: "PLAN_NO_VERIFICABLE",
      message: "El plan tiene líneas o revisión no verificables.",
    });
  if (plan.sinPlanificar)
    avisos.push({
      code: "SIN_PLANIFICAR",
      message: "Existen hechos reales sin línea de plan.",
    });
  const backup =
    options.backup === undefined
      ? null
      : options.backup;
  if (!backup?.verified)
    bloqueos.push({
      code: "BACKUP_NO_VERIFICABLE",
      message:
        backup?.reason ??
        "Falta evidencia DT6/T-BKP: manifiesto, checksum, clave y restauración.",
    });
  const closures = options.closures ?? [];
  if (closures.length)
    avisos.push({
      code: "CIERRE_FUERA_DE_ORDEN",
      message: `Existen cierres posteriores: ${closures.map((c) => c.id).join(", ")}.`,
    });
  if (closures.some((c) => !c.coherent))
    bloqueos.push({
      code: "INCOHERENCIA_CON_CIERRE_POSTERIOR",
      message: "Diferencia no explicable frente a un cierre posterior al mismo corte.",
    });
  const investment = investmentSource(db, end);
  if (investment.source.estado === "Error")
    avisos.push({
      code: "INVERSION_ERROR",
      message: investment.source.motivo,
    });
  const fuentes: PrecierreSource[] = [
    movements,
    plan.source,
    auxiliary(
      db,
      "anticipos",
      "Anticipos",
      `SELECT COUNT(*) n FROM movimiento_anticipo a JOIN movimientos m ON m.id=a.movimiento
       WHERE m.anulado=0 AND m.fecha BETWEEN ? AND ?`,
      ciclo.inicio,
      end,
      "/anticipos",
    ),
    auxiliary(
      db,
      "compartidos",
      "Compartidos",
      `SELECT COUNT(*) n FROM movimiento_compartido c JOIN movimientos m ON m.id=c.movimiento
       WHERE m.anulado=0 AND m.fecha BETWEEN ? AND ?`,
      ciclo.inicio,
      end,
      "/compartidos",
    ),
    auxiliary(
      db,
      "nomina",
      "Nómina",
      `SELECT COUNT(*) n FROM payroll_allocations p JOIN movimientos m ON m.id=p.movimiento
       WHERE m.anulado=0 AND m.fecha BETWEEN ? AND ?`,
      ciclo.inicio,
      end,
      "/nomina",
    ),
    auxiliary(
      db,
      "comida",
      "Revisión Comida",
      `SELECT COUNT(*) n FROM movimiento_revision_comida c JOIN movimientos m ON m.id=c.movimiento
       WHERE m.anulado=0 AND m.fecha BETWEEN ? AND ?`,
      ciclo.inicio,
      end,
      "/comida",
    ),
    {
      key: "deuda",
      label: "Deuda E1.6",
      cobertura: "Disponible",
      estado: "Verificado",
      motivo: "Maestro de Deuda E1.6; no incluye E4.4.",
      enlace: "/deudas",
      aplicable: false,
    },
    investment.source,
    unavailable("e43", "E4.3 valoración / patrimonio", "Motor E4.3 no implementado."),
    unavailable(
      "e35",
      "E3.5 Comida / FIN_NETA",
      "Motor E3.5/FIN_NETA no integrado; P7 parcial. E4.9 queda bloqueado.",
    ),
    unavailable("e42", "E4.2 Ventas", "Sin DEV."),
    unavailable("e44", "E4.4 Deuda completa", "Documental sin código."),
    unavailable("e45", "E4.5 Histórico / precontrol", "Documental sin código."),
    unavailable("e36", "E3.6 Pendientes / conciliación", "Documental sin código."),
  ];
  const corePartial =
    movements.estado === "Error" || investment.source.estado === "Error";
  const optionalUnavailable = fuentes.some(
    (s) => !s.aplicable && s.estado === "No disponible",
  );
  const estado: PrecierreEstado = bloqueos.length
    ? "Bloqueado"
    : corePartial
      ? "Parcial"
      : avisos.length || optionalUnavailable
        ? "Listo con avisos"
        : "Listo";
  const body = {
    ciclo: {
      id: ciclo.id,
      inicio: ciclo.inicio,
      fin,
      saldoInicialComida: s0 ?? null,
      estadoTemporal: ciclo.estadoTemporal,
      revision: ciclo.revision,
    },
    estado,
    cobertura: optionalUnavailable ? "Parcial" : "Completa",
    e4_9Bloqueado:
      bloqueos.length > 0 ||
      fuentes.find((s) => s.key === "e35")?.estado === "No disponible",
    bloqueos,
    avisos,
    fuentes,
    plan: {
      estado: plan.planState,
      sinPlanificar: plan.sinPlanificar,
    },
    inversion: {
      efectivo: investment.efectivo,
      instrumentos: investment.instrumentos,
      valoracion: "No disponible",
      motivo: "E4.3 valoración/patrimonio no implementado.",
    },
    backup: {
      estado: backup?.verified ? "Verificado" : "No verificable",
      motivo: backup?.verified
        ? "Evidencia DT6/T-BKP aportada por el proveedor autorizado."
        : backup?.reason ??
          "Sin evidencia DT6/T-BKP recuperable.",
    },
    cierres: closures,
    sourceRevision: financeRevision(db),
  };
  return { ...body, revision: fingerprint(body) };
}
export function getPrecierreEstado(
  db: Database,
  id: string,
  now = Date.now(),
  options: PrecierreOptions = {},
) {
  const precierre = getPrecierre(db, id, now, options);
  return {
    ciclo: precierre.ciclo.id,
    estado: precierre.estado,
    cobertura: precierre.cobertura,
    e4_9Bloqueado: precierre.e4_9Bloqueado,
    revision: precierre.revision,
    bloqueos: precierre.bloqueos,
    avisos: precierre.avisos,
  };
}
