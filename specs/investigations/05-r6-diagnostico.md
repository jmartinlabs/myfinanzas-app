# Investigación aislada R6 E1.5 — 2026-10-21
Status: INVESTIGATED / ROOT CAUSE UNCONFIRMED — sin corrección autorizada.
Contexto: [spec 06 Draft](../06-deuda-brainstorming.md), PR #24.
Código analizado: `0f8c33020687ae158ed589fb0c83e625bbf03318`; archivos de aplicación/pruebas
idénticos a main 9336fdd. Investigación autorizada por usuario; no cambios de producto o test.

## Hechos y límite del diagnóstico
[CI push original 39672873631](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39672873631)
falla en `apps/api/src/referencias.test.ts:662`, llamado desde :696: se esperaba exit=0,
recibido 1 en un proceso de la fase de rectificación concurrente. No es la aserción final
que exige [200,409], ni se demuestra un fallo económico o un resultado 409 incorrecto.
[CI PR del mismo SHA 39672929471](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39672929471)
SUCCESS. Este éxito NO resuelve ni invalida el fallo anterior.

El helper original captura stdout/stderr, pero `expect(exit).toBe(0)` lanza antes de
`expect(stderr).toBe("")` y JSON.parse. No incluye fase, PID ni señal en la aserción.
Por ello las anotaciones conservan 0/1 pero no la excepción interna del hijo. Además,
el hijo de rectificación llama openDatabase ANTES de su try/catch; dentro de este
catch convierte cualquier excepción en e.status, incluso si no es un error de dominio.
Esto es una carencia demostrada de observabilidad, no prueba de causa raíz de CI.
Los logs completos del job no pudieron recuperarse por la interfaz disponible; se
consultaron anotaciones y metadatos. No afirmar que se haya recuperado stderr histórico.

## Reproducción local sin modificar el repositorio
Bun 1.4.3, Linux x86_64 6.18.55; NODE_ENV=test, bases nuevas ficticias en /tmp.

| Experimento | Resultado | Qué demuestra / límite |
| --- | --- | --- |
| R6 original, sin instrumentar, ejecución aislada | 1 PASS, 19 comprobaciones | No reproduce este fallo en esa ejecución |
| Reproducción externa de las tres fases R6, 100 rondas secuenciales; dos procesos por fase | 600 hijos, todos exit0, stderr vacío, señal null | Migración/REF, reintento idempotente y rectificación 200/409 funcionaron en esas rondas; no prueba ausencia de carrera |
| Apertura v5 concentrada, 30 rondas × 16 procesos, barrera antes de openDatabase | 480 hijos, todos exit0, stderr vacío, señal null | No reproduce fallo de apertura bajo esa carga; no replica el runner de GitHub |
| Suite Bun completa sin cambios | 54 PASS, 908 comprobaciones, 0 fallos | Regresión local vigente; no constituye corrección del fallo remoto |

La reproducción externa usa los módulos reales, bases v4 genuinas para las tres fases,
UUIDs nuevos y datos ficticios. Comprueba igualdad de respuestas idempotentes, un hecho,
resultados 200/409 y dos entradas de auditoría. Es un harness diagnóstico externo,
NO una sustitución/modificación de R6 ni una prueba nueva incorporada al repositorio.
La barrera de apertura solo sincroniza inicio; no reintenta operaciones. No se añadió
retry, timeout o excepción aceptada al producto, test o CI. No se reejecutó manualmente
la CI fallida para ocultarla; todo fallo histórico sigue enlazado.

Comandos ejecutados desde la raíz, con Bun y age del entorno en PATH:
```sh
NODE_ENV=test bun test apps/api/src/referencias.test.ts --test-name-pattern '05 R6'
NODE_ENV=test bun /tmp/myfinanzas-r6-investigation/reproduce.ts
NODE_ENV=test bun /tmp/myfinanzas-r6-investigation/open-burst.ts
bun run test
```
Los dos harness y las salidas por proceso están solo en el workspace temporal de esta
sesión, no son herramientas instaladas ni archivos garantizados en otro entorno.
`/tmp/myfinanzas-r6-investigation/child-results.json` y `burst-results.json` conservan
fase/ronda, stdout, stderr, exit y señal; originales locales con permisos 0600 dentro
de directorio 0700. No autenticación, claves, tokens, DB reales ni carga de factores.
Las bases ficticias se limpian por ronda. No se publican logs brutos ni bases en GitHub.

## Producto, prueba o entorno
- Producto: sin defecto de integridad o causa raíz demostrado; no se autoriza corregirlo
  por hipótesis. writeMovement conserva transacción IMMEDIATE/revisión/auditoría.
- Prueba: carencia confirmada de diagnóstico al fallar el proceso; sus assertions
  0, stderr vacío, JSON, [200,409] y auditoría NO deben relajarse.
- Entorno: los resultados entre ejecuciones son intermitentes, pero no hay evidencia
  suficiente de presión de recursos, señal, SQLITE_BUSY o fallo del runner como causa.
- Hipótesis a discriminar: excepción durante openDatabase fuera del catch; excepción
  inesperada dentro del write capturada como status indefinido; terminación del proceso.
  La anotación exit1 prioriza excepciones fuera del catch, sin demostrar cuál.
  La comprobación de versión previa a busy_timeout existe; no se cambia su orden sin
  evidencia que vincule ese punto al fallo. No repetir por inferencia la corrección PR #9.

## PR correctiva mínima propuesta — NO creada ni implementada
Nombre sugerido: `fix/e1-5-r6-diagnostics`, independiente de spec 06 y desde main.
Alcance inicial: únicamente helper de procesos de R6 en referencias.test.ts y evidencia
mínima de validación. No database.ts, movimientos.ts, migraciones ni lógica financiera.

1. Añadir fase/PID/exit/señal y salida diagnóstica segura ANTES de la primera assertion
   si falla el proceso. Redactar límites y no imprimir el código -e, payload, entorno,
   rutas privadas completas, factores o respuestas financieras completas en CI.
2. Instrumentar la frontera del hijo para distinguir apertura, escritura y cierre;
   preservar stderr y error técnico (nombre/código/mensaje sanitizado), sin convertir
   excepciones desconocidas en un 409. El resultado de dominio esperado sigue 200/409.
3. Conservar todas las aserciones y concurrencia, cero retries arbitrarios. Verificar
   con un hijo diagnóstico controlado que exit no cero/stderr y señal se observan sin
   filtraciones y siguen haciendo FALLAR el helper; éxito sigue comprobándose igual.
4. Ejecutar R6 original instrumentado, regresiones Bun/API y ambas CI. Un paso verde
   no se declara corrección de la carrera: capturar evidencia si reaparece. Solo tras
   conocer el error concreto se propone el mínimo cambio de producto/prueba/entorno,
   con regresión determinista correspondiente y nueva autorización si amplía alcance.

Aprobación requerida: permiso expreso para modificar pruebas en esa PR independiente.
No se propone desactivar R6 ni cambiar [200,409], ampliar esperas o introducir sleeps.
Esta investigación NO ofrece una corrección financiera confirmada ni cierra el fallo.
PR #24 permanece DRAFT; Q1–Q4 y desarrollo siguen sin aprobar. Sin Excel, datos reales,
merge, SQL/migración, despliegue ni dev 06.
