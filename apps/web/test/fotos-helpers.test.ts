import { describe, expect, test } from "bun:test";
import { ApiError } from "../src/api";
import {
  countPhrase,
  coverageRows,
  coverageState,
  noDisponibleRows,
  periodNoDisponibleRows,
  property,
} from "../src/fotos/data";
import { failureFrom, failureMessage } from "../src/fotos/errors";
import { date, money, utc } from "../src/fotos/format";
import { MOTIVO_LABELS, motivoTexto, TOTAL_LABELS } from "../src/fotos/labels";
import { amountState, estadoTone } from "../src/fotos/states";
import type { Failure, Vista } from "../src/fotos/types";
import {
  seleccionComparacionVersion,
  versionExiste,
  vistaDesdePath,
  vistaUrl,
} from "../src/fotos/view";

describe("formato de importes y fechas", () => {
  test("money conserva null, undefined y textos no numéricos", () => {
    expect(money(null)).toBe("No disponible");
    expect(money(undefined)).toBe("No disponible");
    expect(money("")).toBe("");
    expect(money("Sin dato")).toBe("Sin dato");
  });

  test("money formatea importes publicados sin convertirlos a number", () => {
    expect(money("0")).toBe("0,00 €");
    expect(money("1234.5")).toBe("1.234,50 €");
    expect(money("-12.34")).toBe("-12,34 €");
    expect(money("12.345")).toBe("12,345 €");
  });

  test("date muestra fechas civiles y ausencias sin inventar día", () => {
    expect(date(null)).toBe("No disponible");
    expect(date(undefined)).toBe("No disponible");
    expect(date("")).toBe("No disponible");
    expect(date("2026-01-31")).toBe("31/01/2026");
  });

  test("utc normaliza instantes válidos y conserva los inválidos", () => {
    expect(utc(null)).toBe("No disponible");
    expect(utc("2027-06-15T12:00:00Z")).toBe("2027-06-15 12:00 UTC");
    expect(utc("2027-06-15T12:34:56.000Z")).toBe("2027-06-15 12:34 UTC");
    expect(utc("no-es-fecha")).toBe("no-es-fecha");
  });

  test("countPhrase distingue singular, plural y ausencia", () => {
    expect(countPhrase(undefined, "movimiento", "movimientos")).toBe(
      "No disponible",
    );
    expect(countPhrase([], "movimiento", "movimientos")).toBe("0 movimientos");
    expect(countPhrase(["uno"], "movimiento", "movimientos")).toBe(
      "1 movimiento",
    );
    expect(countPhrase(["uno", "dos"], "movimiento", "movimientos")).toBe(
      "2 movimientos",
    );
  });
});

describe("etiquetas y estados", () => {
  test("motivoTexto traduce códigos conocidos y respeta los desconocidos", () => {
    expect(motivoTexto(null)).toBe("Sin motivo declarado");
    expect(motivoTexto(undefined)).toBe("Sin motivo declarado");
    expect(motivoTexto("")).toBe("Sin motivo declarado");
    expect(motivoTexto("SIN_CIERRE")).toBe(MOTIVO_LABELS.SIN_CIERRE);
    expect(motivoTexto("CODIGO_NUEVO")).toBe("CODIGO_NUEVO");
  });

  test("TOTAL_LABELS conserva las etiquetas publicadas", () => {
    expect(TOTAL_LABELS.valoracion).toBe("Valoración / patrimonio");
    expect(TOTAL_LABELS.neto).toBe("Neto ingreso − gasto");
    expect(TOTAL_LABELS.e35).toBe("E3.5 / FIN_NETA");
  });

  test("estadoTone prioriza no disponible, parcial y correcto", () => {
    expect(estadoTone("No disponible")).toBe("nd");
    expect(estadoTone("SinFoto")).toBe("nd");
    expect(estadoTone("No vigente")).toBe("nd");
    expect(estadoTone("No certificado")).toBe("nd");
    expect(estadoTone("Parcial")).toBe("partial");
    expect(estadoTone("PendienteReCierre")).toBe("partial");
    expect(estadoTone("ExcluidoSinCierre")).toBe("partial");
    expect(estadoTone("Disponible")).toBe("ok");
    expect(estadoTone("Verificado")).toBe("ok");
    expect(estadoTone("Incluido")).toBe("ok");
    expect(estadoTone("Otro estado")).toBe("info");
  });

  test("amountState acepta los estados exactos y normaliza variantes", () => {
    expect(amountState("Verificado")).toBe("Verificado");
    expect(amountState("Cero verificado")).toBe("Cero verificado");
    expect(amountState("Parcial")).toBe("Parcial");
    expect(amountState("No disponible")).toBe("No disponible");
    expect(amountState("No aplica")).toBe("No aplica");
    expect(amountState("Sin datos")).toBe("Sin datos");
    expect(amountState("verificado parcial")).toBe("Verificado");
    expect(amountState("Parcialmente")).toBe("Parcial");
    expect(amountState("NoDisponible")).toBe("No disponible");
    expect(amountState("otro")).toBe("Sin datos");
  });
});

describe("vista y URL", () => {
  test("vistaDesdePath usa defaults seguros y el trimestre actual", () => {
    const vista = vistaDesdePath("/fotos");
    expect(vista).toEqual({
      modo: "ciclo",
      ciclo: "",
      version: "",
      ejercicio: String(new Date().getFullYear()),
      trimestre: String(Math.floor(new Date().getMonth() / 3) + 1),
      versionAgregado: "",
      periodoId: "",
    });
  });

  test("vistaDesdePath acepta el alias tipo y valida el trimestre", () => {
    expect(vistaDesdePath("/fotos?tipo=Anio&ejercicio=2026")).toMatchObject({
      modo: "Anio",
      ejercicio: "2026",
    });
    expect(
      vistaDesdePath("/fotos?modo=Trimestre&trimestre=9"),
    ).toMatchObject({ modo: "Trimestre", trimestre: "1" });
    expect(vistaDesdePath("/fotos?modo=Otro")).toMatchObject({ modo: "ciclo" });
    expect(
      vistaDesdePath(
        "/fotos?modo=Trimestre&trimestre=4&ejercicio=2025&versionAgregado=A2&id=9",
      ),
    ).toEqual({
      modo: "Trimestre",
      ciclo: "",
      version: "",
      ejercicio: "2025",
      trimestre: "4",
      versionAgregado: "A2",
      periodoId: "9",
    });
  });

  test("vistaDesdePath no interpreta una query sin interrogante", () => {
    expect(vistaDesdePath("modo=Trimestre")).toMatchObject({ modo: "ciclo" });
  });

  test("vistaUrl construye las tres variantes de consulta", () => {
    const base: Vista = {
      modo: "ciclo",
      ciclo: "1",
      version: "2",
      ejercicio: "2026",
      trimestre: "3",
      versionAgregado: "A1",
      periodoId: "9",
    };
    expect(vistaUrl(base)).toBe("/fotos?modo=ciclo&ciclo=1&version=2");
    expect(
      vistaUrl({ ...base, modo: "ciclo", ciclo: "", version: "" }),
    ).toBe("/fotos?modo=ciclo");
    expect(vistaUrl({ ...base, modo: "Trimestre" })).toBe(
      "/fotos?modo=Trimestre&id=9",
    );
    expect(
      vistaUrl({ ...base, modo: "Trimestre", periodoId: "" }),
    ).toBe(
      "/fotos?modo=Trimestre&ejercicio=2026&trimestre=3&versionAgregado=A1",
    );
    expect(
      vistaUrl({
        ...base,
        modo: "Anio",
        periodoId: "",
        versionAgregado: "",
      }),
    ).toBe("/fotos?modo=Anio&ejercicio=2026");
  });

  test("vistaUrl y vistaDesdePath conservan una consulta de ciclo", () => {
    const vista: Vista = {
      modo: "ciclo",
      ciclo: "Ciclo 1",
      version: "3",
      ejercicio: "2026",
      trimestre: "2",
      versionAgregado: "",
      periodoId: "",
    };
    expect(vistaDesdePath(vistaUrl(vista))).toMatchObject({
      modo: "ciclo",
      ciclo: "Ciclo 1",
      version: "3",
    });
  });
});

describe("selección de versiones", () => {
  const versiones = [{ version: 3 }, { version: 1 }, { version: 2 }];

  test("versionExiste compara la versión como texto exacto", () => {
    expect(versionExiste(null, "1")).toBe(false);
    expect(versionExiste([], "1")).toBe(false);
    expect(versionExiste(versiones, "1")).toBe(true);
    expect(versionExiste(versiones, "01")).toBe(false);
    expect(versionExiste(versiones, "9")).toBe(false);
  });

  test("la selección A/B se limpia con menos de dos versiones", () => {
    expect(seleccionComparacionVersion(null, "1", "primera")).toBe("");
    expect(seleccionComparacionVersion([], "1", "primera")).toBe("");
    expect(seleccionComparacionVersion([{ version: 3 }], "3", "primera")).toBe(
      "",
    );
    expect(seleccionComparacionVersion([{ version: 3 }], "", "ultima")).toBe(
      "",
    );
  });

  test("la selección A/B conserva elecciones válidas y usa los extremos", () => {
    expect(seleccionComparacionVersion(versiones, "", "primera")).toBe("1");
    expect(seleccionComparacionVersion(versiones, "", "ultima")).toBe("3");
    expect(seleccionComparacionVersion(versiones, "2", "primera")).toBe("2");
    expect(seleccionComparacionVersion(versiones, "2", "ultima")).toBe("2");
    expect(seleccionComparacionVersion(versiones, "9", "primera")).toBe("1");
    expect(seleccionComparacionVersion(versiones, "9", "ultima")).toBe("3");
  });
});

describe("normalización de errores", () => {
  test("failureFrom conserva los campos públicos de ApiError", () => {
    expect(
      failureFrom(
        new ApiError(
          422,
          "Datos inválidos",
          { ejercicio: "Requerido" },
          { code: "VALIDATION", requestId: "req-1" },
        ),
      ),
    ).toEqual({
      status: 422,
      code: "VALIDATION",
      message: "Datos inválidos",
      fields: { ejercicio: "Requerido" },
      requestId: "req-1",
    });
    expect(
      failureFrom(new ApiError(404, "No existe", {}, { code: "NOT_FOUND" })),
    ).toEqual({
      status: 404,
      code: "NOT_FOUND",
      message: "No existe",
      fields: {},
      requestId: undefined,
    });
  });

  test("failureFrom normaliza errores desconocidos sin inventar status", () => {
    expect(failureFrom(new Error("boom"))).toEqual({
      status: 0,
      code: "",
      message: "boom",
      fields: {},
    });
    expect(failureFrom("texto")).toEqual({
      status: 0,
      code: "",
      message: "No se pudo completar la consulta.",
      fields: {},
    });
  });

  test("failureMessage conserva los textos por estado y contexto", () => {
    const base: Failure = { status: 500, code: "", message: "", fields: {} };
    expect(failureMessage({ ...base, status: 401 }, "foto")).toBe(
      "La sesión ha caducado. Vuelve a identificarte; no se muestran importes ni fotos parciales.",
    );
    expect(failureMessage({ ...base, status: 404 }, "foto")).toBe(
      "No existe la foto o la versión solicitada. No se ha caído a otra versión en silencio.",
    );
    expect(failureMessage({ ...base, status: 404 }, "periodo")).toBe(
      "No se encontró el recurso solicitado.",
    );
    expect(
      failureMessage({ ...base, status: 422, message: "Campos" }, "foto"),
    ).toBe("Campos");
    expect(failureMessage({ ...base, status: 422 }, "foto")).toBe(
      "Revisa los campos de la consulta.",
    );
    expect(failureMessage({ ...base, status: 0 }, "foto")).toBe(
      "No se pudo conectar con la API. La selección se conserva; no se inventan datos.",
    );
    expect(
      failureMessage({ ...base, status: 500, message: "Fallo" }, "foto"),
    ).toBe("Fallo");
    expect(failureMessage({ ...base, status: 500 }, "foto")).toBe(
      "No se pudo completar la consulta.",
    );
  });
});

describe("lectura defensiva de datos", () => {
  test("property devuelve el campo de un objeto y undefined en el resto", () => {
    expect(property({ movimientos: [1, 2] }, "movimientos")).toEqual([1, 2]);
    expect(property(null, "movimientos")).toBeUndefined();
    expect(property("texto", "movimientos")).toBeUndefined();
    expect(property([], "movimientos")).toBeUndefined();
  });

  test("coverageState exige un estado textual", () => {
    expect(coverageState({ estado: "Completo" })).toBe("Completo");
    expect(coverageState({ estado: 1 })).toBe("No disponible");
    expect(coverageState(null)).toBe("No disponible");
    expect(coverageState([])).toBe("No disponible");
  });

  test("coverageRows lee totales y descarta entradas no utilizables", () => {
    expect(coverageRows(null)).toEqual([]);
    expect(coverageRows({ totales: [] })).toEqual([]);
    expect(
      coverageRows({
        totales: {
          efectivo: { estado: "Completo", motivo: "ok" },
          roto: null,
          valoracion: {},
        },
      }),
    ).toEqual([
      { bloque: "efectivo", estado: "Completo", motivo: "ok" },
      { bloque: "valoracion", estado: "No disponible", motivo: "" },
    ]);
  });

  test("noDisponibleRows normaliza arrays sin inventar bloque ni motivo", () => {
    expect(noDisponibleRows("texto")).toEqual([]);
    expect(
      noDisponibleRows([
        {
          bloque: "efectivo",
          estado: "No disponible",
          motivo: "SIN_EVIDENCIA",
          ciclo: "1",
          versionFoto: 2,
        },
        null,
        { estado: 1 },
      ]),
    ).toEqual([
      {
        bloque: "efectivo",
        estado: "No disponible",
        motivo: "SIN_EVIDENCIA",
      },
      { bloque: "2", estado: "No disponible", motivo: null },
    ]);
  });

  test("noDisponibleRows normaliza objetos y conserva claves sin detalle", () => {
    expect(
      noDisponibleRows({
        efectivo: { estado: "No disponible", motivo: "SIN_EVIDENCIA" },
        valoracion: null,
        plan: { estado: 3, motivo: 4 },
      }),
    ).toEqual([
      {
        bloque: "efectivo",
        estado: "No disponible",
        motivo: "SIN_EVIDENCIA",
      },
      { bloque: "valoracion", estado: "No disponible", motivo: null },
      { bloque: "plan", estado: "No disponible", motivo: null },
    ]);
  });

  test("periodNoDisponibleRows añade ciclo y versión de la foto", () => {
    expect(
      periodNoDisponibleRows([
        {
          ciclo: "1",
          versionFoto: 2,
          bloque: "efectivo",
          estado: "No disponible",
          motivo: "SIN_EVIDENCIA",
        },
      ]),
    ).toEqual([
      {
        bloque: "efectivo",
        estado: "No disponible",
        motivo: "SIN_EVIDENCIA",
        ciclo: "1",
        version: 2,
      },
    ]);
    expect(periodNoDisponibleRows([])).toEqual([]);
  });

  test("periodNoDisponibleRows(null) no recorre ni inventa filas", () => {
    expect(periodNoDisponibleRows(null)).toEqual([]);
  });

  test("periodNoDisponibleRows conserva codigoAusencia solo cuando existe", () => {
    expect(
      periodNoDisponibleRows([
        {
          ciclo: "1",
          versionFoto: 2,
          bloque: "valoracion",
          estado: "No disponible",
          motivo: "Bloque no disponible en la foto",
          codigoAusencia: "NULO_EXPLICITO",
        },
        {
          ciclo: "1",
          versionFoto: 2,
          bloque: "conciliaciones",
          estado: "No disponible",
          motivo: "Motivo persistido.",
        },
      ]),
    ).toEqual([
      {
        bloque: "valoracion",
        estado: "No disponible",
        motivo: "Bloque no disponible en la foto",
        codigoAusencia: "NULO_EXPLICITO",
        ciclo: "1",
        version: 2,
      },
      {
        bloque: "conciliaciones",
        estado: "No disponible",
        motivo: "Motivo persistido.",
        ciclo: "1",
        version: 2,
      },
    ]);
  });
});
