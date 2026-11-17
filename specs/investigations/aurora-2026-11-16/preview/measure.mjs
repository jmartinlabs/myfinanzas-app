import pw from "/Users/josemartin/Projects/myfinanzas-app/node_modules/@playwright/test/index.js";
import { readFileSync } from "node:fs";
const { chromium } = pw;

const BASE = "http://127.0.0.1:5174";
const css = readFileSync("/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/aurora/aurora-preview.css", "utf8");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-ES" });
const page = await ctx.newPage();

const pages = ["/inicio", "/movimientos", "/saldos", "/deudas", "/referencias", "/inversiones"];
const sizes = [[1440, 1000], [820, 1000], [390, 844]];

async function probe(theme, path, w, h, inject) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
  if (inject) await page.addStyleTag({ content: css });
  await page.waitForTimeout(350);
  return page.evaluate(() => {
    const de = document.documentElement;
    const gradients = [...document.querySelectorAll(".panel, .graphite-control, .graphite-kpis, .graphite-rail-card, .list-card, .filter-card, .global-header")]
      .filter((el) => /gradient/.test(getComputedStyle(el).backgroundImage)).length;
    return {
      overflow: de.scrollWidth - innerWidth,
      gradients,
      theme: de.getAttribute("data-theme"),
      headerBg: getComputedStyle(document.querySelector(".global-header")).backgroundColor,
      activeBg: getComputedStyle(document.querySelector(".nav-active") || document.body).backgroundImage,
      accent: getComputedStyle(de).getPropertyValue("--accent").trim(),
    };
  });
}

const rows = [];
for (const [w, h] of sizes) {
  for (const path of pages) {
    const dark = await probe("dark-s", path, w, h, false);
    const aurora = await probe("aurora", path, w, h, true);
    rows.push({ page: path, width: w, darkOverflow: dark.overflow, auroraOverflow: aurora.overflow, auroraGradients: aurora.gradients, auroraAccent: aurora.accent });
  }
}
console.table(rows);

// Leak test: same computed styles under dark-s before/after injecting aurora CSS.
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(BASE + "/inicio", { waitUntil: "networkidle" });
await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark-s"));
const before = await page.evaluate(() => {
  const pick = (sel, props) => {
    const el = document.querySelector(sel);
    if (!el) return "missing";
    const cs = getComputedStyle(el);
    return props.map((p) => cs[p]).join("|");
  };
  return [
    pick("body", ["backgroundColor", "backgroundImage"]),
    pick(".graphite-control", ["backgroundImage", "boxShadow"]),
    pick(".sidebar", ["backgroundImage", "borderRightColor"]),
    pick(".nav-active", ["backgroundImage", "borderColor"]),
    pick(".global-header", ["backgroundColor", "backdropFilter"]),
    pick(".primary", ["backgroundColor", "boxShadow"]),
  ].join(" // ");
});
await page.addStyleTag({ content: css });
const after = await page.evaluate(() => {
  const pick = (sel, props) => {
    const el = document.querySelector(sel);
    if (!el) return "missing";
    const cs = getComputedStyle(el);
    return props.map((p) => cs[p]).join("|");
  };
  return [
    pick("body", ["backgroundColor", "backgroundImage"]),
    pick(".graphite-control", ["backgroundImage", "boxShadow"]),
    pick(".sidebar", ["backgroundImage", "borderRightColor"]),
    pick(".nav-active", ["backgroundImage", "borderColor"]),
    pick(".global-header", ["backgroundColor", "backdropFilter"]),
    pick(".primary", ["backgroundColor", "boxShadow"]),
  ].join(" // ");
});
console.log("LEAK dark-s unchanged:", before === after);
if (before !== after) {
  console.log("before:", before);
  console.log("after :", after);
}
await browser.close();
