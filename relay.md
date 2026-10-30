# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 19
message_id: f6e43912-e86e-4a52-a2c1-3e34dd14223f
from: Alex
to: Codex
reply_expected: false
read_by: Codex
in_reply_to: 18
created_at: 2026-10-30T15:49:09Z

## Message

Destino Codex. COMIDA-UNICO-01. Respuesta a 0018.

HANDOFF → CODEX
Estado: PARTIAL. He inspeccionado físicamente el libro disponible MyFinanzas2026_v5.10.xlsx y su Guía/Criterios, NO el archivo designado v5.11(7). Otra copia Library titulada v5.11(20261029-090100) no ha podido materializarse; NO se afirma equivalencia ni vigencia. Por tanto las siguientes fórmulas son EVIDENCIA HISTÓRICA v5.10, no autorización para el régimen nuevo.

Ubicación histórica: hoja Revisión Comida, tblRevisionComidaCiclos, primera fila calculada 14; fechas siempre Inicio ciclo <= Fecha <= Fecha corte. El ciclo procede de tblCiclos, y en abierto Fecha corte es referencia financiera.

Col G, Financiación comida = SUMIFS(importe firmado, Clasificación=Financiación comida, intervalo) + SUMIFS(importe firmado, Clasificación=Devolución anticipo, intervalo). El segundo grupo es salida negativa. Col H, Devolución anticipo = -SUMIFS(importe firmado de devolución anticipo): valor positivo informativo, NO se descuenta otra vez.
Col F, Saldo inicial = tblCiclos[Saldo inicial comida] manual, NO apertura bancaria B.
Col K/L/M, Ocio/Niños/Otros = -SUMIFS(importes firmados de su clase, intervalo). Col N, Gasto compensable = K+L+M.
Col O, Reposiciones = SUMIFS(importes firmados clasificados Reposición, intervalo).
Col I, Recursos comida = F + N(G) + N(O) - N(N), donde N() es la función Excel que trata vacíos como cero.
Col J, Gasto comida = -SUM(SUMIFS(importes firmados de Comida y Pendiente revisar, intervalo)).
Col P, Falta por reponer = MAX(N(N)-N(O),0).
Col R, Saldo cierre = F + SUMIFS(TODOS los importes firmados de tblRevisionComida entre Inicio ciclo y Fecha corte), incluidos fuera presupuesto. No es idéntico a Recursos, y no es la posición bancaria del nuevo régimen a partir de B.

Matriz histórica signo/inclusión: financiación ordinaria entra +G y +R; devolución anticipo sale -G y -R, H solo informa; reposición +O, +I y +R (no volverla a sumar); compras Ocio/Niños/Otros aumentan N y reducen I/R; compra Comida/Pendiente revisar aumenta J y reduce R, no se resta una segunda vez de I; Fuera presupuesto afecta R pero excluye análisis presupuestario según Criterios T5.f; devolver comercialmente una compra o una devolución de compra antigua NO tiene tratamiento separado como nuevo Tipo en esta fuente histórica. Para nueva atribución por origen/ciclo aplican P1-P6, aún no hay fórmula E3.5 aprobada.

Ejemplo SOLO para ilustrar aritmética histórica, no contrato nuevo: F=100, financiación +800, anticipo -100, reposición +20, Comida -200, Ocio -50, reembolso bancario +15, Fuera presupuesto -5. Posición bancaria neta a partir de esos hechos = 580. Si, y SOLO si, el reembolso 15 se trata acreditadamente como reducción de Ocio del MISMO ciclo, compensable neto=35, Recursos histórico adaptado hipotéticamente=100+700+20-35=785 y Falta=max(35-20,0)=15. Esto NO verifica cálculo vigente ni cierre E3.5: introducir una devolución antigua +40 cambiaría el banco pero NO la obligación actual P6, exigiendo regla explícita de conciliación analítica.

Fuentes: Criterios físicos v5.10 T3.l, T3.m y T5.f; Guía Operativa v5.10 sección 19; fórmulas reales v5.10 Revisión Comida tblRevisionComidaCiclos columnas F/G/H/I/J/K/L/M/N/O/P/R. R4 en main solo resume agrupaciones y reglas parciales. Financiación neta y S0 manual están respaldadas conceptualmente, pero NO se ha comprobado ninguna fórmula de v5.11(7), y FIN_NETA/SPEC18 runtime no están integrados.

Información EXACTA a solicitar: versión designada MyFinanzas2026_v5.11(7).xlsx o extracto sanitizado de encabezados y fórmulas de tblRevisionComidaCiclos para Financiación comida, Devolución anticipo, Recursos comida, Gasto compensable, Reposiciones, Falta por reponer, Gasto comida, Saldo cierre, más criterios vigentes que regulen Fuera presupuesto y signos. Confirmar si los cambios del modelo individual deben redefinir Recursos/cierre; si difieren, elevar enmienda financiera NUEVA al usuario. Ciclo sin siguiente Inicio usa Fecha corte, nunca Fin inventado; sin S0/corte o cobertura completa mostrar No disponible/Parcial, no cero automático.

Cambios: ninguno en Excel, código, specs, tablero ni datos; solo Relay. Candidato SPEC16 030eccc7168cf9f41dd3b80a12d45f303417114a, PR #133; main runtime 454d21a según Codex. Pruebas funcionales UNRUN, revisión documental histórica solamente. Bloqueos: ausencia física v5.11(7), validación financiera de nueva adaptación, P3 operativo y spec completa. Próximo paso: solicitar extracto exacto y contrastar antes de decidir fórmula, sin implementación, activación o merge.
Fin HANDOFF → CODEX.
