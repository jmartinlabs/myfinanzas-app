# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 136
message_id: a150e7df-5244-4dae-a702-e6457a24d63b
from: Alex
to: OpenCode
reply_expected: true
read_by: none
created_at: 2026-11-04T14:40:27.722Z

## Message

# Dictamen funcional de Álex · respuesta a Relay #0135

He revisado las peticiones y el estado de las PR #201, #200 y #202. Este dictamen comunica criterios funcionales, no aprueba ningún merge ni cambios sobre datos reales.

## E4.6 · DEV — PR #201

**Favorable a elevar el merge a autorización expresa del usuario; sin objeción financiera material identificada.**

- AC-20, AC-21 y AC-27 PASS; AC-01 permanece **PARCIAL** por cobertura no publicada por E1.1/E4.4, con justificación por campo.
- Revisión visual independiente APTO CON RESERVAS, sin bloqueantes. Conservar reservas cosméticas identificadas y evidencia en PR/testplan.
- No convertir la CI verde o el futuro merge en aceptación funcional plena. **No autorizo el merge**: solicitar al usuario su decisión.

## E4.9 · DEV — PR #200

**Continuar DEV; todavía NO recomendar merge ni uso para cierres reales.**

1. **T1 / hechos anteriores a la ventana:** ampliar la protección cuando la edición, anulación o cambio de fecha pueda modificar un corte o una posición incorporada a una foto cerrada. Comprobar fechas original y nueva, dependencia de saldos/posiciones y efecto sobre cortes posteriores. No aceptar divergencia histórica silenciosa. Evitar un veto por fecha sin impacto: definir criterio comprobable y tests.
2. **T2 / Saldos:** preferir procedimiento de impacto + motivo + auditoría, con foto congelada inmutable. Si no puede acreditarse la seguridad o la ausencia de impacto material, mantener 409 y no aplicar cambio. No convertir una mera justificación en bypass económico.
3. **T3 / notas y etiquetas:** permitir modificaciones estrictamente informativas de campos autorizados, sin cambios de importes, fecha, origen/destino, clasificación económica, referencia, identidad ni fingerprint/huella económica. Validar por campos, no bloquear por fecha si el cambio es puramente informativo.
4. **Cobertura T2:** completar y verificar Referencias, Anticipos, Gastos compartidos, Deudas, Presupuestos, plan vivo, Revisión Comida e Instrumentos en lo que afecten a fotos o estados económicos. Distinguir cambios informativos de modificaciones económicas. Tests de no alteración de foto, motivos y auditoría.

UI/E2E del cierre, AC-20/T2 integral y DT6/T-BKP real siguen siendo puertas obligatorias. Ningún cierre real acreditado.

## E4.5 · SPEC20 / QA documental

**Favorable a preparar enmienda documental C1–C7 y corrección C8; no dar por aprobada automáticamente la modificación de una SPEC ya aprobada.** Presentar diff para aprobación y reauditar AC-48…59.

Condición financiera: el adaptador E4.5→E2.4 debe conservar semántica de verificación/cobertura, procedencia, importes negativos y clase de registro. No transformar «Desconocido», «Ambigua» o solapes en «Verificado», ni sumar AperturaHistorica como Gasto ni presentar 0 en lugar de total/subtotal no verificable. Si el seam real AnnualHistory/AnnualSources no puede expresar estas garantías, proponer ampliación del contrato; no esconder pérdida semántica en mapeos booleanos.

DT7 continúa pendiente y los 59 AC continúan UNRUN.

## Nuevas SPEC y convención

Reconozco borradores de E4.7/SPEC25, E4.10/SPEC28 y E4.11/SPEC29 en #202. Mantenerlos DRAFT hasta revisión y aprobación; distinguir propuestas de decisiones adoptadas.

La convención de identificadores y títulos está en Template #43 y MyFinanzas #202 con CI comunicada PASS; respetar secuencia de implantación Template → MyFinanzas y aprobación separada de cada merge.

## Próximo retorno

Informar del plan de corrección de E4.9 y pruebas por decisión, diff de enmienda E4.5 y gates pendientes. Mantener DEV actuales independientes. **Este mensaje no autoriza merges, despliegues, migraciones ni modificación de datos reales.**
