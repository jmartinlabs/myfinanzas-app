import type { Database } from "bun:sqlite";
import { Problem } from "./problem";

/**
 * #572 (F2g de #538) · Gate de exposición de las escrituras de devolución
 * (`specs/38` §4, SPEC39 §11).
 *
 * Es un LITERAL de servidor: no se calcula, no se detecta y no se lee de
 * ningún sitio (entorno, cabecera, base de datos, query o fichero). Solo el PR
 * de aceptación de F9, con su lista de evidencia, puede cambiarlo a `true`.
 * No se añade aquí ningún `process.env`, `Bun.env` ni lectura de estado.
 */
export const devolucionIntegracionDisponible = false;

/** Texto canónico G-1 (`specs/38` §4). También es el mensaje del 503. */
export const DEVOLUCION_G1 =
  "Las operaciones de devolución no están disponibles hasta que el aviso de impacto y la confirmación estén integrados. Las devoluciones existentes se pueden consultar.";

/**
 * Valor efectivo del gate que reciben servicios y la lectura de capacidad.
 * Se inyecta en la raíz de composición (`createApp`); si un llamador no lo
 * pasa, el valor por defecto es CERRADO.
 */
export type DevolucionGate = Readonly<{ disponible: boolean }>;

/** Gate de producción: deriva únicamente del literal de arriba. */
export const gateProduccion: DevolucionGate = Object.freeze({
  disponible: devolucionIntegracionDisponible,
});

/**
 * Operaciones que escriben una devolución. La clasificación vive aquí y solo
 * aquí; cada punto de escritura la reutiliza (`exigirEscrituraDevolucion`).
 */
export type OperacionEscritura =
  | {
      /** `POST /api/movimientos` y `/{id}/rectificar|anular`; también el núcleo en transacción. */
      origen: "movimiento";
      body: Record<string, unknown>;
      id: string | null;
      anular: boolean;
    }
  | {
      /** `POST /api/comida/{id}/devolucion`: atribuir, reatribuir o rectificar el vínculo. */
      origen: "comida-devolucion";
    }
  | {
      /** Escritura legacy de `revision-comida` (alta, rectificar, anular, vincular). */
      origen: "revision-comida";
      body: Record<string, unknown>;
      /** `es_devolucion` de la fila existente; `null` en el alta. */
      previaEsDevolucion: boolean | null;
    };

const DEVOLUCION = "Devolución de gasto";

/**
 * Clasificación única. No lanza para identidades inexistentes (sigue hacia el
 * 404 normal). Es de solo lectura.
 */
export function esEscrituraDevolucion(
  db: Database,
  op: OperacionEscritura,
): boolean {
  if (op.origen === "comida-devolucion") return true;
  if (op.origen === "revision-comida")
    return op.body.esDevolucion === true || op.previaEsDevolucion === true;
  const { body, id } = op;
  // Alta o retipificación a «Devolución de gasto», o atribución en el cuerpo.
  if (body.tipo === DEVOLUCION) return true;
  if (body.devolucion !== undefined) return true;
  // Regularización de Compartidos (14-E1 §5/§7): Transferencia HACIA S000 con
  // bloque `compartido` o porciones. La aportación D5 (origen S000) no lo es.
  if (
    body.tipo === "Transferencia" &&
    body.destino === "S000" &&
    (body.compartido !== undefined || body.porciones !== undefined)
  )
    return true;
  if (!id || !/^\d+$/.test(id)) return false;
  const old = db
    .query("SELECT tipo FROM movimientos WHERE id=?")
    .get(id) as { tipo: string } | null;
  if (!old) return false;
  // Rectificar/anular una devolución.
  if (old.tipo === DEVOLUCION) return true;
  // Rectificar/anular una compra con vínculo. Predicado: cualquier fila de
  // `movimiento_devolucion` con `compra=id`, el mismo que usa `plan()` para
  // `DEVOLUTION_LINKED` y superconjunto del que recorre
  // `revalidateDevolucionesCompra` (que actualiza esas filas al rectificar o
  // anular la compra): falla cerrado.
  if (old.tipo === "Gasto" && tablaVinculos(db))
    return !!db
      .query("SELECT 1 FROM movimiento_devolucion WHERE compra=? LIMIT 1")
      .get(id);
  return false;
}

function tablaVinculos(db: Database) {
  return !!db
    .query(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='movimiento_devolucion'",
    )
    .get();
}

/**
 * Punto único de aplicación: 503 `DEVOLUTION_INTEGRATION_UNAVAILABLE` si la
 * operación es una escritura de devolución y el gate no está abierto. Debe
 * llamarse tras la reproducción idempotente y antes de tocar estado; dentro
 * de la transacción, el 503 revierte cualquier escritura previa (recibos).
 */
export function exigirEscrituraDevolucion(
  db: Database,
  gate: DevolucionGate | undefined,
  op: OperacionEscritura,
): void {
  if (gate?.disponible === true) return;
  if (!esEscrituraDevolucion(db, op)) return;
  throw new Problem(503, "DEVOLUTION_INTEGRATION_UNAVAILABLE", DEVOLUCION_G1);
}
