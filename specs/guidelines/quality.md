# Quality guidelines

## Prerrequisitos y comandos actuales
Desde la raíz del repositorio: Bun 1.4.3; Python 3.10+ para tooling de plantilla.
No se requieren paquetes Python ni servicios externos. Chromium es necesario para E2E.

| Comando | Resultado esperado |
| --- | --- |
| bun install --frozen-lockfile | Dependencias según bun.lock sin modificarlo |
| bun run dev | API y Vite en loopback; solo datos ficticios |
| bun run typecheck | TypeScript sin errores en apps, pruebas y configuraciones |
| bun run build | Cliente estático en apps/web/dist; no despliega ni empaqueta servidor |
| bun run test | 4 pruebas Bun de persistencia/API; 10 aserciones |
| bun run test:e2e | 4 pruebas Playwright: dos flujos por viewport |
| ./scripts/validate-template | Estructura y contratos documentales válidos |
| ./scripts/test-validator | 18 regresiones positivas y negativas del validador |
| git diff --check | Sin errores de whitespace |

Instalar navegador con `bunx playwright install chromium`. En Codex, la descarga recibió
403; se verificó con Chromium del sistema mediante
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e`.
No omitir E2E silenciosamente si falta el navegador: resolver o registrar el bloqueo.
Las versiones concretas ejecutadas y resultados de STEP 1 están en [bootstrap](../bootstrap.md).
El bootstrap no ha configurado lint ni formateador; typecheck y diff --check no los sustituyen.
Añadir herramientas/controles corresponde a STEP 3 o a una necesidad aprobada posterior.

## Cobertura existente
Bun Test: semilla determinista e idempotente, persistencia tras reabrir SQLite,
HTTP leyendo modificaciones reales de la base, lista vacía, 404 y fallo SQL con 500 genérico.
La prueba de archivo elimina su directorio temporal; el resto usa SQLite en memoria.

Playwright inicia y detiene sus servidores; no reutiliza procesos ni la base de desarrollo.
Antes de ejecutarlo, detener solo servidores propios que ocupen los puertos 3001/5173.
Verifica API y UI sin mocks para el catálogo; intercepta respuestas para carga/vacío/error,
y el reintento vuelve a la API real. Comprueba ausencia de errores JS y overflow horizontal.
Capturas generadas e ignoradas: artifacts/bootstrap/catalog-mobile.png y catalog-desktop.png.
Las capturas se inspeccionan visualmente; guardar una imagen no prueba que se haya revisado.

## Comprobaciones heredadas y CI real
El validador revisa estructura, links locales, manifests y contratos de Skills, protocolo
de reanudación, prompt, portabilidad y heurísticas de credenciales. No es un parser completo,
escáner exhaustivo de secretos ni verificador semántico de arquitectura.
Su harness prueba casos válidos y corrupciones aisladas. Actualmente copia el checkout
para cada fixture, incluidos node_modules si existen; puede ser lento con dependencias.
No cambiar sus fixtures ni omitir assertions para simular éxito; su mejora queda para STEP 3.

La CI actual .github/workflows/validate.yml ejecuta solo las dos comprobaciones de plantilla
y git diff --check con Python 3.12. No instala Bun ni ejecuta build, tipos o E2E.
No atribuir a GitHub resultados que solo se ejecutaron localmente. STEP 2 no añade CI.

## Criterios de entrega
Ejecutar checks que correspondan al cambio, investigar fallos y conservar el estado real
(pasado, fallido, omitido o no ejecutado). Cambios documentales: validador y sus regresiones,
links y diff; cambios de app: tipos/build/pruebas y flujos afectados; cambios visuales:
navegador más capturas 390/1440 inspeccionadas. Reusar evidencia vigente cuando no cambia
el comportamiento; no ampliar pruebas sin necesidad. Aceptación fallida o no verificada
impide declarar completada la funcionalidad.

Mantener contexto, evidencia y siguiente acción reanudables. La política completa de
ramas, publicación, revisión del historial y aprobación de merge está en [AGENTS](../../AGENTS.md).
Las reglas económicas requieren especificaciones funcionales revisadas antes del código.
