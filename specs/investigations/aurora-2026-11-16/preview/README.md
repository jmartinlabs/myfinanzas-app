# Previsualización de Aurora (material de análisis, no producto)

**No es código de producción.** Nada de este directorio se importa desde la aplicación.

`aurora-preview.css` contiene los 66 tokens candidatos y la capa visual propuesta, todo bajo
`:root[data-theme="aurora"]` / `html[data-theme="aurora"]`. Los scripts lo **inyectan en el
navegador** sobre la app real de `origin/test`, fuerzan `data-theme="aurora"` en el DOM y toman las
capturas; el repositorio y el código servido permanecen intactos.

## Requisitos

```bash
git worktree add /tmp/aurora-wt origin/test
cd /tmp/aurora-wt && bun install --frozen-lockfile
DEMO_PORT=5174 bun run dev:demo      # base DEMO ficticia, sin autenticación
```

`capture.mjs`, `measure.mjs`, `contrast.mjs` y `board.mjs` necesitan `@playwright/test` del
proyecto y su Chromium. El entorno usado fue macOS con Chromium 1248 de Playwright.

## Comandos

```bash
export AURORA_CSS=$PWD/specs/investigations/aurora-2026-11-16/preview/aurora-preview.css

# 18 capturas: 6 pantallas × 1440/820/390, tema Aurora inyectado
THEMES=aurora AURORA_CSS=$AURORA_CSS node specs/investigations/aurora-2026-11-16/preview/capture.mjs

# overflow, degradados activos y ausencia de fugas hacia dark-s
node specs/investigations/aurora-2026-11-16/preview/measure.mjs

# contraste de texto sobre fondos resueltos (los degradados se declaran no resueltos)
node specs/investigations/aurora-2026-11-16/preview/contrast.mjs

# tablero comparativo (prototipo · Oscuro · Grafito · Aurora) en JPG
node specs/investigations/aurora-2026-11-16/preview/board.mjs
```

`capture.mjs` admite `BASE` (por defecto `http://127.0.0.1:5174`), `OUT`, `THEMES`, `ONLY_1440` y
`AURORA_CSS`. `measure.mjs` y `contrast.mjs` apuntan al mismo puerto; si el servidor DEMO escucha en
otro, se ajusta en el archivo.

## Límites

- Los datos son ficticios (DEMO) y no hay autenticación real.
- Chromium solo, un tamaño de ventana por captura, sin lector de pantalla.
- La capa inyectada mide el **lenguaje visual**, no es el CSS final ni sustituye a la QA.
- Las capturas son recortes de viewport (`fullPage: false`) para comparar el pliegue.
