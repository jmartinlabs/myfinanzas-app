import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
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
import { assertDatesWritable } from "./e49-guards";
import { Problem } from "./problem";

/**
 * E4.10 cross-regression with the integrated E4.9 closure surface.
 *
 * These tests are fixtures-only and do not declare acceptance. They exercise
 * the boundary that neither suite owns by itself:
 *   E4.9 closure → E4.10 reopening → rectification → E4.10 re-closure → E4.9.
 *
 * The goal is to keep the ordinary E4.9 contract intact after E4.10 has
 * created vN+1: duplicate closure remains blocked, T1 is locked again when the
 * window closes, E4.9 idempotency still replays/conflicts without creating a
 * version, the v1 photo/audit stay immutable, and a failed re-closure rolls
 * back without weakening E4.9 or E4.10 state. No E4.9 test is modified.
 *
 * The backup/E3.5 options below are synthetic fixtures that satisfy only the
 * fixture preflight. They neither acredit DT6/T-BKP nor make AC15 a real
 * closure; the real re-closure remains BLOCKED by DT6 and a verifiable E3.5.
 */

process.env.NODE_ENV = "test";

const now = Date.parse("2026-03-10T12:00:00Z");
const reopenNow = now + 1_000;
const recloseNow = now + 60_000;
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

function validOptions(overrides: Partial<CierreOptions> = {}): CierreOptions {
  return {
    appVersion: "0.0.0-fixture-e410-cross",
    backup: {
      verificado: true,
      restauracionProbada: true,
      referencia: "backup-ficticio-e410-cross",
    },
    e35: {
      verificable: true,
      motivo: null,
      huella: "a".repeat(64),
      cobertura: "Verificada",
      datos: { fixture: "E3.5 acreditada para prueba sintética E410 cross" },
    },
    ...overrides,
  };
}

function fixture() {
  const db = openDatabase(":memory:");
  seedCycles(db);
  return db;
}

function seedMovement(
  db: Database,
  input: {
    id: string;
    fecha: string;
    importe: number;
    origen?: string;
    destino?: string;
  },
) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
       partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
       capital,intereses)
     VALUES(?,?,'Transferencia',?,?,?,NULL,NULL,NULL,?, '',0,1,?,?,NULL,NULL)`,
    [
      input.id,
      input.fecha,
      input.importe,
      input.origen ?? "S003",
      input.destino ?? "S001",
      "Hecho sintético cross E4.9/E4.10 " + input.id,
      stamp,
      stamp,
    ],
  );
}

function closeV1(
  db: Database,
  options = validOptions(),
  key = "cierre-" + randomUUID(),
  at = now,
) {
  const pre = previewCierre(db, "1", options, at);
  expect(pre.bloqueos).toEqual([]);
  return confirmCierre(
    db,
    "1",
    { fingerprint: pre.fingerprint },
    key,
    options,
    at,
  );
}

function reopen(db: Database, version = 1, key = "reapertura-" + randomUUID()) {
  return reabrirCierre(
    db,
    "1",
    { versionEsperada: version, motivo: "Motivo de reapertura cross" },
    key,
    { actor: "Alex" },
    reopenNow,
  );
}

function preview(db: Database, options = validOptions()) {
  return previewRecierre(db, "1", options, recloseNow);
}

function reclose(
  db: Database,
  pre: ReturnType<typeof preview>,
  options = validOptions(),
  key = "recierre-" + randomUUID(),
) {
  return reCerrarCiclo(
    db,
    "1",
    {
      versionEsperada: pre.origen.versionOrigen,
      motivo: "Motivo de re-cierre cross",
      fingerprint: pre.fingerprint,
    },
    key,
    options,
    recloseNow,
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

function row(db: Database, table: string, version = 1) {
  return db
    .query(`SELECT * FROM ${table} WHERE ciclo='1' AND version=?`)
    .get(version);
}

function counts(db: Database) {
  return {
    cierres: db.query("SELECT COUNT(*) n FROM cierres").get(),
    fotos: db.query("SELECT COUNT(*) n FROM fotos_cierre").get(),
    vinculos: db.query("SELECT COUNT(*) n FROM cierre_vinculos").get(),
    audit: db.query("SELECT COUNT(*) n FROM cierre_audit").get(),
    reaperturas: db.query("SELECT COUNT(*) n FROM reaperturas").get(),
    activa: db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
    attempts: db.query("SELECT COUNT(*) n FROM reapertura_attempts").get(),
  };
}

test("E4.10/E4.9 cross: v1 → reapertura → rectificación → v2 cierra la ventana, bloquea el cierre ordinario y conserva v1", () => {
  const db = fixture();
  try {
    seedMovement(db, { id: "9101", fecha: "2026-01-15", importe: 500 });
    const v1 = closeV1(db);
    const v1Cierre = row(db, "cierres", 1);
    const v1Foto = row(db, "fotos_cierre", 1);
    const v1Audit = row(db, "cierre_audit", 1);
    expect(v1.cierre.version).toBe(1);

    const reopened = reopen(db);
    expect(getReaperturaEstado(db, "1")).toMatchObject({
      estado: "Reabierto",
      version: 1,
      reapertura: { id: reopened.reapertura.id, versionOrigen: 1 },
    });

    // T1 inside the rectification window: the E4.9 guard accepts the fact only
    // because E4.10 declares this cycle/date as the active window.
    expect(() =>
      assertDatesWritable(db, ["2026-01-20"], "registrar el Movimiento", {
        allowActiveReopenedCycle: true,
      }),
    ).not.toThrow();
    seedMovement(db, { id: "9102", fecha: "2026-01-20", importe: 700 });

    const pre = preview(db);
    expect(pre.comparacion.estado).toBe("ConCambios");
    const v2 = reclose(db, pre);
    expect(v2.foto.version).toBe(2);
    expect(v2.recierre.versionOrigen).toBe(1);
    expect(v2.recierre.versionDestino).toBe(2);

    // Versioning on the E4.9 read surface: v2 is the latest closure and the
    // default photo, while explicit v1 remains available and persisted.
    expect(getCierreEstado(db, "1")).toMatchObject({
      estado: "Cerrado",
      version: 2,
      fotoVersion: 2,
    });
    expect(getFotoCierre(db, "1").foto.version).toBe(2);
    expect(getFotoCierre(db, "1", 1).foto.version).toBe(1);
    expect(getReaperturaEstado(db, "1")).toMatchObject({
      estado: "Cerrado",
      version: 2,
      reapertura: null,
    });

    // Once the window is closed, the same T1 date returns HISTORY_LOCKED again.
    const t1 = problemOf(() =>
      assertDatesWritable(db, ["2026-01-20"], "registrar el Movimiento", {
        allowActiveReopenedCycle: true,
      }),
    );
    expect(t1.status).toBe(409);
    expect(t1.code).toBe("HISTORY_LOCKED");

    // E4.9 remains the only ordinary close path, and it refuses to create v3.
    const ordinary = problemOf(() =>
      confirmCierre(
        db,
        "1",
        { fingerprint: "b".repeat(64) },
        "cierre-" + randomUUID(),
        validOptions(),
        recloseNow + 1_000,
      ),
    );
    expect(ordinary.status).toBe(409);
    expect(ordinary.code).toBe("ALREADY_CLOSED");
    expect(
      db
        .query("SELECT version FROM cierres WHERE ciclo='1' ORDER BY version")
        .all(),
    ).toEqual([{ version: 1 }, { version: 2 }]);

    // v1 and its E4.9 evidence are byte-identical after the whole chain.
    expect(row(db, "cierres", 1)).toEqual(v1Cierre as never);
    expect(row(db, "fotos_cierre", 1)).toEqual(v1Foto as never);
    expect(row(db, "cierre_audit", 1)).toEqual(v1Audit as never);

    // Direct writes are rejected by the E4.9 immutability triggers.
    expect(() =>
      db.run("UPDATE cierres SET motivo='otro' WHERE ciclo='1' AND version=1"),
    ).toThrow("immutable closure");
    expect(() =>
      db.run("DELETE FROM cierres WHERE ciclo='1' AND version=1"),
    ).toThrow("no delete");
    expect(() =>
      db.run(
        "UPDATE fotos_cierre SET motivo='otro' WHERE ciclo='1' AND version=1",
      ),
    ).toThrow("immutable closure photo");
    expect(() =>
      db.run("DELETE FROM fotos_cierre WHERE ciclo='1' AND version=1"),
    ).toThrow("no delete");
    expect(() =>
      db.run(
        "UPDATE cierre_audit SET motivo='otro' WHERE ciclo='1' AND version=1",
      ),
    ).toThrow("immutable closure audit");
    expect(() =>
      db.run("DELETE FROM cierre_audit WHERE ciclo='1' AND version=1"),
    ).toThrow("immutable closure audit");

    // Complete append-only chain: v1 close → one reopening → v2 re-closure.
    const audits = db
      .query(
        `SELECT version,accion,motivo,instante FROM cierre_audit
         WHERE ciclo='1' ORDER BY version`,
      )
      .all() as { version: number; accion: string; motivo: string | null }[];
    expect(audits.map((audit) => audit.version)).toEqual([1, 2]);
    expect(audits[1]).toMatchObject({
      accion: "cierre",
      motivo: "Motivo de re-cierre cross",
    });
    expect(
      db.query("SELECT COUNT(*) n FROM reaperturas WHERE ciclo='1'").get(),
    ).toEqual({ n: 1 });
    expect(
      db
        .query(
          `SELECT version_origen,version_destino FROM cierre_vinculos
           WHERE ciclo='1'`,
        )
        .all(),
    ).toEqual([{ version_origen: 1, version_destino: 2 }]);
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
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    db.close();
  }
});

test("E4.10/E4.9 cross: la idempotencia de E4.9 y E4.10 se mantiene separada y no duplica versiones", () => {
  const db = fixture();
  try {
    const closeKey = "cierre-e49-cross-" + randomUUID();
    const v1 = closeV1(db, validOptions(), closeKey);
    const closeBody = { fingerprint: v1.cierre.fingerprint };

    const replayV1 = confirmCierre(
      db,
      "1",
      closeBody,
      closeKey,
      validOptions(),
      now + 1_000,
    );
    expect(replayV1).toMatchObject({ replayed: true });
    expect(replayV1.cierre.version).toBe(1);
    expect(
      problemOf(() =>
        confirmCierre(
          db,
          "1",
          { fingerprint: "c".repeat(64) },
          closeKey,
          validOptions(),
          now + 2_000,
        ),
      ).code,
    ).toBe("IDEMPOTENCY_CONFLICT");

    reopen(db);
    seedMovement(db, { id: "9201", fecha: "2026-01-20", importe: 600 });
    const pre = preview(db);
    const recloseKey = "recierre-e49-cross-" + randomUUID();
    const body = {
      versionEsperada: pre.origen.versionOrigen,
      motivo: "Motivo de re-cierre cross",
      fingerprint: pre.fingerprint,
    };
    const v2 = reCerrarCiclo(
      db,
      "1",
      body,
      recloseKey,
      validOptions(),
      recloseNow,
    );
    expect(v2.foto.version).toBe(2);

    const replayV2 = reCerrarCiclo(
      db,
      "1",
      body,
      recloseKey,
      validOptions(),
      recloseNow + 1_000,
    );
    expect(replayV2).toMatchObject({ replayed: true });
    expect(replayV2.foto.version).toBe(2);
    expect(
      problemOf(() =>
        reCerrarCiclo(
          db,
          "1",
          { ...body, motivo: "Otro motivo bajo la misma clave" },
          recloseKey,
          validOptions(),
          recloseNow + 2_000,
        ),
      ).code,
    ).toBe("IDEMPOTENCY_CONFLICT");

    // Replaying the original E4.9 close after v2 exists is still a stable
    // replay of v1; it cannot jump the sequence or create a third version.
    const replayV1AfterV2 = confirmCierre(
      db,
      "1",
      closeBody,
      closeKey,
      validOptions(),
      recloseNow + 3_000,
    );
    expect(replayV1AfterV2).toMatchObject({ replayed: true });
    expect(replayV1AfterV2.cierre.version).toBe(1);
    expect(
      db
        .query("SELECT version FROM cierres WHERE ciclo='1' ORDER BY version")
        .all(),
    ).toEqual([{ version: 1 }, { version: 2 }]);
    expect(
      db.query("SELECT COUNT(*) n FROM fotos_cierre WHERE ciclo='1'").get(),
    ).toEqual({ n: 2 });
    expect(db.query("SELECT COUNT(*) n FROM cierre_vinculos").get()).toEqual({
      n: 1,
    });
    expect(
      db.query("SELECT COUNT(*) n FROM cierre_audit WHERE ciclo='1'").get(),
    ).toEqual({ n: 2 });
    expect(db.query("SELECT COUNT(*) n FROM cierre_attempts").get()).toEqual({
      n: 1,
    });
    expect(
      db.query("SELECT COUNT(*) n FROM reapertura_attempts").get(),
    ).toEqual({ n: 2 });
  } finally {
    db.close();
  }
});

test("E4.10/E4.9 cross: un fallo del re-cierre revierte todo y conserva la ventana y la consulta E4.9", () => {
  const db = fixture();
  try {
    seedMovement(db, { id: "9301", fecha: "2026-01-15", importe: 500 });
    const v1 = closeV1(db);
    const v1Photo = getFotoCierre(db, "1", 1);
    reopen(db);
    seedMovement(db, { id: "9302", fecha: "2026-01-20", importe: 700 });
    const pre = preview(db);
    const before = counts(db);

    expect(() =>
      reCerrarCiclo(
        db,
        "1",
        {
          versionEsperada: 1,
          motivo: "Motivo de re-cierre cross",
          fingerprint: pre.fingerprint,
        },
        "recierre-fallo-" + randomUUID(),
        validOptions({
          hooks: {
            beforeCommit: () => {
              throw new Error("fallo inducido cross E4.9/E4.10");
            },
          },
        }),
        recloseNow,
      ),
    ).toThrow("fallo inducido cross E4.9/E4.10");

    expect(counts(db)).toEqual(before);
    expect(getReaperturaEstado(db, "1").estado).toBe("Reabierto");
    expect(getCierreEstado(db, "1")).toMatchObject({
      estado: "Cerrado",
      version: 1,
    });
    expect(getFotoCierre(db, "1", 1)).toEqual(v1Photo);
    expect(row(db, "cierres", 1)).toBeTruthy();
    expect(row(db, "cierres", 2)).toBeNull();

    // E4.9 still sees v1 as closed and refuses an ordinary duplicate, while
    // the E4.10 window is still open and T1 remains allowed.
    expect(
      problemOf(() =>
        confirmCierre(
          db,
          "1",
          { fingerprint: "d".repeat(64) },
          "cierre-" + randomUUID(),
          validOptions(),
          recloseNow + 1_000,
        ),
      ).code,
    ).toBe("ALREADY_CLOSED");
    expect(() =>
      assertDatesWritable(db, ["2026-01-20"], "registrar el Movimiento", {
        allowActiveReopenedCycle: true,
      }),
    ).not.toThrow();

    // Retrying after the rollback succeeds and creates exactly v2.
    const retry = reclose(db, preview(db), validOptions(), "retry-cross-" + randomUUID());
    expect(retry.foto.version).toBe(2);
    expect(v1.cierre.version).toBe(1);
    expect(getCierreEstado(db, "1").version).toBe(2);
    expect(
      db
        .query("SELECT version FROM cierres WHERE ciclo='1' ORDER BY version")
        .all(),
    ).toEqual([{ version: 1 }, { version: 2 }]);
  } finally {
    db.close();
  }
});
