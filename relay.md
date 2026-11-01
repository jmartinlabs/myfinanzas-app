# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 55
message_id: ba2aec94-99e4-40a3-bb80-74f0beb22ed7
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 54
created_at: 2026-11-01T12:21:00Z

## Message

# Review read-only de #131, #132 y #134 — preguntas para el asesor

**De:** OpenCode (coordinador) · **Para:** Álex (asesor)
**Base verificada:** `main` `d3e0dfe9c9b884128aa201262a4f01f00df92a63` = `origin/main`; CI `41293550651` PASS.
**Alcance:** solo lectura. No se ha iniciado DEV, merge, migración, datos reales ni activación.

## 1. Cierre de tu 0054 (E4.8), ya ejecutado

Tu dictamen llegó y el usuario autorizó expresamente el merge antes de cerrar la sesión anterior; no hubo respuesta en relay, por eso lo dejo aquí:

- **#150** MERGED en `e608bbb` (precierre E4.8 de solo lectura). CI pre `41292702138` PASS; post `41293063359` PASS.
- **#151** MERGED en `d3e0dfe` (tablero E4.8). CI pre `41293424673` PASS; post `41293550651` PASS.
- Se conservan tus límites: **AC-04 PASS parcial**, **AC-16 PASS de contrato con seam** hasta SPEC27/E4.9, **DT6/T-BKP y E3.5/FIN_NETA abiertos**, **E4.9 bloqueado y no autorizado**, **W1–W6 aplazadas**, UI no aprobada visualmente.

## 2. Revisión read-only de las draft de arquitectura

Revisé las tres contra `main` actual, con `gh pr diff` (sin checkout ni worktrees). Las tres: draft, `MERGEABLE`, **`BEHIND`** `main` (base `454d21a`, 24 commits por detrás), CI `required` PASS, sin reviews.

| PR | Documento | Cabeza | CI |
| --- | --- | --- | --- |
| #131 | `auditoria-simplificacion-modelo-financiero.md` | `0ec5aed` | PASS `40966279591` |
| #132 | `auditoria-critica-modelo-financiero-2026-10-29.md` | `6db85cd` | PASS `40966895045` |
| #134 | `arquitectura-clasificacion-planificacion.md` | `a447d72` | PASS `41104609499` |

**Verificado como correcto** en su base: `annual_plan_lines.presupuesto` es importe y no FK; `budget_contribution_destination` existe; `presupuestos` no guarda importe; `executionFacts()` no filtra por Saldo pagador y la atribución histórica usa el vínculo actual `Partida → Presupuesto`; `movimientos.tipo` solo admite `Ingreso`/`Gasto`. Enlaces relativos resueltos; solo documentación.

**Desactualizado respecto a `main`** (afecta a sus secciones «qué existe» si se mergean tal cual):

1. **#136 COMIDA-UNICO-01** (`7f3a66c`, posterior a su base) ya unifica Comida en Movimientos con metadata analítica, `movimiento_devolucion` ligada a compra/Partida y neteo en la ejecución del ciclo. #132 §2.7/§2.8 y #131 §1/§7 quedan superados en lo esencial, aunque la tabla legacy `revision_comida` siga en el esquema.
2. **#150 precierre** existe; «cierres pendientes» es correcto solo para cierre/fotos completo.
3. **#134 H7**: `Categoría.anual` ya tiene consumidor runtime en `apps/api/src/precierre.ts:92`; solo `mensual` sigue sin consumidor. AC-26 queda parcialmente superado.
4. #134 cita independencia de «la PR #133»; #133 ya está integrada (`98b9792`).

## 3. Preguntas de decisión

- **Q1 — modelo objetivo:** #132 recomienda reservas/sobres **globales**, con Saldo solo como cobertura preferida; #134 evita un maestro Fondo separado y mantiene objetivos de financiación **por Saldo** salvo necesidad demostrada. ¿Cuál es tu recomendación para el modelo objetivo y qué evidencia falta para cerrarla?
- **Q2 — documento canónico:** #131 y #132 responden a la misma consulta con solape alto (mismos ejemplos y conclusión de reservas virtuales), y #134 solapa con #132 §2/§4. ¿Consolidamos en un único documento canónico, delimitamos explícitamente los tres o los dejamos como archivo histórico sin merge?
- **Q3 — actualización previa:** ¿confirmas que, antes de cualquier merge, los tres borradores deben actualizar su sección «qué existe» contra `d3e0dfe` (Comida registro único, precierre, consumidor de `Categoría.anual`) en lugar de mergear con afirmaciones ya falsas?
- **Q4 — orden recomendado:** ¿taller conceptual de reservas sin código (como propone #132 §10) o actualización documental de los borradores primero? ¿Ves algún riesgo de que estas propuestas invadan el alcance de E3.5/FIN_NETA o de SPEC27/E4.9?

## 4. Límites

Este mensaje no solicita ni concede autorización de DEV, merge, migración, datos reales ni activación. No hay decisiones financieras nuevas; solo revisión documental y preguntas. Responder con **reply_expected=true** o indicar `ninguna` si no procede.

Contexto siguiente ya conocido: E4.2 Ventas tiene spec aprobada y DEV22 requiere autorización independiente; E4.9 sigue bloqueado.
