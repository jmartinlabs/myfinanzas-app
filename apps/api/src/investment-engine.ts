import type { Database } from "bun:sqlite";
import { Problem } from "./problem";

/** Exact scaled-integer helpers for E4.1. No floating point is used for money. */
export const QUANTITY_SCALE = 8;
export const PRICE_SCALE = 6;
export const CHANGE_SCALE = 6;
export const MAX_INPUT = 9007199254740991n; // 2^53-1
const DECIMAL = /^(0|[1-9]\d*)(?:\.(\d+))?$/;

export function civil(value: unknown, field = "fecha"): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith("0000-")
  )
    throw new Problem(422, "VALIDATION", "Indica una fecha civil válida.", {
      [field]: "Fecha civil inválida.",
    });
  const date = new Date(value + "T00:00:00.000Z");
  if (
    !Number.isFinite(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new Problem(422, "VALIDATION", "Indica una fecha civil válida.", {
      [field]: "Fecha civil inválida.",
    });
  return value;
}

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

export function scaled(
  value: unknown,
  scale: number,
  field: string,
  positive = true,
): bigint {
  const error = (reason: string) =>
    new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      [field]: reason,
    });
  if (typeof value !== "string" || !DECIMAL.test(value.trim()))
    throw error("Decimal exacto requerido, sin exponentes ni símbolos.");
  const text = value.trim();
  const [, whole, fraction = ""] = text.match(DECIMAL)!;
  if (fraction.length > scale)
    throw error(`Máximo ${scale} decimales; no se redondea.`);
  let n =
    BigInt(whole) * 10n ** BigInt(scale) +
    BigInt(fraction.padEnd(scale, "0"));
  if (positive && n <= 0n) throw error("Debe ser mayor que cero.");
  if (n > MAX_INPUT)
    throw error("Valor por encima del límite exacto admitido (2^53-1).");
  return n;
}

export function money(
  value: unknown,
  field: string,
  options: { allowNull?: boolean; negative?: boolean } = {},
): bigint | null {
  if (value === null || value === "") {
    if (options.allowNull) return null;
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      [field]: "Importe EUR obligatorio.",
    });
  }
  if (typeof value !== "string" || !/^-?(0|[1-9]\d*)(\.\d{1,2})?$/.test(value))
    throw new Problem(
      422,
      "VALIDATION",
      "Importe EUR inválido; máximo dos decimales.",
      { [field]: "Importe EUR exacto, máximo dos decimales." },
    );
  const negative = value.startsWith("-");
  if (negative && !options.negative)
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      [field]: "No puede ser negativo.",
    });
  const [whole, dec = ""] = value.replace("-", "").split(".");
  const n = BigInt(whole) * 100n + BigInt(dec.padEnd(2, "0"));
  if (n > 9223372036854775807n)
    throw new Problem(422, "VALIDATION", "Importe fuera del rango técnico.", {
      [field]: "Importe fuera del rango técnico.",
    });
  return negative ? -n : n;
}

export function cents(value: bigint): string {
  const abs = value < 0n ? -value : value;
  return `${value < 0n ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}

export function scaledText(
  value: bigint,
  scale: number,
  minimumDecimals = 0,
): string {
  const negative = value < 0n,
    abs = negative ? -value : value,
    base = 10n ** BigInt(scale);
  let whole = (abs / base).toString(),
    fraction = String(abs % base).padStart(scale, "0");
  while (fraction.length > minimumDecimals && fraction.endsWith("0"))
    fraction = fraction.slice(0, -1);
  return `${negative ? "-" : ""}${whole}${fraction ? "." + fraction : ""}`;
}

export const quantityText = (value: bigint) =>
  scaledText(value, QUANTITY_SCALE, 0);
export const priceText = (value: bigint) =>
  scaledText(value, PRICE_SCALE, 2);
export const changeText = (value: bigint) => scaledText(value, CHANGE_SCALE, 6);

export function investmentInstalled(db: Database) {
  return !!db
    .query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='operaciones_inversion'",
    )
    .get();
}

type Cash = {
  saldo: {
    id: string;
    nombre: string;
    tipo: string;
    control: string;
    estado: string;
    apertura: bigint;
  };
  entradas: bigint;
  salidas: bigint;
  compras: bigint;
  ventas: bigint;
  comisionIncluida: bigint;
  disponible: bigint;
};

function operationCashRows(
  db: Database,
  saldoId: string,
  cutoff?: string,
) {
  return db
    .query(
      `SELECT id,clase,CAST(importe_eur AS TEXT) importe,
        CAST(COALESCE(comision_eur,0) AS TEXT) comision
       FROM operaciones_inversion
       WHERE estado='Vigente' AND saldo_efectivo=?${cutoff ? " AND fecha<=?" : ""}`,
    )
    .all(...(cutoff ? [saldoId, cutoff] : [saldoId])) as {
    id: string;
    clase: string;
    importe: string;
    comision: string;
  }[];
}

export function cashAt(
  db: Database,
  saldoId: string,
  cutoff?: string,
  excludeOperation?: string,
): Cash {
  const saldo = db
    .query(
      "SELECT id,nombre,tipo,control,estado,CAST(apertura AS TEXT) apertura FROM saldos WHERE id=?",
    )
    .get(saldoId) as {
    id: string;
    nombre: string;
    tipo: string;
    control: string;
    estado: string;
    apertura: string | null;
  } | null;
  if (!saldo) throw new Problem(404, "NOT_FOUND", "Saldo no encontrado.");
  let entradas = 0n,
    salidas = 0n,
    compras = 0n,
    ventas = 0n,
    comisionIncluida = 0n;
  const movements = db
    .query(
      `SELECT origen,destino,CAST(importe AS TEXT) importe FROM movimientos
       WHERE anulado=0${cutoff ? " AND fecha<=?" : ""} AND (origen=? OR destino=?)`,
    )
    .all(...(cutoff ? [cutoff, saldoId, saldoId] : [saldoId, saldoId])) as {
    origen: string;
    destino: string;
    importe: string;
  }[];
  for (const row of movements) {
    const amount = BigInt(row.importe);
    if (row.destino === saldoId) entradas += amount;
    if (row.origen === saldoId) salidas += amount;
  }
  if (investmentInstalled(db))
    for (const row of operationCashRows(db, saldoId, cutoff)) {
      if (row.id === excludeOperation) continue;
      if (row.clase === "Venta") ventas += BigInt(row.importe);
      else compras += BigInt(row.importe);
      comisionIncluida += BigInt(row.comision);
    }
  const apertura = BigInt(saldo.apertura ?? "0"),
    disponible = apertura + entradas - salidas - compras + ventas;
  return {
    saldo: { ...saldo, apertura },
    entradas,
    salidas,
    compras,
    ventas,
    comisionIncluida,
    disponible,
  };
}

export function cashDto(db: Database, saldoId: string, fecha: string | null) {
  const cash = cashAt(db, saldoId, fecha ?? undefined);
  if (cash.saldo.tipo !== "Efectivo" || cash.saldo.control !== "Inversiones")
    throw new Problem(
      422,
      "VALIDATION",
      "El Saldo no es un Saldo de efectivo de inversión.",
      { saldo: "Selecciona un Saldo Efectivo/Inversiones." },
    );
  return {
    efectivo: {
      saldo: {
        id: cash.saldo.id,
        nombre: cash.saldo.nombre,
        tipo: cash.saldo.tipo,
        control: cash.saldo.control,
      },
      fecha,
      vista: fecha ? "corte" : "actual",
      apertura: cents(cash.saldo.apertura),
      entradas: cents(cash.entradas),
      salidas: cents(cash.salidas),
      compras: cents(cash.compras),
      ventas: cents(cash.ventas),
      comisionIncluida: cents(cash.comisionIncluida),
      terminoVentas: "Ventas vigentes del bróker; término + del motor único.",
      disponible: cents(cash.disponible),
      condicion: "calculado",
      ...(fecha
        ? {
            nota:
              "Corte de suficiencia a la fecha indicada; no es la cifra actual.",
          }
        : {}),
    },
  };
}

type InvestmentFact = {
  id?: string;
  clase?: "Compra" | "Venta";
  fecha: string;
  saldoEfectivo: string;
  importe: bigint;
};

/** Signed cash effect of an investment operation: Compras subtract, Ventas add. */
export function cashSign(clase: string | undefined) {
  return clase === "Venta" ? 1n : -1n;
}

/** End-of-day sufficiency from the anchor date onwards. Throws 422 without writing. */
export function assertSufficient(
  db: Database,
  fact: InvestmentFact,
  previous?: InvestmentFact,
  options: { includePreviousInAvailable?: boolean } = {},
) {
  const anchor =
    previous && previous.fecha < fact.fecha ? previous.fecha : fact.fecha;
  const dates = new Set<string>([anchor, fact.fecha]);
  for (const row of db
    .query(
      `SELECT fecha FROM movimientos WHERE anulado=0 AND fecha>=? AND (origen=? OR destino=?)`,
    )
    .all(anchor, fact.saldoEfectivo, fact.saldoEfectivo) as {
    fecha: string;
  }[])
    dates.add(row.fecha);
  for (const row of db
    .query(
      `SELECT fecha FROM operaciones_inversion WHERE estado='Vigente' AND fecha>=? AND saldo_efectivo=?`,
    )
    .all(anchor, fact.saldoEfectivo) as { fecha: string }[])
    dates.add(row.fecha);
  let minimum: { fecha: string; disponible: bigint; minimo: bigint } | null =
    null;
  for (const date of [...dates].sort()) {
    const base = cashAt(
      db,
      fact.saldoEfectivo,
      date,
      previous?.id,
    ).disponible;
    const candidate =
      date >= fact.fecha
        ? base + cashSign(fact.clase) * fact.importe
        : base;
    if (!minimum || candidate < minimum.minimo)
      minimum = {
        fecha: date,
        disponible:
          options.includePreviousInAvailable &&
          previous &&
          previous.fecha <= date
            ? base + cashSign(previous.clase) * previous.importe
            : base,
        minimo: candidate,
      };
  }
  if (minimum && minimum.minimo < 0n) {
    const necesario =
      fact.importe > 0n ? fact.importe : (previous?.importe ?? 0n);
    throw new Problem(
      422,
      "INSUFFICIENT_CASH",
      `Efectivo insuficiente: el mínimo resultante es ${cents(minimum.minimo)} EUR el ${minimum.fecha}.`,
      {
        saldoEfectivo: "Efectivo insuficiente a la fecha o en un saldo posterior.",
      },
      {
        disponible: cents(minimum.disponible),
        necesario: cents(necesario),
        minimo: cents(minimum.minimo),
        fecha: minimum.fecha,
      },
    );
  }
  return minimum;
}

type UnitsFact = {
  id?: string;
  clase?: "Compra" | "Venta";
  fecha: string;
  cantidad: bigint;
  saldoInversion: string;
  instrumento: string;
};

/** Signed quantity effect: Compras add, Ventas subtract. */
function quantitySign(clase: string | undefined) {
  return clase === "Venta" ? -1n : 1n;
}

function quantityAt(
  db: Database,
  saldoInversion: string,
  instrumento: string,
  date: string,
  exclude?: string,
) {
  const rows = db
    .query(
      `SELECT id,clase,CAST(cantidad AS TEXT) cantidad FROM operaciones_inversion
       WHERE estado='Vigente' AND saldo_inversion=? AND instrumento=? AND fecha<=?`,
    )
    .all(saldoInversion, instrumento, date) as {
    id: string;
    clase: string;
    cantidad: string;
  }[];
  return rows.reduce(
    (total, row) =>
      row.id === exclude
        ? total
        : total + quantitySign(row.clase) * BigInt(row.cantidad),
    0n,
  );
}

/** Effective quantity of the pair at the end of `date` (DT2 aggregation). */
export function positionAtDate(
  db: Database,
  saldoInversion: string,
  instrumento: string,
  date: string,
) {
  return quantityAt(db, saldoInversion, instrumento, date);
}

/**
 * End-of-day non-negative quantity for `saldo_inversion + instrumento`
 * (SPEC22 D1/D7). Evaluates `candidato(t)` from the anchor date onwards so a
 * retroactive operation cannot leave a later negative quantity. Throws 422
 * `INSUFFICIENT_UNITS` without writing; never uses floating point.
 */
export function assertUnitsAvailable(
  db: Database,
  fact: UnitsFact,
  previous?: UnitsFact,
) {
  const anchor =
    previous && previous.fecha < fact.fecha ? previous.fecha : fact.fecha;
  const dates = new Set<string>([anchor, fact.fecha]);
  for (const row of db
    .query(
      `SELECT fecha FROM operaciones_inversion
       WHERE estado='Vigente' AND saldo_inversion=? AND instrumento=? AND fecha>=?`,
    )
    .all(fact.saldoInversion, fact.instrumento, anchor) as { fecha: string }[])
    dates.add(row.fecha);
  let minimum: { fecha: string; disponible: bigint; minimo: bigint } | null =
    null;
  for (const date of [...dates].sort()) {
    const base = quantityAt(
        db,
        fact.saldoInversion,
        fact.instrumento,
        date,
        previous?.id,
      ),
      candidate =
        date >= fact.fecha
          ? base + quantitySign(fact.clase) * fact.cantidad
          : base,
      disponible = quantityAt(
        db,
        fact.saldoInversion,
        fact.instrumento,
        date,
      );
    if (!minimum || candidate < minimum.minimo)
      minimum = { fecha: date, disponible, minimo: candidate };
  }
  if (minimum && minimum.minimo < 0n) {
    const necesario =
      previous && previous.cantidad > fact.cantidad
        ? previous.cantidad
        : fact.cantidad;
    throw new Problem(
      422,
      "INSUFFICIENT_UNITS",
      `Cantidad insuficiente: el mínimo resultante es ${quantityText(minimum.minimo)} el ${minimum.fecha}.`,
      {
        cantidad: "Cantidad no disponible a la fecha o en una fecha posterior.",
      },
      {
        disponible: quantityText(minimum.disponible),
        necesario: quantityText(necesario),
        minimo: quantityText(minimum.minimo),
        fecha: minimum.fecha,
        saldoInversion: fact.saldoInversion,
        instrumento: fact.instrumento,
      },
    );
  }
  return minimum;
}

/** Current effective quantity for Saldo inversión + Instrumento (Compras − Ventas). */
export function positionQuantity(
  db: Database,
  saldoInversion: string,
  instrumento: string,
  excludeOperation?: string,
) {
  const rows = db
    .query(
      `SELECT id,clase,CAST(cantidad AS TEXT) cantidad FROM operaciones_inversion
       WHERE estado='Vigente' AND saldo_inversion=? AND instrumento=?`,
    )
    .all(saldoInversion, instrumento) as {
    id: string;
    clase: string;
    cantidad: string;
  }[];
  let quantity = 0n,
    compras = 0,
    ventas = 0;
  for (const row of rows) {
    if (row.id === excludeOperation) continue;
    quantity += quantitySign(row.clase) * BigInt(row.cantidad);
    if (row.clase === "Venta") ventas++;
    else compras++;
  }
  return { quantity, compras, ventas };
}

export type PositionRow = {
  saldoInversion: { id: string; nombre: string };
  cantidad: bigint;
  compras: number;
  ventas: number;
  ultimaCompra: string | null;
  ultimaVenta: string | null;
  ultimaOperacion: string | null;
};

/**
 * One row per Saldo de inversión where the Instrumento has any operation
 * registered, including annulled ones (SPEC22 §4.3, D5). Quantity, counts and
 * dates come from vigente operations only.
 */
export function positionsFor(
  db: Database,
  instrumento: string,
): PositionRow[] {
  const rows = db
    .query(
      `SELECT o.saldo_inversion id,s.nombre,o.fecha,o.clase,o.estado,
        CAST(o.cantidad AS TEXT) cantidad
       FROM operaciones_inversion o JOIN saldos s ON s.id=o.saldo_inversion
       WHERE o.instrumento=?
       ORDER BY o.saldo_inversion,o.fecha,o.id`,
    )
    .all(instrumento) as {
    id: string;
    nombre: string;
    fecha: string;
    clase: string;
    estado: string;
    cantidad: string;
  }[];
  const groups = new Map<string, PositionRow>();
  for (const row of rows) {
    const group = groups.get(row.id) ?? {
      saldoInversion: { id: row.id, nombre: row.nombre },
      cantidad: 0n,
      compras: 0,
      ventas: 0,
      ultimaCompra: null,
      ultimaVenta: null,
      ultimaOperacion: null,
    };
    if (row.estado === "Vigente") {
      group.cantidad += quantitySign(row.clase) * BigInt(row.cantidad);
      if (row.clase === "Venta") group.ventas++;
      else group.compras++;
      if (row.clase === "Venta") {
        if (!group.ultimaVenta || row.fecha > group.ultimaVenta)
          group.ultimaVenta = row.fecha;
      } else if (!group.ultimaCompra || row.fecha > group.ultimaCompra)
        group.ultimaCompra = row.fecha;
      if (!group.ultimaOperacion || row.fecha > group.ultimaOperacion)
        group.ultimaOperacion = row.fecha;
    }
    groups.set(row.id, group);
  }
  return [...groups.values()];
}

/** Informative cantidad × precio × cambio reference, exact internally. */
export function referenceEur(
  cantidad: bigint,
  precio: bigint,
  cambio: bigint,
) {
  const denominator =
    10n **
    BigInt(QUANTITY_SCALE + PRICE_SCALE + CHANGE_SCALE - 2);
  const numerator = cantidad * precio * cambio,
    rounded = (numerator + denominator / 2n) / denominator;
  return rounded;
}
