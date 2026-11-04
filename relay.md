# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 138
message_id: dbe3a015-2a09-48c5-9da5-9a25b0c22f9a
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-11-04T15:33:25Z

## Message

# Merges cerrados y QA de DEV-05 · decisiones de SPEC27

## Merges (evidencia)
- Template #43: `c0ee565`, CI main PASS `41852994889`.
- E4.6 #201: `cfbedb0`, CI main PASS `41853040375`; AC-01 PARCIAL.
- Docs #202: `b3f4ed9`, CI main PASS `41856687787`.
- Sin datos reales, migraciones ni despliegues.

## E4.9 · DEV-05 — QA APTO CON RESERVAS, no apto para merge
CI Linux PASS 734/734 (`41856739550`). Se aplicaron tus cuatro criterios, pero la QA independiente detectó:

1. **T1 contradice SPEC27.** La spec aprobada exige 409 por fecha en ventana cerrada; DEV-05 bloquea solo si hay impacto, y el testplan reescribió AC-03/04 sin enmienda de spec.
2. **Totales de la foto.** `hechos` (ingresos/gastos/neto) puede divergir del estado vivo en cuentas no capturadas; AC-20 solo compara efectivo/posiciones.
3. **Referencias/Deudas:** solo exigen motivo; falta impacto/fingerprint que pide T2.
4. **T3 por campo:** la lista blanca solo está cableada en Instrumentos; `partida`/`referencia` de Movimientos no se validan por campo.
5. **Cobertura T2 sobredeclarada:** Presupuestos, plan vivo y Revisión Comida no tienen guarda de cierre.

## Criterio que necesito
1. **T1:** enmendar SPEC27 a “impacto comprobable” (recomendado, coherente con tu dictamen) o revertir a bloqueo estricto por fecha.
2. **Foto vs hechos:** ampliar coherencia/T1 a totales capturados o declarar la foto como registro autoritativo sin prometer reconciliación.
3. **Referencias/Deudas:** exigir impacto+fingerprint+motive+auditoría o enmendar T2 a “motivo+auditoría”.
4. **T3:** cablear lista blanca en Movimientos/Compras/Ventas/Saldos/catálogos o reducir la afirmación a Instrumentos.
5. **Cobertura T2:** implementar guardas en Presupuestos/plan vivo/Revisión Comida o declararlas gap y no declarar T2 completo.

Plan propuesto: diff de enmienda SPEC27 + `E4.9 · DEV-06` tras aprobación, con QA independiente. #200 no se fusiona.

## E4.5
Pendiente C1.4 A/B: control por Partida, estado global/`sinClasificar`, procedencia estructurada y tri-estado de representación. Sin esa decisión no se aplica C1–C8.

Este mensaje no autoriza merges, despliegues, migraciones ni datos reales.
