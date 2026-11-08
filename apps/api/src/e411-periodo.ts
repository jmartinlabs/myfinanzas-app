import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { getFotoCierre } from "./e49";
import { readActiveWindow, type ActiveWindowReading } from "./e410-window";
import { resolveAppVersion } from "./app-version";
import { Problem } from "./problem";

/**
 * E4.11 I3 — quarter/year aggregate composed from financed cycles.
 *
 * Closed rules implemented here (they are not reinterpreted):
 *  - P3-B: a period is the natural quarter/year and a cycle belongs to it by
 *    `ciclos.mes_financiado` (generated column). The cycle is included whole,
 *    never prorated; a cycle starting in December 2026 is financed in 2027-01
 *    and therefore belongs to 2027.
 *  - P1-C/P4-A/P5-B: all versions stay visible; without `seleccion` each cycle
 *    uses its last persisted version at generation time and the response
 *    declares it; with `seleccion` the explicit version is used. A reopened
 *    cycle without a newer version is excluded as `PendienteReCierre`; a cycle
 *    without closure is excluded as `ExcluidoSinCierre`. Mixed versions are
 *    allowed and recorded one by one.
 *  - P2-A/P6-A: the aggregate is persisted once, versioned (`A1`, `A2`, ...)
 *    and immutable. Reading it never recomputes from live engines and the
 *    previous aggregate keeps its values and references after a re-closure.
 *
 * No additive rule is defined by SPEC29 for a period total. `valores` stores
 * the exact blocks already captured by each included photo and
 * `totalPeriodo` is `null`; coverage is `Parcial` with a motive. Absence is
 * never turned into `0`.
 *
 * The only write in E4.11 lives in `crearFotoPeriodo`; it inserts
 * `fotos_periodo`, `foto_periodo_componentes` and `periodo_attempts` and
 * touches no `cierres`, `fotos_cierre` or `ciclos` row.
 */

export const REGLA_COMPOSICION = "P1-C/P4-A/P5-B";
export const REGLA_PERIODO = "P3-B";
export const REGLA_CONSULTA_VERSION = "P7-D";
export const ACTOR_POR_DEFECTO = "usuario-unico";

const keyPattern = /^[a-zA-Z0-9-]{16,100}$/;
const versionPattern = /^A[1-9][0-9]{0,18}$/;
const folioPattern = /^[0-9]{4}$/;

export type TipoPeriodo = "Trimestre" | "Anio";
export type EstadoComponentePeriodo =
  | "Incluido"
  | "ExcluidoSinCierre"
  | "PendienteReCierre";
export type EstadoReaperturaComponente =
  | "Abierta"
  | "CierrePosterior"
  | "Inconsistente";
export type EstadoCoberturaPeriodo = "Parcial" | "NoDisponible";

export type Ventana = { inicio: string; fin: string | null };

export type ComponentePeriodoDto = {
  ciclo: string;
  mesFinanciado: string;
  ventana: Ventana | null;
  versionFoto: number | null;
  fingerprint: string | null;
  estado: EstadoComponentePeriodo;
  /**
   * Real reopening state when it prevents inclusion. `null` for a normal
   * closed cycle or an `ExcluidoSinCierre` component. v27 only admits three
   * component states, so `CierrePosterior`/`Inconsistente` use
   * `PendienteReCierre` as the persisted state and this field plus `motivo`
   * declare the precise cause.
   */
  estadoReapertura: EstadoReaperturaComponente | null;
  motivo: string | null;
};

export type SeleccionAplicadaDto = {
  regla: typeof REGLA_COMPOSICION;
  reglaPeriodo: typeof REGLA_PERIODO;
  porDefecto: boolean;
  /** Explicit versions requested in the POST body, keyed by cycle. */
  solicitada: Record<string, number>;
  /** Effective version per cycle (`null` when the cycle is excluded). */
  seleccion: Record<string, number | null>;
  /** Frozen period details of every cycle, in composition order. */
  porCiclo: {
    ciclo: string;
    versionFoto: number | null;
    porDefecto: boolean;
    mesFinanciado: string;
    ventana: Ventana;
    estadoReapertura: EstadoReaperturaComponente | null;
  }[];
};

export type BloqueCoberturaDto = {
  ciclo: string;
  versionFoto: number | null;
  estado: string;
  motivos: string[];
};

export type CoberturaPeriodoDto = {
  estado: EstadoCoberturaPeriodo;
  motivos: string[];
  totalPeriodo: null;
  bloques: BloqueCoberturaDto[];
};

export type ValorCicloDto = {
  ciclo: string;
  versionFoto: number;
  fingerprint: string;
  ventana: {
    inicio: string;
    fin: string;
    saldoInicial: string | null;
    estadoTemporal: string;
  };
  estadoHechos: string;
  estadoPlan: string;
  hechos: unknown;
  plan: unknown;
  clasificacion: unknown;
  inversion: unknown;
  auxiliares: unknown;
  cobertura: unknown;
  noDisponible: unknown;
};

export type ValoresPeriodoDto = {
  totalPeriodo: null;
  motivoTotal: "SIN_REGLA_ADITIVA";
  porCiclo: ValorCicloDto[];
};

export type NoDisponiblePeriodoDto = {
  ciclo: string;
  versionFoto: number;
  bloque: string;
  estado: string;
  motivo: string | null;
};

export type SeleccionVersionDto = {
  version: string;
  porDefecto: boolean;
  regla: typeof REGLA_CONSULTA_VERSION;
};

export type FotoPeriodoDto = {
  origen: "Foto";
  id: number;
  tipo: TipoPeriodo;
  periodo: {
    ejercicio: number;
    trimestre: number | null;
    inicio: string;
    fin: string;
  };
  seleccionAplicada: SeleccionAplicadaDto;
  seleccionVersion: SeleccionVersionDto;
  identidad: {
    versionAgregado: string;
    fechaUtc: string;
    fingerprint: string;
    versionApp: string;
    versionEsquema: number;
    actor: string;
    motivo: string | null;
  };
  composicion: ComponentePeriodoDto[];
  cobertura: CoberturaPeriodoDto;
  valores: ValoresPeriodoDto;
  noDisponible: NoDisponiblePeriodoDto[];
};

export type PeriodoOptions = {
  actor?: string;
  appVersion?: string;
};

type PeriodoNatural = {
  tipo: TipoPeriodo;
  ejercicio: number;
  trimestre: number | null;
  inicio: string;
  fin: string;
};

type CicloRow = {
  id: string;
  inicio: string;
  mes_financiado: string;
};

type PeriodoRow = {
  id: number;
  tipo: TipoPeriodo;
  ejercicio: number;
  trimestre: number | null;
  inicio: string;
  fin: string;
  version: string;
  creado_utc: string;
  actor: string;
  motivo: string | null;
  fingerprint: string;
  app_version: string;
  schema_version: number;
  regla_composicion: string;
  seleccion_aplicada: string;
  cobertura: string;
  valores: string;
  no_disponible: string;
};

type ComponenteRow = {
  ciclo: string;
  version_foto: number | null;
  fingerprint_foto: string | null;
  estado: EstadoComponentePeriodo;
  motivo: string | null;
};

const SELECT_PERIODO = `SELECT id,tipo,ejercicio,trimestre,inicio,fin,version,
  creado_utc,actor,motivo,fingerprint,app_version,schema_version,
  regla_composicion,seleccion_aplicada,cobertura,valores,no_disponible
  FROM fotos_periodo`;

const fingerprint = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function validation(message: string, field: string, reason: string): never {
  throw new Problem(422, "VALIDATION", message, { [field]: reason });
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function today(now: number) {
  return new Date(now).toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** Natural quarter/year bounds. The period is not derived from cycle windows. */
export function periodoNatural(
  tipo: TipoPeriodo,
  ejercicio: number,
  trimestre: number | null,
): { inicio: string; fin: string } {
  if (tipo === "Anio")
    return { inicio: `${ejercicio}-01-01`, fin: `${ejercicio}-12-31` };
  const q = trimestre as number;
  const firstMonth = (q - 1) * 3 + 1;
  const lastMonth = q * 3;
  const mm = (month: number) => String(month).padStart(2, "0");
  return {
    inicio: `${ejercicio}-${mm(firstMonth)}-01`,
    fin: lastDayOfMonth(ejercicio, lastMonth),
  };
}

function assertNotFuture(periodo: PeriodoNatural, now: number) {
  if (periodo.inicio > today(now))
    throw new Problem(
      422,
      "VALIDATION",
      "El periodo todavía no ha comenzado.",
      { periodo: "Indica un periodo no futuro." },
    );
}

/**
 * Parses and validates the POST body. Unknown fields are rejected instead of
 * silently ignored, and `seleccion` cannot name a version for a cycle that is
 * not part of the period (checked later against `mes_financiado`).
 */
function inputDesdeCuerpo(body: Record<string, unknown>, now: number) {
  for (const name of Object.keys(body))
    if (!["tipo", "ejercicio", "trimestre", "seleccion"].includes(name))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`, {
        [name]: "Campo no editable.",
      });
  const tipo = body.tipo;
  if (tipo !== "Trimestre" && tipo !== "Anio")
    validation(
      "Revisa el tipo de periodo.",
      "tipo",
      "Indica Trimestre o Anio.",
    );
  const ejercicio = body.ejercicio;
  if (
    typeof ejercicio !== "number" ||
    !Number.isInteger(ejercicio) ||
    ejercicio < 1000 ||
    ejercicio > 9999
  )
    validation(
      "Revisa el ejercicio.",
      "ejercicio",
      "Indica un año de cuatro cifras.",
    );
  let trimestre: number | null = null;
  if (tipo === "Trimestre") {
    if (
      typeof body.trimestre !== "number" ||
      !Number.isInteger(body.trimestre) ||
      body.trimestre < 1 ||
      body.trimestre > 4
    )
      validation(
        "Revisa el trimestre.",
        "trimestre",
        "Indica un trimestre entre 1 y 4.",
      );
    trimestre = body.trimestre;
  } else if (body.trimestre !== undefined && body.trimestre !== null)
    validation(
      "Un año no lleva trimestre.",
      "trimestre",
      "Omite el trimestre para un periodo anual.",
    );

  const seleccion = new Map<string, number>();
  if (body.seleccion !== undefined && body.seleccion !== null) {
    if (
      typeof body.seleccion !== "object" ||
      Array.isArray(body.seleccion)
    )
      validation(
        "Revisa la selección de versiones.",
        "seleccion",
        "Debe ser un objeto ciclo → versión.",
      );
    for (const [ciclo, version] of Object.entries(
      body.seleccion as Record<string, unknown>,
    )) {
      if (!isPositiveInteger(version))
        validation(
          `Revisa la versión de ${ciclo}.`,
          `seleccion.${ciclo}`,
          "Indica una versión positiva.",
        );
      seleccion.set(ciclo, version);
    }
  }

  const periodo: PeriodoNatural = {
    tipo,
    ejercicio,
    trimestre,
    ...periodoNatural(tipo, ejercicio, trimestre),
  };
  assertNotFuture(periodo, now);
  return { periodo, seleccion };
}

function ciclosDelPeriodo(db: Database, periodo: PeriodoNatural) {
  return db
    .query(
      `SELECT id,inicio,mes_financiado FROM ciclos
       WHERE mes_financiado>=? AND mes_financiado<=?
       ORDER BY mes_financiado,id`,
    )
    .all(periodo.inicio, periodo.fin) as CicloRow[];
}

/** Next cycle start is structural data, never a live financial engine read. */
function siguienteInicio(db: Database, inicio: string) {
  const row = db
    .query("SELECT inicio FROM ciclos WHERE inicio>? ORDER BY inicio LIMIT 1")
    .get(inicio) as { inicio: string } | null;
  return row?.inicio ?? null;
}

function ventanaEstructural(db: Database, ciclo: CicloRow): Ventana {
  const next = siguienteInicio(db, ciclo.inicio);
  return {
    inicio: ciclo.inicio,
    fin: next
      ? new Date(Date.parse(next + "T00:00:00.000Z") - 86400000)
          .toISOString()
          .slice(0, 10)
      : null,
  };
}

function ultimaVersion(db: Database, ciclo: string) {
  const row = db
    .query(
      "SELECT version FROM cierres WHERE ciclo=? ORDER BY version DESC LIMIT 1",
    )
    .get(ciclo) as { version: number } | null;
  return row?.version ?? null;
}

type AnomaliaReapertura = {
  estado: "CierrePosterior" | "Inconsistente";
  motivo: string;
};

/**
 * R5 — real reopening states from the canonical non-throwing reader.
 * Mapping (no new financial rule):
 *  - `Abierta` (the cycle owns the open window) → `PendienteReCierre`/P4-A;
 *  - `CierrePosterior` (a later closure invalidates the window) → exclude the
 *    reopened cycle with `estadoReapertura:"CierrePosterior"` and
 *    `motivo:"CIERRE_POSTERIOR"`;
 *  - `Inconsistente` (projection/event mismatch) → exclude every implicated
 *    cycle with `estadoReapertura:"Inconsistente"` and
 *    `motivo:"ESTADO_INCONSISTENTE"`.
 * v27 only admits `Incluido`/`ExcluidoSinCierre`/`PendienteReCierre` as the
 * persisted component state, so both anomalies are persisted as
 * `PendienteReCierre`; the precise state travels in `seleccionAplicada` and
 * the response. A cycle in `Inconsistente` is never included silently.
 */
function anomaliaReapertura(
  ciclo: string,
  reading: ActiveWindowReading,
): AnomaliaReapertura | null {
  if (reading.estado === "CierrePosterior" && reading.ciclo === ciclo)
    return { estado: "CierrePosterior", motivo: "CIERRE_POSTERIOR" };
  if (reading.estado === "Inconsistente") {
    const implicado =
      reading.ciclo === ciclo || reading.evento?.ciclo === ciclo;
    if (implicado)
      return { estado: "Inconsistente", motivo: "ESTADO_INCONSISTENTE" };
  }
  return null;
}

function ventanaAbierta(ciclo: string, reading: ActiveWindowReading) {
  return reading.estado === "Abierta" && reading.ventana.ciclo === ciclo;
}

function inconsistenciaCierre(
  ciclo: string,
  versionCierre: number,
  versionFoto: number | null,
) {
  return new Problem(
    500,
    "ESTADO_INCONSISTENTE",
    "El último cierre no tiene la foto correspondiente.",
    {},
    { ciclo, versionCierre, versionFoto },
  );
}

/**
 * R4 — fail closed when `MAX(cierres.version)` has no matching photo.
 * `getFotoCierre` without a version joins `fotos_cierre`, so a missing latest
 * photo would silently return the previous version. We compare the closure
 * maximum with the returned photo instead of accepting that fallback.
 */
function fotoUltimaConsistente(db: Database, ciclo: string, ultima: number) {
  let foto: ReturnType<typeof getFotoCierre>["foto"];
  try {
    foto = getFotoCierre(db, ciclo).foto;
  } catch (error) {
    if (error instanceof Problem && error.status === 404)
      throw inconsistenciaCierre(ciclo, ultima, null);
    throw error;
  }
  if (foto.version !== ultima)
    throw inconsistenciaCierre(ciclo, ultima, foto.version);
  return foto;
}

/**
 * AC09: an absent block or an absent source keeps an explicit motive. It is
 * never dropped from `motivos` and never turned into `Completo` or `0`.
 */
const MOTIVO_BLOQUE_AUSENTE = "Bloque no disponible en la foto";
const MOTIVO_COBERTURA_AUSENTE = "Cobertura no disponible en la foto";

function coberturaFoto(photo: { cobertura: unknown }) {
  const raw = photo.cobertura;
  if (!raw || typeof raw !== "object")
    return { estado: "NoDisponible", motivos: [MOTIVO_COBERTURA_AUSENTE] };
  const estado =
    typeof (raw as { estado?: unknown }).estado === "string"
      ? ((raw as { estado: string }).estado as string)
      : "NoDisponible";
  const motivos: string[] = [];
  const totales = (raw as { totales?: unknown }).totales;
  if (!totales || typeof totales !== "object") {
    // The source of the blocks is absent: declare it instead of losing the motive.
    motivos.push(MOTIVO_COBERTURA_AUSENTE);
  } else {
    for (const [bloque, value] of Object.entries(
      totales as Record<string, unknown>,
    )) {
      if (!value || typeof value !== "object") {
        motivos.push(`${bloque}: ${MOTIVO_BLOQUE_AUSENTE}`);
        continue;
      }
      const item = value as { estado?: unknown; motivo?: unknown };
      if (item.estado !== "Completo")
        motivos.push(
          typeof item.motivo === "string" && item.motivo
            ? `${bloque}: ${item.motivo}`
            : bloque,
        );
    }
  }
  return { estado, motivos };
}

function noDisponibleDeFoto(
  ciclo: string,
  version: number,
  value: unknown,
): NoDisponiblePeriodoDto[] {
  const entries: NoDisponiblePeriodoDto[] = [];
  const entryAusente = (bloque: string): NoDisponiblePeriodoDto => ({
    ciclo,
    versionFoto: version,
    bloque,
    estado: "No disponible",
    motivo: MOTIVO_BLOQUE_AUSENTE,
  });
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      if (!item || typeof item !== "object") {
        // AC09: a null/absent entry is declared, not skipped.
        entries.push(entryAusente(String(index)));
        continue;
      }
      const row = item as {
        bloque?: unknown;
        estado?: unknown;
        motivo?: unknown;
      };
      entries.push({
        ciclo,
        versionFoto: version,
        bloque:
          typeof row.bloque === "string" ? row.bloque : String(index),
        estado:
          typeof row.estado === "string" ? row.estado : "No disponible",
        motivo: typeof row.motivo === "string" ? row.motivo : null,
      });
    }
  } else if (value && typeof value === "object") {
    for (const [bloque, item] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (!item || typeof item !== "object") {
        // AC09: a null/absent block keeps its name and motive.
        entries.push(entryAusente(bloque));
        continue;
      }
      const row = item as { estado?: unknown; motivo?: unknown };
      entries.push({
        ciclo,
        versionFoto: version,
        bloque,
        estado:
          typeof row.estado === "string" ? row.estado : "No disponible",
        motivo: typeof row.motivo === "string" ? row.motivo : null,
      });
    }
  }
  return entries.filter(
    (entry) => entry.estado === "No disponible" || entry.estado === "NoDisponible",
  );
}

type Compuesto = {
  componentes: {
    ciclo: string;
    versionFoto: number | null;
    fingerprint: string | null;
    estado: EstadoComponentePeriodo;
    estadoReapertura: EstadoReaperturaComponente | null;
    motivo: string | null;
    mesFinanciado: string;
    ventana: Ventana;
    porDefecto: boolean;
  }[];
  valores: ValoresPeriodoDto;
  cobertura: CoberturaPeriodoDto;
  noDisponible: NoDisponiblePeriodoDto[];
  seleccion: SeleccionAplicadaDto;
};

/**
 * Pure composition: it reads only `ciclos`, `cierres`, `fotos_cierre` and
 * `reapertura_activa`. It never calls a live engine, never writes and never
 * falls back to another version.
 */
function componer(
  db: Database,
  periodo: PeriodoNatural,
  solicitada: Map<string, number>,
): Compuesto {
  const ciclos = ciclosDelPeriodo(db, periodo);
  const porId = new Map(ciclos.map((ciclo) => [ciclo.id, ciclo]));
  for (const ciclo of solicitada.keys())
    if (!porId.has(ciclo))
      throw new Problem(
        422,
        "VALIDATION",
        "La selección incluye un ciclo ajeno al periodo.",
        {
          [`seleccion.${ciclo}`]:
            "El ciclo no pertenece a este periodo por mes financiado.",
        },
      );

  const componentes: Compuesto["componentes"] = [];
  const valores: ValorCicloDto[] = [];
  const bloques: BloqueCoberturaDto[] = [];
  const noDisponible: NoDisponiblePeriodoDto[] = [];
  const seleccion: Record<string, number | null> = {};
  const motivos = new Set<string>();
  let incluidos = 0;
  const reading = readActiveWindow(db);

  function excluirReapertura(
    ciclo: CicloRow,
    estadoReapertura: EstadoReaperturaComponente,
    motivo: string,
    porDefecto: boolean,
  ) {
    seleccion[ciclo.id] = null;
    motivos.add(motivo);
    componentes.push({
      ciclo: ciclo.id,
      versionFoto: null,
      fingerprint: null,
      estado: "PendienteReCierre",
      estadoReapertura,
      motivo,
      mesFinanciado: ciclo.mes_financiado,
      ventana: ventanaEstructural(db, ciclo),
      porDefecto,
    });
    bloques.push({
      ciclo: ciclo.id,
      versionFoto: null,
      estado:
        estadoReapertura === "Abierta"
          ? "PendienteReCierre"
          : estadoReapertura,
      motivos: [motivo],
    });
  }

  for (const ciclo of ciclos) {
    const pedida = solicitada.get(ciclo.id);
    const ultima = ultimaVersion(db, ciclo.id);
    const anomalia = anomaliaReapertura(ciclo.id, reading);
    const abierta = ventanaAbierta(ciclo.id, reading);

    if (ultima === null) {
      // A requested version can never exist without closure: canonical 404,
      // never a silent fallback to the default or to another cycle.
      if (pedida !== undefined) getFotoCierre(db, ciclo.id, pedida);
      if (anomalia || abierta) {
        // A projection can point at a cycle with no closure. Exclude it with
        // the real anomaly instead of mislabelling it as a plain missing closure.
        const estadoReapertura: EstadoReaperturaComponente = abierta
          ? "Abierta"
          : anomalia!.estado;
        const motivo = abierta ? "PENDIENTE_RE_CIERRE" : anomalia!.motivo;
        excluirReapertura(
          ciclo,
          estadoReapertura,
          motivo,
          pedida === undefined,
        );
        continue;
      }
      const motivo = "SIN_CIERRE";
      seleccion[ciclo.id] = null;
      motivos.add("CICLO_SIN_CIERRE");
      componentes.push({
        ciclo: ciclo.id,
        versionFoto: null,
        fingerprint: null,
        estado: "ExcluidoSinCierre",
        estadoReapertura: null,
        motivo,
        mesFinanciado: ciclo.mes_financiado,
        ventana: ventanaEstructural(db, ciclo),
        porDefecto: pedida === undefined,
      });
      bloques.push({
        ciclo: ciclo.id,
        versionFoto: null,
        estado: "ExcluidoSinCierre",
        motivos: [motivo],
      });
      continue;
    }

    // R4: the latest closure must have its matching photo before any version
    // of this cycle can be composed. Never accept getFotoCierre's fallback.
    const fotoUltima = fotoUltimaConsistente(db, ciclo.id, ultima);
    let fotoSeleccionada = fotoUltima;
    if (pedida !== undefined && pedida !== fotoUltima.version)
      // An explicit older version must exist; a missing one is a canonical
      // 404 and is never replaced by the latest photo.
      fotoSeleccionada = getFotoCierre(db, ciclo.id, pedida).foto;

    if (anomalia || abierta) {
      const estadoReapertura: EstadoReaperturaComponente = abierta
        ? "Abierta"
        : anomalia!.estado;
      const motivo = abierta ? "PENDIENTE_RE_CIERRE" : anomalia!.motivo;
      excluirReapertura(
        ciclo,
        estadoReapertura,
        motivo,
        pedida === undefined,
      );
      continue;
    }

    const foto = fotoSeleccionada;
    const version = foto.version;
    seleccion[ciclo.id] = version;
    incluidos += 1;
    componentes.push({
      ciclo: ciclo.id,
      versionFoto: version,
      fingerprint: foto.fingerprint,
      estado: "Incluido",
      estadoReapertura: null,
      motivo: null,
      mesFinanciado: ciclo.mes_financiado,
      ventana: { inicio: foto.ventana.inicio, fin: foto.ventana.fin },
      porDefecto: pedida === undefined,
    });
    valores.push({
      ciclo: ciclo.id,
      versionFoto: version,
      fingerprint: foto.fingerprint,
      ventana: {
        inicio: foto.ventana.inicio,
        fin: foto.ventana.fin,
        saldoInicial: foto.ventana.saldoInicial,
        estadoTemporal: foto.ventana.estadoTemporal,
      },
      estadoHechos: foto.estadoHechos,
      estadoPlan: foto.estadoPlan,
      hechos: foto.hechos,
      plan: foto.plan,
      clasificacion: foto.clasificacion,
      inversion: foto.inversion,
      auxiliares: foto.auxiliares,
      cobertura: foto.cobertura,
      noDisponible: foto.noDisponible,
    });
    const fotoCobertura = coberturaFoto(foto);
    bloques.push({
      ciclo: ciclo.id,
      versionFoto: version,
      estado: fotoCobertura.estado,
      motivos: fotoCobertura.motivos,
    });
    noDisponible.push(...noDisponibleDeFoto(ciclo.id, version, foto.noDisponible));
  }

  if (incluidos > 0) motivos.add("SIN_REGLA_ADITIVA");
  else if (motivos.size === 0) motivos.add("SIN_EVIDENCIA");

  const estado: EstadoCoberturaPeriodo =
    incluidos > 0 ? "Parcial" : "NoDisponible";

  const seleccionAplicada: SeleccionAplicadaDto = {
    regla: REGLA_COMPOSICION,
    reglaPeriodo: REGLA_PERIODO,
    porDefecto: solicitada.size === 0,
    solicitada: Object.fromEntries(
      [...solicitada.entries()].sort(([a], [b]) => a.localeCompare(b)),
    ),
    seleccion: Object.fromEntries(
      Object.entries(seleccion).sort(([a], [b]) => a.localeCompare(b)),
    ),
    porCiclo: componentes.map((componente) => ({
      ciclo: componente.ciclo,
      versionFoto: componente.versionFoto,
      porDefecto: componente.porDefecto,
      mesFinanciado: componente.mesFinanciado,
      ventana: componente.ventana,
      estadoReapertura: componente.estadoReapertura,
    })),
  };

  return {
    componentes,
    valores: {
      totalPeriodo: null,
      motivoTotal: "SIN_REGLA_ADITIVA",
      porCiclo: valores,
    },
    cobertura: {
      estado,
      motivos: [...motivos],
      totalPeriodo: null,
      bloques,
    },
    noDisponible,
    seleccion: seleccionAplicada,
  };
}

function schemaVersion(db: Database) {
  return (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    }
  ).version;
}

function siguienteVersion(
  db: Database,
  periodo: PeriodoNatural,
): string {
  const row =
    periodo.tipo === "Trimestre"
      ? (db
          .query(
            `SELECT version FROM fotos_periodo
             WHERE tipo='Trimestre' AND ejercicio=? AND trimestre=?
             ORDER BY CAST(substr(version,2) AS INTEGER) DESC LIMIT 1`,
          )
          .get(periodo.ejercicio, periodo.trimestre) as
          | { version: string }
          | null)
      : (db
          .query(
            `SELECT version FROM fotos_periodo
             WHERE tipo='Anio' AND ejercicio=?
             ORDER BY CAST(substr(version,2) AS INTEGER) DESC LIMIT 1`,
          )
          .get(periodo.ejercicio) as { version: string } | null);
  if (!row) return "A1";
  return `A${Number(row.version.slice(1)) + 1}`;
}

/**
 * Creates the only E4.11 write: a persisted period aggregate. Idempotent by
 * `periodo_attempts` (same key + same payload replays; another payload is a
 * `IDEMPOTENCY_CONFLICT`). The transaction is IMMEDIATE so version sequencing
 * and composition are computed against one coherent snapshot.
 */
export function crearFotoPeriodo(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  options: PeriodoOptions = {},
  now = Date.now(),
): FotoPeriodoDto & { replayed: boolean } {
  if (!keyPattern.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  const { periodo, seleccion } = inputDesdeCuerpo(body, now);
  const solicitada = Object.fromEntries(
    [...seleccion.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
  const requestHash = fingerprint({
    tipo: periodo.tipo,
    ejercicio: periodo.ejercicio,
    trimestre: periodo.trimestre,
    seleccion: solicitada,
  });
  const rawActor = options.actor ?? ACTOR_POR_DEFECTO;
  if (typeof rawActor !== "string")
    throw new Problem(422, "VALIDATION", "Actor inválido.");
  const actor = rawActor.trim();
  if (actor.length === 0 || actor.length > 200)
    throw new Problem(422, "VALIDATION", "Actor inválido.");

  return db
    .transaction(() => {
      const retry = db
        .query("SELECT hash,response FROM periodo_attempts WHERE key=?")
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== requestHash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya tiene otros datos.",
          );
        db.run("UPDATE periodo_attempts SET expires=? WHERE key=?", [
          now + 86400000,
          key,
        ]);
        return {
          ...(JSON.parse(retry.response) as FotoPeriodoDto),
          replayed: true,
        };
      }
      db.run("DELETE FROM periodo_attempts WHERE expires<? AND key<>?", [
        now,
        key,
      ]);

      const compuesto = componer(db, periodo, seleccion);
      const version = siguienteVersion(db, periodo);
      const creadoUtc = new Date(now).toISOString();
      const appVersion = resolveAppVersion(options.appVersion);
      const versionEsquema = schemaVersion(db);
      const identidad = {
        versionAgregado: version,
        fechaUtc: creadoUtc,
        versionApp: appVersion,
        versionEsquema,
        actor,
        motivo: null as string | null,
      };
      const fingerprintAgregado = fingerprint({
        origen: "Foto",
        tipo: periodo.tipo,
        periodo: {
          ejercicio: periodo.ejercicio,
          trimestre: periodo.trimestre,
          inicio: periodo.inicio,
          fin: periodo.fin,
        },
        seleccionAplicada: compuesto.seleccion,
        identidad,
        composicion: compuesto.componentes.map((componente) => ({
          ciclo: componente.ciclo,
          mesFinanciado: componente.mesFinanciado,
          ventana: componente.ventana,
          versionFoto: componente.versionFoto,
          fingerprint: componente.fingerprint,
          estado: componente.estado,
          motivo: componente.motivo,
        })),
        cobertura: compuesto.cobertura,
        valores: compuesto.valores,
        noDisponible: compuesto.noDisponible,
      });

      db.run(
        `INSERT INTO fotos_periodo(tipo,ejercicio,trimestre,inicio,fin,version,
          creado_utc,actor,motivo,fingerprint,app_version,schema_version,
          regla_composicion,seleccion_aplicada,cobertura,valores,no_disponible)
         VALUES(?,?,?,?,?,?,?,?,NULL,?,?,?,?,?,?,?,?)`,
        [
          periodo.tipo,
          periodo.ejercicio,
          periodo.trimestre,
          periodo.inicio,
          periodo.fin,
          version,
          creadoUtc,
          actor,
          fingerprintAgregado,
          appVersion,
          versionEsquema,
          REGLA_COMPOSICION,
          JSON.stringify(compuesto.seleccion),
          JSON.stringify(compuesto.cobertura),
          JSON.stringify(compuesto.valores),
          JSON.stringify(compuesto.noDisponible),
        ],
      );
      const id = (
        db.query("SELECT last_insert_rowid() AS id").get() as { id: number }
      ).id;
      for (const componente of compuesto.componentes)
        db.run(
          `INSERT INTO foto_periodo_componentes(periodo_id,ciclo,version_foto,
            fingerprint_foto,estado,motivo) VALUES(?,?,?,?,?,?)`,
          [
            id,
            componente.ciclo,
            componente.versionFoto,
            componente.fingerprint,
            componente.estado,
            componente.motivo,
          ],
        );

      const dto = filaADto(db, {
        id,
        tipo: periodo.tipo,
        ejercicio: periodo.ejercicio,
        trimestre: periodo.trimestre,
        inicio: periodo.inicio,
        fin: periodo.fin,
        version,
        creado_utc: creadoUtc,
        actor,
        motivo: null,
        fingerprint: fingerprintAgregado,
        app_version: appVersion,
        schema_version: versionEsquema,
        regla_composicion: REGLA_COMPOSICION,
        seleccion_aplicada: JSON.stringify(compuesto.seleccion),
        cobertura: JSON.stringify(compuesto.cobertura),
        valores: JSON.stringify(compuesto.valores),
        no_disponible: JSON.stringify(compuesto.noDisponible),
      }, true);
      db.run("INSERT INTO periodo_attempts VALUES(?,?,?,?)", [
        key,
        requestHash,
        JSON.stringify(dto),
        now + 86400000,
      ]);
      return { ...dto, replayed: false };
    })
    .immediate();
}

function parseSeleccion(value: string) {
  const parsed = JSON.parse(value) as Partial<SeleccionAplicadaDto>;
  return {
    regla: REGLA_COMPOSICION,
    reglaPeriodo: REGLA_PERIODO,
    porDefecto:
      typeof parsed.porDefecto === "boolean" ? parsed.porDefecto : true,
    solicitada:
      parsed.solicitada && typeof parsed.solicitada === "object"
        ? parsed.solicitada
        : {},
    seleccion:
      parsed.seleccion && typeof parsed.seleccion === "object"
        ? parsed.seleccion
        : {},
    porCiclo: Array.isArray(parsed.porCiclo) ? parsed.porCiclo : [],
  } as SeleccionAplicadaDto;
}

function filaADto(
  db: Database,
  row: PeriodoRow,
  porDefectoVersion: boolean,
): FotoPeriodoDto {
  const seleccionAplicada = parseSeleccion(row.seleccion_aplicada);
  const rows = db
    .query(
      `SELECT ciclo,version_foto,fingerprint_foto,estado,motivo
       FROM foto_periodo_componentes WHERE periodo_id=?`,
    )
    .all(row.id) as ComponenteRow[];
  const byCiclo = new Map(rows.map((componente) => [componente.ciclo, componente]));
  const extras = new Map(
    seleccionAplicada.porCiclo.map((item) => [item.ciclo, item]),
  );
  const ordered = [
    ...seleccionAplicada.porCiclo.map((item) => item.ciclo),
    ...rows.map((componente) => componente.ciclo),
  ].filter((ciclo, index, list) => list.indexOf(ciclo) === index);
  const composicion = ordered.flatMap((ciclo) => {
    const componente = byCiclo.get(ciclo);
    if (!componente) return [];
    const extra = extras.get(ciclo);
    return [
      {
        ciclo,
        mesFinanciado: extra?.mesFinanciado ?? "",
        ventana: extra?.ventana ?? null,
        versionFoto: componente.version_foto,
        fingerprint: componente.fingerprint_foto,
        estado: componente.estado,
        estadoReapertura: extra?.estadoReapertura ?? null,
        motivo: componente.motivo,
      },
    ];
  });

  return {
    origen: "Foto",
    id: row.id,
    tipo: row.tipo,
    periodo: {
      ejercicio: row.ejercicio,
      trimestre: row.trimestre,
      inicio: row.inicio,
      fin: row.fin,
    },
    seleccionAplicada,
    seleccionVersion: {
      version: row.version,
      porDefecto: porDefectoVersion,
      regla: REGLA_CONSULTA_VERSION,
    },
    identidad: {
      versionAgregado: row.version,
      fechaUtc: row.creado_utc,
      fingerprint: row.fingerprint,
      versionApp: row.app_version,
      versionEsquema: row.schema_version,
      actor: row.actor,
      motivo: row.motivo,
    },
    composicion,
    cobertura: JSON.parse(row.cobertura) as CoberturaPeriodoDto,
    valores: JSON.parse(row.valores) as ValoresPeriodoDto,
    noDisponible: JSON.parse(row.no_disponible) as NoDisponiblePeriodoDto[],
  };
}

function parsePeriodoQuery(params: URLSearchParams) {
  const allowed = ["tipo", "ejercicio", "trimestre", "version"];
  for (const key of params.keys())
    if (!allowed.includes(key))
      validation(
        "Parámetro de consulta no admitido.",
        key,
        "Parámetro no admitido.",
      );
  for (const key of allowed)
    if (params.getAll(key).length > 1)
      validation(
        "Parámetro de consulta repetido.",
        key,
        "Indica el parámetro una sola vez.",
      );

  const tipo = params.get("tipo");
  if (tipo !== "Trimestre" && tipo !== "Anio")
    validation(
      "Revisa el tipo de periodo.",
      "tipo",
      "Indica Trimestre o Anio.",
    );
  const rawEjercicio = params.get("ejercicio");
  if (rawEjercicio === null || !folioPattern.test(rawEjercicio))
    validation(
      "Revisa el ejercicio.",
      "ejercicio",
      "Indica un año de cuatro cifras.",
    );
  const ejercicio = Number(rawEjercicio);
  if (ejercicio < 1000 || ejercicio > 9999)
    validation(
      "Revisa el ejercicio.",
      "ejercicio",
      "Indica un año de cuatro cifras.",
    );

  let trimestre: number | null = null;
  if (tipo === "Trimestre") {
    const rawTrimestre = params.get("trimestre");
    if (rawTrimestre === null || !/^[1-4]$/.test(rawTrimestre))
      validation(
        "Revisa el trimestre.",
        "trimestre",
        "Indica un trimestre entre 1 y 4.",
      );
    trimestre = Number(rawTrimestre);
  } else if (params.has("trimestre"))
    validation(
      "Un año no lleva trimestre.",
      "trimestre",
      "Omite el trimestre para un periodo anual.",
    );

  const rawVersion = params.get("version");
  if (rawVersion !== null && !versionPattern.test(rawVersion))
    validation(
      "Revisa la versión del agregado.",
      "version",
      "Indica una versión A1, A2…",
    );

  const periodo: PeriodoNatural = {
    tipo,
    ejercicio,
    trimestre,
    ...periodoNatural(tipo, ejercicio, trimestre),
  };
  return { periodo, version: rawVersion };
}

function buscarPeriodo(
  db: Database,
  periodo: PeriodoNatural,
  version: string | null,
): PeriodoRow | null {
  const condicion =
    periodo.tipo === "Trimestre"
      ? "tipo='Trimestre' AND ejercicio=? AND trimestre=?"
      : "tipo='Anio' AND ejercicio=? AND trimestre IS NULL";
  const base = `${SELECT_PERIODO} WHERE ${condicion}`;
  const keys: (string | number)[] =
    periodo.tipo === "Trimestre"
      ? [periodo.ejercicio, periodo.trimestre as number]
      : [periodo.ejercicio];
  if (version !== null)
    return db
      .query(`${base} AND version=?`)
      .get(...keys, version) as PeriodoRow | null;
  return db
    .query(
      `${base} ORDER BY CAST(substr(version,2) AS INTEGER) DESC LIMIT 1`,
    )
    .get(...keys) as PeriodoRow | null;
}

/**
 * Reads the latest aggregate of a period (declared with
 * `seleccionVersion.porDefecto=true`) or exactly the requested version.
 * A missing version is a 404 and never falls back to the latest one.
 */
export function getFotoPeriodo(
  db: Database,
  params: URLSearchParams,
  now = Date.now(),
): FotoPeriodoDto {
  const { periodo, version } = parsePeriodoQuery(params);
  assertNotFuture(periodo, now);
  const row = buscarPeriodo(db, periodo, version);
  if (!row)
    throw new Problem(
      404,
      "NOT_FOUND",
      version === null
        ? "No hay agregados para este periodo."
        : "Versión de agregado no encontrada.",
    );
  return filaADto(db, row, version === null);
}

/** Reads one persisted aggregate by identity. Never recomputes composition. */
export function getFotoPeriodoPorId(
  db: Database,
  id: number,
): FotoPeriodoDto {
  if (!isPositiveInteger(id))
    validation("Revisa el identificador.", "id", "Indica un id positivo.");
  const row = db
    .query(`${SELECT_PERIODO} WHERE id=?`)
    .get(id) as PeriodoRow | null;
  if (!row)
    throw new Problem(404, "NOT_FOUND", "Agregado de periodo no encontrado.");
  return filaADto(db, row, true);
}
