/**
 * Tablas y listas de cobertura y No disponible de `/fotos`.
 *
 * Presentación pura: no calcula importes ni normaliza ausencias.
 */

import { Badge, DataList, Table, type TableColumn } from "../../ui";
import { motivoTexto, TOTAL_LABELS } from "../labels";
import { estadoTone } from "../states";
import type { CoverageRow, NoDisponibleRow } from "../types";

export function CoverageTable({
  rows,
  label,
}: {
  rows: CoverageRow[];
  label: string;
}) {
  const columns: TableColumn<CoverageRow>[] = [
    {
      id: "bloque",
      header: "Bloque",
      cell: (row) => TOTAL_LABELS[row.bloque] ?? row.bloque,
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (row) => <Badge tone={estadoTone(row.estado)} label={row.estado} />,
    },
    {
      id: "motivo",
      header: "Motivo",
      cell: (row) =>
        row.motivo ? row.motivo : <span className="muted">Sin motivo</span>,
    },
  ];
  return (
    <>
      <div className="desktop-list fotos-table">
        <Table
          caption={label}
          label={label}
          columns={columns}
          rows={rows}
          rowKey={(row) => row.bloque}
        />
      </div>
      <DataList
        columns={columns}
        rows={rows}
        rowKey={(row) => row.bloque}
        label={label + " móvil"}
        className="mobile-list"
      />
    </>
  );
}

export function NoDisponibleList({ rows }: { rows: NoDisponibleRow[] }) {
  return (
    <ul className="fotos-list">
      {rows.map((row, index) => (
        <li key={`${row.ciclo ?? ""}:${row.version ?? ""}:${row.bloque}:${index}`}>
          <strong>
            {row.ciclo ? `${row.ciclo} · ` : ""}
            {TOTAL_LABELS[row.bloque] ?? row.bloque}
            {row.version !== undefined ? ` · v${row.version}` : ""}
          </strong>{" "}
          <Badge tone={estadoTone(row.estado)} label={row.estado} />{" "}
          <span>{row.motivo ?? "Sin motivo declarado"}</span>
        </li>
      ))}
    </ul>
  );
}

export function Motivo({ value }: { value: string | null }) {
  if (!value) return <span className="muted">Sin motivo declarado</span>;
  return (
    <>
      {motivoTexto(value)}
      <small className="fotos-code">{value}</small>
    </>
  );
}
