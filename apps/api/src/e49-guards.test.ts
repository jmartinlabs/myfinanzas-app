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
import { closedFieldDecision } from "./e49-guards";

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
    tipo?: "Transferencia" | "Gasto" | "Ingreso";
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

test("E4.9 T1 Movimientos: 409 por fecha en ventana cerrada y por impacto de un hecho anterior", async () => {
  const f = fixture({ capturedMovement: true });
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);
  const before = rowCount(f.db, "movimientos");

  for (const body of [
    movementBody({ origen: "S003", destino: "S001" }),
    movementBody({
      importe: "12.35",
      concepto: "Hecho de enero sin efectivo capturado",
    }),
  ]) {
    const rejected = await f.request("/api/movimientos", "POST", body, {
      "idempotency-key": randomUUID(),
    });
    expect(rejected.status).toBe(409);
    expect(rejected.data.code).toBe("HISTORY_LOCKED");
    expect(rejected.data.cierres?.[0]).toMatchObject({
      ciclo: "1",
      version: 1,
    });
  }
  expect(rowCount(f.db, "movimientos")).toBe(before);

  const informational = {
    concepto: "Concepto corregido sin cambiar el importe",
    nota: "Nota informativa en ventana cerrada",
  };
  const notePlan = await f.request(
    "/api/movimientos/8003/impacto",
    "POST",
    capturedMovement(informational),
  );
  expect(notePlan.status).toBe(409);
  expect(notePlan.data.code).toBe("HISTORY_LOCKED");

  const noteOnly = await f.request(
    "/api/movimientos/8003/rectificar",
    "POST",
    capturedMovement(informational),
    { "idempotency-key": randomUUID() },
  );
  expect(noteOnly.status).toBe(409);
  expect(noteOnly.data.code).toBe("HISTORY_LOCKED");

  const amountChange = await f.request(
    "/api/movimientos/8003/rectificar",
    "POST",
    capturedMovement({ importe: "6.00" }),
    { "idempotency-key": randomUUID() },
  );
  expect(amountChange.status).toBe(409);
  expect(amountChange.data.code).toBe("HISTORY_LOCKED");

  const moveOut = await f.request(
    "/api/movimientos/8003/rectificar",
    "POST",
    capturedMovement({ fecha: "2026-02-10" }),
    { "idempotency-key": randomUUID() },
  );
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

  const annul = await f.request(
    "/api/movimientos/8003/anular",
    "POST",
    { revision: 1, motivo: "Anulación ficticia" },
    { "idempotency-key": randomUUID() },
  );
  expect(annul.status).toBe(409);
  expect(annul.data.code).toBe("HISTORY_LOCKED");

  const freeAnnul = await f.request(
    "/api/movimientos/8001/anular",
    "POST",
    { revision: 1, motivo: "Anulación en ventana cerrada" },
    { "idempotency-key": randomUUID() },
  );
  expect(freeAnnul.status).toBe(409);
  expect(freeAnnul.data.code).toBe("HISTORY_LOCKED");
  expect(
    f.db.query("SELECT anulado FROM movimientos WHERE id='8001'").get(),
  ).toEqual({ anulado: 0 });

  const preWindowImpacted = await f.request(
    "/api/movimientos",
    "POST",
    movementBody({
      fecha: "2025-12-20",
      origen: "S003",
      destino: "S001",
      concepto: "Hecho anterior con efectivo capturado",
    }),
    { "idempotency-key": randomUUID() },
  );
  expect(preWindowImpacted.status).toBe(409);
  expect(preWindowImpacted.data.code).toBe("HISTORY_LOCKED");

  const preWindowFree = await createMovement(
    f,
    movementBody({
      fecha: "2025-12-20",
      importe: "3.33",
      concepto: "Hecho anterior sin efecto capturado",
    }),
  );
  expect(preWindowFree.created.status).toBe(201);
  expect(preWindowFree.created.data.movimiento.fecha).toBe("2025-12-20");
});

test("E4.9 T1: un impacto no verificable bloquea un hecho anterior a la ventana", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);
  // Simula una foto cuyo bloque de inversión no permite acreditar el impacto.
  f.db.run("DROP TRIGGER foto_cierre_no_update");
  f.db.run(
    "UPDATE fotos_cierre SET inversion=? WHERE ciclo='1' AND version=1",
    ['{"cuentas":null,"posiciones":null}'],
  );
  const before = rowCount(f.db, "movimientos");
  const rejected = await f.request(
    "/api/movimientos",
    "POST",
    movementBody({
      fecha: "2025-12-20",
      importe: "3.33",
      concepto: "Hecho anterior no verificable",
    }),
    { "idempotency-key": randomUUID() },
  );
  expect(rejected.status).toBe(409);
  expect(rejected.data.code).toBe("HISTORY_LOCKED");
  expect(rowCount(f.db, "movimientos")).toBe(before);
});

test("E4.9 T1 Compras: 409 por fecha en ventana cerrada y por impacto de una operación anterior", async () => {
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

  const informative = {
    concepto: "Compra enero con concepto corregido",
    nota: "Nota informativa",
  };
  const noteOnly = await f.request(
    "/api/compras/7001/rectificar",
    "POST",
    purchaseRectification(informative),
  );
  expect(noteOnly.status).toBe(409);
  expect(noteOnly.data.code).toBe("HISTORY_LOCKED");

  const amountChange = await f.request(
    "/api/compras/7001/rectificar",
    "POST",
    purchaseRectification({ importeEur: "1001.00" }),
  );
  expect(amountChange.status).toBe(409);
  expect(amountChange.data.code).toBe("HISTORY_LOCKED");

  const moveOut = await f.request(
    "/api/compras/7001/rectificar",
    "POST",
    purchaseRectification({ fecha: "2026-02-10" }),
  );
  expect(moveOut.status).toBe(409);
  expect(moveOut.data.code).toBe("HISTORY_LOCKED");

  const annul = await f.request("/api/compras/7001/anular", "POST", {
    revision: 1,
    motivo: "Anulación ficticia",
  });
  expect(annul.status).toBe(409);
  expect(annul.data.code).toBe("HISTORY_LOCKED");

  const preWindow = await f.request(
    "/api/compras",
    "POST",
    purchaseBody(f.instrumento, {
      fecha: "2025-12-20",
      concepto: "Compra anterior con efectivo y posición capturados",
    }),
    { "idempotency-key": randomUUID() },
  );
  expect(preWindow.status).toBe(409);
  expect(preWindow.data.code).toBe("HISTORY_LOCKED");

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
  ).toEqual({ revision: 1 });
  expect(rowCount(f.db, "operaciones_inversion")).toBe(before + 1);
});

test("E4.9 T1 Ventas: 409 por fecha en ventana cerrada y por impacto de una operación anterior", async () => {
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

  const informative = {
    concepto: "Venta enero con concepto corregido",
    nota: "Nota informativa",
  };
  const noteOnly = await f.request(
    "/api/ventas/7002/rectificar",
    "POST",
    saleRectification(informative),
  );
  expect(noteOnly.status).toBe(409);
  expect(noteOnly.data.code).toBe("HISTORY_LOCKED");

  const amountChange = await f.request(
    "/api/ventas/7002/rectificar",
    "POST",
    saleRectification({ importeEur: "501.00" }),
  );
  expect(amountChange.status).toBe(409);
  expect(amountChange.data.code).toBe("HISTORY_LOCKED");

  const moveOut = await f.request(
    "/api/ventas/7002/rectificar",
    "POST",
    saleRectification({ fecha: "2026-02-15" }),
  );
  expect(moveOut.status).toBe(409);
  expect(moveOut.data.code).toBe("HISTORY_LOCKED");

  const annul = await f.request("/api/ventas/7002/anular", "POST", {
    revision: 1,
    motivo: "Anulación ficticia",
  });
  expect(annul.status).toBe(409);
  expect(annul.data.code).toBe("HISTORY_LOCKED");

  const preWindow = await f.request(
    "/api/ventas",
    "POST",
    saleBody(f.instrumento, {
      fecha: "2025-12-20",
      concepto: "Venta anterior con efectivo y posición capturados",
    }),
    { "idempotency-key": randomUUID() },
  );
  expect(preWindow.status).toBe(409);
  expect(preWindow.data.code).toBe("HISTORY_LOCKED");

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

  expect(
    f.db
      .query("SELECT revision FROM operaciones_inversion WHERE id='7002'")
      .get(),
  ).toEqual({ revision: 1 });
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

  const referenceNoImpact = await f.request(
    `/api/referencias/${referenceId}/desactivar`,
    "POST",
    { revision: 2, motivo: "Baja sin huella de impacto" },
  );
  expect(referenceNoImpact.status).toBe(409);
  expect(referenceNoImpact.data.code).toBe("IMPACTO_NO_VERIFICABLE");

  const referenceReviewedImpact = await f.request(
    `/api/referencias/${referenceId}/impacto`,
    "POST",
    { revision: 2, estado: "Inactiva" },
  );
  expect(referenceReviewedImpact.status).toBe(200);
  expect(referenceReviewedImpact.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);

  const referenceReviewed = await f.request(
    `/api/referencias/${referenceId}/desactivar`,
    "POST",
    {
      revision: 2,
      motivo: "Baja revisada de catálogo tras el cierre",
      fingerprint: referenceReviewedImpact.data.fingerprint,
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

  const debtNoImpact = await f.request(`/api/deudas/${debtId}`, "PATCH", {
    revision: 2,
    estado: "Inactiva",
    motivo: "Baja sin huella de impacto",
  });
  expect(debtNoImpact.status).toBe(409);
  expect(debtNoImpact.data.code).toBe("IMPACTO_NO_VERIFICABLE");

  const debtReviewedImpact = await f.request(
    `/api/deudas/${debtId}/impacto`,
    "POST",
    { revision: 2, estado: "Inactiva" },
  );
  expect(debtReviewedImpact.status).toBe(200);
  expect(debtReviewedImpact.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);

  const debtReviewed = await f.request(`/api/deudas/${debtId}`, "PATCH", {
    revision: 2,
    estado: "Inactiva",
    motivo: "Baja revisada de Deuda tras el cierre",
    fingerprint: debtReviewedImpact.data.fingerprint,
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

test("E4.9 DEV-06 AC-20: los totales de hechos capturados se comparan al cierre posterior", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  // Hecho anterior a la ventana de la foto posterior y hecho dentro de ella.
  seedMovement(f.db, {
    id: "8201",
    fecha: "2026-01-10",
    importe: 1000,
    tipo: "Ingreso",
    subtipo: "Nómina",
    origen: "S000",
    destino: "S001",
  });
  seedMovement(f.db, {
    id: "8202",
    fecha: "2026-02-10",
    importe: 500,
    tipo: "Ingreso",
    subtipo: "Nómina",
    origen: "S000",
    destino: "S001",
  });
  expect((await f.close("2")).result.status).toBe(201);

  // Cuenta creada después de la foto: no aparece en el desglose capturado y no
  // debe producir una falsa contradicción.
  const account = await f.request(
    "/api/saldos",
    "POST",
    {
      nombre: "Cuenta posterior no capturada",
      tipo: "Efectivo",
      control: "Terminal",
      estado: "Activa",
      finalidad: null,
      fechaApertura: null,
      saldoApertura: "0.00",
      objetivo: null,
      liquidez: false,
      mostrarComoBolsa: false,
      permiteSalidaExterior: false,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(account.status).toBe(201);

  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(pre.data.coherencia.requerida).toBe(true);
  expect(pre.data.coherencia.contradicciones).toEqual([]);
  const closed = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    {
      fingerprint: pre.data.fingerprint,
      motivo: "Cierre tardío coherente con totales de hechos",
    },
    { "idempotency-key": randomUUID() },
  );
  expect(closed.status).toBe(201);

  const posteriorRow = f.db
    .query(
      "SELECT posterior FROM cierre_audit WHERE ciclo='1' ORDER BY id DESC LIMIT 1",
    )
    .get() as { posterior: string };
  const posterior = JSON.parse(posteriorRow.posterior) as {
    coherence: {
      ciclo: string;
      comparado: {
        hechos: {
          estado: string;
          ingresos: { almacenado: string | null; vivo: string | null };
          gastos: { almacenado: string | null; vivo: string | null };
          neto: { almacenado: string | null; vivo: string | null };
        };
      };
    }[];
  };
  expect(posterior.coherence[0]).toMatchObject({
    ciclo: "2",
    comparado: {
      hechos: {
        estado: "Comparado",
        ingresos: { almacenado: "5.00", vivo: "5.00" },
        gastos: { almacenado: "0.00", vivo: "0.00" },
        neto: { almacenado: "5.00", vivo: "5.00" },
      },
    },
  });
});

test("E4.9 DEV-06 AC-20: una foto sin totales de hechos o con totales divergentes bloquea", async () => {
  const missing = fixture({ facts: false });
  await missing.enroll();
  expect((await missing.close("2")).result.status).toBe(201);
  missing.db.run("DROP TRIGGER foto_cierre_no_update");
  missing.db.run(
    `UPDATE fotos_cierre SET hechos='{"estado":"Con hechos","movimientos":[]}' WHERE ciclo='2' AND version=1`,
  );
  const missingPre = await missing.request("/api/cierres/1/preflight");
  expect(missingPre.status).toBe(200);
  expect(missingPre.data.coherencia.contradicciones.length).toBeGreaterThan(0);
  expect(
    missingPre.data.coherencia.contradicciones.join(" "),
  ).toContain("totales de hechos");
  const missingClose = await missing.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: missingPre.data.fingerprint, motivo: "Intento con foto incompleta" },
    { "idempotency-key": randomUUID() },
  );
  expect(missingClose.status).toBe(409);
  expect(missingClose.data.code).toBe("INCOHERENCIA_CON_CIERRE_POSTERIOR");

  missing.db.run(
    "UPDATE fotos_cierre SET hechos='null' WHERE ciclo='2' AND version=1",
  );
  const unreadablePre = await missing.request("/api/cierres/1/preflight");
  expect(unreadablePre.status).toBe(200);
  expect(
    unreadablePre.data.coherencia.contradicciones.join(" "),
  ).toContain("no captura los totales de hechos");

  const divergent = fixture({ facts: false });
  await divergent.enroll();
  expect((await divergent.close("2")).result.status).toBe(201);
  divergent.db.run("DROP TRIGGER foto_cierre_no_update");
  divergent.db.run(
    `UPDATE fotos_cierre SET hechos=json_set(hechos,'$.totales.ingresos','999.00') WHERE ciclo='2' AND version=1`,
  );
  const divergentPre = await divergent.request("/api/cierres/1/preflight");
  expect(divergentPre.status).toBe(200);
  expect(divergentPre.data.coherencia.contradicciones.length).toBeGreaterThan(0);
  expect(
    divergentPre.data.coherencia.contradicciones.join(" "),
  ).toContain("Total de ingresos");
  const divergentClose = await divergent.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: divergentPre.data.fingerprint, motivo: "Intento con total divergente" },
    { "idempotency-key": randomUUID() },
  );
  expect(divergentClose.status).toBe(409);
  expect(divergentClose.data.code).toBe("INCOHERENCIA_CON_CIERRE_POSTERIOR");
});

test("E4.9 DEV-06 AC-20: un hecho posterior en la ventana de la foto también se detecta", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  expect((await f.close("2")).result.status).toBe(201);
  // Inserción directa para simular una operación legítima no capturada; la API
  // T1 la bloquearía por fecha en ventana cerrada.
  seedMovement(f.db, {
    id: "8203",
    fecha: "2026-02-12",
    importe: 250,
    tipo: "Ingreso",
    subtipo: "Nómina",
    origen: "S000",
    destino: "S001",
  });
  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(pre.data.coherencia.contradicciones.length).toBeGreaterThan(0);
  expect(
    pre.data.coherencia.contradicciones.join(" "),
  ).toContain("Total de ingresos");
});

test("E4.9 DEV-06 T2: Referencias y Deudas exigen impacto, huella, motivo y auditoría", async () => {
  const f = fixture({ facts: true });
  await f.enroll();
  const reference = await f.request(
    "/api/referencias",
    "POST",
    { nombre: "Referencia impacto", tipo: "Viaje" },
    { "idempotency-key": randomUUID() },
  );
  const referenceId = reference.data.item.id as string;
  const debt = await f.request(
    "/api/deudas",
    "POST",
    {
      nombre: "Deuda impacto",
      inicioControl: "2026-01-01",
      capitalApertura: "100.00",
    },
    { "idempotency-key": randomUUID() },
  );
  const debtId = debt.data.item.id as string;
  expect((await f.close("1")).result.status).toBe(201);
  const photo = await f.request("/api/cierres/1/foto");

  const referenceImpact = await f.request(
    `/api/referencias/${referenceId}/impacto`,
    "POST",
    { revision: 1, estado: "Inactiva" },
  );
  expect(referenceImpact.status).toBe(200);
  expect(referenceImpact.data.economico).toEqual(["estado"]);
  expect(referenceImpact.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);

  const referenceWrong = await f.request(
    `/api/referencias/${referenceId}/desactivar`,
    "POST",
    {
      revision: 1,
      motivo: "Baja revisada",
      fingerprint: "b".repeat(64),
    },
  );
  expect(referenceWrong.status).toBe(409);
  expect(referenceWrong.data.code).toBe("IMPACT_CHANGED");

  const referenceReviewed = await f.request(
    `/api/referencias/${referenceId}/desactivar`,
    "POST",
    {
      revision: 1,
      motivo: "Baja revisada con impacto acreditado",
      fingerprint: referenceImpact.data.fingerprint,
    },
  );
  expect(referenceReviewed.status).toBe(200);
  expect(
    f.db
      .query("SELECT motivo FROM audit WHERE entidad=? ORDER BY id DESC LIMIT 1")
      .get(referenceId),
  ).toMatchObject({ motivo: "Baja revisada con impacto acreditado" });
  const referenceAudit = f.db
    .query("SELECT campos FROM audit WHERE entidad=? ORDER BY id DESC LIMIT 1")
    .get(referenceId) as { campos: string };
  expect(JSON.parse(referenceAudit.campos).impacto).toMatchObject({
    fingerprint: referenceImpact.data.fingerprint,
    cierres: [{ ciclo: "1", version: 1 }],
  });

  const debtImpact = await f.request(
    `/api/deudas/${debtId}/impacto`,
    "POST",
    { revision: 1, estado: "Inactiva" },
  );
  expect(debtImpact.status).toBe(200);
  expect(debtImpact.data.economico).toEqual(["estado"]);
  const debtReviewed = await f.request(`/api/deudas/${debtId}`, "PATCH", {
    revision: 1,
    estado: "Inactiva",
    motivo: "Baja de Deuda con impacto acreditado",
    fingerprint: debtImpact.data.fingerprint,
  });
  expect(debtReviewed.status).toBe(200);
  expect(
    f.db
      .query("SELECT motivo FROM audit WHERE entidad=? ORDER BY id DESC LIMIT 1")
      .get(debtId),
  ).toMatchObject({ motivo: "Baja de Deuda con impacto acreditado" });
  const debtAudit = f.db
    .query("SELECT campos FROM audit WHERE entidad=? ORDER BY id DESC LIMIT 1")
    .get(debtId) as { campos: string };
  expect(JSON.parse(debtAudit.campos).impacto).toMatchObject({
    fingerprint: debtImpact.data.fingerprint,
    cierres: [{ ciclo: "1", version: 1 }],
  });

  const after = await f.request("/api/cierres/1/foto");
  expect(after.data).toEqual(photo.data);
});

test("E4.9 DEV-06 T2/T3: Presupuestos exige revisión de impacto tras cierre y permite el nombre", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  const budget = await f.request(
    "/api/presupuestos",
    "POST",
    { nombre: "Presupuesto guards", fuente: "No aplica", destino: null },
    { "idempotency-key": randomUUID() },
  );
  expect(budget.status).toBe(201);
  const budgetId = budget.data.item.id as string;
  expect((await f.close("1")).result.status).toBe(201);
  const photo = await f.request("/api/cierres/1/foto");

  const rename = await f.request(`/api/presupuestos/${budgetId}`, "PATCH", {
    revision: 1,
    nombre: "Presupuesto renombrado",
  });
  expect(rename.status).toBe(200);
  expect(rename.data.item.revision).toBe(2);

  const changes = {
    revision: 2,
    nombre: "Presupuesto renombrado",
    fuente: "Gasto real",
    destino: "S001",
  };
  const unconfirmed = await f.request(
    `/api/presupuestos/${budgetId}`,
    "PATCH",
    changes,
  );
  expect(unconfirmed.status).toBe(409);
  expect(unconfirmed.data.code).toBe("RECTIFICATION_REQUIRED");

  const impact = await f.request(
    `/api/presupuestos/${budgetId}/impacto`,
    "POST",
    changes,
  );
  expect(impact.status).toBe(200);
  expect(impact.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);

  const wrong = await f.request(
    `/api/presupuestos/${budgetId}/rectificar`,
    "POST",
    { cambios: changes, fingerprint: "c".repeat(64), motivo: "Revisión T2" },
  );
  expect(wrong.status).toBe(409);
  expect(wrong.data.code).toBe("IMPACT_CHANGED");

  const reviewed = await f.request(
    `/api/presupuestos/${budgetId}/rectificar`,
    "POST",
    {
      cambios: changes,
      fingerprint: impact.data.fingerprint,
      motivo: "Cambio de fuente revisado",
    },
  );
  expect(reviewed.status).toBe(200);
  expect(
    f.db
      .query("SELECT motivo FROM audit WHERE entidad=? ORDER BY id DESC LIMIT 1")
      .get(budgetId),
  ).toMatchObject({ motivo: "Cambio de fuente revisado" });
  const budgetAudit = f.db
    .query("SELECT campos FROM audit WHERE entidad=? ORDER BY id DESC LIMIT 1")
    .get(budgetId) as { campos: string };
  expect(JSON.parse(budgetAudit.campos).impacto).toMatchObject({
    fingerprint: impact.data.fingerprint,
    cierres: [{ ciclo: "1", version: 1 }],
  });

  const after = await f.request("/api/cierres/1/foto");
  expect(after.data).toEqual(photo.data);
});

test("E4.9 DEV-06 T2: el plan vivo de un ciclo cerrado bloquea si la foto no acredita el impacto", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  const budget = await f.request(
    "/api/presupuestos",
    "POST",
    { nombre: "Presupuesto plan guards", fuente: "No aplica", destino: null },
    { "idempotency-key": randomUUID() },
  );
  const budgetId = budget.data.item.id as string;
  expect((await f.close("1")).result.status).toBe(201);
  const plan = await f.request("/api/planes-ciclo/1");
  expect(plan.status).toBe(200);
  const body = {
    revision: plan.data.revision as number,
    contextRevision: plan.data.contextRevision as string,
    cambios: [
      {
        presupuesto: budgetId,
        base: "10.00",
        esencial: "5.00",
        delMes: "2.00",
      },
    ],
  };
  const impact = await f.request("/api/planes-ciclo/1/impacto", "POST", body);
  expect(impact.status).toBe(200);
  expect(impact.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);

  f.db.run("DROP TRIGGER foto_cierre_no_update");
  const originalPlan = (
    f.db
      .query("SELECT plan FROM fotos_cierre WHERE ciclo='1' AND version=1")
      .get() as { plan: string }
  ).plan;
  f.db.run(
    "UPDATE fotos_cierre SET plan='null' WHERE ciclo='1' AND version=1",
  );
  const blocked = await f.request("/api/planes-ciclo/1/confirmar", "POST", {
    propuesta: body,
    fingerprint: impact.data.fingerprint,
    motivo: "Plan revisado tras cierre",
  }, { "idempotency-key": randomUUID() });
  expect(blocked.status).toBe(409);
  expect(blocked.data.code).toBe("HISTORY_LOCKED");

  f.db.run(
    "UPDATE fotos_cierre SET plan=? WHERE ciclo='1' AND version=1",
    [originalPlan],
  );
  const reviewed = await f.request("/api/planes-ciclo/1/confirmar", "POST", {
    propuesta: body,
    fingerprint: impact.data.fingerprint,
    motivo: "Plan revisado tras cierre",
  }, { "idempotency-key": randomUUID() });
  expect(reviewed.status).toBe(200);
  expect(
    f.db
      .query("SELECT motivo FROM cycle_plan_audit WHERE ciclo='1' ORDER BY id DESC LIMIT 1")
      .get(),
  ).toMatchObject({ motivo: "Plan revisado tras cierre" });
});

test("E4.9 DEV-06 T2/T3: Revisión Comida permite concepto y exige impacto en cambios económicos", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  const created = await f.request(
    "/api/revision-comida",
    "POST",
    {
      fecha: "2026-01-10",
      concepto: "Comida ficticia",
      importe: "10.00",
      direccion: "Salida",
      esDevolucion: false,
      clasificacion: "Comida",
      evidenciaBancaria: null,
      cuentaOrigen: null,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(created.status).toBe(201);
  const id = created.data.operacion.id as string;
  expect((await f.close("1")).result.status).toBe(201);
  const photo = await f.request("/api/cierres/1/foto");

  const informative = await f.request(
    `/api/revision-comida/${id}/rectificar`,
    "POST",
    { revision: 1, motivo: "Concepto corregido", concepto: "Comida corregida" },
    { "idempotency-key": randomUUID() },
  );
  expect(informative.status).toBe(200);
  expect(informative.data.operacion.concepto).toBe("Comida corregida");
  expect(
    f.db
      .query(
        "SELECT motivo FROM revision_comida_audit WHERE operacion=? ORDER BY id DESC LIMIT 1",
      )
      .get(id),
  ).toMatchObject({ motivo: "Concepto corregido" });

  const impact = await f.request(
    `/api/revision-comida/${id}/impacto`,
    "POST",
    { revision: 2, importe: "12.00" },
  );
  expect(impact.status).toBe(200);
  expect(impact.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);

  const withoutImpact = await f.request(
    `/api/revision-comida/${id}/rectificar`,
    "POST",
    { revision: 2, motivo: "Cambio económico", importe: "12.00" },
    { "idempotency-key": randomUUID() },
  );
  expect(withoutImpact.status).toBe(409);
  expect(withoutImpact.data.code).toBe("IMPACTO_NO_VERIFICABLE");

  f.db.run("DROP TRIGGER foto_cierre_no_update");
  const originalAux = (
    f.db
      .query("SELECT auxiliares FROM fotos_cierre WHERE ciclo='1' AND version=1")
      .get() as { auxiliares: string }
  ).auxiliares;
  f.db.run(
    "UPDATE fotos_cierre SET auxiliares='null' WHERE ciclo='1' AND version=1",
  );
  const blocked = await f.request(
    `/api/revision-comida/${id}/rectificar`,
    "POST",
    {
      revision: 2,
      motivo: "Cambio económico",
      importe: "12.00",
      fingerprint: impact.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(blocked.status).toBe(409);
  expect(blocked.data.code).toBe("HISTORY_LOCKED");

  // Restaura el bloque auxiliar original de la foto y confirma el cambio.
  f.db.run(
    "UPDATE fotos_cierre SET auxiliares=? WHERE ciclo='1' AND version=1",
    [originalAux],
  );
  const reviewed = await f.request(
    `/api/revision-comida/${id}/rectificar`,
    "POST",
    {
      revision: 2,
      motivo: "Cambio económico revisado",
      importe: "12.00",
      fingerprint: impact.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(reviewed.status).toBe(200);
  expect(reviewed.data.operacion.importe).toBe("12.00");
  expect(
    f.db
      .query(
        "SELECT motivo FROM revision_comida_audit WHERE operacion=? ORDER BY id DESC LIMIT 1",
      )
      .get(id),
  ).toMatchObject({ motivo: "Cambio económico revisado" });

  const after = await f.request("/api/cierres/1/foto");
  expect(after.data).toEqual(photo.data);
});

test("E4.9 DEV-06 T3: el conflicto T1 estricto se mantiene y las listas blancas son por campo", async () => {
  const f = fixture({ facts: true });
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);

  const movement = closedFieldDecision(f.db, "movimiento", ["concepto", "nota"]);
  expect(movement.economic).toEqual([]);
  expect(movement.informative).toEqual(["concepto", "nota"]);
  const movementAmount = closedFieldDecision(f.db, "movimiento", [
    "importe",
    "fecha",
    "origen",
  ]);
  expect(movementAmount.economic).toEqual(["importe", "fecha", "origen"]);

  for (const entity of [
    "saldo",
    "referencia",
    "instrumento",
    "deuda",
    "presupuesto",
    "partida",
    "categoria",
    "subcategoria",
  ]) {
    const decision = closedFieldDecision(f.db, entity, ["nombre"]);
    expect(decision.informative).toEqual(["nombre"]);
    expect(decision.economic).toEqual([]);
  }

  const blockedByField: [string, string][] = [
    ["compra", "importeEur"],
    ["venta", "fecha"],
    ["saldo", "saldoApertura"],
    ["referencia", "tipo"],
    ["instrumento", "isin"],
    ["deuda", "estado"],
    ["presupuesto", "fuente"],
    ["partida", "padre"],
  ];
  for (const [entity, field] of blockedByField) {
    const decision = closedFieldDecision(f.db, entity, [field]);
    expect(decision.economic).toEqual([field]);
    expect(decision.informative).toEqual([]);
  }

  // T1 estricto: aunque `nota` sea informativa por campo, la fecha en ventana
  // cerrada manda y el hecho completo sigue bloqueado (AC-03/AC-04).
  const noteOnly = await f.request(
    "/api/movimientos/8001/rectificar",
    "POST",
    movementRectification({
      fecha: "2026-01-15",
      concepto: "Cambio solo de nota",
      nota: "Nota permitida por T3 pero bloqueada por T1",
    }),
    { "idempotency-key": randomUUID() },
  );
  expect(noteOnly.status).toBe(409);
  expect(noteOnly.data.code).toBe("HISTORY_LOCKED");
});

test("E4.9 QA M1: el fingerprint de /impacto de Revisión Comida coincide con la escritura", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  const created = await f.request(
    "/api/revision-comida",
    "POST",
    {
      fecha: "2026-01-10",
      concepto: "Comida original",
      importe: "10.00",
      direccion: "Salida",
      esDevolucion: false,
      clasificacion: "Comida",
      evidenciaBancaria: null,
      cuentaOrigen: null,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(created.status).toBe(201);
  const id = created.data.operacion.id as string;
  expect((await f.close("1")).result.status).toBe(201);

  const body = {
    revision: 1,
    concepto: "Comida corregida",
    importe: "12.00",
  };
  const preview = await f.request(
    `/api/revision-comida/${id}/impacto`,
    "POST",
    body,
  );
  expect(preview.status).toBe(200);
  expect(preview.data.cambiosEconomicos).toEqual(["importe"]);

  const written = await f.request(
    `/api/revision-comida/${id}/rectificar`,
    "POST",
    { ...body, motivo: "Cambio completo revisado", fingerprint: preview.data.fingerprint },
    { "idempotency-key": randomUUID() },
  );
  expect(written.status).toBe(200);
  expect(written.data.operacion.concepto).toBe("Comida corregida");
  expect(written.data.operacion.importe).toBe("12.00");
});

test("E4.9 QA M2: un cierre posterior sin foto bloquea AC-20", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  expect((await f.close("2")).result.status).toBe(201);
  f.db.run("DROP TRIGGER foto_cierre_no_delete");
  f.db.run("PRAGMA foreign_keys=OFF");
  f.db.run("DELETE FROM fotos_cierre WHERE ciclo='2' AND version=1");
  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(
    pre.data.coherencia.contradicciones.join(" "),
  ).toContain("no tiene foto");
  const closed = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: pre.data.fingerprint, motivo: "Intento con cierre huérfano" },
    { "idempotency-key": randomUUID() },
  );
  expect(closed.status).toBe(409);
  expect(closed.data.code).toBe("INCOHERENCIA_CON_CIERRE_POSTERIOR");
});

test("E4.9 QA M4: el alta de Revisión Comida en ventana cerrada exige huella de impacto", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);
  const body = {
    fecha: "2026-01-11",
    concepto: "Comida nueva",
    importe: "8.00",
    direccion: "Salida",
    esDevolucion: false,
    clasificacion: "Comida",
    evidenciaBancaria: null,
    cuentaOrigen: null,
  };
  const without = await f.request(
    "/api/revision-comida",
    "POST",
    { ...body, motivo: "Alta sin huella" },
    {
      "idempotency-key": randomUUID(),
    },
  );
  expect(without.status).toBe(409);
  expect(without.data.code).toBe("IMPACTO_NO_VERIFICABLE");

  const preview = await f.request("/api/revision-comida/impacto", "POST", body);
  expect(preview.status).toBe(200);
  expect(preview.data.requiereMotivo).toBe(true);
  const created = await f.request(
    "/api/revision-comida",
    "POST",
    {
      ...body,
      motivo: "Alta revisada tras cierre",
      fingerprint: preview.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(created.status).toBe(201);
  expect(
    f.db
      .query(
        "SELECT motivo FROM revision_comida_audit WHERE operacion=? ORDER BY id DESC LIMIT 1",
      )
      .get(created.data.operacion.id),
  ).toMatchObject({ motivo: "Alta revisada tras cierre" });
});

test("E4.9 QA M5: AC-20 compara también transferencias, amortizaciones y devoluciones", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  expect((await f.close("2")).result.status).toBe(201);
  f.db.run("DROP TRIGGER foto_cierre_no_update");
  f.db.run(
    `UPDATE fotos_cierre
        SET hechos=json_set(hechos,
          '$.totales.transferencias','9.99',
          '$.totales.amortizaciones','8.88',
          '$.totales.devoluciones','7.77')
      WHERE ciclo='2' AND version=1`,
  );
  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  const text = pre.data.coherencia.contradicciones.join(" ");
  expect(text).toContain("Total de transferencias");
  expect(text).toContain("Total de amortizaciones");
  expect(text).toContain("Total de devoluciones");
});

test("E4.9 QA M3: Clasificación usa la lista blanca por campo y conserva T2", async () => {
  const f = fixture({ facts: true, classification: true });
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);
  const photo = await f.request("/api/cierres/1/foto");

  const informative = await f.request(
    "/api/clasificacion/categorias/CAT900",
    "PATCH",
    { revision: 1, grupo: "Grupo informativo revisado" },
  );
  expect(informative.status).toBe(200);
  expect(informative.data.item.grupo).toBe("Grupo informativo revisado");

  const block = await f.request(
    "/api/clasificacion/categorias/CAT900",
    "PATCH",
    { revision: 2, anual: "Ingreso" },
  );
  expect(block.status).toBe(409);
  expect(block.data.code).toBe("RECTIFICATION_REQUIRED");

  const after = await f.request("/api/cierres/1/foto");
  expect(after.data).toEqual(photo.data);
});
