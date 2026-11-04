# 27 — E4.9 Cierre financiero y primera fotografía: Test plan

Specification: [27-e49-cierre-financiero-specification.md](27-e49-cierre-financiero-specification.md)

Status: **APPROVED — diseño documental.** DEV-06 (2026-11-04) amplía la coherencia
AC-20 a los totales de hechos capturados y completa T2 de Referencias/Deudas con
impacto + huella de consumidores + motivo + auditoría, T3 por campo en las entidades
aplicables y guardas de Presupuestos, plan vivo y Revisión Comida. T1 se mantiene en el
texto aprobado de SPEC27: 409 `HISTORY_LOCKED` por fecha en ventana cerrada
(AC-03/AC-04) y bloqueo de hechos anteriores cuando pueden alterar lo capturado o el
impacto no es verificable. AC-03/AC-04/AC-05/AC-06/AC-14 y la ampliación AC-20 tienen
prueba de fixtures en `apps/api/src/e49-guards.test.ts` (PASS de fixtures, no cierre
real). El resto de AC sigue UNRUN. No hay CI, migración nueva ni datos reales. Aprobado
con SPEC27 el 2026-10-28; DT3/DT4 resueltas el 2026-10-28 y DT6/T-BKP sigue abierto.

> **Nota T1 (2026-11-04).** La lectura por impacto que permitía escrituras sin efecto
> económico dentro de una ventana cerrada fue una **propuesta** de DEV-05, no una
> enmienda aprobada. Prevalece SPEC27 aprobada: la fecha manda y AC-03/AC-04 exigen 409
> sin excepción por «sin impacto». La propuesta por impacto queda pendiente de enmienda
> formal y no se usa como criterio de PASS.

Base: `main` `f077b7e`, esquema 18.

| Acceptance ID | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Plataforma/owner | Evidencia esperada | Estado actual | Candidato/fecha |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Ciclo con ventana, S0, plan o `SinPlan` y backup; cerrar | Cierre y foto; `Cerrado`; metadatos con versión de app y esquema; sin ciclo siguiente | Bun Test + SQL snapshot | Documental; API futura | Cierre/foto y snapshot | UNRUN — diseño | — |
| AC-02 | Ciclo sin siguiente Inicio | Bloqueo por `SIN_SIGUIENTE_INICIO`; no Fin inventado ni cierre | Bun Test + UI | Documental; API/UI futura | DTO con motivo | UNRUN — diseño | — |
| AC-03 | Alta/rectificación/anulación de Movimiento con fecha en ventana cerrada | 409 `HISTORY_LOCKED`; sin escritura | Bun Test de guarda | Documental; API futura | Respuesta y snapshot | **PASS (fixtures API)** — `e49-guards.test.ts`: altas, rectificaciones (incluida solo concepto/nota), anulaciones y cambios de fecha en enero cerrado devuelven 409 y no escriben; un hecho anterior a la ventana que altera efectivo capturado o cuyo impacto no es verificable también devuelve 409. No cubre UI ni cierre real. | 2026-11-04 |
| AC-04 | Mover un Movimiento desde/hacia una ventana cerrada | 409; fecha antigua y nueva comprobadas; sin escritura | Bun Test de guarda | Documental; API futura | Respuesta y snapshot | **PASS (fixtures API)** — `e49-guards.test.ts`: rectificaciones desde/hacia enero cerrado y hacia una ventana cerrada desde un hecho abierto devuelven 409 en Movimientos, Compras y Ventas, con fecha antigua y nueva comprobadas y sin escritura. | 2026-11-04 |
| AC-05 | Reclasificación T2 en ciclo cerrado | Impacto/motivo/auditoría; foto intacta. Saldos: preview/fingerprint/motivo/auditoría para cambios no fotografiados y 409 para los materiales | Bun Test + UI | Documental; API/UI futura | Auditoría y foto | **PASS (fixtures API)** — `e49-guards.test.ts`: clasificación exige `RECTIFICATION_REQUIRED`, la vista previa marca `used` y la rectificación deja auditoría; Saldo no capturado usa `/impacto` + `/rectificar` con motivo; apertura/tipo/control capturados siguen en 409. Presupuestos exige `/impacto` + fingerprint + motivo + auditoría tras cierre; plan vivo exige motivo/fingerprint y bloquea si la foto de plan es ilegible; Revisión Comida exige impacto/fingerprint en cambios económicos y permite `concepto` (T3) con motivo/auditoría. Foto idéntica. Sin UI. | 2026-11-04 |
| AC-06 | Renombrar Partida/Instrumento/Referencia/Deuda/Saldo/Presupuesto T3 | Permitido en campos informativos; foto conserva ID + versión; identidad/económico bloqueado por campo o revisado por T2 | Bun Test | Documental; API futura | Foto y nombre vigente | **PASS (fixtures API)** — `e49-guards.test.ts`: renombrar Partida, Instrumento, Referencia, Deuda, Saldo y Presupuesto devuelve 200; cambiar el ISIN del Instrumento tras el cierre devuelve 409 `HISTORY_LOCKED` con `campos`; en Referencia/Deuda/Instrumento el cambio económico sin huella devuelve 409 `IMPACTO_NO_VERIFICABLE` o exige T2. Foto idéntica. | 2026-11-04 |
| AC-07 | Cerrar con posiciones E4.1 anteriores y sin Compras nuevas | Foto con efectivo/posiciones a Fin, anteriores incluidas y posteriores excluidas; valoración/patrimonio `No disponible` | Bun Test de contrato | Documental; API futura | Foto con cobertura | UNRUN — diseño | — |
| AC-08 | Cerrar con E3.5/FIN_NETA no disponible | Cierre bloqueado; sin foto; no parcial ni completo | Bun Test + UI | Documental; API/UI futura | DTO de bloqueo | UNRUN — diseño | — |
| AC-09 | Backup sin evidencia/restauración | Bloqueo antes de escribir | Bun Test de preflight | Documental; API futura | DTO de bloqueo | UNRUN — diseño | — |
| AC-10 | Reintento idéntico y payload distinto | Misma foto; 409 `IDEMPOTENCY_CONFLICT` | Bun Test de idempotencia | Documental; API futura | Respuestas y foto | UNRUN — diseño | — |
| AC-11 | Cambio concurrente preview/confirmación | 409 `IMPACT_CHANGED`/`REVISION_CONFLICT` | Bun Test de concurrencia | Documental; API futura | Dos revisiones y 409 | UNRUN — diseño | — |
| AC-12 | Fallo dentro de transacción | Rollback total; sin cierre/foto | Bun Test de fallo inducido | Documental; API futura | Snapshot sin cambios | UNRUN — diseño | — |
| AC-13 | Reabrir/cerrar por vía ordinaria | Solo E4.10 reabre el último; cierre ordinario no reabre | Bun Test + UI | Documental; API/UI futura | Respuesta y estado | UNRUN — diseño | — |
| AC-14 | Consultar la foto tras T2/T3 | Foto inmutable; vistas vivas separadas | Bun Test + Playwright | Documental; API/UI futura | Foto y vista viva | **PASS parcial (fixtures API)** — `e49-guards.test.ts` compara la foto antes/después de reclasificación, renombrados, referencia, deuda, instrumento y revisión de Saldo: idéntica. Playwright/UI UNRUN. | 2026-11-04 |
| AC-15 | Consumidor Anticipos sin proveedor real | AC36 sigue PARCIAL; no completo con ficticio | Bun Test de contrato AC36 | Documental; API futura | Estado AC36 y proveedor | UNRUN — diseño | — |
| AC-16 | Operación E4.1 anterior al ciclo y posterior a Fin | Anterior incluida en posición/efectivo a Fin; posterior excluida; sin doble cómputo | Bun Test de corte E4.1 | Documental; API futura | Foto y snapshot | UNRUN — diseño | — |
| AC-17 | Cerrar con `SinPlan` | Permitido; foto registra `SinPlan`; no líneas inventadas | Bun Test + UI | Documental; API/UI futura | Foto con `SinPlan` | UNRUN — diseño | — |
| AC-18 | Cerrar con `PlanNoVerificable` | Bloqueado; sin foto | Bun Test | Documental; API futura | DTO de bloqueo | UNRUN — diseño | — |
| AC-20 | Cerrar con cierres posteriores, coherentes o con diferencia no explicable | Exige `CIERRE_FUERA_DE_ORDEN` con motivo, auditoría y comprobación al mismo corte incluyendo operaciones posteriores legítimas; compara efectivo, posiciones y totales de hechos (ingresos/gastos/neto); sin diferencia no explicable no altera posteriores; una diferencia no explicable o una foto sin totales legibles bloquea por `INCOHERENCIA_CON_CIERRE_POSTERIOR` | Bun Test + UI | Documental; API/UI futura | Auditoría, foto posterior y bloqueo | **PASS parcial (fixtures API)** — `e49-guards.test.ts` y `e49-api.test.ts`: cierre posterior coherente con hecho anterior y cuenta no capturada; totales capturados comparados; foto sin `hechos.totales`, total divergente o hecho no capturado en la ventana posterior bloquean. Sin UI ni cierre real. | 2026-11-04 |
| AC-21 | Cerrar ciclo sin hechos | Solo con ausencia acreditada de operaciones imputables en todas las fuentes; foto con `Sin hechos`; S0 (incluido 0) y posiciones heredadas se capturan; ausencia de Compras nuevas no es `Sin hechos` | Bun Test + SQL snapshot | Documental; API futura | Foto y snapshot | UNRUN — diseño | — |

## DEV-06 matrix T1/T2/T3

Lectura aplicada tras restaurar SPEC27 el 2026-11-04: T1 bloquea por fecha en ventana
cerrada (fecha antigua y nueva) y, fuera de ella, por el impacto de un hecho anterior
sobre lo capturado por una foto posterior; el impacto no verificable también bloquea.
La propuesta de permitir hechos «sin impacto» dentro de la ventana queda pendiente de
enmienda y no se aplica. T2 revisa con impacto/motivo/auditoría solo cuando la ausencia
de impacto material es demostrable. T3 valida por campo, no por fecha. La foto nunca se
recalcula.

| Nivel | Entidad/ruta | Informativo (T3) | Económico/foto | Proveedor y prueba |
| --- | --- | --- | --- | --- |
| T1 | Movimientos (`movimientos.ts`) | — (la fecha manda; no hay excepción informativa dentro de la ventana) | Fecha antigua/nueva en ventana cerrada: 409 duro. Hecho anterior que altera efectivo capturado o impacto no verificable: 409 | `assertDatesWritable` + `assertMovementClosureImpact`; test “Movimientos: 409 por fecha…” |
| T1 | Compras (`compras.ts`) | — (la fecha manda) | Fecha en ventana cerrada: 409 duro. Operación anterior que altera efectivo/posiciones capturados o impacto no verificable: 409 | `assertDatesWritable` + `assertOperationClosureImpact`; test “Compras: 409 por fecha…” |
| T1 | Ventas (`ventas.ts`) | — (la fecha manda) | Igual que Compras con signo de Venta | `assertDatesWritable` + `assertOperationClosureImpact`; test “Ventas: 409 por fecha…” |
| T1 | Ciclos | — | `Inicio`, `Fin` derivado y S0 de ciclo cerrado: 409 duro | `assertClosedCyclesUnchanged`; test “un ciclo cerrado no cambia Inicio ni S0” |
| T2 | Saldos (`saldos.ts`) | `nombre` | `tipo`/`control`/`apertura` capturados: 409 duro. Cambio económico con uso histórico no fotografiado: `/impacto` + `/rectificar` con fingerprint, motivo y auditoría | `saldoClosureConflict`, `previewSaldoChange`, `updateSaldo`; test “Saldos: bloquea lo material y revisa…” |
| T2 | Clasificación (`clasificacion.ts`) | `nombre` en categoría/subcategoría/partida | Jerarquía/atribución económica: `RECTIFICATION_REQUIRED` y flujo de impacto existente | `classificationClosureImpact`; test “reclasificación económica exige revisión…” |
| T2 | Referencias (`referencias.ts`) | `nombre` | `tipo`, `estado` y ficha de vehículo: `/impacto` con huella de consumidores + motivo + auditoría; sin huella 409 `IMPACTO_NO_VERIFICABLE`; identidad usada sigue protegida | `previewReferenceImpact` + `assertClosedEconomicImpact`; tests “catálogos distinguen…” y “Referencias y Deudas exigen impacto…” |
| T2 | Deudas (`deudas.ts`) | `nombre` | Resto de atributos: `/impacto` con huella de consumidores + motivo + auditoría; sin huella 409; apertura/Inicio usados siguen bloqueados | `previewDebtImpact` + `assertClosedEconomicImpact`; tests “catálogos distinguen…” y “Referencias y Deudas exigen impacto…” |
| T2 | Gastos compartidos (`compartidos.ts`) | `nombre` del participante | Rol/partes: vista de impacto + fingerprint + motivo + auditoría; alta de participante con hechos en ventana cerrada exige motivo | Flujo existente + `closedWindowsForDates`; test “Gastos compartidos: el alta de participante…” |
| T2 | Instrumentos (`instrumentos.ts`) | `nombre` (con el motivo ya exigido por la ruta) | `isin`/`divisaReferencia`/evidencia: 409 de identidad tras cierre | `assertClosedInformativeFields`; test “catálogos distinguen informativo de económico…” |
| T2 | Anticipos (`anticipos.ts`) | — | Metadatos de atribución y apertura: preview + fingerprint + proveedor de foto; corrección de foto existente bloqueada sin proveedor verificable | Flujo existente; `anticipos.test.ts` y `protectAnticipoChange`; sin cambios nuevos |
| T2 | Presupuestos (`presupuestos.ts`) | `nombre` | `fuente`/`destino`: preview + fingerprint + motivo + auditoría; tras cierre exige confirmación aunque no haya Partidas o plan | `previewBudget`/`updateBudget` + `hasClosures`; test “Presupuestos exige revisión de impacto…” |
| T2 | Plan vivo (`planes-ciclo.ts`) | — | Cambios de plan: fingerprint + motivo + auditoría; tras cierre exige motivo y bloquea si la foto no acredita el bloque de plan | `assertPlanClosureReview`; test “el plan vivo de un ciclo cerrado bloquea…” |
| T2 | Revisión Comida (`revision-comida.ts`) | `concepto`, evidencias y cuenta origen | Rectificación/anulación/vínculo económicos (fecha, importe, dirección, devolución, clasificación): `/impacto` + fingerprint + motivo + auditoría; sin huella 409; bloqueo si `auxiliares` no es legible | `previewRevisionComidaImpact` + `assertRevisionComidaClosureImpact`; test “Revisión Comida permite concepto y exige impacto…” |

Gaps explícitos: el alta de operaciones de `revision_comida` no exige motivo ni huella
porque no altera la foto almacenada; se documenta como fuente auxiliar, no como T2/T1.
La creación de una cuenta no capturada tampoco se bloquea si no altera el desglose de
efectivo de inversión. Los catálogos no fechados se validan por campo cuando existe
cualquier cierre. No se inventan guards para rutas sin escritura o sin efecto económico.
`cambiarEstado` de Presupuestos no se considera fuente/destino y conserva su auditoría
sin fingerprint. T3 no se aplica a Movimientos/Compras/Ventas con fecha en ventana
cerrada porque T1 estricto los bloquea antes; ampliar T1 a campos informativos requiere
una enmienda de SPEC27 y no se hace aquí.


## Regression checks

Ejecutado el 2026-11-04 sobre el bloque DEV-06 (worktree `dev-e49`, rama `feat/e49-cierre`):

- `bun run typecheck` — OK.
- `bun test apps/api/src/e49-guards.test.ts` — 18/18 PASS (incluye 8 pruebas DEV-06).
- `bun test apps/api/src/e49-api.test.ts apps/api/src/e49-migration.test.ts apps/api/src/e49-schema-contract.test.ts` — 58 PASS, 3 SKIP, 0 FAIL.
- `bun test apps/api/src/referencias.test.ts apps/api/src/deudas.test.ts apps/api/src/presupuestos.test.ts apps/api/src/planes-ciclo.test.ts apps/api/src/revision-comida.test.ts apps/api/src/clasificacion.test.ts apps/api/src/instrumentos.test.ts apps/api/src/saldos.test.ts apps/api/src/movimientos.test.ts apps/api/src/compras.test.ts apps/api/src/ventas.test.ts apps/api/src/ciclos.test.ts` — 134 PASS, 9 FAIL de entorno macOS (`Ancestro no confiable` en backup/restore/migración y estado privado), ninguno de los módulos tocados.
- `bun test apps/api` — 661 PASS, 8 SKIP, 56 FAIL, todos de entorno macOS (permisos de ancestro/aislamiento de proceso: `Ancestro no confiable`, subprocesos de producción y SQLite), no de los módulos tocados.

Cobertura de guards DEV-06: AC-20 compara `hechos.totales` (ingresos, gastos y neto) al
corte congelado de cada foto posterior y bloquea si faltan, son ilegibles o divergen;
cubre cierre posterior coherente, hecho anterior, cuenta no capturada, totales
divergentes y hecho no capturado en la ventana posterior. T2 Referencias/Deudas exige
`/impacto` + huella de consumidores + motivo + auditoría, con 409
`IMPACTO_NO_VERIFICABLE`/`IMPACT_CHANGED`. T3 mantiene listas blancas por entidad
(Movimiento, Compra, Venta, Saldo, Referencia, Instrumento, Deuda, Presupuesto,
Categoría, Subcategoría y Partida) y documenta el conflicto T1. Presupuestos exige
confirmación de impacto tras cierre; plan vivo bloquea si la foto no acredita el plan;
Revisión Comida permite `concepto` (T3) y exige impacto en cambios económicos. La foto
se mantiene idéntica en todas las pruebas.


## Functional verification

PASS (fixtures API) para AC-03/04/05/06, PASS parcial de AC-14 y AC-20 ampliado a
totales de hechos. Los guards se prueban sobre `openDatabase(":memory:")` con cierres
creados por la API y opciones E3.5/backup ficticias. No se usan datos reales. El cierre
real sigue bloqueado por DT6/T-BKP y la UI/E2E de cierre no forma parte de este bloque.
La matriz DEV-06 no declara completo ningún AC que dependa de UI, cierre real o CI Linux.
AC-03/AC-04 se acreditan solo como fixtures de API: no cubren la UI ni el cierre real y
no se declaran PASS funcionales. AC-20 se acredita como coherencia de fixtures, no como
cierre real.

## Browser verification

UNRUN. Wireframes pendientes; no hay capturas 390/1440 de E4.9.

## Limitations and next action

AC-19 (cierre parcial anticipado con re-cierre futuro) queda **descartado** por la
resolución funcional; no se incluye como caso aprobado. AC-20/AC-21 precisan la revisión
funcional de Álex del 2026-10-28: coherencia al mismo corte, bloqueo solo por diferencia
no explicable y acreditación de ausencia de operaciones imputables. «Último cierre» se
define por el Fin cronológicamente más reciente sin otro ciclo posterior cerrado; la
fecha de registro es solo auditoría. E4.10 no se desarrolla. La aprobación de
spec/wireframes, DT6/T-BKP y cualquier DEV son gates separados; DT3/DT4 ya están
resueltas. El bloque DEV-06 ejecuta pruebas de fixtures con autorización del
2026-11-04; el cierre real, la UI/E2E, CI Linux y cualquier merge siguen siendo gates
separados. Quedan como huecos explícitos: el alta de `revision_comida` no exige huella
porque no altera la foto almacenada; el cambio de Estado de Presupuestos no se trata
como fuente/destino; y la propuesta de permitir campos informativos de Movimientos,
Compras y Ventas dentro de una ventana cerrada requiere una enmienda de SPEC27. La regla
T1 por fecha sigue siendo la norma aprobada: no se implementa la excepción informativa
ni se usa como criterio de PASS. La ampliación de AC-20 a `hechos.totales` y las guardas
T2 de Referencias/Deudas, Presupuestos, plan vivo y Revisión Comida son fixtures de API,
no cobertura de UI ni de cierre real.
