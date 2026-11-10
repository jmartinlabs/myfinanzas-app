import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ args: ["--lang=es-ES"] });
for (const theme of ["graphite-lime", "color-finance", "pastel-editorial"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, locale: "es-ES" });
  await page.goto("file://" + join(here, "estados-candidatos.html") + "?theme=" + theme, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(180);
  await page.locator(".state-card--wide").screenshot({ path: join(here, `shots-estados/${theme}-form.png`) });
  await page.locator(".state-card").filter({ has: page.locator("#state-saved") }).screenshot({ path: join(here, `shots-estados/${theme}-saved.png`) });
  await page.close();
}
await browser.close();
