import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { createSaldo } from "./saldos";
import { createClassification } from "./clasificacion";
import { createCycle, cycleContext } from "./ciclos";
import { previewMovement, writeMovement } from "./movimientos";
import {
  aperturaPreview,
  confirmApertura,
  confirmLineas,
  confirmMapping,
  confirmPartidaConfig,
  createPlanificacion,
  getPlanificacion,
  getPlanMensualDprima,
  listDprimaPartidas,
  listPlanificaciones,
  mappingProposal,
  previewLineas,
  previewPartidaConfig,
  writeMensual,
} from "./dprima";

const now = Date.parse("2026-10-21T12:00:00Z");
process.env.NODE_ENV = "test";

function setup(opening = "0") {
  const db = openDatabase(":memory:");
  const category = createClassification(
    db,
    "categorias",
    {
      nombre: "Gastos ficticios D′",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Subcategoría ficticia D′", padre: category.id },
    randomUUID(),
  );
  const account = createSaldo(
    db,
    {
      nombre: "Cuenta ficticia D′",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: opening,
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  );
  return { db, category, sub, account };
}
function add(
  db: Database,
  body: Record<string, unknown>,
  nowMs = now,
) {
  const plan = previewMovement(db, body, null, false, nowMs);
  return writeMovement(
    db,
    {
      ...body,
      fingerprint: plan.fingerprint,
      contextRevision: plan.contextRevision,
    },
    randomUUID(),
    null,
    false,
    nowMs,
  );
}
function partida(
  db: Database,
  sub: string,
  nombre: string,
  extra: Record<string, unknown> = {},
) {
  return createClassification(
    db,
    "partidas",
    { nombre, padre: sub, ...extra },
    randomUUID(),
  );
}
function configure(
  db: Database,
  id: string,
  cambios: Record<string, unknown>,
) {
  const preview = previewPartidaConfig(db, id, {
    cambios,
    motivo: "Configuración ficticia D′",
  });
  if (preview.bloqueos.length) throw new Error(preview.bloqueos.join(" "));
  return confirmPartidaConfig(
    db,
    id,
    {
      cambios,
      motivo: "Configuración ficticia D′",
      fingerprint: preview.fingerprint,
    },
    randomUUID(),
    now,
  );
}
function cycle(db: Database, inicio: string) {
  return createCycle(
    db,
    {
      inicio,
      saldoInicialComida: "0",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  ).ciclo;
}
function expense(
  db: Database,
  account: string,
  partidaId: string,
  fecha: string,
  importe: string,
) {
  return add(db, {
    tipo: "Gasto",
    fecha,
    importe,
    saldo: account,
    partida: partidaId,
    concepto: "Gasto ficticio D′",
    nota: "",
  });
}
function forecast(
  db: Database,
  body: Record<string, unknown>,
  attempt = randomUUID(),
) {
  return createPlanificacion(db, body, attempt, now);
}

test("AC-01: raíz simple y raíz con dos hijas son planificables sin tipo nuevo", () => {
  const { db, sub } = setup();
  const simple = partida(db, sub.id, "Raíz simple ficticia");
  configure(db, simple.id, { fuente: "Gasto real" });
  const root = partida(db, sub.id, "Raíz agrupada ficticia");
  configure(db, root.id, { fuente: "Aportación a saldo" });
  const a = partida(db, sub.id, "Hija A ficticia");
  const b = partida(db, sub.id, "Hija B ficticia");
  configure(db, a.id, { padrePartida: root.id });
  configure(db, b.id, { padrePartida: root.id });
  const list = listDprimaPartidas(db);
  const simpleRoot = list.raices.find((r) => r.id === simple.id)!;
  const grouped = list.raices.find((r) => r.id === root.id)!;
  expect(simpleRoot.hijas).toHaveLength(0);
  expect(grouped.hijas.map((h) => h.id).sort()).toEqual([a.id, b.id].sort());
  expect(grouped.categoria?.id).toBeDefined();
  db.close();
});

test("AC-03/04: la copia inicial de hijas es una propuesta y el ejecutado es global", () => {
  const { db, sub, account } = setup("1000");
  const root = partida(db, sub.id, "Raíz agrupada");
  configure(db, root.id, { fuente: "Gasto real" });
  const a = partida(db, sub.id, "Hija A");
  configure(db, a.id, { padrePartida: root.id });
  const b = partida(db, sub.id, "Hija B");
  configure(db, b.id, { padrePartida: root.id });
  const plan = forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-07-01",
    saldoInicial: "1000",
    saldoEvidencia: "Extracto ficticio",
    copiarHijas: true,
  });
  expect(plan.lineas).toHaveLength(2);
  const c = partida(db, sub.id, "Hija C posterior");
  configure(db, c.id, { padrePartida: root.id });
  expect(getPlanificacion(db, plan.planificacion.id).lineas).toHaveLength(2);
  const preview = previewLineas(db, plan.planificacion.id, {
    revision: plan.planificacion.revision,
    cambios: [
      { id: plan.lineas.find((l) => l.hija === a.id)!.id, importe: "100", esencial: true },
      { hija: a.id, importe: "100", esencial: false },
    ],
    motivo: "Dos previsiones ficticias",
  });
  expect(preview.cambios).toHaveLength(2);
  const updated = confirmLineas(
    db,
    plan.planificacion.id,
    {
      revision: plan.planificacion.revision,
      cambios: preview.cambios,
      motivo: "Dos previsiones ficticias",
      fingerprint: preview.fingerprint,
    },
    randomUUID(),
    now,
  );
  expect(updated.lineas.filter((l) => !l.anulada)).toHaveLength(3);
  expense(db, account.id, a.id, "2026-05-25", "80");
  const mensual = getPlanMensualDprima(db, cycle(db, "2026-05-20").id, now);
  const item = mensual.items.find((i) => i.raiz === root.id)!;
  expect(item.ejecutado).toBe("80.00");
  db.close();
});

test("AC-05: T1000/G200/S300/N2 produce P500 y sugerida250 sin doble saldo inicial", () => {
  const { db, sub, account } = setup("500");
  const root = partida(db, sub.id, "Raíz aportación");
  configure(db, root.id, { fuente: "Aportación a saldo" });
  const a = partida(db, sub.id, "Hija aportación");
  configure(db, a.id, { padrePartida: root.id });
  cycle(db, "2026-05-20");
  const june = cycle(db, "2026-06-20");
  const plan = forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-08-01",
    saldoInicial: "500",
    saldoEvidencia: "Extracto ficticio",
  });
  const line = plan.lineas.find((l) => l.hija === a.id)!;
  const p1 = previewLineas(db, plan.planificacion.id, {
    revision: plan.planificacion.revision,
    cambios: [{ id: line.id, importe: "1000", esencial: true }],
    motivo: "Previsión ficticia",
  });
  confirmLineas(
    db,
    plan.planificacion.id,
    {
      revision: plan.planificacion.revision,
      cambios: p1.cambios,
      motivo: "Previsión ficticia",
      fingerprint: p1.fingerprint,
    },
    randomUUID(),
    now,
  );
  expense(db, account.id, a.id, "2026-06-01", "200");
  const preview = aperturaPreview(db, plan.planificacion.id, {
    ciclo: june.id,
    exclusiones: [],
  });
  expect(preview.T).toBe("1000.00");
  expect(preview.G.neto).toBe("200.00");
  expect(preview.S).toBe("300.00");
  expect(preview.N).toBe(2);
  expect(preview.P).toBe("500.00");
  expect(preview.sugerida).toBe("250.00");
  db.close();
});

test("AC-06: dos planificaciones con el mismo Saldo bloquean S y no sugieren cero", () => {
  const { db, sub, account } = setup("1000");
  const r1 = partida(db, sub.id, "Raíz A");
  configure(db, r1.id, { fuente: "Aportación a saldo" });
  const r2 = partida(db, sub.id, "Raíz B");
  configure(db, r2.id, { fuente: "Aportación a saldo" });
  const c = cycle(db, "2026-05-20");
  const p1 = forecast(db, {
    padre: r1.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-06-01",
    saldoInicial: "1000",
    saldoEvidencia: "Extracto ficticio",
  });
  forecast(db, {
    padre: r2.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-06-01",
    saldoInicial: "1000",
    saldoEvidencia: "Extracto ficticio",
  });
  const preview = aperturaPreview(db, p1.planificacion.id, {
    ciclo: c.id,
    exclusiones: [],
  });
  expect(preview.S).toBeNull();
  expect(preview.sugerida).toBeNull();
  expect(preview.motivos.join(" ")).toContain("Saldo exclusivo");
  db.close();
});

test("AC-25/E1: T incompleto no sugiere; la exclusión manual permite T0 con motivo", () => {
  const { db, sub, account } = setup("100");
  const root = partida(db, sub.id, "Raíz previstos");
  configure(db, root.id, { fuente: "Aportación a saldo" });
  const ibi = partida(db, sub.id, "IBI ficticio");
  configure(db, ibi.id, { padrePartida: root.id });
  const seguro = partida(db, sub.id, "Seguro ficticio");
  configure(db, seguro.id, { padrePartida: root.id });
  const c = cycle(db, "2026-05-20");
  const plan = forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-06-01",
    saldoInicial: "100",
    saldoEvidencia: "Extracto ficticio",
  });
  const ibiLine = plan.lineas.find((l) => l.hija === ibi.id)!;
  const seguroLine = plan.lineas.find((l) => l.hija === seguro.id)!;
  const p = previewLineas(db, plan.planificacion.id, {
    revision: plan.planificacion.revision,
    cambios: [
      { id: ibiLine.id, importe: "100", esencial: true },
      { id: seguroLine.id, importe: null, esencial: true },
    ],
    motivo: "Previsión ficticia",
  });
  confirmLineas(
    db,
    plan.planificacion.id,
    {
      revision: plan.planificacion.revision,
      cambios: p.cambios,
      motivo: "Previsión ficticia",
      fingerprint: p.fingerprint,
    },
    randomUUID(),
    now,
  );
  const incomplete = aperturaPreview(db, plan.planificacion.id, {
    ciclo: c.id,
    exclusiones: [],
  });
  expect(incomplete.T).toBeNull();
  expect(incomplete.subtotal).toBe("100.00");
  expect(incomplete.sugerida).toBeNull();
  expect(incomplete.lineas.pendientes).toEqual([seguroLine.id]);
  const complete = aperturaPreview(db, plan.planificacion.id, {
    ciclo: c.id,
    exclusiones: [seguroLine.id],
  });
  expect(complete.T).toBe("100.00");
  expect(complete.P).toBe("0.00");
  expect(complete.sugerida).toBe("0.00");
  expect(complete.lineas.excluidas[0].linea).toBe(seguroLine.id);
  db.close();
});

test("AC-26/E2: Gasto real no genera cuota; Aportación sí, y confirmar no ejecuta transferencia", () => {
  const { db, sub, account } = setup("20");
  const realRoot = partida(db, sub.id, "Raíz gasto real");
  configure(db, realRoot.id, { fuente: "Gasto real" });
  const daughter = partida(db, sub.id, "Hija gasto real");
  configure(db, daughter.id, { padrePartida: realRoot.id });
  const aportacion = partida(db, sub.id, "Raíz aportación E2");
  configure(db, aportacion.id, { fuente: "Aportación a saldo" });
  const a = partida(db, sub.id, "Hija aportación E2");
  configure(db, a.id, { padrePartida: aportacion.id });
  const aportAccount = createSaldo(
    db,
    {
      nombre: "Cuenta exclusiva aportación ficticia",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "20",
      fechaApertura: "2026-01-01",
    },
    randomUUID(),
    now,
  );
  const c = cycle(db, "2026-05-20");
  expense(db, account.id, daughter.id, "2026-05-21", "80");
  const realPlan = forecast(db, {
    padre: realRoot.id,
    saldo: account.id,
    mesInicial: "2026-06-01",
    mesFinal: "2026-06-01",
    saldoInicial: "20",
    saldoEvidencia: "Extracto ficticio",
  });
  const line = realPlan.lineas.find((l) => l.hija === daughter.id)!;
  const p1 = previewLineas(db, realPlan.planificacion.id, {
    revision: realPlan.planificacion.revision,
    cambios: [{ id: line.id, importe: "100", esencial: false }],
    motivo: "Previsión ficticia",
  });
  confirmLineas(
    db,
    realPlan.planificacion.id,
    {
      revision: realPlan.planificacion.revision,
      cambios: p1.cambios,
      motivo: "Previsión ficticia",
      fingerprint: p1.fingerprint,
    },
    randomUUID(),
    now,
  );
  const realPreview = aperturaPreview(db, realPlan.planificacion.id, {
    ciclo: c.id,
    exclusiones: [],
  });
  expect(realPreview.fuente).toBe("Gasto real");
  expect(realPreview.sugerida).toBeNull();
  expect(realPreview.motivos.join(" ")).toContain("no aplica por fuente");
  const aportPlan = forecast(db, {
    padre: aportacion.id,
    saldo: aportAccount.id,
    mesInicial: "2026-06-01",
    mesFinal: "2026-06-01",
    saldoInicial: "20",
    saldoEvidencia: "Extracto ficticio",
  });
  const aportLine = aportPlan.lineas.find((l) => l.hija === a.id)!;
  const p2 = previewLineas(db, aportPlan.planificacion.id, {
    revision: aportPlan.planificacion.revision,
    cambios: [{ id: aportLine.id, importe: "100", esencial: false }],
    motivo: "Previsión ficticia",
  });
  confirmLineas(
    db,
    aportPlan.planificacion.id,
    {
      revision: aportPlan.planificacion.revision,
      cambios: p2.cambios,
      motivo: "Previsión ficticia",
      fingerprint: p2.fingerprint,
    },
    randomUUID(),
    now,
  );
  const before = db.query("SELECT COUNT(*) n FROM movimientos").get();
  const preview = aperturaPreview(db, aportPlan.planificacion.id, {
    ciclo: c.id,
    exclusiones: [],
  });
  const confirmed = confirmApertura(
    db,
    aportPlan.planificacion.id,
    {
      ciclo: c.id,
      exclusiones: [],
      fingerprint: preview.fingerprint,
      motivo: "Apertura ficticia",
    },
    randomUUID(),
    now,
  );
  expect(confirmed.apertura.importe).toBe("80.00");
  expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual(before);
  const mensual = getPlanMensualDprima(db, c.id, now);
  const item = mensual.items.find((i) => i.raiz === aportacion.id)!;
  expect(item.delMes).toBe("80.00");
  expect(item.ejecutado).toBe("0.00");
  expect(item.pendiente).toBe("80.00");
  db.close();
});

test("AC-23: céntimos y saldo negativo se conservan sin truncar", () => {
  const { db, sub, account } = setup("150");
  const root = partida(db, sub.id, "Raíz céntimos");
  configure(db, root.id, { fuente: "Aportación a saldo" });
  const a = partida(db, sub.id, "Hija céntimos");
  configure(db, a.id, { padrePartida: root.id });
  cycle(db, "2026-04-20");
  const c = cycle(db, "2026-05-20");
  const plan = forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-04-01",
    mesFinal: "2026-08-01",
    saldoInicial: "-50",
    saldoEvidencia: "Extracto ficticio",
  });
  const line = plan.lineas.find((l) => l.hija === a.id)!;
  const p = previewLineas(db, plan.planificacion.id, {
    revision: plan.planificacion.revision,
    cambios: [{ id: line.id, importe: "1000", esencial: false }],
    motivo: "Previsión ficticia",
  });
  confirmLineas(
    db,
    plan.planificacion.id,
    {
      revision: plan.planificacion.revision,
      cambios: p.cambios,
      motivo: "Previsión ficticia",
      fingerprint: p.fingerprint,
    },
    randomUUID(),
    now,
  );
  expense(db, account.id, a.id, "2026-04-25", "200");
  const preview = aperturaPreview(db, plan.planificacion.id, {
    ciclo: c.id,
    exclusiones: [],
  });
  expect(preview.S).toBe("-50.00");
  expect(preview.P).toBe("850.00");
  expect(preview.N).toBe(3);
  expect(preview.sugerida).toBe("283.33");
  db.close();
});

test("AC-21: una raíz con hijas rechaza Gastos nuevos y conserva el histórico", () => {
  const { db, sub, account } = setup("1000");
  const root = partida(db, sub.id, "Raíz agrupada con histórico");
  configure(db, root.id, { fuente: "Gasto real" });
  const daughter = partida(db, sub.id, "Hija agrupada");
  configure(db, daughter.id, { padrePartida: root.id });
  expense(db, account.id, daughter.id, "2026-05-21", "10");
  expect(() => expense(db, account.id, root.id, "2026-05-22", "5")).toThrow();
  expect(
    (
      db.query("SELECT COUNT(*) n FROM movimientos WHERE partida=?").get(root.id) as {
        n: number;
      }
    ).n,
  ).toBe(0);
  db.close();
});

test("AC-14/17: el mapping no convierte Presupuestos ni reparte el objetivo", () => {
  const { db, sub } = setup();
  db.run(
    "INSERT INTO presupuestos VALUES('PRE910','Plan agrupado ficticio','Gasto real','S001','Activo',1,'f','f')",
  );
  db.run(
    "INSERT INTO presupuestos VALUES('PRE911','Plan sin Partida ficticio','Gasto real','S001','Activo',1,'f','f')",
  );
  const a = partida(db, sub.id, "Partida A mapping", { presupuesto: "PRE910" });
  const b = partida(db, sub.id, "Partida B mapping", { presupuesto: "PRE910" });
  const c = partida(db, sub.id, "Partida sin presupuesto mapping");
  db.run(
    `INSERT INTO annual_plan_lines(ejercicio,partida,presupuesto,periodo,esencial,revision)
     VALUES('2026',?,120000,'Anual','Sí',1)`,
    [a.id],
  );
  const proposal = mappingProposal(db);
  const grouped = proposal.propuestas.find((p) => p.presupuesto === "PRE910")!;
  expect(grouped.candidatas).toEqual([a.id, b.id]);
  expect(grouped.motivo).toContain("sin repartir");
  const empty = proposal.propuestas.find((p) => p.presupuesto === "PRE911")!;
  expect(empty.relacion).toBe("Presupuesto sin Partida");
  const unplanned = proposal.propuestas.find((p) => p.partida === c.id)!;
  expect(unplanned.relacion).toBe("Partida sin planificación");
  expect(
    (proposal.anual.find((x: any) => x.partida === a.id) as any).importe,
  ).toBe("120000");
  const before = db.query("SELECT COUNT(*) n FROM presupuestos").get();
  confirmMapping(
    db,
    {
      propuestas: [
        {
          presupuesto: "PRE910",
          partida: a.id,
          relacion: "Raíz",
          motivo: "Raíz elegida explícitamente; B queda como histórica.",
        },
      ],
      motivo: "Mapping ficticio revisado",
      fingerprint: proposal.fingerprint,
    },
    randomUUID(),
    now,
  );
  expect(db.query("SELECT COUNT(*) n FROM presupuestos").get()).toEqual(before);
  expect(db.query("SELECT COUNT(*) n FROM dprima_mapping").get()).toEqual({
    n: 1,
  });
  expect(db.query("SELECT COUNT(*) n FROM partidas WHERE id=?").get(a.id)).toEqual({
    n: 1,
  });
  db.close();
});

test("AC-10: una apertura reintentada no duplica el hecho ni el importe", () => {
  const { db, sub, account } = setup("100");
  const root = partida(db, sub.id, "Raíz idempotente");
  configure(db, root.id, { fuente: "Aportación a saldo" });
  const a = partida(db, sub.id, "Hija idempotente");
  configure(db, a.id, { padrePartida: root.id });
  const c = cycle(db, "2026-04-20");
  const plan = forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-05-01",
    saldoInicial: "100",
    saldoEvidencia: "Extracto ficticio",
  });
  const line = plan.lineas.find((l) => l.hija === a.id)!;
  const p = previewLineas(db, plan.planificacion.id, {
    revision: plan.planificacion.revision,
    cambios: [{ id: line.id, importe: "50", esencial: false }],
    motivo: "Previsión ficticia",
  });
  confirmLineas(
    db,
    plan.planificacion.id,
    {
      revision: plan.planificacion.revision,
      cambios: p.cambios,
      motivo: "Previsión ficticia",
      fingerprint: p.fingerprint,
    },
    randomUUID(),
    now,
  );
  const preview = aperturaPreview(db, plan.planificacion.id, {
    ciclo: c.id,
    exclusiones: [],
  });
  const body = {
    ciclo: c.id,
    exclusiones: [],
    fingerprint: preview.fingerprint,
    motivo: "Apertura ficticia",
  };
  const key = randomUUID();
  const first = confirmApertura(db, plan.planificacion.id, body, key, now);
  const second = confirmApertura(db, plan.planificacion.id, body, key, now);
  expect(second.apertura.id).toBe(first.apertura.id);
  expect(db.query("SELECT COUNT(*) n FROM dprima_aperturas").get()).toEqual({
    n: 1,
  });
  db.close();
});
