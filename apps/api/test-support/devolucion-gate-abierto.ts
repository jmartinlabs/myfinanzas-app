import type { DevolucionGate } from "../src/devolucion-gate";

/**
 * #572 · Gate de devolución ABIERTO, solo para pruebas.
 *
 * Es la inyección de la raíz de composición de las pruebas: se pasa como
 * `createApp(db, { devolucionGate })` o como último argumento de los servicios.
 * La producción (`src/main.ts`) nunca importa este módulo, y no existe camino
 * por entorno, cabecera, base de datos ni query que lo abra. Solo el PR de F9
 * podrá cambiar el literal de `src/devolucion-gate.ts`.
 */
export const gateAbiertoParaPruebas: DevolucionGate = Object.freeze({
  disponible: true,
});
