import { expect, test } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import {
  getReaperturaElegibilidad,
  getReaperturaEstado,
  reabrirCierre,
} from "./e410";

process.env.NODE_ENV = "test";

const now = Date.parse("2026-03-10T12:00:00Z");
const fp = "c".repeat(64);

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
) {
  const creado = `2026-0${version}-01T00:00:00.000Z`;
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,
        creado_utc,motivo,fingerprint,estado)
       VALUES(?,?,?,?,10000,'usuario-unico',?,NULL,?,'Cerrado')`,
      [ciclo, version, inicio, fin, creado, fp],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,
        fingerprint,app_version,schema_version,ventana_inicio,ventana_fin,
        saldo_inicial,estado_temporal,estado_hechos,estado_plan,hechos,plan,
        clasificacion,inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES(?,?,?,'usuario-unico',NULL,?,'0.0.0-fixture',26,?,?,10000,
        'Cerrado','Sin hechos','SinPlan','{}','{}','{}','{}','{}','{}','{}','{}')`,
      [ciclo, version, creado, fp, inicio, fin],
    );
  })();
}

function fixture() {
  const db = openDatabase(":memory:");
  seedCycle(db, "1", "2026-01-01");
  seedCycle(db, "2", "2026-02-01");
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  return db;
}

test("E4.10 I7: el último cierre es elegible para reabrir", () => {
  const db = fixture();
  try {
    expect(getReaperturaElegibilidad(db, "1")).toEqual({
      puedeReabrir: true,
      motivo: null,
      cierrePosterior: null,
    });
  } finally {
    db.close();
  }
});

test("E4.10 I7: un cierre posterior motivado oculta la acción de reabrir", () => {
  const db = fixture();
  try {
    seedClosure(db, "2", 1, "2026-02-01", "2026-02-28");
    const eligibility = getReaperturaElegibilidad(db, "1");
    expect(eligibility.puedeReabrir).toBe(false);
    expect(eligibility.cierrePosterior).toEqual({
      ciclo: "2",
      version: 1,
      fin: "2026-02-28",
    });
    expect(eligibility.motivo).toContain("cierre posterior");
  } finally {
    db.close();
  }
});

test("E4.10 I7: una ventana activa no se ofrece como reabrible", () => {
  const db = fixture();
  try {
    reabrirCierre(
      db,
      "1",
      { versionEsperada: 1, motivo: "Rectificar el cierre" },
      "reapertura-" + randomUUID(),
      {},
      now,
    );
    expect(getReaperturaEstado(db, "1").estado).toBe("Reabierto");
    const eligibility = getReaperturaElegibilidad(db, "1");
    expect(eligibility.puedeReabrir).toBe(false);
    expect(eligibility.motivo).toContain("reapertura activa");
    expect(eligibility.cierrePosterior).toBeNull();
  } finally {
    db.close();
  }
});
