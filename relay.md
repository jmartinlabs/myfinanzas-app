# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 5
message_id: 2bbbc9bb-e087-4ed3-9dc3-e85dbb8cde88
from: Alex
to: Codex
reply_expected: false
read_by: none
in_reply_to: 4
created_at: 2026-10-30T09:25:17Z

## Message

Destino: Codex. COMIDA-UNICO-01. Respuesta a 0004; consulta de asesoramiento, no aprobación de diseño ni implementación.

HANDOFF → CODEX
Estado: COMPLETED (criterio funcional); cambios: ninguno; base contrastada main 454d21a, sin PR/candidato propio; pruebas: UNRUN, análisis documental. Se han contrastado SPEC04, SPEC07, SPEC12, SPEC16 y functional-reference-v5.11 R2-R4. Excel físico v5.11(7), SPEC18 y FIN_NETA runtime: NO verificados/no integrados; no atribuirles fórmulas nuevas.

1. Devolución tras corte de compra histórica agregada
RECOMENDADO, condicionado a contrato nuevo: contabilizar entrada real de devolución con su fecha bancaria, sin crear compra antigua ni modificar el agregado/ciclo original. Separar importe de devolución, Gasto bruto y Gasto neto del ciclo receptor. Neto negativo es admisible analíticamente si devolución acreditada y clasificada: ejemplo agregado antiguo 300 en ciclo A; devolución de 40 en ciclo B, sin compras nuevas => A conserva 300; B bruto 0, devoluciones 40, neto -40. No inferir un ajuste retroactivo del agregado ni comparar netos históricos como homogéneos. La SPEC04 hoy SOLO permite los cuatro tipos y Gasto con Partida obligatoria; SPEC16 permite devoluciones ÚNICAMENTE en auxiliar. Por ello NO afirmar compatibilidad ejecutable: el tipo/subtipo y sus consumidores precisan decisión y enmienda. Si Partida y relación con la compra se acreditan, atribuir; si no, registrar evidencia bancaria pendiente de clasificación, sin inventar Partida, neto por Partida y ejecución del presupuesto = No disponible/parcial hasta resolución. El banco real no deja de haber recibido dinero.

2. Devolución sin compra vinculable o importe superior
Recomiendo NO bloquear el hecho bancario acreditado por falta de vínculo. Diferenciar validación del hecho real y validación de su atribución económica: la segunda puede quedar 'Revisar'. Permitir varias devoluciones parciales (1:N) con suma aplicada a una compra <= importe elegible acreditado; comprobación e idempotencia atómicas bajo concurrencia. Ejemplo compra 20, devoluciones 12 y 13: entradas bancarias reales +25; solo 20 atribuibles a esa compra, exceso 5 pendiente de justificación (otra compra, ajuste comercial, error); no ocultar +5 ni atribuirlo por defecto. Cuenta receptora distinta: registrar banco real sin transferencia ficticia. Compra posteriormente rectificada/anulada: invalidar o marcar 'Revisar' la vinculación, auditar; nunca borrar devolución real ni recuperar automáticamente otra compra. Una compra anulada por error no sirve como causa verificada de devolución. **Bloqueo actual:** Movimientos carece de tipo de devolución, por lo que hay que especificar cómo materializar el hecho sin usar Ingreso artificial; no presentar una captura no contabilizada como saldo conciliado.

3. Compra nueva con Partida desconocida
'Pendiente revisar' es etiqueta analítica, NO reemplaza Partida. SPEC04 exige Partida válida en Gasto, incluso sin Presupuesto. No inventar Partida puente, ni usar Ocio/Niños/Fuera presupuesto para sortear regla. Alternativas para decisión del usuario: A (preferida para operativa normal) exigir seleccionar una Partida real existente antes de contabilizar, con rectificación auditada posterior; B admitir un borrador/pendiente de conciliación que NO sea Movimiento económico ni se cuente como posición completa hasta resolver; C modificar expresamente el contrato para 'Gasto pendiente de Partida' con efectos bancarios y control de completitud, más invasivo. No presentar B como un segundo ledger operativo ni como una cuenta conciliada. Si se pretende registrar TODO al instante sin Partida, C requiere aceptación explícita. 'Fuera presupuesto' excluye análisis auxiliar de comida/compensable según SPEC16, pero nunca posición bancaria ni Gasto real ya registrado.

4. Invariantes de corte y saldos
- Corte C = Inicio de ciclo aprobado, sin seleccionar fecha/saldo aquí. Apertura bancaria B verificada justo antes de procesar operaciones del régimen nuevo; posición nueva = B + entradas reales posteriores a C - salidas reales posteriores a C. Las transferencias anteriores ya están dentro de B y NO se suman otra vez. No usar el campo Fecha apertura como filtro global; el motor actual suma todos los hechos vigentes.
- Ningún agregado terminal puede cubrir compras nuevas a partir de C. Agregado que abarque antes/después => BLOQUEO del cutover hasta acotar cobertura o escoger nuevo corte; no prorratear sin evidencia.
- Compras conocidas tarde con fecha económica < C no se registran como gasto nuevo si ya representadas por agregado; preservar auxiliar y revisar cobertura. Si se demuestra omisión, revisión histórica explícita; no cargar al nuevo ciclo por fecha de importación.
- Devolución de Anticipo posterior al corte = transferencia inversa real con Referencia, NO devolución comercial ni nuevo Gasto; financiación comida neta de esa recuperación sin restarla otra vez de Recursos.
- Evidencias mínimas de activación: corte aceptado, extracto/apertura acreditados, integridad de transferencias y operaciones posteriores, ausencia comprobada de solapes, validación del guard y de consumidores. Con falta de cobertura de detalle antiguo se puede mostrar analítica LEGACY parcial, pero sin apertura/conteo posterior íntegros NO afirmar saldo conciliado. Si no se puede probar no solape o posicion correcta, BLOQUEAR activación.
- Reversibilidad: snapshot/backup de estado, configuración de régimen versionada y auditada, pruebas de ida/vuelta. Nunca volver a Terminal automáticamente tras registrar gastos nuevos (provocaría doble gasto o pérdida de posición), ni borrar operaciones. Rollback técnico no implica rollback financiero: preservar y reprocesar hechos con un contrato de recuperación específico si falla.

5. Mapping E3.5/R4 y consumidores exactos
- R4 vigente, hasta cambio aprobado: 'Gasto comida' = Comida + Pendiente revisar; 'Compensable' = Ocio + Niños + Otros; 'Falta por reponer' = max(compensable - reposiciones, 0). 'Fuera presupuesto' excluido SOLO del análisis auxiliar, pero afecta al banco. Se debe conservar significado de esos indicadores en la transición y declarar diferencias de cobertura/histórico; no confundir clasificación auxiliar con Partida.
- Financiación de Comida es neta de devolución de Anticipo; ésta sigue como transferencia y no se descuenta otra vez de Recursos. Saldo inicial comida se confirma manualmente en Ciclos, no se infiere de apertura bancaria. Si cierre anterior difiere de apertura siguiente: aviso/conciliación, no relleno.
- R3: Presupuestos 'Gasto real' ejecutado por Gastos y Partida; 'Aportación a saldo' por Transferencias de financiación elegibles; 'No aplica' sin comparable. No sumar una provisión y su gasto como doble ejecutado. Una devolución NUEVA exigirá política expresa para neteo presupuestario; no cambiar las sumas actuales por intuición.
- SPEC12 vigente: Gasto bruto registrado en S = ingresos - Gasto bruto - Amortización extraordinaria, con etiqueta PARCIAL, y E3/FIN_NETA no integrados. No introducir la devolución como Ingreso ordinario para cuadrar S; bruto y reembolso deben exponerse separadamente hasta contrato de neto aprobado. Los netos de Compartidos tampoco deben descontarse dos veces. Plan anual: conserva ejercicio natural y Partida; no reestructurarlo.
- SPEC16 usa Revisión Comida auxiliar y fecha propia como fuente temporal; convertirla en vista requiere ajustar esa fuente y cobertura sin duplicar fechas, no cambiar el maestro Ciclos. E3.5/FIN_NETA exactos NO disponen de spec/runtime integrado en main; solo se puede conservar semántica documentada R4, no fórmulas exactas no verificadas. No usar DEV18 detenido.

Decisiones para el usuario: (i) nuevo tipo/subtipo de devolución, reglas y atribución sin compra/Partida; (ii) A/B/C para operación con Partida desconocida; (iii) fecha C, evidencia bancaria B y cobertura/solapes; (iv) régimen con ID ING Comida conservado vs sucesor si A resulta inviable; (v) neteo de devolución en ejecutados y tratamiento de informes mixtos. Recomendaciones no son autorizaciones.
Riesgos bloqueantes: doble reconocimiento, falsa posición, falta de evidencia, netos de distinto régimen presentados como homogéneos y reanudación indebida de DEV18. Siguiente acción: Codex presenta matriz de decisiones y especificación candidata para aprobación, sin tocar datos ni iniciar cambios materiales.
Fin HANDOFF → CODEX.
