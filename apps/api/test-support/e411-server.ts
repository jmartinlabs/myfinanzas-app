// Test-only E4.11 API with real MFA, real read/write routes and fictitious
// fixtures. Never imported by the application and never pointed at real data.
//
// The fixtures cover the E4.11 I6 matrix:
//  - a v1 photo that stays immutable after T2/T3 (live fact + renamed partida);
//  - a cycle with v1 and v2 (previous version consultable, v2 current);
//  - a reopened cycle without v2 (v1 consultable, not current);
//  - a cycle without closure;
//  - a mixed quarter (v1 + v2 + excluded cycle);
//  - a cycle starting in December 2026 attributed to 2027 by `mes_financiado`;
//  - persisted quarter/year aggregates, including the pre-re-closure A1.
//
// `__/e411/snapshot` is a test-only evidence endpoint (counts + digests of the
// E4.9/E4.10/E4.11 tables). It is not part of `createApp` and cannot be reached
// in the application because this file is only executed by the E2E runner.
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import type { Database } from "bun:sqlite";
import { HttpApp } from "@effect/platform";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createSaldo } from "../src/saldos";
import {
  confirmCierre,
  previewCierre,
  type CierreOptions,
} from "../src/e49";
import { reabrirCierre } from "../src/e410";
import { previewRecierre, reCerrarCiclo } from "../src/e410-recierre";
import { crearFotoPeriodo } from "../src/e411-periodo";

if (process.env.NODE_ENV !== "test") throw Error("Test process only");

const scenario = process.env.E411_SCENARIO ?? "principal";
const port = Number(process.env.E411_PORT ?? 3050);
const origin = process.env.E411_ORIGIN ?? "http://127.0.0.1:5173";
// Fixed clock after every fixture and before 2028: 2027 periods are valid and
// 2028 is a declared future period. The E2E login generates TOTP for this
// timestamp (same pattern as the E4.6 valoración server).
const NOW = Date.parse("2027-06-15T12:00:00Z");
const dir = `.local/e2e-e411-${scenario}`;

function assertScenario(value: string): asserts value is
  | "principal"
  | "reabierto"
  | "recierre"
  | "sin-ciclo" {
  if (!["principal", "reabierto", "recierre", "sin-ciclo"].includes(value))
    throw Error(`Escenario E4.11 desconocido: ${value}`);
}
assertScenario(scenario);

rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
const key = loadKey(db, dir + "/auth.key");

const options: CierreOptions = {
  appVersion: "0.0.0-e2e",
  actor: "usuario-unico",
  backup: {
    verificado: true,
    restauracionProbada: true,
    referencia: "evidencia-ficticia-e411",
  },
  e35: {
    verificable: true,
    motivo: null,
    huella: "c".repeat(64),
    cobertura: "Verificada",
    datos: { fixture: "E3.5 inyectada solo en el servidor de test E4.11" },
  },
};

function saldo(body: Record<string, unknown>) {
  return createSaldo(db, body, randomUUID(), NOW);
}

// Fictitious cash and investment accounts so E4.1 cash/positions are readable
// at the frozen Fin. Amounts are demonstration data, not real balances.
saldo({
  nombre: "Cuenta efectivo ficticia E4.11",
  tipo: "Efectivo",
  control: "Inversiones",
  estado: "Activa",
  liquidez: true,
  finalidad: null,
  mostrarComoBolsa: false,
  permiteSalidaExterior: false,
  fechaApertura: "2025-12-01",
  saldoApertura: "0.00",
});
saldo({
  nombre: "Cartera ficticia E4.11",
  tipo: "Inversión",
  control: "Inversiones",
  estado: "Activa",
  liquidez: false,
  finalidad: "Inversión",
  mostrarComoBolsa: false,
  permiteSalidaExterior: false,
  fechaApertura: "2025-12-01",
  saldoApertura: "0.00",
});

// Fictitious classification. PAR411 is renamed by the E2E after the closure
// (T3) to prove the photo keeps the captured name.
db.exec(`
  INSERT INTO categorias(id,nombre,grupo,anual,mensual,referencia,estado,revision,creado,actualizado)
  VALUES('CAT411','Comida ficticia E4.11','Gasto','Gasto','Gasto',0,'Activa',1,'f','f');
  INSERT INTO subcategorias(id,nombre,padre,estado,revision,creado,actualizado)
  VALUES('SUB411','Subcategoría ficticia E4.11','CAT411','Activa',1,'f','f');
  INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda,presupuesto)
  VALUES('PAR411','Partida ficticia E4.11','SUB411','Activa',1,'f','f',NULL,NULL),
        ('PAR412','Gasto ficticio E4.11','SUB411','Activa',1,'f','f',NULL,NULL);
`);

function cycle(id: string, inicio: string) {
  db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,?,?)", [
    id,
    inicio,
    100000,
    "f",
  ]);
}

function move(input: {
  id: string;
  fecha: string;
  tipo: "Ingreso" | "Gasto";
  importe: number;
  origen: string;
  destino: string;
  subtipo: string | null;
  partida: string | null;
  concepto: string;
}) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
      partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
      capital,intereses)
     VALUES(?,?,?,?,?,?,?,?,NULL,?,'',0,1,'f','f',NULL,NULL)`,
    [
      input.id,
      input.fecha,
      input.tipo,
      input.importe,
      input.origen,
      input.destino,
      input.subtipo,
      input.partida,
      input.concepto,
    ],
  );
}

function close(ciclo: string, motivo: string) {
  const pre = previewCierre(db, ciclo, options, NOW);
  if (pre.bloqueos.length)
    throw Error(
      `fixture: no se pudo cerrar el ciclo ${ciclo}: ${pre.bloqueos
        .map((item) => item.code)
        .join(",")}`,
    );
  return confirmCierre(
    db,
    ciclo,
    { fingerprint: pre.fingerprint, motivo },
    randomUUID(),
    options,
    NOW,
  );
}

function reopen(ciclo: string, version: number, motivo: string) {
  return reabrirCierre(
    db,
    ciclo,
    { versionEsperada: version, motivo },
    randomUUID(),
    { actor: "usuario-unico" },
    NOW,
  );
}

function reclose(ciclo: string, version: number, motivo: string) {
  const pre = previewRecierre(db, ciclo, options, NOW);
  if (pre.bloqueos.length)
    throw Error(
      `fixture: no se pudo re-cerrar el ciclo ${ciclo}: ${pre.bloqueos
        .map((item) => item.code)
        .join(",")}`,
    );
  if (pre.origen.versionOrigen !== version)
    throw Error("fixture: versión de re-cierre inesperada.");
  return reCerrarCiclo(
    db,
    ciclo,
    {
      versionEsperada: version,
      motivo,
      fingerprint: pre.fingerprint,
    },
    randomUUID(),
    options,
    NOW,
  );
}

function aggregate(
  tipo: "Trimestre" | "Anio",
  ejercicio: number,
  trimestre?: number,
) {
  return crearFotoPeriodo(
    db,
    {
      tipo,
      ejercicio,
      ...(tipo === "Trimestre" ? { trimestre } : {}),
    },
    "fixture-" + randomUUID(),
    { actor: "usuario-unico", appVersion: "0.0.0-e2e" },
    NOW,
  );
}

if (scenario === "principal") {
  for (const [id, inicio] of [
    ["0", "2025-12-01"],
    ["1", "2026-01-01"],
    ["2", "2026-02-01"],
    ["3", "2026-03-01"],
    ["4", "2026-12-01"],
    ["5", "2027-02-01"],
    ["6", "2027-03-01"],
  ] as const)
    cycle(id, inicio);

  close("1", "Cierre ficticio E4.11 v1");
  close("2", "Cierre ficticio E4.11 v1");
  // Material change after v1: the only path to v2 (E4.10) and, at the same
  // time, the fact that makes the live contrast differ from the frozen photo.
  move({
    id: "202",
    fecha: "2026-02-10",
    tipo: "Gasto",
    importe: 1000,
    origen: "S001",
    destino: "S000",
    subtipo: null,
    partida: "PAR412",
    concepto: "Gasto ficticio de rectificación E4.11",
  });
  reopen("2", 1, "Reapertura ficticia E4.11 para v2");
  reclose("2", 1, "Re-cierre ficticio E4.11 v2");
  close("4", "Cierre ficticio E4.11 diciembre 2026");
  close("5", "Cierre ficticio E4.11 2027");
  // T2 synthetic: inserted after every closure and never captured by a photo.
  // The live engine sees it; the frozen C1 photo does not.
  move({
    id: "101",
    fecha: "2026-01-10",
    tipo: "Ingreso",
    importe: 123400,
    origen: "S000",
    destino: "S001",
    subtipo: "Nómina",
    partida: null,
    concepto: "Nómina ficticia posterior al cierre E4.11",
  });

  aggregate("Trimestre", 2026, 1);
  aggregate("Anio", 2026);
  aggregate("Anio", 2027);
} else if (scenario === "reabierto") {
  for (const [id, inicio] of [
    ["0", "2025-12-01"],
    ["1", "2026-01-01"],
    ["2", "2026-02-01"],
    ["3", "2026-03-01"],
  ] as const)
    cycle(id, inicio);
  close("1", "Cierre ficticio E4.11 v1");
  close("2", "Cierre ficticio E4.11 v1");
  reopen("2", 1, "Reapertura ficticia E4.11 sin v2");
  aggregate("Trimestre", 2026, 1);
} else if (scenario === "recierre") {
  for (const [id, inicio] of [
    ["0", "2025-12-01"],
    ["1", "2026-01-01"],
    ["2", "2026-02-01"],
    ["3", "2026-03-01"],
  ] as const)
    cycle(id, inicio);
  close("1", "Cierre ficticio E4.11 v1");
  close("2", "Cierre ficticio E4.11 v1");
  // The test performs the real reopen/reclose through the API so it can read
  // A1 before v2 exists and prove it is not recomputed afterwards.
  move({
    id: "202",
    fecha: "2026-02-10",
    tipo: "Gasto",
    importe: 1000,
    origen: "S001",
    destino: "S000",
    subtipo: null,
    partida: "PAR412",
    concepto: "Gasto ficticio de rectificación E4.11 (pre-re-cierre)",
  });
  aggregate("Trimestre", 2026, 1);
}

function digest(rows: unknown) {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

function table(db: Database, sql: string) {
  const rows = db.query(sql).all();
  return { count: rows.length, digest: digest(rows) };
}

/** Test-only evidence: no financial values, only table counts and digests. */
function snapshot(db: Database) {
  const periodos = (
    db.query("SELECT * FROM fotos_periodo ORDER BY id").all() as Record<
      string,
      unknown
    >[]
  ).map((row) => ({
    id: row.id as number,
    tipo: row.tipo,
    ejercicio: row.ejercicio,
    trimestre: row.trimestre,
    version: row.version,
    fingerprint: row.fingerprint,
    digest: digest(row),
  }));
  return {
    scenario,
    now: new Date(NOW).toISOString(),
    periodos,
    tables: {
      cierres: table(db, "SELECT * FROM cierres ORDER BY ciclo,version"),
      fotos_cierre: table(
        db,
        "SELECT * FROM fotos_cierre ORDER BY ciclo,version",
      ),
      cierre_audit: table(db, "SELECT * FROM cierre_audit ORDER BY id"),
      reaperturas: table(db, "SELECT * FROM reaperturas ORDER BY id"),
      reapertura_activa: table(
        db,
        "SELECT * FROM reapertura_activa ORDER BY id",
      ),
      fotos_periodo: table(db, "SELECT * FROM fotos_periodo ORDER BY id"),
      foto_periodo_componentes: table(
        db,
        "SELECT * FROM foto_periodo_componentes ORDER BY periodo_id,ciclo",
      ),
      periodo_attempts: table(
        db,
        "SELECT * FROM periodo_attempts ORDER BY key",
      ),
    },
  };
}

writeFileSync(dir + "/bootstrap.txt", provision(db, NOW), { mode: 0o600 });
writeFileSync(dir + "/fixture.json", JSON.stringify({ scenario, port, NOW }), {
  mode: 0o600,
});

const handler = HttpApp.toWebHandler(
  createApp(db, {
    key,
    origin,
    now: () => NOW,
    cierre: options,
  }),
);

Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/__e411/snapshot")
      return Response.json(snapshot(db), {
        headers: { "cache-control": "no-store" },
      });
    return handler(request);
  },
});
