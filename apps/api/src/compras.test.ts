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
import { openDatabaseV13 } from "../test-support/database-v13";
import { openDatabaseV17 } from "../test-support/database-v17";
import { openDatabaseV15 } from "../test-support/database-v15";
import { materializeContract } from "../test-support/inversiones-schema";
import { createInstrumento } from "./instrumentos";
import {
  annulPurchase,
  createPurchase,
  getPurchase,
  listPurchases,
  previewAnnulment,
  previewPurchase,
  previewRectification,
  purchaseAudit,
  rectifyPurchase,
} from "./compras";
import { cashAt, cashDto, cents, spanishToday } from "./investment-engine";
import { getSaldo, updateSaldo, createSaldo, money } from "./saldos";
import { createClassification } from "./clasificacion";
import { createDebt } from "./deudas";
import {
  previewMovement,
  writeMovement,
} from "./movimientos";
import { listInstrumentos, getInstrumento, instrumentOptions, instrumentoAudit } from "./instrumentos";
import { Problem } from "./problem";

const now = Date.parse("2026-10-26T12:00:00Z");
const origin = "http://127.0.0.1:5173";

function base(opening = "5000.00") {
  const db = openDatabase(":memory:");
  updateSaldo(db, "S003", {
    revision: getSaldo(db, "S003").revision,
    saldoApertura: opening,
    fechaApertura: "2026-01-01",
    permiteSalidaExterior: true,
  });
  const instrumento = createInstrumento(
    db,
    { nombre: "Fondo índice demo", isin: "ES0000000001", isinEvidencia: "Extracto ficticio F-01", divisaReferencia: "EUR" },
    randomUUID(),
    now,
  ).instrumento;
  return { db, instrumento };
}
const defaultPurchase = (instrumento: string, over: Record<string, unknown> = {}) => ({
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
  concepto: "Compra demo",
  nota: null,
  ...over,
});
function buy(
  db: Database,
  instrumento: string,
  over: Record<string, unknown> = {},
  at = now,
) {
  return createPurchase(
    db,
    defaultPurchase(instrumento, over),
    randomUUID(),
    at,
  );
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
      "instrumento_audit",
      "operacion_inversion_audit",
      "instrumento_attempts",
      "operacion_attempts",
      "counters",
    ].map((table) => [table, db.query(`SELECT * FROM ${table} ORDER BY 1`).all()]),
  );
}

test("E4.1-AC-08/09/10/11/12/13/22/23/27/38/40: motor único, posiciones independientes y hechos exactos", () => {
  const { db, instrumento } = base();
  try {
    const secondary = createSaldo(
      db,
      {
        nombre: "Cartera secundaria demo",
        tipo: "Inversión",
        control: "Inversiones",
      },
      randomUUID(),
      now,
    );
    const eurNoChange = buy(db, instrumento.id, {
      cantidad: "1",
      precio: "10.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "10.00",
      comisionEur: null,
    });
    const eurOne = buy(db, instrumento.id, {
      cantidad: "2",
      precio: "10.00",
      divisa: "EUR",
      cambio: "1.000000",
      importeEur: "20.00",
      comisionEur: null,
    });
    const invalidEur = failure(() =>
      buy(db, instrumento.id, {
        cantidad: "2",
        precio: "10.00",
        divisa: "EUR",
        cambio: "1.100000",
        importeEur: "22.00",
      }),
    );
    expect(invalidEur.code).toBe("VALIDATION");
    expect(invalidEur.status).toBe(422);
    const first = buy(db, instrumento.id);
    expect(first.compra).toMatchObject({
      cantidad: "12.5",
      precio: "100.00",
      divisa: "USD",
      cambio: "0.900000",
      importeEur: "1125.00",
      comisionEur: "5.00",
      estado: "Vigente",
    });
    const second = buy(db, instrumento.id, {
      cantidad: "3",
      precio: "98.00",
      cambio: "0.800000",
      importeEur: "264.60",
      comisionEur: "0.00",
      saldoInversion: secondary.id,
    });
    expect(second.compra.saldoInversion!.id).toBe(secondary.id);
    const prior = getPurchase(db, first.compra.id).compra;
    expect(prior.cambio).toBe("0.900000");
    expect(prior.importeEur).toBe("1125.00");
    const detail = getInstrumento(db, instrumento.id);
    expect(detail.posiciones).toHaveLength(2);
    expect(detail.posiciones.map((p: any) => [p.saldoInversion.id, p.cantidad])).toEqual([
      ["S004", "15.5"],
      [secondary.id, "3"],
    ]);
    expect(detail.valoracion.estado).toBe("No disponible");
    expect(detail.cobertura).toContain("histórico anterior no importado");
    const cash = cashAt(db, "S003");
    expect(cash.disponible).toBe(500000n - 1000n - 2000n - 112500n - 26460n);
    expect(getSaldo(db, "S003").posicion.importe).toBe(cents(cash.disponible));
    expect(cashDto(db, "S003", null).efectivo).toMatchObject({
      vista: "actual",
      compras: "1419.60",
      ventas: "0.00",
      comisionIncluida: "5.00",
      disponible: cents(cash.disponible),
    });
    expect(cashDto(db, "S003", "2026-02-10").efectivo).toMatchObject({
      vista: "corte",
      disponible: cents(cash.disponible),
    });
    expect(getSaldo(db, "S004").posicion.importe).toBeNull();
    expect(getSaldo(db, "S004").posicion.condicion).toBe("pendiente_motor");
    expect(getSaldo(db, "S001").posicion.importe).toBe("0.00");
    expect(count(db, "movimientos")).toBe(0);
    expect(first.compra.referencia).toMatchObject({
      calculo: "1125.00",
      diferencia: "0.00",
    });
    const wrong = failure(() =>
      buy(db, instrumento.id, { importeEur: "4000.00", cantidad: "1", precio: "1.00" }),
    );
    expect(wrong.code).toBe("INSUFFICIENT_CASH");
    expect(wrong.details).toMatchObject({
      disponible: expect.any(String),
      necesario: "4000.00",
      minimo: expect.any(String),
      fecha: "2026-02-10",
    });
  } finally {
    db.close();
  }
});

test("E4.1-AC-14/17/50/51/54: escalas, límites exactos, referencias y referencias de Saldo", () => {
  const { db, instrumento } = base("1000000.00");
  try {
    for (const [field, value] of [
      ["cantidad", "1.000000001"],
      ["precio", "1.0000001"],
      ["cambio", "0.9000001"],
    ] as const) {
      const error = failure(() => buy(db, instrumento.id, { [field]: value }));
      expect(error.status).toBe(422);
      expect(error.code).toBe("VALIDATION");
      expect(error.fields[field]).toBeDefined();
    }
    for (const error of [
      failure(() => buy(db, instrumento.id, { divisa: "US", cambio: null })),
      failure(() => buy(db, instrumento.id, { divisa: "USDD", cambio: null })),
      failure(() => buy(db, instrumento.id, { divisa: "usd", cambio: null })),
      failure(() => buy(db, instrumento.id, { comisionEur: "5.001" })),
    ]) {
      expect(error.status).toBe(422);
      expect(error.code).toBe("VALIDATION");
    }
    expect(failure(() => buy(db, instrumento.id, { concepto: "x".repeat(2001) })).fields.concepto).toBeDefined();
    expect(failure(() => buy(db, instrumento.id, { nota: "x".repeat(2001) })).fields.nota).toBeDefined();
    const atLimit = buy(db, instrumento.id, {
      cantidad: "90071992.54740991",
      precio: "9007199254.740991",
      divisa: "USD",
      cambio: "9007199254.740991",
      importeEur: "1.00",
      comisionEur: null,
    });
    expect(atLimit.compra.cantidad).toBe("90071992.54740991");
    expect(atLimit.compra.precio).toBe("9007199254.740991");
    expect(atLimit.compra.cambio).toBe("9007199254.740991");
    const stored = db
      .query("SELECT CAST(cantidad AS TEXT) c,CAST(precio_divisa AS TEXT) p,CAST(cambio AS TEXT) x FROM operaciones_inversion WHERE id=?")
      .get(atLimit.compra.id) as { c: string; p: string; x: string };
    expect(stored).toEqual({
      c: "9007199254740991",
      p: "9007199254740991",
      x: "9007199254740991",
    });
    const numerator = 9007199254740991n ** 3n,
      denominator = 10n ** 18n,
      expected = (numerator + denominator / 2n) / denominator;
    expect(atLimit.compra.referencia.calculo).toBe(cents(expected));
    for (const [field, value] of [
      ["cantidad", "90071992.54740992"],
      ["precio", "9007199254.740992"],
      ["cambio", "9007199254.740992"],
    ] as const)
      expect(failure(() => buy(db, instrumento.id, { [field]: value })).status).toBe(422);
    expect(
      failure(() =>
        buy(db, instrumento.id, {
          saldoEfectivo: "S001",
        }),
      ).fields.saldoEfectivo,
    ).toBeDefined();
    expect(
      failure(() => buy(db, instrumento.id, { saldoEfectivo: "S004" })).fields.saldoEfectivo,
    ).toBeDefined();
    expect(
      failure(() => buy(db, instrumento.id, { saldoInversion: "S003" })).fields.saldoInversion,
    ).toBeDefined();
    expect(
      failure(() => buy(db, instrumento.id, { instrumento: "I9999" })).fields.instrumento,
    ).toBeDefined();
  } finally {
    db.close();
  }
});

test("E4.1-AC-15/16/35/44/46: fecha civil, día civil Madrid, retroactividad y fin de día", () => {
  const { db, instrumento } = base("1000.00");
  try {
    expect(spanishToday(Date.parse("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
    expect(spanishToday(Date.parse("2026-01-16T00:30:00Z"))).toBe("2026-01-16");
    expect(spanishToday(Date.parse("2026-07-15T22:30:00Z"))).toBe("2026-07-16");
    expect(spanishToday(Date.parse("2026-03-29T00:30:00Z"))).toBe("2026-03-29");
    expect(spanishToday(Date.parse("2026-10-25T00:30:00Z"))).toBe("2026-10-25");
    for (const [clock, max] of [
      ["2026-01-15T23:30:00Z", "2026-01-16"],
      ["2026-01-16T00:30:00Z", "2026-01-16"],
      ["2026-07-15T22:30:00Z", "2026-07-16"],
      ["2026-03-29T00:30:00Z", "2026-03-29"],
      ["2026-10-25T00:30:00Z", "2026-10-25"],
    ] as const) {
      const at = Date.parse(clock);
      expect(
        buy(db, instrumento.id, { fecha: max, importeEur: "1.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null, comisionEur: null }, at).compra.fecha,
      ).toBe(max);
      const next = new Date(Date.parse(max + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
      expect(failure(() => buy(db, instrumento.id, { fecha: next, importeEur: "1.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null, comisionEur: null }, at)).status).toBe(422);
    }
    expect(failure(() => buy(db, instrumento.id, { fecha: "2026-02-30" })).status).toBe(422);
    expect(buy(db, instrumento.id, { fecha: "2024-02-29", importeEur: "1.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null, comisionEur: null }).compra.fecha).toBe("2024-02-29");
    const insufficient = failure(() =>
      buy(db, instrumento.id, { fecha: "2026-03-01", importeEur: "2000.00", comisionEur: null }),
    );
    expect(insufficient.status).toBe(422);
    expect(insufficient.code).toBe("INSUFFICIENT_CASH");
    expect(insufficient.details.minimo).toBe("-1006.00");
    expect(
      db.query("SELECT COUNT(*) n FROM operaciones_inversion").get(),
    ).toEqual({ n: 6 });
    // Later outflow: opening 1000, entry 500 on 02-01, exit 1800 on 03-01.
    const retroDb = base("1000.00");
    try {
      const master = classification(retroDb.db);
      const outflow = { fecha: "2026-03-01", tipo: "Gasto" as const, importe: "1800.00", saldo: "S003", partida: master.partida, concepto: "Salida ficticia", nota: "" };
      const outflowPreview = previewMovement(retroDb.db, outflow, null, false, now);
      writeMovement(retroDb.db, { ...outflow, fingerprint: outflowPreview.fingerprint, contextRevision: outflowPreview.contextRevision }, randomUUID(), null, false, now);
      const inflow = { fecha: "2026-02-01", tipo: "Ingreso" as const, importe: "500.00", saldo: "S003", subtipo: "Nómina", concepto: "Entrada ficticia", nota: "" };
      const inflowPreview = previewMovement(retroDb.db, inflow, null, false, now);
      writeMovement(retroDb.db, { ...inflow, fingerprint: inflowPreview.fingerprint, contextRevision: inflowPreview.contextRevision }, randomUUID(), null, false, now);
      const retro = failure(() =>
        buy(retroDb.db, retroDb.instrumento.id, { fecha: "2026-02-10", importeEur: "100.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null, comisionEur: null }),
      );
      expect(retro.details.fecha).toBe("2026-03-01");
      expect(retro.details.minimo).toBe("-400.00");
    } finally {
      retroDb.db.close();
    }
    // End-of-day: 1000 opening, +100 and 1050 purchase on the same day.
    const same = base("1000.00");
    try {
      const sameDay = { fecha: "2026-02-10", tipo: "Ingreso" as const, importe: "100.00", saldo: "S003", subtipo: "Nómina", concepto: "Entrada misma fecha", nota: "" };
      const sameDayPreview = previewMovement(same.db, sameDay, null, false, now);
      writeMovement(same.db, { ...sameDay, fingerprint: sameDayPreview.fingerprint, contextRevision: sameDayPreview.contextRevision }, randomUUID(), null, false, now);
      expect(buy(same.db, same.instrumento.id, { fecha: "2026-02-10", importeEur: "1050.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null, comisionEur: null }).compra.importeEur).toBe("1050.00");
      const rejected = failure(() => buy(same.db, same.instrumento.id, { fecha: "2026-02-10", importeEur: "1150.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null, comisionEur: null }));
      expect(rejected.details).toMatchObject({ fecha: "2026-02-10", minimo: "-1100.00" });
      const over = base("1000.00");
      try {
        const preview = previewMovement(over.db, sameDay, null, false, now);
        writeMovement(over.db, { ...sameDay, fingerprint: preview.fingerprint, contextRevision: preview.contextRevision }, randomUUID(), null, false, now);
        const tooMuch = failure(() => buy(over.db, over.instrumento.id, { fecha: "2026-02-10", importeEur: "1150.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null, comisionEur: null }));
        expect(tooMuch.details).toMatchObject({ fecha: "2026-02-10", minimo: "-50.00" });
      } finally {
        over.db.close();
      }
    } finally {
      same.db.close();
    }
  } finally {
    db.close();
  }
});

function classification(db: Database) {
  const category = createClassification(
    db,
    "categorias",
    { nombre: "Gasto inversión ficticio", anual: "Gasto", mensual: "Gasto", referencia: false },
    randomUUID(),
    now,
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub inversión ficticia", padre: category.id },
    randomUUID(),
    now,
  );
  const partida = createClassification(
    db,
    "partidas",
    { nombre: "Partida inversión ficticia", padre: sub.id },
    randomUUID(),
    now,
  );
  return { category, sub, partida: partida.id };
}

test("E4.1-AC-18/19/20/25/26/45/47: idempotencia, rollback, rectificación y anulación", () => {
  const { db, instrumento } = base();
  try {
    const body = defaultPurchase(instrumento.id);
    const key = randomUUID();
    const first = createPurchase(db, body, key, now);
    const replay = createPurchase(db, body, key, now);
    expect(replay.compra.id).toBe(first.compra.id);
    expect(count(db, "operaciones_inversion")).toBe(1);
    expect(failure(() => createPurchase(db, { ...body, importeEur: "1.00" }, key, now)).code).toBe("IDEMPOTENCY_CONFLICT");
    const beforeCounter = db.query("SELECT next FROM counters WHERE name='operaciones_inversion'").get();
    const beforeCount = count(db, "operaciones_inversion");
    db.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON operacion_inversion_audit BEGIN SELECT RAISE(ABORT,'fault'); END");
    expect(failure(() => buy(db, instrumento.id, { cantidad: "1" }))).toBeDefined();
    db.exec("DROP TRIGGER fail_audit");
    expect(count(db, "operaciones_inversion")).toBe(beforeCount);
    expect(db.query("SELECT next FROM counters WHERE name='operaciones_inversion'").get()).toEqual(beforeCounter);
    const preview = previewRectification(db, first.compra.id, {
      revision: 1,
      motivo: "Corrección ficticia",
      fecha: "2026-02-10",
      cantidad: "10",
      precio: "100.00",
      divisa: "USD",
      cambio: "0.900000",
      importeEur: "900.00",
      comisionEur: "0.00",
      concepto: "Compra demo",
      nota: null,
    }, now);
    expect(preview.impacto.efectivo).toMatchObject({
      antes: "3875.00",
      despues: "4100.00",
    });
    expect(preview.impacto.posicion).toMatchObject({ antes: "12.5", despues: "10" });
    const missing = failure(() =>
      rectifyPurchase(db, first.compra.id, {
        revision: 1,
        motivo: "Sin precio",
        fecha: "2026-02-10",
        cantidad: "10",
        divisa: "USD",
        cambio: "0.900000",
        importeEur: "900.00",
        comisionEur: "0.00",
        concepto: "Compra demo",
        nota: null,
      }, now),
    );
    expect(missing.status).toBe(422);
    expect(missing.fields.precio).toBeDefined();
    expect(failure(() => rectifyPurchase(db, first.compra.id, {
      revision: 1,
      motivo: "Identidad",
      fecha: "2026-02-10",
      cantidad: "10",
      precio: "100.00",
      divisa: "USD",
      cambio: "0.900000",
      importeEur: "900.00",
      comisionEur: "0.00",
      concepto: "Compra demo",
      nota: null,
      instrumento: instrumento.id,
    }, now)).status).toBe(422);
    expect(failure(() => rectifyPurchase(db, first.compra.id, {
      revision: 1,
      motivo: "Importe nulo",
      fecha: "2026-02-10",
      cantidad: "10",
      precio: "100.00",
      divisa: "USD",
      cambio: "0.900000",
      importeEur: null,
      comisionEur: "0.00",
      concepto: "Compra demo",
      nota: null,
    }, now)).status).toBe(422);
    const rectified = rectifyPurchase(db, first.compra.id, {
      revision: 1,
      motivo: "Corrección ficticia",
      fecha: "2026-02-10",
      cantidad: "10",
      precio: "100.00",
      divisa: "USD",
      cambio: "0.900000",
      importeEur: "900.00",
      comisionEur: null,
      concepto: null,
      nota: null,
    }, now);
    expect(rectified.compra).toMatchObject({
      revision: 2,
      cantidad: "10",
      importeEur: "900.00",
      comisionEur: null,
      concepto: null,
    });
    expect(rectified.auditoria.map((row: any) => row.accion)).toEqual(["alta", "rectificación"]);
    expect(failure(() => rectifyPurchase(db, first.compra.id, {
      revision: 1,
      motivo: "Obsoleta",
      fecha: "2026-02-10",
      cantidad: "10",
      precio: "100.00",
      divisa: "USD",
      cambio: "0.900000",
      importeEur: "900.00",
      comisionEur: null,
      concepto: null,
      nota: null,
    }, now)).code).toBe("REVISION_CONFLICT");
    const annulPreview = previewAnnulment(db, first.compra.id, { revision: 2 });
    expect(annulPreview.impacto.efectivo.despues).toBe("5000.00");
    const annulled = annulPurchase(db, first.compra.id, { revision: 2, motivo: "Duplicado ficticio" }, now);
    expect(annulled.compra.estado).toBe("Anulada");
    expect(annulled.auditoria.at(-1)!.posterior.estado).toBe("Anulada");
    expect(failure(() => annulPurchase(db, first.compra.id, { revision: 3, motivo: "Otra" }, now)).status).toBe(422);
    expect(failure(() => annulPurchase(db, first.compra.id, { revision: 2, motivo: "Otra" }, now)).code).toBe("REVISION_CONFLICT");
    expect(cashAt(db, "S003").disponible).toBe(500000n);
    expect(listPurchases(db, new URLSearchParams("estado=")).resumen).toMatchObject({ total: 1, vigentes: 0, anuladas: 1 });
    const other = createInstrumento(db, { nombre: "Acción ficticia" }, randomUUID(), now).instrumento;
    const replacement = buy(db, other.id, { importeEur: "50.00", cantidad: "1", precio: "50.00", divisa: "EUR", cambio: null });
    expect(replacement.compra.estado).toBe("Vigente");
    expect(getPurchase(db, first.compra.id).compra.estado).toBe("Anulada");
  } finally {
    db.close();
  }
});

test("E4.1-AC-20/28/53: recálculo de suficiencia, revisión y contexto de Movimiento invalidado", () => {
  const { db, instrumento } = base("1000.00");
  try {
    expect(buy(db, instrumento.id, { importeEur: "600.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null }).compra.importeEur).toBe("600.00");
    const second = failure(() =>
      buy(db, instrumento.id, { importeEur: "600.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null }),
    );
    expect(second.code).toBe("INSUFFICIENT_CASH");
    expect(second.status).toBe(422);
    expect(cashAt(db, "S003").disponible).toBe(40000n);
    const master = classification(db);
    const preview = previewMovement(db, {
      fecha: "2026-03-01",
      tipo: "Gasto",
      importe: "10.00",
      saldo: "S003",
      partida: master.partida,
      concepto: "Gasto previsualizado",
      nota: "",
    }, null, false, now);
    buy(db, instrumento.id, { importeEur: "50.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null });
    const stale = failure(() =>
      writeMovement(db, {
        fecha: "2026-03-01",
        tipo: "Gasto",
        importe: "10.00",
        saldo: "S003",
        partida: master.partida,
        concepto: "Gasto previsualizado",
        nota: "",
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
      }, randomUUID(), null, false, now),
    );
    expect(stale.code).toBe("IMPACT_CHANGED");
    const before = count(db, "movimientos");
    const retry = previewMovement(db, {
      fecha: "2026-03-01",
      tipo: "Gasto",
      importe: "10.00",
      saldo: "S003",
      partida: master.partida,
      concepto: "Gasto previsualizado",
      nota: "",
    }, null, false, now);
    expect(writeMovement(db, {
      fecha: "2026-03-01",
      tipo: "Gasto",
      importe: "10.00",
      saldo: "S003",
      partida: master.partida,
      concepto: "Gasto previsualizado",
      nota: "",
      fingerprint: retry.fingerprint,
      contextRevision: retry.contextRevision,
    }, randomUUID(), null, false, now).movimiento.estado).toBe("Vigente");
    // A Transferencia and a Compra are independent, each affecting cash once.
    const transferBody = {
      fecha: "2026-03-02",
      tipo: "Transferencia",
      importe: "100.00",
      origen: "S001",
      destino: "S003",
      concepto: "Aportación ficticia",
      nota: "",
    };
    const transferPreview = previewMovement(
      db,
      transferBody,
      null,
      false,
      now,
    );
    const transfer = writeMovement(db, {
      ...transferBody,
      fingerprint: transferPreview.fingerprint,
      contextRevision: transferPreview.contextRevision,
    }, randomUUID(), null, false, now);
    const beforePurchase = cashAt(db, "S003").disponible;
    buy(db, instrumento.id, { importeEur: "10.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null });
    expect(cashAt(db, "S003").disponible).toBe(beforePurchase - 1000n);
    expect(transfer.movimiento.id).toBeString();
  } finally {
    db.close();
  }
});

test("E4.1-AC-41/42/49: previsualización de los cuatro Movimientos, guard de Saldo y Saldo inactivo", () => {
  const { db, instrumento } = base("5000.00");
  try {
    buy(db, instrumento.id, { importeEur: "100.00", cantidad: "1", precio: "100.00", divisa: "EUR", cambio: null });
    updateSaldo(db, "S001", {
      revision: getSaldo(db, "S001").revision,
      permiteSalidaExterior: true,
    });
    const master = classification(db);
    const debt = createDebt(db, {
      nombre: "Deuda ficticia inversión",
      inicioControl: "2026-01-01",
      capitalApertura: "1000.00",
    }, randomUUID(), now);
    const debtPartida = createClassification(
      db,
      "partidas",
      { nombre: "Cuota deuda ficticia", padre: master.sub.id, deuda: debt.id },
      randomUUID(),
      now,
    );
    const previews = [
      previewMovement(db, { fecha: "2026-03-01", tipo: "Gasto", importe: "10.00", saldo: "S003", partida: master.partida, concepto: "G", nota: "" }, null, false, now),
      previewMovement(db, { fecha: "2026-03-01", tipo: "Ingreso", importe: "10.00", saldo: "S003", subtipo: "Nómina", concepto: "I", nota: "" }, null, false, now),
      previewMovement(db, { fecha: "2026-03-01", tipo: "Transferencia", importe: "10.00", origen: "S001", destino: "S003", concepto: "T", nota: "" }, null, false, now),
      previewMovement(db, { fecha: "2026-03-01", tipo: "Transferencia", importe: "10.00", origen: "S003", destino: "S001", concepto: "T2", nota: "" }, null, false, now),
      previewMovement(db, { fecha: "2026-03-01", tipo: "Amortización deuda", importe: "10.00", saldo: "S003", partida: debtPartida.id, concepto: "A", nota: "" }, null, false, now),
    ];
    for (const preview of previews) {
      const row = preview.impacto.saldos.find((s: any) => s.id === "S003");
      expect(row).toBeDefined();
      expect(row!.motivo).toContain("efectivo de inversión");
      expect(row!.antes).toBe("4900.00");
      expect(row!.despues).not.toBeNull();
    }
    expect(previews[0].impacto.pendientes).not.toContain("Inversiones");
    expect(previews[0].impacto.pendientes).toContain("Valoración de inversión E4.3");
    const snapshotBefore = snapshot(db);
    for (const preview of previews) expect(preview.accion).toBe("alta");
    expect(snapshot(db)).toBe(snapshotBefore);
    const guarded = failure(() =>
      updateSaldo(db, "S003", {
        revision: getSaldo(db, "S003").revision,
        saldoApertura: "1.00",
      }),
    );
    expect(guarded.code).toBe("HISTORY_LOCKED");
    expect(getSaldo(db, "S003").saldoApertura).toBe("5000.00");
    const deactivated = updateSaldo(db, "S003", {
      revision: getSaldo(db, "S003").revision,
      estado: "Inactiva",
    });
    expect(deactivated.estado).toBe("Inactiva");
    expect(cashAt(db, "S003").disponible).toBe(490000n);
    expect(failure(() => buy(db, instrumento.id, { importeEur: "1.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null, comisionEur: null })).fields.saldoEfectivo).toContain("inactivo");
    expect(instrumentOptions(db).saldosEfectivo.map((s: any) => s.id)).not.toContain("S003");
    updateSaldo(db, "S003", {
      revision: getSaldo(db, "S003").revision,
      estado: "Activa",
    });
    expect(instrumentOptions(db).saldosEfectivo.map((s: any) => s.id)).toContain("S003");
  } finally {
    db.close();
  }
});

test("E4.1-AC-21/52: filtros, paginación y lecturas/impactos que no escriben", () => {
  const { db, instrumento } = base("100000.00");
  try {
    const rows = Array.from({ length: 105 }, (_, index) =>
      buy(db, instrumento.id, {
        fecha: `2026-02-${String((index % 20) + 1).padStart(2, "0")}`,
        importeEur: "1.00",
        cantidad: "1",
        precio: "1.00",
        divisa: "EUR",
        cambio: null,
        comisionEur: null,
      }),
    );
    expect(listPurchases(db).total).toBe(105);
    expect(listPurchases(db).compras).toHaveLength(100);
    expect(listPurchases(db, new URLSearchParams("page=2")).compras).toHaveLength(5);
    expect(listPurchases(db, new URLSearchParams("saldo=S004")).total).toBe(105);
    expect(listPurchases(db, new URLSearchParams("saldoEfectivo=S003")).total).toBe(105);
    expect(listPurchases(db, new URLSearchParams("saldoInversion=S004")).total).toBe(105);
    expect(listPurchases(db, new URLSearchParams("saldoEfectivo=S004")).total).toBe(0);
    const target = rows[0].compra;
    const before = snapshot(db);
    previewPurchase(db, defaultPurchase(instrumento.id, { importeEur: "1.00", cantidad: "1", precio: "1.00", divisa: "EUR", cambio: null, comisionEur: null }), now);
    previewRectification(db, target.id, {
      revision: 1,
      motivo: "Vista",
      fecha: target.fecha,
      cantidad: "1",
      precio: "1.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "2.00",
      comisionEur: null,
      concepto: null,
      nota: null,
    }, now);
    previewAnnulment(db, target.id, { revision: 1 });
    listInstrumentos(db);
    getInstrumento(db, instrumento.id);
    instrumentOptions(db);
    listPurchases(db);
    getPurchase(db, target.id);
    purchaseAudit(db, target.id);
    instrumentoAudit(db, instrumento.id);
    cashDto(db, "S003", null);
    expect(snapshot(db)).toBe(before);
  } finally {
    db.close();
  }
});

test("E4.1-AC-29: acceso, CSRF y errores heredados sin DELETE ni fixtures", async () => {
  const db = openDatabase(":memory:");
  const key = randomBytes(32),
    password = "Ficticia " + randomUUID(),
    handler = HttpApp.toWebHandler(createApp(db, { key, now: () => now }));
  let cookie = "", csrf = "";
  async function request(path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) {
    const response = await handler(new Request(origin + path, {
      method,
      headers: { origin, "content-type": "application/json", cookie, "x-csrf-token": csrf, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }));
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0], name = pair.split("=")[0];
      cookie = cookie.split("; ").filter((v) => v && !v.startsWith(name + "=")).concat(pair).join("; ");
    }
    const data = await response.json();
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data };
  }
  try {
    expect((await request("/api/instrumentos")).status).toBe(401);
    const bootstrap = provision(db, now);
    const enrolled = await request("/api/auth/enroll", "POST", { token: bootstrap, password });
    await request("/api/auth/mfa", "POST", { code: totp(enrolled.data.secret).generate({ timestamp: now }) });
    expect((await request("/api/instrumentos", "POST", { nombre: "Sin CSRF" }, { "x-csrf-token": "x", origin: "http://evil.example" })).status).toBe(403);
    const deleted = await request("/api/instrumentos/I1001", "DELETE");
    expect(deleted.status).toBe(404);
    expect(deleted.data.code).toBe("NOT_FOUND");
    const invalid = await request("/api/efectivo");
    expect(invalid.status).toBe(404);
    expect(JSON.stringify(invalid.data)).not.toContain("SELECT");
  } finally {
    db.close();
  }
});

test("E4.1-AC-33: rutas 13→18, 14→18, 15→18, manifiestos y rechazos antes de mutar", () => {
  const dir = mkdtempSync(join(tmpdir(), "e41-schema-"));
  try {
    const v13 = join(dir, "v13.sqlite");
    const old = openDatabaseV13(v13);
    old.run("INSERT INTO referencias VALUES('REF500','Histórica','Viaje','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')");
    old.close();
    let db = openDatabase(v13);
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({ version: 18 });
    expect(db.query("SELECT id FROM referencias WHERE id='REF500'").get()).toEqual({ id: "REF500" });
    expect(db.query("SELECT COUNT(*) n FROM instrumentos").get()).toEqual({ n: 0 });
    for (const table of [
      "fichas_vehiculo",
      "fichas_compartidos",
      "participantes_compartido",
      "revision_comida",
      "movimiento_compartido",
    ])
      expect(db.query(`SELECT COUNT(*) n FROM ${table}`).get()).toEqual({ n: 0 });
    db.close();

    const v14 = materializeContract(join(dir, "v14.sqlite"), "C14-VEHICULOS-C69E343", (fixture) => {
      fixture.run("INSERT INTO referencias VALUES('REF900','Vehículo demo','Vehículo','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')");
      fixture.run("INSERT INTO fichas_vehiculo VALUES('REF900','1234ABC','2026-07-01','2026-06-01',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')");
    });
    db = openDatabase(v14);
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({ version: 18 });
    expect(db.query("SELECT matricula FROM fichas_vehiculo WHERE referencia='REF900'").get()).toEqual({ matricula: "1234ABC" });
    expect(db.query("SELECT COUNT(*) n FROM sqlite_master WHERE name='fichas_compartidos'").get()).toEqual({ n: 1 });
    expect(db.query("SELECT COUNT(*) n FROM fichas_compartidos").get()).toEqual({ n: 0 });
    db.close();

    const v15 = materializeContract(join(dir, "v15.sqlite"), "C15-COMPARTIDOS-AD2EDFE", (fixture) => {
      fixture.run("INSERT INTO referencias VALUES('REF9001','Caso compartido demo','Gasto compartido','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')");
      fixture.run("INSERT INTO fichas_compartidos VALUES('REF9001',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')");
      fixture.run("INSERT INTO participantes_compartido VALUES('CP9001','REF9001','Titular demo','Titular',50,'Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')");
      fixture.run("INSERT INTO referencias VALUES('REF9002','Vehículo demo','Vehículo','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')");
      fixture.run("INSERT INTO fichas_vehiculo VALUES('REF9002','1234ABC','2026-07-01','2026-06-01',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')");
    });
    db = openDatabase(v15);
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({ version: 18 });
    expect(db.query("SELECT revision FROM fichas_compartidos WHERE referencia='REF9001'").get()).toEqual({ revision: 1 });
    expect(db.query("SELECT COUNT(*) n FROM participantes_compartido").get()).toEqual({ n: 1 });
    expect(db.query("SELECT matricula FROM fichas_vehiculo WHERE referencia='REF9002'").get()).toEqual({ matricula: "1234ABC" });
    expect(db.query("SELECT COUNT(*) n FROM instrumentos").get()).toEqual({ n: 0 });
    db.close();

    const v16 = materializeContract(join(dir, "v16.sqlite"), "C16-REVISION-COMIDA-26B6F0C");
    db = openDatabase(v16);
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({ version: 18 });
    expect(db.query("SELECT COUNT(*) n FROM sqlite_master WHERE name='revision_comida'").get()).toEqual({ n: 1 });
    expect(db.query("SELECT COUNT(*) n FROM revision_comida").get()).toEqual({ n: 0 });
    expect(db.query("SELECT COUNT(*) n FROM instrumentos").get()).toEqual({ n: 0 });
    db.close();

    const v17 = materializeContract(join(dir, "v17.sqlite"), "C17-D5-CF6954A");
    db = openDatabase(v17);
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({ version: 18 });
    expect(db.query("SELECT COUNT(*) n FROM sqlite_master WHERE name='movimiento_compartido'").get()).toEqual({ n: 1 });
    expect(db.query("SELECT COUNT(*) n FROM movimiento_compartido").get()).toEqual({ n: 0 });
    expect(
      (db.query("SELECT sql FROM sqlite_master WHERE name='movimientos'").get() as { sql: string }).sql,
    ).toContain("tipo='Transferencia' AND destino!='S000'");
    expect(db.query("SELECT COUNT(*) n FROM instrumentos").get()).toEqual({ n: 0 });
    db.close();

    const historical = materializeContract(join(dir, "historical.sqlite"), "C14-COMPARTIDOS-FCE1107");
    expect(() => openDatabase(historical)).toThrow("Contrato de esquema v14 desconocido o incompleto; no se modificará esta base.");

    const incomplete = materializeContract(join(dir, "incomplete.sqlite"), "C14-VEHICULOS-C69E343");
    const incompleteDb = new Database(incomplete);
    incompleteDb.exec("DROP TRIGGER ficha_vehiculo_no_delete");
    incompleteDb.close();
    expect(() => openDatabase(incomplete)).toThrow("Contrato de esquema v14 desconocido o incompleto; no se modificará esta base.");

    const extra = materializeContract(join(dir, "extra.sqlite"), "C15-COMPARTIDOS-AD2EDFE");
    const extraDb = new Database(extra);
    extraDb.exec("CREATE TABLE synthetic_demo(x INTEGER)");
    extraDb.close();
    expect(() => openDatabase(extra)).toThrow("Contrato de esquema v15 desconocido o incompleto; no se modificará esta base.");

    const incomplete16 = materializeContract(join(dir, "incomplete16.sqlite"), "C16-REVISION-COMIDA-26B6F0C");
    const incomplete16Db = new Database(incomplete16);
    incomplete16Db.exec("DROP TRIGGER revision_comida_no_delete");
    incomplete16Db.close();
    expect(() => openDatabase(incomplete16)).toThrow("Contrato de esquema v16 desconocido o incompleto; no se modificará esta base.");

    const extra17 = materializeContract(join(dir, "extra17.sqlite"), "C17-D5-CF6954A");
    const extra17Db = new Database(extra17);
    extra17Db.exec("CREATE TABLE synthetic_d5(x INTEGER)");
    extra17Db.close();
    expect(() => openDatabase(extra17)).toThrow("Contrato de esquema v17 desconocido o incompleto; no se modificará esta base.");

    const v19 = materializeContract(join(dir, "v19.sqlite"), "C15-COMPARTIDOS-AD2EDFE");
    const v19Db = new Database(v19);
    v19Db.exec("UPDATE schema_version SET version=19");
    v19Db.close();
    expect(() => openDatabase(v19)).toThrow("Esquema no compatible");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.1-AC-33(f): v17 real con filas D5 preserva movimiento_compartido al subir a 18", () => {
  const dir = mkdtempSync(join(tmpdir(), "e41-real-v17-"));
  try {
    const path = join(dir, "v17.sqlite");
    const v17 = openDatabaseV17(path);
    const time = "2026-01-01T00:00:00Z";
    v17.run(
      "INSERT INTO referencias VALUES('REF900','Aportación D5 demo','Gasto compartido','Activa',1,?,?)",
      [time, time],
    );
    v17.run("INSERT INTO fichas_compartidos VALUES('REF900',1,?,?)", [time, time]);
    v17.run(
      "INSERT INTO participantes_compartido VALUES('CP9001','REF900','Tercero demo','Tercero',50,'Activa',1,?,?)",
      [time, time],
    );
    v17.run(
      `INSERT INTO movimientos VALUES('1','2026-02-01','Transferencia',30000,'S000','S001',NULL,NULL,
        'Aportación D5','Nota D5',0,1,?,?,'REF900',NULL,NULL)`,
      [time, time],
    );
    v17.run(
      `INSERT INTO movimiento_compartido VALUES('1','REF900','CP9001','Evidencia D5 ficticia',
        'Documento bancario',1,1,?,?)`,
      [time, time],
    );
    v17.close();

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 18,
      });
      expect(
        db.query("SELECT * FROM movimiento_compartido").all(),
      ).toEqual([
        {
          movimiento: "1",
          referencia: "REF900",
          participante: "CP9001",
          evidencia: "Evidencia D5 ficticia",
          procedencia: "Documento bancario",
          revision_movimiento: 1,
          revision: 1,
          creado: time,
          actualizado: time,
        },
      ]);
      expect(
        db.query("SELECT tipo,origen,destino,importe FROM movimientos WHERE id='1'").get(),
      ).toEqual({ tipo: "Transferencia", origen: "S000", destino: "S001", importe: 30000 });
      expect(
        db.query("SELECT COUNT(*) n FROM sqlite_master WHERE name='revision_comida'").get(),
      ).toEqual({ n: 1 });
      expect(db.query("SELECT COUNT(*) n FROM instrumentos").get()).toEqual({ n: 0 });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.1-AC-33(d): v15 real de main preserva Compartidos y Vehículos al subir a 18", () => {
  const dir = mkdtempSync(join(tmpdir(), "e41-real-v15-"));
  try {
    const path = join(dir, "v15.sqlite");
    const v15 = openDatabaseV15(path);
    const stamp = "2026-01-01T00:00:00Z";
    v15.run(
      "INSERT INTO referencias VALUES('REF9100','Compartido real demo','Gasto compartido','Activa',1,?,?)",
      [stamp, stamp],
    );
    v15.run("INSERT INTO fichas_compartidos VALUES('REF9100',1,?,?)", [stamp, stamp]);
    v15.run(
      "INSERT INTO participantes_compartido VALUES('CP9100','REF9100','Titular real','Titular',50,'Activa',1,?,?)",
      [stamp, stamp],
    );
    v15.run(
      "INSERT INTO compartido_audit VALUES(1,'REF9100','alta',NULL,'{\"revision\":1}','Alta real',?, 'usuario-unico')",
      [stamp],
    );
    v15.run(
      "INSERT INTO compartido_attempts VALUES('intento-real','hash','{}',9999999999999)",
    );
    v15.run(
      "INSERT INTO referencias VALUES('REF9101','Vehículo real demo','Vehículo','Activa',1,?,?)",
      [stamp, stamp],
    );
    v15.run(
      "INSERT INTO fichas_vehiculo VALUES('REF9101','9101 ABC','2027-01-01','2026-12-01',1,?,?)",
      [stamp, stamp],
    );
    v15.run("UPDATE counters SET next=7 WHERE name='participantes_compartido'");
    expect(v15.query("SELECT version FROM schema_version").get()).toEqual({ version: 15 });
    v15.close();

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({ version: 18 });
      for (const [table, id, expected] of [
        ["fichas_compartidos", "REF9100", 1],
        ["participantes_compartido", "CP9100", 1],
        ["compartido_audit", "REF9100", 1],
        ["compartido_attempts", "intento-real", 1],
        ["fichas_vehiculo", "REF9101", 1],
        ["referencias", "REF9100", 1],
        ["referencias", "REF9101", 1],
      ] as const)
        expect(
          db.query(`SELECT COUNT(*) n FROM ${table} WHERE ${table === "compartido_attempts" ? "key" : table === "referencias" ? "id" : table === "fichas_compartidos" || table === "compartido_audit" ? "referencia" : table === "fichas_vehiculo" ? "referencia" : "id"}=?`).get(id),
        ).toEqual({ n: expected });
      expect(db.query("SELECT next FROM counters WHERE name='participantes_compartido'").get()).toEqual({ next: 7 });
      expect(db.query("SELECT next FROM counters WHERE name='instrumento'").get()).toEqual({ next: 1001 });
      expect(db.query("SELECT next FROM counters WHERE name='operaciones_inversion'").get()).toEqual({ next: 1 });
      expect(db.query("SELECT matricula FROM fichas_vehiculo WHERE referencia='REF9101'").get()).toEqual({ matricula: "9101 ABC" });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.1-AC-48: 0, 1 y N Saldos elegibles se listan por separado y sin preselección", () => {
  const { db } = base();
  try {
    let options = instrumentOptions(db);
    expect(options.saldosEfectivo.map((saldo: any) => saldo.id)).toEqual(["S003"]);
    expect(options.saldosEfectivo[0].disponible).toBe("5000.00");
    expect(options.saldosInversion.map((saldo: any) => saldo.id)).toEqual(["S004"]);
    const second = createSaldo(
      db,
      {
        nombre: "Segundo efectivo de inversión demo",
        tipo: "Efectivo",
        control: "Inversiones",
      },
      randomUUID(),
      now,
    );
    options = instrumentOptions(db);
    expect(options.saldosEfectivo.map((saldo: any) => saldo.id)).toEqual([
      "S003",
      second.id,
    ]);
    expect(options.saldosEfectivo.map((saldo: any) => saldo.disponible)).toEqual([
      "5000.00",
      "0.00",
    ]);
    updateSaldo(db, "S003", {
      revision: getSaldo(db, "S003").revision,
      estado: "Inactiva",
    });
    updateSaldo(db, second.id, {
      revision: getSaldo(db, second.id).revision,
      estado: "Inactiva",
    });
    options = instrumentOptions(db);
    expect(options.saldosEfectivo).toEqual([]);
  } finally {
    db.close();
  }
});
