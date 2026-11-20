/**
 * Catálogo canónico del esquema SQLite global: versiones soportadas, contratos
 * admitidos y etiqueta de manifiesto de cada versión.
 *
 * Módulo hoja: no importa ningún otro módulo interno, de modo que identidad,
 * migrador, validador de contratos, backup/restore y seed pueden leerlo sin
 * crear un ciclo de imports. Los valores históricos son datos congelados: ni el
 * contrato ni la etiqueta de una versión antigua se derivan de la vigente.
 */

/** Todas las versiones que esta compilación puede abrir, en orden de migración. */
export const SUPPORTED = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
] as const;

export type Supported = (typeof SUPPORTED)[number];

/** Versión vigente: la última admitida. Una versión nueva solo amplía SUPPORTED. */
export const schemaVersion: Supported = SUPPORTED[SUPPORTED.length - 1];

/**
 * Identificador del contrato verificado antes de tocar una base existente.
 * Solo v14–v31 lo tienen; las versiones anteriores no declaran contrato.
 */
export const admitted = {
  14: "C14-VEHICULOS-C69E343",
  15: "C15-COMPARTIDOS-AD2EDFE",
  16: "C16-REVISION-COMIDA-26B6F0C",
  17: "C17-D5-CF6954A",
  18: "C18-INVERSION-306BBC5",
  19: "C19-COMIDA-UNICO-01",
  20: "C20-DPRIMA-SIMPLIFICADA",
  21: "C21-VENTAS-E42",
  22: "C22-E35-FIN-NETA",
  23: "C23-E44-DEUDA-COMPLETA",
  24: "C24-E43-VALORACION",
  25: "C25-E49-CIERRE-FINANCIERO",
  26: "C26-E410-REAPERTURA-V26",
  27: "C27-E411-FOTOS-PERIODO",
  28: "C28-REPARTO-PENDIENTE-6A31C23",
  29: "C29-REPARTO-ORIGEN-86DED4B",
  30: "C30-SPEC37-COORDINADO-0E1F34D",
  31: "C31-SPEC37-INTENCION-91C32F5",
  32: "C32-SPEC38-VALIDACION-CIERRE",
} as const;

/** Evidencia histórica del contrato v14: nunca un origen de migración. */
export const historical14 = "C14-COMPARTIDOS-FCE1107";

/**
 * Etiqueta escrita en `manifest.app` para cada versión. Un backup de v24 debe
 * seguir diciendo `e4.3-v24` para siempre, por eso la tabla es explícita.
 */
export const appLabels: Record<Supported, string> = {
  1: "e1.1-v1",
  2: "e1.2-v2",
  3: "e1.3-v3",
  4: "e1.4-v4",
  5: "e1.5-v5",
  6: "sqlite-v6",
  7: "e1.6-v7",
  8: "e2.2-v8",
  9: "e2.1-v9",
  10: "e2.3-v10",
  11: "e2.4-v11",
  12: "e2.5-v12",
  13: "e3.1-v13",
  14: "e3.3-v14",
  15: "e3.2-v15",
  16: "e3.4-v16",
  17: "e3.2-d5-v17",
  18: "e4.1-v18",
  19: "e3.4-v19",
  20: "e2.7-v20",
  21: "e4.2-v21",
  22: "e35-v22",
  23: "e4.4-v23",
  24: "e4.3-v24",
  25: "e4.9-v25",
  26: "e4.10-v26",
  27: "e4.11-v27",
  28: "e36.1-v28",
  29: "e36.3-v29",
  30: "e37.1-v30",
  31: "e37.2-v31",
  32: "e38.1-v32",
};

/** Predicado único de admisión: entero dentro del rango soportado. */
export function isKnownSchemaVersion(version: number): version is Supported {
  return (
    Number.isInteger(version) &&
    version >= SUPPORTED[0] &&
    version <= schemaVersion
  );
}

/** Contrato admitido de una versión, o `null` si esa versión no declara ninguno. */
export function contractIdFor(version: number): string | null {
  return (admitted as Readonly<Record<number, string>>)[version] ?? null;
}

/** Etiqueta de manifiesto de una versión; una ausencia es un error, nunca un fallback. */
export function appLabelFor(version: number): string {
  const label = (appLabels as Readonly<Record<number, string | undefined>>)[
    version
  ];
  if (!label)
    throw new Error(
      `Etiqueta de manifiesto ausente para el esquema v${version}.`,
    );
  return label;
}