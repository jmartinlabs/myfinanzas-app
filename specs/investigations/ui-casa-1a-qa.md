# UI · Casa de cuentas 1A — informe de QA

**Candidato:** `4682fa1` (contenido funcional; head final tras rebase: `a10f96d`).
**Base:** `034831f`; actualizado después a `origin/test` `1d288c5` sin cambios funcionales ajenos.
**PRs:** #363 (documental) y #364 (implementación), separadas.
**Veredicto:** **APTO para 1A**, sin bloqueantes. No autoriza merge ni 1B.

## 1. Corrección de la afirmación anterior

La CI `required` de #364 se ejecutó con **perfil `critical`**: valida instalación, baseline y pruebas de API; **no ejecuta la suite E2E completa**. La afirmación anterior de que la CI había ejecutado el E2E completo en Linux era incorrecta y queda sustituida por:

- CI `required`: PASS (perfil critical).
- E2E completo en Linux: PASS 78/78, ejecución separada en contenedor Linux (ver §3).

## 2. Matriz AA de Casa

`bunx playwright test tests/e2e/ui-dev07.spec.ts` con `DEV07_THEMES = light-s, dark-s, hybrid-s, casa`:

- **7/7 tests PASS**.
- 5 pantallas: Inicio, Movimientos, ficha de Saldo, formulario de Saldo y Cierre.
- 2 anchos: 1440×1000 y 390×844; 720×500 para equivalencia de zoom.
- 40 capturas base (5 × 4 apariencias × 2 anchos) y 20 críticas.
- Casa: 10 capturas base y 5 críticas, en `artifacts/ui-dev07/base/*casa*` y `critical/*casa*`.
- Se comprueban contraste de texto/componentes, texto funcional ≥ 12 px, objetivos ≥ 44 px, overflow, foco, teclado y movimiento reducido.

## 3. E2E completo en Linux

Contenedor Linux (Podman, Debian, Bun 1.4.3, Node 20, Chromium Playwright, `age`):

```text
node node_modules/@playwright/test/cli.js test
  78 passed (5.5m)
```

Incluye `deudas-completa.spec.ts`, `ui-dev07.spec.ts` con Casa y las 78 pruebas de la suite. Sin fallos.

## 4. Fallos locales macOS y verificación contra la base

### 4.1 Restauración

`catalog.spec.ts` y `movimientos.spec.ts` fallan al arrancar `restore-server` en macOS:

```text
Failed to open library "libc.so.6"
at apps/api/src/private-state.ts:219
```

Es una limitación del entorno macOS (`dlopen` de `libc.so.6`), no del código de Casa. En Linux el mismo flujo pasa.

### 4.2 Teclado de Deudas

- Base `034831f` sin Casa: **5/5 PASS** con `--repeat-each=5`.
- Rama Casa: **3/5 PASS**; 2 fallos intermitentes al pulsar `Space` sobre `Condiciones informativas`, tras `shot()` y con `aria-expanded=true`.
- El test se ejecuta con `dark-s`, no con Casa; `casa.css` solo tiene selectores `:root[data-theme="casa"]` y no cambia el componente de Deudas.
- Con traza de foco, el botón conserva el foco y `Space` cierra correctamente; el fallo es de sincronización del test tras la captura, no de comportamiento funcional.
- En Linux, el mismo test pasa dentro de 78/78.

**Conclusión:** se descarta como regresión funcional de Casa; queda como **riesgo residual de test flaky** en macOS.

## 5. QA independiente

Revisión independiente del diff `034831f..4682fa1`:

- **Veredicto: APTO**, sin bloqueantes.
- Sin regresiones en las cuatro apariencias.
- `casa.css`: 91 reglas, todas bajo `:root[data-theme="casa"]`; solo los `@font-face` son globales.
- Sin secretos, datos reales, cambios de API/rutas/contratos ni `data-experience`/`mf-experience`.
- Observaciones no bloqueantes: higiene de afirmaciones de CI (corregida aquí) y flake local de Deudas (descartado en Linux).

## 6. Alcance y límites

- 1A es base visual: no cambia Inicio, Movimientos, navegación, formularios ni composición.
- 1B no iniciado.
- Señal no iniciada.
- Sin merge ni despliegue.
- La matriz AA no sustituye una auditoría WCAG completa ni una revisión humana externa.

## 7. Evidencia

- `bun test apps/web/test`: 115 pass.
- `bun run typecheck`: exit 0.
- `bun run build`: exit 0.
- `bunx playwright test theme.spec.ts theme-graphite.spec.ts theme-casa.spec.ts`: 6 pass.
- `bunx playwright test ui-dev07.spec.ts`: 7 pass.
- Linux full E2E: 78 pass.
- Capturas Casa: `artifacts/theme/casa-1440.png`, `casa-390.png`, `comparison-1440.png`; matriz en `artifacts/ui-dev07/`.
