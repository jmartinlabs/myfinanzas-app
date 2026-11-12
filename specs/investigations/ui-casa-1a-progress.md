# UI · Casa de cuentas 1A — progreso

**Estado:** implementación 1A completa; PR #364 publicada; QA independiente **APTO**; CI `critical` pendiente de confirmar en el head final.
**Base inicial:** `034831f`; **head final:** `a10f96d` rebasado sobre `origin/test` `1d288c5`, sin cambios funcionales ajenos. Graphite Lime 1A integrado (#356/#357/#362).
**Rama:** `feat/ui-casa-1a`. **PR:** #364. **Enmienda:** #363.
**Alcance:** quinta apariencia `casa` sobre el sistema de temas existente; sin composición editorial de Inicio (1B), sin Señal.

## Resultado de 1A

- `casa` añadida como quinta entrada de `themeCatalog`, después de Graphite Lime.
- Bloque de 66 tokens cromáticos en `themes.css`; Graphite y los tres temas base intactos.
- Tipografía editorial local (Newsreader + IBM Plex Sans/Mono) y `casa.css` aislado.
- Selector único etiquetado **Apariencia**, con cinco opciones.
- Persistencia en `mf-theme`; `dark-s` sigue siendo el valor inicial.
- Arranque previo a React ampliado a `casa` en `theme-boot.js`.
- Sin `data-experience`, `mf-experience` ni segundo script.
- Sin cambios en Inicio, Movimientos, navegación, formularios, API, rutas ni contratos.

## Tareas

| Tarea | Estado | Evidencia |
|---|---|---|
| Registrar `casa` en catálogo y tipos | Hecho | `apps/web/src/themes.ts` |
| Añadir 66 tokens Casa | Hecho | `apps/web/public/themes.css` |
| Añadir `casa` al arranque | Hecho | `apps/web/public/theme-boot.js` |
| Etiquetar el selector «Apariencia» | Hecho | `apps/web/src/main.tsx` |
| Capa visual aislada | Hecho | `apps/web/src/casa.css` |
| Fuentes locales | Hecho | `apps/web/public/fonts/*` |
| Pruebas de catálogo/tokens/AA | Hecho | `apps/web/test/themes.test.ts`, `ui-dev07-tokens.test.ts` |
| E2E de selección, persistencia, tipografía, 1440/390 y arranque | Hecho | `tests/e2e/theme-casa.spec.ts`; capturas en `artifacts/theme/` |
| Actualizar pruebas existentes al nombre «Apariencia» | Hecho | 16 specs E2E; sin cambios de aserciones funcionales |
| Regresión de los cuatro temas actuales | Hecho | `theme.spec.ts` + `theme-graphite.spec.ts` (6 tests) |
| Matriz completa de 5 pantallas × Casa | Hecho | `ui-dev07`: 7/7; 10 capturas base Casa + 5 críticas |
| QA independiente | Hecho | APTO; ver `ui-casa-1a-qa.md` |
| PR y CI remota | Parcial | PR #364; CI `critical` en curso |

## Evidencia ejecutada

```text
bun test apps/web/test
  115 pass, 0 fail

bun run typecheck
  exit 0

bun run build
  exit 0; CSS 112.74 kB (18.51 kB gzip); JS 898.82 kB (223.22 kB gzip)

bunx playwright test tests/e2e/theme.spec.ts tests/e2e/theme-graphite.spec.ts tests/e2e/theme-casa.spec.ts
  6 pass, 0 fail

bunx playwright test tests/e2e/theme-casa.spec.ts
  2 pass, 0 fail

bun run test:e2e
  75 passed, 3 failed
  Fallos locales no atribuidos a 1A:
  - catalog.spec.ts y movimientos.spec.ts: restore-server no arranca en macOS
    (`libc.so.6` en backup/private-state); entorno Linux/CI pendiente.
  - deudas-completa.spec.ts: aserción de teclado sobre `aria-expanded`; no toca
    archivos de Casa.
```

Capturas:
- `artifacts/theme/casa-1440.png`
- `artifacts/theme/casa-390.png`
- `artifacts/theme/light-s-1440.png`, `dark-s-1440.png`, `hybrid-s-1440.png`, `graphite-lime-1440.png` para comparación.

## Límites declarados

- 1A es una **base visual**, no la composición editorial de Casa. Inicio conserva su estructura; el inspector, la tabla agrupada y la atención llegan en 1B.
- La matriz AA de Casa se ha ejecutado en las cinco pantallas (`ui-dev07`): 7/7 tests, 10 capturas base y 5 críticas. La matriz cubre light/dark/hybrid/casa.
- E2E completo en Linux: **78/78 PASS** (5,5m), incluido Deudas, la suite de temas y la matriz AA.
- La suite E2E completa local en macOS dio 75/78: dos fallos de restauración por `libc.so.6` y un flake de teclado en Deudas. En Linux pasó 78/78; ver `ui-casa-1a-qa.md`.
- No hay QA independiente; la CI remota de #364 está en curso y la de #363 ya pasó.
- No se ha fusionado ni desplegado nada.

## Siguiente acción

Esperar la confirmación de CI `critical` en el head final y presentar #363/#364 para aprobación. No iniciar 1B, Señal, merge ni despliegue.
