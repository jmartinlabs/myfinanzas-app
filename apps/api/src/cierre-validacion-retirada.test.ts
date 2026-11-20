import { expect, test } from "bun:test";
import type { Database } from "bun:sqlite";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { retirada, rutaFotograficaRetirada, type RutaRetirada } from "./cierre-validacion-retirada";
import { Problem } from "./problem";

process.env.NODE_ENV = "test";

/**
 * SPEC38 · I2 — retirada funcional de la vía fotográfica (§7.6).
 *
 * El contrato se fija **por ruta**, no por prefijo: ninguna ruta retirada puede
 * responder `3xx` ni `500`, ninguna ruta viva puede heredar un código por
 * parecido (`preflight` no es `precierre`, `foto` no es `fotoX`), y cada
 * retirada declara su código y su sustituto en lugar de disfrazarse de lectura.
 * La prueba HTTP comprueba además dos cosas que la ruta sola no dice: que la
 * respuesta es `410` con `no-store` y `Link rel=alternate`, y que la petición
 * **no escribe nada** (huella de la base antes/después).
 */

const T = "2026-01-01T00:00:00.000Z";
const COBERTURA = JSON.stringify([
  { fuente: "movimientos", estado: "Disponible", causas: [] },
]);

type Caso = {
  path: string;
  search?: string;
  metodo: "GET" | "POST";
  code: RutaRetirada["code"];
  sustituto: string | null;
};

/**
 * Inventario completo de rutas retiradas: cada una con el código que §7.6 le
 * asigna y el sustituto vivo que declara.
 */
const RETIRADAS: Caso[] = [
  // POST legacy de cierre fotográfico → CIERRE_FOTOGRAFICO_RETIRADO.
  { path: "/api/cierres/1/cerrar", metodo: "POST", code: "CIERRE_FOTOGRAFICO_RETIRADO", sustituto: "/api/cierres/1/estado" },
  { path: "/api/cierres/2/cierre", metodo: "POST", code: "CIERRE_FOTOGRAFICO_RETIRADO", sustituto: "/api/cierres/2/estado" },
  { path: "/api/cierres/3/preflight", metodo: "GET", code: "CIERRE_FOTOGRAFICO_RETIRADO", sustituto: "/api/cierres/3/estado" },
  // Reapertura, re-cierre y revalidación de cierre → REAPERTURA_RETIRADA.
  { path: "/api/cierres/1/reapertura", metodo: "POST", code: "REAPERTURA_RETIRADA", sustituto: "/api/cierres/1/estado" },
  { path: "/api/cierres/1/reapertura/cancelar", metodo: "POST", code: "REAPERTURA_RETIRADA", sustituto: "/api/cierres/1/estado" },
  { path: "/api/cierres/2/reabrir", metodo: "POST", code: "REAPERTURA_RETIRADA", sustituto: "/api/cierres/2/estado" },
  { path: "/api/cierres/2/repreflight", metodo: "GET", code: "REAPERTURA_RETIRADA", sustituto: "/api/cierres/2/estado" },
  { path: "/api/cierres/3/recerrar", metodo: "POST", code: "REAPERTURA_RETIRADA", sustituto: "/api/cierres/3/estado" },
  { path: "/api/cierres/3/cancelar", metodo: "POST", code: "REAPERTURA_RETIRADA", sustituto: "/api/cierres/3/estado" },
  { path: "/api/cierres/3/revalidacion", metodo: "POST", code: "REAPERTURA_RETIRADA", sustituto: "/api/cierres/3/estado" },
  // Foto de un ciclo → FOTO_RETIRADA.
  { path: "/api/cierres/1/foto", metodo: "GET", code: "FOTO_RETIRADA", sustituto: "/api/cierres/1/estado" },
  // Contraste de foto: el sustituto depende del ciclo pedido.
  { path: "/api/fotos/contraste", search: "?ciclo=2", metodo: "GET", code: "FOTO_RETIRADA", sustituto: "/api/cierres/2/estado" },
  { path: "/api/fotos/contraste", metodo: "GET", code: "FOTO_RETIRADA", sustituto: null },
  { path: "/api/fotos/contraste", search: "?ciclo=abc", metodo: "GET", code: "FOTO_RETIRADA", sustituto: null },
  // Fotografías de periodo y de ciclo → FOTOS_RETIRADAS, sin sustituto vivo.
  { path: "/api/fotos/periodos", metodo: "GET", code: "FOTOS_RETIRADAS", sustituto: null },
  { path: "/api/fotos/periodos/2026", metodo: "GET", code: "FOTOS_RETIRADAS", sustituto: null },
  { path: "/api/fotos/ciclos/1", metodo: "GET", code: "FOTOS_RETIRADAS", sustituto: null },
  { path: "/api/fotos/ciclos/1/versiones", metodo: "GET", code: "FOTOS_RETIRADAS", sustituto: null },
];

/** Rutas vivas que ninguna retirada puede capturar (§7.6, AC-52). */
const VIVAS = [
  "/api/cierres/1/estado",
  "/api/cierres/12/estado",
  "/api/informes/ciclo/1",
  "/api/cierres/precierre/1",
  "/api/cierres/1/precierre",
  "/api/cierres/1/validacion/preview",
  "/api/cierres/1/validar",
  "/api/cierres/1/revision/confirmar",
];

/** Vecinos por prefijo que no son la ruta retirada. */
const PREFIJOS = [
  "/api/cierres/1/cerrarx",
  "/api/cierres/1/cierre/1",
  "/api/cierres/1/preflightx",
  "/api/cierres/1/cerrar/extra",
  "/api/cierres/abc/cerrar",
  "/api/cierres/1/foto/1",
  "/api/cierres/1/fotox",
  "/api/cierres/1/reapertura/cancelar/extra",
  "/api/cierres/1/reaperturax",
  "/api/fotos",
  "/api/fotos/contraste/1",
  "/api/fotos/periodosx",
  "/api/fotos/periodos/2026/1",
  "/api/fotos/ciclos/",
  "/api/fotos/ciclos/1/versiones/2",
  "/api/cierres/1",
  "",
];

/* ================================================================== *
 * Módulo · ruta a ruta
 * ================================================================== */

test("I2 retirada · §7.6: cada ruta retirada tiene su código y su sustituto", () => {
  expect(RETIRADAS.length).toBeGreaterThanOrEqual(18);
  for (const caso of RETIRADAS) {
    const encontrada = rutaFotograficaRetirada(caso.path, caso.search ?? "");
    expect({ path: caso.path, search: caso.search, encontrada }).toEqual({
      path: caso.path,
      search: caso.search,
      encontrada: {
        code: caso.code,
        message: expect.any(String),
        sustituto: caso.sustituto,
      },
    });
    // El mensaje explica la retirada; no es un texto vacío ni un alias.
    expect(encontrada!.message.length).toBeGreaterThan(20);
  }
});

test("I2 retirada · §7.6: los códigos de retirada son un conjunto cerrado y distinto", () => {
  const codigos = new Set(RETIRADAS.map((caso) => caso.code));
  expect([...codigos].sort()).toEqual([
    "CIERRE_FOTOGRAFICO_RETIRADO",
    "FOTOS_RETIRADAS",
    "FOTO_RETIRADA",
    "REAPERTURA_RETIRADA",
  ]);
  for (const caso of RETIRADAS)
    expect(caso.code).toBe(rutaFotograficaRetirada(caso.path, caso.search ?? "")!.code);
});

test("I2 retirada · §7.6/AC-52: ninguna ruta viva se retira (estado, informe, precierre, validación)", () => {
  for (const path of VIVAS) expect({ path, retirada: rutaFotograficaRetirada(path) }).toEqual({
    path,
    retirada: null,
  });
});

test("I2 retirada · §7.6: el código se fija por ruta completa y no por prefijo", () => {
  for (const path of PREFIJOS)
    expect({ path, retirada: rutaFotograficaRetirada(path) }).toEqual({ path, retirada: null });
});

test("I2 retirada · §7.6: `retirada()` lanza 410 con el sustituto declarado y es no-op en rutas vivas", () => {
  for (const caso of RETIRADAS) {
    let capturado: unknown;
    try {
      retirada(caso.path, caso.search ?? "");
    } catch (error) {
      capturado = error;
    }
    expect(capturado).toBeInstanceOf(Problem);
    const problema = capturado as Problem;
    expect(problema.status).toBe(410);
    expect(problema.code).toBe(caso.code);
    // El sustituto viaja en los detalles: el cliente no tiene que adivinarlo.
    expect(problema.details.sustituto).toBe(caso.sustituto);
  }
  for (const path of VIVAS) expect(retirada(path)).toBeNull();
});

/* ================================================================== *
 * HTTP · 410, cabeceras, sustituto y cero escrituras
 * ================================================================== */

const now = Date.parse("2026-03-10T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas SPEC38 I2 " + randomUUID();

/** Tablas de autenticación: su tráfico no es una escritura de dominio. */
const AUTH = new Set(["sessions", "auth_events", "auth_limits", "challenges", "bootstrap"]);

/**
 * Huella de todas las tablas de dominio (contenido, no esquema). Dos lecturas
 * iguales prueban que la petición no escribió ni una fila.
 */
function huellaBase(db: Database): string {
  const tablas = (
    db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[]
  )
    .map((fila) => fila.name)
    .filter((nombre) => !AUTH.has(nombre));
  const hash = createHash("sha256");
  for (const tabla of tablas)
    hash.update(tabla + "\u0000" + JSON.stringify(db.query(`SELECT * FROM "${tabla}"`).all()) + "\u0000");
  return hash.digest("hex");
}

function sembrar(db: Database) {
  db.run(
    `INSERT INTO categorias VALUES('CAT0001','Ficticia',NULL,'Gasto','Gasto',0,'Activa',1,?,?)`,
    [T, T],
  );
  db.run(`INSERT INTO subcategorias VALUES('SUB0001','Ficticia','CAT0001','Activa',1,?,?)`, [T, T]);
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR0001','Ficticia','SUB0001','Activa',1,?,?)`,
    [T, T],
  );
  for (const [id, inicio] of [
    ["1", "2026-01-01"],
    ["2", "2026-02-01"],
    ["3", "2026-03-01"],
  ] as const)
    db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,0,?)", [id, inicio, T]);
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,
       concepto,nota,anulado,revision,creado,actualizado)
     VALUES('1','2026-01-04','Gasto',1000,'S001','S000',NULL,'PAR0001','Ficticio','',0,1,?,?)`,
    [T, T],
  );
  // Fila de estado de validación: también debe quedar intacta.
  db.run(
    `INSERT INTO cierre_validacion(ciclo,revision,dirty,dirty_desde,dirty_ultimo,dirty_origen,
       dirty_motivos,cobertura)
     VALUES('1',1,1,?,?,'Operacion','[]',?)`,
    [T, T, COBERTURA],
  );
}

async function fixture() {
  const db = openDatabase(":memory:");
  sembrar(db);
  const key = randomBytes(32);
  const handler = HttpApp.toWebHandler(createApp(db, { key, now: () => now }));
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
      const pair = set.split(";")[0]!,
        name = pair.split("=")[0]!;
      cookie = cookie
        .split("; ")
        .filter((p) => p && !p.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const texto = await r.text();
    const data = texto ? JSON.parse(texto) : null;
    if (data?.csrf) csrf = data.csrf;
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
  return { db, request, enroll };
}

test("I2 retirada · §7.6/AC-52: cada ruta retirada responde 410 con no-store, Link al sustituto y sin escrituras", async () => {
  const app = await fixture();
  try {
    await app.enroll();
    const antes = huellaBase(app.db);

    for (const caso of RETIRADAS) {
      const r = await app.request(
        caso.path + (caso.search ?? ""),
        caso.metodo,
        caso.metodo === "POST" ? {} : undefined,
      );
      const etiqueta = `${caso.metodo} ${caso.path}${caso.search ?? ""}`;

      // Ni redirección ni error genérico: retirada explícita.
      expect({ etiqueta, status: r.status }).toEqual({ etiqueta, status: 410 });
      expect([301, 302, 303, 307, 308, 500]).not.toContain(r.status);
      expect(r.data.code).toBe(caso.code);
      expect(r.data.sustituto).toBe(caso.sustituto);
      // Una respuesta de retirada nunca se cachea.
      expect(r.headers.get("cache-control")).toBe("no-store");
      if (caso.sustituto)
        expect(r.headers.get("link")).toBe(`<${caso.sustituto}>; rel="alternate"`);
      else expect(r.headers.get("link")).toBeNull();
      // Sin Location: no hay alias de lectura ni redirección encubierta.
      expect(r.headers.get("location")).toBeNull();
    }

    // Ninguna de las peticiones anteriores escribió una sola fila de dominio.
    expect(huellaBase(app.db)).toBe(antes);
  } finally {
    app.db.close();
  }
});

test("I2 retirada · §7.6/AC-52: las lecturas vivas no son 410 y no anuncian sustituto", async () => {
  const app = await fixture();
  try {
    await app.enroll();
    const antes = huellaBase(app.db);

    for (const path of [
      "/api/cierres/1/estado",
      "/api/cierres/precierre/1",
      // §7.6 nombra el informe vivo como alternativa; hoy no hay router de
      // informes en esta app, así que sólo se exige que la retirada no lo capture.
      "/api/informes/ciclo/1",
    ]) {
      const r = await app.request(path);
      expect({ path, retirada: r.status === 410 }).toEqual({ path, retirada: false });
      const codigos = [
        "CIERRE_FOTOGRAFICO_RETIRADO",
        "REAPERTURA_RETIRADA",
        "FOTO_RETIRADA",
        "FOTOS_RETIRADAS",
      ];
      expect(codigos).not.toContain(r.data?.code);
      expect(r.headers.get("link")).toBeNull();
    }

    expect(huellaBase(app.db)).toBe(antes);
  } finally {
    app.db.close();
  }
});

test("I2 retirada · §7.6: sin sesión la retirada no se sirve como lectura pública", async () => {
  const app = await fixture();
  try {
    // La autenticación precede a la retirada: no se revela el estado del
    // contrato a un cliente anónimo.
    const anonimo = await app.request("/api/cierres/1/cerrar", "POST", {});
    expect(anonimo.status).toBe(401);
    expect(anonimo.headers.get("cache-control")).toBe("no-store");

    await app.enroll();
    const antes = huellaBase(app.db);
    const r = await app.request("/api/cierres/1/cerrar", "POST", {});
    expect(r.status).toBe(410);
    expect(r.data.code).toBe("CIERRE_FOTOGRAFICO_RETIRADO");
    expect(huellaBase(app.db)).toBe(antes);
  } finally {
    app.db.close();
  }
});