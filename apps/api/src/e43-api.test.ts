import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createSaldo, getSaldo, updateSaldo } from "./saldos";
import {
  changeInstrumentoState,
  createInstrumento,
} from "./instrumentos";
import { annulPurchase, createPurchase } from "./compras";
import { createSale } from "./ventas";
import {
  createValuation,
  e43Corte,
  e43Position,
  e43Series,
  e43Valuation,
  rectifyValuation,
} from "./e43";
import { cashAt } from "./investment-engine";
import { Problem } from "./problem";

const now = Date.parse("2026-10-26T12:00:00Z");
const origin = "http://127.0.0.1:5173";

type Fixture = {
  db: Database;
  i1: string;
  i2: string;
  i3: string;
  i5: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
};

function fixture(withValuations = true): Fixture {
  const db = openDatabase(":memory:");
  updateSaldo(db, "S003", {
    revision: getSaldo(db, "S003").revision,
    saldoApertura: "2700.00",
    fechaApertura: "2026-01-01",
    permiteSalidaExterior: true,
  });
  createSaldo(
    db,
    { nombre: "Cartera secundaria demo", tipo: "Inversión", control: "Inversiones" },
    randomUUID(),
    now,
  );
  createSaldo(
    db,
    {
      nombre: "Efectivo secundario demo",
      tipo: "Efectivo",
      control: "Inversiones",
      saldoApertura: "500.00",
      fechaApertura: "2026-01-01",
    },
    randomUUID(),
    now,
  );
  const instrumento = (nombre: string, isin: string) =>
    createInstrumento(
      db,
      {
        nombre,
        isin,
        isinEvidencia: "Extracto ficticio E4.3 · 2026-01-10",
        divisaReferencia: "EUR",
      },
      randomUUID(),
      now,
    ).instrumento.id;
  const i1 = instrumento("Fondo índice demo", "ES0000000001"),
    i2 = instrumento("Acción demo", "ES0000000002"),
    i3 = instrumento("Fondo heredado demo", "ES0000000003"),
    i5 = instrumento("Fondo manual demo", "ES0000000005");
  const buy = (
    fecha: string,
    instrumento: string,
    over: Record<string, unknown>,
  ) =>
    createPurchase(
      db,
      {
        fecha,
        instrumento,
        saldoEfectivo: "S003",
        saldoInversion: "S004",
        cantidad: "1",
        precio: "10.00",
        divisa: "EUR",
        cambio: null,
        importeEur: "10.00",
        comisionEur: "0.00",
        concepto: "Compra ficticia E4.3",
        nota: null,
        ...over,
      },
      randomUUID(),
      now,
    );
  const sell = (
    fecha: string,
    instrumento: string,
    over: Record<string, unknown>,
  ) =>
    createSale(
      db,
      {
        fecha,
        instrumento,
        saldoEfectivo: "S003",
        saldoInversion: "S004",
        cantidad: "1",
        precio: "10.00",
        divisa: "EUR",
        cambio: null,
        importeEur: "10.00",
        comisionEur: "0.00",
        concepto: "Venta ficticia E4.3",
        nota: null,
        ...over,
      },
      randomUUID(),
      now,
    );
  buy("2026-02-10", i1, {
    cantidad: "12.5",
    precio: "100.000000",
    divisa: "USD",
    cambio: "0.900000",
    importeEur: "1125.00",
    comisionEur: "5.00",
    concepto: "Compra P1 demo",
  });
  buy("2026-03-03", i1, {
    saldoInversion: "S006",
    cantidad: "3",
    precio: "98.000000",
    divisa: "USD",
    cambio: "0.900000",
    importeEur: "264.60",
    comisionEur: "0.00",
    concepto: "Compra P2 demo",
  });
  buy("2026-01-15", i3, {
    saldoInversion: "S006",
    cantidad: "10",
    precio: "20.00",
    importeEur: "200.00",
    concepto: "Compra P4 heredada demo",
  });
  buy("2026-02-01", i5, {
    saldoInversion: "S006",
    cantidad: "2",
    precio: "100.00",
    importeEur: "200.00",
    concepto: "Compra P5 manual demo",
  });
  buy("2026-05-02", i2, {
    cantidad: "4",
    precio: "50.00",
    importeEur: "200.00",
    concepto: "Compra P3 demo",
  });
  sell("2026-04-10", i1, {
    cantidad: "5",
    precio: "110.000000",
    divisa: "USD",
    cambio: "0.920000",
    importeEur: "506.00",
    comisionEur: "2.00",
    concepto: "Venta V1 demo",
  });
  sell("2026-05-20", i2, {
    cantidad: "4",
    precio: "60.00",
    importeEur: "240.00",
    concepto: "Venta V2 demo",
  });
  changeInstrumentoState(
    db,
    i3,
    { revision: 1, motivo: "Inactivación ficticia de prueba" },
    false,
    now,
  );
  const valuation = (
    saldo: string,
    instrumento: string,
    fecha: string,
    body: Record<string, unknown>,
  ) =>
    createValuation(
      db,
      saldo,
      instrumento,
      {
        fecha,
        procedencia: "Precio y cambio declarados por el usuario",
        ...body,
      },
      randomUUID(),
      now,
    ).valoracion.id;
  let q1 = "",
    q2 = "",
    q3 = "",
    q4 = "",
    q5 = "";
  if (withValuations) {
    q1 = valuation("S004", i1, "2026-03-15", {
      tipo: "Automática",
      precio: "105.000000",
      divisa: "USD",
      cambio: "0.900000",
    });
    q2 = valuation("S004", i1, "2026-04-30", {
      tipo: "Automática",
      precio: "120.000000",
      divisa: "USD",
      cambio: "0.950000",
    });
    q3 = valuation("S004", i1, "2026-06-30", {
      tipo: "Automática",
      precio: "130.000000",
      divisa: "USD",
      cambio: "0.900000",
    });
    q4 = valuation("S006", i1, "2026-04-30", {
      tipo: "Automática",
      precio: "120.000000",
      divisa: "USD",
      cambio: "0.950000",
    });
    q5 = valuation("S006", i5, "2026-04-30", {
      tipo: "Manual",
      valorEur: "205.00",
    });
  }
  return { db, i1, i2, i3, i5, q1, q2, q3, q4, q5 };
}

function failure(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    return error as Problem;
  }
  throw new Error("Se esperaba un error de dominio.");
}

function positionOf(corte: ReturnType<typeof e43Corte>, saldo: string, instrumento: string) {
  const position = corte.posiciones.find(
    (row) =>
      row.saldoInversion.id === saldo && row.instrumento.id === instrumento,
  );
  if (!position) throw new Error("Posición no encontrada en el corte.");
  return position;
}

function dumpTables(db: Database) {
  const tables = db
    .query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all() as { name: string }[];
  return JSON.stringify(
    tables.map(({ name }) => [
      name,
      db.query(`SELECT * FROM "${name}" ORDER BY rowid`).all(),
    ]),
  );
}

function http(db: Database) {
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
    return { status: response.status, data, headers: response.headers };
  }
  async function auth() {
    const bootstrap = provision(db, now);
    const enrolled = await request("/api/auth/enroll", "POST", {
      token: bootstrap,
      password,
    });
    await request("/api/auth/mfa", "POST", {
      code: totp(enrolled.data.secret).generate({ timestamp: now }),
    });
  }
  return { request, auth };
}

test("E4.3-TP-01/02/03/09/10/11/15: corte 2026-04-30, oráculo y efectivo separado", () => {
  const { db, i1, i3, i5, q5 } = fixture();
  try {
    expect(cashAt(db, "S003", "2026-04-30").disponible).toBe(141640n);
    const corte = e43Corte(db, "2026-04-30");
    expect(corte.corte).toBe("2026-04-30");
    expect(corte.posiciones).toHaveLength(4);
    const p1 = positionOf(corte, "S004", i1);
    expect(p1.estado).toBe("Abierta");
    expect(p1.cantidad).toBe("7.5");
    expect(p1.valoracion).toMatchObject({
      estado: "Disponible",
      fecha: "2026-04-30",
      diasTranscurridos: 0,
      valorEur: "855.00",
      tipo: "Automática",
      cantidadBase: "7.5",
      cantidadAlCorte: "7.5",
      elegibilidadFechaExacta:
        "Elegible por fecha exacta (E4.9 no evaluado)",
    });
    expect(p1.resultado).toEqual({ estado: "Disponible", importeEur: "236.00" });
    expect(p1.rentabilidad).toEqual({
      estado: "No disponible",
      motivo: "Fórmula no aprobada",
    });
    const p2 = positionOf(corte, "S006", i1);
    expect(p2.valoracion?.valorEur).toBe("342.00");
    expect(p2.resultado).toEqual({ estado: "Disponible", importeEur: "77.40" });
    const p4 = positionOf(corte, "S006", i3);
    expect(p4.instrumento.estado).toBe("Inactiva");
    expect(p4.valoracion).toBeNull();
    expect(p4.resultado.estado).toBe("No disponible");
    const p5 = positionOf(corte, "S006", i5);
    expect(p5.valoracion?.valorEur).toBe("205.00");
    expect(p5.resultado.estado).toBe("No disponible");
    expect(
      db
        .query(
          "SELECT divisa,cambio,precio_unitario,cantidad_base FROM valoracion_inversion WHERE id=?",
        )
        .get(q5),
    ).toEqual({
      divisa: null,
      cambio: null,
      precio_unitario: null,
      cantidad_base: null,
    });
    expect(corte.agregado).toMatchObject({
      coberturaValoracion: "Parcial 3/4",
      valorEur: null,
      coberturaResultado: "Parcial 2/4",
      resultadoEur: null,
    });
    expect(
      corte.agregado.elegibilidadFechaExacta.startsWith(
        "No elegible por fecha exacta en E4.3:",
      ),
    ).toBe(true);
    expect(corte.efectivo.map((row) => row.saldo.id)).toEqual(["S003", "S007"]);
    expect(corte.efectivo.find((row) => row.saldo.id === "S003")).toMatchObject({
      disponible: "1416.40",
      fecha: "2026-04-30",
      vista: "corte",
    });
    expect(corte.efectivo.find((row) => row.saldo.id === "S007")?.disponible).toBe(
      "500.00",
    );
    expect(corte).not.toHaveProperty("patrimonio");
  } finally {
    db.close();
  }
});

test("E4.3-TP-04/09/15: cortes 03-31 y 06-30, sin look-ahead y antigüedad visible", () => {
  const { db, i1, i3, i5 } = fixture();
  try {
    const march = e43Corte(db, "2026-03-31");
    const m1 = positionOf(march, "S004", i1);
    expect(m1.cantidad).toBe("12.5");
    expect(m1.valoracion?.valorEur).toBe("1181.25");
    expect(m1.valoracion?.fecha).toBe("2026-03-15");
    expect(m1.valoracion?.diasTranscurridos).toBe(16);
    expect(m1.resultado).toEqual({ estado: "Disponible", importeEur: "56.25" });
    expect(march.agregado.coberturaValoracion).toBe("Parcial 1/4");

    const june = e43Corte(db, "2026-06-30");
    const juneP1 = positionOf(june, "S004", i1);
    expect(juneP1.valoracion?.valorEur).toBe("877.50");
    expect(juneP1.resultado).toEqual({
      estado: "Disponible",
      importeEur: "258.50",
    });
    const juneP2 = positionOf(june, "S006", i1);
    expect(juneP2.valoracion?.fecha).toBe("2026-04-30");
    expect(juneP2.valoracion?.diasTranscurridos).toBe(61);
    const juneP5 = positionOf(june, "S006", i5);
    expect(juneP5.valoracion?.diasTranscurridos).toBe(61);
    const closed = positionOf(june, "S004", "I1002");
    expect(closed.estado).toBe("Cerrada");
    expect(closed.valoracion?.estado).toBe("No aplica");
    expect(closed.resultado).toEqual({
      estado: "Disponible",
      importeEur: "40.00",
    });
    expect(positionOf(june, "S006", i3).valoracion).toBeNull();
    expect(june.agregado.coberturaValoracion).toBe("Parcial 3/4");
    expect(june.agregado.coberturaResultado).toBe("Parcial 3/5");
    expect(june.efectivo.find((row) => row.saldo.id === "S003")?.disponible).toBe(
      "1456.40",
    );
  } finally {
    db.close();
  }
});

test("E4.3-TP-10/12: cobertura verificada solo con dos posiciones y elegibilidad exacta", () => {
  const db = openDatabase(":memory:");
  try {
    updateSaldo(db, "S003", {
      revision: getSaldo(db, "S003").revision,
      saldoApertura: "2700.00",
      fechaApertura: "2026-01-01",
    });
    createSaldo(
      db,
      { nombre: "Cartera secundaria demo", tipo: "Inversión", control: "Inversiones" },
      randomUUID(),
      now,
    );
    const i1 = createInstrumento(
      db,
      {
        nombre: "Fondo índice demo",
        isin: "ES0000000001",
        isinEvidencia: "Extracto ficticio E4.3 · 2026-01-10",
        divisaReferencia: "EUR",
      },
      randomUUID(),
      now,
    ).instrumento.id;
    const buy = (fecha: string, saldo: string, cantidad: string, precio: string) =>
      createPurchase(
        db,
        {
          fecha,
          instrumento: i1,
          saldoEfectivo: "S003",
          saldoInversion: saldo,
          cantidad,
          precio,
          divisa: "USD",
          cambio: "0.900000",
          importeEur: cantidad === "12.5" ? "1125.00" : "264.60",
          comisionEur: "0.00",
          concepto: "Compra ficticia variante",
          nota: null,
        },
        randomUUID(),
        now,
      );
    buy("2026-02-10", "S004", "12.5", "100.000000");
    buy("2026-03-03", "S006", "3", "98.000000");
    createSale(
      db,
      {
        fecha: "2026-04-10",
        instrumento: i1,
        saldoEfectivo: "S003",
        saldoInversion: "S004",
        cantidad: "5",
        precio: "110.000000",
        divisa: "USD",
        cambio: "0.920000",
        importeEur: "506.00",
        comisionEur: "2.00",
        concepto: "Venta ficticia variante",
        nota: null,
      },
      randomUUID(),
      now,
    );
    for (const [saldo, precio] of [
      ["S004", "120.000000"],
      ["S006", "120.000000"],
    ] as const)
      createValuation(
        db,
        saldo,
        i1,
        {
          fecha: "2026-04-30",
          tipo: "Automática",
          precio,
          divisa: "USD",
          cambio: "0.950000",
          procedencia: "Precio y cambio declarados por el usuario",
        },
        randomUUID(),
        now,
      );
    const corte = e43Corte(db, "2026-04-30");
    expect(corte.agregado).toMatchObject({
      coberturaValoracion: "Verificada",
      valorEur: "1197.00",
      coberturaResultado: "Verificada",
      resultadoEur: "313.40",
      elegibilidadFechaExacta: "Elegible por fecha exacta (E4.9 no evaluado)",
    });
  } finally {
    db.close();
  }
});

test("E4.3-TP-17/R-E43-13: cantidad cambiada deja la posición No disponible y exige nueva valoración", () => {
  const { db, i1 } = fixture(false);
  try {
    createValuation(
      db,
      "S004",
      i1,
      {
        fecha: "2026-03-15",
        tipo: "Automática",
        precio: "105.000000",
        divisa: "USD",
        cambio: "0.900000",
        procedencia: "Precio y cambio declarados por el usuario",
      },
      randomUUID(),
      now,
    );
    const corte = e43Corte(db, "2026-05-01");
    const p1 = positionOf(corte, "S004", i1);
    expect(p1.cantidad).toBe("7.5");
    expect(p1.valoracion).toMatchObject({
      estado: "No disponible",
      valorEur: null,
      cantidadBase: "12.5",
      cantidadAlCorte: "7.5",
    });
    expect(p1.valoracion?.motivo).toContain("Cantidad modificada desde la valoración");
    expect(p1.valoracion?.motivo).toContain("Q_F=12.5");
    expect(p1.valoracion?.motivo).toContain("Q_T=7.5");
    expect(p1.resultado.estado).toBe("No disponible");
    expect(corte.agregado.coberturaValoracion).toBe("No disponible");
    expect(corte.agregado.valorEur).toBeNull();
  } finally {
    db.close();
  }
});

test("E4.3-TP-02/03: Manual 0,00 cuenta como valor; grupo solo anulado no es posición", () => {
  const db = openDatabase(":memory:");
  try {
    updateSaldo(db, "S003", {
      revision: getSaldo(db, "S003").revision,
      saldoApertura: "100.00",
      fechaApertura: "2026-01-01",
    });
    const i1 = createInstrumento(
      db,
      {
        nombre: "Fondo manual cero",
        isin: "ES0000000009",
        isinEvidencia: "Extracto ficticio E4.3 · 2026-01-10",
        divisaReferencia: "EUR",
      },
      randomUUID(),
      now,
    ).instrumento.id;
    createPurchase(
      db,
      {
        fecha: "2026-02-10",
        instrumento: i1,
        saldoEfectivo: "S003",
        saldoInversion: "S004",
        cantidad: "1",
        precio: "10.00",
        divisa: "EUR",
        cambio: null,
        importeEur: "10.00",
        comisionEur: "0.00",
        concepto: "Compra ficticia cero",
        nota: null,
      },
      randomUUID(),
      now,
    );
    createValuation(
      db,
      "S004",
      i1,
      {
        fecha: "2026-04-30",
        tipo: "Manual",
        valorEur: "0.00",
        procedencia: "Valor declarado por el usuario",
      },
      randomUUID(),
      now,
    );
    const corte = e43Corte(db, "2026-04-30");
    const p = positionOf(corte, "S004", i1);
    expect(p.valoracion?.valorEur).toBe("0.00");
    expect(p.resultado.estado).toBe("No disponible");
    expect(corte.agregado.coberturaValoracion).toBe("Verificada");
    expect(corte.agregado.valorEur).toBe("0.00");

    const i2 = createInstrumento(
      db,
      {
        nombre: "Instrumento solo anulado",
        isin: "ES0000000010",
        isinEvidencia: "Extracto ficticio E4.3 · 2026-01-10",
        divisaReferencia: "EUR",
      },
      randomUUID(),
      now,
    ).instrumento.id;
    const buy = createPurchase(
      db,
      {
        fecha: "2026-01-20",
        instrumento: i2,
        saldoEfectivo: "S003",
        saldoInversion: "S004",
        cantidad: "2",
        precio: "10.00",
        divisa: "EUR",
        cambio: null,
        importeEur: "20.00",
        comisionEur: "0.00",
        concepto: "Compra anulada ficticia",
        nota: null,
      },
      randomUUID(),
      now,
    );
    annulPurchase(
      db,
      buy.compra.id,
      { revision: buy.compra.revision, motivo: "Anulación ficticia de prueba" },
      now,
    );
    expect(
      e43Corte(db, "2026-04-30").posiciones.some(
        (row) => row.instrumento.id === i2,
      ),
    ).toBe(false);
  } finally {
    db.close();
  }
});

test("E4.3-TP-08/14: alta idempotente, duplicado 409, rectificación auditada y validaciones", () => {
  const { db, i1 } = fixture(false);
  try {
    const key = randomUUID();
    const created = createValuation(
      db,
      "S004",
      i1,
      {
        fecha: "2026-05-31",
        tipo: "Automática",
        precio: "120.000000",
        divisa: "USD",
        cambio: "0.950000",
        procedencia: "Precio y cambio declarados por el usuario",
      },
      key,
      now,
    );
    expect(created.valoracion).toMatchObject({
      fecha: "2026-05-31",
      valorEur: "855.00",
      cantidadBase: "7.5",
      revision: 1,
    });
    expect(created.valoracion.id).toMatch(/^VAL-\d{12}$/);
    expect(created.auditoria).toHaveLength(1);
    const replay = createValuation(
      db,
      "S004",
      i1,
      {
        fecha: "2026-05-31",
        tipo: "Automática",
        precio: "120.000000",
        divisa: "USD",
        cambio: "0.950000",
        procedencia: "Precio y cambio declarados por el usuario",
      },
      key,
      now,
    );
    expect(replay.valoracion.id).toBe(created.valoracion.id);
    expect(
      failure(() =>
        createValuation(
          db,
          "S004",
          i1,
          {
            fecha: "2026-05-31",
            tipo: "Manual",
            valorEur: "1.00",
            procedencia: "Otro valor",
          },
          key,
          now,
        ),
      ),
    ).toMatchObject({ status: 409, code: "IDEMPOTENCY_CONFLICT" });
    expect(
      failure(() =>
        createValuation(
          db,
          "S004",
          i1,
          {
            fecha: "2026-05-31",
            tipo: "Manual",
            valorEur: "999.00",
            procedencia: "Duplicado ficticio",
          },
          randomUUID(),
          now,
        ),
      ),
    ).toMatchObject({ status: 409, code: "VALUATION_EXISTS" });

    const rectified = rectifyValuation(
      db,
      created.valoracion.id,
      {
        revision: 1,
        motivo: "Corrección ficticia del precio",
        fecha: "2026-05-31",
        tipo: "Automática",
        precio: "130.000000",
        divisa: "USD",
        cambio: "0.950000",
        procedencia: "Precio corregido por el usuario",
      },
      now,
    );
    expect(rectified.valoracion).toMatchObject({
      revision: 2,
      valorEur: "926.25",
      procedencia: "Precio corregido por el usuario",
    });
    expect(rectified.auditoria.map((entry) => entry.accion)).toEqual([
      "alta",
      "corrección",
    ]);
    expect(
      failure(() =>
        rectifyValuation(
          db,
          created.valoracion.id,
          {
            revision: 1,
            motivo: "Revisión obsoleta",
            fecha: "2026-05-31",
            tipo: "Automática",
            precio: "130.000000",
            divisa: "USD",
            cambio: "0.950000",
            procedencia: "Precio corregido por el usuario",
          },
          now,
        ),
      ),
    ).toMatchObject({ status: 409, code: "REVISION_CONFLICT" });
    expect(
      failure(() =>
        createValuation(
          db,
          "S004",
          i1,
          {
            fecha: "2026-04-30",
            tipo: "Automática",
            precio: "0.000000",
            divisa: "USD",
            cambio: "0.950000",
            procedencia: "Precio cero",
          },
          randomUUID(),
          now,
        ),
      ),
    ).toMatchObject({ status: 422, code: "VALIDATION" });
    expect(
      failure(() =>
        createValuation(
          db,
          "S004",
          i1,
          {
            fecha: "2027-01-01",
            tipo: "Automática",
            precio: "10.000000",
            divisa: "USD",
            cambio: "0.950000",
            procedencia: "Fecha futura",
          },
          randomUUID(),
          now,
        ),
      ),
    ).toMatchObject({ status: 422, code: "VALIDATION" });
    expect(
      failure(() =>
        createValuation(
          db,
          "S004",
          i1,
          {
            fecha: "2026-05-31",
            tipo: "Automática",
            precio: "10.000000",
            divisa: "USD",
            cambio: "0.950000",
            procedencia: "Campo derivado",
            cantidadBase: "999",
          },
          randomUUID(),
          now,
        ),
      ),
    ).toMatchObject({ status: 422, code: "VALIDATION" });
  } finally {
    db.close();
  }
});

test("E4.3-TP-08: base automática inconsistente no se usa al leer", () => {
  const { db, q2 } = fixture();
  try {
    db.run(
      "UPDATE valoracion_inversion SET cantidad_base=1000000000,revision=2,motivo_correccion='Base ficticia inconsistente',actualizado_utc=? WHERE id=?",
      [new Date(now).toISOString(), q2],
    );
    const corte = e43Corte(db, "2026-04-30");
    const p1 = positionOf(corte, "S004", "I1001");
    expect(p1.valoracion).toMatchObject({
      estado: "No disponible",
      valorEur: null,
      cantidadBase: "10",
      cantidadAlCorte: "7.5",
    });
    expect(p1.valoracion?.motivo).toContain("cantidad base no coincide");
    expect(p1.resultado.estado).toBe("No disponible");
    expect(corte.agregado.coberturaValoracion).toBe("Parcial 2/4");
  } finally {
    db.close();
  }
});

test("E4.3-TP-12/16: detalle, serie y ficha sin escribir", () => {
  const { db, i1, q2 } = fixture();
  try {
    const before = dumpTables(db);
    const detail = e43Position(db, "S004", i1, "2026-04-30");
    expect(detail.serie.map((row) => row.fecha)).toEqual([
      "2026-03-15",
      "2026-04-30",
    ]);
    expect(detail.serie[0]).toMatchObject({
      estado: "Disponible",
      valorEur: "1181.25",
      cantidadBase: "12.5",
    });
    expect(detail.valoracion?.valorEur).toBe("855.00");
    const series = e43Series(
      db,
      "S004",
      i1,
      "2026-04-01",
      "2026-06-30",
    );
    expect(series.valoraciones.map((row) => row.fecha)).toEqual([
      "2026-04-30",
      "2026-06-30",
    ]);
    const single = e43Valuation(db, q2);
    expect(single.posicion.saldo.id).toBe("S004");
    expect(single.auditoria).toHaveLength(1);
    const after = dumpTables(db);
    expect(after).toBe(before);
  } finally {
    db.close();
  }
});

test("E4.3-TP-01 L: redondeo único del producto no exacto", () => {
  const db = openDatabase(":memory:");
  try {
    updateSaldo(db, "S003", {
      revision: getSaldo(db, "S003").revision,
      saldoApertura: "1000.00",
      fechaApertura: "2026-01-01",
    });
    const i1 = createInstrumento(
      db,
      {
        nombre: "Fondo redondeo demo",
        isin: "ES0000000011",
        isinEvidencia: "Extracto ficticio E4.3 · 2026-01-10",
        divisaReferencia: "EUR",
      },
      randomUUID(),
      now,
    ).instrumento.id;
    createPurchase(
      db,
      {
        fecha: "2026-02-10",
        instrumento: i1,
        saldoEfectivo: "S003",
        saldoInversion: "S004",
        cantidad: "7.5",
        precio: "33.333333",
        divisa: "USD",
        cambio: "0.900000",
        importeEur: "225.00",
        comisionEur: "0.00",
        concepto: "Compra ficticia de redondeo",
        nota: null,
      },
      randomUUID(),
      now,
    );
    const created = createValuation(
      db,
      "S004",
      i1,
      {
        fecha: "2026-04-30",
        tipo: "Automática",
        precio: "33.333333",
        divisa: "USD",
        cambio: "0.900000",
        procedencia: "Precio y cambio declarados por el usuario",
      },
      randomUUID(),
      now,
    );
    expect(created.valoracion.valorEur).toBe("225.00");
  } finally {
    db.close();
  }
});

test("E4.3-TP-05 L: resultado negativo visible con signo", () => {
  const { db, i1 } = fixture();
  try {
    createValuation(
      db,
      "S004",
      i1,
      {
        fecha: "2026-05-31",
        tipo: "Automática",
        precio: "70.000000",
        divisa: "USD",
        cambio: "0.950000",
        procedencia: "Precio y cambio declarados por el usuario",
      },
      randomUUID(),
      now,
    );
    const position = positionOf(e43Corte(db, "2026-05-31"), "S004", i1);
    expect(position.resultado).toEqual({
      estado: "Disponible",
      importeEur: "-120.25",
    });
  } finally {
    db.close();
  }
});

test("E4.3-TP-02 N: cerrada con valoración Manual histórica prevalece D-03", () => {
  const { db, i2 } = fixture();
  try {
    createValuation(
      db,
      "S004",
      i2,
      {
        fecha: "2026-05-10",
        tipo: "Manual",
        valorEur: "999.00",
        procedencia: "Valor manual histórico ficticio",
      },
      randomUUID(),
      now,
    );
    const closed = positionOf(e43Corte(db, "2026-06-30"), "S004", i2);
    expect(closed.estado).toBe("Cerrada");
    expect(closed.valoracion).toMatchObject({
      estado: "No aplica",
      valorEur: null,
    });
    expect(closed.resultado).toEqual({
      estado: "Disponible",
      importeEur: "40.00",
    });
  } finally {
    db.close();
  }
});

test("E4.3-TP-10 L: sin posiciones abiertas la valoración es No aplica", () => {
  const db = openDatabase(":memory:");
  try {
    updateSaldo(db, "S003", {
      revision: getSaldo(db, "S003").revision,
      saldoApertura: "1000.00",
      fechaApertura: "2026-01-01",
    });
    const i2 = createInstrumento(
      db,
      {
        nombre: "Acción cerrada demo",
        isin: "ES0000000012",
        isinEvidencia: "Extracto ficticio E4.3 · 2026-01-10",
        divisaReferencia: "EUR",
      },
      randomUUID(),
      now,
    ).instrumento.id;
    createPurchase(
      db,
      {
        fecha: "2026-05-02",
        instrumento: i2,
        saldoEfectivo: "S003",
        saldoInversion: "S004",
        cantidad: "4",
        precio: "50.00",
        divisa: "EUR",
        cambio: null,
        importeEur: "200.00",
        comisionEur: "0.00",
        concepto: "Compra ficticia cerrada",
        nota: null,
      },
      randomUUID(),
      now,
    );
    createSale(
      db,
      {
        fecha: "2026-05-20",
        instrumento: i2,
        saldoEfectivo: "S003",
        saldoInversion: "S004",
        cantidad: "4",
        precio: "60.00",
        divisa: "EUR",
        cambio: null,
        importeEur: "240.00",
        comisionEur: "0.00",
        concepto: "Venta ficticia cerrada",
        nota: null,
      },
      randomUUID(),
      now,
    );
    const corte = e43Corte(db, "2026-06-30");
    expect(corte.posiciones).toHaveLength(1);
    expect(corte.agregado).toMatchObject({
      coberturaValoracion: "No aplica",
      valorEur: null,
      coberturaResultado: "Verificada",
      resultadoEur: "40.00",
      elegibilidadFechaExacta: "No aplica",
    });
  } finally {
    db.close();
  }
});

test("E4.3-TP-14: límite 2^53-1 y rechazo de exponentes, negativos y cambio 0", () => {
  const { db, i1 } = fixture(false);
  try {
    const max = createValuation(
      db,
      "S004",
      i1,
      {
        fecha: "2026-05-31",
        tipo: "Manual",
        valorEur: "90071992547409.91",
        procedencia: "Valor máximo ficticio",
      },
      randomUUID(),
      now,
    );
    expect(max.valoracion.valorEur).toBe("90071992547409.91");
    const invalid = (
      fecha: string,
      body: Record<string, unknown>,
    ) =>
      failure(() =>
        createValuation(
          db,
          "S004",
          i1,
          { fecha, procedencia: "Valor ficticio", ...body },
          randomUUID(),
          now,
        ),
      );
    expect(
      invalid("2026-06-01", { tipo: "Manual", valorEur: "90071992547409.92" }),
    ).toMatchObject({ status: 422, code: "VALIDATION" });
    expect(
      invalid("2026-06-02", { tipo: "Manual", valorEur: "1e3" }),
    ).toMatchObject({ status: 422, code: "VALIDATION" });
    expect(
      invalid("2026-06-03", { tipo: "Manual", valorEur: "-1.00" }),
    ).toMatchObject({ status: 422, code: "VALIDATION" });
    expect(
      invalid("2026-06-04", {
        tipo: "Automática",
        precio: "1e3",
        divisa: "USD",
        cambio: "0.900000",
      }),
    ).toMatchObject({ status: 422, code: "VALIDATION" });
    expect(
      invalid("2026-06-05", {
        tipo: "Automática",
        precio: "10.000000",
        divisa: "USD",
        cambio: "0.000000",
      }),
    ).toMatchObject({ status: 422, code: "VALIDATION" });
    expect(
      invalid("2026-06-06", {
        tipo: "Automática",
        precio: "10.0000001",
        divisa: "USD",
        cambio: "0.900000",
      }),
    ).toMatchObject({ status: 422, code: "VALIDATION" });
  } finally {
    db.close();
  }
});

test("E4.3-AC-12: rutas HTTP reales, 401/403/404/422 y contrato de lectura", async () => {
  const { db, i1 } = fixture();
  try {
    const { request, auth } = http(db);
    expect((await request("/api/e43/corte?fecha=2026-04-30")).status).toBe(401);
    await auth();
    const corte = await request("/api/e43/corte?fecha=2026-04-30");
    expect(corte.status).toBe(200);
    expect(corte.data.corte).toBe("2026-04-30");
    expect(corte.data.posiciones).toHaveLength(4);
    expect(corte.data.agregado.coberturaValoracion).toBe("Parcial 3/4");
    expect(corte.data.efectivo.map((row: { saldo: { id: string } }) => row.saldo.id)).toEqual([
      "S003",
      "S007",
    ]);
    expect((await request("/api/e43/corte?fecha=2026-02-30")).status).toBe(422);
    expect((await request("/api/e43/posiciones/S004/I1001?fecha=2026-04-30")).status).toBe(200);
    expect((await request("/api/e43/posiciones/S004/I9999?fecha=2026-04-30")).status).toBe(404);
    expect((await request("/api/e43/posiciones/S004/I1001/valoraciones?desde=2026-04-01")).status).toBe(200);
    expect((await request("/api/e43/valoraciones/VAL-999999999999")).status).toBe(404);
    const bad = await request(
      "/api/e43/posiciones/S004/I1001/valoraciones",
      "POST",
      {
        fecha: "2026-05-31",
        tipo: "Automática",
        precio: "120.000000",
        divisa: "USD",
        cambio: "0.950000",
        procedencia: "Precio declarado",
      },
      { origin: "http://evil.example" },
    );
    expect(bad.status).toBe(403);
    const csrf = await request(
      "/api/e43/posiciones/S004/I1001/valoraciones",
      "POST",
      {
        fecha: "2026-05-31",
        tipo: "Automática",
        precio: "120.000000",
        divisa: "USD",
        cambio: "0.950000",
        procedencia: "Precio declarado",
      },
      { "x-csrf-token": "incorrecto" },
    );
    expect(csrf.status).toBe(403);
    const created = await request(
      "/api/e43/posiciones/S004/I1001/valoraciones",
      "POST",
      {
        fecha: "2026-05-31",
        tipo: "Automática",
        precio: "120.000000",
        divisa: "USD",
        cambio: "0.950000",
        procedencia: "Precio declarado",
      },
      { "idempotency-key": randomUUID() },
    );
    expect(created.status).toBe(201);
    expect(created.data.valoracion).toMatchObject({
      estado: "Disponible",
      valorEur: "855.00",
    });
    expect(created.headers.get("location")).toBe(
      `/api/e43/valoraciones/${created.data.valoracion.id}`,
    );
    const ficha = await request(
      `/api/e43/valoraciones/${created.data.valoracion.id}`,
    );
    expect(ficha.status).toBe(200);
    expect(ficha.data.auditoria).toHaveLength(1);
    const rectified = await request(
      `/api/e43/valoraciones/${created.data.valoracion.id}/rectificar`,
      "POST",
      {
        revision: 1,
        motivo: "Corrección ficticia",
        fecha: "2026-05-31",
        tipo: "Manual",
        valorEur: "900.00",
        procedencia: "Valor corregido",
      },
    );
    expect(rectified.status).toBe(200);
    expect(rectified.data.valoracion).toMatchObject({
      revision: 2,
      tipo: "Manual",
      valorEur: "900.00",
    });
    const missingKey = await request(
      "/api/e43/posiciones/S004/I1001/valoraciones",
      "POST",
      {
        fecha: "2026-06-01",
        tipo: "Manual",
        valorEur: "1.00",
        procedencia: "Valor declarado",
      },
    );
    expect(missingKey.status).toBe(422);
  } finally {
    db.close();
  }
});
