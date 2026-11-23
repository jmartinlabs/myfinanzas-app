import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createInstrumento } from "./instrumentos";
import type { CierreOptions } from "./e49";
import {
  VERSION_CONJUNTO,
  huellaUniverso,
  impactoDeCandidatos,
  universoFinanciero,
} from "./cierre-validacion-impacto";

/**
 * SPEC38 · I2 — el cierre ya no bloquea (§7.6).
 *
 * Este fichero **sustituye** la suite E4.9 de guardas (30 pruebas en
 * `80efbcfc`, recuperable con `git show 80efbcfc:apps/api/src/e49-guards.test.ts`)
 * cuyo sujeto —`closedWindows`, `assertDatesWritable`, `closedFieldDecision`,
 * `informativeFields` y el 409 `HISTORY_LOCKED`— quedó retirado. Cada bloque
 * conserva la garantía que sigue viva y la mide con el contrato nuevo: la
 * escritura se acepta y persiste, y la materialidad se mide antes/después del
 * universo material (una errata no mueve la huella; un importe o una atribución
 * distinta sí). La cobertura de las rutas retiradas vive en `e49-api.test.ts` y
 * `cierre-validacion-retirada.test.ts`; la de preview, confirmación y marcas de
 * `dirty`, en `cierre-validacion-operaciones.test.ts`.
 *
 * Mapa de sustitución:
 *  - E4.9 T1 Movimientos (409 por ventana cerrada) → «un ciclo Validada no bloquea…»
 *  - E4.9 T1 Capturado (impacto de un hecho anterior) → «rectificar un hecho capturado…»
 *  - E4.9 T2 Saldos (bloquea lo material) → «cambiar el Saldo de apertura…»
 *  - E4.9 T2/T3 Catálogos (lista blanca por campo) → «renombrar una Partida…» (AC-14)
 *  - E4.9 T2/T3 Reclasificación (revisión económica) → «cambiar la Partida de un hecho…» (AC-12)
 *  - Cierre por foto y foto del ciclo → «las rutas fotográficas retiradas responden 410»
 *  - E4.9 T2 de Referencias/Deudas/Presupuestos/Plan/Comida con motivo+huella →
 *    sujeta al mismo predicado de materialidad (`cierre-validacion-impacto.test.ts`)
 *    y a las suites propias de cada entidad, que ya no exigen motivo para escribir.
 */

process.env.NODE_ENV = "test";

const now = Date.parse("2026-03-10T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas guards E4.9 " + randomUUID();
const stamp = "2026-01-01T00:00:00.000Z";
const instante = "2026-03-10T12:00:00.000Z";
const COBERTURA = JSON.stringify([
  { fuente: "movimientos", estado: "Disponible", causas: [] },
]);

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
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR900','Partida ficticia','SUB900','Activa',1,?,?)`,
    [stamp, stamp],
  );
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR901','Partida alternativa','SUB900','Activa',1,?,?)`,
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
  seedMovement(db, {
    id: "8001",
    fecha: "2026-01-15",
    importe: 1234,
    ...(options.classification
      ? { tipo: "Gasto" as const, destino: "S000", partida: "PAR900" }
      : {}),
  });
}

function fixture(
  options: {
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
  seedFacts(db, instrumento, options);
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
  return { db, key, instrumento, request, enroll };
}

/**
 * Estado persistido equivalente al antiguo «ciclo cerrado»: una validación
 * humana vigente (§2.2). No crea `cierres` ni fotos: esa vía está retirada.
 */
function marcarValidada(db: Database, ciclo: string) {
  const universo = universoFinanciero(db, ciclo);
  db.run(
    `INSERT INTO cierre_validacion(ciclo,revision,dirty,huella_validacion,
       version_conjunto,revision_actor,revision_instante,cobertura)
     VALUES(?,1,0,?,?,'usuario-unico',?,?)`,
    [
      ciclo,
      huellaUniverso(universo),
      VERSION_CONJUNTO,
      instante,
      JSON.stringify(universo.cobertura),
    ],
  );
}

function marcarPendiente(db: Database, ciclo: string) {
  db.run(
    `INSERT INTO cierre_validacion(ciclo,revision,dirty,dirty_desde,dirty_ultimo,
       dirty_origen,dirty_motivos,cobertura)
     VALUES(?,1,1,?,?,'Operacion','["FLUJO_CICLO"]',?)`,
    [ciclo, instante, instante, COBERTURA],
  );
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

/** Rectificación real: el impacto se revisa antes y viaja como token. */
async function rectificarMovement(
  f: ReturnType<typeof fixture>,
  id: string,
  body: Record<string, unknown>,
) {
  const impact = await f.request(`/api/movimientos/${id}/impacto`, "POST", body);
  expect(impact.status, JSON.stringify(impact.data)).toBe(200);
  const rectificado = await f.request(
    `/api/movimientos/${id}/rectificar`,
    "POST",
    {
      ...body,
      contextRevision: impact.data.contextRevision,
      fingerprint: impact.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(rectificado.status, JSON.stringify(rectificado.data)).toBe(200);
  return { impact, rectificado };
}

test("E4.9 T1 (sustituido): un ciclo Validada no bloquea el alta de movimientos y no crea cierres", async () => {
  const f = fixture();
  await f.enroll();
  marcarValidada(f.db, "1");
  const before = rowCount(f.db, "movimientos");

  for (const body of [
    movementBody({ origen: "S003", destino: "S001" }),
    movementBody({ importe: "12.35", concepto: "Hecho de enero sin efectivo capturado" }),
  ]) {
    // Sustituye el 409 HISTORY_LOCKED por ventana cerrada: SPEC38 §7.6.
    const { created } = await createMovement(f, body);
    expect(created.status).toBe(201);
  }
  expect(rowCount(f.db, "movimientos")).toBe(before + 2);
  expect(rowCount(f.db, "cierres")).toBe(0);
  expect(rowCount(f.db, "fotos_cierre")).toBe(0);
});

test("E4.9 T1/T2 (sustituido): rectificar un hecho capturado en ciclo Validada se acepta y persiste", async () => {
  const f = fixture({ capturedMovement: true });
  await f.enroll();
  marcarValidada(f.db, "1");

  // Sustituye el 409 de /impacto y /rectificar sobre un hecho capturado: la
  // revisión de impacto sigue existiendo, pero ya no la bloquea el cierre.
  const { rectificado } = await rectificarMovement(
    f,
    "8003",
    capturedMovement({ concepto: "Concepto corregido", nota: "Nota nueva" }),
  );
  expect(rectificado.status).toBe(200);
  expect(
    f.db.query("SELECT concepto,nota,revision FROM movimientos WHERE id='8003'").get(),
  ).toEqual({ concepto: "Concepto corregido", nota: "Nota nueva", revision: 2 });
});

test("E4.9 T1/T2 (sustituido): una errata de texto no mueve la huella material (AC-12)", async () => {
  const f = fixture({ capturedMovement: true });
  await f.enroll();
  marcarValidada(f.db, "1");
  const antes = universoFinanciero(f.db, "1");

  const { rectificado } = await rectificarMovement(
    f,
    "8003",
    capturedMovement({ concepto: "Errata corregida" }),
  );
  expect(rectificado.status).toBe(200);

  const despues = universoFinanciero(f.db, "1");
  expect(huellaUniverso(despues)).toBe(huellaUniverso(antes));
  const [impacto] = impactoDeCandidatos(
    new Map([["1", antes]]),
    new Map([["1", despues]]),
  );
  expect(impacto?.material).toBe(false);
  expect(impacto?.motivos).toEqual([]);
});

test("E4.9 T2 (sustituido): rectificar el importe se acepta y mueve el balance medido", async () => {
  const f = fixture({ capturedMovement: true });
  await f.enroll();
  marcarValidada(f.db, "1");
  const antes = universoFinanciero(f.db, "1");

  const { rectificado } = await rectificarMovement(
    f,
    "8003",
    capturedMovement({ importe: "7.00" }),
  );
  expect(rectificado.status).toBe(200);

  const despues = universoFinanciero(f.db, "1");
  expect(huellaUniverso(despues)).not.toBe(huellaUniverso(antes));
  const [impacto] = impactoDeCandidatos(
    new Map([["1", antes]]),
    new Map([["1", despues]]),
  );
  expect(impacto?.material).toBe(true);
  expect(impacto?.motivos).toContain("BALANCE_FIN");
});

test("E4.9 T2 (sustituido): cambiar el Saldo de apertura de un ciclo Validada se acepta", async () => {
  const f = fixture({ capturedMovement: true });
  await f.enroll();
  marcarValidada(f.db, "1");
  const saldo = f.db.query("SELECT revision FROM saldos WHERE id='S003'").get() as {
    revision: number;
  };

  // Sustituye el 409 HISTORY_LOCKED de la guarda T2 de Saldos por el flujo
  // vigente: impacto revisado + motivo, sin bloqueo por cierre.
  const impacto = await f.request("/api/saldos/S003/impacto", "POST", {
    revision: saldo.revision,
    saldoApertura: "20.00",
  });
  expect(impacto.status).toBe(200);
  const cambio = await f.request("/api/saldos/S003/rectificar", "POST", {
    cambios: { revision: saldo.revision, saldoApertura: "20.00" },
    motivo: "Corrección de apertura tras validar",
    fingerprint: impacto.data.fingerprint,
  });
  expect(cambio.status).toBe(200);
  expect(f.db.query("SELECT apertura FROM saldos WHERE id='S003'").get()).toEqual({
    apertura: 2000,
  });
});

test("E4.9 T3 (sustituido, AC-14): renombrar una Partida con ID estable no mueve el universo material", async () => {
  const f = fixture({ classification: true });
  await f.enroll();
  marcarValidada(f.db, "1");
  const antes = universoFinanciero(f.db, "1");
  const partida = f.db.query("SELECT revision FROM partidas WHERE id='PAR900'").get() as {
    revision: number;
  };

  // Sustituye la lista blanca de campos informativos por campo.
  const renombrado = await f.request("/api/clasificacion/partidas/PAR900", "PATCH", {
    revision: partida.revision,
    nombre: "Partida renombrada tras validar",
  });
  expect(renombrado.status).toBe(200);
  expect(renombrado.data.item.nombre).toBe("Partida renombrada tras validar");
  expect(huellaUniverso(universoFinanciero(f.db, "1"))).toBe(huellaUniverso(antes));
});

test("E4.9 T2/T3 (sustituido, AC-12): cambiar la Partida de un hecho mueve ATRIBUCION", async () => {
  const f = fixture({ classification: true });
  await f.enroll();
  // Fixture: el Gasto se paga desde un Saldo con salida a Exterior autorizada.
  f.db.run("UPDATE saldos SET exterior=1 WHERE id='S001'");
  marcarValidada(f.db, "1");
  const antes = universoFinanciero(f.db, "1");

  // Sustituye la revisión económica con motivo+huella por la medición real.
  const { rectificado } = await rectificarMovement(f, "8001", {
    revision: 1,
    motivo: "Rectificación ficticia",
    fecha: "2026-01-15",
    tipo: "Gasto",
    importe: "12.34",
    saldo: "S001",
    subtipo: null,
    partida: "PAR901",
    referencia: null,
    concepto: "Movimiento ficticio guard 8001",
    nota: null,
    capital: null,
    intereses: null,
  });
  expect(rectificado.status).toBe(200);

  const despues = universoFinanciero(f.db, "1");
  expect(huellaUniverso(despues)).not.toBe(huellaUniverso(antes));
  const [impacto] = impactoDeCandidatos(
    new Map([["1", antes]]),
    new Map([["1", despues]]),
  );
  expect(impacto?.motivos).toContain("ATRIBUCION");
});

test("E4.9 T2 (sustituido): un ciclo Pendiente sigue operando y conserva su marca", async () => {
  const f = fixture({ capturedMovement: true });
  await f.enroll();
  marcarPendiente(f.db, "1");
  const marcaAntes = f.db.query("SELECT * FROM cierre_validacion WHERE ciclo='1'").get();

  const { created } = await createMovement(f, movementBody({ fecha: "2026-01-20" }));
  expect(created.status).toBe(201);
  expect(
    f.db.query("SELECT dirty FROM cierre_validacion WHERE ciclo='1'").get(),
  ).toEqual({ dirty: 1 });
  // Una escritura que no atraviesa el flujo de §3 no reescribe la marca.
  expect(f.db.query("SELECT * FROM cierre_validacion WHERE ciclo='1'").get()).toEqual(
    marcaAntes as never,
  );
});

test("SPEC38 §7.6: las rutas fotográficas retiradas responden 410 y no escriben", async () => {
  const f = fixture({ capturedMovement: true });
  await f.enroll();
  const estado = await f.request("/api/cierres/1/estado");

  const cerrar = await f.request(
    "/api/cierres/1/cerrar",
    "POST",
    { fingerprint: "a".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expect(cerrar.status).toBe(410);
  expect(cerrar.data.code).toBe("CIERRE_FOTOGRAFICO_RETIRADO");
  expect(cerrar.headers.get("cache-control")).toBe("no-store");

  const foto = await f.request("/api/cierres/1/foto");
  expect(foto.status).toBe(410);
  expect(foto.data.code).toBe("FOTO_RETIRADA");
  expect(foto.data.sustituto).toBe("/api/cierres/1/estado");

  expect(rowCount(f.db, "cierres")).toBe(0);
  expect(rowCount(f.db, "fotos_cierre")).toBe(0);
  // El sustituto declarado es la lectura viva del estado de validación.
  expect(estado.status).toBe(200);
});