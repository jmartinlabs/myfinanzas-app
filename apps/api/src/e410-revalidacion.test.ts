import { test, expect } from "bun:test";
import type { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { openDatabase } from "./database";
import { reabrirCierre } from "./e410";
import {
  getRevalidacion,
  type RevalidacionOptions,
  type RevalidacionProveedor,
} from "./e410-revalidacion";
import { Problem } from "./problem";

process.env.NODE_ENV = "test";

const now = Date.parse("2026-03-10T12:00:00Z");
const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas E4.10 revalidacion " + randomUUID();
const stamp = "2026-01-01T00:00:00.000Z";

function seedCycles(db: Database) {
  for (const [id, inicio] of [
    ["1", "2026-01-01"],
    ["2", "2026-02-01"],
    ["3", "2026-03-01"],
  ] as const)
    db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,?,?)", [
      id,
      inicio,
      10000,
      stamp,
    ]);
}

function seedClosure(
  db: Database,
  ciclo: string,
  version: number,
  inicio: string,
  fin: string,
  auxiliares = '{"anticipos":[],"compartidos":[],"nomina":[],"revisionComida":[],"deuda":[]}',
) {
  const creado = `2026-0${Math.min(version, 9)}-01T00:00:00.000Z`;
  const fp = "a".repeat(64);
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,
        creado_utc,motivo,fingerprint,estado)
       VALUES(?,?,?,?,10000,'usuario-unico',?,?,?,'Cerrado')`,
      [ciclo, version, inicio, fin, creado, version === 1 ? null : "Re-cierre", fp],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,
        fingerprint,app_version,schema_version,ventana_inicio,ventana_fin,
        saldo_inicial,estado_temporal,estado_hechos,estado_plan,hechos,plan,
        clasificacion,inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES(?,?,?,'usuario-unico',?,?,'0.0.0-fixture',26,?,?,10000,'Cerrado',
        'Sin hechos','SinPlan','{}','{}','{}','{}',?,'{}','{}','{}')`,
      [ciclo, version, creado, version === 1 ? null : "Re-cierre", fp, inicio, fin, auxiliares],
    );
    db.run(
      `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
        instante,actor) VALUES(?,?,'cierre',NULL,'{}',?,?,'usuario-unico')`,
      [ciclo, version, version === 1 ? null : "Re-cierre", creado],
    );
  })();
}

function seedPlan(
  db: Database,
  ciclo: string,
  revision: number,
  auditRevision?: number,
) {
  db.run(
    `INSERT OR IGNORE INTO presupuestos(id,nombre,fuente,destino,estado,
       revision,creado,actualizado)
     VALUES('PRE0001','Presupuesto ficticio','No aplica',NULL,'Activo',1,?,?)`,
    [stamp, stamp],
  );
  db.run(
    `INSERT INTO cycle_plans(ciclo,revision) VALUES(?,?)
     ON CONFLICT(ciclo) DO UPDATE SET revision=excluded.revision`,
    [ciclo, revision],
  );
  db.run(
    `INSERT INTO cycle_plan_lines(ciclo,presupuesto,base,esencial,del_mes)
     VALUES(?,'PRE0001',100,NULL,NULL)
     ON CONFLICT(ciclo,presupuesto) DO UPDATE SET base=excluded.base`,
    [ciclo],
  );
  if (auditRevision !== undefined)
    db.run(
      `INSERT INTO cycle_plan_audit(ciclo,presupuesto,revision,actor,instante,
         motivo,delta)
       VALUES(?,'PRE0001',?,'usuario-unico',?,NULL,'{}')`,
      [ciclo, auditRevision, stamp],
    );
}

function fixture(auxiliares?: string) {
  const db = openDatabase(":memory:");
  seedCycles(db);
  seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
  seedClosure(db, "2", 1, "2026-02-01", "2026-02-28", auxiliares);
  reabrirCierre(
    db,
    "2",
    { versionEsperada: 1, motivo: "Motivo de reapertura E4.10" },
    "reapertura-" + randomUUID(),
    { actor: "Alex" },
    now,
  );
  return db;
}

function snapshot(db: Database) {
  return {
    ciclos: db.query("SELECT * FROM ciclos ORDER BY id").all(),
    planes: db.query("SELECT * FROM cycle_plans ORDER BY ciclo").all(),
    lineas: db.query("SELECT * FROM cycle_plan_lines ORDER BY ciclo").all(),
    planAudit: db.query("SELECT * FROM cycle_plan_audit ORDER BY id").all(),
    presupuestos: db.query("SELECT * FROM presupuestos ORDER BY id").all(),
    fotos: db.query("SELECT * FROM fotos_cierre ORDER BY ciclo,version").all(),
    reaperturas: db.query("SELECT * FROM reaperturas ORDER BY id").all(),
    activa: db.query("SELECT * FROM reapertura_activa").all(),
    audit: db.query("SELECT * FROM cierre_audit ORDER BY id").all(),
    general: db.query("SELECT * FROM audit ORDER BY id").all(),
  };
}

function problemOf(fn: () => unknown): Problem {
  try {
    fn();
  } catch (error) {
    if (error instanceof Problem) return error;
    throw error;
  }
  throw new Error("Se esperaba un Problem y no se lanzó.");
}

function check(result: ReturnType<typeof getRevalidacion>, clave: string) {
  return result.comprobaciones.find((item) => item.clave === clave)!;
}

test("E4.10 I3 revalidación: sin E4.5 ni agregados no bloquea y no declara verificado", () => {
  const db = fixture();
  try {
    seedPlan(db, "3", 1);
    const before = snapshot(db);
    const result = getRevalidacion(db, "2");
    expect(snapshot(db)).toEqual(before);
    expect(result.estado).toBe("Parcial");
    expect(result.bloquea).toBe(false);
    expect(result.version).toBe(1);

    const precontrol = check(result, "precontrolE45");
    expect(precontrol.estado).toBe("NoDisponible");
    expect(precontrol.codigo).toBe("E4_5_NO_DISPONIBLE");
    expect(precontrol.motivo).toContain("E4.5");
    expect(precontrol.comparado).toBeNull();

    const agregados = check(result, "agregadosE411");
    expect(agregados.estado).toBe("NoDisponible");
    expect(agregados.codigo).toBe("E4_11_NO_DISPONIBLE");
    expect(agregados.motivo).toContain("E4.11");
    expect(agregados.comparado).toBeNull();

    expect(check(result, "version").estado).toBe("Verificado");
    expect(check(result, "cierrePosterior").estado).toBe("Verificado");
    expect(check(result, "fotosPosteriores").estado).toBe("Verificado");
    expect(check(result, "s0PlanSiguiente")).toMatchObject({
      estado: "Verificado",
      comparado: {
        siguiente: { id: "3", inicio: "2026-03-01" },
        plan: { estado: "Capturado", revision: 1, lineas: 1 },
      },
    });
    expect(check(result, "auxiliares").estado).toBe("Verificado");
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: E4.5 y agregados coherentes quedan verificados y no modifican nada", () => {
  const db = fixture();
  try {
    const before = snapshot(db);
    const options: RevalidacionOptions = {
      precontrol: () => ({
        estado: "Verificado",
        datos: { precontrol: "coherente", valores: { neto: "100.00" } },
      }),
      agregados: () => ({
        estado: "Verificado",
        datos: { agregados: "coherente", version: 1 },
      }),
    };
    const result = getRevalidacion(db, "2", options);
    expect(result.estado).toBe("Verificado");
    expect(result.bloquea).toBe(false);
    expect(check(result, "precontrolE45")).toMatchObject({
      estado: "Verificado",
      motivo: null,
      comparado: { precontrol: "coherente" },
    });
    expect(check(result, "agregadosE411")).toMatchObject({
      estado: "Verificado",
      motivo: null,
    });
    expect(snapshot(db)).toEqual(before);
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: contradicción material bloquea y conserva valores comparados", () => {
  const db = fixture();
  try {
    const before = snapshot(db);
    const result = getRevalidacion(db, "2", {
      precontrol: () => ({
        estado: "Contradiccion",
        motivo: "El precontrol contradice el cierre reabierto.",
        esperado: { neto: "100.00" },
        observado: { neto: "90.00" },
      }),
    });
    expect(result.estado).toBe("Bloqueante");
    expect(result.bloquea).toBe(true);
    expect(result.bloqueos).toContain("precontrolE45");
    expect(check(result, "precontrolE45")).toMatchObject({
      estado: "Bloqueante",
      codigo: "REVALIDACION_BLOQUEANTE",
      comparado: {
        esperado: { neto: "100.00" },
        observado: { neto: "90.00" },
      },
    });
    expect(snapshot(db)).toEqual(before);
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: datos ilegibles bloquean y no se asumen no bloqueantes", () => {
  const db = fixture();
  try {
    for (const proveedor of [
      () => {
        throw new Error("fuente ilegible");
      },
      () => ({ estado: "Ilegible", motivo: "JSON corrupto" }) as const,
      () => ({ estado: "NoDisponible" }) as never,
      () => ({ estado: "Aviso", motivo: "Diferencia", acreditacion: "" }) as const,
      () => ({ estado: "Verificado" }) as const,
    ]) {
      const result = getRevalidacion(db, "2", { precontrol: proveedor });
      expect(result.estado).toBe("Bloqueante");
      expect(result.bloquea).toBe(true);
      expect(check(result, "precontrolE45").estado).toBe("Bloqueante");
    }
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: Verificado vacío y avisos sin valores bloquean", () => {
  const db = fixture();
  try {
    const proveedores: RevalidacionProveedor[] = [
      () => ({ estado: "Verificado", datos: {} }),
      () => ({ estado: "Verificado", datos: [] }),
      () => ({ estado: "Contradiccion", motivo: "Contradicción sin valores" }),
      () => ({
        estado: "Aviso",
        motivo: "Diferencia sin valores",
        acreditacion: "Acreditación ficticia",
      }),
    ];
    for (const precontrol of proveedores) {
      const result = getRevalidacion(db, "2", { precontrol });
      const item = check(result, "precontrolE45");
      expect(item.estado).toBe("Bloqueante");
      expect(item.motivo).toMatch(/datos comparables|valores comparados/);
    }
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: una diferencia no material acreditada es aviso, no bloqueo", () => {
  const db = fixture();
  try {
    const before = snapshot(db);
    const result = getRevalidacion(db, "2", {
      precontrol: () => ({
        estado: "Aviso",
        motivo: "El redondeo de presentación difiere; no afecta a los hechos.",
        acreditacion: "Diferencia declarada de presentación; no material.",
        esperado: { neto: "100.00" },
        observado: { neto: "100.001" },
      }),
    });
    expect(result.estado).toBe("ConAvisos");
    expect(result.bloquea).toBe(false);
    expect(result.avisos).toContain("precontrolE45");
    expect(check(result, "precontrolE45")).toMatchObject({
      estado: "Aviso",
      codigo: "AVISO_NO_MATERIAL",
      comparado: {
        esperado: { neto: "100.00" },
        observado: { neto: "100.001" },
        acreditacion: "Diferencia declarada de presentación; no material.",
      },
    });
    expect(snapshot(db)).toEqual(before);
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: una fuente E4.5 que aparece después entra en la siguiente lectura", () => {
  const db = fixture();
  try {
    const first = getRevalidacion(db, "2");
    expect(check(first, "precontrolE45").estado).toBe("NoDisponible");
    const second = getRevalidacion(db, "2", {
      precontrol: () => ({
        estado: "Verificado",
        datos: { precontrol: "disponible en la segunda lectura" },
      }),
    });
    expect(check(second, "precontrolE45").estado).toBe("Verificado");
    // The previous result is immutable evidence; it is not retroactively
    // rewritten when the source appears.
    expect(check(first, "precontrolE45").estado).toBe("NoDisponible");
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: una ventana congelada incoherente con el ciclo siguiente bloquea", () => {
  const db = openDatabase(":memory:");
  try {
    seedCycles(db);
    seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
    seedClosure(db, "2", 1, "2026-02-01", "2026-02-20");
    reabrirCierre(
      db,
      "2",
      { versionEsperada: 1, motivo: "Ventana incoherente" },
      "reapertura-" + randomUUID(),
      { actor: "Alex" },
      now,
    );
    const result = getRevalidacion(db, "2");
    expect(result.estado).toBe("Bloqueante");
    expect(result.bloquea).toBe(true);
    expect(check(result, "s0PlanSiguiente")).toMatchObject({
      estado: "Bloqueante",
      codigo: "S0_PLAN_INCOHERENTE",
      comparado: {
        finFoto: "2026-02-20",
        esperadoFin: "2026-02-28",
      },
    });
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: el ciclo siguiente se contrasta con su fin real", () => {
  const db = fixture();
  try {
    db.run(
      `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
         partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
         capital,intereses)
       VALUES('8100','2026-03-10','Ingreso',1000,'S000','S001','Nómina',
         NULL,NULL,'Nómina ficticia','',0,1,?,?,NULL,NULL)`,
      [stamp, stamp],
    );
    db.run("INSERT INTO payroll(id,revision,data) VALUES('P1',1,'{}')");
    db.run(
      `INSERT INTO payroll_allocations(paga,movimiento,importe,
         revision_movimiento,evidencia)
       VALUES('P1','8100','1000',1,'Evidencia ficticia')`,
    );
    const result = getRevalidacion(db, "2");
    expect(check(result, "auxiliares")).toMatchObject({
      estado: "Verificado",
      comparado: {
        rangoSiguiente: { inicio: "2026-03-01", fin: "2026-03-10" },
        cicloSiguiente: { nomina: 1 },
      },
    });
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: un cierre posterior devuelve Bloqueante sin lanzar", () => {
  const db = fixture();
  try {
    seedClosure(db, "3", 1, "2026-03-01", "2026-03-31");
    const result = getRevalidacion(db, "2");
    expect(result.estado).toBe("Bloqueante");
    expect(result.bloquea).toBe(true);
    expect(check(result, "cierrePosterior")).toMatchObject({
      estado: "Bloqueante",
      codigo: "CIERRE_POSTERIOR",
      comparado: {
        cierrePosterior: {
          ciclo: "3",
          version: 1,
          fin: "2026-03-31",
        },
        finVentana: "2026-02-28",
      },
    });
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: una versión posterior del mismo ciclo devuelve Bloqueante", () => {
  const db = fixture();
  try {
    seedClosure(db, "2", 2, "2026-02-01", "2026-02-28");
    const result = getRevalidacion(db, "2");
    expect(result.estado).toBe("Bloqueante");
    expect(result.bloquea).toBe(true);
    expect(check(result, "version")).toMatchObject({
      estado: "Bloqueante",
      codigo: "ESTADO_INCONSISTENTE",
      comparado: { versionOrigen: 1, ultimaVersion: 2 },
    });
    expect(check(result, "fotosPosteriores")).toMatchObject({
      estado: "Bloqueante",
      codigo: "VERSION_POSTERIOR",
      comparado: { versionOrigen: 1, ultimaVersion: 2 },
    });
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: una proyección inconsistente devuelve Bloqueante sin lanzar", () => {
  const db = fixture();
  try {
    const reopeningId = (
      db.query("SELECT reapertura_id id FROM reapertura_activa").get() as {
        id: number;
      }
    ).id;
    db.run(
      `INSERT INTO reaperturas(ciclo,version_origen,tipo,actor,creado_utc,
        motivo,fingerprint_peticion,version_esperada,clave_intento,correlacion,
        reapertura_origen,resultado)
       VALUES('2',1,'cancelacion','usuario-unico',?,'Cancelación ficticia',?,
        1,'clave-cancelacion','corr',?,'Cancelada')`,
      [stamp, "b".repeat(64), reopeningId],
    );
    const cancelId = (
      db.query("SELECT id FROM reaperturas WHERE tipo='cancelacion'").get() as {
        id: number;
      }
    ).id;
    db.run("UPDATE reapertura_activa SET reapertura_id=? WHERE id=1", [cancelId]);
    const result = getRevalidacion(db, "2");
    expect(result.estado).toBe("Bloqueante");
    expect(result.bloquea).toBe(true);
    expect(result.reapertura).toBeNull();
    expect(check(result, "version")).toMatchObject({
      estado: "Bloqueante",
      codigo: "ESTADO_INCONSISTENTE",
    });
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: un plan con revisión incoherente bloquea", () => {
  const db = fixture();
  try {
    seedPlan(db, "3", 1, 2);
    const result = getRevalidacion(db, "2");
    expect(result.estado).toBe("Bloqueante");
    expect(result.bloquea).toBe(true);
    expect(check(result, "s0PlanSiguiente")).toMatchObject({
      estado: "Bloqueante",
      codigo: "PLAN_NO_VERIFICABLE",
      comparado: {
        plan: {
          estado: "PlanNoVerificable",
          revision: 1,
          auditRevision: 2,
          lineas: 1,
        },
      },
    });
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: auxiliares de la foto ausentes bloquean", () => {
  const db = fixture("{}");
  try {
    const result = getRevalidacion(db, "2");
    expect(result.estado).toBe("Bloqueante");
    expect(result.bloquea).toBe(true);
    expect(check(result, "auxiliares")).toMatchObject({
      estado: "Bloqueante",
      codigo: "REVALIDACION_BLOQUEANTE",
    });
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: un auxiliar capturado que ya no existe bloquea", () => {
  const aux = JSON.stringify({
    anticipos: [
      {
        movimiento: "9999",
        referencia: "A1",
        rol: "Titular",
        importe: "100",
        fecha: "2026-02-10",
      },
    ],
    compartidos: [],
    nomina: [],
    revisionComida: [],
    deuda: [],
  });
  const db = fixture(aux);
  try {
    const result = getRevalidacion(db, "2");
    expect(result.estado).toBe("Bloqueante");
    expect(result.bloquea).toBe(true);
    expect(check(result, "auxiliares")).toMatchObject({
      estado: "Bloqueante",
      codigo: "AUXILIARES_INCOHERENTES",
    });
    expect(check(result, "auxiliares").comparado).toMatchObject({
      faltan: ["anticipos:9999|A1|Titular"],
    });
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: un auxiliar desvinculado dentro de la ventana es aviso", () => {
  const aux = JSON.stringify({
    anticipos: [
      {
        movimiento: "8002",
        referencia: "A1",
        rol: "Titular",
        importe: "500",
        fecha: "2026-02-05",
      },
    ],
    compartidos: [],
    nomina: [],
    revisionComida: [],
    deuda: [],
  });
  const db = fixture(aux);
  try {
    db.run(
      `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
         partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
         capital,intereses)
       VALUES('8002','2026-02-05','Transferencia',500,'S001','S002',NULL,
         NULL,NULL,'Movimiento ficticio auxiliar','',0,1,?,?,NULL,NULL)`,
      [stamp, stamp],
    );
    const result = getRevalidacion(db, "2");
    expect(result.bloquea).toBe(false);
    expect(result.avisos).toContain("auxiliares");
    expect(check(result, "auxiliares")).toMatchObject({
      estado: "Aviso",
      codigo: "AUXILIARES_RECTIFICADOS",
      comparado: {
        faltan: ["anticipos:8002|A1|Titular"],
        dangling: [],
      },
    });
  } finally {
    db.close();
  }
});

test("E4.10 AC19: un bloque auxiliar ausente bloquea y no se rellena desde v1", () => {
  // La foto v1 no contiene la clave `deuda`: no debe completarse con valores
  // antiguos ni declararse verificada. El comportamiento actual es fail-closed
  // (bloqueo), no `NoDisponible` por fuente; se documenta como límite de AC19.
  const db = fixture(
    '{"anticipos":[],"compartidos":[],"nomina":[],"revisionComida":[]}',
  );
  try {
    const before = snapshot(db);
    const result = getRevalidacion(db, "2");
    expect(result.estado).toBe("Bloqueante");
    expect(result.bloquea).toBe(true);
    expect(check(result, "auxiliares")).toEqual({
      clave: "auxiliares",
      estado: "Bloqueante",
      codigo: "REVALIDACION_BLOQUEANTE",
      motivo:
        "Una fuente auxiliar o el bloque de la foto no se pudo leer; no se acredita su ausencia de impacto.",
      comparado: null,
    });
    expect(snapshot(db)).toEqual(before);
  } finally {
    db.close();
  }
});

test("E4.10 I3 revalidación: exige una reapertura activa", () => {
  const db = openDatabase(":memory:");
  try {
    seedCycles(db);
    seedClosure(db, "1", 1, "2026-01-01", "2026-01-31");
    const error = problemOf(() => getRevalidacion(db, "1"));
    expect(error.status).toBe(409);
    expect(error.code).toBe("NO_REBIERTO");
  } finally {
    db.close();
  }
});

function apiHarness(db: Database) {
  const key = randomBytes(32);
  const handler = HttpApp.toWebHandler(
    createApp(db, { key, now: () => now }),
  );
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
        .filter((part) => part && !part.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = await response.json();
    if (data.csrf) csrf = data.csrf;
    return { status: response.status, data, headers: response.headers };
  }
  async function enroll() {
    const bootstrap = provision(db, now);
    const started = await request("/api/auth/enroll", "POST", {
      token: bootstrap,
      password,
    });
    expect(started.status).toBe(200);
    const verified = await request("/api/auth/mfa", "POST", {
      code: totp(started.data.secret).generate({ timestamp: now }),
    });
    expect(verified.status).toBe(200);
  }
  return { request, enroll };
}

test("E4.10 I3 API: GET /revalidacion es de solo lectura y POST no se admite", async () => {
  const db = fixture();
  const { request, enroll } = apiHarness(db);
  try {
    expect((await request("/api/cierres/2/revalidacion")).status).toBe(401);
    await enroll();

    const before = snapshot(db);
    const state = await request("/api/cierres/2/revalidacion");
    expect(state.status).toBe(200);
    expect(state.data).toMatchObject({
      ciclo: "2",
      estado: "Parcial",
      bloquea: false,
      version: 1,
      reapertura: { versionOrigen: 1 },
    });
    expect(state.data.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot(db)).toEqual(before);

    const post = await request("/api/cierres/2/revalidacion", "POST", {});
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET");
  } finally {
    db.close();
  }
});

test("E4.10 AC03: una revalidación bloqueante queda en el DTO y no persiste eventos", async () => {
  const db = fixture();
  const { request, enroll } = apiHarness(db);
  try {
    await enroll();
    seedClosure(db, "2", 2, "2026-02-01", "2026-02-28");
    const before = snapshot(db);

    const blocked = await request("/api/cierres/2/revalidacion");
    expect(blocked.status).toBe(200);
    expect(blocked.data).toMatchObject({
      estado: "Bloqueante",
      bloquea: true,
      version: 2,
    });
    expect(
      blocked.data.comprobaciones.find(
        (item: { clave: string }) => item.clave === "version",
      ),
    ).toMatchObject({
      estado: "Bloqueante",
      comparado: { versionOrigen: 1, ultimaVersion: 2 },
    });
    expect(
      blocked.data.comprobaciones.find(
        (item: { clave: string }) => item.clave === "fotosPosteriores",
      ),
    ).toMatchObject({
      estado: "Bloqueante",
      comparado: { versionOrigen: 1, ultimaVersion: 2 },
    });

    // El GET es de solo lectura: no añade eventos, auditoría, ventana ni
    // intentos. La evidencia de la revalidación bloqueada es el DTO; no se
    // persiste hasta que un re-cierre válido la incorpore a su auditoría.
    expect(snapshot(db)).toEqual(before);
    expect(
      (snapshot(db).audit as { accion: string }[]).filter(
        (row) => row.accion === "revalidacion",
      ),
    ).toEqual([]);
  } finally {
    db.close();
  }
});

test("E4.10 I3 API: cierre y versión posteriores devuelven 200 Bloqueante", async () => {
  const db = fixture();
  const { request, enroll } = apiHarness(db);
  try {
    await enroll();

    seedClosure(db, "3", 1, "2026-03-01", "2026-03-31");
    const laterClosure = await request("/api/cierres/2/revalidacion");
    expect(laterClosure.status).toBe(200);
    expect(laterClosure.data).toMatchObject({
      estado: "Bloqueante",
      bloquea: true,
      bloqueos: expect.arrayContaining(["cierrePosterior"]),
    });

    seedClosure(db, "2", 2, "2026-02-01", "2026-02-28");
    const laterVersion = await request("/api/cierres/2/revalidacion");
    expect(laterVersion.status).toBe(200);
    expect(laterVersion.data).toMatchObject({
      estado: "Bloqueante",
      bloquea: true,
      bloqueos: expect.arrayContaining(["version", "fotosPosteriores"]),
      version: 2,
    });
  } finally {
    db.close();
  }
});
