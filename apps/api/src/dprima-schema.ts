import type { Database } from "bun:sqlite";

/**
 * SPEC33 D′ — schema 20 (19 → 20).
 *
 * Additive migration inside the existing opening IMMEDIATE transaction. It adds:
 *  - optional root/daughters hierarchy and execution source to Partidas,
 *    independent from Categoría/Subcategoría and preserving the legacy
 *    `presupuesto` relation untouched;
 *  - Gastos Previstos (forecast) headers and lines, with no economic fact;
 *  - the monthly plan by root, preserving Base/Esencial/Del mes and destination;
 *  - opening previews/confirmations with E1 partial totals and E2 source rule;
 *  - an explicit Presupuestos → Partidas mapping registry, never automatic.
 *
 * No row is migrated, no Presupuesto is renamed and no annual line is converted.
 * The legacy Presupuestos/Plan Anual remain consultable.
 */
export function dprimaSchema(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 19)
    throw new Error("Esquema previo inesperado para migración D′ v20.");

  db.exec(`
  ALTER TABLE partidas ADD COLUMN padre_partida TEXT REFERENCES partidas(id) ON DELETE RESTRICT;
  ALTER TABLE partidas ADD COLUMN fuente TEXT CHECK(fuente IS NULL OR fuente IN ('Gasto real','Aportación a saldo','No aplica'));
  CREATE INDEX partidas_padre_partida ON partidas(padre_partida);

  CREATE TRIGGER partida_dprima_parent_root BEFORE INSERT ON partidas
    WHEN NEW.padre_partida IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM partidas p WHERE p.id=NEW.padre_partida AND p.padre_partida IS NULL
    ) BEGIN SELECT RAISE(ABORT,'dprima parent must be a root'); END;
  CREATE TRIGGER partida_dprima_parent_update BEFORE UPDATE OF padre_partida ON partidas
    WHEN NEW.padre_partida IS NOT NULL AND (
      NEW.padre_partida=NEW.id OR NOT EXISTS(
        SELECT 1 FROM partidas p WHERE p.id=NEW.padre_partida AND p.padre_partida IS NULL
      )
    ) BEGIN SELECT RAISE(ABORT,'dprima parent must be a root'); END;
  CREATE TRIGGER movimiento_partida_root_group BEFORE INSERT ON movimientos
    WHEN NEW.tipo='Gasto' AND EXISTS(
      SELECT 1 FROM partidas p WHERE p.id=NEW.partida AND p.padre_partida IS NULL
    ) AND EXISTS(
      SELECT 1 FROM partidas h WHERE h.padre_partida=NEW.partida
    ) BEGIN SELECT RAISE(ABORT,'dprima grouped root does not accept new Gasto'); END;
  CREATE TRIGGER movimiento_partida_root_group_update BEFORE UPDATE OF partida ON movimientos
    WHEN NEW.tipo='Gasto' AND NEW.partida IS NOT OLD.partida AND EXISTS(
      SELECT 1 FROM partidas p WHERE p.id=NEW.partida AND p.padre_partida IS NULL
    ) AND EXISTS(
      SELECT 1 FROM partidas h WHERE h.padre_partida=NEW.partida
    ) BEGIN SELECT RAISE(ABORT,'dprima grouped root does not accept new Gasto'); END;

  CREATE TABLE dprima_planificaciones(
    id TEXT PRIMARY KEY CHECK(id GLOB 'DP[0-9]*' AND substr(id,3) NOT GLOB '*[^0-9]*' AND length(id)>=5),
    padre TEXT NOT NULL REFERENCES partidas(id) ON DELETE RESTRICT,
    saldo TEXT NOT NULL REFERENCES saldos(id) ON DELETE RESTRICT,
    mes_inicial TEXT NOT NULL CHECK(length(mes_inicial)=10 AND mes_inicial GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-01'),
    mes_final TEXT NOT NULL CHECK(length(mes_final)=10 AND mes_final GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-01'),
    saldo_inicial INTEGER NOT NULL,
    saldo_evidencia TEXT NOT NULL CHECK(length(trim(saldo_evidencia)) BETWEEN 1 AND 500),
    estado TEXT NOT NULL CHECK(estado IN ('Borrador','Activa','Finalizada')),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL,
    actualizado TEXT NOT NULL,
    CHECK(mes_inicial<=mes_final)
  ) STRICT;
  CREATE INDEX dprima_planificaciones_padre ON dprima_planificaciones(padre);
  CREATE TRIGGER dprima_planificacion_root BEFORE INSERT ON dprima_planificaciones
    WHEN NOT EXISTS(SELECT 1 FROM partidas p WHERE p.id=NEW.padre AND p.padre_partida IS NULL)
    BEGIN SELECT RAISE(ABORT,'forecast requires a root'); END;
  CREATE TRIGGER dprima_planificacion_overlap BEFORE INSERT ON dprima_planificaciones
    WHEN EXISTS(SELECT 1 FROM dprima_planificaciones p
      WHERE p.padre=NEW.padre AND NEW.mes_inicial<=p.mes_final AND p.mes_inicial<=NEW.mes_final)
    BEGIN SELECT RAISE(ABORT,'overlapping forecast'); END;
  CREATE TRIGGER dprima_planificacion_overlap_update BEFORE UPDATE OF padre,mes_inicial,mes_final ON dprima_planificaciones
    WHEN EXISTS(SELECT 1 FROM dprima_planificaciones p
      WHERE p.id<>OLD.id AND p.padre=NEW.padre AND NEW.mes_inicial<=p.mes_final AND p.mes_inicial<=NEW.mes_final)
    BEGIN SELECT RAISE(ABORT,'overlapping forecast'); END;
  CREATE TRIGGER dprima_planificacion_id_immutable BEFORE UPDATE OF id ON dprima_planificaciones
    WHEN NEW.id<>OLD.id BEGIN SELECT RAISE(ABORT,'immutable id'); END;
  CREATE TRIGGER dprima_planificacion_no_delete BEFORE DELETE ON dprima_planificaciones
    BEGIN SELECT RAISE(ABORT,'no delete'); END;

  CREATE TABLE dprima_lineas(
    id TEXT PRIMARY KEY CHECK(id GLOB 'LP[0-9]*' AND substr(id,3) NOT GLOB '*[^0-9]*' AND length(id)>=5),
    planificacion TEXT NOT NULL REFERENCES dprima_planificaciones(id) ON DELETE RESTRICT,
    hija TEXT NOT NULL REFERENCES partidas(id) ON DELETE RESTRICT,
    importe INTEGER CHECK(importe IS NULL OR importe>=0),
    fecha TEXT CHECK(fecha IS NULL OR (length(fecha)=10 AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha)=fecha)),
    esencial INTEGER NOT NULL CHECK(esencial IN (0,1)),
    anulada INTEGER NOT NULL DEFAULT 0 CHECK(anulada IN (0,1)),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL,
    actualizado TEXT NOT NULL
  ) STRICT;
  CREATE INDEX dprima_lineas_planificacion ON dprima_lineas(planificacion);
  CREATE TRIGGER dprima_linea_hija BEFORE INSERT ON dprima_lineas
    WHEN NOT EXISTS(
      SELECT 1 FROM partidas h JOIN dprima_planificaciones p ON p.id=NEW.planificacion
      WHERE h.id=NEW.hija AND (h.padre_partida=p.padre OR h.id=p.padre)
        AND p.estado<>'Finalizada'
    ) BEGIN SELECT RAISE(ABORT,'line must use an active daughter'); END;
  CREATE TRIGGER dprima_linea_hija_update BEFORE UPDATE OF hija,planificacion ON dprima_lineas
    WHEN NOT EXISTS(
      SELECT 1 FROM partidas h JOIN dprima_planificaciones p ON p.id=NEW.planificacion
      WHERE h.id=NEW.hija AND (h.padre_partida=p.padre OR h.id=p.padre)
        AND p.estado<>'Finalizada'
    ) BEGIN SELECT RAISE(ABORT,'line must use an active daughter'); END;
  CREATE TRIGGER dprima_linea_id_immutable BEFORE UPDATE OF id ON dprima_lineas
    WHEN NEW.id<>OLD.id BEGIN SELECT RAISE(ABORT,'immutable id'); END;
  CREATE TRIGGER dprima_linea_no_delete BEFORE DELETE ON dprima_lineas
    BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TRIGGER partida_dprima_inactive_used BEFORE UPDATE OF estado ON partidas
    WHEN NEW.estado='Inactiva' AND NEW.estado IS NOT OLD.estado AND (
      EXISTS(SELECT 1 FROM dprima_lineas l JOIN dprima_planificaciones p ON p.id=l.planificacion
        WHERE l.hija=OLD.id AND l.anulada=0 AND p.estado<>'Finalizada')
      OR EXISTS(SELECT 1 FROM dprima_plan_mensual m WHERE m.raiz=OLD.id)
      OR EXISTS(SELECT 1 FROM dprima_planificaciones p WHERE p.padre=OLD.id AND p.estado<>'Finalizada')
    ) BEGIN SELECT RAISE(ABORT,'dprima used daughter cannot be deactivated'); END;

  CREATE TABLE dprima_plan_mensual(
    ciclo TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
    raiz TEXT NOT NULL REFERENCES partidas(id) ON DELETE RESTRICT,
    fuente TEXT NOT NULL CHECK(fuente IN ('Gasto real','Aportación a saldo','No aplica')),
    destino TEXT REFERENCES saldos(id) ON DELETE RESTRICT,
    base INTEGER CHECK(base IS NULL OR base>=0),
    esencial INTEGER CHECK(esencial IS NULL OR esencial>=0),
    del_mes INTEGER CHECK(del_mes IS NULL OR del_mes>=0),
    corte_sugerencia TEXT,
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL,
    actualizado TEXT NOT NULL,
    PRIMARY KEY(ciclo,raiz)
  ) STRICT;
  CREATE TRIGGER dprima_mensual_root BEFORE INSERT ON dprima_plan_mensual
    WHEN NOT EXISTS(SELECT 1 FROM partidas p WHERE p.id=NEW.raiz AND p.padre_partida IS NULL)
    BEGIN SELECT RAISE(ABORT,'monthly line requires a root'); END;
  CREATE TRIGGER dprima_mensual_destination BEFORE INSERT ON dprima_plan_mensual
    WHEN NEW.fuente='Aportación a saldo' AND NEW.destino IS NULL
    BEGIN SELECT RAISE(ABORT,'destination required'); END;
  CREATE TRIGGER partida_dprima_parent_used BEFORE UPDATE OF padre_partida ON partidas
    WHEN NEW.padre_partida IS NOT OLD.padre_partida AND (
      EXISTS(SELECT 1 FROM movimientos WHERE partida=OLD.id)
      OR EXISTS(SELECT 1 FROM dprima_lineas WHERE hija=OLD.id)
      OR EXISTS(SELECT 1 FROM dprima_plan_mensual WHERE raiz=OLD.id)
    ) BEGIN SELECT RAISE(ABORT,'dprima reparent of used partida'); END;
  CREATE TRIGGER partida_dprima_fuente_used BEFORE UPDATE OF fuente ON partidas
    WHEN NEW.fuente IS NOT OLD.fuente AND EXISTS(
      SELECT 1 FROM dprima_plan_mensual WHERE raiz=OLD.id
    ) BEGIN SELECT RAISE(ABORT,'dprima source of used partida'); END;

  CREATE TABLE dprima_aperturas(
    id TEXT PRIMARY KEY CHECK(id GLOB 'AP[0-9]*' AND substr(id,3) NOT GLOB '*[^0-9]*' AND length(id)>=5),
    planificacion TEXT NOT NULL REFERENCES dprima_planificaciones(id) ON DELETE RESTRICT,
    ciclo TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
    total INTEGER,
    gasto_neto INTEGER,
    saldo INTEGER,
    pendiente INTEGER,
    restantes INTEGER CHECK(restantes IS NULL OR restantes>0),
    sugerida INTEGER,
    importe INTEGER,
    fuente TEXT NOT NULL CHECK(fuente IN ('Gasto real','Aportación a saldo','No aplica')),
    corte TEXT NOT NULL,
    huella TEXT NOT NULL,
    confirmado TEXT NOT NULL,
    creado TEXT NOT NULL,
    UNIQUE(planificacion,ciclo)
  ) STRICT;
  CREATE TRIGGER dprima_apertura_no_delete BEFORE DELETE ON dprima_aperturas
    BEGIN SELECT RAISE(ABORT,'no delete'); END;

  CREATE TABLE dprima_exclusiones(
    id INTEGER PRIMARY KEY,
    apertura TEXT NOT NULL REFERENCES dprima_aperturas(id),
    linea TEXT NOT NULL REFERENCES dprima_lineas(id),
    motivo TEXT NOT NULL CHECK(length(trim(motivo))>0),
    instante TEXT NOT NULL,
    actor TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER dprima_exclusion_no_update BEFORE UPDATE ON dprima_exclusiones
    BEGIN SELECT RAISE(ABORT,'immutable exclusion'); END;
  CREATE TRIGGER dprima_exclusion_no_delete BEFORE DELETE ON dprima_exclusiones
    BEGIN SELECT RAISE(ABORT,'immutable exclusion'); END;

  CREATE TABLE dprima_mapping(
    id INTEGER PRIMARY KEY,
    presupuesto TEXT REFERENCES presupuestos(id) ON DELETE RESTRICT,
    partida TEXT REFERENCES partidas(id) ON DELETE RESTRICT,
    relacion TEXT NOT NULL CHECK(relacion IN ('Raíz','Hija','Presupuesto sin Partida','Partida sin planificación')),
    motivo TEXT NOT NULL CHECK(length(trim(motivo))>0),
    evidencia TEXT,
    estado TEXT NOT NULL CHECK(estado IN ('Propuesta','Confirmada')),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL,
    actualizado TEXT NOT NULL,
    CHECK((relacion IN ('Presupuesto sin Partida','Partida sin planificación')) OR partida IS NOT NULL)
  ) STRICT;
  CREATE TRIGGER dprima_mapping_no_delete BEFORE DELETE ON dprima_mapping
    BEGIN SELECT RAISE(ABORT,'no delete'); END;

  CREATE TABLE dprima_planificacion_audit(
    id INTEGER PRIMARY KEY,
    planificacion TEXT NOT NULL REFERENCES dprima_planificaciones(id),
    accion TEXT NOT NULL,
    revision INTEGER NOT NULL,
    anterior TEXT,
    posterior TEXT NOT NULL,
    motivo TEXT,
    instante TEXT NOT NULL,
    actor TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER dprima_planificacion_audit_no_update BEFORE UPDATE ON dprima_planificacion_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER dprima_planificacion_audit_no_delete BEFORE DELETE ON dprima_planificacion_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TABLE dprima_linea_audit(
    id INTEGER PRIMARY KEY,
    linea TEXT NOT NULL REFERENCES dprima_lineas(id),
    accion TEXT NOT NULL,
    revision INTEGER NOT NULL,
    anterior TEXT,
    posterior TEXT NOT NULL,
    motivo TEXT,
    instante TEXT NOT NULL,
    actor TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER dprima_linea_audit_no_update BEFORE UPDATE ON dprima_linea_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER dprima_linea_audit_no_delete BEFORE DELETE ON dprima_linea_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TABLE dprima_apertura_audit(
    id INTEGER PRIMARY KEY,
    apertura TEXT NOT NULL REFERENCES dprima_aperturas(id),
    accion TEXT NOT NULL,
    anterior TEXT,
    posterior TEXT NOT NULL,
    motivo TEXT,
    instante TEXT NOT NULL,
    actor TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER dprima_apertura_audit_no_update BEFORE UPDATE ON dprima_apertura_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER dprima_apertura_audit_no_delete BEFORE DELETE ON dprima_apertura_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TABLE dprima_mapping_audit(
    id INTEGER PRIMARY KEY,
    mapping INTEGER NOT NULL REFERENCES dprima_mapping(id),
    accion TEXT NOT NULL,
    anterior TEXT,
    posterior TEXT NOT NULL,
    motivo TEXT,
    instante TEXT NOT NULL,
    actor TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER dprima_mapping_audit_no_update BEFORE UPDATE ON dprima_mapping_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER dprima_mapping_audit_no_delete BEFORE DELETE ON dprima_mapping_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;

  CREATE TABLE dprima_planificacion_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  CREATE TABLE dprima_linea_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  CREATE TABLE dprima_apertura_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  CREATE TABLE dprima_mapping_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  CREATE TABLE dprima_partida_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  CREATE TABLE dprima_mensual_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;

  INSERT INTO counters VALUES('dprima_planificacion',1);
  INSERT INTO counters VALUES('dprima_linea',1);
  INSERT INTO counters VALUES('dprima_apertura',1);
  UPDATE schema_version SET version=20;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error("D′ schema FK validation failed.");
}
