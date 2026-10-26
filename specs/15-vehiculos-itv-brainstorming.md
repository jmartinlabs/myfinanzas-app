# 15 — E3.3 Vehículos y control ITV: Brainstorming
Status: Q1–Q5 confirmadas por el usuario el 2026-10-26; specification y wireframes
pendientes de aprobación. Ninguna aprobación de desarrollo.
Nota de lectura: los `PENDING` de la Ronda 1 y la sección Wireframes describen el
momento de la pregunta; las respuestas confirmadas están al final y los wireframes
propuestos se presentan en la specification para aprobación.
Roadmap/context: [E3.3](roadmap.md) · [R4 y P2](functional-reference-v5.11.md) ·
[E1.4 Movimientos](04-movimientos-specification.md) ·
[E1.5 Referencias](05-transferencias-referencias-specification.md) ·
[E2.4 Plan anual](10-plan-anual-specification.md) ·
[E3.1 Anticipos](13-anticipos-specification.md) ·
[E3.2 Compartidos](14-compartidos-specification.md).
Base: `f0a5219b2193283a4e3254d13c87c75c9254e845` (origin/main verificada antes de
crear la rama). Rama `codex/spec15-vehiculos`; checkout aislado
`/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/spec15-vehiculos`.
Checkouts y ramas ajenas preservados; no se modificó `codex/dev12-flujo-mensual` ni
`codex/dev14-base-b`.

## Autorización y preflight — 2026-10-26
El usuario autoriza preparar spec15 — E3.3 Vehículos y control ITV, solo análisis de
dependencias y una ronda breve de preguntas materiales con propuestas. Esta
autorización no aprueba decisiones, no autoriza desarrollo15, SQL, datos reales,
wireframes definitivos, commit de specification, push de publicación ni merge.
Ownership documental exclusivo de este brainstorming y del futuro
`15-vehiculos-itv-specification.md`.

Comprobaciones realizadas:
- `origin/main` = `f0a5219`; rama nueva desde ese SHA, árbol limpio.
- Identificador 15 libre: no existe `specs/15-*` ni otro trabajo `spec15`/`15-vehiculos`
  en las ramas locales y remotas revisadas. Los documentos existentes llegan a 14
  (más 31/32) y no hay colisión.
- No se reutilizan documentos de otra entrega ni se reescribe historia.
- Sin Excel real, datos personales/financieros, bases, credenciales ni secretos.
- Fuera de esta preparación: Base B, D5/Exterior, Comida, B3/Dev32, implementación y
  cualquier despliegue.

## Análisis de dependencias

| Dependencia | Estado comprobado | Reutilización y límite |
| --- | --- | --- |
| E1.4 Movimientos | Integrada | El Gasto año solo puede consumir `Gasto` real vigente, con su Fecha civil, importe, Referencia e identidad. Anulados quedan fuera del cómputo y se conservan en historia. Rectificar/anular reevalúa el año sin duplicar hechos. |
| E1.5 Referencias | Integrada | P2: REFxxx estable, único e inmutable; nombre editable; enlaces por ID. Tipo `Vehículo` (CAT009) está mapeado pero hoy no es operativo; CAT009 es Referencia opcional. E3.3 habilitará el tipo y su ficha sin convertir CAT009 en obligatoria ni añadir unicidad de nombres. |
| E2.4 Plan anual | Integrada | Aporta el contrato de ejercicio natural, fecha real frente a Ciclo, exclusión de anulados, cobertura/corte y prohibición de presentar un total incompleto como cero. E3.3 reutiliza esa semántica temporal y de cobertura, sin consumir Presupuesto ni convertir el Gasto año en planificación. |
| Especificaciones E3.1/E3.2 | Aprobadas documentalmente; dev13/dev14 fuera de esta rama | Se reutiliza el patrón aprobado de ficha 1:1, alta atómica Referencia+ficha, ID estable, nombre editable, auditoría y sin DELETE. No se depende de su código ni se importan participantes, aportaciones o estados de Compartidos. |
| P2 | Aprobada | Identidad por REF, no por nombre; renombrar conserva enlaces e historia. No se crea otro maestro de vehículos ni una clave por matrícula. |
| Referencia temporal central | Aprobada en R3 | No se usa el reloj para decidir el año financiero ni se deriva el gasto de la fecha de ITV. La selección de ejercicio es una vista explícita; el corte de cobertura se declara. |
| Histórico transitorio E4.5/E4.7 | No instalado | No se suma ni se simula. Si la cobertura no es verificable, se muestra el motivo y, como máximo, el subtotal registrado separado. |
| Base B (E3.2) | Aprobada documentalmente; implementación en rama ajena no integrada | **No se detecta dependencia material.** E3.3 no usa CAT013, participantes, aportaciones, D5 ni el motor de reparto. Si al detallar la ficha apareciera una decisión pendiente de Base B, se devolverá el bloqueo sin resolverla por inferencia. |
| D5/Exterior | OPEN/Pendiente en su propio contrato | Fuera de alcance. No se habilitan Transferencias Exterior, aportaciones externas ni variantes nuevas. Las restricciones E1.5 se conservan. |
| Comida, B3/Dev32 | Fuera de alcance | No se reanuda su investigación ni se usan sus datos o motores. |

Observación de secuenciación, no de alcance: existe una rama ajena
`codex/dev14-base-b` con esquema v14 no integrado. Esta preparación no la usa ni la
presupone; un futuro dev15 deberá partir de la main que corresponda y coordinarse
con la versión de esquema realmente integrada. No se incluye Base B por ello.

## Contratos heredados que no se reabren
- E3.3-AC1: una ficha por Referencia de tipo Vehículo, con ID estable.
- E3.3-AC2: Gasto año solo de Gastos reales vinculados y del ejercicio; nunca de
  Presupuesto, plan, fecha de ITV, Ingresos, Transferencias o amortizaciones.
- E3.3-AC3: Viaje y Evento continúan sin ficha; no se crea un módulo Navidad.
- Alta conjunta fallida sin huérfanos: Referencia y ficha se crean o revierten juntas;
  no hay REF sin ficha ni ficha sin REF de tipo Vehículo.
- Tipo incorrecto y ficha duplicada se rechazan; renombrar conserva ID y enlaces;
  fechas manuales no se rellenan con hoy; el cambio de ejercicio no arrastra gastos.
- P2/E1.5: sin DELETE físico, sin normalización silenciosa de nombres, sin nueva
  unicidad no aprobada; una Referencia inactiva conserva historia y no es elegible
  para nuevos enlaces.

## Alcance previsto para la specification
**In:** ficha única 1:1 de Vehículo; identidad REF/nombre/matrícula si se aprueba;
fechas manuales de ITV y cita; consulta de Gasto año por ejercicio natural; alta
atómica; renombrado; duplicados y tipo incorrecto; estados vacío/carga/error;
API protegida; wireframes 390/1440; validaciones y pruebas de aceptación.
**Out:** Base B y Compartidos; D5/Exterior; Comida; B3/Dev32; seguros personales
como módulo; activos inmobiliarios; automatización externa, avisos o recordatorios
no aprobados; importación histórica; módulo Navidad; implementación y SQL.

## Ronda 1 — 2026-10-26
Solo se preguntan extremos materiales que no resuelven el roadmap, v5.11, P2 ni los
contratos E1.4/E1.5/E2.4. Las opciones marcadas son propuestas, no respuestas.

### Q1 — Contenido mínimo de la ficha
La referencia v5.11 exige ficha única, ITV/cita manuales y Gasto año; P2 fija el
nombre editable. No fija matrícula ni otros datos del vehículo.

- [x] **Recomendada:** ficha mínima con la Referencia (ID y nombre editable), una
  matrícula opcional como dato de presentación (texto, no clave, sin unicidad) y las
  fechas manuales de ITV/cita. Sin marca, modelo, combustible, seguro ni kilometraje.
  La matrícula puede corregirse con auditoría; su ausencia se muestra «Sin informar».
- [ ] **Alternativa:** ficha aún más mínima, sin matrícula: solo Referencia, nombre y
  fechas. Menos datos que mantener, pero difícil distinguir vehículos homónimos.
- [ ] **Alternativa:** ficha ampliada con marca/modelo/año/combustible/kilometraje.
  Útil como ficha técnica, pero añade campos y mantenimiento no exigidos por v5.11.

Confirmed answer: PENDING; source/date: PENDING

### Q2 — Semántica y alcance de las fechas ITV/cita
«ITV/cita manuales» puede significar dos fechas vigentes o un historial de
inspecciones. También falta fijar si hay avisos automáticos.

- [x] **Recomendada:** dos fechas civiles opcionales e independientes por ficha:
  **fecha de ITV** (la que el usuario quiera controlar, normalmente la próxima) y
  **fecha de cita** (cita administrativa o previa). Ambas se introducen y editan a
  mano; pasado y futuro están permitidos; no se calcula periodicidad, no se deriva
  una de otra, no hay recordatorios/notificaciones ni integración externa. Se conserva
  una sola pareja vigente por ficha, con auditoría de cambios; ausencia = «No
  informada», nunca 0. No se crea historial 1:N de ITV en E3.3.
- [ ] **Alternativa:** historial de inspecciones ITV (fecha, resultado, próxima fecha)
  con varias filas por vehículo. Conserva pasado detallado, pero amplía el modelo y
  la UI sin que v5.11 lo exija.
- [ ] **Alternativa:** una única fecha ITV y ninguna cita; más simple, pero no cubre
  la «cita» que menciona la referencia funcional.

Confirmed answer: PENDING; source/date: PENDING

### Q3 — Coherencia de tipo, duplicados y renombrado
El roadmap exige rechazar tipo incorrecto y ficha duplicada, y cubrir renombrados.
P2 no impone unicidad de nombres; la matrícula no es hoy una clave.

- [x] **Recomendada:**
  - Solo una Referencia de tipo `Vehículo` puede tener ficha; el alta crea REF y
    ficha en una única transacción. No puede existir REF Vehículo sin ficha ni ficha
    sin REF Vehículo.
  - Un REF con ficha no puede cambiar a otro tipo. Un REF sin ficha que cambie a
    `Vehículo` crea la ficha atómicamente en la misma operación; un tipo ya usado
    sigue protegido por E1.5.
  - Una ficha por REF: el duplicado y el reintento no crean una segunda ficha.
  - Nombre y matrícula no son claves únicas. Al crear o renombrar se muestran
    coincidencias normalizadas solo para comparar; el usuario confirma que son
    vehículos distintos. No se fusionan ni se normalizan los valores guardados.
  - Renombrar REF o corregir matrícula conserva ID, enlaces, Gasto año e historia;
    se audita. Desactivar la REF conserva ficha e historia; reactivar no crea hechos.
- [ ] **Alternativa:** matrícula única global y nombre único. Evita duplicados por
  datos, pero introduce una regla de unicidad no aprobada y puede bloquear vehículos
  legítimos con matrícula temporal o nombre repetido.
- [ ] **Alternativa:** permitir cambiar el tipo eliminando y recreando la ficha.
  Evita una regla de bloqueo, pero rompe la identidad/historia y contradice el
  contrato de no DELETE y de ficha 1:1.

Confirmed answer: PENDING; source/date: PENDING

### Q4 — Universo del Gasto año y cobertura
E3.3-AC2 exige solo Gastos reales vinculados y ejercicio; falta precisar qué Gastos
cuentan cuando la Referencia es opcional y cómo se presenta una fuente incompleta.

- [x] **Recomendada:** sumar todos los `Gasto` reales vigentes que tengan exactamente
  la Referencia del vehículo, con cualquier Partida/Categoría, cuya Fecha civil caiga
  en el año natural seleccionado. Excluir anulados, Ingresos, Transferencias,
  Amortizaciones, Presupuesto/plan, históricos transitorios no instalados y cualquier
  importe derivado de la fecha de ITV. Importes exactos en céntimos; sin doble cómputo.
  Reutilizar la cobertura/corte de E2.4: si no es verificable, mostrar «Parcial» con
  el subtotal registrado y el motivo, nunca un total completo inventado ni 0 por
  ausencia. Un año futuro sin cobertura no se presenta como 0 verificado.
- [ ] **Alternativa:** sumar solo Gastos cuya Partida sea CAT009. Más restrictivo,
  pero perdería Gastos válidos vinculados a la Referencia y contradiría que CAT009
  sea opcional y que la compatibilidad no se endurezca por la matriz.
- [ ] **Alternativa:** suma directa de lo encontrado sin cobertura/corte. Más simple,
  pero puede presentar un año incompleto como total verificado.

Confirmed answer: PENDING; source/date: PENDING

### Q5 — Ejercicio inicial y cambio de año
El ejercicio natural ya está definido por E2.4; falta decidir qué año se muestra al
abrir la ficha y cómo se comprueba el cambio de ejercicio.

- [x] **Recomendada:** selector explícito de ejercicio en la ficha, separado del Ciclo.
  Al abrir, seleccionar el año natural actual del calendario, igual que el selector
  del Plan anual; es solo un valor inicial de vista, no una referencia financiera ni
  una atribución de hechos. Al cambiar de año, recalcular solo con Fechas reales del
  nuevo año; sin arrastre, copia, saldo inicial ni gasto de ITV trasladado. Años
  pasados y futuros son consultables; el futuro sin cobertura no muestra 0 verificado.
  La fecha de ITV nunca decide el ejercicio del Gasto.
- [ ] **Alternativa:** usar como año inicial el de la referencia temporal central
  (máximo de fechas de Movimientos), evitando el reloj. Más coherente con el corte
  financiero, pero puede abrir un año sin relación con el vehículo si otro módulo
  tiene hechos más recientes.
- [ ] **Alternativa:** abrir siempre en el último año con Gastos del vehículo. Útil
  para consulta histórica, pero oculta que el año natural actual puede estar vacío.

Confirmed answer: PENDING; source/date: PENDING

## Coverage
La specification detallará, tras las respuestas: requisitos funcionales; pantallas y
wireframes 390/1440; datos leídos/escritos; contratos de API; validación; errores;
estados vacío/carga/cobertura parcial; concurrencia/idempotencia; auditoría; seguridad;
y criterios de aceptación numerados con trazabilidad a E3.3-AC1..3.

## Wireframes
Presentados en la [specification §7](15-vehiculos-itv-specification.md#7-pantallas-y-wireframes)
para revisión y aprobación separadas. No se considera aprobado ningún diseño por este
documento.

## Append-only clarifications
Las respuestas y rondas posteriores se anexarán al final; nunca se reescribirán las
preguntas ni las respuestas anteriores.

## Ronda 1 — Respuestas del usuario — 2026-10-26
Estado: **CONFIRMADAS**. Fuente directa: mensaje del usuario «Apruebo las opciones
recomendadas A para Q1–Q5, con estas precisiones». Se transcribe el contenido de
decisión, sin convertirlo en aprobación de specification, wireframes, desarrollo15,
SQL o merge.

- **Q1 — APROBADA A.** Ficha mínima con Referencia como identidad estable, nombre
  visible, matrícula opcional y fechas manuales. No incorporar marca, modelo ni
  kilometraje.
- **Q2 — APROBADA A.** Próxima ITV y cita son fechas independientes; la cita puede
  estar vacía. Sin historial 1:N ni avisos automáticos.
- **Q3 — APROBADA A.** Alta atómica, una ficha por REF de tipo Vehículo, sin unicidad
  global de nombre/matrícula. Renombrar conserva ID e historia. No cambiar Tipo de
  Referencia eliminando o recreando automáticamente la ficha; bloquear operaciones
  incompatibles y exigir decisión explícita.
- **Q4 — APROBADA A.** Gasto anual calculado exclusivamente desde Gastos reales
  vigentes asociados a la REF y pertenecientes al año natural seleccionado por su
  Fecha real, sin filtrar por Categoría/Partida ni mezclar planificación. Mostrar
  cobertura parcial cuando no pueda garantizarse integridad histórica. Distinguir
  ausencia de datos de cero comprobado.
- **Q5 — APROBADA A.** Selector explícito de ejercicio, inicializado al año natural
  actual. Sin arrastre entre ejercicios. No presentar años futuros sin datos como
  importes cero verificados.

Precisión transversal confirmada: mantener una única fuente de verdad para los Gastos
en Movimientos, sin duplicar hechos ni introducir maestros adicionales. Las respuestas
no autorizan implementación, modificaciones de base de datos ni merge.
