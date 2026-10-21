# E1.1 — Incidencia de concurrencia al inicializar SQLite

Estado: corrección verificada localmente en rama independiente; pendiente revisión/merge.
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
  bloqueo desde el inicio evita esa transición y permite esperar por el escritor.
  Es una causa demostrada localmente compatible con CI; no hay traza remota del hijo
  para afirmar qué excepción exacta tuvo aquella ejecución.

## Corrección mínima
Cambiar únicamente el modo de la transacción de inicialización a `.immediate()`
(BEGIN IMMEDIATE), con comentario explicativo. Mismo esquema, semilla, guard de entorno,
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
PR de corrección requiere aprobación explícita antes de merge. La PR #8 permanece en
borrador: su ejecución fallida no se borra ni se sustituye por el push verde. Tras integrar
esta corrección autorizada, sincronizar su rama documental y volver a validar STEP 8.
No se introduce el arreglo funcional en PR #8 ni se declara resuelto en main antes del merge.
Los motores financieros futuros, Manual operativo y Ciclos/histórico pendientes conservan
sus límites; esta incidencia no modifica las decisiones económicas de E1.1.
