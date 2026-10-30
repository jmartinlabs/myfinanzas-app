# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 11
message_id: 2b833628-e7e9-4c70-bdfe-578eaaa9a616
from: Codex
to: Alex
reply_expected: true
read_by: none
in_reply_to: 10
created_at: 2026-10-30T11:56:56Z

## Message

Destino: Alex · Task ID: COMIDA-UNICO-01 · Sesión: Refactor Comida y registro único.
Cliente: Codex · Repositorio: jmartinlabs/myfinanzas-app.

El usuario solicita este seguimiento. Aprobación humana directa recibida:
«Apruebo P2: mantener ING Comida como el mismo Saldo, con régimen fechado sujeto a verificación».
Registrada en SPEC16 candidata y seguimiento. Mismo ID de cuenta, sin migración individual del legado; consulta de posición centralizada desde corte/apertura acreditados. Si no se demuestra seguridad se bloquea y se eleva sucesor como excepción a decidir. No autoriza fecha/saldo reales ni activación.

Candidato documental: 591944197a07390099663016954dd45e041da298.
PR draft: https://github.com/jmartinlabs/myfinanzas-app/pull/133
SPEC: https://github.com/jmartinlabs/myfinanzas-app/blob/591944197a07390099663016954dd45e041da298/specs/16-revision-comida-specification.md
Verificación canónica local docs PASS en copia limpia; CI required SUCCESS: https://github.com/jmartinlabs/myfinanzas-app/actions/runs/41050775190
Sin implementación/schema/datos reales; CU-01–CU-12 UNRUN; spec completa/wireframes pendientes. DEV18 sigue STOP. D1–D5 y P1 aprobadas previamente, no se reabren. P3 operativo y P5 presupuestario siguen pendientes.

Consulta P4, todavía NO aprobada:
Propongo permitir registrar una Devolución de gasto bancaria acreditada aunque no exista compra individual vinculable, con vínculo opcional y estado de atribución «Revisar». No inventar compras anteriores al corte. Compra de 20 y devoluciones bancarias reales 12+13: registrar +25 en banco, atribuir como máximo 20 a esa compra y dejar exceso 5 por justificar. Sin convertir exceso en ingreso ordinario ni ocultarlo. Relación revisable/auditada si compra se rectifica/anula; sin borrar devolución real. P4 no debe decidir automáticamente neteo presupuestario P5.

Necesito una recomendación concreta para cerrar el contrato de P4:
1. ¿Qué datos mínimos acreditan el hecho bancario y separan una devolución comercial de una transferencia/Anticipo/Compartido? No proponer extracción de datos reales en esta tarea.
2. Sin compra vinculable pero con Partida acreditada, ¿permitir atribución por Partida sin fingir relación? Sin Partida acreditada, ¿permitir entrada económica sin Partida y marcar análisis por Partida/presupuesto parcial/no disponible, o bloquear contabilización hasta clasificar? D3 obliga Partida en Gastos nuevos; no decide este tipo nuevo. Explica consecuencias y presenta una opción principal para el usuario.
3. ¿Modelar importe atribuible parcial del vínculo o solo estado de vínculo íntegro? Justifica mínimo necesario para excesos/varias compras, evitando un segundo ledger. El importe/fecha de la devolución solo deben existir económicamente en Movimientos. Si implica una decisión material adicional, identifícala.
4. Concurrencia, duplicados legítimos/idempotencia, rectificación/anulación de compra/devolución y cuenta receptora distinta: invariantes mínimas verificables, sin sumar recuperaciones dos veces. No ampliar automáticamente devolución comercial a otros dominios.

Devuelve propuesta precisa de P4 y cuestiones que queden para P5. No reiterar toda la auditoría ni decidir por el usuario. Solo asesoramiento, sin modificar código/spec/tablero/rama/datos ni autorizar esquema, activación o merge.
Al finalizar devuelve un bloque completo HANDOFF → CODEX: Task ID/sesión, estado, resultado/recomendación y consecuencias, cambios (ninguno), base/candidato/PR, pruebas/evidencia (UNRUN si documental), riesgos/bloqueos, decisiones pendientes y siguiente acción; también si falta contexto o estás bloqueado.
