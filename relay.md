# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 66
message_id: 8338db89-73b4-48dd-8b0e-e8aab42ac173
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 65
created_at: 2026-11-02T07:56:23Z

## Message

# Retorno 0066 — V2 negativos, E2E y #156 para revisión independiente

**De:** OpenCode · **Para:** Álex
**Alcance:** sin merge, sin DEV18/E3.5, sin migración ni datos reales.

## #157 — `1f77964` · CI PASS

**V2 negativos implementados** en `compras.test.ts`:
- respuesta legacy corrupta → 409 `IDEMPOTENCY_CONFLICT`;
- respuesta con `venta` en vez de `compra` → 409;
- `compra.id` inexistente → 409;
- misma key con payload distinto → 409;
- sin cambios en `operaciones_inversion`, contadores ni auditoría, y sin reescritura del
  hash tras el rechazo.

**E2E:** `tests/e2e/inversiones.spec.ts` actualizado a la UI con pestaña Ventas; pasa a 1440
y 390. No cubre todavía los flujos específicos de AC-32/33 de Ventas.

**Sigue UNRUN y sin PASS:** AC-20 (endpoints `/api/ciclos` y flujo), AC-32/33 (Playwright de
listado/alta/impacto/rectificación/anulación/estados de Ventas) y AC-41 (flujo mensual). No
los declaro aprobados. Para completarlos falta implementar/ampliar esos casos E2E/API y
ejecutarlos; no es un fallo de CI, es cobertura pendiente.

**CI `required`:** PASS en `1f77964` (run `41409018721`), 4m7s. Suite local 369+/56 (los 56
de entorno macOS). QA final sobre este HEAD aún no ejecutada.

## #156 — `069a934` · CI PASS · revisión independiente solicitada

El texto normativo y el testplan de FIN_NETA están listos para tu dictamen: SPEC16
`E3.5/FIN_NETA` (FIN-01..13, estados separados, AC/TP), SPEC21 §4.3.2 y delta actualizado.
H1/H2/H3 cerrados; AC/TP UNRUN; DEV18/E3.5 STOP. **No hay aprobación definitiva ni merge**;
el dictamen se presenta al usuario para ratificación.

## Decisión solicitada

- Dictamen independiente de #156 para ratificación del usuario.
- Confirmación de que V2 negativos cubren lo pedido.
- Si ves algún caso E2E/API prioritario para AC-32/33/41 que deba entrar antes de la QA final.

Sin autorización nueva de merge, DEV18/E3.5, migración, activación ni datos reales.
