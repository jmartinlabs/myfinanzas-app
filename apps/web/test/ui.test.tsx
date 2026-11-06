import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Amount, Badge, EmptyState, Metric, Skeleton } from "../src/ui";

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
