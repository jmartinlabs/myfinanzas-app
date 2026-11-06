import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createInstrumento } from "./instrumentos";
import { reabrirCierre } from "./e410";
import { Problem } from "./problem";
import {
  activeReopenedCycle,
  assertClosedCyclesUnchanged,
  assertClosedInformativeFields,
  assertDatesWritable,
  assertMovementClosureImpact,
  assertPlanClosureReview,
  closedFieldDecision,
  closedWindows,
  movementClosureImpact,
  operationClosureImpact,
  saldoEconomicReview,
} from "./e49-guards";
import type { CierreOptions } from "./e49";

process.env.NODE_ENV = "test";

const now = Date.parse("2026-03-10T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas E4.10 guards " + randomUUID();
const stamp = "2026-01-01T00:00:00.000Z";
const fixtureKey = randomUUID();

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
      referencia: "backup-ficticio-guards-e410",
    },
    e35: {
      verificable: true,
      motivo: null,
      huella: "a".repeat(64),
      cobertura: "Verificada",
      datos: { fixture: "E3.5 acreditada para prueba de guards E4.10" },
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
  },
) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
       partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
       capital,intereses)
     VALUES(?,?,?,?,?,?,NULL,NULL,NULL,?, '',0,1,?,?,NULL,NULL)`,
    [
      input.id,
      input.fecha,
      input.tipo ?? "Transferencia",
      input.importe,
      input.origen ?? "S001",
      input.destino ?? "S002",
      "Movimiento ficticio guard E4.10 " + input.id,
      stamp,
      stamp,
    ],
  );
}

function seedFacts(db: Database, instrumento: string) {
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
  seedMovement(db, { id: "8001", fecha: "2026-01-15", importe: 1234 });
  seedMovement(db, { id: "8002", fecha: "2026-02-05", importe: 500 });
}

function fixture() {
  const db = openDatabase(":memory:");
  seedCycles(db);
  const key = randomBytes(32);
  const instrumento = createInstrumento(
    db,
    {
      nombre: "Instrumento ficticio guards E4.10",
      isin: "ES0000000456",
      isinEvidencia: "Evidencia ficticia guards E4.10",
      divisaReferencia: "EUR",
    },
    randomUUID(),
    now,
  ).instrumento.id;
  seedFacts(db, instrumento);
  const handler = HttpApp.toWebHandler(
    createApp(db, {
      key,
      now: () => now,
      cierre: validOptions(),
      reapertura: { actor: "Alex" },
    }),
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
  async function close(ciclo: string) {
    const pre = await request(`/api/cierres/${ciclo}/preflight`);
    expect(pre.status).toBe(200);
    const result = await request(
      `/api/cierres/${ciclo}/cerrar`,
      "POST",
      { fingerprint: pre.data.fingerprint },
      { "idempotency-key": randomUUID() },
    );
    return { pre, result };
  }
  return { db, instrumento, request, enroll, close };
}

function purchaseBody(instrumento: string, over: Record<string, unknown> = {}) {
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
    concepto: "Compra abierta E4.10",
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
    concepto: "Venta abierta E4.10",
    nota: null,
    ...over,
  };
}

function movementBody(over: Record<string, unknown> = {}) {
  return {
    fecha: "2026-02-10",
    tipo: "Transferencia",
    importe: "5.00",
    origen: "S003",
    destino: "S001",
    subtipo: null,
    partida: null,
    referencia: null,
    concepto: "Movimiento abierto E4.10",
    nota: null,
    capital: null,
    intereses: null,
    ...over,
  };
}

function purchaseRectification(over: Record<string, unknown> = {}) {
  return {
    revision: 1,
    motivo: "Rectificación ficticia",
    fecha: "2026-02-10",
    cantidad: "1",
    precio: "100.00",
    divisa: "EUR",
    cambio: null,
    importeEur: "100.00",
    comisionEur: "0.00",
    concepto: "Compra febrero",
    nota: null,
    ...over,
  };
}

function saleRectification(over: Record<string, unknown> = {}) {
  return {
    revision: 1,
    motivo: "Rectificación ficticia",
    fecha: "2026-02-15",
    cantidad: "1",
    precio: "100.00",
    divisa: "EUR",
    cambio: null,
    importeEur: "100.00",
    comisionEur: "0.00",
    concepto: "Venta febrero",
    nota: null,
    ...over,
  };
}

async function createMovement(
  f: ReturnType<typeof fixture>,
  body: Record<string, unknown>,
) {
  const impact = await f.request("/api/movimientos/impacto", "POST", body);
  expect(impact.status).toBe(200);
  return f.request(
    "/api/movimientos",
    "POST",
    {
      ...body,
      contextRevision: impact.data.contextRevision,
      fingerprint: impact.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
}

async function rectifyMovement(
  f: ReturnType<typeof fixture>,
  id: string,
  body: Record<string, unknown>,
) {
  const impact = await f.request(`/api/movimientos/${id}/impacto`, "POST", body);
  expect(impact.status).toBe(200);
  return f.request(
    `/api/movimientos/${id}/rectificar`,
    "POST",
    {
      ...body,
      contextRevision: impact.data.contextRevision,
      fingerprint: impact.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
}

async function annulMovement(
  f: ReturnType<typeof fixture>,
  id: string,
  body: Record<string, unknown>,
) {
  const impact = await f.request(
    `/api/movimientos/${id}/impacto-anulacion`,
    "POST",
    body,
  );
  expect(impact.status).toBe(200);
  return f.request(
    `/api/movimientos/${id}/anular`,
    "POST",
    {
      ...body,
      contextRevision: impact.data.contextRevision,
      fingerprint: impact.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
}

async function reopenLast(f: ReturnType<typeof fixture>, ciclo: string) {
  return reabrirCierre(
    f.db,
    ciclo,
    { versionEsperada: 1, motivo: "Motivo de reapertura E4.10" },
    "reapertura-" + randomUUID(),
    { actor: "Alex" },
    now,
  );
}

function problemOf(fn: () => unknown): Problem {
  try {
    fn();
  } catch (error) {
    if (error instanceof Problem) return error;
    throw error;
  }
  throw new Error("Se esperaba un Problem y no se lanzó.");
}

function seedClosure(
  db: Database,
  ciclo: string,
  version: number,
  inicio: string,
  fin: string,
) {
  const creado = `2026-0${Math.min(version, 9)}-01T00:00:00.000Z`;
  const fp = "a".repeat(64);
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,
        creado_utc,motivo,fingerprint,estado)
       VALUES(?,?,?,?,10000,'usuario-unico',?,?,?,'Cerrado')`,
      [ciclo, version, inicio, fin, creado, version === 1 ? null : "Re-cierre", fp],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,
        fingerprint,app_version,schema_version,ventana_inicio,ventana_fin,
        saldo_inicial,estado_temporal,estado_hechos,estado_plan,hechos,plan,
        clasificacion,inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES(?,?,?,'usuario-unico',?,?,'0.0.0-fixture',26,?,?,10000,'Cerrado',
        'Sin hechos','SinPlan','{}','{}','{}','{}','{}','{}','{}','{}')`,
      [ciclo, version, creado, version === 1 ? null : "Re-cierre", fp, inicio, fin],
    );
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES(?,?,'cierre',NULL,'{}',?,?,'usuario-unico')`,
      [ciclo, version, version === 1 ? null : "Re-cierre", creado],
    );
  })();
}

test("E4.10 I3 T1: Movimientos, Compras y Ventas se permiten en el ciclo reabierto", async () => {
  const f = fixture();
  try {
    await f.enroll();
    expect((await f.close("1")).result.status).toBe(201);
    expect((await f.close("2")).result.status).toBe(201);
    await reopenLast(f, "2");
    expect(activeReopenedCycle(f.db)).toBe("2");

    const movement = await createMovement(
      f,
      movementBody({ fecha: "2026-02-20" }),
    );
    expect(movement.status).toBe(201);

    const purchase = await f.request(
      "/api/compras",
      "POST",
      purchaseBody(f.instrumento, { fecha: "2026-02-10" }),
      { "idempotency-key": randomUUID() },
    );
    expect(purchase.status).toBe(201);

    const sale = await f.request(
      "/api/ventas",
      "POST",
      saleBody(f.instrumento, { fecha: "2026-02-15" }),
      { "idempotency-key": randomUUID() },
    );
    expect(sale.status).toBe(201);
  } finally {
    f.db.close();
  }
});

test("E4.10 I3 T1: rectificación y anulación se permiten en el ciclo reabierto", async () => {
  const f = fixture();
  try {
    seedOperation(f.db, {
      id: "7003",
      clase: "Compra",
      fecha: "2026-02-10",
      instrumento: f.instrumento,
      cantidad: "1",
      importe: 10000,
      concepto: "Compra febrero",
    });
    seedOperation(f.db, {
      id: "7004",
      clase: "Venta",
      fecha: "2026-02-15",
      instrumento: f.instrumento,
      cantidad: "1",
      importe: 10000,
      concepto: "Venta febrero",
    });
    seedMovement(f.db, {
      id: "8003",
      fecha: "2026-02-20",
      importe: 500,
    });
    await f.enroll();
    expect((await f.close("1")).result.status).toBe(201);
    expect((await f.close("2")).result.status).toBe(201);
    await reopenLast(f, "2");

    const movementRectified = await rectifyMovement(f, "8003", {
      ...movementBody({ fecha: "2026-02-20", importe: "6.00" }),
      revision: 1,
      motivo: "Rectificación dentro de la ventana",
    });
    expect(movementRectified.status).toBe(200);
    const movementAnnulled = await annulMovement(f, "8003", {
      revision: 2,
      motivo: "Anulación dentro de la ventana",
    });
    expect(movementAnnulled.status).toBe(200);

    const purchaseRectified = await f.request(
      "/api/compras/7003/rectificar",
      "POST",
      purchaseRectification({
        fecha: "2026-02-10",
        cantidad: "1",
        importeEur: "100.00",
      }),
      { "idempotency-key": randomUUID() },
    );
    expect(purchaseRectified.status).toBe(200);
    const purchaseAnnulled = await f.request(
      "/api/compras/7003/anular",
      "POST",
      { revision: 2, motivo: "Anulación dentro de la ventana" },
      { "idempotency-key": randomUUID() },
    );
    expect(purchaseAnnulled.status).toBe(200);

    const saleRectified = await f.request(
      "/api/ventas/7004/rectificar",
      "POST",
      saleRectification({
        fecha: "2026-02-15",
        cantidad: "1",
        importeEur: "100.00",
      }),
      { "idempotency-key": randomUUID() },
    );
    expect(saleRectified.status).toBe(200);
    const saleAnnulled = await f.request(
      "/api/ventas/7004/anular",
      "POST",
      { revision: 2, motivo: "Anulación dentro de la ventana" },
      { "idempotency-key": randomUUID() },
    );
    expect(saleAnnulled.status).toBe(200);
  } finally {
    f.db.close();
  }
});

test("E4.10 I3 T1: otro ciclo y las fechas fuera de la ventana siguen bloqueados", async () => {
  const f = fixture();
  try {
    await f.enroll();
    expect((await f.close("1")).result.status).toBe(201);
    expect((await f.close("2")).result.status).toBe(201);
    await reopenLast(f, "2");

    const movement = await f.request(
      "/api/movimientos",
      "POST",
      movementBody({ fecha: "2026-01-10" }),
      { "idempotency-key": randomUUID() },
    );
    expect(movement.status).toBe(409);
    expect(movement.data.code).toBe("HISTORY_LOCKED");
    expect(movement.data.cierres).toEqual([
      expect.objectContaining({ ciclo: "1", version: 1 }),
    ]);

    const purchase = await f.request(
      "/api/compras",
      "POST",
      purchaseBody(f.instrumento, { fecha: "2026-01-12" }),
      { "idempotency-key": randomUUID() },
    );
    expect(purchase.status).toBe(409);
    expect(purchase.data.code).toBe("HISTORY_LOCKED");
    expect(purchase.data.cierres[0].ciclo).toBe("1");

    const sale = await f.request(
      "/api/ventas",
      "POST",
      saleBody(f.instrumento, { fecha: "2026-01-21" }),
      { "idempotency-key": randomUUID() },
    );
    expect(sale.status).toBe(409);
    expect(sale.data.code).toBe("HISTORY_LOCKED");
    expect(sale.data.cierres[0].ciclo).toBe("1");

    for (const [path, body] of [
      [
        "/api/movimientos/8001/rectificar",
        {
          ...movementBody({ fecha: "2026-01-15", importe: "12.34" }),
          revision: 1,
          motivo: "Rectificación en otro ciclo",
        },
      ],
      [
        "/api/movimientos/8001/anular",
        { revision: 1, motivo: "Anulación en otro ciclo" },
      ],
      ["/api/compras/7001/rectificar", purchaseRectification()],
      [
        "/api/compras/7001/anular",
        { revision: 1, motivo: "Anulación en otro ciclo" },
      ],
      ["/api/ventas/7002/rectificar", saleRectification()],
      [
        "/api/ventas/7002/anular",
        { revision: 1, motivo: "Anulación en otro ciclo" },
      ],
    ] as const) {
      const rejected = await f.request(path, "POST", body, {
        "idempotency-key": randomUUID(),
      });
      expect(rejected.status).toBe(409);
      expect(rejected.data.code).toBe("HISTORY_LOCKED");
      expect(rejected.data.cierres[0].ciclo).toBe("1");
    }

    // Removing the projection (no open window) restores the original lock.
    f.db.run("DELETE FROM reapertura_activa");
    const outside = problemOf(() =>
      assertDatesWritable(f.db, ["2026-02-10"], "registrar el Movimiento", {
        allowActiveReopenedCycle: true,
      }),
    );
    expect(outside.status).toBe(409);
    expect(outside.code).toBe("HISTORY_LOCKED");
  } finally {
    f.db.close();
  }
});

test("E4.10 I3 T1: S0, Inicio y Fin del ciclo reabierto siguen bloqueados", async () => {
  const f = fixture();
  try {
    await f.enroll();
    expect((await f.close("1")).result.status).toBe(201);
    expect((await f.close("2")).result.status).toBe(201);
    await reopenLast(f, "2");

    expect(closedWindows(f.db).map((w) => w.ciclo)).toEqual(["1", "2"]);
    const before = [
      { id: "1", inicio: "2026-01-01", fin: "2026-01-31", saldoInicialComida: "100.00" },
      { id: "2", inicio: "2026-02-01", fin: "2026-02-28", saldoInicialComida: "100.00" },
      { id: "3", inicio: "2026-03-01", fin: null, saldoInicialComida: "100.00" },
    ];
    for (const after of [
      before.map((c) =>
        c.id === "2" ? { ...c, saldoInicialComida: "101.00" } : c,
      ),
      before.map((c) => (c.id === "2" ? { ...c, inicio: "2026-02-02" } : c)),
      before.map((c) => (c.id === "2" ? { ...c, fin: "2026-02-27" } : c)),
    ]) {
      const error = problemOf(() =>
        assertClosedCyclesUnchanged(f.db, before, after),
      );
      expect(error.status).toBe(409);
      expect(error.code).toBe("HISTORY_LOCKED");
    }
  } finally {
    f.db.close();
  }
});

test("E4.10 I3 T1: se excluyen todas las versiones del ciclo reabierto, no las de otros ciclos", () => {
  const db = openDatabase(":memory:");
  try {
    seedCycles(db);
    seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
    seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
    seedClosure(db, "2", 2, "2026-02-01", "2026-02-28");
    const reopened = reabrirCierre(
      db,
      "2",
      { versionEsperada: 2, motivo: "Ventana sobre v2" },
      "reapertura-" + randomUUID(),
      { actor: "Alex" },
      now,
    );
    expect(reopened.version).toBe(2);
    expect(activeReopenedCycle(db)).toBe("2");

    // v1 and v2 photos of cycle 2 are unverifiable (`{}`); without the
    // DT-G exception either would block a February movement. Both must be
    // excluded, while the January photo of cycle 1 still blocks.
    const february = movementBody({ fecha: "2026-02-10" });
    expect(
      movementClosureImpact(db, null, {
        fecha: february.fecha,
        importe: "500",
        origen: "S003",
        destino: "S001",
      }),
    ).toEqual([]);
    expect(
      operationClosureImpact(db, null, {
        clase: "Compra",
        fecha: "2026-02-10",
        estado: "Vigente",
        cantidad: "100",
        importe: "10000",
        instrumento: "I1",
        saldoEfectivo: "S003",
        saldoInversion: "S004",
      }),
    ).toEqual([]);

    const january = movementBody({ fecha: "2026-01-10" });
    const error = problemOf(() =>
      assertMovementClosureImpact(
        db,
        null,
        {
          fecha: january.fecha,
          importe: "500",
          origen: "S003",
          destino: "S001",
        },
        "registrar el Movimiento",
      ),
    );
    expect(error.code).toBe("HISTORY_LOCKED");
    expect(error.details.cierres).toEqual([
      expect.objectContaining({ ciclo: "1", version: 1 }),
    ]);
  } finally {
    db.close();
  }
});

test("E4.10 I3: T2/T3 conservan su comportamiento durante la ventana", async () => {
  const f = fixture();
  try {
    await f.enroll();
    expect((await f.close("1")).result.status).toBe(201);
    expect((await f.close("2")).result.status).toBe(201);
    await reopenLast(f, "2");

    const decision = closedFieldDecision(f.db, "movimiento", [
      "concepto",
      "importe",
    ]);
    expect(decision.windows.map((w) => w.ciclo)).toEqual(["1", "2"]);
    expect(decision.informative).toEqual(["concepto"]);
    expect(decision.economic).toEqual(["importe"]);

    expect(() =>
      assertClosedInformativeFields(
        f.db,
        "movimiento",
        ["concepto"],
        "rectificar el Movimiento",
      ),
    ).not.toThrow();
    const economic = problemOf(() =>
      assertClosedInformativeFields(
        f.db,
        "movimiento",
        ["importe"],
        "rectificar el Movimiento",
      ),
    );
    expect(economic.code).toBe("HISTORY_LOCKED");

    expect(saldoEconomicReview(f.db, ["saldoApertura"])).toHaveLength(2);
    const plan = problemOf(() =>
      assertPlanClosureReview(
        f.db,
        "2",
        true,
        null,
        "rectificar el plan",
      ),
    );
    expect(plan.status).toBe(422);
    expect(plan.code).toBe("VALIDATION");
  } finally {
    f.db.close();
  }
});
