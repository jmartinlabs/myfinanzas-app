import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { createSaldo } from "./saldos";
import {
  createClassification,
} from "./clasificacion";
import { createCycle, cycleContext } from "./ciclos";
import {
  getMovement,
  previewMovement,
  writeMovement,
} from "./movimientos";
import {
  activateRegimen,
  comidaMetrics,
  getComidaMovement,
  listComida,
  prepareRegimen,
  writeComidaDevolucion,
  writeComidaMetadata,
  writeComidaRol,
} from "./comida";
import { getCyclePlan, planConfigurationImpact } from "./planes-ciclo";

const now = Date.parse("2026-10-21T12:00:00Z");
process.env.NODE_ENV = "test";

function setup() {
  const db = openDatabase(":memory:");
  const category = createClassification(
    db,
    "categorias",
    {
      nombre: "Gastos ficticios Comida",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Subcategoría ficticia Comida", padre: category.id },
    randomUUID(),
  );
  db.run(
    "INSERT INTO presupuestos VALUES('PRE900','Plan ficticio Comida','Gasto real','S001','Activo',1,'f','f')",
  );
  const budget = { id: "PRE900" };
  const food = createClassification(
    db,
    "partidas",
    {
      nombre: "Supermercado ficticio",
      padre: sub.id,
      presupuesto: budget.id,
    },
    randomUUID(),
  );
  const leisure = createClassification(
    db,
    "partidas",
    {
      nombre: "Ocio ficticio",
      padre: sub.id,
      presupuesto: budget.id,
    },
    randomUUID(),
  );
  const account = createSaldo(
    db,
    {
      nombre: "Cuenta ficticia origen",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "1000",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  );
  const ing = createSaldo(
    db,
    {
      nombre: "ING Comida ficticia",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "100",
      fechaApertura: "2026-06-20",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  );
  const cycle1 = createCycle(
    db,
    {
      inicio: "2026-06-20",
      saldoInicialComida: "100",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  ).ciclo;
  createCycle(
    db,
    {
      inicio: "2026-07-20",
      saldoInicialComida: "100",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  );
  return { db, category, sub, budget, food, leisure, account, ing, cycle1 };
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
function purchase(
  db: Database,
  ing: { id: string },
  partida: string,
  over: Record<string, unknown> = {},
) {
  return add(db, {
    tipo: "Gasto",
    fecha: "2026-07-05",
    importe: "50",
    saldo: ing.id,
    partida,
    concepto: "Compra ficticia",
    nota: "",
    ...over,
  });
}
function refund(
  db: Database,
  ing: { id: string },
  over: Record<string, unknown> = {},
) {
  return add(db, {
    tipo: "Devolución de gasto",
    fecha: "2026-07-10",
    importe: "15",
    saldo: ing.id,
    concepto: "Devolución ficticia",
    nota: "",
    ...over,
  });
}
function transfer(
  db: Database,
  from: { id: string },
  to: { id: string },
  amount = "800",
  fecha = "2026-06-20",
) {
  return add(db, {
    tipo: "Transferencia",
    fecha,
    importe: amount,
    origen: from.id,
    destino: to.id,
    concepto: "Financiación ficticia",
    nota: "",
  });
}

test("CU-02: una compra es un único Movimiento y Revisión muestra su ID sin duplicar", () => {
  const { db, ing, food } = setup();
  const result = purchase(db, ing, food.id, {
    importe: "45",
    comida: { etiqueta: "Comida", evidenciaBancaria: "Extracto ficticio E-01" },
  });
  const id = result.movimiento.id;
  expect(
    (
      db.query("SELECT COUNT(*) n FROM movimientos WHERE tipo='Gasto'").get() as {
        n: number;
      }
    ).n,
  ).toBe(1);
  expect(getMovement(db, id).movimiento.partida?.id).toBe(food.id);
  const view = getComidaMovement(db, id);
  expect(view.metadata?.etiqueta).toBe("Comida");
  expect(view.movimiento.importe).toBe("45.00");
  const list = listComida(db);
  expect(list.items.map((i) => i.id)).toContain(id);
  expect(list.items.find((i) => i.id === id)?.etiqueta).toBe("Comida");
  expect(list.items.find((i) => i.id === id)?.fuente).toBe("Individual");
  db.close();
});

test("CU-01: la financiación es Transferencia y crea cero Gastos", () => {
  const { db, account, ing } = setup();
  const before = (
    db.query("SELECT COUNT(*) n FROM movimientos WHERE tipo='Gasto'").get() as {
      n: number;
    }
  ).n;
  const t = transfer(db, account, ing);
  expect(t.movimiento.tipo).toBe("Transferencia");
  expect(
    (
      db.query("SELECT COUNT(*) n FROM movimientos WHERE tipo='Gasto'").get() as {
        n: number;
      }
    ).n,
  ).toBe(before);
  db.close();
});

test("CU-06/P4: la devolución es entrada bancaria real, sin Ingreso artificial, y el vínculo es íntegro", () => {
  const { db, ing, account, food, cycle1 } = setup();
  const buy = purchase(db, ing, food.id, { importe: "20" });
  const first = refund(db, account, {
    importe: "12",
    partida: food.id,
    devolucion: {
      estado: "Verificado",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  expect(first.movimiento.tipo).toBe("Devolución de gasto");
  expect(
    (
      db.query(
        "SELECT COUNT(*) n FROM movimientos WHERE tipo IN ('Ingreso','Gasto') AND concepto='Devolución ficticia'",
      ).get() as { n: number }
    ).n,
  ).toBe(0);
  const second = refund(db, ing, {
    importe: "13",
    partida: food.id,
    devolucion: {
      estado: "Revisar",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio 2",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  expect(getComidaMovement(db, second.movimiento.id).devolucion?.estado).toBe(
    "Revisar",
  );
  expect(
    getComidaMovement(db, first.movimiento.id).devolucion?.estado,
  ).toBe("Verificado");
  const before = db.query("SELECT COUNT(*) n FROM movimientos").get() as {
    n: number;
  };
  expect(() =>
    refund(db, ing, {
      importe: "9",
      partida: food.id,
      devolucion: {
        estado: "Verificado",
        compra: buy.movimiento.id,
        evidenciaRelacion: "Otra evidencia ficticia",
        elegibilidad: "Acreditada",
        cicloOrigen: cycle1.id,
        evidenciaOrigenTemporal: "Documento de compra ficticio",
      },
    }),
  ).toThrow("superan el importe de la compra");
  expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual(before);
  db.close();
});

test("P4: al anular la compra, la devolución verificada pasa a Revisar y conserva el hecho", () => {
  const { db, ing, food, cycle1 } = setup();
  const buy = purchase(db, ing, food.id, { importe: "20" });
  const r = refund(db, ing, {
    importe: "12",
    partida: food.id,
    devolucion: {
      estado: "Verificado",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const plan = previewMovement(
    db,
    { revision: 1, motivo: "Anulación ficticia" },
    buy.movimiento.id,
    true,
    now,
  );
  writeMovement(
    db,
    {
      revision: 1,
      motivo: "Anulación ficticia",
      fingerprint: plan.fingerprint,
      contextRevision: plan.contextRevision,
    },
    randomUUID(),
    buy.movimiento.id,
    true,
    now,
  );
  const view = getComidaMovement(db, r.movimiento.id);
  expect(view.devolucion?.estado).toBe("Revisar");
  expect(view.movimiento.estado).toBe("Vigente");
  expect((view.auditoria.devolucion.at(-1) as any)?.accion).toBe(
    "rectificación",
  );
  db.close();
});

test("AC: un alta con bloque de devolución inválido revierte el Movimiento completo", () => {
  const { db, ing } = setup();
  const before = db.query("SELECT COUNT(*) n FROM movimientos").get();
  expect(() =>
    refund(db, ing, {
      devolucion: { estado: "Verificado" },
    }),
  ).toThrow("Verificado exige compra");
  expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual(before);
  db.close();
});

test("P5: el Ejecutado mensual es neto y conserva bruto y devoluciones", () => {
  const { db, ing, food, cycle1, budget } = setup();
  const buy = purchase(db, ing, food.id, {
    importe: "50",
    comida: { etiqueta: "Comida" },
  });
  refund(db, ing, {
    importe: "15",
    partida: food.id,
    devolucion: {
      estado: "Verificado",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  db.run("INSERT INTO cycle_plans VALUES(?,1)", [cycle1.id]);
  db.run("INSERT INTO cycle_plan_lines VALUES(?,?,?,?,?)", [
    cycle1.id,
    budget.id,
    null,
    null,
    "10000",
  ]);
  const plan = getCyclePlan(db, cycle1.id, now);
  const item = plan.items.find((i) => i.presupuesto.id === budget.id)!;
  expect(item.bruto).toBe("50.00");
  expect(item.devoluciones).toBe("15.00");
  expect(item.ejecutado).toBe("35.00");
  expect(item.pendiente).toBe("65.00");
  expect(item.estado).toBe("Pendiente");
  db.close();
});

test("P6: Compensable neto y Falta por reponer con reposición real asignada", () => {
  const { db, ing, leisure, cycle1 } = setup();
  const buy = purchase(db, ing, leisure.id, {
    importe: "50",
    comida: { etiqueta: "Ocio" },
  });
  refund(db, ing, {
    importe: "15",
    partida: leisure.id,
    devolucion: {
      estado: "Verificado",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const restitute = transfer(db, { id: ing.id }, { id: "S001" }, "20", "2026-07-12");
  writeComidaRol(
    db,
    restitute.movimiento.id,
    {
      revision: 1,
      rol: "Reposición",
      obligacionCiclo: cycle1.id,
      evidencia: "Transferencia de reposición ficticia",
    },
    randomUUID(),
    now,
  );
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect(metrics.compensable.bruto).toMatchObject({
    valor: "50.00",
    estado: "Verificado",
  });
  expect(metrics.compensable.devoluciones.valor).toBe("15.00");
  expect(metrics.compensable.neto.valor).toBe("35.00");
  expect(metrics.reposiciones.obligacion).toBe("20.00");
  expect(metrics.faltaPorReponer.valor).toBe("15.00");
  db.close();
});

test("P7: Recursos, cierre analítico, puente y posición con régimen activo", () => {
  const { db, account, ing, food, leisure, cycle1 } = setup();
  const finance = transfer(db, account, ing);
  writeComidaRol(
    db,
    finance.movimiento.id,
    {
      revision: 1,
      rol: "Financiación",
      evidencia: "Transferencia ordinaria ficticia",
    },
    randomUUID(),
    now,
  );
  purchase(db, ing, food.id, {
    importe: "50",
    comida: { etiqueta: "Comida" },
  });
  const leisureBuy = purchase(db, ing, leisure.id, {
    importe: "50",
    comida: { etiqueta: "Ocio" },
  });
  refund(db, ing, {
    importe: "15",
    partida: leisure.id,
    devolucion: {
      estado: "Verificado",
      compra: leisureBuy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const ready = prepareRegimen(
    db,
    {
      saldo: ing.id,
      cicloCorte: cycle1.id,
      apertura: "100",
      evidencia: "Extracto bancario ficticio de apertura",
      cobertura: "Verificable",
      motivo: "Preparación ficticia de régimen",
    },
    randomUUID(),
    now,
  );
  expect(ready.bloqueos).toEqual([]);
  const active = activateRegimen(
    db,
    {
      revision: ready.regimen.regimen!.revision,
      motivo: "Activación ficticia en pruebas",
      confirmar: true,
    },
    randomUUID(),
    now,
  );
  expect(active.regimen.modo).toBe("Individual");
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect(metrics.recursos.valor).toBe("865.00"); // 100 + 800 + 0 − Compensable neto 35
  db.close();
});

test("AC: sin régimen activo, las métricas que dependen de ING quedan No disponibles y no en cero", () => {
  const { db, ing, food, cycle1 } = setup();
  purchase(db, ing, food.id, {
    importe: "50",
    comida: { etiqueta: "Comida" },
  });
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect(metrics.regimen.modo).toBe("Histórico");
  expect(metrics.recursos).toMatchObject({
    valor: null,
    estado: "No disponible",
  });
  expect(metrics.compras.neto.valor).toBe("50.00");
  expect(metrics.cobertura.estado).toBe("Parcial");
  db.close();
});

test("E1/cobertura: compras sin etiqueta o devoluciones sin atribución presentan Parcial con IDs", () => {
  const { db, ing, food, cycle1 } = setup();
  purchase(db, ing, food.id, { importe: "50", comida: {} });
  refund(db, ing, { importe: "10", partida: food.id });
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect(metrics.cobertura.estado).toBe("Parcial");
  expect(metrics.cobertura.sinClasificar.length).toBe(1);
  expect(metrics.cobertura.devolucionesPendientes.length).toBe(1);
  expect(metrics.compensable.neto.estado).toBe("Parcial");
  expect(metrics.faltaPorReponer.valor).toBeNull();
  db.close();
});

test("CU-07 (histórico): posición con B + entradas − salidas sin devolución", () => {
  const { db, account, ing, food, cycle1 } = setup();
  const finance = transfer(db, account, ing, "800");
  writeComidaRol(
    db,
    finance.movimiento.id,
    { revision: 1, rol: "Financiación", evidencia: "Evidencia ficticia" },
    randomUUID(),
    now,
  );
  purchase(db, ing, food.id, {
    importe: "45",
    comida: { etiqueta: "Comida" },
  });
  const ready = prepareRegimen(
    db,
    {
      saldo: ing.id,
      cicloCorte: cycle1.id,
      apertura: "100",
      evidencia: "Extracto bancario ficticio",
      cobertura: "Verificable",
      motivo: "Preparación ficticia",
    },
    randomUUID(),
    now,
  );
  activateRegimen(
    db,
    {
      revision: ready.regimen.regimen!.revision,
      motivo: "Activación ficticia",
      confirmar: true,
    },
    randomUUID(),
    now,
  );
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect((metrics.posicionBancaria as any).apertura).toBe("100.00");
  expect((metrics.posicionBancaria as any).alCorte).toBe("855.00");
  expect((metrics.posicionBancaria as any).diferenciaAnaliticoBanco).toBe(
    "0.00",
  );
  db.close();
});

test("P7a: la duración provisional usa el fin del mes financiado y vence el horizonte", () => {
  const { db } = setup();
  createCycle(
    db,
    {
      inicio: "2026-10-20",
      saldoInicialComida: "0",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  );
  const latest = db
    .query("SELECT id FROM ciclos ORDER BY inicio DESC LIMIT 1")
    .get() as { id: string };
  const current = purchase(db, { id: "S006" }, "PAR001", {
    fecha: "2026-10-21",
    importe: "1",
  });
  expect(current.movimiento).toBeTruthy();
  const metrics = comidaMetrics(db, latest.id, now);
  expect((metrics.ritmo.duracion as any).horizon).toBe("2026-11-30");
  expect((metrics.ritmo.duracion as any).total).toBe(42);
  expect((metrics.ritmo.duracion as any).tipo).toBe("Provisional");
  db.close();
});

test("D1: el histórico auxiliar legado se conserva y no se suma a los hechos individuales", () => {
  const { db, ing, food, cycle1 } = setup();
  db.run(
    `INSERT INTO revision_comida(id,tipo,fecha,concepto,importe,direccion,es_devolucion,
     clasificacion,estado_vinculo,estado_registro,estado_trazabilidad,revision,creado,actualizado)
     VALUES('9001','Detalle','2026-07-01','Compra legada ficticia',3000,'Salida',0,
     'Comida','Sin vínculo','Vigente','Sin asignación',1,'f','f')`,
  );
  purchase(db, ing, food.id, {
    importe: "50",
    comida: { etiqueta: "Comida" },
  });
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect(metrics.historico.detalleAuxiliar).toBe("-30.00");
  expect(metrics.compras.bruto.valor).toBe("50.00");
  const list = listComida(db);
  expect(list.historico.map((h) => h.id)).toContain("9001");
  expect(list.items.map((i) => i.id)).not.toContain("9001");
  db.close();
});

test("AC: metadatos exigen revisión vigente, no admiten importes y son auditables", () => {
  const { db, ing, food } = setup();
  const buy = purchase(db, ing, food.id);
  expect(() =>
    writeComidaMetadata(
      db,
      buy.movimiento.id,
      { revision: 99, etiqueta: "Comida" },
      randomUUID(),
      now,
    ),
  ).toThrow("ha cambiado");
  const first = writeComidaMetadata(
    db,
    buy.movimiento.id,
    { revision: 1, etiqueta: "Comida", evidenciaBancaria: "E-1" },
    randomUUID(),
    now,
  );
  expect(first.metadata.revision).toBe(1);
  expect(() =>
    writeComidaMetadata(
      db,
      buy.movimiento.id,
      { revision: 1, etiqueta: "Ocio", importe: "1" },
      randomUUID(),
      now,
    ),
  ).toThrow("Campo no editable");
  const second = writeComidaMetadata(
    db,
    buy.movimiento.id,
    { revision: 1, etiqueta: "Ocio", motivo: "Reclasificación ficticia" },
    randomUUID(),
    now,
  );
  expect(second.metadata.revision).toBe(2);
  const view = getComidaMovement(db, buy.movimiento.id);
  expect(view.auditoria.metadata.length).toBe(2);
  expect((view.auditoria.metadata.at(-1) as any)?.motivo).toBe(
    "Reclasificación ficticia",
  );
  db.close();
});

test("CU-14/P5: una devolución de una compra de ciclo anterior no libera el ciclo receptor", () => {
  const { db, ing, food } = setup();
  const cycle2 = db
    .query("SELECT id FROM ciclos ORDER BY inicio LIMIT 1 OFFSET 1")
    .get() as { id: string };
  const buy = purchase(db, ing, food.id, {
    fecha: "2026-06-21",
    importe: "50",
    comida: { etiqueta: "Comida" },
  });
  refund(db, ing, {
    fecha: "2026-07-25",
    importe: "40",
    partida: food.id,
    devolucion: {
      estado: "Verificado",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: "1",
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const receiver = comidaMetrics(db, cycle2.id, now);
  expect(receiver.compras.bruto.valor).toBe("0.00"); // sin compras en el ciclo receptor
  expect(receiver.devolucionesObservadas.valor).toBe("40.00");
  expect(receiver.netoObservado.valor).toBe("-40.00");
  const origin = comidaMetrics(db, "1", now);
  expect(origin.compras.bruto.valor).toBe("50.00");
  expect(origin.compras.neto.valor).toBe("50.00");
  db.close();
});

test("CU-19/P6: Pendiente revisar cuenta como Comida y Fuera presupuesto no se elimina del banco", () => {
  const { db, ing, food, leisure, cycle1 } = setup();
  purchase(db, ing, food.id, {
    importe: "30",
    comida: { etiqueta: "Pendiente revisar" },
  });
  purchase(db, ing, leisure.id, {
    importe: "5",
    comida: { etiqueta: "Fuera presupuesto" },
  });
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect(metrics.compras.neto.valor).toBe("30.00");
  expect(metrics.compensable.bruto.valor).toBe("0.00");
  expect(metrics.fueraPresupuesto.length).toBe(1);
  expect(metrics.netoObservado.valor).toBe("35.00");
  db.close();
});

test("AC: la idempotencia de metadatos no duplica auditoría y el conflicto no escribe", () => {
  const { db, ing, food } = setup();
  const buy = purchase(db, ing, food.id);
  const key = randomUUID();
  const body = { revision: 1, etiqueta: "Comida", evidenciaBancaria: "E-2" };
  const first = writeComidaMetadata(db, buy.movimiento.id, body, key, now);
  const second = writeComidaMetadata(db, buy.movimiento.id, body, key, now);
  expect(second.metadata.revision).toBe(first.metadata.revision);
  const view = getComidaMovement(db, buy.movimiento.id);
  expect(view.auditoria.metadata.length).toBe(1);
  expect(() =>
    writeComidaMetadata(
      db,
      buy.movimiento.id,
      { ...body, etiqueta: "Ocio" },
      key,
      now,
    ),
  ).toThrow("otros datos");
  expect(getComidaMovement(db, buy.movimiento.id).auditoria.metadata.length).toBe(
    1,
  );
  db.close();
});

test("P7a: un corte posterior al horizonte provisional devuelve No disponible sin inventar Fin", () => {
  const { db } = setup();
  createCycle(
    db,
    {
      inicio: "2026-08-20",
      saldoInicialComida: "0",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  );
  const latest = db
    .query("SELECT id FROM ciclos ORDER BY inicio DESC LIMIT 1")
    .get() as { id: string };
  db.run("UPDATE saldos SET exterior=1 WHERE id='S001'");
  const purchaseForReference = db
    .query("SELECT id FROM partidas LIMIT 1")
    .get() as { id: string };
  expect(
    purchase(db, { id: "S001" }, purchaseForReference.id, {
      fecha: "2026-10-15",
      importe: "1",
    }).movimiento,
  ).toBeTruthy();
  const metrics = comidaMetrics(db, latest.id, now);
  expect((metrics.ritmo.duracion as any).tipo).toBe("Vencido");
  expect(metrics.ritmo.equivalentes.valor).toBeNull();
  expect(metrics.ritmo.equivalentes.motivo).toContain("Horizonte");
  expect(metrics.ciclo.fin).toBeNull();
  db.close();
});

test("CU-09/P7: la devolución de Anticipo saliente se resta de F una sola vez", () => {
  const { db, account, ing, food, cycle1 } = setup();
  const finance = transfer(db, account, ing, "800");
  writeComidaRol(
    db,
    finance.movimiento.id,
    { revision: 1, rol: "Financiación", evidencia: "Evidencia ficticia" },
    randomUUID(),
    now,
  );
  const back = transfer(db, ing, account, "100", "2026-07-01");
  writeComidaRol(
    db,
    back.movimiento.id,
    { revision: 1, rol: "Devolución Anticipo", evidencia: "Evidencia ficticia" },
    randomUUID(),
    now,
  );
  purchase(db, ing, food.id, {
    importe: "20",
    comida: { etiqueta: "Comida" },
  });
  const ready = prepareRegimen(
    db,
    {
      saldo: ing.id,
      cicloCorte: cycle1.id,
      apertura: "100",
      evidencia: "Extracto ficticio",
      cobertura: "Verificable",
      motivo: "Preparación ficticia",
    },
    randomUUID(),
    now,
  );
  activateRegimen(
    db,
    {
      revision: ready.regimen.regimen!.revision,
      motivo: "Activación ficticia",
      confirmar: true,
    },
    randomUUID(),
    now,
  );
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect(metrics.financiacion.estado).toBe("Verificado");
  expect(metrics.financiacion.f).toBe("700.00");
  expect(metrics.recursos.valor).toBe("800.00"); // 100 + 700 + 0 − Compensable 0
  expect(metrics.cierreAnalitico.valor).toBe("780.00");
  db.close();
});

test("CU-11: un v18 genuino con hechos asciende a v19 preservando filas y el contrato", () => {
  const { prepareV18 } = require("../test-support/database-v18");
  const db = new Database(":memory:");
  prepareV18(db);
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,nota,anulado,revision,creado,actualizado,capital,intereses) VALUES('1','2026-01-01','Ingreso',100,'S000','S001','Nómina',NULL,'Histórico ficticio','',0,1,'t','t',NULL,NULL)",
  );
  const before = db.query("SELECT COUNT(*) n FROM movimientos").get();
  const { prepareSchema } = require("./database-schema");
  prepareSchema(db, { origin: "demo", key_hash: null });
  expect(db.query("SELECT version FROM schema_version").get()).toEqual({
    version: 19,
  });
  expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual(before);
  expect(
    db.query("SELECT tipo FROM movimientos WHERE id='1'").get(),
  ).toEqual({ tipo: "Ingreso" });
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,nota,anulado,revision,creado,actualizado,capital,intereses) VALUES('2','2026-01-02','Devolución de gasto',200,'S000','S001',NULL,NULL,'Devolución ficticia','',0,1,'t','t',NULL,NULL)",
  );
  expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual({
    n: (before as { n: number }).n + 1,
  });
  db.close();
});

test("AC-19: las rutas de Comida heredan MFA, Origin/CSRF y errores seguros", async () => {
  const { HttpApp } = require("@effect/platform");
  const { randomBytes } = require("node:crypto");
  const { createApp } = require("./app");
  const { provision, totp } = require("./auth");
  const origin = "http://127.0.0.1:5173";
  const password = "Pruebas ficticias Comida " + randomUUID();
  const db = openDatabase(":memory:");
  const key = randomBytes(32);
  let clock = now;
  const handler = HttpApp.toWebHandler(
    createApp(db, { key, now: () => clock }),
  );
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
        .filter((p) => p && !p.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = await response.json();
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data };
  }
  expect((await request("/api/comida")).status).toBe(401);
  const bootstrap = provision(db, clock),
    enrolled = await request("/api/auth/enroll", "POST", {
      token: bootstrap,
      password,
    });
  await request("/api/auth/mfa", "POST", {
    code: totp(enrolled.data.secret).generate({ timestamp: clock }),
  });
  const list = await request("/api/comida?estado=");
  expect(list.status).toBe(200);
  expect(list.data.items).toEqual([]);
  const noOrigin = await request(
    "/api/comida/1/metadata",
    "POST",
    { revision: 1, etiqueta: "Comida" },
    { origin: "" },
  );
  expect(noOrigin.status).toBe(403);
  const noKey = await request("/api/comida/1/metadata", "POST", {
    revision: 1,
    etiqueta: "Comida",
  });
  expect(noKey.status).toBe(422);
  const missing = await request(
    "/api/comida/1/metadata",
    "POST",
    { revision: 1, etiqueta: "Comida" },
    { "idempotency-key": randomUUID() },
  );
  expect(missing.status).toBe(404);
  const badJson = await handler(
    new Request(origin + "/api/comida/1/metadata", {
      method: "POST",
      headers: {
        origin,
        cookie,
        "x-csrf-token": csrf,
        "content-type": "application/json",
      },
      body: "{",
    }),
  );
  expect(badJson.status).toBe(422);
  db.close();
});

test("H1: rectificar la devolución por encima de la compra la degrada a Revisar sin borrar el hecho", () => {
  const { db, ing, food, cycle1 } = setup();
  const buy = purchase(db, ing, food.id, { importe: "20" });
  const r = refund(db, ing, {
    importe: "12",
    partida: food.id,
    devolucion: {
      estado: "Verificado",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const current = getComidaMovement(db, r.movimiento.id).movimiento as any;
  const plan = previewMovement(
    db,
    {
      tipo: "Devolución de gasto",
      fecha: "2026-07-10",
      importe: "25",
      saldo: ing.id,
      partida: food.id,
      concepto: "Devolución ficticia",
      nota: "",
      revision: current.revision,
      motivo: "Rectificación ficticia",
    },
    r.movimiento.id,
    false,
    now,
  );
  writeMovement(
    db,
    {
      tipo: "Devolución de gasto",
      fecha: "2026-07-10",
      importe: "25",
      saldo: ing.id,
      partida: food.id,
      concepto: "Devolución ficticia",
      nota: "",
      revision: current.revision,
      motivo: "Rectificación ficticia",
      fingerprint: plan.fingerprint,
      contextRevision: plan.contextRevision,
    },
    randomUUID(),
    r.movimiento.id,
    false,
    now,
  );
  expect(getComidaMovement(db, r.movimiento.id).devolucion?.estado).toBe(
    "Revisar",
  );
  expect(getComidaMovement(db, r.movimiento.id).movimiento.importe).toBe(
    "25.00",
  );
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect(metrics.cobertura.estado).toBe("Parcial");
  db.close();
});

test("H2: una devolución acreditada sin compra usa su etiqueta y reduce Compensable/Falta", () => {
  const { db, ing, leisure, cycle1 } = setup();
  purchase(db, ing, leisure.id, {
    importe: "50",
    comida: { etiqueta: "Ocio" },
  });
  const r = refund(db, ing, {
    importe: "15",
    partida: leisure.id,
    comida: { etiqueta: "Ocio" },
    devolucion: {
      estado: "Revisar",
      partida: leisure.id,
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  expect(r.movimiento.tipo).toBe("Devolución de gasto");
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect(metrics.compensable.devoluciones.valor).toBe("15.00");
  expect(metrics.compensable.neto.valor).toBe("35.00");
  expect(metrics.faltaPorReponer.valor).toBe("35.00");
  expect(metrics.cobertura.estado).not.toBe("Verificable");
  db.close();
});

test("H3: al anular la compra, el plan deja de netear una devolución no verificable", () => {
  const { db, ing, leisure, cycle1, budget } = setup();
  const buy = purchase(db, ing, leisure.id, {
    importe: "50",
    comida: { etiqueta: "Ocio" },
  });
  refund(db, ing, {
    importe: "15",
    partida: leisure.id,
    devolucion: {
      estado: "Verificado",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  db.run("INSERT INTO cycle_plans VALUES(?,1)", [cycle1.id]);
  db.run("INSERT INTO cycle_plan_lines VALUES(?,?,?,?,?)", [
    cycle1.id,
    budget.id,
    null,
    null,
    "10000",
  ]);
  const plan = previewMovement(
    db,
    { revision: 1, motivo: "Anulación ficticia" },
    buy.movimiento.id,
    true,
    now,
  );
  writeMovement(
    db,
    {
      revision: 1,
      motivo: "Anulación ficticia",
      fingerprint: plan.fingerprint,
      contextRevision: plan.contextRevision,
    },
    randomUUID(),
    buy.movimiento.id,
    true,
    now,
  );
  const executed = getCyclePlan(db, cycle1.id, now).items.find(
    (i) => i.presupuesto.id === budget.id,
  )!;
  expect(executed.devoluciones).toBe("0.00");
  expect(executed.ejecutado).toBe("0.00");
  db.close();
});

test("H4/CU-22: una devolución de ciclo anterior no bloquea Recursos/Falta del receptor", () => {
  const { db, account, ing, food, cycle1 } = setup();
  const cycle2 = db
    .query("SELECT id FROM ciclos ORDER BY inicio LIMIT 1 OFFSET 1")
    .get() as { id: string };
  const finance = transfer(db, account, ing, "800");
  writeComidaRol(
    db,
    finance.movimiento.id,
    { revision: 1, rol: "Financiación", evidencia: "Evidencia ficticia" },
    randomUUID(),
    now,
  );
  const buy = purchase(db, ing, food.id, {
    fecha: "2026-06-21",
    importe: "50",
    comida: { etiqueta: "Comida" },
  });
  refund(db, ing, {
    fecha: "2026-07-25",
    importe: "40",
    partida: food.id,
    devolucion: {
      estado: "Verificado",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const ready = prepareRegimen(
    db,
    {
      saldo: ing.id,
      cicloCorte: cycle1.id,
      apertura: "100",
      evidencia: "Extracto ficticio",
      cobertura: "Verificable",
      motivo: "Preparación ficticia",
    },
    randomUUID(),
    now,
  );
  activateRegimen(
    db,
    {
      revision: ready.regimen.regimen!.revision,
      motivo: "Activación ficticia",
      confirmar: true,
    },
    randomUUID(),
    now,
  );
  const receiver = comidaMetrics(db, cycle2.id, now);
  expect(receiver.recursos.valor).toBe("100.00"); // 100 + 800, sin C_n en el receptor
  expect(receiver.faltaPorReponer.valor).toBe("0.00");
  expect(receiver.cobertura.estado).toBe("Verificable");
  expect(receiver.netoObservado.valor).toBe("-40.00");
  db.close();
});

test("H5/H7: una compra del Saldo de Comida sin metadatos es visible; otra cuenta no entra", () => {
  const { db, account, ing, food, cycle1 } = setup();
  const ready = prepareRegimen(
    db,
    {
      saldo: ing.id,
      cicloCorte: cycle1.id,
      apertura: "100",
      evidencia: "Extracto ficticio",
      cobertura: "Verificable",
      motivo: "Preparación ficticia",
    },
    randomUUID(),
    now,
  );
  activateRegimen(
    db,
    {
      revision: ready.regimen.regimen!.revision,
      motivo: "Activación ficticia",
      confirmar: true,
    },
    randomUUID(),
    now,
  );
  const inScope = purchase(db, ing, food.id, { importe: "30" });
  purchase(db, account, food.id, {
    importe: "100",
    comida: { etiqueta: "Comida" },
  });
  const list = listComida(db);
  expect(list.items.map((i) => i.id)).toContain(inScope.movimiento.id);
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect(metrics.cobertura.sinClasificar).toEqual([inScope.movimiento.id]);
  expect(metrics.compras.bruto.valor).toBe("0.00");
  expect(metrics.netoObservado.valor).toBe("30.00");
  db.close();
});

test("H6: el impacto de configuración conserva el neteo P5", () => {
  const { db, ing, food, cycle1, budget } = setup();
  const buy = purchase(db, ing, food.id, {
    importe: "50",
    comida: { etiqueta: "Comida" },
  });
  refund(db, ing, {
    importe: "15",
    partida: food.id,
    devolucion: {
      estado: "Verificado",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  db.run("INSERT INTO cycle_plans VALUES(?,1)", [cycle1.id]);
  db.run("INSERT INTO cycle_plan_lines VALUES(?,?,?,?,?)", [
    cycle1.id,
    budget.id,
    null,
    null,
    "10000",
  ]);
  const impact = planConfigurationImpact(
    db,
    { budget: { id: budget.id, value: { nombre: "Plan renombrado ficticio" } } },
    now,
  );
  const after = impact.ciclos[0]?.diferencias[0]?.despues;
  expect(after?.ejecutado).toBe("35.00");
  expect(after?.devoluciones).toBe("15.00");
  db.close();
});

test("H9/CU-07: B=100, +800, compra 45 y devolución 10 ⇒ posición 865", () => {
  const { db, account, ing, food, cycle1 } = setup();
  const finance = transfer(db, account, ing, "800");
  writeComidaRol(
    db,
    finance.movimiento.id,
    { revision: 1, rol: "Financiación", evidencia: "Evidencia ficticia" },
    randomUUID(),
    now,
  );
  const buy = purchase(db, ing, food.id, {
    importe: "45",
    comida: { etiqueta: "Comida" },
  });
  refund(db, ing, {
    importe: "10",
    partida: food.id,
    devolucion: {
      estado: "Verificado",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const ready = prepareRegimen(
    db,
    {
      saldo: ing.id,
      cicloCorte: cycle1.id,
      apertura: "100",
      evidencia: "Extracto ficticio",
      cobertura: "Verificable",
      motivo: "Preparación ficticia",
    },
    randomUUID(),
    now,
  );
  activateRegimen(
    db,
    {
      revision: ready.regimen.regimen!.revision,
      motivo: "Activación ficticia",
      confirmar: true,
    },
    randomUUID(),
    now,
  );
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect((metrics.posicionBancaria as any).alCorte).toBe("865.00");
  expect(metrics.compras.bruto.valor).toBe("45.00");
  expect(metrics.compras.devoluciones.valor).toBe("10.00");
  expect(metrics.compras.neto.valor).toBe("35.00");
  db.close();
});

test("H9/CU-24: Inicio 28/10, corte 30/10 ⇒ duración 34 y 3 transcurridos", () => {
  const { db, ing, food } = setup();
  const c = createCycle(
    db,
    {
      inicio: "2026-10-28",
      saldoInicialComida: "340",
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  ).ciclo;
  db.run("UPDATE saldos SET exterior=1 WHERE id='S001'");
  add(
    db,
    {
      tipo: "Gasto",
      fecha: "2026-10-29",
      importe: "30",
      saldo: ing.id,
      partida: food.id,
      concepto: "Compra ficticia",
      nota: "",
      comida: { etiqueta: "Comida" },
    },
    Date.parse("2026-10-30T12:00:00Z"),
  );
  add(
    db,
    {
      tipo: "Ingreso",
      fecha: "2026-10-30",
      importe: "1",
      saldo: "S001",
      subtipo: "Bonus",
      concepto: "Referencia ficticia",
      nota: "",
    },
    Date.parse("2026-10-30T12:00:00Z"),
  );
  const ready = prepareRegimen(
    db,
    {
      saldo: ing.id,
      cicloCorte: c.id,
      apertura: "340",
      evidencia: "Extracto ficticio",
      cobertura: "Verificable",
      motivo: "Preparación ficticia",
    },
    randomUUID(),
    now,
  );
  activateRegimen(
    db,
    {
      revision: ready.regimen.regimen!.revision,
      motivo: "Activación ficticia",
      confirmar: true,
    },
    randomUUID(),
    now,
  );
  const metrics = comidaMetrics(db, c.id, Date.parse("2026-10-30T12:00:00Z"));
  expect((metrics.ritmo.duracion as any).total).toBe(34);
  expect((metrics.ritmo.duracion as any).elapsed).toBe(3);
  expect(metrics.recursos.valor).toBe("340.00");
  expect(metrics.ritmo.equivalentes.valor).toBe("30.00");
  expect(metrics.ritmo.margen.valor).toBe("0.00");
  expect(metrics.ritmo.semanalObservado.valor).toBe("70.00");
  db.close();
});

test("H10: una devolución acreditada sin grupo deja la cobertura en Parcial", () => {
  const { db, ing, leisure, cycle1 } = setup();
  purchase(db, ing, leisure.id, {
    importe: "50",
    comida: { etiqueta: "Ocio" },
  });
  refund(db, ing, {
    importe: "15",
    partida: leisure.id,
    devolucion: {
      estado: "Revisar",
      partida: leisure.id,
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const metrics = comidaMetrics(db, cycle1.id, now);
  expect(metrics.cobertura.estado).toBe("Parcial");
  expect(metrics.cobertura.motivos.join(" ")).toContain("sin atribución elegible");
  expect(metrics.faltaPorReponer.valor).toBeNull();
  expect(metrics.compensable.devoluciones.valor).not.toBe("15.00");
  db.close();
});

test("H11: no se retipifica una devolución con atribución ni una compra con vínculos", () => {
  const { db, ing, food, cycle1 } = setup();
  const buy = purchase(db, ing, food.id, {
    importe: "30",
    comida: { etiqueta: "Comida" },
  });
  const r = refund(db, ing, {
    importe: "10",
    partida: food.id,
    devolucion: {
      estado: "Verificado",
      compra: buy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const current = getComidaMovement(db, r.movimiento.id).movimiento as any;
  const devBody = {
    tipo: "Gasto",
    fecha: current.fecha,
    importe: current.importe,
    saldo: ing.id,
    partida: food.id,
    concepto: current.concepto,
    nota: current.nota,
    revision: current.revision,
    motivo: "Retipificación ficticia",
  };
  expect(() =>
    previewMovement(db, devBody, r.movimiento.id, false, now),
  ).toThrow("atribución registrada");
  const bought = getComidaMovement(db, buy.movimiento.id).movimiento as any;
  const buyBody = {
    tipo: "Transferencia",
    fecha: bought.fecha,
    importe: bought.importe,
    origen: ing.id,
    destino: "S001",
    concepto: bought.concepto,
    nota: bought.nota,
    revision: bought.revision,
    motivo: "Retipificación ficticia",
  };
  expect(() =>
    previewMovement(db, buyBody, buy.movimiento.id, false, now),
  ).toThrow("devoluciones verificadas");
  const reviewBuy = purchase(db, ing, food.id, {
    importe: "30",
    comida: { etiqueta: "Comida" },
  });
  refund(db, ing, {
    importe: "10",
    partida: food.id,
    devolucion: {
      estado: "Revisar",
      compra: reviewBuy.movimiento.id,
      evidenciaRelacion: "Motivo comercial ficticio",
      elegibilidad: "Acreditada",
      cicloOrigen: cycle1.id,
      evidenciaOrigenTemporal: "Documento de compra ficticio",
    },
  });
  const reviewCurrent = getComidaMovement(db, reviewBuy.movimiento.id)
    .movimiento as any;
  const reviewBody = {
    tipo: "Transferencia",
    fecha: reviewCurrent.fecha,
    importe: reviewCurrent.importe,
    origen: ing.id,
    destino: "S001",
    concepto: reviewCurrent.concepto,
    nota: reviewCurrent.nota,
    revision: reviewCurrent.revision,
    motivo: "Retipificación ficticia",
  };
  expect(() =>
    previewMovement(db, reviewBody, reviewBuy.movimiento.id, false, now),
  ).toThrow("devoluciones verificadas");
  db.close();
});
