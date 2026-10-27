# 20 — E4.5 Histórico precontrol y transición de ejercicio: Brainstorming

Status: **Q1–Q10 CONFIRMADAS por el usuario el 2026-10-27; propuesta documental
actualizada.** Q5-A queda aprobada como modelo documental, no como autorización para
incorporar una regularización concreta sin evidencia. DT7 sigue siendo un gate
independiente y la spec/wireframes no están aprobados en su totalidad. No hay
desarrollo, SQL, migración, importación real, Excel, datos personales, PR ni merge.

Roadmap/context: [E4.5](roadmap.md#e45--histórico-precontrol-y-transición-de-ejercicio),
[P6/DT7](roadmap.md#decisiones-abiertas-y-puntos-de-autorización),
[R1–R6/P6](functional-reference-v5.11.md),
[E1.1](01-saldos-control-specification.md), [E1.2](02-clasificacion-specification.md),
[E1.4](04-movimientos-specification.md), [E1.5](05-transferencias-referencias-specification.md),
[E1.6](06-deuda-specification.md), [E2.4](10-plan-anual-specification.md),
[E4.4](17-e44-deuda-completa-specification.md) y
[E4.7/E4.11/E4.12](roadmap.md#e47--resumen-anual-y-flujo-completo-trazable).
Guías: [arquitectura](guidelines/architecture.md), [seguridad](guidelines/security.md),
[calidad](guidelines/quality.md) y [UI](guidelines/ui.md).

## Preflight y ownership documental — 2026-10-27

- Autorización recibida: preparar especificación, wireframes, testplan, progreso y QA
  documental independiente de E4.5, exclusivamente con datos ficticios. No autoriza
  desarrollo, aplicación, SQL, migraciones, importación real, herramientas definitivas
  de carga, Excel, VPS, infraestructura, B3, harness, despliegue ni merge.
- `origin/main` verificado inicialmente en `26b6f0c` y refrescado durante la
  preparación a `1d539a8cb9c38b3a8d2e3921a3651197105ce282` (2026-10-27,
  `docs(spec17): prepare E4.4 full debt and opening reconciliation (#85)`). La rama documental se rebasa sobre ese main; el delta de E1.5/D5 y la integración de E4.4 se revisan solo para confirmar que mapping, aperturas y precontrol no cambian la frontera de E4.5. El
  checkout principal conserva su rama y su archivo no versionado ajenos.
- Antes de crear este checkout no se localizó rama, worktree, PR ni checkpoint de E4.5.
  No hay otro ejecutor conocido. No se reasigna ni se duplica trabajo.
- Números documentales `13`–`19` están reservados por ramas de otras entregas
  (Anticipos, Compartidos, Vehículos, Revisión Comida, E4.4 y E3.5). `20` está libre en
  `origin/main` y en las ramas remotas comprobadas; se reserva para esta entrega.
- Checkout aislado: rama `codex/spec20-e45-historico-precontrol`, creada desde
  `origin/main` en un worktree temporal propio. No se modifica `epic-board`,
  `project`, `setup-progress`, `session-handoff` ni documentos de otras entregas.
- E4.4 está integrada **documentalmente** en `main` `1d539a8` (#85), pero su cabecera
  mantiene spec/wireframes pendientes: integración no equivale a aprobación. Se revisa
  su frontera de aperturas/precontrol y se confirma que E4.5 no reconstruye
  amortizaciones ni sustituye su motor.
- Fuentes reales: no se ha abierto Excel, base de datos, extracto bancario, archivo
  financiero ni dato personal. La evidencia disponible es la referencia funcional
  sanitizada y los contratos aprobados del repositorio. Los ejemplos de este documento
  son ficticios.

## Decisiones heredadas que no se reabren

| Decisión | Fuente | Consecuencia para E4.5 |
| --- | --- | --- |
| Archivo precontrol no duplica Gastos; cierres trimestrales son inmutables | R6/P6 | El archivo es una fuente histórica separada; no se suma dos veces con Gastos ni se convierte en cierre/foto |
| Preservar IDs, aperturas, hechos/histórico/auxiliares, sin inventar ni duplicar | P6 | IDs internos estables, origen trazable y ausencias conservadas |
| Mapping exhaustivo y conciliación por corte siguen pendientes | DT7/P6 | E4.5 no puede declarar mapping real aprobado ni equivalencia con el Excel |
| Plan anual: histórico transitorio válido con Partida, ejercicio, procedencia y cobertura; sin solapamiento/doble cómputo | E2.4/Q1–Q6 | E4.5 debe entregar un contrato de lectura que E2.4/E4.7 puedan consumir sin recalcular |
| No universalizar regularizaciones específicas de 2026 | R3/E2.4/E4.5-AC3 | La regularización de 2026, si existe, queda acotada a 2026 y a su evidencia; no se convierte en regla general |
| Deudas: apertura, precontrol y amortización real desde Inicio control; no reconstruir hechos | R5/E1.6/E4.4 | E4.5 no reconstruye amortizaciones ni sustituye el motor de Deuda; solo puede mostrar contexto histórico separado |
| Aperturas de Saldos: posición inicial, no Movimiento; ausencia ≠ cero | E1.1/F3 | E4.5 conserva aperturas existentes y no las recalcula ni las convierte en hechos |
| Referencias y Partidas se enlazan por ID; renombrar conserva enlaces | E1.2/P4/E1.5/P2 | El mapping no puede depender del nombre mutable; un renombrado no rompe la historia |
| Cierre financiero y fotografía son posteriores y distintos del archivo | P1/P5/E4.9–E4.11 | Un archivo anterior no se transforma en foto o plan que nunca existió |
| Reloj no es fuente financiera; corte y referencia se declaran | E1.3/E1.4/E2.4 | El corte de E4.5 es un dato de cobertura declarado, no `hoy` ni una fecha universal |
| Datos solo ficticios hasta autorización P6/P7 | Seguridad/P6/P7 | No se incorpora ni se publica información financiera real |

## Ronda 1 — 2026-10-27

Las preguntas siguientes cubren las ambigüedades materiales que no pueden resolverse
con las fuentes actuales. Cada alternativa incluye impacto y un ejemplo ficticio. Una
opción marcada `[x]` es solo la recomendación del redactor; **no es una respuesta
confirmada**.

### Q1 — Grano y forma del archivo histórico

¿Qué representa exactamente una fila de archivo y qué granularidad debe conservar?

- [x] **Recomendada — registro por ejercicio + Partida + intervalo verificado, con
  fecha opcional.** Puede haber varios registros no solapados para una misma
  Partida/ejercicio (por ejemplo, trimestres o periodos históricos), pero no se
  reconstruyen meses ni movimientos individuales que la fuente no demuestre.
  Impacto: encaja con E2.4/E4.7, permite cobertura por intervalos y evita inventar
  detalle. Ejemplo ficticio: PAR100, 2026, `01/01–27/08`, 1.200,00; si la fuente
  solo ofrece el total anual, un único intervalo `01/01–31/12` con fecha nula.
- [ ] **Alternativa — una fila mensual por Partida.** Más precisión para gráficos
  mensuales, pero exige que la fuente tenga meses demostrados y multiplica el mapping.
  Ejemplo: doce filas PAR100/2026, una por mes; un mes ausente no sería cero.
- [ ] **Alternativa — una fila por hecho original con ID de origen.** Máxima
  trazabilidad, pero presupone que el archivo tiene IDs individuales y desglose que
  hoy no están demostrados; se solaparía con Movimientos.

**Confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.**

### Q2 — Universo cubierto por el archivo

¿El archivo contiene solo Gastos/precontrol, o también Ingresos y otras naturalezas?

- [x] **Recomendada — solo Gastos históricos/precontrol, más la regularización 2026
  y, si se aprueba, evidencia de apertura separada.** Es el mínimo que E2.4/E4.7
  necesitan para ejecutado anual y evita inventar historia de ingresos. Ejemplo:
  PAR100/2026, 1.200,00 de Gasto histórico; no se crea un Ingreso histórico.
- [ ] **Alternativa — Gastos e Ingresos históricos con tipos separados.** Permite un
  flujo histórico más completo, pero exige mapping, signos y cobertura de ingresos
  que no están demostrados. Ejemplo: un Ingreso histórico de 2.000,00 no podría
  mezclarse con el Gasto en el mismo total sin contrato de E4.7.
- [ ] **Alternativa — todos los hechos históricos, incluidas Transferencias y
  amortizaciones.** Riesgo alto de duplicar ledgers y de reconstruir operaciones
  ausentes; no se recomienda para E4.5.

**Confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.**

### Q3 — Corte, inicio de control y cobertura

¿Existe un corte único de 2026 para todo el archivo o cada fuente declara el suyo?

- [x] **Recomendada — corte e inicio de control por fuente/dataset, aprobados en DT7.**
  El 27/08/2026 y el control desde 28/08/2026 de C30 son un corte de las Deudas
  indicadas, no una fecha global ni un default de la app. E4.5 exige que cada
  dataset declare `corteArchivo`, `controlDetalle.inicio/fin`, huella y versión.
  Impacto: permite combinar correctamente y evita declarar completo un año con un
  corte ajeno. Ejemplo ficticio: archivo A cubre `01/01–27/08`; detalle B controla
  `28/08–31/12`; el 27/08 es el último día del archivo y el 28/08 el primero del
  control.
- [ ] **Alternativa — un corte único 27/08/2026 para todo 2026.** Simple, pero
  universaliza una regla demostrada solo para ciertas Deudas y puede ocultar huecos
  de otras fuentes. Ejemplo: una Partida sin archivo hasta septiembre quedaría
  presentada como completa por un corte que no le corresponde.
- [ ] **Alternativa — sin corte declarado; consultar cualquier fecha.** Máxima
  libertad, pero no permite afirmar cobertura ni distinguir ausencia de cero.

**Confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.**

### Q4 — Mapping de Partidas, Referencias y nombres

¿Cómo se enlaza una fila histórica con las identidades internas?

- [x] **Recomendada — tabla de mapping versionada por identidad de origen estable,
  con destino por ID.** La identidad de origen combina huella del documento, tabla/
  hoja, ID de origen si existe y coordenada/fila; el nombre original se conserva como
  procedencia, no como clave. El destino es `PARxxx` y, si procede, `REFxxx`; ambos
  por ID. Renombrar la Partida o la Referencia no rompe el mapping.
  Impacto: cumple P2/P4 y permite auditar el renombrado. Ejemplo: origen `REF-OLD-7`
  mapeado a `REF100`; si `REF100` pasa de «Viaje X» a «Viaje Y», el registro sigue
  enlazado y la procedencia muestra «Viaje X».
- [ ] **Alternativa — mapping por nombre normalizado.** Fácil de cargar, pero un
  renombrado o dos homónimos rompen la identidad. Ejemplo: dos «Viaje» distintos se
  sumarían en la misma Partida sin evidencia.
- [ ] **Alternativa — sin mapping; archivo solo como total global.** Seguro pero
  insuficiente para E2.4/E4.7 por Partida; el total no sería consumible.

**Confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.**

### Q5 — Regularización válida de 2026

¿Qué es exactamente la regularización de 2026 y cómo debe representarse?

- [x] **Recomendada — registro explícito y acotado `Regularización 2026`.** Debe
  declarar ejercicio 2026, intervalo, importe/signo, Partida/Referencia si procede,
  motivo, procedencia y mapping aprobado. No se infiere por el nombre de una fila ni
  se aplica a otros ejercicios. Impacto: trazable y verificable; se excluye solo si
  un vínculo de identidad/origen demuestra que ya está representada en Movimientos o
  en un registro separable del archivo. Si está embebida en un agregado, no se resta:
  el total queda no verificable.
  Ejemplo ficticio: PAR900/2026, `15/06/2026`, 50,00, «Regularización 2026», fuente
  F-R26; solo aparece en 2026.
- [ ] **Alternativa — marca de ejercicio (`ejercicio.regularizacion=2026`).** Menos
  filas, pero el flag puede aplicarse a todo el año y ocultar a qué Partida/importe
  corresponde; no se recomienda sin evidencia.
- [ ] **Alternativa — campo del plan anual.** Rechazada como propuesta: los
  transitorios 2026 son histórico/migración, no campos del plan, y crearían un plan
  pasado que no existió.
- [ ] **Alternativa — motor genérico de regularizaciones para todos los años.**
  Rechazada: contradice E4.5-AC3 y no hay regla financiera demostrada.

Pregunta material pendiente: ¿la regularización es un importe positivo, negativo o
un ajuste con efecto explícito? ¿Ya está incluida en el total del archivo o en algún
Movimiento? ¿Tiene Partida/Referencia y fecha demostradas? Sin esa evidencia, E4.5
debe mostrar «No verificable» y no incorporarla; `NoDisponible` se reserva para ausencia
de fuente/cobertura, no para una regularización pendiente.

**Confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.**

### Q6 — Duplicados y procedencia ambigua

¿Cuándo dos filas son el mismo hecho y cuándo son fuentes en conflicto?

- [x] **Recomendada — identidad de origen + huella de contenido; fuentes distintas
  con el mismo periodo/Partida son ambiguas y no se suman automáticamente.** Misma
  identidad y mismo contenido = un solo registro; misma identidad con contenido
  distinto = conflicto; dos documentos distintos con el mismo intervalo/Partida =
  procedencia ambigua, aunque el importe difiera, se muestran por separado y el total
  queda no verificable hasta conciliación. Impacto: evita deduplicar por importe y
  ocultar un error. Ejemplo: dos filas idénticas de F1 se cuentan una vez; F1 y F2 con
  el mismo intervalo PAR100/2026, aunque una diga 1.200,00 y otra 1.250,00, se muestran
  como dos candidatos y no se suman ni se elige una por importe.
- [ ] **Alternativa — deduplicar por Partida + intervalo + importe.** Fácil, pero
  puede colapsar dos hechos legítimos o dos fuentes discrepantes. Ejemplo: dos
  compras históricas distintas de 50,00 en el mismo mes se convertirían en una.
- [ ] **Alternativa — sumar siempre y avisar.** Conserva ambos importes pero duplica
  el gasto; no se recomienda.

**Confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.**

### Q7 — Aperturas e importes originales

¿El archivo incluye aperturas y cómo se conservan?

- [x] **Recomendada — aperturas como evidencia histórica de solo lectura, separadas
  de Gastos y de las aperturas vigentes de Saldos/Deudas.** No se escriben en
  `Saldos.apertura`, `fecha_apertura`, capital de Deuda ni Movimientos; no se suman
  al ejecutado anual. Si una apertura histórica no está en la fuente, se muestra
  «Sin informar», no cero. Impacto: conserva el original sin crear un motor paralelo.
  Ejemplo: el archivo muestra una apertura ficticia de 500,00 para S001; la ficha
  actual de S001 conserva exactamente su apertura y no aparece un Movimiento nuevo.
- [ ] **Alternativa — convertir la apertura histórica en la apertura actual del
  Saldo.** Rechazada: reescribiría la fuente vigente y podría alterar el saldo actual.
- [ ] **Alternativa — excluir aperturas del archivo.** Seguro, pero pierde evidencia
  histórica que el usuario pidió conservar; requeriría otra entrega.

**Confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.**

Las aperturas de **Deuda** quedan fuera de E4.5: E4.4 conserva capital de apertura,
condiciones e historia de Deuda. E4.5 no las enlaza, no las suma y no las convierte en
Saldo/Movimiento.

### Q8 — Filas sin mapping o con verificación parcial

¿Qué ocurre cuando una fila no se puede clasificar o verificar?

- [x] **Recomendada — excluirla del total verificado y mostrarla en «Sin clasificar/
  no verificable» con motivo; el total queda parcial o no calculable, nunca cero.**
  Impacto: no se inventa una Partida ni se oculta el dato. Ejemplo: una fila de
  150,00 sin Partida aparece en la sección separada y no engrosa PAR100.
- [ ] **Alternativa — bloquear toda la consulta del ejercicio.** Más conservador,
  pero impide ver los datos conocidos; se perdería el subtotal útil.
- [ ] **Alternativa — asignar la Partida por nombre o por prefijo.** Rechazada:
  crea clasificación no demostrada y rompe P4/P6.

**Confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.**

### Q9 — Alcance de ingesta de E4.5

¿E4.5 implementa un importador real o solo el contrato de lectura con fixtures?

- [x] **Recomendada — solo lectura y proveedor de fixtures; sin herramienta
  definitiva de migración.** El mapping aprobado se entrega como artefacto versionado
  de solo lectura; el desarrollo autorizado puede cargar fixtures ficticias por un
  mecanismo de prueba, pero no un importador de Excel, una carga real ni una UI de
  mapping. Impacto: respeta la frontera de la autorización y P6/P7.
- [ ] **Alternativa — importador controlado solo para fixtures.** Útil para pruebas,
  pero debe quedar fuera de producción y no convertirse en herramienta definitiva;
  requiere autorización específica.
- [ ] **Alternativa — importador real del Excel.** Fuera de alcance y prohibido en
  esta fase; no se propone.

**Confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.**

### Q10 — Preferencia ante un solapamiento no separable

Si archivo y detalle se solapan y no se puede aislar la parte duplicada, ¿qué fuente
prevalece o se muestra?

- [x] **Recomendada — no elegir fuente ni prorratear; mostrar componentes separados,
  `estadoCobertura=Solapada`, total y subtotal `null`, y el importe solapado en
  `conflictos[]` hasta conciliación.** Es la opción conservadora: no inventa una
  preferencia financiera ni atribuye el solape a archivo o detalle.
  Ejemplo: archivo 1.200 y detalle 320 con 20 solapados; no se presenta 1.500 ni 1.520.
- [ ] **Alternativa — priorizar archivo:** excluir el detalle solapado y conservar el
  archivo. Requiere decisión financiera explícita y justificar por qué el archivo es
  más autoritativo para ese tramo.
- [ ] **Alternativa — priorizar detalle:** excluir el archivo solapado y conservar el
  detalle. Requiere la misma decisión y puede infravalorar el histórico.
- [ ] **Alternativa — repartir/prorratear el solape:** rechazada mientras no exista una
  regla financiera demostrada; inventaría una atribución.

**Confirmada: PENDIENTE. Fuente/fecha: PENDIENTE.**

## Respuestas confirmadas Q1–Q10 — 2026-10-27

Fuente: mensaje real del usuario en la sesión
`ses_e8571d99effev1a1aeyemjMuZ3`, recibido el 2026-10-27. Confirma
**Q1=A, Q2=A, Q3=A, Q4=A, Q5=A, Q6=A, Q7=A, Q8=A, Q9=A, Q10=A**.

- **Q1=A:** registro por ejercicio + Partida + intervalo verificado, con fecha opcional;
  varios intervalos no solapados por Partida; sin reconstruir meses o movimientos.
- **Q2=A:** solo Gastos históricos/precontrol, más la regularización 2026 y, si se
  aprueba, evidencia de apertura separada. Sin Ingresos/Transferencias/Amortización
  históricos en E4.5.
- **Q3=A:** corte e inicio de control por fuente/dataset, aprobados en DT7. El
  27/08/2026 de C30 no es una fecha global.
- **Q4=A:** mapping versionado por identidad de origen estable → destino por ID; el
  nombre original es procedencia, no clave.
- **Q5=A:** registro explícito y acotado `Regularización 2026`, con efecto económico
  real acreditado. **Precisiones confirmadas:**
  1. El importe y el signo representan el efecto real acreditado; no se asigna signo
     ni efecto por inferencia.
  2. La inclusión previa en archivo/Movimientos está pendiente de verificar; queda
     prohibido duplicarla.
  3. Partida, Referencia y fecha usan exclusivamente identidades/fechas demostradas;
     no se completan ausencias artificialmente.
  Q5-A es modelo documental, **no** autorización para incorporar una regularización
  concreta sin evidencia suficiente.
- **Q6=A:** identidad de origen + huella. Misma identidad/huella = un registro;
  identidad con contenido distinto = conflicto; fuentes distintas con el mismo
  intervalo/Partida = ambiguas aunque el importe difiera; no se suman hasta conciliar.
- **Q7=A:** aperturas de Saldo como evidencia histórica de solo lectura, separadas de
  Gastos y de las aperturas vigentes; aperturas de Deuda fuera de E4.5/E4.4.
- **Q8=A:** fila sin mapping/verificación excluida del total verificado, mostrada con
  motivo; total parcial/no calculable, nunca cero.
- **Q9=A:** solo lectura + fixtures; sin importador real, herramienta definitiva de
  migración ni UI de mapping.
- **Q10=A:** ante solapamiento no separable, no se elige fuente ni se prorratea;
  componentes separados, `estadoCobertura=Solapada`, total/subtotal `null` y conflicto
  visible hasta conciliación.

Estas respuestas **no** aprueban la especificación completa ni los wireframes, no
cierran DT7 y no autorizan desarrollo, migración, datos reales ni merge.

## Casos que la especificación debe resolver

| Caso | Ejemplo ficticio | Resultado esperado |
| --- | --- | --- |
| Archivo y detalle en el mismo año/Partida sin doble cómputo | PAR100 archivo 01/01–27/08 1.200,00; detalle 28/08–31/12 300,00 | Total 1.500,00 una vez, con ambos componentes visibles |
| Frontera exacta y cobertura parcial | Archivo 01/01–27/08; detalle con control desde 27/08; o archivo hasta 30/06 y detalle desde 01/08 | Solapamiento o hueco visibles; sin total inventado |
| Referencia renombrada con identidad | REF100 «Viaje X» → «Viaje Y»; mapping v3 conserva REF100 | Mismo enlace, nombre vigente y nombre original en procedencia |
| Ausencia frente a cero | Cobertura completa sin filas; cobertura incompleta sin filas | 0 verificado en el primer caso; No disponible en el segundo |
| Duplicados y procedencia ambigua | Dos filas idénticas de F1; F1 y F2 con el mismo periodo/Partida, aunque el importe difiera | Una sola fila; dos candidatos ambiguos sin suma automática |
| Aperturas preservadas | Archivo con apertura histórica 500,00; Saldo actual 500,00 | Ningún cambio en Saldo/Deuda/Movimientos; evidencia separada |
| Cambio de ejercicio sin fabricar | 2026 con archivo/detalle; 2027 vacío | 2027 sin archivo, plan ni Movimiento heredado; 2026 sigue consultable |
| Regularización 2026 no extrapolada | Registro 2026 de 50,00; consulta 2025/2027 | Solo 2026; ninguna regla general ni copia |

## Coverage

La especificación cubrirá: definición y frontera archivo/detalle/foto; cobertura y
corte; IDs, origen y mapping; combinación sin doble cómputo; aperturas; transición de
ejercicio; regularización 2026; ausencias/duplicados/ambigüedades; consultas y
wireframes 1440/390; contratos mínimos para E4.7/E4.11/E4.12; seguridad y límites.
No cubrirá: desarrollo, SQL, migración real, importador definitivo, Excel, datos
personales, cierre/fotos, amortizaciones de Deuda, inversiones, nuevos motores
financieros ni despliegue.

## Wireframes

Los wireframes concretos de escritorio y móvil se incluyen en la
[specification](20-historico-precontrol-specification.md#screens-and-interfaces) para
evitar un documento redundante. Son propuestas documentales, no una UI implementada ni
una prueba de accesibilidad.

## Append-only clarifications

Añadir aquí respuestas, fuentes/fechas y rondas posteriores sin reescribir las
preguntas ni las alternativas anteriores. Una respuesta solo es válida si identifica
la pregunta, la opción elegida, la fuente humana y la fecha; una recomendación marcada
no se convierte en respuesta por sí sola.
