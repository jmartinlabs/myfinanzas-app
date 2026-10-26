# 11 — E2.5 Nómina histórica y previsión separada: Brainstorming

Estado: APPROVED — spec11 rev3 completa, relación técnica N:M y wireframes aprobados.
Solicitud: usuario «Inicia» / «Venga empieza», 2026-10-24, tras recomendar spec11/E2.5.
Base main `e1d6dba` (dev10/PR61 integrado); rama codex/spec11-nomina-prevision.
Próximo paso: PR documental; merge y desarrollo requieren autorizaciones separadas.
Contexto: [roadmap E2.5](roadmap.md#e25--nómina-histórica-y-previsión-separada),
[R3](functional-reference-v5.11.md#r3--planificación-ciclos-y-nómina),
[Movimientos](04-movimientos-specification.md), [Ciclos](07-ciclos-operacion-specification.md).

## Contratos confirmados reutilizados

Fuente: roadmap aprobado y referencia funcional v5.11(7) candidata, no inspección física
independiente del libro por Codex. Dependencias E1.4/E2.1 ya integradas.

- Conservar historia salarial/fiscal, guardias y Neto histórico cuando existen.
  Parámetros actuales no recalculan la historia ni fabrican datos ausentes.
- Nómina/Bonus son subtipos de Ingreso real; la Fecha ingreso deriva de los hechos
  bancarios elegibles. Intereses/Promoción no se fuerzan a Nómina.
- Historia salarial, hecho bancario y pronóstico son conceptos separados; no sumar
  automáticamente los tres como ingresos. Importes exactos e IDs estables.
- La previsión no crea Movimientos ni Ciclos; un Ciclo puede existir antes del cobro.
  Solo el maestro Ciclos gobierna periodos financiados; no trasladarlo a Nómina.
- No motor fiscal nuevo, nuevo calendario de ciclos ni importación financiera real.
  DT2/DT7/DT8 se concretan para preservar históricos y presentación en esta spec.
- Arquitectura, seguridad/MFA, concurrencia, borradores y controles monetarios vigentes
  se reutilizan; no autorización de SQL, desarrollo, Excel, despliegue o merge.

## Ronda1 — 2026-10-24

Casillas: recomendaciones/propuestas, nunca respuestas aprobadas del usuario.

### Q1 — Unidad del registro y campos históricos

¿La unidad es mes natural, recibo/paga individual u otra? ¿Puede haber varios registros
en el mismo mes y cómo se distingue una paga/Bonus? Indicar los campos reales que se
conservan: importes salariales/fiscales, guardias, Neto histórico y cualquier dato
necesario, con su significado manual/derivado y tratamiento de ausencia/cero/ajustes.
No se necesitan importes personales ni documentos con datos reales.

- [x] Conservar unidad y campos del sistema vigente, incluidos datos históricos no
  informados; confirmar su semántica antes de diseñar columnas/formulario.
- [ ] Diseñar un resumen diferente para la app mediante alcance y decisión explícitos.

Respuesta confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.

### Q2 — Correspondencia con cobros reales

¿Cuál es la regla vigente para asociar Ingresos Nómina/Bonus a cada registro/periodo?
¿Cómo se tratan varios ingresos, un cobro parcial, un mes sin cobro y fechas bancarias
fuera del mes salarial? ¿Qué fecha se muestra si hay varios cobros elegibles?
La existencia de cobro no debe darse por probada por un Neto histórico o una previsión.

- [x] Conservar la regla de atribución confirmada y los IDs de Movimientos; no inventar
  coincidencias por nombre/importe/Concepto ni crear hechos para cuadrar diferencias.
- [ ] Relación manual explícita como contrato de app, si el usuario elige ese alcance;
  sin cambiar fechas/tipos reales y preservando posibles relaciones anteriores.

Respuesta confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.

### Q3 — Entradas y cálculo de previsión

¿Qué se introduce y qué se calcula en el pronóstico vigente: un importe manual,
parámetros salariales/guardias/retenciones o ambos? Indicar las fórmulas existentes
que se quieran reutilizar, las variables editables y su horizonte/periodo.
¿Cómo se presenta la previsión cuando ya existe historia o cobro del mismo periodo?
No se deduce una fórmula fiscal ni se sustituye el histórico con el cálculo actual.

- [x] Previsión identificada como tal, entradas/fórmulas existentes confirmadas y
  separación visible del histórico y lo cobrado, sin escrituras a hechos/Ciclos.
- [ ] Importe previsto manual sin motor de fórmulas en esta entrega, por decisión explícita.

Respuesta confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.

## Cobertura y diseño posteriores

Tras las respuestas: completar únicamente decisiones pendientes de edición histórica,
protecciones/cobertura/migración, errores, conciliación informativa y contratos de API.
No imponer importes no negativos a ajustes/retenciones sin confirmar su semántica.
Reutilizar IDs de Movimientos/Ciclos, revisión/idempotencia y precisión; no asignar
esquema SQL o librerías nuevas durante brainstorming.
Wireframes de histórico, cobros relacionados y previsión pendientes de Q1–Q3; se
propondrán en tabla/tarjetas con estados sin datos/carga/error/borrador/conflicto.
La especificación completa y sus wireframes requerirán aprobación propia.

## Piloto de eficiencia — hito inicial

[Reglas locales](methodology/myfinanzas-coordination.md#piloto-de-eficiencia--spec10--e24)
reutilizadas como disciplina operativa, sin afirmar que spec11 sea una comparación
controlada o ampliar el experimento/cambiar plantilla. Un ejecutor, sin subagentes,
instalaciones, suites funcionales o CI para abrir la ronda. Lectura de fuentes acotadas
por tema; controles documentales proporcionales. No atribuir ahorro sin medición.

## Aclaraciones append-only

Añadir respuestas con fuente/fecha, conservando el texto de la ronda inicial.

## Respuestas confirmadas Q1–Q3 — 2026-10-24

Fuente: mensaje real «E2.5 — Nómina: decisiones funcionales Q1–Q3». Álex contrasta
hoja Nómina, tblNominaIRPF, tblNominaForecast, tblCalculosFlujoMensual y Criterios de
v5.11(7); evidencia atribuida a su revisión, no inspección física independiente de Codex.
Resuelve los PENDIENTE históricos anteriores, sin reescribir la ronda1.

- Q1: unidad nómina/paga documentada, Mes nómina y Tipo Ordinaria/Bonus; no un abono
  bancario. Conservar Mes, Tipo, Guardia, Devengo, Base IRPF, IRPF%, Variable,
  Neto histórico y Nota originales/procedencia. Retención total=Base IRPF×IRPF%
  si ambos informados. Fecha ingreso/Neto/Neto estructural/Origen neto son derivados.
  Guardia pertenece a Ordinaria salvo evidencia de paga diferenciada. Estructural
  según lógica vigente de Ordinaria, vacío en Bonus. No unicidad técnica Mes/Tipo que
  impida conservar dos pagas documentadas distintas. Nómina no gobierna Ciclos.
- Q2: verdad bancaria=Movimientos. Ingreso Nómina/Bonus por sus respectivos subtipos;
  cada abono real conserva ID/Fecha/Importe/Destino. Varios parciales son hechos
  separados, sin duplicación/fusión ficticia. Cobro fuera de mes conserva paga origen;
  ciclo por fecha bancaria y maestro Ciclos. Histórico, documentado y cobrado separados.
  Neto histórico y Movimientos no se suman dos veces como entrada real.
- Límite Excel confirmado: Fecha ingreso MINIFS mes/Subtipo, Neto por Neto histórico
  o SUMIFS del mismo mes; flujo XLOOKUP Ordinaria/SUMIFS Bonus. No hay vínculo inequívoco
  para parciales, varias pagas o cobros fuera de mes. Proponer mínimo vínculo explícito
  por IDs y evidencia, no proximidad de fechas ni otro maestro de movimientos. Sin
  evidencia, pendiente de asociación; Movimiento intacto. Estructura solo tras aprobación.
- Q3: entradas Variable prevista (€) y Ajuste IRPF esperado (pp). Referencias:
  último Devengo ordinario con fiscales suficientes, última Base IRPF ordinaria válida,
  Deducciones no IRPF de referencia y último IRPF ordinario válido.
  IRPF estimado=Último IRPF+Ajuste; Retención estimada=(Base referencia+Variable)×IRPF
  estimado; Neto estimado=(Devengo referencia+Variable)−Deducciones no IRPF−Retención.
  Escenario prudente existente es simulación, parámetros concretos no universales.
  Previsión informativa: sin Movimientos/cobros, cambios de presupuesto, apertura/cierre
  de ciclos, sobrescritura histórica/real ni conversión automática de futuro/incompleto.

Solo autorización documental: no desarrollo, SQL, Excel o merge.
Propuesta: [spec11 rev1 y wireframes](11-nomina-prevision-specification.md).

## Ronda2 — decisiones complementarias, no repetición de Q1–Q3

### Q4 — Cardinalidad mínima del vínculo explícito

Propuesta inicial: ID estable por paga; una paga admite varios Movimientos completos,
cada Movimiento vigente se asocia como máximo a una paga. No copiar importe/fecha ni
inferir vínculos. Esto cubre parciales, varias pagas separadas y cobros fuera de mes.
¿Existe un único abono bancario que deba repartirse entre varias pagas documentadas?

- [x] Relación mínima paga1:N Movimientos, asociación explícita revisada y auditable;
  abonos sin evidencia permanecen pendientes. Confirmar si cubre los casos reales.
- [ ] Si hay abonos agrupados, justificar relación N:M con importe asignado por vínculo,
  suma asignada≤importe real y resto pendiente, sin dividir el Movimiento ficticiamente.

Precisar si un abono agrupado mezcla Ordinaria/Bonus: no cambiar su Subtipo ni permitir
vínculos incompatibles silenciosamente. Sin esa evidencia no se cierra cardinalidad.
Respuesta confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.

### Q5 — Derivados salariales y referencias «últimas»

Aportar la fórmula vigente de Neto estructural Ordinaria, Deducciones no IRPF de
referencia y prioridades de Neto/Origen neto (incluido histórico0). Precisar unidad
actual de Guardia/Variable, significado del Neto documentado y su procedencia, sin
inventar un segundo campo manual si ya está en la fuente original.
Para «último válido»: criterio temporal, desempate entre pagas Ordinarias del mismo
mes y si las referencias deben proceder de una misma paga o se seleccionan por campo.
Precisar también la Fecha ingreso de resumen con varios cobros vinculados; las fechas
reales individuales siempre se conservan y muestran, sin depender del mes salarial.

- [x] Reutilizar fórmulas/criterios vigentes explícitos, conservar fuentes por ID y
  ausencia con motivo; ningún cálculo o selección por orden incidental de filas.
- [ ] Nueva regla de app para una ambigüedad real, aprobada separadamente de la
  equivalencia Excel; no reconstruir el pasado con esa regla.

Respuesta confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.

### Q6 — Precisión y escenario prudente de previsión

Indicar reglas vigentes de redondeo/precisión y dominios de entradas/porcentajes
(incluidos ajustes negativos), y fórmula/parámetros del escenario prudente existente.
No universalizar importes/configuración concretos del libro. Conservar pp como
variación de tasa, no como euros ni porcentaje relativo.

- [x] Simulación identificada por escenario y fuentes, parámetros configurables y
  pendientes/no calculable si faltan entradas válidas; sin topes o redondeos inventados.
- [ ] Limitar explícitamente el escenario prudente hasta tener evidencia completa,
  manteniendo su existencia conceptual y sin sustituirlo por otra fórmula.

Respuesta confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.

## Hito documental2

Spec11 rev1 propone vínculo mínimo, analiza parciales/múltiples/fuera de mes y expone
alternativa agrupada pendiente Q4. Wireframes separan documentado/cobrado/estimado.
Fórmulas de Q3 transcritas sin añadir motor fiscal ni completar Q5/Q6 por inferencia.
No aprobación completa, SQL, desarrollo, pruebas funcionales ni merge.

## Resolución Q4–Q6 — 2026-10-24

Fuente real: «E2.5 Nómina — Resolución de decisiones adicionales Q4–Q6», usuario
tras contraste de Álex con fórmulas/Criterios de v5.11(7). No inspección propia.
Resuelve ronda2 con los grados de aprobación siguientes, conservando el historial.

- Q4: N:M aprobada conceptualmente: Movimiento y paga por IDs e importe asignado,
  un solo Movimiento bancario real, suma asignada≤importe real, remanente/diferencias
  visibles. Meses salariales distintos y agrupación Ordinaria/Bonus permitidos con
  evidencia; sin duplicar/dividir Movimiento. Flujo cuenta el Movimiento una vez por
  Fecha bancaria/Ciclo. C176 describe una paga real por Ingreso: N:M es ampliación de
  la app, no equivalencia del Excel ni cambio autorizado de sus datos/estructura.
  La relación técnica se somete a aprobación al cerrar la especificación.
- Q5 físico: Retención=Base IRPF×IRPF; Deducciones no IRPF=Devengo−Retención−Neto.
  Estructural Bonus vacío; Ordinaria sin Guardia=Sí:Neto; con Guardia=Sí:
  (Devengo−Variable)−(Base IRPF−Variable)×IRPF−(Devengo−Retención−Neto).
  Neto: histórico informado primero; si falta, Ingresos del mes/Subtipo; sin datos,
  vacío. Origen Histórico/Movimientos/vacío según fuente. Fecha física MINIFS del
  mes/Subtipo. Son fórmulas Excel, sus limitaciones no son reglas nuevas de negocio.
- Referencia propuesta app: mes salarial más reciente entre Ordinarias documentadas
  con datos completos, sin futuro/incompleto; desempate por identidad/evidencia,
  nunca orden de inserción o suma de pagas distintas. Sin referencia suficientemente
  verificable, pronóstico no disponible/incompleto, no cero. Múltiples cobros: primera
  y última fecha, total, número de ingresos, pendiente/diferencia y fecha de cobro
  completo solo si conciliación demostrable. Fechas documentales no sustituyen banco.
- Q6: Variable prevista€ y Ajuste IRPF esperado pp inicialmente0, entradas explícitas.
  Fórmulas de Q3 conservadas. Prudente: IRPF referencia+0,0027 (+0,27pp), demás
  referencias/Variable iguales; Neto prudente=(Devengo ref+Variable prevista)−Deducciones
  no IRPF ref−(Base IRPF ref+Variable prevista)×(Último IRPF+0,0027).
  Diferencia prudente=Neto prudente−Neto estimado. Solo simulación.
- Precisión física: sin ROUND explícitos ni límites de validación en esas entradas.
  Propuesta app: decimal exacto, monetarios visibles2 decimales, sin redondeos tempranos;
  probar punto de redondeo/equivalencia económica. Importes finitos, IRPF estimado0–100%.
  Variable prevista no negativa por defecto, sin máximo financiero arbitrario; ajustes
  salariales negativos aparte si se requieren. Ajuste IRPF± sin banda arbitraria,
  condicionado a tasa válida. +0,27pp es parámetro prudente, no límite del ajuste.
  Referencias ausentes producen incompleto/no disponible, nunca ceros silenciosos.

No autoriza código, SQL, Excel ni merge. Rev2 separa reglas físicas, limitaciones y
ampliaciones de app; asociación técnica, adaptación de Neto/selección y presentación
propuestas quedan sujetas a aprobación completa. No se vuelven a pedir Q1–Q6.

## Propuesta concreta para cerrar el diseño técnico — rev2

- N:M con par paga/Movimiento único vigente, importe positivo, revisión/evidencia y
  auditoría; la suma global por Movimiento se revalida atómicamente sin exceder el hecho.
- No se usa SUMIFS mensual como fallback automático de una paga. Sin histórico, el
  Neto con origen Movimientos procede de sus asignaciones verificables, con completitud;
  cobrado parcial no se eleva a neto documentado ni referencia fiscal definitiva.
- Un único registro Ordinaria verificado alimenta todos los operandos de referencia;
  mes más reciente, empate resuelto mediante selección explícita de ID/evidencia, sin
  sumar candidatos. La selección y su revisión se muestran/revalidan.
- Fórmulas exactas hasta resultado; propuesta de presentación decimal a2 decimales al
  final, con casos de empate explícitos antes de afirmar equivalencia económica.
  No se ha ejecutado un contraste numérico del Excel ni se declara esa equivalencia.

## Conflicto material M1 — Neto documentado sin Neto histórico

La lista original de campos no define una entrada independiente «Neto documentado».
Propuesta mínima actual: obtenerlo de un original con procedencia documental acreditada;
no inferirlo de la suma cobrada. Si no existe importe documental conocido, diferencia
contra documentado y fecha de conciliación completa permanecen no disponibles.
Confirmar al cerrar si basta esa vista de originales o hace falta permitir informar
Neto documentado con evidencia cuando Neto histórico está vacío. No añadir ese campo
ni convertir Neto histórico a otra semántica por inferencia. El resto de la rev2 puede
prepararse sin resolverlo; este punto condiciona la captura/conciliación completa.

## Revisión documental independiente rev2

SPEC11-DOC-QA: PASS con pendientes explícitos; sin nuevos conflictos materiales ni
motivo para reabrir Q1–Q6. Revisión solo lectura de vínculo/cálculos/wireframes y
resoluciones, sin tests ni contraste físico. M1 es el único cierre material de captura
identificado. El formato final se concreta como propuesta técnica: céntimo más cercano,
empate alejándose de cero, sin redondeo intermedio ni restar importes visuales; equivalencia
numérica física queda como gate futuro, no se afirma comprobada.

Alternativas concretas M1 para aceptar sin alterar originales:
- [x] Proponer Neto documentado opcional con evidencia cuando no existe dato documental
  utilizable; preservar Neto histórico separadamente y no autocompletarlo desde el banco.
  Si el original ya acredita neto documental, reutilizar su fuente sin copia automática.
- [ ] No añadir captura: si falta original suficiente, diferencia/fecha completa quedan
  no disponibles; solo se muestran cobros asignados y su procedencia.
Recomendación no es respuesta del usuario ni autorización de estructura.

## M1 resuelto — Neto documentado y conciliación — 2026-10-24

Fuente real: usuario «E2.5 — Decisión sobre Neto documentado y conciliación».
Acepta Neto documentado€ opcional por paga, manual con evidencia salarial identificable.
Neto histórico independiente/intacto; nunca autocompletar desde banco/total cobrado.
Vacío≠0; procedencia y auditoría de altas/correcciones. No segunda verdad bancaria.
Referencia de conciliación:documentado válido o histórico original cuando corresponda;
si ambos informados discrepan, aviso sin elección silenciosa. Diferencia=referencia
válida−cobrado real asociado. Fecha completa solo desde abonos asociados y suficientes
para demostrar conciliación. Sin referencia válida:Diferencia/Fecha completa no
disponibles aunque haya Ingresos. Coincidencia monetaria no prueba asociación.
N:M no duplica ingreso económico; histórico/documento/banco/pronóstico separados.

Arquitectura:antes de implementar comprobar campo semánticamente idéntico y reutilizar
si existe, no duplicar por nombre. Revisión de fuentes actuales en apps/api/src y
apps/web/src:no entidad Nómina/Neto documentado instalada; solo subtipos salariales de
Movimientos y menciones de independencia de Ciclos. No usar el importe del Movimiento
como sustituto de ese dato documental. Volver a comprobar el estado al iniciar dev;
esta inspección no ejecuta ni aprueba DDL/código. Sin cambios a Excel/SQL/merge.

Rev3 concreta resolución de discrepancias mediante selección explícita justificada de
referencia y revisiones, sin reescribir originales ni cambiar automáticamente fórmulas
salariales. Valores coincidentes conservan ambas procedencias; no crean abono ni prueban
conciliación. M1 ya no pendiente; diseño completo/visual/técnico requiere aprobación propia.

## Revisión independiente final rev3 — 2026-10-24

SPEC11-DOC-QA:PASS del delta Neto documentado/conciliación y estado M1 resuelto,
sin conflictos materiales nuevos. Revisión solo lectura, sin tests ni contraste físico.
Selección explícita de referencia discrepante es propuesta para aprobación completa,
no reapertura de M1. Se preserva prioridad histórica del derivado salarial separada
de conciliación.46 AC futuros y wireframes; no resultados de implementación.
Candidato rev3 SHA256:
`c35beb2dac62ad0898b2dafd857138a91806309e235ea755670953cf6fe157f8`.
Siguiente paso:aprobación del documento completo, relación técnica N:M y wireframes.

## Aprobación completa rev3, relación técnica N:M y wireframes — 2026-10-24

Solicitud inmediatamente anterior: «¿Apruebas la especificación completa rev3, incluida
la relación técnica N:M y sus wireframes?». Respuesta real: «Aprobadas».
Objeto único:spec11 rev3 completa, relación técnica y wireframes. No aprobación de
implementación, SQL, migración, Excel, despliegue o merge.
Candidato aprobado SHA256 previo al cambio administrativo:
`c35beb2dac62ad0898b2dafd857138a91806309e235ea755670953cf6fe157f8`.
Revisión independiente SPEC11-DOC-QA PASS, sin conflictos materiales nuevos. Q1–Q6/M1
resueltos;46 AC futuros, no pruebas funcionales ejecutadas. Fórmulas y diseños intactos;
solo estado/procedencia de aprobación cambian. Los pendientes históricos superiores
se conservan como historia, resueltos por las decisiones posteriores.
Siguiente paso:verificación documental, commit/PR; gates de merge/dev11 separados.
