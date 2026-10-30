# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 2
message_id: 9b6ff190-a6cb-4468-81b3-c6c60051eabb
from: Alex
to: Codex
reply_expected: false
read_by: Codex
in_reply_to: 1
created_at: 2026-10-30T08:22:00Z

## Message

HANDOFF A CODEX. COMIDA-UNICO-01. Estado COMPLETED, asesoramiento; sin cambios de codigo ni nueva autorizacion.

Recomiendo conservar Saldos, Movimientos, Partidas, Presupuestos mensual y anual y Ciclos. Cada compra real debe registrarse una vez en Movimientos; Revision Comida debe leer esos hechos y guardar solo clasificacion analitica, estado y evidencias. Las transferencias de financiacion no son gastos.

Devoluciones: recomiendo operacion explicita de devolucion de gasto con importe positivo, entrada bancaria y reduccion separada del gasto neto. No es ingreso ordinario ni anulacion. Vinculo acreditado opcional con compra, limites a devoluciones parciales vinculadas, y sin inferir compra historica inexistente. Fecha de devolucion determina su ciclo efectivo; el ciclo de compra permanece intacto. Deben aprobarse tipo/subtipo y tratamiento de casos sin origen.

Transicion: corte al inicio de un ciclo elegido tras verificar cobertura. Antes, conservar agregados y auxiliares sin volver a reconocer gastos. Despues, cada compra individual sustituye al agregado. Investigar solapes, altas tardias y rectificaciones; no convertir retrospectivamente por defecto.

ING Comida: no basta cambiar Terminal a Movimientos, pues el motor suma hechos antiguos. Comparar ID conservado con regimen fechado y apertura bancaria acreditada, frente a Saldo sucesor trazable. Preferir el primero solo si la posicion es verificable. Apertura bancaria no equivale al Saldo inicial comida de Ciclos. Sin cobertura completa, mostrar posicion parcial/no disponible.

Clasificacion: Partida economica distinta de etiquetas de revision; Fuera presupuesto nunca borra efecto bancario. Reposiciones se derivan de Transferencias reales.

E3.5: revisar gasto bruto, devoluciones, neto, financiacion, anticipos, planes y flujo por ciclo; no descontar recuperaciones dos veces. No reanudar DEV18 ni modificar Presupuesto Anual. Revisar SPEC04, SPEC07, SPEC12, SPEC13, SPEC16; Movimientos, Saldos, Revision Comida, planes-ciclo, flujo-mensual y consumidores historicos.

Ejemplo sintetico: apertura 100 + transferencia 800 - compra 45 + devolucion 10 = posicion 865; gasto bruto 45, neto 35. Agregado antiguo 300 + detalles antiguos 300 = gasto reconocido 300, no 600.

Riesgos/bloqueos: solape historico, posicion falsa, devoluciones sin compra y cobertura incompleta. Elevar al usuario las decisiones sobre devoluciones, corte, apertura, preservacion de ID y evidencias antes de implementar. Pruebas UNRUN. Rama/PR de Alex: ninguna. Proximo paso: matriz de decisiones y propuesta de especificacion; sin merge automatico.
