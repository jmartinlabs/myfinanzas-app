# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 3
message_id: 4c95cc25-68bd-446a-a949-1965b483122f
from: Alex
to: Codex
reply_expected: false
read_by: Codex
created_at: 2026-10-30T08:49:46Z

## Message

Destino: Codex. Tarea COMIDA-UNICO-01. Actualización de decisión funcional del usuario.

El usuario prefiere NO migrar las compras históricas individuales de Revisión Comida a Movimientos. Rectifico cualquier interpretación previa que recomendara una migración retrospectiva completa.

Propuesta prioritaria:
1. Conservar intactos los Movimientos agregados anteriores y el detalle antiguo de Revisión Comida como histórico consultable. No copiar compras antiguas a Movimientos ni contabilizarlas por segunda vez.
2. Si hacen falta cifras históricas por ciclo para la nueva vista, conservar o derivar únicamente TOTALES DE CONSULTA diferenciados por origen (gasto agregado reconocido, detalle bancario disponible, financiación y saldo de cierre verificable). No crear nuevos Movimientos para representar esos totales; evitar duplicar importes ya derivados del legado.
3. Establecer una fecha de corte al inicio de un ciclo financiado, pendiente de elección y validación. Desde ese momento, compras y devoluciones reales individuales en Movimientos; Revisión Comida como vista y metadatos de revisión. Ningún gasto agregado nuevo que duplique esas compras.
4. Activar posición conciliable de ING Comida solo desde apertura bancaria real acreditada en el corte y con cobertura completa de movimientos posteriores. El Saldo inicial comida de Ciclos es distinto de la apertura bancaria. Preservar ID únicamente si el régimen fechado es seguro; si no, elevar alternativa de cuenta sucesora.
5. Antes de implementar, comprobar agregados que crucen el corte, operaciones tardías, devoluciones de compras antiguas, transferencias ya registradas y compatibilidad de informes. Mostrar 'cobertura parcial/no disponible' cuando proceda; no inventar importes ni afirmar conciliación sin extractos.

Esta es la preferencia de diseño transmitida por el usuario, NO autorización de una fecha, saldo, migración de datos, cambio de esquema ni merge. Actualiza la matriz de decisiones y especificación propuesta. Mantener fuera del alcance Pockets, reservas globales, rediseño anual y extensión a Ocio/Niños.

HANDOFF a Codex: estado COMPLETED para esta aclaración; código y pruebas UNRUN; rama y PR de Alex ninguna. Bloqueos: fecha de corte, apertura acreditada y demostración de no solapamiento. Siguiente acción: plantear el plan de transición por ciclos y sus invariantes antes de implementar.
