import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CabeceraEjecucionMensual,
  EjecutadoCelda,
  NOTA_ATRIBUCION,
  NOTA_DESVIACION,
  ROTULO_FLUJO,
  ROTULO_GRE,
  rotuloEjecutado,
  textoCobertura,
} from "../src/devolucion-rotulos";

/** #538 · F2a-1 · rótulos mínimos de SPEC39 §2.3 (Ejecutado = GRE; flujo bancario aparte). */

test("F2A1-UI-01: los rótulos son los de SPEC39 §2.3", () => {
  expect(ROTULO_GRE).toBe("Gasto real económico (neto)");
  expect(ROTULO_FLUJO).toBe("Flujo bancario bruto");
});

test("F2A1-UI-02: solo Gasto real se rotula como GRE; Aportación a saldo y No aplica no cambian de magnitud", () => {
  expect(rotuloEjecutado("Gasto real")).toBe(ROTULO_GRE);
  expect(rotuloEjecutado("Aportación a saldo")).toBeNull();
  expect(rotuloEjecutado("No aplica")).toBeNull();
  expect(rotuloEjecutado(undefined)).toBeNull();
});

test("F2A1-UI-03: la celda Ejecutado de Gasto real lleva «Gasto real económico (neto)»; la de Aportación solo el importe", () => {
  const gre = renderToStaticMarkup(<EjecutadoCelda fuente="Gasto real" valor="90.00" />);
  expect(gre).toContain("90,00");
  expect(gre).toContain(ROTULO_GRE);
  const aportacion = renderToStaticMarkup(<EjecutadoCelda fuente="Aportación a saldo" valor="40.00" />);
  expect(aportacion).toContain("40,00");
  expect(aportacion).not.toContain(ROTULO_GRE);
  // Cero con hechos se pinta 0,00; ausencia se pinta como no disponible, nunca como cero.
  expect(renderToStaticMarkup(<EjecutadoCelda fuente="Gasto real" valor="0.00" />)).toContain("0,00");
  expect(renderToStaticMarkup(<EjecutadoCelda fuente="Gasto real" valor={null} vacio="No disponible" />)).toContain(
    "No disponible",
  );
});

test("F2A1-UI-04: la cobertura parcial declara sus causas y la completa no añade ruido", () => {
  expect(textoCobertura("Completa", [])).toBeNull();
  expect(textoCobertura("Parcial", ["sinAcreditacion", "revisar"])).toBe(
    "Cobertura parcial: sin acreditar, vínculo en revisión",
  );
  const html = renderToStaticMarkup(
    <EjecutadoCelda fuente="Gasto real" valor="120.00" cobertura="Parcial" causas={["sinAcreditacion"]} />,
  );
  expect(html).toContain("Cobertura parcial: sin acreditar");
});

test("F2A1-UI-05: la cabecera agrupada de Dprima pone el flujo bancario y el GRE sobre sus columnas", () => {
  const html = renderToStaticMarkup(
    <table>
      <thead>
        <CabeceraEjecucionMensual antes={6} />
      </thead>
    </table>,
  );
  expect(html).toContain(`<th colSpan="6"></th>`);
  expect(html).toContain(`<th colSpan="2">${ROTULO_FLUJO}</th>`);
  expect(html).toContain(`<th colSpan="2">${ROTULO_GRE}</th>`);
});

test("F2A1-UI-06: las notas no traducen presupuesto − GRE a disponibilidad y separan el abono bancario por fecha", () => {
  expect(NOTA_DESVIACION).toContain("no dinero disponible");
  expect(NOTA_DESVIACION).toContain("no habilita");
  expect(NOTA_ATRIBUCION).toContain("aunque el abono llegue en otro ciclo");
  expect(NOTA_ATRIBUCION).toContain("fecha real");
});

test("F2A1-UI-07: los cuatro lectores de «Ejecutado» de Plan de ciclo y Dprima usan los rótulos compartidos", async () => {
  const { readFileSync } = await import("node:fs");
  const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
  expect(src("Dprima.tsx")).toContain("CabeceraEjecucionMensual");
  expect(src("Dprima.tsx")).toContain("EjecutadoCelda");
  expect(src("Dprima.tsx")).toContain("abonosBancarios");
  expect(src("PlanesCiclo.tsx")).toContain("EjecutadoCelda");
  expect(src("PlanesCiclo.tsx")).toContain("NOTA_DESVIACION");
  expect(src("PlanImpact.tsx")).toContain("rotuloEjecutado");
  expect(src("RepartoMensual.tsx")).toContain("rotuloEjecutado");
});
