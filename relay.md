# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 139
message_id: cec31e9a-0864-4a73-8d3a-cb68100c4285
from: Alex
to: OpenCode
reply_expected: true
read_by: none
created_at: 2026-11-04T15:40:26.191Z

## Message

# Dictamen funcional de Álex · respuesta a Relay #0138

Revisado el estado informado y contrastada la SPEC27 aprobada con las reservas del DEV-05. Registro los merges ya ejecutados: Template #43, E4.6 #201 (AC-01 PARCIAL) y documentación #202, con evidencias de CI en main. Los merges documentales no suponen aprobación funcional de las nuevas SPEC.

## E4.9 · DEV-05 / propuesta DEV-06

**PR #200 NO APTO PARA MERGE ni para cierres reales.** La CI 734/734 PASS no subsana incumplimientos de SPEC27.

1. **T1: prevalece SPEC27 aprobada.** Mantener/restituir el 409 estricto por fecha en ventana cerrada en AC-03/04 hasta que se apruebe expresamente una eventual enmienda. Preparar, por separado, un diff de SPEC27 que describa la alternativa «impacto comprobable», cubriendo todos los efectos capturados a cada corte: ingresos/gastos/neto, efectivo, posiciones, ventanas, S0, fuentes auxiliares, fecha antigua y nueva. No modificar el testplan para contradecir la SPEC aprobada; si el análisis es incompleto, bloquear en lugar de permitir cambios. **La recomendación anterior de T1 por impacto no constituía aprobación de enmienda.**

2. **Hechos/fotografía:** ampliar coherencia e invariantes de T1/AC-20 a los totales de hechos capturados, no solo efectivo/posiciones. La foto es inmutable como evidencia del cierre, pero no debe haber divergencias económicas silenciosas ni afirmaciones de reconciliación no acreditadas. Cubrir con escenarios de cuentas no capturadas, movimientos anteriores y cierres posteriores.

3. **T2 Referencias/Deudas:** exigir impacto + fingerprint/huella de los consumidores afectados + motivo + auditoría, como SPEC27, sin reducirlo a motivo y auditoría. Bloquear cuando no sea posible justificar el impacto o preservar la integridad.

4. **T3:** validar listas blancas por campo en todos los endpoints aplicables (Movimientos, Compras, Ventas, Saldos y catálogos), distinguiendo notas/etiquetas/nombres no económicos de cambios en partida, referencia, fecha, cuenta, importes, identidad o cualquier campo usado en el cálculo. No declarar T3 general si solo está implementado en Instrumentos.

5. **Cobertura T2:** implementar y verificar guards específicos para Presupuestos, plan vivo y Revisión Comida, y revisar entidades restantes. No declarar cobertura completa por usar suites preexistentes sin pruebas específicas E4.9. Mantener los huecos explícitos hasta que estén probados.

**Siguiente trabajo:** preparar diff de enmienda SPEC27 (propuesta, sin aplicar a la norma aprobada), plan para E4.9 · DEV-06 condicionado a decisión sobre T1, pruebas focales, QA independiente y evidencia. No aprobar ningún nuevo comportamiento contrario a SPEC27 sin autorización. Permanecen pendientes UI/E2E, DT6/T-BKP real y revisión completa de cierre.

## E4.5 · C1.4

**Criterio funcional/técnico recomendado: opción A en los cuatro puntos**, para evitar pérdidas de información y dobles cómputos:

- Control por Partida y fuente: `controles[]` diferenciados, no un único control global que certifique otras Partidas.
- Estado global y `sinClasificar`: publicar universo/cobertura/conflictos/sinClasificar y propagar su efecto sobre la verificabilidad del total.
- Procedencia: estructura `AnnualProvenance` con identidad, huella y versiones, no string libre.
- Representación: tri-estado `Si / No / Desconocido` con vínculo/evidencias, no booleanos que puedan convertir lo desconocido en ingreso/gasto verificado.

Proteger `null ≠ 0`, importes negativos de regularización, solapes y `AperturaHistorica` fuera de Gastos. El adaptador E4.5→E2.4 no puede perder semántica; si hace falta ampliar AnnualSources/AnnualHistory, presentar contrato explícito. C1–C8 se mantienen **PROPUESTA, no aplicadas** hasta la aprobación del usuario de la enmienda a SPEC20 y su testplan. Los 59 AC continúan UNRUN; DT7 permanece abierto.

## Autorizaciones y retorno

Esta comunicación transmite el dictamen/recomendación de Álex; **no autoriza merges, modificaciones de SPEC aprobadas, DEV con semántica distinta de la SPEC vigente, datos reales, despliegues ni migraciones**. Presentar la propuesta de diff SPEC27 con alternativas y su matriz de impactos, el alcance del DEV-06 conforme a la norma aprobada y el diff C1–C8 con la opción A en C1.4 para decisión expresa del usuario.
