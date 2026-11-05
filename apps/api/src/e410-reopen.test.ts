import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import {
  getReaperturaEstado,
  reabrirCierre,
  type ReaperturaOptions,
} from "./e410";
import { Problem } from "./problem";

process.env.NODE_ENV = "test";

const now = Date.parse("2026-03-10T12:00:00Z");
const iso = new Date(now).toISOString();
const fp = "a".repeat(64);
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas E4.10 " + randomUUID();

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
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  return db;
}

const validBody = { versionEsperada: 1, motivo: "Motivo de reapertura" };
const key = () => "reapertura-" + randomUUID();

test("E4.10 I2: reabre el último cierre y deja cierres, foto y auditoría intactos", () => {
  const db = fixtureDb();
  try {
    const before = snapshot(db);
    const keyValue = key();
    const result = reabrirCierre(
      db,
      "1",
      { versionEsperada: 1, motivo: "  Motivo de reapertura  " },
      keyValue,
      { actor: "  Alex  " },
      now,
    );
    expect(result.estado).toBe("Reabierto");
    expect(result.version).toBe(1);
    expect(result.replayed).toBe(false);
    expect(result.reapertura).toMatchObject({
      versionOrigen: 1,
      actor: "Alex",
      creadoUtc: iso,
      motivo: "Motivo de reapertura",
      fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      correlacion: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      ),
    });
    expect(result.reapertura.id).toBeGreaterThan(0);

    // The append-only event and the singleton projection are coherent.
    expect(
      db
        .query(
          `SELECT ciclo,version_origen,tipo,actor,creado_utc,motivo,
            version_esperada,clave_intento,resultado
           FROM reaperturas WHERE id=?`,
        )
        .get(result.reapertura.id),
    ).toEqual({
      ciclo: "1",
      version_origen: 1,
      tipo: "reapertura",
      actor: "Alex",
      creado_utc: iso,
      motivo: "Motivo de reapertura",
      version_esperada: 1,
      clave_intento: keyValue,
      resultado: "Abierta",
    });
    expect(
      db.query("SELECT id,ciclo,reapertura_id FROM reapertura_activa").get(),
    ).toEqual({ id: 1, ciclo: "1", reapertura_id: result.reapertura.id });

    // E4.9 evidence is untouched.
    expect(snapshot(db)).toEqual(before);

    expect(getReaperturaEstado(db, "1")).toEqual({
      ciclo: "1",
      estado: "Reabierto",
      version: 1,
      reapertura: result.reapertura,
    });
    expect(getReaperturaEstado(db, "2")).toEqual({
      ciclo: "2",
      estado: "SinCierre",
      version: null,
      reapertura: null,
    });
  } finally {
    db.close();
  }
});

test("E4.10 I2: sin cierre no se reabre", () => {
  const db = fixtureDb();
  try {
    const error = problemOf(() => reabrirCierre(db, "2", validBody, key(), {}, now));
    expect(error.status).toBe(409);
    expect(error.code).toBe("SIN_CIERRE");
  } finally {
    db.close();
  }
});

test("E4.10 I2: una versión histórica no se reabre", () => {
  const db = fixtureDb();
  try {
    seedClosure(db, "1", 2, "2026-01-01", "2026-02-28", "Re-cierre");
    const error = problemOf(() =>
      reabrirCierre(db, "1", { versionEsperada: 1, motivo: "Histórica" }, key(), {}, now),
    );
    expect(error.status).toBe(409);
    expect(error.code).toBe("VERSION_CONFLICTO");
    expect(error.details).toEqual({ version: 2, versionEsperada: 1 });
  } finally {
    db.close();
  }
});

test("E4.10 I2: una versión esperada obsoleta informa la versión real", () => {
  const db = fixtureDb();
  try {
    const error = problemOf(() =>
      reabrirCierre(db, "1", { versionEsperada: 9, motivo: "Obsoleta" }, key(), {}, now),
    );
    expect(error.status).toBe(409);
    expect(error.code).toBe("VERSION_CONFLICTO");
    expect(error.details).toEqual({ version: 1, versionEsperada: 9 });
  } finally {
    db.close();
  }
});

test("E4.10 I2: un cierre posterior impide reabrir el ciclo anterior", () => {
  const db = fixtureDb();
  try {
    seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
    const error = problemOf(() => reabrirCierre(db, "1", validBody, key(), {}, now));
    expect(error.status).toBe(409);
    expect(error.code).toBe("NO_ES_ULTIMO_CIERRE");
    expect(
      db.query("SELECT COUNT(*) n FROM reaperturas").get(),
    ).toEqual({ n: 0 });

    // The truly last closure remains eligible.
    const result = reabrirCierre(db, "2", validBody, key(), {}, now);
    expect(result.ciclo).toBe("2");
    expect(result.estado).toBe("Reabierto");
  } finally {
    db.close();
  }
});

test("E4.10 I2: un empate de Fin falla cerrado", () => {
  const db = openDatabase(":memory:");
  try {
    seedCycle(db, "1", "2026-01-01");
    seedCycle(db, "2", "2026-02-01");
    seedClosure(db, "1", 1, "2026-01-01", "2026-03-31");
    seedClosure(db, "2", 1, "2026-02-01", "2026-03-31");
    for (const ciclo of ["1", "2"]) {
      const error = problemOf(() => reabrirCierre(db, ciclo, validBody, key(), {}, now));
      expect(error.status).toBe(409);
      expect(error.code).toBe("NO_ES_ULTIMO_CIERRE");
    }
  } finally {
    db.close();
  }
});

test("E4.10 I2: una sola ventana activa (YA_REABIERTO)", () => {
  const db = fixtureDb();
  try {
    reabrirCierre(db, "1", validBody, key(), {}, now);
    const same = problemOf(() => reabrirCierre(db, "1", validBody, key(), {}, now));
    expect(same.status).toBe(409);
    expect(same.code).toBe("YA_REABIERTO");
    expect(same.details.ciclo).toBe("1");

    // A later closure invalidates the active window (fail-closed).
    seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
    const other = problemOf(() => reabrirCierre(db, "2", validBody, key(), {}, now));
    expect(other.status).toBe(409);
    expect(other.code).toBe("CIERRE_POSTERIOR");
    expect(other.details.ciclo).toBe("1");
    expect(problemOf(() => getReaperturaEstado(db, "1")).code).toBe(
      "CIERRE_POSTERIOR",
    );
  } finally {
    db.close();
  }
});

test("E4.10 I2: una versión histórica de otro ciclo no bloquea si su última versión es anterior", () => {
  const db = openDatabase(":memory:");
  try {
    seedCycle(db, "1", "2026-01-01");
    seedCycle(db, "2", "2026-02-01");
    seedClosure(db, "1", 1, "2026-01-01", "2026-09-30");
    seedClosure(db, "2", 1, "2026-02-01", "2026-12-31");
    seedClosure(db, "2", 2, "2026-02-01", "2026-06-30", "Re-cierre");
    const result = reabrirCierre(db, "1", validBody, key(), {}, now);
    expect(result.estado).toBe("Reabierto");
    expect(result.version).toBe(1);
  } finally {
    db.close();
  }
});

test("E4.10 I2: un fallo antes del commit revierte evento, proyección e intento", () => {
  const db = fixtureDb();
  try {
    expect(() =>
      reabrirCierre(
        db,
        "1",
        validBody,
        key(),
        {
          hooks: {
            beforeCommit: () => {
              throw new Error("fallo inducido");
            },
          },
        },
        now,
      ),
    ).toThrow("fallo inducido");
    expect(db.query("SELECT COUNT(*) n FROM reaperturas").get()).toEqual({ n: 0 });
    expect(
      db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
    ).toEqual({ n: 0 });
    expect(
      db.query("SELECT COUNT(*) n FROM reapertura_attempts").get(),
    ).toEqual({ n: 0 });
    expect(getReaperturaEstado(db, "1").estado).toBe("Cerrado");
  } finally {
    db.close();
  }
});

test("E4.10 I2: un resultado corrupto en la proyección es ESTADO_INCONSISTENTE", () => {
  const db = fixtureDb();
  try {
    db.run(
      `INSERT INTO reaperturas(ciclo,version_origen,tipo,actor,creado_utc,
        motivo,fingerprint_peticion,version_esperada,clave_intento,correlacion,
        reapertura_origen,resultado)
       VALUES('1',1,'reapertura','usuario-unico',?,'Motivo ficticio',?,1,
        'clave-corrupta','corr',NULL,'Otra')`,
      [iso, fp],
    );
    db.run("INSERT INTO reapertura_activa(id,ciclo,reapertura_id) VALUES(1,'1',1)");
    expect(problemOf(() => getReaperturaEstado(db, "1")).code).toBe(
      "ESTADO_INCONSISTENTE",
    );
  } finally {
    db.close();
  }
});

for (const [name, body, options, keyValue] of [
  ["motivo vacío", { versionEsperada: 1, motivo: "   " }, {}, key()],
  ["motivo largo", { versionEsperada: 1, motivo: "x".repeat(1001) }, {}, key()],
  ["motivo no string", { versionEsperada: 1, motivo: 3 }, {}, key()],
  ["campo extra", { ...validBody, extra: true }, {}, key()],
  ["versión cero", { versionEsperada: 0, motivo: "x" }, {}, key()],
  ["versión decimal", { versionEsperada: 1.5, motivo: "x" }, {}, key()],
  ["versión string", { versionEsperada: "1", motivo: "x" }, {}, key()],
  ["actor vacío", validBody, { actor: "   " }, key()],
  ["actor largo", validBody, { actor: "x".repeat(201) }, key()],
  ["clave vacía", validBody, {}, ""],
  ["clave corta", validBody, {}, "corta"],
  ["clave con espacios", validBody, {}, "clave con espacios"],
] as const) {
  test(`E4.10 I2: rechaza ${name}`, () => {
    const db = fixtureDb();
    try {
      const error = problemOf(() =>
        reabrirCierre(db, "1", body, keyValue, options as ReaperturaOptions, now),
      );
      expect(error.status).toBe(422);
      expect(["VALIDATION", "IDEMPOTENCY_REQUIRED"]).toContain(error.code);
      expect(
        db.query("SELECT COUNT(*) n FROM reaperturas").get(),
      ).toEqual({ n: 0 });
    } finally {
      db.close();
    }
  });
}

test("E4.10 I2: replay idéntico devuelve la misma reapertura sin duplicar", () => {
  const db = fixtureDb();
  try {
    const keyValue = key();
    const first = reabrirCierre(db, "1", validBody, keyValue, {}, now);
    const replay = reabrirCierre(db, "1", validBody, keyValue, {}, now);
    expect(replay.replayed).toBe(true);
    expect(replay.reapertura).toEqual(first.reapertura);
    expect(replay.version).toBe(first.version);
    expect(
      db.query("SELECT COUNT(*) n FROM reaperturas").get(),
    ).toEqual({ n: 1 });

    const conflict = problemOf(() =>
      reabrirCierre(
        db,
        "1",
        { versionEsperada: 1, motivo: "Otro motivo" },
        keyValue,
        {},
        now,
      ),
    );
    expect(conflict.status).toBe(409);
    expect(conflict.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(
      db.query("SELECT COUNT(*) n FROM reaperturas").get(),
    ).toEqual({ n: 1 });
  } finally {
    db.close();
  }
});

test("E4.10 I2: limpia intentos expirados de otras claves", () => {
  const db = fixtureDb();
  try {
    db.run(
      "INSERT INTO reapertura_attempts(operacion,key,hash,response,expires) VALUES('reapertura','otra-clave-expirada',?, '{}',?)",
      [fp, now - 1],
    );
    reabrirCierre(db, "1", validBody, key(), {}, now);
    expect(
      db
        .query(
          "SELECT COUNT(*) n FROM reapertura_attempts WHERE key='otra-clave-expirada'",
        )
        .get(),
    ).toEqual({ n: 0 });
    expect(
      db
        .query("SELECT COUNT(*) n FROM reapertura_attempts WHERE operacion='reapertura'")
        .get(),
    ).toEqual({ n: 1 });
  } finally {
    db.close();
  }
});

test("E4.10 I2: proyección que apunta a una cancelación es ESTADO_INCONSISTENTE", () => {
  const db = fixtureDb();
  try {
    const reopened = reabrirCierre(db, "1", validBody, key(), {}, now);
    db.run(
      `INSERT INTO reaperturas(ciclo,version_origen,tipo,actor,creado_utc,motivo,
        fingerprint_peticion,version_esperada,clave_intento,correlacion,
        reapertura_origen,resultado)
       VALUES('1',1,'cancelacion','usuario-unico',?, 'Cancelación',?,1,
        'clave-cancelacion','corr',?,'Cancelada')`,
      [iso, "b".repeat(64), reopened.reapertura.id],
    );
    const cancelId = Number(
      (
        db
          .query("SELECT id FROM reaperturas WHERE tipo='cancelacion'")
          .get() as { id: number }
      ).id,
    );
    db.run("UPDATE reapertura_activa SET reapertura_id=? WHERE id=1", [cancelId]);
    const error = problemOf(() => getReaperturaEstado(db, "1"));
    expect(error.status).toBe(500);
    expect(error.code).toBe("ESTADO_INCONSISTENTE");
  } finally {
    db.close();
  }
});

test("E4.10 I2: proyección que apunta a otro ciclo es ESTADO_INCONSISTENTE", () => {
  const db = fixtureDb();
  try {
    seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
    db.run(
      `INSERT INTO reaperturas(ciclo,version_origen,tipo,actor,creado_utc,motivo,
        fingerprint_peticion,version_esperada,clave_intento,correlacion,
        reapertura_origen,resultado)
       VALUES('2',1,'reapertura','usuario-unico',?, 'Motivo',?,1,
        'clave-otro-ciclo','corr',NULL,'Abierta')`,
      [iso, fp],
    );
    const otherId = Number(
      (
        db.query("SELECT id FROM reaperturas WHERE ciclo='2'").get() as {
          id: number;
        }
      ).id,
    );
    db.exec("PRAGMA foreign_keys=OFF");
    db.run(
      "INSERT INTO reapertura_activa(id,ciclo,reapertura_id) VALUES(1,'1',?)",
      [otherId],
    );
    db.exec("PRAGMA foreign_keys=ON");
    const error = problemOf(() => getReaperturaEstado(db, "1"));
    expect(error.status).toBe(500);
    expect(error.code).toBe("ESTADO_INCONSISTENTE");
  } finally {
    db.close();
  }
});

test("E4.10 I2: proyección sobre una versión no última es ESTADO_INCONSISTENTE", () => {
  const db = fixtureDb();
  try {
    reabrirCierre(db, "1", validBody, key(), {}, now);
    seedClosure(db, "1", 2, "2026-01-01", "2026-02-28", "Re-cierre");
    const error = problemOf(() => getReaperturaEstado(db, "1"));
    expect(error.status).toBe(500);
    expect(error.code).toBe("ESTADO_INCONSISTENTE");
  } finally {
    db.close();
  }
});

test("E4.10 I2: SQL rechaza operación/clave/resultado vacíos", () => {
  const db = fixtureDb();
  try {
    expect(() =>
      db.run(
        "INSERT INTO reapertura_attempts(operacion,key,hash,response,expires) VALUES('','k',?, '{}',1)",
        [fp],
      ),
    ).toThrow();
    expect(() =>
      db.run(
        `INSERT INTO reaperturas(ciclo,version_origen,tipo,actor,creado_utc,motivo,
          fingerprint_peticion,version_esperada,clave_intento,correlacion,
          reapertura_origen,resultado)
         VALUES('1',1,'reapertura','usuario-unico',?, 'Motivo',?,1,'','corr',
          NULL,'Abierta')`,
        [iso, fp],
      ),
    ).toThrow();
    expect(() =>
      db.run(
        `INSERT INTO reaperturas(ciclo,version_origen,tipo,actor,creado_utc,motivo,
          fingerprint_peticion,version_esperada,clave_intento,correlacion,
          reapertura_origen,resultado)
         VALUES('1',1,'reapertura','usuario-unico',?, 'Motivo',?,1,'clave-x','corr',
          NULL,'   ')`,
        [iso, fp],
      ),
    ).toThrow();
  } finally {
    db.close();
  }
});

test("E4.10 I2: dos procesos concurrentes solo abren una ventana", async () => {
  const dir = mkdtempSync(join(tmpdir(), "e410-concurrent-"));
  try {
    const path = join(dir, "concurrent.sqlite");
    const seed = openDatabase(path);
    seedCycle(seed, "1", "2026-01-01");
    seedClosure(seed, "1", 1, "2026-01-01", "2026-01-31");
    seed.close();

    const database = resolve("apps/api/src/database.ts"),
      reopening = resolve("apps/api/src/e410.ts");
    const script = `import{openDatabase}from${JSON.stringify(database)};import{reabrirCierre}from${JSON.stringify(reopening)};const db=openDatabase(process.argv[1]);try{const r=reabrirCierre(db,'1',{versionEsperada:1,motivo:'Carrera'},process.argv[2],{actor:'prueba'},${now});process.stdout.write(JSON.stringify({ok:true,id:r.reapertura.id}));}catch(e){process.stdout.write(JSON.stringify({ok:false,code:e?.code??String(e)}));}finally{db.close();}`;
    const children = [key(), key()].map((keyValue) =>
      Bun.spawn([process.execPath, "-e", script, path, keyValue], {
        env: { ...process.env, NODE_ENV: "test" },
        stdout: "pipe",
        stderr: "pipe",
      }),
    );
    const results = await Promise.all(
      children.map(async (child) => {
        expect(await child.exited).toBe(0);
        expect(await new Response(child.stderr).text()).toBe("");
        return JSON.parse(await new Response(child.stdout).text()) as {
          ok: boolean;
          code?: string;
          id?: number;
        };
      }),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).map((r) => r.code)).toEqual([
      "YA_REABIERTO",
    ]);

    const db = openDatabase(path);
    try {
      expect(db.query("SELECT COUNT(*) n FROM reaperturas").get()).toEqual({
        n: 1,
      });
      expect(
        db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
      ).toEqual({ n: 1 });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function apiFixture(options: ReaperturaOptions = { actor: "Alex" }) {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2026-01-01");
  seedCycle(db, "2", "2026-02-01");
  seedCycle(db, "3", "2026-03-01");
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  const keyBytes = randomBytes(32);
  const handler = HttpApp.toWebHandler(
    createApp(db, { key: keyBytes, now: () => now, reapertura: options }),
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
  return { db, request, enroll };
}

test("E4.10 I2 API: exige sesión, MFA, CSRF/Origin e idempotencia", async () => {
  const f = apiFixture();
  try {
    const keyValue = key();
    expect((await f.request("/api/cierres/1/reapertura")).status).toBe(401);
    expect(
      (
        await f.request("/api/cierres/1/reabrir", "POST", validBody, {
          "idempotency-key": keyValue,
        })
      ).status,
    ).toBe(401);
    await f.enroll();

    const state = await f.request("/api/cierres/1/reapertura");
    expect(state.status).toBe(200);
    expect(state.data).toEqual({
      ciclo: "1",
      estado: "Cerrado",
      version: 1,
      reapertura: null,
    });

    const wrongOrigin = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      validBody,
      { origin: "http://evil.example", "idempotency-key": keyValue },
    );
    expect(wrongOrigin.status).toBe(403);
    expect(wrongOrigin.data.code).toBe("ORIGIN");

    const noCsrf = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      validBody,
      { "x-csrf-token": "", "idempotency-key": keyValue },
    );
    expect(noCsrf.status).toBe(403);
    expect(noCsrf.data.code).toBe("CSRF");

    const noKey = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      validBody,
    );
    expect(noKey.status).toBe(422);
    expect(noKey.data.code).toBe("IDEMPOTENCY_REQUIRED");

    const opened = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      validBody,
      { "idempotency-key": keyValue },
    );
    expect(opened.status).toBe(201);
    expect(opened.headers.get("location")).toBe(
      "/api/cierres/1/reapertura",
    );
    expect(opened.data).toMatchObject({
      ciclo: "1",
      estado: "Reabierto",
      version: 1,
      replayed: false,
      reapertura: {
        versionOrigen: 1,
        actor: "Alex",
        motivo: "Motivo de reapertura",
      },
    });

    const replay = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      validBody,
      { "idempotency-key": keyValue },
    );
    expect(replay.status).toBe(201);
    expect(replay.data.replayed).toBe(true);
    expect(replay.data.reapertura).toEqual(opened.data.reapertura);

    const conflict = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      { versionEsperada: 1, motivo: "Distinto" },
      { "idempotency-key": keyValue },
    );
    expect(conflict.status).toBe(409);
    expect(conflict.data.code).toBe("IDEMPOTENCY_CONFLICT");

    const reopened = await f.request("/api/cierres/1/reapertura");
    expect(reopened.status).toBe(200);
    expect(reopened.data).toEqual({
      ciclo: "1",
      estado: "Reabierto",
      version: 1,
      reapertura: opened.data.reapertura,
    });

    const estado = await f.request("/api/cierres/1/estado");
    expect(estado.status).toBe(200);
    expect(estado.data).toHaveProperty("e4_9Bloqueado");
    expect(estado.data).toHaveProperty("bloqueos");
    expect(estado.data.cierre.estado).toBe("Cerrado");
    expect(estado.data.cierre.version).toBe(1);
    expect(estado.data.reapertura).toEqual({
      ciclo: "1",
      estado: "Reabierto",
      version: 1,
      reapertura: opened.data.reapertura,
    });

    const getOnPost = await f.request("/api/cierres/1/reabrir");
    expect(getOnPost.status).toBe(405);
    expect(getOnPost.headers.get("allow")).toBe("POST");

    const postOnGet = await f.request(
      "/api/cierres/1/reapertura",
      "POST",
      {},
    );
    expect(postOnGet.status).toBe(405);
    expect(postOnGet.headers.get("allow")).toBe("GET");
  } finally {
    f.db.close();
  }
});
