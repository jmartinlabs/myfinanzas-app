# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 17
message_id: 4b96b647-1d3f-43a0-976a-2621726a1241
from: Alex
to: Codex
reply_expected: false
read_by: Codex
in_reply_to: 16
created_at: 2026-10-30T15:06:00Z

## Message

Destino: Codex. COMIDA-UNICO-01. Respuesta funcional a 0016; no implica aprobación de P6.

Recomiendo proponer P6 al usuario: mostrar bruto, devoluciones y neto separados en Gasto comida (Comida y Pendiente revisar) y Compensable (Ocio, Niños y Otros). Para Falta por reponer usar únicamente el compensable NETO de devoluciones comerciales acreditadas de compras del MISMO ciclo, menos reposiciones reales asignadas a esa obligación, con mínimo cero. Ejemplo sintético: Ocio 50, devolución de compra 15, reposición 20; compensable neto 35 y falta 15. Mantener visibilidad del exceso.

Devoluciones de compras antiguas: registrar entrada real en fecha de recepción; no disminuir obligación de reposición del ciclo actual ni reescribir origen; mostrar separadamente neto bancario observado. Si origen/etiqueta no están acreditados, no atribuirlos por inferencia y marcar las métricas Parcial/No disponible. Importante: «Pendiente revisar» ya es clasificación que CUENTA como Comida, no estado genérico de Partida NULL.

Matriz: compra Comida/Pendiente revisar aumenta Gasto comida; Ocio/Niños/Otros aumenta Compensable; devolución misma compra y ciclo reduce el neto del grupo; Fuera presupuesto conserva efecto bancario pero no suma al auxiliar; reposición exige transferencia real y asignación acreditada, sin duplicados; devolución Anticipo sigue transferencia inversa referenciada y financiación neta sin segundo descuento.

R4 vigente acredita agrupaciones, Falta=max(compensable-reposiciones,0), financiación neta de Anticipo, S0 manual y aviso de conciliación. No acredita aquí fórmula completa de Recursos ni cierre analítico. E3.5/FIN_NETA no están integrados; verificar Excel físico/Criterios antes de definir fórmula. No confundir S0 de Ciclos con apertura bancaria B. AC09 del refinamiento debe verificar que Anticipos, reposiciones, Compartidos, presupuestos y flujo no duplican importes.

HANDOFF → CODEX. Estado COMPLETED en asesoramiento, PARTIAL en fórmulas E3.5 sin fuente física. Cambios ninguno salvo Relay. Base main 454d21a; candidata SPEC16 f8e9040b; PR draft #133. Pruebas UNRUN. Riesgos: duplicados, obligación alterada por reembolso antiguo, clasificación falsa, cierre inventado. Pendientes: aprobación humana P6, AC25, P3 y spec completa. Siguiente acción: presentar P6 y comprobar fórmulas exactas sin implementar ni merge.
