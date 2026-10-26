import { openDatabaseV12 } from "../test-support/database-v12";
import { openDatabaseV8 } from "../test-support/database-v8";
import { openDatabaseV5 } from "../test-support/database-v5";
import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { HttpApp } from "@effect/platform";
import { openDatabase } from "./database";
import { openDatabase as openV1 } from "../test-support/database-v1";
import { openDatabase as openV2 } from "../test-support/database-v2";
import { openDatabase as openV3 } from "../test-support/database-v3";
import { openDatabase as openV4 } from "../test-support/database-v4";
import { createSaldo, getSaldo, updateSaldo } from "./saldos";
import {
  createReference,
  updateReference,
  getReference,
  referenceUsage,
  listReferences,
} from "./referencias";
import {
  createClassification,
  getClassification,
  previewClassification,
  updateClassification,
} from "./clasificacion";
import {
  previewMovement,
  writeMovement,
  getMovement,
  listMovements,
  spanishToday,
  movementOptions,
} from "./movimientos";
import { cycleContext, createCycle } from "./ciclos";
import { Auth, loadKey, provision, totp } from "./auth";
import { backup, restore } from "./backup";
import { createApp } from "./app";
const now = Date.parse("2026-10-21T12:00:00Z");
const ref = (db: Database, tipo = "Viaje", nombre = "Caso ficticio") =>
  createReference(db, { nombre, tipo }, randomUUID(), now);
const saldo = (
  db: Database,
  name: string,
  opening = "0",
  control = "Movimientos",
  exterior = false,
) =>
  createSaldo(
    db,
    {
      nombre: name,
      tipo: "Efectivo",
      control,
      saldoApertura: opening,
      fechaApertura: "2026-10-20",
      permiteSalidaExterior: exterior,
    },
    randomUUID(),
    now,
  );
const transfer = (
  origen: string,
  destino: string,
  over: Record<string, unknown> = {},
) => ({
  tipo: "Transferencia",
  fecha: "2026-10-12",
  importe: "30",
  origen,
  destino,
  concepto: "Aportación ficticia",
  ...over,
});
function save(
  db: Database,
  body: Record<string, unknown>,
  id: string | null = null,
  annul = false,
) {
  const p = previewMovement(db, body, id, annul, now);
  return writeMovement(
    db,
    { ...body, fingerprint: p.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    id,
    annul,
    now,
  ).movimiento;
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
  );
}
const expense = (s: string, p: string, over: Record<string, unknown> = {}) => ({
  tipo: "Gasto",
  fecha: "2026-10-13",
  importe: "12",
  saldo: s,
  partida: p,
  ...over,
});

test("05 R1 AC01–10/20/21: transferencias internas exactas, terminal, ciclos y ambos lados atómicos", () => {
  const db = openDatabase(":memory:");
  try {
    const a = saldo(db, "Banco A", "100"),
      b = saldo(db, "Banco B", "20"),
      t = saldo(db, "Terminal", "0", "Terminal", true),
      nc = saldo(db, "Sin control", "0", "No controlado");
    const tx = save(db, transfer(a.id, b.id));
    expect(tx.tipo).toBe("Transferencia");
    expect(tx.partida).toBeNull();
    expect(tx.subtipo).toBeNull();
    expect(listMovements(db).total).toBe(1);
    expect(getSaldo(db, a.id).posicion.importe).toBe("70.00");
    expect(getSaldo(db, b.id).posicion.importe).toBe("50.00");
    for (const over of [
      { destino: a.id },
      { origen: "S000" },
      { destino: "S000" },
      { partida: "PAR001" },
      { subtipo: "Bonus" },
      { saldo: a.id },
      { importe: "0" },
      { importe: "-1" },
      { importe: "1.001" },
      { importe: null },
      { fecha: "2026-10-22" },
      { fecha: "2026-02-30" },
    ])
      expect(() => save(db, transfer(a.id, b.id, over))).toThrow();
    save(db, transfer(a.id, t.id, { importe: "5" }));
    expect(getSaldo(db, a.id).posicion.importe).toBe("65.00");
    categories(db);
    const p = partida(db, "CAT001");
    save(db, expense(t.id, p.id));
    expect(getSaldo(db, a.id).posicion.importe).toBe("65.00");
    expect(getSaldo(db, t.id).posicion.importe).toBeNull();
    expect(() => save(db, expense(a.id, p.id))).toThrow("salida a Exterior");
    save(db, transfer(nc.id, b.id, { importe: "0.01" }));
    expect(getSaldo(db, nc.id).posicion.importe).toBeNull();
    const future = "2027-01-01";
    createCycle(
      db,
      {
        inicio: future,
        saldoInicialComida: "0",
        contextRevision: cycleContext(db).revision,
      },
      randomUUID(),
      now,
    );
    expect(tx.ciclo).toBeNull();
    createReference(
      db,
      { nombre: "Futuro no es hecho", tipo: "Evento" },
      randomUUID(),
      now,
    );
    const corrected = save(
      db,
      {
        ...transfer(a.id, b.id, { importe: "20", fecha: "2026-10-14" }),
        revision: tx.revision,
        motivo: "Rectificación ficticia",
      },
      tx.id,
    );
    expect(corrected.id).toBe(tx.id);
    expect(getSaldo(db, a.id).posicion.importe).toBe("75.00");
    expect(cycleContext(db).referencia.fecha).toBe("2026-10-14");
    save(
      db,
      {
        revision: corrected.revision,
        motivo: "Captura errónea sin hecho real",
      },
      tx.id,
      true,
    );
    expect(getSaldo(db, a.id).posicion.importe).toBe("95.00");
    expect(cycleContext(db).referencia.fecha).toBe("2026-10-13");
    expect(getMovement(db, tx.id).auditoria).toHaveLength(3);
    expect(() =>
      db.run("DELETE FROM movimientos WHERE id=?", [tx.id]),
    ).toThrow();
    expect(() =>
      db.run("UPDATE movimientos SET importe=1 WHERE id=?", [tx.id]),
    ).toThrow();
    expect(spanishToday(Date.parse("2026-10-20T22:30:00Z"))).toBe("2026-10-21");
    expect(spanishToday(Date.parse("2026-10-25T23:30:00Z"))).toBe("2026-10-26");
    for (const control of ["No controlado", "Terminal", "Inversiones"]) {
      const s = saldo(db, control, "0", control);
      expect(save(db, transfer(b.id, s.id)).destino.id).toBe(s.id);
      expect(getSaldo(db, s.id).posicion.importe).toBeNull();
    }
    updateSaldo(db, b.id, {
      revision: getSaldo(db, b.id).revision,
      estado: "Inactiva",
    });
    expect(() => save(db, transfer(a.id, b.id))).toThrow("Saldo no disponible");
  } finally {
    db.close();
  }
});

test("05 R2 AC11–18/24: matriz por ID, opcionales sin endurecer, usados e inactivos", () => {
  const db = openDatabase(":memory:");
  try {
    categories(db);
    const a = saldo(db, "Banco", "100", "Movimientos", true),
      travel = ref(db),
      event = ref(db, "Evento"),
      same = ref(db, "Evento");
    expect(same.nombre).toBe(travel.nombre);
    const anticipo = ref(db, "Anticipo");
    expect(
      db
        .query("SELECT referencia FROM fichas_anticipos WHERE referencia=?")
        .get(anticipo.id),
    ).toEqual({ referencia: anticipo.id });
    expect(() => ref(db, "Gasto compartido")).toThrow();
    expect(() => ref(db, "Vehículo")).toThrow();
    const ps = Object.fromEntries(
      ["CAT011", "CAT012", "CAT013", "CAT014", "CAT009"].map((c) => [
        c,
        partida(db, c),
      ]),
    );
    for (const val of [undefined, "REF999", event.id])
      expect(() =>
        save(db, expense(a.id, ps.CAT011.id, { referencia: val })),
      ).toThrow();
    const m = save(db, expense(a.id, ps.CAT011.id, { referencia: travel.id }));
    expect(m.referencia?.id).toBe(travel.id);
    for (const c of ["CAT014", "CAT009"]) {
      expect(save(db, expense(a.id, ps[c].id)).referencia).toBeNull();
      expect(
        save(db, expense(a.id, ps[c].id, { referencia: travel.id })).referencia
          ?.id,
      ).toBe(travel.id);
      expect(() =>
        save(db, expense(a.id, ps[c].id, { referencia: "REF999" })),
      ).toThrow("no existe");
    }
    expect(() =>
      save(db, expense(a.id, ps.CAT012.id, { referencia: travel.id })),
    ).toThrow("Anticipo");
    expect(
      save(db, expense(a.id, ps.CAT012.id, { referencia: anticipo.id }))
        .referencia?.id,
    ).toBe(anticipo.id);
    for (const c of ["CAT013"])
      expect(() =>
        save(db, expense(a.id, ps[c].id, { referencia: travel.id })),
      ).toThrow("E3");
    expect(() =>
      updateReference(
        db,
        travel.id,
        { revision: travel.revision, tipo: "Evento" },
        now,
      ),
    ).toThrow("Tipo protegido");
    const renamed = updateReference(
      db,
      travel.id,
      { revision: travel.revision, nombre: "Nombre vigente ficticio" },
      now,
    );
    expect(getMovement(db, m.id).movimiento.referencia?.nombre).toBe(
      renamed.nombre,
    );
    expect(referenceUsage(db, travel.id).length).toBe(3);
    const inactive = updateReference(
      db,
      travel.id,
      { revision: renamed.revision, estado: "Inactiva" },
      now,
    );
    expect(() =>
      save(db, expense(a.id, ps.CAT011.id, { referencia: travel.id })),
    ).toThrow("activa");
    const historical = save(
      db,
      {
        ...expense(a.id, ps.CAT011.id, {
          referencia: travel.id,
          importe: "11",
        }),
        revision: m.revision,
        motivo: "Corrección sin sustituir el caso",
      },
      m.id,
    );
    expect(historical.referencia?.estado).toBe("Inactiva");
    save(
      db,
      { revision: historical.revision, motivo: "Captura equivocada" },
      m.id,
      true,
    );
    expect(() =>
      updateReference(db, travel.id, {
        revision: inactive.revision,
        tipo: "Evento",
      }),
    ).toThrow();
    expect(listReferences(db).items.map((r) => r.id)).not.toContain(travel.id);
    expect(
      listReferences(db, new URLSearchParams({ estado: "Inactiva" })).items[0]
        .id,
    ).toBe(travel.id);
    expect(() =>
      db.run("DELETE FROM referencias WHERE id=?", [event.id]),
    ).toThrow();
    expect(() =>
      db.run("UPDATE referencias SET id='REF999' WHERE id=?", [event.id]),
    ).toThrow();
    expect(() =>
      db.run("UPDATE referencias SET tipo='Evento' WHERE id=?", [travel.id]),
    ).toThrow();
    const cat = getClassification(db, "categorias", "CAT014");
    expect(() =>
      previewClassification(db, "categorias", cat.id, {
        revision: cat.revision,
        referencia: true,
      }),
    ).toThrow();
    // Compatible existing referenced facts permit the real classification correction.
    const cat9 = getClassification(db, "categorias", "CAT009");
    expect(() =>
      previewClassification(db, "categorias", cat9.id, {
        revision: cat9.revision,
        referencia: true,
      }),
    ).toThrow();
    updateReference(
      db,
      event.id,
      { revision: event.revision, tipo: "Viaje" },
      now,
    );
    expect(getReference(db, event.id).tipo).toBe("Viaje");
  } finally {
    db.close();
  }
});

test("05 R3 AC20–24: reintentos, duplicados, snapshot obsoleto y rollback de auditoría", () => {
  const db = openDatabase(":memory:");
  try {
    const a = saldo(db, "A", "100"),
      b = saldo(db, "B", "20"),
      r = ref(db),
      body = transfer(a.id, b.id, { referencia: r.id });
    const plan = previewMovement(db, body, null, false, now),
      key = randomUUID(),
      write = { ...body, fingerprint: plan.fingerprint };
    const result = writeMovement(db, write, key, null, false, now);
    expect(writeMovement(db, write, key, null, false, now)).toEqual(result);
    expect(listMovements(db).total).toBe(1);
    expect(() =>
      writeMovement(db, { ...write, importe: "31" }, key, null, false, now),
    ).toThrow("otros datos");
    const duplicate = previewMovement(db, body, null, false, now);
    expect(duplicate.duplicados).toHaveLength(1);
    expect(() =>
      writeMovement(
        db,
        { ...body, fingerprint: duplicate.fingerprint },
        randomUUID(),
        null,
        false,
        now,
      ),
    ).toThrow("coincidencias");
    expect(save(db, body).id).not.toBe(result.movimiento.id);
    const stale = previewMovement(
      db,
      transfer(a.id, b.id, { importe: "1" }),
      null,
      false,
      now,
    );
    updateReference(
      db,
      r.id,
      { revision: r.revision, nombre: "Nombre nuevo" },
      now,
    );
    expect(() =>
      writeMovement(
        db,
        {
          ...transfer(a.id, b.id, { importe: "1" }),
          fingerprint: stale.fingerprint,
        },
        randomUUID(),
        null,
        false,
        now,
      ),
    ).toThrow("contexto");
    const prior = getSaldo(db, a.id).posicion.importe,
      counter = db.query("SELECT * FROM counters").all();
    db.exec(
      "CREATE TRIGGER fail_audit BEFORE INSERT ON movement_audit BEGIN SELECT RAISE(ABORT,'forced audit failure');END",
    );
    expect(() => save(db, transfer(a.id, b.id, { importe: "2" }))).toThrow();
    expect(getSaldo(db, a.id).posicion.importe).toBe(prior);
    expect(db.query("SELECT * FROM counters").all()).toEqual(counter);
    db.exec("DROP TRIGGER fail_audit");
    const refCounter = db
      .query("SELECT next FROM counters WHERE name='referencias'")
      .get();
    db.exec(
      "CREATE TRIGGER fail_ref_audit BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'forced audit failure');END",
    );
    expect(() => ref(db)).toThrow();
    expect(
      db.query("SELECT next FROM counters WHERE name='referencias'").get(),
    ).toEqual(refCounter);
    db.exec("DROP TRIGGER fail_ref_audit");
    const old = getMovement(db, result.movimiento.id).movimiento;
    const exp = {
      tipo: "Ingreso",
      fecha: "2026-10-12",
      importe: "2",
      saldo: a.id,
      subtipo: "Bonus",
      revision: old.revision,
      motivo: "Tipo capturado incorrectamente",
      referencia: r.id,
    };
    const corrected = save(db, exp, old.id);
    expect(corrected.origen.id).toBe("S000");
    expect(corrected.referencia?.id).toBe(r.id);
    expect(
      listMovements(db, new URLSearchParams({ referencia: r.id })).total,
    ).toBe(2);
    expect(
      listMovements(
        db,
        new URLSearchParams({
          tipo: "Transferencia",
          origen: a.id,
          destino: b.id,
        }),
      ).total,
    ).toBe(1);
  } finally {
    db.close();
  }
});

function snapshot(db: Database) {
  return (
    db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[]
  ).map(
    (r) =>
      [
        r.name,
        db.query(`SELECT * FROM "${r.name}" ORDER BY rowid`).all(),
      ] as const,
  );
}
test("05 R4 AC28/29: v4 genuina conserva hechos/auditorías/acceso, restaura age v4/v5", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-e15-upgrade-")),
    path = join(dir, "demo.sqlite");
  let db = openV4(path);
  try {
    const key = loadKey(db, join(dir, "auth.key")),
      auth = new Auth(db, key),
      password = "Contraseña ficticia " + randomUUID(),
      enroll = await auth.enroll(provision(db), password),
      verified = auth.verify(
        new Request("http://127.0.0.1:5173", {
          headers: { cookie: auth.challengeName + "=" + enroll.challenge },
        }),
        totp(enroll.secret!).generate(),
      );
    const a = saldo(db, "A", "100"),
      b = saldo(db, "B", "20");
    const time = "2026-10-12T12:00:00.000Z";
    db.run(
      "INSERT INTO movimientos VALUES('1','2026-10-12','Ingreso',5000,'S000',?,'Bonus',NULL,'Ingreso histórico ficticio','',0,1,?,?)",
      [a.id, time, time],
    );
    const old = db.query("SELECT * FROM movimientos WHERE id='1'").get();
    const oldJson = JSON.stringify({ ...(old as object), importe: "50.00" });
    db.run(
      "INSERT INTO movement_audit VALUES('1',1,'alta',NULL,?,'usuario-unico',NULL,?)",
      [time, oldJson],
    );
    db.run("UPDATE counters SET next=2 WHERE name='movimientos'");
    db.run(
      "INSERT INTO movement_attempts VALUES('opaque-historical-attempt','hash-verbatim','{\"old\":true}',9999999999999)",
    );
    const identity = join(dir, "identity.txt");
    expect(
      Bun.spawnSync(["age-keygen", "-o", identity], { stderr: "pipe" })
        .exitCode,
    ).toBe(0);
    const pub = Bun.spawnSync(["age-keygen", "-y", identity], {
      stderr: "pipe",
    })
      .stdout.toString()
      .trim();
    backup(db, key, join(dir, "v4"), pub);
    const before = snapshot(db);
    db.close();
    db = openDatabase(path);
    for (const [table, rows] of before) {
      if (["schema_version", "counters", "movimientos"].includes(table))
        continue;
      expect(db.query(`SELECT * FROM "${table}" ORDER BY rowid`).all()).toEqual(
        rows,
      );
    }
    expect(db.query("SELECT * FROM movimientos WHERE id='1'").get()).toEqual({
      ...(old as object),
      referencia: null,
      capital: null,
      intereses: null,
    });
    for (const c of before.find(([n]) => n === "counters")![1] as {
      name: string;
      next: number;
    }[])
      expect(
        db.query("SELECT * FROM counters WHERE name=?").get(c.name),
      ).toEqual(c);
    expect(getMovement(db, "1").auditoria[0].posterior).toEqual(
      JSON.parse(oldJson),
    );
    expect(
      new Auth(db, readFileSync(join(dir, "auth.key"))).session(
        new Request("http://127.0.0.1:5173", {
          headers: { cookie: auth.cookieName + "=" + verified.session },
        }),
      ).csrf,
    ).toBe(verified.csrf);
    const login = await new Auth(db, key).login(password);
    expect(login.challenge).toBeString();
    expect(
      new Auth(db, key).verify(
        new Request("http://127.0.0.1:5173", {
          headers: { cookie: auth.challengeName + "=" + login.challenge },
        }),
        totp(enroll.secret!).generate({ timestamp: Date.now() + 30000 }),
      ).session,
    ).toBeString();
    const r = ref(db);
    const tx = save(db, transfer(a.id, b.id, { referencia: r.id }));
    expect(tx.id).toBe("2");
    backup(db, key, join(dir, "v5"), pub);
    for (const v of [4, 5]) {
      const restored = restore(
          join(dir, "v" + v),
          join(dir, "restored" + v),
          identity,
        ),
        copy = openDatabase(restored.database);
      try {
        expect(copy.query("SELECT * FROM sessions").all()).toEqual([]);
        expect(copy.query("SELECT * FROM reference_attempts").all()).toEqual(
          [],
        );
        expect(getMovement(copy, "1").auditoria[0].posterior).toEqual(
          JSON.parse(oldJson),
        );
        expect(getSaldo(copy, a.id).posicion.importe).toBe(
          v === 5 ? "120.00" : "150.00",
        );
        if (v === 5)
          expect(getMovement(copy, "2").movimiento.referencia?.id).toBe(r.id);
        expect(copy.query("PRAGMA foreign_key_check").all()).toEqual([]);
      } finally {
        copy.close();
      }
    }
    const after = snapshot(db);
    db.close();
    db = openDatabase(path);
    expect(snapshot(db)).toEqual(after);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("05 R5 AC28: fallo durante rebuild restaura tablas/triggers y versión; desconocida intacta", () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-e15-rollback-")),
    path = join(dir, "demo.sqlite");
  let db = openV4(path);
  try {
    db.exec("CREATE TABLE movimientos_v5(conflict TEXT) STRICT");
    const old = snapshot(db),
      schema = db.query("SELECT * FROM sqlite_master ORDER BY name").all();
    db.close();
    expect(() => openDatabase(path)).toThrow();
    db = new Database(path, { strict: true });
    expect(snapshot(db)).toEqual(old);
    expect(db.query("SELECT * FROM sqlite_master ORDER BY name").all()).toEqual(
      schema,
    );
    expect(
      db.query("SELECT name FROM sqlite_master WHERE name='referencias'").get(),
    ).toBeNull();
    db.exec("UPDATE schema_version SET version=999");
    const unknown = snapshot(db);
    db.close();
    expect(() => openDatabase(path)).toThrow("no compatible");
    db = new Database(path, { strict: true });
    expect(snapshot(db)).toEqual(unknown);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

// Test-only diagnostics. Never echo argv, payloads, raw stdout/stderr or exception messages.
function r6Technical(error: unknown) {
  const e = (error ?? {}) as {
    name?: unknown;
    code?: unknown;
    errno?: unknown;
    stack?: unknown;
    location?: unknown;
  };
  const reasons: Record<string, string> = {
    SQLITE_BUSY: "SQLite database busy",
    SQLITE_BUSY_RECOVERY: "SQLite recovery busy",
    SQLITE_BUSY_SNAPSHOT: "SQLite snapshot busy",
    SQLITE_LOCKED: "SQLite database locked",
    SQLITE_LOCKED_SHAREDCACHE: "SQLite shared cache locked",
    SQLITE_ERROR: "SQLite statement error",
    SQLITE_CONSTRAINT: "SQLite constraint failed",
    SQLITE_CONSTRAINT_FOREIGNKEY: "SQLite foreign key failed",
    SQLITE_CANTOPEN: "SQLite open failed",
    SQLITE_IOERR: "SQLite IO failed",
    SQLITE_FULL: "SQLite storage full",
    SQLITE_READONLY: "SQLite read only",
    SQLITE_NOMEM: "SQLite allocation failed",
    SQLITE_MISUSE: "SQLite API misuse",
  };
  const code =
    typeof e.code === "string" && Object.hasOwn(reasons, e.code)
      ? e.code
      : "UNCLASSIFIED";
  const site =
    /(?:^|[/\\])((?:database|movimientos|referencias|movement-ledger|movement-impact|reference-schema)\.ts:[0-9]+:[0-9]+)(?:\)|$)/m;
  const frame = typeof e.stack === "string" ? e.stack.match(site)?.[1] : null;
  const location =
    frame ??
    (typeof e.location === "string" ? e.location.match(site)?.[1] : null) ??
    null;
  return {
    name: [
      "Error",
      "SQLiteError",
      "TypeError",
      "SyntaxError",
      "RangeError",
    ].includes(e.name as string)
      ? e.name
      : "UnknownError",
    code,
    errno: Number.isSafeInteger(e.errno) ? e.errno : null,
    reason: reasons[code] ?? "Technical error; details redacted",
    location,
  };
}
function r6Child(
  imports: string,
  opening: string,
  writing: string,
  closing: string,
) {
  return `${imports}
    const r6Technical = ${r6Technical.toString()};
    let r6Phase = 'open';
    const r6Report = error => console.error(JSON.stringify({r6:1,phase:r6Phase,error:r6Technical(error)}));
    try {
      ${opening}
      r6Phase = 'write'; ${writing}
      r6Phase = 'close'; ${closing}
    } catch(error) { r6Report(error); process.exitCode = 1; }`;
}
async function runR6(code: string, operation: string) {
  const p = Bun.spawn([process.execPath, "-e", code], {
    env: { ...process.env, NODE_ENV: "test" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, rawStderr, exit] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
    p.exited,
  ]);
  // Preserve the empty/nonempty assertion without exposing raw error text in its diff.
  const errors =
    rawStderr === ""
      ? []
      : rawStderr
          .trim()
          .split("\n")
          .slice(0, 4)
          .map((line) => {
            try {
              const value = JSON.parse(line);
              if (
                value?.r6 === 1 &&
                ["open", "write", "close"].includes(value.phase)
              )
                return { phase: value.phase, error: r6Technical(value.error) };
            } catch {}
            return { phase: "unknown", error: r6Technical(null) };
          });
  const stderr = rawStderr === "" ? "" : JSON.stringify(errors);
  let output = stdout === "" ? "empty" : "invalid-json";
  try {
    JSON.parse(stdout);
    output = "json";
  } catch {}
  if (exit !== 0 || stderr !== "" || output !== "json") {
    console.error(
      "R6 child diagnostic " +
        JSON.stringify({
          operation,
          phase:
            errors.find((error) => error.phase !== "unknown")?.phase ??
            "unknown",
          pid: p.pid,
          exit,
          signal: p.signalCode ?? null,
          errors,
          stdout: { bytes: Buffer.byteLength(stdout), format: output },
        }),
    );
  }
  expect(exit).toBe(0);
  expect(stderr).toBe("");
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error("R6 child output is not JSON; content redacted.");
  }
}

test("05 R6 AC12/22/23/28: dos procesos migran v4 y reservan REF; reintento/corrección concurrentes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-e15-concurrency-")),
    path = join(dir, "demo.sqlite");
  let db = openV4(path);
  const a = saldo(db, "A", "100"),
    b = saldo(db, "B", "20");
  db.close();
  const database = resolve("apps/api/src/database.ts"),
    refs = resolve("apps/api/src/referencias.ts"),
    movements = resolve("apps/api/src/movimientos.ts");
  try {
    const create = r6Child(
      `import{openDatabase}from${JSON.stringify(database)};import{createReference}from${JSON.stringify(refs)};`,
      `const db=openDatabase(${JSON.stringify(path)});`,
      `console.log(JSON.stringify(createReference(db,{nombre:'Caso concurrente',tipo:'Viaje'},crypto.randomUUID())));`,
      "db.close();",
    );
    const results = await Promise.all([
      runR6(create, "create-reference"),
      runR6(create, "create-reference"),
    ]);
    expect(new Set(results.map((x) => x.id)).size).toBe(2);
    db = openDatabase(path);
    db.run("UPDATE counters SET next=999 WHERE name='referencias'");
    expect(ref(db).id).toBe("REF999");
    expect(ref(db).id).toBe("REF1000");
    const r = ref(db),
      body = transfer(a.id, b.id, { referencia: r.id }),
      p = previewMovement(db, body, null, false, now),
      key = randomUUID(),
      write = { ...body, fingerprint: p.fingerprint };
    db.close();
    const cmd = r6Child(
      `import{openDatabase}from${JSON.stringify(database)};import{writeMovement}from${JSON.stringify(movements)};`,
      `const db=openDatabase(${JSON.stringify(path)});`,
      `console.log(JSON.stringify(writeMovement(db,${JSON.stringify(write)},${JSON.stringify(key)},null,false,${now})));`,
      "db.close();",
    );
    const two = await Promise.all([
      runR6(cmd, "idempotent-write"),
      runR6(cmd, "idempotent-write"),
    ]);
    expect(two[0]).toEqual(two[1]);
    db = openDatabase(path);
    expect(listMovements(db).total).toBe(1);
    const id = two[0].movimiento.id,
      correction = {
        ...body,
        importe: "20",
        revision: 1,
        motivo: "Corrección concurrente",
      },
      plan = previewMovement(db, correction, id, false, now);
    db.close();
    const correctionCmd = r6Child(
      `import{openDatabase}from${JSON.stringify(database)};import{writeMovement}from${JSON.stringify(movements)};`,
      `const db=openDatabase(${JSON.stringify(path)});`,
      `try{writeMovement(db,${JSON.stringify({ ...correction, fingerprint: plan.fingerprint })},crypto.randomUUID(),${JSON.stringify(id)},false,${now});console.log('200');}catch(e){if(e?.status!==409)r6Report(e);console.log(JSON.stringify(e.status));}`,
      "db.close();",
    );
    expect(
      (
        await Promise.all([
          runR6(correctionCmd, "rectification"),
          runR6(correctionCmd, "rectification"),
        ])
      ).sort(),
    ).toEqual([200, 409]);
    db = openDatabase(path);
    expect(getMovement(db, id).auditoria).toHaveLength(2);
  } finally {
    try {
      db.close();
    } catch {}
    rmSync(dir, { recursive: true, force: true });
  }
});

test("05 R7 AC25: rutas Effect reales, MFA/CSRF/Origin, FK y no DELETE", async () => {
  const db = openDatabase(":memory:"),
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
        headers: { origin, "content-type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  try {
    const a = saldo(db, "A", "100"),
      b = saldo(db, "B", "20");
    expect((await request("/api/referencias")).status).toBe(401);
    const auth = new Auth(db, key, origin, () => now),
      enroll = await auth.enroll(
        provision(db, now),
        "Contraseña ficticia " + randomUUID(),
      ),
      v = auth.verify(
        new Request(origin, {
          headers: { cookie: auth.challengeName + "=" + enroll.challenge },
        }),
        totp(enroll.secret!).generate({ timestamp: now }),
      );
    const headers = {
      cookie: auth.cookieName + "=" + v.session,
      "x-csrf-token": v.csrf,
      "idempotency-key": randomUUID(),
    };
    expect(
      (
        await request(
          "/api/referencias",
          "POST",
          { nombre: "Caso", tipo: "Viaje" },
          { ...headers, "x-csrf-token": "" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          "/api/referencias",
          "POST",
          { nombre: "Caso", tipo: "Viaje" },
          { ...headers, origin: "https://invalid.example" },
        )
      ).status,
    ).toBe(403);
    const response = await request(
      "/api/referencias",
      "POST",
      { nombre: "Caso", tipo: "Viaje" },
      headers,
    );
    expect(response.status).toBe(201);
    const r = (await response.json()).item;
    expect(
      (await request("/api/referencias/" + r.id, "DELETE", {}, headers)).status,
    ).toBe(404);
    expect(
      (
        await request(
          "/api/referencias/" + r.id,
          "PATCH",
          { revision: r.revision, id: "REF999" },
          headers,
        )
      ).status,
    ).toBe(422);
    const body = transfer(a.id, b.id, { referencia: r.id });
    const preview = await request(
      "/api/movimientos/impacto",
      "POST",
      body,
      headers,
    );
    expect(preview.status).toBe(200);
    const p = await preview.json();
    const created = await request(
      "/api/movimientos",
      "POST",
      { ...body, fingerprint: p.fingerprint },
      { ...headers, "idempotency-key": randomUUID() },
    );
    expect(created.status).toBe(201);
    const m = (await created.json()).movimiento;
    expect(m.referencia.id).toBe(r.id);
    expect(
      (await request("/api/movimientos/" + m.id, "DELETE", {}, headers)).status,
    ).toBe(404);
    expect(
      (await request("/api/referencias/REF999", "GET", undefined, headers))
        .status,
    ).toBe(404);
  } finally {
    db.close();
  }
});

test("05 R8 AC11–19/23/24: catálogo paginado, idempotencia REF y rectificación compatible real", () => {
  const db = openDatabase(":memory:");
  try {
    const body = { nombre: "Caso sin unicidad de nombre", tipo: "Viaje" },
      key = randomUUID(),
      first = createReference(db, body, key, now);
    expect(createReference(db, body, key, now)).toEqual(first);
    expect(() =>
      createReference(db, { ...body, tipo: "Evento" }, key, now),
    ).toThrow("otros datos");
    for (let i = 0; i < 104; i++) ref(db, "Viaje", "Caso ficticio " + i);
    expect(listReferences(db).items).toHaveLength(100);
    expect(
      listReferences(db, new URLSearchParams({ page: "2" })).items,
    ).toHaveLength(5);
    expect(movementOptions(db).referencias).toHaveLength(105);
    const changed = updateReference(
      db,
      first.id,
      { revision: first.revision, nombre: "Nombre vigente" },
      now,
    );
    expect(() =>
      updateReference(
        db,
        first.id,
        { revision: first.revision, estado: "Inactiva" },
        now,
      ),
    ).toThrow("ha cambiado");
    categories(db);
    const p = partida(db, "CAT011"),
      a = saldo(db, "Cuenta", "100", "Movimientos", true);
    save(db, expense(a.id, p.id, { referencia: first.id }));
    const cat = getClassification(db, "categorias", "CAT011"),
      changes = { revision: cat.revision, anual: "No aplica" };
    const impact = previewClassification(db, "categorias", cat.id, changes);
    expect(impact).toBeDefined();
    updateClassification(db, "categorias", cat.id, changes, undefined, now, {
      fingerprint: impact.fingerprint,
      motivo: "Corrección de método anual con caso compatible",
    });
    expect(getClassification(db, "categorias", cat.id).anual).toBe("No aplica");
    expect(getReference(db, first.id).nombre).toBe(changed.nombre);
  } finally {
    db.close();
  }
});

test("05 R9 AC03/06/08/09/15: límites de ciclos/Madrid, FK y revisión de Referencias en servidor", () => {
  const db = openDatabase(":memory:");
  try {
    const a = saldo(db, "Origen", "0"),
      b = saldo(db, "Destino", "0");
    for (const inicio of ["2026-08-25", "2026-09-25"])
      createCycle(
        db,
        {
          inicio,
          saldoInicialComida: "0",
          contextRevision: cycleContext(db).revision,
        },
        randomUUID(),
        now,
      );
    const dates = ["2026-08-24", "2026-08-25", "2026-09-24", "2026-09-25"];
    const facts = dates.map((fecha) =>
      save(db, transfer(a.id, b.id, { fecha, importe: "0.01" })),
    );
    expect(facts.map((m) => m.ciclo?.mesFinanciado ?? null)).toEqual([
      null,
      "2026-09-01",
      "2026-09-01",
      "2026-10-01",
    ]);
    expect(getSaldo(db, a.id).posicion.importe).toBe("-0.04");
    expect(getSaldo(db, b.id).posicion.importe).toBe("0.04");
    const boundary = Date.parse("2026-10-20T22:30:00Z");
    expect(
      previewMovement(
        db,
        transfer(a.id, b.id, { fecha: "2026-10-21" }),
        null,
        false,
        boundary,
      ).despues?.fecha,
    ).toBe("2026-10-21");
    expect(() =>
      previewMovement(
        db,
        transfer(a.id, b.id, { fecha: "2026-10-22" }),
        null,
        false,
        boundary,
      ),
    ).toThrow("campos");
    expect(() =>
      db.run("UPDATE movimientos SET referencia='REF999' WHERE id=?", [
        facts[0].id,
      ]),
    ).toThrow();
    expect(() =>
      db.run("UPDATE movimientos SET origen='S000' WHERE id=?", [facts[0].id]),
    ).toThrow();
    expect(() => save(db, transfer(a.id, b.id, { referencia: true }))).toThrow(
      "ID registrado",
    );
    const r = ref(db),
      state = updateReference(db, r.id, {
        revision: r.revision,
        estado: "Inactiva",
      });
    expect(() => save(db, transfer(a.id, b.id, { referencia: r.id }))).toThrow(
      "activa",
    );
    updateReference(db, r.id, { revision: state.revision, estado: "Activa" });
    expect(
      save(db, transfer(a.id, b.id, { referencia: r.id })).referencia?.id,
    ).toBe(r.id);
    expect(() =>
      updateReference(db, r.id, {
        revision: getReference(db, r.id).revision,
        tipo: "Evento",
      }),
    ).toThrow("Tipo protegido");
  } finally {
    db.close();
  }
});

test("05 R10 AC29: manifiesto cifrado identifica v1–v5 y restaura cada esquema", () => {
  const dir = mkdtempSync(join(tmpdir(), "e15-manifest-"));
  try {
    const identity = join(dir, "identity.txt");
    expect(
      Bun.spawnSync(["age-keygen", "-o", identity], { stderr: "pipe" })
        .exitCode,
    ).toBe(0);
    const recipient = Bun.spawnSync(["age-keygen", "-y", identity], {
      stderr: "pipe",
    });
    expect(recipient.exitCode).toBe(0);
    for (const [version, initialize, label] of [
      [1, openV1, "e1.1-v1"],
      [2, openV2, "e1.2-v2"],
      [3, openV3, "e1.3-v3"],
      [4, openV4, "e1.4-v4"],
      [5, openDatabaseV5, "e1.5-v5"],
      [8, openDatabaseV8, "e2.2-v8"],
      [12, openDatabaseV12, "e2.5-v12"],
      [14, openDatabase, "e3.4-v14"],
    ] as const) {
      const source = initialize(join(dir, `source-${version}.sqlite`));
      const target = join(dir, `backup-${version}`);
      let saldos;
      try {
        const key = loadKey(source, join(dir, `key-${version}`));
        saldos = source.query("SELECT * FROM saldos ORDER BY id").all();
        backup(source, key, target, recipient.stdout.toString().trim());
      } finally {
        source.close();
      }
      const encrypted = join(target, "database.age");
      expect(
        readFileSync(encrypted).toString().startsWith("age-encryption.org/v1"),
      ).toBe(true);
      const decrypted = Bun.spawnSync(
        [
          process.env.AGE_BIN ?? "age",
          "--decrypt",
          "--identity",
          identity,
          encrypted,
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(decrypted.exitCode).toBe(0);
      const { manifest } = JSON.parse(decrypted.stdout.toString());
      expect(manifest.format).toBe(1);
      expect(manifest.schema).toBe(version);
      expect(manifest.app).toBe(label);
      const restored = restore(
        target,
        join(dir, `restored-${version}`),
        identity,
      );
      const copy = new Database(restored.database, {
        readonly: true,
        strict: true,
      });
      try {
        expect(copy.query("SELECT version FROM schema_version").get()).toEqual({
          version,
        });
        expect(copy.query("SELECT * FROM saldos ORDER BY id").all()).toEqual(
          saldos,
        );
        expect(copy.query("PRAGMA foreign_key_check").all()).toEqual([]);
      } finally {
        copy.close();
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Only the isolated negative subprocess registers this deliberately failing test.
const r6ProbePhase = process.env.MYFINANZAS_R6_PROBE_PHASE;
if (["open", "write", "close"].includes(r6ProbePhase ?? "")) {
  test("05 R6 diagnostic controlled failure", async () => {
    const fail = `console.log('CANARY_NOT_FOR_LOGS');console.error('CANARY_NOT_FOR_LOGS');throw Object.assign(new Error('/private/CANARY_NOT_FOR_LOGS payload must not escape'),{code:'SQLITE_BUSY',errno:5,stack:'Error: CANARY_NOT_FOR_LOGS\\n at openDatabase (/private/CANARY_NOT_FOR_LOGS/database.ts:44:7)'});`;
    await runR6(
      r6Child(
        "",
        r6ProbePhase === "open" ? fail : "",
        r6ProbePhase === "write" ? fail : "",
        r6ProbePhase === "close" ? fail : "",
      ),
      "controlled-probe",
    );
  });
}
test("05 R11: fallo instrumental conserva rechazo y diagnóstico seguro de apertura/escritura/cierre", async () => {
  expect(
    r6Technical({
      name: "CANARY_NOT_FOR_LOGS",
      code: "CANARY_NOT_FOR_LOGS",
      message: "CANARY_NOT_FOR_LOGS",
    }),
  ).toEqual({
    name: "UnknownError",
    code: "UNCLASSIFIED",
    errno: null,
    reason: "Technical error; details redacted",
    location: null,
  });
  expect(
    r6Technical({ location: "/private/CANARY_NOT_FOR_LOGS/database.ts:44:7" })
      .location,
  ).toBe("database.ts:44:7");
  expect(r6Technical({ location: "CANARY_NOT_FOR_LOGS" }).location).toBeNull();
  for (const phase of ["open", "write", "close"]) {
    const p = Bun.spawn(
      [
        process.execPath,
        "test",
        import.meta.path,
        "--test-name-pattern",
        "^05 R6 diagnostic controlled failure$",
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: "test",
          MYFINANZAS_R6_PROBE_PHASE: phase,
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [stdout, stderr, exit] = await Promise.all([
      new Response(p.stdout).text(),
      new Response(p.stderr).text(),
      p.exited,
    ]);
    const log = stdout + stderr;
    expect(exit).toBe(1);
    expect(p.signalCode ?? null).toBeNull();
    expect(log).toContain("1 fail");
    expect(log).not.toContain("CANARY_NOT_FOR_LOGS");
    expect(log).not.toContain("/private/");
    const line = log
      .split("\n")
      .find((line) => line.startsWith("R6 child diagnostic "));
    expect(line).toBeString();
    const diagnostic = JSON.parse(line!.slice("R6 child diagnostic ".length));
    expect(diagnostic.operation).toBe("controlled-probe");
    expect(diagnostic.phase).toBe(phase);
    expect(diagnostic.pid).toBeInteger();
    expect(diagnostic.pid).toBeGreaterThan(0);
    expect(diagnostic.exit).toBe(1);
    expect(diagnostic.signal).toBeNull();
    expect(diagnostic.stdout).toEqual({ bytes: 20, format: "invalid-json" });
    expect(diagnostic.errors).toContainEqual({
      phase,
      error: {
        name: "Error",
        code: "SQLITE_BUSY",
        errno: 5,
        reason: "SQLite database busy",
        location: "database.ts:44:7",
      },
    });
    expect(log.indexOf("R6 child diagnostic ")).toBeLessThan(
      log.indexOf("error: expect(received)"),
    );
  }
});
