import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ImporteCelda,
  NO_APLICA,
  NO_DISPONIBLE,
  ROTULO_ABONOS,
  aplicaColumna,
  textoValor,
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
  expect(renderToStaticMarkup(<EjecutadoCelda fuente="Gasto real" valor={null} />)).toContain(
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

test("F2A1-UI-05: ninguna celda rotula como GRE o flujo bancario una fila que no sea Gasto real", () => {
  for (const fuente of ["Aportación a saldo", "No aplica"]) {
    const e = renderToStaticMarkup(<EjecutadoCelda fuente={fuente} valor="40.00" />);
    expect(e).not.toContain(ROTULO_GRE);
    for (const rotulo of [ROTULO_FLUJO, ROTULO_ABONOS]) {
      const a = renderToStaticMarkup(
        <ImporteCelda fuente={fuente} columna="gasto" valor="40.00" rotulo={rotulo} />,
      );
      expect(a).not.toContain(rotulo);
    }
  }
  const g = renderToStaticMarkup(
    <ImporteCelda fuente="Gasto real" columna="gasto" valor="30.00" rotulo={ROTULO_ABONOS} />,
  );
  expect(g).toContain(ROTULO_ABONOS);
  expect(g).not.toContain(ROTULO_FLUJO);
  const bruto = renderToStaticMarkup(
    <ImporteCelda fuente="Gasto real" columna="gasto" valor="120.00" rotulo={ROTULO_FLUJO} />,
  );
  expect(bruto).toContain(ROTULO_FLUJO);
  expect(
    renderToStaticMarkup(<ImporteCelda fuente="Gasto real" columna="gasto" valor={null} rotulo={ROTULO_ABONOS} />),
  ).not.toContain(ROTULO_ABONOS);
});

test("F2A1-UI-09: el rótulo de abonos aclara que no es el flujo bancario completo y no usa «Flujo bancario bruto»", () => {
  expect(ROTULO_ABONOS).toBe("Abonos vinculados verificados (por fecha real)");
  expect(ROTULO_ABONOS).not.toContain("Flujo bancario");
  expect(NOTA_ATRIBUCION).toContain("no son el flujo bancario completo");
  expect(NOTA_ATRIBUCION).toContain("huérfanas");
});

test("F2A1-UI-10: «—» si la columna no aplica a la fuente y «No disponible» solo si aplica y no es verificable; cero no es ausencia", () => {
  expect(aplicaColumna("gasto", "Gasto real")).toBe(true);
  expect(aplicaColumna("gasto", "Aportación a saldo")).toBe(false);
  expect(aplicaColumna("gasto", "No aplica")).toBe(false);
  expect(aplicaColumna("ejecucion", "Aportación a saldo")).toBe(true);
  expect(aplicaColumna("ejecucion", "No aplica")).toBe(false);
  expect(NO_APLICA).toBe("—");
  expect(NO_DISPONIBLE).toBe("No disponible");
  expect(textoValor(null, false)).toBe("—");
  expect(textoValor(null, true)).toBe("No disponible");
  expect(textoValor("0.00", true)).toContain("0,00");
  // Gasto real con exceso: ejecutado null → No disponible (aplica y no verificable).
  expect(renderToStaticMarkup(<EjecutadoCelda fuente="Gasto real" valor={null} />)).toContain("No disponible");
  // No aplica: nunca «No disponible».
  const na = renderToStaticMarkup(<EjecutadoCelda fuente="No aplica" valor={null} />);
  expect(na).toContain("—");
  expect(na).not.toContain("No disponible");
  const bruto = renderToStaticMarkup(<ImporteCelda fuente="Aportación a saldo" columna="gasto" valor={null} />);
  expect(bruto).toContain("—");
  expect(bruto).not.toContain("No disponible");
  expect(
    renderToStaticMarkup(<ImporteCelda fuente="Gasto real" columna="gasto" valor={null} />),
  ).toContain("No disponible");
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
  expect(src("Dprima.tsx")).toContain("ImporteCelda");
  expect(src("Dprima.tsx")).toContain("EjecutadoCelda");
  expect(src("Dprima.tsx")).toContain("abonosVinculadosVerificados");
  expect(src("Dprima.tsx")).not.toContain("abonosBancarios");
  expect(src("PlanesCiclo.tsx")).toContain("EjecutadoCelda");
  expect(src("PlanesCiclo.tsx")).toContain("NOTA_DESVIACION");
  expect(src("PlanImpact.tsx")).toContain("rotuloEjecutado");
  expect(src("RepartoMensual.tsx")).toContain("rotuloEjecutado");
});

test("F2A1-UI-08: Dprima no usa cabecera agrupada que rotule GRE sobre columnas de todas las filas", async () => {
  const { readFileSync } = await import("node:fs");
  const d = readFileSync(new URL("../src/Dprima.tsx", import.meta.url), "utf8");
  expect(d).not.toContain("CabeceraEjecucionMensual");
  expect(d).toContain("<th>Ejecutado</th>");
  const r = readFileSync(new URL("../src/devolucion-rotulos.tsx", import.meta.url), "utf8");
  expect(r).not.toContain("colSpan");
});
