# 16 — E3.4 Revisión bancaria de Comida: testplan

Status: cobertura creada para DEV16 el 2026-10-26 antes de implementar. Los 37 IDs y
sus grupos se conservan. Estados iniciales: `Previsto`; se actualizan solo con evidencia
real. `C` = condicional a evidencia autorizada; `Futuro E3.5` y `Documental` no se
simulan ni se declaran PASS. AC-25 sigue abierto.

Entorno local de referencia: macOS, Bun 1.4.3, SQLite `bun:sqlite`, fixtures ficticias;
Playwright Chromium a 390×844 y 1440×1000. CI canónica: Ubuntu 24.04 x64 con Bun, Node,
`age` y Chromium. Un resultado local no sustituye CI Linux.

Comandos de referencia (desde la raíz):

| Código | Comando |
| --- | --- |
| API | `bun test apps/api/src/revision-comida.test.ts` |
| API focal | `bun test apps/api/src/revision-comida.test.ts -t "<patrón>"` |
| UI | `bun run test:e2e tests/e2e/revision-comida.spec.ts` |
| Canónica | `python3 scripts/verify --full` |
| Tipos/build | `bun run typecheck && bun run build` |
| Migración/continuidad | pruebas API de `database-v13` y reapertura/restore |
| Documental | `./scripts/validate-template && ./scripts/check-repository && git diff --check` |

## Grupos

| Grupo | AC | Verificable en DEV16 |
| --- | --- | --- |
| E3.4 | AC-01–AC-11, AC-13–AC-22, AC-24, AC-26, AC-28–AC-30, AC-32, AC-33, AC-35, AC-37 | Sí |
| Integración/visualización E3.5 | AC-27, AC-34, AC-36 | No; contrato futuro |
| Histórico | AC-12, AC-31 | Solo si existe evidencia autorizada; no se declara cobertura real |
| Documental | AC-23, AC-25 | Gate documental/migración |

## Matriz AC

| ID | Caso positivo | Caso negativo / límite | Comando | Entorno | Evidencia esperada | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Alta `Detalle` con ID, fecha, concepto, importe, dirección, clasificación, `esDevolucion` y evidencia; snapshot de Movimientos/Saldos sin cambios | ID no reutilizado; sin Gasto ni saldo paralelo | API focal `AC01` | Local/CI | ID estable, `movimientos` y `saldos` idénticos antes/después | PASS |
| AC-02 | Alta sin Movimiento; queda `Sin vínculo`; participa en cobertura y lectura | No suma a Movimientos/Saldos ni crea Gasto; no inventa vínculo | API focal `AC02` | Local/CI | DTO `Sin vínculo`, referencia con su fecha, snapshot central intacto | PASS |
| AC-03 | Vínculo verificado con evidencia; varias operaciones al mismo Movimiento | Sin evidencia → 422; no copia fecha/importe; una operación no apunta a varios Movimientos | API focal `AC03` | Local/CI | `estadoVinculo=Verificado`, `tipoVinculo`, IDs propios, Movimiento intacto | PASS |
| AC-04 | `Detalle` a `Gasto` agregado de Terminal con `tipoVinculo=Agregado terminal` | Movimiento no Terminal con agregado → 422; sin reparto/suma/Gasto nuevo | API focal `AC04` | Local/CI | `sinConciliacion=true`, sin efectos centrales | PASS |
| AC-05 | Mismo alta con la misma idempotency-key devuelve una fila | Payload distinto con misma clave → 409; dos operaciones legítimas iguales se advierten y no se bloquean por UNIQUE económica | API focal `AC05` | Local/CI | Un ID; aviso de coincidencia sin rechazo económico | PASS |
| AC-06 | Operación con fecha distinta de la del Movimiento vinculado | No sustituye fecha por la del Movimiento | API focal `AC06` | Local/CI | `fechaOperacion` propia y estable | PASS |
| AC-07 | Referencia con operaciones vigentes (incluidas `Sin vínculo`/`Sin evidencia`), reposición y anulada | Sin registros → `sin_referencia`; lector fallido → `error`; anulada no participa; no filtra por evidencia | API focal `AC07` | Local/CI | Máximo válido; `tblCiclos` único maestro | PASS |
| AC-08 | Periodo dentro del rango sin operaciones: `Sin operaciones` | Periodo anterior al primer registro: `Sin cobertura histórica`; sin relleno cero ni extrapolación | API focal `AC08` | Local/CI | Estados diferenciados y rango observado | PASS |
| AC-09 | Importe exacto `12.34` → `"12.34"` | Vacío/null/cero/negativo/float/tercer decimal → 422; sin default cero | API focal `AC09` | Local/CI | EUR string, rechazo exacto | PASS |
| AC-10 | `Detalle`+`Salida` con `false`; `Reposicion`+`Entrada` con `false`; `Detalle`+`Entrada` con `true` | `Reposicion`+`Salida` → 422; `Detalle`+`Entrada` con `false` o omitido → 422; `Detalle`+`Salida` con `true` → 422; sin invertir signo | API focal `AC10` | Local/CI | Matriz completa | PASS |
| AC-11 | `Fuera presupuesto` como valor exclusivo | `Comida`+`Fuera presupuesto` o valor desconocido → 422 en escritura nueva | API focal `AC11` | Local/CI | Enum exclusivo; sin nueva CAT/SUB/PAR | PASS |
| AC-12 | Lectura directa de fixture legacy con clasificación + marca histórica de fuera presupuesto | No normaliza ni pierde; no permite escribir la combinación | API focal `AC12` | Local (fixture sintético) | Campos de lectura preservados; sigue `C` | C: cubierto con fixture sintético; no se declara evidencia real |
| AC-13 | Contrato de grupos: `Ocio`+`Niños`+`Otros` = Compensable; `Pendiente revisar` = Gasto comida; `Fuera presupuesto` excluido | E3.4 no suma ni publica el agregado; solo metadatos de clasificación | API focal `AC13` | Local/CI | Grupos correctos, sin cifras de E3.5 | PASS |
| AC-14 | Reposición real con evidencia bancaria y sin Movimiento (`Sin vínculo`) | Sin evidencia u operación real → 422; no emite `Parcial`/`Completada`; `Sin asignación` | API focal `AC14` | Local/CI | `Vigente`, `Sin asignación`, sin estados E3.5 | PASS |
| AC-15 | Reintento de reposición con misma clave → un ID | Misma evidencia/operación real → una sola reposición; reutilizar Movimiento no es duplicado | API focal `AC15` | Local/CI | Sin fila/Movimiento ficticio extra | PASS |
| AC-16 | Reclasificación con revisión y motivo | Revisión obsoleta → 409; mismo ID; no simula recálculo E3.5/E4 | API focal `AC16` | Local/CI | Auditoría antes/después y snapshots ajenos intactos | PASS |
| AC-17 | Rectificar/anular Movimiento vinculado | Vínculo se muestra `Revisar`; no se reasigna; operación válida | API focal `AC17` | Local/CI | Estado derivado sin reescritura del vínculo | PASS |
| AC-18 | Intento de DELETE físico de operación/reposición/auditoría | Trigger rechaza; anulación lógica conserva historia | API focal `AC18` | Local/CI | `no delete`/`immutable audit`; filas conservadas | PASS |
| AC-19 | Rutas reales con MFA/Origin/CSRF y JSON válido | Sin MFA → 401; sin Origin/CSRF → 403; JSON inválido/sobredimensionado → 4xx; campos derivados → 422; sin SQL en respuesta/log | API focal `AC19` | Local/CI | Protecciones heredadas; sin escritura parcial | PASS |
| AC-20 | UI 390/1440: devolución explícita, `Sin vínculo`, `Sin evidencia`, vínculo agregado, tabla/tarjetas | Sin importes ficticios ni «Completado»; `Entrada` sin `esDevolucion` no se presenta como devolución | UI focal `AC20/29` | Local Chromium 390/1440 | Capturas e inspección; foco y teclado | PASS |
| AC-21 | Cerrar/reabrir archivo y restaurar copia con operaciones, devoluciones, reposiciones y vínculos | Sin resucitar intentos revocados; IDs/fechas/evidencias/auditoría conservados | API focal `AC21` | Local/CI Linux | Migración v13/v14/v15→v16, reapertura y restore cifrado v16 | PASS en CI Linux v16; reapertura local PASS |
| AC-22 | Consulta de la API/UI de E3.4 | No emite Recursos, Gasto comida, Compensable, financiación, Falta por reponer, neteo, `Parcial` ni `Completada` como propios | API focal `AC22` | Local/CI | DTO sin cálculos E3.5 | PASS |
| AC-23 | Revisión documental de cobertura | Aprobar cobertura completa sin AC-25/D-01-R(v5.11(7)) se rechaza | Documental | Documental | Declaración incompleta; sin vínculos artificiales | Documental |
| AC-24 | Vínculo inexistente/anulado/no elegible u revisión obsoleta → rechazo | 409/422 sin escritura parcial; vínculo histórico válido queda `Revisar` | API focal `AC24` | Local/CI | Sin filas parciales | PASS |
| AC-25 | Contraste físico v5.11(7) | Sin contraste acreditado; no se declara equivalencia ni cobertura completa | Documental | Documental | AC abierto; sin Excel/datos reales | Abierto |
| AC-26 | Varias operaciones/reposiciones al mismo Movimiento con evidencia | Cada vínculo conserva ID/evidencia; sin duplicación ni reparto; no altera Movimiento | API focal `AC26` | Local/CI | Dos IDs, un Movimiento intacto | PASS |
| AC-27 | Mostrar estado E3.5 si existiera | No se simula motor; sin tratamientos pendientes no se presentan totales completos | — | Futuro E3.5 | UNRUN; sin implementación | Futuro E3.5 |
| AC-28 | Crear/rectificar/anular reposición | ID estable, auditoría, anulación lógica no computa, idempotencia; sin DELETE ni reutilización | API focal `AC28` | Local/CI | Historial y estado correctos | PASS |
| AC-29 | Acciones responsive y errores | Nueva/editar/anular/vincular/ver; devolución/agregado/relación visibles; foco/teclado; vacío/carga/error/404/409/422/401; `Asignar` no simulado sin E3.5 | UI focal `AC29` | Local Chromium 390/1440 | Capturas, teclado y textos | PASS |
| AC-30 | Intento de reutilizar ID o duplicar identidad | Duplicado rechazado por PK/trigger; no renumera histórico | API focal `AC30` | Local/CI | Identidad estable, contador no reutilizado | PASS |
| AC-31 | Lectura de `Reposicion`, importe firmado o `Estado`/`Referencia` históricos | Preserva valores originales sin normalizar; no declara equivalencia | — | Histórico condicional | UNRUN salvo evidencia autorizada | C: UNRUN sin evidencia autorizada |
| AC-32 | Operación antes del primer ciclo, en hueco, fuera del ciclo filtrado, ciclo abierto y cobertura parcial | `Sin ciclo asignable`, `Fuera de ciclo`, `Ciclo abierto`, `Cobertura parcial` diferenciados; sin inventar Fin | API focal `AC32` | Local/CI | Estados explícitos; spec07 | PASS |
| AC-33 | Vincular `Fuera presupuesto` a Gasto con Partida | Partida/ejecución central sin cambios; solo excluye análisis auxiliar | API focal `AC33` | Local/CI | Snapshots de Movimientos/Partidas/Presupuestos intactos | PASS |
| AC-34 | Consumo de reposición por E3.5 | Una sola vez; no se suma como ingreso/recurso | — | Futuro E3.5 | UNRUN; sin simulación | Futuro E3.5 |
| AC-35 | Elegibilidad de vínculo: `Detalle`→Gasto individual/agregado Terminal; `Reposicion`→Transferencia interna/Ingreso | Transferencia de financiación, Exterior/D5, Gasto para reposición, Ingreso a Exterior o agregado no Terminal → 422; sin elegible → `Sin vínculo` | API focal `AC35` | Local/CI | Matriz completa, incluida rama Ingreso y Exterior/D5 | PASS |
| AC-36 | Recálculo E3.5 tras reclasificación | No se simula en E3.4; snapshots inmutables no se modifican | — | Futuro E3.5 | UNRUN | Futuro E3.5 |
| AC-37 | Operación sin evidencia bancaria (`Sin evidencia`); relación de compra opcional; vínculo sin evidencia → 422; reposición sin evidencia → 422 | Relación incompleta → 422; sin estado de relación; no penaliza cobertura/referencia | API focal `AC37` | Local/CI | Tres evidencias separadas | PASS |

## Evidencia de ejecución

No se declaran PASS de AC futuros, condicionales sin evidencia autorizada ni
documentales. Un fallo heredado se registra y detiene solo lo afectado; no se rebajan
guardas ni se investiga fuera de alcance.

| Fecha | Comando/entorno | Resultado | AC cubiertos | Notas |
| --- | --- | --- | --- | --- |
| 2026-10-26 | `bun test apps/api/src/revision-comida.test.ts` (macOS, Bun 1.4.3, SQLite memoria/archivo, fixtures ficticias) | **PASS** 15 pruebas / 0 fallos / 215 expect | AC-01–22, 24, 26, 28–30, 32–33, 35, 37 (excepto restore cifrado) | Incluye matriz, evidencias, vínculos, auditoría, triggers, idempotencia, concurrencia a dos conexiones, referencia/cobertura, migración v13/v14/v15→v16 y reapertura |
| 2026-10-26 | CI Linux [run 40410650558](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40410650558), commit `77a311d` | **PASS**: API 259/0/3721 expect; 11 E2E; baseline/full/required success | AC-21 restore cifrado v16, integración Vehículos/Compartidos y regresión completa | `(pass) AC21: restore cifrado v16 conserva operaciones, devoluciones, reposiciones, vínculos, evidencias y auditoría`; `Application phase: PASS` |
| 2026-10-26 | Merge `origin/main` `5ad75ed` en `d179515`; fix backup `77a311d` | **PASS** | Integración v16 | Vehículos v14 y Compartidos/Base B v15 preservados; conflictos resueltos; sin rebase/force |
| 2026-10-26 | `bun run typecheck` | **PASS** | — | TypeScript sin errores |
| 2026-10-26 | `bun run build` | **PASS** | — | Vite 8.3.4, 34 módulos |
| 2026-10-26 | `bunx playwright test tests/e2e/revision-comida.spec.ts` (Chromium 390×844 y 1440×1000) | **PASS** 1 recorrido | AC-05, 20, 29 y apoyo AC-02/03/04/10/14/17/28/32/37 | MFA real, escrituras reales, vincular/desvincular UI, coincidencia advertida, 422/409/404, vacío/cobertura, «Todos» con anuladas, 390 ficha/formulario, foco y 401 de UI; capturas en `artifacts/e3-4/` |
| 2026-10-26 | `python3 scripts/verify baseline` (Python 3.12.16) | **PASS** baseline | Documental/calidad | check-repository, check-project, validate-template, test-checks, test-validator, agent-usage y whitespace |
| 2026-10-26 | `python3 scripts/verify --full` (macOS) | **FAIL platform** en API; e2e canónico **UNRUN** | — | 47 fallos locales por `libc.so.6` (publicación atómica/restore Linux), no introducidos por DEV16. Baseline PASS, typecheck/build PASS. CI Linux PASS |
| 2026-10-26 | `bun test apps/api` en worktree base `main` 5ad75ed (mismo entorno) | 197 PASS / 46 FAIL | — | Fallos de plataforma sin DEV16; el candidato local 212 PASS / 47 FAIL (el fallo adicional es restore v16, PASS en CI Linux) |
| 2026-10-26 | `bun test apps/api/src/ciclos.test.ts -t "03 AC01"`; `movimientos.test.ts -t "04 AC13"`; `flujo-mensual.test.ts` | **PASS** 2/2, 1/1, 13/13 | Regresión de referencia/cobertura | La fuente Revisión Comida se integra sin alterar Movimientos ni el maestro Ciclos |
| 2026-10-26 | `bunx playwright test tests/e2e/movimientos.spec.ts` | **FAIL platform** en restore server | Regresión UI de Ciclos | El recorrido previo (incluido el texto de conciliación actualizado) pasa; el restore cifrado no arranca en macOS por la misma limitación de `libc.so.6` |


## COMIDA-UNICO-01 — cobertura candidata CU (2026-10-30)

No sustituye ni hereda resultados de los 37 AC anteriores. Todos los CU son UNRUN:
no existe candidato de implementación. Matriz de acciones/resultados y decisiones
P1–P5 en [specification](16-revision-comida-specification.md#comida-unico-01--candidato-de-refinamiento-revisión-1-2026-10-30).

| Casos | Riesgo y prueba prevista | Verificación / entorno | Estado |
| --- | --- | --- | --- |
| CU-01/02/03/12 | Transferencia/compra única, banco y ejecución; snapshots antes/después de tablas | Tests de dominio/API de Movimientos, Revisión y planes; fixtures Bun/SQLite | UNRUN |
| CU-04/08 | Bordes Inicio/Fin, alta tardía, agregado solapado y legado sin doble reconocimiento | Tests de Ciclos y Revisión con ventanas sintéticas | UNRUN |
| CU-05/10 | Metadatos, rectificación/anulación, coincidencias e idempotencia concurrente | Tests API/HTTP con MFA/CSRF y dos escritores; E2E flujo de revisión | UNRUN |
| CU-06 | Devoluciones parciales/múltiples, sin origen, exceso, compra anulada, cuenta distinta, cruce de ciclos y neto negativo | Tests Movimientos/consumidores según P1/P4 aprobadas; neteo condicionado a P5 | UNRUN |
| CU-07 | Apertura acreditada/ausente, transferencias previas no resuman, cobertura insuficiente y no conciliado | Tests posición por régimen con fixture 100+800−45+10=865; régimen condicionado a P2 | UNRUN |
| CU-09 | Anticipos, reposiciones, Compartidos, plan mensual, flujo y anual sin regresión | Suites de cada consumidor; comparación de resultados legado por mismo fixture | UNRUN |
| CU-11 | Upgrade desde v18, rollback de fallo, reapertura, contrato estricto/FK, restore e intentos revocados | Suite esquema/backup en CI Linux; sin bases reales; versión futura aún no asignada | UNRUN |
| CU-05/10/11 | 390/1440, foco/teclado, vacío/error/409/422, navegación al mismo Movimiento | Playwright de Revisión/Movimientos con capturas ficticias | UNRUN |

Entrada canónica futura: `python3 scripts/verify --full` sobre SHA de código estable,
con comandos focales definidos al aprobar esquema/API; no se inventan nombres de tests
que todavía no existen. CI Linux global y QA independiente exigidas. La validación
documental de este candidato no acredita conciliación bancaria ni equivalencia Excel.

### P5 — ampliación de cobertura, 2026-10-30

CU-13–CU-16 UNRUN (ver acciones/resultados en specification). Futuras pruebas de
planes-ciclo: 100/50/15 => 35/65; devolución anterior 40 => banco +40/neto observado
−40/Ejecutado 0; Partida sin temporalidad y NULL => cobertura pendiente sin neteo
provisional; Aportación conserva 800. Regresiones plan-anual/flujo conservan bruto
con explicación de semántica; E2E comprueba métricas/estado/% y origen separado.
No se simula FIN_NETA ni se atribuye 8 de 13 sin reparto aprobado. Tests funcionales
pendientes de candidato; entrada canónica futura verify --full y QA independiente.

### P6 — ampliación de cobertura, 2026-10-30

CU-17–CU-20 UNRUN: fixtures de clasificación, devolución y reposición prueban 50−15−20
=> Falta 15; devolución antigua no reduce obligación actual; etiqueta Pendiente revisar
no equivale a estado de Partida NULL; Fuera presupuesto preserva banco; reintentos y
asignación acreditada no duplican reposición ni recuperación Anticipo. Comandos focales
se concretarán con implementación; entrada verify --full y QA independiente. Recursos
y cierre analítico: contrato bloqueado por fuente ausente, no caso simulado ni PASS.

### P7 — cobertura propuesta (no aprobada), 2026-10-30 [HISTÓRICO SUPERADO]

CU21–24 UNRUN: dominio/API comprobará 100+700+20−35=Recursos785, Falta15,
D480/cierre580, devolución antigua40=>cierre620 sin cambiar Recursos, B_A250=>banco770
con diferencia−150. Casos negativos: falta S0/B/cobertura/clasificación, residual sin
explicación, reposición de otra obligación, Fuera presupuesto y doble descuento de
Anticipo. Ciclo abierto mantiene Fin vacío; sin duración, equivalentes/margen no
disponibles. Revisión E2E mostrará desglose y procedencia, sin columna económica
editable paralela. Futuras suites verifican por métrica; no reemplaza CI Linux ni QA.
Estado histórico de esta matriz: entonces no se afirmaban fórmulas aprobadas; la
confirmación P7 posterior sustituye ese estado. Pruebas funcionales siguen UNRUN.

### Estado vigente P7 / contrato candidato revisión 2 — 2026-10-30

P7 aprobada por mensaje humano «Apruebo P7» sobre 96a07d1; reemplaza el estado
propuesto de la matriz anterior, que conserva su historia. Fuente aportada según
relay0020/21, sin inspección propia de Codex ni equivalencia certificada con (7).
CU01–24 siguen UNRUN: aprobación de fórmula no prueba funcionalidad.
Contrato técnico candidato revisión2 y wireframes pendientes de aprobación completa.
Ampliar CU06/CU09 con devolución de compra ING recibida en otro Saldo: efecto bancario
solo en receptor real, D de ING excluye esa entrada; puente identifica efecto externo,
netos solo con elegibilidad acreditada, sin Transferencia ficticia. Metadata/legado
con IDs numéricos coincidentes se resuelven por ruta/procedencia, nunca por adivinación.
Esquema/restore y guards se verifican contra candidato real posterior, sin datos reales.

### Revisión 0022 — observaciones abiertas, 2026-10-30

Aprobación completa de revisión2 suspendida. CU06/09/17/21–23 amplían caso con números:
S0=B_A100, compra Ocio ING50, devolución15 en otra cuenta, reposición ING20 => Falta15,
banco70, Recursos85, puente−15. Comprobar etiqueta «obligación económica», no dinero
para restaurar banco; sin transferencias ficticias ni nueva métrica de restauración.
CU24: añadir variantes a contrastar de duración provisional acreditada/desconocida y
falta de cobertura. Son casos propuestos pendientes de fuente/enmienda a P7; no se
sustituye la regla aprobada de duración ni se inventa Fin. Todos siguen UNRUN.
