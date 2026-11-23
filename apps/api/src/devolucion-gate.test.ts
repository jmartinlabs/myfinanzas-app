import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { HttpApp } from "@effect/platform";
import { openDatabase } from "./database";
import { createSaldo } from "./saldos";
import { createClassification } from "./clasificacion";
import { createCycle, cycleContext } from "./ciclos";
import { previewMovement, writeMovement } from "./movimientos";
import { writeComidaDevolucion } from "./comida";
import { createRevisionComida } from "./revision-comida";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { financeRevision } from "./movement-ledger";
import {
  DEVOLUCION_G1,
  devolucionIntegracionDisponible,
  esEscrituraDevolucion,
  exigirEscrituraDevolucion,
  gateProduccion,
} from "./devolucion-gate";
import { opcionesProduccion } from "./composicion-produccion";
import { gateAbiertoParaPruebas } from "../test-support/devolucion-gate-abierto";

/**
 * #572 · F2g de #538 · gate de exposición 503 de las escrituras de devolución.
 * Datos ficticios, SQLite en memoria. El gate se abre solo por inyección en la
 * raíz de composición de la prueba; la producción lo recibe como `false`.
 */
const now = Date.parse("2026-10-21T12:00:00Z");
const origin = "http://127.0.0.1:5173";
process.env.NODE_ENV = "test";

function setup() {
  const db = openDatabase(":memory:");
  const cat = createClassification(
    db,
    "categorias",
    { nombre: "Gastos ficticios", anual: "Gasto", mensual: "Gasto", referencia: false },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Subcategoría ficticia", padre: cat.id },
    randomUUID(),
  );
  db.run(
    "INSERT INTO presupuestos VALUES('PRE900','Plan ficticio','Gasto real','S001','Activo',1,'f','f')",
  );
  const food = createClassification(
    db,
    "partidas",
    { nombre: "Supermercado ficticio", padre: sub.id, presupuesto: "PRE900" },
    randomUUID(),
  );
  const mk = (nombre: string, apertura: string) =>
    createSaldo(
      db,
      {
        nombre,
        tipo: "Efectivo",
        control: "Movimientos",
        saldoApertura: apertura,
        fechaApertura: "2026-01-01",
        permiteSalidaExterior: true,
      },
      randomUUID(),
      now,
    );
  const account = mk("Cuenta ficticia", "5000");
  const other = mk("Otra cuenta ficticia", "100");
  const cycle1 = createCycle(
    db,
    { inicio: "2026-06-20", saldoInicialComida: "0", contextRevision: cycleContext(db).revision },
    randomUUID(),
    now,
  ).ciclo;
  return { db, food, account, other, cycle1 };
}
type Ctx = ReturnType<typeof setup>;

/** Escritura de SIEMBRA con el gate abierto inyectado (nunca por la app). */
function seed(db: Database, body: Record<string, unknown>) {
  const plan = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    randomUUID(),
    null,
    false,
    now,
    undefined,
    gateAbiertoParaPruebas,
  );
}
function gasto(c: Ctx, importe = "120", over: Record<string, unknown> = {}) {
  return seed(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-05",
    importe,
    saldo: c.account.id,
    partida: c.food.id,
    concepto: "Compra ficticia",
    nota: "",
    ...over,
  }).movimiento;
}
function devolucionBody(c: Ctx, compra: string, importe = "30") {
  return {
    tipo: "Devolución de gasto",
    fecha: "2026-08-10",
    importe,
    saldo: c.other.id,
    concepto: "Devolución ficticia",
    nota: "",
    devolucion: {
      estado: "Verificado",
      compra,
      evidenciaRelacion: "Evidencia ficticia",
      elegibilidad: "Acreditada",
      cicloOrigen: c.cycle1.id,
      evidenciaOrigenTemporal: "Documento ficticio",
    },
  };
}
function atribucion(w: { compraLibre: { id: string }; cycle1: { id: string } }) {
  return {
    revision: 1,
    compra: w.compraLibre.id,
    estado: "Verificado",
    elegibilidad: "Acreditada",
    cicloOrigen: w.cycle1.id,
    evidenciaRelacion: "Evidencia ficticia",
    evidenciaOrigenTemporal: "Documento ficticio",
  };
}
function world() {
  const c = setup();
  const compraVinculada = gasto(c, "120");
  const dev = seed(c.db, devolucionBody(c, compraVinculada.id)).movimiento;
  const compraLibre = gasto(c, "50", { concepto: "Compra libre ficticia" });
  const huerfana = seed(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-08-11",
    importe: "9",
    saldo: c.other.id,
    concepto: "Huérfana ficticia",
    nota: "",
  }).movimiento;
  return { ...c, compraVinculada, dev, compraLibre, huerfana };
}
type World = ReturnType<typeof world>;

/** Huella completa de todas las tablas (attempts, auditoría, contadores, dirty, ...). */
function huella(db: Database) {
  const tables = (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { name: string }[]
  ).map((t) => t.name);
  return JSON.stringify([
    financeRevision(db),
    tables.map((t) => [t, db.query(`SELECT * FROM "${t}"`).all()]),
  ]);
}

/** Cliente HTTP con sesión compartida entre apps que usan la misma BD y clave. */
function http(db: Database, key: Buffer, jar: { cookie: string; csrf: string }, gate?: unknown) {
  const handler = HttpApp.toWebHandler(
    createApp(db, {
      key,
      now: () => now,
      ...(gate ? { devolucionGate: gate as typeof gateProduccion } : {}),
    }),
  );
  async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const response = await handler(
      new Request(origin + path, {
        method,
        headers: {
          origin,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          cookie: jar.cookie,
          "x-csrf-token": jar.csrf,
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      jar.cookie = jar.cookie
        .split("; ")
        .filter((p) => p && !p.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = await response.json();
    if (data.csrf) jar.csrf = data.csrf;
    return { status: response.status, data, headers: response.headers };
  }
  const post = (path: string, body: unknown, idem = randomUUID(), headers = {}) =>
    call("POST", path, body, { "idempotency-key": idem, ...headers });
  return { call, post, get: (p: string) => call("GET", p) };
}
async function session(db: Database, key: Buffer) {
  const jar = { cookie: "", csrf: "" };
  const boot = http(db, key, jar);
  const enrolled = await boot.call("POST", "/api/auth/enroll", {
    token: provision(db, now),
    password: "Pruebas ficticias Gate " + randomUUID(),
  });
  await boot.call("POST", "/api/auth/mfa", {
    code: totp(enrolled.data.secret).generate({ timestamp: now }),
  });
  return jar;
}
async function harness() {
  const w = world();
  const key = randomBytes(32);
  const jar = await session(w.db, key);
  return {
    w,
    jar,
    cerrada: http(w.db, key, jar),
    abierta: http(w.db, key, jar, gateAbiertoParaPruebas),
  };
}
type H = Awaited<ReturnType<typeof harness>>;

function es503(r: { status: number; data: any }) {
  expect(r.status).toBe(503);
  expect(r.data.code).toBe("DEVOLUTION_INTEGRATION_UNAVAILABLE");
  expect(r.data.error).toBe(DEVOLUCION_G1);
}
async function sinEfectos(h: H, run: () => Promise<{ status: number; data: any }>) {
  const antes = huella(h.w.db);
  es503(await run());
  expect(huella(h.w.db)).toBe(antes);
}
async function bodyRect(h: H, id: string, cambios: Record<string, unknown>) {
  const fila = h.w.db.query("SELECT * FROM movimientos WHERE id=?").get(id) as any;
  const base: Record<string, unknown> = {
    tipo: fila.tipo,
    fecha: fila.fecha,
    importe: String(Number(fila.importe) / 100),
    concepto: fila.concepto,
    nota: fila.nota,
    ...(fila.tipo === "Gasto" ? { saldo: fila.origen, partida: fila.partida } : { saldo: fila.destino }),
    revision: fila.revision,
    motivo: "Motivo ficticio",
    ...cambios,
  };
  const plan = previewMovement(h.w.db, base, id, false, now);
  return { ...base, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision };
}

// ---------------------------------------------------------------- F2G-AC-01

test("F2G-AC-01: la constante de servidor es el literal false y no se lee de ningún sitio", () => {
  expect(devolucionIntegracionDisponible).toBe(false);
  expect(gateProduccion.disponible).toBe(false);
  expect(Object.isFrozen(gateProduccion)).toBe(true);
  const fuente = readFileSync(join(import.meta.dir, "devolucion-gate.ts"), "utf8");
  expect(fuente).toMatch(/export const devolucionIntegracionDisponible = false;/);
  // Ni entorno, ni cabeceras, ni ficheros, ni base de datos al declarar el literal.
  const sinComentarios = fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const prohibido of ["process.env", "Bun.env", "import.meta.env", "readFile", "headers", "searchParams"])
    expect(sinComentarios).not.toContain(prohibido);
});

test("F2G-AC-01b: ningún módulo de producción importa el gate abierto ni inyecta devolucionGate", () => {
  const dir = import.meta.dir;
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
    const texto = readFileSync(join(dir, archivo), "utf8");
    expect(texto).not.toContain("devolucion-gate-abierto");
    expect(texto).not.toContain("gateAbiertoParaPruebas");
    // Solo la raíz `app.ts` (que lo consume) puede nombrar la opción.
    if (!["app.ts", "devolucion-gate.ts"].includes(archivo))
      expect(texto).not.toMatch(/devolucionGate\s*[:=]\s*(?!options)/);
  }
  const main = readFileSync(join(dir, "main.ts"), "utf8");
  expect(main).toContain("opcionesProduccion(");
  expect(main).not.toContain("devolucionGate");
});

test("F2G-AC-01c: la composición de producción (rama normal y DEMO) no pasa devolucionGate y queda cerrada con entorno, cabecera y query hostiles", async () => {
  const guardado = { ...process.env };
  try {
    for (const nombre of [
      "DEVOLUCION_INTEGRACION_DISPONIBLE",
      "DEVOLUTION_INTEGRATION_AVAILABLE",
      "DEVOLUCION_GATE",
      "DEVOLUCION_GATE_ABIERTO",
    ])
      process.env[nombre] = "true";
    const key = randomBytes(32);
    const normal = opcionesProduccion({ key, origin });
    const demo = opcionesProduccion({ key, origin, demo: { origins: [origin] } as never });
    for (const opciones of [normal, demo]) {
      expect("devolucionGate" in opciones).toBe(false);
      expect(Object.keys(opciones).sort()).toEqual(
        Object.keys(opciones).includes("demo") ? ["demo", "key", "origin"] : ["key", "origin"],
      );
    }
    // La composición normal, con la BD ficticia y su sesión, rechaza y declara cerrado.
    const w = world();
    const jar = await session(w.db, key);
    const app = HttpApp.toWebHandler(createApp(w.db, { ...normal, now: () => now }));
    const peticion = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
      app(
        new Request(origin + path, {
          method,
          headers: {
            origin,
            "content-type": "application/json",
            cookie: jar.cookie,
            "x-csrf-token": jar.csrf,
            ...headers,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
    for (const trampa of [
      "/api/devoluciones/capacidad",
      "/api/devoluciones/capacidad?disponible=true&gate=open",
    ]) {
      const r = await peticion("GET", trampa, undefined, {
        "x-devolucion-gate": "open",
        "x-devolution-integration-available": "true",
      });
      expect(await r.json()).toEqual({ disponible: false });
    }
    const antes = huella(w.db);
    const escritura = await peticion(
      "POST",
      "/api/movimientos?gate=open&devolucionGate=true",
      { ...devolucionBody(w, w.compraLibre.id), devolucionGate: { disponible: true }, disponible: true },
      { "idempotency-key": randomUUID(), "x-devolucion-gate": "open" },
    );
    expect(escritura.status).toBe(503);
    expect((await escritura.json()).code).toBe("DEVOLUTION_INTEGRATION_UNAVAILABLE");
    expect(huella(w.db)).toBe(antes);
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in guardado)) delete process.env[k];
    Object.assign(process.env, guardado);
  }
});

// ---------------------------------------------------------------- F2G-AC-02

test("F2G-AC-02: createApp sin gate inyectado queda cerrado y la capacidad es 401 sin sesión, no-store y {disponible:false}", async () => {
  const w = world();
  const key = randomBytes(32);
  const sinSesion = http(w.db, key, { cookie: "", csrf: "" });
  expect((await sinSesion.get("/api/devoluciones/capacidad")).status).toBe(401);
  const jar = await session(w.db, key);
  const cerrada = http(w.db, key, jar);
  const r = await cerrada.get("/api/devoluciones/capacidad");
  expect(r.status).toBe(200);
  expect(r.data).toEqual({ disponible: false });
  expect(r.headers.get("cache-control")).toBe("no-store");
  // El MISMO valor efectivo que reciben los servicios: abierto solo por inyección.
  const abierta = http(w.db, key, jar, gateAbiertoParaPruebas);
  expect((await abierta.get("/api/devoluciones/capacidad")).data).toEqual({ disponible: true });
  // Una lectura no escribe.
  const antes = huella(w.db);
  await cerrada.get("/api/devoluciones/capacidad");
  expect(huella(w.db)).toBe(antes);
});

test("F2G-AC-02b: la autenticación precede al gate (401 sin sesión, no 503)", async () => {
  const w = world();
  const sinSesion = http(w.db, randomBytes(32), { cookie: "", csrf: "" });
  const antes = huella(w.db);
  const r = await sinSesion.post("/api/movimientos", devolucionBody(w, w.compraLibre.id));
  expect(r.status).toBe(401);
  expect((await sinSesion.post(`/api/comida/${w.dev.id}/devolucion`, {})).status).toBe(401);
  expect(huella(w.db)).toBe(antes);
});

// ---------------------------------------------------------------- F2G-AC-03

test("F2G-AC-03: cada clasificación de escritura de devolución devuelve 503 sin efectos con el gate cerrado", async () => {
  const h = await harness();
  const { w, cerrada } = h;
  // Alta de «Devolución de gasto» (con y sin bloque de atribución).
  await sinEfectos(h, () => cerrada.post("/api/movimientos", devolucionBody(w, w.compraLibre.id)));
  await sinEfectos(h, () =>
    cerrada.post("/api/movimientos", {
      tipo: "Devolución de gasto", fecha: "2026-08-10", importe: "5", saldo: w.other.id, concepto: "x", nota: "",
    }),
  );
  // Petición con body.devolucion aunque el tipo sea otro (el gate va antes de la estructura).
  await sinEfectos(h, () =>
    cerrada.post("/api/movimientos", { tipo: "Gasto", devolucion: { estado: "Verificado" } }),
  );
  // Atribución / reatribución / rectificación por el recurso dedicado.
  await sinEfectos(h, () =>
    cerrada.post(`/api/comida/${w.huerfana.id}/devolucion`, { revision: 1, compra: w.compraLibre.id, estado: "Verificado" }),
  );
  await sinEfectos(h, () => cerrada.post(`/api/comida/${w.dev.id}/devolucion`, { revision: 1, estado: "Revisar" }));
  // Rectificar y anular una devolución por las rutas GENÉRICAS.
  await sinEfectos(h, async () =>
    cerrada.post(`/api/movimientos/${w.dev.id}/rectificar`, await bodyRect(h, w.dev.id, { importe: "31" })),
  );
  await sinEfectos(h, () =>
    cerrada.post(`/api/movimientos/${w.dev.id}/anular`, { revision: 1, motivo: "Motivo ficticio" }),
  );
  await sinEfectos(h, () =>
    cerrada.post(`/api/movimientos/${w.huerfana.id}/anular`, { revision: 1, motivo: "Motivo ficticio" }),
  );
  // Compra con vínculo vigente: rectificar y anular.
  await sinEfectos(h, async () =>
    cerrada.post(
      `/api/movimientos/${w.compraVinculada.id}/rectificar`,
      await bodyRect(h, w.compraVinculada.id, { importe: "130" }),
    ),
  );
  await sinEfectos(h, () =>
    cerrada.post(`/api/movimientos/${w.compraVinculada.id}/anular`, { revision: 1, motivo: "Motivo ficticio" }),
  );
  // Retipificar un Gasto sin vínculo a «Devolución de gasto».
  await sinEfectos(h, () =>
    cerrada.post(`/api/movimientos/${w.compraLibre.id}/rectificar`, {
      tipo: "Devolución de gasto", revision: 1, motivo: "x",
    }),
  );
  // Regularización de Compartidos: Transferencia HACIA S000 con bloque `compartido`.
  await sinEfectos(h, () =>
    cerrada.post("/api/movimientos", {
      tipo: "Transferencia", origen: w.account.id, destino: "S000", importe: "10", fecha: "2026-08-12",
      concepto: "Regularización ficticia", nota: "", compartido: { porciones: [{ tercero: "T001", importe: "10" }] },
    }),
  );
  await sinEfectos(h, () =>
    cerrada.post("/api/movimientos", {
      tipo: "Transferencia", origen: w.account.id, destino: "S000", importe: "10", porciones: [],
    }),
  );
  // Ruta legacy revision-comida con esDevolucion:true (alta, y rectificar/anular/vincular de una fila devolución).
  const legacy = {
    fecha: "2026-10-08", concepto: "Devolución legacy ficticia", importe: "12.00", direccion: "Entrada",
    esDevolucion: true, clasificacion: "Pendiente revisar", evidenciaBancaria: "op ficticia", cuentaOrigen: "Cuenta ficticia",
  };
  await sinEfectos(h, () => cerrada.post("/api/revision-comida", legacy));
  const fila = createRevisionComida(
    w.db, { ...legacy, evidenciaRelacionCompra: null }, randomUUID(), now, "Detalle", gateAbiertoParaPruebas,
  ).operacion;
  await sinEfectos(h, () =>
    cerrada.post(`/api/revision-comida/${fila.id}/rectificar`, { revision: 1, motivo: "x", concepto: "otro" }),
  );
  await sinEfectos(h, () => cerrada.post(`/api/revision-comida/${fila.id}/anular`, { revision: 1, motivo: "x" }));
  await sinEfectos(h, () =>
    cerrada.post(`/api/revision-comida/${fila.id}/vinculo`, { revision: 1, motivo: "x", desvincular: true }),
  );
  w.db.close();
});

test("F2G-AC-03b: el gate abierto inyectado sí ejecuta las mismas operaciones (el gate es la única causa del 503)", async () => {
  const h = await harness();
  const { w, abierta } = h;
  const body = devolucionBody(w, w.compraLibre.id, "20");
  const plan = previewMovement(w.db, body, null, false, now);
  const alta = await abierta.post("/api/movimientos", {
    ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision,
  });
  expect(alta.status).toBe(201);
  const rect = await abierta.post(
    `/api/movimientos/${w.dev.id}/rectificar`,
    await bodyRect(h, w.dev.id, { importe: "31" }),
  );
  expect(rect.status).toBe(200);
  const atribuida = await abierta.post(`/api/comida/${w.huerfana.id}/devolucion`, atribucion(w));
  expect(atribuida.status).toBe(200);
  w.db.close();
});

test("F2G-AC-03c: el servicio por defecto es CERRADO y la clasificación es única y de solo lectura", () => {
  const w = world();
  const antes = huella(w.db);
  const inexistente = { origen: "movimiento", body: { tipo: "Gasto" }, id: "99999", anular: true } as const;
  expect(esEscrituraDevolucion(w.db, inexistente)).toBe(false); // sigue hacia el 404 normal
  expect(esEscrituraDevolucion(w.db, { origen: "comida-devolucion" })).toBe(true);
  expect(esEscrituraDevolucion(w.db, { origen: "movimiento", body: { tipo: "Gasto" }, id: null, anular: false })).toBe(false);
  expect(
    esEscrituraDevolucion(w.db, { origen: "movimiento", body: { tipo: "Gasto" }, id: w.compraVinculada.id, anular: false }),
  ).toBe(true);
  expect(
    esEscrituraDevolucion(w.db, { origen: "movimiento", body: { tipo: "Gasto" }, id: w.compraLibre.id, anular: false }),
  ).toBe(false);
  // La aportación D5 (entrada desde S000) NO es regularización.
  expect(
    esEscrituraDevolucion(w.db, {
      origen: "movimiento", body: { tipo: "Transferencia", origen: "S000", destino: w.account.id, compartido: {} },
      id: null, anular: false,
    }),
  ).toBe(false);
  // Una Transferencia a S000 sin bloque sigue siendo la salida Exterior ordinaria (422 de validación).
  expect(
    esEscrituraDevolucion(w.db, {
      origen: "movimiento", body: { tipo: "Transferencia", destino: "S000" }, id: null, anular: false,
    }),
  ).toBe(false);
  expect(huella(w.db)).toBe(antes);
  expect(() => exigirEscrituraDevolucion(w.db, undefined, { origen: "comida-devolucion" })).toThrow(DEVOLUCION_G1);
  expect(() => exigirEscrituraDevolucion(w.db, gateAbiertoParaPruebas, { origen: "comida-devolucion" })).not.toThrow();
  // Servicios llamados sin gate (p. ej. un script nuevo) fallan cerrados.
  expect(() =>
    writeMovement(w.db, devolucionBody(w, w.compraLibre.id), randomUUID(), null, false, now),
  ).toThrow(DEVOLUCION_G1);
  expect(() =>
    writeComidaDevolucion(w.db, w.dev.id, { revision: 1 }, randomUUID(), now),
  ).toThrow(DEVOLUCION_G1);
  expect(huella(w.db)).toBe(antes);
  w.db.close();
});

// ---------------------------------------------------------------- F2G-AC-04

test("F2G-AC-04: clave completada reproduce su recibo con el gate cerrado; otro hash da 409, no 503", async () => {
  const h = await harness();
  const { w, abierta, cerrada } = h;
  const idem = randomUUID();
  const body = devolucionBody(w, w.compraLibre.id, "20");
  const plan = previewMovement(w.db, body, null, false, now);
  const completo = { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision };
  const primera = await abierta.post("/api/movimientos", completo, idem);
  expect(primera.status).toBe(201);
  const antes = huella(w.db);
  const repro = await cerrada.post("/api/movimientos", completo, idem);
  expect(repro.status).toBe(201);
  expect(repro.data.movimiento.id).toBe(primera.data.movimiento.id);
  const conflicto = await cerrada.post("/api/movimientos", { ...completo, concepto: "Otro" }, idem);
  expect(conflicto.status).toBe(409);
  expect(conflicto.data.code).toBe("IDEMPOTENCY_CONFLICT");
  expect(huella(w.db)).toBe(antes);
  // Atribución dedicada: mismo comportamiento.
  const k2 = randomUUID();
  const atrib = atribucion(w);
  const a1 = await abierta.post(`/api/comida/${w.huerfana.id}/devolucion`, atrib, k2);
  expect(a1.status).toBe(200);
  const a2 = await cerrada.post(`/api/comida/${w.huerfana.id}/devolucion`, atrib, k2);
  expect(a2.status).toBe(200);
  expect(a2.data).toEqual(a1.data);
  expect((await cerrada.post(`/api/comida/${w.huerfana.id}/devolucion`, { ...atrib, evidenciaRelacion: "Otra evidencia" }, k2)).data.code).toBe(
    "IDEMPOTENCY_CONFLICT",
  );
  // Legacy: misma regla.
  const k3 = randomUUID();
  const legacy = {
    fecha: "2026-10-08", concepto: "Devolución legacy ficticia", importe: "12.00", direccion: "Entrada",
    esDevolucion: true, clasificacion: "Pendiente revisar", evidenciaBancaria: "op ficticia", cuentaOrigen: "Cuenta ficticia",
  };
  const l1 = await abierta.post("/api/revision-comida", legacy, k3);
  expect(l1.status).toBe(201);
  const l2 = await cerrada.post("/api/revision-comida", legacy, k3);
  expect(l2.status).toBe(201);
  expect(l2.data.operacion.id).toBe(l1.data.operacion.id);
  w.db.close();
});

test("F2G-AC-05: un intento rechazado por el gate no deja recibo, intento, auditoría, dirty ni contador y la misma clave se ejecuta después con el gate abierto", async () => {
  const h = await harness();
  const { w, abierta, cerrada } = h;
  const idem = randomUUID();
  const body = devolucionBody(w, w.compraLibre.id, "20");
  const plan = previewMovement(w.db, body, null, false, now);
  const completo = { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision };
  const antes = huella(w.db);
  const intentosAntes = w.db.query("SELECT COUNT(*) n FROM movement_attempts").get();
  es503(await cerrada.post("/api/movimientos", completo, idem));
  expect(huella(w.db)).toBe(antes);
  expect(w.db.query("SELECT COUNT(*) n FROM movement_attempts").get()).toEqual(intentosAntes);
  // Reintento con la misma clave y gate abierto: ejecución NUEVA, no reproduce el 503.
  const despues = await abierta.post("/api/movimientos", completo, idem);
  expect(despues.status).toBe(201);
  // Atribución dedicada.
  const k2 = randomUUID();
  const atrib = atribucion(w);
  const previo = huella(w.db);
  es503(await cerrada.post(`/api/comida/${w.huerfana.id}/devolucion`, atrib, k2));
  expect(huella(w.db)).toBe(previo);
  expect(w.db.query("SELECT COUNT(*) n FROM comida_devolucion_attempts WHERE key=?").get(k2)).toEqual({ n: 0 });
  expect((await abierta.post(`/api/comida/${w.huerfana.id}/devolucion`, atrib, k2)).status).toBe(200);
  // Legacy.
  const k3 = randomUUID();
  const legacy = {
    fecha: "2026-10-08", concepto: "Devolución legacy ficticia", importe: "12.00", direccion: "Entrada",
    esDevolucion: true, clasificacion: "Pendiente revisar", evidenciaBancaria: "op ficticia", cuentaOrigen: "Cuenta ficticia",
  };
  const previoL = huella(w.db);
  es503(await cerrada.post("/api/revision-comida", legacy, k3));
  expect(huella(w.db)).toBe(previoL);
  expect(w.db.query("SELECT COUNT(*) n FROM revision_comida_attempts WHERE key=?").get(k3)).toEqual({ n: 0 });
  expect((await abierta.post("/api/revision-comida", legacy, k3)).status).toBe(201);
  w.db.close();
});

// ---------------------------------------------------------------- F2G-AC-06

test("F2G-AC-06: sin regresiones; Gasto, Ingreso, Transferencia interna y rectificar/anular de movimientos normales siguen funcionando con el gate cerrado", async () => {
  const h = await harness();
  const { w, cerrada } = h;
  const escribe = async (body: Record<string, unknown>) => {
    const plan = previewMovement(w.db, body, null, false, now);
    return cerrada.post("/api/movimientos", { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision });
  };
  const g = await escribe({
    tipo: "Gasto", fecha: "2026-07-06", importe: "15", saldo: w.account.id, partida: w.food.id, concepto: "Compra normal", nota: "",
  });
  expect(g.status).toBe(201);
  const i = await escribe({
    tipo: "Ingreso", fecha: "2026-07-07", importe: "200", saldo: w.account.id, subtipo: "Nómina", concepto: "Ingreso normal", nota: "",
  });
  expect(i.status).toBe(201);
  const t = await escribe({
    tipo: "Transferencia", fecha: "2026-07-08", importe: "40", origen: w.account.id, destino: w.other.id, concepto: "Interna normal", nota: "",
  });
  expect(t.status).toBe(201);
  // Rectificar y anular movimientos normales (sin vínculo).
  const rect = await cerrada.post(
    `/api/movimientos/${g.data.movimiento.id}/rectificar`,
    await bodyRect(h, g.data.movimiento.id, { importe: "16" }),
  );
  expect(rect.status).toBe(200);
  const anulaG = await cerrada.post(`/api/movimientos/${w.compraLibre.id}/anular`, await anulacion(h, w.compraLibre.id));
  expect(anulaG.status).toBe(200);
  const anulaI = await cerrada.post(`/api/movimientos/${i.data.movimiento.id}/anular`, await anulacion(h, i.data.movimiento.id));
  expect(anulaI.status).toBe(200);
  const anulaT = await cerrada.post(`/api/movimientos/${t.data.movimiento.id}/anular`, await anulacion(h, t.data.movimiento.id));
  expect(anulaT.status).toBe(200);
  // Metadatos de Comida y rol no son escrituras de devolución (no tocan movimiento_devolucion).
  const meta = await cerrada.post(`/api/comida/${w.dev.id}/metadata`, {
    revision: (w.db.query("SELECT revision FROM movimientos WHERE id=?").get(w.dev.id) as any).revision,
    etiqueta: "Comida", estadoRevision: "Revisada",
  });
  expect(meta.status).toBe(200);
  // Revisión Comida legacy que NO es devolución.
  const ok = await cerrada.post("/api/revision-comida", {
    fecha: "2026-10-09", concepto: "Compra legacy ficticia", importe: "10.00", direccion: "Salida",
    esDevolucion: false, clasificacion: "Pendiente revisar", evidenciaBancaria: "op ficticia", cuentaOrigen: "Cuenta ficticia",
  });
  expect(ok.status).toBe(201);
  w.db.close();
});
async function anulacion(h: H, id: string) {
  const fila = h.w.db.query("SELECT revision FROM movimientos WHERE id=?").get(id) as { revision: number };
  const body = { revision: fila.revision, motivo: "Motivo ficticio" };
  const plan = previewMovement(h.w.db, body, id, true, now);
  return { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision };
}

test("F2G-AC-07: las lecturas y los previews siguen disponibles con el gate cerrado", async () => {
  const h = await harness();
  const { w, cerrada } = h;
  const antes = huella(w.db);
  for (const ruta of [
    `/api/movimientos/${w.dev.id}`,
    `/api/movimientos/${w.compraVinculada.id}`,
    "/api/movimientos",
    `/api/comida/${w.dev.id}`,
    "/api/comida",
    `/api/comida/compras/${w.compraVinculada.id}/devoluciones`,
    "/api/devoluciones/integridad",
    "/api/revision-comida",
  ])
    expect((await cerrada.get(ruta)).status).toBe(200);
  // El preview es una lectura (14-E2 §5): no se gatea.
  expect((await cerrada.post("/api/movimientos/impacto", devolucionBody(w, w.compraLibre.id))).status).toBe(200);
  expect(
    (
      await cerrada.post(`/api/movimientos/${w.dev.id}/impacto-anulacion`, { revision: 1, motivo: "Motivo ficticio" })
    ).status,
  ).toBe(200);
  expect(huella(w.db)).toBe(antes);
  w.db.close();
});

test("F2G-AC-08: los escritores no HTTP (writeMovementInTransaction) clasifican con el mismo gate y las operaciones normales pasan sin gate", async () => {
  const { writeMovementInTransaction } = await import("./movimientos");
  const w = world();
  const antes = huella(w.db);
  expect(() =>
    w.db.transaction(() =>
      writeMovementInTransaction(w.db, devolucionBody(w, w.compraLibre.id), { now }),
    ).immediate(),
  ).toThrow(DEVOLUCION_G1);
  expect(huella(w.db)).toBe(antes);
  const normal = {
    tipo: "Gasto", fecha: "2026-07-06", importe: "15", saldo: w.account.id, partida: w.food.id, concepto: "Normal", nota: "",
  };
  const plan = previewMovement(w.db, normal, null, false, now);
  const hecho = w.db
    .transaction(() =>
      writeMovementInTransaction(w.db, { ...normal, fingerprint: plan.fingerprint }, { now, planned: plan }),
    )
    .immediate();
  expect(hecho.movimiento.tipo).toBe("Gasto");
  w.db.close();
});
