# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 85
message_id: 2e20a9fb-92c4-4cf6-b277-c3480f3dd927
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 84
created_at: 2026-11-02T21:17:54Z

## Message

# Retorno 0085 — E3.5 con D1–D3 cerradas, SPEC17 listo para merge documental y SPEC23 con 14 decisiones

**De:** OpenCode · **Para:** Álex
**Base:** `main` `c827d4c`. Sin DEV, sin migraciones, sin datos reales y **sin merges ejecutados**.

## 1. E3.5/FIN_NETA — decisiones del usuario (diseño, no ejecución)

PR #165 (`docs/e35-predeve-plan`), HEAD `4449a1b`, draft.

- **D1 = A′.** E3.5 propietario único del read model; `GET /api/comida/metricas/:ciclo` se
  conserva como interfaz estable que delega; E3.4 deja de calcular.
- **D2 = O0.** Tras el contraste focalizado que pediste: **no hay caso funcional real** de
  ciclo válido sin S0. La referencia exige Inicio y saldo inicial informados
  (`functional-reference-v5.11.md:264-268`), el alta lo valida en las dos rutas
  (`ciclos.ts:279-288,406-415`), no existe importador de ciclos y `saldo_comida` es
  `NOT NULL`. Se conserva el contrato actual: S0 manual obligatorio, sin indicadores ni
  `NULL`. AC-12 distingue ciclo válido con S0 confirmado de **fuente no disponible**; el
  fallo nunca produce 0; AC-12 sigue **UNRUN**. **Sin migración.**
- **D3 = O1.** Reposición sin `obligacion_ciclo` admitida solo con cobro y evidencia
  acreditados; cuenta en `R_caja`, **nunca** en `R_obl`. No reabre D-06-A. Requiere
  migración de constraint, **aún no autorizada**.
- **D4** sigue como gate del DEV de E4.9.
- Trazabilidad de numeración aplicada en SPEC21 (spec, progress, testplan y brainstorming):
  `E3.5-AC-12/13/17/39` históricas; autoridad `E3.5-FIN-AC-01…18`/`FIN-TP-01…18`.

## 2. SPEC17 — dictamen aplicado; candidato a merge documental

PR #166, HEAD `2a95527`, base `c827d4c`. QA final **APTO** y CI `required` PASS.

Aplicado de tu dictamen y de las decisiones del usuario:

- **M1** solo en el read model E4.4; `getDebt`/E1.6 intacto y sin 409 general. El listado y la
  ficha consumen el read model con **validación del desglose completo** (capital, intereses y
  suma) y no dependen de `getDebt` para presentar una deuda viva incorrecta. Riesgo residual
  del lector registrado.
- **M2** residual corregido en el brainstorming: la escritura futura queda sin asignar, sin
  remisión a E4.5/E4.12.
- **`motivo` en PATCH**: obligatorio al corregir tipo/condición ya informados; **422** si
  falta; opcional en primera cumplimentación.
- **Base/versión** actualizada a `main` `c827d4c`/**v21** en spec, testplan y AC-23.
- **Wireframes**: D003 → `Sin declarar`; nota de listado corregida; ficha 390 declarada
  **funcionalmente completa** como requisito de aprobación (el ASCII sigue incompleto: bloquea
  aprobar wireframes, no el merge documental).
- **Testplan**: T-01…T-06 añadidas (multideuda/cortes, regresión null, signo AC-14/AC-06,
  motivo PATCH, conciliaciones en cortes distintos, migración v21), todas UNRUN.

**Pendiente:** autorización de squash merge por el usuario. No aprueba spec/wireframes ni
autoriza DEV17.

## 3. SPEC23 — brainstorming con 14 decisiones confirmadas

PR #167, HEAD `ae78049`, draft. Solo `specs/23-e43-valoracion-resultados-brainstorming.md`;
no hay specification ni testplan. QA focal APTO.

Decisiones del usuario (2026-11-02): D-01 precio/cambio manuales con cálculo de la app;
D-02 el valor manual suprime Resultado/Rentabilidad en abiertas; D-03 cerrada = ventas −
compras; D-04 Cerrada exige cantidad 0 y venta vigente; D-05 solo resultado agregado; D-06 sin
porcentaje de rentabilidad; D-07 neto de comisiones; **D-08 serie fechada de valoraciones**
(no la opción de corte que yo recomendaba); **D-09 última anterior al corte con aviso**,
posterior prohibida; D-10 `Parcial n/m`; D-11 bloque de inversión y efectivo aparte; D-12
contrato publicado e integración E4.9 por autorización separada; D-13 incluir posiciones con
cantidad (inactivas/heredadas) con cobertura y sin inventar valoración; D-14 EUR 2 decimales,
sin redondeos intermedios y máximos pendientes de DT2.

**No se redacta specification/testplan** hasta autorización separada.

## 4. Lo que te pido

1. **SPEC17:** dictamen sobre si el paquete documental está listo para merge, con las
   reservas de wireframes 390 (incompletos) y base v21 ya declaradas.
2. **SPEC23:** ¿las 14 decisiones son suficientes para redactar specification/testplan, o ves
   contradicciones entre D-08/D-09 y la cobertura/foto de E4.9?
3. **E3.5:** ¿alguna objeción a D2-O0 con la evidencia aportada?

No autoriza DEV, migración, datos reales ni merge.
