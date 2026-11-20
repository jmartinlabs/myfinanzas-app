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
import { getFotoCiclo } from "./e411";
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
  blocks: Partial<
    Record<
      | "hechos"
      | "plan"
      | "clasificacion"
      | "inversion"
      | "auxiliares"
      | "cobertura"
      | "backup"
      | "no_disponible",
      string
    >
  > = {},
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
        'Sin hechos','SinPlan',?,?,?,?,?,?,?,?)`,
      [
        ciclo,
        version,
        creado,
        motivo,
        fp,
        inicio,
        fin,
        blocks.hechos ?? "{}",
        blocks.plan ?? "{}",
        blocks.clasificacion ?? "{}",
        blocks.inversion ?? "{}",
        blocks.auxiliares ?? "{}",
        blocks.cobertura ?? "{}",
        blocks.backup ?? "{}",
        blocks.no_disponible ?? "{}",
      ],
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

/** SPEC38 §7.6: ruta retirada = 410 con código, no-store y sustituto declarado. */
function expectRetirada(
  response: { status: number; data: Record<string, any>; headers: Headers },
  code: string,
  sustituto: string | null,
) {
  expect(response.status).toBe(410);
  expect(response.data.code).toBe(code);
  expect(response.data.message).toBeTypeOf("string");
  expect(response.data.sustituto).toBe(sustituto);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("link")).toBe(
    sustituto === null ? null : `<${sustituto}>; rel="alternate"`,
  );
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
    // Contrato sustituido: preflight devolvía 200 con fingerprint/bloqueos y
    // /cerrar creaba la foto inmutable (201).
    const sustituto = `/api/cierres/${ciclo}/estado`;
    const pre = await request(`/api/cierres/${ciclo}/preflight`);
    expectRetirada(pre, "CIERRE_FOTOGRAFICO_RETIRADO", sustituto);
    const result = await request(
      `/api/cierres/${ciclo}/cerrar`,
      "POST",
      { fingerprint: "a".repeat(64) },
      { "idempotency-key": randomUUID() },
    );
    expectRetirada(result, "CIERRE_FOTOGRAFICO_RETIRADO", sustituto);
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
  // Contrato sustituido: las rutas de foto/reapertura/re-cierre respondían 405
  // con `allow` (GET o POST) y no escribían.
  const f = apiFixture();
  try {
    await f.enroll();
    const before = snapshotAll(f.db);
    const retiradas: [string, string][] = [
      ["/api/cierres/1/reabrir", "REAPERTURA_RETIRADA"],
      ["/api/cierres/1/recerrar", "REAPERTURA_RETIRADA"],
      ["/api/cierres/1/reapertura/cancelar", "REAPERTURA_RETIRADA"],
      ["/api/cierres/1/cancelar", "REAPERTURA_RETIRADA"],
      ["/api/cierres/1/foto", "FOTO_RETIRADA"],
      ["/api/cierres/1/foto?version=1", "FOTO_RETIRADA"],
      ["/api/cierres/1/reapertura", "REAPERTURA_RETIRADA"],
      ["/api/cierres/1/revalidacion", "REAPERTURA_RETIRADA"],
      ["/api/cierres/1/cierre", "CIERRE_FOTOGRAFICO_RETIRADO"],
      ["/api/cierres/1/repreflight", "REAPERTURA_RETIRADA"],
      ["/api/cierres/1/preflight", "CIERRE_FOTOGRAFICO_RETIRADO"],
    ];
    for (const [path, code] of retiradas) {
      for (const method of ["POST", "PATCH", "DELETE"] as const) {
        const response = await f.request(path, method, {});
        expectRetirada(response, code, "/api/cierres/1/estado");
        expect(response.headers.get("allow")).toBeNull();
      }
    }

    // Las lecturas vivas conservan el 405 y su `allow` explícito.
    const vivas: [string, string][] = [
      ["/api/cierres/1/estado", "GET"],
      ["/api/cierres/precierre/1", "GET"],
    ];
    for (const [path, allow] of vivas) {
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

test("E4.10 I8 AC07: v1 y su foto siguen consultables e inmutables con la ventana activa", async () => {
  // Contrato sustituido: GET /api/cierres/1/foto?version=1 respondía 200 con la
  // foto v1 antes y durante la ventana de reapertura (201 en /reabrir).
  const f = apiFixture();
  try {
    await f.enroll();
    const before = snapshotAll(f.db);
    const beforeFoto = getFotoCiclo(f.db, "1", 1);

    const beforeOpen = await f.request("/api/cierres/1/foto?version=1");
    expectRetirada(beforeOpen, "FOTO_RETIRADA", "/api/cierres/1/estado");
    expect(beforeOpen.data).not.toHaveProperty("foto");

    const opened = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      { versionEsperada: 1, motivo: "Motivo de reapertura AC07" },
      { "idempotency-key": randomUUID() },
    );
    expectRetirada(opened, "REAPERTURA_RETIRADA", "/api/cierres/1/estado");
    expect(opened.data).not.toHaveProperty("reapertura");

    // No hay ventana: ninguna escritura retirada persistió evento ni versión.
    const duringWindow = snapshotAll(f.db);
    expect(duringWindow).toEqual(before);
    const v1DuringWindow = await f.request("/api/cierres/1/foto?version=1");
    expectRetirada(v1DuringWindow, "FOTO_RETIRADA", "/api/cierres/1/estado");
    // La foto persistida v1 sigue siendo la misma lectura inmutable.
    expect(getFotoCiclo(f.db, "1", 1)).toEqual(beforeFoto);
    expect(snapshotAll(f.db)).toEqual(duringWindow);

    const rutas: [string, string][] = [
      ["/api/cierres/1/foto", "FOTO_RETIRADA"],
      ["/api/cierres/1/foto?version=1", "FOTO_RETIRADA"],
      ["/api/cierres/1/cierre", "CIERRE_FOTOGRAFICO_RETIRADO"],
      ["/api/cierres/1/revalidacion", "REAPERTURA_RETIRADA"],
    ];
    for (const [path, code] of rutas) {
      for (const method of ["PATCH", "DELETE"] as const) {
        const response = await f.request(path, method);
        expectRetirada(response, code, "/api/cierres/1/estado");
        expect(response.headers.get("allow")).toBeNull();
      }
    }

    // El estado de validación sigue siendo la lectura viva de solo lectura.
    const estado = await f.request("/api/cierres/1/estado");
    expect(estado.status).toBe(200);
    expect(estado.data).toHaveProperty("validacion");
    expect((await f.request("/api/cierres/1/estado", "PATCH")).status).toBe(405);

    // Ni la consulta ni los intentos de escritura mutan la foto, el cierre,
    // la ventana ni la auditoría.
    expect(snapshotAll(f.db)).toEqual(duringWindow);
  } finally {
    f.db.close();
  }
});

test("E4.10 I8 R-SEC-01: límites de JSON y content-type en las rutas de E4.10 no escriben", async () => {
  // Contrato sustituido: POST /reabrir devolvía 413/422/415 al validar cuerpo,
  // JSON y content-type antes de abrir la ventana.
  const f = apiFixture();
  try {
    await f.enroll();
    const before = snapshotAll(f.db);
    const body = { versionEsperada: 1, motivo: "Motivo sintético I8" };
    const sustituto = "/api/cierres/1/estado";

    // La ruta retirada responde 410 antes de leer el cuerpo: el límite de
    // tamaño no se ejerce porque no hay escritura que proteger.
    const huge = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      undefined,
      {},
      JSON.stringify({ ...body, motivo: "x".repeat(17000) }),
    );
    expectRetirada(huge, "REAPERTURA_RETIRADA", sustituto);

    const malformed = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      undefined,
      {},
      "{",
    );
    expectRetirada(malformed, "REAPERTURA_RETIRADA", sustituto);

    const noObject = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      undefined,
      {},
      "[]",
    );
    expectRetirada(noObject, "REAPERTURA_RETIRADA", sustituto);

    const wrongType = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      undefined,
      { "content-type": "text/plain" },
      JSON.stringify(body),
    );
    expectRetirada(wrongType, "REAPERTURA_RETIRADA", sustituto);

    expect(snapshotAll(f.db)).toEqual(before);
  } finally {
    f.db.close();
  }
});

test("E4.10 I8: sesión expirada exige reautenticación y conserva la ventana", async () => {
  // Contrato sustituido: POST /reabrir creaba la ventana (201) y GET
  // /reapertura devolvía su estado 200 tras reautenticarse.
  const f = apiFixture({ reapertura: { actor: "Alex" } });
  try {
    const { secret } = await f.enroll();
    const sustituto = "/api/cierres/1/estado";
    const opened = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      { versionEsperada: 1, motivo: "Motivo de reapertura I8" },
      { "idempotency-key": randomUUID() },
    );
    expectRetirada(opened, "REAPERTURA_RETIRADA", sustituto);
    const before = snapshotAll(f.db);

    f.advance(1_800_000);
    expect((await f.request("/api/cierres/1/reapertura")).status).toBe(401);
    expect((await f.request("/api/cierres/1/foto?version=1")).status).toBe(401);

    await f.login(secret);
    const restored = await f.request("/api/cierres/1/reapertura");
    expectRetirada(restored, "REAPERTURA_RETIRADA", sustituto);
    // La sesión sí quedó restaurada: el sustituto vivo responde 200.
    expect((await f.request(sustituto)).status).toBe(200);

    // Reautenticarse no reabre, no duplica ni reescribe la ventana.
    expect(snapshotAll(f.db)).toEqual(before);
  } finally {
    f.db.close();
  }
});

test("E4.10 I8 AC20: /foto no rellena un bloque ausente ni lo convierte en cero", async () => {
  // Contrato sustituido: GET /api/cierres/2/foto?version=1 devolvía 200 con el
  // bloque `plan` persistido, sin sintetizar `items: []` ni un cero.
  const f = apiFixture();
  try {
    await f.enroll();
    // El bloque persistido no contiene `items`: la API no debe sintetizar
    // `[]` ni convertir la ausencia en un cero. La foto se inserta completa
    // antes de consultarla porque v1 es inmutable.
    seedClosure(f.db, "2", 1, "2026-02-01", "2026-02-28", null, {
      plan: '{"estado":"Capturado","revision":1,"sinPlanificar":false}',
    });
    const before = snapshotAll(f.db);
    const response = await f.request("/api/cierres/2/foto?version=1");
    expectRetirada(response, "FOTO_RETIRADA", "/api/cierres/2/estado");
    expect(response.data).not.toHaveProperty("foto");

    // La ausencia se conserva en el bloque persistido: ni `[]` ni cero.
    const row = f.db
      .query("SELECT plan FROM fotos_cierre WHERE ciclo='2' AND version=1")
      .get() as { plan: string };
    const plan = JSON.parse(row.plan);
    expect(plan).toEqual({
      estado: "Capturado",
      revision: 1,
      sinPlanificar: false,
    });
    expect(plan).not.toHaveProperty("items");
    expect(plan.items).toBeUndefined();
    expect(JSON.stringify(plan)).not.toContain('"items":[]');
    expect(snapshotAll(f.db)).toEqual(before);
  } finally {
    f.db.close();
  }
});

test("E4.10 I8 AC20: /foto con y sin versión y /estado tras v2 devuelven lo persistido", async () => {
  // Contrato sustituido: cerrar creaba v1 (201), reabrir v2 (201) y /foto
  // devolvía 200 con v1, v2 y la última versión persistidas.
  const f = apiFixture({ seedClosure: false });
  try {
    await f.enroll();
    const before = snapshotAll(f.db);

    const close = await f.close("1");
    expect(close.result.status).toBe(410);

    const opened = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      { versionEsperada: 1, motivo: "Motivo de reapertura I8" },
      { "idempotency-key": randomUUID() },
    );
    expectRetirada(opened, "REAPERTURA_RETIRADA", "/api/cierres/1/estado");

    seedMovement(f.db, "8801", 77);
    const pre = await f.request("/api/cierres/1/repreflight");
    expectRetirada(pre, "REAPERTURA_RETIRADA", "/api/cierres/1/estado");
    expect(pre.data).not.toHaveProperty("comparacion");

    const reclosed = await f.request(
      "/api/cierres/1/recerrar",
      "POST",
      {
        versionEsperada: 1,
        motivo: "Motivo de re-cierre I8",
        fingerprint: "a".repeat(64),
      },
      { "idempotency-key": randomUUID() },
    );
    expectRetirada(reclosed, "REAPERTURA_RETIRADA", "/api/cierres/1/estado");

    const v1 = await f.request("/api/cierres/1/foto?version=1");
    const v2 = await f.request("/api/cierres/1/foto?version=2");
    const latest = await f.request("/api/cierres/1/foto");
    for (const response of [v1, v2, latest]) {
      expectRetirada(response, "FOTO_RETIRADA", "/api/cierres/1/estado");
      expect(response.data).not.toHaveProperty("foto");
    }

    // No hay v2 ni recálculo: el estado vivo sigue sin cierre persistido.
    const state = await f.request("/api/cierres/1/estado");
    expect(state.status).toBe(200);
    expect(state.data).toHaveProperty("validacion");
    expect(state.data).not.toHaveProperty("cierre");
    expect(state.data).not.toHaveProperty("reapertura");

    // La vista viva cambia después: las lecturas retiradas responden igual.
    seedMovement(f.db, "8802", 88);
    for (const path of [
      "/api/cierres/1/foto?version=1",
      "/api/cierres/1/foto?version=2",
      "/api/cierres/1/foto",
    ])
      expectRetirada(await f.request(path), "FOTO_RETIRADA", "/api/cierres/1/estado");

    // Única escritura del tramo: los dos movimientos sembrados.
    const after = snapshotAll(f.db);
    expect(after.cierres).toEqual(before.cierres);
    expect(after.fotos).toEqual(before.fotos);
    expect(after.cierreAudit).toEqual(before.cierreAudit);
    expect(after.reaperturas).toEqual(before.reaperturas);
    expect(after.activa).toEqual(before.activa);
    expect(after.attempts).toEqual(before.attempts);
    expect(after.vinculos).toEqual(before.vinculos);
  } finally {
    f.db.close();
  }
});
