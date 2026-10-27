import type { Database } from "bun:sqlite";
import { Problem } from "./saldos";
import { getReference } from "./reference-rules";
import { ledgerRows } from "./movement-ledger";

export const procedenciasAportacion = [
  "Registro del titular",
  "Documento bancario",
  "Importación histórica autorizada",
] as const;
export type ProcedenciaAportacion = (typeof procedenciasAportacion)[number];
export const procedenciasNuevas: ProcedenciaAportacion[] = [
  "Registro del titular",
  "Documento bancario",
];
export const procedenciasHistoricas: ProcedenciaAportacion[] = [
  "Documento bancario",
  "Importación histórica autorizada",
];

export type AportacionMeta = {
  movimiento: string;
  referencia: string;
  participante: string;
  evidencia: string;
  procedencia: ProcedenciaAportacion;
  revision_movimiento: number;
  revision: number;
  creado: string;
  actualizado: string;
};
export type AportacionFuente = AportacionMeta & {
  fecha: string;
  importeCents: bigint;
  anulado: boolean;
  origen: string;
  destino: string;
  movimientoRevision: number;
};

function installed(db: Database) {
  return !!db
    .query("SELECT name FROM sqlite_master WHERE name='movimiento_compartido'")
    .get();
}
export function aportacionMetadata(
  db: Database,
  movimiento: string,
): AportacionMeta | null {
  if (!installed(db)) return null;
  return (
    (db
      .query("SELECT * FROM movimiento_compartido WHERE movimiento=?")
      .get(movimiento) as AportacionMeta | null) ?? null
  );
}
export function aportacionesReferencia(
  db: Database,
  referencia: string,
): AportacionFuente[] {
  if (!installed(db)) return [];
  return (
    db
      .query(
        `SELECT a.*,m.fecha,CAST(m.importe AS TEXT) importe,m.anulado,m.origen,m.destino,m.revision movimientoRevision
         FROM movimiento_compartido a JOIN movimientos m ON m.id=a.movimiento
         WHERE a.referencia=? ORDER BY m.fecha,length(m.id),m.id`,
      )
      .all(referencia) as (AportacionMeta & {
      fecha: string;
      importe: string;
      anulado: number;
      origen: string;
      destino: string;
      movimientoRevision: number;
    })[]
  ).map((a) => ({
    ...a,
    importeCents: BigInt(a.importe),
    anulado: a.anulado === 1,
  }));
}
function text(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.trim().length < 10 ||
    value.trim().length > 500
  )
    throw new Problem(
      422,
      "VALIDATION",
      "La evidencia debe ser un texto identificable de 10 a 500 caracteres.",
      { [field]: "Describe el extracto, justificante o referencia bancaria." },
    );
  return value.trim();
}
function procedencia(
  value: unknown,
  historical: boolean,
  field = "procedencia",
): ProcedenciaAportacion {
  const allowed = historical ? procedenciasHistoricas : procedenciasNuevas;
  if (
    typeof value !== "string" ||
    !procedenciasAportacion.includes(value as ProcedenciaAportacion) ||
    !allowed.includes(value as ProcedenciaAportacion)
  )
    throw new Problem(
      422,
      "VALIDATION",
      historical
        ? "Un histórico exige Documento bancario o Importación histórica autorizada."
        : "Selecciona Registro del titular o Documento bancario.",
      { [field]: "Procedencia no válida para esta operación." },
    );
  return value as ProcedenciaAportacion;
}
function participant(
  db: Database,
  referencia: string,
  value: unknown,
  requireActive: boolean,
) {
  if (
    typeof value !== "string" ||
    !/^CP[0-9]+$/.test(value)
  )
    throw new Problem(
      422,
      "VALIDATION",
      "Selecciona Quién paga entre los Terceros de la ficha.",
      { participante: "Participante obligatorio." },
    );
  const p = db
    .query("SELECT * FROM participantes_compartido WHERE id=?")
    .get(value) as
    | {
        id: string;
        referencia: string;
        rol: string;
        estado: string;
      }
    | null;
  if (!p || p.referencia !== referencia)
    throw new Problem(
      422,
      "PARTICIPANTE_INVALIDO",
      "El participante no pertenece a la ficha del caso.",
      { participante: "Selecciona un Tercero de esta ficha." },
    );
  if (p.rol !== "Tercero")
    throw new Problem(
      422,
      "PARTICIPANTE_TITULAR",
      "El Titular no tiene aportación exigible ni recuperación que acreditar (F3).",
      { participante: "Selecciona un Tercero." },
    );
  if (requireActive && p.estado !== "Activa")
    throw new Problem(
      422,
      "PARTICIPANTE_BAJA",
      "El participante está de baja lógica y no admite nuevas acreditaciones.",
      { participante: "Selecciona un Tercero activo." },
    );
  return p;
}

/**
 * D5 metadata validation. The canonical fact (amount, date, Origen, Destino,
 * Referencia) is never copied: only the participant, evidence and provenance are
 * attribution metadata. Existing accreditations may keep an inactive Reference or
 * participant when the link itself is unchanged; changing the participant always
 * requires an active Reference and an active Tercero of the same ficha.
 */
export function validateAportacion(
  db: Database,
  next: {
    tipo: string;
    referencia: string | null;
    origen: string;
    destino: string;
  },
  value: unknown,
  exclude?: string,
  historical = false,
) {
  const existing = exclude ? aportacionMetadata(db, exclude) : null;
  const ref =
    next.referencia !== null ? getReference(db, next.referencia) : null;
  const isD5 =
    next.tipo === "Transferencia" &&
    next.origen === "S000" &&
    next.destino !== "S000" &&
    ref?.tipo === "Gasto compartido";
  if (!isD5) {
    if (value !== undefined && value !== null)
      throw new Problem(
        422,
        "VALIDATION",
        "El bloque compartido solo aplica a una Transferencia desde Exterior con Referencia CAT013.",
      );
    if (existing)
      throw new Problem(
        409,
        "APORTACION_INMUTABLE",
        "Tipo, Referencia y Origen de una Transferencia acreditada son inmutables mientras la acreditación esté vigente; anula y registra un hecho nuevo.",
      );
    return null;
  }
  if (!db.query("SELECT referencia FROM fichas_compartidos WHERE referencia=?").get(ref.id))
    throw new Problem(
      422,
      "SHARED_CASE_REQUIRED",
      "La Referencia compartida no tiene ficha 1:1.",
      { referencia: "Selecciona una Referencia compartida con ficha." },
    );
  const already = existing;
  if (already && next.referencia !== already.referencia)
    throw new Problem(
      409,
      "APORTACION_INMUTABLE",
      "Tipo, Referencia y Origen de una Transferencia acreditada son inmutables mientras la acreditación esté vigente; anula y registra un hecho nuevo.",
    );
  // A rectification that does not edit attribution keeps the existing link.
  if ((value === undefined || value === null) && already)
    return {
      participante: already.participante,
      evidencia: already.evidencia,
      procedencia: already.procedencia,
    };
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Problem(422, "VALIDATION", "Declara Quién paga, evidencia y procedencia.", {
      participante: "Participante obligatorio.",
    });
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).some(
      (k) => !["participante", "evidencia", "procedencia"].includes(k),
    )
  )
    throw new Problem(
      422,
      "VALIDATION",
      "El bloque compartido solo admite participante, evidencia y procedencia.",
    );
  const sameParticipant =
    !!already && body.participante === already.participante;
  // New highs and participant changes require the case and the Tercero active.
  if (
    !historical &&
    !already &&
    ref.estado !== "Activa"
  )
    throw new Problem(
      422,
      "INACTIVE_REFERENCE",
      "No se admiten aportaciones nuevas a una Referencia inactiva.",
    );
  if (
    historical &&
    ref.estado !== "Activa"
  )
    throw new Problem(
      422,
      "INACTIVE_REFERENCE",
      "La revisión histórica exige una Referencia compartida activa.",
    );
  if (already && !sameParticipant && ref.estado !== "Activa")
    throw new Problem(
      409,
      "INACTIVE_REFERENCE",
      "Cambiar la identidad del participante exige una Referencia activa.",
    );
  const p = participant(
    db,
    ref.id,
    body.participante,
    historical || !sameParticipant || !already,
  );
  return {
    participante: p.id,
    evidencia: text(body.evidencia, "evidencia"),
    procedencia: procedencia(body.procedencia, historical),
  };
}

function audit(
  db: Database,
  referencia: string,
  accion: string,
  before: unknown,
  after: unknown,
  motivo: string | null,
  now: number,
) {
  db.run(
    "INSERT INTO compartido_audit(referencia,accion,anterior,posterior,motivo,instante,actor) VALUES(?,?,?,?,?,?,'usuario-unico')",
    [
      referencia,
      accion,
      before === null ? null : JSON.stringify(before),
      JSON.stringify(after),
      motivo,
      new Date(now).toISOString(),
    ],
  );
}

/**
 * Stores or corrects the single accreditation attached to a Movement inside the
 * caller's IMMEDIATE transaction. Metadata is never deleted: annulment and
 * withdrawal keep the row and append history, so the link stays visible and
 * cannot be reused for a new attribution.
 */
export function storeAportacion(
  db: Database,
  movimiento: string,
  meta: {
    participante: string;
    evidencia: string;
    procedencia: ProcedenciaAportacion;
  } | null,
  now: number,
  motive: string | null = null,
) {
  if (!installed(db)) return;
  const current = ledgerRows(db).find((m) => m.id === movimiento);
  if (!current)
    throw new Problem(404, "NOT_FOUND", "Movimiento no encontrado.");
  const before = aportacionMetadata(db, movimiento);
  if (!meta) {
    if (before)
      audit(
        db,
        before.referencia,
        current.anulado
          ? "anular aportación"
          : "retirar acreditación",
        before,
        {
          movimiento,
          anulado: current.anulado === 1,
          revision: before.revision,
        },
        motive,
        now,
      );
    return;
  }
  const revision = (before?.revision ?? 0) + 1,
    time = new Date(now).toISOString();
  if (before)
    db.run(
      `UPDATE movimiento_compartido SET participante=?,evidencia=?,procedencia=?,
         revision_movimiento=?,revision=?,actualizado=? WHERE movimiento=?`,
      [
        meta.participante,
        meta.evidencia,
        meta.procedencia,
        current.revision,
        revision,
        time,
        movimiento,
      ],
    );
  else
    db.run(
      `INSERT INTO movimiento_compartido
         (movimiento,referencia,participante,evidencia,procedencia,revision_movimiento,revision,creado,actualizado)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      [
        movimiento,
        current.referencia!,
        meta.participante,
        meta.evidencia,
        meta.procedencia,
        current.revision,
        revision,
        time,
        time,
      ],
    );
  audit(
    db,
    current.referencia!,
    before ? "rectificar aportación" : "acreditar aportación",
    before,
    {
      movimiento,
      participante: meta.participante,
      evidencia: meta.evidencia,
      procedencia: meta.procedencia,
      revision_movimiento: current.revision,
      revision,
    },
    motive,
    now,
  );
}
