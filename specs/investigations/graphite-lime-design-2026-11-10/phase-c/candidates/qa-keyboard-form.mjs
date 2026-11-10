import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ args: ["--lang=es-ES"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("file://" + join(here, "formularios-graphite.html"), { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);

const sequence = [];
await page.locator("#compra-instrumento").focus();
for (let i = 0; i < 13; i++) {
  const item = await page.evaluate(() => {
    const el = document.activeElement;
    const st = getComputedStyle(el);
    return { id: el.id, tag: el.tagName, outline: `${st.outlineStyle} ${st.outlineWidth} ${st.outlineColor}`, label: el.getAttribute("aria-label") || el.textContent.trim().slice(0, 24) };
  });
  sequence.push(item);
  await page.keyboard.press("Tab");
}

await page.selectOption("#compra-divisa-select", "EUR");
await page.locator("#compra-divisa-select").focus();
await page.keyboard.press("Tab");
const eurNext = await page.evaluate(() => document.activeElement.id);

// Focus independiente del control de fecha nativo (segmentos internos).
await page.locator("#compra-fecha").focus();
const dateFocus = await page.evaluate(() => {
  const el = document.activeElement;
  const st = getComputedStyle(el);
  return { id: el.id, outline: `${st.outlineStyle} ${st.outlineWidth} ${st.outlineColor}` };
});

const table = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await table.goto("file://" + join(here, "movimientos-candidatos.html") + "?theme=graphite-lime", { waitUntil: "load" });
await table.locator('.mov-row[data-movement="317"]').focus();
const rowFocus = await table.evaluate(() => {
  const el = document.activeElement;
  const st = getComputedStyle(el);
  return { tag: el.tagName, outline: `${st.outlineStyle} ${st.outlineWidth} ${st.outlineColor}` };
});

const report = { sequence, dateFocus, eurNext, expectedEurNext: "compra-eur", rowFocus, ok: dateFocus.outline.startsWith("solid") && sequence.every((s) => !s.outline.startsWith("none")) && eurNext === "compra-eur" && rowFocus.outline.startsWith("solid") };
writeFileSync(join(here, "qa-keyboard-form.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
