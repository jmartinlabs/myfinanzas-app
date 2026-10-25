# 13 — Anticipos y pendiente por caso: Brainstorming
Status: DRAFT — Ronda 1 resuelta (Q1–Q6 confirmadas, 25/10/2026); spec/wireframes en curso
Roadmap/context: [E3.1 roadmap](roadmap.md) · [referencia funcional v5.11](functional-reference-v5.11.md) ·
[E1.5](05-transferencias-referencias-specification.md) · [E2.1](07-ciclos-operacion-specification.md) ·
[E2.3](09-plan-ciclo-specification.md)
Base: `10bb794d793b7cd7c8f740831099e4dfb91c7340` (remota `main` verificada igual).
Rama `codex/spec13-anticipos`; worktree aislado. Checkout principal ocupado por
dev12/Codex (sin acceso). Next action: especificación + wireframes preparados;
solicitar aprobación completa del usuario antes del commit documental.

## Autorización y preflight — 2026-10-25
Usuario (25/10/2026) vía coordinador: autoriza preparar la especificación E3.1,
sin desarrollo; esta autorización no implica aprobación de la propuesta. Ownership
exclusivo: este archivo y `specs/13-anticipos-specification.md`; sin tocar tablero,
código, SQL, tests ni documentos de dev12. Dependencias ya integradas y no reabiertas:
E1.4 (Movimientos/Saldos), E1.5 (Referencias), E2.1 (Ciclos), E2.3 (planes).
E3.1 no exige esperar a dev12. Skills locales vía AGENTS.md (sin carga automática
en OpenCode). Sin Excel real, VPS, merge/deploy, B3/Dev32, datos financieros
definitivos ni subdelegación. Solo especificación; aprobación y dev12 quedan como
gates posteriores.

## Contraste con contratos aprobados (lectura, sin cambios)
- E1.5: `referencias` con tipos Viaje/Evento operativos; matriz CAT012 → Anticipo
  «Bloqueada por dependencia E3.1»; rectificar puede retroceder Referencia; sin
  DELETE físico. E3.1 habilitará CAT012 únicamente con su ficha aprobada.
- E2.3: no existe fuente Devolución anticipo; AC-10: Transferencias con Referencia
  no ejecutan Aportación; sin operaciones inválidas creadas para probarlo.
- Funcional R4: Anticipos = Transferencias con la misma Referencia; devolución
  inversa del receptor al que adelantó; adelantado/recuperado/neto/exceso, fechas
  y estado derivan de un motor único; la foto de Neto apertura del ciclo conserva
  la realidad al inicio del ciclo, no el pendiente actual; variantes históricas
  (incluido receptor Exterior cuando proceda) preservadas sin inventar operaciones.
- E2.6/AC-47: consumidores futuros (E3.5/E3.6) no descuentan Anticipos dos veces.
- Confirmed por el paquete: devolución mediante Transferencia inversa y misma
  Referencia; nunca convierte devolución en ejecución del Presupuesto; apertura
  histórica por caso; alta atómica sin huérfanos.

## Ronda 1 — 2026-10-25
Question Q1 — Alta atómica Referencia + ficha (1:1 sin huérfanos)
- [x] Recommended: alta única en Referencias («Nueva referencia — Anticipo»): crea
  REFxxx tipo Anticipo Activa y su ficha de caso en la misma transacción; estado
  inicial derivado; integridad 1:1 comprobada en alta y lectura (no existe ficha
  sin Referencia ni Referencia Anticipo sin ficha; activar/desactivar conserva
  historia conforme E1.5, sin DELETE físico).
- [ ] Alternative: ficha perezosa al primer adelanto registrado — flujo más corto,
  pero crea fichas como efecto lateral y complica mensajes de error y corrección.
Confirmed answer: CONFIRMADA. Alta atómica 1:1 en transacción única, ficha puede
  generarse automáticamente dentro de esa transacción; sin huérfanas, duplicadas ni
  creación diferida con estados inconsistentes; identidad por REF estable (nombre
  solo presentación); reutilizar catálogo/auditoría/seguridad/idempotencia/validaciones
  existentes; rollback completo ante cualquier fallo; desactivar la Referencia no
  elimina ficha ni historial.
  Source/date: Usuario (Álex), resolución Q1–Q6, 25/10/2026. — Estados y fechas del caso, derivadas no manuales
- [x] Recommended: la ficha calcula adelantado, recuperado, neto y exceso en un
  motor único; estados del caso derivados con etiquetas propias: Sin recuperar /
  Recuperación parcial / Recuperado / Excedido; fechas derivadas de hechos
  verificables: primer adelanto, última actividad (adelanto o recuperación), fecha
  de recuperado completo y fecha de exceso cuando exista; sin hecho soporte →
  fecha No disponible con motivo; sin campo manual de estado ni fecha esperada
  inventada (no hay fuente en v5.11 para una fecha objetivo del caso).
- [ ] Alternative: reutilizar el vocabulario de presupuesto Pendiente/Completo/
  Excedido (R3) — vocabulario compartido, pero fusiona semánticamente plan y
  recuperación, justo el doble cómputo que la referencia funcional prohíbe.
Confirmed answer: CONFIRMADA. Vocabulario propio de Anticipos (Sin recuperar /
  Recuperación parcial / Recuperado / Excedido); motor único: Adelantado=Σ adelantos
  reales elegibles; Recuperado=Σ devoluciones reales elegibles; Neto pendiente=
  Adelantado−Recuperado; Exceso=MAX(Recuperado−Adelantado,0). Estados: Sin recuperar
  (adelanto sin devolución); Recuperación parcial (devolución positiva < adelantado);
  Recuperado (importes iguales); Excedido (recuperado > adelantado). Con movimientos
  insuficientes: Sin operaciones o No disponible según cobertura; nunca Recuperado
  por igualdad artificial 0=0. No reutilizar Pendiente/Completo/Excedido (presupuesto).
  Fechas solo de Transferencias reales elegibles, sin inferir fechas bancarias.
  Source/date: Usuario (Álex), resolución Q1–Q6, 25/10/2026.

Question Q3 — Devolución con Referencia distinta o dirección errónea
- [x] Recommended: el motor único suma a la ficha únicamente lo que pertenece por
  misma Referencia y dirección inversa correcta (receptor → quien adelantó);
  devoluciones con otra Referencia o dirección equivocada quedan fuera del cómputo
  y visibles en la ficha como «Relación no verificable — revisar», con motivo, sin
  sumar, sin cambiar el estado y sin autocorrección; si aplica, el usuario rectifica
  el hecho por la vía ordinaria E1.5 (rectificar puede retroceder Referencia).
- [ ] Alternative: emparejar por importe/fecha cercana al caso aparente — imita
  utilidad pero inventa vínculos supuestos; contradice la conexión explícita por
  Referencia aprobada en E1.5 y la trazabilidad del motor único (R4).
Confirmed answer: CONFIRMADA. Excluir del cálculo toda operación incompatible con
  el caso. Nuevas: validar misma Referencia de Anticipo y dirección correcta para
  registrar devolución; bloquear devolución incompatible con el caso seleccionado;
  sin corrección automática de dirección o Referencia. Históricas: preservar los
  Movimientos originales; señalar «Revisar» ante incoherencia verificable; no computar
  devolución con dirección incorrecta; una transferencia con otra Referencia pertenece
  a su propia Referencia (sin atribución por fecha/importe/Saldos); sin asociaciones
  ni compensatorios inventados. Separar advertencia de conciliación y error estructural.
  Source/date: Usuario (Álex), resolución Q1–Q6, 25/10/2026.

Question Q4 — Variante histórica con receptor Exterior
- [x] Recommended: en altas nuevas el adelanto es entre Saldos propios (origen y
  destino propios; si participa un receptor/originante técnico Exterior en datos
  históricos importados o ya existentes, la ficha lo conserva y lo etiqueta con su
  procedencia); Exterior no es un tipo selectable en el alta de E3.1; «cuándo
  procede» queda dominio de la fuente autorizada (histórico/traspaso), sin nueva
  dirección financiera ni Exterior por inferencia (paquete: no ampliar Transferencias
  con Exterior sin instrucción).
- [ ] Alternative: permitir elegir receptor Exterior en el alta nueva — habilitaría
  un flujo no enumerable en v5.11 para casos nuevos y añade regla económica nueva
  sin fuente; contradice el límite del paquete.
Confirmed answer: CONFIRMADA. S000 · Exterior no seleccionable en nuevas
  Transferencias de Anticipo con las capacidades actuales; conservar variantes
  históricas válidas con receptor Exterior; identificar procedencia
  histórica/importada y sus limitaciones; no crear transferencias ficticias para
  adaptarlas; no modificar retrospectivamente sus Saldos o Referencias; cualquier
  ampliación de Transferencias nuevas con Exterior exigirá contrato y autorización
  específicos.
  Source/date: Usuario (Álex), resolución Q1–Q6, 25/10/2026.

Question Q5 — Apertura histórica y Neto apertura del ciclo
- [x] Recommended: la ficha registra «Fecha apertura» del caso: derivada de su
  primer adelanto verificado; solo para casos anteriores a los movimientos de la
  app se permite fecha de apertura manual con marca explícita «Manual» (equivalente
  a los valores manuales ya aprobados en Saldos/Nómina), sin inventar hechos; el
  «Neto apertura del ciclo» se calcula como adelantado−recuperado con operaciones
  verificables de fecha ≤ Inicio del ciclo; sin evidencia suficiente → «No
  disponible» con motivo, nunca 0 ni sustituido por el pendiente actual; no se
  reconstruyen hechos históricos ni se reescribe la foto del ciclo.
- [ ] Alternative: reconstruir la apertura histórica a partir de movimientos
  posteriores — impone una regla económica sobre el histórico sin evidencia y
  contradice el resultado E3.1-AC3 aprobado en el roadmap.
Confirmed answer: CONFIRMADA. Fecha primer adelanto derivada de la primera
  Transferencia de adelanto válida y conocida; fecha de creación técnica de la ficha
  como dato de auditoría independiente (no es fecha financiera); para casos
  anteriores a la app, fecha histórica manual identificada «Manual» con evidencia y
  trazabilidad; no rellenar ausentes con hoy ni la fecha de importación. Neto apertura
  ciclo: fotografía del pendiente al abrir el ciclo; conservar dato original/manual
  confirmado y su procedencia; no sustituirlo por el pendiente actual; no reconstruir
  con movimientos incompletos; sin evidencia → No disponible (no 0 ni pendiente
  actual); sin modificación automática de fotos de ciclos anteriores por devoluciones
  posteriores. Diferenciar expresamente Fecha primer adelanto, Fecha técnica de
  creación y Neto apertura ciclo.
  Source/date: Usuario (Álex), resolución Q1–Q6, 25/10/2026.

Question Q6 — Alta de devolución guiada desde la ficha (alcance)
- [x] Recommended: incluir un atajo «Registrar devolución» en la ficha E3.1 que
  formula la Transferencia inversa real (misma Referencia; dirección invertida,
  receptor→quien adelantó; fecha/importe del usuario) vía el servicio común de
  Transferencias: crea un hecho bancario genuino; no ejecuta Presupuesto (R3/E2.3)
  y reduce el error de Referencia/dirección al describirla desde el propio caso.
- [ ] Alternative: E3.1 solo consulta ficha/totales; las devoluciones se siguen
  registrando en Movimientos sin vínculo guiado — menos UI, pero introduce los
  dos errores que esta entrega debe cubrir (Referencia distinta, dirección errónea).
Confirmed answer: CONFIRMADA. Acción «Registrar devolución» desde la ficha: abre el
  formulario común de Transferencia con Referencia y Origen/Destino inversos al
  adelanto precargados; propone el pendiente recuperable como importe cuando sea
  verificable; permite editar importe y fecha real según validaciones; muestra
  revisión antes de confirmar; registra una única Transferencia real mediante el
  servicio común; actualiza resultados derivados desde el motor central; aplica
  idempotencia, auditoría, validación de dirección y controles de concurrencia.
  Sin simular transferencias bancarias ejecutadas desde la app. Si supera el
  pendiente: advertencia de exceso y reglas de Excedido, sin alterar el importe
  real. Sin atajo para variantes históricas con Exterior (el contrato actual de
  Transferencias no lo permite). La mejora «registro coordinado de gastos con
  transferencia o anticipo» queda en backlog independiente.
  Source/date: Usuario (Álex), resolución Q1–Q6, 25/10/2026.

### Casos confirmados por alcances del paquete (sin nueva pregunta)
Devoluciones parciales/completas/excesivas, Referencia distinta, dirección errónea,
identidad histórica del caso, apertura sin evidencia, alta atómica sin huérfanos.
Devolución de Anticipo una sola vez; fuera de presupuesto; compensaciones/informe
quedan en E3.2/E3.6 (no anticiparlos aquí).

## Coverage
Funcional, pantallas/interacciones, lectura/escritura datos, APIs/dependencias,
validación, errores y extremos — consolidados en la especificación y wireframes
rev1; la UI rev1 sigue sin aprobar hasta el feedback del usuario.

## Append-only clarifications
Nuevas rondas se añaden al final; nunca reescribir preguntas y respuestas previas.


## Ronda 2 — revisión documental rev2 — 2026-10-25

Paquete SPEC13-DOC-REV2 del coordinador: correcciones documentales autorizadas en
copia aislada `codex/spec13-documentary-rev2`, base `10bb794`; sin modificar los
borradores originales. Estado vigente: **DRAFT rev2**, Q1–Q6 conservadas y no
reabiertas; no aprobación de spec/wireframes ni autorización de dev13.
La cabecera y Coverage anteriores conservan el estado histórico rev1.

Correcciones de representación: se retira REFyyy del wireframe de REFxxx (Q3 no
permite atribuir por similitud), y la fila en dirección de adelanto que se había
etiquetado como devolución incompatible sin criterio verificable. Exceso sin
exceso es 0 verificado conforme MAX; se retira el evento de cierre añadido en
AC-06; AC-21 permite lectura de fuentes canónicas necesarias sin escritura de
consulta ni caché fuente. Atajo Exterior histórico no disponible (Q6) explícito.
Mapeo E3.1-AC1..3 añadido, sin cambiar sus criterios.

### Contraste adicional de contratos existentes

- R4 de [v5.11](functional-reference-v5.11.md#r4--casos-y-comida-secciones-7-10)
  determina misma REF e inversión receptor→quien adelantó; Q6 precarga la inversa.
  [E1.5](05-transferencias-referencias-specification.md#rectificación-anulación-e-integridad)
  conserva origen/destino/REF por hecho y su rectificación auditada, sin aportar
  selección entre varios pares ni una nueva clasificación adelanto/devolución.
  No se ha encontrado respaldo para elegir por fecha/importe/orden o repartir.
- [E2.1](07-ciclos-operacion-specification.md#límites-de-cierre) no implementa fotos;
  revisión de Inicio/apertura y auditoría no equivalen a foto financiera. Q5 y
  E3.1-AC3 fijan preservar realidad al inicio y evidencia, pero no actor, acción
  ni disparador del registro. No extrapolar cierre E4 ni proponer rectificación
  o política de versiones como si estuviesen confirmadas.

Question Q7 — Dirección cuando hay varios pares en una misma Referencia
- [ ] Propuesta pendiente: selección explícita de par origen/destino respaldado
  por adelantos verificables antes de precargar la inversa. ¿Qué criterio acredita
  el rol adelanto/devolución y el pendiente recuperable del par si la REF contiene
  varios pares o direcciones ambiguas? Sin elegir ni distribuir por inferencia.
- [ ] Alternativa pendiente: limitar el atajo a un único par verificable hasta
  contar con contrato específico para varios pares; no alterar hechos existentes.
Confirmed answer: PENDING. Ninguna casilla constituye respuesta del usuario.

Question Q8 — Registro de la foto de Neto apertura del ciclo
- [ ] Propuesta pendiente: acción explícita y auditada por caso+ciclo para registrar
  fuente verificable o valor manual confirmado. ¿Quién registra, en qué momento
  y mediante qué acción se valida la evidencia de la realidad al abrir el ciclo?
- [ ] Alternativa pendiente: integración con una operación existente solo si su
  contrato se amplía/aprueba expresamente; E2.1 actual no genera esta foto.
Confirmed answer: PENDING. No se ha decidido disparador, corte automático,
rectificación ni versionado. Q5 sigue vigente sin ampliación inferida.

P-AC-27–29 en specification son propuestas de aceptación pendientes Q7/Q8,
no criterios aprobados ni resultados de pruebas. Próximo gate del coordinador:
resolver estas preguntas y solicitar feedback/aprobación de la propuesta completa.


## Resolución Q7/Q8 y continuidad rev3 — 2026-10-25

Fuente: mensaje expreso del usuario «Spec13 — Resolución de las dos cuestiones
adicionales», con confirmación de Álex. Sustituye los PENDING de la ronda 2;
Q1–Q6 no se reabren. Autoriza incorporar decisiones y preparar spec/wireframes,
no aprobar la propuesta completa ni desarrollo, SQL/Excel o merge.

Confirmed answer Q7: CONFIRMADA. Una misma Referencia admite varios pares de
Saldos. Con un par inequívoco verificable se propone la inversa; con varios se
exige selección explícita. Mostrar Origen, Destino, adelantado, recuperado y
pendiente verificables del par. Precargar inversa; importe y fecha real editables;
validar par/dirección al registrar, sin elegir por importe, fecha o proximidad.
No crear entidad adicional de pares si Movimientos+Referencia los identifican
fiablemente. Direcciones contradictorias o par original no identificable bloquean
el atajo y muestran conflicto para revisión. Neto/Exceso/Estado global proceden
del motor único; agrupar por par no duplica recuperaciones. Exceso conserva aviso.

Confirmed answer Q8: CONFIRMADA. Acción explícita «Confirmar Neto de apertura»
por ID Referencia+ID Ciclo, desde ficha y, cuando proceda, revisión conjunta de
Anticipos del ciclo. No campo obligatorio de tblCiclos ni cambio de apertura E2.1.
Una sola foto confirmada por combinación: importe al instante de apertura,
ID Ciclo/Inicio, procedencia, evidencia identificable/auditoría, fecha de
confirmación y cobertura verificable. No usar pendiente actual ni reconstruir
sin evidencia. Sugerencia solo con hechos anteriores al Inicio y cobertura
verificables; siempre confirmación explícita. Hechos posteriores no reconstruyen
la foto; misma fecha sin orden verificable exige evidencia o No disponible.
Vacío no es cero verificado; un exceso histórico justificable permite neto
negativo, sin truncarlo. Devoluciones posteriores no modifican foto. Corrección
excepcional con revisión de impacto, motivo, auditoría y protección de cierres/
fotografías; sin movimientos de cuadre ni fotos por consulta.

Continuidad vigente: DRAFT rev3 preparada; revisar propuesta completa y wireframes.
QA dev12 conserva prioridad al recibir evidencia verificable. Sin código, SQL,
Excel, merge ni aprobación completa inferida. Los apartados rev1/rev2 son historia.


## Aprobación completa rev3 — 2026-10-25

Fuente expresa del usuario: «De momento no esta open, asi q seguimos solo por
aqui, Propuesta aprobada», respuesta a la entrega de spec13 rev3 y wireframes.
Aprobados especificación completa, propuesta técnica y wireframes rev3; Q1–Q8
conservadas. Sustituye los estados DRAFT históricos sin reescribirlos.
OpenCode no disponible en esta ejecución; continuidad por coordinador Codex,
sin asignaciones externas. No autorización de desarrollo13, SQL/Excel o merge.
Próximo paso: cierre documental, validación y PR; merge con aprobación separada.


## Q9 — resolución conceptual y enmienda pendiente — 2026-10-25

Fuente: usuario/Álex, mensaje «Spec13/dev13 — Resolución Q9: identificación de
Adelanto y Devolución». Confirmada conceptualmente la fuente explícita; exige
aprobar enmienda documental antes de continuar dev13. Q1–Q8 no se reabren.

Confirmed answer Q9: toda nueva Transferencia de Anticipo declara rol Adelanto o
Devolución. Metadatos auditados vinculados al ID estable del Movimiento conservan
rol y par/orientación; el Movimiento sigue único hecho financiero, sin duplicar
importes. Devolución identifica expresamente par de adelanto; varios pares exigen
selección Q7, nunca similitud/fecha/nombres. Atajo precarga rol/REF/inversa, sujeto
a validación y confirmación. Movimiento y metadatos atómicos; validaciones en todas
las rutas de escritura. Histórico sin evidencia conserva hechos/efecto bancario,
sin asignación automática: No disponible/Revisar, subtotales acreditados Parciales.
Acreditación histórica explícita con evidencia identificable, revisión y auditoría.
Rectificar/anular exige revalidar rol/par/REF, derivados e impactos sobre apertura,
fotos/cierres protegidos. Sin segundo motor ni maestro independiente de pares si
bastan metadatos mínimos por Movimiento.

Estado: enmienda Q9 propuesta en specification, pendiente aprobación documental
completa. Dev13 DETENIDO en B13-1. No implementar, migrar datos reales ni hacer
merge/deploy por esta resolución conceptual. La autorización dev13 previa queda
sujeta al gate expreso de esta enmienda.
