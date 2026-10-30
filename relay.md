# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 10
message_id: c9d674c0-b431-49c2-b3e6-845d80add646
from: Alex
to: Codex
reply_expected: false
read_by: Codex
created_at: 2026-10-30T11:33:34Z

## Message

Destino: Codex · Task ID: COMIDA-UNICO-01 · Sesión: Refactor Comida y registro único.

ACLARACIÓN DEL USUARIO SOBRE P2 / IDENTIDAD DE ING COMIDA

El usuario pidió aclarar por qué se habla de preservar el ID de ING Comida si hemos decidido NO migrar las compras históricas a Movimientos. Tras explicárselo, solicita transmitir esta aclaración por Relay.

La decisión de NO migrar se mantiene:
- NO trasladar compras individuales históricas de Revisión Comida a Movimientos.
- Conservar los Gastos agregados que ya existen en Movimientos y el detalle auxiliar antiguo como histórico consultable, sin duplicar reconocimiento.
- Desde el corte acordado, registrar cada compra y devolución nueva individualmente en Movimientos; Revisión Comida será su vista especializada con metadatos.

El ID de ING Comida es el ID técnico estable del SALDO (cuenta bancaria) que ya existe; NO es un ID de compra que haya que migrar a Movimientos. Los Movimientos nuevos referenciarán ese mismo Saldo como origen/destino. Por ello la opción preferida para P2 es mantener la identidad de la cuenta existente, evitando crear una segunda ING Comida por defecto.

Para calcular su posición después del corte se requiere apertura bancaria real acreditada B, y SOLO hechos del régimen nuevo desde C: B + entradas posteriores - salidas posteriores. Los movimientos y transferencias anteriores no se suman otra vez a B; no se borran ni se migran. Esto requiere un contrato técnico de régimen fechado seguro y trazable, no editar Control/Fecha apertura de forma ordinaria ni filtrar globalmente todas las cuentas. El saldo inicial manual de Ciclos es diferente de B.

En el ejemplo sintético B=250, transferencia posterior +800, compra posterior -45: posición=1005. Ninguna compra anterior es migrada ni añadida a ese cálculo.

Por favor, reformula P2 para el usuario en lenguaje sencillo, evitando que parezca que se van a migrar movimientos o crear otra cuenta real: «ING Comida sigue siendo el mismo Saldo; solo cambia la manera de registrar y calcular sus operaciones desde el nuevo ciclo». Si técnicamente no puede preservarse con garantías, presenta una cuenta sucesora como excepción a decidir, no como solución automática.

Esta comunicación transmite la preferencia explicada al usuario y su solicitud de comunicación. NO atribuir aprobación explícita de P2 ni autorizar migración, cambio de esquema, fecha C, importe B, despliegue o merge; deben seguir los gates vigentes.

HANDOFF → CODEX
Task ID: COMIDA-UNICO-01; sesión: Refactor Comida y registro único.
Estado: COMPLETED, aclaración funcional trasladada.
Cambios: solo mensaje Relay; código, specs, tablero y datos, ninguno.
Base de referencia: main 454d21a, candidata SPEC16 42ec846a, PR draft #133 (según reporte previo; no nuevas verificaciones).
Pruebas: UNRUN, consulta documental.
Riesgos y bloqueos: doble reconocimiento legado, posición falsa por agregados/transferencias anteriores, falta de apertura acreditada, consumidores que no respeten el régimen; P2 formal y P3/P4/P5 pendientes.
Siguiente acción: actualizar presentación de P2 y contrastar su viabilidad; escalar alternativa sucesora solo con motivos técnicos demostrables. No merge ni datos reales autorizados.
Fin HANDOFF → CODEX.
