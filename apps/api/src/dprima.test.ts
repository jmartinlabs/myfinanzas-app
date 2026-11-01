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

test("AC-22/corte: el gasto del día de corte entra en G y S usa el mismo corte", () => {
  const { db, sub, account } = setup("500");
  const root = partida(db, sub.id, "Raíz corte");
  configure(db, root.id, { fuente: "Aportación a saldo" });
  const hija = partida(db, sub.id, "Hija corte");
  configure(db, hija.id, { padrePartida: root.id });
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
  const line = plan.lineas.find((l) => l.hija === hija.id)!;
  const p = previewLineas(db, plan.planificacion.id, {
    revision: plan.planificacion.revision,
    cambios: [{ id: line.id, importe: "1000", esencial: true }],
    motivo: "Previsión ficticia de corte",
  });
  confirmLineas(
    db,
    plan.planificacion.id,
    {
      revision: plan.planificacion.revision,
      cambios: p.cambios,
      motivo: "Previsión ficticia de corte",
      fingerprint: p.fingerprint,
    },
    randomUUID(),
    now,
  );
  expense(db, account.id, hija.id, "2026-05-25", "100");
  const cutPurchase = expense(db, account.id, hija.id, "2026-06-19", "200");
  expense(db, account.id, hija.id, "2026-06-20", "400");
  const preview = aperturaPreview(db, plan.planificacion.id, {
    ciclo: june.id,
    exclusiones: [],
  });
  expect(preview.corte).toBe("2026-06-19");
  expect(preview.G.bruto).toBe("300.00");
  expect(preview.G.neto).toBe("300.00");
  expect(preview.S).toBe("200.00");
  expect(preview.P).toBe("500.00");
  add(db, {
    tipo: "Devolución de gasto",
    fecha: "2026-06-19",
    importe: "50",
    saldo: account.id,
    partida: hija.id,
    concepto: "Devolución ficticia del día de corte",
    nota: "",
    devolucion: {
      estado: "Verificado",
      compra: cutPurchase.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: "1",
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const withRefund = aperturaPreview(db, plan.planificacion.id, {
    ciclo: june.id,
    exclusiones: [],
  });
  expect(withRefund.G.bruto).toBe("300.00");
  expect(withRefund.G.devoluciones).toBe("50.00");
  expect(withRefund.G.neto).toBe("250.00");
  expect(withRefund.S).toBe("250.00");
  expect(withRefund.P).toBe("500.00");
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

test("A1/AC-11: no se desactiva una hija usada en planificación activa", async () => {
  const { changeClassificationState } = require("./clasificacion");
  const { db, sub, account } = setup("1000");
  const root = partida(db, sub.id, "Raíz AC11");
  configure(db, root.id, { fuente: "Gasto real" });
  const daughter = partida(db, sub.id, "Hija AC11");
  configure(db, daughter.id, { padrePartida: root.id });
  forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-05-01",
    saldoInicial: "1000",
    saldoEvidencia: "Extracto ficticio",
  });
  expect(() =>
    changeClassificationState(
      db,
      "partidas",
      daughter.id,
      {
        revision: (
          db.query("SELECT revision FROM partidas WHERE id=?").get(daughter.id) as {
            revision: number;
          }
        ).revision,
      },
      false,
      now,
    ),
  ).toThrow("planificación activa");
  expect(
    db.query("SELECT estado FROM partidas WHERE id=?").get(daughter.id),
  ).toEqual({ estado: "Activa" });
  db.close();
});

test("A2/E2: una raíz Gasto real no devuelve P ni N", () => {
  const { db, sub, account } = setup("100");
  const root = partida(db, sub.id, "Raíz gasto real E2");
  configure(db, root.id, { fuente: "Gasto real" });
  const daughter = partida(db, sub.id, "Hija gasto real E2");
  configure(db, daughter.id, { padrePartida: root.id });
  const c = cycle(db, "2026-05-20");
  const plan = forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-06-01",
    saldoInicial: "100",
    saldoEvidencia: "Extracto ficticio",
  });
  const line = plan.lineas.find((l) => l.hija === daughter.id)!;
  const p = previewLineas(db, plan.planificacion.id, {
    revision: plan.planificacion.revision,
    cambios: [{ id: line.id, importe: "100", esencial: false }],
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
  expect(preview.P).toBeNull();
  expect(preview.N).toBeNull();
  expect(preview.sugerida).toBeNull();
  expect(preview.motivos.join(" ")).toContain("no aplica por fuente");
  db.close();
});

test("A3: una devolución de compra anterior a la planificación no reduce G", () => {
  const { db, sub, account } = setup("500");
  const root = partida(db, sub.id, "Raíz G previo");
  configure(db, root.id, { fuente: "Aportación a saldo" });
  const daughter = partida(db, sub.id, "Hija G previo");
  configure(db, daughter.id, { padrePartida: root.id });
  cycle(db, "2026-05-20");
  const c = cycle(db, "2026-06-20");
  const plan = forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-07-01",
    saldoInicial: "500",
    saldoEvidencia: "Extracto ficticio",
  });
  const line = plan.lineas.find((l) => l.hija === daughter.id)!;
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
  const previous = expense(db, account.id, daughter.id, "2026-01-10", "30");
  const current = expense(db, account.id, daughter.id, "2026-05-25", "100");
  const legacy = add(db, {
    tipo: "Devolución de gasto",
    fecha: "2026-06-05",
    importe: "10",
    saldo: account.id,
    partida: daughter.id,
    concepto: "Devolución previa ficticia",
    nota: "",
    devolucion: {
      estado: "Verificado",
      compra: previous.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: "1",
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  expect(legacy.movimiento.tipo).toBe("Devolución de gasto");
  add(db, {
    tipo: "Devolución de gasto",
    fecha: "2026-06-06",
    importe: "20",
    saldo: account.id,
    partida: daughter.id,
    concepto: "Devolución actual ficticia",
    nota: "",
    devolucion: {
      estado: "Verificado",
      compra: current.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: "1",
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const preview = aperturaPreview(db, plan.planificacion.id, {
    ciclo: c.id,
    exclusiones: [],
  });
  expect(preview.G.bruto).toBe("100.00");
  expect(preview.G.devoluciones).toBe("20.00");
  expect(preview.G.neto).toBe("80.00");
  db.close();
});

test("A4: la fuente aplicada en el ciclo manda en la apertura", () => {
  const { db, sub, account } = setup("0");
  const root = partida(db, sub.id, "Raíz fuente aplicada");
  const daughter = partida(db, sub.id, "Hija fuente aplicada");
  configure(db, daughter.id, { padrePartida: root.id });
  const c = cycle(db, "2026-05-20");
  const plan = forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-06-01",
    saldoInicial: "100",
    saldoEvidencia: "Extracto ficticio",
  });
  const line = plan.lineas.find((l) => l.hija === daughter.id)!;
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
  writeMensual(
    db,
    c.id,
    {
      raiz: root.id,
      fuente: "Aportación a saldo",
      destino: account.id,
      base: null,
      esencial: null,
      delMes: null,
      revision: 0,
    },
    randomUUID(),
    now,
  );
  const preview = aperturaPreview(db, plan.planificacion.id, {
    ciclo: c.id,
    exclusiones: [],
  });
  expect(preview.fuente).toBe("Aportación a saldo");
  expect(preview.N).toBe(1);
  expect(preview.sugerida).toBe("50.00");
  db.close();
});

test("A5: el mensual de Gasto real conserva el importe íntegro", () => {
  const { db, sub, account } = setup("500");
  const root = partida(db, sub.id, "Raíz íntegra");
  configure(db, root.id, { fuente: "Gasto real" });
  const daughter = partida(db, sub.id, "Hija íntegra");
  configure(db, daughter.id, { padrePartida: root.id });
  const c = cycle(db, "2026-05-20");
  const buy = expense(db, account.id, daughter.id, "2026-05-21", "100");
  add(db, {
    tipo: "Devolución de gasto",
    fecha: "2026-05-22",
    importe: "20",
    saldo: account.id,
    partida: daughter.id,
    concepto: "Devolución ficticia",
    nota: "",
    devolucion: {
      estado: "Verificado",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: "1",
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const mensual = getPlanMensualDprima(db, c.id, now);
  const item = mensual.items.find((i) => i.raiz === root.id)!;
  expect(item.bruto).toBe("100.00");
  expect(item.devoluciones).toBe("20.00");
  expect(item.ejecutado).toBe("100.00");
  expect(item.pendiente).toBeNull();
  db.close();
});

test("M1/M2: el mensual incluye todas las raíces y una previsión reserva el destino", () => {
  const { db, sub, account } = setup("1000");
  const a = partida(db, sub.id, "Raíz mensual A");
  configure(db, a.id, { fuente: "Aportación a saldo" });
  const b = partida(db, sub.id, "Raíz mensual B");
  configure(db, b.id, { fuente: "Aportación a saldo" });
  const c = cycle(db, "2026-05-20");
  cycle(db, "2026-06-20");
  writeMensual(
    db,
    c.id,
    {
      raiz: a.id,
      fuente: "Aportación a saldo",
      destino: account.id,
      base: null,
      esencial: null,
      delMes: "100",
      revision: 0,
    },
    randomUUID(),
    now,
  );
  forecast(db, {
    padre: b.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-06-01",
    saldoInicial: "1000",
    saldoEvidencia: "Extracto ficticio",
  });
  const mensual = getPlanMensualDprima(db, c.id, now);
  expect(mensual.items.map((i) => i.raiz).sort()).toEqual([a.id, b.id].sort());
  const item = mensual.items.find((i) => i.raiz === a.id)!;
  expect(item.ejecutado).toBeNull();
  expect(item.motivo).toContain("Destino compartido");
  db.close();
});

test("M7: una rectificación no puede mover un Gasto a una raíz con hijas", () => {
  const { db, sub, account } = setup("1000");
  const root = partida(db, sub.id, "Raíz protegida rectificación");
  configure(db, root.id, { fuente: "Gasto real" });
  const daughter = partida(db, sub.id, "Hija protegida");
  configure(db, daughter.id, { padrePartida: root.id });
  const simple = partida(db, sub.id, "Partida simple rectificación");
  configure(db, simple.id, { fuente: "Gasto real" });
  const buy = expense(db, account.id, simple.id, "2026-05-21", "10");
  const current = buy.movimiento;
  const body = {
    tipo: "Gasto",
    fecha: current.fecha,
    importe: current.importe,
    saldo: current.origen.id,
    partida: root.id,
    concepto: current.concepto,
    nota: current.nota,
    revision: current.revision,
    motivo: "Reatribución ficticia",
  };
  const plan = previewMovement(db, body, current.id, false, now);
  expect(() =>
    writeMovement(
      db,
      { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
      randomUUID(),
      current.id,
      false,
      now,
    ),
  ).toThrow();
  expect(
    db.query("SELECT partida FROM movimientos WHERE id=?").get(current.id),
  ).toEqual({ partida: simple.id });
  db.close();
});

test("M5: la apertura no escribe del mes con un destino distinto del Saldo exclusivo", () => {
  const { db, sub, account } = setup("0");
  const root = partida(db, sub.id, "Raíz destino coherente");
  configure(db, root.id, { fuente: "Aportación a saldo" });
  const daughter = partida(db, sub.id, "Hija destino coherente");
  configure(db, daughter.id, { padrePartida: root.id });
  const c = cycle(db, "2026-05-20");
  const plan = forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-06-01",
    saldoInicial: "0",
    saldoEvidencia: "Extracto ficticio",
  });
  const line = plan.lineas.find((l) => l.hija === daughter.id)!;
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
  writeMensual(
    db,
    c.id,
    {
      raiz: root.id,
      fuente: "Aportación a saldo",
      destino: "S001",
      base: null,
      esencial: null,
      delMes: null,
      revision: 0,
    },
    randomUUID(),
    now,
  );
  const preview = aperturaPreview(db, plan.planificacion.id, {
    ciclo: c.id,
    exclusiones: [],
  });
  expect(() =>
    confirmApertura(
      db,
      plan.planificacion.id,
      {
        ciclo: c.id,
        exclusiones: [],
        fingerprint: preview.fingerprint,
        motivo: "Apertura ficticia",
      },
      randomUUID(),
      now,
    ),
  ).toThrow("destino mensual no coincide");
  db.close();
});

test("M6: una segunda apertura con otra clave devuelve conflicto coherente", () => {
  const { db, sub, account } = setup("0");
  const root = partida(db, sub.id, "Raíz apertura única");
  configure(db, root.id, { fuente: "Aportación a saldo" });
  const daughter = partida(db, sub.id, "Hija apertura única");
  configure(db, daughter.id, { padrePartida: root.id });
  const c = cycle(db, "2026-05-20");
  const plan = forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-06-01",
    saldoInicial: "0",
    saldoEvidencia: "Extracto ficticio",
  });
  const line = plan.lineas.find((l) => l.hija === daughter.id)!;
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
  confirmApertura(db, plan.planificacion.id, body, randomUUID(), now);
  expect(() =>
    confirmApertura(db, plan.planificacion.id, body, randomUUID(), now),
  ).toThrow("ya está confirmada");
  db.close();
});

test("A6: cambiar fuente o destino de una fila mensual exige impacto", () => {
  const { db, sub, account } = setup("0");
  const root = partida(db, sub.id, "Raíz sin cambio libre");
  configure(db, root.id, { fuente: "Aportación a saldo" });
  const c = cycle(db, "2026-05-20");
  writeMensual(
    db,
    c.id,
    {
      raiz: root.id,
      fuente: "Aportación a saldo",
      destino: account.id,
      base: null,
      esencial: null,
      delMes: "10",
      revision: 0,
    },
    randomUUID(),
    now,
  );
  expect(() =>
    writeMensual(
      db,
      c.id,
      {
        raiz: root.id,
        fuente: "Aportación a saldo",
        destino: "S001",
        base: null,
        esencial: null,
        delMes: "10",
        revision: 1,
      },
      randomUUID(),
      now,
    ),
  ).toThrow("revisión de impacto");
  db.close();
});

test("M4: añadir la primera hija a una raíz con histórico exige revisión", () => {
  const { db, sub, account } = setup("1000");
  const root = partida(db, sub.id, "Raíz con histórico M4");
  configure(db, root.id, { fuente: "Gasto real" });
  expense(db, account.id, root.id, "2026-01-10", "10");
  const daughter = partida(db, sub.id, "Hija nueva M4");
  const preview = previewPartidaConfig(db, daughter.id, {
    cambios: { padrePartida: root.id },
    motivo: "Alta de hija ficticia",
  });
  expect(preview.bloqueos.join(" ")).toContain("Gastos históricos");
  expect(() =>
    confirmPartidaConfig(
      db,
      daughter.id,
      {
        cambios: { padrePartida: root.id },
        motivo: "Alta de hija ficticia",
        fingerprint: preview.fingerprint,
      },
      randomUUID(),
      now,
    ),
  ).toThrow("Gastos históricos");
  expect(
    db.query("SELECT padre_partida FROM partidas WHERE id=?").get(daughter.id),
  ).toEqual({ padre_partida: null });
  db.close();
});

test("A2b: una apertura de Gasto real se confirma sin N, sin romper la fila", () => {
  const { db, sub, account } = setup("100");
  const root = partida(db, sub.id, "Raíz apertura real");
  configure(db, root.id, { fuente: "Gasto real" });
  const daughter = partida(db, sub.id, "Hija apertura real");
  configure(db, daughter.id, { padrePartida: root.id });
  const c = cycle(db, "2026-05-20");
  const plan = forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-06-01",
    saldoInicial: "100",
    saldoEvidencia: "Extracto ficticio",
  });
  const line = plan.lineas.find((l) => l.hija === daughter.id)!;
  const p = previewLineas(db, plan.planificacion.id, {
    revision: plan.planificacion.revision,
    cambios: [{ id: line.id, importe: "100", esencial: false }],
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
  const confirmed = confirmApertura(
    db,
    plan.planificacion.id,
    {
      ciclo: c.id,
      exclusiones: [],
      fingerprint: preview.fingerprint,
      motivo: "Apertura ficticia",
    },
    randomUUID(),
    now,
  );
  expect(confirmed.apertura.importe).toBeNull();
  expect(confirmed.apertura.restantes).toBeNull();
  db.close();
});

test("M6: el solape de planificación devuelve 409, no error interno", () => {
  const { db, sub, account } = setup("1000");
  const root = partida(db, sub.id, "Raíz solape");
  configure(db, root.id, { fuente: "Gasto real" });
  forecast(db, {
    padre: root.id,
    saldo: account.id,
    mesInicial: "2026-05-01",
    mesFinal: "2026-06-01",
    saldoInicial: "1000",
    saldoEvidencia: "Extracto ficticio",
  });
  expect(() =>
    forecast(db, {
      padre: root.id,
      saldo: account.id,
      mesInicial: "2026-06-01",
      mesFinal: "2026-07-01",
      saldoInicial: "1000",
      saldoEvidencia: "Extracto ficticio",
    }),
  ).toThrow("solapa");
  db.close();
});
