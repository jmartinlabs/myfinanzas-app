import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createSaldo, getSaldo, updateSaldo } from "./saldos";
import {
  changeInstrumentoState,
  createInstrumento,
  getInstrumento,
  instrumentOptions,
} from "./instrumentos";
import {
  annulPurchase,
  createPurchase,
  getPurchase,
  listPurchases,
  purchasesForInstrumento,
  rectifyPurchase,
  validateEconomic,
} from "./compras";
import {
  annulSale,
  createSale,
  getSale,
  listSales,
  previewSale,
  previewSaleAnnulment,
  previewSaleRectification,
  rectifySale,
  saleAudit,
} from "./ventas";
import {
  cashAt,
  cashDto,
  cents,
  positionQuantity,
  spanishToday,
} from "./investment-engine";
import { createClassification } from "./clasificacion";
import { previewMovement, writeMovement } from "./movimientos";
import { financeRevision } from "./movement-ledger";
import { financialReference, cycleContext } from "./ciclos";
import { investmentSource } from "./investment-ledger";
import { Problem } from "./problem";
import { verifyContract } from "./schema-contract";
import { materializeContract } from "../test-support/inversiones-schema";

const now = Date.parse("2026-10-26T12:00:00Z");
const origin = "http://127.0.0.1:5173";

/**
 * Fictional SPEC22 fixture. The documented S003 opening is 1.000,00 EUR with
 * 2.500,00 entries and 300,00 exits; those Movements are not needed here, so the
 * Saldo opening stores their net (3.200,00) and the broker cash is identical.
 */
function base(opening = "3200.00") {
  const db = openDatabase(":memory:");
  updateSaldo(db, "S003", {
    revision: getSaldo(db, "S003").revision,
    saldoApertura: opening,
    fechaApertura: "2026-01-01",
    permiteSalidaExterior: true,
  });
  const instrumento = createInstrumento(
    db,
    {
      nombre: "Fondo índice demo",
      isin: "ES0000000001",
      isinEvidencia: "Extracto ficticio F-01 · 2026-01-10",
      divisaReferencia: "EUR",
    },
    randomUUID(),
    now,
  ).instrumento;
  createSaldo(
    db,
    {
      nombre: "Cartera secundaria demo",
      tipo: "Inversión",
      control: "Inversiones",
    },
    randomUUID(),
    now,
  );
  return { db, instrumento };
}

function buy(
  db: Database,
  instrumento: string,
  over: Record<string, unknown> = {},
) {
  return createPurchase(
    db,
    {
      fecha: "2026-02-10",
      instrumento,
      saldoEfectivo: "S003",
      saldoInversion: "S004",
      cantidad: "12.5",
      precio: "100.00",
      divisa: "USD",
      cambio: "0.900000",
      importeEur: "1125.00",
      comisionEur: "5.00",
      concepto: "Compra P1 demo",
      nota: null,
      ...over,
    },
    randomUUID(),
    now,
  );
}

function sell(
  db: Database,
  instrumento: string,
  over: Record<string, unknown> = {},
  at = now,
) {
  return createSale(
    db,
    {
      fecha: "2026-04-10",
      instrumento,
      saldoEfectivo: "S003",
      saldoInversion: "S004",
      cantidad: "5",
      precio: "110.00",
      divisa: "USD",
      cambio: "0.920000",
      importeEur: "506.00",
      comisionEur: "2.00",
      concepto: "Venta V1 demo",
      nota: null,
      ...over,
    },
    randomUUID(),
    at,
  );
}

function p2(db: Database, instrumento: string) {
  return buy(db, instrumento, {
    fecha: "2026-03-03",
    saldoInversion: "S006",
    cantidad: "3",
    precio: "98.00",
    importeEur: "264.60",
    comisionEur: "0.00",
    concepto: "Compra P2 demo",
  });
}

function failure(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    return error as Problem;
  }
  throw new Error("Se esperaba un error de dominio.");
}

function count(db: Database, table: string) {
  return (db.query(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n;
}

function snapshot(db: Database) {
  return JSON.stringify(
    [
      "instrumentos",
      "operaciones_inversion",
      "operacion_inversion_audit",
      "operacion_attempts",
      "counters",
      "movimientos",
    ].map((table) => [
      table,
      db.query(`SELECT * FROM ${table} ORDER BY 1`).all(),
    ]),
  );
}

const rectification = (
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({
  revision: 1,
  motivo: "Corrección de cantidad ficticia",
  fecha: "2026-04-10",
  cantidad: "3",
  precio: "110.00",
  divisa: "USD",
  cambio: "0.920000",
  importeEur: "303.00",
  comisionEur: "1.00",
  concepto: "Venta V1 demo",
  nota: null,
  ...over,
});

test("E4.2-AC-01/02/03/07/17: Venta EUR y USD, comisión incluida, sin Movimiento", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id); // P1
    p2(db, instrumento.id); // P2
    expect(cashAt(db, "S003").disponible).toBe(181040n);
    expect(positionQuantity(db, "S004", instrumento.id).quantity).toBe(
      1250000000n,
    );
    const movements = count(db, "movimientos");
    const s001 = getSaldo(db, "S001").posicion.importe;

    const eur = sell(db, instrumento.id, {
      cantidad: "5",
      precio: "110.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "550.00",
      comisionEur: null,
      concepto: "Venta EUR demo",
    });
    expect(eur.venta).toMatchObject({
      clase: "Venta",
      cantidad: "5",
      divisa: "EUR",
      cambio: null,
      importeEur: "550.00",
      comisionEur: null,
      estado: "Vigente",
      revision: 1,
    });
    expect(cashAt(db, "S003").disponible).toBe(236040n);
    expect(cashDto(db, "S003", null).efectivo).toMatchObject({
      compras: "1389.60",
      ventas: "550.00",
      disponible: "2360.40",
    });
    expect(positionQuantity(db, "S004", instrumento.id)).toMatchObject({
      quantity: 750000000n,
      compras: 1,
      ventas: 1,
    });
    expect(count(db, "movimientos")).toBe(movements);
    expect(getSaldo(db, "S001").posicion.importe).toBe(s001);
    expect(getSale(db, eur.venta.id).auditoria).toMatchObject([
      { accion: "alta", revision: 1, motivo: null },
    ]);
  } finally {
    db.close();
  }
});

test("E4.2-AC-02/07: la Venta USD conserva cambio, EUR y comisión; no recalcula", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    p2(db, instrumento.id);
    const v1 = sell(db, instrumento.id);
    expect(cashAt(db, "S003").disponible).toBe(231640n);
    expect(v1.venta).toMatchObject({
      divisa: "USD",
      precio: "110.00",
      cambio: "0.920000",
      importeEur: "506.00",
      comisionEur: "2.00",
      referencia: { calculo: "506.00", diferencia: "0.00" },
    });
    // A later operation with another historical factor never rewrites V1.
    sell(db, instrumento.id, {
      fecha: "2026-04-15",
      cantidad: "2",
      precio: "112.00",
      cambio: "0.950000",
      importeEur: "212.80",
      comisionEur: "0.00",
      concepto: "Venta posterior demo",
    });
    expect(getSale(db, v1.venta.id).venta).toMatchObject({
      cambio: "0.920000",
      importeEur: "506.00",
      comisionEur: "2.00",
    });
    expect(cashAt(db, "S003").disponible).toBe(231640n + 21280n);
    // The commission is already included: cash moves exactly by EUR 506,00.
    const commission = sell(db, instrumento.id, {
      fecha: "2026-04-16",
      cantidad: "0.5",
      importeEur: "50.00",
      comisionEur: "50.00",
      concepto: "Comisión igual al importe",
    });
    expect(commission.venta.comisionEur).toBe("50.00");
    expect(cashAt(db, "S003").disponible).toBe(231640n + 21280n + 5000n);
  } finally {
    db.close();
  }
});

test("E4.2-AC-04/18/19/35: Venta total a 0, ficha con conteos y reapertura sin «Cerrada»", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id); // P1
    p2(db, instrumento.id); // P2 en S006
    sell(db, instrumento.id); // V1 5
    const v2 = sell(db, instrumento.id, {
      fecha: "2026-04-15",
      cantidad: "7.5",
      precio: "112.00",
      cambio: "0.930000",
      importeEur: "781.20",
      comisionEur: "1.20",
      concepto: "Venta total V2 demo",
    });
    expect(v2.venta.referencia).toMatchObject({
      calculo: "781.20",
      diferencia: "0.00",
    });
    expect(cashAt(db, "S003").disponible).toBe(309760n);
    const ficha = getInstrumento(db, instrumento.id);
    expect(ficha.posiciones).toMatchObject([
      {
        saldoInversion: { id: "S004" },
        cantidad: "0",
        compras: 1,
        ventas: 2,
        ultimaCompra: "2026-02-10",
        ultimaVenta: "2026-04-15",
        ultimaOperacion: "2026-04-15",
      },
      {
        saldoInversion: { id: "S006" },
        cantidad: "3",
        compras: 1,
        ventas: 0,
        ultimaCompra: "2026-03-03",
        ultimaVenta: null,
      },
    ]);
    expect(JSON.stringify(ficha)).not.toContain("Cerrada");
    expect(ficha.valoracion).toEqual({
      estado: "No disponible",
      motivo: "Valoración E4.3 no entregada",
    });
    expect(ficha.cobertura).toContain("histórico anterior no importado");
    // P3 reopens the position without a Estado change.
    buy(db, instrumento.id, {
      fecha: "2026-05-02",
      cantidad: "2",
      precio: "100.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "200.00",
      comisionEur: "0.00",
      concepto: "Compra P3 demo",
    });
    const reopened = getInstrumento(db, instrumento.id).posiciones[0];
    expect(reopened).toMatchObject({
      cantidad: "2",
      compras: 2,
      ventas: 2,
    });
    expect(cashAt(db, "S003").disponible).toBe(309760n - 20000n);
    expect(JSON.stringify(getInstrumento(db, instrumento.id))).not.toContain(
      "Cerrada",
    );
  } finally {
    db.close();
  }
});

test("E4.2-AC-05 (D1=A): cantidad insuficiente con ventana posterior y sin escritura", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id); // P1 12,5
    sell(db, instrumento.id); // V1 5 => 7,5
    const empty = createInstrumento(
      db,
      { nombre: "Fondo sin posición demo" },
      randomUUID(),
      now,
    ).instrumento;
    const before = snapshot(db);
    const a = failure(() =>
      sell(db, instrumento.id, {
        fecha: "2026-04-20",
        cantidad: "8",
        importeEur: "880.00",
      }),
    );
    expect(a).toMatchObject({
      status: 422,
      code: "INSUFFICIENT_UNITS",
      details: {
        disponible: "7.5",
        necesario: "8",
        minimo: "-0.5",
        fecha: "2026-04-20",
        saldoInversion: "S004",
        instrumento: instrumento.id,
      },
    });
    expect(snapshot(db)).toBe(before);

    // Instrumento without any position in S004.
    const b = failure(() =>
      sell(db, empty.id, {
        fecha: "2026-04-20",
        cantidad: "1",
        importeEur: "10.00",
      }),
    );
    expect(b.details).toMatchObject({
      disponible: "0",
      necesario: "1",
      minimo: "-1",
      fecha: "2026-04-20",
    });
    expect(snapshot(db)).toBe(before);

    // F-C: position 0 after 15/04; a retroactive sale on 01/03 is rejected at 15/04.
    sell(db, instrumento.id, {
      fecha: "2026-04-15",
      cantidad: "7.5",
      precio: "112.00",
      cambio: "0.930000",
      importeEur: "781.20",
      comisionEur: "1.20",
      concepto: "Venta total demo",
    });
    const c = failure(() =>
      sell(db, instrumento.id, {
        fecha: "2026-03-01",
        cantidad: "1",
        importeEur: "10.00",
      }),
    );
    expect(c.details).toMatchObject({
      disponible: "0",
      necesario: "1",
      minimo: "-1",
      fecha: "2026-04-15",
    });

    // Same day: P3 2 and V5 2 on 02/05, then V6 1 is rejected in both orders.
    buy(db, instrumento.id, {
      fecha: "2026-05-02",
      cantidad: "2",
      precio: "220.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "200.00",
      comisionEur: "0.00",
      concepto: "P3 mismo día",
    });
    sell(db, instrumento.id, {
      fecha: "2026-05-02",
      cantidad: "2",
      precio: "220.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "220.00",
      comisionEur: null,
      concepto: "V5 mismo día",
    });
    const forward = failure(() =>
      sell(db, instrumento.id, {
        fecha: "2026-05-02",
        cantidad: "1",
        importeEur: "110.00",
        concepto: "V6 mismo día",
      }),
    );
    expect(forward.details).toMatchObject({
      disponible: "0",
      necesario: "1",
      minimo: "-1",
      fecha: "2026-05-02",
    });

    const second = base();
    try {
      buy(second.db, second.instrumento.id);
      sell(second.db, second.instrumento.id);
      sell(second.db, second.instrumento.id, {
        fecha: "2026-04-15",
        cantidad: "7.5",
        precio: "112.00",
        cambio: "0.930000",
        importeEur: "781.20",
        comisionEur: "1.20",
        concepto: "Venta total demo",
      });
      const reverse = failure(() =>
        sell(second.db, second.instrumento.id, {
          fecha: "2026-05-02",
          cantidad: "1",
          importeEur: "110.00",
          concepto: "V6 mismo día primero",
        }),
      );
      expect(reverse.details).toMatchObject({
        disponible: "0",
        necesario: "1",
        minimo: "-1",
        fecha: "2026-05-02",
      });
      buy(second.db, second.instrumento.id, {
        fecha: "2026-05-02",
        cantidad: "2",
        precio: "220.00",
        divisa: "EUR",
        cambio: null,
        importeEur: "200.00",
        comisionEur: "0.00",
        concepto: "P3 mismo día",
      });
      sell(second.db, second.instrumento.id, {
        fecha: "2026-05-02",
        cantidad: "2",
        precio: "220.00",
        divisa: "EUR",
        cambio: null,
        importeEur: "220.00",
        comisionEur: null,
        concepto: "V5 mismo día",
      });
    } finally {
      second.db.close();
    }
  } finally {
    db.close();
  }
});

test("E4.2-AC-06: posiciones independientes por Saldo de inversión", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    p2(db, instrumento.id);
    sell(db, instrumento.id);
    sell(db, instrumento.id, {
      fecha: "2026-04-12",
      saldoInversion: "S006",
      cantidad: "1",
      precio: "105.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "105.00",
      comisionEur: null,
      concepto: "Venta S006 demo",
    });
    expect(positionQuantity(db, "S004", instrumento.id).quantity).toBe(
      750000000n,
    );
    expect(positionQuantity(db, "S006", instrumento.id).quantity).toBe(
      200000000n,
    );
    // No single aggregated position row exists.
    expect(
      getInstrumento(db, instrumento.id).posiciones.map(
        (row: any) => row.cantidad,
      ),
    ).toEqual(["7.5", "2"]);
  } finally {
    db.close();
  }
});

test("E4.2-AC-08/25/26/43: validación de comisión, escalas, divisa y cambio", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    const before = snapshot(db);
    for (const over of [
      { comisionEur: "507.00" },
      { comisionEur: "-1.00" },
      { comisionEur: "5.001" },
      { cantidad: "0" },
      { cantidad: "-1" },
      { cantidad: "1e3" },
      { cantidad: "1.000000001" },
      { precio: "0" },
      { precio: "1.0000001" },
      { cambio: "0.9200001" },
      { importeEur: "0" },
    ]) {
      const error = failure(() => sell(db, instrumento.id, over));
      expect(error.status).toBe(422);
      expect(error.code).toBe("VALIDATION");
    }
    expect(snapshot(db)).toBe(before);

    // EUR only admits exactly "1.000000" when a factor is informed.
    expect(
      sell(db, instrumento.id, {
        divisa: "EUR",
        cambio: "1.000000",
        cantidad: "1",
        importeEur: "110.00",
        concepto: "EUR con 1",
      }).venta.cambio,
    ).toBe("1.000000");
    for (const over of [
      { divisa: "EUR", cambio: "1.100000" },
      { divisa: "USD", cambio: null },
      { divisa: "USD", cambio: "0" },
      { divisa: "USD", cambio: "-1" },
      { divisa: "US" },
      { divisa: "USDD" },
      { divisa: "usd" },
    ]) {
      const error = failure(() =>
        sell(db, instrumento.id, { ...over, cantidad: "1", importeEur: "1.00" }),
      );
      expect(error.status).toBe(422);
      expect(error.code).toBe("VALIDATION");
      expect(Object.keys(error.fields).length).toBeGreaterThan(0);
    }

    // Exact input limits: the scaled integer 2^53-1 is accepted and the next
    // value is rejected without rounding. Parsing is shared with Compras.
    const limitFields = {
      fecha: "2026-04-11",
      instrumento: instrumento.id,
      saldoEfectivo: "S003",
      saldoInversion: "S004",
      precio: "1.000000",
      divisa: "EUR",
      cambio: null,
      importeEur: "1.00",
      comisionEur: null,
      concepto: "Límite exacto",
      nota: null,
    };
    expect(
      validateEconomic(
        db,
        { ...limitFields, cantidad: "90071992.54740991" },
        { full: false, now },
      ).cantidad,
    ).toBe(9007199254740991n);
    expect(
      failure(() =>
        validateEconomic(
          db,
          { ...limitFields, cantidad: "90071992.54740992" },
          { full: false, now },
        ),
      ).fields.cantidad,
    ).toContain("límite");
    // Internal product above 2^53 is exact and only presentation rounds.
    const big = validateEconomic(
      db,
      {
        ...limitFields,
        cantidad: "1000000.00000001",
        precio: "9007199.254740",
        cambio: "1.000000",
        importeEur: "1.00",
      },
      { full: false, now },
    );
    expect(big.cantidad * big.precio).toBeGreaterThan(9007199254740991n);

    // Concepto/nota: 2000 accepted, 2001 rejected.
    const long = "x".repeat(2000);
    expect(
      sell(db, instrumento.id, {
        fecha: "2026-04-11",
        cantidad: "1",
        importeEur: "110.00",
        concepto: long,
        nota: long,
      }).venta.concepto,
    ).toHaveLength(2000);
    expect(
      failure(() =>
        sell(db, instrumento.id, {
          fecha: "2026-04-11",
          cantidad: "1",
          importeEur: "110.00",
          concepto: "x".repeat(2001),
        }),
      ).fields.concepto,
    ).toContain("2000");
  } finally {
    db.close();
  }
});

test("E4.2-AC-09: idempotencia, conflicto de clave y dos Ventas del mismo día", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    p2(db, instrumento.id);
    const body = {
      fecha: "2026-04-10",
      instrumento: instrumento.id,
      saldoEfectivo: "S003",
      saldoInversion: "S004",
      cantidad: "1",
      precio: "100.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "100.00",
      comisionEur: null,
      concepto: "Idempotente",
      nota: null,
    };
    const key = randomUUID();
    const first = createSale(db, body, key, now);
    const again = createSale(db, body, key, now);
    expect(again.venta.id).toBe(first.venta.id);
    expect(count(db, "operaciones_inversion")).toBe(3);
    expect(cashAt(db, "S003").disponible).toBe(181040n + 10000n);
    const conflict = failure(() =>
      createSale(db, { ...body, importeEur: "101.00" }, key, now),
    );
    expect(conflict).toMatchObject({
      status: 409,
      code: "IDEMPOTENCY_CONFLICT",
    });
    expect(count(db, "operaciones_inversion")).toBe(3);
    const other = createSale(db, { ...body, importeEur: "101.00" }, randomUUID(), now);
    expect(other.venta.id).not.toBe(first.venta.id);
    expect(count(db, "operaciones_inversion")).toBe(4);
    expect(
      count(db, "operaciones_inversion"),
    ).toBeGreaterThan(0);
    expect(
      failure(() => createSale(db, body, "short", now)).code,
    ).toBe("IDEMPOTENCY_REQUIRED");
  } finally {
    db.close();
  }
});

test("E4.2-AC-10/11: impacto y rectificación completa con auditoría y conflicto", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    p2(db, instrumento.id);
    const v1 = sell(db, instrumento.id);
    expect(cashAt(db, "S003").disponible).toBe(231640n);
    const preview = previewSaleRectification(
      db,
      v1.venta.id,
      rectification(),
      now,
    );
    expect(preview.impacto).toMatchObject({
      efectivo: { antes: "2316.40", despues: "2113.40" },
      posicion: { antes: "7.5", despues: "9.5" },
    });
    expect(preview.referencia).toMatchObject({
      calculo: "303.60",
      diferencia: "-0.60",
    });
    const before = snapshot(db);
    expect(snapshot(db)).toBe(before);
    const rectified = rectifySale(db, v1.venta.id, rectification(), now);
    expect(rectified.venta).toMatchObject({
      id: v1.venta.id,
      cantidad: "3",
      importeEur: "303.00",
      comisionEur: "1.00",
      revision: 2,
      estado: "Vigente",
    });
    expect(cashAt(db, "S003").disponible).toBe(211340n);
    expect(positionQuantity(db, "S004", instrumento.id).quantity).toBe(
      950000000n,
    );
    const audit = saleAudit(db, v1.venta.id).items;
    expect(audit).toHaveLength(2);
    expect(audit[1]).toMatchObject({
      accion: "rectificación",
      revision: 2,
      motivo: "Corrección de cantidad ficticia",
      anterior: { cantidad: "5", importeEur: "506.00" },
      posterior: { cantidad: "3", importeEur: "303.00", clase: "Venta" },
    });

    const state = snapshot(db);
    const stale = failure(() =>
      rectifySale(db, v1.venta.id, rectification(), now),
    );
    expect(stale).toMatchObject({ status: 409, code: "REVISION_CONFLICT" });
    for (const over of [
      { precio: undefined },
      { importeEur: null },
      { instrumento: instrumento.id },
      { saldoInversion: "S006" },
      { saldoEfectivo: "S003" },
      { clase: "Compra" },
      { estado: "Anulada" },
      { id: "1" },
    ]) {
      const body = { ...rectification(), revision: 2, ...over };
      if ("precio" in over) delete (body as any).precio;
      const error = failure(() => rectifySale(db, v1.venta.id, body, now));
      expect(error.status).toBe(422);
      expect(error.code).toBe("VALIDATION");
    }
    expect(snapshot(db)).toBe(state);
  } finally {
    db.close();
  }
});

test("E4.2-AC-12/13/14/30 (D2=A): anulación, doble anulación y efectivo insuficiente", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    p2(db, instrumento.id);
    const v1 = sell(db, instrumento.id);
    const preview = previewSaleAnnulment(db, v1.venta.id, { revision: 1 });
    expect(preview.impacto.efectivo).toMatchObject({
      antes: "2316.40",
      despues: "1810.40",
    });
    expect(preview.impacto.posicion).toMatchObject({
      antes: "7.5",
      despues: "12.5",
    });
    const annulled = annulSale(
      db,
      v1.venta.id,
      { revision: 1, motivo: "Duplicado ficticio de la venta" },
      now,
    );
    expect(annulled.venta.estado).toBe("Anulada");
    expect(cashAt(db, "S003").disponible).toBe(181040n);
    expect(positionQuantity(db, "S004", instrumento.id).quantity).toBe(
      1250000000n,
    );
    expect(getSale(db, v1.venta.id).venta.estado).toBe("Anulada");
    expect(saleAudit(db, v1.venta.id).items.at(-1)).toMatchObject({
      accion: "anulación",
      motivo: "Duplicado ficticio de la venta",
    });
    // Second annulment with the current revision: Estado not eligible.
    expect(
      failure(() =>
        annulSale(db, v1.venta.id, { revision: 2, motivo: "Otra" }, now),
      ).code,
    ).toBe("VALIDATION");
    expect(
      failure(() =>
        annulSale(db, v1.venta.id, { revision: 1, motivo: "Otra" }, now),
      ).code,
    ).toBe("REVISION_CONFLICT");
    expect(
      failure(() =>
        rectifySale(db, v1.venta.id, { ...rectification(), revision: 2 }, now),
      ).status,
    ).toBe(422);
    // A new sale with another Instrument is independent; no persisted link.
    const other = createInstrumento(
      db,
      { nombre: "Fondo alternativo demo" },
      randomUUID(),
      now,
    ).instrumento;
    buy(db, other.id, {
      fecha: "2026-04-01",
      saldoInversion: "S006",
      cantidad: "2",
      precio: "100.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "200.00",
      comisionEur: null,
      concepto: "Posición del reemplazo",
    });
    const replacement = sell(db, other.id, {
      fecha: "2026-04-11",
      saldoInversion: "S006",
      cantidad: "1",
      importeEur: "100.00",
      concepto: "Duplicado ficticio de la venta",
    });
    expect(replacement.venta.estado).toBe("Vigente");
    expect(positionQuantity(db, "S006", other.id).quantity).toBe(100000000n);
    expect(
      db
        .query("SELECT COUNT(*) n FROM operaciones_inversion WHERE concepto=?")
        .get("Duplicado ficticio de la venta"),
    ).toEqual({ n: 1 });
  } finally {
    db.close();
  }
});

test("E4.2-AC-30 (D2=A): la anulación y la rectificación a la baja que dejan efectivo negativo", () => {
  const { db, instrumento } = base("2000.00");
  try {
    updateSaldo(db, "S001", {
      revision: getSaldo(db, "S001").revision,
      saldoApertura: "0.00",
    });
    // F-H is a cash scenario: the position comes from a separate broker cash
    // Saldo so the S003 cash timeline is exactly the documented one.
    createSaldo(
      db,
      {
        nombre: "Efectivo de inversión secundario demo",
        tipo: "Efectivo",
        control: "Inversiones",
        saldoApertura: "100.00",
      },
      randomUUID(),
      now,
    );
    const secondary = db
      .query("SELECT id FROM saldos WHERE nombre LIKE 'Efectivo de inversión secundario%'")
      .get() as { id: string };
    buy(db, instrumento.id, {
      fecha: "2026-01-02",
      saldoEfectivo: secondary.id,
      saldoInversion: "S006",
      cantidad: "10",
      precio: "0.10",
      divisa: "EUR",
      cambio: null,
      importeEur: "1.00",
      comisionEur: null,
      concepto: "Posición F-H",
    });
    expect(cashAt(db, "S003").disponible).toBe(200000n);
    const sale = sell(db, instrumento.id, {
      fecha: "2026-04-10",
      saldoInversion: "S006",
      cantidad: "1",
      precio: "500.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "500.00",
      comisionEur: null,
      concepto: "Venta F-H",
    });
    const master = classification(db);
    const gastoBody = {
      fecha: "2026-04-11",
      tipo: "Gasto" as const,
      importe: "2200.00",
      saldo: "S003",
      partida: master.partida,
      concepto: "Gasto posterior F-H",
      nota: "",
    };
    const preview = previewMovement(db, gastoBody, null, false, now);
    writeMovement(
      db,
      {
        ...gastoBody,
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
      },
      randomUUID(),
      null,
      false,
      now,
    );
    expect(cashAt(db, "S003").disponible).toBe(30000n);
    const blocked = failure(() =>
      annulSale(db, sale.venta.id, { revision: 1, motivo: "Anulación F-H" }, now),
    );
    expect(blocked).toMatchObject({
      status: 422,
      code: "INSUFFICIENT_CASH",
      details: {
        disponible: "300.00",
        necesario: "500.00",
        minimo: "-200.00",
        fecha: "2026-04-11",
      },
    });
    expect(getSale(db, sale.venta.id).venta.estado).toBe("Vigente");
    expect(cashAt(db, "S003").disponible).toBe(30000n);
    const lowered = failure(() =>
      rectifySale(
        db,
        sale.venta.id,
        {
          revision: 1,
          motivo: "Baja F-H",
          fecha: "2026-04-10",
          cantidad: "1",
          precio: "500.00",
          divisa: "EUR",
          cambio: null,
          importeEur: "100.00",
          comisionEur: null,
          concepto: "Venta F-H",
          nota: null,
        },
        now,
      ),
    );
    expect(lowered.code).toBe("INSUFFICIENT_CASH");
    expect(lowered.details).toMatchObject({
      disponible: "300.00",
      necesario: "100.00",
      minimo: "-100.00",
      fecha: "2026-04-11",
    });
    // An upward rectification is accepted.
    const up = rectifySale(
      db,
      sale.venta.id,
      {
        revision: 1,
        motivo: "Alza F-H",
        fecha: "2026-04-10",
        cantidad: "1",
        precio: "600.00",
        divisa: "EUR",
        cambio: null,
        importeEur: "600.00",
        comisionEur: null,
        concepto: "Venta F-H",
        nota: null,
      },
      now,
    );
    expect(up.venta.importeEur).toBe("600.00");
    expect(cashAt(db, "S003").disponible).toBe(40000n);
  } finally {
    db.close();
  }
});

test("E4.2-AC-15/34: sin Movimientos, sin otros registros y auditoría inmutable", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    const tables = [
      "movimientos",
      "presupuestos",
      "partidas",
      "referencias",
      "deudas",
    ];
    const before = tables.map((table) => count(db, table));
    const sale = sell(db, instrumento.id);
    rectifySale(db, sale.venta.id, rectification(), now);
    annulSale(
      db,
      sale.venta.id,
      { revision: 2, motivo: "Anulación ficticia" },
      now,
    );
    expect(tables.map((table) => count(db, table))).toEqual(before);
    expect(count(db, "movimientos")).toBe(0);
    const rows = saleAudit(db, sale.venta.id).items;
    expect(rows.map((row) => row.accion)).toEqual([
      "alta",
      "rectificación",
      "anulación",
    ]);
    for (const row of rows) {
      expect(row.actor).toBe("usuario-unico");
      expect(row.posterior.clase).toBe("Venta");
      expect(new Date(row.instante).toISOString()).toBe(row.instante);
    }
    expect(() =>
      db.run("UPDATE operacion_inversion_audit SET motivo='x' WHERE operacion=?", [
        sale.venta.id,
      ]),
    ).toThrow();
    expect(() =>
      db.run("DELETE FROM operacion_inversion_audit WHERE operacion=?", [
        sale.venta.id,
      ]),
    ).toThrow();
    expect(() =>
      db.run("UPDATE operaciones_inversion SET id='999999' WHERE id=?", [
        sale.venta.id,
      ]),
    ).toThrow();
    expect(() =>
      db.run("DELETE FROM operaciones_inversion WHERE id=?", [sale.venta.id]),
    ).toThrow();
    expect(
      db.query("SELECT id,clase FROM operaciones_inversion WHERE id=?").get(
        sale.venta.id,
      ),
    ).toEqual({ id: sale.venta.id, clase: "Venta" });
  } finally {
    db.close();
  }
});

test("E4.2-AC-24: fecha civil, no futura según Europe/Madrid y bisiesto", () => {
  const { db, instrumento } = base();
  try {
    // A past purchase provides quantity for the valid civil dates tested here.
    buy(db, instrumento.id, {
      fecha: "2024-01-10",
      cantidad: "20",
      precio: "1.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "20.00",
      comisionEur: null,
      concepto: "Posición de fechas",
    });
    for (const fecha of [
      "2027-01-01",
      "2026-02-30",
      "2026-13-01",
      "0000-01-01",
    ]) {
      expect(
        failure(() =>
          sell(db, instrumento.id, { fecha, cantidad: "1", importeEur: "1.00" }),
        ).status,
      ).toBe(422);
    }
    expect(
      sell(db, instrumento.id, {
        fecha: "2024-02-29",
        cantidad: "0.1",
        importeEur: "1.00",
        comisionEur: null,
        concepto: "Bisiesto ficticio",
      }).venta.fecha,
    ).toBe("2024-02-29");
    // 2026-01-15T23:30Z is already 2026-01-16 in Madrid; UTC would reject it.
    const late = Date.parse("2026-01-15T23:30:00Z");
    expect(spanishToday(late)).toBe("2026-01-16");
    expect(
      sell(
        db,
        instrumento.id,
        {
          fecha: "2026-01-16",
          cantidad: "0.1",
          importeEur: "1.00",
          comisionEur: null,
          concepto: "Día civil Madrid",
        },
        late,
      ).venta.fecha,
    ).toBe("2026-01-16");
    expect(spanishToday(Date.parse("2026-01-16T00:30:00Z"))).toBe("2026-01-16");
    const nextDay = Date.parse("2026-01-16T23:30:00Z");
    expect(
      failure(() =>
        sell(
          db,
          instrumento.id,
          {
            fecha: "2026-01-18",
            cantidad: "0.1",
            importeEur: "1.00",
            comisionEur: null,
          },
          nextDay,
        ),
      ).status,
    ).toBe(422);
  } finally {
    db.close();
  }
});

test("E4.2-AC-27 (D3=A): Instrumento y Saldos inactivos, elegibilidad y opciones", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    const before = snapshot(db);
    for (const over of [
      { instrumento: "I9999" },
      { saldoEfectivo: "S999" },
      { saldoInversion: "S999" },
      { saldoInversion: "S003" },
      { saldoEfectivo: "S001" },
      { saldoEfectivo: "S004", saldoInversion: "S003" },
    ]) {
      const error = failure(() =>
        sell(db, instrumento.id, { ...over, cantidad: "1", importeEur: "1.00" }),
      );
      expect(error.status).toBe(422);
      expect(error.code).toBe("VALIDATION");
    }
    expect(snapshot(db)).toBe(before);

    changeInstrumentoState(
      db,
      instrumento.id,
      { revision: 1, motivo: "Instrumento ficticio inactivo" },
      false,
      now,
    );
    // Inactive with quantity in S004: accepted with notice.
    const allowed = sell(db, instrumento.id, { cantidad: "1", importeEur: "110.00" });
    expect(allowed.venta.estado).toBe("Vigente");
    // Inactive without quantity in S006: rejected.
    expect(
      failure(() =>
        sell(db, instrumento.id, {
          saldoInversion: "S006",
          cantidad: "1",
          importeEur: "110.00",
        }),
      ).fields.instrumento,
    ).toContain("inactivo");
    const options = instrumentOptions(db);
    const s004 = options.instrumentosVenta.find(
      (group: any) => group.saldoInversion.id === "S004",
    );
    const s006 = options.instrumentosVenta.find(
      (group: any) => group.saldoInversion.id === "S006",
    );
    expect(
      s004!.instrumentos.find((row: any) => row.id === instrumento.id),
    ).toMatchObject({ estado: "Inactiva", cantidad: "11.5" });
    expect(
      s006!.instrumentos.find((row: any) => row.id === instrumento.id),
    ).toBeUndefined();
    // Inactive Saldo de inversión: rejected until reactivated.
    updateSaldo(db, "S004", {
      revision: getSaldo(db, "S004").revision,
      estado: "Inactiva",
    });
    expect(
      failure(() =>
        sell(db, instrumento.id, { cantidad: "1", importeEur: "110.00" }),
      ).fields.saldoInversion,
    ).toContain("inactivo");
    updateSaldo(db, "S004", {
      revision: getSaldo(db, "S004").revision,
      estado: "Activa",
    });
    expect(
      sell(db, instrumento.id, { cantidad: "1", importeEur: "110.00" }).venta.id,
    ).toBeString();
  } finally {
    db.close();
  }
});

test("E4.2-AC-28: fallo inyectado antes de auditar no deja Venta, contador ni auditoría", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    const counter = db
      .query("SELECT next FROM counters WHERE name='operaciones_inversion'")
      .get();
    const before = snapshot(db);
    db.exec(
      "CREATE TRIGGER synthetic_fail BEFORE INSERT ON operacion_inversion_audit BEGIN SELECT RAISE(ABORT,'synthetic failure'); END",
    );
    expect(() => sell(db, instrumento.id)).toThrow();
    db.exec("DROP TRIGGER synthetic_fail");
    expect(snapshot(db)).toBe(before);
    expect(
      db.query("SELECT next FROM counters WHERE name='operaciones_inversion'").get(),
    ).toEqual(counter as any);
    expect(count(db, "operaciones_inversion")).toBe(1);
  } finally {
    db.close();
  }
});

test("E4.2-AC-45 (D7=A): Compra rectificada o anulada por debajo de la cantidad vendida", () => {
  const { db, instrumento } = base();
  try {
    const p1 = buy(db, instrumento.id); // 12,5 en S004
    p2(db, instrumento.id); // 3 en S006
    sell(db, instrumento.id); // V1 5 => S004 7,5
    const before = snapshot(db);
    const annul = failure(() =>
      annulPurchase(
        db,
        p1.compra.id,
        { revision: 1, motivo: "Anulación D7" },
        now,
      ),
    );
    expect(annul).toMatchObject({
      status: 422,
      code: "INSUFFICIENT_UNITS",
      details: {
        disponible: "7.5",
        necesario: "12.5",
        minimo: "-5",
        fecha: "2026-04-10",
        saldoInversion: "S004",
        instrumento: instrumento.id,
      },
    });
    expect(snapshot(db)).toBe(before);
    const lower = failure(() =>
      rectifyPurchase(
        db,
        p1.compra.id,
        {
          revision: 1,
          motivo: "Baja D7",
          fecha: "2026-02-10",
          cantidad: "3",
          precio: "100.00",
          divisa: "USD",
          cambio: "0.900000",
          importeEur: "270.00",
          comisionEur: "0.00",
          concepto: "Compra P1 demo",
          nota: null,
        },
        now,
      ),
    );
    expect(lower.code).toBe("INSUFFICIENT_UNITS");
    expect(snapshot(db)).toBe(before);
    // Date-only move forward leaves a hole where a sale already exists.
    const moved = failure(() =>
      rectifyPurchase(
        db,
        p1.compra.id,
        {
          revision: 1,
          motivo: "Fecha D7",
          fecha: "2026-04-20",
          cantidad: "12.5",
          precio: "100.00",
          divisa: "USD",
          cambio: "0.900000",
          importeEur: "1125.00",
          comisionEur: "5.00",
          concepto: "Compra P1 demo",
          nota: null,
        },
        now,
      ),
    );
    expect(moved.code).toBe("INSUFFICIENT_UNITS");
    expect(moved.details.fecha).toBe("2026-04-10");
    expect(snapshot(db)).toBe(before);

    // S006: sale of 2 on 12/04, then annulling P2 (3) leaves -2 at that date.
    const p2row = db
      .query("SELECT id FROM operaciones_inversion WHERE saldo_inversion='S006'")
      .get() as { id: string };
    sell(db, instrumento.id, {
      fecha: "2026-04-12",
      saldoInversion: "S006",
      cantidad: "2",
      importeEur: "200.00",
      concepto: "Venta S006 D7",
    });
    const p2annul = failure(() =>
      annulPurchase(
        db,
        p2row.id,
        { revision: 1, motivo: "Anulación P2 D7" },
        now,
      ),
    );
    expect(p2annul.details).toMatchObject({
      disponible: "1",
      necesario: "3",
      minimo: "-2",
      fecha: "2026-04-12",
    });
    // Without sales, the same checks never reject.
    const empty = base();
    try {
      const solo = buy(empty.db, empty.instrumento.id);
      expect(
        annulPurchase(
          empty.db,
          solo.compra.id,
          { revision: 1, motivo: "Sin Ventas" },
          now,
        ).compra.estado,
      ).toBe("Anulada");
    } finally {
      empty.db.close();
    }
  } finally {
    db.close();
  }
});

test("E4.2-H4: referenciaDespues de Movimiento incluye Ventas vigentes", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    sell(db, instrumento.id);
    const master = classification(db);
    const preview = previewMovement(
      db,
      {
        fecha: "2026-04-05",
        tipo: "Gasto",
        importe: "10.00",
        saldo: "S003",
        partida: master.partida,
        concepto: "Gasto previo a la Venta",
        nota: "",
      },
      null,
      false,
      now,
    );
    expect(preview.impacto.referenciaDespues).toBe("2026-04-10");
    expect(cycleContext(db).referencia.fecha).toBe("2026-04-10");
  } finally {
    db.close();
  }
});

test("E4.2-AC-39/40: guard de Saldo y huella de Movimiento con Ventas", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    sell(db, instrumento.id);
    const master = classification(db);
    const preview = previewMovement(
      db,
      {
        fecha: "2026-04-20",
        tipo: "Gasto",
        importe: "10.00",
        saldo: "S003",
        partida: master.partida,
        concepto: "Gasto previsualizado",
        nota: "",
      },
      null,
      false,
      now,
    );
    sell(db, instrumento.id, {
      fecha: "2026-04-21",
      cantidad: "1",
      importeEur: "110.00",
      concepto: "Venta entre preview y confirmación",
    });
    const stale = failure(() =>
      writeMovement(
        db,
        {
          fecha: "2026-04-20",
          tipo: "Gasto",
          importe: "10.00",
          saldo: "S003",
          partida: master.partida,
          concepto: "Gasto previsualizado",
          nota: "",
          fingerprint: preview.fingerprint,
          contextRevision: preview.contextRevision,
        },
        randomUUID(),
        null,
        false,
        now,
      ),
    );
    expect(stale).toMatchObject({ status: 409, code: "IMPACT_CHANGED" });
    expect(financeRevision(db)).toBeTypeOf("string");
    for (const change of [
      { tipo: "Inversión" },
      { control: "Movimientos" },
      { saldoApertura: "999.00" },
      { fechaApertura: "2026-01-02" },
      { permiteSalidaExterior: false },
    ]) {
      expect(
        failure(() =>
          updateSaldo(db, "S003", {
            revision: getSaldo(db, "S003").revision,
            ...change,
          }),
        ).code,
      ).toBe("HISTORY_LOCKED");
    }
    expect(
      updateSaldo(db, "S003", {
        revision: getSaldo(db, "S003").revision,
        nombre: "Efectivo de inversión demo renombrado",
      }).nombre,
    ).toContain("renombrado");
  } finally {
    db.close();
  }
});

test("E4.2-AC-29: dos Ventas concurrentes y dos rectificaciones con revisión desactualizada", async () => {
  const dir = mkdtempSync(join(tmpdir(), "e42-race-"));
  try {
    const path = join(dir, "race.sqlite");
    const db = openDatabase(path);
    let instrumento: string;
    try {
      updateSaldo(db, "S003", {
        revision: getSaldo(db, "S003").revision,
        saldoApertura: "3200.00",
        fechaApertura: "2026-01-01",
        permiteSalidaExterior: true,
      });
      instrumento = createInstrumento(
        db,
        { nombre: "Fondo carrera demo" },
        randomUUID(),
        now,
      ).instrumento.id;
      buy(db, instrumento);
      sell(db, instrumento);
    } finally {
      db.close();
    }
    const worker = join(import.meta.dir, "../test-support/inversion-race-worker.ts");
    const runWorker = (args: string[]) =>
      Bun.spawn([process.execPath, worker, ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });
    const [a, b] = [
      runWorker([path, "create-venta", instrumento, "", "500.00", "1", randomUUID(), "5"]),
      runWorker([path, "create-venta", instrumento, "", "500.00", "1", randomUUID(), "5"]),
    ];
    const [outA, outB] = await Promise.all([
      new Response(a.stdout).text(),
      new Response(b.stdout).text(),
    ]);
    const results = [JSON.parse(outA.trim()), JSON.parse(outB.trim())];
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({
      code: "INSUFFICIENT_UNITS",
      status: 422,
    });
    const check = openDatabase(path);
    try {
      expect(
        check
          .query(
            "SELECT COUNT(*) n FROM operaciones_inversion WHERE clase='Venta'",
          )
          .get(),
      ).toEqual({ n: 2 });
      expect(positionQuantity(check, "S004", instrumento).quantity).toBe(
        250000000n,
      );
      const sale = check
        .query("SELECT id,revision FROM operaciones_inversion WHERE clase='Venta' ORDER BY length(id),id LIMIT 1")
        .get() as { id: string; revision: number };
      const [c, d] = [
        runWorker([path, "rectify-venta", instrumento, sale.id, "100.00", "1", randomUUID(), "1"]),
        runWorker([path, "rectify-venta", instrumento, sale.id, "100.00", "1", randomUUID(), "1"]),
      ];
      const [outC, outD] = await Promise.all([
        new Response(c.stdout).text(),
        new Response(d.stdout).text(),
      ]);
      const rectifications = [JSON.parse(outC.trim()), JSON.parse(outD.trim())];
      expect(rectifications.filter((row) => row.ok)).toHaveLength(1);
      expect(rectifications.find((row) => !row.ok)).toMatchObject({
        code: "REVISION_CONFLICT",
        status: 409,
      });
    } finally {
      check.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.2-AC-16/31/42: motor único por HTTP, 401/403/404 y rutas de impacto que no escriben", async () => {
  const db = openDatabase(":memory:");
  const key = randomBytes(32),
    password = "Ficticia " + randomUUID(),
    handler = HttpApp.toWebHandler(createApp(db, { key, now: () => now }));
  let cookie = "",
    csrf = "";
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = await handler(
      new Request(origin + path, {
        method,
        headers: {
          origin,
          "content-type": "application/json",
          cookie,
          "x-csrf-token": csrf,
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie
        .split("; ")
        .filter((value) => value && !value.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = await response.json();
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data };
  }
  let instrumento: string;
  try {
    expect((await request("/api/ventas")).status).toBe(401);
    const bootstrap = provision(db, now);
    const enrolled = await request("/api/auth/enroll", "POST", {
      token: bootstrap,
      password,
    });
    await request("/api/auth/mfa", "POST", {
      code: totp(enrolled.data.secret).generate({ timestamp: now }),
    });
    updateSaldo(db, "S003", {
      revision: getSaldo(db, "S003").revision,
      saldoApertura: "3200.00",
      fechaApertura: "2026-01-01",
    });
    createSaldo(
      db,
      { nombre: "Cartera secundaria demo", tipo: "Inversión", control: "Inversiones" },
      randomUUID(),
      now,
    );
    instrumento = createInstrumento(
      db,
      { nombre: "Fondo HTTP demo" },
      randomUUID(),
      now,
    ).instrumento.id;
    buy(db, instrumento);
    p2(db, instrumento);
    const body = {
      fecha: "2026-04-10",
      instrumento,
      saldoEfectivo: "S003",
      saldoInversion: "S004",
      cantidad: "5",
      precio: "110.00",
      divisa: "USD",
      cambio: "0.920000",
      importeEur: "506.00",
      comisionEur: "2.00",
      concepto: "Venta HTTP demo",
      nota: null,
    };
    const csrfRejected = await request(
      "/api/ventas",
      "POST",
      body,
      { "x-csrf-token": "x", origin: "http://evil.example" },
    );
    expect(csrfRejected.status).toBe(403);
    const impact = await request("/api/ventas/impacto", "POST", body);
    expect(impact.status).toBe(200);
    expect(impact.data.impacto.efectivo).toMatchObject({
      antes: "1810.40",
      despues: "2316.40",
    });
    const created = await request(
      "/api/ventas",
      "POST",
      body,
      { "idempotency-key": randomUUID() },
    );
    expect(created.status).toBe(201);
    const saleId = created.data.venta.id;
    const cash = await request("/api/inversiones/efectivo?saldo=S003");
    const saldo = await request("/api/saldos/S003");
    expect(cash.data.efectivo.disponible).toBe("2316.40");
    expect(cash.data.efectivo.ventas).toBe("506.00");
    expect(saldo.data.saldo.posicion.importe).toBe(cash.data.efectivo.disponible);
    const cut = await request("/api/inversiones/efectivo?saldo=S003&fecha=2026-04-10");
    expect(cut.data.efectivo).toMatchObject({
      vista: "corte",
      disponible: "2316.40",
    });
    const listed = await request("/api/ventas");
    expect(listed.data.ventas).toHaveLength(1);
    expect(listed.data.ventas[0].clase).toBe("Venta");
    const detail = await request(`/api/ventas/${saleId}`);
    expect(detail.status).toBe(200);
    const audit = await request(`/api/ventas/${saleId}/auditoria`);
    expect(audit.data.items).toHaveLength(1);
    const missing = await request("/api/ventas/999999");
    expect(missing.status).toBe(404);
    expect(missing.data.code).toBe("NOT_FOUND");
    expect((await request("/api/ventas/999999/auditoria")).status).toBe(404);
    expect((await request(`/api/ventas/${saleId}`, "DELETE")).status).toBe(404);
    expect((await request(`/api/ventas/${saleId}/anular`, "DELETE")).status).toBe(404);
    const options = await request("/api/instrumentos/opciones");
    expect(options.data.instrumentosVenta.length).toBeGreaterThan(0);
    // Impact and read routes never write.
    const before = snapshot(db);
    await request("/api/ventas/impacto", "POST", { ...body, cantidad: "1" });
    await request(`/api/ventas/${saleId}/impacto`, "POST", {
      ...rectification(),
      revision: 1,
    });
    await request(`/api/ventas/${saleId}/impacto-anulacion`, "POST", {
      revision: 1,
    });
    await request("/api/ventas");
    await request(`/api/ventas/${saleId}`);
    await request(`/api/ventas/${saleId}/auditoria`);
    await request("/api/instrumentos/opciones");
    expect(snapshot(db)).toBe(before);
    // The impact of an annulment is preview-only too.
    const annulImpact = await request(
      `/api/ventas/${saleId}/impacto-anulacion`,
      "POST",
      { revision: 1 },
    );
    expect(annulImpact.data.impacto.efectivo).toMatchObject({
      antes: "2316.40",
      despues: "1810.40",
    });
  } finally {
    db.close();
  }
});

test("E4.2-AC-36/AC-37: esquema v21 con una sola tabla y migración que conserva hechos", () => {
  const dir = mkdtempSync(join(tmpdir(), "e42-schema-"));
  try {
    const path = join(dir, "v20.sqlite");
    materializeContract(path, "C20-DPRIMA-SIMPLIFICADA", (fixture) => {
      fixture.exec(`INSERT INTO saldos(id,nombre,tipo,control,estado,revision,creado,actualizado) VALUES
        ('S003','Efectivo','Efectivo','Inversiones','Activa',1,'x','x'),
        ('S004','Cartera','Inversión','Inversiones','Activa',1,'x','x');
      INSERT INTO instrumentos(id,nombre,estado,revision,creado_en,actualizado_en) VALUES('I1001','Fondo','Activa',1,'x','x');
      INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,concepto,nota,estado,revision,creado,actualizado)
      VALUES('5001','Compra','2026-02-10','I1001','S003','S004',1250000000,100000000,'USD',900000,112500,500,NULL,NULL,'Vigente',1,'x','x');
      INSERT INTO operacion_inversion_audit VALUES('5001',1,'alta',NULL,'x','u',NULL,'{}');
      INSERT INTO counters VALUES('operaciones_inversion',5002);`);
    });
    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 21,
      });
      expect(verifyContract(db, 21)).toBe("C21-VENTAS-E42");
      const tables = (
        db
          .query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ventas','operaciones_inversion')",
          )
          .all() as { name: string }[]
      ).map((row) => row.name);
      expect(tables).toEqual(["operaciones_inversion"]);
      expect(
        db.query("SELECT id,clase FROM operaciones_inversion").get(),
      ).toEqual({ id: "5001", clase: "Compra" });
      expect(count(db, "operacion_inversion_audit")).toBe(1);
      expect(
        db.query("SELECT next FROM counters WHERE name='operaciones_inversion'").get(),
      ).toEqual({ next: 5002 });
      expect(db.query("SELECT origin FROM database_origin").get()).toEqual({
        origin: "demo",
      });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(db.query("PRAGMA integrity_check").get()).toEqual({
        integrity_check: "ok",
      });
      const sale = sell(db, "I1001", {
        cantidad: "1",
        importeEur: "110.00",
      });
      expect(sale.venta.id).toBe("5002");
      expect(verifyContract(db, 21)).toBe("C21-VENTAS-E42");
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.2-AC-20/21/22/23/38: fuente de inversión y referencia compartida", () => {
  const { db, instrumento } = base();
  try {
    expect(investmentSource(openDatabase(":memory:"))).toMatchObject({
      state: "disponible",
      maxDate: null,
    });
    expect(investmentSource(db)).toMatchObject({
      state: "disponible",
      maxDate: null,
    });
    // Missing table => pendiente.
    const empty = new Database(":memory:");
    try {
      expect(investmentSource(empty)).toEqual({
        source: "Operaciones de inversión",
        state: "pendiente",
      });
    } finally {
      empty.close();
    }
    buy(db, instrumento.id);
    p2(db, instrumento.id);
    expect(investmentSource(db)).toMatchObject({
      state: "disponible",
      maxDate: "2026-03-03",
    });
    const v1 = sell(db, instrumento.id);
    expect(investmentSource(db)).toMatchObject({
      state: "disponible",
      maxDate: "2026-04-10",
    });
    // Integración real: la fuente conectada alimenta la referencia de Ciclos.
    const ctx = cycleContext(db);
    expect(ctx.referencia.fecha).toBe("2026-04-10");
    expect(
      ctx.referencia.coverage.find(
        (s) => s.source === "Operaciones de inversión",
      ),
    ).toMatchObject({ state: "disponible" });
    const sale = sell(db, instrumento.id, {
      fecha: "2026-04-20",
      saldoInversion: "S006",
      cantidad: "1",
      precio: "105.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "105.00",
      comisionEur: null,
      concepto: "V3 demo",
    });
    expect((investmentSource(db) as any).maxDate).toBe("2026-04-20");
    annulSale(
      db,
      sale.venta.id,
      { revision: 1, motivo: "Anulación de referencia" },
      now,
    );
    expect((investmentSource(db) as any).maxDate).toBe("2026-04-10");
    // A rectified operation contributes its current date.
    rectifySale(
      db,
      v1.venta.id,
      {
        ...rectification(),
        cantidad: "5",
        importeEur: "506.00",
        comisionEur: "2.00",
        fecha: "2026-04-25",
      },
      now,
    );
    expect((investmentSource(db) as any).maxDate).toBe("2026-04-25");
    // Source failure => error state, never a substitute date.
    const broken = new Database(":memory:");
    try {
      broken.exec("CREATE TABLE operaciones_inversion(id TEXT)");
      expect(investmentSource(broken)).toEqual({
        source: "Operaciones de inversión",
        state: "error",
      });
    } finally {
      broken.close();
    }

    // Pure contract: the three sources aggregate the maximum once, no sum.
    const pure = financialReference([
      { source: "Movimientos", state: "disponible", maxDate: "2026-01-10" },
      { source: "Revisión Comida", state: "disponible", maxDate: "2026-02-20" },
      {
        source: "Operaciones de inversión",
        state: "disponible",
        maxDate: "2026-03-15",
      },
    ]);
    expect(pure.fecha).toBe("2026-03-15");
    expect(pure.coverage).toHaveLength(3);
    expect(
      financialReference([
        { source: "Movimientos", state: "disponible", maxDate: "2026-01-10" },
        { source: "Revisión Comida", state: "disponible", maxDate: "2026-02-20" },
        {
          source: "Operaciones de inversión",
          state: "disponible",
          maxDate: "2026-01-15",
        },
      ]).fecha,
    ).toBe("2026-02-20");
    expect(
      financialReference([
        { source: "Movimientos", state: "disponible", maxDate: "2026-01-10" },
        { source: "Revisión Comida", state: "disponible", maxDate: "2026-02-20" },
        { source: "Operaciones de inversión", state: "pendiente" },
      ]).fecha,
    ).toBe("2026-02-20");
    expect(
      financialReference([
        { source: "Movimientos", state: "disponible", maxDate: "2026-01-10" },
        { source: "Operaciones de inversión", state: "error" },
      ]),
    ).toMatchObject({ fecha: null, estado: "error" });
    // Same maximum date in two sources is reported once.
    expect(
      financialReference([
        { source: "Movimientos", state: "disponible", maxDate: "2026-04-10" },
        {
          source: "Operaciones de inversión",
          state: "disponible",
          maxDate: "2026-04-10",
        },
      ]).fecha,
    ).toBe("2026-04-10");
  } finally {
    db.close();
  }
});

test("E4.2 aislamiento: una Venta no se expone ni se muta por rutas de Compra", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    const v = sell(db, instrumento.id);
    const id = v.venta.id;
    expect(failure(() => getPurchase(db, id)).status).toBe(404);
    expect(listPurchases(db).compras.some((c) => c.id === id)).toBe(false);
    expect(
      purchasesForInstrumento(db, instrumento.id).some((c) => c.id === id),
    ).toBe(false);
    const before = positionQuantity(db, "S004", instrumento.id).quantity;
    expect(failure(() => rectifyPurchase(db, id, rectification(), now)).status).toBe(
      404,
    );
    expect(
      failure(() =>
        annulPurchase(
          db,
          id,
          { revision: 1, motivo: "Intento sobre Venta" },
          now,
        ),
      ).status,
    ).toBe(404);
    expect(positionQuantity(db, "S004", instrumento.id).quantity).toBe(before);
    expect(getSale(db, id).venta.estado).toBe("Vigente");
  } finally {
    db.close();
  }
});

test("E4.2-AC-44: listado con filtros, paginación y estados", () => {
  const { db, instrumento } = base();
  try {
    buy(db, instrumento.id);
    sell(db, instrumento.id);
    const annulled = sell(db, instrumento.id, {
      fecha: "2026-04-12",
      cantidad: "1",
      importeEur: "110.00",
      concepto: "Venta anulada",
    });
    annulSale(
      db,
      annulled.venta.id,
      { revision: 1, motivo: "Anulación de listado" },
      now,
    );
    const defaults = listSales(db);
    expect(defaults.ventas).toHaveLength(1);
    expect(defaults.resumen).toEqual({ total: 1, vigentes: 1, anuladas: 0 });
    expect(defaults.cobertura).toContain("histórico anterior no importado");
    const all = listSales(db, new URLSearchParams("estado="));
    expect(all.total).toBe(2);
    const annulledOnly = listSales(db, new URLSearchParams("estado=Anulada"));
    expect(annulledOnly.ventas).toHaveLength(1);
    expect(
      listSales(
        db,
        new URLSearchParams("saldoEfectivo=S003&desde=2026-04-10"),
      ).total,
    ).toBe(1);
    expect(
      listSales(db, new URLSearchParams("instrumento=I9999")).total,
    ).toBe(0);
    expect(
      failure(() => listSales(db, new URLSearchParams("page=0"))).code,
    ).toBe("VALIDATION");
    expect(
      failure(() => listSales(db, new URLSearchParams("desde=2026-05-01&hasta=2026-04-01"))).code,
    ).toBe("VALIDATION");
    expect(
      failure(() => listSales(db, new URLSearchParams("page=999999999"))).code,
    ).toBe("VALIDATION");
  } finally {
    db.close();
  }
});

function classification(db: Database) {
  const category = createClassification(
    db,
    "categorias",
    { nombre: "Categoría ventas", anual: "Gasto", mensual: "Gasto", referencia: false },
    randomUUID(),
    now,
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub ventas", padre: category.id },
    randomUUID(),
    now,
  );
  const partida = createClassification(
    db,
    "partidas",
    { nombre: "Partida ventas", padre: sub.id },
    randomUUID(),
    now,
  );
  return { category, sub, partida: partida.id };
}
