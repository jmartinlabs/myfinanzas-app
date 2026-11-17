import type { Database } from "bun:sqlite";

/**
 * SPEC37 · v30 — gate `G-v30` (incremento I1).
 *
 * Solo esquema: extiende `transferencia_pendiente` para el Registro coordinado
 * (D2, D6) y añade la tabla técnica de idempotencia de la operación compuesta
 * (D7). No crea consumidores, no migra datos reales y no toca ningún motor.
 *
 * La migración es aditiva porque SQLite no admite `ALTER TABLE … ADD CONSTRAINT`:
 * los `CHECK` viven en las columnas añadidas y la coherencia entre `origen_tipo`
 * y esas columnas se impone con triggers `BEFORE INSERT`/`BEFORE UPDATE`. El
 * `CHECK` de tabla de `origen_tipo` que ya existía desde v28 sigue intacto y
 * sigue cubriendo `reparto_linea` y `gasto`.
 *
 * Umbrales medidos en SQLite 3.43.2 (`bun:sqlite`), registrados en el expediente
 * de incrementos (§2.1):
 *  - `ADD COLUMN … CHECK` funciona sobre una tabla existente y rechaza escrituras
 *    inválidas; no valida las filas previas, que aquí quedan en `NULL`.
 *  - `ALTER TABLE … ADD CONSTRAINT` no existe: de ahí los triggers.
 *  - Un trigger con `NEW.x != OLD.x` no dispara en `NULL → valor`; con `IS NOT`
 *    sí. La inmutabilidad de `modalidad` usa `IS NOT`.
 */
export function spec37SchemaV30(db: Database) {
  // Preflight: el índice único parcial no se puede crear si ya hubiera dos
  // pendientes activos del mismo Gasto. Aborta antes de escribir nada.
  const duplicate = db
    .query(
      `SELECT gasto FROM transferencia_pendiente
        WHERE gasto IS NOT NULL AND estado='Pendiente de realizar'
        GROUP BY gasto HAVING COUNT(*)>1 LIMIT 1`,
    )
    .get() as { gasto: string } | null;
  if (duplicate)
    throw new Error(
      "Migración v30 rechazada: hay más de un pendiente activo para el mismo Gasto.",
    );

  db.exec(`
    ALTER TABLE transferencia_pendiente
      ADD COLUMN anticipo_previsto TEXT CHECK(
        anticipo_previsto IS NULL OR (
          length(anticipo_previsto)>=6
          AND anticipo_previsto GLOB 'REF[0-9]*'
          AND substr(anticipo_previsto,4) NOT GLOB '*[^0-9]*'
        )
      );
    ALTER TABLE transferencia_pendiente
      ADD COLUMN gasto_revision INTEGER CHECK(
        gasto_revision IS NULL OR gasto_revision>0
      );
    ALTER TABLE transferencia_pendiente
      ADD COLUMN modalidad TEXT CHECK(
        modalidad IS NULL OR modalidad IN ('A','B')
      );

    CREATE UNIQUE INDEX transferencia_pendiente_gasto_activo
      ON transferencia_pendiente(gasto)
      WHERE gasto IS NOT NULL AND estado='Pendiente de realizar';

    CREATE TABLE operacion_coordinada_attempts(
      operacion TEXT NOT NULL CHECK(length(trim(operacion))>0),
      key TEXT NOT NULL CHECK(length(trim(key))>0),
      hash TEXT NOT NULL,
      response TEXT NOT NULL CHECK(json_valid(response)),
      expires INTEGER NOT NULL,
      PRIMARY KEY(operacion,key)
    ) STRICT;

    CREATE TRIGGER transferencia_pendiente_modalidad_inmutable
      BEFORE UPDATE OF modalidad ON transferencia_pendiente
      WHEN NEW.modalidad IS NOT OLD.modalidad
      BEGIN SELECT RAISE(ABORT,'modalidad inmutable'); END;

    CREATE TRIGGER transferencia_pendiente_modalidad_coherente_insert
      BEFORE INSERT ON transferencia_pendiente
      WHEN (NEW.origen_tipo='RegistroCoordinado'
          AND NEW.modalidad IS NULL)
        OR (NEW.origen_tipo='Reparto'
          AND (NEW.modalidad IS NOT NULL
            OR NEW.gasto_revision IS NOT NULL
            OR NEW.anticipo_previsto IS NOT NULL))
      BEGIN SELECT RAISE(ABORT,'modalidad incoherente con el origen'); END;

    CREATE TRIGGER transferencia_pendiente_modalidad_coherente_update
      BEFORE UPDATE ON transferencia_pendiente
      WHEN (NEW.origen_tipo='RegistroCoordinado'
          AND NEW.modalidad IS NULL)
        OR (NEW.origen_tipo='Reparto'
          AND (NEW.modalidad IS NOT NULL
            OR NEW.gasto_revision IS NOT NULL
            OR NEW.anticipo_previsto IS NOT NULL))
      BEGIN SELECT RAISE(ABORT,'modalidad incoherente con el origen'); END;

    UPDATE schema_version SET version=30;`);
}