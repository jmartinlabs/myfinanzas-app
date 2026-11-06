import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
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
import {
  compareMaterial,
  fingerprintRecierre,
  previewRecierre,
  reCerrarCiclo,
} from "./e410-recierre";
import { Problem } from "./problem";

process.env.NODE_ENV = "test";

const now = Date.parse("2026-03-10T12:00:00Z");
const recloseNow = now + 60_000;
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas E4.10 I4 " + randomUUID();
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
    appVersion: "0.0.0-fixture-i4",
    backup: {
      verificado: true,
      restauracionProbada: true,
      referencia: "backup-ficticio-i4",
    },
    e35: {
      verificable: true,
      motivo: null,
      huella: "a".repeat(64),
      cobertura: "Verificada",
      datos: { fixture: "E3.5 acreditada para prueba sintética I4" },
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

function reopen(db: Database, version = 1, motivo = "Motivo de reapertura") {
  return reabrirCierre(
    db,
    "1",
    { versionEsperada: version, motivo },
    "reapertura-" + randomUUID(),
    { actor: "Alex" },
    now + 1_000,
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
    tipo?: "Transferencia" | "Gasto" | "Ingreso";
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
     VALUES(?,?,?,?,?,?,NULL,NULL,NULL,?,?,0,1,?,?,NULL,NULL)`,
    [
      input.id,
      input.fecha ?? "2026-01-15",
      input.tipo ?? "Transferencia",
      input.importe ?? 500,
      input.origen ?? "S000",
      input.destino ?? "S001",
      "Hecho sintético I4",
      input.nota ?? "",
      stamp,
      stamp,
    ],
  );
}

function movementAuditValue(overrides: Record<string, unknown> = {}) {
  return {
    id: "8408",
    fecha: "2026-01-15",
    tipo: "Transferencia",
    capital: null,
    intereses: null,
    referencia: null,
    importe: "55",
    origen: "S000",
    destino: "S001",
    subtipo: null,
    partida: null,
    concepto: "Hecho sintético I4",
    nota: "original",
    anulado: 0,
    revision: 1,
    creado: stamp,
    actualizado: stamp,
    ...overrides,
  };
}

function insertMovementAudit(
  db: Database,
  input: {
    revision: number;
    instante: string;
    anterior: Record<string, unknown>;
    posterior: Record<string, unknown>;
  },
) {
  db.run(
    `INSERT INTO movement_audit(id,revision,accion,motivo,instante,actor,anterior,posterior)
     VALUES('8408',?,'rectificación',NULL,?,'usuario-unico',?,?)`,
    [
      input.revision,
      input.instante,
      JSON.stringify(input.anterior),
      JSON.stringify(input.posterior),
    ],
  );
}

function seedDeuda(db: Database, id = "D0401") {  db.run(
    `INSERT INTO deudas(id,nombre,inicio,apertura,estado,revision,creado,actualizado)
     VALUES(?,'Deuda sintética I4','2025-01-01',10000,'Activa',1,?,?)`,
    [id, stamp, stamp],
  );
}

function seedClosure(
  db: Database,
  ciclo: string,
  version: number,
  inicio: string,
  fin: string,
) {
  const creado = `2026-0${Math.min(version, 9)}-01T00:00:00.000Z`;
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,
        creado_utc,motivo,fingerprint,estado)
       VALUES(?,?,?,?,10000,'usuario-unico',?,NULL,?,'Cerrado')`,
      [ciclo, version, inicio, fin, creado, "b".repeat(64)],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,
        fingerprint,app_version,schema_version,ventana_inicio,ventana_fin,
        saldo_inicial,estado_temporal,estado_hechos,estado_plan,hechos,plan,
        clasificacion,inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES(?,?,?,'usuario-unico',NULL,?,'0.0.0-fixture',26,?,?,10000,
        'Cerrado','Sin hechos','SinPlan','{}','{}','{}','{}','{}','{}','{}','{}')`,
      [ciclo, version, creado, "b".repeat(64), inicio, fin],
    );
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES(?,?,'cierre',NULL,'{}',NULL,?,'usuario-unico')`,
      [ciclo, version, creado],
    );
  })();
}

function validPlan(db: Database) {  db.run(
    `INSERT INTO presupuestos(id,nombre,fuente,destino,estado,revision,creado,actualizado)
     VALUES('PRE4101','Plan sintético I4','Gasto real','S001','Activo',1,?,?)`,
    [stamp, stamp],
  );
  db.run("INSERT INTO cycle_plans(ciclo,revision) VALUES('1',1)");
  db.run(
    `INSERT INTO cycle_plan_lines(ciclo,presupuesto,base,esencial,del_mes)
     VALUES('1','PRE4101',1000,500,200)`,
  );
  db.run(
    `INSERT INTO cycle_plan_audit(ciclo,presupuesto,revision,actor,instante,motivo,delta)
     VALUES('1','PRE4101',1,'fixture',?,NULL,'{}')`,
    [stamp],
  );
}

function counts(db: Database) {
  return {
    cierres: db.query("SELECT COUNT(*) n FROM cierres").get(),
    fotos: db.query("SELECT COUNT(*) n FROM fotos_cierre").get(),
    vinculos: db.query("SELECT COUNT(*) n FROM cierre_vinculos").get(),
    audit: db.query("SELECT COUNT(*) n FROM cierre_audit").get(),
    activa: db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
    intentos: db
      .query("SELECT COUNT(*) n FROM reapertura_attempts WHERE operacion='recierre'")
      .get(),
  };
}

test("E4.10 I4: SIN_CAMBIOS no crea foto y no toca la ventana", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    const before = counts(db);
    const pre = preview(db);
    expect(pre.origen).toMatchObject({ ciclo: "1", versionOrigen: 1 });
    expect(pre.origen.reaperturaId).toBeGreaterThan(0);
    expect(pre.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(pre.comparacion.estado).toBe("SinCambios");
    expect(pre.sinCambios).toBe(true);
    expect(pre.bloqueos).toEqual([]);

    const conflict = problemOf(() => reclose(db, pre));
    expect(conflict.status).toBe(409);
    expect(conflict.code).toBe("SIN_CAMBIOS");
    expect(counts(db)).toEqual(before);
    expect(getReaperturaEstado(db, "1").estado).toBe("Reabierto");
  } finally {
    db.close();
  }
});

test("E4.10 I4: v1 → reapertura → corrección → v2 con foto completa, vínculo y auditoría", () => {
  const db = fixture();
  try {
    closeV1(db);
    const v1 = getFotoCierre(db, "1", 1);
    const v1Row = db
      .query("SELECT * FROM cierres WHERE ciclo='1' AND version=1")
      .get();
    const v1Photo = db
      .query("SELECT * FROM fotos_cierre WHERE ciclo='1' AND version=1")
      .get();
    const v1Audit = db
      .query("SELECT * FROM cierre_audit WHERE ciclo='1' AND version=1")
      .get();
    const reapertura = reopen(db);
    seedMovement(db, { id: "8401", importe: 750, nota: "Corrección T1/T2 I4" });
    const pre = preview(db);
    expect(pre.comparacion.estado).toBe("ConCambios");
    expect(pre.comparacion.bloques).toContain("hechos");

    const result = reclose(db, pre, validOptions({ actor: "Alex" }));
    expect(result.replayed).toBe(false);
    expect(result.estado).toBe("Cerrado");
    expect(result.recierre).toMatchObject({
      versionOrigen: 1,
      versionDestino: 2,
      reaperturaId: reapertura.reapertura.id,
      correlacion: reapertura.reapertura.correlacion,
      fingerprint: pre.fingerprint,
    });
    expect(result.foto.version).toBe(2);
    expect(result.foto.appVersion).toBe("0.0.0-fixture-i4");
    expect(result.foto.schemaVersion).toBe(26);
    expect(result.foto.ventana).toMatchObject({
      inicio: "2026-01-01",
      fin: "2026-01-31",
      saldoInicial: "100.00",
    });
    expect(result.cierre.motivo).toBe("Motivo de re-cierre");
    expect(result.cierre.actor).toBe("Alex");
    expect(result.foto.hechos.movimientos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "8401" }),
      ]),
    );

    // v1 and its photo/audit are untouched; v2 and its link are added.
    expect(
      db.query("SELECT * FROM cierres WHERE ciclo='1' AND version=1").get(),
    ).toEqual(v1Row as never);
    expect(
      db.query("SELECT * FROM fotos_cierre WHERE ciclo='1' AND version=1").get(),
    ).toEqual(v1Photo as never);
    expect(
      db.query("SELECT * FROM cierre_audit WHERE ciclo='1' AND version=1").get(),
    ).toEqual(v1Audit as never);
    expect(getFotoCierre(db, "1", 1)).toEqual(v1);

    expect(
      db
        .query(
          "SELECT ciclo,version_origen,version_destino,reapertura_id,correlacion FROM cierre_vinculos",
        )
        .all(),
    ).toEqual([
      {
        ciclo: "1",
        version_origen: 1,
        version_destino: 2,
        reapertura_id: reapertura.reapertura.id,
        correlacion: reapertura.reapertura.correlacion,
      },
    ]);
    const audit = db
      .query(
        "SELECT version,accion,motivo,instante,actor,anterior,posterior FROM cierre_audit WHERE version=2",
      )
      .get() as Record<string, string | number>;
    expect(audit.accion).toBe("cierre");
    expect(audit.motivo).toBe("Motivo de re-cierre");
    expect(audit.actor).toBe("Alex");
    expect(audit.instante).toBe(new Date(recloseNow).toISOString());
    expect(JSON.parse(String(audit.anterior))).toMatchObject({
      version: 1,
      fingerprint: v1.cierre.fingerprint,
    });
    expect(JSON.parse(String(audit.posterior))).toMatchObject({
      version: 2,
      fingerprint: pre.fingerprint,
      origen: {
        versionOrigen: 1,
        reaperturaId: reapertura.reapertura.id,
      },
      comparacion: { estado: "ConCambios" },
    });
    expect(getReaperturaEstado(db, "1").estado).toBe("Cerrado");
    expect(getCierreEstado(db, "1").version).toBe(2);
  } finally {
    db.close();
  }
});

test("E4.10 I4: fingerprint C2 ata contenido, coherencia y origen", () => {
  type FingerprintCapture = Parameters<typeof fingerprintRecierre>[0];
  const base = {
    payload: { hechos: { totales: { neto: "1.00" } } },
    coherencia: {},
  } as unknown as FingerprintCapture;
  const v1 = fingerprintRecierre(base, { ciclo: "1", versionOrigen: 1 });
  const v2 = fingerprintRecierre(base, { ciclo: "1", versionOrigen: 2 });
  const other = fingerprintRecierre(
    {
      ...base,
      payload: { hechos: { totales: { neto: "2.00" } } },
    } as unknown as FingerprintCapture,
    { ciclo: "1", versionOrigen: 1 },
  );
  expect(v1).toMatch(/^[a-f0-9]{64}$/);
  expect(v1).not.toBe(v2);
  expect(v1).not.toBe(other);
});

test("E4.10 I4: re-cerrar sin ventana, versión obsoleta y payload inválido no escriben", () => {
  const db = fixture();
  try {
    closeV1(db);
    const pre = previewCierre(db, "1", validOptions(), now);
    const noWindow = problemOf(() =>
      reCerrarCiclo(
        db,
        "1",
        { versionEsperada: 1, motivo: "Motivo", fingerprint: pre.fingerprint },
        "recierre-" + randomUUID(),
        validOptions(),
        recloseNow,
      ),
    );
    expect(noWindow.status).toBe(409);
    expect(noWindow.code).toBe("NO_REABIERTO");

    reopen(db);
    const before = counts(db);
    const current = preview(db);
    const stale = problemOf(() =>
      reCerrarCiclo(
        db,
        "1",
        {
          versionEsperada: 2,
          motivo: "Motivo",
          fingerprint: current.fingerprint,
        },
        "recierre-" + randomUUID(),
        validOptions(),
        recloseNow,
      ),
    );
    expect(stale.status).toBe(409);
    expect(stale.code).toBe("VERSION_CONFLICTO");

    const blank = problemOf(() =>
      reCerrarCiclo(
        db,
        "1",
        { versionEsperada: 1, motivo: "  ", fingerprint: current.fingerprint },
        "recierre-" + randomUUID(),
        validOptions(),
        recloseNow,
      ),
    );
    expect(blank.status).toBe(422);
    expect(blank.code).toBe("VALIDATION");
    expect(counts(db)).toEqual(before);
  } finally {
    db.close();
  }
});

test("E4.10 I4: idempotencia separada, replay y conflicto de payload", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    seedMovement(db, { id: "8402", importe: 125 });
    const pre = preview(db);
    const key = "recierre-" + randomUUID();
    const first = reclose(db, pre, validOptions(), key);
    const replay = reclose(db, pre, validOptions(), key);
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.foto).toEqual(first.foto);
    expect(
      db.query("SELECT COUNT(*) n FROM cierres WHERE ciclo='1'").get(),
    ).toEqual({ n: 2 });
    expect(
      db
        .query(
          "SELECT COUNT(*) n FROM reapertura_attempts WHERE operacion='recierre'",
        )
        .get(),
    ).toEqual({ n: 1 });

    const conflict = problemOf(() =>
      reCerrarCiclo(
        db,
        "1",
        {
          versionEsperada: 1,
          motivo: "Otro motivo",
          fingerprint: pre.fingerprint,
        },
        key,
        validOptions(),
        recloseNow,
      ),
    );
    expect(conflict.status).toBe(409);
    expect(conflict.code).toBe("IDEMPOTENCY_CONFLICT");
  } finally {
    db.close();
  }
});

test("E4.10 I4: fallo inducido revierte v2, vínculo, auditoría, ventana e intento", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    seedMovement(db, { id: "8403", importe: 99 });
    const pre = preview(db);
    const before = counts(db);
    expect(() =>
      reCerrarCiclo(
        db,
        "1",
        {
          versionEsperada: 1,
          motivo: "Motivo de re-cierre",
          fingerprint: pre.fingerprint,
        },
        "recierre-" + randomUUID(),
        validOptions({
          hooks: {
            beforeCommit: () => {
              throw new Error("fallo inducido I4");
            },
          },
        }),
        recloseNow,
      ),
    ).toThrow("fallo inducido I4");
    expect(counts(db)).toEqual(before);
    expect(getReaperturaEstado(db, "1").estado).toBe("Reabierto");
    expect(getFotoCierre(db, "1", 1).foto.version).toBe(1);
    // The same key can be retried because the failed attempt rolled back.
    const retry = reclose(db, preview(db), validOptions(), "retry-" + randomUUID());
    expect(retry.foto.version).toBe(2);
  } finally {
    db.close();
  }
});

test("E4.10 I4: DT6/E3.5 y preflight bloquean antes de escribir", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    seedMovement(db, { id: "8404", importe: 42 });
    const blocked = validOptions({
      backup: null,
      e35: { verificable: false, motivo: "E3.5 sintética no verificable" },
    });
    const pre = preview(db, blocked);
    expect(pre.e49Bloqueado).toBe(true);
    const codes = pre.bloqueos.map((issue) => issue.code);
    expect(codes).toContain("BACKUP_NO_VERIFICABLE");
    expect(codes).toContain("E35_NO_VERIFICABLE");
    const before = counts(db);
    const failure = problemOf(() =>
      reCerrarCiclo(
        db,
        "1",
        {
          versionEsperada: 1,
          motivo: "Motivo de re-cierre",
          fingerprint: pre.fingerprint,
        },
        "recierre-" + randomUUID(),
        blocked,
        recloseNow,
      ),
    );
    expect(failure.status).toBe(409);
    expect([
      "BACKUP_NO_VERIFICABLE",
      "E35_NO_VERIFICABLE",
    ]).toContain(failure.code);
    expect(counts(db)).toEqual(before);
    expect(getReaperturaEstado(db, "1").estado).toBe("Reabierto");
  } finally {
    db.close();
  }
});

test("E4.10 I4: fotos vN/vN+1 persistidas, sin recálculo, y v3 secuencial", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    seedMovement(db, { id: "8405", importe: 10 });
    const v2 = reclose(db, preview(db));
    const v2Snapshot = getFotoCierre(db, "1", 2);
    expect(v2Snapshot.foto).toEqual(v2.foto);
    expect(v2Snapshot.cierre).toEqual(v2.cierre);

    // Changing the live state after the closure cannot rewrite the photo.
    seedMovement(db, { id: "8406", importe: 20 });
    expect(getFotoCierre(db, "1", 2)).toEqual(v2Snapshot);
    expect(getFotoCierre(db, "1", 1).foto.version).toBe(1);
    expect(getFotoCierre(db, "1").foto.version).toBe(2);

    // v3: sequential reopening over the last closed version.
    reopen(db, 2, "Segunda reapertura");
    seedMovement(db, { id: "8407", importe: 30 });
    const pre3 = preview(db);
    expect(pre3.origen.versionOrigen).toBe(2);
    expect(pre3.comparacion.estado).toBe("ConCambios");
    const v3 = reclose(db, pre3);
    expect(v3.foto.version).toBe(3);
    expect(v3.recierre.versionOrigen).toBe(2);
    expect(v3.recierre.versionDestino).toBe(3);
    expect(
      db
        .query(
          "SELECT version_origen,version_destino FROM cierre_vinculos ORDER BY version_destino",
        )
        .all(),
    ).toEqual([
      { version_origen: 1, version_destino: 2 },
      { version_origen: 2, version_destino: 3 },
    ]);
    expect(getCierreEstado(db, "1").version).toBe(3);
    expect(getReaperturaEstado(db, "1").estado).toBe("Cerrado");
  } finally {
    db.close();
  }
});

test("E4.10 I4: plan capturado y auxiliares vigentes se fotografían en v2", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    validPlan(db);
    seedDeuda(db);
    const pre = preview(db);
    expect(pre.plan.estado).toBe("Capturado");
    expect(pre.comparacion.estado).toBe("ConCambios");
    expect(pre.comparacion.bloques).toContain("plan");
    const result = reclose(db, pre);
    expect(result.foto.plan.estado).toBe("Capturado");
    expect(result.foto.plan.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ presupuesto: "PRE4101", base: "10.00" }),
      ]),
    );
    expect(result.foto.auxiliares.deuda).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "D0401", estado: "Activa" }),
      ]),
    );
    // SinPlan remains a valid v1 value; v2 is a full photo, not a diff.
    expect(getFotoCierre(db, "1", 1).foto.plan.estado).toBe("SinPlan");
  } finally {
    db.close();
  }
});

test("E4.10 I4: una escritura revertida no se asume equivalente", () => {
  const db = fixture();
  try {
    seedMovement(db, { id: "8408", importe: 55, nota: "original" });
    closeV1(db);
    // The movement exists in v1 with revision 1. Reopen, change a material
    // relation and revert it: the live row looks equal, but the append-only
    // movement audit records the material write.
    reopen(db);
    const first = new Date(now + 2_000).toISOString();
    const second = new Date(now + 3_000).toISOString();
    db.run(
      "UPDATE movimientos SET origen='S002',revision=2,actualizado=? WHERE id='8408'",
      [first],
    );
    insertMovementAudit(db, {
      revision: 2,
      instante: first,
      anterior: movementAuditValue({ revision: 1 }),
      posterior: movementAuditValue({ revision: 2, origen: "S002" }),
    });
    db.run(
      "UPDATE movimientos SET origen='S000',revision=3,actualizado=? WHERE id='8408'",
      [second],
    );
    insertMovementAudit(db, {
      revision: 3,
      instante: second,
      anterior: movementAuditValue({ revision: 2, origen: "S002" }),
      posterior: movementAuditValue({ revision: 3 }),
    });
    const pre = preview(db);
    expect(pre.comparacion.estado).toBe("ConCambios");
    expect(pre.comparacion.motivos.join(" ")).toContain("auditoría");
    const result = reclose(db, pre);
    expect(result.foto.version).toBe(2);
  } finally {
    db.close();
  }
});

test("E4.10 I4: una escritura T3 no material no fuerza foto (SIN_CAMBIOS)", () => {
  const db = fixture();
  try {
    seedMovement(db, { id: "8408", importe: 55, nota: "original" });
    closeV1(db);
    reopen(db);
    const instante = new Date(now + 2_000).toISOString();
    db.run(
      "UPDATE movimientos SET nota='nota corregida',revision=2,actualizado=? WHERE id='8408'",
      [instante],
    );
    insertMovementAudit(db, {
      revision: 2,
      instante,
      anterior: movementAuditValue({ revision: 1 }),
      posterior: movementAuditValue({
        revision: 2,
        nota: "nota corregida",
      }),
    });
    const pre = preview(db);
    expect(pre.comparacion.estado).toBe("SinCambios");
    expect(pre.sinCambios).toBe(true);
    const rejected = problemOf(() => reclose(db, pre));
    expect(rejected.status).toBe(409);
    expect(rejected.code).toBe("SIN_CAMBIOS");
    expect(
      db.query("SELECT COUNT(*) n FROM cierres WHERE ciclo='1'").get(),
    ).toEqual({ n: 1 });
  } finally {
    db.close();
  }
});

test("E4.10 I4: un cierre posterior durante la ventana bloquea sin tocar el posterior", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    seedMovement(db, { id: "8410", importe: 88 });
    seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
    const laterBefore = db
      .query("SELECT * FROM cierres WHERE ciclo='2' AND version=1")
      .get();
    const before = counts(db);
    const blocked = problemOf(() => preview(db));
    expect(blocked.status).toBe(409);
    expect(blocked.code).toBe("CIERRE_POSTERIOR");
    expect(counts(db)).toEqual(before);
    expect(
      db.query("SELECT * FROM cierres WHERE ciclo='2' AND version=1").get(),
    ).toEqual(laterBefore as never);
    expect(
      db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
    ).toEqual({ n: 1 });
  } finally {
    db.close();
  }
});

test("E4.10 I4: dos re-cierres con claves distintas, solo uno gana", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    seedMovement(db, { id: "8411", importe: 66 });
    const pre = preview(db);
    const first = reclose(db, pre, validOptions(), "recierre-a-" + randomUUID());
    expect(first.foto.version).toBe(2);
    const second = problemOf(() =>
      reclose(db, pre, validOptions(), "recierre-b-" + randomUUID()),
    );
    expect(second.status).toBe(409);
    expect(second.code).toBe("NO_REABIERTO");
    expect(
      db.query("SELECT COUNT(*) n FROM cierres WHERE ciclo='1'").get(),
    ).toEqual({ n: 2 });
  } finally {
    db.close();
  }
});

test("E4.10 I4 API: repreview/re-cerrar, 401/403/405, 201 y /cerrar intacto", async () => {
  const f = await apiFixture();
  try {
    expect((await f.request("/api/cierres/1/repreflight")).status).toBe(401);
    await f.enroll();
    const close = await f.close("1");
    expect(close.result.status).toBe(201);
    const abrir = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      { versionEsperada: 1, motivo: "Motivo de reapertura API" },
      { "idempotency-key": randomUUID() },
    );
    expect(abrir.status).toBe(201);

    const noCsrf = await f.request(
      "/api/cierres/1/recerrar",
      "POST",
      {},
      { "x-csrf-token": "" },
    );
    expect(noCsrf.status).toBe(403);
    expect(noCsrf.data.code).toBe("CSRF");
    const wrongPreviewMethod = await f.request(
      "/api/cierres/1/repreflight",
      "POST",
      {},
    );
    expect(wrongPreviewMethod.status).toBe(405);
    expect(wrongPreviewMethod.headers.get("allow")).toBe("GET");
    const wrongCloseMethod = await f.request("/api/cierres/1/recerrar");
    expect(wrongCloseMethod.status).toBe(405);
    expect(wrongCloseMethod.headers.get("allow")).toBe("POST");

    // Change the live state inside the window, then confirm through the API.
    seedMovement(f.db, { id: "8409", importe: 77 });
    const pre = await f.request("/api/cierres/1/repreflight");
    expect(pre.status).toBe(200);
    expect(pre.headers.get("cache-control")).toBe("no-store");
    expect(pre.data.comparacion.estado).toBe("ConCambios");
    expect(pre.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    const missingKey = await f.request(
      "/api/cierres/1/recerrar",
      "POST",
      {
        versionEsperada: 1,
        motivo: "Motivo de re-cierre API",
        fingerprint: pre.data.fingerprint,
      },
    );
    expect(missingKey.status).toBe(422);
    expect(missingKey.data.code).toBe("IDEMPOTENCY_REQUIRED");
    const result = await f.request(
      "/api/cierres/1/recerrar",
      "POST",
      {
        versionEsperada: 1,
        motivo: "Motivo de re-cierre API",
        fingerprint: pre.data.fingerprint,
      },
      { "idempotency-key": randomUUID() },
    );
    expect(result.status).toBe(201);
    expect(result.headers.get("location")).toBe(
      "/api/cierres/1/foto?version=2",
    );
    expect(result.data.foto.version).toBe(2);
    expect(result.data.foto.schemaVersion).toBe(26);
    expect((await f.request("/api/cierres/1/reapertura")).data.estado).toBe(
      "Cerrado",
    );
    expect((await f.request("/api/cierres/1/foto?version=2")).data.foto.version).toBe(
      2,
    );

    // E4.9's own route still rejects a second ordinary closure.
    const ordinary = await f.request(
      "/api/cierres/1/cerrar",
      "POST",
      { fingerprint: pre.data.fingerprint },
      { "idempotency-key": randomUUID() },
    );
    expect(ordinary.status).toBe(409);
    expect(ordinary.data.code).toBe("ALREADY_CLOSED");
  } finally {
    f.db.close();
  }
});

async function apiFixture() {
  const db = openDatabase(":memory:");
  seedCycles(db);
  const key = randomBytes(32);
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
  async function close(ciclo: string) {
    const pre = await request(`/api/cierres/${ciclo}/preflight`);
    expect(pre.status).toBe(200);
    const result = await request(
      `/api/cierres/${ciclo}/cerrar`,
      "POST",
      { fingerprint: pre.data.fingerprint },
      { "idempotency-key": randomUUID() },
    );
    return { pre, result };
  }
  return { db, key, request, enroll, close };
}
