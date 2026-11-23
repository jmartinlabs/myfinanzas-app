import { readFileSync } from "node:fs";
import { test, expect } from "bun:test";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const movimientos = read("../src/Movimientos.tsx");
const styleCss = read("../src/style.css");
const lightHybrid = read("../src/light-hybrid.css");
const graphite = read("../src/graphite.css");
const casa = read("../src/casa.css");
const aurora = read("../src/aurora.css");

/** Los cinco Tipos del contrato (API + CHECK de la tabla `movimientos`). */
const TIPOS = [
  "Ingreso",
  "Gasto",
  "Transferencia",
  "Amortización deuda",
  "Devolución de gasto",
] as const;

/** Bloque del mapa de glifos en el componente compartido. */
const mapa = movimientos.slice(
  movimientos.indexOf("const movementTypeGlyphs"),
  movimientos.indexOf("/** Glifo decorativo del Tipo"),
);

test("#448 el mapa declara un glifo propio para cada Tipo del contrato", () => {
  expect(mapa).not.toBe("");
  for (const tipo of TIPOS) expect(mapa).toContain(`"${tipo}": [`);
  // Cinco entradas: ni tipos nuevos ni tipos sin glifo.
  expect(mapa.match(/^\s{2}"[^"]+": \[/gm)?.length).toBe(TIPOS.length);
  for (const linea of mapa
    .split("\n")
    .filter((line: string) => line.includes(": [")))
    expect(linea, linea).toMatch(/:\s\[.*"[^"]*M[^"]*".*\]/);
});

test("#448 ningún Tipo comparte trazo con otro", () => {
  const trazos = TIPOS.map((tipo) => {
    const desde = mapa.indexOf(`"${tipo}": [`);
    return mapa.slice(desde, mapa.indexOf("]", desde));
  });
  expect(trazos.every((trazo) => trazo !== "")).toBe(true);
  expect(new Set(trazos).size).toBe(TIPOS.length);
});

test("#448 el SVG es decorativo: sin título, sin aria-label y aria-hidden", () => {
  const componente = movimientos.slice(
    movimientos.indexOf("function MovementTypeGlyph"),
    movimientos.indexOf("const amount ="),
  );
  expect(componente).toContain('<svg viewBox="0 0 24 24" aria-hidden="true"');
  expect(componente).not.toContain("<title");
  expect(componente).not.toContain("aria-label");
  expect(componente).not.toContain("role=");
  // El glifo vive dentro del nodo existente, compartido por tabla y tarjetas.
  expect(movimientos).toContain(
    '<span className="movement-type-icon" aria-hidden="true">',
  );
  expect(movimientos).toContain("<MovementTypeGlyph tipo={m.tipo} />");
});

test("#448 la geometría del chip se declara una sola vez, en style.css", () => {
  expect(styleCss).toMatch(/\.movement-type-icon \{[\s\S]*?width: 24px;/);
  expect(styleCss).toMatch(/\.movement-type-icon \{[\s\S]*?height: 24px;/);
  expect(styleCss).toMatch(/\.movement-type-icon svg \{[\s\S]*?width: 16px;/);
  expect(styleCss).toMatch(/\.movement-type-icon svg \{[\s\S]*?height: 16px;/);
  expect(styleCss).toMatch(/\.movement-type \{[\s\S]*?gap: 8px;/);
  // El SVG hereda el color: ninguna capa de tema fija un relleno propio.
  expect(styleCss).toMatch(/\.movement-type-icon svg \{[\s\S]*?stroke: currentColor;/);

  for (const [nombre, css] of [
    ["light-hybrid.css", lightHybrid],
    ["graphite.css", graphite],
    ["casa.css", casa],
    ["aurora.css", aurora],
  ] as const) {
    expect(css, nombre).not.toMatch(/\.movement-type-icon \{[^}]*width:/);
    expect(css, nombre).not.toMatch(/\.movement-type-icon \{[^}]*height:/);
    expect(css, nombre).not.toMatch(/\.movement-type \{[^}]*gap:/);
    // Ninguna capa vuelve a dibujar el glifo con `content`.
    expect(css, nombre).not.toMatch(/\.movement-type-icon::before/);
    expect(css, nombre).not.toMatch(/content:\s*"[•↓↗⇄▤↺\\]/);
  }
});

test("#448 las seis apariencias colorean el chip sin ocultarlo por ancho", () => {
  for (const tipo of TIPOS) {
    const selector = `.movement-type[data-tipo="${tipo}"] .movement-type-icon`;
    expect(lightHybrid, `light/hybrid ${tipo}`).toContain(selector);
    expect(graphite, `graphite ${tipo}`).toContain(selector);
    expect(aurora, `aurora ${tipo}`).toContain(selector);
  }
  for (const tipo of TIPOS.filter((tipo) => tipo !== "Transferencia"))
    expect(casa, `casa ${tipo}`).toContain(
      `.movement-type[data-tipo="${tipo}"] .movement-type-icon`,
    );
  // Oscuro no tiene capa propia: sus reglas viven en `style.css` con sus tokens.
  for (const tipo of TIPOS)
    expect(styleCss, `dark-s ${tipo}`).toContain(
      `:root[data-theme="dark-s"] .movement-type[data-tipo="${tipo}"] .movement-type-icon`,
    );
  // Casa deja Transferencia en el chip neutro de la base (--muted actual).
  expect(casa).not.toContain('.movement-type[data-tipo="Transferencia"]');
});

test("#448 Oscuro y Aurora estrenan el chip con tokens, sin valores nuevos", () => {
  const oscuro = styleCss.slice(styleCss.indexOf(':root[data-theme="dark-s"] .movement-type'));
  expect(oscuro).toContain("color: var(--positive);");
  expect(oscuro).toContain("color: var(--negative);");
  expect(oscuro).toContain("color: var(--accent);");
  expect(oscuro.slice(0, oscuro.indexOf("\n\n"))).not.toMatch(/#[0-9a-fA-F]{3,8}/);

  const auroraChip = aurora.slice(aurora.indexOf("html[data-theme=\"aurora\"] .movement-type"));
  expect(auroraChip).toContain("color: var(--positive);");
  expect(auroraChip).toContain("color: var(--negative);");
  expect(auroraChip).toContain("color: var(--accent);");
  expect(auroraChip).not.toMatch(/#[0-9a-fA-F]{3,8}/);
});

test("#448 no queda ocultación general del chip a ≤1000 px", () => {
  for (const [nombre, css] of [
    ["light-hybrid.css", lightHybrid],
    ["graphite.css", graphite],
    ["casa.css", casa],
    ["aurora.css", aurora],
    ["style.css", styleCss],
  ] as const)
    expect(css, nombre).not.toMatch(
      /movement-type-icon[^}]*display:\s*none/,
    );
});

test("#448 cada Tipo conserva su juego exacto de trazos", () => {
  // El conjunto se congela: quitar o añadir un trazo a un glifo rompe la prueba
  // (una sola `path` de menos no la detectaba la comprobación de presencia).
  const esperado: Record<string, string[]> = {
    "Ingreso": ["M12 5v9", "M8 10l4 4 4-4", "M5 19h14"],
    "Gasto": ["M12 19V10", "M8 14l4-4 4 4", "M5 5h14"],
    "Transferencia": ["M4 9h13", "M14 6l3 3-3 3", "M20 15H7", "M10 12l-3 3 3 3"],
    "Amortización deuda": ["M6 19V5", "M12 19V10", "M18 19V14"],
    "Devolución de gasto": [
      "M5 8h8a5.5 5.5 0 0 1 0 11H9",
      "M9 4 5 8l4 4",
    ],
  };
  for (const tipo of TIPOS) {
    const desde = mapa.indexOf(`"${tipo}": [`);
    expect(desde, tipo).toBeGreaterThanOrEqual(0);
    const bloque = mapa.slice(desde, mapa.indexOf("]", desde));
    const trazos = [...bloque.matchAll(/"([^"]+)"/g)]
      .slice(1)
      .map((match) => match[1]);
    expect(trazos, tipo).toEqual(esperado[tipo]);
  }
});