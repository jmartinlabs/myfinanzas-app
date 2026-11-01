import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { Problem } from "./problem";
import {
  CHANGE_SCALE,
  PRICE_SCALE,
  QUANTITY_SCALE,
  assertSufficient,
  assertUnitsAvailable,
  cashAt,
  cents,
  changeText,
  civil,
  money,
  positionQuantity,
  priceText,
  quantityText,
  referenceEur,
  scaled,
  spanishToday,
} from "./investment-engine";

export const COBERTURA =
  "Posición calculada solo con las operaciones registradas; no incluye histórico anterior no importado";
export const RECTIFICABLE = [
  "fecha",
  "cantidad",
  "precio",
  "divisa",
  "cambio",
  "importeEur",
  "comisionEur",
  "concepto",
  "nota",
] as const;
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
export type OperationRow = {
  id: string;
  fecha: string;
  clase: string;
  instrumento: string;
  saldo_efectivo: string;
  saldo_inversion: string;
  cantidad: string;
  precio_divisa: string;
  divisa: string;
  cambio: string | null;
  importe_eur: string;
  comision_eur: string | null;
  concepto: string | null;
  nota: string | null;
  estado: string;
  revision: number;
  creado: string;
  actualizado: string;
};
export type Economic = {
  fecha: string;
  cantidad: bigint;
  precio: bigint;
  divisa: string;
  cambio: bigint | null;
  importeEur: bigint;
  comisionEur: bigint | null;
  concepto: string | null;
  nota: string | null;
};
const select = `SELECT id,fecha,clase,instrumento,saldo_efectivo,saldo_inversion,
  CAST(cantidad AS TEXT) cantidad,CAST(precio_divisa AS TEXT) precio_divisa,divisa,
  CAST(cambio AS TEXT) cambio,CAST(importe_eur AS TEXT) importe_eur,
  CAST(comision_eur AS TEXT) comision_eur,concepto,nota,estado,revision,creado,actualizado
  FROM operaciones_inversion`;

function find(db: Database, id: string) {
  const row = db
    .query(select + " WHERE id=? AND clase='Compra'")
    .get(id) as OperationRow | null;
  if (!row) throw new Problem(404, "NOT_FOUND", "Compra no encontrada.");
  return row;
}
export function saldoRef(db: Database, id: string) {
  return db
    .query("SELECT id,nombre,tipo,control,estado FROM saldos WHERE id=?")
    .get(id) as
    | {
        id: string;
        nombre: string;
        tipo: string;
        control: string;
        estado: string;
      }
    | null;
}
export function instrumentRef(db: Database, id: string) {
  return db
    .query("SELECT id,nombre,estado FROM instrumentos WHERE id=?")
    .get(id) as { id: string; nombre: string; estado: string } | null;
}
export function economic(row: OperationRow): Economic {
  return {
    fecha: row.fecha,
    cantidad: BigInt(row.cantidad),
    precio: BigInt(row.precio_divisa),
    divisa: row.divisa,
    cambio: row.cambio === null ? null : BigInt(row.cambio),
    importeEur: BigInt(row.importe_eur),
    comisionEur:
      row.comision_eur === null ? null : BigInt(row.comision_eur),
    concepto: row.concepto,
    nota: row.nota,
  };
}
export function operationReference(value: Economic) {
  const cambio = value.cambio ?? 10n ** BigInt(CHANGE_SCALE),
    total = referenceEur(value.cantidad, value.precio, cambio);
  return {
    calculo: cents(total),
    diferencia: cents(value.importeEur - total),
    nota: "Informativa; no corrige el importe EUR cargado.",
  };
}
export function purchaseDto(db: Database, row: OperationRow) {
  const economicValue = economic(row);
  return {
    id: row.id,
    clase: row.clase,
    fecha: row.fecha,
    cantidad: quantityText(economicValue.cantidad),
    precio: priceText(economicValue.precio),
    divisa: row.divisa,
    cambio: row.cambio === null ? null : changeText(BigInt(row.cambio)),
    importeEur: cents(economicValue.importeEur),
    comisionEur:
      economicValue.comisionEur === null
        ? null
        : cents(economicValue.comisionEur),
    concepto: row.concepto,
    nota: row.nota,
    estado: row.estado,
    revision: row.revision,
    creadoEn: row.creado,
    actualizadoEn: row.actualizado,
    instrumento: instrumentRef(db, row.instrumento),
    saldoEfectivo: saldoRef(db, row.saldo_efectivo),
    saldoInversion: saldoRef(db, row.saldo_inversion),
    referencia: operationReference(economicValue),
  };
}
export function auditValue(row: OperationRow) {
  const value = economic(row);
  return {
    id: row.id,
    clase: row.clase,
    fecha: value.fecha,
    instrumento: row.instrumento,
    saldoEfectivo: row.saldo_efectivo,
    saldoInversion: row.saldo_inversion,
    cantidad: quantityText(value.cantidad),
    precio: priceText(value.precio),
    divisa: value.divisa,
    cambio: value.cambio === null ? null : changeText(value.cambio),
    importeEur: cents(value.importeEur),
    comisionEur:
      value.comisionEur === null ? null : cents(value.comisionEur),
    concepto: value.concepto,
    nota: value.nota,
    estado: row.estado,
    revision: row.revision,
  };
}
export function operacionAudits(db: Database, id: string) {
  return (
    db
      .query(
        "SELECT revision,accion,motivo,instante,actor,anterior,posterior FROM operacion_inversion_audit WHERE operacion=? ORDER BY revision",
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
export function writeOperationAudit(
  db: Database,
  operation: string,
  revision: number,
  action: "alta" | "rectificación" | "anulación",
  motivo: string | null,
  before: unknown,
  after: unknown,
  now: number,
) {
  db.run(
    "INSERT INTO operacion_inversion_audit VALUES(?,?,?,?,?,'usuario-unico',?,?)",
    [
      operation,
      revision,
      action,
      motivo,
      new Date(now).toISOString(),
      before === null ? null : JSON.stringify(before),
      JSON.stringify(after),
    ],
  );
}
export function text(value: unknown, field: string, max: number) {
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
export function validateEconomic(
  db: Database,
  body: Record<string, unknown>,
  options: { full: boolean; now: number },
): Economic {
  const errors: Record<string, string> = {};
  const required = [
    "fecha",
    "cantidad",
    "precio",
    "divisa",
    "importeEur",
    ...(options.full ? [] : ["instrumento", "saldoEfectivo", "saldoInversion"]),
  ];
  if (options.full)
    for (const field of RECTIFICABLE)
      if (!(field in body))
        errors[field] = "Campo obligatorio en reemplazo completo.";
  for (const field of required)
    if (!(field in body) || body[field] === undefined)
      errors[field] = "Campo obligatorio.";
  let fecha = "";
  try {
    fecha = civil(body.fecha);
    if (fecha > spanishToday(options.now))
      errors.fecha =
        "No se admiten fechas futuras. Fecha máxima: " +
        spanishToday(options.now) +
        " (España).";
  } catch {
    errors.fecha = "Indica una fecha civil válida.";
  }
  const quantity = (() => {
    try {
      return scaled(body.cantidad, QUANTITY_SCALE, "cantidad");
    } catch (error) {
      errors.cantidad =
        (error as Problem).fields.cantidad ?? "Cantidad inválida.";
      return 0n;
    }
  })();
  const price = (() => {
    try {
      return scaled(body.precio, PRICE_SCALE, "precio");
    } catch (error) {
      errors.precio = (error as Problem).fields.precio ?? "Precio inválido.";
      return 0n;
    }
  })();
  const divisa = body.divisa;
  if (typeof divisa !== "string" || !/^[A-Z]{3}$/.test(divisa))
    errors.divisa = "Divisa ISO 4217 de tres letras mayúsculas.";
  let cambio: bigint | null = null;
  if (divisa === "EUR") {
    if (
      body.cambio !== undefined &&
      body.cambio !== null &&
      body.cambio !== ""
    ) {
      if (body.cambio !== "1.000000")
        errors.cambio = 'Para EUR el único cambio admitido es "1.000000".';
      else cambio = 1_000_000n;
    }
  } else
    try {
      cambio = scaled(body.cambio, CHANGE_SCALE, "cambio");
    } catch (error) {
      errors.cambio = (error as Problem).fields.cambio ?? "Cambio inválido.";
    }
  let importe = 0n;
  try {
    importe = money(body.importeEur, "importeEur")!;
    if (importe <= 0n) throw new Error();
  } catch {
    errors.importeEur = "Importe EUR positivo, máximo dos decimales.";
  }
  let comision: bigint | null = null;
  if (
    body.comisionEur !== undefined &&
    body.comisionEur !== null &&
    body.comisionEur !== ""
  )
    try {
      comision = money(body.comisionEur, "comisionEur");
      if (comision === null || comision < 0n) throw new Error();
      if (comision > importe)
        throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
          comisionEur: "La comisión no puede superar el importe EUR.",
        });
    } catch (error) {
      errors.comisionEur =
        error instanceof Problem
          ? (error.fields.comisionEur ?? "Comisión inválida.")
          : "Comisión EUR no negativa, máximo dos decimales.";
    }
  let concepto: string | null = null,
    nota: string | null = null;
  if (
    body.concepto !== undefined &&
    body.concepto !== null &&
    body.concepto !== ""
  )
    try {
      concepto = text(body.concepto, "concepto", 2000);
    } catch (error) {
      errors.concepto =
        (error as Problem).fields.concepto ?? "Concepto inválido.";
    }
  if (body.nota !== undefined && body.nota !== null && body.nota !== "")
    try {
      nota = text(body.nota, "nota", 2000);
    } catch (error) {
      errors.nota = (error as Problem).fields.nota ?? "Nota inválida.";
    }
  if (Object.keys(errors).length)
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", errors);
  return {
    fecha,
    cantidad: quantity,
    precio: price,
    divisa: divisa as string,
    cambio,
    importeEur: importe,
    comisionEur: comision,
    concepto,
    nota,
  };
}
export function validReferences(db: Database, body: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const instrumento =
    typeof body.instrumento === "string"
      ? instrumentRef(db, body.instrumento)
      : null;
  if (!instrumento) errors.instrumento = "Selecciona un Instrumento existente.";
  else if (instrumento.estado !== "Activa")
    errors.instrumento = "El Instrumento está inactivo; no admite nuevas Compras.";
  const effective =
    typeof body.saldoEfectivo === "string"
      ? saldoRef(db, body.saldoEfectivo)
      : null;
  if (!effective) errors.saldoEfectivo = "Selecciona un Saldo de efectivo existente.";
  else if (effective.tipo !== "Efectivo" || effective.control !== "Inversiones")
    errors.saldoEfectivo = "Debe ser un Saldo Efectivo/Inversiones.";
  else if (effective.estado !== "Activa")
    errors.saldoEfectivo = "El Saldo está inactivo.";
  const inversion =
    typeof body.saldoInversion === "string"
      ? saldoRef(db, body.saldoInversion)
      : null;
  if (!inversion) errors.saldoInversion = "Selecciona un Saldo de inversión existente.";
  else if (inversion.tipo !== "Inversión" || inversion.control !== "Inversiones")
    errors.saldoInversion = "Debe ser un Saldo Inversión/Inversiones.";
  else if (inversion.estado !== "Activa")
    errors.saldoInversion = "El Saldo está inactivo.";
  if (effective?.id && inversion?.id && effective.id === inversion.id)
    errors.saldoInversion = "Efectivo e inversión deben ser distintos.";
  if (Object.keys(errors).length)
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", errors);
  return {
    instrumento: instrumento!.id,
    saldoEfectivo: effective!.id,
    saldoInversion: inversion!.id,
  };
}
function purchaseImpact(
  db: Database,
  action: "alta" | "rectificación" | "anulación",
  old: OperationRow | null,
  next: (Economic & { saldoEfectivo?: string; saldoInversion?: string; instrumento?: string }) | null,
) {
  const effectiveId = next
    ? (old?.saldo_efectivo ?? next.saldoEfectivo!)
    : old!.saldo_efectivo;
  const effective = saldoRef(db, effectiveId)!;
  const cash = cashAt(db, effectiveId);
  let afterCash = cash.disponible;
  if (old && old.estado === "Vigente") afterCash += BigInt(old.importe_eur);
  if (next) afterCash -= next.importeEur;
  const inversionId =
      old?.saldo_inversion ?? next?.saldoInversion ?? effectiveId,
    instrumentoId = old?.instrumento ?? next?.instrumento ?? "";
  const position = positionQuantity(db, inversionId, instrumentoId);
  let afterQuantity = position.quantity;
  if (old && old.estado === "Vigente") afterQuantity -= BigInt(old.cantidad);
  if (next) afterQuantity += next.cantidad;
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
export function revisionConflict(message = "La Compra ha cambiado. Revisa la versión actual.") {
  return new Problem(
    409,
    "REVISION_CONFLICT",
    message,
  );
}
export function assertEditable(row: OperationRow, label = "Compra") {
  if (row.estado !== "Vigente")
    throw new Problem(422, "VALIDATION", `La ${label} está anulada.`, {
      estado: "Estado no elegible.",
    });
}
export function motive(value: unknown) {
  const motivo = text(value, "motivo", 2000).trim();
  if (!motivo)
    throw new Problem(422, "VALIDATION", "Indica un motivo.", {
      motivo: "Motivo obligatorio.",
    });
  return motivo;
}

export function previewPurchase(
  db: Database,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db.transaction(() => {
    for (const field of Object.keys(body))
      if (!CREATE_FIELDS.includes(field as (typeof CREATE_FIELDS)[number]))
        throw new Problem(422, "VALIDATION", `Campo no editable: ${field}.`, {
          [field]: "Campo no editable.",
        });
    const value = validateEconomic(db, body, { full: false, now });
    const refs = validReferences(db, body);
    assertSufficient(db, {
      fecha: value.fecha,
      saldoEfectivo: refs.saldoEfectivo,
      importe: value.importeEur,
    });
    const next = { ...value, ...refs };
    return {
      ...purchaseImpact(
        db,
        "alta",
        null,
        next as Economic & { saldoEfectivo: string },
      ),
      cobertura: COBERTURA,
    };
  })();
}

export function createPurchase(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(422, "IDEMPOTENCY_REQUIRED", "Clave de intento inválida.");
  for (const field of Object.keys(body))
    if (!CREATE_FIELDS.includes(field as (typeof CREATE_FIELDS)[number]))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${field}.`, {
        [field]: "Campo no editable.",
      });
  return db
    .transaction(() => {
      db.run("DELETE FROM operacion_attempts WHERE expires<?", [now]);
      const hash = createHash("sha256")
        .update(
          JSON.stringify([
            ["clase", "Compra"],
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
        return JSON.parse(retry.response) as ReturnType<typeof getPurchase>;
      }
      const value = validateEconomic(db, body, { full: false, now }),
        refs = validReferences(db, body);
      assertSufficient(db, {
        fecha: value.fecha,
        saldoEfectivo: refs.saldoEfectivo,
        importe: value.importeEur,
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
         VALUES(?,'Compra',?,?,?,?,?,?,?,?,?,?,?,?,'Vigente',1,?,?)`,
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
      const response = getPurchase(db, id);
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

export function previewRectification(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db.transaction(() => {
    const old = find(db, id);
    if (body.revision !== old.revision) throw revisionConflict();
    assertEditable(old);
    for (const field of Object.keys(body))
      if (
        !["revision", "motivo", ...RECTIFICABLE].includes(field)
      )
        throw new Problem(422, "VALIDATION", `Campo no editable: ${field}.`, {
          [field]: IDENTITY_FIELDS.includes(field)
            ? "La identidad económica no se rectifica; anula y crea otra Compra."
            : "Campo no editable.",
        });
    motive(body.motivo);
    const value = validateEconomic(db, body, { full: true, now });
    assertUnitsAvailable(
      db,
      {
        clase: "Compra",
        fecha: value.fecha,
        cantidad: value.cantidad,
        saldoInversion: old.saldo_inversion,
        instrumento: old.instrumento,
      },
      {
        id,
        clase: "Compra",
        fecha: old.fecha,
        cantidad: BigInt(old.cantidad),
        saldoInversion: old.saldo_inversion,
        instrumento: old.instrumento,
      },
    );
    assertSufficient(
      db,
      {
        id,
        fecha: value.fecha,
        saldoEfectivo: old.saldo_efectivo,
        importe: value.importeEur,
      },
      {
        id,
        fecha: old.fecha,
        saldoEfectivo: old.saldo_efectivo,
        importe: BigInt(old.importe_eur),
      },
    );
    return {
      ...purchaseImpact(db, "rectificación", old, value),
      cobertura: COBERTURA,
    };
  })();
}

export function rectifyPurchase(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db
    .transaction(() => {
      const old = find(db, id);
      if (body.revision !== old.revision) throw revisionConflict();
      assertEditable(old);
      for (const field of Object.keys(body))
        if (!["revision", "motivo", ...RECTIFICABLE].includes(field))
          throw new Problem(422, "VALIDATION", `Campo no editable: ${field}.`, {
            [field]: IDENTITY_FIELDS.includes(field)
              ? "La identidad económica no se rectifica; anula y crea otra Compra."
              : "Campo no editable.",
          });
      const motivo = motive(body.motivo),
        value = validateEconomic(db, body, { full: true, now });
      assertUnitsAvailable(
        db,
        {
          clase: "Compra",
          fecha: value.fecha,
          cantidad: value.cantidad,
          saldoInversion: old.saldo_inversion,
          instrumento: old.instrumento,
        },
        {
          id,
          clase: "Compra",
          fecha: old.fecha,
          cantidad: BigInt(old.cantidad),
          saldoInversion: old.saldo_inversion,
          instrumento: old.instrumento,
        },
      );
      assertSufficient(
        db,
        {
          id,
          fecha: value.fecha,
          saldoEfectivo: old.saldo_efectivo,
          importe: value.importeEur,
        },
        {
          id,
          fecha: old.fecha,
          saldoEfectivo: old.saldo_efectivo,
          importe: BigInt(old.importe_eur),
        },
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
      return getPurchase(db, id);
    })
    .immediate();
}

export function previewAnnulment(
  db: Database,
  id: string,
  body: Record<string, unknown>,
) {
  return db.transaction(() => {
    const old = find(db, id);
    if (body.revision !== old.revision) throw revisionConflict();
    assertEditable(old);
    assertUnitsAvailable(
      db,
      {
        clase: "Compra",
        fecha: old.fecha,
        cantidad: 0n,
        saldoInversion: old.saldo_inversion,
        instrumento: old.instrumento,
      },
      {
        id,
        clase: "Compra",
        fecha: old.fecha,
        cantidad: BigInt(old.cantidad),
        saldoInversion: old.saldo_inversion,
        instrumento: old.instrumento,
      },
    );
    return { ...purchaseImpact(db, "anulación", old, null), cobertura: COBERTURA };
  })();
}

export function annulPurchase(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  for (const field of Object.keys(body))
    if (!["revision", "motivo"].includes(field))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${field}.`, {
        [field]: "Campo no editable.",
      });
  return db
    .transaction(() => {
      const old = find(db, id);
      if (body.revision !== old.revision) throw revisionConflict();
      assertEditable(old);
      const motivo = motive(body.motivo);
      assertUnitsAvailable(
        db,
        {
          clase: "Compra",
          fecha: old.fecha,
          cantidad: 0n,
          saldoInversion: old.saldo_inversion,
          instrumento: old.instrumento,
        },
        {
          id,
          clase: "Compra",
          fecha: old.fecha,
          cantidad: BigInt(old.cantidad),
          saldoInversion: old.saldo_inversion,
          instrumento: old.instrumento,
        },
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
      return getPurchase(db, id);
    })
    .immediate();
}

export function getPurchase(db: Database, id: string) {
  return db.transaction(() => {
    const row = find(db, id);
    return { compra: purchaseDto(db, row), auditoria: operacionAudits(db, id) };
  })();
}

export function purchaseAudit(db: Database, id: string) {
  return db.transaction(() => {
    find(db, id);
    return { items: operacionAudits(db, id) };
  })();
}

export function purchasesForInstrumento(db: Database, instrumento: string) {
  return (
    db
      .query(select + " WHERE instrumento=? AND clase='Compra' ORDER BY fecha DESC,length(id) DESC,id DESC")
      .all(instrumento) as OperationRow[]
  ).map((row) => purchaseDto(db, row));
}

export function listPurchases(
  db: Database,
  params = new URLSearchParams(),
) {
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
  if (from) civil(from, "desde");
  if (to) civil(to, "hasta");
  if (from && to && from > to)
    throw new Problem(422, "VALIDATION", "El intervalo de fechas es inválido.");
  const specific = {
    saldoEfectivo: params.get("saldoEfectivo"),
    saldoInversion: params.get("saldoInversion"),
  };
  return db.transaction(() => {
    const all = (db.query(select + " WHERE clase='Compra' ORDER BY fecha DESC,length(id) DESC,id DESC").all() as OperationRow[])
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
      .map((row) => purchaseDto(db, row)),
      summary = {
        total: all.length,
        vigentes: all.filter((row) => row.estado === "Vigente").length,
        anuladas: all.filter((row) => row.estado === "Anulada").length,
      };
    return {
      compras: all.slice((page - 1) * 100, page * 100),
      total: all.length,
      page,
      resumen: summary,
      cobertura: COBERTURA,
    };
  })();
}
