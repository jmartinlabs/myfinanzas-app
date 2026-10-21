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
| bun run test:e2e | Recorrido E1.1/E1.2/E1.3 real a 390/1440, MFA y restauración aislada |
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


## Cobertura E1.2 en revisión
[AC y resultados 02](../02-clasificacion-testplan.md): 27 criterios actuales y 4 contratos
futuros, sin declararlos motores entregados. Regresión E1.1 conserva sus assertions;
la prueba de versión no compatible ahora usa 999 porque v2 sí está soportada.
Fixture test-support/database-v1.ts congela el inicializador integrado E1.1: prueba
actualización desde una base genuina, no un esquema previo reconstruido a conveniencia.
Pruebas de actualización comparan tablas lógicas antes de nuevas acciones de login;
MFA/sesiones cambian legítimamente al utilizarlos. Capturas e1-2 se publican junto
a e1-1, sin DB, storageState ni factores. No se ha añadido dependencia de pruebas.


## E1.3 local
[Plan y resultados](../03-ciclos-financiados-testplan.md): calendario civil, contratos
puros de referencia (sin fuentes operativas), API protegida, SQLite v2→v3 y dos
procesos, límites exactos EUR, copia age/restauración y regresión de catálogos/acceso.
Playwright añade alta/consulta real y conflicto concurrente a MFA/restauración existentes.
CI publica únicamente PNG ficticios de artifacts/e1-3, junto a entregas anteriores;
no DB, claves, estado de autenticación ni trazas. 21 AC actuales frente a 3 contratos
futuros; no afirmar integración de fuentes, imputación de hechos o cierre aún ausentes.


## E1.4
[29 AC actuales y AC-30–33 futuros](../04-movimientos-testplan.md). Bun añade reglas,
auditoría, idempotencia/concurrencia, upgrade v3 genuino, rollback y age; regresiones
anteriores mantienen comprobación de filas previas, actualizando solo estado derivado
ahora entregado (posición/referencia y versión actual). Pruebas de backups identifican
su esquema real; no snapshots nuevos rebautizados como antiguos.
Playwright incorpora servidor Effect/SQLite test aislado, con mismo acceso normal, y
restore real a segundo servidor; sin bypass/fixture HTTP. Mocks solo red/error/401 para
presentación, escrituras exitosas siempre reales. Capturas 390/1440 inspeccionadas;
CI adjunta exclusivamente PNG e1-4 al artifact heredado e1-1-screenshots, 7 días.
No ejecutar screenshots desde pantallas que exhiban factores. No afirmar AC futuros
probados por dobles aislados de protección. No relajar checks para hacer pasar CI.


## E1.5 — evidencia actual
[30 criterios actuales y 3 contratos futuros](../05-transferencias-referencias-testplan.md).
R1–R9 en referencias.test.ts prueban Transferencia, matriz Q2, catálogos, idempotencia,
concurrencia, impacto clasificatorio compatible/incompatible y upgrade v4 genuina.
Los 44 tests anteriores se conservan; solo cambian expectativas de versión actual,
mensajes de dependencia ahora E3 y etiquetas de copias creadas por la versión actual.
La fixture v4 congelada evita fingir continuidad renombrando una base nueva.

Playwright reutiliza el recorrido E1.4 y añade transferencias.ts, sin duplicar onboarding,
seguridad o servidor. Éxitos siempre contra Effect/SQLite reales; intercepta error transitorio
para presentación, retiene/libera carga real y usa respuesta perdida tras commit real en
regresión E1.4. Catálogos, dinero, correcciones y restore no se sustituyen por mocks.
Restaura E1.5 en el servidor aislado existente con login/TOTP, compara hechos completos,
identidades/auditorías y posiciones, y consulta la Referencia restaurada por UI.
CI solo adjunta PNG ficticios e1-5 al artifact heredado, junto a entregas anteriores,
retención 7 días. No factores, DB, auth.key, trazas o storageState. Sin nueva dependencia.
Un fallo local o remoto nunca se reclasifica como futuro ni se oculta mediante retries.


## Validación de la entrega 31

Añadir `production.test.ts` a la suite existente, sin omitir regresiones. P1–P11
cubren apertura cruzada por CLI, origen y migración, rutas/UID/clave, dos procesos,
fallos ENOSPC inyectados, SIGKILL antes/después de publicación, MFA/API productiva,
backup cifrado, corrupción y restore. UID ajeno se simula por respuesta de stat;
la operación rootless real del VPS sigue fuera de esta evidencia local.
Los 33 AC y evidencias de ejecución se mantienen en el testplan 31. Un rechazo
esperado de fixture no es fallo de suite. Mantener Playwright 390/1440, contraste
y restauración, sin factores en artefactos. Bun/lockfile y dependencia age vigentes;
la publicación de estado nuevo requiere Linux/glibc por renameat2 sin reemplazo.

Ver [contrato 31](../31-sqlite-produccion-specification.md) y
[evidencia](../31-sqlite-produccion-testplan.md).
