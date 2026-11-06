import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { getReaperturaEstado, reabrirCierre } from "./e410";
import { reCerrarCiclo } from "./e410-recierre";
import { cancelarReapertura } from "./e410-cancelacion";
import {
  confirmCierre,
  previewCierre,
  type CierreOptions,
} from "./e49";
import { Problem } from "./problem";

/**
 * E4.10 I8 — regresión y evidencia de cierre (no nuevos AC ni reglas).
 *
 * Cubre los huecos que I2–I7 no ejercitaban a nivel de superficie:
 *  - AC01: el rechazo por cierre posterior no altera el cierre posterior;
 *  - AC07/AC14: PATCH/DELETE se rechazan en todas las rutas de cierre/foto/
 *    versión/reapertura y no escriben;
 *  - R-SEC-01: límites de JSON, content-type y sesión expirada en las rutas
 *    de E4.10, sin escrituras parciales;
 *  - AC20: `/foto` con y sin versión y `/estado` devuelven lo persistido tras
 *    v2, sin recalcular desde la vista viva;
 *  - AC22: ciclo antiguo y snapshot restaurado se rechazan con código/motivo,
 *    sin evento, ventana, foto ni mutación persistida.
 *
 * No declara aceptación: los 24 AC de E4.10 siguen `UNRUN` hasta la QA
 * independiente. Los fixtures son sintéticos y no acreditan DT6 ni E3.5.
 */

process.env.NODE_ENV = "test";

const now = Date.parse("2026-05-10T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas E4.10 I8 " + randomUUID();
const stamp = "2026-01-01T00:00:00.000Z";
const fp = "a".repeat(64);

function seedCycle(db: Database, id: string, inicio: string) {
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

function seedCycles(db: Database) {
  for (const [id, inicio] of [
    ["1", "2026-01-01"],
    ["2", "2026-02-01"],
    ["3", "2026-03-01"],
  ] as const)
    seedCycle(db, id, inicio);
}

function validOptions(overrides: Partial<CierreOptions> = {}): CierreOptions {
  return {
    appVersion: "0.0.0-fixture-i8",
    backup: {
      verificado: true,
      restauracionProbada: true,
      referencia: "backup-ficticio-i8",
    },
    e35: {
      verificable: true,
      motivo: null,
      huella: "a".repeat(64),
      cobertura: "Verificada",
      datos: { fixture: "E3.5 acreditada para prueba sintética I8" },
    },
    ...overrides,
  };
}

function seedMovement(db: Database, id: string, importe = 77) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
       partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
       capital,intereses)
     VALUES(?,?,?,?,?,?,NULL,NULL,NULL,?,?,0,1,?,?,NULL,NULL)`,
    [
      id,
      "2026-01-15",
      "Transferencia",
      importe,
      "S000",
      "S001",
      "Hecho sintético I8",
      "nota I8",
      stamp,
      stamp,
    ],
  );
}

function snapshotAll(db: Database) {
  return {
    cierres: db.query("SELECT * FROM cierres ORDER BY ciclo,version").all(),
    fotos: db.query("SELECT * FROM fotos_cierre ORDER BY ciclo,version").all(),
    cierreAudit: db.query("SELECT * FROM cierre_audit ORDER BY id").all(),
    reaperturas: db.query("SELECT * FROM reaperturas ORDER BY id").all(),
    activa: db.query("SELECT * FROM reapertura_activa ORDER BY id").all(),
    attempts: db.query("SELECT * FROM reapertura_attempts ORDER BY key").all(),
    vinculos: db
      .query("SELECT * FROM cierre_vinculos ORDER BY ciclo,version_destino")
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

test("E4.10 I8 AC01: un cierre posterior queda intacto al rechazar la reapertura", () => {
  const db = openDatabase(":memory:");
  try {
    seedCycle(db, "1", "2026-01-01");
    seedCycle(db, "2", "2026-02-01");
    seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
    seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
    const before = snapshotAll(db);

    const error = problemOf(() =>
      reabrirCierre(
        db,
        "1",
        { versionEsperada: 1, motivo: "Intento sobre cierre no último" },
        "reapertura-" + randomUUID(),
        {},
        now,
      ),
    );
    expect(error.status).toBe(409);
    expect(error.code).toBe("NO_ES_ULTIMO_CIERRE");

    // AC01: ni evento de reapertura ni cambio en el cierre posterior.
    expect(snapshotAll(db)).toEqual(before);
    expect(getReaperturaEstado(db, "1").estado).toBe("Cerrado");
    expect(getReaperturaEstado(db, "2").estado).toBe("Cerrado");
  } finally {
    db.close();
  }
});

test("E4.10 I8 AC14: omitir la versión esperada se rechaza sin escribir", () => {
  const db = openDatabase(":memory:");
  try {
    seedCycle(db, "1", "2026-01-01");
    seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
    const before = snapshotAll(db);

    const reopen = problemOf(() =>
      reabrirCierre(
        db,
        "1",
        { motivo: "Sin versión esperada" },
        "reapertura-" + randomUUID(),
        {},
        now,
      ),
    );
    expect(reopen.status).toBe(422);
    expect(reopen.code).toBe("VALIDATION");
    expect(snapshotAll(db)).toEqual(before);

    reabrirCierre(
      db,
      "1",
      { versionEsperada: 1, motivo: "Motivo de reapertura I8" },
      "reapertura-" + randomUUID(),
      {},
      now,
    );
    const afterOpen = snapshotAll(db);

    const reclose = problemOf(() =>
      reCerrarCiclo(
        db,
        "1",
        { motivo: "Sin versión esperada", fingerprint: "a".repeat(64) },
        "recierre-" + randomUUID(),
        validOptions(),
        now + 60_000,
      ),
    );
    expect(reclose.status).toBe(422);
    expect(reclose.code).toBe("VALIDATION");
    const cancel = problemOf(() =>
      cancelarReapertura(
        db,
        "1",
        { motivo: "Sin versión esperada" },
        "cancelacion-" + randomUUID(),
        validOptions(),
        now + 60_000,
      ),
    );
    expect(cancel.status).toBe(422);
    expect(cancel.code).toBe("VALIDATION");
    expect(snapshotAll(db)).toEqual(afterOpen);
  } finally {
    db.close();
  }
});

test("E4.10 I8 AC22: un ciclo antiguo no se reabre y no muta nada", () => {
  const db = openDatabase(":memory:");
  try {
    seedCycle(db, "1", "2026-01-01");
    seedCycle(db, "2", "2026-02-01");
    seedCycle(db, "3", "2026-03-01");
    seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
    seedClosure(db, "3", 1, "2026-03-01", "2026-03-31");
    const before = snapshotAll(db);

    const error = problemOf(() =>
      reabrirCierre(
        db,
        "1",
        { versionEsperada: 1, motivo: "Intento sobre un ciclo antiguo" },
        "reapertura-" + randomUUID(),
        {},
        now,
      ),
    );
    expect(error.status).toBe(409);
    expect(error.code).toBe("NO_ES_ULTIMO_CIERRE");
    expect(error.message).toContain("cierre posterior");

    // AC22: rechazo verificable sin evento, ventana, foto ni mutación.
    expect(snapshotAll(db)).toEqual(before);
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(getReaperturaEstado(db, "1").estado).toBe("Cerrado");
  } finally {
    db.close();
  }
});

test("E4.10 I8 AC22: un snapshot restaurado no es una ruta de reapertura", () => {
  // En macOS no se puede ejecutar `restore` real: `publishNewDirectory` usa
  // `renameat2` vía `libc.so.6`. `VACUUM INTO` reproduce el snapshot
  // consistente previo a la publicación cifrada; la restauración real con
  // age se cubre en `e410-i8-backup.test.ts` (solo Linux). No se inventa una
  // ruta de restore en la API. `tmpdir()` respeta TMPDIR y evita escribir
  // en el workspace read-only (`/suite`) del gate rootless.
  const dir = mkdtempSync(join(tmpdir(), "e410-i8-ac22-"));
  try {
    const sourcePath = join(dir, "source.sqlite");
    const restoredPath = join(dir, "restored.sqlite");
    const source = openDatabase(sourcePath);
    try {
      seedCycle(source, "1", "2026-01-01");
      seedCycle(source, "2", "2026-02-01");
      seedCycle(source, "3", "2026-03-01");
      seedClosure(source, "1", 1, "2026-01-01", "2026-01-31");
      seedClosure(source, "3", 1, "2026-03-01", "2026-03-31");
      source.run("VACUUM INTO ?", [restoredPath]);
    } finally {
      source.close();
    }

    const restored = openDatabase(restoredPath);
    try {
      const before = snapshotAll(restored);
      expect(before.cierres).toHaveLength(2);
      expect(before.fotos).toHaveLength(2);
      expect(before.reaperturas).toHaveLength(0);
      expect(before.activa).toHaveLength(0);
      expect(restored.query("PRAGMA foreign_key_check").all()).toEqual([]);

      const error = problemOf(() =>
        reabrirCierre(
          restored,
          "1",
          { versionEsperada: 1, motivo: "Restore no es reapertura" },
          "reapertura-" + randomUUID(),
          {},
          now,
        ),
      );
      expect(error.status).toBe(409);
      expect(error.code).toBe("NO_ES_ULTIMO_CIERRE");
      expect(error.message).toContain("cierre posterior");

      // El snapshot restaurado no gana evento, ventana, foto ni fila alguna.
      expect(snapshotAll(restored)).toEqual(before);
      expect(restored.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(getReaperturaEstado(restored, "1").estado).toBe("Cerrado");
    } finally {
      restored.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function apiFixture(
  options: { seedClosure?: boolean; reapertura?: { actor?: string } } = {},
) {
  const db = openDatabase(":memory:");
  seedCycles(db);
  if (options.seedClosure !== false)
    seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  let clock = now;
  const key = randomBytes(32);
  const handler = HttpApp.toWebHandler(
    createApp(db, {
      key,
      now: () => clock,
      cierre: validOptions(),
      reapertura: options.reapertura,
    }),
  );
  let cookie = "",
    csrf = "";
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
    raw?: string,
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
        body:
          raw !== undefined
            ? raw
            : body === undefined
              ? undefined
              : JSON.stringify(body),
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
    const bootstrap = provision(db, clock);
    const started = await request("/api/auth/enroll", "POST", {
      token: bootstrap,
      password,
    });
    expect(started.status).toBe(200);
    const secret = started.data.secret as string;
    const verified = await request("/api/auth/mfa", "POST", {
      code: totp(secret).generate({ timestamp: clock }),
    });
    expect(verified.status).toBe(200);
    return { secret, verified };
  }
  async function login(secret: string) {
    const started = await request("/api/auth/login", "POST", { password });
    expect(started.status).toBe(200);
    const verified = await request("/api/auth/mfa", "POST", {
      code: totp(secret).generate({ timestamp: clock }),
    });
    expect(verified.status).toBe(200);
    return verified;
  }
  async function close(ciclo: string) {
    const pre = await request(`/api/cierres/${ciclo}/preflight`);
    expect(pre.status).toBe(200);
    expect(pre.data.bloqueos).toEqual([]);
    const result = await request(
      `/api/cierres/${ciclo}/cerrar`,
      "POST",
      { fingerprint: pre.data.fingerprint },
      { "idempotency-key": randomUUID() },
    );
    return { pre, result };
  }
  return {
    db,
    request,
    enroll,
    login,
    close,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

test("E4.10 I8 AC07/AC14: PATCH/DELETE no mutan cierre, foto, versión, reapertura ni re-cierre", async () => {
  const f = apiFixture();
  try {
    await f.enroll();
    const before = snapshotAll(f.db);
    const routes: [string, string][] = [
      ["/api/cierres/1/reabrir", "POST"],
      ["/api/cierres/1/recerrar", "POST"],
      ["/api/cierres/1/reapertura/cancelar", "POST"],
      ["/api/cierres/1/cancelar", "POST"],
      ["/api/cierres/1/foto", "GET"],
      ["/api/cierres/1/foto?version=1", "GET"],
      ["/api/cierres/1/estado", "GET"],
      ["/api/cierres/1/reapertura", "GET"],
      ["/api/cierres/1/revalidacion", "GET"],
      ["/api/cierres/1/cierre", "GET"],
      ["/api/cierres/1/repreflight", "GET"],
      ["/api/cierres/1/preflight", "GET"],
      ["/api/cierres/precierre/1", "GET"],
    ];
    for (const [path, allow] of routes) {
      for (const method of ["PATCH", "DELETE"] as const) {
        const response = await f.request(path, method);
        expect(response.status).toBe(405);
        expect(response.headers.get("allow")).toBe(allow);
        expect(response.data.code).toBe("METHOD_NOT_ALLOWED");
      }
    }
    expect(snapshotAll(f.db)).toEqual(before);
  } finally {
    f.db.close();
  }
});

test("E4.10 I8 R-SEC-01: límites de JSON y content-type en las rutas de E4.10 no escriben", async () => {
  const f = apiFixture();
  try {
    await f.enroll();
    const before = snapshotAll(f.db);
    const body = { versionEsperada: 1, motivo: "Motivo sintético I8" };

    const huge = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      undefined,
      {},
      JSON.stringify({ ...body, motivo: "x".repeat(17000) }),
    );
    expect(huge.status).toBe(413);
    expect(huge.data.code).toBe("BODY_LIMIT");

    const malformed = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      undefined,
      {},
      "{",
    );
    expect(malformed.status).toBe(422);
    expect(malformed.data.code).toBe("INVALID_JSON");

    const noObject = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      undefined,
      {},
      "[]",
    );
    expect(noObject.status).toBe(422);
    expect(noObject.data.code).toBe("INVALID_JSON");

    const wrongType = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      undefined,
      { "content-type": "text/plain" },
      JSON.stringify(body),
    );
    expect(wrongType.status).toBe(415);
    expect(wrongType.data.code).toBe("CONTENT_TYPE");

    expect(snapshotAll(f.db)).toEqual(before);
  } finally {
    f.db.close();
  }
});

test("E4.10 I8: sesión expirada exige reautenticación y conserva la ventana", async () => {
  const f = apiFixture({ reapertura: { actor: "Alex" } });
  try {
    const { secret } = await f.enroll();
    const opened = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      { versionEsperada: 1, motivo: "Motivo de reapertura I8" },
      { "idempotency-key": randomUUID() },
    );
    expect(opened.status).toBe(201);
    expect(opened.data.estado).toBe("Reabierto");
    const before = snapshotAll(f.db);

    f.advance(1_800_000);
    expect((await f.request("/api/cierres/1/reapertura")).status).toBe(401);
    expect((await f.request("/api/cierres/1/foto?version=1")).status).toBe(401);

    await f.login(secret);
    const restored = await f.request("/api/cierres/1/reapertura");
    expect(restored.status).toBe(200);
    expect(restored.data.estado).toBe("Reabierto");
    expect(restored.data.reapertura.id).toBe(opened.data.reapertura.id);

    // Reautenticarse no reabre, no duplica ni reescribe la ventana.
    expect(snapshotAll(f.db)).toEqual(before);
  } finally {
    f.db.close();
  }
});

test("E4.10 I8 AC20: /foto con y sin versión y /estado tras v2 devuelven lo persistido", async () => {
  const f = apiFixture({ seedClosure: false });
  try {
    await f.enroll();
    const close = await f.close("1");
    expect(close.result.status).toBe(201);

    const opened = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      { versionEsperada: 1, motivo: "Motivo de reapertura I8" },
      { "idempotency-key": randomUUID() },
    );
    expect(opened.status).toBe(201);

    seedMovement(f.db, "8801", 77);
    const pre = await f.request("/api/cierres/1/repreflight");
    expect(pre.status).toBe(200);
    expect(pre.data.comparacion.estado).toBe("ConCambios");
    const reclosed = await f.request(
      "/api/cierres/1/recerrar",
      "POST",
      {
        versionEsperada: 1,
        motivo: "Motivo de re-cierre I8",
        fingerprint: pre.data.fingerprint,
      },
      { "idempotency-key": randomUUID() },
    );
    expect(reclosed.status).toBe(201);
    expect(reclosed.data.foto.version).toBe(2);

    const v1 = await f.request("/api/cierres/1/foto?version=1");
    const v2 = await f.request("/api/cierres/1/foto?version=2");
    const latest = await f.request("/api/cierres/1/foto");
    expect(v1.status).toBe(200);
    expect(v2.status).toBe(200);
    expect(latest.status).toBe(200);
    expect(v1.data.foto.version).toBe(1);
    expect(v2.data.foto.version).toBe(2);
    expect(latest.data).toEqual(v2.data);

    const state = await f.request("/api/cierres/1/estado");
    expect(state.status).toBe(200);
    expect(state.data.cierre.version).toBe(2);
    expect(state.data.reapertura).toMatchObject({
      ciclo: "1",
      estado: "Cerrado",
      version: 2,
      reapertura: null,
    });
    expect(state.data.reapertura.elegibilidad.puedeReabrir).toBe(true);

    // La vista viva cambia después de v2: las fotos no se recalculan.
    seedMovement(f.db, "8802", 88);
    expect((await f.request("/api/cierres/1/foto?version=1")).data).toEqual(
      v1.data,
    );
    expect((await f.request("/api/cierres/1/foto?version=2")).data).toEqual(
      v2.data,
    );
    expect((await f.request("/api/cierres/1/foto")).data).toEqual(v2.data);
  } finally {
    f.db.close();
  }
});
