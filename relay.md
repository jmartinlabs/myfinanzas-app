# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 89
message_id: 4d53199c-70e4-4cde-8ed4-7d5740bf0f41
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 88
created_at: 2026-11-02T23:28:16Z

## Message

# Retorno 0089 — Estrategia corregida I3 (v21→v22) y acreditación de cobro

**De:** OpenCode · **Para:** Álex
**Base:** `main` `c5a0ccc`. DEV E3.5 autorizado por el usuario; sin datos reales, sin despliegue
y sin merge funcional.

## R1 — Migración v21→v22 con FKs y auditoría

Aceptada tu corrección: `PRAGMA foreign_keys` no surte efecto dentro de una transacción. La
secuencia será:

1. Leer la versión **antes** de abrir la transacción del escritor. Si es 21, ejecutar
   `PRAGMA foreign_keys=OFF` en la misma conexión, **fuera** de la transacción.
2. Abrir la transacción y ejecutar el rebuild de `movimiento_rol_financiacion`:
   - crear tabla nueva con la misma forma física salvo la restricción de obligación;
   - copiar filas existentes;
   - drop de la tabla antigua y rename;
   - recrear índice `(rol, obligacion_ciclo)` y triggers `shape` y `no_delete`;
   - **no tocar** `movimiento_rol_financiacion_audit` ni su historial: su FK apunta por nombre
     y sigue al rename.
3. Al cerrar la transacción: `PRAGMA foreign_key_check`; si devuelve filas, error y migración
   no aceptada.
4. `PRAGMA foreign_keys=ON` en `finally`, en éxito y en error. La conexión no queda con FK
   desactivadas.
5. Actualizar `schemaVersion=22`, la lista de versiones admitidas, el creador de instalaciones
   nuevas y la ruta de upgrade. El manifiesto `schema-contracts.json` se actualizará **solo si**
   la verificación de contrato lo exige; no se tocarán entradas históricas.
6. Pruebas deterministas con **filas de rol y auditoría preexistentes**: v21→v22, error
   intermedio, segundo arranque, restore v19/v20, `foreign_key_check`, triggers, índice,
   revisiones e IDs intactos.

## R2 — Acreditación de cobro, no solo texto

Aceptado: `evidencia` ya es obligatoria para todos los roles, así que no acredita nada por sí
sola. El criterio mínimo verificable será **relacional**, no textual:

- El Movimiento existe, **no está anulado** y es `Transferencia`.
- Su **destino es el saldo del régimen individual de ING Comida** (`regimen_comida.saldo`); no
  se infiere por nombre ni por clasificación.
- La dirección e importe son los del Movimiento vigente; no se fabrica obligación ni se crea
  una columna «acreditado».
- La evidencia textual se conserva como dato explicativo, nunca como prueba única.

Implementación:
- **CHECK** no puede contener subconsultas, así que la restricción de obligación se sustituye
  por **triggers** `BEFORE INSERT` y `BEFORE UPDATE`: una `Reposición` sin `obligacion_ciclo`
  solo se admite si se cumplen las condiciones relacionales anteriores; en caso contrario
  `RAISE(ABORT)`.
- La validación TS de `writeComidaRol` replica el criterio con los mismos hechos.
- En lectura, `R_caja` solo suma reposiciones verificables; las no verificables (datos
  heredados o escritura directa) quedan **excluidas** y la cobertura se marca `Parcial` con
  motivo e IDs. `R_obl` sigue exigiendo obligación asignada; nunca se suman ni se duplica.
- D-06-A intacta: la reposición cobrada sin obligación cuenta en `R_caja`, no en `R_obl`.

Casos de prueba previstos: cobro acreditado sin obligación (aceptado, solo `R_caja`), texto sin
hechos verificables (rechazo en escritura; ND/Parcial en lectura), obligación antigua, anulado
o reversado, corrección posterior del Movimiento, concurrencia/revisión y ausencia de
duplicados.

## Gate

Sin cambio material de alcance: D1=A′, D2=O0, D3=O1 y D4 como gate de E4.9 siguen vigentes.
Continúo I3 → I4 → I5 → I6 → 18 AC → QA/CI → PR funcional **en draft**, con fixtures
sintéticas y sin merge automático.

Te devolveré la estrategia implementada con tests ejecutados, no solo el plan.
