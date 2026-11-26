import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SUPPORTED,
  admitted,
  appLabelFor,
  appLabels,
  contractIdFor,
  historical14,
  isKnownSchemaVersion,
  schemaVersion,
  type Supported,
} from "./schema-catalog";

const VERSIONS: Supported[] = Array.from(
  { length: 34 },
  (_, index) => (index + 1) as Supported,
);

/** Snapshot exacto de `manifest.app` por versión: nunca se re-deriva de la vigente. */
const MANIFEST_LABELS: Record<number, string> = {
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
  33: "e39.1-v33",
  34: "e39.2-v34",
};

const CONTRACT_IDS: Record<number, string> = {
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
  33: "C33-SPEC39-DEVOLUCION-TRIGGER",
  34: "C34-SPEC38-VALIDACION-VERSION-CONJUNTO",
};

test("catálogo: versiones soportadas contiguas y vigente derivada de la última", () => {
  expect([...SUPPORTED]).toEqual(VERSIONS);
  expect(new Set(SUPPORTED).size).toBe(VERSIONS.length);
  expect(schemaVersion).toBe(34);
  expect(SUPPORTED[SUPPORTED.length - 1]).toBe(schemaVersion);
});

test("catálogo: 34 pares versión → etiqueta de manifiesto, exactos y únicos", () => {
  expect(appLabels).toEqual(MANIFEST_LABELS);
  expect(Object.keys(appLabels).map(Number).sort((a, b) => a - b)).toEqual(
    VERSIONS,
  );
  expect(new Set(Object.values(appLabels)).size).toBe(34);
  for (const version of VERSIONS) {
    expect(appLabels[version]).toBe(MANIFEST_LABELS[version]);
    expect(appLabels[version].endsWith(`-v${version}`)).toBe(true);
    expect(appLabelFor(version)).toBe(MANIFEST_LABELS[version]);
  }
});

test("catálogo: contratos admitidos C14…C34 exactos e histórico v14 preservado", () => {
  expect({ ...admitted } as Record<number, string>).toEqual(CONTRACT_IDS);
  expect(Object.keys(admitted).map(Number).sort((a, b) => a - b)).toEqual(
    VERSIONS.slice(13),
  );
  expect(new Set(Object.values(admitted)).size).toBe(21);
  expect(historical14).toBe("C14-COMPARTIDOS-FCE1107");
  expect(Object.values(admitted)).not.toContain(historical14);
});

test("contratos: solo v14…v34 declaran contrato; el resto devuelve null", () => {
  for (const version of VERSIONS) {
    expect(contractIdFor(version)).toBe(CONTRACT_IDS[version] ?? null);
  }
  expect(contractIdFor(1)).toBeNull();
  expect(contractIdFor(13)).toBeNull();
  expect(contractIdFor(35)).toBeNull();
  expect(contractIdFor(0)).toBeNull();
  expect(contractIdFor(1.5)).toBeNull();
});

test("etiquetas: una versión sin entrada falla explícitamente, sin fallback", () => {
  expect(() => appLabelFor(35)).toThrow(
    "Etiqueta de manifiesto ausente para el esquema v35.",
  );
  expect(() => appLabelFor(0)).toThrow(
    "Etiqueta de manifiesto ausente para el esquema v0.",
  );
  expect(() => appLabelFor(1.5)).toThrow(
    "Etiqueta de manifiesto ausente para el esquema v1.5.",
  );
});

test("admisión: solo enteros dentro del rango soportado", () => {
  expect(isKnownSchemaVersion(0)).toBe(false);
  expect(isKnownSchemaVersion(1)).toBe(true);
  expect(isKnownSchemaVersion(31)).toBe(true);
  expect(isKnownSchemaVersion(35)).toBe(false);
  expect(isKnownSchemaVersion(1.5)).toBe(false);
  expect(isKnownSchemaVersion(-1)).toBe(false);
  expect(isKnownSchemaVersion(Number.NaN)).toBe(false);
  for (const version of VERSIONS) expect(isKnownSchemaVersion(version)).toBe(true);
});

test("catálogo: módulo hoja, sin imports internos que creen un ciclo", () => {
  const source = readFileSync(join(import.meta.dir, "schema-catalog.ts"), "utf8");
  expect(source).not.toMatch(/^\s*import\s[^;]*from\s+["']\.{1,2}\//m);
  expect(source).not.toMatch(/^\s*export\s[^;]*from\s+["']\.{1,2}\//m);
  expect(source).not.toMatch(/\brequire\(/);
});