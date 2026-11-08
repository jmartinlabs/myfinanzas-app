import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { Problem } from "./problem";
import { reabrirCierre } from "./e410";
import { getFotoCiclo } from "./e411";
import {
  crearFotoPeriodo,
  getFotoPeriodo,
  getFotoPeriodoPorId,
  periodoNatural,
} from "./e411-periodo";

process.env.NODE_ENV = "test";

const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas E4.11 I3 " + randomUUID();
const fpV1 = "a".repeat(64);
const fpV2 = "b".repeat(64);
const fpFor = (version: number) => (version === 1 ? fpV1 : fpV2);

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
  noDisponible: unknown = {},
  cobertura: unknown = { estado: "Completo", totales: {} },
) {
  const creado = `2026-${String(Math.min(version, 12)).padStart(2, "0")}-01T00:00:00.000Z`;
  const fingerprint = fpFor(version);
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,
        creado_utc,motivo,fingerprint,estado)
       VALUES(?,?,?,?,10000,'usuario-unico',?,?,?,'Cerrado')`,
      [ciclo, version, inicio, fin, creado, motivo, fingerprint],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,
        fingerprint,app_version,schema_version,ventana_inicio,ventana_fin,
        saldo_inicial,estado_temporal,estado_hechos,estado_plan,hechos,plan,
        clasificacion,inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES(?,?,?,'usuario-unico',?,?,'0.0.0-fixture',27,?,?,10000,'Cerrado',
        'Con hechos','Capturado',?,?,?,?,?,?,?,?)`,
      [
        ciclo,
        version,
        creado,
        motivo,
        fingerprint,
        inicio,
        fin,
        JSON.stringify({ ciclo, version, origen: "fixture" }),
        JSON.stringify({ estado: "Capturado", ciclo, version }),
        JSON.stringify({ origen: "fixture" }),
        JSON.stringify({ origen: "fixture" }),
        JSON.stringify({ origen: "fixture" }),
        JSON.stringify(cobertura),
        JSON.stringify({ verificado: false, motivo: "fixture" }),
        JSON.stringify(noDisponible),
      ],
    );
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES(?,?,'cierre',NULL,'{}',?,?,'usuario-unico')`,
      [ciclo, version, motivo, creado],
    );
  })();
}

/**
 * Deliberate corruption fixture: a closure version with no `fotos_cierre`.
 * The v25 deferred FK would reject it, so it is inserted with foreign keys
 * disabled; the connection re-enables them afterwards. This models the state
 * R4 must fail closed on, not a supported write path.
 */
function seedCierreSinFoto(
  db: Database,
  ciclo: string,
  version: number,
  inicio: string,
  fin: string,
  motivo: string,
) {
  const creado = `2026-${String(Math.min(version, 12)).padStart(2, "0")}-01T00:00:00.000Z`;
  db.run("PRAGMA foreign_keys=OFF");
  try {
    db.transaction(() => {
      db.run(
        `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,
          creado_utc,motivo,fingerprint,estado)
         VALUES(?,?,?,?,10000,'usuario-unico',?,?,?,'Cerrado')`,
        [ciclo, version, inicio, fin, creado, motivo, fpFor(version)],
      );
      db.run(
        `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
          instante,actor) VALUES(?,?,'cierre',NULL,'{}',?,?,'usuario-unico')`,
        [ciclo, version, motivo, creado],
      );
    })();
  } finally {
    db.run("PRAGMA foreign_keys=ON");
  }
}

function snapshotE49(db: Database) {
  return {
    ciclos: db.query("SELECT * FROM ciclos ORDER BY id").all(),
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

const key = (suffix: string) => `periodo-intento-${suffix}`.padEnd(24, "0");

function fourClosedCycles(db: Database) {
  seedCycle(db, "1", "2026-09-01");
  seedCycle(db, "2", "2026-10-01");
  seedCycle(db, "3", "2026-11-01");
  seedCycle(db, "4", "2026-12-01");
  seedClosure(db, "1", 1, "2026-09-01", "2026-09-30");
  seedClosure(db, "2", 1, "2026-10-01", "2026-10-31");
  seedClosure(db, "3", 1, "2026-11-01", "2026-11-30");
  seedClosure(db, "4", 1, "2026-12-01", "2026-12-31");
}

const anomalyNow = Date.parse("2026-04-01T12:00:00Z");

/**
 * R5 fixture: leaves `reapertura_activa` pointing at a cancellation event.
 * `readActiveWindow` sees a valid projection/event pair but rejects it as
 * `Inconsistente` because it is not an `Abierta` reopening event.
 */
function makeActiveWindowInconsistent(db: Database, ciclo: string) {
  const reopen = db
    .query(
      `SELECT id FROM reaperturas
       WHERE ciclo=? AND tipo='reapertura' ORDER BY id DESC LIMIT 1`,
    )
    .get(ciclo) as { id: number };
  const creado = new Date(anomalyNow).toISOString();
  db.run(
    `INSERT INTO reaperturas(ciclo,version_origen,tipo,actor,creado_utc,motivo,
      fingerprint_peticion,version_esperada,clave_intento,correlacion,
      reapertura_origen,resultado)
     VALUES(?,1,'cancelacion','usuario-unico',?,'Cancelación ficticia R5',
      ?,1,'cancelacion-e411-r5-0001',NULL,?,'Cancelada')`,
    [ciclo, creado, "c".repeat(64), reopen.id],
  );
  const cancel = (
    db.query("SELECT last_insert_rowid() AS id").get() as { id: number }
  ).id;
  db.run("UPDATE reapertura_activa SET reapertura_id=? WHERE id=1", [cancel]);
}

/**
 * R5 fixtures. `CierrePosterior` appears when a later closure is inserted
 * after reopening cycle A; `Inconsistente` is forced by projecting a
 * cancellation event in `reapertura_activa` (a derived table). Cycle B is
 * inside the tested quarter only when `includeOther` is true; otherwise it
 * lives in Q2 and only its later closure drives the anomaly.
 */
function anomalyFixture(
  mode: "CierrePosterior" | "Inconsistente",
  includeOther: boolean,
) {
  const db = openDatabase(":memory:");
  seedCycle(db, "A", "2025-12-01");
  seedCycle(db, "B", includeOther ? "2026-01-01" : "2026-04-01");
  seedClosure(db, "A", 1, "2025-12-01", "2025-12-31");
  reabrirCierre(
    db,
    "A",
    { versionEsperada: 1, motivo: "Reapertura ficticia R5" },
    "reapertura-e411-r5-0001",
    { actor: "usuario-unico" },
    anomalyNow,
  );
  if (includeOther) seedClosure(db, "B", 1, "2026-01-01", "2026-01-31");
  else seedClosure(db, "B", 1, "2026-04-01", "2026-04-30");
  if (mode === "Inconsistente") makeActiveWindowInconsistent(db, "A");
  return db;
}


test("E4.11 I3: trimestre y año componen varios ciclos sin escribir E4.9", () => {
  const db = openDatabase(":memory:");
  fourClosedCycles(db);
  const beforeE49 = snapshotE49(db);
  const now = Date.parse("2027-02-01T12:00:00Z");

  const trimestre = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 4 },
    key("trimestre"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );

  expect(trimestre).toMatchObject({
    origen: "Foto",
    tipo: "Trimestre",
    periodo: {
      ejercicio: 2026,
      trimestre: 4,
      inicio: "2026-10-01",
      fin: "2026-12-31",
    },
    seleccionVersion: { version: "A1", porDefecto: true, regla: "P7-D" },
    identidad: {
      versionAgregado: "A1",
      versionApp: "0.0.0-fixture",
      versionEsquema: 27,
      actor: "usuario-unico",
      motivo: null,
    },
    seleccionAplicada: {
      regla: "P1-C/P4-A/P5-B",
      reglaPeriodo: "P3-B",
      porDefecto: true,
      solicitada: {},
      seleccion: { "1": 1, "2": 1, "3": 1 },
    },
    cobertura: {
      estado: "Parcial",
      motivos: ["SIN_REGLA_ADITIVA"],
      totalPeriodo: null,
    },
    valores: {
      totalPeriodo: null,
      motivoTotal: "SIN_REGLA_ADITIVA",
    },
    noDisponible: [],
    replayed: false,
  });
  expect(trimestre.identidad.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(trimestre.composicion).toEqual([
    expect.objectContaining({
      ciclo: "1",
      versionFoto: 1,
      fingerprint: fpV1,
      estado: "Incluido",
      motivo: null,
      mesFinanciado: "2026-10-01",
      ventana: { inicio: "2026-09-01", fin: "2026-09-30" },
    }),
    expect.objectContaining({
      ciclo: "2",
      versionFoto: 1,
      fingerprint: fpV1,
      estado: "Incluido",
      mesFinanciado: "2026-11-01",
    }),
    expect.objectContaining({
      ciclo: "3",
      versionFoto: 1,
      fingerprint: fpV1,
      estado: "Incluido",
      mesFinanciado: "2026-12-01",
    }),
  ]);
  expect(trimestre.valores.porCiclo).toHaveLength(3);
  expect(trimestre.valores.porCiclo[0]).toMatchObject({
    ciclo: "1",
    versionFoto: 1,
    fingerprint: fpV1,
    hechos: { ciclo: "1", version: 1, origen: "fixture" },
  });
  expect(JSON.stringify(trimestre.valores)).not.toContain('"totalPeriodo":0');

  // No collateral write in E4.9/E4.10 evidence.
  expect(snapshotE49(db)).toEqual(beforeE49);

  const anio2026 = crearFotoPeriodo(
    db,
    { tipo: "Anio", ejercicio: 2026 },
    key("anio2026"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );
  expect(anio2026.composicion.map((item) => item.ciclo)).toEqual([
    "1",
    "2",
    "3",
  ]);
  const congelado2026 = getFotoPeriodoPorId(db, anio2026.id);

  // P3-B: a cycle starting 2026-12-01 is financed in 2027-01 and belongs to 2027.
  const anio2027 = crearFotoPeriodo(
    db,
    { tipo: "Anio", ejercicio: 2027 },
    key("anio2027"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );
  expect(anio2027.composicion.map((item) => item.ciclo)).toEqual(["4"]);
  expect(anio2027.composicion[0]).toMatchObject({
    ciclo: "4",
    estado: "Incluido",
    mesFinanciado: "2027-01-01",
    ventana: { inicio: "2026-12-01", fin: "2026-12-31" },
  });
  const congelado2027 = getFotoPeriodoPorId(db, anio2027.id);

  // AC11: creating the next exercise does not relabel or recalculate 2026 (or
  // the already persisted 2027 aggregate).
  seedCycle(db, "5", "2027-01-01");
  seedClosure(db, "5", 1, "2027-01-01", "2027-01-31");
  expect(getFotoPeriodoPorId(db, anio2026.id)).toEqual(congelado2026);
  expect(getFotoPeriodoPorId(db, anio2027.id)).toEqual(congelado2027);

  expect(periodoNatural("Trimestre", 2026, 1)).toEqual({
    inicio: "2026-01-01",
    fin: "2026-03-31",
  });
  expect(periodoNatural("Anio", 2026, null)).toEqual({
    inicio: "2026-01-01",
    fin: "2026-12-31",
  });
});

test("E4.11 I3: sin cierre y reabierto sin v2 se excluyen y declaran", () => {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2025-12-01");
  seedCycle(db, "2", "2026-01-01");
  seedCycle(db, "3", "2026-02-01");
  seedClosure(db, "1", 1, "2025-12-01", "2025-12-31");
  seedClosure(db, "3", 1, "2026-02-01", "2026-02-28");
  const now = Date.parse("2026-04-01T12:00:00Z");
  reabrirCierre(
    db,
    "3",
    { versionEsperada: 1, motivo: "Reapertura ficticia E4.11 I3" },
    "reapertura-e411-i3-0001",
    { actor: "usuario-unico" },
    now,
  );
  const before = snapshotE49(db);

  const periodo = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("exclusiones"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );

  expect(periodo.composicion).toEqual([
    expect.objectContaining({
      ciclo: "1",
      versionFoto: 1,
      fingerprint: fpV1,
      estado: "Incluido",
      motivo: null,
    }),
    expect.objectContaining({
      ciclo: "2",
      versionFoto: null,
      fingerprint: null,
      estado: "ExcluidoSinCierre",
      motivo: "SIN_CIERRE",
    }),
    expect.objectContaining({
      ciclo: "3",
      versionFoto: null,
      fingerprint: null,
      estado: "PendienteReCierre",
      estadoReapertura: "Abierta",
      motivo: "PENDIENTE_RE_CIERRE",
    }),
  ]);
  expect(periodo.seleccionAplicada.seleccion).toEqual({
    "1": 1,
    "2": null,
    "3": null,
  });
  expect(periodo.cobertura.estado).toBe("Parcial");
  expect(periodo.cobertura.motivos).toEqual(
    expect.arrayContaining([
      "SIN_REGLA_ADITIVA",
      "CICLO_SIN_CIERRE",
      "PENDIENTE_RE_CIERRE",
    ]),
  );
  expect(periodo.cobertura.bloques).toEqual([
    expect.objectContaining({ ciclo: "1", versionFoto: 1, estado: "Completo" }),
    expect.objectContaining({
      ciclo: "2",
      versionFoto: null,
      estado: "ExcluidoSinCierre",
      motivos: ["SIN_CIERRE"],
    }),
    expect.objectContaining({
      ciclo: "3",
      versionFoto: null,
      estado: "PendienteReCierre",
      motivos: ["PENDIENTE_RE_CIERRE"],
    }),
  ]);
  expect(periodo.valores.porCiclo.map((item) => item.ciclo)).toEqual(["1"]);

  // P4-A: v1 stays consultable but not current, and no photo is created.
  const ciclo3 = getFotoCiclo(db, "3");
  expect(ciclo3).toMatchObject({
    estadoFoto: "Disponible",
    estado: "PendienteReCierre",
    motivo: "PENDIENTE_RE_CIERRE",
    vigente: false,
    foto: { version: 1 },
  });
  expect(snapshotE49(db)).toEqual(before);
});

test("E4.11 I3: NoDisponible por bloque se declara y no se convierte en 0", () => {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2025-12-01");
  seedClosure(db, "1", 1, "2025-12-01", "2025-12-31", "Cierre ficticio", {
    valoracion: {
      estado: "No disponible",
      motivo: "E4.3 valoración/patrimonio no implementado.",
    },
  }, {
    estado: "Parcial",
    totales: {
      hechos: { estado: "Parcial", motivo: "Fuente no acreditada." },
    },
  });
  const now = Date.parse("2026-02-15T12:00:00Z");

  const periodo = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("no-disponible"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );

  expect(periodo.cobertura.estado).toBe("Parcial");
  expect(periodo.cobertura.motivos).toEqual(
    expect.arrayContaining(["SIN_REGLA_ADITIVA"]),
  );
  expect(periodo.cobertura.bloques[0]).toMatchObject({
    ciclo: "1",
    versionFoto: 1,
    estado: "Parcial",
  });
  expect(periodo.cobertura.bloques[0].motivos).toEqual([
    "hechos: Fuente no acreditada.",
  ]);
  expect(periodo.noDisponible).toEqual([
    {
      ciclo: "1",
      versionFoto: 1,
      bloque: "valoracion",
      estado: "No disponible",
      motivo: "E4.3 valoración/patrimonio no implementado.",
    },
  ]);
  expect(periodo.valores.totalPeriodo).toBeNull();
  expect(periodo.valores.porCiclo[0].noDisponible).toEqual({
    valoracion: {
      estado: "No disponible",
      motivo: "E4.3 valoración/patrimonio no implementado.",
    },
  });
});

test("E4.11 I3 AC09: bloque null en totales conserva motivo y no sintetiza 0", () => {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2025-12-01");
  seedClosure(
    db,
    "1",
    1,
    "2025-12-01",
    "2025-12-31",
    "Cierre ficticio",
    null,
    { estado: "Parcial", totales: { hechos: null, plan: null } },
  );
  const now = Date.parse("2026-02-15T12:00:00Z");

  const periodo = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("ac09-totales-null"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );

  expect(periodo.cobertura.estado).toBe("Parcial");
  expect(periodo.cobertura.totalPeriodo).toBeNull();
  expect(periodo.cobertura.bloques).toEqual([
    expect.objectContaining({
      ciclo: "1",
      versionFoto: 1,
      estado: "Parcial",
      motivos: [
        "hechos: Bloque no disponible en la foto",
        "plan: Bloque no disponible en la foto",
      ],
    }),
  ]);
  expect(periodo.noDisponible).toEqual([]);
  expect(periodo.valores.totalPeriodo).toBeNull();
  expect(JSON.stringify(periodo)).not.toContain('"totalPeriodo":0');
});

test("E4.11 I3 AC09: cobertura y no_disponible null declaran el bloque NoDisponible con motivo", () => {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2025-12-01");
  seedClosure(
    db,
    "1",
    1,
    "2025-12-01",
    "2025-12-31",
    "Cierre ficticio",
    null,
    null,
  );
  const now = Date.parse("2026-02-15T12:00:00Z");

  const periodo = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("ac09-cobertura-null"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );

  // The cycle is included, so the aggregate keeps its current `Parcial` state;
  // the block itself is `NoDisponible` and declares the absent source.
  expect(periodo.cobertura.estado).toBe("Parcial");
  expect(periodo.cobertura.totalPeriodo).toBeNull();
  expect(periodo.cobertura.bloques).toEqual([
    expect.objectContaining({
      ciclo: "1",
      versionFoto: 1,
      estado: "NoDisponible",
      motivos: ["Cobertura no disponible en la foto"],
    }),
  ]);
  expect(periodo.noDisponible).toEqual([]);
  expect(periodo.valores.totalPeriodo).toBeNull();
  expect(JSON.stringify(periodo)).not.toContain('"totalPeriodo":0');
});

test("E4.11 I3 AC09: no_disponible con bloque null conserva el motivo del bloque", () => {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2025-12-01");
  seedClosure(
    db,
    "1",
    1,
    "2025-12-01",
    "2025-12-31",
    "Cierre ficticio",
    {
      valoracion: null,
      conciliaciones: {
        estado: "No disponible",
        motivo: "E4.4 fuera de v1.",
      },
    },
  );
  const now = Date.parse("2026-02-15T12:00:00Z");

  const periodo = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("ac09-no-disponible-null"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );

  expect(periodo.noDisponible).toEqual([
    {
      ciclo: "1",
      versionFoto: 1,
      bloque: "valoracion",
      estado: "No disponible",
      motivo: "Bloque no disponible en la foto",
    },
    {
      ciclo: "1",
      versionFoto: 1,
      bloque: "conciliaciones",
      estado: "No disponible",
      motivo: "E4.4 fuera de v1.",
    },
  ]);
  expect(periodo.cobertura.totalPeriodo).toBeNull();
  expect(periodo.valores.totalPeriodo).toBeNull();
});

test("E4.11 I3 AC09: ausencia no se sintetiza como 0 ni como total", () => {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2025-12-01");
  seedClosure(
    db,
    "1",
    1,
    "2025-12-01",
    "2025-12-31",
    "Cierre ficticio",
    { valoracion: null },
    { estado: "Parcial", totales: { hechos: null } },
  );
  const now = Date.parse("2026-02-15T12:00:00Z");

  const periodo = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("ac09-ausencia-sin-cero"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );

  expect(periodo.cobertura.totalPeriodo).toBeNull();
  expect(periodo.valores.totalPeriodo).toBeNull();
  expect(periodo.valores.motivoTotal).toBe("SIN_REGLA_ADITIVA");
  expect(JSON.stringify(periodo.cobertura)).not.toContain('"totalPeriodo":0');
  expect(JSON.stringify(periodo.valores)).not.toContain('"totalPeriodo":0');
  // The photo values are copied read-only; no block is completed or zeroed.
  expect(periodo.valores.porCiclo[0].noDisponible).toEqual({ valoracion: null });
  expect(periodo.valores.porCiclo[0].cobertura).toEqual({
    estado: "Parcial",
    totales: { hechos: null },
  });
});

test("E4.11 I3: mezcla v1/v2 y selección explícita declarada", () => {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2026-01-01");
  seedCycle(db, "2", "2026-02-01");
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
  // Re-cierre of cycle 2: v2 coexists with v1.
  seedClosure(db, "2", 2, "2026-02-01", "2026-02-28", "Re-cierre ficticio");
  const now = Date.parse("2026-04-01T12:00:00Z");

  const automatico = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("mezcla-auto"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );
  expect(automatico.composicion).toEqual([
    expect.objectContaining({ ciclo: "1", versionFoto: 1, fingerprint: fpV1 }),
    expect.objectContaining({ ciclo: "2", versionFoto: 2, fingerprint: fpV2 }),
  ]);
  expect(automatico.seleccionAplicada).toMatchObject({
    porDefecto: true,
    solicitada: {},
    seleccion: { "1": 1, "2": 2 },
  });

  const explicito = crearFotoPeriodo(
    db,
    {
      tipo: "Trimestre",
      ejercicio: 2026,
      trimestre: 1,
      seleccion: { "1": 1 },
    },
    key("mezcla-explicita"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );
  expect(explicito.identidad.versionAgregado).toBe("A2");
  expect(explicito.seleccionAplicada).toMatchObject({
    porDefecto: false,
    solicitada: { "1": 1 },
    seleccion: { "1": 1, "2": 2 },
  });
  expect(explicito.seleccionAplicada.porCiclo).toEqual([
    expect.objectContaining({ ciclo: "1", versionFoto: 1, porDefecto: false }),
    expect.objectContaining({ ciclo: "2", versionFoto: 2, porDefecto: true }),
  ]);

  // Explicit, inexistent version: 404, never a silent fallback.
  const missing = problemOf(() =>
    crearFotoPeriodo(
      db,
      {
        tipo: "Trimestre",
        ejercicio: 2026,
        trimestre: 1,
        seleccion: { "1": 9 },
      },
      key("mezcla-inexistente"),
      {},
      now,
    ),
  );
  expect(missing.status).toBe(404);
  expect(missing.code).toBe("NOT_FOUND");

  // Latest by default; an explicit version never falls back to the latest.
  const params = new URLSearchParams({
    tipo: "Trimestre",
    ejercicio: "2026",
    trimestre: "1",
  });
  const ultima = getFotoPeriodo(db, params, now);
  expect(ultima.identidad.versionAgregado).toBe("A2");
  expect(ultima.seleccionVersion).toEqual({
    version: "A2",
    porDefecto: true,
    regla: "P7-D",
  });

  const v1 = getFotoPeriodo(
    db,
    new URLSearchParams({ ...Object.fromEntries(params), version: "A1" }),
    now,
  );
  expect(v1.identidad.versionAgregado).toBe("A1");
  expect(v1.seleccionVersion).toEqual({
    version: "A1",
    porDefecto: false,
    regla: "P7-D",
  });
  expect(v1.composicion).toEqual([
    expect.objectContaining({ ciclo: "1", versionFoto: 1 }),
    expect.objectContaining({ ciclo: "2", versionFoto: 2 }),
  ]);

  expect(
    problemOf(() =>
      getFotoPeriodo(
        db,
        new URLSearchParams({
          tipo: "Trimestre",
          ejercicio: "2026",
          trimestre: "1",
          version: "A9",
        }),
        now,
      ),
    ).status,
  ).toBe(404);
});

test("E4.11 I3 R1: selección explícita de una versión anterior del ciclo", () => {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2026-01-01");
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  seedClosure(db, "1", 2, "2026-01-01", "2026-01-31", "Re-cierre ficticio");
  const now = Date.parse("2026-04-01T12:00:00Z");

  const periodo = crearFotoPeriodo(
    db,
    {
      tipo: "Trimestre",
      ejercicio: 2026,
      trimestre: 1,
      seleccion: { "1": 1 },
    },
    key("r1-version-anterior"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );

  expect(periodo.composicion).toHaveLength(1);
  expect(periodo.composicion[0]).toMatchObject({
    ciclo: "1",
    versionFoto: 1,
    fingerprint: fpV1,
    estado: "Incluido",
    estadoReapertura: null,
  });
  expect(periodo.valores.porCiclo).toEqual([
    expect.objectContaining({
      ciclo: "1",
      versionFoto: 1,
      fingerprint: fpV1,
      hechos: { ciclo: "1", version: 1, origen: "fixture" },
      plan: { estado: "Capturado", ciclo: "1", version: 1 },
    }),
  ]);
  expect(periodo.seleccionAplicada).toMatchObject({
    porDefecto: false,
    solicitada: { "1": 1 },
    seleccion: { "1": 1 },
  });
  expect(periodo.seleccionAplicada.porCiclo).toEqual([
    expect.objectContaining({
      ciclo: "1",
      versionFoto: 1,
      porDefecto: false,
      estadoReapertura: null,
    }),
  ]);
});

test("E4.11 I3 R4: último cierre sin foto falla cerrado, sin caer a v1", () => {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2026-01-01");
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  seedCierreSinFoto(db, "1", 2, "2026-01-01", "2026-01-31", "v2 sin foto");
  const now = Date.parse("2026-04-01T12:00:00Z");
  const before = snapshotE49(db);

  const automatic = problemOf(() =>
    crearFotoPeriodo(
      db,
      { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
      key("r4-auto"),
      {},
      now,
    ),
  );
  expect(automatic.status).toBe(500);
  expect(automatic.code).toBe("ESTADO_INCONSISTENTE");
  expect(automatic.details).toEqual({
    ciclo: "1",
    versionCierre: 2,
    versionFoto: 1,
  });

  // Even an explicit request for valid v1 must not hide the inconsistent last closure.
  const explicit = problemOf(() =>
    crearFotoPeriodo(
      db,
      {
        tipo: "Trimestre",
        ejercicio: 2026,
        trimestre: 1,
        seleccion: { "1": 1 },
      },
      key("r4-explicita"),
      {},
      now,
    ),
  );
  expect(explicit.status).toBe(500);
  expect(explicit.code).toBe("ESTADO_INCONSISTENTE");
  expect(db.query("SELECT COUNT(*) AS n FROM fotos_periodo").get()).toEqual({
    n: 0,
  });
  expect(
    db.query("SELECT COUNT(*) AS n FROM foto_periodo_componentes").get(),
  ).toEqual({ n: 0 });
  expect(db.query("SELECT COUNT(*) AS n FROM periodo_attempts").get()).toEqual({
    n: 0,
  });
  expect(snapshotE49(db)).toEqual(before);
});

test("E4.11 I3 R5: CierrePosterior excluye el ciclo y deja el periodo Parcial", () => {
  const db = anomalyFixture("CierrePosterior", true);
  const periodo = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("r5-cp-parcial"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    anomalyNow,
  );

  expect(periodo.composicion.find((item) => item.ciclo === "A")).toMatchObject(
    {
      estado: "PendienteReCierre",
      estadoReapertura: "CierrePosterior",
      motivo: "CIERRE_POSTERIOR",
      versionFoto: null,
      fingerprint: null,
    },
  );
  expect(periodo.composicion.find((item) => item.ciclo === "B")).toMatchObject(
    { estado: "Incluido", versionFoto: 1, fingerprint: fpV1 },
  );
  expect(periodo.cobertura.estado).toBe("Parcial");
  expect(periodo.cobertura.motivos).toEqual(
    expect.arrayContaining(["CIERRE_POSTERIOR", "SIN_REGLA_ADITIVA"]),
  );
  expect(periodo.cobertura.bloques.find((item) => item.ciclo === "A")).toEqual({
    ciclo: "A",
    versionFoto: null,
    estado: "CierrePosterior",
    motivos: ["CIERRE_POSTERIOR"],
  });
  expect(periodo.seleccionAplicada.seleccion).toEqual({ A: null, B: 1 });
  expect(periodo.valores.porCiclo.map((item) => item.ciclo)).toEqual(["B"]);
});

test("E4.11 I3 R5: CierrePosterior sin otro ciclo incluido deja NoDisponible", () => {
  const db = anomalyFixture("CierrePosterior", false);
  const periodo = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("r5-cp-nodisponible"),
    {},
    anomalyNow,
  );

  expect(periodo.composicion).toHaveLength(1);
  expect(periodo.composicion[0]).toMatchObject({
    ciclo: "A",
    estado: "PendienteReCierre",
    estadoReapertura: "CierrePosterior",
    motivo: "CIERRE_POSTERIOR",
    versionFoto: null,
  });
  expect(periodo.cobertura).toMatchObject({
    estado: "NoDisponible",
    motivos: ["CIERRE_POSTERIOR"],
    totalPeriodo: null,
  });
  expect(periodo.valores.porCiclo).toEqual([]);
});

test("E4.11 I3 R5: Inconsistente excluye el ciclo y deja el periodo Parcial", () => {
  const db = anomalyFixture("Inconsistente", true);
  const periodo = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("r5-inc-parcial"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    anomalyNow,
  );

  expect(periodo.composicion.find((item) => item.ciclo === "A")).toMatchObject(
    {
      estado: "PendienteReCierre",
      estadoReapertura: "Inconsistente",
      motivo: "ESTADO_INCONSISTENTE",
      versionFoto: null,
      fingerprint: null,
    },
  );
  expect(periodo.composicion.find((item) => item.ciclo === "B")).toMatchObject(
    { estado: "Incluido", versionFoto: 1 },
  );
  expect(periodo.cobertura.estado).toBe("Parcial");
  expect(periodo.cobertura.motivos).toEqual(
    expect.arrayContaining(["ESTADO_INCONSISTENTE", "SIN_REGLA_ADITIVA"]),
  );
  expect(periodo.cobertura.bloques.find((item) => item.ciclo === "A")).toEqual({
    ciclo: "A",
    versionFoto: null,
    estado: "Inconsistente",
    motivos: ["ESTADO_INCONSISTENTE"],
  });
  expect(periodo.valores.porCiclo.map((item) => item.ciclo)).toEqual(["B"]);
  // The inconsistent cycle still has its persisted photo, but is never included.
  expect(
    db
      .query("SELECT MAX(version) AS v FROM fotos_cierre WHERE ciclo='A'")
      .get(),
  ).toEqual({ v: 1 });
});

test("E4.11 I3 R5: Inconsistente sin otro ciclo incluido deja NoDisponible", () => {
  const db = anomalyFixture("Inconsistente", false);
  const periodo = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("r5-inc-nodisponible"),
    {},
    anomalyNow,
  );

  expect(periodo.composicion).toHaveLength(1);
  expect(periodo.composicion[0]).toMatchObject({
    ciclo: "A",
    estado: "PendienteReCierre",
    estadoReapertura: "Inconsistente",
    motivo: "ESTADO_INCONSISTENTE",
    versionFoto: null,
  });
  expect(periodo.cobertura).toMatchObject({
    estado: "NoDisponible",
    motivos: ["ESTADO_INCONSISTENTE"],
    totalPeriodo: null,
  });
  expect(periodo.valores.porCiclo).toEqual([]);
});

test("E4.11 I3: re-cierre posterior no altera el agregado anterior", () => {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2026-01-01");
  seedCycle(db, "2", "2026-02-01");
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
  const now = Date.parse("2026-04-01T12:00:00Z");

  const a1 = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("ac07-a1"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );
  const { replayed: _created, ...a1Dto } = a1;
  const dtoFrozen = getFotoPeriodoPorId(db, a1.id);

  seedClosure(db, "2", 2, "2026-02-01", "2026-02-28", "Re-cierre posterior");

  // The old aggregate keeps its values, versions and fingerprint byte-identical.
  expect(getFotoPeriodoPorId(db, a1.id)).toEqual(dtoFrozen);
  expect(getFotoPeriodoPorId(db, a1.id)).toEqual(a1Dto);
  expect(
    db
      .query("SELECT COUNT(*) AS n FROM fotos_cierre WHERE ciclo='2'")
      .get(),
  ).toEqual({ n: 2 });

  const a2 = crearFotoPeriodo(
    db,
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    key("ac07-a2"),
    { actor: "usuario-unico", appVersion: "0.0.0-fixture" },
    now,
  );
  expect(a2.identidad.versionAgregado).toBe("A2");
  expect(a2.composicion).toEqual([
    expect.objectContaining({ ciclo: "1", versionFoto: 1, fingerprint: fpV1 }),
    expect.objectContaining({ ciclo: "2", versionFoto: 2, fingerprint: fpV2 }),
  ]);
  expect(getFotoPeriodoPorId(db, a1.id)).toEqual(a1Dto);
});

test("E4.11 I3: POST idempotente, conflicto de payload y clave obligatoria", () => {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2026-01-01");
  seedCycle(db, "2", "2026-02-01");
  seedCycle(db, "3", "2026-03-01");
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
  seedClosure(db, "3", 1, "2026-03-01", "2026-03-31");
  const now = Date.parse("2026-04-01T12:00:00Z");
  const body = { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 };
  const attempt = key("idempotencia");

  const first = crearFotoPeriodo(db, body, attempt, {}, now);
  const counts = {
    periodos: db.query("SELECT COUNT(*) AS n FROM fotos_periodo").get(),
    componentes: db
      .query("SELECT COUNT(*) AS n FROM foto_periodo_componentes")
      .get(),
    intentos: db.query("SELECT COUNT(*) AS n FROM periodo_attempts").get(),
  };

  const replay = crearFotoPeriodo(db, body, attempt, {}, now + 1000);
  expect(replay).toEqual({ ...first, replayed: true });
  expect(db.query("SELECT COUNT(*) AS n FROM fotos_periodo").get()).toEqual(
    counts.periodos,
  );
  expect(
    db.query("SELECT COUNT(*) AS n FROM foto_periodo_componentes").get(),
  ).toEqual(counts.componentes);
  expect(db.query("SELECT COUNT(*) AS n FROM periodo_attempts").get()).toEqual(
    counts.intentos,
  );

  const conflict = problemOf(() =>
    crearFotoPeriodo(
      db,
      { tipo: "Trimestre", ejercicio: 2026, trimestre: 2 },
      attempt,
      {},
      now,
    ),
  );
  expect(conflict.status).toBe(409);
  expect(conflict.code).toBe("IDEMPOTENCY_CONFLICT");
  expect(db.query("SELECT COUNT(*) AS n FROM fotos_periodo").get()).toEqual(
    counts.periodos,
  );

  for (const badKey of ["", "short", "con espacios en la clave 0001"]) {
    const error = problemOf(() => crearFotoPeriodo(db, body, badKey, {}, now));
    expect(error.status).toBe(422);
    expect(error.code).toBe("IDEMPOTENCY_REQUIRED");
  }

  const outOfPeriod = problemOf(() =>
    crearFotoPeriodo(
      db,
      {
        tipo: "Trimestre",
        ejercicio: 2026,
        trimestre: 1,
        seleccion: { "3": 1 },
      },
      key("fuera-periodo"),
      {},
      now,
    ),
  );
  expect(outOfPeriod.status).toBe(422);
  expect(outOfPeriod.fields).toEqual(
    expect.objectContaining({
      "seleccion.3":
        "El ciclo no pertenece a este periodo por mes financiado.",
    }),
  );
  expect(db.query("SELECT COUNT(*) AS n FROM fotos_periodo").get()).toEqual(
    counts.periodos,
  );
});

test("E4.11 I3: futuro 422, sin evidencia NoDisponible y validaciones", () => {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2026-01-01");
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  const now = Date.parse("2026-03-10T12:00:00Z");

  for (const body of [
    { tipo: "Anio", ejercicio: 2027 },
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 2 },
  ]) {
    const error = problemOf(() =>
      crearFotoPeriodo(db, body, key("futuro-" + randomUUID()), {}, now),
    );
    expect(error.status).toBe(422);
    expect(error.fields).toHaveProperty("periodo");
  }
  expect(db.query("SELECT COUNT(*) AS n FROM fotos_periodo").get()).toEqual({
    n: 0,
  });

  const futureGet = problemOf(() =>
    getFotoPeriodo(
      db,
      new URLSearchParams({ tipo: "Anio", ejercicio: "2027" }),
      now,
    ),
  );
  expect(futureGet.status).toBe(422);

  // A period with no evidence is declared, never turned into a zero photo.
  const empty = crearFotoPeriodo(
    db,
    { tipo: "Anio", ejercicio: 2025 },
    key("sin-evidencia"),
    {},
    now,
  );
  expect(empty.composicion).toEqual([]);
  expect(empty.cobertura).toEqual({
    estado: "NoDisponible",
    motivos: ["SIN_EVIDENCIA"],
    totalPeriodo: null,
    bloques: [],
  });
  expect(empty.valores).toEqual({
    totalPeriodo: null,
    motivoTotal: "SIN_REGLA_ADITIVA",
    porCiclo: [],
  });

  // No aggregate for a period that was never persisted: 404, not 0.
  expect(
    problemOf(() =>
      getFotoPeriodo(
        db,
        new URLSearchParams({ tipo: "Anio", ejercicio: "2024" }),
        now,
      ),
    ).status,
  ).toBe(404);

  // Query validation: unknown parameter, missing trimestre, bad version.
  const invalidQueries: Record<string, string>[] = [
    { tipo: "Trimestre", ejercicio: "2026", trimestre: "1", extra: "x" },
    { tipo: "Trimestre", ejercicio: "2026" },
    { tipo: "Anio", ejercicio: "2026", trimestre: "1" },
    { tipo: "Anio", ejercicio: "26" },
    { tipo: "Anio", ejercicio: "2026", version: "B1" },
  ];
  for (const query of invalidQueries)
    expect(
      problemOf(() =>
        getFotoPeriodo(db, new URLSearchParams(query), now),
      ).status,
    ).toBe(422);
});

function fixture() {
  const db = openDatabase(":memory:");
  const keyBytes = randomBytes(32);
  const now = Date.parse("2026-04-01T12:00:00Z");
  const handler = HttpApp.toWebHandler(
    createApp(db, { key: keyBytes, now: () => now, origin }),
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

test("E4.11 I3: rutas GET/POST, 405 y snapshot sin escrituras colaterales", async () => {
  const f = fixture();
  seedCycle(f.db, "1", "2026-01-01");
  seedCycle(f.db, "2", "2026-02-01");
  seedClosure(f.db, "1", 1, "2026-01-01", "2026-01-31");
  seedClosure(f.db, "2", 1, "2026-02-01", "2026-02-28");

  expect((await f.request("/api/fotos/periodos?tipo=Anio&ejercicio=2026")).status).toBe(
    401,
  );

  await f.enroll();
  const before = snapshotE49(f.db);

  const missingKey = await f.request("/api/fotos/periodos", "POST", {
    tipo: "Trimestre",
    ejercicio: 2026,
    trimestre: 1,
  });
  expect(missingKey.status).toBe(422);
  expect(missingKey.data.code).toBe("IDEMPOTENCY_REQUIRED");

  const created = await f.request(
    "/api/fotos/periodos",
    "POST",
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    { "idempotency-key": key("api") },
  );
  expect(created.status).toBe(201);
  expect(created.headers.get("location")).toBe("/api/fotos/periodos/1");
  expect(created.headers.get("cache-control")).toBe("no-store");
  expect(created.data).toMatchObject({
    origen: "Foto",
    id: 1,
    periodo: { ejercicio: 2026, trimestre: 1 },
    identidad: { versionAgregado: "A1", versionEsquema: 27 },
    replayed: false,
  });

  const replay = await f.request(
    "/api/fotos/periodos",
    "POST",
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 1 },
    { "idempotency-key": key("api") },
  );
  expect(replay.status).toBe(201);
  expect(replay.data).toEqual({ ...created.data, replayed: true });

  const conflict = await f.request(
    "/api/fotos/periodos",
    "POST",
    { tipo: "Trimestre", ejercicio: 2026, trimestre: 2 },
    { "idempotency-key": key("api") },
  );
  expect(conflict.status).toBe(409);
  expect(conflict.data.code).toBe("IDEMPOTENCY_CONFLICT");

  const latest = await f.request(
    "/api/fotos/periodos?tipo=Trimestre&ejercicio=2026&trimestre=1",
  );
  expect(latest.status).toBe(200);
  expect(latest.data).toMatchObject({
    id: 1,
    seleccionVersion: { version: "A1", porDefecto: true },
  });

  const explicit = await f.request(
    "/api/fotos/periodos?tipo=Trimestre&ejercicio=2026&trimestre=1&version=A1",
  );
  expect(explicit.status).toBe(200);
  expect(explicit.data.seleccionVersion.porDefecto).toBe(false);

  const byId = await f.request("/api/fotos/periodos/1");
  expect(byId.status).toBe(200);
  expect(byId.data).toEqual(latest.data);

  expect(
    (await f.request("/api/fotos/periodos/999")).status,
  ).toBe(404);
  expect(
    (
      await f.request(
        "/api/fotos/periodos?tipo=Trimestre&ejercicio=2026&trimestre=1&version=A9",
      )
    ).status,
  ).toBe(404);
  expect(
    (
      await f.request(
        "/api/fotos/periodos?tipo=Trimestre&ejercicio=2026",
      )
    ).status,
  ).toBe(422);
  expect(
    (
      await f.request(
        "/api/fotos/periodos?tipo=Anio&ejercicio=2027",
      )
    ).status,
  ).toBe(422);

  for (const method of ["PATCH", "DELETE", "PUT"]) {
    const collection = await f.request(
      "/api/fotos/periodos",
      method,
      {},
    );
    expect(collection.status).toBe(405);
    expect(collection.headers.get("allow")).toBe("GET, POST");
    expect(collection.data.code).toBe("METHOD_NOT_ALLOWED");

    const item = await f.request("/api/fotos/periodos/1", method, {});
    expect(item.status).toBe(405);
    expect(item.headers.get("allow")).toBe("GET");
  }

  // AC12: the only E4.11 write is the period aggregate; E4.9 is untouched.
  expect(snapshotE49(f.db)).toEqual(before);
  expect(
    f.db.query("SELECT COUNT(*) AS n FROM fotos_periodo").get(),
  ).toEqual({ n: 1 });
  expect(
    f.db.query("SELECT COUNT(*) AS n FROM foto_periodo_componentes").get(),
  ).toEqual({ n: 2 });
});
