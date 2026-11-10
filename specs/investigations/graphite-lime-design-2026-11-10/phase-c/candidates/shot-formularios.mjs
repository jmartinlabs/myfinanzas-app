import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ args: ["--lang=es-ES"] });
const base = "file://" + join(here, "formularios-graphite.html");
async function capture(width, key, full = true, eur = false) {
  const page = await browser.newPage({ viewport: { width, height: width <= 390 ? 844 : 1000 }, deviceScaleFactor: 2, locale: "es-ES" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(base, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  if (eur) {
    await page.selectOption("#compra-divisa-select", "EUR");
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(200);
  const metrics = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight }));
  await page.screenshot({ path: join(here, `shots-formularios/${key}.png`), fullPage: full });
  if (full) await page.screenshot({ path: join(here, `shots-formularios/${key}-fold.png`), fullPage: false });
  console.log(key, metrics, errors);
  await page.close();
}
await capture(1440, "graphite-lime-1440");
await capture(1440, "graphite-lime-1440-eur", true, true);
await capture(390, "graphite-lime-390");
await browser.close();
