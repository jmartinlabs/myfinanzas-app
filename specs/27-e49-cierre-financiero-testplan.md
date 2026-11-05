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
real). El resto de AC sigue UNRUN. **DEV-07 (2026-11-04)** añade la UI `/cierre` y la
matriz E2E con servidor aislado y evidencia E3.5/DT6 **inyectada por el servidor de
test**; no hay proveedor real de backup, no se acredita DT6 ni un cierre real y las
capturas son de fixtures ficticias. La corrección de ubicación del test de plan vivo
se verificó en CI Linux `41876737538` (PASS, 6m8s) sobre `f5ee167`. No hay migración nueva ni
datos reales. Aprobado con SPEC27 el
2026-10-28; DT3/DT4 resueltas el 2026-10-28 y DT6/T-BKP sigue abierto. QA DEV-06
(2026-11-04) cerró M1–M5 y L5, y L1 por entidad sin cambiar esquema: Referencias/Deudas/Presupuestos guardan huella y
cierres en `audit.campos.impacto`; Revisión Comida los guarda en
`revision_comida_audit.posterior.impacto`; plan vivo los guarda en
`cycle_plan_audit.delta.impacto`. También quedan cubiertos el fingerprint único de
Revisión Comida, los cierres sin foto bloqueantes, T3 de Clasificación cableado, el alta
de Revisión Comida con guarda T2 y la comparación de los seis totales de hechos.

> **Nota T1 (2026-11-04).** La lectura por impacto que permitía escrituras sin efecto
> económico dentro de una ventana cerrada fue una **propuesta** de DEV-05, no una
> enmienda aprobada. Prevalece SPEC27 aprobada: la fecha manda y AC-03/AC-04 exigen 409
> sin excepción por «sin impacto». La propuesta por impacto queda pendiente de enmienda
> formal y no se usa como criterio de PASS.

Base: `3cce51e` (rama `feat/e49-cierre`, `main` `58346e1` ya integrado), esquema v25.

| Acceptance ID | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Plataforma/owner | Evidencia esperada | Estado actual | Candidato/fecha |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Ciclo con ventana, S0, plan o `SinPlan` y backup; cerrar | Cierre y foto; `Cerrado`; metadatos con versión de app y esquema; sin ciclo siguiente | Bun Test + SQL snapshot | Documental; API futura | Cierre/foto y snapshot | **PASS parcial (fixtures UI/E2E)** — `cierre.spec.ts`: cierre v1, foto con app/esquema y sin ciclo siguiente, con evidencia E3.5/backup inyectada; no es cierre real. | 2026-11-04 |
| AC-02 | Ciclo sin siguiente Inicio | Bloqueo por `SIN_SIGUIENTE_INICIO`; no Fin inventado ni cierre | Bun Test + UI | Documental; API/UI futura | DTO con motivo | **PASS parcial (fixtures UI/E2E)** — `cierre.spec.ts` muestra el código, Fin «No derivable» y cierre deshabilitado. | 2026-11-04 |
| AC-03 | Alta/rectificación/anulación de Movimiento con fecha en ventana cerrada | 409 `HISTORY_LOCKED`; sin escritura | Bun Test de guarda | Documental; API futura | Respuesta y snapshot | **PASS (fixtures API)** — `e49-guards.test.ts`: altas, rectificaciones (incluida solo concepto/nota), anulaciones y cambios de fecha en enero cerrado devuelven 409 y no escriben; un hecho anterior a la ventana que altera efectivo capturado o cuyo impacto no es verificable también devuelve 409. No cubre UI ni cierre real. | 2026-11-04 |
| AC-04 | Mover un Movimiento desde/hacia una ventana cerrada | 409; fecha antigua y nueva comprobadas; sin escritura | Bun Test de guarda | Documental; API futura | Respuesta y snapshot | **PASS (fixtures API)** — `e49-guards.test.ts`: rectificaciones desde/hacia enero cerrado y hacia una ventana cerrada desde un hecho abierto devuelven 409 en Movimientos, Compras y Ventas, con fecha antigua y nueva comprobadas y sin escritura. | 2026-11-04 |
| AC-05 | Reclasificación T2 en ciclo cerrado | Impacto/motivo/auditoría; foto intacta. Saldos: preview/fingerprint/motivo/auditoría para cambios no fotografiados y 409 para los materiales | Bun Test + UI | Documental; API/UI futura | Auditoría y foto | **PASS (fixtures API)** — `e49-guards.test.ts`: clasificación exige `RECTIFICATION_REQUIRED`, la vista previa marca `used` y la rectificación deja auditoría; Saldo no capturado usa `/impacto` + `/rectificar` con motivo; apertura/tipo/control capturados siguen en 409. Presupuestos exige `/impacto` + fingerprint + motivo + auditoría tras cierre; plan vivo exige motivo/fingerprint y bloquea si la foto de plan es ilegible; Revisión Comida exige impacto/fingerprint/motivo en cambios económicos y altas dentro de ventana cerrada, y permite campos informativos (T3) con motivo/auditoría. Foto idéntica. Sin UI. | 2026-11-04 |
| AC-06 | Renombrar Partida/Instrumento/Referencia/Deuda/Saldo/Presupuesto T3 | Permitido en campos informativos; foto conserva ID + versión; identidad/económico bloqueado por campo o revisado por T2 | Bun Test | Documental; API futura | Foto y nombre vigente | **PASS (fixtures API)** — `e49-guards.test.ts`: renombrar Partida, Instrumento, Referencia, Deuda, Saldo y Presupuesto devuelve 200; cambiar el ISIN del Instrumento tras el cierre devuelve 409 `HISTORY_LOCKED` con `campos`; en Referencia/Deuda/Instrumento el cambio económico sin huella devuelve 409 `IMPACTO_NO_VERIFICABLE` o exige T2. Foto idéntica. | 2026-11-04 |
| AC-07 | Cerrar con posiciones E4.1 anteriores y sin Compras nuevas | Foto con efectivo/posiciones a Fin, anteriores incluidas y posteriores excluidas; valoración/patrimonio `No disponible` | Bun Test de contrato | Documental; API futura | Foto con cobertura | UNRUN — diseño | — |
| AC-08 | Cerrar con E3.5/FIN_NETA no disponible | Cierre bloqueado; sin foto; no parcial ni completo | Bun Test + UI | Documental; API/UI futura | DTO de bloqueo | **PASS parcial (fixtures UI/E2E)** — `cierre.spec.ts`: `E35_NO_VERIFICABLE`, botón deshabilitado y `GET /foto` 404; evidencia inyectada, no cierre real. | 2026-11-04 |
| AC-09 | Backup sin evidencia/restauración | Bloqueo antes de escribir | Bun Test de preflight | Documental; API futura | DTO de bloqueo | **PASS parcial (fixtures UI/E2E)** — `BACKUP_NO_VERIFICABLE` en la misma pantalla; el proveedor real DT6 sigue abierto. | 2026-11-04 |
| AC-10 | Reintento idéntico y payload distinto | Misma foto; 409 `IDEMPOTENCY_CONFLICT` | Bun Test de idempotencia | Documental; API futura | Respuestas y foto | **PASS parcial (fixtures UI/E2E)** — `cierre.spec.ts`: 500 ficticio tras procesar, reintento con la misma clave devuelve la misma v1. El 409 por payload distinto se cubre en `e49-api.test.ts`; no se fuerza desde la UI. | 2026-11-04 |
| AC-11 | Cambio concurrente preview/confirmación | 409 `IMPACT_CHANGED`/`REVISION_CONFLICT` | Bun Test de concurrencia | Documental; API futura | Dos revisiones y 409 | **PASS parcial (fixtures UI/E2E)** — `cierre.spec.ts`: fingerprint obsoleto → 409 `REVISION_CONFLICT`, sin foto, recuperación con nueva revisión y motivo conservado. | 2026-11-04 |
| AC-12 | Fallo dentro de transacción | Rollback total; sin cierre/foto | Bun Test de fallo inducido | Documental; API futura | Snapshot sin cambios | UNRUN — diseño | — |
| AC-13 | Reabrir/cerrar por vía ordinaria | Solo E4.10 reabre el último; cierre ordinario no reabre | Bun Test + UI | Documental; API/UI futura | Respuesta y estado | UNRUN — diseño | — |
| AC-14 | Consultar la foto tras T2/T3 | Foto inmutable; vistas vivas separadas | Bun Test + Playwright | Documental; API/UI futura | Foto y vista viva | **PASS parcial (fixtures API + UI/E2E)** — `e49-guards.test.ts` compara la foto tras T2/T3; `cierre.spec.ts` renombra una Partida por T3 tras cerrar y `GET /foto` permanece idéntica. Sin cierre real. | 2026-11-04 |
| AC-15 | Consumidor Anticipos sin proveedor real | AC36 sigue PARCIAL; no completo con ficticio | Bun Test de contrato AC36 | Documental; API futura | Estado AC36 y proveedor | UNRUN — diseño | — |
| AC-16 | Operación E4.1 anterior al ciclo y posterior a Fin | Anterior incluida en posición/efectivo a Fin; posterior excluida; sin doble cómputo | Bun Test de corte E4.1 | Documental; API futura | Foto y snapshot | UNRUN — diseño | — |
| AC-17 | Cerrar con `SinPlan` | Permitido; foto registra `SinPlan`; no líneas inventadas | Bun Test + UI | Documental; API/UI futura | Foto con `SinPlan` | **PASS parcial (fixtures UI/E2E)** — `cierre.spec.ts`: preflight `SinPlan` válido, sin bloqueo, y la UI de la foto v1 muestra `SinPlan` y 0 líneas; no se inspecciona el JSON interno de la foto. | 2026-11-04 |
| AC-18 | Cerrar con `PlanNoVerificable` | Bloqueado; sin foto | Bun Test | Documental; API futura | DTO de bloqueo | UNRUN — diseño (el bloqueo existe en la API; no hay E2E de UI en DEV-07) | — |
| AC-20 | Cerrar con cierres posteriores, coherentes o con diferencia no explicable | Exige `CIERRE_FUERA_DE_ORDEN` con motivo, auditoría y comprobación al mismo corte incluyendo operaciones posteriores legítimas; compara efectivo, posiciones y los totales de hechos (ingresos, gastos, transferencias, amortizaciones, devoluciones y neto); un cierre sin foto es impacto no verificable; sin diferencia no explicable no altera posteriores; una diferencia no explicable o una foto sin totales legibles bloquea por `INCOHERENCIA_CON_CIERRE_POSTERIOR` | Bun Test + UI | Documental; API/UI futura | Auditoría, foto posterior y bloqueo | **PASS parcial (fixtures API + UI/E2E)** — `e49-guards.test.ts`/`e49-api.test.ts` comparan los seis totales y bloquean fotos ilegibles; `cierre.spec.ts` cubre aviso `CIERRE_FUERA_DE_ORDEN` + 422 `MOTIVO_REQUERIDO` + cierre con motivo, y `INCOHERENCIA_CON_CIERRE_POSTERIOR` sin foto. Sin cierre real. | 2026-11-04 |
| AC-21 | Cerrar ciclo sin hechos | Solo con ausencia acreditada de operaciones imputables en todas las fuentes; foto con `Sin hechos`; S0 (incluido 0) y posiciones heredadas se capturan; ausencia de Compras nuevas no es `Sin hechos` | Bun Test + SQL snapshot | Documental; API futura | Foto y snapshot | **PASS parcial (fixtures UI/E2E)** — `cierre.spec.ts`: `Sin hechos` acreditado cierra; la UI de la foto muestra `Sin hechos`, 0 movimientos y el S0 congelado; no se inspecciona el JSON interno. Una fuente ilegible muestra «Con hechos» + `FUENTE_NO_LEGIBLE` y bloquea. El borde de Compras nuevas sigue en fixtures API. | 2026-11-04 |

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
| T2 | Clasificación (`clasificacion.ts`) | `nombre` y `grupo` (categoría); `nombre` (subcategoría/partida) | Jerarquía/atribución económica: `RECTIFICATION_REQUIRED` y flujo de impacto existente; `closedFieldDecision` cableado por entidad | `closedFieldDecision` + `classificationClosureImpact`; test “reclasificación económica exige revisión…” |
| T2 | Referencias (`referencias.ts`) | `nombre` | `tipo`, `estado` y ficha de vehículo: `/impacto` con huella de consumidores + motivo + auditoría; sin huella 409 `IMPACTO_NO_VERIFICABLE`; identidad usada sigue protegida; auditoría en `audit.campos.impacto` | `previewReferenceImpact` + `assertClosedEconomicImpact`; tests “catálogos distinguen…”, “Referencias y Deudas exigen impacto…” y “consumidores…” |
| T2 | Deudas (`deudas.ts`) | `nombre` | Resto de atributos: `/impacto` con huella de consumidores + motivo + auditoría; sin huella 409; apertura/Inicio usados siguen bloqueados; auditoría en `audit.campos.impacto` | `previewDebtImpact` + `assertClosedEconomicImpact`; tests “catálogos distinguen…”, “Referencias y Deudas exigen impacto…” y “consumidores…” |
| T2 | Gastos compartidos (`compartidos.ts`) | `nombre` del participante | Rol/partes: vista de impacto + fingerprint + motivo + auditoría; alta de participante con hechos en ventana cerrada exige motivo | Flujo existente + `closedWindowsForDates`; test “Gastos compartidos: el alta de participante…” |
| T2 | Instrumentos (`instrumentos.ts`) | `nombre` (con el motivo ya exigido por la ruta) | `isin`/`divisaReferencia`/evidencia: 409 de identidad tras cierre | `assertClosedInformativeFields`; test “catálogos distinguen informativo de económico…” |
| T2 | Anticipos (`anticipos.ts`) | — | Metadatos de atribución y apertura: preview + fingerprint + proveedor de foto; corrección de foto existente bloqueada sin proveedor verificable | Flujo existente; `anticipos.test.ts` y `protectAnticipoChange`; sin cambios nuevos |
| T2 | Presupuestos (`presupuestos.ts`) | `nombre` | `fuente`/`destino`: preview + fingerprint + motivo + auditoría; tras cierre exige confirmación aunque no haya Partidas o plan; auditoría en `audit.campos.impacto` | `previewBudget`/`updateBudget` + `hasClosures`; test “Presupuestos exige revisión de impacto…” |
| T2 | Plan vivo (`planes-ciclo.ts`) | — | Cambios de plan: fingerprint + motivo + auditoría; tras cierre exige motivo, bloquea si la foto no acredita el plan y guarda huella/cierres en `cycle_plan_audit.delta.impacto` | `assertPlanClosureReview`; test “el plan vivo de un ciclo cerrado bloquea…” |
| T2 | Revisión Comida (`revision-comida.ts`) | `concepto`, evidencias y cuenta origen | Rectificación/anulación/vínculo/alta económicos (fecha, importe, dirección, devolución, clasificación): `/impacto` + fingerprint + motivo + auditoría; sin huella 409; bloqueo si `auxiliares` no es legible; auditoría en `revision_comida_audit.posterior.impacto` | `previewRevisionComidaImpact`/`previewRevisionComidaCreationImpact` + `assertRevisionComidaClosureImpact`; tests “Revisión Comida permite concepto…”, “fingerprint de /impacto…”, “alta… exige huella…”, “Reposición…” y “consumidores…” |

Gaps explícitos: el alta de `revision_comida` fuera de una ventana cerrada no exige
huella porque no altera la foto; dentro de ventana cerrada sí pasa por T2 (impacto,
huella, motivo y auditoría). La creación de una cuenta no capturada tampoco se bloquea
si no altera el desglose de efectivo de inversión. Los catálogos no fechados se validan
por campo cuando existe cualquier cierre; Clasificación usa `closedFieldDecision` y su
propio flujo T2. `cambiarEstado` de Presupuestos no se considera fuente/destino y
conserva su auditoría sin fingerprint. T3 no se aplica a Movimientos/Compras/Ventas con
fecha en ventana cerrada porque T1 estricto los bloquea antes; ampliar T1 a campos
informativos requiere una enmienda de SPEC27 y no se hace aquí. La auditoría de L1 es
trazable sin cambiar esquema: Referencias, Deudas y Presupuestos en
`audit.campos.impacto`; Revisión Comida en `revision_comida_audit.posterior.impacto`;
plan vivo en `cycle_plan_audit.delta.impacto`. No se declara L1 cerrado para entidades
sin guarda de cierre ni se inventan columnas nuevas.

## DEV-07 matrix UI/E2E (2026-11-04)

Alcance: pantalla `/cierre` (entrada desde el shell y desde `/inicio`), preflight,
confirmación, foto v1, estados de bloqueo y errores. Servidor aislado
`apps/api/test-support/cierre-server.ts` (`NODE_ENV=test`) con ciclos, saldos y
Clasificación ficticios. La evidencia de E3.5/FIN_NETA y de backup/restauración se
**inyecta** mediante `createApp({ cierre })`; no existe proveedor real DT6/T-BKP y no
se usa producción ni datos reales. Por eso esta matriz acredita el comportamiento de
la UI/E2E con fixtures, **no** un cierre real ni el cierre de DT6.

| Caso/AC | Precondición | Resultado observado | Prueba |
| --- | --- | --- | --- |
| Sesión 401 | Sin sesión | `GET /preflight` y `GET /foto` devuelven 401; tras MFA se conserva `/cierre` | `tests/e2e/cierre.spec.ts` |
| Preflight listo (AC-01/AC-17 parcial) | Ciclo con siguiente Inicio, S0, `SinPlan` y evidencia inyectada | Estado `Listo`, ventana 01/01→31/01/2026, S0, fingerprint de 64 hex, `SinPlan` válido y `Sin hechos` acreditado; el cierre crea v1 con app/esquema y sin ciclo siguiente; la UI de la foto muestra `SinPlan`, `Sin hechos`, 0 movimientos y 0 líneas | Igual |
| Foto inmutable (AC-14 parcial) | Cierre v1 y renombrado T3 de Partida no usada | `GET /foto` idéntica antes/después del renombrado; la UI no recalcula ni edita | Igual |
| Replay idempotente (AC-10 parcial) | El servidor procesa el cierre y la UI recibe un 500 ficticio; se reintenta con la misma clave | Aviso «Reintento idempotente», misma foto v1, `estado.version = 1` | Igual |
| Conflicto 409 (AC-11 parcial) | Fingerprint obsoleto entre preflight y confirmación | 409 `REVISION_CONFLICT`, sin foto; tras actualizar la revisión se conserva el motivo (comprobado tras cambiar la clave de intento) y el cierre v1 se completa | Igual |
| DT6 sin referencia | Backup verificado y restauración probada, pero sin referencia de manifiesto/checksum/clave | El gate exige referencia: badge «No acreditado», mensaje `BACKUP_NO_VERIFICABLE` real, cierre deshabilitado y sin foto | Igual |
| Bloqueo E3.5 + backup (AC-08/AC-09 parcial) | Evidencia E3.5 no verificable y backup no acreditado | Códigos `E35_NO_VERIFICABLE` y `BACKUP_NO_VERIFICABLE`, botón deshabilitado, sin foto (404), sin cierre parcial | Igual |
| Ventana no finita (AC-02 parcial) | Un solo ciclo, sin siguiente Inicio | `SIN_SIGUIENTE_INICIO`, Fin no derivable, cierre deshabilitado | Igual |
| `Sin hechos` no acreditado (AC-21 parcial) | Fuente auxiliar ilegible en el fixture | `FUENTE_NO_LEGIBLE`, estado «Con hechos» (no se declara `Sin hechos`), cierre deshabilitado | Igual |
| Cierre fuera de orden (AC-20 parcial) | Cierre posterior ficticio y coherencia verificada | Aviso `CIERRE_FUERA_DE_ORDEN`, motivo obligatorio; sin motivo 422 `MOTIVO_REQUERIDO` sin reintento con la misma clave; con motivo cierra v1 | Igual |
| Incoherencia posterior (AC-20 parcial) | Hecho ficticio dentro de la ventana de la foto posterior | `INCOHERENCIA_CON_CIERRE_POSTERIOR`, cierre deshabilitado, sin foto | Igual |
| Vacío de ciclos | Base sin ciclos | «Sin ciclos para cerrar», sin acción de cierre | Igual |
| Responsive y temas | 1440×1000 y 390×844; `light-s`, `dark-s`, `hybrid-s` | Sin scroll horizontal; foco programático en el encabezado de la fotografía; capturas en `artifacts/e4-9/` | Igual |
| Precierre E4.8 (regresión) | Fixture E4.8 con E3.5 no verificable | `Listo con avisos`, `E35_NO_VERIFICABLE` como aviso, cobertura `Parcial` y cierre deshabilitado; 1440/390 conservados (SPEC26 AC-14) | `tests/e2e/precierre.spec.ts` |

Comandos y resultado DEV-07 (worktree `dev-e49`, rama `feat/e49-cierre`):

- `bun run typecheck` — OK.
- `bun run build` — OK (48 módulos; aviso de chunk >500 kB, no error).
- `bunx playwright test tests/e2e/cierre.spec.ts` — **11/11 PASS** (incluye R1 de motivo
  conservado y R3 sin referencia de backup).
- `bunx playwright test tests/e2e/inicio.spec.ts tests/e2e/theme.spec.ts` — **7/7 PASS**.
- `bunx playwright test tests/e2e/precierre.spec.ts` — **1/1 PASS**. La revisión
  independiente detectó que el ajuste previo a `Bloqueado` contradecía SPEC26 AC-14:
  E3.5 no verificable debe dejar el precierre `Listo con avisos`/`Parcial` y bloquear
  solo E4.9. Se restauró el comportamiento aprobado (`E35_NO_VERIFICABLE` como aviso,
  `e4_9Bloqueado=true`) y la prueba vuelve a `Listo con avisos`, manteniendo 1440/390
  y cobertura `Parcial`.
- `bunx playwright test tests/e2e/cierre.spec.ts tests/e2e/precierre.spec.ts
  tests/e2e/inicio.spec.ts tests/e2e/theme.spec.ts` — **19/19 PASS** (log en
  `artifacts/e4-9/dev-07-e2e.log`).

Capturas: `artifacts/e4-9/preflight-{light-s,dark-s,hybrid-s}-{1440,390}.png`,
`foto-{light-s,dark-s,hybrid-s}-{1440,390}.png`, `bloqueado-390.png`,
`backup-sin-referencia-1440.png`, `sin-siguiente-1440.png`,
`fuera-de-orden-1440.png`, `incoherencia-1440.png`,
`conflicto-409-1440.png`, `replay-error-1440.png`, `sin-ciclos-1440.png`.

Evidencia R2 (2026-11-04, macOS 15.5 arm64): Bun 1.4.3, Playwright 1.64.1,
Chromium 156.0.8078.4. `bunx playwright test tests/e2e/cierre.spec.ts` — 11 PASS,
0 FAIL. Log completo en `artifacts/e4-9/dev-07-e2e.log` (ignorado por Git). La CI
`critical` **no ejecuta E2E**: `scripts/verify` excluye el check `e2e` en ese perfil y
`.github/workflows/validate.yml` solo instala Chromium para `full`; la validación E2E
es local/host, no evidencia de CI `critical`.

Huecos DEV-07: no se acredita DT6/T-BKP ni cierre real; E3.5 es inyectada; solo existe
v1 porque el re-cierre E4.10 queda fuera, así que el selector de versión (>1) no se
ejercita; no hay E2E de `PLAN_NO_VERIFICABLE` ni de `S0_FUERA_DE_RANGO` en UI; no se
prueban 403/404/503 desde la pantalla. El caso «SIN_PLAN» del encargo no es un bloqueo
según SPEC27: `SinPlan` es válido y se cubre como cierre correcto; el bloqueo de plan
se corresponde con `PLAN_NO_VERIFICABLE`. La corrección de `precierre.spec.ts` es solo
de prueba y no cambia ningún estado de AC de SPEC27.

## Regression checks

Ejecutado el 2026-11-04 sobre el bloque DEV-06 (worktree `dev-e49`, rama `feat/e49-cierre`):

- `bun run typecheck` — OK.
- `bun test apps/api/src/e49-guards.test.ts` — 31/31 PASS (incluye 21 pruebas DEV-06/QA).
- `bun test apps/web/test/plan-delta.test.ts` — 2/2 PASS (R1: filtra `impacto` y tolera JSON inválido).
- `bun run build` — OK (46 módulos; aviso de tamaño de chunk, no error).
- `bun test apps/api/src/e49-api.test.ts apps/api/src/e49-migration.test.ts apps/api/src/e49-schema-contract.test.ts` — 58 PASS, 3 SKIP, 0 FAIL.
- `bun test apps/api/src/referencias.test.ts apps/api/src/deudas.test.ts apps/api/src/presupuestos.test.ts apps/api/src/planes-ciclo.test.ts apps/api/src/revision-comida.test.ts apps/api/src/clasificacion.test.ts apps/api/src/instrumentos.test.ts apps/api/src/saldos.test.ts apps/api/src/movimientos.test.ts apps/api/src/compras.test.ts apps/api/src/ventas.test.ts apps/api/src/ciclos.test.ts` — 134 PASS, 9 FAIL de entorno macOS (`Ancestro no confiable` en backup/restore/migración y estado privado), ninguno de los módulos tocados.
- `bun test apps/api` — 674 PASS, 8 SKIP, 56 FAIL, todos de entorno macOS (permisos de ancestro/aislamiento de proceso: `Ancestro no confiable`, subprocesos de producción y SQLite), no de los módulos tocados.

Cobertura de guards DEV-06: AC-20 compara `hechos.totales` (ingresos, gastos,
transferencias, amortizaciones, devoluciones y neto) al corte congelado de cada foto
posterior y bloquea si faltan, son ilegibles o divergen; un cierre sin foto también
bloquea. Cubre cierre posterior coherente, hecho anterior, cuenta no capturada, totales
divergentes y hecho no capturado en la ventana posterior. T2 Referencias/Deudas exige
`/impacto` + huella de consumidores + motivo + auditoría, con 409
`IMPACTO_NO_VERIFICABLE`/`IMPACT_CHANGED`; las pruebas mueven consumidores reales,
rechazan huellas obsoletas y bloquean si no se pueden leer. T3 mantiene listas blancas
por entidad; Clasificación cablea `closedFieldDecision` y el endpoint de Subcategoría
cubre la regresión/contrato de `nombre` informativo frente a `padre` económico. Presupuestos exige
confirmación de impacto tras cierre; plan vivo bloquea si la foto no acredita el plan;
Revisión Comida permite campos informativos (T3) y exige impacto/fingerprint/motivo/
auditoría en cambios y altas dentro de ventana cerrada, con preview y escritura usando el
mismo fingerprint y pruebas de Detalle, anulación, vínculo, alta y rectificación de
Reposición. L1 queda trazable por entidad: Referencias, Deudas y Presupuestos en
`audit.campos.impacto`; Revisión Comida en `revision_comida_audit.posterior.impacto`;
plan vivo en `cycle_plan_audit.delta.impacto`. La foto se mantiene idéntica en todas las
pruebas.

R1 (UI plan vivo): `PlanesCiclo.tsx` consume `delta` mediante `planDeltaEntries`, que
filtra solo entradas con `anterior`/`posterior` y descarta el certificado `impacto` y
cualquier clave extra. La comprobación está en `apps/web/test/plan-delta.test.ts` y el
build de producción se ejecutó sin error; no se declara E2E/UI de cierre. La ubicación
del test se corrigió tras el fallo de CI de `d4e6d25`.


## Functional verification

PASS (fixtures API) para AC-03/04/05/06, PASS parcial de AC-14 y AC-20 ampliado a los
seis totales de hechos y a cierres sin foto. Los guards se prueban sobre
`openDatabase(":memory:")` con cierres creados por la API y opciones E3.5/backup
ficticias. No se usan datos reales. El cierre real sigue bloqueado por DT6/T-BKP y la
UI/E2E de cierre no forma parte de este bloque. La matriz DEV-06 no declara completo
ningún AC que dependa de UI, cierre real o evidencia de host. La CI Linux de `f5ee167` está en PASS; AC-03/AC-04 se acreditan solo como
fixtures de API: no cubren la UI ni el cierre real y no se declaran PASS funcionales.
AC-20 se acredita como coherencia de fixtures, no como cierre real.

## Browser verification

Ejecutado el 2026-11-04 por DEV-07 sobre `feat/e49-cierre`: `tests/e2e/cierre.spec.ts`
(11/11) recorre 1440×1000 y 390×844 con `light-s`, `dark-s` y `hybrid-s`, comprueba
`scrollWidth <= innerWidth`, el foco en el encabezado de la fotografía (`toBeFocused`)
y capturas en `artifacts/e4-9/`. Entorno: macOS 15.5 arm64, Bun 1.4.3, Playwright
1.64.1 y Chromium 156.0.8078.4. El servidor de test es aislado y la evidencia
E3.5/DT6 está inyectada: las capturas no acreditan un cierre real ni la restauración
T-BKP. La regresión `inicio.spec.ts`/`theme.spec.ts` pasa 7/7 y `precierre.spec.ts`
pasa 1/1 con el comportamiento de SPEC26 AC-14 (`Listo con avisos`, aviso
`E35_NO_VERIFICABLE`, cobertura `Parcial` y cierre E4.9 deshabilitado). La CI
`critical` no ejecuta E2E (perfil sin check `e2e` y sin instalación de Chromium).

## Limitations and next action

AC-19 (cierre parcial anticipado con re-cierre futuro) queda **descartado** por la
resolución funcional; no se incluye como caso aprobado. AC-20/AC-21 precisan la revisión
funcional de Álex del 2026-10-28: coherencia al mismo corte, bloqueo solo por diferencia
no explicable y acreditación de ausencia de operaciones imputables. «Último cierre» se
define por el Fin cronológicamente más reciente sin otro ciclo posterior cerrado; la
fecha de registro es solo auditoría. E4.10 no se desarrolla. La aprobación de
spec/wireframes, DT6/T-BKP y cualquier DEV son gates separados; DT3/DT4 ya están
resueltas. El bloque DEV-06 ejecuta pruebas de fixtures con autorización del
2026-11-04; DEV-07 añade UI/E2E con evidencia inyectada. El cierre real, DT6/T-BKP y
cualquier merge siguen siendo gates; CI Linux PASS en `f5ee167`.
Quedan como huecos explícitos: el alta de `revision_comida` fuera de una
ventana cerrada no exige huella; el cambio de Estado de Presupuestos no se trata como
fuente/destino; y la propuesta de permitir campos informativos de Movimientos, Compras y
Ventas dentro de una ventana cerrada requiere una enmienda de SPEC27. La regla T1 por
fecha sigue siendo la norma aprobada: no se implementa la excepción informativa ni se
usa como criterio de PASS. La ampliación de AC-20 a los seis `hechos.totales`, el bloqueo
de cierres sin foto y las guardas T2 de Referencias/Deudas, Presupuestos, plan vivo y
Revisión Comida son fixtures de API; DEV-07 añade su recorrido UI/E2E con evidencia
inyectada, no un cierre real. L1 se declara
solo por entidad y con el mecanismo JSON indicado; no se añaden columnas ni se altera el
esquema.
