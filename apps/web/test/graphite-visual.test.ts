import { readFileSync } from "node:fs";
import { test, expect } from "bun:test";

const styleCss = readFileSync(
  new URL("../src/style.css", import.meta.url),
  "utf8",
);
const graphiteCss = readFileSync(
  new URL("../src/graphite.css", import.meta.url),
  "utf8",
);

test("G1 importa la capa visual Graphite desde el CSS base", () => {
  expect(styleCss).toContain('@import "./graphite.css";');
});

test("la capa Graphite está aislada y no contiene reglas de otros temas", () => {
  expect(graphiteCss).toContain('html[data-theme="graphite-lime"]');
  expect(graphiteCss).not.toMatch(
    /html\[data-theme="(dark-s|light-s|hybrid-s|casa)"\]/,
  );
  expect(graphiteCss).not.toContain("!important");
});

test("G1 cubre shell, superficies, controles, tablas y tarjetas", () => {
  for (const selector of [
    ".sidebar",
    ".global-header",
    ".panel",
    ".primary",
    ".secondary",
    "input:focus-visible",
    ".ui-table th",
    ".ui-data-list-item",
    ".ui-badge",
  ]) {
    expect(graphiteCss).toContain(selector);
  }
});

test("todos los selectores de la capa Graphite están scoped al tema", () => {
  const selectors = graphiteCss
    .split("\n")
    .filter(
      (line) =>
        line.includes("{") &&
        !line.trim().startsWith("@") &&
        !line.trim().startsWith("/*"),
    );
  expect(selectors.length).toBeGreaterThan(0);
  for (const line of selectors) {
    expect(line).toContain('html[data-theme="graphite-lime"]');
  }
});
