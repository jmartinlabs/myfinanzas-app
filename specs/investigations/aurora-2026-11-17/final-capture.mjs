import pw from "/Users/josemartin/Projects/myfinanzas-app/node_modules/@playwright/test/index.js";
import { mkdirSync } from "node:fs";
const { chromium } = pw;

const BASE = "http://127.0.0.1:5174";
const OUT = "/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/aurora/final-shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: "es-ES",
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console: " + m.text());
});

async function shot(name, path, width, height, theme = "aurora") {
  await page.setViewportSize({ width, height });
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.evaluate((t) => {
    try { localStorage.setItem("mf-theme", t); } catch {}
  }, theme);
  const select = page.getByLabel("Apariencia");
  if (await select.count()) await select.selectOption(theme);
  else await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - innerWidth,
  );
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  const themeNow = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme"),
  );
  console.log(name, "theme=" + themeNow, "overflow=" + overflow);
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
for (const [path, label] of pages) {
  for (const [w, h, tag] of sizes) {
    if ((await shot(`aurora-${label}-${tag}`, path, w, h)) !== 0) bad++;
  }
}

// Los otros cinco temas no deben haberse movido.
for (const [theme, label] of [
  ["dark-s", "dark-s"],
  ["graphite-lime", "graphite-lime"],
  ["casa", "casa"],
  ["light-s", "light-s"],
  ["hybrid-s", "hybrid-s"],
]) {
  await shot(`${label}-inicio-1440`, "/inicio", 1440, 1000, theme);
  await shot(`${label}-movimientos-1440`, "/movimientos", 1440, 1000, theme);
}

console.log("overflow fuera de rango:", bad);
console.log("errores de página:", errors.length ? errors : "ninguno");
await browser.close();
