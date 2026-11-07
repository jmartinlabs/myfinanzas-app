/**
 * Resumen de una foto persistida y tarjeta de comparación de `/fotos`.
 */

import { Badge, EmptyState } from "../../ui";
import { countPhrase, coverageState, property } from "../data";
import { date, money, utc } from "../format";
import type { FotoCicloDto, FotoPersistida } from "../types";

export function PhotoSummary({ foto }: { foto: FotoPersistida }) {
  const rows = [
    { label: "Ciclo", value: foto.ciclo },
    { label: "Versión", value: `v${foto.version}` },
    {
      label: "Ventana",
      value: `${date(foto.ventana.inicio)} → ${date(foto.ventana.fin)}`,
    },
    { label: "Saldo inicial (S0)", value: money(foto.ventana.saldoInicial) },
    { label: "Creada", value: utc(foto.creadoUtc) },
    { label: "Actor", value: foto.actor },
    { label: "App / esquema", value: `${foto.appVersion} · ${foto.schemaVersion}` },
    {
      label: "Hechos",
      value: `${foto.estadoHechos} · ${countPhrase(
        property(foto.hechos, "movimientos"),
        "movimiento",
        "movimientos",
      )}`,
    },
    {
      label: "Plan",
      value: `${foto.estadoPlan} · ${countPhrase(
        property(foto.plan, "items"),
        "línea",
        "líneas",
      )}`,
    },
    { label: "Cobertura", value: coverageState(foto.cobertura) },
  ];
  return (
    <dl className="fotos-metrics">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
      <div>
        <dt>Fingerprint</dt>
        <dd>
          <code className="fotos-fingerprint" title={foto.fingerprint}>
            {foto.fingerprint}
          </code>
        </dd>
      </div>
      <div>
        <dt>Motivo</dt>
        <dd>{foto.motivo ?? "Sin motivo declarado"}</dd>
      </div>
    </dl>
  );
}

export function ComparisonCard({
  foto,
  etiqueta,
}: {
  foto: FotoCicloDto;
  etiqueta: string;
}) {
  const persistida = foto.foto;
  if (!persistida)
    return (
      <article className="fotos-compare-card">
        <h3>{etiqueta}</h3>
        <EmptyState title="Sin foto" icon="○">
          Esta versión no devolvió una fotografía persistida.
        </EmptyState>
      </article>
    );
  return (
    <article className="fotos-compare-card" aria-label={etiqueta}>
      <div className="fotos-section-head">
        <h3>
          {etiqueta} · v{persistida.version}
        </h3>
        <Badge
          tone={foto.vigente ? "ok" : "partial"}
          label={foto.vigente ? "Vigente" : "No vigente"}
        />
      </div>
      <PhotoSummary foto={persistida} />
      <p className="help">
        Solo lectura. La comparación no recalcula importes ni certifica
        equivalencia.
      </p>
    </article>
  );
}
