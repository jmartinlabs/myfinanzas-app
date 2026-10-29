import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { Problem } from "./problem";
import { cashAt, cents, investmentInstalled, positionsFor, scaledText } from "./investment-engine";
import { purchaseDto, purchasesForInstrumento } from "./compras";

export const COBERTURA =
  "Posición calculada solo con las compras registradas; no incluye histórico anterior no importado";
const INSTRUMENT_FIELDS = [
  "nombre",
  "isin",
  "isinEvidencia",
  "divisaReferencia",
] as const;
type Row = {
  id: string;
  nombre: string;
  isin: string | null;
  isin_evidencia: string | null;
  divisa_referencia: string | null;
  estado: string;
  revision: number;
  creado_en: string;
  actualizado_en: string;
};
export type Instrumento = {
  id: string;
  nombre: string;
  isin: string | null;
  isinEvidencia: string | null;
  divisaReferencia: string | null;
  estado: string;
  revision: number;
  creadoEn: string;
  actualizadoEn: string;
};
const select = `SELECT id,nombre,isin,isin_evidencia,divisa_referencia,estado,revision,creado_en,actualizado_en FROM instrumentos`;

function dto(row: Row): Instrumento {
  return {
    id: row.id,
    nombre: row.nombre,
    isin: row.isin,
    isinEvidencia: row.isin_evidencia,
    divisaReferencia: row.divisa_referencia,
    estado: row.estado,
    revision: row.revision,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}
function find(db: Database, id: string) {
  const row = db.query(select + " WHERE id=?").get(id) as Row | null;
  if (!row) throw new Problem(404, "NOT_FOUND", "Instrumento no encontrado.");
  return row;
}
function text(value: unknown, field: string, max: number) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      [field]: `Texto válido de hasta ${max} caracteres, sin controles.`,
    });
  return value;
}
function optionalText(value: unknown, field: string, max: number) {
  if (value === null || value === undefined || value === "") return null;
  return text(value, field, max);
}
function validated(
  db: Database,
  body: Record<string, unknown>,
  old?: Row,
): {
  nombre: string;
  isin: string | null;
  isinEvidencia: string | null;
  divisaReferencia: string | null;
  motivo: string | null;
} {
  const allowed = [...INSTRUMENT_FIELDS, ...(old ? ["revision", "motivo"] : ["motivo"])];
  for (const key of Object.keys(body))
    if (!allowed.includes(key))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${key}.`, {
        [key]: "Campo no editable.",
      });
  const errors: Record<string, string> = {};
  let nombre = (body.nombre as string | undefined) ?? old?.nombre ?? "";
  if (
    typeof nombre !== "string" ||
    nombre.length < 1 ||
    nombre.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(nombre)
  )
    errors.nombre = "Nombre de 1–120 caracteres, sin caracteres de control.";
  let isin = old ? old.isin : null,
    evidencia = old ? old.isin_evidencia : null;
  if ("isin" in body) {
    if (body.isin === null || body.isin === "") isin = null;
    else if (typeof body.isin !== "string") errors.isin = "ISIN inválido.";
    else {
      const normalized = body.isin.trim().toUpperCase();
      if (!/^[A-Z0-9]{12}$/.test(normalized))
        errors.isin = "ISIN debe tener 12 caracteres ASCII A–Z o 0–9, sin espacios interiores.";
      else isin = normalized;
    }
  }
  if ("isinEvidencia" in body) {
    if (body.isinEvidencia === null || body.isinEvidencia === "")
      evidencia = null;
    else if (
      typeof body.isinEvidencia !== "string" ||
      body.isinEvidencia.length > 200 ||
      /[\u0000-\u001f\u007f]/.test(body.isinEvidencia)
    )
      errors.isinEvidencia = "Evidencia de 1–200 caracteres, sin controles.";
    else evidencia = body.isinEvidencia;
  }
  if (isin === null) evidencia = null;
  else if (!evidencia)
    errors.isinEvidencia = "La evidencia del ISIN es obligatoria.";
  let divisa =
    old?.divisa_referencia ?? null;
  if ("divisaReferencia" in body) {
    if (body.divisaReferencia === null || body.divisaReferencia === "")
      divisa = null;
    else if (
      typeof body.divisaReferencia !== "string" ||
      !/^[A-Z]{3}$/.test(body.divisaReferencia)
    )
      errors.divisaReferencia = "Divisa ISO 4217 de tres letras mayúsculas.";
    else divisa = body.divisaReferencia;
  }
  if (Object.keys(errors).length)
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", errors);
  if (old && body.revision !== old.revision)
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      "El Instrumento ha cambiado. Revisa la versión actual.",
      {},
      { revision: old.revision },
    );
  let motivo: string | null = null;
  if (old) {
    const value = text(body.motivo, "motivo", 2000).trim();
    if (!value)
      throw new Problem(422, "VALIDATION", "Indica un motivo.", {
        motivo: "Motivo obligatorio.",
      });
    motivo = value;
  } else if (body.motivo !== undefined && body.motivo !== null)
    motivo = text(body.motivo, "motivo", 2000).trim() || null;
  if (isin && old?.isin !== isin) {
    const duplicate = db
      .query("SELECT id FROM instrumentos WHERE isin=? AND id!=?")
      .get(isin, old?.id ?? "") as { id: string } | null;
    if (duplicate)
      throw new Problem(
        422,
        "VALIDATION",
        `El ISIN ya pertenece a ${duplicate.id}.`,
        { isin: `ISIN ya registrado en ${duplicate.id}.` },
        { instrumento: duplicate.id },
      );
  }
  return { nombre, isin, isinEvidencia: evidencia, divisaReferencia: divisa, motivo };
}
function auditRow(row: Row) {
  return {
    id: row.id,
    nombre: row.nombre,
    isin: row.isin,
    isinEvidencia: row.isin_evidencia,
    divisaReferencia: row.divisa_referencia,
    estado: row.estado,
    revision: row.revision,
  };
}
function writeAudit(
  db: Database,
  instrumento: string,
  revision: number,
  accion: string,
  motivo: string | null,
  anterior: unknown,
  posterior: unknown,
  now: number,
) {
  db.run(
    "INSERT INTO instrumento_audit VALUES(?,?,?,?,?, 'usuario-unico',?,?)",
    [
      instrumento,
      revision,
      accion,
      motivo,
      new Date(now).toISOString(),
      anterior === null ? null : JSON.stringify(anterior),
      JSON.stringify(posterior),
    ],
  );
}
function audits(db: Database, id: string) {
  return (
    db
      .query(
        "SELECT revision,accion,motivo,instante,actor,anterior,posterior FROM instrumento_audit WHERE instrumento=? ORDER BY revision",
      )
      .all(id) as {
      revision: number;
      accion: string;
      motivo: string | null;
      instante: string;
      actor: string;
      anterior: string | null;
      posterior: string;
    }[]
  ).map((row) => ({
    ...row,
    anterior: row.anterior ? JSON.parse(row.anterior) : null,
    posterior: JSON.parse(row.posterior),
  }));
}
function positions(instrumento: string, db: Database) {
  return positionsFor(db, instrumento).map((position) => ({
    saldoInversion: position.saldoInversion,
    cantidad: scaledText(position.cantidad, 8),
    compras: position.compras,
    ultimaCompra: position.ultimaCompra,
  }));
}
function summary(db: Database, row: Row) {
  const posiciones = positions(row.id, db);
  return {
    ...dto(row),
    posiciones,
    comprasVigentes: posiciones.reduce((total, p) => total + p.compras, 0),
  };
}
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function createInstrumento(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(422, "IDEMPOTENCY_REQUIRED", "Clave de intento inválida.");
  const hash = createHash("sha256")
    .update(
      JSON.stringify(
        Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
      ),
    )
    .digest("hex");
  return db
    .transaction(() => {
      db.run("DELETE FROM instrumento_attempts WHERE expires<?", [now]);
      const retry = db
        .query("SELECT hash,response FROM instrumento_attempts WHERE key=?")
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as ReturnType<typeof getInstrumento>;
      }
      const value = validated(db, body);
      const counter = db
        .query(
          "UPDATE counters SET next=next+1 WHERE name='instrumento' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) value",
        )
        .get() as { value: string } | null;
      if (!counter)
        throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
      const id = "I" + counter.value,
        time = new Date(now).toISOString();
      db.run(
        "INSERT INTO instrumentos VALUES(?,?,?,?,?,'Activa',1,?,?)",
        [
          id,
          value.nombre,
          value.isin,
          value.isinEvidencia,
          value.divisaReferencia,
          time,
          time,
        ],
      );
      const row = find(db, id);
      writeAudit(db, id, 1, "alta", value.motivo, null, auditRow(row), now);
      const response = getInstrumento(db, id);
      db.run("INSERT INTO instrumento_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(response),
        now + 86400000,
      ]);
      return response;
    })
    .immediate();
}

export function updateInstrumento(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db
    .transaction(() => {
      const old = find(db, id),
        value = validated(db, body, old),
        changed = INSTRUMENT_FIELDS.filter(
          (field) =>
            ({
              nombre: old.nombre,
              isin: old.isin,
              isinEvidencia: old.isin_evidencia,
              divisaReferencia: old.divisa_referencia,
            })[field] !== value[field],
        );
      if (!changed.length)
        throw new Problem(422, "VALIDATION", "No hay cambios que auditar.");
      const revision = old.revision + 1;
      db.run(
        "UPDATE instrumentos SET nombre=?,isin=?,isin_evidencia=?,divisa_referencia=?,revision=?,actualizado_en=? WHERE id=? AND revision=?",
        [
          value.nombre,
          value.isin,
          value.isinEvidencia,
          value.divisaReferencia,
          revision,
          new Date(now).toISOString(),
          id,
          old.revision,
        ],
      );
      writeAudit(
        db,
        id,
        revision,
        "edición",
        value.motivo,
        auditRow(old),
        auditRow(find(db, id)),
        now,
      );
      return dto(find(db, id));
    })
    .immediate();
}

export function changeInstrumentoState(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  active: boolean,
  now = Date.now(),
) {
  for (const key of Object.keys(body))
    if (!["revision", "motivo"].includes(key))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${key}.`, {
        [key]: "Campo no editable.",
      });
  return db
    .transaction(() => {
      const old = find(db, id);
      if (body.revision !== old.revision)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "El Instrumento ha cambiado. Revisa la versión actual.",
          {},
          { revision: old.revision },
        );
      const motivo = text(body.motivo, "motivo", 2000).trim();
      if (!motivo)
        throw new Problem(422, "VALIDATION", "Indica un motivo.", {
          motivo: "Motivo obligatorio.",
        });
      const estado = active ? "Activa" : "Inactiva";
      if (old.estado === estado)
        throw new Problem(
          422,
          "VALIDATION",
          `El Instrumento ya está ${estado}.`,
          { estado: "Estado no elegible." },
        );
      const revision = old.revision + 1;
      db.run(
        "UPDATE instrumentos SET estado=?,revision=?,actualizado_en=? WHERE id=? AND revision=?",
        [estado, revision, new Date(now).toISOString(), id, old.revision],
      );
      writeAudit(
        db,
        id,
        revision,
        active ? "reactivación" : "desactivación",
        motivo,
        auditRow(old),
        auditRow(find(db, id)),
        now,
      );
      return dto(find(db, id));
    })
    .immediate();
}

export function getInstrumento(db: Database, id: string) {
  return db.transaction(() => {
    const row = find(db, id),
      items = audits(db, id);
    return {
      instrumento: dto(row),
      posiciones: positions(id, db),
      cobertura: COBERTURA,
      valoracion: {
        estado: "No disponible",
        motivo: "Valoración E4.3 no entregada",
      },
      compras: purchasesForInstrumento(db, id),
      auditoriaResumen: {
        revisiones: items.length,
        ultima: items.at(-1)?.instante ?? null,
        endpoint: `/api/instrumentos/${id}/auditoria`,
      },
    };
  })();
}

export function instrumentoAudit(db: Database, id: string) {
  return db.transaction(() => {
    find(db, id);
    return { items: audits(db, id) };
  })();
}

export function listInstrumentos(
  db: Database,
  params = new URLSearchParams(),
) {
  const page = Number(params.get("page") ?? "1"),
    estado = params.get("estado") ?? "",
    busqueda = (params.get("busqueda") ?? "").trim();
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !["", "Activa", "Inactiva"].includes(estado)
  )
    throw new Problem(422, "VALIDATION", "Filtro o página inválidos.");
  return db.transaction(() => {
    const normalized = normalize(busqueda),
      isinTerm = busqueda.toUpperCase();
    const rows = (db.query(select + " ORDER BY length(id),id").all() as Row[])
      .filter((row) => !estado || row.estado === estado)
      .filter(
        (row) =>
          !busqueda ||
          normalize(row.nombre).includes(normalized) ||
          (busqueda.length === 12 && row.isin === isinTerm),
      )
      .map((row) => summary(db, row));
    return {
      instrumentos: rows.slice((page - 1) * 100, page * 100),
      total: rows.length,
      page,
      cobertura: COBERTURA,
      ventas: "Ventas: no disponibles hasta E4.2",
    };
  })();
}

export function instrumentOptions(db: Database) {
  return db.transaction(() => {
    const instruments = (
      db
        .query(select + " WHERE estado='Activa' ORDER BY length(id),id")
        .all() as Row[]
    ).map(dto);
    const saldosEfectivo = (
      db
        .query(
          "SELECT id,nombre,estado FROM saldos WHERE tipo='Efectivo' AND control='Inversiones' AND estado='Activa' ORDER BY id",
        )
        .all() as { id: string; nombre: string; estado: string }[]
    ).map((saldo) => {
      const cash = cashAt(db, saldo.id);
      return {
        id: saldo.id,
        nombre: saldo.nombre,
        estado: saldo.estado,
        disponible: cents(cash.disponible),
      };
    });
    const saldosInversion = db
      .query(
        "SELECT id,nombre,estado FROM saldos WHERE tipo='Inversión' AND control='Inversiones' AND estado='Activa' ORDER BY id",
      )
      .all() as { id: string; nombre: string; estado: string }[];
    const divisas = new Set<string>(["EUR", "USD", "GBP", "CHF", "JPY"]);
    if (investmentInstalled(db))
      for (const row of db
        .query("SELECT DISTINCT divisa FROM operaciones_inversion ORDER BY divisa")
        .all() as { divisa: string }[])
        divisas.add(row.divisa);
    return {
      instrumentos: instruments,
      divisas: [...divisas].sort(),
      saldosEfectivo,
      saldosInversion,
      ventas: "Ventas: no disponibles hasta E4.2",
      cobertura: COBERTURA,
    };
  })();
}

export { purchaseDto };
