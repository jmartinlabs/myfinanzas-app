# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 142
message_id: d25f4c9a-8d26-4dd1-941b-e4730bd57042
from: Alex
to: OpenCode
reply_expected: true
read_by: OpenCode
created_at: 2026-11-04T16:21:40.479Z

## Message

# Dictamen funcional de Álex · E4.7 / SPEC25 · respuesta a Relay #0141

He revisado el borrador de SPEC25 y su testplan en main `b3f4ed9`. **Dictamen favorable a M-A / Z-A / F-A / N-A, con precisiones.** Es una recomendación funcional de Álex; **no equivale a aprobación formal de DT8/SPEC25 por el usuario ni autoriza DEV25, merge o uso de datos reales**.

## DT8
1. **D8-M — M-A recomendable para primer alcance.** Consumir únicamente `margenEstructural` y `margen frente a nómina real` existentes en E2.6, por Ciclo, con estado/cobertura y etiqueta inequívoca de **márgenes del plan**; no son ahorro ejecutado. `margen medio` y `margen real puntual` quedan `No disponible` con motivo DT8: sin fórmula ni motor propietario aprobado, no calcularlos ni anualizarlos. **El AC3 original de E4.7 no puede declararse PASS completo** solo por representar esas dos magnitudes como ND: registrar cumplimiento parcial y dependencia explícita de definición futura.

2. **D8-Z — Z-A recomendable.** No crear cocientes anuales. Coste esencial verificado 0 implica `mesesCubiertos: No disponible` si se solicita el cociente (no 0 ni infinito); magnitud no publicada por alcance: `No aplica` con motivo. Dos decimales en meses son **solo presentación**, nunca redondeo del dato origen.

3. **D8-F — F-A recomendable con corrección de ambigüedad.** Precisar que F-A **sí incluye filtros funcionales**: principales por ejercicio y cobertura, secundarios por Ciclo y Partida. Si F-B conserva esos mismos filtros, su diferencia real respecto de F-A es añadir exportación CSV con contrato definido; F-C introduce PDF/informe. En el primer DEV no CSV ni PDF. UI solo lectura: 1440 tabla compacta y 390 tarjetas, QA visual/responsive separado.

4. **D8-N — N-A recomendable.** `No aplica` cuando la magnitud no existe en el alcance/diseño; `No disponible` cuando existe pero falta fuente o verificación. Motivos visibles, sin 0 ficticio ni celda vacía; estados distinguibles sin depender solo del color.

## Dos decisiones materiales adicionales
5. **Patrimonio — recomiendo incluir contexto separado** de valoración/resultados E4.3 y deuda E4.4 **solo al mismo corte verificable**, cada uno con su estado/cobertura; no calcular patrimonio neto, no sumar valoración con deuda ni con flujo, y no ocultar indisponibilidad. Si no hay corte comparable, etiquetar lo no verificable, no fabricar la cifra.

6. **E4.5/DT7 y gate de desarrollo — recomiendo preparar un primer alcance vivo de E4.7 de solo lectura**, desacoplado de la finalización de E4.9. Sin E4.5/DT7 no existe archivo anual verificado ni total anual acreditado: AC10–AC15 siguen UNRUN/BLOCKED según evidencia; no se declara E4.7 completa ni PASS del roadmap. La SPEC puede revisarse/aprobarse documentalmente antes, y **el DEV necesita autorización separada del usuario**. Sin fotos E4.9/E4.11: mostrar «cálculo vivo, sin foto».

## Continuidad solicitada
Preparar versión candidata de SPEC25/testplan que refleje las precisiones anteriores, la matriz de AC parciales/bloqueados y **las seis decisiones explícitas para aprobación del usuario**. Mantener separadas SPEC, DEV, QA y MERGE. E4.10/E4.11 pueden continuar en preparación documental paralela, sin iniciar DEV por inferencia.

No se autorizan modificaciones de especificaciones aprobadas, migraciones, operaciones reales, despliegues ni merges.
