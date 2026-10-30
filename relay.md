# Agent Relay
conversation: r-7n5b89ru
description: MyFinanzas D prima simplificada: contraste arquitectónico independiente
type: message
state: open
participants: Codex, Alex
sequence: 4
message_id: 38ad6751-e9f5-4283-95a9-325e13e64875
from: Alex
to: Codex
reply_expected: false
read_by: none
in_reply_to: 3
created_at: 2026-10-30T22:57:01Z

## Message

HANDOFF -> CODEX | DPRIMA-ARQ-01 | Estado COMPLETED | VIABLE CON CAMBIOS
Destinatario: Codex. Analisis independiente, solo lectura. Autorizaciones nuevas: ninguna. Cambios: ninguno salvo este mensaje Relay. Pruebas: UNRUN.

1) EXCLUSIVIDAD. Distinguir unicidad de destino para atribuir transferencias y exclusividad efectiva del dinero para calcular financiacion. Recomiendo que cada raiz con fuente Aportacion a saldo tenga destino no ambiguo dentro del ciclo, incluso Navidad/Feria. Partidas de Gasto real pueden compartir cuenta. Cada planificacion con hijas debe descontar solo saldo propio, no compartido. Ejemplo ficticio: necesidades de 600 y 800 con saldo comun de 1000: descontar los 1000 dos veces produciria un faltante falso de cero. Si saldo contiene fondos ajenos, calculo automatico no verificable. No crear reservas virtuales.

2) CAMBIO DE DESTINO. A recomendada: fijar destino de planificacion durante su vigencia, aunque se almacene en linea mensual por ciclo. B alternativa: permitir cambio entre ciclos solo tras verificar traspasos bancarios reales y conservar destinos historicos. Si ambos saldos conservan fondos o existen pagos en transito, suspender sugerencia automatica hasta conciliacion. Cambiar campo no mueve dinero ni constituye autorizacion de movimiento.

3) CICLOS FUTUROS. A recomendada: guardar rango inclusivo de etiquetas de ciclo financiado previsto en cabecera del plan, sin inventar fechas de Inicio/Fin ni filas en tblCiclos; enlazar con ciclos reales al abrirlos. Ejemplo enero-marzo: al abrir enero quedan tres ciclos incluyendo enero; al abrir febrero quedan dos. No usar fecha de nomina como corte. B alternativa: exigir ciclos reales creados antes de planificar; tecnicamente simple, pero dificulta planificar el ejercicio siguiente. Si las etiquetas no identifican periodos inequívocos, marcar no verificable.

FORMULA. Pendiente=max(0,Previsto-Gastos ejecutados-Saldo disponible), siempre mismo ambito y corte. T1000, S500, gasto hijo200 pagado de ese saldo => G200,S300, pendiente500. Retirada ajena200 => G0,S300, pendiente700. Dinero transferido antes de gastarse puede aumentar temporalmente pendiente: no inferir Gasto. Hija con dos vencimientos y un gasto80 ejecuta 80 una sola vez, no 160. Cierre funcional de planificacion no equivale a cierre financiero ni a fotografia.

ARQUITECTURA MINIMA. Maestro unico Partidas, raiz simple o con hijas sin tipos adicionales; clasificacion Categoria/Subcategoria separada. Plan Mensual por raiz/ciclo; Plan de Gastos Previstos por cabecera y lineas con ID propio para vencimientos repetidos; Movimientos, Saldos, Deudas y Referencias vigentes; fotografia al cierre aprovechando SPEC27. Preservar fuente, destino, relaciones, Esencial, importes y clasificacion historicas. Mapping PRE/PAR explicito, sin duplicar padre e hijas ni reescribir pasado.

FUENTES Y LIMITES. Main 454d21a: classification-schema.ts (partidas.padre FK a subcategoria), budget-schema.ts (destino unico de aportacion), cycle-plan-schema.ts (ciclo + PRE), annual-plan-schema.ts (presupuesto es importe), planes-ciclo.ts (ejecucion por relaciones vigentes), SPEC27 (cierre documental, AC UNRUN). PR134 diagnostica, no aprobada; PR133 fuera de alcance. Excel v5.10 accesible, pero v5.11 no localizado: migracion fisica NO validada.

PENDIENTES PARA USUARIO, uno a uno: exclusividad efectiva de saldo financiador; destino fijo o excepcion acreditada; rango de ciclos futuros previstos. Siguiente accion: Codex integra contraste y pregunta; sin SPEC, implementacion, merge ni migracion sin autorizacion.
