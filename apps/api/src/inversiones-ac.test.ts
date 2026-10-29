import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { Auth, provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createInstrumento, updateInstrumento } from "./instrumentos";
import {
  annulPurchase,
  createPurchase,
  getPurchase,
  rectifyPurchase,
} from "./compras";
import { cashAt, cashDto, cents, spanishToday } from "./investment-engine";
import { getSaldo, updateSaldo, createSaldo } from "./saldos";
import { createClassification } from "./clasificacion";
import {
  previewMovement,
  writeMovement,
} from "./movimientos";
import { cycleContext } from "./ciclos";
import { financeRevision } from "./movement-ledger";
import { Problem } from "./problem";

const now = Date.parse("2026-10-26T12:00:00Z");
const origin = "http://127.0.0.1:5173";

function base(opening = "1000.00") {
  const db = openDatabase(":memory:");
  updateSaldo(db, "S003", {
    revision: getSaldo(db, "S003").revision,
    saldoApertura: opening,
    fechaApertura: "2026-01-01",
    permiteSalidaExterior: true,
  });
  const instrumento = createInstrumento(
    db,
    {
      nombre: "Fondo AC",
      isin: "ES0000000001",
      isinEvidencia: "Evidencia ficticia AC",
      divisaReferencia: "EUR",
    },
    randomUUID(),
    now,
  ).instrumento;
  return { db, instrumento };
}
function buy(
  db: Database,
  instrumento: string,
  over: Record<string, unknown> = {},
  at = now,
) {
  return createPurchase(
    db,
    {
      fecha: "2026-02-10",
      instrumento,
      saldoEfectivo: "S003",
      saldoInversion: "S004",
      cantidad: "1",
      precio: "100.00",
      divisa: "EUR",
      cambio: null,
      importeEur: "100.00",
      comisionEur: null,
      concepto: "Compra AC",
      nota: null,
      ...over,
    },
    randomUUID(),
    at,
  );
}
function fails(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    return error as Problem;
  }
  throw new Error("Se esperaba un error.");
}
function writeFromPreview(
  db: Database,
  body: Record<string, unknown>,
  key = randomUUID(),
) {
  const preview = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    {
      ...body,
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
    },
    key,
    null,
    false,
    now,
  );
}
const gasto = (partida: string, saldo = "S003") => ({
  fecha: "2026-04-01",
  tipo: "Gasto" as const,
  importe: "10.00",
  saldo,
  partida,
  concepto: "Gasto ficticio",
  nota: "",
});
const income = (saldo = "S003") => ({
  fecha: "2026-04-01",
  tipo: "Ingreso" as const,
  importe: "10.00",
  saldo,
  subtipo: "Nómina",
  concepto: "Ingreso ficticio",
  nota: "",
});
function master(db: Database) {
  const category = createClassification(
    db,
    "categorias",
    {
      nombre: "Categoría AC",
      anual: "Gasto",
      mensual: "Gasto",
      referencia: false,
    },
    randomUUID(),
    now,
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub AC", padre: category.id },
    randomUUID(),
    now,
  );
  const partida = createClassification(
    db,
    "partidas",
    { nombre: "Partida AC", padre: sub.id },
    randomUUID(),
    now,
  );
  return { category, sub, partida: partida.id };
}

test("E4.1-AC-06/12/24/38/54: ISIN con Compras, comisión, referencia temporal y corte histórico", () => {
  const { db, instrumento } = base("1000.00");
  try {
    const purchase = buy(db, instrumento.id, {
      comisionEur: "5.00",
      importeEur: "100.00",
    });
    const edited = updateInstrumentoDirect(db, instrumento.id, {
      revision: 1,
      motivo: "Cambio de ISIN ficticio",
      isin: "ES0000000099",
      isinEvidencia: "Evidencia ficticia nueva",
    });
    expect(edited.isin).toBe("ES0000000099");
    expect(
      getPurchase(db, purchase.compra.id).compra,
    ).toMatchObject({
      divisa: "EUR",
      importeEur: "100.00",
      comisionEur: "5.00",
    });
    expect(cashAt(db, "S003").disponible).toBe(90000n);

    const tooMuch = fails(() => buy(db, instrumento.id, {
      fecha: "2026-03-01",
      importeEur: "50.00",
      comisionEur: "50.01",
    }));
    expect(tooMuch.status).toBe(422);
    expect(tooMuch.fields.comisionEur).toContain("superar");
    expect(fails(() => buy(db, instrumento.id, {
      fecha: "2026-03-01",
      importeEur: "50.00",
      comisionEur: "-1.00",
    })).status).toBe(422);
    expect(cashAt(db, "S003").disponible).toBe(90000n);

    const long = "x".repeat(2000);
    const withLong = buy(db, instrumento.id, {
      fecha: "2026-03-02",
      importeEur: "1.00",
      cantidad: "1",
      precio: "1.00",
      concepto: long,
      nota: long,
    });
    expect(withLong.compra.concepto).toBe(long);
    expect(withLong.compra.nota).toBe(long);
    expect(fails(() => buy(db, instrumento.id, {
      fecha: "2026-03-03",
      importeEur: "1.00",
      cantidad: "1",
      precio: "1.00",
      concepto: long + "x",
    })).fields.concepto).toBeDefined();

    // AC-38: a cutoff excludes later purchases.
    buy(db, instrumento.id, {
      fecha: "2026-03-10",
      importeEur: "200.00",
      cantidad: "1",
      precio: "200.00",
    });
    expect(cashDto(db, "S003", "2026-02-10").efectivo).toMatchObject({
      vista: "corte",
      compras: "100.00",
      disponible: "900.00",
    });
    expect(cashDto(db, "S003", null).efectivo.disponible).toBe("699.00");

    // AC-24: purchases never enter the shared temporal reference.
    expect(cycleContext(db).referencia.fecha).toBeNull();
    const reference = master(db);
    writeFromPreview(db, gasto(reference.partida));
    expect(cycleContext(db).referencia.fecha).toBe("2026-04-01");
    buy(db, instrumento.id, {
      fecha: "2026-09-30",
      importeEur: "1.00",
      cantidad: "1",
      precio: "1.00",
    });
    expect(cycleContext(db).referencia.fecha).toBe("2026-04-01");
    annulPurchase(db, purchase.compra.id, { revision: 1, motivo: "Anulación AC" }, now);
    expect(cycleContext(db).referencia.fecha).toBe("2026-04-01");
  } finally {
    db.close();
  }
});

function updateInstrumentoDirect(
  db: Database,
  id: string,
  body: Record<string, unknown>,
) {
  return updateInstrumento(db, id, body, now);
}

test("E4.1-AC-40/42/46: S004 pendiente, guard de cinco campos y rectificación retroactiva", () => {
  const { db, instrumento } = base("1000.00");
  try {
    expect(fails(() => cashDto(db, "S004", null)).status).toBe(422);
    const transfer = previewMovement(
      db,
      {
        fecha: "2026-03-01",
        tipo: "Transferencia",
        importe: "10.00",
        origen: "S001",
        destino: "S004",
        concepto: "Transferencia a cartera",
        nota: "",
      },
      null,
      false,
      now,
    );
    const s004 = transfer.impacto.saldos.find((row: any) => row.id === "S004");
    expect(s004).toMatchObject({ antes: null, despues: null });
    expect(s004!.motivo).toContain("E4.3");

    const first = buy(db, instrumento.id, {
      fecha: "2026-02-10",
      importeEur: "100.00",
    });
    const second = buy(db, instrumento.id, {
      fecha: "2026-03-01",
      importeEur: "500.00",
      cantidad: "1",
      precio: "500.00",
    });
    expect(cashAt(db, "S003").disponible).toBe(40000n);
    const initialRevision = getSaldo(db, "S003").revision;

    for (const change of [
      { tipo: "Inversión" },
      { control: "Movimientos" },
      { saldoApertura: "999.00" },
      { fechaApertura: "2026-01-02" },
      { permiteSalidaExterior: false },
    ]) {
      const error = fails(() =>
        updateSaldo(db, "S003", {
          revision: getSaldo(db, "S003").revision,
          ...change,
        }),
      );
      expect(error.status).toBe(409);
      expect(error.code).toBe("HISTORY_LOCKED");
      expect(getSaldo(db, "S003").revision).toBe(initialRevision);
    }
    expect(
      updateSaldo(db, "S003", {
        revision: initialRevision,
        nombre: "Efectivo de inversión demo renombrado",
      }).nombre,
    ).toContain("renombrado");

    const up = fails(() =>
      rectifyPurchase(
        db,
        first.compra.id,
        {
          revision: 1,
          motivo: "Al alza ficticia",
          fecha: "2026-02-10",
          cantidad: "1",
          precio: "600.00",
          divisa: "EUR",
          cambio: null,
          importeEur: "600.00",
          comisionEur: null,
          concepto: "Compra AC",
          nota: null,
        },
        now,
      ),
    );
    expect(up.code).toBe("INSUFFICIENT_CASH");
    expect(up.details).toMatchObject({
      fecha: "2026-03-01",
      disponible: "500.00",
      necesario: "600.00",
      minimo: "-100.00",
    });
    expect(getPurchase(db, first.compra.id).compra.revision).toBe(1);

    const moved = fails(() =>
      rectifyPurchase(
        db,
        second.compra.id,
        {
          revision: 1,
          motivo: "Fecha atrás ficticia",
          fecha: "2026-02-10",
          cantidad: "1",
          precio: "950.00",
          divisa: "EUR",
          cambio: null,
          importeEur: "950.00",
          comisionEur: null,
          concepto: "Compra AC",
          nota: null,
        },
        now,
      ),
    );
    expect(moved.code).toBe("INSUFFICIENT_CASH");
    expect(moved.details.fecha).toBe("2026-02-10");

    // Same-day facts are order-independent in both capture orders.
    const results = [0, 1].map((order) => {
      const fixture = base("1000.00");
      try {
        const firstSame = () =>
          buy(fixture.db, fixture.instrumento.id, {
            fecha: "2026-02-10",
            importeEur: "900.00",
            cantidad: "1",
            precio: "900.00",
          });
        const otherSame = () =>
          buy(fixture.db, fixture.instrumento.id, {
            fecha: "2026-02-10",
            importeEur: "100.00",
            cantidad: "1",
            precio: "100.00",
          });
        const a = order === 0 ? firstSame() : (otherSame(), firstSame());
        if (order === 0) otherSame();
        return fails(() =>
          rectifyPurchase(
            fixture.db,
            a.compra.id,
            {
              revision: 1,
              motivo: "Mismo día",
              fecha: "2026-02-10",
              cantidad: "1",
              precio: "950.00",
              divisa: "EUR",
              cambio: null,
              importeEur: "950.00",
              comisionEur: null,
              concepto: "Compra AC",
              nota: null,
            },
            now,
          ),
        ).details;
      } finally {
        fixture.db.close();
      }
    });
    expect(results[0]).toEqual(results[1]);
    expect(results[0]).toMatchObject({ fecha: "2026-02-10", minimo: "-50.00" });
  } finally {
    db.close();
  }
});

test("E4.1-AC-53: una Compra en S003 invalida también una previsualización ajena de S001", () => {
  const { db, instrumento } = base("1000.00");
  try {
    updateSaldo(db, "S001", {
      revision: getSaldo(db, "S001").revision,
      permiteSalidaExterior: true,
    });
    const common = master(db);
    const preview = previewMovement(db, gasto(common.partida, "S001"), null, false, now);
    const cashS001 = getSaldo(db, "S001").posicion.importe;
    buy(db, instrumento.id, { importeEur: "10.00" });
    const stale = fails(() =>
      writeMovement(
        db,
        {
          ...gasto(common.partida, "S001"),
          fingerprint: preview.fingerprint,
          contextRevision: preview.contextRevision,
        },
        randomUUID(),
        null,
        false,
        now,
      ),
    );
    expect(stale.code).toBe("IMPACT_CHANGED");
    expect(getSaldo(db, "S001").posicion.importe).toBe(cashS001);
    const fresh = previewMovement(db, gasto(common.partida, "S001"), null, false, now);
    expect(
      writeMovement(
        db,
        {
          ...gasto(common.partida, "S001"),
          fingerprint: fresh.fingerprint,
          contextRevision: fresh.contextRevision,
        },
        randomUUID(),
        null,
        false,
        now,
      ).movimiento.estado,
    ).toBe("Vigente");
  } finally {
    db.close();
  }
});

test("E4.1-AC-19/20: concurrencia real en dos procesos para alta y revisión", async () => {
  const dir = mkdtempSync(join(tmpdir(), "e41-race-"));
  try {
    const path = join(dir, "race.sqlite"),
      setup = openDatabase(path);
    updateSaldo(setup, "S003", {
      revision: getSaldo(setup, "S003").revision,
      saldoApertura: "1000.00",
      fechaApertura: "2026-01-01",
    });
    const instrumento = createInstrumento(
      setup,
      { nombre: "Fondo carrera" },
      randomUUID(),
      now,
    ).instrumento;
    const operation = buy(setup, instrumento.id, {
      importeEur: "100.00",
    }).compra.id;
    setup.close();
    const worker = join(import.meta.dir, "../test-support/inversion-race-worker.ts");
    const runWorker = (args: string[]) =>
      Bun.spawn([process.execPath, worker, ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });
    const [a, b] = [runWorker([path, "create", instrumento.id, "", "600.00", "1", randomUUID()]),
      runWorker([path, "create", instrumento.id, "", "600.00", "1", randomUUID()])];
    const [outA, outB] = await Promise.all([
      new Response(a.stdout).text(),
      new Response(b.stdout).text(),
    ]);
    const results = [JSON.parse(outA.trim()), JSON.parse(outB.trim())];
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(
      results.find((result) => !result.ok),
    ).toMatchObject({ code: "INSUFFICIENT_CASH", status: 422 });
    const check = openDatabase(path);
    try {
      expect(
        check.query("SELECT COUNT(*) n FROM operaciones_inversion").get(),
      ).toEqual({ n: 2 });
      expect(cashAt(check, "S003").disponible).toBe(30000n);
    } finally {
      check.close();
    }

    const [c, d] = [runWorker([path, "rectify", instrumento.id, operation, "200.00", "1", randomUUID()]),
      runWorker([path, "rectify", instrumento.id, operation, "300.00", "1", randomUUID()])];
    const [outC, outD] = await Promise.all([
      new Response(c.stdout).text(),
      new Response(d.stdout).text(),
    ]);
    const revisions = [JSON.parse(outC.trim()), JSON.parse(outD.trim())];
    expect(revisions.filter((result) => result.ok)).toHaveLength(1);
    expect(
      revisions.find((result) => !result.ok),
    ).toMatchObject({ code: "REVISION_CONFLICT", status: 409 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

async function httpFixture() {
  const db = openDatabase(":memory:"),
    key = randomBytes(32),
    password = "Ficticia " + randomUUID(),
    handler = HttpApp.toWebHandler(createApp(db, { key, now: () => now }));
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
        .filter((value) => value && !value.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = await response.json();
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data };
  }
  const bootstrap = provision(db, now);
  const enrolled = await request("/api/auth/enroll", "POST", {
    token: bootstrap,
    password,
  });
  await request("/api/auth/mfa", "POST", {
    code: totp(enrolled.data.secret).generate({ timestamp: now }),
  });
  return { db, request, csrf: () => csrf };
}

test("E4.1-AC-29/52: rutas HTTP reales sin escritura, CSRF aislado y error saneado", async () => {
  const f = await httpFixture();
  try {
    updateSaldo(f.db, "S003", {
      revision: getSaldo(f.db, "S003").revision,
      saldoApertura: "1000.00",
      fechaApertura: "2026-01-01",
    });
    const instrumento = createInstrumento(
      f.db,
      { nombre: "Fondo HTTP", isin: "ES0000000033", isinEvidencia: "Evidencia HTTP" },
      randomUUID(),
      now,
    ).instrumento;
    const compra = buy(f.db, instrumento.id, { importeEur: "100.00" });
    const tables = [
      "instrumentos",
      "operaciones_inversion",
      "instrumento_audit",
      "operacion_inversion_audit",
      "instrumento_attempts",
      "operacion_attempts",
      "counters",
    ];
    const snap = () =>
      JSON.stringify(
        tables.map((table) => [
          table,
          f.db.query(`SELECT * FROM ${table} ORDER BY 1`).all(),
        ]),
      );
    const before = snap();
    expect((await f.request("/api/instrumentos?page=1")).status).toBe(200);
    expect((await f.request("/api/instrumentos/opciones")).status).toBe(200);
    expect((await f.request(`/api/instrumentos/${instrumento.id}`)).status).toBe(200);
    expect((await f.request(`/api/instrumentos/${instrumento.id}/auditoria`)).status).toBe(200);
    expect((await f.request("/api/compras?estado=")).status).toBe(200);
    expect((await f.request(`/api/compras/${compra.compra.id}`)).status).toBe(200);
    expect((await f.request(`/api/compras/${compra.compra.id}/auditoria`)).status).toBe(200);
    expect((await f.request("/api/inversiones/efectivo?saldo=S003")).status).toBe(200);
    expect(
      (
        await f.request("/api/compras/impacto", "POST", {
          fecha: "2026-05-01",
          instrumento: instrumento.id,
          saldoEfectivo: "S003",
          saldoInversion: "S004",
          cantidad: "1",
          precio: "1.00",
          divisa: "EUR",
          cambio: null,
          importeEur: "1.00",
          comisionEur: null,
          concepto: null,
          nota: null,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await f.request(`/api/compras/${compra.compra.id}/impacto`, "POST", {
          revision: 1,
          motivo: "Impacto HTTP",
          fecha: compra.compra.fecha,
          cantidad: "1",
          precio: "100.00",
          divisa: "EUR",
          cambio: null,
          importeEur: "90.00",
          comisionEur: null,
          concepto: null,
          nota: null,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await f.request(`/api/compras/${compra.compra.id}/impacto-anulacion`, "POST", {
          revision: 1,
        })
      ).status,
    ).toBe(200);
    expect(snap()).toBe(before);

    const validCsrf = f.csrf();
    const wrongCsrf = await f.request(
      `/api/instrumentos`,
      "POST",
      { nombre: "CSRF incorrecto" },
      { "x-csrf-token": "token-invalido" },
    );
    expect(wrongCsrf.status).toBe(403);
    expect(wrongCsrf.data.code).toBe("CSRF");
    expect(f.csrf()).toBe(validCsrf);

    f.db.exec("ALTER TABLE instrumentos RENAME TO instrumentos_broken");
    const internal = await f.request("/api/instrumentos");
    expect(internal.status).toBe(500);
    expect(internal.data.code).toBe("INTERNAL");
    const serialized = JSON.stringify(internal.data);
    expect(serialized).not.toContain("SELECT");
    expect(serialized).not.toContain("instrumentos_broken");
  } finally {
    f.db.close();
  }
});

test("E4.1-AC-33: la migración es aditiva y no contiene DROP/ALTER destructivo", () => {
  const source = readFileSync(
    join(import.meta.dir, "instrumento-schema.ts"),
    "utf8",
  );
  expect(source).not.toMatch(/DROP\s+(TABLE|INDEX|TRIGGER)/i);
  expect(source).not.toMatch(/ALTER\s+TABLE/i);
});

test("E4.1-financeRevision: los importes >2^53 cambian la huella al céntimo", () => {
  const { db, instrumento } = base("0.00");
  try {
    const insert = db.query(
      `INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,concepto,nota,estado,revision,creado,actualizado)
       VALUES(?, 'Compra','2026-02-10',?,'S003','S004',100000000,1000000,'EUR',NULL,?,NULL,NULL,NULL,'Vigente',1,'x','x')`,
    );
    insert.run("9001", instrumento.id, "9007199254740993");
    const first = financeRevision(db);
    insert.run("9002", instrumento.id, "9007199254740992");
    const second = financeRevision(db);
    expect(second).not.toBe(first);
    expect(
      db
        .query("SELECT CAST(importe_eur AS TEXT) importe FROM operaciones_inversion WHERE id='9001'")
        .get(),
    ).toEqual({ importe: "9007199254740993" });
  } finally {
    db.close();
  }
});
