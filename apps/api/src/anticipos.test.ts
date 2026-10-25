import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { prepareSchema } from "./database-schema";
import {
  createAnticipo,
  getAnticipo,
  listAnticipos,
  previewOpening,
  confirmOpening,
  previewAccreditation,
  confirmAccreditation,
} from "./anticipos";
import { previewMovement, writeMovement, getMovement } from "./movimientos";
import { createReference, updateReference } from "./referencias";
import { createCycle, cycleContext } from "./ciclos";
const now = Date.parse("2026-10-25T12:00:00Z");
const setup = () => {
  const db = new Database(":memory:");
  prepareSchema(db, { origin: "demo", key_hash: null });
  return db;
};
const create = (db: Database, name = "Anticipo ficticio") =>
  createAnticipo(db, { nombre: name }, crypto.randomUUID(), now).referencia.id;
function transfer(
  db: Database,
  ref: string,
  role = "Adelanto",
  amount = "1000",
  from = "S001",
  to = "S002",
  date = "2026-02-03",
) {
  const a =
    role === "Devolución"
      ? { origen: to, destino: from }
      : { origen: from, destino: to };
  const body = {
    tipo: "Transferencia",
    fecha: date,
    importe: amount,
    origen: from,
    destino: to,
    referencia: ref,
    anticipo: {
      rol: role,
      ...a,
      evidencia: "declaración-ficticia",
      procedencia: "registro explícito",
    },
  };
  const p = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    {
      ...body,
      fingerprint: p.fingerprint,
      contextRevision: p.contextRevision,
      aceptarCoincidencia: true,
    },
    crypto.randomUUID(),
    null,
    false,
    now,
  );
}
function cycle(db: Database) {
  return createCycle(
    db,
    {
      inicio: "2026-06-20",
      saldoInicialComida: "0",
      contextRevision: cycleContext(db).revision,
    },
    crypto.randomUUID(),
    now,
  ).ciclo;
}
function photo(db: Database, ref: string, amount = "1000") {
  const c = cycle(db);
  const body = {
    ciclo: c.id,
    importe: amount,
    evidencia: "estado-al-abrir-2026-06-20",
    procedencia: "archivo-ficticio",
    coberturaVerificada: true,
  };
  const p = previewOpening(db, ref, body);
  return { body, p, c };
}
test("AC01–04/13 atomic ficha1:1 every reference route, rollback, retries and catalog state", () => {
  const db = setup(),
    key = crypto.randomUUID();
  const b = {
    nombre: "Histórico ficticio",
    apertura: "2025-01-01",
    evidencia: "documento-ficticio",
  };
  const r = createAnticipo(db, b, key, now);
  expect(createAnticipo(db, b, key, now).referencia.id).toBe(r.referencia.id);
  expect(r.fechaApertura).toMatchObject({
    fecha: "2025-01-01",
    tipo: "Manual",
  });
  expect(() =>
    createAnticipo(
      db,
      { nombre: "Sin evidencia", apertura: "2025-01-01" },
      crypto.randomUUID(),
      now,
    ),
  ).toThrow();
  const direct = createReference(
    db,
    { nombre: "Directa", tipo: "Anticipo" },
    crypto.randomUUID(),
    now,
  );
  expect(getAnticipo(db, direct.id).estado).toBe("Sin operaciones");
  expect(() =>
    updateReference(db, direct.id, { tipo: "Viaje", revision: 1 }, now),
  ).toThrow();
  transfer(db, r.referencia.id);
  updateReference(
    db,
    r.referencia.id,
    { estado: "Inactiva", revision: 1 },
    now,
  );
  expect(getAnticipo(db, r.referencia.id).adelantado).toBe("1000.00");
  updateReference(db, r.referencia.id, { estado: "Activa", revision: 2 }, now);
  expect(getAnticipo(db, r.referencia.id).operaciones).toHaveLength(1);
  const before = listAnticipos(db).total;
  db.exec(
    "CREATE TRIGGER fail_ficha BEFORE INSERT ON fichas_anticipos BEGIN SELECT RAISE(ABORT,'injected'); END",
  );
  expect(() => create(db)).toThrow();
  expect(listAnticipos(db).total).toBe(before);
  expect(db.query("SELECT count(*) n FROM referencias").get()).toEqual({
    n: before,
  });
  db.close();
});
test("AC05–08/16/22/27–29/38 single exact motor, pairs, excess and no artificial closure", () => {
  const db = setup(),
    ref = create(db);
  expect(getAnticipo(db, ref).estado).toBe("Sin operaciones");
  expect(getAnticipo(db, ref).primerAdelanto).toBeNull();
  transfer(db, ref);
  transfer(db, ref, "Adelanto", "500");
  transfer(db, ref, "Devolución", "500", "S002", "S001", "2026-03-15");
  expect(getAnticipo(db, ref)).toMatchObject({
    adelantado: "1500.00",
    recuperado: "500.00",
    neto: "1000.00",
    exceso: "0.00",
    estado: "Recuperación parcial",
    primerAdelanto: "2026-02-03",
    ultimaActividad: "2026-03-15",
    cobertura: "Verificada",
  });
  transfer(db, ref, "Devolución", "1000", "S002", "S001", "2026-04-15");
  expect(getAnticipo(db, ref).estado).toBe("Recuperado");
  transfer(db, ref, "Devolución", "300", "S002", "S001", "2026-04-16");
  expect(getAnticipo(db, ref)).toMatchObject({
    estado: "Excedido",
    exceso: "300.00",
    neto: "-300.00",
  });
  transfer(db, ref, "Adelanto", "0.01", "S001", "S003");
  expect(getAnticipo(db, ref).pares).toHaveLength(2);
  expect(getAnticipo(db, ref).neto).toBe("-299.99");
  expect(db.query("SELECT count(*) n FROM movimientos").get()).toEqual({
    n: 6,
  });
  db.close();
});
test("AC09/10/12/37 common service rejects missing role, wrong direction and invalid pair atomically", () => {
  const db = setup(),
    ref = create(db),
    other = create(db, "Otro caso");
  transfer(db, ref);
  const body = {
    tipo: "Transferencia",
    fecha: "2026-03-01",
    importe: "500",
    origen: "S002",
    destino: "S001",
    referencia: ref,
  };
  for (const anticipo of [
    undefined,
    {
      rol: "Devolución",
      origen: "S002",
      destino: "S001",
      evidencia: "x",
      procedencia: "x",
    },
    {
      rol: "Devolución",
      origen: "S001",
      destino: "S003",
      evidencia: "x",
      procedencia: "x",
    },
  ]) {
    expect(() =>
      previewMovement(db, { ...body, anticipo }, null, false, now),
    ).toThrow();
    expect(() =>
      writeMovement(
        db,
        { ...body, anticipo },
        crypto.randomUUID(),
        null,
        false,
        now,
      ),
    ).toThrow();
  }
  expect(() =>
    transfer(db, other, "Devolución", "500", "S002", "S001"),
  ).toThrow();
  expect(() => transfer(db, ref, "Adelanto", "500", "S001", "S000")).toThrow();
  expect(getAnticipo(db, ref).operaciones).toHaveLength(1);
  expect(getAnticipo(db, other).neto).toBe("0.00");
  db.close();
});
test("AC23/39 failure metadata audit rolls back canonical fact and replay returns one operation", () => {
  const db = setup(),
    ref = create(db),
    body = {
      tipo: "Transferencia",
      fecha: "2026-02-03",
      importe: "10",
      origen: "S001",
      destino: "S002",
      referencia: ref,
      anticipo: {
        rol: "Adelanto",
        origen: "S001",
        destino: "S002",
        evidencia: "x",
        procedencia: "x",
      },
    };
  const p = previewMovement(db, body, null, false, now),
    b = { ...body, fingerprint: p.fingerprint },
    key = crypto.randomUUID();
  db.exec(
    "CREATE TRIGGER fail_attribution BEFORE INSERT ON anticipo_audit BEGIN SELECT RAISE(ABORT,'injected'); END",
  );
  expect(() => writeMovement(db, b, key, null, false, now)).toThrow();
  expect(getAnticipo(db, ref).operaciones).toHaveLength(0);
  expect(db.query("SELECT count(*) n FROM movimiento_anticipo").get()).toEqual({
    n: 0,
  });
  db.exec("DROP TRIGGER fail_attribution");
  const r = writeMovement(db, b, key, null, false, now);
  expect(writeMovement(db, b, key, null, false, now).movimiento.id).toBe(
    r.movimiento.id,
  );
  expect(getAnticipo(db, ref).adelantado).toBe("10.00");
  db.close();
});
function historical(
  db: Database,
  ref: string,
  id: string,
  from: string,
  to: string,
  amount = "100000",
  date = "2026-01-01",
) {
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,referencia,concepto,nota,revision,creado,actualizado) VALUES(?,?,'Transferencia',?,?,?,?,'histórico ficticio','',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
    [id, date, amount, from, to, ref],
  );
}
function accredit(db: Database, ref: string, id: string, role = "Adelanto") {
  const body = {
    revision: 1,
    atribucion: {
      rol: role,
      origen: "S001",
      destino: "S002",
      evidencia: "documento-histórico",
      procedencia: "acreditación explícita",
    },
  };
  const p = previewAccreditation(db, ref, id, body);
  return confirmAccreditation(
    db,
    ref,
    id,
    { ...body, ...p, confirmado: true },
    crypto.randomUUID(),
    now,
  );
}
test("AC20/28/40/41 historical inverse facts never infer role; accredited subtotal partial, original ledger unchanged", () => {
  const db = setup(),
    ref = create(db);
  historical(db, ref, "101", "S001", "S002");
  historical(db, ref, "102", "S002", "S001", "50000");
  const before = JSON.stringify(db.query("SELECT * FROM movimientos").all());
  expect(getAnticipo(db, ref)).toMatchObject({
    estado: "No disponible",
    neto: null,
    cobertura: "No disponible",
    pendientes: 2,
  });
  const p = previewAccreditation(db, ref, "101", {
    revision: 1,
    atribucion: {
      rol: "Adelanto",
      origen: "S001",
      destino: "S002",
      evidencia: "doc",
      procedencia: "archivo",
    },
  });
  expect(getAnticipo(db, ref).neto).toBeNull();
  expect(() =>
    confirmAccreditation(
      db,
      ref,
      "101",
      { ...p, contexto: "stale", confirmado: true },
      crypto.randomUUID(),
      now,
    ),
  ).toThrow();
  accredit(db, ref, "101");
  expect(getAnticipo(db, ref)).toMatchObject({
    estado: "Revisar",
    cobertura: "Parcial",
    neto: "1000.00",
  });
  expect(getAnticipo(db, ref).pares[0].disponible).toBe(false);
  accredit(db, ref, "102", "Devolución");
  expect(getAnticipo(db, ref)).toMatchObject({
    estado: "Recuperación parcial",
    cobertura: "Verificada",
    neto: "500.00",
  });
  expect(JSON.stringify(db.query("SELECT * FROM movimientos").all())).toBe(
    before,
  );
  db.close();
});
test("AC42 annul/rectify dependents; removing last advance blocked, alternatives never silently assigned", () => {
  const db = setup(),
    ref = create(db),
    a = transfer(db, ref).movimiento,
    b = transfer(db, ref, "Devolución", "500", "S002", "S001").movimiento;
  expect(() =>
    previewMovement(
      db,
      { revision: a.revision, motivo: "corrección" },
      a.id,
      true,
      now,
    ),
  ).toThrow("devoluciones");
  const p = previewMovement(
    db,
    { revision: b.revision, motivo: "hecho incorrecto" },
    b.id,
    true,
    now,
  );
  writeMovement(
    db,
    {
      revision: b.revision,
      motivo: "hecho incorrecto",
      fingerprint: p.fingerprint,
    },
    crypto.randomUUID(),
    b.id,
    true,
    now,
  );
  expect(getAnticipo(db, ref).recuperado).toBe("0.00");
  const p2 = previewMovement(
    db,
    { revision: a.revision, motivo: "hecho incorrecto" },
    a.id,
    true,
    now,
  );
  writeMovement(
    db,
    {
      revision: a.revision,
      motivo: "hecho incorrecto",
      fingerprint: p2.fingerprint,
    },
    crypto.randomUUID(),
    a.id,
    true,
    now,
  );
  expect(getAnticipo(db, ref).estado).toBe("Sin operaciones");
  expect(getMovement(db, a.id).movimiento.anulado).toBe(true);
  db.close();
});
test("AC14/15/19/30–36/43 explicit photo, signed zero/negative, late confirmation, GET purity, replay and protection", () => {
  const db = setup(),
    ref = create(db);
  transfer(db, ref);
  expect(getAnticipo(db, ref).fotos).toHaveLength(0);
  const { body, p, c } = photo(db, ref, "-10");
  expect(getAnticipo(db, ref).fotos).toHaveLength(0);
  expect(p.sugerencia).toBe("1000.00");
  expect(() => previewOpening(db, ref, { ...body, evidencia: "" })).toThrow();
  expect(() =>
    previewOpening(db, ref, { ...body, coberturaVerificada: false }),
  ).toThrow();
  expect(() => previewOpening(db, ref, { ...body, importe: "" })).toThrow();
  const key = crypto.randomUUID(),
    b = { ...body, ...p, confirmado: true };
  const r = confirmOpening(db, ref, b, key, now);
  expect(r.fotos[0]).toMatchObject({
    importe: "-10.00",
    inicio: c.inicio,
    confirmado: new Date(now).toISOString(),
  });
  expect(confirmOpening(db, ref, b, key, now).fotos).toHaveLength(1);
  transfer(db, ref, "Devolución", "500", "S002", "S001", "2026-07-01");
  expect(getAnticipo(db, ref).fotos[0].importe).toBe("-10.00");
  expect(() =>
    transfer(db, ref, "Adelanto", "100", "S001", "S002", "2026-01-02"),
  ).toThrow("apertura");
  const p2 = previewOpening(db, ref, {
    ...body,
    importe: "0",
    revision: 1,
    motivo: "corrección acreditada",
  });
  expect(p2.correccionBloqueada).toBe(true);
  expect(() =>
    confirmOpening(
      db,
      ref,
      {
        ...body,
        ...p2,
        confirmado: true,
        revision: 1,
        motivo: "corrección acreditada",
      },
      crypto.randomUUID(),
      now,
    ),
  ).toThrow();
  const ref2 = create(db, "Cero verificado"),
    z = previewOpening(db, ref2, { ...body, importe: "0" });
  confirmOpening(
    db,
    ref2,
    { ...body, ...z, confirmado: true },
    crypto.randomUUID(),
    now,
  );
  expect(getAnticipo(db, ref2).fotos[0].importe).toBe("0.00");
  db.close();
});
test("AC31/32 same-day without verified order has no suggestion; explicit evidence required; photo write rollback", () => {
  const db = setup(),
    ref = create(db);
  transfer(db, ref, "Adelanto", "1000", "S001", "S002", "2026-06-20");
  const { body, p } = photo(db, ref);
  expect(p.sugerencia).toBeNull();
  db.exec(
    "CREATE TRIGGER fail_photo_audit BEFORE INSERT ON anticipo_audit BEGIN SELECT RAISE(ABORT,'injected'); END",
  );
  expect(() =>
    confirmOpening(
      db,
      ref,
      { ...body, ...p, confirmado: true },
      crypto.randomUUID(),
      now,
    ),
  ).toThrow();
  expect(getAnticipo(db, ref).fotos).toHaveLength(0);
  db.close();
});

test("AC11 historical Exterior accreditation preserved without enabling new Exterior; totals and limitation", () => {
  const db = new Database(":memory:");
  const exec = db.exec.bind(db);
  db.exec = ((sql: string) =>
    exec(
      sql.replace(
        "tipo='Transferencia' AND origen!='S000' AND destino!='S000' AND",
        "tipo='Transferencia' AND",
      ),
    )) as typeof db.exec;
  prepareSchema(db, { origin: "demo", key_hash: null });
  db.exec = exec;
  const ref = create(db);
  historical(db, ref, "901", "S001", "S000");
  const m = {
    revision: 1,
    atribucion: {
      rol: "Adelanto",
      origen: "S001",
      destino: "S000",
      evidencia: "registro-exterior-ficticio",
      procedencia: "histórico acreditado",
    },
  };
  const p = previewAccreditation(db, ref, "901", m);
  confirmAccreditation(
    db,
    ref,
    "901",
    { ...m, ...p, confirmado: true },
    crypto.randomUUID(),
    now,
  );
  expect(getAnticipo(db, ref).adelantado).toBe("1000.00");
  expect(getAnticipo(db, ref).pares[0]).toMatchObject({ disponible: false });
  expect(getAnticipo(db, ref).pares[0].motivo).toContain("Exterior");
  expect(() =>
    transfer(db, ref, "Devolución", "500", "S000", "S001"),
  ).toThrow();
  db.close();
});
test("AC36 safe exceptional correction only with verifiable provider, reason/revision, immutable original audit", () => {
  const db = setup(),
    ref = create(db),
    { body, p } = photo(db, ref, "0");
  expect(p.sugerencia).toBeNull();
  confirmOpening(
    db,
    ref,
    { ...body, ...p, confirmado: true },
    crypto.randomUUID(),
    now,
  );
  const b = {
    ...body,
    importe: "-10",
    revision: 1,
    motivo: "Error documental acreditado",
  };
  expect(() => previewOpening(db, ref, { ...b, motivo: "" })).toThrow();
  const source = () => ({
    verificada: true,
    revision: "protecciones-v1",
    bloqueos: [],
    procedencia: "proveedor de test; no runtime",
  });
  const correction = previewOpening(db, ref, b, source);
  expect(correction.correccionBloqueada).toBe(false);
  const result = confirmOpening(
    db,
    ref,
    { ...b, ...correction, confirmado: true },
    crypto.randomUUID(),
    now,
    source,
  );
  expect(result.fotos).toHaveLength(1);
  expect(result.fotos[0]).toMatchObject({ importe: "-10.00", revision: 2 });
  expect(
    JSON.parse((result.auditoria[0] as { anterior: string }).anterior).importe,
  ).toBe("0.00");
  const locked = () => ({ ...source(), bloqueos: ["Cierre protegido"] });
  const p2 = previewOpening(db, ref, { ...b, revision: 2 }, locked);
  expect(p2.correccionBloqueada).toBe(true);
  expect(() =>
    confirmOpening(
      db,
      ref,
      { ...b, ...p2, confirmado: true },
      crypto.randomUUID(),
      now,
      locked,
    ),
  ).toThrow("Cierre protegido");
  db.close();
});

test("AC21/25 protected methods, CSRF/Origin, expired session and no alternate movement route", async () => {
  const { HttpApp } = await import("@effect/platform"),
    { Auth, provision, totp } = await import("./auth"),
    { createApp } = await import("./app"),
    { randomBytes } = await import("node:crypto");
  const db = setup(),
    key = randomBytes(32);
  let clock = now;
  const auth = new Auth(db, key, "http://127.0.0.1:5173", () => clock),
    handler = HttpApp.toWebHandler(createApp(db, { key, now: () => clock }));
  const ref = create(db),
    paths = [
      "/api/anticipos/fichas",
      "/api/anticipos/fichas/" + ref,
      "/api/anticipos/fichas/" + ref + "/netos-apertura",
      "/api/anticipos/fichas/" + ref + "/netos-apertura/preview",
      "/api/anticipos/fichas/" + ref + "/movimientos/1/acreditar",
      "/api/anticipos/fichas/" + ref + "/movimientos/1/acreditar/preview",
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
    "idempotency-key": crypto.randomUUID(),
  };
  for (const path of paths) {
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
  }
  expect(
    (
      await handler(
        new Request("http://127.0.0.1:5173/api/anticipos/fichas/" + ref, {
          headers,
        }),
      )
    ).status,
  ).toBe(200);
  clock += 1800001;
  expect(
    (
      await handler(
        new Request("http://127.0.0.1:5173/api/anticipos/fichas", {
          method: "POST",
          headers,
          body: JSON.stringify({ nombre: "No escribir" }),
        }),
      )
    ).status,
  ).toBe(401);
  expect(listAnticipos(db).total).toBe(1);
  db.close();
});
test("AC21/26 schema12 genuine continuity and DDL rollback preserve originals, payroll links and authentication", async () => {
  const { prepareV12 } = await import("../test-support/database-v12"),
    { anticipoSchema } = await import("./anticipo-schema");
  const db = new Database(":memory:");
  prepareV12(db);
  const r = createReference(
    db,
    { nombre: "Viaje conservado", tipo: "Viaje" },
    crypto.randomUUID(),
    now,
  );
  db.exec(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,concepto,nota,revision,creado,actualizado) VALUES('101','2026-01-01','Ingreso',100000,'S000','S001','Nómina','f','',1,'f','f'); INSERT INTO payroll VALUES('PAY001',1,'{}');INSERT INTO payroll_allocations VALUES('PAY001','101','100000',1,'doc');INSERT INTO sessions VALUES('opaque-hash','opaque-csrf',1,1)",
  );
  const before = db.query("SELECT * FROM movimientos").all(),
    refs = db.query("SELECT * FROM referencias").all();
  db.transaction(() => anticipoSchema(db)).immediate();
  expect(db.query("SELECT version FROM schema_version").get()).toEqual({
    version: 13,
  });
  expect(db.query("SELECT * FROM movimientos").all()).toEqual(before);
  expect(db.query("SELECT * FROM referencias").all()).toEqual(refs);
  expect(db.query("SELECT * FROM payroll_allocations").all()).toHaveLength(1);
  expect(db.query("SELECT * FROM sessions").all()).toHaveLength(1);
  expect(db.query("PRAGMA foreign_key_check").all()).toHaveLength(0);
  expect(() => getAnticipo(db, r.id)).toThrow();
  db.close();
  const old = new Database(":memory:");
  prepareV12(old);
  old.exec("CREATE TABLE movimiento_anticipo(existing TEXT)");
  expect(() =>
    old.transaction(() => anticipoSchema(old)).immediate(),
  ).toThrow();
  expect(old.query("SELECT version FROM schema_version").get()).toEqual({
    version: 12,
  });
  expect(old.query("SELECT * FROM referencias").all()).toHaveLength(0);
  expect(
    old
      .query("SELECT name FROM sqlite_master WHERE name='fichas_anticipos'")
      .get(),
  ).toBeNull();
  old.close();
});
test("AC23/35/39 two independent writers revalidate snapshot and retry same fact once", async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs"),
    { join } = await import("node:path"),
    { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "mf-anticipo-race-")),
    path = join(dir, "demo.sqlite"),
    db = new Database(path);
  prepareSchema(db, { origin: "demo", key_hash: null });
  try {
    const ref = create(db);
    transfer(db, ref);
    const b = {
        tipo: "Transferencia",
        fecha: "2026-03-01",
        importe: "500",
        origen: "S002",
        destino: "S001",
        referencia: ref,
        anticipo: {
          rol: "Devolución",
          origen: "S001",
          destino: "S002",
          evidencia: "ficticia",
          procedencia: "test-concurrencia",
        },
      },
      p = previewMovement(db, b, null, false, now);
    const file = join(dir, "request.json");
    writeFileSync(file, JSON.stringify({ ...b, fingerprint: p.fingerprint }), {
      mode: 0o600,
    });
    const key = crypto.randomUUID();
    const launch = () =>
      Bun.spawn(
        [
          process.execPath,
          "apps/api/test-support/anticipo-race-worker.ts",
          path,
          file,
          key,
          String(now),
        ],
        {
          env: { ...process.env, NODE_ENV: "test" },
          stdout: "pipe",
          stderr: "pipe",
        },
      );
    const children = [launch(), launch()];
    for (const c of children) {
      expect(await c.exited).toBe(0);
      expect(await new Response(c.stdout).text()).toBe("SAVED");
    }
    expect(getAnticipo(db, ref).recuperado).toBe("500.00");
    expect(getAnticipo(db, ref).operaciones).toHaveLength(2);
    const { body, p: opening } = photo(db, ref);
    const bb = { ...body, ...opening, confirmado: true };
    confirmOpening(db, ref, bb, crypto.randomUUID(), now);
    expect(() =>
      confirmOpening(db, ref, bb, crypto.randomUUID(), now),
    ).toThrow();
    expect(getAnticipo(db, ref).fotos).toHaveLength(1);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("AC22/42/43 rectification stays atomic with metadata and source amounts; snapshots protect accreditation and cycle Inicio", async () => {
  const db = setup(),
    ref = create(db),
    a = transfer(db, ref).movimiento;
  const b = {
    tipo: "Transferencia",
    fecha: "2026-02-04",
    importe: "1200",
    origen: "S001",
    destino: "S002",
    referencia: ref,
    revision: a.revision,
    motivo: "Corregir importe acreditado",
    anticipo: {
      rol: "Adelanto",
      origen: "S001",
      destino: "S002",
      evidencia: "documento corregido",
      procedencia: "revisión explícita",
    },
  };
  expect(() =>
    previewMovement(db, { ...b, anticipo: undefined }, a.id, false, now),
  ).toThrow("Declara");
  expect(() =>
    writeMovement(
      db,
      { ...b, anticipo: undefined },
      crypto.randomUUID(),
      a.id,
      false,
      now,
    ),
  ).toThrow("Declara");
  const p = previewMovement(db, b, a.id, false, now);
  const r = writeMovement(
    db,
    { ...b, fingerprint: p.fingerprint },
    crypto.randomUUID(),
    a.id,
    false,
    now,
  );
  expect(r.movimiento.revision).toBe(2);
  expect(r.movimiento.anticipo?.revision_movimiento).toBe(2);
  expect(getAnticipo(db, ref).adelantado).toBe("1200.00");
  const { body, p: opening, c } = photo(db, ref);
  confirmOpening(
    db,
    ref,
    { ...body, ...opening, confirmado: true },
    crypto.randomUUID(),
    now,
  );
  expect(() =>
    previewAccreditation(db, ref, a.id, {
      revision: 2,
      atribucion: b.anticipo,
    }),
  ).toThrow("apertura");
  const { previewCycleOperation } = await import("./ciclos");
  expect(() =>
    previewCycleOperation(db, "rectificar", c.id, {
      inicio: "2026-06-21",
      saldoInicialComida: "0",
      revision: c.revision,
      motivo: "cambio de Inicio",
      contextRevision: cycleContext(db).revision,
    }),
  ).toThrow("Inicio protegido");
  db.close();
});
test("AC21/22 ledger exact beyond2^53 and aggregateint64; metadata has no monetary duplicate", () => {
  const db = setup(),
    ref = create(db);
  transfer(db, ref, "Adelanto", "92233720368547758.07");
  transfer(db, ref, "Adelanto", "92233720368547758.07");
  expect(getAnticipo(db, ref).neto).toBe("184467440737095516.14");
  expect(
    (
      db.query("PRAGMA table_info(movimiento_anticipo)").all() as {
        name: string;
      }[]
    ).some((c) =>
      ["importe", "adelantado", "recuperado", "neto"].includes(c.name),
    ),
  ).toBe(false);
  db.close();
});

test("AC03/35/39 concurrent case creation, distinct repayments and photo confirmation are atomic across processes", async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs"),
    { join } = await import("node:path"),
    { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "mf-case-race-")),
    path = join(dir, "demo.sqlite"),
    db = new Database(path);
  prepareSchema(db, { origin: "demo", key_hash: null });
  async function race(body: unknown, mode: string, ref = "", sameKey = false) {
    const file = join(dir, "request.json");
    writeFileSync(file, JSON.stringify(body), { mode: 0o600 });
    const key = crypto.randomUUID();
    const children = [0, 1].map(() =>
      Bun.spawn(
        [
          process.execPath,
          "apps/api/test-support/anticipo-race-worker.ts",
          path,
          file,
          sameKey ? key : crypto.randomUUID(),
          String(now),
          mode,
          ref,
        ],
        {
          env: { ...process.env, NODE_ENV: "test" },
          stdout: "pipe",
          stderr: "pipe",
        },
      ),
    );
    return Promise.all(
      children.map(async (c) => {
        expect(await c.exited).toBe(0);
        return new Response(c.stdout).text();
      }),
    );
  }
  try {
    expect(
      await race({ nombre: "Caso simultáneo" }, "create", "", true),
    ).toEqual(["SAVED", "SAVED"]);
    expect(listAnticipos(db).total).toBe(1);
    const ref = listAnticipos(db).items[0].referencia.id;
    transfer(db, ref);
    const b = {
        tipo: "Transferencia",
        fecha: "2026-07-01",
        importe: "500",
        origen: "S002",
        destino: "S001",
        referencia: ref,
        anticipo: {
          rol: "Devolución",
          origen: "S001",
          destino: "S002",
          evidencia: "ficticia",
          procedencia: "dos hechos distintos",
        },
      },
      p = previewMovement(db, b, null, false, now);
    expect(
      (await race({ ...b, fingerprint: p.fingerprint }, "movement")).sort(),
    ).toEqual(["IMPACT_CHANGED", "SAVED"]);
    transfer(db, ref, "Devolución", "500", "S002", "S001", "2026-07-02");
    expect(getAnticipo(db, ref)).toMatchObject({
      estado: "Recuperado",
      recuperado: "1000.00",
    });
    const { body, p: opening } = photo(db, ref);
    expect(
      (
        await race({ ...body, ...opening, confirmado: true }, "photo", ref)
      ).sort(),
    ).toEqual(["REVISION_CONFLICT", "SAVED"]);
    expect(getAnticipo(db, ref).fotos).toHaveLength(1);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("AC09/20/21 legacy incompatible attribution is Revisar, GET stays read-only, full facts ignore pagination", () => {
  const db = setup(),
    ref = create(db),
    other = create(db, "Otro caso válido");
  const a = transfer(db, ref).movimiento;
  transfer(db, other, "Adelanto", "25");
  expect(getAnticipo(db, ref).adelantado).toBe("1000.00");
  // Represents metadata from a historical source that no longer matches its canonical fact.
  db.run(
    "UPDATE movimiento_anticipo SET origen='S002',destino='S001' WHERE movimiento=?",
    [a.id],
  );
  const before = db.query("SELECT total_changes() n").get();
  const r = getAnticipo(db, ref);
  expect(r.operaciones[0]).toMatchObject({
    estado: "Revisar",
    elegible: false,
  });
  expect(r.neto).toBeNull();
  expect(db.query("SELECT total_changes() n").get()).toEqual(before);
  for (let i = 0; i < 101; i++) create(db, "Caso ficticio " + i);
  expect(listAnticipos(db).items).toHaveLength(100);
  expect(
    listAnticipos(db, new URLSearchParams({ page: "2" })).items,
  ).toHaveLength(3);
  expect(getAnticipo(db, other).adelantado).toBe("25.00");
  db.close();
});
