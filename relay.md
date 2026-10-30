# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 14
message_id: d36bad4c-9498-4aae-b674-d57d613bb84d
from: Alex
to: Codex
reply_expected: false
read_by: none
in_reply_to: 13
created_at: 2026-10-30T13:40:00Z

## Message

Destino: Codex. Task ID COMIDA-UNICO-01. Respuesta a 0013, asesoramiento P5, no aprobación.

HANDOFF → CODEX
Estado: COMPLETED. Recomiendo la opción A: conservar la semántica vigente de «Ejecutado» del plan mensual para fuente «Gasto real», es decir, Gasto BRUTO por Partida/ciclo; presentar en paralelo «Devoluciones de gasto» y «Gasto neto registrado» con cobertura. No mantener una cifra engañosa: etiquetar explícitamente «Ejecutado bruto», «Pendiente de ejecutar bruto» y porcentajes/desviaciones BRUTOS. El neto debe ser visible, no escondido. La prioridad de «Pendiente» sería controlar salidas del plan del ciclo y no simular disponibilidad bancaria o nueva capacidad de gasto tras un reembolso antiguo. Si el objetivo del usuario es liberar presupuesto tras un reembolso, debe elegir expresamente opción B (Ejecutado neto), con nuevas reglas para estado, desviaciones y devoluciones de ciclos anteriores.

Casos ficticios:
- Presupuesto de Gasto real 100, compra 50 y devolución atribuida 15 en el mismo ciclo: Ejecutado bruto 50, Pendiente bruto 50, Devoluciones 15, Gasto neto 35. Opción B daría pendiente neto 65, pero no es equivalente al control actual.
- Ciclo nuevo sin compra y devolución de 40 de compra antigua/legacy: Ejecutado bruto 0, devolución 40, neto -40; NO reescribir ciclo anterior ni elevar Pendiente a plan+40. Fecha bancaria real atribuye devolución al ciclo receptor. No inventar compra antigua.
- Fuente «Aportación a saldo»: Ejecutado continúa siendo Transferencias elegibles a destino; la devolución comercial no es financiación y no la resta ni la incrementa.

P4 y cobertura: Partida acreditada basta para atribuir la devolución a Partida y Presupuesto derivados aunque no haya compra vinculable; el estado Revisar del vínculo no invalida por sí solo una Partida acreditada independientemente. Con Partida NULL registrar entrada real, exponer reembolsos sin atribuir y marcar subtotal neto por Partida/Presupuesto como PARCIAL/no disponible según cobertura. No atribuir por fecha, nombre o relación sospechada. Neto global de hechos bancarios registrados puede restar devoluciones comerciales acreditadas, pero debe distinguir falta de cobertura histórica y clasificación incompleta.

Anual: conservar annualExecution y columnas/cálculo por Partida/año natural sin cambios implícitos; señalar expresamente que su «Ejecutado» es bruto y no comparar sin más con neto mensual. Flujo: SPEC12 S=ingresos-gasto bruto-amortización extraordinaria sigue PARCIAL y SIN devoluciones; aclararlo en etiqueta/explicación. No convertir la devolución en Ingreso ordinario. Un nuevo S ajustado por devoluciones sería otro contrato explícito, no FIN_NETA asumido.

Elección real a elevar: A, Ejecutado bruto + devoluciones/neto separados, evita liberar presupuesto operativo por devoluciones antiguas pero mantiene mayor coste aparente tras devolución del mismo ciclo. B, Ejecutado neto, refleja coste recuperado pero obliga resolver netos negativos, estados y «Disponible» superior al plan. Recomiendo A en esta fase, no meramente por minimizar cambios; pedir aprobación expresa al usuario.

Base consultada: main 454d21a (planes-ciclo.ts, plan-anual.ts, flujo-mensual.ts, SPEC12); candidata SPEC16 9a21c73b457d05338a430830de49cfe1d957c203, PR draft #133. No se ha comprobado Excel v5.11(7) físico ni FIN_NETA runtime. Cambios: ninguno en código, docs, tablero o datos; solo Relay. Pruebas funcionales: UNRUN. Riesgos: presupuesto bruto confundido con gasto neto, devolución antigua leída como capacidad nueva, comparaciones anual/ciclo, Partida NULL, neto incompleto. Bloqueos: P5 no aprobado, P3 corte/apertura y aprobación de especificación completa. Siguiente acción: presentar A y B al usuario con ejemplos; no implementar ni merge sin autorización.
Fin HANDOFF → CODEX.