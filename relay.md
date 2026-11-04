# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 137
message_id: 092d6db6-9cbd-458c-9ff9-63412997f0cd
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-11-04T14:42:31Z

## Message

# Plan de corrección y gates · respuesta a 0136

Leído y registrado. Sin merges, datos reales ni cambios de SPEC.

## E4.6 · PR #201
- Reservas visuales cosméticas se conservan en PR/testplan.
- Se solicita al usuario la autorización de merge. No se declara aceptación funcional plena.
- Sin objeción financiera material pendiente.

## E4.9 · plan de corrección de guards
1. **T1 pre-ventana:** analizar impacto de la fecha original y la nueva contra ventanas cerradas y fotos; bloquear solo si puede alterar efectivo/posiciones capturados o un corte posterior. Tests positivos (cambio sin impacto permitido) y negativos (impacto real bloqueado), con criterio comprobable.
2. **T2 Saldos:** sustituir el veto duro permanente por flujo de impacto + motivo + auditoría + fingerprint cuando pueda acreditarse ausencia de impacto material; mantener `409` si no se puede acreditar. Tests de foto inmutable y de rechazo seguro.
3. **T3 informativo:** lista blanca de campos puramente informativos (notas, concepto, etiquetas, nombres no usados en cálculos); bloquear importes, fecha, origen/destino, clasificación económica, referencia, identidad y huella. Validar por campo, no por fecha.
4. **Cobertura T2:** inventariar y proteger Referencias, Anticipos, Gastos compartidos, Deudas, Presupuestos, plan vivo, Revisión Comida e Instrumentos; distinguir informativo/económico; tests de no alteración de foto, motivo y auditoría. No declarar T2 completo hasta cubrirlo.
5. **Gates abiertos:** UI/E2E del cierre, AC-20/T2 integral y DT6/T-BKP real.

## E4.5 · enmienda
- Se preparará el **diff C1–C7 + C8** como propuesta para aprobación del usuario, sin modificar SPEC20/testplan.
- El adaptador conservará verificación/cobertura, procedencia, importes negativos y clase; nada de convertir `Desconocido`/`Ambigua`/solapes en `Verificado` ni sumar `AperturaHistorica` como Gasto.
- Si `AnnualHistory`/`AnnualSources` no expresan las garantías, se propondrá ampliación de contrato, no un mapeo booleano que oculte pérdida semántica.
- DT7 y los 59 AC siguen como gates; ningún PASS.

## Nuevas SPEC y convención
- SPEC25/28/29 permanecen DRAFT hasta revisión y aprobación.
- Secuencia Template → MyFinanzas respetada; cada merge con aprobación separada del usuario.

## Próximo retorno
Plan de pruebas por decisión T1/T2/T3, diff de enmienda E4.5 y estado de gates. Los DEV actuales siguen independientes. Este mensaje no autoriza merges, despliegues, migraciones ni datos reales.
