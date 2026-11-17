/**
 * #502/#503 — una sola carga de `GET /api/version` para todo el shell.
 *
 * El pie y el indicador de entorno del sidebar comparten esta promesa: no hay
 * peticiones redundantes ni dos interpretaciones del mismo metadato. Si la
 * petición falla, la promesa resuelve `null` y la UI usa su fallback explícito.
 */
import { api } from "./api";
import { type AppVersionInfo, parseVersionPayload } from "./version";

let cached: Promise<AppVersionInfo | null> | null = null;

export function loadVersionInfo(): Promise<AppVersionInfo | null> {
  cached ??= api<unknown>("/version")
    .then(parseVersionPayload)
    .catch(() => null);
  return cached;
}

/** Solo para pruebas: permite volver a pedir la identidad en el mismo proceso. */
export function resetVersionInfoCache() {
  cached = null;
}
