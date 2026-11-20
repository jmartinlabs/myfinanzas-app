import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { prepareSchema } from "./database-schema";
import {
  ESTADOS_VISIBLES,
  exigirEstadoValidacionDisponible,
  leerFilaValidacion,
  proyectarValidacion,
} from "./cierre-validacion-estado";
import {
  VERSION_CONJUNTO,
  divergenciaValidacion,
  huellaUniverso,
  universoFinanciero,
} from "./cierre-validacion-impacto";
import { Problem } from "./problem";

/**
 * SPEC38 · I2 — proyección del estado de validación (§2.2, §3.2, §7.6).
 *
 * Estas pruebas fijan el contrato que la UI y la API leen: tres estados
 * visibles y dos atributos derivados, `divergenciaValidacion` como diagnóstico
 * que nunca limpia ni marca por sí solo, y la lectura **fallando cerrada** con
 * 503 cuando la tabla o su contrato no están (G4). Ninguna prueba tolera que un
 * fallo de lectura se presente como «sin validar»: ese es precisamente el modo
 * de fallo que §7.6 prohíbe.
 */

const t = "2026-01-01T00:00:00.000Z";
const t2 = "2026-02-01T00:00:00.000Z";
const t3 = "2026-03-01T00:00:00.000Z";
const COBERTURA = JSON.stringify([
  { fuente: "movimientos", estado: "Disponible", causas: [] },
]);

function store(): Database {
  const db = new Database(":memory:", { strict: true });
  prepareSchema(db, { origin: "demo", key_hash: null });
  return db;
}

function clasificacion(db: Database) {
  db.run(
    `INSERT INTO categorias VALUES('CAT0001','Ficticia',NULL,'Gasto','Gasto',0,'Activa',1,?,?)`,
    [t, t],
  );
  db.run(`INSERT INTO subcategorias VALUES('SUB0001','Ficticia','CAT0001','Activa',1,?,?)`, [t, t]);
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR0001','Ficticia','SUB0001','Activa',1,?,?)`,
    [t, t],
  );
}

function ciclo(db: Database, id = "1", inicio = "2026-01-01") {
  db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,0,?)", [id, inicio, t]);
}

function gasto(db: Database, id = "1") {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,
       concepto,nota,anulado,revision,creado,actualizado)
     VALUES(?, '2026-01-04','Gasto',1000,'S001','S000',NULL,'PAR0001','Ficticio','',0,1,?,?)`,
    [id, t, t],
  );
}

/** Base mínima con universo financiero medible para el ciclo 1. */
function base(): Database {
  const db = store();
  clasificacion(db);
  ciclo(db);
  gasto(db);
  return db;
}

/** Huella vigente del ciclo tal como la calcula el módulo bajo prueba. */
function huellaVigente(db: Database, cicloId = "1"): string {
  return huellaUniverso(universoFinanciero(db, cicloId));
}

/** Fila `Validada`: `dirty=0` exige referencia humana completa (§2.2, trigger). */
function filaValidada(
  db: Database,
  cicloId = "1",
  extra: {
    huella?: string;
    version?: string;
    actor?: string | null;
    instante?: string | null;
    revision?: number;
    motivo?: string | null;
  } = {},
) {
  db.run(
    `INSERT INTO cierre_validacion(ciclo,revision,dirty,huella_validacion,version_conjunto,
       revision_actor,revision_instante,revision_motivo,cobertura)
     VALUES(?,?,0,?,?,?,?,?,?)`,
    [
      cicloId,
      extra.revision ?? 2,
      extra.huella ?? huellaVigente(db, cicloId),
      extra.version ?? VERSION_CONJUNTO,
      extra.actor === undefined ? "humano" : extra.actor,
      extra.instante === undefined ? t2 : extra.instante,
      extra.motivo ?? null,
      COBERTURA,
    ],
  );
}

/** Fila `Pendiente`: `dirty=1` conserva primer/último instante y motivos. */
function filaPendiente(
  db: Database,
  cicloId = "1",
  extra: {
    motivos?: string;
    desde?: string;
    ultimo?: string;
    origen?: string;
    huella?: string | null;
    version?: string | null;
    actor?: string | null;
    instante?: string | null;
  } = {},
) {
  db.run(
    `INSERT INTO cierre_validacion(ciclo,revision,dirty,dirty_desde,dirty_ultimo,dirty_origen,
       dirty_motivos,huella_validacion,version_conjunto,revision_actor,revision_instante,cobertura)
     VALUES(?,1,1,?,?,?,?,?,?,?,?,?)`,
    [
      cicloId,
      extra.desde ?? t,
      extra.ultimo ?? t2,
      extra.origen ?? "Operacion",
      extra.motivos ?? JSON.stringify(["FLUJO_CICLO"]),
      extra.huella ?? null,
      extra.version ?? null,
      extra.actor ?? null,
      extra.instante ?? null,
      COBERTURA,
    ],
  );
}

function problema(fn: () => unknown): Problem {
  try {
    fn();
  } catch (error) {
    if (error instanceof Problem) return error;
    throw error;
  }
  throw new Error("se esperaba un Problem y no se lanzó nada");
}

/* ================================================================== *
 * §2.2 · Tres estados visibles
 * ================================================================== */

test("I2 estado · §2.2: SinValidar es la ausencia de fila, no un fallo de lectura", () => {
  const db = base();
  try {
    expect(() => exigirEstadoValidacionDisponible(db)).not.toThrow();
    expect(leerFilaValidacion(db, "1")).toBeNull();

    const dto = proyectarValidacion(db, "1");
    expect(dto.estado).toBe("SinValidar");
    expect(dto.revision).toBeNull();
    expect(dto.dirty).toBe(false);
    expect(dto.dirtyDesde).toBeNull();
    expect(dto.dirtyUltimo).toBeNull();
    expect(dto.dirtyOrigen).toBeNull();
    expect(dto.motivos).toEqual([]);
    expect(dto.cobertura).toEqual([]);
    // Sin referencia humana no hay nada con qué comparar (no es «igual»).
    expect(dto.divergenciaValidacion).toBe("NoComparable");
    expect(dto.pendienteSinDelta).toBe(false);
    expect(dto.revalidacionSugerida).toBe(false);
    expect(dto.validado).toBe(false);
    expect(dto.versionConjunto).toBeNull();
    expect(dto.huellaValidacion).toBeNull();
    expect(dto.ultimaRevision).toBeNull();
    expect(dto.huellaVigente).toBe(huellaVigente(db));
  } finally {
    db.close();
  }
});

test("I2 estado · §2.2/AC-22: Validada exige dirty=0, huella, versión vigente y actor+instante", () => {
  const db = base();
  try {
    const huella = huellaVigente(db);
    filaValidada(db, "1", { huella, motivo: "revisión ficticia" });

    const fila = leerFilaValidacion(db, "1")!;
    expect(fila.ciclo).toBe("1");
    expect(fila.dirty).toBe(0);
    expect(fila.huella_validacion).toBe(huella);
    expect(fila.version_conjunto).toBe(VERSION_CONJUNTO);
    expect(fila.revision_actor).toBe("humano");
    expect(fila.revision_instante).toBe(t2);

    const dto = proyectarValidacion(db, "1");
    expect(dto.estado).toBe("Validada");
    expect(dto.dirty).toBe(false);
    expect(dto.validado).toBe(true);
    expect(dto.divergenciaValidacion).toBe("Igual");
    expect(dto.pendienteSinDelta).toBe(false);
    expect(dto.revalidacionSugerida).toBe(false);
    expect(dto.huellaValidacion).toBe(huella);
    expect(dto.huellaVigente).toBe(huella);
    expect(dto.versionConjunto).toBe(VERSION_CONJUNTO);
    expect(dto.ultimaRevision).toEqual({
      actor: "humano",
      instante: t2,
      motivo: "revisión ficticia",
    });
    // La cobertura se proyecta por códigos, sin texto financiero (§2.1).
    expect(dto.cobertura).toEqual([{ fuente: "movimientos", estado: "Disponible", causas: [] }]);
  } finally {
    db.close();
  }
});

test("I2 estado · §2.2/AC-22: Pendiente se deriva de dirty=1 y conserva su causa", () => {
  const db = base();
  try {
    filaPendiente(db, "1", {
      motivos: JSON.stringify(["FLUJO_CICLO", "BALANCE_FIN"]),
      desde: t,
      ultimo: t3,
      origen: "Operacion",
    });

    const dto = proyectarValidacion(db, "1");
    expect(dto.estado).toBe("Pendiente");
    expect(dto.dirty).toBe(true);
    expect(dto.dirtyDesde).toBe(t);
    expect(dto.dirtyUltimo).toBe(t3);
    expect(dto.dirtyOrigen).toBe("Operacion");
    expect(dto.motivos).toEqual(["FLUJO_CICLO", "BALANCE_FIN"]);
    // Sin referencia humana no hay validación previa que atribuir.
    expect(dto.validado).toBe(false);
    expect(dto.ultimaRevision).toBeNull();
    expect(dto.divergenciaValidacion).toBe("NoComparable");
    expect(dto.pendienteSinDelta).toBe(false);
    // Pendiente sin delta no se convierte en un cuarto estado.
    expect(ESTADOS_VISIBLES).toContain(dto.estado);
    expect(dto.estado).not.toBe("SinValidar");
  } finally {
    db.close();
  }
});

test("I2 estado · §2.2: los estados visibles son exactamente tres, sin Abierto/Reabierto/Recerrado", () => {
  expect(ESTADOS_VISIBLES).toEqual(["SinValidar", "Validada", "Pendiente"]);
  expect(ESTADOS_VISIBLES).toHaveLength(3);
  expect(ESTADOS_VISIBLES as readonly string[]).not.toContain("Abierto");
  expect(ESTADOS_VISIBLES as readonly string[]).not.toContain("Reabierto");
  expect(ESTADOS_VISIBLES as readonly string[]).not.toContain("Recerrado");
});

/* ================================================================== *
 * §3.2 · divergenciaValidacion: Igual / Distinta / NoComparable
 * ================================================================== */

test("I2 estado · §3.2: divergenciaValidacion distingue Igual, Distinta y NoComparable", () => {
  const huella = "a".repeat(64);
  const otra = "b".repeat(64);

  // Misma versión de conjunto y misma huella.
  expect(divergenciaValidacion({ huella, versionConjunto: VERSION_CONJUNTO }, huella)).toBe(
    "Igual",
  );
  // Misma versión y huella distinta: diagnóstico de cambio, no limpieza.
  expect(divergenciaValidacion({ huella: otra, versionConjunto: VERSION_CONJUNTO }, huella)).toBe(
    "Distinta",
  );
  // Huella nula: no existe referencia humana comparable (§2.1).
  expect(divergenciaValidacion({ huella: null, versionConjunto: VERSION_CONJUNTO }, huella)).toBe(
    "NoComparable",
  );
  // Versión de conjunto distinta: universos no comparables (AC-07).
  expect(divergenciaValidacion({ huella, versionConjunto: "1" }, huella)).toBe("NoComparable");
  // Pareja incompleta: tampoco es comparable.
  expect(divergenciaValidacion({ huella: null, versionConjunto: null }, huella)).toBe(
    "NoComparable",
  );
  expect(divergenciaValidacion({ huella, versionConjunto: null }, huella)).toBe("NoComparable");
  // La versión vigente por defecto es la del contrato.
  expect(divergenciaValidacion({ huella, versionConjunto: VERSION_CONJUNTO }, huella)).toBe(
    divergenciaValidacion({ huella, versionConjunto: VERSION_CONJUNTO }, huella, VERSION_CONJUNTO),
  );
});

test("I2 estado · §3.2/AC-21: Pendiente con divergencia Igual expone pendienteSinDelta, no un cuarto estado", () => {
  const db = base();
  try {
    const huella = huellaVigente(db);
    // La operación material volvió exactamente a la referencia humana: dirty=1
    // con referencia comparable y evidencia humana previa.
    filaPendiente(db, "1", {
      huella,
      version: VERSION_CONJUNTO,
      actor: "humano",
      instante: t3,
      motivos: JSON.stringify(["FLUJO_CICLO"]),
    });

    const dto = proyectarValidacion(db, "1");
    expect(dto.estado).toBe("Pendiente");
    expect(dto.divergenciaValidacion).toBe("Igual");
    expect(dto.pendienteSinDelta).toBe(true);
    // Revertir a la referencia no marca revalidación: no hay delta que revisar.
    expect(dto.revalidacionSugerida).toBe(false);
    // El ciclo no se limpia solo: la única limpieza es la revisión humana.
    expect(dto.dirty).toBe(true);
    expect(dto.motivos).toEqual(["FLUJO_CICLO"]);
    expect(ESTADOS_VISIBLES).toContain(dto.estado);
  } finally {
    db.close();
  }
});

test("I2 estado · §2.2/AC-07: un conjunto distinto nunca se presenta como validado y sugiere revalidar", () => {
  const db = base();
  try {
    const huella = huellaVigente(db);
    // Referencia humana de otra versión de conjunto (fila migrada de v31).
    filaValidada(db, "1", { huella, version: "1" });

    const dto = proyectarValidacion(db, "1");
    // No se reescribe ni se descarta la referencia histórica.
    expect(dto.huellaValidacion).toBe(huella);
    expect(dto.versionConjunto).toBe("1");
    // No es comparable: el conjunto vigente no es el validado.
    expect(dto.divergenciaValidacion).toBe("NoComparable");
    expect(dto.validado).toBe(false);
    // §3.2: «no lo convierte en SinValidar».
    expect(dto.estado).not.toBe("SinValidar");
    // AC-07: «Cambio solo de conjunto sugiere revalidar».
    expect(dto.revalidacionSugerida).toBe(true);
  } finally {
    db.close();
  }
});

test("I2 estado · §2.2/§3.2: huella distinta con la misma versión diverge sin sugerir revalidar", () => {
  const db = base();
  try {
    // Referencia humana de la misma versión pero de otro contenido.
    filaValidada(db, "1", { huella: "c".repeat(64), version: VERSION_CONJUNTO });

    const dto = proyectarValidacion(db, "1");
    expect(dto.divergenciaValidacion).toBe("Distinta");
    // §2.2: la sugerencia es sólo por conjunto distinto; aquí el conjunto
    // coincide y la divergencia es diagnóstica. No limpia ni marca por sí sola.
    expect(dto.revalidacionSugerida).toBe(false);
    expect(dto.pendienteSinDelta).toBe(false);
    expect(dto.dirty).toBe(false);
    expect(dto.estado).not.toBe("SinValidar");
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * §7.6 / G4 · lectura fail-closed
 * ================================================================== */

test("I2 estado · §7.6/G4/AC-52: sin tabla de validación la lectura falla 503 y nunca dice SinValidar", () => {
  // Base real a la que le falta el contrato entero (restore pre-v32).
  const db = new Database(":memory:", { strict: true });
  try {
    const exacto = problema(() => exigirEstadoValidacionDisponible(db));
    expect(exacto).toBeInstanceOf(Problem);
    expect(exacto.status).toBe(503);
    expect(exacto.code).toBe("VALIDACION_NO_DISPONIBLE");
    expect(exacto.fields.validacion).toBe("Contrato de validación ausente.");

    expect(() => leerFilaValidacion(db, "1")).toThrow(Problem);
    const lectura = problema(() => proyectarValidacion(db, "1"));
    expect(lectura.status).toBe(503);
    expect(lectura.code).toBe("VALIDACION_NO_DISPONIBLE");
  } finally {
    db.close();
  }
});

test("I2 estado · §7.6/G4: un contrato incompleto (columnas faltantes) también falla 503", () => {
  const db = new Database(":memory:", { strict: true });
  try {
    // Tabla presente y con el nombre correcto, pero sin las columnas del
    // contrato: una migración a medias no puede adivinar estados.
    db.run("CREATE TABLE cierre_validacion(ciclo TEXT PRIMARY KEY, revision INTEGER)");

    const error = problema(() => exigirEstadoValidacionDisponible(db));
    expect(error.status).toBe(503);
    expect(error.code).toBe("VALIDACION_NO_DISPONIBLE");
    const faltantes = String(error.fields.validacion);
    for (const columna of ["dirty", "huella_validacion", "version_conjunto", "revision_actor"]) {
      expect(faltantes).toContain(columna);
    }
    // `ciclo` y `revision` sí están: no se declaran ausentes.
    expect(faltantes).not.toContain("ciclo,");

    expect(() => proyectarValidacion(db, "1")).toThrow(/contrato instalado está incompleto/);
  } finally {
    db.close();
  }
});

test("I2 estado · G4: motivos de pendiente ilegibles fallan cerrados con 503", () => {
  const db = base();
  try {
    // Se simula una base restaurada con metadatos corruptos: la lectura no
    // puede confiar en las restricciones del esquema para dar el estado por
    // bueno, así que se inserta el JSON roto saltando trigger y CHECK.
    db.run("DROP TRIGGER cierre_validacion_motivos_insert");
    db.run("PRAGMA ignore_check_constraints = ON");
    db.run(
      `INSERT INTO cierre_validacion(ciclo,revision,dirty,dirty_desde,dirty_ultimo,dirty_origen,
         dirty_motivos,cobertura)
       VALUES('1',1,1,?,?, 'Operacion','{"roto":',?)`,
      [t, t2, COBERTURA],
    );
    db.run("PRAGMA ignore_check_constraints = OFF");

    // La fila sí se lee: lo ilegible son sus motivos.
    expect(leerFilaValidacion(db, "1")!.dirty_motivos).toBe('{"roto":');

    const error = problema(() => proyectarValidacion(db, "1"));
    expect(error).toBeInstanceOf(Problem);
    expect(error.status).toBe(503);
    expect(error.code).toBe("VALIDACION_NO_DISPONIBLE");
    expect(error.message).toMatch(/motivos no son legibles/);
    expect(error.fields.validacion).toBe("Motivos de pendiente ilegibles.");
  } finally {
    db.close();
  }
});

/* ================================================================== *
 * §3.1 · la huella mide el universo material, no la revisión técnica
 * ================================================================== */

test("I2 estado · AC-12: una errata que sólo sube movimientos.revision no cambia huellaVigente", () => {
  const db = base();
  try {
    const antes = huellaVigente(db);
    filaValidada(db, "1", { huella: antes });
    expect(proyectarValidacion(db, "1").divergenciaValidacion).toBe("Igual");

    // Errata de texto: no altera importe, fecha, atribución ni flujo.
    db.run(
      "UPDATE movimientos SET concepto='Errata corregida',nota='Otra nota',revision=revision+1 WHERE id='1'",
    );
    expect(db.query("SELECT revision FROM movimientos WHERE id='1'").get()).toEqual({ revision: 2 });

    const despues = huellaVigente(db);
    expect(despues).toBe(antes);

    const dto = proyectarValidacion(db, "1");
    expect(dto.huellaVigente).toBe(antes);
    expect(dto.huellaValidacion).toBe(antes);
    expect(dto.divergenciaValidacion).toBe("Igual");
    expect(dto.revalidacionSugerida).toBe(false);
    expect(dto.validado).toBe(true);
    expect(dto.estado).toBe("Validada");
  } finally {
    db.close();
  }
});