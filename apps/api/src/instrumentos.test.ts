import { test, expect } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { Auth, provision, totp } from "./auth";
import { openDatabase } from "./database";
import { getSaldo, updateSaldo } from "./saldos";

const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas inversiones " + randomUUID();
const now = Date.parse("2026-10-26T12:00:00Z");

async function fixture() {
  const db = openDatabase(":memory:"),
    key = randomBytes(32);
  const handler = HttpApp.toWebHandler(createApp(db, { key, now: () => now }));
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
    return { status: response.status, data, headers: response.headers };
  }
  async function enroll() {
    const bootstrap = provision(db, now),
      enroll = await request("/api/auth/enroll", "POST", {
        token: bootstrap,
        password,
      });
    const verified = await request("/api/auth/mfa", "POST", {
      code: totp(enroll.data.secret as string).generate({ timestamp: now }),
    });
    expect(verified.status).toBe(200);
  }
  return { db, request, enroll, key };
}

function instrumentRequest(
  f: Awaited<ReturnType<typeof fixture>>,
  body: Record<string, unknown>,
) {
  return f.request("/api/instrumentos", "POST", body, {
    "idempotency-key": randomUUID(),
  });
}
function purchaseRequest(
  f: Awaited<ReturnType<typeof fixture>>,
  body: Record<string, unknown>,
) {
  return f.request("/api/compras", "POST", body, {
    "idempotency-key": randomUUID(),
  });
}
function opening(db: ReturnType<typeof openDatabase>, value = "5000.00") {
  updateSaldo(db, "S003", {
    revision: getSaldo(db, "S003").revision,
    saldoApertura: value,
    fechaApertura: "2026-01-01",
    permiteSalidaExterior: true,
  });
}
const purchaseBody = (id: string, over: Record<string, unknown> = {}) => ({
  fecha: "2026-02-10",
  instrumento: id,
  saldoEfectivo: "S003",
  saldoInversion: "S004",
  cantidad: "12.5",
  precio: "100.00",
  divisa: "USD",
  cambio: "0.900000",
  importeEur: "1125.00",
  comisionEur: "5.00",
  concepto: "Compra demo",
  nota: null,
  ...over,
});

test("E4.1-AC-01/02/03/04: identidad, ISIN normalizado, evidencia, unicidad y nombre no clave", async () => {
  const f = await fixture();
  await f.enroll();
  const first = await instrumentRequest(f, { nombre: "Fondo índice demo" });
  expect(first.status).toBe(201);
  expect(first.data.instrumento).toMatchObject({
    id: "I1001",
    nombre: "Fondo índice demo",
    isin: null,
    isinEvidencia: null,
    divisaReferencia: null,
    estado: "Activa",
    revision: 1,
  });
  expect(
    (await instrumentRequest(f, { nombre: "x".repeat(121) })).status,
  ).toBe(422);
  expect(
    (
      await instrumentRequest(f, {
        nombre: "Divisa inválida",
        divisaReferencia: "EURO",
      })
    ).status,
  ).toBe(422);
  expect(
    (await instrumentRequest(f, { nombre: "Sin evidencia", isin: "ES0000000002" }))
      .status,
  ).toBe(422);
  expect(
    (
      await instrumentRequest(f, {
        nombre: "Espacio interior",
        isin: "ES00 00000002",
        isinEvidencia: "Extracto ficticio",
      })
    ).status,
  ).toBe(422);
  expect(
    (
      await instrumentRequest(f, {
        nombre: "Evidencia larga",
        isin: "ES0000000002",
        isinEvidencia: "e".repeat(201),
      })
    ).status,
  ).toBe(422);
  const isin = await instrumentRequest(f, {
    nombre: "Fondo con ISIN",
    isin: " es0000000001 ",
    isinEvidencia: "Extracto ficticio F-01",
    divisaReferencia: "EUR",
  });
  expect(isin.status).toBe(201);
  expect(isin.data.instrumento).toMatchObject({
    id: "I1002",
    isin: "ES0000000001",
    isinEvidencia: "Extracto ficticio F-01",
  });
  const duplicate = await instrumentRequest(f, {
    nombre: "Duplicado",
    isin: "ES0000000001",
    isinEvidencia: "Otro extracto",
  });
  expect(duplicate.status).toBe(422);
  expect(duplicate.data.instrumento).toBe("I1002");
  const sameName = await instrumentRequest(f, { nombre: "Fondo con ISIN" });
  expect(sameName.status).toBe(201);
  expect(sameName.data.instrumento.id).toBe("I1003");
  const list = await f.request("/api/instrumentos?estado=Activa");
  expect(list.status).toBe(200);
  expect(list.data.total).toBe(3);
  expect(list.data.cobertura).toContain("histórico anterior no importado");
  expect(list.data.ventas).toContain("E4.2");
});

test("E4.1-AC-05/06/07/36/43: edición auditada, ciclo de vida y conservación económica", async () => {
  const f = await fixture();
  await f.enroll();
  opening(f.db);
  const created = await instrumentRequest(f, {
    nombre: "Fondo índice demo",
    isin: "ES0000000001",
    isinEvidencia: "Extracto ficticio F-01",
    divisaReferencia: "EUR",
  });
  const id = created.data.instrumento.id as string;
  const purchase = await purchaseRequest(f, purchaseBody(id, { divisa: "USD" }));
  expect(purchase.status).toBe(201);
  const beforeMovements = (
    f.db.query("SELECT COUNT(*) n FROM movimientos").get() as { n: number }
  ).n;
  const renamed = await f.request(`/api/instrumentos/${id}`, "PATCH", {
    revision: 1,
    motivo: "Corrección de nombre ficticia",
    nombre: "Fondo índice demo renombrado",
  });
  expect(renamed.status).toBe(200);
  expect(renamed.data.instrumento).toMatchObject({
    id,
    nombre: "Fondo índice demo renombrado",
    revision: 2,
  });
  expect(
    (
      await f.request(`/api/instrumentos/${id}`, "PATCH", {
        revision: 2,
        nombre: "Sin motivo",
      })
    ).status,
  ).toBe(422);
  const edited = await f.request(`/api/instrumentos/${id}`, "PATCH", {
    revision: 2,
    motivo: "Divisa de referencia ficticia",
    divisaReferencia: "USD",
  });
  expect(edited.status).toBe(200);
  expect(edited.data.instrumento.divisaReferencia).toBe("USD");
  const purchaseAfter = await f.request(`/api/compras/${purchase.data.compra.id}`);
  expect(purchaseAfter.data.compra).toMatchObject({
    divisa: "USD",
    cambio: "0.900000",
    precio: "100.00",
    importeEur: "1125.00",
    comisionEur: "5.00",
  });
  const stale = await f.request(`/api/instrumentos/${id}/desactivar`, "POST", {
    revision: 1,
    motivo: "Revisión obsoleta",
  });
  expect(stale.status).toBe(409);
  expect(stale.data.code).toBe("REVISION_CONFLICT");
  const deactivated = await f.request(
    `/api/instrumentos/${id}/desactivar`,
    "POST",
    { revision: 3, motivo: "Fuera de uso ficticio" },
  );
  expect(deactivated.status).toBe(200);
  expect(deactivated.data.instrumento.estado).toBe("Inactiva");
  const rejected = await purchaseRequest(f, purchaseBody(id));
  expect(rejected.status).toBe(422);
  expect(rejected.data.fields.instrumento).toContain("inactivo");
  expect(
    (await f.request(`/api/instrumentos/${id}`, "DELETE")).status,
  ).toBe(404);
  const reactivated = await f.request(
    `/api/instrumentos/${id}/reactivar`,
    "POST",
    { revision: 4, motivo: "Vuelve a uso ficticio" },
  );
  expect(reactivated.status).toBe(200);
  const accepted = await purchaseRequest(f, purchaseBody(id, { cantidad: "1" }));
  expect(accepted.status).toBe(201);
  const audit = await f.request(`/api/instrumentos/${id}/auditoria`);
  expect(audit.data.items.map((row: any) => row.accion)).toEqual([
    "alta",
    "edición",
    "edición",
    "desactivación",
    "reactivación",
  ]);
  expect(audit.data.items.map((row: any) => row.revision)).toEqual([
    1, 2, 3, 4, 5,
  ]);
  expect(audit.data.items[0].anterior).toBeNull();
  expect(audit.data.items.at(-1).posterior.estado).toBe("Activa");
  expect(
    (await f.request("/api/instrumentos/I9999/auditoria")).status,
  ).toBe(404);
  expect(() =>
    f.db.run("UPDATE instrumento_audit SET motivo='alterado'"),
  ).toThrow();
  expect(() => f.db.run("DELETE FROM instrumento_audit")).toThrow();
  const detail = await f.request(`/api/instrumentos/${id}`);
  expect(detail.data.compras).toHaveLength(2);
  expect(
    (
      f.db.query("SELECT COUNT(*) n FROM movimientos").get() as { n: number }
    ).n,
  ).toBe(beforeMovements);
});

test("E4.1-AC-32: IDs y auditoría dedicada no se reutilizan ni admiten DELETE", async () => {
  const f = await fixture();
  await f.enroll();
  opening(f.db);
  const a = await instrumentRequest(f, { nombre: "A ficticio" });
  const b = await instrumentRequest(f, { nombre: "B ficticio" });
  expect(a.data.instrumento.id).toBe("I1001");
  expect(b.data.instrumento.id).toBe("I1002");
  const first = await purchaseRequest(f, purchaseBody(a.data.instrumento.id, { importeEur: "10.00", cantidad: "1", precio: "1.00", cambio: null, divisa: "EUR" }));
  const second = await purchaseRequest(f, purchaseBody(a.data.instrumento.id, { importeEur: "20.00", cantidad: "2", precio: "1.00", cambio: null, divisa: "EUR" }));
  expect(first.data.compra.id).not.toBe(second.data.compra.id);
  expect(first.data.auditoria[0].accion).toBe("alta");
  expect(first.data.auditoria[0].posterior.importeEur).toBe("10.00");
  expect(() => f.db.run("UPDATE operaciones_inversion_audit SET motivo='x'")).toThrow();
  expect(() => f.db.run("DELETE FROM operaciones_inversion_audit")).toThrow();
  expect(() => f.db.run("UPDATE operaciones_inversion SET id='999' WHERE id=?", [first.data.compra.id])).toThrow();
  expect(() => f.db.run("DELETE FROM operaciones_inversion WHERE id=?", [first.data.compra.id])).toThrow();
  expect(() => f.db.run("DELETE FROM instrumentos WHERE id=?", [a.data.instrumento.id])).toThrow();
});

test("E4.1-AC-19: idempotencia de Instrumento con replay idéntico y payload distinto", async () => {
  const f = await fixture();
  await f.enroll();
  const key = randomUUID();
  const body = {
    nombre: "Fondo idempotente",
    isin: "ES0000000005",
    isinEvidencia: "Evidencia idempotente",
  };
  const first = await f.request("/api/instrumentos", "POST", body, {
    "idempotency-key": key,
  });
  expect(first.status).toBe(201);
  const replay = await f.request("/api/instrumentos", "POST", body, {
    "idempotency-key": key,
  });
  expect(replay.status).toBe(201);
  expect(replay.data.instrumento.id).toBe(first.data.instrumento.id);
  const conflict = await f.request(
    "/api/instrumentos",
    "POST",
    { ...body, nombre: "Otro payload" },
    { "idempotency-key": key },
  );
  expect(conflict.status).toBe(409);
  expect(conflict.data.code).toBe("IDEMPOTENCY_CONFLICT");
  expect(
    (f.db.query("SELECT COUNT(*) n FROM instrumentos").get() as { n: number }).n,
  ).toBe(1);
});
