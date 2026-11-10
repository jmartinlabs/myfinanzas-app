import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ args: ["--lang=es-ES"] });
const pageUrl = (theme, extra = "") => "file://" + join(here, "movimientos-candidatos.html") + `?theme=${theme}${extra}`;


async function captureFilters(theme, width, key) {
  const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(pageUrl(theme), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("[data-filter-toggle]").click();
  await page.waitForTimeout(180);
  const metrics = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight }));
  await page.screenshot({ path: join(here, `shots-movimientos/${key}.png`), fullPage: true });
  await page.screenshot({ path: join(here, `shots-movimientos/${key}-fold.png`), fullPage: false });
  console.log(key, metrics, errors);
  await page.close();
}

async function capture(theme, width, key, extra = "", full = true) {
  const page = await browser.newPage({ viewport: { width, height: width <= 390 ? 844 : width <= 820 ? 1180 : 1000 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(pageUrl(theme, extra), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const metrics = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    sh: document.documentElement.scrollHeight,
  }));
  await page.screenshot({ path: join(here, `shots-movimientos/${key}.png`), fullPage: full });
  if (full) await page.screenshot({ path: join(here, `shots-movimientos/${key}-fold.png`), fullPage: false });
  console.log(key, metrics, errors);
  await page.close();
}

for (const theme of ["graphite-lime", "color-finance", "pastel-editorial"]) {
  await capture(theme, 1440, `${theme}-1440`);
}
await capture("graphite-lime", 820, "graphite-lime-820");
await capture("graphite-lime", 390, "graphite-lime-390");
await capture("graphite-lime", 390, "graphite-lime-390-detail", "&movement=318&detail=1", false);
await captureFilters("graphite-lime", 390, "graphite-lime-390-filters");
await capture("color-finance", 390, "color-finance-390");
await capture("color-finance", 390, "color-finance-390-detail", "&movement=316&detail=1", false);
await browser.close();
