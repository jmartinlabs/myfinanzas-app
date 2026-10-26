import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { prepareSchema } from "./database-schema";
import { cycleContext } from "./ciclos";
import { revisionComidaFixture } from "../test-support/revision-comida-fixture";
import {
  clasificaciones,
  createRevisionComida,
  getRevisionComida,
  listOperaciones,
  listReposiciones,
  rectificarRevisionComida,
  anularRevisionComida,
  vincularRevisionComida,
  revisionComidaOptions,
} from "./revision-comida";
import { ledgerRows, movementSource } from "./movement-ledger";
import { getSaldo, Problem } from "./saldos";

const now = Date.parse("2026-10-26T12:00:00Z");
function setup() {
  const db = new Database(":memory:");
  prepareSchema(db, { origin: "demo", key_hash: null });
  revisionComidaFixture(db);
  return db;
}
const detail = (over: Record<string, unknown> = {}) => ({
  fecha: "2026-10-10",
  concepto: "Supermercado ficticio",
  importe: "42.10",
  direccion: "Salida",
  esDevolucion: false,
  clasificacion: "Comida",
  evidenciaBancaria: "banco-ficticio-1",
  ...over,
});
const reposicion = (over: Record<string, unknown> = {}) => ({
  fecha: "2026-10-12",
  concepto: "Reposición ficticia",
  importe: "20.00",
  direccion: "Entrada",
  esDevolucion: false,
  evidenciaBancaria: "operacion-ficticia-E08",
  ...over,
});
const create = (
  db: Database,
  body: Record<string, unknown> = detail(),
  key = randomUUID(),
) => createRevisionComida(db, body, key, now, "Detalle");
const createRepos = (
  db: Database,
  body: Record<string, unknown> = reposicion(),
  key = randomUUID(),
) => createRevisionComida(db, body, key, now, "Reposicion");
function snapshot(db: Database, tables: string[]) {
  return tables.map((table) => [
    table,
    db.query(`SELECT * FROM "${table}" ORDER BY 1`).all(),
  ]);
}
function fieldError(fn: () => unknown, field: string) {
  let error: unknown;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(Problem);
  const fields = (error as Problem).fields;
  return fields[field];
}
const central = (db: Database) =>
  snapshot(db, [
    "movimientos",
    "movement_audit",
    "saldos",
    "ciclos",
    "partidas",
    "presupuestos",
    "referencias",
  ]);

test("AC01/02/06/22/37: detalle propio, sin Gasto ni saldo paralelo, fecha y evidencia separadas", () => {
  const db = setup();
  const before = central(db),
    movementsBefore = ledgerRows(db).length;
  const r = create(db, detail({ fecha: "2026-10-10" }));
  expect(r.operacion.id).toBe("1");
  expect(r.operacion.tipo).toBe("Detalle");
  expect(r.operacion.importe).toBe("42.10");
  expect(r.operacion.direccion).toBe("Salida");
  expect(r.operacion.esDevolucion).toBe(false);
  expect(r.operacion.clasificacion).toBe("Comida");
  expect(r.operacion.estadoVinculo).toBe("Sin vínculo");
  expect(r.operacion.estadoEvidenciaBancaria).toBe("Con evidencia");
  expect(r.operacion.relacionCompra).toBe("Sin relación acreditada");
  expect(r.operacion.estadoRegistro).toBe("Vigente");
  expect(ledgerRows(db)).toHaveLength(movementsBefore);
  expect(central(db)).toEqual(before);
  const noEvidence = create(
    db,
    detail({
      concepto: "Sin evidencia ficticia",
      fecha: "2026-10-11",
      evidenciaBancaria: "",
      evidenciaRelacionCompra: "documento-ficticio",
    }),
  );
  expect(noEvidence.operacion.estadoEvidenciaBancaria).toBe("Sin evidencia");
  expect(noEvidence.operacion.relacionCompra).toBe("Acreditada");
  expect(cycleContext(db).referencia.fecha).toBe("2026-10-11");
  const text = JSON.stringify(noEvidence);
  for (const forbidden of [
    "Recursos comida",
    "Falta por reponer",
    "Gasto comida",
    "Compensable",
    "neteo",
    "Completada",
  ])
    expect(text).not.toContain(forbidden);
  expect(noEvidence.operacion.efecto).toContain("no crea Gasto");
  for (const forbidden of [
    "recursos",
    "gastoComida",
    "compensable",
    "faltaPorReponer",
    "financiacion",
    "neto",
    "parcial",
    "completada",
  ])
    expect(Object.keys(noEvidence.operacion)).not.toContain(forbidden);
  db.close();
});

test("AC09/10/11/37: importes exactos, matriz tipo/dirección/devolución, clasificación y evidencias", () => {
  const db = setup();
  for (const importe of ["", "0", "-1.00", "1.001", "1.00.0", "abc"])
    expect(() => create(db, detail({ importe }))).toThrow();
  expect(fieldError(() => create(db, detail({ esDevolucion: undefined })), "esDevolucion")).toBeTruthy();
  expect(fieldError(() => create(db, detail({ direccion: "Entrada", esDevolucion: false })), "esDevolucion")).toBeTruthy();
  expect(fieldError(() => create(db, detail({ direccion: "Salida", esDevolucion: true })), "esDevolucion")).toBeTruthy();
  expect(fieldError(() => createRepos(db, reposicion({ direccion: "Salida" })), "direccion")).toBeTruthy();
  expect(fieldError(() => createRepos(db, reposicion({ esDevolucion: true })), "esDevolucion")).toBeTruthy();
  const devolution = create(
    db,
    detail({
      direccion: "Entrada",
      esDevolucion: true,
      importe: "12.00",
      concepto: "Devolución supermercado ficticia",
    }),
  );
  expect(devolution.operacion.tipo).toBe("Detalle");
  expect(devolution.operacion.esDevolucion).toBe(true);
  expect(devolution.operacion.clasificacion).toBe("Comida");
  expect(fieldError(() => create(db, detail({ clasificacion: "Desconocida" })), "clasificacion")).toBeTruthy();
  expect(fieldError(() => create(db, detail({ clasificacion: ["Comida", "Fuera presupuesto"] })), "clasificacion")).toBeTruthy();
  expect(() =>
    create(db, detail({ fueraPresupuesto: true })),
  ).toThrow("no editable");
  expect(() =>
    create(db, detail({ detalleOrigenId: "1" })),
  ).toThrow("no editable");
  expect(fieldError(() => create(db, detail({ evidenciaRelacionCompra: "   " })), "evidenciaRelacionCompra")).toBeTruthy();
  expect(fieldError(() => createRepos(db, reposicion({ evidenciaBancaria: "" })), "evidenciaBancaria")).toBeTruthy();
  expect(fieldError(() => createRepos(db, reposicion({ evidenciaRelacionCompra: "compra ficticia" })), "evidenciaRelacionCompra")).toBeTruthy();
  const noEvidence = create(db, detail({ evidenciaBancaria: null }));
  expect(noEvidence.operacion.estadoEvidenciaBancaria).toBe("Sin evidencia");
  expect(fieldError(() =>
    vincularRevisionComida(
      db,
      noEvidence.operacion.id,
      {
        revision: 1,
        motivo: "vínculo sin evidencia",
        movimiento: "202",
        tipoVinculo: "Individual",
      },
      randomUUID(),
      now,
      "Detalle",
    ), "evidenciaVinculo")).toBeTruthy();
  db.close();
});

test("AC03/04/26/33/35: vínculo opcional verificado, agregado terminal sin conciliación y elegibilidad", () => {
  const db = setup();
  const a = create(db, detail()),
    b = create(db, detail({ fecha: "2026-10-11", concepto: "Otra compra ficticia" }));
  let link = vincularRevisionComida(
    db,
    a.operacion.id,
    {
      revision: 1,
      motivo: "correspondencia ficticia documentada",
      movimiento: "201",
      tipoVinculo: "Agregado terminal",
      evidenciaVinculo: "extracto terminal ficticio",
    },
    randomUUID(),
    now,
    "Detalle",
  );
  expect(link.operacion.estadoVinculo).toBe("Verificado");
  expect(link.operacion.tipoVinculo).toBe("Agregado terminal");
  expect(link.operacion.sinConciliacion).toBe(true);
  expect(link.operacion.vinculoMovimiento?.id).toBe("201");
  expect(link.operacion.fecha).toBe("2026-10-10");
  expect(link.operacion.importe).toBe("42.10");
  const movement = ledgerRows(db).find((m) => m.id === "201")!;
  expect(movement.fecha).toBe("2026-10-01");
  expect(movement.importe).toBe("100000");
  link = vincularRevisionComida(
    db,
    b.operacion.id,
    {
      revision: 1,
      motivo: "segunda correspondencia ficticia",
      movimiento: "201",
      tipoVinculo: "Agregado terminal",
      evidenciaVinculo: "extracto terminal ficticio 2",
    },
    randomUUID(),
    now,
    "Detalle",
  );
  expect(link.operacion.estadoVinculo).toBe("Verificado");
  expect(fieldError(() =>
    vincularRevisionComida(
      db,
      a.operacion.id,
      {
        revision: 2,
        motivo: "agregado no terminal",
        movimiento: "202",
        tipoVinculo: "Agregado terminal",
        evidenciaVinculo: "evidencia ficticia",
      },
      randomUUID(),
      now,
      "Detalle",
    ), "tipoVinculo")).toBeTruthy();
  for (const [movimiento, tipo] of [
    ["204", "Individual"],
    ["203", "Individual"],
  ] as const)
    expect(fieldError(() =>
      vincularRevisionComida(
        db,
        a.operacion.id,
        {
          revision: 2,
          motivo: "no elegible",
          movimiento,
          tipoVinculo: tipo,
          evidenciaVinculo: "evidencia ficticia",
        },
        randomUUID(),
        now,
        "Detalle",
      ), "movimiento")).toBeTruthy();
  expect(fieldError(() =>
    vincularRevisionComida(
      db,
      a.operacion.id,
      {
        revision: 2,
        motivo: "no elegible",
        movimiento: "202",
        tipoVinculo: "Otro",
        evidenciaVinculo: "evidencia ficticia",
      },
      randomUUID(),
      now,
      "Detalle",
    ), "tipoVinculo")).toBeTruthy();
  expect(fieldError(() =>
    vincularRevisionComida(
      db,
      a.operacion.id,
      {
        revision: 2,
        motivo: "gasto exterior no habilitado",
        movimiento: "208",
        tipoVinculo: "Individual",
        evidenciaVinculo: "evidencia ficticia",
      },
      randomUUID(),
      now,
      "Detalle",
    ), "movimiento")).toBeTruthy();
  const outside = create(
    db,
    detail({
      clasificacion: "Fuera presupuesto",
      concepto: "Compra no presupuestada ficticia",
    }),
  );
  const centralBefore = central(db),
    usage = db
      .query("SELECT * FROM partidas WHERE id='PAR001'")
      .all();
  const outsideLink = vincularRevisionComida(
    db,
    outside.operacion.id,
    {
      revision: 1,
      motivo: "trazabilidad sin efecto presupuestario",
      movimiento: "202",
      tipoVinculo: "Individual",
      evidenciaVinculo: "documento ficticio",
    },
    randomUUID(),
    now,
    "Detalle",
  );
  expect(outsideLink.operacion.clasificacion).toBe("Fuera presupuesto");
  expect(central(db)).toEqual(centralBefore);
  expect(db.query("SELECT * FROM partidas WHERE id='PAR001'").all()).toEqual(
    usage,
  );
  expect(fieldError(() =>
    vincularRevisionComida(
      db,
      a.operacion.id,
      {
        revision: 2,
        motivo: "vínculo inferido sin evidencia",
        movimiento: "201",
        tipoVinculo: "Individual",
        evidenciaVinculo: "",
      },
      randomUUID(),
      now,
      "Detalle",
    ), "evidenciaVinculo")).toBeTruthy();
  const repo = createRepos(db, reposicion({ fecha: "2026-10-13" }));
  expect(fieldError(() =>
    vincularRevisionComida(
      db,
      repo.operacion.id,
      {
        revision: 1,
        motivo: "reposición a Gasto",
        movimiento: "202",
        tipoVinculo: "Individual",
        evidenciaVinculo: "evidencia ficticia",
      },
      randomUUID(),
      now,
      "Reposicion",
    ), "movimiento")).toBeTruthy();
  expect(fieldError(() =>
    vincularRevisionComida(
      db,
      repo.operacion.id,
      {
        revision: 1,
        motivo: "reposición a Exterior",
        movimiento: "206",
        tipoVinculo: "Individual",
        evidenciaVinculo: "evidencia ficticia",
      },
      randomUUID(),
      now,
      "Reposicion",
    ), "movimiento")).toBeTruthy();
  expect(fieldError(() =>
    vincularRevisionComida(
      db,
      repo.operacion.id,
      {
        revision: 1,
        motivo: "agregado en reposición",
        movimiento: "201",
        tipoVinculo: "Agregado terminal",
        evidenciaVinculo: "evidencia ficticia",
      },
      randomUUID(),
      now,
      "Reposicion",
    ), "tipoVinculo")).toBeTruthy();
  const repoIncome = vincularRevisionComida(
    db,
    repo.operacion.id,
    {
      revision: 1,
      motivo: "ingreso existente ficticio",
      movimiento: "203",
      tipoVinculo: "Individual",
      evidenciaVinculo: "justificante de ingreso",
    },
    randomUUID(),
    now,
    "Reposicion",
  );
  expect(repoIncome.operacion.estadoVinculo).toBe("Verificado");
  expect(fieldError(() =>
    vincularRevisionComida(
      db,
      repo.operacion.id,
      {
        revision: 2,
        motivo: "ingreso exterior no habilitado",
        movimiento: "209",
        tipoVinculo: "Individual",
        evidenciaVinculo: "evidencia ficticia",
      },
      randomUUID(),
      now,
      "Reposicion",
    ), "movimiento")).toBeTruthy();
  const repoTransfer = vincularRevisionComida(
    db,
    repo.operacion.id,
    {
      revision: 2,
      motivo: "transferencia interna ficticia",
      movimiento: "204",
      tipoVinculo: "Individual",
      evidenciaVinculo: "justificante interno",
    },
    randomUUID(),
    now,
    "Reposicion",
  );
  expect(repoTransfer.operacion.estadoVinculo).toBe("Verificado");
  db.close();
});

test("AC05/15/30: idempotencia, coincidencias legítimas, reposición duplicada e identidad no reutilizable", () => {
  const db = setup();
  const key = randomUUID();
  const first = create(db, detail(), key);
  const retry = create(db, detail(), key);
  expect(retry.operacion.id).toBe(first.operacion.id);
  expect(() =>
    create(db, detail({ concepto: "Otro payload ficticio" }), key),
  ).toThrow("otros datos");
  const equal = create(db, detail());
  expect(equal.operacion.id).not.toBe(first.operacion.id);
  expect(equal.coincidencias.map((c) => c.id)).toContain(first.operacion.id);
  const reposKey = randomUUID();
  const r1 = createRepos(db, reposicion(), reposKey);
  expect(createRepos(db, reposicion(), reposKey).operacion.id).toBe(
    r1.operacion.id,
  );
  expect(() => createRepos(db, reposicion())).toThrow("misma evidencia");
  expect(() =>
    db.run(
      "INSERT INTO revision_comida(id,tipo,fecha,concepto,importe,direccion,es_devolucion,clasificacion,estado_vinculo,estado_registro,estado_trazabilidad,revision,creado,actualizado) VALUES('1','Detalle','2026-10-10','Duplicado',1,'Salida',0,'Comida','Sin vínculo','Vigente','Sin asignación',1,'f','f')",
    ),
  ).toThrow();
  const next = create(db, detail({ concepto: "Siguiente ficticio" }));
  expect(Number(next.operacion.id)).toBeGreaterThan(Number(equal.operacion.id));
  expect(
    db.query("SELECT next FROM counters WHERE name='revision_comida'").get(),
  ).toEqual({ next: Number(next.operacion.id) + 1 });
  db.close();
});

test("AC07/08: referencia central con fuente Revisión Comida, máxima vigente, sin evidencia y cobertura", () => {
  const db = setup();
  expect(cycleContext(db).referencia.fecha).toBe("2026-10-08");
  const a = create(db, detail({ fecha: "2026-10-09" }));
  const b = create(
    db,
    detail({
      fecha: "2026-10-10",
      concepto: "Sin evidencia pero vigente",
      evidenciaBancaria: "",
    }),
  );
  createRepos(db, reposicion({ fecha: "2026-10-11" }));
  const latest = create(
    db,
    detail({ fecha: "2026-10-20", concepto: "Anulable ficticia" }),
  );
  expect(cycleContext(db).referencia.fecha).toBe("2026-10-20");
  anularRevisionComida(
    db,
    latest.operacion.id,
    { revision: 1, motivo: "anulación ficticia" },
    randomUUID(),
    now,
    "Detalle",
  );
  expect(cycleContext(db).referencia.fecha).toBe("2026-10-11");
  expect(cycleContext(db).referencia.coverage).toContainEqual({
    source: "Revisión Comida",
    state: "disponible",
    maxDate: "2026-10-11",
  });
  anularRevisionComida(
    db,
    b.operacion.id,
    { revision: 1, motivo: "anulación ficticia" },
    randomUUID(),
    now,
    "Detalle",
  );
  expect(cycleContext(db).referencia.fecha).toBe("2026-10-11");
  anularRevisionComida(
    db,
    a.operacion.id,
    { revision: 1, motivo: "anulación ficticia" },
    randomUUID(),
    now,
    "Detalle",
  );
  const afterAnnul = cycleContext(db).referencia.fecha;
  expect(afterAnnul).toBe("2026-10-11");
  const empty = new Database(":memory:");
  prepareSchema(empty, { origin: "demo", key_hash: null });
  expect(cycleContext(empty).referencia).toMatchObject({
    fecha: null,
    estado: "sin_referencia",
  });
  empty.close();
  const broken = setup();
  broken.exec(
    "ALTER TABLE revision_comida RENAME COLUMN estado_registro TO estado_registro_broken",
  );
  expect(cycleContext(broken).referencia).toMatchObject({
    fecha: null,
    estado: "error",
  });
  broken.close();
  const range = listOperaciones(db);
  expect(range.cobertura.estado).toBe("disponible");
  expect(range.cobertura.desde).toBe("2026-10-11");
  const before = listOperaciones(db, new URLSearchParams("desde=2026-10-01&hasta=2026-10-08"));
  expect(before.cobertura.estado).toBe("sin_cobertura_historica");
  const inside = listOperaciones(
    db,
    new URLSearchParams("desde=2026-10-11&hasta=2026-10-11&tipo=Detalle"),
  );
  expect(inside.cobertura.estado).toBe("disponible");
  expect(inside.total).toBe(0);
  const partial = listOperaciones(
    db,
    new URLSearchParams("desde=2026-10-01&hasta=2026-10-12"),
  );
  expect(partial.cobertura.estado).toBe("cobertura_parcial");
  expect(movementSource(db).state).toBe("disponible");
  db.close();
});

test("AC12/13: históricos con doble columna preservados en lectura y grupos de clasificación", () => {
  const db = setup();
  db.run(
    "INSERT INTO revision_comida(id,tipo,fecha,concepto,importe,direccion,es_devolucion,clasificacion,fuera_presupuesto_historico,estado_vinculo,estado_registro,estado_trazabilidad,revision,creado,actualizado) VALUES('900','Detalle','2025-01-01','Histórico ficticio',1000,'Salida',0,'Comida',1,'Sin vínculo','Vigente','Sin asignación',1,'f','f')",
  );
  const legacy = getRevisionComida(db, "900").operacion;
  expect(legacy.clasificacion).toBe("Comida");
  expect(legacy.fueraPresupuestoHistorico).toBe(true);
  const options = revisionComidaOptions(db, now);
  const group = Object.fromEntries(
    options.clasificaciones.map((c) => [c.valor, c.grupo]),
  );
  expect(group).toEqual({
    Comida: "Gasto comida",
    "Pendiente revisar": "Gasto comida",
    Ocio: "Compensable",
    Niños: "Compensable",
    Otros: "Compensable",
    "Fuera presupuesto": "Excluido del análisis",
  });
  expect(clasificaciones).toHaveLength(6);
  expect(() =>
    create(db, detail({ fueraPresupuestoHistorico: true })),
  ).toThrow("no editable");
  db.close();
});

test("AC14/28: reposición real, evidencia obligatoria, estados propios y anulación lógica", () => {
  const db = setup();
  const r = createRepos(db);
  expect(r.operacion.tipo).toBe("Reposicion");
  expect(r.operacion.direccion).toBe("Entrada");
  expect(r.operacion.esDevolucion).toBe(false);
  expect(r.operacion.clasificacion).toBeNull();
  expect(r.operacion.estadoRegistro).toBe("Vigente");
  expect(r.operacion.estadoTrazabilidad).toBe("Sin asignación");
  expect(r.operacion.estadoVinculo).toBe("Sin vínculo");
  expect(JSON.stringify(r.operacion)).not.toMatch(/Parcial|Completada|Falta por reponer/);
  expect(() => createRepos(db, reposicion({ evidenciaBancaria: "" }))).toThrow();
  const rectified = rectificarRevisionComida(
    db,
    r.operacion.id,
    {
      revision: 1,
      motivo: "corrección ficticia de importe",
      importe: "25.00",
    },
    randomUUID(),
    now,
    "Reposicion",
  );
  expect(rectified.operacion.id).toBe(r.operacion.id);
  expect(rectified.operacion.importe).toBe("25.00");
  expect(rectified.auditoria.map((a) => a.accion)).toEqual([
    "alta",
    "rectificación",
  ]);
  expect(() =>
    rectificarRevisionComida(
      db,
      r.operacion.id,
      { revision: 1, motivo: "obsoleta", importe: "30.00" },
      randomUUID(),
      now,
      "Reposicion",
    ),
  ).toThrow("cambiado");
  const annulled = anularRevisionComida(
    db,
    r.operacion.id,
    { revision: 2, motivo: "anulación ficticia" },
    randomUUID(),
    now,
    "Reposicion",
  );
  expect(annulled.operacion.estadoRegistro).toBe("Anulado");
  expect(listReposiciones(db).total).toBe(0);
  expect(listReposiciones(db, new URLSearchParams("estado=")).total).toBe(1);
  expect(() =>
    rectificarRevisionComida(
      db,
      r.operacion.id,
      { revision: 3, motivo: "no permitida", importe: "30.00" },
      randomUUID(),
      now,
      "Reposicion",
    ),
  ).toThrow("anulada");
  db.close();
});

test("AC16/17/18/24: rectificación auditada, vínculo en revisión y anulación histórica", () => {
  const db = setup();
  const r = create(db, detail());
  const rectified = rectificarRevisionComida(
    db,
    r.operacion.id,
    {
      revision: 1,
      motivo: "reclasificación ficticia",
      clasificacion: "Ocio",
    },
    randomUUID(),
    now,
    "Detalle",
  );
  expect(rectified.operacion.id).toBe(r.operacion.id);
  expect(rectified.operacion.clasificacion).toBe("Ocio");
  expect(rectified.operacion.revision).toBe(2);
  const audit = rectified.auditoria.at(-1)!;
  expect(audit.accion).toBe("rectificación");
  expect(audit.anterior.clasificacion).toBe("Comida");
  expect(audit.posterior.clasificacion).toBe("Ocio");
  expect(audit.motivo).toBe("reclasificación ficticia");
  expect(() =>
    rectificarRevisionComida(
      db,
      r.operacion.id,
      { revision: 1, motivo: "obsoleta", clasificacion: "Niños" },
      randomUUID(),
      now,
      "Detalle",
    ),
  ).toThrow("cambiado");
  const linked = vincularRevisionComida(
    db,
    r.operacion.id,
    {
      revision: 2,
      motivo: "vínculo ficticio",
      movimiento: "207",
      tipoVinculo: "Individual",
      evidenciaVinculo: "justificante ficticio",
    },
    randomUUID(),
    now,
    "Detalle",
  );
  expect(linked.operacion.estadoVinculo).toBe("Verificado");
  db.run("UPDATE movimientos SET revision=revision+1 WHERE id='207'");
  const review = getRevisionComida(db, r.operacion.id).operacion;
  expect(review.estadoVinculo).toBe("Revisar");
  expect(review.estadoRegistro).toBe("Vigente");
  expect(review.evidenciaVinculo).toBe("justificante ficticio");
  expect(fieldError(() =>
    vincularRevisionComida(
      db,
      r.operacion.id,
      {
        revision: 3,
        motivo: "no existente",
        movimiento: "999",
        tipoVinculo: "Individual",
        evidenciaVinculo: "evidencia ficticia",
      },
      randomUUID(),
      now,
      "Detalle",
    ), "movimiento")).toBeTruthy();
  expect(() =>
    vincularRevisionComida(
      db,
      r.operacion.id,
      {
        revision: 2,
        motivo: "revisión obsoleta",
        movimiento: "201",
        tipoVinculo: "Individual",
        evidenciaVinculo: "evidencia ficticia",
      },
      randomUUID(),
      now,
      "Detalle",
    ),
  ).toThrow("cambiado");
  expect(fieldError(() =>
    vincularRevisionComida(
      db,
      r.operacion.id,
      {
        revision: 3,
        motivo: "movimiento anulado",
        movimiento: "205",
        tipoVinculo: "Individual",
        evidenciaVinculo: "evidencia ficticia",
      },
      randomUUID(),
      now,
      "Detalle",
    ), "movimiento")).toBeTruthy();
  const annulled = anularRevisionComida(
    db,
    r.operacion.id,
    { revision: 3, motivo: "anulación ficticia" },
    randomUUID(),
    now,
    "Detalle",
  );
  expect(annulled.operacion.estadoRegistro).toBe("Anulado");
  expect(annulled.operacion.estadoVinculo).toBe("Revisar");
  expect(annulled.operacion.vinculoMovimiento?.id).toBe("207");
  expect(() => db.run("DELETE FROM revision_comida WHERE id=?", [r.operacion.id])).toThrow(
    "no delete",
  );
  expect(() =>
    db.run("DELETE FROM revision_comida_audit WHERE operacion=?", [r.operacion.id]),
  ).toThrow("immutable audit");
  expect(() =>
    db.run("UPDATE revision_comida SET revision=revision+1 WHERE id=?", [
      r.operacion.id,
    ]),
  ).toThrow("immutable");
  db.close();
});

test("AC21: continuidad al cerrar y reabrir una base de archivo con vínculos y auditoría", () => {
  const dir = mkdtempSync(join(tmpdir(), "dev16-continuity-"));
  const path = join(dir, "demo.sqlite");
  try {
    process.env.NODE_ENV = "test";
    const db = new Database(path);
    prepareSchema(db, { origin: "demo", key_hash: null });
    revisionComidaFixture(db);
    const r = create(db, detail());
    vincularRevisionComida(
      db,
      r.operacion.id,
      {
        revision: 1,
        motivo: "vínculo persistente",
        movimiento: "201",
        tipoVinculo: "Agregado terminal",
        evidenciaVinculo: "evidencia persistente",
      },
      randomUUID(),
      now,
      "Detalle",
    );
    const before = getRevisionComida(db, r.operacion.id);
    db.close();
    const reopened = new Database(path);
    expect(
      (reopened.query("SELECT version FROM schema_version").get() as { version: number })
        .version,
    ).toBe(14);
    const after = getRevisionComida(reopened, r.operacion.id);
    expect(after.operacion).toMatchObject({
      id: before.operacion.id,
      fecha: before.operacion.fecha,
      esDevolucion: before.operacion.esDevolucion,
      estadoVinculo: "Verificado",
      evidenciaBancaria: before.operacion.evidenciaBancaria,
      evidenciaVinculo: before.operacion.evidenciaVinculo,
      tipoVinculo: "Agregado terminal",
    });
    expect(after.auditoria).toHaveLength(2);
    expect(after.contexto.referencia.fecha).toBe("2026-10-10");
    reopened.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});


test("AC21: migración v13→v14 conserva identidad y datos; reapertura verificada en su bloque", async () => {
  const { prepareV13 } = await import("../test-support/database-v13");
  const migrated = new Database(":memory:");
  prepareV13(migrated);
  const movements = migrated.query("SELECT * FROM movimientos ORDER BY id").all(),
    saldos = migrated.query("SELECT * FROM saldos ORDER BY id").all();
  expect(
    migrated.query("SELECT version FROM schema_version").get(),
  ).toEqual({ version: 13 });
  prepareSchema(migrated, { origin: "demo", key_hash: null });
  expect(
    migrated.query("SELECT version FROM schema_version").get(),
  ).toEqual({ version: 14 });
  expect(migrated.query("SELECT * FROM movimientos ORDER BY id").all()).toEqual(
    movements,
  );
  expect(migrated.query("SELECT * FROM saldos ORDER BY id").all()).toEqual(
    saldos,
  );
  revisionComidaFixture(migrated);
  const r = create(migrated, detail());
  expect(getRevisionComida(migrated, r.operacion.id).operacion.id).toBe(
    r.operacion.id,
  );
  migrated.close();
});


test("AC16/24/30: dos conexiones, revisión obsoleta y ausencia de escritura parcial", () => {
  const dir = mkdtempSync(join(tmpdir(), "dev16-concurrency-")),
    path = join(dir, "demo.sqlite");
  try {
    process.env.NODE_ENV = "test";
    const db = new Database(path);
    prepareSchema(db, { origin: "demo", key_hash: null });
    revisionComidaFixture(db);
    const created = create(db, detail());
    const second = new Database(path);
    expect(getRevisionComida(second, created.operacion.id).operacion.revision).toBe(
      1,
    );
    const firstWrite = rectificarRevisionComida(
      db,
      created.operacion.id,
      { revision: 1, motivo: "primera conexión", clasificacion: "Ocio" },
      randomUUID(),
      now,
      "Detalle",
    );
    expect(firstWrite.operacion.revision).toBe(2);
    let conflict: unknown;
    try {
      rectificarRevisionComida(
        second,
        created.operacion.id,
        { revision: 1, motivo: "segunda conexión", clasificacion: "Niños" },
        randomUUID(),
        now,
        "Detalle",
      );
    } catch (e) {
      conflict = e;
    }
    expect(conflict).toBeInstanceOf(Problem);
    expect((conflict as Problem).status).toBe(409);
    const stable = getRevisionComida(db, created.operacion.id);
    expect(stable.operacion.clasificacion).toBe("Ocio");
    expect(stable.auditoria).toHaveLength(2);
    second.close();
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("AC28/35: ficha de reposición exige tipo y no expone una operación de detalle", () => {
  const db = setup();
  const detailRow = create(db, detail()),
    reposRow = createRepos(db);
  expect(getRevisionComida(db, reposRow.operacion.id, "Reposicion").operacion.id).toBe(
    reposRow.operacion.id,
  );
  expect(() => getRevisionComida(db, detailRow.operacion.id, "Reposicion")).toThrow(
    "no encontrada",
  );
  expect(() => getRevisionComida(db, reposRow.operacion.id, "Detalle")).toThrow(
    "no encontrada",
  );
  db.close();
});

test("AC19: MFA/Origin/CSRF, JSON limitado, campos derivados y errores seguros", async () => {
  const { HttpApp } = await import("@effect/platform");
  const { createApp } = await import("./app");
  const { Auth, provision, totp } = await import("./auth");
  const db = setup(),
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
        headers: {
          origin,
          "content-type": "application/json",
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  expect((await request("/api/revision-comida")).status).toBe(401);
  const auth = new Auth(db, key),
    enroll = await auth.enroll(
      provision(db),
      "Clave ficticia revisión " + randomUUID(),
    ),
    verified = auth.verify(
      new Request(origin, {
        headers: { cookie: auth.challengeName + "=" + enroll.challenge },
      }),
      totp(enroll.secret!).generate(),
    ),
    headers = {
      cookie: auth.cookieName + "=" + verified.session,
      "x-csrf-token": verified.csrf,
    };
  expect((await request("/api/revision-comida", "GET", undefined, headers)).status).toBe(
    200,
  );
  expect(
    (await request("/api/revision-comida", "POST", detail(), { cookie: headers.cookie }))
      .status,
  ).toBe(403);
  expect(
    (
      await request("/api/revision-comida", "POST", detail(), {
        cookie: headers.cookie,
        "x-csrf-token": headers["x-csrf-token"],
        origin: "",
      })
    ).status,
  ).toBe(403);
  const created = await request(
    "/api/revision-comida",
    "POST",
    detail(),
    { ...headers, "idempotency-key": randomUUID() },
  );
  expect(created.status).toBe(201);
  expect(created.headers.get("cache-control")).toBe("no-store");
  const derived = await request(
    "/api/revision-comida",
    "POST",
    detail({ id: "999", estadoVinculo: "Verificado", revision: 3 }),
    { ...headers, "idempotency-key": randomUUID() },
  );
  expect(derived.status).toBe(422);
  expect(await derived.text()).not.toContain("INSERT");
  const malformed = await handler(
    new Request(origin + "/api/revision-comida", {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/json",
        ...headers,
        "idempotency-key": randomUUID(),
      },
      body: "{",
    }),
  );
  expect(malformed.status).toBe(422);
  const huge = await handler(
    new Request(origin + "/api/revision-comida", {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/json",
        ...headers,
        "idempotency-key": randomUUID(),
      },
      body: JSON.stringify({ ...detail(), concepto: "x".repeat(17000) }),
    }),
  );
  expect(huge.status).toBe(413);
  db.exec("DELETE FROM sessions");
  expect((await request("/api/revision-comida", "GET", undefined, headers)).status).toBe(
    401,
  );
  db.close();
});

test("AC32: ciclo abierto, fuera de ciclo, sin ciclo asignable y cobertura parcial", () => {
  const db = setup();
  const before = create(db, detail({ fecha: "2026-08-01" }));
  const inside = create(db, detail({ fecha: "2026-10-10" }));
  create(db, detail({ fecha: "2026-10-24" }));
  let result = listOperaciones(db, new URLSearchParams("ciclo=2"));
  expect(result.ciclo).toMatchObject({
    id: "2",
    inicio: "2026-10-25",
    fin: null,
    estadoTemporal: "Abierto",
  });
  expect(result.ciclo!.cobertura).toBe("Parcial");
  expect(result.fueraDeCiclo).toBeGreaterThan(0);
  expect(result.sinCicloAsignable).toBe(1);
  expect(result.operaciones.map((o) => o.id)).not.toContain(before.operacion.id);
  const noCycle = listOperaciones(db, new URLSearchParams("ciclo=sin_ciclo"));
  expect(noCycle.operaciones.map((o) => o.id)).toEqual([before.operacion.id]);
  result = listOperaciones(db, new URLSearchParams("ciclo=1"));
  expect(result.ciclo!.cobertura).toBe("Parcial");
  const emptyCycle = listOperaciones(db, new URLSearchParams("ciclo=2"));
  expect(emptyCycle.operaciones).toHaveLength(0);
  expect(emptyCycle.ciclo!.cobertura).toBe("Parcial");
  expect(result.operaciones.map((o) => o.id)).toContain(inside.operacion.id);
  db.close();
});

test("AC20/29: flujo completo de consulta, ficha, vínculo, rectificación y reposiciones vía modelos", () => {
  const db = setup();
  const a = create(db, detail());
  const dev = create(
    db,
    detail({
      direccion: "Entrada",
      esDevolucion: true,
      concepto: "Devolución ficticia",
      fecha: "2026-10-11",
    }),
  );
  const r = createRepos(db);
  const linked = vincularRevisionComida(
    db,
    a.operacion.id,
    {
      revision: 1,
      motivo: "agregado ficticio",
      movimiento: "201",
      tipoVinculo: "Agregado terminal",
      evidenciaVinculo: "evidencia agregada",
    },
    randomUUID(),
    now,
    "Detalle",
  );
  expect(linked.operacion.sinConciliacion).toBe(true);
  const list = listOperaciones(db);
  expect(list.operaciones.map((o) => o.id)).toEqual([
    r.operacion.id,
    dev.operacion.id,
    a.operacion.id,
  ]);
  expect(list.operaciones[0].tipo).toBe("Reposicion");
  expect(list.operaciones[1].esDevolucion).toBe(true);
  expect(list.operaciones[2].estadoVinculo).toBe("Verificado");
  expect(
    listOperaciones(db, new URLSearchParams("clasificacion=Comida")).total,
  ).toBe(2);
  expect(() =>
    listOperaciones(db, new URLSearchParams("clasificacion=Desconocida")),
  ).toThrow("inválidos");
  expect(
    listReposiciones(db, new URLSearchParams("evidencia=Con evidencia")).total,
  ).toBe(1);
  expect(getRevisionComida(db, a.operacion.id).reposiciones.map((x) => x.id)).toEqual([
    r.operacion.id,
  ]);
  db.close();
});
