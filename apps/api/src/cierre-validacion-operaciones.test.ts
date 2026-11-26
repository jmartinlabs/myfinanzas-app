import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { prepareSchema } from "./database-schema";
import { proyectarValidacion } from "./cierre-validacion-estado";
import {
  confirmarOperacion,
  previsualizarOperacion,
  type EntradaConfirmacion,
  type Procedimiento,
  type ReciboConfirmacion,
} from "./cierre-validacion-operaciones";
import {
  confirmarRevisionCiclo,
  previewValidacion,
  requisitosDeValidacion,
  validarCiclo,
} from "./cierre-validacion-servicio";
import { Problem } from "./problem";

/**
 * SPEC38 · I2 — envoltorio de previsualización/confirmación (§3.4, G9), marca de
 * materialidad (§3.2) e idempotencia (§2.4, ANEXO §1).
 *
 * Criterio de estas pruebas: cada caso nombra el AC que cubre, no hay `.skip`,
 * `.todo` ni tolerancias, y **toda** aserción de estado se hace sobre lo que
 * quedó persistido (`SELECT`), nunca sobre la forma del DTO.
 *
 * Las escrituras de dominio que no tienen todavía ruta propia se construyen con
 * la forma real que documenta `cierre-validacion-operaciones.ts`
 * (`Procedimiento`: ciclos, candidatos, payload, contexto, revisiones, guardas,
 * aplicar, cobertura). El envoltorio no conoce el dominio, así que una prueba de
 * escritura legítima es exactamente ese contrato.
 */

const T = "2026-01-01T00:00:00.000Z";
const T_VALIDAR = "2026-04-01T00:00:00.000Z";
const T_IMPACTO = "2026-04-02T00:00:00.000Z";
const T_REITERADO = "2026-04-03T00:00:00.000Z";
const T_REVERSION = "2026-04-04T00:00:00.000Z";
const T_CONFIRMAR = "2026-04-05T00:00:00.000Z";
const T_FALLO = "2026-04-06T00:00:00.000Z";

/** Tablas que ninguna de estas rutas puede tocar sin confirmar. */
const TABLAS = [
  "movimientos",
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
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR0002','Otra','SUB0001','Activa',1,?,?)`,
    [T, T],
  );
}

function ciclo(db: Database, id: string, inicio: string, saldo = 0) {
  db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,?,?)", [
    id,
    inicio,
    saldo,
    T,
  ]);
}

function gasto(db: Database, id: string, fecha: string, importe = 1000, partida = "PAR0001") {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,
       nota,anulado,revision,creado,actualizado)
     VALUES(?,?,'Gasto',?,'S001','S000',NULL,?,'Ficticio','',0,1,?,?)`,
    [id, fecha, importe, partida, T, T],
  );
}

/** Abono de SPEC39, con o sin vínculo, para ejercer la cobertura `devoluciones`. */
function devolucion(
  db: Database,
  id: string,
  fecha: string,
  importe = 300,
  opciones: { compra?: string | null; estado?: "Verificado" | "Revisar" | "Sin vínculo" } = {},
) {
  const compra = opciones.compra === undefined ? "1" : opciones.compra;
  const estado = opciones.estado ?? "Verificado";
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,concepto,
       nota,anulado,revision,creado,actualizado)
     VALUES(?,?,'Devolución de gasto',?,'S000','S001',NULL,NULL,'Abono ficticio','',0,1,?,?)`,
    [id, fecha, importe, T, T],
  );
  if (estado === "Sin vínculo") return;
  db.run(
    `INSERT INTO movimiento_devolucion(movimiento,compra,partida,ciclo_origen,
       evidencia_relacion,evidencia_origen_temporal,elegibilidad,estado,
       revision_movimiento,revision,creado,actualizado)
     VALUES(?,?,'PAR0001','1','Evidencia ficticia','Documento ficticio','Acreditada',?,1,1,?,?)`,
    [id, compra, estado, T, T],
  );
}

/**
 * Dos ciclos: el 1 con Fin derivado (validable) y el 2 abierto. Un gasto en cada
 * ventana, de modo que un cambio de importe mueva flujo y atribución del ciclo 1.
 */
function base(): Database {
  const db = store();
  clasificacion(db);
  ciclo(db, "1", "2026-01-01");
  ciclo(db, "2", "2026-02-01");
  gasto(db, "1", "2026-01-10");
  gasto(db, "2", "2026-02-10");
  return db;
}

function estadoCompleto(db: Database): Record<string, unknown[]> {
  return Object.fromEntries(
    TABLAS.map((tabla) => [tabla, db.query(`SELECT * FROM ${tabla}`).all()]),
  );
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

function eventos(db: Database, cicloId?: string) {
  return db
    .query(
      `SELECT id,ciclo,revision,accion,intento,origen,huella_anterior,huella_posterior,detalle
         FROM cierre_validacion_audit ${cicloId ? "WHERE ciclo=?" : ""} ORDER BY id`,
    )
    .all(...(cicloId ? [cicloId] : [])) as {
    id: number;
    ciclo: string;
    revision: number;
    accion: string;
    intento: string | null;
    origen: string | null;
    huella_anterior: string | null;
    huella_posterior: string | null;
    detalle: string;
  }[];
}

function recibos(db: Database) {
  return db
    .query("SELECT operacion,key,hash,response,completado,expira FROM validacion_attempts ORDER BY key")
    .all() as {
    operacion: string;
    key: string;
    hash: string;
    response: string;
    completado: number;
    expira: number;
  }[];
}

/** Acto de escritura con el contrato real de `Procedimiento` (§3.4). */
function escritura(
  db: Database,
  opciones: {
    ciclo?: string;
    payload: unknown;
    aplicar: () => void;
    candidatos?: readonly string[];
    ciclos?: readonly string[];
    contexto?: () => unknown;
    guardas?: () => void;
    revisiones?: Procedimiento["revisiones"];
    cobertura?: Procedimiento["cobertura"];
  },
): Procedimiento {
  const cicloId = opciones.ciclo ?? "1";
  return {
    operacion: "rectificar_s0",
    familia: "prueba_escritura",
    ciclos: opciones.ciclos ?? [cicloId],
    candidatos: opciones.candidatos ?? [cicloId],
    payload: opciones.payload,
    contexto: opciones.contexto ?? (() => ({ ciclo: cicloId })),
    revisiones: opciones.revisiones,
    guardas: opciones.guardas,
    aplicar: opciones.aplicar,
    cobertura: opciones.cobertura,
  };
}

function codigoDe(fn: () => unknown): { status?: number; code?: string; message: string } {
  try {
    fn();
  } catch (error) {
    const problema = error as Partial<Problem> & { message?: string };
    return {
      status: problema.status,
      code: problema.code,
      message: String(problema.message ?? ""),
    };
  }
  return { message: "" };
}

/** Preview + confirmación de validación, como los encadena la ruta (§6.1). */
function validar(
  db: Database,
  cicloId: string,
  key: string,
  instante: string,
  motivo?: string,
) {
  const preview = previewValidacion(db, cicloId);
  return validarCiclo(db, cicloId, {
    key,
    fingerprint: preview.fingerprint,
    contextRevision: preview.contextRevision,
    impactRevision: preview.impactRevision,
    actor: "humano",
    instante,
    motivo,
  });
}

function sinCifras(valor: unknown): boolean {
  if (typeof valor === "number") return false;
  if (typeof valor === "bigint") return false;
  if (typeof valor === "string") return !/[0-9][.,][0-9]/.test(valor) && !valor.includes("€");
  if (Array.isArray(valor)) return valor.every(sinCifras);
  if (valor && typeof valor === "object")
    return Object.values(valor as Record<string, unknown>).every(sinCifras);
  return true;
}

/* ================================================================== *
 * §3.4 paso 3 · el preview no persiste nada (AC-54, G9)
 * ================================================================== */

test("AC-54/G9 · el preview no pesiste hechos, auditoría, marcas ni intentos", () => {
  const db = base();
  try {
    const antes = estadoCompleto(db);
    const preview = previsualizarOperacion(
      db,
      escritura(db, {
        payload: { importe: 2500 },
        aplicar: () =>
          db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
      }),
    );
    // El preview de la ruta de validación, sobre un ciclo todavía sin fila.
    const previewValidar = previewValidacion(db, "1");
    const despues = estadoCompleto(db);

    expect(preview.material).toBe(true);
    expect(preview.afectados.map((afectado) => afectado.ciclo)).toEqual(["1"]);
    expect(preview.afectados[0]?.motivos).toContain("FLUJO_CICLO");
    expect(preview.noStore).toBe(true);
    expect(previewValidar.estado.estado).toBe("SinValidar");
    // Cero escrituras: hechos, auditoría natural, marcas, eventos e intentos.
    expect(despues).toEqual(antes);
  } finally {
    db.close();
  }
});

test("AC-54/G9 · un preview que falla tampoco deja rastro", () => {
  const db = base();
  try {
    const antes = estadoCompleto(db);

    // (a) Guarda de dominio: falla antes de aplicar.
    const guarda = codigoDe(() =>
      previsualizarOperacion(
        db,
        escritura(db, {
          payload: { inicio: "2026-03-15" },
          guardas: () => {
            throw new Problem(409, "CHRONOLOGY", "El Inicio debe permanecer entre sus vecinos.");
          },
          aplicar: () => db.run("UPDATE movimientos SET importe=9999 WHERE id='1'"),
        }),
      ),
    );
    expect(guarda.status).toBe(409);
    expect(guarda.code).toBe("CHRONOLOGY");

    // (b) Fallo después de escribir dentro del dry-run: el SAVEPOINT se deshace.
    const aplicado = codigoDe(() =>
      previsualizarOperacion(
        db,
        escritura(db, {
          payload: { importe: 1234 },
          aplicar: () => {
            db.run("UPDATE movimientos SET importe=1234,revision=revision+1 WHERE id='1'");
            throw new Problem(409, "REFERENCE_ERROR", "Una fuente instalada ha fallado.");
          },
        }),
      ),
    );
    expect(aplicado.status).toBe(409);
    expect(aplicado.code).toBe("REFERENCE_ERROR");

    expect(estadoCompleto(db)).toEqual(antes);
    expect(db.query("SELECT importe,revision FROM movimientos WHERE id='1'").get()).toEqual({
      importe: 1000,
      revision: 1,
    });
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * §3.4 pasos 6-7 · atomicidad (G9)
 * ================================================================== */

test("G9 · la confirmación escribe hecho, auditoría, recibo y estado juntos", () => {
  const db = base();
  try {
    const validada = validar(db, "1", "clave-validar-g9-01", T_VALIDAR);
    expect(validada.ciclos[0]).toEqual({ id: "1", revision: "1", estado: "Validada" });
    const referencia = fila(db, "1")!.huella_validacion;

    const procedimiento = escritura(db, {
      payload: { subeImporte: 2500 },
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const preview = previsualizarOperacion(db, procedimiento);
    const recibo = confirmarOperacion(db, procedimiento, {
      key: "clave-material-g9-01",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });

    // Hecho.
    expect(db.query("SELECT importe,revision FROM movimientos WHERE id='1'").get()).toEqual({
      importe: 2500,
      revision: 2,
    });
    // Estado.
    const estado = fila(db, "1")!;
    expect(estado.dirty).toBe(1);
    expect(estado.dirty_desde).toBe(T_IMPACTO);
    expect(estado.dirty_ultimo).toBe(T_IMPACTO);
    expect(estado.dirty_origen).toBe("Operacion");
    expect(estado.revision).toBe(1);
    expect(estado.huella_validacion).toBe(referencia);
    // Auditoría de validación, enlazada por el intento del recibo.
    const marca = eventos(db, "1").at(-1)!;
    expect(marca.accion).toBe("dirty_marcado");
    expect(marca.revision).toBe(1);
    expect(marca.intento).toBe(recibo.operacionId);
    expect(marca.huella_anterior).toHaveLength(64);
    expect(marca.huella_posterior).toHaveLength(64);
    expect(marca.huella_anterior).not.toBe(marca.huella_posterior);
    expect(JSON.parse(marca.detalle)).toEqual({
      hechos: [],
      ciclos: [{ id: "1", impactos: JSON.parse(estado.dirty_motivos!) }],
      cobertura: [],
      procedencia: null,
    });
    expect(recibo.auditIds).toEqual([String(marca.id)]);
    // Recibo durable, escrito en la misma transacción que el resto.
    const intentos = recibos(db);
    expect(intentos.map((intento) => intento.key)).toContain("clave-material-g9-01");
    const intento = intentos.find((entrada) => entrada.key === "clave-material-g9-01")!;
    expect(intento.completado).toBe(1);
    expect(intento.hash).toHaveLength(64);
    expect(JSON.parse(intento.response)).toEqual(recibo);
    // Autorización de apertura: la invariante de §4.3 no queda viva.
    expect(
      db.query("SELECT COUNT(*) AS n FROM anticipo_apertura_autorizacion").get(),
    ).toEqual({ n: 0 });
  } finally {
    db.close();
  }
});

test("G9 · si la marca falla, el hecho confirmado no sobrevive (rollback total)", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-g9-02", T_VALIDAR);
    const antes = estadoCompleto(db);

    // La cobertura que el procedimiento declara no es un enum del dominio: el
    // constructor del DTO rechaza la marca **después** de aplicar el hecho.
    const procedimiento = escritura(db, {
      payload: { subeImporte: 9999 },
      cobertura: () => [
        { fuente: "movimientos", estado: "Inventado", causas: [] } as never,
      ],
      aplicar: () => db.run("UPDATE movimientos SET importe=9999,revision=revision+1 WHERE id='1'"),
    });
    const preview = previsualizarOperacion(db, procedimiento);
    const fallo = codigoDe(() =>
      confirmarOperacion(db, procedimiento, {
        key: "clave-material-g9-02",
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        actor: "humano",
        instante: T_IMPACTO,
      }),
    );

    expect(fallo.status).toBe(422);
    expect(fallo.code).toBe("VALIDATION");
    expect(fallo.message).toContain("cobertura[0].estado");
    // Ni hecho, ni marca, ni recibo: la transacción no dejó parciales (G9).
    expect(estadoCompleto(db)).toEqual(antes);
    expect(db.query("SELECT importe,revision FROM movimientos WHERE id='1'").get()).toEqual({
      importe: 1000,
      revision: 1,
    });
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * §3.4 paso 4 · idempotencia (AC-10)
 * ================================================================== */

test("AC-10 · misma clave y mismo payload reproducen el recibo con el preview ya obsoleto", () => {
  const db = base();
  try {
    const preview = previewValidacion(db, "1");
    const primera = validarCiclo(db, "1", {
      key: "clave-validar-ac10-1",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_VALIDAR,
    });
    const eventosTrasPrimera = eventos(db).length;
    const filaTrasPrimera = fila(db, "1");

    // El preview original ya no describe el estado: la fila existe y su revisión
    // cambió. Aun así, la clave completada se resuelve antes de mirar nada más.
    const fresco = previewValidacion(db, "1");
    expect(fresco.contextRevision).not.toBe(preview.contextRevision);

    const repetida = validarCiclo(db, "1", {
      key: "clave-validar-ac10-1",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });

    expect(repetida).toEqual(primera);
    expect(fila(db, "1")).toEqual(filaTrasPrimera);
    expect(eventos(db).length).toBe(eventosTrasPrimera);
    expect(recibos(db)).toHaveLength(1);
  } finally {
    db.close();
  }
});

test("AC-10 · misma clave con otro payload (otro ciclo) es 409 IDEMPOTENCY_CONFLICT sin efectos", () => {
  const db = base();
  try {
    // El ciclo 2 necesita un siguiente Inicio para tener Fin derivado y poder
    // validarse.
    ciclo(db, "3", "2026-03-01");
    validar(db, "1", "clave-validar-ac10-2", T_VALIDAR);
    const antes = estadoCompleto(db);
    // El payload identifica lo que confirma el humano (el ciclo). La huella, la
    // revisión y la cobertura son estado medido y viajan en los tokens: "datos
    // distintos" es reusar la clave para otro ciclo, no para otro estado del
    // mismo ciclo (§3.4/AC-10).
    const preview = previewValidacion(db, "2");
    const fallo = codigoDe(() =>
      validarCiclo(db, "2", {
        key: "clave-validar-ac10-2",
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        actor: "humano",
        instante: T_IMPACTO,
      }),
    );

    expect(fallo.status).toBe(409);
    expect(fallo.code).toBe("IDEMPOTENCY_CONFLICT");
    // Sin efectos en ninguno de los dos ciclos.
    expect(estadoCompleto(db)).toEqual(antes);
    expect(fila(db, "2")).toBeNull();
    expect(recibos(db)).toHaveLength(1);
    expect(fila(db, "1")).toMatchObject({
      revision: 1,
      dirty: 0,
      huella_validacion: (
        antes.cierre_validacion[0] as { huella_validacion: string }
      ).huella_validacion,
      revision_instante: T_VALIDAR,
    });
  } finally {
    db.close();
  }
});

test("AC-10 · una clave completada no se reescribe: el tombstone conserva su hash", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-ac10-3", T_VALIDAR);
    const intento = db
      .query("SELECT key,hash,response,completado FROM validacion_attempts WHERE key=?")
      .get("clave-validar-ac10-3") as {
      key: string;
      hash: string;
      response: string;
      completado: number;
    };
    expect(intento.completado).toBe(1);
    // Mismo payload (mismo ciclo): la clave completada reproduce el recibo
    // aunque el estado haya avanzado después (§3.4/AC-10).
    db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'");
    const preview = previewValidacion(db, "1");
    const repetido = validarCiclo(db, "1", {
      key: "clave-validar-ac10-3",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });

    expect(repetido.operacionId.startsWith("OP-")).toBe(true);
    // El intento no se sobrescribe: sigue siendo uno, con su hash original y la
    // respuesta publicada entonces.
    const filas = db
      .query("SELECT key,hash,response FROM validacion_attempts")
      .all() as { key: string; hash: string; response: string }[];
    expect(filas).toHaveLength(1);
    expect(filas[0]!.key).toBe(intento.key);
    expect(filas[0]!.hash).toBe(intento.hash);
    expect(filas[0]!.response).toBe(intento.response);
    expect(JSON.parse(filas[0]!.response)).toEqual(repetido);
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * §3.4 paso 5 · IMPACT_CHANGED sin efectos (AC-55)
 * ================================================================== */

test("AC-55 · un impacto distinto entre preview y confirmación es 409 IMPACT_CHANGED", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-ac55-1", T_VALIDAR);
    const procedimiento = escritura(db, {
      payload: { subeImporte: 2500 },
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const preview = previsualizarOperacion(db, procedimiento);

    // Entre preview y confirmación otra escritura cambia el resultado medido:
    // entra un gasto nuevo en la ventana del ciclo candidato.
    gasto(db, "9", "2026-01-20", 3000);
    const antesDelIntento = estadoCompleto(db);

    const fallo = codigoDe(() =>
      confirmarOperacion(db, procedimiento, {
        key: "clave-material-ac55-1",
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        actor: "humano",
        instante: T_IMPACTO,
      }),
    );

    expect(fallo.status).toBe(409);
    expect(fallo.code).toBe("IMPACT_CHANGED");
    expect(estadoCompleto(db)).toEqual(antesDelIntento);
  } finally {
    db.close();
  }
});

test("AC-55/AC-56 · un contexto distinto entre preview y confirmación es 409 IMPACT_CHANGED", () => {
  const db = base();
  try {
    const preview = previewValidacion(db, "1");
    // Otra clave confirma primero y deja la fila creada: el contexto del preview
    // original (sin fila, revisión 0) ya no es el vigente.
    validar(db, "1", "clave-validar-ac56-2", T_VALIDAR);
    const antesDelIntento = estadoCompleto(db);

    const fallo = codigoDe(() =>
      validarCiclo(db, "1", {
        key: "clave-validar-ac56-1",
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        actor: "humano",
        instante: T_IMPACTO,
      }),
    );

    expect(fallo.status).toBe(409);
    expect(fallo.code).toBe("IMPACT_CHANGED");
    expect(estadoCompleto(db)).toEqual(antesDelIntento);
    expect(fila(db, "1")!.revision).toBe(1);
  } finally {
    db.close();
  }
});

test("AC-55 · un hecho nuevo entre preview y confirmación de validación es 409 IMPACT_CHANGED", () => {
  const db = base();
  try {
    const preview = previewValidacion(db, "1");
    // Hecho verificado que entra en la ventana después de previsualizar.
    gasto(db, "9", "2026-01-20", 700);
    const antesDelIntento = estadoCompleto(db);

    const fallo = codigoDe(() =>
      validarCiclo(db, "1", {
        key: "clave-validar-ac55-3",
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        actor: "humano",
        instante: T_VALIDAR,
      }),
    );

    // Zero efectos: sin fila de validación, sin evento y sin recibo.
    expect(fila(db, "1")).toBeNull();
    expect(eventos(db)).toHaveLength(0);
    expect(recibos(db)).toHaveLength(0);
    expect(estadoCompleto(db)).toEqual(antesDelIntento);
    // §3.4 paso 5 / ANEXO §1: lo que difiere del preview es el estado medido, y
    // prevalece IMPACT_CHANGED; un error de estructura («el payload no
    // corresponde») no es la respuesta del contrato.
    expect(fallo.code, "AC-55: el hecho nuevo debe llegar como IMPACT_CHANGED").toBe(
      "IMPACT_CHANGED",
    );
    expect(fallo.status).toBe(409);
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * §3.1/§3.2 · materialidad medida (AC-12, AC-11, AC-19, AC-20, AC-24, AC-21)
 * ================================================================== */

test("AC-12 · una errata de Concepto que sólo sube la revisión no es material", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-ac12-01", T_VALIDAR);
    const referencia = fila(db, "1")!;
    const eventosAntes = eventos(db).length;

    const procedimiento = escritura(db, {
      payload: { errata: 1 },
      aplicar: () =>
        db.run(
          "UPDATE movimientos SET concepto='Errata corregida',nota='Otra nota',revision=revision+1 WHERE id='1'",
        ),
    });
    const preview = previsualizarOperacion(db, procedimiento);
    expect(preview.material).toBe(false);
    expect(preview.afectados).toEqual([]);
    expect(preview.requiereMotivo).toBe(false);

    const recibo = confirmarOperacion(db, procedimiento, {
      key: "clave-errata-ac12-01",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });

    expect(recibo.auditIds).toEqual([]);
    expect(recibo.cierresDirty).toEqual([]);
    expect(recibo.ciclos).toEqual([{ id: "1", revision: "1", estado: "Validada" }]);
    // El hecho se escribió (la revisión subió) pero el estado no se movió.
    expect(db.query("SELECT concepto,revision FROM movimientos WHERE id='1'").get()).toEqual({
      concepto: "Errata corregida",
      revision: 2,
    });
    expect(fila(db, "1")).toEqual(referencia);
    expect(eventos(db).length).toBe(eventosAntes);
  } finally {
    db.close();
  }
});

test("AC-11/AC-19 · sobre un ciclo Pendiente, una errata conserva dirty_* y no reitera", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-ac11-01", T_VALIDAR);
    const sube = escritura(db, {
      payload: { subeImporte: 2500 },
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const previewSube = previsualizarOperacion(db, sube);
    confirmarOperacion(db, sube, {
      key: "clave-material-ac11-01",
      fingerprint: previewSube.fingerprint,
      contextRevision: previewSube.contextRevision,
      impactRevision: previewSube.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });
    const pendiente = fila(db, "1")!;
    const eventosAntes = eventos(db).length;

    const errata = escritura(db, {
      payload: { errata: 2 },
      aplicar: () => db.run("UPDATE movimientos SET nota='Texto',revision=revision+1 WHERE id='1'"),
    });
    const previewErrata = previsualizarOperacion(db, errata);
    expect(previewErrata.material).toBe(false);
    const recibo = confirmarOperacion(db, errata, {
      key: "clave-errata-ac11-02",
      fingerprint: previewErrata.fingerprint,
      contextRevision: previewErrata.contextRevision,
      impactRevision: previewErrata.impactRevision,
      actor: "humano",
      instante: T_REITERADO,
    });

    expect(recibo.auditIds).toEqual([]);
    expect(fila(db, "1")).toEqual(pendiente);
    expect(fila(db, "1")!.dirty).toBe(1);
    expect(eventos(db).length).toBe(eventosAntes);
    expect(
      eventos(db).filter((evento) => evento.accion === "dirty_reiterado"),
    ).toHaveLength(0);
  } finally {
    db.close();
  }
});

test("AC-20 · impacto material sobre Validada marca dirty con instantes y motivos, sin tocar la referencia", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-ac20-01", T_VALIDAR);
    const referencia = fila(db, "1")!;
    expect(referencia.dirty).toBe(0);

    const procedimiento = escritura(db, {
      payload: { subeImporte: 2500 },
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const preview = previsualizarOperacion(db, procedimiento);
    const recibo = confirmarOperacion(db, procedimiento, {
      key: "clave-material-ac20-01",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });

    const marcada = fila(db, "1")!;
    expect(marcada.dirty).toBe(1);
    expect(marcada.dirty_desde).toBe(T_IMPACTO);
    expect(marcada.dirty_ultimo).toBe(T_IMPACTO);
    expect(marcada.dirty_origen).toBe("Operacion");
    const motivos = JSON.parse(marcada.dirty_motivos!) as string[];
    expect(motivos).toContain("FLUJO_CICLO");
    // Revisión y referencia humana invariantes: la marca no valida ni reescribe.
    expect(marcada.revision).toBe(referencia.revision);
    expect(marcada.huella_validacion).toBe(referencia.huella_validacion);
    expect(marcada.version_conjunto).toBe(referencia.version_conjunto);
    expect(marcada.revision_actor).toBe(referencia.revision_actor);
    expect(marcada.revision_instante).toBe(referencia.revision_instante);
    // El recibo cuenta el estado real tras la operación.
    expect(recibo.ciclos).toEqual([{ id: "1", revision: "1", estado: "Pendiente" }]);
    expect(recibo.cierresDirty).toHaveLength(1);
    expect(recibo.cierresDirty[0]).toMatchObject({
      ciclo: "1",
      rango: { desde: "2026-01-01", hasta: "2026-01-31" },
      estadoValidacion: "Pendiente",
    });
    expect(proyectarValidacion(db, "1").motivos).toEqual(motivos);
  } finally {
    db.close();
  }
});

test("AC-20/ANEXO §2 · el recibo de un ciclo recién marcado declara dirtyPrevio=false", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-ac20-02", T_VALIDAR);
    const procedimiento = escritura(db, {
      payload: { subeImporte: 2500 },
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const preview = previsualizarOperacion(db, procedimiento);
    expect(preview.afectados[0]?.dirtyPrevio).toBe(false);
    const recibo: ReciboConfirmacion = confirmarOperacion(db, procedimiento, {
      key: "clave-material-ac20-02",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });

    // ANEXO §2/§3: `dirtyPrevio` significa «estado previo Pendiente»; este ciclo
    // estaba Validada antes de la operación, así que no puede declararse previo.
    expect(
      recibo.cierresDirty[0]?.dirtyPrevio,
      "ANEXO §3: dirtyPrevio=false si el ciclo no estaba pendiente antes",
    ).toBe(false);
    expect(recibo.cierresDirty[0]?.validado).toBe(true);
  } finally {
    db.close();
  }
});

test("AC-24 · el segundo impacto real conserva dirty_desde, actualiza último y reitera", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-ac24-01", T_VALIDAR);
    const primera = escritura(db, {
      payload: { subeImporte: 2500 },
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const previewPrimera = previsualizarOperacion(db, primera);
    confirmarOperacion(db, primera, {
      key: "clave-material-ac24-01",
      fingerprint: previewPrimera.fingerprint,
      contextRevision: previewPrimera.contextRevision,
      impactRevision: previewPrimera.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });
    const trasPrimera = fila(db, "1")!;
    expect(trasPrimera.dirty_desde).toBe(T_IMPACTO);

    // Segundo cambio material, medido sobre el mismo universo.
    const segunda = escritura(db, {
      payload: { cambiaPartida: "PAR0002" },
      aplicar: () =>
        db.run("UPDATE movimientos SET partida='PAR0002',revision=revision+1 WHERE id='1'"),
    });
    const previewSegunda = previsualizarOperacion(db, segunda);
    expect(previewSegunda.material).toBe(true);
    const recibo = confirmarOperacion(db, segunda, {
      key: "clave-material-ac24-02",
      fingerprint: previewSegunda.fingerprint,
      contextRevision: previewSegunda.contextRevision,
      impactRevision: previewSegunda.impactRevision,
      actor: "humano",
      instante: T_REITERADO,
    });

    const trasSegunda = fila(db, "1")!;
    expect(trasSegunda.dirty).toBe(1);
    expect(trasSegunda.dirty_desde).toBe(T_IMPACTO);
    expect(trasSegunda.dirty_ultimo).toBe(T_REITERADO);
    expect(JSON.parse(trasSegunda.dirty_motivos!)).toContain("ATRIBUCION");
    expect(trasSegunda.huella_validacion).toBe(trasPrimera.huella_validacion);
    expect(trasSegunda.revision).toBe(trasPrimera.revision);
    // El evento es la reiteración, y el recibo declara el estado previo real.
    const reiterado = eventos(db, "1").at(-1)!;
    expect(reiterado.accion).toBe("dirty_reiterado");
    expect(reiterado.intento).toBe(recibo.operacionId);
    expect(reiterado.revision).toBe(trasPrimera.revision);
    expect(recibo.cierresDirty[0]?.dirtyPrevio).toBe(true);
  } finally {
    db.close();
  }
});

test("AC-21 · la reversión exacta deja divergencia Igual y Pendiente, con evento reversion", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-ac21-01", T_VALIDAR);
    const referencia = fila(db, "1")!;

    const sube = escritura(db, {
      payload: { subeImporte: 2500 },
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const previewSube = previsualizarOperacion(db, sube);
    expect(previewSube.material).toBe(true);
    confirmarOperacion(db, sube, {
      key: "clave-material-ac21-01",
      fingerprint: previewSube.fingerprint,
      contextRevision: previewSube.contextRevision,
      impactRevision: previewSube.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });

    const baja = escritura(db, {
      payload: { vuelveImporte: 1000 },
      aplicar: () => db.run("UPDATE movimientos SET importe=1000,revision=revision+1 WHERE id='1'"),
    });
    const previewBaja = previsualizarOperacion(db, baja);
    // La operación es material aunque devuelva el ciclo a su referencia.
    expect(previewBaja.material).toBe(true);
    expect(previewBaja.afectados[0]?.motivos).toContain("FLUJO_CICLO");
    const recibo = confirmarOperacion(db, baja, {
      key: "clave-material-ac21-02",
      fingerprint: previewBaja.fingerprint,
      contextRevision: previewBaja.contextRevision,
      impactRevision: previewBaja.impactRevision,
      actor: "humano",
      instante: T_REVERSION,
    });

    const final = fila(db, "1")!;
    expect(final.dirty).toBe(1);
    expect(final.dirty_desde).toBe(T_IMPACTO);
    expect(final.huella_validacion).toBe(referencia.huella_validacion);
    expect(recibo.ciclos[0]?.estado).toBe("Pendiente");

    const proyeccion = proyectarValidacion(db, "1");
    expect(proyeccion.estado).toBe("Pendiente");
    expect(proyeccion.divergenciaValidacion).toBe("Igual");
    expect(proyeccion.pendienteSinDelta).toBe(true);

    const eventosFinales = eventos(db, "1");
    expect(eventosFinales.at(-1)!.accion).toBe("reversion");
    expect(eventosFinales.at(-1)!.intento).toBe(recibo.operacionId);
    expect(eventosFinales.filter((evento) => evento.accion === "dirty_reiterado")).toHaveLength(
      0,
    );
    // No hay cuarto estado: sigue siendo una fila pendiente de revisión.
    expect(
      db.query("SELECT COUNT(*) AS n FROM cierre_validacion WHERE ciclo='1'").get(),
    ).toEqual({ n: 1 });
  } finally {
    db.close();
  }
});

test("AC-22 · confirmar la revisión pendiente es la única limpieza: revisión +1 y referencia actual", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-ac22-01", T_VALIDAR);
    const sube = escritura(db, {
      payload: { subeImporte: 2500 },
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const previewSube = previsualizarOperacion(db, sube);
    confirmarOperacion(db, sube, {
      key: "clave-material-ac22-01",
      fingerprint: previewSube.fingerprint,
      contextRevision: previewSube.contextRevision,
      impactRevision: previewSube.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });
    const pendiente = proyectarValidacion(db, "1");
    expect(pendiente.estado).toBe("Pendiente");
    const huellaVigente = pendiente.huellaVigente;

    const previewConfirmar = previewValidacion(db, "1");
    const recibo = confirmarRevisionCiclo(db, "1", {
      key: "clave-confirmar-ac22-01",
      fingerprint: previewConfirmar.fingerprint,
      contextRevision: previewConfirmar.contextRevision,
      impactRevision: previewConfirmar.impactRevision,
      actor: "humano",
      instante: T_CONFIRMAR,
      motivo: "Revisado el cambio de importe",
    });

    const limpia = fila(db, "1")!;
    expect(limpia.revision).toBe(2);
    expect(limpia.dirty).toBe(0);
    expect(limpia.dirty_desde).toBeNull();
    expect(limpia.dirty_ultimo).toBeNull();
    expect(limpia.dirty_motivos).toBeNull();
    expect(limpia.huella_validacion).toBe(huellaVigente);
    expect(limpia.version_conjunto).toBe("3");
    expect(limpia.revision_actor).toBe("humano");
    expect(limpia.revision_instante).toBe(T_CONFIRMAR);
    expect(recibo.ciclos).toEqual([{ id: "1", revision: "2", estado: "Validada" }]);
    expect(recibo.cierresDirty).toEqual([]);

    const evento = eventos(db, "1").at(-1)!;
    expect(evento.accion).toBe("confirmar_revision");
    expect(evento.revision).toBe(2);

    const proyeccion = proyectarValidacion(db, "1");
    expect(proyeccion.estado).toBe("Validada");
    expect(proyeccion.divergenciaValidacion).toBe("Igual");
    expect(proyeccion.validado).toBe(true);
    expect(proyeccion.pendienteSinDelta).toBe(false);
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * G3/§2.4 · el recibo no transporta cifras
 * ================================================================== */

test("G3/§2.4 · el recibo no contiene cifras y el trigger de I1 lo acepta", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-g3-01", T_VALIDAR);
    const procedimiento = escritura(db, {
      payload: { subeImporte: 2500 },
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const preview = previsualizarOperacion(db, procedimiento);
    const recibo = confirmarOperacion(db, procedimiento, {
      key: "clave-material-g3-01",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });

    // Ni `number` JSON ni texto monetario en ningún nivel del recibo.
    expect(sinCifras(recibo)).toBe(true);
    expect(JSON.stringify(recibo)).not.toContain("2500");
    expect(JSON.stringify(recibo)).not.toContain("1000");
    // Y la base lo aceptó con la forma exacta de §2.4 (trigger de I1).
    const persistido = recibos(db);
    expect(persistido.map((intento) => intento.key)).toContain("clave-material-g3-01");
    const intento = persistido.find((entrada) => entrada.key === "clave-material-g3-01")!;
    expect(JSON.parse(intento.response)).toEqual(recibo);
    // Control negativo: el mismo trigger rechaza un recibo con cifra.
    expect(() =>
      db.run(
        `INSERT INTO validacion_attempts(operacion,key,hash,response,completado,expira)
         VALUES('validar','clave-recibo-invalido',?, ?,1,1)`,
        [
          "a".repeat(64),
          JSON.stringify({ ...recibo, cierresDirty: [{ ...recibo.cierresDirty[0], total: "2500" }] }),
        ],
      ),
    ).toThrow("recibo de validacion invalido");
    // La auditoría de validación tampoco copió el preview ni la cifra.
    const marca = eventos(db, "1").at(-1)!;
    expect(marca.detalle).not.toContain("2500");
    expect(marca.origen).toBeNull();
    expect(JSON.parse(marca.detalle)).not.toHaveProperty("afectados");
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * §3.1/AC-17 · ausencia de fuente: no es igualdad ni marca
 * ================================================================== */

test("AC-17 · una fuente no disponible deja material=null y no marca", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-ac17-01", T_VALIDAR);
    // Fuente imprescindible para medir stock que deja de estar instalada: la
    // cobertura pasa a NoDisponible y el grupo no se compara como igualdad.
    db.run("DROP TABLE operaciones_inversion");
    const antesDelIntento = {
      validacion: db.query("SELECT * FROM cierre_validacion WHERE ciclo='1'").get(),
      eventos: eventos(db).length,
    };

    const procedimiento = escritura(db, {
      payload: { nota: "sin efecto" },
      aplicar: () => db.run("UPDATE movimientos SET nota='x',revision=revision+1 WHERE id='1'"),
    });
    const preview = previsualizarOperacion(db, procedimiento);
    // `null`, no `false`: hay componentes que no se pueden medir (§3.1, G11).
    expect(preview.material).toBeNull();
    expect(preview.afectados).toEqual([]);
    expect(preview.requiereMotivo).toBe(false);

    const recibo = confirmarOperacion(db, procedimiento, {
      key: "clave-ac17-01",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });
    expect(recibo.auditIds).toEqual([]);
    expect(recibo.ciclos).toEqual([{ id: "1", revision: "1", estado: "Validada" }]);
    // La cobertura cambió, la marca no.
    expect(db.query("SELECT * FROM cierre_validacion WHERE ciclo='1'").get()).toEqual(
      antesDelIntento.validacion,
    );
    expect(eventos(db).length).toBe(antesDelIntento.eventos);
    expect(db.query("SELECT revision FROM movimientos WHERE id='1'").get()).toEqual({
      revision: 2,
    });
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * §2.4/AC-25 · revisiones y auditoría inmutable en el flujo real
 * ================================================================== */

test("AC-25 · marcar mantiene la revisión y la revisión humana exige exactamente r+1", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-ac25-01", T_VALIDAR);
    const procedimiento = escritura(db, {
      payload: { subeImporte: 2500 },
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const preview = previsualizarOperacion(db, procedimiento);
    confirmarOperacion(db, procedimiento, {
      key: "clave-material-ac25-01",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });
    // Marcar dejó la revisión en r, no en r+1.
    expect(db.query("SELECT revision,dirty FROM cierre_validacion WHERE ciclo='1'").get()).toEqual({
      revision: 1,
      dirty: 1,
    });

    // Disminuir y saltar fallan en los triggers nuevos, no por monotonía antigua.
    expect(() =>
      db.run("UPDATE cierre_validacion SET revision=0 WHERE ciclo='1'"),
    ).toThrow("la revision de validacion no puede disminuir");
    expect(() =>
      db.run("UPDATE cierre_validacion SET revision=3 WHERE ciclo='1'"),
    ).toThrow("la revision de validacion no puede saltar");
    // Avanzar r+1 sin referencia humana nueva tampoco pasa.
    expect(() =>
      db.run("UPDATE cierre_validacion SET revision=2 WHERE ciclo='1'"),
    ).toThrow("avanzar la revision exige una revision humana");
    // La auditoría es inmutable.
    expect(() =>
      db.run("UPDATE cierre_validacion_audit SET actor='otro' WHERE ciclo='1'"),
    ).toThrow("immutable validation audit");
    expect(() => db.run("DELETE FROM cierre_validacion_audit WHERE ciclo='1'")).toThrow(
      "immutable validation audit",
    );
    // Nada de lo rechazado dejó rastro.
    expect(db.query("SELECT revision,dirty FROM cierre_validacion WHERE ciclo='1'").get()).toEqual({
      revision: 1,
      dirty: 1,
    });
    expect(eventos(db)).toHaveLength(2);
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * ANEXO §1 · precedencia de errores
 * ================================================================== */

test("ANEXO §1 · estructura antes que revisión y revisión antes que impacto", () => {
  const db = base();
  try {
    // Revisión esperada ya obsoleta (el ciclo está en 1) y huella de payload falsa:
    // la estructura se evalúa antes que la revisión.
    const obsoletoFalso = escritura(db, {
      payload: { subeImporte: 2500 },
      revisiones: [{ tipo: "ciclo", ciclo: "1", revision: 0 }],
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const previewFalso = previsualizarOperacion(db, obsoletoFalso);
    const estructura = codigoDe(() =>
      confirmarOperacion(db, obsoletoFalso, {
        key: "clave-precedencia-01",
        fingerprint: "0".repeat(64),
        contextRevision: previewFalso.contextRevision,
        impactRevision: previewFalso.impactRevision,
        actor: "humano",
        instante: T_IMPACTO,
      }),
    );
    expect(estructura.status).toBe(422);
    expect(estructura.code).toBe("VALIDATION");
    expect(estructura.message).toContain("fingerprint");

    // Con el payload correcto pero la revisión obsoleta y el impacto cambiado,
    // gana REVISION_CONFLICT: no se llega a comparar el impacto.
    db.run("UPDATE movimientos SET importe=3000,revision=revision+1 WHERE id='2'");
    const antesDelIntento = estadoCompleto(db);
    const revision = codigoDe(() =>
      confirmarOperacion(db, obsoletoFalso, {
        key: "clave-precedencia-02",
        fingerprint: previewFalso.fingerprint,
        contextRevision: previewFalso.contextRevision,
        impactRevision: previewFalso.impactRevision,
        actor: "humano",
        instante: T_IMPACTO,
      }),
    );
    expect(revision.status).toBe(409);
    expect(revision.code).toBe("REVISION_CONFLICT");
    expect(estadoCompleto(db)).toEqual(antesDelIntento);
  } finally {
    db.close();
  }
});

test("ANEXO §1 · la clave completada se resuelve antes que una revisión obsoleta", () => {
  const db = base();
  try {
    const completado = escritura(db, {
      payload: { subeImporte: 2500 },
      revisiones: [{ tipo: "ciclo", ciclo: "1", revision: 1 }],
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const preview = previsualizarOperacion(db, completado);
    const recibo = confirmarOperacion(db, completado, {
      key: "clave-precedencia-00",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });
    const antesDelReintento = estadoCompleto(db);

    // Mismo key y mismo payload, pero la revisión que el procedimiento declara
    // ya es obsoleta: la clave completada responde antes de mirar revisiones.
    const obsoleto = escritura(db, {
      payload: { subeImporte: 2500 },
      revisiones: [{ tipo: "ciclo", ciclo: "1", revision: 0 }],
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const repetido = confirmarOperacion(db, obsoleto, {
      key: "clave-precedencia-00",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_REITERADO,
    });

    expect(repetido).toEqual(recibo);
    expect(estadoCompleto(db)).toEqual(antesDelReintento);
  } finally {
    db.close();
  }
});

test("ANEXO §1 · la existencia se comprueba antes de medir impacto (404)", () => {
  const db = base();
  try {
    const antes = estadoCompleto(db);
    const procedimiento = escritura(db, {
      ciclo: "99",
      payload: { importe: 1 },
      aplicar: () => db.run("UPDATE movimientos SET importe=1 WHERE id='1'"),
    });
    const preview = codigoDe(() => previsualizarOperacion(db, procedimiento));
    expect(preview.status).toBe(404);
    expect(preview.code).toBe("NOT_FOUND");
    const confirmar = codigoDe(() =>
      confirmarOperacion(db, procedimiento, {
        key: "clave-precedencia-03",
        fingerprint: "a".repeat(64),
        contextRevision: "b".repeat(64),
        impactRevision: "c".repeat(64),
        actor: "humano",
        instante: T_IMPACTO,
      }),
    );
    expect(confirmar.status).toBe(404);
    expect(confirmar.code).toBe("NOT_FOUND");
    expect(estadoCompleto(db)).toEqual(antes);
  } finally {
    db.close();
  }
});

test("G9 · la confirmación exige clave de intento y tokens con formato de huella", () => {
  const db = base();
  try {
    const procedimiento = escritura(db, {
      payload: { importe: 1 },
      aplicar: () => db.run("UPDATE movimientos SET importe=1 WHERE id='1'"),
    });
    const preview = previsualizarOperacion(db, procedimiento);
    const valida: EntradaConfirmacion = {
      key: "clave-formato-00",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_FALLO,
    };
    const invalidas: EntradaConfirmacion[] = [
      { ...valida, key: "corta" },
      { ...valida, fingerprint: "no-es-huella" },
      { ...valida, contextRevision: "xyz" },
      { ...valida, impactRevision: "xyz" },
      { ...valida, actor: " " },
    ];
    for (const entrada of invalidas) {
      const fallo = codigoDe(() => confirmarOperacion(db, procedimiento, entrada));
      expect(fallo.status).toBe(422);
      expect(fallo.code).toBe("VALIDATION");
    }
    expect(recibos(db)).toHaveLength(0);
    expect(eventos(db)).toHaveLength(0);
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * SPEC39 §3.3/§4 · cobertura `devoluciones`, motivo y 409 de impacto
 * ================================================================== */

test("AC-09/§5 · la cobertura parcial por devoluciones exige motivo y se persiste", () => {
  const db = base();
  try {
    devolucion(db, "9", "2026-01-20", 300, { estado: "Sin vínculo" });
    const preview = previewValidacion(db, "1");
    expect(preview.requiereMotivo).toBe(true);
    expect(
      preview.cobertura.find((entrada) => entrada.fuente === "devoluciones"),
    ).toEqual({ fuente: "devoluciones", estado: "Parcial", causas: ["SIN_VINCULO"] });

    const sinMotivo = codigoDe(() =>
      validarCiclo(db, "1", {
        key: "clave-parcial-sin-motivo-01",
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        actor: "humano",
        instante: T_VALIDAR,
      }),
    );
    expect(sinMotivo.status).toBe(422);
    expect(sinMotivo.code).toBe("VALIDATION");
    expect(sinMotivo.message).toContain("motivo");
    expect(fila(db, "1")).toBeNull();
    expect(eventos(db)).toHaveLength(0);
    expect(recibos(db)).toHaveLength(0);

    const recibo = validar(db, "1", "clave-parcial-con-motivo-01", T_VALIDAR, "Abono huérfano revisado");
    expect(recibo.ciclos).toEqual([{ id: "1", revision: "1", estado: "Validada" }]);
    const persistida = JSON.parse(
      (
        db.query("SELECT cobertura FROM cierre_validacion WHERE ciclo='1'").get() as {
          cobertura: string;
        }
      ).cobertura,
    ) as { fuente: string; estado: string; causas: string[] }[];
    expect(persistida.find((entrada) => entrada.fuente === "devoluciones")).toEqual({
      fuente: "devoluciones",
      estado: "Parcial",
      causas: ["SIN_VINCULO"],
    });
  } finally {
    db.close();
  }
});

test("§4 · un exceso histórico bloquea la validación con DEVOLUCIONES_NO_DISPONIBLE", () => {
  const db = base();
  try {
    devolucion(db, "9", "2026-01-20", 300);
    // Descuento 300 > compra 200: el GRE no es medible.
    db.run("UPDATE movimientos SET importe=200 WHERE id='1'");

    const requisitos = requisitosDeValidacion(db, "1");
    expect(requisitos.bloqueos.map((bloqueo) => bloqueo.code)).toContain(
      "DEVOLUCIONES_NO_DISPONIBLE",
    );
    expect(
      requisitos.cobertura.find((entrada) => entrada.fuente === "devoluciones"),
    ).toEqual({ fuente: "devoluciones", estado: "NoDisponible", causas: ["EXCESO"] });

    const fallo = codigoDe(() => previewValidacion(db, "1"));
    expect(fallo.status).toBe(422);
    expect(fallo.code).toBe("VALIDATION");
    expect(fallo.message).toContain("DEVOLUCIONES_NO_DISPONIBLE");
    expect(fila(db, "1")).toBeNull();
  } finally {
    db.close();
  }
});

test("§5 · una operación genérica con flujo no disponible falla 409 IMPACTO_NO_VERIFICABLE sin escritura", () => {
  const db = base();
  try {
    devolucion(db, "9", "2026-01-20", 300);
    db.run("UPDATE movimientos SET importe=200 WHERE id='1'");
    const antes = estadoCompleto(db);

    const procedimiento = escritura(db, {
      payload: { toca: "2" },
      aplicar: () =>
        db.run("UPDATE movimientos SET nota='tocado',revision=revision+1 WHERE id='2'"),
    });
    const fallo = codigoDe(() => previsualizarOperacion(db, procedimiento));
    expect(fallo.status).toBe(409);
    expect(fallo.code).toBe("IMPACTO_NO_VERIFICABLE");
    expect(estadoCompleto(db)).toEqual(antes);
    expect(db.query("SELECT nota,revision FROM movimientos WHERE id='2'").get()).toEqual({
      nota: "",
      revision: 1,
    });
  } finally {
    db.close();
  }
});

test("AC-55/§3.1 · un cambio sólo de cobertura entre preview y confirmación da IMPACT_CHANGED sin dirty", () => {
  const db = base();
  try {
    validar(db, "1", "clave-validar-cobertura-01", T_VALIDAR);
    const referencia = fila(db, "1")!;
    const procedimiento = escritura(db, {
      payload: { noop: true },
      aplicar: () => {},
    });
    const preview = previsualizarOperacion(db, procedimiento);
    expect(preview.material).toBe(false);

    // Una fuente deja de estar instalada: cambia la cobertura/universo, no una
    // magnitud material ni la huella validada.
    db.run("DROP TABLE operaciones_inversion");
    const antesDelIntento = estadoCompleto(db);
    const fallo = codigoDe(() =>
      confirmarOperacion(db, procedimiento, {
        key: "clave-cobertura-ac55-01",
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        actor: "humano",
        instante: T_IMPACTO,
      }),
    );
    expect(fallo.status).toBe(409);
    expect(fallo.code).toBe("IMPACT_CHANGED");
    expect(estadoCompleto(db)).toEqual(antesDelIntento);
    expect(fila(db, "1")).toEqual(referencia);
  } finally {
    db.close();
  }
});

test("§5 · confirmar una revisión pendiente con cobertura parcial exige motivo", () => {
  const db = base();
  try {
    devolucion(db, "9", "2026-01-20", 300, { estado: "Sin vínculo" });
    validar(db, "1", "clave-validar-parcial-conf-01", T_VALIDAR, "Cobertura parcial revisada");

    const material = escritura(db, {
      payload: { sube: 2500 },
      aplicar: () => db.run("UPDATE movimientos SET importe=2500,revision=revision+1 WHERE id='1'"),
    });
    const previewMaterial = previsualizarOperacion(db, material);
    confirmarOperacion(db, material, {
      key: "clave-material-parcial-conf-01",
      fingerprint: previewMaterial.fingerprint,
      contextRevision: previewMaterial.contextRevision,
      impactRevision: previewMaterial.impactRevision,
      actor: "humano",
      instante: T_IMPACTO,
    });
    expect(fila(db, "1")!.dirty).toBe(1);

    const preview = previewValidacion(db, "1");
    expect(preview.requiereMotivo).toBe(true);
    const sinMotivo = codigoDe(() =>
      confirmarRevisionCiclo(db, "1", {
        key: "clave-confirmar-sin-motivo-01",
        fingerprint: preview.fingerprint,
        contextRevision: preview.contextRevision,
        impactRevision: preview.impactRevision,
        actor: "humano",
        instante: T_CONFIRMAR,
      }),
    );
    expect(sinMotivo.status).toBe(422);
    expect(sinMotivo.code).toBe("VALIDATION");
    expect(sinMotivo.message).toContain("motivo");
    expect(fila(db, "1")!.dirty).toBe(1);

    const recibo = confirmarRevisionCiclo(db, "1", {
      key: "clave-confirmar-con-motivo-01",
      fingerprint: preview.fingerprint,
      contextRevision: preview.contextRevision,
      impactRevision: preview.impactRevision,
      actor: "humano",
      instante: T_CONFIRMAR,
      motivo: "Cambio revisado con abono huérfano",
    });
    expect(recibo.ciclos).toEqual([{ id: "1", revision: "2", estado: "Validada" }]);
    expect(fila(db, "1")!.dirty).toBe(0);
  } finally {
    db.close();
  }
});