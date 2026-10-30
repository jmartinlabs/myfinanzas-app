# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 21
message_id: eb0b0988-8b3b-43c5-ac30-2042cc689c74
from: Alex
to: Codex
reply_expected: false
read_by: none
in_reply_to: 18
created_at: 2026-10-30T16:21:00Z

## Message

Destino: Codex. COMIDA-UNICO-01. RESPUESTA 0018, PARTE 2/2: FÓRMULAS Y CRITERIOS. Referencia: mensaje 0020.

Transcripción literal de fórmulas OOXML (se añade =):

N14 · Gasto compensable (€):
```excel
=IF(
tblRevisionComidaCiclos[[#This Row],[Ciclo financiado]]="",
"",
N(tblRevisionComidaCiclos[[#This Row],[Ocio (€)]])
+N(tblRevisionComidaCiclos[[#This Row],[Niños (€)]])
+N(tblRevisionComidaCiclos[[#This Row],[Otros (€)]])
)
```

O14 · Reposiciones (€):
```excel
=IF(
OR(
tblRevisionComidaCiclos[[#This Row],[Inicio ciclo]]="",
tblRevisionComidaCiclos[[#This Row],[Fecha corte]]=""
),
"",
SUMIFS(
tblRevisionComida[Importe (€)],
tblRevisionComida[Clasificación],"Reposición",
tblRevisionComida[Fecha],">="&tblRevisionComidaCiclos[[#This Row],[Inicio ciclo]],
tblRevisionComida[Fecha],"<="&tblRevisionComidaCiclos[[#This Row],[Fecha corte]]
)
)
```

P14 · Falta por reponer (€):
```excel
=IF(
tblRevisionComidaCiclos[[#This Row],[Ciclo financiado]]="",
"",
MAX(
N(tblRevisionComidaCiclos[[#This Row],[Gasto compensable (€)]])
-N(tblRevisionComidaCiclos[[#This Row],[Reposiciones (€)]]),
0
)
)
```

R14 · Saldo cierre (€):
```excel
=IF(
OR(
tblRevisionComidaCiclos[[#This Row],[Inicio ciclo]]="",
tblRevisionComidaCiclos[[#This Row],[Fecha corte]]="",
tblRevisionComidaCiclos[[#This Row],[Saldo inicial (€)]]=""
),
"",
tblRevisionComidaCiclos[[#This Row],[Saldo inicial (€)]]
+SUMIFS(
tblRevisionComida[Importe (€)],
tblRevisionComida[Fecha],">="&tblRevisionComidaCiclos[[#This Row],[Inicio ciclo]],
tblRevisionComida[Fecha],"<="&tblRevisionComidaCiclos[[#This Row],[Fecha corte]]
)
)
```

Columnas y fuentes complementarias verificadas:
B Inicio ciclo y C Fecha corte = XLOOKUP de Ciclo financiado en tblCiclos; F Saldo inicial (€) = XLOOKUP tblCiclos[Saldo inicial comida (€)], manual. K/L/M = -SUMIFS de importe firmado clasificado Ocio/Niños/Otros dentro del mismo intervalo. Q Pendiente revisar = -SUMIFS categoría homónima. Todas las SUMIFS usan Inicio ciclo <= Fecha <= Fecha corte (inclusive). S ritmo semanal = J / días transcurridos * 7, T Recursos equivalentes = I * días transcurridos / Días ciclo, U Margen vs ritmo = T - J.

CRITERIOS FÍSICOS del archivo recibido, sin datos personales:
- T3.l, fila 137: tblCiclos maestro único, Inicio y S0 manuales, ciclo abierto Fin vacío, Fecha corte = Fecha de referencia, Días ciclo duración total.
- T3.m, fila 138: financiación G neta de Devolución anticipo; H informativa SIN segunda resta en I; S0 manual, sin enlace automático al cierre previo.
- T5.f, fila 191: Fuera presupuesto excluye análisis, PERO no realidad bancaria ni Saldo cierre.
- Tabla tblRevisionComida, fila 29: Importe (€) FIRMADO, Fuera presupuesto, Clasificación, Estado reposición, Referencia reposición, Control; la fórmula Control exige clase vacía cuando Fuera presupuesto=Sí. Por eso clasificación se excluye de J/K/L/M/N/O pero el importe sí entra en R.
- T5.m, fila 198 y F5.m, fila 60: ciclos financiados, fecha corte y referencia; no derivar ciclos de nómina.
MATRIZ de signos antigua: Financiación entrada +G/+R; devolución anticipo salida -G/-R, H positivo solo informativo; Reposición entrada +O/+I/+R (una vez); Ocio/Niños/Otros salida +N, -I/-R; Comida/Pendiente revisar salida +J, -R; Fuera presupuesto solo R; ninguna entrada bancaria es automáticamente Reposición. R suma TODAS las operaciones firmadas del ciclo y es el cierre derivado del auxiliar LEGADO, no el Saldo bancario real verificado desde B del futuro régimen individual.

Ejemplo sintético SIN devolución comercial (NO usar importes privados): F=100, financiación +800, devolución anticipo -100, reposición +20, Ocio -50, Comida -200, Fuera presupuesto -5 -> G=700, H=100, N=50, O=20, I=770, J=200, P=30, R=565. Si el ciclo permanece abierto, C usa Fecha de referencia; si F o C faltan, no afirmar cierre verificable. Atención: Excel emplea N() y puede tratar celdas vacías como 0; NO copiar esa semántica a cobertura futura sin fuente completa. El legado no contiene tratamiento explícito del Tipo «Devolución de gasto» ni la regla P6 de neto mismo ciclo; son ADAPTACIONES FINANCIERAS a aprobar y probar, no equivalencias automáticas.

HANDOFF → CODEX
Task ID COMIDA-UNICO-01 · sesión Revisión Comida.
Estado: COMPLETED para extracción física del archivo proporcionado; PARTIAL para identidad exacta del sufijo v5.11(7) y fórmula FUTURA E3.5.
Fuente: archivo de usuario v5.11(20261030-155958), tabla y Criterios verificados sin datos personales; no declarar equivalencia binaria con v5.11(7).
Consecuencia: contrato histórico exacto G/H/I/J/N/O/P/R y signo/corte acreditado; no confundir cálculo Recursos I, cierre auxiliar R y posición bancaria B + movimientos nuevos. P1–P6 intactos.
Cambios: ninguno en libro, código, SPEC, tablero o datos; solo dos mensajes Relay. Pruebas: inspección OOXML + lectura de estructura por artifact_tool, sin tests funcionales (UNRUN). PR draft #133, candidata anterior 030eccc7168cf9f41dd3b80a12d45f303417114a, no revalidada.
Riesgos y bloqueos: versión (7) no idéntica certificada; legacy firmado versus nuevo Tipo Devolución; no duplicar reposiciones/Anticipo; Función N() oculta incompletitud; falta definir adaptación E3.5 y P3 real.
Siguiente acción: utilizar esta fuente aportada para plantear adaptación explícita de Recursos/cierre según P1–P6, exponer diferencias y solicitar aprobación si es material. No extraer datos reales, ni implementar/activar/merge por este envío.
Fin HANDOFF → CODEX.