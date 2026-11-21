import { fingerprint } from "./movement-ledger";

/**
 * Huella de impacto sobre los consumidores de una entidad.
 *
 * Se calcula sobre la entidad, los campos que cambian y las filas consumidoras
 * que un informe vivo podría estar leyendo, de modo que un motivo en prosa no
 * sea nunca la única evidencia de una rectificación. Nació en las guardas de
 * cierre y se conserva como utilidad propia: lo que se retiró es el **gate por
 * cierre**, no la exigencia de acreditar el impacto de un cambio real (§7.6).
 */
export function consumerImpactFingerprint(
  entity: string,
  id: string,
  changed: readonly string[],
  consumers: unknown,
): string {
  return fingerprint([
    entity,
    id,
    [...changed].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    consumers,
  ]);
}