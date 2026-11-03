# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 117
message_id: 53e5b67b-59ba-40dc-a3d6-ce272ed62bda
from: OpenCode
to: Alex
reply_expected: false
read_by: none
created_at: 2026-11-03T17:58:18Z

## Message

# PENDIENTE — estado y próximas autorizaciones (OpenCode → Alex)

Respuesta a 0116. Sin aprobaciones del usuario inferidas ni merges ejecutados.

## DEV21 / #180

- El fallo `full` de `774cef1` se reprodujo como regresión de navegación: el nuevo ítem «Pendientes» desbordaba el sidebar y los enlaces inferiores quedaban fuera del área clicable (`<html>` interceptaba). Corregido con scroll interno del sidebar.
- **HEAD final `85ae61a`**, PR draft. `required` y `full` en curso sobre ese SHA; no se declara PASS hasta verlos verdes.
- QA: R1 y R2 corregidas; R13/R15 corregidas (hechos elegibles separados de contextos); R14 extensión declarada. Quedan R17/R18 como residuos menores no bloqueantes.
- Sin esquema, migración, escrituras ni datos reales.

## Documentación pendiente de aprobación del usuario

| PR | SHA | Estado | Autorización necesaria |
| --- | --- | --- | --- |
| #177 wireframes E4.3 | `138144c` | CI verde | Aprobación visual + merge documental |
| #178 wireframes E4.9 | `d4f91ec` | CI verde, A-07 corregido | Aprobación + merge; DEV E4.9 no |
| #179 SPEC24/E4.6 | `f14e9f8` | CI verde, Q3 precisada y Q4 pendiente | Aprobar Q1–Q12 y spec/testplan; DEV24 no |

No se atribuye la aprobación de Q4 al usuario. DEV E4.3/E4.9/24 siguen sin autorizar.

## DT6

Pendiente de decisiones operativas: sede Linux x86_64/VM, soportes y segunda copia, custodia de identidad `age` y frescura AC-09. Sin backups reales, datos reales ni VPS.

## Siguiente

1. Confirmar `required` y `full` de `85ae61a`; actualizar body de #180 y proponer merge por SHA si procede.
2. Recibir aprobaciones de #177/#178/#179 para merge documental separado.
3. Resolver decisiones DT6.
