/**
 * Estado de vista y URL de `/fotos`.
 *
 * El modo, el trimestre por defecto y la selección A/B de versiones se
 * calculan aquí sin leer ni escribir el historial: la navegación sigue siendo
 * responsabilidad de `Fotos`.
 */

import type { Modo, VersionFotoDto, Vista } from "./types";

export function trimestreActual(): string {
  return String(Math.floor(new Date().getMonth() / 3) + 1);
}

export function vistaDesdePath(path: string): Vista {
  const query = path.includes("?") ? path.slice(path.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  const raw = params.get("modo") ?? params.get("tipo");
  const modo: Modo =
    raw === "Trimestre" ? "Trimestre" : raw === "Anio" ? "Anio" : "ciclo";
  const trimestre = params.get("trimestre") ?? trimestreActual();
  return {
    modo,
    ciclo: params.get("ciclo") ?? "",
    version: params.get("version") ?? "",
    ejercicio: params.get("ejercicio") ?? String(new Date().getFullYear()),
    trimestre: /^[1-4]$/.test(trimestre) ? trimestre : "1",
    versionAgregado: params.get("versionAgregado") ?? "",
    periodoId: params.get("id") ?? "",
  };
}

export function vistaUrl(vista: Vista): string {
  const params = new URLSearchParams();
  params.set("modo", vista.modo);
  if (vista.modo === "ciclo") {
    if (vista.ciclo) params.set("ciclo", vista.ciclo);
    if (vista.version) params.set("version", vista.version);
  } else if (vista.periodoId) {
    params.set("id", vista.periodoId);
  } else {
    params.set("ejercicio", vista.ejercicio);
    if (vista.modo === "Trimestre") params.set("trimestre", vista.trimestre);
    if (vista.versionAgregado)
      params.set("versionAgregado", vista.versionAgregado);
  }
  return "/fotos?" + params.toString();
}

export function versionExiste(
  versiones: Pick<VersionFotoDto, "version">[] | null,
  version: string,
): boolean {
  return versiones !== null && versiones.some(
    (item) => String(item.version) === version,
  );
}

/**
 * Mantiene la elección A/B si la versión sigue existiendo; si no, usa la
 * primera o la última versión ascendente. Con menos de dos versiones limpia la
 * selección, igual que el efecto anterior.
 */
export function seleccionComparacionVersion(
  versiones: Pick<VersionFotoDto, "version">[] | null,
  anterior: string,
  extremo: "primera" | "ultima",
): string {
  if (!versiones || versiones.length < 2) return "";
  const ascendente = [...versiones].sort((a, b) => a.version - b.version);
  if (anterior && versiones.some((item) => String(item.version) === anterior))
    return anterior;
  return String(
    extremo === "primera"
      ? ascendente[0].version
      : ascendente[ascendente.length - 1].version,
  );
}
