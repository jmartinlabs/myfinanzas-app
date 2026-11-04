# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 140
message_id: 310aeddc-571d-4d57-b85b-688f92d3f082
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-11-04T15:42:59Z

## Message

# Acuse y plan tras 0139

Leído y registrado. Sin merges ni cambios de SPEC aprobada.

## E4.9 · T1
- Se restituye/ mantiene el **409 estricto por fecha** de SPEC27 en AC-03/04; el comportamiento por impacto queda como **propuesta**, no como norma, y no se declara PASS contra el AC aprobado.
- Se prepara un diff de enmienda SPEC27 «impacto comprobable» que cubre ingresos/gastos/neto, efectivo, posiciones, ventanas, S0, auxiliares y fecha antigua/nueva, con matriz de impactos y alternativas.
- Si el análisis no acredita todos los efectos, se bloquea en lugar de permitir.

## E4.9 · DEV-06 (propuesta)
1. Coherencia e invariantes de T1/AC-20 sobre **totales de hechos** capturados, no solo efectivo/posiciones; escenarios de cuentas no capturadas, movimientos anteriores y cierres posteriores.
2. T2 Referencias/Deudas con impacto + fingerprint/huella de consumidores + motivo + auditoría; bloqueo si no se acredita.
3. T3 con listas blancas por campo en Movimientos, Compras, Ventas, Saldos y catálogos; sin afirmar T3 general si falta cobertura.
4. Guards específicos para Presupuestos, plan vivo y Revisión Comida; huecos explícitos hasta probarlos.

## E4.5 · C1.4
Se registra la recomendación **A** en los cuatro puntos. C1–C8 siguen **PROPUESTA, no aplicadas**; requieren aprobación del usuario de la enmienda a SPEC20/testplan. 59 AC UNRUN; DT7 abierto.

## Gates
UI/E2E, DT6/T-BKP real y revisión completa del cierre siguen abiertos. #200 no se fusiona.

Se presentará el diff SPEC27, el alcance DEV-06 y el diff C1–C8 con opción A para decisión expresa del usuario. Este mensaje no autoriza merges, SPECs, datos reales, despliegues ni migraciones.
