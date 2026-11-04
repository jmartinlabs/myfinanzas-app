# 27 — E4.9 Cierre financiero y primera fotografía: Test plan

Specification: [27-e49-cierre-financiero-specification.md](27-e49-cierre-financiero-specification.md)

Status: **APPROVED — diseño documental.** AC-03/AC-04/AC-05/AC-06 tienen prueba
de fixtures en `apps/api/src/e49-guards.test.ts` (PASS de fixtures, no cierre real).
El resto de AC sigue UNRUN. No hay CI, migración nueva ni datos reales. Aprobado con
SPEC27 el 2026-10-28; DT3/DT4 resueltas el 2026-10-28 y DT6/T-BKP sigue abierto.

Base: `main` `f077b7e`, esquema 18.

| Acceptance ID | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Plataforma/owner | Evidencia esperada | Estado actual | Candidato/fecha |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Ciclo con ventana, S0, plan o `SinPlan` y backup; cerrar | Cierre y foto; `Cerrado`; metadatos con versión de app y esquema; sin ciclo siguiente | Bun Test + SQL snapshot | Documental; API futura | Cierre/foto y snapshot | UNRUN — diseño | — |
| AC-02 | Ciclo sin siguiente Inicio | Bloqueo por `SIN_SIGUIENTE_INICIO`; no Fin inventado ni cierre | Bun Test + UI | Documental; API/UI futura | DTO con motivo | UNRUN — diseño | — |
| AC-03 | Movimiento en ventana cerrada | 409 `HISTORY_LOCKED`; sin escritura | Bun Test de guarda | Documental; API futura | Respuesta y snapshot | **PASS (fixtures API)** — `e49-guards.test.ts`: Movimientos, Compras y Ventas rechazan alta en ventana cerrada con 409 y snapshot sin cambios. No cubre UI ni cierre real. | 2026-11-04 |
| AC-04 | Mover Movimiento desde/hacia ventana cerrada | 409; fecha antigua y nueva comprobadas | Bun Test de guarda | Documental; API futura | Respuesta y snapshot | **PASS (fixtures API)** — `e49-guards.test.ts`: rectificaciones desde/hacia enero cerrado en Movimientos, Compras y Ventas; 409 y sin escritura. | 2026-11-04 |
| AC-05 | Reclasificación T2 en ciclo cerrado | Impacto/motivo/auditoría; foto intacta | Bun Test + UI | Documental; API/UI futura | Auditoría y foto | **PASS (fixtures API)** — `e49-guards.test.ts`: cambio económico exige `RECTIFICATION_REQUIRED`, la vista previa marca `used`, la rectificación confirmada deja auditoría y la foto no cambia. Sin UI. | 2026-11-04 |
| AC-06 | Renombrar Partida/Instrumento T3 | Permitido; foto conserva ID + versión | Bun Test | Documental; API futura | Foto y nombre vigente | **PASS (fixtures API)** — `e49-guards.test.ts`: renombrar Partida e Instrumento tras el cierre devuelve 200 y la foto permanece idéntica. | 2026-11-04 |
| AC-07 | Cerrar con posiciones E4.1 anteriores y sin Compras nuevas | Foto con efectivo/posiciones a Fin, anteriores incluidas y posteriores excluidas; valoración/patrimonio `No disponible` | Bun Test de contrato | Documental; API futura | Foto con cobertura | UNRUN — diseño | — |
| AC-08 | Cerrar con E3.5/FIN_NETA no disponible | Cierre bloqueado; sin foto; no parcial ni completo | Bun Test + UI | Documental; API/UI futura | DTO de bloqueo | UNRUN — diseño | — |
| AC-09 | Backup sin evidencia/restauración | Bloqueo antes de escribir | Bun Test de preflight | Documental; API futura | DTO de bloqueo | UNRUN — diseño | — |
| AC-10 | Reintento idéntico y payload distinto | Misma foto; 409 `IDEMPOTENCY_CONFLICT` | Bun Test de idempotencia | Documental; API futura | Respuestas y foto | UNRUN — diseño | — |
| AC-11 | Cambio concurrente preview/confirmación | 409 `IMPACT_CHANGED`/`REVISION_CONFLICT` | Bun Test de concurrencia | Documental; API futura | Dos revisiones y 409 | UNRUN — diseño | — |
| AC-12 | Fallo dentro de transacción | Rollback total; sin cierre/foto | Bun Test de fallo inducido | Documental; API futura | Snapshot sin cambios | UNRUN — diseño | — |
| AC-13 | Reabrir/cerrar por vía ordinaria | Solo E4.10 reabre el último; cierre ordinario no reabre | Bun Test + UI | Documental; API/UI futura | Respuesta y estado | UNRUN — diseño | — |
| AC-14 | Consultar foto tras T2/T3 | Foto inmutable; vistas vivas separadas | Bun Test + Playwright | Documental; API/UI futura | Foto y vista viva | UNRUN — diseño | — |
| AC-15 | Consumidor Anticipos sin proveedor real | AC36 sigue PARCIAL; no completo con ficticio | Bun Test de contrato AC36 | Documental; API futura | Estado AC36 y proveedor | UNRUN — diseño | — |
| AC-16 | Operación E4.1 anterior al ciclo y posterior a Fin | Anterior incluida en posición/efectivo a Fin; posterior excluida; sin doble cómputo | Bun Test de corte E4.1 | Documental; API futura | Foto y snapshot | UNRUN — diseño | — |
| AC-17 | Cerrar con `SinPlan` | Permitido; foto registra `SinPlan`; no líneas inventadas | Bun Test + UI | Documental; API/UI futura | Foto con `SinPlan` | UNRUN — diseño | — |
| AC-18 | Cerrar con `PlanNoVerificable` | Bloqueado; sin foto | Bun Test | Documental; API futura | DTO de bloqueo | UNRUN — diseño | — |
| AC-20 | Cerrar con cierres posteriores, coherentes o con diferencia no explicable | Exige `CIERRE_FUERA_DE_ORDEN` con motivo, auditoría y comprobación al mismo corte incluyendo operaciones posteriores legítimas; sin diferencia no explicable no altera posteriores; una diferencia no explicable bloquea por `INCOHERENCIA_CON_CIERRE_POSTERIOR` | Bun Test + UI | Documental; API/UI futura | Auditoría, foto posterior y bloqueo | UNRUN — diseño | — |
| AC-21 | Cerrar ciclo sin hechos | Solo con ausencia acreditada de operaciones imputables en todas las fuentes; foto con `Sin hechos`; S0 (incluido 0) y posiciones heredadas se capturan; ausencia de Compras nuevas no es `Sin hechos` | Bun Test + SQL snapshot | Documental; API futura | Foto y snapshot | UNRUN — diseño | — |

## Regression checks

Ejecutado el 2026-11-04 sobre el bloque DEV-guards (worktree `dev-e49`):

- `bun run typecheck` — OK.
- `bun test apps/api/src/e49-guards.test.ts` — 7/7 PASS.
- `bun test apps/api/src/movimientos.test.ts apps/api/src/compras.test.ts apps/api/src/ventas.test.ts apps/api/src/ciclos.test.ts apps/api/src/clasificacion.test.ts apps/api/src/e49-api.test.ts apps/api/src/e49-guards.test.ts apps/api/src/precierre.test.ts` — 134 PASS, 3 FAIL de entorno macOS (`Ancestro no confiable` en backup/private-state), no de los guards.
- `bun test apps/api` — 650 PASS, 8 SKIP, 56 FAIL, todos ellos de entorno macOS (permisos de ancestro/aislamiento de proceso: `Ancestro no confiable`, subprocesos de producción y SQLite), no de los módulos tocados.

Cobertura de guards: T1 Movimientos/Compras/Ventas (alta, rectificación con fecha antigua/nueva, anulación), T1 ciclo (Inicio/S0/Fin derivado), T2 Saldo (apertura, tipo/control, alta de efectivo de inversión), T2 clasificación (revisión obligatoria para cambios económicos) y T3 renombrados (Partida, Instrumento, Saldo). AC-20/T2: la comparación conserva el total de efectivo y compara por cuenta solo las cuentas capturadas por la foto; las cuentas creadas después no producen una falsa contradicción y los cambios T2 que sí afectarían al corte quedan bloqueados.

## Functional verification

PASS (fixtures API) para AC-03/04/05/06. Los guards se prueban sobre `openDatabase(":memory:")` con cierres creados por la API y opciones E3.5/backup ficticias. No se usan datos reales. El cierre real sigue bloqueado por DT6/T-BKP y la UI/E2E de cierre no forma parte de este bloque.

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
resueltas. El bloque DEV-guards ejecuta pruebas de fixtures con autorización del
2026-11-04; el cierre real, la UI/E2E y cualquier merge siguen siendo gates separados.
