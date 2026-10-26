# 19 — E4.1 Instrumentos y Compras de inversión: Brainstorming

Status: CERRADO funcional — ronda 1 respondida por el usuario el 2026-10-26; correcciones de las
revisiones independientes incorporadas el 2026-10-26 (H1/H2/H3, N1–N12, rev5–rev7 con R6,
el residual R4-1 y el contrato de esquema v14); SPEC19 rev7 **aprobada** el 2026-10-26 sobre
el commit `47f469a902330ac199c910225563f909bd5116eb`, incluidos wireframes y testplan. La
**rev8** es un ajuste técnico a la versión 16, pendiente de aprobación. DEV, merge y despliegue
no autorizados.
Roadmap/context: [E4.1 y límites E4.2/E4.3](roadmap.md), [referencia funcional R5](functional-reference-v5.11.md),
[E1.1 Saldos](01-saldos-control-specification.md), [E1.3 referencia temporal](03-ciclos-financiados-specification.md),
[E1.5 Transferencias y Referencias](05-transferencias-referencias-specification.md),
[guía UI](guidelines/ui.md), [guía de arquitectura](guidelines/architecture.md).
Base de la ronda: `e408b1da5ae9f45c9bfd139d11f362216b5bce26`, rama
`codex/pilot-full-e41-instrumentos-compras-inversion`. Documento histórico de brainstorming;
no autoriza desarrollo, SQL, migraciones, pruebas ejecutables ni datos reales.
Next action: aprobar la rev8 técnica (versión 16) y repetir el gate pre-DEV sobre refs
locales/remotos; DEV/merge/despliegue siguen sin autorización.

## Alcance de la ronda

E4.1 debe permitir mantener Instrumentos de inversión e ingresar Compras conservando su
ejecución económica, sin crear Movimientos ni adelantar Ventas o valoración. La ronda
pregunta solo lo que no resuelven el roadmap, la referencia v5.11, los contratos E1
aprobados ni las guías. Todo ejemplo numérico es ficticio.

### Ya resuelto por las fuentes (no se pregunta)

| Decisión | Fuente | Consecuencia para E4.1 |
| --- | --- | --- |
| Compras/Ventas solo en el registro de inversión; nunca Gasto/Compra en Movimientos; sin tipos nuevos de Movimiento | R2, R5, E4.1-AC1 | La compra no crea Movimiento, no ejecuta Presupuesto y no usa Partida ni Referencia. |
| Aportar efectivo al bróker es una Transferencia, no una compra | R5, prueba E4.1 | Financiación y compra son hechos distintos; ninguna crea la otra. |
| Efectivo del bróker y saldo de inversión son distintos | R5, F1, E4.1-AC2 | Efectivo: Tipo Efectivo/Control Inversiones. Inversión: Tipo Inversión/Control Inversiones. |
| Posición = Saldo de inversión + Instrumento; cantidad = Compras − Ventas | R5 | La posición se identifica por esa pareja y es un derivado, no un acumulado editable. |
| Un mismo Instrumento puede estar en varios Saldos de inversión | R5 y prueba E4.2 «misma inversión en dos saldos» | Habrá una posición por Saldo+Instrumento; no se impone unicidad global por instrumento. |
| Ixxx estable; nombres editables no son clave; IDs de operaciones únicos y no reutilizables; ISIN solo con evidencia | R1, R5, E4.1-AC2 | Identidad por ID; el ISIN no se inventa ni se deduce del nombre. |
| Cada operación conserva Saldos efectivo/inversión, instrumento, cantidad, precio en divisa, cambio histórico cuando no EUR, EUR realmente cargado/cobrado y comisiones aplicables | R5, E4.1-AC3 | Son datos del hecho; el cambio actual no los reescribe. |
| Divisas: EUR es base; importes EUR en céntimos exactos y JSON decimal; fechas económicas civiles | E1.1 DT2 | No float ni `number` para dinero; UTC solo para auditoría técnica. |
| E4.1 no incluye Ventas, valoración, resultado ni rentabilidad | Roadmap E4.1/E4.2/E4.3 | La posición muestra cantidad y hechos, no valor actual ni resultado. |
| Acceso, sesión MFA, CSRF, Origin y errores se reutilizan de E1 | T-SEG, guías de seguridad y calidad | Sin autenticación ni permisos paralelos. |
| Tema claro, shell, tokens y componentes existentes; 390/1440 | Guía UI aprobada | Sin modo oscuro, librería UI ni componentes innecesarios. |
| Datos solo ficticios; Excel maestro hasta P7 | T-SEG, P7, roadmap | Sin datos reales, importación ni despliegue. |

## Round 1 — 2026-10-26

### Q1 — Contenido mínimo del Instrumento y evidencia del ISIN

Question: ¿Qué campos mínimos identifican un Instrumento y cómo se conserva la evidencia
exigida para un ISIN?

- [x] Recommend: `Ixxx`, nombre obligatorio, ISIN opcional con una **referencia de evidencia**
  obligatoria cuando exista (texto breve auditado, por ejemplo extracto ficticio y fecha),
  y divisa de referencia opcional usada solo para preselección/visualización, sin obligar la
  divisa de cada Compra. Sin tipo de activo, mercado, ticker, país ni adjuntos.
  — Mantiene el mínimo que exige R5, permite acreditar el ISIN y evita clasificaciones no
  demostradas por la fuente.
- [ ] Alternative: añadir tipo de activo (Fondo/Acción/ETF…), mercado y ticker obligatorios.
  — Mejora la descripción, pero crea dominios y obligatoriedad no confirmados y puede
  bloquear altas legítimas.
- [ ] Alternative: ISIN opcional sin campo de evidencia, aceptando solo la confirmación del
  usuario al guardar. — Simplifica el formulario, pero debilita «ISIN solo con evidencia» y
  no deja rastro consultable de la procedencia.

Consequence: la opción marcada define identidad y campos obligatorios del alta y de la ficha;
las demás cambiarían validaciones, DTO y criterios de aceptación. La evidencia no es un
adjunto ni un dato financiero y no se publica en artefactos.

Confirmed answer: Recommend (option 1) — maestro mínimo, ISIN opcional con evidencia,
`Ixxx` permanente y auditoría; la validación sintáctica no certifica validez registral.
source/date: mensaje del usuario, 2026-10-26

### Q2 — Unicidad y validación del ISIN y del nombre

Question: ¿Se impide repetir un ISIN y qué validación de formato se aplica?

- [x] Recommend: ISIN único cuando está informado, comparando sin distinguir mayúsculas ni
  espacios de borde; formato de 12 caracteres alfanuméricos **sin** validar el dígito de
  control; si coincide, se bloquea el alta y se enlaza al Instrumento existente. El nombre
  no es único. — Evita duplicar el mismo valor con distinta caja y no inventa una validación
  que la fuente no exige.
- [ ] Alternative: sin unicidad; solo aviso de posible duplicado con confirmación explícita.
  — Permite homónimos y errores de captura, y complica la posición sin resolverla.
- [ ] Alternative: unicidad más validación completa del dígito de control y del prefijo de
  país. — Mayor calidad del dato, pero añade una regla externa no confirmada y rechaza
  valores que el usuario podría necesitar conservar como histórico.

Consequence: la opción marcada fija el índice lógico, el error de duplicado y la comparación;
la segunda obliga a un flujo de confirmación; la tercera exige especificar el algoritmo y
sus mensajes antes de desarrollo.

Confirmed answer: Recommend (option 1) — ISIN único cuando está informado, comparado
normalizado (sin distinguir mayúsculas ni espacios de borde); sin validación del dígito de
control; el nombre no es único.
source/date: mensaje del usuario, 2026-10-26

### Q3 — Ciclo de vida del Instrumento: renombrar, editar y desactivar

Question: ¿Cómo se corrigen los datos del Instrumento y qué ocurre al desactivarlo?

- [x] Recommend: renombrar conserva `Ixxx` y todos los enlaces; editar ISIN o divisa de
  referencia se audita y aplica las reglas de Q1/Q2; desactivar impide nuevas compras y
  conserva historial y posiciones consultables; reactivar vuelve a permitir compras; sin
  borrado físico ni recreación. — Reutiliza el patrón P4/E1.1 sin convertir el Instrumento
  en un maestro versionado.
- [ ] Alternative: ISIN y divisa de referencia inmutables tras la primera compra; solo el
  nombre editable. — Protege la identificación histórica, pero impide corregir un ISIN mal
  transcrito y obliga a crear otro Instrumento.
- [ ] Alternative: sin desactivación; solo renombrar. — Menos estados, pero un Instrumento
  obsoleto seguiría siendo seleccionable para nuevas compras.

Consequence: la opción marcada define estados, validaciones de edición y el bloqueo de
selección; las otras cambian el formulario y los criterios de aceptación.

Confirmed answer: Recommend (option 1) — renombrar conserva `Ixxx`; editar ISIN o divisa de
referencia se audita; desactivar impide nuevas compras y conserva historial; reactivar
vuelve a permitir compras; sin borrado físico. Los cambios del maestro no reescriben divisa
ni cambio histórico de operaciones existentes.
source/date: mensaje del usuario, 2026-10-26

### Q4 — Saldos de efectivo e inversión y emparejamiento

Question: ¿Cómo se eligen los dos Saldos de una Compra y se evita emparejar cuentas que no
corresponden al mismo bróker, si no existe un maestro de bróker?

- [x] Recommend: selección explícita por compra de un Saldo de efectivo (`Efectivo`/`Inversiones`
  activo) y uno de inversión (`Inversión`/`Inversiones` activo), obligatoriamente distintos;
  sin maestro de bróker, sin emparejamiento automático y sin recordar una pareja por
  Instrumento. El mismo Instrumento puede tener posiciones en varios Saldos de inversión.
  — Conserva los dos IDs que exige R5, hace visible el efecto en efectivo y no inventa una
  entidad nueva.
- [ ] Alternative: un único Saldo «bróker» que agrupe efectivo e inversión. — Simplifica el
  alta, pero contradice F1/R5 y exigiría remodelar E1.1.
- [ ] Alternative: recordar automáticamente la última pareja de Saldos por Instrumento. — Menos
  pasos, pero puede debitar el efectivo equivocado y oculta la elección real.

Consequence: la opción marcada fija el formulario, las FK de la compra y la validación de
tipos; la segunda no es compatible con los contratos vigentes sin reabrirlos; la tercera
exige además una regla de persistencia y edición de la pareja.

Confirmed answer: Recommend (option 1) — selección explícita de un Saldo de efectivo
`Efectivo`/`Inversiones` y uno de inversión `Inversión`/`Inversiones`, activos y distintos;
sin emparejamiento recordado; un Instrumento puede tener posiciones en varios Saldos. No se
altera E1.1: E4.1 implementa el motor pendiente de `Efectivo`/`Inversiones` y añade Compras
a su fórmula.
source/date: mensaje del usuario, 2026-10-26 (contrato E1.1 verificado por el coordinador)

### Q5 — Contrato de la Compra, fecha y comisiones

Question: ¿Qué datos son obligatorios en una Compra y cómo se representa la comisión?

- [x] Recommend: fecha civil obligatoria y no futura; cantidad y precio unitario estrictamente
  positivos; divisa ISO 4217 obligatoria; cambio histórico obligatorio solo si la divisa no
  es EUR (EUR se trata como 1); **importe EUR realmente cargado obligatorio**; comisión
  opcional **en EUR, ya incluida en el importe cargado** y mostrada como desglose informativo
  (no se resta otra vez); concepto y nota libres. Sin Partida, Referencia, Ciclo ni Deuda.
  — Conserva el hecho observado, evita doble cargo y no crea clasificaciones que no
  corresponden a una compra.
- [ ] Alternative: comisión en la divisa de la operación, convertida con el mismo cambio y
  **sumada** al importe cargado; el efectivo baja por bruto más comisión. — Refleja mejor
  operaciones con comisión en divisa, pero exige otra conversión y un redondeo adicional.
- [ ] Alternative: sin campo de comisión; solo importe EUR cargado. — Es el contrato más
  simple, pero pierde el desglose que R5 menciona cuando corresponde.

Consequence: la opción marcada hace que el efectivo baje exactamente por el importe cargado;
la segunda cambia la fórmula de efectivo; la tercera reduce los campos y la trazabilidad.
La prohibición de fecha futura sigue el patrón de E1.4/E1.5, no una regla nueva de inversión.

Confirmed answer: Recommend (option 1) — fecha civil obligatoria y no futura; cantidad y
precio positivos; divisa ISO 4217; cambio histórico solo si no es EUR; **EUR realmente
cargado es la fuente de verdad**; comisión opcional en EUR **ya incluida**, nunca se vuelve
a sumar ni restar; sin Partida, Referencia, Ciclo ni Deuda.
source/date: mensaje del usuario, 2026-10-26

### Q6 — Precisión, redondeo y origen del importe EUR

Question: ¿Quién fija el importe EUR efectivo y con qué precisión se tratan cantidad, precio,
cambio y redondeo? (DT2)

- [x] Recommend: el usuario introduce el **importe EUR realmente cargado** en céntimos
  exactos; el sistema calcula `cantidad × precio × cambio` solo como referencia y muestra la
  diferencia, sin sobrescribir el dato observado. Escalas propuestas: cantidad hasta 8
  decimales, precio hasta 6 y cambio hasta 6; una precisión mayor se rechaza, nunca se
  redondea en silencio. — Prioriza el hecho bancario real y evita que un redondeo del motor
  sustituya lo que se pagó.
- [ ] Alternative: el sistema deriva el importe EUR con redondeo al céntimo (mitad hacia
  arriba) y el usuario no lo edita. — Es más simple y reproducible, pero no puede representar
  comisiones, redondeos del bróker ni diferencias reales.
- [ ] Alternative: el usuario introduce el importe y el sistema exige coincidencia exacta con
  el derivado. — Garantiza coherencia aritmética, pero rechaza compras reales cuya diferencia
  es precisamente el dato que hay que conservar.

Consequence: la opción marcada fija DTO, validación, indicador de diferencia y pruebas de
precisión; la segunda traslada la autoridad al motor; la tercera convierte cualquier
diferencia en error. Las escalas propuestas no son una decisión aprobada hasta responder Q6.

Confirmed answer: Recommend (option 1) — el EUR realmente cargado es la fuente de verdad; la
diferencia con `cantidad×precio×cambio` es informativa; escalas aprobadas cantidad 8 /
precio 6 / cambio 6, validadas en API y persistencia, rechazando exceso de precisión sin
redondeo silencioso.
source/date: mensaje del usuario, 2026-10-26

### Q7 — Validación de efectivo suficiente

Question: ¿Qué ocurre si una Compra dejaría el efectivo del Saldo elegido por debajo de cero?

- [x] Recommend: bloquear el alta si el efectivo calculado del Saldo de efectivo, **a la fecha
  de la compra**, quedaría negativo; mostrar disponible y necesario, sin override en E4.1. No
  se impone «saldo ≥ 0» a los Saldos en general ni a sus aperturas (E1.1 no lo hace). — Evita
  compras imposibles sin reabrir la semántica de Saldos.
- [ ] Alternative: avisar y permitir guardar, mostrando el efectivo negativo. — Refleja
  correcciones o cargas bancarias posteriores, pero deja posiciones de efectivo negativas sin
  una regla aprobada.
- [ ] Alternative: no validar y guardar siempre. — Máxima flexibilidad, pero permite errores
  silenciosos y contradice la validación de integridad del resto de hechos.

Consequence: la opción marcada exige calcular el efectivo a la fecha y definir el error; la
segunda exige un estado de aviso y su presentación; la tercera elimina una validación
financiera relevante. La fórmula usa apertura + entradas − salidas − Compras + Ventas, sin
filtro por Fecha apertura, como F3; el detalle mensual histórico no se adelanta.

Confirmed answer: Recommend (option 1) — bloquear compras que dejen negativo el efectivo
disponible a la fecha; para operaciones retroactivas comprobar también los saldos
posteriores afectados (mínimo del saldo corriente desde la fecha de la compra en adelante,
ventas=0 en E4.1); sin alterar aperturas y sin convertir la validación en regla global de
Saldos.
source/date: mensaje del usuario, 2026-10-26

### Q8 — Corrección y anulación de una Compra

Question: ¿Cómo se rectifica o anula una Compra y qué se conserva?

- [x] Recommend: rectificar fecha, cantidad, precio, divisa, cambio, importe EUR o comisión
  con vista de impacto (efectivo y cantidad antes/después), motivo y revisión; cambiar
  Instrumento o Saldos exige anular y crear otra compra; anular conserva el registro, lo
  excluye de efectivo y posición y no borra; auditoría append-only. — Sigue el patrón
  E1.4/E1.6 y evita reescribir la identidad económica de la operación.
- [ ] Alternative: permitir también cambiar Instrumento y Saldos en la rectificación. — Más
  flexible, pero puede mover la misma compra entre posiciones y confundir la trazabilidad.
- [ ] Alternative: solo anular y volver a crear; sin rectificación. — Más simple, pero deja
  dos registros para un mismo error y complica la lectura histórica.

Consequence: la opción marcada fija el flujo de impacto, los campos rectificables y la
auditoría; la segunda amplía el impacto a dos posiciones y dos Saldos; la tercera elimina la
rectificación y obliga a duplicar hechos.

Confirmed answer: Recommend (option 1) — rectificaciones auditadas con impacto, motivo y
revisión; cambiar Instrumento o Saldos exige anular y crear otra; se conservan originales;
las anuladas se excluyen de posición y efectivo. Los cambios del maestro no reescriben
divisas ni factores históricos de operaciones existentes.
source/date: mensaje del usuario, 2026-10-26

### Q9 — Contribución de las fechas de inversión a la referencia temporal

Question: ¿E4.1 incorpora ya las fechas de las Compras a la referencia temporal compartida o
se aplaza a E4.2, como sugiere E4.2-AC3?

- [x] Recommend: E4.1 integra las Compras vigentes en el máximo de fechas de la referencia
  compartida desde su entrega; rectificar o anular recalcula el máximo real y la cabecera
  declara la fuente Inversión instalada. E4.2 añadirá las Ventas. — R3 ya define la fuente de
  inversión y entregar compras sin reflejar su fecha dejaría la referencia incompleta.
- [ ] Alternative: aplazar a E4.2 (E4.2-AC3); E4.1 no altera la referencia y declara la fuente
  Inversión como pendiente. — Reduce el alcance de E4.1, pero la cabecera ignoraría hechos ya
  registrados y habría que explicar la brecha.
- [ ] Alternative: aplazar a E4.7. — Mantiene E4.1 mínimo, pero prolonga una referencia
  incompleta durante varias entregas.

Consequence: la opción marcada añade integración y pruebas de máximo/retroceso a E4.1; las
otras exigen declarar cobertura pendiente y no permiten usar la compra como fuente temporal.
No se cambia la regla R3 de máximo de fechas ni se usa el reloj.

Confirmed answer: Alternative «aplazar a E4.2» (E4.2-AC3) — no la opción recomendada. E4.1
no modifica el máximo de la referencia temporal; la integración pertenece a E4.2-AC3 y se
declara la dependencia.
source/date: mensaje del usuario, 2026-10-26

### Q10 — Pantallas y navegación

Question: ¿Cómo se agrupan Instrumentos y Compras en la navegación y qué muestra la ficha?

- [x] Recommend: un módulo **Inversiones** con dos pestañas, **Instrumentos** y **Compras**;
  la ficha del Instrumento muestra sus posiciones por Saldo (cantidad) y su historial de
  compras, con acceso a «Nueva compra» preseleccionando el Instrumento; el módulo muestra
  además una tarjeta de solo lectura del efectivo del bróker con enlace a Saldos. — Agrupa el
  flujo completo sin duplicar entradas de menú y hace visible la separación efectivo/posición.
- [ ] Alternative: dos entradas de menú independientes, Instrumentos y Compras. — Acceso más
  directo a cada listado, pero separa dos vistas que se usan juntas y duplica navegación.
- [ ] Alternative: una sola pantalla con listado y formulario embebido. — Menos páginas, pero
  mezcla consulta y escritura y empeora el foco/teclado en móvil.

Consequence: la opción marcada fija el mapa de pantallas y los wireframes W1–W6; las otras
cambian navegación, jerarquía y los recorridos E2E, no la lógica financiera.

Confirmed answer: Recommend (option 1) — módulo **Inversiones** con pestañas Instrumentos y
Compras; posiciones derivadas por Saldo; historial; efectivo de solo lectura enlazado a
Saldos. No se presenta como posición completa un resultado con cobertura histórica parcial:
la UI lo declara.
source/date: mensaje del usuario, 2026-10-26

## Coverage

| Área | Tratada en |
| --- | --- |
| Requisitos funcionales, alcance y exclusiones | Ya resuelto; Q1–Q5, Q8–Q10 |
| Identidad, campos y ciclo de vida del Instrumento | Q1–Q3 |
| Relación Instrumento/Saldos y selección de efectivo/inversión | Q4 |
| Contrato económico de la Compra y comisiones | Q5 |
| Precisión, redondeo y EUR efectivo (DT2) | Q6 |
| Validación de efectivo y bordes monetarios | Q7 |
| Corrección, anulación e impacto histórico | Q8 |
| Referencia temporal compartida | Q9 |
| Pantallas, navegación y estados | Q10; wireframes de la especificación |
| API, persistencia, concurrencia y seguridad | Contratos E1 reutilizados; propuesta en la especificación |
| Datos leídos/escritos | Especificación §5; sin datos reales |
| Dependencias externas | Ninguna; sin cotizaciones, bancos ni servicios nuevos |

## Wireframes

APROBADOS como parte de SPEC19 rev7 por el usuario el 2026-10-26. Q10 confirmada: módulo
**Inversiones** con pestañas Instrumentos y Compras. Los esquemas ASCII viven en la
[especificación](19-instrumentos-compras-inversion-specification.md#9-pantallas-y-wireframes-aprobadas-rev7):
W1 listado de Instrumentos 1440, W2 ficha/posición 1440, W3 alta de Compra 1440,
W4 listado de Instrumentos 390, W5 ficha/posición 390, W6 alta de Compra 390,
W7 pestaña Compras 1440, W8 pestaña Compras 390, W9 impacto/rectificación/anulación 1440 y
W10 impacto/rectificación/anulación 390.
La aprobación documental no es una prueba de UI implementada.

## Append-only clarifications

### Ronda 1 — respuestas confirmadas 2026-10-26

Fuente: mensaje del usuario, 2026-10-26. Las propuestas y alternativas de esta ronda se
conservan sin reescribir; esta sección fija únicamente lo confirmado. La aprobación de la
especificación sigue pendiente y no se declara en este documento.

| Q | Estado | Respuesta confirmada |
| --- | --- | --- |
| Q1 | Respondida | Maestro mínimo de Instrumentos; ISIN opcional con evidencia obligatoria cuando exista; `Ixxx` permanente; auditoría. La validación sintáctica del ISIN no certifica validez registral. |
| Q2 | Respondida | Unicidad del ISIN normalizado (sin distinguir mayúsculas ni espacios de borde); sin validación del dígito de control; el nombre no es único. |
| Q3 | Respondida | Renombrar conserva `Ixxx`; editar ISIN/divisa se audita; desactivar/reactivar sin borrado; los cambios del maestro no reescriben divisas ni factores históricos de operaciones existentes. |
| Q4 | Respondida | Selección explícita de dos Saldos activos y distintos, sin emparejamiento recordado; un Instrumento puede tener posiciones en varios Saldos. E1.1 no se altera. |
| Q5 | Respondida | El EUR realmente cargado es la fuente de verdad; comisión opcional en EUR ya incluida, nunca se vuelve a sumar ni restar; sin Partida/Referencia/Ciclo/Deuda. |
| Q6 | Respondida | Importe EUR introducido; diferencia con `cantidad×precio×cambio` informativa; escalas cantidad 8 / precio 6 / cambio 6, validadas en API y persistencia, rechazando exceso sin redondeo silencioso. |
| Q7 | Respondida | Bloquear si el efectivo disponible a la fecha quedaría negativo; en retroactivas comprobar también los saldos posteriores afectados; sin alterar aperturas y sin regla global de Saldos. |
| Q8 | Respondida | Rectificaciones auditadas con impacto, motivo y revisión; cambiar Instrumento o Saldos exige anular y crear otra; originales conservados; anuladas excluidas de posición y efectivo. |
| Q9 | Respondida | E4.1 no modifica el máximo de la referencia temporal; la integración pertenece a E4.2-AC3. Se documenta la dependencia y no se promete integración en E4.1. |
| Q10 | Respondida | Módulo Inversiones con pestañas Instrumentos y Compras; posiciones derivadas por Saldo; historial; efectivo de solo lectura enlazado a Saldos; cobertura histórica parcial declarada. |

Precisiones registradas con las respuestas, sin reabrir E1.1 ni R3:

- **Q4 — contrato E1.1 verificado.** E1.1 define `Efectivo`/`Inversiones` como efectivo del
  bróker (apertura + entradas − salidas − Compras + Ventas) e `Inversión`/`Inversiones` como
  posición/valoración (E4.3). `apps/api/src/saldos.ts` admite el par y devuelve «Motor
  Inversiones pendiente de entrega»; el fixture `S003` «Efectivo de inversión demo» es
  `Efectivo`/`Inversiones` y `S004` «Cartera de inversión demo» es `Inversión`/`Inversiones`.
  `Efectivo`/`Movimientos` es caja/banco normal y no incorpora Compras. E4.1 implementa el
  motor pendiente de `Efectivo`/`Inversiones` y añade Compras a su fórmula.
- **Nota histórica v5.10.** La observación del usuario sobre Control Movimientos es
  histórica y no cambia el contrato v5.11/E1.1.
- **Q9.** La opción confirmada es la alternativa «aplazar a E4.2 (E4.2-AC3)», no la
  recomendación de integración de la ronda.
- **Q10.** Un resultado con cobertura histórica parcial no se presenta como posición
  completa; la UI declara el alcance y la valoración sigue pendiente de E4.3.

### Ronda 2 — correcciones de la revisión independiente 2026-10-26

Fuente: mensaje del usuario con las decisiones H1-1, H2-5, H2-8 y H3-7 ya fijadas y el
paquete de correcciones H1/H2/H3. No se reabren Q1–Q10; se registra cómo se aplican en la
especificación y el testplan. La aprobación sigue pendiente.

| ID | Corrección confirmada | Destino |
| --- | --- | --- |
| H1-1 | El efectivo del bróker se calcula con motor único; Liquidez respeta el flag existente (`S003` tiene `liquidez=1` → pasa a incluirse); la previsualización de Transferencias calcula ambos extremos; E4.1 no reescribe R6. | §4.3.3, AC-38, AC-39, AC-41 |
| H1-2 | Un Saldo con Compras no cambia `tipo`, `control`, `saldoApertura`, `fechaApertura` ni `permiteSalidaExterior` (409 sin escritura); desactivar/reactivar sí. Extensión de integración de E1.1 AC-14. | §4.1, §8, AC-42 |
| H1-3 | Auditoría dedicada `instrumento_audit` y `operacion_inversion_audit`; `audit` no se altera; consulta de auditoría de Instrumento y Compra. | §5, §7, AC-43 |
| H2-1 | `Efectivo`/`Inversiones` → efectivo; `Inversión`/`Inversiones` sigue «No disponible hasta E4.3» (`S004`). | §4.3.3, AC-40 |
| H2-2 | Rectificación con reemplazo completo del payload; omitidos rechazados; `null` solo limpia nullable. | §4.5, AC-45 |
| H2-3 | Fecha no futura = día civil `Europe/Madrid` con `spanishToday`; el reloj no es fecha económica. | §11, AC-44 |
| H2-4 | Saldo inactivo con Compras sigue computando y consultable; solo se bloquea nueva selección; reactivar lo recupera. | §4.3.3, AC-49 |
| H2-5 | Varios `Efectivo`/`Inversiones` se listan por separado con su cifra; sin agregado; selección explícita obligatoria. | §9, AC-48 |
| H2-6 | Retroactiva negativa → 422 con fecha/importe del mínimo; válida aceptada; cambiar Instrumento/Saldos → 422; anular+crear con distinta identidad. | §4.5, AC-46, AC-47 |
| H2-7 | Wireframes W7–W10 para Compras e impacto/rectificación/anulación. | §9, AC-30, AC-37 |
| H2-8 | DT7 (mapping/importación) aplazado a E4.5/E4.12 como desviación explícita. | §5.2, §12, §14 |
| H2-9 | Límites de magnitud de cantidad, precio y cambio por entero escalado. | §6, AC-50 |
| H3-1 | Comisión ≥ 0 y ≤ importe; ISIN ASCII `[A-Z0-9]{12}`; cambio EUR 1 o rechazo; longitudes; `divisaReferencia` ISO 4217. | §4.1, §4.2, §11 |
| H3-2 | AC-20 determinista; DELETE con código esperado; AC-24 sin condicionales; AC-34 con causa concreta; impacto/GET no escribe. | §7, §13 |
| H3-3 | Filtro de W1 coherente con la fila Inactiva. | §9 |
| H3-4 | `revision` y `motivo` en desactivar/reactivar/anular; 409 obsoleto; consulta de auditoría. | §7, AC-07, AC-26, AC-43 |
| H3-5 | Nombres reales `S003` «Efectivo de inversión demo» y `S004` «Cartera de inversión demo»; sin afirmar Instrumentos `Ixxx` previos (secuencia inicial `I1001`); `S006` por el servicio. | §4.3.1, §5.1, §5.2, §9 |
| H3-6 | Sin mecanismo de backup nuevo; el existente versiona y restaura las tablas nuevas. | §5.2, §8, AC-33 |
| H3-7 | Convención de agregación a fin de día declarada y probada con hechos del mismo día. | §4.3.2, AC-35, AC-46 |
| H3-8 | `S001` no cambia por una Compra; normalización de búsqueda por ISIN; filtro Saldo sobre ambas columnas. | §7, §11, AC-21, AC-23 |

### Ronda 3 — decisiones de la revisión final 2026-10-26

Fuente: mensaje del usuario, 2026-10-26. No se reabren Q1–Q10 ni H1–H3; se registran las
tres decisiones que cambian el contrato. Las correcciones N1, N4–N8 y N10–N12 son de forma,
coherencia y verificación, se aplican en la specification y el testplan y no introducen
decisiones nuevas. La aprobación sigue pendiente.

| ID | Decisión confirmada | Destino |
| --- | --- | --- |
| N2 | Liquidez mantiene `Verificado` y añade una nota explícita de cobertura histórica no importada; no cambia R6 y se elimina el oráculo condicional. | §4.3.3, AC-39, testplan F5/F7 |
| N3 | La previsualización y `financeRevision` cubren todo Movimiento que toque `Efectivo`/`Inversiones` (Gasto, Ingreso, Transferencia, Amortización); una Compra invalida una previsualización obsoleta. | §4.3.3, §8, AC-41, AC-53 |
| N9 | El cambio de Estado de un Saldo conserva el cuerpo E1.1 (solo `revision`), sin motivo humano; se documenta como exclusión y no se amplía E1.1. | §3.1, §4.1, §12 |

### Ronda 4 — delta técnico R6 y residual R4-1 (2026-10-26)

Fuente: revisión final del delta documental, continuada tras el corte de la sesión anterior.
No se reabren Q1–Q10 ni H1–H3; no se repite el brainstorming. Esta ronda solo registra cómo
quedan aplicadas en la specification y el testplan las tres correcciones de cierre, sin tocar
las sesiones de Compartidos ni de Vehículos.

| ID | Corrección aplicada | Destino |
| --- | --- | --- |
| R6-1 | **Coordinación de esquema.** E4.1 propone la versión **15** (provisional, condicionada a revalidación de destino), no la 14. La 14 está reservada operativamente por dos desarrollos no integrados en `main`: Compartidos/PR75 (`refs/pull/75/head` = `fce1107`, rama `codex/dev14-base-b`, `schemaVersion = 14`) y Vehículos (`codex/pilot-dev15-deepseek`, commit congelado `c69e343`, cuyo código usa `schemaVersion = 14`; el HEAD posterior `28d4816` no cambia el esquema; su especificación no fija versión, así que la 14 es reserva operativa). Sus especificaciones están integradas como documentación (PR74/PR78), pero su código no; `main` conserva el esquema 13. E4.1 no reabre ni modifica esas sesiones: solo evita la colisión con migración aditiva 15, upgrade 13→15 y 14→15 con contrato verificado, compuertas `1..15` y restore en directorio nuevo sin mezclar versiones, que vacía intentos y sesiones. Si una entrega v14 se integra después de E4.1, renumera en su propia rama; E4.1 no cambia. | §3.1 (R6-1), §5.2, AC-33 |
| R6-2 | **Errores de concurrencia unívocos.** Insuficiencia de efectivo, incluida la recalculada dentro de la transacción, → 422 `INSUFFICIENT_CASH`; `revision` obsoleta → 409 `REVISION_CONFLICT`; huella/contexto de **Movimiento** obsoleto → 409 `IMPACT_CHANGED`; guard de impacto de Saldo → 409 `HISTORY_LOCKED`. Se elimina cualquier 409 genérico por concurrencia y ningún 409 expresa falta de efectivo. Las rutas de Compra no transportan huella y usan `revision`. | §3.1 (R6-2), §4.3.2, §4.5, §7, §8, §10, §11, AC-16, AC-20, AC-25, AC-26, AC-35, AC-42, AC-46, AC-53 |
| R4-1 | **Residual redaccional de AC-41.** La precondición queda ejecutable y ordenada: partir de `S003` sin Movimientos ni Compras, fijar `permiteSalidaExterior=true` antes de cualquier Compra, crear después las Compras del fixture y preparar Partida/Subtipo/Deuda antes de previsualizar Gasto, Ingreso, Transferencia y Amortización. Se elimina la alternativa del Saldo dedicado y el resultado se enuncia sobre el extremo del Saldo de prueba utilizado. | §3.1 (R6-3/R4-1), §13 AC-41, testplan AC-41 |

La aprobación de la specification sigue pendiente; desarrollar E4.1 no está autorizado.

### Ronda 5 — cierre del contrato de esquema v14 (2026-10-26)

> **Histórico:** esta ronda queda sustituida por la Ronda 6 (versión 16); se conserva para
> trazabilidad.

Fuente: verificación de Codex del checkpoint anterior. No se reabren decisiones funcionales;
solo se cierra el contrato técnico de compatibilidad y la revalidación de destino.

| ID | Corrección aplicada | Destino |
| --- | --- | --- |
| R7-1 | **No se acepta una base v14 por su número.** Solo se admiten dos contratos delimitados y verificados en objetos: `C14-COMPARTIDOS-FCE1107` (commit `fce1107`) y `C14-VEHICULOS-C69E343` (commit `c69e343`; el HEAD posterior `28d4816` no cambia el esquema). Antes de `BEGIN IMMEDIATE`, `journal_mode`, DDL, backup o cambio de `schema_version` se compara el manifiesto canónico exacto de `sqlite_master` y las invariantes del contrato. El manifiesto y su SHA-256 se generan y registran antes de DEV; sin ellos el gate falla. Una variante desconocida, incompleta, con SQL alterado, con objetos extra, con tablas sintéticas o con contratos mezclados se rechaza con el literal `Contrato de esquema v14 desconocido o incompleto; no se modificará esta base.`; el soporte de cualquier otro contrato v14 queda bloqueado hasta una revisión autorizada. `database.ts` se reordena para que la comprobación preceda a PRAGMAs persistentes y a la transacción de identidad; el restore verifica el manifiesto de una copia v14 antes de publicarla. | §3.1 (R7-1), §5.2, §8, AC-33, testplan AC-33 |
| R7-2 | **Revalidación de destino antes de DEV.** La reserva 15 es provisional y no prevalece sobre `main`. Antes de DEV se comprueba `origin/main` y las reservas abiertas; si `main` ya está en 15 o más, la 15 está ocupada o `main` contiene un v14 no verificado, se detiene la implementación, se renumera esta spec y se repite la revisión. | §3.1 (R7-2), §5.2, AC-33(f), testplan |

La aprobación de la specification sigue pendiente; desarrollar E4.1 no está autorizado.

### Ronda 6 — ajuste técnico a la versión 16 (2026-10-26)

Fuente: autorización del usuario para ajustar E4.1 a la siguiente versión libre, respetando la
reserva 15 de Compartidos. No se reabre ninguna decisión funcional.

| ID | Corrección aplicada | Destino |
| --- | --- | --- |
| R8-1 | **Versión destino 16.** `main` está en 14; `codex/dev14-base-b` (`ad2edfe`) ocupa la 15 con el contrato real `C15-COMPARTIDOS-AD2EDFE`. E4.1 pasa a 16 y mantiene la 15 intacta. Se añade el manifiesto v15 (122 objetos) y se definen rutas 13→16, 14→16 y 15→16, con preservación explícita de las tablas y filas de Compartidos v15 y Vehículos. | §3.1 (R8-1/R8-2), §5.2, §8, AC-33, testplan |
| R8-2 | **Compuertas y restore a 16.** `schemaVersion = 16`, `[1..15, version]`, `1..16`, etiqueta `e4.1-v16`, verificación de manifiestos v14/v15 antes de publicar una copia y rechazo de v17. No se modifica el harness ni se implementa E4.1. | §5.2, §8, AC-33, testplan |

La rev8 es un ajuste técnico documental pendiente de aprobación; DEV, merge y despliegue no
están autorizados.
