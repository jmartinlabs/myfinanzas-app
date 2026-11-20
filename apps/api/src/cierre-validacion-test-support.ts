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