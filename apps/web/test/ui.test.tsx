import { readFileSync } from "node:fs";
import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Amount,
  Badge,
  DataList,
  EmptyState,
  Metric,
  Skeleton,
  Table,
  TableScroll,
  type TableColumn,
} from "../src/ui";

type SaldoRow = {
  id: string;
  nombre: string;
  saldo: string;
  estado: string;
};

const saldoColumns: TableColumn<SaldoRow>[] = [
  {
    id: "nombre",
    header: "Nombre",
    cell: (row) => row.nombre,
  },
  {
    id: "saldo",
    header: "Saldo",
    kind: "amount",
    width: "22%",
    cell: (row) => <Amount value={row.saldo} state="Verificado" />,
  },
  {
    id: "estado",
    header: "Estado",
    kind: "status",
    cell: (row) => <Badge tone="ok" label={row.estado} icon="✓" />,
  },
  {
    id: "acciones",
    header: "Acciones",
    kind: "actions",
    cell: (row) => <a href={`/saldos/${row.id}`}>Ver</a>,
  },
  {
    id: "interno",
    header: "Interno",
    card: "hidden",
    cell: (row) => row.id,
  },
];

const saldoRows: SaldoRow[] = [
  {
    id: "s1",
    nombre: "Cuenta principal",
    saldo: "1234.50",
    estado: "VERIFICADO",
  },
];

test("Amount distingue cero, miles, meses y negativos", () => {
  const zero = renderToStaticMarkup(
    <Amount value="0.00" state="Cero verificado" />,
  );
  expect(zero).toContain("0,00 €");
  expect(zero).toContain("Cero verificado");
  expect(zero).not.toContain("ui-amount-negative");

  expect(
    renderToStaticMarkup(<Amount value="1234567.89" state="Verificado" />),
  ).toContain("1.234.567,89 €");

  expect(
    renderToStaticMarkup(
      <Amount value="12.00" state="Verificado" unit="meses" />,
    ),
  ).toContain("12,00 meses");

  const negative = renderToStaticMarkup(
    <Amount value="-1234.50" state="Parcial" subtotal="-1234.50" />,
  );
  expect(negative).toContain("-1.234,50 €");
  expect(negative).toContain("ui-amount-negative");
  expect(negative).not.toContain("−");
});

test("Amount presenta null, ND, No aplica y Sin datos sin inventar ceros", () => {
  const unavailable = renderToStaticMarkup(
    <Amount value={null} state="No disponible" subtotal="1234.50" />,
  );
  expect(unavailable).toContain("ND");
  expect(unavailable).toContain("No disponible");
  expect(unavailable).toContain("Subtotal conocido 1.234,50 €");
  expect(unavailable).not.toContain("0,00 €");

  const notApplicable = renderToStaticMarkup(
    <Amount value={null} state="No aplica" />,
  );
  expect(notApplicable).toContain("No aplica");
  expect(notApplicable).toContain("—");
  expect(notApplicable).toContain("ui-amount-state");

  const noData = renderToStaticMarkup(
    <Amount value={null} state="Sin datos" />,
  );
  expect(noData).toContain("Sin datos");
  expect(noData).toContain("○");
});

test("Badge es único, textual y con tono", () => {
  const html = renderToStaticMarkup(
    <Badge
      tone="ok"
      label="VERIFICADO"
      icon="✓"
      estado="Verificado"
      kind="estado"
    />,
  );
  expect(html).toContain("ui-badge ui-badge-ok");
  expect(html).toContain('data-estado="Verificado"');
  expect(html).toContain('data-tipo="estado"');
  expect(html).toContain("VERIFICADO");
  expect(html).toContain("✓");
});

test("Skeleton anuncia carga y reserva la última línea corta", () => {
  const html = renderToStaticMarkup(<Skeleton lines={3} label="Cargando" />);
  expect(html.match(/ui-skeleton-line/g)?.length).toBe(3);
  expect(html).toContain("ui-skeleton-line short");
  expect(html).toContain('role="status"');
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain('aria-label="Cargando"');
});

test("EmptyState y Metric componen el vacío y la lectura principal", () => {
  const empty = renderToStaticMarkup(
    <EmptyState className="e47-empty-page" title="Sin datos" />,
  );
  expect(empty).toContain("ui-empty e47-empty-page");
  expect(empty).toContain("Sin datos");

  const metric = renderToStaticMarkup(
    <Metric
      title="Liquidez"
      clase="REAL"
      dataClase="real"
      ariaLabel="Liquidez"
      amount={<Amount value="0.00" state="Cero verificado" />}
      badge={<Badge tone="ok" label="CERO VERIFICADO" icon="✓" />}
    >
      <p>Detalle</p>
    </Metric>,
  );
  expect(metric).toContain('data-clase="real"');
  expect(metric).toContain('aria-label="Liquidez"');
  expect(metric).toContain("ui-metric-title");
  expect(metric).toContain("0,00 €");
  expect(metric).toContain("CERO VERIFICADO");
  expect(metric).toContain("Detalle");
});

test("Table expone caption accesible y la región rotulada de TableScroll", () => {
  const html = renderToStaticMarkup(
    <Table
      caption="Listado de saldos"
      label="Listado de saldos (desplazable)"
      columns={saldoColumns}
      rows={saldoRows}
      className="desktop-list"
    />,
  );
  expect(html).toContain('class="table-scroll"');
  expect(html).toContain('role="region"');
  expect(html).toContain('aria-label="Listado de saldos (desplazable)"');
  expect(html).toContain('tabindex="0"');
  expect(html).toContain('class="ui-table-caption sr-only"');
  expect(html).toContain("Listado de saldos</caption>");
  expect(html).toContain('class="ui-table-wrap desktop-list"');
  expect(html).toContain("Cuenta principal");
  expect(html).toContain("Interno");

  const visible = renderToStaticMarkup(
    <Table
      caption="Visible"
      label="Visible"
      columns={[]}
      rows={[]}
      captionVisible
    />,
  );
  expect(visible).toContain('<caption class="ui-table-caption">Visible</caption>');
});

test("Table alinea importes en th y td según el rol de la columna", () => {
  const html = renderToStaticMarkup(
    <Table
      caption="Listado de saldos"
      label="Listado de saldos (desplazable)"
      columns={saldoColumns}
      rows={saldoRows}
    />,
  );
  expect(html.match(/class="ui-table-amount"/g)?.length).toBe(2);
  expect(html).toMatch(/<th[^>]*class="ui-table-amount"[^>]*>Saldo<\/th>/);
  expect(html).toMatch(/<td[^>]*class="ui-table-amount"[^>]*>/);
  expect(html).toMatch(/<th[^>]*style="width:22%"[\s\S]*?>Saldo<\/th>/);
  expect(html).toContain('data-kind="amount"');
  expect(html).toContain('data-kind="status"');
  expect(html).toContain('data-kind="actions"');
  expect(html).toContain('data-kind="text"');
  expect(html).toContain("1.234,50 €");
});

test("DataList reproduce etiquetas, valores y acciones de las mismas columnas", () => {
  const html = renderToStaticMarkup(
    <DataList
      columns={saldoColumns}
      rows={saldoRows}
      label="Saldos en móvil"
      className="mobile-list"
    />,
  );
  expect(html).toContain('class="ui-data-list mobile-list"');
  expect(html).toContain('role="list"');
  expect(html).toContain('aria-label="Saldos en móvil"');
  for (const label of ["Nombre", "Saldo", "Estado", "Acciones"]) {
    expect(html).toContain(`data-label="${label}"`);
    expect(html).toContain(`class="ui-data-list-label">${label}</span>`);
  }
  expect(html).toContain("Cuenta principal");
  expect(html).toContain("1.234,50 €");
  expect(html).toContain("VERIFICADO");
  expect(html).toContain('href="/saldos/s1"');
  expect(html).toContain('data-kind="amount"');
  expect(html).not.toContain('data-label="Interno"');
});

test("TableScroll conserva el contrato de región enfocable", () => {
  const html = renderToStaticMarkup(
    <TableScroll label="Detalle">
      <p>Contenido</p>
    </TableScroll>,
  );
  expect(html).toBe(
    '<div class="table-scroll" role="region" aria-label="Detalle" tabindex="0"><p>Contenido</p></div>',
  );
});

test("El CSS de Table/DataList consume tokens y alinea los importes", () => {
  const css = readFileSync(
    new URL("../src/style.css", import.meta.url),
    "utf8",
  );
  const start = css.indexOf("/* UI · DEV-04 — tablas y listados");
  expect(start).toBeGreaterThan(-1);
  const section = css.slice(start);
  expect(section).toMatch(
    /\.ui-table th \{[^}]*background: var\(--table-head\)/,
  );
  expect(section).toMatch(
    /\.ui-table tbody tr:hover \{[^}]*background: var\(--surface-2\)/,
  );
  expect(section).toMatch(
    /\.ui-table-amount \{[^}]*text-align: right;[^}]*font-variant-numeric: tabular-nums;/,
  );
  expect(section).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
});
