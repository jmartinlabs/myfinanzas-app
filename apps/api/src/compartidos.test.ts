import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { prepareSchema } from "./database-schema";
import { prepareV13 } from "../test-support/database-v13";
import { prepareV14 } from "../test-support/database-v14";
import {
  calcularReparto,
  createCompartido,
  createParticipante,
  getCompartido,
  listCompartidos,
  previewParticipante,
  rectificarParticipante,
  bajaParticipante,
} from "./compartidos";
import { createReference } from "./referencias";
import { createClassification } from "./clasificacion";
import { createSaldo, Problem } from "./saldos";
import { previewMovement, writeMovement, getMovement } from "./movimientos";
import { createAnticipo } from "./anticipos";
const now = Date.parse("2026-10-26T12:00:00Z");

const setup = () => {
  const db = new Database(":memory:");
  prepareSchema(db, { origin: "demo", key_hash: null });
  return db;
};
function categories(db: Database) {
  for (let i = 1; i <= 14; i++)
    createClassification(
      db,
      "categorias",
      {
        nombre: "Categoría ficticia " + i,
        anual: "Gasto",
        mensual: "Gasto",
        referencia: [11, 12, 13].includes(i),
      },
      randomUUID(),
      now,
    );
}
function partida(db: Database, cat: string) {
  const s = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub ficticia " + cat, padre: cat },
    randomUUID(),
    now,
  );
  return createClassification(
    db,
    "partidas",
    { nombre: "Partida ficticia " + cat, padre: s.id },
    randomUUID(),
    now,
  ).id;
}
function saldo(db: Database, name = "Cuenta ficticia") {
  return createSaldo(
    db,
    {
      nombre: name,
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "1000",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  ).id;
}
function caseWith(
  db: Database,
  participants: { nombre: string; rol: "Titular" | "Tercero"; partes: number }[] = [
    { nombre: "Yo", rol: "Titular", partes: 1 },
    { nombre: "Bea", rol: "Tercero", partes: 1 },
  ],
) {
  const c = createCompartido(db, { nombre: "Caso ficticio" }, randomUUID(), now);
  for (const p of participants)
    createParticipante(db, c.referencia.id, p, randomUUID(), now);
  return c.referencia.id;
}
function expense(
  db: Database,
  ref: string,
  saldoId: string,
  partidaId: string,
  importe = "450.00",
  fecha = "2026-10-05",
) {
  const body = {
    tipo: "Gasto",
    fecha,
    importe,
    saldo: saldoId,
    partida: partidaId,
    referencia: ref,
    concepto: "Gasto ficticio compartido",
  };
  const p = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    { ...body, fingerprint: p.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    null,
    false,
    now,
  ).movimiento;
}
function transfer(
  db: Database,
  ref: string,
  from: string,
  to: string,
  extra: Record<string, unknown> = {},
) {
  const body = {
    tipo: "Transferencia",
    fecha: "2026-10-06",
    importe: "50.00",
    origen: from,
    destino: to,
    referencia: ref,
    concepto: "Movimiento interno ficticio",
    ...extra,
  };
  const p = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    { ...body, fingerprint: p.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    null,
    false,
    now,
  ).movimiento;
}
const rejection = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e as Problem;
  }
  throw new Error("La operación no fue rechazada");
};
const participant = (db: Database, ref: string, name: string) =>
  getCompartido(db, ref).participantes.find((p) => p.nombre === name)!;

test("B-T05 AC04/05/06/07/27 exact split by Gasto/Partida with largest remainder and stable tie-break", () => {
  const participants = [
    {
      id: "CP001",
      nombre: "Bea",
      rol: "Tercero" as const,
      partes: 1,
      estado: "Activa" as const,
    },
    {
      id: "CP002",
      nombre: "Yo",
      rol: "Titular" as const,
      partes: 1,
      estado: "Activa" as const,
    },
    {
      id: "CP003",
      nombre: "Álex",
      rol: "Tercero" as const,
      partes: 1,
      estado: "Activa" as const,
    },
  ];
  const gastos = [
    {
      id: "1",
      fecha: "2026-10-01",
      importe: "300.00",
      importeCents: 30000n,
      partida: { id: "PAR001", nombre: "Alquiler" },
      valido: true,
      anulado: false,
      motivo: null,
    },
    {
      id: "2",
      fecha: "2026-10-02",
      importe: "150.00",
      importeCents: 15000n,
      partida: { id: "PAR002", nombre: "Limpieza" },
      valido: true,
      anulado: false,
      motivo: null,
    },
    {
      id: "3",
      fecha: "2026-10-03",
      importe: "100.00",
      importeCents: 10000n,
      partida: { id: "PAR003", nombre: "Suministros" },
      valido: true,
      anulado: false,
      motivo: null,
    },
  ];
  const r = calcularReparto(participants, gastos);
  expect(r.bruto).toMatchObject({
    valor: "550.00",
    estado: "Verificada",
  });
  expect(r.brutoCents).toBe(55000n);
  expect(
    Object.fromEntries(
      r.participantes.map((p) => [p.id, p.asignado.valor]),
    ),
  ).toEqual({ CP001: "183.34", CP002: "183.33", CP003: "183.33" });
  expect(r.gastos.map((g) => g.asignaciones.map((a) => a.importe))).toEqual([
    ["100.00", "100.00", "100.00"],
    ["50.00", "50.00", "50.00"],
    ["33.34", "33.33", "33.33"],
  ]);
  for (const g of r.gastos) {
    expect(
      g.asignaciones.reduce((sum, a) => sum + BigInt(a.importe!.replace(".", "")), 0n),
    ).toBe(BigInt(g.importe.replace(".", "")));
  }
  expect(r.partidas.map((p) => [p.id, p.bruto])).toEqual([
    ["PAR001", "300.00"],
    ["PAR002", "150.00"],
    ["PAR003", "100.00"],
  ]);
  expect(r.estado).toBe("Reparto parcial");
  expect(r.recuperado.valor).toBeNull();
  expect(r.recuperado.estado).toBe("No disponible");
});

test("B-T02 AC01 atomic CAT013 Reference+ficha, replay, rollback and no orphans", () => {
  const db = setup();
  const key = randomUUID();
  const body = { nombre: "Piso atómico" };
  const a = createCompartido(db, body, key, now),
    b = createCompartido(db, body, key, now);
  expect(b.referencia.id).toBe(a.referencia.id);
  expect(() =>
    createCompartido(db, { nombre: "Otro" }, key, now),
  ).toThrow("otros datos");
  expect(
    db
      .query("SELECT COUNT(*) n FROM referencias WHERE tipo='Gasto compartido'")
      .get(),
  ).toEqual({ n: 1 });
  expect(
    db.query("SELECT COUNT(*) n FROM fichas_compartidos").get(),
  ).toEqual({ n: 1 });
  const direct = createReference(
    db,
    { nombre: "Directa", tipo: "Gasto compartido" },
    randomUUID(),
    now,
  );
  expect(
    db
      .query("SELECT referencia FROM fichas_compartidos WHERE referencia=?")
      .get(direct.id),
  ).toEqual({ referencia: direct.id });
  // Inject a failure in the ficha insert: the Reference must not survive.
  db.exec(
    "CREATE TRIGGER fail_ficha BEFORE INSERT ON fichas_compartidos BEGIN SELECT RAISE(ABORT,'inyectado'); END",
  );
  expect(() =>
    createCompartido(db, { nombre: "Fallará" }, randomUUID(), now),
  ).toThrow("inyectado");
  expect(
    db
      .query("SELECT COUNT(*) n FROM referencias WHERE nombre='Fallará'")
      .get(),
  ).toEqual({ n: 0 });
  db.exec("DROP TRIGGER fail_ficha");
  expect(getCompartido(db, a.referencia.id).resumen.estado).toBe(
    "Sin repartir",
  );
  expect(() => getCompartido(db, "REF999")).toThrow("no encontrada");
  db.close();
});

test("B-T03 AC02/09/24 participants: stable IDs, revision, impact motive, logical baja, no DELETE or orphans", () => {
  const db = setup();
  const ref = caseWith(db);
  categories(db);
  const p13 = partida(db, "CAT013"),
    a = saldo(db, "Banco A");
  expense(db, ref, a, p13, "450.00");
  const before = getCompartido(db, ref);
  expect(before.participantes.map((p) => p.id)).toEqual(["CP001", "CP002"]);
  expect(before.ficha.revision).toBe(3);
  expect(() =>
    createParticipante(
      db,
      ref,
      { nombre: "Otro titular", rol: "Titular", partes: 1 },
      randomUUID(),
      now,
    ),
  ).toThrow("Titular");
  const bea = participant(db, ref, "Bea");
  const plan = previewParticipante(db, ref, bea.id, {
    revision: bea.revision,
    cambios: { partes: 2 },
  });
  expect(
    plan.impacto.despues.asignado!.asignado.valor,
  ).toBe("300.00");
  expect(() =>
    rectificarParticipante(
      db,
      ref,
      bea.id,
      {
        revision: bea.revision,
        cambios: { partes: 2 },
        motivo: "",
        fingerprint: plan.fingerprint,
      },
      randomUUID(),
      now,
    ),
  ).toThrow("motivo");
  expect(() =>
    rectificarParticipante(
      db,
      ref,
      bea.id,
      {
        revision: bea.revision,
        cambios: { partes: 2 },
        motivo: "Cambio ficticio",
        fingerprint: "incorrecto",
      },
      randomUUID(),
      now,
    ),
  ).toThrow("contexto");
  const changed = rectificarParticipante(
    db,
    ref,
    bea.id,
    {
      revision: bea.revision,
      cambios: { partes: 2 },
      motivo: "Cambio ficticio de reparto",
      fingerprint: plan.fingerprint,
    },
    randomUUID(),
    now,
  );
  const updated = changed.participantes.find((p) => p.id === bea.id)!;
  expect(updated).toMatchObject({
    nombre: "Bea",
    partes: 2,
    revision: 2,
  });
  expect(() =>
    rectificarParticipante(
      db,
      ref,
      bea.id,
      {
        revision: 1,
        cambios: { partes: 3 },
        motivo: "Obsoleto",
        fingerprint: plan.fingerprint,
      },
      randomUUID(),
      now,
    ),
  ).toThrow("cambiado");
  const other = caseWith(db, [{ nombre: "Titular otro", rol: "Titular", partes: 1 }]);
  expect(() =>
    previewParticipante(db, other, bea.id, {
      revision: 1,
      cambios: { partes: 1 },
    }),
  ).toThrow("no encontrado");
  expect(() =>
    db.run("DELETE FROM participantes_compartido WHERE id=?", [bea.id]),
  ).toThrow("no delete");
  const low = bajaParticipante(
    db,
    ref,
    bea.id,
    { revision: 2, motivo: "Baja ficticia" },
    randomUUID(),
    now,
  );
  expect(low.participantes.find((p) => p.id === bea.id)).toMatchObject({
    estado: "Baja",
    partes: 2,
  });
  expect(low.participantes.find((p) => p.id === bea.id)!.asignado.estado).toBe(
    "No aplica",
  );
  expect(
    db
      .query(
        "SELECT COUNT(*) n FROM participantes_compartido WHERE referencia=?",
      )
      .get(ref),
  ).toEqual({ n: 2 });
  expect(
    db
      .query(
        "SELECT accion FROM compartido_audit WHERE referencia=? ORDER BY id",
      )
      .all(ref)
      .map((r) => (r as { accion: string }).accion),
  ).toEqual([
    "alta ficha",
    "alta participante",
    "alta participante",
    "rectificar participante",
    "baja participante",
  ]);
  expect(() =>
    db.run("UPDATE compartido_audit SET accion='x' WHERE referencia=?", [ref]),
  ).toThrow("immutable audit");
  db.close();
});

test("B-T04/B-T09 CAT013 gates: Gasto only with ficha, internal Transfer without accreditation, S000/D5 blocked", () => {
  const db = setup();
  categories(db);
  const p13 = partida(db, "CAT013"),
    p9 = partida(db, "CAT009"),
    a = saldo(db, "Banco A"),
    b = saldo(db, "Banco B");
  const ref = caseWith(db, []);
  const gasto = expense(db, ref, a, p13);
  expect(gasto.referencia?.id).toBe(ref);
  expect(() => expense(db, ref, a, p9)).toThrow("CAT013");
  const noFicha = createReference(
    db,
    { nombre: "Sin ficha inyectada", tipo: "Viaje" },
    randomUUID(),
    now,
  );
  db.run(
    "INSERT INTO referencias(id,nombre,tipo,estado,revision,creado,actualizado) VALUES('REF900','Compartida sin ficha','Gasto compartido','Activa',1,?,?)",
    [new Date(now).toISOString(), new Date(now).toISOString()],
  );
  expect(() => expense(db, "REF900", a, p13)).toThrow("ficha 1:1");
  const t = transfer(db, ref, a, b);
  expect(t.tipo).toBe("Transferencia");
  expect(t.referencia?.id).toBe(ref);
  expect(t.anticipo).toBeNull();
  expect(() =>
    transfer(db, ref, a, b, {
      anticipo: {
        rol: "Adelanto",
        origen: a,
        destino: b,
        evidencia: "ficticia",
        procedencia: "ficticia",
      },
    }),
  ).toThrow("Atribución");
  expect(() =>
    transfer(db, ref, "S000", b),
  ).toThrow();
  expect(() =>
    transfer(db, ref, b, "S000"),
  ).toThrow();
  expect(() => {
    const body = {
      tipo: "Ingreso",
      fecha: "2026-10-07",
      importe: "10.00",
      saldo: a,
      subtipo: "Bonus",
      referencia: ref,
      concepto: "Ingreso ficticio",
    };
    const p = previewMovement(db, body, null, false, now);
    writeMovement(
      db,
      { ...body, fingerprint: p.fingerprint, aceptarCoincidencia: true },
      randomUUID(),
      null,
      false,
      now,
    );
  }).toThrow("solo admite Gastos");
  expect(
    db
      .query(
        "SELECT name FROM sqlite_master WHERE name IN ('movimiento_compartido','aportaciones_compartido')",
      )
      .all(),
  ).toEqual([]);
  expect(() =>
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,concepto,nota,revision,creado,actualizado) VALUES('901','2026-10-01','Transferencia',100,'S000','S001','x','',1,'2026-10-01T00:00:00Z','2026-10-01T00:00:00Z')",
    ),
  ).toThrow();
  expect(() =>
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,concepto,nota,revision,creado,actualizado) VALUES('902','2026-10-01','Gasto',100,'S001','S000','x','',1,'2026-10-01T00:00:00Z','2026-10-01T00:00:00Z')",
    ),
  ).toThrow();
  void noFicha;
  db.close();
});

test("B-T06 AC12/13/15/17/25/29/38/39 states and metrics: no source is never zero, 100% Titular closes", () => {
  const db = setup();
  categories(db);
  const p13 = partida(db, "CAT013"),
    a = saldo(db, "Banco A");
  const empty = caseWith(db, [{ nombre: "Yo", rol: "Titular", partes: 1 }]);
  let d = getCompartido(db, empty);
  expect(d.resumen).toMatchObject({
    estado: "Sin repartir",
    estadoReparto: "Sin repartir",
  });
  expect(d.resumen.bruto).toMatchObject({
    valor: null,
    estado: "No disponible",
  });
  expect(d.resumen.bruto.valor).not.toBe("0.00");
  expect(d.resumen.neto.valor).toBeNull();
  expect(d.resumen.pendienteTerceros.estado).toBe("No disponible");
  expect(d.resumen.exceso.valor).toBeNull();
  expense(db, empty, a, p13, "150.00");
  d = getCompartido(db, empty);
  expect(d.resumen).toMatchObject({
    estado: "Cerrado",
    estadoReparto: "Cerrado",
    puedeCerrar: true,
    hayTercerosConCuota: false,
  });
  expect(d.resumen.bruto).toMatchObject({ valor: "150.00", estado: "Verificada" });
  expect(d.resumen.neto).toMatchObject({ valor: "150.00", estado: "Verificada" });
  expect(d.resumen.costePropio).toMatchObject({
    valor: "150.00",
    estado: "Verificada",
  });
  expect(d.resumen.recuperado.estado).toBe("No aplica");
  expect(d.participantes[0].pendiente).toMatchObject({
    valor: "0.00",
    estado: "Verificada",
  });
  expect(d.participantes[0].aportado.estado).toBe("No aplica");
  expect(d.gastos[0].neto).toMatchObject({ valor: "150.00", estado: "Verificada" });
  expect(d.partidas[0].neto).toMatchObject({
    valor: "150.00",
    estado: "Verificada",
  });
  const shared = caseWith(db);
  expense(db, shared, a, p13, "450.00");
  d = getCompartido(db, shared);
  expect(d.resumen).toMatchObject({
    estado: "Reparto parcial",
    estadoReparto: "Reparto parcial",
    puedeCerrar: false,
    hayTercerosConCuota: true,
  });
  expect(d.resumen.recuperado).toMatchObject({
    valor: null,
    estado: "No disponible",
  });
  expect(d.resumen.neto).toMatchObject({
    valor: null,
    estado: "No disponible",
  });
  expect(d.resumen.exceso).toMatchObject({
    valor: null,
    estado: "No disponible",
  });
  expect(d.resumen.pendienteTerceros.estado).toBe("No disponible");
  const tercero = d.participantes.find((p) => p.rol === "Tercero")!;
  expect(tercero.asignado.valor).toBe("225.00");
  expect(tercero.pendiente).toMatchObject({
    valor: null,
    estado: "No disponible",
  });
  expect(tercero.exceso.valor).toBeNull();
  expect(d.gastos[0].neto.estado).toBe("No disponible");
  expect(d.partidas[0].neto.estado).toBe("No disponible");
  db.close();
});

test("B-T06 AC28/29/30/31 incompatible Gasto marks Revisar/partial and P-F6 resolution recalculates", () => {
  const db = setup();
  categories(db);
  const p13 = partida(db, "CAT013"),
    p9 = partida(db, "CAT009"),
    a = saldo(db, "Banco A");
  const ref = caseWith(db, [{ nombre: "Yo", rol: "Titular", partes: 1 }]);
  expense(db, ref, a, p13, "100.00");
  const historical = "950";
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,referencia,concepto,nota,capital,intereses,anulado,revision,creado,actualizado) VALUES(?,'2026-10-04','Gasto',5000,?,'S000',NULL,?,?,'Histórico incompatible','',NULL,NULL,0,1,?,?)",
    [
      historical,
      a,
      p9,
      ref,
      new Date(now).toISOString(),
      new Date(now).toISOString(),
    ],
  );
  const beforeRows = JSON.stringify(
    db.query("SELECT * FROM movimientos ORDER BY id").all(),
  );
  let d = getCompartido(db, ref);
  expect(d.resumen.estado).toBe("Revisar");
  expect(d.resumen.estadoReparto).toBe("Cerrado");
  expect(d.resumen.puedeCerrar).toBe(false);
  expect(d.resumen.bruto).toMatchObject({
    valor: null,
    subtotal: "100.00",
    estado: "Parcial",
  });
  expect(d.resumen.neto).toMatchObject({
    valor: null,
    subtotal: "100.00",
    estado: "Parcial",
  });
  expect(d.resumen.costePropio).toMatchObject({
    valor: null,
    subtotal: "100.00",
    estado: "Parcial",
  });
  expect(d.resumen.alertas[0]).toMatchObject({
    tipo: "revisar",
    gastoId: historical,
  });
  expect(d.resumen.alertas[0].motivo).toContain(historical);
  expect(d.resumen.alertas[0].motivo).toContain("CAT013");
  expect(d.gastos.find((g) => g.id === historical)!.valido).toBe(false);
  expect(d.gastos.find((g) => g.id === historical)!.computaEnBruto).toBe(false);
  expect(JSON.stringify(d)).not.toContain('"recuperado":{"valor":"0.00"');
  const historicalRow = getMovement(db, historical).movimiento;
  const fix = {
    tipo: historicalRow.tipo,
    fecha: historicalRow.fecha,
    importe: historicalRow.importe,
    saldo: historicalRow.origen.id,
    partida: p13,
    referencia: ref,
    concepto: historicalRow.concepto,
    nota: historicalRow.nota,
    revision: historicalRow.revision,
    motivo: "Resolución ficticia P-F6: enlace incompatible corregido",
  };
  const plan = previewMovement(db, fix, historical, false, now);
  writeMovement(
    db,
    {
      ...fix,
      fingerprint: plan.fingerprint,
      contextRevision: plan.contextRevision,
      aceptarCoincidencia: true,
    },
    randomUUID(),
    historical,
    false,
    now,
  );
  d = getCompartido(db, ref);
  expect(d.resumen.estado).toBe("Cerrado");
  expect(d.resumen.bruto).toMatchObject({
    valor: "150.00",
    estado: "Verificada",
  });
  expect(d.resumen.neto).toMatchObject({
    valor: "150.00",
    estado: "Verificada",
  });
  expect(d.resumen.puedeCerrar).toBe(true);
  expect(
    JSON.parse(
      JSON.stringify(
        db.query("SELECT * FROM movimientos WHERE id<>? ORDER BY id").all(
          historical,
        ),
      ),
    ),
  ).toEqual(JSON.parse(beforeRows).filter((r: { id: string }) => r.id !== historical));
  expect(getMovement(db, historical).movimiento.revision).toBe(2);
  db.close();
});

test("B-T07 AC18/19/24 impact, motive, append-only history and untouched bank facts", () => {
  const db = setup();
  categories(db);
  const p13 = partida(db, "CAT013"),
    a = saldo(db, "Banco A");
  const ref = caseWith(db);
  expense(db, ref, a, p13, "450.00");
  const before = JSON.stringify(
    db.query("SELECT * FROM movimientos ORDER BY id").all(),
  );
  const d = getCompartido(db, ref);
  const bea = d.participantes.find((p) => p.nombre === "Bea")!;
  const plan = previewParticipante(db, ref, bea.id, {
    revision: bea.revision,
    cambios: { partes: 2 },
  });
  const changed = rectificarParticipante(
    db,
    ref,
    bea.id,
    {
      revision: bea.revision,
      cambios: { partes: 2 },
      motivo: "Reparto ficticio",
      fingerprint: plan.fingerprint,
    },
    randomUUID(),
    now,
  );
  expect(changed.resumen.recuperado.estado).toBe("No disponible");
  expect(
    JSON.stringify(db.query("SELECT * FROM movimientos ORDER BY id").all()),
  ).toBe(before);
  expect(() =>
    bajaParticipante(
      db,
      ref,
      bea.id,
      { revision: 2, motivo: "" },
      randomUUID(),
      now,
    ),
  ).toThrow("motivo");
  bajaParticipante(
    db,
    ref,
    bea.id,
    { revision: 2, motivo: "Baja ficticia" },
    randomUUID(),
    now,
  );
  expect(
    JSON.stringify(db.query("SELECT * FROM movimientos ORDER BY id").all()),
  ).toBe(before);
  expect(listCompartidos(db).total).toBe(1);
  expect(
    db.query("SELECT COUNT(*) n FROM compartido_audit WHERE referencia=?").get(ref),
  ).toEqual({ n: 5 });
  db.close();
});

test("B-T01 genuine v13 migration preserves rows, reject unknown version and roll back DDL", () => {
  const db = new Database(":memory:");
  prepareV13(db);
  categories(db);
  const p9 = partida(db, "CAT009"),
    a = saldo(db, "Banco migrado");
  const travel = createReference(
    db,
    { nombre: "Viaje previo", tipo: "Viaje" },
    randomUUID(),
    now,
  );
  expense(db, travel.id, a, p9, "25.00");
  const anticipo = createAnticipo(
      db,
      { nombre: "Anticipo previo" },
      randomUUID(),
      now,
    ).referencia.id,
    a2 = createSaldo(
      db,
      {
        nombre: "Cuenta anticipo previa",
        tipo: "Efectivo",
        control: "Movimientos",
        saldoApertura: "0",
        fechaApertura: "2026-01-01",
      },
      randomUUID(),
      now,
    ).id;
  const advance = {
    tipo: "Transferencia",
    fecha: "2026-10-08",
    importe: "10.00",
    origen: a,
    destino: a2,
    referencia: anticipo,
    concepto: "Adelanto ficticio previo",
    anticipo: {
      rol: "Adelanto",
      origen: a,
      destino: a2,
      evidencia: "declaración ficticia",
      procedencia: "registro ficticio",
    },
  };
  const advancePlan = previewMovement(db, advance, null, false, now);
  writeMovement(
    db,
    {
      ...advance,
      fingerprint: advancePlan.fingerprint,
      aceptarCoincidencia: true,
    },
    randomUUID(),
    null,
    false,
    now,
  );
  const before = Object.fromEntries(
    [
      "referencias",
      "movimientos",
      "movement_audit",
      "audit",
      "fichas_anticipos",
      "movimiento_anticipo",
      "anticipo_audit",
      "saldos",
      "partidas",
      "database_origin",
    ].map((table) => [
      table,
      JSON.stringify(db.query(`SELECT * FROM ${table} ORDER BY 1`).all()),
    ]),
  );
  prepareSchema(db, { origin: "demo", key_hash: null });
  expect(db.query("SELECT version FROM schema_version").get()).toEqual({
    version: 15,
  });
  for (const table of Object.keys(before))
    expect(JSON.stringify(db.query(`SELECT * FROM ${table} ORDER BY 1`).all())).toBe(
      before[table],
    );
  expect(
    db
      .query(
        "SELECT name FROM sqlite_master WHERE name IN ('fichas_compartidos','participantes_compartido','compartido_audit','compartido_attempts') ORDER BY name",
      )
      .all(),
  ).toEqual([
    { name: "compartido_attempts" },
    { name: "compartido_audit" },
    { name: "fichas_compartidos" },
    { name: "participantes_compartido" },
  ]);
  expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
  expect(
    db.query("SELECT name FROM sqlite_master WHERE name='fichas_vehiculo'").get(),
  ).toEqual({ name: "fichas_vehiculo" });
  const referenceSql = (
    db
      .query("SELECT sql FROM sqlite_master WHERE type='table' AND name='referencias'")
      .get() as { sql: string }
  ).sql;
  expect(referenceSql).toContain("'Vehículo'");
  expect(referenceSql).toContain("'Gasto compartido'");
  db.close();

  const unknown = new Database(":memory:");
  prepareV13(unknown);
  unknown.run("UPDATE schema_version SET version=99");
  expect(() => prepareSchema(unknown, { origin: "demo", key_hash: null })).toThrow(
    "compatible",
  );
  unknown.close();

  const broken = new Database(":memory:");
  prepareV13(broken);
  broken.exec("CREATE TABLE participantes_compartido(x)");
  expect(() => prepareSchema(broken, { origin: "demo", key_hash: null })).toThrow();
  // prepareSchema closes the connection on failure: reopen a file fixture to prove rollback.
  const dir = mkdtempSync(join(tmpdir(), "e32-rollback-"));
  try {
    const path = join(dir, "v13.sqlite");
    const file = new Database(path);
    prepareV13(file);
    file.exec("CREATE TABLE participantes_compartido(x)");
    expect(() =>
      prepareSchema(file, { origin: "demo", key_hash: null }),
    ).toThrow();
    const after = new Database(path, { strict: true });
    expect(after.query("SELECT version FROM schema_version").get()).toEqual({
      version: 13,
    });
    expect(
      after
        .query("SELECT name FROM sqlite_master WHERE name='fichas_compartidos'")
        .get(),
    ).toBeNull();
    expect(() =>
      after.run(
        "INSERT INTO referencias(id,nombre,tipo,estado,revision,creado,actualizado) VALUES('REF900','x','Gasto compartido','Activa',1,'x','x')",
      ),
    ).toThrow();
    after.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  broken.close();
});

test("B-T01 v14 Vehículos → v15 preserves vehicle ficha/audit and rejects a v14 variant without its contract", () => {
  const db = new Database(":memory:");
  prepareV14(db);
  expect(db.query("SELECT version FROM schema_version").get()).toEqual({
    version: 14,
  });
  db.run(
    "INSERT INTO referencias VALUES('REF700','Vehículo previo','Vehículo','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
  );
  db.run(
    "INSERT INTO fichas_vehiculo VALUES('REF700','7000 ABC','2027-02-03','2027-02-01',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
  );
  db.run(
    "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES('ficha_vehiculo','alta',1,'{\"referencia\":\"REF700\"}','2026-01-01T00:00:00Z',0,'usuario-unico','Alta previa')",
  );
  const refs = db.query("SELECT * FROM referencias ORDER BY id").all(),
    fichas = db.query("SELECT * FROM fichas_vehiculo ORDER BY referencia").all(),
    audits = db.query("SELECT * FROM audit ORDER BY id").all();
  prepareSchema(db, { origin: "demo", key_hash: null });
  expect(db.query("SELECT version FROM schema_version").get()).toEqual({
    version: 15,
  });
  expect(db.query("SELECT * FROM referencias ORDER BY id").all()).toEqual(refs);
  expect(db.query("SELECT * FROM fichas_vehiculo ORDER BY referencia").all()).toEqual(
    fichas,
  );
  expect(db.query("SELECT * FROM audit ORDER BY id").all()).toEqual(audits);
  expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
  expect(
    db.query("SELECT name FROM sqlite_master WHERE name='fichas_compartidos'").get(),
  ).toEqual({ name: "fichas_compartidos" });
  db.close();

  const variant = new Database(":memory:");
  prepareV13(variant);
  variant.run("UPDATE schema_version SET version=14");
  expect(() =>
    prepareSchema(variant, { origin: "demo", key_hash: null }),
  ).toThrow("Variante v14");
  variant.close();
});

test("B-T08 AC22 DTO contract, protected routes, CSRF/Origin, 404/409/422 and reads do not mutate", async () => {
  const { HttpApp } = await import("@effect/platform"),
    { Auth, provision, totp } = await import("./auth"),
    { createApp } = await import("./app");
  const db = setup(),
    key = randomBytes(32);
  let clock = now;
  const auth = new Auth(db, key, "http://127.0.0.1:5173", () => clock),
    handler = HttpApp.toWebHandler(createApp(db, { key, now: () => clock }));
  const empty = caseWith(db, [{ nombre: "Yo", rol: "Titular", partes: 1 }]);
  categories(db);
  const p13 = partida(db, "CAT013"),
    a = saldo(db, "Banco A");
  expense(db, empty, a, p13, "150.00");
  const shared = caseWith(db);
  expense(db, shared, a, p13, "450.00");
  const bea = participant(db, shared, "Bea");
  const paths = [
    "/api/compartidos/fichas",
    "/api/compartidos/fichas/" + shared,
    "/api/compartidos/fichas/" + shared + "/participantes",
    "/api/compartidos/fichas/" + shared + "/participantes/" + bea.id + "/impacto",
    "/api/compartidos/fichas/" + shared + "/participantes/" + bea.id + "/rectificar",
    "/api/compartidos/fichas/" + shared + "/participantes/" + bea.id + "/baja",
  ];
  for (const path of paths)
    for (const method of ["GET", "POST", "PATCH", "DELETE"])
      expect(
        (await handler(new Request("http://127.0.0.1:5173" + path, { method })))
          .status,
      ).toBe(401);
  const e = await auth.enroll(
      provision(db, now),
      "Contraseña ficticia extensa de seguridad",
    ),
    v = auth.verify(
      new Request("http://127.0.0.1:5173", {
        headers: { cookie: auth.challengeName + "=" + e.challenge },
      }),
      totp(e.secret!).generate({ timestamp: now }),
    );
  const headers = {
    cookie: auth.cookieName + "=" + v.session,
    origin: "http://127.0.0.1:5173",
    "x-csrf-token": v.csrf,
    "content-type": "application/json",
    "idempotency-key": randomUUID(),
  };
  for (const path of paths)
    expect(
      (
        await handler(
          new Request("http://127.0.0.1:5173" + path, {
            method: "POST",
            headers: { ...headers, "x-csrf-token": "" },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(403);
  expect(
    (
      await handler(
        new Request("http://127.0.0.1:5173" + paths[2], {
          method: "POST",
          headers: { ...headers, origin: "http://invalid.test" },
          body: "{}",
        }),
      )
    ).status,
  ).toBe(403);
  const read = async (path: string) =>
      (await handler(new Request("http://127.0.0.1:5173" + path, { headers }))).json(),
    post = async (path: string, body: unknown) =>
      handler(
        new Request("http://127.0.0.1:5173" + path, {
          method: "POST",
          headers: { ...headers, "idempotency-key": randomUUID() },
          body: JSON.stringify(body),
        }),
      );
  const dto = (await read("/api/compartidos/fichas/" + shared)) as any;
  expect(dto.resumen.recuperado).toMatchObject({
    valor: null,
    estado: "No disponible",
  });
  expect(dto.resumen.exceso).toMatchObject({
    valor: null,
    estado: "No disponible",
  });
  expect(
    JSON.stringify({
      recuperado: dto.resumen.recuperado,
      exceso: dto.resumen.exceso,
    }),
  ).not.toContain("0.00");
  const closed = (await read("/api/compartidos/fichas/" + empty)) as any;
  expect(closed.resumen.neto.valor).toBe("150.00");
  expect(closed.resumen.costePropio.valor).toBe("150.00");
  const snapshot = () =>
    JSON.stringify({
      referencias: db.query("SELECT * FROM referencias ORDER BY id").all(),
      movimientos: db.query("SELECT * FROM movimientos ORDER BY id").all(),
      participantes: db
        .query("SELECT * FROM participantes_compartido ORDER BY id")
        .all(),
      auditoria: db.query("SELECT * FROM compartido_audit ORDER BY id").all(),
    });
  const stable = snapshot();
  for (let i = 0; i < 3; i++)
    await read("/api/compartidos/fichas/" + shared);
  expect(snapshot()).toBe(stable);
  expect(
    (
      await handler(
        new Request("http://127.0.0.1:5173/api/compartidos/fichas/REF999", {
          headers,
        }),
      )
    ).status,
  ).toBe(404);
  expect(
    (await post("/api/compartidos/fichas/" + shared + "/participantes/" + bea.id + "/impacto", {
      revision: 99,
      cambios: { partes: 2 },
    })).status,
  ).toBe(409);
  expect(
    (await post("/api/compartidos/fichas/" + shared + "/participantes/" + bea.id + "/impacto", {
      revision: bea.revision,
      cambios: { partes: -1 },
    })).status,
  ).toBe(422);
  expect(
    (await post("/api/compartidos/fichas/" + shared + "/participantes", {
      nombre: "Titular duplicado",
      rol: "Titular",
      partes: 1,
    })).status,
  ).toBe(422);
  const create = await post("/api/compartidos/fichas", { nombre: "Caso HTTP" });
  expect(create.status).toBe(201);
  const created = (await create.json()) as any;
  expect(created.referencia.tipo).toBe("Gasto compartido");
  clock += 1800001;
  expect(
    (
      await handler(
        new Request("http://127.0.0.1:5173/api/compartidos/fichas/" + shared, {
          headers,
        }),
      )
    ).status,
  ).toBe(401);
  db.close();
});
