# Agent Relay
conversation: r-k9ubk684
description: Refactor Comida: registro único, devoluciones y transición histórica
type: message
state: open
participants: Codex, Alex
sequence: 1
message_id: d4d28a40-74e6-4dc8-9b88-845681ae03ea
from: Codex
to: Alex
reply_expected: true
read_by: none
created_at: 2026-10-30T07:53:28Z

## Message

Destination: Alex · Task ID: COMIDA-UNICO-01 · Session: Refactor Comida y registro único
Client: Codex. Repository: jmartinlabs/myfinanzas-app. PR de esta tarea: ninguna.

Consulta financiera y funcional; no es delegación de implementación ni aprobación.
El usuario encarga analizar, especificar, implementar y validar un registro único de gastos de Comida. Autoriza consultar a Álex. Conserva Saldos, Movimientos, Partidas, ambos Presupuestos y Ciclos. Excluye Pockets, reservas globales, rediseño presupuestario, extensión a Ocio/Niños, datos reales y merge sin aprobación. Toda decisión material se presenta al usuario antes de implementar.

Base verificada: origin/main 454d21a8793265a44051034e926db8f139eb279c, esquema v18. PR abiertas #50/#51 (anteriores) y #131/#132 (auditorías propuestas, no specs aprobadas). No se reanudan DEV18 ni su candidato local; E3.5/FIN_NETA no están integrados. SPEC16 AC25 físico sigue pendiente; no se ha inspeccionado Excel.

Evidencia actual:
- apps/api/src/revision-comida-schema.ts y revision-comida-ledger.ts: auxiliar con fecha, importe, dirección, clasificación y vínculos propios; no tiene efecto central. SPEC16 permite Sin vínculo y vínculo a Gasto agregado terminal, sin conciliación de importes.
- movement-ledger.ts: posición = apertura + entradas - salidas de TODOS los movimientos vigentes; sin filtro de fecha de apertura. saldos.ts: Terminal no tiene posición y HISTORY_LOCKED protege cambios de control/apertura con uso histórico. Cambiar solo Control sería incorrecto.
- Movimientos admite Ingreso, Gasto, Transferencia y Amortización deuda con importe positivo. SPEC04 excluye negativos, ingreso artificial y falsa anulación para devoluciones reales. Falta contrato operativo de devolución de compra.
- SPEC05: financiación interna por transferencia no genera Gasto. No hay que asumir que el código convierte automáticamente toda financiación en gasto agregado; el agregado es otro hecho registrado.
- planes-ciclo.ts executionFacts: Gasto real suma Gastos por Partida; Aportación a saldo suma Transferencias al destino. flujo-mensual.ts presenta Gasto bruto y netos Comida No disponible.
- Ciclos es el único maestro temporal; SPEC07 deriva impactos de ambas fuentes. SPEC20 histórico, SPEC21 conciliación transversal y SPEC26/27 precierre/fotos son contratos documentales; no se deben presentar como runtime disponible.

Solicito recomendación y consecuencias sobre estas alternativas, sin decidir por el usuario:
1. Devoluciones: recomiendo operación explícita de devolución de gasto en Movimientos, importe positivo, entrada bancaria y reducción del gasto; justificar si requiere nuevo tipo o subtipo compatible, Partida y relación con compra. Comparar con ampliar Gasto para reversión explícita; descartar Ingreso artificial y anulación de compra real. Precisar devoluciones parciales/múltiples, sin compra detallada, de compra anterior al corte, cambio de cuenta/Partida, exceso y cruce de ciclos. Indicar qué decisiones debe aprobar el usuario.
2. Transición: recomiendo corte en Inicio de un ciclo financiado, preservando hechos agregados y auxiliar anterior sin convertirlos automáticamente en gastos individuales. Alternativa: conversión retrospectiva solo con cobertura completa demostrable (más riesgo, no recomendada). Precisar tratamiento de agregados que atraviesen el corte, operaciones tardías/rectificaciones y criterios para bloquear mezcla. No inventar fecha ni saldo reales.
3. Posición ING Comida: comparar apertura contextual por corte con preservación de ID frente a nueva cuenta sucesora con trazabilidad. Recomiendo evaluar preservar ID con un régimen explícito fechado, apertura acreditada y cálculo desde corte; requiere cambio de contrato y no un filtro global para otras cuentas. Diferenciar apertura bancaria de Saldo inicial comida de tblCiclos; no igualarlos ni arrastrarlos automáticamente. Precisar evidencia de cobertura completa, conciliación y reversibilidad sin borrar hechos nuevos.
4. Clasificación: distinguir Partida económica de etiquetas de revisión Comida/Ocio/Niños/Pendiente/Fuera presupuesto, evitando que una etiqueta excluya gasto real del banco o altere reglas presupuestarias. Proponer mínimo contrato de metadatos sin fecha/importe económico editable duplicado.
5. E3.5: identificar fórmulas/contratos a sustituir o mantener y consumidores FIN_NETA, Anticipos, Compartidos, reposiciones, plan mensual y Flujo. El corte no autoriza reanudar la rama DEV18 detenida. Mantener anual intacto y evitar doble descuento de devoluciones de Anticipo.

No modifiques código, specs, tablero ni rama; devuelve asesoramiento con ejemplos sintéticos y decisiones pendientes. No uses datos privados. Si falta contexto, identifica el contrato exacto requerido sin inferir reglas.
Al finalizar devuelve un bloque completo HANDOFF → CODEX: Task ID/sesión, estado COMPLETED/PARTIAL/BLOCKED, diagnóstico, alternativas/recomendación y consecuencias, archivos/contratos afectados, rama/SHA/PR o ninguno, pruebas UNRUN (consulta documental), riesgos/bloqueos, decisiones que debe tomar el usuario y siguiente acción; también si estás bloqueado.
