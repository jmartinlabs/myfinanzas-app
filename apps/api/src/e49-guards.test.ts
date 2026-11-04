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
  },
) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
       partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
       capital,intereses)
     VALUES(?,?,?,?,?,?,?,?,NULL,?, '',0,1,?,?,NULL,NULL)`,
    [
      input.id,
      input.fecha,
      input.tipo ?? "Transferencia",
      input.importe,
      input.origen ?? "S001",
      input.destino ?? "S002",
      input.subtipo ?? null,
      input.partida ?? null,
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
  options: { facts?: boolean; classification?: boolean } = {},
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

function rowCount(db: Database, table: string) {
  return (db.query(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n;
}

test("E4.9 T1 guards: Movimientos bloquean alta, cambio de fecha y anulación en ventana cerrada", async () => {
  const f = fixture();
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);
  const before = rowCount(f.db, "movimientos");

  const createClosed = await f.request(
    "/api/movimientos",
    "POST",
    movementBody(),
    { "idempotency-key": randomUUID() },
  );
  expect(createClosed.status).toBe(409);
  expect(createClosed.data.code).toBe("HISTORY_LOCKED");
  expect(createClosed.data.cierres?.[0]).toMatchObject({
    ciclo: "1",
    version: 1,
  });
  expect(rowCount(f.db, "movimientos")).toBe(before);

  const open = movementBody({
    fecha: "2026-02-20",
    concepto: "Movimiento abierto real",
  });
  const impact = await f.request("/api/movimientos/impacto", "POST", open);
  expect(impact.status).toBe(200);
  const created = await f.request(
    "/api/movimientos",
    "POST",
    {
      ...open,
      contextRevision: impact.data.contextRevision,
      fingerprint: impact.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(created.status).toBe(201);
  const openId = created.data.movimiento.id as string;

  const moveOut = await f.request(
    "/api/movimientos/8001/rectificar",
    "POST",
    movementRectification({ fecha: "2026-02-10" }),
    { "idempotency-key": randomUUID() },
  );
  expect(moveOut.status).toBe(409);
  expect(moveOut.data.code).toBe("HISTORY_LOCKED");

  const moveIn = await f.request(
    `/api/movimientos/${openId}/rectificar`,
    "POST",
    movementRectification({ revision: 1, fecha: "2026-01-20" }),
    { "idempotency-key": randomUUID() },
  );
  expect(moveIn.status).toBe(409);
  expect(moveIn.data.code).toBe("HISTORY_LOCKED");
  expect(
    f.db.query("SELECT revision FROM movimientos WHERE id=?").get(openId),
  ).toEqual({ revision: 1 });
  expect(
    f.db.query("SELECT revision FROM movimientos WHERE id='8001'").get(),
  ).toEqual({ revision: 1 });

  const annul = await f.request(
    "/api/movimientos/8001/anular",
    "POST",
    {
      revision: 1,
      motivo: "Anulación ficticia",
    },
    { "idempotency-key": randomUUID() },
  );
  expect(annul.status).toBe(409);
  expect(annul.data.code).toBe("HISTORY_LOCKED");
  expect(
    f.db.query("SELECT anulado,revision FROM movimientos WHERE id='8001'").get(),
  ).toEqual({ anulado: 0, revision: 1 });
  expect(rowCount(f.db, "movimientos")).toBe(before + 1);
});

test("E4.9 T1 guards: Compras bloquean alta, fechas y anulación en ventana cerrada", async () => {
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

  const created = await f.request(
    "/api/compras",
    "POST",
    purchaseBody(f.instrumento, { concepto: "Compra abierta real" }),
    { "idempotency-key": randomUUID() },
  );
  expect(created.status).toBe(201);
  const openId = created.data.compra.id as string;

  const moveOut = await f.request("/api/compras/7001/rectificar", "POST", {
    ...purchaseRectification({ fecha: "2026-02-10" }),
  });
  expect(moveOut.status).toBe(409);
  expect(moveOut.data.code).toBe("HISTORY_LOCKED");

  const moveIn = await f.request(
    `/api/compras/${openId}/rectificar`,
    "POST",
    purchaseRectification({ revision: 1, fecha: "2026-01-12" }),
  );
  expect(moveIn.status).toBe(409);
  expect(moveIn.data.code).toBe("HISTORY_LOCKED");
  expect(
    f.db
      .query("SELECT revision FROM operaciones_inversion WHERE id=?")
      .get(openId),
  ).toEqual({ revision: 1 });
  expect(
    f.db
      .query("SELECT revision FROM operaciones_inversion WHERE id='7001'")
      .get(),
  ).toEqual({ revision: 1 });

  const annul = await f.request("/api/compras/7001/anular", "POST", {
    revision: 1,
    motivo: "Anulación ficticia",
  });
  expect(annul.status).toBe(409);
  expect(annul.data.code).toBe("HISTORY_LOCKED");
  expect(
    f.db
      .query("SELECT estado,revision FROM operaciones_inversion WHERE id='7001'")
      .get(),
  ).toEqual({ estado: "Vigente", revision: 1 });
  expect(rowCount(f.db, "operaciones_inversion")).toBe(before + 1);
});

test("E4.9 T1 guards: Ventas bloquean alta, fechas y anulación en ventana cerrada", async () => {
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

  const created = await f.request(
    "/api/ventas",
    "POST",
    saleBody(f.instrumento, { concepto: "Venta abierta real" }),
    { "idempotency-key": randomUUID() },
  );
  expect(created.status).toBe(201);
  const openId = created.data.venta.id as string;

  const moveOut = await f.request("/api/ventas/7002/rectificar", "POST", {
    ...saleRectification({ fecha: "2026-02-15" }),
  });
  expect(moveOut.status).toBe(409);
  expect(moveOut.data.code).toBe("HISTORY_LOCKED");

  const moveIn = await f.request(
    `/api/ventas/${openId}/rectificar`,
    "POST",
    saleRectification({ revision: 1, fecha: "2026-01-21" }),
  );
  expect(moveIn.status).toBe(409);
  expect(moveIn.data.code).toBe("HISTORY_LOCKED");
  expect(
    f.db
      .query("SELECT revision FROM operaciones_inversion WHERE id=?")
      .get(openId),
  ).toEqual({ revision: 1 });
  expect(
    f.db
      .query("SELECT revision FROM operaciones_inversion WHERE id='7002'")
      .get(),
  ).toEqual({ revision: 1 });

  const annul = await f.request("/api/ventas/7002/anular", "POST", {
    revision: 1,
    motivo: "Anulación ficticia",
  });
  expect(annul.status).toBe(409);
  expect(annul.data.code).toBe("HISTORY_LOCKED");
  expect(
    f.db
      .query("SELECT estado,revision FROM operaciones_inversion WHERE id='7002'")
      .get(),
  ).toEqual({ estado: "Vigente", revision: 1 });
  expect(rowCount(f.db, "operaciones_inversion")).toBe(before + 1);
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

test("E4.9 T2 guards: Saldo bloquea apertura/tipo/control capturados y permite nombres y campos no económicos", async () => {
  const f = fixture({ facts: false });
  await f.enroll();
  expect((await f.close("1")).result.status).toBe(201);
  const saldo = getSaldo(f.db, "S003");
  const before = f.db.query("SELECT * FROM saldos WHERE id='S003'").get();
  const saldosBefore = rowCount(f.db, "saldos");

  const aperture = await f.request("/api/saldos/S003", "PATCH", {
    revision: saldo.revision,
    saldoApertura: "10.00",
  });
  expect(aperture.status).toBe(409);
  expect(aperture.data.code).toBe("HISTORY_LOCKED");
  expect(aperture.data.cierres?.[0]).toMatchObject({ ciclo: "1", version: 1 });

  const type = await f.request("/api/saldos/S003", "PATCH", {
    revision: saldo.revision,
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
  expect(creation.data.cierres?.[0]).toMatchObject({ ciclo: "1", version: 1 });

  expect(f.db.query("SELECT * FROM saldos WHERE id='S003'").get()).toEqual(
    before,
  );
  expect(rowCount(f.db, "saldos")).toBe(saldosBefore);

  const rename = await f.request("/api/saldos/S003", "PATCH", {
    revision: saldo.revision,
    nombre: "Efectivo de inversión renombrado",
  });
  expect(rename.status).toBe(200);
  expect(rename.data.saldo.nombre).toBe("Efectivo de inversión renombrado");

  const nonEconomic = await f.request("/api/saldos/S005", "PATCH", {
    revision: getSaldo(f.db, "S005").revision,
    saldoApertura: "5.00",
  });
  expect(nonEconomic.status).toBe(200);
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
