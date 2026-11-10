import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
for (const theme of ["graphite-lime", "color-finance", "pastel-editorial"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("file://" + join(here, "inicio-candidatos.html") + "?theme=" + theme, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const metrics = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    sh: document.documentElement.scrollHeight,
  }));
  await page.screenshot({ path: join(here, `shots/${theme}-1440.png`), fullPage: true });
  await page.screenshot({ path: join(here, `shots/${theme}-1440-fold.png`), fullPage: false });
  console.log(theme, metrics, errors);
  await page.close();
}
await browser.close();
