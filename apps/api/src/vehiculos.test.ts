import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { openDatabase } from "./database";
import { prepareSchema } from "./database-schema";
import { openDatabaseV13 } from "../test-support/database-v13";
import {
  createReference,
  updateReference,
  getReference,
  referenceUsage,
  listReferences,
} from "./referencias";
import { getVehicle, listVehicles, vehicleIntegrity } from "./vehiculos";
import { createClassification } from "./clasificacion";
import { createSaldo } from "./saldos";
import { getMovement, previewMovement, writeMovement } from "./movimientos";
import { cycleContext } from "./ciclos";
import { Auth, provision, totp } from "./auth";
import { createApp } from "./app";
import type { AnnualProvider, AnnualSources } from "./plan-anual";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const now = Date.parse("2026-10-26T12:00:00Z");
type Master = ReturnType<typeof master>;
function master(db: Database, names = ["Mantenimiento", "Seguro", "Combustible"]) {
  const category = createClassification(
      db,
      "categorias",
      {
        nombre: "Vehículo ficticio",
        anual: "Gasto",
        mensual: "Gasto",
        referencia: false,
      },
      randomUUID(),
      now,
    ),
    sub = createClassification(
      db,
      "subcategorias",
      { nombre: "Sub vehículo ficticio", padre: category.id },
      randomUUID(),
      now,
    ),
    parts = names.map((nombre) =>
      createClassification(
        db,
        "partidas",
        { nombre, padre: sub.id },
        randomUUID(),
        now,
      ),
    ),
    saldo = createSaldo(
      db,
      {
        nombre: "Cuenta ficticia vehículo",
        tipo: "Efectivo",
        control: "Movimientos",
        saldoApertura: "1000",
        fechaApertura: "2026-01-01",
        permiteSalidaExterior: true,
      },
      randomUUID(),
      now,
    );
  return { db, category, sub, parts, saldo };
}
function setup(names?: string[]) {
  return master(openDatabase(":memory:"), names);
}
function vehicle(db: Database, over: Record<string, unknown> = {}) {
  return createReference(
    db,
    {
      nombre: "Coche principal",
      tipo: "Vehículo",
      vehiculo: { matricula: "1234 ABC", proximaITV: "2026-09-12" },
      ...over,
    },
    randomUUID(),
    now,
  );
}
function reference(db: Database, tipo = "Viaje", nombre = "Caso ficticio") {
  return createReference(db, { nombre, tipo }, randomUUID(), now);
}
function fact(
  db: Database,
  referenceId: string,
  partida: string,
  over: Record<string, unknown> = {},
) {
  const n = db
      .query(
        "UPDATE counters SET next=next+1 WHERE name='movimientos' RETURNING CAST(next-1 AS TEXT) n",
      )
      .get() as { n: string },
    id = n.n,
    row = {
      fecha: "2026-02-15",
      importe: 12000,
      tipo: "Gasto",
      origen: "S001",
      destino: "S000",
      partida,
      subtipo: null,
      referencia: referenceId,
      concepto: "Gasto ficticio vehículo",
      nota: "",
      anulado: 0,
      capital: null,
      intereses: null,
      ...over,
    };
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,referencia,concepto,nota,anulado,capital,intereses,revision,creado,actualizado) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
    [
      id,
      row.fecha,
      row.tipo,
      row.importe,
      row.origen,
      row.destino,
      row.subtipo,
      row.partida,
      row.referencia,
      row.concepto,
      row.nota,
      row.anulado,
      row.capital,
      row.intereses,
    ],
  );
  return id;
}
function sources(year: number, partialPartida?: string): AnnualSources {
  if (year === 2027)
    return {
      revision: "fixture-2027",
      control: null,
      historico: [],
      historicoDisponible: false,
      protecciones: [],
      cierresDisponibles: false,
    };
  return {
    revision: `fixture-${year}`,
    control:
      year === 2025
        ? { inicio: "2025-01-01", fin: "2025-12-31" }
        : { inicio: "2026-01-01", fin: "2026-06-30" },
    historico:
      year === 2026 && partialPartida
        ? [
            {
              partida: partialPartida,
              ejercicio: 2026,
              importeCentimos: "1",
              fecha: null,
              intervalo: { inicio: "2026-05-01", fin: "2026-07-15" },
              procedencia: "Fixture parcial",
              verificado: true,
              representadoEnMovimientos: false,
            },
          ]
        : [],
    historicoDisponible: true,
    protecciones: [],
    cierresDisponibles: true,
  };
}
function provider(partialPartida?: string): AnnualProvider {
  return (_db, year) => sources(year, partialPartida);
}
function saveMovement(
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
function expense(saldo: string, partida: string, over: Record<string, unknown> = {}) {
  return {
    tipo: "Gasto",
    fecha: "2026-02-15",
    importe: "12",
    saldo,
    partida,
    ...over,
  };
}
async function http(db: Database, annualProvider?: AnnualProvider) {
  const key = randomBytes(32),
    origin = "http://127.0.0.1:5173",
    handler = HttpApp.toWebHandler(
      createApp(db, { key, now: () => now, annualProvider }),
    ),
    request = (
      path: string,
      method = "GET",
      body?: unknown,
      headers: Record<string, string> = {},
    ) =>
      handler(
        new Request(origin + path, {
          method,
          headers: {
            origin,
            "content-type": "application/json",
            ...headers,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      ),
    auth = new Auth(db, key, origin, () => now),
    enroll = await auth.enroll(
      provision(db, now),
      "Contraseña ficticia vehículo " + randomUUID(),
    ),
    verified = auth.verify(
      new Request(origin, {
        headers: { cookie: auth.challengeName + "=" + enroll.challenge },
      }),
      totp(enroll.secret!).generate({ timestamp: now }),
    ),
    headers = {
      cookie: auth.cookieName + "=" + verified.session,
      "x-csrf-token": verified.csrf,
    };
  return { request, headers, key, origin };
}
function warning(body: any) {
  const set = {
    name: body.coincidenciasNombre
      ? {
          hash: body.candidateNameHash,
          candidates: body.coincidenciasNombre,
        }
      : null,
    registration: body.coincidenciasMatricula
      ? {
          hash: body.candidateMatriculaHash,
          candidates: body.coincidenciasMatricula,
        }
      : null,
  };
  return {
    confirmarDuplicadoNombre: !!body.coincidenciasNombre,
    candidateNameHash: body.candidateNameHash,
    confirmarDuplicadoMatricula: !!body.coincidenciasMatricula,
    candidateMatriculaHash: body.candidateMatriculaHash,
    set,
  };
}

test("AC-01/02/03/04/08/09/12/13/14/33/43: atomic identity, ficha lifecycle, validation and audit", async () => {
  const { db, saldo, parts } = setup();
  try {
    const r = vehicle(db);
    expect(r.tipo).toBe("Vehículo");
    const ficha = getVehicle(db, r.id, "2026", now).ficha!;
    expect(ficha).toMatchObject({
      referencia: r.id,
      matricula: "1234 ABC",
      proximaITV: "2026-09-12",
      cita: null,
      revision: 1,
    });
    expect(() =>
      db.run("INSERT INTO fichas_vehiculo VALUES(?,NULL,NULL,NULL,1,'x','x')", [
        r.id,
      ]),
    ).toThrow();
    expect(() =>
      createReference(
        db,
        { nombre: "Viaje con ficha", tipo: "Viaje", vehiculo: {} },
        randomUUID(),
        now,
      ),
    ).toThrow("solo se admite con Tipo Vehículo");
    const plainViaje = reference(db, "Viaje", "Viaje sin ficha");
    expect(() =>
      db.run(
        "INSERT INTO fichas_vehiculo VALUES(?,NULL,NULL,NULL,1,'x','x')",
        [plainViaje.id],
      ),
    ).toThrow("invalid vehicle reference type");
    expect(() =>
      createReference(
        db,
        { nombre: "Tipo imposible", tipo: "Navidad" },
        randomUUID(),
        now,
      ),
    ).toThrow();
    // Forced failure in the ficha insert rolls back the REF and the counter reservation.
    db.exec(
      "CREATE TRIGGER test_vehicle_fail BEFORE INSERT ON fichas_vehiculo BEGIN SELECT RAISE(ABORT,'forced'); END",
    );
    expect(() =>
      createReference(
        db,
        { nombre: "Fallido", tipo: "Vehículo" },
        randomUUID(),
        now,
      ),
    ).toThrow("forced");
    db.exec("DROP TRIGGER test_vehicle_fail");
    expect(
      db
        .query("SELECT COUNT(*) n FROM referencias WHERE nombre='Fallido'")
        .get(),
    ).toEqual({ n: 0 });
    // Idempotent retry uses the stored private response.
    const key = randomUUID(),
      body = { nombre: "Idempotente", tipo: "Vehículo" },
      first = createReference(db, body, key, now);
    expect(createReference(db, body, key, now)).toEqual(first);
    expect(() =>
      createReference(db, { ...body, nombre: "Otro" }, key, now),
    ).toThrow("otros datos");
    // Rename, dates and matrícula preserve identity; omitted/null semantics are explicit.
    let updated = updateReference(
      db,
      r.id,
      { revision: r.revision, nombre: "Coche renombrado" },
      now,
    );
    expect(updated.id).toBe(r.id);
    expect(getVehicle(db, r.id, "2026", now).ficha!.revision).toBe(1);
    updated = updateReference(
      db,
      r.id,
      {
        revision: updated.revision,
        vehiculo: { matricula: null, proximaITV: null, cita: "2025-01-10" },
        fichaRevision: 1,
      },
      now,
    );
    const cleared = getVehicle(db, r.id, "2026", now);
    expect(cleared.ficha).toMatchObject({
      matricula: null,
      proximaITV: null,
      cita: "2025-01-10",
      revision: 2,
    });
    expect(cleared.ficha!.creado).not.toBe("");
    expect(() =>
      updateReference(
        db,
        r.id,
        { revision: updated.revision, vehiculo: { cita: "" }, fichaRevision: 2 },
        now,
      ),
    ).toThrow("Fecha");
    expect(() =>
      updateReference(
        db,
        r.id,
        { revision: updated.revision, vehiculo: null, fichaRevision: 2 },
        now,
      ),
    ).toThrow("vehiculo:null");
    // Canonical state only; the HTTP PATCH rejects estado while the action works.
    const h = await http(db);
    const estado = await h.request(
      `/api/referencias/${r.id}`,
      "PATCH",
      { revision: updated.revision, estado: "Inactiva" },
      h.headers,
    );
    expect(estado.status).toBe(422);
    const off = await h.request(
      `/api/referencias/${r.id}/desactivar`,
      "POST",
      { revision: updated.revision },
      h.headers,
    );
    expect(off.status).toBe(200);
    expect(getVehicle(db, r.id, "2026", now).ficha).not.toBeNull();
    expect(() =>
      saveMovement(
        db,
        expense(saldo.id, parts[0].id, { referencia: r.id }),
      ),
    ).toThrow("activa");
    const current = getReference(db, r.id);
    const on = await h.request(
      `/api/referencias/${r.id}/reactivar`,
      "POST",
      { revision: current.revision },
      h.headers,
    );
    expect(on.status).toBe(200);
    expect(referenceUsage(db, r.id)).toHaveLength(0);
    const audit = getVehicle(db, r.id, "2026", now).auditoria ?? [];
    expect(audit.some((a) => a.entidad === "ficha_vehiculo" && a.accion === "alta")).toBe(true);
    expect(audit.some((a) => a.accion === "edición")).toBe(true);
  } finally {
    db.close();
  }
});

test("AC-05/06/07/31/36/37/38/42/43: Q3 conversion, 404/Revisar resolution, duplicates and E1.5 transition", async () => {
  const { db, saldo, parts } = setup();
  try {
    const h = await http(db);
    const viaje = reference(db, "Viaje", "Coche secundario"),
      converted = await h.request(
        `/api/referencias/${viaje.id}`,
        "PATCH",
        {
          revision: viaje.revision,
          tipo: "Vehículo",
          confirmarConversion: true,
          vehiculo: { matricula: "9012 JKL", proximaITV: "2025-01-10" },
        },
        h.headers,
      );
    expect(converted.status).toBe(200);
    expect(getVehicle(db, viaje.id, "2026", now).ficha).toMatchObject({
      matricula: "9012 JKL",
      proximaITV: "2025-01-10",
      cita: null,
      revision: 1,
    });
    // A REF with a ficha cannot change Type.
    expect(() =>
      updateReference(
        db,
        viaje.id,
        {
          revision: getReference(db, viaje.id).revision,
          tipo: "Viaje",
          confirmarConversion: true,
        },
        now,
      ),
    ).toThrow("no cambia de Tipo");
    // A used REF is protected by E1.5.
    const used = reference(db, "Viaje", "Viaje usado");
    saveMovement(
      db,
      expense(saldo.id, parts[0].id, { referencia: used.id }),
    );
    expect(() =>
      updateReference(
        db,
        used.id,
        {
          revision: getReference(db, used.id).revision,
          tipo: "Vehículo",
          confirmarConversion: true,
        },
        now,
      ),
    ).toThrow("utilizada");
    // 404 only for nonexistent or non-Vehicle without ficha.
    expect((await h.request("/api/vehiculos/REF999", "GET", undefined, h.headers)).status).toBe(404);
    const noVehicle = reference(db, "Viaje", "Sin ficha Viaje");
    expect((await h.request(`/api/vehiculos/${noVehicle.id}`, "GET", undefined, h.headers)).status).toBe(404);
    // Historical anomalies are simulated by removing the test-only guard; reads never repair them.
    db.exec("DROP TRIGGER ficha_vehiculo_type; DROP TRIGGER referencia_vehicle_type");
    db.run(
      "INSERT INTO referencias VALUES('REF900','Vehículo sin ficha','Vehículo','Activa',1,'x','x')",
    );
    db.run(
      "INSERT INTO fichas_vehiculo VALUES(?,'0000 XXX',NULL,NULL,1,'x','x')",
      [noVehicle.id],
    );
    const missing = await h.request("/api/vehiculos/REF900", "GET", undefined, h.headers);
    expect(missing.status).toBe(200);
    expect((await missing.json()).integridad.motivos).toContain("FICHA_AUSENTE");
    const wrong = await h.request(`/api/vehiculos/${noVehicle.id}`, "GET", undefined, h.headers);
    expect(wrong.status).toBe(200);
    expect((await wrong.json()).integridad.motivos).toContain("REF_TIPO_INCORRECTO");
    expect((await h.request("/api/vehiculos/REF900")).status).toBe(401);
    // Duplicate dimensions: only name, only matrícula, both; own REF excluded.
    const first = vehicle(db, {
        nombre: "Duplicado",
        vehiculo: { matricula: "DUP 001" },
      }),
      warningName = await h.request(
        "/api/referencias",
        "POST",
        { nombre: "Duplicado", tipo: "Vehículo" },
        { ...h.headers, "idempotency-key": randomUUID() },
      );
    expect(warningName.status).toBe(409);
    const wn = await warningName.json();
    expect(wn.coincidenciasNombre).toHaveLength(1);
    expect(wn.candidateNameHash).toMatch(/^[a-f0-9]{64}$/);
    expect(wn.coincidenciasMatricula).toBeUndefined();
    const incomplete = await h.request(
      "/api/referencias",
      "POST",
      {
        nombre: "Duplicado",
        tipo: "Vehículo",
        confirmarDuplicadoNombre: true,
        candidateNameHash: wn.candidateNameHash,
        vehiculo: { matricula: "DUP 001" },
      },
      { ...h.headers, "idempotency-key": randomUUID() },
    );
    expect(incomplete.status).toBe(422);
    const both = await h.request(
      "/api/referencias",
      "POST",
      {
        nombre: "Duplicado",
        tipo: "Vehículo",
        confirmarDuplicadoNombre: true,
        candidateNameHash: wn.candidateNameHash,
        confirmarDuplicadoMatricula: true,
        candidateMatriculaHash: (
          await (
            await h.request(
              "/api/referencias",
              "POST",
              {
                nombre: "Otro nombre",
                tipo: "Vehículo",
                vehiculo: { matricula: "DUP 001" },
              },
              { ...h.headers, "idempotency-key": randomUUID() },
            )
          ).json()
        ).candidateMatriculaHash,
        vehiculo: { matricula: "DUP 001" },
      },
      { ...h.headers, "idempotency-key": randomUUID() },
    );
    expect(both.status).toBe(201);
    // Matrícula corrections: same value does not warn; another ficha warns and confirms.
    const same = await h.request(
      `/api/referencias/${first.id}`,
      "PATCH",
      {
        revision: getReference(db, first.id).revision,
        vehiculo: { matricula: "DUP 001" },
        fichaRevision: 1,
      },
      h.headers,
    );
    expect(same.status).toBe(200);
    const otherVehicle = vehicle(db, {
      nombre: "Otra ficha",
      vehiculo: { matricula: "OTHER 001" },
    });
    const matWarning = await h.request(
      `/api/referencias/${first.id}`,
      "PATCH",
      {
        revision: getReference(db, first.id).revision,
        vehiculo: { matricula: "OTHER 001" },
        fichaRevision: 1,
      },
      h.headers,
    );
    expect(matWarning.status).toBe(409);
    const mw = await matWarning.json();
    expect(mw.coincidenciasMatricula).toHaveLength(1);
    const confirmed = await h.request(
      `/api/referencias/${first.id}`,
      "PATCH",
      {
        revision: getReference(db, first.id).revision,
        vehiculo: { matricula: "OTHER 001" },
        fichaRevision: 1,
        confirmarDuplicadoMatricula: true,
        candidateMatriculaHash: mw.candidateMatriculaHash,
      },
      h.headers,
    );
    expect(confirmed.status).toBe(200);
    expect(getVehicle(db, first.id, "2026", now).ficha!.matricula).toBe(
      "OTHER 001",
    );
    expect(getVehicle(db, first.id, "2026", now).ficha!.referencia).toBe(first.id);
    expect(otherVehicle.id).not.toBe(first.id);
    // A stale ficha revision is a conflict; no partial save.
    const stale = await h.request(
      `/api/referencias/${first.id}`,
      "PATCH",
      {
        revision: getReference(db, first.id).revision,
        nombre: "Nombre no guardado",
        vehiculo: { cita: "2025-01-10" },
        fichaRevision: 99,
      },
      h.headers,
    );
    expect(stale.status).toBe(409);
    expect(getReference(db, first.id).nombre).toBe("Duplicado");
    // CAT009 without REF remains valid; a Vehículo REF without ficha is rejected by Movimientos.
    const cat009 = createClassification(
      db,
      "categorias",
      {
        nombre: "Vehículo CAT009",
        anual: "Gasto",
        mensual: "Gasto",
        referencia: false,
      },
      randomUUID(),
      now,
    );
    const sub009 = createClassification(
      db,
      "subcategorias",
      { nombre: "Sub CAT009", padre: cat009.id },
      randomUUID(),
      now,
    );
    const part009 = createClassification(
      db,
      "partidas",
      { nombre: "Partida CAT009", padre: sub009.id },
      randomUUID(),
      now,
    );
    expect(
      saveMovement(db, expense(saldo.id, part009.id, { importe: "5" })).referencia,
    ).toBeNull();
    expect(() =>
      saveMovement(
        db,
        expense(saldo.id, part009.id, { referencia: "REF900" }),
      ),
    ).toThrow("ficha");
    expect(
      (await h.request("/api/vehiculos", "POST", {}, h.headers)).status,
    ).toBe(404);
  } finally {
    db.close();
  }
});

test("AC-06/40: una ficha de Anticipo bloquea la conversión a Vehículo y el indicador", async () => {
  const { db } = setup();
  try {
    const h = await http(db),
      anticipo = reference(db, "Anticipo", "Anticipo ficticio"),
      beforeAnticipo = db
        .query("SELECT * FROM fichas_anticipos WHERE referencia=?")
        .get(anticipo.id);
    expect(beforeAnticipo).toBeDefined();
    expect(
      db.query("SELECT COUNT(*) n FROM fichas_vehiculo WHERE referencia=?").get(anticipo.id),
    ).toEqual({ n: 0 });
    const detail = await h.request(
      `/api/referencias/${anticipo.id}`,
      "GET",
      undefined,
      h.headers,
    );
    expect(detail.status).toBe(200);
    const view = await detail.json();
    expect(view.conversion.disponible).toBe(false);
    expect(view.conversion.motivo).toMatch(/Anticipo/);
    const rejected = await h.request(
      `/api/referencias/${anticipo.id}`,
      "PATCH",
      {
        revision: anticipo.revision,
        tipo: "Vehículo",
        confirmarConversion: true,
        vehiculo: { matricula: "ANT 001" },
      },
      h.headers,
    );
    expect(rejected.status).toBe(409);
    expect((await rejected.json()).code).toBe("HISTORY_LOCKED");
    expect(getReference(db, anticipo.id).tipo).toBe("Anticipo");
    expect(
      db.query("SELECT COUNT(*) n FROM fichas_vehiculo WHERE referencia=?").get(anticipo.id),
    ).toEqual({ n: 0 });
    expect(
      db.query("SELECT COUNT(*) n FROM fichas_anticipos WHERE referencia=?").get(anticipo.id),
    ).toEqual({ n: 1 });
    expect(
      db.query("SELECT COUNT(*) n FROM audit WHERE entidad='ficha_vehiculo' AND campos LIKE ?").get(`%${anticipo.id}%`),
    ).toEqual({ n: 0 });
  } finally {
    db.close();
  }
});

test("AC-15/16/17/19/20/21/22/23/24/25/39/41/44: annual read model and E2.4 coverage", () => {
  const { db, parts, saldo } = setup();
  try {
    const mixed = vehicle(db, {
        nombre: "Coche mixto",
        vehiculo: { matricula: "MIX 001" },
      }),
      open = vehicle(db, {
        nombre: "Coche abierto",
        vehiculo: { matricula: "OPEN 001" },
      }),
      empty = vehicle(db, {
        nombre: "Coche vacío",
        vehiculo: { matricula: "EMPTY 001" },
      }),
      p = provider(parts[1].id);
    // Mixed AC-41: 120 verifiable + 400 partial + 720 verifiable + 50 outside.
    fact(db, mixed.id, parts[0].id, { importe: 12000 });
    fact(db, mixed.id, parts[1].id, { importe: 40000, fecha: "2026-06-20" });
    fact(db, mixed.id, parts[2].id, { importe: 72000, fecha: "2026-06-30" });
    fact(db, mixed.id, parts[1].id, { importe: 5000, fecha: "2026-07-01" });
    // Other REF, income, transfer, debt and annulled facts do not count.
    fact(db, open.id, parts[0].id, { importe: 11000 });
    fact(db, open.id, parts[0].id, {
      importe: 90000,
      tipo: "Ingreso",
      origen: "S000",
      destino: "S001",
      partida: null,
      subtipo: "Bonus",
    });
    fact(db, open.id, parts[0].id, {
      importe: 90000,
      tipo: "Transferencia",
      partida: null,
      destino: "S002",
    });
    fact(db, open.id, parts[0].id, {
      importe: 90000,
      tipo: "Amortización deuda",
      capital: 90000,
      intereses: 0,
    });
    fact(db, open.id, parts[0].id, { importe: 90000, anulado: 1 });
    const detail = getVehicle(db, mixed.id, "2026", now, p).gastoAnual!;
    expect(detail).toMatchObject({
      subtotalRegistrado: "1240.00",
      coberturaMixta: true,
      coberturaAlCorte: "Parcial",
      coberturaAnual: "No verificada",
      totalAlCorte: null,
      totalAnual: null,
      ceroVerificado: false,
      hechosConocidos: 3,
      hechosFueraConocidos: 1,
      importeFueraDeControlCorte: "50.00",
    });
    expect(detail.resultadosPorPartida).toHaveLength(3);
    expect(detail.resultadosPorPartida.map((r) => r.partida.id)).toEqual(
      parts.map((p) => p.id).sort(),
    );
    expect(detail.hechosFueraDeControlCorte[0]).toMatchObject({
      fecha: "2026-07-01",
      importe: "50.00",
      partida: { id: parts[1].id },
    });
    // Open 2026: verifiable at cut, annual open, no annual total.
    const openDetail = getVehicle(db, open.id, "2026", now, p).gastoAnual!;
    expect(openDetail).toMatchObject({
      subtotalRegistrado: "110.00",
      coberturaAlCorte: "Verificable al corte",
      coberturaAnual: "Abierta",
      totalAlCorte: "110.00",
      totalAnual: null,
      ceroVerificado: false,
    });
    // Empty 2026 is only a verified zero at the cut; the year is open.
    const emptyDetail = getVehicle(db, empty.id, "2026", now, p).gastoAnual!;
    expect(emptyDetail).toMatchObject({
      subtotalRegistrado: "0.00",
      coberturaAlCorte: "Verificable al corte",
      coberturaAnual: "Abierta",
      totalAlCorte: "0.00",
      totalAnual: null,
      ceroVerificado: true,
    });
    // 2027 future never becomes a verified zero.
    const future = getVehicle(db, empty.id, "2027", now, p).gastoAnual!;
    expect(future).toMatchObject({
      coberturaAnual: "Futura",
      totalAlCorte: null,
      totalAnual: null,
      ceroVerificado: false,
    });
    // 2025 complete: total annual equals total at cut only because coverage is complete.
    const full = getVehicle(db, empty.id, "2025", now, p).gastoAnual!;
    expect(full).toMatchObject({
      coberturaAlCorte: "Verificable al corte",
      coberturaAnual: "Completa",
      totalAlCorte: "0.00",
      totalAnual: "0.00",
      ceroVerificado: true,
    });
    // December belongs to its real date, regardless of cycle; ITV does not move it.
    const december = vehicle(db, {
      nombre: "Coche diciembre",
      vehiculo: { matricula: "DEC 001", proximaITV: "2024-01-01" },
    });
    fact(db, december.id, parts[0].id, { fecha: "2026-12-31", importe: 3300 });
    const fullYear = (_db: Database, year: number) =>
      year === 2026
        ? {
            ...sources(2026),
            control: { inicio: "2026-01-01", fin: "2026-12-31" },
            historico: [],
          }
        : sources(year);
    expect(
      getVehicle(db, december.id, "2026", now, fullYear).gastoAnual!
        .subtotalRegistrado,
    ).toBe("33.00");
    expect(
      getVehicle(db, december.id, "2027", now, fullYear).gastoAnual!
        .subtotalRegistrado,
    ).toBe("0.00");
    const broken = () => {
      throw new Error("fuente no disponible");
    };
    const unavailable = getVehicle(db, mixed.id, "2026", now, broken);
    expect(unavailable.gastoAnual).toBeNull();
    expect(unavailable.integridad.estado).toBe("No disponible");
    expect(unavailable.integridad.motivos).toContain("FUENTE_NO_DISPONIBLE");
    // Rectification/annulment reevaluates once and preserves the original.
    const movement = saveMovement(
      db,
      expense(saldo.id, parts[0].id, {
        referencia: open.id,
        importe: "10",
        fecha: "2026-02-01",
      }),
    );
    const before = getVehicle(db, open.id, "2026", now, p).gastoAnual!.subtotalRegistrado;
    saveMovement(
      db,
      {
        ...expense(saldo.id, parts[0].id, { referencia: open.id, importe: "20", fecha: "2026-02-02" }),
        revision: movement.revision,
        motivo: "Rectificación ficticia",
      },
      movement.id,
    );
    expect(getVehicle(db, open.id, "2026", now, p).gastoAnual!.subtotalRegistrado).not.toBe(before);
    saveMovement(
      db,
      { revision: movement.revision + 1, motivo: "Anulación ficticia" },
      movement.id,
      true,
    );
    expect(
      db.query("SELECT COUNT(*) n FROM movimientos WHERE referencia=?").get(open.id),
    ).toEqual({ n: 6 });
    // Rename/deactivate preserves historical totals.
    const oldTotal = getVehicle(db, open.id, "2026", now, p).gastoAnual!.subtotalRegistrado;
    updateReference(db, open.id, { revision: getReference(db, open.id).revision, nombre: "Renombrado" }, now);
    expect(getVehicle(db, open.id, "2026", now, p).gastoAnual!.subtotalRegistrado).toBe(oldTotal);
    // No persisted totals or parallel vehicle fact table.
    const tables = (db.query("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map((t) => t.name);
    expect(tables).toContain("fichas_vehiculo");
    expect(tables.some((t) => /total|gasto_vehiculo|vehiculos/i.test(t))).toBe(false);
  } finally {
    db.close();
  }
});

test("AC-30/31/38/39/40: transition, list read model and conversion integration", async () => {
  const { db, parts, saldo } = setup();
  try {
    const p = provider(parts[1].id),
      h = await http(db, p);
    const a = vehicle(db, { nombre: "A", vehiculo: { matricula: "A 001" } }),
      b = vehicle(db, { nombre: "B", vehiculo: { matricula: "B 001" } }),
      c = reference(db, "Evento", "Evento sin ficha");
    fact(db, a.id, parts[0].id, { importe: 1000 });
    const list = listVehicles(db, new URLSearchParams({ ejercicio: "2026" }), now, p);
    expect(list.total).toBe(2);
    expect(list.items).toHaveLength(2);
    expect(list.items[0].gastoAnual).not.toBeNull();
    expect(
      (await h.request("/api/vehiculos?ejercicio=2026", "GET", undefined, h.headers)).status,
    ).toBe(200);
    expect(
      (await h.request(`/api/vehiculos/${a.id}?ejercicio=2026`, "GET", undefined, h.headers)).status,
    ).toBe(200);
    const converted = await h.request(
      `/api/referencias/${c.id}`,
      "PATCH",
      {
        revision: getReference(db, c.id).revision,
        tipo: "Vehículo",
        confirmarConversion: true,
        vehiculo: { matricula: "C 001" },
      },
      h.headers,
    );
    expect(converted.status).toBe(200);
    expect(getVehicle(db, c.id, "2026", now, p).ficha).not.toBeNull();
    // No duplicate write route and no amount editing from the ficha.
    expect((await h.request("/api/vehiculos", "POST", {}, h.headers)).status).toBe(404);
    expect(
      (await h.request(`/api/vehiculos/${a.id}`, "PATCH", {}, h.headers)).status,
    ).toBe(404);
    // CAT009 optional without REF remains valid; Evento still has no ficha.
    expect(referenceUsage(db, c.id)).toHaveLength(0);
    const ops = previewMovement(
      db,
      expense(saldo.id, parts[0].id, { referencia: c.id }),
      null,
      false,
      now,
    );
    expect(ops.despues?.referencia).toBe(c.id);
    expect(getVehicle(db, b.id, "2026", now, p).ficha).not.toBeNull();
  } finally {
    db.close();
  }
});

test("AC-10/11/36/37/42: duplicate warnings, dimension hashes and atomic confirmations", async () => {
  const { db } = setup();
  try {
    const h = await http(db);
    vehicle(db, { nombre: "Base", vehiculo: { matricula: "BASE 001" } });
    const request = (body: any, key = randomUUID()) =>
      h.request("/api/referencias", "POST", body, {
        ...h.headers,
        "idempotency-key": key,
      });
    const nameOnly = await request({ nombre: "Base", tipo: "Vehículo" });
    expect(nameOnly.status).toBe(409);
    const n = await nameOnly.json();
    expect(n.candidateNameHash).toMatch(/^[a-f0-9]{64}$/);
    expect(n.coincidenciasMatricula).toBeUndefined();
    const badHash = await request({
      nombre: "Base",
      tipo: "Vehículo",
      confirmarDuplicadoNombre: true,
      candidateNameHash: "f".repeat(64),
    });
    expect(badHash.status).toBe(409);
    expect((await badHash.json()).code).toBe("DUPLICATE_CONTEXT_CHANGED");
    const missingFlag = await request({
      nombre: "Base",
      tipo: "Vehículo",
      candidateNameHash: n.candidateNameHash,
    });
    expect(missingFlag.status).toBe(422);
    const good = await request({
      nombre: "Base",
      tipo: "Vehículo",
      confirmarDuplicadoNombre: true,
      candidateNameHash: n.candidateNameHash,
    });
    expect(good.status).toBe(201);
    // Matrícula NULL/empty is never a candidate.
    const empty = await request({ nombre: "Sin matrícula", tipo: "Vehículo" });
    expect(empty.status).toBe(201);
    // Own ficha is excluded from an edit warning.
    const goodId = (await good.json()).item.id,
      duplicateAudit = getVehicle(db, goodId, "2026", now).auditoria?.find(
        (a) => a.accion === "duplicado_confirmado",
      );
    expect(duplicateAudit).toBeDefined();
    expect((duplicateAudit!.campos as any).referencia).toBe(goodId);
    const own = getReference(db, goodId);
    const selfEdit = await h.request(
      `/api/referencias/${own.id}`,
      "PATCH",
      {
        revision: own.revision,
        nombre: own.nombre,
        vehiculo: { matricula: null },
        fichaRevision: 1,
      },
      h.headers,
    );
    expect(selfEdit.status).toBe(200);
    const clientCandidates = await request({
      nombre: "Base",
      tipo: "Vehículo",
      confirmarDuplicadoNombre: true,
      candidateNameHash: n.candidateNameHash,
      coincidenciasNombre: [],
    });
    expect(clientCandidates.status).toBe(422);
  } finally {
    db.close();
  }
});

test("AC-07/25/32/33: integrity list is read-only, scope stays local and audit is append-only", async () => {
  const { db, parts } = setup();
  try {
    const h = await http(db);
    vehicle(db);
    db.run("INSERT INTO referencias VALUES('REF901','Huérfano','Vehículo','Activa',1,'x','x')");
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,referencia,concepto,nota,anulado,revision,creado,actualizado) VALUES('990','2026-01-01','Gasto',100,'S001','S000',?,'REF901','x','',0,1,'x','x')",
      [parts[0].id],
    );
    db.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,referencia,concepto,nota,anulado,revision,creado,actualizado) VALUES('991','2026-01-01','Transferencia',100,'S001','S002','REF901','x','',0,1,'x','x')",
    );
    expect(getMovement(db, "990").movimiento.integridad.estado).toBe("Revisar");
    expect(getMovement(db, "991").movimiento.integridad.estado).toBe("OK");
    const report = vehicleIntegrity(db, "2026", now);
    expect(report.estado).toBe("Revisar");
    expect(report.items.some((i) => i.integridad.motivos.includes("FICHA_AUSENTE"))).toBe(true);
    const response = await h.request("/api/vehiculos/integridad?ejercicio=2026", "GET", undefined, h.headers);
    expect(response.status).toBe(200);
    expect((await response.json()).items.length).toBeGreaterThan(0);
    // The read model never creates the missing ficha.
    expect(getVehicle(db, "REF901", "2026", now).ficha).toBeNull();
    expect(db.query("SELECT COUNT(*) n FROM fichas_vehiculo WHERE referencia='REF901'").get()).toEqual({ n: 0 });
    expect(() =>
      db.run("DELETE FROM referencias WHERE id='REF901'"),
    ).toThrow();
    expect(() =>
      db.run("UPDATE audit SET accion='x' WHERE entidad='ficha_vehiculo'"),
    ).toThrow();
    expect(() =>
      db.run("DELETE FROM audit WHERE entidad='ficha_vehiculo'"),
    ).toThrow();
  } finally {
    db.close();
  }
});

test("AC-02/04/26/31: migration v13→v14, FK/audit continuity and HTTP guards", async () => {
  const dir = mkdtempSync(join(tmpdir(), "e33-vehiculo-"));
  try {
    const path = join(dir, "v13.sqlite"),
      old = openDatabaseV13(path);
    old.run(
      "INSERT INTO referencias VALUES('REF500','Histórica','Viaje','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
    );
    old.run(
      "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,concepto,nota,revision,creado,actualizado) VALUES('500','2026-01-01','Transferencia',100,'S001','S002','x','',1,'x','x')",
    );
    old.run(
      "INSERT INTO referencias VALUES('REF501','Anticipo histórico','Anticipo','Activa',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
    );
    old.run(
      "INSERT INTO fichas_anticipos VALUES('REF501',NULL,NULL,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
    );
    expect(old.query("SELECT version FROM schema_version").get()).toEqual({
      version: 13,
    });
    const refs = old.query("SELECT * FROM referencias").all(),
      movs = old.query("SELECT * FROM movimientos").all(),
      anticipos = old.query("SELECT * FROM fichas_anticipos").all();
    old.close();
    const db = openDatabase(path);
    try {
      expect(db.query("SELECT version FROM schema_version").get()).toEqual({ version: 15 });
      expect(db.query("SELECT * FROM referencias").all()).toEqual(refs);
      expect(db.query("SELECT * FROM movimientos").all()).toEqual(movs);
      expect(db.query("SELECT * FROM fichas_anticipos").all()).toEqual(anticipos);
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      const h = await http(db);
      expect((await h.request("/api/vehiculos", "GET")).status).toBe(401);
      expect(
        (await h.request("/api/vehiculos", "GET", undefined, { ...h.headers, "x-csrf-token": "" })).status,
      ).toBe(200);
      expect(
        (await h.request("/api/vehiculos", "POST", {}, h.headers)).status,
      ).toBe(404);
      const created = await h.request(
        "/api/referencias",
        "POST",
        { nombre: "HTTP", tipo: "Vehículo" },
        { ...h.headers, "idempotency-key": randomUUID() },
      );
      expect(created.status).toBe(201);
      const item = (await created.json()).item;
      expect(
        (await h.request(`/api/referencias/${item.id}`, "DELETE", {}, h.headers)).status,
      ).toBe(404);
      // An unknown field and invalid date are rejected without SQL disclosure.
      expect(
        (await h.request("/api/referencias", "POST", { nombre: "X", tipo: "Vehículo", x: 1 }, { ...h.headers, "idempotency-key": randomUUID() })).status,
      ).toBe(422);
      expect(
        (await h.request(`/api/referencias/${item.id}`, "PATCH", { revision: item.revision, vehiculo: { cita: "2026-02-30" } }, h.headers)).status,
      ).toBe(422);
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});


test("AC-04/11/37: two-process conversion and atomic duplicate rejection without partial writes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "e33-race-"));
  try {
    const path = join(dir, "race.sqlite"),
      seed = openDatabase(path);
    const r = reference(seed, "Evento", "Conversión concurrente");
    seed.close();
    const script = join(dir, "convert.ts");
    const database = resolve("apps/api/src/database.ts"),
      refs = resolve("apps/api/src/referencias.ts");
    (await import("node:fs")).writeFileSync(
      script,
      `import{openDatabase}from${JSON.stringify(database)};import{getReference,updateReference}from${JSON.stringify(refs)};const db=openDatabase(process.argv[2]);try{const r=getReference(db,process.argv[3]);updateReference(db,process.argv[3],{revision:r.revision,tipo:'Vehículo',confirmarConversion:true,vehiculo:{matricula:'RACE 001'}},${now});console.log('ok');}catch(e){console.log(String(e.status??e.code));}finally{db.close();}`,
    );
    const run = () =>
      Bun.spawn([process.execPath, script, path, r.id], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, NODE_ENV: "test" },
      });
    const children = [run(), run()],
      results = await Promise.all(
        children.map(async (p) => ({
          out: (await new Response(p.stdout).text()).trim(),
          code: await p.exited,
        })),
      );
    expect(results.filter((r) => r.out === "ok")).toHaveLength(1);
    expect(results.filter((r) => r.out === "409")).toHaveLength(1);
    expect(results.every((r) => r.code === 0)).toBe(true);
    const after = openDatabase(path);
    try {
      expect(
        after.query("SELECT COUNT(*) n FROM fichas_vehiculo WHERE referencia=?").get(r.id),
      ).toEqual({ n: 1 });
      expect(getReference(after, r.id).tipo).toBe("Vehículo");
    } finally {
      after.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("AC-10/11/36/37: PATCH duplicate atomicity, context change and matrícula correction", async () => {
  const { db } = setup();
  try {
    const h = await http(db),
      a = vehicle(db, { nombre: "Alfa", vehiculo: { matricula: "AAA 001" } }),
      b = vehicle(db, { nombre: "Beta", vehiculo: { matricula: "BBB 001" } });
    const before = getVehicle(db, a.id, "2026", now),
      auditBefore = before.auditoria?.length ?? 0;
    const warning = await h.request(
      `/api/referencias/${a.id}`,
      "PATCH",
      { revision: getReference(db, a.id).revision, nombre: "Beta" },
      h.headers,
    );
    expect(warning.status).toBe(409);
    const w = await warning.json();
    expect(w.coincidenciasNombre).toHaveLength(1);
    expect(getReference(db, a.id).nombre).toBe("Alfa");
    expect(getVehicle(db, a.id, "2026", now).ficha!.matricula).toBe("AAA 001");
    expect(getVehicle(db, a.id, "2026", now).auditoria?.length).toBe(auditBefore);
    const confirmed = await h.request(
      `/api/referencias/${a.id}`,
      "PATCH",
      {
        revision: getReference(db, a.id).revision,
        nombre: "Beta",
        confirmarDuplicadoNombre: true,
        candidateNameHash: w.candidateNameHash,
      },
      h.headers,
    );
    expect(confirmed.status).toBe(200);
    expect(getReference(db, a.id).nombre).toBe("Beta");
    // Context changes after the warning: old hash cannot be replayed.
    const matWarning = await h.request(
      `/api/referencias/${a.id}`,
      "PATCH",
      {
        revision: getReference(db, a.id).revision,
        vehiculo: { matricula: "BBB 001" },
        fichaRevision: getVehicle(db, a.id, "2026", now).ficha!.revision,
      },
      h.headers,
    );
    expect(matWarning.status).toBe(409);
    const mw = await matWarning.json();
    expect(mw.coincidenciasMatricula).toHaveLength(1);
    const bCurrent = getReference(db, b.id);
    const bFicha = getVehicle(db, b.id, "2026", now).ficha!;
    const changedContext = await h.request(
      `/api/referencias/${b.id}`,
      "PATCH",
      {
        revision: bCurrent.revision,
        vehiculo: { matricula: "BBB 002" },
        fichaRevision: bFicha.revision,
      },
      h.headers,
    );
    expect(changedContext.status).toBe(200);
    const stale = await h.request(
      `/api/referencias/${a.id}`,
      "PATCH",
      {
        revision: getReference(db, a.id).revision,
        vehiculo: { matricula: "BBB 001" },
        fichaRevision: getVehicle(db, a.id, "2026", now).ficha!.revision,
        confirmarDuplicadoMatricula: true,
        candidateMatriculaHash: mw.candidateMatriculaHash,
      },
      h.headers,
    );
    expect(stale.status).toBe(409);
    expect((await stale.json()).code).toBe("DUPLICATE_CONTEXT_CHANGED");
    expect(getVehicle(db, a.id, "2026", now).ficha!.matricula).toBe("AAA 001");
    expect(getReference(db, a.id).nombre).toBe("Beta");
  } finally {
    db.close();
  }
});


test("AC-26/43: HTTP auth/CSRF/Origin, replay, no DELETE and PATCH null/omitted semantics", async () => {
  const { db } = setup();
  try {
    const h = await http(db),
      origin = h.origin,
      create = () =>
        h.request(
          "/api/referencias",
          "POST",
          { nombre: "Guarda", tipo: "Vehículo" },
          { ...h.headers, "idempotency-key": "fixed-vehicle-key-0001" },
        );
    expect(
      (
        await h.request("/api/referencias", "POST", {
          nombre: "Sin sesión",
          tipo: "Vehículo",
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await h.request(
          "/api/referencias",
          "POST",
          { nombre: "Sin CSRF", tipo: "Vehículo" },
          { cookie: h.headers.cookie, "idempotency-key": randomUUID() },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await h.request(
          "/api/referencias",
          "POST",
          { nombre: "Origen ajeno", tipo: "Vehículo" },
          {
            ...h.headers,
            origin: "https://invalid.example",
            "idempotency-key": randomUUID(),
          },
        )
      ).status,
    ).toBe(403);
    const first = await create();
    expect(first.status).toBe(201);
    const item = (await first.json()).item;
    const replay = await create();
    expect(replay.status).toBe(201);
    expect((await replay.json()).item).toEqual(item);
    const listed = await h.request("/api/vehiculos?ejercicio=2026", "GET", undefined, h.headers);
    expect(listed.status).toBe(200);
    const current = getReference(db, item.id);
    for (const body of [
      { revision: current.revision, nombre: null },
      { revision: current.revision, tipo: null },
      { revision: current.revision, vehiculo: null, fichaRevision: 1 },
      { revision: current.revision, estado: "Inactiva" },
    ])
      expect(
        (await h.request(`/api/referencias/${item.id}`, "PATCH", body, h.headers))
          .status,
      ).toBe(422);
    const clear = await h.request(
      `/api/referencias/${item.id}`,
      "PATCH",
      {
        revision: current.revision,
        vehiculo: { cita: null, matricula: null },
        fichaRevision: 1,
      },
      h.headers,
    );
    expect(clear.status).toBe(200);
    expect(getVehicle(db, item.id, "2026", now).ficha).toMatchObject({
      matricula: null,
      cita: null,
    });
    expect(
      (
        await h.request(
          `/api/referencias/${item.id}`,
          "DELETE",
          {},
          h.headers,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await h.request(
          `/api/referencias/${item.id}`,
          "PATCH",
          { revision: 1, nombre: "Obsolescente" },
          h.headers,
        )
      ).status,
    ).toBe(409);
  } finally {
    db.close();
  }
});
