import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prepareSchema } from "./database-schema";
import {
  construirDetalleValidacion,
  type DetalleValidacion,
} from "./cierre-validacion-dto";
import {
  confirmarRevisionValidacion,
  exigirRevisionHumanaNueva,
} from "./cierre-validacion-revision";
import { migrarMetadatosLegados } from "./cierre-validacion-metadatos";
import { importarCierresLegados } from "./cierre-validacion-migracion";

/**
 * SPEC38 · I1 — pruebas **adversariales** de las tres correcciones de revisión
 * y del hueco de §7.3.
 *
 * Cada caso intenta romper la garantía en vez de confirmarla, y comprueba dos
 * cosas: que la operación falla y que **no persistió nada** (ni fila, ni evento,
 * ni recibo, ni manifiesto). Los caminos cubiertos son los dos que la SPEC
 * exige: constructor/servicio y SQL directo.
 */

const t = "2026-01-01T00:00:00.000Z";
const t2 = "2026-02-01T00:00:00.000Z";
const t3 = "2026-03-01T00:00:00.000Z";
const t4 = "2026-04-01T00:00:00.000Z";
const HUELLA_A = "a".repeat(64);
const HUELLA_B = "b".repeat(64);
const COBERTURA = JSON.stringify([
  { fuente: "movimientos", estado: "Disponible", causas: [] },
]);

function store(): Database {
  const db = new Database(":memory:", { strict: true });
  prepareSchema(db, { origin: "demo", key_hash: null });
  return db;
}

function ciclo(db: Database, id: string, inicio: string) {
  db.run("INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,0,?)", [
    id,
    inicio,
    t,
  ]);
}

function referencia(db: Database, id: string) {
  db.run(
    `INSERT INTO referencias(id,nombre,tipo,estado,revision,creado,actualizado)
     VALUES(?,'Ficticia','Viaje','Activa',1,?,?)`,
    [id, t, t],
  );
}

function gasto(db: Database, id: string) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,partida,
       concepto,nota,anulado,revision,creado,actualizado)
     VALUES(?, '2026-01-04','Gasto',1000,'S001','S000',NULL,'PAR0001','Ficticio','',0,1,?,?)`,
    [id, t, t],
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

function baseConHechos(): Database {
  const db = store();
  clasificacion(db);
  ciclo(db, "1", "2026-01-01");
  gasto(db, "1");
  referencia(db, "REF001");
  return db;
}

function contar(db: Database, tabla: string): number {
  return (
    db.query(`SELECT COUNT(*) AS n FROM ${tabla}`).get() as { n: number }
  ).n;
}

function evento(db: Database, detalle: string) {
  db.run(
    `INSERT INTO cierre_validacion_audit(ciclo,revision,accion,actor,instante,
       motivo,intento,correlacion,origen,huella_anterior,huella_posterior,detalle)
     VALUES('1',1,'validar','actor',?,NULL,NULL,NULL,'MIGRACION:cierres:1',NULL,NULL,?)`,
    [t, detalle],
  );
}

/* ================================================================== *
 * Corrección 1 · identificadores reales de Referencia
 * ================================================================== */

test("adversarial · Referencia: prefijo, longitud, mayúsculas y sufijo inventados", () => {
  const rechazos = [
    "ref001", // minúsculas
    "RFE001", // prefijo alterado
    "RREF001", // prefijo duplicado
    "REF", // sin dígitos
    "REF00", // demasiado corto
    "REF001X", // sufijo inventado
    "REF001 ", // espacio final
    " REF001", // espacio inicial
    "REF-001", // separador
    "REF001.0", // decimal
    "REF0O1", // letra O en lugar de cero
    `REF${"1".repeat(198)}`, // longitud excesiva
    "1", // decimal: formato de otra entidad
    "REF001\n", // salto de línea
  ];
  for (const id of rechazos) {
    expect(() =>
      construirDetalleValidacion({
        hechos: [{ entidad: "referencia", id, revision: "1" }],
        ciclos: [],
        cobertura: [],
        procedencia: null,
      }),
    ).toThrow(/id de Referencia/);
  }

  // El decimal no se relaja para el resto: `movimiento` conserva su dominio.
  for (const id of ["REF001", "01", "1.0", "-1", "1e3"])
    expect(() =>
      construirDetalleValidacion({
        hechos: [{ entidad: "movimiento", id, revision: "1" }],
        ciclos: [],
        cobertura: [],
        procedencia: null,
      }),
    ).toThrow(/decimal canónico/);

  // Y la forma válida existe: `REF` + dígitos, mínimo 3.
  expect(
    construirDetalleValidacion({
      hechos: [
        { entidad: "referencia", id: "REF001", revision: "1" },
        { entidad: "referencia", id: "REF1234567890", revision: "7" },
      ],
      ciclos: [],
      cobertura: [],
      procedencia: null,
    }).hechos,
  ).toEqual([
    { entidad: "referencia", id: "REF001", revision: "1" },
    { entidad: "referencia", id: "REF1234567890", revision: "7" },
  ]);
});

test("adversarial · Referencia: el SQL directo rechaza el identificador y no persiste nada", () => {
  const db = baseConHechos();
  const antes = contar(db, "cierre_validacion_audit");
  const detalle = (id: string, entidad = "referencia"): string =>
    JSON.stringify({
      hechos: [{ entidad, id, revision: "1" }],
      ciclos: [{ id: "1", impactos: [] }],
      cobertura: [],
      procedencia: null,
    });

  // Control: la Referencia existente con su formato real sí se admite.
  expect(() => evento(db, detalle("REF001"))).not.toThrow();
  expect(contar(db, "cierre_validacion_audit")).toBe(antes + 1);

  for (const id of [
    "ref001",
    "RFE001",
    "REF001X",
    "REF00",
    `REF${"1".repeat(198)}`,
    "1",
  ])
    expect(() => evento(db, detalle(id))).toThrow("hechos invalidos");

  // Un identificador decimal no vale para Referencia y `REF001` no vale para movimiento.
  expect(() => evento(db, detalle("REF001", "movimiento"))).toThrow(
    "hechos invalidos",
  );
  expect(() => evento(db, detalle("7", "movimiento"))).toThrow(
    "hechos invalidos",
  );

  expect(contar(db, "cierre_validacion_audit")).toBe(antes + 1);
  db.close();
});

/* ================================================================== *
 * Corrección 2 · la revisión humana no reutiliza evidencia anterior
 * ================================================================== */

function filaPendiente(db: Database) {
  db.run(
    `INSERT INTO cierre_validacion(ciclo,revision,dirty,dirty_desde,dirty_ultimo,
       dirty_origen,dirty_motivos,cobertura)
     VALUES('1',1,1,?,?,'Migracion','[]',?)`,
    [t, t, COBERTURA],
  );
}

test("adversarial · confirmar con el mismo instante que la marca de pendiente falla", () => {
  const db = baseConHechos();
  filaPendiente(db);
  const eventos = contar(db, "cierre_validacion_audit");

  expect(() =>
    confirmarRevisionValidacion(db, "1", {
      huella: HUELLA_A,
      versionConjunto: "1",
      actor: "humano",
      instante: t, // exactamente `dirty_desde`/`dirty_ultimo`
      revisionEsperada: 1,
    }),
  ).toThrow(/instante posterior a dirty/);

  const fila = db
    .query("SELECT revision,dirty,huella_validacion FROM cierre_validacion WHERE ciclo='1'")
    .get() as Record<string, unknown>;
  expect(fila).toEqual({ revision: 1, dirty: 1, huella_validacion: null });
  expect(contar(db, "cierre_validacion_audit")).toBe(eventos);
  db.close();
});

test("adversarial · confirmar con actor+instante+huella de la validación anterior falla", () => {
  const db = baseConHechos();
  filaPendiente(db);

  // Primera revisión humana legítima.
  expect(
    confirmarRevisionValidacion(db, "1", {
      huella: HUELLA_A,
      versionConjunto: "1",
      actor: "humano",
      instante: t2,
      revisionEsperada: 1,
    }),
  ).toMatchObject({ revision: 2 });
  const eventos = contar(db, "cierre_validacion_audit");
  expect(eventos).toBe(1);

  // Impacto material posterior: la fila vuelve a Pendiente sin tocar la referencia.
  db.run(
    `UPDATE cierre_validacion SET dirty=1,dirty_desde=?,dirty_ultimo=?,
       dirty_origen='Operacion',dirty_motivos='["FLUJO_CICLO"]' WHERE ciclo='1'`,
    [t3, t3],
  );

  // Reutilizar el recibo anterior: mismo actor, mismo instante, misma huella.
  expect(() =>
    confirmarRevisionValidacion(db, "1", {
      huella: HUELLA_A,
      versionConjunto: "1",
      actor: "humano",
      instante: t2,
      revisionEsperada: 2,
    }),
  ).toThrow(/instante posterior a/);

  // Y el trigger, sin pasar por el servicio, tampoco lo admite.
  expect(() =>
    db.run(
      `UPDATE cierre_validacion SET revision=3,dirty=0,dirty_desde=NULL,
         dirty_ultimo=NULL,dirty_origen=NULL,dirty_motivos=NULL,
         revision_actor='humano',revision_instante=?,huella_validacion=?
       WHERE ciclo='1'`,
      [t2, HUELLA_A],
    ),
  ).toThrow();

  const fila = db
    .query(
      "SELECT revision,dirty,revision_actor,revision_instante,huella_validacion FROM cierre_validacion WHERE ciclo='1'",
    )
    .get() as Record<string, unknown>;
  expect(fila).toEqual({
    revision: 2,
    dirty: 1,
    revision_actor: "humano",
    revision_instante: t2,
    huella_validacion: HUELLA_A,
  });
  expect(contar(db, "cierre_validacion_audit")).toBe(eventos);

  // La huella puede repetirse (conjunto igual) si la evidencia es nueva.
  expect(
    confirmarRevisionValidacion(db, "1", {
      huella: HUELLA_A,
      versionConjunto: "1",
      actor: "humano",
      instante: t4,
      revisionEsperada: 2,
    }),
  ).toMatchObject({ revision: 3 });
  db.close();
});

test("adversarial · la guarda rechaza salto de revisión, conjunto distinto y evidencia futura relativa", () => {
  const db = baseConHechos();
  filaPendiente(db);
  const actual = {
    ciclo: "1",
    revision: 1,
    dirty: true,
    dirtyDesde: t,
    dirtyUltimo: t,
    huella: null,
    versionConjunto: null,
    actor: null,
    instante: null,
    motivo: null,
    cobertura: COBERTURA,
  };

  // Revisión esperada distinta de la real: conflicto, no escritura.
  expect(() =>
    exigirRevisionHumanaNueva(actual, {
      huella: HUELLA_A,
      versionConjunto: "1",
      actor: "humano",
      instante: t2,
      revisionEsperada: 2,
    }),
  ).toThrow(/la revisión cambió/);

  // Con una referencia de conjunto ya existente no se reapunta a otra versión.
  expect(() =>
    exigirRevisionHumanaNueva(
      { ...actual, huella: HUELLA_B, versionConjunto: "1" },
      {
        huella: HUELLA_A,
        versionConjunto: "2",
        actor: "humano",
        instante: t2,
        revisionEsperada: 1,
      },
    ),
  ).toThrow(/no reapunta/);

  // Y el trigger de confirmación rechaza el cambio de conjunto en SQL directo.
  db.run(
    `UPDATE cierre_validacion SET revision=2,huella_validacion=?,version_conjunto='1',
       revision_actor='humano',revision_instante=? WHERE ciclo='1'`,
    [HUELLA_A, t2],
  );
  db.run(
    `UPDATE cierre_validacion SET dirty=1,dirty_desde=?,dirty_ultimo=?,
       dirty_origen='Operacion',dirty_motivos='[]' WHERE ciclo='1'`,
    [t3, t3],
  );
  expect(() =>
    db.run(
      `UPDATE cierre_validacion SET revision=3,dirty=0,dirty_desde=NULL,dirty_ultimo=NULL,
         dirty_origen=NULL,dirty_motivos=NULL,version_conjunto='2',
         revision_actor='humano',revision_instante=? WHERE ciclo='1'`,
      [t4],
    ),
  ).toThrow("confirmar la revision exige referencia nueva del conjunto actual");

  const fila = db
    .query("SELECT revision,dirty,version_conjunto FROM cierre_validacion WHERE ciclo='1'")
    .get() as Record<string, unknown>;
  expect(fila).toEqual({ revision: 2, dirty: 1, version_conjunto: "1" });
  db.close();
});

/* ================================================================== *
 * Corrección 3 · el recibo no admite cifras ni claves de importe
 * ================================================================== */

const RECIBO = {
  operacionId: "OP1",
  ciclos: [{ id: "1", revision: "2", estado: "Validada" }],
  auditIds: ["1"],
  cierresDirty: [
    {
      ciclo: "1",
      rango: { desde: "2026-01-01", hasta: "2026-01-31" },
      estadoValidacion: "Pendiente",
      validado: false,
      dirtyPrevio: true,
    },
  ],
};

function recibo(db: Database, payload: unknown, key = `k${Math.random()}`) {
  db.run(
    `INSERT INTO validacion_attempts(operacion,key,hash,response,completado,expira)
     VALUES('validar',?,?,?,1,1)`,
    [key, "a".repeat(64), JSON.stringify(payload)],
  );
}

test("adversarial · recibo: importe bajo clave permitida, desconocida, número suelto, texto y array inflado", () => {
  const db = store();
  const antes = contar(db, "validacion_attempts");
  expect(() => recibo(db, RECIBO)).not.toThrow();
  expect(contar(db, "validacion_attempts")).toBe(antes + 1);

  const casos: [string, unknown][] = [
    // Importe bajo una clave permitida: `rango` sólo admite fechas.
    [
      "importe en rango",
      {
        ...RECIBO,
        cierresDirty: [
          { ...RECIBO.cierresDirty[0], rango: { ...RECIBO.cierresDirty[0].rango, importe: "12" } },
        ],
      },
    ],
    // Importe bajo clave permitida, sustituyendo el valor de una fecha.
    [
      "importe como fecha",
      {
        ...RECIBO,
        cierresDirty: [
          { ...RECIBO.cierresDirty[0], rango: { desde: "12,50", hasta: "2026-01-31" } },
        ],
      },
    ],
    // Clave desconocida con importe, arriba y dentro de un elemento.
    ["clave desconocida", { ...RECIBO, total: "100" }],
    [
      "clave desconocida anidada",
      { ...RECIBO, ciclos: [{ ...RECIBO.ciclos[0], importe: "9,99" }] },
    ],
    // Número suelto anidado.
    ["número anidado", { ...RECIBO, auditIds: ["1", 2] }],
    [
      "número en profundidad",
      {
        ...RECIBO,
        cierresDirty: [{ ...RECIBO.cierresDirty[0], rango: { desde: 20260101, hasta: "2026-01-31" } }],
      },
    ],
    // Cifra escondida en un string de un campo técnico.
    ["cifra en enum", { ...RECIBO, ciclos: [{ ...RECIBO.ciclos[0], estado: "Validada 1.234,56" }] }],
    ["cifra en operacionId", { ...RECIBO, operacionId: "12.50" }],
    ["cifra con símbolo", { ...RECIBO, operacionId: "OP-€" }],
    // Arrays inflados.
    [
      "ciclos inflados",
      { ...RECIBO, ciclos: Array.from({ length: 201 }, (_, i) => ({ id: String(i + 1), revision: "1", estado: "Validada" })) },
    ],
    [
      "auditIds inflados",
      { ...RECIBO, auditIds: Array.from({ length: 501 }, (_, i) => String(i + 1)) },
    ],
    [
      "cierresDirty inflados",
      {
        ...RECIBO,
        cierresDirty: Array.from({ length: 201 }, (_, i) => ({
          ...RECIBO.cierresDirty[0],
          ciclo: String(i + 1),
        })),
      },
    ],
    // Forma rota del sobre y del rango.
    ["falta una clave", { operacionId: "OP1", ciclos: [], auditIds: [] }],
    [
      "rango sin hasta",
      { ...RECIBO, cierresDirty: [{ ...RECIBO.cierresDirty[0], rango: { desde: "2026-01-01" } }] },
    ],
    ["booleano como texto", { ...RECIBO, cierresDirty: [{ ...RECIBO.cierresDirty[0], validado: "true" }] }],
  ];

  for (const [nombre, payload] of casos)
    expect(() => recibo(db, payload), nombre).toThrow("recibo de validacion invalido");

  expect(contar(db, "validacion_attempts")).toBe(antes + 1);
  db.close();
});

test("adversarial · recibo: el UPDATE de la respuesta también se valida", () => {
  const db = store();
  recibo(db, RECIBO, "unico");
  expect(() =>
    db.run("UPDATE validacion_attempts SET response=? WHERE key='unico'", [
      JSON.stringify({ ...RECIBO, cierresDirty: [{ ...RECIBO.cierresDirty[0], validado: 1 }] }),
    ]),
  ).toThrow("recibo de validacion invalido");
  const fila = db
    .query("SELECT response FROM validacion_attempts WHERE key='unico'")
    .get() as { response: string };
  expect(JSON.parse(fila.response)).toEqual(RECIBO);
  db.close();
});

/* ================================================================== *
 * Hueco de §7.3 · metadatos migrados y migrados dos veces
 * ================================================================== */

function cierreLegado(db: Database, version: number, fin: string, fingerprint: string) {
  // `cierres` referencia `fotos_cierre` de forma diferida: ambas filas deben
  // nacer en la misma transacción.
  db.transaction(() => {
    db.run(
      `INSERT INTO cierres(ciclo,version,inicio,fin,saldo_inicial,actor,creado_utc,
         motivo,fingerprint,estado)
       VALUES('1',?,'2026-01-01',?,0,'actor-legado','2026-02-01T10:00:00.000Z',
         'Motivo legado',?,'Cerrado')`,
      [version, fin, fingerprint],
    );
    db.run(
      `INSERT INTO fotos_cierre(ciclo,version,creado_utc,actor,motivo,fingerprint,
         app_version,schema_version,ventana_inicio,ventana_fin,saldo_inicial,
         estado_temporal,estado_hechos,estado_plan,hechos,plan,clasificacion,
         inversion,auxiliares,cobertura,backup,no_disponible)
       VALUES('1',?,'2026-02-01T10:00:00.000Z','actor-legado','Motivo legado',?,
         'e4.9-v25',25,'2026-01-01',?,0,'Cerrado','Con hechos','Capturado','{}','{}',
         '{}','{}','{}','{\"totales\":{}}','{}','{}')`,
      [version, fingerprint, fin],
    );
  }).immediate();
}

function baseConMetadatos(): Database {
  const db = store();
  ciclo(db, "1", "2026-01-01");
  cierreLegado(db, 1, "2026-01-31", "c".repeat(64));
  db.run(
    `INSERT INTO reaperturas(id,ciclo,version_origen,tipo,actor,creado_utc,motivo,
       fingerprint_peticion,version_esperada,clave_intento,correlacion,
       reapertura_origen,resultado)
     VALUES(1,'1',1,'reapertura','actor-reapertura','2026-02-02T10:00:00.000Z',
       'Motivo reapertura',?,1,'clave-1','6f1c2c1e-1111-4222-8333-444455556666',
       NULL,'Aplicada')`,
    ["d".repeat(64)],
  );
  cierreLegado(db, 2, "2026-02-28", "e".repeat(64));
  db.run(
    `INSERT INTO cierre_vinculos(ciclo,version_origen,version_destino,reapertura_id,
       correlacion) VALUES('1',1,2,1,'6f1c2c1e-1111-4222-8333-444455556666')`,
  );
  db.run(
    `INSERT INTO reapertura_activa(id,ciclo,reapertura_id) VALUES(1,'1',1)`,
  );
  db.run(
    `INSERT INTO cierre_audit(ciclo,version,accion,anterior,posterior,motivo,
       instante,actor)
     VALUES('1',1,'cierre',NULL,'{}','Motivo cierre','2026-02-03T10:00:00.000Z',
       'actor-cierre')`,
  );
  db.run(
    `INSERT INTO fotos_periodo(tipo,ejercicio,trimestre,inicio,fin,version,
       creado_utc,actor,motivo,fingerprint,app_version,schema_version,
       regla_composicion,seleccion_aplicada,cobertura,valores,no_disponible)
     VALUES('Trimestre',2026,1,'2026-01-01','2026-03-31','A1',
       '2026-04-01T10:00:00.000Z','actor-periodo','Motivo periodo',?,'e4.11-v27',27,
       'UltimaVersion','{}','{\"totales\":{}}','{\"importe\":12345}','{}')`,
    ["f".repeat(64)],
  );
  const periodo = (db.query("SELECT id FROM fotos_periodo").get() as { id: number }).id;
  db.run(
    `INSERT INTO foto_periodo_componentes(periodo_id,ciclo,version_foto,
       fingerprint_foto,estado) VALUES(?, '1', 2, ?, 'Incluido')`,
    [periodo, "e".repeat(64)],
  );
  return db;
}

test("adversarial · metadatos migrados dos veces: sin duplicar, sin sobrescribir, originales intactos", () => {
  const db = baseConMetadatos();

  // E1b primero, como en la migración real.
  importarCierresLegados(db, { ahora: new Date(t3) });
  // Caso límite real: la fila ya estaba validada por un humano cuando la
  // reapertura activa se migra, así que la transición debe volver a marcarla.
  db.run(
    `UPDATE cierre_validacion SET revision=2,dirty=0,dirty_desde=NULL,
       dirty_ultimo=NULL,dirty_origen=NULL,dirty_motivos=NULL,
       huella_validacion=?,version_conjunto='1',revision_actor='humano',
       revision_instante=? WHERE ciclo='1'`,
    [HUELLA_B, t4],
  );
  const primera = migrarMetadatosLegados(db, { ahora: new Date(t3) });
  expect(primera.creados.sort()).toEqual(
    [
      "cierre_audit:1",
      "cierre_vinculos:1:2",
      "foto_periodo_componentes:1:1",
      "fotos_periodo:1",
      "reapertura_activa:1",
      "reaperturas:1",
    ].sort(),
  );
  expect(primera.eventos).toBe(4);

  const manifiesto = db
    .query("SELECT * FROM cierre_validacion_manifiesto ORDER BY tabla,pk")
    .all();
  const eventos = db
    .query("SELECT * FROM cierre_validacion_audit ORDER BY id")
    .all();
  const estado = db.query("SELECT * FROM cierre_validacion ORDER BY ciclo").all();
  // Un evento de E1b (el cierre legado) más los cuatro metadatos ligados a ciclo.
  expect(eventos.length).toBe(5);
  expect(manifiesto.length).toBe(6);

  // Acciones legadas presentes y sin motivo inventado donde no toca.
  const acciones = (
    db
      .query("SELECT accion,motivo FROM cierre_validacion_audit WHERE accion<>'migracion' ORDER BY id")
      .all() as { accion: string; motivo: string | null }[]
  ).map((fila) => fila.accion)
    .sort();
  expect(acciones).toEqual([
    "legado_cierre_audit",
    "legado_cierre_vinculo",
    "legado_reapertura",
    "legado_reapertura_activa",
  ]);
  const activa = db
    .query("SELECT motivo,origen,actor,instante FROM cierre_validacion_audit WHERE accion='legado_reapertura_activa'")
    .get() as Record<string, string | null>;
  expect(activa.motivo).toBeNull();
  expect(activa.origen).toBe("MIGRACION:reapertura_activa:1");
  expect(activa.actor).toBe("actor-reapertura");
  expect(activa.instante).toBe("2026-02-02T10:00:00.000Z");

  // La fila del ciclo queda pendiente por transición, sin motivo material.
  const fila = db
    .query("SELECT dirty,dirty_origen,dirty_motivos FROM cierre_validacion WHERE ciclo='1'")
    .get() as Record<string, unknown>;
  expect(fila).toMatchObject({
    dirty: 1,
    dirty_origen: "ReaperturaActiva",
    dirty_motivos: "[]",
  });

  // Los metadatos de periodo viven en el manifiesto, con identidad tipada y sin cifras.
  const periodo = db
    .query("SELECT identidad,procedencia,evento_id FROM cierre_validacion_manifiesto WHERE tabla='fotos_periodo'")
    .get() as { identidad: string; procedencia: string; evento_id: number | null };
  const identidad = JSON.parse(periodo.identidad) as Record<string, string | null>;
  expect(identidad).toEqual({
    tipo: "Trimestre",
    ejercicio: "2026",
    trimestre: "1",
    version: "A1",
    appVersion: "e4.11-v27",
    schemaVersion: "27",
    creadoUtc: "2026-04-01T10:00:00.000Z",
    fingerprint: "f".repeat(64),
  });
  expect(periodo.procedencia).toBe("MIGRACION:fotos_periodo:1");
  expect(periodo.evento_id).toBeNull();
  expect(periodo.identidad).not.toContain("12345");

  // Segunda ejecución: no-op exacto.
  const segunda = migrarMetadatosLegados(db, { ahora: new Date(t4) });
  expect(segunda.creados).toEqual([]);
  expect(segunda.eventos).toBe(0);
  expect(segunda.preservados.length).toBe(6);
  expect(
    db.query("SELECT * FROM cierre_validacion_manifiesto ORDER BY tabla,pk").all(),
  ).toEqual(manifiesto);
  expect(
    db.query("SELECT * FROM cierre_validacion_audit ORDER BY id").all(),
  ).toEqual(eventos);
  expect(db.query("SELECT * FROM cierre_validacion ORDER BY ciclo").all()).toEqual(
    estado,
  );

  // Y una tercera sobre la base reabierta por el binario sigue siendo no-op.
  db.close();
  const reabierto = baseConMetadatos();
  importarCierresLegados(reabierto, { ahora: new Date(t3) });
  migrarMetadatosLegados(reabierto, { ahora: new Date(t3) });
  const tercero = migrarMetadatosLegados(reabierto, { ahora: new Date(t4) });
  expect(tercero.creados).toEqual([]);
  expect(contar(reabierto, "cierre_validacion_audit")).toBe(5);
  expect(contar(reabierto, "cierre_validacion_manifiesto")).toBe(6);
  reabierto.close();
});

test("adversarial · metadato con otra identidad bajo la misma PK no se sobrescribe", () => {
  const db = baseConMetadatos();
  importarCierresLegados(db, { ahora: new Date(t3) });
  // Recibo plantado con huella distinta para la misma tabla+PK de origen.
  db.run(
    `INSERT INTO cierre_validacion_manifiesto(tabla,pk,identidad,procedencia,
       observado_utc,huella,evento_id)
     VALUES('reaperturas','1',?,'MIGRACION:reaperturas:1',?,?,NULL)`,
    [
      JSON.stringify({
        ciclo: "1",
        versionOrigen: "1",
        tipo: "cancelacion",
        correlacion: null,
        reaperturaOrigen: null,
      }),
      t3,
      "9".repeat(64),
    ],
  );
  const manifiestoAntes = contar(db, "cierre_validacion_manifiesto");
  const eventosAntes = contar(db, "cierre_validacion_audit");

  expect(() => migrarMetadatosLegados(db, { ahora: new Date(t3) })).toThrow(
    /no se sobrescribe/,
  );
  expect(contar(db, "cierre_validacion_manifiesto")).toBe(manifiestoAntes);
  // La transacción de quien llama revierte: no queda ningún evento nuevo.
  expect(contar(db, "cierre_validacion_audit")).toBe(eventosAntes);
  db.close();
});

test("adversarial · el manifiesto rechaza identidad con cifras, claves extra y edición", () => {
  const db = baseConMetadatos();
  const identidadValida = {
    periodoId: "1",
    ciclo: "1",
    versionFoto: "2",
    fingerprintFoto: "e".repeat(64),
    estado: "Incluido",
  };
  const insertar = (identidad: unknown, pk = "1:1") =>
    db.run(
      `INSERT INTO cierre_validacion_manifiesto(tabla,pk,identidad,procedencia,
         observado_utc,huella,evento_id)
       VALUES('foto_periodo_componentes',?,?,'MIGRACION:foto_periodo_componentes:1:1',?,?,NULL)`,
      [pk, JSON.stringify(identidad), t, "1".repeat(64)],
    );

  expect(() => insertar(identidadValida)).not.toThrow();

  const casos: [string, unknown, string?][] = [
    ["número suelto", { ...identidadValida, periodoId: "1", versionFoto: 2 }, "1:1"],
    ["clave extra", { ...identidadValida, importe: "12" }, "1:1"],
    ["clave de importe anidada", { ...identidadValida, fingerprintFoto: "12,50" }, "1:1"],
    ["estado inventado", { ...identidadValida, estado: "IncluidoImporte" }, "1:1"],
    ["pk incoherente", identidadValida, "2:1"],
  ];
  for (const [nombre, identidad, pk] of casos)
    expect(() => insertar(identidad, pk), nombre).toThrow(
      "manifiesto de migracion invalido",
    );

  expect(contar(db, "cierre_validacion_manifiesto")).toBe(1);
  expect(() =>
    db.run("UPDATE cierre_validacion_manifiesto SET observado_utc=? WHERE pk='1:1'", [t2]),
  ).toThrow("immutable migration manifest");
  expect(() => db.run("DELETE FROM cierre_validacion_manifiesto")).toThrow(
    "immutable migration manifest",
  );
  db.close();
});

test("adversarial · la migración de metadatos no toca las tablas de origen", () => {
  const db = baseConMetadatos();
  const antes = {
    reaperturas: db.query("SELECT * FROM reaperturas ORDER BY id").all(),
    reapertura_activa: db.query("SELECT * FROM reapertura_activa ORDER BY id").all(),
    cierre_vinculos: db.query("SELECT * FROM cierre_vinculos ORDER BY version_destino").all(),
    cierre_audit: db.query("SELECT * FROM cierre_audit ORDER BY id").all(),
    fotos_periodo: db.query("SELECT * FROM fotos_periodo ORDER BY id").all(),
    componentes: db.query("SELECT * FROM foto_periodo_componentes ORDER BY ciclo").all(),
    cierres: db.query("SELECT * FROM cierres ORDER BY version").all(),
  };
  importarCierresLegados(db, { ahora: new Date(t3) });
  migrarMetadatosLegados(db, { ahora: new Date(t3) });
  expect(db.query("SELECT * FROM reaperturas ORDER BY id").all()).toEqual(antes.reaperturas);
  expect(db.query("SELECT * FROM reapertura_activa ORDER BY id").all()).toEqual(
    antes.reapertura_activa,
  );
  expect(db.query("SELECT * FROM cierre_vinculos ORDER BY version_destino").all()).toEqual(
    antes.cierre_vinculos,
  );
  expect(db.query("SELECT * FROM cierre_audit ORDER BY id").all()).toEqual(antes.cierre_audit);
  expect(db.query("SELECT * FROM fotos_periodo ORDER BY id").all()).toEqual(antes.fotos_periodo);
  expect(
    db.query("SELECT * FROM foto_periodo_componentes ORDER BY ciclo").all(),
  ).toEqual(antes.componentes);
  expect(db.query("SELECT * FROM cierres ORDER BY version").all()).toEqual(antes.cierres);
  db.close();
});

test("inventario de escritores: constructor, importación y guarda son los únicos escritores de auditoría", () => {
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