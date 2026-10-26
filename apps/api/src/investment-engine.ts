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
  comisionIncluida: bigint;
  disponible: bigint;
};

function purchaseRows(db: Database, saldoId: string, cutoff?: string) {
  return db
    .query(
      `SELECT id,fecha,CAST(importe_eur AS TEXT) importe,
        CAST(COALESCE(comision_eur,0) AS TEXT) comision
       FROM operaciones_inversion
       WHERE estado='Vigente' AND saldo_efectivo=?${cutoff ? " AND fecha<=?" : ""}`,
    )
    .all(...(cutoff ? [saldoId, cutoff] : [saldoId])) as {
    id: string;
    fecha: string;
    importe: string;
    comision: string;
  }[];
}

export function cashAt(
  db: Database,
  saldoId: string,
  cutoff?: string,
  excludePurchase?: string,
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
    for (const row of purchaseRows(db, saldoId, cutoff)) {
      if (row.id === excludePurchase) continue;
      compras += BigInt(row.importe);
      comisionIncluida += BigInt(row.comision);
    }
  const apertura = BigInt(saldo.apertura ?? "0"),
    disponible = apertura + entradas - salidas - compras;
  return {
    saldo: { ...saldo, apertura },
    entradas,
    salidas,
    compras,
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
      ventas: "0.00",
      comisionIncluida: cents(cash.comisionIncluida),
      terminoVentas:
        "Sin registro de Ventas hasta E4.2; cero estructural",
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

type PurchaseFact = {
  id?: string;
  fecha: string;
  saldoEfectivo: string;
  importe: bigint;
};

/** End-of-day sufficiency from the anchor date onwards. Throws 422 without writing. */
export function assertSufficient(
  db: Database,
  fact: PurchaseFact,
  previous?: PurchaseFact,
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
    const candidate = date >= fact.fecha ? base - fact.importe : base;
    if (!minimum || candidate < minimum.minimo)
      minimum = { fecha: date, disponible: base, minimo: candidate };
  }
  if (minimum && minimum.minimo < 0n)
    throw new Problem(
      422,
      "INSUFFICIENT_CASH",
      `Efectivo insuficiente: el mínimo resultante es ${cents(minimum.minimo)} EUR el ${minimum.fecha}.`,
      {
        saldoEfectivo: "Efectivo insuficiente a la fecha o en un saldo posterior.",
      },
      {
        disponible: cents(minimum.disponible),
        necesario: cents(fact.importe),
        minimo: cents(minimum.minimo),
        fecha: minimum.fecha,
      },
    );
  return minimum;
}

/** Current effective quantity for Saldo inversión + Instrumento. */
export function positionQuantity(
  db: Database,
  saldoInversion: string,
  instrumento: string,
  excludeOperation?: string,
) {
  const rows = db
    .query(
      `SELECT id,CAST(cantidad AS TEXT) cantidad FROM operaciones_inversion
       WHERE estado='Vigente' AND saldo_inversion=? AND instrumento=?`,
    )
    .all(saldoInversion, instrumento) as { id: string; cantidad: string }[];
  return {
    quantity: rows.reduce(
      (total, row) =>
        row.id === excludeOperation ? total : total + BigInt(row.cantidad),
      0n,
    ),
    compras: rows.filter((row) => row.id !== excludeOperation).length,
  };
}

export type PositionRow = {
  saldoInversion: { id: string; nombre: string };
  cantidad: bigint;
  compras: number;
  ultimaCompra: string | null;
};

export function positionsFor(
  db: Database,
  instrumento: string,
): PositionRow[] {
  const rows = db
    .query(
      `SELECT o.saldo_inversion id,s.nombre,o.fecha,CAST(o.cantidad AS TEXT) cantidad
       FROM operaciones_inversion o JOIN saldos s ON s.id=o.saldo_inversion
       WHERE o.estado='Vigente' AND o.instrumento=?
       ORDER BY o.saldo_inversion,o.fecha,o.id`,
    )
    .all(instrumento) as {
    id: string;
    nombre: string;
    fecha: string;
    cantidad: string;
  }[];
  const groups = new Map<
    string,
    { saldoInversion: { id: string; nombre: string }; cantidad: bigint; compras: number; ultimaCompra: string | null }
  >();
  for (const row of rows) {
    const group = groups.get(row.id) ?? {
      saldoInversion: { id: row.id, nombre: row.nombre },
      cantidad: 0n,
      compras: 0,
      ultimaCompra: null,
    };
    group.cantidad += BigInt(row.cantidad);
    group.compras++;
    if (!group.ultimaCompra || row.fecha > group.ultimaCompra)
      group.ultimaCompra = row.fecha;
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
