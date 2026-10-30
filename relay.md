# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 22
message_id: 2a1ca0eb-c960-430b-8b33-56fa7a2fcf8f
from: Alex
to: Codex
reply_expected: true
read_by: none
created_at: 2026-10-30T16:51:17Z

## Message

Destino: Codex · COMIDA-UNICO-01. Revisión crítica de PR #133, candidato completo revisión 2, SHA 581d36cd5e77c8c2b2c07168458beb943f19ba02. El usuario pide transmitir estas observaciones, NO aprueba la spec/los wireframes ni autoriza merge.

La PR documental está bien encaminada: fuente única de hechos en Movimientos, legado conservado, S0 distinto de B_A, P1–P7 recogidos, protección de metadata, auditable e idempotente; docs CI required SUCCESS en SHA revisado. CU01–24 UNRUN; no implementación. Recomendación actual: FAVORABLE CON OBSERVACIONES, NO APROBAR revisión 2 aún.

OBSERVACIÓN MATERIAL 1 — devolución recibida en un Saldo distinto de ING Comida.
Caso sintético: S0 ING=100, compra Ocio desde ING=50, devolución comercial de esa compra=15 COBRADA EN OTRA CUENTA real, reposición a ING=20, sin otros hechos. Posición ING después=70 (100−50+20); para restaurar la cuenta a 100 faltarían 30 de entrada bancaria, mientras P6 «Falta por reponer» por obligación económica es max((50−15)−20,0)=15. Ambas cifras correctas responden a preguntas distintas. El diseño ya reconoce receptor distinto, D de ING excluye esa entrada y puente P7 explica efectos externos. Verificar si la UI/contrato los distinguen de forma suficientemente explícita: no etiquetar «Falta por reponer=15» como cantidad necesaria para restaurar ING o conciliar la cuenta. Mostrar discrepancia/explicación usando magnitudes verificables existentes, sin nueva reposición ficticia ni doble contabilidad. Si para resolverlo se requiere métrica financiera NUEVA o cambio P6/P7, presentarlo como decisión material, no implementarlo por inferencia. Añadir prueba de receptor distinto con números y comprobación de semántica/cobertura (CU06/CU09/CU17/CU21–23 según proceda).

OBSERVACIÓN MATERIAL 2 — duración provisional del ciclo abierto.
La spec actual P7 (líneas 1171–1174 y CU24) indica que sin siguiente Inicio no se ofrecen Recursos equivalentes ni Margen por falta de duración finita. Pero las Instrucciones/Criterios de MyFinanzas indican «Días ciclo conserva la duración total real/provisional necesaria para ritmo», y el Excel aportado calculaba ritmo/equivalentes según Días ciclo. Contrastar en la fuente física vigente si un ciclo abierto puede tener duración provisional acreditada y, de ser así, conservar la funcionalidad etiquetada como provisional sin inventar Fin ni siguiente Inicio. Si la política P7 aprobada excluyó deliberadamente la duración provisional, explicitar contradicción y elevar corrección al usuario, NO alterar la aprobación P7 silenciosamente. Distinguir período provisional fiable, duración desconocida y ausencia de cobertura; añadir test CU24 para estas variantes.

LIMPIEZA DOCUMENTAL MENOR — testplan conserva encabezado «P7 — cobertura propuesta (no aprobada)» y párrafo posterior «Estado vigente P7 aprobada». Historial append-only es válido; añadir un aviso inequívoco de estado supersedido o ajustar la presentación sin borrar la evidencia histórica, para evitar confusión al implementar. Revisar si otros rótulos obsoletos afectan lectores.

HANDOFF → CODEX
Task: COMIDA-UNICO-01 · Estado: REVIEWED WITH OPEN FINDINGS, approval withheld.
Base main 454d21a; candidata PR #133 HEAD 581d36cd5e77c8c2b2c07168458beb943f19ba02; sin modificaciones por Álex salvo este mensaje Relay. Pruebas: docs CI success, CU01–24 UNRUN, sin verificación de runtime/operaciones reales.
Riesgos: confundir obligación de reposición con efectivo faltante en ING; perder ritmo provisional del ciclo abierto; etiquetas documentales históricas como vigentes.
Pendientes: explicación/ajuste propuesto y QA documental sobre las dos observaciones; P3 corte/apertura y autorización operativa siguen separados.
Siguiente acción: contrastar contra criterios físicos y P6/P7, responder con cambios exactos o motivos documentados para no cambiarlos, y volver a someter revisión 2 a aprobación; sin código, merge, despliegue ni activación por este encargo.
Fin HANDOFF → CODEX.