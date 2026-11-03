import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { prepareSchema } from "./database-schema";
import { createClassification } from "./clasificacion";
import { createSaldo } from "./saldos";
import { createCycle, cycleContext, type Cycle } from "./ciclos";
import { previewMovement, writeMovement } from "./movimientos";
import {
  bajaParticipante,
  createCompartido,
  createParticipante,
  getCompartido,
} from "./compartidos";
import { monthlyFlow } from "./flujo-mensual";

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
    {
      inicio,
      saldoInicialComida: s0,
      contextRevision: cycleContext(db).revision,
    },
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

const participant = (db: Database, ref: string, nombre: string) =>
  getCompartido(db, ref).participantes.find((p) => p.nombre === nombre)!;

function baseExpense(
  db: Database,
  payer: string,
  partidaId: string,
  importe: string,
  fecha: string,
  referencia?: string,
) {
  return add(db, {
    tipo: "Gasto",
    fecha,
    importe,
    saldo: payer,
    partida: partidaId,
    referencia,
    concepto: "Gasto ficticio",
    nota: "",
  });
}

function contribution(
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

function extraordinary(
  db: Database,
  debtId: string,
  basePartidaId: string,
  partidaId = "PAR900",
) {
  const padre = (
    db.query("SELECT padre FROM partidas WHERE id=?").get(basePartidaId) as {
      padre: string;
    }
  ).padre;
  db.run(
    "INSERT INTO deudas(id,nombre,inicio,apertura,estado,revision,creado,actualizado) VALUES(?,'Deuda ficticia','2026-01-01',10000,'Activa',1,'f','f')",
    [debtId],
  );
  db.run(
    "INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda) VALUES(?,'Cuota ficticia',?,'Activa',1,'f','f',?)",
    [partidaId, padre, debtId],
  );
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,nota,anulado,revision,creado,actualizado,capital,intereses) VALUES('9001','2026-10-06','Amortización deuda',10000,'S001','S000',NULL,?,'Fixture','',0,1,'f','f','10000','0')",
    [partidaId],
  );
}

function fixture(
  options: {
    shared?: boolean;
    sharedExpense?: string;
    sharedContribution?: string;
    nonShared?: string;
    extra?: boolean;
  } = {},
) {
  const db = setup();
  categories(db);
  const p13 = partida(db, "CAT013");
  const p1 = partida(db, "CAT001");
  const payer = saldo(db, "Banco pagador");
  const destination = saldo(db, "Cuenta destino");
  const c1 = cycle(db, "2026-10-01", "100");
  const c2 = cycle(db, "2026-11-01", "0");

  add(db, {
    tipo: "Ingreso",
    fecha: "2026-10-02",
    importe: "800",
    saldo: payer,
    subtipo: "Nómina",
    concepto: "Ingreso ficticio",
    nota: "",
  });
  if (options.nonShared !== "0")
    baseExpense(
      db,
      payer,
      p1,
      options.nonShared ?? "50",
      "2026-10-07",
    );

  let ref: string | null = null;
  let expenseId: string | null = null;
  if (options.shared !== false) {
    ref = sharedCase(db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Bea", rol: "Tercero", partes: 1 },
      { nombre: "Álex", rol: "Tercero", partes: 1 },
    ]);
    expenseId = baseExpense(
      db,
      payer,
      p13,
      options.sharedExpense ?? "450",
      "2026-10-05",
      ref,
    ).id;
    contribution(
      db,
      ref,
      destination,
      participant(db, ref, "Álex").id,
      options.sharedContribution ?? "300",
    );
  }
  if (options.extra !== false) extraordinary(db, "D900", p1, "PAR900");
  return {
    db,
    p13,
    p1,
    payer,
    destination,
    c1,
    c2,
    ref,
    expenseId,
  };
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

test("F1: la ampliación conserva las métricas E2.6 intactas", () => {
  const f = fixture();
  try {
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.corteEfectivo).toBe("2026-10-10");
    expect(r.metrics.gasto.subtotal).toBe("500.00");
    expect(r.metrics.ingresos.subtotal).toBe("800.00");
    expect(r.metrics.extraordinaria.subtotal).toBe("100.00");
    expect(r.pendientes).toContain("Neto Compartido/recuperaciones");
    expect(r.hechos.map((h) => h.id)).toContain(f.expenseId!);
    expect(r.ajusteCompartidos).toBeDefined();
    expect(r.flujoAjustado).toBeDefined();
  } finally {
    f.db.close();
  }
});

test("F2: R_adj, G_n y S_aj exactos en céntimos", () => {
  const f = fixture();
  try {
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.ajusteCompartidos.recuperado.importe).toBe("300.00");
    expect(r.ajusteCompartidos.base.importe).toBe("500.00");
    expect(r.ajusteCompartidos.gastoNeto.importe).toBe("200.00");
    expect(r.ajusteCompartidos.resultadoAjustado.importe).toBe("500.00");
    expect(r.flujoAjustado.ajuste.rAdj).toBe("300.00");
    expect(r.flujoAjustado.ajuste.gNeto).toBe("200.00");
    expect(r.flujoAjustado.ajuste.sAjustado).toBe("500.00");
  } finally {
    f.db.close();
  }
});

test("F3: memoria de caja separada, no es Ingreso", () => {
  const f = fixture();
  try {
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.ajusteCompartidos.memoriaCaja.total).toBe("300.00");
    expect(r.ajusteCompartidos.memoriaCaja.noEsIngreso).toBe(true);
    expect(r.ajusteCompartidos.memoriaCaja.aportaciones).toHaveLength(1);
    expect(r.metrics.ingresos.subtotal).toBe("800.00");
  } finally {
    f.db.close();
  }
});

test("F4: sustitución, no G_b + Neto ni doble resta", () => {
  const f = fixture();
  try {
    const r = monthlyFlow(f.db, f.c1.id, now);
    const cents = (v: string) => BigInt(v.replace(".", ""));
    expect(
      cents(r.ajusteCompartidos.recuperado.importe!) +
        cents(r.ajusteCompartidos.gastoNeto.importe!),
    ).toBe(cents(r.ajusteCompartidos.base.importe!));
    expect(
      cents(r.metrics.ingresos.subtotal!) -
        cents(r.ajusteCompartidos.gastoNeto.importe!) -
        cents(r.ajusteCompartidos.resultadoAjustado.extraordinaria!),
    ).toBe(cents(r.ajusteCompartidos.resultadoAjustado.importe!));
    expect(r.ajusteCompartidos.recuperado.gastos).toHaveLength(1);
    expect(r.ajusteCompartidos.recuperado.gastos[0].fuenteId).toBe(f.expenseId!);
  } finally {
    f.db.close();
  }
});

test("F5: cálculo vivo, sin foto, no cierre ni ahorro real", () => {
  const f = fixture();
  try {
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.ajusteCompartidos.calculoVivo).toBe(true);
    expect(r.ajusteCompartidos.sinFoto).toBe(true);
    expect(r.ajusteCompartidos.noEsCierreFinanciero).toBe(true);
    expect(r.ajusteCompartidos.soloLectura).toBe(true);
    expect(r.flujoAjustado.parcial).toBe(true);
    expect(r.flujoAjustado.noEsAhorroReal).toBe(true);
    expect(r.flujoAjustado.calculoVivo).toBe(true);
  } finally {
    f.db.close();
  }
});

test("F6: recuperado parcial → R_adj parcial, sin colapsar a cero", () => {
  const f = fixture();
  try {
    const alex = participant(f.db, f.ref!, "Álex");
    bajaParticipante(
      f.db,
      f.ref!,
      alex.id,
      { revision: alex.revision, motivo: "Baja ficticia" },
      randomUUID(),
      now,
    );
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.ajusteCompartidos.recuperado.cobertura).toBe("Parcial");
    expect(r.ajusteCompartidos.recuperado.importe).toBe("0.00");
    expect(r.ajusteCompartidos.gastoNeto.importe).toBe("500.00");
    expect(r.ajusteCompartidos.gastoNeto.cobertura).toBe("Parcial");
  } finally {
    f.db.close();
  }
});

test("F7: recuperado null → R_adj/G_n/S_aj No disponible y base visible", () => {
  const f = fixture();
  try {
    const empty = sharedCase(f.db, []);
    baseExpense(f.db, f.payer, f.p13, "120", "2026-10-08", empty);
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.metrics.gasto.subtotal).toBe("620.00");
    expect(r.ajusteCompartidos.recuperado.importe).toBeNull();
    expect(r.ajusteCompartidos.recuperado.cobertura).toBe("No disponible");
    expect(r.ajusteCompartidos.gastoNeto.importe).toBeNull();
    expect(r.ajusteCompartidos.resultadoAjustado.importe).toBeNull();
    expect(r.ajusteCompartidos.base.importe).toBe("620.00");
  } finally {
    f.db.close();
  }
});

test("F8: fuente Compartidos ausente → ajuste No disponible sin tumbar E2.6", () => {
  const f = fixture();
  try {
    f.db.exec("PRAGMA foreign_keys=OFF");
    f.db.exec("DROP TABLE participantes_compartido");
    f.db.exec("PRAGMA foreign_keys=ON");
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.metrics.gasto.subtotal).toBe("500.00");
    expect(r.ajusteCompartidos.recuperado.importe).toBeNull();
    expect(r.ajusteCompartidos.recuperado.cobertura).toBe("No disponible");
    expect(r.ajusteCompartidos.gastoNeto.importe).toBeNull();
  } finally {
    f.db.close();
  }
});

test("F9: periodo no verificable → No disponible, nunca cero", () => {
  const db = setup();
  try {
    cycle(db, "2026-10-01", "100");
    const r = monthlyFlow(db, "1", now);
    expect(r.corteEfectivo).toBeNull();
    expect(r.ajusteCompartidos.recuperado.importe).toBeNull();
    expect(r.ajusteCompartidos.recuperado.cobertura).toBe("No disponible");
    expect(r.ajusteCompartidos.gastoNeto.importe).toBeNull();
    expect(r.ajusteCompartidos.resultadoAjustado.importe).toBeNull();
    expect(r.ajusteCompartidos.recuperado.importe).not.toBe("0.00");
  } finally {
    db.close();
  }
});

test("F10: periodo verificable sin Gastos compartidos → R_adj 0 verificado", () => {
  const f = fixture({ shared: false });
  try {
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.ajusteCompartidos.recuperado.importe).toBe("0.00");
    expect(r.ajusteCompartidos.recuperado.cobertura).toBe("Verificada");
    expect(r.ajusteCompartidos.recuperado.motivo).toContain("0 verificado");
    expect(r.ajusteCompartidos.gastoNeto.importe).toBe("50.00");
    expect(r.ajusteCompartidos.resultadoAjustado.importe).toBe("650.00");
  } finally {
    f.db.close();
  }
});

test("F11: G_n negativo se conserva y se explica", () => {
  const f = fixture({ sharedExpense: "100", sharedContribution: "300" });
  try {
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.ajusteCompartidos.base.importe).toBe("150.00");
    expect(r.ajusteCompartidos.recuperado.importe).toBe("300.00");
    expect(r.ajusteCompartidos.gastoNeto.importe).toBe("-150.00");
    expect(r.ajusteCompartidos.resultadoAjustado.importe).toBe("850.00");
  } finally {
    f.db.close();
  }
});

test("F12: céntimos exactos con dos decimales", () => {
  const f = fixture({
    sharedExpense: "100.01",
    sharedContribution: "33.34",
    nonShared: "50",
  });
  try {
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.ajusteCompartidos.base.importe).toBe("150.01");
    expect(r.ajusteCompartidos.recuperado.importe).toBe("33.34");
    expect(r.ajusteCompartidos.gastoNeto.importe).toBe("116.67");
    expect(r.ajusteCompartidos.resultadoAjustado.importe).toBe("583.33");
  } finally {
    f.db.close();
  }
});

test("F13: Gasto compartido fuera de la ventana no ajusta el ciclo", () => {
  const f = fixture();
  try {
    const late = sharedCase(f.db, [
      { nombre: "Yo", rol: "Titular", partes: 1 },
      { nombre: "Bea", rol: "Tercero", partes: 1 },
    ]);
    baseExpense(f.db, f.payer, f.p13, "200", "2026-11-05", late);
    contribution(
      f.db,
      late,
      f.destination,
      participant(f.db, late, "Bea").id,
      "100",
      "2026-11-06",
    );
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.corteEfectivo).toBe("2026-10-31");
    expect(r.metrics.gasto.subtotal).toBe("500.00");
    expect(r.ajusteCompartidos.recuperado.importe).toBe("300.00");
    expect(
      r.ajusteCompartidos.recuperado.gastos.map((g) => g.casoId),
    ).not.toContain(late);
  } finally {
    f.db.close();
  }
});

test("F14: Gasto compartido anulado no computa en R_adj", () => {
  const f = fixture();
  try {
    f.db.run("UPDATE movimientos SET anulado=1 WHERE id=?", [f.expenseId]);
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.metrics.gasto.subtotal).toBe("50.00");
    expect(r.ajusteCompartidos.recuperado.importe).toBe("0.00");
    expect(r.ajusteCompartidos.recuperado.gastos).toEqual([]);
    expect(r.ajusteCompartidos.gastoNeto.importe).toBe("50.00");
  } finally {
    f.db.close();
  }
});

test("F15: Gasto no computable no entra en R_adj pero sí en G_b", () => {
  const f = fixture();
  try {
    // Se inserta directamente para simular un Gasto histórico ya vinculado a
    // una Referencia compartida pero fuera de CAT013; el motor lo marca inválido.
    f.db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,nota,anulado,revision,creado,actualizado,referencia) VALUES('9002','2026-10-08','Gasto',2500,?,'S000',NULL,?,'Gasto inválido ficticio','',0,1,'f','f',?)",
      [f.payer, f.p1, f.ref!],
    );
    const r = monthlyFlow(f.db, f.c1.id, now);
    expect(r.metrics.gasto.subtotal).toBe("525.00");
    expect(r.ajusteCompartidos.recuperado.importe).toBe("300.00");
    expect(r.ajusteCompartidos.recuperado.cobertura).toBe("Parcial");
    expect(
      r.ajusteCompartidos.recuperado.gastos.map((g) => g.fuenteId),
    ).not.toContain("9002");
  } finally {
    f.db.close();
  }
});

test("F16: la vista ajustada no escribe hechos ni estados", () => {
  const f = fixture();
  try {
    const before = snapshot(f.db);
    monthlyFlow(f.db, f.c1.id, now);
    expect(snapshot(f.db)).toEqual(before);
  } finally {
    f.db.close();
  }
});

test("F17: el cálculo es vivo: nueva recuperación cambia R_adj sin tocar E2.6", () => {
  const f = fixture();
  try {
    const first = monthlyFlow(f.db, f.c1.id, now);
    contribution(
      f.db,
      f.ref!,
      f.destination,
      participant(f.db, f.ref!, "Bea").id,
      "50",
      "2026-10-11",
    );
    const second = monthlyFlow(f.db, f.c1.id, now);
    expect(second.metrics.gasto.subtotal).toBe(first.metrics.gasto.subtotal);
    expect(second.metrics.ingresos.subtotal).toBe(first.metrics.ingresos.subtotal);
    expect(second.ajusteCompartidos.recuperado.importe).toBe("350.00");
    expect(second.ajusteCompartidos.gastoNeto.importe).toBe("150.00");
    expect(second.ajusteCompartidos.revisionAjuste).not.toBe(
      first.ajusteCompartidos.revisionAjuste,
    );
  } finally {
    f.db.close();
  }
});
