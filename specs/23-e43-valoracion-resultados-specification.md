# 23 — E4.3 Valoración y resultados de posiciones: Specification

Status: **PROPUESTA DOCUMENTAL EN REVISIÓN — no aprobada; DEV no autorizado; ningún AC en PASS.**
Approval source/date: **PENDIENTE.** Las decisiones D-01…D-16 fueron confirmadas por el usuario
el 2026-11-02 en el [brainstorming](23-e43-valoracion-resultados-brainstorming.md); esa
confirmación no aprueba esta specification, los wireframes ni el testplan. No hay autorización
de desarrollo, esquema, migración, integración con E4.8/E4.9, merge ni despliegue.
Context and brainstorming: [23-e43-valoracion-resultados-brainstorming.md](23-e43-valoracion-resultados-brainstorming.md),
[roadmap E4.3](roadmap.md#e43--valoración-y-resultados-de-posiciones),
[referencia R5/R6](functional-reference-v5.11.md),
[SPEC19/E4.1](19-instrumentos-compras-inversion-specification.md),
[SPEC22/E4.2](22-ventas-posicion-broker-specification.md) y
[SPEC27/E4.9](27-e49-cierre-financiero-specification.md).
Base: `main` `c5a0ccc` (2026-11-02), esquema SQLite **v21**. Este documento no fija una versión
futura de esquema, no ejecuta DDL y no modifica `operaciones_inversion`, `instrumentos`,
`precierre` ni ningún contrato ajeno.

Historial: propuesta inicial 2026-11-02, redactada a partir de D-01…D-16 y del dictamen técnico
registrado en el brainstorming. **Precisión 2026-11-03:** se incorporan las aclaraciones A-01
(consistencia entre cantidad valorada y cantidad al corte), A-02 (alcance de la etiqueta de
D-16: «no elegible por fecha exacta en E4.3», sin negativa definitiva para cierre) y A-03
(alcance del cero explícito de D-14: Manual `0,00`; Automática exige precio, cambio y cantidad
positivos). Ninguna reabre D-01…D-16. Sin aprobación ni implementación.

## Functionality

E4.3 permite consultar las posiciones de inversión a una fecha de corte, mostrar su Estado, su
valoración y su resultado, y publicar un agregado con cobertura explícita. La valoración puede
ser **Manual** (importe EUR declarado) o **Automática** (precio unitario y cambio introducidos
por el usuario, con cálculo de la app). E4.3 no obtiene cotizaciones externas y no crea un
segundo registro de hechos: consume las Compras y Ventas de E4.1/E4.2 y el efectivo del bróker.

La entrega es, en esta fase, **documental**. No existe todavía un almacén de valoración en v21,
no hay endpoints E4.3 y no se implementa ninguna captura. La propuesta de almacén de serie
fechada queda como decisión **DT2-E4.3** sujeta a autorización separada.

### Frontera y autoridad

| Ámbito | Autoridad | Papel de E4.3 |
| --- | --- | --- |
| Instrumentos, Compras, cantidad, efectivo del bróker | E4.1/SPEC19, integrado | Consume hechos, cantidades y `cashAt`; no los recalcula ni los reescribe |
| Ventas, posición y efectivo | E4.2/SPEC22, integrado | Consume Ventas vigentes, cantidad y efectivo; no las reescribe |
| Estado de posición, valoración, resultado, cobertura y agregado de posiciones | **E4.3** | Delta propio de esta spec |
| Patrimonio global, Liquidez, resumen y objetivos | E4.6/E4.7 | E4.3 publica un contrato de lectura; no calcula patrimonio global |
| Precierre, cierre, foto inmutable y ventana de suficiencia | E4.8/E4.9/SPEC27 | E4.3 solo publica el contrato y la señal de elegibilidad por fecha exacta; no prejuzga el gate de E4.9 y no escribe `e43`, `valoracion` ni la foto |
| Referencia temporal, ciclos, presupuestos, deuda y clasificación | E1–E3, SPEC12/SPEC27/SPEC33 | Sin cambios; E4.3 no reabre ni modifica esos contratos |

E4.3 **excluye** cotizaciones externas, dividendos, impuestos, splits, FIFO/lotes, coste medio
fiscal, patrimonio global, fotos/cierre y cualquier cambio a E4.1, E4.2, SPEC12, SPEC27 o
SPEC33. Tampoco inventa hechos históricos no registrados.

### Decisiones confirmadas por el usuario (2026-11-02)

Estas decisiones no se reabren en esta specification. La columna «Efecto verificable» fija lo
que deberá poder observarse cuando exista un DEV autorizado.

| ID | Decisión confirmada | Efecto verificable |
| --- | --- | --- |
| D-01 | «Automática» = precio y cambio introducidos por el usuario; la app calcula cantidad × precio × cambio, con procedencia y fecha. | Valor automático reproducible, con insumos, fecha y procedencia; nunca se usa el precio de la última operación como valor actual. |
| D-02 | En posición abierta con valor manual, Resultado y Rentabilidad quedan «No disponible». | El valor manual se muestra, pero no se calcula resultado ni porcentaje. |
| D-03 | Posición cerrada = ventas − compras, sin valoración. | Una posición cerrada tiene resultado aunque no tenga valoración; una valoración histórica no la reabre. |
| D-04 | Cerrada exige cantidad 0 y al menos una Venta vigente; se evalúa al corte. | El Estado se deriva al corte; una Venta posterior no cierra un corte anterior. |
| D-05 | Solo resultado agregado de la posición; sin etiqueta realizado/no realizado. | Una sola cifra de resultado por posición, sin desglose realizado/no realizado ni FIFO. |
| D-06 | Sin porcentaje de rentabilidad hasta definir fórmula. | No se publica porcentaje ni denominador; se muestra solo el importe cuando esté disponible. |
| D-07 | Resultado neto: `importe_eur` incluye comisión; no restar dos veces. | El resultado usa `importe_eur` una sola vez; no se añade ni se resta la comisión otra vez. |
| D-08 | Serie fechada de valoraciones, con auditoría y corrección; sin asociar cada registro a un ciclo. | Varias valoraciones por posición a fechas distintas; corrección auditada; sin `ciclo_id`. |
| D-09 | Para un corte T solo vale una valoración con fecha ≤ T; la última anterior se muestra con fecha y aviso; una posterior está prohibida. | Lectura sin look-ahead; la valoración usada declara fecha y antigüedad. |
| D-10 | Agregado `Parcial n/m` sin total si falta alguna valoración. | Nunca se presenta la suma de lo valorado como total completo. |
| D-11 | Agregado solo de posiciones; efectivo del bróker leído de `cashAt` y mostrado aparte. | El efectivo no suma al agregado de posiciones ni se convierte en posición. |
| D-12 | E4.3 publica el contrato de lectura; la integración `e43`/`valoracion` y la foto de SPEC27 requieren autorización separada. | La fila `e43` y `inversion.valoracion` siguen sin cambio; la foto no se toca. |
| D-13 | Incluir posiciones con cantidad aunque el instrumento esté inactivo o la posición sea heredada; señalar cobertura insuficiente; no inventar valoración; los grupos solo anulados no son posición. | Posición inactiva/heredada visible; sin valor inventado; grupo solo anulado excluido. |
| D-14 | EUR final 2 decimales; precio unitario y cambio con precisión suficiente y sin redondeos intermedios; cero explícito permitido; negativos rechazados; máximos pendientes de DT2. | Importe EUR a céntimos; cero válido **solo** como valor manual `0,00`; en Automática, precio, cambio y cantidad deben ser > 0 (A-03); entradas negativas rechazadas; sin límite máximo inventado. |
| D-15 | Mostrar siempre la fecha de valoración y los días transcurridos; sin umbral de caducidad. | Fecha y antigüedad visibles incluso si la valoración es antigua; sin caducidad automática. |
| D-16 | Toda valoración anterior al corte es NO certificable para Precierre/cierre; E4.9 define su ventana en su propio DEV. | Se distingue visualización, cobertura y elegibilidad **por fecha exacta en E4.3**; E4.3 no declara la valoración «no apta definitivamente para cierre», no prejuzga el gate de E4.9 y no escribe la foto (A-02). |

**Precisión 2026-11-03 sobre D-16 (A-02).** La decisión confirmada no cambia. El vocabulario
operativo de esta spec es «elegible / no elegible **por fecha exacta en E4.3**», no «certificable
/ no certificable». E4.3 no emite una negativa definitiva de cierre: solo declara que no puede
acreditar por sí mismo una valoración anterior a T. E4.9 definirá después su ventana y su
criterio de suficiencia, y podrá admitir valoraciones anteriores según su propio contrato. La
foto de E4.9 y la fila `e43` siguen fuera del alcance de E4.3.

### Invariantes de diseño

| # | Invariante | Dónde se aplica |
| --- | --- | --- |
| I-1 | Toda valoración tiene fecha, origen/procedencia y corrección auditada; el histórico no muta Compras, Ventas ni efectivo. | R-E43-4, R-E43-8, R-E43-9; D-08 |
| I-2 | Para el corte T solo se usa una valoración con fecha ≤ T; «valor conocido» no es «precio verificado del día». | R-E43-9, R-E43-12, R-E43-13; D-09, D-16 |
| I-3 | Se separan visualización informativa, cobertura del agregado y elegibilidad por fecha exacta en E4.3; esta última no prejuzga el gate de E4.9. | R-E43-10, R-E43-12; D-10, D-16 |
| I-4 | La foto de E4.9 es inmutable y no se recalcula por correcciones posteriores. | R-E43-12; D-12, D-16 |
| I-5 | Se respetan D-01…D-14 sin añadir reglas financieras ni métricas no aprobadas. | Toda la spec; AC-01…AC-17 |
| I-6 | Una valoración solo representa la cantidad de su `fecha_vigencia`; si la cantidad cambia, no se escala, no se prorratea y no se presenta como valor de la cantidad actual. | R-E43-13; A-01 |

### Definiciones verificables

| Término | Definición | No es |
| --- | --- | --- |
| Posición | Pareja `saldo_inversion + instrumento` con al menos una operación vigente con fecha ≤ corte. | Una fila editable ni una suma de Saldos de efectivo |
| Corte T | Fecha civil inclusiva de consulta. | Una foto persistida ni el reloj como fuente financiera |
| Cantidad | Σ cantidades de Compras vigentes − Σ cantidades de Ventas vigentes, con fecha ≤ T y agregación de fin de día. | Un valor, un precio ni un resultado |
| Estado | `Abierta` si cantidad > 0; `Cerrada` si cantidad = 0 y existe al menos una Venta vigente al corte; en otro caso, vacío/`No aplica`. | El Tipo de valoración |
| Tipo de valoración | `Manual` o `Automática`, propio de una valoración registrada. | El Estado de la posición ni una etiqueta inferida de la última operación |
| Valoración válida a T | Registro de la serie con fecha de vigencia ≤ T, elegido por R-E43-9 y consistente con la cantidad al corte según R-E43-13. | Una cotización verificada exactamente el día T ni un valor escalado a la cantidad actual |
| Cantidad de la valoración | Cantidad de la posición en la `fecha_vigencia` de la valoración: `cantidad_base` declarada en Automática o cantidad recalculada al leer en Manual. | La cantidad al corte T ni la cantidad de la última operación |
| Valor conocido | Valoración anterior a T que se muestra con su fecha y antigüedad, y solo si la cantidad al corte coincide con la de su fecha de vigencia. | Un precio certificado del día T ni el valor de una cantidad distinta |
| Resultado abierto | `Valor + Ventas − Compras`, con `importe_eur` neto de comisión. | Un resultado realizado/no realizado separado |
| Resultado cerrado | `Ventas − Compras`, sin valoración. | Una plusvalía fiscal ni un resultado por lote |
| Cobertura del agregado | `Verificada`, `Parcial n/m`, `No disponible` o `No aplica`. | Un total parcial presentado como completo |
| Elegibilidad por fecha exacta (E4.3) | Marca derivada al corte: `No elegible por fecha exacta en E4.3` si la valoración es anterior a T; `Elegible por fecha exacta (E4.9 no evaluado)` si es del mismo día. | Una denegación definitiva de cierre, el gate de suficiencia de E4.9 ni una certificación emitida por E4.3 |
| Efectivo del bróker | Saldo `Efectivo`/`Inversiones` calculado con `cashAt`. | Una posición, un valor de inversión ni un componente del agregado de posiciones |

### Reglas funcionales

**R-E43-1 — Posición y cantidad.** La posición se identifica por `saldo_inversion + instrumento`
y no se persiste. La cantidad se obtiene reutilizando `positionsFor`/`positionsAtDate` de
[investment-engine.ts](../apps/api/src/investment-engine.ts), con la misma convención de fin de
día de E4.1/E4.2. Un grupo con operaciones solo anuladas no es posición. Una cantidad negativa
es una incidencia de integridad: no se normaliza, no se le asigna Estado y no se calcula
resultado.

**R-E43-2 — Estado.** El Estado se deriva al corte T, no con el reloj ni con el Estado de la
última operación:

- cantidad > 0 → `Abierta`;
- cantidad = 0 y al menos una Venta vigente con fecha ≤ T → `Cerrada`;
- sin operaciones vigentes o sin cantidad aplicable → vacío/`No aplica`, y el grupo solo anulado
  no se lista como posición.

Una Compra posterior reabre la posición (`Abierta`) en los cortes en que ya existe. Una Venta
posterior a T no la cierra en T. El Estado es independiente del Tipo de valoración.

**R-E43-3 — Tipo de valoración.** El Tipo pertenece a la valoración registrada, no a la
posición. Una posición sin valoración no tiene Tipo. `Manual` declara un importe EUR; `Automática`
declara precio unitario, divisa y cambio, y la app calcula el importe. No se infiere el Tipo ni
el valor de la última Compra/Venta, del maestro del Instrumento o de una cotización externa.

**R-E43-4 — Valor automático.** Para una valoración `Automática`:

```text
valor_eur = round_half_up(cantidad_base × precio_unitario × cambio)
```

`cantidad_base` es la cantidad exacta de la posición en `fecha_vigencia` y debe ser **> 0**;
`precio_unitario` y `cambio` deben ser **> 0**. El producto se calcula con precisión exacta
(enteros escalados/BigInt); **solo el resultado final** se redondea a céntimos, una vez, sin
redondeos intermedios. Si la divisa es EUR, el cambio es exactamente 1. La valoración conserva
precio, divisa, cambio, cantidad base, procedencia y fecha. No se usa el precio de la última
operación como valor actual. Si una rectificación retroactiva cambia la cantidad base de una
valoración ya registrada, la lectura lo señala como incidencia de revisión y no reescribe el
valor en silencio; la corrección se hace por la vía auditada. La consistencia entre
`cantidad_base` y la cantidad al corte se rige por R-E43-13. Un valor calculado que redondea a
`0,00` con insumos positivos cuenta como valoración presente; lo que no se admite es introducir
precio, cambio o cantidad cero en Automática.

**R-E43-5 — El valor manual manda.** En una posición **abierta** con valoración `Manual`, se
muestra el valor declarado y **Resultado y Rentabilidad quedan «No disponible»**. No se calcula
un resultado alternativo con ese valor. En una posición **cerrada**, se aplica D-03 (ventas −
compras) aunque exista una valoración manual histórica: el valor manual no reabre ni altera el
resultado cerrado. El valor manual no modifica Compras, Ventas, cantidad ni efectivo.

**R-E43-6 — Resultado.** Solo se publica un resultado agregado por posición, sin separar
realizado/no realizado:

- posición abierta con valoración válida a T, no manual y consistente con la cantidad
  (R-E43-13): `resultado = valor_eur + Σ ventas.importe_eur − Σ compras.importe_eur`;
- posición cerrada: `resultado = Σ ventas.importe_eur − Σ compras.importe_eur`, sin valoración;
- posición abierta sin valoración, con valor manual o cuya valoración no representa la cantidad
  al corte: resultado `No disponible`;
- posición con cantidad negativa o incidencia: resultado `No disponible`.

El resultado puede ser negativo y se muestra con signo; no se recorta a cero. No se muestra
porcentaje de rentabilidad (R-E43-7).

**R-E43-7 — Sin rentabilidad.** No se publica porcentaje, ratio, TWR, TIR ni denominador de
rentabilidad mientras no exista una fórmula aprobada. La UI muestra `No disponible` sin inventar
una cifra. Esto aplica también a posiciones cerradas y a posiciones con resultado disponible:
D-06 no autoriza un porcentaje parcial.

**R-E43-8 — Resultado neto y comisión.** `importe_eur` de cada Compra/Venta ya incluye la
comisión. El resultado usa ese importe una sola vez y **no** resta `comision_eur` otra vez ni la
suma como métrica separada. Una comisión ausente no se convierte en un gasto adicional. El valor
de una posición abierta es un valor de mercado declarado; no se le descuenta una comisión de
venta hipotética.

**R-E43-9 — Serie fechada y corte.** Las valoraciones forman una serie por posición, con fecha
de vigencia civil. No se asocian a un Ciclo ni a una foto. Para el corte T:

1. solo se considera una valoración con `fecha_vigencia <= T`;
2. se usa la de fecha más reciente; si no hay ninguna, la posición queda sin valoración;
3. una valoración posterior a T está prohibida y nunca se usa, aunque sea la única;
4. la valoración anterior se muestra con su fecha y los días transcurridos;
5. la valoración no se recalcula al leer; una corrección se registra con revisión y motivo;
6. la valoración debe representar la cantidad al corte; si no, se aplica R-E43-13 y la posición
   queda `No disponible` con motivo.

El valor anterior es un **valor conocido a T**, no un precio verificado del día T. «Anterior y
consistente» no es «precio del día»: D-09 se mantiene y la antigüedad no se convierte en un
precio nuevo.

**R-E43-10 — Cobertura del agregado.** Para las posiciones abiertas aplicables a T:

| Cobertura | Condición | Presentación |
| --- | --- | --- |
| `Verificada` | m > 0 y n = m | Se puede mostrar el total de valoración; significa cobertura completa de valores conocidos, no cotización verificada del día |
| `Parcial n/m` | 0 < n < m | Se muestra `Parcial n/m` y **no** se muestra el total |
| `No disponible` | n = 0 y m > 0 | Sin cifra; no se sustituye por 0 |
| `No aplica` | m = 0 (sin posiciones abiertas) o solo posiciones cerradas | La valoración no aplica; el resultado cerrado puede mostrarse |

`n` es el número de posiciones abiertas con valoración válida a T **y consistente con la cantidad
al corte** (R-E43-13); `m` el número de posiciones abiertas aplicables. Una valoración de importe
`0,00` —manual o redondeo de un automático con insumos positivos— cuenta como valoración
presente. Una valoración excluida por cambio de cantidad no cuenta en `n`. El resultado agregado
tiene su propia cobertura: si alguna posición aplicable no tiene resultado calculable (sin
valoración, manual o cantidad inconsistente), se declara `Parcial n/m` y no se muestra un total
de resultado. Los grupos solo anulados no entran en `m`.

**R-E43-11 — Agregado solo de posiciones y efectivo aparte.** El agregado suma posiciones cuyo
Saldo de inversión es `Inversión`/`Inversiones`, por `Tipo saldo = Inversión`, y **nunca** suma
Saldos `Efectivo`/`Inversiones`. El efectivo del bróker se lee de `cashAt` y se muestra aparte,
un registro por Saldo de efectivo, con su fecha/corte y su condición de cálculo. Varios Saldos de
efectivo se listan por separado; no se convierten en una posición ni en un total patrimonial.

**R-E43-12 — Elegibilidad por fecha exacta y frontera de cierre.** Para cada valoración usada
en T:

- `fecha_vigencia < T` → `No elegible por fecha exacta en E4.3`;
- `fecha_vigencia = T` → `Elegible por fecha exacta (E4.9 no evaluado)`;
- sin valoración → no hay valor que declarar.

Estas etiquetas describen **solo** lo que E4.3 puede acreditar por sí mismo. `No elegible por
fecha exacta en E4.3` **no** significa «no apta definitivamente para cierre»: E4.3 no evalúa la
suficiencia de E4.9, no define su ventana y no anticipa su veredicto. Una valoración anterior
puede seguir siendo informativa y contar en la cobertura de E4.3 (D-09/D-10) sin quedar
acreditada por fecha exacta.

El **agregado** solo se declara `Elegible por fecha exacta en E4.3` si todas las valoraciones
usadas son de fecha = T y la cobertura es `Verificada`; en cualquier otro caso se declara
`No elegible por fecha exacta en E4.3` con motivo (valores anteriores, cobertura incompleta o
cantidad inconsistente). No se emite una elegibilidad parcial como si fuera completa.

E4.3 no emite una certificación de cierre, no define la ventana de suficiencia de E4.9 y no
escribe la foto. La foto de E4.9, cuando se autorice, conserva de forma inmutable el valor, la
fecha, el origen y la cobertura usados en su corte; una corrección posterior de E4.3 no la
recalcula. E4.3 solo publica el contrato de lectura y la señal de elegibilidad por fecha exacta.

**R-E43-13 — Consistencia entre la cantidad valorada y la cantidad al corte (A-01).** Una
valoración representa únicamente la cantidad existente en su `fecha_vigencia`; no es un valor
escalable ni una cotización del día del corte. Para una valoración candidata en T, con
`F = fecha_vigencia <= T`:

1. se recalcula la cantidad de la posición en `F` y en `T` con el mismo motor y la misma
   convención de fin de día de E4.1/E4.2;
2. si la valoración es `Automática` y `cantidad_base` no coincide con la cantidad recalculada en
   `F`, es una **incidencia de revisión**: el valor no se usa y no se reescribe en silencio
   (R-E43-4); la corrección se hace por la vía auditada;
3. si la cantidad en `T` difiere de la cantidad en `F` —por compra, venta, reapertura o
   corrección/anulación retroactiva de un hecho con fecha ≤ T—, el importe **no se presenta como
   valor de la cantidad actual**, no se escala, no se prorratea y no se deriva un precio
   implícito. La posición en T queda `No disponible` con motivo explícito
   (`Cantidad modificada desde la valoración: F=… Q_F=… → T Q_T=…`), y no entra en `n` de
   R-E43-10;
4. como consecuencia, el resultado de la posición abierta queda `No disponible` (R-E43-6) y el
   agregado se presenta como `Parcial n/m` o `No disponible`, nunca con el total de lo valorado
   como completo;
5. se exige una **nueva valoración** con `fecha_vigencia` adecuada (la fecha del último cambio de
   cantidad o el propio corte) que cubra la cantidad vigente; la valoración anterior permanece
   en la serie como valor de su fecha y no se borra ni se muta;
6. si la cantidad neta al corte vuelve a coincidir con la de `F`, la valoración sigue siendo un
   «valor conocido» de esa cantidad, con su fecha y antigüedad, y no se invalida por el mero
   tránsito intermedio.

Esta regla se aplica **también al valor `Manual`**: el importe declarado se refiere a la cantidad
de su `fecha_vigencia`, por lo que no se presenta como valor de una cantidad distinta. Un valor
manual no autoriza a inventar ni a extrapolar un valor actual. La regla no crea un precio nuevo,
no reabre D-09 y no cambia D-02: en una posición abierta con valor manual, Resultado y
Rentabilidad siguen `No disponible`; si además la cantidad cambió, el valor tampoco se muestra
como actual. En una posición cerrada a T prevalece D-03 y la valoración histórica no se usa.

## Data model and contracts

### Estado actual de v21

En el esquema v21 **no existe tabla ni columna de valoración**:

- `instrumentos` no guarda valor, precio actual ni resultado;
- `operaciones_inversion` guarda hechos de Compra/Venta, no importes derivados de valoración;
- `precierre` mantiene `e43` como `No disponible` y `inversion.valoracion` como
  `No disponible`;
- no hay una tabla de cotizaciones, series de valoración ni foto de E4.3.

Por tanto, esta specification no puede declarar disponible la captura ni la lectura de valores.
La lectura actual de una posición sin valoración debe seguir siendo `No disponible`, nunca `0`.

### Almacén propuesto — decisión DT2-E4.3 (no ejecutada)

Se propone, **sujeto a autorización y a DT2**, una tabla aditiva de **serie fechada de
valoraciones** (nombre provisional `valoracion_inversion`; el nombre físico y el número de
esquema se decidirán en el DEV autorizado). No se ejecuta DDL, no se reserva versión y no se
modifican `operaciones_inversion` ni `instrumentos`.

| Campo conceptual | Contenido | Regla |
| --- | --- | --- |
| `id` | Identidad técnica inmutable de la valoración | Formato y contador pendientes de DT2; no reutilizable |
| `saldo_inversion` + `instrumento` | Posición valorada | Debe ser un Saldo `Inversión`/`Inversiones`; la posición se deriva, no se copia como fila editable |
| `fecha_vigencia` | Fecha civil a la que se refiere el valor | No futura; ISO `YYYY-MM-DD`; no es la fecha de captura |
| `tipo` | `Manual` o `Automática` | Enum cerrado; no se infiere |
| `valor_eur` | Importe EUR de la valoración, en céntimos exactos | Manual: declarado, `>= 0`, `0,00` válido; Automática: calculado una vez con insumos positivos, `>= 0` (A-03) |
| `precio_unitario` | Precio unitario declarado | Solo `Automática`; **> 0** (E4.1 exige precio positivo); precisión suficiente, sin redondeo intermedio |
| `divisa` | Divisa del precio | ISO 4217; EUR o divisa con cambio |
| `cambio` | Cambio a EUR | Obligatorio y **> 0** si no es EUR; exactamente 1 si es EUR; `0` no es conversión válida |
| `cantidad_base` | Cantidad exacta usada en el cálculo automático | Solo `Automática`; **> 0**; instantánea de la cantidad en `fecha_vigencia`; se contrasta al leer con R-E43-13 y no se reescribe en silencio |
| `origen` / `procedencia` | Fuente declarada del valor, precio o cambio | Obligatoria; no se valida contra un proveedor externo; no sustituye al actor |
| `cobertura` | Cobertura de la valoración | `Completa` = toda la cantidad de la posición; no se admiten valoraciones por lotes/tramos en E4.3 |
| `actor` | Usuario que registra o corrige | Usuario único del sistema; se conserva en auditoría |
| `creado_utc` / `actualizado_utc` | Instantes técnicos | UTC; no son la fecha financiera de vigencia |
| `revision` | Revisión optimista | Entero positivo; una revisión obsoleta produce 409 |
| `motivo_correccion` | Motivo de la corrección | Obligatorio al corregir; no se inventa en el alta |
| `elegibilidadFechaExacta` (derivada) | `No elegible por fecha exacta en E4.3` o `Elegible por fecha exacta (E4.9 no evaluado)` | **No es columna**: se calcula al corte y no se persiste; no es una negativa definitiva de cierre |
| `cantidadBase` / `cantidadAlCorte` (derivadas) | Cantidad de la valoración y cantidad al corte | **No son columnas nuevas**: se recalculan al leer para aplicar R-E43-13; su diferencia explica el `No disponible` |

La tabla de auditoría conceptual (`valoracion_inversion_audit`) conserva, por valoración y
revisión, la acción (`alta`/`corrección`), el actor, el instante UTC, el motivo, el estado
anterior y el posterior. Es append-only y no admite DELETE. Si DT2 decide otro mecanismo de
auditoría, deberá conservar estas garantías.

### Serie, corrección y concurrencia

- Una posición puede tener varias valoraciones en fechas distintas; no hay una única «valoración
  actual» editable.
- Para una misma posición y `fecha_vigencia` se propone una sola valoración vigente. Corregirla
  exige `revision` vigente y `motivo`; la revisión anterior se conserva en auditoría y no se
  borra. Un duplicado de la misma posición y fecha se rechaza con 409 si DT2 confirma la
  unicidad; la corrección se hace sobre la existente.
- No existe `ciclo_id` ni asociación artificial a un Ciclo. El corte es un parámetro de consulta.
- No hay DELETE. Una valoración no se «anula» en esta propuesta; se corrige con revisión y
  auditoría, o se deja fuera de la serie si nunca se registró.
- La lectura no repara, no recalcula ni crea valoraciones. Una valoración posterior al corte no
  se devuelve como valor del corte.
- Si la cantidad al corte difiere de la cantidad de `fecha_vigencia`, la lectura no ajusta el
  importe: devuelve la posición `No disponible` con motivo y exige una nueva valoración
  (R-E43-13). La serie conserva el registro anterior como valor de su propia fecha.

### Contrato de lectura propuesto

El contrato es conceptual y no está implementado. Los importes se serializan como string decimal
en EUR; `null` significa no disponible y nunca se normaliza a `0.00`.

```json
{
  "corte": "2026-06-30",
  "posiciones": [
    {
      "saldoInversion": {"id": "S004", "nombre": "Cartera de inversión demo"},
      "instrumento": {"id": "I1001", "nombre": "Fondo índice demo", "estado": "Activa"},
      "cantidad": "7.5",
      "estado": "Abierta",
      "tipoValoracion": "Automática",
      "valoracion": {
        "estado": "Disponible",
        "fecha": "2026-06-30",
        "diasTranscurridos": 0,
        "valorEur": "877.50",
        "tipo": "Automática",
        "precio": "130.000000",
        "divisa": "USD",
        "cambio": "0.900000",
        "cantidadBase": "7.5",
        "cantidadAlCorte": "7.5",
        "procedencia": "Precio y cambio declarados por el usuario",
        "cobertura": "Completa",
        "elegibilidadFechaExacta": "Elegible por fecha exacta (E4.9 no evaluado)"
      },
      "resultado": {"estado": "Disponible", "importeEur": "258.50"},
      "rentabilidad": {"estado": "No disponible", "motivo": "Fórmula no aprobada"}
    }
  ],
  "agregado": {
    "coberturaValoracion": "Parcial 3/4",
    "valorEur": null,
    "coberturaResultado": "Parcial 3/5",
    "resultadoEur": null,
    "elegibilidadFechaExacta": "No elegible por fecha exacta en E4.3: hay valores anteriores al corte; el gate de E4.9 no se evalúa"
  },
  // Extracto abreviado: se eliden posiciones; el agregado corresponde a 4 abiertas y 5 totales.
  "efectivo": [
    {
      "saldo": {"id": "S003", "nombre": "Efectivo de inversión demo"},
      "fecha": "2026-06-30",
      "vista": "corte",
      "disponible": "1456.40",
      "condicion": "calculado"
    }
  ],
  "coberturaHistorica": "Solo operaciones registradas; el histórico anterior no importado no se reconstruye."
}
```

Ejemplo abreviado de una valoración que **no** representa la cantidad al corte (A-01/R-E43-13):
la valoración se registró con 10 unidades y al corte la posición tiene 6.

```json
{
  "corte": "2026-06-30",
  "posiciones": [
    {
      "instrumento": {"id": "I1006", "nombre": "Fondo cantidad demo"},
      "cantidad": "6",
      "estado": "Abierta",
      "tipoValoracion": "Automática",
      "valoracion": {
        "estado": "No disponible",
        "motivo": "Cantidad modificada desde la valoración: 2026-03-31 Q=10 → 2026-06-30 Q=6",
        "fecha": "2026-03-31",
        "diasTranscurridos": 91,
        "tipo": "Automática",
        "cantidadBase": "10",
        "cantidadAlCorte": "6",
        "valorEur": null,
        "cobertura": "Completa"
      },
      "resultado": {"estado": "No disponible", "motivo": "La valoración no representa la cantidad al corte"},
      "rentabilidad": {"estado": "No disponible", "motivo": "Fórmula no aprobada"}
    }
  ],
  "agregado": {
    "coberturaValoracion": "No disponible 0/1",
    "valorEur": null,
    "coberturaResultado": "No disponible 0/1",
    "resultadoEur": null,
    "elegibilidadFechaExacta": "No elegible por fecha exacta en E4.3: hay valores anteriores al corte; el gate de E4.9 no se evalúa"
  }
}
```

Campos de presentación obligatorios:

- `fecha` y `diasTranscurridos` de la valoración usada, siempre que exista;
- `elegibilidadFechaExacta` separada de `coberturaValoracion` y del valor; expresa solo la
  posición de E4.3 y no anticipa el gate de E4.9;
- `cantidadBase` y `cantidadAlCorte` cuando exista valoración, para explicar el `No disponible`
  por cambio de cantidad;
- `valorEur: null` y `resultadoEur: null` cuando la cobertura no sea completa o la valoración no
  represente la cantidad al corte;
- `rentabilidad` sin cifra y con motivo;
- `efectivo` como lista separada, nunca dentro de `agregado` ni sumado a `posiciones`.

### Precisión y límites

| Concepto | Contrato |
| --- | --- |
| EUR | Entero de céntimos, `BigInt`/decimal exacto de extremo a extremo; JSON como string decimal; nunca `number`/float para operar. Presentación final con 2 decimales. |
| Valor manual | `>= 0`; `0,00` explícito válido; negativo rechazado con 422. Se refiere a la cantidad en su `fecha_vigencia` (R-E43-13). |
| Valor automático | Calculado una vez desde cantidad, precio y cambio; no se introduce a mano; exige cantidad valorada > 0, precio > 0 y cambio > 0 (A-03). |
| Precio unitario | **> 0** en Automática (E4.1 no admite precio cero); precisión suficiente (escala de E4.1/E4.2); sin redondeo intermedio; máximo pendiente de DT2. |
| Cambio | Positivo (> 0); EUR = 1; no EUR obligatorio; escala de E4.1/E4.2; sin redondeo intermedio; máximo pendiente de DT2. Un cambio 0 no es una conversión válida. |
| Cantidad | Escala exacta de E4.1/E4.2 (hasta 8 decimales); no se redondea al valorar. |
| Cantidad valorada | > 0 en Automática; si al corte la cantidad difiere de la valorada, se aplica R-E43-13 y no se escala el valor. |
| Cero | `0,00` se admite como **valor manual** o como redondeo final de un automático con insumos positivos; nunca con precio, cambio o cantidad `0` en Automática. Un valor `0,00` presente cuenta en la cobertura. |
| Resultado | Céntimos firmados; puede ser negativo; no se recorta a cero. |
| Fechas | Civiles `YYYY-MM-DD`; la fecha de vigencia no puede ser futura; UTC solo para auditoría. **Días transcurridos** = `fecha_corte − fecha_vigencia` en días civiles (0 el mismo día). |
| Exponentes | No se admiten notaciones exponenciales en importes, precios ni cambios. |
| Límites máximos | **Pendientes de DT2**; esta spec no fija un máximo nuevo ni reinterpreta el de E4.1/E4.2. |
| Agregados | Se calculan exactos y no se persisten; solo se presentan si su cobertura es completa. |

## Screens and interfaces

**Wireframes 1440/390 pendientes de autorización.** No se dibujan en esta specification. La
revisión visual, la accesibilidad y los estados deberán aprobarse antes de un DEV de UI.

Pantallas previstas:

| Pantalla | Contenido | Estados que debe cubrir |
| --- | --- | --- |
| Inversiones → Valoración | Selector de corte, lista de posiciones, agregado y panel de efectivo separado | Vacío, carga, error, sin valoración, parcial, verificada, no aplica, instrumento inactivo, posición heredada, valor anterior, cantidad cambiada, no elegible por fecha exacta |
| Detalle de posición | Hechos, cantidad, Estado, Tipo, valoración usada, fecha/antigüedad, resultado, serie histórica | Abierta/cerrada, manual, sin valoración, valor 0, resultado negativo, serie vacía, corrección auditada, valoración que no cubre la cantidad actual |
| Captura/corrección de valoración (solo si se autoriza) | Formulario Manual o Automática, procedencia, fecha de vigencia, previsualización del valor calculado | Vacío, cálculo, error de precisión, fecha futura, negativo, 409 por revisión/duplicado, 422, borrador conservado |
| Panel de efectivo | Un registro por Saldo `Efectivo`/`Inversiones`, con corte y `cashAt` | Sin Saldos, varios Saldos, error de fuente, no sumado al agregado |

La UI no presenta `0` por ausencia, no declara completo un total parcial y no etiqueta una
valoración anterior como precio verificado del corte. La serie histórica muestra cada valor con
su propia fecha y su cantidad; una valoración que no cubre la cantidad actual no se presenta
como valor de la posición. Debe ser operable con teclado, foco visible y contraste suficiente en
390 y 1440.

## Empty, loading and error states

| Estado | Comportamiento observable |
| --- | --- |
| Vacío real | Solo si la fuente de hechos está completa y no hay posiciones con cantidad al corte: «Sin posiciones», no una valoración `0,00`. |
| Carga | Conserva el corte y los filtros; no muestra totales provisionales ni suma parcial como total. |
| Sin valoración | `No disponible` con motivo; la cantidad y el Estado siguen visibles; nunca `0`. |
| Parcial | `Parcial n/m`; se oculta el total de valoración y el de resultado si faltan posiciones aplicables. |
| Manual | Valor visible; Resultado y Rentabilidad `No disponible` con motivo. |
| Cerrada | Valoración `No aplica`; resultado `Ventas − Compras` visible; sin porcentaje. |
| Fuente ilegible | Error explícito con motivo; **no** se presenta como «sin posiciones» ni como vacío. |
| Valor anterior | Fecha y días transcurridos visibles; aviso de valor conocido; sin caducidad automática. |
| Cantidad cambiada | `No disponible` con motivo que muestra la cantidad valorada y la cantidad al corte; no se escala ni se muestra el importe como actual; se ofrece registrar una nueva valoración. |
| No elegible por fecha exacta | Etiqueta separada de la cobertura; no se muestra como valor exacto del corte y no se presenta como negativa definitiva de cierre (E4.9 decide). |
| 401 / 404 / 409 / 422 | Mensaje accionable, sin SQL, importes ajenos ni secretos; en 409/422 se conserva el borrador y la selección. |
| Sesión expirada | Se conserva el contexto y se exige reautenticación; no se pierde el corte. |

## API behavior and external dependencies

Contratos conceptuales, **sin implementación**. E4.3 no crea dependencias externas, no consulta
cotizaciones, bancos ni proveedores de FX. El cambio es un dato declarado por el usuario.

| Método y ruta propuesta | Uso | Reglas |
| --- | --- | --- |
| `GET /api/e43/corte?fecha=YYYY-MM-DD` | Lectura agregada a corte | Autenticado; devuelve posiciones, agregado y efectivo separado; no escribe; `fecha` civil |
| `GET /api/e43/posiciones/{saldoInversion}/{instrumento}?fecha=YYYY-MM-DD` | Detalle de posición | 404 si la posición no existe al corte; incluye serie y resultado; no escribe |
| `GET /api/e43/posiciones/{saldoInversion}/{instrumento}/valoraciones?desde=&hasta=` | Serie histórica | Orden por fecha/revisión; no escribe; no devuelve valores posteriores al corte consultado en el agregado |
| `GET /api/e43/valoraciones/{id}` | Ficha/auditoría de una valoración | 404 si no existe; metadatos y auditoría; no escribe |
| `POST /api/e43/posiciones/{saldoInversion}/{instrumento}/valoraciones` | Alta de valoración Manual/Automática | **Solo si D-08/DT2 se autorizan**; idempotencia, revisión, procedencia, fecha y cálculo; no toca Compras/Ventas |
| `POST /api/e43/valoraciones/{id}/rectificar` | Corrección auditada | **Solo si se autoriza**; `revision` y `motivo`; 409 si la revisión es obsoleta; conserva la anterior en auditoría |
| `GET /api/inversiones/efectivo?saldo={Sxxx}&fecha=YYYY-MM-DD` | Efectivo del bróker | Se reutiliza el contrato E4.2/`cashAt`; E4.3 no crea un endpoint de efectivo paralelo |

No existe escritura de totales, resultados, coberturas ni elegibilidad por fecha exacta. E4.3 no actualiza la
fila `e43` de `precierre`, no cambia `inversion.valoracion` y no escribe en la foto de SPEC27.

Códigos de error propuestos:

| Causa | HTTP | Código | Cuerpo mínimo |
| --- | --- | --- | --- |
| Sesión ausente o inválida | 401 | `UNAUTHENTICATED` | Sin datos financieros |
| Posición, valoración o ruta inexistente | 404 | `NOT_FOUND` | Recurso y motivo genérico |
| Revisión obsoleta al corregir | 409 | `REVISION_CONFLICT` | Revisión vigente esperada |
| Duplicado de posición y fecha, si DT2 confirma unicidad | 409 | `VALUATION_EXISTS` | Valoración vigente a corregir |
| Misma clave de idempotencia con otro payload | 409 | `IDEMPOTENCY_CONFLICT` | Conflicto sin segunda valoración |
| Campo inválido, negativo, fecha futura, precisión excesiva, exponente o procedencia ausente | 422 | `VALIDATION` | Campo y motivo |
| Idempotency-key ausente o inválida en alta | 422 | `IDEMPOTENCY_REQUIRED` | Clave de intento inválida |

La lectura de una posición inexistente o de un grupo solo anulado es 404 o ausencia explícita,
nunca una posición con valor `0`. La ausencia de valoración no es un error 5xx: es un estado
`No disponible` con motivo.

## Validation and edge cases

- **Valor 0 frente a ausencia.** `valor_eur = 0,00` **manual** es una valoración explícita y
  cuenta en la cobertura; en `Automática`, precio, cambio y cantidad deben ser **> 0**. `null`/sin
  registro es `No disponible` y no se transforma en cero. Un cambio 0 no se admite como
  conversión.
- **Negativos.** Se rechazan valores, precios y cambios negativos con 422. Un **resultado**
  negativo es válido y se muestra con signo.
- **Comisión.** El resultado usa `importe_eur` una sola vez. No se resta `comision_eur` otra vez,
  no se suma como métrica aparte y una comisión nula no crea un gasto.
- **Fecha futura.** La fecha de vigencia no puede ser futura según el día civil del servidor.
  La fecha de captura no sustituye a la fecha de vigencia.
- **Look-ahead.** Para T solo se usa una valoración con fecha ≤ T. Si la única valoración es
  posterior, la posición queda `No disponible`; nunca se adelanta el valor.
- **Valor anterior.** Se muestra con fecha y días transcurridos; es un valor conocido, no un
  precio verificado del día T. No se fija un umbral de caducidad.
- **Certificabilidad.** Toda valoración anterior a T es `No certificable`; una del mismo día es
  `Elegible por fecha (sujeto a E4.9)`. E4.3 no emite certificación ni define la ventana de E4.9.
- **Manual en abierta.** Suprime Resultado y Rentabilidad. **Manual en cerrada.** No se aplica:
  prevalece D-03 y el resultado es ventas − compras.
- **Cerrada.** Exige cantidad 0 y al menos una Venta vigente al corte. Un grupo solo anulado no
  es posición. Una Venta posterior al corte no cierra el corte anterior.
- **Reapertura.** Una Compra posterior devuelve `Abierta` en los cortes en que ya existe; el
  resultado cerrado anterior no se presenta como resultado actual.
- **Inactivo/heredado.** Un Instrumento inactivo con cantidad sigue siendo posición; una posición
  heredada con cantidad se incluye con la misma cobertura declarada y sin reconstruir hechos no
  registrados. No se le inventa valoración.
- **Cantidad negativa.** Es una incidencia de integridad: no se normaliza, no se etiqueta
  `Abierta`/`Cerrada` y no se calcula resultado.
- **Duplicado/corrección.** Una misma posición y fecha no debe tener dos valoraciones vigentes.
  Corregir exige revisión y motivo; una revisión obsoleta devuelve 409; no hay DELETE.
- **Rectificación retroactiva.** Si cambia la cantidad base de una valoración automática, la
  lectura lo señala como incidencia de revisión y no reescribe el valor en silencio;
  Compras/Ventas no se mutan.
- **FX.** Sin cambio no EUR no hay valor automático válido (422). Un cambio 1 en EUR es exacto.
  No se usa el cambio de la última operación ni una cotización externa.
- **Varios Saldos de efectivo.** Se listan por separado con `cashAt`; no se suman al agregado de
  posiciones ni se convierten en una única cifra patrimonial.
- **Fuente ilegible.** Es un error, no un vacío: no se muestra «sin posiciones» ni `0`.
- **Foto E4.9.** Una corrección posterior de E4.3 no recalcula una foto cerrada; E4.3 no escribe
  la foto ni la fila `e43`.
- **Datos.** Sin datos reales, Excel, bases reales, credenciales ni secretos. Los fixtures son
  ficticios y deterministas.

## Exclusions

- Cotizaciones externas, precios de mercado automáticos, bancos, proveedores de FX o descarga de
  datos.
- Dividendos, cupones, impuestos, retenciones, splits, ampliaciones, recompras y comisiones
  bancarias distintas de la comisión de la operación.
- FIFO, lotes, coste medio fiscal, plusvalías/minusvalías realizadas y cualquier separación
  realizado/no realizado.
- Patrimonio global, Liquidez, objetivos, resumen anual y cualquier cálculo de E4.6/E4.7.
- Fotos, cierre, reapertura, ventana de certificación y escritura de `e43`/`valoracion` de
  SPEC27; eso requiere autorización separada.
- Cambios a E4.1, E4.2, SPEC12, SPEC27, SPEC33, `operaciones_inversion`, `instrumentos`,
  `precierre` o al esquema v21.
- DDL, migración, versión de esquema, backup/restore, endpoints, UI o tests ejecutables en esta
  entrega documental.
- Datos reales, importación del Excel, mapping, despliegue, VPS o cambios de permisos.
- Nuevas reglas financieras, umbrales de caducidad, porcentajes de rentabilidad, valoraciones por
  lotes o valoraciones de posiciones que no existen.

## Acceptance checks

Los 17 AC siguientes se derivan de D-01…D-16 y de la precisión A-01. **Ninguno está en PASS**: son criterios
de diseño, no resultados ejecutados. Clase **I** = comprobación interna de E4.3 (motor, DTO,
persistencia, UI); clase **C** = comprobación cruzada de contrato con E4.1/E4.2/E4.6/E4.7/E4.9.

| ID | Acción / precondiciones | Resultado observable esperado | Clase | Decisión |
| --- | --- | --- | --- | --- |
| E4.3-AC-01 | Valorar automáticamente una posición abierta con precio 120,000000 USD, cambio 0,950000 y cantidad 7,5; repetir con precio/cambio de la última operación | Valor 855,00 €, fecha y procedencia visibles; el valor no cambia por usar el precio de la última operación; sin redondeos intermedios; el resultado usa 855,00 | I | D-01 |
| E4.3-AC-02 | Valorar manualmente una posición abierta; consultar Resultado y Rentabilidad; repetir con una posición cerrada que conserve una valoración manual histórica | En abierta: valor visible y Resultado/Rentabilidad «No disponible»; en cerrada: resultado ventas − compras, sin que el valor manual lo suprima ni lo altere | I | D-02 |
| E4.3-AC-03 | Consultar una posición cerrada con cantidad 0 y una Venta vigente; otra sin Venta vigente; un grupo solo anulado | Cerrada: resultado ventas − compras, valoración `No aplica`, sin separar realizado/no realizado; sin Venta vigente o solo anulado: no es posición cerrada ni se le inventa valoración | I | D-03 |
| E4.3-AC-04 | Consultar al corte antes/después de una Venta total; añadir una Compra posterior y consultar de nuevo | Estado `Abierta`/`Cerrada` derivado al corte; la Venta posterior no cierra el corte anterior; la nueva Compra reabre; sin Estado manual | I | D-04 |
| E4.3-AC-05 | Consultar el resultado de una posición abierta y de una cerrada; buscar etiquetas realizado/no realizado o FIFO | Una sola cifra de resultado por posición; abierta = valor + ventas − compras; cerrada = ventas − compras; sin etiqueta realizado/no realizado ni lote | I | D-05 |
| E4.3-AC-06 | Consultar una posición con resultado disponible; intentar obtener un porcentaje, ratio, TWR o TIR | Solo importe EUR; ningún porcentaje, ratio ni denominador; `No disponible` sin cifra inventada | I | D-06 |
| E4.3-AC-07 | Compra con comisión 5,00 y Venta con comisión 2,00; comparar resultado con `importe_eur`; añadir un caso con `importe_eur` distinto de cantidad×precio×cambio; intentar restar la comisión otra vez | Resultado 236,00 € con `importe_eur` una sola vez; no 229,00 por doble resta ni 243,00 por suma; con `importe_eur` distinto, resultado = valor + ventas − compras usando el importe cargado/cobrado; comisión nula no crea gasto | I | D-07 |
| E4.3-AC-08 | Registrar dos valoraciones en fechas distintas; corregir una con revisión y motivo; repetir con revisión obsoleta; intentar DELETE; inspeccionar `ciclo_id` | Serie conservada; corrección auditada con anterior/posterior y motivo; 409 en revisión obsoleta; sin DELETE; sin asociación a Ciclo; Compras/Ventas intactas | I | D-08 |
| E4.3-AC-09 | Consultar T con valoraciones anterior, del mismo día y posterior; consultar un T sin valoración ≤ T | Solo se usa fecha ≤ T; la del mismo día es exacta; la última anterior se muestra con fecha; la posterior se ignora; sin valor ≤ T → `No disponible`, nunca look-ahead | C | D-09 |
| E4.3-AC-10 | Consultar agregado con todas las posiciones abiertas valoradas; repetir faltando una; repetir con valor 0,00 y sin posiciones abiertas | Completo: `Verificada` y total; falta: `Parcial n/m` sin total; 0,00 cuenta como valor; sin abiertas: `No aplica`; nunca se presenta la suma parcial como total | I | D-10 |
| E4.3-AC-11 | Consultar agregado con posiciones y dos Saldos de efectivo; comparar con `cashAt`; intentar sumar el efectivo al agregado | Agregado solo de posiciones `Inversión`/`Inversiones`; cada efectivo `Efectivo`/`Inversiones` se muestra aparte con su fecha y `cashAt`; el efectivo no suma ni se convierte en posición | C | D-11 |
| E4.3-AC-12 | Consumir `GET /api/e43/corte`; comparar antes/después la fila `e43`, `inversion.valoracion` y la foto de SPEC27; intentar escribir totales | Contrato de lectura disponible; `e43`/`valoracion`/foto sin cambio; ninguna escritura de totales; integración y foto sujetas a autorización separada | C | D-12 |
| E4.3-AC-13 | Consultar posición de Instrumento inactivo con cantidad, posición heredada y grupo solo anulado; intentar obtener un valor para la que no tiene valoración | Inactiva/heredada incluidas con cobertura declarada; sin valor inventado; solo anulado excluido; `No disponible` no se sustituye por 0 | C | D-13 |
| E4.3-AC-14 | Introducir EUR con 2 decimales, precio/cambio de 6 decimales, valor manual 0,00, precio 0 en Automática, negativo, fecha futura y exponente; comprobar el redondeo final con producto no exacto | EUR final a céntimos; precisión exacta sin redondeo intermedio; valor manual 0,00 válido; precio 0 en Automática, negativo, futuro, exponente o precisión excesiva → 422 sin escritura; máximo pendiente de DT2 | I | D-14 |
| E4.3-AC-15 | Consultar valoración del mismo día, anterior de 61 días y muy antigua; buscar umbral de caducidad | Fecha y días transcurridos siempre visibles; 0 días el mismo día; 61 días en la anterior; sin umbral de caducidad ni cambio automático de cobertura | I | D-15 |
| E4.3-AC-16 | Consultar valoración exacta al corte y anterior; corregir después; comprobar `e43` y la foto de E4.9 | Exacta: `Elegible por fecha exacta (E4.9 no evaluado)`; anterior: `No elegible por fecha exacta en E4.3`, **sin negativa definitiva para cierre**; E4.3 no escribe la foto; una corrección posterior no recalcula una foto cerrada; E4.9 define su ventana | C | D-16 |
| E4.3-AC-17 | Compra o venta vigente posterior a `fecha_vigencia` y anterior/al corte T; reapertura; anulación o corrección retroactiva; valoración automática con `cantidad_base` distinta de la recalculada | La valoración no se escala ni se presenta como valor de la cantidad actual; posición `No disponible` con motivo y sin entrar en `n`; resultado `No disponible`; agregado `Parcial n/m`; se exige nueva valoración; la anterior permanece en la serie; si la cantidad vuelve a coincidir, sigue como valor conocido | I | A-01 / R-E43-13 |

### Cobertura de la traza roadmap

Los criterios del roadmap se citan sin guion (`E4.3-AC1/2/3`); los de esta spec llevan
`E4.3-AC-01…17`.

| Roadmap | AC de esta spec |
| --- | --- |
| E4.3-AC1: Estado Abierta/Cerrada separado de Manual/Automática | E4.3-AC-01, E4.3-AC-02, E4.3-AC-03, E4.3-AC-04, E4.3-AC-13, E4.3-AC-15 |
| E4.3-AC2: valor manual prevalece y Resultado/Rentabilidad sin cálculo automático | E4.3-AC-02, E4.3-AC-06 |
| E4.3-AC3: agregados por Tipo saldo=Inversión excluyen efectivo; resultado según R5 | E4.3-AC-05, E4.3-AC-07, E4.3-AC-10, E4.3-AC-11, E4.3-AC-13 |
| Pruebas del roadmap: abierto/cerrado/manual, estado no aplicable, cambio actual no modifica hechos, efectivo no sumado, sin valoración ficticia | E4.3-AC-01…17, con énfasis en 02, 04, 09, 11, 13 y 17 |

## Test plan

El [testplan E4.3](23-e43-valoracion-resultados-testplan.md) contiene la matriz
`E4.3-TP-01…17`, el oráculo ficticio, los riesgos residuales y los criterios de salida. Todos
los resultados están **UNRUN**; no hay implementación ni PASS funcional. Una prueba diseñada no
acredita la funcionalidad.

## Approval and next action

- **Decisiones D-01…D-16:** confirmadas por el usuario el 2026-11-02; fuente registrada en el
  brainstorming. No equivalen a aprobación de esta specification.
- **Specification/wireframes/testplan:** **NO aprobados**. Pendiente de revisión y aprobación
  explícita del usuario.
- **DEV/esquema:** **NO autorizados**. El almacén de serie fechada es una propuesta DT2-E4.3; no
  hay DDL, migración, versión reservada ni endpoints.
- **E4.8/E4.9:** la integración de `e43`/`valoracion` y la foto requieren autorización separada.
  E4.3 no las modifica.
- **AC:** ninguno en PASS; los 16 son criterios de diseño. La siguiente acción es la revisión
  humana y, solo tras autorización separada, el contraste DT2 y el DEV.
