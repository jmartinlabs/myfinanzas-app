# UI · Casa de cuentas 1A — test plan

**Base:** `034831f` (Graphite Lime 1A #356 y cierre documental #357/#362).
**Rama:** `feat/ui-casa-1a`.
**Estado:** evidencia local; QA independiente y CI remota pendientes.

## Criterios

| ID | Criterio | Comprobación | Resultado |
|---|---|---|---|
| CASA1A-01 | `casa` es la quinta apariencia y la última del catálogo | `bun test apps/web/test/themes.test.ts` | PASS |
| CASA1A-02 | Casa declara los mismos 66 tokens que los cuatro temas | `themes.test.ts` paridad de nombres | PASS |
| CASA1A-03 | Los pares AA críticos de Casa pasan | `themes.test.ts`, `ui-dev07-tokens.test.ts` | PASS |
| CASA1A-04 | El selector se llama «Apariencia» y muestra 5 opciones | `theme-casa.spec.ts`, `theme-graphite.spec.ts` | PASS |
| CASA1A-05 | Seleccionar Casa aplica `data-theme="casa"` y la paleta | `theme-casa.spec.ts` | PASS |
| CASA1A-06 | La preferencia persiste tras recarga en `mf-theme` | `theme-casa.spec.ts` | PASS |
| CASA1A-07 | Casa se aplica antes de React | `theme-casa.spec.ts` | PASS |
| CASA1A-08 | Un valor desconocido cae a `dark-s` | `theme-casa.spec.ts` | PASS |
| CASA1A-09 | Newsreader e IBM Plex Sans se cargan y se usan | `theme-casa.spec.ts` | PASS |
| CASA1A-10 | Sin overflow a 1440×1000 y 390×844 en Saldos | `theme-casa.spec.ts` | PASS |
| CASA1A-11 | Sin errores de consola en el flujo de tema | `theme-casa.spec.ts` | PASS |
| CASA1A-12 | Los cuatro temas actuales conservan su selección y colores | `theme.spec.ts`, `theme-graphite.spec.ts` | PASS |
| CASA1A-13 | Sin `data-experience`, `mf-experience` ni segundo arranque | Revisión de diff | PASS |
| CASA1A-14 | Sin cambios de API, rutas ni contratos | `bun run typecheck`; diff revisado | PASS |
| CASA1A-15 | La suite web existente sigue pasando | `bun test apps/web/test` | PASS (115) |
| CASA1A-16 | La matriz completa AA de Casa en 5 pantallas | `bunx playwright test tests/e2e/ui-dev07.spec.ts` | PASS (7/7; 10 capturas Casa base + 5 críticas) |
| CASA1A-17 | Regresión visual de las 4 apariencias en 5 pantallas | Matriz DEV-07 con light/dark/hybrid/casa | PASS |
| CASA1A-18 | QA independiente | Revisor separado | PASS: APTO, ver `ui-casa-1a-qa.md` |
| CASA1A-19 | CI remota | PR #364, perfil `critical` | PENDING (head final) |
| CASA1A-20 | Suite E2E completa local macOS | `bun run test:e2e` | 75 pass / 3 fail; 2 restore macOS + 1 flake Deudas |
| CASA1A-21 | Suite E2E completa Linux | Playwright en contenedor Linux | PASS 78/78 (5,5m) |

## Comandos

```bash
bun install --frozen-lockfile
bun test apps/web/test
bun run typecheck
bun run build
bunx playwright test tests/e2e/theme.spec.ts tests/e2e/theme-graphite.spec.ts tests/e2e/theme-casa.spec.ts
bunx playwright test tests/e2e/theme-casa.spec.ts
```

## Evidencia visual

- `artifacts/theme/casa-1440.png`: Saldos, 1440×1000, página completa.
- `artifacts/theme/casa-390.png`: Saldos, 390×844, página completa.
- Capturas base: `light-s`, `dark-s`, `hybrid-s`, `graphite-lime` a 1440/390.
- Inspección visual: tipografía serif en títulos, sans en UI, mono en cifras/etiquetas; sin overflow; tabla y formulario heredan los tokens Casa sin cambios de estructura.

## Pendiente antes de merge

1. Ejecutar la matriz AA de Casa en Inicio, Movimientos, ficha, formulario y cierre.
2. Revisar capturas a 1440/390 de las cinco pantallas.
3. Ejecutar la suite E2E completa o justificar el subconjunto.
4. QA independiente sobre el mismo SHA.
5. CI remota verde.
