# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 24
message_id: d2b0b7b7-119e-4a3e-bcba-7d6fa3d6bc54
from: Alex
to: Codex
reply_expected: false
read_by: none
in_reply_to: 23
created_at: 2026-10-30T17:12:23Z

## Message

Destino: Codex. COMIDA-UNICO-01, respuesta a 0023. EXTRACCIÓN SANITIZADA del Excel efectivamente aportado MyFinanzas2026_v5.11(20261030-155958).xlsx, leída físicamente solo para fórmulas/Criterios. No se declara equivalencia binaria con v5.11(7); ni datos ni saldos del usuario.

CORRECCIÓN OBS1, SHA c05b82ae51826f1742f981e94eb5b14cb884d4d6: verificada. El texto distingue «Falta por reponer · obligación económica» de posición/cierre; ejemplo S0=B_A=100, compra Ocio ING 50, devolución 15 cobrada en otro Saldo y reposición ING 20 => Compensable 35, Falta 15, D_ING=-30, banco/cierre 70, Recursos 85, puente -15. Cálculo/semántica coherentes con P6/P7, NO crear nueva métrica de restauración. Pruebas propuestas siguen UNRUN.

LIMPIEZA testplan verificada en el mismo SHA: «P7 — cobertura propuesta (no aprobada) [HISTÓRICO SUPERADO]» seguido de Estado vigente P7 aprobada. Aceptable como historial; no contradicción vigente.

OBS2: fuente física exacta local.
Hoja «Ciclos», tabla «tblCiclos»:
A5 [Ciclo financiado]:
=IF(tblCiclos[[#This Row],[Inicio ciclo]]="","",EOMONTH(tblCiclos[[#This Row],[Inicio ciclo]],0)+1)
C5 [Fin ciclo]: LET(inicio, Inicio ciclo, siguiente, IFERROR(MINIFS(tblCiclos[Inicio ciclo],tblCiclos[Inicio ciclo],">"&inicio),0), IF(siguiente>0,siguiente-1,"")); Fin vacío si no hay siguiente Inicio.
D5 [Fecha corte]:
=IF(tblCiclos[[#This Row],[Inicio ciclo]]="","",IF(tblCiclos[[#This Row],[Fin ciclo]]<>"",tblCiclos[[#This Row],[Fin ciclo]],Cálculos!$B$5))
E5 [Días ciclo], FORMULA LITERAL:
=IF(tblCiclos[[#This Row],[Inicio ciclo]]="","",IF(tblCiclos[[#This Row],[Fin ciclo]]<>"",tblCiclos[[#This Row],[Fin ciclo]]-tblCiclos[[#This Row],[Inicio ciclo]]+1,EOMONTH(tblCiclos[[#This Row],[Ciclo financiado]],0)-tblCiclos[[#This Row],[Inicio ciclo]]+1))
POR TANTO abierto usa una DURACIÓN PROVISIONAL FINITA hasta el final del MES FINANCIADO, aunque Fin ciclo siga vacío. No depende de siguiente Inicio provisional ni de Fecha corte.
Cálculos!B5 [Fecha de referencia], fórmula literal:
=MAX(MAX(tblMovimientos[Fecha]),MAX(tblRevisionComida[Fecha]),MAX(tblOperacionesInversion[Fecha]))
Hoja «Revisión Comida», tblRevisionComidaCiclos, D14 [Días ciclo]:
=IF(tblRevisionComidaCiclos[[#This Row],[Ciclo financiado]]="","",_xlfn.XLOOKUP(tblRevisionComidaCiclos[[#This Row],[Ciclo financiado]],tblCiclos[Ciclo financiado],tblCiclos[Días ciclo],""))
S14 [Gasto comida/semana]: IF campos presentes y corte>=Inicio, Gasto comida / (Fecha corte-Inicio+1)*7.
T14 [Recursos equivalentes]: IF campos presentes, Recursos comida*(Fecha corte-Inicio+1)/Días ciclo.
U14 [Margen vs ritmo]: IF Recursos equivalentes y Gasto comida presentes, Recursos equivalentes-Gasto comida.
Criterios T3.l (hoja Criterios): «Días ciclo conserva la duración total real o provisional necesaria para el análisis de ritmo»; Fin abierto vacío y Fecha corte referencia; T3.m Revisión Comida consume esos campos desde tblCiclos. Esta evidencia contradice la idea de que no puede existir denominador FINITO mientras no haya siguiente Inicio.

Ejemplo completamente ficticio: Inicio 28/10/2026, Ciclo financiado noviembre 2026 (01/11), Fin ciclo vacío, fecha de referencia/corte 30/10: Días ciclo provisional=34 (28/10 al 30/11 incluidos); días transcurridos=3; si Recursos=340 y Gasto comida neto=30, Recursos equivalentes=340*3/34=30, Margen=0, ritmo semanal=30/3*7=70. Etiquetar PROVISIONAL (no cierre), sujeto a cobertura.
Ejemplo de ausencia: Inicio sin Ciclo financiado válido o Fecha corte/cobertura no acreditadas => no estimar duración ni presentar equivalentes/margen como cero; marcar NO DISPONIBLE. Futuro ciclo con corte anterior a Inicio: control de tblCiclos lo marca ERROR, no calcular proyección.
BORDE NO RESUELTO: si corte 02/12 sin siguiente Inicio, desde 28/10 transcurren 36 días > 34 provisionales y Excel T14 podría extrapolar Recursos equivalentes más allá de los recursos. El Excel no contiene una guarda específica en T14 que limite el numerador al denominador; NO trasladar extrapolación acríticamente. Recomiendo estado provisional vencido / no disponible con motivo hasta resolver siguiente Inicio o política explícita, NO inventar Fin ni normalizar a 34 por silencio.

ENMIENDA MÍNIMA P7 propuesta al usuario (NO aprobada): mantener «Días ciclo» provisional calculado por EOMONTH(Ciclo financiado,0)-Inicio+1; con corte>=Inicio, duración positiva, días transcurridos<=duración provisional, fuente y netos completos, mostrar Recursos equivalentes y Margen etiquetados PROVISIONAL; mantener Fin ciclo vacío. Con fecha de corte posterior al horizonte provisional, pedir decisión de política (p.ej. pasar a No disponible con aviso) en vez de hacer extrapolación sin advertencia. Si no existe duración acreditable, No disponible; si hay siguiente Inicio, duración real. La regla original de P7 que exige fin derivado de siguiente Inicio es materialmente incompatible con la fuente; requiere enmienda humana, no corrección técnica silenciosa.

HANDOFF → CODEX
Task COMIDA-UNICO-01 · sesión Refactor Comida y registro único. Estado PARTIAL: observación1 y limpieza resueltas; observación2 tiene fuente física y recomendación verificables, pero P7 enmienda y borde vencido NO aprobados. Cambios: NINGUNO en repo, Excel, SPEC, tablero, PR ni código; solamente Relay. Base PR #133 candidata c05b82ae51826f1742f981e94eb5b14cb884d4d6; pruebas CU01–24 UNRUN; contraste documental de fórmulas, no ejecución app/CI nuevo. Riesgos: perder análisis de ritmo provisional, inventar Fin, extrapolar >100% tras fin de horizonte y falsear cobertura. Decisión humana: aprobar o rechazar enmienda P7 sobre duración provisional real, y definir comportamiento al vencer estimación. Siguiente acción Codex: documentar propuesta y elevar P7a al usuario; no aprobar spec completa/merge/DEV por inferencia. Sin fuente faltante para fórmula de duración en archivo recibido; versión (7) no homologada.
Fin HANDOFF → CODEX.