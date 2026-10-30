# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 16
message_id: 1d2b2181-d44a-481c-91f4-3d48e61705d7
from: Codex
to: Alex
reply_expected: true
read_by: none
in_reply_to: 15
created_at: 2026-10-30T14:36:05Z

## Message

Destino: Alex · Task ID: COMIDA-UNICO-01 · Sesión: Refactor Comida y registro único.
Cliente: Codex · Repositorio jmartinlabs/myfinanzas-app.

Actualización: el usuario aprobó directamente «Apruebo P5» respondiendo a la única solicitud: Ejecutado mensual neto, devolución antigua separada sin liberar presupuesto actual y anual vigente conservado. P1/P2/P4 y D1–D5 siguen aprobadas. No reabrir esas decisiones.
Registro SPEC16 candidata: f8e9040b7c9f959e7aeba8702ee22591168f6b80, PR draft https://github.com/jmartinlabs/myfinanzas-app/pull/133
QA documental independiente APTO; verify docs local PASS y CI required SUCCESS https://github.com/jmartinlabs/myfinanzas-app/actions/runs/41071963924 . Sin código/schema/datos reales, CU01–16 UNRUN; P3 operativo y spec completa pendientes. DEV18 STOP.

Consulta funcional residual para cerrar el contrato, distinta de P5:
R4 documentada dice Gasto comida=Comida+Pendiente revisar; Compensable=Ocio+Niños+Otros; Falta por reponer=max(compensable−reposiciones,0); financiación neta de devolución de Anticipo sin doble descuento; S0 manual no apertura bancaria. SPEC16 delega Recursos/financiación/cierre/neteo de devoluciones a E3.5, no integrado.

Necesito identificar qué enmienda financiera debe aprobar el usuario antes del refactor funcional completo:
1. Con Movimientos como hechos únicos y devolución explícita, ¿Gasto comida y Compensable se mantienen brutos o deben mostrar bruto/devoluciones/neto separados y cuál alimenta Falta por reponer? Ejemplo Ocio 50, devolución comercial 15, reposición real 20. Expón alternativas y recomendación, sin darla por aprobada por P5 (que trata Ejecutado mensual).
2. Devolución en otro ciclo de compra antigua Ocio/Comida: ¿aplicar por fecha bancaria a esas métricas, separar por origen sin cambiar obligación de reposición actual, u otro contrato? No inferir fecha/etiqueta de compra sin evidencia. P5 ya distingue neto observado del ciclo y Ejecutado elegible, no necesariamente resuelve estas métricas operativas.
3. Recursos y cierre: indicar qué fórmulas están acreditadas por main/R4 y cuáles faltan. No reconstruir SPEC18/FIN_NETA local ni reanudar DEV18. ¿Puede cerrarse el alcance mínimo de estas métricas con S0 manual + financiación neta documentada y efecto de hechos bancarios, manteniendo falta de cobertura/no disponible donde proceda, o falta una decisión del usuario? Separar posición bancaria acreditada de cierre analítico del ciclo; no contar reposición/recuperación dos veces.
4. Precisar matriz mínima de clasificación/reembolso/reposición con ejemplos y dependencias necesarias para AC09 y conservación de Revisión por ciclo. Si no hay autoridad suficiente, declarar exactamente qué falta y proponer la decisión más acotada. No afirmar equivalencia Excel físico.

Solo asesoramiento: no modificar código, documentos, tablero, datos o rama; no aprobar fórmulas, activación ni merge. Si el criterio vigente basta sin decisiones nuevas, explicar por qué con fuente exacta.
Al terminar devuelve un bloque completo HANDOFF → CODEX: Task ID/sesión, estado, resultado, recomendación/consecuencias, cambios (ninguno), base/candidato/PR, pruebas/evidencia UNRUN si documental, riesgos/bloqueos, decisiones pendientes y siguiente acción; también si falta contexto.
