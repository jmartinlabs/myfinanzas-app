import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HttpApp } from "@effect/platform";
import { createApp } from "./app";
import { provision, totp } from "./auth";
import { createCycle, cycleContext } from "./ciclos";
import { createClassification } from "./clasificacion";
import { restaurarTriggerDevolucionV32 } from "./cierre-validacion-test-support";
import { writeComidaDevolucion } from "./comida";
import { prepareSchema } from "./database-schema";
import { previewMovement, writeMovement } from "./movimientos";
import { createSaldo } from "./saldos";
import { verifyContract } from "./schema-contract";
import { gateAbiertoParaPruebas } from "../test-support/devolucion-gate-abierto";
import { sembrarDevolucionHuerfana } from "../test-support/devoluciones-historicas";

process.env.NODE_ENV = "test";

/**
 * #597 · SPEC39 §3.2/§6/§11 — un histórico incoherente se conserva y se
 * diagnostica: ni la migración, ni la apertura, ni las lecturas, ni las
 * escrituras rechazadas cambian filas; nada se degrada a «Revisar» ni se sanea
 * en bloque. Base SQLite ficticia temporal.
 */
const now = Date.parse("2026-10-15T12:00:00.000Z");
const origin = "http://127.0.0.1:5173";
const identidad = { origin: "demo", key_hash: null } as const;
/** Tablas que la propia autenticación de la prueba escribe. */
const AUTH = [
  "schema_version",
  "owner",
  "bootstrap",
  "challenges",
  "sessions",
  "recovery",
  "auth_limits",
  "auth_events",
];

function filas(db: Database) {
  return (
    db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[]
  )
    .filter(({ name }) => !AUTH.includes(name))
    .map(({ name }) => [name, db.query(`SELECT * FROM "${name}"`).all()]);
}

function codigo(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return "ACEPTADA";
}

function escribir(
  db: Database,
  body: Record<string, unknown>,
  id: string | null = null,
  annul = false,
) {
  const plan = previewMovement(db, body, id, annul, now);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, contextRevision: plan.contextRevision },
    randomUUID(),
    id,
    annul,
    now,
    undefined,
    gateAbiertoParaPruebas,
  );
}

/** Construye hechos válidos y los vuelve incoherentes por SQL, como base v32. */
function sembrar(path: string) {
  const db = new Database(path, { strict: true });
  prepareSchema(db, identidad);
  const saldo = (nombre: string, control: string) =>
    createSaldo(
      db,
      { nombre, tipo: "Efectivo", control, saldoApertura: "1000", fechaApertura: "2026-01-01", permiteSalidaExterior: true },
      randomUUID(),
      now,
    );
  const cuenta = saldo("Cuenta ficticia", "Movimientos");
  const receptor = saldo("Receptor ficticio", "Movimientos");
  const agregado = saldo("Terminal ficticia", "Terminal");
  const categoria = createClassification(
    db,
    "categorias",
    { nombre: "Gasto ficticio", anual: "Gasto", mensual: "Gasto", referencia: false },
    randomUUID(),
  );
  const sub = createClassification(db, "subcategorias", { nombre: "Sub ficticia", padre: categoria.id }, randomUUID());
  db.run("INSERT INTO presupuestos VALUES('PRE900','Plan ficticio','Gasto real','S001','Activo',1,'f','f')");
  const partida = createClassification(
    db,
    "partidas",
    { nombre: "Partida ficticia", padre: sub.id, presupuesto: "PRE900" },
    randomUUID(),
  );
  createCycle(
    db,
    { inicio: "2026-07-01", saldoInicialComida: "0", contextRevision: cycleContext(db).revision },
    randomUUID(),
    now,
  );
  const compra = (concepto: string, fecha: string) =>
    escribir(db, {
      tipo: "Gasto",
      fecha,
      importe: "100",
      saldo: cuenta.id,
      partida: partida.id,
      concepto,
      nota: "",
    }).movimiento.id as string;
  const abono = (compraId: string, importe: string) => ({
    tipo: "Devolución de gasto",
    fecha: "2026-08-05",
    importe,
    saldo: receptor.id,
    concepto: `Abono ${compraId} ${importe}`,
    nota: "",
    devolucion: {
      compra: compraId,
      estado: "Verificado",
      elegibilidad: "Acreditada",
      evidenciaRelacion: "Evidencia ficticia",
      evidenciaOrigenTemporal: "Documento ficticio",
    },
  });
  const devolver = (compraId: string, importe: string) =>
    escribir(db, abono(compraId, importe)).movimiento.id as string;

  const anulada = compra("Compra que quedará anulada", "2026-07-11");
  const excedida = compra("Compra que quedará excedida", "2026-07-10");
  const terminal = compra("Compra que quedará Terminal", "2026-07-12");
  const retipada = compra("Compra que quedará retipificada", "2026-07-13");
  const sana = compra("Compra sana", "2026-07-14");
  const vinculos = {
    anulada: devolver(anulada, "30"),
    excedidaA: devolver(excedida, "40"),
    excedidaB: devolver(excedida, "41"),
    terminal: devolver(terminal, "30"),
    retipada: devolver(retipada, "30"),
  };
  const huerfana = sembrarDevolucionHuerfana(
    db,
    { fecha: "2026-08-06", importe: "9.00", saldo: receptor.id, concepto: "Huérfana ficticia" },
    now,
  );
  // Incoherencias que ninguna vía de escritura admite hoy (fixtures SQL ficticios).
  db.run("UPDATE movimientos SET anulado=1 WHERE id=?", [anulada]);
  db.run("UPDATE movimientos SET importe=6000 WHERE id=?", [excedida]);
  db.run("UPDATE movimientos SET origen=? WHERE id=?", [agregado.id, terminal]);
  db.run("UPDATE movimientos SET tipo='Transferencia',destino=?,partida=NULL WHERE id=?", [receptor.id, retipada]);
  restaurarTriggerDevolucionV32(db);
  db.exec("UPDATE schema_version SET version=32");
  expect(verifyContract(db, 32)).not.toBeNull();
  const antes = filas(db);
  db.close();
  return {
    antes,
    compras: { anulada, excedida, terminal, retipada, sana },
    vinculos,
    huerfana,
    abono,
    cuenta: cuenta.id,
    receptor: receptor.id,
    agregado: agregado.id,
    partida: partida.id,
  };
}

async function cliente(db: Database) {
  const handler = HttpApp.toWebHandler(
    createApp(db, { key: randomBytes(32), now: () => now, devolucionGate: gateAbiertoParaPruebas }),
  );
  let cookie = "",
    csrf = "";
  async function llamar(path: string, body?: unknown) {
    const response = await handler(
      new Request(origin + path, {
        method: body === undefined ? "GET" : "POST",
        headers: { origin, cookie, "x-csrf-token": csrf, "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
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
  const alta = await llamar("/api/auth/enroll", {
    token: provision(db, now),
    password: "Pruebas ficticias historicos " + randomUUID(),
  });
  await llamar("/api/auth/mfa", { code: totp(alta.data.secret).generate({ timestamp: now }) });
  return (path: string) => llamar(path);
}

test("§3.2/§6/§11: histórico incoherente intacto tras migrar, abrir, consultar y rechazar escrituras", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-historicos-"));
  try {
    const path = join(dir, "v32.sqlite");
    const w = sembrar(path);
    const { compras, vinculos } = w;

    // Migración v32→v33 y una segunda apertura: ni una fila distinta.
    for (let apertura = 0; apertura < 2; apertura++) {
      const abierta = new Database(path, { strict: true });
      prepareSchema(abierta, identidad);
      expect(verifyContract(abierta, 33)).toBe("C33-SPEC39-DEVOLUCION-TRIGGER");
      expect(filas(abierta)).toEqual(w.antes);
      abierta.close();
    }

    const db = new Database(path, { strict: true });
    prepareSchema(db, identidad);
    const get = await cliente(db);

    // Lecturas: R4 publica el diagnóstico definido por SPEC39 §5.2.
    const r4 = await get("/api/devoluciones/integridad");
    expect(r4.status).toBe(200);
    const resumen = r4.data.items.map((i: { categoria: string; id: string; causa: string }) => [i.categoria, i.id, i.causa]);
    for (const id of [vinculos.anulada, vinculos.terminal, vinculos.retipada])
      expect(resumen).toContainEqual(["vinculoInvalido", id, "compraInvalida"]);
    expect(resumen).toContainEqual(["sinVinculo", w.huerfana, "sinVinculo"]);
    expect(r4.data.items).toContainEqual(
      expect.objectContaining({
        categoria: "exceso",
        id: compras.excedida,
        importe: "21.00",
        derivado: { bruto: "60.00", exceso: "-21.00" },
        ids: [vinculos.excedidaA, vinculos.excedidaB],
      }),
    );
    // R1: compra anulada y excedida con diagnóstico; Terminal y no Gasto, 422.
    const anulada = await get(`/api/comida/compras/${compras.anulada}/devoluciones`);
    expect(anulada.status).toBe(200);
    expect(anulada.data.resumen).toMatchObject({ cobertura: "No disponible", causas: ["compraInvalida"], capacidadBancariaRestante: null });
    expect(anulada.data.items[0]).toMatchObject({ estado: "Verificado", diagnosticos: [{ codigo: "COMPRA_ANULADA" }] });
    const excedida = await get(`/api/comida/compras/${compras.excedida}/devoluciones`);
    expect(excedida.data.resumen).toMatchObject({ cobertura: "Parcial", capacidadBancariaRestante: null, devueltoVerificado: "81.00" });
    expect(excedida.data.items.map((i: { estado: string }) => i.estado)).toEqual(["Verificado", "Verificado"]);
    expect(excedida.data.items[0].diagnosticos).toContainEqual({ codigo: "EXCESO", exceso: "-21.00" });
    for (const id of [compras.terminal, compras.retipada])
      expect((await get(`/api/comida/compras/${id}/devoluciones`)).status).toBe(422);
    for (const id of [...Object.values(compras), ...Object.values(vinculos), w.huerfana])
      expect((await get(`/api/movimientos/${id}`)).status).toBe(200);
    expect((await get("/api/comida?estado=")).status).toBe(200);
    expect(filas(db)).toEqual(w.antes);

    // Escrituras incompatibles: rechazadas con rollback íntegro.
    const revision = (id: string) =>
      (db.query("SELECT revision FROM movimientos WHERE id=?").get(id) as { revision: number }).revision;
    const anular = (id: string) => () =>
      escribir(db, { revision: revision(id), motivo: "Anulación ficticia" }, id, true);
    const rectificarAbono = (id: string, importe: string) => () =>
      escribir(
        db,
        {
          revision: revision(id),
          motivo: "Rectificación ficticia",
          tipo: "Devolución de gasto",
          fecha: "2026-08-05",
          importe,
          saldo: w.receptor,
          concepto: "Concepto corregido",
          nota: "",
        },
        id,
      );
    const atribuir = (id: string, compra: string, conRevision = true) => () =>
      writeComidaDevolucion(
        db,
        id,
        {
          revision: revision(id),
          ...(conRevision ? { devolucionRevision: 1, motivo: "Atribución ficticia" } : {}),
          compra,
          estado: "Verificado",
          elegibilidad: "Acreditada",
          evidenciaRelacion: "Evidencia ficticia",
          evidenciaOrigenTemporal: "Documento ficticio",
        },
        randomUUID(),
        now,
        gateAbiertoParaPruebas,
      );
    const alta = (compra: string, estado: string) => () => {
      const body = w.abono(compra, "1");
      return escribir(db, { ...body, devolucion: { ...body.devolucion, estado } });
    };
    const rechazos: [string, () => unknown, string][] = [
      ["alta sobre anulada", alta(compras.anulada, "Verificado"), "VALIDATION"],
      ["rectificar abono de anulada", rectificarAbono(vinculos.anulada, "30"), "VALIDATION"],
      ["atribuir a anulada", atribuir(vinculos.anulada, compras.anulada), "VALIDATION"],
      [
        "rectificar excedida sin reducir",
        () =>
          escribir(
            db,
            {
              revision: revision(compras.excedida),
              motivo: "Rectificación ficticia",
              tipo: "Gasto",
              fecha: "2026-07-10",
              importe: "60",
              saldo: w.cuenta,
              partida: w.partida,
              concepto: "Concepto corregido",
              nota: "",
            },
            compras.excedida,
          ),
        "PURCHASE_BELOW_REFUNDED",
      ],
      ["anular excedida", anular(compras.excedida), "DEVOLUTION_LINKED"],
      ["alta Verificada sobre excedida", alta(compras.excedida, "Verificado"), "DEVOLUTION_EXCESS"],
      ["alta Revisar sobre excedida", alta(compras.excedida, "Revisar"), "DEVOLUTION_EXCESS"],
      ["rectificar abono excedido", rectificarAbono(vinculos.excedidaA, "40"), "DEVOLUTION_EXCESS"],
      ["sanear huérfana contra excedida", atribuir(w.huerfana, compras.excedida, false), "DEVOLUTION_EXCESS"],
      ["anular compra Terminal", anular(compras.terminal), "DEVOLUTION_LINKED"],
      ["alta sobre Terminal", alta(compras.terminal, "Verificado"), "VALIDATION"],
      ["atribuir a Terminal", atribuir(vinculos.terminal, compras.terminal), "VALIDATION"],
      ["alta sobre no Gasto", alta(compras.retipada, "Verificado"), "VALIDATION"],
      ["atribuir a no Gasto", atribuir(vinculos.retipada, compras.retipada), "VALIDATION"],
    ];
    for (const [caso, run, esperado] of rechazos) {
      expect([caso, codigo(run)]).toEqual([caso, esperado]);
      expect([caso, filas(db)]).toEqual([caso, w.antes]);
    }

    // Una escritura ajena y un saneamiento individual no arrastran a los demás.
    const vinculo = () =>
      db.query("SELECT * FROM movimiento_devolucion ORDER BY movimiento").all();
    const historico = vinculo();
    const auditoria = db.query("SELECT * FROM movimiento_devolucion_audit ORDER BY id").all();
    anular(compras.sana)();
    anular(vinculos.excedidaB)();
    expect(vinculo()).toEqual(historico);
    expect(db.query("SELECT * FROM movimiento_devolucion_audit ORDER BY id").all()).toEqual(auditoria);
    const saneada = await get(`/api/comida/compras/${compras.excedida}/devoluciones`);
    expect(saneada.data.resumen).toMatchObject({ devueltoVerificado: "40.00", capacidadBancariaRestante: "20.00" });
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
