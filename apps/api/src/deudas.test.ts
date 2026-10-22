import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { createDebt, getDebt, updateDebt, listDebts } from "./deudas";
import { createClassification, updateClassification } from "./clasificacion";
import { createSaldo, getSaldo, updateSaldo } from "./saldos";
import {
  previewMovement,
  writeMovement,
  listMovements,
  movementOptions,
  spanishToday,
} from "./movimientos";
import { cycleContext } from "./ciclos";
const now = Date.parse("2026-10-22T12:00:00Z");
function setup(db: Database) {
  const c = createClassification(
    db,
    "categorias",
    {
      nombre: "Gasto ficticio",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub ficticia", padre: c.id },
    randomUUID(),
  );
  const d = createDebt(
    db,
    {
      nombre: "Deuda ficticia",
      inicioControl: "2026-10-01",
      capitalApertura: "1000",
    },
    randomUUID(),
  );
  const p = createClassification(
    db,
    "partidas",
    { nombre: "Cuota ficticia", padre: sub.id, deuda: d.id },
    randomUUID(),
  );
  const s = createSaldo(
    db,
    {
      nombre: "Banco ficticio",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500",
      fechaApertura: "2026-10-20",
      permiteSalidaExterior: true,
    },
    randomUUID(),
  );
  return { d, p, s, sub };
}
const quota = (s: string, p: string, extra: Record<string, unknown> = {}) => ({
  tipo: "Gasto",
  fecha: "2026-10-01",
  saldo: s,
  partida: p,
  importe: "100",
  capital: "80",
  intereses: "20",
  ...extra,
});
function save(
  db: Database,
  b: Record<string, unknown>,
  id: string | null = null,
  annul = false,
) {
  const plan = previewMovement(db, b, id, annul, now);
  return writeMovement(
    db,
    { ...b, fingerprint: plan.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    id,
    annul,
    now,
  ).movimiento;
}
test("06 D1 AC01/03/04/06/09/13/16/17/24: oráculo independiente precontrol/banco/gasto/capital y tipo único", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, p, s } = setup(db);
    expect(d.id).toBe("D001");
    expect(listDebts(db).total).toBe(1);
    save(
      db,
      quota(s.id, p.id, {
        fecha: "2026-09-30",
        importe: "70",
        capital: "50",
        intereses: "20",
      }),
    );
    save(db, quota(s.id, p.id));
    const extra = save(
      db,
      quota(s.id, p.id, {
        tipo: "Amortización deuda",
        fecha: "2026-10-02",
        importe: "200",
        capital: undefined,
        intereses: undefined,
      }),
    );
    expect(extra.capital).toBe("200.00");
    expect(extra.intereses).toBe("0.00");
    expect(getDebt(db, d.id).capitalPendiente).toBe("720.00");
    expect(getSaldo(db, s.id).posicion.importe).toBe("130.00");
    expect(
      listMovements(db, new URLSearchParams("tipo=Gasto")).movimientos.reduce(
        (n, r) => n + Number(r.importe),
        0,
      ),
    ).toBe(170);
    expect(listMovements(db, new URLSearchParams("deuda=" + d.id)).total).toBe(
      3,
    );
    expect(cycleContext(db).referencia.fecha).toBe("2026-10-02");
    expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual({
      n: 3,
    });
    expect(extra.ciclo).toBeNull();
  } finally {
    db.close();
  }
});
test("06 D2 AC05/07/08/10/12/14/19/20/22: invalidaciones, relaciones usadas, rectificación ambas Deudas y anulación", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, p, s, sub } = setup(db);
    for (const b of [
      { capital: undefined },
      { intereses: undefined },
      { capital: "0", intereses: "100" },
      { capital: "80", intereses: "19.99" },
      { capital: "80.001" },
      { intereses: "-1" },
      { importe: "0" },
      { importe: "100.001" },
    ])
      expect(() =>
        previewMovement(db, quota(s.id, p.id, b), null, false, now),
      ).toThrow();
    const ordinary = createClassification(
      db,
      "partidas",
      { nombre: "Ordinaria", padre: sub.id },
      randomUUID(),
    );
    save(
      db,
      quota(s.id, ordinary.id, { capital: undefined, intereses: undefined }),
    );
    expect(() =>
      updateClassification(db, "partidas", ordinary.id, {
        revision: ordinary.revision,
        deuda: d.id,
      }),
    ).toThrow("Partida utilizada");
    expect(() =>
      previewMovement(db, quota(s.id, ordinary.id), null, false, now),
    ).toThrow();
    expect(() =>
      previewMovement(
        db,
        quota(s.id, ordinary.id, {
          tipo: "Amortización deuda",
          capital: undefined,
          intereses: undefined,
        }),
        null,
        false,
        now,
      ),
    ).toThrow();
    const m = save(db, quota(s.id, p.id));
    expect(() =>
      updateDebt(db, d.id, { revision: 1, inicioControl: "2026-10-02" }),
    ).toThrow();
    expect(() =>
      updateClassification(db, "partidas", p.id, {
        revision: p.revision,
        deuda: null,
      }),
    ).toThrow();
    const d2 = createDebt(
      db,
      { nombre: "Otra", inicioControl: "2026-10-01", capitalApertura: "200" },
      randomUUID(),
    );
    const p2 = createClassification(
      db,
      "partidas",
      { nombre: "Otra cuota", padre: sub.id, deuda: d2.id },
      randomUUID(),
    );
    const b = quota(s.id, p2.id, {
        revision: m.revision,
        motivo: "Corregir Deuda",
      }),
      plan = previewMovement(db, b, m.id, false, now);
    expect(plan.impacto.deudas.map((d) => d.id)).toEqual([d.id, d2.id]);
    save(db, b, m.id);
    expect(getDebt(db, d.id).capitalPendiente).toBe("1000.00");
    expect(getDebt(db, d2.id).capitalPendiente).toBe("120.00");
    const changed = listMovements(db).movimientos.find((x) => x.id === m.id)!;
    save(
      db,
      { revision: changed.revision, motivo: "No era un hecho real" },
      m.id,
      true,
    );
    expect(getDebt(db, d2.id).capitalPendiente).toBe("200.00");
    const full = save(
      db,
      quota(s.id, p.id, { importe: "1000", capital: "1000", intereses: "0" }),
    );
    expect(getDebt(db, d.id).capitalPendiente).toBe("0.00");
    expect(() =>
      previewMovement(
        db,
        quota(s.id, p.id, { importe: "0.01", capital: "0.01", intereses: "0" }),
        null,
        false,
        now,
      ),
    ).toThrow("exceso");
    expect(full.capital).toBe("1000.00");
    const pending = previewMovement(db, quota(s.id, p2.id), null, false, now);
    updateDebt(db, d2.id, { revision: 1, nombre: "Renombrada" });
    expect(() =>
      writeMovement(
        db,
        { ...quota(s.id, p2.id), fingerprint: pending.fingerprint },
        randomUUID(),
        null,
        false,
        now,
      ),
    ).toThrow();
  } finally {
    db.close();
  }
});
test("06 D3 AC11/15/21/23/30: permisos, Terminal/no controlado, idempotencia, rollback completo y Madrid", () => {
  const db = openDatabase(":memory:");
  try {
    const { d, p, s } = setup(db);
    for (const control of ["Terminal", "No controlado"]) {
      const a = createSaldo(
        db,
        {
          nombre: control,
          tipo: "Efectivo",
          control,
          permiteSalidaExterior: true,
        },
        randomUUID(),
      );
      const m = save(
        db,
        quota(a.id, p.id, {
          tipo: "Amortización deuda",
          importe: "1",
          capital: undefined,
          intereses: undefined,
        }),
      );
      expect(m.tipo).toBe("Amortización deuda");
      expect(getSaldo(db, a.id).posicion.importe).toBeNull();
    }
    expect(() =>
      previewMovement(
        db,
        quota(s.id, p.id, { fecha: "2026-10-23" }),
        null,
        false,
        now,
      ),
    ).toThrow();
    expect(spanishToday(Date.parse("2026-03-28T23:30:00Z"))).toBe("2026-03-29");
    expect(spanishToday(Date.parse("2026-10-25T23:30:00Z"))).toBe("2026-10-26");
    const b = quota(s.id, p.id),
      plan = previewMovement(db, b, null, false, now),
      key = randomUUID(),
      request = { ...b, fingerprint: plan.fingerprint };
    const r = writeMovement(db, request, key, null, false, now);
    expect(writeMovement(db, request, key, null, false, now)).toEqual(r);
    const snap = () =>
      [
        "movimientos",
        "movement_audit",
        "movement_attempts",
        "counters",
        "audit",
      ].map((t) => db.query(`SELECT * FROM ${t} ORDER BY rowid`).all());
    const before = snap();
    db.exec(
      "CREATE TRIGGER fail_debt_attempt BEFORE INSERT ON movement_attempts BEGIN SELECT RAISE(ABORT,'synthetic attempt failure'); END",
    );
    expect(() =>
      save(
        db,
        quota(s.id, p.id, { importe: "2", capital: "2", intereses: "0" }),
      ),
    ).toThrow();
    expect(snap()).toEqual(before);
    db.exec("DROP TRIGGER fail_debt_attempt");
    expect(getDebt(db, d.id).capitalPendiente).toBe("918.00");
    expect(() =>
      previewMovement(
        db,
        {
          tipo: "Transferencia",
          origen: s.id,
          destino: "S000",
          importe: "1",
          fecha: "2026-10-01",
        },
        null,
        false,
        now,
      ),
    ).toThrow();
  } finally {
    db.close();
  }
});
