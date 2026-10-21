import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { openDatabase } from "./database";
import { openDatabase as openV2 } from "../test-support/database-v2";
import { createApp } from "./app";
import { Auth, provision, loadKey, totp } from "./auth";
import { backup, restore } from "./backup";
import { createSaldo, getSaldo } from "./saldos";
import { createClassification } from "./clasificacion";
import {
  civil,
  fundedMonth,
  dayBefore,
  financialReference,
  contextFrom,
  cycleContext,
  deriveCycles,
  listCycles,
  getCycle,
  createCycle,
} from "./ciclos";
const add = (
  db: Database,
  inicio: string,
  saldoInicialComida = "0",
  key = randomUUID(),
  contextRevision = cycleContext(db).revision,
) => createCycle(db, { inicio, saldoInicialComida, contextRevision }, key);
const row = (id: string, inicio: string) => ({
  id,
  inicio,
  mes_financiado: fundedMonth(inicio),
  saldo_comida: "0",
});
const snapshot = (db: Database) =>
  (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
  ).map(
    ({ name }) =>
      [name, db.query(`SELECT * FROM "${name}" ORDER BY rowid`).all()] as const,
  );

test("03 AC03–08/10/16: calendario civil, referencia máxima y actual distinto del último abierto", () => {
  expect(fundedMonth("2026-12-31")).toBe("2027-01-01");
  expect(fundedMonth("2026-10-25")).toBe("2026-11-01");
  expect(dayBefore("2028-03-01")).toBe("2028-02-29");
  expect(dayBefore("2027-03-01")).toBe("2027-02-28");
  for (const value of [
    null,
    "",
    "2026-02-31",
    "2027-02-29",
    "2026-1-01",
    "2026-01-01T00:00:00Z",
    "0000-01-01",
  ])
    expect(() => civil(value)).toThrow();
  expect(civil("0001-01-01")).toBe("0001-01-01");
  expect(() => fundedMonth("9999-12-01")).toThrow("técnico");
  const input = [row("2", "2028-03-01"), row("1", "2028-02-28")];
  const absent = financialReference([]);
  const cycles = deriveCycles(input, absent);
  expect(cycles[0].fin).toBe("2028-02-29");
  expect(cycles[1].fin).toBeNull();
  expect(cycles[1].corte).toBeNull();
  expect(contextFrom(input, absent).actual).toBeNull();
  const ref = (fecha: string | null) =>
    financialReference([
      { source: "Movimientos", state: "disponible", maxDate: fecha },
    ]);
  expect(contextFrom(input, ref("2028-02-27")).motivo).toBe("sin_ciclo_actual");
  expect(contextFrom(input, ref("2028-02-28")).actual?.id).toBe("1");
  expect(contextFrom(input, ref("2028-02-29")).actual?.id).toBe("1");
  expect(deriveCycles(input, ref("2028-02-29"))[1].estadoCorte).toBe(
    "no_aplicable",
  );
  expect(contextFrom(input, ref("2028-03-01")).actual?.id).toBe("2");
  const later = deriveCycles(input, ref("2028-08-31"))[1];
  expect(later.corte).toBe("2028-08-31");
  expect(later.fin).toBeNull();
  const max = financialReference([
    { source: "Movimientos", state: "disponible", maxDate: "2028-02-28" },
    { source: "Revisión Comida", state: "disponible", maxDate: "2028-03-04" },
    {
      source: "Operaciones de inversión",
      state: "disponible",
      maxDate: "2028-03-02",
    },
  ]);
  expect(max.fecha).toBe("2028-03-04");
  const empty = ref(null);
  expect(empty.fecha).toBeNull();
  expect(empty.coverage[0].state).toBe("disponible");
  expect(empty.coverage[1].state).toBe("pendiente");
  const failure = financialReference([
    { source: "Movimientos", state: "disponible", maxDate: "2028-03-04" },
    { source: "Revisión Comida", state: "error" },
  ]);
  expect(failure.estado).toBe("error");
  expect(failure.fecha).toBeNull();
  expect(deriveCycles(input, failure)[1].estadoCorte).toBe("error");
  expect(() =>
    financialReference([
      { source: "Movimientos", state: "disponible", maxDate: "bad" },
    ]),
  ).toThrow();
  expect(() =>
    financialReference([
      { source: "Movimientos", state: "pendiente" },
      { source: "Movimientos", state: "pendiente" },
    ]),
  ).toThrow("duplicado");
});

test("03 AC01/02/05/09/12–15: alta explícita, mes único y orden, sin reloj ni cálculos financieros", () => {
  const db = openDatabase(":memory:");
  try {
    expect(listCycles(db).ciclos).toEqual([]);
    expect(cycleContext(db).motivo).toBe("sin_ciclos");
    const first = add(db, "2026-10-01", "-12.34");
    expect(first.ciclo.saldoInicialComida).toBe("-12.34");
    expect(first.ciclo.fin).toBeNull();
    expect(first.contexto.referencia.fecha).toBeNull();
    expect(
      first.contexto.referencia.coverage.every((s) => s.state === "pendiente"),
    ).toBe(true);
    expect(() => add(db, "2026-10-25")).toThrow("Ciclo duplicado");
    expect(() => add(db, "2026-10-01")).toThrow("Ciclo duplicado");
    expect(() => add(db, "2026-09-25")).toThrow("posterior");
    const second = add(db, "2026-11-25", "0");
    expect(second.ciclo.saldoInicialComida).toBe("0.00");
    expect(getCycle(db, first.ciclo.id).ciclo.fin).toBe("2026-11-24");
    expect(add(db, "2040-01-01").ciclo.inicio).toBe("2040-01-01");
    for (const saldo of [
      undefined,
      null,
      "",
      "1.001",
      "1e2",
      1,
      "92233720368547758.08",
    ])
      expect(() =>
        createCycle(
          db,
          {
            inicio: "2041-01-01",
            saldoInicialComida: saldo,
            contextRevision: cycleContext(db).revision,
          },
          randomUUID(),
        ),
      ).toThrow();
    expect(() =>
      createCycle(
        db,
        {
          inicio: "2041-01-01",
          saldoInicialComida: "0",
          mesFinanciado: "2041-03-01",
          contextRevision: cycleContext(db).revision,
        },
        randomUUID(),
      ),
    ).toThrow("no editable");
    expect(() =>
      add(db, "2041-01-01", "0", randomUUID(), "f".repeat(64)),
    ).toThrow("ha cambiado");
    const context = cycleContext(db).revision,
      key = randomUUID();
    const created = add(db, "2041-01-01", "0", key, context);
    expect(add(db, "2041-01-01", "0", key, context)).toEqual(created);
    expect(() => add(db, "2041-01-01", "2", key, context)).toThrow(
      "otros datos",
    );
    expect(() =>
      db.run("UPDATE ciclos SET inicio='2042-01-01' WHERE id=?", [
        first.ciclo.id,
      ]),
    ).toThrow();
    expect(() =>
      db.run("DELETE FROM ciclos WHERE id=?", [first.ciclo.id]),
    ).toThrow();
    const before = snapshot(db);
    db.exec(
      "CREATE TRIGGER fail_cycle_audit BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'test rollback'); END",
    );
    expect(() => add(db, "2042-01-01")).toThrow("rollback");
    db.exec("DROP TRIGGER fail_cycle_audit");
    expect(snapshot(db)).toEqual(before);
  } finally {
    db.close();
  }
});

test("03 AC17: Fin deriva del maestro completo antes de filtrar o paginar", () => {
  const db = openDatabase(":memory:");
  try {
    for (let i = 0; i < 104; i++)
      add(
        db,
        `${2020 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-15`,
      );
    const first = listCycles(db),
      page2 = listCycles(db, new URLSearchParams("page=2"));
    expect(first.ciclos).toHaveLength(100);
    expect(page2.ciclos).toHaveLength(4);
    expect(page2.ciclos[0].fin).toBe("2020-05-14");
    const filter = listCycles(db, new URLSearchParams("q=2020-01-15"));
    expect(filter.ciclos).toHaveLength(1);
    expect(filter.ciclos[0].fin).toBe("2020-02-14");
    expect(listCycles(db, new URLSearchParams("estado=Abierto")).total).toBe(1);
    expect(() => listCycles(db, new URLSearchParams("page=NaN"))).toThrow();
    expect(() => getCycle(db, "9999")).toThrow("no encontrado");
  } finally {
    db.close();
  }
});

test("03 AC04/16: cambios de huso horario y DST no desplazan límites civiles", async () => {
  const source = `import {fundedMonth,dayBefore} from ${JSON.stringify(resolve("apps/api/src/ciclos.ts"))}; console.log(JSON.stringify([fundedMonth('2026-12-31'),dayBefore('2028-03-01'),dayBefore('2026-03-30')]));`;
  const outputs = [];
  for (const TZ of [
    "UTC",
    "Europe/Madrid",
    "America/Los_Angeles",
    "Pacific/Kiritimati",
  ]) {
    const child = Bun.spawn([process.execPath, "-e", source], {
      env: { ...process.env, TZ },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await child.exited).toBe(0);
    outputs.push(await new Response(child.stdout).text());
  }
  expect(new Set(outputs).size).toBe(1);
});

test("03 AC20/21: actualización E1.2 genuina, acceso previo intacto y backups v2/v3", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-cycles-upgrade-")),
    path = join(dir, "demo.sqlite");
  let db = openV2(path);
  try {
    const key = loadKey(db, join(dir, "auth.key")),
      password = "Contraseña de prueba " + randomUUID(),
      auth = new Auth(db, key),
      enrollment = await auth.enroll(provision(db), password);
    const verified = auth.verify(
      new Request("http://127.0.0.1:5173", {
        headers: { cookie: auth.challengeName + "=" + enrollment.challenge },
      }),
      totp(enrollment.secret!).generate(),
    );
    const saldo = createSaldo(
      db,
      {
        nombre: "Saldo E1.2 previo",
        tipo: "Efectivo",
        control: "Movimientos",
        saldoApertura: "-10.01",
        objetivo: "0",
      },
      randomUUID(),
    );
    db.run("UPDATE saldos SET liquidez=NULL WHERE id=?", [saldo.id]);
    const cat = createClassification(
      db,
      "categorias",
      {
        nombre: "Categoría E1.2 previa",
        anual: "No aplica",
        mensual: "Gasto",
        referencia: false,
      },
      randomUUID(),
    );
    const sub = createClassification(
      db,
      "subcategorias",
      { nombre: "Subcategoría E1.2 previa", padre: cat.id },
      randomUUID(),
    );
    createClassification(
      db,
      "partidas",
      { nombre: "Partida E1.2 previa", padre: sub.id },
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
    backup(db, key, join(dir, "v2"), pub);
    const before = snapshot(db),
      priorSaldo = getSaldo(db, saldo.id);
    db.close();
    db = openDatabase(path);
    for (const [name, values] of before)
      if (name !== "schema_version" && name !== "counters")
        expect(
          db.query(`SELECT * FROM "${name}" ORDER BY rowid`).all(),
        ).toEqual(values);
    for (const old of before.find(([name]) => name === "counters")![1] as {
      name: string;
      next: number;
    }[])
      expect(
        db.query("SELECT * FROM counters WHERE name=?").get(old.name),
      ).toEqual(old);
    expect(db.query("SELECT version FROM schema_version").get()).toEqual({
      version: 3,
    });
    expect(db.query("SELECT * FROM ciclos").all()).toEqual([]);
    expect(getSaldo(db, saldo.id)).toEqual(priorSaldo);
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
        totp(enrollment.secret!).generate({ timestamp: Date.now() + 30000 }),
      ).session,
    ).toBeString();
    const cycle = add(db, "2028-02-28", "-12.34");
    add(db, "2028-03-01");
    backup(db, key, join(dir, "v3"), pub);
    for (const version of [2, 3]) {
      const restored = restore(
        join(dir, "v" + version),
        join(dir, "restored" + version),
        identity,
      );
      const copy = openDatabase(restored.database);
      try {
        expect(getSaldo(copy, saldo.id)).toEqual(priorSaldo);
        expect(copy.query("SELECT * FROM sessions").all()).toEqual([]);
        expect(listCycles(copy).total).toBe(version === 3 ? 2 : 0);
        if (version === 3)
          expect(getCycle(copy, cycle.ciclo.id).ciclo.fin).toBe("2028-02-29");
      } finally {
        copy.close();
      }
    }
    const current = snapshot(db);
    db.close();
    db = openDatabase(path);
    expect(snapshot(db)).toEqual(current);
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("03 AC20: fallo de extensión v2 revierte esquema/datos; versión desconocida no muta", () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-cycle-failure-")),
    path = join(dir, "demo.sqlite");
  try {
    let db = openV2(path);
    db.exec("CREATE TABLE cycle_attempts(incompatible TEXT)");
    const before = snapshot(db);
    db.close();
    expect(() => openDatabase(path)).toThrow();
    db = new Database(path);
    expect(snapshot(db)).toEqual(before);
    expect(
      db.query("SELECT name FROM sqlite_master WHERE name='ciclos'").get(),
    ).toBeNull();
    db.exec("DROP TABLE cycle_attempts; UPDATE schema_version SET version=999");
    const unknown = snapshot(db);
    db.close();
    expect(() => openDatabase(path)).toThrow("compatible");
    db = new Database(path);
    expect(snapshot(db)).toEqual(unknown);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("03 AC15/20: dos procesos abren v2 y compiten por un mismo mes financiado", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-cycle-concurrent-")),
    path = join(dir, "demo.sqlite");
  try {
    openV2(path).close();
    const script = `import{openDatabase}from ${JSON.stringify(resolve("apps/api/src/database.ts"))};import{createCycle,cycleContext}from ${JSON.stringify(resolve("apps/api/src/ciclos.ts"))};const db=openDatabase(process.argv[1]);try{createCycle(db,{inicio:process.argv[2],saldoInicialComida:'0',contextRevision:cycleContext(db).revision},crypto.randomUUID());process.stdout.write('created');}catch(e){if(!['DUPLICATE_CYCLE','CONTEXT_CHANGED','CHRONOLOGY'].includes(e.code))throw e;process.stdout.write('conflict');}finally{db.close();}`;
    const children = ["2026-10-01", "2026-10-25"].map((start) =>
      Bun.spawn([process.execPath, "-e", script, path, start], {
        env: { ...process.env, NODE_ENV: "test" },
        stdout: "pipe",
        stderr: "pipe",
      }),
    );
    const results = [];
    for (const child of children) {
      expect(await child.exited).toBe(0);
      expect(await new Response(child.stderr).text()).toBe("");
      results.push(await new Response(child.stdout).text());
    }
    expect(results.sort()).toEqual(["conflict", "created"]);
    const db = openDatabase(path);
    try {
      expect(listCycles(db).total).toBe(1);
      expect(db.query("SELECT COUNT(*) n FROM saldos").get()).toEqual({ n: 6 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("03 AC01/02/19/22: rutas Effect reales, MFA/CSRF y solo altas/consultas", async () => {
  const db = openDatabase(":memory:"),
    key = randomBytes(32),
    origin = "http://127.0.0.1:5173",
    handler = HttpApp.toWebHandler(createApp(db, { key }));
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
    for (const path of ["/api/ciclos", "/api/ciclos/contexto", "/api/ciclos/1"])
      expect((await request(path)).status).toBe(401);
    const auth = new Auth(db, key),
      enroll = await auth.enroll(
        provision(db),
        "Contraseña HTTP ficticia " + randomUUID(),
      ),
      verified = auth.verify(
        new Request(origin, {
          headers: { cookie: auth.challengeName + "=" + enroll.challenge },
        }),
        totp(enroll.secret!).generate(),
      );
    const headers = {
      cookie: auth.cookieName + "=" + verified.session,
      "x-csrf-token": verified.csrf,
      "idempotency-key": randomUUID(),
    };
    const context = await (
      await request("/api/ciclos/contexto", "GET", undefined, headers)
    ).json();
    const body = {
      inicio: "2026-10-25",
      saldoInicialComida: "0",
      contextRevision: context.revision,
    };
    expect(
      (
        await request("/api/ciclos", "POST", body, {
          ...headers,
          "x-csrf-token": "",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request("/api/ciclos", "POST", body, {
          ...headers,
          origin: "https://invalid.example",
        })
      ).status,
    ).toBe(403);
    const created = await request("/api/ciclos", "POST", body, headers);
    expect(created.status).toBe(201);
    const result = await created.json();
    expect(result.ciclo.mesFinanciado).toBe("2026-11-01");
    for (const method of ["PATCH", "DELETE"])
      expect(
        (await request("/api/ciclos/" + result.ciclo.id, method, {}, headers))
          .status,
      ).toBe(404);
    expect(
      (await request("/api/ciclos/999", "GET", undefined, headers)).status,
    ).toBe(404);
    expect(
      (
        await request(
          "/api/ciclos",
          "POST",
          { ...body, fin: "2026-12-01" },
          headers,
        )
      ).status,
    ).toBe(422);
  } finally {
    db.close();
  }
});
