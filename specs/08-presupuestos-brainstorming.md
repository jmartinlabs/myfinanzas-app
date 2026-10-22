# 08 — E2.2 Presupuestos: Brainstorming

Status: DRAFT — revisión financiera favorable y decisiones consolidadas; aprobación documental final en PR pendiente. Fecha: 2026-10-22 (Europe/Madrid).
Autorización inicial histórica: especificación E2.2 sin código/SQL/pruebas/commits/PR. La ronda3 autoriza posteriormente consolidación y PR documental; contenido completo/wireframes pendientes de aprobación, sin permiso de desarrollo ni merge.

## Contexto y dependencias comprobadas

Roadmap aprobado, E2.2: mantener Presupuestos y vincular opcionalmente Partidas; depende de E1.1/E1.2/E1.6, integradas (PR7/11/34; base local c04dc07 contiene las tres). No exige E2.1. Puede especificarse sobre el núcleo integrado sin incorporar dev07, schema8 ni sus worktrees. E2.3 sí depende de E2.1/E2.2 y alberga plan mensual/ejecutado. La independencia funcional NO demuestra resuelta la incidencia SQLite ni exime una futura implementación de regresión global.

Fuentes: [roadmap](roadmap.md#e22--presupuestos-y-sus-fuentes-de-ejecución), [referencia R1/R3/P3](functional-reference-v5.11.md), [contrato E1.2](02-clasificacion-specification.md#presupuestos-y-deudas), [Deuda E1.6](06-deuda-specification.md), guidelines architecture/ui/quality/security. Se revisaron contratos existentes y las reservas del selector Presupuestos en Clasificación; no se ejecutaron comprobaciones ni se modificó producto.

Referencia financiera v5.11(7) candidata, no estable. No se inspeccionó Excel físico ni se importaron datos. AC23 sigue BLOQUEADO, E2.1 sin aceptación global; AC23-SQLITE es incidencia separada con investigación cerrada inconclusa. Cierre/evidencias registrados en una copia documental aislada y archivos privados de recuperación de la sesión de diagnóstico; no se afirma que estén integrados en main. Dev32/PR30/AC22 y otras tareas pausadas permanecen así.

## Registro inicial reutilizado — histórico, sujeto a precisiones de ronda2

- PRExxx inmutable/no reutilizable; nombres editables no son claves.
- Fuentes exactamente Gasto real, Aportación a saldo, No aplica; sin Devolución anticipo.
- Destino obligatorio SIEMPRE, incluido Gasto real y No aplica (P3).
- Partida tiene0..1 Presupuesto y0..1 Deuda independientes; Gasto sin Presupuesto válido.
- Imputación de Gasto por Partida, nunca por el Saldo destino del Presupuesto.
- Saldo compartido no es reserva exclusiva ni existe reparto inventado.
- Base/Esencial/Del mes pertenecen al plan mensual; no son atributos del maestro.
- Cuota ordinaria: Gasto íntegro; amortización extraordinaria no ejecuta presupuesto.
- Las fórmulas R3 de ejecución y estados pertenecen al motor futuro E2.3; no se simulan aquí.
- Reutilizar identidad visual clara, sesión MFA, revisión/idempotencia/auditoría y continuidad; no cambiar arquitectura ni apertura SQLite por esta especificación.

## Ronda1 — propuestas originales, NO respuestas; historial conservado

Las propuestas y pendientes de esta ronda se conservan para trazabilidad. Ronda2 prevalece: destino en No aplica y duplicados de nombres de la propuesta inicial quedan expresamente sustituidos.

### Q1 — Elegibilidad del Saldo destino
- [x] Recomendada: seleccionar Saldo interno activo existente, excluir S000/Exterior técnico; sin exigir Liquidez, Mostrar como bolsa ni un Control determinado. Conservar en lectura un destino después inactivo; no sustituirlo silenciosamente al editar nombre.
- [ ] Alternativa: otra matriz por Fuente/Tipo/Control aportada y confirmada por el usuario.
Pendiente: la fuente exige destino, pero no demuestra su matriz exhaustiva de compatibilidad. No se implementará el filtro propuesto sin aprobación.

### Q2 — Cambios de enlace Partida y configuración económica con historia
- [x] Recomendada: reutilizar el patrón de corrección histórica de Clasificación: preview completo antes/después, hechos afectados, motivo y confirmación, revisión/revalidación; sin reescribir hechos. Nueva Partida para cambiar solo a futuro; sin introducir fechas efectivas ni versionado universal. Cambiar fuente/destino con historia requiere el mismo tratamiento. Si un impacto no puede determinarse, bloquear confirmación y explicarlo.
- [ ] Alternativa conservadora: impedir cambiar vínculo/fuente/destino cuando existan hechos asociados; crear nueva Partida/Presupuesto para uso futuro, conservando los anteriores.
Pendiente: también afecta a la primera asignación o retirada de enlace sobre una Partida con historia. No aplicar retroactividad silenciosa. DT5 de cierres futuros se respeta al incorporar esos consumidores; no fingir protección de motores inexistentes.

### Q3 — Estado del maestro y nombres
- [x] Recomendada: alta Activo, desactivar/reactivar sin DELETE; inactivos consultables, no nuevas asignaciones a inactivos. Bloquear desactivación con Partidas activas vinculadas; no desactivar hijos ni desvincular en cascada. Reactivar revalida destino conforme Q1. Nombre obligatorio; duplicados de nombre generan advertencia, no rechazo: ID desambigua.
- [ ] Alternativa: el usuario concreta otra política de desactivación/dependencias o de unicidad de nombres.
Pendiente: son decisiones de app propuestas, no reglas físicas demostradas del Excel. No trasladar la unicidad SUB a Presupuestos por analogía.

### Q4 — Frontera y pantallas propuestas
- [x] Recomendada: maestro, ficha, formulario, vínculo desde Partida y revisión de cambios según Q2. Mostrar fuente/destino y explicación de derivación, sin totales Ejecutado/Pendiente/A transferir/estados mensuales ni importes base/esencial/del mes. Aprobar wireframes de specification08 como propuesta visual.
- [ ] Alternativa: solicitar otro alcance visual dentro de E2.2; cualquier motor/plan mensual requiere revisar expresamente la frontera con E2.3.
No reabre las fórmulas R3 ni el roadmap: se pide confirmar la interpretación de «consulta de derivaciones» y los nuevos flujos UI.

## Estado al cerrar ronda1 — histórico

No hay respuestas a Q1–Q4 ni aprobación de wireframes/spec08 registradas. Casillas marcadas son recomendaciones, no decisiones confirmadas. El [borrador](08-presupuestos-specification.md) distingue contratos confirmados y propuestas condicionadas. Conservar esta ronda al incorporar respuestas; no reescribir historia.

Siguiente gate: resolver Q1–Q4 y revisar la especificación completa. Sin implementación, pruebas, commits ni PR. El usuario debe autorizar por separado cualquier desarrollo y, en esta sesión, también cualquier commit/PR.


## Ronda2 — revisión financiera de Álex — 2026-10-22

Fuente: mensaje «Álex — Revisión financiera E2.2 · Presupuestos». El usuario comunica contraste físico con MyFinanzas2026_v5.11(7).xlsx, tblPresupuestos[Control] y Criterios!C64. No se afirma inspección independiente por el agente. La arquitectura general se considera válida; **NO se aprueba todavía la especificación completa**. Autorización solo para actualizar los dos borradores y presentar delta, sin dev08/commits/PR/Excel.

### Respuestas e instrucciones vigentes (sustituyen generalizaciones previas)

- Q1: fuentes exactamente Gasto real/Aportación a saldo/No aplica. Destino obligatorio en las dos primeras; vacío en No aplica. Nuevos destinos internos activos distintos de S000; sin restricciones adicionales por Liquidez, Finalidad o Control. Conservar relaciones históricas posteriormente inactivas.
- Discrepancia de fuente: Control físico todavía admite Devolución anticipo, contrario a Criterios!C64 vigente. Registrar discrepancia; no cuarta fuente, no cambio al Excel.
- Precisión P3/destinos compartidos: dos Aportaciones a saldo NO comparten destino. Otros Presupuestos, especialmente Gasto real, sí pueden compartirlo; ejecución Gasto real por Partida. La restricción se resuelve en maestro E2.2, no se difiere a un reparto E2.3. Los textos generales de roadmap/extracto anteriores no se aplican sin esta precisión.
- Q2: mantener revisión de impacto, motivo y confirmación para cambios económicos o relaciones utilizadas. Impacto histórico completo no verificable con consumidores existentes => BLOQUEO hasta disponer del motor. No inventar importes E2.3 ni autorizar cambio con preview parcial. Incluye primera asignación/retirada con historia; no mutación de hechos originales.
- Q3: IDs estables, activar/desactivar sin borrar historia, proteger Partidas activas vinculadas. Nombre obligatorio y sin duplicados conforme Control físico. Sustituye propuesta de permitir duplicados con advertencia. La comparación exacta mayúsculas/tildes/espacios no se deduce de una fórmula no transcrita; precisa confirmación/evidencia antes de aprobar ese detalle. No trasladar automáticamente regla SUB.
- Q4: solo maestro, vínculo opcional Partida→Presupuesto, interfaces y validaciones. E2.3 conserva planificación/Base/Esencial/Del mes/ejecución/pendientes/estados mensuales. Sin motores anticipados ni importes ficticios. Los wireframes adaptados siguen sujetos a aprobación documental final.

### Trazabilidad y criterio de continuación

Specification08 actualizada con matriz fuente/destino, validación de destino único entre Aportaciones, historia bloqueada sin motor, nombre obligatorio/único, pantallas y criterios correspondientes. AC-01–AC-22 conservan IDs, actualizando expectativas incompatibles; AC-23/24 nuevos cubren colisión Aportación y cambios de fuente. F-01/F-02 siguen futuros. Ninguno ejecutado ni PASS declarado. AC-23 de spec08 es distinto de AC23 bloqueado de E2.1.

No se modifican roadmap, referencia sanitizada ni Excel: este registro documenta la precisión posterior y su precedencia para E2.2. No se aceptan datos que contradigan la matriz para simular compatibilidad con la fórmula obsoleta. Aprobar documento completo requerirá reconocer estas precisiones.

E2.2 avanza documentalmente independiente de E2.1. AC23/spec07 BLOQUEADO, E2.1 sin aceptación global, AC23-SQLITE separado/inconcluso y Dev32/otras líneas pausadas intactos. Siguiente gate: resumen exacto para aprobación documental; sin dev08, commit, publicación ni PR.


## Ronda3 — cierre de decisiones y autorización de PR — 2026-10-22

Fuente: mensaje «Álex — Cierre de decisiones E2.2 · Presupuestos». Revisión financiera favorable; última reserva resuelta tras contraste directo de tblPresupuestos[Control] comunicado por el usuario. No inspección independiente del Excel por el agente. Esta instrucción posterior autoriza consolidación documental y preparación de PR, sustituyendo prohibiciones de commit/publicación/PR de las rondas anteriores únicamente para esta entrega documental. No autoriza integración ni dev08/E2.3/Excel.

Contrato definitivo de nombres: obligatorio y único globalmente, incluidos Presupuestos inactivos; sin distinguir mayúsculas, conservando tildes, espacios y caracteres Unicode sin normalizaciones adicionales. * y ? como literales. Reutilizar el criterio ya aprobado e implementado de Subcategorías; unicidad atómica en altas/ediciones y operaciones concurrentes. ID técnico estable, independiente del texto. COUNTIF físico sin normalización explícita no equivale exactamente a este contrato: literalidad de comodines es decisión de aplicación.

Se mantienen íntegros los cuatro ajustes financieros de ronda2, los24 criterios operativos (nombres concretados en AC-12/AC-17) y F-01/F-02 futuros. Ningún criterio ejecutado/PASS. Sin más rondas de preguntas financieras; aprobación documental del contenido completo y wireframes pendiente de revisar la PR. Alta Activo y detalles UI quedan dentro de esa revisión completa, no como nuevas preguntas financieras.

Estado independiente intacto: AC23/spec07 BLOQUEADO, E2.1 sin aceptación global; AC23-SQLITE separado con investigación cerrada inconclusa; Dev32 y otras tareas pausadas sin reanudar. Publicar solo los dos documentos08, sin bases/evidencias privadas/scripts ni cambios funcionales. Después de crear/verificar PR, detenerse sin merge ni implementación.
