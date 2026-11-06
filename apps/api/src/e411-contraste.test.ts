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

// Fixture mínimo de E4.9: se rellenan con formas contractuales solo los
// bloques que consume este incremento. No reproduce el payload completo.
const noDisponibleMotivo =
  "Sentinel persistido que el motor vivo no debe leer";
const fotoNoDisponible = {
  nomina: { estado: "No disponible", motivo: noDisponibleMotivo },
};
const fotoCobertura = {
  estado: "Parcial",
  totales: {
    nomina: { estado: "No disponible", motivo: noDisponibleMotivo },
    plan: { estado: "Completo", motivo: "Fixture mínimo" },
  },
};
const fotoHechos = {
  estado: "Sin hechos",
  movimientos: [],
  fuentes: [],
  totales: {},
};
const fotoPlan = {
  estado: "Capturado",
  items: [],
  revision: 1,
  contextRevision: "fixture-minimo",
  sinPlanificar: false,
};
const fotoClasificacion = {
  categorias: [],
  subcategorias: [],
  partidas: [],
  referencias: [],
};
const fotoInversion = {
  efectivo: null,
  cuentas: [],
  posiciones: [],
  operaciones: [],
  instrumentos: [],
  valoracion: "No disponible",
  motivoValoracion: "Fixture mínimo E4.11 I4",
};
const fotoAuxiliares = {
  anticipos: [],
  compartidos: [],
  nomina: [],
  revisionComida: [],
  deuda: [],
  e35: { verificable: false, huella: null, datos: null },
};
const fotoBackup = {
  verificado: false,
  restauracionProbada: false,
  referencia: null,
  motivo: "Fixture mínimo E4.11 I4",
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
      [
        ciclo,
        version,
        inicio,
        fin,
        saldoInicial,
        creado,
        "Cierre ficticio E4.11 I4",
        fp,
      ],
    );
    db.run(
      // `schema_version` es metadato de la foto: el fixture representa una
      // captura v26, no la versión con la que se abre la base de pruebas.
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,
        fingerprint,app_version,schema_version,ventana_inicio,ventana_fin,
        saldo_inicial,estado_temporal,estado_hechos,estado_plan,hechos,plan,
        clasificacion,inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES(?,?,?,'usuario-unico',?,?,'0.0.0-fixture',26,?,?,?,'Cerrado',
        'Sin hechos','Capturado',?,?,?,?,?,?,?,?)`,
      [
        ciclo,
        version,
        creado,
        "Cierre ficticio E4.11 I4",
        fp,
        inicio,
        fin,
        saldoInicial,
        JSON.stringify(fotoHechos),
        JSON.stringify(fotoPlan),
        JSON.stringify(fotoClasificacion),
        JSON.stringify(fotoInversion),
        JSON.stringify(fotoAuxiliares),
        JSON.stringify(fotoCobertura),
        JSON.stringify(fotoBackup),
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
  ).map(({ name }) => [name, db.query(`SELECT * FROM "${name}"`).all()]);
}

// Product/E4.11 tables only. Auth updates `sessions.seen` on every request.
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

test("E4.11 I4: T2 real por API (plan vivo) deja la foto intacta y cambia solo el vivo", async () => {
  const f = fixture();
  seedClosure(f.db, "1", 1, "2026-06-20", "2026-07-19", 0);
  await f.enroll();

  const fotoAntes = getFotoCiclo(f.db, "1");
  const vivoAntes = getContraste(f.db, "1", now);
  expect(vivoAntes.metricas.base.valor).toBe("1600.00");

  const current = await f.request("/api/planes-ciclo/1");
  expect(current.status).toBe(200);
  const propuesta = {
    revision: current.data.revision,
    contextRevision: current.data.contextRevision,
    cambios: [{ presupuesto: "PRE001", base: "1500.00" }],
  };
  const preview = await f.request(
    "/api/planes-ciclo/1/impacto",
    "POST",
    propuesta,
  );
  expect(preview.status).toBe(200);
  expect(preview.data.requiereMotivo).toBe(true);
  expect(preview.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);

  const confirmed = await f.request(
    "/api/planes-ciclo/1/confirmar",
    "POST",
    {
      propuesta,
      fingerprint: preview.data.fingerprint,
      motivo: "T2 ficticio de plan vivo E4.11 I4",
    },
    { "idempotency-key": "e411-i4-t2-" + randomUUID() },
  );
  expect(confirmed.status).toBe(200);

  const fotoDespues = getFotoCiclo(f.db, "1");
  expect(fotoDespues).toEqual(fotoAntes);
  expect(fotoDespues.foto?.noDisponible).toEqual(fotoNoDisponible);
  expect(fotoDespues.foto?.cobertura).toEqual(fotoCobertura);

  const vivoDespues = getContraste(f.db, "1", now);
  expect(vivoDespues.revision).not.toBe(vivoAntes.revision);
  expect(vivoDespues.metricas.base).toMatchObject({
    valor: "1500.00",
    estado: "Verificado",
    origen: "CalculoVivo",
    noEsHistorico: true,
  });
  expect(vivoDespues.origen).toBe("CalculoVivo");
  expect(vivoDespues.noEsHistorico).toBe(true);
  expect(JSON.stringify(fotoDespues)).not.toContain("1500.00");
  expect(JSON.stringify(vivoDespues)).not.toContain(noDisponibleMotivo);
});

test("E4.11 I4: T3 real por API (renombrado) deja la foto y los valores vivos intactos", async () => {
  const f = fixture();
  seedClosure(f.db, "1", 1, "2026-06-20", "2026-07-19", 0);
  await f.enroll();

  const fotoAntes = getFotoCiclo(f.db, "1");
  const vivoAntes = getContraste(f.db, "1", now);

  const currentPartida = await f.request(
    "/api/clasificacion/partidas/PAR001",
  );
  expect(currentPartida.status).toBe(200);
  const renamed = await f.request(
    "/api/clasificacion/partidas/PAR001",
    "PATCH",
    {
      nombre: "Partida renombrada E4.11 I4",
      revision: currentPartida.data.item.revision,
    },
  );
  expect(renamed.status).toBe(200);
  expect(renamed.data.item).toMatchObject({
    id: "PAR001",
    nombre: "Partida renombrada E4.11 I4",
  });

  expect(getFotoCiclo(f.db, "1")).toEqual(fotoAntes);
  const vivoDespues = getContraste(f.db, "1", now);
  expect(vivoDespues.metricas.base.valor).toBe(vivoAntes.metricas.base.valor);
  expect(vivoDespues.metricas.nomina.subtotal).toBe(
    vivoAntes.metricas.nomina.subtotal,
  );
  expect(vivoDespues.metricas.gasto.subtotal).toBe(
    vivoAntes.metricas.gasto.subtotal,
  );
  expect(vivoDespues.origen).toBe("CalculoVivo");
  expect(vivoDespues.noEsHistorico).toBe(true);
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

test("E4.11 I4: ruta GET, 405, matriz negativa y snapshot de producto sin altas", async () => {
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

  // P8b-A: cualquier selector de otra fuente se rechaza; no se mezcla E4.5.
  for (const query of ["Archivo", "", "Foto"]) {
    const wrongSource = await f.request(
      `/api/fotos/contraste?ciclo=1&tipoRegistro=${query}`,
    );
    expect(wrongSource.status).toBe(422);
    expect(wrongSource.data.code).toBe("VALIDATION");
    expect(wrongSource.data.fields.tipoRegistro).toContain("no admitido");
    expect(wrongSource.data).not.toHaveProperty("origen");
  }

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

  // The snapshot excludes `sessions.seen`, updated by authenticated requests.
  expect(snapshotE411(f.db)).toEqual(before);
  expect(f.db.query("SELECT COUNT(*) AS n FROM fotos_cierre").get()).toEqual({
    n: 1,
  });
  expect(f.db.query("SELECT COUNT(*) AS n FROM fotos_periodo").get()).toEqual({
    n: 0,
  });
});
