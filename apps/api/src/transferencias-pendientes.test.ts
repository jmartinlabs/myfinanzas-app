import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createCycle, cycleContext } from "./ciclos";
import { createBudget } from "./presupuestos";
import { previewMovement, writeMovement } from "./movimientos";
import { Problem } from "./problem";
import {
  crearTransferenciaPendiente,
  previewImpactoTransferenciaPendiente,
} from "./transferencias-pendientes";

const now = Date.parse("2026-10-25T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const stamp = "2026-01-01T00:00:00.000Z";

type LineSpec = {
  clase?: "Presupuesto" | "Adicional";
  presupuesto?: string | null;
  origen: string;
  destino: string;
  importe: number;
  fechaPrevista?: string;
  concepto?: string | null;
  nota?: string | null;
  incluida?: 0 | 1;
  motivoExclusion?: string | null;
};

function makeCycle(db: Database, inicio = "2026-01-01") {
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

function makeBudget(
  db: Database,
  over: Record<string, unknown> = {},
): string {
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

function seedReparto(
  db: Database,
  ciclo: string,
  lines: LineSpec[],
  estado: "Borrador" | "Generado" = "Generado",
) {
  const id = Number(
    (
      db.query("SELECT COALESCE(MAX(id),0)+1 n FROM repartos").get() as {
        n: number;
      }
    ).n,
  );
  db.run(
    "INSERT INTO repartos(id,ciclo,estado,origen_comun,revision,creado,actualizado) VALUES(?,?,'Borrador','S001',1,?,?)",
    [id, ciclo, stamp, stamp],
  );
  const lineIds: number[] = [];
  for (const l of lines) {
    const result = db.run(
      `INSERT INTO reparto_lineas(
        reparto,clase,presupuesto,origen,destino,importe,fecha_prevista,
        concepto,nota,incluida,motivo_exclusion,revision,creado,actualizado
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
      [
        id,
        l.clase ?? "Presupuesto",
        l.presupuesto ?? null,
        l.origen,
        l.destino,
        l.importe,
        l.fechaPrevista ?? "2026-01-05",
        l.concepto ?? null,
        l.nota ?? null,
        l.incluida ?? 1,
        l.motivoExclusion ?? null,
        stamp,
        stamp,
      ],
    );
    lineIds.push(Number(result.lastInsertRowid));
  }
  if (estado === "Generado")
    db.run("UPDATE repartos SET estado='Generado',revision=2,actualizado=? WHERE id=?", [
      stamp,
      id,
    ]);
  return { repartoId: id, lineIds };
}

function setup(
  lines: LineSpec[],
  options: {
    budgetFuente?: string;
    budgetDestino?: string;
    estado?: "Borrador" | "Generado";
    cycle?: string;
  } = {},
) {
  const db = openDatabase(":memory:");
  const ciclo = makeCycle(db, options.cycle ?? "2026-01-01");
  const presupuesto = makeBudget(db, {
    fuente: options.budgetFuente ?? "Aportación a saldo",
    destino: options.budgetDestino ?? "S002",
  });
  const seeded = seedReparto(
    db,
    ciclo,
    lines.map((l) =>
      l.clase === "Adicional" || l.clase === undefined && l.presupuesto === null
        ? { ...l, clase: "Adicional" }
        : { ...l, presupuesto: l.presupuesto ?? presupuesto },
    ),
    options.estado ?? "Generado",
  );
  return { db, ciclo, presupuesto, ...seeded };
}

function http(db: Database) {
  const key = randomBytes(32),
    password = "Ficticia " + randomUUID(),
    handler = HttpApp.toWebHandler(createApp(db, { key, now: () => now }));
  let cookie = "",
    csrf = "";
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
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie
        .split("; ")
        .filter((value) => value && !value.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
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

function createPending(
  request: ReturnType<typeof http>["request"],
  lineaId: number,
  key = randomUUID(),
) {
  return request(
    "/api/transferencias-pendientes",
    "POST",
    { lineaId },
    { "idempotency-key": key },
  );
}

function financialSnapshot(db: Database) {
  const tables = [
    "saldos",
    "presupuestos",
    "movimientos",
    "movement_audit",
    "cycle_plans",
    "cycle_plan_lines",
    "fotos_cierre",
    "cierres",
  ];
  return Object.fromEntries(
    tables.map((table) => [
      table,
      db.query(`SELECT * FROM "${table}" ORDER BY rowid`).all(),
    ]),
  );
}

function expectProblem(fn: () => unknown, status: number, code: string) {
  try {
    fn();
    throw new Error("Se esperaba un Problem.");
  } catch (error) {
    expect(error).toBeInstanceOf(Problem);
    expect((error as Problem).status).toBe(status);
    expect((error as Problem).code).toBe(code);
  }
}

function createRealTransfer(
  db: Database,
  over: {
    fecha?: string;
    importe?: string;
    origen?: string;
    destino?: string;
    concepto?: string;
  } = {},
) {
  const body = {
    tipo: "Transferencia",
    fecha: over.fecha ?? "2026-01-08",
    importe: over.importe ?? "60.00",
    origen: over.origen ?? "S001",
    destino: over.destino ?? "S002",
    concepto: over.concepto ?? "Transferencia ficticia",
    nota: "",
  };
  const p = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    {
      ...body,
      fingerprint: p.fingerprint,
      contextRevision: p.contextRevision,
      aceptarCoincidencia: true,
    },
    randomUUID(),
    null,
    false,
    now,
  ).movimiento;
}

function annulTransfer(db: Database, id: string) {
  const row = db
    .query("SELECT revision FROM movimientos WHERE id=?")
    .get(id) as { revision: number };
  const body = { revision: row.revision, motivo: "Anulación ficticia de prueba" };
  const p = previewMovement(db, body, id, true, now);
  writeMovement(
    db,
    {
      ...body,
      fingerprint: p.fingerprint,
      contextRevision: p.contextRevision,
    },
    randomUUID(),
    id,
    true,
    now,
  );
}

function closeWindow(
  db: Database,
  ciclo: string,
  inicio: string,
  fin: string,
) {
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

test("I1-01 creación, lista, ficha, edición y cancelación no alteran hechos", async () => {
  const { db, ciclo, presupuesto, lineIds } = setup([
    { origen: "S001", destino: "S002", importe: 6000, concepto: "Aportación ficticia" },
    { clase: "Adicional", presupuesto: null, origen: "S003", destino: "S005", importe: 1200, concepto: "Adicional ficticia" },
  ]);
  const api = http(db);
  await api.auth();
  const before = financialSnapshot(db);
  const key = randomUUID();
  const created = await createPending(api.request, lineIds[0], key);
  expect(created.status).toBe(201);
  const id = created.data.item.id;
  expect(created.headers.get("location")).toBe(
    `/api/transferencias-pendientes/${id}`,
  );
  expect(created.data.item).toMatchObject({
    estado: "Pendiente de realizar",
    importe: "60.00",
    cicloOrigen: ciclo,
    requiereRevision: false,
  });
  const retry = await createPending(api.request, lineIds[0], key);
  expect(retry.status).toBe(201);
  expect(retry.data.item.id).toBe(id);
  expect(
    (await createPending(api.request, lineIds[0])).data.code,
  ).toBe("LINEA_YA_GENERADA");

  const list = await api.request("/api/transferencias-pendientes");
  expect(list.status).toBe(200);
  expect(list.data.total).toBe(1);
  expect((await api.request("/api/transferencias-pendientes?estado=Pendiente%20de%20realizar")).data.total).toBe(1);
  expect((await api.request(`/api/transferencias-pendientes?ciclo=${ciclo}`)).data.total).toBe(1);
  expect((await api.request(`/api/transferencias-pendientes?presupuesto=${presupuesto}`)).data.total).toBe(1);
  expect((await api.request("/api/transferencias-pendientes?requiereRevision=false")).data.total).toBe(1);
  expect((await api.request("/api/transferencias-pendientes?q=adicional")).data.total).toBe(0);

  const ficha = await api.request(`/api/transferencias-pendientes/${id}`);
  expect(ficha.status).toBe(200);
  expect(ficha.data.auditoria).toHaveLength(1);
  expect(ficha.data.auditoria[0]).toMatchObject({
    revision: 1,
    accion: "alta",
    anterior: null,
    actor: "usuario-unico",
  });

  const editKey = randomUUID();
  const editPayload = {
    revision: 1,
    fechaPrevista: "2026-01-20",
    concepto: "Concepto editado",
    nota: "Nota editada",
  };
  const edited = await api.request(
    `/api/transferencias-pendientes/${id}`,
    "PATCH",
    editPayload,
    { "idempotency-key": editKey },
  );
  expect(edited.status).toBe(200);
  expect(edited.data.item).toMatchObject({
    revision: 2,
    fechaPrevista: "2026-01-20",
    concepto: "Concepto editado",
    nota: "Nota editada",
  });
  const editRetry = await api.request(
    `/api/transferencias-pendientes/${id}`,
    "PATCH",
    editPayload,
    { "idempotency-key": editKey },
  );
  expect(editRetry.status).toBe(200);
  expect(editRetry.data.item.revision).toBe(2);
  const frozen = await api.request(
    `/api/transferencias-pendientes/${id}`,
    "PATCH",
    { revision: 2, importe: "70.00" },
    { "idempotency-key": randomUUID() },
  );
  expect(frozen.status).toBe(422);
  expect(frozen.data.code).toBe("VALIDATION");
  expect((await api.request(`/api/transferencias-pendientes/${id}`)).data.auditoria).toHaveLength(2);

  const second = await createPending(api.request, lineIds[1]);
  expect(second.status).toBe(201);
  const cancelled = await api.request(
    `/api/transferencias-pendientes/${second.data.item.id}/cancelar`,
    "POST",
    { revision: 1, motivo: "Cancelación ficticia" },
    { "idempotency-key": randomUUID() },
  );
  expect(cancelled.status).toBe(200);
  expect(cancelled.data.item).toMatchObject({
    estado: "Cancelada",
    motivoCancelacion: "Cancelación ficticia",
    movimiento: null,
  });
  const cancelledFicha = await api.request(
    `/api/transferencias-pendientes/${second.data.item.id}`,
  );
  expect(cancelledFicha.data.auditoria.at(-1).posterior.motivo).toBe(
    "Cancelación ficticia",
  );
  expect((await api.request("/api/transferencias-pendientes?estado=Cancelada")).data.total).toBe(1);

  expect(financialSnapshot(db)).toEqual(before);
  expect(
    (db.query("SELECT count(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(0);
});

test("I1-02 confirmación atómica: un Movimiento, idempotencia y reintento", async () => {
  const { db, ciclo, presupuesto, lineIds } = setup([
    { origen: "S001", destino: "S002", importe: 6000, concepto: "Aportación ficticia" },
  ]);
  const api = http(db);
  await api.auth();
  const created = await createPending(api.request, lineIds[0]);
  const id = created.data.item.id;
  const beforeImpact = financialSnapshot(db);
  const attemptsBefore = (
    db.query("SELECT count(*) n FROM transferencia_pendiente_attempts").get() as {
      n: number;
    }
  ).n;
  const impact = await api.request(
    `/api/transferencias-pendientes/${id}/impacto`,
    "POST",
    { fechaReal: "2026-01-10" },
  );
  expect(impact.status).toBe(200);
  expect(impact.data.cicloFechaReal).toMatchObject({ id: ciclo });
  expect(impact.data.efectoPresupuestario).toMatchObject({
    aplica: true,
    presupuesto,
  });
  expect(impact.data.condiciones).toEqual({
    requiereRevision: false,
    motivos: [],
  });
  expect(impact.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(financialSnapshot(db)).toEqual(beforeImpact);
  expect(
    (db.query("SELECT count(*) n FROM transferencia_pendiente_attempts").get() as {
      n: number;
    }).n,
  ).toBe(attemptsBefore);

  const key = randomUUID();
  const payload = {
    revision: 1,
    fechaReal: "2026-01-10",
    fingerprint: impact.data.fingerprint,
  };
  const changed = await api.request(
    `/api/transferencias-pendientes/${id}/confirmar`,
    "POST",
    { ...payload, fingerprint: "0".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expect(changed.status).toBe(409);
  expect(changed.data.code).toBe("IMPACT_CHANGED");
  const confirmed = await api.request(
    `/api/transferencias-pendientes/${id}/confirmar`,
    "POST",
    payload,
    { "idempotency-key": key },
  );
  expect(confirmed.status).toBe(200);
  expect(confirmed.data.item.estado).toBe("Confirmada");
  expect(confirmed.data.item.fechaEfectiva).toBe("2026-01-10");
  expect(confirmed.data.item.movimiento).toMatchObject({
    fecha: "2026-01-10",
    importe: "60.00",
    origen: "S001",
    destino: "S002",
    anulado: false,
  });
  expect(
    (db.query("SELECT count(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(1);
  expect(
    (db.query("SELECT count(*) n FROM movement_attempts").get() as { n: number })
      .n,
  ).toBe(0);
  expect(
    (db.query("SELECT count(*) n FROM transferencia_pendiente_attempts").get() as {
      n: number;
    }).n,
  ).toBe(2);

  const retry = await api.request(
    `/api/transferencias-pendientes/${id}/confirmar`,
    "POST",
    payload,
    { "idempotency-key": key },
  );
  expect(retry.status).toBe(200);
  expect(retry.data.item.movimiento.id).toBe(
    confirmed.data.item.movimiento.id,
  );
  expect(
    (db.query("SELECT count(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(1);
  const otherKey = await api.request(
    `/api/transferencias-pendientes/${id}/confirmar`,
    "POST",
    payload,
    { "idempotency-key": randomUUID() },
  );
  expect(otherKey.status).toBe(409);
  expect(otherKey.data.code).toBe("STATE_CONFLICT");
  const sameKeyOtherPayload = await api.request(
    `/api/transferencias-pendientes/${id}/confirmar`,
    "POST",
    { ...payload, fechaReal: "2026-01-11" },
    { "idempotency-key": key },
  );
  expect(sameKeyOtherPayload.status).toBe(409);
  expect(sameKeyOtherPayload.data.code).toBe("IDEMPOTENCY_CONFLICT");
  expect(
    (db.query("SELECT count(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(1);
});

test("I1-03 rollback total: un fallo no deja Movimiento ni pendiente resuelto", async () => {
  const { db, lineIds } = setup([
    { origen: "S001", destino: "S002", importe: 6000, concepto: "Aportación ficticia" },
  ]);
  const api = http(db);
  await api.auth();
  const created = await createPending(api.request, lineIds[0]);
  const id = created.data.item.id;
  const impact = await api.request(
    `/api/transferencias-pendientes/${id}/impacto`,
    "POST",
    { fechaReal: "2026-01-10" },
  );
  const key = randomUUID();
  const payload = {
    revision: 1,
    fechaReal: "2026-01-10",
    fingerprint: impact.data.fingerprint,
  };
  db.exec(
    "CREATE TRIGGER fail_pending BEFORE UPDATE ON transferencia_pendiente BEGIN SELECT RAISE(ABORT,'injected'); END;",
  );
  const failed = await api.request(
    `/api/transferencias-pendientes/${id}/confirmar`,
    "POST",
    payload,
    { "idempotency-key": key },
  );
  expect(failed.status).toBe(500);
  expect(failed.data.code).toBe("INTERNAL");
  expect(
    (db.query("SELECT count(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(0);
  expect(
    (db.query("SELECT count(*) n FROM movement_audit").get() as { n: number }).n,
  ).toBe(0);
  expect(
    db.query("SELECT estado,revision FROM transferencia_pendiente WHERE id=?").get(id),
  ).toEqual({ estado: "Pendiente de realizar", revision: 1 });
  expect(
    db.query("SELECT next FROM counters WHERE name='movimientos'").get(),
  ).toEqual({ next: 1 });
  db.exec("DROP TRIGGER fail_pending");
  const retried = await api.request(
    `/api/transferencias-pendientes/${id}/confirmar`,
    "POST",
    payload,
    { "idempotency-key": key },
  );
  expect(retried.status).toBe(200);
  expect(
    (db.query("SELECT count(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(1);
});

test("I1-04 fecha futura y ventana cerrada se rechazan sin escritura", async () => {
  const { db, ciclo, lineIds } = setup([
    { origen: "S001", destino: "S002", importe: 6000, concepto: "Aportación ficticia" },
  ]);
  const api = http(db);
  await api.auth();
  const created = await createPending(api.request, lineIds[0]);
  const id = created.data.item.id;
  const futureImpact = await api.request(
    `/api/transferencias-pendientes/${id}/impacto`,
    "POST",
    { fechaReal: "2026-10-26" },
  );
  expect(futureImpact.status).toBe(422);
  expect(futureImpact.data.code).toBe("VALIDATION");
  const futureConfirm = await api.request(
    `/api/transferencias-pendientes/${id}/confirmar`,
    "POST",
    { revision: 1, fechaReal: "2026-10-26", fingerprint: "0".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expect(futureConfirm.status).toBe(422);
  expect(futureConfirm.data.code).toBe("VALIDATION");
  closeWindow(db, ciclo, "2026-01-01", "2026-01-31");
  const closed = await api.request(
    `/api/transferencias-pendientes/${id}/confirmar`,
    "POST",
    { revision: 1, fechaReal: "2026-01-15", fingerprint: "0".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expect(closed.status).toBe(409);
  expect(closed.data.code).toBe("HISTORY_LOCKED");
  expect(
    (db.query("SELECT count(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(0);
});

test("I1-05 duplicado E1.5 exige revisión explícita y no duplica por accidente", async () => {
  const { db, lineIds } = setup([
    { origen: "S001", destino: "S002", importe: 6000, concepto: "Aportación ficticia" },
  ]);
  const api = http(db);
  await api.auth();
  const created = await createPending(api.request, lineIds[0]);
  const id = created.data.item.id;
  createRealTransfer(db, { fecha: "2026-01-10", importe: "60.00" });
  const impact = await api.request(
    `/api/transferencias-pendientes/${id}/impacto`,
    "POST",
    { fechaReal: "2026-01-10" },
  );
  expect(impact.status).toBe(200);
  expect(impact.data.duplicados).toHaveLength(1);
  const blocked = await api.request(
    `/api/transferencias-pendientes/${id}/confirmar`,
    "POST",
    {
      revision: 1,
      fechaReal: "2026-01-10",
      fingerprint: impact.data.fingerprint,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(blocked.status).toBe(409);
  expect(blocked.data.code).toBe("DUPLICATE_REVIEW");
  expect(
    (db.query("SELECT count(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(1);
  const confirmed = await api.request(
    `/api/transferencias-pendientes/${id}/confirmar`,
    "POST",
    {
      revision: 1,
      fechaReal: "2026-01-10",
      fingerprint: impact.data.fingerprint,
      aceptarCoincidencia: true,
    },
    { "idempotency-key": randomUUID() },
  );
  expect(confirmed.status).toBe(200);
  expect(
    (db.query("SELECT count(*) n FROM movimientos").get() as { n: number }).n,
  ).toBe(2);
});

test("I1-06 vínculo exacto sin crear Movimiento; anulado y ya vinculado", async () => {
  const { db, lineIds } = setup([
    { origen: "S001", destino: "S002", importe: 6000, concepto: "Uno" },
    { origen: "S001", destino: "S002", importe: 6000, concepto: "Dos" },
    { origen: "S001", destino: "S002", importe: 6000, concepto: "Tres" },
  ]);
  const api = http(db);
  await api.auth();
  const p1 = (await createPending(api.request, lineIds[0])).data.item;
  const p2 = (await createPending(api.request, lineIds[1])).data.item;
  const p3 = (await createPending(api.request, lineIds[2])).data.item;
  const m1 = createRealTransfer(db, { fecha: "2026-01-08", importe: "60.00" });
  const m1Before = db
    .query("SELECT * FROM movimientos WHERE id=?")
    .get(m1.id);
  const candidates = await api.request(
    `/api/transferencias-pendientes/${p1.id}/candidatos`,
  );
  expect(candidates.status).toBe(200);
  expect(candidates.data.items).toHaveLength(1);
  const linked = await api.request(
    `/api/transferencias-pendientes/${p1.id}/vincular`,
    "POST",
    { revision: 1, movimientoId: m1.id },
    { "idempotency-key": randomUUID() },
  );
  expect(linked.status).toBe(200);
  expect(linked.data.item).toMatchObject({
    estado: "Confirmada",
    fechaEfectiva: "2026-01-08",
    movimiento: { id: m1.id },
  });
  expect(db.query("SELECT * FROM movimientos WHERE id=?").get(m1.id)).toEqual(
    m1Before,
  );
  annulTransfer(db, m1.id);
  const review = await api.request(`/api/transferencias-pendientes/${p1.id}`);
  expect(review.data.item.estado).toBe("Confirmada");
  expect(review.data.item.requiereRevision).toBe(true);
  expect(review.data.item.motivosRevision).toContain("MOVIMIENTO_ANULADO");

  const mismatch = createRealTransfer(db, { fecha: "2026-01-09", importe: "10.00" });
  const mismatchLink = await api.request(
    `/api/transferencias-pendientes/${p2.id}/vincular`,
    "POST",
    { revision: 1, movimientoId: mismatch.id },
    { "idempotency-key": randomUUID() },
  );
  expect(mismatchLink.status).toBe(422);
  expect(mismatchLink.data.code).toBe("VALIDATION");
  const annulledLink = await api.request(
    `/api/transferencias-pendientes/${p2.id}/vincular`,
    "POST",
    { revision: 1, movimientoId: m1.id },
    { "idempotency-key": randomUUID() },
  );
  expect(annulledLink.status).toBe(422);
  expect(annulledLink.data.code).toBe("VALIDATION");
  const m2 = createRealTransfer(db, { fecha: "2026-01-09", importe: "60.00" });
  const linked2 = await api.request(
    `/api/transferencias-pendientes/${p2.id}/vincular`,
    "POST",
    { revision: 1, movimientoId: m2.id },
    { "idempotency-key": randomUUID() },
  );
  expect(linked2.status).toBe(200);
  const already = await api.request(
    `/api/transferencias-pendientes/${p3.id}/vincular`,
    "POST",
    { revision: 1, movimientoId: m2.id },
    { "idempotency-key": randomUUID() },
  );
  expect(already.status).toBe(409);
  expect(already.data.code).toBe("MOVEMENT_ALREADY_LINKED");
});

test("I1-07 transiciones, revisión y bloqueo por requiere revisión", async () => {
  const { db, lineIds } = setup([
    { origen: "S001", destino: "S002", importe: 6000, concepto: "Uno" },
    { origen: "S001", destino: "S002", importe: 6000, concepto: "Dos" },
  ]);
  const api = http(db);
  await api.auth();
  const p1 = (await createPending(api.request, lineIds[0])).data.item;
  const p2 = (await createPending(api.request, lineIds[1])).data.item;
  const stale = await api.request(
    `/api/transferencias-pendientes/${p1.id}/cancelar`,
    "POST",
    { revision: 99, motivo: "Cancelación ficticia" },
    { "idempotency-key": randomUUID() },
  );
  expect(stale.status).toBe(409);
  expect(stale.data.code).toBe("REVISION_CONFLICT");
  const empty = await api.request(
    `/api/transferencias-pendientes/${p1.id}/cancelar`,
    "POST",
    { revision: 1, motivo: "   " },
    { "idempotency-key": randomUUID() },
  );
  expect(empty.status).toBe(422);
  expect(empty.data.code).toBe("VALIDATION");
  const cancelled = await api.request(
    `/api/transferencias-pendientes/${p1.id}/cancelar`,
    "POST",
    { revision: 1, motivo: "Cancelación ficticia" },
    { "idempotency-key": randomUUID() },
  );
  expect(cancelled.status).toBe(200);
  const confirmCancelled = await api.request(
    `/api/transferencias-pendientes/${p1.id}/confirmar`,
    "POST",
    { revision: 2, fechaReal: "2026-01-10", fingerprint: "0".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expect(confirmCancelled.status).toBe(409);
  expect(confirmCancelled.data.code).toBe("STATE_CONFLICT");
  const cancelAgain = await api.request(
    `/api/transferencias-pendientes/${p1.id}/cancelar`,
    "POST",
    { revision: 2, motivo: "Otra cancelación" },
    { "idempotency-key": randomUUID() },
  );
  expect(cancelAgain.status).toBe(409);
  expect(cancelAgain.data.code).toBe("STATE_CONFLICT");

  db.run(
    "UPDATE saldos SET estado='Inactiva',revision=revision+1,actualizado=? WHERE id='S002'",
    [stamp],
  );
  const ficha = await api.request(`/api/transferencias-pendientes/${p2.id}`);
  expect(ficha.data.item.requiereRevision).toBe(true);
  expect(ficha.data.item.motivosRevision).toContain(
    "SALDO_DESTINO_NO_ELEGIBLE",
  );
  const impact = await api.request(
    `/api/transferencias-pendientes/${p2.id}/impacto`,
    "POST",
    { fechaReal: "2026-01-10" },
  );
  expect(impact.status).toBe(200);
  expect(impact.data.movimiento).toBeNull();
  expect(impact.data.motivoNoDisponible).toBeString();
  const blocked = await api.request(
    `/api/transferencias-pendientes/${p2.id}/confirmar`,
    "POST",
    { revision: 1, fechaReal: "2026-01-10", fingerprint: "0".repeat(64) },
    { "idempotency-key": randomUUID() },
  );
  expect(blocked.status).toBe(409);
  expect(blocked.data.code).toBe("REVIEW_REQUIRED");
  const cancelReviewed = await api.request(
    `/api/transferencias-pendientes/${p2.id}/cancelar`,
    "POST",
    { revision: 1, motivo: "Se descarta la revisión" },
    { "idempotency-key": randomUUID() },
  );
  expect(cancelReviewed.status).toBe(200);
});

test("I1-08 matriz de validaciones de creación", () => {
  {
    const { db, lineIds } = setup([
      { origen: "S001", destino: "S002", importe: 6000 },
    ]);
    expectProblem(
      () =>
        crearTransferenciaPendiente(
          db,
          { lineaId: lineIds[0], referencia: "REF-1" },
          now,
        ),
      422,
      "REFERENCIA_NO_ADMITIDA",
    );
    expectProblem(
      () =>
        crearTransferenciaPendiente(
          db,
          { lineaId: lineIds[0], origenOperativo: "Gasto" },
          now,
        ),
      422,
      "VALIDATION",
    );
    expectProblem(
      () => crearTransferenciaPendiente(db, { lineaId: 999 }, now),
      404,
      "NOT_FOUND",
    );
    expectProblem(
      () => crearTransferenciaPendiente(db, { lineaId: lineIds[0], extra: 1 }, now),
      422,
      "VALIDATION",
    );
    crearTransferenciaPendiente(db, { lineaId: lineIds[0] }, now);
    expectProblem(
      () => crearTransferenciaPendiente(db, { lineaId: lineIds[0] }, now),
      409,
      "LINEA_YA_GENERADA",
    );
  }
  {
    const { db, lineIds } = setup(
      [{ origen: "S001", destino: "S002", importe: 6000 }],
      { estado: "Borrador" },
    );
    expectProblem(
      () => crearTransferenciaPendiente(db, { lineaId: lineIds[0] }, now),
      409,
      "STATE_CONFLICT",
    );
  }
  {
    const { db, lineIds } = setup([
      {
        origen: "S001",
        destino: "S002",
        importe: 6000,
        incluida: 0,
        motivoExclusion: "Excluida en pruebas",
      },
    ]);
    expectProblem(
      () => crearTransferenciaPendiente(db, { lineaId: lineIds[0] }, now),
      422,
      "VALIDATION",
    );
  }
  {
    const { db, presupuesto, lineIds } = setup([
      { origen: "S001", destino: "S002", importe: 6000 },
    ]);
    db.run(
      "UPDATE presupuestos SET estado='Inactivo',revision=revision+1,actualizado=? WHERE id=?",
      [stamp, presupuesto],
    );
    expectProblem(
      () => crearTransferenciaPendiente(db, { lineaId: lineIds[0] }, now),
      422,
      "PRESUPUESTO_INACTIVO",
    );
  }
  {
    const { db, presupuesto, lineIds } = setup(
      [{ origen: "S001", destino: "S002", importe: 6000 }],
      { budgetFuente: "Gasto real" },
    );
    expectProblem(
      () => crearTransferenciaPendiente(db, { lineaId: lineIds[0] }, now),
      422,
      "FUENTE_NO_APORTACION",
    );
    expect(presupuesto).toBeString();
  }
  {
    const { db, presupuesto, lineIds } = setup([
      { origen: "S001", destino: "S002", importe: 6000 },
    ]);
    db.run(
      "UPDATE presupuestos SET destino='S005',revision=revision+1,actualizado=? WHERE id=?",
      [stamp, presupuesto],
    );
    expectProblem(
      () => crearTransferenciaPendiente(db, { lineaId: lineIds[0] }, now),
      422,
      "PRESUPUESTO_DESTINO",
    );
  }
  {
    const { db, lineIds } = setup([
      { origen: "S001", destino: "S002", importe: 6000 },
    ]);
    db.run(
      "UPDATE saldos SET estado='Inactiva',revision=revision+1,actualizado=? WHERE id='S002'",
      [stamp],
    );
    expectProblem(
      () => crearTransferenciaPendiente(db, { lineaId: lineIds[0] }, now),
      422,
      "SALDO_NO_ELEGIBLE",
    );
  }
  {
    const { db } = setup([]);
    db.run(
      "INSERT INTO saldos VALUES('S006','Manual ficticio','Efectivo','Manual','Activa',null,0,0,0,null,null,null,null,1,?,?)",
      [stamp, stamp],
    );
    const seeded = seedReparto(db, makeCycle(db, "2026-02-01"), [
      {
        clase: "Adicional",
        presupuesto: null,
        origen: "S001",
        destino: "S006",
        importe: 1000,
      },
    ]);
    expectProblem(
      () => crearTransferenciaPendiente(db, { lineaId: seeded.lineIds[0] }, now),
      422,
      "SALDO_NO_ELEGIBLE",
    );
  }
});

test("I1-09 D8: línea Adicional con Presupuesto histórico inactivo sigue admitida", () => {
  const db = openDatabase(":memory:");
  const ciclo = makeCycle(db, "2026-01-01");
  const inactive = makeBudget(db, {
    fuente: "Aportación a saldo",
    destino: "S005",
  });
  db.run(
    "UPDATE presupuestos SET estado='Inactivo',revision=revision+1,actualizado=? WHERE id=?",
    [stamp, inactive],
  );
  const { lineIds } = seedReparto(db, ciclo, [
    {
      clase: "Adicional",
      presupuesto: null,
      origen: "S003",
      destino: "S005",
      importe: 1200,
      concepto: "Adicional histórica",
    },
  ]);
  const item = crearTransferenciaPendiente(db, { lineaId: lineIds[0] }, now);
  expect(item.estado).toBe("Pendiente de realizar");
  expect(item.presupuesto).toBeNull();
  expect(item.requiereRevision).toBe(false);
  const impact = previewImpactoTransferenciaPendiente(
    db,
    item.id,
    { fechaReal: "2026-01-10" },
    now,
  );
  expect(impact.efectoPresupuestario.aplica).toBe(false);
  expect(impact.efectoPresupuestario.motivo).toContain("histórico inactivo");
});

test("I1-10 auth, Origin/CSRF, 405, 404 e idempotencia obligatoria", async () => {
  const { db, lineIds } = setup([
    { origen: "S001", destino: "S002", importe: 6000 },
  ]);
  const anonymous = http(db);
  expect((await anonymous.request("/api/transferencias-pendientes")).status).toBe(401);
  const api = http(db);
  await api.auth();
  const wrongOrigin = await api.request(
    "/api/transferencias-pendientes",
    "POST",
    { lineaId: lineIds[0] },
    { origin: "http://evil.example", "idempotency-key": randomUUID() },
  );
  expect(wrongOrigin.status).toBe(403);
  expect(wrongOrigin.data.code).toBe("ORIGIN");
  const wrongCsrf = await api.request(
    "/api/transferencias-pendientes",
    "POST",
    { lineaId: lineIds[0] },
    { "x-csrf-token": "incorrecto", "idempotency-key": randomUUID() },
  );
  expect(wrongCsrf.status).toBe(403);
  expect(wrongCsrf.data.code).toBe("CSRF");
  const noKey = await api.request("/api/transferencias-pendientes", "POST", {
    lineaId: lineIds[0],
  });
  expect(noKey.status).toBe(422);
  expect(noKey.data.code).toBe("IDEMPOTENCY_REQUIRED");
  const method = await api.request("/api/transferencias-pendientes", "PUT", {});
  expect(method.status).toBe(405);
  expect(method.headers.get("allow")).toBe("GET, POST");
  const created = await createPending(api.request, lineIds[0]);
  const id = created.data.item.id;
  const itemMethod = await api.request(`/api/transferencias-pendientes/${id}`, "DELETE");
  expect(itemMethod.status).toBe(405);
  expect(itemMethod.headers.get("allow")).toBe("GET, PATCH");
  const actionMethod = await api.request(
    `/api/transferencias-pendientes/${id}/confirmar`,
  );
  expect(actionMethod.status).toBe(405);
  expect(actionMethod.headers.get("allow")).toBe("POST");
  const candidatesMethod = await api.request(
    `/api/transferencias-pendientes/${id}/candidatos`,
    "POST",
    {},
  );
  expect(candidatesMethod.status).toBe(405);
  expect(candidatesMethod.headers.get("allow")).toBe("GET");
  expect(
    (await api.request("/api/transferencias-pendientes/999999")).status,
  ).toBe(404);
});

test("I1-11 PATCH: campos informativos editables y geografía/importe congelados por la línea", async () => {
  // SPEC36 no exige editar importe/origen/destino de un pendiente ya
  // generado: el borrador se edita antes de generar y, tras generar, el
  // esquema v28 congela la línea. Esta prueba documenta esa limitación.
  const { db, lineIds } = setup([
    { origen: "S001", destino: "S002", importe: 6000, concepto: "Presupuesto" },
    {
      clase: "Adicional",
      presupuesto: null,
      origen: "S003",
      destino: "S005",
      importe: 1200,
      concepto: "Adicional",
    },
  ]);
  const api = http(db);
  await api.auth();
  const cases = [
    { linea: lineIds[0], origen: "S005", destino: "S005" },
    { linea: lineIds[1], origen: "S001", destino: "S002" },
  ];
  for (const item of cases) {
    const created = (await createPending(api.request, item.linea)).data.item;
    for (const [field, value] of [
      ["importe", "70.00"],
      ["origen", item.origen],
      ["destino", item.destino],
    ] as const) {
      const rejected = await api.request(
        `/api/transferencias-pendientes/${created.id}`,
        "PATCH",
        { revision: 1, [field]: value },
        { "idempotency-key": randomUUID() },
      );
      expect(rejected.status).toBe(422);
      expect(rejected.data.code).toBe("VALIDATION");
      expect(rejected.data.fields[field]).toContain("congelad");
    }
    const edited = await api.request(
      `/api/transferencias-pendientes/${created.id}`,
      "PATCH",
      {
        revision: 1,
        fechaPrevista: "2026-02-01",
        concepto: "Concepto informativo",
        nota: "Nota informativa",
      },
      { "idempotency-key": randomUUID() },
    );
    expect(edited.status).toBe(200);
    expect(edited.data.item).toMatchObject({
      revision: 2,
      fechaPrevista: "2026-02-01",
      concepto: "Concepto informativo",
      nota: "Nota informativa",
    });
    const ficha = await api.request(
      `/api/transferencias-pendientes/${created.id}`,
    );
    expect(ficha.data.item.revision).toBe(2);
    expect(ficha.data.item.importe).toBe(created.importe);
    expect(ficha.data.item.origen.id).toBe(created.origen.id);
    expect(ficha.data.item.destino.id).toBe(created.destino.id);
  }
});
