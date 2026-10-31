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
import { getSaldo, createSaldo } from "./saldos";
import {
  createRevisionComida,
  getRevisionComida,
} from "./revision-comida";
import { revisionComidaSource } from "./revision-comida-ledger";
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
const comidaNow = Date.parse("2026-10-29T12:00:00Z");
const comida = (
  db: any,
  fecha: string,
  evidencia: string,
  now = comidaNow,
) =>
  createRevisionComida(
    db,
    {
      fecha,
      concepto: "Comida ficticia " + evidencia,
      importe: "10",
      direccion: "Salida",
      esDevolucion: false,
      clasificacion: "Comida",
      evidenciaBancaria: evidencia,
    },
    randomUUID(),
    now,
  ).operacion;
const comidaMovement = (db: any, id: string, fecha: string) =>
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,nota,anulado,revision,creado,actualizado) VALUES(?,?,'Ingreso',100,'S000','S001','Bonus',NULL,'Ficticio','',0,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
    [id, fecha],
  );
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
    // Retroactive facts and adjacent IDs above Number.MAX_SAFE_INTEGER retain exact order.
    for (const id of ["9007199254740993", "9007199254740992"])
      db.run("INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,concepto,nota,anulado,revision,creado,actualizado) VALUES(?,'2026-02-10','Ingreso',100,'S000','S001','Bonus','Ficticio','',0,1,?,?)", [id, stamp, stamp]);
    const one = previewCycleOperation(
        db,
        "omitido",
        null,
        input("2026-02-01"),
        1,
      ),
      two = previewCycleOperation(db, "omitido", null, input("2026-02-01"), 2);
    expect(one.movimientos).toHaveLength(100);
    expect(two.movimientos).toHaveLength(9);
    expect(one.totalMovimientos).toBe(109);
    expect(one.impactRevision).toBe(two.impactRevision);
    const complete = [...one.movimientos, ...two.movimientos];
    expect(complete.filter((m) => m.fecha === "2026-02-10").map((m) => m.id)).toEqual(["9007199254740992", "9007199254740993"]);
    expect(complete.map((m) => m.id)).toEqual(["9007199254740992", "9007199254740993", "2", ...Array.from({length: 105}, (_, i) => String(i + 4)), "3"]);
    expect(one.movimientos.at(-1)?.fecha).toBe("2026-02-15");
    expect(two.movimientos.at(-1)?.fecha).toBe("2026-02-16");
    expect(new Set(complete.map((m) => m.id)).size).toBe(109);
    expect(
      listCycles(db, new URLSearchParams({ q: "marzo" })).contexto.actual?.id,
    ).toBe(a.id);
  } finally {
    db.close();
  }
});

test("07 O4 C07-F1/F2: la vista previa separa Comida y la confirmación antigua se invalida", () => {
  const db = openDatabase(":memory:");
  try {
    const a = add(db, "2026-10-01"),
      b = add(db, "2026-11-01"),
      rc20 = comida(db, "2026-10-20", "max-20");
    const body = input("2026-10-05"),
      first = previewCycleOperation(db, "rectificar", a.id, body);
    expect(first.comidaImpacto.totalVigentesAfectadas).toBe(1);
    expect(first.comidaImpacto.vigentesAfectadas[0].id).toBe(rc20.id);
    const rc3 = comida(db, "2026-10-03", "afectada-03");
    const second = previewCycleOperation(db, "rectificar", a.id, body);
    expect(second.totalMovimientos).toBe(0);
    expect(second.comidaImpacto.totalVigentesAfectadas).toBe(2);
    const item = second.comidaImpacto.vigentesAfectadas.find(
      (r) => r.id === rc3.id,
    )!;
    expect(item.antes?.id).toBe(a.id);
    expect(item.despues).toBeNull();
    expect(item.efecto).toBe("temporal");
    expect(second.impactRevision).not.toBe(first.impactRevision);
    expect(() =>
      writeCycleOperation(
        db,
        "rectificar",
        a.id,
        {
          ...body,
          contextRevision: first.contextRevision,
          impactRevision: first.impactRevision,
          confirmado: true,
        },
        randomUUID(),
      ),
    ).toThrow("impacto");
    expect(getCycle(db, a.id).ciclo.inicio).toBe("2026-10-01");
    expect(db.query("SELECT COUNT(*) n FROM cycle_audit").get()).toEqual({
      n: 0,
    });
  } finally {
    db.close();
  }
});

test("07 O5 C07-F2: Comida existente se enumera y cambia de ciclo al confirmar", () => {
  const db = openDatabase(":memory:");
  try {
    const a = add(db, "2026-10-01"),
      b = add(db, "2026-11-01"),
      rc3 = comida(db, "2026-10-03", "existente-03");
    const body = input("2026-10-05"),
      p = previewCycleOperation(db, "rectificar", a.id, body);
    expect(p.totalMovimientos).toBe(0);
    expect(p.comidaImpacto.totalVigentesAfectadas).toBe(1);
    expect(p.comidaImpacto.historicasMostradas).toEqual([]);
    const item = p.comidaImpacto.vigentesAfectadas[0];
    expect(item.id).toBe(rc3.id);
    expect(item.antes?.id).toBe(a.id);
    expect(item.despues).toBeNull();
    commit(db, "rectificar", a.id, body);
    expect(getCycle(db, a.id).ciclo.inicio).toBe("2026-10-05");
    expect(getRevisionComida(db, rc3.id).operacion.ciclo).toBeNull();
  } finally {
    db.close();
  }
});

test("07 O6 R1a/R1b: referencia agregada material sin máximo crudo superfluo", () => {
  const clock = Date.parse("2026-12-20T12:00:00Z");
  const withMovement = openDatabase(":memory:");
  try {
    const a = add(withMovement, "2026-10-01"),
      b = add(withMovement, "2026-11-01");
    comidaMovement(withMovement, "10", "2026-11-24");
    comida(withMovement, "2026-11-20", "max-20", clock);
    const body = input("2026-10-05"),
      first = previewCycleOperation(withMovement, "rectificar", a.id, body);
    comida(withMovement, "2026-11-21", "max-21-sin-efecto", clock);
    const second = previewCycleOperation(withMovement, "rectificar", a.id, body);
    expect(second.comidaImpacto.totalOperacionesComida).toBe(0);
    expect(second.impactRevision).toBe(first.impactRevision);
    expect(() =>
      writeCycleOperation(
        withMovement,
        "rectificar",
        a.id,
        {
          ...body,
          contextRevision: first.contextRevision,
          impactRevision: first.impactRevision,
          confirmado: true,
        },
        randomUUID(),
      ),
    ).not.toThrow();
  } finally {
    withMovement.close();
  }
  const withoutMovement = openDatabase(":memory:");
  try {
    const a = add(withoutMovement, "2026-10-01"),
      b = add(withoutMovement, "2026-11-01");
    comida(withoutMovement, "2026-11-20", "max-20", clock);
    const body = input("2026-10-05"),
      first = previewCycleOperation(withoutMovement, "rectificar", a.id, body);
    comida(withoutMovement, "2026-11-21", "max-21-con-efecto", clock);
    const second = previewCycleOperation(withoutMovement, "rectificar", a.id, body);
    expect(second.comidaImpacto.totalOperacionesComida).toBe(0);
    expect(second.impactRevision).not.toBe(first.impactRevision);
    expect(() =>
      writeCycleOperation(
        withoutMovement,
        "rectificar",
        a.id,
        {
          ...body,
          contextRevision: first.contextRevision,
          impactRevision: first.impactRevision,
          confirmado: true,
        },
        randomUUID(),
      ),
    ).toThrow("impacto");
  } finally {
    withoutMovement.close();
  }
});

test("07 O7 R2: históricas anuladas mostradas y materialidad de presentación", () => {
  const db = openDatabase(":memory:");
  try {
    const a = add(db, "2026-10-01"),
      b = add(db, "2026-11-01"),
      rc3 = comida(db, "2026-10-03", "historica-03");
    const body = input("2026-10-05"),
      first = previewCycleOperation(db, "rectificar", a.id, body);
    db.run(
      "UPDATE revision_comida SET concepto='Otro concepto',revision=revision+1 WHERE id=?",
      [rc3.id],
    );
    const conceptOnly = previewCycleOperation(db, "rectificar", a.id, body);
    expect(conceptOnly.impactRevision).toBe(first.impactRevision);
    db.run(
      "UPDATE revision_comida SET estado_registro='Anulado',revision=revision+1 WHERE id=?",
      [rc3.id],
    );
    const historical = previewCycleOperation(db, "rectificar", a.id, body);
    expect(historical.impactRevision).not.toBe(first.impactRevision);
    expect(historical.comidaImpacto.totalVigentesAfectadas).toBe(0);
    expect(historical.comidaImpacto.totalHistoricasMostradas).toBe(1);
    expect(historical.comidaImpacto.historicasMostradas[0].id).toBe(rc3.id);
    expect(() =>
      writeCycleOperation(
        db,
        "rectificar",
        a.id,
        {
          ...body,
          contextRevision: first.contextRevision,
          impactRevision: first.impactRevision,
          confirmado: true,
        },
        randomUUID(),
      ),
    ).toThrow("impacto");
  } finally {
    db.close();
  }
});

test("07 O8 cobertura de fuente y error de filas de Comida", () => {
  const coverage = openDatabase(":memory:");
  try {
    const a = add(coverage, "2026-10-01"),
      b = add(coverage, "2026-11-01");
    const body = input("2026-10-05"),
      first = previewCycleOperation(coverage, "rectificar", a.id, body);
    coverage.exec("ALTER TABLE revision_comida RENAME TO revision_comida_off");
    const absent = previewCycleOperation(coverage, "rectificar", a.id, body);
    expect(absent.impactRevision).not.toBe(first.impactRevision);
    expect(absent.comidaImpacto.totalOperacionesComida).toBe(0);
    expect(() =>
      writeCycleOperation(
        coverage,
        "rectificar",
        a.id,
        {
          ...body,
          contextRevision: first.contextRevision,
          impactRevision: first.impactRevision,
          confirmado: true,
        },
        randomUUID(),
      ),
    ).toThrow("impacto");
  } finally {
    coverage.close();
  }
  const broken = openDatabase(":memory:");
  try {
    const a = add(broken, "2026-10-01"),
      b = add(broken, "2026-11-01");
    comida(broken, "2026-10-20", "max-20");
    const body = input("2026-10-05"),
      first = previewCycleOperation(broken, "rectificar", a.id, body);
    broken.exec(
      "ALTER TABLE revision_comida RENAME COLUMN estado_registro TO estado_registro_broken",
    );
    expect(() =>
      previewCycleOperation(broken, "rectificar", a.id, body),
    ).toThrow("fuente instalada ha fallado");
    expect(() =>
      writeCycleOperation(
        broken,
        "rectificar",
        a.id,
        {
          ...body,
          contextRevision: first.contextRevision,
          impactRevision: first.impactRevision,
          confirmado: true,
        },
        randomUUID(),
      ),
    ).toThrow("fuente instalada ha fallado");
    expect(getCycle(broken, a.id).ciclo.inicio).toBe("2026-10-01");
  } finally {
    broken.close();
  }
});

test("07 O10 T1: fallo exclusivo del lector de filas mantiene la fuente disponible y bloquea 409", () => {
  const db = openDatabase(":memory:");
  try {
    const a = add(db, "2026-10-01"),
      b = add(db, "2026-11-01");
    comida(db, "2026-10-20", "max-20");
    const body = input("2026-10-05"),
      first = previewCycleOperation(db, "rectificar", a.id, body);
    expect(revisionComidaSource(db).state).toBe("disponible");
    db.exec(
      "ALTER TABLE revision_comida RENAME COLUMN concepto TO concepto_roto",
    );
    expect(revisionComidaSource(db).state).toBe("disponible");
    expect(() =>
      previewCycleOperation(db, "rectificar", a.id, body),
    ).toThrow("fuente instalada ha fallado");
    expect(() =>
      writeCycleOperation(
        db,
        "rectificar",
        a.id,
        {
          ...body,
          contextRevision: first.contextRevision,
          impactRevision: first.impactRevision,
          confirmado: true,
        },
        randomUUID(),
      ),
    ).toThrow("fuente instalada ha fallado");
    expect(getCycle(db, a.id).ciclo.inicio).toBe("2026-10-01");
    expect(db.query("SELECT COUNT(*) n FROM cycle_audit").get()).toEqual({
      n: 0,
    });
  } finally {
    db.close();
  }
});

test("07 O9 paginación de Comida no altera la huella completa", () => {
  const db = openDatabase(":memory:");
  try {
    const a = add(db, "2026-10-01"),
      b = add(db, "2026-11-01");
    for (let i = 0; i < 105; i++)
      comida(db, "2026-10-02", "paginada-" + String(i));
    const body = input("2026-10-05");
    const one = previewCycleOperation(db, "rectificar", a.id, body, 1, 1),
      two = previewCycleOperation(db, "rectificar", a.id, body, 1, 2);
    expect(one.comidaImpacto.totalOperacionesComida).toBe(105);
    expect(one.comidaImpacto.vigentesAfectadas).toHaveLength(100);
    expect(two.comidaImpacto.vigentesAfectadas).toHaveLength(5);
    expect(one.impactRevision).toBe(two.impactRevision);
  } finally {
    db.close();
  }
});

import { Database } from "bun:sqlite";
import { openDatabaseV8 } from "../test-support/database-v8";
import { openDatabaseV7 } from "../test-support/database-v7";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { keyHash, inspectIdentity } from "./database-identity";
import { Auth, provision, totp } from "./auth";
import { backup, restore } from "./backup";
import { getDebt } from "./deudas";
import { createClassification } from "./clasificacion";
import { createApp } from "./app";
import { HttpApp } from "@effect/platform";
const snapshot = (db: Database) =>
  (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
  ).map(
    ({ name }) =>
      [name, db.query(`SELECT * FROM "${name}" ORDER BY rowid`).all()] as const,
  );
test("07 O4 AC23/24: continuidad v7/v8 genuina demo/production, presupuestos/deuda/hechos/MFA, age9 y restore", async () => {
  const saved = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_PATH: process.env.DATABASE_PATH,
      AUTH_KEY_PATH: process.env.AUTH_KEY_PATH,
      APP_ORIGIN: process.env.APP_ORIGIN,
    },
    dir = mkdtempSync(join(tmpdir(), "mf-cycle-v7-"));
  try {
    for (const previousVersion of [7, 8] as const)
    for (const origin of ["demo", "production"] as const) {
      const fixtureName = `${origin}-v${previousVersion}`;
      const root = join(dir, fixtureName);
      mkdirSync(root, { mode: 0o700 });
      const path = join(root, "database.sqlite"),
        keyPath = join(root, "auth.key"),
        key = randomBytes(32);
      let db = (previousVersion === 7 ? openDatabaseV7 : openDatabaseV8)(path, {
        origin,
        key_hash: origin === "production" ? keyHash(key) : null,
      });
      writeFileSync(keyPath, key, { mode: 0o600 });
      for (const file of [path, path + "-wal", path + "-shm"])
        expect(statSync(file).mode & 0o777).toBe(0o600);
      Object.assign(process.env, {
        NODE_ENV: origin === "production" ? "production" : "test",
        DATABASE_PATH: path,
        AUTH_KEY_PATH: keyPath,
        APP_ORIGIN: "https://myfinanzas.pp.ua",
      });
      const auth = new Auth(db, key),
        password = "Contraseña ficticia " + randomUUID(),
        enrolled = await auth.enroll(provision(db), password);
      const access = auth.verify(
        new Request("http://127.0.0.1:5173", {
          headers: { cookie: auth.challengeName + "=" + enrolled.challenge },
        }),
        totp(enrolled.secret!).generate(),
      );
      const stamp = "2026-01-01T00:00:00.000Z";
      db.run(
        "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2026-01-01',1000,?)",
        [stamp],
      );
      db.run("UPDATE counters SET next=2 WHERE name='ciclos'");
      db.run(
        "INSERT INTO deudas VALUES('D001','Deuda histórica ficticia','2026-01-01',100000,'Activa',1,?,?)",
        [stamp, stamp],
      );
      const category = createClassification(
          db,
          "categorias",
          {
            nombre: "Ficticia",
            anual: "Gasto",
            mensual: "Gasto",
            referencia: false,
          },
          randomUUID(),
        ),
        sub = createClassification(
          db,
          "subcategorias",
          { nombre: "Ficticia", padre: category.id },
          randomUUID(),
        ),
        partida = createClassification(
          db,
          "partidas",
          { nombre: "Ficticia", padre: sub.id, deuda: "D001" },
          randomUUID(),
        );
      const bank = createSaldo(
        db,
        {
          nombre: "Banco v7 ficticio",
          tipo: "Efectivo",
          control: "Movimientos",
          saldoApertura: "500",
          permiteSalidaExterior: true,
        },
        randomUUID(),
      );
      // Fixture uses the real v7 schema with a debt-linked quota and preserved original audit.
      db.run(
        "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,concepto,nota,anulado,revision,creado,actualizado,capital,intereses) VALUES('1','2026-02-15','Gasto',10000,?,'S000',?,'Cuota histórica ficticia','',0,1,?,?,8000,2000)",
        [bank.id, partida.id, stamp, stamp],
      );
      db.run(
        "INSERT INTO movement_audit VALUES('1',1,'alta',NULL,?,'usuario-unico',NULL,?)",
        [
          stamp,
          JSON.stringify({ id: "1", capital: "80.00", intereses: "20.00" }),
        ],
      );
      db.run("UPDATE counters SET next=2 WHERE name='movimientos'");
      if (previousVersion === 8) {
        db.run("INSERT INTO presupuestos VALUES('PRE001','Presupuesto histórico ficticio','No aplica',NULL,'Activo',1,?,?)", [stamp, stamp]);
        db.run("UPDATE counters SET next=2 WHERE name='presupuestos'");
        // Link an unused historical partida; preserves both debt and budget relations.
        db.run("INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda,presupuesto) VALUES('PAR998','Histórica presupuesto',?,'Activa',1,?,?,'D001','PRE001')", [sub.id, stamp, stamp]);
        db.run("INSERT INTO budget_attempts VALUES('historical-budget','hash','{}',9999999999999)");
      }
      const before = snapshot(db),
        identity = inspectIdentity(db);
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      db.close();
      db = openDatabase(path);
      try {
        for (const [table, values] of before) {
          if (table === "schema_version") continue;
          if (table === "counters") {
            const expected = [
              ...values,
              ...(previousVersion === 7 ? [{ name: "presupuestos", next: 1 }] : []),
              { name: "participantes_compartido", next: 1 },
              { name: "instrumento", next: 1001 },
              { name: "operaciones_inversion", next: 1 },
              { name: "revision_comida", next: 1 },
            ].sort((a: any, b: any) => a.name.localeCompare(b.name));
            expect(db.query("SELECT * FROM counters ORDER BY name").all()).toEqual(expected);
            continue;
          }
          expect(
            db.query(`SELECT * FROM "${table}" ORDER BY rowid`).all(),
          ).toEqual(
            table === "ciclos"
              ? values.map((r: any) => ({
                  ...r,
                  revision: 1,
                  actualizado: null,
                }))
              : table === "partidas" && previousVersion === 7
                ? values.map((r: any) => ({...r, presupuesto: null}))
                : values,
          );
        }
        expect(inspectIdentity(db)).toEqual(identity);
        expect(readFileSync(keyPath)).toEqual(key);
        expect(
          new Auth(db, key).session(
            new Request("http://127.0.0.1:5173", {
              headers: { cookie: auth.cookieName + "=" + access.session },
            }),
          ).csrf,
        ).toBe(access.csrf);
        expect(getDebt(db, "D001").capitalPendiente).toBe("920.00");
        commit(db, "rectificar", "1", input("2026-01-02", "-2"));
        expect(cycleHistory(db, "1")).toHaveLength(1);
        const identityFile = join(dir, fixtureName + ".agekey");
        expect(
          Bun.spawnSync(["age-keygen", "-o", identityFile], {
            stdout: "pipe",
            stderr: "pipe",
          }).exitCode,
        ).toBe(0);
        const pub = Bun.spawnSync(["age-keygen", "-y", identityFile], {
            stdout: "pipe",
            stderr: "pipe",
          })
            .stdout.toString()
            .trim(),
          dest = join(dir, fixtureName + "-backup");
        backup(db, key, dest, pub);
        const bundle = JSON.parse(
          Bun.spawnSync(
            ["age", "-d", "-i", identityFile, join(dest, "database.age")],
            { stdout: "pipe", stderr: "pipe" },
          ).stdout.toString(),
        );
        expect(bundle.manifest.schema).toBe(19);
        expect(bundle.manifest.app).toBe("e4.1-v18");
        expect(bundle.manifest.origin).toBe(origin);
        const target = join(dir, fixtureName + "-restore");
        if (origin === "production")
          Object.assign(process.env, {
            DATABASE_PATH: join(target, "database.sqlite"),
            AUTH_KEY_PATH: join(target, "auth.key"),
          });
        const restored = restore(dest, target, identityFile),
          copy = openDatabase(restored.database);
        try {
          expect(cycleHistory(copy, "1")).toEqual(cycleHistory(db, "1"));
          expect(getDebt(copy, "D001").capitalPendiente).toBe("920.00");
          expect(
            copy.query("SELECT * FROM cycle_operation_attempts").all(),
          ).toEqual([]);
          expect(copy.query("SELECT * FROM sessions").all()).toEqual([]);
          expect(copy.query("SELECT * FROM budget_attempts").all()).toEqual([]);
          expect(copy.query("SELECT * FROM presupuestos ORDER BY id").all()).toEqual(db.query("SELECT * FROM presupuestos ORDER BY id").all());
          expect(copy.query("SELECT id,deuda,presupuesto FROM partidas ORDER BY id").all()).toEqual(db.query("SELECT id,deuda,presupuesto FROM partidas ORDER BY id").all());
          const a = new Auth(copy, readFileSync(restored.key)),
            challenge = await a.login(password);
          expect(
            a.verify(
              new Request("http://127.0.0.1:5173", {
                headers: {
                  cookie: a.challengeName + "=" + challenge.challenge,
                },
              }),
              totp(enrolled.secret!).generate({
                timestamp: Date.now() + 30000,
              }),
            ).session,
          ).toBeString();
          expect(copy.query("PRAGMA foreign_key_check").all()).toEqual([]);
        } finally {
          copy.close();
        }
      } finally {
        db.close();
      }
    }
  } finally {
    for (const [k, v] of Object.entries(saved))
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    rmSync(dir, { recursive: true, force: true });
  }
});
for (const previousVersion of [7, 8] as const)
test(`07 O5 AC23: fallo DDL y versión desconocida mantienen v${previousVersion}, identidad y datos`, () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-cycle-fail-")),
    path = join(dir, "database.sqlite");
  try {
    let db = (previousVersion === 7 ? openDatabaseV7 : openDatabaseV8)(path);
    db.exec("CREATE TABLE cycle_audit(conflict TEXT) STRICT");
    const before = snapshot(db),
      schema = db.query("SELECT * FROM sqlite_master ORDER BY name").all();
    db.close();
    expect(() => openDatabase(path)).toThrow();
    db = new Database(path);
    expect(snapshot(db)).toEqual(before);
    expect(db.query("SELECT * FROM sqlite_master ORDER BY name").all()).toEqual(
      schema,
    );
    db.exec("UPDATE schema_version SET version=999");
    const unknown = snapshot(db);
    db.close();
    expect(() => openDatabase(path)).toThrow();
    db = new Database(path);
    expect(snapshot(db)).toEqual(unknown);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("07 O6 AC21/22: rutas Effect reales, MFA/Origin/CSRF y rechazo de derivados", async () => {
  const { db, a } = fixture(),
    key = randomBytes(32);
  try {
    const auth = new Auth(db, key),
      enrolled = await auth.enroll(
        provision(db),
        "Contraseña ficticia " + randomUUID(),
      ),
      session = auth.verify(
        new Request("http://127.0.0.1:5173", {
          headers: { cookie: auth.challengeName + "=" + enrolled.challenge },
        }),
        totp(enrolled.secret!).generate(),
      ),
      handler = HttpApp.toWebHandler(createApp(db, { key }));
    const req = (
      path: string,
      method = "GET",
      body?: unknown,
      headers: Record<string, string> = {},
    ) =>
      handler(
        new Request("http://127.0.0.1:3001/api" + path, {
          method,
          headers: { "content-type": "application/json", ...headers },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
      );
    const endpoint = "/ciclos/" + a.id + "/rectificar",
      cookie = auth.cookieName + "=" + session.session;
    expect(
      (await req(endpoint + "/preview", "POST", input("2026-01-02"))).status,
    ).toBe(401);
    expect(
      (
        await req(endpoint + "/preview", "POST", input("2026-01-02"), {
          cookie,
        })
      ).status,
    ).toBe(403);
    const headers = {
      cookie,
      origin: "http://127.0.0.1:5173",
      "x-csrf-token": session.csrf,
      "idempotency-key": randomUUID(),
    };
    expect(
      (
        await req(
          endpoint + "/preview",
          "POST",
          { ...input("2026-01-02"), fin: "2026-02-28" },
          headers,
        )
      ).status,
    ).toBe(422);
    const preview = await req(
      endpoint + "/preview",
      "POST",
      input("2026-01-02"),
      headers,
    );
    expect(preview.status).toBe(200);
    const p = await preview.json(),
      r = await req(
        endpoint,
        "POST",
        {
          ...input("2026-01-02"),
          contextRevision: p.contextRevision,
          impactRevision: p.impactRevision,
          confirmado: true,
        },
        headers,
      );
    expect(r.status).toBe(200);
    expect(
      (
        await req("/ciclos/" + a.id + "/historial", "GET", undefined, {
          cookie,
        })
      ).status,
    ).toBe(200);
    expect((await req("/ciclos/" + a.id, "DELETE", {}, headers)).status).toBe(
      404,
    );
  } finally {
    db.close();
  }
});

for (const previousVersion of [7, 8] as const)
test(`07 O7 AC17/18/19/23: dos procesos migran v${previousVersion} y confirman una revisión concurrente`, async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-cycle-process-")),
    path = join(dir, "database.sqlite"),
    modulePath = resolve("apps/api/src/database.ts"),
    cyclesPath = resolve("apps/api/src/ciclos.ts");
  try {
    let db = (previousVersion === 7 ? openDatabaseV7 : openDatabaseV8)(path);
    db.run(
      "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES('1','2026-01-01',1000,'2026-01-01T00:00:00.000Z')",
    );
    db.run("UPDATE counters SET next=2 WHERE name='ciclos'");
    db.close();
    const open = () =>
      Bun.spawn(
        [
          process.execPath,
          "-e",
          `import {openDatabase} from ${JSON.stringify(modulePath)};const db=openDatabase(${JSON.stringify(path)});console.log(JSON.stringify(db.query('SELECT version FROM schema_version').get()));db.close();`,
        ],
        {
          env: { ...process.env, NODE_ENV: "test" },
          stdout: "pipe",
          stderr: "pipe",
        },
      );
    const upgrades = [open(), open()];
    const upgraded = await Promise.all(
      upgrades.map(async (child) => {
        const output = await new Response(child.stdout).text();
        expect(await child.exited).toBe(0);
        return JSON.parse(output);
      }),
    );
    expect(upgraded).toEqual([{ version: 19 }, { version: 19 }]);
    const children = [1, 2].map((n) => {
      const ready = join(dir, "ready-" + n),
        body = {
          inicio: n === 1 ? "2026-01-02" : "2026-01-03",
          saldoInicialComida: String(n),
          motivo: "Proceso ficticio " + n,
          revision: 1,
        };
      const code = `import{openDatabase}from ${JSON.stringify(modulePath)};import{previewCycleOperation,writeCycleOperation}from ${JSON.stringify(cyclesPath)};import{writeFileSync}from'node:fs';const db=openDatabase(${JSON.stringify(path)}),body=${JSON.stringify(body)},p=previewCycleOperation(db,'rectificar','1',body);writeFileSync(${JSON.stringify(ready)},'ready',{mode:0o600});await new Response(Bun.stdin.stream()).text();try{const r=writeCycleOperation(db,'rectificar','1',{...body,contextRevision:p.contextRevision,impactRevision:p.impactRevision,confirmado:true},crypto.randomUUID());console.log('written')}catch(e){if(e.status===409)console.log('conflict');else throw e}finally{db.close()}`;
      return {
        ready,
        child: Bun.spawn([process.execPath, "-e", code], {
          env: { ...process.env, NODE_ENV: "test" },
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
        }),
      };
    });
    try {
      const deadline = Date.now() + 3000;
      while (
        !(
          await Promise.all(children.map((c) => Bun.file(c.ready).exists()))
        ).every(Boolean)
      ) {
        if (Date.now() > deadline) throw Error("Child readiness not reached");
        await Bun.sleep(5);
      }
      for (const { child } of children) {
        child.stdin.write("confirm");
        child.stdin.end();
      }
      const results = await Promise.all(
        children.map(async ({ child }) => {
          const output = (await new Response(child.stdout).text()).trim();
          expect(await child.exited).toBe(0);
          return output;
        }),
      );
      expect(results.sort()).toEqual(["conflict", "written"]);
    } finally {
      for (const { child } of children) {
        if (child.exitCode === null) child.kill();
      }
      await Promise.all(children.map(({ child }) => child.exited));
    }
    db = openDatabase(path);
    try {
      expect(getCycle(db, "1").ciclo.revision).toBe(2);
      expect(cycleHistory(db, "1")).toHaveLength(1);
      expect(
        db.query("SELECT COUNT(*) n FROM cycle_operation_attempts").get(),
      ).toEqual({ n: 1 });
      expect(db.query("SELECT * FROM cycle_operation_guard").all()).toEqual([]);
      expect(db.query("PRAGMA integrity_check").get()).toEqual({
        integrity_check: "ok",
      });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("07 O8 QA regresión: periodo visible del mismo ID y replay con derivados manipulados", () => {
  const db = openDatabase(":memory:");
  try {
    const c = add(db, "2026-01-01");
    const stamp = "2026-01-01T00:00:00Z";
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,concepto,nota,anulado,revision,creado,actualizado) VALUES('1','2026-02-15','Ingreso',100,'S000','S001','Bonus','Ficticio','',0,1,?,?)",
      [stamp, stamp],
    );
    const body = input("2026-02-01"),
      p = previewCycleOperation(db, "rectificar", c.id, body);
    expect(p.movimientos).toHaveLength(1);
    expect(p.movimientos[0].antes?.id).toBe(c.id);
    expect(p.movimientos[0].despues?.id).toBe(c.id);
    expect(p.movimientos[0].antes?.mesFinanciado).toBe("2026-02-01");
    expect(p.movimientos[0].despues?.mesFinanciado).toBe("2026-03-01");
    const request = {
        ...body,
        contextRevision: p.contextRevision,
        impactRevision: p.impactRevision,
        confirmado: true,
      },
      key = randomUUID(),
      result = writeCycleOperation(db, "rectificar", c.id, request, key);
    expect(writeCycleOperation(db, "rectificar", c.id, request, key)).toEqual(
      result,
    );
    for (const extra of [
      { id: "otro" },
      { mesFinanciado: "2020-01-01" },
      { creado: stamp },
    ])
      expect(() =>
        writeCycleOperation(
          db,
          "rectificar",
          c.id,
          { ...request, ...extra },
          key,
        ),
      ).toThrow("Campo no editable");
  } finally {
    db.close();
  }
});

test("07 O9 AC03/04/10/12/13/20: fuente vacía, Comida pendiente y rollback completo de alta omitida", () => {
  const db = openDatabase(":memory:");
  try {
    const first = add(db, "2026-03-01", "0");
    expect(cycleContext(db).referencia.fecha).toBeNull();
    expect(cycleContext(db).actual).toBeNull();
    const plan = previewCycleOperation(
      db,
      "omitido",
      null,
      input("2026-02-01", "-1.25"),
    );
    expect(plan.conciliacion.estado).toBe("pendiente");
    expect(plan.totalMovimientos).toBe(0);
    expect(plan.contextoDespues.referencia.fecha).toBeNull();
    for (const value of [null, undefined, "", 0, "1.001"]) {
      expect(() =>
        previewCycleOperation(db, "omitido", null, {
          ...input("2026-02-01"),
          saldoInicialComida: value,
        }),
      ).toThrow();
    }
    db.exec(
      "CREATE TRIGGER fail_cycle_attempt BEFORE INSERT ON cycle_operation_attempts BEGIN SELECT RAISE(ABORT,'injected attempt failure'); END",
    );
    const before = snapshot(db);
    expect(() => commit(db, "omitido", null, input("2026-02-01", "0"))).toThrow(
      "injected",
    );
    expect(snapshot(db)).toEqual(before);
    expect(getCycle(db, first.id).ciclo.saldoInicialComida).toBe("0.00");
    db.exec("DROP TRIGGER fail_cycle_attempt");
    const created = commit(db, "omitido", null, input("2026-02-01", "0")).ciclo;
    expect(created.id).toBe("2");
    expect(created.saldoInicialComida).toBe("0.00");
    expect(() => db.run("UPDATE cycle_audit SET motivo='alterar'")).toThrow();
    expect(() => db.run("DELETE FROM cycle_audit")).toThrow();
  } finally {
    db.close();
  }
});
