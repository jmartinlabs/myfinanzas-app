import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AnnulSaleMotivo } from "../src/Ventas";
import { AnnulPurchaseMotivo } from "../src/Inversiones";
import { CycleOperationMotivo } from "../src/Ciclos";

const message = "Motivo obligatorio.";

const cases = [
  {
    name: "anulación de venta",
    render: (error: string) =>
      renderToStaticMarkup(
        <AnnulSaleMotivo value="" onChange={() => {}} error={error} />,
      ),
  },
  {
    name: "anulación de compra",
    render: (error: string) =>
      renderToStaticMarkup(
        <AnnulPurchaseMotivo value="" onChange={() => {}} error={error} />,
      ),
  },
  {
    name: "operación de ciclo",
    render: (error: string) =>
      renderToStaticMarkup(
        <CycleOperationMotivo value="" onChange={() => {}} error={error} />,
      ),
  },
];

for (const item of cases) {
  test(`El motivo de ${item.name} asocia error, descripción e invalidación`, () => {
    const html = item.render(message);
    expect(html).toContain('id="motivo"');
    expect(html).toContain('for="motivo"');
    expect(html).toContain('id="motivo-error"');
    expect(html).toContain('aria-describedby="motivo-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(message);

    const clean = item.render("");
    expect(clean).toContain('id="motivo"');
    expect(clean).toContain('id="motivo-error"');
    expect(clean).toContain('aria-invalid="false"');
    expect(clean).not.toContain('aria-describedby="motivo-error"');
  });
}

test("La operación de ciclo conserva el textarea de motivo y su límite", () => {
  const html = renderToStaticMarkup(
    <CycleOperationMotivo value="" onChange={() => {}} error={message} />,
  );
  expect(html).toContain('aria-label="Motivo *"');
  expect(html).toContain('maxLength="1000"');
  expect(html).toContain("<textarea");
});
