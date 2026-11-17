/**
 * Tablero comparativo de Aurora (#489) a partir de las capturas.
 *
 * Uso, desde la raíz del repositorio, después de `final-capture.mjs` con el
 * mismo `OUT`:
 *   OUT=/tmp/aurora-shots node specs/investigations/aurora-2026-11-17/prod-board.mjs
 *
 * Escribe `comparativa.html` y `00-comparativa.jpg` en `OUT`. Requiere
 * `@playwright/test` y su Chromium. No modifica el repositorio.
 */
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const OUT = process.env.OUT ?? "artifacts/aurora-489";
const PROTO = "specs/investigations/graphite-lime-design-2026-11-10/phase-c";

function row(title, items) {
  return `<section><h2>${title}</h2><div class="row">${items
    .map(
      (item) =>
        `<figure><figcaption>${item.label}</figcaption><img src="${item.src}"></figure>`,
    )
    .join("")}</div></section>`;
}

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  body { margin:0; background:#0a0d0f; color:#e9eef0; font:14px/1.4 "Inter",system-ui,sans-serif; padding:28px 32px; }
  h1 { font-size:23px; margin:0 0 6px; letter-spacing:-.4px; }
  p.lead { color:#9fb0b6; margin:0 0 26px; max-width:1150px; }
  section { margin-bottom:30px; }
  h2 { font-size:15px; letter-spacing:1.4px; text-transform:uppercase; color:#2be4de; margin:0 0 12px; }
  .row { display:grid; grid-template-columns:repeat(4, 1fr); gap:14px; }
  figure { margin:0; background:#111a1e; border:1px solid #26363c; border-radius:10px; overflow:hidden; }
  figcaption { padding:9px 12px; font-size:12.5px; color:#c8d4d8; border-bottom:1px solid #26363c; }
  img { display:block; width:100%; height:auto; }
</style></head><body>
<h1>MyFinanzas · Aurora — comparativa visual</h1>
<p class="lead">Issue #489. Prototipo de fase C archivado frente a la app real con datos DEMO a 1440×1000: Oscuro, Graphite Lime y Aurora, más patrimonio, responsive y no regresión de las apariencias previas.</p>
${row("Inicio · 1440", [
  { label: "Prototipo fase C · origen histórico", src: `${PROTO}/final/shots/dark-inicio.jpg` },
  { label: "Oscuro (dark-s)", src: `${OUT}/dark-s-inicio-1440.png` },
  { label: "Graphite Lime", src: `${OUT}/graphite-lime-inicio-1440.png` },
  { label: "Aurora", src: `${OUT}/aurora-inicio-1440.png` },
])}
${row("Movimientos · 1440", [
  { label: "Prototipo fase C · origen histórico", src: `${PROTO}/shots/movimientos-dark-s-1440-fold.jpg` },
  { label: "Oscuro (dark-s)", src: `${OUT}/dark-s-movimientos-1440.png` },
  { label: "Graphite Lime", src: `${OUT}/graphite-lime-movimientos-1440.png` },
  { label: "Aurora", src: `${OUT}/aurora-movimientos-1440.png` },
])}
${row("Aurora · patrimonio", [
  { label: "Saldos", src: `${OUT}/aurora-saldos-1440.png` },
  { label: "Inversiones", src: `${OUT}/aurora-inversiones-1440.png` },
  { label: "Deudas", src: `${OUT}/aurora-deudas-1440.png` },
  { label: "Referencias", src: `${OUT}/aurora-referencias-1440.png` },
])}
${row("Aurora · responsive", [
  { label: "Inicio 820", src: `${OUT}/aurora-inicio-820.png` },
  { label: "Inicio 390", src: `${OUT}/aurora-inicio-390.png` },
  { label: "Movimientos 820", src: `${OUT}/aurora-movimientos-820.png` },
  { label: "Movimientos 390", src: `${OUT}/aurora-movimientos-390.png` },
])}
${row("No regresión · apariencias previas", [
  { label: "Claro (light-s)", src: `${OUT}/light-s-inicio-1440.png` },
  { label: "Oscuro (dark-s)", src: `${OUT}/dark-s-inicio-1440.png` },
  { label: "Mixto (hybrid-s)", src: `${OUT}/hybrid-s-inicio-1440.png` },
  { label: "Casa", src: `${OUT}/casa-inicio-1440.png` },
])}
</body></html>`;

writeFileSync(`${OUT}/comparativa.html`, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1560, height: 1200 } });
await page.goto(`file://${process.cwd()}/${OUT}/comparativa.html`);
await page.waitForTimeout(1200);
await page.screenshot({
  path: `${OUT}/00-comparativa.jpg`,
  fullPage: true,
  type: "jpeg",
  quality: 84,
});
console.log("tablero:", `${OUT}/00-comparativa.jpg`);
await browser.close();