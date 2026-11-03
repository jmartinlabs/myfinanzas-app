import { test, expect } from "bun:test";
import { HttpApp } from "@effect/platform";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { createClassification } from "./clasificacion";
import { createSaldo } from "./saldos";
import { createCycle, cycleContext } from "./ciclos";
import { previewMovement, writeMovement } from "./movimientos";
import { createAnticipo } from "./anticipos";
import {
  createCompartido,
  createParticipante,
  getCompartido,
} from "./compartidos";

const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas locales " + randomUUID();
const now = Date.parse("2027-02-10T12:00:00Z");

const ignoredTables = new Set([
  "sessions",
  "auth_events",
  "auth_limits",
  "challenges",
  "bootstrap",
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

function fixture() {
  const db = openDatabase(":memory:");
  const key = randomBytes(32);
  let cookie = "",
    csrf = "";
  const handler = HttpApp.toWebHandler(
    createApp(db, { key, origin, now: () => now }),
  );
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
    const r = await handler(
      new Request(origin + path, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    for (const set of r.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie
        .split("; ")
        .filter((p) => p && !p.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = await r.json();
    if (data.csrf) csrf = data.csrf;
    return { status: r.status, data, headers: r.headers };
  }
  async function startEnrollment() {
    const bootstrap = provision(db, now);
    const response = await request("/api/auth/enroll", "POST", {
      token: bootstrap,
      password,
    });
    expect(response.status).toBe(200);
    return response.data.secret as string;
  }
  async function enroll() {
    const secret = await startEnrollment();
    const response = await request("/api/auth/mfa", "POST", {
      code: totp(secret).generate({ timestamp: now }),
    });
    expect(response.status).toBe(200);
    return secret;
  }
  return {
    db,
    request,
    startEnrollment,
    enroll,
    get cookie() {
      return cookie;
    },
    get csrf() {
      return csrf;
    },
  };
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
  const suffix = randomUUID().slice(0, 8);
  const sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub ficticia " + cat + " " + suffix, padre: cat },
    randomUUID(),
    now,
  );
  return createClassification(
    db,
    "partidas",
    { nombre: "Partida ficticia " + cat + " " + suffix, padre: sub.id },
    randomUUID(),
    now,
  ).id;
}

function saldo(db: Database, name: string) {
  return createSaldo(
    db,
    {
      nombre: name,
      tipo: "Efectivo",
      control: "Movimientos",
      saldoApertura: "1000",
      fechaApertura: "2026-01-01",
      permiteSalidaExterior: true,
    },
    randomUUID(),
    now,
  ).id;
}

function cycle(db: Database, inicio: string, s0 = "0") {
  return createCycle(
    db,
    {
      inicio,
      saldoInicialComida: s0,
      contextRevision: cycleContext(db).revision,
    },
    randomUUID(),
    now,
  ).ciclo;
}

function add(db: Database, body: Record<string, unknown>) {
  const plan = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    {
      ...body,
      fingerprint: plan.fingerprint,
      contextRevision: plan.contextRevision,
      aceptarCoincidencia: true,
    },
    randomUUID(),
    null,
    false,
    now,
  ).movimiento;
}

function sharedCase(
  db: Database,
  participants: {
    nombre: string;
    rol: "Titular" | "Tercero";
    partes: number;
  }[],
) {
  const created = createCompartido(
    db,
    { nombre: "Caso compartido ficticio" },
    randomUUID(),
    now,
  );
  for (const p of participants)
    createParticipante(db, created.referencia.id, p, randomUUID(), now);
  return created.referencia.id;
}

function sharedExpense(
  db: Database,
  ref: string,
  payer: string,
  partidaId: string,
  importe: string,
  fecha = "2026-10-05",
) {
  return add(db, {
    tipo: "Gasto",
    fecha,
    importe,
    saldo: payer,
    partida: partidaId,
    referencia: ref,
    concepto: "Gasto compartido ficticio",
    nota: "",
  });
}

function sharedContribution(
  db: Database,
  ref: string,
  destino: string,
  participante: string,
  importe: string,
  fecha = "2026-10-10",
) {
  return add(db, {
    tipo: "Transferencia",
    fecha,
    importe,
    origen: "S000",
    destino,
    referencia: ref,
    concepto: "Aportación ficticia de tercero",
    nota: "",
    compartido: {
      participante,
      evidencia: "Extracto bancario ficticio",
      procedencia: "Documento bancario",
    },
  });
}

const participant = (db: Database, ref: string, nombre: string) =>
  getCompartido(db, ref).participantes.find((p) => p.nombre === nombre)!;

function anticipoTransfer(
  db: Database,
  ref: string,
  importe: string,
  fecha: string,
) {
  return add(db, {
    tipo: "Transferencia",
    fecha,
    importe,
    origen: "S001",
    destino: "S002",
    referencia: ref,
    concepto: "Transferencia de anticipo ficticia",
    nota: "",
    anticipo: {
      rol: "Adelanto",
      origen: "S001",
      destino: "S002",
      evidencia: "declaración ficticia",
      procedencia: "registro explícito",
    },
  });
}

function seed(db: Database) {
  categories(db);
  const p13 = partida(db, "CAT013");
  const payer = saldo(db, "Banco pagador");
  const destination = saldo(db, "Cuenta destino");
  const c1 = cycle(db, "2026-10-01", "100");
  cycle(db, "2026-11-01", "0");

  const open = sharedCase(db, [
    { nombre: "Yo", rol: "Titular", partes: 1 },
    { nombre: "Bea", rol: "Tercero", partes: 1 },
    { nombre: "Álex", rol: "Tercero", partes: 1 },
  ]);
  sharedExpense(db, open, payer, p13, "450.00");
  sharedContribution(
    db,
    open,
    destination,
    participant(db, open, "Álex").id,
    "300.00",
  );

  const resolved = sharedCase(db, [
    { nombre: "Yo", rol: "Titular", partes: 1 },
    { nombre: "Bea", rol: "Tercero", partes: 1 },
  ]);
  sharedExpense(db, resolved, payer, p13, "100.00", "2026-10-06");
  sharedContribution(
    db,
    resolved,
    destination,
    participant(db, resolved, "Bea").id,
    "50.00",
    "2026-10-11",
  );

  const anticipo = createAnticipo(
    db,
    { nombre: "Anticipo ficticio" },
    randomUUID(),
    now,
  ).referencia.id;
  anticipoTransfer(db, anticipo, "100", "2026-02-03");

  return { p13, payer, destination, c1, open, resolved, anticipo };
}

function authedFixture() {
  const app = fixture();
  const data = seed(app.db);
  return { ...app, ...data };
}

const get = (app: ReturnType<typeof fixture>, path: string) =>
  app.request(path);

test("GET /api/pendientes sin sesión → 401 sin datos financieros", async () => {
  const app = authedFixture();
  try {
    const r = await app.request("/api/pendientes", "GET", undefined, {
      cookie: "",
    });
    expect(r.status).toBe(401);
    expect(r.data.code).toBe("AUTH_REQUIRED");
    expect(r.data.filas).toBeUndefined();
  } finally {
    app.db.close();
  }
});

test("GET /api/pendientes antes de MFA → 401", async () => {
  const app = fixture();
  try {
    seed(app.db);
    await app.startEnrollment();
    const r = await get(app, "/api/pendientes");
    expect(r.status).toBe(401);
    expect(r.data.code).toBe("AUTH_REQUIRED");
  } finally {
    app.db.close();
  }
});

test("GET /api/pendientes tras MFA → 200, no-store y cabeceras seguras", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/pendientes");
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("referrer-policy")).toBe("same-origin");
    expect(r.headers.get("x-frame-options")).toBe("DENY");
  } finally {
    app.db.close();
  }
});

test("GET /api/pendientes es solo lectura y no expone total económico", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/pendientes");
    expect(r.data.soloLectura).toBe(true);
    expect(r.data.sinTotalEconomico).toBe(true);
    expect("totalEconomico" in r.data).toBe(false);
    expect("suma" in r.data).toBe(false);
    const claves = r.data.filas.map((f: { claveEfimera: string }) => f.claveEfimera);
    expect(new Set(claves).size).toBe(claves.length);
  } finally {
    app.db.close();
  }
});

test("GET /api/pendientes/:tipo/:fuenteId sin sesión → 401", async () => {
  const app = authedFixture();
  try {
    const r = await app.request(
      `/api/pendientes/Compartido/${app.open}`,
      "GET",
      undefined,
      { cookie: "" },
    );
    expect(r.status).toBe(401);
  } finally {
    app.db.close();
  }
});

test("GET /api/conciliacion/ciclos/:id sin sesión → 401", async () => {
  const app = authedFixture();
  try {
    const r = await app.request(
      `/api/conciliacion/ciclos/${app.c1.id}`,
      "GET",
      undefined,
      { cookie: "" },
    );
    expect(r.status).toBe(401);
  } finally {
    app.db.close();
  }
});

test("POST /api/pendientes con Origin ajeno → 403 ORIGIN", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await app.request("/api/pendientes", "POST", {}, {
      origin: "https://example.invalid",
    });
    expect(r.status).toBe(403);
    expect(r.data.code).toBe("ORIGIN");
  } finally {
    app.db.close();
  }
});

test("POST /api/pendientes sin CSRF → 403 CSRF", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await app.request("/api/pendientes", "POST", {}, {
      "x-csrf-token": "",
    });
    expect(r.status).toBe(403);
    expect(r.data.code).toBe("CSRF");
  } finally {
    app.db.close();
  }
});

test("PATCH /api/pendientes autenticado → 404 y sin escritura", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const before = snapshot(app.db);
    const r = await app.request("/api/pendientes", "PATCH", {});
    expect(r.status).toBe(404);
    expect(snapshot(app.db)).toEqual(before);
  } finally {
    app.db.close();
  }
});

test("DELETE /api/pendientes/:tipo/:id autenticado → 404 y sin escritura", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const before = snapshot(app.db);
    const r = await app.request(`/api/pendientes/Compartido/${app.open}`, "DELETE");
    expect(r.status).toBe(404);
    expect(snapshot(app.db)).toEqual(before);
  } finally {
    app.db.close();
  }
});

test("POST /api/conciliacion/ciclos/:id autenticado → 404 y sin escritura", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const before = snapshot(app.db);
    const r = await app.request(
      `/api/conciliacion/ciclos/${app.c1.id}`,
      "POST",
      {},
    );
    expect(r.status).toBe(404);
    expect(snapshot(app.db)).toEqual(before);
  } finally {
    app.db.close();
  }
});

test("filtros por defecto: solo no resueltos y sin mezclar histórico", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/pendientes");
    const ids = r.data.filas.map((f: { fuente: { id: string } }) => f.fuente.id);
    expect(ids).toContain(app.open);
    expect(ids).not.toContain(app.resolved);
    expect(r.data.filtros.alcance).toBe("abiertos");
  } finally {
    app.db.close();
  }
});

test("filtro tipo=Compartido devuelve solo ese tipo", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/pendientes?tipo=Compartido");
    expect(r.data.filas.length).toBeGreaterThan(0);
    expect(r.data.filas.every((f: { tipo: string }) => f.tipo === "Compartido")).toBe(
      true,
    );
  } finally {
    app.db.close();
  }
});

test("filtro estado=Pendiente devuelve solo Pendiente", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/pendientes?estado=Pendiente");
    expect(r.data.filas.every((f: { estado: string }) => f.estado === "Pendiente")).toBe(
      true,
    );
  } finally {
    app.db.close();
  }
});

test("alcance=historico incluye Resuelto sin mezclarlo con abiertos", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const h = await get(app, "/api/pendientes?alcance=historico");
    expect(h.data.filas.some((f: { fuente: { id: string }; estado: string }) => f.fuente.id === app.resolved && f.estado === "Resuelto")).toBe(true);
    expect(
      h.data.filas.every((f: { estado: string }) => f.estado === "Resuelto"),
    ).toBe(true);
    expect(
      h.data.filas.some((f: { fuente: { id: string } }) => f.fuente.id === app.open),
    ).toBe(false);
    const a = await get(app, "/api/pendientes?alcance=abiertos");
    expect(a.data.filas.some((f: { estado: string }) => f.estado === "Resuelto")).toBe(
      false,
    );
  } finally {
    app.db.close();
  }
});

test("ficha Compartido Sin repartir sin hechos no aparece en abiertos", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const empty = createCompartido(
      app.db,
      { nombre: "Ficha vacía API ficticia" },
      randomUUID(),
      now,
    ).referencia.id;
    const a = await get(app, "/api/pendientes?tipo=Compartido");
    expect(
      a.data.filas.some(
        (f: { fuente: { id: string }; estado: string }) =>
          f.fuente.id === empty && f.estado === "No disponible",
      ),
    ).toBe(false);
    expect(
      a.data.filas.some((f: { fuente: { id: string } }) => f.fuente.id === app.open),
    ).toBe(true);
  } finally {
    app.db.close();
  }
});

test("estado=Resuelto sin alcance=historico → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/pendientes?estado=Resuelto");
    expect(r.status).toBe(422);
    expect(r.data.code).toBe("VALIDATION");
  } finally {
    app.db.close();
  }
});

test("estado=Resuelto con alcance=historico → 200", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/pendientes?estado=Resuelto&alcance=historico");
    expect(r.status).toBe(200);
    expect(
      r.data.filas.every((f: { estado: string }) => f.estado === "Resuelto"),
    ).toBe(true);
  } finally {
    app.db.close();
  }
});

test("filtros contradictorios tipo+Resuelto abiertos → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/pendientes?tipo=Compartido&estado=Resuelto");
    expect(r.status).toBe(422);
  } finally {
    app.db.close();
  }
});

test("filtro tipo inválido → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    expect((await get(app, "/api/pendientes?tipo=Otro")).status).toBe(422);
  } finally {
    app.db.close();
  }
});

test("filtro estado inválido → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    expect((await get(app, "/api/pendientes?estado=Otro")).status).toBe(422);
  } finally {
    app.db.close();
  }
});

test("filtro cobertura inválido → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    expect((await get(app, "/api/pendientes?cobertura=Otro")).status).toBe(422);
  } finally {
    app.db.close();
  }
});

test("filtro alcance inválido → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    expect((await get(app, "/api/pendientes?alcance=otro")).status).toBe(422);
  } finally {
    app.db.close();
  }
});

test("filtro ejercicio inválido → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    expect((await get(app, "/api/pendientes?ejercicio=26")).status).toBe(422);
  } finally {
    app.db.close();
  }
});

test("filtro ejercicio válido → 200", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/pendientes?ejercicio=2026");
    expect(r.status).toBe(200);
  } finally {
    app.db.close();
  }
});

test("texto de búsqueda demasiado largo → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/pendientes?texto=" + "a".repeat(121));
    expect(r.status).toBe(422);
  } finally {
    app.db.close();
  }
});

test("page=0 → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    expect((await get(app, "/api/pendientes?page=0")).status).toBe(422);
  } finally {
    app.db.close();
  }
});

test("pageSize=0 → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    expect((await get(app, "/api/pendientes?pageSize=0")).status).toBe(422);
  } finally {
    app.db.close();
  }
});

test("pageSize=101 → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    expect((await get(app, "/api/pendientes?pageSize=101")).status).toBe(422);
  } finally {
    app.db.close();
  }
});

test("paginación pageSize=2 conserva el total sin truncar", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const all = await get(app, "/api/pendientes?pageSize=100");
    const p1 = await get(app, "/api/pendientes?pageSize=2&page=1");
    expect(p1.status).toBe(200);
    expect(p1.data.filas).toHaveLength(2);
    expect(p1.data.total).toBe(all.data.total);
    expect(p1.data.page).toBe(1);
    expect(p1.data.pageSize).toBe(2);
  } finally {
    app.db.close();
  }
});

test("página fuera de rango devuelve lista vacía y total íntegro", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const all = await get(app, "/api/pendientes?pageSize=100");
    const r = await get(app, "/api/pendientes?page=99&pageSize=2");
    expect(r.status).toBe(200);
    expect(r.data.filas).toEqual([]);
    expect(r.data.total).toBe(all.data.total);
  } finally {
    app.db.close();
  }
});

test("filtro ciclo inexistente → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    expect((await get(app, "/api/pendientes?ciclo=999")).status).toBe(422);
  } finally {
    app.db.close();
  }
});

test("filtro ciclo válido incluye flujoBase E2.6 sin importes en la URL", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, `/api/pendientes?ciclo=${app.c1.id}`);
    expect(r.status).toBe(200);
    expect(r.data.flujoBase.cicloId).toBe(app.c1.id);
    expect(r.data.flujoBase.gastoBruto).toBe("550.00");
    const hrefs = r.data.filas.flatMap(
      (f: { enlaces: { href: string }[] }) => f.enlaces.map((e) => e.href),
    );
    for (const href of hrefs) {
      expect(href).not.toMatch(/\d+[.,]\d{2}/);
      expect(href).not.toContain("importe=");
    }
  } finally {
    app.db.close();
  }
});

test("detalle válido de Compartido → 200 con soloLectura", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, `/api/pendientes/Compartido/${app.open}`);
    expect(r.status).toBe(200);
    expect(r.data.soloLectura).toBe(true);
    expect(r.data.fila.fuente.id).toBe(app.open);
  } finally {
    app.db.close();
  }
});

test("detalle válido de Anticipo → 200", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, `/api/pendientes/Anticipo/${app.anticipo}`);
    expect(r.status).toBe(200);
    expect(r.data.fila.tipo).toBe("Anticipo");
  } finally {
    app.db.close();
  }
});

test("detalle de fuente inexistente → 404 seguro", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/pendientes/Compartido/REF999");
    expect(r.status).toBe(404);
    expect(r.data.code).toBe("NOT_FOUND");
    expect(JSON.stringify(r.data)).not.toContain("SELECT");
  } finally {
    app.db.close();
  }
});

test("detalle con tipo inválido → 422", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, `/api/pendientes/Otro/${app.open}`);
    expect(r.status).toBe(422);
  } finally {
    app.db.close();
  }
});

test("conciliación del último ciclo sin siguiente → 200 No disponible", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/conciliacion/ciclos/2");
    expect(r.status).toBe(200);
    expect(r.data.siguiente).toBeNull();
    expect(r.data.estado).toBe("No disponible");
    expect(r.data.foto).toBeNull();
  } finally {
    app.db.close();
  }
});

test("conciliación con siguiente y sin cobertura E3.5 → 200 No disponible", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, `/api/conciliacion/ciclos/${app.c1.id}`);
    expect(r.status).toBe(200);
    expect(r.data.estado).toBe("No disponible");
    expect(r.data.difS0Siguiente).toBeNull();
    expect(r.data.noEsCierreFinanciero).toBe(true);
  } finally {
    app.db.close();
  }
});

test("conciliación de ciclo inexistente → 404", async () => {
  const app = authedFixture();
  try {
    await app.enroll();
    const r = await get(app, "/api/conciliacion/ciclos/999");
    expect(r.status).toBe(404);
    expect(r.data.code).toBe("NOT_FOUND");
  } finally {
    app.db.close();
  }
});
