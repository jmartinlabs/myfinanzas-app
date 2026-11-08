import { test, expect } from "bun:test";
import qrcode from "qrcode-generator";
import { qrSvg, TOTP_QR_LABEL } from "../src/qr";

/**
 * URI `otpauth://` de alta tal y como lo devuelve `GET /api/auth/login` cuando
 * falta enrolar el segundo factor (`enrollment.uri`).
 */
const QR_URI =
  "otpauth://totp/MyFinanzas:Usuario%20%C3%BAnico?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=MyFinanzas&algorithm=SHA1&digits=6&period=30";
const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
/** Lado de cada módulo dibujado y zona de silencio, en módulos. */
const CELL = 4;
const QUIET_ZONE = 4;

type Matrix = { modules: number; dark: boolean[][]; darkCount: number };

function referenceMatrix(value: string): Matrix {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const modules = qr.getModuleCount();
  let darkCount = 0;
  const dark = Array.from({ length: modules }, (_, row) =>
    Array.from({ length: modules }, (_, column) => {
      const isDark = qr.isDark(row, column);
      if (isDark) darkCount += 1;
      return isDark;
    }),
  );
  return { modules, dark, darkCount };
}

/** Reconstruye la matriz de módulos a partir de la geometría del `<path>`. */
function matrixFromSvg(svg: string): Matrix {
  const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  expect(viewBox).not.toBeNull();
  const size = Number(viewBox![1]);
  expect(Number(viewBox![2])).toBe(size);
  const cells = [
    ...svg.matchAll(/M(-?\d+) (-?\d+)h(-?\d+)v(-?\d+)h-(-?\d+)z/g),
  ].map((m) => m.slice(1).map(Number));
  expect(cells.length).toBeGreaterThan(0);
  // Todos los módulos son cuadrados iguales alineados en la misma rejilla.
  for (const [x, y, h, v, back] of cells) {
    expect([h, v, back]).toEqual([CELL, CELL, CELL]);
    expect(x % CELL).toBe(0);
    expect(y % CELL).toBe(0);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
  }
  const modules = size / CELL - QUIET_ZONE * 2;
  expect(Number.isInteger(modules)).toBe(true);
  const dark = Array.from({ length: modules }, () =>
    Array.from({ length: modules }, () => false),
  );
  const seen = new Set<string>();
  for (const [x, y] of cells) {
    const column = x / CELL - QUIET_ZONE;
    const row = y / CELL - QUIET_ZONE;
    // Ningún módulo cae en la zona de silencio ni fuera del símbolo.
    expect(column).toBeGreaterThanOrEqual(0);
    expect(column).toBeLessThan(modules);
    expect(row).toBeGreaterThanOrEqual(0);
    expect(row).toBeLessThan(modules);
    expect(seen.has(`${row},${column}`)).toBe(false);
    seen.add(`${row},${column}`);
    dark[row][column] = true;
  }
  return { modules, dark, darkCount: cells.length };
}

/** Patrón localizador 7×7 con anillo claro y núcleo 3×3 en la esquina dada. */
function hasFinder(dark: boolean[][], top: number, left: number) {
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      const ring = row === 0 || row === 6 || column === 0 || column === 6;
      const core = row >= 2 && row <= 4 && column >= 2 && column <= 4;
      if (dark[top + row][left + column] !== (ring || core)) return false;
    }
  }
  return true;
}

test("qrSvg devuelve un SVG inline accesible y sin recursos externos", () => {
  const svg = qrSvg(QR_URI);
  expect(svg.startsWith("<svg ")).toBe(true);
  expect(svg.endsWith("</svg>")).toBe(true);
  expect(svg).toContain('role="img"');
  expect(svg).toContain(`aria-label="${TOTP_QR_LABEL}"`);
  expect(svg).toContain('aria-label="Código QR para configurar la aplicación autenticadora"');
  // La etiqueta es genérica: no revela el secreto ni el URI.
  expect(svg).not.toContain(SECRET);
  // Sin imágenes remotas, scripts, `data:` ni estilos inline.
  expect(svg).not.toContain("http");
  expect(svg).not.toContain("<image");
  expect(svg).not.toContain("<script");
  expect(svg).not.toContain("data:");
  expect(svg).not.toContain("style=");
  expect(svg).not.toContain("<a ");
});

test("qrSvg codifica exactamente el URI en una matriz QR válida", () => {
  const svg = qrSvg(QR_URI);
  const rendered = matrixFromSvg(svg);
  // Tipo automático con corrección M para el secreto real de 32 caracteres: versión 8 (49×49).
  expect(rendered.modules).toBe(49);
  expect(rendered.darkCount).toBe(referenceMatrix(QR_URI).darkCount);
  // La geometría dibujada reproduce la matriz del generador para ese URI.
  expect(rendered.dark).toEqual(referenceMatrix(QR_URI).dark);
  // Y no la de otro contenido: cambiar un byte cambia la matriz.
  const other = QR_URI.replace("period=30", "period=60");
  expect(rendered.dark).not.toEqual(referenceMatrix(other).dark);
  // Estructura QR real: tres localizadores en las esquinas.
  expect(hasFinder(rendered.dark, 0, 0)).toBe(true);
  expect(hasFinder(rendered.dark, 0, rendered.modules - 7)).toBe(true);
  expect(hasFinder(rendered.dark, rendered.modules - 7, 0)).toBe(true);
  // El contenido no se serializa en el marcado: solo determina los módulos.
  expect(svg).not.toContain("otpauth");
  expect(svg).not.toContain(SECRET);
});

test("qrSvg es determinista y no comparte estado entre llamadas", () => {
  expect(qrSvg(QR_URI)).toBe(qrSvg(QR_URI));
  expect(qrSvg("otpauth://totp/MyFinanzas:Usuario%20%C3%BAnico?secret=AAAABBBBCCCCDDDD&issuer=MyFinanzas")).not.toBe(
    qrSvg(QR_URI),
  );
});
