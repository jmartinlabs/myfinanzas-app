import type { Database } from "bun:sqlite";

/**
 * SPEC36 — schema 28 (27 → 28). Additive and non-destructive:
 *  - creates the single monthly distribution per Cycle (`repartos`) and its
 *    lines (`reparto_lineas`), including the persisted draft allowed by D3;
 *  - creates the shared Transferencia pendiente (`transferencia_pendiente`),
 *    its immutable audit (`transferencia_pendiente_audit`) and the
 *    idempotency attempts used by generation, confirmation and cancellation
 *    (`transferencia_pendiente_attempts`);
 *  - creates the immutable reparto audit (`reparto_audit`);
 *  - preserves every earlier table, ID, counter, audit, attempt, MFA and the
 *    demo/production identity. There is no backfill and no reseed.
 *
 * Scope split: increment 1 only writes pending records. The distribution is
 * created here because the pending record needs its provenance, but the
 * distribution service and UI belong to increment 2. SPEC37 consumes the same
 * pending record and is not implemented here.
 *
 * `sourceCommit` of C28 is `6a31c23`. `fecha_prevista` is mandatory and the
 * amount is an exact integer in cents. In `reparto_lineas`, `concepto` and
 * `nota` are nullable draft fields; in `transferencia_pendiente` both are
 * NOT NULL and accept empty text, matching E1.5 Movimientos.
 *
 * D8: a line that references a historically inactive Presupuesto is allowed,
 * but no new pending may be generated for that inactive Presupuesto. D8 does
 * not make the Saldo destino historical: ordinary E1.5 eligibility (active,
 * non-Exterior Saldos) is checked independently. The D8 check is enforced
 * when the pending is inserted and on the fields that affect its line
 * provenance, never by rewriting the line.
 *
 * Immutability: identities are immutable; DELETE is refused on every entity;
 * terminal states are immutable; `revision` advances by exactly one. A line is
 * frozen once its reparto leaves `Borrador` or once any pending references it.
 * Audits are append-only, one row per revision and must match the current
 * revision of their entity.
 *
 * Runs inside the opening IMMEDIATE transaction owned by `prepareSchema`. A
 * failure rolls the whole DDL back; the caller verifies foreign keys on
 * reopen.
 */
export function repartoMensualSchemaV28(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 27)
    throw new Error(
      "Esquema previo inesperado para migración SPEC36 v28.",
    );

  db.exec(`
    CREATE TABLE repartos(
      id INTEGER PRIMARY KEY,
      ciclo TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
      estado TEXT NOT NULL
        CHECK(estado IN ('Borrador','Generado','Completado')),
      origen_comun TEXT REFERENCES saldos(id) ON DELETE RESTRICT,
      revision INTEGER NOT NULL CHECK(revision>0),
      creado TEXT NOT NULL CHECK(
        length(creado)=24
        AND creado GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      actualizado TEXT NOT NULL CHECK(
        length(actualizado)=24
        AND actualizado GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      CHECK(actualizado>=creado)
    ) STRICT;
    CREATE UNIQUE INDEX repartos_ciclo_unico ON repartos(ciclo);

    CREATE TABLE reparto_lineas(
      id INTEGER PRIMARY KEY,
      reparto INTEGER NOT NULL REFERENCES repartos(id) ON DELETE RESTRICT,
      clase TEXT NOT NULL CHECK(clase IN ('Presupuesto','Adicional')),
      presupuesto TEXT REFERENCES presupuestos(id) ON DELETE RESTRICT,
      origen TEXT REFERENCES saldos(id) ON DELETE RESTRICT,
      destino TEXT REFERENCES saldos(id) ON DELETE RESTRICT,
      importe INTEGER CHECK(importe IS NULL OR importe>0),
      fecha_prevista TEXT NOT NULL CHECK(
        length(fecha_prevista)=10
        AND fecha_prevista GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND julianday(fecha_prevista) IS NOT NULL
        AND date(julianday(fecha_prevista))=fecha_prevista
      ),
      concepto TEXT,
      nota TEXT,
      incluida INTEGER NOT NULL DEFAULT 1 CHECK(incluida IN (0,1)),
      motivo_exclusion TEXT,
      revision INTEGER NOT NULL CHECK(revision>0),
      creado TEXT NOT NULL CHECK(
        length(creado)=24
        AND creado GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      actualizado TEXT NOT NULL CHECK(
        length(actualizado)=24
        AND actualizado GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      CHECK(actualizado>=creado),
      CHECK(
        (clase='Presupuesto' AND presupuesto IS NOT NULL)
        OR (clase='Adicional' AND presupuesto IS NULL)
      ),
      CHECK(
        (incluida=1
          AND origen IS NOT NULL AND destino IS NOT NULL
          AND importe IS NOT NULL)
        OR (incluida=0
          AND motivo_exclusion IS NOT NULL
          AND length(trim(motivo_exclusion))>0)
      ),
      CHECK(origen IS NULL OR origen!='S000'),
      CHECK(destino IS NULL OR destino!='S000'),
      CHECK(origen IS NULL OR destino IS NULL OR origen!=destino)
    ) STRICT;
    CREATE INDEX reparto_lineas_reparto ON reparto_lineas(reparto);

    CREATE TABLE transferencia_pendiente(
      id INTEGER PRIMARY KEY,
      estado TEXT NOT NULL
        CHECK(estado IN ('Pendiente de realizar','Confirmada','Cancelada')),
      importe INTEGER NOT NULL CHECK(importe>0),
      origen TEXT NOT NULL REFERENCES saldos(id) ON DELETE RESTRICT,
      destino TEXT NOT NULL REFERENCES saldos(id) ON DELETE RESTRICT,
      ciclo_origen TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
      fecha_prevista TEXT NOT NULL CHECK(
        length(fecha_prevista)=10
        AND fecha_prevista GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND julianday(fecha_prevista) IS NOT NULL
        AND date(julianday(fecha_prevista))=fecha_prevista
      ),
      fecha_efectiva TEXT CHECK(
        fecha_efectiva IS NULL OR (
          length(fecha_efectiva)=10
          AND fecha_efectiva GLOB
            '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
          AND julianday(fecha_efectiva) IS NOT NULL
          AND date(julianday(fecha_efectiva))=fecha_efectiva
        )
      ),
      concepto TEXT NOT NULL,
      nota TEXT NOT NULL,
      origen_tipo TEXT NOT NULL
        CHECK(origen_tipo IN ('Reparto','RegistroCoordinado')),
      reparto_linea INTEGER
        REFERENCES reparto_lineas(id) ON DELETE RESTRICT,
      gasto TEXT REFERENCES movimientos(id) ON DELETE RESTRICT,
      anticipo TEXT REFERENCES fichas_anticipos(referencia)
        ON DELETE RESTRICT,
      movimiento TEXT REFERENCES movimientos(id) ON DELETE RESTRICT,
      motivo_cancelacion TEXT,
      revision INTEGER NOT NULL CHECK(revision>0),
      creado TEXT NOT NULL CHECK(
        length(creado)=24
        AND creado GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      actualizado TEXT NOT NULL CHECK(
        length(actualizado)=24
        AND actualizado GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      CHECK(actualizado>=creado),
      CHECK(origen!='S000' AND destino!='S000' AND origen!=destino),
      CHECK(
        (origen_tipo='Reparto'
          AND reparto_linea IS NOT NULL
          AND gasto IS NULL
          AND anticipo IS NULL)
        OR (origen_tipo='RegistroCoordinado'
          AND reparto_linea IS NULL
          AND gasto IS NOT NULL)
      ),
      CHECK(
        (estado='Pendiente de realizar'
          AND movimiento IS NULL
          AND fecha_efectiva IS NULL
          AND motivo_cancelacion IS NULL)
        OR (estado='Confirmada'
          AND movimiento IS NOT NULL
          AND fecha_efectiva IS NOT NULL
          AND motivo_cancelacion IS NULL)
        OR (estado='Cancelada'
          AND movimiento IS NULL
          AND fecha_efectiva IS NULL
          AND motivo_cancelacion IS NOT NULL
          AND length(trim(motivo_cancelacion))>0)
      )
    ) STRICT;
    CREATE UNIQUE INDEX transferencia_pendiente_movimiento_unico
      ON transferencia_pendiente(movimiento) WHERE movimiento IS NOT NULL;
    CREATE INDEX transferencia_pendiente_ciclo_estado
      ON transferencia_pendiente(ciclo_origen,estado);
    CREATE UNIQUE INDEX transferencia_pendiente_linea_unica
      ON transferencia_pendiente(reparto_linea) WHERE reparto_linea IS NOT NULL;
    CREATE INDEX transferencia_pendiente_gasto
      ON transferencia_pendiente(gasto);

    CREATE TABLE reparto_audit(
      id INTEGER PRIMARY KEY,
      reparto INTEGER NOT NULL REFERENCES repartos(id) ON DELETE RESTRICT,
      revision INTEGER NOT NULL CHECK(revision>0),
      accion TEXT NOT NULL
        CHECK(accion IN ('alta','actualizacion','generacion','completado')),
      anterior TEXT CHECK(anterior IS NULL OR json_valid(anterior)),
      posterior TEXT NOT NULL CHECK(json_valid(posterior)),
      instante TEXT NOT NULL CHECK(
        length(instante)=24
        AND instante GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      actor TEXT NOT NULL
        CHECK(length(trim(actor))>0 AND length(actor)<=200),
      CHECK(
        (accion='alta'
          AND revision=1
          AND anterior IS NULL)
        OR (accion<>'alta'
          AND revision>1
          AND anterior IS NOT NULL)
      )
    ) STRICT;
    CREATE UNIQUE INDEX reparto_audit_revision_unica
      ON reparto_audit(reparto,revision);

    CREATE TABLE transferencia_pendiente_audit(
      id INTEGER PRIMARY KEY,
      pendiente INTEGER NOT NULL
        REFERENCES transferencia_pendiente(id) ON DELETE RESTRICT,
      revision INTEGER NOT NULL CHECK(revision>0),
      accion TEXT NOT NULL
        CHECK(accion IN ('alta','actualizacion','confirmacion','cancelacion')),
      anterior TEXT CHECK(anterior IS NULL OR json_valid(anterior)),
      posterior TEXT NOT NULL CHECK(json_valid(posterior)),
      instante TEXT NOT NULL CHECK(
        length(instante)=24
        AND instante GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      actor TEXT NOT NULL
        CHECK(length(trim(actor))>0 AND length(actor)<=200),
      CHECK(
        (accion='alta'
          AND revision=1
          AND anterior IS NULL)
        OR (accion<>'alta'
          AND revision>1
          AND anterior IS NOT NULL)
      )
    ) STRICT;
    CREATE UNIQUE INDEX transferencia_pendiente_audit_revision_unica
      ON transferencia_pendiente_audit(pendiente,revision);

    CREATE TABLE transferencia_pendiente_attempts(
      operacion TEXT NOT NULL CHECK(length(trim(operacion))>0),
      key TEXT NOT NULL CHECK(length(trim(key))>0),
      hash TEXT NOT NULL,
      response TEXT NOT NULL CHECK(json_valid(response)),
      expires INTEGER NOT NULL,
      PRIMARY KEY(operacion,key)
    ) STRICT;

    CREATE TRIGGER reparto_no_delete
      BEFORE DELETE ON repartos
      BEGIN SELECT RAISE(ABORT,'no delete'); END;
    CREATE TRIGGER reparto_identidad_immutable
      BEFORE UPDATE OF id,ciclo ON repartos
      WHEN NEW.id IS NOT OLD.id OR NEW.ciclo IS NOT OLD.ciclo
      BEGIN SELECT RAISE(ABORT,'immutable reparto identity'); END;
    CREATE TRIGGER reparto_initial
      BEFORE INSERT ON repartos
      WHEN NEW.revision!=1 OR NEW.estado!='Borrador'
      BEGIN SELECT RAISE(ABORT,'initial reparto requires revision 1 and Borrador'); END;
    CREATE TRIGGER reparto_revision
      BEFORE UPDATE ON repartos
      WHEN NEW.revision!=OLD.revision+1
      BEGIN SELECT RAISE(ABORT,'reparto revision must advance by one'); END;
    CREATE TRIGGER reparto_terminal
      BEFORE UPDATE ON repartos
      WHEN OLD.estado='Completado'
      BEGIN SELECT RAISE(ABORT,'completed reparto is immutable'); END;
    CREATE TRIGGER reparto_transition
      BEFORE UPDATE ON repartos
      WHEN NEW.estado!=OLD.estado
        AND NOT (
          (OLD.estado='Borrador' AND NEW.estado='Generado')
          OR (OLD.estado='Generado' AND NEW.estado='Completado')
        )
      BEGIN SELECT RAISE(ABORT,'invalid reparto state transition'); END;
    CREATE TRIGGER reparto_origen_congelado
      BEFORE UPDATE ON repartos
      WHEN OLD.estado!='Borrador' AND NEW.origen_comun IS NOT OLD.origen_comun
      BEGIN SELECT RAISE(ABORT,'reparto origin is frozen after generation'); END;

    CREATE TRIGGER reparto_linea_no_delete
      BEFORE DELETE ON reparto_lineas
      BEGIN SELECT RAISE(ABORT,'no delete'); END;
    CREATE TRIGGER reparto_linea_identidad_immutable
      BEFORE UPDATE OF id,reparto ON reparto_lineas
      WHEN NEW.id IS NOT OLD.id OR NEW.reparto IS NOT OLD.reparto
      BEGIN SELECT RAISE(ABORT,'immutable reparto line identity'); END;
    CREATE TRIGGER reparto_linea_initial
      BEFORE INSERT ON reparto_lineas
      WHEN NEW.revision!=1
        OR (SELECT estado FROM repartos WHERE id=NEW.reparto)
          NOT IN ('Borrador','Generado')
      BEGIN SELECT RAISE(ABORT,'invalid initial reparto line'); END;
    CREATE TRIGGER reparto_linea_revision
      BEFORE UPDATE ON reparto_lineas
      WHEN NEW.revision!=OLD.revision+1
      BEGIN SELECT RAISE(ABORT,'reparto line revision must advance by one'); END;
    CREATE TRIGGER reparto_linea_congelada
      BEFORE UPDATE ON reparto_lineas
      WHEN (SELECT estado FROM repartos WHERE id=OLD.reparto)<>'Borrador'
        OR EXISTS (
          SELECT 1 FROM transferencia_pendiente
          WHERE reparto_linea=OLD.id
        )
      BEGIN SELECT RAISE(ABORT,'reparto line is frozen'); END;
    CREATE TRIGGER reparto_linea_presupuesto_destino_insert
      BEFORE INSERT ON reparto_lineas
      WHEN NEW.clase='Presupuesto' AND NEW.destino IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM presupuestos p
          WHERE p.id=NEW.presupuesto AND p.destino=NEW.destino
        )
      BEGIN SELECT RAISE(ABORT,'reparto line must match its budget destination'); END;
    CREATE TRIGGER reparto_linea_presupuesto_destino_update
      BEFORE UPDATE OF clase,presupuesto,destino ON reparto_lineas
      WHEN NEW.clase='Presupuesto' AND NEW.destino IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM presupuestos p
          WHERE p.id=NEW.presupuesto AND p.destino=NEW.destino
        )
      BEGIN SELECT RAISE(ABORT,'reparto line must match its budget destination'); END;
    CREATE TRIGGER reparto_linea_saldos_elegibles_insert
      BEFORE INSERT ON reparto_lineas
      WHEN (NEW.origen IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM saldos s
          WHERE s.id=NEW.origen AND s.estado='Activa'
            AND s.tipo!='Exterior' AND s.control!='Exterior'
        ))
        OR (NEW.destino IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM saldos s
          WHERE s.id=NEW.destino AND s.estado='Activa'
            AND s.tipo!='Exterior' AND s.control!='Exterior'
        ))
      BEGIN SELECT RAISE(ABORT,'invalid reparto line saldo'); END;
    CREATE TRIGGER reparto_linea_saldos_elegibles_update
      BEFORE UPDATE OF origen,destino ON reparto_lineas
      WHEN (NEW.origen IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM saldos s
          WHERE s.id=NEW.origen AND s.estado='Activa'
            AND s.tipo!='Exterior' AND s.control!='Exterior'
        ))
        OR (NEW.destino IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM saldos s
          WHERE s.id=NEW.destino AND s.estado='Activa'
            AND s.tipo!='Exterior' AND s.control!='Exterior'
        ))
      BEGIN SELECT RAISE(ABORT,'invalid reparto line saldo'); END;

    CREATE TRIGGER transferencia_pendiente_no_delete
      BEFORE DELETE ON transferencia_pendiente
      BEGIN SELECT RAISE(ABORT,'no delete'); END;
    CREATE TRIGGER transferencia_pendiente_identidad_immutable
      BEFORE UPDATE OF id,ciclo_origen,origen_tipo,reparto_linea,gasto,anticipo
        ON transferencia_pendiente
      WHEN NEW.id IS NOT OLD.id
        OR NEW.ciclo_origen IS NOT OLD.ciclo_origen
        OR NEW.origen_tipo IS NOT OLD.origen_tipo
        OR NEW.reparto_linea IS NOT OLD.reparto_linea
        OR NEW.gasto IS NOT OLD.gasto
        OR NEW.anticipo IS NOT OLD.anticipo
      BEGIN SELECT RAISE(ABORT,'immutable pending identity'); END;
    CREATE TRIGGER transferencia_pendiente_initial
      BEFORE INSERT ON transferencia_pendiente
      WHEN NEW.revision!=1 OR NEW.estado!='Pendiente de realizar'
      BEGIN SELECT RAISE(ABORT,'initial pending requires revision 1 and Pendiente de realizar'); END;
    CREATE TRIGGER transferencia_pendiente_revision
      BEFORE UPDATE ON transferencia_pendiente
      WHEN NEW.revision!=OLD.revision+1
      BEGIN SELECT RAISE(ABORT,'pending revision must advance by one'); END;
    CREATE TRIGGER transferencia_pendiente_terminal
      BEFORE UPDATE ON transferencia_pendiente
      WHEN OLD.estado IN ('Confirmada','Cancelada')
      BEGIN SELECT RAISE(ABORT,'terminal pending is immutable'); END;
    CREATE TRIGGER transferencia_pendiente_transition
      BEFORE UPDATE ON transferencia_pendiente
      WHEN NEW.estado!=OLD.estado
        AND NOT (
          OLD.estado='Pendiente de realizar'
          AND NEW.estado IN ('Confirmada','Cancelada')
        )
      BEGIN SELECT RAISE(ABORT,'invalid pending state transition'); END;
    CREATE TRIGGER transferencia_pendiente_estado_pendiente
      BEFORE INSERT ON transferencia_pendiente
      WHEN NEW.estado='Pendiente de realizar'
        AND (NEW.movimiento IS NOT NULL
          OR NEW.fecha_efectiva IS NOT NULL
          OR NEW.motivo_cancelacion IS NOT NULL)
      BEGIN SELECT RAISE(ABORT,'pending transfer cannot carry a movement, effective date or cancellation motive'); END;
    CREATE TRIGGER transferencia_pendiente_estado_pendiente_update
      BEFORE UPDATE ON transferencia_pendiente
      WHEN NEW.estado='Pendiente de realizar'
        AND (NEW.movimiento IS NOT NULL
          OR NEW.fecha_efectiva IS NOT NULL
          OR NEW.motivo_cancelacion IS NOT NULL)
      BEGIN SELECT RAISE(ABORT,'pending transfer cannot carry a movement, effective date or cancellation motive'); END;
    CREATE TRIGGER transferencia_pendiente_confirmada
      BEFORE INSERT ON transferencia_pendiente
      WHEN NEW.estado='Confirmada'
        AND NOT EXISTS (
          SELECT 1 FROM movimientos m
          WHERE m.id=NEW.movimiento
            AND m.tipo='Transferencia'
            AND m.anulado=0
            AND m.origen=NEW.origen
            AND m.destino=NEW.destino
            AND m.importe=NEW.importe
            AND m.fecha=NEW.fecha_efectiva
        )
      BEGIN SELECT RAISE(ABORT,'confirmed pending must match a non-annulled Transferencia'); END;
    CREATE TRIGGER transferencia_pendiente_confirmada_update
      BEFORE UPDATE ON transferencia_pendiente
      WHEN NEW.estado='Confirmada'
        AND NOT EXISTS (
          SELECT 1 FROM movimientos m
          WHERE m.id=NEW.movimiento
            AND m.tipo='Transferencia'
            AND m.anulado=0
            AND m.origen=NEW.origen
            AND m.destino=NEW.destino
            AND m.importe=NEW.importe
            AND m.fecha=NEW.fecha_efectiva
        )
      BEGIN SELECT RAISE(ABORT,'confirmed pending must match a non-annulled Transferencia'); END;
    CREATE TRIGGER transferencia_pendiente_cancelada
      BEFORE INSERT ON transferencia_pendiente
      WHEN NEW.estado='Cancelada'
        AND (NEW.motivo_cancelacion IS NULL
          OR length(trim(NEW.motivo_cancelacion))=0)
      BEGIN SELECT RAISE(ABORT,'cancelled pending requires a motive'); END;
    CREATE TRIGGER transferencia_pendiente_cancelada_update
      BEFORE UPDATE ON transferencia_pendiente
      WHEN NEW.estado='Cancelada'
        AND (NEW.motivo_cancelacion IS NULL
          OR length(trim(NEW.motivo_cancelacion))=0)
      BEGIN SELECT RAISE(ABORT,'cancelled pending requires a motive'); END;
    CREATE TRIGGER transferencia_pendiente_linea_reparto
      BEFORE INSERT ON transferencia_pendiente
      WHEN NEW.origen_tipo='Reparto'
        AND NOT EXISTS (
          SELECT 1 FROM reparto_lineas l
          JOIN repartos r ON r.id=l.reparto
          WHERE l.id=NEW.reparto_linea
            AND l.incluida=1
            AND r.estado='Generado'
            AND r.ciclo=NEW.ciclo_origen
            AND l.origen IS NEW.origen
            AND l.destino IS NEW.destino
            AND l.importe IS NEW.importe
            AND (l.clase<>'Presupuesto' OR EXISTS (
              SELECT 1 FROM presupuestos p
              WHERE p.id=l.presupuesto
                AND p.estado='Activo'
                AND p.destino=NEW.destino
            ))
        )
      BEGIN SELECT RAISE(ABORT,'pending must match an included line of its cycle'); END;
    CREATE TRIGGER transferencia_pendiente_linea_reparto_update
      BEFORE UPDATE OF reparto_linea,origen,destino,importe,ciclo_origen
        ON transferencia_pendiente
      WHEN NEW.origen_tipo='Reparto'
        AND NOT EXISTS (
          SELECT 1 FROM reparto_lineas l
          JOIN repartos r ON r.id=l.reparto
          WHERE l.id=NEW.reparto_linea
            AND l.incluida=1
            AND r.estado='Generado'
            AND r.ciclo=NEW.ciclo_origen
            AND l.origen IS NEW.origen
            AND l.destino IS NEW.destino
            AND l.importe IS NEW.importe
            AND (l.clase<>'Presupuesto' OR EXISTS (
              SELECT 1 FROM presupuestos p
              WHERE p.id=l.presupuesto
                AND p.estado='Activo'
                AND p.destino=NEW.destino
            ))
        )
      BEGIN SELECT RAISE(ABORT,'pending must match an included line of its cycle'); END;
    CREATE TRIGGER transferencia_pendiente_saldos_elegibles_insert
      BEFORE INSERT ON transferencia_pendiente
      WHEN NOT EXISTS (
          SELECT 1 FROM saldos s
          WHERE s.id=NEW.origen AND s.estado='Activa'
            AND s.tipo!='Exterior' AND s.control!='Exterior'
        )
        OR NOT EXISTS (
          SELECT 1 FROM saldos s
          WHERE s.id=NEW.destino AND s.estado='Activa'
            AND s.tipo!='Exterior' AND s.control!='Exterior'
        )
      BEGIN SELECT RAISE(ABORT,'invalid pending saldo'); END;
    CREATE TRIGGER transferencia_pendiente_saldos_elegibles_update
      BEFORE UPDATE OF origen,destino ON transferencia_pendiente
      WHEN NOT EXISTS (
          SELECT 1 FROM saldos s
          WHERE s.id=NEW.origen AND s.estado='Activa'
            AND s.tipo!='Exterior' AND s.control!='Exterior'
        )
        OR NOT EXISTS (
          SELECT 1 FROM saldos s
          WHERE s.id=NEW.destino AND s.estado='Activa'
            AND s.tipo!='Exterior' AND s.control!='Exterior'
        )
      BEGIN SELECT RAISE(ABORT,'invalid pending saldo'); END;

    CREATE TRIGGER reparto_audit_revision
      BEFORE INSERT ON reparto_audit
      WHEN (SELECT revision FROM repartos WHERE id=NEW.reparto)
        IS NOT NEW.revision
      BEGIN SELECT RAISE(ABORT,'audit revision must match reparto'); END;
    CREATE TRIGGER reparto_audit_no_update
      BEFORE UPDATE ON reparto_audit
      BEGIN SELECT RAISE(ABORT,'immutable reparto audit'); END;
    CREATE TRIGGER reparto_audit_no_delete
      BEFORE DELETE ON reparto_audit
      BEGIN SELECT RAISE(ABORT,'immutable reparto audit'); END;
    CREATE TRIGGER transferencia_pendiente_audit_revision
      BEFORE INSERT ON transferencia_pendiente_audit
      WHEN (SELECT revision FROM transferencia_pendiente WHERE id=NEW.pendiente)
        IS NOT NEW.revision
      BEGIN SELECT RAISE(ABORT,'audit revision must match pending'); END;
    CREATE TRIGGER transferencia_pendiente_audit_no_update
      BEFORE UPDATE ON transferencia_pendiente_audit
      BEGIN SELECT RAISE(ABORT,'immutable pending audit'); END;
    CREATE TRIGGER transferencia_pendiente_audit_no_delete
      BEFORE DELETE ON transferencia_pendiente_audit
      BEGIN SELECT RAISE(ABORT,'immutable pending audit'); END;

    UPDATE schema_version SET version=28;
  `);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error(
      "Migración v28 rechazada: claves foráneas inconsistentes.",
    );
}

/**
 * SPEC36 — schema 29 (28 → 29). Reconstruction of the two distribution tables
 * required by the approved C amendment (two plan sources, 2026-11-11):
 *  - `repartos` gains `fuente_plan` (`PlanCiclo`|`Dprima`), mandatory and
 *    without DEFAULT. Every v28 row is backfilled to `PlanCiclo`.
 *  - `reparto_lineas` admits `clase='Partida'`, adds `partida` and requires
 *    exactly one source reference per class (`presupuesto` XOR `partida`).
 *
 * SQLite cannot add a NOT NULL column without DEFAULT nor change a CHECK in
 * place, so both tables are rebuilt. IDs, rows, CHECKs, STRICT mode, indexes
 * and the FK from `transferencia_pendiente.reparto_linea` are preserved.
 * `reparto_lineas` is copied before its triggers are recreated, so historical
 * rows (including `Completado` distributions) are not reinterpreted.
 *
 * `transferencia_pendiente` keeps its table, states, idempotency and
 * confirmation; only the two triggers relating it to a distribution line are
 * replaced (D8 for `Presupuesto` and `Partida`). `reparto_audit_revision` is
 * not touched.
 *
 * The caller disables `foreign_keys` before the opening IMMEDIATE transaction
 * when upgrading a database that already contains v28 rows. Runs inside that
 * transaction: a failure rolls every DDL and copy back.
 */
export function repartoMensualSchemaV29(db: Database) {
  const version = (
    db.query("SELECT version FROM schema_version").get() as {
      version: number;
    } | null
  )?.version;
  if (version !== 28)
    throw new Error(
      "Esquema previo inesperado para migración SPEC36 v29.",
    );

  db.exec(`
    CREATE TEMP TABLE spec36_v29_repartos AS
      SELECT id,ciclo,estado,origen_comun,revision,creado,actualizado
      FROM repartos;
    CREATE TEMP TABLE spec36_v29_reparto_lineas AS
      SELECT id,reparto,clase,presupuesto,origen,destino,importe,
        fecha_prevista,concepto,nota,incluida,motivo_exclusion,revision,
        creado,actualizado
      FROM reparto_lineas;

    DROP TRIGGER transferencia_pendiente_linea_reparto;
    DROP TRIGGER transferencia_pendiente_linea_reparto_update;
    DROP TABLE reparto_lineas;
    DROP TABLE repartos;

    CREATE TABLE repartos(
      id INTEGER PRIMARY KEY,
      ciclo TEXT NOT NULL REFERENCES ciclos(id) ON DELETE RESTRICT,
      fuente_plan TEXT NOT NULL
        CHECK(fuente_plan IN ('PlanCiclo','Dprima')),
      estado TEXT NOT NULL
        CHECK(estado IN ('Borrador','Generado','Completado')),
      origen_comun TEXT REFERENCES saldos(id) ON DELETE RESTRICT,
      revision INTEGER NOT NULL CHECK(revision>0),
      creado TEXT NOT NULL CHECK(
        length(creado)=24
        AND creado GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      actualizado TEXT NOT NULL CHECK(
        length(actualizado)=24
        AND actualizado GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      CHECK(actualizado>=creado)
    ) STRICT;

    CREATE TABLE reparto_lineas(
      id INTEGER PRIMARY KEY,
      reparto INTEGER NOT NULL REFERENCES repartos(id) ON DELETE RESTRICT,
      clase TEXT NOT NULL
        CHECK(clase IN ('Presupuesto','Adicional','Partida')),
      presupuesto TEXT REFERENCES presupuestos(id) ON DELETE RESTRICT,
      partida TEXT REFERENCES partidas(id) ON DELETE RESTRICT,
      origen TEXT REFERENCES saldos(id) ON DELETE RESTRICT,
      destino TEXT REFERENCES saldos(id) ON DELETE RESTRICT,
      importe INTEGER CHECK(importe IS NULL OR importe>0),
      fecha_prevista TEXT NOT NULL CHECK(
        length(fecha_prevista)=10
        AND fecha_prevista GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND julianday(fecha_prevista) IS NOT NULL
        AND date(julianday(fecha_prevista))=fecha_prevista
      ),
      concepto TEXT,
      nota TEXT,
      incluida INTEGER NOT NULL DEFAULT 1 CHECK(incluida IN (0,1)),
      motivo_exclusion TEXT,
      revision INTEGER NOT NULL CHECK(revision>0),
      creado TEXT NOT NULL CHECK(
        length(creado)=24
        AND creado GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      actualizado TEXT NOT NULL CHECK(
        length(actualizado)=24
        AND actualizado GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
      ),
      CHECK(actualizado>=creado),
      CHECK(
        (clase='Presupuesto'
          AND presupuesto IS NOT NULL AND partida IS NULL)
        OR (clase='Adicional'
          AND presupuesto IS NULL AND partida IS NULL)
        OR (clase='Partida'
          AND presupuesto IS NULL AND partida IS NOT NULL)
      ),
      CHECK(
        (incluida=1
          AND origen IS NOT NULL AND destino IS NOT NULL
          AND importe IS NOT NULL)
        OR (incluida=0
          AND motivo_exclusion IS NOT NULL
          AND length(trim(motivo_exclusion))>0)
      ),
      CHECK(origen IS NULL OR origen!='S000'),
      CHECK(destino IS NULL OR destino!='S000'),
      CHECK(origen IS NULL OR destino IS NULL OR origen!=destino)
    ) STRICT;

    INSERT INTO repartos(
      id,ciclo,fuente_plan,estado,origen_comun,revision,creado,actualizado)
    SELECT id,ciclo,'PlanCiclo',estado,origen_comun,revision,creado,actualizado
    FROM spec36_v29_repartos;

    INSERT INTO reparto_lineas(
      id,reparto,clase,presupuesto,partida,origen,destino,importe,
      fecha_prevista,concepto,nota,incluida,motivo_exclusion,revision,
      creado,actualizado)
    SELECT id,reparto,clase,presupuesto,NULL,origen,destino,importe,
      fecha_prevista,concepto,nota,incluida,motivo_exclusion,revision,
      creado,actualizado
    FROM spec36_v29_reparto_lineas;

    CREATE UNIQUE INDEX repartos_ciclo_unico ON repartos(ciclo);
    CREATE INDEX reparto_lineas_reparto ON reparto_lineas(reparto);

    CREATE TRIGGER reparto_no_delete
      BEFORE DELETE ON repartos
      BEGIN SELECT RAISE(ABORT,'no delete'); END;
    CREATE TRIGGER reparto_identidad_immutable
      BEFORE UPDATE OF id,ciclo ON repartos
      WHEN NEW.id IS NOT OLD.id OR NEW.ciclo IS NOT OLD.ciclo
      BEGIN SELECT RAISE(ABORT,'immutable reparto identity'); END;
    CREATE TRIGGER reparto_initial
      BEFORE INSERT ON repartos
      WHEN NEW.revision!=1 OR NEW.estado!='Borrador'
      BEGIN SELECT RAISE(ABORT,'initial reparto requires revision 1 and Borrador'); END;
    CREATE TRIGGER reparto_revision
      BEFORE UPDATE ON repartos
      WHEN NEW.revision!=OLD.revision+1
      BEGIN SELECT RAISE(ABORT,'reparto revision must advance by one'); END;
    CREATE TRIGGER reparto_terminal
      BEFORE UPDATE ON repartos
      WHEN OLD.estado='Completado'
      BEGIN SELECT RAISE(ABORT,'completed reparto is immutable'); END;
    CREATE TRIGGER reparto_transition
      BEFORE UPDATE ON repartos
      WHEN NEW.estado!=OLD.estado
        AND NOT (
          (OLD.estado='Borrador' AND NEW.estado='Generado')
          OR (OLD.estado='Generado' AND NEW.estado='Completado')
        )
      BEGIN SELECT RAISE(ABORT,'invalid reparto state transition'); END;
    CREATE TRIGGER reparto_origen_congelado
      BEFORE UPDATE ON repartos
      WHEN OLD.estado!='Borrador' AND NEW.origen_comun IS NOT OLD.origen_comun
      BEGIN SELECT RAISE(ABORT,'reparto origin is frozen after generation'); END;
    CREATE TRIGGER reparto_fuente_inmutable
      BEFORE UPDATE OF fuente_plan ON repartos
      WHEN NEW.fuente_plan IS NOT OLD.fuente_plan
        AND (OLD.estado!='Borrador'
          OR EXISTS (
            SELECT 1 FROM reparto_lineas WHERE reparto=OLD.id
          ))
      BEGIN SELECT RAISE(ABORT,'reparto plan source is frozen after lines or generation'); END;

    CREATE TRIGGER reparto_linea_no_delete
      BEFORE DELETE ON reparto_lineas
      BEGIN SELECT RAISE(ABORT,'no delete'); END;
    CREATE TRIGGER reparto_linea_identidad_immutable
      BEFORE UPDATE OF id,reparto ON reparto_lineas
      WHEN NEW.id IS NOT OLD.id OR NEW.reparto IS NOT OLD.reparto
      BEGIN SELECT RAISE(ABORT,'immutable reparto line identity'); END;
    CREATE TRIGGER reparto_linea_initial
      BEFORE INSERT ON reparto_lineas
      WHEN NEW.revision!=1
        OR (SELECT estado FROM repartos WHERE id=NEW.reparto)
          NOT IN ('Borrador','Generado')
      BEGIN SELECT RAISE(ABORT,'invalid initial reparto line'); END;
    CREATE TRIGGER reparto_linea_revision
      BEFORE UPDATE ON reparto_lineas
      WHEN NEW.revision!=OLD.revision+1
      BEGIN SELECT RAISE(ABORT,'reparto line revision must advance by one'); END;
    CREATE TRIGGER reparto_linea_congelada
      BEFORE UPDATE ON reparto_lineas
      WHEN (SELECT estado FROM repartos WHERE id=OLD.reparto)<>'Borrador'
        OR EXISTS (
          SELECT 1 FROM transferencia_pendiente
          WHERE reparto_linea=OLD.id
        )
      BEGIN SELECT RAISE(ABORT,'reparto line is frozen'); END;
    CREATE TRIGGER reparto_linea_fuente_insert
      BEFORE INSERT ON reparto_lineas
      WHEN NOT EXISTS (
        SELECT 1 FROM repartos r
        WHERE r.id=NEW.reparto
          AND (
            NEW.clase='Adicional'
            OR (NEW.clase='Presupuesto' AND r.fuente_plan='PlanCiclo')
            OR (NEW.clase='Partida' AND r.fuente_plan='Dprima')
          )
      )
      BEGIN SELECT RAISE(ABORT,'reparto line class must match plan source'); END;
    CREATE TRIGGER reparto_linea_fuente_update
      BEFORE UPDATE OF clase,reparto ON reparto_lineas
      WHEN NOT EXISTS (
        SELECT 1 FROM repartos r
        WHERE r.id=NEW.reparto
          AND (
            NEW.clase='Adicional'
            OR (NEW.clase='Presupuesto' AND r.fuente_plan='PlanCiclo')
            OR (NEW.clase='Partida' AND r.fuente_plan='Dprima')
          )
      )
      BEGIN SELECT RAISE(ABORT,'reparto line class must match plan source'); END;
    CREATE TRIGGER reparto_linea_presupuesto_destino_insert
      BEFORE INSERT ON reparto_lineas
      WHEN (NEW.clase='Presupuesto' AND NEW.destino IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM presupuestos p
          WHERE p.id=NEW.presupuesto AND p.destino=NEW.destino
        ))
        OR (NEW.clase='Partida' AND NEW.destino IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM repartos r
          JOIN dprima_plan_mensual m
            ON m.ciclo=r.ciclo AND m.raiz=NEW.partida
          JOIN partidas p ON p.id=NEW.partida
          WHERE r.id=NEW.reparto
            AND m.destino=NEW.destino
            AND p.estado='Activa'
            AND p.padre_partida IS NULL
        ))
      BEGIN SELECT RAISE(ABORT,'reparto line must match its budget destination'); END;
    CREATE TRIGGER reparto_linea_presupuesto_destino_update
      BEFORE UPDATE OF clase,presupuesto,partida,destino ON reparto_lineas
      WHEN (NEW.clase='Presupuesto' AND NEW.destino IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM presupuestos p
          WHERE p.id=NEW.presupuesto AND p.destino=NEW.destino
        ))
        OR (NEW.clase='Partida' AND NEW.destino IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM repartos r
          JOIN dprima_plan_mensual m
            ON m.ciclo=r.ciclo AND m.raiz=NEW.partida
          JOIN partidas p ON p.id=NEW.partida
          WHERE r.id=NEW.reparto
            AND m.destino=NEW.destino
            AND p.estado='Activa'
            AND p.padre_partida IS NULL
        ))
      BEGIN SELECT RAISE(ABORT,'reparto line must match its budget destination'); END;
    CREATE TRIGGER reparto_linea_saldos_elegibles_insert
      BEFORE INSERT ON reparto_lineas
      WHEN (NEW.origen IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM saldos s
          WHERE s.id=NEW.origen AND s.estado='Activa'
            AND s.tipo!='Exterior' AND s.control!='Exterior'
        ))
        OR (NEW.destino IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM saldos s
          WHERE s.id=NEW.destino AND s.estado='Activa'
            AND s.tipo!='Exterior' AND s.control!='Exterior'
        ))
      BEGIN SELECT RAISE(ABORT,'invalid reparto line saldo'); END;
    CREATE TRIGGER reparto_linea_saldos_elegibles_update
      BEFORE UPDATE OF origen,destino ON reparto_lineas
      WHEN (NEW.origen IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM saldos s
          WHERE s.id=NEW.origen AND s.estado='Activa'
            AND s.tipo!='Exterior' AND s.control!='Exterior'
        ))
        OR (NEW.destino IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM saldos s
          WHERE s.id=NEW.destino AND s.estado='Activa'
            AND s.tipo!='Exterior' AND s.control!='Exterior'
        ))
      BEGIN SELECT RAISE(ABORT,'invalid reparto line saldo'); END;

    CREATE TRIGGER transferencia_pendiente_linea_reparto
      BEFORE INSERT ON transferencia_pendiente
      WHEN NEW.origen_tipo='Reparto'
        AND NOT EXISTS (
          SELECT 1 FROM reparto_lineas l
          JOIN repartos r ON r.id=l.reparto
          WHERE l.id=NEW.reparto_linea
            AND l.incluida=1
            AND r.estado='Generado'
            AND r.ciclo=NEW.ciclo_origen
            AND l.origen IS NEW.origen
            AND l.destino IS NEW.destino
            AND l.importe IS NEW.importe
            AND (
              l.clase='Adicional'
              OR (l.clase='Presupuesto' AND EXISTS (
                SELECT 1 FROM presupuestos p
                WHERE p.id=l.presupuesto
                  AND p.estado='Activo'
                  AND p.destino=NEW.destino
              ))
              OR (l.clase='Partida' AND EXISTS (
                SELECT 1 FROM partidas p
                JOIN dprima_plan_mensual m
                  ON m.ciclo=r.ciclo AND m.raiz=p.id
                WHERE p.id=l.partida
                  AND p.estado='Activa'
                  AND p.padre_partida IS NULL
                  AND m.destino=NEW.destino
              ))
            )
        )
      BEGIN SELECT RAISE(ABORT,'pending must match an included line of its cycle'); END;
    CREATE TRIGGER transferencia_pendiente_linea_reparto_update
      BEFORE UPDATE OF reparto_linea,origen,destino,importe,ciclo_origen
        ON transferencia_pendiente
      WHEN NEW.origen_tipo='Reparto'
        AND NOT EXISTS (
          SELECT 1 FROM reparto_lineas l
          JOIN repartos r ON r.id=l.reparto
          WHERE l.id=NEW.reparto_linea
            AND l.incluida=1
            AND r.estado='Generado'
            AND r.ciclo=NEW.ciclo_origen
            AND l.origen IS NEW.origen
            AND l.destino IS NEW.destino
            AND l.importe IS NEW.importe
            AND (
              l.clase='Adicional'
              OR (l.clase='Presupuesto' AND EXISTS (
                SELECT 1 FROM presupuestos p
                WHERE p.id=l.presupuesto
                  AND p.estado='Activo'
                  AND p.destino=NEW.destino
              ))
              OR (l.clase='Partida' AND EXISTS (
                SELECT 1 FROM partidas p
                JOIN dprima_plan_mensual m
                  ON m.ciclo=r.ciclo AND m.raiz=p.id
                WHERE p.id=l.partida
                  AND p.estado='Activa'
                  AND p.padre_partida IS NULL
                  AND m.destino=NEW.destino
              ))
            )
        )
      BEGIN SELECT RAISE(ABORT,'pending must match an included line of its cycle'); END;

    DROP TABLE spec36_v29_reparto_lineas;
    DROP TABLE spec36_v29_repartos;

    UPDATE schema_version SET version=29;
  `);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw new Error(
      "Migración v29 rechazada: claves foráneas inconsistentes.",
    );
}
