import type { Database } from "bun:sqlite";

/**
 * E4.1 schema 16. Additive only: it creates its own tables and counters and
 * never drops or destructively alters contracts from earlier deliveries.
 */
export function investmentSchema(db: Database) {
  db.exec(`CREATE TABLE instrumentos(
    id TEXT PRIMARY KEY CHECK(id GLOB 'I[0-9]*' AND substr(id,2) NOT GLOB '*[^0-9]*' AND length(id)>=5),
    nombre TEXT NOT NULL CHECK(length(nombre)>=1 AND length(nombre)<=120),
    isin TEXT CHECK(isin IS NULL OR (length(isin)=12 AND isin NOT GLOB '*[^A-Z0-9]*')),
    isin_evidencia TEXT CHECK(isin_evidencia IS NULL OR (length(isin_evidencia)>=1 AND length(isin_evidencia)<=200)),
    divisa_referencia TEXT CHECK(divisa_referencia IS NULL OR (length(divisa_referencia)=3 AND divisa_referencia NOT GLOB '*[^A-Z]*')),
    estado TEXT NOT NULL CHECK(estado IN ('Activa','Inactiva')),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado_en TEXT NOT NULL, actualizado_en TEXT NOT NULL,
    CHECK((isin IS NULL AND isin_evidencia IS NULL) OR (isin IS NOT NULL AND isin_evidencia IS NOT NULL))
  ) STRICT;
  CREATE UNIQUE INDEX instrumentos_isin ON instrumentos(isin) WHERE isin IS NOT NULL;
  CREATE INDEX instrumentos_nombre ON instrumentos(nombre);
  CREATE TRIGGER instrumento_id_immutable BEFORE UPDATE OF id ON instrumentos
    WHEN NEW.id!=OLD.id BEGIN SELECT RAISE(ABORT,'immutable instrument id'); END;
  CREATE TRIGGER instrumento_no_delete BEFORE DELETE ON instrumentos
    BEGIN SELECT RAISE(ABORT,'no delete'); END;

  CREATE TABLE operaciones_inversion(
    id TEXT PRIMARY KEY CHECK(id NOT GLOB '*[^0-9]*' AND length(id)>0 AND substr(id,1,1)!='0'),
    clase TEXT NOT NULL CHECK(clase='Compra'),
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
  ) STRICT;
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
  CREATE TRIGGER operacion_inversion_saldos_type BEFORE INSERT ON operaciones_inversion
    WHEN (SELECT tipo FROM saldos WHERE id=NEW.saldo_efectivo) IS NOT 'Efectivo'
      OR (SELECT control FROM saldos WHERE id=NEW.saldo_efectivo) IS NOT 'Inversiones'
      OR (SELECT tipo FROM saldos WHERE id=NEW.saldo_inversion) IS NOT 'Inversión'
      OR (SELECT control FROM saldos WHERE id=NEW.saldo_inversion) IS NOT 'Inversiones'
    BEGIN SELECT RAISE(ABORT,'invalid investment saldo pair'); END;

  CREATE TABLE instrumento_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  CREATE TABLE operacion_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;

  CREATE TABLE instrumento_audit(
    instrumento TEXT NOT NULL REFERENCES instrumentos(id),
    revision INTEGER NOT NULL,
    accion TEXT NOT NULL CHECK(accion IN ('alta','edición','desactivación','reactivación')),
    motivo TEXT, instante TEXT NOT NULL, actor TEXT NOT NULL,
    anterior TEXT, posterior TEXT NOT NULL,
    PRIMARY KEY(instrumento,revision)
  ) STRICT;
  CREATE TRIGGER instrumento_audit_no_update BEFORE UPDATE ON instrumento_audit
    BEGIN SELECT RAISE(ABORT,'immutable instrument audit'); END;
  CREATE TRIGGER instrumento_audit_no_delete BEFORE DELETE ON instrumento_audit
    BEGIN SELECT RAISE(ABORT,'immutable instrument audit'); END;

  CREATE TABLE operacion_inversion_audit(
    operacion TEXT NOT NULL REFERENCES operaciones_inversion(id),
    revision INTEGER NOT NULL,
    accion TEXT NOT NULL CHECK(accion IN ('alta','rectificación','anulación')),
    motivo TEXT, instante TEXT NOT NULL, actor TEXT NOT NULL,
    anterior TEXT, posterior TEXT NOT NULL,
    PRIMARY KEY(operacion,revision)
  ) STRICT;
  CREATE TRIGGER operacion_inversion_audit_no_update BEFORE UPDATE ON operacion_inversion_audit
    BEGIN SELECT RAISE(ABORT,'immutable operation audit'); END;
  CREATE TRIGGER operacion_inversion_audit_no_delete BEFORE DELETE ON operacion_inversion_audit
    BEGIN SELECT RAISE(ABORT,'immutable operation audit'); END;

  INSERT INTO counters VALUES('instrumento',1001);
  INSERT INTO counters VALUES('operaciones_inversion',1);
  UPDATE schema_version SET version=16;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error("Investment schema FK validation failed.");
}
