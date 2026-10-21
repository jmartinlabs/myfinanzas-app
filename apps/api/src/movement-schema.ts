import type { Database } from "bun:sqlite";
export const schemaVersion = 4;
/** Existing opening IMMEDIATE transaction owns DDL, version and counters atomically. */
export function movementSchema(db: Database) {
  db.exec(`CREATE TABLE movimientos(
    id TEXT PRIMARY KEY CHECK(id NOT GLOB '*[^0-9]*' AND length(id)>0 AND substr(id,1,1)!='0'),
    fecha TEXT NOT NULL CHECK(length(fecha)=10 AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha) IS NOT NULL AND date(fecha)=fecha),
    tipo TEXT NOT NULL CHECK(tipo IN ('Ingreso','Gasto')),
    importe INTEGER NOT NULL CHECK(importe>0),
    origen TEXT NOT NULL REFERENCES saldos(id) ON DELETE RESTRICT,
    destino TEXT NOT NULL REFERENCES saldos(id) ON DELETE RESTRICT,
    subtipo TEXT CHECK(subtipo IN ('Nómina','Bonus','Intereses','Promoción')),
    partida TEXT REFERENCES partidas(id) ON DELETE RESTRICT,
    concepto TEXT NOT NULL, nota TEXT NOT NULL,
    anulado INTEGER NOT NULL DEFAULT 0 CHECK(anulado IN (0,1)),
    revision INTEGER NOT NULL CHECK(revision>0), creado TEXT NOT NULL, actualizado TEXT NOT NULL,
    CHECK((tipo='Ingreso' AND origen='S000' AND destino!='S000' AND subtipo IS NOT NULL AND partida IS NULL)
       OR (tipo='Gasto' AND destino='S000' AND origen!='S000' AND partida IS NOT NULL AND subtipo IS NULL))
  ) STRICT;
  CREATE INDEX movimientos_partida ON movimientos(partida);
  CREATE INDEX movimientos_origen ON movimientos(origen);
  CREATE INDEX movimientos_destino ON movimientos(destino);
  CREATE INDEX movimientos_fecha ON movimientos(fecha);
  CREATE TRIGGER movimiento_id_immutable BEFORE UPDATE OF id ON movimientos WHEN NEW.id!=OLD.id BEGIN SELECT RAISE(ABORT,'immutable id'); END;
  CREATE TRIGGER movimiento_no_delete BEFORE DELETE ON movimientos BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TRIGGER movimiento_annulled_immutable BEFORE UPDATE ON movimientos WHEN OLD.anulado=1 BEGIN SELECT RAISE(ABORT,'annulled record is immutable'); END;
  CREATE TABLE movement_audit(
    id TEXT NOT NULL REFERENCES movimientos(id), revision INTEGER NOT NULL,
    accion TEXT NOT NULL CHECK(accion IN ('alta','rectificación','anulación')),
    motivo TEXT, instante TEXT NOT NULL, actor TEXT NOT NULL,
    anterior TEXT, posterior TEXT NOT NULL, PRIMARY KEY(id,revision)
  ) STRICT;
  CREATE TRIGGER movement_audit_no_update BEFORE UPDATE ON movement_audit BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER movement_audit_no_delete BEFORE DELETE ON movement_audit BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TABLE movement_attempts(key TEXT PRIMARY KEY, hash TEXT NOT NULL, response TEXT NOT NULL, expires INTEGER NOT NULL) STRICT;
  INSERT INTO counters VALUES('movimientos',1);
  UPDATE schema_version SET version=4;`);
}
