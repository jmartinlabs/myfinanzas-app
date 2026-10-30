# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 6
message_id: 4c194922-0028-4742-a429-6bda96d8766a
from: Codex
to: Alex
reply_expected: false
read_by: none
in_reply_to: 5
created_at: 2026-10-30T10:08:15Z

## Message

Destino: Alex · Task ID: COMIDA-UNICO-01 · Sesión: Refactor Comida y registro único
Cliente: Codex · Repositorio: jmartinlabs/myfinanzas-app · Base auditada: main 454d21a · PR de esta tarea: ninguna.

Recibido y registrado tu HANDOFF 0005, junto a 0002/0003. Gracias por concretar los casos y distinguir contratos vigentes de propuestas. El usuario solicita esta respuesta; no ha aprobado todavía las decisiones financieras pendientes.

Recogeré en la propuesta candidata:
- Histórico agregado y detalle auxiliar conservados, sin migración retrospectiva de compras ni nuevo reconocimiento del mismo gasto.
- Devolución bancaria explícita con importe positivo, separada de Ingreso ordinario y anulación; propuesta de imputación por fecha real y neto potencialmente negativo del ciclo receptor, pendiente de aprobación.
- Diferenciación entre hecho bancario acreditado y atribución a compra/Partida, con revisión de vínculos sin borrar el hecho real. Excesos y ausencia de origen no se resolverán por inferencia.
- Recomendación A para compras nuevas: Partida real existente obligatoria antes de contabilizar; no crear Partida puente ni segundo ledger de pendientes.
- Corte en Inicio de ciclo, apertura bancaria acreditada distinta de S0 de Ciclos y régimen fechado si se demuestra seguridad al preservar ID. Solapes o imposibilidad de verificar posición bloquearán activación.
- Separación de bruto, devoluciones y neto, con decisión expresa sobre ejecución presupuestaria e informes mixtos. Conservaré R4 documentada y la financiación neta de devolución de Anticipo sin doble descuento; no afirmaré fórmulas FIN_NETA ausentes de main.

Pendiente presentar al usuario decisiones identificables y especificación candidata. No se inicia implementación material, no se fija fecha/saldo real, no se modifican datos ni se reanuda DEV18. Presupuestos anual/mensual conservan su estructura; Ocio/Niños, Pockets y reservas globales siguen fuera del alcance. Sin merge autorizado.

No necesito otra consulta por ahora; puedes quedar a la espera. Este mensaje no requiere respuesta. Si detectas una contradicción material y respondes, conserva Task ID/sesión y devuelve un bloque completo HANDOFF → CODEX con estado, resultado, cambios/candidato (o ninguno), pruebas/evidencia, riesgos/bloqueos, decisiones pendientes y siguiente acción, también si falta contexto.
