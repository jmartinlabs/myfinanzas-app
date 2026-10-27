# 17 — E4.4 Deuda completa y conciliación desde apertura: Progress DEV17

Status: **WAITING — secuencia coordinada D5 → E4.1 → DEV17.** E4.1 y DEV17 conformes con
la propuesta; **falta confirmación de D5 y no hay liberación efectiva**. No se inició
implementación, no se modificó código, no se ejecutaron pruebas funcionales ni se creó
candidato. Se conserva el checkpoint `c768d38`; durante la espera solo se preparan
progress17/testplan17 propios.

Specification: [17-e44-deuda-completa-specification.md](17-e44-deuda-completa-specification.md)
Brainstorming: [17-e44-deuda-completa-brainstorming.md](17-e44-deuda-completa-brainstorming.md)
Test plan: [17-e44-deuda-completa-testplan.md](17-e44-deuda-completa-testplan.md)

## 1. Aprobación funcional y autorización de desarrollo

Registros separados, ambos del chat supervisor Codex, 2026-10-27:

| Gate | Mensaje humano | Objeto | Límite |
| --- | --- | --- | --- |
| Aprobación funcional | «Las apruebo» | Specification 17 y wireframes de la revisión `1d539a8cb9c38b3a8d2e3921a3651197105ce282` | Aprueba el contrato documental; no equivale a merge ni a autorización de desarrollo |
| Autorización de desarrollo | «Pasamos al desarrollo» | DEV17-E44, implementación de E4.4 conforme a spec17 aprobada | Autoriza desarrollo y QA; no autoriza merge, migración operativa, datos reales, Excel, VPS ni despliegue |

Q1–Q7 ya están confirmadas y cerradas. No se reabren ni se vuelven a preguntar salvo
contradicción material o decisión nueva. En esta ejecución **no surgió una decisión
financiera nueva**.

La aprobación de specification/wireframes y la autorización DEV17 se registran aquí por
separado; no se modifica `specs/epic-board.md` ni documentos compartidos.

## 2. Preflight Git, main, versión y ownership

| Comprobación | Resultado |
| --- | --- |
| `origin/main` | `1d539a8cb9c38b3a8d2e3921a3651197105ce282` |
| Esquema main | SQLite **v16**; no se reserva versión por inferencia |
| Spec17 en main | presente en `specs/17-e44-deuda-completa-*.md`; aprobada documentalmente |
| Rama DEV17 | `codex/dev17-e44-deuda-completa`, nueva desde `origin/main` |
| Checkout aislado | worktree temporal propio; el checkout principal y los worktrees ajenos no se modifican |
| HEAD | `1d539a8cb9c38b3a8d2e3921a3651197105ce282` al iniciar |
| Otro ejecutor DEV17 | no se encontró rama, worktree, commit ni PR DEV17/E4.4 de desarrollo |
| Cambios locales propios | solo documentos de estado/progress en este worktree; sin código |
| D5 | trabajo documental independiente; no se contactó, reasignó ni modificó |
| DEV16 | integrado en `main` (PR82); no hay código no integrado que compita con E4.4 |
| E4.5/spec20 | trabajo documental independiente en su worktree; no se contactó ni modificó |
| E4.1 | **conflicto de ownership** descrito abajo; no se contactó ni modificó |

No se encontró un segundo ejecutor de DEV17. El bloqueo no es de checkout ni de rama: es de
**ownership concurrente de archivos compartidos** con E4.1.

## 3. Bloqueo material — E4.1 mantiene archivos compartidos

E4.1 (`codex/pilot-full-e41-instrumentos-compras-inversion`) es un trabajo actual con
desarrollo ejecutado y sin merge autorizado. Su rama modifica archivos que E4.4 necesita
para integrarse de extremo a extremo:

| Archivo compartido | Uso en E4.1 | Necesidad E4.4 | Conflicto |
| --- | --- | --- | --- |
| `apps/api/src/database-schema.ts` | migración/registro de esquema E4.1 | registrar migración E4.4 y versión vigente | **Sí** |
| `apps/api/src/backup.ts` | versión/manifiesto y restore E4.1 | versión/manifiesto del esquema ampliado y restore | **Sí** |
| `apps/api/src/app.ts` | rutas E4.1 | rutas de ficha/corte/conciliación E4.4 | **Sí** |
| `apps/api/src/app.test.ts` | regresiones de rutas E4.1 | regresiones de rutas E4.4 | **Sí** |
| `apps/api/src/deudas.test.ts` | extensión de pruebas E4.1 | pruebas E1.6 + E4.4 sobre Deuda | **Sí** |
| `apps/api/src/movimientos.ts` | cambios de pipeline E4.1 | lectura estricta sin `null→0` o coordinación del read model | **Sí** |
| `apps/api/src/movimientos.test.ts` | regresiones E4.1 | regresiones de lectura/efectos E4.4 | **Sí** |
| `apps/api/src/database-identity.ts` | contrato/identidad de esquema E4.1 | compatibilidad de identidad/migración | **Sí** |
| `apps/web/src/main.tsx` | montaje de UI E4.1 | montaje de la ficha/listado E4.4 | **Sí** |
| `apps/web/src/style.css` | estilos E4.1 | estilos de la pantalla E4.4 | **Potencial**; podría aislarse parcialmente, pero no elimina los anteriores |

E4.1 tiene además cambios documentales sin commit en su worktree y su progress declara
`STOP 2026-10-27` por avance de `main`, con PR/merge no autorizados. No es un trabajo
cerrado ni integrado. Escribir ahora los mismos archivos desde DEV17 produciría una
colisión de ownership y un conflicto de integración.

**Decisión de esta sesión:** no modificar esos archivos, no crear una migración paralela,
no duplicar rutas ni montar una UI alternativa fuera del shell. El bloqueo se eleva al
supervisor antes de escribir código.

## 4. Matriz de los 33 AC antes del código

La matriz detallada AC → riesgo → caso positivo/negativo → comprobación futura → entorno
está en [testplan17](17-e44-deuda-completa-testplan.md#matriz-ac--riesgo--caso--comprobación-futura).
En este progress se registra el estado pre-código de los 33 AC. Ninguno se ejecutó:

| AC | Comprobación futura prevista | Estado DEV17 |
| --- | --- | --- |
| AC-01 | API/DTO + SQL: alta/consulta sin hechos artificiales; histórico no escribible | BLOCKED |
| AC-02 | API/UI: condiciones informativas exactas; sin cálculo | BLOCKED |
| AC-03 | API/UI: tipo canónico `null` = Sin informar; sin activo/LTV | BLOCKED |
| AC-04 | API/SQL: histórico solo lectura; POST/PATCH 422 | BLOCKED |
| AC-05 | API: inconsistencia histórica visible; sin corrección E4.4 | BLOCKED |
| AC-06 | API/oráculo: solo capital desde control; sin doble cómputo | BLOCKED |
| AC-07 | API/E2E: cuota con capital/intereses/gasto/banco separados | BLOCKED |
| AC-08 | API/E2E: extraordinaria sin Gasto ni segundo hecho | BLOCKED |
| AC-09 | API/oráculo: precontrol visible y no aplicado al capital | BLOCKED |
| AC-10 | API: corte inclusivo, otra Deuda excluida, varias Partidas suman | BLOCKED |
| AC-11 | API/UI: corte anterior/sin control/sin apertura no calculable | BLOCKED |
| AC-12 | API: apertura ausente ≠ cero | BLOCKED |
| AC-13 | API/SQL: desglose incompleto no calculable; `null` ≠ 0 | BLOCKED |
| AC-14 | API/UI: negativo/diferencia visible sin clamp | BLOCKED |
| AC-15 | API/UI: saldo declarado y diferencia exacta; fecha no futura | BLOCKED |
| AC-16 | API/SQL: corrección/anulación auditada; sin DELETE | BLOCKED |
| AC-17 | API/UI: conciliación no comparable sin base | BLOCKED |
| AC-18 | API/procesos/UI: duplicado 409; última + `Varias` | BLOCKED |
| AC-19 | API/procesos: concurrencia e idempotencia | BLOCKED |
| AC-20 | API/SQL: tipo/condiciones con revisión; histórico no editable | BLOCKED |
| AC-21 | API/E2E: rectificación/anulación recalcula corte y conciliación | BLOCKED |
| AC-22 | API/SQL: sin capital/historia persistidos ni segundo ledger | BLOCKED |
| AC-23 | Bun integración: migración v16→nueva, rollback, versión desconocida | BLOCKED |
| AC-24 | Bun + E2E restore: backup/manifiesto/MFA | BLOCKED |
| AC-25 | Contrato consumidor E4.6/E4.7: Deuda no Saldo | BLOCKED |
| AC-26 | API seguridad: MFA/CSRF/Origin, 422 derivados, sin DELETE | BLOCKED |
| AC-27 | Playwright 1440 + capturas: ficha/corte/histórico/conciliación | BLOCKED |
| AC-28 | Playwright 390 + capturas: secciones apiladas y accesibles | BLOCKED |
| AC-29 | Playwright/API: vacío/carga/error/parcial/conflictos | BLOCKED |
| AC-30 | API/UI/inspección: sin simulación, cuadro, comisión, activo ni ajuste | BLOCKED |
| AC-31 | Suite completa + E2E: regresión E1.1–E1.6 | BLOCKED |
| AC-32 | API/Bun: exactitud EUR/tasas/textos/fechas | BLOCKED |
| AC-33 | API/SQL: auditoría append-only y sin datos sensibles | BLOCKED |

Los contratos futuros de E1.6 (`E1.6-AC-31…33`) y los consumidores E4.5/E4.6/E4.7/E4.11
siguen separados y no se declaran implementados por esta matriz.

## 5. Implementación y pruebas

- **Código:** ninguno.
- **SQL/migración:** ninguno; no se reserva versión nueva.
- **Pruebas financieras/negativas:** ninguna ejecutada.
- **Migración local ficticia / backup-restore:** no ejecutados.
- **Navegador 390/1440 / capturas:** no ejecutados.
- **QA independiente:** no iniciada; no hay candidato funcional que revisar.
- **CI:** no ejecutada; no hay PR funcional.

No se declara PASS funcional, cobertura implementada ni integración.

## 6. Validaciones documentales de esta entrega bloqueada

| Comprobación | Resultado |
| --- | --- |
| `git diff --check` | PASS |
| `python3 scripts/validate-template` | PASS |
| `python3 scripts/check-project` | PASS |
| `python3 scripts/check-repository` | PASS |
| `python3 scripts/ci_policy.py classify --base 1d539a8 --head <HEAD>` | `docs` (esperado) |
| `python3 scripts/verify` con Python 3.9.6 | BLOCKED: exige Python 3.10+ |
| Pruebas funcionales/E2E | UNRUN por bloqueo |

La verificación canónica final deberá repetirse con Python 3.10+ sobre el candidato
funcional cuando exista.

## 7. Riesgos y límites

- **Bloqueo de ownership:** E4.1 mantiene archivos compartidos sin integrar; no se puede
  garantizar un diff seguro ni una migración única.
- **Riesgo de doble migración:** E4.4 y E4.1 podrían reclamar la misma versión o alterar el
  manifiesto de backup.
- **Riesgo de conflicto de rutas/UI:** `app.ts` y `main.tsx` son puntos únicos de montaje.
- **Riesgo de pruebas cruzadas:** `deudas.test.ts`, `movimientos.ts` y `app.test.ts` son
  compartidos por ambos desarrollos.
- No hay datos reales, Excel, migración operativa, VPS, despliegue, B3/Dev32 ni cambios de
  harness/metodología.
- No se tocaron D5, E4.1, DEV16, E4.5/spec20 ni documentos compartidos.

## 8. PR y siguiente gate

- Rama local/remota: `codex/dev17-e44-deuda-completa` (se publica solo el estado
  documental de espera; sin código).
- No hay PR funcional ni merge; Codex gestiona la operación GitHub que requiera conexión.
- **Checkpoint conservado:** `c768d384be3fbad67ea73a2d64e29d10b5786ab3`; los cambios
  posteriores solo añaden estado de coordinación, sin reescribirlo.
- **Siguiente gate:** confirmación de D5 y cesión explícita de D5/E4.1; después, integración
  aprobada y refresh de `main`. DEV17 revalidará dependencias, ausencia de escritores,
  ownership y versión real antes de decidir cualquier migración.
- **No se inicia código** hasta que exista liberación efectiva.

## 9. Actualización de coordinación — 2026-10-27

Estado recibido del supervisor:

- **E4.1 y DEV17 conformes** con la propuesta de secuencia **D5 → E4.1 → DEV17**.
- **D5 aún no ha confirmado**; por tanto **no hay liberación efectiva** ni cesión de
  archivos.
- DEV17 **espera**:
  1. confirmación de D5;
  2. integración aprobada y cesión explícita de D5;
  3. integración aprobada y cesión explícita de E4.1;
  4. refresh de `main` y verificación de dependencias, ausencia de escritores y ownership.
- La lista de archivos compartidos a revisar se amplía, además de la ya registrada, con:
  - `apps/api/src/movement-ledger.ts`;
  - `apps/web/src/api.ts`;
  - fixtures y pruebas transversales que los diffs reales afecten.
- Durante la espera **solo** se permite preparación de `progress17` y `testplan17`
  propios. No se inicia código, no se reserva versión de esquema, no se modifican
  archivos compartidos y no se reabren Q1–Q7.
- No hay decisión financiera nueva ni cambio de alcance.

**Próximo gate:** confirmación de D5 + integraciones/cesiones de D5 y E4.1. Hasta entonces,
DEV17 permanece en espera y no reclama ownership ni versión.
