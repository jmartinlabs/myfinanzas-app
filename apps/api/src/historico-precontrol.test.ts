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

    expect(resultado.cobertura.estadoCobertura).toBe("Completa");
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
