import pw from "/Users/josemartin/Projects/myfinanzas-app/node_modules/@playwright/test/index.js";
import { writeFileSync } from "node:fs";
const { chromium } = pw;

const W = "/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/aurora/wt-test/specs/investigations/aurora-2026-11-16";
const PROTO = "../../graphite-lime-design-2026-11-10/phase-c";

function row(title, items) {
  return `<section><h2>${title}</h2><div class="row">${items
    .map((i) => `<figure><figcaption>${i.label}</figcaption><img src="${i.src}"></figure>`)
    .join("")}</div></section>`;
}

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  body { margin:0; background:#0a0d0f; color:#e9eef0; font:14px/1.4 "Inter",system-ui,sans-serif; padding:28px 32px; }
  h1 { font-size:23px; margin:0 0 6px; letter-spacing:-.4px; }
  p.lead { color:#9fb0b6; margin:0 0 26px; max-width:1100px; }
  section { margin-bottom:30px; }
  h2 { font-size:15px; letter-spacing:1.4px; text-transform:uppercase; color:#2be4de; margin:0 0 12px; }
  .row { display:grid; grid-template-columns:repeat(4, 1fr); gap:14px; }
  figure { margin:0; background:#111a1e; border:1px solid #26363c; border-radius:10px; overflow:hidden; }
  figcaption { padding:9px 12px; font-size:12.5px; color:#c8d4d8; border-bottom:1px solid #26363c; }
  img { display:block; width:100%; height:auto; }
</style></head><body>
<h1>MyFinanzas · Aurora — comparativa visual (propuesta, no integrada)</h1>
<p class="lead">Issue #489 · fase Analysis. Capturas reales de la app en <code>origin/test</code> con la base ficticia DEMO a 1440×1000, frente al prototipo de fase C archivado. La columna Aurora es una previsualización inyectada en el navegador, no código de producto.</p>
${row("Inicio · 1440", [
  { label: "Prototipo fase C · origen histórico", src: `${PROTO}/final/shots/dark-inicio.jpg` },
  { label: "App · Oscuro (dark-s)", src: "../shots/dark-s-inicio-1440.jpg" },
  { label: "App · Graphite Lime", src: "../shots/graphite-lime-inicio-1440.jpg" },
  { label: "Aurora · propuesta", src: "../shots/aurora-inicio-1440.jpg" },
])}
${row("Movimientos · 1440", [
  { label: "Prototipo fase C · origen histórico", src: `${PROTO}/shots/movimientos-dark-s-1440-fold.jpg` },
  { label: "App · Oscuro (dark-s)", src: "../shots/dark-s-movimientos-1440.jpg" },
  { label: "App · Graphite Lime", src: "../shots/graphite-lime-movimientos-1440.jpg" },
  { label: "Aurora · propuesta", src: "../shots/aurora-movimientos-1440.jpg" },
])}
${row("Patrimonio · Aurora propuesta", [
  { label: "Saldos", src: "../shots/aurora-saldos-1440.jpg" },
  { label: "Inversiones", src: "../shots/aurora-inversiones-1440.jpg" },
  { label: "Deudas", src: "../shots/aurora-deudas-1440.jpg" },
  { label: "Referencias", src: "../shots/aurora-referencias-1440.jpg" },
])}
${row("Responsive · Aurora propuesta", [
  { label: "Inicio 820", src: "../shots/aurora-inicio-820.jpg" },
  { label: "Inicio 390", src: "../shots/aurora-inicio-390.jpg" },
  { label: "Movimientos 820", src: "../shots/aurora-movimientos-820.jpg" },
  { label: "Movimientos 390", src: "../shots/aurora-movimientos-390.jpg" },
])}
</body></html>`;

writeFileSync(`${W}/boards/comparativa.html`, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1560, height: 1200 } });
await page.goto(`file://${W}/boards/comparativa.html`);
await page.waitForTimeout(1200);
await page.screenshot({
  path: `${W}/boards/comparativa-aurora.jpg`,
  fullPage: true,
  type: "jpeg",
  quality: 84,
});
console.log("board ok");
await browser.close();
