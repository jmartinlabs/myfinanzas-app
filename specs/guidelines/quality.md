# Quality guidelines

## Prerrequisitos y comandos actuales
Desde la raíz del repositorio: Bun 1.4.3; Python 3.10+ para tooling de plantilla.
No se requieren paquetes Python ni servicios externos. Chromium es necesario para E2E;
CLI age/age-keygen es obligatoria para pruebas de copia/restauración.

| Comando | Resultado esperado |
| --- | --- |
| bun install --frozen-lockfile | Dependencias según bun.lock sin modificarlo |
| bun run dev | API y Vite en loopback; solo datos ficticios |
| bun run typecheck | TypeScript sin errores en apps, pruebas y configuraciones |
| bun run build | Cliente estático en apps/web/dist; no despliega ni empaqueta servidor |
| bun run test | Integración Saldos/acceso/copias/concurrencia; cifra vigente en testplan |
| bun run test:e2e | Recorrido E1.1 real a 390/1440, MFA y restauración aislada |
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

## Cobertura actual E1.1
[Bun integración y Playwright](../01-saldos-control-testplan.md) trazan los 43 criterios.
API/SQLite: datos exactos, estados, S000/IDs, revisión/idempotencia/rollback/FK, MFA,
replay/recuperación/sesiones/CSRF, copias cifradas y fallos. Dos procesos prueban reserva
atómica y escrituras WAL concurrentes; dos conexiones prueban revisión obsoleta.
Fixtures financieros deterministas; factores se generan aleatoriamente y nunca se publican.

Playwright inicia servidores aislados con base de archivo ficticia en .local/e2e, sin
bypass de acceso. Navega las tres pantallas, errores/carga/vacío/reintento y conflictos,
opera switches/menú con teclado, revisa tema claro y ausencia de overflow; snapshot real
se restaura y sirve en otro Effect HTTP loopback, verifica MFA y lectura desde esa copia.
La intercepción de respuestas solo modela estados transitorios; escrituras y restauración
usan servidores reales. Las capturas ficticias artifacts/e1-1/*.png se inspeccionan.
No guardar trazas/storageState con credenciales ni subir .local/DB/claves como artifacts.

AC-30/31 son contratos de motores posteriores, no cálculos implementados. AC-38 cubre
No disponible sin maestro; su integración futura no está probada. Fixtures de impacto
no prueban consultas a módulos futuros. No scheduler/poda ni RPO/RTO de producción.

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
Bun Test (age instalado), instalación de Chromium y Playwright. Solo sube las capturas ficticias de
artifacts/e1-1/*.png, con retención de siete días; no bases ni archivos de entorno.
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
