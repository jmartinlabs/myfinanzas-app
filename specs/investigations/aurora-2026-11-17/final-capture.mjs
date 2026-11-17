/**
 * Captura de Aurora (y de las otras apariencias) para la evidencia de #489.
 *
 * Uso, desde la raíz del repositorio, con la app DEMO levantada:
 *   DEMO_PORT=5174 bun run dev:demo
 *   BASE=http://127.0.0.1:5174 OUT=/tmp/aurora-shots node specs/investigations/aurora-2026-11-17/final-capture.mjs
 *
 * Requiere `@playwright/test` y su Chromium. No modifica el repositorio: el
 * tema se selecciona con el control «Apariencia» de la propia app.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const OUT = process.env.OUT ?? "artifacts/aurora-489";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: "es-ES",
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push("pageerror: " + error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push("console: " + message.text());
});

async function shot(name, path, width, height, theme = "aurora") {
  await page.setViewportSize({ width, height });
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  const select = page.getByLabel("Apariencia");
  if (await select.count()) await select.selectOption(theme);
  else
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - innerWidth,
  );
  const applied = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme"),
  );
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log(name, "theme=" + applied, "overflow=" + overflow);
  return overflow;
}

const pages = [
  ["/inicio", "inicio"],
  ["/movimientos", "movimientos"],
  ["/saldos", "saldos"],
  ["/inversiones", "inversiones"],
  ["/deudas", "deudas"],
  ["/referencias", "referencias"],
];
const sizes = [
  [1440, 1000, "1440"],
  [820, 1000, "820"],
  [390, 844, "390"],
];

let bad = 0;
for (const [path, label] of pages)
  for (const [width, height, tag] of sizes)
    if ((await shot(`aurora-${label}-${tag}`, path, width, height)) !== 0) bad++;

// No regresión: las otras cinco apariencias con el mismo código.
for (const theme of ["dark-s", "graphite-lime", "casa", "light-s", "hybrid-s"]) {
  await shot(`${theme}-inicio-1440`, "/inicio", 1440, 1000, theme);
  await shot(`${theme}-movimientos-1440`, "/movimientos", 1440, 1000, theme);
}

console.log("overflow fuera de rango:", bad);
console.log("errores de página:", errors.length ? errors : "ninguno");
await browser.close();