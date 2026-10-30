# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 15
message_id: 67d5cc2b-d6ab-496f-8893-6030db774789
from: Alex
to: Codex
reply_expected: false
read_by: none
created_at: 2026-10-30T14:21:04Z

## Message

Destino: Codex · Task ID: COMIDA-UNICO-01 · Sesión: Refactor Comida y registro único.

CAMBIO DE DIRECCIÓN DE P5 POR INDICACIÓN EXPLÍCITA DEL USUARIO

Tras nuestra propuesta 0014 de Ejecutado bruto, el usuario ha elegido expresamente: «Ejecutado sea el gasto neto. lo veo mas real no?». Álex respondió que también recomienda Ejecutado neto porque representa el coste efectivo, y el usuario solicita trasladarlo por Relay. Esta preferencia del usuario prevalece sobre mi recomendación A del mensaje 0014. NO presentar la opción A como recomendación vigente.

Criterio principal para P5: para Presupuestos de fuente «Gasto real», proponer Ejecutado neto = Gastos elegibles − devoluciones comerciales elegibles, preservando siempre bruto y devoluciones como magnitudes separadas y auditables. Ejemplo ficticio: presupuesto 100, compra 50, devolución 15 de esa compra en el mismo ciclo: Ejecutado neto 35 y Pendiente 65; mostrar también Gasto bruto 50 y Devoluciones 15. Estado, desviación y porcentajes deben derivarse del ejecutado neto y explicar el cambio de semántica. «Aportación a saldo» NO cambia: ejecución por transferencias elegibles; la devolución comercial no es una transferencia ni ingreso ordinario.

LÍMITE MATERIAL A CONCRETAR, no deducir implícitamente:
- Álex propuso al usuario que una devolución de compra de un ciclo anterior se registre en el ciclo del cobro pero no amplíe artificialmente el presupuesto actual. Ejemplo devolución 40 de compra anterior, sin Gastos del ciclo actual: gasto neto observado de operaciones del ciclo = −40; ejecución presupuestaria del ciclo actual NO debe pasar automáticamente a −40 ni liberar 40 de presupuesto. Conservarla separada como devolución de gasto anterior. NO reescribir el ejecutado ni la compra históricos. Requiere definir con rigor qué evidencia clasifica el reembolso como del mismo ciclo; la Partida conocida, por sí sola, NO demuestra el ciclo de compra. Si no es acreditable, mantener el efecto bancario y devolución visible, pero excluir provisionalmente del neteo presupuestario por ciclo y señalar cobertura pendiente. No crear compra ficticia.
- P4 permite devolución con compra opcional y Partida opcional; la ausencia de compra vinculada puede impedir acreditar el origen temporal, pero no debe impedir registrar el dinero. No confundir Partida acreditada con origen temporal acreditado. Sin Partida o evidencia suficiente, mostrar métricas afectadas como Parcial/No disponible y reembolso por atribuir; no fingir neto completo.
- El plan anual actualmente calcula Gasto bruto por Partida y año natural; el usuario no ha aprobado todavía cambiar sus columnas ni su fórmula. Presentar coherencia mensual/anual y alternativa explícita sin alterar anual por inferencia.
- SPEC12 conserva S bruto PARCIAL y no trata devoluciones como ingresos; cualquier indicador ajustado requiere enmienda expresa. FIN_NETA/E3.5 runtime no integrado.

Por favor actualiza tu propuesta P5 en función de esta decisión del usuario y presenta de forma clara los pocos casos aún por cerrar, en especial la procedencia temporal del reembolso, la cobertura y la coherencia con Plan Anual. La frase del usuario define el criterio principal; no equivale a una autorización de implementación, fecha/saldo de corte ni merge.

HANDOFF → CODEX
Estado: COMPLETED — dirección funcional P5 comunicada; detalles pendientes.
Cambios: únicamente mensaje Relay, sin cambios de código, SPEC, tablero ni datos.
Base: main auditada 454d21a; candidata SPEC16 9a21c73b457d05338a430830de49cfe1d957c203, PR draft #133, según intercambio previo.
Pruebas: UNRUN; consulta funcional.
Riesgos/bloqueos: devoluciones antiguas, atribución temporal no acreditada, Partida NULL, disparidad anual/mensual, doble neteo; P3 operativo y especificación completa pendientes.
Siguiente acción: concretar P5 en candidata y elevar únicamente las decisiones materiales restantes al usuario; no ejecutar ni fusionar.
Fin HANDOFF → CODEX.
