import { expect, test } from "bun:test";
import {
  CAUSAS_COBERTURA,
  ENTIDADES_PERMITIDAS,
  FUENTES_COBERTURA,
  LIMITES_DETALLE,
  construirDetalleValidacion,
  decimalCanonico,
  esDecimalCanonico,
  parsearDetalleValidacion,
  serializarDetalleValidacion,
  validarDetalleValidacion,
  type DetalleValidacion,
} from "./cierre-validacion-dto";
import { Problem } from "./problem";
import type { ProcedenciaValidada } from "./cierre-validacion-dto";

/**
 * SPEC38 · I1 — constructor/validador central del DTO de auditoría.
 *
 * Lo que se acredita aquí es la lista blanca de §2.3 en el servicio: rechazo
 * mecánico de cualquier `number` JSON, forma exacta en cada nivel, enums
 * cerrados y decimales canónicos. La segunda línea de defensa —los triggers de
 * la base— se acredita en `cierre-validacion-schema.test.ts`.
 */
const VACIO: DetalleValidacion = {
  hechos: [],
  ciclos: [],
  cobertura: [],
  procedencia: null,
};

const COMPLETO: DetalleValidacion = {
  hechos: [
    { entidad: "movimiento", id: "12", revision: "3" },
    { entidad: "referencia", id: "4", revision: "1" },
  ],
  ciclos: [
    { id: "2", impactos: ["FLUJO_CICLO", "BALANCE_FIN"] },
    { id: "1", impactos: [] },
  ],
  cobertura: [
    { fuente: "movimientos", estado: "Disponible", causas: [] },
    {
      fuente: "e35",
      estado: "Parcial",
      causas: ["FIN_NETA_NO_DISPONIBLE"],
    },
  ],
  procedencia: {
    tabla: "cierre_vinculos",
    id: null,
    version: null,
    reaperturaId: "7",
    activa: null,
    versionOrigen: "1",
    versionDestino: "2",
    correlacion: "REAP:7",
  },
};

function rechaza(entrada: unknown, fragmento: string) {
  let capturado: unknown = null;
  try {
    construirDetalleValidacion(entrada);
  } catch (error) {
    capturado = error;
  }
  expect(capturado).toBeInstanceOf(Problem);
  const problema = capturado as Problem;
  expect(problema.status).toBe(422);
  expect(problema.code).toBe("VALIDATION");
  expect(problema.message).toContain(fragmento);
}

test("DTO: la copia es exacta y no arrastra claves ajenas", () => {
  const copia = construirDetalleValidacion(COMPLETO);
  expect(copia).toEqual({
    ...COMPLETO,
    ciclos: [
      { id: "2", impactos: ["FLUJO_CICLO", "BALANCE_FIN"] },
      { id: "1", impactos: [] },
    ],
    cobertura: [
      { fuente: "movimientos", estado: "Disponible", causas: [] },
      { fuente: "e35", estado: "Parcial", causas: ["FIN_NETA_NO_DISPONIBLE"] },
    ],
  });
  expect(validarDetalleValidacion(VACIO)).toEqual(VACIO);
});

test("DTO: rechaza cualquier número, bajo clave permitida o desconocida", () => {
  // Clave permitida: `revision` es decimal en texto, nunca número.
  rechaza(
    { ...VACIO, hechos: [{ entidad: "movimiento", id: "1", revision: 1 }] },
    "no se admite ningún número JSON",
  );
  // Clave permitida: `id` numérico tampoco.
  rechaza(
    { ...VACIO, ciclos: [{ id: 1, impactos: [] }] },
    "no se admite ningún número JSON",
  );
  // Clave desconocida con cifra.
  rechaza({ ...VACIO, total: 1250 }, "no se admite ningún número JSON");
  // Cifra suelta en el objeto raíz.
  rechaza({ ...VACIO, x: 0 }, "no se admite ningún número JSON");
  // Número anidado dentro de un objeto y de un array.
  rechaza(
    { ...VACIO, ciclos: [{ id: "1", impactos: [], pesos: [{ v: 1.5 }] }] },
    "no se admite ningún número JSON",
  );
  rechaza(
    { ...VACIO, cobertura: [{ fuente: "plan", estado: "Parcial", causas: [0] }] },
    "no se admite ningún número JSON",
  );
});

test("DTO: un decimal en string debe ser canónico", () => {
  for (const revision of ["007", "1.0", "1e3", "-1", "", " 1", "1 ", "0x10"]) {
    rechaza(
      { ...VACIO, hechos: [{ entidad: "movimiento", id: "1", revision }] },
      "se esperaba texto decimal canónico",
    );
  }
  expect(
    construirDetalleValidacion({
      ...VACIO,
      hechos: [{ entidad: "movimiento", id: "0", revision: "0" }],
    }).hechos,
  ).toEqual([{ entidad: "movimiento", id: "0", revision: "0" }]);
  expect(esDecimalCanonico("0")).toBe(true);
  expect(esDecimalCanonico("123456789012345678")).toBe(true);
  expect(esDecimalCanonico(123)).toBe(false);
  expect(() => decimalCanonico(1.5)).toThrow();
  expect(decimalCanonico(42)).toBe("42");
  expect(decimalCanonico(42n)).toBe("42");
});

test("DTO: forma exacta en cada nivel, sin claves extra ni ausentes", () => {
  rechaza([], "se esperaba un objeto");
  rechaza({ ...VACIO, antes: "x" }, "clave no admitida «antes»");
  rechaza({ hechos: [], ciclos: [], cobertura: [] }, "falta la clave «procedencia»");
  rechaza(
    { ...VACIO, hechos: [{ entidad: "movimiento", id: "1" }] },
    "falta la clave «revision»",
  );
  rechaza(
    { ...VACIO, hechos: [{ entidad: "movimiento", id: "1", revision: "1", importe: "12" }] },
    "clave no admitida «importe»",
  );
  rechaza(
    { ...VACIO, ciclos: [{ id: "1", impactos: [], cifras: "9,99" }] },
    "clave no admitida «cifras»",
  );
  rechaza(
    { ...VACIO, cobertura: [{ fuente: "plan", estado: "Parcial", causas: [], importe: "1" }] },
    "clave no admitida «importe»",
  );
  rechaza(
    {
      ...VACIO,
      procedencia: {
        tabla: "cierres",
        id: null,
        version: "1",
        reaperturaId: null,
        activa: null,
        versionOrigen: null,
        versionDestino: null,
        correlacion: null,
        importe: "1",
      },
    },
    "clave no admitida «importe»",
  );
});

test("DTO: enums cerrados de los dominios instalados", () => {
  rechaza(
    { ...VACIO, hechos: [{ entidad: "gasto", id: "1", revision: "1" }] },
    "valor no admitido «gasto»",
  );
  rechaza(
    { ...VACIO, ciclos: [{ id: "1", impactos: ["IMPORTE"] }] },
    "valor no admitido «IMPORTE»",
  );
  rechaza(
    { ...VACIO, ciclos: [{ id: "1", impactos: ["MIGRACION"] }] },
    "valor no admitido «MIGRACION»",
  );
  rechaza(
    { ...VACIO, cobertura: [{ fuente: "hechos", estado: "Disponible", causas: [] }] },
    "valor no admitido «hechos»",
  );
  rechaza(
    { ...VACIO, cobertura: [{ fuente: "plan", estado: "Completo", causas: [] }] },
    "valor no admitido «Completo»",
  );
  rechaza(
    { ...VACIO, cobertura: [{ fuente: "plan", estado: "Parcial", causas: ["OTRA"] }] },
    "valor no admitido «OTRA»",
  );
  rechaza(
    {
      ...VACIO,
      procedencia: {
        tabla: "cierre_validacion",
        id: null,
        version: "1",
        reaperturaId: null,
        activa: null,
        versionOrigen: null,
        versionDestino: null,
        correlacion: null,
      },
    },
    "valor no admitido «cierre_validacion»",
  );
  expect(ENTIDADES_PERMITIDAS).toEqual(["movimiento", "referencia"]);
  expect(FUENTES_COBERTURA.length).toBe(8);
  expect(CAUSAS_COBERTURA).toContain("MIGRACION_FUENTE_NO_ACREDITADA");
});

test("DTO: arrays acotados, sin repetidos y con cobertura coherente", () => {
  const deCobertura = (fuente: string) => ({
    ...VACIO,
    cobertura: [{ fuente, estado: "Disponible", causas: [] }],
  });
  expect(() => construirDetalleValidacion(deCobertura("plan"))).not.toThrow();
  rechaza(
    {
      ...VACIO,
      cobertura: [
        { fuente: "plan", estado: "Disponible", causas: [] },
        { fuente: "plan", estado: "Disponible", causas: [] },
      ],
    },
    "fuente repetida «plan»",
  );
  rechaza(
    { ...VACIO, cobertura: [{ fuente: "plan", estado: "Disponible", causas: ["S0_AUSENTE"] }] },
    "una fuente disponible no declara causas",
  );
  rechaza(
    { ...VACIO, cobertura: [{ fuente: "plan", estado: "Parcial", causas: [] }] },
    "una fuente parcial o ausente exige causa",
  );
  rechaza(
    {
      ...VACIO,
      hechos: [
        { entidad: "movimiento", id: "1", revision: "1" },
        { entidad: "movimiento", id: "1", revision: "2" },
      ],
    },
    "hecho repetido «movimiento:1»",
  );
  rechaza(
    {
      ...VACIO,
      ciclos: [
        { id: "1", impactos: [] },
        { id: "1", impactos: [] },
      ],
    },
    "ciclo repetido «1»",
  );
  rechaza(
    {
      ...VACIO,
      hechos: Array.from({ length: LIMITES_DETALLE.hechos + 1 }, (_, indice) => ({
        entidad: "movimiento",
        id: String(indice + 1),
        revision: "1",
      })),
    },
    "demasiados elementos",
  );
  rechaza(
    { ...VACIO, ciclos: [{ id: "1", impactos: ["FLUJO_CICLO", "FLUJO_CICLO"] }] },
    "código repetido «FLUJO_CICLO»",
  );
});

test("DTO: procedencia con identidad legada coherente con su tabla", () => {
  const base: ProcedenciaValidada = {
    tabla: "cierres",
    id: null,
    version: "1",
    reaperturaId: null,
    activa: null,
    versionOrigen: null,
    versionDestino: null,
    correlacion: null,
  };
  expect(
    construirDetalleValidacion({ ...VACIO, procedencia: base }).procedencia,
  ).toEqual(base);
  // Clave compuesta: `id` debe ser null.
  rechaza({ ...VACIO, procedencia: { ...base, id: "1" } }, "clave legada es compuesta");
  // Tabla de clave simple: `id` obligatorio.
  rechaza(
    { ...VACIO, procedencia: { ...base, tabla: "reaperturas", version: null } },
    "la tabla legada exige id",
  );
  // `activa` sólo en la fila activa de reapertura.
  rechaza(
    { ...VACIO, procedencia: { ...base, activa: true } },
    "sólo la fila activa de reapertura declara",
  );
  rechaza(
    {
      ...VACIO,
      procedencia: {
        ...base,
        tabla: "reapertura_activa",
        version: null,
        id: "7",
        activa: true,
      },
    },
    "la fila activa exige reaperturaId",
  );
  // El vínculo exige sus dos versiones.
  rechaza(
    {
      ...VACIO,
      procedencia: { ...base, tabla: "cierre_vinculos", version: null, versionOrigen: "1" },
    },
    "el vínculo exige versionOrigen y versionDestino",
  );
  // Cierres/fotos exigen la versión que los identifica.
  rechaza(
    { ...VACIO, procedencia: { ...base, version: null } },
    "la tabla legada exige la versión",
  );
  // `activa` debe ser booleano: un número lo rechaza la regla mecánica y un
  // texto lo rechaza el tipo del campo.
  rechaza(
    {
      ...VACIO,
      procedencia: {
        ...base,
        tabla: "reapertura_activa",
        version: null,
        id: "7",
        reaperturaId: "7",
        activa: 1,
      },
    },
    "no se admite ningún número JSON",
  );
  rechaza(
    {
      ...VACIO,
      procedencia: {
        ...base,
        tabla: "reapertura_activa",
        version: null,
        id: "7",
        reaperturaId: "7",
        activa: "true",
      },
    },
    "se esperaba booleano o null",
  );
});

test("DTO: serialización canónica independiente del orden de entrada", () => {
  const uno = serializarDetalleValidacion(COMPLETO);
  const otro = serializarDetalleValidacion({
    ...COMPLETO,
    hechos: [...COMPLETO.hechos].reverse(),
    ciclos: [...COMPLETO.ciclos].reverse(),
    cobertura: [...COMPLETO.cobertura].reverse(),
  });
  expect(uno).toBe(otro);
  expect(JSON.stringify(JSON.parse(uno))).toContain('"hechos":[{"entidad":"movimiento"');
  expect(() =>
    serializarDetalleValidacion({
      ...COMPLETO,
      hechos: [{ entidad: "movimiento", id: "12", revision: 3 } as never],
    }),
  ).toThrow("no se admite ningún número JSON");
});

test("DTO: el texto persistido se parsea con la misma puerta estricta", () => {
  const canonico = serializarDetalleValidacion(COMPLETO);
  expect(parsearDetalleValidacion(canonico)).toEqual(JSON.parse(canonico));
  expect(serializarDetalleValidacion(parsearDetalleValidacion(canonico))).toBe(canonico);
  expect(() => parsearDetalleValidacion("{")).toThrow("JSON ilegible");
  expect(() => parsearDetalleValidacion('{"x":123}')).toThrow(
    "no se admite ningún número JSON",
  );
});