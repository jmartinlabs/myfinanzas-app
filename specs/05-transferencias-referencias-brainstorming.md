# 05 — E1.5 Transferencias y Referencias: Brainstorming
Status: DRAFT — NO APROBADO. Q1–Q3 resueltas; revisión final pendiente, sin desarrollo.
Roadmap/context: [E1.5](roadmap.md#e15--transferencias-y-referencias-básicas-estables),
[referencia R1–R4/P2](functional-reference-v5.11.md), [propuesta](05-transferencias-referencias-specification.md).
Base: main a693aeb, E1.4 cerrada mediante PR #15/#16. Fecha: 2026-10-21.
Next action: revisión final de Álex y aprobación expresa del documento completo/wireframes.

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


## Confirmaciones posteriores — Q1–Q3 resueltas, 2026-10-21
Fuente: comunicación expresa del usuario tras revisión favorable de Álex de PR #17.
Este registro sustituye recomendaciones y pendientes anteriores sin borrar la ronda original.

**Q1 confirmada:** Transferencias internas entre dos Saldos activos, distintos y elegibles.
No aplicar Permite salida a Exterior; no excluir automáticamente Terminal ni No controlado.
TODAS las Transferencias con Exterior quedan para una entrega posterior, también las
ordinarias, no solo Anticipos/Compartidos E3. No habilitar Manual por extensión.

**Q2 confirmada por evidencia sanitizada del usuario:**
| Categoría ID | Tipo referencia | Obligación |
| --- | --- | --- |
| CAT011 | Viaje | Obligatoria |
| CAT012 | Anticipo | Obligatoria |
| CAT013 | Gasto compartido | Obligatoria |
| CAT014 | Evento | Opcional |
| CAT009 | Vehículo | Opcional |
Toda REF informada debe existir. Solo donde la regla física exige Referencia se exige
compatibilidad Categoría–Tipo; no endurecer referencias opcionales. En Ingreso/Transferencia
sin Partida no inventar Categoría ni mapping obligatorio. Restricciones particulares
independientes: Anticipo solo Transferencia; Compartido admite Gasto o Transferencia,
con origen Exterior y Quién paga en esta última. E1.5 no habilita tipos con fichas E3
ausentes, ni permite saltarse ese bloqueo mediante Referencia opcional. Viaje/Evento
siguen los tipos operativos del roadmap; matriz no crea Categorías ni hechos nuevos.
No afirmar cardinalidad universal ni nuevas filas a partir de estas cinco evidencias.

**Q3 confirmada como nueva decisión app:** Transferencias sin fechas futuras, fecha
civil Europe/Madrid en cliente y servidor. No regla física Excel; no modifica Ciclos
futuros ni la Fecha de referencia financiera derivada de hechos vigentes.

Criterios actualizados: 30 actuales previstos, 3 futuros, sin condicionantes Q pendientes.
Los criterios siguen NO ejecutados para E1.5; diseño y documento completo aún no aprobados.
La propuesta de Estado/Tipo protegido de REF permanece identificada como app, no Excel.
Siguiente acción: revisión final en PR #17 Draft; sin dev 05, SQL, merge ni despliegue.


## Investigación de CI y validación de revisión — 2026-10-21
PR #17 inicial 501f993: push SUCCESS, pull_request FAILURE en test:e2e (run39634000748).
El usuario identifica fallo de foco de Registrar movimiento. Metadatos GitHub confirman
el paso fallido; descarga del log completo bloqueada por HTTP403, sin afirmar su lectura.
Inspección: formulario aparece antes de options; el botón está disabled hasta recibirlas,
pero el test intentaba Tab sin esperar enabled. Un botón disabled no participa en tabulación;
además el shell enfoca h1 en requestAnimationFrame durante navegación.
Corrección autorizada SOLO en test existente: retener petición real de opciones con promesa,
comprobar disabled y foco inicial del título; liberar/fallback al servidor real, esperar
enabled y mantener exactamente la aserción de foco del botón después de Tab desde Cancelar.
Esto ejercita determinísticamente la frontera de carga que podía causar la carrera;
no se afirma una reproducción del log remoto inaccesible. Sin sleeps, retries nuevos,
aumento de timeout, eliminación de aserciones ni cambios funcionales/SQL.
Resultados locales: typecheck PASS; suite Playwright completa 2 PASS (E1.1–E1.4), incluido
caso de carga retenida y restauraciones reales. validate-template, 18 regresiones del
validador, check-project, 22 regresiones de controles y diff --check PASS.
Las pruebas E1.5 siguen previstas, no ejecutadas: esto verifica la regresión existente,
no implementación de Transferencias/Referencias. La evidencia CI del SHA final se registra
en PR #17 para no alterar de nuevo el commit validado. PR permanece Draft/NO APROBADA.
