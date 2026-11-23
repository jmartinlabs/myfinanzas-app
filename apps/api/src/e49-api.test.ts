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

/*
 * SPEC38 §7.6 — retirada funcional de la vía fotográfica.
 *
 * Las pruebas de esta suite que ejercitaban el contrato de cierre (preflight,
 * cerrar, foto, reapertura y fotos de periodo) comprueban ahora la retirada:
 * `410` con el código fijado por ruta, el sustituto declarado, `cache-control:
 * no-store` y **cero escrituras**. Ninguna se elimina: cada una conserva su
 * fixture y sus aserciones de seguridad, y sólo cambia el contrato esperado.
 */

/** Tablas que ninguna ruta retirada puede modificar. */
const TABLAS_SIN_ESCRITURA = [
  "cierres",
  "fotos_cierre",
  "cierre_audit",
  "cierre_attempts",
  "movimientos",
  "saldos",
  "operaciones_inversion",
  "ciclos",
  "presupuestos",
  "cycle_plans",
  "cycle_plan_lines",
  "cycle_plan_audit",
  "deudas",
  "regimen_comida",
  "movimiento_anticipo",
] as const;

/** Snapshot de conteos; una tabla ausente se marca en vez de romper la prueba. */
function snapshot(db: Database) {
  const conteos: Record<string, unknown> = {};
  for (const tabla of TABLAS_SIN_ESCRITURA)
    try {
      conteos[tabla] = db.query(`SELECT COUNT(*) n FROM ${tabla}`).get();
    } catch {
      conteos[tabla] = "ausente";
    }
  return conteos;
}

type CodigoRetirada =
  | "CIERRE_FOTOGRAFICO_RETIRADO"
  | "REAPERTURA_RETIRADA"
  | "FOTO_RETIRADA"
  | "FOTOS_RETIRADAS";

type Respuesta = {
  status: number;
  data: Record<string, any>;
  headers: Headers;
};

/**
 * Contrato único de la retirada: `410`, código por ruta, `sustituto` en
 * `detalles` (publicado en el cuerpo), `no-store` y `link` sólo si hay
 * sustituto. Un `3xx`, `404` o `500` no satisface esta aserción.
 */
function expectRetirada(
  respuesta: Respuesta,
  esperado: { code: CodigoRetirada; sustituto?: string | null },
) {
  expect(respuesta.status).toBe(410);
  expect(respuesta.data.code).toBe(esperado.code);
  expect(respuesta.data).toHaveProperty("sustituto");
  expect(respuesta.data.sustituto).toBe(esperado.sustituto ?? null);
  expect(respuesta.headers.get("cache-control")).toBe("no-store");
  if (esperado.sustituto)
    expect(respuesta.headers.get("link")).toBe(
      `<${esperado.sustituto}>; rel="alternate"`,
    );
  else expect(respuesta.headers.get("link")).toBeNull();
}

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
  ): Promise<Respuesta> {
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
  // La antigua cadena preview→confirm se conserva como cadena de rutas
  // retiradas: preflight y cerrar responden 410 con el mismo sustituto.
  async function retiradaCierre(ciclo: string) {
    const sustituto = `/api/cierres/${ciclo}/estado`;
    const pre = await request(`/api/cierres/${ciclo}/preflight`);
    expectRetirada(pre, { code: "CIERRE_FOTOGRAFICO_RETIRADO", sustituto });
    const result = await request(
      `/api/cierres/${ciclo}/cerrar`,
      "POST",
      { fingerprint: "0".repeat(64) },
      { "idempotency-key": randomUUID() },
    );
    expectRetirada(result, { code: "CIERRE_FOTOGRAFICO_RETIRADO", sustituto });
    return { pre, result };
  }
  return { db, key, request, enroll, retiradaCierre };
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

function capturedPlan(db: Database, ciclo = "1") {
  const t = "2026-01-01T00:00:00.000Z";
  db.run(
    `INSERT INTO presupuestos(id,nombre,fuente,destino,estado,revision,creado,actualizado)
     VALUES('PRE9101','Plan capturado E4.9','Gasto real','S001','Activo',1,?,?)`,
    [t, t],
  );
  db.run("INSERT INTO cycle_plans(ciclo,revision) VALUES(?,1)", [ciclo]);
  db.run(
    `INSERT INTO cycle_plan_lines(ciclo,presupuesto,base,esencial,del_mes)
     VALUES(?, 'PRE9101', 1000, 500, 200)`,
    [ciclo],
  );
  db.run(
    `INSERT INTO cycle_plan_audit(ciclo,presupuesto,revision,actor,instante,motivo,delta)
     VALUES(?, 'PRE9101', 1, 'fixture', ?, NULL, '{}')`,
    [ciclo, t],
  );
}

function seedAnticipo(db: Database, movement = "8001") {
  const t = "2026-01-15T00:00:00.000Z";
  db.run(
    `INSERT INTO referencias(id,nombre,tipo,estado,revision,creado,actualizado)
     VALUES('REF9001','Anticipo ficticio E4.9','Anticipo','Activa',1,?,?)`,
    [t, t],
  );
  db.run(
    `INSERT INTO fichas_anticipos(referencia,apertura,evidencia,creado,actualizado)
     VALUES('REF9001',NULL,NULL,?,?)`,
    [t, t],
  );
  db.run(
    `INSERT INTO movimiento_anticipo(movimiento,referencia,rol,origen,destino,
       revision_movimiento,evidencia,procedencia,revision,actualizado)
     VALUES(?,'REF9001','Adelanto','S001','S000',1,'Evidencia ficticia','Fixture E4.9',1,?)`,
    [movement, t],
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

test("[retirada] E4.9 B: 401/403 y 410 por ruta, sin 200/405/404 en la vía fotográfica", async () => {
  // Sustituye el contrato preflight 200 / cerrar 201 / 405 por método / foto 404: retirado por SPEC38 §7.6.
  const f = fixture();
  expect((await f.request("/api/cierres/1/preflight")).status).toBe(401);
  expect((await f.request("/api/cierres/1/foto")).status).toBe(401);
  expect((await f.request("/api/fotos/periodos")).status).toBe(401);
  await f.enroll();
  const before = snapshot(f.db);

  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(pre.data).not.toHaveProperty("fingerprint");
  // El sustituto declarado no es un redirect: es una lectura viva que responde 200.
  const sustituto = await f.request("/api/cierres/1/estado");
  expect(sustituto.status).toBe(200);
  expect(sustituto.headers.get("cache-control")).toBe("no-store");
  expect(sustituto.data.ciclo).toBe("1");
  expect(sustituto.data.validacion.estado).toBe("SinValidar");

  // La seguridad precede a la retirada: sin CSRF no hay 410, sigue habiendo 403.
  const noCsrf = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: "0".repeat(64) },
    { "x-csrf-token": "" },
  );
  expect(noCsrf.status).toBe(403);
  expect(noCsrf.data.code).toBe("CSRF");

  // Ningún payload retirado mantiene su 422: la ruta se retiró antes de validar.
  const invalidFingerprint = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: "no-es-un-fingerprint" },
    { "idempotency-key": randomUUID() },
  );
  expectRetirada(invalidFingerprint, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  const missingKey = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: "0".repeat(64) },
  );
  expectRetirada(missingKey, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });

  const missingPhoto = await f.request("/api/cierres/1/foto");
  expectRetirada(missingPhoto, {
    code: "FOTO_RETIRADA",
    sustituto: "/api/cierres/1/estado",
  });
  const invalidVersion = await f.request("/api/cierres/1/foto?version=0");
  expectRetirada(invalidVersion, {
    code: "FOTO_RETIRADA",
    sustituto: "/api/cierres/1/estado",
  });

  // Sin `allow`: el 410 no anuncia un método alternativo porque la ruta no existe.
  const wrongPreflight = await f.request("/api/cierres/1/preflight", "POST", {});
  expectRetirada(wrongPreflight, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(wrongPreflight.headers.get("allow")).toBeNull();
  const wrongClose = await f.request("/api/cierres/1/cerrar");
  expectRetirada(wrongClose, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(wrongClose.headers.get("allow")).toBeNull();

  const reabrir = await f.request("/api/cierres/1/reabrir", "POST", {});
  expectRetirada(reabrir, {
    code: "REAPERTURA_RETIRADA",
    sustituto: "/api/cierres/1/estado",
  });
  const periodos = await f.request("/api/fotos/periodos");
  expectRetirada(periodos, { code: "FOTOS_RETIRADAS", sustituto: null });

  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: los bloqueos de preflight ya no se publican y no hay escritura que bloquear", async () => {
  // Sustituye el preflight 200 con bloqueos SIN_SIGUIENTE_INICIO/E35/BACKUP y el 409 del cierre: retirados por SPEC38 §7.6.
  const f = fixture(
    validOptions({
      e35: { verificable: false, motivo: "E3.5 fixture no verificable" },
      backup: null,
    }),
  );
  await f.enroll();
  const before = snapshot(f.db);
  const pre = await f.request("/api/cierres/3/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/3/estado",
  });
  expect(pre.data).not.toHaveProperty("bloqueos");
  expect(pre.data).not.toHaveProperty("ventana");
  expect(f.db.query("SELECT COUNT(*) n FROM cierres").get()).toEqual({ n: 0 });
  const close = await f.request(
    "/api/cierres/3/cerrar",
    "POST",
    { fingerprint: "0".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expectRetirada(close, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/3/estado",
  });
  expect(f.db.query("SELECT COUNT(*) n FROM cierres").get()).toEqual({ n: 0 });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: SinPlan no crea cierre, foto ni auditoría porque las rutas responden 410", async () => {
  // Sustituye el cierre 201 con foto v1, metadatos app/schema y alias /cierre: retirados por SPEC38 §7.6.
  const f = fixture();
  await f.enroll();
  const before = snapshot(f.db);
  const { pre, result } = await f.retiradaCierre("1");
  expect(pre.data).not.toHaveProperty("plan");
  expect(result.data).not.toHaveProperty("foto");

  const state = await f.request("/api/cierres/1/estado");
  expect(state.status).toBe(200);
  // E4.8 compatibility: top-level fields remain those of getPrecierreEstado.
  expect(state.data.ciclo).toBe("1");
  expect(state.data.revision).toMatch(/^[a-f0-9]{64}$/);
  expect(state.data).toHaveProperty("bloqueos");
  // §5: `e4_9Bloqueado` y el bloque `cierre` dejaron de ser autoridad.
  expect(state.data).not.toHaveProperty("e4_9Bloqueado");
  expect(state.data).not.toHaveProperty("cierre");
  expect(state.data.validacion.estado).toBe("SinValidar");

  const alias = await f.request("/api/cierres/1/cierre");
  expectRetirada(alias, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  const photo = await f.request("/api/cierres/1/foto");
  expectRetirada(photo, {
    code: "FOTO_RETIRADA",
    sustituto: "/api/cierres/1/estado",
  });

  expect(snapshot(f.db)).toEqual(before);
  expect(f.db.query("SELECT COUNT(*) n FROM cierre_audit").get()).toEqual({ n: 0 });
  expect(f.db.query("SELECT COUNT(*) n FROM fotos_cierre").get()).toEqual({ n: 0 });
});

test("[retirada] E4.9 B: PlanNoVerificable ya no bloquea una foto inexistente: preflight y cerrar responden 410", async () => {
  // Sustituye el bloqueo 200/409 con `PLAN_NO_VERIFICABLE`: el bloqueo se retiró con la ruta (SPEC38 §7.6).
  const f = fixture();
  planNoVerificable(f.db);
  await f.enroll();
  const before = snapshot(f.db);
  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(pre.data).not.toHaveProperty("plan");
  const close = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: "0".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expectRetirada(close, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(f.db.query("SELECT COUNT(*) n FROM fotos_cierre").get()).toEqual({
    n: 0,
  });
  expect(f.db.query("SELECT COUNT(*) n FROM cierres").get()).toEqual({ n: 0 });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: el plan capturado ya no se congela en foto; la lectura viva lo refleja", async () => {
  // Sustituye la foto v1 con `plan.estado=Capturado` y sus líneas finales: retirada por SPEC38 §7.6.
  const f = fixture();
  capturedPlan(f.db);
  await f.enroll();
  const before = snapshot(f.db);
  const { pre, result } = await f.retiradaCierre("1");
  expect(pre.data).not.toHaveProperty("plan");
  expect(result.data).not.toHaveProperty("foto");

  // La lectura viva (precierre) sigue leyendo el mismo plan capturado.
  const vivo = await f.request("/api/cierres/precierre/1");
  expect(vivo.status).toBe(200);
  expect(vivo.data.plan.estado).toBe("PlanVerificado");

  const photo = await f.request("/api/cierres/1/foto");
  expectRetirada(photo, {
    code: "FOTO_RETIRADA",
    sustituto: "/api/cierres/1/estado",
  });
  expect(f.db.query("SELECT COUNT(*) n FROM cycle_plan_lines").get()).toEqual({
    n: 1,
  });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: la idempotencia del cierre ya no existe: toda clave responde 410 sin intento registrado", async () => {
  // Sustituye replay 201, `replayed`, `IDEMPOTENCY_CONFLICT` y `ALREADY_CLOSED`: retirados por SPEC38 §7.6.
  const f = fixture();
  await f.enroll();
  const before = snapshot(f.db);
  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  const key = randomUUID();
  const body = { fingerprint: "0".repeat(64), motivo: "Cierre ficticio" };
  const first = await f.request("/api/cierres/1/cerrar", "POST", body, {
    "idempotency-key": key,
  });
  expectRetirada(first, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  const replay = await f.request("/api/cierres/1/cerrar", "POST", body, {
    "idempotency-key": key,
  });
  expectRetirada(replay, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(first.data).not.toHaveProperty("replayed");

  const changed = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { ...body, motivo: "Otro motivo" },
    { "idempotency-key": key },
  );
  expectRetirada(changed, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });

  const double = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    body,
    { "idempotency-key": randomUUID() },
  );
  expectRetirada(double, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });

  // Una revisión que cambia entre "preview" y "confirm" tampoco altera la respuesta.
  const stale = fixture();
  await stale.enroll();
  const staleBefore = snapshot(stale.db);
  const stalePre = await stale.request("/api/cierres/1/preflight");
  expectRetirada(stalePre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
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
    { fingerprint: stalePre.data.sustituto },
    { "idempotency-key": randomUUID() },
  );
  expectRetirada(staleClose, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(
    stale.db.query("SELECT COUNT(*) n FROM cierre_attempts").get(),
  ).toEqual({ n: 0 });
  expect(snapshot(stale.db)).toEqual(staleBefore);

  expect(
    f.db.query("SELECT COUNT(*) n FROM cierre_attempts").get(),
  ).toEqual({ n: 0 });
  expect(f.db.query("SELECT COUNT(*) n FROM fotos_cierre").get()).toEqual({
    n: 0,
  });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: AC-13 sin cierre no hay reapertura ni v2 porque cada ruta responde 410", async () => {
  // Sustituye el cierre v1, el 409 `ALREADY_CLOSED` y el 404 de `foto?version=2`: retirados por SPEC38 §7.6.
  const f = fixture();
  await f.enroll();
  const before = snapshot(f.db);
  await f.retiradaCierre("1");
  await f.retiradaCierre("1");
  const reapertura = await f.request("/api/cierres/1/reapertura", "POST", {
    motivo: "Reintento ordinario",
  });
  expectRetirada(reapertura, {
    code: "REAPERTURA_RETIRADA",
    sustituto: "/api/cierres/1/estado",
  });
  const cancelar = await f.request("/api/cierres/1/reapertura/cancelar", "POST");
  expectRetirada(cancelar, {
    code: "REAPERTURA_RETIRADA",
    sustituto: "/api/cierres/1/estado",
  });
  expect(
    f.db.query("SELECT COUNT(*) n FROM cierres WHERE ciclo='1'").get(),
  ).toEqual({ n: 0 });
  expect(
    f.db.query("SELECT version FROM cierres WHERE ciclo='1'").get(),
  ).toBeNull();
  const v2 = await f.request("/api/cierres/1/foto?version=2");
  expectRetirada(v2, {
    code: "FOTO_RETIRADA",
    sustituto: "/api/cierres/1/estado",
  });
  expect(snapshot(f.db)).toEqual(before);
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

test("[retirada] E4.9 B: el cierre fuera de orden ya no exige motivo ni deja auditoría ni foto posterior", async () => {
  // Sustituye el 422 `MOTIVO_REQUERIDO`, la auditoría `cierre_fuera_de_orden` y la foto posterior: retirados por SPEC38 §7.6.
  const f = fixture();
  await f.enroll();
  const before = snapshot(f.db);
  const later = await f.retiradaCierre("2");
  expect(later.result.data).not.toHaveProperty("cierre");

  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(pre.data).not.toHaveProperty("coherencia");
  expect(pre.data).not.toHaveProperty("avisos");

  const noMotive = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: "0".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expectRetirada(noMotive, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });

  const closed = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: "0".repeat(64), motivo: "Cierre tardío ficticio" },
    { "idempotency-key": randomUUID() },
  );
  expectRetirada(closed, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });

  expect(f.db.query("SELECT COUNT(*) n FROM cierre_audit").get()).toEqual({
    n: 0,
  });
  expect(
    f.db.query("SELECT COUNT(*) n FROM fotos_cierre WHERE ciclo='2'").get(),
  ).toEqual({ n: 0 });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: AC-20 la contradicción con cierre posterior ya no se evalúa: preflight y cerrar responden 410", async () => {
  // Sustituye el 409 `INCOHERENCIA_CON_CIERRE_POSTERIOR` y la comparación de coherencia: retirados por SPEC38 §7.6.
  const f = fixture();
  await f.enroll();
  await f.retiradaCierre("2");
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
  const beforeCierre = snapshot(f.db);
  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(pre.data).not.toHaveProperty("coherencia");
  const close = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: "0".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expectRetirada(close, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(
    f.db.query("SELECT COUNT(*) n FROM cierres WHERE ciclo='1'").get(),
  ).toEqual({ n: 0 });
  expect(snapshot(f.db)).toEqual(beforeCierre);
});

test("[retirada] E4.9 B: las posiciones heredadas a Fin ya no se fotografían: cerrar y foto responden 410", async () => {
  // Sustituye la foto con posiciones/efectivo a Fin y operaciones excluidas: retirada por SPEC38 §7.6.
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
  const before = snapshot(f.db);
  const { result } = await f.retiradaCierre("1");
  expect(result.data).not.toHaveProperty("foto");
  const photo = await f.request("/api/cierres/1/foto");
  expectRetirada(photo, {
    code: "FOTO_RETIRADA",
    sustituto: "/api/cierres/1/estado",
  });
  expect(
    f.db.query("SELECT COUNT(*) n FROM operaciones_inversion").get(),
  ).toEqual({ n: 2 });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: AC-16 el corte en Fin ya no se captura en foto: cerrar y foto responden 410", async () => {
  // Sustituye la foto con `ventana.fin`, efectivo y operaciones al corte: retirada por SPEC38 §7.6.
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
      nombre: "Fondo de corte ficticio E4.9",
      isin: "ES0000000555",
      isinEvidencia: "Evidencia ficticia E4.9",
      divisaReferencia: "EUR",
    },
    randomUUID(),
    now,
  ).instrumento.id;
  performanceOperation(f.db, instrumento, {
    id: "9301",
    clase: "Compra",
    fecha: "2026-01-31",
    cantidad: "100000000",
    precio: "10000000",
    importe: 1000,
  });
  performanceOperation(f.db, instrumento, {
    id: "9302",
    clase: "Compra",
    fecha: "2026-02-01",
    cantidad: "100000000",
    precio: "20000000",
    importe: 2000,
  });
  await f.enroll();
  const before = snapshot(f.db);
  const { result } = await f.retiradaCierre("1");
  expect(result.data).not.toHaveProperty("foto");
  const photo = await f.request("/api/cierres/1/foto");
  expectRetirada(photo, {
    code: "FOTO_RETIRADA",
    sustituto: "/api/cierres/1/estado",
  });
  expect(
    f.db.query("SELECT COUNT(*) n FROM operaciones_inversion").get(),
  ).toEqual({ n: 2 });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: sin foto inmutable no hay recálculo que comparar: la foto responde 410 antes y después", async () => {
  // Sustituye la foto congelada que no se recalcula tras cambios vivos: retirada por SPEC38 §7.6.
  const f = fixture();
  await f.enroll();
  const before = snapshot(f.db);
  await f.retiradaCierre("1");
  const first = await f.request("/api/cierres/1/foto");
  expectRetirada(first, {
    code: "FOTO_RETIRADA",
    sustituto: "/api/cierres/1/estado",
  });
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
  expectRetirada(after, {
    code: "FOTO_RETIRADA",
    sustituto: "/api/cierres/1/estado",
  });
  expect(after.data.code).toBe(first.data.code);
  expect(after.data.sustituto).toBe(first.data.sustituto);
  expect(after.data.requestId).not.toBe(first.data.requestId);
  expect(snapshot(f.db)).toEqual(before);
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

test("[retirada] E4.9 B: AC-20 el preview ya no caduca contra un cierre posterior: cerrar responde 410", async () => {
  // Sustituye el 409 `REVISION_CONFLICT` por fingerprint caducado: retirado por SPEC38 §7.6.
  const f = fixture();
  await f.enroll();
  // Un ciclo nuevo entre "preview" y "confirm" ya no puede construirse: no hay cierre.
  f.db.run(
    "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('4','2026-04-01',10000,'2026-01-01T00:00:00.000Z')",
  );
  const before = snapshot(f.db);
  await f.retiradaCierre("2");

  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(pre.data).not.toHaveProperty("coherencia");

  await f.retiradaCierre("3");

  const stale = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: "0".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expectRetirada(stale, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(
    f.db.query("SELECT COUNT(*) n FROM cierres WHERE ciclo='1'").get(),
  ).toEqual({ n: 0 });
  expect(
    f.db.query("SELECT COUNT(*) n FROM fotos_cierre WHERE ciclo='1'").get(),
  ).toEqual({ n: 0 });
  expect(f.db.query("SELECT COUNT(*) n FROM cierres").get()).toEqual({ n: 0 });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: el proveedor E3.5 por defecto ya no desbloquea un cierre retirado", async () => {
  // Sustituye el preflight 200 con `e35.verificable=true` y `e49Bloqueado=false`: retirado por SPEC38 §7.6.
  const f = fixture(validOptions({ e35: undefined }));
  verifiableRegimen(f.db);
  await f.enroll();
  const before = snapshot(f.db);
  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(pre.data).not.toHaveProperty("e35");
  // El proveedor por defecto sigue vivo en la lectura viva, sin aviso de E3.5.
  const vivo = await f.request("/api/cierres/precierre/1");
  expect(vivo.status).toBe(200);
  expect(
    vivo.data.fuentes.find((fuente: { key: string }) => fuente.key === "e35")
      .estado,
  ).toBe("Verificado");
  expect(
    vivo.data.avisos.map((aviso: { code: string }) => aviso.code),
  ).not.toContain("E35_NO_VERIFICABLE");
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: los hechos con movimientos ya no se capturan: cerrar responde 410 y la lectura viva los ve", async () => {
  // Sustituye la foto con `hechos.estado=Con hechos` y totales de ingresos: retirada por SPEC38 §7.6.
  const f = fixture();
  januaryMovement(f.db);
  await f.enroll();
  const before = snapshot(f.db);
  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(pre.data).not.toHaveProperty("hechos");
  const vivo = await f.request("/api/cierres/precierre/1");
  expect(
    vivo.data.fuentes.find(
      (fuente: { key: string }) => fuente.key === "movimientos",
    ),
  ).toMatchObject({ cobertura: "1 hechos", estado: "Verificado" });
  const { result } = await f.retiradaCierre("1");
  expect(result.data).not.toHaveProperty("foto");
  expect(f.db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual({
    n: 1,
  });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: AC-21 una operación nueva ya no se captura como hecho en foto", async () => {
  // Sustituye la foto con `hechos.estado=Con hechos`, movimientos vacíos y una posición: retirada por SPEC38 §7.6.
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
      nombre: "Fondo con hecho ficticio E4.9",
      isin: "ES0000000444",
      isinEvidencia: "Evidencia ficticia E4.9",
      divisaReferencia: "EUR",
    },
    randomUUID(),
    now,
  ).instrumento.id;
  performanceOperation(f.db, instrumento, {
    id: "9201",
    clase: "Compra",
    fecha: "2026-01-10",
    cantidad: "100000000",
    precio: "10000000",
    importe: 1000,
  });
  await f.enroll();
  const before = snapshot(f.db);
  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  const { result } = await f.retiradaCierre("1");
  expect(result.data).not.toHaveProperty("foto");
  expect(
    f.db.query("SELECT COUNT(*) n FROM operaciones_inversion").get(),
  ).toEqual({ n: 1 });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: el maestro de Deuda ya no se captura en hechos de foto", async () => {
  // Sustituye la foto con `hechos.estado=Sin hechos` y `auxiliares.deuda`: retirada por SPEC38 §7.6.
  const f = fixture();
  seedDeuda(f.db);
  await f.enroll();
  const before = snapshot(f.db);
  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(pre.data).not.toHaveProperty("hechos");
  const { result } = await f.retiradaCierre("1");
  expect(result.data).not.toHaveProperty("foto");
  expect(f.db.query("SELECT COUNT(*) n FROM deudas").get()).toEqual({ n: 1 });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: S0 cero ya no se congela en una foto: cerrar responde 410", async () => {
  // Sustituye la foto con `ventana.saldoInicial="0.00"` y `Sin hechos`: retirada por SPEC38 §7.6.
  const f = fixture();
  f.db.run(
    `INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES
       ('4','2026-04-01',0,'2026-01-01T00:00:00.000Z'),
       ('5','2026-05-01',10000,'2026-01-01T00:00:00.000Z')`,
  );
  await f.enroll();
  const before = snapshot(f.db);
  const { result } = await f.retiradaCierre("4");
  expect(result.data).not.toHaveProperty("foto");
  expect(f.db.query("SELECT COUNT(*) n FROM ciclos").get()).toEqual({ n: 5 });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: AC-15 Anticipos sigue Parcial en la lectura viva, ya sin foto", async () => {
  // Sustituye la foto con `auxiliares.anticipos` y la cobertura `AC36 PARCIAL`: retirada por SPEC38 §7.6.
  const f = fixture();
  januaryMovement(f.db);
  seedAnticipo(f.db);
  await f.enroll();
  const before = snapshot(f.db);
  const vivo = await f.request("/api/cierres/precierre/1");
  expect(
    vivo.data.fuentes.find(
      (fuente: { key: string }) => fuente.key === "anticipos",
    ),
  ).toMatchObject({ cobertura: "1 hechos", estado: "Parcial" });
  const { result } = await f.retiradaCierre("1");
  expect(result.data).not.toHaveProperty("foto");
  expect(f.db.query("SELECT COUNT(*) n FROM movimiento_anticipo").get()).toEqual({
    n: 1,
  });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: el backup sin restauración probada ya no bloquea porque la ruta responde 410", async () => {
  // Sustituye el preflight 200 con `BACKUP_NO_VERIFICABLE` y el 409 del cierre: retirados por SPEC38 §7.6.
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
  const before = snapshot(f.db);
  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(pre.data).not.toHaveProperty("bloqueos");
  const close = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: "0".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expectRetirada(close, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(f.db.query("SELECT COUNT(*) n FROM cierres").get()).toEqual({ n: 0 });
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: E4.1 no disponible ya no bloquea un preflight que responde 410", async () => {
  // Sustituye el bloqueo `E4_1_NO_DISPONIBLE` y `inversion.efectivo=null` del preflight: retirados por SPEC38 §7.6.
  const f = fixture();
  f.db.run(
    "UPDATE saldos SET tipo='Exterior', control='Exterior' WHERE control='Inversiones'",
  );
  await f.enroll();
  const before = snapshot(f.db);
  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(pre.data).not.toHaveProperty("inversion");
  expect(pre.data).not.toHaveProperty("bloqueos");
  expect(snapshot(f.db)).toEqual(before);
});

test("[retirada] E4.9 B: una tabla Deuda ausente ya no produce FUENTE_NO_LEGIBLE en el cierre retirado", async () => {
  // Sustituye el bloqueo `FUENTE_NO_LEGIBLE` y la cobertura `No disponible`: retirados por SPEC38 §7.6.
  const f = fixture();
  f.db.run("ALTER TABLE deudas RENAME TO deudas_off");
  await f.enroll();
  const before = snapshot(f.db);
  expect(before.deudas).toBe("ausente");
  const pre = await f.request("/api/cierres/1/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(pre.data).not.toHaveProperty("bloqueos");
  const close = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: "0".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expectRetirada(close, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/1/estado",
  });
  expect(f.db.query("SELECT COUNT(*) n FROM fotos_cierre").get()).toEqual({
    n: 0,
  });
  expect(snapshot(f.db)).toEqual(before);
});

test("E4.9 B: documented precierre endpoint never reports Listo con avisos while blocked", async () => {
  const f = fixture();
  await f.enroll();
  const pre = await f.request("/api/cierres/precierre/1");
  expect(pre.status).toBe(200);
  expect(pre.headers.get("cache-control")).toBe("no-store");
  expect(pre.data.ciclo.id).toBe("1");
  // SPEC38 §5 retiró `e4_9Bloqueado`: `estado` y `bloqueos` son la autoridad
  // vigente; sin bloqueos, "Listo con avisos" no contradice nada.
  expect(pre.data).not.toHaveProperty("e4_9Bloqueado");
  expect(pre.data.bloqueos).toEqual([]);
  expect(
    pre.data.estado === "Listo con avisos" && pre.data.bloqueos.length > 0,
  ).toBe(false);
  expect(
    pre.data.fuentes.map((source: { key: string }) => source.key),
  ).toEqual(expect.arrayContaining(["e35", "e42", "e44", "e36"]));
});

test("[retirada] E4.9 B: el 422 motivado de S0 fuera de rango ya no se alcanza: preflight responde 410", async () => {
  // Sustituye el 422 `S0_FUERA_DE_RANGO` con `fields.saldoInicialComida`: retirado por SPEC38 §7.6.
  const f = fixture();
  f.db.run(
    `INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES
       ('4','2026-04-01',9007199254740992,'2026-01-01T00:00:00.000Z'),
       ('5','2026-05-01',10000,'2026-01-01T00:00:00.000Z')`,
  );
  await f.enroll();
  const before = snapshot(f.db);
  const pre = await f.request("/api/cierres/4/preflight");
  expectRetirada(pre, {
    code: "CIERRE_FOTOGRAFICO_RETIRADO",
    sustituto: "/api/cierres/4/estado",
  });
  expect(pre.data).not.toHaveProperty("saldoInicialComida");
  expect(pre.data.fields).toEqual({});
  expect(f.db.query("SELECT COUNT(*) n FROM cierres").get()).toEqual({ n: 0 });
  expect(snapshot(f.db)).toEqual(before);
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