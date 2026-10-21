# 05 — E1.5 Transferencias y Referencias: Brainstorming
Status: DRAFT — NO APROBADO. Ronda única pendiente; no autoriza desarrollo.
Roadmap/context: [E1.5](roadmap.md#e15--transferencias-y-referencias-básicas-estables),
[referencia R1–R4/P2](functional-reference-v5.11.md), [propuesta](05-transferencias-referencias-specification.md).
Base: main a693aeb, E1.4 cerrada mediante PR #15/#16. Fecha: 2026-10-21.
Next action: contrastar Q1–Q3, revisar wireframes y aprobar posteriormente el documento completo.

## Autorización y decisiones ya confirmadas
Usuario autoriza exclusivamente spec 05 y publicación de una PR Draft sin aprobación previa,
como excepción expresa a la secuencia de publicación de la Skill spec. No autoriza dev 05,
SQL, merge, datos reales ni despliegue. Excel v5.11 sigue maestro.
Codex no ha incorporado ni inspeccionado el Excel físico. Se reutilizan extracto sanitizado,
roadmap aprobado y evidencias del usuario de E1.1–E1.4; no se afirma un nuevo contraste físico.
- Transferencia: dos Saldos distintos, sin Partida ni cómputo como Ingreso/Gasto (R2).
- Terminal: Transferencia de financiación y Gasto desde terminal a Exterior; no otra compra (R2).
- REFxxx estable/único/inmutable, nombre editable, relaciones por ID (P2, decisión de app).
- E1.5 habilita Viaje/Evento sin ficha específica. Anticipo/Compartido/Vehículo esperan
  sus fichas coherentes E3.1–E3.3, sin maestros paralelos ni casos huérfanos (roadmap).
- Gastos obligatorios: Referencia existente, Tipo válido y esperado por Categoría según
  tblTiposReferencia. No/vacío histórico no activa obligación (evidencia E1.2).
- Rectificación/anulación, auditoría, idempotencia, saldo centralizado, conservación de
  inactivos y seguridad de E1.4 se reutilizan; no se reabren decisiones Q1–Q6.

## Round 1 — 2026-10-21
Las casillas marcadas son recomendaciones para revisión, NO respuestas del usuario.

### Q1 — Elegibilidad exacta de Transferencias ordinarias
¿Confirma Criterios que E1.5 puede admitir dos Saldos ordinarios activos distintos, incluidos
Terminal y No controlado, sin aplicar a una transferencia interna el permiso de salida a Exterior?
¿Existe otra restricción contrastada por Tipo/Control que deba conservarse?
- [x] Recomendar ese alcance interno, sin S000 en altas ordinarias; reutilizar Manual no operativo.
  No inventa restricciones por Tipo, pero requiere contrastar la elegibilidad de Transferencia.
  Variantes con Exterior de Anticipo/Compartido siguen reservadas a E3 según roadmap.
- [ ] Incorporar una restricción adicional únicamente con evidencia concreta de Criterios.
Confirmed answer: PENDING; source/date: PENDING. No generalizar a E3 el veto ordinario a S000.

### Q2 — Matriz real de Referencias
¿Qué filas de tblTiposReferencia corresponden a Viaje/Evento y qué restricciones reales se
aplican al informar Referencia en Ingreso, Gasto y Transferencia, incluso si no es obligatoria?
Se necesita el mapping sanitizado por ID de Categoría y Tipo esperado, y aclarar si un
Tipo puede ser esperado por varias Categorías o una Categoría admite varios Tipos.
No hacen falta importes, nombres personales, registros ni el Excel completo.
- [x] Recomendar una única validación servidor basada en la matriz contrastada, tanto
  al registrar como al rectificar; mantener bloqueado lo no verificable y los tipos E3.
  La recomendación NO decide por sí sola cuándo el mapping aplica a Referencias opcionales.
- [ ] Si la fuente no demuestra un extremo, dejarlo pendiente de decisión explícita;
  no inferir Tipo desde el nombre de Categoría ni aceptar cualquier Referencia por defecto.
Confirmed answer: PENDING; source/date: PENDING. Sin esa evidencia no cerrar elegibilidad,
cardinalidad física del mapping ni declarar desbloqueados todos los Gastos con Referencia.

### Q3 — Fecha futura en Transferencia
El bloqueo aprobado en E1.4 Q4 se limita expresamente a Ingreso/Gasto. ¿Se extiende a Transferencia?
- [x] Recomendar el mismo límite de fecha civil actual Europe/Madrid en UI y servidor:
  Movimientos representa hechos ejecutados, no órdenes futuras. Es una nueva decisión de app.
- [ ] Admitir fechas posteriores si la semántica revisada lo requiere, explicitando cómo
  se distinguen de planificación; no decidir por analogía ni cambiar Fecha de referencia.
Confirmed answer: PENDING; source/date: PENDING. Los Ciclos futuros continúan permitidos.

## Propuestas ordinarias para aprobar con el documento
No constituyen evidencia del Excel: Referencias Activas al crear, desactivación/reactivación
sin borrado; nombres obligatorios no usados como clave, sin unicidad nueva de nombres;
Tipo seleccionable al crear y corregible sin uso, bloqueado al estar utilizado (nuevo caso
si cambia el significado; rectificación histórica excepcional fuera de E1.5). No versionado.
Generación REF atómica, sin reutilización y capaz de continuar después de REF999.
Importes positivos/exactos y corrección con auditoría reutilizan la garantía del registro;
no compensaciones automáticas ni cuentas de ingresos artificiales. Si Álex detecta una
contradicción física se resuelve antes de aprobación, no por una implementación implícita.

## Coverage
Requisitos y límites E1/E3; identidad/relaciones y valores derivados; API y transacciones;
listado/ficha/formulario/impacto; errores/vacíos/concurrencia; upgrade/backup/regresiones.
La propuesta condicionada y sus criterios previstos están en specification. Ningún criterio
se declara implementado o probado. No nueva ronda salvo contradicción material.

## Wireframes
[Esquemas 1440/390 y estados](05-transferencias-referencias-specification.md#screens-and-interfaces).
Feedback del usuario/Álex: PENDING. Son propuesta documental, no capturas reales ni diseño aprobado.

## Append-only clarifications
Pendientes respuestas Q1–Q3 y revisión final. Añadir confirmaciones con procedencia/fecha;
no sobrescribir la ronda ni confundir recomendación marcada con aprobación.
