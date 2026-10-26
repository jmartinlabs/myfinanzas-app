import type { Database } from "bun:sqlite";
import { Problem } from "./saldos";
export const operationalReferenceTypes = [
  "Viaje",
  "Evento",
  "Anticipo",
  "Gasto compartido",
] as const;
export type OperationalReferenceType = (typeof operationalReferenceTypes)[number];
// Q2: sanitized evidence by stable category IDs. No category/financial data is seeded.
export const referenceMapping: Readonly<Record<string, string>> = Object.freeze(
  {
    CAT011: "Viaje",
    CAT012: "Anticipo",
    CAT013: "Gasto compartido",
    CAT014: "Evento",
    CAT009: "Vehículo",
  },
);
export type Reference = {
  id: string;
  nombre: string;
  tipo: "Viaje" | "Evento" | "Anticipo" | "Gasto compartido";
  estado: "Activa" | "Inactiva";
  revision: number;
  creado: string;
  actualizado: string;
};
export function getReference(db: Database, id: string): Reference {
  const r = db
    .query("SELECT * FROM referencias WHERE id=?")
    .get(id) as Reference | null;
  if (!r) throw new Problem(404, "NOT_FOUND", "Referencia no encontrada.");
  return r;
}
export function validateReference(
  db: Database,
  value: unknown,
  category: string | null,
  required: boolean,
  previous: string | null = null,
) {
  if (value !== undefined && value !== null && typeof value !== "string")
    throw new Problem(
      422,
      "VALIDATION",
      "Referencia debe ser un ID registrado.",
      { referencia: "Selecciona una Referencia existente." },
    );
  const id = typeof value === "string" && value !== "" ? value : null;
  const expected = category ? referenceMapping[category] : undefined;
  if (
    required &&
    (!expected ||
      !operationalReferenceTypes.includes(
        expected as OperationalReferenceType,
      ))
  )
    throw new Problem(
      422,
      "REFERENCE_UNAVAILABLE",
      "La Referencia requerida no es verificable sin su dependencia E3 o mapping contrastado.",
      { referencia: "Referencia obligatoria no disponible en esta entrega." },
    );
  if (!id) {
    if (required)
      throw new Problem(
        422,
        "REFERENCE_REQUIRED",
        "Esta Partida exige una Referencia.",
        { referencia: "Selecciona la Referencia obligatoria." },
      );
    return null;
  }
  let ref: Reference;
  try {
    ref = getReference(db, id);
  } catch (e) {
    if (e instanceof Problem && e.status === 404)
      throw new Problem(
        422,
        "REFERENCE_NOT_FOUND",
        "La Referencia informada no existe.",
        { referencia: "Selecciona una Referencia registrada." },
      );
    throw e;
  }
  if (!operationalReferenceTypes.includes(ref.tipo))
    throw new Problem(
      422,
      "REFERENCE_UNAVAILABLE",
      "Este Tipo requiere su ficha E3.",
    );
  if (ref.estado !== "Activa" && id !== previous)
    throw new Problem(
      422,
      "INACTIVE_REFERENCE",
      "Selecciona una Referencia activa.",
      { referencia: "No admite nuevos enlaces a una Referencia inactiva." },
    );
  // Optional references require existence/eligibility, NOT category-type compatibility.
  if (required && ref.tipo !== expected)
    throw new Problem(
      422,
      "REFERENCE_TYPE",
      "La Categoría exige una Referencia de tipo " + expected + ".",
      { referencia: "Tipo esperado: " + expected + "." },
    );
  return id;
}

/**
 * Base B E3.2 gate, per operation. A CAT013 Reference enables only the shared
 * case sheet/Gasto and internal Transfers with an existing sheet. It does not
 * open S000, Exterior or any contribution metadata.
 */
export function validateSharedReferenceOperation(
  db: Database,
  referencia: string | null,
  tipo: string,
  categoria: string | null,
) {
  if (!referencia) return;
  if (getReference(db, referencia).tipo !== "Gasto compartido") return;
  if (tipo !== "Gasto" && tipo !== "Transferencia")
    throw new Problem(
      422,
      "SHARED_REFERENCE_OPERATION",
      "La Referencia de Gasto compartido solo admite Gastos o Transferencias internas.",
      { referencia: "Operación no compatible con la Referencia compartida." },
    );
  if (tipo === "Gasto" && categoria !== "CAT013")
    throw new Problem(
      422,
      "SHARED_REFERENCE_TYPE",
      "Un Gasto con Referencia compartida debe pertenecer a CAT013.",
      { referencia: "Selecciona una Partida de Gasto compartido." },
    );
  if (
    !db
      .query("SELECT referencia FROM fichas_compartidos WHERE referencia=?")
      .get(referencia)
  )
    throw new Problem(
      422,
      "SHARED_CASE_REQUIRED",
      "La Referencia compartida no tiene ficha 1:1; no se admiten hechos huérfanos.",
      { referencia: "Selecciona una Referencia compartida con ficha." },
    );
}
