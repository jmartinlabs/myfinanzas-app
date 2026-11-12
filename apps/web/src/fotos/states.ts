/**
 * Clasificación visual de estados de `/fotos`.
 *
 * No altera el estado recibido: solo elige el tono del badge o el estado de
 * importe admitido por los controles de UI.
 */

import type { AmountState, BadgeTone } from "../ui";

export function estadoTone(estado: string): BadgeTone {
  const value = estado.toLowerCase();
  if (
    /nodisponible|no disponible|sinfoto|sin datos|sindatos|no vigente|no certificado/.test(
      value,
    )
  )
    return "nd";
  if (/parcial|pendiente|reabierto|excluido|sin regla/.test(value))
    return "partial";
  if (/completo|verificad|disponible|vigente|incluido|cerrado/.test(value))
    return "ok";
  return "info";
}

export function estadoNoDisponibleReconocido(estado: string): boolean {
  return (
    estado === "No disponible" ||
    estado === "NoDisponible" ||
    estado === "Parcial"
  );
}

export function amountState(estado: string): AmountState {
  if (
    estado === "Verificado" ||
    estado === "Cero verificado" ||
    estado === "Parcial" ||
    estado === "No disponible" ||
    estado === "No aplica" ||
    estado === "Sin datos"
  )
    return estado;
  if (/verificad/i.test(estado)) return "Verificado";
  if (/parcial/i.test(estado)) return "Parcial";
  if (/nodisponible|no disponible/i.test(estado)) return "No disponible";
  if (/no aplica/i.test(estado)) return "No aplica";
  return "Sin datos";
}
