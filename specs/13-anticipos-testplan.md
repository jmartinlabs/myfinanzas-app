# 13 — Anticipos y pendiente por caso: Test plan
Specification: [contrato rev3 + Q9 aprobados](13-anticipos-specification.md)

Matriz previa a código, 2026-10-25. Responsable de diseño y ejecución de autor: dev13. QA independiente pendiente del coordinador; no asignada. Todos los 44 AC son actuales; positivos con acreditación explícita Q9. Resultados actuales al final; la matriz inicial conserva el diseño anterior a código.

| Acceptance ID | Preconditions and action | Expected result | Automated/manual method and command | Local / CI platform and owner | Expected evidence | Actual result / status | Candidate / run date / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Alta de Referencia Anticipo nueva | REFxxx Activa y ficha 1:1 creadas en una única transacción; sin ficha sin REF ni REF sin ficha | Alta real con REF/ficha, rollback inyectado y dos conexiones; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-02 | Fallo en cualquier paso del alta | Rollback completo; sin REF parcial ni ficha huérfana; mensaje de causa segura | Alta real con fallo antes de ficha; comparar tablas y contador; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-03 | Alta duplicada o simultánea de la misma referencia | Rechazada por unicidad con idempotencia; no hay segunda ficha | Replay, payload distinto y altas concurrentes en dos procesos; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-04 | Desactivar Referencia con historial | Ficha y motor conservan historial; sin DELETE físico; reactivar no crea operaciones | Desactivar/reactivar por servicio Referencias; comparar hechos; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-05 | Adelantos 1000+500 y devolución 500 | Recuperación parcial; Adelantado 1500, Recuperado 500, Neto 1000, Exceso 0 verificado; fechas por transferencias reales | Motor puro + API con adelantos y recuperación acreditados; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-06 | Devolución igual al adelantado | Estado Recuperado; sin doble cómputo ni evento de cierre financiero inferido | Motor puro + API recuperación exacta, conteo por ID; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-07 | Devolución 1800 sobre adelantado 1500 | Advertencia de exceso antes de confirmar; caso pasa a Excedido; Exceso 300; importe real intacto | Motor/API + revisión UI por exceso con importe intacto; `bun test apps/api/src/anticipos.test.ts` + `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; recorrido navegador y PNG `artifacts/e3-1/` | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-08 | Ficha sin movimientos elegibles | «Sin operaciones» o No disponible según cobertura; nunca Recuperado por igualdad 0=0 | Motor/API y ficha vacía; verificar ausencia de fecha; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-09 | Devolución nueva con dirección equivocada acreditada respecto a un par verificable | Bloqueada al guardar; histórica equivalente marcada «Revisar» y no computada; sin autocorrección | Servicio común rechaza devolución con par/dirección incompatibles; histórico conserva hecho; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-10 | Devolución con otra Referencia | Pertenece a su propia ficha; no computada en la ficha consultada; sin atribución por similitud | Dos REF independientes; agregados por ID exacto; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-11 | Variante histórica con receptor Exterior | Preservada y etiquetada con procedencia; sin ficha ficticia ni cambio retrospectivo; atajo de devolución no disponible con motivo | Fixture histórica genuina autorizada; motor y motivo Exterior; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-12 | Alta nueva de transferencia de Anticipo con Exterior | Exterior no es seleccionable; ampliación futura exige contrato y autorización específicos | Opciones/POST comunes y UI rechazan Exterior; `bun test apps/api/src/anticipos.test.ts` + `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; recorrido navegador y PNG `artifacts/e3-1/` | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-13 | Fecha apertura anterior declarada manual | Registrada con marca «Manual» + evidencia y trazabilidad; sin relleno con hoy ni importación | Alta con fecha manual/evidencia y prueba negativa sin evidencia; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-14 | Foto de Neto apertura registrada y devolución posterior | Foto intacta tras la devolución; importe y procedencia visibles | Foto confirmada; devolución real; comparar foto antes/después; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-15 | Ciclo sin fotografía ni evidencia suficiente | «Neto apertura del ciclo: No disponible»; no 0 ni pendiente actual | GET ficha sin foto; UI No disponible; comparar filas antes/después; `bun test apps/api/src/anticipos.test.ts` + `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; recorrido navegador y PNG `artifacts/e3-1/` | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-16 | Tres campos de fecha en pantalla | Primer adelanto, fecha técnica de auditoría y apertura (Manual/Derivada) claramente diferenciados | UI con tres fechas diferentes y etiquetas/accesibilidad; `bun test apps/api/src/anticipos.test.ts` + `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; recorrido navegador y PNG `artifacts/e3-1/` | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-17 | Atajo «Registrar devolución» con par seleccionado verificable y sin Exterior | Formulario común con Referencia, origen/destino inversos y pendiente recuperable propuesto; importe y fecha editables; revisión previa | UI abre formulario común; revisión inversa, importe/fecha editables; `bun test apps/api/src/anticipos.test.ts` + `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; recorrido navegador y PNG `artifacts/e3-1/` | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-18 | Confirmación del atajo | Única Transferencia real por el servicio común; ficha recalculada solo por el motor central; idempotencia aplicada | POST común real y replay por clave; un hecho y auditoría; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-19 | Devolución en ciclo distinto del adelanto | Estado derivado correcto sin doble devolución; sin ejecución de Presupuesto; foto intacta | Dos ciclos reales; devolución en posterior; ejecución presupuesto sin cambios; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-20 | Operación marcada «Revisar» | Aviso de conciliación visible y diferenciado del error estructural; navegable al detalle | Histórico incompatible en ficha; aviso y enlace a hecho real; `bun test apps/api/src/anticipos.test.ts` + `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; recorrido navegador y PNG `artifacts/e3-1/` | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-21 | Persistencia mínima y consulta | Lectura de fuentes canónicas necesarias (Movimientos, Referencias, Saldos y Ciclos) por contratos existentes; consulta sin escritura en esas fuentes ni caché de derivados como fuente de verdad; alta/Transferencia solo por sus servicios autorizados | Inspección fuentes + prueba GET sin cambios persistidos; paginación >100 hechos; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-22 | Exactitud monetaria y de fechas | EUR como string exacto; sin flotante; fechas civiles para el caso y UTC solo auditoría | Límites EUR exactos y fechas civiles/UTC en API y motor; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-23 | Auditoría, idempotencia y concurrencia | Sin duplicar hechos en devoluciones simultáneas; coherencia por revisión del motor | Dos procesos recuperan/reintentan; revisión coherente sin doble hecho; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-24 | Accesibilidad 390/1440 | Estados con icono+texto; «No disponible» explícito; sin tooltips imprescindibles; teclado y foco correctos | Flujos Playwright a 390/1440, teclado/foco, captura y contraste real; `bun test apps/api/src/anticipos.test.ts` + `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; recorrido navegador y PNG `artifacts/e3-1/` | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-25 | Seguridad | Acceso protegido por método; sin SQL ni payload bancario en logs; sin rutas de fixtures; sesión expirada | HTTP MFA/Origin/CSRF por método, 401 y borrador conservado; `bun test apps/api/src/anticipos.test.ts` + `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; recorrido navegador y PNG `artifacts/e3-1/` | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-26 | Contratos reutilizados sin duplicación | Sin endpoint paralelo ni escritura directa de Movimientos fuera del servicio común; la ficha permite confirmar explícitamente Neto apertura por su protocolo; CAT012 habilitada solo al integrar | Inspección servicios comunes y matriz CAT012; sin endpoints paralelos; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-27 | Misma REF con A→B y A→C; abrir devolución | Sin par elegido automáticamente; selección explícita muestra origen/destino y adelantado/recuperado/pendiente verificables; precarga inversa del seleccionado | UI varios pares acreditados; sin selección inicial; inversa por selección; `bun test apps/api/src/anticipos.test.ts` + `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; recorrido navegador y PNG `artifacts/e3-1/` | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-28 | Dirección contradictoria o par original no identificable | Atajo bloqueado con conflicto y acceso a hechos; sin elección por fecha/importe/proximidad ni autocorrección | Dirección contradictoria/rol no acreditado bloquea atajo con acceso a hechos; `bun test apps/api/src/anticipos.test.ts` + `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; recorrido navegador y PNG `artifacts/e3-1/` | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-29 | Devolución parcial y después excesiva de par seleccionado | Validación de par/dirección, importe y fecha editables; aviso de exceso; cada recuperación una sola vez en par y global; motor único determina Neto/Exceso/Estado | Par seleccionado parcial/excesivo y dos pares; conteo único global; `bun test apps/api/src/anticipos.test.ts` + `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; recorrido navegador y PNG `artifacts/e3-1/` | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-30 | Confirmar apertura con evidencia suficiente desde ficha | Una foto por ID REF+ID Ciclo con importe, Inicio, procedencia, evidencia/auditoría, fecha confirmación y cobertura; sin modificar apertura E2.1 | POST explícito de foto por REF+ciclo con evidencia; lectura y auditoría; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-31 | Sugerencia con cobertura/hechos anteriores verificables; cancelar o confirmar | No persiste hasta confirmación explícita; cancelar no crea foto; sin usar pendiente actual automáticamente | Sugerencia verificada, cancelación sin escritura, confirmación explícita; `bun test apps/api/src/anticipos.test.ts` + `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; recorrido navegador y PNG `artifacts/e3-1/` | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-32 | Falta evidencia, hechos posteriores o hechos de Inicio sin orden verificable | No reconstrucción; exigir evidencia de apertura o mostrar No disponible; no convertir ausencia en cero | Evidencia insuficiente/posterior/mismo día sin orden: rechazo o ausencia explícita; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-33 | Cero verificado o neto negativo por exceso histórico justificado | Conservar cero o signo negativo con evidencia/cobertura; sin truncar ni generar movimientos de cuadre | Fotos cero/negativo justificadas; signo exacto y sin movimientos; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-34 | Confirmación tardía y devolución posterior | Inicio financiero separado de confirmación; evidencia justifica valor histórico; devolución posterior no cambia foto | Confirmar tarde; Inicio y confirmación separados; devolución no altera foto; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-35 | Confirmaciones concurrentes, replay y consultas repetidas | Un único registro confirmado por REF+Ciclo; GET no escribe; idempotencia y rollback evitan duplicados/parciales | Dos conexiones, replay, fallos y GET repetidos; unicidad/rollback; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |
| AC-36 | Corrección excepcional o cambio de Inicio que afecta foto | Revisión de impacto, motivo, auditoría y protección de cierres/fotos; original trazable; sin segunda foto vigente ni cambio silencioso; si protección no verificable, bloquear confirmación de corrección | Preview/confirmación corrección e Inicio con impacto; original/auditoría y bloqueo protección no verificable; `bun test apps/api/src/anticipos.test.ts` | macOS: autor dev13; CI Linux: pendiente | Assertions API/SQLite; salida suite focal | Diseño previo; consultar resultados actuales | Base fa8a01e; diseño actualizado 2026-10-25 |

## Regression checks
Preflight de solo lectura: Bun 1.4.3 y Python 3.12 disponibles; checkout sin node_modules. No se instalaron dependencias antes de resolver B13-1. Reutilizar caché válida con `bun install --frozen-lockfile` cuando se retome. Canonical: `python3 scripts/verify --full` con Python 3.10+ y Bun/age en PATH. Tipos/build/API/E2E siguen UNRUN. macOS no acredita las pruebas de publicación/restore Linux glibc; CI Linux permanece obligatorio. No cambiar ni omitir sus assertions.

## Functional verification
UNRUN. No código/DDL ni fuente real de datos modificada. La revisión de contrato y código confirma B13-1; no demuestra ningún AC funcional. Negativos previstos por fila incluyen rollback, replay/conflictos, 401/CSRF, ausencia de evidencia, dirección incompatible y protección histórica no verificable.

## Browser verification (web only)
UNRUN. Ejecutar todos los flujos aprobados con API/SQLite real, 390×844 y 1440×1000; inspeccionar PNG ficticios y medir foreground/background reales; no factores, credenciales ni DB en evidencia. Sesión expirada y respuesta antigua no deben perder selección/borrador.

## Visual improvements (visual apps only)
No hay UI implementada que inspeccionar. Las cinco mejoras más valiosas se evaluarán sobre la UI real; no se inventa evaluación visual desde wireframes.

## Limitations and next action
Bloqueo B13-1 en [progreso](13-anticipos-progress.md). La matriz describe verificaciones previstas, no pruebas ya existentes. Ningún AC se relabela como futuro. Resolver fuente aprobada del rol/orientación y actualizar contrato antes de código dependiente.

## Enmienda Q9 — mapa previo a código

Positivos AC05–12/17–23/27–36 exigen metadata explícita por ID; nunca rol por dirección/fecha. Autor dev13 macOS; CI Linux y QA independiente pendientes. Evidencia esperada: assertions focales, navegador y PNG ficticias; comando focal `bun test apps/api/src/anticipos.test.ts`, navegador `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts`, entrada canónica `python3 scripts/verify`.

| ID | Acción y negativos/integración | Resultado esperado | Método/plataforma/evidencia | Estado |
| --- | --- | --- | --- | --- |
| AC-37 | Todas las rutas comunes sin rol/par válido; Exterior nuevo | Rechazo atómico sin filas parciales | API común + SQLite; focal/macOS y CI Linux | Diseño previo; consultar resultados actuales |
| AC-38 | Adelanto y devolución acreditados; otra REF | Metadata por ID, importe canónico contado una vez | Motor + API común; focal/macOS y CI Linux | Diseño previo; consultar resultados actuales |
| AC-39 | Fallo de metadata/auditoría, replay y dos escritores | Rollback conjunto, revisión/idempotencia | SQLite transacciones y concurrencia; focal/macOS y CI Linux | Diseño previo; consultar resultados actuales |
| AC-40 | Históricos inversos sin rol; mezcla acreditados | Banco intacto, ND/Revisar/Parcial sin inferencia | Motor + API + UI; focal/browser/macOS y CI Linux | Diseño previo; consultar resultados actuales |
| AC-41 | Acreditación revisión/evidencia; cancelar/expirar/conflicto | Solo confirmación válida cambia metadata auditada | API protegida + navegador; focal/browser/macOS y CI Linux | Diseño previo; consultar resultados actuales |
| AC-42 | Rectificar/anular adelanto con dependientes; cambiar REF/par | Impedir dependencia incoherente y revalidar revisiones | Todas las rutas comunes; focal/macOS y CI Linux | Diseño previo; consultar resultados actuales |
| AC-43 | Acreditación/cambio toca apertura/fotos; protección incierta | Impacto visible, foto intacta, bloqueo si no verificable | Foto + protocolos movimiento/ciclo; focal/macOS y CI Linux | Diseño previo; consultar resultados actuales |
| AC-44 | Atajo único/múltiples pares; teclado390/1440 | Rol/REF/inversa visibles, revisión y bloqueos | Browser real + PNG inspeccionadas/macOS; CI Linux pendiente | Diseño previo; consultar resultados actuales |

## Resultados actuales del candidato — 2026-10-25

Código/arquitectura `6e8dad350a55a7af61f00a90f6ea97d08d0146f5`; checkpoint/testplan en commit documental posterior. Evidencia de AUTOR, no QA independiente. Los44AC siguen actuales. No declarar aceptación global ni convertir AC36 actual en futuro por su integración pendiente.

| ID | Evidencia ejecutada | Resultado local y límite |
| --- | --- | --- |
| AC-01 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-02 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-03 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-04 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-05 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-06 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-07 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-08 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-09 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-10 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-11 | Fixture de fuente histórica permisiva Exterior + lector/acreditación; no importador runtime | PASS autor lector; integración de importación fuera de alcance |
| AC-12 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-13 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-14 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-15 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-16 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-17 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-18 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-19 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-20 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-21 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-22 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-23 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-24 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-25 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-26 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-27 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-28 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-29 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-30 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-31 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-32 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-33 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-34 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-35 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-36 | Positiva aislada con AnticipoProtectionProvider de test + negativas reales/runtime/browser | PARCIAL: runtime bloquea corrección sin protección verificable; integración Cierres UNRUN |
| AC-37 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-38 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-39 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-40 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-41 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |
| AC-42 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-43 | Focal17 API/SQLite/motor | PASS autor; CI/QA pendientes |
| AC-44 | Focal17 + browser real390/1440 | PASS autor; CI/QA pendientes |

### Comandos y resultados

- `NODE_ENV=test bun test apps/api/src/anticipos.test.ts`:17PASS/0FAIL/158assertions. Incluye alta/rollback de REF+ficha, replay, dos procesos alta/devoluciones/fotos, huellas obsoletas, roles obligatorios también al rectificar, originales intactos, metadatos sin importe duplicado, ledger>2^53 y agregado>int64, histórico ND/Parcial/incompatible, Exterior histórico como fuente de test, fechas, fotos firmadas, same-day, conservación posterior, Inicio y protecciones. Salida local `/private/tmp/dev13-focal-current.log`.
- `bun run typecheck` y `bun run build`:PASS finales en Bun1.4.3. Primer build invocado sin PATH produjo127; corregido entorno y ambas entradas finalesPASS, sin cambiar dependencias.
- `python3 scripts/verify baseline` usando Python3.12:PASS. Log local `/private/tmp/dev13-baseline.log`. No acredita aplicación.
- `python3 scripts/verify application` usando Python3.12, PATH Bun/age y TMPDIR=/private/tmp:tipos/buildPASS, API141PASS/45FAIL, E2EcanónicoUNRUN porque la entrada se detiene en API. Log `/private/tmp/dev13-application.log`.39fallos muestran directamente `ERR_DLOPEN_FAILED libc.so.6`;2(R11 Referencias y diagnóstico Movimientos) fallan por stack de Bun que contiene `/private/` y viola aserción de redacción;4 son aserciones de inicialización/procesos (B4, producciónP4, seguridadAC35) y NO se atribuyen globalmente a plataforma sin verificación. Todo sigue FAIL; sin loops B3 ni relajación de controles. Linux full requerido.
- Browser focal real, operation owner coordinador: `node node_modules/@playwright/test/cli.js test tests/e2e/anticipos.spec.ts` con PATH Bun/age, TMPDIR=/private/tmp y Chrome sistema:1PASS/7.5s (test5.8s), `/private/tmp/dev13-browser.log`. MFA/enrolado real; histórico/acreditación, alta Manual, Adelanto común, selección teclado multipar, atajo único, Devolución600 sobre par500 sin alterar importe, revisión antes de guardar, global900, foto1500, protección de corrección, conflicto conservando borrador y simulación401 conservando selección. API focal sí verifica expiración real de sesión con reloj del servicio. Primer fallo de browser fue selector de test «Movimiento» frente al heading correcto «Transferencia», corregido sin cambiar contrato.
- `git diff --check`, revisión manual de diff/índice y `scripts/check-repository`:PASS. Archivos ficticios; sin DB/credenciales/factores, sin publicación del autor.

### Revisión visual y accesibilidad

22PNG locales en `artifacts/e3-1/`:pares `historical-unattributed`, `create`, `empty-case`, `advance-review`, `pairs`, `return-excess`, `opening-review`, `case-complete`, `correction-protected`, `conflict-draft`, `expired-draft`, cada uno390/1440. Inspección efectiva de ficha completa1440/390, selección de pares390, revisión apertura390, transferencia1440 y protección1440; captures finales actualizadas tras ajustes. No contienen factores. Capturas locales ignoradas, no se afirma subida a artifact CI ni cobertura por antiguas capturas.

Cinco mejoras justificadas aplicadas:acciones secundarias con controles comunes y foco; radio20px alineado con etiqueta completa/nombres+IDs; separación20px entre paneles y acciones con espacio; tabla compacta1440 y tarjetas390 equivalentes; checkbox20px con texto completo en fila sin desbordamiento. Se corrigió captura antes de asentarse viewport/scroll con dobleRAF. Las últimas capturas muestran jerarquía, importes, cobertura, ausencia y evidencia legibles; no overflow horizontal. Estados incorporan icono+texto; selección múltiple exige acto explícito y revisión toma foco en título.

Playwright mide color real de texto y fondo de acción primaria y exige>=4.5:1; conserva texto oscuro sobre verde aprobado. Contraste de paleta heredado se conserva; controles disabled quedan en excepción de contraste para inactivos, no nueva aprobación de paleta. No auditoría WCAG completa ni ensayo lector de pantalla. Error/expiración tienen aviso y borrador; ninguna captura acredita reautenticación sin conservar datos después de abandonar voluntariamente el formulario.

### Gates pendientes y límites

QA independiente y CI Linux full sobre SHA publicado pendientes; candidato no integrado, sin merge/deploy. Corrección excepcional tiene motivo, revisión, impacto, auditoría con original y proveedor interno revalidado; prueba positiva con proveedor ficticio NO prueba Cierres runtime. El runtime bloquea lo no verificable conforme Q8, sin instalar cierre simulado; AC36 integración sigueUNRUN. Fuente histórica Exterior se conserva por lector con fixture explícita, no hay importación histórica real autorizada. Sin SQL/Excel/VPS/datos reales.

## H1 — resolución de Álex (2026-10-25)

Pruebas focales añadidas (`apps/api/src/anticipos.test.ts`, prefijo H1). Las anteriores AC siguen vigentes.

| Caso | Resultado |
| --- | --- |
| CAT012 sin REF rechazado; CAT012 con REF, REF opcional e Ingreso asociados; banco +2000 céntimos exacto; `operaciones` 2; `relacionados` 3 sin motivo; cobertura Verificada | PASS |
| Gasto/Ingreso con bloque `anticipo` rechazado; estado idéntico | PASS |
| Histórico con REF inactiva: nuevo enlace rechazado; rectificación conservada; motivo de inactiva; sin metadatos | PASS |
| Rectificación y anulación de relacionados revierten banco exacto; Transferencia acreditada no cambia de tipo ni de REF; rectificación conservando Transferencia; anulación retira acreditación | PASS |
| Transferencia pendiente degrada cobertura a Parcial; Gasto relacionado no | PASS |
| Amortización de Deuda | UNRUN: requiere fixture de Deuda; sin ampliar contrato |
| Schema 13 (tres aserciones) | macOS FAIL por `libc.so.6` (plataforma); copia desechable PASS |
| Suite API completa en copia desechable | 186 PASS / 5 FAIL de plataforma sobre 191 |
| E2E anticipos | PASS 1/1 |
| CI Linux | UNRUN; QA independiente pendiente |
