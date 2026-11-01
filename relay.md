# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 62
message_id: f557f42c-114f-4a60-bb18-d92bcb563408
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 61
created_at: 2026-11-01T22:11:00Z

## Message

# Retorno a 0061 — verificación inicial de #156 y #157

**De:** OpenCode (coordinador) · **Para:** Álex (asesor)
**Alcance:** revisión y confirmación; **sin merge, sin DEV18/E3.5, sin migración ni datos reales**.
No se amplía la autorización de DEV22.

## #156 — E3.5/FIN_NETA

**Acepto H1–H3.** Confirmado por lectura:

- **H1:** `specs/21-pendientes-conciliacion-specification.md:202-267` conserva el bloque
  histórico `RECURSOS=S0+FIN_NETA+REP`, `CIERRE=RECURSOS−GC−CO`, `FALTA=max(CO−REP,0)`
  junto a la reconciliación de §4.3.2. Propuesta: marcarlo expresamente como **propuesta
  histórica superada para el régimen individual**, sin borrar su procedencia, y dejar §4.3.2
  como única regla operativa.
- **H2:** `specs/16-revision-comida-specification.md:1526-1536` mezcla obligación pendiente
  y cobertura incompleta bajo `Parcial`. Propuesta: separar **estado de obligación**
  (`Completada` / `Pendiente` / `Sin obligación acreditada`) y **estado de cobertura**
  (`Verificada` / `Parcial` / `No disponible`), con motivo por métrica; `R_obl < C_n` con
  cobertura verificada no bloquea E4.9 por sí solo; E4.9 bloquea si FIN_NETA/E3.5 requerido
  no es verificable.
- **H3:** el delta conserva «Ninguna opción está aprobada» y el paso final pide decidir
  D-01..D-11. Propuesta: actualizar a «Aprobación conceptual A con precisiones
  2026-11-01; pendiente la aprobación de la enmienda normativa final», sin reabrir las once
  decisiones ni crear un tercer contrato vivo.

**Dictamen:** favorable con ajustes; no merge todavía. AC/TP siguen **UNRUN**.

## #157 — E4.2 DEV22

**V1 — confirmado por inspección.** `previewSaleRectification()` (`ventas.ts:328-363`) llama
`assertUnitsAvailable` pero no `assertSufficient`; `rectifySale()` sí lo hace (~394). Un
impacto puede mostrarse confirmable y la confirmación fallar con 422 `INSUFFICIENT_CASH`.
Propuesta: añadir la misma validación D2 al preview y una regresión con saldo posterior
negativo que falle antes del fix.

**V2 — confirmado por inspección.** `compras.ts:521-529` antepone `["clase","Compra"]` al
hash de idempotencia. `operacion_attempts` se conserva en la migración v20→v21, así que un
intento de Compra pre-v21 con la misma key/payload produce hash distinto y puede devolver
409 `IDEMPOTENCY_CONFLICT`. Propuesta: aceptar el hash **legacy** solo para intentos cuya
respuesta sea una Compra, devolver el mismo hecho y reescribir el hash al formato nuevo en
la misma transacción, sin borrar intentos ni relajar el aislamiento Compra/Venta. Requiere
prueba con fixture v20 real y `operacion_attempts` vigente.

**V3 — confirmado por inspección.** `venta-schema.ts:47-49` incluye instrumento y Saldos en
`operacion_inversion_identity_immutable`, pero no `clase`; un `UPDATE` SQL directo puede
reclasificar una operación. Propuesta: añadir `clase` al trigger y al contrato C21,
regenerar el manifiesto congelado y probar el rechazo sin cambio de hechos ni auditoría.

**V4 — aceptado.** AC-20 (endpoints/flujo), AC-19/23/27/44 (UI), AC-32/33 (Playwright) y
AC-41 siguen **UNRUN**; no se asignará PASS por CI unitario. El encabezado del progress
conserva un estado pre-corrección y debe actualizarse. La evidencia UI/E2E requiere
ejecución independiente en el HEAD final.

**Dictamen:** no merge todavía. DEV22 sigue autorizado para estas correcciones; no se
reabre SPEC22 ni D7.

## Decisión que solicito al asesor

¿Ves riesgo en la compatibilidad V2 propuesta (aceptar hash legacy solo para respuestas de
Compra y reescribirlo sin borrar el intento)? ¿Alguna objeción a separar estado de
obligación y cobertura en #156-H2?

Sin autorización nueva de merge, DEV18/E3.5, migración, activación ni datos reales.
