import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ args: ["--lang=es-ES"] });
const pages = {
  movimientos: "file://" + join(here, "movimientos-candidatos.html") + "?theme=graphite-lime",
  estados: "file://" + join(here, "estados-candidatos.html") + "?theme=graphite-lime",
  formularios: "file://" + join(here, "formularios-graphite.html"),
};
const report = { checks: [], interactions: [], focus: [], zoom: [], reducedMotion: [] };

const tokenPairs = [
  ["text/surface", "--text", "--surface"],
  ["text/bg", "--text", "--bg"],
  ["muted/surface", "--muted", "--surface"],
  ["accent-ink/surface", "--accent-ink", "--surface"],
  ["on-action/action", "--on-orange", "--orange"],
  ["positive/surface", "--positive", "--surface"],
  ["negative/surface", "--negative", "--surface"],
  ["warning/surface", "--warning", "--surface"],
  ["error/surface", "--error", "--surface"],
  ["sidebar-text/sidebar", "--sidebar-text", "--sidebar"],
  ["sidebar-muted/sidebar", "--sidebar-muted", "--sidebar"],
  ["active-text/active", "--sidebar-active-text", "--sidebar-active-bg"],
  ["text/input", "--text", "--input-bg"],
  ["muted/table-head", "--muted", "--table-head"],
  ["positive/soft", "--positive", "--positive-soft"],
  ["warning/soft", "--warning", "--warning-soft"],
  ["negative/soft", "--negative", "--negative-soft"],
  ["error/soft", "--error", "--error-soft"],
];
const localPairs = [
  ["form-kicker/card", "#d7ff5e", "#151815"],
  ["form-label/card", "#8f988b", "#151815"],
  ["form-help/card", "#8f988b", "#151815"],
  ["form-input/input", "#f1f4ec", "#0c0e0c"],
  ["form-readonly/input", "#c2c8bc", "#0e100e"],
  ["form-info/title", "#c2c8bc", "#191c17"],
  ["form-info/body", "#8f988b", "#191c17"],
  ["form-callout/warning", "#ffd166", "#28261b"],
  ["form-derived/value", "#c2c8bc", "#0e100e"],
  ["form-btn/action", "#0b0e08", "#d7ff5e"],
  ["form-conditional/chip", "#d7ff5e", "#232819"],
  ["mov-table-head/head", "#9da796", "#0e110e"],
  ["mov-table-cell/card", "#c2c8bc", "#101210"],
  ["mov-selected/selected", "#f1f4ec", "#1c2417"],
  ["mov-detail/detail", "#f1f4ec", "#181c15"],
  ["mov-detail-label/detail", "#98a192", "#181c15"],
  ["state-label/card", "#8f988b", "#161916"],
  ["state-input/input", "#f1f4ec", "#0c0e0c"],
  ["state-error/error-soft", "#ff8178", "#2a1b19"],
  ["state-success/positive-soft", "#f1f4ec", "#1d2720"],
];

function parse(c) {
  if (!c) return null;
  c = c.trim();
  if (c.startsWith("#")) {
    let h = c.slice(1);
    if (h.length === 3) h = [...h].map((x) => x + x).join("");
    const n = parseInt(h.slice(0, 6), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const m = c.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const p = m[1].split(",").map((x) => Number(x.trim()));
  return { r: p[0], g: p[1], b: p[2] };
}
function lum(c) {
  const v = [c.r, c.g, c.b].map((x) => {
    const y = x / 255;
    return y <= 0.03928 ? y / 12.92 : Math.pow((y + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function ratio(a, b) {
  const x = parse(a), y = parse(b);
  if (!x || !y) return null;
  const l1 = lum(x), l2 = lum(y);
  return Number(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
}

async function inspect(name, url, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  const data = await page.evaluate(({ tokens }) => {
    const s = getComputedStyle(document.documentElement);
    const v = (n) => s.getPropertyValue(n).trim();
    const out = { tokens: {}, fonts: [], smallControls: [], layout: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight } };
    for (const n of tokens) out.tokens[n] = v(n);
    for (const el of document.querySelectorAll("body *")) {
      const own = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent.trim()).join(" ").trim();
      if (!own) continue;
      const st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") continue;
      if (parseFloat(st.fontSize) < 12 && !el.classList.contains("brand-sub")) out.fonts.push({ size: parseFloat(st.fontSize), cls: String(el.className).slice(0, 40), text: own.slice(0, 36) });
    }
    out.fonts = out.fonts.slice(0, 20);
    for (const el of document.querySelectorAll("button, select, input, textarea, .page-btn, .filter-toggle, .icon-btn, .menu-btn, .mobile-theme")) {
      const st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.height < 44) out.smallControls.push({ tag: el.tagName, cls: String(el.className).slice(0, 30), h: Number(r.height.toFixed(1)) });
    }
    out.smallControls = out.smallControls.slice(0, 20);
    return out;
  }, { tokens: tokenPairs.flatMap((p) => [p[1], p[2]]) });

  const ratios = {};
  for (const [n, fg, bg] of tokenPairs) {
    const r = ratio(data.tokens[fg], data.tokens[bg]);
    if (r !== null) ratios[n] = r;
  }
  for (const [n, fg, bg] of localPairs) ratios["local-" + n] = ratio(fg, bg);
  const check = { name, width, height, ...data.layout, errors, fonts: data.fonts.length, smallControls: data.smallControls.length, ratios };
  report.checks.push(check);
  if (data.fonts.length) report.checks[report.checks.length - 1].fontDetails = data.fonts;
  if (data.smallControls.length) report.checks[report.checks.length - 1].smallControlDetails = data.smallControls;
  await page.close();
  return check;
}

await inspect("movimientos-1440", pages.movimientos, 1440, 1000);
await inspect("movimientos-390", pages.movimientos, 390, 844);
await inspect("estados-1440", pages.estados, 1440, 1000);
await inspect("estados-390", pages.estados, 390, 844);
await inspect("formularios-1440", pages.formularios, 1440, 1000);
await inspect("formularios-390", pages.formularios, 390, 844);
await inspect("formularios-1440-eur", pages.formularios, 1440, 1000);

// Keyboard focus visible on Movimientos and Formularios.
for (const [name, url] of [["movimientos", pages.movimientos], ["formularios", pages.formularios]]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.keyboard.press("Tab");
  const focus = [];
  for (let i = 0; i < 18; i++) {
    const item = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const st = getComputedStyle(el);
      return {
        tag: el.tagName,
        id: el.id,
        cls: String(el.className).slice(0, 40),
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 32),
        outlineStyle: st.outlineStyle,
        outlineWidth: st.outlineWidth,
        outlineColor: st.outlineColor,
      };
    });
    if (item) focus.push(item);
    await page.keyboard.press("Tab");
  }
  report.focus.push({ page: name, items: focus });
  await page.close();
}

// Focus screenshot: selected row and form field.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto(pages.movimientos, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.mov-row[data-movement="317"]').focus();
  await page.waitForTimeout(100);
  await page.screenshot({ path: join(here, "shots-graphite-a11y/movimientos-row-focus.png"), fullPage: false });
  await page.close();
}
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto(pages.formularios, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#compra-cantidad").focus();
  await page.waitForTimeout(100);
  await page.screenshot({ path: join(here, "shots-graphite-a11y/formularios-focus.png"), fullPage: false });
  await page.close();
}

// Reduced motion.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(pages.movimientos, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const durations = await page.evaluate(() => {
    const sels = [".nav-item", ".btn", ".mov-row", ".filter-toggle", ".theme-control"];
    return sels.map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { sel, missing: true };
      const st = getComputedStyle(el);
      return { sel, duration: st.transitionDuration, animation: st.animationDuration };
    });
  });
  report.reducedMotion.push({ page: "movimientos", durations });
  await page.close();
}

// Zoom equivalent: 1440 at 200% ≈ 720 CSS px; 1280 at 200% ≈ 640 CSS px.
for (const [label, width] of [["1440-200", 720], ["1280-200", 640]]) {
  for (const [pageName, url] of [["movimientos", pages.movimientos], ["formularios", pages.formularios]]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(url, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(120);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight }));
    report.zoom.push({ label, page: pageName, width, ...m, ok: m.sw === m.cw });
    await page.close();
  }
}

// Conditional field state.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(pages.formularios, { waitUntil: "load" });
  const usd = await page.evaluate(() => ({ value: document.getElementById("compra-divisa-select").value, hidden: document.querySelector("[data-exchange-field]").hidden, state: document.querySelector("[data-exchange-state]").textContent }));
  await page.selectOption("#compra-divisa-select", "EUR");
  const eur = await page.evaluate(() => ({ value: document.getElementById("compra-divisa-select").value, hidden: document.querySelector("[data-exchange-field]").hidden, disabled: document.getElementById("compra-cambio").disabled, state: document.querySelector("[data-exchange-state]").textContent }));
  report.interactions.push({ test: "compra-cambio-condicional", usd, eur, ok: !usd.hidden && eur.hidden && eur.disabled && eur.state.includes("EUR") });
  await page.close();
}

// Mobile menu + focus return.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(pages.movimientos, { waitUntil: "load" });
  await page.locator(".menu-btn").click();
  await page.waitForTimeout(100);
  const open = await page.locator(".sidebar").evaluate((el) => el.classList.contains("is-open"));
  const focusInside = await page.evaluate(() => !!document.activeElement?.closest(".sidebar"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  const closed = await page.locator(".sidebar").evaluate((el) => !el.classList.contains("is-open"));
  const focusReturned = await page.evaluate(() => document.activeElement?.classList.contains("menu-btn"));
  report.interactions.push({ test: "menu-movil-teclado", open, focusInside, closed, focusReturned, ok: open && focusInside && closed && focusReturned });
  await page.close();
}

writeFileSync(join(here, "qa-graphite-final.json"), JSON.stringify(report, null, 2));
await browser.close();

const failures = [];
for (const c of report.checks) for (const [n, r] of Object.entries(c.ratios)) if (r < 4.5) failures.push({ page: c.name, check: n, ratio: r });
console.log("contrastFailures", failures);
console.log("checks", report.checks.map((c) => ({ name: c.name, sw: c.sw, cw: c.cw, errors: c.errors.length, fonts: c.fonts, small: c.smallControls })));
console.log("zoom", report.zoom);
console.log("reducedMotion", report.reducedMotion);
console.log("interactions", report.interactions);
console.log("focusSample", report.focus.map((f) => ({ page: f.page, first: f.items.slice(0, 3), missingOutline: f.items.filter((i) => i.outlineStyle === "none" || parseFloat(i.outlineWidth) === 0).length })));
