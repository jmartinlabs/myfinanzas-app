import type { Database } from "bun:sqlite";
import { Problem, decimal } from "./saldos";
import { getReference, type Reference } from "./reference-rules";
import { vehicleFicha, type Vehicle } from "./vehicle-rules";
import {
  annualExecution,
  annualYear,
  type AnnualProvider,
  type AnnualSources,
} from "./plan-anual";
import { ledgerRows, type LedgerRow } from "./movement-ledger";
import { spanishToday } from "./movimientos";

const emptySources: AnnualSources = {
  revision: "sin-proveedores",
  control: null,
  historico: [],
  historicoDisponible: false,
  protecciones: [],
  cierresDisponibles: false,
};

type Partida = { id: string; nombre: string };
type Coverage = "Completa" | "Abierta" | "No verificada" | "Futura";

function yearOf(value: string | null | undefined, now: number) {
  return value === null || value === undefined || value === ""
    ? Number(spanishToday(now).slice(0, 4))
    : annualYear(value);
}
function cents(value: string) {
  return BigInt(value.replace(".", ""));
}
function annualCoverage(
  execution: ReturnType<typeof annualExecution>,
  year: number,
  now: number,
): Coverage {
  const start = `${String(year).padStart(4, "0")}-01-01`,
    end = `${String(year).padStart(4, "0")}-12-31`,
    today = spanishToday(now);
  if (start > today) return "Futura";
  if (execution.cobertura !== "Verificable al corte") return "No verificada";
  if (execution.corte !== null && execution.corte >= end) return "Completa";
  if (start <= today && today <= end) return "Abierta";
  return "No verificada";
}
function aggregateCoverage(states: string[], fallback: string) {
  if (!states.length) return fallback;
  if (states.every((s) => s === "Verificable al corte"))
    return "Verificable al corte";
  if (states.every((s) => s === "No disponible")) return "No disponible";
  return "Parcial";
}
function aggregateAnnual(states: Coverage[], fallback: Coverage): Coverage {
  if (!states.length) return fallback;
  if (states.every((s) => s === "Completa")) return "Completa";
  if (states.every((s) => s === "Futura")) return "Futura";
  if (
    states.every((s) => s === "Completa" || s === "Abierta") &&
    states.some((s) => s === "Abierta")
  )
    return "Abierta";
  return "No verificada";
}
function catalog(db: Database) {
  return new Map(
    (
      db.query("SELECT id,nombre FROM partidas ORDER BY length(id),id").all() as Partida[]
    ).map((p) => [p.id, p]),
  );
}
function factDto(r: LedgerRow, partida: Partida | undefined) {
  return {
    id: r.id,
    fecha: r.fecha,
    importe: decimal(r.importe),
    partida: partida ? { id: partida.id, nombre: partida.nombre } : null,
  };
}
export type VehicleAnnual = ReturnType<typeof annualFor>;
function annualFor(
  db: Database,
  reference: string,
  year: number,
  now: number,
  provider?: AnnualProvider,
) {
  const sources = (provider ?? (() => emptySources))(db, year),
    all = ledgerRows(db),
    eligible = all.filter(
      (r) =>
        !r.anulado &&
        r.tipo === "Gasto" &&
        r.referencia === reference &&
        r.partida !== null &&
        r.fecha >= `${String(year).padStart(4, "0")}-01-01` &&
        r.fecha <= `${String(year).padStart(4, "0")}-12-31`,
    ),
    partidas = catalog(db),
    grouped = new Map<string, LedgerRow[]>();
  for (const row of eligible)
    grouped.set(row.partida!, [...(grouped.get(row.partida!) ?? []), row]);
  const base = annualExecution("__sin_partida__", year, [], sources, now),
    rows = [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, rows]) => {
        const execution = annualExecution(id, year, rows, sources, now),
          annual = annualCoverage(execution, year, now),
          partida = partidas.get(id);
        return {
          partida: partida
            ? { id: partida.id, nombre: partida.nombre }
            : { id, nombre: id },
          control: execution.control,
          corte: execution.corte,
          subtotalRegistrado: execution.subtotalRegistrado,
          coberturaAlCorte: execution.cobertura,
          coberturaAnual: annual,
          totalAlCorte: execution.ejecutado,
          totalAnual: annual === "Completa" ? execution.ejecutado : null,
          ceroVerificado:
            execution.cobertura === "Verificable al corte" &&
            execution.hechos.length === 0,
          procedencia: execution.procedencia,
          hechos: execution.hechos.map((h) => {
            const fact = eligible.find((r) => r.id === h.id)!;
            return factDto(fact, partida);
          }),
          motivo: execution.motivo,
        };
      }),
    insideIds = new Set(rows.flatMap((r) => r.hechos.map((h) => h.id))),
    outside = eligible.filter((r) => !insideIds.has(r.id)),
    coverageStates = rows.map((r) => r.coberturaAlCorte),
    annualStates = rows.map((r) => r.coberturaAnual),
    coverageAlCorte = aggregateCoverage(coverageStates, base.cobertura),
    coberturaAnual = aggregateAnnual(annualStates, annualCoverage(base, year, now)),
    coberturaMixta =
      new Set(coverageStates).size > 1 || new Set(annualStates).size > 1,
    hechos = rows.flatMap((r) => r.hechos),
    totalAlCorte = rows.length
      ? rows.every((r) => r.totalAlCorte !== null)
        ? decimal(
            rows.reduce((n, r) => n + cents(r.totalAlCorte!), 0n),
          )
        : null
      : base.ejecutado,
    totalAnual = rows.length
      ? rows.every((r) => r.coberturaAnual === "Completa")
        ? decimal(
            rows.reduce((n, r) => n + cents(r.totalAnual ?? "0.00"), 0n),
          )
        : null
      : coberturaAnual === "Completa"
        ? base.ejecutado
        : null,
    subtotalRegistrado = rows.length
      ? decimal(
          rows.reduce((n, r) => n + cents(r.subtotalRegistrado), 0n),
        )!
      : base.subtotalRegistrado,
    importeFuera = decimal(
      outside.reduce((n, r) => n + cents(r.importe), 0n),
    )!,
    motivos = [
      ...new Set(rows.map((r) => r.motivo).filter((m): m is string => !!m)),
      ...(outside.length
        ? [
            `Hay ${outside.length} Gasto(s) fuera de control/corte; no computan en el subtotal ni en los totales.`,
          ]
        : []),
      ...(coberturaMixta ? ["Cobertura mixta por Partida."] : []),
    ],
    motivo = motivos.length ? motivos.join(" ") : rows.length ? null : base.motivo;
  return {
    ejercicio: year,
    universo: { inicio: `${String(year).padStart(4, "0")}-01-01`, fin: `${String(year).padStart(4, "0")}-12-31` },
    control: base.control,
    corte: base.corte,
    procedencia: base.procedencia,
    coberturaMixta,
    coberturaAlCorte: coverageAlCorte,
    coberturaAnual,
    subtotalRegistrado,
    totalAlCorte,
    totalAnual,
    ceroVerificado:
      coverageAlCorte === "Verificable al corte" &&
      hechos.length === 0 &&
      outside.length === 0,
    hechosConocidos: hechos.length,
    hechosFueraConocidos: outside.length,
    importeFueraDeControlCorte: importeFuera,
    hechosFueraDeControlCorte: outside.map((r) =>
      factDto(r, r.partida ? partidas.get(r.partida) : undefined),
    ),
    resultadosPorPartida: rows,
    motivo,
    gastos: hechos,
  };
}
function audit(db: Database, reference: string) {
  return (
    db
      .query(
        "SELECT id,entidad,accion,revision,campos,instante,revision_previa,actor,motivo FROM audit WHERE entidad=? OR entidad='ficha_vehiculo' ORDER BY id",
      )
      .all(reference) as {
      id: number;
      entidad: string;
      accion: string;
      revision: number;
      campos: string;
      instante: string;
      revision_previa: number;
      actor: string;
      motivo: string | null;
    }[]
  )
    .map((row) => {
      let campos: unknown = row.campos;
      try {
        campos = JSON.parse(row.campos);
      } catch {}
      const scoped =
        row.entidad === reference ||
        (campos &&
          typeof campos === "object" &&
          (campos as { referencia?: string }).referencia === reference);
      return scoped
        ? {
            id: row.id,
            entidad: row.entidad,
            accion: row.accion,
            revision: row.revision,
            revisionPrevia: row.revision_previa,
            campos,
            instante: row.instante,
            actor: row.actor,
            motivo: row.motivo,
          }
        : null;
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
}
function gastosFor(db: Database, reference: string) {
  return (
    db
      .query("SELECT id FROM movimientos WHERE referencia=? LIMIT 1")
      .get(reference) as { id: string } | null
  );
}
function integrity(
  db: Database,
  reference: Reference,
  ficha: Vehicle | null,
  duplicate: boolean,
): { estado: "OK" | "Revisar" | "No disponible"; motivos: string[]; mensaje: string } {
  const motivos: string[] = [];
  if (duplicate) motivos.push("FICHA_DUPLICADA");
  if (reference.tipo === "Vehículo" && !ficha) motivos.push("FICHA_AUSENTE");
  if (reference.tipo !== "Vehículo" && ficha) motivos.push("REF_TIPO_INCORRECTO");
  if (reference.tipo === "Vehículo" && !ficha && gastosFor(db, reference.id))
    motivos.push("GASTO_SIN_FICHA");
  const messages: Record<string, string> = {
    FICHA_DUPLICADA: "Hay más de una ficha para la Referencia.",
    FICHA_AUSENTE: "La Referencia Vehículo no tiene ficha.",
    REF_TIPO_INCORRECTO: "La ficha apunta a una Referencia que no es Vehículo.",
    GASTO_SIN_FICHA: "Existe un Gasto con Referencia Vehículo sin ficha.",
  };
  return {
    estado: motivos.length ? "Revisar" : "OK",
    motivos,
    mensaje: motivos.length
      ? motivos.map((m) => messages[m]).join(" ")
      : "Ficha 1:1 correcta.",
  };
}
function view(
  db: Database,
  id: string,
  year: number,
  now: number,
  provider?: AnnualProvider,
  withAudit = true,
) {
  const reference = getReference(db, id),
    rows = db
      .query("SELECT * FROM fichas_vehiculo WHERE referencia=?")
      .all(id) as {
      referencia: string;
      matricula: string | null;
      proxima_itv: string | null;
      fecha_cita: string | null;
      revision: number;
      creado: string;
      actualizado: string;
    }[],
    ficha = rows.length ? vehicleFicha(db, id) : null;
  if (reference.tipo !== "Vehículo" && !ficha)
    throw new Problem(404, "NOT_VEHICLE", "La Referencia no es un vehículo.");
  let gastoAnual: VehicleAnnual | null = null,
    annualError = false;
  if (reference.tipo === "Vehículo") {
    try {
      gastoAnual = annualFor(db, id, year, now, provider);
    } catch {
      annualError = true;
    }
  }
  const integ = integrity(db, reference, ficha, rows.length > 1);
  if (annualError)
    return {
      referencia: reference,
      ficha,
      integridad: {
        estado: "No disponible" as const,
        motivos: ["FUENTE_NO_DISPONIBLE"],
        mensaje: "No se pudo evaluar el Gasto anual; no se declara cero.",
      },
      gastoAnual: null,
      ...(withAudit ? { auditoria: audit(db, id) } : {}),
    };
  return {
    referencia: reference,
    ficha,
    integridad: integ,
    gastoAnual,
    ...(withAudit ? { auditoria: audit(db, id) } : {}),
  };
}
export function getVehicle(
  db: Database,
  id: string,
  exercise: string | null | undefined,
  now = Date.now(),
  provider?: AnnualProvider,
) {
  const year = yearOf(exercise, now);
  return db.transaction(() => view(db, id, year, now, provider))();
}
export function listVehicles(
  db: Database,
  params = new URLSearchParams(),
  now = Date.now(),
  provider?: AnnualProvider,
) {
  const year = yearOf(params.get("ejercicio"), now),
    page = Number(params.get("page") ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
    throw new Problem(422, "VALIDATION", "Página inválida.");
  return db.transaction(() => {
    const ids = db
      .query(
        "SELECT id FROM referencias WHERE tipo='Vehículo' ORDER BY length(id),id",
      )
      .all() as { id: string }[];
    let base;
    try {
      const sources = (provider ?? (() => emptySources))(db, year);
      base = annualExecution("__sin_partida__", year, [], sources, now);
    } catch {
      base = annualExecution("__sin_partida__", year, [], emptySources, now);
    }
    return {
      ejercicio: year,
      page,
      total: ids.length,
      control: base.control,
      corte: base.corte,
      procedencia: base.procedencia,
      subtotalRegistrado: base.subtotalRegistrado,
      motivo: base.motivo,
      items: ids
        .slice((page - 1) * 100, page * 100)
        .map((r) => view(db, r.id, year, now, provider, false)),
    };
  })();
}
export function vehicleIntegrity(
  db: Database,
  exercise: string | null | undefined,
  now = Date.now(),
  provider?: AnnualProvider,
) {
  const year = yearOf(exercise, now);
  return db.transaction(() => {
    const missing = db
        .query(
          "SELECT r.id FROM referencias r LEFT JOIN fichas_vehiculo f ON f.referencia=r.id WHERE r.tipo='Vehículo' AND f.referencia IS NULL ORDER BY length(r.id),r.id",
        )
        .all() as { id: string }[],
      wrongType = db
        .query(
          "SELECT f.referencia FROM fichas_vehiculo f JOIN referencias r ON r.id=f.referencia WHERE r.tipo!='Vehículo' ORDER BY length(f.referencia),f.referencia",
        )
        .all() as { referencia: string }[],
      orphan = db
        .query(
          "SELECT f.referencia FROM fichas_vehiculo f LEFT JOIN referencias r ON r.id=f.referencia WHERE r.id IS NULL ORDER BY length(f.referencia),f.referencia",
        )
        .all() as { referencia: string }[],
      duplicate = db
        .query(
          "SELECT referencia FROM fichas_vehiculo GROUP BY referencia HAVING COUNT(*)>1 ORDER BY referencia",
        )
        .all() as { referencia: string }[],
      items: any[] = [];
    for (const { id } of missing) {
      const reference = getReference(db, id),
        ficha = null,
        gastos = !!gastosFor(db, id);
      let annual = null;
      try {
        annual = annualFor(db, id, year, now, provider);
      } catch {
        annual = null;
      }
      items.push({
        referencia: reference,
        ficha,
        integridad: {
          estado: "Revisar" as const,
          motivos: ["FICHA_AUSENTE", ...(gastos ? ["GASTO_SIN_FICHA"] : [])],
          mensaje: gastos
            ? "La Referencia Vehículo no tiene ficha y existen Gastos vinculados."
            : "La Referencia Vehículo no tiene ficha.",
        },
        gastoAnual: annual,
      });
    }
    for (const { referencia } of wrongType)
      items.push({
        referencia: getReference(db, referencia),
        ficha: vehicleFicha(db, referencia),
        integridad: {
          estado: "Revisar" as const,
          motivos: ["REF_TIPO_INCORRECTO"],
          mensaje: "La ficha apunta a una Referencia que no es Vehículo.",
        },
        gastoAnual: null,
      });
    for (const { referencia } of orphan)
      items.push({
        referencia: null,
        ficha: vehicleFicha(db, referencia),
        integridad: {
          estado: "Revisar" as const,
          motivos: ["REF_AUSENTE"],
          mensaje: "La ficha no tiene Referencia.",
        },
        gastoAnual: null,
      });
    for (const { referencia } of duplicate)
      items.push({
        referencia: getReference(db, referencia),
        ficha: vehicleFicha(db, referencia),
        integridad: {
          estado: "Revisar" as const,
          motivos: ["FICHA_DUPLICADA"],
          mensaje: "Hay más de una ficha para la Referencia.",
        },
        gastoAnual: null,
      });
    let base;
    try {
      base = annualExecution(
        "__sin_partida__",
        year,
        [],
        emptySourcesFor(provider, db, year),
        now,
      );
    } catch {
      base = annualExecution("__sin_partida__", year, [], emptySources, now);
    }
    const summary = {
        ejercicio: year,
        control: base.control,
        corte: base.corte,
        procedencia: base.procedencia,
        coberturaAlCorte: base.cobertura,
        coberturaAnual: annualCoverage(base, year, now),
        subtotalRegistrado: base.subtotalRegistrado,
        totalAlCorte: null,
        totalAnual: null,
        ceroVerificado: false,
        motivo: base.motivo,
      };
    return {
      ejercicio: year,
      estado: items.length ? "Revisar" : "OK",
      items,
      cobertura: summary,
    };
  })();
}
function emptySourcesFor(
  provider: AnnualProvider | undefined,
  db: Database,
  year: number,
) {
  return provider ? provider(db, year) : emptySources;
}
