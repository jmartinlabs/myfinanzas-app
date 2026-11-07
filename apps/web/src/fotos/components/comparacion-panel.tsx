/**
 * Panel de comparación de dos versiones persistidas de la foto de ciclo.
 */

import { EmptyState, Skeleton } from "../../ui";
import type { Failure, FotoCicloDto, VersionFotoDto } from "../types";
import { ErrorBox } from "./feedback";
import { ComparisonCard } from "./photo-summary";

export function ComparacionPanel({
  versiones,
  compararA,
  compararB,
  comparacion,
  comparacionError,
  comparacionCargando,
  comparar,
  cambiarComparacion,
}: {
  versiones: VersionFotoDto[] | null;
  compararA: string;
  compararB: string;
  comparacion: { a: FotoCicloDto; b: FotoCicloDto } | null;
  comparacionError: Failure | null;
  comparacionCargando: boolean;
  comparar: () => void;
  cambiarComparacion: (version: "a" | "b", value: string) => void;
}) {
  return (
    <section className="panel" aria-label="Comparación de versiones de la foto">
      <h2>Comparación v1 / v2 (solo lectura)</h2>
      <p className="muted">
        Compara dos versiones persistidas lado a lado. No hay edición ni
        recálculo; la igualdad o diferencia no certifica un total.
      </p>
      {versiones && versiones.length >= 2 ? (
        <>
          <div className="fotos-context-row">
            <label htmlFor="fotos-comparar-a">
              Versión A
              <select
                id="fotos-comparar-a"
                value={compararA}
                onChange={(event) =>
                  cambiarComparacion("a", event.target.value)
                }
              >
                {[...versiones]
                  .sort((a, b) => a.version - b.version)
                  .map((item) => (
                    <option key={item.version} value={String(item.version)}>
                      v{item.version}
                      {item.vigente ? " · vigente" : ""}
                    </option>
                  ))}
              </select>
            </label>
            <label htmlFor="fotos-comparar-b">
              Versión B
              <select
                id="fotos-comparar-b"
                value={compararB}
                onChange={(event) =>
                  cambiarComparacion("b", event.target.value)
                }
              >
                {[...versiones]
                  .sort((a, b) => a.version - b.version)
                  .map((item) => (
                    <option key={item.version} value={String(item.version)}>
                      v{item.version}
                      {item.vigente ? " · vigente" : ""}
                    </option>
                  ))}
              </select>
            </label>
            <button
              className="secondary"
              type="button"
              disabled={
                comparacionCargando ||
                !compararA ||
                !compararB ||
                compararA === compararB
              }
              onClick={comparar}
            >
              {comparacionCargando ? "Comparando…" : "Comparar versiones"}
            </button>
          </div>
          {comparacionError && (
            <ErrorBox
              failure={comparacionError}
              context="comparacion"
              retry={comparacionError.status === 422 ? undefined : comparar}
              focus={false}
            />
          )}
          {comparacionCargando && (
            <Skeleton lines={3} label="Comparando versiones…" />
          )}
          {comparacion && !comparacionCargando && (
            <div className="fotos-compare-grid">
              <ComparisonCard foto={comparacion.a} etiqueta="Versión A" />
              <ComparisonCard foto={comparacion.b} etiqueta="Versión B" />
            </div>
          )}
        </>
      ) : (
        <EmptyState title="Sin comparación disponible" icon="○">
          {versiones && versiones.length === 1
            ? "Solo hay una versión persistida; se necesitan dos para comparar v1/v2."
            : "No hay dos versiones persistidas consultables para comparar."}
        </EmptyState>
      )}
    </section>
  );
}
