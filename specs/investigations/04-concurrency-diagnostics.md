# E1.4 — diagnóstico instrumental de procesos concurrentes
Status: UPDATED FOR AUDIT — instrumentación, no corrección funcional ni integración.
Actualización autorizada: 2026-10-22. Base main `511fcbad4bb0418af5bc06284ac30abb645cd604`.
Rama test/e1-4-process-diagnostics. Se reconoce la integración previa de #25 como hecho
actual del repositorio, NO aprobación retroactiva de Álex. El registro de pruebas de
2026-10-21 inferior corresponde a la base anterior 13f19f6 y al SHA 8ff4b0f.
Usuario autoriza investigación y PR independiente; ninguna autorización de merge.

## Alcance
Solo movimientos.test.ts y esta evidencia. Patrón de instrumentación aprobado en
PR #26, sin cambiar sus helpers o pruebas. No producto, esquema, migración, reglas
financieras, dependencias, workflow ni dev06. #24 sigue Draft con Q1–Q4 pendientes.
El permiso actual solo permite incorporar el main ya existente a esta rama y resolver
el conflicto de instrumentación. No revertir #25 ni corregir SQLite sin autorización.

Se conserva el test histórico AC22/23/28: las tres parejas concurrentes (upgrade v3,
reintento idempotente y rectificación), mismas operaciones/UUIDs, schema6 de main actual (schema5 en el registro histórico),
comparación de resultados, único hecho, [200,409], dos auditorías y Saldo 151.00.
Exit0, stderr vacío y JSON siguen siendo obligatorios; solo se sanea su presentación.
El catch de rectificación mantiene el status original; errores distintos del 409
previsto se diagnostican, no se convierten en 409 ni se aceptan como resultado válido.
Sin retries, sleeps, nuevos timeouts, ampliación de esperas ni assertions debilitadas.

## Qué se registra
Antes de la primera assertion fallida: operación, fase open/write/close, PID, exit,
señal y error técnico saneado. Se permiten solo nombres/códigos conocidos, errno,
motivo fijo y archivo:línea:columna de módulos técnicos permitidos. Nunca mensaje
original, stack/ruta completa, código -e/argv, entorno, SQL, datos financieros o factores.
Stdout se resume por bytes/formato; stderr desconocido se redacta pero sigue fallando.
Una terminación sin protocolo deja fase unknown, sin inventarla. No se promete stack
tras SIGKILL. Los módulos técnicos de spec31 se reconocen por nombre, sin cambiar su
implementación; todos sus archivos y pruebas se conservan idénticos al main autorizado.

## Registro histórico — 2026-10-21, base 13f19f6 / SHA 8ff4b0f
- Test original sin instrumentación: **1 PASS / 18 assertions**.
- Test instrumentado + nuevo control de diagnóstico: **2 PASS / 66 assertions**.
- Control negativo independiente de escritura: exit1 / «1 fail» ESPERADO; diagnóstico
  anterior a expect y sin canario. Los controles automáticos prueban también open/close,
  campos técnicos, ubicación redactada y ausencia de canarios de stdout/stderr/error/ruta.
- Typecheck/build PASS. Regresión Bun completa: **55 PASS / 1 FAIL / 994 assertions**,
  56 tests en cinco archivos. El fallo es el test histórico AC22/23/28, no el control
  negativo. NO se reejecuta hasta obtener verde ni se oculta como expected failure.
- Playwright: **2 PASS** (44.3s), regresiones E1.1–E1.5 con restore/MFA real;
  sin cambios visuales. Controles documentales, sus 18+22 regresiones y whitespace PASS.
  Revisión de rutas/historial y check-repository antes de publicar; resultado en PR.
- SHA final y ambas CI se registran en la PR; no atribuirles resultados de otro SHA.

En esa suite se reproduce un fallo REAL, no inyectado:
```text
operation=idempotent-write
phase=open
pid=26020
exit=1
signal=null
error.name=SQLiteError
error.code=SQLITE_BUSY_RECOVERY
error.errno=261
error.location=database.ts:32:8
stdout.bytes=0
stdout.format=empty
```
La fuente de aquel main 13f19f6 en ese punto consulta sqlite_master para encontrar schema_version,
antes del PRAGMA busy_timeout=3000 (línea 60). El hijo aún no ha llamado writeMovement;
no demuestra un error económico, una anulación o un resultado 409 incorrecto. El
registro diagnóstico aparece ANTES de la aserción exit0, que continúa fallando.

Esto demuestra un fallo LOCAL de apertura durante recuperación SQLite. La CI histórica
[39680804651](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39680804651)
falló en el hijo de RECTIFICACIÓN, con exit1 sin stderr interno publicado en la anotación,
y sobre código de #25, no este main. No se afirma equivalencia causal ni que toda la
incidencia remota esté resuelta. El error sintético SQLITE_BUSY usado en controles
negativos tampoco es la fuente de esa conclusión: SQLITE_BUSY_RECOVERY proviene de la
suite real. La observación no garantiza reproducibilidad en cada ejecución concurrente.

Comandos desde raíz con Bun 1.4.3 y age/Chromium disponibles:
```sh
NODE_ENV=test bun test apps/api/src/movimientos.test.ts --test-name-pattern '^04 AC22/23/28:'
NODE_ENV=test bun test apps/api/src/movimientos.test.ts --test-name-pattern '^04 AC22/23/28:|^04 diagnostic:'
bun run typecheck
bun run build
bun run test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e
```
Control negativo (DEBE salir con 1; no usar como comando de suite verde):
```sh
MYFINANZAS_E14_PROBE_PHASE=write NODE_ENV=test bun test apps/api/src/movimientos.test.ts --test-name-pattern '^04 diagnostic controlled failure$'
```
Open/close se prueban cambiando el valor; el test padre verifica las tres sin omitir
la prueba histórica. Logs locales /tmp/e14-diag-*.log, solo diagnóstico sanitizado.

## Propuesta posterior, NO implementada
Evaluar en otra corrección autorizada establecer el MISMO busy_timeout=3000 de conexión
antes de la primera lectura de metadatos y revisar los preflights de #25. Mantener la
validación de origen previa a PRAGMAs mutables y BEGIN IMMEDIATE; no aumentar el límite,
introducir reintentos o asumir que esto ya corrige el fallo remoto. Primero validar
con regresión de recuperación/concurrencia y evidencia de las conexiones afectadas.
Esta PR solo aporta instrumentos y evidencia. No modifica database.ts ni la implementación
integrada de #25; requiere auditoría de Álex y autorización expresa antes de integrarse.
La actualización autorizada del 2026-10-22 no supone corregida la incidencia histórica.


## Actualización sobre main 511fcba — 2026-10-22
Se incorpora main mediante merge de rama, sin force push ni squash/rewrite de la
historia revisada. Único conflicto: bloque de upgrade en movimientos.test.ts. Se
mantiene el wrapper diagnóstico y se conserva la expectativa schema6 de main, no la
expectativa antigua schema5. Las tres parejas y todas sus assertions continúan intactas.
R6, producto, seguridad, migración v6 y pruebas P/S de main no reciben ediciones.
Diff autorizado frente a main: movimientos.test.ts y este documento, exclusivamente.
Resultados nuevos y ambas CI se registran por SHA definitivo, separados del registro
histórico: un verde nuevo no borra la observación SQLITE_BUSY_RECOVERY anterior ni
demuestra que fuera la misma causa de la CI histórica de #25.
Mantener #27/#24 Draft y Q1–Q4 pendientes. No merge de PR, dev06, Excel, datos reales,
VPS, deploy ni correcciones funcionales.

### Validación local de la actualización
- Test concurrente E1.4 + controles negativos open/write/close: **2 PASS / 66 assertions**.
- Suite Bun completa, una ejecución sobre esta base: **83 PASS / 0 FAIL / 1291 assertions**, siete archivos (22.31s). Incluye R6 y seguridad/producción de main sin modificaciones.
- Typecheck, build, validate-template, test-validator (18), check-project,
  test-checks (22), check-repository y whitespace: PASS.
- Logs locales sanitizados: /tmp/e14-update-targeted.log, /tmp/e14-update-bun.log
  y /tmp/e14-update-playwright.log. No se publican bases, claves ni logs crudos.
- Durante la validación main avanzó por #28 a 62662e9, exclusivamente documental.
  Se conserva como base incorporada el 511fcba autorizado; la compatibilidad de PR
  y ambas CI nuevas se comprobarán contra el main vigente, sin modificar #28.
- Playwright: **2 PASS (41.0s)**, recorridos E1.1–E1.5 y restauración/MFA reales con datos ficticios. Sin cambios de UI.
