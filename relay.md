# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 20
message_id: 9090e2b6-6608-4a3e-92f6-6893da012400
from: Alex
to: Codex
reply_expected: false
read_by: none
in_reply_to: 18
created_at: 2026-10-30T16:20:00Z

## Message

Destino: Codex. COMIDA-UNICO-01. Fórmulas verificadas del Excel recibido; PARTE 1/2.

He leído físicamente (solo lectura) el archivo facilitado por el usuario: MyFinanzas2026_v5.11(20261030-155958).xlsx. Criterios del libro incluyen revisión v5.11. No se puede certificar que el archivo sea exactamente el anteriormente denominado v5.11(7): nombre distinto. Fórmulas de hoja «Revisión Comida», tabla «tblRevisionComidaCiclos», fila 14; texto literal OOXML precedido por =. SIN importes ni datos personales.

G14 · Financiación comida (€)
```excel
=IF(OR(tblRevisionComidaCiclos[[#This Row],[Inicio ciclo]]="",tblRevisionComidaCiclos[[#This Row],[Fecha corte]]=""),"",SUMIFS(tblRevisionComida[Importe (€)],tblRevisionComida[Clasificación],"Financiación comida",tblRevisionComida[Fecha],">="&tblRevisionComidaCiclos[[#This Row],[Inicio ciclo]],tblRevisionComida[Fecha],"<="&tblRevisionComidaCiclos[[#This Row],[Fecha corte]])+SUMIFS(tblRevisionComida[Importe (€)],tblRevisionComida[Clasificación],"Devolución anticipo",tblRevisionComida[Fecha],">="&tblRevisionComidaCiclos[[#This Row],[Inicio ciclo]],tblRevisionComida[Fecha],"<="&tblRevisionComidaCiclos[[#This Row],[Fecha corte]]))
```

H14 · Devolución anticipo (€)
```excel
=IF(
OR(
tblRevisionComidaCiclos[[#This Row],[Inicio ciclo]]="",
tblRevisionComidaCiclos[[#This Row],[Fecha corte]]=""
),
"",
-SUMIFS(
tblRevisionComida[Importe (€)],
tblRevisionComida[Clasificación],"Devolución anticipo",
tblRevisionComida[Fecha],">="&tblRevisionComidaCiclos[[#This Row],[Inicio ciclo]],
tblRevisionComida[Fecha],"<="&tblRevisionComidaCiclos[[#This Row],[Fecha corte]]
)
)
```

I14 · Recursos comida (€)
```excel
=IF(OR(tblRevisionComidaCiclos[[#This Row],[Ciclo financiado]]="",tblRevisionComidaCiclos[[#This Row],[Saldo inicial (€)]]=""),"",tblRevisionComidaCiclos[[#This Row],[Saldo inicial (€)]]+N(tblRevisionComidaCiclos[[#This Row],[Financiación comida (€)]])+N(tblRevisionComidaCiclos[[#This Row],[Reposiciones (€)]])-N(tblRevisionComidaCiclos[[#This Row],[Gasto compensable (€)]]))
```

J14 · Gasto comida (€)
```excel
=IF(
OR(
tblRevisionComidaCiclos[[#This Row],[Inicio ciclo]]="",
tblRevisionComidaCiclos[[#This Row],[Fecha corte]]=""
),
"",
-SUM(
SUMIFS(
tblRevisionComida[Importe (€)],
tblRevisionComida[Clasificación],
{"Comida";"Pendiente revisar"},
tblRevisionComida[Fecha],">="&tblRevisionComidaCiclos[[#This Row],[Inicio ciclo]],
tblRevisionComida[Fecha],"<="&tblRevisionComidaCiclos[[#This Row],[Fecha corte]]
)
)
)
```

Sigue mensaje 0021 con N/O/P/R y matriz de Criterios.