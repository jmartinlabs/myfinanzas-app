import { useEffect, useState } from "react";
import { api } from "./api";

/**
 * #572 (F2g de #538) · Guarda de cliente de las escrituras de devolución.
 *
 * El cliente NO duplica lógica: lee una sola vez `GET /api/devoluciones/capacidad`
 * (`{ disponible: boolean }`), que sale del mismo valor efectivo que aplica el
 * servidor (`specs/38` §4). Campo ausente, forma inesperada, error de red/HTTP
 * o carga todavía en curso = CERRADO, también para enlaces directos.
 */

/** Texto canónico G-1 (`specs/38` §4); es también el mensaje del 503. */
export const DEVOLUCION_G1 =
  "Las operaciones de devolución no están disponibles hasta que el aviso de impacto y la confirmación estén integrados. Las devoluciones existentes se pueden consultar.";

/** Id del aviso visible al que apuntan los controles con `aria-describedby`. */
export const DEVOLUCION_G1_ID = "devolucion-gate-g1";

/** Solo `{ disponible: true }` abre; cualquier otra cosa es cerrado. */
export function capacidadAbierta(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { disponible?: unknown }).disponible === true
  );
}

/** Lectura única: un error de carga o una respuesta sin el campo cierran. */
export async function leerCapacidadDevolucion(
  load: () => Promise<unknown> = () => api("/devoluciones/capacidad"),
): Promise<boolean> {
  try {
    return capacidadAbierta(await load());
  } catch {
    return false;
  }
}

/** Hook reutilizable. Estado inicial y de error: cerrado. */
export function useCapacidadDevolucion(): {
  disponible: boolean;
  cargada: boolean;
} {
  const [estado, setEstado] = useState({ disponible: false, cargada: false });
  useEffect(() => {
    let live = true;
    leerCapacidadDevolucion().then((disponible) => {
      if (live) setEstado({ disponible, cargada: true });
    });
    return () => {
      live = false;
    };
  }, []);
  return estado;
}

/**
 * ¿Rectificar/anular este Movimiento es una escritura de devolución cerrada?
 * Lo es una devolución o una compra con devoluciones vinculadas (`count` del
 * resumen R3, en la raíz de `GET /api/movimientos/{id}`). El servidor, que usa
 * un predicado más amplio (cualquier fila de vínculo), es la autoridad.
 */
export function rectificarAnularCerrado(input: {
  disponible: boolean;
  tipo: string | undefined;
  devolucionesResumen?: { count?: number } | null;
}): boolean {
  if (input.disponible) return false;
  return (
    input.tipo === "Devolución de gasto" ||
    (input.devolucionesResumen?.count ?? 0) > 0
  );
}
