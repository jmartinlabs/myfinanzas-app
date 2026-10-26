import type { Database } from "bun:sqlite";
import { Problem } from "./saldos";
import { fingerprint } from "./movement-ledger";

export const vehicleType = "Vehículo" as const;
export type Vehicle = {
  referencia: string;
  matricula: string | null;
  proximaITV: string | null;
  cita: string | null;
  revision: number;
  creado: string;
  actualizado: string;
};
type VehicleRow = {
  referencia: string;
  matricula: string | null;
  proxima_itv: string | null;
  fecha_cita: string | null;
  revision: number;
  creado: string;
  actualizado: string;
};
export type VehicleChanges = {
  matricula?: string | null;
  proximaITV?: string | null;
  cita?: string | null;
};
export type VehicleCandidate = {
  referencia: string;
  nombre: string;
  matricula: string | null;
  estado: string;
};
export type DuplicateDimension = {
  operation: "alta" | "renombrado" | "matrícula" | "conversión";
  value: string;
  candidates: VehicleCandidate[];
  hash: string;
};
export type DuplicateSet = {
  reference: string | null;
  revision: number;
  fichaRevision: number;
  name: DuplicateDimension | null;
  registration: DuplicateDimension | null;
};

const date = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v + "T00:00:00Z")) &&
  new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;

export const normalizeVehicleKey = (v: string) =>
  v.trim().toLocaleLowerCase("es");

export function vehicleDto(row: VehicleRow): Vehicle {
  return {
    referencia: row.referencia,
    matricula: row.matricula,
    proximaITV: row.proxima_itv,
    cita: row.fecha_cita,
    revision: row.revision,
    creado: row.creado,
    actualizado: row.actualizado,
  };
}

export function vehicleFicha(db: Database, referencia: string): Vehicle | null {
  const row = db
    .query("SELECT * FROM fichas_vehiculo WHERE referencia=?")
    .get(referencia) as VehicleRow | null;
  return row ? vehicleDto(row) : null;
}

export function vehicleFichas(db: Database): Vehicle[] {
  return (
    db
      .query("SELECT * FROM fichas_vehiculo ORDER BY length(referencia),referencia")
      .all() as VehicleRow[]
  ).map(vehicleDto);
}

/** Partial PATCH semantics: omitted keeps, null clears, empty is invalid. */
export function parseVehicleChanges(v: unknown): VehicleChanges {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Problem(
      422,
      "VALIDATION",
      "El bloque vehiculo debe ser un objeto.",
    );
  const allowed = ["matricula", "proximaITV", "cita"],
    source = v as Record<string, unknown>;
  for (const key of Object.keys(source))
    if (!allowed.includes(key))
      throw new Problem(422, "VALIDATION", "Campo de vehículo no editable: " + key);
  const out: VehicleChanges = {};
  if ("matricula" in source) {
    const value = source.matricula;
    if (value !== null) {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > 32 ||
        /[\u0000-\u001f\u007f]/.test(value)
      )
        throw new Problem(
          422,
          "VALIDATION",
          "Matrícula opcional, máximo 32 caracteres, sin controles ni vacío.",
          { matricula: "Indica una matrícula válida o déjala sin informar." },
        );
      out.matricula = value;
    } else out.matricula = null;
  }
  for (const [api, key] of [
    ["proximaITV", "proximaITV"],
    ["cita", "cita"],
  ] as const) {
    if (!(api in source)) continue;
    const value = source[api];
    if (value === null) out[key] = null;
    else if (typeof value !== "string" || !date(value))
      throw new Problem(
        422,
        "VALIDATION",
        "Fecha opcional ISO válida; no se normaliza ni se rellena con hoy.",
        { [key]: "Usa una fecha válida o déjala vacía." },
      );
    else out[key] = value;
  }
  return out;
}

export function fullVehicle(changes: VehicleChanges): Required<VehicleChanges> {
  return {
    matricula: changes.matricula ?? null,
    proximaITV: changes.proximaITV ?? null,
    cita: changes.cita ?? null,
  };
}

function candidateRows(db: Database): VehicleCandidate[] {
  return db
    .query(
      "SELECT f.referencia,r.nombre,f.matricula,r.estado FROM fichas_vehiculo f JOIN referencias r ON r.id=f.referencia WHERE r.tipo='Vehículo' ORDER BY length(f.referencia),f.referencia",
    )
    .all() as VehicleCandidate[];
}

export function duplicateHash(
  operation: DuplicateDimension["operation"],
  reference: string | null,
  revision: number,
  fichaRevision: number,
  dimension: "nombre" | "matrícula",
  value: string,
  candidates: VehicleCandidate[],
) {
  return fingerprint({
    version: 1,
    operation,
    reference,
    revision,
    fichaRevision,
    dimension,
    value,
    candidates: candidates.map((c) => ({
      referencia: c.referencia,
      nombre: c.nombre,
      matricula: c.matricula,
      estado: c.estado,
    })),
  });
}

function dimension(
  db: Database,
  operation: DuplicateDimension["operation"],
  reference: string | null,
  revision: number,
  fichaRevision: number,
  kind: "nombre" | "matrícula",
  value: string,
  excluding: string | null,
): DuplicateDimension | null {
  const key = normalizeVehicleKey(value),
    candidates = candidateRows(db).filter(
      (c) =>
        c.referencia !== excluding &&
        (kind === "nombre"
          ? normalizeVehicleKey(c.nombre) === key
          : c.matricula !== null &&
            c.matricula !== "" &&
            normalizeVehicleKey(c.matricula) === key),
    );
  if (!candidates.length) return null;
  return {
    operation,
    value,
    candidates,
    hash: duplicateHash(
      operation,
      reference,
      revision,
      fichaRevision,
      kind,
      value,
      candidates,
    ),
  };
}

export function duplicateSet(
  db: Database,
  options: {
    reference: string | null;
    revision: number;
    fichaRevision: number;
    excluding: string | null;
    nombre: { value: string; operation: DuplicateDimension["operation"] } | null;
    matricula: {
      value: string | null;
      operation: DuplicateDimension["operation"];
    } | null;
  },
): DuplicateSet | null {
  const name = options.nombre
      ? dimension(
          db,
          options.nombre.operation,
          options.reference,
          options.revision,
          options.fichaRevision,
          "nombre",
          options.nombre.value,
          options.excluding,
        )
      : null,
    registration =
      options.matricula && options.matricula.value !== null &&
      options.matricula.value.trim() !== ""
        ? dimension(
            db,
            options.matricula.operation,
            options.reference,
            options.revision,
            options.fichaRevision,
            "matrícula",
            options.matricula.value,
            options.excluding,
          )
        : null;
  if (!name && !registration) return null;
  return {
    reference: options.reference,
    revision: options.revision,
    fichaRevision: options.fichaRevision,
    name,
    registration,
  };
}

export function duplicateDetails(set: DuplicateSet) {
  return {
    ...(set.name
      ? {
          coincidenciasNombre: set.name.candidates,
          candidateNameHash: set.name.hash,
        }
      : {}),
    ...(set.registration
      ? {
          coincidenciasMatricula: set.registration.candidates,
          candidateMatriculaHash: set.registration.hash,
        }
      : {}),
  };
}

export function duplicateWarning(set: DuplicateSet): Problem {
  return new Problem(
    409,
    "DUPLICATE_WARNING",
    "Hay vehículos con el mismo nombre o matrícula. Confirma cada dimensión por separado; no se ha guardado nada.",
    {},
    duplicateDetails(set),
  );
}

export function hasConfirmationAttempt(body: Record<string, unknown>) {
  return (
    body.confirmarDuplicadoNombre === true ||
    body.confirmarDuplicadoMatricula === true ||
    typeof body.candidateNameHash === "string" ||
    typeof body.candidateMatriculaHash === "string"
  );
}

export function assertNoOrphanConfirmations(
  body: Record<string, unknown>,
  set: DuplicateSet | null,
) {
  const stale = (provided: boolean, present: boolean) =>
    provided &&
    !present &&
    new Problem(
      409,
      "DUPLICATE_CONTEXT_CHANGED",
      "El contexto de duplicados ha cambiado; vuelve a revisar antes de guardar.",
    );
  const error =
    stale(
      body.confirmarDuplicadoNombre === true ||
        typeof body.candidateNameHash === "string",
      Boolean(set?.name),
    ) ||
    stale(
      body.confirmarDuplicadoMatricula === true ||
        typeof body.candidateMatriculaHash === "string",
      Boolean(set?.registration),
    );
  if (error) throw error;
}

export function assertDuplicateConfirmations(
  body: Record<string, unknown>,
  set: DuplicateSet,
) {
  const invalid = (message: string, fields: Record<string, string> = {}) =>
    new Problem(422, "DUPLICATE_CONFIRMATION_REQUIRED", message, fields);
  const check = (
    dimensionValue: DuplicateDimension,
    flag: string,
    hashField: string,
    label: string,
  ) => {
    const provided = body[hashField];
    if (
      body[flag] !== true ||
      typeof provided !== "string" ||
      !/^[a-f0-9]{64}$/.test(provided)
    )
      throw invalid(
        "Falta la confirmación explícita de " + label + "; no se guarda nada.",
        { [label]: "Confirma esta dimensión con el aviso vigente." },
      );
    if (provided !== dimensionValue.hash)
      throw new Problem(
        409,
        "DUPLICATE_CONTEXT_CHANGED",
        "El contexto de duplicados de " + label + " ha cambiado; vuelve a revisar.",
      );
  };
  if (set.name)
    check(
      set.name,
      "confirmarDuplicadoNombre",
      "candidateNameHash",
      "nombre",
    );
  if (set.registration)
    check(
      set.registration,
      "confirmarDuplicadoMatricula",
      "candidateMatriculaHash",
      "matrícula",
    );
  return {
    dimensiones: [
      ...(set.name ? ["nombre"] : []),
      ...(set.registration ? ["matrícula"] : []),
    ],
    candidateNameHash: set.name?.hash ?? null,
    candidateMatriculaHash: set.registration?.hash ?? null,
  };
}
