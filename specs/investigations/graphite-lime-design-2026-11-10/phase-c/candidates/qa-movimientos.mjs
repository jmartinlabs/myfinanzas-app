import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const themes = ["graphite-lime", "color-finance", "pastel-editorial"];
const report = { pages: [], fonts: [], interactions: [] };

const tokenPairs = [
  ["text/surface", "--text", "--surface"],
  ["text/bg", "--text", "--bg"],
  ["muted/surface", "--muted", "--surface"],
  ["accent-ink/surface", "--accent-ink", "--surface"],
  ["on-orange/orange", "--on-orange", "--orange"],
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

const localPairs = {
  "graphite-lime": [
    ["filter-label/card", "#98a192", "#151815"],
    ["input-text/input", "#f1f4ec", "#0c0e0c"],
    ["chip/chip-bg", "#d7ff5e", "#232819"],
    ["table-head/head", "#9da796", "#0e110e"],
    ["table-cell/card", "#c2c8bc", "#101210"],
    ["selected-concept/selected", "#f1f4ec", "#1c2417"],
    ["detail-title/detail", "#f1f4ec", "#181c15"],
    ["detail-label/detail", "#98a192", "#181c15"],
    ["detail-note/note", "#98a192", "#191c17"],
    ["detail-btn/button", "#f1f4ec", "#151815"],
    ["page-btn/button", "#c2c8bc", "#151815"],
    ["mobile-title/mobile-card", "#f1f4ec", "#101210"],
    ["mobile-meta/mobile-card", "#8f988b", "#101210"],
    ["sheet-title/sheet", "#f1f4ec", "#0f120f"],
    ["state-label/card", "#8f988b", "#161916"],
    ["state-input/input", "#f1f4ec", "#0c0e0c"],
    ["state-error/error-soft", "#ff8178", "#2a1b19"],
    ["state-success-title/positive-soft", "#f1f4ec", "#1d2720"],
    ["state-success-amount/positive-soft", "#ff9a8c", "#1d2720"],
    ["state-success-meta/positive-soft", "#8f988b", "#1d2720"],
  ],
  "color-finance": [
    ["filter-label/card", "#635c6d", "#f8f2ea"],
    ["input-text/input", "#26232b", "#fffdf9"],
    ["chip/chip-bg", "#5947c4", "#eee9fb"],
    ["table-head/head", "#635c6d", "#f4eef8"],
    ["table-cell/card", "#494451", "#fffdf9"],
    ["selected-concept/selected", "#26232b", "#eee9fb"],
    ["detail-title/detail", "#26232b", "#f6f0fa"],
    ["detail-label/detail", "#635c6d", "#f6f0fa"],
    ["detail-note/note", "#635c6d", "#f6f1fc"],
    ["detail-btn/button", "#26232b", "#fffdf9"],
    ["page-btn/button", "#494451", "#fffdf9"],
    ["mobile-title/mobile-card", "#26232b", "#fffdf9"],
    ["mobile-meta/mobile-card", "#635c6d", "#fffdf9"],
    ["sheet-title/sheet", "#26232b", "#f6f0fa"],
    ["state-label/card", "#635c6d", "#fffdf9"],
    ["state-input/input", "#26232b", "#fffdf9"],
    ["state-error/error-soft", "#a23b3b", "#fbeaea"],
    ["state-success-title/positive-soft", "#26232b", "#e5f1ea"],
    ["state-success-amount/positive-soft", "#a33b34", "#e5f1ea"],
    ["state-success-meta/positive-soft", "#635c6d", "#e5f1ea"],
  ],
  "pastel-editorial": [
    ["filter-label/card", "#615868", "#fffdf8"],
    ["input-text/input", "#17151a", "#fffdf8"],
    ["chip/chip-bg", "#17151a", "#f8ecb4"],
    ["table-head/head", "#514958", "#fffdf8"],
    ["table-cell/card", "#3d3742", "#fffdf8"],
    ["selected-concept/selected", "#17151a", "#e9e0f6"],
    ["detail-title/detail", "#17151a", "#e2d5ef"],
    ["detail-label/detail", "#574e5c", "#e2d5ef"],
    ["detail-note/note", "#3d3742", "#f8ecb4"],
    ["detail-btn/button", "#17151a", "#fffdf8"],
    ["page-btn/button", "#17151a", "#fffdf8"],
    ["mobile-title/mobile-card", "#17151a", "#fffdf8"],
    ["mobile-meta/mobile-card", "#615868", "#fffdf8"],
    ["sheet-title/sheet", "#17151a", "#e2d5ef"],
    ["state-label/card", "#615868", "#fffdf8"],
    ["state-input/input", "#17151a", "#fffdf8"],
    ["state-error/error-soft", "#96352f", "#fbe8e5"],
    ["state-success-title/positive-soft", "#17151a", "#e2efe6"],
    ["state-success-amount/positive-soft", "#a33b34", "#e2efe6"],
    ["state-success-meta/positive-soft", "#615868", "#e2efe6"],
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

async function inspect(url, key, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(180);
  const data = await page.evaluate(({ tokenNames }) => {
    const s = getComputedStyle(document.documentElement);
    const v = (n) => s.getPropertyValue(n).trim();
    const out = {
      theme: document.documentElement.dataset.theme,
      layout: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, scrollHeight: document.documentElement.scrollHeight },
      tokens: {},
      fonts: [],
      smallControls: [],
    };
    for (const n of tokenNames) out.tokens[n] = v(n);
    for (const el of document.querySelectorAll("body *")) {
      const own = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent.trim()).join(" ").trim();
      if (!own) continue;
      const st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") continue;
      const size = parseFloat(st.fontSize);
      if (size < 12 && !el.classList.contains("brand-sub")) out.fonts.push({ size, cls: String(el.className).slice(0, 48), text: own.slice(0, 44) });
    }
    out.fonts = out.fonts.slice(0, 25);
    for (const el of document.querySelectorAll("button, select, input, textarea, .page-btn, .filter-toggle, .icon-btn, .menu-btn, .mobile-theme")) {
      const st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.height < 44) out.smallControls.push({ tag: el.tagName, cls: String(el.className).slice(0, 36), h: Number(r.height.toFixed(1)), label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 28) });
    }
    out.smallControls = out.smallControls.slice(0, 25);
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const st = getComputedStyle(el);
      return { color: st.color, background: st.backgroundColor, size: st.fontSize, text: el.textContent.trim().slice(0, 42) };
    };
    out.computed = {
      filterLabel: pick(".filter-main .field > label"),
      tableHead: pick(".mov-table th"),
      tableCell: pick(".mov-table td"),
      selected: pick(".mov-row.is-selected"),
      detailTitle: pick(".detail-head h2"),
      detailNote: pick(".detail-note"),
      mobileCard: pick(".mov-mobile-card h3"),
      stateHeading: pick(".state-card h2"),
      stateInput: pick(".state-form .input"),
      stateSuccess: pick(".state-success"),
    };
    return out;
  }, { tokenNames: tokenPairs.flatMap((p) => [p[1], p[2]]) });

  const ratios = {};
  for (const [name, fg, bg] of tokenPairs) {
    const r = ratio(data.tokens[fg], data.tokens[bg]);
    if (r !== null) ratios[name] = r;
  }
  for (const [name, fg, bg] of (localPairs[data.theme] || [])) {
    ratios["local-" + name] = ratio(fg, bg);
  }
  const result = { key, theme: data.theme, layout: data.layout, errors, ratios, computed: data.computed, fontCount: data.fonts.length, smallControlCount: data.smallControls.length };
  report.pages.push(result);
  if (data.fonts.length) report.fonts.push({ key, theme: data.theme, elements: data.fonts });
  if (data.smallControls.length) result.smallControls = data.smallControls;
  await page.close();
  return result;
}

const movUrl = (theme) => "file://" + join(here, "movimientos-candidatos.html") + "?theme=" + theme;
const statesUrl = (theme) => "file://" + join(here, "estados-candidatos.html") + "?theme=" + theme;

for (const theme of themes) {
  await inspect(movUrl(theme), `movimientos-1440-${theme}`, { width: 1440, height: 1000 });
}
await inspect(movUrl("graphite-lime"), "movimientos-820-graphite-lime", { width: 820, height: 1180 });
await inspect(movUrl("graphite-lime"), "movimientos-390-graphite-lime", { width: 390, height: 844 });
await inspect(movUrl("color-finance"), "movimientos-390-color-finance", { width: 390, height: 844 });
for (const theme of themes) {
  await inspect(statesUrl(theme), `estados-1440-${theme}`, { width: 1440, height: 1000 });
}
await inspect(statesUrl("graphite-lime"), "estados-390-graphite-lime", { width: 390, height: 844 });

// Interactions: theme switching in Movimientos.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(movUrl("graphite-lime"), { waitUntil: "load" });
  const switches = [];
  for (const option of themes) {
    await page.selectOption(".topbar .theme-select", option);
    await page.waitForTimeout(50);
    const s = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    switches.push({ option, ...s, ok: s.theme === option && s.sw === s.cw });
  }
  report.interactions.push({ test: "movimientos-selector-escritorio", switches });
  await page.close();
}

// Interactions: mobile selection, detail sheet, filters and theme select.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(movUrl("graphite-lime"), { waitUntil: "load" });
  await page.locator('.mobile-list [data-movement="318"]').click();
  await page.waitForTimeout(160);
  const sheetOpen = await page.locator("[data-detail-sheet]").evaluate((el) => el.classList.contains("is-open"));
  const concept = await page.locator('.detail-sheet-panel [data-field="concepto"]').textContent();
  await page.locator("[data-close-detail]").click();
  await page.waitForTimeout(80);
  const sheetClosed = await page.locator("[data-detail-sheet]").evaluate((el) => !el.classList.contains("is-open"));
  await page.locator("[data-filter-toggle]").click();
  await page.waitForTimeout(80);
  const filtersOpen = await page.locator(".filter-card").evaluate((el) => el.classList.contains("filters-open"));
  const tipoVisible = await page.locator("#tipo").isVisible();
  const options = await page.$$eval(".mobile-theme .theme-select option", (els) => els.map((e) => e.value));
  report.interactions.push({ test: "movimientos-movil", sheetOpen, concept, sheetClosed, filtersOpen, tipoVisible, options, ok: sheetOpen && concept?.includes("Nómina") && sheetClosed && filtersOpen && tipoVisible && options.length === 3 });
  await page.close();
}

// Interactions: states theme switching.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(statesUrl("graphite-lime"), { waitUntil: "load" });
  const switches = [];
  for (const option of themes) {
    await page.selectOption(".topbar .theme-select", option);
    await page.waitForTimeout(50);
    const s = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    switches.push({ option, ...s, ok: s.theme === option && s.sw === s.cw });
  }
  const formFields = await page.locator(".state-form--movement .field").count();
  report.interactions.push({ test: "estados-selector-y-formulario", switches, formFields, ok: switches.every((s) => s.ok) && formFields >= 9 });
  await page.close();
}

writeFileSync(join(here, "qa-movimientos.json"), JSON.stringify(report, null, 2));
await browser.close();

const failures = [];
for (const page of report.pages) {
  for (const [name, r] of Object.entries(page.ratios)) {
    if (r < 4.5) failures.push({ page: page.key, name, r });
  }
}
console.log("failures", failures);
console.log("layouts", report.pages.map((p) => ({ key: p.key, ...p.layout, errors: p.errors, fonts: p.fontCount, small: p.smallControlCount })));
console.log("interactions", report.interactions);
