import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { reabrirCierre } from "./e410";
import { getRevalidacion, type RevalidacionOptions } from "./e410-revalidacion";
import { Problem } from "./problem";

process.env.NODE_ENV = "test";

const now = Date.parse("2026-03-10T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas E4.10 revalidacion " + randomUUID();
const stamp = "2026-01-01T00:00:00.000Z";

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

function fixture() {
  const db = openDatabase(":memory:");
  seedCycles(db);
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
  reabrirCierre(
    db,
    "2",
    { versionEsperada: 1, motivo: "Motivo de reapertura E4.10" },
    "reapertura-" + randomUUID(),
    { actor: "Alex" },
    now,
  );
  return db;
}

function snapshot(db: Database) {
  return {
    ciclos: db.query("SELECT * FROM ciclos ORDER BY id").all(),
    planes: db.query("SELECT * FROM cycle_plans ORDER BY ciclo").all(),
    lineas: db.query("SELECT * FROM cycle_plan_lines ORDER BY ciclo").all(),
    fotos: db.query("SELECT * FROM fotos_cierre ORDER BY ciclo,version").all(),
    reaperturas: db.query("SELECT * FROM reaperturas ORDER BY id").all(),
    activa: db.query("SELECT * FROM reapertura_activa").all(),
    audit: db.query("SELECT * FROM cierre_audit ORDER BY id").all(),
    general: db.query("SELECT * FROM audit ORDER BY id").all(),
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

function check(result: ReturnType<typeof getRevalidacion>, clave: string) {
  return result.comprobaciones.find((item) => item.clave === clave)!;
}

test("E4.10 I3 revalidación: sin E4.5 ni agregados no bloquea y no declara verificado", () => {
  const db = fixture();
  try {
    db.run("INSERT INTO cycle_plans(ciclo,revision) VALUES('3',1)");
    const before = snapshot(db);
    const result = getRevalidacion(db, "2");
    expect(snapshot(db)).toEqual(before);
    expect(result.estado).toBe("Parcial");
    expect(result.bloquea).toBe(false);
    expect(result.version).toBe(1);

    const precontrol = check(result, "precontrolE45");
    expect(precontrol.estado).toBe("NoDisponible");
    expect(precontrol.codigo).toBe("E4_5_NO_DISPONIBLE");
    expect(precontrol.motivo).toContain("E4.5");
    expect(precontrol.comparado).toBeNull();

    const agregados = check(result, "agregadosE411");
    expect(agregados.estado).toBe("NoDisponible");
    expect(agregados.codigo).toBe("E4_11_NO_DISPONIBLE");
    expect(agregados.motivo).toContain("E4.11");
    expect(agregados.comparado).toBeNull();

    expect(check(result, "version").estado).toBe("Verificado");
    expect(check(result, "cierrePosterior").estado).toBe("Verificado");
    expect(check(result, "fotosPosteriores").estado).toBe("Verificado");
    expect(check(result, "s0PlanSiguiente")).toMatchObject({
      estado: "Verificado",
      comparado: {
        siguiente: { id: "3", inicio: "2026-03-01" },
        plan: { estado: "Capturado", revision: 1, lineas: 0 },
      },
    });
    expect(check(result, "auxiliares").estado).toBe("Verificado");
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: E4.5 y agregados coherentes quedan verificados y no modifican nada", () => {
  const db = fixture();
  try {
    const before = snapshot(db);
    const options: RevalidacionOptions = {
      precontrol: () => ({
        estado: "Verificado",
        datos: { precontrol: "coherente", valores: { neto: "100.00" } },
      }),
      agregados: () => ({
        estado: "Verificado",
        datos: { agregados: "coherente", version: 1 },
      }),
    };
    const result = getRevalidacion(db, "2", options);
    expect(result.estado).toBe("Verificado");
    expect(result.bloquea).toBe(false);
    expect(check(result, "precontrolE45")).toMatchObject({
      estado: "Verificado",
      motivo: null,
      comparado: { precontrol: "coherente" },
    });
    expect(check(result, "agregadosE411")).toMatchObject({
      estado: "Verificado",
      motivo: null,
    });
    expect(snapshot(db)).toEqual(before);
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: contradicción material bloquea y conserva valores comparados", () => {
  const db = fixture();
  try {
    const before = snapshot(db);
    const result = getRevalidacion(db, "2", {
      precontrol: () => ({
        estado: "Contradiccion",
        motivo: "El precontrol contradice el cierre reabierto.",
        esperado: { neto: "100.00" },
        observado: { neto: "90.00" },
      }),
    });
    expect(result.estado).toBe("Bloqueante");
    expect(result.bloquea).toBe(true);
    expect(result.bloqueos).toContain("precontrolE45");
    expect(check(result, "precontrolE45")).toMatchObject({
      estado: "Bloqueante",
      codigo: "REVALIDACION_BLOQUEANTE",
      comparado: {
        esperado: { neto: "100.00" },
        observado: { neto: "90.00" },
      },
    });
    expect(snapshot(db)).toEqual(before);
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: datos ilegibles bloquean y no se asumen no bloqueantes", () => {
  const db = fixture();
  try {
    for (const proveedor of [
      () => {
        throw new Error("fuente ilegible");
      },
      () => ({ estado: "Ilegible", motivo: "JSON corrupto" }) as const,
      () => ({ estado: "NoDisponible" }) as never,
      () => ({ estado: "Aviso", motivo: "Diferencia", acreditacion: "" }) as const,
    ]) {
      const result = getRevalidacion(db, "2", { precontrol: proveedor });
      expect(result.estado).toBe("Bloqueante");
      expect(result.bloquea).toBe(true);
      expect(check(result, "precontrolE45").estado).toBe("Bloqueante");
    }
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: una diferencia no material acreditada es aviso, no bloqueo", () => {
  const db = fixture();
  try {
    const before = snapshot(db);
    const result = getRevalidacion(db, "2", {
      precontrol: () => ({
        estado: "Aviso",
        motivo: "El redondeo de presentación difiere; no afecta a los hechos.",
        acreditacion: "Diferencia declarada de presentación; no material.",
        esperado: { neto: "100.00" },
        observado: { neto: "100.001" },
      }),
    });
    expect(result.estado).toBe("ConAvisos");
    expect(result.bloquea).toBe(false);
    expect(result.avisos).toContain("precontrolE45");
    expect(check(result, "precontrolE45")).toMatchObject({
      estado: "Aviso",
      codigo: "AVISO_NO_MATERIAL",
      comparado: {
        esperado: { neto: "100.00" },
        observado: { neto: "100.001" },
        acreditacion: "Diferencia declarada de presentación; no material.",
      },
    });
    expect(snapshot(db)).toEqual(before);
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: una fuente E4.5 que aparece después entra en la siguiente lectura", () => {
  const db = fixture();
  try {
    const first = getRevalidacion(db, "2");
    expect(check(first, "precontrolE45").estado).toBe("NoDisponible");
    const second = getRevalidacion(db, "2", {
      precontrol: () => ({
        estado: "Verificado",
        datos: { precontrol: "disponible en la segunda lectura" },
      }),
    });
    expect(check(second, "precontrolE45").estado).toBe("Verificado");
    // The previous result is immutable evidence; it is not retroactively
    // rewritten when the source appears.
    expect(check(first, "precontrolE45").estado).toBe("NoDisponible");
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: una ventana congelada incoherente con el ciclo siguiente bloquea", () => {
  const db = openDatabase(":memory:");
  try {
    seedCycles(db);
    seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
    seedClosure(db, "2", 1, "2026-02-01", "2026-02-20");
    reabrirCierre(
      db,
      "2",
      { versionEsperada: 1, motivo: "Ventana incoherente" },
      "reapertura-" + randomUUID(),
      { actor: "Alex" },
      now,
    );
    const result = getRevalidacion(db, "2");
    expect(result.estado).toBe("Bloqueante");
    expect(result.bloquea).toBe(true);
    expect(check(result, "s0PlanSiguiente")).toMatchObject({
      estado: "Bloqueante",
      codigo: "S0_PLAN_INCOHERENTE",
      comparado: {
        finFoto: "2026-02-20",
        esperadoFin: "2026-02-28",
      },
    });
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: exige una reapertura activa", () => {
  const db = openDatabase(":memory:");
  try {
    seedCycles(db);
    seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
    const error = problemOf(() => getRevalidacion(db, "1"));
    expect(error.status).toBe(409);
    expect(error.code).toBe("NO_REBIERTO");
  } finally {
    db.close();
  }
});

test("E4.10 I3 API: GET /revalidacion es de solo lectura y POST no se admite", async () => {
  const db = fixture();
  const key = randomBytes(32);
  const handler = HttpApp.toWebHandler(
    createApp(db, { key, now: () => now }),
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
  try {
    expect((await request("/api/cierres/2/revalidacion")).status).toBe(401);
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

    const before = snapshot(db);
    const state = await request("/api/cierres/2/revalidacion");
    expect(state.status).toBe(200);
    expect(state.data).toMatchObject({
      ciclo: "2",
      estado: "Parcial",
      bloquea: false,
      version: 1,
      reapertura: { versionOrigen: 1 },
    });
    expect(state.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot(db)).toEqual(before);

    const post = await request("/api/cierres/2/revalidacion", "POST", {});
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET");
  } finally {
    db.close();
  }
});
