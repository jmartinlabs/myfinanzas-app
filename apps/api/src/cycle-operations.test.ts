import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import {
  createCycle,
  cycleContext,
  getCycle,
  previewCycleOperation,
  writeCycleOperation,
  cycleHistory,
  listCycles,
} from "./ciclos";
import { getSaldo } from "./saldos";
const add = (db: any, inicio: string, saldoInicialComida = "0") =>
  createCycle(
    db,
    { inicio, saldoInicialComida, contextRevision: cycleContext(db).revision },
    randomUUID(),
  ).ciclo;
const input = (inicio: string, saldoInicialComida = "0", revision = 1) => ({
  inicio,
  saldoInicialComida,
  motivo: "Corregir periodo ficticio",
  revision,
});
const commit = (
  db: any,
  op: "omitido" | "rectificar",
  id: string | null,
  body: any,
  key = randomUUID(),
) => {
  const p = previewCycleOperation(db, op, id, body);
  return writeCycleOperation(
    db,
    op,
    id,
    {
      ...body,
      contextRevision: p.contextRevision,
      impactRevision: p.impactRevision,
      confirmado: true,
    },
    key,
  );
};
const facts = (db: any) =>
  db.query("SELECT * FROM movimientos ORDER BY id").all();
function fixture() {
  const db = openDatabase(":memory:");
  const a = add(db, "2026-01-01", "10"),
    b = add(db, "2026-03-01", "20");
  const time = "2026-01-01T00:00:00Z";
  for (const [id, fecha, anulado] of [
    ["1", "2025-12-15", 0],
    ["2", "2026-02-15", 0],
    ["3", "2026-02-16", 1],
  ] as const)
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,nota,anulado,revision,creado,actualizado,referencia,capital,intereses) VALUES(?,?,'Ingreso',100,'S000','S001','Bonus',NULL,'Ficticio','',?,1,?,?,NULL,NULL,NULL)",
      [id, fecha, anulado, time, time],
    );
  return { db, a, b };
}
test("07 O1 AC02/05/07/09/10/11/13/14/15/16: maestro único, impacto completo e invariancia de hechos", () => {
  const { db, a, b } = fixture();
  try {
    const original = facts(db),
      bank = getSaldo(db, "S001").posicion,
      ref = cycleContext(db).referencia.fecha;
    const p = previewCycleOperation(
      db,
      "omitido",
      null,
      input("2026-02-01", "-2.50"),
    );
    expect(p.totalMovimientos).toBe(2);
    expect(p.movimientos.map((m) => m.vigencia)).toEqual([
      "Vigente",
      "Anulado",
    ]);
    expect(p.movimientos[0].antes?.id).toBe(a.id);
    expect(p.movimientos[0].despues?.id).toBe("nuevo");
    expect(p.ciclos.find((c) => c.antes?.id === a.id)?.despues.fin).toBe(
      "2026-01-31",
    );
    const mid = commit(db, "omitido", null, input("2026-02-01", "-2.50")).ciclo;
    expect(mid.saldoInicialComida).toBe("-2.50");
    expect(getCycle(db, b.id).ciclo.saldoInicialComida).toBe("20.00");
    const earlier = commit(db, "omitido", null, input("2025-12-01")).ciclo;
    expect(earlier.id).not.toBe(a.id);
    expect(
      previewCycleOperation(
        db,
        "rectificar",
        mid.id,
        input("2026-02-20", "0", 1),
      ).totalMovimientos,
    ).toBe(2);
    commit(db, "rectificar", mid.id, input("2026-02-20", "0", 1));
    expect(getCycle(db, mid.id).ciclo.revision).toBe(2);
    expect(cycleHistory(db, mid.id)).toHaveLength(2);
    expect(facts(db)).toEqual(original);
    expect(getSaldo(db, "S001").posicion).toEqual(bank);
    expect(cycleContext(db).referencia.fecha).toBe(ref);
    expect(db.query("SELECT * FROM cycle_operation_guard").all()).toEqual([]);
  } finally {
    db.close();
  }
});
test("07 O2 AC03/04/06/17/19/20/21: revisión obligatoria, contexto, idempotencia y rollback", () => {
  const { db, a } = fixture();
  try {
    for (const body of [
      { ...input("2026-01-02"), motivo: "" },
      { ...input("2026-01-02"), saldoInicialComida: "" },
      input("2026-02-30"),
    ])
      expect(() =>
        previewCycleOperation(db, "rectificar", a.id, body),
      ).toThrow();
    expect(() =>
      previewCycleOperation(db, "rectificar", a.id, input("2026-04-02")),
    ).toThrow("vecinos");
    expect(() =>
      previewCycleOperation(db, "omitido", null, input("2026-01-02")),
    ).toThrow("duplicado");
    expect(() =>
      previewCycleOperation(db, "omitido", null, input("2026-04-01")),
    ).toThrow("Nuevo ciclo");
    expect(() =>
      writeCycleOperation(
        db,
        "rectificar",
        a.id,
        input("2026-01-02"),
        randomUUID(),
      ),
    ).toThrow("impacto");
    const body = input("2026-01-03"),
      p = previewCycleOperation(db, "rectificar", a.id, body),
      request = {
        ...body,
        contextRevision: p.contextRevision,
        impactRevision: p.impactRevision,
        confirmado: true,
      };
    db.run("UPDATE movimientos SET revision=revision+1 WHERE id='1'");
    expect(() =>
      writeCycleOperation(db, "rectificar", a.id, request, randomUUID()),
    ).toThrow("impacto");
    const key = randomUUID(),
      now = Date.now(),
      plan = previewCycleOperation(db, "rectificar", a.id, body),
      accepted = {
        ...body,
        contextRevision: plan.contextRevision,
        impactRevision: plan.impactRevision,
        confirmado: true,
      };
    const result = writeCycleOperation(
      db,
      "rectificar",
      a.id,
      accepted,
      key,
      now,
    );
    expect(
      writeCycleOperation(db, "rectificar", a.id, accepted, key, now),
    ).toEqual(result);
    expect(() =>
      writeCycleOperation(
        db,
        "rectificar",
        a.id,
        { ...accepted, motivo: "Otro motivo" },
        key,
      ),
    ).toThrow("otros datos");
    const before = db.query("SELECT * FROM ciclos").all(),
      audits = db.query("SELECT * FROM cycle_audit").all();
    db.exec(
      "CREATE TRIGGER fail_cycle_audit BEFORE INSERT ON cycle_audit BEGIN SELECT RAISE(ABORT,'injected'); END",
    );
    expect(() =>
      commit(db, "rectificar", a.id, input("2026-01-04", "2", 2)),
    ).toThrow("injected");
    expect(db.query("SELECT * FROM ciclos").all()).toEqual(before);
    expect(db.query("SELECT * FROM cycle_audit").all()).toEqual(audits);
    expect(db.query("SELECT * FROM cycle_operation_guard").all()).toEqual([]);
    expect(() =>
      db.run("UPDATE ciclos SET inicio='2026-01-04' WHERE id=?", [a.id]),
    ).toThrow();
    expect(() => db.run("DELETE FROM ciclos WHERE id=?", [a.id])).toThrow();
  } finally {
    db.close();
  }
});
test("07 O3 AC08: páginas no limitan el conjunto usado para impacto y huella", () => {
  const { db, a } = fixture();
  try {
    const stamp = "2026-01-01T00:00:00Z";
    for (let i = 4; i <= 108; i++)
      db.run(
        "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,concepto,nota,anulado,revision,creado,actualizado) VALUES(?,'2026-02-15','Ingreso',100,'S000','S001','Bonus','Ficticio','',0,1,?,?)",
        [String(i), stamp, stamp],
      );
    const one = previewCycleOperation(
        db,
        "omitido",
        null,
        input("2026-02-01"),
        1,
      ),
      two = previewCycleOperation(db, "omitido", null, input("2026-02-01"), 2);
    expect(one.movimientos).toHaveLength(100);
    expect(two.movimientos).toHaveLength(7);
    expect(one.totalMovimientos).toBe(107);
    expect(one.impactRevision).toBe(two.impactRevision);
    expect(
      listCycles(db, new URLSearchParams({ q: "marzo" })).contexto.actual?.id,
    ).toBe(a.id);
  } finally {
    db.close();
  }
});
