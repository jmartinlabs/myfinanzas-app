import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const boards = [
  ["comparativa-movimientos-desktop.html", 4460],
  ["comparativa-movimientos-responsive.html", 1720],
  ["comparativa-movimientos-familia.html", 4460],
  ["comparativa-estados-graphite.html", 1940],
];
for (const [file, width] of boards) {
  const page = await browser.newPage({ viewport: { width, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto("file://" + join(here, file), { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; })));
  });
  await page.waitForTimeout(250);
  const size = await page.evaluate(() => ({ w: document.querySelector(".board").scrollWidth, h: document.querySelector(".board").scrollHeight }));
  await page.locator(".board").screenshot({ path: join(here, file.replace(".html", ".png")) });
  console.log(file, size);
  await page.close();
}
await browser.close();
