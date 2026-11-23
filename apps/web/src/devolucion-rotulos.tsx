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
export const NOTA_ATRIBUCION =
  "Las devoluciones se descuentan de la compra a la que se vinculan, aunque el abono llegue en otro ciclo; los abonos por fecha real se muestran aparte como flujo bancario.";

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
  vacio = "—",
}: {
  fuente: string | null | undefined;
  valor: string | null;
  cobertura?: string | null;
  causas?: string[] | null;
  vacio?: ReactNode;
}) {
  const rotulo = rotuloEjecutado(fuente);
  const parcial = rotulo ? textoCobertura(cobertura, causas) : null;
  return (
    <>
      {valor === null ? vacio : eur(valor)}
      {rotulo && <small className="help"> {rotulo}</small>}
      {parcial && <small className="help"> · {parcial}</small>}
    </>
  );
}

/** Fila de encabezado agrupado de la ejecución mensual de Dprima (columnas 5 a 8). */
export function CabeceraEjecucionMensual({ antes }: { antes: number }) {
  return (
    <tr>
      <th colSpan={antes} />
      <th colSpan={2}>{ROTULO_FLUJO}</th>
      <th colSpan={2}>{ROTULO_GRE}</th>
      <th colSpan={3} />
    </tr>
  );
}
