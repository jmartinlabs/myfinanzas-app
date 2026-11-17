# 37 — Registro coordinado de gastos: Progress

Status: **I1 (`G-v30`) implementado, en revisión.** SPEC37 [aprobada](37-registro-coordinado-gastos-specification.md)
en D1–D10 y AC-42/AC-43 (2026-11-16). Incrementos y paquete de esquema:
[incrementos de desarrollo](investigations/spec37-dev-increments-2026-11-16.md) (#484), con
autorización global I1–I6 del 2026-11-16. Test plan: [testplan](37-registro-coordinado-gastos-testplan.md).

Base medida: `test` `0e1f34d`, esquema `v29`. Datos reales fuera de alcance.

| Incremento | Estado | Evidencia |
| --- | --- | --- |
| **I1 · Gate `G-v30`** | **implementado / en revisión** | `apps/api/src/spec37-schema.ts`, contrato `C30-SPEC37-COORDINADO-0E1F34D`, `spec37-schema.test.ts` |
| I2 · Registro del pendiente coordinado | pendiente | depende de I1 verificado en `test` |
| I3 · Operación coordinada atómica | pendiente | depende de I2 |
| I4 · Confirmación, vínculo y cancelación | pendiente | depende de I3 |
| I5 · UI, bandeja y alertas | pendiente | depende de I4 |
| I6 · Regresión y E2E de los 43 AC | pendiente | depende de I5; los AC siguen `UNRUN` |

## I1 · contenido entregado

- Migración **aditiva** `v29 → v30` sobre `transferencia_pendiente`: columnas
  `anticipo_previsto`, `gasto_revision` y `modalidad`, con `CHECK` de columna.
- Índice único parcial `transferencia_pendiente_gasto_activo`: un pendiente activo por Gasto.
- Tabla técnica `operacion_coordinada_attempts` para la idempotencia de I3.
- Triggers: inmutabilidad de `modalidad` con `IS NOT` (cubre `NULL → valor`) y coherencia por
  `origen_tipo` en `INSERT` y `UPDATE`, porque SQLite no admite `ALTER TABLE … ADD CONSTRAINT`.
- Preflight de duplicados: si ya hubiera dos pendientes activos del mismo Gasto, la migración
  aborta **antes** de escribir.
- Centinela desplazado a `v31`; manifiesto de backup `e37.1-v30`; contrato `C30` registrado.
- Sin API, sin UI y sin consumidores de las columnas nuevas: eso es I2–I6.

## Incidencias y ajustes

- Las pruebas de contrato de versiones anteriores comparaban el manifiesto **exacto** de `C29`
  contra una base nueva; ahora la base nueva es `v30` y se comparan contra `C30`, conservando
  además la comprobación de que ningún objeto de `C29` desaparece.
- Las pruebas de `SPEC36` que creaban `RegistroCoordinado` sin `modalidad` y dos pendientes
  activos del mismo Gasto se adaptaron al contrato v30: se aporta `modalidad` y se cancela el
  pendiente anterior antes de crear el siguiente. No se retiró ninguna aserción.
- El trigger de modalidad se prueba con los cuatro pasos (`NULL→A`, `A→NULL`, `A→B` abortan;
  el resto del pendiente sigue editable) aislando los triggers de coherencia, y se documenta por
  qué: con ellos activos ningún cambio de modalidad es posible por origen.