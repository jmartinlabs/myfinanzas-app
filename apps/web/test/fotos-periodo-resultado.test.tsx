import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PeriodoResultado } from "../src/fotos/components/periodo-resultado";
import type { FotoPeriodoDto } from "../src/fotos/types";

function periodo(porDefecto: boolean): FotoPeriodoDto {
  return {
    origen: "Foto",
    id: 1,
    tipo: "Trimestre",
    periodo: {
      ejercicio: 2026,
      trimestre: 1,
      inicio: "2026-01-01",
      fin: "2026-03-31",
    },
    seleccionAplicada: {
      regla: "P1-C/P4-A/P5-B",
      reglaPeriodo: "P3-B",
      porDefecto: true,
      solicitada: {},
      seleccion: { "1": 1 },
      porCiclo: [],
    },
    seleccionVersion: { version: "A1", porDefecto, regla: "P7-D" },
    identidad: {
      versionAgregado: "A1",
      fechaUtc: "2026-04-01T12:00:00.000Z",
      fingerprint: "a".repeat(64),
      versionApp: "0.0.0-fixture",
      versionEsquema: 27,
      actor: "usuario-unico",
      motivo: null,
    },
    composicion: [],
    cobertura: {
      estado: "Parcial",
      motivos: [],
      totalPeriodo: null,
      bloques: [],
    },
    valores: {
      totalPeriodo: null,
      motivoTotal: "SIN_REGLA_ADITIVA",
      porCiclo: [],
    },
    noDisponible: [],
  };
}

function render(porDefecto: boolean) {
  return renderToStaticMarkup(
    <PeriodoResultado
      data={periodo(porDefecto)}
      hrefCiclo={(ciclo) => `/fotos?ciclo=${ciclo}`}
      onAbrirCiclo={() => {}}
      hrefPeriodoId={(id) => `/fotos?id=${id}`}
      onAbrirId={() => {}}
    />,
  );
}

function renderData(data: FotoPeriodoDto) {
  return renderToStaticMarkup(
    <PeriodoResultado
      data={data}
      hrefCiclo={(ciclo) => `/fotos?ciclo=${ciclo}`}
      onAbrirCiclo={() => {}}
      hrefPeriodoId={(id) => `/fotos?id=${id}`}
      onAbrirId={() => {}}
    />,
  );
}

test("una consulta por identidad no se etiqueta como última automática", () => {
  const html = render(false);
  expect(html).toContain("Consulta explícita");
  expect(html).not.toContain("Última automática");
});

test("solo la consulta automática de la última versión usa su etiqueta", () => {
  const html = render(true);
  expect(html).toContain("Última automática");
  expect(html).not.toContain("Consulta explícita");
});

test("noDisponible null se rotula no informado sin recorrerlo ni inventar filas", () => {
  const html = renderData({ ...periodo(true), noDisponible: null });
  expect(html).toContain("No informado");
  expect(html).not.toContain("Sin bloques No disponible declarados");
});

test("una fila sintética muestra codigoAusencia sin ocultar el motivo", () => {
  const html = renderData({
    ...periodo(true),
    noDisponible: [
      {
        ciclo: "1",
        versionFoto: 1,
        bloque: "valoracion",
        estado: "No disponible",
        motivo: "Bloque no disponible en la foto",
        codigoAusencia: "NULO_EXPLICITO",
      },
    ],
  });
  expect(html).toContain("NULO_EXPLICITO");
  expect(html).toContain("Bloque no disponible en la foto");
});
