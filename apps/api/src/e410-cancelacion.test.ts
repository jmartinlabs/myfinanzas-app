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
import { confirmCierre, previewCierre, type CierreOptions } from "./e49";
import { getReaperturaEstado, reabrirCierre } from "./e410";
import { cancelarReapertura } from "./e410-cancelacion";
import { previewRecierre, reCerrarCiclo } from "./e410-recierre";
import {
  activeReopenedCycle,
  assertDatesWritable,
} from "./e49-guards";
import { Problem } from "./problem";

process.env.NODE_ENV = "test";

const now = Date.parse("2026-03-10T12:00:00Z");
const cancelNow = now + 60_000;
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas E4.10 I5 " + randomUUID();
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
    appVersion: "0.0.0-fixture-i5",
    backup: {
      verificado: true,
      restauracionProbada: true,
      referencia: "backup-ficticio-i5",
    },
    e35: {
      verificable: true,
      motivo: null,
      huella: "a".repeat(64),
      cobertura: "Verificada",
      datos: { fixture: "E3.5 acreditada para prueba sintética I5" },
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
  motivo = "Motivo de reapertura",
  at = now + 1_000,
) {
  return reabrirCierre(
    db,
    "1",
    { versionEsperada: version, motivo },
    "reapertura-" + randomUUID(),
    { actor: "Alex" },
    at,
  );
}

function cancel(
  db: Database,
  body: Record<string, unknown>,
  key = "cancelacion-" + randomUUID(),
  options: CierreOptions = validOptions(),
  at = cancelNow,
) {
  return cancelarReapertura(
    db,
    "1",
    body,
    key,
    { actor: "Alex", ...options },
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
     VALUES(?,?,?,?,?,?,NULL,NULL,NULL,?,?,0,1,?,?,NULL,NULL)`,
    [
      input.id,
      input.fecha ?? "2026-01-15",
      input.tipo ?? "Transferencia",
      input.importe ?? 500,
      input.origen ?? "S000",
      input.destino ?? "S001",
      "Hecho sintético I5",
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
    concepto: "Hecho sintético I5",
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

function instrumentAuditValue(overrides: Record<string, unknown> = {}) {
  return {
    id: "I9001",
    nombre: "Instrumento I5",
    isin: null,
    isinEvidencia: null,
    divisaReferencia: null,
    estado: "Activa",
    revision: 1,
    ...overrides,
  };
}

function seedInstrumento(db: Database, id = "I9001") {
  db.run(
    `INSERT INTO instrumentos(id,nombre,estado,revision,creado_en,actualizado_en)
     VALUES(?,?,'Activa',1,?,?)`,
    [id, "Instrumento I5", stamp, stamp],
  );
}

function insertInstrumentoAudit(
  db: Database,
  input: {
    revision: number;
    instante: string;
    anterior: Record<string, unknown>;
    posterior: Record<string, unknown>;
  },
) {
  db.run(
    `INSERT INTO instrumento_audit(instrumento,revision,accion,motivo,instante,
       actor,anterior,posterior)
     VALUES('I9001',?,'edición',NULL,?,'usuario-unico',?,?)`,
    [
      input.revision,
      input.instante,
      JSON.stringify(input.anterior),
      JSON.stringify(input.posterior),
    ],
  );
}

function debtAuditValue(overrides: Record<string, unknown> = {}) {
  return {
    id: "D0401",
    nombre: "Deuda I5",
    inicio: "2025-01-01",
    capitalApertura: "10000.00",
    estado: "Activa",
    tipoDeuda: null,
    tin: null,
    tae: null,
    cuotaContractual: null,
    condiciones: null,
    revision: 1,
    ...overrides,
  };
}

function seedDeuda(db: Database, id = "D0401") {
  db.run(
    `INSERT INTO deudas(id,nombre,inicio,apertura,estado,revision,creado,actualizado)
     VALUES(?,'Deuda I5','2025-01-01',10000,'Activa',1,?,?)`,
    [id, stamp, stamp],
  );
}

function insertDebtAudit(
  db: Database,
  input: {
    revision: number;
    instante: string;
    anterior: Record<string, unknown>;
    posterior: Record<string, unknown>;
  },
) {
  db.run(
    `INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,
       actor,motivo)
     VALUES('D0401','edición',?,?,?,?,'usuario-unico',NULL)`,
    [
      input.revision,
      JSON.stringify({ anterior: input.anterior, posterior: input.posterior }),
      input.instante,
      input.revision - 1,
    ],
  );
}

function seedClassification(db: Database) {
  db.run(
    `INSERT INTO categorias(id,nombre,grupo,anual,mensual,referencia,estado,
       revision,creado,actualizado)
     VALUES('CAT9001','Categoría I5','Gasto','Gasto','Gasto',0,'Activa',1,?,?)`,
    [stamp, stamp],
  );
  db.run(
    `INSERT INTO subcategorias(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('SUB9001','Subcategoría I5','CAT9001','Activa',1,?,?)`,
    [stamp, stamp],
  );
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR9001','Partida I5','SUB9001','Activa',1,?,?)`,
    [stamp, stamp],
  );
}

function insertClassificationAudit(
  db: Database,
  input: {
    entidad: string;
    revision: number;
    instante: string;
    campos: string[];
  },
) {
  db.run(
    `INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,
       actor,motivo)
     VALUES(?,'edición',?,?,?,?,'usuario-unico','Fixture T3 I5')`,
    [
      input.entidad,
      input.revision,
      JSON.stringify(input.campos),
      input.instante,
      input.revision - 1,
    ],
  );
}

function seedRevisionComida(db: Database, movimiento = "8408") {
  db.run(
    `INSERT INTO movimiento_revision_comida(movimiento,etiqueta,
       evidencia_bancaria,evidencia_comercial,estado_revision,
       revision_movimiento,revision,creado,actualizado)
     VALUES(?,'Comida','Evidencia I5','Evidencia comercial I5','Revisada',1,1,?,?)`,
    [movimiento, stamp, stamp],
  );
}

function foodMetadataValue(overrides: Record<string, unknown> = {}) {
  return {
    movimiento: "8408",
    etiqueta: "Comida",
    evidenciaBancaria: "Evidencia I5",
    evidenciaComercial: "Evidencia comercial I5",
    estadoRevision: "Revisada",
    revisionMovimiento: 1,
    revision: 1,
    creado: stamp,
    actualizado: stamp,
    ...overrides,
  };
}

function insertFoodAudit(
  db: Database,
  input: {
    revision: number;
    instante: string;
    anterior: Record<string, unknown>;
    posterior: Record<string, unknown>;
  },
) {
  db.run(
    `INSERT INTO movimiento_revision_comida_audit(movimiento,accion,revision,
       anterior,posterior,motivo,instante,actor)
     VALUES('8408','rectificación',?,?,?,NULL,?,'usuario-unico')`,
    [
      input.revision,
      JSON.stringify(input.anterior),
      JSON.stringify(input.posterior),
      input.instante,
    ],
  );
}

function seedReference(db: Database, id = "REF9001") {
  db.run(
    `INSERT INTO referencias(id,nombre,tipo,estado,revision,creado,actualizado)
     VALUES(?,'Referencia I5','Viaje','Activa',1,?,?)`,
    [id, stamp, stamp],
  );
}

function referenceAuditValue(overrides: Record<string, unknown> = {}) {
  return {
    id: "REF9001",
    nombre: "Referencia I5",
    tipo: "Viaje",
    estado: "Activa",
    revision: 1,
    creado: stamp,
    actualizado: stamp,
    ...overrides,
  };
}

function insertReferenceAudit(
  db: Database,
  input: {
    revision: number;
    instante: string;
    anterior: Record<string, unknown>;
    posterior: Record<string, unknown>;
  },
) {
  db.run(
    `INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,
       actor,motivo)
     VALUES('REF9001','edición',?,?,?,?,'usuario-unico',NULL)`,
    [
      input.revision,
      JSON.stringify({ anterior: input.anterior, posterior: input.posterior }),
      input.instante,
      input.revision - 1,
    ],
  );
}

function seedBrokenClosure(
  db: Database,
  ciclo = "1",
  version = 1,
  inicio = "2026-01-01",
  fin = "2026-01-31",
) {
  const creado = "2026-01-01T00:00:00.000Z";
  const fingerprintValue = "b".repeat(64);
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,
        creado_utc,motivo,fingerprint,estado)
       VALUES(?,?,?,?,10000,'usuario-unico',?,NULL,?,'Cerrado')`,
      [ciclo, version, inicio, fin, creado, fingerprintValue],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,
        fingerprint,app_version,schema_version,ventana_inicio,ventana_fin,
        saldo_inicial,estado_temporal,estado_hechos,estado_plan,hechos,plan,
        clasificacion,inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES(?,?,?,'usuario-unico',NULL,?,'0.0.0-fixture',26,?,?,10000,
        'Cerrado','Sin hechos','SinPlan','null',
        '{"estado":"SinPlan","items":[],"revision":null,"sinPlanificar":false}',
        '{"categorias":[],"subcategorias":[],"partidas":[],"referencias":[]}',
        '{"efectivo":null,"cuentas":[],"posiciones":[],"operaciones":[],"instrumentos":[]}',
        '{"anticipos":[],"compartidos":[],"nomina":[],"revisionComida":[],"deuda":[],"e35":{"verificable":true,"huella":null}}',
        '{}','{}','{}')`,
      [ciclo, version, creado, fingerprintValue, inicio, fin],
    );
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES(?,?,'cierre',NULL,'{}',NULL,?,'usuario-unico')`,
      [ciclo, version, creado],
    );
  })();
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

function v1Snapshot(db: Database) {
  return {
    cierres: db
      .query("SELECT * FROM cierres WHERE ciclo='1' ORDER BY version")
      .all(),
    fotos: db
      .query("SELECT * FROM fotos_cierre WHERE ciclo='1' ORDER BY version")
      .all(),
    audit: db
      .query("SELECT * FROM cierre_audit WHERE ciclo='1' ORDER BY id")
      .all(),
  };
}

function counts(db: Database) {
  return {
    cierres: db.query("SELECT COUNT(*) n FROM cierres").get(),
    fotos: db.query("SELECT COUNT(*) n FROM fotos_cierre").get(),
    audit: db.query("SELECT COUNT(*) n FROM cierre_audit").get(),
    activa: db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
    eventos: db.query("SELECT COUNT(*) n FROM reaperturas").get(),
    cancelaciones: db
      .query("SELECT COUNT(*) n FROM reaperturas WHERE tipo='cancelacion'")
      .get(),
    intentos: db
      .query(
        "SELECT COUNT(*) n FROM reapertura_attempts WHERE operacion='cancelacion'",
      )
      .get(),
  };
}

function cancellationEvents(db: Database) {
  return db
    .query(
      "SELECT * FROM reaperturas WHERE tipo='cancelacion' ORDER BY id",
    )
    .all() as {
    id: number;
    ciclo: string;
    version_origen: number;
    actor: string;
    creado_utc: string;
    motivo: string;
    reapertura_origen: number;
    resultado: string;
  }[];
}

test("E4.10 I5: cancelar sin cambios no crea foto, deja vN intacta y re-bloquea T1", () => {
  const db = fixture();
  try {
    seedMovement(db, { id: "8408", importe: 55, nota: "original" });
    closeV1(db);
    const opened = reopen(db);
    const before = v1Snapshot(db);
    expect(activeReopenedCycle(db)).toBe("1");
    expect(() =>
      assertDatesWritable(db, ["2026-01-15"], "registrar el Movimiento", {
        allowActiveReopenedCycle: true,
      }),
    ).not.toThrow();

    const result = cancel(db, {
      versionEsperada: 1,
      motivo: "  Sin cambios materiales  ",
    });

    expect(result).toMatchObject({
      ciclo: "1",
      estado: "Cerrado",
      version: 1,
      replayed: false,
    });
    expect(result.comparacion.estado).toBe("SinCambios");
    expect(result.cancelacion).toMatchObject({
      reaperturaOrigen: opened.reapertura.id,
      versionOrigen: 1,
      actor: "Alex",
      motivo: "Sin cambios materiales",
      creadoUtc: new Date(cancelNow).toISOString(),
    });
    expect(result.cancelacion.id).toBeGreaterThan(0);
    expect(result.cancelacion.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(getReaperturaEstado(db, "1")).toMatchObject({
      ciclo: "1",
      estado: "Cerrado",
      version: 1,
      reapertura: null,
    });
    expect(v1Snapshot(db)).toEqual(before);
    expect(cancellationEvents(db)).toEqual([
      expect.objectContaining({
        ciclo: "1",
        version_origen: 1,
        actor: "Alex",
        creado_utc: new Date(cancelNow).toISOString(),
        motivo: "Sin cambios materiales",
        reapertura_origen: opened.reapertura.id,
        resultado: "Cancelada (SinCambios)",
      }),
    ]);
    expect(
      db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
    ).toEqual({ n: 0 });
    expect(activeReopenedCycle(db)).toBeNull();

    const blocked = problemOf(() =>
      assertDatesWritable(db, ["2026-01-15"], "registrar el Movimiento", {
        allowActiveReopenedCycle: true,
      }),
    );
    expect(blocked.status).toBe(409);
    expect(blocked.code).toBe("HISTORY_LOCKED");
  } finally {
    db.close();
  }
});

test("E4.10 I5: un cambio material rechaza la cancelación y guía a vN+1", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    seedMovement(db, { id: "8410", importe: 88 });
    const before = counts(db);

    const rejected = problemOf(() =>
      cancel(db, { versionEsperada: 1, motivo: "Intento de cancelar" }),
    );

    expect(rejected.status).toBe(409);
    expect(rejected.code).toBe("CAMBIOS_MATERIALES");
    expect(rejected.message).toContain("re-cierre vN+1");
    expect(rejected.details).toMatchObject({
      siguientePaso: "recierre",
      versionSiguiente: 2,
    });
    expect(rejected.details.comparacion).toMatchObject({
      estado: "ConCambios",
    });
    expect(counts(db)).toEqual(before);
    expect(getReaperturaEstado(db, "1").estado).toBe("Reabierto");
    expect(cancellationEvents(db)).toEqual([]);

    // The documented exit is the I4 re-closure, not a silent cancellation.
    const pre = previewRecierre(db, "1", validOptions(), cancelNow);
    expect(pre.comparacion.estado).toBe("ConCambios");
    const reclosed = reCerrarCiclo(
      db,
      "1",
      {
        versionEsperada: 1,
        motivo: "Motivo de re-cierre tras rechazo",
        fingerprint: pre.fingerprint,
      },
      "recierre-" + randomUUID(),
      validOptions(),
      cancelNow,
    );
    expect(reclosed.foto.version).toBe(2);
    expect(cancellationEvents(db)).toEqual([]);
  } finally {
    db.close();
  }
});

test("E4.10 I5: cambios materiales revertidos no se acreditan como ausencia", () => {
  const db = fixture();
  try {
    seedMovement(db, { id: "8408", importe: 55, nota: "original" });
    closeV1(db);
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
    const before = counts(db);

    const rejected = problemOf(() =>
      cancel(db, { versionEsperada: 1, motivo: "Creo que quedó igual" }),
    );

    expect(rejected.status).toBe(409);
    expect(rejected.code).toBe("CAMBIOS_MATERIALES");
    expect(rejected.details.comparacion).toMatchObject({
      estado: "ConCambios",
    });
    expect(counts(db)).toEqual(before);
    expect(getReaperturaEstado(db, "1").estado).toBe("Reabierto");
  } finally {
    db.close();
  }
});

test("E4.10 I5: evidencia insuficiente bloquea sin escribir", () => {
  const db = fixture();
  try {
    seedBrokenClosure(db);
    reopen(db);
    const before = counts(db);

    const rejected = problemOf(() =>
      cancel(db, { versionEsperada: 1, motivo: "Intento sin evidencia" }),
    );

    expect(rejected.status).toBe(409);
    expect(rejected.code).toBe("IMPACTO_NO_VERIFICABLE");
    expect(rejected.details).toMatchObject({
      siguientePaso: "recierre",
      versionSiguiente: 2,
    });
    expect(rejected.details.comparacion).toMatchObject({
      estado: "NoVerificable",
    });
    expect(counts(db)).toEqual(before);
    expect(getReaperturaEstado(db, "1").estado).toBe("Reabierto");
    expect(cancellationEvents(db)).toEqual([]);
  } finally {
    db.close();
  }
});

test("E4.10 I5 R1: cierre posterior + SinCambios permite cancelar sin foto y no lo altera", () => {
  const db = fixture();
  try {
    closeV1(db);
    const opened = reopen(db);
    seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
    const later = db
      .query("SELECT * FROM cierres WHERE ciclo='2' AND version=1")
      .get();
    const before = v1Snapshot(db);
    const beforeCounts = counts(db);

    const result = cancel(db, {
      versionEsperada: 1,
      motivo: "Sin cambios pese al cierre posterior",
    });

    expect(result).toMatchObject({
      ciclo: "1",
      estado: "Cerrado",
      version: 1,
      replayed: false,
      comparacion: { estado: "SinCambios" },
      cierrePosterior: { ciclo: "2", version: 1 },
    });
    expect(result.cancelacion).toMatchObject({
      reaperturaOrigen: opened.reapertura.id,
      versionOrigen: 1,
      motivo: "Sin cambios pese al cierre posterior",
    });
    expect(v1Snapshot(db)).toEqual(before);
    expect(
      db.query("SELECT * FROM cierres WHERE ciclo='2' AND version=1").get(),
    ).toEqual(later as never);
    expect(
      db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
    ).toEqual({ n: 0 });
    expect(cancellationEvents(db)).toEqual([
      expect.objectContaining({
        ciclo: "1",
        version_origen: 1,
        reapertura_origen: opened.reapertura.id,
        resultado: "Cancelada (SinCambios)",
      }),
    ]);
    expect(counts(db)).toEqual({
      ...beforeCounts,
      activa: { n: 0 },
      eventos: { n: 2 },
      cancelaciones: { n: 1 },
      intentos: { n: 1 },
    });
    expect(getReaperturaEstado(db, "1").estado).toBe("Cerrado");
    expect(activeReopenedCycle(db)).toBeNull();
  } finally {
    db.close();
  }
});

test("E4.10 I5 R1: cierre posterior + cambios materiales bloquea con recuperación extraordinaria", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
    seedMovement(db, { id: "8412", importe: 42 });
    const later = db
      .query("SELECT * FROM cierres WHERE ciclo='2' AND version=1")
      .get();
    const before = counts(db);

    const rejected = problemOf(() =>
      cancel(db, { versionEsperada: 1, motivo: "Intento con cierre posterior" }),
    );

    expect(rejected.status).toBe(409);
    expect(rejected.code).toBe("CIERRE_POSTERIOR");
    expect(rejected.message).toContain("recuperación extraordinaria");
    expect(rejected.details).toMatchObject({
      siguientePaso: "recuperacion_extraordinaria",
      comparacion: { estado: "ConCambios" },
      cierrePosterior: { ciclo: "2", version: 1 },
    });
    expect(counts(db)).toEqual(before);
    expect(
      db.query("SELECT * FROM cierres WHERE ciclo='2' AND version=1").get(),
    ).toEqual(later as never);
    expect(
      db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
    ).toEqual({ n: 1 });
    expect(cancellationEvents(db)).toEqual([]);
  } finally {
    db.close();
  }
});

test("E4.10 I5 R1: cierre posterior + evidencia insuficiente bloquea con recuperación extraordinaria", () => {
  const db = fixture();
  try {
    seedBrokenClosure(db);
    reopen(db);
    seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
    const before = counts(db);

    const rejected = problemOf(() =>
      cancel(db, { versionEsperada: 1, motivo: "Intento sin evidencia" }),
    );

    expect(rejected.status).toBe(409);
    expect(rejected.code).toBe("CIERRE_POSTERIOR");
    expect(rejected.details).toMatchObject({
      siguientePaso: "recuperacion_extraordinaria",
      comparacion: { estado: "NoVerificable" },
      cierrePosterior: { ciclo: "2", version: 1 },
    });
    expect(counts(db)).toEqual(before);
    expect(
      db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
    ).toEqual({ n: 1 });
    expect(cancellationEvents(db)).toEqual([]);
  } finally {
    db.close();
  }
});

test("E4.10 I5: una escritura T3 no material no impide la cancelación", () => {
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

    const result = cancel(db, {
      versionEsperada: 1,
      motivo: "Solo se corrigió una nota",
    });

    expect(result.comparacion.estado).toBe("SinCambios");
    expect(getReaperturaEstado(db, "1")).toMatchObject({
      estado: "Cerrado",
      version: 1,
    });
    expect(cancellationEvents(db)).toHaveLength(1);
    expect(
      db.query("SELECT COUNT(*) n FROM fotos_cierre WHERE ciclo='1'").get(),
    ).toEqual({ n: 1 });
  } finally {
    db.close();
  }
});

test("E4.10 I5 R3: renombrados T3 de instrumento, clasificación, deuda y referencia no impiden cancelar", () => {
  const db = fixture();
  try {
    seedInstrumento(db);
    seedClassification(db);
    seedDeuda(db);
    seedReference(db);
    closeV1(db);
    reopen(db);
    const first = new Date(now + 2_000).toISOString();

    db.run(
      "UPDATE instrumentos SET nombre='Instrumento renombrado',revision=2,actualizado_en=? WHERE id='I9001'",
      [first],
    );
    insertInstrumentoAudit(db, {
      revision: 2,
      instante: first,
      anterior: instrumentAuditValue({ revision: 1 }),
      posterior: instrumentAuditValue({
        revision: 2,
        nombre: "Instrumento renombrado",
      }),
    });
    db.run(
      "UPDATE categorias SET nombre='Categoría renombrada',grupo='Ocio',revision=2,actualizado=? WHERE id='CAT9001'",
      [first],
    );
    insertClassificationAudit(db, {
      entidad: "CAT9001",
      revision: 2,
      instante: first,
      campos: ["nombre", "grupo"],
    });
    db.run(
      "UPDATE deudas SET nombre='Deuda renombrada',revision=2,actualizado=? WHERE id='D0401'",
      [first],
    );
    insertDebtAudit(db, {
      revision: 2,
      instante: first,
      anterior: debtAuditValue({ revision: 1 }),
      posterior: debtAuditValue({
        revision: 2,
        nombre: "Deuda renombrada",
      }),
    });
    db.run(
      "UPDATE referencias SET nombre='Referencia renombrada',revision=2,actualizado=? WHERE id='REF9001'",
      [first],
    );
    insertReferenceAudit(db, {
      revision: 2,
      instante: first,
      anterior: referenceAuditValue({ revision: 1 }),
      posterior: referenceAuditValue({
        revision: 2,
        nombre: "Referencia renombrada",
      }),
    });

    const result = cancel(db, {
      versionEsperada: 1,
      motivo: "Solo renombrados T3",
    });

    expect(result.comparacion.estado).toBe("SinCambios");
    expect(getReaperturaEstado(db, "1")).toMatchObject({
      estado: "Cerrado",
      version: 1,
    });
    expect(cancellationEvents(db)).toHaveLength(1);
    expect(
      db.query("SELECT COUNT(*) n FROM fotos_cierre WHERE ciclo='1'").get(),
    ).toEqual({ n: 1 });
  } finally {
    db.close();
  }
});

test("E4.10 I5 R3: una evidencia de revisión comida es T3 y no impide cancelar", () => {
  const db = fixture();
  try {
    seedMovement(db, {
      id: "8408",
      tipo: "Devolución de gasto",
      importe: 55,
    });
    seedRevisionComida(db);
    closeV1(db);
    reopen(db);
    const instante = new Date(now + 2_000).toISOString();
    db.run(
      "UPDATE movimiento_revision_comida SET evidencia_bancaria='Nueva evidencia',evidencia_comercial='Nueva comercial',revision=2,actualizado=? WHERE movimiento='8408'",
      [instante],
    );
    insertFoodAudit(db, {
      revision: 2,
      instante,
      anterior: foodMetadataValue({ revision: 1 }),
      posterior: foodMetadataValue({
        revision: 2,
        evidenciaBancaria: "Nueva evidencia",
        evidenciaComercial: "Nueva comercial",
      }),
    });

    const result = cancel(db, {
      versionEsperada: 1,
      motivo: "Solo cambió la evidencia",
    });

    expect(result.comparacion.estado).toBe("SinCambios");
    expect(getReaperturaEstado(db, "1")).toMatchObject({
      estado: "Cerrado",
      version: 1,
    });
    expect(cancellationEvents(db)).toHaveLength(1);
  } finally {
    db.close();
  }
});

test("E4.10 I5 R3: los cambios materiales T1/T2 siguen bloqueando", () => {
  const scenarios: {
    nombre: string;
    seed: (db: Database) => void;
    change: (db: Database, instante: string) => void;
  }[] = [
    {
      nombre: "instrumento",
      seed: (db) => seedInstrumento(db),
      change: (db, instante) => {
        db.run(
          "UPDATE instrumentos SET divisa_referencia='USD',revision=2,actualizado_en=? WHERE id='I9001'",
          [instante],
        );
        insertInstrumentoAudit(db, {
          revision: 2,
          instante,
          anterior: instrumentAuditValue({ revision: 1 }),
          posterior: instrumentAuditValue({
            revision: 2,
            divisaReferencia: "USD",
          }),
        });
      },
    },
    {
      nombre: "categoría",
      seed: (db) => seedClassification(db),
      change: (db, instante) => {
        db.run(
          "UPDATE categorias SET estado='Inactiva',revision=2,actualizado=? WHERE id='CAT9001'",
          [instante],
        );
        insertClassificationAudit(db, {
          entidad: "CAT9001",
          revision: 2,
          instante,
          campos: ["estado"],
        });
      },
    },
    {
      nombre: "deuda",
      seed: (db) => seedDeuda(db),
      change: (db, instante) => {
        db.run(
          "UPDATE deudas SET tin=2500000,revision=2,actualizado=? WHERE id='D0401'",
          [instante],
        );
        insertDebtAudit(db, {
          revision: 2,
          instante,
          anterior: debtAuditValue({ revision: 1 }),
          posterior: debtAuditValue({ revision: 2, tin: "2500000" }),
        });
      },
    },
    {
      nombre: "referencia",
      seed: (db) => seedReference(db),
      change: (db, instante) => {
        db.run(
          "UPDATE referencias SET tipo='Evento',revision=2,actualizado=? WHERE id='REF9001'",
          [instante],
        );
        insertReferenceAudit(db, {
          revision: 2,
          instante,
          anterior: referenceAuditValue({ revision: 1 }),
          posterior: referenceAuditValue({ revision: 2, tipo: "Evento" }),
        });
      },
    },
    {
      nombre: "revisión comida",
      seed: (db) => {
        seedMovement(db, {
          id: "8408",
          tipo: "Devolución de gasto",
          importe: 55,
        });
        seedRevisionComida(db);
      },
      change: (db, instante) => {
        db.run(
          "UPDATE movimiento_revision_comida SET etiqueta='Ocio',revision=2,actualizado=? WHERE movimiento='8408'",
          [instante],
        );
        insertFoodAudit(db, {
          revision: 2,
          instante,
          anterior: foodMetadataValue({ revision: 1 }),
          posterior: foodMetadataValue({ revision: 2, etiqueta: "Ocio" }),
        });
      },
    },
  ];

  for (const scenario of scenarios) {
    const db = fixture();
    try {
      scenario.seed(db);
      closeV1(db);
      reopen(db);
      const instante = new Date(now + 2_000).toISOString();
      scenario.change(db, instante);
      const before = counts(db);

      const rejected = problemOf(() =>
        cancel(db, {
          versionEsperada: 1,
          motivo: `Intento material: ${scenario.nombre}`,
        }),
      );

      expect(rejected.status).toBe(409);
      expect(rejected.code).toBe("CAMBIOS_MATERIALES");
      expect(rejected.details.comparacion).toMatchObject({
        estado: "ConCambios",
      });
      expect(counts(db)).toEqual(before);
      expect(getReaperturaEstado(db, "1").estado).toBe("Reabierto");
    } finally {
      db.close();
    }
  }
});

test("E4.10 I5 R5: un fallo antes del commit revierte evento, intento y proyección", () => {
  const db = fixture();
  try {
    closeV1(db);
    const opened = reopen(db);
    const before = counts(db);
    const beforeV1 = v1Snapshot(db);

    expect(() =>
      cancel(
        db,
        { versionEsperada: 1, motivo: "Fallo inducido" },
        "cancelacion-" + randomUUID(),
        {
          ...validOptions(),
          hooks: {
            beforeCommit: () => {
              throw new Error("fallo inducido I5");
            },
          },
        },
      ),
    ).toThrow("fallo inducido I5");

    expect(counts(db)).toEqual(before);
    expect(v1Snapshot(db)).toEqual(beforeV1);
    expect(getReaperturaEstado(db, "1")).toMatchObject({
      estado: "Reabierto",
      version: 1,
    });
    expect(activeReopenedCycle(db)).toBe("1");
    expect(
      db
        .query(
          "SELECT COUNT(*) n FROM reapertura_activa WHERE reapertura_id=?",
        )
        .get(opened.reapertura.id),
    ).toEqual({ n: 1 });
    expect(cancellationEvents(db)).toEqual([]);
  } finally {
    db.close();
  }
});

test("E4.10 I5 R5: cancelar una reapertura de v2 deja v1 y v2 intactas", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    seedMovement(db, { id: "8430", importe: 30 });
    const pre = previewRecierre(db, "1", validOptions(), cancelNow);
    const reclosed = reCerrarCiclo(
      db,
      "1",
      {
        versionEsperada: 1,
        motivo: "Motivo de re-cierre v2",
        fingerprint: pre.fingerprint,
      },
      "recierre-" + randomUUID(),
      validOptions(),
      cancelNow,
    );
    expect(reclosed.foto.version).toBe(2);
    reopen(db, 2, "Segunda reapertura", cancelNow + 1_000);
    const v1 = v1Snapshot(db);

    const result = cancel(
      db,
      { versionEsperada: 2, motivo: "Sin cambios en v2" },
      "cancelacion-" + randomUUID(),
      validOptions(),
      cancelNow + 2_000,
    );

    expect(result).toMatchObject({
      estado: "Cerrado",
      version: 2,
      comparacion: { estado: "SinCambios" },
    });
    expect(result.cancelacion.versionOrigen).toBe(2);
    expect(v1Snapshot(db)).toEqual(v1);
    expect(
      db.query(
        "SELECT COUNT(*) n FROM cierres WHERE ciclo='1' AND version=2",
      ).get(),
    ).toEqual({ n: 1 });
    expect(
      db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
    ).toEqual({ n: 0 });
    expect(
      db.query(
        "SELECT COUNT(*) n FROM reaperturas WHERE tipo='cancelacion' AND version_origen=2",
      ).get(),
    ).toEqual({ n: 1 });
    const blocked = problemOf(() =>
      assertDatesWritable(db, ["2026-01-15"], "registrar el Movimiento", {
        allowActiveReopenedCycle: true,
      }),
    );
    expect(blocked.code).toBe("HISTORY_LOCKED");
  } finally {
    db.close();
  }
});

test("E4.10 I5: idempotencia, replay y conflicto de payload", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    const key = "cancelacion-" + randomUUID();
    const body = {
      versionEsperada: 1,
      motivo: "Motivo de cancelación idempotente",
    };
    const first = cancel(db, body, key);
    expect(first.replayed).toBe(false);

    const replay = cancel(db, body, key);
    expect(replay.replayed).toBe(true);
    expect(replay.cancelacion.id).toBe(first.cancelacion.id);
    expect(
      db.query(
        "SELECT COUNT(*) n FROM reaperturas WHERE tipo='cancelacion'",
      ).get(),
    ).toEqual({ n: 1 });
    expect(
      db.query(
        "SELECT COUNT(*) n FROM reapertura_attempts WHERE operacion='cancelacion'",
      ).get(),
    ).toEqual({ n: 1 });

    const conflict = problemOf(() =>
      cancel(
        db,
        { versionEsperada: 1, motivo: "Otro motivo distinto" },
        key,
      ),
    );
    expect(conflict.status).toBe(409);
    expect(conflict.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(
      db.query(
        "SELECT COUNT(*) n FROM reaperturas WHERE tipo='cancelacion'",
      ).get(),
    ).toEqual({ n: 1 });
  } finally {
    db.close();
  }
});

test("E4.10 I5: versión obsoleta y payload inválido no escriben", () => {
  const db = fixture();
  try {
    closeV1(db);
    reopen(db);
    const before = counts(db);

    const stale = problemOf(() =>
      cancel(db, { versionEsperada: 2, motivo: "Versión equivocada" }),
    );
    expect(stale.status).toBe(409);
    expect(stale.code).toBe("VERSION_CONFLICTO");
    expect(stale.details).toMatchObject({ version: 1, versionEsperada: 2 });

    for (const body of [
      { versionEsperada: 0, motivo: "Motivo" },
      { versionEsperada: 1, motivo: "   " },
      { versionEsperada: 1, motivo: "Motivo", fingerprint: "a".repeat(64) },
    ]) {
      const invalid = problemOf(() => cancel(db, body));
      expect(invalid.status).toBe(422);
      expect(invalid.code).toBe("VALIDATION");
    }
    const badKey = problemOf(() =>
      cancel(db, { versionEsperada: 1, motivo: "Motivo" }, "short"),
    );
    expect(badKey.status).toBe(422);
    expect(badKey.code).toBe("IDEMPOTENCY_REQUIRED");

    expect(counts(db)).toEqual(before);
    expect(getReaperturaEstado(db, "1").estado).toBe("Reabierto");
  } finally {
    db.close();
  }
});

function concurrentFile() {
  const dir = mkdtempSync(join(tmpdir(), "e410-i5-concurrent-"));
  const path = join(dir, "concurrent.sqlite");
  const db = openDatabase(path);
  seedCycles(db);
  closeV1(db);
  reopen(db);
  db.close();
  return { dir, path };
}

function runConcurrentCancel(input: {
  path: string;
  body: Record<string, unknown>;
  key: string;
  options: CierreOptions;
}) {
  const database = resolve("apps/api/src/database.ts"),
    cancelacion = resolve("apps/api/src/e410-cancelacion.ts");
  const script = `import{openDatabase}from${JSON.stringify(database)};import{cancelarReapertura}from${JSON.stringify(cancelacion)};const db=openDatabase(process.argv[1]);try{const r=cancelarReapertura(db,'1',JSON.parse(process.argv[2]),process.argv[3],JSON.parse(process.argv[4]),Number(process.argv[5]));process.stdout.write(JSON.stringify({ok:true,id:r.cancelacion.id,replayed:r.replayed}));}catch(e){process.stdout.write(JSON.stringify({ok:false,code:e?.code??String(e)}));}finally{db.close();}`;
  return Bun.spawn(
    [
      process.execPath,
      "-e",
      script,
      input.path,
      JSON.stringify(input.body),
      input.key,
      JSON.stringify(input.options),
      String(cancelNow),
    ],
    { env: { ...process.env, NODE_ENV: "test" }, stdout: "pipe", stderr: "pipe" },
  );
}

test("E4.10 I5: dos cancelaciones concurrentes, solo una gana", async () => {
  const { dir, path } = concurrentFile();
  try {
    const body = {
      versionEsperada: 1,
      motivo: "Motivo de cancelación concurrente",
    };
    const children = ["a", "b"].map((suffix) =>
      runConcurrentCancel({
        path,
        body,
        key: `cancelacion-${suffix}-` + randomUUID(),
        options: { ...validOptions(), actor: "Alex" },
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
          replayed?: boolean;
        };
      }),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).map((r) => r.code)).toEqual([
      "NO_REABIERTO",
    ]);
    const db = openDatabase(path);
    try {
      expect(
        db
          .query("SELECT COUNT(*) n FROM reaperturas WHERE tipo='cancelacion'")
          .get(),
      ).toEqual({ n: 1 });
      expect(
        db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
      ).toEqual({ n: 0 });
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E4.10 I5: dos procesos con la misma clave hacen replay de una cancelación", async () => {
  const { dir, path } = concurrentFile();
  try {
    const body = {
      versionEsperada: 1,
      motivo: "Motivo de cancelación idempotente concurrente",
    };
    const key = "cancelacion-same-" + randomUUID();
    const children = [0, 1].map(() =>
      runConcurrentCancel({
        path,
        body,
        key,
        options: { ...validOptions(), actor: "Alex" },
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
          replayed?: boolean;
        };
      }),
    );
    expect(results.every((r) => r.ok)).toBe(true);
    expect(results.every((r) => r.id === results[0].id)).toBe(true);
    expect(results[0].id).toBeGreaterThan(0);
    expect(results.filter((r) => r.replayed)).toHaveLength(1);
    const db = openDatabase(path);
    try {
      expect(
        db
          .query("SELECT COUNT(*) n FROM reaperturas WHERE tipo='cancelacion'")
          .get(),
      ).toEqual({ n: 1 });
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

test("E4.10 I5 API: cancelar, ruta canónica, 401/403/405, idempotencia y /cerrar intacto", async () => {
  const f = await apiFixture();
  try {
    expect(
      (
        await f.request("/api/cierres/1/reapertura/cancelar", "POST", {
          versionEsperada: 1,
          motivo: "Sin sesión",
        })
      ).status,
    ).toBe(401);
    await f.enroll();
    expect((await f.close("1")).result.status).toBe(201);
    const abrir = await f.request(
      "/api/cierres/1/reabrir",
      "POST",
      { versionEsperada: 1, motivo: "Motivo de reapertura API" },
      { "idempotency-key": randomUUID() },
    );
    expect(abrir.status).toBe(201);

    const noCsrf = await f.request(
      "/api/cierres/1/reapertura/cancelar",
      "POST",
      { versionEsperada: 1, motivo: "Sin CSRF" },
      { "x-csrf-token": "" },
    );
    expect(noCsrf.status).toBe(403);
    expect(noCsrf.data.code).toBe("CSRF");

    const wrongMethod = await f.request("/api/cierres/1/reapertura/cancelar");
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get("allow")).toBe("POST");
    const aliasWrongMethod = await f.request("/api/cierres/1/cancelar");
    expect(aliasWrongMethod.status).toBe(405);
    expect(aliasWrongMethod.headers.get("allow")).toBe("POST");

    const missingKey = await f.request(
      "/api/cierres/1/reapertura/cancelar",
      "POST",
      { versionEsperada: 1, motivo: "Motivo de cancelación API" },
    );
    expect(missingKey.status).toBe(422);
    expect(missingKey.data.code).toBe("IDEMPOTENCY_REQUIRED");

    const key = "cancelacion-" + randomUUID();
    const result = await f.request(
      "/api/cierres/1/reapertura/cancelar",
      "POST",
      { versionEsperada: 1, motivo: "Motivo de cancelación API" },
      { "idempotency-key": key },
    );
    expect(result.status).toBe(200);
    expect(result.headers.get("location")).toBe(
      "/api/cierres/1/reapertura",
    );
    expect(result.data).toMatchObject({
      estado: "Cerrado",
      version: 1,
      comparacion: { estado: "SinCambios" },
    });
    expect(result.data.cancelacion.id).toBeGreaterThan(0);

    // The ratified route and the legacy alias share the same idempotency key.
    const aliasReplay = await f.request(
      "/api/cierres/1/cancelar",
      "POST",
      { versionEsperada: 1, motivo: "Motivo de cancelación API" },
      { "idempotency-key": key },
    );
    expect(aliasReplay.status).toBe(200);
    expect(aliasReplay.data.replayed).toBe(true);
    expect(aliasReplay.data.cancelacion.id).toBe(result.data.cancelacion.id);

    expect((await f.request("/api/cierres/1/reapertura")).data.estado).toBe(
      "Cerrado",
    );
    expect((await f.request("/api/cierres/1/foto?version=1")).data.foto.version).toBe(
      1,
    );
    expect(
      f.db.query("SELECT COUNT(*) n FROM fotos_cierre WHERE ciclo='1'").get(),
    ).toEqual({ n: 1 });

    // T1 is re-blocked through the real movement route, not only the guard.
    const movement = await f.request(
      "/api/movimientos",
      "POST",
      movementBody(),
      { "idempotency-key": randomUUID() },
    );
    expect(movement.status).toBe(409);
    expect(movement.data.code).toBe("HISTORY_LOCKED");

    const noWindow = await f.request(
      "/api/cierres/1/reapertura/cancelar",
      "POST",
      { versionEsperada: 1, motivo: "Sin ventana" },
      { "idempotency-key": randomUUID() },
    );
    expect(noWindow.status).toBe(409);
    expect(noWindow.data.code).toBe("NO_REABIERTO");

    const ordinary = await f.request(
      "/api/cierres/1/cerrar",
      "POST",
      { fingerprint: "a".repeat(64) },
      { "idempotency-key": randomUUID() },
    );
    expect(ordinary.status).toBe(409);
    expect(ordinary.data.code).toBe("ALREADY_CLOSED");
  } finally {
    f.db.close();
  }
});

test("E4.10 I5 API: cambio material responde 409 CAMBIOS_MATERIALES", async () => {
  const f = await apiFixture();
  try {
    await f.enroll();
    expect((await f.close("1")).result.status).toBe(201);
    expect(
      (
        await f.request(
          "/api/cierres/1/reabrir",
          "POST",
          { versionEsperada: 1, motivo: "Motivo de reapertura API" },
          { "idempotency-key": randomUUID() },
        )
      ).status,
    ).toBe(201);
    seedMovement(f.db, { id: "8440", importe: 40 });

    const rejected = await f.request(
      "/api/cierres/1/reapertura/cancelar",
      "POST",
      { versionEsperada: 1, motivo: "Intento con cambio material" },
      { "idempotency-key": randomUUID() },
    );
    expect(rejected.status).toBe(409);
    expect(rejected.data.code).toBe("CAMBIOS_MATERIALES");
    expect(rejected.data.comparacion.estado).toBe("ConCambios");
    expect(
      f.db.query("SELECT COUNT(*) n FROM reapertura_activa").get(),
    ).toEqual({ n: 1 });
    expect(
      f.db.query("SELECT COUNT(*) n FROM fotos_cierre WHERE ciclo='1'").get(),
    ).toEqual({ n: 1 });
  } finally {
    f.db.close();
  }
});

function movementBody(over: Record<string, unknown> = {}) {
  return {
    fecha: "2026-01-15",
    tipo: "Transferencia",
    importe: "5.00",
    origen: "S003",
    destino: "S001",
    subtipo: null,
    partida: null,
    referencia: null,
    concepto: "Movimiento API I5",
    nota: null,
    capital: null,
    intereses: null,
    ...over,
  };
}


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
