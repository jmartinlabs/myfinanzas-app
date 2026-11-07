/**
 * Etiquetas de bloques y motivos de `/fotos`.
 *
 * Un código desconocido se muestra tal cual: nunca se inventa una etiqueta.
 */

export const TOTAL_LABELS: Record<string, string> = {
  ingresos: "Ingresos",
  gastos: "Gastos",
  gasto: "Gasto",
  nomina: "Nómina",
  bonus: "Bonus",
  otros: "Otros ingresos",
  interesesIngreso: "Intereses (ingreso)",
  restoOtros: "Resto de otros ingresos",
  cuotas: "Cuotas de deuda",
  extraordinaria: "Amortización extraordinaria",
  deudas: "Deudas",
  capital: "Capital",
  interesesDeuda: "Intereses de deuda",
  transferencias: "Transferencias",
  amortizaciones: "Amortizaciones",
  devoluciones: "Devoluciones",
  neto: "Neto ingreso − gasto",
  movimientos: "Movimientos",
  efectivo: "Efectivo a Fin",
  posiciones: "Posiciones a Fin",
  plan: "Plan",
  e35: "E3.5 / FIN_NETA",
  deuda: "Deuda E1.6",
  valoracion: "Valoración / patrimonio",
  anticipos: "Anticipos",
};

export const MOTIVO_LABELS: Record<string, string> = {
  SIN_CIERRE: "Sin cierre registrado",
  PENDIENTE_RE_CIERRE: "Ciclo reabierto: pendiente de re-cierre",
  CICLO_SIN_CIERRE: "Ciclo sin cierre: excluido del agregado",
  SIN_REGLA_ADITIVA: "Sin regla aditiva aprobada: total no certificado",
  SIN_EVIDENCIA: "Sin evidencia consultable",
  CIERRE_POSTERIOR: "Cierre posterior: estado de reapertura inconsistente",
  ESTADO_INCONSISTENTE: "Estado de reapertura inconsistente",
};

export function motivoTexto(value: string | null | undefined): string {
  if (!value) return "Sin motivo declarado";
  return MOTIVO_LABELS[value] ?? value;
}
