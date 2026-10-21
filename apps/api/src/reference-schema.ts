import type { Database } from "bun:sqlite";
export const referenceSchemaVersion = 5;
/** Owned by the existing IMMEDIATE initialization transaction, no FK disabling. */
export function referenceSchema(db: Database) {
  db.exec(`CREATE TABLE referencias(
    id TEXT PRIMARY KEY CHECK(id GLOB 'REF[0-9]*' AND substr(id,4) NOT GLOB '*[^0-9]*' AND length(id)>=6),
    nombre TEXT NOT NULL CHECK(length(trim(nombre))>0),
    tipo TEXT NOT NULL CHECK(tipo IN ('Viaje','Evento')),
    estado TEXT NOT NULL CHECK(estado IN ('Activa','Inactiva')),
    revision INTEGER NOT NULL CHECK(revision>0), creado TEXT NOT NULL, actualizado TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER referencia_id_immutable BEFORE UPDATE OF id ON referencias WHEN NEW.id!=OLD.id BEGIN SELECT RAISE(ABORT,'immutable id'); END;
  CREATE TRIGGER referencia_no_delete BEFORE DELETE ON referencias BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TABLE reference_attempts(key TEXT PRIMARY KEY, hash TEXT NOT NULL, response TEXT NOT NULL, expires INTEGER NOT NULL) STRICT;
  INSERT INTO counters VALUES('referencias',1);`);
  // Preserve immutable audit JSON verbatim while rebuilding its parent CHECK constraint.
  const auditObjects = db
    .query(
      "SELECT sql FROM sqlite_master WHERE tbl_name='movement_audit' AND sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END",
    )
    .all() as { sql: string }[];
  db.exec(`CREATE TEMP TABLE saved_movement_audit AS SELECT * FROM movement_audit;
    DROP TABLE movement_audit;
    CREATE TABLE movimientos_v5(
      id TEXT PRIMARY KEY CHECK(id NOT GLOB '*[^0-9]*' AND length(id)>0 AND substr(id,1,1)!='0'),
      fecha TEXT NOT NULL CHECK(length(fecha)=10 AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha) IS NOT NULL AND date(fecha)=fecha),
      tipo TEXT NOT NULL CHECK(tipo IN ('Ingreso','Gasto','Transferencia')),
      importe INTEGER NOT NULL CHECK(importe>0),
      origen TEXT NOT NULL REFERENCES saldos(id) ON DELETE RESTRICT,
      destino TEXT NOT NULL REFERENCES saldos(id) ON DELETE RESTRICT,
      subtipo TEXT CHECK(subtipo IN ('Nómina','Bonus','Intereses','Promoción')),
      partida TEXT REFERENCES partidas(id) ON DELETE RESTRICT,
      concepto TEXT NOT NULL, nota TEXT NOT NULL,
      anulado INTEGER NOT NULL DEFAULT 0 CHECK(anulado IN (0,1)),
      revision INTEGER NOT NULL CHECK(revision>0), creado TEXT NOT NULL, actualizado TEXT NOT NULL,
      referencia TEXT REFERENCES referencias(id) ON DELETE RESTRICT,
      CHECK((tipo='Ingreso' AND origen='S000' AND destino!='S000' AND subtipo IS NOT NULL AND partida IS NULL)
        OR (tipo='Gasto' AND destino='S000' AND origen!='S000' AND partida IS NOT NULL AND subtipo IS NULL)
        OR (tipo='Transferencia' AND origen!='S000' AND destino!='S000' AND origen!=destino AND partida IS NULL AND subtipo IS NULL))
    ) STRICT;
    INSERT INTO movimientos_v5 SELECT *,NULL FROM movimientos;
    DROP TABLE movimientos;
    ALTER TABLE movimientos_v5 RENAME TO movimientos;
    CREATE INDEX movimientos_partida ON movimientos(partida);
    CREATE INDEX movimientos_origen ON movimientos(origen);
    CREATE INDEX movimientos_destino ON movimientos(destino);
    CREATE INDEX movimientos_fecha ON movimientos(fecha);
    CREATE INDEX movimientos_referencia ON movimientos(referencia);
    CREATE TRIGGER movimiento_id_immutable BEFORE UPDATE OF id ON movimientos WHEN NEW.id!=OLD.id BEGIN SELECT RAISE(ABORT,'immutable id'); END;
    CREATE TRIGGER movimiento_no_delete BEFORE DELETE ON movimientos BEGIN SELECT RAISE(ABORT,'no delete'); END;
    CREATE TRIGGER movimiento_annulled_immutable BEFORE UPDATE ON movimientos WHEN OLD.anulado=1 BEGIN SELECT RAISE(ABORT,'annulled record is immutable'); END;`);
  for (const object of auditObjects) db.exec(object.sql);
  db.exec(`INSERT INTO movement_audit SELECT * FROM saved_movement_audit;
    DROP TABLE saved_movement_audit;
  CREATE TRIGGER referencia_used_type BEFORE UPDATE OF tipo ON referencias WHEN NEW.tipo!=OLD.tipo AND EXISTS(SELECT 1 FROM movimientos WHERE referencia=OLD.id) BEGIN SELECT RAISE(ABORT,'used reference type'); END;
    UPDATE schema_version SET version=5;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error("Upgrade FK validation failed.");
}
