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
  confirmCierre,
  getCierreEstado,
  getFotoCierre,
  previewCierre,
  type CierreOptions,
} from "./e49";
import { getReaperturaEstado, reabrirCierre } from "./e410";
import { previewRecierre, reCerrarCiclo } from "./e410-recierre";
import { cancelarReapertura } from "./e410-cancelacion";
import { Problem } from "./problem";

/**
 * E4.10 I6 — idempotency, concurrency and the audit chain (AC11, AC12, AC18).
 *
 * I2–I5 already implement the per-operation attempt namespaces, the request
 * hash, the expected-version checks and the append-only audit tables. This
 * file proves the cross-operation and cross-connection properties that were
 * not exercised by their own suites:
 *  - the same key is independent per operation and bound to its cycle/payload;
 *  - a replay is stable while a different payload conflicts;
 *  - two connections serialise one window/version, including same-key races;
 *  - the full v1 → reopening → correction → v2 chain is ordered, append-only
 *    and free of gaps or orphans.
 *
 * F2 from QA #246: the concurrency cases spawn two real OS processes and prove
 * SQLite's IMMEDIATE serialisation, one winner and stable replay. They do not
 * force a deterministic instruction interleaving and deliberately add no
 * production test seam/barrier for it.
 *
 * It does not declare acceptance: AC11/AC12/AC18 remain fixtures-level
 * evidence until independent QA reviews them.
 */

process.env.NODE_ENV = "test";

const now = Date.parse("2026-04-10T12:00:00Z");
const reopenNow = now + 1_000;
const correctionNow = now + 2_000;
const recloseNow = now + 60_000;
const stamp = "2026-01-01T00:00:00.000Z";
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas E4.10 I6 " + randomUUID();

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

function validOptions(overrides: Partial<CierreOptions> = {}): CierreOptions {
  return {
    appVersion: "0.0.0-fixture-i6",
    backup: {
      verificado: true,
      restauracionProbada: true,
      referencia: "backup-ficticio-i6",
    },
    e35: {
      verificable: true,
      motivo: null,
      huella: "a".repeat(64),
      cobertura: "Verificada",
      datos: { fixture: "E3.5 acreditada para prueba sintética I6" },
    },
    ...overrides,
  };
}

function fixture() {
  const db = openDatabase(":memory:");
  seedCycles(db);
  return db;
}

function closeV1(db: Database, options = validOptions()) {
  const pre = previewCierre(db, "1", options, now);
  expect(pre.bloqueos).toEqual([]);
  return confirmCierre(
    db,
    "1",
    { fingerprint: pre.fingerprint },
    "cierre-" + randomUUID(),
    options,
    now,
  );
}

function reopen(
  db: Database,
  version = 1,
  motivo = "Motivo de reapertura I6",
  key = "reapertura-" + randomUUID(),
  at = reopenNow,
) {
  return reabrirCierre(
    db,
    "1",
    { versionEsperada: version, motivo },
    key,
    { actor: "Alex" },
    at,
  );
}

function preview(db: Database, options = validOptions(), at = recloseNow) {
  return previewRecierre(db, "1", options, at);
}

function reclose(
  db: Database,
  pre: ReturnType<typeof preview>,
  options = validOptions(),
  key = "recierre-" + randomUUID(),
  at = recloseNow,
) {
  return reCerrarCiclo(
    db,
    "1",
    {
      versionEsperada: pre.origen.versionOrigen,
      motivo: "  Motivo de re-cierre  ",
      fingerprint: pre.fingerprint,
    },
    key,
    options,
    at,
  );
}

function cancel(
  db: Database,
  body: Record<string, unknown>,
  key = "cancelacion-" + randomUUID(),
  at = now + 2_000,
) {
  return cancelarReapertura(
    db,
    "1",
    body,
    key,
    validOptions({ actor: "Alex" }),
    at,
  );
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

function seedMovement(
  db: Database,
  input: {
    id: string;
    fecha?: string;
    tipo?: "Transferencia" | "Gasto" | "Ingreso" | "Devolución de gasto";
    importe?: number;
    origen?: string;
    destino?: string;
    nota?: string;
  },
) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
       partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
       capital,intereses)
     VALUES(?,?,?,?,?,?,?,NULL,?,?,?,0,1,?,?,NULL,NULL)`,
    [
      input.id,
      input.fecha ?? "2026-01-15",
      input.tipo ?? "Transferencia",
      input.importe ?? 500,
      input.origen ?? "S000",
      input.destino ?? "S001",
      null,
      null,
      "Hecho sintético I6",
      input.nota ?? "",
      stamp,
      stamp,
    ],
  );
}

function counts(db: Database) {
  return {
    cierres: db.query("SELECT COUNT(*) n FROM cierres").get(),
    fotos: db.query("SELECT COUNT(*) n FROM fotos_cierre").get(),
    vinculos: db.query("SELECT COUNT(*) n FROM cierre_vinculos").get(),
    audit: db.query("SELECT COUNT(*) n FROM cierre_audit").get(),
    reaperturas: db.query("SELECT COUNT(*) n FROM reaperturas").get(),
    activa: db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
  };
}

/**
 * Real HTTP surface for the T1/T2 correction used by AC18. The app runs with
 * the correction instant so the production route writes its own actor/UTC/
 * revision/audit row, not a test insert.
 */
function correctionApi(db: Database) {
  const handler = HttpApp.toWebHandler(
    createApp(db, {
      key: randomBytes(32),
      now: () => correctionNow,
      cierre: validOptions(),
      reapertura: { actor: "Alex" },
    }),
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
    const bootstrap = provision(db, correctionNow);
    const started = await request("/api/auth/enroll", "POST", {
      token: bootstrap,
      password,
    });
    expect(started.status).toBe(200);
    const verified = await request("/api/auth/mfa", "POST", {
      code: totp(started.data.secret).generate({ timestamp: correctionNow }),
    });
    expect(verified.status).toBe(200);
  }
  return { request, enroll };
}

test("E4.10 I6 AC11: la clave se separa por operación y queda atada a ciclo y payload", () => {
  const db = fixture();
  try {
    closeV1(db);
    const sharedKey = "i6-compartida-" + randomUUID();
    const body = { versionEsperada: 1, motivo: "Motivo compartido I6" };

    const first = reopen(db, 1, body.motivo, sharedKey);
    expect(first.replayed).toBe(false);

    // Same normalized payload (trim) replays the original result, not a duplicate.
    const replay = reopen(db, 1, "  Motivo compartido I6  ", sharedKey);
    expect(replay.replayed).toBe(true);
    expect(replay.reapertura).toEqual(first.reapertura);
    expect(
      db.query("SELECT COUNT(*) n FROM reaperturas").get(),
    ).toEqual({ n: 1 });

    // The cycle is part of the request payload: the same key cannot be replayed
    // as if it belonged to another cycle.
    const crossCycle = problemOf(() =>
      reabrirCierre(db, "2", body, sharedKey, { actor: "Alex" }, now + 1_500),
    );
    expect(crossCycle.status).toBe(409);
    expect(crossCycle.code).toBe("IDEMPOTENCY_CONFLICT");

    // A different expected version under the same key also conflicts.
    const crossVersion = problemOf(() =>
      reopen(db, 2, body.motivo, sharedKey, now + 1_500),
    );
    expect(crossVersion.status).toBe(409);
    expect(crossVersion.code).toBe("IDEMPOTENCY_CONFLICT");

    // The cancellation namespace is independent. Even the same key and the same
    // body cancel the window instead of replaying the reopening.
    const cancelled = cancel(db, body, sharedKey);
    expect(cancelled.replayed).toBe(false);
    expect(cancelled.cancelacion.reaperturaOrigen).toBe(first.reapertura.id);
    expect(
      db
        .query(
          "SELECT operacion,key FROM reapertura_attempts WHERE key=? ORDER BY operacion",
        )
        .all(sharedKey),
    ).toEqual([
      { operacion: "cancelacion", key: sharedKey },
      { operacion: "reapertura", key: sharedKey },
    ]);
    expect(getReaperturaEstado(db, "1").estado).toBe("Cerrado");

    // The cancellation payload is still hash-bound.
    const cancelConflict = problemOf(() =>
      cancel(
        db,
        { versionEsperada: 1, motivo: "Otro motivo de cancelación" },
        sharedKey,
        now + 2_500,
      ),
    );
    expect(cancelConflict.status).toBe(409);
    expect(cancelConflict.code).toBe("IDEMPOTENCY_CONFLICT");
  } finally {
    db.close();
  }
});

test("E4.10 I6 AC11: la clave de re-cierre es independiente de la de reapertura", () => {
  const db = fixture();
  try {
    closeV1(db);
    const sharedKey = "i6-entre-operaciones-" + randomUUID();
    const reopened = reopen(db, 1, "Motivo de reapertura", sharedKey);
    seedMovement(db, { id: "8501", importe: 75 });
    const pre = preview(db);

    const closed = reclose(db, pre, validOptions(), sharedKey);
    expect(closed.replayed).toBe(false);
    expect(closed.foto.version).toBe(2);
    expect(
      db
        .query(
          "SELECT operacion,key FROM reapertura_attempts WHERE key=? ORDER BY operacion",
        )
        .all(sharedKey),
    ).toEqual([
      { operacion: "reapertura", key: sharedKey },
      { operacion: "recierre", key: sharedKey },
    ]);
    expect(closed.recierre.reaperturaId).toBe(reopened.reapertura.id);
    expect(getCierreEstado(db, "1").version).toBe(2);
  } finally {
    db.close();
  }
});

test("E4.10 I6 AC11: replay idéntico y conflicto de payload en re-cierre y cancelación", () => {
  const closeDb = fixture();
  try {
    closeV1(closeDb);
    reopen(closeDb, 1);
    seedMovement(closeDb, { id: "8503", importe: 40 });
    const pre = preview(closeDb);
    const key = "i6-recierre-replay-" + randomUUID();
    const first = reclose(closeDb, pre, validOptions(), key);
    const replay = reclose(closeDb, pre, validOptions(), key);
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.foto).toEqual(first.foto);
    expect(
      closeDb
        .query("SELECT COUNT(*) n FROM reapertura_attempts WHERE operacion='recierre'")
        .get(),
    ).toEqual({ n: 1 });
    expect(
      closeDb.query("SELECT COUNT(*) n FROM cierres WHERE ciclo='1'").get(),
    ).toEqual({ n: 2 });

    const conflict = problemOf(() =>
      reCerrarCiclo(
        closeDb,
        "1",
        {
          versionEsperada: 1,
          motivo: "Otro motivo de re-cierre",
          fingerprint: pre.fingerprint,
        },
        key,
        validOptions(),
        recloseNow,
      ),
    );
    expect(conflict.status).toBe(409);
    expect(conflict.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(
      closeDb.query("SELECT COUNT(*) n FROM cierres WHERE ciclo='1'").get(),
    ).toEqual({ n: 2 });
  } finally {
    closeDb.close();
  }

  const cancelDb = fixture();
  try {
    closeV1(cancelDb);
    reopen(cancelDb, 1);
    const key = "i6-cancelacion-replay-" + randomUUID();
    const body = { versionEsperada: 1, motivo: "Motivo de cancelación I6" };
    const first = cancel(cancelDb, body, key);
    const replay = cancel(cancelDb, body, key);
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.cancelacion.id).toBe(first.cancelacion.id);
    expect(
      cancelDb
        .query(
          "SELECT COUNT(*) n FROM reaperturas WHERE tipo='cancelacion'",
        )
        .get(),
    ).toEqual({ n: 1 });
    expect(
      cancelDb
        .query(
          "SELECT COUNT(*) n FROM reapertura_attempts WHERE operacion='cancelacion'",
        )
        .get(),
    ).toEqual({ n: 1 });

    const conflict = problemOf(() =>
      cancel(
        cancelDb,
        { versionEsperada: 1, motivo: "Otro motivo de cancelación" },
        key,
      ),
    );
    expect(conflict.status).toBe(409);
    expect(conflict.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(
      cancelDb
        .query(
          "SELECT COUNT(*) n FROM reaperturas WHERE tipo='cancelacion'",
        )
        .get(),
    ).toEqual({ n: 1 });
  } finally {
    cancelDb.close();
  }
});

test("E4.10 I6 AC12: una versión esperada obsoleta no abre, no re-cierra ni cancela", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db, 1);
    const before = counts(db);

    const staleReopen = problemOf(() =>
      reopen(db, 2, "Versión obsoleta", "reapertura-" + randomUUID()),
    );
    expect(staleReopen.status).toBe(409);
    expect(staleReopen.code).toBe("VERSION_CONFLICTO");

    const pre = preview(db);
    // A material correction is not needed to prove the version gate: a stale
    // version is rejected before the preview fingerprint is evaluated.
    const staleClose = problemOf(() =>
      reCerrarCiclo(
        db,
        "1",
        {
          versionEsperada: 2,
          motivo: "Versión obsoleta",
          fingerprint: pre.fingerprint,
        },
        "recierre-" + randomUUID(),
        validOptions(),
        recloseNow,
      ),
    );
    expect(staleClose.status).toBe(409);
    expect(staleClose.code).toBe("VERSION_CONFLICTO");

    const staleCancel = problemOf(() =>
      cancel(db, { versionEsperada: 2, motivo: "Versión obsoleta" }),
    );
    expect(staleCancel.status).toBe(409);
    expect(staleCancel.code).toBe("VERSION_CONFLICTO");

    expect(counts(db)).toEqual(before);
    expect(getReaperturaEstado(db, "1").estado).toBe("Reabierto");
  } finally {
    db.close();
  }
});

function concurrentReopenFile() {
  const dir = mkdtempSync(join(tmpdir(), "e410-i6-reopen-"));
  const path = join(dir, "concurrent.sqlite");
  const db = openDatabase(path);
  seedCycles(db);
  closeV1(db);
  db.close();
  return { dir, path };
}

function concurrentRecloseFile() {
  const dir = mkdtempSync(join(tmpdir(), "e410-i6-reclose-"));
  const path = join(dir, "concurrent.sqlite");
  const db = openDatabase(path);
  seedCycles(db);
  closeV1(db);
  reopen(db);
  seedMovement(db, { id: "8502", importe: 20 });
  const pre = preview(db);
  db.close();
  return { dir, path, pre };
}

function concurrentCancelFile() {
  const dir = mkdtempSync(join(tmpdir(), "e410-i6-cancel-"));
  const path = join(dir, "concurrent.sqlite");
  const db = openDatabase(path);
  seedCycles(db);
  closeV1(db);
  reopen(db);
  db.close();
  return { dir, path };
}

function runConcurrentReopen(input: {
  path: string;
  body: Record<string, unknown>;
  key: string;
}) {
  const database = resolve("apps/api/src/database.ts"),
    reopening = resolve("apps/api/src/e410.ts");
  const script = `import{openDatabase}from${JSON.stringify(database)};import{reabrirCierre}from${JSON.stringify(reopening)};const db=openDatabase(process.argv[1]);try{const r=reabrirCierre(db,'1',JSON.parse(process.argv[2]),process.argv[3],{actor:'Alex'},${reopenNow});process.stdout.write(JSON.stringify({ok:true,id:r.reapertura.id,replayed:r.replayed}));}catch(e){process.stdout.write(JSON.stringify({ok:false,code:e?.code??String(e)}));}finally{db.close();}`;
  return Bun.spawn(
    [process.execPath, "-e", script, input.path, JSON.stringify(input.body), input.key],
    { env: { ...process.env, NODE_ENV: "test" }, stdout: "pipe", stderr: "pipe" },
  );
}

function runConcurrentReclose(input: {
  path: string;
  body: Record<string, unknown>;
  key: string;
}) {
  const database = resolve("apps/api/src/database.ts"),
    recierre = resolve("apps/api/src/e410-recierre.ts");
  const script = `import{openDatabase}from${JSON.stringify(database)};import{reCerrarCiclo}from${JSON.stringify(recierre)};const db=openDatabase(process.argv[1]);try{const r=reCerrarCiclo(db,'1',JSON.parse(process.argv[2]),process.argv[3],JSON.parse(process.argv[4]),${recloseNow});process.stdout.write(JSON.stringify({ok:true,version:r.foto.version,replayed:r.replayed}));}catch(e){process.stdout.write(JSON.stringify({ok:false,code:e?.code??String(e)}));}finally{db.close();}`;
  return Bun.spawn(
    [
      process.execPath,
      "-e",
      script,
      input.path,
      JSON.stringify(input.body),
      input.key,
      JSON.stringify(validOptions()),
    ],
    { env: { ...process.env, NODE_ENV: "test" }, stdout: "pipe", stderr: "pipe" },
  );
}

function runConcurrentCancel(input: {
  path: string;
  body: Record<string, unknown>;
  key: string;
}) {
  const database = resolve("apps/api/src/database.ts"),
    cancelacion = resolve("apps/api/src/e410-cancelacion.ts");
  const script = `import{openDatabase}from${JSON.stringify(database)};import{cancelarReapertura}from${JSON.stringify(cancelacion)};const db=openDatabase(process.argv[1]);try{const r=cancelarReapertura(db,'1',JSON.parse(process.argv[2]),process.argv[3],JSON.parse(process.argv[4]),${correctionNow});process.stdout.write(JSON.stringify({ok:true,id:r.cancelacion.id,replayed:r.replayed}));}catch(e){process.stdout.write(JSON.stringify({ok:false,code:e?.code??String(e)}));}finally{db.close();}`;
  return Bun.spawn(
    [
      process.execPath,
      "-e",
      script,
      input.path,
      JSON.stringify(input.body),
      input.key,
      JSON.stringify(validOptions({ actor: "Alex" })),
    ],
    { env: { ...process.env, NODE_ENV: "test" }, stdout: "pipe", stderr: "pipe" },
  );
}

type ConcurrentChild = {
  exited: Promise<number>;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
};

async function results<T>(children: ConcurrentChild[]): Promise<T[]> {
  return Promise.all(
    children.map(async (child) => {
      expect(await child.exited).toBe(0);
      expect(await new Response(child.stderr).text()).toBe("");
      return JSON.parse(await new Response(child.stdout).text()) as T;
    }),
  );
}

test("E4.10 I6 AC12: dos reaperturas concurrentes con claves distintas dejan una sola ventana", async () => {
  const { dir, path } = concurrentReopenFile();
  try {
    const body = { versionEsperada: 1, motivo: "Carrera de reapertura I6" };
    const children = ["a", "b"].map((suffix) =>
      runConcurrentReopen({
        path,
        body,
        key: `i6-reopen-${suffix}-` + randomUUID(),
      }),
    );
    const out = await results<{ ok: boolean; code?: string; id?: number }>(
      children,
    );
    expect(out.filter((r) => r.ok)).toHaveLength(1);
    expect(out.filter((r) => !r.ok).map((r) => r.code)).toEqual([
      "YA_REABIERTO",
    ]);

    const db = openDatabase(path);
    try {
      expect(
        db.query("SELECT COUNT(*) n FROM reaperturas").get(),
      ).toEqual({ n: 1 });
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

test("E4.10 I6 AC12: dos reaperturas con la misma clave repiten una sola ventana", async () => {
  const { dir, path } = concurrentReopenFile();
  try {
    const key = "i6-reopen-same-" + randomUUID();
    const body = { versionEsperada: 1, motivo: "Reapertura idempotente I6" };
    const children = [0, 1].map(() =>
      runConcurrentReopen({ path, body, key }),
    );
    const out = await results<{
      ok: boolean;
      id?: number;
      replayed?: boolean;
    }>(children);
    expect(out.every((r) => r.ok)).toBe(true);
    expect(out.every((r) => r.id === out[0].id)).toBe(true);
    expect(out.filter((r) => r.replayed)).toHaveLength(1);

    const db = openDatabase(path);
    try {
      expect(
        db.query("SELECT COUNT(*) n FROM reaperturas").get(),
      ).toEqual({ n: 1 });
      expect(
        db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
      ).toEqual({ n: 1 });
      expect(
        db
          .query(
            "SELECT COUNT(*) n FROM reapertura_attempts WHERE operacion='reapertura'",
          )
          .get(),
      ).toEqual({ n: 1 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.10 I6 AC12: la misma clave con payload distinto en reaperturas concurrentes da conflicto", async () => {
  const { dir, path } = concurrentReopenFile();
  try {
    const key = "i6-reopen-conflict-" + randomUUID();
    const children = [
      runConcurrentReopen({
        path,
        body: { versionEsperada: 1, motivo: "Motivo A" },
        key,
      }),
      runConcurrentReopen({
        path,
        body: { versionEsperada: 1, motivo: "Motivo B" },
        key,
      }),
    ];
    const out = await results<{ ok: boolean; code?: string; id?: number }>(
      children,
    );
    expect(out.filter((r) => r.ok)).toHaveLength(1);
    expect(out.filter((r) => !r.ok).map((r) => r.code)).toEqual([
      "IDEMPOTENCY_CONFLICT",
    ]);

    const db = openDatabase(path);
    try {
      expect(
        db.query("SELECT COUNT(*) n FROM reaperturas").get(),
      ).toEqual({ n: 1 });
      expect(
        db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
      ).toEqual({ n: 1 });
      expect(
        db
          .query(
            "SELECT COUNT(*) n FROM reapertura_attempts WHERE operacion='reapertura'",
          )
          .get(),
      ).toEqual({ n: 1 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.10 I6 AC12: la misma clave con payload distinto en re-cierres concurrentes crea una sola v2", async () => {
  const { dir, path, pre } = concurrentRecloseFile();
  try {
    const key = "i6-reclose-conflict-" + randomUUID();
    const fingerprint = pre.fingerprint;
    const children = [
      runConcurrentReclose({
        path,
        body: { versionEsperada: 1, motivo: "Motivo A", fingerprint },
        key,
      }),
      runConcurrentReclose({
        path,
        body: { versionEsperada: 1, motivo: "Motivo B", fingerprint },
        key,
      }),
    ];
    const out = await results<{
      ok: boolean;
      code?: string;
      version?: number;
      replayed?: boolean;
    }>(children);
    expect(out.filter((r) => r.ok)).toHaveLength(1);
    expect(out.filter((r) => !r.ok).map((r) => r.code)).toEqual([
      "IDEMPOTENCY_CONFLICT",
    ]);
    expect(out.find((r) => r.ok)?.version).toBe(2);

    const db = openDatabase(path);
    try {
      expect(
        db.query("SELECT COUNT(*) n FROM cierres WHERE ciclo='1'").get(),
      ).toEqual({ n: 2 });
      expect(
        db.query("SELECT COUNT(*) n FROM fotos_cierre WHERE ciclo='1'").get(),
      ).toEqual({ n: 2 });
      expect(
        db.query("SELECT COUNT(*) n FROM cierre_vinculos").get(),
      ).toEqual({ n: 1 });
      expect(
        db.query("SELECT COUNT(*) n FROM cierre_audit WHERE ciclo='1'").get(),
      ).toEqual({ n: 2 });
      expect(
        db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
      ).toEqual({ n: 0 });
      expect(
        db
          .query(
            "SELECT COUNT(*) n FROM reapertura_attempts WHERE operacion='recierre'",
          )
          .get(),
      ).toEqual({ n: 1 });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.10 I6 AC12: la misma clave con payload distinto en cancelaciones concurrentes cancela una sola vez", async () => {
  const { dir, path } = concurrentCancelFile();
  try {
    const key = "i6-cancel-conflict-" + randomUUID();
    const children = [
      runConcurrentCancel({
        path,
        body: { versionEsperada: 1, motivo: "Motivo A" },
        key,
      }),
      runConcurrentCancel({
        path,
        body: { versionEsperada: 1, motivo: "Motivo B" },
        key,
      }),
    ];
    const out = await results<{ ok: boolean; code?: string; id?: number }>(
      children,
    );
    expect(out.filter((r) => r.ok)).toHaveLength(1);
    expect(out.filter((r) => !r.ok).map((r) => r.code)).toEqual([
      "IDEMPOTENCY_CONFLICT",
    ]);

    const db = openDatabase(path);
    try {
      expect(
        db
          .query("SELECT COUNT(*) n FROM reaperturas WHERE tipo='cancelacion'")
          .get(),
      ).toEqual({ n: 1 });
      expect(
        db.query("SELECT COUNT(*) n FROM cierre_vinculos").get(),
      ).toEqual({ n: 0 });
      expect(
        db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
      ).toEqual({ n: 0 });
      expect(
        db
          .query(
            "SELECT COUNT(*) n FROM reapertura_attempts WHERE operacion='cancelacion'",
          )
          .get(),
      ).toEqual({ n: 1 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.10 I6 AC18: cadena v1 → reapertura → corrección T1/T2 real → v2 append-only, ordenada y sin huérfanos", async () => {
  const db = fixture();
  try {
    seedMovement(db, {
      id: "8601",
      importe: 5500,
      origen: "S003",
      destino: "S001",
      nota: "original",
    });
    const v1 = closeV1(db);
    const v1Row = db
      .query("SELECT * FROM cierres WHERE ciclo='1' AND version=1")
      .get();
    const v1Photo = db
      .query("SELECT * FROM fotos_cierre WHERE ciclo='1' AND version=1")
      .get();
    const v1Audit = db
      .query("SELECT * FROM cierre_audit WHERE ciclo='1' AND version=1")
      .get();

    const reopenKey = "i6-chain-reopen-" + randomUUID();
    const reopened = reopen(db, 1, "Motivo de reapertura I6", reopenKey);

    // The correction goes through the real T1/T2 surface (Movimientos), with
    // the same session/MFA/CSRF/Origin and idempotency-key used by its own
    // E4.9/E4.10 suites. It is not a direct SQL update plus manual audit.
    const api = correctionApi(db);
    await api.enroll();
    const correctionBody = {
      fecha: "2026-01-20",
      tipo: "Transferencia",
      importe: "66.00",
      origen: "S003",
      destino: "S001",
      subtipo: null,
      partida: null,
      referencia: null,
      concepto: "Hecho sintético I6",
      nota: "corregido",
      capital: null,
      intereses: null,
      revision: 1,
      motivo: "Corrección T1/T2 dentro de la ventana",
    };
    const impact = await api.request(
      "/api/movimientos/8601/impacto",
      "POST",
      correctionBody,
    );
    expect(impact.status).toBe(200);
    expect(impact.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    const correction = await api.request(
      "/api/movimientos/8601/rectificar",
      "POST",
      {
        ...correctionBody,
        contextRevision: impact.data.contextRevision,
        fingerprint: impact.data.fingerprint,
      },
      { "idempotency-key": "i6-correccion-" + randomUUID() },
    );
    expect(correction.status).toBe(200);
    expect(correction.data.movimiento.revision).toBe(2);
    expect(correction.data.movimiento.importe).toBe("66.00");
    expect(correction.data.auditoria).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          revision: 2,
          accion: "rectificación",
          motivo: "Corrección T1/T2 dentro de la ventana",
          instante: new Date(correctionNow).toISOString(),
          actor: "usuario-unico",
          anterior: expect.objectContaining({
            revision: 1,
            importe: "55.00",
          }),
        }),
      ]),
    );

    const pre = preview(db);
    expect(pre.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(pre.comparacion.estado).toBe("ConCambios");
    const closed = reclose(db, pre, validOptions({ actor: "Alex" }));
    expect(closed.foto.version).toBe(2);
    expect(closed.recierre.fingerprint).toBe(pre.fingerprint);

    // Closure versions are contiguous: there is no v1.5, skipped or duplicated.
    const closures = db
      .query("SELECT version FROM cierres WHERE ciclo='1' ORDER BY version")
      .all() as { version: number }[];
    expect(closures.map((row) => row.version)).toEqual([1, 2]);
    expect(
      db.query("SELECT COUNT(*) n FROM fotos_cierre WHERE ciclo='1'").get(),
    ).toEqual({ n: 2 });

    // The closure audit is complete and ordered by version and instant.
    const audits = db
      .query(
        `SELECT version,accion,motivo,instante,actor,anterior,posterior
         FROM cierre_audit WHERE ciclo='1' ORDER BY version,id`,
      )
      .all() as Array<{
      version: number;
      accion: string;
      motivo: string | null;
      instante: string;
      actor: string;
      anterior: string | null;
      posterior: string;
    }>;
    expect(audits.map((row) => row.version)).toEqual([1, 2]);
    expect(audits[0].instante).toBe(new Date(now).toISOString());
    expect(audits[1]).toMatchObject({
      accion: "cierre",
      motivo: "Motivo de re-cierre",
      actor: "Alex",
      instante: new Date(recloseNow).toISOString(),
    });

    // F3: the v2 audit's `anterior` is parsed and asserted, not only selected.
    expect(JSON.parse(String(audits[1].anterior))).toEqual({
      ciclo: "1",
      version: 1,
      fingerprint: v1.cierre.fingerprint,
      fotoVersion: 1,
    });

    // The reopening event is the single origin of the chain.
    const events = db
      .query(
        `SELECT id,ciclo,version_origen,tipo,actor,creado_utc,motivo,
           fingerprint_peticion,version_esperada,clave_intento,correlacion,
           reapertura_origen,resultado
         FROM reaperturas WHERE ciclo='1' ORDER BY id`,
      )
      .all() as Array<Record<string, unknown>>;
    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event).toMatchObject({
      ciclo: "1",
      version_origen: 1,
      tipo: "reapertura",
      actor: "Alex",
      motivo: "Motivo de reapertura I6",
      version_esperada: 1,
      resultado: "Abierta",
    });
    expect(event.id).toBe(reopened.reapertura.id);
    expect(event.correlacion).toBe(reopened.reapertura.correlacion);

    // F3: the event's request fingerprint, UTC and idempotency key are asserted.
    expect(event.fingerprint_peticion).toBe(
      reopened.reapertura.fingerprint,
    );
    expect(String(event.fingerprint_peticion)).toMatch(/^[a-f0-9]{64}$/);
    expect(event.creado_utc).toBe(new Date(reopenNow).toISOString());
    expect(event.clave_intento).toBe(reopenKey);

    // The link closes the reopening and points v1 → v2 with the same correlation.
    const links = db
      .query(
        `SELECT ciclo,version_origen,version_destino,reapertura_id,correlacion
         FROM cierre_vinculos WHERE ciclo='1'`,
      )
      .all();
    expect(links).toEqual([
      {
        ciclo: "1",
        version_origen: 1,
        version_destino: 2,
        reapertura_id: event.id,
        correlacion: event.correlacion,
      },
    ]);

    // The v2 audit keeps the origin, comparison and revalidation evidence.
    const posterior = JSON.parse(audits[1].posterior);
    expect(posterior).toMatchObject({
      version: 2,
      fingerprint: pre.fingerprint,
      origen: {
        versionOrigen: 1,
        reaperturaId: event.id,
        correlacion: event.correlacion,
      },
      comparacion: { estado: "ConCambios" },
    });
    expect(posterior.revalidacion).toBeDefined();
    expect(posterior.revalidacion.estado).toBeTruthy();

    // F1: the production movement route wrote the audit row. Actor, motive,
    // UTC, revision and `anterior` are asserted, and the impact fingerprint is
    // the one echoed by the confirmation.
    const corrections = db
      .query(
        `SELECT id,revision,accion,motivo,instante,actor,anterior,posterior
         FROM movement_audit WHERE id='8601' ORDER BY revision`,
      )
      .all() as Array<{
      id: string;
      revision: number;
      accion: string;
      motivo: string | null;
      instante: string;
      actor: string;
      anterior: string | null;
      posterior: string;
    }>;
    expect(corrections).toHaveLength(1);
    const correctionAudit = corrections[0];
    expect(correctionAudit).toMatchObject({
      id: "8601",
      revision: 2,
      accion: "rectificación",
      motivo: "Corrección T1/T2 dentro de la ventana",
      instante: new Date(correctionNow).toISOString(),
      actor: "usuario-unico",
    });
    const beforeCorrection = JSON.parse(String(correctionAudit.anterior));
    expect(beforeCorrection).toMatchObject({
      id: "8601",
      revision: 1,
      fecha: "2026-01-15",
      tipo: "Transferencia",
      importe: "55.00",
      origen: "S003",
      destino: "S001",
      nota: "original",
    });
    const afterCorrection = JSON.parse(String(correctionAudit.posterior));
    expect(afterCorrection).toMatchObject({
      id: "8601",
      revision: 2,
      fecha: "2026-01-20",
      tipo: "Transferencia",
      importe: "66.00",
      origen: "S003",
      destino: "S001",
      nota: "corregido",
      actualizado: new Date(correctionNow).toISOString(),
    });
    const genericAudit = db
      .query(
        `SELECT entidad,accion,revision,campos,instante,revision_previa,
           actor,motivo FROM audit WHERE entidad='movimiento:8601'
         ORDER BY id DESC LIMIT 1`,
      )
      .get() as {
      entidad: string;
      accion: string;
      revision: number;
      campos: string;
      instante: string;
      revision_previa: number;
      actor: string;
      motivo: string | null;
    };
    expect(genericAudit).toMatchObject({
      entidad: "movimiento:8601",
      accion: "rectificación",
      revision: 2,
      revision_previa: 1,
      instante: new Date(correctionNow).toISOString(),
      actor: "usuario-unico",
      motivo: "Corrección T1/T2 dentro de la ventana",
    });
    expect(JSON.parse(genericAudit.campos)).toEqual(
      expect.arrayContaining(["fecha", "importe"]),
    );

    // The T1/T2 correction sits between the reopening and the re-closure.
    const correctionInstant = new Date(correctionNow).toISOString();
    expect(correctionInstant >= String(event.creado_utc)).toBe(true);
    expect(correctionInstant <= audits[1].instante).toBe(true);

    // No gaps or orphans: every v2+ has its link, every link its event and
    // closures, and no reopening is both unlinked and inactive.
    expect(
      db
        .query(
          `SELECT COUNT(*) n FROM cierres c
           LEFT JOIN cierre_vinculos v
             ON v.ciclo=c.ciclo AND v.version_destino=c.version
           WHERE c.ciclo='1' AND c.version>1 AND v.version_destino IS NULL`,
        )
        .get(),
    ).toEqual({ n: 0 });
    expect(
      db
        .query(
          `SELECT COUNT(*) n FROM cierre_vinculos v
           LEFT JOIN reaperturas r ON r.id=v.reapertura_id
           LEFT JOIN cierres o ON o.ciclo=v.ciclo AND o.version=v.version_origen
           LEFT JOIN cierres d ON d.ciclo=v.ciclo AND d.version=v.version_destino
           WHERE r.id IS NULL OR o.version IS NULL OR d.version IS NULL`,
        )
        .get(),
    ).toEqual({ n: 0 });
    expect(
      db
        .query(
          `SELECT COUNT(*) n FROM reaperturas r
           LEFT JOIN reapertura_activa p ON p.reapertura_id=r.id
           LEFT JOIN cierre_vinculos v ON v.reapertura_id=r.id
           WHERE r.ciclo='1' AND r.tipo='reapertura'
             AND p.reapertura_id IS NULL AND v.reapertura_id IS NULL
             AND NOT EXISTS (
               SELECT 1 FROM reaperturas c
               WHERE c.tipo='cancelacion' AND c.reapertura_origen=r.id
             )`,
        )
        .get(),
    ).toEqual({ n: 0 });
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);

    // v1 and its photo/audit remain byte-identical after the whole chain.
    expect(
      db.query("SELECT * FROM cierres WHERE ciclo='1' AND version=1").get(),
    ).toEqual(v1Row as never);
    expect(
      db.query("SELECT * FROM fotos_cierre WHERE ciclo='1' AND version=1").get(),
    ).toEqual(v1Photo as never);
    expect(
      db.query("SELECT * FROM cierre_audit WHERE ciclo='1' AND version=1").get(),
    ).toEqual(v1Audit as never);
    expect(getFotoCierre(db, "1", 1).foto.version).toBe(1);

    // All three legs of the chain reject UPDATE and DELETE.
    expect(() =>
      db.run("UPDATE cierre_audit SET motivo='otro' WHERE version=2"),
    ).toThrow("immutable closure audit");
    expect(() => db.run("DELETE FROM cierre_audit WHERE version=2")).toThrow(
      "immutable closure audit",
    );
    expect(() => db.run("UPDATE reaperturas SET motivo='otro'")).toThrow(
      "immutable reopening",
    );
    expect(() => db.run("DELETE FROM reaperturas")).toThrow("no delete");
    expect(() =>
      db.run("UPDATE cierre_vinculos SET correlacion='otra'"),
    ).toThrow("immutable closure link");
    expect(() => db.run("DELETE FROM cierre_vinculos")).toThrow("no delete");
  } finally {
    db.close();
  }
});
