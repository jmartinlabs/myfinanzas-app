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
| ./scripts/check-project | Workspaces/Bun, versiones exactas, paquetes privados y límites de imports del navegador |
| ./scripts/check-repository | Historial completo, índice y archivos versionados sin infracciones detectadas |
| ./scripts/test-checks | Pruebas positivas/negativas de los controles nuevos |
| git diff --check | Sin errores de whitespace |

Instalar navegador con `bunx playwright install chromium`. En Codex, la descarga recibió
403; se verificó con Chromium del sistema mediante
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e`.
No omitir E2E silenciosamente si falta el navegador: resolver o registrar el bloqueo.
Las versiones concretas ejecutadas y resultados de STEP 1 están en [bootstrap](../bootstrap.md).
El bootstrap no ha configurado lint ni formateador; typecheck y diff --check no los sustituyen.
STEP 3 usa solo Python estándar y herramientas existentes; no añade dependencias.

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
Su harness conserva sus 18 pruebas válidas y corrupciones aisladas. En STEP 3 se excluyen
node_modules, dist, .local y salidas de pruebas al copiar fixtures, sin eliminar assertions.
Los fixtures siguen incluyendo código, manifests y documentación del proyecto.

## Controles STEP 3 y CI
check-project contrasta .bun-version y packageManager, exige apps/* y private=true en
los paquetes para impedir publicación npm (no controla visibilidad GitHub), verifica
versiones directas exactas, rechaza una lista explícita de ORMs conocidos y detecta
imports de Bun/Node o rutas relativas de apps/api desde código de navegador. El análisis
de imports es léxico, no resuelve aliases, reexports externos ni toda la sintaxis TypeScript;
tipos/build y la revisión manual complementan sus límites. También verifica presencia
de las fases obligatorias de CI, SHAs de acciones e historial completo, y rechaza eventos
pull_request_target o permisos de escritura; es validación léxica, no un parser YAML.

check-repository exige historia Git completa; inspecciona todos los commits alcanzables
desde HEAD, sus mensajes, el índice y los archivos versionados locales. Rechaza rutas
sensibles y enlaces simbólicos pendientes de revisión, contenido SQLite renombrado y
patrones conocidos de secretos. Redacta valores; no es un escáner exhaustivo. Nuevos
archivos deben añadirse al índice antes de la revisión previa al push. Lee historia y
blobs, sin modificarlos. También detecta secretos borrados en commits posteriores.

La CI .github/workflows/validate.yml se activa con push, pull_request y workflow_dispatch.
Usa checkout con historial completo y sin credenciales persistidas, acciones fijadas por
SHA, permisos contents:read y timeout de 15 minutos. Ejecuta los tres controles y sus
regresiones, diff --check y whitespace del commit con git show --check, instalación Bun 1.4.3 con lockfile congelado, tipos, build,
Bun Test, instalación de Chromium y Playwright. Solo sube las capturas ficticias de
artifacts/bootstrap/*.png, con retención de siete días; no bases ni archivos de entorno.
No usa secretos de aplicación, pull_request_target ni permisos de escritura.
No convierte automáticamente los checks en reglas obligatorias de protección de main;
configurar rulesets requiere decisión y permisos administrativos independientes.

No atribuir a GitHub resultados locales: estado de ejecución en [STEP 3](../automated-checks.md).
Un exit 1 esperado dentro de un test negativo no es un fallo de la suite: demuestra que
el control rechaza la infracción; la suite global debe finalizar correctamente.

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
