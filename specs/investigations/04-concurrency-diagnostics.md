# E1.4 — diagnóstico instrumental de procesos concurrentes
Status: READY FOR AUDIT / FAILURE OBSERVED — no corrección funcional ni integración.
Fecha: 2026-10-21. Base main `13f19f6add82ff24be5040674528bdad4b96c75f` (spec31
integrada; implementación #25 NO incorporada). Rama test/e1-4-process-diagnostics.
Usuario autoriza investigación y PR independiente; ninguna autorización de merge.

## Alcance
Solo movimientos.test.ts y esta evidencia. Patrón de instrumentación aprobado en
PR #26, sin cambiar sus helpers o pruebas. No producto, esquema, migración, reglas
financieras, dependencias, workflow ni dev06. #24 sigue Draft con Q1–Q4 pendientes.
#25 permanece bloqueada por instrucción expresa, aunque una nueva CI salga verde.

Se conserva el test histórico AC22/23/28: las tres parejas concurrentes (upgrade v3,
reintento idempotente y rectificación), mismas operaciones/UUIDs, schema5 de main,
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
tras SIGKILL. Los módulos técnicos de spec31 se reconocen por nombre para cuando esta
instrumentación sea integrada y reutilizada, sin importar hoy su implementación.

## Resultados locales y reproducción observada
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
La fuente de main en ese punto consulta sqlite_master para encontrar schema_version,
antes del PRAGMA busy_timeout=3000 (línea 60). El hijo aún no ha llamado writeMovement;
no demuestra un error económico, una anulación o un resultado 409 incorrecto. El
registro diagnóstico aparece ANTES de la aserción exit0, que continúa fallando.

Esto demuestra un fallo LOCAL de apertura durante recuperación SQLite. La CI histórica
[39680804651](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39680804651)
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
Esta PR solo aporta instrumentos y evidencia. No modifica database.ts ni #25; requiere
auditoría de Álex y autorización expresa antes de integrarse. El bloqueo de #25 sigue
vigente hasta resolver la incidencia o decisión expresa sustentada en evidencia.
