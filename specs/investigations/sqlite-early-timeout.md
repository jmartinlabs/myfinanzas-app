# SQLite v6 — busy_timeout antes de la primera lectura efectiva
Status: IMPLEMENTED LOCALLY — revisión/merge pendientes; no entrega E1.6.
Base: main 5a9f057cb89e60ef9afc5d72e0646c1d5b6ce5ff. Autorización expresa del
usuario tras auditoría de Álex, 2026-10-22 (Europe/Madrid).

## Cambio mínimo y seguridad
- database.ts: configurar PRAGMA busy_timeout=3000 al entrar en el try de la
  conexión demo/memoria, antes de inspectIdentity. Dentro del manejo de errores:
  si falla se conserva cierre y propagación de error.
- private-state.ts/openProductionConnection: mismo PRAGMA tras construir la
  conexión efectiva, antes de su primera consulta. Afecta a sus aperturas readwrite
  y readonly. Se conservan verifyProductionFiles y la sonda persistente inmutable
  ANTES de abrir esta conexión, así como las verificaciones de inode, sidecars,
  pareja/identidad y clave sobre la conexión real. El PRAGMA solo configura la
  espera de esta conexión; no escribe datos ni cambia journal_mode.
- Sin tocar persistentIdentity/immutable=1, preparación de esquema, BEGIN IMMEDIATE,
  migraciones, backup/restore, inicialización productiva, finanzas, MFA ni workflows.
  Los PRAGMA posteriores siguen iguales. No hace falta quitar su asignación repetida:
  añadirla temprano conserva la configuración y el alcance de estas dos aperturas.
- No dependencias nuevas de aplicación, retries, sleeps ni mayor timeout. La
  conexión auxiliar de inicialización es privada/no publicada; snapshots y restore
  usan destinos propios. No se ha demostrado que necesiten otro orden y no cambian.

## Pruebas añadidas — sqlite-opening.test.ts
| ID | Comprobación reproducible | Resultado esperado |
| --- | --- | --- |
| B1 | Espías sobre métodos de conexiones SQLite reales; demo, memoria, producción runtime y readonly; sondas separadas | Primera llamada SQL de cada una: PRAGMA busy_timeout=3000; sondas solo lecturas |
| B2 | Commit confirmado en WAL y SIGKILL del escritor; consulta inmutable en proceso separado demuestra que la tabla aún no existe en el archivo principal; quitar solo SHM con todos los procesos cerrados | Reabrir demo y producción recupera la fila 731, integrity_check OK, FK vacías, timeout 3000 |
| B3 | Otro proceso Python/fcntl bloquea byte 122 (RECOVER) del WAL-index Unix; barrera por pipe antes de la primera lectura efectiva | SQLite real devuelve BUSY_RECOVERY/261 sin política temprana; con apertura actual mantiene el mismo error al agotar los 3000 ms; tras liberar, dato recuperado |
| B4 | Mismo bloqueo real, observar /proc/PID/wchan=hrtimer_nanosleep y liberar explícitamente; inicializador productivo en proceso separado como CLI | Demo y producción salen 0, antes de 3000 ms, con dato conservado al reabrir |

B3 anterior es una reproducción mínima de la lectura inicial sin política de espera,
no una ejecución completa del producto antiguo. No se inyectan códigos SQLite.
Antes/después usa operaciones reales del mismo WAL; no demuestra equivalencia con la
CI histórica. La exclusión del lock puede seguir acabando en BUSY_RECOVERY al vencer
el plazo: esta corrección no promete éxito indefinido ni cubre todos los BUSY.

Las barreras solo instrumentan las pruebas: stdin/stdout señalan conexión preparada,
lock tomado y autorización de lectura; el bloqueo del SO se mantiene en otro PID.
B4 cede el event loop con setImmediate mientras observa el estado real del hilo,
hasta el límite existente de 3000 ms; no usa una demora arbitraria para liberar el
lock ni reintenta SQL. Python 3 estándar, /proc y locks de Unix son herramientas
exclusivas de prueba; CI Ubuntu y el runtime Linux v6 ya son la plataforma prevista.
No se amplían timeouts de pruebas existentes ni se alteran R6/E1.4.

## Evidencia local y límites
Comandos: Bun 1.4.3; añadir al PATH age/age-keygen. Python3 y Chromium disponibles.
```sh
NODE_ENV=test bun test apps/api/src/sqlite-opening.test.ts
bun run test
bun run typecheck
bun run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e
./scripts/validate-template
./scripts/test-validator
./scripts/check-project
./scripts/test-checks
./scripts/check-repository
git diff --check
```
- B1 control negativo: retirar temporalmente ambas asignaciones tempranas hace
  fallar la prueba (exit1, 0 PASS/1 FAIL, cuatro conexiones esperadas frente a cero).
  Se restauran los archivos antes de las validaciones de la corrección.
- Desarrollo de B2–B4: se corrigieron errores del montaje (espía de constructor no
  observa imports estáticos, stream ya consumido, entorno del hijo no explícito).
  No fueron correcciones de producto. El lock holder no trunca un SHM existente.
- Un prototipo de B4 con inicialización productiva dentro del proceso padre y
  posterior recuperación/checkpoint por otro PID produjo IOERR_SHORT_READ al
  reabrir en el padre. Una lectura independiente posterior dio integrity_check OK
  y conservó la fila. Su causa no está identificada; no se declara corregida ni se
  atribuye a SQLite/producto/entorno. B4 usa el ciclo previsto de inicializador CLI
  que termina y proceso runtime separado, conservando las aserciones de reapertura
  y datos. Esta evidencia NO valida reutilizar el inicializador dentro de un proceso
  de servidor persistente; no se ha introducido ningún cambio para ese escenario.
  Reproducción del prototipo: en B4 sustituir únicamente el bloque Bun.spawnSync del
  inicializador por initializeProduction() en el padre y ejecutar
  NODE_ENV=test bun test apps/api/src/sqlite-opening.test.ts --test-name-pattern '^SQLite B4:'.
  Mantener la reapertura final sin capturar su excepción; no considerar su fallo un
  resultado aprobado ni aplicar una corrección funcional por hipótesis.
- Primera suite completa se lanzó sin age en PATH: 75 PASS/12 FAIL/1094 assertions.
  Los fallos de copias fueron ENOENT. Se conserva el resultado; repetición justificada
  con el prerrequisito disponible, no por ocultar una contención intermitente.
- Suite definitiva sobre el código final: **87 PASS / 0 FAIL / 1381 assertions**,
  ocho archivos, 23.66s. Las cuatro pruebas nuevas aportan 90 assertions. Incluye
  E1.4 concurrente, R6, P1–P18/S1–S7, upgrades genuinos, rollback, MFA y restauración age.
- B3 definitivo: antes **0.434 ms**, después **3005.139 ms**, ambos BUSY_RECOVERY/261
  mientras el bloqueo sigue tomado. Al liberarlo, la recuperación conserva la fila.
- Typecheck, build, validate-template, check-project y whitespace: PASS. Las regresiones
  de controles (18 test-validator + 22 test-checks) también PASS.
- Playwright: **2 PASS (42.9s)**; ambas CI se asociarán al SHA publicado en la PR.
- No UI modificada: no procede rediseño ni cinco mejoras visuales fuera de alcance;
  Playwright conserva los recorridos responsive y capturas ficticias existentes.

## Estado y continuidad
Esta corrección solo aborda el orden de configuración de dos conexiones. La causa
histórica de CI E1.4/R6 NO está demostrada ni se declara resuelta. Se conservan los
diagnósticos integrados en #26/#27 y la evidencia histórica de BUSY_RECOVERY.
PR #24 sigue Draft con Q1–Q4 pendientes. Sin dev06, merge, VPS, deploy, Excel o datos
reales. Próxima acción: auditoría funcional/técnica/de seguridad por Álex; merge solo
con autorización expresa. Ni la publicación de esta PR ni su CI autorizan integración.
