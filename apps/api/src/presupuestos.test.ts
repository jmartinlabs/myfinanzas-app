import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID, randomBytes } from "node:crypto";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  chmodSync,
  existsSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { HttpApp } from "@effect/platform";
import { openDatabase } from "./database";
import {
  createBudget,
  getBudget,
  listBudgets,
  updateBudget,
  previewBudget,
  changeBudgetState,
  budgetUsage,
} from "./presupuestos";
import {
  createClassification,
  getClassification,
  updateClassification,
  previewClassification,
  changeClassificationState,
} from "./clasificacion";
import { createSaldo, getSaldo, updateSaldo } from "./saldos";
import { createDebt } from "./deudas";
import { previewMovement, writeMovement } from "./movimientos";
import { openDatabaseV7 } from "../test-support/database-v7";
import { inspectIdentity, keyHash } from "./database-identity";
import { Auth, provision, totp } from "./auth";
import { backup, restore } from "./backup";
import { createApp } from "./app";
const key = () => randomUUID(),
  now = Date.parse("2026-10-22T12:00:00Z");
function setup(db: Database) {
  const s = createSaldo(
    db,
    {
      nombre: "Banco demo",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "500",
      permiteSalidaExterior: true,
    },
    key(),
  );
  const cat = createClassification(
    db,
    "categorias",
    {
      nombre: "Categoría demo",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    key(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub demo", padre: cat.id },
    key(),
  );
  return { s, sub };
}
const input = (
  nombre: string,
  destino: string | null = null,
  fuente = "No aplica",
) => ({ nombre, fuente, destino });
function part(
  db: Database,
  sub: string,
  budget: string | null = null,
  debt: string | null = null,
) {
  return createClassification(
    db,
    "partidas",
    {
      nombre: "Partida demo " + key(),
      padre: sub,
      presupuesto: budget,
      deuda: debt,
    },
    key(),
  );
}
function fact(db: Database, s: string, p: string) {
  const body = {
    tipo: "Gasto",
    fecha: "2026-10-22",
    saldo: s,
    partida: p,
    importe: "10",
  };
  const plan = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint },
    key(),
    null,
    false,
    now,
  ).movimiento;
}
function snap(db: Database): [string, any[]][] {
  return (
    db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[]
  ).map((t) => [
    t.name,
    db.query(`SELECT * FROM "${t.name}" ORDER BY rowid`).all(),
  ]);
}
test("08 B1 AC01-04/08/09/20/23/24: tres fuentes, destinos y ausencia sin reserva", () => {
  const db = openDatabase(":memory:");
  try {
    const { s } = setup(db);
    const n = createBudget(db, input("Sin ejecución"), key());
    expect(n.destino).toBeNull();
    for (const fuente of ["Gasto real", "Aportación a saldo"]) {
      const b = createBudget(db, input(fuente, s.id, fuente), key());
      expect(b.fuente).toBe(fuente);
      expect(b.destino).toBe(s.id);
      expect(() =>
        createBudget(db, input("Ausente" + fuente, null, fuente), key()),
      ).toThrow();
    }
    expect(() =>
      createBudget(db, input("No aplica con destino", s.id), key()),
    ).toThrow();
    expect(() =>
      createBudget(db, input("Obsoleta", s.id, "Devolución anticipo"), key()),
    ).toThrow();
    for (const destino of ["S000", "S99999", ""]) {
      expect(() =>
        createBudget(
          db,
          input("Inválido" + destino, destino, "Gasto real"),
          key(),
        ),
      ).toThrow();
    }
    expect(() =>
      createBudget(
        db,
        input("Doble aportación", s.id, "Aportación a saldo"),
        key(),
      ),
    ).toThrow("Otra Aportación");
    expect(
      createBudget(db, input("Otro gasto", s.id, "Gasto real"), key()).destino,
    ).toBe(s.id);
    expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual({
      n: 0,
    });
    expect(
      listBudgets(db, new URLSearchParams({ fuente: "Gasto real" })).total,
    ).toBe(2);
    const inactive = updateSaldo(db, s.id, {
      revision: s.revision,
      nombre: s.nombre,
    });
    expect(inactive.id).toBe(s.id);
    for (const type of ["Terminal", "No controlado"]) {
      const target = createSaldo(
        db,
        {
          nombre: type,
          tipo: "Efectivo",
          control: type,
          liquidez: false,
          finalidad: "Gastos planificados",
        },
        key(),
      );
      expect(
        createBudget(db, input(type, target.id, "Gasto real"), key()).destino,
      ).toBe(target.id);
    }
  } finally {
    db.close();
  }
});
test("08 B2 AC10-12/15/16/17: nombres exactos, inactivos, intento y revisión", () => {
  const db = openDatabase(":memory:");
  try {
    const b = createBudget(db, input("Viaje"), key());
    expect(() => createBudget(db, input("VIAJE"), key())).toThrow(
      "nombre ya existe",
    );
    const off = changeBudgetState(db, b.id, { revision: 1 }, false);
    expect(() => createBudget(db, input("viaje"), key())).toThrow();
    for (const name of [
      "Viajé",
      "Viaje ",
      "Plan*",
      "Plan?",
      "PlanABC",
      "\u00e9",
      "e\u0301",
    ]) {
      expect(createBudget(db, input(name), key()).nombre).toBe(name);
    }
    expect(() => createBudget(db, input(" "), key())).toThrow();
    const renamed = updateBudget(db, b.id, {
      revision: off.revision,
      nombre: "VIAJE",
    });
    expect(renamed.nombre).toBe("VIAJE");
    expect(renamed.estado).toBe("Inactivo");
    expect(() =>
      updateBudget(db, b.id, { revision: off.revision, nombre: "Otro" }),
    ).toThrow();
    const attempt = key(),
      body = input("Reintento");
    const saved = createBudget(db, body, attempt);
    expect(createBudget(db, body, attempt)).toEqual(saved);
    expect(() => createBudget(db, input("Otro intento"), attempt)).toThrow();
    expect(() =>
      updateBudget(db, b.id, { revision: renamed.revision, id: "PRE999" }),
    ).toThrow();
    expect(() =>
      db.run("UPDATE presupuestos SET id='PRE999' WHERE id=?", [b.id]),
    ).toThrow();
    expect(() =>
      db.run("DELETE FROM presupuestos WHERE id=?", [b.id]),
    ).toThrow();
  } finally {
    db.close();
  }
});
test("08 B3 AC05-07/11/13/14: Partida independiente de Deuda y bloqueo histórico sin motor", () => {
  const db = openDatabase(":memory:");
  try {
    const { s, sub } = setup(db),
      b = createBudget(db, input("Consumo", s.id, "Gasto real"), key()),
      b2 = createBudget(db, input("Otro"), key()),
      debt = createDebt(
        db,
        {
          nombre: "Deuda demo",
          inicioControl: "2026-10-01",
          capitalApertura: "100",
        },
        key(),
      ),
      p = part(db, sub.id, b.id, debt.id),
      unbudgeted = part(db, sub.id);
    expect(getClassification(db, "partidas", p.id).deuda).toBe(debt.id);
    expect(getClassification(db, "partidas", p.id).presupuesto).toBe(b.id);
    expect(unbudgeted.presupuesto).toBeNull();
    fact(db, s.id, unbudgeted.id);
    expect(getSaldo(db, s.id).posicion.importe).toBe("490.00");
    const pplan = previewClassification(db, "partidas", unbudgeted.id, {
      revision: 1,
      presupuesto: b.id,
    });
    expect(pplan.blocked).toBe(true);
    expect(() =>
      updateClassification(db, "partidas", unbudgeted.id, {
        revision: 1,
        presupuesto: b.id,
      }),
    ).toThrow("Impacto de periodos no verificable");
    expect(() =>
      updateClassification(
        db,
        "partidas",
        unbudgeted.id,
        { revision: 1, presupuesto: b.id },
        undefined,
        now,
        { fingerprint: pplan.fingerprint, motivo: "No permite bypass" },
      ),
    ).toThrow("Impacto de periodos no verificable");
    expect(
      getClassification(db, "partidas", unbudgeted.id).presupuesto,
    ).toBeNull();
    expect(() => changeBudgetState(db, b.id, { revision: 1 }, false)).toThrow(
      "Partidas activas",
    );
    const prior = snap(db);
    const quota = {
      tipo: "Gasto",
      fecha: "2026-10-22",
      saldo: s.id,
      partida: p.id,
      importe: "20",
      capital: "15",
      intereses: "5",
    };
    const qp = previewMovement(db, quota, null, false, now);
    writeMovement(
      db,
      { ...quota, fingerprint: qp.fingerprint },
      key(),
      null,
      false,
      now,
    );
    const blocked = previewBudget(db, b.id, {
      revision: 1,
      fuente: "No aplica",
      destino: null,
    });
    expect(blocked.blocked).toBe(true);
    expect(blocked.usos).toHaveLength(1);
    expect(() =>
      updateBudget(
        db,
        b.id,
        { revision: 1, fuente: "No aplica", destino: null },
        now,
        { fingerprint: blocked.fingerprint, motivo: "No inventar ejecución" },
      ),
    ).toThrow("Impacto de periodos no verificable");
    expect(getBudget(db, b.id).fuente).toBe("Gasto real");
    expect(getClassification(db, "partidas", p.id).deuda).toBe(debt.id);
    expect(budgetUsage(db, b.id)).toHaveLength(1);
    expect(prior.length).toBeGreaterThan(0);
    const offpart = changeClassificationState(
      db,
      "partidas",
      p.id,
      { revision: 1 },
      false,
    );
    const off = changeBudgetState(db, b.id, { revision: 1 }, false);
    expect(() =>
      changeClassificationState(
        db,
        "partidas",
        p.id,
        { revision: offpart.revision },
        true,
      ),
    ).toThrow("Presupuesto");
    expect(() => part(db, sub.id, b.id)).toThrow("activo");
    expect(
      changeBudgetState(db, b.id, { revision: off.revision }, true).estado,
    ).toBe("Activo");
    expect(b2.destino).toBeNull();
  } finally {
    db.close();
  }
});
test("08 B4 AC13/14/17: revisión verificable sin hechos, huella y rollback íntegro", () => {
  const db = openDatabase(":memory:");
  try {
    const { s, sub } = setup(db),
      b = createBudget(db, input("Revisión", s.id, "Gasto real"), key());
    part(db, sub.id, b.id);
    const body = { revision: 1, fuente: "No aplica", destino: null };
    const plan = previewBudget(db, b.id, body);
    expect(plan.blocked).toBe(false);
    expect(() => updateBudget(db, b.id, body)).toThrow("Revisa");
    expect(() =>
      updateBudget(db, b.id, body, now, {
        fingerprint: plan.fingerprint,
        motivo: "",
      }),
    ).toThrow("Motivo");
    part(db, sub.id, b.id);
    expect(() =>
      updateBudget(db, b.id, body, now, {
        fingerprint: plan.fingerprint,
        motivo: "Cambio demo",
      }),
    ).toThrow("impacto ha cambiado");
    const next = previewBudget(db, b.id, body);
    expect(
      updateBudget(db, b.id, body, now, {
        fingerprint: next.fingerprint,
        motivo: "Configuración sin historia",
      }).destino,
    ).toBeNull();
    db.exec(
      "CREATE TRIGGER fail_budget_audit BEFORE INSERT ON audit WHEN NEW.entidad LIKE 'PRE%' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END",
    );
    const before = snap(db);
    expect(() => createBudget(db, input("Rollback"), key())).toThrow();
    expect(snap(db)).toEqual(before);
    db.exec("DROP TRIGGER fail_budget_audit");
    const reopened = updateBudget(db, b.id, {
      revision: 2,
      nombre: "Revisión renombrada",
    });
    expect(reopened.revision).toBe(3);
  } finally {
    db.close();
  }
});
test("08 B5 AC17/23: procesos reales serializan nombres y destinos sin duplicar", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-budget-race-")),
    path = join(dir, "demo.sqlite");
  let db = openDatabase(path);
  try {
    const { s } = setup(db);
    db.close();
    const database = resolve(import.meta.dir, "database.ts"),
      service = resolve(import.meta.dir, "presupuestos.ts");
    async function run(body: Record<string, unknown>) {
      const code = `import{openDatabase}from${JSON.stringify(database)};import{createBudget}from${JSON.stringify(service)};const d=openDatabase(${JSON.stringify(path)});try{createBudget(d,${JSON.stringify(body)},crypto.randomUUID());console.log('201')}catch(e){if(![409,422].includes(e.status))throw e;console.log(JSON.stringify(e.status))}finally{d.close()}`;
      const p = Bun.spawn([process.execPath, "-e", code], {
        env: { ...process.env, NODE_ENV: "test" },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [out, err, exit] = await Promise.all([
        new Response(p.stdout).text(),
        new Response(p.stderr).text(),
        p.exited,
      ]);
      expect(exit).toBe(0);
      expect(err).toBe("");
      return JSON.parse(out);
    }
    expect(
      (await Promise.all([run(input("Race")), run(input("RACE"))])).sort(),
    ).toEqual([201, 422]);
    expect(
      (
        await Promise.all([
          run(input("Aportación1", s.id, "Aportación a saldo")),
          run(input("Aportación2", s.id, "Aportación a saldo")),
        ])
      ).sort(),
    ).toEqual([201, 422]);
    db = openDatabase(path);
    expect(db.query("SELECT COUNT(*) n FROM presupuestos").get()).toEqual({
      n: 2,
    });
    expect(
      db.query("SELECT next FROM counters WHERE name='presupuestos'").get(),
    ).toEqual({ next: 3 });
  } finally {
    try {
      db.close();
    } catch {}
    rmSync(dir, { recursive: true, force: true });
  }
});
test("08 B6 AC18/19/20/24: HTTP Effect/MFA/CSRF y errores reales", async () => {
  const db = openDatabase(":memory:"),
    keyBytes = randomBytes(32);
  try {
    const auth = new Auth(db, keyBytes),
      enrolled = await auth.enroll(
        provision(db),
        "Contraseña ficticia presupuesto " + key(),
      ),
      verified = auth.verify(
        new Request("http://127.0.0.1:5173", {
          headers: { cookie: auth.challengeName + "=" + enrolled.challenge },
        }),
        totp(enrolled.secret!).generate(),
      ),
      handler = HttpApp.toWebHandler(createApp(db, { key: keyBytes }));
    const request = (
      path: string,
      method = "GET",
      body?: unknown,
      headers: Record<string, string> = {},
    ) =>
      handler(
        new Request("http://127.0.0.1:3001/api" + path, {
          method,
          headers: { "content-type": "application/json", ...headers },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
    expect((await request("/presupuestos")).status).toBe(401);
    expect((await request("/presupuestos/PRE001")).status).toBe(401);
    const cookie = auth.cookieName + "=" + verified.session,
      good = {
        cookie,
        origin: "http://127.0.0.1:5173",
        "x-csrf-token": verified.csrf,
        "idempotency-key": key(),
      };
    expect(
      (await request("/presupuestos", "POST", input("No csrf"), { cookie }))
        .status,
    ).toBe(403);
    const r = await request("/presupuestos", "POST", input("API demo"), good);
    expect(r.status).toBe(201);
    const item = (await r.json()).item;
    expect(Object.keys(item)).not.toContain("ejecutado");
    expect(
      (await request("/presupuestos/" + item.id, "GET", undefined, { cookie }))
        .status,
    ).toBe(200);
    expect(
      (await request("/presupuestos/PRE999", "GET", undefined, { cookie }))
        .status,
    ).toBe(404);
    expect(
      (
        await request(
          "/presupuestos/" + item.id,
          "PATCH",
          { revision: 1, ejecutado: "0" },
          good,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await request(
          "/presupuestos/" + item.id,
          "PATCH",
          { revision: 99, nombre: "Obsoleto" },
          good,
        )
      ).status,
    ).toBe(409);
    expect(
      (await request("/presupuestos/" + item.id, "DELETE", undefined, good))
        .status,
    ).toBe(404);
  } finally {
    db.close();
  }
});
test("08 B7 AC22: continuidad v7 genuina demo/producción, MFA e identidad sin reset", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-budget-v7-")),
    oldEnv = { ...process.env };
  try {
    for (const origin of ["demo", "production"] as const) {
      const state = join(dir, origin);
      await import("node:fs").then((fs) =>
        fs.mkdirSync(state, { mode: 0o700 }),
      );
      const path = join(state, "database.sqlite"),
        keyPath = join(state, "auth.key"),
        secret = randomBytes(32);
      writeFileSync(keyPath, secret, { mode: 0o600 });
      let db = openDatabaseV7(path, {
        origin,
        key_hash: origin === "production" ? keyHash(secret) : null,
      });
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({
        version: 7,
      });
      expect(
        db
          .query("SELECT name FROM sqlite_master WHERE name='presupuestos'")
          .get(),
      ).toBeNull();
      const { s, sub } = setup(db),
        debt = createDebt(
          db,
          {
            nombre: "Deuda conservada",
            inicioControl: "2026-10-01",
            capitalApertura: "100",
          },
          key(),
        );
      db.run(
        "INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda) VALUES('PAR900','Partida v7',?,'Activa',1,'antes','antes',?)",
        [sub.id, debt.id],
      );
      const auth = new Auth(db, secret),
        enrolled = await auth.enroll(
          provision(db),
          "Contraseña continuidad presupuesto " + key(),
        ),
        verified = auth.verify(
          new Request("http://127.0.0.1:5173", {
            headers: { cookie: auth.challengeName + "=" + enrolled.challenge },
          }),
          totp(enrolled.secret!).generate(),
        );
      const priorBody = {
        tipo: "Gasto",
        fecha: "2026-10-22",
        saldo: s.id,
        partida: "PAR900",
        importe: "10",
        capital: "8",
        intereses: "2",
      };
      const priorPlan = previewMovement(db, priorBody, null, false, now);
      writeMovement(
        db,
        { ...priorBody, fingerprint: priorPlan.fingerprint },
        key(),
        null,
        false,
        now,
      );
      const identity = inspectIdentity(db),
        before = snap(db);
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      db.close();
      chmodSync(path, 0o600);
      Object.assign(process.env, {
        NODE_ENV: origin === "production" ? "production" : "test",
        DATABASE_PATH: path,
        AUTH_KEY_PATH: keyPath,
        APP_ORIGIN: "https://example.test",
      });
      db = openDatabase(path);
      expect(inspectIdentity(db)).toEqual(identity);
      expect(readFileSync(keyPath)).toEqual(secret);
      for (const [table, rows] of before) {
        if (["schema_version", "counters"].includes(table as string)) continue;
        expect(
          db.query(`SELECT * FROM "${table}" ORDER BY rowid`).all(),
        ).toEqual(
          table === "partidas"
            ? (rows as any[]).map((r) => ({
                ...r,
                presupuesto: null,
                fuente: null,
                padre_partida: null,
              }))
            : table === "ciclos"
              ? (rows as any[]).map((r) => ({
                  ...r,
                  revision: 1,
                  actualizado: null,
                }))
              : rows,
        );
      }
      expect(
        new Auth(db, secret).session(
          new Request("http://127.0.0.1:5173", {
            headers: { cookie: auth.cookieName + "=" + verified.session },
          }),
        ).csrf,
      ).toBe(verified.csrf);
      expect(getSaldo(db, s.id).nombre).toBe(s.nombre);
      expect(db.query("SELECT contract FROM budget_contract").get()).toEqual({
        contract: "e2.2-presupuestos-v8",
      });
      db.close();
    }
  } finally {
    for (const k of Object.keys(process.env))
      if (!(k in oldEnv)) delete process.env[k];
    Object.assign(process.env, oldEnv);
    rmSync(dir, { recursive: true, force: true });
  }
});
test("08 B8 AC22: copia/restore8 recupera maestro/enlaces y rechaza8 ajeno", () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-budget-restore-")),
    path = join(dir, "demo.sqlite"),
    secret = randomBytes(32);
  let db = openDatabase(path);
  try {
    const { s, sub } = setup(db),
      b = createBudget(db, input("Restaurable", s.id, "Gasto real"), key()),
      p = part(db, sub.id, b.id);
    new Auth(db, secret);
    const identity = join(dir, "age-identity"),
      gen = Bun.spawnSync(["age-keygen", "-o", identity], { stderr: "pipe" });
    expect(gen.exitCode).toBe(0);
    const recipient = Bun.spawnSync(["age-keygen", "-y", identity], {
      stdout: "pipe",
      stderr: "pipe",
    })
      .stdout.toString()
      .trim();
    backup(db, secret, join(dir, "backup"), recipient);
    const target = join(dir, "restored");
    const restored = restore(join(dir, "backup"), target, identity);
    const copy = openDatabase(restored.database);
    expect(getBudget(copy, b.id).nombre).toBe("Restaurable");
    expect(getClassification(copy, "partidas", p.id).presupuesto).toBe(b.id);
    expect(copy.query("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(copy.query("PRAGMA integrity_check").get()).toEqual({
      integrity_check: "ok",
    });
    copy.close();
    db.exec("DROP TABLE budget_contract");
    expect(() =>
      backup(db, secret, join(dir, "foreign-backup"), recipient),
    ).toThrow("Contrato de esquema v20 desconocido o incompleto; no se modificará esta base.");
    db.close();
    const bytes = readFileSync(path);
    expect(() => openDatabase(path)).toThrow("Contrato de esquema v20 desconocido o incompleto; no se modificará esta base.");
    expect(readFileSync(path)).toEqual(bytes);
  } finally {
    try {
      db.close();
    } catch {}
    rmSync(dir, { recursive: true, force: true });
  }
});

test("08 B9 AC15/AC04: solo renombrar conserva un destino inactivo; cambiar fuente exige activo", () => {
  const db = openDatabase(":memory:");
  try {
    const { s } = setup(db),
      b = createBudget(
        db,
        input("Destino histórico", s.id, "Gasto real"),
        key(),
      );
    const closed = updateSaldo(db, s.id, {
      revision: getSaldo(db, s.id).revision,
      estado: "Inactiva",
    });
    expect(closed.estado).toBe("Inactiva");
    const renamed = updateBudget(db, b.id, {
      revision: b.revision,
      nombre: "Destino histórico renombrado",
    });
    expect(renamed).toMatchObject({
      nombre: "Destino histórico renombrado",
      fuente: "Gasto real",
      destino: s.id,
    });
    expect(renamed.saldoDestino?.estado).toBe("Inactiva");
    // Cambiar la fuente sobre el destino inactivo es una nueva relación.
    expect(() =>
      updateBudget(db, b.id, {
        revision: renamed.revision,
        fuente: "Aportación a saldo",
      }),
    ).toThrow("Selecciona un Saldo interno activo.");
    expect(() =>
      previewBudget(db, b.id, {
        revision: renamed.revision,
        fuente: "Aportación a saldo",
      }),
    ).toThrow("Selecciona un Saldo interno activo.");
    expect(getBudget(db, b.id)).toMatchObject({
      fuente: "Gasto real",
      destino: s.id,
      revision: renamed.revision,
    });
    expect(() =>
      createBudget(
        db,
        input("Nuevo sobre inactivo", s.id, "Gasto real"),
        key(),
      ),
    ).toThrow("Selecciona un Saldo interno activo.");
  } finally {
    db.close();
  }
});
