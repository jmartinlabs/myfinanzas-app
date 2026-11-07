/**
 * Panel de consulta de la foto de un ciclo.
 *
 * Orquesta los hooks de datos y compone las secciones de presentación; no
 * recalcula economía ni certifica totales.
 */

import { useRef } from "react";
import { EmptyState, Skeleton } from "../../ui";
import { failureMessage } from "../errors";
import { date } from "../format";
import {
  useCatalogoCiclos,
  useComparacion,
  useContraste,
  useFotoCiclo,
  useVersiones,
} from "../hooks";
import { versionExiste } from "../view";
import { CalculoVivoPanel } from "./calculo-vivo";
import { ComparacionPanel } from "./comparacion-panel";
import { ErrorBox } from "./feedback";
import { FotoCicloPanel } from "./foto-ciclo";
import { VersionesPanel } from "./versiones-panel";

export function CicloPanel({
  ciclo,
  version,
  onSelectCiclo,
  onSelectVersion,
  go,
}: {
  ciclo: string;
  version: string;
  onSelectCiclo: (id: string) => void;
  onSelectVersion: (version: string) => void;
  go: (path: string) => void;
}) {
  const comparisonReset = useRef<(() => void) | null>(null);
  const {
    ciclos,
    catalogoError,
    catalogoCargando,
    reintentarCatalogo,
  } = useCatalogoCiclos(ciclo, onSelectCiclo);
  const {
    versiones,
    versionesError,
    versionesCargando,
    reintentarVersiones,
  } = useVersiones(ciclo, comparisonReset);
  const {
    foto,
    fotoError,
    fotoCargando,
    reintentarFoto,
  } = useFotoCiclo(ciclo, version);
  const {
    contraste,
    contrasteError,
    contrasteCargando,
    reintentarContraste,
  } = useContraste(ciclo, foto?.foto?.version);
  const {
    compararA,
    compararB,
    comparacion,
    comparacionError,
    comparacionCargando,
    comparar,
    cambiarComparacion,
  } = useComparacion(ciclo, versiones, comparisonReset);

  const versionesListas = versiones !== null;
  const versionesPendientes = versiones === null && versionesError === null;
  const versionActualValida = !version || versionExiste(versiones, version);

  return (
    <>
      {catalogoError && (
        <ErrorBox
          failure={catalogoError}
          context="foto"
          retry={reintentarCatalogo}
        />
      )}

      {!catalogoError && catalogoCargando && !ciclos && (
        <Skeleton lines={3} label="Cargando ciclos…" />
      )}

      {!catalogoError && ciclos && ciclos.length === 0 && (
        <section className="panel" aria-label="Sin ciclos">
          <EmptyState title="Sin ciclos" icon="○">
            No hay ciclos para consultar. Esta pantalla no crea ciclos ni
            fotografías.
          </EmptyState>
          <button
            className="secondary"
            type="button"
            onClick={() => go("/ciclos")}
          >
            Ir a Ciclos
          </button>
        </section>
      )}

      {ciclos && ciclos.length > 0 && (
        <section className="panel fotos-context" aria-label="Selector de ciclo y versión">
          <div className="fotos-context-row">
            <label htmlFor="fotos-ciclo">
              Ciclo
              <select
                id="fotos-ciclo"
                value={ciclo}
                disabled={catalogoCargando}
                onChange={(event) => onSelectCiclo(event.target.value)}
              >
                <option value="">Elegir ciclo</option>
                {ciclos.map((item) => (
                  <option key={item.id} value={item.id}>
                    Ciclo {item.id} · {date(item.inicio)}
                    {item.mesFinanciado
                      ? ` · mes financiado ${date(item.mesFinanciado)}`
                      : ""}
                  </option>
                ))}
                {ciclo &&
                  !ciclos.some((item) => item.id === ciclo) && (
                    <option value={ciclo}>Ciclo {ciclo} · no encontrado</option>
                  )}
              </select>
            </label>
            <label htmlFor="fotos-version">
              Versión
              <select
                id="fotos-version"
                value={version}
                disabled={fotoCargando || versionesPendientes}
                aria-busy={versionesPendientes}
                onChange={(event) => onSelectVersion(event.target.value)}
              >
                <option value="">Última versión (automática)</option>
                {versiones?.map((item) => (
                  <option key={item.version} value={String(item.version)}>
                    v{item.version}
                    {item.vigente
                      ? " · vigente"
                      : item.esUltima
                        ? " · última no vigente"
                        : " · histórica"}
                  </option>
                ))}
                {!versionesListas && version && versionesPendientes && (
                  <option value={version}>Cargando v{version}…</option>
                )}
                {!versionesListas && version && versionesError && (
                  <option value={version}>v{version} · índice no disponible</option>
                )}
                {versionesListas && version && !versionActualValida && (
                  <option value={version}>v{version} · no encontrada</option>
                )}
              </select>
            </label>
          </div>
          <p className="help fotos-help">
            La opción automática consulta la última versión persistida y lo
            declara. Elegir una versión concreta no cae a otra si no existe
            (404). No se recalcula la economía ni se convierte una ausencia en
            0.
          </p>
          {versionesCargando && (
            <p className="muted" role="status">
              Cargando índice de versiones…
            </p>
          )}
          {versionesError && !fotoError && (
            <div>
              <p className="field-error" role="status">
                No se pudo cargar el índice de versiones:{" "}
                {failureMessage(versionesError, "foto")}
              </p>
              <button
                className="text-button"
                type="button"
                onClick={reintentarVersiones}
              >
                Reintentar índice
              </button>
            </div>
          )}
        </section>
      )}

      {ciclo && fotoCargando && (
        <Skeleton lines={5} label="Consultando foto del ciclo…" />
      )}

      {ciclo && fotoError && !fotoCargando && (
        <ErrorBox
          failure={fotoError}
          context="foto"
          retry={reintentarFoto}
        >
          {fotoError.status === 404 && version && (
            <button
              className="secondary"
              type="button"
              onClick={() => onSelectVersion("")}
            >
              Consultar la última versión
            </button>
          )}
        </ErrorBox>
      )}

      {ciclo && foto && !fotoCargando && !fotoError && (
        <>
          <FotoCicloPanel foto={foto} ciclo={ciclo} />
          <VersionesPanel
            versiones={versiones}
            version={version}
            versionesCargando={versionesCargando}
            onSelectVersion={onSelectVersion}
          />
          <ComparacionPanel
            versiones={versiones}
            compararA={compararA}
            compararB={compararB}
            comparacion={comparacion}
            comparacionError={comparacionError}
            comparacionCargando={comparacionCargando}
            comparar={comparar}
            cambiarComparacion={cambiarComparacion}
          />
          <CalculoVivoPanel
            contraste={contraste}
            contrasteError={contrasteError}
            contrasteCargando={contrasteCargando}
            reintentarContraste={reintentarContraste}
          />
        </>
      )}
    </>
  );
}
