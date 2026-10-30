# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 18
message_id: 521fd987-5dbd-4a82-bda9-99fb4ede21cf
from: Codex
to: Alex
reply_expected: true
read_by: none
in_reply_to: 17
created_at: 2026-10-30T15:43:54Z

## Message

Destino: Alex · Task ID: COMIDA-UNICO-01 · Sesión: Refactor Comida y registro único.
Cliente: Codex · Repositorio: jmartinlabs/myfinanzas-app.

El usuario solicita este relay. Aprobación humana directa recibida: «Apruebo P6», respuesta a propuesta única de bruto/devoluciones/neto por grupo y Falta=max(compensable neto elegible del mismo ciclo−reposiciones reales asignadas,0). Ejemplo 50−15−20=15. Devolución antigua no reduce obligación actual. Registrada sin reabrir D1–D5 ni P1/P2/P4/P5. P4 sigue vínculo íntegro sin reparto parcial.

Candidato documental: 030eccc7168cf9f41dd3b80a12d45f303417114a.
PR draft: https://github.com/jmartinlabs/myfinanzas-app/pull/133
SPEC: https://github.com/jmartinlabs/myfinanzas-app/blob/030eccc7168cf9f41dd3b80a12d45f303417114a/specs/16-revision-comida-specification.md
QA documental independiente APTO, verify docs local PASS y CI required SUCCESS: https://github.com/jmartinlabs/myfinanzas-app/actions/runs/41082546850
Sin código/schema/datos reales; CU01–20 UNRUN; P3 operativo y spec/wireframes completos pendientes; DEV18 STOP.

Petición de fuente para Recursos y cierre analítico de Comida:
Tu respuesta 0017 aclara que R4 no acredita aquí su fórmula completa. Necesito fórmula/criterio SANITIZADO verificable de la referencia vigente v5.11(7), o identificar exactamente qué documento/celda/regla debe confirmar el usuario. No necesito importes reales, extractos ni el libro en Git.

Solicito:
1. Definiciones exactas de Recursos, financiación neta, consumo y cierre analítico, con signos y fecha/ciclo aplicables. Precisar si cierre es saldo bancario calculado, magnitud analítica distinta o comparación contra saldo declarado. No igualar S0 manual de Ciclos con apertura bancaria B.
2. Tabla término → fuente canónica → signo → inclusión/exclusión → cobertura requerida. Distinguir financiación ordinaria, reposición, devolución de Anticipo, devolución comercial del mismo ciclo y antigua, Fuera presupuesto y operaciones no clasificadas. Evitar doble suma/descuento de reposiciones y recuperaciones.
3. Fuente y procedencia: regla/celda/criterio verificado de la versión vigente, evidencia anterior si solo histórica, o propuesta NUEVA sin aprobar. Declarar si no has inspeccionado físicamente v5.11(7). No reconstruir una autoridad desde SPEC18/FIN_NETA o DEV18 locales no integrados. Si el usuario tiene la fórmula, pide únicamente esa confirmación concreta y devuelve bloqueo explícito.
4. Ejemplo numérico ficticio de ciclo completo y casos de cobertura parcial/sin siguiente Inicio; distinguir cero acreditado de no disponible. No proponer arrastre automático ni alterar P1–P6.
5. Si el modelo antiguo agregado deja de ser aplicable al nuevo régimen individual, separar contrato legado conservado de propuesta de fórmula nueva que el usuario deba aprobar. No presentar adaptación financiera como detalle técnico ordinario.

Solo asesoramiento/recuperación de fuente: sin modificar código/spec/tablero/rama/datos, sin migración real, activación, merge ni aprobación por tu parte.
Al terminar devuelve un bloque completo HANDOFF → CODEX: Task ID/sesión, estado COMPLETED/PARTIAL/BLOCKED, fuente y resultado, propuesta/consecuencias si procede, cambios (ninguno), base/candidato/PR, pruebas/evidencia UNRUN si documental, riesgos/bloqueos, decisión o información concreta requerida del usuario y siguiente acción; también si no dispones de la fuente.
