import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
for (const theme of ["graphite-lime", "color-finance", "pastel-editorial"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto("file://" + join(here, "inicio-candidatos.html") + "?theme=" + theme, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  const parts = [
    [".c-control", "hero"],
    [".b-kpis", "kpis"],
    [".b-cycle", "cycle"],
    [".b-rail", "rail"],
    [".b-movements", "movements"],
    [".b-budget", "budget"],
    [".b-position", "position"],
  ];
  for (const [sel, key] of parts) {
    const el = page.locator(sel).first();
    if (await el.count()) await el.screenshot({ path: join(here, `shots/${theme}-${key}.png`) });
  }
  await page.close();
}
await browser.close();
