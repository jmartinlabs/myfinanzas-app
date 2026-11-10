import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ args: ["--lang=es-ES"] });
const base = "file://" + join(here, "estados-candidatos.html");
async function capture(theme, width, key, full = true) {
  const page = await browser.newPage({ viewport: { width, height: width <= 390 ? 844 : 1000 }, deviceScaleFactor: 2, locale: "es-ES" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(base + "?theme=" + theme, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const metrics = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight }));
  await page.screenshot({ path: join(here, `shots-estados/${key}.png`), fullPage: full });
  if (full) await page.screenshot({ path: join(here, `shots-estados/${key}-fold.png`), fullPage: false });
  console.log(key, metrics, errors);
  await page.close();
}
await capture("graphite-lime", 1440, "graphite-lime-1440");
await capture("graphite-lime", 390, "graphite-lime-390");
await capture("color-finance", 1440, "color-finance-1440");
await capture("pastel-editorial", 1440, "pastel-editorial-1440");
await browser.close();
