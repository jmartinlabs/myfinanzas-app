import { readFileSync } from "node:fs";
import { test, expect, describe } from "bun:test";

/**
 * UI DEV-07 · guarda estática de tokens (sin navegador).
 *
 * Comprueba que la corrección del foco del sidebar sigue usando
 * `--sidebar-focus`, que la escala funcional y el objetivo táctil conservan
 * sus valores, y que los pares AA de los que dependen las cinco pantallas no
 * se rompen al editar la paleta. No mide el DOM: eso lo hace la matriz
 * Playwright. Solo evalúa pares opacos y conocidos para no producir falsos
 * positivos con separadores decorativos (`--border`) ni con alfa compuesto
 * fuera de muestra.
 */

const THEMES = ["light-s", "dark-s", "hybrid-s"] as const;
type Theme = (typeof THEMES)[number];

const styleCss = readFileSync(
  new URL("../src/style.css", import.meta.url),
  "utf8",
);
const themesCss = readFileSync(
  new URL("../public/themes.css", import.meta.url),
  "utf8",
);
/** Solo la sección aditiva de DEV-07: evita que una regla histórica homónima
 * haga pasar la comprobación de uso por accidente. */
const dev07Css = styleCss.slice(
  styleCss.indexOf("/* UI · DEV-07 — temas y AA"),
);

type Color = { r: number; g: number; b: number; a: number };

function parseColor(value: string): Color | null {
  const trimmed = value.trim();
  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((part) => part + part)
            .join("")
        : hex[1];
    return {
      r: Number.parseInt(raw.slice(0, 2), 16),
      g: Number.parseInt(raw.slice(2, 4), 16),
      b: Number.parseInt(raw.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb) return null;
  const parts = rgb[1]
    .split(/[,\s/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts.length > 3 ? parts[3] : 1,
  };
}

function over(top: Color, bottom: Color): Color {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
    g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
    b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
    a,
  };
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(color: Color): number {
  return (
    0.2126 * channel(color.r) +
    0.7152 * channel(color.g) +
    0.0722 * channel(color.b)
  );
}

function contrast(top: Color, bottom: Color): number {
  const fg = top.a < 1 ? over(top, bottom) : top;
  const l1 = luminance(fg);
  const l2 = luminance(bottom);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Tokens visibles de un tema, aplicando primero `:root` y luego su bloque. */
function tokensFor(theme: Theme): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const rule of themesCss.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selector = rule[1].replace(/\s+/g, " ").trim();
    const applies =
      /(?:^|,)\s*:root\s*(?:,|$)/.test(selector) ||
      selector.includes(`:root[data-theme="${theme}"]`);
    if (!applies) continue;
    for (const declaration of rule[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      tokens.set(`--${declaration[1]}`, declaration[2].trim());
    }
  }
  return tokens;
}

function tokenColor(tokens: Map<string, string>, name: string): Color {
  const raw = tokens.get(name);
  expect(raw, `token ${name} ausente`).toBeDefined();
  const color = parseColor(raw!);
  expect(color, `token ${name} no es un color: ${raw}`).not.toBeNull();
  return color!;
}

function tokenRatio(
  tokens: Map<string, string>,
  foreground: string,
  background: string,
): number {
  return contrast(
    tokenColor(tokens, foreground),
    tokenColor(tokens, background),
  );
}

describe("UI DEV-07 · tokens de accesibilidad", () => {
  test("el foco del sidebar usa --sidebar-focus y cumple 3:1", () => {
    expect(dev07Css.length).toBeGreaterThan(0);
    expect(dev07Css).toMatch(
      /\.sidebar\s+:focus-visible\s*\{[^}]*outline-color:\s*var\(--sidebar-focus\)/,
    );
    for (const theme of THEMES) {
      const tokens = tokensFor(theme);
      expect(tokens.get("--sidebar-focus"), theme).toBeDefined();
      expect(
        tokenRatio(tokens, "--sidebar-focus", "--sidebar"),
        `${theme}: --sidebar-focus sobre --sidebar`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  test("--text-xs y --touch-min conservan sus valores y su uso", () => {
    expect(styleCss).toMatch(/--text-xs:\s*12px\s*;/);
    expect(styleCss).toMatch(/--touch-min:\s*44px\s*;/);
    expect(dev07Css).toMatch(
      /\.cierre-badge\s*\{[^}]*font-size:\s*var\(--text-xs\)/,
    );
    expect(dev07Css).toMatch(
      /\.brand\s*\{[^}]*min-height:\s*var\(--touch-min\)/,
    );
    expect(dev07Css).toMatch(
      /textarea\s*\{[^}]*border-color:\s*var\(--control-border\)/,
    );
  });

  for (const theme of THEMES) {
    test(`pares AA de tokens en ${theme}`, () => {
      const tokens = tokensFor(theme);
      const checks: [string, string, number][] = [
        // Texto normal.
        ["--text", "--bg", 4.5],
        ["--text", "--surface", 4.5],
        ["--muted", "--surface", 4.5],
        ["--muted", "--surface-2", 4.5],
        ["--sidebar-text", "--sidebar", 4.5],
        ["--sidebar-muted", "--sidebar", 4.5],
        // Bordes de campo y anillo de foco sobre superficie.
        ["--control-border", "--surface", 3],
        ["--control-border", "--bg", 3],
        ["--focus", "--surface", 3],
        ["--focus", "--bg", 3],
        // Iconos y estados (texto del badge y glifo sobre su fondo suave).
        ["--positive", "--positive-soft", 4.5],
        ["--warning", "--warning-soft", 4.5],
        ["--accent", "--accent-soft", 4.5],
        ["--muted", "--surface-2", 4.5],
        ["--negative", "--surface", 4.5],
        ["--error", "--surface", 4.5],
      ];
      const failures = checks
        .map(([fg, bg, required]) => ({
          fg,
          bg,
          required,
          ratio: tokenRatio(tokens, fg, bg),
        }))
        .filter((entry) => entry.ratio < entry.required)
        .map(
          (entry) =>
            `${theme}: ${entry.fg} sobre ${entry.bg} = ${entry.ratio.toFixed(2)} < ${entry.required}`,
        );
      expect(failures).toEqual([]);
    });
  }
});
