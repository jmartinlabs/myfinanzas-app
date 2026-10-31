import type { Database } from "bun:sqlite";

/**
 * COMIDA-UNICO-01 — schema 19 (18 → 19).
 *
 * Runs only inside the existing opening IMMEDIATE transaction. It:
 *  - rebuilds `movimientos` to admit the approved `Devolución de gasto` type,
 *    preserving identity, columns, rows, indexes, triggers and every dependent
 *    table/audit verbatim;
 *  - adds COMIDA metadata per central Movement (analytical label, bank/commercial
 *    evidence, review state) without a second editable amount or date;
 *  - adds the optional, integral (never partially allocated) purchase attribution
 *    of a Devolución de gasto;
 *  - adds the explicit analytical role of a Transferencia (financiación,
 *    reposición, devolución de Anticipo) so no role is inferred by name;
 *  - adds the historical, audited dated regime of the ING Comida Saldo.
 *
 * No real data, no C/B values and no activation are installed by the upgrade.
 * Legacy `revision_comida` rows are preserved untouched.
 */
export function comidaSchema(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 18)
    throw new Error("Esquema previo inesperado para migración COMIDA v19.");

  const dependents = [
    "movimientos",
    "movement_audit",
    "movimiento_anticipo",
    "payroll_allocations",
    "revision_comida",
    "revision_comida_audit",
    "movimiento_compartido",
  ];
  const placeholders = dependents.map(() => "?").join(",");
  const objects = db
    .query(
      `SELECT type,name,tbl_name,sql FROM sqlite_master WHERE tbl_name IN (${placeholders}) AND sql IS NOT NULL`,
    )
    .all(...dependents) as {
    type: string;
    name: string;
    tbl_name: string;
    sql: string;
  }[];
  for (const table of dependents) {
    if (!objects.find((o) => o.type === "table" && o.name === table)?.sql)
      throw new Error("Esquema previo incompleto para migración COMIDA v19.");
    db.exec(`CREATE TEMP TABLE saved_v19_${table} AS SELECT * FROM ${table}`);
  }
  for (const o of objects)
    if (o.type === "trigger") db.exec(`DROP TRIGGER "${o.name}"`);
  for (const o of objects)
    if (o.type === "index") db.exec(`DROP INDEX "${o.name}"`);
  for (const table of [...dependents].reverse()) db.exec(`DROP TABLE ${table}`);

  for (const table of dependents) {
    let sql = objects.find((o) => o.type === "table" && o.name === table)!.sql;
    if (table === "movimientos") {
      // The admitted v18 contract has one canonical shape, but historical D5
      // fixtures preserve an older Exterior variant. Both must keep upgrading:
      // only extend the type list and append the new OR branch.
      let next = sql.replace(
        /tipo IN \('Ingreso','Gasto','Transferencia','Amortización deuda'\)/,
        "tipo IN ('Ingreso','Gasto','Transferencia','Amortización deuda','Devolución de gasto')",
      );
      const transfer = next.match(/\(tipo='Transferencia'[^)]*\)/);
      if (!transfer || next.includes("tipo='Devolución de gasto'"))
        throw new Error("Restricción de Movimientos inesperada para COMIDA v19.");
      next = next.replace(
        transfer[0],
        `${transfer[0]}\n        OR (tipo='Devolución de gasto' AND origen='S000' AND destino!='S000' AND subtipo IS NULL AND capital IS NULL AND intereses IS NULL)`,
      );
      if (next === sql)
        throw new Error("Restricción de Movimientos inesperada para COMIDA v19.");
      sql = next;
    }
    db.exec(sql);
    db.exec(
      `INSERT INTO ${table} SELECT * FROM saved_v19_${table}; DROP TABLE saved_v19_${table}`,
    );
  }
  for (const o of objects) if (o.type !== "table") db.exec(o.sql);

  db.exec(`
  CREATE TABLE movimiento_revision_comida(
    movimiento TEXT PRIMARY KEY REFERENCES movimientos(id) ON DELETE RESTRICT,
    etiqueta TEXT CHECK(etiqueta IS NULL OR etiqueta IN ('Comida','Pendiente revisar','Ocio','Niños','Otros','Fuera presupuesto')),
    evidencia_bancaria TEXT CHECK(evidencia_bancaria IS NULL OR length(trim(evidencia_bancaria)) BETWEEN 1 AND 500),
    evidencia_comercial TEXT CHECK(evidencia_comercial IS NULL OR length(trim(evidencia_comercial)) BETWEEN 1 AND 500),
    estado_revision TEXT NOT NULL CHECK(estado_revision IN ('Pendiente revisar','Revisada')),
    revision_movimiento INTEGER NOT NULL CHECK(revision_movimiento>0),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL,
    actualizado TEXT NOT NULL
  ) STRICT;
  CREATE INDEX movimiento_revision_comida_etiqueta ON movimiento_revision_comida(etiqueta);
  CREATE TRIGGER movimiento_revision_comida_shape BEFORE INSERT ON movimiento_revision_comida
    WHEN NOT EXISTS(
      SELECT 1 FROM movimientos m
      WHERE m.id=NEW.movimiento AND m.anulado=0
        AND m.tipo IN ('Gasto','Devolución de gasto')
    ) BEGIN SELECT RAISE(ABORT,'invalid comida movement'); END;
  CREATE TRIGGER movimiento_revision_comida_update_shape BEFORE UPDATE ON movimiento_revision_comida
    WHEN NOT EXISTS(
      SELECT 1 FROM movimientos m
      WHERE m.id=NEW.movimiento AND m.anulado=0
        AND m.tipo IN ('Gasto','Devolución de gasto')
    ) BEGIN SELECT RAISE(ABORT,'invalid comida movement'); END;
  CREATE TRIGGER movimiento_revision_comida_id_immutable BEFORE UPDATE OF movimiento ON movimiento_revision_comida
    WHEN NEW.movimiento!=OLD.movimiento BEGIN SELECT RAISE(ABORT,'immutable id'); END;
  CREATE TRIGGER movimiento_revision_comida_no_delete BEFORE DELETE ON movimiento_revision_comida
    BEGIN SELECT RAISE(ABORT,'no delete'); END;

  CREATE TABLE movimiento_revision_comida_audit(
    id INTEGER PRIMARY KEY,
    movimiento TEXT NOT NULL REFERENCES movimiento_revision_comida(movimiento),
    accion TEXT NOT NULL CHECK(accion IN ('alta','rectificación')),
    revision INTEGER NOT NULL,
    anterior TEXT,
    posterior TEXT NOT NULL,
    motivo TEXT,
    instante TEXT NOT NULL,
    actor TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER movimiento_revision_comida_audit_no_update BEFORE UPDATE ON movimiento_revision_comida_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER movimiento_revision_comida_audit_no_delete BEFORE DELETE ON movimiento_revision_comida_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;

  CREATE TABLE movimiento_devolucion(
    movimiento TEXT PRIMARY KEY REFERENCES movimientos(id) ON DELETE RESTRICT,
    compra TEXT REFERENCES movimientos(id) ON DELETE RESTRICT,
    partida TEXT REFERENCES partidas(id) ON DELETE RESTRICT,
    ciclo_origen TEXT REFERENCES ciclos(id) ON DELETE RESTRICT,
    evidencia_relacion TEXT CHECK(evidencia_relacion IS NULL OR length(trim(evidencia_relacion)) BETWEEN 1 AND 500),
    evidencia_origen_temporal TEXT CHECK(evidencia_origen_temporal IS NULL OR length(trim(evidencia_origen_temporal)) BETWEEN 1 AND 500),
    elegibilidad TEXT NOT NULL CHECK(elegibilidad IN ('Acreditada','No acreditada')),
    estado TEXT NOT NULL CHECK(estado IN ('Sin vínculo','Verificado','Revisar')),
    revision_movimiento INTEGER NOT NULL CHECK(revision_movimiento>0),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL,
    actualizado TEXT NOT NULL,
    CHECK(compra IS NULL OR compra<>movimiento),
    CHECK((estado='Sin vínculo' AND compra IS NULL AND evidencia_relacion IS NULL AND evidencia_origen_temporal IS NULL AND partida IS NULL AND ciclo_origen IS NULL)
      OR (estado='Verificado' AND compra IS NOT NULL AND length(trim(evidencia_relacion))>0)
      OR (estado='Revisar' AND (compra IS NOT NULL OR evidencia_relacion IS NOT NULL OR evidencia_origen_temporal IS NOT NULL OR partida IS NOT NULL OR ciclo_origen IS NOT NULL)))
    ,CHECK(elegibilidad<>'Acreditada' OR (length(trim(evidencia_origen_temporal))>0 AND ciclo_origen IS NOT NULL AND (partida IS NOT NULL OR compra IS NOT NULL)))
  ) STRICT;
  CREATE INDEX movimiento_devolucion_compra ON movimiento_devolucion(compra);
  CREATE INDEX movimiento_devolucion_ciclo ON movimiento_devolucion(ciclo_origen);
  CREATE INDEX movimiento_devolucion_partida ON movimiento_devolucion(partida);
  CREATE TRIGGER movimiento_devolucion_shape BEFORE INSERT ON movimiento_devolucion
    WHEN NOT EXISTS(
      SELECT 1 FROM movimientos m
      WHERE m.id=NEW.movimiento AND m.anulado=0 AND m.tipo='Devolución de gasto'
    ) BEGIN SELECT RAISE(ABORT,'invalid devolution movement'); END;
  CREATE TRIGGER movimiento_devolucion_update_shape BEFORE UPDATE ON movimiento_devolucion
    WHEN NOT EXISTS(
      SELECT 1 FROM movimientos m
      WHERE m.id=NEW.movimiento AND m.anulado=0 AND m.tipo='Devolución de gasto'
    ) BEGIN SELECT RAISE(ABORT,'invalid devolution movement'); END;
  CREATE TRIGGER movimiento_devolucion_purchase BEFORE INSERT ON movimiento_devolucion
    WHEN NEW.compra IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM movimientos c JOIN saldos s ON s.id=c.origen
      WHERE c.id=NEW.compra AND c.anulado=0 AND c.tipo='Gasto'
        AND s.control<>'Terminal'
    ) BEGIN SELECT RAISE(ABORT,'invalid purchase attribution'); END;
  CREATE TRIGGER movimiento_devolucion_update_purchase BEFORE UPDATE ON movimiento_devolucion
    WHEN NEW.compra IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM movimientos c JOIN saldos s ON s.id=c.origen
      WHERE c.id=NEW.compra AND c.tipo='Gasto'
        AND s.control<>'Terminal'
    ) BEGIN SELECT RAISE(ABORT,'invalid purchase attribution'); END;
  CREATE TRIGGER movimiento_devolucion_integrity BEFORE INSERT ON movimiento_devolucion
    WHEN NEW.estado='Verificado' AND NEW.compra IS NOT NULL AND (
      SELECT COALESCE(SUM(d.dev_importe),0) FROM (
        SELECT m.importe dev_importe FROM movimiento_devolucion x
          JOIN movimientos m ON m.id=x.movimiento
        WHERE x.compra=NEW.compra AND x.estado='Verificado' AND x.movimiento<>NEW.movimiento AND m.anulado=0
      ) d
    ) + (SELECT importe FROM movimientos WHERE id=NEW.movimiento) >
      (SELECT importe FROM movimientos WHERE id=NEW.compra)
    BEGIN SELECT RAISE(ABORT,'devolution exceeds purchase'); END;
  CREATE TRIGGER movimiento_devolucion_update_integrity BEFORE UPDATE ON movimiento_devolucion
    WHEN NEW.estado='Verificado' AND NEW.compra IS NOT NULL AND (
      SELECT COALESCE(SUM(d.dev_importe),0) FROM (
        SELECT m.importe dev_importe FROM movimiento_devolucion x
          JOIN movimientos m ON m.id=x.movimiento
        WHERE x.compra=NEW.compra AND x.estado='Verificado' AND x.movimiento<>NEW.movimiento AND m.anulado=0
      ) d
    ) + (SELECT importe FROM movimientos WHERE id=NEW.movimiento) >
      (SELECT importe FROM movimientos WHERE id=NEW.compra)
    BEGIN SELECT RAISE(ABORT,'devolution exceeds purchase'); END;
  CREATE TRIGGER movimiento_devolucion_id_immutable BEFORE UPDATE OF movimiento ON movimiento_devolucion
    WHEN NEW.movimiento!=OLD.movimiento BEGIN SELECT RAISE(ABORT,'immutable id'); END;
  CREATE TRIGGER movimiento_devolucion_no_delete BEFORE DELETE ON movimiento_devolucion
    BEGIN SELECT RAISE(ABORT,'no delete'); END;

  CREATE TABLE movimiento_devolucion_audit(
    id INTEGER PRIMARY KEY,
    movimiento TEXT NOT NULL REFERENCES movimiento_devolucion(movimiento),
    accion TEXT NOT NULL CHECK(accion IN ('alta','rectificación')),
    revision INTEGER NOT NULL,
    anterior TEXT,
    posterior TEXT NOT NULL,
    motivo TEXT,
    instante TEXT NOT NULL,
    actor TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER movimiento_devolucion_audit_no_update BEFORE UPDATE ON movimiento_devolucion_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER movimiento_devolucion_audit_no_delete BEFORE DELETE ON movimiento_devolucion_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;

  CREATE TABLE movimiento_rol_financiacion(
    movimiento TEXT PRIMARY KEY REFERENCES movimientos(id) ON DELETE RESTRICT,
    rol TEXT NOT NULL CHECK(rol IN ('Financiación','Reposición','Devolución Anticipo')),
    obligacion_ciclo TEXT REFERENCES ciclos(id) ON DELETE RESTRICT,
    evidencia TEXT NOT NULL CHECK(length(trim(evidencia)) BETWEEN 1 AND 500),
    revision_movimiento INTEGER NOT NULL CHECK(revision_movimiento>0),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL,
    actualizado TEXT NOT NULL,
    CHECK(rol<>'Reposición' OR obligacion_ciclo IS NOT NULL)
  ) STRICT;
  CREATE INDEX movimiento_rol_financiacion_rol ON movimiento_rol_financiacion(rol,obligacion_ciclo);
  CREATE TRIGGER movimiento_rol_financiacion_shape BEFORE INSERT ON movimiento_rol_financiacion
    WHEN NOT EXISTS(
      SELECT 1 FROM movimientos m WHERE m.id=NEW.movimiento AND m.anulado=0
        AND m.tipo IN ('Transferencia','Amortización deuda')
    ) BEGIN SELECT RAISE(ABORT,'invalid financing role'); END;
  CREATE TRIGGER movimiento_rol_financiacion_no_delete BEFORE DELETE ON movimiento_rol_financiacion
    BEGIN SELECT RAISE(ABORT,'no delete'); END;

  CREATE TABLE movimiento_rol_financiacion_audit(
    id INTEGER PRIMARY KEY,
    movimiento TEXT NOT NULL REFERENCES movimiento_rol_financiacion(movimiento),
    accion TEXT NOT NULL CHECK(accion IN ('alta','rectificación','anulación')),
    revision INTEGER NOT NULL,
    anterior TEXT,
    posterior TEXT NOT NULL,
    motivo TEXT,
    instante TEXT NOT NULL,
    actor TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER movimiento_rol_financiacion_audit_no_update BEFORE UPDATE ON movimiento_rol_financiacion_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER movimiento_rol_financiacion_audit_no_delete BEFORE DELETE ON movimiento_rol_financiacion_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;

  CREATE TABLE regimen_comida(
    saldo TEXT PRIMARY KEY REFERENCES saldos(id) ON DELETE RESTRICT,
    ciclo_corte TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
    apertura INTEGER NOT NULL,
    evidencia TEXT NOT NULL CHECK(length(trim(evidencia)) BETWEEN 1 AND 500),
    cobertura TEXT NOT NULL CHECK(cobertura IN ('Verificable','Parcial')),
    estado TEXT NOT NULL CHECK(estado IN ('Preparado','Activo','Suspendido')),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL,
    actualizado TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER regimen_comida_saldo_immutable BEFORE UPDATE OF saldo ON regimen_comida
    WHEN NEW.saldo!=OLD.saldo BEGIN SELECT RAISE(ABORT,'immutable id'); END;
  CREATE TRIGGER regimen_comida_no_delete BEFORE DELETE ON regimen_comida
    BEGIN SELECT RAISE(ABORT,'no delete'); END;

  CREATE TABLE regimen_comida_audit(
    id INTEGER PRIMARY KEY,
    saldo TEXT NOT NULL REFERENCES regimen_comida(saldo),
    accion TEXT NOT NULL CHECK(accion IN ('preparación','activación','suspensión')),
    revision INTEGER NOT NULL,
    anterior TEXT,
    posterior TEXT NOT NULL,
    motivo TEXT NOT NULL,
    instante TEXT NOT NULL,
    actor TEXT NOT NULL
  ) STRICT;
  CREATE TRIGGER regimen_comida_audit_no_update BEFORE UPDATE ON regimen_comida_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
  CREATE TRIGGER regimen_comida_audit_no_delete BEFORE DELETE ON regimen_comida_audit
    BEGIN SELECT RAISE(ABORT,'immutable audit'); END;

  CREATE TABLE comida_metadata_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  CREATE TABLE comida_devolucion_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  CREATE TABLE comida_rol_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
  CREATE TABLE comida_regimen_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;

  UPDATE schema_version SET version=19;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error("COMIDA schema FK validation failed.");
}
