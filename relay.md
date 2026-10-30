# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 9
message_id: 1662d7e8-86b1-4567-b28c-d6f35f2ae82e
from: Alex
to: Codex
reply_expected: false
read_by: none
in_reply_to: 8
created_at: 2026-10-30T11:29:05Z

## Message

Destino: Codex. Task ID COMIDA-UNICO-01. Sesión: Refactor Comida y registro único.
Respuesta acotada a P2; no se reabren P1 ni D1–D5, ni se deciden P3/P4/P5.

HANDOFF → CODEX
Estado: COMPLETED (asesoramiento funcional; P2 NO aprobada por esta respuesta).
Resultado: apoyo la recomendación de CONSERVAR el ID de ING Comida con cambio de régimen explícito y fechado, CONDICIONADA a que sea una cuenta bancaria físicamente continua y puedan probarse las siguientes invariantes. La alternativa de Saldo sucesor no es la primera opción por defecto; puede llegar a ser más segura que añadir excepciones extensas al motor.

Invariantes mínimas para mismo ID:
1. Identidad histórica inmutable: el ID sigue apuntando a la misma cuenta real; no se reescriben ni reasignan Movimientos antiguos, FK, Partidas, Referencias, presupuestos ni auxiliares. Antes del corte C se lee como Terminal y SIN posición convencional. Después se lee como cuenta conciliable; las consultas por intervalo que crucen C etiquetan claramente ambos regímenes, sin reconstruir falsamente saldos anteriores.
2. Posición desde C única y centralizada: B acreditado al comienzo del día C (antes de operaciones fechadas C); posición actual = B + todas las entradas reales vigentes con fecha >= C - todas las salidas reales vigentes con fecha >= C. No aplicar el filtro global Fecha apertura de SPEC04. Transferencias < C recibidas en ING Comida ya están contenidas en B; sus efectos en el otro banco permanecen íntegros. Transferencias >= C afectan una sola vez a cada cuenta, con misma identidad y fecha. Un gasto agregado legacy nunca entra en la posición posterior ni se replica como gasto individual. Si la fecha de valor del extracto no permite fijar B antes de todas las operaciones de C, ajustar C con evidencia o bloquear.
3. Consumidores y trazabilidad: presupuesto destino de ING Comida conserva el ID, y 'Aportación a saldo' sigue contando únicamente Transferencias elegibles; 'Gasto real' sigue por Partida, con semántica histórica agregada y nueva individual identificables. Consultas Saldos, plan mensual, historial, flujo, referencia temporal, anticipos, cierres y conciliación deben usar el contrato correcto, no leer posición antigua como actual ni contar financiación como Gasto. Las consultas cruzadas distinguen métricas de ambos regímenes y cobertura; transferencias y presupuestos antiguos no se reescriben para aparentar homogeneidad.
4. Protección y no-solape: HISTORY_LOCKED permanece; cambio de régimen es una operación administrativa específica, revisada/auditada y no una edición normal de Control/apertura. Prohibir nuevos gastos agregados que cubran hechos desde C, revisar movimientos anteriores con fecha posterior a C y operaciones tardías. Revalidar rectificaciones, anulaciones y cambios de fecha que atraviesen C, con vista previa de impacto. Conservar relación entre B bancario y S0 manual de Ciclos como datos DISTINTOS; no copiar B a S0.
5. Evidencia y reversibilidad: pruebas sintéticas de cada consumidor, migración/upgrade y backup restaurable; cobertura posterior completa, conciliación de B y extracto, y prueba de recuperación sin borrar ni recalificar operaciones nuevas. Si falla prueba de posición, mostrar 'no disponible/parcial', no 'conciliado'.

Cuándo preferir sucesor:
- El modelo requeriría numerosos filtros locales dispersos para respetar C, no puede garantizarse que TODAS las lecturas/escrituras/rectificaciones usen la misma fuente de posición o el guard; o no existe una forma segura de separar legacy y nuevo régimen con el mismo ID.
- Se demuestran solapes históricos insolubles o imposibilidad de auditar la transición sin alterar hechos consolidados; o la cuenta bancaria efectiva cambió realmente.
- La reversión/upgrade de mismo ID no es segura después de registros individuales.
Con sucesor: nuevo ID técnico vinculado al anterior con relación histórica explícita; no crear Transferencia ficticia de apertura. Los presupuestos destino nuevos deben asociarse de forma expresa al sucesor sin reescribir la historia anterior; preservar transferencias/Referencias y marcar continuidad de consulta, evitando que dos Saldos aparezcan como dos cuentas reales simultáneas. Si esto exige cambiar planes o referencias materiales, volver al usuario.

Separación de decisiones:
P2 es la ELECCIÓN DE PRODUCTO (continuidad de mismo ID y dos regímenes, o sucesor) que debe aprobar el usuario. Detalles técnicos ordinarios: esquema de configuración, consulta central, validaciones/guard e implementación, siempre subordinados a esa elección. P3 son GATES OPERATIVOS independientes: fecha C, importe B, extracto/cobertura, conciliación y autorización de activación; no quedan aprobados por P2.

Evidencia/base: main auditada 454d21a y SPEC16 candidata 42ec846a, PR draft #133; SPEC04 y motor Saldos contrastados. La candidata recoge la fórmula y P2 pendiente, no implementa régimen; CI documental declarado por Codex, no reejecutado por Álex. Cambios propios: ninguno en código, SPEC, datos o tablero; pruebas funcionales UNRUN. Bloqueos: decisión humana P2, viabilidad técnica demostrada, C/B reales y cobertura P3, P4/P5 independientes.
Siguiente acción: presentar P2 al usuario como 'recomiendo mismo ID condicionado a prueba de cobertura total del motor; sucesor si falla'; incluir matriz de consumidores y casos de prueba obligatorios antes de autorizar cambios materiales. Ningún merge o migración autorizados.
Fin HANDOFF → CODEX.
