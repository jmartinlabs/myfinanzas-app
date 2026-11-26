import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { cycleMaster } from "./ciclos";
import { IMPACTOS_MATERIALES } from "./cierre-validacion-dto";
import { prepareSchema } from "./database-schema";
import { proyectarValidacion } from "./cierre-validacion-estado";
import { cicloDeFecha } from "./cierre-validacion-impacto";
import { previewValidacion, validarCiclo } from "./cierre-validacion-servicio";
import {
  confirmarRectificacion,
  previewRectificacion,
  type EntradaRectificacion,
  type PreviewRectificacionDto,
} from "./cierre-validacion-rectificaciones";
import { Problem } from "./problem";

/**
 * SPEC38 · I2 — rectificaciones estructurales de Inicio y S0 (§4.1).
 *
 * Estas pruebas ejercen el camino real de la ruta: preview no persistente,
 * confirmación atómica con motivo, revisión esperada y tokens de estado. Todas
 * las aserciones de estado se hacen sobre lo persistido (`SELECT` sobre el
 * maestro de ciclos, los hechos, la auditoría y `cierre_validacion`), y las
 * cifras se buscan donde la SPEC las permite —preview y recibo— y se prohíben
 * donde no: el detalle de la auditoría de validación.
 *
 * Fixture de §3.3/§4.1: cuatro ciclos consecutivos, de modo que el corregido
 * tenga predecesor y sucesor, y un gasto dentro de cada ventana.
 */

const T = "2026-01-01T00:00:00.000Z";
const T_VALIDAR = "2026-04-01T00:00:00.000Z";
const T_RECTIFICAR = "2026-04-05T00:00:00.000Z";
const T_REINTENTO = "2026-04-06T00:00:00.000Z";

const TABLAS = [
  "movimientos",
  "revision_comida",
  "ciclos",
  "audit",
  "cycle_audit",
  "cierre_validacion",
  "cierre_validacion_audit",
  "validacion_attempts",
] as const;

function store(): Database {
  const db = new Database(":memory:", { strict: true });
  prepareSchema(db, { origin: "demo", key_hash: null });
  return db;
}

function clasificacion(db: Database) {
  db.run(
    `INSERT INTO categorias VALUES('CAT0001','Ficticia',NULL,'Gasto','Gasto',0,'Activa',1,?,?)`,
    [T, T],
  );
  db.run(`INSERT INTO subcategorias VALUES('SUB0001','Ficticia','CAT0001','Activa',1,?,?)`, [
    T,
    T,
  ]);
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR0001','Ficticia','SUB0001','Activa',1,?,?)`,
    [T, T],
  );
}

function gasto(db: Database, id: string, fecha: string, importe = 1000) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,
       nota,anulado,revision,creado,actualizado)
     VALUES(?,?,'Gasto',?,'S001','S000',NULL,'PAR0001','Ficticio','',0,1,?,?)`,
    [id, fecha, importe, T, T],
  );
}

/** Abono bancario (§6.3 `d`): entrada de cuenta, sin subtipo ni Partida. */
function abono(db: Database, id: string, fecha: string, importe = 3000) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,
       nota,anulado,revision,creado,actualizado)
     VALUES(?,?,'Devolución de gasto',?,'S000','S001',NULL,NULL,'Abono ficticio','',0,1,?,?)`,
    [id, fecha, importe, T, T],
  );
}

/** Fila de Revisión Comida: sin ciclo propio, su ventana se deriva de `fecha`. */
function comida(db: Database, id: string, fecha: string, importe: number, concepto: string) {
  db.run(
    `INSERT INTO revision_comida(id,tipo,fecha,concepto,importe,direccion,es_devolucion,
       clasificacion,estado_vinculo,estado_registro,estado_trazabilidad,revision,creado,actualizado)
     VALUES(?,'Detalle',?,?,?,'Salida',0,'Comida','Sin vínculo','Vigente','Sin asignación',1,?,?)`,
    [id, fecha, concepto, importe, T, T],
  );
}

/** Cuatro ciclos (1 ene, 1 feb, 1 mar, 1 abr) con un gasto en cada ventana. */
function base(): Database {
  const db = store();
  clasificacion(db);
  const inicios = [
    ["1", "2026-01-01"],
    ["2", "2026-02-01"],
    ["3", "2026-03-01"],
    ["4", "2026-04-01"],
  ] as const;
  for (const [id, inicio] of inicios)
    db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,0,?)", [id, inicio, T]);
  const fechas = [
    ["1", "2026-01-10"],
    ["2", "2026-02-10"],
    ["3", "2026-03-10"],
    ["4", "2026-04-10"],
  ] as const;
  for (const [id, fecha] of fechas) gasto(db, id, fecha);
  return db;
}

function estadoCompleto(db: Database): Record<string, unknown[]> {
  return Object.fromEntries(
    TABLAS.map((tabla) => [tabla, db.query(`SELECT * FROM ${tabla}`).all()]),
  );
}

/** La tabla de Revisión Comida, tal cual: identidad, fecha e importe incluidos. */
function comidaFilas(db: Database) {
  return db.query("SELECT * FROM revision_comida ORDER BY id").all();
}

function fila(db: Database, cicloId: string) {
  return db
    .query(
      `SELECT revision,dirty,dirty_desde,dirty_ultimo,dirty_origen,dirty_motivos,
              huella_validacion,version_conjunto,revision_actor,revision_instante
         FROM cierre_validacion WHERE ciclo=?`,
    )
    .get(cicloId) as {
    revision: number;
    dirty: number;
    dirty_desde: string | null;
    dirty_ultimo: string | null;
    dirty_origen: string | null;
    dirty_motivos: string | null;
    huella_validacion: string | null;
    version_conjunto: string | null;
    revision_actor: string | null;
    revision_instante: string | null;
  } | null;
}

function eventos(db: Database) {
  return db
    .query(
      `SELECT id,ciclo,revision,accion,intento,detalle,huella_anterior,huella_posterior
         FROM cierre_validacion_audit ORDER BY id`,
    )
    .all() as {
    id: number;
    ciclo: string;
    revision: number;
    accion: string;
    intento: string | null;
    detalle: string;
    huella_anterior: string | null;
    huella_posterior: string | null;
  }[];
}

function ciclos(db: Database) {
  return db
    .query("SELECT id,inicio,saldo_comida,revision FROM ciclos ORDER BY inicio")
    .all() as { id: string; inicio: string; saldo_comida: number; revision: number }[];
}

function problemaDe(fn: () => unknown): {
  status?: number;
  code?: string;
  fields?: Record<string, string>;
  message: string;
} {
  try {
    fn();
  } catch (error) {
    const problema = error as Partial<Problem> & { message?: string };
    return {
      status: problema.status,
      code: problema.code,
      fields: problema.fields,
      message: String(problema.message ?? ""),
    };
  }
  return { message: "" };
}

function validar(db: Database, cicloId: string) {
  const preview = previewValidacion(db, cicloId);
  return validarCiclo(db, cicloId, {
    key: `clave-validar-r${cicloId}001`,
    fingerprint: preview.fingerprint,
    contextRevision: preview.contextRevision,
    impactRevision: preview.impactRevision,
    actor: "humano",
    instante: T_VALIDAR,
    // La fixture §6.3 tiene un abono huérfano en la ventana de C: la cobertura
    // de devoluciones es parcial y validar exige motivo humano (SPEC38 §5).
    motivo: "Cobertura parcial revisada",
  });
}

/** Deja validados los ciclos con Fin derivado (1–3). */
function baseValidada(): Database {
  const db = base();
  for (const cicloId of ["1", "2", "3"]) validar(db, cicloId);
  return db;
}

/**
 * §6.3: P 25/11 (financiado diciembre), C 25/12 (financiado enero) y D 25/01.
 * Compra p 10/12, compra q 27/12 y abono bancario d 28/12 dentro del tramo que
 * C cede a P al mover su Inicio; dos filas de Revisión Comida, una a cada lado
 * de la frontera vieja. P y C quedan validadas para observar la marca.
 */
function baseAnual(): Database {
  const db = store();
  clasificacion(db);
  for (const [id, inicio] of [
    ["1", "2026-11-25"],
    ["2", "2026-12-25"],
    ["3", "2027-01-25"],
  ] as const)
    db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,0,?)", [id, inicio, T]);
  gasto(db, "102", "2026-12-10", 10_000);
  gasto(db, "103", "2026-12-27", 6_000);
  abono(db, "104", "2026-12-28", 3_000);
  gasto(db, "105", "2027-02-10", 2_000);
  comida(db, "RC1", "2026-12-20", 1_500, "Comida previa");
  comida(db, "RC2", "2026-12-28", 800, "Comida del tramo");
  for (const cicloId of ["1", "2"]) validar(db, cicloId);
  return db;
}

/** Día civil siguiente, para comprobar que las ventanas no dejan huecos. */
function diaSiguiente(fecha: string): string {
  const valor = new Date(`${fecha}T00:00:00Z`);
  valor.setUTCDate(valor.getUTCDate() + 1);
  return valor.toISOString().slice(0, 10);
}

function cuerpo(extra: Partial<EntradaRectificacion> = {}): EntradaRectificacion {
  return {
    inicio: "2026-02-01",
    saldoInicialComida: "0",
    motivo: "Corrección estructural del ciclo",
    revision: 1,
    ...extra,
  };
}

function confirmar(
  db: Database,
  cicloId: string,
  preview: PreviewRectificacionDto,
  entrada: EntradaRectificacion,
  key: string,
  instante = T_RECTIFICAR,
) {
  return confirmarRectificacion(
    db,
    cicloId,
    {
      ...entrada,
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
    },
    key,
    Date.parse(instante),
  );
}

function sinCifras(valor: unknown): boolean {
  if (typeof valor === "number" || typeof valor === "bigint") return false;
  if (typeof valor === "string") return !/[0-9][.,][0-9]/.test(valor) && !valor.includes("€");
  if (Array.isArray(valor)) return valor.every(sinCifras);
  if (valor && typeof valor === "object")
    return Object.values(valor as Record<string, unknown>).every(sinCifras);
  return true;
}

/* ================================================================== *
 * §3.4/§4.1 · preview de Inicio y S0 (AC-36, AC-54, AC-39)
 * ================================================================== */

test("AC-36/AC-54 · el preview del Inicio no persiste y muestra ventana, vecinos y hechos reasignados", () => {
  const db = baseValidada();
  try {
    const antes = estadoCompleto(db);
    const entrada = cuerpo({ inicio: "2026-02-15", motivo: "Desplazar el Inicio" });
    const preview = previewRectificacion(db, "2", entrada);

    expect(preview.operacion).toBe("rectificar_inicio");
    expect(preview.ciclo).toBe("2");
    // Ventana antes/después del corregido, con el Fin que deriva del sucesor.
    expect(preview.ventana.antes).toEqual({
      inicio: "2026-02-01",
      fin: "2026-02-28",
      saldoInicialComida: "0.00",
    });
    expect(preview.ventana.despues).toEqual({
      inicio: "2026-02-15",
      fin: "2026-02-28",
      saldoInicialComida: "0.00",
    });
    // Vecinos: el predecesor conserva su Inicio y desplaza su Fin (termina la
    // víspera del Inicio corregido); el sucesor queda como frontera fija.
    expect(preview.ventana.predecesor).toEqual({
      id: "1",
      antes: { inicio: "2026-01-01", fin: "2026-01-31" },
      despues: { inicio: "2026-01-01", fin: "2026-02-14" },
    });
    expect(preview.ventana.sucesor).toEqual({
      id: "3",
      inicio: "2026-03-01",
      fin: "2026-03-31",
    });
    // El hecho que cambia de ventana se enumera con antes/después, sin tocar su
    // identidad ni su fecha (§4.1, AC-40).
    expect(preview.movimientosReasignados).toHaveLength(2);
    const reasignado = (
      preview.movimientosReasignados as {
        id: string;
        fecha: string;
        antes: { id: string } | null;
        despues: { id: string } | null;
      }[]
    ).find((movimiento) => movimiento.id === "2")!;
    expect(reasignado.fecha).toBe("2026-02-10");
    expect(reasignado.antes?.id).toBe("2");
    expect(reasignado.despues?.id).toBe("1");
    // Material: ventana del corregido y del predecesor.
    expect(preview.material).toBe(true);
    expect(preview.afectados.map((afectado) => afectado.ciclo)).toEqual(["1", "2"]);
    for (const afectado of preview.afectados)
      expect(afectado.motivos).toContain("VENTANA_CICLO");
    expect(preview.requiereMotivo).toBe(true);

    // Idempotente en la lectura y sin efectos: el maestro sigue igual.
    const repetido = previewRectificacion(db, "2", entrada);
    expect(repetido.fingerprint).toBe(preview.fingerprint);
    expect(repetido.contextRevision).toBe(preview.contextRevision);
    expect(repetido.impactRevision).toBe(preview.impactRevision);
    expect(estadoCompleto(db)).toEqual(antes);
  } finally {
    db.close();
  }
});

test("AC-39 · el preview de S0 no reasigna hechos, no mueve ventanas y nombra S0_CICLO", () => {
  const db = baseValidada();
  try {
    const antes = estadoCompleto(db);
    const preview = previewRectificacion(
      db,
      "1",
      cuerpo({ inicio: "2026-01-01", saldoInicialComida: "500", motivo: "Ajuste de S0" }),
    );

    expect(preview.operacion).toBe("rectificar_s0");
    expect(preview.movimientosReasignados).toEqual([]);
    expect(preview.ventana.antes.inicio).toBe("2026-01-01");
    expect(preview.ventana.despues.inicio).toBe("2026-01-01");
    expect(preview.ventana.antes.fin).toBe("2026-01-31");
    expect(preview.ventana.despues.fin).toBe("2026-01-31");
    expect(preview.ventana.despues.saldoInicialComida).toBe("500.00");
    // Sin predecesor no hay ventana que desplazar: el vecino se publica null.
    expect(preview.ventana.predecesor).toBeNull();
    expect(preview.afectados.map((afectado) => afectado.ciclo)).toEqual(["1"]);
    expect(preview.afectados[0]?.motivos).toEqual(["S0_CICLO"]);
    expect(preview.afectados[0]?.estadoValidacion).toBe("Validada");
    expect(preview.afectados[0]?.dirtyPrevio).toBe(false);
    expect(estadoCompleto(db)).toEqual(antes);
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * §4.1/AC-38 · integridad del maestro
 * ================================================================== */

test("AC-38 · el maestro rechaza duplicados, cronología rota, mes financiado ocupado y motivo/saldo ausentes", () => {
  const db = baseValidada();
  try {
    const antes = estadoCompleto(db);
    const intento = (entrada: EntradaRectificacion, cicloId = "2") =>
      problemaDe(() => previewRectificacion(db, cicloId, entrada));

    // Inicio ya existente.
    const duplicado = intento(cuerpo({ inicio: "2026-01-01" }));
    expect(duplicado.status).toBe(409);
    expect(duplicado.code).toBe("DUPLICATE_CYCLE");

    // Otro Inicio que cae en un mes financiado ya ocupado por el ciclo 1.
    const mesOcupado = intento(cuerpo({ inicio: "2026-01-15" }));
    expect(mesOcupado.status).toBe(409);
    expect(mesOcupado.code).toBe("DUPLICATE_CYCLE");

    // Cruzar el sucesor para desplazar su ventana: prohibido por cronología
    // (el mes financiado del destino está libre, así que no lo tapa el duplicado).
    const cruza = intento(cuerpo({ inicio: "2026-05-10" }));
    expect(cruza.status).toBe(409);
    expect(cruza.code).toBe("CHRONOLOGY");

    // Motivo obligatorio y S0 explícito (§4.1): sin ellos no hay preview.
    const sinMotivo = intento({
      inicio: "2026-02-15",
      saldoInicialComida: "0",
      revision: 1,
    });
    expect(sinMotivo.status).toBe(422);
    expect(sinMotivo.code).toBe("VALIDATION");
    expect(sinMotivo.fields?.motivo).toBeDefined();
    const sinSaldo = intento({ inicio: "2026-02-15", motivo: "Motivo", revision: 1 });
    expect(sinSaldo.status).toBe(422);
    expect(sinSaldo.code).toBe("VALIDATION");
    expect(sinSaldo.fields?.saldoInicialComida).toBeDefined();

    // Ciclo inexistente.
    const inexistente = problemaDe(() =>
      previewRectificacion(db, "9", cuerpo({ inicio: "2026-02-15" })),
    );
    expect(inexistente.status).toBe(404);
    expect(inexistente.code).toBe("NOT_FOUND");

    // Nada de eso escribió: ni maestro, ni marcas, ni intentos.
    expect(estadoCompleto(db)).toEqual(antes);
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * §4.1/§3.3 · confirmación de Inicio (AC-20, AC-40, AC-36)
 * ================================================================== */

test("AC-40/§4.1 · confirmar el Inicio conserva IDs y fechas, deriva el Fin y no desplaza al sucesor", () => {
  const db = baseValidada();
  try {
    const hechosAntes = db.query("SELECT * FROM movimientos ORDER BY id").all();
    const entrada = cuerpo({ inicio: "2026-02-15", motivo: "Desplazar el Inicio" });
    const preview = previewRectificacion(db, "2", entrada);
    const recibo = confirmar(db, "2", preview, entrada, "clave-rectificar-inicio-01");

    // Maestro: Fin derivado del siguiente Inicio, sin huecos ni solapes.
    const maestro = cycleMaster(db);
    expect(maestro.map((ciclo) => [ciclo.id, ciclo.inicio, ciclo.fin])).toEqual([
      ["1", "2026-01-01", "2026-02-14"],
      ["2", "2026-02-15", "2026-02-28"],
      ["3", "2026-03-01", "2026-03-31"],
      ["4", "2026-04-01", null],
    ]);
    for (let indice = 0; indice < maestro.length - 1; indice += 1) {
      const actual = maestro[indice]!;
      const siguiente = maestro[indice + 1]!;
      expect(actual.fin).not.toBeNull();
      expect(actual.fin! < siguiente.inicio).toBe(true);
      expect(
        new Date(`${actual.fin!}T00:00:00Z`).getTime() + 86_400_000,
      ).toBe(new Date(`${siguiente.inicio}T00:00:00Z`).getTime());
    }
    // El mes financiado del corregido no cambia; la revisión sube exactamente 1.
    expect(maestro.find((ciclo) => ciclo.id === "2")?.mesFinanciado).toBe("2026-03-01");
    expect(ciclos(db).find((ciclo) => ciclo.id === "2")?.revision).toBe(2);
    expect(ciclos(db).find((ciclo) => ciclo.id === "2")?.saldo_comida).toBe(0);
    // Los hechos no se tocan: identidad, fecha, importe y revisión intactos.
    expect(db.query("SELECT * FROM movimientos ORDER BY id").all()).toEqual(hechosAntes);
    // Auditoría natural del ciclo con su motivo; el hecho y el evento de estado
    // comparten intento (el `operacionId` del recibo).
    const historial = db
      .query("SELECT ciclo,revision,accion,motivo FROM cycle_audit ORDER BY rowid")
      .all() as { ciclo: string; revision: number; accion: string; motivo: string }[];
    expect(historial).toEqual([
      {
        ciclo: "2",
        revision: 2,
        accion: "rectificar",
        motivo: "Desplazar el Inicio",
      },
    ]);
    const marcas = eventos(db).filter((evento) => evento.accion === "dirty_marcado");
    expect(marcas.map((marca) => marca.ciclo)).toEqual(["1", "2"]);
    for (const marca of marcas) expect(marca.intento).toBe(recibo.operacionId);
    // El ciclo 3 (sucesor) y el 4 no se marcan: su ventana no cambió.
    expect(fila(db, "3")!.dirty).toBe(0);
    expect(fila(db, "4")).toBeNull();
    expect(recibo.cierresDirty.map((dirty) => dirty.ciclo)).toEqual(["1", "2"]);
  } finally {
    db.close();
  }
});

test("AC-19 · una rectificación sin efecto material no marca ni reitera", () => {
  const db = baseValidada();
  try {
    const referencia = fila(db, "1")!;
    const eventosAntes = eventos(db).length;
    // Mismo Inicio y mismo S0: la operación escribe el maestro (revisión +1)
    // pero no cambia ninguna magnitud del universo material.
    const entrada = cuerpo({ inicio: "2026-01-01", saldoInicialComida: "0", motivo: "Sin cambio" });
    const preview = previewRectificacion(db, "1", entrada);
    expect(preview.afectados).toEqual([]);
    expect(preview.requiereMotivo).toBe(false);
    // `null` = nada medido cambió, con algún componente no medible (el ciclo
    // abierto candidato); nunca se presenta como igualdad demostrada.
    expect(preview.material).toBeNull();

    const recibo = confirmar(db, "1", preview, entrada, "clave-rectificar-noop-01");

    expect(recibo.auditIds).toEqual([]);
    expect(recibo.cierresDirty).toEqual([]);
    expect(fila(db, "1")).toEqual(referencia);
    expect(eventos(db).length).toBe(eventosAntes);
    expect(ciclos(db).find((ciclo) => ciclo.id === "1")?.revision).toBe(2);
  } finally {
    db.close();
  }
});

test("AC-39/§4.1 · corregir el S0 de un ciclo validado marca S0_CICLO y no toca a los demás", () => {
  const db = baseValidada();
  try {
    const hechosAntes = db.query("SELECT * FROM movimientos ORDER BY id").all();
    const vecino = fila(db, "2")!;
    const entrada = cuerpo({
      inicio: "2026-01-01",
      saldoInicialComida: "500",
      motivo: "Saldo inicial mal transcrito",
    });
    const preview = previewRectificacion(db, "1", entrada);
    const recibo = confirmar(db, "1", preview, entrada, "clave-rectificar-s0-01");

    const marcada = fila(db, "1")!;
    expect(marcada.dirty).toBe(1);
    expect(marcada.dirty_desde).toBe(T_RECTIFICAR);
    expect(marcada.dirty_ultimo).toBe(T_RECTIFICAR);
    expect(marcada.dirty_origen).toBe("Operacion");
    expect(JSON.parse(marcada.dirty_motivos!)).toEqual(["S0_CICLO"]);
    // La marca no reescribe la referencia humana ni adelanta la revisión.
    expect(marcada.revision).toBe(1);
    expect(marcada.huella_validacion).not.toBe(proyectarValidacion(db, "1").huellaVigente);
    // El sucesor conserva su estado y su referencia.
    expect(fila(db, "2")).toEqual(vecino);
    expect(fila(db, "2")!.dirty).toBe(0);
    // S0 no mueve ventanas ni reasigna hechos.
    expect(db.query("SELECT * FROM movimientos ORDER BY id").all()).toEqual(hechosAntes);
    expect(ciclos(db).find((ciclo) => ciclo.id === "1")?.saldo_comida).toBe(50_000);
    expect(cycleMaster(db).map((ciclo) => [ciclo.id, ciclo.inicio, ciclo.fin])).toEqual([
      ["1", "2026-01-01", "2026-01-31"],
      ["2", "2026-02-01", "2026-02-28"],
      ["3", "2026-03-01", "2026-03-31"],
      ["4", "2026-04-01", null],
    ]);
    expect(recibo.ciclos).toEqual([{ id: "1", revision: "1", estado: "Pendiente" }]);
    expect(recibo.cierresDirty.map((dirty) => dirty.ciclo)).toEqual(["1"]);
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * G3 · cifras sólo en preview y recibo (§2.3, §4.1)
 * ================================================================== */

test("G3 · las cifras viven en el preview y el recibo, nunca en la auditoría de validación", () => {
  const db = baseValidada();
  try {
    const entrada = cuerpo({
      inicio: "2026-01-01",
      saldoInicialComida: "500",
      motivo: "Saldo inicial mal transcrito",
    });
    const preview = previewRectificacion(db, "1", entrada);
    // El preview es la superficie de las cifras: publica antes/después.
    expect(preview.ventana.despues.saldoInicialComida).toBe("500.00");
    expect(JSON.stringify(preview)).toContain("500.00");

    const recibo = confirmar(db, "1", preview, entrada, "clave-rectificar-s0-02");
    // El recibo es no monetario.
    expect(sinCifras(recibo)).toBe(true);
    expect(JSON.stringify(recibo)).not.toContain("500");

    // El detalle de la auditoría de validación: sólo identidad, huellas y
    // cobertura por códigos. Ni el saldo anterior ni el nuevo.
    const marca = eventos(db).at(-1)!;
    expect(marca.accion).toBe("dirty_marcado");
    expect(marca.intento).toBe(recibo.operacionId);
    expect(marca.detalle).not.toContain("500");
    expect(sinCifras(JSON.parse(marca.detalle))).toBe(true);
    const detalle = JSON.parse(marca.detalle) as {
      hechos: unknown[];
      ciclos: { id: string; impactos: string[] }[];
      cobertura: { fuente: string; estado: string; causas: string[] }[];
      procedencia: unknown;
    };
    expect(Object.keys(detalle).sort()).toEqual(["ciclos", "cobertura", "hechos", "procedencia"]);
    expect(detalle.hechos).toEqual([]);
    expect(detalle.procedencia).toBeNull();
    expect(detalle.ciclos).toEqual([{ id: "1", impactos: ["S0_CICLO"] }]);
    for (const cobertura of detalle.cobertura) {
      expect(["Disponible", "Parcial", "NoDisponible"]).toContain(cobertura.estado);
      expect(cobertura).not.toHaveProperty("importe");
    }
    expect(marca.huella_anterior).toHaveLength(64);
    expect(marca.huella_posterior).toHaveLength(64);
    // La auditoría natural del ciclo sí conserva el dato de negocio (no es un
    // canal de preview): no contiene la forma del preview.
    const natural = db.query("SELECT anterior,posterior FROM cycle_audit").get() as {
      anterior: string;
      posterior: string;
    };
    expect(natural.posterior).toContain("500.00");
    for (const campo of ["afectados", "ventana", "movimientosReasignados", "impactRevision"])
      expect(natural.posterior).not.toContain(campo);
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * AC-37/AC-55 · contexto e impacto entre preview y confirmación
 * ================================================================== */

test("AC-37/AC-55 · cambiar el impacto entre preview y confirmación es 409 IMPACT_CHANGED sin efectos", () => {
  const db = baseValidada();
  try {
    const entrada = cuerpo({ inicio: "2026-02-15", motivo: "Desplazar el Inicio" });
    const preview = previewRectificacion(db, "2", entrada);
    // Un hecho nuevo dentro de la ventana medida cambia el resultado, no el
    // contexto estructural del preview.
    gasto(db, "9", "2026-02-20", 1500);
    const antesDelIntento = estadoCompleto(db);

    const fallo = problemaDe(() =>
      confirmar(db, "2", preview, entrada, "clave-rectificar-impacto-01"),
    );
    expect(fallo.status).toBe(409);
    expect(fallo.code).toBe("IMPACT_CHANGED");
    expect(estadoCompleto(db)).toEqual(antesDelIntento);
  } finally {
    db.close();
  }
});

test("AC-37/AC-55 · rectificar un vecino entre preview y confirmación es 409 IMPACT_CHANGED", () => {
  const db = baseValidada();
  try {
    // Preview de S0 del ciclo 1: su contexto incluye el vecino sucesor.
    const s0 = cuerpo({
      inicio: "2026-01-01",
      saldoInicialComida: "500",
      motivo: "Saldo inicial mal transcrito",
    });
    const previewS0 = previewRectificacion(db, "1", s0);
    // Entre medias, otra sesión rectifica el Inicio del ciclo 2: cambia el Fin
    // del ciclo 1 y, con él, el contexto que el preview leyó.
    const inicio = cuerpo({ inicio: "2026-02-15", motivo: "Desplazar el Inicio" });
    const previewInicio = previewRectificacion(db, "2", inicio);
    confirmar(db, "2", previewInicio, inicio, "clave-rectificar-contexto-01");
    const antesDelIntento = estadoCompleto(db);

    const fallo = problemaDe(() =>
      confirmar(db, "1", previewS0, s0, "clave-rectificar-contexto-02"),
    );
    expect(fallo.status).toBe(409);
    expect(fallo.code).toBe("IMPACT_CHANGED");
    expect(estadoCompleto(db)).toEqual(antesDelIntento);
    expect(db.query("SELECT saldo_comida FROM ciclos WHERE id='1'").get()).toEqual({
      saldo_comida: 0,
    });
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * AC-10/AC-56 · idempotencia y competencia (§3.4)
 * ================================================================== */

test("AC-10 · la rectificación reproduce su recibo con la misma clave y rechaza otro payload", () => {
  const db = baseValidada();
  try {
    const primera = cuerpo({ inicio: "2026-02-15", motivo: "Desplazar el Inicio" });
    const otra = cuerpo({
      inicio: "2026-02-15",
      saldoInicialComida: "700",
      motivo: "Desplazar el Inicio",
    });
    // Dos previews preparadas antes de confirmar (dos pestañas).
    const previewPrimera = previewRectificacion(db, "2", primera);
    const previewOtra = previewRectificacion(db, "2", otra);
    const recibo = confirmar(db, "2", previewPrimera, primera, "clave-rectificar-ac10-01");
    const maestroTrasPrimera = ciclos(db);
    const historialTrasPrimera = db.query("SELECT * FROM cycle_audit ORDER BY rowid").all();
    const intentosTrasPrimera = (
      db.query("SELECT COUNT(*) AS n FROM validacion_attempts").get() as { n: number }
    ).n;

    const repetida = confirmar(
      db,
      "2",
      previewPrimera,
      primera,
      "clave-rectificar-ac10-01",
      T_REINTENTO,
    );
    expect(repetida).toEqual(recibo);
    expect(ciclos(db)).toEqual(maestroTrasPrimera);
    expect(db.query("SELECT * FROM cycle_audit ORDER BY rowid").all()).toEqual(
      historialTrasPrimera,
    );
    expect(
      db.query("SELECT COUNT(*) AS n FROM validacion_attempts").get(),
    ).toEqual({ n: intentosTrasPrimera });

    const fallo = problemaDe(() =>
      confirmar(db, "2", previewOtra, otra, "clave-rectificar-ac10-01", T_REINTENTO),
    );
    expect(fallo.status).toBe(409);
    expect(fallo.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(ciclos(db)).toEqual(maestroTrasPrimera);
    expect(
      db.query("SELECT COUNT(*) AS n FROM validacion_attempts").get(),
    ).toEqual({ n: intentosTrasPrimera });
  } finally {
    db.close();
  }
});

test("AC-56 · dos claves distintas con el mismo preview: la segunda detecta la revisión obsoleta", () => {
  const db = baseValidada();
  try {
    const entrada = cuerpo({ inicio: "2026-02-15", motivo: "Desplazar el Inicio" });
    const previewA = previewRectificacion(db, "2", entrada);
    const previewB = previewRectificacion(db, "2", entrada);
    expect(previewB.fingerprint).toBe(previewA.fingerprint);

    confirmar(db, "2", previewA, entrada, "clave-rectificar-ac56-01");
    const antesDelIntento = estadoCompleto(db);
    const fallo = problemaDe(() =>
      confirmar(db, "2", previewB, entrada, "clave-rectificar-ac56-02", T_REINTENTO),
    );

    // ANEXO §1: la revisión específica precede al impacto, y el intento ajeno no
    // escribe nada ni confirma en silencio.
    expect(fallo.status).toBe(409);
    expect(fallo.code).toBe("REVISION_CONFLICT");
    expect(estadoCompleto(db)).toEqual(antesDelIntento);
    expect(ciclos(db).find((ciclo) => ciclo.id === "2")?.revision).toBe(2);
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * §6.3 · fixture anual: Fin posterior del predecesor y tramo C→P
 * ================================================================== */

/**
 * Pendiente por #538 (no se simula aquí, no se inventa): el GRE por compra
 * (P=130 y C=0 tras la corrección), el neteo de la devolución y la atribución
 * económica de una devolución **enlazada a la compra p**. `universoFinanciero`
 * publica `flujo.gre`/`flujo.neto` como `null` mientras #538 no fije el
 * predicado, así que esta prueba sólo verifica la **pertenencia bancaria por
 * fecha** y la frontera de ventanas que §4.1 manda publicar. El abono d entra
 * como 'Devolución de gasto' sin enlace persistido: el enlace compra↔devolución
 * es de #538. También queda fuera la variante "crear D cuando no existía".
 */
test("AC-36/§6.3 · el preview publica el Fin posterior del predecesor y el tramo C→P sin reescribir hechos", () => {
  const db = baseAnual();
  try {
    const antes = estadoCompleto(db);
    const hechosAntes = db
      .query("SELECT id,fecha,tipo,importe,revision FROM movimientos ORDER BY id")
      .all();
    const comidaAntes = db.query("SELECT * FROM revision_comida ORDER BY id").all() as {
      id: string;
      fecha: string;
      importe: number;
      revision: number;
    }[];
    // Pertenencia bancaria vigente: el tramo 25–28 de diciembre es de C.
    expect(cicloDeFecha(db, "2026-12-27")).toBe("2");
    expect(cicloDeFecha(db, "2026-12-28")).toBe("2");

    const entrada = cuerpo({
      inicio: "2026-12-29",
      motivo: "Mover el Inicio del ciclo tras el cierre de mes",
    });
    const preview = previewRectificacion(db, "2", entrada);

    expect(preview.operacion).toBe("rectificar_inicio");
    // Corregido: C pasa a 29/12–24/01 sin cruzar a D ni cambiar de mes financiado.
    expect(preview.ventana.antes).toEqual({
      inicio: "2026-12-25",
      fin: "2027-01-24",
      saldoInicialComida: "0.00",
    });
    expect(preview.ventana.despues).toEqual({
      inicio: "2026-12-29",
      fin: "2027-01-24",
      saldoInicialComida: "0.00",
    });
    // Predecesor: mismo Inicio y Fin posterior = víspera del nuevo Inicio de C.
    expect(preview.ventana.predecesor).toEqual({
      id: "1",
      antes: { inicio: "2026-11-25", fin: "2026-12-24" },
      despues: { inicio: "2026-11-25", fin: "2026-12-28" },
    });
    // D sigue como frontera fija: su ventana no se desplaza.
    expect(preview.ventana.sucesor).toEqual({ id: "3", inicio: "2027-01-25", fin: null });
    // Partición posterior sin huecos ni solapes.
    expect(diaSiguiente(preview.ventana.predecesor!.despues.fin!)).toBe(
      preview.ventana.despues.inicio,
    );
    expect(diaSiguiente(preview.ventana.despues.fin!)).toBe(preview.ventana.sucesor!.inicio);

    // q y d cambian de ciclo con identidad y fecha intactas; p sigue en P (sólo
    // se desplaza el Fin de su ventana, no su pertenencia).
    const reasignados = preview.movimientosReasignados as {
      id: string;
      fecha: string;
      antes: { id: string } | null;
      despues: { id: string } | null;
    }[];
    expect(
      reasignados.map((movimiento) => [
        movimiento.id,
        movimiento.fecha,
        movimiento.antes?.id,
        movimiento.despues?.id,
      ]),
    ).toEqual([
      ["102", "2026-12-10", "1", "1"],
      ["103", "2026-12-27", "2", "1"],
      ["104", "2026-12-28", "2", "1"],
    ]);

    // Revisión Comida: sin ciclo propio, la fila del tramo se atribuye por fecha.
    // Cae ya en la ventana posterior del predecesor y fuera de la del corregido.
    const tramo = comidaAntes.find((fila) => fila.id === "RC2")!;
    expect(tramo.fecha).toBe("2026-12-28");
    expect(tramo.importe).toBe(800);
    expect(tramo.fecha <= preview.ventana.predecesor!.despues.fin!).toBe(true);
    expect(tramo.fecha >= preview.ventana.predecesor!.despues.inicio).toBe(true);
    expect(tramo.fecha >= preview.ventana.despues.inicio).toBe(false);

    // Material sólo donde se midió cambio: P y C; D no aparece.
    expect(preview.material).toBe(true);
    expect(preview.requiereMotivo).toBe(true);
    expect(preview.afectados.map((afectado) => afectado.ciclo)).toEqual(["1", "2"]);
    expect(preview.afectados.map((afectado) => afectado.motivos)).toEqual([
      ["FLUJO_CICLO", "ATRIBUCION", "VENTANA_CICLO"],
      ["FLUJO_CICLO", "ATRIBUCION", "COMIDA", "VENTANA_CICLO"],
    ]);

    // Cancelar no escribe: preview reproducible y estado completo idéntico.
    const repetido = previewRectificacion(db, "2", entrada);
    expect(repetido.fingerprint).toBe(preview.fingerprint);
    expect(repetido.contextRevision).toBe(preview.contextRevision);
    expect(repetido.impactRevision).toBe(preview.impactRevision);
    expect(estadoCompleto(db)).toEqual(antes);

    // Confirmación: el maestro adopta exactamente las ventanas publicadas.
    const recibo = confirmar(db, "2", preview, entrada, "clave-rectificar-63-01");
    expect(cycleMaster(db).map((ciclo) => [ciclo.id, ciclo.inicio, ciclo.fin])).toEqual([
      ["1", "2026-11-25", "2026-12-28"],
      ["2", "2026-12-29", "2027-01-24"],
      ["3", "2027-01-25", null],
    ]);
    // Hechos y filas de Revisión Comida intactos: cambia la ventana, no la fila.
    expect(
      db.query("SELECT id,fecha,tipo,importe,revision FROM movimientos ORDER BY id").all(),
    ).toEqual(hechosAntes);
    expect(db.query("SELECT * FROM revision_comida ORDER BY id").all()).toEqual(comidaAntes);
    expect(cicloDeFecha(db, "2026-12-27")).toBe("1");
    expect(cicloDeFecha(db, "2026-12-28")).toBe("1");
    // Sólo se marca lo medido: P y C. D no tiene referencia que marcar.
    expect(recibo.ciclos).toEqual([{ id: "2", revision: "1", estado: "Pendiente" }]);
    expect(recibo.cierresDirty.map((dirty) => dirty.ciclo)).toEqual(["1", "2"]);
    expect(recibo.auditIds).toHaveLength(2);
    expect(fila(db, "1")!.dirty).toBe(1);
    expect(fila(db, "2")!.dirty).toBe(1);
    expect(fila(db, "3")).toBeNull();
    expect(
      eventos(db)
        .filter((evento) => evento.accion === "dirty_marcado")
        .map((evento) => evento.ciclo),
    ).toEqual(["1", "2"]);
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * §4.1/AC-40 · filas de Revisión Comida reasignadas
 * ================================================================== */

test("AC-40/§6.3 · el preview enumera la pertenencia antes/después de las filas de Revisión Comida reasignadas", () => {
  const db = baseAnual();
  try {
    const antes = estadoCompleto(db);
    const comidaAntes = comidaFilas(db);
    const entrada = cuerpo({
      inicio: "2026-12-29",
      motivo: "Mover el Inicio del ciclo tras el cierre de mes",
    });
    const preview = previewRectificacion(db, "2", entrada);

    // Identidad y fecha de la fila intactas; la pertenencia va antes/después.
    // RC1 conserva el ciclo 1 pero su ventana termina donde antes empezaba C
    // —misma vara que `movimientosReasignados`—; RC2 deja de pertenecer a C.
    expect(preview.revisionesComidaReasignadas).toEqual([
      {
        id: "RC1",
        fecha: "2026-12-20",
        tipo: "Detalle",
        estadoRegistro: "Vigente",
        antes: { id: "1", inicio: "2026-11-25", fin: "2026-12-24" },
        despues: { id: "1", inicio: "2026-11-25", fin: "2026-12-28" },
      },
      {
        id: "RC2",
        fecha: "2026-12-28",
        tipo: "Detalle",
        estadoRegistro: "Vigente",
        antes: { id: "2", inicio: "2026-12-25", fin: "2027-01-24" },
        despues: { id: "1", inicio: "2026-11-25", fin: "2026-12-28" },
      },
    ]);
    // La lista publica identidad y pertenencia, no importes: el preview no es
    // un canal de cifras de Revisión Comida.
    for (const reasignada of preview.revisionesComidaReasignadas)
      expect(Object.keys(reasignada).sort()).toEqual([
        "antes",
        "despues",
        "estadoRegistro",
        "fecha",
        "id",
        "tipo",
      ]);

    // La candidatura de una fila no marca por sí sola: los afectados y sus
    // motivos son los medidos por el universo, sin códigos nuevos.
    expect(preview.afectados.map((afectado) => afectado.ciclo)).toEqual(["1", "2"]);
    for (const afectado of preview.afectados)
      for (const motivo of afectado.motivos) expect(IMPACTOS_MATERIALES).toContain(motivo);

    // Enumerar es leer: ni la tabla de Revisión Comida ni el estado cambian.
    expect(comidaFilas(db)).toEqual(comidaAntes);
    expect(estadoCompleto(db)).toEqual(antes);
  } finally {
    db.close();
  }
});

test("AC-40 · sin Revisión Comida reasignada la lista viene vacía", () => {
  // Maestro sin filas de Revisión Comida: nada que enumerar, sin inventar
  // entradas vacías ni motivos nuevos.
  const db = baseValidada();
  try {
    const antes = estadoCompleto(db);
    const preview = previewRectificacion(
      db,
      "2",
      cuerpo({ inicio: "2026-02-15", motivo: "Desplazar el Inicio" }),
    );
    expect(preview.revisionesComidaReasignadas).toEqual([]);
    // La operación sigue siendo material por la ventana: la lista no es la
    // medida del impacto.
    expect(preview.material).toBe(true);
    expect(estadoCompleto(db)).toEqual(antes);
  } finally {
    db.close();
  }

  // Con filas existentes: sólo se enumeran las que cambian de pertenencia.
  const intacto = baseValidada();
  try {
    comida(intacto, "RC9", "2026-03-10", 900, "Comida de un ciclo intacto");
    const antes = estadoCompleto(intacto);
    const preview = previewRectificacion(
      intacto,
      "2",
      cuerpo({ inicio: "2026-02-15", motivo: "Desplazar el Inicio" }),
    );
    // El ciclo 3 no cambia de ventana: su Revisión Comida no se enumera.
    expect(preview.revisionesComidaReasignadas).toEqual([]);
    expect(preview.afectados.map((afectado) => afectado.ciclo)).toEqual(["1", "2"]);
    expect(estadoCompleto(intacto)).toEqual(antes);
  } finally {
    intacto.close();
  }
});

test("AC-40 · preview y cancelación no escriben: tabla y estado completos idénticos", () => {
  const db = baseAnual();
  try {
    const estadoAntes = estadoCompleto(db);
    const comidaAntes = comidaFilas(db);
    const eventosAntes = eventos(db);
    const entrada = cuerpo({
      inicio: "2026-12-29",
      motivo: "Mover el Inicio del ciclo tras el cierre de mes",
    });
    const primera = previewRectificacion(db, "2", entrada);
    // Cancelar es no confirmar: un segundo preview reproduce la respuesta
    // exacta —tokens incluidos— y no deja intento ni escritura.
    const segunda = previewRectificacion(db, "2", entrada);
    expect(segunda).toEqual(primera);
    expect(comidaFilas(db)).toEqual(comidaAntes);
    expect(estadoCompleto(db)).toEqual(estadoAntes);
    expect(eventos(db)).toEqual(eventosAntes);
    expect(fila(db, "1")!.dirty).toBe(0);
    expect(fila(db, "2")!.dirty).toBe(0);
  } finally {
    db.close();
  }
});

test("AC-40 · la enumeración no hereda el recorte de página de la UI", () => {
  const db = baseValidada();
  try {
    // 120 filas en el ciclo 1: al mover el Inicio de C su ventana pasa a
    // terminar el 14/02 y todas cambian de pertenencia a la vez.
    for (let indice = 1; indice <= 120; indice += 1)
      comida(db, `RC${String(indice).padStart(4, "0")}`, "2026-01-20", 100, `Comida ${indice}`);
    const preview = previewRectificacion(
      db,
      "2",
      cuerpo({ inicio: "2026-02-15", motivo: "Desplazar el Inicio" }),
    );
    expect(preview.revisionesComidaReasignadas).toHaveLength(120);
    for (const reasignada of preview.revisionesComidaReasignadas) {
      expect(reasignada.antes).toEqual({ id: "1", inicio: "2026-01-01", fin: "2026-01-31" });
      expect(reasignada.despues).toEqual({ id: "1", inicio: "2026-01-01", fin: "2026-02-14" });
    }
  } finally {
    db.close();
  }
});