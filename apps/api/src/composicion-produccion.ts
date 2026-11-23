import type { AppOptions } from "./app";
import type { DemoScope } from "./demo-mode";

/**
 * Opciones de `createApp` de la composición de PRODUCCIÓN (y DEMO), usadas por
 * el arranque real (`main.ts`).
 *
 * #572: aquí NO se pasa `devolucionGate`. Sin él, `createApp` usa el literal
 * `devolucionIntegracionDisponible` (false). No hay parámetro, entorno,
 * cabecera ni consulta que lo sustituya; solo el PR de F9 cambia el literal.
 */
export function opcionesProduccion(input: {
  key: Buffer;
  origin: string;
  demo?: DemoScope;
}): AppOptions {
  return {
    key: input.key,
    origin: input.origin,
    ...(input.demo ? { demo: input.demo } : {}),
  };
}
