/**
 * Tablas de versiones y métricas del cálculo vivo de `/fotos`.
 */

import { Amount, Badge, DataList, Table, type TableColumn } from "../../ui";
import { utc } from "../format";
import { TOTAL_LABELS } from "../labels";
import { amountState, estadoTone } from "../states";
import type { ContrasteMetricaDto, VersionFotoDto } from "../types";

export function VersionesTable({
  versiones,
  seleccionada,
  onSelect,
}: {
  versiones: VersionFotoDto[];
  seleccionada: string;
  onSelect: (version: string) => void;
}) {
  const columns: TableColumn<VersionFotoDto>[] = [
    {
      id: "version",
      header: "Versión",
      cell: (item) => (
        <span className="fotos-badges">
          <strong>v{item.version}</strong>
          {item.esUltima && <Badge tone="info" label="Última" />}
        </span>
      ),
    },
    {
      id: "creado",
      header: "Creada",
      cell: (item) => utc(item.creadoUtc),
    },
    { id: "actor", header: "Actor", cell: (item) => item.actor },
    {
      id: "motivo",
      header: "Motivo",
      cell: (item) => item.motivo ?? "Sin motivo",
    },
    {
      id: "fingerprint",
      header: "Fingerprint",
      cell: (item) => (
        <code className="fotos-fingerprint" title={item.fingerprint}>
          {item.fingerprint}
        </code>
      ),
      card: "hidden",
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (item) => (
        <span className="fotos-badges">
          <Badge tone={estadoTone(item.estado)} label={item.estado} />
          <Badge
            tone={item.vigente ? "ok" : "nd"}
            label={item.vigente ? "Vigente" : "No vigente"}
          />
        </span>
      ),
    },
    {
      id: "accion",
      header: "Consulta",
      kind: "actions",
      cell: (item) => (
        <button
          className="secondary"
          type="button"
          aria-label={`Consultar la versión ${item.version}`}
          disabled={String(item.version) === seleccionada}
          onClick={() => onSelect(String(item.version))}
        >
          {String(item.version) === seleccionada
            ? "Seleccionada"
            : `Consultar v${item.version}`}
        </button>
      ),
    },
  ];
  return (
    <>
      <div className="desktop-list fotos-table">
        <Table
          caption="Versiones consultables de la foto"
          label="Tabla de versiones consultables"
          columns={columns}
          rows={versiones}
          rowKey={(item) => item.version}
        />
      </div>
      <DataList
        columns={columns}
        rows={versiones}
        rowKey={(item) => item.version}
        label="Versiones consultables móvil"
        className="mobile-list"
      />
    </>
  );
}

export function ContrasteMetrics({
  metricas,
}: {
  metricas: Record<string, ContrasteMetricaDto>;
}) {
  const rows = Object.entries(metricas);
  const columns: TableColumn<[string, ContrasteMetricaDto]>[] = [
    {
      id: "metrica",
      header: "Métrica",
      cell: ([clave]) => TOTAL_LABELS[clave] ?? clave,
    },
    {
      id: "valor",
      header: "Valor vivo",
      kind: "amount",
      cell: ([, metrica]) => (
        <Amount
          value={metrica.valor}
          subtotal={metrica.subtotal}
          state={amountState(metrica.estado)}
          note={metrica.estado}
        />
      ),
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: ([, metrica]) => (
        <Badge tone={estadoTone(metrica.estado)} label={metrica.estado} />
      ),
    },
    {
      id: "fuente",
      header: "Fuente",
      cell: ([, metrica]) => metrica.fuente,
    },
    {
      id: "cobertura",
      header: "Cobertura / motivo",
      cell: ([, metrica]) => (
        <>
          {metrica.cobertura}
          {metrica.motivo ? (
            <small className="fotos-code">{metrica.motivo}</small>
          ) : null}
        </>
      ),
    },
  ];
  return (
    <>
      <div className="desktop-list fotos-table">
        <Table
          caption="Métricas del cálculo vivo"
          label="Tabla de métricas del cálculo vivo"
          columns={columns}
          rows={rows}
          rowKey={([clave]) => clave}
        />
      </div>
      <DataList
        columns={columns}
        rows={rows}
        rowKey={([clave]) => clave}
        label="Métricas del cálculo vivo móvil"
        className="mobile-list"
      />
    </>
  );
}
