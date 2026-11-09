import { test, expect } from "bun:test";
import { HttpApp } from "@effect/platform";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { monthlyFlow } from "./flujo-mensual";
import { getAnnualPlan, previewAnnualPlan, confirmAnnualPlan, type AnnualProvider } from "./plan-anual";
import { getDeudaCompleta } from "./deuda-completa";
import { createDebt } from "./deudas";
import { resumenAnual, type Metrica } from "./resumen-anual";
import {
  seedResumenAnualFixture,
  SEED_NOW,
} from "../test-support/resumen-anual-fixture";

/**
 * E4.7 — API de composición anual.
 *
 * Fixtures sintéticas (C007/C008 de SPEC24/25). No se usan bases reales,
 * Excel, credenciales ni datos personales. Los valores esperados se comparan
 * con la respuesta directa de cada motor propietario, no con una suma de E4.7.
 */

const origin = "http://127.0.0.1:5173";
const NOW = SEED_NOW;
const password = "Solo pruebas locales " + randomUUID();
const ignoredTables = new Set([
  "sessions",
  "auth_events",
  "auth_limits",
  "challenges",
  "bootstrap",
  "recovery",
]);

function snapshot(db: Database) {
  return (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
  )
    .filter(({ name }) => !ignoredTables.has(name))
    .map(
      ({ name }) =>
        [name, db.query(`SELECT * FROM "${name}" ORDER BY rowid`).all()] as const,
    );
}

function harness(db: Database, at = NOW) {
  const key = randomBytes(32);
  let cookie = "",
    csrf = "";
  const handler = HttpApp.toWebHandler(
    createApp(db, { key, origin, now: () => at }),
  );
  async function raw(
    path: string,
    method = "GET",
    headers: Record<string, string> = {},
  ) {
    const response = await handler(
      new Request(origin + path, { method, headers }),
    );
    return {
      status: response.status,
      data: (await response.json()) as Record<string, any>,
      headers: response.headers,
    };
  }
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const requestHeaders: Record<string, string> = {
      origin,
      cookie,
      "x-csrf-token": csrf,
      ...headers,
    };
    if (body !== undefined) requestHeaders["content-type"] = "application/json";
    const response = await handler(
      new Request(origin + path, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie
        .split("; ")
        .filter((part) => part && !part.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = (await response.json()) as Record<string, any>;
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data, headers: response.headers };
  }
  async function enroll() {
    const bootstrap = provision(db, at);
    const response = await request("/api/auth/enroll", "POST", {
      token: bootstrap,
      password,
    });
    expect(response.status).toBe(200);
    const secret = response.data.secret as string;
    const mfa = await request("/api/auth/mfa", "POST", {
      code: totp(secret).generate({ timestamp: at }),
    });
    expect(mfa.status).toBe(200);
    return secret;
  }
  return { db, request, raw, enroll };
}

function completeAnnualProvider(): AnnualProvider {
  return () => ({
    revision: "proveedor-prueba",
    control: { inicio: "2026-01-01", fin: "2026-12-31" },
    corte: "2026-12-31",
    historico: [],
    historicoDisponible: true,
    protecciones: [],
    cierresDisponibles: true,
  });
}

function addZeroPlanLine(db: Database, partida: string) {
  const plan = getAnnualPlan(db, 2026, NOW);
  const proposal = {
    partida,
    revision: 0,
    contextRevision: plan.contextRevision,
    cambios: { presupuesto: "0.00", esencial: "No" },
  };
  const preview = previewAnnualPlan(db, 2026, proposal, NOW);
  return confirmAnnualPlan(
    db,
    2026,
    {
      propuesta: proposal,
      fingerprint: preview.fingerprint,
      motivo: "Cero verificado de fixture E4.7",
    },
    randomUUID(),
    NOW,
  );
}

function metricasDelDto(dto: ReturnType<typeof resumenAnual>) {
  const metricas: { ruta: string; metrica: Metrica }[] = [];
  dto.carriles.plan.items.forEach((item, index) => {
    metricas.push({
      ruta: `plan.items[${index}].ejecutado`,
      metrica: item.ejecutado,
    });
    if (item.diferencia !== null)
      metricas.push({
        ruta: `plan.items[${index}].diferencia`,
        metrica: item.diferencia,
      });
  });
  for (const ciclo of dto.carriles.realidad.ciclos)
    for (const clave of [
      "ingresos",
      "gasto",
      "extraordinaria",
      "nomina",
      "operativo",
      "margenReal",
      "margenEstructural",
    ] as const)
      metricas.push({
        ruta: `realidad.${ciclo.cicloId}.${clave}`,
        metrica: ciclo[clave],
      });
  if (dto.carriles.prevision.simulacion !== null)
    metricas.push({
      ruta: "prevision.simulacion",
      metrica: dto.carriles.prevision.simulacion,
    });
  return metricas;
}

function clavesDe(value: unknown, claves = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) clavesDe(item, claves);
    return claves;
  }
  if (value !== null && typeof value === "object") {
    for (const [clave, item] of Object.entries(value)) {
      claves.add(clave);
      clavesDe(item, claves);
    }
  }
  return claves;
}

test("AC02/03/05/06/17/18: composición exacta contra los motores propietarios", () => {
  const fixture = seedResumenAnualFixture(openDatabase(":memory:"));
  const dto = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026" }),
    NOW,
  );

  // Sin agregado anual ni cifras inventadas.
  const serialized = JSON.stringify(dto);
  expect(serialized).not.toContain("totalAnual");
  expect(serialized).not.toContain("totalGeneral");
  expect(serialized).not.toContain("patrimonioNeto");
  expect(dto.contexto.calculo).toBe("Vivo");
  expect(dto.contexto.fotoId).toBeNull();
  expect(dto.contexto.etiqueta).toBe("Cálculo vivo, sin foto");
  expect(dto.ejercicio).toMatchObject({
    natural: 2026,
    desde: "2026-01-01",
    hasta: "2026-12-31",
  });
  expect(dto.ejercicio.ciclos.map((c) => c.cicloId)).toEqual(["7", "8"]);
  expect(dto.carriles.realidad.agregadoAnual.estado).toBe("No aplica");
  expect(dto.carriles.realidad.ciclos.map((c) => c.cicloId)).toEqual([
    "7",
    "8",
  ]);

  // C007 contra el contrato real de E2.6: valor null y subtotal conocido.
  const c007 = dto.carriles.realidad.ciclos.find((c) => c.cicloId === "7")!;
  const flow7 = monthlyFlow(fixture.db, "7", NOW);
  for (const [clave, esperado] of [
    ["ingresos", "2250.00"],
    ["gasto", "1800.00"],
    ["extraordinaria", "100.00"],
    ["nomina", "2000.00"],
  ] as const) {
    const metrica = c007[clave];
    expect(metrica.valor).toBeNull();
    expect(metrica.subtotal).toBe(esperado);
    expect(metrica.estado).toBe("Parcial");
    expect(metrica.fuente.motor).toBe("E2.6 monthlyFlow");
    expect(metrica.contexto).toMatchObject({
      tipo: "ciclo",
      cicloId: "7",
      corte: flow7.corteEfectivo,
    });
    expect(metrica.valor).toBe(flow7.metrics[clave].valor);
    expect(metrica.subtotal).toBe(flow7.metrics[clave].subtotal);
    expect(String(metrica.estado)).toBe(flow7.metrics[clave].estado);
  }
  expect(c007.operativo).toMatchObject({
    valor: null,
    subtotal: null,
    estado: "No disponible",
  });
  expect(c007.margenReal).toMatchObject({
    valor: null,
    estado: "No disponible",
  });
  expect(c007.operativo.valor).not.toBe("350.00");
  expect(c007.margenReal.valor).not.toBe("100.00");

  // E3.6 se conserva en bloque propio y no se suma al bruto E2.6.
  expect(c007.ajusteCompartidos).toMatchObject({
    gNeto: "1800.00",
    sAjustado: "350.00",
    estado: "Parcial",
  });
  expect(c007.ajusteCompartidos.gNeto).toBe(
    flow7.ajusteCompartidos.gastoNeto.importe,
  );
  expect(c007.ajusteCompartidos.sAjustado).toBe(
    flow7.ajusteCompartidos.resultadoAjustado.importe,
  );
  expect(c007.ajusteCompartidos.fuente.motor).toBe(
    "E3.6 flujoAjustado (E2.6)",
  );

  // Plan E2.4: Presupuesto y subtotal del propietario, sin total anual.
  const plan = getAnnualPlan(fixture.db, 2026, NOW);
  const planDto = dto.carriles.plan;
  expect(planDto.estado).toBe("Parcial");
  expect(planDto.items.map((item) => item.partidaId)).toEqual(
    expect.arrayContaining([fixture.partidas.pGeneric, fixture.partidas.pD001]),
  );
  const pGeneric = planDto.items.find(
    (item) => item.partidaId === fixture.partidas.pGeneric,
  )!;
  const engineGeneric = plan.items.find(
    (item) => item.partida.id === fixture.partidas.pGeneric,
  )!;
  expect(pGeneric.presupuesto).toBe("18000.00");
  expect(pGeneric.esencial).toBe("Sí");
  expect(pGeneric.ejecutado.valor).toBeNull();
  expect(pGeneric.ejecutado.subtotal).toBe("1620.00");
  expect(pGeneric.ejecutado.subtotal).toBe(engineGeneric.subtotalRegistrado);
  expect(pGeneric.ejecutado.estado).toBe("Parcial");
  expect(pGeneric.ejecutado.fuente.revision).toBe(plan.contextRevision);
  expect(pGeneric.diferencia).toMatchObject({
    valor: null,
    estado: "No disponible",
  });
  expect(pGeneric.cobertura.estado).toBe("Parcial");

  // Márgenes solo los dos de E2.6, etiqueta de plan y ND de DT8.
  expect(dto.margenes.etiqueta).toBe("Márgenes del plan");
  expect(dto.margenes.estado).toBe("No disponible");
  expect(dto.margenes.publicados).toHaveLength(4);
  expect(dto.margenes.publicados.map((m) => m.clave)).toEqual([
    "margenEstructural",
    "margenReal",
    "margenEstructural",
    "margenReal",
  ]);
  const margen7 = dto.margenes.publicados.find(
    (m) => m.cicloId === "7" && m.clave === "margenEstructural",
  )!;
  expect(margen7.valor).toBe(flow7.metrics.margenEstructural.valor);
  expect(String(margen7.estado)).toBe(
    flow7.metrics.margenEstructural.estado,
  );
  expect(dto.margenes.noDefinidos.map((m) => m.clave)).toEqual([
    "margenMedio",
    "margenRealPuntual",
  ]);
  for (const margen of dto.margenes.noDefinidos) {
    expect(margen.estado).toBe("No disponible");
    expect(margen.motivo).toBe("Definición pendiente DT8");
  }

  // Previsión y archivo separados y no simulados.
  expect(dto.carriles.prevision).toMatchObject({
    estado: "No disponible",
    simulacion: null,
  });
  expect(dto.carriles.archivo.estado).toBe("No disponible");
  expect(dto.carriles.archivo.gate).toBe("BLOCKED");
  expect(dto.carriles.archivo.items).toEqual([]);
  expect(dto.carriles.archivo.cobertura.estado).toBe("NoAcreditada");
  expect(dto.carriles.archivo.motivo).toContain("E4.5");
  expect(dto.carriles.archivo.motivo).toContain("DT7");

  // Patrimonio: bloques separados al mismo corte, sin patrimonio neto.
  expect(dto.patrimonio).not.toBeNull();
  expect(dto.patrimonio).not.toHaveProperty("patrimonioNeto");
  expect(dto.patrimonio).not.toHaveProperty("total");
  expect(dto.patrimonio!.corte.fecha).toBe("2027-01-15");
  expect(dto.patrimonio!.valoracion.fuente.motor).toBe("E4.3 e43Corte");
  expect(dto.patrimonio!.deuda.fuente.motor).toBe(
    "E4.4 getDeudaCompleta",
  );
  expect(dto.patrimonio!.deuda.corte).toBe("2027-01-15");
  expect(dto.patrimonio!.valoracion.corte).toBe("2027-01-15");
  expect(dto.patrimonio!.deuda.fuente.ids).toEqual(["D001", "D002", "D005"]);
  expect(dto.patrimonio!.deuda.subtotal).toBe("1020.00");
  expect(dto.patrimonio!.deuda.estado).toBe("Parcial");
});

test("AC20/27: sin corte comparable no se fabrica patrimonio ni foto", () => {
  const db = openDatabase(":memory:");
  const dto = resumenAnual(
    db,
    new URLSearchParams({ ejercicio: "2026" }),
    NOW,
  );
  expect(dto.contexto.corte.fecha).toBeNull();
  expect(dto.contexto.calculo).toBe("Vivo");
  expect(dto.contexto.fotoId).toBeNull();
  expect(dto.patrimonio).not.toBeNull();
  expect(dto.patrimonio!.corte.estado).toBe("No disponible");
  expect(dto.patrimonio!.valoracion.estado).toBe("No disponible");
  expect(dto.patrimonio!.deuda.estado).toBe("No disponible");
  expect(dto.patrimonio!.valoracion.valorEur).toBeNull();
  expect(dto.patrimonio!.deuda.total).toBeNull();
  expect(dto.patrimonio!.deuda.subtotal).toBeNull();
  expect(dto.carriles.realidad.estado).toBe("Sin datos");
});

test("AC08/09: el mismo Ciclo cruza 2026/2027 sin prorrateo ni copia del plan", () => {
  const fixture = seedResumenAnualFixture(openDatabase(":memory:"));
  const dto2026 = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026" }),
    NOW,
  );
  const dto2027 = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2027" }),
    NOW,
  );

  const c8a = dto2026.ejercicio.ciclos.find((c) => c.cicloId === "8")!;
  const c8b = dto2027.ejercicio.ciclos.find((c) => c.cicloId === "8")!;
  expect(c8a).toMatchObject({
    cicloId: "8",
    inicio: "2026-11-20",
    fin: null,
    corte: "2027-01-15",
    ejercicios: [2026, 2027],
  });
  expect(c8b).toMatchObject(c8a);

  const real2026 = dto2026.carriles.realidad.ciclos.find(
    (c) => c.cicloId === "8",
  )!;
  const real2027 = dto2027.carriles.realidad.ciclos.find(
    (c) => c.cicloId === "8",
  )!;
  expect(real2026.ingresos.subtotal).toBe("600.00");
  expect(real2027.ingresos.subtotal).toBe("600.00");
  expect(real2026.gasto.subtotal).toBe("200.00");
  expect(real2027.gasto.subtotal).toBe("200.00");
  expect(dto2027.carriles.realidad.ciclos).toHaveLength(1);

  // El plan anual usa el año natural del hecho: 2026 incluye diciembre y
  // excluye enero 2027; 2027 incluye enero y excluye diciembre 2026.
  const p2026 = dto2026.carriles.plan.items.find(
    (item) => item.partidaId === fixture.partidas.pGeneric,
  )!;
  const p2027 = dto2027.carriles.plan.items.find(
    (item) => item.partidaId === fixture.partidas.pGeneric,
  )!;
  expect(p2026.ejecutado.subtotal).toBe("1620.00");
  expect(p2027.ejecutado.subtotal).toBe("80.00");
  expect(p2026.ejecutado.subtotal).not.toBe("1700.00");
  expect(p2027.ejecutado.subtotal).not.toBe("200.00");
});

test("AC01/24/26: solo GET, 401/405, no-store y sin escrituras ni migración", async () => {
  const fixture = seedResumenAnualFixture(openDatabase(":memory:"));
  const app = harness(fixture.db);
  await app.enroll();

  const before = snapshot(fixture.db);
  const versionBefore = fixture.db
    .query("SELECT version FROM schema_version")
    .get();
  const response = await app.request("/api/resumen-anual?ejercicio=2026");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.data).not.toHaveProperty("totalAnual");
  expect(JSON.stringify(response.data)).not.toContain("totalAnual");

  for (const method of ["POST", "PATCH", "DELETE", "PUT"]) {
    const result = await app.request(
      "/api/resumen-anual?ejercicio=2026",
      method,
      method === "GET" ? undefined : {},
    );
    expect(result.status).toBe(405);
    expect(result.headers.get("allow")).toBe("GET");
  }

  const anonymous = await app.raw("/api/resumen-anual?ejercicio=2026");
  expect(anonymous.status).toBe(401);
  expect(anonymous.headers.get("cache-control")).toContain("no-store");

  expect(snapshot(fixture.db)).toEqual(before);
  expect(
    fixture.db.query("SELECT version FROM schema_version").get(),
  ).toEqual(versionBefore);
});

test("AC04/07/19/23: filtros, null ≠ 0 y cero verificado del propietario", () => {
  const fixture = seedResumenAnualFixture(openDatabase(":memory:"));
  addZeroPlanLine(fixture.db, fixture.partidas.pD004);
  const provider = completeAnnualProvider();
  const zero = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026" }),
    NOW,
    { annualProvider: provider },
  );
  const zeroItem = zero.carriles.plan.items.find(
    (item) => item.partidaId === fixture.partidas.pD004,
  )!;
  expect(zeroItem.ejecutado.valor).toBe("0.00");
  expect(zeroItem.ejecutado.estado).toBe("Cero verificado");
  expect(zeroItem.ejecutado.subtotal).toBe("0.00");
  expect(zeroItem.cobertura.estado).toBe("Completa");
  expect(zero.carriles.plan.estado).toBe("Parcial");
  expect(zero.carriles.plan.cobertura.estado).toBe("Parcial");
  expect(zero.carriles.plan.motivo).toContain(
    "sin presupuesto de plan",
  );

  const completa = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026", cobertura: "Completa" }),
    NOW,
    { annualProvider: provider },
  );
  expect(completa.carriles.plan.items.length).toBeGreaterThan(0);
  for (const item of completa.carriles.plan.items)
    expect(item.cobertura.estado).toBe("Completa");
  const parcialConProveedor = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026", cobertura: "Parcial" }),
    NOW,
    { annualProvider: provider },
  );
  expect(parcialConProveedor.carriles.plan.items).toEqual([]);
  expect(parcialConProveedor.carriles.plan.estado).toBe("Sin datos");

  const c8 = zero.carriles.realidad.ciclos.find((c) => c.cicloId === "8")!;
  expect(c8.extraordinaria.valor).toBeNull();
  expect(c8.extraordinaria.subtotal).toBeNull();
  expect(c8.extraordinaria.estado).toBe("No disponible");
  expect(c8.extraordinaria.valor).not.toBe("0.00");

  const byCiclo = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026", ciclo: "8" }),
    NOW,
  );
  expect(byCiclo.carriles.realidad.ciclos.map((c) => c.cicloId)).toEqual(["8"]);
  expect(byCiclo.ejercicio.ciclos.map((c) => c.cicloId)).toEqual(["7", "8"]);

  const byPartida = resumenAnual(
    fixture.db,
    new URLSearchParams({
      ejercicio: "2026",
      partida: fixture.partidas.pD001,
    }),
    NOW,
  );
  expect(byPartida.carriles.plan.items.map((item) => item.partidaId)).toEqual([
    fixture.partidas.pD001,
  ]);

  const byCobertura = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026", cobertura: "Completa" }),
    NOW,
  );
  expect(byCobertura.carriles.plan.items).toEqual([]);
  expect(byCobertura.carriles.plan.estado).toBe("Sin datos");
  const parcial = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026", cobertura: "Parcial" }),
    NOW,
  );
  expect(parcial.carriles.plan.items.length).toBeGreaterThan(0);

  expect(() =>
    resumenAnual(
      fixture.db,
      new URLSearchParams({ ejercicio: "2027", ciclo: "7" }),
      NOW,
    ),
  ).toThrow(/no pertenece/);
  expect(() =>
    resumenAnual(
      fixture.db,
      new URLSearchParams({ ejercicio: "2026", cobertura: "Otra" }),
      NOW,
    ),
  ).toThrow(/Cobertura inválida/);
});

test("B1: un Ciclo abierto no se atribuye a años futuros", () => {
  const fixture = seedResumenAnualFixture(openDatabase(":memory:"));
  const dto = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2030" }),
    NOW,
  );
  expect(dto.ejercicio.natural).toBe(2030);
  expect(dto.ejercicio.ciclos).toEqual([]);
  expect(dto.carriles.realidad.ciclos).toEqual([]);
  expect(dto.carriles.realidad.estado).toBe("Sin datos");
  expect(dto.carriles.plan.items).toEqual([]);
  expect(dto.carriles.plan.estado).toBe("Sin datos");
  expect(dto.carriles.archivo.gate).toBe("BLOCKED");
  expect(dto.margenes.publicados).toEqual([]);
  expect(dto.margenes.estado).toBe("No disponible");
  // El ejercicio 2030 es posterior al corte vivo 2027-01-15: no hereda
  // patrimonio de otro año.
  expect(dto.patrimonio!.corte.fecha).toBeNull();
  expect(dto.patrimonio!.valoracion.corte).toBeNull();
  expect(dto.patrimonio!.deuda.corte).toBeNull();
  expect(dto.patrimonio!.deuda.subtotal).toBeNull();
});

test("B2: deuda E4.4 al corte y solo no hipotecaria activa", () => {
  const fixture = seedResumenAnualFixture(openDatabase(":memory:"));
  const dto = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026" }),
    NOW,
  );
  const corte = dto.patrimonio!.corte.fecha!;
  expect(corte).toBe("2027-01-15");
  expect(dto.patrimonio!.deuda.corte).toBe(corte);
  expect(dto.patrimonio!.valoracion.corte).toBe(corte);

  // D001 tenía 1.000,00 y una cuota con 280,00 de capital el 2026-07-05.
  expect(
    getDeudaCompleta(fixture.db, "D001", "2026-06-30", NOW).capitalPendiente,
  ).toBe("1000.00");
  expect(
    getDeudaCompleta(fixture.db, "D001", corte, NOW).capitalPendiente,
  ).toBe("720.00");
  expect(dto.patrimonio!.deuda.subtotal).toBe("1020.00");
  expect(dto.patrimonio!.deuda.total).toBeNull();
  expect(dto.patrimonio!.deuda.fuente.ids).toEqual(["D001", "D002", "D005"]);
  expect(dto.patrimonio!.deuda.cobertura).toMatchObject({
    estado: "Parcial",
    incluidos: 2,
    excluidos: 1,
  });
  expect(dto.patrimonio!.deuda.cobertura.motivos.join(" ")).toContain("D005");
});

test("AC02: cada cifra expone motor, IDs, contexto, estado y cobertura", () => {
  const fixture = seedResumenAnualFixture(openDatabase(":memory:"));
  const dto = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026" }),
    NOW,
  );
  const metricas = metricasDelDto(dto);
  expect(metricas.length).toBeGreaterThan(0);
  for (const { ruta, metrica } of metricas) {
    expect(metrica.fuente, ruta).toBeDefined();
    expect(metrica.fuente.motor, ruta).toBeTruthy();
    expect(Array.isArray(metrica.fuente.ids), ruta).toBe(true);
    expect(metrica.contexto, ruta).toBeDefined();
    expect(["ciclo", "ejercicio", "corte"], ruta).toContain(
      metrica.contexto.tipo,
    );
    expect(
      [
        "Verificado",
        "Cero verificado",
        "Parcial",
        "No disponible",
        "No aplica",
        "Sin datos",
      ],
      ruta,
    ).toContain(metrica.estado);
    expect(metrica.cobertura, ruta).toBeDefined();
    expect(metrica.cobertura.fuente, ruta).toBeTruthy();
    expect(metrica.motivo.length, ruta).toBeGreaterThan(0);
  }

  const pGeneric = dto.carriles.plan.items.find(
    (item) => item.partidaId === fixture.partidas.pGeneric,
  )!;
  expect(pGeneric.ejecutado.fuente.ids.length).toBeGreaterThan(0);
  expect(pGeneric.ejecutado.contexto).toMatchObject({
    tipo: "ejercicio",
    ejercicio: 2026,
  });

  const c007 = dto.carriles.realidad.ciclos.find((c) => c.cicloId === "7")!;
  expect(c007.ingresos.fuente.ids.length).toBeGreaterThan(0);
  expect(c007.ingresos.contexto).toMatchObject({
    tipo: "ciclo",
    cicloId: "7",
  });

  for (const margen of dto.margenes.publicados) {
    expect(margen.fuente.motor).toBe("E2.6 monthlyFlow");
    expect(Array.isArray(margen.fuente.ids)).toBe(true);
    expect(["margenEstructural", "margenReal"]).toContain(margen.clave);
    expect(margen.cicloId).toBeTruthy();
    expect(margen.cobertura.fuente).toBeTruthy();
  }
});

test("AC20: patrimonio opcional separado, al mismo corte y sin suma publicada", () => {
  const fixture = seedResumenAnualFixture(openDatabase(":memory:"));
  const dto = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026" }),
    NOW,
  );
  const corte = dto.patrimonio!.corte.fecha;
  expect(corte).toBe("2027-01-15");
  expect(dto.patrimonio!.corte.estado).toBe("Parcial");
  expect(dto.patrimonio!.valoracion.corte).toBe(corte);
  expect(dto.patrimonio!.deuda.corte).toBe(corte);
  expect(dto.patrimonio!.valoracion.valorEur).toBe("877.50");
  expect(dto.patrimonio!.deuda.subtotal).toBe("1020.00");
  expect(dto.patrimonio!.nota).toContain("sin patrimonio neto");
  expect(dto.patrimonio!.nota).toContain("sin suma");
  expect(dto.patrimonio).not.toHaveProperty("total");
  const claves = clavesDe(dto.patrimonio);
  for (const prohibida of [
    "patrimonioNeto",
    "totalGeneral",
    "totalPatrimonio",
    "flujoCompleto",
  ])
    expect(claves.has(prohibida)).toBe(false);
});

test("AC21: enlaces de trazabilidad sin importes y con contexto por ID", () => {
  const fixture = seedResumenAnualFixture(openDatabase(":memory:"));
  const dto = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026" }),
    NOW,
  );
  const enlaces: { ruta: string; ids: string[] }[] = [...dto.enlaces];
  for (const item of dto.carriles.plan.items) {
    enlaces.push(item.ejecutado.enlace!);
    if (item.diferencia?.enlace) enlaces.push(item.diferencia.enlace);
  }
  for (const ciclo of dto.carriles.realidad.ciclos)
    if (ciclo.ingresos.enlace) enlaces.push(ciclo.ingresos.enlace);
  enlaces.push(dto.patrimonio!.valoracion.enlace, dto.patrimonio!.deuda.enlace);

  for (const enlace of enlaces) {
    expect(enlace.ruta.startsWith("/")).toBe(true);
    expect(enlace.ruta).not.toMatch(/[0-9]{2,}[.,][0-9]{2}|€/);
    expect(Array.isArray(enlace.ids)).toBe(true);
  }
  const rutas = enlaces.map((enlace) => enlace.ruta);
  expect(rutas).toEqual(
    expect.arrayContaining([
      "/plan-anual",
      "/nomina",
      "/flujo-mensual",
      "/flujo-mensual?ciclo=7",
      "/flujo-mensual?ciclo=8",
      "/movimientos",
      "/inversiones",
      "/deudas",
    ]),
  );
});

test("AC23: un fallo de E2.4 degrada solo el carril plan", () => {
  const fixture = seedResumenAnualFixture(openDatabase(":memory:"));
  const dto = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026" }),
    NOW,
    {
      annualProvider: () => {
        throw new Error("E2.4 caído en prueba");
      },
    },
  );
  expect(dto.carriles.plan.estado).toBe("No disponible");
  expect(dto.carriles.plan.items).toEqual([]);
  expect(dto.carriles.plan.cobertura.estado).toBe("NoDisponible");
  expect(dto.carriles.plan.motivo).toContain("E2.4 no disponible");
  expect(dto.carriles.realidad.estado).toBe("Parcial");
  expect(dto.carriles.realidad.ciclos).toHaveLength(2);
  const c007 = dto.carriles.realidad.ciclos.find((c) => c.cicloId === "7")!;
  expect(c007.ingresos.subtotal).toBe("2250.00");
  expect(dto.carriles.prevision.estado).toBe("No disponible");
  expect(dto.carriles.archivo.estado).toBe("No disponible");
  expect(dto.carriles.archivo.gate).toBe("BLOCKED");
  expect(dto.carriles.archivo.cobertura.estado).toBe("NoAcreditada");
});

test("AC19: no publica mesesCubiertos ni cociente anual; No aplica con motivo", () => {
  const fixture = seedResumenAnualFixture(openDatabase(":memory:"));
  const dto = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026" }),
    NOW,
  );
  const claves = clavesDe(dto);
  for (const prohibida of [
    "mesesCubiertos",
    "costeEsencial",
    "ratioAnual",
    "cocienteAnual",
    "margenMedioAnual",
  ])
    expect(claves.has(prohibida)).toBe(false);
  for (const item of dto.carriles.plan.items)
    expect(["Sí", "No", "Pendiente", null]).toContain(item.esencial);
});

test("M2: la revisión cambia al cambiar la deuda del patrimonio", () => {
  const fixture = seedResumenAnualFixture(openDatabase(":memory:"));
  const before = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026" }),
    NOW,
  );
  createDebt(
    fixture.db,
    {
      nombre: "Deuda nueva QA E4.7",
      inicioControl: "2026-01-01",
      capitalApertura: "100.00",
      tipoDeuda: "No hipotecaria",
    },
    randomUUID(),
    NOW,
  );
  const after = resumenAnual(
    fixture.db,
    new URLSearchParams({ ejercicio: "2026" }),
    NOW,
  );
  expect(after.contexto.revision).not.toBe(before.contexto.revision);
  expect(after.patrimonio!.deuda.subtotal).toBe("1120.00");
});
