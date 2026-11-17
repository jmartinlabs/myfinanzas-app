import pw from "/Users/josemartin/Projects/myfinanzas-app/node_modules/@playwright/test/index.js";
import { readFileSync } from "node:fs";
const { chromium } = pw;

const css = readFileSync("/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/aurora/aurora-preview.css", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

function ratio(a, b) {
  const lum = (rgb) => {
    const [r, g, bl] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
}

const targets = [
  ["body text", "main p", "color"],
  ["h1", "h1", "color"],
  ["muted meta", ".inicio-source", "color"],
  ["table head cell", "table thead th", "color"],
  ["table cell", "table tbody td", "color"],
  ["badge complete", ".ui-badge", "color"],
  ["primary button", ".primary", "color"],
  ["nav active", ".nav-active", "color"],
  ["sidebar muted", ".brand small", "color"],
  ["eyebrow", ".eyebrow", "color"],
  ["amount", ".ui-amount-value", "color"],
  ["field label", ".ui-field-label", "color"],
];

for (const theme of ["aurora", "dark-s"]) {
  for (const path of ["/inicio", "/movimientos", "/saldos"]) {
    await page.goto("http://127.0.0.1:5174" + path, { waitUntil: "networkidle" });
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    if (theme === "aurora") await page.addStyleTag({ content: css });
    await page.waitForTimeout(300);
    const measured = await page.evaluate((pairs) => {
      const parse = (s) => {
        const m = s.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        return { rgb: parts.slice(0, 3), a: parts.length > 3 ? parts[3] : 1 };
      };
      const bgOf = (el) => {
        let node = el;
        let stack = [];
        while (node && node !== document.documentElement) {
          const cs = getComputedStyle(node);
          if (/gradient/.test(cs.backgroundImage)) return { gradient: true };
          const c = parse(cs.backgroundColor);
          if (c && c.a > 0) {
            stack.push(c);
            if (c.a >= 0.999) break;
          }
          node = node.parentElement;
        }
        if (!stack.length) return { rgb: [9, 17, 21] };
        let base = stack.pop().rgb;
        while (stack.length) {
          const top = stack.pop();
          base = base.map((v, i) => v * (1 - top.a) + top.rgb[i] * top.a);
        }
        return { rgb: base };
      };
      return pairs.map(([label, sel, prop]) => {
        const el = document.querySelector(sel);
        if (!el) return [label, "missing"];
        const cs = getComputedStyle(el);
        const fg = parse(cs[prop]);
        const bg = bgOf(el);
        return [label, fg ? fg.rgb : null, bg];
      });
    }, targets);
    console.log(`\n${theme} ${path}`);
    for (const [label, fg, bg] of measured) {
      if (!fg || typeof fg === "string") { console.log(`  ${label}: ${bg ? "missing" : ""}`); continue; }
      if (bg.gradient) { console.log(`  ${label}: fg=${fg.join(",")} bg=gradient (no resuelto)`); continue; }
      console.log(`  ${label}: ${ratio(fg, bg.rgb)}:1  fg=${fg.join(",")} bg=${bg.rgb.map(Math.round).join(",")}`);
    }
  }
}
await browser.close();
