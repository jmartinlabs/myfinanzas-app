import { cycleMaster } from "./ciclos";
import type { Database } from "bun:sqlite";
import { Problem, money, decimal } from "./saldos";
import {
  ledgerRows,
  financeRevision,
  fingerprint,
  type LedgerRow,
} from "./movement-ledger";
import { spanishToday } from "./movimientos";
export type AnnualLine = {
  ejercicio: number;
  partida: string;
  presupuesto: string | null;
  periodo: string | null;
  esencial: "Sí" | "No" | "Pendiente";
  revision: number;
};
type Interval = { inicio: string; fin: string };
export type AnnualHistory = {
  partida: string;
  ejercicio: number;
  importeCentimos: string;
  fecha: string | null;
  intervalo: Interval;
  procedencia: string;
  verificado: boolean;
  representadoEnMovimientos: boolean;
};
/** Internal integration boundary. No historical/closure provider is installed in runtime. */
export type AnnualSources = {
  revision: string;
  control: Interval | null;
  corte?: string | null;
  historico: AnnualHistory[];
  historicoDisponible: boolean;
  protecciones: {
    id: string;
    partida: string | null;
    ejercicio: number;
    motivo: string;
    verificada: boolean;
  }[];
  cierresDisponibles: boolean;
};
export type AnnualProvider = (db: Database, ejercicio: number) => AnnualSources;
const unavailable = (): AnnualSources => ({
  revision: "sin-proveedores",
  control: null,
  historico: [],
  historicoDisponible: false,
  protecciones: [],
  cierresDisponibles: false,
});
const fail = (message: string): never => {
  throw new Problem(422, "VALIDATION", message);
};
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    return fail("Objeto inválido.");
  return v as Record<string, unknown>;
}
function only(v: Record<string, unknown>, keys: string[]) {
  if (Object.keys(v).some((k) => !keys.includes(k)))
    fail("Campo desconocido o derivado no editable.");
}
export function annualYear(v: unknown): number {
  const n = typeof v === "string" && /^\d{4}$/.test(v) ? Number(v) : v;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 1 || n > 9999)
    return fail("Ejercicio inválido.");
  return n;
}
export function annualLines(db: Database, year: number): AnnualLine[] {
  return db
    .query(
      "SELECT ejercicio,partida,CAST(presupuesto AS TEXT) presupuesto,periodo,esencial,revision FROM annual_plan_lines WHERE ejercicio=? ORDER BY partida",
    )
    .all(year) as AnnualLine[];
}
function catalog(db: Database) {
  return db
    .query(
      "SELECT p.id,p.nombre,p.estado,p.padre subcategoria,s.nombre nombreSubcategoria,c.id categoria,c.nombre nombreCategoria,s.estado estadoSubcategoria,c.estado estadoCategoria FROM partidas p JOIN subcategorias s ON s.id=p.padre JOIN categorias c ON c.id=s.padre ORDER BY length(p.id),p.id",
    )
    .all() as {
    id: string;
    nombre: string;
    estado: string;
    subcategoria: string;
    nombreSubcategoria: string;
    categoria: string;
    nombreCategoria: string;
    estadoSubcategoria: string;
    estadoCategoria: string;
  }[];
}
export function annualEquivalent(
  lines: Pick<AnnualLine, "presupuesto" | "esencial">[],
) {
  const essential = lines.filter((l) => l.esencial === "Sí"),
    missing = essential.filter((l) => l.presupuesto === null).length;
  const sum = essential.reduce((n, l) => n + BigInt(l.presupuesto ?? "0"), 0n);
  // A rational in cents is the consumer contract; formatted EUR is never an input.
  return {
    estado: !lines.length
      ? "Sin plan anual"
      : missing
        ? "Incompleto"
        : "Completo",
    total:
      !lines.length || missing
        ? null
        : { numeradorCentimos: sum.toString(), divisor: "12" },
    parcial: lines.length
      ? { numeradorCentimos: sum.toString(), divisor: "12" }
      : null,
    importesSinInformar: missing,
    clasificacionesPendientes: lines.filter((l) => l.esencial === "Pendiente")
      .length,
    ejercicioSinPlan: !lines.length,
  };
}
const validDate = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v + "T00:00:00Z")) &&
  new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
const intervalValid = (i: Interval) =>
  validDate(i.inicio) && validDate(i.fin) && i.inicio <= i.fin;
const overlaps = (a: Interval, b: Interval) =>
  a.inicio <= b.fin && b.inicio <= a.fin;
/** Annual attribution depends only on stable Partida and real date, never cycle/monthly source. */
export function annualExecution(
  partida: string,
  year: number,
  rows: LedgerRow[],
  sources: AnnualSources,
  now = Date.now(),
) {
  const start = String(year).padStart(4, "0") + "-01-01",
    end = String(year).padStart(4, "0") + "-12-31",
    today = spanishToday(now),
    future = start > today;
  const control =
    sources.control && intervalValid(sources.control) ? sources.control : null;
  const suppliedCut =
    sources.corte === undefined ? (control?.fin ?? null) : sources.corte;
  const cut =
    suppliedCut && validDate(suppliedCut)
      ? suppliedCut < end
        ? suppliedCut
        : end
      : null;
  const facts = rows.filter(
    (r) =>
      !r.anulado &&
      r.tipo === "Gasto" &&
      r.partida === partida &&
      r.fecha >= start &&
      r.fecha <= end &&
      (!cut || r.fecha <= cut) &&
      (!control || (r.fecha >= control.inicio && r.fecha <= control.fin)),
  );
  const registered = facts.reduce((n, r) => n + BigInt(r.importe), 0n);
  const histories = sources.historico.filter(
    (h) => h.partida === partida && h.ejercicio === year,
  );
  const valid: AnnualHistory[] = [],
    reasons: string[] = [];
  for (const h of histories) {
    if (
      !sources.historicoDisponible ||
      !h.verificado ||
      !h.procedencia.trim() ||
      !/^\d+$/.test(h.importeCentimos) ||
      !intervalValid(h.intervalo) ||
      h.intervalo.inicio < start ||
      h.intervalo.fin > end ||
      !cut ||
      h.intervalo.fin > cut ||
      (h.fecha !== null &&
        (!validDate(h.fecha) ||
          h.fecha < h.intervalo.inicio ||
          h.fecha > h.intervalo.fin))
    ) {
      reasons.push("Histórico de origen/intervalo no verificable");
      continue;
    }
    if (h.representadoEnMovimientos) continue;
    if (
      (control && overlaps(h.intervalo, control)) ||
      valid.some((v) => overlaps(v.intervalo, h.intervalo))
    ) {
      reasons.push("Histórico solapado: no se suma ni se atribuye fecha");
      continue;
    }
    valid.push(h);
  }
  if (future) reasons.push("Ejercicio futuro sin corte ejecutado");
  if (!control || cut! < start)
    reasons.push("Intervalo de control/corte no verificable");
  // Coverage is proven only by a contiguous union of approved intervals, never by the first fact.
  let cursor = start;
  const intervals = [
    ...(control
      ? [
          {
            inicio: control.inicio < start ? start : control.inicio,
            fin: control.fin < cut! ? control.fin : cut!,
          },
        ]
      : []),
    ...valid.map((h) => h.intervalo),
  ]
    .filter((i) => i.inicio <= i.fin)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  for (const i of intervals) {
    if (i.inicio > cursor) break;
    if (i.fin >= cursor) {
      const date = new Date(i.fin + "T00:00:00Z");
      date.setUTCDate(date.getUTCDate() + 1);
      cursor = date.toISOString().slice(0, 10);
    }
  }
  if (!cut || cursor <= cut)
    reasons.push(
      "Cobertura anterior al control no verificada; histórico no instalado o incompleto",
    );
  const complete = !reasons.length,
    total =
      registered + valid.reduce((n, h) => n + BigInt(h.importeCentimos), 0n);
  const dates = [
    ...facts.map((r) => r.fecha),
    ...valid.flatMap((h) => (h.fecha ? [h.fecha] : [])),
  ].sort();
  return {
    ejecutado: complete ? decimal(total) : null,
    subtotalRegistrado: decimal(registered)!,
    historicoConocido: decimal(total - registered)!,
    fechaEjecutada: dates.at(-1) ?? null,
    cobertura: complete ? "Verificable al corte" : "Parcial",
    motivo: reasons.join(". ") || null,
    corte: cut,
    control,
    universo: { inicio: start, fin: end },
    procedencia: {
      movimientos: "Instalado; Gastos vigentes por Fecha real",
      historico: sources.historicoDisponible
        ? "Proveedor disponible"
        : "No instalado",
      intervalosHistoricos: valid.map((h) => ({
        intervalo: h.intervalo,
        procedencia: h.procedencia,
      })),
    },
    hechos: facts.map((r) => ({
      id: r.id,
      fecha: r.fecha,
      importe: decimal(r.importe),
    })),
  };
}
function sourceContext(db: Database, year: number, provider?: AnnualProvider) {
  const sources = (provider ?? unavailable)(db, year);
  return {
    sources,
    hash: fingerprint([
      year,
      financeRevision(db),
      annualLines(db, year),
      sources,
    ]),
  };
}
function read(
  db: Database,
  year: number,
  now: number,
  provider?: AnnualProvider,
) {
  const { sources, hash } = sourceContext(db, year, provider),
    lines = annualLines(db, year),
    parts = catalog(db),
    rows = ledgerRows(db);
  const result = (p: ReturnType<typeof catalog>[number]) => {
    const line = lines.find((l) => l.partida === p.id),
      execution = annualExecution(p.id, year, rows, sources, now);
    return {
      partida: p,
      linea: line ? { ...line, presupuesto: decimal(line.presupuesto) } : null,
      ...execution,
      diferencia:
        line?.presupuesto !== null &&
        line?.presupuesto !== undefined &&
        execution.ejecutado !== null
          ? decimal(
              BigInt(line.presupuesto) -
                BigInt(execution.ejecutado.replace(".", "")),
            )
          : null,
      protecciones: sources.protecciones.filter(
        (r) => r.ejercicio === year && (!r.partida || r.partida === p.id),
      ),
    };
  };
  return {
    ejercicio: year,
    contextRevision: hash,
    sinPlan: !lines.length,
    items: parts
      .filter((p) => lines.some((l) => l.partida === p.id))
      .map(result),
    sinLinea: parts
      .filter((p) => !lines.some((l) => l.partida === p.id))
      .map(result)
      .filter((i) => i.hechos.length || i.historicoConocido !== "0.00"),
    opciones: parts,
    esencial: annualEquivalent(lines),
    fuentes: {
      movimientos: true,
      historico: sources.historicoDisponible,
      cierres: sources.cierresDisponibles,
      control: sources.control,
      motivo: !sources.control
        ? "Inicio de control no verificado. Los hechos registrados no acreditan cobertura anual."
        : "Cobertura por Partida; verificable solo hasta el corte.",
    },
    auditoria: db
      .query("SELECT * FROM annual_plan_audit WHERE ejercicio=? ORDER BY id")
      .all(year),
  };
}
export function getAnnualPlan(
  db: Database,
  exercise: unknown,
  now = Date.now(),
  provider?: AnnualProvider,
) {
  const year = annualYear(exercise);
  return db.transaction(() => read(db, year, now, provider))();
}
function proposal(
  db: Database,
  year: number,
  body: Record<string, unknown>,
  now: number,
  provider?: AnnualProvider,
) {
  only(body, ["partida", "revision", "contextRevision", "cambios"]);
  if (typeof body.partida !== "string") fail("Partida obligatoria.");
  const part = catalog(db).find((p) => p.id === body.partida);
  if (!part) throw new Problem(404, "NOT_FOUND", "Partida no encontrada.");
  const lines = annualLines(db, year),
    old = lines.find((l) => l.partida === body.partida),
    changes = object(body.cambios),
    { sources, hash } = sourceContext(db, year, provider);
  only(changes, ["presupuesto", "periodo", "esencial"]);
  if (body.revision !== (old?.revision ?? 0) || body.contextRevision !== hash)
    throw new Problem(
      409,
      "CONTEXT_CHANGED",
      "El contexto ha cambiado. Actualiza y revisa conservando el borrador.",
    );
  if (
    !old &&
    (part.estado !== "Activa" ||
      part.estadoSubcategoria !== "Activa" ||
      part.estadoCategoria !== "Activa")
  )
    fail("Nueva línea solo para Partida y jerarquía activas.");
  const next: AnnualLine = {
    ...(old ?? {
      ejercicio: year,
      partida: part.id,
      presupuesto: null,
      periodo: null,
      esencial: "Pendiente",
      revision: 0,
    }),
  };
  if (!old && changes.esencial === undefined)
    fail("Elige Esencial: Sí, No o Pendiente.");
  if (changes.presupuesto !== undefined) {
    const n = money(changes.presupuesto);
    if (n !== null && n < 0n) fail("Presupuesto no negativo.");
    next.presupuesto = n?.toString() ?? null;
  }
  if (changes.periodo !== undefined) {
    if (
      changes.periodo !== null &&
      (typeof changes.periodo !== "string" ||
        changes.periodo.length > 500 ||
        /[\u0000-\u001f\u007f]/.test(changes.periodo))
    )
      fail("Periodo previsto inválido; máximo 500 caracteres.");
    next.periodo = changes.periodo as string | null;
  }
  if (changes.esencial !== undefined) {
    if (!["Sí", "No", "Pendiente"].includes(changes.esencial as string))
      fail("Clasificación Esencial inválida.");
    next.esencial = changes.esencial as AnnualLine["esencial"];
  }
  const protections = sources.protecciones.filter(
    (p) => p.ejercicio === year && (!p.partida || p.partida === part.id),
  );
  const after = lines.filter((l) => l.partida !== part.id).concat(next),
    past = year < Number(spanishToday(now).slice(0, 4));
  const delta = Object.fromEntries(
    (["presupuesto", "periodo", "esencial"] as const)
      .filter((k) => !old || old[k] !== next[k])
      .map((k) => [
        k,
        {
          anterior:
            k === "presupuesto"
              ? decimal(old?.[k] ?? null)
              : (old?.[k] ?? null),
          posterior: k === "presupuesto" ? decimal(next[k]) : next[k],
        },
      ]),
  );
  const execution = annualExecution(
    part.id,
    year,
    ledgerRows(db),
    sources,
    now,
  );
  const derived = (line: AnnualLine | undefined) => ({
    ejecutado: execution.ejecutado,
    diferencia:
      line?.presupuesto !== undefined &&
      line.presupuesto !== null &&
      execution.ejecutado !== null
        ? decimal(
            BigInt(line.presupuesto) -
              BigInt(execution.ejecutado.replace(".", "")),
          )
        : null,
    motivoDiferencia:
      line?.presupuesto === undefined || line.presupuesto === null
        ? "Presupuesto sin informar"
        : execution.motivo,
    fechaEjecutada: execution.fechaEjecutada,
    cobertura: execution.cobertura,
    motivo: execution.motivo,
    subtotalRegistrado: execution.subtotalRegistrado,
    corte: execution.corte,
    control: execution.control,
    procedencia: execution.procedencia,
  });
  const yearStart = `${String(year).padStart(4, "0")}-01-01`,
    yearEnd = `${String(year).padStart(4, "0")}-12-31`;
  return {
    partida: part,
    antes: old ? { ...old, presupuesto: decimal(old.presupuesto) } : null,
    despues: { ...next, presupuesto: decimal(next.presupuesto) },
    delta,
    derivadosAntes: derived(old),
    derivadosDespues: derived(next),
    equivalenteAntes: annualEquivalent(lines),
    equivalenteDespues: annualEquivalent(after),
    requiereMotivo: past,
    protecciones: protections,
    bloqueado: protections.length > 0,
    fuentes: {
      cierres: sources.cierresDisponibles,
      historico: sources.historicoDisponible,
    },
    relaciones: {
      partida: part.id,
      ejercicio: year,
      ciclos: cycleMaster(db)
        .filter(
          (c) => c.inicio <= yearEnd && (c.fin === null || c.fin >= yearStart),
        )
        .map((c) => ({
          id: c.id,
          inicio: c.inicio,
          fin: c.fin,
          corte: c.corte,
        })),
    },
    fingerprint: fingerprint([hash, next, protections, past]),
    next,
    sinCambios: old !== undefined && !Object.keys(delta).length,
  };
}
export function previewAnnualPlan(
  db: Database,
  exercise: unknown,
  value: unknown,
  now = Date.now(),
  provider?: AnnualProvider,
) {
  const year = annualYear(exercise);
  return db.transaction(() => {
    const { next, ...p } = proposal(db, year, object(value), now, provider);
    return p;
  })();
}
export function confirmAnnualPlan(
  db: Database,
  exercise: unknown,
  value: unknown,
  key: string,
  now = Date.now(),
  provider?: AnnualProvider,
) {
  const year = annualYear(exercise),
    body = object(value);
  only(body, ["propuesta", "fingerprint", "motivo"]);
  if (!/^[A-Za-z0-9-]{16,100}$/.test(key))
    fail("Clave de idempotencia inválida.");
  return db
    .transaction(() => {
      const hash = fingerprint([year, body]);
      db.run("DELETE FROM annual_plan_attempts WHERE expires<=?", [now]);
      const retry = db
        .query("SELECT hash,response FROM annual_plan_attempts WHERE key=?")
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "Clave utilizada para otros cambios.",
          );
        return JSON.parse(retry.response) as ReturnType<typeof getAnnualPlan>;
      }
      const p = proposal(db, year, object(body.propuesta), now, provider);
      if (body.fingerprint !== p.fingerprint)
        throw new Problem(
          409,
          "CONTEXT_CHANGED",
          "Impacto obsoleto; actualiza y revisa. El borrador se conserva.",
        );
      if (p.bloqueado)
        throw new Problem(
          409,
          "HISTORY_LOCKED",
          p.protecciones.map((p) => p.motivo).join(". "),
        );
      if (
        (p.requiereMotivo || body.motivo !== undefined) &&
        (typeof body.motivo !== "string" ||
          (p.requiereMotivo && !body.motivo.trim()) ||
          body.motivo.length > 2000 ||
          /[\u0000-\u001f\u007f]/.test(body.motivo))
      )
        fail(
          "Motivo obligatorio para ejercicio pasado; máximo 2000 caracteres.",
        );
      if (!p.sinCambios) {
        const l = p.next;
        if (l.revision === 0)
          db.run("INSERT INTO annual_plan_lines VALUES(?,?,?,?,?,1)", [
            year,
            l.partida,
            l.presupuesto,
            l.periodo,
            l.esencial,
          ]);
        else
          db.run(
            "UPDATE annual_plan_lines SET presupuesto=?,periodo=?,esencial=?,revision=revision+1 WHERE ejercicio=? AND partida=?",
            [l.presupuesto, l.periodo, l.esencial, year, l.partida],
          );
        db.run(
          "INSERT INTO annual_plan_audit(ejercicio,partida,revision,actor,instante,motivo,delta) VALUES(?,?,?,'usuario-unico',?,?,?)",
          [
            year,
            l.partida,
            l.revision + 1,
            new Date(now).toISOString(),
            typeof body.motivo === "string" ? body.motivo.trim() : null,
            JSON.stringify(p.delta),
          ],
        );
      }
      const result = read(db, year, now, provider);
      db.run("INSERT INTO annual_plan_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(result),
        now + 86400000,
      ]);
      return result;
    })
    .immediate();
}
/** New relationships participate in classification impact and fingerprint without changing annual attribution. */
export function annualClassificationRelations(db: Database, ids: string[]) {
  return db
    .query(
      "SELECT ejercicio,partida,revision FROM annual_plan_lines ORDER BY ejercicio,partida",
    )
    .all()
    .filter((r) => ids.includes((r as { partida: string }).partida));
}
