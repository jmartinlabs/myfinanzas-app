import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
for (const [file,key] of [["inicio-light.html","inicio-light"],["inicio-hybrid.html","inicio-hybrid"],["movimientos-light.html","movimientos-light"],["movimientos-hybrid.html","movimientos-hybrid"]]) {
  const page = await browser.newPage({ viewport:{width:1440,height:1000}, deviceScaleFactor:2 });
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  await page.goto("file://" + join(here,file), {waitUntil:"load"});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(250);
  const m=await page.evaluate(()=>({theme:document.documentElement.dataset.theme,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight}));
  await page.screenshot({path:join(here,`shots/after-${key}-1440.png`),fullPage:true});
  await page.screenshot({path:join(here,`shots/after-${key}-1440-fold.png`),fullPage:false});
  console.log(file,m,errors);
  await page.close();
}
await browser.close();
