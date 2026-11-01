import type { Database } from "bun:sqlite";

/**
 * E4.2 schema 21 (20→21). Narrowly rebuilds `operaciones_inversion` to widen the
 * frozen v18 `clase` CHECK to `Compra|Venta` (SPEC22 §4.1/§5, enmienda D7).
 *
 * No table, index, counter or audit store is added. Rows, operation audit,
 * attempts, counters, identity and every foreign table are preserved verbatim.
 * The application audit table is rebuilt in place with its exact v18 definition
 * because it is the only child of `operaciones_inversion`; SQLite cannot drop a
 * referenced parent with foreign keys enabled, and `prepareSchema` owns the
 * writer transaction, so enforcement is never disabled for the file.
 */
const OPERATION_TABLE = `CREATE TABLE operaciones_inversion(
    id TEXT PRIMARY KEY CHECK(id NOT GLOB '*[^0-9]*' AND length(id)>0 AND substr(id,1,1)!='0'),
    clase TEXT NOT NULL CHECK(clase IN ('Compra','Venta')),
    fecha TEXT NOT NULL CHECK(length(fecha)=10 AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha) IS NOT NULL AND date(fecha)=fecha),
    instrumento TEXT NOT NULL REFERENCES instrumentos(id) ON DELETE RESTRICT,
    saldo_efectivo TEXT NOT NULL REFERENCES saldos(id) ON DELETE RESTRICT,
    saldo_inversion TEXT NOT NULL REFERENCES saldos(id) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK(cantidad>0 AND cantidad<=9007199254740991),
    precio_divisa INTEGER NOT NULL CHECK(precio_divisa>0 AND precio_divisa<=9007199254740991),
    divisa TEXT NOT NULL CHECK(length(divisa)=3 AND divisa NOT GLOB '*[^A-Z]*'),
    cambio INTEGER CHECK(cambio IS NULL OR (cambio>0 AND cambio<=9007199254740991)),
    importe_eur INTEGER NOT NULL CHECK(importe_eur>0),
    comision_eur INTEGER CHECK(comision_eur IS NULL OR (comision_eur>=0 AND comision_eur<=importe_eur)),
    concepto TEXT CHECK(concepto IS NULL OR length(concepto)<=2000),
    nota TEXT CHECK(nota IS NULL OR length(nota)<=2000),
    estado TEXT NOT NULL CHECK(estado IN ('Vigente','Anulada')),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL, actualizado TEXT NOT NULL,
    CHECK(saldo_efectivo<>saldo_inversion),
    CHECK((divisa='EUR' AND (cambio IS NULL OR cambio=1000000)) OR (divisa!='EUR' AND cambio IS NOT NULL))
  ) STRICT;`;

const OPERATION_OBJECTS = `
  CREATE INDEX operaciones_inversion_instrumento ON operaciones_inversion(instrumento);
  CREATE INDEX operaciones_inversion_efectivo ON operaciones_inversion(saldo_efectivo);
  CREATE INDEX operaciones_inversion_inversion ON operaciones_inversion(saldo_inversion);
  CREATE INDEX operaciones_inversion_fecha ON operaciones_inversion(fecha);
  CREATE TRIGGER operacion_inversion_id_immutable BEFORE UPDATE OF id ON operaciones_inversion
    WHEN NEW.id!=OLD.id BEGIN SELECT RAISE(ABORT,'immutable operation id'); END;
  CREATE TRIGGER operacion_inversion_no_delete BEFORE DELETE ON operaciones_inversion
    BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TRIGGER operacion_inversion_annulled_immutable BEFORE UPDATE ON operaciones_inversion
    WHEN OLD.estado='Anulada' BEGIN SELECT RAISE(ABORT,'annulled operation is immutable'); END;
  CREATE TRIGGER operacion_inversion_identity_immutable BEFORE UPDATE OF instrumento,saldo_efectivo,saldo_inversion ON operaciones_inversion
    WHEN NEW.instrumento!=OLD.instrumento OR NEW.saldo_efectivo!=OLD.saldo_efectivo OR NEW.saldo_inversion!=OLD.saldo_inversion
    BEGIN SELECT RAISE(ABORT,'immutable operation identity'); END;
  CREATE TRIGGER operacion_inversion_saldos_type BEFORE INSERT ON operaciones_inversion
    WHEN (SELECT tipo FROM saldos WHERE id=NEW.saldo_efectivo) IS NOT 'Efectivo'
      OR (SELECT control FROM saldos WHERE id=NEW.saldo_efectivo) IS NOT 'Inversiones'
      OR (SELECT tipo FROM saldos WHERE id=NEW.saldo_inversion) IS NOT 'Inversión'
      OR (SELECT control FROM saldos WHERE id=NEW.saldo_inversion) IS NOT 'Inversiones'
    BEGIN SELECT RAISE(ABORT,'invalid investment saldo pair'); END;
`;

const AUDIT_TABLE = `CREATE TABLE operacion_inversion_audit(
    operacion TEXT NOT NULL REFERENCES operaciones_inversion(id),
    revision INTEGER NOT NULL,
    accion TEXT NOT NULL CHECK(accion IN ('alta','rectificación','anulación')),
    motivo TEXT, instante TEXT NOT NULL, actor TEXT NOT NULL,
    anterior TEXT, posterior TEXT NOT NULL,
    PRIMARY KEY(operacion,revision)
  ) STRICT;`;

const AUDIT_OBJECTS = `
  CREATE TRIGGER operacion_inversion_audit_no_update BEFORE UPDATE ON operacion_inversion_audit
    BEGIN SELECT RAISE(ABORT,'immutable operation audit'); END;
  CREATE TRIGGER operacion_inversion_audit_no_delete BEFORE DELETE ON operacion_inversion_audit
    BEGIN SELECT RAISE(ABORT,'immutable operation audit'); END;
`;

export function ventaSchema(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 20)
    throw new Error("Esquema previo inesperado para migración E4.2 v21.");
  // The audit rows are copied to a plain staging table first: the parent cannot
  // be dropped while a child FK still references it, and the writer transaction
  // owned by `prepareSchema` must keep foreign keys enforced.
  db.exec(`CREATE TABLE operacion_inversion_audit_backup(
    operacion TEXT NOT NULL, revision INTEGER NOT NULL, accion TEXT NOT NULL,
    motivo TEXT, instante TEXT NOT NULL, actor TEXT NOT NULL,
    anterior TEXT, posterior TEXT NOT NULL,
    PRIMARY KEY(operacion,revision)
  ) STRICT;`);
  db.exec(
    "INSERT INTO operacion_inversion_audit_backup SELECT operacion,revision,accion,motivo,instante,actor,anterior,posterior FROM operacion_inversion_audit;",
  );
  db.exec("DROP TABLE operacion_inversion_audit;");
  db.exec(
    OPERATION_TABLE.replace(
      "CREATE TABLE operaciones_inversion(",
      "CREATE TABLE operaciones_inversion_v21(",
    ),
  );
  db.exec(
    "INSERT INTO operaciones_inversion_v21 SELECT id,clase,fecha,instrumento,saldo_efectivo,saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,comision_eur,concepto,nota,estado,revision,creado,actualizado FROM operaciones_inversion;",
  );
  // DROP also removes the v18 indexes/triggers of the replaced table; they are
  // recreated below with their frozen definitions.
  db.exec(
    "DROP TABLE operaciones_inversion; ALTER TABLE operaciones_inversion_v21 RENAME TO operaciones_inversion;",
  );
  db.exec(OPERATION_OBJECTS);
  db.exec(AUDIT_TABLE);
  db.exec(
    "INSERT INTO operacion_inversion_audit SELECT operacion,revision,accion,motivo,instante,actor,anterior,posterior FROM operacion_inversion_audit_backup;",
  );
  db.exec("DROP TABLE operacion_inversion_audit_backup;");
  db.exec(AUDIT_OBJECTS);
  db.exec("UPDATE schema_version SET version=21;");
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error("Ventas schema FK validation failed.");
}
