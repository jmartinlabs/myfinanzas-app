import type { Database } from "bun:sqlite";
import { dayBefore, getCycle } from "./ciclos";
import { getReaperturaEstado } from "./e410";
import { fingerprint } from "./movement-ledger";
import { Problem } from "./problem";
import { decimal } from "./saldos";

/**
 * E4.10 I3 — read-only revalidation of later dependencies (SPEC28 §9, D4).
 *
 * The operation never writes: it does not update S0, plans, photos,
 * `reaperturas` or any precontrol/aggregate source. It returns the compared
 * values, the result per dependency and a deterministic fingerprint so I4 can
 * persist the same evidence with the re-closure (the persistence/audit chain
 * belongs to I4 and is deliberately not anticipated here).
 *
 * E4.5 (precontrol) and E4.11 (aggregates) are not implemented. When no
 * provider is supplied the result is `NoDisponible` with an explicit motive:
 * never `0`, never `Verificado` and never a blocker by itself. A provider may
 * be wired by the future increment; unreadable, contradictory or unaccredited
 * evidence fails closed.
 */

export type RevalidacionCheckEstado =
  | "Verificado"
  | "NoDisponible"
  | "Aviso"
  | "Bloqueante";

export type RevalidacionCheck = {
  clave:
    | "version"
    | "cierrePosterior"
    | "fotosPosteriores"
    | "s0PlanSiguiente"
    | "auxiliares"
    | "agregadosE411"
    | "precontrolE45";
  estado: RevalidacionCheckEstado;
  codigo: string | null;
  motivo: string | null;
  /** Values read and compared, never a recomputed financial total. */
  comparado: unknown;
};

export type RevalidacionEstado =
  | "Verificado"
  | "Parcial"
  | "ConAvisos"
  | "Bloqueante";

export type RevalidacionBody = {
  ciclo: string;
  estado: RevalidacionEstado;
  bloquea: boolean;
  version: number;
  reapertura: { id: number; versionOrigen: number };
  comprobaciones: RevalidacionCheck[];
  bloqueos: string[];
  avisos: string[];
};

export type RevalidacionResult = RevalidacionBody & { fingerprint: string };

export type RevalidacionAporte = {
  estado:
    | "Verificado"
    | "NoDisponible"
    | "Ilegible"
    | "Contradiccion"
    | "Aviso";
  codigo?: string | null;
  motivo?: string | null;
  /** Present on `Verificado`: read-only values to record. */
  datos?: unknown;
  /** Present on `Contradiccion`/`Aviso`: expected and observed values. */
  esperado?: unknown;
  observado?: unknown;
  /** Required on `Aviso`: why the difference is non-blocking. */
  acreditacion?: string | null;
};

export type RevalidacionProveedor = () => RevalidacionAporte;

export type RevalidacionOptions = {
  /** E4.5 precontrol/historical read model. Absent means not implemented. */
  precontrol?: RevalidacionProveedor;
  /** E4.11 aggregate read model. Absent means not implemented. */
  agregados?: RevalidacionProveedor;
};

type ClosureRow = { version: number; inicio: string; fin: string };

function lastClosure(db: Database, ciclo: string): ClosureRow | null {
  return (
    (db
      .query(
        "SELECT version,inicio,fin FROM cierres WHERE ciclo=? ORDER BY version DESC LIMIT 1",
      )
      .get(ciclo) as ClosureRow | null) ?? null
  );
}

function hasTable(db: Database, name: string) {
  return !!db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function blocked(
  clave: RevalidacionCheck["clave"],
  motivo: string,
  codigo = "REVALIDACION_BLOQUEANTE",
  comparado: unknown = null,
): RevalidacionCheck {
  return { clave, estado: "Bloqueante", codigo, motivo, comparado };
}

function externalCheck(
  clave: RevalidacionCheck["clave"],
  proveedor: RevalidacionProveedor | undefined,
  absent: { codigo: string; motivo: string },
): RevalidacionCheck {
  if (!proveedor)
    return {
      clave,
      estado: "NoDisponible",
      codigo: absent.codigo,
      motivo: absent.motivo,
      comparado: null,
    };
  let raw: unknown;
  try {
    raw = proveedor();
  } catch {
    return blocked(
      clave,
      `No se pudo leer la fuente ${clave}; no se asume que no bloquee.`,
    );
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return blocked(clave, `La fuente ${clave} no devolvió datos legibles.`);
  const aporte = raw as RevalidacionAporte;
  switch (aporte.estado) {
    case "Verificado":
      return {
        clave,
        estado: "Verificado",
        codigo: null,
        motivo: null,
        comparado: aporte.datos ?? null,
      };
    case "NoDisponible": {
      const motivo = text(aporte.motivo);
      if (!motivo)
        return blocked(
          clave,
          `La fuente ${clave} no explicó por qué no está disponible.`,
        );
      return {
        clave,
        estado: "NoDisponible",
        codigo: text(aporte.codigo) ?? absent.codigo,
        motivo,
        comparado: null,
      };
    }
    case "Ilegible":
      return blocked(
        clave,
        text(aporte.motivo) ??
          `La fuente ${clave} existe pero no se pudo leer; no se asume no bloqueante.`,
      );
    case "Contradiccion": {
      const motivo = text(aporte.motivo);
      if (!motivo)
        return blocked(
          clave,
          `La fuente ${clave} informa contradicción sin motivo.`,
        );
      return blocked(clave, motivo, "REVALIDACION_BLOQUEANTE", {
        esperado: aporte.esperado ?? null,
        observado: aporte.observado ?? null,
      });
    }
    case "Aviso": {
      const motivo = text(aporte.motivo);
      const acreditacion = text(aporte.acreditacion);
      if (!motivo || !acreditacion)
        return blocked(
          clave,
          `La diferencia de ${clave} no está acreditada como no bloqueante.`,
        );
      return {
        clave,
        estado: "Aviso",
        codigo: text(aporte.codigo) ?? "AVISO_NO_MATERIAL",
        motivo,
        comparado: {
          esperado: aporte.esperado ?? null,
          observado: aporte.observado ?? null,
          acreditacion,
        },
      };
    }
    default:
      return blocked(
        clave,
        `La fuente ${clave} devolvió un resultado no reconocido.`,
      );
  }
}

function nextCycle(db: Database, ciclo: string) {
  return (
    (db
      .query(
        `SELECT id,inicio,CAST(saldo_comida AS TEXT) saldo_comida,revision
         FROM ciclos WHERE inicio>? ORDER BY inicio LIMIT 1`,
      )
      .get(ciclo) as {
      id: string;
      inicio: string;
      saldo_comida: string;
      revision: number;
    } | null) ?? null
  );
}

function nextPlan(db: Database, ciclo: string) {
  if (!hasTable(db, "cycle_plans") || !hasTable(db, "cycle_plan_lines"))
    return { error: "El plan del ciclo siguiente no es legible." } as const;
  try {
    const header = db
      .query("SELECT revision FROM cycle_plans WHERE ciclo=?")
      .get(ciclo) as { revision: number } | null;
    const lines = db
      .query("SELECT COUNT(*) n FROM cycle_plan_lines WHERE ciclo=?")
      .get(ciclo) as { n: number };
    if (!header) {
      if (lines.n > 0)
        return {
          error: "Hay líneas de plan sin cabecera para el ciclo siguiente.",
        } as const;
      return { estado: "SinPlan", revision: null, lineas: 0 } as const;
    }
    if (!Number.isSafeInteger(header.revision) || header.revision < 1)
      return { error: "La revisión del plan siguiente es ilegible." } as const;
    return {
      estado: "Capturado",
      revision: header.revision,
      lineas: lines.n,
    } as const;
  } catch {
    return { error: "No se pudo leer el plan del ciclo siguiente." } as const;
  }
}

function auxiliaryCounts(
  db: Database,
  inicio: string,
  fin: string,
): Record<string, number> {
  const required = [
    "movimiento_anticipo",
    "movimiento_compartido",
    "payroll_allocations",
    "movimiento_revision_comida",
    "deudas",
  ];
  for (const table of required)
    if (!hasTable(db, table))
      throw new Error(`Falta la tabla auxiliar ${table}.`);
  return {
    anticipos: (
      db
        .query(
          `SELECT COUNT(*) n FROM movimiento_anticipo a
           JOIN movimientos m ON m.id=a.movimiento
           WHERE m.fecha BETWEEN ? AND ?`,
        )
        .get(inicio, fin) as { n: number }
    ).n,
    compartidos: (
      db
        .query(
          `SELECT COUNT(*) n FROM movimiento_compartido c
           JOIN movimientos m ON m.id=c.movimiento
           WHERE m.fecha BETWEEN ? AND ?`,
        )
        .get(inicio, fin) as { n: number }
    ).n,
    nomina: (
      db
        .query(
          `SELECT COUNT(*) n FROM payroll_allocations p
           JOIN movimientos m ON m.id=p.movimiento
           WHERE m.fecha BETWEEN ? AND ?`,
        )
        .get(inicio, fin) as { n: number }
    ).n,
    revisionComida: (
      db
        .query(
          `SELECT COUNT(*) n FROM movimiento_revision_comida c
           JOIN movimientos m ON m.id=c.movimiento
           WHERE m.fecha BETWEEN ? AND ?`,
        )
        .get(inicio, fin) as { n: number }
    ).n,
    deuda: (db.query("SELECT COUNT(*) n FROM deudas").get() as { n: number }).n,
  };
}

/**
 * Compute the read-only revalidation for a cycle with an open window. It
 * throws 409 `NO_REBIERTO` when there is no active window for that cycle.
 */
export function getRevalidacion(
  db: Database,
  cicloId: string,
  options: RevalidacionOptions = {},
): RevalidacionResult {
  const { ciclo } = getCycle(db, cicloId);
  const state = getReaperturaEstado(db, ciclo.id);
  if (state.estado !== "Reabierto" || !state.reapertura)
    throw new Problem(
      409,
      "NO_REBIERTO",
      "El ciclo no tiene una reapertura activa que revalidar.",
      {},
      { ciclo: ciclo.id, estado: state.estado },
    );
  const last = lastClosure(db, ciclo.id);
  if (!last)
    throw new Problem(
      409,
      "SIN_CIERRE",
      "El ciclo no tiene un cierre que revalidar.",
    );

  const comprobaciones: RevalidacionCheck[] = [];

  comprobaciones.push(
    state.reapertura.versionOrigen === last.version
      ? {
          clave: "version",
          estado: "Verificado",
          codigo: null,
          motivo: null,
          comparado: {
            versionOrigen: state.reapertura.versionOrigen,
            ultimaVersion: last.version,
          },
        }
      : blocked(
          "version",
          "La ventana no corresponde a la última versión cerrada.",
          "ESTADO_INCONSISTENTE",
          {
            versionOrigen: state.reapertura.versionOrigen,
            ultimaVersion: last.version,
          },
        ),
  );

  const laterClosure = db
    .query(
      `SELECT c.ciclo,c.version,c.fin FROM cierres c
       WHERE c.ciclo<>?
         AND c.version=(SELECT MAX(v.version) FROM cierres v WHERE v.ciclo=c.ciclo)
         AND c.fin>=?
       ORDER BY c.fin,c.ciclo LIMIT 1`,
    )
    .get(ciclo.id, last.fin) as {
    ciclo: string;
    version: number;
    fin: string;
  } | null;
  comprobaciones.push(
    laterClosure
      ? blocked(
          "cierrePosterior",
          "Existe un cierre posterior durante la ventana; no se altera.",
          "CIERRE_POSTERIOR",
          laterClosure,
        )
      : {
          clave: "cierrePosterior",
          estado: "Verificado",
          codigo: null,
          motivo: null,
          comparado: { cierrePosterior: null },
        },
  );

  const laterVersion = db
    .query(
      "SELECT version,creado_utc FROM cierres WHERE ciclo=? AND version>? ORDER BY version LIMIT 1",
    )
    .get(ciclo.id, last.version) as {
    version: number;
    creado_utc: string;
  } | null;
  comprobaciones.push(
    laterVersion
      ? blocked(
          "fotosPosteriores",
          "Apareció una versión posterior del mismo ciclo durante la ventana.",
          "VERSION_POSTERIOR",
          laterVersion,
        )
      : {
          clave: "fotosPosteriores",
          estado: "Verificado",
          codigo: null,
          motivo: null,
          comparado: { ultimaVersion: last.version },
        },
  );

  const siguiente = nextCycle(db, ciclo.inicio);
  const esperadoFin = siguiente ? dayBefore(siguiente.inicio) : null;
  // D4 forbids recalculating an alien S0/plan. The material check is that the
  // frozen window still matches the next cycle start; the S0 and plan values
  // are only read and recorded, never rewritten or derived again.
  if (!siguiente)
    comprobaciones.push({
      clave: "s0PlanSiguiente",
      estado: "NoDisponible",
      codigo: "SIN_CICLO_SIGUIENTE",
      motivo: "No existe un ciclo siguiente que revalidar.",
      comparado: null,
    });
  else {
    const plan = nextPlan(db, siguiente.id);
    const comparado = {
      siguiente: {
        id: siguiente.id,
        inicio: siguiente.inicio,
        saldoInicialComida: decimal(String(siguiente.saldo_comida)),
        revision: siguiente.revision,
      },
      finFoto: last.fin,
      esperadoFin,
      plan,
    };
    if (esperadoFin !== last.fin)
      comprobaciones.push(
        blocked(
          "s0PlanSiguiente",
          "La ventana congelada del cierre no coincide con el ciclo siguiente.",
          "S0_PLAN_INCOHERENTE",
          comparado,
        ),
      );
    else if ("error" in plan)
      comprobaciones.push(
        blocked(
          "s0PlanSiguiente",
          plan.error ?? "El plan del ciclo siguiente no es legible.",
          "PLAN_ILEGIBLE",
          comparado,
        ),
      );
    else
      comprobaciones.push({
        clave: "s0PlanSiguiente",
        estado: "Verificado",
        codigo: null,
        motivo: null,
        comparado,
      });
  }

  try {
    comprobaciones.push({
      clave: "auxiliares",
      estado: "Verificado",
      codigo: null,
      motivo: null,
      comparado: {
        cicloReabierto: auxiliaryCounts(db, last.inicio, last.fin),
        cicloSiguiente: siguiente
          ? auxiliaryCounts(db, siguiente.inicio, dayBefore(siguiente.inicio))
          : null,
      },
    });
  } catch {
    comprobaciones.push(
      blocked(
        "auxiliares",
        "Una fuente auxiliar no se pudo leer; no se acredita su ausencia de impacto.",
      ),
    );
  }

  comprobaciones.push(
    externalCheck("agregadosE411", options.agregados, {
      codigo: "E4_11_NO_DISPONIBLE",
      motivo:
        "E4.11 no está implementado; no hay agregados que revalidar y no se declara verificado.",
    }),
  );
  comprobaciones.push(
    externalCheck("precontrolE45", options.precontrol, {
      codigo: "E4_5_NO_DISPONIBLE",
      motivo:
        "E4.5 no está implementado; no hay precontrol que revalidar y no se declara verificado.",
    }),
  );

  const bloqueos = comprobaciones
    .filter((check) => check.estado === "Bloqueante")
    .map((check) => check.clave);
  const avisos = comprobaciones
    .filter((check) => check.estado === "Aviso")
    .map((check) => check.clave);
  const estado: RevalidacionEstado = bloqueos.length
    ? "Bloqueante"
    : avisos.length
      ? "ConAvisos"
      : comprobaciones.some((check) => check.estado === "NoDisponible")
        ? "Parcial"
        : "Verificado";
  const body: RevalidacionBody = {
    ciclo: ciclo.id,
    estado,
    bloquea: bloqueos.length > 0,
    version: last.version,
    reapertura: {
      id: state.reapertura.id,
      versionOrigen: state.reapertura.versionOrigen,
    },
    comprobaciones,
    bloqueos,
    avisos,
  };
  return { ...body, fingerprint: fingerprint(body) };
}
