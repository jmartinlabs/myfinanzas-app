import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createInstrumento } from "./instrumentos";
import {
  confirmCierre,
  getCierreEstado,
  getFotoCierre,
  previewCierre,
  type CierreOptions,
} from "./e49";
import { updateSaldo, getSaldo } from "./saldos";
import { BUILD_VERSION, resolveAppVersion } from "./app-version";

process.env.NODE_ENV = "test";

const now = Date.parse("2026-03-10T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas E4.9 " + randomUUID();

function seedCycles(db: Database) {
  const t = "2026-01-01T00:00:00.000Z";
  for (const [id, inicio, s0] of [
    ["1", "2026-01-01", 10000],
    ["2", "2026-02-01", 10000],
    ["3", "2026-03-01", 10000],
  ] as const)
    db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,?,?)", [
      id,
      inicio,
      s0,
      t,
    ]);
}

function validOptions(overrides: Partial<CierreOptions> = {}): CierreOptions {
  return {
    appVersion: "0.0.0-fixture",
    backup: {
      verificado: true,
      restauracionProbada: true,
      referencia: "backup-ficticio-e49",
    },
    e35: {
      verificable: true,
      motivo: null,
      huella: "a".repeat(64),
      cobertura: "Verificada",
      datos: { fixture: "E3.5 acreditada para prueba focalizada" },
    },
    ...overrides,
  };
}

function fixture(options: CierreOptions = validOptions()) {
  const db = openDatabase(":memory:");
  seedCycles(db);
  const key = randomBytes(32);
  const handler = HttpApp.toWebHandler(
    createApp(db, { key, now: () => now, cierre: options }),
  );
  let cookie = "",
    csrf = "";
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const r = await handler(
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
    for (const set of r.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie
        .split("; ")
        .filter((p) => p && !p.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = await r.json();
    if (data.csrf) csrf = data.csrf;
    return { status: r.status, data, headers: r.headers };
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
    return verified;
  }
  async function close(
    ciclo: string,
    body: Record<string, unknown> = {},
    keyValue = randomUUID(),
  ) {
    const pre = await request(`/api/cierres/${ciclo}/preflight`);
    expect(pre.status).toBe(200);
    const result = await request(
      `/api/cierres/${ciclo}/cerrar`,
      "POST",
      { fingerprint: pre.data.fingerprint, ...body },
      { "idempotency-key": keyValue },
    );
    return { pre, result, key: keyValue };
  }
  return { db, key, request, enroll, close };
}

function planNoVerificable(db: Database) {
  const t = "2026-01-01T00:00:00.000Z";
  db.run(
    `INSERT INTO presupuestos(id,nombre,fuente,destino,estado,revision,creado,actualizado)
     VALUES('PRE9001','Plan ficticio E4.9','Gasto real','S001','Activo',1,?,?)`,
    [t, t],
  );
  db.run("INSERT INTO cycle_plans(ciclo,revision) VALUES('1',2)");
  db.run(
    `INSERT INTO cycle_plan_lines(ciclo,presupuesto,base,esencial,del_mes)
     VALUES('1','PRE9001',1000,500,200)`,
  );
  db.run(
    `INSERT INTO cycle_plan_audit(ciclo,presupuesto,revision,actor,instante,motivo,delta)
     VALUES('1','PRE9001',1,'fixture',?,NULL,'{}')`,
    [t],
  );
}

function verifiableRegimen(db: Database, ciclo = "1", saldo = "S001") {
  const t = "2026-01-01T00:00:00.000Z";
  db.run(
    `INSERT INTO regimen_comida(saldo,ciclo_corte,apertura,evidencia,cobertura,
       estado,revision,creado,actualizado)
     VALUES(?,?,?,'Extracto ficticio E4.9','Verificable','Activo',1,?,?)`,
    [saldo, ciclo, 10000, t, t],
  );
}

function januaryMovement(db: Database, id = "8001") {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
       partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
       capital,intereses)
     VALUES(?,'2026-01-15','Ingreso',1234,'S000','S001','Nómina',
       NULL,NULL,'Hecho ficticio E4.9','',0,1,'2026-01-15T00:00:00.000Z',
       '2026-01-15T00:00:00.000Z',NULL,NULL)`,
    [id],
  );
}

function seedDeuda(db: Database, id = "D0001") {
  db.run(
    `INSERT INTO deudas(id,nombre,inicio,apertura,estado,revision,creado,actualizado)
     VALUES(?,'Deuda ficticia E4.9','2025-01-01',10000,'Activa',1,
       '2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z')`,
    [id],
  );
}

function performanceOperation(
  db: Database,
  instrumento: string,
  input: {
    id: string;
    clase: "Compra" | "Venta";
    fecha: string;
    cantidad: string;
    precio: string;
    importe: number;
  },
) {
  db.run(
    `INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,
      saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,
      comision_eur,concepto,nota,estado,revision,creado,actualizado)
     VALUES(?,?,?,?,'S003','S004',?,?,'EUR',NULL,?,0,'Fixture E4.9',NULL,
      'Vigente',1,?,?)`,
    [
      input.id,
      input.clase,
      input.fecha,
      instrumento,
      input.cantidad,
      input.precio,
      input.importe,
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    ],
  );
}

test("E4.9 B: 401/403/405 and no-store on closure routes", async () => {
  const f = fixture();
  expect((await f.request("/api/cierres/1/preflight")).status).toBe(401);
  await f.enroll();
  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(pre.headers.get("cache-control")).toBe("no-store");
  expect(pre.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(pre.data.plan.estado).toBe("SinPlan");
  expect(pre.data.e49Bloqueado).toBe(false);

  const noCsrf = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: pre.data.fingerprint },
    { "x-csrf-token": "" },
  );
  expect(noCsrf.status).toBe(403);
  expect(noCsrf.data.code).toBe("CSRF");

  const invalidFingerprint = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: "no-es-un-fingerprint" },
    { "idempotency-key": randomUUID() },
  );
  expect(invalidFingerprint.status).toBe(422);
  expect(invalidFingerprint.data.code).toBe("VALIDATION");
  const missingKey = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: pre.data.fingerprint },
  );
  expect(missingKey.status).toBe(422);
  expect(missingKey.data.code).toBe("IDEMPOTENCY_REQUIRED");
  const missingPhoto = await f.request("/api/cierres/1/foto");
  expect(missingPhoto.status).toBe(404);
  const invalidVersion = await f.request("/api/cierres/1/foto?version=0");
  expect(invalidVersion.status).toBe(422);

  const wrongPreflight = await f.request(
    "/api/cierres/1/preflight",
    "POST",
    {},
  );
  expect(wrongPreflight.status).toBe(405);
  expect(wrongPreflight.headers.get("allow")).toBe("GET");
  const wrongClose = await f.request("/api/cierres/1/cerrar");
  expect(wrongClose.status).toBe(405);
  expect(wrongClose.headers.get("allow")).toBe("POST");
});

test("E4.9 B: preflight blocks without next Inicio, D4/E3.5 and backup", async () => {
  const f = fixture(
    validOptions({
      e35: { verificable: false, motivo: "E3.5 fixture no verificable" },
      backup: null,
    }),
  );
  await f.enroll();
  const pre = await f.request("/api/cierres/3/preflight");
  expect(pre.status).toBe(200);
  expect(pre.data.e49Bloqueado).toBe(true);
  expect(pre.data.estado).toBe("Bloqueado");
  expect(pre.data.ventana.fin).toBeNull();
  const codes = pre.data.bloqueos.map((b: { code: string }) => b.code);
  expect(codes).toContain("SIN_SIGUIENTE_INICIO");
  expect(codes).toContain("E35_NO_VERIFICABLE");
  expect(codes).toContain("BACKUP_NO_VERIFICABLE");
  expect(f.db.query("SELECT COUNT(*) n FROM cierres").get()).toEqual({ n: 0 });
  const close = await f.request(
    "/api/cierres/3/cerrar",
    "POST",
    { fingerprint: pre.data.fingerprint },
    { "idempotency-key": randomUUID() },
  );
  expect(close.status).toBe(409);
  expect(close.data.code).toBe("SIN_SIGUIENTE_INICIO");
});

test("E4.9 B: SinPlan closes v1 with app/schema metadata and no live writes", async () => {
  const f = fixture();
  await f.enroll();
  const before = {
    movimientos: f.db.query("SELECT COUNT(*) n FROM movimientos").get(),
    saldos: f.db.query("SELECT COUNT(*) n FROM saldos").get(),
    operaciones: f.db.query("SELECT COUNT(*) n FROM operaciones_inversion").get(),
    ciclos: f.db.query("SELECT COUNT(*) n FROM ciclos").get(),
  };
  const { pre, result } = await f.close("1");
  expect(result.status).toBe(201);
  expect(result.data.foto.version).toBe(1);
  expect(result.data.foto.appVersion).toBe("0.0.0-fixture");
  expect(result.data.foto.schemaVersion).toBe(25);
  expect(result.data.foto.plan.estado).toBe("SinPlan");
  expect(result.data.foto.hechos.estado).toBe("Sin hechos");
  expect(result.data.foto.ventana.saldoInicial).toBe("100.00");
  expect(result.data.foto.inversion.efectivo).toBe("0.00");
  expect(result.data.foto.inversion.valoracion).toBe("No disponible");
  expect(result.data.foto.fingerprint).toBe(pre.data.fingerprint);
  expect(result.data.foto.cobertura.totales.valoracion.estado).toBe(
    "No disponible",
  );
  expect(result.data.foto.cobertura.totales.anticipos.estado).toBe("Parcial");

  const state = await f.request("/api/cierres/1/estado");
  expect(state.status).toBe(200);
  // E4.8 compatibility: top-level fields remain those of getPrecierreEstado.
  expect(state.data.ciclo).toBe("1");
  expect(state.data.revision).toMatch(/^[a-f0-9]{64}$/);
  expect(state.data).toHaveProperty("e4_9Bloqueado");
  expect(state.data).toHaveProperty("bloqueos");
  // E4.9 closure state is additive under `cierre`.
  expect(state.data.cierre.estado).toBe("Cerrado");
  expect(state.data.cierre.version).toBe(1);
  expect(state.data.cierre.fotoVersion).toBe(1);
  const alias = await f.request("/api/cierres/1/cierre");
  expect(alias.data.estado).toBe("Cerrado");
  expect(alias.data.version).toBe(1);

  const after = {
    movimientos: f.db.query("SELECT COUNT(*) n FROM movimientos").get(),
    saldos: f.db.query("SELECT COUNT(*) n FROM saldos").get(),
    operaciones: f.db.query("SELECT COUNT(*) n FROM operaciones_inversion").get(),
    ciclos: f.db.query("SELECT COUNT(*) n FROM ciclos").get(),
  };
  expect(after).toEqual(before);
  expect(f.db.query("SELECT COUNT(*) n FROM cierre_audit").get()).toEqual({ n: 1 });

  const photo = await f.request("/api/cierres/1/foto");
  expect(photo.status).toBe(200);
  expect(photo.data.foto.version).toBe(1);
  const unchanged = await f.request("/api/cierres/1/foto");
  expect(unchanged.data).toEqual(photo.data);
});

test("E4.9 B: PlanNoVerificable blocks without a photo", async () => {
  const f = fixture();
  planNoVerificable(f.db);
  await f.enroll();
  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(pre.data.plan.estado).toBe("PlanNoVerificable");
  expect(
    pre.data.bloqueos.map((b: { code: string }) => b.code),
  ).toContain("PLAN_NO_VERIFICABLE");
  const close = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: pre.data.fingerprint },
    { "idempotency-key": randomUUID() },
  );
  expect(close.status).toBe(409);
  expect(close.data.code).toBe("PLAN_NO_VERIFICABLE");
  expect(f.db.query("SELECT COUNT(*) n FROM fotos_cierre").get()).toEqual({
    n: 0,
  });
});

test("E4.9 B: idempotent replay, payload conflict and stale preview", async () => {
  const f = fixture();
  await f.enroll();
  const pre = await f.request("/api/cierres/1/preflight");
  const key = randomUUID();
  const body = { fingerprint: pre.data.fingerprint, motivo: "Cierre ficticio" };
  const first = await f.request("/api/cierres/1/cerrar", "POST", body, {
    "idempotency-key": key,
  });
  expect(first.status).toBe(201);
  const replay = await f.request("/api/cierres/1/cerrar", "POST", body, {
    "idempotency-key": key,
  });
  expect(replay.status).toBe(201);
  expect(replay.data.foto).toEqual(first.data.foto);
  expect(replay.data.replayed).toBe(true);

  // A same key/payload replay after the 24 h window must keep returning the
  // same photo, not ALREADY_CLOSED.
  f.db.run("UPDATE cierre_attempts SET expires=? WHERE key=?", [now - 1, key]);
  const afterExpiry = await f.request("/api/cierres/1/cerrar", "POST", body, {
    "idempotency-key": key,
  });
  expect(afterExpiry.status).toBe(201);
  expect(afterExpiry.data.replayed).toBe(true);
  expect(afterExpiry.data.foto).toEqual(first.data.foto);
  expect(
    f.db.query("SELECT COUNT(*) n FROM fotos_cierre").get(),
  ).toEqual({ n: 1 });

  const changed = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { ...body, motivo: "Otro motivo" },
    { "idempotency-key": key },
  );
  expect(changed.status).toBe(409);
  expect(changed.data.code).toBe("IDEMPOTENCY_CONFLICT");

  const double = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    body,
    { "idempotency-key": randomUUID() },
  );
  expect(double.status).toBe(409);
  expect(double.data.code).toBe("ALREADY_CLOSED");

  const stale = fixture();
  await stale.enroll();
  const stalePre = await stale.request("/api/cierres/1/preflight");
  createInstrumento(
    stale.db,
    {
      nombre: "Instrumento posterior a la vista previa",
      isin: "ES0000000999",
      isinEvidencia: "Evidencia ficticia E4.9",
      divisaReferencia: "EUR",
    },
    randomUUID(),
    now,
  );
  const staleClose = await stale.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: stalePre.data.fingerprint },
    { "idempotency-key": randomUUID() },
  );
  expect(staleClose.status).toBe(409);
  expect(staleClose.data.code).toBe("REVISION_CONFLICT");
  expect(
    stale.db.query("SELECT COUNT(*) n FROM fotos_cierre").get(),
  ).toEqual({ n: 0 });
});

test("E4.9 B: a failure before commit rolls back closure, photo, audit and attempt", () => {
  const db = openDatabase(":memory:");
  seedCycles(db);
  const options = validOptions({
    hooks: {
      beforeCommit() {
        throw new Error("fallo inducido E4.9");
      },
    },
  });
  const pre = previewCierre(db, "1", options, now);
  expect(() =>
    confirmCierre(
      db,
      "1",
      { fingerprint: pre.fingerprint },
      randomUUID(),
      options,
      now,
    ),
  ).toThrow("fallo inducido E4.9");
  expect(db.query("SELECT COUNT(*) n FROM cierres").get()).toEqual({ n: 0 });
  expect(db.query("SELECT COUNT(*) n FROM fotos_cierre").get()).toEqual({
    n: 0,
  });
  expect(db.query("SELECT COUNT(*) n FROM cierre_audit").get()).toEqual({
    n: 0,
  });
  expect(db.query("SELECT COUNT(*) n FROM cierre_attempts").get()).toEqual({
    n: 0,
  });
});

test("E4.9 B: out-of-order closure requires motive, audits and preserves later photo", async () => {
  const f = fixture();
  await f.enroll();
  const later = await f.close("2");
  expect(later.result.status).toBe(201);
  const laterPhoto = later.result.data.foto;

  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(pre.data.coherencia.requerida).toBe(true);
  expect(pre.data.coherencia.contradicciones).toEqual([]);
  expect(
    pre.data.avisos.map((a: { code: string }) => a.code),
  ).toContain("CIERRE_FUERA_DE_ORDEN");

  const noMotive = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: pre.data.fingerprint },
    { "idempotency-key": randomUUID() },
  );
  expect(noMotive.status).toBe(422);
  expect(noMotive.data.code).toBe("MOTIVO_REQUERIDO");

  const closed = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: pre.data.fingerprint, motivo: "Cierre tardío ficticio" },
    { "idempotency-key": randomUUID() },
  );
  expect(closed.status).toBe(201);
  expect(closed.data.foto.version).toBe(1);
  expect(closed.data.cierre.fin).toBe("2026-01-31");

  const audit = f.db
    .query(
      "SELECT accion,motivo FROM cierre_audit WHERE ciclo='1' ORDER BY id DESC LIMIT 1",
    )
    .get();
  expect(audit).toEqual({
    accion: "cierre_fuera_de_orden",
    motivo: "Cierre tardío ficticio",
  });
  const posteriorRow = f.db
    .query(
      "SELECT posterior FROM cierre_audit WHERE ciclo='1' ORDER BY id DESC LIMIT 1",
    )
    .get() as { posterior: string };
  const posterior = JSON.parse(posteriorRow.posterior) as {
    coherence: {
      ciclo: string;
      version: number;
      resultado: string;
      comparado: {
        efectivo: { almacenado: string | null; vivo: string | null };
        cuentas: {
          almacenado: { saldo: string; disponible: string }[] | null;
          vivo: { saldo: string; disponible: string }[];
        };
        posiciones: {
          almacenado: { instrumento: string; cantidad: string }[] | null;
          vivo: { instrumento: string; cantidad: string }[];
        };
      };
    }[];
  };
  expect(posterior.coherence[0]).toMatchObject({
    ciclo: "2",
    version: 1,
    resultado: "Coherente",
    comparado: {
      efectivo: { almacenado: "0.00", vivo: "0.00" },
      cuentas: {
        almacenado: [{ saldo: "S003", disponible: "0.00" }],
        vivo: [{ saldo: "S003", disponible: "0.00" }],
      },
      posiciones: { almacenado: [], vivo: [] },
    },
  });
  const laterNow = f.db
    .query(
      "SELECT fingerprint,creado_utc FROM fotos_cierre WHERE ciclo='2' AND version=1",
    )
    .get();
  expect(laterNow).toEqual({
    fingerprint: laterPhoto.fingerprint,
    creado_utc: laterPhoto.creadoUtc,
  });
});

test("E4.9 B: AC-20 contradiction blocks an out-of-order closure", async () => {
  const f = fixture();
  await f.enroll();
  const later = await f.close("2");
  expect(later.result.status).toBe(201);
  const instrumento = createInstrumento(
    f.db,
    {
      nombre: "Instrumento ficticio AC-20",
      isin: "ES0000000888",
      isinEvidencia: "Evidencia ficticia E4.9",
      divisaReferencia: "EUR",
    },
    randomUUID(),
    now,
  ).instrumento.id;
  performanceOperation(f.db, instrumento, {
    id: "9001",
    clase: "Venta",
    fecha: "2026-02-15",
    cantidad: "100000000",
    precio: "50000000",
    importe: 5000,
  });
  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(pre.data.coherencia.contradicciones.length).toBeGreaterThan(0);
  expect(
    pre.data.bloqueos.map((b: { code: string }) => b.code),
  ).toContain("INCOHERENCIA_CON_CIERRE_POSTERIOR");
  const close = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: pre.data.fingerprint },
    { "idempotency-key": randomUUID() },
  );
  expect(close.status).toBe(409);
  expect(close.data.code).toBe("INCOHERENCIA_CON_CIERRE_POSTERIOR");
  expect(
    f.db.query("SELECT COUNT(*) n FROM cierres WHERE ciclo='1'").get(),
  ).toEqual({ n: 0 });
});

test("E4.9 B: photo captures inherited positions at Fin and excludes later operations", async () => {
  const f = fixture();
  updateSaldo(f.db, "S003", {
    revision: getSaldo(f.db, "S003").revision,
    saldoApertura: "100.00",
    fechaApertura: "2026-01-01",
    permiteSalidaExterior: true,
  });
  const instrumento = createInstrumento(
    f.db,
    {
      nombre: "Fondo heredado ficticio E4.9",
      isin: "ES0000000777",
      isinEvidencia: "Evidencia ficticia E4.9",
      divisaReferencia: "EUR",
    },
    randomUUID(),
    now,
  ).instrumento.id;
  performanceOperation(f.db, instrumento, {
    id: "9101",
    clase: "Compra",
    fecha: "2025-12-15",
    cantidad: "200000000",
    precio: "10000000",
    importe: 2000,
  });
  performanceOperation(f.db, instrumento, {
    id: "9102",
    clase: "Compra",
    fecha: "2026-02-10",
    cantidad: "300000000",
    precio: "10000000",
    importe: 3000,
  });
  await f.enroll();
  const { result } = await f.close("1");
  expect(result.status).toBe(201);
  expect(result.data.foto.inversion.posiciones).toEqual([
    { instrumento, saldoInversion: "S004", cantidad: "2" },
  ]);
  expect(result.data.foto.inversion.efectivo).toBe("80.00");
  expect(result.data.foto.hechos.estado).toBe("Sin hechos");
  expect(
    result.data.foto.inversion.operaciones.map(
      (operation: { id: string }) => operation.id,
    ),
  ).toEqual(["9101"]);
  expect(result.data.foto.ventana.saldoInicial).toBe("100.00");
});

test("E4.9 B: photo is not recalculated from later live changes", async () => {
  const f = fixture();
  await f.enroll();
  const { result } = await f.close("1");
  expect(result.status).toBe(201);
  const before = await f.request("/api/cierres/1/foto");
  createInstrumento(
    f.db,
    {
      nombre: "Instrumento vivo posterior",
      isin: "ES0000000666",
      isinEvidencia: "Evidencia ficticia E4.9",
      divisaReferencia: "EUR",
    },
    randomUUID(),
    now,
  );
  const after = await f.request("/api/cierres/1/foto");
  expect(after.data).toEqual(before.data);
});

test("E4.9 B: provider exposes the same closure state used by preflight", () => {
  const db = openDatabase(":memory:");
  seedCycles(db);
  const options = validOptions();
  expect(getCierreEstado(db, "1")).toMatchObject({
    ciclo: "1",
    estado: "Abierto",
    version: null,
    ventana: { inicio: "2026-01-01", fin: "2026-01-31" },
  });
  const pre = previewCierre(db, "1", options, now);
  confirmCierre(db, "1", { fingerprint: pre.fingerprint }, randomUUID(), options, now);
  const estado = getCierreEstado(db, "1");
  expect(estado.estado).toBe("Cerrado");
  expect(estado.version).toBe(1);
  expect(estado.cierre?.fingerprint).toBe(pre.fingerprint);
  const photo = getFotoCierre(db, "1");
  expect(photo.foto.fingerprint).toBe(pre.fingerprint);
});

test("E4.9 B: AC-20 a later closure created between preview and confirm is REVISION_CONFLICT", async () => {
  const f = fixture();
  await f.enroll();
  const later = await f.close("2");
  expect(later.result.status).toBe(201);

  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(pre.data.coherencia.requerida).toBe(true);

  // A new later cycle makes cycle 3 closable; closing it after the preview
  // adds a second coherence entry and must invalidate the preview fingerprint.
  f.db.run(
    "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('4','2026-04-01',10000,'2026-01-01T00:00:00.000Z')",
  );
  const laterStill = await f.close("3");
  expect(laterStill.result.status).toBe(201);

  const stale = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: pre.data.fingerprint },
    { "idempotency-key": randomUUID() },
  );
  expect(stale.status).toBe(409);
  expect(stale.data.code).toBe("REVISION_CONFLICT");
  expect(
    f.db.query("SELECT COUNT(*) n FROM cierres WHERE ciclo='1'").get(),
  ).toEqual({ n: 0 });
  expect(
    f.db.query("SELECT COUNT(*) n FROM fotos_cierre WHERE ciclo='1'").get(),
  ).toEqual({ n: 0 });
});

test("E4.9 B: default E3.5 provider unblocks a verifiable cycle", async () => {
  const f = fixture(validOptions({ e35: undefined }));
  verifiableRegimen(f.db);
  await f.enroll();
  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(pre.data.e35.verificable).toBe(true);
  expect(
    pre.data.bloqueos.map((b: { code: string }) => b.code),
  ).not.toContain("E35_NO_VERIFICABLE");
  expect(pre.data.e49Bloqueado).toBe(false);
});

test("E4.9 B: hechos con movimientos captures Con hechos", async () => {
  const f = fixture();
  januaryMovement(f.db);
  await f.enroll();
  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.data.hechos.estado).toBe("Con hechos");
  expect(pre.data.hechos.fuentes[0]).toMatchObject({
    fuente: "Movimientos",
    hechos: 1,
    acreditado: true,
  });
  const { result } = await f.close("1");
  expect(result.status).toBe(201);
  expect(result.data.foto.hechos.estado).toBe("Con hechos");
  expect(result.data.foto.hechos.totales.ingresos).toBe("12.34");
});

test("E4.9 B: Deuda master alone does not create hechos in the cycle", async () => {
  const f = fixture();
  seedDeuda(f.db);
  await f.enroll();
  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.data.hechos.estado).toBe("Sin hechos");
  expect(pre.data.hechos.fuentes).toContainEqual({
    fuente: "Deuda",
    hechos: 0,
    acreditado: true,
  });
  const { result } = await f.close("1");
  expect(result.status).toBe(201);
  expect(result.data.foto.hechos.estado).toBe("Sin hechos");
  expect(result.data.foto.auxiliares.deuda).toHaveLength(1);
});

test("E4.9 B: S0 cero is a fact and closes with saldoInicial 0.00", async () => {
  const f = fixture();
  f.db.run(
    `INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES
       ('4','2026-04-01',0,'2026-01-01T00:00:00.000Z'),
       ('5','2026-05-01',10000,'2026-01-01T00:00:00.000Z')`,
  );
  await f.enroll();
  const { result } = await f.close("4");
  expect(result.status).toBe(201);
  expect(result.data.foto.ventana.saldoInicial).toBe("0.00");
  expect(result.data.foto.hechos.estado).toBe("Sin hechos");
});

test("E4.9 B: verified backup without restore proof blocks before writing", async () => {
  const f = fixture(
    validOptions({
      backup: {
        verificado: true,
        restauracionProbada: false,
        referencia: "manifiesto-sin-restauracion",
      },
    }),
  );
  await f.enroll();
  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(
    pre.data.bloqueos.map((b: { code: string }) => b.code),
  ).toContain("BACKUP_NO_VERIFICABLE");
  const close = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: pre.data.fingerprint },
    { "idempotency-key": randomUUID() },
  );
  expect(close.status).toBe(409);
  expect(close.data.code).toBe("BACKUP_NO_VERIFICABLE");
  expect(f.db.query("SELECT COUNT(*) n FROM cierres").get()).toEqual({ n: 0 });
});

test("E4.9 B: E4.1 unavailable blocks with E4_1_NO_DISPONIBLE", async () => {
  const f = fixture();
  f.db.run(
    "UPDATE saldos SET tipo='Exterior', control='Exterior' WHERE control='Inversiones'",
  );
  await f.enroll();
  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(
    pre.data.bloqueos.map((b: { code: string }) => b.code),
  ).toContain("E4_1_NO_DISPONIBLE");
  expect(pre.data.inversion.efectivo).toBeNull();
});

test("E4.9 B: an absent Deuda table makes auxiliary fail and blocks FUENTE_NO_LEGIBLE", async () => {
  const f = fixture();
  f.db.run("ALTER TABLE deudas RENAME TO deudas_off");
  await f.enroll();
  const pre = await f.request("/api/cierres/1/preflight");
  expect(pre.status).toBe(200);
  expect(
    pre.data.bloqueos.map((b: { code: string }) => b.code),
  ).toContain("FUENTE_NO_LEGIBLE");
  expect(pre.data.cobertura.totales.deuda.estado).toBe("No disponible");
  expect(pre.data.hechos.fuentes).toContainEqual({
    fuente: "Deuda",
    hechos: 0,
    acreditado: false,
  });
  const close = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: pre.data.fingerprint },
    { "idempotency-key": randomUUID() },
  );
  expect(close.status).toBe(409);
  expect(
    close.data.bloqueos.map((b: { code: string }) => b.code),
  ).toContain("FUENTE_NO_LEGIBLE");
  expect(f.db.query("SELECT COUNT(*) n FROM fotos_cierre").get()).toEqual({
    n: 0,
  });
});

test("E4.9 B: documented precierre endpoint never reports Listo con avisos while blocked", async () => {
  const f = fixture();
  await f.enroll();
  const pre = await f.request("/api/cierres/precierre/1");
  expect(pre.status).toBe(200);
  expect(pre.headers.get("cache-control")).toBe("no-store");
  expect(pre.data.ciclo.id).toBe("1");
  expect(pre.data.e4_9Bloqueado).toBe(true);
  expect(pre.data.estado).toBe("Bloqueado");
  expect(
    pre.data.estado === "Listo con avisos" && pre.data.e4_9Bloqueado,
  ).toBe(false);
  expect(
    pre.data.fuentes.map((source: { key: string }) => source.key),
  ).toEqual(expect.arrayContaining(["e35", "e42", "e44", "e36"]));
});

test("E4.9 B: S0 above the exact safe-integer range returns a motivated 422", async () => {
  const f = fixture();
  f.db.run(
    `INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES
       ('4','2026-04-01',9007199254740992,'2026-01-01T00:00:00.000Z'),
       ('5','2026-05-01',10000,'2026-01-01T00:00:00.000Z')`,
  );
  await f.enroll();
  const pre = await f.request("/api/cierres/4/preflight");
  expect(pre.status).toBe(422);
  expect(pre.data.code).toBe("S0_FUERA_DE_RANGO");
  expect(pre.data.fields.saldoInicialComida).toContain("90071992547409.91");
  expect(f.db.query("SELECT COUNT(*) n FROM cierres").get()).toEqual({ n: 0 });
});

test("E4.9 B: app version is reproducible from package/env with documented fallback", () => {
  const previous = {
    APP_VERSION: process.env.APP_VERSION,
    APP_SHA: process.env.APP_SHA,
    GIT_SHA: process.env.GIT_SHA,
    GITHUB_SHA: process.env.GITHUB_SHA,
    COMMIT_SHA: process.env.COMMIT_SHA,
    SOURCE_SHA: process.env.SOURCE_SHA,
  };
  try {
    for (const name of Object.keys(previous)) delete process.env[name];
    process.env.GITHUB_SHA = "ABCDEF1234567890";
    // An explicit override is returned verbatim, without a SHA suffix.
    expect(resolveAppVersion("1.2.3-fixture")).toBe("1.2.3-fixture");
    process.env.APP_VERSION = "9.9.9-env";
    expect(resolveAppVersion()).toBe("9.9.9-env+abcdef1234567890");
    delete process.env.GITHUB_SHA;
    expect(resolveAppVersion()).toBe("9.9.9-env");
    delete process.env.APP_VERSION;
    expect(resolveAppVersion()).not.toBe("");
    expect(BUILD_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
