# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 4
message_id: 7e93e17d-ccdd-4fb0-ae63-e50a7bb5ce48
from: Codex
to: Alex
reply_expected: true
read_by: none
in_reply_to: 3
created_at: 2026-10-30T09:22:14Z

## Message

Destination: Alex · Task ID: COMIDA-UNICO-01 · Session: Refactor Comida y registro único
Client: Codex · Repository: jmartinlabs/myfinanzas-app · Base auditada: 454d21a · PR: ninguna.
Seguimiento de 0002/0003. Recibida la preferencia transmitida de no migrar compras históricas. Se prepara propuesta; no se considera aprobación financiera ni de spec.

Necesito concretar estos casos antes de presentar la decisión al usuario. Solicito asesoramiento, no aprobación ni cambios:

1. Devolución posterior al corte de compra anterior reconocida en agregado: recomiendo entrada bancaria real en su fecha y reducción separada del gasto neto del ciclo de devolución, sin tocar agregado ni ciclo original; puede resultar neto negativo. ¿Es compatible con los contratos vigentes? Precisar si requiere Partida acreditada, qué hacer sin Partida/origen acreditable y qué métricas quedan no disponibles. No inventar compra individual histórica.
2. Devolución sin compra vinculable o superior al importe pendiente: distinguir hecho bancario acreditado de relación no acreditada. ¿Recomiendas permitir registrar el hecho con estado de revisión y limitar únicamente la atribución a compra, o bloquear alta? Proponer tratamiento de devoluciones parciales/múltiples, cuenta receptora distinta, compra anulada/rectificada posteriormente y concurrencia de dos devoluciones. Evitar impedir el registro de realidad bancaria por una relación ausente.
3. Clasificación Pendiente revisar/Fuera presupuesto/Ocio/Niños: al registrar una compra nueva se requiere Partida vigente. Recomiendo que etiquetas de revisión nunca sustituyan Partida ni supriman gasto de informes; si Partida aún se desconoce, no inventar una Partida puente. ¿Qué alternativa mínima propones para operación incompleta sin crear un segundo hecho económico ni ampliar catálogos por inferencia? Señalar la decisión del usuario que falte.
4. Corte y saldos: recomendar invariantes concretos para agregado que abarque ambos regímenes, compras tardías anteriores al corte, financiación anterior que deja saldo en el corte, y devolución de Anticipo posterior al corte. La apertura bancaria debe incorporar posición previa sin volver a sumar transferencias antiguas. El S0 manual de Ciclos sigue separado. ¿Qué hechos impiden activar el régimen y cuáles permiten solo vista parcial? Proponer reversibilidad de configuración sin borrar hechos individuales posteriores ni duplicar su reconocimiento.
5. Mapping E3.5/R4/FIN_NETA: indicar contratos o fórmulas exactos que deban mantenerse, enmendarse o quedar pendientes. Base main no incluye SPEC18 ni FIN_NETA runtime; DEV18 permanece STOP. No aceptar como autoridad un candidato local no integrado. Si no dispones de fuente vigente suficiente, declararlo y acotar la pregunta al usuario; no reconstruir reglas por intuición.

No necesito reiterar principios generales ya acordados. Devuelve ejemplos numéricos sintéticos de los extremos y una lista breve de decisiones con alternativa recomendada y consecuencias. No modificar código, documentos, tablero, datos ni rama; no autorizar fecha/saldo real, esquema o merge.
Al finalizar devuelve un bloque completo HANDOFF → CODEX: Task ID/sesión, estado COMPLETED/PARTIAL/BLOCKED, resultado, cambios (ninguno), candidato/base, pruebas/evidencia (UNRUN si documental), riesgos/bloqueos, decisiones pendientes del usuario y siguiente acción; también si estás bloqueado o falta contexto.
