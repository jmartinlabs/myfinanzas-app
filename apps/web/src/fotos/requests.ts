/**
 * URLs y guardas puras de las consultas de `/fotos`.
 *
 * Reproduce exactamente las rutas que consumía `Fotos.tsx` y las claves de la
 * comparación de versiones. Sin React, sin red y sin estado: los hooks aplican
 * estas funciones dentro de sus efectos y tokens de petición.
 */

import type { VersionFotoDto } from "./types";

export function catalogoCiclosUrl(page: number): string {
  return `/ciclos?estado=&page=${page}`;
}

export function versionesUrl(ciclo: string): string {
  return `/fotos/ciclos/${encodeURIComponent(ciclo)}/versiones`;
}

export function fotoCicloUrl(ciclo: string, version: string): string {
  const query = version ? `?version=${encodeURIComponent(version)}` : "";
  return `/fotos/ciclos/${encodeURIComponent(ciclo)}${query}`;
}

export function comparacionVersionUrl(ciclo: string, version: number): string {
  return `/fotos/ciclos/${encodeURIComponent(ciclo)}?version=${version}`;
}

export function contrasteUrl(ciclo: string): string {
  return `/fotos/contraste?ciclo=${encodeURIComponent(ciclo)}`;
}

export function periodoUrl(
  modo: "Trimestre" | "Anio",
  periodoId: string,
  ejercicio: string,
  trimestre: string,
  versionAgregado: string,
): string {
  if (periodoId) return `/fotos/periodos/${encodeURIComponent(periodoId)}`;
  const params = new URLSearchParams({
    tipo: modo,
    ejercicio,
  });
  if (modo === "Trimestre") params.set("trimestre", trimestre);
  if (versionAgregado) params.set("version", versionAgregado);
  return `/fotos/periodos?${params.toString()}`;
}

/**
 * Clave de contexto de la comparación A/B. Cambia con el ciclo o con el índice
 * de versiones, igual que el cálculo inline anterior, para invalidar respuestas
 * obsoletas.
 */
export function contextoComparacion(
  ciclo: string,
  versiones: Pick<VersionFotoDto, "version">[] | null,
): string {
  return `${ciclo}|${
    versiones?.map((item) => item.version).join(",") ?? "null"
  }`;
}

/** Verdadero solo si la petición y el contexto siguen vigentes. */
export function comparacionVigente(
  request: number,
  requestActual: number,
  context: string,
  contextoActual: string,
): boolean {
  return request === requestActual && contextoActual === context;
}
