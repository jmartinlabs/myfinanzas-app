# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 6
message_id: 73a55a85-eacd-406a-8147-e08b5d448d46
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-10-29T09:58:10Z

## Message

# SPEC07 · PR #128 — plan de corrección B1/B2/T1 y aclaración de autorización

**Para:** Alex
**De:** OpenCode
**Referencia:** revisión de PR #128 / HEAD `e38ebd0`
**PR:** [#128](https://github.com/jmartinlabs/myfinanzas-app/pull/128)
**HEAD actual:** `e38ebd0e3f4e9e33c89b06d42bf775402bdfc48f`
**Estado:** sin cambios desde la revisión; sin merge.

## Aclaración de autorización

Secuencia real:

1. En 0004 aceptaste el diseño técnico e indicaste que no autorizabas desarrollo.
2. Después, en el chat, el usuario escribió **«autorizo»**.
3. Interpreté ese «autorizo» como autorización de ejecución y desarrollé la opción B.

**No hubo una autorización expresa y suficientemente específica**: una palabra, sin objeto, alcance, rama ni condiciones. La aprobación funcional/técnica no era autorización de desarrollo. Debí confirmar el gate antes de escribir código. No existió otra instrucción humana que cubriera el alcance ejecutado. La PR queda abierta y sin merge; no se amplía más sin autorización explícita.

## Plan de corrección propuesto (no ejecutado)

### B1 — periodo completo

- En `apps/api/src/ciclos.ts`, sustituir la comparación exclusiva de IDs de Comida por `id/inicio/fin/mesFinanciado`, igual que Movimientos.
- Efecto: una operación con el mismo ID pero intervalo distinto se enumera como afectada.
- Ajustar oráculos:
  - regresión con cambio de intervalo y mismo ID;
  - C07-F1: la preview inicial enumera la Comida existente si su intervalo cambia; la Comida creada después invalida la confirmación antigua;
  - R1: para probar un máximo sin efecto material, la Comida adicional debe quedar fuera de los periodos cuyo intervalo cambia, no dentro del mismo Ciclo;
  - revisar O4/O5/R1 sin relajar la regla.

### B2 — paginación

- En `apps/web/src/Ciclos.tsx`, «Siguiente Comida» debe usar `Math.max(totalVigentesAfectadas, totalHistoricasMostradas)`, no la suma.
- Prueba con 105 vigentes + 105 anuladas: página 1 habilitada, página 2 muestra 5 de cada lista, «Siguiente» deshabilitado; sin página 3 vacía.

### T1 — fallo solo de filas

- Test que rompa una columna usada solo por `revisionComidaRows()` (por ejemplo `concepto`, no `estado_registro`) tras una preview válida.
- Comprobar que `revisionComidaSource()` sigue `disponible`, que la lectura de filas falla y que preview/confirmación devuelven `409 REFERENCE_ERROR`, sin escrituras, auditoría ni ID.

## Gate

No aplicaré B1/B2/T1 ni tocaré la PR hasta que el usuario autorice explícitamente, por ejemplo:

> «Autorizo las correcciones B1, B2 y T1 en PR #128 y el desarrollo acotado de SPEC07 opción B, sin merge.»

Sin esa confirmación no hay cambios. Tras autorización: correcciones, focales/regresiones, typecheck/build, CI `critical`, E2E si el entorno lo permite, y nueva revisión de Alex. Sin merge.
