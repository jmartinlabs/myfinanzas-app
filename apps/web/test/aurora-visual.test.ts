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
