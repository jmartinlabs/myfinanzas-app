# UI · Casa de cuentas 1A — progreso

**Estado:** implementación local de 1A completa; PR #364 publicada; CI pendiente y QA independiente pendiente.
**Base:** `origin/test` `bff714e` — Graphite Lime 1A integrado (#356).
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
| Matriz completa de 5 pantallas × Casa | Pendiente | No ejecutada en 1A |
| QA independiente | Pendiente | Requiere revisor separado |
| PR y CI remota | Parcial | PR #364; CI en curso |

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
- La matriz AA específica de Casa se limita a los pares críticos y a la pantalla de Saldos; no se ha ejecutado la matriz completa de cinco pantallas.
- La suite E2E completa se ejecutó: 75/78. Los 3 fallos son de restauración macOS y una aserción de teclado de Deudas; no se han atribuido a Casa. CI Linux y QA independiente siguen pendientes.
- No hay QA independiente; la CI remota de #364 está en curso y la de #363 ya pasó.
- No se ha fusionado ni desplegado nada.

## Siguiente acción

Esperar CI de #364, resolver cualquier fallo atribuible a 1A y solicitar QA independiente. Después, proponer el alcance de 1B (Inicio) sin empezarlo hasta revisión de 1A.
