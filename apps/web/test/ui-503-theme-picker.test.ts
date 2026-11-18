import { readFileSync } from "node:fs";
import { test, expect } from "bun:test";

/**
 * #503 — contrato CSS del selector de tema: altura visual y objetivo táctil.
 *
 * El cromo visible (borde y fondo) lo dibuja el marco `.theme-picker`, de 38 px
 * en escritorio con puntero fino, mientras el `select` real conserva 44 px de
 * superficie interactiva (`--touch-min`). En móvil, con cualquier puntero
 * grueso o sin puntero fino, el marco vuelve a 44 px. El ancho no se toca (lo
 * fija el catálogo).
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

/** Altura de marco declarada dentro del bloque indicado. */
function frameHeightIn(block: string): number {
  const match = block.match(/--theme-picker-frame:\s*(\d+)px/);
  expect(match?.[1], "falta --theme-picker-frame en px").toBeDefined();
  return Number(match![1]);
}

test("#503 el marco dibuja el cromo y el select conserva 44 px de objetivo", () => {
  const frame = ruleBody(".theme-picker");
  // Altura visible por defecto táctil, con el cromo en el marco.
  expect(frame).toContain("--theme-picker-frame: var(--touch-min)");
  expect(frame).toContain("height: var(--theme-picker-frame)");
  expect(frame).toContain("border: 1px solid var(--control-border)");
  expect(frame).toContain("background: var(--surface)");

  const select = ruleBody("label.theme-picker select");
  // Objetivo AA intacto y sin cromo propio.
  expect(select).toContain("min-height: var(--touch-min)");
  expect(select).toContain("width: auto");
  expect(select).toContain("border: 0");
  expect(select).toContain("background: transparent");
  expect(select).not.toMatch(/width:\s*9rem/);
});

test("#503 la altura visual compacta solo cambia el marco con puntero fino", () => {
  const block = mediaBlock(COMPACT_MEDIA);
  // Dentro del objetivo acordado (36–38 px).
  const height = frameHeightIn(block);
  expect(height).toBeGreaterThanOrEqual(36);
  expect(height).toBeLessThanOrEqual(38);
  // Solo el token del marco: ni ancho, ni objetivo del select, ni tipografía.
  expect(block).toContain(".theme-picker {");
  expect(block).not.toContain("select {");
  expect(block).not.toMatch(/(^|[^-])width:/);
  expect(block).not.toContain("min-height");
  expect(block).not.toContain("font-size");
});

test("#503 un puntero grueso disponible restaura el marco de 44 px", () => {
  // Un híbrido (portátil con pantalla táctil) declara `pointer: fine` por su
  // ratón pero `any-pointer: coarse` por el tacto: el marco vuelve a 44 px.
  const block = mediaBlock(TOUCH_MEDIA);
  expect(block).toContain("--theme-picker-frame: var(--touch-min)");
  expect(block).not.toContain("select {");
  expect(block).not.toMatch(/(^|[^-])width:/);
  expect(block).not.toContain("font-size");
  // Debe ir después del bloque compacto para ganar el empate de cascada.
  expect(styleCss.indexOf(TOUCH_MEDIA)).toBeGreaterThan(
    styleCss.indexOf(COMPACT_MEDIA),
  );
});

test("#503 el cromo de cada tema vive en el marco, no en el select", () => {
  for (const themeCss of ["graphite.css", "aurora.css", "casa.css"]) {
    const css = readFileSync(
      new URL(`../src/${themeCss}`, import.meta.url),
      "utf8",
    );
    // Sin medidas fijas de ancho en el selector.
    expect(css).not.toMatch(/\.theme-picker select \{[^}]*width:/);
    // Nada que repinte la caja de 44 px del select: fondo ni radio.
    expect(css).not.toMatch(/\.theme-picker select \{[^}]*background:/);
    expect(css).not.toMatch(/\.theme-picker select \{[^}]*border-radius:/);
  }
});