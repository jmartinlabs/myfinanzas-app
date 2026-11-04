import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createInstrumento } from "./instrumentos";
import { getSaldo } from "./saldos";
import type { CierreOptions } from "./e49";

process.env.NODE_ENV = "test";

const now = Date.parse("2026-03-10T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas guards E4.9 " + randomUUID();
const stamp = "2026-01-01T00:00:00.000Z";

function seedCycles(db: Database) {
  for (const [id, inicio] of [
    ["1", "2026-01-01"],
    ["2", "2026-02-01"],
    ["3", "2026-03-01"],
  ] as const)
    db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,?,?)", [
      id,
      inicio,
      10000,
      stamp,
    ]);
}

function validOptions(): CierreOptions {
  return {
    appVersion: "0.0.0-fixture",
    backup: {
      verificado: true,
      restauracionProbada: true,
      referencia: "backup-ficticio-guards",
    },
    e35: {
      verificable: true,
      motivo: null,
      huella: "a".repeat(64),
      cobertura: "Verificada",
      datos: { fixture: "E3.5 acreditada para prueba de guards" },
    },
  };
}

function seedOperation(
  db: Database,
  input: {
    id: string;
    clase: "Compra" | "Venta";
    fecha: string;
    instrumento: string;
    cantidad: string;
    importe: number;
    concepto: string;
  },
) {
  db.run(
    `INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,
       saldo_efectivo,saldo_inversion,cantidad,precio_divisa,divisa,cambio,
       importe_eur,comision_eur,concepto,nota,estado,revision,creado,actualizado)
     VALUES(?,?,?,?,'S003','S004',?,'10000000','EUR',NULL,?,0,?,NULL,
       'Vigente',1,?,?)`,
    [
      input.id,
      input.clase,
      input.fecha,
      input.instrumento,
      input.cantidad,
      input.importe,
      input.concepto,
      stamp,
      stamp,
    ],
  );
}

function seedMovement(
  db: Database,
  input: {
    id: string;
    fecha: string;
    importe: number;
    tipo?: "Transferencia" | "Gasto";
    origen?: string;
    destino?: string;
    subtipo?: string | null;
    partida?: string | null;
    referencia?: string | null;
  },
) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
       partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
       capital,intereses)
     VALUES(?,?,?,?,?,?,?,?,?,?, '',0,1,?,?,NULL,NULL)`,
    [
      input.id,
      input.fecha,
      input.tipo ?? "Transferencia",
      input.importe,
      input.origen ?? "S001",
      input.destino ?? "S002",
      input.subtipo ?? null,
      input.partida ?? null,
      input.referencia ?? null,
      "Movimiento ficticio guard " + input.id,
      stamp,
      stamp,
    ],
  );
}

function seedClassification(db: Database) {
  db.run(
    `INSERT INTO categorias(id,nombre,grupo,anual,mensual,referencia,estado,
       revision,creado,actualizado)
     VALUES('CAT900','Gasto ficticio','Gasto','Gasto','Gasto',0,'Activa',1,?,?)`,
    [stamp, stamp],
  );
  db.run(
    `INSERT INTO subcategorias(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('SUB900','Sub ficticia','CAT900','Activa',1,?,?)`,
    [stamp, stamp],
  );
  db.run(
    `INSERT INTO subcategorias(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('SUB901','Sub alternativa','CAT900','Activa',1,?,?)`,
    [stamp, stamp],
  );
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR900','Partida ficticia','SUB900','Activa',1,?,?)`,
    [stamp, stamp],
  );
}

function seedFacts(
  db: Database,
  instrumento: string,
  options: { classification?: boolean } = {},
) {
  db.run("UPDATE saldos SET apertura=1000000 WHERE id='S003'");
  seedOperation(db, {
    id: "7001",
    clase: "Compra",
    fecha: "2026-01-10",
    instrumento,
    cantidad: "1000000000",
    importe: 100000,
    concepto: "Compra enero",
  });
  seedOperation(db, {
    id: "7002",
    clase: "Venta",
    fecha: "2026-01-20",
    instrumento,
    cantidad: "500000000",
    importe: 50000,
    concepto: "Venta enero",
  });
  seedMovement(db, {
    id: "8001",
    fecha: "2026-01-15",
    importe: 1234,
    ...(options.classification
      ? { tipo: "Gasto" as const, destino: "S000", partida: "PAR900" }
      : {}),
  });
  seedMovement(db, {
    id: "8002",
    fecha: "2026-02-05",
    importe: 500,
    ...(options.classification
      ? { tipo: "Gasto" as const, destino: "S000", partida: "PAR900" }
      : {}),
  });
}

function fixture(
  options: {
    facts?: boolean;
    classification?: boolean;
    capturedMovement?: boolean;
  } = {},
) {
  const db = openDatabase(":memory:");
  seedCycles(db);
  const key = randomBytes(32);
  const instrumento = createInstrumento(
    db,
    {
      nombre: "Instrumento ficticio guards",
      isin: "ES0000000123",
      isinEvidencia: "Evidencia ficticia guards",
      divisaReferencia: "EUR",
    },
    randomUUID(),
    now,
  ).instrumento.id;
  if (options.classification) seedClassification(db);
  if (options.facts ?? true) seedFacts(db, instrumento, options);
  if (options.capturedMovement)
    seedMovement(db, {
      id: "8003",
      fecha: "2026-01-18",
      importe: 500,
      origen: "S003",
      destino: "S001",
    });
  const handler = HttpApp.toWebHandler(
    createApp(db, { key, now: () => now, cierre: validOptions() }),
  );
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
        .filter((part) => part && !part.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = await response.json();
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data, headers: response.headers };
  }
  async function enroll() {
    const bootstrap = provision(db, now);
    const started = await request("/api/auth/enroll", "POST", {
      token: bootstrap,
      password,
    });
    expect(started.status).toBe(200);
    const verified = await request("/api/auth/mfa", "POST", {
      code: totp(started.data.secret).generate({ timestamp: now }),
    });
    expect(verified.status).toBe(200);
  }
  async function close(ciclo: string, body: Record<string, unknown> = {}) {
    const pre = await request(`/api/cierres/${ciclo}/preflight`);
    expect(pre.status).toBe(200);
    const result = await request(
      `/api/cierres/${ciclo}/cerrar`,
      "POST",
      { fingerprint: pre.data.fingerprint, ...body },
      { "idempotency-key": randomUUID() },
    );
    return { pre, result };
  }
  return { db, key, instrumento, request, enroll, close };
}

function purchaseBody(
  instrumento: string,
  over: Record<string, unknown> = {},
) {
  return {
    fecha: "2026-02-10",
    instrumento,
    saldoEfectivo: "S003",
    saldoInversion: "S004",
    cantidad: "1",
    precio: "100.00",
    divisa: "EUR",
    cambio: null,
    importeEur: "100.00",
    comisionEur: "0.00",
    concepto: "Compra abierta",
    nota: null,
    ...over,
  };
}

function purchaseRectification(over: Record<string, unknown> = {}) {
  return {
    revision: 1,
    motivo: "Rectificación ficticia",
    fecha: "2026-01-10",
    cantidad: "10",
    precio: "100.00",
    divisa: "EUR",
    cambio: null,
    importeEur: "1000.00",
    comisionEur: "0.00",
    concepto: "Compra enero",
    nota: null,
    ...over,
  };
}

function saleBody(instrumento: string, over: Record<string, unknown> = {}) {
  return {
    fecha: "2026-02-15",
    instrumento,
    saldoEfectivo: "S003",
    saldoInversion: "S004",
    cantidad: "1",
    precio: "100.00",
    divisa: "EUR",
    cambio: null,
    importeEur: "100.00",
    comisionEur: "0.00",
    concepto: "Venta abierta",
    nota: null,
    ...over,
  };
}

function saleRectification(over: Record<string, unknown> = {}) {
  return {
    revision: 1,
    motivo: "Rectificación ficticia",
    fecha: "2026-01-20",
    cantidad: "5",
    precio: "100.00",
    divisa: "EUR",
    cambio: null,
    importeEur: "500.00",
    comisionEur: "0.00",
    concepto: "Venta enero",
    nota: null,
    ...over,
  };
}

function movementBody(over: Record<string, unknown> = {}) {
  return {
    fecha: "2026-01-15",
    tipo: "Transferencia",
    importe: "12.34",
    origen: "S001",
    destino: "S002",
    subtipo: null,
    partida: null,
    referencia: null,
    concepto: "Movimiento abierto",
    nota: null,
    capital: null,
    intereses: null,
    ...over,
  };
}

function movementRectification(over: Record<string, unknown> = {}) {
  return {
    revision: 1,
    motivo: "Rectificación ficticia",
    ...movementBody({ fecha: "2026-02-10" }),
    ...over,
  };
}

/** Full legal payload for the captured-account movement seeded as 8003. */
function capturedMovement(over: Record<string, unknown> = {}) {
  return {
    revision: 1,
    motivo: "Rectificación ficticia",
    fecha: "2026-01-18",
    tipo: "Transferencia",
    importe: "5.00",
    origen: "S003",
    destino: "S001",
    subtipo: null,
    partida: null,
    referencia: null,
    concepto: "Movimiento capturado",
    nota: null,
    capital: null,
    intereses: null,
    ...over,
  };
}

function rowCount(db: Database, table: string) {
  return (db.query(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n;
}

async function createMovement(
  f: ReturnType<typeof fixture>,
  body: Record<string, unknown>,
) {
  const impact = await f.request("/api/movimientos/impacto", "POST", body);
  expect(impact.status).toBe(200);
  const created = await f.request(
    "/api/movimientos",
    "POST",
    {
      ...body,
      contextRevision: impact.data.contextRevision,
      fingerprint: impact.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
  return { impact, created };
}

test("E4.9 T1 Movimientos: bloquea solo el cambio con impacto en una foto y permite el hecho sin impacto", async () => {
  const f = fixture({ capturedMovement: true });
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);
  const before = rowCount(f.db, "movimientos");

  const impactedCreate = await f.request(
    "/api/movimientos",
    "POST",
    movementBody({ origen: "S003", destino: "S001" }),
    { "idempotency-key": randomUUID() },
  );
  expect(impactedCreate.status).toBe(409);
  expect(impactedCreate.data.code).toBe("HISTORY_LOCKED");
  expect(impactedCreate.data.cierres?.[0]).toMatchObject({
    ciclo: "1",
    version: 1,
  });

  const allowed = await createMovement(
    f,
    movementBody({ importe: "12.35", concepto: "Hecho de enero sin efectivo capturado" }),
  );
  expect(allowed.created.status).toBe(201);
  expect(allowed.created.data.movimiento.fecha).toBe("2026-01-15");
  expect(rowCount(f.db, "movimientos")).toBe(before + 1);

  const notePlan = await f.request(
    "/api/movimientos/8003/impacto",
    "POST",
    capturedMovement({
      concepto: "Concepto corregido sin cambiar el importe",
      nota: "Nota informativa en ventana cerrada",
    }),
  );
  expect(notePlan.status).toBe(200);
  const noteOnly = await f.request(
    "/api/movimientos/8003/rectificar",
    "POST",
    {
      ...capturedMovement({
        concepto: "Concepto corregido sin cambiar el importe",
        nota: "Nota informativa en ventana cerrada",
      }),
      contextRevision: notePlan.data.contextRevision,
      fingerprint: notePlan.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(noteOnly.status).toBe(200);
  expect(noteOnly.data.movimiento.concepto).toBe(
    "Concepto corregido sin cambiar el importe",
  );
  expect(noteOnly.data.movimiento.importe).toBe("5.00");

  const amountChange = await f.request("/api/movimientos/8003/rectificar", "POST", {
    ...capturedMovement({ revision: 2, importe: "6.00" }),
  }, { "idempotency-key": randomUUID() });
  expect(amountChange.status).toBe(409);
  expect(amountChange.data.code).toBe("HISTORY_LOCKED");

  const moveOut = await f.request("/api/movimientos/8003/rectificar", "POST", {
    ...capturedMovement({ revision: 2, fecha: "2026-02-10" }),
  }, { "idempotency-key": randomUUID() });
  expect(moveOut.status).toBe(409);
  expect(moveOut.data.code).toBe("HISTORY_LOCKED");

  const open = await createMovement(
    f,
    movementBody({
      fecha: "2026-02-10",
      origen: "S003",
      destino: "S001",
      importe: "5.00",
      concepto: "Movimiento abierto capturado",
    }),
  );
  expect(open.created.status).toBe(201);
  const openId = open.created.data.movimiento.id as string;
  const moveIn = await f.request(
    `/api/movimientos/${openId}/rectificar`,
    "POST",
    capturedMovement({ revision: 1, fecha: "2026-01-18" }),
    { "idempotency-key": randomUUID() },
  );
  expect(moveIn.status).toBe(409);
  expect(moveIn.data.code).toBe("HISTORY_LOCKED");

  const annul = await f.request("/api/movimientos/8003/anular", "POST", {
    revision: 2,
    motivo: "Anulación ficticia",
  }, { "idempotency-key": randomUUID() });
  expect(annul.status).toBe(409);
  expect(annul.data.code).toBe("HISTORY_LOCKED");

  const freePlan = await f.request(
    "/api/movimientos/8001/impacto-anulacion",
    "POST",
    { revision: 1, motivo: "Anulación sin impacto capturado" },
  );
  expect(freePlan.status).toBe(200);
  const freeAnnul = await f.request(
    "/api/movimientos/8001/anular",
    "POST",
    {
      revision: 1,
      motivo: "Anulación sin impacto capturado",
      contextRevision: freePlan.data.contextRevision,
      fingerprint: freePlan.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(freeAnnul.status).toBe(200);
  expect(
    f.db.query("SELECT anulado FROM movimientos WHERE id='8001'").get(),
  ).toEqual({ anulado: 1 });
});

test("E4.9 T1 Compras: bloquea impacto y permite la rectificación informativa", async () => {
  const f = fixture();
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);
  const before = rowCount(f.db, "operaciones_inversion");

  const createClosed = await f.request(
    "/api/compras",
    "POST",
    purchaseBody(f.instrumento, { fecha: "2026-01-12" }),
    { "idempotency-key": randomUUID() },
  );
  expect(createClosed.status).toBe(409);
  expect(createClosed.data.code).toBe("HISTORY_LOCKED");
  expect(rowCount(f.db, "operaciones_inversion")).toBe(before);

  const noteOnly = await f.request("/api/compras/7001/rectificar", "POST", {
    ...purchaseRectification({
      concepto: "Compra enero con concepto corregido",
      nota: "Nota informativa",
    }),
  });
  expect(noteOnly.status).toBe(200);
  expect(noteOnly.data.compra.concepto).toBe(
    "Compra enero con concepto corregido",
  );
  expect(noteOnly.data.compra.importeEur).toBe("1000.00");

  const amountChange = await f.request("/api/compras/7001/rectificar", "POST", {
    ...purchaseRectification({ revision: 2, importeEur: "1001.00" }),
  });
  expect(amountChange.status).toBe(409);
  expect(amountChange.data.code).toBe("HISTORY_LOCKED");

  const moveOut = await f.request("/api/compras/7001/rectificar", "POST", {
    ...purchaseRectification({ revision: 2, fecha: "2026-02-10" }),
  });
  expect(moveOut.status).toBe(409);
  expect(moveOut.data.code).toBe("HISTORY_LOCKED");

  const annul = await f.request("/api/compras/7001/anular", "POST", {
    revision: 2,
    motivo: "Anulación ficticia",
  });
  expect(annul.status).toBe(409);
  expect(annul.data.code).toBe("HISTORY_LOCKED");

  const open = await f.request(
    "/api/compras",
    "POST",
    purchaseBody(f.instrumento, { concepto: "Compra abierta capturada" }),
    { "idempotency-key": randomUUID() },
  );
  expect(open.status).toBe(201);
  const openId = open.data.compra.id as string;
  const moveIn = await f.request(`/api/compras/${openId}/rectificar`, "POST", {
    ...purchaseRectification({
      cantidad: "1",
      importeEur: "100.00",
      fecha: "2026-01-12",
    }),
  });
  expect(moveIn.status).toBe(409);
  expect(moveIn.data.code).toBe("HISTORY_LOCKED");

  expect(
    f.db
      .query("SELECT revision FROM operaciones_inversion WHERE id='7001'")
      .get(),
  ).toEqual({ revision: 2 });
  expect(rowCount(f.db, "operaciones_inversion")).toBe(before + 1);
});

test("E4.9 T1 Ventas: bloquea impacto y permite la rectificación informativa", async () => {
  const f = fixture();
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);
  const before = rowCount(f.db, "operaciones_inversion");

  const createClosed = await f.request(
    "/api/ventas",
    "POST",
    saleBody(f.instrumento, { fecha: "2026-01-21" }),
    { "idempotency-key": randomUUID() },
  );
  expect(createClosed.status).toBe(409);
  expect(createClosed.data.code).toBe("HISTORY_LOCKED");
  expect(rowCount(f.db, "operaciones_inversion")).toBe(before);

  const noteOnly = await f.request("/api/ventas/7002/rectificar", "POST", {
    ...saleRectification({
      concepto: "Venta enero con concepto corregido",
      nota: "Nota informativa",
    }),
  });
  expect(noteOnly.status).toBe(200);
  expect(noteOnly.data.venta.concepto).toBe(
    "Venta enero con concepto corregido",
  );

  const amountChange = await f.request("/api/ventas/7002/rectificar", "POST", {
    ...saleRectification({ revision: 2, importeEur: "501.00" }),
  });
  expect(amountChange.status).toBe(409);
  expect(amountChange.data.code).toBe("HISTORY_LOCKED");

  const moveOut = await f.request("/api/ventas/7002/rectificar", "POST", {
    ...saleRectification({ revision: 2, fecha: "2026-02-15" }),
  });
  expect(moveOut.status).toBe(409);
  expect(moveOut.data.code).toBe("HISTORY_LOCKED");

  const annul = await f.request("/api/ventas/7002/anular", "POST", {
    revision: 2,
    motivo: "Anulación ficticia",
  });
  expect(annul.status).toBe(409);
  expect(annul.data.code).toBe("HISTORY_LOCKED");

  const open = await f.request(
    "/api/ventas",
    "POST",
    saleBody(f.instrumento, { concepto: "Venta abierta capturada" }),
    { "idempotency-key": randomUUID() },
  );
  expect(open.status).toBe(201);
  const openId = open.data.venta.id as string;
  const moveIn = await f.request(`/api/ventas/${openId}/rectificar`, "POST", {
    ...saleRectification({
      cantidad: "1",
      importeEur: "100.00",
      fecha: "2026-01-21",
    }),
  });
  expect(moveIn.status).toBe(409);
  expect(moveIn.data.code).toBe("HISTORY_LOCKED");
});

test("E4.9 T1 guards: un ciclo cerrado no cambia Inicio ni S0", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);
  const cycle = await f.request("/api/ciclos/1");
  const revision = cycle.data.ciclo.revision as number;
  const before = f.db.query("SELECT * FROM ciclos WHERE id='1'").get();

  for (const body of [
    {
      inicio: "2026-01-01",
      saldoInicialComida: "200.00",
      revision,
    },
    {
      inicio: "2026-01-02",
      saldoInicialComida: "100.00",
      revision,
    },
  ]) {
    const result = await f.request(
      "/api/ciclos/1/rectificar",
      "POST",
      {
        ...body,
        motivo: "Intento sobre ciclo cerrado",
        contextRevision: "a".repeat(64),
        impactRevision: "b".repeat(64),
        confirmado: true,
      },
      { "idempotency-key": randomUUID() },
    );
    expect(result.status).toBe(409);
    expect(result.data.code).toBe("HISTORY_LOCKED");
    expect(result.data.cierres?.[0]).toMatchObject({ ciclo: "1", version: 1 });
  }
  expect(f.db.query("SELECT * FROM ciclos WHERE id='1'").get()).toEqual(before);
});

test("E4.9 T2 Saldos: bloquea lo material y revisa con motivo/fingerprint lo no fotografiado", async () => {
  const f = fixture();
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);
  const photo = await f.request("/api/cierres/1/foto");
  const captured = getSaldo(f.db, "S003");
  const before = f.db.query("SELECT * FROM saldos WHERE id='S003'").get();
  const saldosBefore = rowCount(f.db, "saldos");

  const aperture = await f.request("/api/saldos/S003", "PATCH", {
    revision: captured.revision,
    saldoApertura: "10.00",
  });
  expect(aperture.status).toBe(409);
  expect(aperture.data.code).toBe("HISTORY_LOCKED");
  expect(aperture.data.cierres?.[0]).toMatchObject({ ciclo: "1", version: 1 });

  const type = await f.request("/api/saldos/S003", "PATCH", {
    revision: captured.revision,
    control: "Movimientos",
  });
  expect(type.status).toBe(409);
  expect(type.data.code).toBe("HISTORY_LOCKED");

  const creation = await f.request(
    "/api/saldos",
    "POST",
    {
      nombre: "Efectivo nuevo tras cierre",
      tipo: "Efectivo",
      control: "Inversiones",
      estado: "Activa",
      finalidad: null,
      fechaApertura: null,
      saldoApertura: null,
      objetivo: null,
      liquidez: false,
      mostrarComoBolsa: false,
      permiteSalidaExterior: false,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(creation.status).toBe(409);
  expect(creation.data.code).toBe("HISTORY_LOCKED");

  expect(f.db.query("SELECT * FROM saldos WHERE id='S003'").get()).toEqual(
    before,
  );
  expect(rowCount(f.db, "saldos")).toBe(saldosBefore);

  const rename = await f.request("/api/saldos/S003", "PATCH", {
    revision: captured.revision,
    nombre: "Efectivo de inversión renombrado",
  });
  expect(rename.status).toBe(200);
  expect(rename.data.saldo.nombre).toBe("Efectivo de inversión renombrado");

  const nonEconomic = await f.request("/api/saldos/S005", "PATCH", {
    revision: getSaldo(f.db, "S005").revision,
    saldoApertura: "5.00",
  });
  expect(nonEconomic.status).toBe(200);

  const reviewRequired = await f.request("/api/saldos/S001", "PATCH", {
    revision: getSaldo(f.db, "S001").revision,
    saldoApertura: "5.00",
  });
  expect(reviewRequired.status).toBe(409);
  expect(reviewRequired.data.code).toBe("RECTIFICATION_REQUIRED");

  const impact = await f.request("/api/saldos/S001/impacto", "POST", {
    revision: getSaldo(f.db, "S001").revision,
    saldoApertura: "5.00",
  });
  expect(impact.status).toBe(200);
  expect(impact.data.bloqueado).toBe(false);
  expect(impact.data.requiereRevision).toBe(true);
  expect(impact.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);

  const withoutMotive = await f.request("/api/saldos/S001/rectificar", "POST", {
    cambios: { revision: getSaldo(f.db, "S001").revision, saldoApertura: "5.00" },
    fingerprint: impact.data.fingerprint,
  });
  expect(withoutMotive.status).toBe(422);

  const wrongImpact = await f.request("/api/saldos/S001/rectificar", "POST", {
    cambios: { revision: getSaldo(f.db, "S001").revision, saldoApertura: "5.00" },
    motivo: "Revisión T2",
    fingerprint: "a".repeat(64),
  });
  expect(wrongImpact.status).toBe(409);
  expect(wrongImpact.data.code).toBe("IMPACT_CHANGED");

  const reviewed = await f.request("/api/saldos/S001/rectificar", "POST", {
    cambios: { revision: getSaldo(f.db, "S001").revision, saldoApertura: "5.00" },
    motivo: "Revisión T2 del saldo sin foto",
    fingerprint: impact.data.fingerprint,
  });
  expect(reviewed.status).toBe(200);
  expect(reviewed.data.saldo.saldoApertura).toBe("5.00");
  expect(
    f.db
      .query(
        "SELECT accion,motivo FROM audit WHERE entidad='S001' ORDER BY id DESC LIMIT 1",
      )
      .get(),
  ).toMatchObject({
    accion: "edición",
    motivo: "Revisión T2 del saldo sin foto",
  });

  const after = await f.request("/api/cierres/1/foto");
  expect(after.data).toEqual(photo.data);
});

test("E4.9 T2/T3: catálogos distinguen informativo de económico y exigen motivo/auditoría", async () => {
  const f = fixture({ facts: true, classification: true });
  await f.enroll();
  const reference = await f.request(
    "/api/referencias",
    "POST",
    { nombre: "Referencia guards", tipo: "Viaje" },
    { "idempotency-key": randomUUID() },
  );
  expect(reference.status).toBe(201);
  const referenceId = reference.data.item.id as string;
  const debt = await f.request(
    "/api/deudas",
    "POST",
    {
      nombre: "Deuda ficticia guards",
      inicioControl: "2026-01-01",
      capitalApertura: "100.00",
    },
    { "idempotency-key": randomUUID() },
  );
  expect(debt.status).toBe(201);
  const debtId = debt.data.item.id as string;
  expect((await f.close("1")).result.status).toBe(201);
  const photo = await f.request("/api/cierres/1/foto");

  const referenceRename = await f.request(
    `/api/referencias/${referenceId}`,
    "PATCH",
    { revision: 1, nombre: "Referencia renombrada" },
  );
  expect(referenceRename.status).toBe(200);
  expect(referenceRename.data.item.nombre).toBe("Referencia renombrada");

  const referenceNoMotive = await f.request(
    `/api/referencias/${referenceId}/desactivar`,
    "POST",
    { revision: 2 },
  );
  expect(referenceNoMotive.status).toBe(422);
  expect(referenceNoMotive.data.code).toBe("VALIDATION");

  const referenceReviewed = await f.request(
    `/api/referencias/${referenceId}/desactivar`,
    "POST",
    {
      revision: 2,
      motivo: "Baja revisada de catálogo tras el cierre",
    },
  );
  expect(referenceReviewed.status).toBe(200);
  expect(referenceReviewed.data.item.estado).toBe("Inactiva");
  expect(
    f.db
      .query("SELECT motivo FROM audit WHERE entidad=? ORDER BY id DESC LIMIT 1")
      .get(referenceId),
  ).toMatchObject({ motivo: "Baja revisada de catálogo tras el cierre" });

  const debtRename = await f.request(`/api/deudas/${debtId}`, "PATCH", {
    revision: 1,
    nombre: "Deuda renombrada guards",
  });
  expect(debtRename.status).toBe(200);
  expect(debtRename.data.item.nombre).toBe("Deuda renombrada guards");

  const debtNoMotive = await f.request(`/api/deudas/${debtId}`, "PATCH", {
    revision: 2,
    estado: "Inactiva",
  });
  expect(debtNoMotive.status).toBe(422);

  const debtReviewed = await f.request(`/api/deudas/${debtId}`, "PATCH", {
    revision: 2,
    estado: "Inactiva",
    motivo: "Baja revisada de Deuda tras el cierre",
  });
  expect(debtReviewed.status).toBe(200);
  expect(
    f.db
      .query("SELECT motivo FROM audit WHERE entidad=? ORDER BY id DESC LIMIT 1")
      .get(debtId),
  ).toMatchObject({ motivo: "Baja revisada de Deuda tras el cierre" });

  const instrumentRename = await f.request(
    `/api/instrumentos/${f.instrumento}`,
    "PATCH",
    { revision: 1, nombre: "Instrumento renombrado", motivo: "Renombrado T3" },
  );
  expect(instrumentRename.status).toBe(200);

  const identity = await f.request(
    `/api/instrumentos/${f.instrumento}`,
    "PATCH",
    {
      revision: 2,
      isin: "ES0000000999",
      motivo: "Intento de cambio de identidad",
    },
  );
  expect(identity.status).toBe(409);
  expect(identity.data.code).toBe("HISTORY_LOCKED");
  expect(identity.data.campos).toEqual(["isin"]);

  const after = await f.request("/api/cierres/1/foto");
  expect(after.data).toEqual(photo.data);
});

test("E4.9 T2 Gastos compartidos: el alta de participante con hechos cerrados exige motivo y audita", async () => {
  const f = fixture({ facts: true });
  await f.enroll();
  const shared = await f.request(
    "/api/compartidos/fichas",
    "POST",
    { nombre: "Compartido ficticio guards" },
    { "idempotency-key": randomUUID() },
  );
  expect(shared.status).toBe(201);
  const sharedId = shared.data.referencia.id as string;
  seedMovement(f.db, {
    id: "8010",
    fecha: "2026-01-16",
    importe: 1000,
    tipo: "Transferencia",
    referencia: sharedId,
  });
  expect((await f.close("1")).result.status).toBe(201);
  const photo = await f.request("/api/cierres/1/foto");

  const withoutMotive = await f.request(
    `/api/compartidos/fichas/${sharedId}/participantes`,
    "POST",
    { nombre: "Ana", rol: "Tercero", partes: 1 },
    { "idempotency-key": randomUUID() },
  );
  expect(withoutMotive.status).toBe(422);
  expect(withoutMotive.data.fields.motivo).toBeDefined();

  const reviewed = await f.request(
    `/api/compartidos/fichas/${sharedId}/participantes`,
    "POST",
    {
      nombre: "Ana",
      rol: "Tercero",
      partes: 1,
      motivo: "Alta revisada de participante tras el cierre",
    },
    { "idempotency-key": randomUUID() },
  );
  expect(reviewed.status).toBe(201);
  expect(
    f.db
      .query(
        "SELECT motivo FROM compartido_audit WHERE referencia=? ORDER BY rowid DESC LIMIT 1",
      )
      .get(sharedId),
  ).toMatchObject({ motivo: "Alta revisada de participante tras el cierre" });

  const after = await f.request("/api/cierres/1/foto");
  expect(after.data).toEqual(photo.data);
});

test("E4.9 T2/T3: reclasificación económica exige revisión; renombrados no económicos se permiten", async () => {
  const f = fixture({ facts: true, classification: true });
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);
  const photo = await f.request("/api/cierres/1/foto");
  const photoInstrument = (
    photo.data.foto.inversion.instrumentos as { id: string; nombre: string }[]
  ).find((item) => item.id === f.instrumento);
  expect(photoInstrument?.nombre).toBe("Instrumento ficticio guards");

  const rename = await f.request(
    "/api/clasificacion/partidas/PAR900",
    "PATCH",
    { revision: 1, nombre: "Partida renombrada" },
  );
  expect(rename.status).toBe(200);
  expect(rename.data.item.nombre).toBe("Partida renombrada");

  const blocked = await f.request(
    "/api/clasificacion/partidas/PAR900",
    "PATCH",
    { revision: 2, padre: "SUB901" },
  );
  expect(blocked.status).toBe(409);
  expect(blocked.data.code).toBe("RECTIFICATION_REQUIRED");

  const impact = await f.request(
    "/api/clasificacion/partidas/PAR900/impacto",
    "POST",
    { revision: 2, nombre: "Partida renombrada", padre: "SUB901" },
  );
  expect(impact.status).toBe(200);
  expect(impact.data.used).toBe(true);
  expect(impact.data.economic).toEqual(["padre"]);

  const reviewed = await f.request(
    "/api/clasificacion/partidas/PAR900/rectificar",
    "POST",
    {
      cambios: { revision: 2, nombre: "Partida renombrada", padre: "SUB901" },
      motivo: "Reclasificación T2 revisada",
      fingerprint: impact.data.fingerprint,
    },
  );
  expect(reviewed.status).toBe(200);
  expect(
    f.db
      .query(
        "SELECT accion,motivo FROM audit WHERE entidad='PAR900' ORDER BY id DESC LIMIT 1",
      )
      .get(),
  ).toMatchObject({ accion: "rectificación", motivo: "Reclasificación T2 revisada" });

  const renamedInstrument = await f.request(
    `/api/instrumentos/${f.instrumento}`,
    "PATCH",
    { revision: 1, nombre: "Instrumento renombrado", motivo: "Renombrado T3" },
  );
  expect(renamedInstrument.status).toBe(200);
  expect(renamedInstrument.data.instrumento.nombre).toBe(
    "Instrumento renombrado",
  );

  const after = await f.request("/api/cierres/1/foto");
  expect(after.data).toEqual(photo.data);
});

test("E4.9 AC-20/T2: los guards evitan una falsa incoherencia al cerrar fuera de orden", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  expect((await f.close("2")).result.status).toBe(201);
  const saldo = getSaldo(f.db, "S003");

  const blocked = await f.request("/api/saldos/S003", "PATCH", {
    revision: saldo.revision,
    saldoApertura: "10.00",
  });
  expect(blocked.status).toBe(409);
  expect(blocked.data.code).toBe("HISTORY_LOCKED");

  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(pre.data.coherencia.requerida).toBe(true);
  expect(pre.data.coherencia.contradicciones).toEqual([]);
  expect(
    pre.data.avisos.map((warning: { code: string }) => warning.code),
  ).toContain("CIERRE_FUERA_DE_ORDEN");

  const closed = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    {
      fingerprint: pre.data.fingerprint,
      motivo: "Cierre tardío coherente tras bloqueo T2",
    },
    { "idempotency-key": randomUUID() },
  );
  expect(closed.status).toBe(201);
  expect(closed.data.foto.version).toBe(1);
});
