import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { prepareSchema } from "./database-schema";
import { createClassification } from "./clasificacion";
import { createSaldo } from "./saldos";
import { createBudget } from "./presupuestos";
import {
  createCycle,
  cycleContext,
  type Cycle,
} from "./ciclos";
import {
  getCyclePlan,
  previewCyclePlan,
  confirmCyclePlan,
} from "./planes-ciclo";
import { previewMovement, writeMovement } from "./movimientos";
import { createAnticipo, previewOpening, confirmOpening } from "./anticipos";
import { e35Metrics } from "./e35";
import {
  activateRegimen,
  prepareRegimen,
  writeComidaRol,
} from "./comida";
import {
  createCompartido,
  createParticipante,
  getCompartido,
} from "./compartidos";
import { listPendientes, getPendiente, type TransversalItem } from "./pendientes";

const now = Date.parse("2027-02-10T12:00:00Z");

function setup() {
  const db = new Database(":memory:");
  prepareSchema(db, { origin: "demo", key_hash: null });
  return db;
}

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
  const suffix = randomUUID().slice(0, 8);
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub ficticia " + cat + " " + suffix, padre: cat },
    randomUUID(),
    now,
  );
  return createClassification(
    db,
    "partidas",
    { nombre: "Partida ficticia " + cat + " " + suffix, padre: sub.id },
    randomUUID(),
    now,
  ).id;
}

function saldo(db: Database, name: string) {
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

function cycle(db: Database, inicio: string, s0 = "0"): Cycle {
  return createCycle(
    db,
    { inicio, saldoInicialComida: s0, contextRevision: cycleContext(db).revision },
    randomUUID(),
    now,
  ).ciclo;
}

function add(db: Database, body: Record<string, unknown>) {
  const plan = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    {
      ...body,
      fingerprint: plan.fingerprint,
      contextRevision: plan.contextRevision,
      aceptarCoincidencia: true,
    },
    randomUUID(),
    null,
    false,
    now,
  ).movimiento;
}

function transfer(
  db: Database,
  from: string,
  to: string,
  importe: string,
  fecha: string,
) {
  return add(db, {
    tipo: "Transferencia",
    fecha,
    importe,
    origen: from,
    destino: to,
    concepto: "Transferencia ficticia",
    nota: "",
  });
}

function anticipo(db: Database, nombre = "Anticipo ficticio") {
  return createAnticipo(db, { nombre }, randomUUID(), now).referencia.id;
}

function anticipoTransfer(
  db: Database,
  ref: string,
  rol: "Adelanto" | "Devolución",
  importe: string,
  fecha: string,
  from = "S001",
  to = "S002",
) {
  const pair =
    rol === "Devolución" ? { origen: to, destino: from } : { origen: from, destino: to };
  return add(db, {
    tipo: "Transferencia",
    fecha,
    importe,
    origen: from,
    destino: to,
    referencia: ref,
    concepto: "Transferencia de anticipo ficticia",
    nota: "",
    anticipo: {
      rol,
      ...pair,
      evidencia: "declaración ficticia",
      procedencia: "registro explícito",
    },
  });
}

function photo(db: Database, ref: string, cicloId: string, importe: string) {
  const body = {
    ciclo: cicloId,
    importe,
    evidencia: "estado ficticio al abrir",
    procedencia: "archivo ficticio",
    coberturaVerificada: true,
  };
  const preview = previewOpening(db, ref, body);
  return confirmOpening(
    db,
    ref,
    { ...body, ...preview, confirmado: true },
    randomUUID(),
    now,
  );
}

function sharedCase(
  db: Database,
  participants: {
    nombre: string;
    rol: "Titular" | "Tercero";
    partes: number;
  }[],
) {
  const created = createCompartido(
    db,
    { nombre: "Caso compartido ficticio" },
    randomUUID(),
    now,
  );
  for (const p of participants)
    createParticipante(db, created.referencia.id, p, randomUUID(), now);
  return created.referencia.id;
}

function sharedExpense(
  db: Database,
  ref: string,
  payer: string,
  partidaId: string,
  importe: string,
  fecha = "2026-10-05",
) {
  return add(db, {
    tipo: "Gasto",
    fecha,
    importe,
    saldo: payer,
    partida: partidaId,
    referencia: ref,
    concepto: "Gasto compartido ficticio",
    nota: "",
  });
}

function sharedContribution(
  db: Database,
  ref: string,
  destino: string,
  participante: string,
  importe: string,
  fecha = "2026-10-10",
) {
  return add(db, {
    tipo: "Transferencia",
    fecha,
    importe,
    origen: "S000",
    destino,
    referencia: ref,
    concepto: "Aportación ficticia de tercero",
    nota: "",
    compartido: {
      participante,
      evidencia: "Extracto bancario ficticio",
      procedencia: "Documento bancario",
    },
  });
}

const participant = (db: Database, ref: string, nombre: string) =>
  getCompartido(db, ref).participantes.find((p) => p.nombre === nombre)!;

function fila(
  result: ReturnType<typeof listPendientes>,
  tipo: TransversalItem["tipo"],
  id: string,
) {
  return result.filas.find((f) => f.tipo === tipo && f.fuente.id === id);
}

function snapshot(db: Database) {
  return (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
  ).map(
    ({ name }) =>
      [name, db.query(`SELECT * FROM "${name}" ORDER BY rowid`).all()] as const,
  );
}

test("AC-01/AC-08: una fila por caso, Neto central y exceso separados sin segundo gasto", () => {
  const db = setup();
  try {
    categories(db);
    const p13 = partida(db, "CAT013");
    const payer = saldo(db, "Banco pagador");
    const destination = saldo(db, "Cuenta destino");
    const ref = sharedCase(db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Bea", rol: "Tercero", partes: 1 },
      { nombre: "Álex", rol: "Tercero", partes: 1 },
    ]);
    sharedExpense(db, ref, payer, p13, "450.00");
    sharedContribution(db, ref, destination, participant(db, ref, "Álex").id, "300.00");
    const beforeMovements = db.query("SELECT COUNT(*) n FROM movimientos").get();
    const result = listPendientes(db, new URLSearchParams(), now);
    const row = fila(result, "Compartido", ref)!;
    expect(row).toBeDefined();
    expect(row.estado).toBe("Pendiente");
    expect(row.importe).toBe("150.00");
    expect(row.detalle.find((d) => d.etiqueta === "Estado del caso")?.valor).toBe(
      "Reparto parcial",
    );
    const metricas = Object.fromEntries(
      row.metricas.map((m) => [m.clave, m.importe]),
    );
    expect(metricas).toMatchObject({
      pendienteTerceros: "150.00",
      exceso: "150.00",
      neto: "150.00",
      costePropio: "150.00",
      bruto: "450.00",
      recuperado: "300.00",
    });
    expect(row.alertas).toHaveLength(1);
    expect(row.alertas[0]).toMatchObject({ tipo: "Exceso", importe: "150.00" });
    // No hay un segundo gasto: el Neto no se suma al Bruto en la fila.
    expect(row.importe).not.toBe("300.00");
    expect(row.importe).not.toBe("600.00");
    expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual(
      beforeMovements,
    );
    expect(
      db.query("SELECT COUNT(*) n FROM movimientos WHERE tipo='Ingreso'").get(),
    ).toEqual({ n: 0 });

    // Cerrado con coste propio positivo: no exige Neto cero y no es un pendiente.
    const cerrado = sharedCase(db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Bea", rol: "Tercero", partes: 1 },
      { nombre: "Álex", rol: "Tercero", partes: 1 },
    ]);
    sharedExpense(db, cerrado, payer, p13, "300.00");
    sharedContribution(db, cerrado, destination, participant(db, cerrado, "Bea").id, "100.00");
    sharedContribution(db, cerrado, destination, participant(db, cerrado, "Álex").id, "100.00");
    const abiertos = listPendientes(db, new URLSearchParams(), now);
    expect(fila(abiertos, "Compartido", cerrado)).toBeUndefined();
    const historico = listPendientes(
      db,
      new URLSearchParams({ alcance: "historico" }),
      now,
    );
    const resuelto = fila(historico, "Compartido", cerrado)!;
    expect(resuelto.estado).toBe("Resuelto");
    expect(resuelto.importe).toBe("0.00");
    expect(resuelto.metricas.find((m) => m.clave === "neto")!.importe).toBe(
      "100.00",
    );
  } finally {
    db.close();
  }
});

test("AC-06: céntimos exactos y una fila por caso multi-Gasto/multi-Partida", () => {
  const db = setup();
  try {
    categories(db);
    const p1 = partida(db, "CAT013");
    const p2 = partida(db, "CAT013");
    const p3 = partida(db, "CAT013");
    const payer = saldo(db, "Banco pagador");
    const destination = saldo(db, "Cuenta destino");
    const ref = sharedCase(db, [
      { nombre: "Bea", rol: "Tercero", partes: 1 },
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Álex", rol: "Tercero", partes: 1 },
    ]);
    const g1 = sharedExpense(db, ref, payer, p1, "300.00", "2026-10-01");
    const g2 = sharedExpense(db, ref, payer, p2, "150.00", "2026-10-02");
    const g3 = sharedExpense(db, ref, payer, p3, "100.00", "2026-10-03");
    sharedContribution(db, ref, destination, participant(db, ref, "Álex").id, "300.00");
    const dto = getCompartido(db, ref);
    // Asignación exacta del motor: G3 33,34 / 33,33 / 33,33 con desempate por ID.
    expect(
      dto.gastos.find((g) => g.id === g3.id)!.asignaciones.map((a) => a.importe),
    ).toEqual(["33.34", "33.33", "33.33"]);
    for (const gasto of dto.gastos) {
      const sum = gasto.asignaciones.reduce(
        (n, a) => n + BigInt(a.importe!.replace(".", "")),
        0n,
      );
      expect(sum).toBe(BigInt(gasto.importe.replace(".", "")));
    }
    const row = fila(listPendientes(db, new URLSearchParams(), now), "Compartido", ref)!;
    expect(row.importe).toBe("183.34");
    expect(row.estado).toBe("Pendiente");
    expect(row.metricas.find((m) => m.clave === "neto")!.importe).toBe("250.00");
    expect(row.contextos.filter((c) => c.tipo === "Gasto").map((c) => c.fuenteId)).toEqual(
      expect.arrayContaining([g1.id, g2.id, g3.id]),
    );
    expect(row.contextos.filter((c) => c.tipo === "Gasto")).toHaveLength(3);
  } finally {
    db.close();
  }
});

test("AC-03: Anticipo y devolución no ejecutan Plan ni crean Ingreso/Gasto", () => {
  const db = setup();
  try {
    const c = cycle(db, "2026-01-20");
    const budget = createBudget(
      db,
      { nombre: "Línea no relacionada", fuente: "No aplica", destino: null },
      randomUUID(),
      now,
    );
    const proposal = () => {
      const plan = getCyclePlan(db, c.id, now);
      return {
        revision: plan.revision,
        contextRevision: plan.contextRevision,
        cambios: [{ presupuesto: budget.id, delMes: "100" }],
      };
    };
    const p = proposal();
    const preview = previewCyclePlan(db, c.id, p, now);
    confirmCyclePlan(
      db,
      c.id,
      { propuesta: p, fingerprint: preview.fingerprint, motivo: "Fixture" },
      randomUUID(),
      now,
    );
    const ref = anticipo(db);
    anticipoTransfer(db, ref, "Adelanto", "1000", "2026-02-03");
    anticipoTransfer(db, ref, "Devolución", "400", "2026-03-15", "S002", "S001");
    const planBefore = getCyclePlan(db, c.id, now);
    const movementsBefore = db.query("SELECT COUNT(*) n FROM movimientos").get();
    const row = fila(listPendientes(db, new URLSearchParams(), now), "Anticipo", ref)!;
    expect(row.estado).toBe("Pendiente");
    expect(row.importe).toBe("600.00");
    expect(getCyclePlan(db, c.id, now)).toEqual(planBefore);
    expect(planBefore.items[0].aTransferir).toBe("100.00");
    expect(db.query("SELECT COUNT(*) n FROM movimientos").get()).toEqual(
      movementsBefore,
    );
    expect(
      db.query(
        "SELECT COUNT(*) n FROM movimientos WHERE tipo IN ('Ingreso','Gasto')",
      ).get(),
    ).toEqual({ n: 0 });
    expect(row.contextos.map((c) => c.tipo)).toEqual(
      expect.arrayContaining(["Adelanto", "Devolucion"]),
    );
  } finally {
    db.close();
  }
});

test("AC-04: Comida no se resta al flujo y FIN_NETA se usa una sola vez", () => {
  const db = setup();
  try {
    categories(db);
    const food = partida(db, "CAT001");
    const account = saldo(db, "Cuenta origen");
    const ing = saldo(db, "ING Comida");
    const c1 = cycle(db, "2026-10-01", "100");
    cycle(db, "2026-11-01", "0");
    add(db, {
      tipo: "Gasto",
      fecha: "2026-10-03",
      importe: "20",
      saldo: ing,
      partida: food,
      concepto: "Compra ficticia",
      nota: "",
      comida: { etiqueta: "Comida", evidenciaBancaria: "Extracto ficticio" },
    });
    add(db, {
      tipo: "Gasto",
      fecha: "2026-10-04",
      importe: "15",
      saldo: ing,
      partida: food,
      concepto: "Compra compensable ficticia",
      nota: "",
      comida: { etiqueta: "Ocio", evidenciaBancaria: "Extracto ficticio" },
    });
    const ready = prepareRegimen(
      db,
      {
        saldo: ing,
        cicloCorte: c1.id,
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
    const finance = transfer(db, account, ing, "50", "2026-10-02");
    writeComidaRol(
      db,
      finance.id,
      { revision: 1, rol: "Financiación", evidencia: "Evidencia ficticia" },
      randomUUID(),
      now,
    );
    const repo = transfer(db, account, ing, "10", "2026-10-20");
    writeComidaRol(
      db,
      repo.id,
      {
        revision: 1,
        rol: "Reposición",
        obligacionCiclo: c1.id,
        evidencia: "Cobro ficticio",
      },
      randomUUID(),
      now,
    );
    const metrics = e35Metrics(db, c1.id, now);
    expect(metrics.financiacion.f).toBe("50.00");
    expect(metrics.recursos.valor).toBe("145.00");
    expect(metrics.puente?.cierreAnalitico).toBe("125.00");
    const result = listPendientes(
      db,
      new URLSearchParams({ ciclo: c1.id }),
      now,
    );
    const row = fila(result, "Comida", c1.id)!;
    expect(row.estado).toBe("Pendiente");
    expect(row.importe).toBe("5.00");
    expect(row.detalle.find((d) => d.etiqueta === "FIN_NETA")?.valor).toBe(
      "50.00",
    );
    expect(row.detalle.find((d) => d.etiqueta === "Recursos")?.valor).toBe(
      "145.00",
    );
    expect(row.detalle.find((d) => d.etiqueta === "Cierre analítico")?.valor).toBe(
      "125.00",
    );
    expect(row.detalle.map((d) => d.etiqueta)).not.toContain("DEV_ANT");
    // E2.6 conserva el Gasto bruto una vez; Comida no lo reduce.
    expect(result.flujoBase?.gastoBruto).toBe("35.00");
    expect(result.flujoBase?.sBruto).toBeNull();
    expect(result.flujoBase?.cobertura).toBe("Parcial");
  } finally {
    db.close();
  }
});

test("AC-11/AC-12: Gasto/Compensable/Falta exactos, FP excluido y reposición tardía no se atribuye", () => {
  const db = setup();
  try {
    categories(db);
    const food = partida(db, "CAT001");
    const leisure = partida(db, "CAT002");
    const account = saldo(db, "Cuenta origen");
    const ing = saldo(db, "ING Comida");
    const c1 = cycle(db, "2026-10-01");
    const c2 = cycle(db, "2026-11-01");
    const c3 = cycle(db, "2026-12-01");
    const purchases = [
      ["40", "2026-10-01", food, "Comida"],
      ["30", "2026-10-03", food, "Pendiente revisar"],
      ["25", "2026-10-05", leisure, "Ocio"],
      ["10", "2026-10-08", leisure, "Niños"],
      ["10", "2026-10-10", leisure, "Otros"],
      ["15", "2026-10-12", leisure, "Fuera presupuesto"],
    ] as const;
    const ids: string[] = [];
    for (const [importe, fecha, partidaId, etiqueta] of purchases)
      ids.push(
        add(db, {
          tipo: "Gasto",
          fecha,
          importe,
          saldo: ing,
          partida: partidaId,
          concepto: "Compra ficticia",
          nota: "",
          comida: { etiqueta, evidenciaBancaria: "Extracto ficticio" },
        }).id,
      );
    const repo = transfer(db, account, ing, "20", "2026-10-20");
    writeComidaRol(
      db,
      repo.id,
      {
        revision: 1,
        rol: "Reposición",
        obligacionCiclo: c1.id,
        evidencia: "Cobro ficticio",
      },
      randomUUID(),
      now,
    );
    const metrics = e35Metrics(db, c1.id, now);
    expect(metrics.compras.neto.valor).toBe("70.00");
    expect(metrics.compensable.neto.valor).toBe("45.00");
    expect(metrics.faltaPorReponer.valor).toBe("25.00");
    expect(metrics.fueraPresupuesto).toEqual([ids[5]]);
    expect(metrics.compras.bruto.ids).not.toContain(ids[5]);

    const row = fila(listPendientes(db, new URLSearchParams(), now), "Comida", c1.id)!;
    expect(row.estado).toBe("Pendiente");
    expect(row.importe).toBe("25.00");
    expect(row.metricas.find((m) => m.clave === "comidaNeta")!.importe).toBe(
      "70.00",
    );
    expect(
      row.metricas.find((m) => m.clave === "compensableNeto")!.importe,
    ).toBe("45.00");
    expect(row.detalle.find((d) => d.etiqueta === "Obligación (R_obl vs C_n)")?.valor).toBe(
      "No disponible",
    );
    expect(
      row.detalle.find((d) => d.etiqueta === "Obligación (R_obl vs C_n)")?.valor,
    ).not.toBe("Completada");
    expect(
      row.detalle.find(
        (d) => d.etiqueta === "Fuera presupuesto (excluido, conservado en banco)",
      )?.valor,
    ).toContain(ids[5]);

    // Reposición tardía: pertenece a su propio ciclo, no al anterior.
    const late = transfer(db, account, ing, "10", "2026-11-05");
    writeComidaRol(
      db,
      late.id,
      {
        revision: 1,
        rol: "Reposición",
        obligacionCiclo: c2.id,
        evidencia: "Cobro tardío ficticio",
      },
      randomUUID(),
      now,
    );
    const c1After = e35Metrics(db, c1.id, now);
    const c2After = e35Metrics(db, c2.id, now);
    expect(c1After.reposiciones.ids).not.toContain(late.id);
    expect(c1After.faltaPorReponer.valor).toBe("25.00");
    expect(c2After.faltaPorReponer.valor).toBe("0.00");
    expect(c2After.reposiciones.obligacion).toBe("10.00");

    // Ausencia de reposición no se declara Completada.
    add(db, {
      tipo: "Gasto",
      fecha: "2026-12-03",
      importe: "45",
      saldo: ing,
      partida: leisure,
      concepto: "Compra ficticia",
      nota: "",
      comida: { etiqueta: "Ocio", evidenciaBancaria: "Extracto ficticio" },
    });
    const c3Metrics = e35Metrics(db, c3.id, now);
    expect(c3Metrics.obligacion.estado).not.toBe("Completada");
    expect(c3Metrics.faltaPorReponer.valor).toBe("45.00");
  } finally {
    db.close();
  }
});

test("AC-09: Neto actual y foto de apertura separados; cero solo con evidencia", () => {
  const db = setup();
  try {
    const c1 = cycle(db, "2026-01-20");
    const c2 = cycle(db, "2026-03-01");
    const ref = anticipo(db);
    anticipoTransfer(db, ref, "Adelanto", "1000", "2026-02-03");
    anticipoTransfer(db, ref, "Devolución", "400", "2026-03-04", "S002", "S001");
    photo(db, ref, c2.id, "1000");
    const row = fila(listPendientes(db, new URLSearchParams(), now), "Anticipo", ref)!;
    expect(row.importe).toBe("600.00");
    expect(row.metricas.find((m) => m.clave === "neto")!.importe).toBe("600.00");
    expect(
      row.metricas.find((m) => m.clave === "netoApertura")!.importe,
    ).toBe("1000.00");
    expect(
      row.metricas.find((m) => m.clave === "netoApertura")!.cobertura,
    ).toBe("Verificada");

    // Foto cero con evidencia: es un cero verificado, no No disponible.
    const cero = anticipo(db, "Anticipo cero ficticio");
    anticipoTransfer(db, cero, "Adelanto", "100", "2026-02-03");
    photo(db, cero, c1.id, "0");
    const ceroRow = fila(
      listPendientes(db, new URLSearchParams(), now),
      "Anticipo",
      cero,
    )!;
    const fotoCero = ceroRow.metricas.find((m) => m.clave === "netoApertura")!;
    expect(fotoCero.importe).toBe("0.00");
    expect(fotoCero.cobertura).toBe("Verificada");

    // Sin foto: No disponible con motivo; nunca se sustituye por el actual.
    const sinFoto = anticipo(db, "Anticipo sin foto ficticio");
    anticipoTransfer(db, sinFoto, "Adelanto", "900", "2026-02-03");
    const sinFotoRow = fila(
      listPendientes(db, new URLSearchParams(), now),
      "Anticipo",
      sinFoto,
    )!;
    const ausente = sinFotoRow.metricas.find(
      (m) => m.clave === "netoApertura",
    )!;
    expect(ausente.importe).toBeNull();
    expect(ausente.cobertura).toBe("No disponible");
    expect(sinFotoRow.importe).toBe("900.00");
    expect(
      sinFotoRow.alertas.some(
        (a) => a.tipo === "No disponible" && /foto/i.test(a.motivo),
      ),
    ).toBe(true);
  } finally {
    db.close();
  }
});

test("AC-21: cobertura por métrica sin colapsar en un único semáforo", () => {
  const db = setup();
  try {
    cycle(db, "2026-01-20");
    const ref = anticipo(db);
    anticipoTransfer(db, ref, "Adelanto", "1000", "2026-02-03");
    // Transferencia histórica sin rol/par: subtotal parcial, no total.
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,referencia,concepto,nota,revision,creado,actualizado) VALUES(?,?, 'Transferencia',?,?,?,?,?, '',1,?,?)",
      [
        "101",
        "2026-02-04",
        "100",
        "S001",
        "S002",
        ref,
        "Hecho histórico ficticio sin acreditar",
        "2026-02-04T00:00:00Z",
        "2026-02-04T00:00:00Z",
      ],
    );
    const row = fila(listPendientes(db, new URLSearchParams(), now), "Anticipo", ref)!;
    expect(row.estado).toBe("Revisar");
    expect(row.cobertura).toBe("Parcial");
    expect(row.motivo).toContain("Sin rol acreditado");
    const byKey = Object.fromEntries(row.metricas.map((m) => [m.clave, m]));
    expect(byKey.neto.cobertura).toBe("Parcial");
    expect(byKey.hechosPendientes.cobertura).toBe("Parcial");
    expect(byKey.hechosPendientes.importe).toBeNull();
    expect(byKey.netoApertura.cobertura).toBe("No disponible");
    expect(new Set(row.metricas.map((m) => m.cobertura)).size).toBeGreaterThan(1);
    // El subtotal parcial no se presenta como total: queda motivo y estado Revisar.
    expect(row.metricas.find((m) => m.clave === "neto")!.motivo).toContain(
      "Cobertura Parcial",
    );
  } finally {
    db.close();
  }
});

test("AC-15: 0 verificado en la métrica aplicable frente a fuente ausente", () => {
  const db = setup();
  try {
    const c1 = cycle(db, "2026-10-01");
    const c2 = cycle(db, "2026-11-01");
    const account = saldo(db, "Cuenta origen");
    const destination = saldo(db, "Cuenta destino");
    transfer(db, account, destination, "10", "2026-10-02");
    const result = listPendientes(db, new URLSearchParams(), now);
    const row = fila(result, "Comida", c1.id)!;
    expect(row.importe).toBeNull();
    expect(row.estado).toBe("No disponible");
    expect(row.metricas.find((m) => m.clave === "comidaNeta")!.importe).toBe(
      "0.00",
    );
    expect(
      row.metricas.find((m) => m.clave === "comidaNeta")!.cobertura,
    ).toBe("Verificada");
    // El 409 de e35Metrics por ciclo sin corte se aísla en su propia fila.
    const sinCorte = fila(result, "Comida", c2.id)!;
    expect(sinCorte.estado).toBe("No disponible");
    expect(sinCorte.motivo).toContain("corte");
    expect(result.filas.filter((f) => f.tipo === "Comida")).toHaveLength(2);
  } finally {
    db.close();
  }
});

test("AC-23: ciclo y ejercicio natural se muestran por separado en los cruces", () => {
  const db = setup();
  try {
    categories(db);
    const p13 = partida(db, "CAT013");
    const payer = saldo(db, "Banco pagador");
    const destination = saldo(db, "Cuenta destino");
    const c1 = cycle(db, "2026-12-20");
    const c2 = cycle(db, "2027-01-20");
    cycle(db, "2027-02-20");

    const e1 = sharedCase(db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Álex", rol: "Tercero", partes: 1 },
    ]);
    sharedExpense(db, e1, payer, p13, "300.00", "2026-12-28");
    sharedContribution(
      db,
      e1,
      destination,
      participant(db, e1, "Álex").id,
      "100.00",
      "2027-01-10",
    );
    const rowE1 = fila(listPendientes(db, new URLSearchParams(), now), "Compartido", e1)!;
    const gastosE1 = rowE1.contextos.filter((c) => c.tipo === "Gasto");
    const aportesE1 = rowE1.contextos.filter((c) => c.tipo === "Aportacion");
    expect(gastosE1[0]).toMatchObject({ ejercicio: 2026, cicloId: c1.id });
    expect(aportesE1[0]).toMatchObject({ ejercicio: 2027, cicloId: c1.id });
    expect(rowE1.ciclo?.id).toBe(c1.id);

    const e2 = sharedCase(db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Álex", rol: "Tercero", partes: 1 },
    ]);
    sharedExpense(db, e2, payer, p13, "100.00", "2027-01-05");
    sharedExpense(db, e2, payer, p13, "200.00", "2027-01-25");
    const rowE2 = fila(listPendientes(db, new URLSearchParams(), now), "Compartido", e2)!;
    const gastosE2 = rowE2.contextos.filter((c) => c.tipo === "Gasto");
    expect(gastosE2.map((c) => c.cicloId)).toEqual([c1.id, c2.id]);
    expect(gastosE2.map((c) => c.ejercicio)).toEqual([2027, 2027]);
    expect(rowE2.ciclo?.id).toBe(c2.id);

    const e3 = sharedCase(db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Álex", rol: "Tercero", partes: 1 },
    ]);
    sharedExpense(db, e3, payer, p13, "100.00", "2026-12-28");
    sharedContribution(
      db,
      e3,
      destination,
      participant(db, e3, "Álex").id,
      "10.00",
      "2027-01-25",
    );
    const rowE3 = fila(listPendientes(db, new URLSearchParams(), now), "Compartido", e3)!;
    expect(
      rowE3.contextos.find((c) => c.tipo === "Gasto"),
    ).toMatchObject({ ejercicio: 2026, cicloId: c1.id });
    expect(
      rowE3.contextos.find((c) => c.tipo === "Aportacion"),
    ).toMatchObject({ ejercicio: 2027, cicloId: c2.id });
    expect(rowE3.ciclo?.id).toBe(c2.id);

    // El filtro de ciclo evalúa todos los hechos, no solo el contexto mostrado.
    const enC1 = listPendientes(
      db,
      new URLSearchParams({ tipo: "Compartido", ciclo: c1.id }),
      now,
    );
    expect(enC1.filas.map((f) => f.fuente.id)).toEqual(
      expect.arrayContaining([e1, e2, e3]),
    );
    // El filtro de ejercicio usa el último hecho de la fila.
    const en2026 = listPendientes(
      db,
      new URLSearchParams({ tipo: "Compartido", ejercicio: "2026" }),
      now,
    );
    expect(en2026.filas.map((f) => f.fuente.id)).not.toContain(e1);
  } finally {
    db.close();
  }
});

test("AC-18/AC-20: filtros por defecto, 422 contradictorio, claves efímeras y cero escrituras", () => {
  const db = setup();
  try {
    categories(db);
    const p13 = partida(db, "CAT013");
    const payer = saldo(db, "Banco pagador");
    const destination = saldo(db, "Cuenta destino");
    const ref = sharedCase(db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Bea", rol: "Tercero", partes: 1 },
      { nombre: "Álex", rol: "Tercero", partes: 1 },
    ]);
    sharedExpense(db, ref, payer, p13, "450.00");
    sharedContribution(db, ref, destination, participant(db, ref, "Álex").id, "300.00");
    const before = snapshot(db);
    const result = listPendientes(db, new URLSearchParams(), now);
    expect(snapshot(db)).toEqual(before);
    expect(
      db
        .query(
          "SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name LIKE '%pendiente%' AND name NOT LIKE 'transferencia_pendiente%'",
        )
        .get(),
    ).toEqual({ n: 0 });
    expect(result.sinTotalEconomico).toBe(true);
    expect("totalEconomico" in result).toBe(false);
    const claves = result.filas.map((f) => f.claveEfimera);
    expect(new Set(claves).size).toBe(claves.length);
    expect(result.filas.filter((f) => f.tipo === "Compartido")).toHaveLength(1);
    expect(result.filas[0].claveEfimera).not.toContain("150.00");
    expect(() =>
      listPendientes(db, new URLSearchParams({ estado: "Resuelto" }), now),
    ).toThrow("alcance=historico");
    expect(() =>
      listPendientes(db, new URLSearchParams({ tipo: "Otro" }), now),
    ).toThrow("tipo inválido");
    expect(() =>
      listPendientes(db, new URLSearchParams({ ciclo: "999" }), now),
    ).toThrow("Ciclo no encontrado");
    const detail = getPendiente(db, "Compartido", ref, now);
    expect(detail.fila.fuente.id).toBe(ref);
    expect(() => getPendiente(db, "Anticipo", "REF999", now)).toThrow(
      "no encontrada",
    );
  } finally {
    db.close();
  }
});

test("fallo de fuente por fila: No disponible con motivo y el resto sigue visible", () => {
  const db = setup();
  try {
    categories(db);
    const p13 = partida(db, "CAT013");
    const payer = saldo(db, "Banco pagador");
    const destination = saldo(db, "Cuenta destino");
    const ref = sharedCase(db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Bea", rol: "Tercero", partes: 1 },
      { nombre: "Álex", rol: "Tercero", partes: 1 },
    ]);
    sharedExpense(db, ref, payer, p13, "450.00");
    sharedContribution(db, ref, destination, participant(db, ref, "Álex").id, "300.00");
    const anticipoRef = anticipo(db, "Anticipo visible");
    anticipoTransfer(db, anticipoRef, "Adelanto", "100", "2026-02-03");
    // Se rompe solo la lectura de participantes: la fila Compartido cae a ND,
    // pero la fila Anticipo y la lista sobreviven.
    db.exec("PRAGMA foreign_keys=OFF");
    db.exec("DROP TABLE participantes_compartido");
    db.exec("PRAGMA foreign_keys=ON");
    const result = listPendientes(db, new URLSearchParams(), now);
    const compartido = fila(result, "Compartido", ref)!;
    expect(compartido.estado).toBe("No disponible");
    expect(compartido.importe).toBeNull();
    expect(compartido.motivo).toContain("Error de fuente Compartidos");
    expect(fila(result, "Anticipo", anticipoRef)?.estado).toBe("Pendiente");
    expect(
      result.fuenteFallos.some(
        (f) => f.motor === "Compartidos" && f.id === ref,
      ),
    ).toBe(true);
  } finally {
    db.close();
  }
});

test("R1/R7: conciliación de ciclo inactivo aparece y DIF nulo declara No disponible", () => {
  const db = setup();
  try {
    const account = saldo(db, "ING Comida R1");
    const c1 = cycle(db, "2026-10-01", "100");
    const c2 = cycle(db, "2026-11-01", "200");
    cycle(db, "2026-12-01", "200");
    const ready = prepareRegimen(
      db,
      {
        saldo: account,
        cicloCorte: c1.id,
        apertura: "100",
        evidencia: "Extracto ficticio R1",
        cobertura: "Verificable",
        motivo: "Preparación ficticia R1",
      },
      randomUUID(),
      now,
    );
    activateRegimen(
      db,
      {
        revision: ready.regimen.regimen!.revision,
        motivo: "Activación ficticia R1",
        confirmar: true,
      },
      randomUUID(),
      now,
    );
    const result = listPendientes(db, new URLSearchParams(), now);
    const row = fila(result, "Conciliacion", c1.id);
    expect(row).toBeDefined();
    expect(row!.estado).toBe("Alerta");
    expect(row!.importe).toBe("100.00");
    expect(row!.cobertura).toBe("Verificada");
    const dif = row!.metricas.find((m) => m.clave === "diferenciaS0Siguiente")!;
    expect(dif.importe).toBe("100.00");
    expect(dif.cobertura).toBe("Verificada");
    // El siguiente ciclo coincide con su propio cierre: Resuelto, no abierto.
    const siguiente = fila(result, "Conciliacion", c2.id);
    expect(siguiente).toBeUndefined();
    const historico = listPendientes(
      db,
      new URLSearchParams({ alcance: "historico" }),
      now,
    );
    expect(fila(historico, "Conciliacion", c2.id)?.estado).toBe("Resuelto");
  } finally {
    db.close();
  }
});

test("R7: conciliación sin cobertura conserva la fila y DIF_S0_SIGUIENTE No disponible", () => {
  const db = setup();
  try {
    const c1 = cycle(db, "2026-10-01", "100");
    const c2 = cycle(db, "2026-11-01", "200");
    const result = listPendientes(db, new URLSearchParams(), now);
    const row = fila(result, "Conciliacion", c1.id);
    expect(row).toBeDefined();
    expect(row!.estado).toBe("No disponible");
    const dif = row!.metricas.find((m) => m.clave === "diferenciaS0Siguiente")!;
    expect(dif.importe).toBeNull();
    expect(dif.cobertura).toBe("No disponible");
    // Comida ND de un ciclo inactivo no se oculta sin justificación.
    expect(fila(result, "Comida", c1.id)?.estado).toBe("No disponible");
    expect(fila(result, "Comida", c2.id)?.estado).toBe("No disponible");
  } finally {
    db.close();
  }
});

test("R2: alcance=historico devuelve solo Resuelto y nunca abiertos", () => {
  const db = setup();
  try {
    categories(db);
    const p13 = partida(db, "CAT013");
    const payer = saldo(db, "Banco R2");
    const destination = saldo(db, "Destino R2");
    const open = sharedCase(db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Bea", rol: "Tercero", partes: 1 },
    ]);
    sharedExpense(db, open, payer, p13, "100.00");
    const closed = sharedCase(db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Bea", rol: "Tercero", partes: 1 },
    ]);
    sharedExpense(db, closed, payer, p13, "100.00");
    sharedContribution(
      db,
      closed,
      destination,
      participant(db, closed, "Bea").id,
      "50.00",
    );
    const abiertos = listPendientes(db, new URLSearchParams(), now);
    expect(fila(abiertos, "Compartido", open)).toBeDefined();
    expect(fila(abiertos, "Compartido", closed)).toBeUndefined();
    const historico = listPendientes(
      db,
      new URLSearchParams({ alcance: "historico" }),
      now,
    );
    expect(historico.filas.length).toBeGreaterThan(0);
    expect(historico.filas.every((f) => f.estado === "Resuelto")).toBe(true);
    expect(fila(historico, "Compartido", open)).toBeUndefined();
    expect(fila(historico, "Compartido", closed)?.estado).toBe("Resuelto");
  } finally {
    db.close();
  }
});

test("R5: ficha Compartido Sin repartir sin hechos no es un pendiente abierto", () => {
  const db = setup();
  try {
    categories(db);
    const p13 = partida(db, "CAT013");
    const payer = saldo(db, "Banco R5");
    const vacia = createCompartido(
      db,
      { nombre: "Ficha vacía ficticia" },
      randomUUID(),
      now,
    ).referencia.id;
    const conHecho = sharedCase(db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Bea", rol: "Tercero", partes: 1 },
    ]);
    sharedExpense(db, conHecho, payer, p13, "100.00");
    const abiertos = listPendientes(db, new URLSearchParams(), now);
    expect(fila(abiertos, "Compartido", vacia)).toBeUndefined();
    expect(fila(abiertos, "Compartido", conHecho)?.estado).toBe("Pendiente");
    const historico = listPendientes(
      db,
      new URLSearchParams({ alcance: "historico" }),
      now,
    );
    expect(fila(historico, "Compartido", vacia)).toBeUndefined();
  } finally {
    db.close();
  }
});

test("R4: contextos conservan relacionados/históricos y no etiquetan Transferencia como Adelanto", () => {
  const db = setup();
  try {
    categories(db);
    const food = partida(db, "CAT001");
    const payer = saldo(db, "Banco R4");
    const destination = saldo(db, "Destino R4");
    const ref = anticipo(db, "Anticipo R4");
    // Hecho legado sin atribución: se conserva en contextos sin llamarlo Adelanto.
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,referencia,concepto,nota,revision,creado,actualizado) VALUES('9001','2026-10-02','Transferencia',5000,?,?,?,'Transferencia sin atribución R4','',1,'f','f')",
      [payer, destination, ref],
    );
    const related = add(db, {
      tipo: "Gasto",
      fecha: "2026-10-03",
      importe: "10.00",
      saldo: payer,
      partida: food,
      referencia: ref,
      concepto: "Gasto relacionado R4",
      nota: "",
    });
    const row = fila(
      listPendientes(db, new URLSearchParams(), now),
      "Anticipo",
      ref,
    )!;
    expect(
      row.contextos.find((c) => c.fuenteId === "9001")?.tipo,
    ).toBe("Transferencia");
    expect(row.contextos.find((c) => c.fuenteId === related.id)?.tipo).toBe(
      "Gasto",
    );
    expect(row.contextos.some((c) => c.tipo === "Adelanto")).toBe(false);
  } finally {
    db.close();
  }
});

test("R13: Compartido con relacionado posterior permanece en el ciclo elegible", () => {
  const db = setup();
  try {
    categories(db);
    const p13 = partida(db, "CAT013");
    const payer = saldo(db, "Banco R13 compartido");
    const destination = saldo(db, "Destino R13 compartido");
    const a = cycle(db, "2026-10-01");
    const b = cycle(db, "2026-11-01");
    const ref = sharedCase(db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Bea", rol: "Tercero", partes: 1 },
    ]);
    sharedExpense(db, ref, payer, p13, "100.00", "2026-10-05");
    const related = add(db, {
      tipo: "Transferencia",
      fecha: "2026-11-05",
      importe: "30.00",
      origen: payer,
      destino: destination,
      referencia: ref,
      concepto: "Movimiento interno posterior R13",
      nota: "",
    });
    const result = listPendientes(db, new URLSearchParams(), now);
    const row = fila(result, "Compartido", ref)!;
    expect(row.ciclo?.id).toBe(a.id);
    expect(row.fechaHecho).toBe("2026-10-05");
    expect(row.ejercicio).toBe(2026);
    const contextoRelacionado = row.contextos.find(
      (c) => c.fuenteId === related.id,
    )!;
    expect(contextoRelacionado.elegible).toBe(false);
    expect(
      row.contextos.find((c) => c.elegible)?.fuenteId,
    ).toBeDefined();
    const enB = listPendientes(
      db,
      new URLSearchParams({ ciclo: b.id }),
      now,
    );
    expect(fila(enB, "Compartido", ref)).toBeUndefined();
  } finally {
    db.close();
  }
});

test("R13: Anticipo con relacionado posterior no entra por el ciclo del relacionado", () => {
  const db = setup();
  try {
    categories(db);
    const food = partida(db, "CAT001");
    const from = saldo(db, "Origen R13 anticipo");
    const to = saldo(db, "Destino R13 anticipo");
    const a = cycle(db, "2026-10-01");
    const b = cycle(db, "2026-11-01");
    const ref = anticipo(db, "Anticipo R13");
    anticipoTransfer(db, ref, "Adelanto", "100.00", "2026-10-02", from, to);
    const related = add(db, {
      tipo: "Gasto",
      fecha: "2026-11-02",
      importe: "10.00",
      saldo: from,
      partida: food,
      referencia: ref,
      concepto: "Gasto relacionado posterior R13",
      nota: "",
    });
    const result = listPendientes(db, new URLSearchParams(), now);
    const row = fila(result, "Anticipo", ref)!;
    expect(row.ciclo?.id).toBe(a.id);
    expect(row.fechaHecho).toBe("2026-10-02");
    expect(row.contextos.find((c) => c.fuenteId === related.id)?.elegible).toBe(
      false,
    );
    const enB = listPendientes(
      db,
      new URLSearchParams({ ciclo: b.id }),
      now,
    );
    expect(fila(enB, "Anticipo", ref)).toBeUndefined();
  } finally {
    db.close();
  }
});
