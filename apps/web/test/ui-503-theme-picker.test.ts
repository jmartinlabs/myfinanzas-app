import { readFileSync } from "node:fs";
import { test, expect } from "bun:test";

/**
 * #503 — contrato CSS de la altura del selector de tema.
 *
 * El control se compacta solo en escritorio con puntero fino; el objetivo
 * táctil de 44 px (`--touch-min`) sigue siendo la base para móvil y cualquier
 * entrada táctil. El ancho no se toca (lo fija el catálogo) y la reducción de
 * altura no recorta padding, tipografía ni foco.
 */
const styleCss = readFileSync(
  new URL("../src/style.css", import.meta.url),
  "utf8",
);

const COMPACT_MEDIA = "@media (min-width: 761px) and (pointer: fine)";
const TOUCH_MEDIA = "@media (min-width: 761px) and (any-pointer: coarse)";

function ruleBody(selector: string, from = 0): string {
  const start = styleCss.indexOf(`${selector} {`, from);
  expect(start, `falta la regla ${selector}`).toBeGreaterThanOrEqual(0);
  const bodyStart = styleCss.indexOf("{", start) + 1;
  const bodyEnd = styleCss.indexOf("}", bodyStart);
  return styleCss.slice(bodyStart, bodyEnd);
}

function mediaBlock(media: string): string {
  const start = styleCss.indexOf(media);
  expect(start, `falta el media query ${media}`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let index = styleCss.indexOf("{", start); index < styleCss.length; index += 1) {
    if (styleCss[index] === "{") depth += 1;
    if (styleCss[index] === "}") depth -= 1;
    if (depth === 0) return styleCss.slice(start, index + 1);
  }
  throw new Error(`media query sin cierre: ${media}`);
}

test("#503 la base del selector conserva el objetivo táctil y el ancho del catálogo", () => {
  const base = ruleBody(".theme-picker select");
  expect(base).toContain("min-height: var(--touch-min)");
  expect(base).toContain("width: auto");
  expect(base).not.toMatch(/width:\s*9rem/);
});

test("#503 la altura compacta solo aplica con puntero fino en escritorio", () => {
  const block = mediaBlock(COMPACT_MEDIA);
  const compact = ruleBody(".theme-picker select", styleCss.indexOf(block));
  // Altura dentro del objetivo acordado (36–38 px).
  const height = Number(compact.match(/min-height:\s*(\d+)px/)?.[1]);
  expect(height).toBeGreaterThanOrEqual(36);
  expect(height).toBeLessThanOrEqual(38);
  // Solo altura: no se altera ancho, padding ni tipografía.
  expect(compact).not.toMatch(/(^|[^-])width:/);
  expect(compact).not.toMatch(/(^|[^-])height:/);
  expect(compact).not.toContain("padding");
  expect(compact).not.toContain("font-size");
});

test("#503 el selector no tiene medidas fijas de ancho en ningún tema", () => {
  for (const themeCss of ["graphite.css", "aurora.css", "casa.css"]) {
    const css = readFileSync(
      new URL(`../src/${themeCss}`, import.meta.url),
      "utf8",
    );
    expect(css).not.toMatch(/\.theme-picker select \{[^}]*width:/);
  }
});

test("#503 un puntero grueso disponible restaura el objetivo táctil en escritorio", () => {
  // Un híbrido (portátil con pantalla táctil) declara `pointer: fine` por su
  // ratón pero `any-pointer: coarse` por el tacto: debe conservar 44 px.
  const block = mediaBlock(TOUCH_MEDIA);
  const touch = ruleBody(".theme-picker select", styleCss.indexOf(block));
  expect(touch).toContain("min-height: var(--touch-min)");
  // Solo altura: ni ancho, ni padding, ni tipografía.
  expect(touch).not.toMatch(/(^|[^-])width:/);
  expect(touch).not.toMatch(/(^|[^-])height:/);
  expect(touch).not.toContain("padding");
  expect(touch).not.toContain("font-size");
  // Debe ir después del bloque compacto para ganar el empate de cascada.
  expect(styleCss.indexOf(TOUCH_MEDIA)).toBeGreaterThan(
    styleCss.indexOf(COMPACT_MEDIA),
  );
});
