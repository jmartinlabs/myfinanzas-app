import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
for (const [file,w] of [["comparativa-inicio-light.html",2920],["comparativa-inicio-hybrid.html",2920],["comparativa-movimientos-light.html",2920],["comparativa-movimientos-hybrid.html",2920],["comparativa-correccion-inicio-hybrid.html",2920],["comparativa-correccion-movimientos-light.html",2920],["comparativa-correccion-movimientos-hybrid.html",2920],["comparativa-family.html",4400]]) {
  const page = await browser.newPage({ viewport:{width:w,height:1200}, deviceScaleFactor:1 });
  await page.goto("file://" + join(here,file), {waitUntil:"load"});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(200);
  await page.locator(".board").screenshot({path:join(here,file.replace(".html",".png"))});
  console.log(file, await page.evaluate(()=>({sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight})));
  await page.close();
}
await browser.close();
