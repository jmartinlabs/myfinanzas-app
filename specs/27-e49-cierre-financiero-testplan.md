# 27 — E4.9 Cierre financiero y primera fotografía: Test plan

Specification: [27-e49-cierre-financiero-specification.md](27-e49-cierre-financiero-specification.md)

Status: **APPROVED — diseño documental.** DEV-05 mantiene la corrección de T2/T3
(2026-11-04): T2 usa impacto/motivo/auditoría cuando es seguro y mantiene 409 en cambios
materiales; T3 valida por campo con lista blanca informativa. T1 se restituye al texto
aprobado de SPEC27: 409 `HISTORY_LOCKED` por fecha en ventana cerrada (AC-03/AC-04) y
bloqueo de hechos anteriores cuando pueden alterar lo capturado o el impacto no es
verificable. AC-03/AC-04/AC-05/AC-06/AC-14 tienen prueba de fixtures en
`apps/api/src/e49-guards.test.ts` (PASS de fixtures, no cierre real). El resto de AC
sigue UNRUN. No hay CI, migración nueva ni datos reales. Aprobado con SPEC27 el
2026-10-28; DT3/DT4 resueltas el 2026-10-28 y DT6/T-BKP sigue abierto.

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
| AC-05 | Reclasificación T2 en ciclo cerrado | Impacto/motivo/auditoría; foto intacta. Saldos: preview/fingerprint/motivo/auditoría para cambios no fotografiados y 409 para los materiales | Bun Test + UI | Documental; API/UI futura | Auditoría y foto | **PASS (fixtures API)** — `e49-guards.test.ts`: clasificación exige `RECTIFICATION_REQUIRED`, la vista previa marca `used` y la rectificación deja auditoría; Saldo no capturado usa `/impacto` + `/rectificar` con motivo; apertura/tipo/control capturados siguen en 409. Foto idéntica. Sin UI. | 2026-11-04 |
| AC-06 | Renombrar Partida/Instrumento/Referencia/Saldo T3 | Permitido en campos informativos; foto conserva ID + versión; identidad/económico bloqueado por campo | Bun Test | Documental; API futura | Foto y nombre vigente | **PASS (fixtures API)** — `e49-guards.test.ts`: renombrar Partida, Instrumento, Referencia y Saldo devuelve 200; cambiar el ISIN del Instrumento tras el cierre devuelve 409 `HISTORY_LOCKED` con `campos`. Foto idéntica. | 2026-11-04 |
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
| AC-20 | Cerrar con cierres posteriores, coherentes o con diferencia no explicable | Exige `CIERRE_FUERA_DE_ORDEN` con motivo, auditoría y comprobación al mismo corte incluyendo operaciones posteriores legítimas; sin diferencia no explicable no altera posteriores; una diferencia no explicable bloquea por `INCOHERENCIA_CON_CIERRE_POSTERIOR` | Bun Test + UI | Documental; API/UI futura | Auditoría, foto posterior y bloqueo | UNRUN — diseño | — |
| AC-21 | Cerrar ciclo sin hechos | Solo con ausencia acreditada de operaciones imputables en todas las fuentes; foto con `Sin hechos`; S0 (incluido 0) y posiciones heredadas se capturan; ausencia de Compras nuevas no es `Sin hechos` | Bun Test + SQL snapshot | Documental; API futura | Foto y snapshot | UNRUN — diseño | — |

## DEV-05 matrix T1/T2/T3

Lectura aplicada tras restaurar SPEC27 el 2026-11-04: T1 bloquea por fecha en ventana
cerrada (fecha antigua y nueva) y, fuera de ella, por el impacto de un hecho anterior
sobre lo capturado por una foto posterior; el impacto no verificable también bloquea.
La propuesta de permitir hechos «sin impacto» dentro de la ventana queda pendiente de
enmienda y no se aplica. T2 revisa con impacto/motivo/auditoría solo cuando la ausencia
de impacto material es demostrable; T3 valida por campo, no por fecha. La foto nunca se
recalcula.

| Nivel | Entidad/ruta | Informativo (T3) | Económico/foto | Proveedor y prueba |
| --- | --- | --- | --- | --- |
| T1 | Movimientos (`movimientos.ts`) | — (la fecha manda; no hay excepción informativa dentro de la ventana) | Fecha antigua/nueva en ventana cerrada: 409 duro. Hecho anterior que altera efectivo capturado o impacto no verificable: 409 | `assertDatesWritable` + `assertMovementClosureImpact`; test “Movimientos: 409 por fecha…” |
| T1 | Compras (`compras.ts`) | — (la fecha manda) | Fecha en ventana cerrada: 409 duro. Operación anterior que altera efectivo/posiciones capturados o impacto no verificable: 409 | `assertDatesWritable` + `assertOperationClosureImpact`; test “Compras: 409 por fecha…” |
| T1 | Ventas (`ventas.ts`) | — (la fecha manda) | Igual que Compras con signo de Venta | `assertDatesWritable` + `assertOperationClosureImpact`; test “Ventas: 409 por fecha…” |
| T1 | Ciclos | — | `Inicio`, `Fin` derivado y S0 de ciclo cerrado: 409 duro | `assertClosedCyclesUnchanged`; test “un ciclo cerrado no cambia Inicio ni S0” |
| T2 | Saldos (`saldos.ts`) | `nombre` | `tipo`/`control`/`apertura` capturados: 409 duro. Cambio económico con uso histórico no fotografiado: `/impacto` + `/rectificar` con fingerprint, motivo y auditoría | `saldoClosureConflict`, `previewSaldoChange`, `updateSaldo`; test “Saldos: bloquea lo material y revisa…” |
| T2 | Clasificación (`clasificacion.ts`) | `nombre` | Jerarquía/atribución económica: `RECTIFICATION_REQUIRED` y flujo de impacto existente | `classificationClosureImpact`; test “reclasificación económica exige revisión…” |
| T2 | Referencias (`referencias.ts`) | `nombre` | `tipo`, `estado`, ficha de vehículo: motivo obligatorio y auditoría; identidad usada sigue protegida | `assertClosedEconomicMotive`; test “catálogos distinguen informativo de económico…” |
| T2 | Deudas (`deudas.ts`) | `nombre` | Resto de atributos: motivo obligatorio y auditoría; apertura/Inicio usados siguen bloqueados | `assertClosedEconomicMotive`; test “catálogos distinguen informativo de económico…” |
| T2 | Gastos compartidos (`compartidos.ts`) | `nombre` del participante | Rol/partes: vista de impacto + fingerprint + motivo + auditoría; alta de participante con hechos en ventana cerrada exige motivo | Flujo existente + `closedWindowsForDates`; test “Gastos compartidos: el alta de participante…” |
| T2 | Instrumentos (`instrumentos.ts`) | `nombre` (con el motivo ya exigido por la ruta) | `isin`/`divisaReferencia`/evidencia: 409 de identidad tras cierre | `assertClosedInformativeFields`; test “catálogos distinguen informativo de económico…” |
| T2 | Anticipos (`anticipos.ts`) | — | Metadatos de atribución y apertura: preview + fingerprint + proveedor de foto; corrección de foto existente bloqueada sin proveedor verificable | Flujo existente; `anticipos.test.ts` y `protectAnticipoChange`; sin cambios nuevos |
| T2 | Presupuestos (`presupuestos.ts`) | `nombre` | Fuente/destino: preview + fingerprint + motivo + auditoría | Flujo existente; `presupuestos.test.ts`; sin cambios nuevos |
| T2 | Plan vivo (`planes-ciclo.ts`) | — | Cambios de plan: fingerprint + motivo + auditoría; motivo obligatorio desde la primera revisión | Flujo existente; `planes-ciclo.test.ts`; sin cambios nuevos |
| T2 | Revisión Comida (`revision-comida.ts`) | `concepto` | Rectificación/anulación/vínculo: motivo + auditoría; la foto no se recalcula | Flujo existente; `revision-comida.test.ts`; sin cambios nuevos |

Gaps explícitos: el alta de operaciones de `revision_comida` no exige motivo porque no
altera efectivo/posiciones ni la foto almacenada; se documenta como fuente auxiliar, no
como T1. Los catálogos no fechados se validan por campo cuando existe cualquier cierre.
No se inventan guards para rutas sin escritura o sin efecto económico.

## Regression checks

Ejecutado el 2026-11-04 sobre el bloque DEV-05 (worktree `dev-e49`, rama `feat/e49-cierre`):

- `bun run typecheck` — OK.
- `bun test apps/api/src/e49-guards.test.ts` — 10/10 PASS.
- `bun test apps/api/src/movimientos.test.ts apps/api/src/compras.test.ts apps/api/src/ventas.test.ts apps/api/src/ciclos.test.ts apps/api/src/clasificacion.test.ts apps/api/src/e49-api.test.ts apps/api/src/e49-guards.test.ts apps/api/src/precierre.test.ts` — 137 PASS, 3 FAIL de entorno macOS (`Ancestro no confiable` en backup/private-state), no de los guards.
- `bun test apps/api/src/app.test.ts apps/api/src/referencias.test.ts apps/api/src/instrumentos.test.ts apps/api/src/presupuestos.test.ts apps/api/src/planes-ciclo.test.ts apps/api/src/compartidos.test.ts apps/api/src/revision-comida.test.ts apps/api/src/comida.test.ts apps/api/src/anticipos.test.ts apps/api/src/e49-api.test.ts` — 171 PASS, 8 FAIL de entorno macOS de backup/estado privado, no de los módulos tocados.
- `bun test apps/api` — 653 PASS, 8 SKIP, 56 FAIL, todos ellos de entorno macOS (permisos de ancestro/aislamiento de proceso: `Ancestro no confiable`, subprocesos de producción y SQLite), no de los módulos tocados.

Cobertura de guards: T1 Movimientos/Compras/Ventas (fecha antigua y nueva en ventana
cerrada, alta/rectificación solo concepto-nota/anulación/cambio de fecha, hecho anterior
con impacto capturado, hecho anterior sin efecto capturado y hecho anterior con impacto
no verificable), T1 ciclo (Inicio/S0/Fin derivado), T2 Saldo (material 409; no
fotografiado con preview/fingerprint/motivo/auditoría), T2 catálogos
(Referencias/Deudas con motivo+auditoría; Gastos compartidos con alta motivada), T2
clasificación (revisión obligatoria) y T3 (renombrados permitidos; identidad de
Instrumento bloqueada; notas/concepto permitidos en catálogos no fechados). AC-20/T2: la
comparación conserva el total de efectivo y compara por cuenta solo las cuentas
capturadas por la foto; las cuentas creadas después no producen una falsa contradicción
y los cambios que sí afectarían al corte quedan bloqueados.

## Functional verification

PASS (fixtures API) para AC-03/04/05/06 y PASS parcial de AC-14. Los guards se prueban
sobre `openDatabase(":memory:")` con cierres creados por la API y opciones E3.5/backup
ficticias. No se usan datos reales. El cierre real sigue bloqueado por DT6/T-BKP y la
UI/E2E de cierre no forma parte de este bloque. La matriz DEV-05 no declara completo
ningún AC que dependa de UI, cierre real o CI Linux. AC-03/AC-04 se acreditan solo como
fixtures de API: no cubren la UI ni el cierre real y no se declaran PASS funcionales.

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
resueltas. El bloque DEV-05 ejecuta pruebas de fixtures con autorización del
2026-11-04; el cierre real, la UI/E2E, CI Linux y cualquier merge siguen siendo gates
separados. Quedan como huecos explícitos: prueba dedicada para cada flujo T2 preexistente
(Anticipos, Presupuestos, Plan vivo, Revisión Comida) más allá de sus suites propias;
ausencia de motivo en el alta de `revision_comida` (no altera foto/efectivo); y la
propuesta pendiente de enmienda para sustituir la regla T1 por fecha por una regla de
impacto. Esa propuesta no es norma mientras SPEC27 no se enmiende; la implementación y
las pruebas siguen el texto aprobado (409 por fecha).
