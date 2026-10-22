import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { HttpApp } from "@effect/platform";
import { openDatabase } from "./database";
import { openDatabase as openV3 } from "../test-support/database-v3";
import { getSaldo, createSaldo, updateSaldo } from "./saldos";
import {
  createClassification,
  getClassification,
  previewClassification,
  updateClassification,
  changeClassificationState,
} from "./clasificacion";
import {
  previewMovement,
  writeMovement,
  getMovement,
  listMovements,
  movementOptions,
  spanishToday,
} from "./movimientos";
import { cycleContext, createCycle } from "./ciclos";
import { Auth, provision, loadKey, totp } from "./auth";
import { createApp } from "./app";
import { backup, restore } from "./backup";
const now = Date.parse("2026-10-21T12:00:00Z");
function masters(db: Database) {
  const category = createClassification(
    db,
    "categorias",
    {
      nombre: "Categoría ficticia E1.4",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Subcategoría ficticia E1.4", padre: category.id },
    randomUUID(),
  );
  const partida = createClassification(
    db,
    "partidas",
    { nombre: "Partida ficticia E1.4", padre: sub.id },
    randomUUID(),
  );
  const saldo = createSaldo(
    db,
    {
      nombre: "Cuenta ficticia E1.4",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "100",
      fechaApertura: "2026-10-20",
      permiteSalidaExterior: true,
    },
    randomUUID(),
  );
  return { category, sub, partida, saldo };
}
const income = (saldo: string, over: Record<string, unknown> = {}) => ({
  tipo: "Ingreso",
  fecha: "2026-10-12",
  importe: "50",
  saldo,
  subtipo: "Bonus",
  concepto: "Ingreso ficticio",
  ...over,
});
const expense = (
  saldo: string,
  partida: string,
  over: Record<string, unknown> = {},
) => ({
  tipo: "Gasto",
  fecha: "2026-10-13",
  importe: "20",
  saldo,
  partida,
  concepto: "Gasto ficticio",
  ...over,
});
function save(
  db: Database,
  body: Record<string, unknown>,
  id: string | null = null,
  annul = false,
) {
  const plan = previewMovement(db, body, id, annul, now);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    id,
    annul,
    now,
  ).movimiento;
}
const snapshot = (db: Database) =>
  (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
  ).map(
    ({ name }) =>
      [name, db.query(`SELECT * FROM "${name}" ORDER BY rowid`).all()] as const,
  );

test("04 AC01–08/17/18/25: reglas financieras, No controlado, EUR positivo y Referencia no verificable", () => {
  const db = openDatabase(":memory:");
  try {
    const { category, sub, partida, saldo } = masters(db);
    for (const subtipo of ["Nómina", "Bonus", "Intereses", "Promoción"])
      expect(save(db, income(saldo.id, { subtipo })).subtipo).toBe(subtipo);
    const g = save(db, expense(saldo.id, partida.id));
    expect(g.origen.id).toBe(saldo.id);
    expect(g.destino.id).toBe("S000");
    expect(g.partida?.categoria?.id).toBe(category.id);
    const freeText = save(
      db,
      expense(saldo.id, partida.id, {
        concepto: "Transferencia, Nómina y Compra son texto libre",
        nota: "No modificar clasificación desde esta descripción",
      }),
    );
    expect(freeText.tipo).toBe("Gasto");
    expect(freeText.partida?.id).toBe(partida.id);

    for (const importe of [
      undefined,
      null,
      "",
      "0",
      "-0",
      "-1",
      "0.001",
      "1e2",
      1,
      "92233720368547758.08",
    ])
      expect(() =>
        previewMovement(db, income(saldo.id, { importe }), null, false, now),
      ).toThrow();
    expect(save(db, income(saldo.id, { importe: "0.01" })).importe).toBe(
      "0.01",
    );
    for (const changes of [
      { tipo: "Transferencia" },
      { tipo: "Amortización deuda" },
      { tipo: "Compra" },
      { subtipo: "Inventado" },
      { partida: partida.id },
      { saldo: "S000" },
      { categoria: category.id },
      { origen: saldo.id },
    ])
      expect(() =>
        previewMovement(db, income(saldo.id, changes), null, false, now),
      ).toThrow();
    for (const fields of [
      { partida: "" },
      { subtipo: "Bonus" },
      { referencia: "REF001" },
      { importe: "-20" },
    ])
      expect(() =>
        previewMovement(
          db,
          expense(saldo.id, partida.id, fields),
          null,
          false,
          now,
        ),
      ).toThrow();
    for (const [tipo, control] of [
      ["Efectivo", "Movimientos"],
      ["Efectivo", "Terminal"],
      ["Efectivo", "No controlado"],
      ["Efectivo", "Inversiones"],
      ["Inversión", "Inversiones"],
    ]) {
      const s = createSaldo(
        db,
        {
          nombre: "Par ficticio " + tipo + control,
          tipo,
          control,
          permiteSalidaExterior: true,
        },
        randomUUID(),
      );
      expect(save(db, income(s.id)).destino.id).toBe(s.id);
      expect(save(db, expense(s.id, partida.id)).origen.id).toBe(s.id);
      if (control !== "Movimientos")
        expect(getSaldo(db, s.id).posicion.importe).toBeNull();
    }
    const blocked = createSaldo(
      db,
      { nombre: "Sin permiso", tipo: "Efectivo", control: "Movimientos" },
      randomUUID(),
    );
    expect(() => save(db, expense(blocked.id, partida.id))).toThrow("Exterior");
    db.run("UPDATE saldos SET exterior=NULL WHERE id=?", [blocked.id]);
    expect(() => save(db, expense(blocked.id, partida.id))).toThrow("Exterior");
    expect(getSaldo(db, blocked.id).permiteSalidaExterior).toBeNull();
    const ref = createClassification(
      db,
      "categorias",
      {
        nombre: "Requiere Referencia",
        anual: "Gasto",
        mensual: "Gasto",
        referencia: true,
      },
      randomUUID(),
    );
    const rs = createClassification(
      db,
      "subcategorias",
      { nombre: "SUB Referencia", padre: ref.id },
      randomUUID(),
    );
    const rp = createClassification(
      db,
      "partidas",
      { nombre: "PAR Referencia", padre: rs.id },
      randomUUID(),
    );
    expect(() => save(db, expense(saldo.id, rp.id))).toThrow(
      "no es verificable",
    );
    db.run("UPDATE categorias SET referencia=NULL WHERE id=?", [ref.id]);
    expect(save(db, expense(saldo.id, rp.id)).partida?.id).toBe(rp.id);
    expect(getClassification(db, "categorias", ref.id).referencia).toBeNull();
    const rev = getSaldo(db, saldo.id).revision;
    updateSaldo(db, saldo.id, { revision: rev, estado: "Inactiva" });
    expect(() => save(db, income(saldo.id))).toThrow("Saldo");
    expect(getMovement(db, g.id).movimiento.origen.estado).toBe("Inactiva");
    expect(
      save(
        db,
        expense(saldo.id, partida.id, {
          revision: g.revision,
          motivo: "Rectificar importe histórico",
          importe: "21",
        }),
        g.id,
      ).id,
    ).toBe(g.id);
    changeClassificationState(
      db,
      "partidas",
      partida.id,
      { revision: partida.revision },
      false,
    );
    expect(() => save(db, expense(blocked.id, partida.id))).toThrow();
    expect(getMovement(db, g.id).movimiento.partida?.estado).toBe("Inactiva");
    const active = createSaldo(
      db,
      {
        nombre: "Validar clasificación inactiva",
        tipo: "Efectivo",
        control: "Movimientos",
        permiteSalidaExterior: true,
      },
      randomUUID(),
    );
    expect(() => save(db, expense(active.id, partida.id))).toThrow(
      "clasificación",
    );
  } finally {
    db.close();
  }
});

test("04 AC09–12/23: posición centralizada exacta, apertura null solo cálculo Movimientos, sin filtro Fecha apertura", () => {
  const db = openDatabase(":memory:");
  try {
    const { saldo, partida } = masters(db);
    save(db, income(saldo.id));
    save(db, expense(saldo.id, partida.id));
    expect(getSaldo(db, saldo.id).posicion.importe).toBe("130.00");
    expect(
      listMovements(db, new URLSearchParams({ q: "sin coincidencia" })).total,
    ).toBe(0);
    expect(getSaldo(db, saldo.id).posicion.importe).toBe("130.00");
    const empty = createSaldo(
      db,
      {
        nombre: "Apertura ausente",
        tipo: "Efectivo",
        control: "Movimientos",
        permiteSalidaExterior: true,
      },
      randomUUID(),
    );
    expect(getSaldo(db, empty.id).posicion.importe).toBe("0.00");
    save(db, income(empty.id));
    save(db, expense(empty.id, partida.id));
    expect(getSaldo(db, empty.id).posicion.importe).toBe("30.00");
    expect(getSaldo(db, empty.id).saldoApertura).toBeNull();
    const amount = "92233720368547758.07";
    save(db, income(empty.id, { importe: amount }));
    save(db, income(empty.id, { importe: amount }));
    expect(getSaldo(db, empty.id).posicion.importe).toBe(
      "184467440737095546.14",
    );
    const negative = createSaldo(
      db,
      {
        nombre: "Apertura negativa",
        tipo: "Efectivo",
        control: "Movimientos",
        saldoApertura: "-25",
      },
      randomUUID(),
    );
    expect(getSaldo(db, negative.id).posicion.importe).toBe("-25.00");
    for (const body of [
      { control: "Terminal" },
      { saldoApertura: "0" },
      { fechaApertura: "2026-01-01" },
      { permiteSalidaExterior: false },
    ])
      expect(() =>
        updateSaldo(db, saldo.id, {
          revision: getSaldo(db, saldo.id).revision,
          ...body,
        }),
      ).toThrow("rectificación");
    updateSaldo(db, saldo.id, {
      revision: getSaldo(db, saldo.id).revision,
      nombre: "Renombrado ficticio",
    });
    expect(getSaldo(db, saldo.id).posicion.importe).toBe("130.00");
  } finally {
    db.close();
  }
});

test("04 AC13–16: Madrid, ciclos inclusivos y máximos de hechos vigentes, sin reloj para referencia", () => {
  expect(spanishToday(Date.parse("2026-10-20T22:30:00Z"))).toBe("2026-10-21");
  expect(spanishToday(Date.parse("2026-12-20T23:30:00Z"))).toBe("2026-12-21");
  expect(spanishToday(Date.parse("2026-03-29T01:30:00Z"))).toBe("2026-03-29");
  expect(spanishToday(Date.parse("2026-10-25T01:30:00Z"))).toBe("2026-10-25");
  const db = openDatabase(":memory:");
  try {
    const { saldo } = masters(db);
    expect(cycleContext(db).referencia.coverage.map((s) => s.state)).toEqual([
      "disponible",
      "pendiente",
      "pendiente",
    ]);
    expect(
      save(db, income(saldo.id, { fecha: "2026-01-01" })).ciclo,
    ).toBeNull();
    for (const inicio of ["2026-09-25", "2026-10-25", "2027-01-01"])
      createCycle(
        db,
        {
          inicio,
          saldoInicialComida: "0",
          contextRevision: cycleContext(db).revision,
        },
        randomUUID(),
      );
    expect(
      save(db, income(saldo.id, { fecha: "2026-09-25" })).ciclo?.mesFinanciado,
    ).toBe("2026-10-01");
    const b = { ...income(saldo.id, { fecha: "2026-10-24" }) };
    const p = previewMovement(
      db,
      b,
      null,
      false,
      Date.parse("2026-10-23T22:30Z"),
    );
    const max = writeMovement(
      db,
      { ...b, fingerprint: p.fingerprint },
      randomUUID(),
      null,
      false,
      Date.parse("2026-10-23T22:30Z"),
    ).movimiento;
    expect(max.ciclo?.fin).toBe("2026-10-24");
    expect(cycleContext(db).actual?.mesFinanciado).toBe("2026-10-01");
    expect(cycleContext(db).referencia.fecha).toBe("2026-10-24");
    expect(() =>
      previewMovement(
        db,
        income(saldo.id, { fecha: "2026-10-22" }),
        null,
        false,
        now,
      ),
    ).toThrow("campos");
    expect(() =>
      previewMovement(
        db,
        income(saldo.id, { fecha: "2026-02-31" }),
        null,
        false,
        now,
      ),
    ).toThrow();
    save(
      db,
      { revision: max.revision, motivo: "No representa hecho real" },
      max.id,
      true,
    );
    expect(cycleContext(db).referencia.fecha).toBe("2026-09-25");
    const earlier = getMovement(db, "2").movimiento;
    save(
      db,
      income(saldo.id, {
        fecha: "2026-01-02",
        revision: earlier.revision,
        motivo: "Fecha equivocada",
      }),
      earlier.id,
    );
    expect(cycleContext(db).actual).toBeNull();
    expect(cycleContext(db).motivo).toBe("sin_ciclo_actual");
    for (const r of listMovements(db).movimientos)
      save(
        db,
        { revision: r.revision, motivo: "Fixture sin hecho real" },
        r.id,
        true,
      );
    expect(cycleContext(db).referencia.fecha).toBeNull();
    expect(cycleContext(db).motivo).toBe("sin_referencia");
  } finally {
    db.close();
  }
});

test("04 AC19–24: correcciones/anulaciones auditadas, duplicados revisables, reintentos y rollback", () => {
  const db = openDatabase(":memory:");
  try {
    const { saldo, partida } = masters(db),
      body = income(saldo.id);
    const a = save(db, body),
      p = previewMovement(db, body, null, false, now);
    expect(p.duplicados.map((r) => r.id)).toEqual([a.id]);
    expect(() =>
      writeMovement(
        db,
        { ...body, fingerprint: p.fingerprint },
        randomUUID(),
        null,
        false,
        now,
      ),
    ).toThrow("coincidencias");
    const key = randomUUID(),
      request = {
        ...body,
        fingerprint: p.fingerprint,
        aceptarCoincidencia: true,
      };
    const second = writeMovement(db, request, key, null, false, now);
    expect(second.movimiento.id).not.toBe(a.id);
    expect(writeMovement(db, request, key, null, false, now)).toEqual(second);
    expect(() =>
      writeMovement(db, { ...request, importe: "51" }, key, null, false, now),
    ).toThrow("otros datos");
    const correction = expense(saldo.id, partida.id, {
      importe: "10",
      revision: a.revision,
      motivo: "Era Gasto y no Ingreso",
    });
    const plan = previewMovement(db, correction, a.id, false, now);
    expect(plan.impacto.saldos[0].antes).toBe("200.00");
    expect(plan.impacto.saldos[0].despues).toBe("140.00");
    save(db, income(saldo.id, { fecha: "2026-10-14", importe: "1" }));
    expect(() =>
      writeMovement(
        db,
        { ...correction, fingerprint: plan.fingerprint },
        randomUUID(),
        a.id,
        false,
        now,
      ),
    ).toThrow("contexto");
    const fixed = save(db, correction, a.id);
    expect(fixed.id).toBe(a.id);
    expect(fixed.tipo).toBe("Gasto");
    expect(fixed.subtipo).toBeNull();
    expect(getSaldo(db, saldo.id).posicion.importe).toBe("141.00");
    const audit = getMovement(db, a.id).auditoria;
    expect(audit).toHaveLength(2);
    expect(audit[1].anterior.tipo).toBe("Ingreso");
    expect(audit[1].posterior.tipo).toBe("Gasto");
    expect(audit[1].motivo).toBe("Era Gasto y no Ingreso");
    const cancellation = {
        revision: fixed.revision,
        motivo: "Captura que no representa hecho real",
      },
      cp = previewMovement(db, cancellation, a.id, true, now),
      ck = randomUUID(),
      req = { ...cancellation, fingerprint: cp.fingerprint };
    const cancelled = writeMovement(db, req, ck, a.id, true, now);
    expect(cancelled.movimiento.id).toBe(a.id);
    expect(cancelled.movimiento.anulado).toBe(true);
    expect(getSaldo(db, saldo.id).posicion.importe).toBe("151.00");
    expect(writeMovement(db, req, ck, a.id, true, now)).toEqual(cancelled);
    expect(getMovement(db, a.id).auditoria).toHaveLength(3);
    expect(() => save(db, correction, a.id)).toThrow("anulado");
    expect(
      listMovements(
        db,
        new URLSearchParams({ estado: "Anulado" }),
      ).movimientos.map((r) => r.id),
    ).toEqual([a.id]);
    expect(listMovements(db, new URLSearchParams({ estado: "" })).total).toBe(
      3,
    );
    expect(() =>
      db.run("DELETE FROM movimientos WHERE id=?", [a.id]),
    ).toThrow();
    expect(() =>
      db.run("UPDATE movement_audit SET motivo='x' WHERE id=?", [a.id]),
    ).toThrow();
    const before = snapshot(db),
      next = income(saldo.id, { fecha: "2026-10-15" }),
      np = previewMovement(db, next, null, false, now);
    db.exec(
      "CREATE TRIGGER fail_movement_audit BEFORE INSERT ON movement_audit BEGIN SELECT RAISE(ABORT,'rollback audit'); END",
    );
    expect(() =>
      writeMovement(
        db,
        { ...next, fingerprint: np.fingerprint },
        randomUUID(),
        null,
        false,
        now,
      ),
    ).toThrow("rollback");
    db.exec("DROP TRIGGER fail_movement_audit");
    expect(snapshot(db)).toEqual(before);
    expect(() =>
      previewMovement(db, income(saldo.id), null, false, now, () => ({
        blocked: true,
        reason: "Contrato futuro de cierre protegido",
      })),
    ).toThrow("cierre protegido");
  } finally {
    db.close();
  }
});

test("04 AC21/22: impacto real de ancestros, Referencia protegida y huella incluye nuevos hechos", () => {
  const db = openDatabase(":memory:");
  try {
    const { category, sub, partida, saldo } = masters(db);
    const g = save(db, expense(saldo.id, partida.id));
    const target = createClassification(
      db,
      "categorias",
      {
        nombre: "Otra categoría ficticia",
        anual: "No aplica",
        mensual: "Gasto",
        referencia: false,
      },
      randomUUID(),
    );
    const changes = { revision: sub.revision, padre: target.id };
    expect(() =>
      updateClassification(db, "subcategorias", sub.id, changes),
    ).toThrow("rectificación");
    const p = previewClassification(db, "subcategorias", sub.id, changes);
    expect(p.financial?.movimientos.map((r) => r.id)).toEqual([g.id]);
    expect(p.pending).not.toContain("Movimientos");
    expect(p.financial?.movimientos[0].despues.categoria.id).toBe(target.id);
    save(db, expense(saldo.id, partida.id, { importe: "1" }));
    expect(() =>
      updateClassification(
        db,
        "subcategorias",
        sub.id,
        changes,
        undefined,
        now,
        { fingerprint: p.fingerprint, motivo: "Mover clasificación revisada" },
      ),
    ).toThrow("dependencias");
    const fresh = previewClassification(db, "subcategorias", sub.id, changes);
    updateClassification(db, "subcategorias", sub.id, changes, undefined, now, {
      fingerprint: fresh.fingerprint,
      motivo: "Mover clasificación revisada",
    });
    expect(getMovement(db, g.id).movimiento.partida?.categoria?.id).toBe(
      target.id,
    );
    expect(getSaldo(db, saldo.id).posicion.importe).toBe("79.00");
    expect(() =>
      previewClassification(db, "categorias", target.id, {
        revision: target.revision,
        referencia: true,
      }),
    ).toThrow("Referencia");
    const renamed = updateClassification(db, "categorias", category.id, {
      revision: category.revision,
      nombre: "Nombre actual",
    });
    expect(renamed.id).toBe(category.id);
  } finally {
    db.close();
  }
});

test("04 AC28/29: upgrade v3 genuino conserva tablas/acceso, backup v3/v5 y restore aislado", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-e14-upgrade-")),
    path = join(dir, "demo.sqlite");
  let db = openV3(path);
  try {
    const m = masters(db),
      key = loadKey(db, join(dir, "auth.key")),
      password = "Contraseña ficticia " + randomUUID(),
      auth = new Auth(db, key),
      enroll = await auth.enroll(provision(db), password);
    const verified = auth.verify(
      new Request("http://127.0.0.1:5173", {
        headers: { cookie: auth.challengeName + "=" + enroll.challenge },
      }),
      totp(enroll.secret!).generate(),
    );
    createCycle(
      db,
      {
        inicio: "2026-09-25",
        saldoInicialComida: "-3.21",
        contextRevision: cycleContext(db).revision,
      },
      randomUUID(),
    );
    const identity = join(dir, "identity.txt");
    expect(
      Bun.spawnSync(
        [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-o", identity],
        { stderr: "pipe", stdout: "pipe" },
      ).exitCode,
    ).toBe(0);
    const pub = Bun.spawnSync(
      [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-y", identity],
      { stderr: "pipe", stdout: "pipe" },
    )
      .stdout.toString()
      .trim();
    backup(db, key, join(dir, "v3"), pub);
    const before = snapshot(db);
    db.close();
    db = openDatabase(path);
    for (const [table, data] of before)
      if (!["schema_version", "counters"].includes(table))
        expect(
          db.query(`SELECT * FROM "${table}" ORDER BY rowid`).all(),
        ).toEqual(
          table === "partidas"
            ? data.map((r: any) => ({ ...r, deuda: null, presupuesto: null }))
            : data,
        );
    for (const counter of before.find(([name]) => name === "counters")![1] as {
      name: string;
      next: number;
    }[])
      expect(
        db.query("SELECT * FROM counters WHERE name=?").get(counter.name),
      ).toEqual(counter);
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 8,
    });
    expect(listMovements(db).total).toBe(0);
    const nextAuth = new Auth(db, readFileSync(join(dir, "auth.key")));
    expect(
      nextAuth.session(
        new Request("http://127.0.0.1:5173", {
          headers: { cookie: nextAuth.cookieName + "=" + verified.session },
        }),
      ).csrf,
    ).toBe(verified.csrf);
    const login = await nextAuth.login(password);
    expect(
      nextAuth.verify(
        new Request("http://127.0.0.1:5173", {
          headers: { cookie: nextAuth.challengeName + "=" + login.challenge },
        }),
        totp(enroll.secret!).generate({ timestamp: Date.now() + 30000 }),
      ).session,
    ).toBeString();
    const movement = save(db, income(m.saldo.id)),
      audit = getMovement(db, movement.id).auditoria;
    backup(db, key, join(dir, "v8"), pub);
    for (const version of [3, 8]) {
      const restored = restore(
          join(dir, "v" + version),
          join(dir, "restored" + version),
          identity,
        ),
        copy = openDatabase(restored.database);
      try {
        expect(copy.query("SELECT * FROM sessions").all()).toEqual([]);
        expect(getSaldo(copy, m.saldo.id).saldoApertura).toBe("100.00");
        expect(copy.query("SELECT * FROM categorias").all()).toHaveLength(1);
        expect(copy.query("SELECT * FROM ciclos").all()).toHaveLength(1);
        expect(listMovements(copy).total).toBe(version === 8 ? 1 : 0);
        if (version === 8) {
          expect(getMovement(copy, movement.id).auditoria).toEqual(audit);
          expect(getSaldo(copy, m.saldo.id).posicion.importe).toBe("150.00");
          expect(cycleContext(copy).referencia.fecha).toBe("2026-10-12");
        }
      } finally {
        copy.close();
      }
    }
    const after = snapshot(db);
    db.close();
    db = openDatabase(path);
    expect(snapshot(db)).toEqual(after);
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("04 AC28: fallo de DDL revierte extensión y versión, esquema desconocido intacto", () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-e14-rollback-")),
    path = join(dir, "demo.sqlite");
  let db = openV3(path);
  try {
    masters(db);
    db.exec("CREATE TABLE movement_attempts(test TEXT)");
    const before = snapshot(db);
    db.close();
    expect(() => openDatabase(path)).toThrow();
    db = new Database(path);
    expect(snapshot(db)).toEqual(before);
    expect(
      db.query("SELECT name FROM sqlite_master WHERE name='movimientos'").get(),
    ).toBeNull();
    db.exec("UPDATE schema_version SET version=999");
    const unknown = snapshot(db);
    db.close();
    expect(() => openDatabase(path)).toThrow("no compatible");
    db = new Database(path);
    expect(snapshot(db)).toEqual(unknown);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

// Test-only diagnostics. Never echo argv, payloads, raw stdout/stderr or exception messages.
function e14Technical(error: unknown) {
  const e = (error ?? {}) as {
    name?: unknown;
    code?: unknown;
    errno?: unknown;
    stack?: unknown;
    location?: unknown;
  };
  const reasons: Record<string, string> = {
    SQLITE_BUSY: "SQLite database busy",
    SQLITE_BUSY_RECOVERY: "SQLite recovery busy",
    SQLITE_BUSY_SNAPSHOT: "SQLite snapshot busy",
    SQLITE_LOCKED: "SQLite database locked",
    SQLITE_LOCKED_SHAREDCACHE: "SQLite shared cache locked",
    SQLITE_ERROR: "SQLite statement error",
    SQLITE_CONSTRAINT: "SQLite constraint failed",
    SQLITE_CONSTRAINT_FOREIGNKEY: "SQLite foreign key failed",
    SQLITE_CANTOPEN: "SQLite open failed",
    SQLITE_IOERR: "SQLite IO failed",
    SQLITE_FULL: "SQLite storage full",
    SQLITE_READONLY: "SQLite read only",
    SQLITE_NOMEM: "SQLite allocation failed",
    SQLITE_MISUSE: "SQLite API misuse",
  };
  const code =
    typeof e.code === "string" && Object.hasOwn(reasons, e.code)
      ? e.code
      : "UNCLASSIFIED";
  const site =
    /(?:^|[/\\])((?:database|database-schema|database-identity|private-state|auth|movimientos|referencias|movement-ledger|movement-impact|reference-schema)\.ts:[0-9]+:[0-9]+)(?:\)|$)/m;
  const frame = typeof e.stack === "string" ? e.stack.match(site)?.[1] : null;
  const location =
    frame ??
    (typeof e.location === "string" ? e.location.match(site)?.[1] : null) ??
    null;
  return {
    name: [
      "Error",
      "SQLiteError",
      "TypeError",
      "SyntaxError",
      "RangeError",
    ].includes(e.name as string)
      ? e.name
      : "UnknownError",
    code,
    errno: Number.isSafeInteger(e.errno) ? e.errno : null,
    reason: reasons[code] ?? "Technical error; details redacted",
    location,
  };
}
function e14Child(
  imports: string,
  opening: string,
  writing: string,
  closing: string,
) {
  return `${imports}
    const e14Technical = ${e14Technical.toString()};
    let e14Phase = 'open';
    const e14Report = error => console.error(JSON.stringify({e14:1,phase:e14Phase,error:e14Technical(error)}));
    try {
      ${opening}
      e14Phase = 'write'; ${writing}
      e14Phase = 'close'; ${closing}
    } catch(error) { e14Report(error); process.exitCode = 1; }`;
}
async function runE14(code: string, operation: string) {
  const p = Bun.spawn([process.execPath, "-e", code], {
    env: { ...process.env, NODE_ENV: "test" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, rawStderr, exit] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
    p.exited,
  ]);
  // Preserve the empty/nonempty assertion without exposing raw error text in its diff.
  const errors =
    rawStderr === ""
      ? []
      : rawStderr
          .trim()
          .split("\n")
          .slice(0, 4)
          .map((line) => {
            try {
              const value = JSON.parse(line);
              if (
                value?.e14 === 1 &&
                ["open", "write", "close"].includes(value.phase)
              )
                return { phase: value.phase, error: e14Technical(value.error) };
            } catch {}
            return { phase: "unknown", error: e14Technical(null) };
          });
  const stderr = rawStderr === "" ? "" : JSON.stringify(errors);
  let output = stdout === "" ? "empty" : "invalid-json";
  try {
    JSON.parse(stdout);
    output = "json";
  } catch {}
  if (exit !== 0 || stderr !== "" || output !== "json") {
    console.error(
      "E1.4 child diagnostic " +
        JSON.stringify({
          operation,
          phase:
            errors.find((error) => error.phase !== "unknown")?.phase ??
            "unknown",
          pid: p.pid,
          exit,
          signal: p.signalCode ?? null,
          errors,
          stdout: { bytes: Buffer.byteLength(stdout), format: output },
        }),
    );
  }
  expect(exit).toBe(0);
  expect(stderr).toBe("");
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error("E1.4 child output is not JSON; content redacted.");
  }
}

test("04 AC22/23/28: dos procesos actualizan v3, reintentan alta y compiten en rectificación", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-e14-race-")),
    path = join(dir, "demo.sqlite");
  let db = openV3(path);
  try {
    const m = masters(db);
    db.close();
    const database = resolve(import.meta.dir, "database.ts"),
      service = resolve(import.meta.dir, "movimientos.ts");
    const opening = e14Child(
      `import{openDatabase}from${JSON.stringify(database)};`,
      `const db=openDatabase(${JSON.stringify(path)});`,
      "console.log(JSON.stringify(db.query('SELECT version FROM schema_version').get()));",
      "db.close();",
    );
    expect(
      await Promise.all([
        runE14(opening, "upgrade"),
        runE14(opening, "upgrade"),
      ]),
    ).toEqual([{ version: 8 }, { version: 8 }]);
    db = openDatabase(path);
    const body = income(m.saldo.id),
      plan = previewMovement(db, body, null, false, now),
      request = { ...body, fingerprint: plan.fingerprint },
      key = randomUUID();
    db.close();
    const create = e14Child(
      `import{openDatabase}from${JSON.stringify(database)};import{writeMovement}from${JSON.stringify(service)};`,
      `const db=openDatabase(${JSON.stringify(path)});`,
      `console.log(JSON.stringify({id:writeMovement(db,${JSON.stringify(request)},${JSON.stringify(key)},null,false,${now}).movimiento.id}));`,
      "db.close();",
    );
    const written = await Promise.all([
      runE14(create, "idempotent-write"),
      runE14(create, "idempotent-write"),
    ]);
    expect(written[0]).toEqual(written[1]);
    db = openDatabase(path);
    expect(listMovements(db).total).toBe(1);
    const id = written[0].id,
      c = income(m.saldo.id, {
        importe: "51",
        revision: 1,
        motivo: "Rectificación concurrente ficticia",
      }),
      cp = previewMovement(db, c, id, false, now),
      req = { ...c, fingerprint: cp.fingerprint };
    db.close();
    const correction = e14Child(
      `import{openDatabase}from${JSON.stringify(database)};import{writeMovement}from${JSON.stringify(service)};`,
      `const db=openDatabase(${JSON.stringify(path)});`,
      `try{writeMovement(db,${JSON.stringify(req)},crypto.randomUUID(),${JSON.stringify(id)},false,${now});console.log('200')}catch(e){if(e?.status!==409)e14Report(e);console.log(JSON.stringify(e.status))}`,
      "db.close();",
    );
    expect(
      (
        await Promise.all([
          runE14(correction, "rectification"),
          runE14(correction, "rectification"),
        ])
      ).sort(),
    ).toEqual([200, 409]);
    db = openDatabase(path);
    expect(getMovement(db, id).auditoria).toHaveLength(2);
    expect(getSaldo(db, m.saldo.id).posicion.importe).toBe("151.00");
  } finally {
    try {
      db.close();
    } catch {}
    rmSync(dir, { recursive: true, force: true });
  }
});

test("04 AC25: API Effect con MFA, CSRF, derivados y rutas de rectificar/anular protegidas", async () => {
  const db = openDatabase(":memory:"),
    key = randomBytes(32),
    origin = "http://127.0.0.1:5173",
    handler = HttpApp.toWebHandler(createApp(db, { key, now: () => now }));
  const request = (
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    handler(
      new Request(origin + path, {
        method,
        headers: { origin, "content-type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  try {
    const m = masters(db);
    for (const path of [
      "/api/movimientos",
      "/api/movimientos/opciones",
      "/api/movimientos/1",
    ])
      expect((await request(path)).status).toBe(401);
    const auth = new Auth(db, key, origin, () => now),
      enrollment = await auth.enroll(
        provision(db, now),
        "Contraseña ficticia " + randomUUID(),
      );
    const verified = auth.verify(
      new Request(origin, {
        headers: { cookie: auth.challengeName + "=" + enrollment.challenge },
      }),
      totp(enrollment.secret!).generate({ timestamp: now }),
    );
    const headers = {
      cookie: auth.cookieName + "=" + verified.session,
      "x-csrf-token": verified.csrf,
      "idempotency-key": randomUUID(),
    };
    expect(
      (
        await request("/api/movimientos/impacto", "POST", income(m.saldo.id), {
          ...headers,
          "x-csrf-token": "",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request("/api/movimientos", "POST", income(m.saldo.id), {
          ...headers,
          origin: "https://invalid.example",
        })
      ).status,
    ).toBe(403);
    const options = await request(
      "/api/movimientos/opciones",
      "GET",
      undefined,
      headers,
    );
    expect(options.headers.get("cache-control")).toBe("no-store");
    expect((await options.json()).hoy).toBe("2026-10-21");
    const p = await (
      await request(
        "/api/movimientos/impacto",
        "POST",
        income(m.saldo.id),
        headers,
      )
    ).json();
    const created = await request(
      "/api/movimientos",
      "POST",
      { ...income(m.saldo.id), fingerprint: p.fingerprint },
      headers,
    );
    expect(created.status).toBe(201);
    const g = await created.json();
    expect(
      (
        await request(
          "/api/movimientos/" + g.movimiento.id,
          "DELETE",
          {},
          headers,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          "/api/movimientos/impacto",
          "POST",
          income(m.saldo.id, { origen: "S001" }),
          headers,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await request(
          "/api/movimientos/impacto",
          "POST",
          income(m.saldo.id, { fecha: "2026-10-22" }),
          headers,
        )
      ).status,
    ).toBe(422);
    const c = { revision: 1, motivo: "Captura de prueba sin hecho real" },
      ap = await (
        await request(
          `/api/movimientos/${g.movimiento.id}/impacto-anulacion`,
          "POST",
          c,
          headers,
        )
      ).json();
    expect(
      (
        await request(
          `/api/movimientos/${g.movimiento.id}/anular`,
          "POST",
          { ...c, fingerprint: ap.fingerprint },
          { ...headers, "idempotency-key": randomUUID() },
        )
      ).status,
    ).toBe(200);
    expect(
      (await request("/api/movimientos/99999", "GET", undefined, headers))
        .status,
    ).toBe(404);
  } finally {
    db.close();
  }
});

test("04 filtros/páginas: maestro completo, orden numérico y posición no dependiente de consulta", () => {
  const db = openDatabase(":memory:");
  try {
    const m = masters(db);
    for (let i = 0; i < 103; i++)
      save(
        db,
        income(m.saldo.id, {
          importe: "0.01",
          concepto: "Hecho ficticio " + i,
        }),
      );
    expect(listMovements(db).movimientos[0].id).toBe("103");
    expect(
      listMovements(db, new URLSearchParams({ page: "2" })).movimientos,
    ).toHaveLength(3);
    expect(getSaldo(db, m.saldo.id).posicion.importe).toBe("101.03");
    expect(
      listMovements(db, new URLSearchParams({ q: "Hecho ficticio 100" })).total,
    ).toBe(1);
    expect(
      listMovements(
        db,
        new URLSearchParams({
          ciclo: "sin_ciclo",
          tipo: "Ingreso",
          saldo: m.saldo.id,
          desde: "2026-10-12",
          hasta: "2026-10-12",
        }),
      ).total,
    ).toBe(103);
    expect(() =>
      listMovements(
        db,
        new URLSearchParams({ desde: "2026-10-14", hasta: "2026-10-12" }),
      ),
    ).toThrow();
    expect(() =>
      listMovements(db, new URLSearchParams({ page: "0" })),
    ).toThrow();
    expect(movementOptions(db).partidas[0].categoria?.id).toBe(m.category.id);
  } finally {
    db.close();
  }
});

test("04 AC18/20/23: anular conserva enlaces históricos y no valida como alta; IDs exactos mayores que 2^53", () => {
  const db = openDatabase(":memory:");
  try {
    const m = masters(db),
      g = save(db, expense(m.saldo.id, m.partida.id));
    // Isolated future-import legacy configuration, not a fixture endpoint or financial engine.
    db.run("UPDATE saldos SET estado='Inactiva',exterior=NULL WHERE id=?", [
      m.saldo.id,
    ]);
    db.run("UPDATE partidas SET estado='Inactiva' WHERE id=?", [m.partida.id]);
    db.run("UPDATE categorias SET referencia=1 WHERE id=?", [m.category.id]);
    const cancelled = save(
      db,
      {
        revision: g.revision,
        motivo: "Registro heredado erróneo, sin hecho real",
      },
      g.id,
      true,
    );
    expect(cancelled.id).toBe(g.id);
    expect(cancelled.anulado).toBe(true);
    expect(cancelled.origen.estado).toBe("Inactiva");
    expect(cancelled.partida?.estado).toBe("Inactiva");
    expect(getSaldo(db, m.saldo.id).permiteSalidaExterior).toBeNull();
    expect(getSaldo(db, m.saldo.id).posicion.importe).toBe("100.00");
    expect(cycleContext(db).referencia.fecha).toBeNull();
    expect(() =>
      db.run("UPDATE movimientos SET anulado=0 WHERE id=?", [g.id]),
    ).toThrow();
    const other = createSaldo(
      db,
      {
        nombre: "Identidad ficticia de precisión",
        tipo: "Efectivo",
        control: "Movimientos",
      },
      randomUUID(),
    );
    db.run(
      "UPDATE counters SET next=9007199254740993 WHERE name='movimientos'",
    );
    const first = save(db, income(other.id)),
      second = save(db, income(other.id, { importe: "1" }));
    expect(first.id).toBe("9007199254740993");
    expect(second.id).toBe("9007199254740994");
    expect(() =>
      db.run("UPDATE movimientos SET id='999' WHERE id=?", [first.id]),
    ).toThrow();
  } finally {
    db.close();
  }
});

// Only the isolated negative subprocess registers this deliberately failing test.
const e14ProbePhase = process.env.MYFINANZAS_E14_PROBE_PHASE;
if (["open", "write", "close"].includes(e14ProbePhase ?? "")) {
  test("04 diagnostic controlled failure", async () => {
    const fail = `console.log('E14_CANARY_NOT_FOR_LOGS');console.error('E14_CANARY_NOT_FOR_LOGS');throw Object.assign(new Error('/private/E14_CANARY_NOT_FOR_LOGS payload must not escape'),{code:'SQLITE_BUSY',errno:5,stack:'Error: E14_CANARY_NOT_FOR_LOGS\\n at openDatabase (/private/E14_CANARY_NOT_FOR_LOGS/database.ts:44:7)'});`;
    await runE14(
      e14Child(
        "",
        e14ProbePhase === "open" ? fail : "",
        e14ProbePhase === "write" ? fail : "",
        e14ProbePhase === "close" ? fail : "",
      ),
      "controlled-probe",
    );
  });
}
test("04 diagnostic: fallo instrumental conserva rechazo y diagnóstico seguro de apertura/escritura/cierre", async () => {
  expect(
    e14Technical({
      name: "E14_CANARY_NOT_FOR_LOGS",
      code: "E14_CANARY_NOT_FOR_LOGS",
      message: "E14_CANARY_NOT_FOR_LOGS",
    }),
  ).toEqual({
    name: "UnknownError",
    code: "UNCLASSIFIED",
    errno: null,
    reason: "Technical error; details redacted",
    location: null,
  });
  expect(
    e14Technical({
      location: "/private/E14_CANARY_NOT_FOR_LOGS/database.ts:44:7",
    }).location,
  ).toBe("database.ts:44:7");
  expect(
    e14Technical({ location: "E14_CANARY_NOT_FOR_LOGS" }).location,
  ).toBeNull();
  for (const phase of ["open", "write", "close"]) {
    const p = Bun.spawn(
      [
        process.execPath,
        "test",
        import.meta.path,
        "--test-name-pattern",
        "^04 diagnostic controlled failure$",
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: "test",
          MYFINANZAS_E14_PROBE_PHASE: phase,
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [stdout, stderr, exit] = await Promise.all([
      new Response(p.stdout).text(),
      new Response(p.stderr).text(),
      p.exited,
    ]);
    const log = stdout + stderr;
    expect(exit).toBe(1);
    expect(p.signalCode ?? null).toBeNull();
    expect(log).toContain("1 fail");
    expect(log).not.toContain("E14_CANARY_NOT_FOR_LOGS");
    expect(log).not.toContain("/private/");
    const line = log
      .split("\n")
      .find((line) => line.startsWith("E1.4 child diagnostic "));
    expect(line).toBeString();
    const diagnostic = JSON.parse(line!.slice("E1.4 child diagnostic ".length));
    expect(diagnostic.operation).toBe("controlled-probe");
    expect(diagnostic.phase).toBe(phase);
    expect(diagnostic.pid).toBeInteger();
    expect(diagnostic.pid).toBeGreaterThan(0);
    expect(diagnostic.exit).toBe(1);
    expect(diagnostic.signal).toBeNull();
    expect(diagnostic.stdout).toEqual({ bytes: 24, format: "invalid-json" });
    expect(diagnostic.errors).toContainEqual({
      phase,
      error: {
        name: "Error",
        code: "SQLITE_BUSY",
        errno: 5,
        reason: "SQLite database busy",
        location: "database.ts:44:7",
      },
    });
    expect(log.indexOf("E1.4 child diagnostic ")).toBeLessThan(
      log.indexOf("error: expect(received)"),
    );
  }
});
