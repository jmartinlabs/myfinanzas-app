/**
 * Panel del cálculo vivo etiquetado de `/fotos`.
 *
 * No sustituye a la foto ni completa sus bloques No disponible.
 */

import { Badge, EmptyState, Skeleton } from "../../ui";
import { date } from "../format";
import { TOTAL_LABELS } from "../labels";
import { estadoTone } from "../states";
import type { ContrasteDto, Failure } from "../types";
import { ErrorBox } from "./feedback";
import { ContrasteMetrics } from "./tables";

export function CalculoVivoPanel({
  contraste,
  contrasteError,
  contrasteCargando,
  reintentarContraste,
}: {
  contraste: ContrasteDto | null;
  contrasteError: Failure | null;
  contrasteCargando: boolean;
  reintentarContraste: () => void;
}) {
  return (
    <section className="panel fotos-live" aria-label="Cálculo vivo etiquetado">
      <div className="fotos-section-head">
        <div>
          <p className="eyebrow">E2.6 · CONTRASTE</p>
          <h2>Cálculo vivo</h2>
        </div>
        <Badge tone="info" label="Actual" />
      </div>
      <p className="help">
        Cálculo vivo — no es la foto ni un cierre histórico. Se muestra
        separado y nunca sustituye a la fotografía ni completa sus bloques
        No disponible.
      </p>
      {contrasteCargando && (
        <Skeleton lines={3} label="Consultando cálculo vivo…" />
      )}
      {contrasteError && !contrasteCargando && (
        <ErrorBox
          failure={contrasteError}
          context="contraste"
          retry={reintentarContraste}
          focus={false}
        />
      )}
      {contraste && !contrasteCargando && !contrasteError && (
        <>
          <dl className="fotos-metrics">
            <div>
              <dt>Origen</dt>
              <dd>{contraste.origen}</dd>
            </div>
            <div>
              <dt>Motor</dt>
              <dd>{contraste.motor}</dd>
            </div>
            <div>
              <dt>Revisión</dt>
              <dd>{contraste.revision}</dd>
            </div>
            <div>
              <dt>Corte</dt>
              <dd>{date(contraste.corte)}</dd>
            </div>
            <div>
              <dt>Cobertura</dt>
              <dd>
                <Badge
                  tone={estadoTone(contraste.cobertura.estado)}
                  label={contraste.cobertura.estado}
                />
              </dd>
            </div>
            <div>
              <dt>Total certificado</dt>
              <dd>No · cálculo vivo</dd>
            </div>
          </dl>
          <p className="fotos-caveat" role="note">
            {contraste.etiqueta}. {contraste.cobertura.motivo} Total: no
            disponible; no se certifica.
          </p>
          {Object.keys(contraste.metricas).length ? (
            <ContrasteMetrics metricas={contraste.metricas} />
          ) : (
            <EmptyState title="Sin métricas vivas" icon="○">
              El motor no devolvió métricas; no se muestra 0.
            </EmptyState>
          )}
          {contraste.noDisponible.length > 0 && (
            <>
              <h3>No disponible en el cálculo vivo</h3>
              <ul className="fotos-list">
                {contraste.noDisponible.map((item) => (
                  <li key={item.clave}>
                    <strong>{TOTAL_LABELS[item.clave] ?? item.clave}</strong>{" "}
                    — {item.motivo}{" "}
                    <small className="fotos-code">{item.fuente}</small>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
