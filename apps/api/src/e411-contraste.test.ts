import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { Problem } from "./problem";
import { monthlyFixture } from "../test-support/monthly-fixture";
import { getFotoCiclo } from "./e411";
import {
  ETIQUETA_CONTRASTE,
  MOTOR_CONTRASTE,
  getContraste,
} from "./e411-contraste";

process.env.NODE_ENV = "test";

const now = Date.parse("2026-10-25T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas E4.11 I4 " + randomUUID();
const fp = "a".repeat(64);

const fotoNoDisponible = [
  {
    bloque: "E4.3 · Nómina",
    estado: "No disponible",
    motivo: "Sentinel persistido que el motor vivo no debe leer",
  },
];
const fotoCobertura = {
  estado: "Parcial",
  motivos: ["E4.3_NO_DISPONIBLE"],
  total: null,
};

function liveDb() {
  const db = openDatabase(":memory:");
  monthlyFixture(db);
  return db;
}

function seedClosure(
  db: Database,
  ciclo: string,
  version: number,
  inicio: string,
  fin: string,
  saldoInicial: number,
) {
  const creado = "2026-08-01T00:00:00.000Z";
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,
        creado_utc,motivo,fingerprint,estado)
       VALUES(?,?,?,?,?, 'usuario-unico',?,?,?,'Cerrado')`,
      [ciclo, version, inicio, fin, saldoInicial, creado, "Cierre ficticio E4.11 I4", fp],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,
        fingerprint,app_version,schema_version,ventana_inicio,ventana_fin,
        saldo_inicial,estado_temporal,estado_hechos,estado_plan,hechos,plan,
        clasificacion,inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES(?,?,?,'usuario-unico',?,?,'0.0.0-fixture',27,?,?,?,'Cerrado',
        'Con hechos','Capturado',?,?,?,?,?,?,?,?)`,
      [
        ciclo,
        version,
        creado,
        "Cierre ficticio E4.11 I4",
        fp,
        inicio,
        fin,
        saldoInicial,
        JSON.stringify({ foto: "v1", origen: "persistido" }),
        JSON.stringify({ foto: "v1" }),
        JSON.stringify({ foto: "v1" }),
        JSON.stringify({ foto: "v1" }),
        JSON.stringify({ foto: "v1" }),
        JSON.stringify(fotoCobertura),
        JSON.stringify({ foto: "v1" }),
        JSON.stringify(fotoNoDisponible),
      ],
    );
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES(?,?,'cierre',NULL,'{}',?,?,'usuario-unico')`,
      [ciclo, version, "Cierre ficticio E4.11 I4", creado],
    );
  })();
}

function snapshotAll(db: Database) {
  return (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
  ).map(({ name }) => [
    name,
    db.query(`SELECT * FROM "${name}"`).all(),
  ]);
}

function snapshotE411(db: Database) {
  return {
    ciclos: db.query("SELECT * FROM ciclos ORDER BY id").all(),
    cierres: db.query("SELECT * FROM cierres ORDER BY ciclo,version").all(),
    fotos: db.query("SELECT * FROM fotos_cierre ORDER BY ciclo,version").all(),
    audit: db.query("SELECT * FROM cierre_audit ORDER BY id").all(),
    reaperturas: db.query("SELECT * FROM reaperturas ORDER BY id").all(),
    activa: db.query("SELECT * FROM reapertura_activa").all(),
    fotosPeriodo: db.query("SELECT * FROM fotos_periodo ORDER BY id").all(),
    componentes: db
      .query("SELECT * FROM foto_periodo_componentes ORDER BY periodo_id,ciclo")
      .all(),
    periodoAttempts: db
      .query("SELECT * FROM periodo_attempts ORDER BY key")
      .all(),
  };
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

function fixture() {
  const db = liveDb();
  const key = randomBytes(32);
  const handler = HttpApp.toWebHandler(
    createApp(db, { key, now: () => now, origin }),
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
  }
  return { db, request, enroll };
}

function t2t3Changes(db: Database) {
  // T2: a new live fact inside the cycle window. T3: a renamed Partida.
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
       partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
       capital,intereses)
     VALUES('9411','2026-07-10','Ingreso',123400,'S000','S001','Nómina',
       NULL,NULL,'Hecho T2 ficticio E4.11 I4','',0,1,
       '2026-07-10T00:00:00.000Z','2026-07-10T00:00:00.000Z',NULL,NULL)`,
  );
  db.run(
    "UPDATE partidas SET nombre='Partida renombrada E4.11 I4' WHERE id='PAR001'",
  );
}

test("E4.11 I4: T2/T3 dejan la foto intacta y cambian solo el cálculo vivo etiquetado", () => {
  const db = liveDb();
  seedClosure(db, "1", 1, "2026-06-20", "2026-07-19", 0);

  const fotoAntes = getFotoCiclo(db, "1");
  const vivoAntes = getContraste(db, "1", now);

  expect(vivoAntes).toMatchObject({
    origen: "CalculoVivo",
    motor: MOTOR_CONTRASTE,
    etiqueta: ETIQUETA_CONTRASTE,
    ciclo: "1",
    corte: "2026-07-19",
    noEsHistorico: true,
    noSustituyeFoto: true,
    soloLectura: true,
  });
  expect(vivoAntes.revision).toMatch(/^[a-f0-9]{64}$/);
  expect(vivoAntes.cobertura).toMatchObject({
    estado: "Parcial",
    verificada: false,
    total: null,
    certificada: false,
    coberturaBancaria: {
      verificada: false,
    },
  });
  expect(vivoAntes.metricas.nomina).toMatchObject({
    valor: null,
    subtotal: "2000.00",
    estado: "Parcial",
    origen: "CalculoVivo",
    noEsHistorico: true,
  });
  expect(vivoAntes.metricas.nomina.fuente).toContain("Movimientos");
  expect(vivoAntes.metricas.nomina.motivo).toContain("no acreditada");
  expect("foto" in vivoAntes).toBe(false);
  expect("valores" in vivoAntes).toBe(false);
  expect("totalPeriodo" in vivoAntes).toBe(false);
  expect(vivoAntes.noDisponible).toContainEqual({
    clave: "ahorroCierre",
    fuente: expect.any(String),
    motivo: expect.stringContaining("Sin proveedor"),
  });

  t2t3Changes(db);

  const fotoDespues = getFotoCiclo(db, "1");
  expect(fotoDespues).toEqual(fotoAntes);
  expect(fotoDespues.foto?.noDisponible).toEqual(fotoNoDisponible);
  expect(fotoDespues.foto?.hechos).toEqual({
    foto: "v1",
    origen: "persistido",
  });

  const vivoDespues = getContraste(db, "1", now);
  expect(vivoDespues.revision).not.toBe(vivoAntes.revision);
  expect(vivoDespues.metricas.nomina.subtotal).toBe("3234.00");
  expect(vivoDespues.metricas.nomina.ids).toContain("9411");
  expect(vivoDespues.metricas.nomina).toMatchObject({
    estado: "Parcial",
    origen: "CalculoVivo",
    noEsHistorico: true,
  });
  expect(vivoDespues.origen).toBe("CalculoVivo");
  expect(vivoDespues.noEsHistorico).toBe(true);
  expect(JSON.stringify(fotoDespues)).not.toContain("3234.00");
  expect(JSON.stringify(vivoDespues)).not.toContain(
    "Sentinel persistido que el motor vivo no debe leer",
  );
});

test("E4.11 I4: cobertura y No disponible con motivo; lectura sin escrituras", () => {
  const db = liveDb();
  seedClosure(db, "1", 1, "2026-06-20", "2026-07-19", 0);
  const before = snapshotAll(db);

  const vivo = getContraste(db, "1", now);
  expect(snapshotAll(db)).toEqual(before);
  expect(vivo.cobertura.bloques.length).toBe(
    Object.keys(vivo.metricas).length,
  );
  for (const metric of Object.values(vivo.metricas)) {
    expect(metric.origen).toBe("CalculoVivo");
    expect(metric.noEsHistorico).toBe(true);
    expect(metric.fuente.length).toBeGreaterThan(0);
    expect(metric.motivo.length).toBeGreaterThan(0);
    expect(metric.cobertura.length).toBeGreaterThan(0);
  }

  const sinCorte = getContraste(db, "3", now);
  expect(sinCorte.corte).toBeNull();
  expect(sinCorte.metricas.nomina.estado).toBe("No disponible");
  expect(sinCorte.metricas.nomina.motivo).toContain("Periodo/corte");
  expect(sinCorte.noDisponible).toContainEqual({
    clave: "nomina",
    fuente: expect.any(String),
    motivo: expect.stringContaining("Periodo/corte"),
  });
  expect(sinCorte.cobertura.bloques).toContainEqual({
    clave: "nomina",
    estado: "No disponible",
    motivo: expect.stringContaining("Periodo/corte"),
  });
  expect(sinCorte.cobertura.estado).toBe("Parcial");
  expect(sinCorte.cobertura.total).toBeNull();
  expect(sinCorte.cobertura.certificada).toBe(false);
  expect(sinCorte.cobertura.motivos).toContain(
    "Sin periodo/corte central verificable: las métricas bancarias quedan No disponible.",
  );
  expect(sinCorte.cobertura.motivo).toContain("Cobertura parcial");
  for (const metric of sinCorte.noDisponible) {
    expect(metric.motivo.length).toBeGreaterThan(0);
    expect(sinCorte.metricas[metric.clave].valor).toBeNull();
    expect(sinCorte.metricas[metric.clave].subtotal).toBeNull();
  }

  expect(problemOf(() => getContraste(db, "abc", now)).status).toBe(422);
  expect(problemOf(() => getContraste(db, "999", now)).status).toBe(404);
  expect(snapshotAll(db)).toEqual(before);
});

test("E4.11 I4: ruta GET, 405, matriz negativa y snapshot sin altas", async () => {
  const f = fixture();
  seedClosure(f.db, "1", 1, "2026-06-20", "2026-07-19", 0);

  expect((await f.request("/api/fotos/contraste?ciclo=1")).status).toBe(401);

  await f.enroll();
  const before = snapshotE411(f.db);

  const ok = await f.request("/api/fotos/contraste?ciclo=1");
  expect(ok.status).toBe(200);
  expect(ok.headers.get("cache-control")).toBe("no-store");
  expect(ok.data).toMatchObject({
    origen: "CalculoVivo",
    motor: "E2.6 flujo-mensual",
    ciclo: "1",
    corte: "2026-07-19",
    noEsHistorico: true,
    noSustituyeFoto: true,
    soloLectura: true,
  });
  expect(ok.data.revision).toMatch(/^[a-f0-9]{64}$/);
  expect(ok.data.metricas.nomina.subtotal).toBe("2000.00");
  expect(ok.data.metricas.nomina.origen).toBe("CalculoVivo");
  expect(ok.data.cobertura).toMatchObject({
    estado: "Parcial",
    total: null,
    certificada: false,
  });
  expect(Object.keys(ok.data)).not.toContain("foto");
  expect(Object.keys(ok.data)).not.toContain("valores");
  expect(Object.keys(ok.data)).not.toContain("totalPeriodo");
  expect(JSON.stringify(ok.data)).not.toContain("tipoRegistro");
  expect(JSON.stringify(ok.data)).not.toContain("Archivo");

  // P8b-A: the contrast route cannot be turned into an archive source.
  const archivoParam = await f.request(
    "/api/fotos/contraste?ciclo=1&tipoRegistro=Archivo",
  );
  expect(archivoParam.status).toBe(200);
  expect(archivoParam.data.origen).toBe("CalculoVivo");
  expect(archivoParam.data).not.toHaveProperty("tipoRegistro");

  const missing = await f.request("/api/fotos/contraste");
  expect(missing.status).toBe(422);
  expect(missing.data.fields.ciclo).toBe("Indica un ciclo válido.");
  expect((await f.request("/api/fotos/contraste?ciclo=")).status).toBe(422);
  expect((await f.request("/api/fotos/contraste?ciclo=abc")).status).toBe(422);
  expect((await f.request("/api/fotos/contraste?ciclo=999")).status).toBe(404);

  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const wrong = await f.request(
      "/api/fotos/contraste?ciclo=1",
      method,
      {},
    );
    expect(wrong.status).toBe(405);
    expect(wrong.headers.get("allow")).toBe("GET");
    expect(wrong.data.code).toBe("METHOD_NOT_ALLOWED");
  }

  // P8a-A/P8b-A: no archive, no DT9 route and no "corrected photo" surface.
  for (const path of [
    "/api/fotos/archivo",
    "/api/fotos/archivo?ejercicio=2026",
    "/api/fotos?tipoRegistro=Archivo",
    "/api/fotos/ciclos/1/corregir",
    "/api/fotos/ciclos/1/rectificar",
    "/api/fotos/ciclos/1/foto-corregida",
    "/api/fotos/corregida/1",
    "/api/fotos/rectificaciones/1",
  ]) {
    const absent = await f.request(path);
    expect(absent.status).toBe(404);
  }

  expect(snapshotE411(f.db)).toEqual(before);
  expect(f.db.query("SELECT COUNT(*) AS n FROM fotos_cierre").get()).toEqual({
    n: 1,
  });
  expect(f.db.query("SELECT COUNT(*) AS n FROM fotos_periodo").get()).toEqual({
    n: 0,
  });
});
