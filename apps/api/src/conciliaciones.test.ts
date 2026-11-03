import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { openDatabase } from "./database";
import { Auth, provision, totp } from "./auth";
import { createApp } from "./app";
import { createClassification } from "./clasificacion";

const now = Date.parse("2026-10-22T12:00:00Z");

async function harness() {
  const db = openDatabase(":memory:"),
    key = randomBytes(32),
    auth = new Auth(db, key),
    enrolled = await auth.enroll(
      provision(db),
      "Contraseña ficticia " + randomUUID(),
    ),
    verified = auth.verify(
      new Request("http://127.0.0.1:5173", {
        headers: { cookie: auth.challengeName + "=" + enrolled.challenge },
      }),
      totp(enrolled.secret!).generate(),
    ),
    handler = HttpApp.toWebHandler(createApp(db, { key, now: () => now })),
    cookie = auth.cookieName + "=" + verified.session,
    request = (
      path: string,
      method = "GET",
      body?: unknown,
      headers: Record<string, string> = {},
    ) =>
      handler(
        new Request("http://127.0.0.1:3001/api" + path, {
          method,
          headers: { "content-type": "application/json", ...headers },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      ),
    write = (extra: Record<string, string> = {}) => ({
      cookie,
      origin: "http://127.0.0.1:5173",
      "x-csrf-token": verified.csrf,
      ...extra,
    }),
    createKey = (extra: Record<string, string> = {}) => ({
      ...write(extra),
      "idempotency-key": randomUUID(),
    });
  return { db, request, write, createKey };
}

type Harness = Awaited<ReturnType<typeof harness>>;

async function createDebt(h: Harness, nombre = "Deuda conciliación ficticia") {
  const response = await h.request(
    "/deudas",
    "POST",
    {
      nombre,
      inicioControl: "2026-10-01",
      capitalApertura: "1000",
      tipoDeuda: "No hipotecaria",
    },
    h.createKey(),
  );
  expect(response.status).toBe(201);
  return (await response.json()).item as { id: string; revision: number };
}

function partida(db: Database, deuda: string) {
  const category = createClassification(
      db,
      "categorias",
      {
        nombre: "Gasto conciliación ficticio",
        anual: "Gasto",
        mensual: "Gasto",
        referencia: false,
      },
      randomUUID(),
    ),
    sub = createClassification(
      db,
      "subcategorias",
      { nombre: "Sub conciliación ficticia", padre: category.id },
      randomUUID(),
    );
  return createClassification(
    db,
    "partidas",
    { nombre: "Cuota conciliación ficticia", padre: sub.id, deuda },
    randomUUID(),
  );
}

function record(
  db: Database,
  input: {
    id: string;
    fecha: string;
    tipo: "Gasto" | "Amortización deuda";
    importe: number;
    capital: number | null;
    intereses: number | null;
    partida: string;
  },
) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,referencia,concepto,nota,capital,intereses,anulado,revision,creado,actualizado)
     VALUES(?,?,?,?,?,'S000',NULL,?,NULL,'Fixture','',?,?,0,1,'2026-10-22T00:00:00Z','2026-10-22T00:00:00Z')`,
    [
      input.id,
      input.fecha,
      input.tipo,
      input.importe,
      "S001",
      input.partida,
      input.capital,
      input.intereses,
    ],
  );
}

function facts(db: Database, deuda: string) {
  const p = partida(db, deuda);
  record(db, {
    id: "9001",
    fecha: "2026-09-30",
    tipo: "Gasto",
    importe: 7000,
    capital: 5000,
    intereses: 2000,
    partida: p.id,
  });
  record(db, {
    id: "9002",
    fecha: "2026-10-01",
    tipo: "Gasto",
    importe: 10000,
    capital: 8000,
    intereses: 2000,
    partida: p.id,
  });
  record(db, {
    id: "9003",
    fecha: "2026-10-15",
    tipo: "Amortización deuda",
    importe: 20000,
    capital: 20000,
    intereses: 0,
    partida: p.id,
  });
}

test("17 E4.4 B AC-15/16/18/19/26/33: conciliación por HTTP, idempotencia, vigencia y auditoría", async () => {
  const h = await harness();
  try {
    const debt = await createDebt(h);
    facts(h.db, debt.id);

    expect(
      (
        await h.request("/deudas/" + debt.id + "/conciliaciones")
      ).status,
    ).toBe(401);
    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones",
          "POST",
          { fechaCorte: "2026-10-20", capitalDeclarado: "750" },
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones",
          "POST",
          { fechaCorte: "2026-10-20", capitalDeclarado: "750" },
          {
            cookie: h.write().cookie,
            "x-csrf-token": h.write()["x-csrf-token"],
            "idempotency-key": randomUUID(),
          },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones",
          "POST",
          { fechaCorte: "2026-10-20", capitalDeclarado: "750" },
          h.write(),
        )
      ).status,
    ).toBe(422);

    for (const invalid of [
      { fechaCorte: "2026-10-23", capitalDeclarado: "750" },
      { fechaCorte: "2026-02-30", capitalDeclarado: "750" },
      { fechaCorte: "2026-10-20", capitalDeclarado: "750.001" },
      { fechaCorte: "2026-10-20", capitalDeclarado: null },
      {
        fechaCorte: "2026-10-20",
        capitalDeclarado: "750",
        deudaViva: "720",
      },
      {
        fechaCorte: "2026-10-20",
        capitalDeclarado: "750",
        diferencia: "30",
      },
      {
        fechaCorte: "2026-10-20",
        capitalDeclarado: "750",
        estadoConciliacion: "Diferencia",
      },
      {
        fechaCorte: "2026-10-20",
        capitalDeclarado: "750",
        estado: "Vigente",
      },
      { fechaCorte: "2026-10-20", capitalDeclarado: "750", revision: 1 },
      { fechaCorte: "2026-10-20", capitalDeclarado: "750", motivo: "x" },
      {
        fechaCorte: "2026-10-20",
        capitalDeclarado: "750",
        fuente: "x".repeat(201),
      },
      {
        fechaCorte: "2026-10-20",
        capitalDeclarado: "750",
        nota: "x".repeat(1001),
      },
    ])
      expect(
        (
          await h.request(
            "/deudas/" + debt.id + "/conciliaciones",
            "POST",
            invalid,
            h.createKey(),
          )
        ).status,
      ).toBe(422);
    expect(
      (
        await h.request(
          "/deudas/D999/conciliaciones",
          "POST",
          { fechaCorte: "2026-10-20", capitalDeclarado: "750" },
          h.createKey(),
        )
      ).status,
    ).toBe(404);

    const key1 = randomUUID(),
      first = await h.request(
        "/deudas/" + debt.id + "/conciliaciones",
        "POST",
        {
          fechaCorte: "2026-10-20",
          capitalDeclarado: "750",
          fuente: "Banco ficticio",
          nota: "Extracto ficticio",
        },
        { ...h.write(), "idempotency-key": key1 },
      );
    expect(first.status).toBe(201);
    expect(first.headers.get("location")).toBe(
      "/api/deudas/" + debt.id + "/conciliaciones/C001",
    );
    let c1 = (await first.json()).item;
    expect(c1).toMatchObject({
      id: "C001",
      deuda: debt.id,
      fechaCorte: "2026-10-20",
      capitalDeclarado: "750.00",
      fuente: "Banco ficticio",
      nota: "Extracto ficticio",
      estado: "Vigente",
      revision: 1,
    });

    const history = () =>
      h
        .request("/deudas/" + debt.id + "/conciliaciones", "GET", undefined, {
          cookie: h.write().cookie,
        })
        .then((r) => r.json() as Promise<{ items: any[] }>);
    const firstHistory = await history();
    expect(firstHistory.items).toHaveLength(1);
    expect(firstHistory.items[0]).toMatchObject({
      id: "C001",
      diferencia: "30.00",
      estadoConciliacion: "Diferencia",
      motivoNoComparable: null,
    });

    const retry = await h.request(
      "/deudas/" + debt.id + "/conciliaciones",
      "POST",
      {
        fechaCorte: "2026-10-20",
        capitalDeclarado: "750",
        fuente: "Banco ficticio",
        nota: "Extracto ficticio",
      },
      { ...h.write(), "idempotency-key": key1 },
    );
    expect(retry.status).toBe(201);
    expect((await retry.json()).item.id).toBe("C001");
    expect((await history()).items).toHaveLength(1);
    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones",
          "POST",
          {
            fechaCorte: "2026-10-20",
            capitalDeclarado: "751",
            fuente: "Banco ficticio",
            nota: "Extracto ficticio",
          },
          { ...h.write(), "idempotency-key": key1 },
        )
      ).status,
    ).toBe(409);

    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones",
          "POST",
          { fechaCorte: "2026-10-20", capitalDeclarado: "749" },
          h.createKey(),
        )
      ).status,
    ).toBe(409);
    const second = await h.request(
      "/deudas/" + debt.id + "/conciliaciones",
      "POST",
      { fechaCorte: "2026-10-10", capitalDeclarado: "930" },
      h.createKey(),
    );
    expect(second.status).toBe(201);
    const c2 = (await second.json()).item;
    expect(c2.id).toBe("C002");
    const sorted = await history();
    expect(sorted.items.map((item) => item.id)).toEqual(["C001", "C002"]);
    expect(sorted.items.map((item) => item.diferencia)).toEqual([
      "30.00",
      "10.00",
    ]);
    const ficha = await h.request("/deudas/" + debt.id, "GET", undefined, {
      cookie: h.write().cookie,
    });
    expect(ficha.status).toBe(200);
    const fichaBody = await ficha.json();
    expect(fichaBody.item).toMatchObject({
      capital: { deudaViva: "720.00", calculable: true },
      conciliacion: { id: "C001", diferencia: "30.00" },
      varias: true,
    });
    expect(fichaBody.item.conciliaciones).toHaveLength(2);

    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones/C001",
          "PATCH",
          { revision: 0, capitalDeclarado: "720", motivo: "Corrección" },
          h.write(),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones/C001",
          "PATCH",
          { revision: 1, capitalDeclarado: "720" },
          h.write(),
        )
      ).status,
    ).toBe(422);
    const corrected = await h.request(
      "/deudas/" + debt.id + "/conciliaciones/C001",
      "PATCH",
      { revision: 1, capitalDeclarado: "720", motivo: "Corregir extracto" },
      h.write(),
    );
    expect(corrected.status).toBe(200);
    c1 = (await corrected.json()).item;
    expect(c1).toMatchObject({
      id: "C001",
      capitalDeclarado: "720.00",
      revision: 2,
      estado: "Vigente",
    });
    expect(
      (await history()).items.find((item) => item.id === "C001"),
    ).toMatchObject({
      diferencia: "0.00",
      estadoConciliacion: "Conciliado",
    });

    const [raceA, raceB] = await Promise.all([
      h.request(
        "/deudas/" + debt.id + "/conciliaciones/C001",
        "PATCH",
        { revision: 2, nota: "Concurrente A", motivo: "Concurrencia A" },
        h.write(),
      ),
      h.request(
        "/deudas/" + debt.id + "/conciliaciones/C001",
        "PATCH",
        { revision: 2, nota: "Concurrente B", motivo: "Concurrencia B" },
        h.write(),
      ),
    ]);
    expect([raceA.status, raceB.status].sort()).toEqual([200, 409]);
    const afterRace = (await history()).items.find(
      (item) => item.id === "C001",
    );
    c1 = afterRace;
    expect(c1.revision).toBe(3);

    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones/C001",
          "PATCH",
          { revision: c1.revision, fechaCorte: "2026-10-10", motivo: "Duplicar" },
          h.write(),
        )
      ).status,
    ).toBe(409);
    const annulled = await h.request(
      "/deudas/" + debt.id + "/conciliaciones/C001",
      "PATCH",
      {
        revision: c1.revision,
        estado: "Anulada",
        motivo: "Anulación ficticia",
      },
      h.write(),
    );
    expect(annulled.status).toBe(200);
    const annulledItem = (await annulled.json()).item;
    expect(annulledItem).toMatchObject({
      id: "C001",
      estado: "Anulada",
      revision: 4,
    });
    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones/C001",
          "PATCH",
          {
            revision: annulledItem.revision,
            capitalDeclarado: "720",
            motivo: "No se edita una anulada",
          },
          h.write(),
        )
      ).status,
    ).toBe(409);
    const all = await history();
    expect(all.items.find((item) => item.id === "C001")).toMatchObject({
      estado: "Anulada",
      diferencia: "0.00",
    });
    const afterAnnulFicha = await h.request(
      "/deudas/" + debt.id,
      "GET",
      undefined,
      { cookie: h.write().cookie },
    );
    expect((await afterAnnulFicha.json()).item).toMatchObject({
      conciliacion: { id: "C002" },
      varias: false,
      capital: { deudaViva: "720.00" },
    });

    const replacement = await h.request(
      "/deudas/" + debt.id + "/conciliaciones",
      "POST",
      { fechaCorte: "2026-10-20", capitalDeclarado: "720" },
      h.createKey(),
    );
    expect(replacement.status).toBe(201);
    const c3 = (await replacement.json()).item;
    expect(c3.id).toBe("C003");
    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones/C003",
          "DELETE",
          undefined,
          h.write(),
        )
      ).status,
    ).toBe(404);

    const audit = h.db
      .query(
        "SELECT conciliacion,accion,revision,anterior,posterior,motivo,actor,instante FROM conciliaciones_deuda_audit ORDER BY id",
      )
      .all() as {
      conciliacion: string;
      accion: string;
      revision: number;
      anterior: string | null;
      posterior: string;
      motivo: string | null;
      actor: string;
      instante: string;
    }[];
    expect(audit.map((row) => row.accion)).toEqual([
      "alta",
      "alta",
      "corrección",
      "corrección",
      "anulación",
      "alta",
    ]);
    const correctionAudit = audit.find(
      (row) => row.accion === "corrección" && row.motivo === "Corregir extracto",
    )!;
    expect(correctionAudit).toMatchObject({
      actor: "usuario-unico",
      revision: 2,
      instante: new Date(now).toISOString(),
      motivo: "Corregir extracto",
    });
    expect(JSON.parse(correctionAudit.anterior!)).toMatchObject({
      capitalDeclarado: "750.00",
      revision: 1,
    });
    expect(JSON.parse(correctionAudit.posterior)).toMatchObject({
      capitalDeclarado: "720.00",
      revision: 2,
    });
    expect(() =>
      h.db.run("DELETE FROM conciliaciones_deuda WHERE id='C003'"),
    ).toThrow();
    expect(() =>
      h.db.run(
        "DELETE FROM conciliaciones_deuda_audit WHERE conciliacion='C003'",
      ),
    ).toThrow();
    expect(
      h.db
        .query("PRAGMA table_info(conciliaciones_deuda)")
        .all()
        .some((column: any) => column.name === "diferencia"),
    ).toBe(false);
    expect(h.db.query("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    h.db.close();
  }
});

test("17 E4.4 B AC-17/19: conciliación no comparable y revisión obsoleta", async () => {
  const h = await harness();
  try {
    const debt = await createDebt(h, "Deuda sin hechos conciliación"),
      created = await h.request(
        "/deudas/" + debt.id + "/conciliaciones",
        "POST",
        { fechaCorte: "2026-09-15", capitalDeclarado: "1000" },
        h.createKey(),
      );
    expect(created.status).toBe(201);
    const item = (await created.json()).item;
    const listed = await h.request(
      "/deudas/" + debt.id + "/conciliaciones",
      "GET",
      undefined,
      { cookie: h.write().cookie },
    );
    expect((await listed.json()).items[0]).toMatchObject({
      id: item.id,
      diferencia: null,
      estadoConciliacion: "No comparable",
      motivoNoComparable: "El corte es anterior al Inicio control.",
    });

    const annulled = await h.request(
      "/deudas/" + debt.id + "/conciliaciones/" + item.id,
      "PATCH",
      { revision: 1, estado: "Anulada", motivo: "Anular no comparable" },
      h.write(),
    );
    expect(annulled.status).toBe(200);
    expect((await annulled.json()).item).toMatchObject({
      estado: "Anulada",
      revision: 2,
    });
    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones/" + item.id,
          "PATCH",
          { revision: 2, estado: "Anulada", motivo: "Repetir" },
          h.write(),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones",
          "POST",
          { fechaCorte: "2026-09-15", capitalDeclarado: "1000" },
          h.createKey(),
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await h.request(
          "/deudas/" + debt.id + "/conciliaciones/" + item.id,
          "PATCH",
          { revision: 1, capitalDeclarado: "1", motivo: "Revisión obsoleta" },
          h.write(),
        )
      ).status,
    ).toBe(409);
  } finally {
    h.db.close();
  }
});
