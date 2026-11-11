import { readFileSync } from "node:fs";
import { test, expect } from "bun:test";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isThemeId,
  themeCatalog,
} from "../src/themes";

const themeCss = readFileSync(
  new URL("../public/themes.css", import.meta.url),
  "utf8",
);
const bootJs = readFileSync(
  new URL("../public/theme-boot.js", import.meta.url),
  "utf8",
);

test("el catálogo conserva las cuatro apariencias y añade Casa al final", () => {
  expect(themeCatalog.map((theme) => theme.id)).toEqual([
    "light-s",
    "dark-s",
    "hybrid-s",
    "graphite-lime",
    "casa",
  ]);
  expect(themeCatalog.at(-2)).toEqual({
    id: "graphite-lime",
    label: "Graphite Lime",
    colorScheme: "dark",
  });
  expect(themeCatalog.at(-1)).toEqual({
    id: "casa",
    label: "Casa",
    colorScheme: "light",
  });
  expect(new Set(themeCatalog.map((theme) => theme.id)).size).toBe(
    themeCatalog.length,
  );
});

test("isThemeId reconoce Graphite Lime y Casa y rechaza valores desconocidos", () => {
  expect(isThemeId("graphite-lime")).toBe(true);
  expect(isThemeId("casa")).toBe(true);
  for (const id of ["light-s", "dark-s", "hybrid-s"]) {
    expect(isThemeId(id)).toBe(true);
  }
  expect(isThemeId("color-finance")).toBe(false);
  expect(isThemeId("pastel-editorial")).toBe(false);
  expect(isThemeId("senal")).toBe(false);
  expect(isThemeId(null)).toBe(false);
  expect(isThemeId("")).toBe(false);
});

test("el tema inicial y la clave de persistencia no cambian", () => {
  expect(DEFAULT_THEME).toBe("dark-s");
  expect(THEME_STORAGE_KEY).toBe("mf-theme");
});

test("Graphite declara los mismos tokens que los tres temas y está en el boot", () => {
  const block = (name: string) => {
    const match = themeCss.match(
      new RegExp(`:root\\[data-theme=\"${name}\"\\]\\s*\\{([\\s\\S]*?)\\n\\}`),
    );
    if (!match) throw new Error(`No se encontró el bloque ${name}`);
    return new Set(match[1].match(/--[a-z0-9-]+/g) ?? []);
  };
  const graphite = block("graphite-lime");
  for (const theme of ["dark-s", "light-s", "hybrid-s"]) {
    expect([...graphite].sort(), theme).toEqual([...block(theme)].sort());
  }
  expect(graphite.size).toBe(66);
  expect(bootJs).toContain('"graphite-lime"');
});

test("Casa declara los mismos 66 tokens y está en el boot", () => {
  const block = (name: string) => {
    const match = themeCss.match(
      new RegExp(`:root\\[data-theme=\"${name}\"\\]\\s*\\{([\\s\\S]*?)\\n\\}`),
    );
    if (!match) throw new Error(`No se encontró el bloque ${name}`);
    return new Set(match[1].match(/--[a-z0-9-]+/g) ?? []);
  };
  const casa = block("casa");
  for (const theme of ["dark-s", "light-s", "hybrid-s", "graphite-lime"]) {
    expect([...casa].sort(), theme).toEqual([...block(theme)].sort());
  }
  expect(casa.size).toBe(66);
  expect(bootJs).toContain('"casa"');
});

test("Graphite cumple los pares AA críticos, incluido el borde de campo", () => {
  const css = themeCss;
  const tokensFor = (name: string) => {
    const match = css.match(
      new RegExp(`:root\\[data-theme=\"${name}\"\\]\\s*\\{([\\s\\S]*?)\\n\\}`),
    );
    if (!match) throw new Error(`No se encontró el bloque ${name}`);
    return Object.fromEntries(
      [...match[1].matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map(
        ([, token, value]) => [token, value],
      ),
    );
  };
  const tokens = tokensFor("graphite-lime");
  const parse = (value: string) => {
    const n = parseInt(value.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const channels = [r, g, b].map((channel) => {
      const value = channel / 255;
      return value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const ratio = (foreground: string, background: string) => {
    const a = luminance(parse(foreground));
    const b = luminance(parse(background));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const pairs: ReadonlyArray<[string, string, number]> = [
    ["--text", "--surface", 4.5],
    ["--text", "--bg", 4.5],
    ["--muted", "--surface", 4.5],
    ["--sidebar-text", "--sidebar", 4.5],
    ["--sidebar-active-text", "--sidebar-active-bg", 4.5],
    ["--on-action", "--action", 4.5],
    ["--positive", "--surface", 4.5],
    ["--negative", "--surface", 4.5],
    ["--warning", "--surface", 4.5],
    ["--error", "--surface", 4.5],
    ["--control-border", "--surface", 3],
    ["--control-border", "--bg", 3],
    ["--control-border", "--input-bg", 3],
    ["--focus", "--surface", 3],
    ["--focus", "--bg", 3],
    ["--sidebar-focus", "--sidebar", 3],
  ];
  for (const [foreground, background, minimum] of pairs) {
    expect(tokens[foreground], foreground).toBeDefined();
    expect(tokens[background], background).toBeDefined();
    expect(
      ratio(tokens[foreground], tokens[background]),
      `${foreground}/${background}`,
    ).toBeGreaterThanOrEqual(minimum);
  }
  expect(tokens["--positive"]).not.toBe(tokens["--accent"]);
  expect(tokens["--ok"]).not.toBe(tokens["--accent"]);
  expect(tokens["--accent"]).toBe(tokens["--action"]);
});

test("Casa cumple los pares AA críticos", () => {
  const match = themeCss.match(
    /:root\[data-theme="casa"\]\s*\{([\s\S]*?)\n\}/,
  );
  if (!match) throw new Error("No se encontró el bloque casa");
  const tokens = Object.fromEntries(
    [...match[1].matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map(
      ([, token, value]) => [token, value],
    ),
  ) as Record<string, string>;
  const parse = (value: string) => {
    const n = parseInt(value.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const channels = [r, g, b].map((channel) => {
      const value = channel / 255;
      return value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const ratio = (foreground: string, background: string) => {
    const a = luminance(parse(foreground));
    const b = luminance(parse(background));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const pairs: ReadonlyArray<[string, string, number]> = [
    ["--text", "--surface", 4.5],
    ["--text", "--bg", 4.5],
    ["--muted", "--surface", 4.5],
    ["--muted", "--surface-2", 4.5],
    ["--sidebar-text", "--sidebar", 4.5],
    ["--sidebar-muted", "--sidebar", 4.5],
    ["--sidebar-active-text", "--sidebar-active-bg", 4.5],
    ["--on-action", "--action", 4.5],
    ["--on-accent", "--accent", 4.5],
    ["--positive", "--positive-soft", 4.5],
    ["--warning", "--warning-soft", 4.5],
    ["--accent", "--accent-soft", 4.5],
    ["--negative", "--surface", 4.5],
    ["--error", "--surface", 4.5],
    ["--control-border", "--surface", 3],
    ["--control-border", "--bg", 3],
    ["--control-border", "--input-bg", 3],
    ["--focus", "--surface", 3],
    ["--focus", "--bg", 3],
    ["--sidebar-focus", "--sidebar", 3],
  ];
  for (const [foreground, background, minimum] of pairs) {
    expect(tokens[foreground], foreground).toBeDefined();
    expect(tokens[background], background).toBeDefined();
    expect(
      ratio(tokens[foreground], tokens[background]),
      `${foreground}/${background}`,
    ).toBeGreaterThanOrEqual(minimum);
  }
});
