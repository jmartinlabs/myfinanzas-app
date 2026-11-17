import type { Database } from "bun:sqlite";

/**
 * SPEC37 · v31 — gate `G-v31` (incremento I4.5).
 *
 * Solo esquema: el pendiente coordinado conserva la **intención** de Referencia
 * de Anticipo (§5.3, D2) sin crear ningún hecho financiero. Tres columnas
 * `NULL` en `transferencia_pendiente` —`anticipo_nombre`, `anticipo_apertura` y
 * `anticipo_evidencia`— con la misma regla de coherencia que `fichas_anticipos`
 * (`anticipo-schema.ts:32-36`): o no hay apertura ni evidencia, o hay apertura
 * y una evidencia no vacía. `anticipo_nombre` es obligatorio para las otras dos.
 *
 * En modalidad B hay **exactamente una** forma de Referencia prevista: un ID
 * existente (`anticipo_previsto`, v30) XOR una intención de alta
 * (`anticipo_nombre`, v31). La modalidad A no admite ninguna de las dos y el
 * origen `Reparto` conserva su contrato de v29 intacto. Nada de eso se valida
 * con un `CHECK` de tabla, porque SQLite no admite `ALTER TABLE … ADD
 * CONSTRAINT`; los `CHECK` de columna sólo cubren lo propio de cada columna y
 * la coherencia cruzada se impone con triggers `BEFORE INSERT`/`BEFORE UPDATE`,
 * el mismo mecanismo que usa la inmutabilidad de `modalidad` en v30.
 *
 * La migración es aditiva y no reconstruye tablas: las tres columnas nacen
 * `NULL` en todas las filas existentes, así que ningún pendiente previo puede
 * quedar incoherente y no hace falta preflight de datos. La DDL de v30 no se
 * toca: sus triggers siguen vigentes y una fila de v30 sigue siendo válida.
 *
 * Umbrales medidos en SQLite 3.43.2 (`bun:sqlite`), ya registrados en el
 * expediente de incrementos (§2.1): `ADD COLUMN … CHECK` se aplica a las
 * escrituras nuevas y no revalida las filas previas; un trigger con `NEW.x !=
 * OLD.x` no dispara en `NULL → valor`, pero aquí no se compara con `OLD`.
 *
 * El trigger de forma en `UPDATE` sólo juzga filas cuya `modalidad` no cambia:
 * un cambio de modalidad ya lo aborta el trigger de inmutabilidad de v30 y su
 * mensaje es el que el contrato de I2 espera, sin depender del orden en que
 * SQLite dispare dos triggers `BEFORE UPDATE`.
 */
export function spec37SchemaV31(db: Database) {
  db.exec(`
    ALTER TABLE transferencia_pendiente
      ADD COLUMN anticipo_nombre TEXT CHECK(
        anticipo_nombre IS NULL OR (
          length(trim(anticipo_nombre))>0
          AND length(anticipo_nombre)<=120
        )
      );
    ALTER TABLE transferencia_pendiente
      ADD COLUMN anticipo_apertura TEXT CHECK(
        anticipo_apertura IS NULL OR (
          length(anticipo_apertura)=10
          AND anticipo_apertura GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        )
      );
    ALTER TABLE transferencia_pendiente
      ADD COLUMN anticipo_evidencia TEXT CHECK(
        anticipo_evidencia IS NULL OR length(trim(anticipo_evidencia))>0
      );

    CREATE TRIGGER transferencia_pendiente_intencion_forma_insert
      BEFORE INSERT ON transferencia_pendiente
      WHEN (NEW.origen_tipo='RegistroCoordinado'
          AND NEW.modalidad='B'
          AND ((NEW.anticipo_previsto IS NULL)=(NEW.anticipo_nombre IS NULL)))
        OR (NEW.origen_tipo='RegistroCoordinado'
          AND NEW.modalidad='A'
          AND (NEW.anticipo_previsto IS NOT NULL
            OR NEW.anticipo_nombre IS NOT NULL
            OR NEW.anticipo_apertura IS NOT NULL
            OR NEW.anticipo_evidencia IS NOT NULL))
        OR (NEW.origen_tipo='Reparto'
          AND (NEW.anticipo_nombre IS NOT NULL
            OR NEW.anticipo_apertura IS NOT NULL
            OR NEW.anticipo_evidencia IS NOT NULL))
      BEGIN SELECT RAISE(ABORT,'forma de Referencia prevista incoherente'); END;

    CREATE TRIGGER transferencia_pendiente_intencion_forma_update
      BEFORE UPDATE ON transferencia_pendiente
      WHEN NEW.modalidad IS OLD.modalidad
       AND ((NEW.origen_tipo='RegistroCoordinado'
          AND NEW.modalidad='B'
          AND ((NEW.anticipo_previsto IS NULL)=(NEW.anticipo_nombre IS NULL)))
        OR (NEW.origen_tipo='RegistroCoordinado'
          AND NEW.modalidad='A'
          AND (NEW.anticipo_previsto IS NOT NULL
            OR NEW.anticipo_nombre IS NOT NULL
            OR NEW.anticipo_apertura IS NOT NULL
            OR NEW.anticipo_evidencia IS NOT NULL))
        OR (NEW.origen_tipo='Reparto'
          AND (NEW.anticipo_nombre IS NOT NULL
            OR NEW.anticipo_apertura IS NOT NULL
            OR NEW.anticipo_evidencia IS NOT NULL)))
      BEGIN SELECT RAISE(ABORT,'forma de Referencia prevista incoherente'); END;

    CREATE TRIGGER transferencia_pendiente_intencion_datos_insert
      BEFORE INSERT ON transferencia_pendiente
      WHEN (NEW.anticipo_apertura IS NULL AND NEW.anticipo_evidencia IS NOT NULL)
        OR (NEW.anticipo_apertura IS NOT NULL
          AND (NEW.anticipo_evidencia IS NULL
            OR length(trim(NEW.anticipo_evidencia))=0))
        OR (NEW.anticipo_nombre IS NULL
          AND (NEW.anticipo_apertura IS NOT NULL
            OR NEW.anticipo_evidencia IS NOT NULL))
      BEGIN SELECT RAISE(ABORT,'datos de intencion incoherentes'); END;

    CREATE TRIGGER transferencia_pendiente_intencion_datos_update
      BEFORE UPDATE ON transferencia_pendiente
      WHEN (NEW.anticipo_apertura IS NULL AND NEW.anticipo_evidencia IS NOT NULL)
        OR (NEW.anticipo_apertura IS NOT NULL
          AND (NEW.anticipo_evidencia IS NULL
            OR length(trim(NEW.anticipo_evidencia))=0))
        OR (NEW.anticipo_nombre IS NULL
          AND (NEW.anticipo_apertura IS NOT NULL
            OR NEW.anticipo_evidencia IS NOT NULL))
      BEGIN SELECT RAISE(ABORT,'datos de intencion incoherentes'); END;

    UPDATE schema_version SET version=31;`);
}