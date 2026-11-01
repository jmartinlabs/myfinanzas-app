import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { Problem } from "./problem";
import {
  COBERTURA,
  assertEditable,
  auditValue,
  economic,
  instrumentRef,
  motive,
  operacionAudits,
  operationReference,
  RECTIFICABLE,
  purchaseDto,
  revisionConflict,
  saldoRef,
  validateEconomic,
  writeOperationAudit,
  type Economic,
  type OperationRow,
} from "./compras";
import {
  assertSufficient,
  assertUnitsAvailable,
  cashAt,
  cents,
  civil,
  positionAtDate,
  positionQuantity,
  quantityText,
} from "./investment-engine";

/**
 * E4.2 Venta (SPEC22). A Venta is a fact of `operaciones_inversion` with
 * `clase='Venta'`: never a Movimiento, never a parallel `ventas` table. It
 * shares identity, idempotency attempts, precision, audit and the unique cash
 * and position engines of E4.1.
 */
const CREATE_FIELDS = [
  "fecha",
  "instrumento",
  "saldoEfectivo",
  "saldoInversion",
  "cantidad",
  "precio",
  "divisa",
  "cambio",
  "importeEur",
  "comisionEur",
  "concepto",
  "nota",
] as const;
const IDENTITY_FIELDS = [
  "instrumento",
  "saldoEfectivo",
  "saldoInversion",
  "clase",
  "estado",
  "id",
];
const select = `SELECT id,fecha,clase,instrumento,saldo_efectivo,saldo_inversion,
  CAST(cantidad AS TEXT) cantidad,CAST(precio_divisa AS TEXT) precio_divisa,divisa,
  CAST(cambio AS TEXT) cambio,CAST(importe_eur AS TEXT) importe_eur,
  CAST(comision_eur AS TEXT) comision_eur,concepto,nota,estado,revision,creado,actualizado
  FROM operaciones_inversion`;

function find(db: Database, id: string) {
  const row = db.query(select + " WHERE id=? AND clase='Venta'").get(id) as
    | OperationRow
    | null;
  if (!row) throw new Problem(404, "NOT_FOUND", "Venta no encontrada.");
  return row;
}
function ventaConflict() {
  return revisionConflict("La Venta ha cambiado. Revisa la versión actual.");
}
function assertSaleEditable(row: OperationRow) {
  assertEditable(row, "Venta");
}
function unknownField(field: string) {
  return new Problem(422, "VALIDATION", `Campo no editable: ${field}.`, {
    [field]: IDENTITY_FIELDS.includes(field)
      ? "La identidad económica no se rectifica; anula y crea otra Venta."
      : "Campo no editable.",
  });
}

/**
 * D3: both Saldos must exist, be active and of the eligible Tipo/Control; the
 * Instrumento may be inactive only when the pair has available quantity at the
 * sale date, and the acceptance is flagged with a visible notice.
 */
function saleReferences(
  db: Database,
  body: Record<string, unknown>,
  fecha: string,
  cantidad: bigint,
) {
  const errors: Record<string, string> = {};
  let aviso: string | null = null;
  const instrumento =
    typeof body.instrumento === "string"
      ? instrumentRef(db, body.instrumento)
      : null;
  if (!instrumento) errors.instrumento = "Selecciona un Instrumento existente.";
  const effective =
    typeof body.saldoEfectivo === "string"
      ? saldoRef(db, body.saldoEfectivo)
      : null;
  if (!effective)
    errors.saldoEfectivo = "Selecciona un Saldo de efectivo existente.";
  else if (effective.tipo !== "Efectivo" || effective.control !== "Inversiones")
    errors.saldoEfectivo = "Debe ser un Saldo Efectivo/Inversiones.";
  else if (effective.estado !== "Activa")
    errors.saldoEfectivo = "El Saldo está inactivo.";
  const inversion =
    typeof body.saldoInversion === "string"
      ? saldoRef(db, body.saldoInversion)
      : null;
  if (!inversion)
    errors.saldoInversion = "Selecciona un Saldo de inversión existente.";
  else if (inversion.tipo !== "Inversión" || inversion.control !== "Inversiones")
    errors.saldoInversion = "Debe ser un Saldo Inversión/Inversiones.";
  else if (inversion.estado !== "Activa")
    errors.saldoInversion = "El Saldo está inactivo.";
  if (effective?.id && inversion?.id && effective.id === inversion.id)
    errors.saldoInversion = "Efectivo e inversión deben ser distintos.";
  if (instrumento && instrumento.estado !== "Activa" && inversion?.id) {
    const disponible = positionAtDate(
      db,
      inversion.id,
      instrumento.id,
      fecha,
    );
    if (disponible <= 0n)
      errors.instrumento =
        "El Instrumento está inactivo y no tiene cantidad disponible en este Saldo de inversión; no admite nuevas Ventas.";
    else
      aviso =
        "Instrumento inactivo con cantidad disponible: la Venta se permite con aviso y no se ofrece para nuevas Compras.";
  }
  if (Object.keys(errors).length)
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", errors);
  return {
    instrumento: instrumento!.id,
    saldoEfectivo: effective!.id,
    saldoInversion: inversion!.id,
    aviso,
  };
}

function saleImpact(
  db: Database,
  action: "alta" | "rectificación" | "anulación",
  old: OperationRow | null,
  next:
    | (Economic & {
        saldoEfectivo?: string;
        saldoInversion?: string;
        instrumento?: string;
      })
    | null,
) {
  const effectiveId = next
    ? (old?.saldo_efectivo ?? next.saldoEfectivo!)
    : old!.saldo_efectivo;
  const effective = saldoRef(db, effectiveId)!;
  const cash = cashAt(db, effectiveId);
  let afterCash = cash.disponible;
  if (old && old.estado === "Vigente") afterCash -= BigInt(old.importe_eur);
  if (next) afterCash += next.importeEur;
  const inversionId =
      old?.saldo_inversion ?? next?.saldoInversion ?? effectiveId,
    instrumentoId = old?.instrumento ?? next?.instrumento ?? "";
  const position = positionQuantity(db, inversionId, instrumentoId);
  let afterQuantity = position.quantity;
  if (old && old.estado === "Vigente") afterQuantity += BigInt(old.cantidad);
  if (next) afterQuantity -= next.cantidad;
  return {
    accion: action,
    impacto: {
      efectivo: {
        saldo: { id: effective.id, nombre: effective.nombre },
        antes: cents(cash.disponible),
        despues: cents(afterCash),
      },
      posicion: {
        saldoInversion: saldoRef(db, inversionId),
        instrumento: instrumentRef(db, instrumentoId),
        antes: quantityText(position.quantity),
        despues: quantityText(afterQuantity),
      },
    },
    referencia: next ? operationReference(next) : null,
    aviso: "Vista previa de solo lectura: no escribe hasta confirmar.",
  };
}

export function previewSale(
  db: Database,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db.transaction(() => {
    for (const field of Object.keys(body))
      if (!CREATE_FIELDS.includes(field as (typeof CREATE_FIELDS)[number]))
        throw unknownField(field);
    const value = validateEconomic(db, body, { full: false, now }),
      refs = saleReferences(db, body, value.fecha, value.cantidad);
    // D1 applies from the sale date onwards; a sale never reduces cash (D2).
    assertUnitsAvailable(db, {
      clase: "Venta",
      fecha: value.fecha,
      cantidad: value.cantidad,
      saldoInversion: refs.saldoInversion,
      instrumento: refs.instrumento,
    });
    const next = { ...value, ...refs };
    return {
      ...saleImpact(db, "alta", null, next),
      ...(refs.aviso ? { avisoInstrumento: refs.aviso } : {}),
      cobertura: COBERTURA,
    };
  })();
}

export function createSale(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(422, "IDEMPOTENCY_REQUIRED", "Clave de intento inválida.");
  for (const field of Object.keys(body))
    if (!CREATE_FIELDS.includes(field as (typeof CREATE_FIELDS)[number]))
      throw unknownField(field);
  return db
    .transaction(() => {
      db.run("DELETE FROM operacion_attempts WHERE expires<?", [now]);
      const hash = createHash("sha256")
        .update(
          JSON.stringify([
            ["clase", "Venta"],
            ...Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
          ]),
        )
        .digest("hex");
      const retry = db
        .query("SELECT hash,response FROM operacion_attempts WHERE key=?")
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento ya corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as ReturnType<typeof getSale>;
      }
      const value = validateEconomic(db, body, { full: false, now }),
        refs = saleReferences(db, body, value.fecha, value.cantidad);
      assertUnitsAvailable(db, {
        clase: "Venta",
        fecha: value.fecha,
        cantidad: value.cantidad,
        saldoInversion: refs.saldoInversion,
        instrumento: refs.instrumento,
      });
      const counter = db
        .query(
          "UPDATE counters SET next=next+1 WHERE name='operaciones_inversion' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) value",
        )
        .get() as { value: string } | null;
      if (!counter)
        throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
      const id = counter.value,
        time = new Date(now).toISOString();
      db.run(
        `INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,concepto,nota,estado,revision,creado,actualizado)
         VALUES(?,'Venta',?,?,?,?,?,?,?,?,?,?,?,?,'Vigente',1,?,?)`,
        [
          id,
          value.fecha,
          refs.instrumento,
          refs.saldoEfectivo,
          refs.saldoInversion,
          value.cantidad.toString(),
          value.precio.toString(),
          value.divisa,
          value.cambio?.toString() ?? null,
          value.importeEur.toString(),
          value.comisionEur?.toString() ?? null,
          value.concepto,
          value.nota,
          time,
          time,
        ],
      );
      const row = find(db, id);
      writeOperationAudit(db, id, 1, "alta", null, null, auditValue(row), now);
      const response = getSale(db, id);
      db.run("INSERT INTO operacion_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(response),
        now + 86400000,
      ]);
      return response;
    })
    .immediate();
}

function validateRectification(
  db: Database,
  body: Record<string, unknown>,
  old: OperationRow,
  now: number,
) {
  if (body.revision !== old.revision) throw ventaConflict();
  assertSaleEditable(old);
  for (const field of Object.keys(body))
    if (!["revision", "motivo", ...RECTIFICABLE].includes(field))
      throw unknownField(field);
  return validateEconomic(db, body, { full: true, now });
}

export function previewSaleRectification(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db.transaction(() => {
    const old = find(db, id),
      value = validateRectification(db, body, old, now);
    motive(body.motivo);
    assertUnitsAvailable(
      db,
      {
        clase: "Venta",
        fecha: value.fecha,
        cantidad: value.cantidad,
        saldoInversion: old.saldo_inversion,
        instrumento: old.instrumento,
      },
      {
        id,
        clase: "Venta",
        fecha: old.fecha,
        cantidad: BigInt(old.cantidad),
        saldoInversion: old.saldo_inversion,
        instrumento: old.instrumento,
      },
    );
    return {
      ...saleImpact(db, "rectificación", old, value),
      cobertura: COBERTURA,
    };
  })();
}

export function rectifySale(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db
    .transaction(() => {
      const old = find(db, id),
        value = validateRectification(db, body, old, now),
        motivo = motive(body.motivo);
      assertUnitsAvailable(
        db,
        {
          clase: "Venta",
          fecha: value.fecha,
          cantidad: value.cantidad,
          saldoInversion: old.saldo_inversion,
          instrumento: old.instrumento,
        },
        {
          id,
          clase: "Venta",
          fecha: old.fecha,
          cantidad: BigInt(old.cantidad),
          saldoInversion: old.saldo_inversion,
          instrumento: old.instrumento,
        },
      );
      // D2: a rectification that reduces the cash entry must leave no negative
      // effective cash from the affected date onwards.
      assertSufficient(
        db,
        {
          id,
          clase: "Venta",
          fecha: value.fecha,
          saldoEfectivo: old.saldo_efectivo,
          importe: value.importeEur,
        },
        {
          id,
          clase: "Venta",
          fecha: old.fecha,
          saldoEfectivo: old.saldo_efectivo,
          importe: BigInt(old.importe_eur),
        },
        { includePreviousInAvailable: true },
      );
      db.run(
        `UPDATE operaciones_inversion SET fecha=?,cantidad=?,precio_divisa=?,divisa=?,cambio=?,importe_eur=?,comision_eur=?,concepto=?,nota=?,revision=revision+1,actualizado=? WHERE id=? AND revision=?`,
        [
          value.fecha,
          value.cantidad.toString(),
          value.precio.toString(),
          value.divisa,
          value.cambio?.toString() ?? null,
          value.importeEur.toString(),
          value.comisionEur?.toString() ?? null,
          value.concepto,
          value.nota,
          new Date(now).toISOString(),
          id,
          old.revision,
        ],
      );
      const row = find(db, id);
      writeOperationAudit(
        db,
        id,
        row.revision,
        "rectificación",
        motivo,
        auditValue(old),
        auditValue(row),
        now,
      );
      return getSale(db, id);
    })
    .immediate();
}

export function previewSaleAnnulment(
  db: Database,
  id: string,
  body: Record<string, unknown>,
) {
  return db.transaction(() => {
    const old = find(db, id);
    if (body.revision !== old.revision) throw ventaConflict();
    assertSaleEditable(old);
    assertSufficient(
      db,
      {
        clase: "Venta",
        fecha: old.fecha,
        saldoEfectivo: old.saldo_efectivo,
        importe: 0n,
      },
      {
        id,
        clase: "Venta",
        fecha: old.fecha,
        saldoEfectivo: old.saldo_efectivo,
        importe: BigInt(old.importe_eur),
      },
      { includePreviousInAvailable: true },
    );
    return { ...saleImpact(db, "anulación", old, null), cobertura: COBERTURA };
  })();
}

export function annulSale(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  for (const field of Object.keys(body))
    if (!["revision", "motivo"].includes(field))
      throw unknownField(field);
  return db
    .transaction(() => {
      const old = find(db, id);
      if (body.revision !== old.revision) throw ventaConflict();
      assertSaleEditable(old);
      const motivo = motive(body.motivo);
      assertSufficient(
        db,
        {
          clase: "Venta",
          fecha: old.fecha,
          saldoEfectivo: old.saldo_efectivo,
          importe: 0n,
        },
        {
          id,
          clase: "Venta",
          fecha: old.fecha,
          saldoEfectivo: old.saldo_efectivo,
          importe: BigInt(old.importe_eur),
        },
        { includePreviousInAvailable: true },
      );
      db.run(
        "UPDATE operaciones_inversion SET estado='Anulada',revision=revision+1,actualizado=? WHERE id=? AND revision=?",
        [new Date(now).toISOString(), id, old.revision],
      );
      const row = find(db, id);
      writeOperationAudit(
        db,
        id,
        row.revision,
        "anulación",
        motivo,
        auditValue(old),
        auditValue(row),
        now,
      );
      return getSale(db, id);
    })
    .immediate();
}

export function getSale(db: Database, id: string) {
  return db.transaction(() => {
    const row = find(db, id);
    return { venta: purchaseDto(db, row), auditoria: operacionAudits(db, id) };
  })();
}

export function saleAudit(db: Database, id: string) {
  return db.transaction(() => {
    find(db, id);
    return { items: operacionAudits(db, id) };
  })();
}

export function salesForInstrumento(db: Database, instrumento: string) {
  return (
    db
      .query(
        select +
          " WHERE instrumento=? AND clase='Venta' ORDER BY fecha DESC,length(id) DESC,id DESC",
      )
      .all(instrumento) as OperationRow[]
  ).map((row) => purchaseDto(db, row));
}

export function listSales(db: Database, params = new URLSearchParams()) {
  const page = Number(params.get("page") ?? "1"),
    estado = params.get("estado") ?? "Vigente";
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !["", "Vigente", "Anulada"].includes(estado)
  )
    throw new Problem(422, "VALIDATION", "Filtro o página inválidos.");
  const from = params.get("desde"),
    to = params.get("hasta");
  if (from) civil(from);
  if (to) civil(to);
  if (from && to && from > to)
    throw new Problem(422, "VALIDATION", "El intervalo de fechas es inválido.");
  const specific = {
    saldoEfectivo: params.get("saldoEfectivo"),
    saldoInversion: params.get("saldoInversion"),
  };
  return db.transaction(() => {
    const all = (
      db
        .query(select + " WHERE clase='Venta' ORDER BY fecha DESC,length(id) DESC,id DESC")
        .all() as OperationRow[]
    )
      .filter(
        (row) =>
          (!estado || row.estado === estado) &&
          (!params.get("instrumento") ||
            row.instrumento === params.get("instrumento")) &&
          (!params.get("saldo") ||
            [row.saldo_efectivo, row.saldo_inversion].includes(
              params.get("saldo")!,
            )) &&
          (!specific.saldoEfectivo ||
            row.saldo_efectivo === specific.saldoEfectivo) &&
          (!specific.saldoInversion ||
            row.saldo_inversion === specific.saldoInversion) &&
          (!from || row.fecha >= from) &&
          (!to || row.fecha <= to),
      )
      .map((row) => saleDto(db, row)),
      summary = {
        total: all.length,
        vigentes: all.filter((row) => row.estado === "Vigente").length,
        anuladas: all.filter((row) => row.estado === "Anulada").length,
      };
    return {
      ventas: all.slice((page - 1) * 100, page * 100),
      total: all.length,
      page,
      resumen: summary,
      cobertura: COBERTURA,
    };
  })();
}

function saleDto(db: Database, row: OperationRow) {
  const dto = purchaseDto(db, row);
  return {
    ...dto,
    clase: "Venta",
    referencia: dto.referencia && {
      ...dto.referencia,
      nota: "Informativa; no corrige el importe EUR cobrado.",
    },
    avisoInstrumento:
      instrumentRef(db, row.instrumento)?.estado === "Activa"
        ? null
        : "Instrumento inactivo: la Venta se conserva con aviso.",
  };
}

// Sold facts are read through the shared operation DTO; the economic helper is
// exported for consumers that only need the exact scaled values.
export { economic };
export type { OperationRow };
