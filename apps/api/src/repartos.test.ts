import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createCycle, cycleContext } from "./ciclos";
import { createBudget } from "./presupuestos";
import { generarReparto } from "./repartos";

const now = Date.parse("2026-10-25T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const stamp = "2026-01-01T00:00:00.000Z";

function makeCycle(db: Database, inicio: string) {
  return createCycle(
    db,
    {
      inicio,
      saldoInicialComida: "0",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  ).ciclo.id;
}

function makeBudget(db: Database, over: Record<string, unknown> = {}) {
  return createBudget(
    db,
    {
      nombre: "Presupuesto ficticio " + randomUUID(),
      fuente: "Aportación a saldo",
      destino: "S002",
      ...over,
    },
    randomUUID(),
    now,
  ).id;
}

function plan(db: Database, ciclo: string, lines: [string, string][]) {
  db.run("INSERT INTO cycle_plans VALUES(?,1)", [ciclo]);
  for (const [presupuesto, delMes] of lines)
    db.run("INSERT INTO cycle_plan_lines VALUES(?,?,?,?,?)", [
      ciclo,
      presupuesto,
      null,
      null,
      delMes,
    ]);
}

function setup() {
  const db = openDatabase(":memory:");
  const c1 = makeCycle(db, "2026-01-01");
  const c2 = makeCycle(db, "2026-02-01");
  const c3 = makeCycle(db, "2026-03-01");
  const c4 = makeCycle(db, "2026-12-01");
  const preA = makeBudget(db, { fuente: "Aportación a saldo", destino: "S002" });
  const preG = makeBudget(db, { fuente: "Gasto real", destino: "S003" });
  const preN = makeBudget(db, { fuente: "No aplica", destino: null });
  plan(db, c1, [
    [preA, "10000"],
    [preG, "20000"],
    [preN, "5000"],
  ]);
  plan(db, c4, [[preA, "5000"]]);
  return { db, c1, c2, c3, c4, preA, preG, preN };
}

function http(db: Database) {
  const key = randomBytes(32),
    password = "Ficticia " + randomUUID(),
    handler = HttpApp.toWebHandler(createApp(db, { key, now: () => now }));
  let cookie = "",
    csrf = "";
  function absorb(response: Response) {
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie
        .split("; ")
        .filter((value) => value && !value.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
  }
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = await handler(
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
    absorb(response);
    const data = await response.json();
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data, headers: response.headers };
  }
  async function auth() {
    const bootstrap = provision(db, now);
    const enrolled = await request("/api/auth/enroll", "POST", {
      token: bootstrap,
      password,
    });
    await request("/api/auth/mfa", "POST", {
      code: totp(enrolled.data.secret).generate({ timestamp: now }),
    });
  }
  return { request, auth };
}

function openReparto(
  request: ReturnType<typeof http>["request"],
  ciclo: string,
  body: Record<string, unknown> = {},
  key = randomUUID(),
) {
  return request(`/api/ciclos/${ciclo}/reparto`, "POST", body, {
    "idempotency-key": key,
  });
}

function addLine(
  request: ReturnType<typeof http>["request"],
  reparto: number,
  body: Record<string, unknown>,
  key = randomUUID(),
) {
  return request(`/api/repartos/${reparto}/lineas`, "POST", body, {
    "idempotency-key": key,
  });
}

function generate(
  request: ReturnType<typeof http>["request"],
  reparto: number,
  revision: number,
  lineaIds?: number[],
  key = randomUUID(),
) {
  return request(
    `/api/repartos/${reparto}/generar`,
    "POST",
    lineaIds ? { revision, lineaIds } : { revision },
    { "idempotency-key": key },
  );
}

function presetLine(
  request: ReturnType<typeof http>["request"],
  reparto: number,
  presupuesto: string,
  importe: string,
  over: Record<string, unknown> = {},
) {
  return addLine(request, reparto, {
    clase: "Presupuesto",
    presupuesto,
    origen: "S001",
    importe,
    fechaPrevista: "2026-01-05",
    concepto: "Aportación ficticia",
    ...over,
  });
}

function financialSnapshot(db: Database) {
  const tables = [
    "saldos",
    "presupuestos",
    "movimientos",
    "movement_audit",
    "counters",
    "cycle_plans",
    "cycle_plan_lines",
    "cycle_plan_audit",
    "fotos_cierre",
    "cierres",
    "fotos_periodo",
    "foto_periodo_componentes",
  ];
  return {
    ...Object.fromEntries(
      tables.map((table) => [
        table,
        db.query(`SELECT * FROM "${table}" ORDER BY rowid`).all(),
      ]),
    ),
    audit: db
      .query(
        "SELECT * FROM audit WHERE entidad NOT LIKE 'transferencia-pendiente:%' AND entidad NOT LIKE 'reparto-linea:%' ORDER BY rowid",
      )
      .all(),
  };
}

function closeWindow(db: Database, ciclo: string, inicio: string, fin: string) {
  const fingerprint = "a".repeat(64);
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(
        ciclo,version,inicio,fin,saldo_inicial,actor,creado_utc,motivo,
        fingerprint,estado
      ) VALUES(?,1,?,?,0,'usuario-unico',?,NULL,?,'Cerrado')`,
      [ciclo, inicio, fin, stamp, fingerprint],
    );
    db.run(
      `INSERT INTO fotos_cierre(
        ciclo,version,creado_utc,actor,motivo,fingerprint,app_version,
        schema_version,ventana_inicio,ventana_fin,saldo_inicial,
        estado_temporal,estado_hechos,estado_plan,hechos,plan,clasificacion,
        inversion,auxiliares,cobertura,backup,no_disponible
      ) VALUES(?,1,?,'usuario-unico',NULL,?,'test',28,?,?,0,
        'Cerrado','Sin hechos','SinPlan','{}','{}','{}','{}','{}','{}','{}','{}')`,
      [ciclo, stamp, fingerprint, inicio, fin],
    );
  }).immediate();
}

async function confirmPending(
  request: ReturnType<typeof http>["request"],
  pending: { id: number; revision: number },
  fechaReal = "2026-01-10",
) {
  const impact = await request(
    `/api/transferencias-pendientes/${pending.id}/impacto`,
    "POST",
    { fechaReal },
  );
  expect(impact.status).toBe(200);
  const confirmed = await request(
    `/api/transferencias-pendientes/${pending.id}/confirmar`,
    "POST",
    {
      revision: pending.revision,
      fechaReal,
      fingerprint: impact.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(confirmed.status).toBe(200);
  return confirmed.data.item;
}

async function cancelPending(
  request: ReturnType<typeof http>["request"],
  pending: { id: number; revision: number },
) {
  return request(
    `/api/transferencias-pendientes/${pending.id}/cancelar`,
    "POST",
    { revision: pending.revision, motivo: "Cancelación ficticia" },
    { "idempotency-key": randomUUID() },
  );
}

/* ------------------------------------------------------------------ */

test("R-01 crear/abrir: un reparto por Ciclo, reabrir devuelve el mismo", async () => {
  const { db, c1, preA } = setup();
  const api = http(db);
  await api.auth();
  const created = await openReparto(api.request, c1, { origenComun: "S001" });
  expect(created.status).toBe(201);
  expect(created.data.creado).toBe(true);
  expect(created.data.reparto).toMatchObject({
    ciclo: c1,
    estado: "Borrador",
    revision: 1,
    origenComun: { id: "S001", estado: "Activa" },
    lineas: [],
  });
  expect(created.headers.get("location")).toBe(
    `/api/repartos/${created.data.reparto.id}`,
  );
  const reopened = await openReparto(api.request, c1);
  expect(reopened.status).toBe(200);
  expect(reopened.data.creado).toBe(false);
  expect(reopened.data.reparto.id).toBe(created.data.reparto.id);
  expect(
    (db.query("SELECT count(*) n FROM repartos WHERE ciclo=?").get(c1) as {
      n: number;
    }).n,
  ).toBe(1);
  const read = await api.request(`/api/ciclos/${c1}/reparto`);
  expect(read.status).toBe(200);
  expect(read.data.reparto.id).toBe(created.data.reparto.id);
  expect((await api.request("/api/ciclos/999/reparto")).status).toBe(404);
  // Same idempotency key + payload replays the stored response.
  const key = randomUUID();
  const first = await openReparto(api.request, c1, {}, key);
  const retry = await openReparto(api.request, c1, {}, key);
  expect(first.status).toBe(200);
  expect(retry.status).toBe(200);
  expect(retry.data.reparto.id).toBe(first.data.reparto.id);
  // The common origin is the default for a new line that omits its origin.
  const line = await addLine(api.request, retry.data.reparto.id, {
    clase: "Presupuesto",
    presupuesto: preA,
    importe: "10.00",
    fechaPrevista: "2026-01-05",
  });
  expect(line.status).toBe(201);
  expect(line.data.item.origen.id).toBe("S001");
});

test("R-02 propuesta reutiliza E2.3 sin recalcular ni prorratear", async () => {
  const { db, c1, c4, preA, preG, preN } = setup();
  const api = http(db);
  await api.auth();
  const before = financialSnapshot(db);
  const response = await api.request(`/api/ciclos/${c1}/reparto/propuesta`);
  expect(response.status).toBe(200);
  expect(response.data.sinPlan).toBe(false);
  expect(response.data.reparto).toBeNull();
  expect(response.data.contextRevision).toMatch(/^[a-f0-9]{64}$/);
  const byBudget = Object.fromEntries(
    response.data.items.map((item: any) => [item.presupuesto.id, item]),
  );
  expect(byBudget[preA]).toMatchObject({
    delMes: "100.00",
    ejecutado: "0.00",
    pendiente: "100.00",
    estado: "Pendiente",
    importeSugerido: "100.00",
    propuestaAutomatica: true,
    elegible: true,
    efectoAcumulado: "0.00",
    restante: "100.00",
  });
  expect(byBudget[preG]).toMatchObject({
    importeSugerido: null,
    propuestaAutomatica: false,
    elegible: false,
  });
  expect(byBudget[preG].presupuesto.fuente).toBe("Gasto real");
  expect(byBudget[preG].motivos).toContain("MANTENER_EN_ORIGEN");
  expect(byBudget[preN].presupuesto.fuente).toBe("No aplica");
  expect(byBudget[preN].motivos).toContain("NO_APLICA");
  expect(byBudget[preN].pendiente).toBeNull();
  expect(byBudget[preN].importeSugerido).toBeNull();
  expect(byBudget[preN].estado).toBeNull();

  // A future Cycle never started keeps the monthly amount but no suggestion.
  const future = await api.request(`/api/ciclos/${c4}/reparto/propuesta`);
  expect(future.status).toBe(200);
  expect(future.data.periodo.motivo).toBe("Ciclo no iniciado");
  const futureA = future.data.items.find(
    (item: any) => item.presupuesto.id === preA,
  );
  expect(futureA.delMes).toBe("50.00");
  expect(futureA.importeSugerido).toBeNull();
  expect(futureA.ejecutado).toBeNull();
  expect(financialSnapshot(db)).toEqual(before);
  expect((await api.request("/api/ciclos/999/reparto/propuesta")).status).toBe(
    404,
  );
});

test("R-03 líneas Presupuesto y Adicional, parciales y validaciones", async () => {
  const { db, c1, preA, preG } = setup();
  const api = http(db);
  await api.auth();
  const opened = await openReparto(api.request, c1);
  const reparto = opened.data.reparto.id;

  const first = await presetLine(api.request, reparto, preA, "30.00");
  expect(first.status).toBe(201);
  expect(first.data.item).toMatchObject({
    clase: "Presupuesto",
    presupuesto: { id: preA, destino: "S002" },
    origen: { id: "S001" },
    destino: { id: "S002" },
    importe: "30.00",
    incluida: true,
    pendiente: null,
    puedeGenerarse: true,
  });
  const second = await presetLine(api.request, reparto, preA, "30.00", {
    concepto: "Segunda parcial",
  });
  expect(second.status).toBe(201);

  const proposal = await api.request(`/api/ciclos/${c1}/reparto/propuesta`);
  const item = proposal.data.items.find(
    (entry: any) => entry.presupuesto.id === preA,
  );
  expect(item.lineasExistentes).toHaveLength(2);
  expect(item.efectoAcumulado).toBe("60.00");
  expect(item.restante).toBe("40.00");
  expect(item.excedePendiente).toBe(false);

  // Destination is derived from the Presupuesto and cannot be sent.
  const changedDestination = await presetLine(api.request, reparto, preA, "10.00", {
    destino: "S003",
  });
  expect(changedDestination.status).toBe(422);
  expect(changedDestination.data.code).toBe("PRESUPUESTO_DESTINO");
  // Only Aportación a saldo produces a Presupuesto line.
  const wrongSource = await presetLine(api.request, reparto, preG, "10.00");
  expect(wrongSource.status).toBe(422);
  expect(wrongSource.data.code).toBe("FUENTE_NO_APORTACION");
  // A manual Additional line has its own origin/destination and no Reference.
  const additional = await addLine(api.request, reparto, {
    clase: "Adicional",
    origen: "S003",
    destino: "S005",
    importe: "12.34",
    fechaPrevista: "2026-01-08",
    concepto: "Adicional ficticia",
    nota: "Sin Referencia",
  });
  expect(additional.status).toBe(201);
  expect(additional.data.item).toMatchObject({
    clase: "Adicional",
    presupuesto: null,
    origen: { id: "S003" },
    destino: { id: "S005" },
    importe: "12.34",
  });
  const withReference = await addLine(api.request, reparto, {
    clase: "Adicional",
    origen: "S003",
    destino: "S005",
    importe: "1.00",
    fechaPrevista: "2026-01-08",
    referencia: "REF-1",
  });
  expect(withReference.status).toBe(422);
  expect(withReference.data.code).toBe("VALIDATION");
  const sameEnds = await addLine(api.request, reparto, {
    clase: "Adicional",
    origen: "S003",
    destino: "S003",
    importe: "1.00",
    fechaPrevista: "2026-01-08",
  });
  expect(sameEnds.status).toBe(422);
  expect(sameEnds.data.code).toBe("VALIDATION");
  const zero = await presetLine(api.request, reparto, preA, "0.00");
  expect(zero.status).toBe(422);
  expect(zero.data.code).toBe("VALIDATION");
  const exterior = await addLine(api.request, reparto, {
    clase: "Adicional",
    origen: "S000",
    destino: "S005",
    importe: "1.00",
    fechaPrevista: "2026-01-08",
  });
  expect(exterior.status).toBe(422);
  expect(exterior.data.code).toBe("SALDO_NO_ELEGIBLE");

  // Edit/exclude/reinclude only in Borrador and without a pending.
  const line = first.data.item;
  const excluded = await api.request(
    `/api/repartos/${reparto}/lineas/${line.id}`,
    "PATCH",
    { revision: line.revision, incluida: 0, motivoExclusion: "No se financia" },
    { "idempotency-key": randomUUID() },
  );
  expect(excluded.status).toBe(200);
  expect(excluded.data.item).toMatchObject({
    incluida: false,
    motivoExclusion: "No se financia",
    revision: 2,
  });
  const missingMotive = await api.request(
    `/api/repartos/${reparto}/lineas/${second.data.item.id}`,
    "PATCH",
    { revision: 1, incluida: 0 },
    { "idempotency-key": randomUUID() },
  );
  expect(missingMotive.status).toBe(422);
  expect(missingMotive.data.code).toBe("VALIDATION");
  const includedAgain = await api.request(
    `/api/repartos/${reparto}/lineas/${line.id}`,
    "PATCH",
    { revision: 2, incluida: 1 },
    { "idempotency-key": randomUUID() },
  );
  expect(includedAgain.status).toBe(200);
  expect(includedAgain.data.item.incluida).toBe(true);
  expect(includedAgain.data.item.motivoExclusion).toBeNull();
});

test("R-04 generación atómica: un fallo revierte todo y conserva el Borrador", async () => {
  const { db, c1, c2, preA } = setup();
  const preB = makeBudget(db, {
    nombre: "Presupuesto B ficticio",
    fuente: "Aportación a saldo",
    destino: "S005",
  });
  const api = http(db);
  await api.auth();
  const reparto = (await openReparto(api.request, c1)).data.reparto.id;
  const valid1 = (await presetLine(api.request, reparto, preA, "30.00")).data.item;
  const valid2 = (await presetLine(api.request, reparto, preA, "30.00")).data.item;
  const aurora = (await presetLine(api.request, reparto, preB, "10.00")).data.item;
  db.run(
    "UPDATE presupuestos SET estado='Inactivo',revision=revision+1,actualizado=? WHERE id=?",
    [stamp, preB],
  );
  const before = financialSnapshot(db);
  const failed = await generate(api.request, reparto, 1);
  expect(failed.status).toBe(409);
  expect(failed.data.code).toBe("GENERACION_INCOMPLETA");
  expect(failed.data.creados).toEqual([]);
  expect(failed.data.errores).toHaveLength(1);
  expect(failed.data.errores[0]).toMatchObject({
    lineaId: aurora.id,
    code: "PRESUPUESTO_INACTIVO",
  });
  expect(
    (db.query("SELECT count(*) n FROM transferencia_pendiente").get() as {
      n: number;
    }).n,
  ).toBe(0);
  expect(
    db.query("SELECT estado,revision FROM repartos WHERE id=?").get(reparto),
  ).toEqual({ estado: "Borrador", revision: 1 });
  expect(financialSnapshot(db)).toEqual(before);
  expect(valid1.id).toBeNumber();
  expect(valid2.id).toBeNumber();

  db.run(
    "UPDATE presupuestos SET estado='Activo',revision=revision+1,actualizado=? WHERE id=?",
    [stamp, preB],
  );
  const key = randomUUID();
  const generated = await generate(api.request, reparto, 1, undefined, key);
  expect(generated.status).toBe(200);
  expect(generated.data.creados).toHaveLength(3);
  expect(generated.data.reparto).toMatchObject({
    estado: "Generado",
    revision: 2,
    puedeCompletar: false,
  });
  expect(
    (db.query("SELECT count(*) n FROM transferencia_pendiente").get() as {
      n: number;
    }).n,
  ).toBe(3);
  // Replaying the same key + payload returns the same result without new rows.
  const replay = await generate(api.request, reparto, 1, undefined, key);
  expect(replay.status).toBe(200);
  expect(replay.data.creados.map((item: any) => item.id)).toEqual(
    generated.data.creados.map((item: any) => item.id),
  );
  expect(
    (db.query("SELECT count(*) n FROM transferencia_pendiente").get() as {
      n: number;
    }).n,
  ).toBe(3);
  const otherPayload = await generate(api.request, reparto, 2, undefined, key);
  expect(otherPayload.status).toBe(409);
  expect(otherPayload.data.code).toBe("IDEMPOTENCY_CONFLICT");
  // Calling again without new lines is a no-op: revision does not change.
  const noop = await generate(api.request, reparto, 2);
  expect(noop.status).toBe(200);
  expect(noop.data.creados).toEqual([]);
  expect(noop.data.existentes).toHaveLength(3);
  expect(
    db.query("SELECT revision FROM repartos WHERE id=?").get(reparto),
  ).toEqual({ revision: 2 });
  // A stale revision is rejected before any write.
  const stale = await generate(api.request, reparto, 1);
  expect(stale.status).toBe(409);
  expect(stale.data.code).toBe("REVISION_CONFLICT");
  expect(c2).toBeString();
});

test("R-04b generación concurrente multiproceso: un único ganador", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-reparto-concurrency-"));
  const path = join(dir, "test.sqlite");
  try {
    const seed = openDatabase(path);
    const ciclo = makeCycle(seed, "2026-01-01");
    makeCycle(seed, "2026-02-01");
    const presupuesto = makeBudget(seed, { destino: "S002" });
    plan(seed, ciclo, [[presupuesto, "10000"]]);
    seed.run(
      "INSERT INTO repartos(ciclo,estado,origen_comun,revision,creado,actualizado) VALUES(?, 'Borrador','S001',1,?,?)",
      [ciclo, stamp, stamp],
    );
    const reparto = (
      seed.query("SELECT last_insert_rowid() id").get() as { id: number }
    ).id;
    seed.run(
      "INSERT INTO reparto_lineas(reparto,clase,presupuesto,origen,destino,importe,fecha_prevista,concepto,nota,incluida,motivo_exclusion,revision,creado,actualizado) VALUES(?, 'Presupuesto',?,'S001','S002',6000,'2026-01-05','Ficticia','',1,NULL,1,?,?)",
      [reparto, presupuesto, stamp, stamp],
    );
    seed.close();

    const suffix = randomUUID();
    const ready = [0, 1].map((index) => `${path}.ready-${suffix}-${index}`);
    const start = `${path}.start-${suffix}`;
    const databaseModule = resolve(import.meta.dir, "database.ts");
    const serviceModule = resolve(import.meta.dir, "repartos.ts");
    const script = `
import{existsSync,writeFileSync}from"node:fs";
import{openDatabase}from${JSON.stringify(databaseModule)};
import{generarReparto}from${JSON.stringify(serviceModule)};
(async()=>{
  const [path,ready,start,id,key]=process.argv.slice(1);
  const db=openDatabase(path);
  writeFileSync(ready,"ready");
  while(!existsSync(start)) await Bun.sleep(2);
  try {
    const result=generarReparto(db,Number(id),{revision:1},key,Date.parse("2026-10-25T12:00:00Z"));
    console.log(JSON.stringify({ok:true,creados:result.creados.length}));
  } catch(e) {
    console.log(JSON.stringify({ok:false,status:e?.status,code:e?.code}));
  } finally {
    db.close();
  }
})().catch(e=>{console.error(e);process.exit(1)});
`;
    const children = ready.map((readyPath) =>
      Bun.spawn(
        [
          process.execPath,
          "-e",
          script,
          path,
          readyPath,
          start,
          String(reparto),
          randomUUID(),
        ],
        {
          env: { ...process.env, NODE_ENV: "test" },
          stdout: "pipe",
          stderr: "pipe",
        },
      ),
    );
    const deadline = Date.now() + 10000;
    while (!ready.every((file) => existsSync(file)) && Date.now() < deadline)
      await Bun.sleep(5);
    expect(ready.every((file) => existsSync(file))).toBe(true);
    writeFileSync(start, "go");
    const outputs = await Promise.all(
      children.map(async (child) => {
        const code = await child.exited;
        return {
          code,
          out: await new Response(child.stdout).text(),
          err: await new Response(child.stderr).text(),
        };
      }),
    );
    const results = outputs.map(({ code, out, err }) => {
      const line = out.trim().split("\n").filter(Boolean).at(-1);
      if (!line) throw new Error(`Hijo sin salida (${code}): ${err}`);
      return JSON.parse(line) as {
        ok: boolean;
        status?: number;
        code?: string;
        creados?: number;
      };
    });
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const winner = results.find((result) => result.ok)!;
    expect(winner.creados).toBe(1);
    const loser = results.find((result) => !result.ok)!;
    expect(loser.status).toBe(409);
    expect(loser.code).toBe("REVISION_CONFLICT");

    const check = openDatabase(path);
    expect(
      (check.query("SELECT count(*) n FROM transferencia_pendiente").get() as {
        n: number;
      }).n,
    ).toBe(1);
    expect(
      check.query("SELECT estado,revision FROM repartos WHERE id=?").get(reparto),
    ).toEqual({ estado: "Generado", revision: 2 });
    expect(
      (
        check
          .query(
            "SELECT count(*) n FROM reparto_audit WHERE reparto=? AND accion='generacion'",
          )
          .get(reparto) as { n: number }
      ).n,
    ).toBe(1);
    check.close();
    for (const child of children) child.kill();
    for (const file of [...ready, start]) rmSync(file, { force: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("R-05 seguimiento y completado estricto", async () => {
  const { db, c1, c2, preA } = setup();
  const api = http(db);
  await api.auth();
  const reparto = (await openReparto(api.request, c1)).data.reparto.id;
  const first = (await presetLine(api.request, reparto, preA, "30.00")).data.item;
  const second = (await presetLine(api.request, reparto, preA, "30.00")).data.item;
  const excluded = (await presetLine(api.request, reparto, preA, "10.00")).data.item;
  const exclusion = await api.request(
    `/api/repartos/${reparto}/lineas/${excluded.id}`,
    "PATCH",
    {
      revision: excluded.revision,
      incluida: 0,
      motivoExclusion: "No se financia este mes",
    },
    { "idempotency-key": randomUUID() },
  );
  expect(exclusion.status).toBe(200);
  const generated = await generate(api.request, reparto, 1);
  expect(generated.status).toBe(200);
  expect(generated.data.creados).toHaveLength(2);

  const open = await api.request(`/api/repartos/${reparto}/seguimiento`);
  expect(open.status).toBe(200);
  expect(open.data).toMatchObject({
    puedeCompletar: false,
    resumen: {
      lineas: 3,
      incluidas: 2,
      excluidas: 1,
      conPendiente: 2,
      pendientesDeRealizar: 2,
    },
  });
  expect(open.data.motivosNoCompletar).toEqual([
    { code: "PENDIENTE_NO_TERMINAL", pendientes: expect.any(Array) },
  ]);
  expect(open.data.avisos.d6).toMatchObject({
    pendientes: 2,
    incluidosEnFoto: false,
    bloquea: false,
  });
  const blocked = await api.request(
    `/api/repartos/${reparto}/completar`,
    "POST",
    { revision: 2 },
    { "idempotency-key": randomUUID() },
  );
  expect(blocked.status).toBe(409);
  expect(blocked.data.code).toBe("REPARTO_NO_COMPLETABLE");
  expect(blocked.data.motivosNoCompletar[0].code).toBe("PENDIENTE_NO_TERMINAL");

  const pendings = generated.data.creados;
  const pair = pendings.find((item: any) => item.repartoLinea.id === first.id);
  const other = pendings.find((item: any) => item.repartoLinea.id === second.id);
  expect(pair).toBeDefined();
  expect(other).toBeDefined();
  const confirmed = await confirmPending(api.request, pair);
  expect(confirmed.estado).toBe("Confirmada");
  const cancelled = await cancelPending(api.request, other);
  expect(cancelled.status).toBe(200);
  expect(cancelled.data.item.estado).toBe("Cancelada");

  const done = await api.request(`/api/repartos/${reparto}/seguimiento`);
  expect(done.data.puedeCompletar).toBe(true);
  expect(done.data.motivosNoCompletar).toEqual([]);
  const completed = await api.request(
    `/api/repartos/${reparto}/completar`,
    "POST",
    { revision: 2 },
    { "idempotency-key": randomUUID() },
  );
  expect(completed.status).toBe(200);
  expect(completed.data.reparto.estado).toBe("Completado");
  expect(completed.data.reparto.revision).toBe(3);
  const after = await addLine(api.request, reparto, {
    clase: "Adicional",
    origen: "S003",
    destino: "S005",
    importe: "1.00",
    fechaPrevista: "2026-01-08",
  });
  expect(after.status).toBe(409);
  expect(after.data.code).toBe("STATE_CONFLICT");

  // Strict completeness: an included line without a pending blocks completion.
  const reparto2 = (await openReparto(api.request, c2)).data.reparto.id;
  const l1 = (await presetLine(api.request, reparto2, preA, "10.00")).data.item;
  const l2 = (await presetLine(api.request, reparto2, preA, "20.00")).data.item;
  const partial = await generate(api.request, reparto2, 1, [l1.id]);
  expect(partial.status).toBe(200);
  expect(partial.data.creados).toHaveLength(1);
  const partialSeguimiento = await api.request(
    `/api/repartos/${reparto2}/seguimiento`,
  );
  expect(partialSeguimiento.data.puedeCompletar).toBe(false);
  expect(partialSeguimiento.data.motivosNoCompletar).toContainEqual({
    code: "LINEA_SIN_PENDIENTE",
    lineas: [l2.id],
  });
  const incomplete = await api.request(
    `/api/repartos/${reparto2}/completar`,
    "POST",
    { revision: 2 },
    { "idempotency-key": randomUUID() },
  );
  expect(incomplete.status).toBe(409);
  expect(incomplete.data.code).toBe("REPARTO_NO_COMPLETABLE");
});

test("R-06 ciclo cerrado bloquea escrituras y el precierre solo avisa", async () => {
  const { db, c3, preA } = setup();
  const api = http(db);
  await api.auth();
  const reparto = (await openReparto(api.request, c3)).data.reparto.id;
  const line = (await presetLine(api.request, reparto, preA, "10.00")).data.item;
  const other = (await presetLine(api.request, reparto, preA, "5.00")).data.item;
  const generated = await generate(api.request, reparto, 1);
  expect(generated.status).toBe(200);
  const pending = generated.data.creados[0];
  closeWindow(db, c3, "2026-03-01", "2026-03-31");

  const read = await api.request(`/api/ciclos/${c3}/reparto`);
  expect(read.status).toBe(200);
  expect(read.data.reparto.estado).toBe("Generado");
  const addBlocked = await presetLine(api.request, reparto, preA, "1.00");
  expect(addBlocked.status).toBe(409);
  expect(addBlocked.data.code).toBe("CICLO_CERRADO");
  const patchReparto = await api.request(
    `/api/repartos/${reparto}`,
    "PATCH",
    { revision: 2, origenComun: "S003" },
    { "idempotency-key": randomUUID() },
  );
  expect(patchReparto.status).toBe(409);
  expect(patchReparto.data.code).toBe("CICLO_CERRADO");
  const generateAgain = await generate(api.request, reparto, 2, [other.id]);
  expect(generateAgain.status).toBe(409);
  expect(generateAgain.data.code).toBe("CICLO_CERRADO");
  // Pending cancellation is still allowed after the close and writes no facts.
  const cancelled = await cancelPending(api.request, pending);
  expect(cancelled.status).toBe(200);
  expect(cancelled.data.item.estado).toBe("Cancelada");
  const secondPending = generated.data.creados[1];
  const cancelledSecond = await cancelPending(api.request, secondPending);
  expect(cancelledSecond.status).toBe(200);
  expect(
    (db.query("SELECT count(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(0);
  const seguimiento = await api.request(`/api/repartos/${reparto}/seguimiento`);
  expect(seguimiento.status).toBe(200);
  expect(seguimiento.data.avisos.cicloCerrado).toBe(true);
  expect(seguimiento.data.avisos.d6).toMatchObject({
    incluidosEnFoto: false,
    bloquea: false,
  });
  // Completion remains available on a closed Cycle when every pending is terminal.
  expect(seguimiento.data.puedeCompletar).toBe(true);
  const completed = await api.request(
    `/api/repartos/${reparto}/completar`,
    "POST",
    { revision: 2 },
    { "idempotency-key": randomUUID() },
  );
  expect(completed.status).toBe(200);
  expect(completed.data.reparto.estado).toBe("Completado");
  expect(line.id).toBeNumber();
});

test("R-07 D8: línea histórica de Presupuesto inactivo visible y editable, sin pendiente", async () => {
  const { db, c1, preA } = setup();
  const preB = makeBudget(db, {
    nombre: "Presupuesto histórico ficticio",
    fuente: "Aportación a saldo",
    destino: "S005",
  });
  const api = http(db);
  await api.auth();
  const reparto = (await openReparto(api.request, c1)).data.reparto.id;
  const good = (await presetLine(api.request, reparto, preA, "10.00")).data.item;
  const historical = (await presetLine(api.request, reparto, preB, "10.00")).data
    .item;
  db.run(
    "UPDATE presupuestos SET estado='Inactivo',revision=revision+1,actualizado=? WHERE id=?",
    [stamp, preB],
  );
  const read = await api.request(`/api/ciclos/${c1}/reparto`);
  const visible = read.data.reparto.lineas.find(
    (line: any) => line.id === historical.id,
  );
  expect(visible.avisos).toContain("PRESUPUESTO_INACTIVO");
  expect(visible.incluida).toBe(true);
  const edited = await api.request(
    `/api/repartos/${reparto}/lineas/${historical.id}`,
    "PATCH",
    { revision: 1, concepto: "Concepto histórico revisado" },
    { "idempotency-key": randomUUID() },
  );
  expect(edited.status).toBe(200);
  expect(edited.data.item.concepto).toBe("Concepto histórico revisado");
  const newLine = await presetLine(api.request, reparto, preB, "5.00");
  expect(newLine.status).toBe(422);
  expect(newLine.data.code).toBe("PRESUPUESTO_INACTIVO");
  const failed = await generate(api.request, reparto, 1, [
    good.id,
    historical.id,
  ]);
  expect(failed.status).toBe(409);
  expect(failed.data.code).toBe("GENERACION_INCOMPLETA");
  expect(failed.data.errores[0].code).toBe("PRESUPUESTO_INACTIVO");
  expect(
    (db.query("SELECT count(*) n FROM transferencia_pendiente").get() as {
      n: number;
    }).n,
  ).toBe(0);
  expect(
    db.query("SELECT estado FROM repartos WHERE id=?").get(reparto),
  ).toEqual({ estado: "Borrador" });
});

test("R-08 contexto cambiado: destino o fuente del Presupuesto invalida la generación", async () => {
  const { db, c1, preA } = setup();
  const api = http(db);
  await api.auth();
  const reparto = (await openReparto(api.request, c1)).data.reparto.id;
  await presetLine(api.request, reparto, preA, "10.00");
  db.run(
    "UPDATE presupuestos SET destino='S005',revision=revision+1,actualizado=? WHERE id=?",
    [stamp, preA],
  );
  const changed = await generate(api.request, reparto, 1);
  expect(changed.status).toBe(409);
  expect(changed.data.code).toBe("GENERACION_INCOMPLETA");
  expect(changed.data.errores[0].code).toBe("CONTEXT_CHANGED");
  expect(
    db.query("SELECT estado,revision FROM repartos WHERE id=?").get(reparto),
  ).toEqual({ estado: "Borrador", revision: 1 });

  // Restore destination, change the source instead.
  db.run(
    "UPDATE presupuestos SET destino='S002',fuente='Gasto real',revision=revision+1,actualizado=? WHERE id=?",
    [stamp, preA],
  );
  const changedSource = await generate(api.request, reparto, 1);
  expect(changedSource.status).toBe(409);
  expect(changedSource.data.code).toBe("GENERACION_INCOMPLETA");
  expect(changedSource.data.errores[0].code).toBe("CONTEXT_CHANGED");
  expect(
    (db.query("SELECT count(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(0);
});

test("R-09 auth, Origin/CSRF, 405, 404 e idempotencia obligatoria", async () => {
  const { db, c1, preA } = setup();
  const anonymous = http(db);
  expect((await anonymous.request(`/api/ciclos/${c1}/reparto`)).status).toBe(
    401,
  );
  expect(
    (await anonymous.request(`/api/ciclos/${c1}/reparto/propuesta`)).status,
  ).toBe(401);
  const api = http(db);
  await api.auth();
  const badOrigin = await api.request(
    `/api/ciclos/${c1}/reparto`,
    "POST",
    {},
    { origin: "http://evil.example", "idempotency-key": randomUUID() },
  );
  expect(badOrigin.status).toBe(403);
  expect(badOrigin.data.code).toBe("ORIGIN");
  const badCsrf = await api.request(
    `/api/ciclos/${c1}/reparto`,
    "POST",
    {},
    { "x-csrf-token": "incorrecto", "idempotency-key": randomUUID() },
  );
  expect(badCsrf.status).toBe(403);
  expect(badCsrf.data.code).toBe("CSRF");
  const noKey = await api.request(`/api/ciclos/${c1}/reparto`, "POST", {});
  expect(noKey.status).toBe(422);
  expect(noKey.data.code).toBe("IDEMPOTENCY_REQUIRED");
  const method = await api.request(`/api/ciclos/${c1}/reparto`, "PUT", {});
  expect(method.status).toBe(405);
  expect(method.headers.get("allow")).toBe("GET, POST");
  const propuestaMethod = await api.request(
    `/api/ciclos/${c1}/reparto/propuesta`,
    "POST",
    {},
  );
  expect(propuestaMethod.status).toBe(405);
  expect(propuestaMethod.headers.get("allow")).toBe("GET");
  const repartoMethod = await api.request("/api/repartos/1", "GET");
  expect(repartoMethod.status).toBe(405);
  expect(repartoMethod.headers.get("allow")).toBe("PATCH");
  const lineMethod = await api.request("/api/repartos/1/lineas/1", "GET");
  expect(lineMethod.status).toBe(405);
  expect(lineMethod.headers.get("allow")).toBe("PATCH");
  const seguimientoMethod = await api.request(
    "/api/repartos/1/seguimiento",
    "POST",
    {},
  );
  expect(seguimientoMethod.status).toBe(405);
  expect(seguimientoMethod.headers.get("allow")).toBe("GET");
  const generarMethod = await api.request("/api/repartos/1/generar", "GET");
  expect(generarMethod.status).toBe(405);
  expect(generarMethod.headers.get("allow")).toBe("POST");
  expect((await api.request("/api/repartos/999/generar", "POST", {})).status).toBe(
    422,
  );
  expect(
    (
      await api.request("/api/repartos/999/generar", "POST", { revision: 1 }, {
        "idempotency-key": randomUUID(),
      })
    ).status,
  ).toBe(404);
  expect((await api.request("/api/repartos/999/seguimiento")).status).toBe(404);
  const reparto = (await openReparto(api.request, c1)).data.reparto.id;
  expect((await generate(api.request, reparto, 1)).status).toBe(422);
  expect((await api.request("/api/repartos/999")).status).toBe(405);
  expect(preA).toBeString();
});

test("R-10 el reparto no escribe hechos financieros ni tablas de Movimientos", async () => {
  const { db, c1, preA } = setup();
  const api = http(db);
  await api.auth();
  const before = financialSnapshot(db);
  const reparto = (await openReparto(api.request, c1)).data.reparto.id;
  await presetLine(api.request, reparto, preA, "30.00");
  await addLine(api.request, reparto, {
    clase: "Adicional",
    origen: "S003",
    destino: "S005",
    importe: "5.00",
    fechaPrevista: "2026-01-08",
  });
  const generated = await generate(api.request, reparto, 1);
  expect(generated.status).toBe(200);
  const after = financialSnapshot(db);
  expect(after).toEqual(before);
  expect(
    (db.query("SELECT count(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(0);
  expect(
    (db.query("SELECT count(*) n FROM movement_audit").get() as { n: number }).n,
  ).toBe(0);
  expect(
    (db.query("SELECT count(*) n FROM reparto_audit WHERE reparto=?").get(reparto) as {
      n: number;
    }).n,
  ).toBe(2);
});

test("R-11 tras generar, una línea nueva solo genera su pendiente", async () => {
  const { db, c1, preA } = setup();
  const api = http(db);
  await api.auth();
  const reparto = (await openReparto(api.request, c1)).data.reparto.id;
  const first = (await presetLine(api.request, reparto, preA, "20.00")).data.item;
  const generated = await generate(api.request, reparto, 1);
  expect(generated.status).toBe(200);
  const original = generated.data.creados[0];
  expect(original.repartoLinea.id).toBe(first.id);

  const newLine = await presetLine(api.request, reparto, preA, "15.00", {
    concepto: "Parcial posterior",
  });
  expect(newLine.status).toBe(201);
  // A new line in a Generado reparto has no pending yet, but is still frozen
  // until the reparto returns to Borrador (which the schema does not allow).
  const editNew = await api.request(
    `/api/repartos/${reparto}/lineas/${newLine.data.item.id}`,
    "PATCH",
    { revision: 1, concepto: "Intento de edición" },
    { "idempotency-key": randomUUID() },
  );
  expect(editNew.status).toBe(409);
  expect(editNew.data.code).toBe("STATE_CONFLICT");
  const regen = await generate(api.request, reparto, 2);
  expect(regen.status).toBe(200);
  expect(regen.data.creados).toHaveLength(1);
  expect(regen.data.creados[0].repartoLinea.id).toBe(newLine.data.item.id);
  expect(regen.data.existentes).toEqual([
    { lineaId: first.id, pendiente: { id: original.id, estado: "Pendiente de realizar" } },
  ]);
  expect(regen.data.reparto.revision).toBe(3);
  expect(
    (db.query("SELECT count(*) n FROM transferencia_pendiente").get() as {
      n: number;
    }).n,
  ).toBe(2);
  const proposal = await api.request(`/api/ciclos/${c1}/reparto/propuesta`);
  const item = proposal.data.items.find(
    (entry: any) => entry.presupuesto.id === preA,
  );
  expect(item.efectoAcumulado).toBe("35.00");
  expect(item.restante).toBe("65.00");
  // Lines freeze after generation; editing one is a domain conflict, not SQL.
  const frozen = await api.request(
    `/api/repartos/${reparto}/lineas/${first.id}`,
    "PATCH",
    { revision: 1, importe: "1.00" },
    { "idempotency-key": randomUUID() },
  );
  expect(frozen.status).toBe(409);
  expect(frozen.data.code).toBe("LINEA_CONGELADA");
});

test("R-12 auditoría de línea en audit: alta, edición y exclusión", async () => {
  const { db, c1, preA } = setup();
  const api = http(db);
  await api.auth();
  const reparto = (await openReparto(api.request, c1)).data.reparto.id;
  const line = (await presetLine(api.request, reparto, preA, "20.00")).data.item;
  const edited = await api.request(
    `/api/repartos/${reparto}/lineas/${line.id}`,
    "PATCH",
    { revision: 1, concepto: "Concepto revisado" },
    { "idempotency-key": randomUUID() },
  );
  expect(edited.status).toBe(200);
  const excluded = await api.request(
    `/api/repartos/${reparto}/lineas/${line.id}`,
    "PATCH",
    {
      revision: 2,
      incluida: 0,
      motivoExclusion: "No se financia este mes",
    },
    { "idempotency-key": randomUUID() },
  );
  expect(excluded.status).toBe(200);

  const rows = db
    .query(
      `SELECT accion,revision,revision_previa,actor,instante,campos,motivo
       FROM audit WHERE entidad=? ORDER BY id`,
    )
    .all(`reparto-linea:${line.id}`) as {
    accion: string;
    revision: number;
    revision_previa: number;
    actor: string;
    instante: string;
    campos: string;
    motivo: string | null;
  }[];
  expect(rows.map((row) => row.accion)).toEqual([
    "alta",
    "edición",
    "exclusión",
  ]);
  expect(rows.map((row) => row.revision)).toEqual([1, 2, 3]);
  expect(rows.map((row) => row.revision_previa)).toEqual([0, 1, 2]);
  expect(rows.every((row) => row.actor === "usuario-unico")).toBe(true);
  expect(
    rows.every((row) => row.instante === new Date(now).toISOString()),
  ).toBe(true);
  expect(JSON.parse(rows[0].campos)).toMatchObject({
    presupuesto: preA,
    importe: "20.00",
    incluida: true,
  });
  expect(JSON.parse(rows[1].campos)).toMatchObject({
    cambios: { concepto: "Concepto revisado" },
  });
  expect(rows[2].motivo).toBe("No se financia este mes");
  expect(JSON.parse(rows[2].campos)).toMatchObject({
    linea: { incluida: false, motivoExclusion: "No se financia este mes" },
  });
  // `reparto_audit` keeps covering header transitions only.
  expect(
    (
      db
        .query("SELECT count(*) n FROM reparto_audit WHERE reparto=?")
        .get(reparto) as { n: number }
    ).n,
  ).toBe(1);
});

test("R-13 importe fuera del rango seguro de céntimos se rechaza sin redondear", async () => {
  const { db, c1, preA } = setup();
  const api = http(db);
  await api.auth();
  const reparto = (await openReparto(api.request, c1)).data.reparto.id;
  const tooBig = await presetLine(
    api.request,
    reparto,
    preA,
    "90071992547409.92",
  );
  expect(tooBig.status).toBe(422);
  expect(tooBig.data.code).toBe("VALIDATION");
  expect(tooBig.data.fields.importe).toContain("90.071.992.547.409,91");
  const maxSafe = await presetLine(
    api.request,
    reparto,
    preA,
    "90071992547409.91",
  );
  expect(maxSafe.status).toBe(201);
  expect(maxSafe.data.item.importe).toBe("90071992547409.91");
});

test("R-15 una línea nueva tras generar bloquea el completado hasta generar su pendiente", async () => {
  const { db, c1, preA } = setup();
  const api = http(db);
  await api.auth();
  const reparto = (await openReparto(api.request, c1)).data.reparto.id;
  const first = (await presetLine(api.request, reparto, preA, "20.00")).data.item;
  const generated = await generate(api.request, reparto, 1);
  expect(generated.status).toBe(200);
  const pending = generated.data.creados[0];
  await confirmPending(api.request, pending);

  const terminal = await api.request(`/api/repartos/${reparto}/seguimiento`);
  expect(terminal.data.puedeCompletar).toBe(true);
  expect(terminal.data.motivosNoCompletar).toEqual([]);

  const newLine = (await presetLine(api.request, reparto, preA, "15.00", {
    concepto: "Parcial posterior al cierre de pendientes",
  })).data.item;
  const open = await api.request(`/api/repartos/${reparto}/seguimiento`);
  expect(open.data.puedeCompletar).toBe(false);
  expect(open.data.motivosNoCompletar).toContainEqual({
    code: "LINEA_SIN_PENDIENTE",
    lineas: [newLine.id],
  });

  // The UI must not keep the previous `puedeCompletar:true` after the alta.
  const revive = await generate(api.request, reparto, 2, [newLine.id]);
  expect(revive.status).toBe(200);
  expect(revive.data.creados).toHaveLength(1);
  const withPending = await api.request(`/api/repartos/${reparto}/seguimiento`);
  expect(withPending.data.puedeCompletar).toBe(false);
  expect(withPending.data.motivosNoCompletar[0].code).toBe(
    "PENDIENTE_NO_TERMINAL",
  );
  expect(first.id).toBeNumber();
});

test("R-16 error no-Problem no filtra SQL ni constraints al cliente", async () => {
  const { db, c1, preA } = setup();
  const api = http(db);
  await api.auth();
  const reparto = (await openReparto(api.request, c1)).data.reparto.id;
  await presetLine(api.request, reparto, preA, "10.00");
  db.run(
    `CREATE TRIGGER test_reparto_fail BEFORE INSERT ON transferencia_pendiente
     BEGIN SELECT RAISE(ABORT,'sql-detail-secret'); END`,
  );
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };
  try {
    const failed = await generate(api.request, reparto, 1);
    expect(failed.status).toBe(409);
    expect(failed.data.code).toBe("GENERACION_INCOMPLETA");
    expect(failed.data.errores[0]).toMatchObject({
      code: "INTERNAL",
      message: "No se pudo generar la Transferencia pendiente.",
    });
    expect(JSON.stringify(failed.data)).not.toContain("sql-detail-secret");
    // The internal log keeps the real error detail.
    const detail = logged[0]?.[2];
    expect(detail).toBeInstanceOf(Error);
    expect((detail as Error).message).toContain("sql-detail-secret");
  } finally {
    console.error = original;
    db.run("DROP TRIGGER test_reparto_fail");
  }
});

test("R-17 una clave de idempotencia estable evita duplicar la línea al reintentar", async () => {
  const { db, c1 } = setup();
  const api = http(db);
  await api.auth();
  const reparto = (await openReparto(api.request, c1)).data.reparto.id;
  const body = {
    clase: "Adicional",
    origen: "S003",
    destino: "S005",
    importe: "12.34",
    fechaPrevista: "2026-01-08",
    concepto: "Adicional idempotente",
  };
  const key = randomUUID();
  const first = await addLine(api.request, reparto, body, key);
  expect(first.status).toBe(201);
  const retry = await addLine(api.request, reparto, body, key);
  expect(retry.status).toBe(201);
  expect(retry.data.item.id).toBe(first.data.item.id);
  expect(
    (
      db.query("SELECT count(*) n FROM reparto_lineas WHERE reparto=?").get(
        reparto,
      ) as { n: number }
    ).n,
  ).toBe(1);
  const conflict = await addLine(
    api.request,
    reparto,
    { ...body, importe: "99.00" },
    key,
  );
  expect(conflict.status).toBe(409);
  expect(conflict.data.code).toBe("IDEMPOTENCY_CONFLICT");
});

test("R-14 propuesta sin destino no es elegible ni propone automáticamente", async () => {
  const { db, c1, preA } = setup();
  const api = http(db);
  await api.auth();
  // Defensive path: an Aportación row without destination cannot be created
  // through the API, but preview must still refuse it if legacy data has it.
  db.run("PRAGMA ignore_check_constraints=ON");
  try {
    db.run(
      "UPDATE presupuestos SET destino=NULL,revision=revision+1,actualizado=? WHERE id=?",
      [stamp, preA],
    );
  } finally {
    db.run("PRAGMA ignore_check_constraints=OFF");
  }
  const response = await api.request(`/api/ciclos/${c1}/reparto/propuesta`);
  expect(response.status).toBe(200);
  const item = response.data.items.find(
    (entry: any) => entry.presupuesto.id === preA,
  );
  expect(item.motivos).toContain("SIN_DESTINO");
  expect(item.elegible).toBe(false);
  expect(item.propuestaAutomatica).toBe(false);
  expect(item.importeSugerido).toBe("100.00");
});
