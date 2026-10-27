# 22 — E4.2 Ventas, posición y efectivo de bróker: Specification

Status: **PROPOSED rev2 — D1–D7 confirmadas A por el usuario el 2026-10-27; wireframes rev3 de
W2/W5 y W11–W16 APROBADOS visualmente el 2026-10-28; la specification completa sigue pendiente
de cierre documental y de la coordinación D7/SPEC19 (E4.1 integrada). DEV22 no autorizado.**
Approval source/date: D1–D7 aprobadas por el usuario el 2026-10-27; SPEC19 rev10 aprobada el
2026-10-27 (registro original `3c271d3`, integrada en `main` `156a50d`); wireframes rev3
aprobados visualmente por el usuario el 2026-10-28 con el mensaje «Apruebo la revisión visual
rev3 de W2/W5 y W11–W16 de SPEC22, incluidos los estados y bloqueos D1/D2/D3.» La aprobación
visual no autoriza DEV22, esquema, commits, push, PR ni merge.
Context and brainstorming: [22-ventas-posicion-broker-brainstorming.md](22-ventas-posicion-broker-brainstorming.md),
[roadmap E4.2](roadmap.md), [referencia funcional R5](functional-reference-v5.11.md),
[SPEC19 E4.1](19-instrumentos-compras-inversion-specification.md) y
[testplan E4.1](19-instrumentos-compras-inversion-testplan.md).
Base documental: `main` `4edcfeb` (2026-10-28). Los artefactos se prepararon inicialmente sobre
`064df64` (rama histórica de E4.1); para publicación se trasladan solo documentos y wireframes,
sin código ni historia de esa rama. E4.1 rev10 quedó integrada en `156a50d`; no se modifica
SPEC19.
Historial: rev1 (2026-10-27) propuesta inicial; rev2 (2026-10-27) registra Q0 resuelta y D1–D7
confirmadas A; rev2.1 (2026-10-28) registra la aprobación visual de los wireframes rev3. No
autoriza desarrollo, migraciones, pruebas ejecutables, commits, push, PR, merge ni despliegue.

## 1. Contexto, alcance y estado de las fuentes

E4.2 añade la **Venta** al registro de inversión creado por E4.1 y completa su efecto sobre
el **efectivo del bróker**, la **cantidad por posición** y la **referencia temporal compartida**.
No crea un módulo contable paralelo, no duplica la Venta en Movimientos y no adelanta la
valoración o el resultado de E4.3.

**In:**

- Venta en EUR y en divisa, con cantidad, precio unitario, divisa, cambio histórico, EUR
  efectivamente cobrado, comisión incluida, concepto y nota.
- Venta parcial y total; posición por `Saldo de inversión + Instrumento` con
  `cantidad = Compras vigentes − Ventas vigentes`.
- Efectivo del bróker con el término `+ Ventas`, usando el motor único de E1.1/E4.1.
- Consulta de Compras y Ventas, ficha del Instrumento, historial y auditoría dedicada.
- Rectificación, vista de impacto y anulación de Ventas con el contrato de E4.1.
- Fuente «Operaciones de inversión» en el contrato de referencia temporal de E1.3/R3.
- Trazabilidad y casos positivos, negativos y límite; dependencias identificadas para E4.3.

**Out (no especificado aquí):**

- Valor actual, valoración automática o manual, resultado abierto/cerrado, rentabilidad,
  Estado Abierta/Cerrada y agregados patrimoniales (E4.3).
- Lotes, FIFO, coste medio, plusvalías/minusvalías fiscales, dividendos, splits,
  ampliaciones, retenciones y comisiones bancarias distintas de la comisión de la operación.
- Importación, mapping, histórico anterior no registrado, Excel, datos reales y cierre
  (E4.5/E4.8–E4.12).
- Tipos nuevos de Movimiento, Gasto/Compra en Movimientos, Partida, Referencia, Ciclo,
  Presupuesto o Deuda para una Venta.

### 1.1 Contrato de partida y distinción de estados

- **Aprobado:** las decisiones funcionales de SPEC19 rev7/rev8 (2026-10-26) y su testplan,
  incluidas la identidad de Instrumentos, la Compra, el efectivo del bróker, la posición, la
  rectificación/anulación, la precisión DT2, las fechas y la persistencia lógica. **SPEC19 rev10
  y su testplan fueron aprobados por el usuario el 2026-10-27** (registro original `3c271d3`) e
  integrados en `main` `156a50d`, con C16/C17 congelados y `schemaVersion = 18`. No se reabre la
  aprobación ni se modifica SPEC19.
- **Integrado:** E4.1 está integrada en `main` `156a50d` (v18) con QA independiente PASS 48/6 y CI
  Linux 295 API / 13 E2E. Esta spec consume sus contratos; no reabre E4.1 ni cambia sus
  decisiones.
- **Sin versión de esquema reservada por E4.2:** esta spec no elige 18, 19 ni ninguna otra
  versión. La ampliación lógica de `operaciones_inversion` para `Venta` se resolverá en DEV
  conforme al gate de esquema vigente (v18). La versión de E4.1 y la de E4.2 son contratos
  distintos y no se comparten por inferencia.

## 2. Decisiones confirmadas por las fuentes

| ID | Decisión | Fuente | Uso en E4.2 |
| --- | --- | --- | --- |
| C1 | Compras y Ventas solo en el registro de inversión; nunca Gasto/Compra ni tipo nuevo de Movimiento | R2/R5, E4.1-AC1 | La Venta no crea Movimiento ni ejecuta Presupuesto. |
| C2 | Cada operación conserva Saldo de efectivo, Saldo de inversión, Instrumento, cantidad, precio en divisa, divisa, cambio histórico cuando no es EUR, EUR realmente cobrado/cargado y comisión incluida | R5, E4.1-AC3 | La Venta conserva el EUR cobrado y el factor histórico; el cambio actual no recalcula. |
| C3 | Efectivo del bróker = apertura + entradas − salidas − Compras + Ventas | R5, E1.1, E4.1 §4.3 | La Venta suma una vez; motor único y separado de la posición. |
| C4 | Posición = Saldo de inversión + Instrumento; cantidad = Compras − Ventas | R5, E4.1 §4.4 | La Venta resta cantidad; sin lote ni FIFO. |
| C5 | Efectivo y posición son derivados, no filas editables | R5, E4.1 §4.4/§5 | Toda corrección recalcula desde hechos vigentes. |
| C6 | Referencia temporal = máximo de fechas de Movimientos, Revisión Comida y operaciones de inversión, con cobertura; sin reloj ni `creado` | R3, E1.3 §«Referencia» | Las fechas de Compras y Ventas alimentan «Operaciones de inversión». |
| C7 | Precisión DT2: cantidad 8 decimales, precio/cambio 6, EUR céntimos exactos, cálculo interno exacto, límite de entrada 2⁵³−1 | DT2, E4.1 §6 | La Venta reutiliza escalas y rechazos sin redondeo. |
| C8 | Fecha civil, no futura según `Europe/Madrid`; agregación de hechos del mismo día a fin de día | DT2, E4.1 §6/§11 | La Venta usa la misma fecha y convención. |
| C9 | Rectificación con reemplazo completo, `revision`, `motivo`, impacto y auditoría atómica; anulación conserva y excluye; sin DELETE | E4.1 §4.5/§8 | La Venta reutiliza el contrato completo. |
| C10 | Valoración, resultado, rentabilidad y Estado Abierta/Cerrada son E4.3 | R5, roadmap E4.3 | E4.2 no los calcula ni los etiqueta. |
| C11 | No se inventan reglas de posiciones negativas | Roadmap E4.2, «Fuera» | D1 es una decisión confirmada A; la alternativa de cantidad negativa queda descartada. |
| C12 | Datos ficticios y deterministas; sin Excel ni datos personales | P6/P7, E4.1 §12 | Fixtures `S003`, `S004`, `S006`, `I1001`. |

## 3. Decisiones confirmadas por el usuario (2026-10-27)

Las decisiones D1–D7 del [brainstorming](22-ventas-posicion-broker-brainstorming.md) fueron
**aprobadas A por el usuario el 2026-10-27**. Las alternativas B quedan descartadas. La revisión
visual rev3 está aprobada desde el 2026-10-28; la aprobación de la specification completa sigue
pendiente de forma explícita. Si una decisión cambiara, se revisarían la funcionalidad, los AC y
el testplan.

| ID | Decisión confirmada A | Efecto | Alternativa descartada |
| --- | --- | --- | --- |
| D1 | Venta superior a la cantidad disponible | Rechazar 422 `INSUFFICIENT_UNITS` con comprobación desde la fecha de la Venta y ventana posterior, agregación de fin de día, sin escritura | Permitir cantidad negativa como incidencia |
| D2 | Efectivo negativo al rectificar/anular una Venta | Aplicar la misma invariante de efectivo no negativo de E4.1 y rechazar 422 `INSUFFICIENT_CASH` | Permitir negativo con alerta |
| D3 | Instrumento/Saldo inactivo | Permitir Venta de Instrumento inactivo con cantidad disponible y aviso; bloquear Venta desde Saldo inactivo hasta reactivarlo | Bloquear ambos; o permitir ambos |
| D4 | Navegación | Conservar Instrumentos/Compras y añadir pestaña Ventas; ficha con ambas secciones | Sustituir Compras por Operaciones |
| D5 | Posición con cantidad 0 | Mantener fila con 0, compras/ventas y última operación vigente; sin etiqueta Cerrada ni valoración | Ocultar la fila |
| D6 | Operaciones anuladas en referencia temporal | Solo operaciones vigentes y fecha vigente de la rectificada; la auditoría conserva las anuladas | Incluir también las anuladas |
| D7 | Compra rectificada a la baja o anulada por debajo de la cantidad vendida | Rechazar 422 `INSUFFICIENT_UNITS` con la misma comprobación de cantidad de D1, desde la fecha de la Compra; coordinar y documentar previamente cualquier cambio necesario en SPEC19 | Permitir cantidad negativa como incidencia |

## 4. Funcionalidad

### 4.1 Venta

- Una Venta es un hecho del registro de inversión, con ID propio, `clase = Venta`, y **no es un
  Movimiento**. Comparte tabla lógica con la Compra (`operaciones_inversion`), sin tabla
  `ventas` paralela.
- Datos: fecha civil; Instrumento; Saldo de efectivo; Saldo de inversión; cantidad; precio
  unitario en divisa; divisa ISO 4217; cambio histórico si la divisa no es EUR; **importe EUR
  efectivamente cobrado**; comisión opcional en EUR ya incluida; concepto/nota opcionales
  (hasta 2000 caracteres, sin caracteres de control). Sin Partida, Referencia, Ciclo, Deuda ni
  atribución presupuestaria.
- **EUR:** no se exige cambio informado; a efectos de cálculo se trata como 1. Si un payload EUR
  informa `cambio`, el único valor admitido es exactamente `1` (`"1.000000"`); cualquier otro
  valor se rechaza con 422 y no se normaliza.
- **Divisa distinta de EUR:** cambio histórico obligatorio y positivo; no se completa con un
  cambio actual ni con una cotización externa.
- Cantidad y precio son estrictamente positivos. Escalas: cantidad hasta 8 decimales, precio
  hasta 6 y cambio hasta 6; una precisión mayor se rechaza en API y en persistencia, sin
  redondeo ni truncamiento silencioso. Los límites de magnitud del entero escalado están en §6.
- El **importe EUR cobrado** es el importe observado del abono y la única base del efecto en
  efectivo. La comisión es un desglose informativo ya incluido: no se suma ni se resta otra
  vez, es no negativa, con dos decimales y nunca puede exceder el importe EUR cobrado.
  `cantidad × precio × cambio` se muestra solo como referencia; su diferencia con el importe
  cobrado es informativa, nunca un error ni una corrección automática.
- Un cambio posterior del mercado no modifica la Venta ni el efectivo. E4.2 no valora la
  posición.
- La selección de Saldos es explícita por Venta: efectivo `Efectivo`/`Inversiones` e inversión
  `Inversión`/`Inversiones`, existentes, distintos entre sí y activos (D3). No se recuerda la
  pareja por Instrumento y no hay preselección automática, aunque exista un solo Saldo elegible.
- **Cantidad disponible:** la posición del par `saldo_inversion + instrumento` a la fecha de la
  Venta, calculada con Compras y Ventas vigentes y agregación de fin de día. Una Venta parcial
  consume parte; una Venta total consume toda la cantidad y deja 0. La Venta no elige lote ni
  Compra concreta.
- **D1 (confirmada A):** la cantidad se comprueba con una fórmula determinista, análoga a la
  suficiencia de efectivo de E4.1 §4.3.2:

  ```text
  posicion(t) = Σ cantidad(Compras vigentes con fecha ≤ t)
              − Σ cantidad(Ventas vigentes con fecha ≤ t)

  candidato(t) = posicion(t) − cantidad de la Venta candidata, si su fecha ≤ t
               = posicion(t), en otro caso
  ```

  Se evalúa `candidato(t)` en `t = fecha de la Venta` y en cada fecha posterior a esa fecha con
  una Compra o Venta vigente del mismo par `saldo_inversion + instrumento`. Entre hechos la
  cantidad es constante, de modo que esos puntos contienen el mínimo. Todos los hechos de la
  misma fecha se agregan a fin de día (DT2), sin orden intradía. Si el mínimo es negativo, se
  rechaza con 422 `INSUFFICIENT_UNITS` y sin escritura. El cuerpo devuelve `disponible`
  (posición antes de la Venta candidata en la fecha del mínimo), `necesario` (cantidad de la
  Venta candidata aplicada en esa fecha), `minimo` (candidato negativo), `fecha` del mínimo,
  `saldoInversion` e `instrumento`. No hay override. La alternativa B (cantidad negativa) queda
  descartada.
- **D3 (confirmada A):** un Instrumento inactivo con cantidad disponible puede venderse, con aviso
  visible y sin ofrecerlo para nuevas Compras. Un Saldo inactivo no admite nuevas Ventas hasta
  reactivarlo; su posición e historial siguen consultables. El selector de Venta se acota al
  `saldo_inversion` elegido: un Instrumento inactivo con cantidad en `S004` y sin cantidad en
  `S006` se ofrece para `S004` y no para `S006`.
- **Duplicados:** el mismo Instrumento puede tener varias Ventas el mismo día; no se impone
  unicidad de operación. El «dato duplicado rechazado» del roadmap se interpreta como el mismo
  intento idempotente y como la ausencia de un segundo registro del mismo hecho, no como
  unicidad de Ventas del mismo día; E4.1 ya adoptó esa interpretación para Compras. El reintento
  con la misma `idempotency-key` y payload devuelve el mismo hecho; la misma clave con payload
  distinto devuelve 409 `IDEMPOTENCY_CONFLICT` sin segunda Venta. Si el usuario quiere unicidad
  por operación, es una decisión nueva.
- **Sin Movimiento:** la Venta no crea Gasto/Compra, no cambia el número de Movimientos, no
  ejecuta Presupuesto y no usa Partida, Referencia, Ciclo ni Deuda.

### 4.2 Efectivo del bróker

El efectivo de un Saldo `Efectivo`/`Inversiones` se calcula, no se almacena:

```text
efectivo(t) = apertura + entradas(≤t) − salidas(≤t) − compras(≤t) + ventas(≤t)
```

- Se reutiliza el motor único de E1.1/E4.1. Las Compras vigentes restan; las Ventas vigentes
  suman. Las anuladas no computan. La comisión ya está incluida en el importe y no se resta
  otra vez.
- Una apertura ausente contribuye cero solo en el cálculo, sin convertirse en cero persistido.
- El efectivo del bróker es distinto de la posición de inversión y no se agrega con ella.
- Solo `Efectivo`/`Inversiones` incorpora Compras y Ventas. `Efectivo`/`Movimientos` sigue
  siendo caja/banco normal y no las incorpora: una Venta no altera su posición.
- Varios Saldos `Efectivo`/`Inversiones` son independientes: cada uno tiene su propio efectivo y
  se muestran/listan por separado; E4.2 no suma un «efectivo total del bróker».
- El detalle mensual histórico y su comprobación de Fecha apertura quedan fuera de E4.2; no se
  altera el contrato F3.
- La previsualización de Movimientos sobre un Saldo `Efectivo`/`Inversiones` sigue usando el
  motor único y ahora incluye las Ventas; no se reescribe la regla de Movimientos.
- **D2 (confirmada A):** la rectificación o anulación de una Venta que reduzca el efectivo se
  somete a la misma comprobación de suficiencia de E4.1. Si el efectivo resultante es negativo
  en cualquier fecha desde la menor fecha implicada, se rechaza con 422 `INSUFFICIENT_CASH`,
  sin escritura, con `disponible`, `necesario`, `minimo` y `fecha`. Una Venta nueva solo suma,
  así que no requiere esta comprobación; sí la requieren las correcciones que restan.

### 4.3 Posición por Instrumento y Saldo de inversión

- Clave: `saldo_inversion + instrumento`. No se persiste una fila de posición editable.
- `cantidad = suma(Compras vigentes) − suma(Ventas vigentes)`. La comisión no altera la
  cantidad.
- La ficha muestra una fila por cada Saldo de inversión donde el Instrumento tenga operaciones
  registradas (Compras o Ventas, incluidas las anuladas), con la cantidad vigente, el número de
  compras vigentes, el número de ventas vigentes, la última compra vigente, la última venta
  vigente y la última operación vigente. Las operaciones anuladas se conservan en el historial y
  la auditoría, pero no cuentan para esas fechas ni para la cantidad. Un Instrumento puede
  aparecer en varios Saldos; cada uno es independiente.
- Una Venta total deja cantidad 0. **D5 (confirmada A):** la fila se conserva con 0, sus conteos e
  historial, sin etiqueta «Cerrada» y sin valoración. E4.3 decidirá el Estado Abierta/Cerrada.
  Las fechas `ultimaCompra`, `ultimaVenta` y `ultimaOperacion` del DTO son de operaciones
  vigentes; una anulada no las actualiza.
- No se muestra valor actual, coste agregado presentado como valor, resultado ni rentabilidad.
  Si la valoración no está disponible: «No disponible hasta E4.3», nunca 0.
- La cobertura es histórica parcial: solo incluye operaciones registradas en la aplicación; el
  histórico anterior no se importa. La UI lo declara y no presenta el resultado como posición
  completa.
- Anular una Venta la excluye del cálculo sin borrar el registro. Rectificar recalcula la
  cantidad desde los hechos vigentes. Una Venta no puede dejar cantidad negativa bajo D1.
- **Invariante de cantidad con Compras (D7, confirmada A):** cuando ya existen Ventas, rectificar a
  la baja o anular una Compra se somete a la misma comprobación de cantidad de §4.1, desde la
  fecha de la Compra afectada. Si el mínimo es negativo, se rechaza con 422
  `INSUFFICIENT_UNITS`, con `disponible`, `necesario`, `minimo`, `fecha`, `saldoInversion` e
  `instrumento`, sin escritura. Es una **extensión de integración de E4.1**: su contrato
  aprobado no comprobaba unidades al rectificar/anular Compras, por lo que requiere una enmienda
  aprobada de SPEC19 o una decisión expresa del owner registrada en su documento canónico. Sin
  esa extensión, DEV no debe inferirla ni permitir una cantidad negativa.

### 4.4 Rectificación y anulación

- Rectificar fecha, cantidad, precio, divisa, cambio, importe EUR, comisión, concepto o nota
  exige vista de impacto (efectivo y cantidad antes/después), `motivo` y `revision` vigente; una
  `revision` obsoleta devuelve 409 `REVISION_CONFLICT` sin escritura; la escritura y la
  auditoría son atómicas.
- **Reemplazo completo del payload**, como en Compras: la petición contiene todos los campos
  rectificables (`fecha`, `cantidad`, `precio`, `divisa`, `cambio`, `importeEur`, `comisionEur`,
  `concepto`, `nota`). Un campo rectificable omitido devuelve 422 con el nombre del campo; no se
  conserva silenciosamente el valor anterior. `null` solo es válido en los campos nullable
  (`cambio` cuando la divisa es EUR, `comisionEur`, `concepto`, `nota`) y los limpia; `null` en
  `fecha`, `cantidad`, `precio`, `divisa` o `importeEur` devuelve 422.
- Incluir `instrumento`, `saldoEfectivo`, `saldoInversion`, `clase`, `estado` o `id` en la
  rectificación devuelve 422 sin escritura: no son rectificables. Cambiar Instrumento o Saldos
  exige anular y crear otra Venta; la nueva se valida como alta completa y la original queda
  `Anulada`, fuera de efectivo, cantidad y referencia.
- Una rectificación que deje cantidad negativa en cualquier fecha posterior se rechaza con 422
  `INSUFFICIENT_UNITS` bajo D1, con la fecha/cantidad del mínimo; no hay escritura parcial. Bajo
  D2, una rectificación que deje efectivo negativo se rechaza con 422 `INSUFFICIENT_CASH`.
- Anular conserva el registro, lo marca `Anulada`, lo excluye de efectivo, cantidad y referencia
  y no permite una segunda anulación. Exige `revision` vigente y `motivo` no vacío; revisión
  obsoleta devuelve 409 `REVISION_CONFLICT` sin escritura. Sin DELETE.
- Una Venta anulada no se rectifica. La auditoría conserva el antes/después y el motivo.
- La rectificación o anulación de una **Compra** que reste cantidad se somete a D7 y a la misma
  comprobación de cantidad de §4.1; no se permite una cantidad negativa. La alternativa B de D7
  queda descartada; coordinar y documentar cualquier cambio necesario en SPEC19 es una
  dependencia previa a DEV.
- La rectificación o anulación no crea Movimientos ni ejecuta Presupuesto.
- Rectificar divisa o cambio afecta solo a esa Venta; no toca el maestro ni otras operaciones.

### 4.5 Referencia temporal compartida

R3/E1.3 define la referencia como el máximo de fechas de Movimientos, Revisión Comida y
operaciones de inversión, con cobertura explícita. **E4.2 implementa la fuente «Operaciones de
inversión»**; E4.1 la había declarado pendiente (E4.1-AC-24) y la había diferido a E4.2-AC3.

- La fuente consulta la **fecha vigente** de las operaciones `Compra` y `Venta` con estado
  `Vigente` y devuelve su máximo. Una operación rectificada aporta su fecha vigente; una
  anulada no aporta fecha (D6).
- La fuente puede estar: **no entregada/pendiente** (tabla no instalada), **`sin_referencia`**
  (instalada sin hechos; `maxDate=null`), **`disponible`** (con `maxDate`) o **`error`**
  (consulta fallida). Es el contrato de cuatro estados de E1.3/E3.4, no un `null` ambiguo; la
  referencia global usa `sin_referencia` cuando ninguna fuente aporta fecha. No se usa `creado`,
  la fecha de auditoría, la fecha de la fotografía, la fecha de Inicio de Ciclo, el reloj del
  servidor ni `Date.now` como sustituto.
- `financialReference` calcula el máximo de las fechas disponibles y devuelve la cobertura de las
  tres fuentes. Si una fuente instalada falla, el estado es `error` y la fecha es `null`; no se
  omite la fuente ni se presenta un máximo incompleto como comprobado. Si una fuente no está
  entregada, queda `pendiente` identificada.
- La fuente «Revisión Comida» pertenece a **E3.4** (Revisión bancaria de Comida), que define su
  contrato de fechas y cobertura; E3.5 consume la agregación por ciclo. E4.2 consume ese
  contrato y no reimplementa su motor. Si E3.4 ya la ha conectado, el máximo la incorpora; si
  no, la cobertura la declara pendiente. La prueba de las tres fuentes puede usar el contrato
  puro con fuentes ficticias, sin afirmar que E3.4/E3.5 estén integradas.
- Consumidores: cabecera, Ciclos y flujo mensual siguen usando el mismo contrato; E4.2 no cambia
  las reglas de selección de ciclo, corte, duración ni mes financiado. Solo cambia el valor de la
  referencia al incorporar las fechas de inversión.
- La UI muestra la referencia y su cobertura; si falta una fuente, muestra el motivo y no un
  cero, una fecha vacía sin explicación ni una fecha inventada.

### 4.6 Integración con consumidores

- **Motor único de efectivo.** `GET /api/saldos/{id}` y
  `GET /api/inversiones/efectivo?saldo={id}` devuelven la misma cifra al céntimo para un Saldo
  `Efectivo`/`Inversiones`, ahora con Ventas incluidas. La igualdad es de céntimos, no de
  presentación.
- **Previsualización de Movimientos.** Gasto, Ingreso, Transferencia y Amortización sobre
  `Efectivo`/`Inversiones` calculan el extremo con el motor único, que ya incluye Ventas. No se
  inventa el extremo de `Inversión`/`Inversiones`; sigue «No disponible hasta E4.3».
- **`financeRevision`.** El contrato de E4.1 incorpora las filas de `operaciones_inversion` en la huella
  global. Una Venta registrada entre la vista previa y la confirmación de un Movimiento invalida
  el contexto y devuelve 409 `IMPACT_CHANGED` sin escritura; el borrador se conserva y se
  recalcula. Es la misma sobre-invalidación segura de E4.1, no una regla nueva.
- **Liquidez (R6).** La regla «Liquidez solo de saldos marcados» y el filtro de Estado Activa no
  cambian. El valor de `S003` cambia porque su efectivo incluye Ventas; no se crea un total
  patrimonial ni se agrega la posición de inversión con el efectivo.
- **Guard de impacto de Saldo.** E4.1 bloquea el cambio de `tipo`, `control`, `saldoApertura`,
  `fechaApertura` y `permiteSalidaExterior` de un Saldo con Compras. E4.2 amplía la misma
  comprobación a las Ventas: un Saldo que interviene en cualquier operación (Compra o Venta,
  incluida una anulada) queda protegido con 409 `HISTORY_LOCKED`; desactivar/reactivar y cambiar
  el nombre siguen permitidos. Es una extensión de integración, no una regla nueva de Saldos.
- **Sin invasión de otros consumidores.** Una Venta no altera la posición de
  `Efectivo`/`Movimientos`, ni el número de Movimientos, ni Presupuesto, ni el maestro de
  Instrumentos, ni la referencia por otra vía que la fecha de la operación.
- **E4.3.** E4.2 deja la valoración y el resultado sin calcular; no adelanta Estado, valor manual
  ni agregados. Las dependencias se detallan en §15.

## 5. Modelo de datos y contratos

Modelo lógico documental; sin DDL ejecutable, migración ejecutada ni datos reales. La versión
física no se reserva en esta spec.

| Objeto | Datos persistentes | Garantías y límites |
| --- | --- | --- |
| `operaciones_inversion` | `id` TEXT PK numérico; `clase` (`Compra` o `Venta`); `fecha`; `instrumento` FK; `saldo_efectivo` FK; `saldo_inversion` FK; `cantidad`; `precio_divisa`; `divisa`; `cambio` NULL; `importe_eur` INTEGER céntimos; `comision_eur` NULL en céntimos; `concepto`/`nota` NULL; `estado`; `revision`; UTC | Una sola tabla para Compra y Venta, sin tabla `ventas`; `importe_eur` es cargado en Compra y cobrado en Venta; comisión incluida; sin Partida/Referencia/Ciclo/Deuda; sin importes derivados persistidos |
| `operacion_inversion_audit` | `operacion` FK; `revision`; `accion` (`alta`, `rectificación`, `anulación`); `motivo` NULL solo en alta; `instante` UTC; `actor`; `anterior` JSON NULL; `posterior` JSON NOT NULL; PK `(operacion, revision)` | Append-only con triggers que abortan `UPDATE`/`DELETE`; conserva `clase` y los campos económicos antes/después; no es fuente de efectivo ni cantidad |
| `operacion_attempts` | Clave de idempotencia, huella del payload, respuesta privada, instante | Reintento 24 h; se revoca al restaurar; no es fuente financiera; una Venta no crea una tabla de intentos nueva |
| Contadores | Secuencia de IDs de operación | Reserva atómica sin MAX+1; sin reutilización; una Venta usa el mismo contador que una Compra |
| Efectivo | No persistido | Read model con apertura, entradas, salidas, compras y ventas; motor único de §4.2/§4.6 |
| Posición | No persistida | Read model `saldo_inversion + instrumento`; cantidad desde Compras/Ventas |

Reglas de integridad:

- `operaciones_inversion.id` es único, inmutable y no se reutiliza. `clase` solo admite `Compra`
  o `Venta`; cualquier otro valor se rechaza. No se crea una tabla `ventas` ni un segundo
  registro del mismo hecho.
- `instrumento` referencia un Instrumento existente. `saldo_efectivo` debe ser
  `Efectivo`/`Inversiones`; `saldo_inversion` debe ser `Inversión`/`Inversiones`; no pueden ser
  el mismo ID. En el alta, los Saldos deben existir y estar activos (D3); el Instrumento debe
  existir y, para una Venta, puede estar inactivo si D3 lo permite y hay cantidad disponible.
- `cantidad > 0` con escala máxima 8; `precio_divisa > 0` con escala máxima 6; `divisa` ISO
  4217; `cambio > 0` con escala máxima 6 si la divisa no es EUR (para EUR, ausente o exactamente
  1); `importe_eur > 0` en céntimos exactos; `comision_eur >= 0` en céntimos y `<= importe_eur`.
  La persistencia rechaza cualquier valor con más decimales que la escala o fuera del rango de
  §6, sin redondear.
- `fecha` es civil ISO; no se desplaza por zona; no puede ser futura según el día civil
  `Europe/Madrid` del servidor.
- `estado` es `Vigente` o `Anulada`; una Venta anulada no computa y no se rectifica.
- Sin DELETE de una Venta. La baja funcional es anular. Las rutas `DELETE` no se registran y
  caen en 404 `NOT_FOUND` sin escritura.
- Null no es `""`, `0` ni fecha de hoy. Una ausencia no se presenta como cero.

### 5.1 Identidad e IDs

- Las Ventas nuevas usan el mismo contador atómico que las Compras y un ID decimal exacto en
  TEXT. El cliente no elige el ID. No se crea un contador `venta` separado.
- La posición no tiene ID propio: se identifica por la pareja `saldo_inversion + instrumento`.
- Los IDs se muestran en la UI y son inmutables; rectificar o anular no cambia el ID.

### 5.2 Persistencia y versión de esquema

- **E4.2 no reserva versión de esquema.** La ampliación lógica es el dominio `clase =
  Compra|Venta` en `operaciones_inversion`; no hay tabla nueva. La versión física se resolverá
  en DEV conforme al gate de esquema vigente (v18).
- E4.1 está implementada e integrada en v18. La ampliación de `clase` a `Venta` requiere la
  migración que el DEV autorice en la siguiente versión libre, preservando filas, auditoría,
  contadores e identidad; si se prefiere ampliar el `CHECK` inicial mediante una enmienda de
  SPEC19, esta debe aprobarse por separado. Esta spec no reserva número de versión.
- La migración, si existe, debe ser aditiva o reconstruir solo lo necesario para ampliar el
  `CHECK`, copiando las filas existentes y sin pérdida de datos, sin reutilizar IDs, sin borrar
  auditoría y sin cambiar el significado de las Compras existentes. Debe conservar
  `instrumentos`, `operaciones_inversion`, `operacion_inversion_audit`, `operacion_attempts`,
  contadores, identidad (`database_origin`, `owner`, `key_hash`) y el resto de tablas ajenas.
- El gate de contrato, la revalidación de destino y las compuertas de `database.ts`,
  `database-identity.ts`, `database-schema.ts` y `backup.ts` son los de E4.1; E4.2 no los
  reescribe. Si la versión cambia, el DEV debe actualizar las compuertas y el backup/restore
  según el contrato que se apruebe, sin que esta spec fije el número.
- Backup/restore: al no haber tabla nueva, una copia que contenga Ventas las conserva en
  `operaciones_inversion`; la etiqueta y el rango de versiones son los del contrato de esquema
  que se implemente, no una etiqueta `e4.2-*` inventada aquí. El restore exige directorio nuevo,
  verifica el manifiesto de la versión de la copia y vacía intentos según la política vigente.
- Sin datos reales, importación ni migración operativa en esta entrega. Los fixtures son nuevos,
  ficticios y deterministas.

## 6. Invariantes monetarios y precisión

| Concepto | Contrato |
| --- | --- |
| EUR | Entero de céntimos firmado de 64 bits, `BigInt` extremo a extremo, JSON como string decimal canónico; nunca float ni `number` para operar. |
| Cantidad | Decimal exacto positivo; hasta 8 decimales; sin float. |
| Precio unitario | Decimal exacto positivo en la divisa de la operación; hasta 6 decimales. |
| Cambio histórico | Decimal exacto positivo cuando la divisa no es EUR; EUR se trata como 1 y no exige captura; hasta 6 decimales. |
| Límites de entrada (DT2) | El entero escalado de cantidad (×10⁸), precio (×10⁶) y cambio (×10⁶) debe quedar en `1..=9007199254740991` (2⁵³−1). En el límite se acepta y se persiste exacto; por encima se rechaza con 422 y no se redondea. |
| Cálculo interno (DT2) | `cantidad × precio × cambio` y cualquier agregado se calculan con `BigInt`/decimal exacto de precisión arbitraria, sin `number`, sin float y sin recortar al rango de entrada. Solo la presentación se redondea a céntimos. |
| Importe EUR cobrado | Céntimos exactos positivos; es el importe observado del abono y la única base del efecto en efectivo; incluye la comisión si existe. |
| Comisión | EUR, no negativa, dos decimales, `<= importeEur`, ya incluida en el importe cobrado; nunca se suma ni se resta otra vez. |
| Referencia | `cantidad × precio × cambio` es solo contraste informativo, calculado en decimal exacto y presentado redondeado a céntimos solo para visualización; su diferencia con el importe cobrado no se persiste como segundo importe autorizado. |
| Precisión excesiva | Se rechaza en API y persistencia; no se redondea ni se trunca en silencio. |
| Fechas | Civiles `YYYY-MM-DD`, sin hora ni huso; UTC solo para auditoría técnica. «No futura» se resuelve con el día civil `Europe/Madrid` (`spanishToday`), no con UTC ni con la hora local del cliente. |
| Agregación temporal | Convención DT2 de fin de día: los hechos de la misma fecha se agregan al cierre; sin orden intradía ni hora económica. |
| Agregados | La cantidad y el efectivo se calculan desde hechos vigentes; no se almacenan como verdad editable. |

## 7. API behavior and external dependencies

Propuesta de contrato; rutas y esquema físico quedan sujetos al desarrollo autorizado. No hay
dependencias externas, cotizaciones, bancos ni servicios nuevos.

| Método y ruta | Uso | Reglas |
| --- | --- | --- |
| `GET /api/ventas?instrumento=&saldo=&saldoEfectivo=&saldoInversion=&desde=&hasta=&estado=&page=` | Listado | Autenticado; `saldo` casa con `saldoEfectivo` **o** `saldoInversion`; los específicos estrechan a una columna; vigentes por defecto, anuladas consultables; sin escritura. |
| `POST /api/ventas` | Alta | Validación de §4.1, §4.4 y §11; 422 `VALIDATION` para campos y 422 `INSUFFICIENT_UNITS` para cantidad (D1); idempotency-key; auditoría y efecto en efectivo/cantidad en la misma transacción. |
| `GET /api/ventas/{id}` | Ficha | 404 si no existe; incluye Saldos, Instrumento y resumen de auditoría. |
| `GET /api/ventas/{id}/auditoria` | Auditoría de la Venta | Autenticado; orden por `revision`; `anterior`/`posterior` con los campos económicos; 404 si no existe; sin escritura. |
| `POST /api/ventas/impacto` | Vista previa de alta | Efectivo antes/después y cantidad antes/después; 422 `INSUFFICIENT_UNITS` si el candidato es negativo; no escribe. |
| `POST /api/ventas/{id}/impacto` | Vista previa de rectificación | Antes/después con el payload completo propuesto, motivo y revisión; 409 `REVISION_CONFLICT` si la revisión es obsoleta; 422 `INSUFFICIENT_UNITS`/`INSUFFICIENT_CASH` si el candidato no es válido; no escribe. |
| `POST /api/ventas/{id}/rectificar` | Rectificación | `revision`, `motivo` y reemplazo completo de campos rectificables (§4.4); 409 `REVISION_CONFLICT` si la revisión es obsoleta; 422 `INSUFFICIENT_UNITS`/`INSUFFICIENT_CASH` si el resultado no es válido; atómica; auditoría. |
| `POST /api/ventas/{id}/impacto-anulacion` | Vista previa de anulación | Efecto en efectivo/cantidad; 409 `REVISION_CONFLICT` si la revisión es obsoleta; 422 `INSUFFICIENT_CASH` si D2 lo exige; no escribe. |
| `POST /api/ventas/{id}/anular` | Anulación | Cuerpo `{revision, motivo}`; 409 `REVISION_CONFLICT` si la revisión es obsoleta; conserva el registro; atómica; auditoría `anulación`; 422 `INSUFFICIENT_CASH` bajo D2 si el efectivo resultante es negativo. |
| `GET /api/instrumentos/{Ixxx}` | Ficha, posiciones e historial | Incluye `compras` y `ventas` (vigentes y anuladas consultables), cantidades, conteos vigentes, última compra/venta/operación y cobertura; sin valoración; declara cobertura parcial. |
| `GET /api/instrumentos/opciones` | Selectores del alta | Se reutiliza; `saldosEfectivo` y `saldosInversion` activos y sin preselección. Para la Venta, el DTO puede añadir `instrumentosVenta` con los activos y, bajo D3, los inactivos que tengan cantidad disponible, marcados con su Estado; no se ofrece un inactivo sin cantidad. No se crea un endpoint de opciones de Venta distinto. |
| `GET /api/inversiones/efectivo?saldo={Sxxx}&fecha=YYYY-MM-DD` | Efectivo del bróker | Motor único; sin `fecha` devuelve la cifra actual idéntica a `GET /api/saldos/{id}`; con `fecha`, corte de suficiencia etiquetado; 422 si el Saldo no es `Efectivo`/`Inversiones`; no escribe. |
| `GET /api/saldos/{id}` | Posición del Saldo | Sin cambio de contrato; para `Efectivo`/`Inversiones` incluye Ventas; para `Inversión`/`Inversiones` sigue «No disponible hasta E4.3»; no escribe. |
| `GET /api/ciclos` y flujo mensual | Referencia y ciclos | Sin cambio de contrato; la referencia incorpora la fuente de inversión y su cobertura; no se usa el reloj. |

Cuerpos propuestos:

```json
POST /api/ventas
{"fecha": "2026-04-10", "instrumento": "I1001",
 "saldoEfectivo": "S003", "saldoInversion": "S004",
 "cantidad": "5", "precio": "110.00", "divisa": "USD",
 "cambio": "0.920000", "importeEur": "506.00", "comisionEur": "2.00",
 "concepto": "Venta parcial demo", "nota": null}

POST /api/ventas/{id}/rectificar
{"revision": 1, "motivo": "Corrección de cantidad ficticia",
 "fecha": "2026-04-10", "cantidad": "3", "precio": "110.00", "divisa": "USD",
 "cambio": "0.920000", "importeEur": "303.00", "comisionEur": "1.00",
 "concepto": "Venta parcial demo", "nota": null}

POST /api/ventas/{id}/anular
{"revision": 2, "motivo": "Duplicado ficticio de la venta"}
```

La rectificación es un reemplazo completo: si se omite `precio`, `divisa`, `comisionEur`,
`concepto` o `nota`, la petición se rechaza con 422 y el campo señalado. Para una Venta en EUR,
`cambio` debe enviarse como `null` (o `"1.000000"`, único valor admitido).

DTO de lectura propuesto para la ficha:

```json
{
  "instrumento": {"id": "I1001", "nombre": "Fondo índice demo", "estado": "Activa", "revision": 2},
  "posiciones": [
    {"saldoInversion": {"id": "S004", "nombre": "Cartera de inversión demo"},
     "cantidad": "7.5", "compras": 1, "ventas": 1,
     "ultimaCompra": "2026-02-10", "ultimaVenta": "2026-04-10",
     "ultimaOperacion": "2026-04-10"},
    {"saldoInversion": {"id": "S006", "nombre": "Cartera secundaria demo"},
     "cantidad": "3", "compras": 1, "ventas": 0,
     "ultimaCompra": "2026-03-03", "ultimaVenta": null,
     "ultimaOperacion": "2026-03-03"}
  ],
  "cobertura": "Solo operaciones registradas; histórico anterior no importado",
  "valoracion": {"estado": "No disponible", "motivo": "Valoración E4.3 no entregada"},
  "compras": [
    {"id": "5001", "clase": "Compra", "fecha": "2026-02-10", "cantidad": "12.5",
     "precio": "100.00", "divisa": "USD", "cambio": "0.900000",
     "importeEur": "1125.00", "comisionEur": "5.00", "estado": "Vigente",
     "saldoEfectivo": {"id": "S003"}, "saldoInversion": {"id": "S004"}},
    {"id": "5002", "clase": "Compra", "fecha": "2026-03-03", "cantidad": "3",
     "precio": "98.00", "divisa": "USD", "cambio": "0.900000",
     "importeEur": "264.60", "comisionEur": "0.00", "estado": "Vigente",
     "saldoEfectivo": {"id": "S003"}, "saldoInversion": {"id": "S006"}}
  ],
  "ventas": [
    {"id": "6001", "clase": "Venta", "fecha": "2026-04-10", "cantidad": "5",
     "precio": "110.00", "divisa": "USD", "cambio": "0.920000",
     "importeEur": "506.00", "comisionEur": "2.00", "estado": "Vigente",
     "saldoEfectivo": {"id": "S003"}, "saldoInversion": {"id": "S004"}}
  ]
}
```

```json
{
  "efectivo": {
    "saldo": {"id": "S003", "nombre": "Efectivo de inversión demo", "tipo": "Efectivo", "control": "Inversiones"},
    "fecha": null, "vista": "actual",
    "apertura": "1000.00", "entradas": "2500.00", "salidas": "300.00",
    "compras": "1389.60", "ventas": "506.00",
    "comisionIncluida": "7.00",
    "disponible": "2316.40", "condicion": "calculado"
  }
}
```

Reglas de API:

- Reutilizar MFA/sesión, Origin/CSRF, límites JSON, Effect Schema, revisiones,
  idempotencia 24 h, auditoría y errores sin SQL.
- `GET` no escribe, no repara posiciones y no crea Instrumentos. Las rutas de impacto
  (`/api/ventas/impacto`, `/api/ventas/{id}/impacto`, `/api/ventas/{id}/impacto-anulacion` y
  `/api/movimientos/impacto` sobre Saldos de inversión) tampoco escriben: no reservan ID, no
  mueven el contador, no crean auditoría y no alteran efectivo, cantidad ni posición; la prueba
  compara tablas, contadores y auditoría antes/después.
- 404 `NOT_FOUND` para ID inexistente o ruta/método no registrado (incluido `DELETE`);
  401/403 para acceso/CSRF. Los 409 y 422 se emiten con el código de su causa; no existe un 409
  ni un 422 genéricos. Sin rutas DELETE.
- `GET /api/ventas` y `GET /api/compras` pueden compartir el mismo DTO de operación con
  `clase`, pero no se crea una tabla ni un registro duplicado. La ficha devuelve ambas listas.

Códigos de error (contrato unívoco; una causa, un código):

| Causa | HTTP | Código | Cuerpo mínimo |
| --- | --- | --- | --- |
| Validación de campo, formato, escala, magnitud, fecha futura, Estado no elegible, campo rectificable omitido o no rectificable | 422 | `VALIDATION` | campo y motivo |
| Cantidad vendida superior a la disponible (D1) o Compra rectificada a la baja/anulada por debajo de la cantidad vendida (D7), incluida la ventana posterior de una retroactiva | 422 | `INSUFFICIENT_UNITS` | `disponible`, `necesario`, `minimo`, `fecha`, `saldoInversion`, `instrumento` |
| Suficiencia de efectivo insuficiente en una corrección/anulación (D2) o en una Compra | 422 | `INSUFFICIENT_CASH` | `disponible`, `necesario`, `minimo`, `fecha` |
| `revision` obsoleta en rectificar o anular | 409 | `REVISION_CONFLICT` | revisión vigente esperada |
| Huella o contexto de previsualización de un **Movimiento** obsoleto (`financeRevision` / `contextRevision`) | 409 | `IMPACT_CHANGED` | requiere recalcular; las rutas de Venta no transportan huella y no emiten este código |
| Guard de impacto de Saldo: cambio de `tipo`, `control`, `saldoApertura`, `fechaApertura` o `permiteSalidaExterior` con Compras o Ventas | 409 | `HISTORY_LOCKED` | dependencia que lo bloquea |
| Idempotency-key ausente o inválida | 422 | `IDEMPOTENCY_REQUIRED` | clave de intento inválida |
| Misma idempotency-key con payload distinto | 409 | `IDEMPOTENCY_CONFLICT` | conflicto sin segunda Venta |

- La falta de cantidad es **siempre** 422 `INSUFFICIENT_UNITS`, nunca 409 y nunca
  `INSUFFICIENT_CASH`. La falta de efectivo es **siempre** 422 `INSUFFICIENT_CASH`, nunca 409.
  Un 409 expresa revisión obsoleta, contexto obsoleto o guard de impacto, no falta de cantidad.
- `IMPACT_CHANGED` pertenece a la confirmación de un Movimiento previsualizado: solo esa ruta
  transporta `financeRevision`/`contextRevision`. Las rutas de Venta no reciben ni emiten huella;
  su control de concurrencia es `revision`, y un contexto de Movimiento invalidado por una Venta
  se prueba en AC-40.
- Importes como string decimal; null no se convierte en 0. La lista y la ficha declaran cuándo
  una cifra no está disponible y por qué.
- La confirmación de un Movimiento previsualizado revalida dentro de la transacción:
  Instrumento/Saldos activos, tipos correctos, efectivo suficiente, revisión y huella. Cada
  revalidación fallida devuelve solo el código de su causa. Ninguna escribe de forma parcial.
- No se aceptan campos de Movimiento (Tipo, Partida, Referencia, Subtipo) en el payload de
  Venta; no se ignoran silenciosamente para simular una clasificación.
- Ningún endpoint devuelve datos de otra sesión ni permite elegir actor. Sin endpoints de
  fixtures o de importación.

## 8. Concurrencia, atomicidad, persistencia y seguridad

- Una conexión de escritura administrada, WAL, `synchronous=FULL`, `busy_timeout` acotado y
  transacciones breves `BEGIN IMMEDIATE`; sin operaciones asíncronas dentro del callback
  transaccional.
- Alta de Venta: reserva de ID, validaciones, efecto en efectivo/cantidad y auditoría en la
  misma transacción. Cualquier fallo revierte todo: no hay Venta parcial, no se mueve el
  contador y no se altera el efectivo.
- La cantidad disponible se recalcula dentro de la transacción, incluida la ventana posterior
  de una operación retroactiva; dos altas simultáneas no pueden dejar cantidad negativa por una
  validación obsoleta. Si el recálculo ya no alcanza, la petición rechazada devuelve 422
  `INSUFFICIENT_UNITS` con `disponible`, `necesario`, `minimo`, `fecha`, `saldoInversion` e
  `instrumento`, sin escritura y sin consumir el contador.
- Bajo D2, la suficiencia de efectivo de una rectificación/anulación se recalcula dentro de la
  transacción; si ya no alcanza, devuelve 422 `INSUFFICIENT_CASH` sin escritura.
- Rectificación/anulación: comparar `revision` dentro de la transacción; petición obsoleta
  devuelve 409 `REVISION_CONFLICT` sin sobrescribir. La huella de impacto de un Movimiento
  incluye Instrumento, Saldos, Compra, Venta, revisiones y hechos que afecten al efectivo o la
  cantidad; las rutas de Venta no reciben ni emiten esa huella y usan `revision`.
- `financeRevision` incorpora las filas de `operaciones_inversion`, por lo que una Venta
  registrada entre la vista previa y la confirmación de un Movimiento invalida el contexto y
  devuelve 409 `IMPACT_CHANGED` sin escritura. La huella es global, no por Saldo; es la misma
  sobre-invalidación segura de E4.1.
- Guard de impacto de Saldo: la comprobación de E1.1/E4.1 se amplía a las Ventas. Si el Saldo
  interviene como `saldo_efectivo` o `saldo_inversion` en alguna Compra o Venta, incluida una
  anulada, el cambio de `tipo`, `control`, `saldoApertura`, `fechaApertura` o
  `permiteSalidaExterior` devuelve 409 `HISTORY_LOCKED` sin escritura. Los demás campos y el
  cambio de Estado siguen permitidos.
- Dos procesos o conexiones no pueden crear dos Ventas para el mismo intento idempotente.
- Lecturas financieras con snapshot transaccional; la posición y el efectivo se calculan desde
  hechos vigentes, no desde cachés persistidas. `GET /api/saldos/{id}`, el endpoint de efectivo
  y la previsualización de Movimientos consumen el mismo motor y no pueden discrepar dentro del
  mismo snapshot.
- Auditoría append-only en `operacion_inversion_audit`: actor único del servidor, UTC, revisión
  resultante, motivo y JSON `anterior`/`posterior`; triggers que abortan `UPDATE` y `DELETE`. No
  se registran contraseñas, tokens, OTP, claves, importes ni payloads en logs públicos. La tabla
  `audit` existente no se modifica.
- Backup/restore: E4.2 no crea tabla nueva; una copia que contenga Ventas las conserva en
  `operaciones_inversion` y en su auditoría. La etiqueta y el rango de versiones son los del
  contrato de esquema que se implemente; el restore exige directorio nuevo, verifica el
  manifiesto de la versión de la copia y vacía sesiones, desafíos e intentos según la política
  vigente. No se añade un mecanismo de copia nuevo. El guard de entorno demo sigue intacto.
- Sin nuevas dependencias, ORM, servicios externos ni cambios de autenticación.

## 9. Pantallas y wireframes (W11–W16 y W2/W5 rev3 APROBADAS 2026-10-28)

Presentación visual de revisión: [22-ventas-posicion-broker-wireframes.html](22-ventas-posicion-broker-wireframes.html).
Es un documento estático con datos ficticios; no es implementación ni captura de la aplicación.
El HTML y las capturas rev3 se conservan como evidencia del artefacto aprobado; su banner indica
el estado de revisión en el momento de la captura.

Datos ficticios. Se reutiliza el shell, tokens, tablas/tarjetas, foco y componentes existentes;
tema claro; sin modo oscuro. **W1–W10 de E4.1 no se reabren.** W11–W16 y la extensión de la
ficha fueron **aprobadas visualmente por el usuario el 2026-10-28**; la aprobación no acredita
implementación ni pruebas de navegador. D4 propone conservar las pestañas Instrumentos/Compras y
añadir Ventas.

### W2/W5 — Ficha del Instrumento, extensión (1440/390)

La ficha conserva identidad, ISIN, divisa de referencia, estado y auditoría. Añade:

```text
Posiciones
S004 · Cartera de inversión demo    7,5       1 compra   1 venta    10/02/2026 · 10/04/2026
S006 · Cartera secundaria demo      3         1 compra   0 ventas   03/03/2026
Valoración: No disponible hasta E4.3 · Cobertura: solo operaciones registradas
Historial: [Compras] [Ventas]
```

Una posición con cantidad 0 se muestra como `0` con su historial y sin etiqueta «Cerrada»
(D5). No hay columnas de valor, resultado ni rentabilidad.

### W11 — Listado de Ventas (1440)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ MyFinanzas   Ciclo financiado: 05/2026 · referencia 20/04/2026               │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ Inversiones  │ Ventas                                      [+ Nueva venta]   │
│  Instrumentos│ Filtros: [Instrumento ▾] [Saldo ▾] [Estado ▾] [Desde] [Hasta]│
│  Compras     │ ┌───────────────────────────────────────────────────────────┐ │
│  Ventas      │ │ Fecha      Instrumento  Saldo inv. Cant. Precio  Div.    │ │
│              │ │ 10/04/2026 I1001       S004       5     110,00  USD     │ │
│              │ │ 15/04/2026 I1001       S004       7,5   112,00  USD     │ │
│              │ │ 20/04/2026 I1001       S006       1     105,00  EUR     │ │
│              │ │ ...                                                        │ │
│              │ └───────────────────────────────────────────────────────────┘ │
│              │ Efectivo S003: 3.202,60 € · posición separada · sin valoración │
│              │ Cobertura: solo operaciones registradas; histórico no importado│
│              │ La tabla completa incluye EUR cobrado, comisión, estado, [Ver]│
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### W12 — Listado de Ventas (390)

```text
┌──────────────────────────────────────┐
│ MyFinanzas · Ciclo 05/2026           │
│ referencia 20/04/2026                │
│ Inversiones · Ventas                 │
│ [+ Nueva venta]                      │
│ [Instrumento ▾] [Estado ▾]           │
│ [Filtros ▾] en 390                   │
│ ┌──────────────────────────────────┐ │
│ │ 10/04/2026 · I1001 · S004        │ │
│ │ 5 · 110,00 USD · 506,00 €        │ │
│ │ comisión 2,00 € incluida         │ │
│ │ Vigente                  [Ver]   │ │
│ └──────────────────────────────────┘ │
│ Efectivo S003: 3.202,60 €            │
│ Cobertura: solo operaciones          │
│ registradas; histórico no importado  │
│ Sin valoración hasta E4.3            │
└──────────────────────────────────────┘
```

### W13 — Alta de Venta (1440)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Inversiones · Ventas · Nueva venta                                           │
├───────────────────────────────────────────────┬──────────────────────────────┤
│ Identificación                                │ Impacto (no escribe)         │
│ Fecha *              [10/04/2026]             │ Efectivo S003                │
│ Instrumento *        [I1001 · Fondo demo ▾]   │ antes      1.810,40 €        │
│ Saldo efectivo *     [S003 · Efectivo inv. ▾] │ después    2.316,40 €        │
│ Saldo inversión *    [S004 · Cartera demo ▾]  │ Cantidad S004/I1001          │
│                                               │ antes      12,5              │
│ Ejecución                                     │ después    7,5               │
│ Cantidad *           [5]                      │ disponible 12,5              │
│ Precio unitario *    [110,00]                 │                              │
│ Divisa *             [USD ▾]                  │ [Confirmar venta]            │
│ Cambio histórico *   [0,920000]               │                              │
│ EUR cobrado *        [506,00]                 │ [Confirmar venta]            │
│ Comisión incluida    [2,00]                   │                              │
│ Concepto / Nota      [Venta parcial demo]     │                              │
│ Referencia 506,00 · Diferencia 0,00           │                              │
│ [Aviso si Instrumento inactivo con cantidad]  │                              │
└───────────────────────────────────────────────┴──────────────────────────────┘
```

### W14 — Alta de Venta (390)

```text
┌──────────────────────────────────────┐
│ Inversiones · Nueva venta            │
│ Fecha *        [10/04/2026]          │
│ Instrumento *  [I1001 ▾]             │
│ Saldo efectivo * [S003 ▾]            │
│ Saldo inversión * [S004 ▾]           │
│ Cantidad *     [5]                   │
│ Precio *       [110,00]  Divisa [USD]│
│ Cambio *       [0,920000]            │
│ EUR cobrado *  [506,00]              │
│ Comisión       [2,00]                │
│ Impacto: 1.810,40 → 2.316,40 €       │
│ Cantidad: 12,5 → 7,5                 │
│ [Confirmar venta]                    │
└──────────────────────────────────────┘
```

### W15 — Impacto, rectificación y anulación (1440)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Venta 6001 · I1001 · S004 · 10/04/2026                                       │
├───────────────────────────────────────────────┬──────────────────────────────┤
│ Rectificación                                 │ Antes / Después              │
│ Fecha [10/04/2026] Cantidad [3]               │ Efectivo 2.316,40 → 2.113,40 │
│ Precio [110,00] Divisa [USD] Cambio [0,920000]│ Cantidad 7,5 → 9,5           │
│ EUR cobrado [303,00] Comisión [1,00]          │ Referencia 303,60 · Dif. −0,60│
│ Motivo * [Corrección de cantidad ficticia]    │ [Confirmar rectificación]    │
│                                               │ [Anular venta]               │
│                                               │ Impacto anulación:           │
│                                               │ Efectivo 2.113,40 → 1.810,40 │
│                                               │ Cantidad 9,5 → 12,5          │
│                                               │ Motivo * [Duplicado ficticio]│
│                                               │ [Confirmar anulación]        │
└───────────────────────────────────────────────┴──────────────────────────────┘
```

### W16 — Impacto, rectificación y anulación (390)

```text
┌──────────────────────────────────────┐
│ Venta 6001 · I1001 · S004            │
│ Efectivo 2.316,40 → 2.113,40 €       │
│ Cantidad 7,5 → 9,5                   │
│ Fecha [10/04/2026] Cantidad [3]      │
│ Precio [110,00] Divisa [USD]         │
│ Cambio [0,920000]                    │
│ EUR cobrado [303,00] Comisión [1,00] │
│ Referencia 303,60 · Dif. −0,60       │
│ Motivo * [.........................] │
│ [Confirmar rectificación]            │
│ Anulación: 2.113,40 → 1.810,40 €     │
│ Cantidad 9,5 → 12,5                  │
│ [Confirmar anulación]                │
└──────────────────────────────────────┘
```

## 10. Empty, loading and error states

- **Listado vacío:** «Sin ventas registradas» + alta; ninguna fila ficticia.
- **Ficha sin posiciones:** «Sin posiciones registradas» con cantidad 0 verificada del
  registro; la valoración sigue «No disponible hasta E4.3».
- **Carga:** estado visible y filtros conservados; no se muestra 0 mientras carga.
- **Error de fuente/DB:** identidad y hechos conocidos permanecen visibles; efectivo, posición o
  ventas no verificables se muestran «No disponible» con motivo, sin borrar el resto ni
  convertirlos en cero.
- **Conflicto de revisión o contexto:** 409; se distingue `REVISION_CONFLICT` para una
  `revision` obsoleta y `IMPACT_CHANGED` para una huella/contexto de **Movimiento** obsoleto; se
  conserva el borrador y se pide actualizar. `REVISION_CONFLICT` aplica a rectificar y anular;
  `IMPACT_CHANGED` solo a confirmar un Movimiento previsualizado cuando una Venta cambió el
  efectivo entre la vista previa y la confirmación. Las rutas de Venta no usan huella.
- **Guard de impacto de Saldo:** intentar cambiar `tipo`, `control`, `saldoApertura`,
  `fechaApertura` o `permiteSalidaExterior` de un Saldo con Compras o Ventas devuelve 409
  `HISTORY_LOCKED`, con explicación de la dependencia y sin escritura; desactivar/reactivar
  siguen disponibles.
- **Alta fallida:** rollback completo; sin Venta parcial ni efecto en efectivo/cantidad.
- **Instrumento inactivo o Saldo no elegible:** bajo D3, el Instrumento inactivo con cantidad
  se muestra con aviso y el Saldo inactivo no se ofrece; si llega por API, 422 con motivo y sin
  escritura.
- **Sin Saldo de efectivo elegible:** el alta se bloquea y explica que no hay ningún Saldo
  `Efectivo`/`Inversiones` activo; no se ofrece una cifra agregada ni un Saldo de otro
  Tipo/Control.
- **Cantidad insuficiente:** bloqueo con 422 `INSUFFICIENT_UNITS`, `disponible`, `necesario`,
  `minimo`, `fecha`, `saldoInversion` e `instrumento`; el borrador se conserva y no se ofrece
  override.
- **Efectivo insuficiente en corrección/anulación (D2):** bloqueo con 422 `INSUFFICIENT_CASH`,
  `disponible`, `necesario`, `minimo` y `fecha`; el borrador se conserva y no se ofrece override.
- **Sesión expirada:** se conserva el borrador y se pide reautenticar sin exponer datos.
- **Respuesta antigua:** no sustituye un Instrumento, Saldo o fecha elegidos después.
- **Anulada:** se muestra como anulada y no computa; no se ofrece rectificarla.
- **Valoración no disponible:** etiqueta y motivo; nunca 0 ni «sin resultados» ambiguo.
- **Cobertura parcial:** siempre visible en listado y ficha; no se presenta como posición
  completa ni se completa con datos no registrados.
- **Referencia no disponible:** se muestra el estado (`pendiente`/`error`), la cobertura por
  fuente y el motivo; no se usa el reloj ni una fecha inventada.

## 11. Validation and edge cases

- **Cantidad:** estrictamente positiva; cero, negativos, NaN, infinito y exponentes rechazados;
  escala máxima 8 y entero escalado dentro de `1..=2⁵³−1`; exceso 422 sin redondeo. Una Venta
  no puede exceder la cantidad disponible (D1) y no deja cantidad negativa en ninguna fecha
  posterior.
- **Precio:** estrictamente positivo; escala máxima 6; mismo rango de magnitud; exceso 422.
- **Divisa:** ISO 4217 de tres letras mayúsculas; EUR se trata como 1; no se aceptan símbolos ni
  importes con separadores ambiguos. `US`, `USDD`, `usd` o `EURO` devuelven 422 sin escritura.
  La UI admite coma decimal española y la API punto.
- **Cambio:** obligatorio y positivo si la divisa no es EUR; escala máxima 6 y mismo rango de
  magnitud; para EUR no se exige y se trata como 1; si se informa para EUR, solo `1`
  (`"1.000000"`) es válido; no se completa con un cambio actual.
- **Importe EUR:** positivo, céntimos exactos; sin float. Una diferencia con
  `cantidad×precio×cambio` se conserva y se muestra como informativa, no se corrige sola.
- **Comisión:** no negativa, en EUR, dos decimales, `<= importe EUR`, ya incluida en el importe
  cobrado; nunca se suma ni se resta otra vez. Sin comisión = 0 explícito o NULL, sin doble
  efecto. Una comisión con 3 decimales (`"5.001"`) devuelve 422 sin escritura.
- **Concepto y nota:** opcionales; hasta 2000 caracteres cada uno y sin caracteres de control;
  2000 se acepta y 2001 se rechaza con 422 sin escritura.
- **Fecha:** civil válida, incluido bisiesto; no se desplaza por huso; no futura. «No futura» se
  decide con `spanishToday` (día civil `Europe/Madrid`) en el servidor. No se usa el reloj ni la
  hora del cliente como fecha económica.
- **Saldos:** ambos existentes, activos y de Tipo/Control elegible; no iguales. Un Saldo inactivo
  no se ofrece (D3); un ID de otro Tipo/Control se rechaza. `Efectivo`/`Movimientos` no es
  elegible como efectivo de inversión. Varios Saldos de efectivo de inversión se ofrecen por
  separado y la selección es obligatoria.
- **Instrumento:** existente; para una Venta, activo o inactivo con cantidad disponible según D3;
  inactivo sin cantidad se rechaza; el maestro no se modifica desde la Venta. Bajo D3, el
  selector de Venta incluye los Instrumentos inactivos con cantidad, marcados, y no los ofrece
  para nuevas Compras.
- **Cantidad disponible:** se calcula con Compras y Ventas vigentes; una Venta total deja 0; una
  Venta sobre una posición inexistente o con cantidad 0 se rechaza bajo D1; una Venta en un Saldo no
  afecta a la posición del mismo Instrumento en otro Saldo.
- **Efectivo:** una Venta nueva solo suma; una rectificación/anulación que reste se somete a D2;
  la comisión ya incluida no se resta otra vez; una Venta no altera `Efectivo`/`Movimientos`.
- **Estado:** Vigente/Anulada para Venta; sin DELETE (404 sin escritura). Anular exige `revision`
  y `motivo`; una revisión obsoleta devuelve 409 `REVISION_CONFLICT`.
- **Rectificación:** solo sobre Vigente; revisión y motivo obligatorios; reemplazo completo de
  fecha, cantidad, precio, divisa, cambio, importe, comisión, concepto y nota; campo omitido se
  rechaza; `null` solo limpia nullable; Instrumento y Saldos se rechazan con 422. Anular dos
  veces se rechaza. Una Venta anulada no se rectifica.
- **Duplicados:** el mismo Instrumento puede tener varias Ventas el mismo día; no se impone
  unicidad de operación. El ISIN y el maestro no se tocan desde la Venta. La idempotencia impide
  duplicar el mismo intento; una clave distinta con payload distinto es otra Venta válida.
- **Concurrencia:** dos Ventas simultáneas no pueden dejar cantidad negativa; si la segunda ya no
  alcanza, devuelve 422 `INSUFFICIENT_UNITS`; una revisión obsoleta devuelve 409
  `REVISION_CONFLICT`; una huella de **Movimiento** obsoleta, 409 `IMPACT_CHANGED` (las rutas de
  Venta no usan huella). Ningún caso usa un 409 genérico por el mero hecho de ser concurrente.
- **Referencia:** solo fechas vigentes de Compra/Venta; una operación anulada no aporta fecha; una
  rectificación aporta la fecha vigente; una fuente pendiente/error se declara y no se sustituye
  por el reloj. La referencia puede retroceder si se anula la operación más reciente.
- **Integridad de lectura:** una Venta con referencias ausentes se muestra como incidencia
  «Revisar», sin reparar ni borrar; no se computa como posición válida.
- **Sin datos reales:** los fixtures son deterministas y ficticios; no se importa Excel ni se
  publican importes personales.

## 12. Exclusions

- Sin valoración, valor actual, valor manual, resultado, rentabilidad, Estado Abierta/Cerrada ni
  agregados patrimoniales (E4.3).
- Sin lotes, FIFO, coste medio, plusvalías/minusvalías fiscales, dividendos, splits,
  ampliaciones, retenciones ni comisiones bancarias distintas de la comisión de la operación.
- Sin tipos nuevos de Movimiento y sin Gasto/Compra en Movimientos; sin Partida, Referencia,
  Ciclo, Presupuesto ni Deuda para una Venta.
- Sin tabla `ventas`, sin segundo contador de operaciones y sin duplicar el hecho en otro
  registro.
- Sin reserva de versión de esquema por E4.2; la versión y la migración se resuelven en DEV bajo
  el gate de E4.1.
- Sin importación, mapping, histórico anterior, datos personales ni Excel. DT7 se aplaza a
  E4.5/E4.12.
- Sin fotos, bloqueo de cierre (E4.8–E4.11) ni despliegue.
- Sin alertas, recordatorios, exportaciones ni automatizaciones externas.
- Sin autenticación, permisos ni componentes visuales nuevos; se reutiliza E1.
- Sin cambios en `audit` ni en el motor de `Efectivo`/`Movimientos`; R6 (Liquidez) solo cambia
  su valor porque el efectivo incluye Ventas, y R3 (referencia temporal) incorpora la fuente de
  inversión.
- Sin campo formal de enlace entre una Venta anulada y su reemplazo: la trazabilidad es el
  `motivo` textual y la auditoría de ambas operaciones.
- Sin reabrir las decisiones D1–D7 confirmadas A ni inferir las alternativas B descartadas.

## 13. Acceptance checks

Todos los criterios son **diseño rev2**; ninguno declara un resultado ejecutado ni un PASS.
Aplican las decisiones **D1–D7 = A** confirmadas por el usuario el 2026-10-27; las alternativas
B quedan descartadas. AC-05, AC-27, AC-30 y AC-45 llevan la decisión aplicada en su ID; AC-04,
AC-18, AC-19 y AC-35 aplican D5=A. Si una decisión cambiara, se revisarían la funcionalidad, los
AC y el testplan. «Sin escritura» significa que no cambian Venta,
efectivo, cantidad, contador ni auditoría. Los códigos esperados se fijan por caso y no se
solapan: 404 `NOT_FOUND`; 409 `REVISION_CONFLICT`; 409 `IMPACT_CHANGED` para huella/contexto de
**Movimiento**; 409 `HISTORY_LOCKED`; 422 `VALIDATION`; 422 `INSUFFICIENT_UNITS`; 422
`INSUFFICIENT_CASH`; 422 `IDEMPOTENCY_REQUIRED`; 409 `IDEMPOTENCY_CONFLICT`; 401/403 para
acceso o CSRF. Total: 45 AC de diseño. Los AC de integración/regresión son AC-16, AC-17, AC-21,
AC-22, AC-34, AC-35, AC-36 a AC-42 y AC-45; AC-43 y AC-44 completan validación y consulta.

| ID | Acción / precondiciones | Resultado observable esperado |
| --- | --- | --- |
| E4.2-AC-01 | F-A (P1+P2): partir de `S003` con apertura 1.000,00, entradas 2.500,00, salidas 300,00 y Compras `P1` 1.125,00 + `P2` 264,60; registrar una Venta EUR de 5 a 110,00 en `S004` con EUR 550,00 y sin comisión | La Venta se guarda con cantidad, precio, divisa EUR, cambio NULL/1 e importe 550,00; el efectivo de `S003` pasa de 1.810,40 a 2.360,40 y la cantidad de `S004/I1001` de 12,5 a 7,5; no se crea Movimiento; la comisión es 0/NULL y no altera el importe |
| E4.2-AC-02 | Registrar `V1` USD: 5 a 110,00, cambio 0,920000, EUR 506,00, comisión 2,00, en `S004`; después registrar otra operación con cambio 0,950000 | `V1` conserva USD, 110,00, 0,920000, 506,00 y comisión 2,00; el efectivo sube exactamente 506,00 y la cantidad baja a 7,5; la operación posterior no recalcula `V1`; el cambio actual no se usa |
| E4.2-AC-03 | Venta parcial `V1` de 5 sobre una posición de 12,5 | La posición queda en 7,5; `compras=1`, `ventas=1`; la Venta parcial no consume una Compra concreta ni crea lote; el efectivo sube una vez |
| E4.2-AC-04 | Venta total `V2` de 7,5 sobre la posición restante de 7,5, a 112,00 USD, cambio 0,930000, EUR 781,20 | La posición `S004/I1001` queda en 0; la fila conserva `compras=1`, `ventas=2`, última compra 10/02/2026, última venta 15/04/2026; no se etiqueta «Cerrada»; no hay valoración ni resultado; el efectivo sube 781,20 |
| E4.2-AC-05 (D1=A) | F-B (7,5 disponibles): vender 8 el 20/04; I1002 sin posición: vender 1 el 20/04; F-C (0 tras 15/04): insertar Venta de 1 el 01/03; mismo día: P3 2 y V5 2 el 02/05, luego V6 1; repetir V6 en orden inverso | Cada intento devuelve 422 `INSUFFICIENT_UNITS` y sin escritura. Casos: (a) `disponible=7,5`, `necesario=8`, `minimo=−0,5`, `fecha=2026-04-20`; (b) `disponible=0`, `necesario=1`, `minimo=−1`, `fecha=2026-04-20`; (c) `disponible=0`, `necesario=1`, `minimo=−1`, `fecha=2026-04-15`; (d) `disponible=0`, `necesario=1`, `minimo=−1`, `fecha=2026-05-02`, idéntico en ambos órdenes; `saldoInversion` e `instrumento` identifican el par; nunca 409 ni contador consumido |
| E4.2-AC-06 | Comprar `I1001` en `S004` y `S006`; vender 5 en `S004` y 1 en `S006` | Cada posición es independiente: `S004` pasa de 12,5 a 7,5 y `S006` de 3 a 2; la Venta de un Saldo no cambia la cantidad del otro; no se suman en una posición única |
| E4.2-AC-07 | Venta con EUR 506,00 y comisión 2,00 ya incluida; Venta con comisión 0/NULL | El efectivo sube 506,00, no 504,00 ni 508,00; la comisión se muestra como desglose informativo; no hay doble efecto; la comisión 0/NULL no cambia el importe |
| E4.2-AC-08 | Venta con comisión mayor que el importe, comisión negativa y comisión con 3 decimales | Las tres devuelven 422 `VALIDATION` con el campo, sin escritura, sin fila y sin cambio de efectivo/cantidad |
| E4.2-AC-09 | Reintentar `POST /api/ventas` con la misma idempotency-key y payload; repetir con payload distinto; registrar dos Ventas distintas el mismo día con claves distintas | El primer caso devuelve un solo hecho y un solo abono; el segundo devuelve 409 `IDEMPOTENCY_CONFLICT` sin segunda Venta; las dos Ventas del mismo día se aceptan y no se impone unicidad de operación |
| E4.2-AC-10 | F-B: rectificar `V1` con payload completo: cantidad 5→3, EUR 506,00→303,00, comisión 2,00→1,00, motivo y revisión vigente | La vista de impacto muestra efectivo 2.316,40→2.113,40 y cantidad 7,5→9,5; la referencia informativa 3×110×0,92=303,60 y la diferencia −0,60 se muestran sin corregir; la escritura es atómica; `revision` sube; la auditoría `rectificación` conserva antes/después y motivo; la posición y el efectivo se recalculan |
| E4.2-AC-11 | Rectificar con `revision` obsoleta; omitir `precio`; enviar `null` en `importeEur`; incluir `instrumento` o `saldoInversion` | La revisión obsoleta devuelve 409 `REVISION_CONFLICT`; la omisión y el `null` obligatorio devuelven 422 `VALIDATION` con el campo; incluir Instrumento/Saldos devuelve 422 sin escritura; ninguna escribe |
| E4.2-AC-12 | F-B: anular `V1` con `revision` y `motivo`; consultar efectivo, cantidad, ficha y auditoría | El registro se conserva como `Anulada`, deja de computar en efectivo, cantidad y referencia y no se borra; la auditoría `anulación` es consultable; el efectivo vuelve a 1.810,40 y la cantidad a 12,5 (F-A) |
| E4.2-AC-13 | Repetir la anulación con la revisión ya vigente; usar una revisión obsoleta; intentar rectificar una Venta anulada | La segunda anulación devuelve 422 `VALIDATION` por Estado no elegible; la revisión obsoleta devuelve 409 `REVISION_CONFLICT`; rectificar la anulada devuelve 422; ninguna escribe |
| E4.2-AC-14 | Intentar rectificar Instrumento o Saldos de una Venta; después anular la original y crear otra Venta con otro Instrumento/Saldo y el mismo `motivo` textual | La rectificación de identidad devuelve 422 sin escritura; la original queda Anulada y fuera de cálculos; la nueva computa en sus propios Saldos/Instrumento; no hay vínculo persistido, solo motivo y auditoría |
| E4.2-AC-15 | Crear, rectificar y anular Ventas; comparar Movimientos, Presupuesto, Partida, Referencia y Deuda antes/después | El número de Movimientos no cambia; no se crea Gasto/Compra, Partida, Referencia, ejecución presupuestaria ni Deuda; la Venta no se duplica en otro registro |
| E4.2-AC-16 | F-B: consultar `GET /api/saldos/S003` y `GET /api/inversiones/efectivo?saldo=S003` sin `fecha` y con `fecha` | Sin `fecha` ambas respuestas dan la misma cifra al céntimo (2.316,40) calculada por el mismo motor; con `fecha` la respuesta se etiqueta como corte de suficiencia y declara que no es la cifra actual; ninguna escribe |
| E4.2-AC-17 | Consultar `S001` (`Efectivo`/`Movimientos`) antes/después de una Venta en `S003` | La posición y el número de Movimientos de `S001` no cambian; la Venta no se incorpora a `Efectivo`/`Movimientos`; solo `Efectivo`/`Inversiones` la incorpora |
| E4.2-AC-18 | Consultar la ficha de `I1001` tras `P1`, `V1` y `V2` | `S004` muestra cantidad 7,5 tras `V1` y 0 tras `V2`; `compras=1`, `ventas=1` y luego `ventas=2`; `S006` conserva 3/1/0; las fechas de última compra/venta/operación son las correctas; no se mezclan Saldos |
| E4.2-AC-19 | Abrir listado y ficha con posiciones calculadas, incluida una posición a 0 | Se declara «Posición calculada solo con las operaciones registradas; no incluye histórico anterior no importado»; no se muestra valor actual, resultado ni rentabilidad; «No disponible hasta E4.3» no se sustituye por 0; no se etiqueta «Cerrada» |
| E4.2-AC-20 | F-A → F-B: registrar `V1` con fecha 10/04/2026, posterior a la última fecha de Movimientos (03/03/2026); Comida `pendiente`; Ciclos con Inicio 01/03/2026 y 01/04/2026; consultar la referencia, su cobertura, `GET /api/ciclos` y flujo mensual | Antes de `V1` la referencia es 03/03/2026 y el ciclo actual es el de Inicio 01/03/2026; tras `V1` la referencia es 10/04/2026, el ciclo actual es el de Inicio 01/04/2026 y el corte es 10/04/2026; la fuente de inversión está `disponible` con `maxDate=2026-04-10`; la cobertura declara Comida `pendiente`; no se inventa corte ni se usa `creado`, auditoría o reloj |
| E4.2-AC-21 | Probar `financialReference` con Movimientos 10/01/2026, Comida 20/02/2026 e Inversión 15/03/2026; después Inversión 15/01/2026; después Inversión 25/02/2026; después Inversión `pendiente` | Los máximos son 15/03/2026, 20/02/2026 y 25/02/2026 respectivamente; con Inversión pendiente y Comida 20/02/2026, el máximo es 20/02/2026; la cobertura identifica cada fuente; no se suma ni se inventa una fecha |
| E4.2-AC-22 | F-D (P1+V1+V2+V3): anular `V3` (20/04, la operación vigente más reciente) y consultar; después rectificar la fecha de `V2` a 25/04/2026 y consultar | Al anular `V3`, la referencia retrocede a 15/04/2026 (máximo vigente `V2`); al rectificar `V2` a 25/04/2026, la referencia pasa a 25/04/2026; la fecha anulada no se conserva como referencia |
| E4.2-AC-23 | Simular error de la fuente de inversión (tabla ilegible o consulta fallida); después abrir una base sin la tabla y una base con la tabla vacía; consultar cabecera, Ciclos y flujo mensual | El error devuelve `estado=error`, `fecha=null` y la cobertura con la causa; la tabla ausente queda `pendiente`; la tabla vacía queda `sin_referencia` con `maxDate=null` y la referencia global `sin_referencia` si no hay otras fechas; con otras fuentes, la referencia usa las disponibles; la UI muestra el motivo; no se usa `Date.now`, `creado` ni una fecha inventada |
| E4.2-AC-24 | Venta con fecha futura, fecha inválida, 29 de febrero bisiesto y fecha pasada válida; reloj fijo en `2026-01-15T23:30:00Z` y `2026-01-16T00:30:00Z` | Futuro e inválida se rechazan con 422; bisiesto y pasado se aceptan; la fecha civil se conserva literal sin desplazamiento por zona; el día máximo admitido es el día civil `Europe/Madrid` (`spanishToday`), no UTC ni la hora del cliente |
| E4.2-AC-25 | Venta con cantidad de 9 decimales, precio o cambio de 7; valores en el límite 8/6/6 y en `2⁵³−1`; EUR en céntimos; producto `cantidad×precio×cambio` que supera 2⁵³ | El exceso se rechaza con 422 en API y persistencia, sin fila ni redondeo; el límite se acepta y se persiste exacto; el EUR se guarda exacto en céntimos; el producto interno se calcula con precisión exacta y solo se redondea para presentación |
| E4.2-AC-26 | Venta EUR con `cambio` NULL y con `"1.000000"`; Venta EUR con `"1.100000"`; Venta USD sin cambio, con cambio 0, negativo y con divisa `US`/`USDD`/`usd` | Las dos primeras EUR se aceptan; la EUR con 1,1 y las USD inválidas devuelven 422 con el campo, sin escritura ni normalización; no se completa un cambio actual |
| E4.2-AC-27 (D3=A) | Instrumento inexistente; Instrumento inactivo sin cantidad; Saldo efectivo o de inversión inexistente/inactivo; Saldo de tipo incorrecto; efectivo = inversión; `Efectivo`/`Movimientos` como efectivo; Venta desde Saldo inactivo; Instrumento inactivo con cantidad en `S004` pero no en `S006` | Los casos inválidos devuelven 422 con motivo y sin escritura; bajo D3=A, el Instrumento inactivo con cantidad se acepta con aviso, se ofrece solo para el `saldo_inversion` donde tiene cantidad y no para el otro ni para nuevas Compras; el Saldo inactivo se rechaza hasta reactivarlo; no se crea Venta ni auditoría de éxito en los rechazos |
| E4.2-AC-28 | Fallo inyectado tras reservar ID o antes de auditar una Venta | Rollback completo: sin Venta, sin cambio de efectivo/cantidad, sin contador consumido y sin auditoría parcial |
| E4.2-AC-29 | (a) Dos Ventas concurrentes que compiten por la misma cantidad; (b) dos rectificaciones con revisión desactualizada; (c) dos altas con la misma idempotency-key | (a) una sola Venta válida y la otra 422 `INSUFFICIENT_UNITS` por recálculo, sin cantidad negativa; (b) una escritura válida y la otra 409 `REVISION_CONFLICT`; (c) un solo hecho y un solo abono; cada respuesta lleva solo el código de su causa, sin 409 genérico por concurrencia |
| E4.2-AC-30 (D2=A) | F-H: `S003` con apertura 2.000,00; Venta de 500,00 el 10/04; Gasto de 2.200,00 el 11/04 (efectivo 300,00); anular la Venta; repetir con rectificación a 100,00; repetir con rectificación al alza | La anulación devuelve 422 `INSUFFICIENT_CASH` con `disponible=300,00`, `necesario=500,00`, `minimo=−200,00`, `fecha=2026-04-11`; la rectificación a 100,00 devuelve `minimo=−100,00` en 11/04; la rectificación al alza se acepta; sin escritura ni efecto parcial. La alternativa B queda descartada |
| E4.2-AC-31 | Acceder sin sesión, sin CSRF/Origin y provocar error interno; invocar `DELETE /api/ventas/{id}` | 401/403 según corresponda; sin escritura; errores sin SQL, importes, tokens ni payload; DELETE devuelve 404 `NOT_FOUND` sin escritura; no hay rutas de fixtures |
| E4.2-AC-32 | Recorrer listado de Ventas, alta, impacto, rectificación, anulación (incluido su impacto) y ficha a 390 y 1440 con teclado; comprobar foco, etiquetas, overflow, tema claro y borrador | Flujos operables, foco visible y devuelto al aviso, etiquetas asociadas, sin overflow; tema claro; borrador conservado; confirmación deshabilitada sin motivo o con revisión obsoleta; avisos de cantidad/efectivo; impacto de anulación antes/después y D2; capturas ficticias inspeccionadas |
| E4.2-AC-33 | Provocar vacío, carga, error de fuente, 409, cantidad insuficiente, efectivo insuficiente y sesión expirada | Estados distintos y accionables; «No disponible» con motivo; nunca 0 ficticio; no se pierde el borrador ni la selección; la referencia pendiente/error se declara |
| E4.2-AC-34 | Inspeccionar IDs y `operacion_inversion_audit` tras alta, rectificación y anulación; intentar `UPDATE`/`DELETE` sobre la auditoría | IDs únicos e inmutables; una fila por revisión con `clase`, actor, UTC, motivo y JSON `anterior`/`posterior`; los triggers abortan modificaciones; `instrumento_audit` y `audit` no cambian; sin DELETE |
| E4.2-AC-35 | F-C (P1+V1+V2): nueva Compra `P3` de 2 el 02/05/2026; consultar posición y efectivo | La cantidad de `S004/I1001` pasa 12,5→7,5→0→2; la nueva Compra reabre la posición sin etiqueta «Cerrada»; en la fila `S004` los conteos son 1 compra/2 ventas antes de `P3` y 2/2 después; `S006` conserva 1 compra/0 ventas; el efectivo incorpora la Compra y las Ventas una sola vez |
| E4.2-AC-36 (integración/regresión) | Inspeccionar el esquema implementado: tablas, `clase`, auditoría, intentos y contadores; comprobar que no existe una tabla `ventas`; revisar la versión física y el gate | Una sola tabla `operaciones_inversion` con `clase` Compra/Venta; sin tabla `ventas`; misma auditoría, intentos y contador; ninguna versión reservada por SPEC22; si hay migración, preserva filas, auditoría, identidad y datos ajenos; el gate y la revalidación de destino son los de E4.1 |
| E4.2-AC-37 (integración/regresión) | Crear Compras y Ventas, hacer backup, restaurar en directorio nuevo y consultar posición/efectivo/auditoría | Las Ventas se conservan en `operaciones_inversion` y su auditoría; el restore no mezcla versiones, verifica el manifiesto de la copia y vacía intentos; no se crea una tabla ni un mecanismo de copia nuevos; sin datos reales |
| E4.2-AC-38 (integración/regresión) | Probar la referencia con Movimientos y Operaciones de inversión en la misma fecha máxima; después con una fuente pendiente y otra con error | La referencia es la fecha común una sola vez; la cobertura muestra ambas fuentes disponibles; una pendiente no se omite y un error devuelve `fecha=null`; no se duplica ni se inventa un máximo |
| E4.2-AC-39 (integración/regresión) | Con un Saldo que interviene solo en una Venta y otro con Compra y Venta (incluida una anulada), intentar cambiar `tipo`, `control`, `saldoApertura`, `fechaApertura` y `permiteSalidaExterior`; después desactivar/reactivar y cambiar solo el nombre | Los cinco cambios devuelven 409 `HISTORY_LOCKED` sin escritura en ambos Saldos; desactivar/reactivar con `revision` funcionan y conservan las operaciones; el nombre se puede cambiar; la auditoría del Saldo refleja solo los cambios permitidos |
| E4.2-AC-40 (integración/regresión) | Previsualizar un Gasto sobre `S003`; registrar una Venta que cambie su efectivo; confirmar el Movimiento con la huella de la vista previa; repetir con una previsualización sobre `S001` y una Venta en `S003` | La confirmación devuelve 409 `IMPACT_CHANGED` —no `REVISION_CONFLICT`— sin escribir el Movimiento; el efectivo refleja solo la Venta; el borrador se conserva; tras recalcular, la confirmación es válida; el caso ajeno también devuelve 409 por la huella global, no por un defecto |
| E4.2-AC-41 (integración/regresión) | Ejecutar `flujo-mensual` con `S001` activo y `liquidez=1` en posición ficticia 5.000,00 y `S003` en `liquidez=1` antes/después de `V1`; después `liquidez=0` y `liquidez=NULL` | Antes de `V1` el valor es 6.810,40 (S001 5.000,00 + S003 1.810,40); con `=1` tras `V1`, `S003` está en `incluidos` con su efectivo 2.316,40, `excluidos` no lo contiene, `metrics.liquidez.estado=Verificado`, `subtotal=null` y `valor=7.316,40`; la nota de cobertura histórica se muestra; con `=0` no se incluye y `valor=5.000,00`; con `NULL` sigue en `excluidos` con «Liquidez sin informar», `Parcial` y `subtotal=5.000,00`; la regla R6 no cambia |
| E4.2-AC-42 (integración/regresión) | Invocar `POST /api/ventas/impacto`, `POST /api/ventas/{id}/impacto`, `POST /api/ventas/{id}/impacto-anulacion` y los GET de listado, ficha, auditoría y opciones; comparar tablas, contadores, revisiones y auditoría antes/después | Ninguna ruta escribe: no hay filas nuevas ni modificadas en `operaciones_inversion`, auditoría o intentos; los contadores no se mueven, no se reserva ID y las revisiones no cambian; las respuestas de impacto son solo lectura |
| E4.2-AC-43 | Venta con cantidad 0, negativa, NaN, infinito y exponente; precio/EUR 0 o negativo; concepto/nota de 2000 y 2001; idempotency-key ausente o inválida; comisión igual al importe; `importeEur` distinto de `cantidad×precio×cambio` | Los valores inválidos devuelven 422 `VALIDATION` con el campo; 2000 se acepta y 2001 se rechaza; la clave ausente/inválida devuelve 422 `IDEMPOTENCY_REQUIRED`; la comisión igual al importe se acepta y no se resta dos veces; la diferencia de `importeEur` se conserva y se muestra como informativa, sin corrección automática |
| E4.2-AC-44 | Consultar `GET /api/ventas` con filtros, paginación y estados; `GET /api/ventas/{id}` y `/auditoria` inexistentes; `GET /api/instrumentos/opciones`; una Venta con referencias ausentes | Los filtros `instrumento`, `saldo`, `saldoEfectivo`, `saldoInversion`, fechas, Estado y página son estables y no devuelven filas ajenas; vigentes por defecto y anuladas consultables; detalle/auditoría inexistentes devuelven 404; la auditoría ordena por `revision`; las opciones devuelven listas separadas y, bajo D3, `instrumentosVenta` marcados por Estado y acotados al Saldo; la Venta con referencias ausentes se muestra como incidencia «Revisar», sin reparar ni borrar, y no computa como posición válida |
| E4.2-AC-45 (D7=A) | F-B (P1+P2+V1; posición S004 7,5): anular `P1` (12,5); repetir rectificando `P1` a cantidad 3; en `S006`, Venta de 2 el 12/04/2026 y después anular `P2` (3) | La anulación de `P1` devuelve 422 `INSUFFICIENT_UNITS` con `disponible=7,5`, `necesario=12,5`, `minimo=−5`, `fecha=2026-04-10`; la rectificación a 3 también se rechaza; la anulación de `P2` devuelve `disponible=1`, `necesario=3`, `minimo=−2`, `fecha=2026-04-12`; sin escritura, sin cambio de efectivo/cantidad/contador y sin auditoría de éxito. Es una extensión de E4.1; coordinar y documentar previamente cualquier cambio necesario en SPEC19 |

## 14. Trazabilidad a los criterios del roadmap

| Criterio del roadmap | AC de esta especificación | Cómo se demuestra |
| --- | --- | --- |
| E4.2-AC1: la Venta conserva el EUR efectivamente cobrado y su factor histórico | AC-01, AC-02, AC-07, AC-08, AC-10, AC-12, AC-25, AC-26, AC-34 | Leer la Venta después de un cambio actual, rectificar con reemplazo completo, anular, comparar importes/comisión/cambio exactos y auditoría. |
| E4.2-AC2: el efectivo aumenta y la cantidad refleja Compras−Ventas sin registro general duplicado | AC-03, AC-04, AC-05, AC-06, AC-09, AC-15, AC-16, AC-17, AC-18, AC-19, AC-28, AC-29, AC-30, AC-35, AC-36, AC-37, AC-39, AC-40, AC-41, AC-42, AC-45 | Comparar efectivo/cantidad antes/después, motor único, ausencia de Movimiento, idempotencia, concurrencia, rollback, backup, Liquidez, guard de Saldo e invariante de cantidad con Compras. |
| E4.2-AC3: la fuente de fechas de inversión actualiza la referencia temporal compartida | AC-20, AC-21, AC-22, AC-23, AC-24, AC-38 | Consultar la referencia y su cobertura con una Venta posterior a Movimientos, con las tres fuentes, con anulación/rectificación, con fuente pendiente/error y sin reloj. |

Los AC de integración/regresión (AC-16, AC-17, AC-21, AC-22, AC-34, AC-35, AC-36 a AC-42 y
AC-45) no amplían la funcionalidad de E4.2: verifican
que la misma tabla, el motor único, el guard de Saldo, la huella de Movimiento, la referencia, la
Liquidez y el backup de E4.1 siguen siendo coherentes al añadir Ventas. AC-43 y AC-44 completan
los límites de validación y la consulta; no son funcionalidad nueva de motor.

## 15. Dependencias para E4.3 (identificadas, no especificadas)

E4.3 (Valoración y resultados de posiciones) necesitará, como mínimo:

- **Cantidad y hechos:** la posición `Saldo de inversión + Instrumento` con cantidad
  `Compras−Ventas`, el historial de Compras/Ventas, sus fechas, divisas, cambios históricos,
  EUR cobrado/cargado y comisiones. E4.2 los deja disponibles; no calcula valor ni resultado.
- **Estado Abierta/Cerrada:** E4.2 deja una Venta total en cantidad 0 y no etiqueta «Cerrada»
  (D5). E4.3 deberá decidir y calcular el Estado, incluida la reapertura tras una nueva Compra.
- **Valoración:** E4.2 no guarda valor actual, valor manual, cotización ni fecha de valoración.
  E4.3 deberá definir la fuente manual/automática, la prevalencia del valor manual y el
  tratamiento de «no aplicable».
- **Resultado:** E4.2 no calcula `Resultado abierto = Valor actual + Ventas − Compras` ni
  `cerrado = Ventas − Compras`; solo conserva los operandos. E4.3 deberá fijar redondeo,
  divisa de presentación, resultado por posición/agregado y ausencia de valoración.
- **Agregados:** E4.2 mantiene el efectivo separado de la posición y no suma el efectivo del
  bróker como inversión. E4.3 deberá agregar por Tipo saldo=Inversión, no por Control, y
  excluir el efectivo.
- **Lotes/FIFO:** E4.2 no crea lotes ni coste medio. Si E4.3 necesita lotes para el resultado,
  será una decisión nueva y no una consecuencia automática de E4.2.
- **Referencia temporal:** E4.2 ya incorpora las fechas de inversión; E4.3 no debe reintroducir
  el reloj ni una fecha de valoración como sustituto de hechos.
- **Datos históricos:** la cobertura sigue siendo parcial (solo operaciones registradas); E4.3
  no debe presentar una valoración como patrimonio completo si falta histórico.

## 16. Siguiente acción

1. Los wireframes W11–W16 y W2/W5 rev3 están **aprobados visualmente** desde el 2026-10-28;
   D1–D7 siguen confirmadas A y no se reabren. La aprobación visual no autoriza DEV22.
2. SPEC22 sigue **candidata**: falta el cierre documental y la coordinación D7/SPEC19. E4.1 ya
   está integrada (`156a50d`, v18), así que no queda una dependencia de integración pendiente.
3. SPEC19 rev10 está aprobada e integrada en `156a50d`; no se modifica SPEC19 ni se reabre su
   aprobación. D7 requiere una enmienda mínima y explícita de SPEC19 (guard de cantidad vendida)
   que debe aprobarse por separado antes de DEV22.
4. Solo después de aprobar el cierre documental y con una autorización de desarrollo separada se
   podrá abrir DEV22, resolver la versión de esquema, implementar y ejecutar el testplan. Esta
   spec no reserva versión ni inicia DEV22.
