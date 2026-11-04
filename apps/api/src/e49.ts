import type { Database } from "bun:sqlite";
import { getCycle } from "./ciclos";
import { getCyclePlan } from "./planes-ciclo";
import { e35Metrics } from "./e35";
import {
  cashAt,
  investmentInstalled,
  positionsAtDate,
  quantityText,
} from "./investment-engine";
import { fingerprint, ledgerRows, type LedgerRow } from "./movement-ledger";
import { decimal, money } from "./saldos";
import { Problem } from "./problem";
import { resolveAppVersion } from "./app-version";

/**
 * E4.9 B core — single closure-state/preflight provider, the transactional
 * closure and the immutable v1 photo.
 *
 * It does not reimplement E4.1/E4.2/E4.3/E4.4/E3.5 engines: it consumes their
 * read models (`positionsAtDate`, `cashAt`, `getCyclePlan`, `e35Metrics`) and
 * records the result. D4 is strict: without a verifiable E3.5/FIN_NETA the
 * closure is blocked before any write. A verified DT6/T-BKP backup and restore
 * proof is also required; both facts come through the explicit evidence
 * provider because the real external restore remains open (DT6).
 */

export const actorDefault = "usuario-unico";

export type BackupEvidence = {
  verificado: boolean;
  /** DT6/T-BKP restoration must already be demonstrated, not inferred. */
  restauracionProbada?: boolean;
  referencia?: string | null;
  motivo?: string | null;
};

export type E35Evidence = {
  verificable: boolean;
  motivo?: string | null;
  huella?: string | null;
  cobertura?: string | null;
  datos?: unknown;
};

export type CierreOptions = {
  actor?: string;
  appVersion?: string;
  backup?: BackupEvidence | null;
  e35?: E35Evidence | null;
  /** Test-only seam: throws after every row is written, before commit. */
  hooks?: { beforeCommit?: () => void };
};

export type CierreIssue = { code: string; message: string };

type ClosureState = {
  ciclo: string;
  estado: "Abierto" | "Cerrado";
  version: number | null;
  fotoVersion: number | null;
  ventana: { inicio: string; fin: string | null };
  cierre: {
    version: number;
    inicio: string;
    fin: string;
    saldoInicial: string | null;
    actor: string;
    creadoUtc: string;
    motivo: string | null;
    fingerprint: string;
    estado: "Cerrado";
  } | null;
};

type PlanSnapshot = {
  estado: "SinPlan" | "Capturado" | "PlanNoVerificable";
  sinPlan: boolean;
  sinPlanificar: boolean;
  revision: number | null;
  contextRevision: string;
  items: unknown[];
  motivo?: string;
};

type FactsSnapshot = {
  ok: boolean;
  estado: "Con hechos" | "Sin hechos";
  movimientos: LedgerRow[];
  fuentes: { fuente: string; hechos: number; acreditado: boolean }[];
  totales: Record<string, string>;
  motivo?: string;
};

type AuxiliarySnapshot = {
  ok: boolean;
  anticipos: unknown[];
  compartidos: unknown[];
  nomina: unknown[];
  revisionComida: unknown[];
  deuda: unknown[];
  fuentes: { fuente: string; hechos: number; acreditado: boolean }[];
  motivo?: string;
};

type InvestmentSnapshot = {
  ok: boolean;
  efectivo: string | null;
  cuentas: { saldo: string; disponible: string }[];
  posiciones: {
    instrumento: string;
    saldoInversion: string;
    cantidad: string;
  }[];
  operaciones: {
    id: string;
    clase: string;
    fecha: string;
    instrumento: string;
    saldoEfectivo: string;
    saldoInversion: string;
    cantidad: string;
    importeEur: string | null;
    comisionEur: string | null;
    estado: string;
  }[];
  instrumentos: { id: string; nombre: string; revision: number }[];
  motivo?: string;
};

type ClassificationSnapshot = {
  ok: boolean;
  categorias: unknown[];
  subcategorias: unknown[];
  partidas: unknown[];
  referencias: unknown[];
  motivo?: string;
};

type PhotoPayload = {
  ventana: {
    inicio: string;
    /** `null` when no next Inicio exists; Fin is never invented. */
    fin: string | null;
    saldoInicial: string | null;
    estadoTemporal: string;
  };
  hechos: {
    estado: "Con hechos" | "Sin hechos";
    movimientos: LedgerRow[];
    fuentes: FactsSnapshot["fuentes"];
    totales: Record<string, string>;
  };
  plan: {
    estado: "SinPlan" | "Capturado";
    items: unknown[];
    revision: number | null;
    contextRevision: string;
    sinPlanificar: boolean;
  };
  clasificacion: {
    categorias: unknown[];
    subcategorias: unknown[];
    partidas: unknown[];
    referencias: unknown[];
  };
  inversion: {
    efectivo: string | null;
    cuentas: InvestmentSnapshot["cuentas"];
    posiciones: InvestmentSnapshot["posiciones"];
    operaciones: InvestmentSnapshot["operaciones"];
    instrumentos: InvestmentSnapshot["instrumentos"];
    valoracion: "No disponible";
    motivoValoracion: string;
  };
  auxiliares: {
    anticipos: unknown[];
    compartidos: unknown[];
    nomina: unknown[];
    revisionComida: unknown[];
    deuda: unknown[];
    e35: { verificable: boolean; huella: string | null; datos: unknown };
  };
  cobertura: {
    estado: "Completo" | "Parcial" | "No disponible";
    totales: Record<string, { estado: string; motivo: string }>;
  };
  backup: {
    verificado: boolean;
    restauracionProbada: boolean;
    referencia: string | null;
    motivo: string | null;
  };
  noDisponible: Record<string, { estado: string; motivo: string }>;
};

type ComparedPosition = {
  instrumento: string;
  saldoInversion: string;
  cantidad: string;
};

type ComparedCash = { saldo: string; disponible: string };

/**
 * Values actually compared by the AC-20 coherence check. They are stored in
 * `cierre_audit.posterior`, not only the closure identity, so the audit keeps
 * the evidence behind the result. Cash is kept both as total and as its
 * per-account breakdown so a per-account contradiction can be reproduced.
 */
type ComparedValues = {
  efectivo: { almacenado: string | null; vivo: string | null };
  cuentas: { almacenado: ComparedCash[] | null; vivo: ComparedCash[] };
  posiciones: {
    almacenado: ComparedPosition[] | null;
    vivo: ComparedPosition[];
  };
};

type Capture = {
  ciclo: ReturnType<typeof getCycle>["ciclo"];
  ventana: PhotoPayload["ventana"];
  siguienteInicio: string | null;
  plan: PlanSnapshot;
  e35: E35Evidence;
  backup: PhotoPayload["backup"];
  facts: FactsSnapshot;
  auxiliary: AuxiliarySnapshot;
  investment: InvestmentSnapshot;
  classification: ClassificationSnapshot;
  coherencia: {
    requerida: boolean;
    cierres: {
      ciclo: string;
      version: number;
      fin: string;
      coherente: boolean;
      motivos: string[];
      comparado: ComparedValues;
    }[];
    contradicciones: string[];
  };
  estadoCierre: ClosureState;
  payload: PhotoPayload;
  fingerprint: string;
  appVersion: string;
  schemaVersion: number;
  actor: string;
  blockers: CierreIssue[];
  warnings: CierreIssue[];
};

const hex64 = /^[a-f0-9]{64}$/;
const keyPattern = /^[a-zA-Z0-9-]{16,100}$/;
/** SQLite/JSON safe-integer ceiling used by the C25 `cierres` DIGIT check. */
const SAFE_INTEGER = 9007199254740991n;

function sum(values: bigint[]) {
  return values.reduce((a, b) => a + b, 0n);
}

function schemaVersion(db: Database) {
  return (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    }
  ).version;
}

function readRows<T>(
  db: Database,
  sql: string,
  ...params: (string | number)[]
): { rows: T[]; error: string | null } {
  try {
    return { rows: db.query(sql).all(...params) as T[], error: null };
  } catch {
    return { rows: [], error: "No se pudo leer la fuente." };
  }
}

/** Single read provider consumed by the API, preflight and future guards. */
export function getCierreEstado(db: Database, cicloId: string): ClosureState {
  const { ciclo } = getCycle(db, cicloId);
  const row = db
    .query(
      `SELECT ciclo,version,inicio,fin,saldo_inicial,actor,creado_utc,motivo,
        fingerprint,estado
       FROM cierres WHERE ciclo=? ORDER BY version DESC LIMIT 1`,
    )
    .get(cicloId) as
    | {
        ciclo: string;
        version: number;
        inicio: string;
        fin: string;
        saldo_inicial: number;
        actor: string;
        creado_utc: string;
        motivo: string | null;
        fingerprint: string;
        estado: "Cerrado";
      }
    | null;
  if (!row)
    return {
      ciclo: ciclo.id,
      estado: "Abierto",
      version: null,
      fotoVersion: null,
      ventana: { inicio: ciclo.inicio, fin: ciclo.fin },
      cierre: null,
    };
  return {
    ciclo: ciclo.id,
    estado: "Cerrado",
    version: row.version,
    fotoVersion: row.version,
    ventana: { inicio: row.inicio, fin: row.fin },
    cierre: {
      version: row.version,
      inicio: row.inicio,
      fin: row.fin,
      saldoInicial: decimal(String(row.saldo_inicial)),
      actor: row.actor,
      creadoUtc: row.creado_utc,
      motivo: row.motivo,
      fingerprint: row.fingerprint,
      estado: "Cerrado",
    },
  };
}

function defaultE35(
  db: Database,
  cicloId: string,
  now: number,
): E35Evidence {
  try {
    const metrics = e35Metrics(db, cicloId, now);
    return {
      verificable: metrics.proveedor.bloqueo.verificable,
      motivo: metrics.proveedor.bloqueo.motivo,
      huella: metrics.proveedor.huella,
      cobertura: metrics.proveedor.cobertura,
      datos: metrics,
    };
  } catch (error) {
    return {
      verificable: false,
      motivo:
        error instanceof Error
          ? error.message
          : "E3.5/FIN_NETA no verificable.",
      huella: null,
      cobertura: null,
      datos: null,
    };
  }
}

function backupEvidence(value: CierreOptions["backup"]): PhotoPayload["backup"] {
  if (!value)
    return {
      verificado: false,
      restauracionProbada: false,
      referencia: null,
      motivo:
        "Sin evidencia DT6/T-BKP: manifiesto, checksum, clave y restauración.",
    };
  const verificado = value.verificado === true;
  const restauracionProbada = value.restauracionProbada === true;
  return {
    verificado,
    restauracionProbada,
    referencia: value.referencia ?? null,
    motivo:
      value.motivo ??
      (verificado && restauracionProbada
        ? "Evidencia DT6/T-BKP aportada por el proveedor autorizado."
        : !verificado
          ? "Backup no verificable."
          : "Restauración DT6/T-BKP no demostrada."),
  };
}

function planSnapshot(
  db: Database,
  cicloId: string,
  now: number,
): PlanSnapshot {
  try {
    const plan = getCyclePlan(db, cicloId, now);
    const row = db
      .query("SELECT revision FROM cycle_plans WHERE ciclo=?")
      .get(cicloId) as { revision: number } | null;
    const audit = db
      .query("SELECT MAX(revision) m FROM cycle_plan_audit WHERE ciclo=?")
      .get(cicloId) as { m: number | null } | null;
    const mismatch =
      !!row && audit?.m !== null && audit?.m !== undefined && audit.m !== row.revision;
    const estado = plan.sinPlan
      ? "SinPlan"
      : mismatch
        ? "PlanNoVerificable"
        : "Capturado";
    return {
      estado,
      sinPlan: plan.sinPlan,
      sinPlanificar: plan.items.some((i) => i.sinPlanificar),
      revision: row?.revision ?? null,
      contextRevision: plan.contextRevision,
      items: plan.items
        .filter((i) => i.linea)
        .map((i) => ({
          presupuesto: i.presupuesto.id,
          nombre: i.presupuesto.nombre,
          fuente: i.presupuesto.fuente,
          base: i.linea!.base,
          esencial: i.linea!.esencial,
          delMes: i.linea!.delMes,
          aTransferir: i.aTransferir,
          estado: i.estado,
          motivo: i.motivo,
          sinPlanificar: i.sinPlanificar,
        })),
      ...(mismatch
        ? {
            motivo:
              "La revisión del plan no coincide con su auditoría; no es verificable.",
          }
        : {}),
    };
  } catch {
    return {
      estado: "PlanNoVerificable",
      sinPlan: false,
      sinPlanificar: false,
      revision: null,
      contextRevision: "",
      items: [],
      motivo: "No se pudo leer el plan del ciclo.",
    };
  }
}

function investmentSnapshot(
  db: Database,
  fin: string,
): InvestmentSnapshot {
  const empty = (motivo: string): InvestmentSnapshot => ({
    ok: false,
    efectivo: null,
    cuentas: [],
    posiciones: [],
    operaciones: [],
    instrumentos: [],
    motivo,
  });
  if (!investmentInstalled(db))
    return empty("Motor de inversión no instalado.");
  try {
    const cashAccounts = db
      .query(
        "SELECT id FROM saldos WHERE tipo='Efectivo' AND control='Inversiones' ORDER BY id",
      )
      .all() as { id: string }[];
    const investmentAccounts = db
      .query(
        "SELECT id FROM saldos WHERE tipo='Inversión' AND control='Inversiones' ORDER BY id",
      )
      .all() as { id: string }[];
    if (!cashAccounts.length || !investmentAccounts.length)
      return empty("No hay cuentas de efectivo/inversión aplicables a Fin.");

    let cashTotal = 0n;
    const cuentas = cashAccounts.map((account) => {
      const cash = cashAt(db, account.id, fin);
      cashTotal += cash.disponible;
      return {
        saldo: account.id,
        disponible: decimal(cash.disponible)!,
      };
    });
    const posiciones = positionsAtDate(db, fin).map((position) => ({
      instrumento: position.instrumento.id,
      saldoInversion: position.saldoInversion.id,
      cantidad: quantityText(position.cantidad),
    }));
    const operaciones = db
      .query(
        `SELECT id,clase,fecha,instrumento,saldo_efectivo saldoEfectivo,
          saldo_inversion saldoInversion,CAST(cantidad AS TEXT) cantidad,
          CAST(importe_eur AS TEXT) importeEur,
          CAST(comision_eur AS TEXT) comisionEur,estado
         FROM operaciones_inversion WHERE fecha <= ?
         ORDER BY fecha,id`,
      )
      .all(fin) as InvestmentSnapshot["operaciones"];
    const instrumentos = db
      .query(
        "SELECT id,nombre,revision FROM instrumentos ORDER BY id",
      )
      .all() as InvestmentSnapshot["instrumentos"];
    return {
      ok: true,
      efectivo: decimal(cashTotal),
      cuentas,
      posiciones,
      operaciones: operaciones.map((operation) => ({
        ...operation,
        cantidad: quantityText(BigInt(operation.cantidad)),
        importeEur: decimal(operation.importeEur),
        comisionEur: decimal(operation.comisionEur),
      })),
      instrumentos,
    };
  } catch {
    return empty("No se pudo leer la posición de inversión al corte.");
  }
}

function factsSnapshot(
  db: Database,
  inicio: string,
  fin: string,
  investment: InvestmentSnapshot,
  auxiliary: AuxiliarySnapshot,
): FactsSnapshot {
  let all: LedgerRow[];
  try {
    all = ledgerRows(db);
  } catch {
    return {
      ok: false,
      estado: "Con hechos",
      movimientos: [],
      fuentes: [
        { fuente: "Movimientos", hechos: 0, acreditado: false },
        {
          fuente: "Operaciones de inversión",
          hechos: 0,
          acreditado: investment.ok,
        },
        ...auxiliary.fuentes,
      ],
      totales: {
        ingresos: "0.00",
        gastos: "0.00",
        transferencias: "0.00",
        amortizaciones: "0.00",
        devoluciones: "0.00",
        neto: "0.00",
      },
      motivo:
        "No se pudo leer Movimientos; no se acredita la ausencia de hechos.",
    };
  }
  const rows = all.filter(
    (row) => row.fecha >= inicio && row.fecha <= fin,
  );
  const active = rows.filter((row) => row.anulado === 0);
  const byType = (type: LedgerRow["tipo"]) =>
    sum(
      active
        .filter((row) => row.tipo === type)
        .map((row) => BigInt(row.importe)),
    );
  const totales = {
    ingresos: decimal(byType("Ingreso"))!,
    gastos: decimal(byType("Gasto"))!,
    transferencias: decimal(byType("Transferencia"))!,
    amortizaciones: decimal(byType("Amortización deuda"))!,
    devoluciones: decimal(byType("Devolución de gasto"))!,
    neto: decimal(byType("Ingreso") - byType("Gasto"))!,
  };
  const fuentes = [
    { fuente: "Movimientos", hechos: rows.length, acreditado: true },
    {
      fuente: "Operaciones de inversión",
      hechos: investment.operaciones.filter(
        (operation) => operation.fecha >= inicio && operation.fecha <= fin,
      ).length,
      acreditado: investment.ok,
    },
    ...auxiliary.fuentes,
  ];
  const unknown = !investment.ok || !auxiliary.ok;
  const conHechos =
    unknown || fuentes.some((source) => !source.acreditado || source.hechos > 0);
  return {
    ok: !unknown,
    estado: conHechos ? "Con hechos" : "Sin hechos",
    movimientos: rows,
    fuentes,
    totales,
    ...(unknown
      ? { motivo: "Una fuente aplicable no se pudo leer; no se acredita ausencia." }
      : {}),
  };
}

function auxiliarySnapshot(
  db: Database,
  inicio: string,
  fin: string,
): AuxiliarySnapshot {
  const anticipos = readRows<unknown>(
    db,
    `SELECT a.movimiento,a.referencia,a.rol,CAST(m.importe AS TEXT) importe,m.fecha
     FROM movimiento_anticipo a JOIN movimientos m ON m.id=a.movimiento
     WHERE m.fecha BETWEEN ? AND ? ORDER BY a.movimiento`,
    inicio,
    fin,
  );
  const compartidos = readRows<unknown>(
    db,
    `SELECT c.movimiento,c.referencia,c.participante,CAST(m.importe AS TEXT) importe,m.fecha
     FROM movimiento_compartido c JOIN movimientos m ON m.id=c.movimiento
     WHERE m.fecha BETWEEN ? AND ? ORDER BY c.movimiento`,
    inicio,
    fin,
  );
  const nomina = readRows<unknown>(
    db,
    `SELECT p.paga,p.movimiento,CAST(p.importe AS TEXT) importe,m.fecha
     FROM payroll_allocations p JOIN movimientos m ON m.id=p.movimiento
     WHERE m.fecha BETWEEN ? AND ? ORDER BY p.movimiento`,
    inicio,
    fin,
  );
  const revisionComida = readRows<unknown>(
    db,
    `SELECT c.movimiento,c.etiqueta,c.estado_revision estadoRevision,
       CAST(m.importe AS TEXT) importe,m.fecha
     FROM movimiento_revision_comida c JOIN movimientos m ON m.id=c.movimiento
     WHERE m.fecha BETWEEN ? AND ? ORDER BY c.movimiento`,
    inicio,
    fin,
  );
  const deuda = readRows<unknown>(
    db,
    "SELECT id,nombre,estado,revision,CAST(apertura AS TEXT) apertura FROM deudas ORDER BY id",
  );
  const sources = [anticipos, compartidos, nomina, revisionComida, deuda];
  const errors = sources
    .map((source) => source.error)
    .filter((value): value is string => value !== null);
  const fuentes = [
    { fuente: "Anticipos", hechos: anticipos.rows.length, acreditado: !anticipos.error },
    {
      fuente: "Compartidos",
      hechos: compartidos.rows.length,
      acreditado: !compartidos.error,
    },
    { fuente: "Nómina", hechos: nomina.rows.length, acreditado: !nomina.error },
    {
      fuente: "Revisión Comida",
      hechos: revisionComida.rows.length,
      acreditado: !revisionComida.error,
    },
    {
      fuente: "Deuda",
      // El maestro E1.6 no aporta hechos propios al ciclo; solo acredita que
      // su lectura funcionó. Contar el maestro completo convertiría cualquier
      // base con deudas en "Con hechos" sin hechos del ciclo.
      hechos: 0,
      acreditado: !deuda.error,
    },
  ];
  return {
    ok: errors.length === 0,
    anticipos: anticipos.rows,
    compartidos: compartidos.rows,
    nomina: nomina.rows,
    revisionComida: revisionComida.rows,
    deuda: deuda.rows,
    fuentes,
    ...(errors.length
      ? { motivo: "Una fuente auxiliar aplicable no se pudo leer." }
      : {}),
  };
}

function classificationSnapshot(db: Database): ClassificationSnapshot {
  const categorias = readRows<unknown>(
    db,
    "SELECT id,nombre,revision FROM categorias ORDER BY id",
  );
  const subcategorias = readRows<unknown>(
    db,
    "SELECT id,nombre,padre,revision FROM subcategorias ORDER BY id",
  );
  const partidas = readRows<unknown>(
    db,
    "SELECT id,nombre,padre,revision FROM partidas ORDER BY id",
  );
  const referencias = readRows<unknown>(
    db,
    "SELECT id,nombre,tipo,revision FROM referencias ORDER BY id",
  );
  const error =
    categorias.error || subcategorias.error || partidas.error || referencias.error;
  return {
    ok: error === null,
    categorias: categorias.rows,
    subcategorias: subcategorias.rows,
    partidas: partidas.rows,
    referencias: referencias.rows,
    ...(error ? { motivo: error } : {}),
  };
}

function compareStoredSnapshot(
  stored: unknown,
  live: InvestmentSnapshot,
): { problems: string[]; comparado: ComparedValues } {
  const livePositions: ComparedPosition[] = live.posiciones.map((row) => ({
    instrumento: row.instrumento,
    saldoInversion: row.saldoInversion,
    cantidad: row.cantidad,
  }));
  const liveCash: ComparedCash[] = live.cuentas.map((row) => ({
    saldo: row.saldo,
    disponible: row.disponible,
  }));
  const invalid = (
    problems: string[],
    almacenado: Partial<ComparedValues> = {},
  ): { problems: string[]; comparado: ComparedValues } => ({
    problems,
    comparado: {
      efectivo: almacenado.efectivo ?? {
        almacenado: null,
        vivo: live.efectivo,
      },
      cuentas: almacenado.cuentas ?? {
        almacenado: null,
        vivo: liveCash,
      },
      posiciones: almacenado.posiciones ?? {
        almacenado: null,
        vivo: livePositions,
      },
    },
  });
  if (!stored || typeof stored !== "object" || Array.isArray(stored))
    return invalid(["La foto posterior no contiene una instantánea de inversión."]);
  const value = stored as {
    efectivo?: unknown;
    cuentas?: unknown;
    posiciones?: unknown;
  };
  if (!Array.isArray(value.cuentas) || !Array.isArray(value.posiciones))
    return invalid([
      "La foto posterior no contiene desglose de efectivo y posiciones comparable.",
    ]);
  const storedPositions: ComparedPosition[] = value.posiciones
    .filter(
      (
        row,
      ): row is {
        instrumento: string;
        saldoInversion: string;
        cantidad: string;
      } =>
        !!row &&
        typeof row === "object" &&
        typeof (row as { instrumento?: unknown }).instrumento === "string" &&
        typeof (row as { saldoInversion?: unknown }).saldoInversion ===
          "string" &&
        typeof (row as { cantidad?: unknown }).cantidad === "string",
    )
    .map((row) => ({
      instrumento: row.instrumento,
      saldoInversion: row.saldoInversion,
      cantidad: row.cantidad,
    }));
  const storedCashRows: ComparedCash[] = value.cuentas
    .filter(
      (row): row is ComparedCash =>
        !!row &&
        typeof row === "object" &&
        typeof (row as { saldo?: unknown }).saldo === "string" &&
        typeof (row as { disponible?: unknown }).disponible === "string",
    )
    .map((row) => ({ saldo: row.saldo, disponible: row.disponible }));
  const comparado: ComparedValues = {
    efectivo: {
      almacenado:
        typeof value.efectivo === "string" ? value.efectivo : null,
      vivo: live.efectivo,
    },
    cuentas: { almacenado: storedCashRows, vivo: liveCash },
    posiciones: { almacenado: storedPositions, vivo: livePositions },
  };
  const problems: string[] = [];
  if (typeof value.efectivo === "string" && value.efectivo !== live.efectivo)
    problems.push(
      `Efectivo total almacenado ${value.efectivo} frente a ${live.efectivo ?? "No disponible"}.`,
    );
  // T1 locks every operation dated inside a closed window and the T2 Saldo
  // guard locks `tipo`/`control`/`apertura` of accounts captured by a photo
  // (and creation of new investment cash accounts), so a stored account
  // cannot change its live cash. Accounts that appear only live were created
  // after the cut and cannot alter the stored account breakdown; the total
  // cash is still compared above, so an account with a non-zero opening
  // balance is still a real contradiction. Comparing the stored account ids
  // avoids a false contradiction from a later zero-balance account.
  const liveCashById = new Map(liveCash.map((row) => [row.saldo, row.disponible]));
  const cashChanged = storedCashRows.some(
    (row) => liveCashById.get(row.saldo) !== row.disponible,
  );
  if (cashChanged) problems.push("El desglose de efectivo a Fin ha cambiado.");
  const positionKey = (row: ComparedPosition) =>
    `${row.instrumento}|${row.saldoInversion}|${row.cantidad}`;
  const storedPositionKeys = new Set(storedPositions.map(positionKey));
  const livePositionKeys = new Set(livePositions.map(positionKey));
  if (
    storedPositionKeys.size !== livePositionKeys.size ||
    [...storedPositionKeys].some((entry) => !livePositionKeys.has(entry))
  )
    problems.push("Las posiciones a Fin han cambiado.");
  return { problems, comparado };
}

function coherence(
  db: Database,
  fin: string,
): Capture["coherencia"] {
  const rows = db
    .query(
      `SELECT c.ciclo,c.version,c.fin,f.inversion
       FROM cierres c JOIN fotos_cierre f
         ON f.ciclo=c.ciclo AND f.version=c.version
       WHERE c.fin > ? ORDER BY c.fin,c.ciclo,c.version`,
    )
    .all(fin) as {
    ciclo: string;
    version: number;
    fin: string;
    inversion: string;
  }[];
  const cierres = rows.map((row) => {
    let motivos: string[] = [];
    let comparado: ComparedValues = {
      efectivo: { almacenado: null, vivo: null },
      cuentas: { almacenado: null, vivo: [] },
      posiciones: { almacenado: null, vivo: [] },
    };
    try {
      const live = investmentSnapshot(db, row.fin);
      const compared = live.ok
        ? compareStoredSnapshot(JSON.parse(row.inversion), live)
        : compareStoredSnapshot({}, live);
      motivos = live.ok
        ? compared.problems
        : [live.motivo ?? "No se pudo recalcular la foto posterior."];
      comparado = compared.comparado;
    } catch {
      motivos = ["No se pudo leer la foto posterior."];
    }
    return {
      ciclo: row.ciclo,
      version: row.version,
      fin: row.fin,
      coherente: motivos.length === 0,
      motivos,
      comparado,
    };
  });
  const contradicciones = cierres
    .filter((entry) => !entry.coherente)
    .map((entry) => `Cierre ${entry.ciclo} v${entry.version}: ${entry.motivos.join(" ")}`);
  return {
    requerida: cierres.length > 0,
    cierres,
    contradicciones,
  };
}

export type CoherenciaCierrePosterior = {
  ciclo: string;
  version: number;
  fin: string;
  coherente: boolean;
  motivos: string[];
};

/** Read-only coherence view for E4.8 precierre and other consumers. */
export function coherenciaCierresPosteriores(
  db: Database,
  fin: string,
): CoherenciaCierrePosterior[] {
  return coherence(db, fin).cierres.map((entry) => ({
    ciclo: entry.ciclo,
    version: entry.version,
    fin: entry.fin,
    coherente: entry.coherente,
    motivos: entry.motivos,
  }));
}

function capture(
  db: Database,
  cicloId: string,
  options: CierreOptions,
  now: number,
): Capture {
  const { ciclo } = getCycle(db, cicloId);
  const blockers: CierreIssue[] = [];
  const warnings: CierreIssue[] = [];
  const fin = ciclo.fin;
  const s0 = ciclo.saldoInicialComida;
  const s0Cents = s0 === null || s0 === undefined ? null : money(s0);
  if (
    s0Cents !== null &&
    (s0Cents < -SAFE_INTEGER || s0Cents > SAFE_INTEGER)
  )
    throw new Problem(
      422,
      "S0_FUERA_DE_RANGO",
      "El Saldo inicial manual supera el rango exacto admitido; corrige el ciclo antes de cerrar.",
      {
        saldoInicialComida:
          "Máximo ±90071992547409.91 EUR en céntimos exactos.",
      },
    );
  if (!fin)
    blockers.push({
      code: "SIN_SIGUIENTE_INICIO",
      message:
        "No existe siguiente Inicio; no se deriva Fin ni se permite cerrar.",
    });
  if (s0Cents === null)
    blockers.push({
      code: "S0_AUSENTE",
      message: "Falta el Saldo inicial manual del ciclo.",
    });
  const siguiente = db
    .query("SELECT MIN(inicio) inicio FROM ciclos WHERE inicio>?")
    .get(ciclo.inicio) as { inicio: string | null } | null;
  const plan = planSnapshot(db, cicloId, now);
  if (plan.estado === "PlanNoVerificable")
    blockers.push({
      code: "PLAN_NO_VERIFICABLE",
      message: plan.motivo ?? "El plan no es verificable.",
    });
  if (plan.sinPlanificar)
    warnings.push({
      code: "SIN_PLANIFICAR",
      message: "Existen hechos reales sin línea de plan.",
    });
  const e35 =
    options.e35 !== undefined
      ? options.e35
      : defaultE35(db, cicloId, now);
  if (!e35?.verificable)
    blockers.push({
      code: "E35_NO_VERIFICABLE",
      message:
        e35?.motivo ??
        "E3.5/FIN_NETA no verificable; D4 impide crear foto.",
    });
  const backup = backupEvidence(options.backup);
  if (!backup.verificado)
    blockers.push({
      code: "BACKUP_NO_VERIFICABLE",
      message: backup.motivo ?? "Backup no verificable.",
    });
  else if (!backup.restauracionProbada)
    blockers.push({
      code: "BACKUP_NO_VERIFICABLE",
      message: backup.motivo ?? "Restauración DT6/T-BKP no demostrada.",
    });
  else if (!backup.referencia)
    blockers.push({
      code: "BACKUP_NO_VERIFICABLE",
      message:
        "Falta la referencia de manifiesto/checksum/clave de la evidencia DT6/T-BKP.",
    });
  const classification = classificationSnapshot(db);
  if (!classification.ok)
    blockers.push({
      code: "FUENTE_NO_LEGIBLE",
      message:
        classification.motivo ??
        "No se pudo leer Clasificación/Referencias.",
    });
  const investment =
    fin === null
      ? { ...investmentSnapshot(db, ciclo.inicio), ok: false, motivo: "Sin Fin." }
      : investmentSnapshot(db, fin);
  if (!investment.ok)
    blockers.push({
      code: "E4_1_NO_DISPONIBLE",
      message: investment.motivo ?? "E4.1 no disponible al corte.",
    });
  const auxiliary = auxiliarySnapshot(db, ciclo.inicio, fin ?? ciclo.inicio);
  if (!auxiliary.ok)
    blockers.push({
      code: "FUENTE_NO_LEGIBLE",
      message: auxiliary.motivo ?? "No se pudo leer una fuente auxiliar.",
    });
  const facts = factsSnapshot(
    db,
    ciclo.inicio,
    fin ?? ciclo.inicio,
    investment,
    auxiliary,
  );
  if (!facts.ok)
    blockers.push({
      code: "FUENTE_NO_LEGIBLE",
      message: facts.motivo ?? "No se acreditó la ausencia de hechos.",
    });
  const coherencia = fin === null
    ? { requerida: false, cierres: [], contradicciones: [] }
    : coherence(db, fin);
  if (coherencia.contradicciones.length)
    blockers.push({
      code: "INCOHERENCIA_CON_CIERRE_POSTERIOR",
      message: coherencia.contradicciones.join(" "),
    });
  else if (coherencia.requerida)
    warnings.push({
      code: "CIERRE_FUERA_DE_ORDEN",
      message: `Existen cierres posteriores coherentes: ${coherencia.cierres
        .map((entry) => `${entry.ciclo} v${entry.version}`)
        .join(", ")}. Se exige motivo y auditoría.`,
    });
  const estadoCierre = getCierreEstado(db, cicloId);
  if (estadoCierre.estado === "Cerrado")
    blockers.push({
      code: "YA_CERRADO",
      message:
        "El ciclo ya está cerrado; solo E4.10 puede habilitar un re-cierre.",
    });
  const totales: PhotoPayload["cobertura"]["totales"] = {
    movimientos: {
      estado: facts.ok ? "Completo" : "No disponible",
      motivo: facts.ok
        ? "Movimientos del ciclo y totales capturados."
        : facts.motivo ?? "Movimientos no disponibles.",
    },
    efectivo: {
      estado: investment.ok ? "Completo" : "No disponible",
      motivo: investment.ok
        ? "Efectivo a Fin con operaciones vigentes hasta Fin."
        : investment.motivo ?? "Efectivo no disponible.",
    },
    posiciones: {
      estado: investment.ok ? "Completo" : "No disponible",
      motivo: investment.ok
        ? "Posiciones a Fin incluidas las anteriores y excluidas las posteriores; cobertura histórica parcial."
        : investment.motivo ?? "Posiciones no disponibles.",
    },
    plan: {
      estado:
        plan.estado === "PlanNoVerificable" ? "No disponible" : "Completo",
      motivo:
        plan.estado === "SinPlan"
          ? "SinPlan válido; no se inventan líneas."
          : plan.estado === "PlanNoVerificable"
            ? plan.motivo ?? "Plan no verificable."
            : "Plan final capturado.",
    },
    e35: {
      estado: e35?.verificable ? "Completo" : "No disponible",
      motivo: e35?.verificable
        ? "E3.5/FIN_NETA verificable y capturado."
        : e35?.motivo ?? "E3.5/FIN_NETA no verificable.",
    },
    deuda: {
      estado: auxiliary.fuentes.find((source) => source.fuente === "Deuda")
        ?.acreditado
        ? "Parcial"
        : "No disponible",
      motivo: auxiliary.fuentes.find((source) => source.fuente === "Deuda")
        ?.acreditado
        ? "Deuda E1.6 capturada; conciliaciones E4.4 fuera de v1 con motivo (DT4)."
        : "No se pudo leer Deuda E1.6; la cobertura al corte no está acreditada.",
    },
    valoracion: {
      estado: "No disponible",
      motivo: "E4.3 valoración/patrimonio no implementado; no se captura.",
    },
    anticipos: {
      estado: "Parcial",
      motivo: "AC36 PARCIAL: consumidor sin proveedor real de Anticipos.",
    },
  };
  const coberturaEstado = Object.values(totales).every(
    (total) => total.estado === "Completo",
  )
    ? "Completo"
    : "Parcial";
  const noDisponible = {
    valoracion: {
      estado: "No disponible",
      motivo: "E4.3 valoración/patrimonio no implementado.",
    },
    deudaCompleta: {
      estado: "No disponible",
      motivo: "E4.4 conciliaciones de Deuda fuera de la foto v1 con motivo (DT4).",
    },
    conciliaciones: {
      estado: "No disponible",
      motivo: "E4.4 fuera de v1.",
    },
  };
  const payload: PhotoPayload = {
    ventana: {
      inicio: ciclo.inicio,
      fin,
      saldoInicial: s0 ?? null,
      estadoTemporal: fin ? "Cerrado" : ciclo.estadoTemporal,
    },
    hechos: {
      estado: facts.estado,
      movimientos: facts.movimientos,
      fuentes: facts.fuentes,
      totales: facts.totales,
    },
    plan: {
      estado: plan.estado === "SinPlan" ? "SinPlan" : "Capturado",
      items: plan.items,
      revision: plan.revision,
      contextRevision: plan.contextRevision,
      sinPlanificar: plan.sinPlanificar,
    },
    clasificacion: {
      categorias: classification.categorias,
      subcategorias: classification.subcategorias,
      partidas: classification.partidas,
      referencias: classification.referencias,
    },
    inversion: {
      efectivo: investment.efectivo,
      cuentas: investment.cuentas,
      posiciones: investment.posiciones,
      operaciones: investment.operaciones,
      instrumentos: investment.instrumentos,
      valoracion: "No disponible",
      motivoValoracion:
        "E4.3 valoración/patrimonio no implementado; no se inventa patrimonio.",
    },
    auxiliares: {
      anticipos: auxiliary.anticipos,
      compartidos: auxiliary.compartidos,
      nomina: auxiliary.nomina,
      revisionComida: auxiliary.revisionComida,
      deuda: auxiliary.deuda,
      e35: {
        verificable: e35?.verificable === true,
        huella: e35?.huella ?? null,
        datos: e35?.datos ?? null,
      },
    },
    cobertura: {
      estado: coberturaEstado,
      totales,
    },
    backup,
    noDisponible,
  };
  return {
    ciclo,
    ventana: payload.ventana,
    siguienteInicio: siguiente?.inicio ?? null,
    plan,
    e35: e35 ?? { verificable: false },
    backup,
    facts,
    auxiliary,
    investment,
    classification,
    coherencia,
    estadoCierre,
    payload,
    fingerprint: fingerprint({ payload, coherencia }),
    appVersion: resolveAppVersion(options.appVersion),
    schemaVersion: schemaVersion(db),
    actor: options.actor ?? actorDefault,
    blockers,
    warnings,
  };
}

export function previewCierre(
  db: Database,
  cicloId: string,
  options: CierreOptions = {},
  now = Date.now(),
) {
  const data = capture(db, cicloId, options, now);
  return {
    ciclo: data.ciclo,
    estado: data.blockers.length
      ? "Bloqueado"
      : data.warnings.length
        ? "Listo con avisos"
        : "Listo",
    e49Bloqueado: data.blockers.length > 0,
    ventana: data.ventana,
    siguienteInicio: data.siguienteInicio,
    plan: {
      estado: data.plan.estado,
      revision: data.plan.revision,
      sinPlanificar: data.plan.sinPlanificar,
      contextRevision: data.plan.contextRevision,
      lineas: data.plan.items.length,
    },
    e35: {
      verificable: data.e35.verificable === true,
      motivo: data.e35.motivo ?? null,
      huella: data.e35.huella ?? null,
      cobertura: data.e35.cobertura ?? null,
    },
    backup: data.backup,
    hechos: {
      estado: data.facts.estado,
      fuentes: data.facts.fuentes,
      totales: data.facts.totales,
    },
    coherencia: data.coherencia,
    inversion: {
      efectivo: data.investment.efectivo,
      posiciones: data.investment.posiciones,
      valoracion: "No disponible",
      motivo:
        "E4.3 valoración/patrimonio no implementado; no se inventa patrimonio.",
    },
    cobertura: data.payload.cobertura,
    noDisponible: data.payload.noDisponible,
    bloqueos: data.blockers,
    avisos: data.warnings,
    fingerprint: data.fingerprint,
    appVersion: data.appVersion,
    schemaVersion: data.schemaVersion,
    cierre: data.estadoCierre,
  };
}

export function getFotoCierre(
  db: Database,
  cicloId: string,
  version?: number,
) {
  const row = db
    .query(
      `SELECT c.ciclo,c.version,c.inicio,c.fin,c.saldo_inicial,c.actor,
        c.creado_utc,c.motivo,c.fingerprint,c.estado,f.app_version,
        f.schema_version,f.ventana_inicio,f.ventana_fin,f.estado_temporal,
        f.estado_hechos,f.estado_plan,f.hechos,f.plan,f.clasificacion,
        f.inversion,f.auxiliares,f.cobertura,f.backup,f.no_disponible
       FROM cierres c JOIN fotos_cierre f
         ON f.ciclo=c.ciclo AND f.version=c.version
       WHERE c.ciclo=?${version === undefined ? "" : " AND c.version=?"}
       ORDER BY c.version DESC LIMIT 1`,
    )
    .get(...(version === undefined ? [cicloId] : [cicloId, version])) as
    | {
        ciclo: string;
        version: number;
        inicio: string;
        fin: string;
        saldo_inicial: number;
        actor: string;
        creado_utc: string;
        motivo: string | null;
        fingerprint: string;
        estado: "Cerrado";
        app_version: string;
        schema_version: number;
        ventana_inicio: string;
        ventana_fin: string;
        estado_temporal: string;
        estado_hechos: "Con hechos" | "Sin hechos";
        estado_plan: "SinPlan" | "Capturado";
        hechos: string;
        plan: string;
        clasificacion: string;
        inversion: string;
        auxiliares: string;
        cobertura: string;
        backup: string;
        no_disponible: string;
      }
    | null;
  if (!row)
    throw new Problem(404, "NOT_FOUND", "Foto de cierre no encontrada.");
  return {
    cierre: {
      ciclo: row.ciclo,
      version: row.version,
      inicio: row.inicio,
      fin: row.fin,
      saldoInicial: decimal(String(row.saldo_inicial)),
      actor: row.actor,
      creadoUtc: row.creado_utc,
      motivo: row.motivo,
      fingerprint: row.fingerprint,
      estado: row.estado,
    },
    foto: {
      ciclo: row.ciclo,
      version: row.version,
      creadoUtc: row.creado_utc,
      actor: row.actor,
      motivo: row.motivo,
      fingerprint: row.fingerprint,
      appVersion: row.app_version,
      schemaVersion: row.schema_version,
      ventana: {
        inicio: row.ventana_inicio,
        fin: row.ventana_fin,
        saldoInicial: decimal(String(row.saldo_inicial)),
        estadoTemporal: row.estado_temporal,
      },
      estadoHechos: row.estado_hechos,
      estadoPlan: row.estado_plan,
      hechos: JSON.parse(row.hechos),
      plan: JSON.parse(row.plan),
      clasificacion: JSON.parse(row.clasificacion),
      inversion: JSON.parse(row.inversion),
      auxiliares: JSON.parse(row.auxiliares),
      cobertura: JSON.parse(row.cobertura),
      backup: JSON.parse(row.backup),
      noDisponible: JSON.parse(row.no_disponible),
    },
  };
}

export function confirmCierre(
  db: Database,
  cicloId: string,
  body: Record<string, unknown>,
  key: string,
  options: CierreOptions = {},
  now = Date.now(),
) {
  for (const name of Object.keys(body))
    if (!["fingerprint", "motivo"].includes(name))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`, {
        [name]: "Campo no editable.",
      });
  if (!keyPattern.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  if (typeof body.fingerprint !== "string" || !hex64.test(body.fingerprint))
    throw new Problem(422, "VALIDATION", "Revisa el fingerprint de la vista previa.", {
      fingerprint: "Fingerprint inválido.",
    });
  let motivo: string | null = null;
  if (body.motivo !== undefined && body.motivo !== null) {
    if (
      typeof body.motivo !== "string" ||
      body.motivo.trim().length === 0 ||
      body.motivo.trim().length > 1000
    )
      throw new Problem(422, "VALIDATION", "Indica un motivo válido.", {
        motivo: "Motivo obligatorio y de hasta 1000 caracteres.",
      });
    motivo = body.motivo.trim();
  }
  const requestHash = fingerprint({
    ciclo: cicloId,
    fingerprint: body.fingerprint,
    motivo,
  });
  const actor = options.actor ?? actorDefault;
  if (actor.trim().length === 0 || actor.length > 200)
    throw new Problem(422, "VALIDATION", "Actor inválido.");

  return db
    .transaction(() => {
      // Keep this key's attempt even after its expiry: a replay of the same
      // key/payload must return the same photo instead of ALREADY_CLOSED.
      // Only unrelated expired attempts are pruned.
      const retry = db
        .query("SELECT hash,response FROM cierre_attempts WHERE key=?")
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== requestHash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya tiene otros datos.",
          );
        db.run("UPDATE cierre_attempts SET expires=? WHERE key=?", [
          now + 86400000,
          key,
        ]);
        return { ...JSON.parse(retry.response), replayed: true };
      }
      db.run("DELETE FROM cierre_attempts WHERE expires<? AND key<>?", [
        now,
        key,
      ]);
      const data = capture(db, cicloId, options, now);
      if (data.estadoCierre.estado === "Cerrado")
        throw new Problem(
          409,
          "ALREADY_CLOSED",
          "El ciclo ya está cerrado; solo E4.10 puede habilitar un re-cierre.",
        );
      // Fingerprint includes the computed coherence list, so a later closure
      // created between preview and confirm is a revision conflict even when
      // its new out-of-order warning would also demand a motive.
      if (body.fingerprint !== data.fingerprint)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "La vista previa ha cambiado; revisa el preflight antes de cerrar.",
          {},
          { fingerprint: data.fingerprint, bloqueos: data.blockers },
        );
      // A contradiction or any other blocker is reported first: 409 with the
      // concrete code is more informative than 422 MOTIVO_REQUERIDO.
      if (data.blockers.length) {
        const first = data.blockers[0];
        throw new Problem(409, first.code, first.message, {}, {
          bloqueos: data.blockers,
        });
      }
      if (data.coherencia.requerida && motivo === null)
        throw new Problem(
          422,
          "MOTIVO_REQUERIDO",
          "Un cierre fuera de orden exige motivo para auditoría.",
          { motivo: "Indica el motivo del cierre fuera de orden." },
        );
      const tiempo = new Date(now).toISOString();
      const payload = data.payload;
      const fin = data.ventana.fin;
      if (fin === null)
        throw new Problem(
          409,
          "SIN_SIGUIENTE_INICIO",
          "No existe siguiente Inicio; no se deriva Fin ni se permite cerrar.",
        );
      db.run(
        `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,
          creado_utc,motivo,fingerprint,estado)
         VALUES(?,1,?,?,?,?,?,?,?,'Cerrado')`,
        [
          cicloId,
          data.ventana.inicio,
          fin,
          money(payload.ventana.saldoInicial)!,
          actor,
          tiempo,
          motivo,
          data.fingerprint,
        ],
      );
      db.run(
        `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,
          fingerprint,app_version,schema_version,ventana_inicio,ventana_fin,
          saldo_inicial,estado_temporal,estado_hechos,estado_plan,hechos,plan,
          clasificacion,inversion,auxiliares,cobertura,backup,no_disponible)
         VALUES(?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          cicloId,
          tiempo,
          actor,
          motivo,
          data.fingerprint,
          data.appVersion,
          data.schemaVersion,
          data.ventana.inicio,
          fin,
          money(payload.ventana.saldoInicial)!,
          "Cerrado",
          payload.hechos.estado,
          payload.plan.estado,
          JSON.stringify(payload.hechos),
          JSON.stringify(payload.plan),
          JSON.stringify(payload.clasificacion),
          JSON.stringify(payload.inversion),
          JSON.stringify(payload.auxiliares),
          JSON.stringify(payload.cobertura),
          JSON.stringify(payload.backup),
          JSON.stringify(payload.noDisponible),
        ],
      );
      const response = getFotoCierre(db, cicloId, 1);
      db.run(
        `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,
          motivo,instante,actor) VALUES(?,1,?,NULL,?,?,?,?)`,
        [
          cicloId,
          data.coherencia.requerida ? "cierre_fuera_de_orden" : "cierre",
          JSON.stringify({
            ciclo: cicloId,
            version: 1,
            fingerprint: data.fingerprint,
            fotoVersion: 1,
            coherence: data.coherencia.cierres.map((entry) => ({
              ciclo: entry.ciclo,
              version: entry.version,
              fin: entry.fin,
              resultado: entry.coherente ? "Coherente" : "Incoherente",
              motivos: entry.motivos,
              comparado: entry.comparado,
            })),
          }),
          motivo,
          tiempo,
          actor,
        ],
      );
      db.run("INSERT INTO cierre_attempts VALUES(?,?,?,?)", [
        key,
        requestHash,
        JSON.stringify(response),
        now + 86400000,
      ]);
      options.hooks?.beforeCommit?.();
      return { ...response, replayed: false };
    })
    .immediate();
}
