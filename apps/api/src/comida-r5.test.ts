import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./database";
import { createSaldo } from "./saldos";
import { createClassification } from "./clasificacion";
import { createCycle, cycleContext } from "./ciclos";
import { getMovement, previewMovement, writeMovement } from "./movimientos";
import { activateRegimen, getComidaMovement, listComida, listComprasR5, prepareRegimen } from "./comida";
import { financeRevision } from "./movement-ledger";

/**
 * #538 F1b (#571) · R5 selector de compras y devolucionRevision en la ficha (specs/38 §2/§6).
 * Todo con datos ficticios en SQLite en memoria; ningún dato real.
 */
const now = Date.parse("2026-10-21T12:00:00Z");
process.env.NODE_ENV = "test";

function setup() {
  const db = openDatabase(":memory:");
  const cat = createClassification(
    db,
    "categorias",
    { nombre: "Gastos ficticios", anual: "Gasto", mensual: "Gasto", referencia: false },
    randomUUID(),
  );
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Subcategoría ficticia", padre: cat.id },
    randomUUID(),
  );
  db.run(
    "INSERT INTO presupuestos VALUES('PRE900','Plan ficticio','Gasto real','S001','Activo',1,'f','f')",
  );
  const food = createClassification(
    db,
    "partidas",
    { nombre: "Supermercado ficticio", padre: sub.id, presupuesto: "PRE900" },
    randomUUID(),
  );
  const leisure = createClassification(
    db,
    "partidas",
    { nombre: "Ocio ficticio", padre: sub.id, presupuesto: "PRE900" },
    randomUUID(),
  );
  const account = createSaldo(
    db,
    {
      nombre: "Cuenta ficticia",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "5000",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  );
  const other = createSaldo(
    db,
    {
      nombre: "Otra cuenta ficticia",
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "100",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  );
  const cycle1 = createCycle(
    db,
    { inicio: "2026-06-20", saldoInicialComida: "0", contextRevision: cycleContext(db).revision },
    randomUUID(),
    now,
  ).ciclo;
  const cycle2 = createCycle(
    db,
    { inicio: "2026-07-20", saldoInicialComida: "0", contextRevision: cycleContext(db).revision },
    randomUUID(),
    now,
  ).ciclo;
  return { db, food, leisure, account, other, cycle1, cycle2 };
}
type Ctx = ReturnType<typeof setup>;

function add(db: Database, body: Record<string, unknown>) {
  const plan = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    randomUUID(),
    null,
    false,
    now,
  );
}
let seq = 0;
function buy(c: Ctx, importe: string, over: Record<string, unknown> = {}) {
  return add(c.db, {
    tipo: "Gasto",
    fecha: "2026-07-05",
    importe,
    saldo: c.account.id,
    partida: c.food.id,
    concepto: `Compra ficticia ${++seq}`,
    nota: "",
    ...over,
  }).movimiento.id as string;
}
function refund(
  c: Ctx,
  compra: string,
  importe: string,
  link: Record<string, unknown> = {},
  over: Record<string, unknown> = {},
) {
  return add(c.db, {
    tipo: "Devolución de gasto",
    fecha: "2026-08-10",
    importe,
    saldo: c.other.id,
    concepto: "Devolución ficticia",
    nota: "",
    ...over,
    devolucion: {
      estado: "Verificado",
      compra,
      evidenciaRelacion: "Evidencia ficticia",
      elegibilidad: "Acreditada",
      cicloOrigen: c.cycle1.id,
      evidenciaOrigenTemporal: "Documento ficticio",
      ...link,
    },
  }).movimiento.id as string;
}

/** Huella completa de todas las tablas de dominio: una lectura no puede alterar ninguna. */
function snapshot(db: Database) {
  const tables = (
    db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as {
      name: string;
    }[]
  ).map((t) => t.name);
  return JSON.stringify([
    db.query("SELECT total_changes() n").get(),
    financeRevision(db),
    tables.map((t) => [t, db.query(`SELECT * FROM "${t}"`).all()]),
  ]);
}


const R5 = (c: Ctx, q: string) => listComprasR5(c.db, new URLSearchParams(q));
const base = "tipo=Gasto&estado=Vigente";
const rng = "desde=2026-07-01&hasta=2026-07-31";

function terminalSaldo(c: Ctx) {
  return createSaldo(
    c.db,
    { nombre: "Terminal ficticia", tipo: "Efectivo", control: "Terminal", saldoApertura: "0", fechaApertura: "2026-01-01", permiteSalidaExterior: true },
    randomUUID(),
    now,
  );
}

test("AC-D33 R5: forma exacta, filtros inclusivos por fecha e importe bruto, saldo de origen", () => {
  const c = setup();
  const a = buy(c, "10", { fecha: "2026-07-01" });
  const b = buy(c, "20.50", { fecha: "2026-07-15" });
  const d = buy(c, "30", { fecha: "2026-07-31" });
  buy(c, "99", { fecha: "2026-06-30" });
  buy(c, "99", { fecha: "2026-08-01" });
  const all = R5(c, `${base}&${rng}`);
  expect(Object.keys(all).sort()).toEqual(["items", "page", "total"]);
  expect(Object.keys(all.items[0]).sort()).toEqual(["concepto", "fecha", "id", "importe", "partida", "saldo"]);
  expect(all.items.map((i) => i.id)).toEqual([d, b, a]);
  expect(all.items[1]).toMatchObject({ id: b, fecha: "2026-07-15", importe: "20.50", partida: c.food.id, saldo: c.account.id });
  expect(all.total).toBe(3);
  // fechas inclusivas en ambos extremos
  expect(R5(c, `${base}&desde=2026-07-01&hasta=2026-07-01`).items.map((i) => i.id)).toEqual([a]);
  expect(R5(c, `${base}&desde=2026-07-31&hasta=2026-07-31`).items.map((i) => i.id)).toEqual([d]);
  // importes inclusivos y exactos
  expect(R5(c, `${base}&${rng}&importeMin=20.50&importeMax=30`).items.map((i) => i.id)).toEqual([d, b]);
  expect(R5(c, `${base}&${rng}&importeMin=10&importeMax=10.00`).items.map((i) => i.id)).toEqual([a]);
  expect(R5(c, `${base}&${rng}&importeMax=20.49`).items.map((i) => i.id)).toEqual([a]);
  expect(R5(c, `${base}&${rng}&importeMin=30.01`).total).toBe(0);
  // acotación de un solo lado y parámetros vacíos del patrón de la spec
  expect(R5(c, `${base}&desde=2026-07-15&hasta=&importeMin=&importeMax=`).total).toBe(3);
  expect(R5(c, `${base}&hasta=2026-07-01`).total).toBe(2); // incluye 2026-06-30 y 2026-07-01
  c.db.close();
});

test("AC-D33 R5: importeMin > importeMax, no monetarios y negativos dan 422 VALIDATION", () => {
  const c = setup();
  buy(c, "10");
  const bad = (q: string) => {
    try {
      R5(c, q);
    } catch (e) {
      return { status: (e as { status: number }).status, code: (e as { code: string }).code };
    }
    return null;
  };
  for (const q of [
    "importeMin=20&importeMax=10",
    "importeMin=abc",
    "importeMax=1e3",
    "importeMin=1,5",
    "importeMin=1.234",
    "importeMin=-1",
    "importeMax=-0.01",
    "importeMin=%2B5",
    "importeMin=0x10",
    "importeMin=NaN",
    "importeMin=Infinity",
    "importeMin=01",
    "importeMin=.5",
  ])
    expect([q, bad(`${base}&${rng}&${q}`)]).toEqual([q, { status: 422, code: "VALIDATION" }]);
  for (const q of [
    `${base}&${rng}&page=0`,
    `${base}&${rng}&page=x`,
    `${base}&${rng}&page=1.5`,
    `${base}&desde=2026-13-01&hasta=2026-07-31`,
    `${base}&desde=2026-07-31&hasta=2026-07-01`,
    `tipo=Devoluci%C3%B3n+de+gasto&estado=Vigente&${rng}&importeMin=1`,
    `tipo=Gasto&estado=Anulado&${rng}&importeMin=1`,
  ])
    expect([q, bad(q)]).toEqual([q, { status: 422, code: "VALIDATION" }]);
  c.db.close();
});

test("AC-D33 R5: nunca sin acotación temporal ni limitado al ciclo vigente", () => {
  const c = setup();
  buy(c, "10", { fecha: "2026-06-25" });
  buy(c, "10", { fecha: "2026-07-25" });
  for (const q of [base, `${base}&importeMin=1&importeMax=99`, `${base}&desde=&hasta=`])
    expect(() => R5(c, q)).toThrow("acotación temporal");
  // un rango que cruza dos ciclos lista ambos: no se limita al ciclo vigente
  expect(R5(c, `${base}&desde=2026-06-01&hasta=2026-08-31`).total).toBe(2);
  c.db.close();
});

test("AC-D33 R5: solo Gasto vigente no Terminal; excluye anuladas, devoluciones, ingresos y agregados Terminal", () => {
  const c = setup();
  const ok = buy(c, "10");
  const anulada = buy(c, "11");
  const term = terminalSaldo(c);
  buy(c, "12", { saldo: term.id });
  refund(c, ok, "5");
  add(c.db, { tipo: "Ingreso", subtipo: "Nómina", fecha: "2026-07-06", importe: "13", saldo: c.account.id, concepto: "Ingreso ficticio", nota: "" });
  c.db.run("UPDATE movimientos SET anulado=1 WHERE id=?", [anulada]);
  const out = R5(c, `${base}&desde=2026-01-01&hasta=2026-12-31`);
  expect(out.items.map((i) => i.id)).toEqual([ok]);
  expect(out.total).toBe(1);
  c.db.close();
});

test("AC-D33 R5: paginación de 100 estable, total del conjunto filtrado e independiente de la página", () => {
  const c = setup();
  const ids: string[] = [];
  for (let i = 0; i < 105; i++) ids.push(buy(c, (1 + i / 100).toFixed(2), { fecha: i < 50 ? "2026-07-10" : "2026-07-11" }));
  const q = `${base}&${rng}`;
  const p1 = R5(c, q),
    p2 = R5(c, `${q}&page=2`),
    p3 = R5(c, `${q}&page=3`);
  expect(p1.items.length).toBe(100);
  expect(p2.items.length).toBe(5);
  expect(p3.items).toEqual([]);
  expect([p1.total, p2.total, p3.total]).toEqual([105, 105, 105]);
  expect([p1.page, p2.page, p3.page]).toEqual([1, 2, 3]);
  const seen = [...p1.items, ...p2.items].map((i) => i.id);
  expect(new Set(seen).size).toBe(105);
  // orden de listComida: fecha desc, luego id numérico desc
  const expected = c.db
    .query("SELECT id FROM movimientos WHERE tipo='Gasto' ORDER BY fecha DESC, length(id) DESC, id DESC")
    .all()
    .map((r) => (r as { id: string }).id);
  expect(seen).toEqual(expected);
  expect(R5(c, q).items).toEqual(p1.items); // estable entre lecturas
  expect(R5(c, `${q}&importeMin=3`).total).toBe(0);
  expect(R5(c, `${q}&importeMin=2&importeMax=2.04`).total).toBe(5);
  c.db.close();
});

test("AC-D33 R5: GET no cambia filas, revisiones, auditoría ni dirty", () => {
  const c = setup();
  const compra = buy(c, "120");
  refund(c, compra, "30");
  add(c.db, { tipo: "Devolución de gasto", fecha: "2026-08-10", importe: "9", saldo: c.other.id, concepto: "Huérfana", nota: "" });
  const before = snapshot(c.db);
  R5(c, `${base}&${rng}&importeMin=1&importeMax=500`);
  listComida(c.db, new URLSearchParams("estado="));
  expect(snapshot(c.db)).toBe(before);
  c.db.close();
});

test("AC-D33 R5: listComida actual sin R5 conserva su forma (compatibilidad de Comida.tsx)", () => {
  const c = setup();
  const compra = buy(c, "120");
  c.db.run("INSERT INTO movimiento_revision_comida(movimiento,etiqueta,estado_revision,revision_movimiento,revision,creado,actualizado) VALUES(?,?,?,?,?,?,?)", [compra, "Comida", "Revisada", 1, 1, "t", "t"]);
  const legacy = listComida(c.db, new URLSearchParams("estado="));
  expect(Object.keys(legacy).sort()).toEqual(["contexto", "historico", "historicoTotal", "items", "page", "regimen", "total"]);
  expect(legacy.items[0]).toMatchObject({ fuente: "Individual", id: compra, tipo: "Gasto", importe: "120.00" });
  expect(legacy.items[0]).toHaveProperty("devolucion");
  expect(esR5Compat(c)).toBe(false);
  c.db.close();
});
function esR5Compat(_c: Ctx) {
  const { esConsultaR5 } = require("./comida");
  return [
    "estado=",
    "",
    "tipo=Gasto",
    "estado=Vigente",
    "tipo=Devoluci%C3%B3n+de+gasto&estado=Vigente",
    "ciclo=C1&estado=",
  ].some((q) => esConsultaR5(new URLSearchParams(q))) ||
    !["importeMin=1", "importeMax=1", "tipo=Gasto&estado=Vigente"].every((q) => esConsultaR5(new URLSearchParams(q)));
}

test("AC-U29/AC-U33 lectura: devolucionRevision con vínculo, null explícito sin vínculo y la ficha conserva devolucion.revision", () => {
  const c = setup();
  const compra = buy(c, "120");
  const linked = refund(c, compra, "30");
  const orphan = add(c.db, { tipo: "Devolución de gasto", fecha: "2026-08-10", importe: "9", saldo: c.other.id, concepto: "Huérfana", nota: "" }).movimiento.id as string;
  const before = snapshot(c.db);
  const fl = getMovement(c.db, linked),
    fo = getMovement(c.db, orphan),
    fg = getMovement(c.db, compra);
  const row = c.db.query("SELECT revision FROM movimiento_devolucion WHERE movimiento=?").get(linked) as { revision: number };
  expect(fl.devolucionRevision).toBe(row.revision);
  expect(fl.movimiento.devolucion!.revision).toBe(row.revision); // correspondencia con la clave existente
  expect(fl.devolucionRevision).toBe(fl.movimiento.devolucion!.revision);
  expect(fo.movimiento.devolucion).toBeNull();
  expect("devolucionRevision" in fo).toBe(true);
  expect(fo.devolucionRevision).toBeNull();
  expect(fg.devolucionRevision).toBeNull(); // un Gasto no tiene fila de atribución
  // ficha Comida: misma correspondencia
  const cl = getComidaMovement(c.db, linked),
    co = getComidaMovement(c.db, orphan);
  expect(cl.devolucionRevision).toBe(row.revision);
  expect(cl.devolucion!.revision).toBe(row.revision);
  expect("devolucionRevision" in co).toBe(true);
  expect(co.devolucionRevision).toBeNull();
  expect(co.devolucion).toBeNull();
  expect(snapshot(c.db)).toBe(before);
  c.db.close();
});

test("AC-D33 R5 HTTP: 401 sin sesión, 200 no-store, 422 VALIDATION y /api/comida?estado= intacto", async () => {
  const { HttpApp } = require("@effect/platform");
  const { randomBytes } = require("node:crypto");
  const { createApp } = require("./app");
  const { provision, totp } = require("./auth");
  const origin = "http://127.0.0.1:5173";
  const password = "Pruebas ficticias R5 " + randomUUID();
  const db = openDatabase(":memory:");
  const handler = HttpApp.toWebHandler(createApp(db, { key: randomBytes(32), now: () => now }));
  let cookie = "",
    csrf = "";
  let last: Response | null = null;
  async function request(path: string) {
    const response = await handler(new Request(origin + path, { headers: { origin, cookie, "x-csrf-token": csrf } }));
    last = response.clone();
    return { status: response.status, data: await response.json() };
  }
  async function post(path: string, body: unknown) {
    const response = await handler(
      new Request(origin + path, { method: "POST", headers: { origin, "content-type": "application/json", cookie, "x-csrf-token": csrf }, body: JSON.stringify(body) }),
    );
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie.split("; ").filter((p) => p && !p.startsWith(name + "=")).concat(pair).join("; ");
    }
    const data = await response.json();
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data };
  }
  const r5 = `/api/comida?${base}&${rng}&importeMin=0&importeMax=100&page=1`;
  expect((await request(r5)).status).toBe(401);
  const enrolled = await post("/api/auth/enroll", { token: provision(db, now), password });
  await post("/api/auth/mfa", { code: totp(enrolled.data.secret).generate({ timestamp: now }) });
  const ok = await request(r5);
  expect(ok.status).toBe(200);
  expect(last!.headers.get("cache-control")).toBe("no-store");
  expect(ok.data).toEqual({ items: [], page: 1, total: 0 });
  const bad = await request(`/api/comida?${base}&${rng}&importeMin=5&importeMax=1`);
  expect(bad.status).toBe(422);
  expect(bad.data.code ?? bad.data.error?.code).toBe("VALIDATION");
  expect(last!.headers.get("cache-control")).toBe("no-store");
  expect((await request(`/api/comida?${base}`)).status).toBe(422);
  const legacy = await request("/api/comida?estado=");
  expect(legacy.status).toBe(200);
  expect(Object.keys(legacy.data).sort()).toEqual(["contexto", "historico", "historicoTotal", "items", "page", "regimen", "total"]);
  db.close();
});

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return { status: (e as { status: number }).status, code: (e as { code: string }).code };
  }
  return null;
};

test("AC-D33 R5 (QA): límites exactos inclusivos de fecha e importe e importeMin = importeMax", () => {
  const c = setup();
  const lo = buy(c, "10.00", { fecha: "2026-07-01" });
  const hi = buy(c, "20.00", { fecha: "2026-07-31" });
  buy(c, "9.99", { fecha: "2026-07-15" });
  buy(c, "20.01", { fecha: "2026-07-16" });
  const ids = (q: string) => R5(c, q).items.map((i) => i.id).sort();
  expect(ids(`${base}&${rng}&importeMin=10&importeMax=20`)).toEqual([lo, hi].sort());
  expect(ids(`${base}&${rng}&importeMin=10.00&importeMax=10.00`)).toEqual([lo]);
  expect(ids(`${base}&${rng}&importeMin=20&importeMax=20`)).toEqual([hi]);
  expect(ids(`${base}&${rng}&importeMin=9.99&importeMax=9.99`).length).toBe(1);
  expect(ids(`${base}&${rng}&importeMin=0&importeMax=0`)).toEqual([]);
  expect(ids(`${base}&desde=2026-07-01&hasta=2026-07-31&importeMin=10&importeMax=20`)).toEqual([lo, hi].sort());
  expect(ids(`${base}&desde=2026-07-02&hasta=2026-07-30&importeMin=10&importeMax=20`)).toEqual([]);
  c.db.close();
});

test("AC-D33 R5 (QA): un solo extremo de fecha se acepta y ninguno da 422", () => {
  const c = setup();
  buy(c, "10", { fecha: "2026-07-10" });
  buy(c, "11", { fecha: "2026-07-20" });
  expect(R5(c, `${base}&desde=2026-07-20`).total).toBe(1);
  expect(R5(c, `${base}&desde=2026-07-10`).total).toBe(2);
  expect(R5(c, `${base}&hasta=2026-07-10`).total).toBe(1);
  expect(R5(c, `${base}&hasta=2026-07-19`).total).toBe(1);
  expect(codeOf(() => R5(c, base))).toEqual({ status: 422, code: "VALIDATION" });
  expect(codeOf(() => R5(c, `${base}&importeMin=1`))).toEqual({ status: 422, code: "VALIDATION" });
  c.db.close();
});

test("AC-D33 R5 (QA): importes hostiles dan 422 y un importe enorme se compara sin pérdida de precisión", () => {
  const c = setup();
  const small = buy(c, "10");
  const q = (v: string) => `${base}&${rng}&importeMin=${encodeURIComponent(v)}`;
  for (const v of ["1e3", " 5", "5 ", "\uFF15", "+5", "-0", "0x10", "1.234", ".5", "5.", "", ].filter(Boolean))
    expect([v, codeOf(() => R5(c, q(v)))]).toEqual([v, { status: 422, code: "VALIDATION" }]);
  // En importeMax también
  expect(codeOf(() => R5(c, `${base}&${rng}&importeMax=%EF%BC%95`))).toEqual({ status: 422, code: "VALIDATION" });
  // Más allá del rango técnico de céntimos (bigint con signo de 64 bits): 422, nunca redondeo
  expect(codeOf(() => R5(c, q("99999999999999999.99")))).toEqual({ status: 422, code: "VALIDATION" });
  // Máximo representable: válido y exacto
  const max = "92233720368547758.07";
  expect(R5(c, `${base}&${rng}&importeMax=${max}`).items.map((i) => i.id)).toEqual([small]);
  expect(R5(c, q(max)).total).toBe(0);
  expect(R5(c, `${base}&${rng}&importeMin=0&importeMax=${max}`).total).toBe(1);
  // Precisión: 2^53+1 céntimos (90071992547409.93 EUR) no se confunde con 2^53 en float
  expect(R5(c, `${base}&${rng}&importeMin=90071992547409.93&importeMax=${max}`).total).toBe(0);
  // Compra por encima de 2^53 céntimos comparada exactamente
  c.db.run("UPDATE movimientos SET importe=9007199254740993 WHERE id=?", [small]);
  expect(R5(c, `${base}&${rng}&importeMin=90071992547409.93&importeMax=90071992547409.93`).items.map((i) => i.id)).toEqual([small]);
  expect(R5(c, `${base}&${rng}&importeMax=90071992547409.92`).total).toBe(0);
  expect(R5(c, `${base}&${rng}&importeMin=90071992547409.94`).total).toBe(0);
  expect(R5(c, `${base}&${rng}`).items[0].importe).toBe("90071992547409.93");
  c.db.close();
});

test("AC-D33 R5 (QA): compra anulada excluida y la ficha de una devolución con compra anulada expone devolucionRevision", () => {
  const c = setup();
  const compra = buy(c, "50");
  const other = buy(c, "7");
  const dev = refund(c, compra, "20");
  const rev = (c.db.query("SELECT revision FROM movimiento_devolucion WHERE movimiento=?").get(dev) as { revision: number }).revision;
  c.db.run("UPDATE movimientos SET anulado=1 WHERE id=?", [compra]);
  expect(R5(c, `${base}&${rng}`).items.map((i) => i.id)).toEqual([other]);
  expect(R5(c, `${base}&${rng}`).total).toBe(1);
  const before = snapshot(c.db);
  const f = getMovement(c.db, dev);
  expect(f.devolucionRevision).toBe(rev);
  expect(f.movimiento.devolucion!.revision).toBe(rev);
  const fc = getComidaMovement(c.db, dev);
  expect(fc.devolucionRevision).toBe(rev);
  expect(fc.devolucion!.revision).toBe(rev);
  expect(snapshot(c.db)).toBe(before);
  c.db.close();
});

test("AC-D33 R5 (QA): Terminal con régimen Comida activo no aparece, y la compra individual del saldo Comida sí", () => {
  const c = setup();
  const ready = prepareRegimen(
    c.db,
    { saldo: c.account.id, cicloCorte: c.cycle1.id, apertura: "100", evidencia: "Extracto ficticio", cobertura: "Verificable", motivo: "Preparación ficticia" },
    randomUUID(),
    now,
  );
  activateRegimen(c.db, { revision: ready.regimen.regimen!.revision, motivo: "Activación ficticia", confirmar: true }, randomUUID(), now);
  const term = terminalSaldo(c);
  const normal = buy(c, "10");
  const agregado = buy(c, "12", { saldo: term.id });
  const out = R5(c, `${base}&desde=2026-07-01&hasta=2026-07-31`);
  expect(out.items.map((i) => i.id)).toEqual([normal]);
  expect(out.items.map((i) => i.id)).not.toContain(agregado);
  expect(out.total).toBe(1);
  c.db.close();
});
