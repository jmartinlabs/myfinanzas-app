import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { Problem } from "./problem";
import { reabrirCierre } from "./e410";
import { getFotoCiclo, getVersionesFotoCiclo } from "./e411";

process.env.NODE_ENV = "test";

const now = Date.parse("2026-03-10T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas E4.11 " + randomUUID();
const fp = "a".repeat(64);

function seedCycle(db: Database, id: string, inicio: string) {
  db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,?,?)", [
    id,
    inicio,
    10000,
    "2026-01-01T00:00:00.000Z",
  ]);
}

function seedClosure(
  db: Database,
  ciclo: string,
  version: number,
  inicio: string,
  fin: string,
  motivo: string | null = null,
) {
  const creado = `2026-0${Math.min(version, 9)}-01T00:00:00.000Z`;
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,
        creado_utc,motivo,fingerprint,estado)
       VALUES(?,?,?,?,10000,'usuario-unico',?,?,?,'Cerrado')`,
      [ciclo, version, inicio, fin, creado, motivo, fp],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,
        fingerprint,app_version,schema_version,ventana_inicio,ventana_fin,
        saldo_inicial,estado_temporal,estado_hechos,estado_plan,hechos,plan,
        clasificacion,inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES(?,?,?,'usuario-unico',?,?,'0.0.0-fixture',26,?,?,10000,'Cerrado',
        'Sin hechos','SinPlan','{}','{}','{}','{}','{}','{}','{}','{}')`,
      [ciclo, version, creado, motivo, fp, inicio, fin],
    );
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES(?,?,'cierre',NULL,'{}',?,?,'usuario-unico')`,
      [ciclo, version, motivo, creado],
    );
  })();
}

function snapshot(db: Database) {
  return {
    cierres: db.query("SELECT * FROM cierres ORDER BY ciclo,version").all(),
    fotos: db.query("SELECT * FROM fotos_cierre ORDER BY ciclo,version").all(),
    audit: db.query("SELECT * FROM cierre_audit ORDER BY id").all(),
    reaperturas: db.query("SELECT * FROM reaperturas ORDER BY id").all(),
    activa: db.query("SELECT * FROM reapertura_activa").all(),
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

function fixtureDb() {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2026-01-01");
  seedCycle(db, "2", "2026-02-01");
  return db;
}

function t2t3Changes(db: Database) {
  // T2: a new live fact/classification. T3: a renamed Partida. Neither is
  // visible to the persisted photo and both must leave it byte-identical.
  db.exec(`
    INSERT INTO categorias(id,nombre,grupo,anual,mensual,referencia,estado,revision,creado,actualizado)
    VALUES('CAT411','Comida ficticia E4.11','Gasto','Gasto','Gasto',0,'Activa',1,'f','f');
    INSERT INTO subcategorias(id,nombre,padre,estado,revision,creado,actualizado)
    VALUES('SUB411','Subcategoría ficticia E4.11','CAT411','Activa',1,'f','f');
    INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda,presupuesto)
    VALUES('PAR411','Partida ficticia E4.11','SUB411','Activa',1,'f','f',NULL,NULL);
  `);
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
       partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
       capital,intereses)
     VALUES('9411','2026-02-15','Ingreso',1234,'S000','S001','Nómina',
       NULL,NULL,'Hecho ficticio E4.11','',0,1,'2026-02-15T00:00:00.000Z',
       '2026-02-15T00:00:00.000Z',NULL,NULL)`,
  );
  db.run("UPDATE partidas SET nombre='Partida renombrada E4.11' WHERE id='PAR411'");
}

function fixture() {
  const db = openDatabase(":memory:");
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

test("E4.11 I1: foto v1 es idéntica tras T2/T3 y no escribe", () => {
  const db = fixtureDb();
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31", "Cierre ficticio");
  const beforePhoto = getFotoCiclo(db, "1");
  const beforeSnapshot = snapshot(db);

  expect(beforePhoto).toMatchObject({
    origen: "Foto",
    estadoFoto: "Disponible",
    estado: "Disponible",
    motivo: null,
    seleccionAplicada: { version: 1, porDefecto: true, regla: "P7-D" },
    vigente: true,
    reapertura: { estado: "Cerrado", version: 1 },
    cierre: {
      version: 1,
      inicio: "2026-01-01",
      fin: "2026-01-31",
      fingerprint: fp,
    },
    foto: {
      version: 1,
      fingerprint: fp,
      appVersion: "0.0.0-fixture",
      schemaVersion: 26,
      ventana: { inicio: "2026-01-01", fin: "2026-01-31" },
    },
  });

  t2t3Changes(db);

  const afterPhoto = getFotoCiclo(db, "1");
  expect(afterPhoto).toEqual(beforePhoto);
  expect(snapshot(db)).toEqual(beforeSnapshot);
});

test("E4.11 I1: v1 y v2 con selección explícita, sin modificar ninguna", () => {
  const db = fixtureDb();
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  seedClosure(db, "1", 2, "2026-01-01", "2026-01-31", "Re-cierre ficticio");
  const before = snapshot(db);

  const v1 = getFotoCiclo(db, "1", 1);
  expect(v1.seleccionAplicada).toEqual({
    version: 1,
    porDefecto: false,
    regla: "P7-D",
  });
  expect(v1.vigente).toBe(false);
  expect(v1.estado).toBe("Disponible");
  expect(v1.foto?.version).toBe(1);
  expect(v1.cierre?.version).toBe(1);

  const v2 = getFotoCiclo(db, "1", 2);
  expect(v2.seleccionAplicada).toEqual({
    version: 2,
    porDefecto: false,
    regla: "P7-D",
  });
  expect(v2.vigente).toBe(true);
  expect(v2.foto?.version).toBe(2);

  const ultima = getFotoCiclo(db, "1");
  expect(ultima.seleccionAplicada).toEqual({
    version: 2,
    porDefecto: true,
    regla: "P7-D",
  });
  expect(ultima.vigente).toBe(true);

  expect(getVersionesFotoCiclo(db, "1")).toEqual([
    expect.objectContaining({
      version: 2,
      esUltima: true,
      vigente: true,
      estado: "Disponible",
    }),
    expect.objectContaining({
      version: 1,
      esUltima: false,
      vigente: false,
      estado: "Disponible",
    }),
  ]);

  // Reading v1 again after consulting v2 returns the same persisted evidence.
  expect(getFotoCiclo(db, "1", 1)).toEqual(v1);
  expect(snapshot(db)).toEqual(before);
});

test("E4.11 I1: reabierto sin v2 mantiene v1 consultable pero no vigente", () => {
  const db = fixtureDb();
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  const beforeE49 = {
    cierres: db.query("SELECT * FROM cierres ORDER BY ciclo,version").all(),
    fotos: db.query("SELECT * FROM fotos_cierre ORDER BY ciclo,version").all(),
  };
  reabrirCierre(
    db,
    "1",
    { versionEsperada: 1, motivo: "Reapertura ficticia E4.11" },
    "reapertura-" + randomUUID(),
    { actor: "usuario-unico" },
    now,
  );

  const photo = getFotoCiclo(db, "1");
  expect(photo.estadoFoto).toBe("Disponible");
  expect(photo.estado).toBe("PendienteReCierre");
  expect(photo.motivo).toBe("PENDIENTE_RE_CIERRE");
  expect(photo.vigente).toBe(false);
  expect(photo.seleccionAplicada.version).toBe(1);
  expect(photo.foto?.version).toBe(1);
  expect(photo.reapertura).toMatchObject({
    estado: "Reabierto",
    version: 1,
    reapertura: { motivo: "Reapertura ficticia E4.11" },
  });

  expect(getVersionesFotoCiclo(db, "1")).toEqual([
    expect.objectContaining({
      version: 1,
      esUltima: true,
      vigente: false,
      estado: "PendienteReCierre",
    }),
  ]);

  // P4-A: no new photo and no change to E4.9 evidence.
  expect({
    cierres: db.query("SELECT * FROM cierres ORDER BY ciclo,version").all(),
    fotos: db.query("SELECT * FROM fotos_cierre ORDER BY ciclo,version").all(),
  }).toEqual(beforeE49);
});

test("E4.11 I1: precedencia explícita de estadoFoto, estado, motivo y vigente", () => {
  const pick = (data: ReturnType<typeof getFotoCiclo>) => ({
    estadoFoto: data.estadoFoto,
    estado: data.estado,
    motivo: data.motivo,
    vigente: data.vigente,
  });

  // Latest closed version vs an explicitly requested previous version.
  const v1v2 = fixtureDb();
  seedClosure(v1v2, "1", 1, "2026-01-01", "2026-01-31");
  seedClosure(v1v2, "1", 2, "2026-01-01", "2026-01-31", "Re-cierre ficticio");
  expect(pick(getFotoCiclo(v1v2, "1"))).toEqual({
    estadoFoto: "Disponible",
    estado: "Disponible",
    motivo: null,
    vigente: true,
  });
  expect(pick(getFotoCiclo(v1v2, "1", 1))).toEqual({
    estadoFoto: "Disponible",
    estado: "Disponible",
    motivo: null,
    vigente: false,
  });
  expect(pick(getFotoCiclo(v1v2, "1", 2))).toEqual({
    estadoFoto: "Disponible",
    estado: "Disponible",
    motivo: null,
    vigente: true,
  });

  // Reopened without v2: availability is unchanged, state/motivo are marked,
  // and v1 is consultable but no longer current.
  const reabierto = fixtureDb();
  seedClosure(reabierto, "1", 1, "2026-01-01", "2026-01-31");
  reabrirCierre(
    reabierto,
    "1",
    { versionEsperada: 1, motivo: "Reapertura ficticia de precedencia" },
    "reapertura-" + randomUUID(),
    { actor: "usuario-unico" },
    now,
  );
  expect(pick(getFotoCiclo(reabierto, "1"))).toEqual({
    estadoFoto: "Disponible",
    estado: "PendienteReCierre",
    motivo: "PENDIENTE_RE_CIERRE",
    vigente: false,
  });

  // Cycle with no closure: no empty photo, no zero, explicit motive.
  const sinCierre = fixtureDb();
  expect(pick(getFotoCiclo(sinCierre, "2"))).toEqual({
    estadoFoto: "SinFoto",
    estado: "SinFoto",
    motivo: "SIN_CIERRE",
    vigente: false,
  });
});

test("E4.11 I1: SinFoto, ciclo inexistente y versión inexistente", () => {
  const db = fixtureDb();
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");

  const sinFoto = getFotoCiclo(db, "2");
  expect(sinFoto).toMatchObject({
    origen: "Foto",
    estadoFoto: "SinFoto",
    estado: "SinFoto",
    motivo: "SIN_CIERRE",
    seleccionAplicada: { version: null, porDefecto: true, regla: "P7-D" },
    vigente: false,
    cierre: null,
    foto: null,
    reapertura: { estado: "SinCierre", version: null },
  });
  expect(getVersionesFotoCiclo(db, "2")).toEqual([]);

  const missingCycle = problemOf(() => getFotoCiclo(db, "999"));
  expect(missingCycle.status).toBe(404);
  expect(missingCycle.code).toBe("NOT_FOUND");
  expect(problemOf(() => getVersionesFotoCiclo(db, "999")).status).toBe(404);

  const missingVersion = problemOf(() => getFotoCiclo(db, "1", 9));
  expect(missingVersion.status).toBe(404);
  expect(missingVersion.code).toBe("NOT_FOUND");

  // No silent fallback on a cycle with no closure either.
  expect(problemOf(() => getFotoCiclo(db, "2", 1)).status).toBe(404);
});

test("E4.11 I1: rutas GET, 405 sin escrituras y snapshot estable", async () => {
  const f = fixture();
  seedCycle(f.db, "1", "2026-01-01");
  seedCycle(f.db, "2", "2026-02-01");
  seedClosure(f.db, "1", 1, "2026-01-01", "2026-01-31");

  expect((await f.request("/api/fotos/ciclos/1")).status).toBe(401);
  expect((await f.request("/api/fotos/ciclos/1/versiones")).status).toBe(401);

  await f.enroll();
  const before = snapshot(f.db);

  const photo = await f.request("/api/fotos/ciclos/1");
  expect(photo.status).toBe(200);
  expect(photo.headers.get("cache-control")).toBe("no-store");
  expect(photo.data).toMatchObject({
    origen: "Foto",
    estadoFoto: "Disponible",
    seleccionAplicada: { version: 1, porDefecto: true, regla: "P7-D" },
    vigente: true,
    foto: { version: 1 },
  });

  const versions = await f.request("/api/fotos/ciclos/1/versiones");
  expect(versions.status).toBe(200);
  expect(versions.data).toEqual([
    expect.objectContaining({ version: 1, esUltima: true, vigente: true }),
  ]);

  const sinCiclo = await f.request("/api/fotos/ciclos/2");
  expect(sinCiclo.status).toBe(200);
  expect(sinCiclo.data).toMatchObject({
    estadoFoto: "SinFoto",
    motivo: "SIN_CIERRE",
  });

  expect((await f.request("/api/fotos/ciclos/999")).status).toBe(404);
  expect((await f.request("/api/fotos/ciclos/1?version=9")).status).toBe(404);
  expect((await f.request("/api/fotos/ciclos/1?version=0")).status).toBe(422);

  // P8a-A/DT9: no "corrected photo" or old-cycle rectification route exists.
  expect((await f.request("/api/fotos/ciclos/1/corregir")).status).toBe(404);
  expect((await f.request("/api/fotos/ciclos/1/rectificar")).status).toBe(404);

  for (const method of ["POST", "PATCH", "DELETE"]) {
    const wrongPhoto = await f.request("/api/fotos/ciclos/1", method, {});
    expect(wrongPhoto.status).toBe(405);
    expect(wrongPhoto.headers.get("allow")).toBe("GET");
    expect(wrongPhoto.data.code).toBe("METHOD_NOT_ALLOWED");

    const wrongVersions = await f.request(
      "/api/fotos/ciclos/1/versiones",
      method,
      {},
    );
    expect(wrongVersions.status).toBe(405);
    expect(wrongVersions.headers.get("allow")).toBe("GET");
    expect(wrongVersions.data.code).toBe("METHOD_NOT_ALLOWED");
  }

  expect(snapshot(f.db)).toEqual(before);
});
