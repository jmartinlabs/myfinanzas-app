/**
 * Presentación de la foto de ciclo: estados, cobertura y No disponible.
 *
 * Mantiene exactamente las secciones y textos de `Fotos.tsx`; no usa hooks.
 */

import { Badge, EmptyState } from "../../ui";
import { coverageRows, coverageState, noDisponibleRows } from "../data";
import { motivoTexto } from "../labels";
import { estadoTone } from "../states";
import type { FotoCicloDto } from "../types";
import { CoverageTable, NoDisponibleList } from "./coverage";
import { PhotoSummary } from "./photo-summary";

export function FotoCicloPanel({
  foto,
  ciclo,
}: {
  foto: FotoCicloDto;
  ciclo: string;
}) {
  return (
    <>
      {foto.estadoFoto === "SinFoto" && (
        <section className="panel" aria-label="Sin foto del ciclo">
          <div className="fotos-section-head">
            <div>
              <p className="eyebrow">E4.9 · ESTADO DE LA FOTO</p>
              <h2>Ciclo {ciclo}</h2>
            </div>
            <Badge tone="nd" label="SinFoto" />
          </div>
          <EmptyState title="Sin foto para este ciclo" icon="○">
            {motivoTexto(foto.motivo)}. No se crea una foto vacía ni se
            muestra 0.
          </EmptyState>
          <p className="help">
            Consulta de solo lectura. El cierre se crea en E4.9/E4.10; esta
            pantalla no lo crea ni lo rectifica.
          </p>
        </section>
      )}

      {foto.estadoFoto === "Disponible" && foto.foto && (
        <>
          <section className="panel" aria-label="Foto del ciclo">
            <div className="fotos-section-head">
              <div>
                <p className="eyebrow">E4.9 · FOTO DE CICLO</p>
                <h2>
                  Ciclo {foto.foto.ciclo} · v{foto.foto.version}
                </h2>
              </div>
              <div className="fotos-badges">
                <Badge tone="info" icon="▣" label="Foto" />
                <Badge
                  tone={foto.vigente ? "ok" : "partial"}
                  label={foto.vigente ? "Vigente" : "No vigente"}
                />
                <Badge
                  tone={estadoTone(foto.estado)}
                  label={foto.estado}
                />
              </div>
            </div>
            {foto.estado === "PendienteReCierre" && (
              <div className="fotos-caveat" role="status">
                <strong>PendienteReCierre (P4-A).</strong> El ciclo está
                reabierto: la v{foto.foto.version} se conserva y es
                consultable, pero no es vigente; no se ha creado una foto
                nueva de re-cierre.
              </div>
            )}
            <PhotoSummary foto={foto.foto} />
            <p className="help">
              {foto.seleccionAplicada.porDefecto
                ? "No se pidió versión: se consultó automáticamente la última persistida (regla P7-D)."
                : `Versión v${foto.seleccionAplicada.version} solicitada explícitamente; no hay fallback silencioso.`}
            </p>
          </section>

          <section className="panel" aria-label="Cobertura de la foto">
            <h2>Cobertura de la foto</h2>
            <p>
              <Badge
                tone={estadoTone(coverageState(foto.foto.cobertura))}
                label={coverageState(foto.foto.cobertura)}
              />
            </p>
            {coverageRows(foto.foto.cobertura).length ? (
              <CoverageTable
                rows={coverageRows(foto.foto.cobertura)}
                label="Cobertura por bloque de la foto"
              />
            ) : (
              <p className="muted">
                Sin bloques de cobertura declarados. No se certifica un
                total.
              </p>
            )}
          </section>

          <section className="panel" aria-label="Bloques no disponibles de la foto">
            <h2>No disponible</h2>
            {noDisponibleRows(foto.foto.noDisponible).length ? (
              <NoDisponibleList
                rows={noDisponibleRows(foto.foto.noDisponible)}
              />
            ) : (
              <p className="muted">
                Sin bloques No disponible declarados.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
