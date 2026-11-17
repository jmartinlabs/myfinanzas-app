# Aurora · sexta apariencia — progreso de implementación

**Issue:** [#489](https://github.com/jmartinlabs/myfinanzas-app/issues/489)
**Autorización:** decisiones **D1–D5** aprobadas por el usuario el 2026-11-17.
**Rama:** `feat/aurora-6th-theme` · **Base:** `origin/test` `0218de4`
**Estado:** implementación completa en local; PR abierta hacia `test`. Sin merge ni despliegue.

## Alcance ejecutado

| Archivo | Cambio |
| --- | --- |
| `apps/web/public/themes.css` | bloque `:root[data-theme="aurora"]` con los 66 tokens |
| `apps/web/src/themes.ts` | entrada `aurora` al final del catálogo |
| `apps/web/public/theme-boot.js` | `aurora` en la lista `known` |
| `apps/web/src/aurora.css` | capa de identidad nueva, solo presentación |
| `apps/web/src/style.css` | `@import "./aurora.css";` aditivo |
| `apps/web/test/themes.test.ts` | catálogo de 6, paridad de 66 tokens, AA de Aurora |
| `apps/web/test/aurora-visual.test.ts` | guarda de aislamiento, sin layout, sin animación |
| `apps/web/test/ui-dev07-tokens.test.ts` | `aurora` en `THEMES` |
| `tests/e2e/theme-aurora.spec.ts` | nuevo: 6 opciones, degradados, persistencia, boot, fallback, 1440/820/390 |
| `tests/e2e/theme-graphite.spec.ts` | conteo 5 → 6 y sexta opción |
| `tests/e2e/theme-casa.spec.ts` | conteo 5 → 6 y sexta opción |
| `specs/ui-specification.md` | enmienda §2.6 y tabla de estado (§0) |
| `specs/guidelines/ui.md` | enmienda Aurora y catálogo de seis opciones |
| `specs/investigations/aurora-2026-11-17/` | progreso y tablero con evidencia del tema integrado |

## Lo que **no** se toca

`dark-s`, `light-s`, `hybrid-s`, `graphite-lime`, `casa`: ni tokens, ni capas CSS, ni
comportamiento. Tampoco DOM, composición, rutas, navegación, datos, API, SQLite, contratos
financieros ni importes.

## Corrección durante la implementación

La primera capa ambiental usaba `0.26` de opacidad en el radial del workspace. Al medir el peor
caso compuesto (radial del fondo + radial turquesa + ambiente) el texto secundario caía a
**4,26:1**, por debajo de AA. Se redujo a `0.12`, que deja el peor caso en **4,76:1**, y se añadió
una guarda unitaria que recompone esos degradados desde el propio CSS y falla si alguien sube las
opacidades.

## Decisión de diseño que conviene registrar

La primera iteración de la capa tradujo los iconos de tipo de movimiento del prototipo
(`content: "↓"/"↗"/"⇄"` sobre `data-tipo`). Se retiró: **Grafito ya los define** para el mismo
selector y duplicarlos habría hecho que Aurora reinterpretara una decisión de otra apariencia
que además vive en una capa exclusiva de su tema. Aurora conserva el contenedor y los colores de
estado, que ya vienen de tokens, y no reimplementa los glifos.

## Verificación ejecutada

| Comprobación | Resultado |
| --- | --- |
| `bun run typecheck` | exit 0 |
| `bun test apps/web/test` | **152 pass, 0 fail** |
| `bun run build` | exit 0; CSS 326,73 kB (38,77 kB gzip) frente a 317,41 kB previos |
| `aurora.css` | 12,5 kB, 0 propiedades de layout, 0 `!important` |
| Peor caso de la luz ambiental (fondo + ambiente compuestos) | texto 9,97:1 · `--muted` **4,76:1** · acento 7,66:1 — guardado por prueba |
| Capturas 6 pantallas × 1440/820/390 | overflow **0 px** en las 18 |
| Capturas de las otras cinco apariencias | overflow 0 px, sin cambios de color de fondo |
| Errores de página en las capturas | ninguno |

## Evidencia

`specs/investigations/aurora-2026-11-17/evidence/`:

- `00-comparativa.jpg` — tablero: prototipo de fase C · Oscuro · Grafito · Aurora, más patrimonio,
  responsive y la fila de no regresión de las otras cuatro apariencias.
- `aurora-{inicio,movimientos,saldos,inversiones,deudas,referencias}-{1440,820,390}.jpg`.
- `dark-s-*`, `graphite-lime-*`, `casa-*`, `light-s-*`, `hybrid-s-*`: Inicio y Movimientos de las
  cinco apariencias previas con el mismo código.

## Pendiente

1. Revisión humana del tablero comparativo (D5).
2. QA independiente del diff completo.
3. Aprobación explícita de merge; ningún merge por inferencia.
