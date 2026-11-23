import type { ReactNode } from "react";
import { eur } from "./api";

/**
 * #538 F2a-1 · SPEC39 §2.3: rótulos mínimos cuando «Ejecutado» pasa de bruto a
 * gasto real económico (GRE) y el abono bancario se mide aparte, por fecha real.
 * Una etiqueta contextual no convierte una cifra económica en disponibilidad.
 */
export const ROTULO_GRE = "Gasto real económico (neto)";
export const ROTULO_FLUJO = "Flujo bancario bruto";
export const NOTA_DESVIACION =
  "Pendiente es la desviación analítica Del mes − Ejecutado, no dinero disponible: no habilita comprometer, aportar ni transferir.";
export const ROTULO_ABONOS = "Abonos vinculados verificados (por fecha real)";
export const NOTA_ATRIBUCION =
  "Las devoluciones se descuentan de la compra a la que se vinculan, aunque el abono llegue en otro ciclo: las devoluciones económicamente elegibles ya reducen el gasto real económico de la compra de origen. Los abonos vinculados verificados se muestran aparte por su fecha real: no son el flujo bancario completo y no se descuentan de nuevo del gasto real económico. Las huérfanas, los vínculos en revisión y las compras no válidas no suman a esta Partida: quedan visibles en Movimientos y en la integridad global, sin atribución de Partida cuando esta no es demostrable.";

/** «—» = la columna no aplica a la fuente; «No disponible» = aplica pero no es verificable. */
export const NO_APLICA = "—";
export const NO_DISPONIBLE = "No disponible";
/**
 * Única función que distingue ambos casos. `gasto`: bruto, devoluciones y abonos
 * (solo Gasto real); `ejecucion`: ejecutado y pendiente (toda fuente comparable).
 */
export function aplicaColumna(
  columna: "gasto" | "ejecucion",
  fuente: string | null | undefined,
) {
  return columna === "gasto" ? fuente === "Gasto real" : fuente !== "No aplica";
}
export const textoValor = (valor: string | null, aplica: boolean) =>
  valor !== null ? eur(valor) : aplica ? NO_DISPONIBLE : NO_APLICA;

/** Solo Gasto real cambia de magnitud (bruto → GRE); Aportación sigue siendo flujo. */
export const rotuloEjecutado = (fuente: string | null | undefined) =>
  fuente === "Gasto real" ? ROTULO_GRE : null;

const causaTexto: Record<string, string> = {
  sinVinculo: "sin vínculo",
  revisar: "vínculo en revisión",
  sinAcreditacion: "sin acreditar",
  sinClasificacion: "sin clasificar",
  compraInvalida: "compra no válida",
  periodoNoResoluble: "periodo no resoluble",
};
export const textoCobertura = (
  cobertura: string | null | undefined,
  causas: string[] | null | undefined,
) =>
  cobertura === "Parcial"
    ? `Cobertura parcial${causas?.length ? ": " + causas.map((c) => causaTexto[c] ?? c).join(", ") : ""}`
    : null;

/** Celda «Ejecutado» con su rótulo cuando la magnitud es el GRE. */
export function EjecutadoCelda({
  fuente,
  valor,
  cobertura,
  causas,
}: {
  fuente: string | null | undefined;
  valor: string | null;
  cobertura?: string | null;
  causas?: string[] | null;
}) {
  const rotulo = rotuloEjecutado(fuente);
  const parcial = rotulo ? textoCobertura(cobertura, causas) : null;
  return (
    <>
      {textoValor(valor, aplicaColumna("ejecucion", fuente))}
      {rotulo && valor !== null && <small className="help"> {rotulo}</small>}
      {parcial && <small className="help"> · {parcial}</small>}
    </>
  );
}

/** Celda de importe de una columna con aplicabilidad por fuente (Pendiente, Bruto, Devoluciones). */
export function ImporteCelda({
  fuente,
  columna,
  valor,
  rotulo,
}: {
  fuente: string | null | undefined;
  columna: "gasto" | "ejecucion";
  valor: string | null;
  rotulo?: string;
}) {
  return (
    <>
      {textoValor(valor, aplicaColumna(columna, fuente))}
      {rotulo && valor !== null && fuente === "Gasto real" && (
        <small className="help"> {rotulo}</small>
      )}
    </>
  );
}
