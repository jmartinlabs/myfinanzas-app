import {
  anticipoImpact,
  validateAnticipo,
  anticipoMetadata,
  protectAnticipoChange,
  storeAnticipo,
  type Attribution,
} from "./anticipos";
import { getDebt } from "./deudas";
import {
  validateReference,
  validateSharedReferenceOperation,
  getReference,
  referenceMapping,
  operationalReferenceTypes,
} from "./reference-rules";
import { vehicleFicha } from "./vehicle-rules";
import {
  aportacionMetadata,
  storeAportacion,
  validateAportacion,
  type ProcedenciaAportacion,
} from "./aportaciones";
import type { Database } from "bun:sqlite";
import { getSaldo, money, decimal, Problem } from "./saldos";
import { getClassification } from "./clasificacion";
import {
  civil,
  cycleContext,
  cycleMaster,
  financialReference,
  type Cycle,
} from "./ciclos";
import { revisionComidaSource } from "./revision-comida-ledger";
import { investmentSource } from "./investment-ledger";
import {
  ledgerRows,
  financeRevision,
  fingerprint,
  positionCents,
  type LedgerRow,
} from "./movement-ledger";
import { cashAt, cents as cashDecimal } from "./investment-engine";
import {
  applyComidaDevolucion,
  applyComidaMetadata,
  comidaDevolucion,
  comidaMetadata,
  revalidateDevolucionPropia,
  revalidateDevolucionesCompra,
} from "./comida";
export const incomeSubtypes = ["Nómina", "Bonus", "Intereses", "Promoción"];
export type MovementProtection = (
  action: string,
  before: LedgerRow | null,
  after: unknown,
) => { blocked: boolean; reason?: string };
type Candidate = {
  anticipo: Attribution | null;
  compartido: {
    participante: string;
    evidencia: string;
    procedencia: ProcedenciaAportacion;
  } | null;
  fecha: string;
  tipo:
    | "Ingreso"
    | "Gasto"
    | "Transferencia"
    | "Amortización deuda"
    | "Devolución de gasto";
  capital: string | null;
  intereses: string | null;
  referencia: string | null;
  importe: string;
  origen: string;
  destino: string;
  subtipo: string | null;
  partida: string | null;
  concepto: string;
  nota: string;
};
export function spanishToday(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const value = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
const inputs = [
  "anticipo",
  "compartido",
  "capital",
  "intereses",
  "fecha",
  "tipo",
  "importe",
  "saldo",
  "origen",
  "destino",
  "referencia",
  "subtipo",
  "partida",
  "concepto",
  "nota",
];
const extras = ["comida", "devolucion"] as const;
function text(value: unknown, name: string, max = 2000) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      [name]: `Texto válido, máximo ${max} caracteres.`,
    });
  return value;
}
function validated(
  db: Database,
  body: Record<string, unknown>,
  old: LedgerRow | null,
  now: number,
): Candidate {
  for (const key of Object.keys(body))
    if (!inputs.includes(key) && !extras.includes(key as (typeof extras)[number]))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${key}.`, {
        [key]: "Campo no editable.",
      });
  const errors: Record<string, string> = {};
  const oldAportacion = old ? aportacionMetadata(db, old.id) : null;
  let fecha = "",
    cents: bigint | null = null;
  try {
    fecha = civil(body.fecha);
    if (fecha > spanishToday(now))
      errors.fecha =
        "No se admiten fechas futuras. Fecha máxima: " +
        spanishToday(now) +
        " (España).";
  } catch {
    errors.fecha = "Indica una fecha civil válida.";
  }
  try {
    if (typeof body.importe !== "string" || !body.importe) throw Error();
    cents = money(body.importe);
    if (cents === null || cents <= 0n) throw Error();
  } catch {
    errors.importe =
      "Indica un importe EUR exacto mayor que cero, hasta dos decimales.";
  }
  if (
    ![
      "Ingreso",
      "Gasto",
      "Transferencia",
      "Amortización deuda",
      "Devolución de gasto",
    ].includes(body.tipo as string)
  )
    errors.tipo = "Selecciona un Tipo válido.";
  if (body.tipo === "Transferencia") {
    if (typeof body.origen !== "string" || !body.origen)
      errors.origen = "Selecciona un Origen existente.";
    if (typeof body.destino !== "string" || !body.destino)
      errors.destino = "Selecciona un Saldo interno elegible.";
    if (body.destino === "S000")
      errors.destino = "El Destino debe ser un Saldo interno.";
    if (body.origen === "S000" && !old && body.compartido == null)
      errors.origen =
        "Una Transferencia desde Exterior exige Referencia CAT013 y bloque compartido.";
    if (body.origen === "S000" && old && !oldAportacion)
      errors.origen =
        "Un Movimiento existente no se convierte en aportación por esta vía; usa Aportaciones históricas para revisar un hecho elegible.";
    if (body.origen === body.destino)
      errors.destino = "Origen y Destino deben ser distintos.";
    for (const field of ["saldo", "subtipo", "partida"])
      if (
        body[field] !== undefined &&
        body[field] !== null &&
        body[field] !== ""
      )
        errors[field] = "No aplicable a Transferencia.";
  } else {
    if (typeof body.saldo !== "string" || !body.saldo || body.saldo === "S000")
      errors.saldo = "Selecciona un Saldo ordinario existente.";
    for (const side of ["origen", "destino"])
      if (body[side] !== undefined && body[side] !== null && body[side] !== "")
        errors[side] = "Dirección derivada del Tipo y Saldo.";
  }
  if (body.tipo === "Ingreso") {
    if (!incomeSubtypes.includes(body.subtipo as string))
      errors.subtipo = "Selecciona un Subtipo válido.";
    if (
      body.partida !== undefined &&
      body.partida !== null &&
      body.partida !== ""
    )
      errors.partida = "Ingreso no admite Partida.";
  } else if (body.tipo === "Devolución de gasto") {
    if (
      body.subtipo !== undefined &&
      body.subtipo !== null &&
      body.subtipo !== ""
    )
      errors.subtipo = "Devolución de gasto no admite Subtipo de Ingreso.";
    if (
      body.referencia !== undefined &&
      body.referencia !== null &&
      body.referencia !== ""
    )
      errors.referencia =
        "La Devolución de gasto no admite Referencia en este contrato.";
    if (
      body.capital !== undefined ||
      body.intereses !== undefined
    )
      errors.capital = "No aplicable a Devolución de gasto.";
  } else if (body.tipo === "Gasto" || body.tipo === "Amortización deuda") {
    if (typeof body.partida !== "string" || !body.partida)
      errors.partida = "Selecciona una Partida.";
    if (
      body.subtipo !== undefined &&
      body.subtipo !== null &&
      body.subtipo !== ""
    )
      errors.subtipo = "Gasto no admite Subtipo de Ingreso.";
  }
  if (Object.keys(errors).length)
    throw new Problem(
      422,
      "VALIDATION",
      "Revisa los campos indicados.",
      errors,
    );
  const tipo = body.tipo as Candidate["tipo"];
  const eligible = (
    id: string,
    field: string,
    previous: string | undefined,
    strict = false,
  ) => {
    const s = getSaldo(db, id);
    if (
      s.id === "S000" ||
      s.tipo === "Exterior" ||
      (s.estado !== "Activa" && (strict || previous !== id)) ||
      s.control === "Manual" ||
      s.control === "Exterior"
    )
      throw new Problem(
        422,
        "VALIDATION",
        "Saldo no disponible para esta selección.",
        { [field]: "Selecciona un Saldo activo y operativo." },
      );
    return s;
  };
  const d5 =
    tipo === "Transferencia" &&
    body.origen === "S000" &&
    (body.compartido != null || oldAportacion !== null);
  const saldo =
    tipo === "Transferencia" && body.origen === "S000"
      ? getSaldo(db, "S000")
      : eligible(
          (tipo === "Transferencia" ? body.origen : body.saldo) as string,
          tipo === "Transferencia" ? "origen" : "saldo",
          old?.tipo === tipo
            ? tipo === "Ingreso"
              ? old.destino
              : old.origen
            : undefined,
        );
  const target =
    tipo === "Transferencia"
      ? eligible(
          body.destino as string,
          "destino",
          old?.tipo === tipo ? old.destino : undefined,
          d5,
        )
      : null;
  let category: string | null = null,
    required = false;
  let capital: string | null = null,
    intereses: string | null = null;
  const outgoing = tipo === "Gasto" || tipo === "Amortización deuda";
  if (outgoing) {
    if (saldo.permiteSalidaExterior !== true)
      throw new Problem(
        422,
        "EXTERIOR_PERMISSION",
        "El Saldo no tiene salida a Exterior expresamente permitida.",
        { saldo: "Revisa Permite salida a Exterior en el Saldo." },
      );
    const p = getClassification(db, "partidas", body.partida as string),
      sub = getClassification(db, "subcategorias", p.padre!),
      cat = getClassification(db, "categorias", sub.padre!);
    if (
      (!old || old.partida !== p.id) &&
      [p, sub, cat].some((v) => v.estado !== "Activa")
    )
      throw new Problem(
        422,
        "INACTIVE_CLASSIFICATION",
        "La nueva clasificación debe estar activa.",
        { partida: "Selecciona una Partida y ancestros activos." },
      );
    if (p.deuda) {
      const debt = getDebt(db, p.deuda);
      if (debt.estado !== "Activa" && (!old || old.partida !== p.id))
        throw new Problem(
          422,
          "INACTIVE_DEBT",
          "No se admiten nuevas operaciones ligadas a Deuda inactiva.",
        );
      if (tipo === "Amortización deuda") {
        capital = decimal(String(cents));
        intereses = "0.00";
        for (const [field, value] of [
          ["capital", capital],
          ["intereses", intereses],
        ] as const)
          if (body[field] != null && body[field] !== value)
            throw new Problem(
              422,
              "VALIDATION",
              "Desglose extraordinario derivado; no admite valores contradictorios.",
              { [field]: "Valor derivado del importe." },
            );
      } else {
        let c: bigint | null = null,
          i: bigint | null = null;
        try {
          if (
            typeof body.capital !== "string" ||
            typeof body.intereses !== "string"
          )
            throw Error();
          c = money(body.capital);
          i = money(body.intereses);
        } catch {}
        if (c === null || i === null || c <= 0n || i < 0n || c + i !== cents)
          throw new Problem(
            422,
            "VALIDATION",
            "Capital positivo e intereses no negativos explícitos deben sumar el importe exacto.",
            {
              capital: "Revisa el desglose exacto.",
              intereses: "No se completa automáticamente.",
            },
          );
        capital = decimal(c.toString());
        intereses = decimal(i.toString());
      }
    } else if (tipo === "Amortización deuda")
      throw new Problem(
        422,
        "DEBT_REQUIRED",
        "La amortización requiere una Partida ligada a Deuda.",
      );
    category = cat.id;
    required = cat.referencia === true;
  }
  if (capital === null && (body.capital != null || body.intereses != null))
    throw new Problem(
      422,
      "VALIDATION",
      "Este hecho no admite desglose de Deuda.",
    );
  if (tipo === "Devolución de gasto" && body.partida != null && body.partida !== "") {
    if (typeof body.partida !== "string")
      throw new Problem(422, "VALIDATION", "Partida no válida.", {
        partida: "Selecciona una Partida existente.",
      });
    const p = getClassification(db, "partidas", body.partida),
      sub = getClassification(db, "subcategorias", p.padre!),
      cat = getClassification(db, "categorias", sub.padre!);
    if ([p, sub, cat].some((v) => v.estado !== "Activa"))
      throw new Problem(
        422,
        "INACTIVE_CLASSIFICATION",
        "La Partida acreditada debe estar activa.",
        { partida: "Selecciona una Partida y ancestros activos." },
      );
  }
  const referencia = validateReference(
    db,
    body.referencia,
    category,
    required,
    old?.referencia ?? null,
  );
  validateSharedReferenceOperation(db, referencia, tipo, category);
  const next = {
    tipo,
    referencia,
    origen:
      tipo === "Ingreso" || tipo === "Devolución de gasto" ? "S000" : saldo.id,
    destino: outgoing ? "S000" : (target?.id ?? saldo.id),
  };
  const compartido = validateAportacion(
    db,
    next,
    body.compartido,
    old?.id,
  );
  const anticipo = validateAnticipo(
    db,
    {
      tipo,
      referencia,
      origen:
      tipo === "Ingreso" || tipo === "Devolución de gasto" ? "S000" : saldo.id,
      destino: outgoing ? "S000" : (target?.id ?? saldo.id),
    },
    body.anticipo,
    old?.id,
  );
  return {
    anticipo,
    compartido,
    fecha,
    tipo,
    importe: decimal(String(cents))!,
    origen:
      tipo === "Ingreso" || tipo === "Devolución de gasto" ? "S000" : saldo.id,
    referencia,
    capital,
    intereses,
    destino: outgoing ? "S000" : (target?.id ?? saldo.id),
    subtipo: tipo === "Ingreso" ? (body.subtipo as string) : null,
    partida: outgoing
      ? (body.partida as string)
      : tipo === "Devolución de gasto" &&
          typeof body.partida === "string" &&
          body.partida
        ? body.partida
        : null,
    concepto: text(body.concepto ?? "", "concepto"),
    nota: text(body.nota ?? "", "nota", 4000),
  };
}
function auditValue(row: LedgerRow) {
  return {
    ...row,
    importe: decimal(row.importe),
    capital: decimal(row.capital),
    intereses: decimal(row.intereses),
  };
}
function find(db: Database, id: string) {
  const r = ledgerRows(db).find((r) => r.id === id);
  if (!r) throw new Problem(404, "NOT_FOUND", "Movimiento no encontrado.");
  return r;
}
function decorate(db: Database, r: LedgerRow, cycles: Cycle[]) {
  const related = (id: string) =>
    db.query("SELECT id,nombre,estado FROM saldos WHERE id=?").get(id) as {
      id: string;
      nombre: string;
      estado: string;
    };
  const p = r.partida ? getClassification(db, "partidas", r.partida) : null;
  return {
    ...auditValue(r),
    anulado: r.anulado === 1,
    estado: r.anulado ? "Anulado" : "Vigente",
    origen: related(r.origen),
    destino: related(r.destino),
    partida: p,
    deuda: p?.deuda ? getDebt(db, p.deuda) : null,
    referencia: r.referencia ? getReference(db, r.referencia) : null,
    integridad:
      r.referencia &&
      r.tipo === "Gasto" &&
      !r.anulado &&
      getReference(db, r.referencia).tipo === "Vehículo" &&
      !vehicleFicha(db, r.referencia)
        ? {
            estado: "Revisar" as const,
            motivos: ["GASTO_SIN_FICHA"],
            mensaje: "El Gasto usa una Referencia Vehículo sin ficha.",
          }
        : { estado: "OK" as const, motivos: [] as string[], mensaje: "Sin incidencias." },
    anticipo: anticipoMetadata(db, r.id),
    compartido: aportacionMetadata(db, r.id),
    comida:
      r.tipo === "Gasto" || r.tipo === "Devolución de gasto"
        ? comidaMetadata(db, r.id)
        : null,
    devolucion:
      r.tipo === "Devolución de gasto" ? comidaDevolucion(db, r.id) : null,
    ciclo:
      cycles.find(
        (c) => c.inicio <= r.fecha && (c.fin === null || r.fecha <= c.fin),
      ) ?? null,
  };
}
export function getMovement(db: Database, id: string) {
  return db.transaction(() => ({
    movimiento: decorate(db, find(db, id), cycleMaster(db)),
    auditoria: db
      .query(
        "SELECT revision,accion,motivo,instante,actor,anterior,posterior FROM movement_audit WHERE id=? ORDER BY revision",
      )
      .all(id)
      .map((v) => {
        const a = v as {
          revision: number;
          accion: string;
          motivo: string | null;
          instante: string;
          actor: string;
          anterior: string | null;
          posterior: string;
        };
        return {
          ...a,
          anterior: a.anterior ? JSON.parse(a.anterior as string) : null,
          posterior: JSON.parse(a.posterior as string),
        };
      }),
    contexto: cycleContext(db),
  }))();
}
export function movementOptions(db: Database, now = Date.now()) {
  return db.transaction(() => ({
    deudas: (
      db.query("SELECT id FROM deudas ORDER BY length(id),id").all() as {
        id: string;
      }[]
    ).map((r) => getDebt(db, r.id)),
    referencias: (
      db.query("SELECT id FROM referencias ORDER BY length(id),id").all() as {
        id: string;
      }[]
    ).map((r) => getReference(db, r.id)),
    hoy: spanishToday(now),
    saldos: (
      db.query("SELECT id FROM saldos WHERE id!='S000' ORDER BY id").all() as {
        id: string;
      }[]
    ).map((r) => getSaldo(db, r.id)),
    partidas: (
      db.query("SELECT id FROM partidas ORDER BY id").all() as { id: string }[]
    ).map((r) => {
      const p = getClassification(db, "partidas", r.id),
        cat = getClassification(db, "categorias", p.categoria!.id),
        sub = getClassification(db, "subcategorias", p.subcategoria!.id);
      return {
        ...p,
        referenciaObligatoria: cat.referencia,
        tipoReferencia: referenceMapping[cat.id] ?? null,
        referenciaDisponible:
          cat.referencia !== true ||
          operationalReferenceTypes.includes(
            referenceMapping[cat.id] as "Viaje" | "Evento",
          ),
        seleccionable: [p, sub, cat].every((x) => x.estado === "Activa"),
      };
    }),
    categorias: db.query("SELECT id,nombre FROM categorias ORDER BY id").all(),
    subcategorias: db
      .query("SELECT id,nombre,padre FROM subcategorias ORDER BY id")
      .all(),
    ciclos: cycleMaster(db),
    contexto: cycleContext(db),
  }))();
}
export function listMovements(db: Database, params = new URLSearchParams()) {
  return db.transaction(() => {
    const page = Number(params.get("page") ?? 1),
      state = params.get("estado") ?? "Vigente",
      tipo = params.get("tipo") ?? "";
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !["", "Vigente", "Anulado"].includes(state) ||
      ![
        "",
        "Ingreso",
        "Gasto",
        "Transferencia",
        "Amortización deuda",
        "Devolución de gasto",
      ].includes(tipo)
    )
      throw new Problem(422, "VALIDATION", "Filtro o página inválidos.");
    const from = params.get("desde"),
      to = params.get("hasta");
    if (from) civil(from);
    if (to) civil(to);
    if (from && to && from > to)
      throw new Problem(
        422,
        "VALIDATION",
        "El intervalo de fechas es inválido.",
      );
    const cycles = cycleMaster(db),
      query = (params.get("q") ?? "").toLocaleLowerCase("es");
    const rows = ledgerRows(db)
      .map((r) => decorate(db, r, cycles))
      .filter(
        (r) =>
          (!state || r.estado === state) &&
          (!tipo || r.tipo === tipo) &&
          (!from || r.fecha >= from) &&
          (!to || r.fecha <= to) &&
          (!params.get("saldo") ||
            [r.origen.id, r.destino.id].includes(params.get("saldo")!)) &&
          (!params.get("referencia") ||
            r.referencia?.id === params.get("referencia")) &&
          (!params.get("origen") || r.origen.id === params.get("origen")) &&
          (!params.get("destino") || r.destino.id === params.get("destino")) &&
          (!params.get("deuda") || r.deuda?.id === params.get("deuda")) &&
          (!params.get("partida") || r.partida?.id === params.get("partida")) &&
          (!params.get("categoria") ||
            r.partida?.categoria?.id === params.get("categoria")) &&
          (!params.get("subcategoria") ||
            r.partida?.subcategoria?.id === params.get("subcategoria")) &&
          (!params.get("ciclo") ||
            (params.get("ciclo") === "sin_ciclo"
              ? r.ciclo === null
              : r.ciclo?.id === params.get("ciclo"))) &&
          `${r.id} ${r.concepto} ${r.nota}`
            .toLocaleLowerCase("es")
            .includes(query),
      )
      .sort(
        (a, b) =>
          b.fecha.localeCompare(a.fecha) ||
          b.id.length - a.id.length ||
          b.id.localeCompare(a.id),
      );
    return {
      movimientos: rows.slice((page - 1) * 100, page * 100),
      total: rows.length,
      page,
      contexto: cycleContext(db),
    };
  })();
}
function payload(body: Record<string, unknown>) {
  return Object.fromEntries(
    inputs.filter((k) => k in body).map((k) => [k, body[k]]),
  );
}
function protect(
  guard: MovementProtection | undefined,
  action: string,
  old: LedgerRow | null,
  next: unknown,
) {
  const protection = guard?.(action, old, next);
  if (protection?.blocked)
    throw new Problem(
      409,
      "HISTORY_LOCKED",
      protection.reason ?? "Operación afectada por cierre protegido.",
    );
}
function plan(
  db: Database,
  body: Record<string, unknown>,
  id: string | null,
  annul: boolean,
  now: number,
  guard?: MovementProtection,
) {
  const permitted = [
    ...inputs,
    "revision",
    "motivo",
    "fingerprint",
    "contextRevision",
    "aceptarCoincidencia",
    ...extras,
  ];
  for (const name of Object.keys(body))
    if (!permitted.includes(name) || (annul && inputs.includes(name)))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${name}.`);
  const old = id ? find(db, id) : null;
  if (annul || old)
    for (const name of extras)
      if (name in body)
        throw new Problem(
          422,
          "VALIDATION",
          "Los metadatos de Comida se rectifican por su recurso dedicado.",
          { [name]: "No se editan en el alta/rectificación económica." },
        );
  for (const name of extras)
    if (name in body && (!body[name] || typeof body[name] !== "object" || Array.isArray(body[name])))
      throw new Problem(422, "VALIDATION", `Bloque ${name} inválido.`, {
        [name]: "Objeto de metadatos.",
      });
  if (old && (body.revision !== old.revision || old.anulado))
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      "El Movimiento ha cambiado o está anulado. Revisa su ficha.",
    );
  const contexto = cycleContext(db);
  if (contexto.referencia.estado === "error")
    throw new Problem(
      409,
      "REFERENCE_ERROR",
      "Una fuente instalada ha fallado. No puede confirmarse el impacto.",
    );
  const next = annul ? null : validated(db, payload(body), old, now);
  if (old && next && old.tipo !== next.tipo) {
    if (
      old.tipo === "Gasto" &&
      db
        .query(
          "SELECT 1 FROM movimiento_devolucion WHERE compra=? LIMIT 1",
        )
        .get(old.id)
    )
      throw new Problem(
        422,
        "DEVOLUTION_LINKED",
        "La compra tiene devoluciones verificadas. Rectifica o desancla esos vínculos antes de cambiar el Tipo; no se reasigna automáticamente.",
        { tipo: "Cambia primero los vínculos afectados." },
      );
    if (
      old.tipo === "Devolución de gasto" &&
      db
        .query("SELECT 1 FROM movimiento_devolucion WHERE movimiento=? LIMIT 1")
        .get(old.id)
    )
      throw new Problem(
        422,
        "ATTRIBUTION_EXISTS",
        "La devolución tiene atribución registrada. No puede retipificarse sin revisar su vínculo.",
        { tipo: "Conserva el Tipo Devolución de gasto." },
      );
  }
  protectAnticipoChange(db, old, next, next?.anticipo ?? null);
  if (old) {
    const motive = text(body.motivo, "motivo");
    if (!motive.trim())
      throw new Problem(
        422,
        "VALIDATION",
        "Indica un motivo de rectificación o anulación.",
        { motivo: "Motivo obligatorio." },
      );
  } else if ("revision" in body || "motivo" in body)
    throw new Problem(
      422,
      "VALIDATION",
      "El alta no admite revisión o motivo de rectificación.",
    );
  const action = annul ? "anulación" : old ? "rectificación" : "alta";
  protect(guard, action, old, next);
  const all = ledgerRows(db),
    cycles = cycleMaster(db),
    duplicates = next
      ? all
          .filter(
            (r) =>
              !r.anulado &&
              r.id !== id &&
              r.fecha === next.fecha &&
              r.tipo === next.tipo &&
              r.origen === next.origen &&
              r.destino === next.destino &&
              decimal(r.importe) === next.importe &&
              r.subtipo === next.subtipo &&
              r.partida === next.partida &&
              (r.referencia ?? null) === next.referencia,
          )
          .map((r) => ({
            id: r.id,
            fecha: r.fecha,
            tipo: r.tipo,
            importe: decimal(r.importe),
            concepto: r.concepto,
            origen: r.origen,
            destino: r.destino,
            subtipo: r.subtipo,
            partida: r.partida,
          }))
      : [];
  const ids = [
    ...new Set(
      [old?.origen, old?.destino, next?.origen, next?.destino].filter(
        (v): v is string => !!v && v !== "S000",
      ),
    ),
  ];
  const saldos = ids.map((id) => {
    const s = getSaldo(db, id);
    let after: string | null = null;
    if (s.control === "Movimientos") {
      let n = BigInt(
        positionCents(db, id, money(s.saldoApertura)?.toString() ?? null),
      );
      if (old && !old.anulado && (old.origen === id || old.destino === id))
        n -= (old.destino === id ? 1n : -1n) * BigInt(old.importe);
      if (next && (next.origen === id || next.destino === id))
        n += (next.destino === id ? 1n : -1n) * money(next.importe)!;
      after = decimal(n.toString());
    } else if (s.tipo === "Efectivo" && s.control === "Inversiones") {
      let n = BigInt(cashAt(db, id).disponible);
      if (old && !old.anulado && (old.origen === id || old.destino === id))
        n -= (old.destino === id ? 1n : -1n) * BigInt(old.importe);
      if (next && (next.origen === id || next.destino === id))
        n += (next.destino === id ? 1n : -1n) * money(next.importe)!;
      after = cashDecimal(n);
    }
    return {
      id,
      nombre: s.nombre,
      control: s.control,
      antes: s.posicion.importe,
      despues: after,
      motivo:
        s.control === "Movimientos"
          ? "Motor Movimientos"
          : s.tipo === "Efectivo" && s.control === "Inversiones"
            ? "Motor de efectivo de inversión"
            : s.control === "Inversiones"
              ? "Valoración de inversión no disponible hasta E4.3"
              : "Posición no calculable por este motor",
    };
  });
  const debtIds = [
    ...new Set(
      [old?.partida, next?.partida]
        .filter((p): p is string => !!p)
        .map((p) => getClassification(db, "partidas", p).deuda)
        .filter((d): d is string => !!d),
    ),
  ];
  const deudas = debtIds.map((debtId) => {
    const debt = getDebt(db, debtId);
    let after =
      debt.capitalPendiente === null ? null : money(debt.capitalPendiente)!;
    const applicable = (r: {
      fecha: string;
      partida: string | null;
      capital: string | null;
    }) =>
      r.partida &&
      getClassification(db, "partidas", r.partida).deuda === debtId &&
      debt.inicioControl !== null &&
      r.fecha >= debt.inicioControl;
    if (next && applicable(next) && after === null)
      throw new Problem(
        409,
        "DEBT_UNVERIFIABLE",
        "Capital no calculable: no existe apertura verificable.",
      );
    if (after !== null) {
      if (old && !old.anulado && applicable(old))
        after += BigInt(old.capital ?? "0");
      if (next && applicable(next)) after -= money(next.capital)!;
      if (
        after < 0n &&
        ((old && applicable(old)) || (next && applicable(next)))
      )
        throw new Problem(
          422,
          "DEBT_EXCESS",
          `La operación dejaría capital negativo en ${debtId}; exceso ${decimal((-after).toString())} EUR.`,
          { capital: "Reduce el capital o revisa los hechos vinculados." },
        );
    }
    return {
      id: debtId,
      nombre: debt.nombre,
      antes: debt.capitalPendiente,
      despues: after === null ? null : decimal(after.toString()),
    };
  });
  const dates = all
    .filter((r) => !r.anulado && r.id !== id)
    .map((r) => r.fecha);
  if (next) dates.push(next.fecha);
  const comidaSource = revisionComidaSource(db);
  const temporalAfter = financialReference([
    {
      source: "Movimientos",
      state: "disponible",
      maxDate: dates.sort().at(-1) ?? null,
    },
    comidaSource,
    investmentSource(db),
  ]);
  return {
    contextRevision: financeRevision(db),
    accion: action,
    antes: old ? decorate(db, old, cycles) : null,
    despues: next,
    duplicados: duplicates,
    fingerprint: fingerprint([
      action,
      id,
      old?.revision,
      next,
      body.comida ?? null,
      body.devolucion ?? null,
      annul,
      financeRevision(db),
      {
        antes: {
          fecha: contexto.referencia.fecha,
          estado: contexto.referencia.estado,
        },
        despues: {
          fecha: temporalAfter.fecha,
          estado: temporalAfter.estado,
        },
      },
    ]),
    impacto: {
      anticipo: anticipoImpact(db, next),
      nomina:
        id &&
        db
          .query(
            "SELECT name FROM sqlite_master WHERE name='payroll_allocations'",
          )
          .get()
          ? db
              .query(
                "SELECT paga,importe,evidencia FROM payroll_allocations WHERE movimiento=?",
              )
              .all(id)
          : [],
      deudas,
      gastoAntes:
        old?.tipo === "Gasto" && !old.anulado ? decimal(old.importe) : "0.00",
      gastoDespues: next?.tipo === "Gasto" ? next.importe : "0.00",
      saldos,
      cicloAntes: old
        ? (cycles.find(
            (c) =>
              c.inicio <= old.fecha && (c.fin === null || old.fecha <= c.fin),
          ) ?? null)
        : null,
      cicloDespues: next
        ? (cycles.find(
            (c) =>
              c.inicio <= next.fecha && (c.fin === null || next.fecha <= c.fin),
          ) ?? null)
        : null,
      referenciaAntes: contexto.referencia.fecha,
      referenciaDespues: temporalAfter.fecha,
      cobertura:
        "Movimientos comprobado; posición Control Movimientos y contexto temporal derivados.",
      pendientes: [
        "Cierres",
        "Presupuestos",
        "Comida",
        "Valoración de inversión E4.3",
      ],
    },
    hoy: spanishToday(now),
  };
}
export function previewMovement(
  db: Database,
  body: Record<string, unknown>,
  id: string | null = null,
  annul = false,
  now = Date.now(),
  guard?: MovementProtection,
) {
  return db
    .transaction(() => plan(db, body, id, annul, now, guard))
    .immediate();
}
export function writeMovement(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  id: string | null = null,
  annul = false,
  now = Date.now(),
  guard?: MovementProtection,
) {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  const requestHash = fingerprint([
    id,
    annul,
    Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
  ]);
  return db
    .transaction(() => {
      db.run("DELETE FROM movement_attempts WHERE expires<?", [now]);
      const retry = db
        .query("SELECT hash,response FROM movement_attempts WHERE key=?")
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== requestHash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as ReturnType<typeof getMovement>;
      }
      if (
        body.contextRevision !== undefined &&
        body.contextRevision !== financeRevision(db)
      )
        throw new Problem(
          409,
          "IMPACT_CHANGED",
          "El contexto ha cambiado. Revisa otra vista previa; tu borrador se conserva.",
        );
      const p = plan(db, body, id, annul, now, guard);
      if (body.fingerprint !== p.fingerprint)
        throw new Problem(
          409,
          "IMPACT_CHANGED",
          "El contexto ha cambiado. Revisa otra vista previa; tu borrador se conserva.",
        );
      if (p.duplicados.length && body.aceptarCoincidencia !== true)
        throw new Problem(
          409,
          "DUPLICATE_REVIEW",
          "Revisa las coincidencias y confirma si es otro hecho económico real.",
        );
      const old = id ? find(db, id) : null,
        time = new Date(now).toISOString();
      if (!id) {
        const n = db
          .query(
            "UPDATE counters SET next=next+1 WHERE name='movimientos' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
          )
          .get() as { n: string } | null;
        if (!n)
          throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
        id = n.n;
      }
      const v = p.despues;
      if (annul)
        db.run(
          "UPDATE movimientos SET anulado=1,revision=revision+1,actualizado=? WHERE id=?",
          [time, id],
        );
      else if (old)
        db.run(
          "UPDATE movimientos SET fecha=?,tipo=?,importe=?,origen=?,destino=?,subtipo=?,partida=?,referencia=?,concepto=?,nota=?,capital=?,intereses=?,revision=revision+1,actualizado=? WHERE id=?",
          [
            v!.fecha,
            v!.tipo,
            money(v!.importe)!,
            v!.origen,
            v!.destino,
            v!.subtipo,
            v!.partida,
            v!.referencia,
            v!.concepto,
            v!.nota,
            money(v!.capital),
            money(v!.intereses),
            time,
            id,
          ],
        );
      else
        db.run(
          "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,referencia,concepto,nota,capital,intereses,revision,creado,actualizado) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)",
          [
            id,
            v!.fecha,
            v!.tipo,
            money(v!.importe)!,
            v!.origen,
            v!.destino,
            v!.subtipo,
            v!.partida,
            v!.referencia,
            v!.concepto,
            v!.nota,
            money(v!.capital),
            money(v!.intereses),
            time,
            time,
          ],
        );
      const stored = find(db, id);
      if (v && body.comida !== undefined) {
        if (v.tipo !== "Gasto" && v.tipo !== "Devolución de gasto")
          throw new Problem(
            422,
            "VALIDATION",
            "Los metadatos de Comida solo aplican a una compra o devolución.",
          );
        applyComidaMetadata(
          db,
          id,
          stored,
          body.comida as Record<string, unknown>,
          now,
        );
      }
      if (v && body.devolucion !== undefined) {
        if (v.tipo !== "Devolución de gasto")
          throw new Problem(
            422,
            "VALIDATION",
            "La atribución solo aplica a una Devolución de gasto.",
          );
        applyComidaDevolucion(
          db,
          id,
          stored,
          body.devolucion as Record<string, unknown>,
          now,
        );
      }
      if (old?.tipo === "Gasto") revalidateDevolucionesCompra(db, id, now);
      if (stored.tipo === "Gasto") revalidateDevolucionesCompra(db, id, now);
      if (stored.tipo === "Devolución de gasto")
        revalidateDevolucionPropia(db, id, now);
      storeAnticipo(db, id, v?.anticipo ?? null, now);
      storeAportacion(
        db,
        id,
        v?.compartido ?? null,
        now,
        old && typeof body.motivo === "string" ? body.motivo.trim() : null,
      );
      const after = find(db, id);
      db.run(
        "INSERT INTO movement_audit VALUES(?,?,?,?,?,'usuario-unico',?,?)",
        [
          id,
          after.revision,
          p.accion,
          old ? (body.motivo as string).trim() : null,
          time,
          old ? JSON.stringify(auditValue(old)) : null,
          JSON.stringify(auditValue(after)),
        ],
      );
      db.run(
        "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,?,?,?,?,?,'usuario-unico',?)",
        [
          "movimiento:" + id,
          p.accion,
          after.revision,
          JSON.stringify(annul ? ["anulado"] : inputs),
          time,
          old?.revision ?? 0,
          old ? (body.motivo as string).trim() : null,
        ],
      );
      const response = getMovement(db, id);
      db.run("INSERT INTO movement_attempts VALUES(?,?,?,?)", [
        key,
        requestHash,
        JSON.stringify(response),
        now + 86400000,
      ]);
      return response;
    })
    .immediate();
}
