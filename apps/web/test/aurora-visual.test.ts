import { readFileSync } from "node:fs";
import { test, expect } from "bun:test";

const styleCss = readFileSync(
  new URL("../src/style.css", import.meta.url),
  "utf8",
);
const auroraCss = readFileSync(
  new URL("../src/aurora.css", import.meta.url),
  "utf8",
);

/** Propiedades de maquetación: una capa de identidad no las necesita y, si
 * aparece alguna, la composición compartida deja de ser única. */
const LAYOUT = [
  "display",
  "grid-template",
  "grid-column",
  "grid-row",
  "grid-area",
  "grid-auto",
  "flex",
  "flex-direction",
  "flex-wrap",
  "row-gap",
  "column-gap",
  "gap",
  "order",
  "position",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  "width",
  "height",
  "min-width",
  "max-width",
  "min-height",
  "max-height",
  "padding",
  "padding-block",
  "padding-inline",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-block",
  "margin-inline",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "overflow",
  "overflow-x",
  "overflow-y",
  "place-items",
  "justify-items",
  "justify-content",
  "align-items",
  "align-content",
  "align-self",
  "justify-self",
  "z-index",
];

/** Devuelve las reglas del archivo como pares (selector, cuerpo). */
function rules(css: string) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: { selector: string; body: string }[] = [];
  const stack: string[] = [];
  let buffer = "";
  for (const char of withoutComments) {
    if (char === "{") {
      stack.push(buffer.trim());
      buffer = "";
    } else if (char === "}") {
      const selector = stack.pop() ?? "";
      if (stack.length > 0) {
        // Regla anidada en una at-rule (@media): se evalúa igual.
        if (selector && !selector.startsWith("@")) {
          found.push({ selector, body: buffer });
        }
      } else if (selector && !selector.startsWith("@")) {
        found.push({ selector, body: buffer });
      }
      buffer = "";
    } else {
      buffer += char;
    }
  }
  return found;
}

test("Aurora se importa desde el CSS base", () => {
  expect(styleCss).toContain('@import "./aurora.css";');
  expect(styleCss.indexOf('@import "./aurora.css"')).toBeLessThan(
    styleCss.indexOf(":root {"),
  );
});

test("la capa Aurora está aislada y no contiene reglas de otros temas", () => {
  expect(auroraCss).toContain('html[data-theme="aurora"]');
  expect(auroraCss).not.toMatch(
    /html\[data-theme="(dark-s|light-s|hybrid-s|graphite-lime|casa)"\]/,
  );
  expect(auroraCss).not.toContain("!important");
});

test("todos los selectores de la capa están scoped al tema", () => {
  const all = rules(auroraCss);
  expect(all.length).toBeGreaterThan(0);
  for (const rule of all) {
    expect(rule.selector, rule.selector).toContain(
      'html[data-theme="aurora"]',
    );
  }
});

test("la capa no define layout: la composición sigue siendo compartida", () => {
  const offenders: string[] = [];
  for (const rule of rules(auroraCss)) {
    for (const line of rule.body.split(";")) {
      const [property] = line.split(":");
      const name = (property ?? "").trim();
      if (!name || name.startsWith("--")) continue;
      if (LAYOUT.includes(name)) offenders.push(`${rule.selector} → ${name}`);
    }
  }
  expect(offenders).toEqual([]);
});

test("Aurora cubre shell, superficies, controles, tablas y estados", () => {
  for (const selector of [
    ".sidebar",
    ".global-header",
    ".panel",
    ".primary",
    ".secondary",
    "input",
    "select",
    "textarea",
    ":focus-visible",
    ".ui-table th",
    ".ui-table td",
    ".ui-data-list-item",
    ".ui-badge",
    ".inicio-page .graphite-control",
    ".inicio-page .graphite-kpis",
    ".movements-list",
    ".movement-detail",
  ]) {
    expect(auroraCss).toContain(selector);
  }
});

test("Aurora declara tokens de capa con prefijo propio, no del sistema", () => {
  const layer = auroraCss.match(
    /html\[data-theme="aurora"\]\s*\{([\s\S]*?)\n\}/,
  );
  if (!layer) throw new Error("No se encontró el bloque de tokens de capa");
  const names = [...layer[1].matchAll(/(--[a-z0-9-]+):/g)].map(
    ([, name]) => name,
  );
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) expect(name.startsWith("--aurora-")).toBe(true);
});

test("sin animación propia: Aurora no declara @keyframes ni animation", () => {
  expect(auroraCss).not.toContain("@keyframes");
  expect(auroraCss).not.toMatch(/(^|[^-\w])animation(-name)?\s*:/);
});

test("el peor caso de la luz ambiental mantiene AA en texto secundario", () => {
  const themesCss = readFileSync(
    new URL("../public/themes.css", import.meta.url),
    "utf8",
  );
  const block = themesCss.match(
    /:root\[data-theme="aurora"\]\s*\{([\s\S]*?)\n\}/,
  );
  if (!block) throw new Error("No se encontró el bloque aurora");
  const token = (name: string) => {
    const found = block[1].match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"));
    if (!found) throw new Error(`Falta ${name}`);
    return found[1];
  };

  // Composición declarada por la capa: fondo (dos radiales) y ambiente del
  // workspace. Si alguien sube las opacidades, esta guarda falla.
  const layer = auroraCss.match(
    /html\[data-theme="aurora"\]\s*\{([\s\S]*?)\n\}/,
  );
  if (!layer) throw new Error("No se encontró la capa de tokens");
  const tokenValue = (name: string) => {
    const found = layer[1].match(new RegExp(`${name}:[\\s\\S]*?;`, "m"));
    if (!found) throw new Error(`Falta ${name}`);
    return found[0];
  };
  const alphaOf = (declaration: string, color: string) => {
    const found = declaration.match(
      new RegExp(`rgb\\(${color} / (0\\.\\d+)\\)`, "g"),
    );
    if (!found) throw new Error(`Sin ${color} en ${declaration.slice(0, 40)}`);
    return Math.max(
      ...found.map((entry) => Number(entry.match(/(0\.\d+)/)![1])),
    );
  };
  const background = tokenValue("--aurora-bg-image");
  const ambient = alphaOf(tokenValue("--aurora-ambient"), "30 111 122");
  const backgroundTeal = alphaOf(background, "43 228 222");
  const backgroundDeep = alphaOf(background, "30 111 122");

  const parse = (value: string) => {
    const n = parseInt(value.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const over = (
    top: { r: number; g: number; b: number },
    alpha: number,
    base: { r: number; g: number; b: number },
  ) => ({
    r: top.r * alpha + base.r * (1 - alpha),
    g: top.g * alpha + base.g * (1 - alpha),
    b: top.b * alpha + base.b * (1 - alpha),
  });
  const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const channels = [r, g, b].map((channel) => {
      const value = channel / 255;
      return value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const ratio = (
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number },
  ) => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  const withBackground = over(
    parse("#2be4de"),
    backgroundTeal,
    over(parse("#1e6f7a"), backgroundDeep, parse(token("--bg"))),
  );
  const worst = over(parse("#1e6f7a"), ambient, withBackground);

  expect(ratio(parse(token("--text")), worst)).toBeGreaterThanOrEqual(4.5);
  expect(ratio(parse(token("--muted")), worst)).toBeGreaterThanOrEqual(4.5);
  expect(ratio(parse(token("--accent")), worst)).toBeGreaterThanOrEqual(4.5);
});
