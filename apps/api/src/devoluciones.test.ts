import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { createSaldo } from "./saldos";
import { createClassification } from "./clasificacion";
import { createCycle, cycleContext } from "./ciclos";
import { getMovement, previewMovement, writeMovement } from "./movimientos";
import { writeComidaDevolucion } from "./comida";
import {
  integridadDevoluciones,
  proyeccionDevolucionesCompra,
} from "./devoluciones";
import { financeRevision } from "./movement-ledger";
import { gateAbiertoParaPruebas } from "../test-support/devolucion-gate-abierto";

/**
 * #538 F1 · lecturas de devoluciones de compras (SPEC39 §3-§5).
 * Todo con datos ficticios en SQLite en memoria; ningún dato real.
 */
const now = Date.parse("2026-10-21T12:00:00Z");
process.env.NODE_ENV = "test";

function setup() {
  const db = openDatabase(":memory:");
  const cat = createClassification(
    db,
    "categorias",
    { nombre: "Gastos ficticios", anual: "Gasto", mensual: "Gasto", referencia: false },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Subcategoría ficticia", padre: cat.id },
    randomUUID(),
  );
  db.run(
    "INSERT INTO presupuestos VALUES('PRE900','Plan ficticio','Gasto real','S001','Activo',1,'f','f')",
  );
  const food = createClassification(
    db,
    "partidas",
    { nombre: "Supermercado ficticio", padre: sub.id, presupuesto: "PRE900" },
    randomUUID(),
  );
  const leisure = createClassification(
    db,
    "partidas",
    { nombre: "Ocio ficticio", padre: sub.id, presupuesto: "PRE900" },
    randomUUID(),
  );
  const account = createSaldo(
    db,
    {
      nombre: "Cuenta ficticia",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "5000",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  );
  const other = createSaldo(
    db,
    {
      nombre: "Otra cuenta ficticia",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "100",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  );
  const cycle1 = createCycle(
    db,
    { inicio: "2026-06-20", saldoInicialComida: "0", contextRevision: cycleContext(db).revision },
    randomUUID(),
    now,
  ).ciclo;
  const cycle2 = createCycle(
    db,
    { inicio: "2026-07-20", saldoInicialComida: "0", contextRevision: cycleContext(db).revision },
    randomUUID(),
    now,
  ).ciclo;
  return { db, food, leisure, account, other, cycle1, cycle2 };
}
type Ctx = ReturnType<typeof setup>;

function add(db: Database, body: Record<string, unknown>) {
  const plan = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    randomUUID(),
    null,
    false,
    now,
    undefined,
    gateAbiertoParaPruebas,
  );
}
let seq = 0;
function buy(c: Ctx, importe: string, over: Record<string, unknown> = {}) {
  return add(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-05",
    importe,
    saldo: c.account.id,
    partida: c.food.id,
    concepto: `Compra ficticia ${++seq}`,
    nota: "",
    ...over,
  }).movimiento.id as string;
}
function refund(
  c: Ctx,
  compra: string,
  importe: string,
  link: Record<string, unknown> = {},
  over: Record<string, unknown> = {},
) {
  return add(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-08-10",
    importe,
    saldo: c.other.id,
    concepto: "Devolución ficticia",
    nota: "",
    ...over,
    devolucion: {
      estado: "Verificado",
      compra,
      evidenciaRelacion: "Evidencia ficticia",
      elegibilidad: "Acreditada",
      cicloOrigen: c.cycle1.id,
      evidenciaOrigenTemporal: "Documento ficticio",
      ...link,
    },
  }).movimiento.id as string;
}
const R1 = (c: Ctx, id: string, opts = {}) => proyeccionDevolucionesCompra(c.db, id, opts);

/** Huella completa de todas las tablas de dominio: una lectura no puede alterar ninguna. */
function snapshot(db: Database) {
  const tables = (
    db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as {
      name: string;
    }[]
  ).map((t) => t.name);
  return JSON.stringify([
    db.query("SELECT total_changes() n").get(),
    financeRevision(db),
    tables.map((t) => [t, db.query(`SELECT * FROM "${t}"`).all()]),
  ]);
}

test("AC-D08: parciales 30+40 sobre 120 dejan capacidad 50, descuento 70 y GRE 50 con resumen independiente de la paginación", () => {
  const c = setup();
  const compra = buy(c, "120");
  const a = refund(c, compra, "30");
  const b = refund(c, compra, "40", {}, { fecha: "2026-08-11" });
  const full = R1(c, compra);
  expect(full.resumen).toEqual({
    count: 2,
    bruto: "120.00",
    devueltoVerificado: "70.00",
    capacidadBancariaRestante: "50.00",
    descuentoEconomico: "70.00",
    gastoRealEconomico: "50.00",
    pendienteRevision: "0.00",
    cobertura: "Completa",
    causas: [],
    ids: [a, b],
  });
  expect(full.items.map((i) => i.id)).toEqual([a, b]);
  expect(full.total).toBe(2);
  // Páginas de tamaño 1: items distintos, resumen idéntico y completo.
  const p1 = R1(c, compra, { pageSize: 1, page: 1 });
  const p2 = R1(c, compra, { pageSize: 1, page: 2 });
  expect(p1.items.map((i) => i.id)).toEqual([a]);
  expect(p2.items.map((i) => i.id)).toEqual([b]);
  expect(p1.resumen).toEqual(full.resumen);
  expect(p2.resumen).toEqual(full.resumen);
  expect(p1.total).toBe(2);
  expect(R1(c, compra, { pageSize: 1, page: 3 }).items).toEqual([]);
  expect(() => R1(c, compra, { page: 0 })).toThrow("página inválidos");
  c.db.close();
});

test("AC-D09: devolución total de 121,45 deja GRE 0 y capacidad 0, cero verificable con compra real", () => {
  const c = setup();
  const compra = buy(c, "121.45");
  refund(c, compra, "121.45");
  const { resumen } = R1(c, compra);
  expect(resumen.gastoRealEconomico).toBe("0.00");
  expect(resumen.capacidadBancariaRestante).toBe("0.00");
  expect(resumen.descuentoEconomico).toBe("121.45");
  expect(resumen.cobertura).toBe("Completa");
  expect(c.db.query("SELECT COUNT(*) n FROM movimientos WHERE tipo='Devolución de gasto'").get()).toEqual({ n: 1 });
  c.db.close();
});

test("AC-D39: Verificada No acreditada de 30 sobre 120 deja capacidad 90, descuento 0 y GRE 120; otro abono de 91 se rechaza; acreditar da descuento 30", () => {
  const c = setup();
  const compra = buy(c, "120");
  const id = refund(c, compra, "30", { elegibilidad: "No acreditada", cicloOrigen: undefined, evidenciaOrigenTemporal: undefined });
  const r1 = R1(c, compra);
  expect(r1.resumen.capacidadBancariaRestante).toBe("90.00");
  expect(r1.resumen.descuentoEconomico).toBe("0.00");
  expect(r1.resumen.gastoRealEconomico).toBe("120.00");
  expect(r1.resumen.devueltoVerificado).toBe("30.00");
  expect(r1.resumen.causas).toEqual(["sinAcreditacion"]);
  expect(r1.resumen.cobertura).toBe("Parcial");
  expect(r1.items[0].elegibilidad).toBe("No acreditada");
  // R3 idéntico.
  expect(getMovement(c.db, compra).devolucionesResumen).toEqual(r1.resumen);
  // Otro abono de 91 > capacidad 90: la escritura existente lo rechaza (sin tocar el guard).
  const before = c.db.query("SELECT COUNT(*) n FROM movimientos").get();
  let code = "";
  try {
    refund(c, compra, "91");
  } catch (e) {
    code = (e as { code?: string; message: string }).code ?? (e as Error).message;
  }
  expect(code).toBe("DEVOLUTION_EXCESS");
  expect(c.db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual(before);
  expect(R1(c, compra).resumen.capacidadBancariaRestante).toBe("90.00");
  // Acreditar el abono de 30 cambia descuento/GRE y no vuelve a consumir capacidad.
  const rev = (c.db.query("SELECT revision FROM movimientos WHERE id=?").get(id) as { revision: number }).revision;
  writeComidaDevolucion(
    c.db,
    id,
    {
      revision: rev,
      compra,
      estado: "Verificado",
      elegibilidad: "Acreditada",
      cicloOrigen: c.cycle1.id,
      evidenciaRelacion: "Evidencia ficticia",
      evidenciaOrigenTemporal: "Documento ficticio",
      motivo: "Acreditación ficticia",
    },
    randomUUID(),
    now,
    gateAbiertoParaPruebas,
  );
  const after = R1(c, compra).resumen;
  expect(after.descuentoEconomico).toBe("30.00");
  expect(after.capacidadBancariaRestante).toBe("90.00");
  expect(after.gastoRealEconomico).toBe("90.00");
  expect(after.causas).toEqual([]);
  c.db.close();
});

test("AC-D39: un histórico inconsistente publica capacidad no disponible y exceso firmado, sin max(0)", () => {
  const c = setup();
  const compra = buy(c, "120");
  const a = refund(c, compra, "100");
  // Fixture de datos: el trigger impide el exceso, por lo que se simula un histórico
  // inconsistente rebajando la compra por SQL en la BD ficticia en memoria (no es migración).
  c.db.run("DROP TRIGGER IF EXISTS movimiento_devolucion_integrity");
  c.db.run("UPDATE movimientos SET importe=9000 WHERE id=?", [compra]);
  const r1 = R1(c, compra);
  expect(r1.resumen.devueltoVerificado).toBe("100.00");
  expect(r1.resumen.capacidadBancariaRestante).toBeNull();
  expect(r1.resumen.cobertura).toBe("Parcial");
  expect(r1.items[0].diagnosticos).toContainEqual({ codigo: "EXCESO", exceso: "-10.00" });
  const inv = integridadDevoluciones(c.db, new URLSearchParams("categoria=exceso"));
  expect(inv.items).toEqual([
    {
      categoria: "exceso",
      id: compra,
      causa: "exceso",
      importe: "10.00",
      compra,
      almacenado: { devueltoVerificado: "100.00" },
      derivado: { bruto: "90.00", exceso: "-10.00" },
      ids: [a],
    },
  ]);
  c.db.close();
});

test("AC-D04: cada causa de cobertura de §3.3 se publica con ID, importe y causa, sin cero completo ni contaminación", () => {
  const c = setup();
  // sinVinculo: devolución huérfana, incluso Acreditada con Partida y ciclo declarados.
  const orphan = add(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-08-10",
    importe: "11",
    saldo: c.other.id,
    partida: c.food.id,
    concepto: "Huérfana ficticia",
    nota: "",
  }).movimiento.id as string;
  // revisar
  const compraRev = buy(c, "100");
  const rev = refund(c, compraRev, "12", { estado: "Revisar" });
  expect(R1(c, compraRev).resumen).toMatchObject({
    causas: ["revisar"],
    pendienteRevision: "12.00",
    descuentoEconomico: "0.00",
    devueltoVerificado: "0.00",
    capacidadBancariaRestante: "100.00",
    cobertura: "Parcial",
  });
  // sinAcreditacion
  const compraSin = buy(c, "101");
  refund(c, compraSin, "13", { elegibilidad: "No acreditada", cicloOrigen: undefined, evidenciaOrigenTemporal: undefined });
  expect(R1(c, compraSin).resumen.causas).toEqual(["sinAcreditacion"]);
  // sinClasificacion: compra sin Partida (el esquema actual la exige; se fuerza solo en esta BD ficticia).
  const compraSinPartida = buy(c, "102");
  refund(c, compraSinPartida, "14");
  // El esquema actual exige Partida a todo Gasto: se fuerza el hecho histórico solo en esta BD ficticia.
  c.db.run("PRAGMA ignore_check_constraints=ON");
  c.db.run("UPDATE movimientos SET partida=NULL WHERE id=?", [compraSinPartida]);
  c.db.run("PRAGMA ignore_check_constraints=OFF");
  const sc = R1(c, compraSinPartida).resumen;
  expect(sc.causas).toEqual(["sinClasificacion"]);
  expect(sc.cobertura).toBe("Parcial");
  expect(sc.descuentoEconomico).toBe("14.00");
  // periodoNoResoluble: fecha de compra fuera del maestro de ciclos.
  const compraFuera = buy(c, "103", { fecha: "2026-05-01" });
  refund(c, compraFuera, "15");
  expect(R1(c, compraFuera).resumen.causas).toEqual(["periodoNoResoluble"]);
  expect(R1(c, compraFuera).compra.cicloAtribucion).toBeNull();
  // compraInvalida: compra anulada histórica -> 200 con diagnóstico y no disponible.
  const compraAnulada = buy(c, "104");
  const inv = refund(c, compraAnulada, "16");
  c.db.run("UPDATE movimientos SET anulado=1 WHERE id=?", [compraAnulada]);
  const an = R1(c, compraAnulada);
  expect(an.resumen.causas).toEqual(["compraInvalida"]);
  expect(an.resumen.cobertura).toBe("No disponible");
  expect(an.resumen.gastoRealEconomico).toBeNull();
  expect(an.resumen.capacidadBancariaRestante).toBeNull();
  expect(an.resumen.descuentoEconomico).toBe("0.00");
  expect(an.items[0].diagnosticos).toContainEqual({ codigo: "COMPRA_ANULADA" });
  // Una compra limpia ajena no se degrada por las demás.
  const limpia = buy(c, "105");
  expect(R1(c, limpia).resumen).toMatchObject({ cobertura: "Completa", causas: [], count: 0, gastoRealEconomico: "105.00" });
  // R4: inventario con ID, causa e importe.
  const inventario = integridadDevoluciones(c.db);
  expect(inventario.items).toContainEqual(
    expect.objectContaining({ categoria: "sinVinculo", id: orphan, causa: "sinVinculo", importe: "11.00", compra: null }),
  );
  expect(inventario.items).toContainEqual(
    expect.objectContaining({ categoria: "vinculoInvalido", id: rev, causa: "revisar", importe: "12.00", compra: compraRev }),
  );
  expect(inventario.items).toContainEqual(
    expect.objectContaining({ categoria: "vinculoInvalido", id: inv, causa: "compraInvalida", importe: "16.00" }),
  );
  c.db.close();
});

test("AC-D19: un huérfano Acreditado con Partida y ciclo no netea en ninguna compra y se lee como sinVinculo", () => {
  const c = setup();
  const compra = buy(c, "120");
  const orphan = add(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-08-10",
    importe: "50",
    saldo: c.other.id,
    partida: c.food.id,
    concepto: "Huérfana ficticia",
    nota: "",
  }).movimiento.id as string;
  writeComidaDevolucion(
    c.db,
    orphan,
    {
      revision: 1,
      estado: "Revisar",
      elegibilidad: "Acreditada",
      partida: c.food.id,
      cicloOrigen: c.cycle1.id,
      evidenciaOrigenTemporal: "Documento ficticio",
    },
    randomUUID(),
    now,
    gateAbiertoParaPruebas,
  );
  const r1 = R1(c, compra).resumen;
  expect(r1.descuentoEconomico).toBe("0.00");
  expect(r1.gastoRealEconomico).toBe("120.00");
  expect(r1.count).toBe(0);
  const inv = integridadDevoluciones(c.db, new URLSearchParams("categoria=sinVinculo"));
  expect(inv.items.map((i) => [i.id, i.causa, i.importe])).toEqual([[orphan, "sinVinculo", "50.00"]]);
  expect(inv.items[0].almacenado).toMatchObject({ elegibilidad: "Acreditada", partida: c.food.id, ciclo: c.cycle1.id });
  c.db.close();
});

test("AC-D44/AC-D17/AC-D18: un vínculo con ciclo y Partida almacenados antiguos netea la compra vigente y R4 los diagnostica sin persistir", () => {
  const c = setup();
  const compra = buy(c, "120");
  const id = refund(c, compra, "30");
  // Copias antiguas contradictorias (histórico): Partida y ciclo almacenados distintos.
  c.db.run("UPDATE movimiento_devolucion SET partida=?,ciclo_origen=? WHERE movimiento=?", [c.leisure.id, c.cycle2.id, id]);
  c.db.run("UPDATE movimientos SET partida=? WHERE id=?", [c.leisure.id, id]);
  const stored = c.db.query("SELECT * FROM movimiento_devolucion WHERE movimiento=?").get(id);
  const r1 = R1(c, compra);
  expect(r1.compra.partida).toBe(c.food.id);
  expect(r1.compra.cicloAtribucion).toBe(c.cycle1.id);
  expect(r1.resumen.descuentoEconomico).toBe("30.00");
  expect(r1.resumen.gastoRealEconomico).toBe("90.00");
  expect(r1.items[0].cicloDerivado).toBe(c.cycle1.id);
  expect(r1.items[0].cicloAlmacenado).toBe(c.cycle2.id);
  expect(r1.items[0].diagnosticos).toContainEqual({ codigo: "CICLO_REEXPRESADO", almacenado: c.cycle2.id, derivado: c.cycle1.id });
  expect(r1.items[0].diagnosticos).toContainEqual({ codigo: "PARTIDA_REEXPRESADA", almacenado: c.leisure.id, derivado: c.food.id });
  const inv = integridadDevoluciones(c.db, new URLSearchParams("categoria=reexpresadas"));
  expect(inv.items.map((i) => [i.id, i.causa, i.almacenado, i.derivado])).toEqual([
    [id, "CICLO_REEXPRESADO", { ciclo: c.cycle2.id }, { ciclo: c.cycle1.id }],
    [id, "PARTIDA_REEXPRESADA", { partida: c.leisure.id }, { partida: c.food.id }],
  ]);
  // La lectura no persiste ni corrige la copia almacenada.
  expect(c.db.query("SELECT * FROM movimiento_devolucion WHERE movimiento=?").get(id)).toEqual(stored);
  // D18: al reclasificar la compra, bruto y descuento siguen a la compra; la copia legacy no prevalece.
  c.db.run("UPDATE movimientos SET partida=? WHERE id=?", [c.leisure.id, compra]);
  const moved = R1(c, compra);
  expect(moved.compra.partida).toBe(c.leisure.id);
  expect(moved.resumen.descuentoEconomico).toBe("30.00");
  expect(moved.items[0].diagnosticos.some((d) => d.codigo === "PARTIDA_REEXPRESADA")).toBe(false);
  c.db.close();
});

test("AC-D33/AC-D02: R1 y R3 comparten proyección y resumen idéntico; GET no cambia filas, revisiones, auditoría ni dirty", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "30");
  refund(c, compra, "40", { elegibilidad: "No acreditada", cicloOrigen: undefined, evidenciaOrigenTemporal: undefined });
  refund(c, compra, "5", { estado: "Revisar" });
  add(c.db, { tipo: "Devolución de gasto", fecha: "2026-08-10", importe: "9", saldo: c.other.id, concepto: "Huérfana", nota: "" });
  const before = snapshot(c.db);
  const r1 = R1(c, compra);
  const r3 = getMovement(c.db, compra);
  expect(r3.devolucionesResumen).toEqual(r1.resumen);
  expect(Object.keys(r1.resumen).sort()).toEqual(
    ["bruto", "capacidadBancariaRestante", "causas", "cobertura", "count", "descuentoEconomico", "devueltoVerificado", "gastoRealEconomico", "ids", "pendienteRevision"].sort(),
  );
  expect(Object.keys(r1).sort()).toEqual(["compra", "items", "page", "resumen", "total"]);
  expect(Object.keys(r1.items[0]).sort()).toEqual(
    ["cicloAlmacenado", "cicloDerivado", "devolucionRevision", "diagnosticos", "elegibilidad", "estado", "evidencias", "fecha", "id", "importe", "revision", "saldoReceptor"].sort(),
  );
  expect(r1.resumen).toMatchObject({
    devueltoVerificado: "70.00",
    capacidadBancariaRestante: "50.00",
    descuentoEconomico: "30.00",
    gastoRealEconomico: "90.00",
    pendienteRevision: "5.00",
  });
  integridadDevoluciones(c.db);
  integridadDevoluciones(c.db, new URLSearchParams("page=2"));
  expect(snapshot(c.db)).toBe(before);
  c.db.close();
});

test("AC-D33: R3 es null para no Gastos y R1 distingue 404 de 422", () => {
  const c = setup();
  const compra = buy(c, "120");
  const dev = refund(c, compra, "30");
  expect(getMovement(c.db, dev).devolucionesResumen).toBeNull();
  expect(() => R1(c, "99999")).toThrow("no encontrado");
  try {
    R1(c, dev);
    throw new Error("debía fallar");
  } catch (e) {
    expect((e as { status: number }).status).toBe(422);
  }
  try {
    R1(c, "99999");
  } catch (e) {
    expect((e as { status: number }).status).toBe(404);
  }
  c.db.close();
});

test("R1/R3 de una compra no dependen de otras compras ni de devoluciones ajenas y no las incluyen", () => {
  const c = setup();
  const a = buy(c, "120");
  const d1 = refund(c, a, "30");
  refund(c, a, "40", { elegibilidad: "No acreditada", cicloOrigen: undefined, evidenciaOrigenTemporal: undefined }, { fecha: "2026-08-11" });
  const solo = JSON.stringify([R1(c, a), getMovement(c.db, a).devolucionesResumen]);
  // Datos ajenos: otra compra con devoluciones (también excesivas e inválidas) y un huérfano.
  const b = buy(c, "200", { partida: c.leisure.id });
  const e = refund(c, b, "50");
  refund(c, b, "60", { estado: "Revisar" });
  add(c.db, { tipo: "Devolución de gasto", fecha: "2026-08-10", importe: "9", saldo: c.other.id, concepto: "Huérfana", nota: "" });
  c.db.run("UPDATE movimientos SET anulado=1 WHERE id=?", [b]);
  expect(JSON.stringify([R1(c, a), getMovement(c.db, a).devolucionesResumen])).toBe(solo);
  const r = R1(c, a);
  expect(r.items.map((i) => i.id)).toContain(d1);
  expect(r.items.map((i) => i.id)).not.toContain(e);
  expect(r.resumen.ids).not.toContain(e);
  expect(r.resumen).toMatchObject({ count: 2, descuentoEconomico: "30.00", devueltoVerificado: "70.00" });
  // Misma cifra que la derivación global de R4 para sus devoluciones.
  expect(integridadDevoluciones(c.db).items.some((i) => i.id === a)).toBe(false);
  // Identidades inexistentes o con ceros a la izquierda: 404.
  for (const id of ["0" + a, "00" + a, "99999"])
    try {
      R1(c, id);
      throw new Error("debía fallar");
    } catch (err) {
      expect((err as { status: number }).status).toBe(404);
    }
  c.db.close();
});

test("paginación de R1/R4 solo admite enteros decimales", () => {
  const c = setup();
  const a = buy(c, "120");
  for (const bad of ["0x10", "1e2", " 5 ", "-1", "0", "1.5", ""])
    expect(() => R1(c, a, { page: bad })).toThrow("página inválidos");
  for (const bad of ["0x10", "1e2", " 5 ", "0"])
    expect(() => integridadDevoluciones(c.db, new URLSearchParams({ page: bad }))).toThrow("página inválidos");
  expect(R1(c, a, { page: "1" }).page).toBe(1);
  c.db.close();
});

test("AC-D33: las rutas R1/R4 exigen sesión y devuelven 404/422 de dominio", async () => {
  const { HttpApp } = require("@effect/platform");
  const { randomBytes } = require("node:crypto");
  const { createApp } = require("./app");
  const { provision, totp } = require("./auth");
  const origin = "http://127.0.0.1:5173";
  const password = "Pruebas ficticias Devoluciones " + randomUUID();
  const db = openDatabase(":memory:");
  const handler = HttpApp.toWebHandler(createApp(db, {
      key: randomBytes(32),
      now: () => now,
      devolucionGate: gateAbiertoParaPruebas,
    }));
  let cookie = "",
    csrf = "";
  let last: Response | null = null;
  async function request(path: string) {
    const response = await handler(
      new Request(origin + path, { headers: { origin, cookie, "x-csrf-token": csrf } }),
    );
    last = response.clone();
    return { status: response.status, data: await response.json() };
  }
  async function post(path: string, body: unknown) {
    const response = await handler(
      new Request(origin + path, {
        method: "POST",
        headers: { origin, "content-type": "application/json", cookie, "x-csrf-token": csrf },
        body: JSON.stringify(body),
      }),
    );
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie.split("; ").filter((p) => p && !p.startsWith(name + "=")).concat(pair).join("; ");
    }
    const data = await response.json();
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data };
  }
  expect((await request("/api/comida/compras/1/devoluciones")).status).toBe(401);
  expect((await request("/api/devoluciones/integridad")).status).toBe(401);
  const enrolled = await post("/api/auth/enroll", { token: provision(db, now), password });
  await post("/api/auth/mfa", { code: totp(enrolled.data.secret).generate({ timestamp: now }) });
  expect((await request("/api/comida/compras/1/devoluciones")).status).toBe(404);
  expect(last!.headers.get("cache-control")).toBe("no-store");
  expect((await request("/api/comida/compras/1/devoluciones?page=0x10")).status).toBe(422);
  const integridad = await request("/api/devoluciones/integridad");
  expect(integridad.status).toBe(200);
  expect(last!.headers.get("cache-control")).toBe("no-store");
  expect(integridad.data).toMatchObject({ items: [], total: 0, page: 1 });
  expect((await request("/api/devoluciones/integridad?page=0")).status).toBe(422);
  expect((await request("/api/devoluciones/integridad?categoria=otra")).status).toBe(422);
  db.close();
});
