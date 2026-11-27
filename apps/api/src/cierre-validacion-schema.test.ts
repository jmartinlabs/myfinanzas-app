import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "./database";
import { prepareSchema } from "./database-schema";
import { contract, manifest, verifyContract } from "./schema-contract";
import {
  restaurarTriggerAperturaV31,
  restaurarTriggerDevolucionV32,
} from "./cierre-validacion-test-support";

import { importarCierresLegados } from "./cierre-validacion-migracion";

process.env.NODE_ENV = "test";

/**
 * SPEC38 · I1 — esquema v32, guardas y migración conservadora.
 *
 * Los casos cubren lo que este incremento promete y nada más: contrato C32,
 * migración v31→v32 sobre una copia, importación E1b, triggers de estado,
 * revisión, inmutabilidad de auditoría y DTO estricto. No hay rutas, UI ni
 * borrado: los criterios de aceptación de la SPEC siguen `UNRUN` y esto es la
 * evidencia de esquema del incremento, no su aceptación funcional.
 */
const t = "2026-01-01T00:00:00.000Z";
/** Instante de revisión humana: siempre posterior a las marcas de pendiente. */
const t2 = "2026-01-02T00:00:00.000Z";
/** Posterior también a una migración real, que marca con el instante de hoy. */
const t3 = "2030-01-01T00:00:00.000Z";
const c31 = "C31-SPEC37-INTENCION-91C32F5";
const c32 = "C32-SPEC38-VALIDACION-CIERRE";
const c33 = "C33-SPEC39-DEVOLUCION-TRIGGER";
const ORIGEN = "MIGRACION:cierres:1";

function store(): Database {
  const db = new Database(":memory:", { strict: true });
  prepareSchema(db, { origin: "demo", key_hash: null });
  return db;
}

/** Base v31 genuina: la vigente sin los objetos de v32, verificada contra C31. */
function revertToV31(db: Database) {
  db.exec(`
    DROP TABLE cierre_validacion_manifiesto;
    DROP TABLE validacion_attempts;
    DROP TABLE cierre_validacion_audit;
    DROP TABLE cierre_validacion;
    /* Retirada de los objetos de I2 antes de bajar a la versión previa. */
    DROP TRIGGER anticipo_apertura_aplicada;
    DROP TRIGGER anticipo_cycle_photo;
    DROP TABLE anticipo_apertura_autorizacion;
    DROP TABLE anticipo_apertura_guard;
    DROP TABLE anticipo_apertura_evento;
    UPDATE schema_version SET version=31;`);
  restaurarTriggerAperturaV31(db);
  restaurarTriggerDevolucionV32(db);
  expect(verifyContract(db, 31)).toBe(c31);
}

function ciclo(db: Database, id: string, inicio: string, saldo = 0) {
  db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,?,?)", [
    id,
    inicio,
    saldo,
    t,
  ]);
}

function gasto(db: Database, id: string, fecha = "2026-01-04", revision = 1) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,
       concepto,nota,anulado,revision,creado,actualizado)
     VALUES(?,?,'Gasto',1000,'S001','S000',NULL,'PAR0001','Gasto ficticio','',0,?,?,?)`,
    [id, fecha, revision, t, t],
  );
}

function clasificacion(db: Database) {
  db.run(
    `INSERT INTO categorias VALUES('CAT0001','Ficticia',NULL,'Gasto','Gasto',0,'Activa',1,?,?)`,
    [t, t],
  );
  db.run(
    `INSERT INTO subcategorias VALUES('SUB0001','Ficticia','CAT0001','Activa',1,?,?)`,
    [t, t],
  );
  db.run(
    `INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado)
     VALUES('PAR0001','Ficticia','SUB0001','Activa',1,?,?)`,
    [t, t],
  );
}

const COBERTURA_FOTO = JSON.stringify({
  estado: "Parcial",
  totales: {
    movimientos: { estado: "Completo", motivo: "ficticio" },
    efectivo: { estado: "Completo", motivo: "ficticio" },
    posiciones: { estado: "Completo", motivo: "ficticio" },
    plan: { estado: "Completo", motivo: "ficticio" },
    e35: { estado: "No disponible", motivo: "ficticio" },
    deuda: { estado: "Parcial", motivo: "ficticio" },
    valoracion: { estado: "No disponible", motivo: "ficticio" },
    anticipos: { estado: "Parcial", motivo: "ficticio" },
  },
});

/** Cierre legado completo: `cierres` + su foto, como los deja E4.9. */
function cierreLegado(
  db: Database,
  cicloId: string,
  inicio: string,
  fin: string,
  version = 1,
  cobertura = COBERTURA_FOTO,
) {
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,creado_utc,
         motivo,fingerprint,estado)
       VALUES(?,?,?,?,?,'actor-legado','2026-02-01T10:00:00.000Z','Motivo legado',
         ?, 'Cerrado')`,
      [cicloId, version, inicio, fin, 0, "a".repeat(64)],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,fingerprint,
         app_version,schema_version,ventana_inicio,ventana_fin,saldo_inicial,
         estado_temporal,estado_hechos,estado_plan,hechos,plan,clasificacion,
         inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES(?,?,'2026-02-01T10:00:00.000Z','actor-legado','Motivo legado',?,
         'e4.9-v25',25,?,?,?,'Cerrado','Con hechos','Capturado','{}','{}','{}',
         '{}','{}',?,'{}','{}')`,
      [cicloId, version, "a".repeat(64), inicio, fin, 0, cobertura],
    );
  }).immediate();
}

/** Base v31 con dos cierres legados (uno con foto ilegible) y un ciclo sin cierre. */
function baseConLegado(): string {
  const raiz = mkdtempSync(join(tmpdir(), ".tmp-e38-"));
  const ruta = join(raiz, "base.sqlite");
  const db = new Database(ruta, { create: true, strict: true });
  prepareSchema(db, { origin: "demo", key_hash: null });
  revertToV31(db);
  clasificacion(db);
  ciclo(db, "1", "2026-01-01");
  ciclo(db, "2", "2026-02-01");
  ciclo(db, "3", "2026-03-01");
  cierreLegado(db, "1", "2026-01-01", "2026-01-31");
  cierreLegado(db, "2", "2026-02-01", "2026-02-28", 1, "null");
  db.close();
  return ruta;
}

const AHORA = new Date("2026-11-20T09:00:00.000Z");

test("v32: contrato C32 verificado, C31 congelado y manifiesto determinista", () => {
  const uno = store();
  expect(
    (uno.query("SELECT version FROM schema_version").get() as { version: number })
      .version,
  ).toBe(33);
  expect(verifyContract(uno, 33)).toBe(c33);
  const otro = store();
  expect(JSON.stringify(manifest(uno))).toBe(JSON.stringify(manifest(otro)));
  expect(uno.query("PRAGMA foreign_key_check").all()).toEqual([]);
  // Contrato histórico: la base v32 (trigger anterior a v33) cumple C32 exacto.
  restaurarTriggerDevolucionV32(uno);
  uno.exec("UPDATE schema_version SET version=32");
  expect(verifyContract(uno, 32)).toBe(c32);
  expect(contract(c32).objects.length).toBeGreaterThan(384);
  expect(contract(c31).objects.length).toBe(384);
  uno.close();
  otro.close();
});

test("v32: crea las tres tablas y sus guardas, sin tocar las legadas", () => {
  const db = store();
  const nombres = (
    db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all() as { name: string }[]
  ).map((fila) => fila.name);
  for (const tabla of [
    "cierre_validacion",
    "cierre_validacion_audit",
    "validacion_attempts",
    "cierres",
    "fotos_cierre",
    "cierre_audit",
    "reaperturas",
    "reapertura_activa",
    "cierre_vinculos",
  ])
    expect(nombres).toContain(tabla);
  db.close();
});

test("migración v31→v33 en copia: importa todo cierre legado como Pendiente", () => {
  const ruta = baseConLegado();
  try {
    const db = openDatabase(ruta);
    expect(
      (db.query("SELECT version FROM schema_version").get() as { version: number })
        .version,
    ).toBe(33);
    expect(verifyContract(db, 33)).toBe(c33);
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(
      (db.query("PRAGMA integrity_check").get() as { integrity_check: string })
        .integrity_check,
    ).toBe("ok");

    const filas = db
      .query(
        `SELECT ciclo,revision,dirty,dirty_origen,dirty_motivos,huella_validacion,
                version_conjunto,revision_actor,revision_instante,procedencia_tabla,
                procedencia_version,procedencia_actor,procedencia_instante,
                procedencia_motivo
           FROM cierre_validacion ORDER BY ciclo`,
      )
      .all() as Record<string, unknown>[];
    expect(filas.map((fila) => fila.ciclo)).toEqual(["1", "2"]);
    for (const fila of filas) {
      expect(fila.revision).toBe(1);
      expect(fila.dirty).toBe(1);
      expect(fila.dirty_origen).toBe("Migracion");
      expect(fila.dirty_motivos).toBe("[]");
      expect(fila.huella_validacion).toBeNull();
      expect(fila.version_conjunto).toBeNull();
      expect(fila.revision_actor).toBeNull();
      expect(fila.revision_instante).toBeNull();
      expect(fila.procedencia_tabla).toBe("cierres");
      expect(fila.procedencia_version).toBe("1");
      expect(fila.procedencia_actor).toBe("actor-legado");
      expect(fila.procedencia_instante).toBe("2026-02-01T10:00:00.000Z");
      expect(fila.procedencia_motivo).toBe("Motivo legado");
    }

    const eventos = db
      .query(
        `SELECT ciclo,accion,motivo,origen,huella_anterior,huella_posterior,detalle
           FROM cierre_validacion_audit ORDER BY ciclo`,
      )
      .all() as Record<string, string | null>[];
    expect(eventos.length).toBe(2);
    for (const evento of eventos) {
      expect(evento.accion).toBe("migracion");
      expect(evento.motivo).toBeNull();
      expect(evento.origen).toBe(`MIGRACION:cierres:${evento.ciclo}`);
      expect(evento.huella_anterior).toBeNull();
      expect(evento.huella_posterior).toBeNull();
      const detalle = JSON.parse(evento.detalle as string);
      expect(detalle.hechos).toEqual([]);
      expect(detalle.ciclos).toEqual([
        { id: evento.ciclo, impactos: [] },
      ]);
      expect(detalle.procedencia).toEqual({
        tabla: "cierres",
        id: null,
        version: "1",
        reaperturaId: null,
        activa: null,
        versionOrigen: null,
        versionDestino: null,
        correlacion: null,
      });
    }

    // Cero validaciones limpias inventadas y ninguna fila para el ciclo 3.
    expect(
      (
        db.query("SELECT COUNT(*) AS n FROM cierre_validacion WHERE dirty=0").get() as {
          n: number;
        }
      ).n,
    ).toBe(0);
    expect(
      db.query("SELECT 1 FROM cierre_validacion WHERE ciclo='3'").get(),
    ).toBeNull();

    const coberturaCiclo2 = JSON.parse(
      (
        db
          .query("SELECT cobertura FROM cierre_validacion WHERE ciclo='2'")
          .get() as { cobertura: string }
      ).cobertura,
    ) as { fuente: string; estado: string; causas: string[] }[];
    expect(coberturaCiclo2.length).toBe(8);
    expect(
      coberturaCiclo2.every(
        (fuente) =>
          fuente.estado === "NoDisponible" &&
          fuente.causas.join(",") === "FOTO_ILEGIBLE",
      ),
    ).toBe(true);

    const recibo = db
      .query(
        "SELECT operacion,key,completado FROM validacion_attempts ORDER BY key",
      )
      .all() as Record<string, unknown>[];
    expect(recibo).toEqual([
      { operacion: "migracion", key: "cierres:1", completado: 1 },
      { operacion: "migracion", key: "cierres:2", completado: 1 },
    ]);
    db.close();
  } finally {
    rmSync(join(ruta, ".."), { recursive: true, force: true });
  }
});

test("migración v31→v33: repetir no duplica, no sobrescribe ni cambia la revisión", () => {
  const ruta = baseConLegado();
  try {
    const db = openDatabase(ruta);
    const antes = db
      .query("SELECT * FROM cierre_validacion ORDER BY ciclo")
      .all();
    const auditoriaAntes = db
      .query("SELECT * FROM cierre_validacion_audit ORDER BY id")
      .all();
    const segundo = importarCierresLegados(db, { ahora: AHORA });
    expect(segundo.creados).toEqual([]);
    expect(segundo.preservados).toEqual(["1", "2"]);
    expect(db.query("SELECT * FROM cierre_validacion ORDER BY ciclo").all()).toEqual(
      antes,
    );
    expect(
      db.query("SELECT * FROM cierre_validacion_audit ORDER BY id").all(),
    ).toEqual(auditoriaAntes);
    db.close();

    // Y una segunda apertura completa del binario tampoco reimporta.
    const reabierto = openDatabase(ruta);
    expect(
      reabierto.query("SELECT COUNT(*) AS n FROM cierre_validacion").get(),
    ).toEqual({ n: 2 });
    expect(
      reabierto.query("SELECT COUNT(*) AS n FROM cierre_validacion_audit").get(),
    ).toEqual({ n: 2 });
    reabierto.close();
  } finally {
    rmSync(join(ruta, ".."), { recursive: true, force: true });
  }
});

test("migración conservadora: una fila humana previa no se sobrescribe", () => {
  const ruta = baseConLegado();
  try {
    const db = openDatabase(ruta);
    // Limpiar exige revisión humana: exactamente r+1 y referencia del conjunto.
    db.run(
      `UPDATE cierre_validacion SET revision=2,dirty=0,dirty_desde=NULL,dirty_ultimo=NULL,
         dirty_origen=NULL,dirty_motivos=NULL,huella_validacion=?,version_conjunto='1',
         revision_actor='humano',revision_instante=?,revision_motivo='Revisado'
       WHERE ciclo='1'`,
      ["b".repeat(64), t3],
    );
    const resultado = importarCierresLegados(db, { ahora: AHORA });
    expect(resultado.preservados).toEqual(["1", "2"]);
    const fila = db
      .query("SELECT revision,dirty,huella_validacion,revision_actor FROM cierre_validacion WHERE ciclo='1'")
      .get() as Record<string, unknown>;
    expect(fila).toEqual({
      revision: 2,
      dirty: 0,
      huella_validacion: "b".repeat(64),
      revision_actor: "humano",
    });
    db.close();
  } finally {
    rmSync(join(ruta, ".."), { recursive: true, force: true });
  }
});

/* ------------------------------------------------------------------ *
 * Guardas de estado y revisión
 * ------------------------------------------------------------------ */

function validacion(db: Database, cicloId = "1", extra = {}) {
  const base = {
    revision: 1,
    dirty: 1,
    dirty_desde: t,
    dirty_ultimo: t,
    dirty_origen: "Migracion",
    dirty_motivos: "[]",
    huella: null as string | null,
    version: null as string | null,
    actor: null as string | null,
    instante: null as string | null,
    motivo: null as string | null,
    cobertura: '[{"fuente":"movimientos","estado":"Disponible","causas":[]}]',
    ...extra,
  };
  db.run(
    `INSERT INTO cierre_validacion(ciclo,revision,dirty,dirty_desde,dirty_ultimo,
       dirty_origen,dirty_motivos,huella_validacion,version_conjunto,revision_actor,
       revision_instante,revision_motivo,cobertura)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      cicloId,
      base.revision,
      base.dirty,
      base.dirty_desde,
      base.dirty_ultimo,
      base.dirty_origen,
      base.dirty_motivos,
      base.huella,
      base.version,
      base.actor,
      base.instante,
      base.motivo,
      base.cobertura,
    ],
  );
}

test("estado: una fila limpia sin referencia humana completa no existe", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  expect(() =>
    validacion(db, "1", {
      dirty: 0,
      dirty_desde: null,
      dirty_ultimo: null,
      dirty_origen: null,
      dirty_motivos: null,
      actor: "humano",
      instante: t,
    }),
  ).toThrow("estado de validacion incoherente");
  expect(() =>
    validacion(db, "1", {
      dirty: 1,
      dirty_desde: null,
    }),
  ).toThrow("estado de validacion incoherente");
  expect(() =>
    validacion(db, "1", {
      huella: "b".repeat(64),
      version: null,
    }),
  ).toThrow(); // pareja huella/versión
  db.close();
});

test("estado: motivos de impacto cerrados, sin repetidos y sin números", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  expect(() => validacion(db, "1", { dirty_motivos: '["MIGRACION"]' })).toThrow(
    "motivos de impacto invalidos",
  );
  expect(() =>
    validacion(db, "1", { dirty_motivos: '["FLUJO_CICLO","FLUJO_CICLO"]' }),
  ).toThrow("motivos de impacto invalidos");
  expect(() => validacion(db, "1", { dirty_motivos: "[123]" })).toThrow(
    "motivos de impacto invalidos",
  );
  expect(() =>
    validacion(db, "1", { dirty_motivos: '["FLUJO_CICLO","S0_CICLO"]' }),
  ).not.toThrow();
  db.close();
});

test("estado: cobertura por nombres de fuente, estado y código cerrados", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  expect(() =>
    validacion(db, "1", {
      cobertura: '[{"fuente":"importe","estado":"Disponible","causas":[]}]',
    }),
  ).toThrow("cobertura de validacion invalida");
  expect(() =>
    validacion(db, "1", {
      cobertura: '[{"fuente":"movimientos","estado":"Parcial","causas":[]}]',
    }),
  ).toThrow("cobertura de validacion invalida");
  expect(() =>
    validacion(db, "1", {
      cobertura: '[{"fuente":"movimientos","estado":"Disponible","causas":["OTRA"]}]',
    }),
  ).toThrow("cobertura de validacion invalida");
  expect(() =>
    validacion(db, "1", {
      cobertura: '[{"fuente":"movimientos","estado":"Parcial","causas":["S0_AUSENTE"]}]',
    }),
  ).not.toThrow();
  db.close();
});

test("revisión: marcar conserva la revisión y la revisión humana exige exactamente +1", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  validacion(db, "1");
  expect(() =>
    db.run("UPDATE cierre_validacion SET revision=2 WHERE ciclo='1'"),
  ).toThrow("avanzar la revision exige una revision humana");
  expect(() =>
    db.run("UPDATE cierre_validacion SET revision=3 WHERE ciclo='1'"),
  ).toThrow("la revision de validacion no puede saltar");
  expect(() =>
    db.run(
      `UPDATE cierre_validacion SET revision=2,huella_validacion=?,version_conjunto='1',
         revision_actor='humano',revision_instante=?,dirty=0,
         dirty_desde=NULL,dirty_ultimo=NULL,dirty_origen=NULL,dirty_motivos=NULL
       WHERE ciclo='1'`,
      ["b".repeat(64), t2],
    ),
  ).not.toThrow();
  expect(() =>
    db.run("UPDATE cierre_validacion SET revision=1 WHERE ciclo='1'"),
  ).toThrow("la revision de validacion no puede disminuir");
  expect(() =>
    db.run(
      "UPDATE cierre_validacion SET dirty_ultimo=?,dirty_motivos='[\"S0_CICLO\"]' WHERE ciclo='1'",
      [t],
    ),
  ).toThrow("estado de validacion incoherente");
  expect(() =>
    db.run("UPDATE cierre_validacion SET dirty_ultimo=? WHERE ciclo='1'", [t]),
  ).toThrow(); // fila limpia: no admite metadatos de pendiente
  db.close();
});

test("revisión: la marca de un pendiente conserva la revisión y no la adelanta", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  validacion(db, "1");
  expect(() =>
    db.run(
      "UPDATE cierre_validacion SET revision=2 WHERE ciclo='1'",
    ),
  ).toThrow("avanzar la revision exige una revision humana");
  expect(() =>
    db.run(
      "UPDATE cierre_validacion SET revision=1,dirty_ultimo=?,dirty_motivos='[\"S0_CICLO\"]' WHERE ciclo='1'",
      [t],
    ),
  ).not.toThrow();
  db.close();
});

/* ------------------------------------------------------------------ *
 * Adversarial · revisión y cronología de la marca (§2.4)
 *
 * Una fila limpia sólo vuelve a pendiente conservando `revision`, y ninguna
 * marca puede fecharse antes de la referencia humana vigente. La limpieza
 * (`Pendiente → Validada`) exige siempre evidencia humana nueva, también por
 * SQL directo, sin que la antigüedad de `dirty_desde`/`dirty_ultimo` sirva
 * para reutilizar la referencia anterior.
 * ------------------------------------------------------------------ */

const HUELLA = "c".repeat(64);

/** Fila completa, para exigir que un rechazo no persistió ni una columna. */
function fila(db: Database, cicloId = "1") {
  return db.query("SELECT * FROM cierre_validacion WHERE ciclo=?").get(cicloId);
}

/** Validada en r=2 con referencia humana de `t2`. */
function validada(db: Database) {
  validacion(db, "1", {
    revision: 2,
    dirty: 0,
    dirty_desde: null,
    dirty_ultimo: null,
    dirty_origen: null,
    dirty_motivos: null,
    huella: HUELLA,
    version: "1",
    actor: "humano",
    instante: t2,
    motivo: "Revisado",
  });
}

test("adversarial · secuencia de dos pasos: marcar aborta y limpiar no reutiliza la referencia", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  validada(db);
  const intacta = fila(db);

  // Paso 1 tal cual: `revision+1`, `dirty` 0→1 y cronología anterior a la
  // referencia humana registrada.
  expect(() =>
    db.run(
      `UPDATE cierre_validacion SET revision=3,dirty=1,dirty_desde=?,dirty_ultimo=?,
         dirty_origen='Operacion',dirty_motivos='[]' WHERE ciclo='1'`,
      [t, t],
    ),
  ).toThrow("la marca no puede preceder a la revision humana");
  expect(fila(db)).toEqual(intacta);

  // Paso 1 con una referencia «nueva» en la misma sentencia y fechas
  // coherentes: aun así, marcar no mueve la revisión.
  expect(() =>
    db.run(
      `UPDATE cierre_validacion SET revision=3,dirty=1,dirty_desde=?,dirty_ultimo=?,
         dirty_origen='Operacion',dirty_motivos='[]',huella_validacion=?,
         version_conjunto='1',revision_actor='humano',revision_instante=?
       WHERE ciclo='1'`,
      [t3, t3, "e".repeat(64), t3],
    ),
  ).toThrow("marcar o reiterar no cambia la revision");
  expect(fila(db)).toEqual(intacta);

  // La fila sigue Validada en r=2: el estado intermedio del ataque no existe.
  expect(intacta).toMatchObject({ revision: 2, dirty: 0, huella_validacion: HUELLA });
  db.close();
});

test("adversarial · limpiar reutilizando la referencia aborta aunque la marca sea antigua", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  // Estado intermedio del ataque, inalcanzable ya por UPDATE: pendiente en r=3
  // con marcas anteriores a la referencia humana de `t2`.
  validacion(db, "1", {
    revision: 3,
    dirty: 1,
    dirty_desde: t,
    dirty_ultimo: t,
    dirty_origen: "Operacion",
    dirty_motivos: '["FLUJO_CICLO"]',
    huella: HUELLA,
    version: "1",
    actor: "humano",
    instante: t2,
  });
  const pendiente = fila(db);

  // Paso 2 sin tocar la referencia: `revision+1` sin evidencia nueva.
  expect(() =>
    db.run(
      `UPDATE cierre_validacion SET revision=4,dirty=0,dirty_desde=NULL,dirty_ultimo=NULL,
         dirty_origen=NULL,dirty_motivos=NULL WHERE ciclo='1'`,
    ),
  ).toThrow("avanzar la revision exige una revision humana");
  expect(fila(db)).toEqual(pendiente);

  // Paso 2 con un instante posterior a la marca pero anterior a la revisión
  // humana: la huella/actor/instante/versión anteriores no valen.
  expect(() =>
    db.run(
      `UPDATE cierre_validacion SET revision=4,dirty=0,dirty_desde=NULL,dirty_ultimo=NULL,
         dirty_origen=NULL,dirty_motivos=NULL,revision_instante=?
       WHERE ciclo='1'`,
      ["2026-01-01T12:00:00.000Z"],
    ),
  ).toThrow("la revision humana exige evidencia nueva");
  expect(fila(db)).toEqual(pendiente);

  // Y con evidencia realmente nueva la limpieza legítima sigue disponible.
  expect(() =>
    db.run(
      `UPDATE cierre_validacion SET revision=4,dirty=0,dirty_desde=NULL,dirty_ultimo=NULL,
         dirty_origen=NULL,dirty_motivos=NULL,revision_actor='humano2',revision_instante=?
       WHERE ciclo='1'`,
      [t3],
    ),
  ).not.toThrow();
  expect(fila(db)).toMatchObject({
    revision: 4,
    dirty: 0,
    revision_actor: "humano2",
    revision_instante: t3,
  });
  db.close();
});

test("adversarial · marcar y reiterar conservan la revisión y su cronología", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  validada(db);
  const limpia = fila(db);

  // Marca con revisión adelantada y fechas coherentes: sigue siendo una marca.
  expect(() =>
    db.run(
      `UPDATE cierre_validacion SET revision=3,dirty=1,dirty_desde=?,dirty_ultimo=?,
         dirty_origen='Operacion',dirty_motivos='[]' WHERE ciclo='1'`,
      [t3, t3],
    ),
  ).toThrow("marcar o reiterar no cambia la revision");
  expect(fila(db)).toEqual(limpia);

  // Marca legítima: misma revisión y cronología posterior a la referencia.
  expect(() =>
    db.run(
      `UPDATE cierre_validacion SET dirty=1,dirty_desde=?,dirty_ultimo=?,
         dirty_origen='Operacion',dirty_motivos='["FLUJO_CICLO"]' WHERE ciclo='1'`,
      [t3, t3],
    ),
  ).not.toThrow();
  expect(fila(db)).toMatchObject({
    revision: 2,
    dirty: 1,
    dirty_desde: t3,
    dirty_ultimo: t3,
    revision_instante: t2,
  });

  // Reiteración legítima: avanza `dirty_ultimo` y conserva `dirty_desde`.
  expect(() =>
    db.run("UPDATE cierre_validacion SET dirty_ultimo=? WHERE ciclo='1'", [t3]),
  ).not.toThrow();
  const reiterada = fila(db);
  expect(reiterada).toMatchObject({ revision: 2, dirty: 1, dirty_desde: t3 });

  // Reiteración con `dirty_ultimo` anterior a la revisión humana: aborta.
  expect(() =>
    db.run("UPDATE cierre_validacion SET dirty_ultimo=? WHERE ciclo='1'", [t]),
  ).toThrow("la marca no puede preceder a la revision humana");

  // Reiteración que adelanta la revisión, aunque limpie metadatos de marca.
  expect(() =>
    db.run(
      "UPDATE cierre_validacion SET revision=3,dirty_motivos='[]' WHERE ciclo='1'",
    ),
  ).toThrow("marcar o reiterar no cambia la revision");
  expect(fila(db)).toEqual(reiterada);
  db.close();
});

test("adversarial · Pendiente → Validada exige referencia humana nueva por SQL directo", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  validacion(db, "1", {
    revision: 2,
    dirty: 1,
    dirty_desde: t,
    dirty_ultimo: t,
    dirty_origen: "Operacion",
    dirty_motivos: '["FLUJO_CICLO"]',
    huella: HUELLA,
    version: "1",
    actor: "humano",
    instante: t2,
  });
  const pendiente = fila(db);
  const limpiar = (actor: string, instante: string, huella = HUELLA) =>
    db.run(
      `UPDATE cierre_validacion SET revision=3,dirty=0,dirty_desde=NULL,dirty_ultimo=NULL,
         dirty_origen=NULL,dirty_motivos=NULL,huella_validacion=?,revision_actor=?,
         revision_instante=? WHERE ciclo='1'`,
      [huella, actor, instante],
    );

  // Sin una sola columna de referencia nueva: `revision+1` no es humano.
  expect(() => limpiar("humano", t2)).toThrow(
    "avanzar la revision exige una revision humana",
  );
  // Instante anterior a la revisión humana registrada, aunque posterior a la
  // marca: la referencia anterior no se recicla.
  expect(() => limpiar("humano", "2026-01-01T12:00:00.000Z")).toThrow(
    "la revision humana exige evidencia nueva",
  );
  expect(fila(db)).toEqual(pendiente);

  // Misma huella (conjunto sin delta) con evidencia nueva: ésta sí es la
  // confirmación legítima de `pendienteSinDelta`.
  expect(() => limpiar("humano2", t3)).not.toThrow();
  expect(fila(db)).toMatchObject({
    revision: 3,
    dirty: 0,
    dirty_desde: null,
    dirty_ultimo: null,
    huella_validacion: HUELLA,
    version_conjunto: "1",
    revision_actor: "humano2",
    revision_instante: t3,
  });
  db.close();
});

/* ------------------------------------------------------------------ *
 * Auditoría y DTO
 * ------------------------------------------------------------------ */

function evento(
  db: Database,
  detalle: string,
  opciones: {
    ciclo?: string;
    accion?: string;
    origen?: string | null;
    motivo?: string | null;
  } = {},
) {
  db.run(
    `INSERT INTO cierre_validacion_audit(ciclo,revision,accion,actor,instante,
       motivo,intento,correlacion,origen,huella_anterior,huella_posterior,detalle)
     VALUES(?,1,?,'actor',?,?,NULL,NULL,?,NULL,NULL,?)`,
    [
      opciones.ciclo ?? "1",
      opciones.accion ?? "migracion",
      t,
      opciones.motivo ?? null,
      opciones.origen === undefined ? ORIGEN : opciones.origen,
      detalle,
    ],
  );
}

const DETALLE_BASE = {
  hechos: [{ entidad: "movimiento", id: "1", revision: "1" }],
  ciclos: [{ id: "1", impactos: ["FLUJO_CICLO" as const] }],
  cobertura: [
    { fuente: "movimientos", estado: "Disponible", causas: [] },
  ],
  procedencia: null,
};

test("auditoría: append-only con evento exacto y actor/instante de dominio", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  clasificacion(db);
  gasto(db, "1");
  evento(db, JSON.stringify(DETALLE_BASE));
  expect(() =>
    db.run("UPDATE cierre_validacion_audit SET actor='otro' WHERE id=1"),
  ).toThrow("immutable validation audit");
  expect(() => db.run("DELETE FROM cierre_validacion_audit")).toThrow(
    "immutable validation audit",
  );
  expect(() =>
    evento(db, JSON.stringify(DETALLE_BASE), { origen: "OTRA:COSA" }),
  ).toThrow();
  expect(() =>
    evento(db, JSON.stringify(DETALLE_BASE), {
      origen: "MIGRACION:tabla_inventada:1",
    }),
  ).toThrow();
  expect(() =>
    evento(db, JSON.stringify(DETALLE_BASE), { accion: "cerrar" }),
  ).toThrow();
  db.close();
});

test("auditoría: el DTO rechaza cualquier número JSON, también anidado", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  clasificacion(db);
  gasto(db, "1");
  const casos = [
    // cifra bajo clave desconocida
    '{"x":123}',
    // cifra bajo clave permitida
    JSON.stringify({
      ...DETALLE_BASE,
      hechos: [{ entidad: "movimiento", id: "1", revision: 1 }],
    }),
    // número suelto en el objeto raíz
    JSON.stringify({ ...DETALLE_BASE, extra: 0 }),
    // número anidado dentro de un array permitido
    JSON.stringify({
      ...DETALLE_BASE,
      ciclos: [{ id: "1", impactos: ["FLUJO_CICLO"], peso: [1.5] }],
    }),
    // array de números en cobertura
    JSON.stringify({
      ...DETALLE_BASE,
      cobertura: [{ fuente: "movimientos", estado: "Disponible", causas: [1] }],
    }),
  ];
  for (const detalle of casos)
    expect(() => evento(db, detalle)).toThrow(
      "detalle de validacion: no admite numeros JSON",
    );
  db.close();
});

test("auditoría: el DTO exige el sobre exacto y rechaza claves extra", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  clasificacion(db);
  gasto(db, "1");
  expect(() => evento(db, "[]")).toThrow("forma exacta requerida");
  expect(() =>
    evento(db, JSON.stringify({ ...DETALLE_BASE, antes: "x" })),
  ).toThrow("forma exacta requerida");
  expect(() =>
    evento(db, JSON.stringify({ hechos: [], ciclos: [], cobertura: [] })),
  ).toThrow("forma exacta requerida");
  // "cifra monetaria como cadena" en una clave extra: el sobre la rechaza.
  expect(() =>
    evento(
      db,
      JSON.stringify({
        ...DETALLE_BASE,
        hechos: [{ entidad: "movimiento", id: "1", revision: "1", importe: "12" }],
      }),
    ),
  ).toThrow("hechos invalidos");
  db.close();
});

test("auditoría: hechos validan forma, decimal canónico y existencia con revisión real", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  clasificacion(db);
  gasto(db, "1");
  const conHecho = (hecho: unknown) =>
    JSON.stringify({ ...DETALLE_BASE, hechos: [hecho] });
  expect(() =>
    evento(db, conHecho({ entidad: "movimiento", id: "1", revision: "1" })),
  ).not.toThrow();
  expect(() =>
    evento(db, conHecho({ entidad: "movimiento", id: "1", revision: "2" })),
  ).toThrow("hechos invalidos");
  expect(() =>
    evento(db, conHecho({ entidad: "movimiento", id: "9", revision: "1" })),
  ).toThrow("hechos invalidos");
  expect(() =>
    evento(db, conHecho({ entidad: "gasto", id: "1", revision: "1" })),
  ).toThrow("hechos invalidos");
  expect(() =>
    evento(db, conHecho({ entidad: "movimiento", id: "01", revision: "1" })),
  ).toThrow("hechos invalidos");
  expect(() =>
    evento(db, conHecho({ entidad: "movimiento", id: "1", revision: "1.0" })),
  ).toThrow("hechos invalidos");
  db.close();
});

test("auditoría: ciclos, cobertura y procedencia con enums y referencias reales", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  clasificacion(db);
  gasto(db, "1");
  expect(() =>
    evento(
      db,
      JSON.stringify({ ...DETALLE_BASE, ciclos: [{ id: "9", impactos: [] }] }),
    ),
  ).toThrow("ciclos invalidos");
  expect(() =>
    evento(
      db,
      JSON.stringify({
        ...DETALLE_BASE,
        ciclos: [{ id: "1", impactos: ["IMPORTE"] }],
      }),
    ),
  ).toThrow("ciclos invalidos");
  expect(() =>
    evento(
      db,
      JSON.stringify({
        ...DETALLE_BASE,
        cobertura: [{ fuente: "hechos", estado: "Disponible", causas: [] }],
      }),
    ),
  ).toThrow("cobertura invalida");
  expect(() =>
    evento(
      db,
      JSON.stringify({
        ...DETALLE_BASE,
        procedencia: {
          tabla: "cierres",
          id: null,
          version: "7",
          reaperturaId: null,
          activa: null,
          versionOrigen: null,
          versionDestino: null,
          correlacion: null,
        },
      }),
    ),
  ).toThrow("procedencia invalida");
  db.close();
});

test("auditoría: la procedencia exige el ciclo real y la tabla declarada", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  clasificacion(db);
  gasto(db, "1");
  cierreLegado(db, "1", "2026-01-01", "2026-01-31");
  const base = {
    ...DETALLE_BASE,
    procedencia: {
      tabla: "cierres",
      id: null,
      version: "1",
      reaperturaId: null,
      activa: null,
      versionOrigen: null,
      versionDestino: null,
      correlacion: null,
    },
  };
  expect(() => evento(db, JSON.stringify(base))).not.toThrow();
  expect(() =>
    evento(db, JSON.stringify(base), { ciclo: "2" }),
  ).toThrow("procedencia invalida");
  expect(() =>
    evento(
      db,
      JSON.stringify({
        ...base,
        procedencia: { ...base.procedencia, id: "1" },
      }),
    ),
  ).toThrow("procedencia invalida");
  expect(() =>
    evento(
      db,
      JSON.stringify({
        ...base,
        procedencia: { ...base.procedencia, activa: true },
      }),
    ),
  ).toThrow("procedencia invalida");
  db.close();
});

test("recibo durable: sin cifras, con la forma exacta de la confirmación", () => {
  const db = store();
  const response = (payload: unknown) =>
    db.run(
      `INSERT INTO validacion_attempts(operacion,key,hash,response,completado,expira)
       VALUES('validar',?,?,?,1,1)`,
      [`k${Math.random()}`, "a".repeat(64), JSON.stringify(payload)],
    );
  expect(() =>
    response({
      operacionId: "OP1",
      ciclos: [{ id: "1", revision: "2", estado: "Validada" }],
      auditIds: ["1"],
      cierresDirty: [],
    }),
  ).not.toThrow();
  expect(() =>
    response({
      operacionId: "OP1",
      ciclos: [{ id: "1", revision: "2", estado: "Validada" }],
      auditIds: ["1"],
      cierresDirty: [],
      totales: { importe: "100" },
    }),
  ).toThrow("recibo de validacion invalido");
  expect(() =>
    response({ operacionId: "OP1", ciclos: [], auditIds: [] }),
  ).toThrow("recibo de validacion invalido");
  db.close();
});

test("auditoría: huellas SHA-256 e instantes del dominio, sin excepción de formato", () => {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  clasificacion(db);
  gasto(db, "1");
  const eventoConHuellas = (anterior: string | null, posterior: string | null, instante: string) =>
    db.run(
      `INSERT INTO cierre_validacion_audit(ciclo,revision,accion,actor,instante,motivo,
         intento,correlacion,origen,huella_anterior,huella_posterior,detalle)
       VALUES('1',1,'validar','actor',?,NULL,NULL,NULL,'MIGRACION:cierres:1',?,?,?)`,
      [instante, anterior, posterior, JSON.stringify(DETALLE_BASE)],
    );
  const valida = "a".repeat(64);
  expect(() =>
    eventoConHuellas(null, valida, "2026-11-20T09:00:00.000Z"),
  ).not.toThrow();
  expect(() => eventoConHuellas("F".repeat(64), valida, t)).toThrow();
  expect(() => eventoConHuellas("a".repeat(63), valida, t)).toThrow();
  expect(() => eventoConHuellas(valida, "g".repeat(64), t)).toThrow();
  expect(() => eventoConHuellas(valida, valida, "2026-11-20T09:00:00Z")).toThrow();
  db.close();
});

test("inventario de escritores: sólo importación y guarda de revisión escriben la auditoría", () => {
  const rutas = [
    "cierre-validacion-dto.ts",
    "cierre-validacion-schema.ts",
    "cierre-validacion-migracion.ts",
    "cierre-validacion-metadatos.ts",
    "cierre-validacion-revision.ts",
    "database-schema.ts",
    "e49.ts",
    "e410.ts",
    "movimientos.ts",
  ];
  const escritores = rutas.filter((ruta) =>
    /INSERT\s+INTO\s+cierre_validacion_audit/i.test(
      readFileSync(join(import.meta.dir, ruta), "utf8"),
    ),
  );
  expect(escritores.sort()).toEqual([
    "cierre-validacion-metadatos.ts",
    "cierre-validacion-migracion.ts",
    "cierre-validacion-revision.ts",
  ]);
});