import type { Database } from "bun:sqlite";

/**
 * v16 → v17 (D5/Exterior). Runs inside the existing opening IMMEDIATE
 * transaction. Rebuilds Movimientos and every direct dependent to relax only the
 * Transfer shape S000 → internal Saldo; CAT013, ficha, participant and
 * accreditation remain service rules. Adds the 0..1 accreditation metadata table
 * without copying amount, date, Origen, Destino or Referencia. No reseed,
 * backfill or historical classification.
 */
export function compartidoAportacionSchema(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 16)
    throw new Error("Esquema previo inesperado para migración D5 v17.");

  // Children first. revision_comida_audit depends on revision_comida, which in
  // turn references movimientos; payroll/anticipo/audit are direct dependants.
  const tables = [
    "movimientos",
    "movement_audit",
    "movimiento_anticipo",
    "payroll_allocations",
    "revision_comida",
    "revision_comida_audit",
  ];
  const placeholders = tables.map(() => "?").join(",");
  const objects = db
    .query(
      `SELECT type,name,tbl_name,sql FROM sqlite_master WHERE tbl_name IN (${placeholders}) AND sql IS NOT NULL`,
    )
    .all(...tables) as {
    type: string;
    name: string;
    tbl_name: string;
    sql: string;
  }[];

  for (const table of tables) {
    if (!objects.find((o) => o.type === "table" && o.name === table)?.sql)
      throw new Error("Esquema previo incompleto para migración D5 v17.");
    db.exec(`CREATE TEMP TABLE saved_v17_${table} AS SELECT * FROM ${table}`);
  }
  for (const o of objects)
    if (o.type === "trigger") db.exec(`DROP TRIGGER "${o.name}"`);
  for (const o of objects)
    if (o.type === "index") db.exec(`DROP INDEX "${o.name}"`);
  for (const table of [...tables].reverse()) db.exec(`DROP TABLE ${table}`);

  for (const table of tables) {
    let sql = objects.find((o) => o.type === "table" && o.name === table)!.sql;
    if (table === "movimientos") {
      const next = sql.replace(
        "(tipo='Transferencia' AND origen!='S000' AND destino!='S000' AND origen!=destino AND partida IS NULL AND subtipo IS NULL)",
        "(tipo='Transferencia' AND destino!='S000' AND origen!=destino AND partida IS NULL AND subtipo IS NULL)",
      );
      const transfer = sql.match(/\(tipo='Transferencia'[^)]*\)/)?.[0] ?? "";
      if (next === sql && transfer.includes("origen!='S000'"))
        throw new Error("Restricción de Movimientos inesperada para D5.");
      sql = next;
    }
    db.exec(sql);
    db.exec(
      `INSERT INTO ${table} SELECT * FROM saved_v17_${table}; DROP TABLE saved_v17_${table}`,
    );
  }
  for (const o of objects) if (o.type !== "table") db.exec(o.sql);

  db.exec(`CREATE TABLE movimiento_compartido(
    movimiento TEXT PRIMARY KEY REFERENCES movimientos(id) ON DELETE RESTRICT,
    referencia TEXT NOT NULL REFERENCES fichas_compartidos(referencia) ON DELETE RESTRICT,
    participante TEXT NOT NULL REFERENCES participantes_compartido(id) ON DELETE RESTRICT,
    evidencia TEXT NOT NULL CHECK(length(trim(evidencia)) BETWEEN 10 AND 500),
    procedencia TEXT NOT NULL CHECK(procedencia IN ('Registro del titular','Documento bancario','Importación histórica autorizada')),
    revision_movimiento INTEGER NOT NULL CHECK(revision_movimiento>0),
    revision INTEGER NOT NULL CHECK(revision>0),
    creado TEXT NOT NULL, actualizado TEXT NOT NULL
  ) STRICT;
  CREATE INDEX movimiento_compartido_referencia ON movimiento_compartido(referencia);
  CREATE INDEX movimiento_compartido_participante ON movimiento_compartido(participante);
  CREATE TRIGGER movimiento_compartido_id_immutable BEFORE UPDATE OF movimiento ON movimiento_compartido
    WHEN NEW.movimiento!=OLD.movimiento BEGIN SELECT RAISE(ABORT,'immutable id'); END;
  CREATE TRIGGER movimiento_compartido_no_delete BEFORE DELETE ON movimiento_compartido
    BEGIN SELECT RAISE(ABORT,'no delete'); END;
  CREATE TRIGGER movimiento_compartido_shape BEFORE INSERT ON movimiento_compartido
    WHEN NOT EXISTS(
      SELECT 1 FROM movimientos m JOIN referencias r ON r.id=m.referencia
      WHERE m.id=NEW.movimiento AND m.tipo='Transferencia' AND m.origen='S000'
        AND m.destino!='S000' AND m.anulado=0 AND m.referencia=NEW.referencia
        AND r.tipo='Gasto compartido'
    ) BEGIN SELECT RAISE(ABORT,'invalid D5 movement'); END;
  CREATE TRIGGER movimiento_compartido_participant BEFORE INSERT ON movimiento_compartido
    WHEN NOT EXISTS(
      SELECT 1 FROM participantes_compartido p
      WHERE p.id=NEW.participante AND p.referencia=NEW.referencia
        AND p.rol='Tercero' AND p.estado='Activa'
    ) BEGIN SELECT RAISE(ABORT,'participant mismatch'); END;
  CREATE TRIGGER movimiento_compartido_update_shape BEFORE UPDATE ON movimiento_compartido
    WHEN NOT EXISTS(
      SELECT 1 FROM movimientos m JOIN referencias r ON r.id=m.referencia
      WHERE m.id=NEW.movimiento AND m.tipo='Transferencia' AND m.origen='S000'
        AND m.destino!='S000' AND m.anulado=0 AND m.referencia=NEW.referencia
        AND r.tipo='Gasto compartido'
    ) BEGIN SELECT RAISE(ABORT,'invalid D5 movement'); END;
  CREATE TRIGGER movimiento_compartido_update_participant BEFORE UPDATE ON movimiento_compartido
    WHEN NOT EXISTS(
      SELECT 1 FROM participantes_compartido p
      WHERE p.id=NEW.participante AND p.referencia=NEW.referencia
        AND p.rol='Tercero'
    ) BEGIN SELECT RAISE(ABORT,'participant mismatch'); END;
  CREATE TRIGGER movimiento_compartido_reference_immutable BEFORE UPDATE OF referencia ON movimiento_compartido
    WHEN NEW.referencia!=OLD.referencia BEGIN SELECT RAISE(ABORT,'immutable reference'); END;
  UPDATE schema_version SET version=17;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error("Upgrade FK validation failed.");
}
