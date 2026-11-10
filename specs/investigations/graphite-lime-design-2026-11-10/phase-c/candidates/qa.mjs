import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const themes = ["graphite-lime", "color-finance", "pastel-editorial"];
const report = { themes: {}, layout: [], fonts: [], interactions: [] };

const tokenPairs = [
  ["text/surface", "--text", "--surface"],
  ["text/bg", "--text", "--bg"],
  ["text-2/surface", "--text-2", "--surface"],
  ["muted/surface", "--muted", "--surface"],
  ["muted/bg", "--muted", "--bg"],
  ["accent-ink/surface", "--accent-ink", "--surface"],
  ["accent-ink/soft", "--accent-ink", "--accent-soft"],
  ["on-orange/orange", "--on-orange", "--orange"],
  ["positive/surface", "--positive", "--surface"],
  ["negative/surface", "--negative", "--surface"],
  ["warning/surface", "--warning", "--surface"],
  ["sidebar-text/sidebar", "--sidebar-text", "--sidebar"],
  ["sidebar-muted/sidebar", "--sidebar-muted", "--sidebar"],
  ["active-text/active", "--sidebar-active-text", "--sidebar-active-bg"],
  ["hero-text/hero", "--hero-text", "--hero-bg-solid"],
  ["hero-muted/hero", "--hero-muted", "--hero-bg-solid"],
  ["hero-positive/hero", "--hero-positive", "--hero-bg-solid"],
  ["hero-plan/hero", "--hero-plan", "--hero-bg-solid"],
  ["hero-negative/hero", "--hero-negative", "--hero-bg-solid"],
  ["muted/table-head", "--muted", "--table-head"],
  ["text/input", "--text", "--input-bg"],
  ["positive/positive-soft", "--positive", "--positive-soft"],
  ["warning/warning-soft", "--warning", "--warning-soft"],
  ["negative/negative-soft", "--negative", "--negative-soft"],
];

const localPairs = {
  "graphite-lime": [
    ["kpi-label/card", "#98a192", "#121512"],
    ["kpi-value/card", "#f1f4ec", "#121512"],
    ["kpi-positive/card", "#7fe0a8", "#121512"],
    ["kpi-negative/card", "#ff9a8c", "#121512"],
    ["kpi-meta/card", "#8f988b", "#121512"],
    ["attention-title/card", "#f1f4ec", "#151814"],
    ["attention-meta/card", "#8f988b", "#151814"],
    ["objective-value/card", "#d7ff5e", "#121510"],
    ["objective-meta/card", "#8f988b", "#121510"],
    ["budget-name/card", "#c2c8bc", "#111311"],
    ["budget-meta/card", "#8f988b", "#111311"],
    ["position-label/card", "#8f988b", "#131513"],
    ["position-value/card", "#f1f4ec", "#131513"],
    ["position-meta/card", "#8f988b", "#131513"],
    ["table-head/head", "#9da796", "#0e110e"],
    ["table-cell/card", "#c2c8bc", "#111311"],
    ["cycle-plan/card", "#d7ff5e", "#111311"],
  ],
  "color-finance": [
    ["kpi1-label/card", "#5f5377", "#e4daf7"],
    ["kpi1-meta/card", "#57505f", "#e4daf7"],
    ["kpi2-label/card", "#6b5a2d", "#f8e8b9"],
    ["kpi2-meta/card", "#57505f", "#f8e8b9"],
    ["kpi3-label/card", "#4f6653", "#dfebde"],
    ["kpi3-meta/card", "#57505f", "#dfebde"],
    ["kpi4-meta/card", "#57505f", "#f9f2e9"],
    ["attention-title/card", "#26232b", "#f8ecc9"],
    ["attention-meta/card", "#5f5767", "#f8ecc9"],
    ["objective-title/card", "#3f3552", "#e7ddf6"],
    ["objective-value/card", "#4a3a72", "#e7ddf6"],
    ["objective-meta/card", "#62586f", "#e7ddf6"],
    ["budget-name/card", "#3a3340", "#f2e4ab"],
    ["budget-meta/card", "#4c5c4f", "#f2e4ab"],
    ["position-label/card", "#57505f", "#e4daf7"],
    ["position-value/card", "#26232b", "#e4daf7"],
    ["position-meta/card", "#57505f", "#e4daf7"],
    ["table-head/head", "#6b6574", "#f4eef8"],
    ["table-cell/card", "#494451", "#fffdf9"],
    ["cycle-plan/card", "#5947c4", "#fffdf9"],
  ],
  "pastel-editorial": [
    ["kpi1-label/card", "#4a4351", "#e9e0f6"],
    ["kpi1-meta/card", "#5c5364", "#e9e0f6"],
    ["kpi2-label/card", "#4a4351", "#f8ecb4"],
    ["kpi2-meta/card", "#5c5364", "#f8ecb4"],
    ["kpi3-label/card", "#4a4351", "#f5dbe3"],
    ["kpi3-meta/card", "#5c5364", "#f5dbe3"],
    ["kpi4-meta/card", "#5c5364", "#fffdf8"],
    ["attention-title/card", "#17151a", "#f1d2dc"],
    ["attention-meta/card", "#554c5b", "#f1d2dc"],
    ["objective-title/card", "#17151a", "#e1d3f0"],
    ["objective-value/card", "#2c2038", "#e1d3f0"],
    ["objective-meta/card", "#554c5d", "#e1d3f0"],
    ["budget-name/card", "#3a3340", "#f2e4ab"],
    ["budget-meta/card", "#615868", "#f2e4ab"],
    ["position-label/card", "#4a4351", "#e9e0f6"],
    ["position-value/card", "#17151a", "#e9e0f6"],
    ["position-meta/card", "#5c5364", "#e9e0f6"],
    ["table-head/head", "#514958", "#fffdf8"],
    ["table-cell/card", "#3d3742", "#fffdf8"],
    ["cycle-plan/card", "#6a3c7a", "#fffdf8"],
  ],
};

function parse(c) {
  if (!c) return null;
  c = c.trim();
  if (c.startsWith("#")) {
    let h = c.slice(1);
    if (h.length === 3) h = [...h].map((x) => x + x).join("");
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
  }
  const m = c.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const p = m[1].split(",").map((x) => Number(x.trim()));
  return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
}
function blend(f, b) {
  const a = f.a ?? 1;
  return { r: f.r * a + b.r * (1 - a), g: f.g * a + b.g * (1 - a), b: f.b * a + b.b * (1 - a), a: 1 };
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

for (const theme of themes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("file://" + join(here, "inicio-candidatos.html") + "?theme=" + theme, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(180);

  const data = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    const v = (n) => s.getPropertyValue(n).trim();
    const out = { tokens: {}, fonts: [], layout: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, scrollHeight: document.documentElement.scrollHeight }, theme: document.documentElement.dataset.theme };
    const tokenNames = ["--text","--text-2","--muted","--surface","--bg","--accent-ink","--accent-soft","--on-orange","--orange","--positive","--negative","--warning","--sidebar-text","--sidebar-muted","--sidebar","--sidebar-active-text","--sidebar-active-bg","--hero-text","--hero-muted","--hero-bg-solid","--hero-positive","--hero-plan","--hero-negative","--table-head","--input-bg","--positive-soft","--warning-soft","--negative-soft"];
    for (const name of tokenNames) out.tokens[name] = v(name);
    for (const el of document.querySelectorAll("body *")) {
      const own = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent.trim()).join(" ").trim();
      if (!own) continue;
      const st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") continue;
      const size = parseFloat(st.fontSize);
      if (size < 12 && !el.classList.contains("brand-sub")) out.fonts.push({ size, cls: String(el.className).slice(0, 50), text: own.slice(0, 48) });
    }
    out.fonts = out.fonts.slice(0, 30);
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const st = getComputedStyle(el);
      return { color: st.color, background: st.backgroundColor, size: st.fontSize };
    };
    out.computed = {
      kpi1Meta: pick(".b-kpi:nth-child(1) .b-kpi-meta"),
      kpi1Label: pick(".b-kpi:nth-child(1) .b-kpi-label"),
      budgetMeta: pick(".b-budget-values"),
      posLabel: pick(".b-pos-item:nth-child(1) .b-pos-label"),
      posMeta: pick(".b-pos-item:nth-child(1) .b-pos-meta"),
      attentionMeta: pick(".b-attention .b-attn-meta"),
      objectiveMeta: pick(".b-objective-meta"),
    };
    return out;
  });

  const ratios = {};
  for (const [name, fg, bg] of tokenPairs) {
    const r = ratio(data.tokens[fg], data.tokens[bg]);
    if (r !== null) ratios[name] = r;
  }
  for (const [name, fg, bg] of localPairs[theme]) {
    ratios["local-" + name] = ratio(fg, bg);
  }

  // Theme switching through the visible topbar control.
  const switches = [];
  for (const option of themes) {
    await page.selectOption(".topbar .theme-select", option);
    await page.waitForTimeout(40);
    const state = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    switches.push({ option, ...state, ok: state.theme === option && state.sw === state.cw });
  }
  await page.selectOption(".topbar .theme-select", theme);
  await page.waitForTimeout(40);
  const optionValues = await page.$$eval(".mobile-theme .theme-select option", (els) => els.map((e) => e.value));

  report.themes[theme] = { ratios, errors, fontCount: data.fonts.length, computed: data.computed };
  report.layout.push({ theme, ...data.layout, errors });
  if (data.fonts.length) report.fonts.push({ theme, elements: data.fonts });
  report.interactions.push({ theme, switches, mobileThemeOptions: optionValues });
  await page.close();
}

writeFileSync(join(here, "qa-report.json"), JSON.stringify(report, null, 2));
await browser.close();

const failures = [];
for (const [theme, d] of Object.entries(report.themes)) {
  for (const [name, r] of Object.entries(d.ratios)) {
    if (r < 4.5) failures.push({ theme, name, r });
  }
}
console.log("failures", failures);
console.log("layout", report.layout);
console.log("fonts", report.fonts);
console.log("interactions", report.interactions);
