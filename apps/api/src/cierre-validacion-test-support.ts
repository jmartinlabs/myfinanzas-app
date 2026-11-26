import type { Database } from "bun:sqlite";
import { contract } from "./schema-contract";

/**
 * Apoyo de pruebas: reconstruye el trigger de apertura tal y como estaba en
 * v31, leyendo su SQL exacto del contrato congelado C31. I2 sustituye ese
 * trigger por el procedimiento autorizado de §4.3, así que una prueba que
 * quiera partir de una base v31 genuina necesita devolverlo byte a byte: el
 * manifiesto compara SQL literal, no semántica.
 *
 * No lo importa ningún módulo de producción.
 */
export function restaurarTriggerAperturaV31(db: Database): void {
  const sql = contract("C31-SPEC37-INTENCION-91C32F5").objects.find(
    (object) => object.name === "anticipo_cycle_photo",
  )?.sql;
  if (!sql) throw new Error("C31 no contiene anticipo_cycle_photo");
  db.exec(sql);
}

/**
 * Apoyo de pruebas: devuelve el trigger de atribución de compra a su forma
 * anterior a v33 (#597), con el SQL exacto del contrato congelado C32. No
 * cambia `schema_version`: lo fija quien reconstruye la base antigua.
 *
 * No lo importa ningún módulo de producción.
 */
export function restaurarTriggerDevolucionV32(db: Database): void {
  const sql = contract("C32-SPEC38-VALIDACION-CIERRE").objects.find(
    (object) => object.name === "movimiento_devolucion_update_purchase",
  )?.sql;
  if (!sql)
    throw new Error("C32 no contiene movimiento_devolucion_update_purchase");
  db.exec("DROP TRIGGER movimiento_devolucion_update_purchase");
  db.exec(sql);
}

/**
 * Apoyo de pruebas: devuelve `cierre_validacion_confirmacion` a su forma
 * anterior a v34 (#598), con el SQL exacto del contrato congelado C33. No
 * cambia `schema_version`: lo fija quien reconstruye la base antigua.
 *
 * No lo importa ningún módulo de producción.
 */
export function restaurarTriggerConfirmacionV33(db: Database): void {
  const sql = contract("C33-SPEC39-DEVOLUCION-TRIGGER").objects.find(
    (object) => object.name === "cierre_validacion_confirmacion",
  )?.sql;
  if (!sql) throw new Error("C33 no contiene cierre_validacion_confirmacion");
  db.exec("DROP TRIGGER cierre_validacion_confirmacion");
  db.exec(sql);
}
