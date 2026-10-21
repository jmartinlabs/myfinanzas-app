# E1.1 — Incidencia de concurrencia al inicializar SQLite

Estado: corrección aprobada e integrada mediante PR #9 en main 23e471e, 2026-10-21.
Autorización: el usuario responde «sí» el 2026-10-21 a investigar y corregir la incidencia
antes de cerrar STEP 8. Rama fix/e1-1-sqlite-startup-concurrency desde main 5f1e27b.
Sin E1.2, nuevas funcionalidades, datos reales, cambios financieros ni despliegue.

## Evidencia y diagnóstico
- PR #8 documental, commit 6f816a0: [push SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39553450015),
  [pull_request FAILURE](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39553456240).
  La anotación de AC03 solo mostraba códigos de salida [0,1] en vez de [0,0]; la prueba
  no consumía ni mostraba stderr de los hijos. Log remoto detallado inaccesible desde Codex.
- Reproducción local sobre código de main: en la cuarta ronda de cuatro procesos,
  SQLiteError SQLITE_BUSY/errno 5 en database.ts, CREATE TABLE dentro de la transacción
  de inicialización. Fallo previo a reservar IDs, no evidencia de IDs duplicados.
- Segunda reproducción controlada: mantener BEGIN IMMEDIATE desde otra conexión y abrir
  el catálogo desde un hijo produce el mismo fallo inmediato con el código anterior.
  Se añade esa regresión y se ejecuta **antes** de corregir: falla con exit 1/SQLITE_BUSY.
- La inicialización usaba BEGIN DEFERRED: la transición de lectura a escritura puede
  fallar sin agotar busy_timeout cuando otro escritor posee el bloqueo. Adquirir el
  bloqueo desde el inicio de la transacción evita esa transición dentro de ella y
  permite esperar por el escritor. Las comprobaciones previas de versión se ejecutan
  fuera de esa transacción y antes de adquirir dicho bloqueo.
  Es una causa demostrada localmente compatible con CI; no hay traza remota del hijo
  para afirmar qué excepción exacta tuvo aquella ejecución.

## Corrección mínima
Cambiar únicamente el modo de la transacción de inicialización a `.immediate()`
(BEGIN IMMEDIATE), con comentario explicativo. El bloqueo se adquiere antes de
inicializar el esquema dentro de la transacción, no antes de todas las lecturas:
las comprobaciones previas de existencia/versión siguen fuera de ella. Esta precisión
documental fue solicitada por el usuario al aprobar 121d790; no cambia el código.
Mismo esquema, semilla, guard de entorno,
contador de IDs y timeout de 3 s. Sin reintentos, sleeps o aumentos de timeout en la app;
sin omitir/desactivar pruebas ni relajar la condición de dos altas correctas.

La prueba original ahora recoge stdout/stderr y salida en paralelo, de modo que un
fallo de un hijo aporta diagnóstico y los pipes se drenan mientras termina el proceso.
Sigue exigiendo ambos procesos correctos, veinte IDs distintos y revisión obsoleta rechazada.
La regresión nueva retiene deliberadamente un bloqueo de escritura y comprueba que el
hijo espera, después termina bien al liberarlo y no duplica la semilla. Los 150 ms son
el intervalo de contención controlada de esta prueba, no un retardo correctivo en la app.

## Verificación — 2026-10-21
- Regresión con código anterior: falla. Misma prueba con corrección: pasa.
- Ensayo adicional local: 30 rondas × 4 procesos sobre bases temporales ficticias,
  cero hijos fallidos tras corregir. No es una garantía universal ni benchmark productivo.
- TypeScript, build y suite Bun completa: **16 pruebas / 200 aserciones**, cero fallos.
- Playwright real, ambas anchuras 390/1440, acceso MFA y copia/restauración: pasa.
  Sin cambios de UI/CSS; las capturas son de fixtures, nunca factores/secretos.
- Controles documentales y 18+22 regresiones: pasan; whitespace sin errores.
  Revisión de historial/índice antes del push y CI por SHA registradas en la PR de corrección.

Reproducciones auxiliares solo en .local ignorado; pruebas permanentes en app.test.ts.
Temporales ficticios eliminados al finalizar. No se ha accedido al Excel ni a datos reales.

## Reanudación
PR #9 aprobada por el usuario tras revisión de Álex sobre 121d790. Precisión documental
0f1231c validada con ambas CI SUCCESS antes de merge; sin cambios adicionales de código.
Integración verificada en main 23e471e y rama de PR #8 actualizada desde main sin conflictos.
PR #8 permanece en borrador, pendiente de revisión/aprobación; se repiten sus validaciones.
Su ejecución fallida original se conserva como evidencia, no se oculta mediante rerun.
La corrección funcional llega desde main integrado, no como cambio propio del diff de PR #8.
Los motores financieros futuros, Manual operativo y Ciclos/histórico pendientes conservan
sus límites; esta incidencia no modifica las decisiones económicas de E1.1.
