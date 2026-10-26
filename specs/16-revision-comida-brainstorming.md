# 16 — E3.4 Revisión bancaria de Comida: Brainstorming

Status: EN PAUSA — Q1–Q7 confirmadas con precisiones el 2026-10-26; D-01-R abierta y
basada solo en evidencia histórica v5.10; AC-25 pendiente; specification DRAFT no aprobada.
No se declara equivalencia con v5.11(7).
Roadmap/context: [E3.4](roadmap.md#e34--revisión-bancaria-de-comida-sin-gasto-duplicado),
[E3.5](roadmap.md#e35--comida-por-ciclo-y-compensaciones),
[R1/R3/R4/P6](functional-reference-v5.11.md),
[spec04](04-movimientos-specification.md),
[spec05](05-transferencias-referencias-specification.md),
[spec07](07-ciclos-operacion-specification.md),
[spec12](12-flujo-mensual-specification.md) y spec13 (E3.1 Anticipos, rama
`codex/spec13-anticipos`, no integrada).
Next action: DETENIDA. No hay más rondas sobre D-01-R/v5.11(7); PD-01 es la única ronda
breve pendiente. Se reanudará al disponer del contenido vigente de v5.11(7); entonces se
contrastará AC-25 y se decidirá D-01-R. La
[specification](16-revision-comida-specification.md) sigue DRAFT y este documento no
aprueba ni implementa nada.

## Autorización y preflight

Paquete EXT-OPENCODE-SPEC16, 2026-10-26. Flujo Full documental mediante `$spec`.
Sin implementación, SQL, pruebas funcionales, instalación de la aplicación, Excel,
datos reales, despliegue ni merge.

- Base verificada: `origin/main` = `f0a5219b2193283a4e3254d13c87c75c9254e845`.
- Rama aislada: `codex/spec16-revision-comida`; worktree
  `/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/spec16`.
- Spec 16 libre: sin archivos `specs/16-*`, sin rama previa y sin commits asociados.
  Ramas, worktrees y cambios ajenos conservados sin modificar.
- Leídos: `AGENTS.md`, Skill `$spec`, `specs/README.md`, roadmap, referencia funcional,
  guías de arquitectura/UI/calidad/seguridad, specs 04, 05, 07 y 12, y spec 13 en su
  worktree aislado. La spec 14 se consultó solo para confirmar que Base B/D5 queda fuera.
- La referencia v5.11(7) es candidata, no estable; el libro y sus datos originales no
  han sido inspeccionados por Codex. Las reglas no demostradas se preguntan, no se
  completan por inferencia.

## Decisiones existentes que no se reabren

- Movimientos es el registro de hechos bancarios: ID numérico estable, importe EUR
  positivo exacto y Tipo comunica la dirección; auditoría, rectificación y anulación
  lógica preservan identidad e historia ([spec04](04-movimientos-specification.md)).
- Referencias son maestros por ID estable; una clasificación auxiliar de Comida no es
  una Referencia ni una Partida nueva ([spec05](05-transferencias-referencias-specification.md)).
- Ciclos es el único maestro temporal. La referencia financiera es el máximo de fechas
  de Movimientos, Revisión Comida y operaciones de inversión, con cobertura explícita;
  no se usa el reloj ni se crea otro maestro de periodos
  ([R3](functional-reference-v5.11.md), [spec07](07-ciclos-operacion-specification.md)).
- Revisión Comida es auxiliar bancario y no genera nuevos Gastos en Movimientos.
  Fuera presupuesto excluye el análisis presupuestario pero conserva el efecto bancario.
  Las reposiciones no se fingen consumadas
  ([R4](functional-reference-v5.11.md), [E3.4](roadmap.md#e34--revisión-bancaria-de-comida-sin-gasto-duplicado)).
- R4 fija el idioma funcional vigente: Gasto comida incluye `Comida` + `Pendiente revisar`;
  compensable es `Ocio` + `Niños` + `Otros`; Falta por reponer =
  `max(compensable − reposiciones, 0)`. Esas fórmulas pertenecen a E3.5; E3.4 no las
  duplica.
- El saldo inicial de comida se confirma manualmente al abrir ciclo y no se autorrellena
  desde el cierre anterior; la diferencia solo genera aviso/conciliación
  ([spec07](07-ciclos-operacion-specification.md)).
- La devolución de un Anticipo se consume una sola vez desde su motor E3.1 (spec13,
  rama `codex/spec13-anticipos`, no integrada) y no se descuenta dos veces de Recursos;
  E3.4 no la convierte en reposición de Comida.
- E2.6 ya declara que Revisión Comida no añade un segundo Gasto económico y que su
  integración pertenece a E3.6/E4.7
  ([spec12](12-flujo-mensual-specification.md), AC-47).

## 1. Análisis de dependencias y frontera E3.4/E3.5

### 1.1 Dependencias de entrada

| Dependencia | Qué aporta a E3.4 | Límite que E3.4 no puede cruzar |
| --- | --- | --- |
| E1.4 Movimientos | Hecho bancario real, ID, Fecha civil, Tipo, importe, Saldo, auditoría y estado vigente/anulado | No crear, rectificar ni anular Movimientos desde el detalle auxiliar; no duplicar su efecto en Saldos |
| E1.5 Referencias | Enlaces históricos por ID y reglas de inmutabilidad | No inventar una Referencia para clasificar Comida; la clasificación auxiliar no es REF |
| E2.1 Ciclos | Intervalo Inicio..Fin, ciclo actual, corte y referencia central | No crear otro maestro temporal ni persistir un `ciclo_id` paralelo; no autorrellenar saldo inicial |
| E2.2/E2.3 Presupuestos | Concepto de análisis presupuestario y ejecución por Partida | No ejecutar Presupuesto desde Revisión Comida; `Fuera presupuesto` no borra el hecho bancario |
| E3.1 Anticipos | Neto, devoluciones y foto de apertura del caso | No recalcular financiación de Anticipo ni clasificar una devolución como reposición de Comida por inferencia |
| E3.2 Compartidos | Gasto bruto, Neto y atribución por caso | No incorporar Neto Compartido ni un segundo Gasto; su integración es E3.6 |
| E3.5 Comida por Ciclo | Consumidor de detalle, reposiciones, cobertura y fechas | No adelantar Recursos, financiación neta, compensaciones por ciclo, Falta por reponer ni arrastre de saldo inicial |
| E3.6/E4.7 | Consumidores de Neto, flujo ajustado, cierre e historia | No simular cierres, fotografías ni conciliaciones que aún no existen |

### 1.2 Frontera E3.4 / E3.5

| Capacidad | E3.4 | E3.5 |
| --- | --- | --- |
| Captura y clasificación del detalle auxiliar | Sí: alta, corrección auditada, vínculo y estados de cobertura | No vuelve a capturar ni a clasificar |
| Efecto bancario | Lo consulta desde el hecho vinculado; no lo recalcula ni lo duplica | Lo consume para el periodo financiado sin crear otro Gasto |
| Reposiciones | Registra y acredita las reposiciones reales; muestra ausencia/parcialidad | Calcula `Falta por reponer` con la fórmula R4 y el periodo de Ciclos |
| Fechas | Aporta la fecha efectiva de sus registros a la referencia temporal central | Usa Ciclos y la referencia para delimitar el periodo consultado |
| Agregados del ciclo | Puede filtrar detalle por intervalo de Ciclos | Calcula Gasto comida, Compensable, Recursos, financiación y compensaciones |
| Saldo inicial de comida | No lo toca | Solo avisa de la diferencia con el cierre verificable; no autorrellena ni arrastra |
| Devolución de Anticipo | No la procesa | La consume una sola vez desde E3.1, sin doble descuento |
| Cierre/foto histórica | No los implementa | Tampoco los adelanta; quedan para E4 |

Reglas de frontera propuestas:

1. E3.4 nunca es una segunda fuente de Saldos, ejecución presupuestaria ni Gasto.
2. E3.5 no puede leer el detalle auxiliar como si fuera un Movimiento; debe usar el
   contrato de lectura de E3.4 y el hecho bancario vinculado.
3. Una cifra de E3.4 no se etiqueta como `Recursos`, `Gasto comida`, `Compensable`,
   `Falta por reponer`, `Financiación` ni `Conciliado`; esas etiquetas son de E3.5.
4. E3.4 puede ofrecer filtros y totales descriptivos de su propio detalle, pero no
   presentarlos como resultado financiero del ciclo.
5. La referencia temporal central incorpora la fuente `Revisión Comida` con estados
   `disponible`, `sin_referencia` y `error`; una fuente vacía no es un fallo y un fallo
   no se convierte en ausencia de hechos.

### 1.3 Riesgos principales

| Riesgo | Regla de contención propuesta |
| --- | --- |
| Doble Gasto | El detalle auxiliar no escribe en Movimientos; el único efecto económico es el hecho vinculado |
| Doble efecto bancario | Si el detalle no tiene hecho vinculado, no se suma a Saldos ni a totales; se muestra `Sin efecto verificado` |
| Clasificación como nueva Partida | La clasificación es un dominio cerrado del auxiliar; no crea CAT/SUB/PAR |
| Reposición ficticia | Solo cuenta una reposición real y acreditada; ausencia y parcialidad se muestran como tales |
| Fechas paralelas | La fecha financiera sale del hecho o de un contrato explícito; los metadatos UTC no son fechas financieras |
| Duplicado por reintento | Identidad propia, idempotencia y detección de coincidencias; nunca una unicidad económica que rechace hechos legítimos |
| Reclasificación silenciosa | Revisión, motivo, antes/después y aviso a consumidores; sin borrado físico |

### 1.4 Qué aporta E3.4 a E3.5, sin implementar su financiación

E3.4 aporta la **materia prima verificable**: filas clasificadas, vínculo con el hecho
bancario, efecto bancario consultable, reposiciones registradas, estados de cobertura y
fechas efectivas para la referencia central. También aporta la garantía de que guardar
detalle no crea otro Gasto.

E3.5 aporta las **decisiones de periodo y financiación**: delimita el ciclo con Ciclos,
suma Gasto comida (`Comida` + `Pendiente revisar`), agrupa Compensable
(`Ocio` + `Niños` + `Otros`), consume las reposiciones y calcula
`Falta por reponer = max(compensable − reposiciones, 0)`. También integra la devolución
de Anticipo una sola vez y avisa de la diferencia entre cierre verificable y saldo inicial
manual.

E3.4 no implementa ni etiqueta Recursos, financiación neta, compensaciones por ciclo,
Falta por reponer, conciliación de saldo inicial ni arrastre de saldo entre ciclos. No
crea una foto de cierre ni decide qué ciclo es actual. Su contrato de lectura permite que
E3.5 haga esos cálculos sin volver a clasificar ni duplicar el hecho bancario.

## 2. Contrato propuesto del auxiliar — PROPUESTA rev1, no aprobada

Nota append-only: las respuestas confirmadas en §9 prevalecen sobre esta propuesta rev1
cuando difieran. Se conserva rev1 como historia de la primera entrega, pero quedan
**expresamente derogados** por D-01-R/Q2/Q5:

- el vínculo obligatorio y el límite de suma contra el importe del Movimiento;
- la fecha financiera derivada del Movimiento;
- los estados `Completo`/`Parcial` calculados por suma contra el hecho;
- el estado `Parcial` de reposición calculado por E3.4;
- la formulación 1:N como relación existente en Excel.

Ninguno de esos puntos es una regla vigente ni debe implementarse.

La propuesta recomendada es un **detalle auxiliar vinculado a hechos bancarios
existentes**. Se presenta primero el modelo recomendado y después la alternativa que
podría cambiar el contrato. Ninguna de las dos está aprobada.

### 2.1 Modelo recomendado A: detalle sobre un Movimiento

- Cada fila auxiliar describe una porción o clasificación de un Movimiento existente.
- Un Movimiento puede tener una o varias filas auxiliares; ~~la suma de las porciones no
  puede superar el importe del hecho~~. **[DEROGADO por D-01-R: sin límite de importe ni
  reparto contra el Movimiento.]**
- Guardar una fila auxiliar no crea, modifica ni anula un Movimiento. El efecto bancario
  es exactamente el del Movimiento vinculado.
- Una fila sin vínculo verificable no se suma a ningún total económico; se muestra como
  `Sin efecto verificado` y no se presenta como completa.
- La importación de extractos y la creación masiva de hechos quedan fuera de E3.4.

### 2.2 Identidad e historia

| Dimensión | Propuesta rev1 | Garantía |
| --- | --- | --- |
| ID del detalle | ID numérico estable, único y no reutilizable, independiente del ID de Movimiento | Nunca se usa fecha, nombre, posición de fila ni importe como identidad |
| Vínculo | FK al Movimiento por ID; sin nombres ni texto libre como clave | Un cambio de nombre o concepto no rompe el enlace |
| Revisión | `revision`, `creado`, `actualizado` UTC y actor de auditoría | Los metadatos técnicos no son fechas financieras |
| Corrección | Revisión con motivo, antes/después y revalidación atómica | Mismo ID; no se sobrescribe la evidencia anterior |
| Anulación | Estado lógico consultable; excluido de totales; sin DELETE físico | La historia y el vínculo original se conservan |
| Idempotencia | Clave de intento y payload; un reintento no crea otra fila | Respuesta perdida y doble envío no duplican |
| Duplicados | Advertencia por coincidencia de Movimiento, importe, clasificación y fecha; no UNIQUE económica | Se permiten dos detalles legítimos iguales; el reintento técnico no se duplica |

Pendiente de confirmar: si el ID debe ser independiente o si el caso de uso exige una
relación 1:1 con el Movimiento (Q1/Q2).

### 2.3 Fechas y referencia temporal central

Propuesta recomendada:

- ~~La fecha financiera del detalle vinculado es la Fecha civil del Movimiento; no se
  duplica como una segunda fecha editable.~~ **[DEROGADO por Q2: fecha de operación
  bancaria propia.]**
- La fecha técnica de creación/actualización es UTC y no participa en la referencia.
- El lector de la fuente `Revisión Comida` devuelve la máxima fecha efectiva de los
  registros vigentes y verificables, o `sin_referencia` si no hay ninguno. Un fallo del
  lector es `error`, nunca una fecha inventada.
- Las filas `Fuera presupuesto` siguen aportando su fecha y su efecto bancario; solo se
  excluyen del análisis presupuestario.
- El ciclo no se persiste en el auxiliar: se deriva del intervalo de Ciclos para la fecha
  efectiva. La diferencia cierre/inicio y su aviso pertenecen a E3.5.
- No se admiten fechas futuras por una regla nueva de E3.4; se reutiliza el límite civil
  de registro ya existente para hechos, sin convertir el reloj en referencia financiera.

Pendiente de confirmar: si el auxiliar necesita una fecha bancaria propia distinta de la
del Movimiento (Q2). Si la necesita, habrá que definir su inclusión en la referencia y su
relación con el hecho vinculado.

### 2.4 Signo, importe y dirección

Propuesta recomendada, coherente con Movimientos:

- `importe`: EUR exacto en céntimos, serializado como string; estrictamente positivo.
- `direccion`: `Salida` o `Entrada`, explícita; el signo se deriva de la dirección.
- Una salida de comida es `Salida`; una devolución o reposición real es `Entrada`.
- No se admiten cero, negativos, floats ni redondeos; no se convierte un importe negativo
  en positivo por inferencia.
- ~~La suma de detalles de un Movimiento se compara con el importe del hecho por
  dirección: no puede excederlo; si queda menos, se muestra el resto sin clasificar.~~
  **[DEROGADO por D-01-R: no se valida ni se limita contra el Movimiento.]**
- El efecto bancario se muestra con la dirección y el Saldo del hecho, no se recalcula
  desde el detalle.

Alternativa posible: importe firmado (negativo salida, positivo entrada). Es más directo
para aritmética de compensación, pero diverge del contrato positivo + Tipo de Movimientos.
Se pregunta en Q3.

### 2.5 Clasificación

Propuesta recomendada: dominio cerrado y exclusivo, sin nuevas Partidas:

| Valor | Uso | Análisis |
| --- | --- | --- |
| `Comida` | Gasto de comida dentro del presupuesto | Gasto comida |
| `Pendiente revisar` | Detalle pendiente de revisión, ya considerado gasto de comida según R4 | Gasto comida |
| `Ocio` | Gasto compensable | Compensable |
| `Niños` | Gasto compensable | Compensable |
| `Otros` | Gasto compensable | Compensable |
| `Fuera presupuesto` | Detalle excluido del análisis presupuestario | Excluido del análisis; conserva efecto bancario |

- `Compensable` es un grupo derivado de `Ocio` + `Niños` + `Otros`; no se almacena como
  una clasificación adicional.
- `Pendiente revisar` no es un estado de carga ni un “no computa”: R4 lo incluye en el
  gasto de comida.
- `Reposición` no es una Partida ni una categoría de gasto; se propone como registro
  separado (2.6).
- No se crean Categorías, Subcategorías ni Partidas para estos valores. La clasificación
  auxiliar no cambia la Partida del Movimiento ni la ejecución presupuestaria.
- Cambiar la clasificación exige revisión, motivo y auditoría; nunca reescribe el hecho.

Pendiente de confirmar: si `Fuera presupuesto` es un valor exclusivo o un flag ortogonal
que pueda acompañar a `Comida`/`Ocio`/etc. (Q4). También deben confirmarse las etiquetas
visibles exactas y si existe algún valor histórico distinto.

### 2.6 Vínculo con hechos bancarios y estado de cobertura

Propuesta recomendada:

| Estado | Significado | Efecto en totales |
| --- | --- | --- |
| `Completo` | ~~La suma de detalles vigentes cubre exactamente el importe del Movimiento~~ | **DEROGADO por D-01-R** |
| `Parcial` | ~~Hay detalles, pero queda un resto del Movimiento sin clasificar~~ | **DEROGADO por D-01-R** |
| `Sin clasificar` | El Movimiento está vinculado pero no tiene detalle vigente | No hay análisis; no se inventa una clasificación |
| `Sin vínculo` | La fila auxiliar no tiene un Movimiento verificable | No cuenta para efecto bancario ni para totales |
| `Incompatible` | ~~La suma excede el importe~~ o el Movimiento no es elegible/anulado | **DEROGADO el límite de suma**; se conserva la elegibilidad/estado como `Revisar` |

- El detalle muestra el ID, la fecha, el importe, el Tipo y el Saldo del Movimiento
  vinculado; no los copia como fuentes económicas paralelas.
- Si el Movimiento se rectifica o anula, el vínculo histórico se conserva, se muestra el
  aviso y no se reasigna automáticamente a otro hecho.
- Solo se admiten hechos elegibles según el contrato que se confirme en Q1/Q5. La
  propuesta inicial es `Gasto` para consumo con detalle de `Salida`, e
  `Ingreso`/`Transferencia` para una devolución o reposición real con detalle de `Entrada`;
  no se habilita por ello Transferencias con Exterior.
- La dirección del detalle debe ser compatible con el Tipo del hecho; una combinación
  contradictoria se rechaza o se marca `Revisar` (histórico), sin usar `Incompatible` como
  estado persistido ni invertir el signo en silencio.
- Un Movimiento puede tener varios detalles; un detalle no puede repartirse entre varios
  Movimientos.

Pendiente de confirmar: tipos de Movimiento elegibles, si un detalle puede existir sin
Movimiento en un caso histórico/precontrol y cómo se evita entonces el doble efecto.

### 2.7 Reposiciones

Propuesta recomendada:

- Una reposición es un registro auxiliar explícito de `Entrada`, con ID propio, fecha
  efectiva, importe exacto y vínculo a un hecho bancario real (`Transferencia` o
  `Ingreso`, según Q5).
- Solo las reposiciones registradas y verificables cuentan. Una previsión, un deseo o una
  anotación manual no se presentan como reposición consumada.
- La ausencia se muestra `Sin reposición registrada`; una cobertura inferior al objetivo
  se muestra `Parcial`, nunca `Completada`.
- E3.4 no calcula `Falta por reponer` ni compara contra `Compensable`: solo aporta las
  reposiciones y su evidencia. E3.5 hace el cálculo con el periodo de Ciclos.
- Una devolución de Anticipo no se reclasifica como reposición de Comida por coincidencia
  de importe, fecha o Saldo; su motor es E3.1.
- Si se admite una reposición manual sin hecho bancario, debe marcarse `Manual`, conservar
  evidencia y no alterar Saldos; queda pendiente de confirmación en Q5.

### 2.8 Contrato de lectura para E3.5

E3.5 podrá consumir, como mínimo:

- ID estable, revisión y estado vigente/anulado del detalle.
- Fecha efectiva y, si existe, vínculo e identidad del Movimiento.
- Importe exacto y dirección.
- Clasificación y condición `Fuera presupuesto`.
- Estado de cobertura del vínculo y estado del Movimiento.
- Reposiciones registradas, con ID, fecha, importe y evidencia.
- Cobertura de la fuente: disponible vacía, disponible con máxima fecha o error.

Garantías del contrato:

1. Un detalle anulado o `Sin vínculo` no se suma.
2. Un detalle `Parcial` no se presenta como cobertura completa.
3. Una reposición ausente o parcial no se presenta como completada.
4. E3.5 recibe los componentes, pero calcula sus fórmulas, periodos y avisos.
5. La fuente no usa reloj, `createdAt` ni fecha de importación como fecha financiera.
6. La lectura es coherente con una única revisión; un cambio concurrente produce
   revisión obsoleta, no una mezcla de versiones.

## 3. Ronda 1 — preguntas materiales

Nota append-only: las respuestas confirmadas están consolidadas en §9. Los campos
`Confirmed answer: PENDING` de esta sección se conservan como registro de la ronda
original; no se reescriben.

### Q1. ¿El auxiliar es detalle de Movimientos o un ledger bancario independiente?

- [x] **Recomendado A — detalle vinculado:** cada fila clasifica una porción de un
  Movimiento existente; un Movimiento puede tener varias filas; la suma no supera su
  importe; sin vínculo no hay efecto bancario contabilizado. Evita el doble Gasto por
  construcción y encaja con “guardar detalle no crea otro Gasto”.
- [ ] **Alternativa B — ledger independiente:** las filas tienen fecha e importe propios
  y pueden existir sin Movimiento; exige conciliar contra Movimientos y definir qué fuente
  manda para el saldo bancario. Mayor riesgo de doble efecto.
- [ ] **Alternativa C — 1:1 estricto:** una fila por Movimiento, sin divisiones; más simple,
  pero no permite separar comida de ocio en un mismo ticket.

Confirmed answer: PENDING; source/date: PENDING.

### Q2. ¿Qué fecha alimenta la referencia temporal central?

- [x] **Recomendado:** la fecha efectiva es la Fecha civil del Movimiento vinculado; no
  hay una segunda fecha financiera editable. La fuente `Revisión Comida` aporta el máximo
  de sus fechas efectivas vigentes y verificables, con `sin_referencia`/`error` distintos.
  Las filas `Fuera presupuesto` también aportan fecha y efecto bancario.
- [ ] **Alternativa:** el auxiliar tiene una fecha bancaria propia (valor, abono o fecha
  manual) distinta de la del Movimiento; habría que incluirla en el máximo y definir
  límites de fecha futura y reconciliación. Indicar qué fecha usa el Excel.

Confirmed answer: PENDING; source/date: PENDING.

### Q3. ¿Importe positivo con dirección o importe firmado?

- [x] **Recomendado:** importe EUR positivo exacto + `direccion` (`Salida`/`Entrada`),
  coherente con Movimientos; el signo se deriva y no se almacena como segundo dato.
  Salida = consumo; Entrada = devolución o reposición real. Cero y negativos se rechazan.
- [ ] **Alternativa:** importe firmado (negativo salida, positivo entrada); facilita la
  aritmética de netos, pero introduce una convención distinta de Movimientos y exige
  validar que el signo no se contradiga con el hecho vinculado.

Confirmed answer: PENDING; source/date: PENDING.

### Q4. ¿`Fuera presupuesto` es una clasificación exclusiva o un flag?

- [x] **Recomendado:** dominio exclusivo `Comida | Pendiente revisar | Ocio | Niños |
  Otros | Fuera presupuesto`, tal como R4 los enumera; `Compensable` es un grupo derivado
  y no se almacena. No se crean Partidas ni Referencias nuevas.
- [ ] **Alternativa:** clasificación `Comida/Ocio/Niños/Otros/Pendiente revisar` más un
  flag ortogonal `fueraPresupuesto`; una fila puede ser `Comida` y estar fuera de
  presupuesto. Habría que definir precedencia y qué totales la excluyen.
- [ ] **Otra:** indicar los valores y etiquetas reales del libro, incluidos históricos.

Confirmed answer: PENDING; source/date: PENDING.

### Q5. ¿Qué es una reposición y cómo se acredita?

- [x] **Recomendado:** reposición real vinculada a un hecho bancario (`Transferencia` o
  `Ingreso`), con ID propio, fecha, importe y evidencia; solo cuenta si está registrada y
  verificable. Sin registro = `Sin reposición`; cobertura insuficiente = `Parcial`, nunca
  `Completada`.
- [ ] **Alternativa manual:** reposición sin hecho bancario, marcada `Manual` y con
  evidencia, sin alterar Saldos; E3.5 la consume pero no la presenta como bancaria.
- [ ] **Alternativa prevista:** E3.4 guarda una reposición prevista; no cuenta hasta que
  exista el hecho real. Indicar si el uso real necesita previsiones.

Confirmed answer: PENDING; source/date: PENDING.

### Q6. ¿Se puede reclasificar un detalle de un ciclo pasado y qué historia se conserva?

- [x] **Recomendado:** sí, con revisión, motivo y antes/después; nunca DELETE; el cambio
  afecta al cálculo vigente de E3.5 y se avisa. Los cierres/fotos futuros de E4 podrán
  congelar; E3.4 no los adelanta.
- [ ] **Alternativa congelada:** la clasificación usada por un ciclo se fija al consultarlo
  o al cerrarlo; cambios posteriores no reescriben ese periodo. Requiere definir foto y
  momento de congelación, hoy inexistentes.
- [ ] **Sin reclasificación:** solo se permite corregir antes de usar el detalle; después
  queda inmutable. Más estricto, pero puede impedir corregir errores reales.

Confirmed answer: PENDING; source/date: PENDING.

### Q7. ¿Dónde termina E3.4 y empieza E3.5?

- [x] **Recomendado:** E3.4 captura/clasifica, vincula, muestra efecto bancario y
  reposiciones, y aporta fechas/cobertura. Puede filtrar por ciclo usando Ciclos y mostrar
  recuentos descriptivos del conjunto filtrado, pero no agrega por ciclo ni etiqueta
  Recursos, Gasto comida, Compensable, financiación, Falta por reponer, conciliación de
  saldo inicial o arrastre. E3.5 consume ese contrato y calcula el periodo.
- [ ] **Alternativa:** E3.4 calcula totales por clasificación dentro de un ciclo (sin
  Recursos ni financiación) y E3.5 los consume; no habría segunda fuente, pero la UI podría
  confundirse con resultados de E3.5 y habría que definir cobertura/parcialidad en ambos.
- [ ] **Alternativa ampliada:** E3.4 incluye parte de financiación/compensación; se
  rechaza por el alcance autorizado y por invadir E3.5.

Confirmed answer: PENDING; source/date: PENDING.

## 4. Coverage

Nota histórica: esta tabla describe la primera propuesta. El estado vigente está en
§9–§10; Q1–Q7 ya están confirmadas y no siguen pendientes.

| Área | Estado de la propuesta |
| --- | --- |
| Requisitos funcionales | Q1–Q7 confirmadas; D-01-R/AC-25 y PD-01 pendientes; sin segundo ledger |
| Pantallas e interacción | Listado/filtros, ficha de detalle, vínculo, estados de cobertura y reposiciones; wireframes W1–W4 en spec |
| Datos leídos/escritos | Movimiento, Ciclos, referencia central, detalle auxiliar, reposiciones, auditoría y cobertura |
| API/dependencias | Reutilizar sesión MFA, Origin/CSRF, límites, errores y transacciones existentes; sin dependencia nueva |
| Validación | Importe, dirección, clasificación, vínculo, sin suma/límite contra Movimiento, fecha, duplicados, concurrencia e idempotencia |
| Errores y bordes | Sin vínculo, `Revisar`, movimiento anulado, fuente vacía/error, reposición ausente/cobertura E3.5, reintento |
| Fuera de alcance | E3.5, Base B, D5/Exterior, Vehículos, B3/Dev32, importación de extractos, Excel/datos reales, desarrollo, SQL, tests, deploy y merge |

## 5. Wireframes

La specification DRAFT incluye una propuesta inicial W1–W3. Sigue pendiente de feedback
y no se presenta como aprobada. Los wireframes cubren:

1. Consulta del detalle auxiliar con filtros por fecha/ciclo, clasificación, estado de
   vínculo y `Fuera presupuesto`.
2. Ficha/edición del detalle con Movimiento vinculado, importe, dirección, clasificación,
   cobertura y auditoría.
3. Reposiciones registradas, con ausencia y trazabilidad; `Parcial`/`Completada` solo
   atribuidos a E3.5.
4. Estados vacío/carga/error/404/409/422 y aviso de movimiento anulado o vínculo a revisar.

## 6. Evidencia financiera que falta

Nota histórica: Q3–Q7 se confirmaron en §9; esta tabla se conserva como registro de la
primera ronda. Siguen pendientes D-01-R/v5.11(7), AC-25 y PD-01.

| Regla | Estado | Fuente necesaria |
| --- | --- | --- |
| Origen y cardinalidad del detalle | Evidencia histórica v5.10: Excel sin relación; app 0..1/0..N | D-01-R; contraste v5.11(7) pendiente |
| Fecha financiera y su papel en la referencia | R3 fija el máximo, pero no la fecha interna del auxiliar | Q2; columnas/fórmulas del libro |
| Signo y dirección | R4 no fija representación técnica | Q3; convención del libro/app |
| `Fuera presupuesto` exclusivo o flag | R4 lo enumera, pero no aclara ortogonalidad | Q4; uso real |
| Reposición real/manual/prevista | R4 exige no fingirla, pero no fija su fuente | Q5; evidencia del libro |
| Reclasificación histórica | P6 exige preservar historia; no fija foto por ciclo | Q6; cierres/fotos futuros |
| Tipos de Movimiento elegibles | No demostrado | Q1/Q5; qué hechos entran en Revisión Comida |
| Fórmulas de E3.5 | R4 las enuncia; su implementación no pertenece a E3.4 | E3.5, con Ciclos y Anticipos |

No se inventan reglas para cubrir estas ausencias. §9 cierra Q3–Q7; permanecen D-01 y la
evidencia sobre históricos con ambas columnas de Q4.

## 7. Trazabilidad provisional a E3.4

| AC del roadmap | Cómo lo cubriría la propuesta | Preguntas |
| --- | --- | --- |
| E3.4-AC1: guardar detalle no crea Gasto adicional | Modelo A: el detalle no escribe en Movimientos; el efecto es el hecho vinculado | Q1, Q7 |
| E3.4-AC2: Fuera presupuesto excluye análisis y conserva efecto bancario | Clasificación/flag y lectura del hecho sin borrar su efecto | Q1, Q4, Q7 |
| E3.4-AC3: no presentar compensación/reposición ausente como completada | Estados `Sin reposición`/`Parcial`; E3.4 no calcula completitud de E3.5 | Q5, Q6, Q7 |

La trazabilidad vigente y los AC definitivos están en la
[specification DRAFT](16-revision-comida-specification.md); esta tabla es histórica.

## 8. Append-only clarifications

Las respuestas se añadirán con su procedencia y fecha, sin reescribir las preguntas ni
marcar una recomendación como aprobación. Cualquier precisión posterior sobre identidad,
fechas, signo, clasificación, vínculo o reposiciones se conservará aquí.

## 9. Resolución del usuario — 2026-10-26

Fuente: mensaje del usuario «Apruebo conceptualmente las recomendaciones Q1–Q7, con las
siguientes precisiones» (2026-10-26). Es una aprobación conceptual de las recomendaciones,
no de la specification ni de los wireframes. No autoriza implementación, SQL, cambios
estructurales adicionales, push ni merge.

### 9.1 Q1/Q2 — detalle, vínculo y fechas

Confirmado:

- Se mantiene el detalle vinculado, **sin segundo ledger económico** y sin duplicar
  Gastos. La formulación 1:N de Q1 se precisa en §9.3.2: Excel no tiene relación formal;
  la app propone una FK opcional 0..1 / 0..N, no un reparto económico.
- Antes de cerrar el contrato debe verificarse cómo se vincula cada detalle bancario a
  Movimientos, porque el modelo terminal no registra cada compra individual como un nuevo
  Gasto central.
- La fecha de cada operación bancaria se conserva fielmente. No se sustituye por la fecha
  de un Movimiento agregado cuando sean diferentes.
- La referencia temporal distingue máximo válido, ausencia de datos y error. `tblCiclos`
  conserva la responsabilidad de maestro temporal; no se crea otro maestro de ciclos.
- Si el diseño necesita cambiar la representación vigente de los movimientos bancarios,
  se señala como decisión estructural pendiente (D-01), no se asume aprobado.

Consecuencia: la propuesta rev1 de derivar la fecha del Movimiento queda sustituida por
una **fecha de operación bancaria propia del detalle**, que es la que participa en la
referencia temporal. El vínculo con el hecho sigue sujeto a D-01.

### 9.2 Q3–Q7 — decisiones confirmadas

| Pregunta | Decisión confirmada | Consecuencia contractual |
| --- | --- | --- |
| Q3 Importe | Importe positivo exacto y dirección `Entrada`/`Salida`; validar coherencia de dirección/signo con el tipo, **sin límite de importe ni suma contra el hecho vinculado** | No se usa importe firmado; cero, negativos, floats y dirección contradictoria se rechazan; no se acota al Movimiento |
| Q4 Fuera presupuesto | Exclusividad semántica preservando el comportamiento documentado en v5.10 (evidencia histórica; aplicabilidad a v5.11(7) pendiente): dos columnas físicas, pero Control prohíbe combinar `Fuera presupuesto = Sí` con una Clasificación informada | La app puede representar un valor exclusivo si conserva la restricción y todos los históricos sin pérdida; `Compensable` se deriva de Ocio+Niños+Otros y excluye Fuera presupuesto; el efecto bancario se conserva |
| Q5 Reposición | Solo reposiciones reales y verificables; estados ausente y parcial; sin Ingresos/Gastos ficticios ni duplicación de movimientos; trazabilidad con el hecho real y la compensación correspondiente | Registro de reposición con vínculo real, importe, fecha, evidencia y referencia de trazabilidad; nunca se marca completada sin cobertura |
| Q6 Rectificación | Reclasificación revisada con motivo, antes/después y auditoría; recalcular resultados vivos afectados; no modificar snapshots históricos inmutables; no anticipar mecanismos de congelación de E4 | Mismo ID, historial append-only y recálculo de E3.5; E3.4 no crea fotos ni cierres |
| Q7 Responsabilidades | E3.4: detalle, dirección, clasificación, vínculo al hecho, reposiciones verificadas y cobertura. E3.5: asignación/agregación por ciclo desde su maestro temporal, financiación, Recursos comida, compensaciones y métricas de cierre | Sin cálculos duplicados; E3.4 no etiqueta Recursos, Gasto comida, Compensable, financiación ni Falta por reponer |

Nota Q4: no se ha demostrado que existan históricos con ambas columnas informadas. Si
aparecieran, la specification deberá preservarlos en lectura sin permitir nuevas
combinaciones; no se normalizan ni se pierden.

Nota Q5: `Parcial` no es un cálculo de E3.4; se precisa en §9.3.3 como estado aportado por
E3.5. E3.4 registra la operación y su trazabilidad, sin emitir `Completada`.

### 9.3 D-01 — Decisión estructural pendiente sobre el vínculo terminal/agregado

**Estado: BLOQUEANTE para aprobar la cobertura completa de E3.4.** No se asume resuelta.

Contexto verificado en los contratos vigentes:

- `Terminal` es un Saldo con Control `Terminal`; su financiación es una Transferencia y
  la compra es un Gasto desde Terminal. Terminal no tiene posición convencional
  ([spec05](05-transferencias-referencias-specification.md), R2).
- El modelo terminal no convierte cada compra individual en un nuevo Gasto del banco
  central. El banco puede ver una financiación/agregado, mientras el detalle de compras
  vive en otro nivel.
- Un detalle bancario puede corresponder a:
  1. un **Gasto individual** desde banco, efectivo o Terminal (Movimiento existente);
  2. una **financiación/agregado** bancario sin Gastos individuales;
  3. una **operación sin ningún Movimiento** que la represente.
- El caso 1 es compatible con Q1/Q2: vínculo opcional 0..1/0..N a un Movimiento, fecha
  propia del detalle, sin nuevo Gasto. Los casos 2 y 3 no están resueltos por la
  recomendación original y se precisan en §9.3.1–§9.3.3.

| Opción D-01 | Contrato | Valoración |
| --- | --- | --- |
| **A. Vínculo individual** | Solo se admite un Movimiento individual elegible (incluido Gasto desde Terminal). Si no existe, el detalle queda `Sin vínculo`, no suma y se muestra cobertura incompleta | Mínimo cambio estructural; seguro; puede dejar fuera compras terminales cuyo banco solo muestra un agregado |
| **B. Vínculo agregado** | El detalle se imputa a un Movimiento agregado (financiación o cargo consolidado), con `tipoVinculo=Agregado`, suma acotada y efecto bancario contado una sola vez; la fecha propia del detalle se conserva | Resuelve el caso 2 sin nuevo ledger; exige definir qué agregados son elegibles y cómo se evita doble cómputo económico |
| **C. Hecho auxiliar independiente** | El detalle es un hecho bancario auxiliar con ID/fecha/importe propios, sin Movimiento; E3.4 debe reconciliarlo contra Terminal/banco | Mayor riesgo de segundo ledger y de doble efecto; contradice la intención de Q1 salvo decisión expresa |
| **D. Aplazar terminal** | E3.4 solo cubre casos con Movimiento individual; el resto se declara fuera hasta una entrega estructural posterior | Seguro y acotado; reduce la capacidad real de Revisión Comida |

**Recomendación:** aplicar **A como base segura** y estudiar **B** solo si la evidencia
real demuestra que el detalle de comida se apoya en financiaciones/agregados sin Gastos
individuales. No adoptar C sin una decisión estructural expresa. D es el fallback si no
hay evidencia suficiente para B.

**Nota de supersesión:** D-01-R sustituye las opciones A–D de esta tabla, que quedan como
historia. D-01-R **no es la opción C**: C proponía un hecho auxiliar independiente sin
Movimiento y con riesgo de segundo ledger; D-01-R conserva operaciones bancarias propias
como capa operativa/analítica, no crea saldo ni hecho económico paralelo y admite un
vínculo opcional verificado. D-01-R sigue abierta y no se declara equivalente a ninguna
opción anterior.

Evidencia necesaria para cerrar D-01:

1. ¿Cada fila de Revisión Comida tiene un ID de Movimiento/Gasto individual, o el banco
   solo muestra una financiación/agregado?
2. Si es un agregado, ¿qué Movimiento lo representa y cómo se reparte el detalle?
3. ¿Existen filas históricas sin ningún Movimiento? ¿Se conservan solo para consulta?
4. ¿La fecha propia del detalle puede diferir de la del agregado? ¿Se usa siempre la de
   la operación bancaria?

### 9.3.1 Precisión D-01 — evidencia histórica v5.10 y aplicabilidad pendiente

Procedencia: evidencia histórica de `MyFinanzas2026_v5.10.xlsx` y su hoja Criterios,
aportada por el usuario el 2026-10-26. **La referencia vigente es v5.11(7), candidata, no
estable.** La estructura física de v5.11(7) no ha sido inspeccionada; esta evidencia no se
presenta como estructura vigente confirmada. Su aplicabilidad a v5.11(7) queda pendiente
de contraste. No se reproducen importes, IDs ni fechas reales en el repositorio.

Hechos aportados en la evidencia histórica v5.10:

- `tblRevisionComida` contiene registros bancarios individuales con ID propio, fecha,
  concepto, importe y clasificación. **No tiene ID Movimiento ni FK equivalente.**
- Movimientos usa el modelo terminal: Transferencia al terminal + Gasto del terminal a
  Exterior. Los Gastos centrales pueden ser agregados y no representan individualmente
  las compras posteriores.
- Una financiación de comida puede aparecer como operación en Revisión Comida y como
  Transferencia central en Movimientos; los Gastos centrales pueden ser agregados de
  varias compras, sin reparto técnico entre los detalles bancarios.
- Existen compras individuales en Revisión Comida sin Gasto individual equivalente en
  Movimientos. Es comportamiento previsto, no necesariamente ausencia de registro
  económico.
- El conjunto aportado es parcial y no cubre historia anterior. No se inventa cobertura
  previa ni se extrapola a periodos sin registros.

Consecuencia para la evidencia histórica: **no existe una relación 1:1 ni una relación
1:N formal en Excel entre Revisión Comida y Movimientos.** La propuesta anterior de
vínculo obligatorio con suma acotada al importe del Movimiento no representa ese modelo y
queda sustituida. La aplicabilidad de esta conclusión a v5.11(7) sigue pendiente de
contraste y no se asume.

#### Propuesta D-01-R — registro bancario operativo/analítico con vínculo opcional verificado

1. Revisión Comida conserva **operaciones bancarias individuales** con ID, fecha,
   concepto, importe/dirección, clasificación y evidencia propios.
2. **No hay vínculo obligatorio** a Movimientos ni reparto técnico de importes. Un
   detalle puede existir sin Movimiento y sigue siendo un registro operativo válido.
3. El vínculo a Movimientos es **opcional y solo verificable**: se establece cuando existe
   correspondencia documentada, nunca por coincidencia aproximada de fecha, importe,
   concepto o Saldo.
4. Un vínculo verificado es **trazabilidad**, no una asignación económica: no copia fecha
   ni importe, no cambia el Movimiento, no crea Gasto y no acota el importe del detalle.
5. La relación técnica de la app es una **FK opcional**: cada operación apunta a cero o un
   Movimiento; un Movimiento puede recibir varias operaciones referenciadas. Esto no es
   una relación existente en Excel ni un reparto económico; se detalla en §9.3.2.
6. Se mantienen tres capas separadas:
   - **Movimientos:** reconocimiento económico central.
   - **Revisión Comida:** operaciones bancarias individuales y su clasificación.
   - **E3.5:** agregación y conciliación por ciclo.
7. Revisión Comida **no es un segundo ledger económico**: no crea saldo paralelo, no
   ejecuta Presupuesto, no añade importes a Saldos centrales y no sustituye Movimientos.
8. El efecto bancario de la operación se muestra en su capa; el efecto económico central
   se lee de Movimientos cuando exista vínculo verificado. No se suman ambos como si
   fueran hechos independientes.
9. `Fuera presupuesto` sigue excluido del análisis presupuestario y conserva su operación
   y efecto bancario. `Compensable` se deriva de Ocio+Niños+Otros válidos.
10. Las reposiciones son operaciones bancarias reales de entrada, con evidencia y
    trazabilidad a la compensación; pueden tener vínculo verificado a un Movimiento, pero
    no se inventan ni se duplican. E3.4 no calcula la parcialidad: el estado `Parcial` o
    `Completada` lo aporta E3.5 (§9.3.3).

#### 9.3.2 Cardinalidad: Excel frente a app

- **Excel/v5.10:** `tblRevisionComida` no tiene ID Movimiento ni FK; no existe relación
  formal 1:1 ni 1:N. Es una tabla bancaria independiente.
- **App propuesta:** una FK opcional `movimiento_id` define una cardinalidad técnica:
  cada operación apunta a **0..1 Movimiento**; un Movimiento puede recibir **0..N
  operaciones referenciadas**. No es una relación obligatoria ni un reparto de importes.
- La FK no crea una relación económica, no acota importes, no valida sumas y no cambia el
  Movimiento. Su único fin es trazabilidad cuando hay evidencia.
- La aplicabilidad de la estructura Excel v5.10 a v5.11(7) sigue pendiente de contraste.

#### 9.3.3 Reposiciones parciales: quién determina `Parcial`

- E3.4 registra operaciones bancarias de reposición y su trazabilidad; puede mostrar
  `Sin reposición registrada`, `Vigente`/`Anulada` y `Asignada`/`Sin asignación`.
- E3.4 **no calcula** `Parcial`, `Completada`, `Falta por reponer` ni cobertura de
  compensación. Esos resultados pertenecen a E3.5, que conoce el periodo, el objetivo y
  las compensaciones.
- E3.4 nunca presenta una reposición ausente o parcial como completada. Si E3.5 aporta un
  estado `Parcial`, E3.4 puede mostrarlo como dato de E3.5, no como cálculo propio.
- El criterio de parcialidad no se inventa en E3.4; queda definido en E3.5.

Esta propuesta respeta Q1 (sin segundo ledger ni Gastos duplicados) sin forzar una
cardinalidad que Excel no tiene. La app define una FK opcional 0..1 / 0..N como
trazabilidad, no como reparto. Queda **pendiente de aprobación expresa y de contraste con
v5.11(7)**; no se considera cerrada solo por la evidencia histórica v5.10.

#### 9.3.4 Contraste pendiente de campos físicos v5.10

Este retorno se registra como **evidencia histórica de v5.10**, no como estructura vigente
ni como equivalencia con v5.11(7). Quedan pendientes de contraste, como mínimo:

| Campo físico v5.10 | Evidencia histórica | Representación propuesta para la app | Estado |
| --- | --- | --- | --- |
| Clasificación `Reposición` | La tabla física usa una clasificación `Reposición` | Reposiciones modeladas como registro propio, separadas de la clasificación de detalle | Pendiente; no se declara equivalencia |
| Importe firmado | La tabla física conserva importe firmado | Importe positivo exacto + `dirección` `Entrada`/`Salida` | Pendiente; no se declara equivalencia |
| `Estado` / `Referencia reposición` | Campos físicos de estado y referencia de reposición | `estadoRegistro` (`Vigente`/`Anulada`), `estadoTrazabilidad` (`Asignada`/`Sin asignación`) y trazabilidad a compensación | Pendiente; no se declara equivalencia |

No se convierte esta evidencia en una regla de app ni se cierra D-01-R. AC-25 permanece
pendiente. La línea documental se detiene hasta disponer del contenido vigente de v5.11(7);
no se abren nuevas rondas sobre la misma incertidumbre.

### 9.4 Impacto en el contrato propuesto

| Elemento | Propuesta rev1 | Decisión vigente |
| --- | --- | --- |
| Fecha financiera | Derivada del Movimiento | **Fecha de operación bancaria propia**, conservada en el detalle; participa en la referencia central |
| Vínculo | FK a Movimiento, 1:N, suma acotada | **FK opcional: operación 0..1 Movimiento; Movimiento 0..N referencias**; sin reparto de importes. Excel no tiene esa relación (D-01-R pendiente) |
| Efecto bancario | Efecto del Movimiento vinculado | **Operación bancaria propia** en Revisión Comida; el reconocimiento económico central sigue en Movimientos; no se suman ambos |
| Fuera presupuesto | Valor exclusivo propuesto | **Exclusividad semántica confirmada**; representación app admisible con restricción e históricos preservados |
| Reposición | Registro real vinculado | **Confirmado**; trazabilidad al hecho y a la compensación; `Parcial` lo determina E3.5, no E3.4 |
| Reclasificación | Revisión con auditoría; cierres futuros podrán congelar | **Confirmado**; recalcular resultados vivos, no tocar snapshots inmutables; no anticipar congelación E4 |
| Frontera E3.5 | Sin cálculos de financiación | **Confirmado**; E3.5 conserva asignación, agregación, financiación, Recursos, compensaciones y métricas |

La specification DRAFT recoge el contrato D-01-R con AC condicionales/actualizados. No se
considera completa ni aprobable hasta la aprobación expresa de esa precisión y el contraste
con la estructura física de v5.11(7).

#### Propuestas históricas sustituidas por D-01-R

Se conservan en §2 sin reescribir, pero no son reglas vigentes:

| Propuesta histórica | Estado | Sustituida por |
| --- | --- | --- |
| Vínculo obligatorio 1:N detalle→Movimiento | Derogada | FK opcional 0..1 / 0..N; Excel sin relación formal |
| Suma de detalles acotada al importe del Movimiento | Derogada | Sin reparto ni límite contra el Movimiento |
| Fecha financiera derivada del Movimiento | Derogada | Fecha de operación bancaria propia |
| `Completo`/`Parcial` por suma contra el hecho | Derogado | `Sin vínculo`/`Verificado`/`Revisar`; sin suma |
| `Parcial` de reposición calculado por E3.4 | Derogado | E3.5 determina cobertura; E3.4 no lo emite |
| Reposición como única salida de toda `Entrada` | No decidido | PD-01; devolución de compra pendiente |

#### 9.4.1 PD-01 — devolución de compra (decisión pendiente, reformulada)

No hay una regla confirmada que convierta toda `Entrada` en Reposición. Una devolución de
compra no se clasifica por inferencia ni se modela como subtipo de Ingreso. La decisión se
separa en dos preguntas; **B, A y C son propuestas, no definiciones confirmadas**:

1. **Distinción conceptual.** ¿Qué separa una devolución de compra de una reposición?
   - **Propuesta B (no confirmada):** reservar `Reposición` a compensaciones de
     Ocio/Niños/Otros; no a devoluciones de compra. No se adopta como definición.
   - Una devolución podría corresponder a `Comida`, `Ocio`, `Niños`, `Otros` o
     `Fuera presupuesto`; la relación con la compra original es una propuesta pendiente.
   - La devolución es una operación bancaria real de entrada; no se presume reposición.
2. **Preservación mientras el tratamiento analítico está pendiente.**
   - **Propuesta A (no adoptada):** registrarla como `Entrada` con evidencia y una
     clasificación aún por confirmar; su efecto de reducción queda para E3.5.
   - **Propuesta C (no adoptada):** conservarla como operación real con una representación
     pendiente a definir; no se adopta `null`/“no computa” por defecto.
   - AC-10 queda bloqueado en la parte `Detalle`+`Entrada`; no se adopta una representación
     operativa nueva por esta aclaración.

Preservar la operación real, su evidencia y su histórico es obligatorio; **no se adopta C
automáticamente ni se descarta la operación**. El concepto de devolución/reposición ya está
confirmado; queda pendiente su representación, clasificación y efecto analítico. B, A y C
quedan como propuestas, no como preguntas de gate. La formulación anterior de A/B/C
excluyentes y la adopción implícita de C quedan como historia y quedan sustituidas.

#### 9.4.2 Aclaración conceptual confirmada — PD-01, 2026-10-26

Fuente: aclaración del usuario recibida el 2026-10-26. Se registra como decisión
conceptual confirmada, sin cerrar PD-01:

- **Devolución:** reintegro total o parcial de una compra anterior.
- **Reposición:** aportación para restituir fondos, sin anular la compra.
- No son equivalentes por dirección, importe o fecha.
- Compra y devolución se conservan como operaciones independientes.
- Relacionarlas exige evidencia; no se exige coincidencia exacta de fecha o importe.
- No se acredita compensación por inferencia.
- La operación bancaria real se conserva; no se descarta por falta de regla analítica.
- No se crea una clasificación operativa nueva.
- No se adopta `null` ni “no computa” por defecto.
- La clasificación y los efectos analíticos de PD-01 siguen pendientes.
- Conservar el efecto bancario real **no autoriza** sumar el auxiliar a Saldos centrales
  ni fabricar Movimientos individuales. El reconocimiento económico central sigue en
  Movimientos.
- La relación con la compra original requiere evidencia; su estructura técnica (campo,
  tabla o enlace) no queda aprobada por esta aclaración.
- D-01-R y AC-25 siguen abiertos.

### 9.5 Trazabilidad de la respuesta

- Q1/Q2: confirmadas con precisión y D-01 abierta.
- Q3: confirmada.
- Q4: confirmada con restricción de históricos.
- Q5: confirmada; `Parcial`/`Completada` se determinan en E3.5.
- Q6: confirmada.
- Q7: confirmada.
- Cardinalidad: Excel sin relación formal; app con FK opcional 0..1 / 0..N.
- Procedencia: evidencia histórica v5.10; aplicabilidad a v5.11(7) pendiente de contraste.
- AC-25 pendiente: incluye clasificación física `Reposición`, importe firmado y
  `Estado`/`Referencia reposición`, sin equivalencia con la app.
- PD-01: aclaración conceptual confirmada (§9.4.2); clasificación y efectos analíticos
  siguen pendientes; no se adopta `null`/“no computa” por defecto.
- D-01-R no cerrada; línea detenida hasta el contenido vigente de v5.11(7).
- No se autoriza implementación, cambio estructural, SQL, tests, push ni merge.

## 10. Corrección documental QA — 2026-10-26

El cuerpo literal del informe A1–A6/M1–M8/B1–B6 no está disponible en el checkout ni en el
contexto recibido; no se inventa su contenido ni su numeración. Se aplican las prioridades
explícitas del encargo, que se registran aquí como matriz de corrección.

| Prioridad | Corrección aplicada | Sección/AC |
| --- | --- | --- |
| AC-15: separar duplicado de reposición y reutilización de Movimiento | Duplicado por identidad/evidencia/reintento en AC-15; reutilización de vínculo en AC-26, sin duplicación | AC-15, AC-26 |
| AC-22: separar cálculo propio de visualización atribuida | AC-22 prohíbe cálculo propio; AC-27 solo muestra estados aportados por E3.5, sin simular motor | AC-22, AC-27 |
| Propuestas históricas sustituidas | Marcadas en §2 y tabla de §9.4; no se reescriben respuestas | §2, §9.4 |
| Eliminar límites de importe contra Movimiento | Contrato actual sin suma; rev1 marcada como derogada | §2, §9.3.2, spec |
| Completar reposiciones: identidad, vigencia, trazabilidad, auditoría, idempotencia | Tabla ampliada, API de ficha/rectificación/anulación/vínculo, W3 y AC-28/AC-29 | Reposiciones, API, W3 |
| Separar AC E3.4 de integraciones futuras | Grupos E3.4 / E3.5 / D-01-R / histórico / documental | Acceptance checks |
| Histórico, cobertura, responsive y errores | Sección de preservación/cobertura, W3 390/1440, AC-29 y estados de error | Fechas, W3, AC-29 |
| No convertir toda Entrada en Reposición | PD-01 abierta: B es propuesta no confirmada; A/C son propuestas; operación real preservada | §9.4.1, PD-01 |
| No habilitar Exterior/D5 | Exclusión expresa | Exclusions |
| Conservar rechazo de campos calculados | AC-19 y validación mantienen payload derivado no escribible | AC-19 |
| No prometer recálculos/estados futuros | AC-16/AC-22/AC-27 atribuyen el motor a E3.5/E4 | AC-16, AC-22, AC-27 |

D-01-R sigue abierta, AC-25 pendiente y no se declara equivalencia con v5.11(7).

## 11. Matriz literal QA A1–A6 / M1–M8 / B1–B6 — 2026-10-26

Contraste contra el candidato corregido. No declara aprobación ni cierra D-01-R/AC-25.

| ID | Estado | Corrección/sección | Evidencia |
| --- | --- | --- | --- |
| A1 | Corregido | AC-15 separa duplicado de reposición; AC-26 permite varios vínculos al mismo Movimiento sin duplicación | S AC-15, AC-26; validación de vínculo |
| A2 | Corregido | AC-22 prohíbe cálculo propio; AC-27 muestra estados de E3.5 atribuidos y de solo lectura | S AC-22, AC-27; repos/empty states |
| A3 | Corregido | D-01-R sustituye expresamente A–D y se distingue de la opción C; no se declara segundo ledger | B §9.3 nota de supersesión |
| A4 | Corregido | Q3 ya no habla de “límites”; prohíbe límite de importe/suma contra el hecho | B §9.2 Q3; S validación |
| A5 | Parcial | Matriz tipo×dirección y eliminación de `Incompatible` persistido; `Detalle`+`Entrada` queda bloqueado PD-01, sin adoptar representación/null/no computa; clasificación/efecto siguen pendientes | S matriz; AC-10; PD-01 |
| A6 | Corregido | Reposición separa `Vigente/Anulada` de `Asignada/Sin asignación`; API de ficha/rectificación/anulación/vínculo; W3 usa ID numérico | S repos table/API/W3; AC-28 |
| M1 | Corregido | Sección DT2/DT7; AC-30 para ID duplicado/no reutilizable; AC-27/AC-34 para parcialidad | S Dependencias DT2/DT7; AC-30 |
| M2 | Parcial | Cláusula de preservación en lectura de `Reposición`, importe firmado y `Estado`/`Referencia`; mapping/equivalencia quedan en AC-25 | S preservación histórica; AC-31 |
| M3 | Corregido | `Sin ciclo asignable`, `Fuera de ciclo`, `Ciclo abierto` y `Cobertura parcial` diferenciados; remisión a spec07 | S fechas/empty states; AC-32 |
| M4 | Corregido | E3.4 no altera Partida/Presupuesto/ejecución central; `Fuera presupuesto` solo excluye análisis auxiliar | S reglas de clasificación; AC-33 |
| M5 | Corregido | Reposición vinculada es trazabilidad; E3.5 la consume una vez y decide la capa | S efectos/repos; AC-34 |
| M6 | Corregido | Matriz de elegibilidad `Detalle`/`Reposicion`; sin Subtipo nuevo; Exterior/D5 pendiente y explícito | S matriz de vínculo; AC-35 |
| M7 | Corregido | W1 móvil, W4 escritorio, acciones de ficha/reposición y UTC en auditoría | S W1m/W4/W3; AC-29 |
| M8 | Corregido | AC-16 queda en E3.4; AC-36 y AC-27 marcan recálculo/visualización futuros | S AC-16, AC-27, AC-36 |
| B1 | Corregido | §4 y §6 marcadas históricas y actualizadas; Q1–Q7 no siguen pendientes | B §4/§6 |
| B2 | Corregido | Auditoría etiquetada UTC en W2/W4 | S W2/W4 |
| B3 | Corregido | AC-10 determinista; `Incompatible` no persistido; “no vigente/anulado”; payload derivado + malformado/sobredimensionado | S AC-10, AC-19, AC-24 |
| B4 | Corregido | Q7 amplía mapping a AC-22/27/34/36 y relacionadas | S trazabilidad |
| B5 | Corregido | `Con evidencia`/`Sin evidencia`; sin evidencia no se presenta como verificada; reposición exige evidencia | S evidencia/AC-37 |
| B6 | Corregido | API de reposiciones con ficha, 404, paginación/filtros, rectificación y anulación | S API/empty states; AC-29 |

### Residuales N6–N9

| ID | Estado | Corrección/sección | Evidencia |
| --- | --- | --- | --- |
| N6 | Corregido | Acciones W3/W4/W1m unificadas; mismas capacidades en 390/1440 | S W3/W4/W1m; AC-29 |
| N7 | Corregido | `C-02` identificada como futura E3.5; no se presenta como compensación instalada | S W3/W4/W1m |
| N8 | Corregido | `Detalle`/`Reposicion` son discriminadores lógicos del DTO/UI, no estructura persistida nueva; materialización en DT2 | S modelo de datos |
| N9 | Corregido | AC-14/15 precisan evidencia/duplicado; Q7 amplía mapping a AC-01/02/13/14/22/27/34/36 | S AC-14/15; trazabilidad |

Pendiente real: A5 (clasificación/efecto de devolución de compra), M2 (mapping/equivalencia v5.11(7)), D-01-R y AC-25. No se declara aprobación.


## Aprobación documental del candidato y wireframes — 2026-10-26

Fuente directa: usuario «los aprobamos», tras QA independiente D1–D7 PASS,
sin defectos corregibles demostrables. Aprobación del contenido y wireframes del
candidato: brainstorming SHA-256
`bb6397f438b7ed236d944c8fcfc591d061f011bb63291e2257508e350affb385`;
specification SHA-256
`a8a278d2dba9ed31a5e7b0606764991698b762c214997ff83b9bf386ee82e4d4`.
Esta entrada actualiza el estado histórico de no aprobación documental.
Se conservan pendientes PD-01 analítica, D-01-R y AC-25; no se inventan respuestas,
no se declara equivalencia física ni cierre completo. Sin autorización de desarrollo,
SQL, migración, despliegue o merge. Próxima acción: resolver los gates pendientes
cuando exista evidencia/decisión, sin repetir QA del contenido sin cambios.
