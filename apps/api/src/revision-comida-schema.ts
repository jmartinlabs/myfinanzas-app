import type { Database } from "bun:sqlite";
/**
 * E3.4 Revisión Comida. Runs only inside the existing opening IMMEDIATE transaction.
 * Detalle and Reposicion share one numerical identity space; `tipo` is the discriminator.
 * No Movimiento, Saldo or budget effect is created here.
 */
export function revisionComidaSchema(db: Database) {
  db.exec(`CREATE TABLE revision_comida(
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL CHECK(tipo IN ('Detalle','Reposicion')),
    fecha TEXT NOT NULL CHECK(length(fecha)=10 AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha)=fecha),
    concepto TEXT NOT NULL CHECK(length(trim(concepto))>0),
    importe INTEGER NOT NULL CHECK(importe>0),
    direccion TEXT NOT NULL CHECK(direccion IN ('Salida','Entrada')),
    es_devolucion INTEGER NOT NULL CHECK(es_devolucion IN (0,1)),
    clasificacion TEXT CHECK(clasificacion IN ('Comida','Pendiente revisar','Ocio','Niños','Otros','Fuera presupuesto')),
    fuera_presupuesto_historico INTEGER CHECK(fuera_presupuesto_historico IS NULL OR fuera_presupuesto_historico=1),
    evidencia_bancaria TEXT CHECK(evidencia_bancaria IS NULL OR length(trim(evidencia_bancaria))>0),
    evidencia_relacion_compra TEXT CHECK(evidencia_relacion_compra IS NULL OR length(trim(evidencia_relacion_compra))>0),
    cuenta_origen TEXT CHECK(cuenta_origen IS NULL OR length(trim(cuenta_origen))>0),
    tipo_vinculo TEXT CHECK(tipo_vinculo IN ('Individual','Agregado terminal')),
    estado_vinculo TEXT NOT NULL CHECK(estado_vinculo IN ('Sin vínculo','Verificado')),
    evidencia_vinculo TEXT CHECK(evidencia_vinculo IS NULL OR length(trim(evidencia_vinculo))>0),
    movimiento TEXT REFERENCES movimientos(id),
    revision_movimiento INTEGER CHECK(revision_movimiento IS NULL OR revision_movimiento>0),
    estado_registro TEXT NOT NULL CHECK(estado_registro IN ('Vigente','Anulado')),
    estado_trazabilidad TEXT NOT NULL CHECK(estado_trazabilidad IN ('Asignada','Sin asignación')),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL,
    actualizado TEXT NOT NULL,
    CHECK((tipo='Detalle' AND clasificacion IS NOT NULL) OR (tipo='Reposicion' AND clasificacion IS NULL)),
    CHECK((tipo='Detalle' AND direccion='Salida' AND es_devolucion=0) OR (tipo='Detalle' AND direccion='Entrada' AND es_devolucion=1) OR (tipo='Reposicion' AND direccion='Entrada' AND es_devolucion=0)),
    CHECK(tipo<>'Reposicion' OR length(trim(evidencia_bancaria))>0),
    CHECK(estado_trazabilidad<>'Asignada' OR tipo='Reposicion'),
    CHECK(fuera_presupuesto_historico IS NULL OR (clasificacion IS NOT NULL AND clasificacion<>'Fuera presupuesto')),
    CHECK((estado_vinculo='Sin vínculo' AND movimiento IS NULL AND tipo_vinculo IS NULL AND evidencia_vinculo IS NULL AND revision_movimiento IS NULL)
      OR (estado_vinculo='Verificado' AND movimiento IS NOT NULL AND tipo_vinculo IS NOT NULL AND length(trim(evidencia_vinculo))>0 AND revision_movimiento IS NOT NULL))
  ) STRICT;
  CREATE INDEX revision_comida_fecha ON revision_comida(fecha);
  CREATE INDEX revision_comida_movimiento ON revision_comida(movimiento);
  CREATE INDEX revision_comida_estado ON revision_comida(estado_registro,tipo);
  CREATE TRIGGER revision_comida_id_immutable BEFORE UPDATE OF id ON revision_comida
    WHEN NEW.id!=OLD.id BEGIN SELECT RAISE(ABORT,'immutable id'); END;
  CREATE TRIGGER revision_comida_tipo_immutable BEFORE UPDATE OF tipo ON revision_comida
    WHEN NEW.tipo!=OLD.tipo BEGIN SELECT RAISE(ABORT,'immutable type'); END;
  CREATE TRIGGER revision_comida_created_immutable BEFORE UPDATE OF creado ON revision_comida
    WHEN NEW.creado!=OLD.creado BEGIN SELECT RAISE(ABORT,'immutable created'); END;
  CREATE TRIGGER revision_comida_no_delete BEFORE DELETE ON revision_comida
    BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TRIGGER revision_comida_annulled_locked BEFORE UPDATE ON revision_comida
    WHEN OLD.estado_registro='Anulado' BEGIN SELECT RAISE(ABORT,'annulled record is immutable'); END;
  CREATE TABLE revision_comida_audit(
    id INTEGER PRIMARY KEY,
    operacion TEXT NOT NULL REFERENCES revision_comida(id),
    accion TEXT NOT NULL,
    revision INTEGER NOT NULL,
    anterior TEXT,
    posterior TEXT NOT NULL,
    motivo TEXT,
    instante TEXT NOT NULL,
    actor TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER revision_comida_audit_no_update BEFORE UPDATE ON revision_comida_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER revision_comida_audit_no_delete BEFORE DELETE ON revision_comida_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TABLE revision_comida_attempts(
    key TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    response TEXT NOT NULL,
    expires INTEGER NOT NULL
  ) STRICT;
  INSERT OR IGNORE INTO counters VALUES('revision_comida',1);
  UPDATE schema_version SET version=15;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw Error("Upgrade FK validation failed.");
}
