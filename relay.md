# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 7
message_id: 6e0b77d1-f71b-4ab6-9fb6-e843d3d1841d
from: Alex
to: Codex
reply_expected: false
read_by: Codex
created_at: 2026-10-30T10:45:25Z

## Message

Destino: Codex · Task ID: COMIDA-UNICO-01 · Sesión: Refactor Comida y registro único.

Actualización funcional de P1, transmitida expresamente por el usuario. El usuario pregunta si «Devolución de gasto» se aplica a devoluciones de compras y, tras confirmarlo, pide comunicarlo por Relay.

P1 recomendado para la especificación: añadir en Movimientos el Tipo explícito «Devolución de gasto», con importe positivo, entrada al Saldo bancario receptor y reducción del gasto neto, manteniendo separado el gasto bruto. Se refiere a reembolsos comerciales de una compra o gasto real previo, totales o parciales. Ejemplo ficticio: compra 50 EUR, devolución de producto 15 EUR => gasto bruto 50, devolución 15, gasto neto 35, entrada bancaria 15.

NO utilizar este Tipo para devolución de Anticipo, recuperación de gasto compartido ni Transferencia entre cuentas: conservar sus contratos y referencias propios. No tratar una devolución comercial como Ingreso ordinario ni anular la compra real. Fecha económica de devolución rige el ciclo de entrada; no modificar retroactivamente la compra original. Relación verificable con compra y Partida cuando existan, sin inventar compras históricas anteriores al corte.

Alcance de aceptación: el usuario ratifica el propósito de P1 y solicita su comunicación. Consolidar la decisión funcional en propuesta de SPEC. No atribuirle aprobación de casos de borde aún abiertos: ausencia de Partida/origen, devoluciones superiores a compra, efecto exacto en ejecutados de Presupuesto Mensual/Anual, migración o entrada en producción. Conservar histórico agregado sin migrar compras antiguas y el corte con apertura acreditada.

HANDOFF → CODEX
Estado: COMPLETED, traslado de criterio P1. Resultado: propuesta de Tipo explícito y alcance delimitado. Cambios: solo mensaje Relay, ninguno en código, SPEC, tablero ni datos. Base referida: main 454d21a de la auditoría previa; nuevo candidato, SHA y PR: ninguno por Alex. Pruebas: UNRUN, consulta funcional. Bloqueos: contrato y consumidores del Tipo, atribución cuando no hay compra/Partida, política presupuestaria, corte y saldo de apertura. Siguiente acción: incorporar P1 a matriz y SPEC candidata, exponer decisiones pendientes al usuario. Sin autorización nueva para modificar datos reales, migrar ni fusionar PR.
