# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 154
message_id: 18e4b651-9f48-4dd5-b41d-30253fa611f5
from: Alex
to: OpenCode
reply_expected: true
in_reply_to: 153
read_by: none
created_at: 2026-11-05T09:26:14.668Z

## Message

## Respuesta de Álex a 0153 — siete precisiones E4.5

**Estado:** revisión de alcance PARCIAL; **diff exacto NO VERIFICADO**. Sin nuevas autorizaciones.

He comprobado en GitHub que #200 está MERGED (`0176ffc`), #215 sigue draft (`dbd47ec`) y #216 está draft (`8394be9`), con C3/AC-56 corregido en SPEC20/testplan. No se altera DT6/T-BKP, DT7 ni el estado funcional UNRUN.

**Bloqueador de la revisión exacta:** el commit local `78d7891` no está disponible por API de GitHub (422 No commit found) y `refs/heads/docs/e45-precision-proposal` no existe en el remoto accesible (404). No puedo contrastar ese patch ni confirmar que sus frases son exclusivamente editoriales. **No doy APTO ni autorización para aplicarlo por inferencia.**

**Criterios que debe respetar el diff propuesto:**
1. AC-48/49/58: acreditar explícitamente universo DT7 y cobertura completa de la Partida/fuente antes de certificar total; jamás inferir completitud por presencia de filas.
2. AC-58: distinguir el estado por Partida de `annualExecution` (`items[]`) del estado global compuesto por el lector `getAnnualPlan/read` (`totales`); no atribuir al proveedor por Partida un global que no calcula.
3. `representado`: si se utiliza como nombre contractual abreviado, indicar el mapeo explícito a `representadoEnMovimientos` y los valores Si/No/Desconocido; evitar dos fuentes de verdad, renombrado persistente o cambio de contrato por una precisión editorial.
4. AC-53/D14: `NoDisponible` puede ser estado local de una Partida; si otra tiene cobertura, el global será `Parcial`/`NoVerificable`, no `NoDisponible`.
5. Q5=A regula la justificación/efecto de `Regularizacion2026`; Q7=A mantiene `AperturaHistorica` fuera de Gastos y su cobertura. No sumar aperturas.
6. Agregado que excede corte: publicar contexto en `agregadoNoAtribuible[]`, motivo `AgregadoNoAtribuibleAlCorte`; no recortar, prorratear ni certificar total/subtotal no separable (`null`).
7. `AnnualProvenance.extraidoEn`: conservarlo como timestamp de extracción/procedencia, **nunca** como fecha económica acreditada.

**Solicito:** exponer el patch EXACTO de `78d7891` en un medio accesible de solo revisión (rama remota de propuesta separada de #216, o diff íntegro en el Relay), con base, lista de archivos y líneas. No aplicarlo a #216 hasta validar alcance. Se puede preparar sin modificar el candidato ni fusionar PR.

**Observación adicional:** la descripción de #215 aún declara el viejo #216 `5d3ad0b` y la QA C3 NO APTO; antes de pedir merge de #215, reconciliar esa referencia con `8394be9` y el nuevo dictamen.

**Autorizaciones:** ninguna nueva. Sin merge de #215/#216, sin DEV E4.5, sin T1 por impacto, sin datos reales, importación, VPS ni cierre real.
