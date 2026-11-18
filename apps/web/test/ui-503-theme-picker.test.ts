import { readFileSync } from "node:fs";
import { test, expect } from "bun:test";

/**
 * #503 — contrato CSS del selector de tema.
 *
 * El `select` dibuja su propio cromo y conserva el ancho del catálogo. Su
 * altura baja a 38 px SOLO en escritorio con ratón: `(min-width: 761px) and
 * (pointer: fine) and (not (any-pointer: coarse))`. En móvil, entrada táctil y
 * equipos híbridos mantiene `--touch-min` (44 px). La excepción de tamaño está
 * declarada en `specs/guidelines/ui.md` y acotada en la auditoría DEV-07.
 */
const styleCss = readFileSync(
  new URL("../src/style.css", import.meta.url),
  "utf8",
);

const COMPACT_MEDIA =
  "@media (min-width: 761px) and (pointer: fine) and (not (any-pointer: coarse))";

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
  // El cromo propio vuelve al select; sin medidas fijas de ancho.
  expect(base).not.toContain("background: transparent");
  expect(base).not.toMatch(/width:\s*9rem/);
});

test("#503 la altura compacta exige puntero fino y ningún puntero grueso", () => {
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

test("#503 la única reducción de altura es la regla acotada del selector", () => {
  // Una sola declaración de 38 px en todo el CSS y una sola media query que
  // toque al selector: la compacta, que excluye cualquier puntero grueso.
  const reductions = styleCss.match(/min-height:\s*38px/g) ?? [];
  expect(reductions).toHaveLength(1);
  const pickerMediaRules =
    styleCss.match(/@media[^{]*\{\s*\.theme-picker select \{/g) ?? [];
  expect(pickerMediaRules).toHaveLength(1);
  expect(pickerMediaRules[0]).toContain("pointer: fine");
  expect(pickerMediaRules[0]).toContain("not (any-pointer: coarse)");
});

test("#503 el cromo de cada tema sigue en el select y sin anchos fijos", () => {
  for (const themeCss of ["graphite.css", "aurora.css", "casa.css"]) {
    const css = readFileSync(
      new URL(`../src/${themeCss}`, import.meta.url),
      "utf8",
    );
    expect(css).toContain(".theme-picker select");
    expect(css).not.toMatch(/\.theme-picker select \{[^}]*width:/);
    // Sin el enfoque de marco revertido: nada de tokens de marco.
    expect(css).not.toContain("--theme-picker-frame");
  }
});