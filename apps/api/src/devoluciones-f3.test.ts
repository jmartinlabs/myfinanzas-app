import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClassification } from "./clasificacion";
import {
  comidaDevolucion,
  revalidateDevolucionPropia,
  revalidateDevolucionesCompra,
  writeComidaDevolucion,
} from "./comida";
import { devolucionTriggerV33 } from "./comida-schema";
import { createCycle, cycleContext } from "./ciclos";
import { prepareSchema } from "./database-schema";
import { devolucionIntegracionDisponible } from "./devolucion-gate";
import { previewMovement, writeMovement } from "./movimientos";
import { Problem } from "./problem";
import { createRevisionComida } from "./revision-comida";
import { createSaldo } from "./saldos";
import { manifest } from "./schema-contract";
import { gateAbiertoParaPruebas } from "../test-support/devolucion-gate-abierto";

const now = Date.parse("2026-10-15T12:00:00.000Z");

function setup(dbPath = ":memory:") {
  const db = new Database(dbPath);
  prepareSchema(db, { origin: "demo", keyHash: null } as never);
  const mk = (nombre: string, apertura: string) =>
    createSaldo(
      db,
      {
        nombre,
        tipo: "Efectivo",
        control: "Movimientos",
        saldoApertura: apertura,
        fechaApertura: "2026-01-01",
        permiteSalidaExterior: true,
      },
      randomUUID(),
      now,
    );
  const account = mk("Cuenta F3", "1000");
  const other = mk("Cuenta Receptor F3", "500");
  const cat = createClassification(
    db,
    "categorias",
    { nombre: "Hogar F3", anual: "Gasto", mensual: "Gasto", referencia: false },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Compras F3", padre: cat.id },
    randomUUID(),
  );
  db.run(
    "INSERT INTO presupuestos VALUES('PRE900','Plan F3','Gasto real','S001','Activo',1,'f','f')",
  );
  const food = createClassification(
    db,
    "partidas",
    { nombre: "Supermercado F3", padre: sub.id, presupuesto: "PRE900" },
    randomUUID(),
  );
  const cycle1 = createCycle(
    db,
    { inicio: "2026-07-01", saldoInicialComida: "0", contextRevision: cycleContext(db).revision },
    randomUUID(),
    now,
  ).ciclo;
  const cycle2 = createCycle(
    db,
    { inicio: "2026-08-01", saldoInicialComida: "0", contextRevision: cycleContext(db).revision },
    randomUUID(),
    now,
  ).ciclo;
  return { db, account, other, food, cycle1, cycle2 };
}

function createMov(
  db: Database,
  body: Record<string, unknown>,
  key = randomUUID(),
) {
  const plan = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    key,
    null,
    false,
    now,
    undefined,
    gateAbiertoParaPruebas,
  );
}

function updateMov(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  annul = false,
  key = randomUUID(),
) {
  const plan = previewMovement(db, body, id, annul, now);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    key,
    id,
    annul,
    now,
    undefined,
    gateAbiertoParaPruebas,
  );
}

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof Problem) return e.code;
    throw e;
  }
  throw new Error("Expected Problem");
}

test("F3 gate #572 sigue cerrado en producción", () => {
  expect(devolucionIntegracionDisponible).toBe(false);
});

test("AC-D05/AC-D16/AC-D17: alta canónica exige devolucion.compra, crea movimiento+vínculo atómicos y deja Partida NULL", () => {
  const c = setup();
  const compra = createMov(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-10",
    importe: "120",
    saldo: c.account.id,
    partida: c.food.id,
    concepto: "Compra A",
    nota: "",
  }).movimiento;

  // Sin devolucion.compra → 422 DEVOLUTION_LINK_REQUIRED
  expect(
    codeOf(() =>
      previewMovement(
        c.db,
        {
          tipo: "Devolución de gasto",
          fecha: "2026-08-05",
          importe: "30",
          saldo: c.other.id,
          concepto: "Huérfana API",
          nota: "",
        },
        null,
        false,
        now,
      ),
    ),
  ).toBe("DEVOLUTION_LINK_REQUIRED");

  // Alta canónica con compra: deriva cicloOrigen y deja partida NULL en movimiento y vínculo
  const dev = createMov(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-08-05",
    importe: "30",
    saldo: c.other.id,
    concepto: "Abono parcial",
    nota: "",
    devolucion: {
      compra: compra.id,
      estado: "Verificado",
      elegibilidad: "Acreditada",
      evidenciaRelacion: "Ticket dev 1",
      evidenciaOrigenTemporal: "Factura compra A",
    },
  }).movimiento;

  expect(dev.partida).toBeNull();
  const link = comidaDevolucion(c.db, dev.id)!;
  expect(link.compra).toBe(compra.id);
  expect(link.partida).toBeNull();
  expect(link.cicloOrigen).toBe(c.cycle1.id);
  expect(link.estado).toBe("Verificado");
  expect(link.elegibilidad).toBe("Acreditada");
  expect(link.revision).toBe(1);

  // Ciclo contradictorio → DEVOLUTION_ORIGIN_MISMATCH
  expect(
    codeOf(() =>
      previewMovement(
        c.db,
        {
          tipo: "Devolución de gasto",
          fecha: "2026-08-06",
          importe: "10",
          saldo: c.other.id,
          concepto: "Abono ciclo mal",
          nota: "",
          devolucion: {
            compra: compra.id,
            estado: "Verificado",
            elegibilidad: "Acreditada",
            cicloOrigen: c.cycle2.id,
            evidenciaRelacion: "Ticket",
            evidenciaOrigenTemporal: "Factura",
          },
        },
        null,
        false,
        now,
      ),
    ),
  ).toBe("DEVOLUTION_ORIGIN_MISMATCH");

  // Escritura legacy revision-comida con esDevolucion:true → DEVOLUTION_LEGACY_WRITE
  expect(
    codeOf(() =>
      createRevisionComida(
        c.db,
        {
          fecha: "2026-08-05",
          concepto: "Legacy dev",
          importe: "10.00",
          direccion: "Entrada",
          esDevolucion: true,
          clasificacion: "Pendiente revisar",
          evidenciaBancaria: "op",
          cuentaOrigen: "Cuenta",
        },
        randomUUID(),
        now,
        "Detalle",
        gateAbiertoParaPruebas,
      ),
    ),
  ).toBe("DEVOLUTION_LEGACY_WRITE");
  c.db.close();
});

test("AC-D10/D12/D13/D14/D45: guardas duras sin degradación automática (DEVOLUTION_LINKED, PURCHASE_BELOW_REFUNDED, DEVOLUTION_EXCESS, ATTRIBUTION_EXISTS)", () => {
  const c = setup();
  const compra = createMov(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-10",
    importe: "120",
    saldo: c.account.id,
    partida: c.food.id,
    concepto: "Compra 120",
    nota: "",
  }).movimiento;
  const dev1 = createMov(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-08-05",
    importe: "70",
    saldo: c.other.id,
    concepto: "Dev 70",
    nota: "",
    devolucion: {
      compra: compra.id,
      estado: "Verificado",
      elegibilidad: "Acreditada",
      evidenciaRelacion: "Ev 1",
      evidenciaOrigenTemporal: "Fac 1",
    },
  }).movimiento;

  // AC-D10: exceso en alta → DEVOLUTION_EXCESS
  expect(
    codeOf(() =>
      previewMovement(
        c.db,
        {
          tipo: "Devolución de gasto",
          fecha: "2026-08-06",
          importe: "51",
          saldo: c.other.id,
          concepto: "Dev 51 exceso",
          nota: "",
          devolucion: {
            compra: compra.id,
            estado: "Verificado",
            elegibilidad: "Acreditada",
            evidenciaRelacion: "Ev 2",
            evidenciaOrigenTemporal: "Fac 2",
          },
        },
        null,
        false,
        now,
      ),
    ),
  ).toBe("DEVOLUTION_EXCESS");

  // AC-D12: anular compra con devolución vigente → DEVOLUTION_LINKED (sin degradar)
  expect(
    codeOf(() =>
      updateMov(c.db, compra.id, { revision: 1, motivo: "Anular" }, true),
    ),
  ).toBe("DEVOLUTION_LINKED");
  expect(comidaDevolucion(c.db, dev1.id)!.estado).toBe("Verificado");

  // AC-D13: reducir compra por debajo de 70 (a 69) → PURCHASE_BELOW_REFUNDED
  expect(
    codeOf(() =>
      updateMov(c.db, compra.id, {
        revision: 1,
        motivo: "Bajar a 69",
        tipo: "Gasto",
        fecha: "2026-07-10",
        importe: "69",
        saldo: c.account.id,
        partida: c.food.id,
        concepto: "Compra 120",
        nota: "",
      }),
    ),
  ).toBe("PURCHASE_BELOW_REFUNDED");
  expect(comidaDevolucion(c.db, dev1.id)!.estado).toBe("Verificado");

  // AC-D13: reducir compra a 80 (>= 70) se permite y conserva Verificado
  const compra80 = updateMov(c.db, compra.id, {
    revision: 1,
    motivo: "Ajuste a 80",
    tipo: "Gasto",
    fecha: "2026-07-10",
    importe: "80",
    saldo: c.account.id,
    partida: c.food.id,
    concepto: "Compra 80",
    nota: "",
  }).movimiento;
  expect(compra80.importe).toBe("80.00");
  expect(comidaDevolucion(c.db, dev1.id)!.estado).toBe("Verificado");

  // AC-D14: aumentar devolución por encima de 80 (a 81) → DEVOLUTION_EXCESS (sin degradar)
  expect(
    codeOf(() =>
      updateMov(c.db, dev1.id, {
        revision: 1,
        motivo: "Subir a 81",
        tipo: "Devolución de gasto",
        fecha: "2026-08-05",
        importe: "81",
        saldo: c.other.id,
        concepto: "Dev 81",
        nota: "",
      }),
    ),
  ).toBe("DEVOLUTION_EXCESS");
  expect(comidaDevolucion(c.db, dev1.id)!.estado).toBe("Verificado");

  // AC-D14: retipificar devolución atribuida → ATTRIBUTION_EXISTS
  expect(
    codeOf(() =>
      updateMov(c.db, dev1.id, {
        revision: 1,
        motivo: "Cambiar tipo",
        tipo: "Ingreso",
        fecha: "2026-08-05",
        importe: "70",
        saldo: c.other.id,
        subtipo: "Nómina",
        concepto: "Ingreso",
        nota: "",
      }),
    ),
  ).toBe("ATTRIBUTION_EXISTS");

  // revalidateDevolucionesCompra / revalidateDevolucionPropia nunca degradan
  expect(revalidateDevolucionesCompra(c.db, compra.id, now)).toEqual([]);
  expect(revalidateDevolucionPropia(c.db, dev1.id, now)).toBe(false);
  c.db.close();
});

test("AC-D11/AC-D12: orden transaccional de anulación, triggers de shape e inmutabilidad de anulados", () => {
  const c = setup();
  const compra = createMov(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-10",
    importe: "100",
    saldo: c.account.id,
    partida: c.food.id,
    concepto: "Compra 100",
    nota: "",
  }).movimiento;
  const dev = createMov(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-08-05",
    importe: "40",
    saldo: c.other.id,
    concepto: "Dev 40",
    nota: "",
    devolucion: {
      compra: compra.id,
      estado: "Verificado",
      elegibilidad: "Acreditada",
      evidenciaRelacion: "Ev",
      evidenciaOrigenTemporal: "Fac",
    },
  }).movimiento;

  // 1. Anular devolución conserva vínculo y libera capacidad
  const anulada = updateMov(c.db, dev.id, { revision: 1, motivo: "Error abono" }, true).movimiento;
  expect(anulada.anulado).toBe(true);
  expect(comidaDevolucion(c.db, dev.id)!.compra).toBe(compra.id);

  // 2. Trigger de shape rechaza UPDATE en movimiento_devolucion tras anular el movimiento
  expect(() =>
    c.db.run("UPDATE movimiento_devolucion SET estado='Revisar' WHERE movimiento=?", [dev.id]),
  ).toThrow("invalid devolution movement");

  // 3. Trigger de inmutabilidad rechaza desanular directamente en SQLite
  expect(() =>
    c.db.run("UPDATE movimientos SET anulado=0 WHERE id=?", [dev.id]),
  ).toThrow("annulled record is immutable");

  // 4. Tras anular la devolución, anular la compra sí está permitido
  const compraAnulada = updateMov(c.db, compra.id, { revision: 1, motivo: "Anular compra" }, true).movimiento;
  expect(compraAnulada.anulado).toBe(true);

  // 5. Borrado físico bloqueado por trigger/FK
  expect(() => c.db.run("DELETE FROM movimientos WHERE id=?", [compra.id])).toThrow();
  c.db.close();
});

test("AC-D19/AC-D37/AC-D14: saneamiento individual de huérfano, devolucionRevision obligatoria y reatribución", () => {
  const c = setup();
  const compra1 = createMov(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-10",
    importe: "100",
    saldo: c.account.id,
    partida: c.food.id,
    concepto: "Compra 1",
    nota: "",
  }).movimiento;
  const compra2 = createMov(c.db, {
    tipo: "Gasto",
    fecha: "2026-08-02",
    importe: "80",
    saldo: c.account.id,
    partida: c.food.id,
    concepto: "Compra 2",
    nota: "",
  }).movimiento;

  // Sembrar huérfano histórico en SQLite
  const nH = c.db
    .query("UPDATE counters SET next=next+1 WHERE name='movimientos' RETURNING CAST(next-1 AS TEXT) n")
    .get() as { n: string };
  const ts = new Date(now).toISOString();
  c.db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,referencia,concepto,nota,capital,intereses,revision,creado,actualizado)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
    [nH.n, "2026-08-10", "Devolución de gasto", 2500, "S000", c.other.id, null, null, null, "Huérfana", "", null, null, ts, ts],
  );

  // Saneamiento individual (alta de atribución, devolucionRevision = null)
  const r1 = writeComidaDevolucion(
    c.db,
    nH.n,
    {
      revision: 1,
      devolucionRevision: null,
      compra: compra1.id,
      estado: "Verificado",
      elegibilidad: "Acreditada",
      evidenciaRelacion: "Ticket saneado",
      evidenciaOrigenTemporal: "Factura compra 1",
    },
    randomUUID(),
    now,
    gateAbiertoParaPruebas,
  );
  expect(r1.devolucion.revision).toBe(1);
  expect(r1.devolucion.compra).toBe(compra1.id);
  expect(r1.devolucion.partida).toBeNull();

  // AC-D37: falta devolucionRevision en actualización → 422 VALIDATION
  expect(
    codeOf(() =>
      writeComidaDevolucion(
        c.db,
        nH.n,
        {
          revision: 1,
          compra: compra2.id,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          evidenciaRelacion: "Ticket reatribuido",
          evidenciaOrigenTemporal: "Factura compra 2",
          motivo: "Cambio compra",
        },
        randomUUID(),
        now,
        gateAbiertoParaPruebas,
      ),
    ),
  ).toBe("VALIDATION");

  // AC-D37: devolucionRevision obsoleta → 409 ATTRIBUTION_REVISION_CONFLICT
  expect(
    codeOf(() =>
      writeComidaDevolucion(
        c.db,
        nH.n,
        {
          revision: 1,
          devolucionRevision: 99,
          compra: compra2.id,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          evidenciaRelacion: "Ticket reatribuido",
          evidenciaOrigenTemporal: "Factura compra 2",
          motivo: "Cambio compra",
        },
        randomUUID(),
        now,
        gateAbiertoParaPruebas,
      ),
    ),
  ).toBe("ATTRIBUTION_REVISION_CONFLICT");

  // AC-D14: reatribución individual con compraAnterior y devolucionRevision correcta
  const r2 = writeComidaDevolucion(
    c.db,
    nH.n,
    {
      revision: 1,
      devolucionRevision: 1,
      compraAnterior: compra1.id,
      compra: compra2.id,
      estado: "Verificado",
      elegibilidad: "Acreditada",
      evidenciaRelacion: "Ticket reatribuido",
      evidenciaOrigenTemporal: "Factura compra 2",
      motivo: "Reatribución a compra 2",
    },
    randomUUID(),
    now,
    gateAbiertoParaPruebas,
  );
  expect(r2.devolucion.revision).toBe(2);
  expect(r2.devolucion.compra).toBe(compra2.id);
  expect(r2.devolucion.cicloOrigen).toBe(c.cycle2.id);
  c.db.close();
});

test("AC-D38: idempotencia, comparación de duplicados por compra/estado y auditoría append-only de coincidencia aceptada", () => {
  const c = setup();
  const compra1 = createMov(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-10",
    importe: "100",
    saldo: c.account.id,
    partida: c.food.id,
    concepto: "Compra 1",
    nota: "",
  }).movimiento;
  const compra2 = createMov(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-11",
    importe: "100",
    saldo: c.account.id,
    partida: c.food.id,
    concepto: "Compra 2",
    nota: "",
  }).movimiento;

  const body1 = {
    tipo: "Devolución de gasto",
    fecha: "2026-08-05",
    importe: "30",
    saldo: c.other.id,
    concepto: "Abono",
    nota: "",
    devolucion: {
      compra: compra1.id,
      estado: "Verificado",
      elegibilidad: "Acreditada",
      evidenciaRelacion: "Ev 1",
      evidenciaOrigenTemporal: "Fac 1",
    },
  };
  const key1 = randomUUID();
  const p1 = previewMovement(c.db, body1, null, false, now);
  const full1 = { ...body1, fingerprint: p1.fingerprint, contextRevision: p1.contextRevision };
  const m1 = writeMovement(c.db, full1, key1, null, false, now, undefined, gateAbiertoParaPruebas);
  // Reproducción idempotente
  const m1Retry = writeMovement(c.db, full1, key1, null, false, now, undefined, gateAbiertoParaPruebas);
  expect(m1Retry.movimiento.id).toBe(m1.movimiento.id);
  // Distinto payload con misma clave → IDEMPOTENCY_CONFLICT
  expect(
    codeOf(() =>
      writeMovement(c.db, { ...full1, concepto: "Otro" }, key1, null, false, now, undefined, gateAbiertoParaPruebas),
    ),
  ).toBe("IDEMPOTENCY_CONFLICT");

  // Distinta compra NO es coincidencia
  const bodyOtherCompra = {
    ...body1,
    devolucion: { ...body1.devolucion, compra: compra2.id },
  };
  const pOther = previewMovement(c.db, bodyOtherCompra, null, false, now);
  expect(pOther.duplicados.length).toBe(0);

  // Misma compra y estado SÍ es coincidencia → DUPLICATE_REVIEW sin aceptar, y auditoría duradera al aceptar
  const pDup = previewMovement(c.db, body1, null, false, now);
  expect(pDup.duplicados.length).toBe(1);
  expect(
    codeOf(() =>
      writeMovement(
        c.db,
        { ...body1, fingerprint: pDup.fingerprint, contextRevision: pDup.contextRevision },
        randomUUID(),
        null,
        false,
        now,
        undefined,
        gateAbiertoParaPruebas,
      ),
    ),
  ).toBe("DUPLICATE_REVIEW");

  const m2 = writeMovement(
    c.db,
    {
      ...body1,
      fingerprint: pDup.fingerprint,
      contextRevision: pDup.contextRevision,
      aceptarCoincidencia: true,
    },
    randomUUID(),
    null,
    false,
    now,
    undefined,
    gateAbiertoParaPruebas,
  );
  const auditRow = c.db
    .query("SELECT campos,motivo FROM audit WHERE entidad=? AND accion='alta'")
    .get("movimiento:" + m2.movimiento.id) as { campos: string; motivo: string };
  expect(JSON.parse(auditRow.campos)).toContain("aceptarCoincidencia");
  const parsedEvidence = JSON.parse(auditRow.motivo);
  expect(parsedEvidence.coincidenciaAceptada).toBe(true);
  expect(parsedEvidence.huella).toBe(pDup.fingerprint);
  expect(parsedEvidence.coincidencias[0].id).toBe(m1.movimiento.id);
  c.db.close();
});

test("AC-D41: concurrencia en dos conexiones con busy_timeout impide superar capacidad de compra", () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-f3-conc-"));
  const dbPath = join(dir, "test.sqlite");
  try {
    const c1 = setup(dbPath);
    const compra = createMov(c1.db, {
      tipo: "Gasto",
      fecha: "2026-07-10",
      importe: "100",
      saldo: c1.account.id,
      partida: c1.food.id,
      concepto: "Compra 100",
      nota: "",
    }).movimiento;

    const db2 = new Database(dbPath);
    db2.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL;");

    const bodyA = {
      tipo: "Devolución de gasto",
      fecha: "2026-08-05",
      importe: "60",
      saldo: c1.other.id,
      concepto: "Dev A",
      nota: "",
      devolucion: {
        compra: compra.id,
        estado: "Verificado",
        elegibilidad: "Acreditada",
        evidenciaRelacion: "Ev A",
        evidenciaOrigenTemporal: "Fac A",
      },
    };
    const bodyB = {
      ...bodyA,
      importe: "50",
      concepto: "Dev B",
    };

    const pA = previewMovement(c1.db, bodyA, null, false, now);
    const pB = previewMovement(db2, bodyB, null, false, now);

    // Conexión 1 confirma 60 → éxito
    const resA = writeMovement(
      c1.db,
      { ...bodyA, fingerprint: pA.fingerprint, contextRevision: pA.contextRevision },
      randomUUID(),
      null,
      false,
      now,
      undefined,
      gateAbiertoParaPruebas,
    );
    expect(resA.movimiento.importe).toBe("60.00");

    // Conexión 2 intenta confirmar 50 (60 + 50 > 100) → rechazado (IMPACT_CHANGED o DEVOLUTION_EXCESS)
    const errB = codeOf(() =>
      writeMovement(
        db2,
        { ...bodyB, fingerprint: pB.fingerprint, contextRevision: pB.contextRevision },
        randomUUID(),
        null,
        false,
        now,
        undefined,
        gateAbiertoParaPruebas,
      ),
    );
    expect(["IMPACT_CHANGED", "DEVOLUTION_EXCESS"]).toContain(errB);

    // Incluso con preview fresco en conexión 2, DEVOLUTION_EXCESS impide superar 100
    expect(codeOf(() => previewMovement(db2, bodyB, null, false, now))).toBe("DEVOLUTION_EXCESS");

    const sum = c1.db
      .query(
        `SELECT COALESCE(SUM(m.importe),0) n FROM movimiento_devolucion d
         JOIN movimientos m ON m.id=d.movimiento
         WHERE d.compra=? AND d.estado='Verificado' AND m.anulado=0`,
      )
      .get(compra.id) as { n: number };
    expect(sum.n).toBe(6000);

    db2.close();
    c1.db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("AC-D43: migración v32→v33 paridad exacta con base nueva y trigger UPDATE exige c.anulado=0", () => {
  // Base nueva v33
  const fresh = new Database(":memory:");
  prepareSchema(fresh, { origin: "demo", keyHash: null } as never);

  // Base simulada v32 (con trigger antiguo sin c.anulado=0) que migra a v33
  const migrated = new Database(":memory:");
  prepareSchema(migrated, { origin: "demo", keyHash: null } as never);
  migrated.exec(`
    DROP TRIGGER movimiento_devolucion_update_purchase;
    CREATE TRIGGER movimiento_devolucion_update_purchase BEFORE UPDATE ON movimiento_devolucion
      WHEN NEW.compra IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM movimientos c JOIN saldos s ON s.id=c.origen
        WHERE c.id=NEW.compra AND c.tipo='Gasto'
          AND s.control<>'Terminal'
      ) BEGIN SELECT RAISE(ABORT,'invalid purchase attribution'); END;
    UPDATE schema_version SET version=32;
  `);
  migrated.transaction(() => devolucionTriggerV33(migrated)).immediate();

  expect(migrated.query("SELECT version FROM schema_version").get()).toEqual({ version: 33 });
  expect(manifest(migrated)).toEqual(manifest(fresh));

  // Verificar que el trigger UPDATE rechaza atribuir a una compra anulada en la base migrada
  const c = setup();
  const compra1 = createMov(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-10",
    importe: "100",
    saldo: c.account.id,
    partida: c.food.id,
    concepto: "Compra vigente",
    nota: "",
  }).movimiento;
  const compraAnulada = createMov(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-11",
    importe: "100",
    saldo: c.account.id,
    partida: c.food.id,
    concepto: "Compra anulada",
    nota: "",
  }).movimiento;
  updateMov(c.db, compraAnulada.id, { revision: 1, motivo: "Anular" }, true);
  const dev = createMov(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-08-05",
    importe: "20",
    saldo: c.other.id,
    concepto: "Dev",
    nota: "",
    devolucion: {
      compra: compra1.id,
      estado: "Verificado",
      elegibilidad: "Acreditada",
      evidenciaRelacion: "Ev",
      evidenciaOrigenTemporal: "Fac",
    },
  }).movimiento;

  expect(() =>
    c.db.run("UPDATE movimiento_devolucion SET compra=? WHERE movimiento=?", [
      compraAnulada.id,
      dev.id,
    ]),
  ).toThrow("invalid purchase attribution");

  fresh.close();
  migrated.close();
  c.db.close();
});
