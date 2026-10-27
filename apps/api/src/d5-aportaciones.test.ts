import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { prepareSchema } from "./database-schema";
import { prepareV16 } from "../test-support/database-v16";
import {
  calcularReparto,
  distribuirRecuperado,
  createCompartido,
  createParticipante,
  getCompartido,
  previewAportacion,
  confirmAportacion,
  bajaParticipante,
} from "./compartidos";
import { createReference } from "./referencias";
import { createClassification } from "./clasificacion";
import { createSaldo, Problem } from "./saldos";
import { getMovement, movementOptions, previewMovement, writeMovement } from "./movimientos";
import { positionCents } from "./movement-ledger";

const now = Date.parse("2026-10-27T12:00:00Z");
const evidence = "Extracto bancario ficticio REF-2026-10";
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
function saldo(db: Database, name = "Cuenta ficticia", control = "Movimientos") {
  return createSaldo(
    db,
    {
      nombre: name,
      tipo: control === "Exterior" ? "Exterior" : "Efectivo",
      control,
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
    { nombre: "Álex", rol: "Tercero", partes: 1 },
  ],
) {
  const c = createCompartido(db, { nombre: "Caso D5 ficticio" }, randomUUID(), now);
  for (const p of participants)
    createParticipante(db, c.referencia.id, p, randomUUID(), now);
  return c.referencia.id;
}
function participant(db: Database, ref: string, name: string) {
  return getCompartido(db, ref).participantes.find((p) => p.nombre === name)!;
}
function expense(
  db: Database,
  ref: string,
  saldoId: string,
  partidaId: string,
  importe: string,
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
function aportacion(
  db: Database,
  ref: string,
  destino: string,
  participantId: string,
  importe = "300.00",
  extra: Record<string, unknown> = {},
) {
  const body = {
    tipo: "Transferencia",
    fecha: "2026-10-10",
    importe,
    origen: "S000",
    destino,
    referencia: ref,
    concepto: "Aportación ficticia de tercero",
    compartido: {
      participante: participantId,
      evidencia: evidence,
      procedencia: "Documento bancario",
    },
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
function count(db: Database, table: string) {
  return (
    db.query(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }
  ).n;
}

test("T-D5-01/05/06/07/12 high atomically creates one Movement and one accreditation with exact effect", () => {
  const db = setup();
  categories(db);
  const p13 = partida(db, "CAT013"),
    payer = saldo(db, "Banco pagador"),
    destination = saldo(db, "Cuenta destino");
  const ref = caseWith(db);
  const alex = participant(db, ref, "Álex"),
    bea = participant(db, ref, "Bea");
  const gasto = expense(db, ref, payer, p13, "450.00");
  const opening = BigInt(positionCents(db, destination, "100000"));
  const m = aportacion(db, ref, destination, alex.id, "300.00");
  expect(m.tipo).toBe("Transferencia");
  expect(m.origen.id).toBe("S000");
  expect(m.destino.id).toBe(destination);
  expect(m.partida).toBeNull();
  expect(m.subtipo).toBeNull();
  expect(m.referencia?.id).toBe(ref);
  expect(m.compartido).toMatchObject({
    participante: alex.id,
    evidencia: evidence,
    procedencia: "Documento bancario",
  });
  expect(count(db, "movimiento_compartido")).toBe(1);
  expect(count(db, "movimientos")).toBe(2);
  expect(
    db.query("SELECT COUNT(*) n FROM movimientos WHERE tipo IN ('Ingreso','Gasto')").get(),
  ).toEqual({ n: 1 });
  expect(BigInt(positionCents(db, destination, "100000")) - opening).toBe(30000n);
  const d = getCompartido(db, ref);
  expect(d.resumen).toMatchObject({
    estado: "Reparto parcial",
    estadoReparto: "Reparto parcial",
    puedeCerrar: false,
  });
  expect(d.resumen.recuperado).toMatchObject({
    valor: "300.00",
    estado: "Verificada",
  });
  expect(d.resumen.neto).toMatchObject({
    valor: "150.00",
    estado: "Verificada",
  });
  expect(d.resumen.pendienteTerceros).toMatchObject({ valor: "150.00" });
  expect(d.resumen.exceso).toMatchObject({ valor: "150.00" });
  expect(d.participantes.find((p) => p.id === bea.id)!.pendiente.valor).toBe(
    "150.00",
  );
  expect(d.participantes.find((p) => p.id === alex.id)!.exceso.valor).toBe(
    "150.00",
  );
  expect(d.participantes.find((p) => p.rol === "Titular")!.pendiente.valor).toBe(
    "0.00",
  );
  expect(d.gastos.find((g) => g.id === gasto.id)!.recuperado.valor).toBe(
    "300.00",
  );
  expect(d.gastos.find((g) => g.id === gasto.id)!.neto.valor).toBe("150.00");
  expect(d.resumen.fechas.ultimaAportacion).toBe("2026-10-10");
  expect(d.aportaciones).toHaveLength(1);
  expect(d.aportaciones[0]).toMatchObject({
    movimiento: m.id,
    importe: "300.00",
    anulado: false,
    computa: true,
    participante: { id: alex.id, nombre: "Álex" },
  });

  // Participant/cardinality/evidence rules, no partial rows.
  expect(() =>
    aportacion(db, ref, destination, participant(db, ref, "Yo").id),
  ).toThrow("Titular");
  expect(() => aportacion(db, ref, destination, "CP999")).toThrow("no pertenece");
  const other = caseWith(db, [
    { nombre: "Titular otro", rol: "Titular", partes: 1 },
    { nombre: "Tercero otro", rol: "Tercero", partes: 1 },
  ]);
  expect(() =>
    aportacion(db, ref, destination, participant(db, other, "Tercero otro").id),
  ).toThrow("no pertenece");
  expect(() =>
    aportacion(db, ref, destination, alex.id, "10.00", {
      compartido: {
        participante: alex.id,
        evidencia: "corta",
        procedencia: "Documento bancario",
      },
    }),
  ).toThrow("10 a 500");
  expect(() =>
    aportacion(db, ref, destination, alex.id, "10.00", {
      compartido: {
        participante: alex.id,
        evidencia: evidence,
        procedencia: "Importación histórica autorizada",
      },
    }),
  ).toThrow("Registro del titular o Documento bancario");
  // A second accreditation of the same Movement is rejected by the historical route.
  expect(() =>
    previewAportacion(db, ref, m.id, {
      revision: m.revision,
      compartido: {
        participante: bea.id,
        evidencia: evidence,
        procedencia: "Documento bancario",
      },
    }),
  ).toThrow("ya tiene una acreditación");
  expect(count(db, "movimiento_compartido")).toBe(1);
  expect(count(db, "movimientos")).toBe(2);
  db.close();
});

test("T-D5-02/04 only CAT013 entrance is admitted; Gasto/Ingreso semantics are preserved", () => {
  const db = setup();
  categories(db);
  const p13 = partida(db, "CAT013"),
    payer = saldo(db, "Banco pagador"),
    destination = saldo(db, "Cuenta destino"),
    exterior = (() => {
      const time = new Date(now).toISOString();
      db.run(
        "INSERT INTO saldos(id,nombre,tipo,control,estado,revision,creado,actualizado) VALUES('S900','Exterior ficticio','Exterior','Exterior','Activa',1,?,?)",
        [time, time],
      );
      return "S900";
    })();
  const ref = caseWith(db);
  const bea = participant(db, ref, "Bea");
  expense(db, ref, payer, p13, "450.00");
  const base = {
    tipo: "Transferencia",
    fecha: "2026-10-10",
    importe: "10.00",
    origen: "S000",
    destino: destination,
    referencia: ref,
    concepto: "Intento ficticio",
    compartido: {
      participante: bea.id,
      evidencia: evidence,
      procedencia: "Documento bancario",
    },
  };
  expect(() => previewMovement(db, { ...base, origen: payer, destino: "S000" }, null, false, now)).toThrow();
  expect(() => previewMovement(db, { ...base, destino: "S000" }, null, false, now)).toThrow();
  expect(() => previewMovement(db, { ...base, destino: exterior }, null, false, now)).toThrow();
  const event = createReference(db, { nombre: "Evento ficticio", tipo: "Evento" }, randomUUID(), now);
  expect(() => previewMovement(db, { ...base, referencia: event.id }, null, false, now)).toThrow();
  const missing = rejection(() =>
    previewMovement(db, { ...base, compartido: undefined }, null, false, now),
  );
  expect(missing.fields.origen).toContain("bloque compartido");
  // Ingreso CAT013 is rejected; Gasto CAT013 remains Base B; internal Transfer does not accredit.
  expect(() =>
    previewMovement(
      db,
      {
        tipo: "Ingreso",
        fecha: "2026-10-07",
        importe: "10.00",
        saldo: destination,
        subtipo: "Bonus",
        referencia: ref,
        concepto: "Ingreso ficticio CAT013",
      },
      null,
      false,
      now,
    ),
  ).toThrow("solo admite Gastos");
  const ingresoBody = {
    tipo: "Ingreso",
    fecha: "2026-10-07",
    importe: "10.00",
    saldo: destination,
    subtipo: "Bonus",
    concepto: "Ingreso ficticio E1.5",
  };
  const ingresoPreview = previewMovement(db, ingresoBody, null, false, now);
  const ingreso = writeMovement(
    db,
    { ...ingresoBody, fingerprint: ingresoPreview.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    null,
    false,
    now,
  ).movimiento;
  expect(ingreso.referencia).toBeNull();
  expect(ingreso.compartido).toBeNull();
  const internal = {
    tipo: "Transferencia",
    fecha: "2026-10-08",
    importe: "10.00",
    origen: payer,
    destino: destination,
    referencia: ref,
    concepto: "Transferencia interna ficticia",
  };
  const ip = previewMovement(db, internal, null, false, now);
  const im = writeMovement(
    db,
    { ...internal, fingerprint: ip.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    null,
    false,
    now,
  ).movimiento;
  expect(im.compartido).toBeNull();
  expect(count(db, "movimiento_compartido")).toBe(0);
  const d = getCompartido(db, ref);
  expect(d.resumen.recuperado.valor).toBe("0.00");
  expect(
    movementOptions(db).saldos.some((s: { id: string }) => s.id === "S000"),
  ).toBe(false);
  db.close();
});

test("T-D5-02 regression: an existing internal Movement cannot be converted into a D5 contribution by PATCH", () => {
  const db = setup();
  categories(db);
  const p13 = partida(db, "CAT013"),
    payer = saldo(db, "Banco pagador"),
    destination = saldo(db, "Cuenta destino");
  const ref = caseWith(db);
  const bea = participant(db, ref, "Bea");
  const internalBody = {
    tipo: "Transferencia",
    fecha: "2026-10-08",
    importe: "50.00",
    origen: payer,
    destino: destination,
    referencia: ref,
    concepto: "Transferencia interna previa",
  };
  const ip = previewMovement(db, internalBody, null, false, now);
  const internal = writeMovement(
    db,
    { ...internalBody, fingerprint: ip.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    null,
    false,
    now,
  ).movimiento;
  const conversion = rejection(() =>
    previewMovement(
      db,
      {
        ...internalBody,
        origen: "S000",
        revision: internal.revision,
        motivo: "Intento ficticio de reclasificación",
        compartido: {
          participante: bea.id,
          evidencia: evidence,
          procedencia: "Registro del titular",
        },
      },
      internal.id,
      false,
      now,
    ),
  );
  expect(conversion.fields?.origen).toContain("no se convierte en aportación");
  const plain = rejection(() =>
    previewMovement(
      db,
      {
        ...internalBody,
        origen: "S000",
        referencia: null,
        revision: internal.revision,
        motivo: "Intento ficticio sin bloque compartido",
      },
      internal.id,
      false,
      now,
    ),
  );
  expect(plain.fields?.origen).toContain("no se convierte en aportación");
  expect(
    db
      .query("SELECT origen,referencia FROM movimientos WHERE id=?")
      .get(internal.id),
  ).toEqual({ origen: payer, referencia: ref });
  expect(count(db, "movimiento_compartido")).toBe(0);
  db.close();
});

test("T-D5-08 historical accreditation only after explicit review of an eligible existing Movement", () => {
  const db = setup();
  categories(db);
  const p13 = partida(db, "CAT013"),
    payer = saldo(db, "Banco pagador"),
    destination = saldo(db, "Cuenta destino");
  const ref = caseWith(db);
  const bea = participant(db, ref, "Bea");
  expense(db, ref, payer, p13, "450.00");
  const timestamp = new Date(now).toISOString();
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,referencia,concepto,nota,capital,intereses,anulado,revision,creado,actualizado) VALUES('901','2026-10-02','Transferencia',25000,'S000',?,NULL,NULL,?,'Aportación histórica ficticia','',NULL,NULL,0,1,?,?)",
    [destination, ref, timestamp, timestamp],
  );
  expect(count(db, "movimiento_compartido")).toBe(0);
  const preview = previewAportacion(db, ref, "901", {
    revision: 1,
    compartido: {
      participante: bea.id,
      evidencia: "Documento bancario ficticio 2026-10",
      procedencia: "Documento bancario",
    },
  });
  expect(preview.compartido).toMatchObject({ participante: bea.id });
  expect(preview.impacto.antes.recuperado.valor).toBe("0.00");
  expect(preview.impacto.despues.recuperado.valor).toBe("250.00");
  expect(() =>
    confirmAportacion(
      db,
      ref,
      "901",
      {
        revision: 1,
        contexto: preview.contexto,
        compartido: {
          participante: bea.id,
          evidencia: "Documento bancario ficticio 2026-10",
          procedencia: "Documento bancario",
        },
        fingerprint: "incorrecto",
        confirmado: true,
      },
      randomUUID(),
      now,
    ),
  ).toThrow("impacto");
  const confirmed = confirmAportacion(
    db,
    ref,
    "901",
    {
      revision: 1,
      contexto: preview.contexto,
      compartido: {
        participante: bea.id,
        evidencia: "Documento bancario ficticio 2026-10",
        procedencia: "Documento bancario",
      },
      fingerprint: preview.fingerprint,
      confirmado: true,
    },
    randomUUID(),
    now,
  );
  expect(confirmed.aportaciones).toHaveLength(1);
  expect(count(db, "movimiento_compartido")).toBe(1);
  expect(() =>
    previewAportacion(db, ref, "901", {
      revision: 1,
      compartido: {
        participante: bea.id,
        evidencia: "Otra evidencia ficticia 2026",
        procedencia: "Documento bancario",
      },
    }),
  ).toThrow("ya tiene una acreditación");
  // Historical provenance cannot be only the Titular's own record.
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,concepto,nota,anulado,revision,creado,actualizado) VALUES('902','2026-10-03','Transferencia',1000,'S000',?,'Histórico sin evidencia','',0,1,?,?)",
    [destination, timestamp, timestamp],
  );
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,referencia,concepto,nota,anulado,revision,creado,actualizado) VALUES('903','2026-10-04','Transferencia',1000,'S000',?,?,'Histórico con creador','',0,1,?,?)",
    [destination, ref, timestamp, timestamp],
  );
  expect(() =>
    previewAportacion(db, ref, "902", {
      revision: 1,
      compartido: {
        participante: bea.id,
        evidencia: evidence,
        procedencia: "Documento bancario",
      },
    }),
  ).toThrow("CAT013");
  expect(() =>
    previewAportacion(db, ref, "903", {
      revision: 1,
      compartido: {
        participante: bea.id,
        evidencia: evidence,
        procedencia: "Registro del titular",
      },
    }),
  ).toThrow("histórico exige");
  db.run("UPDATE movimientos SET anulado=1 WHERE id='903'");
  expect(() =>
    previewAportacion(db, ref, "903", {
      revision: 1,
      compartido: {
        participante: bea.id,
        evidencia: evidence,
        procedencia: "Documento bancario",
      },
    }),
  ).toThrow("anulado");
  db.run(
    "INSERT INTO saldos(id,nombre,tipo,control,estado,revision,creado,actualizado) VALUES('S900','Exterior histórico ficticio','Exterior','Exterior','Activa',1,?,?)",
    [timestamp, timestamp],
  );
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,referencia,concepto,nota,anulado,revision,creado,actualizado) VALUES('905','2026-10-06','Transferencia',1000,'S000','S900',?,'Histórico Exterior','',0,1,?,?)",
    [ref, timestamp, timestamp],
  );
  expect(() =>
    previewAportacion(db, ref, "905", {
      revision: 1,
      compartido: {
        participante: bea.id,
        evidencia: evidence,
        procedencia: "Documento bancario",
      },
    }),
  ).toThrow("CAT013");
  // A stale context is rejected before writing.
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,referencia,concepto,nota,anulado,revision,creado,actualizado) VALUES('904','2026-10-05','Transferencia',2000,'S000',?,?,'Histórico contexto','',0,1,?,?)",
    [destination, ref, timestamp, timestamp],
  );
  const stale = previewAportacion(db, ref, "904", {
    revision: 1,
    compartido: {
      participante: bea.id,
      evidencia: "Extracto ficticio alternativo 2026",
      procedencia: "Documento bancario",
    },
  });
  createParticipante(
    db,
    ref,
    { nombre: "Tercero nuevo", rol: "Tercero", partes: 1 },
    randomUUID(),
    now,
  );
  expect(() =>
    confirmAportacion(
      db,
      ref,
      "904",
      {
        revision: 1,
        contexto: stale.contexto,
        compartido: {
          participante: bea.id,
          evidencia: "Extracto ficticio alternativo 2026",
          procedencia: "Documento bancario",
        },
        fingerprint: stale.fingerprint,
        confirmado: true,
      },
      randomUUID(),
      now,
    ),
  ).toThrow("contexto");
  db.close();
});

test("T-D5-09 replay, concurrency, stale context and transactional rollback", async () => {
  const db = setup();
  categories(db);
  const p13 = partida(db, "CAT013"),
    payer = saldo(db, "Banco pagador"),
    destination = saldo(db, "Cuenta destino");
  const ref = caseWith(db);
  const bea = participant(db, ref, "Bea");
  expense(db, ref, payer, p13, "450.00");
  const body = {
    tipo: "Transferencia",
    fecha: "2026-10-10",
    importe: "100.00",
    origen: "S000",
    destino: destination,
    referencia: ref,
    concepto: "Aportación replay ficticia",
    compartido: {
      participante: bea.id,
      evidencia: evidence,
      procedencia: "Documento bancario",
    },
  };
  const preview = previewMovement(db, body, null, false, now);
  const key = randomUUID(),
    writeBody = { ...body, fingerprint: preview.fingerprint, aceptarCoincidencia: true };
  const first = writeMovement(db, writeBody, key, null, false, now);
  const replay = writeMovement(db, writeBody, key, null, false, now);
  expect(replay.movimiento.id).toBe(first.movimiento.id);
  expect(count(db, "movimientos")).toBe(2);
  expect(count(db, "movimiento_compartido")).toBe(1);
  expect(() =>
    writeMovement(
      db,
      { ...writeBody, importe: "101.00" },
      key,
      null,
      false,
      now,
    ),
  ).toThrow("otros datos");
  const rollbackBody = {
    ...body,
    fecha: "2026-10-11",
    concepto: "Aportación rollback ficticia",
  };
  const rp = previewMovement(db, rollbackBody, null, false, now);
  db.exec(
    "CREATE TRIGGER fail_aporte BEFORE INSERT ON movimiento_compartido BEGIN SELECT RAISE(ABORT,'fallo inyectado D5'); END",
  );
  expect(() =>
    writeMovement(
      db,
      { ...rollbackBody, fingerprint: rp.fingerprint, aceptarCoincidencia: true },
      randomUUID(),
      null,
      false,
      now,
    ),
  ).toThrow("fallo inyectado D5");
  db.exec("DROP TRIGGER fail_aporte");
  expect(
    db.query("SELECT id FROM movimientos WHERE concepto='Aportación rollback ficticia'").all(),
  ).toEqual([]);
  expect(count(db, "movimiento_compartido")).toBe(1);

  // Two independent processes with the same key and payload: one operation.
  const dir = mkdtempSync(join(tmpdir(), "mf-d5-race-")),
    path = join(dir, "demo.sqlite"),
    fileDb = new Database(path);
  prepareSchema(fileDb, { origin: "demo", key_hash: null });
  categories(fileDb);
  const fp13 = partida(fileDb, "CAT013"),
    fpayer = saldo(fileDb, "Banco pagador"),
    fdestination = saldo(fileDb, "Cuenta destino"),
    fref = caseWith(fileDb),
    fbea = participant(fileDb, fref, "Bea");
  expense(fileDb, fref, fpayer, fp13, "450.00");
  const raceBody = {
    tipo: "Transferencia",
    fecha: "2026-10-12",
    importe: "100.00",
    origen: "S000",
    destino: fdestination,
    referencia: fref,
    concepto: "Aportación concurrente ficticia",
    compartido: {
      participante: fbea.id,
      evidencia: evidence,
      procedencia: "Documento bancario",
    },
  };
  const racePreview = previewMovement(fileDb, raceBody, null, false, now);
  fileDb.close();
  const bodyPath = join(dir, "body.json");
  writeFileSync(
    bodyPath,
    JSON.stringify({ ...raceBody, fingerprint: racePreview.fingerprint, aceptarCoincidencia: true }),
  );
  const raceKey = randomUUID(),
    worker = "apps/api/test-support/anticipo-race-worker.ts";
  const run = () =>
    Bun.spawn([process.env.BUN_BIN ?? "bun", worker, path, bodyPath, raceKey, String(now)], {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, NODE_ENV: "test" },
    });
  const frames = [run(), run()];
  const reads = frames.map((x) => new Response(x.stdout).text());
  await Promise.all(frames.map((x) => x.exited));
  const outputs = await Promise.all(reads);
  expect(outputs.sort()).toEqual(["SAVED", "SAVED"]);
  const check = new Database(path);
  try {
    expect(
      check.query("SELECT COUNT(*) n FROM movimientos WHERE concepto='Aportación concurrente ficticia'").get(),
    ).toEqual({ n: 1 });
    expect(check.query("SELECT COUNT(*) n FROM movimiento_compartido").get()).toEqual({
      n: 1,
    });
  } finally {
    check.close();
    rmSync(dir, { recursive: true, force: true });
  }
  db.close();
});

test("T-D5-10/11 rectification preserves historical links, blocks identity changes and annulment excludes without DELETE", () => {
  const db = setup();
  categories(db);
  const p13 = partida(db, "CAT013"),
    payer = saldo(db, "Banco pagador"),
    destination = saldo(db, "Cuenta destino");
  const ref = caseWith(db);
  const bea = participant(db, ref, "Bea"),
    alex = participant(db, ref, "Álex");
  expense(db, ref, payer, p13, "450.00");
  const m = aportacion(db, ref, destination, alex.id, "300.00");
  const inactiveTarget = createParticipante(
    db,
    ref,
    { nombre: "Tercero de baja ficticio", rol: "Tercero", partes: 1 },
    randomUUID(),
    now,
  ).participantes.find((p) => p.nombre === "Tercero de baja ficticio")!;
  bajaParticipante(
    db,
    ref,
    inactiveTarget.id,
    { revision: inactiveTarget.revision, motivo: "Baja ficticia del destino" },
    randomUUID(),
    now,
  );
  db.run("UPDATE referencias SET estado='Inactiva' WHERE id=?", [ref]);
  bajaParticipante(db, ref, alex.id, { revision: alex.revision, motivo: "Baja ficticia" }, randomUUID(), now);
  const before = getMovement(db, m.id).movimiento;
  const body = {
    tipo: before.tipo,
    fecha: before.fecha,
    importe: "250.00",
    origen: "S000",
    destino: before.destino.id,
    referencia: ref,
    concepto: before.concepto,
    nota: before.nota,
    revision: before.revision,
    motivo: "Rectificación ficticia conservando vínculos inactivos",
  };
  const preview = previewMovement(db, body, m.id, false, now);
  const changed = writeMovement(
    db,
    { ...body, fingerprint: preview.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    m.id,
    false,
    now,
  ).movimiento;
  expect(changed.importe).toBe("250.00");
  expect(changed.origen.id).toBe("S000");
  expect(changed.referencia?.id).toBe(ref);
  expect(changed.compartido).toMatchObject({
    participante: alex.id,
    evidencia: evidence,
    revision: 2,
  });
  expect(
    db.query("SELECT accion FROM compartido_audit WHERE referencia=? ORDER BY id").all(ref),
  ).toContainEqual({ accion: "rectificar aportación" });
  // Type/Reference/Origin are immutable while accredited.
  expect(() =>
    previewMovement(
      db,
      {
        ...body,
        revision: changed.revision,
        tipo: "Gasto",
        saldo: before.origen.id,
        partida: p13,
        origen: undefined,
        destino: undefined,
      },
      m.id,
      false,
      now,
    ),
  ).toThrow();
  const otherRef = caseWith(db, [
    { nombre: "Titular otro", rol: "Titular", partes: 1 },
    { nombre: "Tercero otro", rol: "Tercero", partes: 1 },
  ]);
  expect(() =>
    previewMovement(
      db,
      { ...body, revision: changed.revision, referencia: otherRef },
      m.id,
      false,
      now,
    ),
  ).toThrow("inmutables");
  // Participant identity change requires an active Reference and active Tercero.
  expect(() =>
    previewMovement(
      db,
      {
        ...body,
        revision: changed.revision,
        motivo: "Intento con Referencia inactiva",
        compartido: {
          participante: bea.id,
          evidencia: evidence,
          procedencia: "Documento bancario",
        },
      },
      m.id,
      false,
      now,
    ),
  ).toThrow("Referencia activa");
  const newParticipant = (() => {
    db.run("UPDATE referencias SET estado='Activa' WHERE id=?", [ref]);
    return createParticipante(
      db,
      ref,
      { nombre: "Tercero activo nuevo", rol: "Tercero", partes: 1 },
      randomUUID(),
      now,
    ).participantes.find((p) => p.nombre === "Tercero activo nuevo")!;
  })();
  expect(() =>
    previewMovement(
      db,
      {
        ...body,
        revision: changed.revision,
        motivo: "Intento con Tercero de baja",
        compartido: {
          participante: inactiveTarget.id,
          evidencia: evidence,
          procedencia: "Documento bancario",
        },
      },
      m.id,
      false,
      now,
    ),
  ).toThrow("baja lógica");
  const identityPreview = previewMovement(
    db,
    {
      ...body,
      revision: changed.revision,
      motivo: "Cambio ficticio de participante",
      compartido: {
        participante: newParticipant.id,
        evidencia: evidence,
        procedencia: "Documento bancario",
      },
    },
    m.id,
    false,
    now,
  );
  const identityChanged = writeMovement(
    db,
    {
      ...body,
      revision: changed.revision,
      motivo: "Cambio ficticio de participante",
      compartido: {
        participante: newParticipant.id,
        evidencia: evidence,
        procedencia: "Documento bancario",
      },
      fingerprint: identityPreview.fingerprint,
      aceptarCoincidencia: true,
    },
    randomUUID(),
    m.id,
    false,
    now,
  ).movimiento;
  expect(identityChanged.compartido).toMatchObject({
    participante: newParticipant.id,
    revision: 3,
  });
  // Annulment keeps metadata/history but removes it from the motor.
  const annulPreview = previewMovement(
    db,
    {
      revision: identityChanged.revision,
      motivo: "Anulación ficticia",
    },
    m.id,
    true,
    now,
  );
  const annulled = writeMovement(
    db,
    {
      revision: identityChanged.revision,
      motivo: "Anulación ficticia",
      fingerprint: annulPreview.fingerprint,
    },
    randomUUID(),
    m.id,
    true,
    now,
  );
  expect(annulled.movimiento.anulado).toBe(true);
  expect(annulled.movimiento.compartido).not.toBeNull();
  const d = getCompartido(db, ref);
  expect(d.resumen.recuperado.valor).toBe("0.00");
  expect(d.aportaciones[0]).toMatchObject({ anulado: true, computa: false });
  expect(
    db.query("SELECT accion FROM compartido_audit WHERE referencia=? ORDER BY id").all(ref),
  ).toContainEqual({ accion: "anular aportación" });
  expect(() =>
    db.run("DELETE FROM movimiento_compartido WHERE movimiento=?", [m.id]),
  ).toThrow("no delete");
  expect(() =>
    previewAportacion(db, ref, m.id, {
      revision: annulled.movimiento.revision,
      compartido: {
        participante: bea.id,
        evidencia: evidence,
        procedencia: "Documento bancario",
      },
    }),
  ).toThrow("anulado");
  expect(() =>
    previewMovement(
      db,
      { ...body, revision: annulled.movimiento.revision },
      m.id,
      false,
      now,
    ),
  ).toThrow("anulado");
  db.close();
});

test("T-D5-12 R-MP exact attribution, excess, pending and no-quota incidence", () => {
  const db = setup();
  categories(db);
  const sub = createClassification(
      db,
      "subcategorias",
      { nombre: "Sub ficticia doble", padre: "CAT013" },
      randomUUID(),
      now,
    ).id,
    p1 = createClassification(
      db,
      "partidas",
      { nombre: "Partida ficticia uno", padre: sub },
      randomUUID(),
      now,
    ).id,
    p2 = createClassification(
      db,
      "partidas",
      { nombre: "Partida ficticia dos", padre: sub },
      randomUUID(),
      now,
    ).id,
    payer = saldo(db, "Banco pagador"),
    destination = saldo(db, "Cuenta destino");
  const ref = caseWith(db);
  const bea = participant(db, ref, "Bea"),
    alex = participant(db, ref, "Álex");
  const g1 = expense(db, ref, payer, p1, "300.00", "2026-10-05"),
    g2 = expense(db, ref, payer, p2, "150.00", "2026-10-06");
  aportacion(db, ref, destination, alex.id, "400.00");
  const d = getCompartido(db, ref);
  expect(d.resumen).toMatchObject({
    estado: "Reparto parcial",
    puedeCerrar: false,
  });
  expect(d.resumen.recuperado.valor).toBe("400.00");
  expect(d.resumen.neto.valor).toBe("50.00");
  expect(d.resumen.pendienteTerceros.valor).toBe("150.00");
  expect(d.resumen.exceso.valor).toBe("250.00");
  expect(d.participantes.find((p) => p.id === bea.id)!.pendiente.valor).toBe(
    "150.00",
  );
  expect(d.participantes.find((p) => p.id === alex.id)!.pendiente.valor).toBe(
    "0.00",
  );
  expect(d.participantes.find((p) => p.id === alex.id)!.exceso.valor).toBe(
    "250.00",
  );
  expect(d.participantes.find((p) => p.rol === "Titular")!.pendiente.valor).toBe(
    "0.00",
  );
  expect(d.gastos.find((g) => g.id === g1.id)!.recuperado.valor).toBe("266.67");
  expect(d.gastos.find((g) => g.id === g1.id)!.neto.valor).toBe("33.33");
  expect(d.gastos.find((g) => g.id === g2.id)!.recuperado.valor).toBe("133.33");
  expect(d.gastos.find((g) => g.id === g2.id)!.neto.valor).toBe("16.67");
  expect(
    d.gastos.reduce((sum, g) => sum + BigInt(g.recuperado.valor!.replace(".", "")), 0n),
  ).toBe(40000n);
  // A Tercero with Recuperado but no quota is a Revisar incidence, never a split.
  createParticipante(
    db,
    ref,
    { nombre: "Sin cuota", rol: "Tercero", partes: 0 },
    randomUUID(),
    now,
  );
  const noQuota = participant(db, ref, "Sin cuota");
  aportacion(db, ref, destination, noQuota.id, "100.00");
  const d2 = getCompartido(db, ref);
  expect(d2.resumen.estado).toBe("Revisar");
  expect(d2.resumen.cobertura.estado).toBe("Parcial");
  expect(
    d2.resumen.alertas.some((a) => a.motivo.includes("recuperado sin cuota")),
  ).toBe(true);
  expect(d2.resumen.recuperado.valor).toBe("500.00");
  expect(d2.resumen.exceso.valor).toBe("350.00");
  expect(
    d2.participantes.find((p) => p.id === noQuota.id)!.exceso,
  ).toMatchObject({ valor: "100.00", estado: "Verificada" });
  expect(distribuirRecuperado(1n, [
    { id: "2", cents: 1n },
    { id: "1", cents: 1n },
  ])).toEqual(new Map([["1", 1n], ["2", 0n]]));
  db.close();
});

test("T-D5-13 HTTP: D5 routes require MFA/CSRF/Origin and return safe errors", async () => {
  const { HttpApp } = await import("@effect/platform"),
    { Auth, provision, totp } = await import("./auth"),
    { createApp } = await import("./app");
  const db = setup(),
    key = randomBytes(32);
  let clock = now;
  const auth = new Auth(db, key, "http://127.0.0.1:5173", () => clock),
    handler = HttpApp.toWebHandler(createApp(db, { key, now: () => clock }));
  categories(db);
  const p13 = partida(db, "CAT013"),
    payer = saldo(db, "Banco pagador"),
    destination = saldo(db, "Cuenta destino");
  const ref = caseWith(db);
  const bea = participant(db, ref, "Bea");
  expense(db, ref, payer, p13, "450.00");
  const path = "/api/compartidos/fichas/" + ref + "/movimientos/999/acreditar";
  for (const [method, body] of [
    ["GET", undefined],
    ["POST", "{}"],
  ] as const)
    expect(
      (await handler(new Request("http://127.0.0.1:5173" + path, { method, body })))
        .status,
    ).toBe(401);
  const e = await auth.enroll(
      provision(db, now),
      "Contraseña ficticia extensa de seguridad D5",
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
        new Request("http://127.0.0.1:5173" + path, {
          method: "POST",
          headers: { ...headers, origin: "http://invalid.test" },
          body: "{}",
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await handler(
        new Request("http://127.0.0.1:5173" + path, {
          method: "POST",
          headers,
          body: JSON.stringify({ revision: 1 }),
        }),
      )
    ).status,
  ).toBe(404);
  const body = {
    tipo: "Transferencia",
    fecha: "2026-10-10",
    importe: "100.00",
    origen: "S000",
    destino: destination,
    referencia: ref,
    concepto: "Aportación HTTP ficticia",
    compartido: {
      participante: bea.id,
      evidencia: evidence,
      procedencia: "Documento bancario",
    },
  };
  const preview = previewMovement(db, body, null, false, now);
  const created = await handler(
    new Request("http://127.0.0.1:5173/api/movimientos", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...body,
        fingerprint: preview.fingerprint,
        aceptarCoincidencia: true,
      }),
    }),
  );
  expect(created.status).toBe(201);
  const json = (await created.json()) as any;
  expect(json.movimiento.compartido).toMatchObject({
    participante: bea.id,
    procedencia: "Documento bancario",
  });
  const dto = (await (
    await handler(
      new Request("http://127.0.0.1:5173/api/compartidos/fichas/" + ref, {
        headers: { cookie: headers.cookie },
      }),
    )
  ).json()) as any;
  expect(dto.aportaciones).toHaveLength(1);
  expect(dto.resumen.recuperado.valor).toBe("100.00");
  db.close();
});

test("T-D5-16 SQLite boundary: shape is relaxed, CAT013/ficha/participant remain service rules", () => {
  const db = setup();
  categories(db);
  const ref = caseWith(db);
  const bea = participant(db, ref, "Bea");
  const time = new Date(now).toISOString();
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,concepto,nota,anulado,revision,creado,actualizado) VALUES('950','2026-10-01','Transferencia',1000,'S000','S001','Forma relajada','',0,1,?,?)",
    [time, time],
  );
  // The CHECK cannot validate CAT013 or accreditation; metadata trigger can only
  // accept a real D5 Movement + same-ficha participant.
  expect(() =>
    db.run(
      "INSERT INTO movimiento_compartido(movimiento,referencia,participante,evidencia,procedencia,revision_movimiento,revision,creado,actualizado) VALUES('950',?,?,'Evidencia ficticia 2026','Documento bancario',1,1,?,?)",
      [ref, bea.id, time, time],
    ),
  ).toThrow("invalid D5 movement");
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,referencia,concepto,nota,anulado,revision,creado,actualizado) VALUES('951','2026-10-02','Transferencia',1000,'S000','S001',?,'Forma CAT013','',0,1,?,?)",
    [ref, time, time],
  );
  expect(() =>
    db.run(
      "INSERT INTO movimiento_compartido(movimiento,referencia,participante,evidencia,procedencia,revision_movimiento,revision,creado,actualizado) VALUES('951',?,?,'Evidencia ficticia 2026','Documento bancario',1,1,?,?)",
      [ref, "CP999", time, time],
    ),
  ).toThrow("participant mismatch");
  db.run(
    "INSERT INTO movimiento_compartido(movimiento,referencia,participante,evidencia,procedencia,revision_movimiento,revision,creado,actualizado) VALUES('951',?,?,'Evidencia ficticia 2026','Documento bancario',1,1,?,?)",
    [ref, bea.id, time, time],
  );
  expect(
    db.query("SELECT COUNT(*) n FROM movimiento_compartido").get(),
  ).toEqual({ n: 1 });
  expect(() =>
    db.run(
      "INSERT INTO movimiento_compartido(movimiento,referencia,participante,evidencia,procedencia,revision_movimiento,revision,creado,actualizado) VALUES('951',?,?,'Otra evidencia ficticia','Documento bancario',1,2,?,?)",
      [ref, bea.id, time, time],
    ),
  ).toThrow();
  db.close();
});

test("T-D5 migration v16 → v18 preserves Movements, audits, Revision Comida and relation; unknown v19 is rejected", () => {
  const db = new Database(":memory:");
  prepareV16(db);
  const time = new Date(now).toISOString();
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,concepto,nota,anulado,revision,creado,actualizado) VALUES('1','2026-10-01','Ingreso',1000,'S000','S001','Bonus','Ingreso previo','',0,1,?,?)",
    [time, time],
  );
  db.run(
    "INSERT INTO movement_audit VALUES('1',1,'alta',NULL,?,'usuario-unico',NULL,?)",
    [time, JSON.stringify({ id: "1", importe: "10.00" })],
  );
  db.run(
    "INSERT INTO revision_comida(id,tipo,fecha,concepto,importe,direccion,es_devolucion,clasificacion,estado_vinculo,estado_registro,estado_trazabilidad,revision,creado,actualizado) VALUES('RC1','Detalle','2026-10-02','Comida previa',1000,'Salida',0,'Comida','Sin vínculo','Vigente','Sin asignación',1,?,?)",
    [time, time],
  );
  const movements = db.query("SELECT * FROM movimientos ORDER BY id").all(),
    audits = db.query("SELECT * FROM movement_audit ORDER BY id,revision").all(),
    meals = db.query("SELECT * FROM revision_comida ORDER BY id").all();
  prepareSchema(db, { origin: "demo", key_hash: null });
  expect(db.query("SELECT version FROM schema_version").get()).toEqual({ version: 18 });
  expect(db.query("SELECT * FROM movimientos ORDER BY id").all()).toEqual(movements);
  expect(db.query("SELECT * FROM movement_audit ORDER BY id,revision").all()).toEqual(
    audits,
  );
  expect(db.query("SELECT * FROM revision_comida ORDER BY id").all()).toEqual(meals);
  expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
  expect(
    db.query("SELECT name FROM sqlite_master WHERE name='movimiento_compartido'").get(),
  ).toEqual({ name: "movimiento_compartido" });
  const sql = (
    db.query("SELECT sql FROM sqlite_master WHERE name='movimientos'").get() as {
      sql: string;
    }
  ).sql;
  expect(sql).toContain("tipo='Transferencia' AND destino!='S000'");
  expect(sql).not.toContain("origen!='S000' AND destino!='S000'");
  db.close();

  const dir = mkdtempSync(join(tmpdir(), "mf-d5-v18-")),
    path = join(dir, "demo.sqlite");
  const variant = new Database(path);
  prepareV16(variant);
  variant.run("UPDATE schema_version SET version=19");
  variant.close();
  const before = readFileSync(path);
  expect(() =>
    prepareSchema(new Database(path), { origin: "demo", key_hash: null }),
  ).toThrow("no se modificará");
  expect(readFileSync(path).equals(before)).toBe(true);
  const reopened = new Database(path);
  expect(reopened.query("SELECT version FROM schema_version").get()).toEqual({
    version: 19,
  });
  reopened.close();
  rmSync(dir, { recursive: true, force: true });
});
