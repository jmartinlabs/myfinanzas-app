# 10 — E2.4 Plan anual por Partida y ejercicio: Brainstorming

Estado: APPROVED — Q1–Q6, especificación completa rev2 y wireframes aprobados.
Solicitud: usuario «Sigue con spec10», 2026-10-24. Base main `5c3e49b` (piloto PR59).
Rama: codex/spec10-plan-anual. Próximo paso: PR documental; merge y desarrollo requieren autorizaciones separadas.
Contexto: [roadmap E2.4](roadmap.md#e24--plan-anual-por-partida-y-ejercicio),
[R3](functional-reference-v5.11.md#r3--planificación-ciclos-y-nómina),
[clasificación](02-clasificacion-specification.md), [plan del ciclo](09-plan-ciclo-specification.md).

## Decisiones vigentes reutilizadas

Fuente: roadmap aprobado y referencia funcional v5.11(7) candidata, no inspección
independiente del Excel físico. No se reabren estos puntos:

- Plan por Partida y ejercicio natural; una línea por ID de Partida/ejercicio.
  Nombres editables no son claves. No convertir ejercicios en ciclos financiados.
- Periodo previsto informativo: no cambia la fecha de un hecho ni gobierna la ejecución.
- Ejecución por Gastos reales del ejercicio; excluir amortización extraordinaria.
  Transferencias de financiación no se convierten en Gastos ejecutados.
- Histórico transitorio únicamente cuando sea válido y sin duplicar hechos; cobertura
  histórica completa en E4.5/E4.7. No presentar histórico ausente como cero comprobado.
- Las Partidas esenciales contribuyen al coste esencial mensual según regla vigente;
  la referencia no explicita su fórmula ni permite deducirla de Periodo previsto.
- No universalizar regularizaciones específicas de2026. No copiar los significados
  de Base/Esencial/Del mes del plan del ciclo a otro plan por analogía.
- Preservar arquitectura, seguridad, precisión monetaria, IDs y revisión de concurrencia.
  Ninguna nueva tabla, API, migración, importación, modificación de Excel o despliegue
  queda autorizada por preparar esta especificación.

## Ronda1 — 2026-10-24

Las casillas marcan propuestas para revisar, nunca respuestas del usuario.

### Q1 — Entradas y edición de la línea anual

¿Qué importes editables contiene cada línea del plan anual y cuáles son sus nombres
y significados? ¿Se permite crear/editar el plan manualmente en esta entrega?

- [x] Propuesta mínima: alta/edición explícitas de un importe anual planificado por
  Partida/ejercicio; vacío y cero distintos, sin negativos ni relleno automático.
  No añadir Base/Esencial/Del mes al anual sin regla confirmada.
- [ ] Solo consulta en E2.4 o varios importes anuales: indicar el alcance/campos reales.

Respuesta confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.

### Q2 — Dominio de Periodo previsto

¿Qué valores permite el sistema vigente y se admite vacío? La naturaleza informativa
está confirmada; falta su dominio y si representa uno o varios periodos.

- [x] Contrastar valores y cardinalidad vigentes antes de proponer el control UX;
  no imponer meses, fechas, frecuencias ni prorrateos por inferencia.
- [ ] Cambiar el dominio para la app mediante una decisión explícita del usuario.

Respuesta confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.

### Q3 — Esenciales y coste esencial mensual

¿Qué dato identifica una Partida esencial y cuál es la fórmula vigente de su
contribución mensual? Indicar origen del importe, condiciones/exclusiones y tratamiento
de vacío/cero. No se da por supuesto anual/12 ni que Esencial del ciclo sea esa fuente.

- [x] Recibir regla/fórmula sanitizada o explicación funcional de Álex, sin cifras
  personales, y reflejarla antes de definir cálculo y criterios de aceptación.
- [ ] Definir una regla nueva para la app, separada de una equivalencia con Excel.

Respuesta confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.

## Cobertura documental pendiente

Tras Q1–Q3: decidir únicamente lo no resuelto sobre inicio/copia entre ejercicios,
edición histórica, Partidas inactivas, corte/cobertura verificable del ejercicio y
Gastos sin línea. Reutilizar contratos técnicos ordinarios; no dar por aprobadas
reglas del plan del ciclo para el plan anual. Trazar E2.4-AC1–3 a AC estables.
Diseñar lectura/alta/edición, estados vacío/carga/error/reintento/conflicto y contratos
API/persistencia como propuesta documental, con fechas/precisión/contexto revalidados.

## Wireframes

PENDIENTES de Q1–Q3 para evitar fijar columnas y controles sin semántica confirmada.
Se propondrá selector de ejercicio y tabla/tarjetas coherentes con la UI vigente,
con cobertura visible y estados sin datos diferenciados. Requieren feedback propio.

## Piloto de eficiencia — hito inicial

[Reglas del piloto](methodology/myfinanzas-coordination.md#piloto-de-eficiencia--spec10--e24).
Mismo checkout limpio de partida; Python3.12/Bun1.4.3 disponibles. Sin instalaciones,
subagentes, suites funcionales ni CI relanzados para abrir esta ronda documental.
Lectura de fuentes aplicables; controles de estructura/enlaces y whitespace únicamente.
Tokens y bloqueos se cortan por hito en el tablero; este borrador no acredita ahorro,
QA independiente, aceptación, aprobación de wireframes ni especificación completa.

## Aclaraciones append-only

Añadir respuestas con su fuente/fecha y posteriores rondas sin reescribir Q1–Q3.

## Respuestas confirmadas Q1–Q3 — 2026-10-24

Fuente: mensaje real «Spec10 — Decisiones funcionales de Álex para E2.4 Plan anual».
El usuario atribuye el contraste a Álex sobre v5.11(7) y sus Criterios; Codex no ha
inspeccionado independientemente el libro ni importa datos reales. Este registro
resuelve los PENDIENTE históricos de ronda1, sin reescribir las preguntas originales.

- Q1: línea única por ID de Partida/ejercicio natural. Un importe manual editable
  Presupuesto (€), vacío distinto de cero, sin negativos. Sin copia/cálculo automático
  desde año anterior o Ejecutado; no reconstruir mensualmente. No importe esencial
  anual independiente. Ejecutado, Diferencia y Fecha ejecutada son derivados.
  Campos transitorios2026 pertenecen al contrato de histórico/migración.
- Q2: Periodo previsto texto flexible opcional/editable, uno o varios meses/periodos
  (p. ej. Mayo - Octubre, Julio - Agosto), sin lista cerrada ni varias filas anuales.
  No atribuye Movimientos, no calcula ejecución ni impone fechas; no motor periódico.
- Q3: Esencial manual por línea: Sí/No/Pendiente. Solo Sí entra en la suma; No y
  Pendiente excluidos, sin convertir Pendiente a No. Equivalente esencial mensual
  anual = SUMA(Presupuesto anual con Esencial=Sí)/12. Fórmula física atribuida:
  `=SUMIFS(tblAnual2026[Presupuesto (€)],tblAnual2026[Esencial],"Sí")/12`.
  No redondear contribuciones individuales. Esencial=Sí con presupuesto vacío conserva
  no informado, nunca decisión de cero. El equivalente alimenta el Importe esencial
  mensual de Gastos anuales; el coste global suma importes esenciales mensuales y no
  vuelve a añadir el anual. No autoriza sobrescribir automáticamente el plan del ciclo.

Alcance: elaboración documental; no desarrollo, SQL, Excel ni merge.
Especificación/wireframes propuestos: [spec10](10-plan-anual-specification.md).

## Ronda2 — pendientes nuevos, sin reabrir Q1–Q3

### Q4 — Semántica de los derivados

¿Qué signo tiene Diferencia y qué representa Fecha ejecutada si hay varios Gastos?
- [x] Propuesta: Diferencia=Presupuesto−Ejecutado; Fecha ejecutada=última fecha real
  de Gasto elegible del ejercicio. Sin Presupuesto no calcular Diferencia; sin hechos
  no inventar fecha. Regla propuesta, no atribuida al Excel sin confirmación.
- [ ] Otra fórmula/signo o fecha (primera fecha, otra condición): indicar la vigente.
Respuesta confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.

### Q5 — Presentación del agregado esencial incompleto

La fórmula y la ausencia individual están resueltas; falta cómo presentar el total
si existe alguna línea Esencial=Sí con Presupuesto vacío.
- [x] Propuesta: equivalente total «Incompleto», sin importe total cerrado; mostrar
  aparte subtotal conocido/12 claramente parcial y número de importes sin informar.
  El consumidor global conserva la advertencia, sin asumir que falta=0.
- [ ] Mostrar solo «Incompleto» sin subtotal numérico parcial.
Respuesta confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.

### Q6 — Edición histórica y Partidas inactivas

Estas reglas del plan del ciclo no se trasladan automáticamente al anual.
- [x] Propuesta: conservar/mostrar líneas de Partidas inactivas, sin nuevas líneas
  para inactivas. Editar ejercicios pasados solo sin cierre financiero, con preview
  de impacto, motivo y confirmación; fin de año no implica cierre. Sin reescribir hechos.
- [ ] Otra política anual: indicar límites de edición y tratamiento de inactivos.
Respuesta confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.

## Hito documental2

[Spec10](10-plan-anual-specification.md) desarrolla contratos y wireframes provisionales,
con Q4–Q6 explícitas. R3/R6 revisadas; aporte anual y coste global separados. Sin suites
funcionales ni desarrollo. No se presenta esta revisión como aprobación completa.

## Respuestas confirmadas Q4–Q6 — 2026-10-24

Fuente: mensaje real «Spec10 — Resolución Q4–Q6 por Álex». Contraste físico atribuido
a Álex sobre tblAnual2026/Criterios T5.n, no inspección independiente de Codex.
Este bloque resuelve los PENDIENTE históricos de ronda2, conservando su redacción.

- Q4: Diferencia=ROUND(Presupuesto−Ejecutado,2). Sin Presupuesto, vacía; con Ejecutado0
  verificado, Diferencia=Presupuesto. Cobertura no verificable impide resultado definitivo.
  Fecha ejecutada=máxima fecha conocida entre Fecha histórica y Gastos elegibles de
  la Partida en ejercicio natural/periodo de control. Preservar histórico válido sin
  duplicarlo con Movimientos. Sin fecha conocida, vacía; no inferirla del importe.
  Amortizaciones extraordinarias no son Gasto ejecutado.
- Q5: total esencial mensual anual «Incompleto» si hay líneas Sí sin importe; subtotal
  conocido «Parcial» con contador de importes pendientes. No generar un objetivo de
  liquidez definitivo con el parcial. Vacío≠0. Esencial Pendiente excluido y señalado
  como clasificación sin resolver. La fórmula suma anual/12 no cambia.
- Q6: conservar líneas históricas de Partidas inactivas; no nuevas líneas para inactivas.
  Editar planes pasados solo sin protección financiera aplicable y con impacto, motivo
  y confirmación. Revalidar cierres/fotografías, incluidos ciclos cerrados dentro del
  ejercicio aunque no haya cierre anual. Preservar IDs, relaciones y fotos inmutables;
  no reescribir Gastos ni fabricar históricos.

No hay nuevas preguntas funcionales abiertas Q1–Q6. Rev2 incorpora estas precisiones;
la aprobación parcial no aprueba automáticamente el documento completo ni wireframes,
SQL, desarrollo, migraciones, Excel o merge.

## Aprobación completa rev2 y wireframes — 2026-10-24

Solicitud inmediatamente anterior: «¿Apruebas la especificación completa rev2 y sus
wireframes?». Respuesta real del usuario: «Aprobadas». Objeto único e inequívoco:
spec10 rev2 completa y sus wireframes, no desarrollo ni merge.
Candidato aprobado SHA256 previo al cambio administrativo de estado:
`d38a51e2c2e563e02819aed8cd4d49c132ec494c0f5397e5966b8abd853a1b95`.
QA documental independiente SPEC10-DOC-QA PASS sin hallazgos bloqueantes.
Se cambian estado y fuente de aprobación; contratos financieros y diseños intactos.
Los PENDIENTE históricos anteriores quedan resueltos por Q1–Q6 y esta aprobación.
Siguiente paso: controles documentales, commit y PR. Sin desarrollo, SQL, migraciones,
Excel, despliegue, merge ni reanudación B3/Dev32.34 AC futuros, no pruebas funcionales PASS.
