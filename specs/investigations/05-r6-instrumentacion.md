# R6 E1.5 — instrumentación de procesos para auditoría
Status: IMPLEMENTED / LOCAL VERIFIED — pendiente CI y revisión; no integrado.
Fecha: 2026-10-21. Base main `9336fdd301231191509b6371ffb05a54b33d61ed`.
Autorización: usuario permite PR independiente exclusivamente instrumental; no merge.
Rama: test/r6-diagnostics. SHA definitivo y CI se registran en la descripción de la PR.

## Alcance y conservación
Solo cambia `apps/api/src/referencias.test.ts` y esta evidencia. Sin producto, DB,
migraciones, dependencias, configuración de CI ni documentación funcional E1.6.
[PR #24](https://github.com/jmartinlabs/myfinanzas-app/pull/24) permanece Draft,
E1.6 sin aprobar; no se incorpora su rama. Sin datos reales, Excel, dev 06 o despliegue.

R6 conserva sus tres parejas Promise.all, datos, claves de intento, revisiones y
aserciones originales: exit0, stderr vacío, JSON válido, REF distintos/999/1000,
respuestas idempotentes iguales, un Movimiento, resultados [200,409] y auditoría=2.
El helper se extrae en el mismo archivo para verificarlo con controles negativos.
Cualquier stderr original no vacío sigue siendo no vacío tras sanear; no se acepta
ningún nuevo error. El catch original de rectificación sigue devolviendo e.status;
si no es el 409 esperado, informa el error técnico sin convertirlo en un 409.
No sleeps, retries, timeouts nuevos/ampliados ni ejecución serial de las parejas.

## Diagnóstico seguro antes de la primera aserción
Cada hijo distingue open/write/close. Si hay fallo, el padre informa operación, fase,
PID, exit y señal antes de comprobar exit0. Añade error técnico saneado y resumen
bytes/formato de stdout, nunca su contenido financiero. Señal null si no la hay.
Nombres/códigos técnicos usan lista permitida, errno entero y motivo fijo; desconocidos
se marcan UNCLASSIFIED. Una localización permitida conserva solo archivo:línea:columna,
no stack completo ni directorios. Se sanean otra vez los registros recibidos del hijo;
stderr ajeno al protocolo se sustituye por diagnóstico genérico, manteniendo el rechazo.
No se imprimen mensajes originales, argv/código -e, payloads, entorno, SQL o factores.
Hasta cuatro registros de stderr por fallo; stdout JSON real solo se usa en assertions
previas, no en el diagnóstico. JSON inválido sigue fallando con contenido redactado.
Importación/terminación abrupta sin registro de fase se declara unknown, sin inventarla;
su exit/señal y operación siguen visibles. No se promete capturar un stack tras SIGKILL.

## Verificación local
Bun 1.4.3, age/age-keygen y Chromium local; solo fixtures ficticias.
- R6 aislada: **1 PASS / 19 assertions**.
- Suite completa: **55 PASS / 956 assertions**, sin fallos; incluye R11 nueva y todas
  las regresiones anteriores. Typecheck y build PASS.
- R11 lanza un test hijo deliberadamente fallido para cada fase open/write/close:
  las tres ejecuciones terminan exit1, contienen «1 fail» y el diagnóstico aparece
  ANTES de la primera assertion fallida. El test padre verifica esa conducta, no
  transforma un error real de R6 en éxito. Fases/PID/exit/señal/error/stdout comprobados.
- Canarios falsos introducidos en stdout, stderr, mensaje, código/nombre desconocidos
  y rutas/stack NO aparecen en la salida. Solo se conserva la localización permitida.
- Control negativo manual open: exit1 esperado y diagnóstico anterior a expect;
  no es un fallo accidental de la suite ni una reproducción de la carrera de CI.
- Playwright: **2 PASS**, regresión E1.1–E1.5 con restauración/MFA real; sin cambios
  visuales ni funcionales. No nueva aprobación visual por esta instrumentación.
- validate-template, 18 regresiones del validador, check-project, 22 regresiones de
  controles, check-repository y whitespace PASS. CI del SHA final: enlaces en PR.

Comandos desde raíz:
```sh
NODE_ENV=test bun test apps/api/src/referencias.test.ts --test-name-pattern '^05 R6 AC'
bun run typecheck
bun run build
bun run test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e
```
Control negativo reproducible (DEBE devolver 1):
```sh
MYFINANZAS_R6_PROBE_PHASE=open NODE_ENV=test bun test apps/api/src/referencias.test.ts --test-name-pattern '^05 R6 diagnostic controlled failure$'
```
Cambiar open por write o close prueba esas fases; R11 verifica automáticamente las tres.
Ese selector solo registra el control negativo; no omite ni modifica R6. No se usa
para el CI normal ni el producto.

## Límite de la conclusión
Esta PR mejora observabilidad, NO corrige ni demuestra la causa raíz del fallo remoto
[39672873631](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39672873631).
El SQLITE_BUSY del control negativo es una inyección sintética, no diagnóstico del fallo
original. CI verde no prueba que la carrera desapareció. Si reaparece, usar la evidencia
para proponer una corrección mínima independiente y autorizada; no ampliar esta PR.
Esperar auditoría de Álex y autorización expresa del usuario antes de merge.
