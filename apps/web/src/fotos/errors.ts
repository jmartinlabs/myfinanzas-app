/**
 * Normalización de errores de `/fotos`.
 *
 * `failureFrom` conserva los campos públicos del `ApiError` y `failureMessage`
 * mantiene los textos exactos por estado. No decide reintentos ni navegación.
 */

import { ApiError } from "../api";
import type { Failure, FailureContext } from "./types";

export function failureFrom(error: unknown): Failure {
  if (error instanceof ApiError)
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      fields: error.fields ?? {},
      requestId:
        typeof error.data?.requestId === "string"
          ? error.data.requestId
          : undefined,
    };
  return {
    status: 0,
    code: "",
    message:
      error instanceof Error
        ? error.message
        : "No se pudo completar la consulta.",
    fields: {},
  };
}

export function failureMessage(
  failure: Failure,
  context: FailureContext,
): string {
  if (failure.status === 401)
    return "La sesión ha caducado. Vuelve a identificarte; no se muestran importes ni fotos parciales.";
  if (failure.status === 404)
    return context === "foto"
      ? "No existe la foto o la versión solicitada. No se ha caído a otra versión en silencio."
      : "No se encontró el recurso solicitado.";
  if (failure.status === 422)
    return failure.message || "Revisa los campos de la consulta.";
  if (failure.status === 0)
    return "No se pudo conectar con la API. La selección se conserva; no se inventan datos.";
  return failure.message || "No se pudo completar la consulta.";
}
