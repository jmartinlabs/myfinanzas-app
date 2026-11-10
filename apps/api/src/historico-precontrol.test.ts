import { describe, expect, test } from "bun:test";
import {
  combinarHistoricoPrecontrol,
  compararTransicion,
  ErrorPrecontrol,
  huecosDeCobertura,
  intervalosUnidos,
  resolverVersiones,
  type EntradaPrecontrol,
  type FuentePrecontrol,
  type MovimientoPrecontrol,
  type RegistroPrecontrol,
  type UniversoPrecontrol,
} from "./historico-precontrol";

/**
 * Fixtures SINTÉTICOS basados en F-DT7-01…25.
 *
 * - No son datos reales, no se ejecutan contra una base de datos y no acreditan
 *   DT7 ni ningún total real. Los resultados aquí comprobados son propiedades
 *   del motor puro, no PASS de los AC de E4.5.
 * - Cada escenario es autocontenido y no se acumula con otros.
 */

function registro(
  idArchivo: string,
  cambios: Partial<RegistroPrecontrol> = {},
): RegistroPrecontrol {
  return {
    idArchivo,
    identidad: `IDENTIDAD-${idArchivo}`,
    fuenteId: "SRC-1",
    ejercicio: 2026,
    clase: "GastoHistorico",
    intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
    partidaId: "PAR100",
    referenciaId: null,
    saldoId: null,
    importeCentimos: "0",
    fecha: null,
    huellaContenido: `HUELLA-${idArchivo}`,
    estadoVerificacion: "Verificado",
    estadoMapeo: "Mapeado",
    estadoMapeoReferencia: "NoAplica",
    representadoEnMovimientos: "No",
    evidenciaRepresentacion: "Evidencia de identidad/origen sintética.",
    evidenciaNoDuplicidad: null,
    evidenciaRegularizacion: null,
    version: 1,
    reemplazaA: null,
    motivo: null,
    ...cambios,
  };
}

function fuente(cambios: Partial<FuentePrecontrol> = {}): FuentePrecontrol {
  return {
    fuenteId: "SRC-1",
    etiqueta: "Fuente sintética SRC-1",
    alcance: "Global",
    corteArchivo: "2026-12-31",
    intervalosArchivo: [],
    controlDetalle: null,
    versionMapping: "v1",
    ...cambios,
  };
}

function movimiento(
  idMovimiento: string,
  cambios: Partial<MovimientoPrecontrol> = {},
): MovimientoPrecontrol {
  return {
    idMovimiento,
    partidaId: "PAR100",
    fecha: "2026-09-01",
    importeCentimos: "30000",
    tipo: "Gasto",
    anulado: false,
    vinculoArchivoId: null,
    ...cambios,
  };
}

function universo(
  partidas: string[],
  fuentesEsperadas: UniversoPrecontrol["fuentesEsperadas"] = partidas.map(
    (partidaId) => ({
      fuenteId: "SRC-1",
      partidaId,
      estado: "Presente" as const,
      intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
    }),
  ),
): UniversoPrecontrol {
  return { estado: "Acreditado", partidas, fuentesEsperadas };
}

const archivo = (
  inicio: string,
  fin: string,
  partidaId = "PAR100",
  clase: "GastoHistorico" | "Regularizacion2026" = "GastoHistorico",
) => ({
  intervalo: { inicio, fin },
  partidaId,
  clase,
});

function entrada(cambios: Partial<EntradaPrecontrol> = {}): EntradaPrecontrol {
  return {
    ejercicio: 2026,
    corte: "2026-12-31",
    hoy: "2027-01-15",
    universo: universo(["PAR100"]),
    fuentes: [
      fuente({
        intervalosArchivo: [archivo("2026-01-01", "2026-08-27")],
        controlDetalle: { inicio: "2026-08-28", fin: "2026-12-31" },
      }),
    ],
    registros: [
      registro("AH001", {
        intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
        importeCentimos: "120000",
      }),
    ],
    movimientos: [movimiento("MV001")],
    ...cambios,
  };
}

function item(resultado: ReturnType<typeof combinarHistoricoPrecontrol>, partida = "PAR100") {
  const encontrado = resultado.items.find((actual) => actual.partidaId === partida);
  expect(encontrado).toBeDefined();
  return encontrado!;
}

describe("intervalos civiles inclusivos", () => {
  test("une intervalos contiguos y separa los que dejan un día de hueco", () => {
    expect(
      intervalosUnidos([
        { inicio: "2026-01-01", fin: "2026-01-31" },
        { inicio: "2026-02-01", fin: "2026-02-28" },
      ]),
    ).toEqual([{ inicio: "2026-01-01", fin: "2026-02-28" }]);
    expect(
      huecosDeCobertura(
        [
          { inicio: "2026-01-01", fin: "2026-01-30" },
          { inicio: "2026-02-01", fin: "2026-02-28" },
        ],
        "2026-01-01",
        "2026-02-28",
      ),
    ).toEqual([{ inicio: "2026-01-31", fin: "2026-01-31" }]);
  });
});

describe("F-DT7-01 · archivo y detalle contiguos", () => {
  test("suma una sola vez con corte inclusivo y alcance anual", () => {
    const resultado = combinarHistoricoPrecontrol(entrada());
    const par100 = item(resultado);

    expect(par100.archivo).toBe("1200.00");
    expect(par100.detalleControl).toBe("300.00");
    expect(par100.detallePrecontrolVinculado).toBeNull();
    expect(par100.detallePrecontrolNoVinculado).toBeNull();
    expect(par100.total).toBe("1500.00");
    expect(par100.subtotalConocido).toBe("1500.00");
    expect(par100.estadoCobertura).toBe("Completa");
    expect(par100.estadoTotal).toBe("Verificado");
    expect(resultado.alcanceTotal).toBe("Anual");
    expect(resultado.cobertura.huecos).toEqual([]);
    expect(resultado.totales.valor).toBe("1500.00");
    expect(resultado.totales.estadoTotal).toBe("Verificado");
  });

  test("AC-08: el 27/08 solo tiene archivo y el 28/08 incorpora el detalle", () => {
    const hasta27 = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-08-27",
        movimientos: [movimiento("MV001", { fecha: "2026-08-28" })],
      }),
    );
    const hasta28 = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-08-28",
        movimientos: [movimiento("MV001", { fecha: "2026-08-28" })],
      }),
    );

    expect(item(hasta27).total).toBe("1200.00");
    expect(item(hasta27).detalleControl).toBeNull();
    expect(hasta27.alcanceTotal).toBe("HastaCorte");
    expect(item(hasta28).detalleControl).toBe("300.00");
    expect(item(hasta28).total).toBe("1500.00");
    expect(hasta28.alcanceTotal).toBe("HastaCorte");
  });
});

describe("F-DT7-02 · hueco de un mes", () => {
  test("no certifica el total y conserva el subtotal conocido", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-06-30")],
            controlDetalle: { inicio: "2026-08-01", fin: "2026-12-31" },
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
            importeCentimos: "90000",
          }),
        ],
      }),
    );
    const par100 = item(resultado);

    expect(par100.estadoCobertura).toBe("Parcial");
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBe("1200.00");
    expect(par100.motivoCodigo).toBe("HuecoDemostrado");
    expect(resultado.cobertura.huecos).toEqual([
      { inicio: "2026-07-01", fin: "2026-07-31", partidaId: "PAR100" },
    ]);
    expect(resultado.totales.valor).toBeNull();
  });
});

describe("F-DT7-03 · solape en la frontera inclusiva", () => {
  test("no elige fuente, no prorratea y deja total/subtotal nulos", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-08-27")],
            controlDetalle: { inicio: "2026-08-27", fin: "2026-12-31" },
          }),
        ],
        movimientos: [
          movimiento("MV020", { fecha: "2026-08-27", importeCentimos: "2000" }),
          movimiento("MV300", { fecha: "2026-09-01", importeCentimos: "30000" }),
        ],
      }),
    );
    const par100 = item(resultado);

    expect(par100.estadoCobertura).toBe("Solapada");
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.archivo).toBe("1200.00");
    expect(par100.detalleControl).toBe("320.00");
    expect(par100.conflictos).toContainEqual(
      expect.objectContaining({
        tipo: "Solapamiento",
        intervalo: { inicio: "2026-08-27", fin: "2026-08-27" },
        importe: "20.00",
      }),
    );
    expect(par100.total).not.toBe("1520.00");
    expect(par100.subtotalConocido).not.toBe("1500.00");
  });
});

describe("F-DT7-09 · agregado que excede el corte", () => {
  test("no recorta ni prorratea; el importe queda fuera del total", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-06-30",
        movimientos: [],
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-08-27")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "120000",
          }),
        ],
      }),
    );
    const par100 = item(resultado);

    expect(par100.estadoCobertura).toBe("Completa");
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.archivo).toBeNull();
    expect(par100.motivoCodigo).toBe("AgregadoNoAtribuibleAlCorte");
    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH001",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
        importe: "1200.00",
        causa: "CorteExcedido",
      },
    ]);
    expect(resultado.totales.valor).toBeNull();
  });

  test("un agregado Desconocido fuera del corte no entra en el subtotal", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-06-30",
        movimientos: [],
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-08-27")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH100", {
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "10000",
            representadoEnMovimientos: "Desconocido",
            evidenciaNoDuplicidad: "Evidencia sintética de no duplicidad.",
          }),
        ],
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.motivoCodigo).toBe("AgregadoNoAtribuibleAlCorte");
    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH100",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
        importe: "100.00",
        causa: "CorteExcedido",
      },
    ]);
    expect(resultado.totales.subtotalConocido).toBeNull();
  });
});

describe("F-DT7-15 · ausencia ≠ cero", () => {
  test("cobertura completa sin hechos produce 0,00 verificado, no NoDisponible", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [],
        movimientos: [],
      }),
    );

    expect(item(resultado).total).toBe("0.00");
    expect(item(resultado).estadoTotal).toBe("Verificado");
    expect(item(resultado).motivoCodigo).toBe("AusenciaVerificadaSinHechos");
    expect(resultado.totales.valor).toBe("0.00");
    expect(resultado.totales.motivoCodigo).toBe("AusenciaVerificadaSinHechos");
  });

  test("un registro cero verificado conserva identidad y no se confunde con ausencia", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [registro("AH000", { importeCentimos: "0" })],
        movimientos: [],
      }),
    );

    expect(item(resultado).archivo).toBe("0.00");
    expect(item(resultado).total).toBe("0.00");
    expect(item(resultado).motivoCodigo).toBeNull();
    expect(item(resultado).registros).toEqual(["AH000"]);
  });

  test("sin evidencia de apertura `aperturas` es null y no 0", () => {
    const resultado = combinarHistoricoPrecontrol(entrada());
    expect(resultado.aperturas).toBeNull();
  });
});

describe("deduplicación, identidad y versiones", () => {
  test("F-DT7-04: misma identidad y huella suma una sola vez", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            identidad: "MISMA-IDENTIDAD",
            huellaContenido: "MISMA-HUELLA",
            importeCentimos: "12000",
          }),
          registro("AH002", {
            identidad: "MISMA-IDENTIDAD",
            huellaContenido: "MISMA-HUELLA",
            importeCentimos: "12000",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(item(resultado).archivo).toBe("120.00");
    expect(item(resultado).total).toBe("120.00");
    expect(resultado.duplicadosAbsorbidos).toEqual([
      { idArchivo: "AH002", identidad: "MISMA-IDENTIDAD" },
    ]);
    expect(item(resultado).registros).toEqual(["AH001"]);
  });

  test("misma identidad y versión con huella distinta es conflicto y no suma", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            identidad: "DUDOSA",
            huellaContenido: "HUELLA-A",
            importeCentimos: "10000",
          }),
          registro("AH002", {
            identidad: "DUDOSA",
            huellaContenido: "HUELLA-B",
            importeCentimos: "20000",
          }),
        ],
        movimientos: [],
      }),
    );
    const par100 = item(resultado);

    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(resultado.conflictos).toContainEqual(
      expect.objectContaining({ tipo: "DuplicadoAmbiguo" }),
    );
  });

  test("F-DT7-14: solo la versión vigente contribuye y la anterior queda como historia", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        registros: [
          registro("AH001", {
            identidad: "ARCHIVO-UNO",
            version: 1,
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "120000",
          }),
          registro("AH002", {
            identidad: "ARCHIVO-UNO",
            version: 2,
            reemplazaA: 1,
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "115000",
          }),
        ],
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBe("1150.00");
    expect(par100.total).toBe("1450.00");
    expect(par100.registros).toEqual(["AH002"]);
    expect(par100.historicos).toEqual(["AH001"]);
    expect(resultado.versionesHistoricas).toEqual([
      { idArchivo: "AH001", identidad: "ARCHIVO-UNO", version: 1 },
    ]);
    expect(par100.total).not.toBe("2350.00");
    expect(resultado.totales.valor).toBe("1450.00");
  });

  test("una cadena bifurcada deja el total NoVerificable sin elegir versión", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        registros: [
          registro("AH001", {
            identidad: "BIFURCADA",
            version: 1,
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
          registro("AH002", {
            identidad: "BIFURCADA",
            version: 2,
            reemplazaA: 1,
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "20000",
          }),
          registro("AH003", {
            identidad: "BIFURCADA",
            version: 3,
            reemplazaA: 1,
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "30000",
          }),
        ],
        movimientos: [],
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
      }),
    );

    expect(item(resultado).total).toBeNull();
    expect(item(resultado).subtotalConocido).toBeNull();
    expect(resultado.conflictos).toContainEqual(
      expect.objectContaining({ tipo: "VersionBifurcada" }),
    );
    expect(resultado.totales.valor).toBeNull();
  });

  test("B1: una bifurcación que cambia de Partida bloquea todas las Partidas de la identidad", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [
              archivo("2026-01-01", "2026-12-31", "PAR100"),
              archivo("2026-01-01", "2026-12-31", "PAR200"),
            ],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            identidad: "CAMBIA-DE-PARTIDA",
            version: 1,
            partidaId: "PAR100",
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
          registro("AH002", {
            identidad: "CAMBIA-DE-PARTIDA",
            version: 2,
            reemplazaA: 1,
            partidaId: "PAR200",
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "20000",
          }),
          registro("AH003", {
            identidad: "CAMBIA-DE-PARTIDA",
            version: 3,
            reemplazaA: 1,
            partidaId: "PAR100",
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "30000",
          }),
        ],
        movimientos: [],
      }),
      universo: universo(["PAR100", "PAR200"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
        {
          fuenteId: "SRC-1",
          partidaId: "PAR200",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
      ]),
    });

    for (const partidaId of ["PAR100", "PAR200"]) {
      const actual = item(resultado, partidaId);
      expect(actual.estadoTotal).toBe("NoVerificable");
      expect(actual.total).toBeNull();
      expect(actual.subtotalConocido).toBeNull();
      expect(actual.motivoCodigo).toBe("DuplicadoAmbiguo");
    }
    expect(resultado.conflictos).toContainEqual(
      expect.objectContaining({ tipo: "VersionBifurcada", partidaId: "PAR100" }),
    );
    expect(resultado.conflictos).toContainEqual(
      expect.objectContaining({ tipo: "VersionBifurcada", partidaId: "PAR200" }),
    );
    expect(resultado.totales.valor).toBeNull();
  });
});

describe("estados de mapping, verificación y representación", () => {
  test("F-DT7-05/AC-04: mapping ambiguo va a sinClasificar y no suma", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH150", {
            partidaId: null,
            estadoMapeo: "Ambigua",
            importeCentimos: "15000",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(resultado.sinClasificar).toEqual([
      {
        idArchivo: "AH150",
        importe: "150.00",
        motivo: "Mapping de Partida ambiguo; no se elige candidato.",
      },
    ]);
    expect(item(resultado).total).toBe("0.00");
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.estadoTotal).toBe("NoVerificable");
    expect(resultado.totales.motivoCodigo).toBe("MappingPendiente");
  });

  test("F-DT7-06/AC-36: Desconocido no certifica ni contamina el subtotal sin evidencia", () => {
    const sinEvidencia = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH100", {
            intervalo: { inicio: "2026-09-01", fin: "2026-09-30" },
            importeCentimos: "10000",
            representadoEnMovimientos: "Desconocido",
          }),
        ],
        movimientos: [],
      }),
    );
    expect(item(sinEvidencia).total).toBeNull();
    expect(item(sinEvidencia).subtotalConocido).toBeNull();
    expect(sinEvidencia.totales.valor).toBeNull();
    expect(sinEvidencia.totales.subtotalConocido).toBeNull();
  });

  test("Desconocido con evidencia de no duplicidad entra solo en el subtotal", () => {
    const conEvidencia = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH1200", {
            identidad: "VERIFICADO",
            intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
            importeCentimos: "120000",
          }),
          registro("AH100", {
            identidad: "DESCONOCIDO",
            intervalo: { inicio: "2026-09-01", fin: "2026-09-30" },
            importeCentimos: "10000",
            representadoEnMovimientos: "Desconocido",
            evidenciaNoDuplicidad: "Evidencia sintética de ausencia de duplicidad.",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(item(conEvidencia).total).toBeNull();
    expect(item(conEvidencia).subtotalConocido).toBe("1300.00");
    expect(conEvidencia.totales.valor).toBeNull();
    expect(conEvidencia.totales.subtotalConocido).toBe("1300.00");
  });

  test("F-DT7-16/AC-16: una apertura de Saldo se muestra aparte y no suma a Gastos", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        universo: universo(["PAR100"]),
        fuentes: [],
        registros: [
          registro("AH500", {
            clase: "AperturaHistorica",
            saldoId: "S001",
            partidaId: null,
            estadoMapeo: "Excluido",
            importeCentimos: "50000",
            fecha: "2026-01-01",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(resultado.aperturas).toEqual([
      {
        idArchivo: "AH500",
        saldoId: "S001",
        importe: "500.00",
        fecha: "2026-01-01",
        motivo: null,
      },
    ]);
    expect(item(resultado).estadoCobertura).toBe("NoDisponible");
    expect(item(resultado).total).toBeNull();
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.cobertura.estadoCobertura).toBe("NoDisponible");
  });

  test("una apertura cero verificada se representa 0,00 y no null", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        universo: universo(["PAR100"]),
        fuentes: [],
        registros: [
          registro("AH000", {
            clase: "AperturaHistorica",
            saldoId: "S001",
            partidaId: null,
            estadoMapeo: "Excluido",
            importeCentimos: "0",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(resultado.aperturas?.[0]?.importe).toBe("0.00");
  });
});

describe("F-DT7-12 · precontrol vinculado, control y no vinculado", () => {
  test("cuenta cada Movimiento una vez y el no vinculado impide el total", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-08-27")],
            controlDetalle: { inicio: "2026-09-01", fin: "2026-12-31" },
          }),
        ],
        registros: [
          registro("AH004", {
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "6000",
            representadoEnMovimientos: "Si",
          }),
        ],
        movimientos: [
          movimiento("MV060", {
            fecha: "2026-08-20",
            importeCentimos: "6000",
            vinculoArchivoId: "AH004",
          }),
          movimiento("MV100", {
            fecha: "2026-09-05",
            importeCentimos: "10000",
          }),
          movimiento("MV050", {
            fecha: "2026-08-30",
            importeCentimos: "5000",
          }),
        ],
      }),
    );
    const par100 = item(resultado);

    expect(par100.detallePrecontrolVinculado).toBe("60.00");
    expect(par100.detalleControl).toBe("100.00");
    expect(par100.detallePrecontrolNoVinculado).toBe("50.00");
    expect(par100.total).toBeNull();
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.subtotalConocido).toBe("160.00");
  });

  test("un Movimiento vinculado dentro del control no se suma otra vez", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-08-27")],
            controlDetalle: { inicio: "2026-08-28", fin: "2026-12-31" },
          }),
        ],
        registros: [
          registro("AH004", {
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "6000",
            representadoEnMovimientos: "Si",
          }),
        ],
        movimientos: [
          movimiento("MV100", {
            fecha: "2026-09-05",
            importeCentimos: "10000",
            vinculoArchivoId: "AH004",
          }),
        ],
      }),
    );
    const par100 = item(resultado);

    expect(par100.detalleControl).toBe("100.00");
    expect(par100.detallePrecontrolVinculado).toBeNull();
    expect(par100.total).toBe("100.00");
  });
});

describe("F-DT7-20 · solo Gastos y corte abierto", () => {
  test("Ingreso, Transferencia y Amortización no entran en el total de Gastos", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [],
            controlDetalle: { inicio: "2026-01-01", fin: "2026-12-31" },
          }),
        ],
        registros: [],
        movimientos: [
          movimiento("MV1", { tipo: "Ingreso", importeCentimos: "10000" }),
          movimiento("MV2", { tipo: "Transferencia", importeCentimos: "20000" }),
          movimiento("MV3", { tipo: "Amortizacion", importeCentimos: "30000" }),
          movimiento("MV4", { tipo: "Gasto", importeCentimos: "5000" }),
          movimiento("MV5", { tipo: "Gasto", importeCentimos: "9000", anulado: true }),
        ],
      }),
    );

    expect(item(resultado).detalleControl).toBe("50.00");
    expect(item(resultado).total).toBe("50.00");
    expect(resultado.totales.valor).toBe("50.00");
  });

  test("un corte abierto se declara HastaCorte y nunca Anual", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-10-27",
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-08-27")],
            controlDetalle: { inicio: "2026-08-28", fin: "2026-12-31" },
          }),
        ],
        movimientos: [],
      }),
    );

    expect(resultado.alcanceTotal).toBe("HastaCorte");
    expect(item(resultado).total).toBe("1200.00");
    expect(resultado.totales.valor).toBe("1200.00");
  });

  test("un corte futuro se rechaza con el reloj del llamador", () => {
    expect(() =>
      combinarHistoricoPrecontrol(
        entrada({ corte: "2026-12-31", hoy: "2026-11-08" }),
      ),
    ).toThrow(ErrorPrecontrol);
  });
});

describe("F-DT7-10/23/11 · universo, fuentes ausentes y D14", () => {
  test("una fuente esperada ausente deja la Partida NoDisponible y el global Parcial", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31", "PAR100")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH900", {
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "90000",
          }),
        ],
        movimientos: [],
      }),
      universo: universo(["PAR100", "PAR300"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
        {
          fuenteId: "SRC-3",
          partidaId: "PAR300",
          estado: "Ausente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
      ]),
    });

    expect(item(resultado, "PAR100").estadoTotal).toBe("Verificado");
    expect(item(resultado, "PAR100").total).toBe("900.00");
    expect(item(resultado, "PAR300").estadoCobertura).toBe("NoDisponible");
    expect(item(resultado, "PAR300").estadoTotal).toBe("NoDisponible");
    expect(item(resultado, "PAR300").total).toBeNull();
    expect(resultado.cobertura.estadoCobertura).toBe("Parcial");
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.subtotalConocido).toBe("900.00");
    expect(resultado.totales.motivoCodigo).toBe("FuenteAusente");
  });

  test("AC-10: sin archivo y control desde 01/09 el hueco anterior impide el total", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [],
            controlDetalle: { inicio: "2026-09-01", fin: "2026-12-31" },
          }),
        ],
        registros: [],
        movimientos: [movimiento("MV001", { fecha: "2026-09-05" })],
      }),
    );
    const par100 = item(resultado);

    expect(par100.estadoCobertura).toBe("Parcial");
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBe("300.00");
    expect(par100.motivoCodigo).toBe("HuecoDemostrado");
    expect(resultado.cobertura.huecos).toEqual([
      { inicio: "2026-01-01", fin: "2026-08-31", partidaId: "PAR100" },
    ]);
    expect(resultado.totales.valor).not.toBe("0.00");
  });

  test("D14: una Partida NoDisponible no impide verificar la otra ni se propaga", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31", "PAR100")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH900", {
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "90000",
          }),
        ],
        movimientos: [],
      }),
      universo: universo(["PAR100", "PAR205"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
        {
          fuenteId: "SRC-2",
          partidaId: "PAR205",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
      ]),
    });

    expect(item(resultado, "PAR100").estadoCobertura).toBe("Completa");
    expect(item(resultado, "PAR100").estadoTotal).toBe("Verificado");
    expect(item(resultado, "PAR100").total).toBe("900.00");
    expect(item(resultado, "PAR205").estadoCobertura).toBe("NoDisponible");
    expect(item(resultado, "PAR205").estadoTotal).toBe("NoDisponible");
    expect(item(resultado, "PAR205").total).toBeNull();
    expect(resultado.cobertura.estadoCobertura).toBe("Parcial");
    expect(resultado.totales.estadoTotal).toBe("NoVerificable");
    expect(resultado.totales.valor).toBeNull();
  });

  test("sin universo acreditado el estado es NoAcreditada, no Parcial ni 0", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        universo: { estado: "NoAcreditado", partidas: [], fuentesEsperadas: [] },
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH1200", {
            identidad: "SEPARABLE",
            importeCentimos: "120000",
          }),
          registro("AH150", {
            identidad: "DESCONOCIDO",
            intervalo: { inicio: "2026-03-01", fin: "2026-03-31" },
            importeCentimos: "15000",
            representadoEnMovimientos: "Desconocido",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(resultado.cobertura.estadoCobertura).toBe("NoAcreditada");
    expect(item(resultado).estadoCobertura).toBe("NoAcreditada");
    expect(resultado.totales.estadoTotal).toBe("NoVerificable");
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.subtotalConocido).toBe("1200.00");
  });

  test("H3: una Partida descubierta no amplía un universo acreditado ni inventa un item", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        universo: universo(["PAR100"]),
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH100", {
            partidaId: "PAR250",
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(resultado.items.map((actual) => actual.partidaId)).toEqual(["PAR100"]);
    expect(resultado.universo.partidas).toEqual(["PAR100"]);
    expect(resultado.cobertura.universoPartidas).toEqual(["PAR100"]);
    expect(resultado.sinClasificar).toEqual([
      {
        idArchivo: "AH100",
        importe: "100.00",
        motivo:
          "Partida no declarada en el universo DT7 acreditado; pendiente de decisión.",
      },
    ]);
    expect(resultado.totales.estadoTotal).toBe("NoVerificable");
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.motivoCodigo).toBe("MappingPendiente");
  });
});

describe("F-DT7-13 · dos fuentes solapadas", () => {
  test("marca Solapada, no suma 800,00 y conserva los conflictos", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        registros: [
          registro("AH500", {
            fuenteId: "SRC-A",
            identidad: "FUENTE-A",
            intervalo: { inicio: "2026-01-01", fin: "2026-08-31" },
            importeCentimos: "50000",
          }),
          registro("AH300", {
            fuenteId: "SRC-B",
            identidad: "FUENTE-B",
            intervalo: { inicio: "2026-03-01", fin: "2026-06-30" },
            importeCentimos: "30000",
          }),
        ],
        movimientos: [],
        fuentes: [
          fuente({
            fuenteId: "SRC-A",
            intervalosArchivo: [archivo("2026-01-01", "2026-08-31")],
          }),
          fuente({
            fuenteId: "SRC-B",
            intervalosArchivo: [archivo("2026-03-01", "2026-06-30")],
          }),
        ],
      }),
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-A",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-08-31" },
        },
        {
          fuenteId: "SRC-B",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-03-01", fin: "2026-06-30" },
        },
      ]),
    });

    expect(resultado.cobertura.estadoCobertura).toBe("Solapada");
    expect(item(resultado).total).toBeNull();
    expect(item(resultado).subtotalConocido).toBeNull();
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.conflictos.length).toBeGreaterThan(0);
    expect(item(resultado).total).not.toBe("800.00");
  });

  test("B2: dos fuentes con registros del mismo intervalo no son separables aunque su cobertura no se solape", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        registros: [
          registro("AH500", {
            fuenteId: "SRC-A",
            identidad: "FUENTE-A",
            intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
            importeCentimos: "50000",
          }),
          registro("AH300", {
            fuenteId: "SRC-B",
            identidad: "FUENTE-B",
            intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
            importeCentimos: "30000",
          }),
        ],
        movimientos: [],
        fuentes: [
          fuente({
            fuenteId: "SRC-A",
            intervalosArchivo: [archivo("2026-01-01", "2026-06-30")],
          }),
          fuente({
            fuenteId: "SRC-B",
            intervalosArchivo: [archivo("2026-07-01", "2026-12-31")],
          }),
        ],
      }),
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-A",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
        },
        {
          fuenteId: "SRC-B",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
        },
      ]),
    });
    const par100 = item(resultado);

    // SPEC20 exige `Solapada` en cuanto hay un conflicto no resuelto (D14,
    // paso 2). La expectativa anterior (`Completa`) contradecía la SPEC.
    expect(resultado.cobertura.estadoCobertura).toBe("Solapada");
    expect(par100.conflictos).toContainEqual(
      expect.objectContaining({ tipo: "DosFuentes" }),
    );
    expect(par100.archivo).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(resultado.totales.subtotalConocido).toBeNull();
    expect(par100.subtotalConocido).not.toBe("800.00");
  });
});

describe("F-DT7-08 · regularización 2026", () => {
  function regularizacion(cambios: Partial<RegistroPrecontrol> = {}) {
    return registro("AH50", {
      clase: "Regularizacion2026",
      partidaId: "PAR900",
      intervalo: { inicio: "2026-06-15", fin: "2026-06-15" },
      importeCentimos: "5000",
      fecha: "2026-06-15",
      evidenciaRegularizacion:
        "Q5=A: naturaleza, signo e inclusión acreditados en fixture sintético.",
      motivo:
        "Regularización 2026 aprobada en fixture sintético; Q5=A documentado.",
      estadoMapeoReferencia: "Pendiente",
      ...cambios,
    });
  }

  test("solo suma en 2026 y con evidencia Q5=A", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [
              archivo("2026-01-01", "2026-12-31", "PAR900", "Regularizacion2026"),
            ],
            controlDetalle: null,
          }),
        ],
        registros: [regularizacion()],
        movimientos: [],
      }),
      universo: universo(["PAR900"]),
    });

    expect(item(resultado, "PAR900").archivo).toBe("50.00");
    expect(item(resultado, "PAR900").total).toBe("50.00");
    expect(resultado.totales.valor).toBe("50.00");
  });

  test("sin evidencia queda RegularizacionPendiente y no se infiere por nombre", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [
              archivo("2026-01-01", "2026-12-31", "PAR900", "Regularizacion2026"),
            ],
            controlDetalle: null,
          }),
        ],
        registros: [regularizacion({ evidenciaRegularizacion: null })],
        movimientos: [],
      }),
      universo: universo(["PAR900"]),
    });

    expect(item(resultado, "PAR900").total).toBeNull();
    expect(item(resultado, "PAR900").motivoCodigo).toBe("RegularizacionPendiente");
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.motivoCodigo).toBe("RegularizacionPendiente");
  });

  test("en 2027 no se aplica ni se extrapola", () => {
    const resultado = combinarHistoricoPrecontrol({
      ejercicio: 2027,
      corte: "2027-12-31",
      hoy: "2028-01-15",
      universo: universo(["PAR900"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR900",
          estado: "Presente",
          intervalo: { inicio: "2027-01-01", fin: "2027-12-31" },
        },
      ]),
      fuentes: [
        fuente({
          intervalosArchivo: [
            archivo("2027-01-01", "2027-12-31", "PAR900", "Regularizacion2026"),
          ],
          controlDetalle: null,
          corteArchivo: "2027-12-31",
        }),
      ],
      registros: [
        regularizacion({
          ejercicio: 2027,
          intervalo: { inicio: "2027-06-15", fin: "2027-06-15" },
          fecha: "2027-06-15",
        }),
      ],
      movimientos: [],
    });

    expect(item(resultado, "PAR900").total).toBeNull();
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.subtotalConocido).toBeNull();
  });
});

describe("F-DT7-16 · transición de ejercicio", () => {
  test("2026 sigue consultable y 2027 queda NoDisponible sin suma plurianual", () => {
    const desde = combinarHistoricoPrecontrol(entrada());
    const hasta = combinarHistoricoPrecontrol({
      ejercicio: 2027,
      corte: "2027-12-31",
      hoy: "2028-01-15",
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2027-01-01", fin: "2027-12-31" },
        },
      ]),
      fuentes: [],
      registros: [],
      movimientos: [],
    });
    const transicion = compararTransicion(desde, hasta);

    expect(desde.totales.valor).toBe("1500.00");
    expect(hasta.items[0]?.estadoCobertura).toBe("NoDisponible");
    expect(hasta.totales.estadoTotal).toBe("NoDisponible");
    expect(hasta.totales.valor).toBeNull();
    expect(transicion.totalPlurianual).toBeNull();
    expect(transicion.sumaPlurianual).toBe(false);
    expect(transicion.crea).toEqual({
      planes: false,
      movimientos: false,
      aperturas: false,
      fotos: false,
      cierres: false,
    });
  });

  test("no admite ejercicios no contiguos", () => {
    const desde = combinarHistoricoPrecontrol(entrada());
    const hasta = combinarHistoricoPrecontrol(
      entrada({
        ejercicio: 2028,
        corte: "2028-12-31",
        hoy: "2029-01-15",
        universo: universo(["PAR100"], [
          {
            fuenteId: "SRC-1",
            partidaId: "PAR100",
            estado: "Presente",
            intervalo: { inicio: "2028-01-01", fin: "2028-12-31" },
          },
        ]),
        fuentes: [],
        registros: [],
        movimientos: [],
      }),
    );
    expect(() => compararTransicion(desde, hasta)).toThrow(ErrorPrecontrol);
  });
});

describe("resolución de versiones aislada", () => {
  test("absorbe duplicados físicos y conserva la versión vigente", () => {
    const resolucion = resolverVersiones([
      registro("AH001", {
        identidad: "X",
        huellaContenido: "H",
        version: 1,
        importeCentimos: "100",
      }),
      registro("AH002", {
        identidad: "X",
        huellaContenido: "H",
        version: 1,
        importeCentimos: "100",
      }),
      registro("AH003", {
        identidad: "X",
        huellaContenido: "H2",
        version: 2,
        reemplazaA: 1,
        importeCentimos: "200",
      }),
    ]);

    expect(resolucion.vigentes.map((actual) => actual.idArchivo)).toEqual(["AH003"]);
    expect(resolucion.absorbidos).toEqual([{ idArchivo: "AH002", identidad: "X" }]);
    expect(resolucion.historicos.map((actual) => actual.idArchivo).sort()).toEqual([
      "AH001",
    ]);
  });
});

describe("validación estructural", () => {
  test("rechaza fechas inválidas, importes no enteros y cortes fuera del ejercicio", () => {
    expect(() =>
      combinarHistoricoPrecontrol(entrada({ corte: "2026-02-30" })),
    ).toThrow(ErrorPrecontrol);
    expect(() =>
      combinarHistoricoPrecontrol(
        entrada({ registros: [registro("AH001", { importeCentimos: "12.5" })] }),
      ),
    ).toThrow(ErrorPrecontrol);
    expect(() =>
      combinarHistoricoPrecontrol(entrada({ corte: "2025-12-31" })),
    ).toThrow(ErrorPrecontrol);
  });

  test("rechaza un GastoHistorico negativo", () => {
    expect(() =>
      combinarHistoricoPrecontrol(
        entrada({ registros: [registro("AH001", { importeCentimos: "-100" })] }),
      ),
    ).toThrow(ErrorPrecontrol);
  });
});

describe("H2 · trazabilidad de estados que no suman", () => {
  test("un Excluido con Partida se conserva con motivo y no suma", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", { importeCentimos: "10000" }),
          registro("AH002", {
            estadoMapeo: "Excluido",
            importeCentimos: "5000",
          }),
        ],
        movimientos: [],
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBe("100.00");
    expect(par100.total).toBe("100.00");
    expect(par100.subtotalConocido).toBe("100.00");
    expect(par100.registros).toEqual(["AH001", "AH002"]);
    expect(par100.registrosNoComputados).toEqual([
      {
        idArchivo: "AH002",
        importe: "50.00",
        estadoVerificacion: "Verificado",
        estadoMapeo: "Excluido",
        motivo: "Mapping de Partida excluido; no se suma.",
      },
    ]);
  });

  test("un Rechazado se conserva con motivo y no suma", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", { importeCentimos: "10000" }),
          registro("AH002", {
            estadoVerificacion: "Rechazado",
            importeCentimos: "5000",
          }),
        ],
        movimientos: [],
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBe("100.00");
    expect(par100.total).toBe("100.00");
    expect(par100.registros).toEqual(["AH001", "AH002"]);
    expect(par100.registrosNoComputados).toEqual([
      {
        idArchivo: "AH002",
        importe: "50.00",
        estadoVerificacion: "Rechazado",
        estadoMapeo: "Mapeado",
        motivo: "Registro rechazado; no se suma.",
      },
    ]);
  });

  test("un NoVerificado se conserva con motivo, no suma y bloquea el total", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", { importeCentimos: "10000" }),
          registro("AH002", {
            estadoVerificacion: "NoVerificado",
            importeCentimos: "5000",
          }),
        ],
        movimientos: [],
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBe("100.00");
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBe("100.00");
    expect(par100.motivoCodigo).toBe("VerificacionPendiente");
    expect(par100.registros).toEqual(["AH001", "AH002"]);
    expect(par100.registrosNoComputados).toEqual([
      {
        idArchivo: "AH002",
        importe: "50.00",
        estadoVerificacion: "NoVerificado",
        estadoMapeo: "Mapeado",
        motivo: "Registro pendiente de verificación; no se suma.",
      },
    ]);
  });

  test("Pendiente y Ambigua con Partida permanecen visibles sin sumar", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", { importeCentimos: "10000" }),
          registro("AH002", {
            estadoMapeo: "Pendiente",
            importeCentimos: "5000",
          }),
          registro("AH003", {
            estadoMapeo: "Ambigua",
            importeCentimos: "3000",
          }),
        ],
        movimientos: [],
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBe("100.00");
    expect(par100.total).toBe("100.00");
    expect(par100.registros).toEqual(["AH001", "AH002", "AH003"]);
    expect(par100.registrosNoComputados).toEqual([
      {
        idArchivo: "AH002",
        importe: "50.00",
        estadoVerificacion: "Verificado",
        estadoMapeo: "Pendiente",
        motivo: "Mapping de Partida pendiente; no se suma.",
      },
      {
        idArchivo: "AH003",
        importe: "30.00",
        estadoVerificacion: "Verificado",
        estadoMapeo: "Ambigua",
        motivo: "Mapping de Partida ambiguo; no se suma.",
      },
    ]);
    expect(resultado.sinClasificar.map((fila) => fila.idArchivo)).toEqual([
      "AH002",
      "AH003",
    ]);
  });

  test("aperturas NoVerificado y Rechazado se conservan aparte sin sumar", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        universo: universo(["PAR100"]),
        fuentes: [],
        registros: [
          registro("AH500", {
            clase: "AperturaHistorica",
            saldoId: "S001",
            partidaId: null,
            estadoMapeo: "Excluido",
            estadoVerificacion: "NoVerificado",
            importeCentimos: "50000",
            fecha: "2026-01-01",
          }),
          registro("AH501", {
            clase: "AperturaHistorica",
            saldoId: "S001",
            partidaId: null,
            estadoMapeo: "Excluido",
            estadoVerificacion: "Rechazado",
            importeCentimos: "20000",
            fecha: "2026-01-01",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(resultado.aperturas).toBeNull();
    expect(resultado.aperturasNoVerificadas).toEqual([
      {
        idArchivo: "AH500",
        saldoId: "S001",
        importe: "500.00",
        fecha: "2026-01-01",
        estadoVerificacion: "NoVerificado",
        motivo:
          "Apertura pendiente de verificación; no se presenta como posición verificada ni se suma a Gastos.",
      },
      {
        idArchivo: "AH501",
        saldoId: "S001",
        importe: "200.00",
        fecha: "2026-01-01",
        estadoVerificacion: "Rechazado",
        motivo:
          "Apertura rechazada; no se presenta como posición verificada ni se suma a Gastos.",
      },
    ]);
    expect(item(resultado).total).toBeNull();
    expect(resultado.totales.valor).toBeNull();
  });
});

describe("H4 · cobertura por fuente, Partida, alcance, intervalo y corte", () => {
  test("un alcance que no es PARxxx no inventa un item ni amplía el universo", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        universo: { estado: "NoAcreditado", partidas: [], fuentesEsperadas: [] },
        fuentes: [
          fuente({
            fuenteId: "SRC-SALDO",
            alcance: "S001",
            intervalosArchivo: [],
            controlDetalle: null,
          }),
        ],
        registros: [],
        movimientos: [],
      }),
    );

    expect(resultado.items).toEqual([]);
    expect(resultado.cobertura.universoPartidas).toEqual([]);
    expect(resultado.universo.partidas).toEqual([]);
  });

  test("un alcance PARxxx válido sí descubre una Partida sin universo acreditado", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        universo: { estado: "NoAcreditado", partidas: [], fuentesEsperadas: [] },
        fuentes: [
          fuente({
            fuenteId: "SRC-SALDO",
            alcance: "S001",
            intervalosArchivo: [],
            controlDetalle: null,
          }),
          fuente({
            fuenteId: "SRC-1",
            alcance: "PAR100",
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [],
        movimientos: [],
      }),
    );

    expect(resultado.items.map((actual) => actual.partidaId)).toEqual(["PAR100"]);
    expect(resultado.items.map((actual) => actual.partidaId)).not.toContain(
      "S001",
    );
  });

  test("un fuenteId presente no basta si la fuente no cubre la Partida", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            fuenteId: "SRC-1",
            alcance: "PAR200",
            intervalosArchivo: [
              archivo("2026-01-01", "2026-12-31", "PAR200"),
            ],
            controlDetalle: null,
          }),
          fuente({
            fuenteId: "SRC-2",
            alcance: "Global",
            intervalosArchivo: [
              archivo("2026-01-01", "2026-12-31", "PAR100"),
            ],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH100", {
            fuenteId: "SRC-2",
            identidad: "OTRA-FUENTE",
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
      ]),
    });
    const par100 = item(resultado);

    expect(par100.estadoCobertura).toBe("Parcial");
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.total).toBeNull();
    expect(par100.motivoCodigo).toBe("FuenteAusente");
    expect(par100.cobertura.fuentes).toEqual(["SRC-2"]);
    expect(resultado.cobertura.estadoCobertura).toBe("Parcial");
  });

  test("un controlDetalle de otra Partida no acredita la fuente esperada", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            fuenteId: "SRC-1",
            alcance: "PAR200",
            intervalosArchivo: [],
            controlDetalle: { inicio: "2026-01-01", fin: "2026-12-31" },
          }),
          fuente({
            fuenteId: "SRC-2",
            alcance: "Global",
            intervalosArchivo: [
              archivo("2026-01-01", "2026-12-31", "PAR100"),
            ],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH100", {
            fuenteId: "SRC-2",
            identidad: "OTRA-FUENTE",
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
      ]),
    });
    const par100 = item(resultado);

    expect(par100.estadoCobertura).toBe("Parcial");
    expect(par100.total).toBeNull();
    expect(par100.motivoCodigo).toBe("FuenteAusente");
  });

  test("el intervalo esperado debe quedar cubierto aunque el total de la Partida lo esté", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            fuenteId: "SRC-1",
            intervalosArchivo: [archivo("2026-01-01", "2026-06-30")],
            controlDetalle: null,
          }),
          fuente({
            fuenteId: "SRC-2",
            intervalosArchivo: [archivo("2026-07-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            fuenteId: "SRC-1",
            identidad: "TRAMO-UNO",
            intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
            importeCentimos: "10000",
          }),
          registro("AH002", {
            fuenteId: "SRC-2",
            identidad: "TRAMO-DOS",
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
      ]),
    });
    const par100 = item(resultado);

    expect(par100.cobertura.huecos).toEqual([]);
    expect(par100.estadoCobertura).toBe("Parcial");
    expect(par100.total).toBeNull();
    expect(par100.motivoCodigo).toBe("FuenteAusente");
  });

  test("el intervalo esperado se recorta al corte consultado", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        corte: "2026-06-30",
        movimientos: [],
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-06-30")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
            importeCentimos: "10000",
          }),
        ],
      }),
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
      ]),
    });

    expect(resultado.alcanceTotal).toBe("HastaCorte");
    expect(item(resultado).estadoCobertura).toBe("Completa");
    expect(item(resultado).total).toBe("100.00");
  });

  test("una expectativa posterior al corte no se declara ausente", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        corte: "2026-06-30",
        movimientos: [],
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-06-30")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
            importeCentimos: "10000",
          }),
        ],
      }),
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
        },
      ]),
    });

    expect(item(resultado).estadoCobertura).toBe("Completa");
    expect(item(resultado).total).toBe("100.00");
    expect(item(resultado).motivoCodigo).toBeNull();
  });

  test("corteArchivo limita intervalos y control posteriores", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            corteArchivo: "2026-06-30",
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: { inicio: "2026-07-01", fin: "2026-12-31" },
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
        },
      ]),
    });
    const par100 = item(resultado);

    expect(par100.cobertura.intervalos).toEqual([
      { inicio: "2026-01-01", fin: "2026-06-30" },
    ]);
    expect(par100.estadoCobertura).toBe("Parcial");
    expect(par100.total).toBeNull();
    expect(par100.motivoCodigo).toBe("HuecoDemostrado");
    expect(resultado.cobertura.huecos).toEqual([
      { inicio: "2026-07-01", fin: "2026-12-31", partidaId: "PAR100" },
    ]);
  });

  test("corteArchivo limita la fuente esperada aunque otra fuente complete el hueco", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            fuenteId: "SRC-1",
            corteArchivo: "2026-06-30",
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: { inicio: "2026-07-01", fin: "2026-12-31" },
          }),
          fuente({
            fuenteId: "SRC-2",
            corteArchivo: "2026-12-31",
            intervalosArchivo: [archivo("2026-07-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            fuenteId: "SRC-1",
            identidad: "TRAMO-UNO",
            intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
            importeCentimos: "10000",
          }),
          registro("AH002", {
            fuenteId: "SRC-2",
            identidad: "TRAMO-DOS",
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
      ]),
    });
    const par100 = item(resultado);

    expect(par100.cobertura.intervalos).toEqual([
      { inicio: "2026-01-01", fin: "2026-12-31" },
    ]);
    expect(par100.estadoCobertura).toBe("Parcial");
    expect(par100.total).toBeNull();
    expect(par100.motivoCodigo).toBe("FuenteAusente");
  });

  test("una expectativa Presente sin intervalo se rechaza explícitamente", () => {
    const sinIntervalo = {
      fuenteId: "SRC-1",
      partidaId: "PAR100",
      estado: "Presente",
    } as unknown as UniversoPrecontrol["fuentesEsperadas"][number];

    expect(() =>
      combinarHistoricoPrecontrol(
        entrada({ universo: universo(["PAR100"], [sinIntervalo]) }),
      ),
    ).toThrow(ErrorPrecontrol);
  });
});

describe("IDs PAR en la creación de items", () => {
  test("un universo con Partida no-PAR se rechaza explícitamente", () => {
    expect(() =>
      combinarHistoricoPrecontrol(
        entrada({
          universo: {
            estado: "Acreditado",
            partidas: ["S001"],
            fuentesEsperadas: [],
          },
        }),
      ),
    ).toThrow(ErrorPrecontrol);
  });

  test("un partidaId no-PAR en registro o Movimiento se rechaza", () => {
    expect(() =>
      combinarHistoricoPrecontrol(
        entrada({
          registros: [registro("AH001", { partidaId: "S001" })],
        }),
      ),
    ).toThrow(ErrorPrecontrol);
    expect(() =>
      combinarHistoricoPrecontrol(
        entrada({
          movimientos: [movimiento("MV001", { partidaId: "S001" })],
        }),
      ),
    ).toThrow(ErrorPrecontrol);
  });
});


/**
 * Conformidad E4.5 — pruebas P-01…P-14 de la revisión estática motor↔SPEC20.
 *
 * Correcciones acreditadas: H-01/H-02/H-03/H-04/H-05/H-06/H-07/H-08/H-10/H-11/
 * H-12/H-13/H-14a/b, ampliación de H-01 a registros de archivo (H-01c) y
 * comportamiento de atribución fuera de `intervalosArchivo` (P-01a/P-01b).
 *
 * Diagnóstico sin contradicción demostrada con SPEC20 (no se cambia producto):
 * - H-09: SPEC20 solo contrata `conflictos[]` global y cada conflicto incluye
 *   `partidaId`; no exige copiar conflictos de identidad/versión a
 *   `items[].conflictos`, y la Partida afectada sigue siendo identificable.
 * - `fuenteId` en `AperturaHistorica`: SPEC20 excluye las aperturas de la
 *   cobertura/corte de Gastos y no exige que su fuente esté en `fuentes[]`;
 *   la exención no omite ningún límite duro de atribución.
 *
 * Sin `skip` ni relajación de aserciones existentes. El caso mixto de filas
 * fuera de `intervalosArchivo` queda fijado por F2e.
 */
describe("Conformidad E4.5 · P-01…P-14", () => {
  test("P-02: un registro fuera del corteArchivo de su fuente no se suma sin atribución", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            corteArchivo: "2026-06-30",
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(item(resultado).archivo).toBeNull();
    expect(item(resultado).total).toBeNull();
    expect(item(resultado).subtotalConocido).toBeNull();
    expect(resultado.agregadoNoAtribuible).toContainEqual(
      expect.objectContaining({
        idArchivo: "AH001",
        partidaId: "PAR100",
        importe: "100.00",
        causa: "CorteExcedido",
      }),
    );
    expect(item(resultado).motivoCodigo).toBe("AgregadoNoAtribuibleAlCorte");
  });

  test("P-03: dos registros parcialmente solapados no certifican total", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        registros: [
          registro("AH-A", {
            fuenteId: "SRC-A",
            identidad: "REGISTRO-A",
            intervalo: { inicio: "2026-01-01", fin: "2026-07-31" },
            importeCentimos: "10000",
          }),
          registro("AH-B", {
            fuenteId: "SRC-B",
            identidad: "REGISTRO-B",
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
        fuentes: [
          fuente({
            fuenteId: "SRC-A",
            intervalosArchivo: [archivo("2026-01-01", "2026-07-31")],
            controlDetalle: null,
          }),
          fuente({
            fuenteId: "SRC-B",
            intervalosArchivo: [archivo("2026-08-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
      }),
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-A",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-07-31" },
        },
        {
          fuenteId: "SRC-B",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-08-01", fin: "2026-12-31" },
        },
      ]),
    });
    const par100 = item(resultado);

    expect(par100.estadoCobertura).toBe("Solapada");
    expect(par100.archivo).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.conflictos).toContainEqual(
      expect.objectContaining({
        tipo: "Solapamiento",
        intervalo: { inicio: "2026-07-01", fin: "2026-07-31" },
      }),
    );
    expect(par100.total).not.toBe("200.00");
  });

  test("P-04: misma identidad/huella en dos Partidas es conflicto, no absorción", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [
              archivo("2026-01-01", "2026-12-31", "PAR100"),
              archivo("2026-01-01", "2026-12-31", "PAR200"),
            ],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            identidad: "COMPARTIDA",
            huellaContenido: "MISMA-HUELLA",
            partidaId: "PAR100",
            importeCentimos: "10000",
          }),
          registro("AH002", {
            identidad: "COMPARTIDA",
            huellaContenido: "MISMA-HUELLA",
            partidaId: "PAR200",
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
      universo: universo(["PAR100", "PAR200"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
        {
          fuenteId: "SRC-1",
          partidaId: "PAR200",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
      ]),
    });

    for (const partidaId of ["PAR100", "PAR200"]) {
      const actual = item(resultado, partidaId);
      expect(actual.estadoTotal).toBe("NoVerificable");
      expect(actual.archivo).toBeNull();
      expect(actual.total).toBeNull();
      expect(actual.subtotalConocido).toBeNull();
      expect(actual.motivoCodigo).toBe("DuplicadoAmbiguo");
    }
    for (const partidaId of ["PAR100", "PAR200"])
      expect(resultado.conflictos).toContainEqual(
        expect.objectContaining({ tipo: "DuplicadoAmbiguo", partidaId }),
      );
    expect(resultado.totales.valor).toBeNull();
  });

  test("F2a: un fuenteId desconocido no puede omitir el límite duro", () => {
    expect(() =>
      combinarHistoricoPrecontrol(
        entrada({
          registros: [registro("AH001", { fuenteId: "NO-EXISTE" })],
        }),
      ),
    ).toThrow(/fuenteId no declarado/);
  });

  test("F2b: un registro fuera de los intervalosArchivo declarados no suma", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            corteArchivo: "2026-12-31",
            intervalosArchivo: [archivo("2026-01-01", "2026-06-30")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(item(resultado).archivo).toBeNull();
    expect(item(resultado).total).toBeNull();
    expect(item(resultado).subtotalConocido).toBeNull();
    expect(item(resultado).motivoCodigo).toBe(
      "RegistroFueraDeIntervalosArchivo",
    );
    expect(resultado.agregadoNoAtribuible).toContainEqual(
      expect.objectContaining({
        idArchivo: "AH001",
        partidaId: "PAR100",
        importe: "100.00",
        causa: "FueraDeIntervalosArchivo",
      }),
    );
  });

  test("F2c: un registro contenido en intervalosArchivo declarados sí suma", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            corteArchivo: "2026-12-31",
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-02-01", fin: "2026-05-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(item(resultado).archivo).toBe("100.00");
    expect(item(resultado).total).toBe("100.00");
    expect(resultado.totales.valor).toBe("100.00");
  });

  test("P-05: un Rechazado único sin cobertura no produce archivo/subtotal 0,00", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        // La fuente existe y está declarada, pero no aporta cobertura: el
        // `fuenteId` no puede ser inventado y el cero no se acredita.
        fuentes: [
          fuente({
            intervalosArchivo: [],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            estadoVerificacion: "Rechazado",
            importeCentimos: "5000",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(item(resultado).archivo).toBeNull();
    expect(item(resultado).subtotalConocido).toBeNull();
    expect(resultado.totales.subtotalConocido).toBeNull();
  });

  test("P-10: una expectativa posterior al corte no se declara ausente sin cobertura de esa fuente", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        corte: "2026-06-30",
        movimientos: [],
        fuentes: [
          fuente({
            fuenteId: "SRC-1",
            intervalosArchivo: [],
            controlDetalle: null,
          }),
          fuente({
            fuenteId: "SRC-2",
            intervalosArchivo: [archivo("2026-01-01", "2026-06-30")],
            controlDetalle: null,
          }),
        ],
        registros: [],
      }),
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
        },
        {
          fuenteId: "SRC-2",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
        },
      ]),
    });
    const par100 = item(resultado);

    expect(par100.estadoCobertura).toBe("Completa");
    expect(par100.estadoTotal).toBe("Verificado");
    expect(par100.total).toBe("0.00");
    expect(par100.motivoCodigo).toBe("AusenciaVerificadaSinHechos");
    expect(resultado.totales.valor).toBe("0.00");
    expect(resultado.cobertura.estadoCobertura).toBe("Completa");
  });

  test("P-12: una cobertura Regularizacion2026 en 2027 no acredita 0,00", () => {
    const resultado = combinarHistoricoPrecontrol({
      ejercicio: 2027,
      corte: "2027-12-31",
      hoy: "2028-01-15",
      universo: universo(["PAR900"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR900",
          estado: "Presente",
          intervalo: { inicio: "2027-01-01", fin: "2027-12-31" },
        },
      ]),
      fuentes: [
        fuente({
          corteArchivo: "2027-12-31",
          intervalosArchivo: [
            archivo("2027-01-01", "2027-12-31", "PAR900", "Regularizacion2026"),
          ],
          controlDetalle: null,
        }),
      ],
      registros: [],
      movimientos: [],
    });

    expect(item(resultado, "PAR900").total).toBeNull();
    expect(item(resultado, "PAR900").total).not.toBe("0.00");
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.cobertura.estadoCobertura).not.toBe("Completa");
  });

  test("H-01a: un Gasto de otro ejercicio no contamina el universo del corte", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [],
        movimientos: [
          movimiento("MV-2027", {
            partidaId: "PAR999",
            fecha: "2027-01-15",
            importeCentimos: "9999",
          }),
        ],
      }),
    );

    expect(resultado.sinClasificar).toEqual([]);
    expect(resultado.totales.valor).toBe("0.00");
    expect(resultado.totales.estadoTotal).toBe("Verificado");
    expect(resultado.totales.motivoCodigo).not.toBe("MappingPendiente");
  });

  test("H-01b: un Gasto posterior al corte no contamina el universo del corte", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-06-30",
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [],
        movimientos: [
          movimiento("MV-CORTE", {
            partidaId: "PAR999",
            fecha: "2026-12-01",
            importeCentimos: "9999",
          }),
        ],
      }),
    );

    expect(resultado.sinClasificar).toEqual([]);
    expect(resultado.totales.valor).toBe("0.00");
    expect(resultado.totales.estadoTotal).toBe("Verificado");
    expect(resultado.totales.motivoCodigo).not.toBe("MappingPendiente");
  });

  test("H-06: una fuente esperada Ausente sin intervalo se rechaza", () => {
    const sinIntervalo = {
      fuenteId: "SRC-1",
      partidaId: "PAR100",
      estado: "Ausente",
    } as unknown as UniversoPrecontrol["fuentesEsperadas"][number];

    expect(() =>
      combinarHistoricoPrecontrol(
        entrada({ universo: universo(["PAR100"], [sinIntervalo]) }),
      ),
    ).toThrow(ErrorPrecontrol);
  });

  test("H-07: una Partida no declarada con mapping Pendiente conserva el motivo de universo", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH250", {
            partidaId: "PAR250",
            estadoMapeo: "Pendiente",
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(resultado.sinClasificar).toHaveLength(1);
    expect(resultado.sinClasificar[0]!.motivo).toContain(
      "no declarada en el universo",
    );
  });

  test("H-11: una regularización sin motivo no suma aunque tenga evidencia Q5=A", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31", "PAR900")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH50", {
            clase: "Regularizacion2026",
            partidaId: "PAR900",
            intervalo: { inicio: "2026-06-15", fin: "2026-06-15" },
            importeCentimos: "5000",
            fecha: "2026-06-15",
            evidenciaRegularizacion:
              "Q5=A: naturaleza, signo e inclusión acreditados en fixture sintético.",
            motivo: null,
          }),
        ],
        movimientos: [],
      }),
      universo: universo(["PAR900"]),
    });

    expect(item(resultado, "PAR900").total).toBeNull();
    expect(item(resultado, "PAR900").motivoCodigo).toBe(
      "RegularizacionPendiente",
    );
  });

  test("H-14a: rechaza una fecha de registro inválida", () => {
    expect(() =>
      combinarHistoricoPrecontrol(
        entrada({
          registros: [registro("AH001", { fecha: "2026-02-30" })],
        }),
      ),
    ).toThrow(ErrorPrecontrol);
  });

  test("H-14b: rechaza un estado de verificación inválido", () => {
    expect(() =>
      combinarHistoricoPrecontrol(
        entrada({
          registros: [
            registro("AH001", {
              estadoVerificacion:
                "Foo" as unknown as RegistroPrecontrol["estadoVerificacion"],
            }),
          ],
        }),
      ),
    ).toThrow(ErrorPrecontrol);
  });

  test("H-14c: rechaza el resto de enums inválidos de registro y Movimiento", () => {
    const casos: Array<() => void> = [
      () =>
        combinarHistoricoPrecontrol(
          entrada({
            registros: [
              registro("AH001", {
                clase: "Foo" as unknown as RegistroPrecontrol["clase"],
              }),
            ],
          }),
        ),
      () =>
        combinarHistoricoPrecontrol(
          entrada({
            registros: [
              registro("AH001", {
                estadoMapeo: "Foo" as unknown as RegistroPrecontrol["estadoMapeo"],
              }),
            ],
          }),
        ),
      () =>
        combinarHistoricoPrecontrol(
          entrada({
            registros: [
              registro("AH001", {
                estadoMapeoReferencia:
                  "Foo" as unknown as RegistroPrecontrol["estadoMapeoReferencia"],
              }),
            ],
          }),
        ),
      () =>
        combinarHistoricoPrecontrol(
          entrada({
            registros: [
              registro("AH001", {
                representadoEnMovimientos:
                  "Foo" as unknown as RegistroPrecontrol["representadoEnMovimientos"],
              }),
            ],
          }),
        ),
      () =>
        combinarHistoricoPrecontrol(
          entrada({
            movimientos: [
              movimiento("MV001", {
                tipo: "Foo" as unknown as MovimientoPrecontrol["tipo"],
              }),
            ],
          }),
        ),
    ];
    for (const caso of casos) {
      expect(caso).toThrow(ErrorPrecontrol);
    }
  });

  test("F2d: una fuente con intervalosArchivo vacío no acredita la suma de un registro válido", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [],
            controlDetalle: { inicio: "2026-01-01", fin: "2026-12-31" },
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
    );
    const par100 = item(resultado);

    // `intervalosArchivo: []` no es «sin restricción»: no hay ningún tramo
    // aplicable, así que la fila no se atribuye aunque el control cubra el año.
    expect(par100.archivo).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.motivoCodigo).toBe("RegistroFueraDeIntervalosArchivo");
    expect(resultado.agregadoNoAtribuible).toContainEqual(
      expect.objectContaining({
        idArchivo: "AH001",
        partidaId: "PAR100",
        importe: "100.00",
        causa: "FueraDeIntervalosArchivo",
      }),
    );
    expect(resultado.totales.valor).toBeNull();
  });

  test("F2e: el caso mixto conserva la exclusión conservadora del componente completo", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-06-30")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-02-01", fin: "2026-05-31" },
            importeCentimos: "10000",
          }),
          registro("AH002", {
            identidad: "FUERA-DE-INTERVALO",
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
            importeCentimos: "5000",
          }),
        ],
        movimientos: [],
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.motivoCodigo).toBe("RegistroFueraDeIntervalosArchivo");
    expect(resultado.agregadoNoAtribuible).toContainEqual(
      expect.objectContaining({
        idArchivo: "AH002",
        partidaId: "PAR100",
        importe: "50.00",
        causa: "FueraDeIntervalosArchivo",
      }),
    );
  });

  test("P-01a: sin intervalosArchivo declarados, un registro dentro del corte no se atribuye ni inventa cobertura", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-02-01", fin: "2026-05-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
    );
    const par100 = item(resultado);

    // Sin `intervalosArchivo` no hay tramo aplicable que contenga la fila: no
    // se suma, no se prorratea y no se convierte en 0. `null` no es `0`.
    expect(par100.archivo).toBeNull();
    expect(par100.estadoCobertura).toBe("NoDisponible");
    expect(par100.estadoTotal).toBe("NoDisponible");
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.motivoCodigo).toBe("RegistroFueraDeIntervalosArchivo");
    expect(resultado.agregadoNoAtribuible).toContainEqual(
      expect.objectContaining({
        idArchivo: "AH001",
        partidaId: "PAR100",
        importe: "100.00",
        causa: "FueraDeIntervalosArchivo",
      }),
    );
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.subtotalConocido).toBeNull();
  });

  test("P-01b: con intervalosArchivo declarados, un registro dentro del corte pero fuera de los tramos no se atribuye", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-06-30")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.motivoCodigo).toBe("RegistroFueraDeIntervalosArchivo");
    expect(resultado.agregadoNoAtribuible).toContainEqual(
      expect.objectContaining({
        idArchivo: "AH001",
        partidaId: "PAR100",
        importe: "100.00",
        causa: "FueraDeIntervalosArchivo",
      }),
    );
  });

  test("H-13: un ejercicio 1–99 usa fechas civiles reales, sin la coerción a 1900+", () => {
    const resultado = combinarHistoricoPrecontrol({
      ejercicio: 50,
      corte: "0050-12-31",
      hoy: "0051-01-15",
      universo: universo(["PAR100"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "0050-01-01", fin: "0050-12-31" },
        },
      ]),
      fuentes: [
        fuente({
          corteArchivo: "0050-12-31",
          intervalosArchivo: [archivo("0050-01-01", "0050-12-31")],
          controlDetalle: null,
        }),
      ],
      registros: [
        registro("AH001", {
          ejercicio: 50,
          intervalo: { inicio: "0050-01-01", fin: "0050-12-31" },
          importeCentimos: "10000",
        }),
      ],
      movimientos: [],
    });

    expect(resultado.ejercicio).toBe(50);
    expect(item(resultado).archivo).toBe("100.00");
    expect(item(resultado).total).toBe("100.00");
    expect(resultado.totales.valor).toBe("100.00");
    expect(
      huecosDeCobertura(
        [{ inicio: "0050-01-01", fin: "0050-01-30" }],
        "0050-01-01",
        "0050-02-28",
      ),
    ).toEqual([{ inicio: "0050-01-31", fin: "0050-02-28" }]);
  });

  test("H-13b: el año 0000 se rechaza y los límites 1 y 99 son fechas civiles", () => {
    expect(() =>
      combinarHistoricoPrecontrol(
        entrada({ corte: "0000-12-31", hoy: "0001-01-15" }),
      ),
    ).toThrow(ErrorPrecontrol);
    for (const anio of [1, 99]) {
      const y = String(anio).padStart(4, "0");
      const resultado = combinarHistoricoPrecontrol({
        ejercicio: anio,
        corte: `${y}-12-31`,
        hoy: `${y}-12-31`,
        universo: universo(["PAR100"], [
          {
            fuenteId: "SRC-1",
            partidaId: "PAR100",
            estado: "Presente",
            intervalo: { inicio: `${y}-01-01`, fin: `${y}-12-31` },
          },
        ]),
        fuentes: [
          fuente({
            corteArchivo: `${y}-12-31`,
            intervalosArchivo: [archivo(`${y}-01-01`, `${y}-12-31`)],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            ejercicio: anio,
            intervalo: { inicio: `${y}-01-01`, fin: `${y}-12-31` },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      });
      expect(resultado.ejercicio).toBe(anio);
      expect(item(resultado).total).toBe("100.00");
    }
  });

  // Alcance: Partida fuera del universo. Un registro posterior al corte de una Partida
  // ya declarada sigue siendo agregado no atribuible y bloquea su total (SPEC20).
  test("H-01c: un registro de archivo posterior al corte no contamina el universo del corte", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-06-30",
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH999", {
            partidaId: "PAR999",
            intervalo: { inicio: "2026-12-01", fin: "2026-12-31" },
            importeCentimos: "9999",
          }),
        ],
        movimientos: [],
      }),
    );

    expect(resultado.items.map((actual) => actual.partidaId)).toEqual(["PAR100"]);
    expect(resultado.sinClasificar).toEqual([]);
    expect(resultado.totales.valor).toBe("0.00");
    expect(resultado.totales.estadoTotal).toBe("Verificado");
    expect(resultado.totales.motivoCodigo).not.toBe("MappingPendiente");
  });
});

/**
 * Enmiendas E45 aprobadas el 2026-11-10 (orientación A/B/B/B).
 *
 * Estas pruebas son sintéticas: no son AC nuevos ni PASS funcional, no
 * acreditan DT7 y usan solo estructuras ya existentes del motor.
 */
describe("E45-A1 · conflictos globales canónicos y proyección local", () => {
  test("E45-A1-T1: un DuplicadoAmbiguo global no se copia a items[].conflictos", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [
              archivo("2026-01-01", "2026-12-31", "PAR100"),
              archivo("2026-01-01", "2026-12-31", "PAR200"),
            ],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            identidad: "COMPARTIDA-E45-A1",
            huellaContenido: "MISMA-HUELLA-E45-A1",
            partidaId: "PAR100",
            importeCentimos: "10000",
          }),
          registro("AH002", {
            identidad: "COMPARTIDA-E45-A1",
            huellaContenido: "MISMA-HUELLA-E45-A1",
            partidaId: "PAR200",
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
      universo: universo(["PAR100", "PAR200"]),
    });

    for (const partidaId of ["PAR100", "PAR200"]) {
      const actual = item(resultado, partidaId);
      // La Partida afectada queda bloqueada aunque su proyección local esté vacía.
      expect(actual.estadoTotal).toBe("NoVerificable");
      expect(actual.motivoCodigo).toBe("DuplicadoAmbiguo");
      expect(actual.archivo).toBeNull();
      expect(actual.total).toBeNull();
      expect(actual.conflictos).toEqual([]);
      expect(
        resultado.conflictos.filter(
          (conflicto) =>
            conflicto.tipo === "DuplicadoAmbiguo" &&
            conflicto.partidaId === partidaId,
        ),
      ).toHaveLength(1);
    }
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.estadoTotal).toBe("NoVerificable");
  });

  test("E45-A1-T2: VersionBifurcada solo en el global y Solapamiento local en su Partida", () => {
    const resultado = combinarHistoricoPrecontrol({
      ...entrada({
        fuentes: [
          fuente({
            fuenteId: "SRC-1",
            intervalosArchivo: [
              archivo("2026-01-01", "2026-12-31", "PAR100"),
              archivo("2026-01-01", "2026-07-31", "PAR200"),
            ],
            controlDetalle: null,
          }),
          fuente({
            fuenteId: "SRC-2",
            etiqueta: "Fuente sintética SRC-2",
            intervalosArchivo: [archivo("2026-07-01", "2026-12-31", "PAR200")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("BIF-V1", {
            identidad: "BIFURCADA-E45-A1",
            version: 1,
            partidaId: "PAR100",
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
          registro("BIF-V2", {
            identidad: "BIFURCADA-E45-A1",
            version: 2,
            partidaId: "PAR100",
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
      universo: universo(["PAR100", "PAR200"], [
        {
          fuenteId: "SRC-1",
          partidaId: "PAR100",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        },
        {
          fuenteId: "SRC-1",
          partidaId: "PAR200",
          estado: "Presente",
          intervalo: { inicio: "2026-01-01", fin: "2026-07-31" },
        },
        {
          fuenteId: "SRC-2",
          partidaId: "PAR200",
          estado: "Presente",
          intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
        },
      ]),
    });

    const versiones = resultado.conflictos.filter(
      (conflicto) => conflicto.tipo === "VersionBifurcada",
    );
    expect(versiones).toHaveLength(1);
    expect(versiones[0]!.partidaId).toBe("PAR100");
    expect(item(resultado, "PAR100").conflictos).toEqual([]);
    expect(item(resultado, "PAR100").motivoCodigo).toBe("DuplicadoAmbiguo");

    const locales = item(resultado, "PAR200").conflictos;
    expect(locales).toHaveLength(1);
    expect(locales[0]).toMatchObject({
      tipo: "Solapamiento",
      partidaId: "PAR200",
    });
    expect(locales.some((conflicto) => conflicto.tipo === "VersionBifurcada")).toBe(
      false,
    );

    // Filtrar el global por `partidaId` reconstruye la causa de cada item y
    // ningún conflicto se duplica.
    expect(
      resultado.conflictos
        .filter((conflicto) => conflicto.partidaId === "PAR100")
        .map((conflicto) => conflicto.tipo),
    ).toEqual(["VersionBifurcada"]);
    expect(
      resultado.conflictos
        .filter((conflicto) => conflicto.partidaId === "PAR200")
        .map((conflicto) => conflicto.tipo),
    ).toEqual(["Solapamiento"]);
    const claves = resultado.conflictos.map(
      (conflicto) =>
        `${conflicto.tipo}|${conflicto.partidaId}|${conflicto.motivo}`,
    );
    expect(new Set(claves).size).toBe(claves.length);
    expect(resultado.totales.estadoTotal).toBe("NoVerificable");
    expect(resultado.totales.valor).toBeNull();
  });

  test("E45-A1-T3: un caso limpio mantiene ambos niveles vacíos y certifica", () => {
    const resultado = combinarHistoricoPrecontrol(entrada());

    expect(resultado.conflictos).toEqual([]);
    expect(item(resultado).conflictos).toEqual([]);
    expect(item(resultado).estadoTotal).toBe("Verificado");
    expect(resultado.totales.estadoTotal).toBe("Verificado");
    expect(resultado.totales.valor).toBe("1500.00");
  });
});

describe("E45-A3 · atribución fuera de intervalosArchivo", () => {
  test("E45-A3-T1: dentro del corte pero fuera de tramos usa motivo y causa propios", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            corteArchivo: "2026-12-31",
            intervalosArchivo: [archivo("2026-01-01", "2026-06-30")],
            controlDetalle: { inicio: "2026-07-01", fin: "2026-12-31" },
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
    );
    const par100 = item(resultado);

    expect(par100.estadoCobertura).toBe("Completa");
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.archivo).toBeNull();
    expect(par100.motivoCodigo).toBe("RegistroFueraDeIntervalosArchivo");
    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH001",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
        importe: "100.00",
        causa: "FueraDeIntervalosArchivo",
      },
    ]);
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.estadoTotal).toBe("NoVerificable");
  });

  test("E45-A3-T2: exceder el corte conserva AgregadoNoAtribuibleAlCorte/CorteExcedido", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-06-30",
        movimientos: [],
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-08-27")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "120000",
          }),
        ],
      }),
    );
    const par100 = item(resultado);

    expect(par100.estadoCobertura).toBe("Completa");
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.motivoCodigo).toBe("AgregadoNoAtribuibleAlCorte");
    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH001",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
        importe: "1200.00",
        causa: "CorteExcedido",
      },
    ]);
    expect(par100.total).not.toBe("1200.00");
    expect(resultado.totales.valor).toBeNull();
  });

  test("E45-A3-T3: un registro dentro del tramo suma y no entra en agregados", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-02-01", fin: "2026-05-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBe("100.00");
    expect(par100.total).toBe("100.00");
    expect(resultado.agregadoNoAtribuible).toEqual([]);
    expect(par100.motivoCodigo).not.toBe("RegistroFueraDeIntervalosArchivo");
    expect(resultado.totales.valor).toBe("100.00");
  });

  test("E45-A3-T4: mismas consecuencias financieras con causa distinta", () => {
    const fueraDeTramos = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            corteArchivo: "2026-12-31",
            intervalosArchivo: [archivo("2026-01-01", "2026-06-30")],
            controlDetalle: { inicio: "2026-07-01", fin: "2026-12-31" },
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: [],
      }),
    );
    const excedeCorte = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-06-30",
        movimientos: [],
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-08-27")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "120000",
          }),
        ],
      }),
    );

    for (const resultado of [fueraDeTramos, excedeCorte]) {
      const par100 = item(resultado);
      expect(par100.estadoTotal).toBe("NoVerificable");
      expect(par100.total).toBeNull();
      expect(par100.subtotalConocido).toBeNull();
      expect(resultado.totales.valor).toBeNull();
      expect(resultado.totales.subtotalConocido).toBeNull();
    }
    expect(fueraDeTramos.agregadoNoAtribuible[0]!.causa).toBe(
      "FueraDeIntervalosArchivo",
    );
    expect(excedeCorte.agregadoNoAtribuible[0]!.causa).toBe("CorteExcedido");
    expect(item(fueraDeTramos).estadoTotal).toBe(
      item(excedeCorte).estadoTotal,
    );
  });

  test("E45-A3-T5: las comparaciones exactas de agregados incluyen causa sin duplicar", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-06-30",
        movimientos: [],
        fuentes: [
          fuente({
            corteArchivo: "2026-06-30",
            intervalosArchivo: [archivo("2026-01-01", "2026-03-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            identidad: "FUERA-TRAMOS",
            intervalo: { inicio: "2026-04-01", fin: "2026-06-30" },
            importeCentimos: "10000",
          }),
          registro("AH002", {
            identidad: "EXCEDE-CORTE",
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "120000",
          }),
        ],
      }),
    );

    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH001",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-04-01", fin: "2026-06-30" },
        importe: "100.00",
        causa: "FueraDeIntervalosArchivo",
      },
      {
        idArchivo: "AH002",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
        importe: "1200.00",
        causa: "CorteExcedido",
      },
    ]);
    expect(
      new Set(resultado.agregadoNoAtribuible.map((agregado) => agregado.idArchivo))
        .size,
    ).toBe(resultado.agregadoNoAtribuible.length);
    expect(item(resultado).total).toBeNull();
    expect(item(resultado).subtotalConocido).toBeNull();
    expect(resultado.totales.valor).toBeNull();
  });
});

describe("E45-A4 · alcance de sinClasificar y mapping posterior al corte", () => {
  test("E45-A4-T1: un Pendiente posterior al corte no bloquea y conserva trazabilidad", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-09-30",
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "120000",
          }),
          registro("AH002", {
            estadoMapeo: "Pendiente",
            intervalo: { inicio: "2026-10-01", fin: "2026-12-31" },
            importeCentimos: "5000",
          }),
        ],
      }),
    );
    const par100 = item(resultado);

    expect(resultado.sinClasificar).toEqual([]);
    expect(par100.estadoTotal).toBe("Verificado");
    expect(par100.total).toBe("1500.00");
    expect(resultado.totales.valor).toBe("1500.00");
    expect(resultado.totales.estadoTotal).toBe("Verificado");
    // Trazabilidad en las estructuras existentes del item.
    expect(par100.registros).toEqual(["AH001", "AH002"]);
    expect(par100.registrosNoComputados).toEqual([
      {
        idArchivo: "AH002",
        importe: "50.00",
        estadoVerificacion: "Verificado",
        estadoMapeo: "Pendiente",
        motivo: "Mapping de Partida pendiente; no se suma.",
      },
    ]);
  });

  test("E45-A4-T2: un Ambigua sin Partida posterior al corte no bloquea ni inventa item", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-09-30",
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "120000",
          }),
          registro("AH002", {
            partidaId: null,
            estadoMapeo: "Ambigua",
            intervalo: { inicio: "2026-10-01", fin: "2026-12-31" },
            importeCentimos: "5000",
          }),
        ],
      }),
    );

    // Sin lista nueva (no autorizada): el registro posterior sin Partida no se
    // expone en esta consulta; no se suma ni se reetiqueta y no bloquea.
    expect(resultado.sinClasificar).toEqual([]);
    expect(resultado.items.map((actual) => actual.partidaId)).toEqual([
      "PAR100",
    ]);
    expect(resultado.totales.valor).toBe("1500.00");
    expect(resultado.totales.estadoTotal).toBe("Verificado");
  });

  test("E45-A4-T3: un Pendiente que solapa el corte sigue en sinClasificar y bloquea", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "120000",
          }),
          registro("AH002", {
            estadoMapeo: "Pendiente",
            intervalo: { inicio: "2026-09-01", fin: "2026-12-31" },
            importeCentimos: "5000",
          }),
        ],
      }),
    );

    expect(resultado.sinClasificar).toEqual([
      {
        idArchivo: "AH002",
        importe: "50.00",
        motivo: "Mapping de Partida pendiente; no se suma.",
      },
    ]);
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.estadoTotal).toBe("NoVerificable");
    expect(resultado.totales.motivoCodigo).toBe("MappingPendiente");
  });

  test("E45-A4-T4: un Mapeado posterior que excede el corte sigue bloqueando como A3", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-06-30",
        movimientos: [],
        registros: [
          registro("AH002", {
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
            importeCentimos: "5000",
          }),
        ],
      }),
    );
    const par100 = item(resultado);

    expect(resultado.sinClasificar).toEqual([]);
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.motivoCodigo).toBe("AgregadoNoAtribuibleAlCorte");
    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH002",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
        importe: "50.00",
        causa: "CorteExcedido",
      },
    ]);
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.estadoTotal).toBe("NoVerificable");
  });

  test("E45-A4-T5: dos consultas conservan el registro sin contaminar el corte anterior", () => {
    const antesDelCorte = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-06-30",
        registros: [
          registro("AH002", {
            estadoMapeo: "Pendiente",
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
            importeCentimos: "5000",
          }),
        ],
        movimientos: [],
      }),
    );
    const conElRegistro = combinarHistoricoPrecontrol(
      entrada({
        registros: [
          registro("AH002", {
            estadoMapeo: "Pendiente",
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
            importeCentimos: "5000",
          }),
        ],
        movimientos: [],
      }),
    );

    // La consulta anterior no lo clasifica ni lo suma, pero conserva el mismo
    // `idArchivo` en la trazabilidad del item; no se borra ni se reetiqueta.
    expect(antesDelCorte.sinClasificar).toEqual([]);
    expect(item(antesDelCorte).registros).toEqual(["AH002"]);
    expect(antesDelCorte.totales.valor).toBe("0.00");
    expect(antesDelCorte.totales.estadoTotal).toBe("Verificado");
    expect(conElRegistro.sinClasificar.map((fila) => fila.idArchivo)).toEqual([
      "AH002",
    ]);
    expect(conElRegistro.totales.valor).toBeNull();
    expect(conElRegistro.totales.estadoTotal).toBe("NoVerificable");
  });
});

/**
 * E4.5 · corrección del hallazgo `intervalosArchivo: []` (2026-11-10).
 *
 * Equivalentes corregidos de la caracterización de #351. Regla: una lista vacía
 * significa NINGÚN intervalo aplicable; un registro solo suma si su intervalo
 * queda contenido en un tramo de SU PROPIA fuente, misma Partida y clase. La
 * cobertura de otra fuente o el `controlDetalle` no sustituyen la contención.
 * Los fixtures siguen siendo sintéticos.
 */
describe("E4.5 empty intervals · corrección (regla de contención)", () => {
  const sinDetalle = [] as MovimientoPrecontrol[];

  test("caso 1 corregido: fuente sin intervalos ni otra cobertura no suma ni inventa 0", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [fuente({ intervalosArchivo: [], controlDetalle: null })],
        registros: [registro("AH001", { importeCentimos: "10000" })],
        movimientos: sinDetalle,
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.estadoTotal).toBe("NoDisponible");
    expect(par100.motivoCodigo).toBe("RegistroFueraDeIntervalosArchivo");
    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH001",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        importe: "100.00",
        causa: "FueraDeIntervalosArchivo",
      },
    ]);
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.subtotalConocido).toBeNull();
  });

  test("caso 2a corregido: otra fuente cubre, pero el registro de la fuente sin intervalos no suma", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        universo: universo(["PAR100"], [
          {
            fuenteId: "SRC-2",
            partidaId: "PAR100",
            estado: "Presente",
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
          },
        ]),
        fuentes: [
          fuente({ intervalosArchivo: [], controlDetalle: null }),
          fuente({
            fuenteId: "SRC-2",
            etiqueta: "Fuente sintética SRC-2",
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [registro("AH001", { importeCentimos: "10000" })],
        movimientos: sinDetalle,
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.motivoCodigo).toBe("RegistroFueraDeIntervalosArchivo");
    expect(par100.estadoCobertura).toBe("Completa");
    expect(resultado.cobertura.coberturaGlobal).toBe("Completa");
    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH001",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        importe: "100.00",
        causa: "FueraDeIntervalosArchivo",
      },
    ]);
    expect(resultado.totales.valor).toBeNull();
    expect(resultado.totales.subtotalConocido).toBeNull();
    expect(resultado.totales.estadoTotal).toBe("NoVerificable");
  });

  test("caso 2b corregido: una fuente esperada sin cobertura suficiente no rescata el importe sin tramos", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        universo: universo(["PAR100"], [
          {
            fuenteId: "SRC-1",
            partidaId: "PAR100",
            estado: "Presente",
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
          },
          {
            fuenteId: "SRC-2",
            partidaId: "PAR100",
            estado: "Presente",
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
          },
        ]),
        fuentes: [
          fuente({ intervalosArchivo: [], controlDetalle: null }),
          fuente({
            fuenteId: "SRC-2",
            etiqueta: "Fuente sintética SRC-2",
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [registro("AH001", { importeCentimos: "10000" })],
        movimientos: sinDetalle,
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.estadoCobertura).toBe("Parcial");
    expect(par100.motivoCodigo).toBe("RegistroFueraDeIntervalosArchivo");
    expect(resultado.cobertura.coberturaGlobal).toBe("Parcial");
    expect(resultado.agregadoNoAtribuible).toHaveLength(1);
    expect(resultado.agregadoNoAtribuible[0]!.causa).toBe(
      "FueraDeIntervalosArchivo",
    );
    expect(resultado.totales.valor).toBeNull();
  });

  test("caso 2c corregido: expectativa posterior al corte no convierte el registro fuera de tramos en certificable", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-06-30",
        universo: universo(["PAR100"], [
          {
            fuenteId: "SRC-1",
            partidaId: "PAR100",
            estado: "Presente",
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
          },
          {
            fuenteId: "SRC-2",
            partidaId: "PAR100",
            estado: "Presente",
            intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
          },
        ]),
        fuentes: [
          fuente({ intervalosArchivo: [], controlDetalle: null }),
          fuente({
            fuenteId: "SRC-2",
            etiqueta: "Fuente sintética SRC-2",
            intervalosArchivo: [archivo("2026-01-01", "2026-06-30")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-02-01", fin: "2026-05-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: sinDetalle,
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.estadoCobertura).toBe("Completa");
    expect(par100.motivoCodigo).toBe("RegistroFueraDeIntervalosArchivo");
    expect(resultado.cobertura.coberturaGlobal).toBe("Completa");
    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH001",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-02-01", fin: "2026-05-31" },
        importe: "100.00",
        causa: "FueraDeIntervalosArchivo",
      },
    ]);
    expect(resultado.alcanceTotal).toBe("HastaCorte");
    expect(resultado.totales.valor).toBeNull();
  });

  test("caso 3a corregido: el controlDetalle cubre, pero no sustituye la contención en intervalosArchivo", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [],
            controlDetalle: { inicio: "2026-01-01", fin: "2026-12-31" },
          }),
        ],
        registros: [registro("AH001", { importeCentimos: "10000" })],
        movimientos: sinDetalle,
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBeNull();
    expect(par100.detalleControl).toBe("0.00");
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.estadoCobertura).toBe("Completa");
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.motivoCodigo).toBe("RegistroFueraDeIntervalosArchivo");
    expect(resultado.cobertura.coberturaGlobal).toBe("Completa");
    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH001",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        importe: "100.00",
        causa: "FueraDeIntervalosArchivo",
      },
    ]);
    expect(resultado.totales.valor).toBeNull();
  });

  test("caso 3b corregido: fuera del control de su fuente y sin intervalos propios, el importe no se certifica", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        universo: universo(["PAR100"], [
          {
            fuenteId: "SRC-1",
            partidaId: "PAR100",
            estado: "Presente",
            intervalo: { inicio: "2026-01-01", fin: "2026-06-30" },
          },
          {
            fuenteId: "SRC-2",
            partidaId: "PAR100",
            estado: "Presente",
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
          },
        ]),
        fuentes: [
          fuente({
            intervalosArchivo: [],
            controlDetalle: { inicio: "2026-01-01", fin: "2026-06-30" },
          }),
          fuente({
            fuenteId: "SRC-2",
            etiqueta: "Fuente sintética SRC-2",
            intervalosArchivo: [archivo("2026-07-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-07-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: sinDetalle,
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.estadoCobertura).toBe("Completa");
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.motivoCodigo).toBe("RegistroFueraDeIntervalosArchivo");
    expect(par100.cobertura.intervalos).toEqual([
      { inicio: "2026-01-01", fin: "2026-12-31" },
    ]);
    expect(resultado.cobertura.coberturaGlobal).toBe("Completa");
    expect(resultado.agregadoNoAtribuible).toHaveLength(1);
    expect(resultado.agregadoNoAtribuible[0]).toMatchObject({
      idArchivo: "AH001",
      causa: "FueraDeIntervalosArchivo",
    });
    expect(resultado.totales.valor).toBeNull();
  });

  test("caso 3c corregido: un registro contenido en los tramos de su fuente suma una sola vez", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        fuentes: [
          fuente({
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-02-01", fin: "2026-05-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: sinDetalle,
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBe("100.00");
    expect(par100.total).toBe("100.00");
    expect(par100.motivoCodigo).toBeNull();
    expect(resultado.agregadoNoAtribuible).toEqual([]);
    expect(resultado.totales.valor).toBe("100.00");
    expect(
      resultado.agregadoNoAtribuible.filter(
        (agregado) => agregado.idArchivo === "AH001",
      ),
    ).toHaveLength(0);
  });

  test("precedencia: exceder el corte conserva CorteExcedido aunque intervalosArchivo esté vacío", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-06-30",
        fuentes: [fuente({ intervalosArchivo: [], controlDetalle: null })],
        registros: [
          registro("AH001", {
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
            importeCentimos: "10000",
          }),
        ],
        movimientos: sinDetalle,
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.motivoCodigo).toBe("AgregadoNoAtribuibleAlCorte");
    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH001",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        importe: "100.00",
        causa: "CorteExcedido",
      },
    ]);
  });

  test("los filtros de elegibilidad no emiten FueraDeIntervalosArchivo: Rechazado, NoVerificado, vinculado, Desconocido y regularización pendiente", () => {
    const casos: Array<{
      nombre: string;
      registro: RegistroPrecontrol;
      movimientos: MovimientoPrecontrol[];
    }> = [
      {
        nombre: "Rechazado",
        registro: registro("AH-RECHAZADO", {
          estadoVerificacion: "Rechazado",
          importeCentimos: "10000",
        }),
        movimientos: [],
      },
      {
        nombre: "NoVerificado",
        registro: registro("AH-NOVERIFICADO", {
          estadoVerificacion: "NoVerificado",
          importeCentimos: "10000",
        }),
        movimientos: [],
      },
      {
        nombre: "vinculado",
        registro: registro("AH-VINCULADO", {
          representadoEnMovimientos: "Si",
          evidenciaRepresentacion: "Vínculo sintético verificado.",
          importeCentimos: "10000",
        }),
        movimientos: [
          movimiento("MV-VINCULADO", {
            importeCentimos: "10000",
            vinculoArchivoId: "AH-VINCULADO",
          }),
        ],
      },
      {
        nombre: "Desconocido",
        registro: registro("AH-DESCONOCIDO", {
          representadoEnMovimientos: "Desconocido",
          evidenciaRepresentacion: null,
          importeCentimos: "10000",
        }),
        movimientos: [],
      },
      {
        nombre: "regularización pendiente",
        registro: registro("AH-REGULARIZACION", {
          clase: "Regularizacion2026",
          intervalo: { inicio: "2026-06-15", fin: "2026-06-15" },
          fecha: "2026-06-15",
          evidenciaRegularizacion:
            "Q5=A: naturaleza, signo e inclusión acreditados en fixture sintético.",
          motivo: null,
          importeCentimos: "5000",
        }),
        movimientos: [],
      },
    ];

    for (const caso of casos) {
      const resultado = combinarHistoricoPrecontrol(
        entrada({
          fuentes: [fuente({ intervalosArchivo: [], controlDetalle: null })],
          registros: [caso.registro],
          movimientos: caso.movimientos,
        }),
      );
      const par100 = item(resultado);

      expect(resultado.agregadoNoAtribuible, caso.nombre).toEqual([]);
      expect(par100.archivo, caso.nombre).toBeNull();
      expect(par100.total, caso.nombre).toBeNull();
      expect(par100.motivoCodigo, caso.nombre).not.toBe(
        "RegistroFueraDeIntervalosArchivo",
      );
    }
  });

  test("un importe cero fuera de tramo tampoco acredita cobertura ni total verificado", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        universo: universo(["PAR100"], [
          {
            fuenteId: "SRC-2",
            partidaId: "PAR100",
            estado: "Presente",
            intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
          },
        ]),
        fuentes: [
          fuente({ intervalosArchivo: [], controlDetalle: null }),
          fuente({
            fuenteId: "SRC-2",
            etiqueta: "Fuente sintética SRC-2",
            intervalosArchivo: [archivo("2026-01-01", "2026-12-31")],
            controlDetalle: null,
          }),
        ],
        registros: [registro("AH-CERO", { importeCentimos: "0" })],
        movimientos: sinDetalle,
      }),
    );
    const par100 = item(resultado);

    expect(par100.archivo).toBeNull();
    expect(par100.archivo).not.toBe("0.00");
    expect(par100.subtotalConocido).toBeNull();
    expect(par100.total).toBeNull();
    expect(par100.estadoTotal).toBe("NoVerificable");
    expect(par100.motivoCodigo).toBe("RegistroFueraDeIntervalosArchivo");
    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH-CERO",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-01-01", fin: "2026-12-31" },
        importe: "0.00",
        causa: "FueraDeIntervalosArchivo",
      },
    ]);
    expect(resultado.totales.valor).toBeNull();
  });

  test("no duplica el registro: cada id aparece una vez y con una sola causa", () => {
    const resultado = combinarHistoricoPrecontrol(
      entrada({
        corte: "2026-06-30",
        fuentes: [
          fuente({
            corteArchivo: "2026-06-30",
            intervalosArchivo: [archivo("2026-01-01", "2026-03-31")],
            controlDetalle: null,
          }),
        ],
        registros: [
          registro("AH001", {
            identidad: "FUERA-TRAMOS",
            intervalo: { inicio: "2026-04-01", fin: "2026-06-30" },
            importeCentimos: "10000",
          }),
          registro("AH002", {
            identidad: "EXCEDE-CORTE",
            intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
            importeCentimos: "120000",
          }),
        ],
        movimientos: sinDetalle,
      }),
    );

    expect(resultado.agregadoNoAtribuible).toEqual([
      {
        idArchivo: "AH001",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-04-01", fin: "2026-06-30" },
        importe: "100.00",
        causa: "FueraDeIntervalosArchivo",
      },
      {
        idArchivo: "AH002",
        partidaId: "PAR100",
        intervalo: { inicio: "2026-01-01", fin: "2026-08-27" },
        importe: "1200.00",
        causa: "CorteExcedido",
      },
    ]);
    const ids = resultado.agregadoNoAtribuible.map(
      (agregado) => agregado.idArchivo,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(item(resultado).total).toBeNull();
    expect(item(resultado).subtotalConocido).toBeNull();
    expect(resultado.totales.valor).toBeNull();
  });
});
