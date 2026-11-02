# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 64
message_id: 902d452c-3eaa-4e54-9080-ea7e1ccc4155
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 63
created_at: 2026-11-02T07:28:09Z

## Message

# Retorno 0064 — V1–V3 y H1–H3 corregidos; evidencia por PR

**De:** OpenCode (coordinador) · **Para:** Álex (asesor)
**Alcance:** correcciones dentro de DEV22 y de la enmienda E3.5 ya autorizadas. **Sin merge,
sin DEV18/E3.5, sin migración ni datos reales.** No se amplía autorización.

## #157 — DEV22 · HEAD `925fae1` · CI `required` PASS

**V1 — corregido y probado.** `previewSaleRectification` aplica ahora `assertSufficient` con
la misma semántica D2 que `rectifySale` (`includePreviousInAvailable`). AC-30 exige 422
`INSUFFICIENT_CASH` en el impacto, con `disponible/necesario/minimo/fecha`, sin escritura.

**V2 — corregido y probado con fixture v20 real.** `createPurchase` calcula hash nuevo y
legacy. Un intento legacy solo se acepta si:
1. el hash almacenado coincide exactamente con el legacy del payload de Compra recibido;
2. la respuesta persistida contiene `compra.id` y esa operación existe con `clase='Compra'`;
3. se actualiza el hash al formato nuevo en la misma transacción, conservando respuesta e ID.

Cualquier respuesta ambigua, corrupta o de Venta falla cerrado con 409. No se borran intentos
ni se normalizan durante la migración. Regresión: base v20 genuina + `operacion_attempts`
vigente → mismo ID tras upgrade, siguiente reintento válido, hash normalizado.

**V3 — corregido y probado.** El trigger `operacion_inversion_identity_immutable` incluye
`clase`; el contrato `C21-VENTAS-E42` se regeneró (258 objetos, SHA-256 `01cb4c49…`).
Regresión SQLite: `UPDATE ... SET clase='Venta'` sobre una Compra se rechaza y no altera la
operación.

**V4 — sin cambio de estado.** Siguen **UNRUN**: AC-20 (endpoints/flujo), AC-19/23/27/44
(UI), AC-32/33 (Playwright) y AC-41. No se declara PASS de UI/E2E ni se asigna por CI
unitario. El encabezado del progress se actualizó al estado real.

**Verificación:** `ventas.test.ts` 24/24; `compras.test.ts` V2 PASS; suite local 369 pass /
56 fail (los 56 de entorno macOS, idénticos a la línea base); typecheck/build PASS; CI Linux
`required` PASS en `925fae1` (run `41406097861`).

## #156 — E3.5/FIN_NETA · HEAD `069a934` · CI `required` PASS

- **H1:** el bloque histórico de SPEC21 queda marcado como **superado para el régimen
  individual**; §4.3.2 es la única regla operativa y se conserva su procedencia.
- **H2:** separadas **obligación** (`Completada` / `Parcial` / `Sin obligación acreditada`) y
  **cobertura** (`Verificada` / `Parcial` / `No disponible`). Se conserva `Parcial` como
  estado de obligación, sin rename silencioso; la cobertura se etiqueta aparte.
  `R_obl < C_n` con cobertura verificada no bloquea E4.9 por sí solo.
- **H3:** el delta registra la aprobación conceptual y deja pendiente solo la aprobación del
  texto normativo final; no reabre D-01..D-11.

**Verificación:** `verify` clasificación `docs` PASS; CI PASS en `069a934`. AC/TP siguen
**UNRUN**; DEV18/E3.5 STOP.

## Confirmación solicitada

1. ¿La validación V2 (hash legacy + respuesta Compra + normalización) cubre las salvaguardas
   que pediste, o falta algún caso de fallo cerrado?
2. ¿La separación H2 con `Parcial` como estado de obligación y `Cobertura parcial` como
   dimensión independiente es aceptable sin rename?
3. ¿Alguna objeción a mantener V4 como UNRUN hasta ejecutar Playwright/UI y endpoints?

Sin autorización nueva de merge, DEV18/E3.5, migración, activación ni datos reales.
