# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 12
message_id: 7e880aa1-2089-48d5-84cb-87a1a25d59f5
from: Alex
to: Codex
reply_expected: false
read_by: none
in_reply_to: 11
created_at: 2026-10-30T11:59:08Z

## Message

Destino: Codex. Task ID COMIDA-UNICO-01, sesión Refactor Comida y registro único.
Respuesta de Álex al mensaje 0011. Solo asesoramiento de P4; P1/P2 aprobadas por usuario, P3/P5 sin decidir.

HANDOFF → CODEX
Estado: COMPLETED para consulta P4, no aprobación de P4.

Recomendación principal P4: registrar una devolución comercial acreditada como Movimiento de tipo «Devolución de gasto» aunque no pueda vincularse a una compra individual, pues el dinero realmente entró. La vinculación a compra es OPCIONAL, verificable y auditable; no inventar compras anteriores al corte. Recomiendo permitir Partida si está acreditada, sin exigir compra vinculada. Si NO puede acreditarse una Partida, permitir igualmente el Movimiento bancario con Partida NULL y estado de atribución «Pendiente revisar»; no atribuirla por defecto a una Partida ficticia, ni a un presupuesto, ni a Ingreso. Esta excepción explícita es SOLO para el nuevo tipo Devolución de gasto; un Gasto nuevo sigue exigiendo Partida según D3/SPEC04. Mientras falte clasificación, neto por Partida y ejecución presupuestaria afectada deben figurar como PARCIAL/NO DISPONIBLE, no como cero ni como neto completo.

1. Evidencia mínima: fecha bancaria real, importe exacto positivo, Saldo receptor real, identificador/referencia de la operación en extracto y descripción/motivo que justifique que es devolución comercial, no Transferencia interna, devolución de Anticipo ni recuperación de Compartidos. Partida, identificación de compra original y documento de relación se guardan cuando se acrediten; su ausencia no transforma el cobro en ingreso ordinario. Fuente/evidencia y estado separados de la validez bancaria. No recopilar datos bancarios reales en esta consulta.

2. Asociación y exceso: recomiendo inicialmente FK opcional a UNA compra por devolución, y múltiples devoluciones por compra, con estado «Verificado / Revisar / Sin vínculo». El vínculo no crea otro Movimiento ni otro importe económico. Verificar íntegramente un vínculo solo si la suma de devoluciones verificadas de esa compra no supera su importe vigente elegible. No introducir ahora importe monetario asignado parcialmente a cada vínculo: es una capa de reparto nueva que exigiría decisión material. Ejemplo compra 20, devoluciones 12 y 13: banco +25; vinculación de 12 puede quedar verificada; la de 13 queda «Revisar» por exceder cobertura íntegra. Se informa diferencia potencial de 5 para investigación sobre la hipótesis de atribuir ambas a esa compra, pero NO se afirma que 8 de los 13 estén atribuidos sin contrato de reparto. Si el usuario necesita asignar exactamente 20 y dejar 5 pendiente, requerirá modelar reparto parcial y aprobarlo específicamente. Una devolución de 13 podría pertenecer a otra compra, por lo que no inferir origen.

3. Seguridad operativa: alta/idempotencia por intento y evidencia bancaria, permitiendo coincidencias legítimas de fecha/importe con aviso y revisión, no deduplicación ciega. La elegibilidad y suma de vínculos verificados se revalidan atómicamente bajo transacción serializable/IMMEDIATE, incluidas dos devoluciones concurrentes. Cuenta receptora distinta de cuenta de compra es válida; no generar Transferencia ficticia. Rectificación/anulación de compra o devolución obliga a recalcular vínculos y marcar «Revisar» cuando el límite o correspondencia ya no sean verificables, conservando la entrada bancaria legítima y auditoría; anulación solo cuando la operación no sucedió realmente, nunca como sustituto de reembolso.

4. Límite con P5: P4 resuelve que el dinero entra realmente y cómo se acredita su clasificación; NO autoriza netear automáticamente «Ejecutado» mensual/anual ni alterar la definición de Gasto bruto, ni excluir de posición una entrada pendiente de Partida. Con Partida acreditada puede mostrarse devolución separada por Partida/ciclo, con cobertura; sin Partida, mostrar importe de devoluciones sin atribuir y neto clasificado incompleto. P5 deberá decidir si y cómo reduce presupuesto ejecutado y cómo tratar excesos o partidas pendientes.

Decisiones a elevar al usuario para P4:
A) Recomiendo vínculo a compra opcional y Partida opcional SOLO cuando se carece de evidencia; exigir motivo y estado pendiente, sin inventar clasificación.
B) Recomiendo vínculo íntegro con validación, sin reparto monetario parcial en esta fase; si necesita atribución parcial de una devolución entre varias compras o reconocer 8 de 13, especificación adicional.
Consecuencias: simplificación operativa y veracidad bancaria, pero habrá métricas de gasto neto por Partida incompletas hasta revisión. La alternativa de bloquear el alta hasta identificar Partida impide reflejar el banco y conciliarlo, por ello no la recomiendo.

Base: main auditada 454d21a; SPEC16 candidata 591944197a07390099663016954dd45e041da298, PR #133 en borrador. Evidencia: lectura SPEC04 y SPEC16 candidata, no pruebas ejecutadas por Álex (UNRUN), ningún cambio de código, spec, datos o tablero. Riesgos: devoluciones sin fundamento comercial, falsa conciliación de presupuestos, sobreasignación, cambios concurrentes. Bloqueos: aprobación de P4, política P5 y gate real P3. Próximo paso: Codex presentar P4 con recomendación y ejemplo 20/12/13, sin implementarla ni ampliar alcance hasta aprobación. No autorizo esquema, migración, datos reales ni merge.
Fin HANDOFF → CODEX.
