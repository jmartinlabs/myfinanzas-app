# 07 — E2.1 Operación de Ciclos: Test plan

## Verificación del candidato reconciliado — 2026-10-23

Estado: operación E2.1 verificada y pendiente de revisión/merge de PR #49.
Código candidato `a2722f4d57d600d09cbf256ddbea906019cbbd1f`, base main `8fae7a44`;
los apartados inferiores conservan la historia y los bloqueos previos, no el estado actual.

| Gate actual | Evidencia real | Resultado |
| --- | --- | --- |
| AC23 heredada | 5 ejecuciones locales y 5 en gate Linux, 18 aserciones cada una; escenario incluido además en API completa | PASS, sin errno11 en estas ejecuciones |
| AC23 continuidad | O4: v7/v8 genuinas, demo/production ficticias, origen/clave, presupuestos/enlaces, deuda/hechos/auditoría/MFA; O5/O7: rollback/desconocido y dos procesos v7/v8 | PASS Linux |
| AC24 copia/restore | age real, formatos históricos hasta e2.2-v8 y nuevo e2.1-v9; revoca sesiones/intentos de ambos módulos, conserva historia y recupera MFA | PASS Linux |
| API completa | 125 PASS / 0 FAIL / 2228 aserciones | PASS Linux |
| Tipos/build/controles | Instalación congelada Bun1.4.3, typecheck/build, repositorio/proyecto/validador y regresiones | PASS local y Linux |
| E2E/AC25/26 | 2 PASS; recorridos E1.1–E1.6/E2.1/E2.2 y restore/MFA; capturas ficticias390/1440 inspeccionadas | PASS Linux e inspección |
| QA independiente | 9 pruebas propias PASS/167 aserciones; probe de antiguo schema8 Dev07 rechazado con bytes/versión intactos; delta final revisado | Sin bloqueos |

CI por SHA: [39974920637](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39974920637),
COMPLETED/SUCCESS sobre `a2722f4`. QA contrastó además sus logs y capturas.
Hallazgos corregidos: mes financiado antes/después explícito y detalle por fecha/ID
decimal exacto antes de paginar. O3 actual:109 hechos, páginas100/9, IDs superiores
a2^53; ejecución del caso final1 PASS/10 aserciones. Destinos de backup de pruebas v9 coherentes.

AC01–26 operativos verificados con la matriz histórica y la evidencia actual anterior.
AC23 deja de bloquear esta entrega por la evidencia acumulada de regresiones, continuidad,
suite global y QA, no por una ejecución aislada. No se afirma ausencia absoluta de carreras.
AC27–29 y E2.1-AC2 del roadmap permanecen PENDING de sus módulos futuros.

## Opción B — impacto temporal de Revisión Comida (candidato PR #128, 2026-10-29)

**Estado:** candidato implementado, sin merge ni cierre de SPEC07. Base `main` `f69d7d2`.

| Caso nuevo | Evidencia |
| --- | --- |
| O4 C07-F1/F2 | Comida creada tras la preview no aparece retroactivamente; nueva preview la enumera; confirmación antigua 409 sin escrituras |
| O5 C07-F2 | Comida existente: `totalMovimientos=0`, `totalVigentesAfectadas=1`, antes C1/después sin ciclo; confirmación la reatribuye |
| O6 R1a/R1b | Máximo crudo sin efecto → huella estable; referencia agregada 20→21 → huella distinta y 409 |
| O7 R2 | Anulada afectada mostrada como histórica; cambio de estado invalida; cambio de concepto no invalida |
| O8 | Comida vacía/ausente y fallo de lectura de filas: cobertura distinta; error controlado 409 |
| O9 | 105 operaciones: página 1/2, total completo, misma huella |
| B1 | Periodo completo: mismo ID con intervalo distinto se enumera; regresión añadida |
| B2 | Límite de «Siguiente Comida» con `max(vigentes,históricas)`, no suma; prueba 105+105 |
| T1 | Fallo exclusivo de `revisionComidaRows()` con `revisionComidaSource()` disponible: 409 sin escrituras |

- `cycle-operations.test.ts` sin backup Linux-only: **17 pass / 0 fail** (B1/T1).
- `cycle-pagination.test.ts`: **1 pass** (B2, 105/105).
- CI Linux `critical` run `40855942703` sobre `f6fd2bb`: **311 API PASS**.
- Typecheck/build PASS. E2E local: fallo de arranque del servidor de restauración en
  `catalog`/`movimientos`; **UNRUN** para este contrato, no se declara PASS.
- AC28 sigue **PENDING**: solo se integra atribución temporal de Comida; no inversión,
  E3.5, conciliación, cierre ni maestros adicionales.

Capturas: `artifacts/e2-1/` del artifact de CI, incluyendo listado/ficha/formulario,
revisión/errores/historial y cambio de mes en390/1440. Se conserva diseño claro aprobado,
teclado/foco y contraste; el delta añade los dos meses explícitos sin rediseñar.
Límites: macOS no sustituye la referencia productiva Linux/glibc/age; archivos históricos
Cloud no recuperados. Dev32/infraAC22/B4/E2.3 fuera de alcance. Solo fixtures ficticias;
sin migración operativa, datos reales ni despliegue. Merge requiere aprobación expresa
del usuario por PR #49. El commit posterior de cierre solo modifica documentación.

## Reanudación autorizada — 2026-10-23 (candidato reconciliado, no integrado)

La instrucción expresa del usuario de esta sesión revoca STOP únicamente para Dev07.
Se incorpora origin/main 8fae7a44 mediante merge preservando los 8 commits originales.
SQLite31-E1 permanece intacto; E2.2 conserva v8 y Dev07 pasa a v9. Fixture v8 congelada
captura el builder integrado previo, sin renumerar una base nueva. O4 cubre v7/v8,
demo/production ficticias, Presupuestos/enlaces/intentos y MFA; restore revoca ambos intentos.
Conflictos ordinarios de schema/backup/tests/fixture/CSS/E2E resueltos conservando módulos.

Resultados locales macOS Bun1.4.3: install congelado, typecheck y build PASS.
Regresión heredada AC23: 5 ejecuciones independientes, cada una 1 PASS/18 assertions;
O5/O7 desde v7 y v8: 4 PASS/32 assertions. No reaparece errno11 en estas pruebas;
esto no acredita por sí solo cierre global ni sustituye Linux/QA del candidato.
Suite API completa, O4 productivo, E2E/visual y CI Linux pendientes del candidato.
Correcciones QA: revisión expone mes financiado antes/después; detalle ordenado por
fecha/ID decimal exacto antes de paginar. O3 enfocado PASS (1/8), tipos/build PASS;
validate-template PASS tras corregir referencias portables. Destinos backup de pruebas
actuales coherentes con v9. E2E añade cambio de mes real sin confirmar escritura.
El directorio histórico work/ del worktree Dev07 y los artefactos del handoff no existen localmente:
se conservan sus referencias documentales, sin afirmar recuperación de esos archivos.
Dev32/infraAC22/B4/E2.3 y datos reales/deploy permanecen fuera de alcance.


2026-10-22. Implementación autorizada, specification integrada PR37/c04dc07.
**Verificación global BLOQUEADA** por el fallo de apertura concurrente heredada
registrado abajo; no se declara entrega publicable. Resultados locales, sin CI remota.
E2.1-AC2 pendiente hasta Comida E3.5; AC27–29 no son pruebas actuales aprobadas.

## Evidencia reproducible

Toolchain: Bun1.4.3, age1.3.2, Chromium del entorno, datos íntegramente ficticios.
`bun run typecheck` PASS; `bun run build` PASS. Suite específica
`NODE_ENV=test bun test apps/api/src/cycle-operations.test.ts`: O1–O9 PASS,
171 assertions en ejecución específica; las nueve también PASS dentro de la suite
completa posterior, incluida la limpieza instrumental de procesos.

`bun run test`: **105 PASS / 1 FAIL**, 106 tests/1713 assertions/25,80s.
Log local no publicado `work/api-final.log`, líneas125–147: escenario heredado
`04 AC22/23/28: dos procesos actualizan v3, reintentan alta y compiten en rectificación`.
Diagnóstico: operación `upgrade`, fase `open`, `SQLiteError`, code `UNCLASSIFIED`,
errno11, localización `database-identity.ts:13:6`; proceso hijo exit1.
Una única comprobación afectada posterior, `NODE_ENV=test bun test apps/api/src/movimientos.test.ts`,
12 PASS/270 assertions/2,53s (`work/movimientos-repeat.log`), **no cierra el FAIL**.
Control base acotado del coordinador en main c04dc07, mismo escenario:1 PASS/18
assertions en una ejecución. No demuestra ausencia/intermitencia ni atribuye causa a E2.1;
el fallo del candidato sigue abierto. Sin reparación de apertura
ni investigación/reanudación Dev32. Verificación global pendiente de resolución.

Regresión enfocada anterior de cuatro módulos:41 PASS/862 assertions
(`work/structural.log`); no equivale a suite íntegra.
Primer intento completo:94 PASS/6 FAIL por expectativas técnicas de esquema7
tras upgrade8 y consulta legado sin columna revision; corregidos sin cambiar importes,
fechas ni reglas. Primeras fixtures O4 fallaron por columnas de catálogo y banco
inexistente en producción: corregidas creando datos ficticios mediante servicios reales.
Primer O2 usó por error una fecha de mes duplicado para comprobar salto de vecino;
se corrigió el dato del test conservando ambas validaciones.

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e`:
**2 PASS/47,6s**, catálogo17,6s y financiero27,5s (`work/e2e-final.log`).
Incluye recorridos previos E1.1–E1.6 y E2.1 con restore age, re-enrolamiento MFA,
lectura de Deuda/posición y recuperación de maestro/historial E2.1. Primera pasada
financiera enfocada:1 PASS/30,5s (`work/e2e-first.log`), luego repetida por mejoras
en detalle de intervalos, limpieza de procesos y comprobación real de teclado/contraste.
Sin traces, storageState ni factores en artifacts. Logs privados en work no publicados.

## Matriz de los 26 criterios actuales

O1–O9: `apps/api/src/cycle-operations.test.ts`. C03: `apps/api/src/ciclos.test.ts`.
E07: `tests/e2e/cycle-operations.ts`, ejecutado desde movimientos.spec.ts.
Cada PASS es evidencia del caso indicado; el FAIL global mantiene el gate abierto.

| AC | Acción y resultado comprobado | Evidencia | Resultado local |
| --- | --- | --- | --- |
| 01 | Alta ordinaria posterior conserva contrato y deriva Fin sin cierre ni ingreso | C03 alta; E07 alta futura real para invalidar contexto | PASS |
| 02 | Omitido anterior/intermedio, ID estable, vecinos y mes derivados | O1/O9; E07 omitido antes del primero | PASS |
| 03 | Motivo vacío rechazado sin escritura, contrato ordinario conservado | O2/O9; E07 error real422 | PASS |
| 04 | Fecha/mes duplicado/inválido no consume ID, borrador preservado | O2/O9; E07 validación y borrador | PASS |
| 05 | Rectificar dentro vecinos conserva ID y hechos | O1/O8; E07 | PASS |
| 06 | Saltar vecino o duplicar mes no escribe | O2 | PASS |
| 07 | Incluye desde Sin ciclo, anulados y cambio periodo del mismo ID, antes/después completos | O1/O8; E07 y capturas intervalos por hecho | PASS |
| 08 | 107 hechos, páginas100/7, huella y maestro completos | O3; C03 paginación | PASS |
| 09 | Resultado coincide con revisión; IDs/fechas/importes/auditorías originales idénticos | O1/O4; E07 compara hechos y auditorías originales | PASS |
| 10 | Cero/negativo exactos; ausente/null/número/tercer decimal rechazados | O1/O9; E07 negativo y cero | PASS |
| 11 | No propaga saldo Comida al siguiente ni cambia banco | O1; E07 siguiente e invariancia | PASS |
| 12 | Conciliación no disponible y motivo explícito, sin comparar cero | O9; E07 ficha/revisión | PASS |
| 13 | Vacío/anterior primero/futuro y error fuente instalado siguen contrato común E1.3 | O1/O9; C03 referencia/fuente error; E07 cabecera | PASS |
| 14 | Inicio−1/Inicio/Fin/siguiente, ejercicio, bisiesto/DST civiles | C03 calendario y procesos TZ; O1 | PASS |
| 15 | Intervalo temporal derivado, sin cierre/foto ni motor nuevo | O1/O9; E07 textos y facts invariables | PASS |
| 16 | Actual consultado cambia con Inicio; referencia y posiciones/capital permanecen | O1/O4; E07 antes/después | PASS |
| 17 | Cambiar revisión de hecho/maestro invalida preview409; borrador se conserva | O2/O7; E07 cambia maestro entre preview/confirmación | PASS |
| 18 | Dos procesos reales con barrera: una escritura/un conflicto, sin duplicados | O7 (v7→8 y confirmación concurrente) | PASS |
| 19 | Mismo intento reproduce resultado; payload distinto conflictúa; respuesta perdida no duplica | O2/O8; E07 corta respuesta tras write real | PASS |
| 20 | Fallo audit/intento revierte maestro/revisión/counter/audit/intento/guard | O2/O9, snapshot íntegro y siguienteID2 | PASS |
| 21 | Historial actor/UTC/motivo/antes/después; derivados incluso replay y DELETE rechazados | O6/O8/O9; E07 historial real | PASS |
| 22 | Sin MFA401, sin Origin/CSRF403; contrato de errores técnicos heredado preservado | O6; suite de seguridad existente; E07 fallo503 de presentación | PASS |
| 23 | Fixture v7 genuina demo/producción privada con Deuda/hechos/audit/MFA; DDL rollback, desconocido intacto, dos upgrades | O4/O5/O7 PASS; apertura concurrente v3 heredada FAIL en suite global | **BLOQUEADO gate regresión** |
| 24 | age/manifiesto8/origen, restore aislado recupera hechos/historial y revoca sesiones/intentos | O4; E07 restore+MFA heredado | PASS |
| 25 | Flujos reales390/1440, sin overflow, teclado/foco/contraste y capturas inspeccionadas | E07; inspección descrita abajo | PASS |
| 26 | Vacío/carga/error/401/404/409/422 y borrador diferenciados | O6/O9; C03 HTTP; E07 carga/error503/422/409/retorno y vacío de afectados | PASS |

## Inspección visual y accesibilidad

Capturas ficticias locales `artifacts/e2-1/*.png`: listado, ficha, formulario,
impacto, error, carga, historial y omitido. Impacto e historial/formulario a390/1440
inspeccionados. Sin overflow; paneles, motivo, confirmación y pendiente Comida legibles.
Tab desde Volver al borrador alcanza Confirmar; foco del motivo y revisión automático
comprobados; foco visible heredado. Color calculado real de Confirmar:
texto rgb(36,50,14) sobre rgb(141,187,46), contraste6,04:1 (sin cambio de tokens).
No se usa solo color para errores/pendientes/vigencia.

Tres mejoras justificadas dentro del diseño aprobado: separación de paneles para
jerarquía, tarjetas de hechos que ajustan líneas en móvil, y periodos antes/después
por hecho para hacer visible un cambio conservando ID. Se reejecutó Playwright tras
aplicarlas. No se justifican dos cambios adicionales solo para alcanzar cinco;
se conserva diseño común, incluido control date nativo dependiente del navegador.

## Contratos futuros revisados, no implementados ni probados

| AC | Dependencia | Estado |
| --- | --- | --- |
| 27 C | Cierre real Comida E3.5 y aviso apertura distinta | PENDING; E2.1-AC2 NO verificado |
| 28 C | Fuentes reales Comida/inversión y cobertura común | PENDING integración E3/E4; pruebas de contrato temporal no equivalen a motores reales |
| 29 C | Cierres/protecciones transversales DT5/P5/E4 | PENDING; sin cierres ni fotos ficticias |

QA independiente revisa SHA fijo y probes aislados; coordinador consolida dictamen
y evidencia de CI sobre el candidato final. Sin merge autorizado.

## Conciliación final del coordinador — 2026-10-22
QA independiente sobre53cc238 (código d63442e): dictamen funcional favorable,
sin nuevos defectos detectados. Probes originales corregidos; ejecución QA
propia8/154, probes3/22 yO9 adicional1/17 PASS. E2E Developer2/47,6s contrastado
por QA mediante código/log/capturas. No se atribuye a QA la suite E2E completa.

AC23 y gate API global siguen BLOQUEADOS por105 PASS/1 FAIL errno11. Control
base c04dc07 del coordinador1 PASS/18 no demuestra causa ni cierra el fallo.
Un único probe de dos procesos con barrera e instrumentación temporal segura
dio lecturas immutable/live correctas y una DDL8; no reprodujo ni identificó
handle del fallo original. Sin cambios de apertura/guardas ni reanudación Dev32.
No se propone corrección causal sin evidencia.

Se prepara PR funcional en estado DRAFT para revisión con evidencia y CI por SHA,
no entrega verificada ni merge automático. Un CI posterior verde no se presenta
como resolución de esta incidencia. Ampliar la ruta heredada de diagnóstico
requiere decisión de alcance; no se oculta como trabajo funcional completado.
