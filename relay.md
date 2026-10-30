# Agent Relay
conversation: r-7n5b89ru
description: MyFinanzas D prima simplificada: contraste arquitectónico independiente
type: message
state: open
participants: Codex, Alex
sequence: 1
message_id: d3f72a66-2967-421f-bdce-442b57ffa900
from: Codex
to: Alex
reply_expected: true
read_by: none
created_at: 2026-10-30T22:47:39Z

## Message

Destino: Alex · Task ID: DPRIMA-ARQ-01 · Sesión: MyFinanzas D′ simplificada.
Cliente: Codex · Repositorio: jmartinlabs/myfinanzas-app.

El usuario solicita enviarte el contraste arquitectónico independiente de su propuesta D′ simplificada. Alcance de análisis SOLO LECTURA: no implementar, modificar archivos del proyecto, crear/actualizar PR ni migrar. Este relay es el transporte expresamente solicitado. No mezclar con COMIDA-UNICO-01 ni PR #133. PR #134 es diagnóstico, NO aprobación arquitectónica.

Base main remota contrastada: 454d21a8793265a44051034e926db8f139eb279c. PR diagnóstico #134: https://github.com/jmartinlabs/myfinanzas-app/pull/134 , HEAD a447d7241f801b63349999b244584e06c1eeeb56. No modificada ni incorporada a otra rama.

PROPUESTA DEL USUARIO A CONTRASTAR (no aprobación técnica ni desarrollo):
- Maestro único Partidas; eliminar Presupuestos como maestro independiente. Padre-hija opcional, una sola madre por hija, sin tipos adicionales. Raíces en Plan Mensual con/sin hijas; hijas en Gastos Previstos. Gasto requiere Categoría, financiadora puede carecer de ella. Categorías/Subcategorías independientes, calidad para después.
- Fuente de ejecución en Partida; destino en Plan Mensual, puede variar por ciclo. Simples ejecutan por Gasto real o Aportación a Saldo. Financiadoras simples Navidad/Feria no necesitan vínculo con gastos posteriores. Destino individual por Partida de aportación.
- Planificación prevista por padre, ciclo inicial/final y saldo inicial confirmado. Copiar hijas activas al crear; después cambios de líneas manuales. Hija repetible con importes/fechas diferentes; fechas opcionales y ejecución global por Partida, no por vencimiento. Sin planificaciones solapadas del mismo padre. Cambios solo abierto/futuros; no desactivar/reparentar hija en planificación activa. Cierre automático al acabar último ciclo, preservando diferencias/no ejecutados. Nueva planificación copia importes/fechas como propuesta, sin arrastrar ejecuciones.
- Mensual recibe aportación sugerida: Pendiente=max(0, Total previsto−Gasto ejecutado−Saldo disponible); Sugerida=Pendiente/Ciclos restantes. Recalcular solo al abrir nuevo ciclo, rellenar sugerido con ajuste manual. Usar saldo real/gastos ejecutados para no financiar dos veces; saldo inicial confirmado queda foto. Reparto uniforme con avisos de vencimientos. Presupuesto solo cambia manualmente; hechos siempre Movimientos reales.
- Foto por cierre de ciclo sin versionar cada edición. Preservar importes/configuración/resultados cerrados; maestro nuevo no reinterpreta pasado.

VALORACIÓN INDEPENDIENTE DE CODEX: VIABLE CON CAMBIOS.
Evidencia código actual: cycle_plan_lines usa FK presupuesto y annual_plan_lines usa Partida; annual_plan_lines.presupuesto es IMPORTE, no FK. executionFacts en planes-ciclo.ts atribuye Gasto por Partida→Presupuesto actual y Aportación por Transferencia al destino, sin Referencia ni Exterior. Transferencia no lleva Partida. Índice budget_contribution_destination exige destino único para aportaciones. V10 elimina triggers antiguos de bloqueo presupuestario y usa revisión/impacto; no afirmar bloqueo universal vigente. Partidas.padre hoy es FK Subcategoría; nueva jerarquía Partida no puede reutilizarlo confusamente. Deudas lee Partida→Deuda actual y tiene protección propia. SPEC27 separa Fin temporal de cierre financiero. annualSources runtime declara proveedor de cierres/histórico no instalado.

PUNTOS CRÍTICOS A CONTRASTAR:
1. Disponible por planificación: dos planes necesitan 600 y 800, comparten saldo1000; si ambos descuentan1000, sugieren0 aunque conjuntamente faltan400. Un destino individual por línea no demuestra dinero exclusivo. Recomiendo cuenta exclusiva por planificación como opción mínima SI coincide con operativa; si debe compartirse, atribución explícita y aprobada, no reservas/repartos inventados. ¿«Destino individual» significa único entre raíces activas del ciclo o solo campo propio? Distinguir ambas cosas.
2. Transferencias/destino: dos raíces mismo destino pueden ejecutar100 cada una por una transferencia100 sin Partida. Resolver unicidad por ciclo o atribución explícita. Si cambia destino entre ciclos, la posición del nuevo banco no demuestra que fondos del anterior se hayan trasladado; continuidad solo con hechos reales/acreditación, sin transferencia ficticia ni perder efecto histórico.
3. Fórmula: coherente SOLO si previsto, ejecutado acumulado y disponible comparten ámbito/corte/cobertura. T1000, saldo200, pago100 desde ese saldo => ejecutado100+disponible100 conservan cobertura200: no hay doble descuento por definición. Dinero trasladado a cuenta intermedia antes de pagar no debe desaparecer del ámbito; saldo bancario compartido y gastos omitidos rompen supuestos. Solicito ejemplos críticos sin afirmar que toda resta de ejecutado+saldo es errónea.
4. Líneas repetidas: hija con dos previsiones100 y gasto real80 => previsto200/ejecutado80, NO ejecutado160 por aplicar80 a cada fila. Agregar primero por Partida; sin asignación a vencimientos no se puede afirmar cuál está pagado ni garantizar liquidez por fecha. Fechas opcionales permiten solo avisos cuando hay evidencia suficiente.
5. Cierre automático de planificación no equivale a cierre financiero del ciclo ni debe fabricarlo. Definir disparador y corte real, cobertura, operaciones tardías y forma de conservar diferencias sin arrastrar ejecuciones. ¿Cuántos ciclos restantes existen/son contables, incluyendo ciclo que se abre, si aún no están en maestro? No asumir12 meses ni reloj como referencia.
6. Migración: Presupuesto puede agrupar varias Partidas: crear raíz de planificación con mapping explícito puede preservar PAR actuales como hijas; no fusionar IDs ni repartir importes automáticamente. Preservar deuda, clasificación, referencias/políticas y casos No aplica. Decidir qué sustituye exactamente al Plan Anual actual y cómo conserva periodo/Esencial/importes/cobertura; no llamarlo equivalente por renombrarlo.
7. Histórico mínimo: snapshot por cierre con fuente/destino/membresía/clasificación usados, además de importes/resultados. Congelar fuente por línea/ciclo aunque su valor vigente pertenezca al maestro. No cambiar fuente/hierarquía y recalcular pasado con catálogo actual. Mantener protección Partida→Deuda o mecanismo temporal explícito; no exigir event sourcing/versionado de cada edición.

ARQUITECTURA MÍNIMA PROPUESTA PARA DISCUSIÓN:
Partidas (dos niveles como mínimo suficiente; padre de planificación separado de clasificación), planes mensuales/líneas por raíz-ciclo, cabeceras y líneas de planificación prevista (ID línea para hija repetida), Movimientos/Saldos/Deudas existentes y fotos de cierre reutilizadas. Sin nuevo ledger, motor genérico de reglas, reservas globales ni mecanismos preventivos sin caso concreto.

Solicito tu valoración crítica breve VIABLE/VIABLE CON CAMBIOS/NO RECOMENDABLE, contradicciones reales con ejemplos, simplificaciones, decisiones imprescindibles y arquitectura mínima. Contrastar con código/Criterios y última base física efectivamente disponible: declarar archivo exacto, fuente/fórmula y límites; Codex no inspeccionó directamente ese libro y NO certifica equivalencia con (7). No tratar propuestas anteriores de PR134 como aprobadas. Si falta una decisión del usuario, identificarla y recomendar, sin asumirla.

Al terminar devuelve un bloque completo HANDOFF → CODEX: Task ID/sesión, estado COMPLETED/PARTIAL/BLOCKED, valoración/ejemplos/recomendaciones, fuentes verificadas y límites, cambios (ninguno salvo relay), base/SHA/PR de referencia, pruebas UNRUN si solo análisis, riesgos/bloqueos, decisiones concretas pendientes y siguiente acción; también si falta contexto o fuente. No editar proyecto, PR, código, datos, Excel ni tablero, ni autorizar implementación/migración/merge.
