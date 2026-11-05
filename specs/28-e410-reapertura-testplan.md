# 28 — E4.10 Reabrir el último cierre y volver a cerrar: Test plan

**DRAFT — no aprobada; no autoriza DEV ni merge.**
Status: **DRAFT documental — diseño de pruebas; NO EJECUTADO. Todos los AC están
`UNRUN`. Ningún AC está en PASS.** No existe implementación de E4.10, endpoint, DDL,
migración, UI ni candidato funcional. No se usan datos reales.
Task ID: `E4.10 · SPEC` (canonical), soporte documental `SPEC28`.
Specification: [28-e410-reapertura-specification.md](28-e410-reapertura-specification.md)
Brainstorming: [28-e410-reapertura-brainstorming.md](28-e410-reapertura-brainstorming.md)
Base de esta incorporación: `main` **`436fe3a`** (2026-11-05; revisión anterior `3842831`). E4.9 está **integrado** en
`0176ffc` (#200), con QA **APTO CON RESERVAS** y CI post-merge `42000330143`; `a806fd9`
es E4.5 (#216), no E4.9. Los AC de E4.10 siguen **UNRUN**; los PASS de fixtures/parciales
de E4.9 no son PASS de aceptación. DT6/T-BKP sigue abierto.

**Leyenda de estado:** `UNRUN` = diseñado, no ejecutado. `UNRUN — condicionado Dn` = no
puede ejecutarse con resultado estable hasta que se apruebe esa decisión. `BLOCKED` = falta
una dependencia externa. No se usa `PASS` en este documento. **D1–D9 y `SIN_CAMBIOS`
están aprobadas (2026-11-05); solo P2/P3/P6/P7/P8 de SPEC29 siguen abiertas.**

---

## 1. Estrategia

- **Unidad/API:** Bun Test sobre las operaciones conceptuales de E4.10 y las guardas de
  E4.9, con SQLite de fixture y snapshots antes/después.
- **Persistencia:** comprobar filas, versiones, triggers de inmutabilidad, secuencia
  `MAX(version)+1`, auditoría append-only y ausencia de estados parciales.
- **Contrato:** DTO de estado/versión/foto; errores motivados; idempotencia y concurrencia.
- **Seguridad:** sesión MFA completa, Origin/CSRF, límites de JSON, ausencia de rutas
  `PATCH`/`DELETE`, rechazo de payloads manipulados.
- **UI:** Playwright cuando exista una UI autorizada; aquí solo se diseña el caso, no se
  ejecuta. No hay capturas 390/1440.
- **Datos:** fixtures sintéticos exclusivamente. Un fixture de backup **no** acredita DT6.
- **Verificación final:** cuando exista código de E4.10, el paquete DEV usará
  `python3 scripts/verify` o `python3 scripts/verify --full` según el perfil autorizado.
  Este documento no ejecuta nada.

Las rutas y nombres de códigos de E4.10 siguen `[PENDIENTE]`; la superficie E4.9 ya está
integrada. Los casos se escriben contra las operaciones conceptuales
(`reabrirUltimoCierre`, `reCerrarCiclo`, `estadoDeCierre`, `versionesDeCierre`,
`fotoDeCierre`, `cancelarReapertura`) y se adaptan a la superficie E4.9 integrada, sin
cambiar la semántica.

---

## 2. Escenarios núcleo

### F1 — v1 → reapertura → corrección → v2

1. Ciclo último con cierre v1 y foto completa; fixture con hechos, plan y auxiliares.
2. Reabrir con motivo, actor, UTC y versión esperada.
3. Verificar `Reabierto(v1)`, evento de auditoría y foto v1 sin cambios.
4. Aplicar una corrección T2 (y T1 si D2-B) con su impacto/auditoría.
5. Re-cerrar con motivo (D3-B+C), versión esperada y preflight.
6. Verificar v2 con el contrato completo, vínculo v1→v2, `Cerrado(v2)` y v1 intacta.

**Cubre:** AC02, AC06, AC08, AC10, AC18, AC20.

### F2 — v1 intacta

1. Capturar snapshot de `cierres`, `fotos_cierre`, auditoría y `schema_version` antes de
   reabrir.
2. Reabrir, corregir y re-cerrar.
3. Comparar la fila y la foto v1 byte a byte (o por columnas relevantes) con el snapshot.
4. Intentar `UPDATE`/`DELETE` directo sobre v1 y su foto; la base debe rechazarlo.

**Cubre:** AC07, AC10, AC14.

### F3 — Cierre posterior existente

1. Ciclo A cerrado (v1) y ciclo B posterior cerrado.
2. Intentar reabrir A por la vía ordinaria.
3. Verificar rechazo motivado, sin evento de reapertura, sin cambio de estado y sin tocar B.
4. Repetir con un cierre posterior creado entre la reapertura y el re-cierre de A (carrera).

**Cubre:** AC01, AC16.

### F4 — Intento de salto por API

1. `reCerrarCiclo` sin reapertura previa.
2. Reabrir un ciclo no último o una versión histórica (v1 cuando existe v2).
3. `PATCH`/`DELETE` de cierre, foto o versión.
4. Reabrir/re-cerrar omitiendo versión esperada o con versión obsoleta.
5. Verificar rechazo en todas, sin escritura ni evento parcial.

**Cubre:** AC04, AC12, AC14.

### F5 — Fallo atómico

1. Inducir fallo en la transacción de reapertura (auditoría/estado).
2. Inducir fallo en la transacción de re-cierre (foto/auditoría/intento) después de las
   comprobaciones.
3. Verificar rollback total: sin evento/foto huérfanos, sin v2, estado consistente, v1
   consultable y reintento posible.

**Cubre:** AC05, AC13.

### F6 — Idempotencia y concurrencia

1. Repetir reapertura con la misma clave y payload; repetir re-cierre con la misma clave y
   payload.
2. Repetir con la misma clave y payload distinto.
3. Dos reaperturas concurrentes; dos re-cierres concurrentes; versión esperada obsoleta.
4. Verificar una sola versión/ventana, respuestas estables y conflictos motivados.

**Cubre:** AC11, AC12.

---

## 3. Matriz de aceptación

| AC | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Plataforma/owner | Evidencia esperada | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| E4.10-AC01 | Cierre con otro ciclo posterior cerrado; reabrir | Rechazo motivado; sin evento ni cambio; cierre posterior intacto | Bun Test + SQL snapshot | API futura | DTO de error y snapshot | UNRUN |
| E4.10-AC02 | v1 → reabrir → corregir → re-cerrar | v1 intacta; v2 con fecha/motivo/actor/fingerprint/app/esquema y vínculo | Bun Test + snapshot | API futura | v1, v2 y auditoría | UNRUN |
| E4.10-AC03 | Dependencias posteriores presentes; reabrir/re-cerrar | Revalidación de solo lectura; S0/plan ajenos sin cambios; evidencia | Bun Test de revalidación | API futura | DTO y snapshot | UNRUN |
| E4.10-AC04 | Reabrir no último o versión histórica | Rechazo `NO_ES_ULTIMO_CIERRE`/equivalente; DT9 no habilitado | Bun Test de elegibilidad | API futura | Error y snapshot | UNRUN |
| E4.10-AC05 | Fallo inducido en transacción de reapertura | Rollback total; sigue `Cerrado(vN)`; sin auditoría huérfana | Bun Test de fallo inducido | API futura | Snapshot sin cambios | UNRUN |
| E4.10-AC06 | Reabrir con motivo/actor/UTC | `Reabierto(vN)`; motivos separados reapertura/re-cierre, actor de sesión, UTC y trazabilidad en auditoría/versión; sin foto nueva | Bun Test + SQL | API futura | Evento y estado | UNRUN |
| E4.10-AC07 | Consultar/modificar v1 durante reapertura | v1 y foto intactas; consulta persistida; `PATCH`/`DELETE` rechazados | Bun Test + SQL triggers | API futura | Foto y triggers | UNRUN |
| E4.10-AC08 | Corrección T2 en ventana | Impacto/motivo/auditoría; v1 intacta; vista viva actualizada/marcada | Bun Test + UI futura | API/UI futura | Auditoría y foto | UNRUN |
| E4.10-AC09 | Escritura T1 dentro/fuera de ventana | D2-B aprobada: dentro de ventana/ciclo, auditada; S0/ventana/Fin bloqueados; fuera, `HISTORY_LOCKED` | Bun Test de guarda | API futura | Respuesta y snapshot | UNRUN |
| E4.10-AC10 | Re-cerrar tras corregir | Una versión `N+1` con foto completa; `vN` y anteriores intactas; secuencia D1-A | Bun Test + SQL snapshot | API futura | `vN`, `vN+1` y secuencia | UNRUN |
| E4.10-AC11 | Reintento idéntico y payload distinto | Mismo resultado/versión; conflicto de idempotencia; sin duplicados | Bun Test de idempotencia | API futura | Respuestas y versiones | UNRUN |
| E4.10-AC12 | Reaperturas/re-cierres concurrentes; versión obsoleta | Solo una gana; la otra conflicto; sin dos ventanas/versiones | Bun Test de concurrencia | API futura | Dos respuestas y snapshot | UNRUN |
| E4.10-AC13 | Fallo inducido en transacción de re-cierre | Rollback; sin v2/foto parcial; sigue `Reabierto(vN)`; v1 consultable | Bun Test de fallo inducido | API futura | Snapshot y estado | UNRUN |
| E4.10-AC14 | Saltos por API: re-cerrar sin reabrir, escribir v1, versión histórica, omitir versión | Rechazo motivado en todas; sin escritura | Bun Test de rutas/guardas | API futura | Errores y snapshot | UNRUN |
| E4.10-AC15 | Re-cierre sin preflight/backup/restauración DT6 o sin E3.5 verificable | Bloqueo antes de escribir; sin v2; fixture marcado sintético | Bun Test de preflight | API futura | DTO de bloqueo | UNRUN |
| E4.10-AC16 | Cierre posterior creado entre reapertura y re-cierre | Re-cierre ordinario bloqueado; sin v2 silenciosa; posterior intacto. Con cambios materiales no se cancela: solo recuperación extraordinaria aprobada por separado. Sin cierre posterior, cambios → `vN+1` | Bun Test de carrera | API futura | Error, auditoría y snapshot | UNRUN |
| E4.10-AC17 | Dependencia posterior contradictoria | Contradicción material bloquea; aviso solo si se acredita no bloqueante; valores comparados auditados; sin cambios automáticos (D4) | Bun Test de revalidación | API futura | Auditoría y snapshot | UNRUN |
| E4.10-AC18 | Recorrer cadena v1 → reapertura → correcciones → v2 | Auditoría completa, append-only, sin huecos ni huérfanos | Bun Test + SQL | API futura | Eventos ordenados | UNRUN |
| E4.10-AC19 | Plan `SinPlan`/capturado y auxiliares disponibles/no | Plan vivo rectificable; `SinPlan`↔`Capturado` con motivo/auditoría; foto completa y comparación con `vN`; auxiliares de fuentes vigentes; ausente → `No disponible` (D6-A+C) | Bun Test + UI futura | API/UI futura | Foto vN+1 y auditoría | UNRUN |
| E4.10-AC20 | Consultar v1/v2 con y sin versión explícita | Valores persistidos, versión seleccionada, última cerrada y estado; sin recálculo | Bun Test de contrato | API futura | DTO y foto | UNRUN |
| E4.10-AC21 | Cancelar reapertura | Sin cambios materiales: `Cerrado(vN)` sin foto, evento auditado, `vN`/anteriores intactas, T1 re-bloqueado. Con cambios y sin cierre posterior: `vN+1`. Con cierre posterior: solo recuperación extraordinaria aprobada por separado | Bun Test + SQL | API futura | Estado y auditoría | UNRUN |
| E4.10-AC22 | Ciclo antiguo o restore como reapertura | Rechazo; sin ruta alternativa; motivo auditado | Bun Test de límites | API futura | Error y auditoría | UNRUN |
| E4.10-AC23 | Reabrir tras v2 (v3) | Secuencial sobre la última versión cerrada; no versión histórica; una ventana; v3+ con foto completa | Bun Test de secuencia | API futura | Versiones y auditoría | UNRUN |
| E4.10-AC24 | Re-cerrar sin cambios materiales | Rechazo explícito `SIN_CAMBIOS`; no crea foto; cancelación D8 solo con ausencia acreditada; no basta igualdad de importes/totales; cambios revertidos o evidencia insuficiente → sin equivalencia ni cancelación automática | Bun Test + SQL | API futura | Error `SIN_CAMBIOS`, estado y auditoría | UNRUN |

**Casos `SIN_CAMBIOS` (positivo/negativo):**

- Positivo: hechos, relaciones, clasificación, plan y componentes fotografiados sin cambios
  materiales → `SIN_CAMBIOS`, sin foto; cancelación D8 si procede.
- Negativo: importes/totales iguales pero cambian hechos, relaciones, clasificación o plan →
  no es `SIN_CAMBIOS`; no se cancela; `vN+1` o recuperación según D8.
- Negativo: cambios revertidos o evidencia insuficiente → no se asume equivalencia; no hay
  cancelación automática.

---

## 4. Regresión E4.9 y E4.8

Estos casos no son AC de E4.10, pero deben seguir verdes antes de declarar cualquier PASS
de E4.10:

| Caso | Regla que no puede romperse | Estado |
| --- | --- | --- |
| R-E49-01 | T1 en ventana cerrada sigue devolviendo `HISTORY_LOCKED` fuera de la ventana de E4.10. | UNRUN |
| R-E49-02 | T2 en ciclo cerrado sigue exigiendo impacto/motivo/auditoría y no altera la foto. | UNRUN |
| R-E49-03 | Cierre ordinario duplicado sigue bloqueado; E4.10 es la única vía de reapertura. | UNRUN |
| R-E49-04 | Reintento de cierre idéntico y conflicto de payload distinto se mantienen. | UNRUN |
| R-E49-05 | Cambio concurrente entre preview y confirmación sigue dando conflicto sin foto parcial. | UNRUN |
| R-E49-06 | Rollback de cierre sigue siendo total; no hay cierre/foto huérfanos. | UNRUN |
| R-E49-07 | Foto v1 no se recalcula al consultar tras T2/T3. | UNRUN |
| R-E49-08 | Cierre fuera de orden con diferencia no explicable sigue bloqueando por `INCOHERENCIA_CON_CIERRE_POSTERIOR`. | UNRUN |
| R-E48-01 | Precierre sigue siendo solo lectura y no crea cierre, foto, reapertura ni versión. | UNRUN |
| R-SEC-01 | Rutas financieras siguen exigiendo sesión MFA completa, Origin/CSRF y límites; sin roles nuevos por defecto (D3). | UNRUN |

---

## 5. Verificación funcional

`UNRUN`. No existe candidato funcional de E4.10, ni operación de reapertura, ni camino de
re-cierre en E4.9, ni foto v2. E4.9 está integrado en `0176ffc`, pero el re-cierre no está
implementado y sus AC de aceptación siguen pendientes; los PASS de fixtures no son
aceptación. No se declara verificación funcional por diseño documental.

---

## 6. Verificación de navegador

`UNRUN`. No hay UI de E4.10 ni wireframes aprobados. Cuando exista UI autorizada, se
verificarán al menos: elegibilidad del último cierre, confirmación con motivo, estado
reabierto, comparación v1/v2, errores de cierre posterior/versión/DT6 y sesión expirada, en
390 y 1440. No se declaran capturas ni PASS.

---

## 7. Dependencias y limitaciones

- `[CONFIRMADO]` **E4.9 integrado** en `0176ffc` con QA APTO CON RESERVAS. Las rutas, la
  forma de reapertura, la foto v2 y la auditoría de E4.10 siguen `[PENDIENTE]`; la política
  de versiones D5-A está aprobada. Los casos se adaptan, no se congelan.
- `[PENDIENTE]` **E4.9 no tiene camino de re-cierre.** `confirmCierre` bloquea el segundo
  cierre con `ALREADY_CLOSED`; el caso F1 no puede ejecutarse hasta que exista la operación
  acordada (E4.9 o E4.10).
- `[APROBADO D1-A]` Reserva de «último»; v3+ secuencial sobre la última versión; no se
  registran/cierran cierres posteriores incompatibles.
- `[APROBADO D2-B]` T1 en la ventana/ciclo para Movimientos, Compras y Ventas; AC09 tiene
  diseño estable.
- `[APROBADO D3-B+C]` Motivos separados reapertura/re-cierre, 1000 caracteres, actor de
  sesión; AC06 tiene diseño estable.
- `[APROBADO D4]` AC17 bloquea contradicciones materiales; aviso solo si se acredita no
  bloqueante; sin cambios automáticos en S0/planes.
- `[APROBADO D5-A]` v1 consultable, no vigente sin advertencia; agregados nuevos excluyen y
  marcan `PendienteReCierre`; ya generados congelados; AC20 tiene diseño estable.
- `[APROBADO D6-A+C]` Plan vivo rectificable; `SinPlan`↔`Capturado`; foto completa y
  comparación con `vN`; auxiliares acreditados; AC19 tiene diseño estable.
- `[APROBADO D7-A+B+C]` Idempotencia separada, versión esperada y transacción atómica;
  AC11/AC12 tienen diseño estable; nombres de códigos siguen provisionales.
- `[APROBADO D8]` AC21 cancelación: sin cambios materiales, sin foto; con cambios y sin
  cierre posterior, `vN+1`; con cierre posterior, re-cierre ordinario bloqueado y solo
  recuperación extraordinaria aprobada por separado.
- `[CONFIRMADO]` **DT9 fuera.** AC22 solo verifica el rechazo; no diseña la rectificación
  de ciclos antiguos.
- `[CONFIRMADO]` **DT6/T-BKP abierto.** AC15 puede ejecutarse con fixture sintético y
  marcarse `PASS (fixtures)` solo si se autoriza; el cierre real sigue `BLOQUEADO (real)`.
- `[CONFIRMADO]` **Versión de esquema.** E4.9 ocupa **v25**; E4.10 no reserva versión en
  este testplan. `[PENDIENTE]` La versión de la migración de E4.10 se decidirá en su paquete
  DEV con una versión posterior.
- `[APROBADO SIN_CAMBIOS]` **Re-cierre sin cambios:** rechazo explícito `SIN_CAMBIOS`,
  sin foto; cancelación D8 si procede y ausencia acreditada; no basta igualdad de importes.
  AC24 `UNRUN`; positivos/negativos en la matriz.
- `[APROBADO 2026-11-05]` **D3/D4/D6/D7** en SPEC28 §19. AC11/AC12, AC17 y AC19 siguen
  `UNRUN`; no se declara PASS.
- `[CONFIRMADO]` **Sin datos reales, sin despliegue, sin merge.** Aprobar este testplan no
  autoriza DEV; ejecutar pruebas exige autorización separada.

---

## 8. Criterios de salida

Para declarar un AC `PASS` harán falta, como mínimo:

1. E4.9 **integrado en `0176ffc` con QA APTO CON RESERVAS (cumplido)**, o una decisión
   explícita que permita probar E4.10 contra un contrato congelado.
2. Decisiones E4.10 (D1–D9 y `SIN_CAMBIOS`) aprobadas; solo P2/P3/P6/P7/P8 de SPEC29
   siguen pendientes.
3. Evidencia real del comando ejecutado, no una descripción.
4. Snapshot antes/después que demuestre v1 intacta, ausencia de estado parcial y una sola
   versión nueva.
5. Revisión independiente de QA; este documento no se autoaprueba.

**Estado global:** `UNRUN` — diseño documental. Ningún AC en PASS.
