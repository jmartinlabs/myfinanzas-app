import pw from "/Users/josemartin/Projects/myfinanzas-app/node_modules/@playwright/test/index.js";
import { mkdirSync, readFileSync } from "node:fs";
const { chromium } = pw;

const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const OUT = process.env.OUT ?? "/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/aurora/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-ES" });
const page = await ctx.newPage();

const only = process.argv.slice(2);
const should = (n) => only.length === 0 || only.includes(n);
const cssPath = process.env.AURORA_CSS || null;
const css = cssPath ? readFileSync(cssPath, "utf8") : null;

async function capture(name, path, width, height, theme) {
  if (!should(name)) return;
  await page.setViewportSize({ width, height });
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("mf-theme", t); } catch {}
  }, theme);
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log("shot", name);
}

const pages = [
  ["/inicio", "inicio"],
  ["/movimientos", "movimientos"],
  ["/saldos", "saldos"],
  ["/deudas", "deudas"],
  ["/referencias", "referencias"],
  ["/inversiones", "inversiones"],
];

const sizes = [
  [1440, 1000, "1440"],
  [820, 1000, "820"],
  [390, 844, "390"],
];

const themes = (process.env.THEMES || "dark-s,graphite-lime").split(",");

for (const theme of themes) {
  for (const [path, label] of pages) {
    for (const [w, h, tag] of sizes) {
      await capture(`${theme}-${label}-${tag}`, path, w, h, theme);
      if (process.env.ONLY_1440) break;
    }
  }
}
await browser.close();
console.log("done");
