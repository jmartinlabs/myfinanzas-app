# 16 — E3.4 Revisión bancaria de Comida: Specification

Status: Aprobación documental del candidato y wireframes registrada el 2026-10-26;
delta de cierre E3.4 propuesto el 2026-10-26, con QA independiente PASS (2026-10-26) y pendiente de
aprobación final. El delta admite devoluciones como `Detalle`+`Entrada` identificadas
expresamente, conserva el enum de clasificación y su exclusividad, separa los tres
conceptos de evidencia, difiere `detalleOrigenId`, habilita trazabilidad a `Gasto`
agregado de Terminal sin conciliación y mantiene el contrato de lectura de E3.5.
No define neteo, periodo ni fórmulas de E3.5. AC-25 sigue abierto; no se declara
equivalencia con v5.11(7), no se autoriza migración ni uso de datos reales.
Approval source/date: usuario «los aprobamos», 2026-10-26, sobre la propuesta original
cuyos hashes registrados son specification
`a8a278d2dba9ed31a5e7b0606764991698b762c214997ff83b9bf386ee82e4d4`
y brainstorming
`bb6397f438b7ed236d944c8fcfc591d061f011bb63291e2257508e350affb385`.
El texto consolidado en main `aad33e9` tiene SHA-256
`d3f48143ff5be3f1036d7475f08b2dfb8d35b08a8afa370e791c607fa088139b`
(specification) y
`804e17774d152506115404ef609f7fb8d6e3ce5f36e5990466a27f98f6df7bdf`
(brainstorming). Los hashes citados identifican la propuesta original, no este texto
consolidado; el delta actual tiene QA independiente PASS (2026-10-26) y queda pendiente de aprobación
final.
Sin autorización de desarrollo, SQL, migración, despliegue ni merge.
Context and brainstorming: [16-revision-comida-brainstorming.md](16-revision-comida-brainstorming.md)
(propuestas rev1 derogadas conservadas en §2 y §9.4), [E3.4/E3.5](roadmap.md),
[R1/R3/R4/P6](functional-reference-v5.11.md),
[spec04](04-movimientos-specification.md), [spec05](05-transferencias-referencias-specification.md),
[spec07](07-ciclos-operacion-specification.md), [spec12](12-flujo-mensual-specification.md).

Next action: aprobación final del delta; después, si se aprueba, publicación documental.
AC-25 sigue abierto. DEV16 no está autorizado.
No se abre una nueva ronda sobre la estructura física de v5.11(7).

### Dependencias DT2/DT7

- **DT2:** identidad/IDs, constraints, precisión monetaria, fechas, concurrencia,
  idempotencia y límites no documentados. Este contrato propone identidad numérica y EUR
  exacto; no los declara aprobados ni crea SQL.
- **DT7:** mapping por campo/ID, históricos, excepciones y conciliación. La evidencia
  v5.10 es histórica; el mapping v5.11(7) sigue pendiente en AC-25. No se usan datos
  reales ni se sube Excel.
- Ambos son dependencias documentales/roadmap, no autorización de migración.

## Functionality

E3.4 mantiene y clasifica **operaciones bancarias individuales** de Revisión Comida y
permite consultar su clasificación, evidencia, vínculo verificado cuando exista y
reposiciones. Es una capa operativa/analítica: **no crea otro Gasto en Movimientos, no
crea un segundo ledger económico y no sustituye Movimientos ni Ciclos**.

La **evidencia histórica v5.10** no ofrece una relación 1:1 ni 1:N formal en Excel entre
Revisión Comida y Movimientos. Su aplicabilidad a **v5.11(7)** está pendiente de contraste
y no se presenta como estructura vigente confirmada. Por ello el diseño conserva tres
capas separadas:

| Capa | Responsabilidad |
| --- | --- |
| Movimientos | Reconocimiento económico central, incluidos Gastos agregados y Transferencias del modelo terminal |
| Revisión Comida | Operaciones bancarias individuales, con ID, fecha, concepto, importe/dirección, clasificación y evidencia propios |
| E3.5 | Agregación y conciliación por ciclo desde su maestro temporal |

Capacidades incluidas:

1. Alta, consulta y rectificación auditada de operaciones bancarias de Revisión Comida,
   incluidas devoluciones `Detalle`+`Entrada` identificadas expresamente.
2. Clasificación exclusiva `Comida`, `Pendiente revisar`, `Ocio`, `Niños`, `Otros` o
   `Fuera presupuesto`, preservando la restricción documentada en v5.10; su aplicabilidad
   a v5.11(7) queda pendiente de contraste.
3. Vínculo **opcional y solo verificado** a un Movimiento; nunca por fecha, importe,
   concepto o Saldo aproximados. FK opcional 0..1 / 0..N, sin reparto de importes.
4. Reposiciones reales y verificables, con ausencia visible y cobertura determinada por
   E3.5; trazabilidad al hecho y referencia futura a la compensación si E3.5 la aporta.
5. Fuente `Revisión Comida` para la referencia temporal central: máximo válido, ausencia
   y error diferenciados; `tblCiclos` sigue siendo el único maestro temporal.
6. Cobertura histórica derivada solo de operaciones reales; sin inventar periodos
   anteriores al primer registro disponible.
7. Contrato de lectura para E3.5, sin adelantar financiación, Recursos, agregación por
   ciclo, compensaciones ni métricas de cierre.

### Devoluciones de compra

- Una devolución se registra como `Detalle`+`Entrada` con `esDevolucion=true`.
- `Entrada` no basta: sin `esDevolucion=true` la operación no se presenta ni se trata
  como devolución. No se infiere por dirección, fecha, importe ni concepto.
- `esDevolucion` es un discriminador lógico explícito del DTO/UI; no crea un tipo,
  una clasificación ni un ledger nuevos.
- Usa el mismo enum de clasificación aprobado, incluido `Fuera presupuesto` con su
  exclusividad.
- Conserva fecha bancaria, importe/dirección, concepto y evidencia propios.
- No define neteo, periodo ni fórmula analítica; esos cálculos pertenecen a E3.5.
- La relación con la compra original es opcional y solo se acredita con
  `evidenciaRelacionCompra`; no exige que la compra exista en el auxiliar y no crea
  `detalleOrigenId` en este delta.

### Límite D-01-R — vínculo opcional, no dependencia estructural

Procedencia: evidencia histórica v5.10; la estructura de v5.11(7) no ha sido inspeccionada.
La aplicabilidad de D-01-R a v5.11(7) sigue pendiente de contraste.

- Revisión Comida **no depende** de que cada operación tenga un Movimiento.
- Un detalle sin vínculo es un registro operativo válido; se muestra `Sin vínculo`, no
  como error ni como Gasto faltante.
- Un vínculo verificado es trazabilidad, no una asignación económica: no copia fecha ni
  importe, no cambia el Movimiento, no crea Gasto y no acota el importe del detalle.
- **D-01-R(app):** el contrato de app admite una FK opcional 0..1 / 0..N y un
  `tipoVinculo` `Individual` o `Agregado terminal`. El agregado solo puede ser un
  `Gasto` de Terminal y se identifica siempre como **sin conciliación de importes**.
  No se admite `Ingreso` ni `Transferencia` de financiación para una compra, ni se
  amplía Exterior/D5.
- **D-01-R(v5.11(7)) = AC-25:** la aplicabilidad física sigue pendiente de contraste.
  AC-25 no se cierra y no se declara equivalencia con v5.11(7).

### Contraste pendiente de campos físicos v5.10

Este retorno se registra como evidencia histórica de v5.10, no como estructura vigente ni
como equivalencia con v5.11(7). AC-25 permanece pendiente para contrastar, al menos:

| Campo físico v5.10 | Evidencia histórica | Representación propuesta para la app | Estado |
| --- | --- | --- | --- |
| Clasificación `Reposición` | Clasificación física de reposición | Reposición como registro propio, separada de la clasificación de detalle | Pendiente; no equivalente |
| Importe firmado | Importe firmado en la tabla física | Importe positivo + `dirección` `Entrada`/`Salida` | Pendiente; no equivalente |
| `Estado` / `Referencia reposición` | Campos físicos de estado y referencia | `estadoRegistro` y trazabilidad a compensación | Pendiente; no equivalente |
| Clasificación y `Fuera presupuesto` | Dos columnas físicas con restricción de combinación | Enum exclusivo aprobado; históricos con ambas columnas preservados en lectura | Pendiente; no equivalente |

No se convierten estos campos en reglas de app ni se cierra D-01-R. AC-25 sigue abierto
hasta disponer del contraste físico acreditado de v5.11(7).

## Data model and contracts

Modelo lógico y propuesta; no hay DDL, migración ni SQL ejecutado. No se reproducen
importes, IDs ni fechas reales de la evidencia aportada.

`Detalle` y `Reposicion` son **discriminadores lógicos del DTO/UI**, no una columna o
tabla nueva adoptada por inferencia. Su origen es la operación registrada y la acción de
registrarla como detalle o reposición; la materialización física queda para DT2/desarrollo.
Si no puede derivarse sin una estructura nueva, queda pendiente y no se asume.

### Operación bancaria de detalle

| Dato | Contrato |
| --- | --- |
| Tipo | `Detalle` o `Reposicion`; `Detalle` incluye compra y devolución. Discriminador lógico del DTO/UI, no una tabla nueva |
| ID | Identidad numérica estable, única, no reutilizable; independiente del ID de Movimiento; visible e inmutable |
| Fecha de operación | Fecha civil ISO de la operación bancaria real; propia; no se sustituye por la fecha de un Movimiento |
| Concepto | Texto libre de la operación; no es clasificador ni crea catálogo |
| Importe | EUR exacto en céntimos, serializado como string; estrictamente positivo; sin float ni redondeo |
| Dirección | `Salida` o `Entrada`, explícita; el signo se deriva; no se almacena un segundo signo contradictorio |
| Devolución | `esDevolucion` booleano explícito y obligatorio en el alta. `true` solo con `tipo=Detalle` y `direccion=Entrada`; `false` en `Detalle`+`Salida` y en `Reposicion`. Omitido → 422. No se infiere por dirección ni por importe |
| Clasificación | Un valor exclusivo: `Comida`, `Pendiente revisar`, `Ocio`, `Niños`, `Otros` o `Fuera presupuesto`; el mismo dominio se aplica a una devolución; no se crea una clasificación nueva |
| Excepción histórica | Si un registro legacy tuviera ambas columnas informadas, se expone en lectura con clasificación y marca de fuera presupuesto, sin normalizar ni perder datos; no se permite en escrituras nuevas |
| Evidencia bancaria | `evidenciaBancaria`: referencia de la operación/fuente bancaria; no se publican datos reales en el repositorio |
| Estado de evidencia bancaria | `Con evidencia` o `Sin evidencia`; sin evidencia no se presenta como verificada; reposición sin evidencia se rechaza. No filtra la referencia ni la cobertura temporal |
| Evidencia de relación con compra | `evidenciaRelacionCompra` opcional: documento/motivo que acredita la relación con una compra. No se infiere; no exige que la compra exista en el auxiliar ni crea FK |
| Relación devolución-compra | Solo mediante `evidenciaRelacionCompra`; no se adopta `detalleOrigenId` en este delta; sin reparto, sin suma acotada y sin doble efecto |
| Cuenta/origen | Dato descriptivo de la operación; no crea un Saldo paralelo ni se usa para calcular posiciones |
| Vínculo | FK opcional a Movimiento; `estadoVinculo` `Verificado`, `Sin vínculo` o `Revisar`; `tipoVinculo` `Individual` o `Agregado terminal` solo con vínculo declarado (ausente/null en `Sin vínculo`); sin reparto ni suma acotada |
| Cardinalidad | Excel: sin relación formal. App: cada operación apunta a 0..1 Movimiento; un Movimiento puede recibir 0..N operaciones referenciadas; no es una relación económica |
| Evidencia del vínculo | `evidenciaVinculo`: motivo/documento que justifica la correspondencia; obligatoria si `estadoVinculo=Verificado`; sin inferencia por fecha/importe/concepto |
| Estado | Vigente o Anulado lógico; sin DELETE físico; conserva historia y vínculo |
| Revisión/auditoría | `revision`, actor, UTC, motivo y antes/después; los metadatos UTC no son fecha financiera |
| Idempotencia | Clave de intento y payload; reintento no crea otra fila |

Reglas de clasificación:

- `Fuera presupuesto` es semánticamente exclusivo: no se combina con `Comida`, `Ocio`,
  `Niños`, `Otros` ni `Pendiente revisar` en escrituras nuevas.
- El mismo enum se aplica a una devolución; `esDevolucion` no crea ni cambia la
  clasificación económica. No se admite una clasificación nueva para devoluciones.
- La representación app puede usar un único valor, pero debe conservar la restricción
  documentada en v5.10: si el histórico tuviera ambas columnas informadas, se preserva en
  lectura sin normalizar ni perder información y no se permite repetir esa combinación.
  La aplicabilidad de esta restricción a v5.11(7) sigue pendiente de contraste.
- `Pendiente revisar` es una clasificación real y cuenta como gasto de comida en el
  contrato de E3.5; no es un estado de carga ni un “no computa”.
- `Compensable` es un grupo derivado de `Ocio` + `Niños` + `Otros`; no se almacena.
- `Fuera presupuesto` no computa en los agregados de comida/compensable, pero conserva
  siempre su operación y efecto bancario en la capa de Revisión Comida.
- No se crean Categorías, Subcategorías, Partidas ni Referencias para estas etiquetas.
- La evidencia histórica v5.10 muestra una clasificación física `Reposición`; no se asume
  que equivalga a la representación app de reposiciones separadas. Queda para AC-25.
- E3.4 no crea ni modifica Partida, Presupuesto ni ejecución presupuestaria central.
  `Fuera presupuesto` solo excluye el análisis auxiliar; el Gasto vinculado conserva su
  Partida y su ejecución. No hay doble exclusión ni cambio silencioso del hecho central.

### Vínculo opcional y separación de efectos

- El vínculo a Movimientos es opcional. No hay obligación de que cada operación bancaria
  tenga un Movimiento, ni de que cada Movimiento tenga detalles.
- Solo se admite un vínculo cuando existe correspondencia verificable documentada. No se
  infiere por coincidencia de fecha, importe, concepto, Saldo ni proximidad temporal.
- **Excel no tiene relación formal:** `tblRevisionComida` no tiene ID Movimiento ni FK.
  **La app propone una FK opcional:** cada operación apunta a 0..1 Movimiento y un
  Movimiento puede recibir 0..N operaciones referenciadas. Es una relación técnica de
  trazabilidad, no una relación económica.
- `tipoVinculo` distingue `Individual` de `Agregado terminal`. Un vínculo agregado solo
  puede apuntar a un `Gasto` de Terminal y se identifica siempre como **sin conciliación
  de importes**; no reparte, no suma y no crea un Gasto nuevo.
- No se admite `Ingreso` ni `Transferencia` de financiación como vínculo de una compra.
  Tampoco se amplía Exterior/D5.
- Varias operaciones pueden referenciar el mismo Movimiento si la `evidenciaVinculo` lo
  justifica;
  una operación puede no referenciar ninguno. No hay obligación de que un Movimiento tenga
  operaciones ni de que una operación tenga Movimiento.
- El vínculo no reparte el importe del Movimiento ni acota el importe de la operación. No
  se valida una suma contra el hecho; esa restricción no representa el modelo histórico
  ni se asume para v5.11(7).
- Un vínculo verificado no copia fecha ni importe, no modifica el Movimiento, no crea
  Gasto y no cambia su efecto bancario central.
- `evidenciaVinculo` es obligatoria para declarar `Verificado`; una petición de vínculo sin
  evidencia se rechaza (422) y no se degrada a `Sin vínculo`. Una operación sin vínculo
  declarado permanece `Sin vínculo`, que es un estado normal. No se confunde con
  `evidenciaBancaria` ni con `evidenciaRelacionCompra`.
- Si el Movimiento se rectifica o anula, el vínculo histórico se conserva, se muestra
  `Revisar` y no se reasigna automáticamente. La operación de Revisión Comida sigue siendo
  un registro bancario válido.
- `Sin vínculo` es un estado normal, no un error ni una cobertura incompleta.
- La evidencia histórica v5.10 conserva **importe firmado**; la app propone importe
  positivo + `dirección`. No se declara equivalencia; queda para AC-25.

### Matriz de tipo, dirección y vínculo

No se usa `Incompatible` como estado persistido: una escritura nueva inválida se rechaza;
un registro histórico en conflicto queda `Revisar`, sin normalización silenciosa.

| Tipo | Dirección | Tratamiento |
| --- | --- | --- |
| `Detalle` | `Salida` | Válido; `esDevolucion=false`; clasificación obligatoria |
| `Detalle` | `Entrada` | Válido solo como devolución con `esDevolucion=true`; clasificación obligatoria; no se infiere por dirección |
| `Reposicion` | `Entrada` | Válido; `esDevolucion=false`; evidencia bancaria y hecho real obligatorios |
| `Reposicion` | `Salida` | Rechazo |

Elegibilidad del vínculo:

| Tipo | Movimiento elegible | Límite |
| --- | --- | --- |
| `Detalle` | `Gasto` individual; `Gasto` agregado de Terminal con `tipoVinculo=Agregado terminal` | No `Ingreso`/`Transferencia` de financiación para una compra; no Exterior/D5; el agregado es sin conciliación de importes |
| `Reposicion` | `Transferencia` interna elegible o `Ingreso` existente cuyo subtipo existente y evidencia correspondan | No `Gasto`; no Subtipo nuevo; Transferencia con Exterior queda pendiente D5 |

Si no existe un Movimiento elegible, la operación queda `Sin vínculo`; no se inventa un
Movimiento, no se crea un Subtipo y no se fuerza una Transferencia con Exterior. La
ausencia de vínculo no descarta la operación bancaria real.

Efectos separados:

| Efecto | Dónde se lee | Qué no hace |
| --- | --- | --- |
| Operación bancaria individual | Revisión Comida: fecha, importe/dirección, concepto y evidencia | No crea posición, Saldo, Gasto ni ejecución presupuestaria |
| Reconocimiento económico central | Movimientos: Transferencia/Gasto agregado y su efecto en Saldos | No se sustituye por el detalle ni se vuelve a sumar |
| Agregación/conciliación por ciclo | E3.5, desde Ciclos y ambas capas | No suma dos veces ni convierte Revisión Comida en un segundo ledger |

No se persiste un saldo paralelo, no se calcula una posición de Revisión Comida y no se
añaden sus importes a Saldos centrales. Conservar la operación y su efecto bancario real no
autoriza sumarla a Saldos centrales ni fabricar Movimientos individuales.

Una reposición vinculada a un Movimiento es **trazabilidad, no un segundo hecho**. E3.5 la
consume una sola vez y decide qué capa alimenta `Falta por reponer`/Recursos; no se suma
además como ingreso o recurso independiente.

### Reposiciones

| Dato | Contrato |
| --- | --- |
| ID | Identidad numérica estable, única y no reutilizable; visible e inmutable |
| Hecho real | Operación bancaria real de `Entrada`; vínculo opcional verificado a `Ingreso`/`Transferencia` con `evidenciaBancaria` y `evidenciaVinculo`; no se inventa un Movimiento |
| Fecha | Fecha civil de la operación bancaria real; no se sustituye por la de un Movimiento |
| Importe | EUR exacto positivo; `Entrada`; sin float ni redondeo |
| Evidencia bancaria | `evidenciaBancaria`: referencia de la operación/fuente; obligatoria para una reposición real; no se publican datos reales |
| Trazabilidad | Referencia futura a la compensación si E3.5 la aporta y, si aplica, a las operaciones compensadas; E3.4 no acredita compensación por inferencia |
| Estado del registro | `Vigente` o `Anulada`; E3.4 no emite `Parcial` ni `Completada` |
| Estado de trazabilidad | `Asignada` o `Sin asignación`; no confundir con validez del registro |
| Cobertura de compensación | La determina E3.5; E3.4 solo muestra el dato si E3.5 lo aporta, sin calcularlo |
| Revisión/auditoría | `revision`, actor, UTC, motivo y antes/después; mismo ID en corrección |
| Vigencia | `Vigente` o `Anulada` lógica; una anulada no computa; sin DELETE y sin reutilizar ID |
| Idempotencia | Clave de intento y payload; reintento no crea otra reposición |
| Historia | Sin DELETE; una devolución de Anticipo no se convierte por inferencia en reposición de Comida |

Una devolución de compra **no es una reposición**: se registra como `Detalle`+`Entrada`
con `esDevolucion=true`, conserva su clasificación y evidencia bancaria, y no se convierte en
`Reposicion` por coincidencia de fecha, importe o dirección.

Una reposición ausente se muestra `Sin reposición registrada`. E3.4 no calcula ni presenta
`Parcial`, `Completada` o `Falta por reponer`: esos estados pertenecen a E3.5, que conoce
el periodo, el objetivo y las compensaciones. E3.4 nunca presenta una reposición ausente o
parcial como completada. No se crean Ingresos/Gastos ficticios ni se duplica un movimiento
bancario existente. La reposición es una operación bancaria del mismo módulo, no un segundo
ledger económico.

La evidencia histórica v5.10 usa campos físicos `Estado` y `Referencia reposición`; la
representación app propone `estadoRegistro` y trazabilidad futura a compensación si E3.5
la aporta. No se declara
equivalencia entre ambos; queda para AC-25.

Varias reposiciones pueden referenciar el mismo Movimiento si la `evidenciaVinculo` lo justifica;
eso no las duplica ni crea un Movimiento ficticio. La duplicación se evalúa por identidad,
evidencia bancaria y reintento, no por reutilización del vínculo.

No toda `Entrada` es una Reposición ni una devolución. Una devolución solo existe cuando
`tipo=Detalle`, `direccion=Entrada` y `esDevolucion=true`; no se infiere por dirección.
No se convierte en Reposición ni en subtipo de Ingreso. Su efecto analítico pertenece a
E3.5 y no se define aquí.

### Fechas, referencia y cobertura histórica

- `fechaOperacion` es la fecha financiera de la operación y participa en la fuente
  `Revisión Comida` de la referencia central.
- La fuente devuelve `disponible` con la máxima fecha de operaciones vigentes con fecha
  válida, incluidas las `Sin vínculo`; la cobertura del vínculo se informa por separado.
  Devuelve `sin_referencia` si no hay operaciones vigentes, o `error` si el lector falla.
  Una operación anulada no participa. No usa reloj, `createdAt`, fecha de importación ni
  fecha de un Movimiento.
- La evidencia bancaria, la relación con compra y el vínculo a Movimiento **no filtran**
  la referencia ni la cobertura temporal. Se mantiene el contrato aprobado: toda operación
  vigente con fecha válida participa, incluidas las `Sin vínculo` y las `Sin evidencia`.
- `tblCiclos` es el único maestro temporal. No se persiste `ciclo_id` en la operación; el
  periodo se deriva por intervalo para consulta. E3.4 no decide el ciclo actual.
- Estados de periodo: `Ciclo abierto` para el último sin `Fin` con fecha ≥ `Inicio`;
  `Sin ciclo asignable` si la fecha no cae en ningún intervalo (antes del primero o en un
  hueco); `Fuera de ciclo` solo como contexto de filtro cuando la operación existe pero no
  pertenece al ciclo seleccionado; `Cobertura parcial` si el rango observado no cubre el
  intervalo completo. No se inventa `Fin`, no se rellena el hueco y no se presenta
  cobertura parcial como completa. Los intervalos/corte se rigen por
  [spec07](07-ciclos-operacion-specification.md).
- La cobertura histórica se deriva del mínimo y máximo de operaciones reales. El rango
  observado no acredita cobertura completa del periodo. No se inventan periodos anteriores
  al primer registro, no se completa la ausencia con cero y no se extrapola a ejercicios
  sin evidencia. No se define una regla nueva de huecos: los intervalos, corte y referencia
  se rigen por [spec07](07-ciclos-operacion-specification.md).
- Consultar un periodo anterior a la cobertura muestra `Sin cobertura histórica`, distinto
  de `Sin operaciones` y de `Error`.
- Las fechas son civiles ISO; la validación de fecha futura reutiliza el límite de
  registro civil existente, sin convertir el reloj en referencia financiera.

### Preservación histórica y cobertura temporal

- La operación y la reposición conservan ID, tipo, `esDevolucion`, fecha, importe,
  clasificación/vínculo, los tres campos de evidencia y auditoría; la anulación es lógica
  y no reutiliza identidad.
- Una rectificación conserva antes/después y no reescribe la evidencia anterior. Las
  fotografías/cierres inmutables de E4 no se modifican cuando existan; E3.4 no los crea.
- La cobertura temporal se limita al rango observado de operaciones reales. No se infiere
  un hueco ni se rellena con cero; un periodo sin operaciones dentro del rango es
  `Sin operaciones`, distinto de `Sin cobertura histórica`.
- `tblCiclos` y el contrato de referencia/corte de [spec07](07-ciclos-operacion-specification.md)
  siguen siendo la única autoridad temporal. E3.4 no crea otra regla de ciclos, no decide
  el ciclo actual y no adelanta cierres.
- Si la fuente histórica autorizada contiene clasificación física `Reposición`, importe
  firmado o campos `Estado`/`Referencia reposición`, se conservan sus valores originales
  en lectura, sin normalizar, sin descartar operaciones y sin reutilizar IDs. No se
  convierten en reglas de app ni se declaran equivalentes; el mapping queda en AC-25.

### Contrato de lectura para E3.5

E3.5 recibe, por operación vigente:

- `tipo`: `Detalle` o `Reposicion`.
- `esDevolucion`: booleano explícito; `true` solo en `Detalle`+`Entrada`.
- ID, revisión, fecha de operación, concepto, importe, dirección y clasificación (si es
  detalle).
- Marca de excepción histórica de solo lectura si el registro legacy tiene clasificación y
  `Fuera presupuesto` simultáneos (AC-12); no se crea un campo escribible
  `fueraPresupuesto`.
- `evidenciaBancaria` y su estado; `evidenciaRelacionCompra` opcional, sin exigir que la
  compra exista en el auxiliar.
- Vínculo opcional, `tipoVinculo` `Individual`/`Agregado terminal` (ausente/null en
  `Sin vínculo`), estado `Verificado`/`Sin vínculo`/`Revisar`, `evidenciaVinculo` y estado
  del Movimiento.
- Reposiciones registradas con ID, fecha, importe, evidencia bancaria, revisión, estado,
  vigencia y trazabilidad.
- Cobertura de la fuente (`disponible`/`sin_referencia`/`error`) y rango histórico real.
- Cobertura/motivo cuando exista un tratamiento analítico pendiente; no se crea un campo,
  estado ni clasificación nuevos para expresarlo.

E3.5 sigue siendo responsable de asignar por ciclo, agregar, conciliar, calcular Recursos
comida, financiación, compensaciones y métricas de cierre. También determina `Parcial`,
`Completada`, `Falta por reponer` y la cobertura de reposición; E3.4 no emite esos
resultados. E3.5 debe distinguir la capa `Revisión Comida` de `Movimientos` y no sumar
ambas como hechos económicos independientes. E3.4 no expone esas cifras como resultado
propio ni define neteo, periodo o fórmula de devoluciones.

Requisito de integración futura: si existen operaciones con tratamiento analítico
pendiente, E3.5 debe marcar cobertura incompleta y no presentar los totales afectados como
completos. La fórmula, el periodo y el neteo se deciden en E3.5, no en E3.4.

## Screens and interfaces

Wireframes del candidato aprobado el 2026-10-26, con los ajustes de este delta pendientes
de aprobación final. Reutilizan shell, tokens, tabla/tarjetas, foco y mensajes existentes.
No introducen otro tema ni librería.

### W1 — Consulta de operaciones, escritorio 1440

```text
┌ MyFinanzas · Revisión Comida ─────────────────────────────────────────────────────┐
│ Ciclo: 01/10/2026 → 31/10/2026 · Referencia: 24/10/2026 · Fuente: disponible      │
│ Estado de ciclo: con fin temporal · Cobertura histórica: parcial                 │
│ Sin histórico anterior · [Ver criterio]                                           │
│ [Buscar ID/concepto] [Clasificación ▾] [Vínculo ▾] [Fuera presupuesto ▾]          │
├───────────────────────────────────────────────────────────────────────────────────┤
│ ID   Fecha op.    Operación              Importe/dirección  Clasificación  Vínculo │
│ 101  03/10/2026   Supermercado           42,10 € · Salida   Comida        Sin vínculo│
│ 102  04/10/2026   Cine                   8,50 € · Salida    Ocio          Sin vínculo│
│ 103  05/10/2026   Compra no presupuestada 15,00 € · Salida  Fuera presup. Sin vínculo│
│ 104  06/10/2026   Supermercado           30,00 € · Salida   Pendiente rev. Sin vínculo│
│ 105  12/10/2026   Reposición comida      20,00 € · Entrada  —             Verificado │
│ 107  15/10/2026   Devolución supermercado 12,00 € · Entrada  Comida        Sin vínculo│
├───────────────────────────────────────────────────────────────────────────────────┤
│ Revisión Comida: operaciones bancarias individuales.                              │
│ Movimientos: reconocimiento económico central. E3.5 concilia por ciclo.           │
│ No se suman ambas capas como hechos independientes.                                │
│ [Nueva operación] [Ver reposiciones]                                              │
└───────────────────────────────────────────────────────────────────────────────────┘
```

La etiqueta `Devolución` solo se muestra si `esDevolucion=true`; una `Entrada` sin ese
discriminador no se presenta como devolución.

### W2 — Ficha de operación, móvil 390

```text
┌ Revisión Comida · Operación 101 ───────────┐
│ Fecha operación  03/10/2026                │
│ Concepto         Supermercado              │
│ Importe          42,10 € · Salida          │
│ Tipo             Detalle · Devolución No   │
│ Clasificación    Comida                    │
│ Evidencia bancaria Operación bancaria      │
│ Relación compra  Sin relación acreditada   │
│ Vínculo          Sin vínculo (normal)      │
│ Efecto           Operación bancaria        │
│ Reconocimiento   Movimientos: no vinculado │
│ Auditoría (UTC)  Rev. 3 · 24/10/2026 10:14│
│ [Editar] [Anular] [Vincular] [Volver]      │
└────────────────────────────────────────────┘
```

Si existe vínculo verificado, se muestra `Vínculo verificado: G-204` y su evidencia. Si
el vínculo es `Agregado terminal`, se muestra `Agregado · sin conciliación de importes`.
No se muestra “Completo x de y” ni una suma contra el Movimiento.

### W3 — Reposiciones y estados, móvil 390

```text
┌ Reposiciones · Ciclo 01/10 → 31/10/2026 ───┐
│ Registradas                                │
│ 105 · 12/10/2026 · 20,00 € · Entrada       │
│   Evidencia bancaria: operación E-08   │
│   Trazabilidad: C-02 (futuro E3.5) · Sin asignación│
│   Estado: Vigente · Rev. 2                 │
│   [Ver] [Editar] [Anular] [Vincular]       │
│                                            │
│ 106 · 20/10/2026 · 10,00 € · Entrada       │
│   Evidencia bancaria: operación E-09   │
│   Trazabilidad: Sin asignación             │
│   Estado: Vigente · Rev. 1                 │
│   [Ver] [Editar] [Anular] [Asignar]        │
│                                            │
│ Sin reposición registrada en otros casos.  │
│ Cobertura de compensación: E3.5            │
│ (no calculada en E3.4; si no está         │
│ instalada, no se muestra)                  │
│ [Nueva reposición]                         │
└────────────────────────────────────────────┘
```

En escritorio 1440 la misma ficha se presenta como tabla con ID, fecha, importe,
evidencia, trazabilidad, estado/revisión y acciones; no se añade una capacidad distinta.

### W1m — Consulta móvil 390

```text
┌ Revisión Comida · 390 ────────────────┐
│ Ciclo 01/10 → 31/10/2026               │
│ Cobertura histórica: parcial           │
│ [Buscar] [Clasificación ▾] [Vínculo ▾] │
│ ┌ 101 · 03/10/2026 · Supermercado     │
│ │ 42,10 € · Salida · Comida            │
│ │ Evidencia bancaria: operación        │
│ │ Vínculo: Sin vínculo                 │
│ │ [Ver] [Editar]                       │
│ ├ 107 · 15/10/2026 · Devolución       │
│ │ 12,00 € · Entrada · Comida           │
│ │ Evidencia bancaria: operación        │
│ │ Relación compra: Sin relación acreditada│
│ │ [Ver] [Editar]                       │
│ ├ 105 · 12/10/2026 · Reposición       │
│ │ 20,00 € · Entrada · Vigente · Rev.2  │
│ │ Trazabilidad: C-02 (futuro) · Sin asignación│
│ │ [Ver] [Editar] [Anular] [Vincular]   │
│ └ Sin operaciones en otros filtros.    │
│ [Nueva operación] [Ver reposiciones]   │
└────────────────────────────────────────┘
```

### W4 — Ficha y reposiciones escritorio 1440

```text
┌ Revisión Comida · Operación 101 · 1440 ───────────────────────────────────────────┐
│ ID 101 · Fecha operación 03/10/2026 · Concepto Supermercado · 42,10 € · Salida   │
│ Tipo: Detalle · Devolución: No · Clasificación: Comida                         │
│ Evidencia bancaria: operación · Relación: Sin relación acreditada · Estado: Vigente│
│ Vínculo: Sin vínculo · Efecto: operación bancaria · Movimientos: no vinculado     │
│ Auditoría (UTC): 24/10/2026 10:14                                                  │
│ [Editar] [Anular] [Vincular] [Volver]                                              │
├────────────────────────────────────────────────────────────────────────────────────┤
│ REPOSICIONES                                                                      │
│ ID  | Fecha      | Importe  | Evid. bancaria | Trazabilidad | Estado/Rev | Acciones │
│ 105 | 12/10/2026 | 20,00 € | E-08 | C-02 (futuro) · Sin asignación | Vigente 2 | [Ver][Editar][Anular][Vincular]│
│ 106 | 20/10/2026 | 10,00 €  | E-09 | Sin asignación     | Vigente 1 | [Ver][Editar][Anular][Asignar] │
│ [Nueva reposición]                                                                 │
└────────────────────────────────────────────────────────────────────────────────────┘
```

Las acciones son las mismas en 390 y 1440; no se crea una capacidad distinta por breakpoint.

## Empty, loading and error states

| Estado | Comportamiento |
| --- | --- |
| Sin operaciones | «Sin operaciones de Revisión Comida»; no cero financiero |
| Sin cobertura histórica | «Sin cobertura anterior al primer registro»; distinto de sin operaciones |
| Sin ciclo asignable | La operación queda fuera de todo intervalo; no se inventa ciclo ni se convierte en cero |
| Fuera de ciclo | La operación existe pero no pertenece al ciclo filtrado; no es ausencia ni cero |
| Ciclo abierto | Último ciclo sin `Fin`; fecha ≥ Inicio; no se inventa Fin ni cierre |
| Cobertura parcial | El rango observado no cubre el intervalo; no se presenta como completo |
| Cargando | Estado de carga sin importes provisionales ni filas ficticias |
| Fuente `sin_referencia` | Referencia no disponible; no se inventa fecha ni corte |
| Fuente `error` | Error de fuente con motivo; no se trata como ausencia de datos |
| Operación sin vínculo | «Sin vínculo»; es normal; no suma a Movimientos ni crea Gasto |
| Operación sin evidencia | «Sin evidencia»; no se presenta como verificada; no se inventa evidencia |
| Devolución sin identificación expresa | Una `Reposicion` u otra `Entrada` con `esDevolucion=false` no se presenta como devolución; no se infiere |
| Relación con compra sin acreditar | «Sin relación acreditada»; estado normal; no es error ni cobertura incompleta; no exige que la compra exista en el auxiliar |
| Vínculo agregado | «Agregado terminal · sin conciliación de importes»; no reparte ni suma |
| Cobertura incompleta por tratamiento pendiente | E3.5 la declara y atribuye; E3.4 no la calcula ni la presenta como propia |
| Vínculo verificado | Muestra ID/evidencia del Movimiento; no copia fecha/importe |
| Vínculo en revisión | `Revisar`; no se reasigna automáticamente |
| Movimiento anulado | Aviso; la operación bancaria sigue siendo válida y el vínculo queda en revisión |
| Reposición ausente | «Sin reposición registrada»; nunca «Completada» |
| Reposición anulada | Se conserva en historia y no computa; no se reutiliza su ID |
| Cobertura de reposición | «Parcial»/«Completada» solo si E3.5 lo aporta; E3.4 no lo calcula ni lo presenta como propio |
| Error de reposición | 409/422 conserva borrador y muestra causa; sin escritura parcial |
| 404 | ID inexistente en operación o reposición; mensaje seguro, sin datos de otro registro |
| 409/422 | Conserva borrador, explica causa y exige actualizar contexto; sin escritura parcial |
| 401/403 | Acceso protegido; sin datos financieros ni SQL |

## API behavior and external dependencies

Contrato propuesto, sin rutas implementadas:

- `GET /api/revision-comida` y `GET /api/revision-comida/:id`: consulta paginada/filtrada
  y ficha, con filtros por fecha, tipo, `esDevolucion`, clasificación, vínculo,
  fuera presupuesto, evidencia y estado; `404` si el ID no existe. El filtro
  `fuera presupuesto` es un atajo sobre el valor del enum; la marca histórica de doble
  columna es solo de lectura (AC-12).
- `POST /api/revision-comida`: alta con idempotency-key, revisión de contexto y validación
  atómica.
- `POST /api/revision-comida/:id/rectificar`: motivo, antes/después y revalidación.
- `POST /api/revision-comida/:id/anular`: anulación lógica y auditoría.
- `POST /api/revision-comida/:id/vinculo`: vincular/desvincular con evidencia y auditoría;
  no se admite vínculo inferido ni automático.
- `GET /api/revision-comida/reposiciones` y `GET /api/revision-comida/reposiciones/:id`:
  consulta paginada/filtrada y ficha de reposiciones reales; `404` si el ID no existe.
- `POST /api/revision-comida/reposiciones`: alta con idempotency-key, evidencia y revisión
  de contexto.
- `POST /api/revision-comida/reposiciones/:id/rectificar`: motivo, antes/después y
  revalidación.
- `POST /api/revision-comida/reposiciones/:id/anular`: anulación lógica y auditoría.
- `POST /api/revision-comida/reposiciones/:id/vinculo`: vínculo opcional verificado con
  evidencia; sin vínculo inferido.
- El DTO de operación incluye `tipo`, `esDevolucion`, `clasificacion`,
  `evidenciaBancaria`/estado, `evidenciaRelacionCompra`, `tipoVinculo`,
  `evidenciaVinculo`, `estadoVinculo` y `estadoRegistro`. `detalleOrigenId` no se
  incorpora en este delta.
- DTO interno de lectura para E3.5; no se expone como cálculo de financiación.

Todas las rutas reutilizan sesión MFA completa, Origin/CSRF, límites JSON, errores
genéricos con requestId, `no-store` y SQL parametrizado. Altas, rectificaciones,
anulaciones y vínculos usan revisión/contexto, idempotencia y auditoría atómica. No hay
endpoint de importación de extractos ni integración bancaria externa.

## Validation and edge cases

- Importe vacío/null/cero/negativo/float/tercer decimal: rechazo exacto; no default cero.
- Dirección contradictoria o signo invertido: rechazo en escritura nueva; un histórico en
  conflicto queda `Revisar`; no se usa `Incompatible` como estado persistido ni se invierte
  el signo automáticamente.
- `esDevolucion=true` solo con `tipo=Detalle` y `direccion=Entrada`; en `Detalle`+`Salida`
  y en `Reposicion` se rechaza. Una `Entrada` sin `esDevolucion=true` no se presenta ni se
  trata como devolución.
- Clasificación desconocida o combinación `Fuera presupuesto` + otra clasificación:
  rechazo en escritura nueva; históricos conservados en lectura.
- Fecha inválida, no civil o futura según el límite vigente: rechazo; sin desplazamiento
  por zona horaria.
- Vínculo a Movimiento inexistente, no vigente o anulado: rechazo de vínculo nuevo; el
  vínculo histórico se conserva en `Revisar`; no se reasigna.
- Vínculo inferido por fecha/importe/concepto/Saldo: rechazo; se exige `evidenciaVinculo`.
- Vínculo a `Gasto` agregado: solo si procede de Terminal y se marca
  `tipoVinculo=Agregado terminal`; sin reparto, sin conciliación de importes y sin suma
  acotada. No se admite `Transferencia` de financiación ni Exterior/D5.
- Varias operaciones con el mismo Movimiento: permitido si hay evidencia; la cardinalidad
  técnica de la app es operación 0..1 / Movimiento 0..N referencias y no se reparte el
  importe. No se aplica ningún límite de importe ni suma acotada contra el Movimiento.
- Operación sin vínculo: válida; no es error ni cobertura incompleta.
- `evidenciaRelacionCompra` es opcional; no exige que la compra exista en el auxiliar y no
  se infiere. Si se aporta incompleta o inconsistente, se rechaza (422). La ausencia se
  muestra «Sin relación acreditada», no es error ni penaliza cobertura/referencia; no se
  crea un estado de relación ni se usa `Revisar` (reservado a `estadoVinculo`).
- `esDevolucion` es obligatorio en el alta; omitido produce 422. `Detalle`+`Entrada` con
  `false` se rechaza; `Detalle`+`Salida` y `Reposicion` solo admiten `false`.
- Reposición sin operación bancaria real, duplicada o sin `evidenciaBancaria`: rechazo; no
  se crea un Movimiento ficticio. La reposición conserva ID, revisión, auditoría, vigencia
  e idempotencia; su anulación es lógica y no reutiliza ID.
- Toda `Entrada` no es Reposición ni devolución: una devolución exige `esDevolucion=true`.
  No se crean subtipos de Ingreso ni se habilita Exterior/D5.
- La evidencia bancaria, la relación con compra y el vínculo no filtran la referencia ni
  la cobertura temporal; se mantiene el contrato aprobado.
- Campos calculados o derivados enviados por cliente: rechazo; no se aceptan como entrada
  no escribible. E3.4 no promete recálculos ni estados de motores futuros.
- Reclasificación: mismo ID, motivo, antes/después y auditoría; recálculo de resultados
  vivos; no se modifican snapshots históricos inmutables.
- Reintento/doble envío: una sola fila; la coincidencia legítima de dos operaciones
  iguales se advierte, no se rechaza por una UNIQUE económica.
- Cobertura histórica: no se rellena antes del primer registro ni se extrapola; no se
  convierte la ausencia en cero.
- Concurrencia: revisión obsoleta produce 409; sin mezcla de versiones ni escritura
  parcial.
- Reinicio/restore: IDs, fechas, vínculos, auditoría y referencia se conservan; no se
  resucitan intentos revocados.

## Decisiones pendientes

### PD-01 — devolución de compra

Resolución E3.4 propuesta en el delta (2026-10-26):

- Una devolución se registra como `Detalle`+`Entrada` con `esDevolucion=true`. No se
  infiere por dirección, fecha, importe ni concepto.
- `esDevolucion` es un discriminador lógico explícito; no crea tipo, clasificación ni
  ledger nuevos.
- Usa el enum de clasificación aprobado, incluido `Fuera presupuesto` y su exclusividad.
- `evidenciaBancaria` identifica la operación; `evidenciaRelacionCompra` es opcional y no
  exige que la compra original exista en el auxiliar; `evidenciaVinculo` pertenece al
  vínculo con Movimiento.
- No se adopta `detalleOrigenId` en este delta. La relación devolución–compra se limita a
  `evidenciaRelacionCompra`; no reparte importes ni crea doble efecto.
- La operación bancaria real se conserva; no se suma a Saldos centrales ni crea Movimiento.
- No define neteo, periodo ni fórmula analítica.

Pendiente E3.5: el neteo, el periodo, `Compensable` neto, `Falta por reponer` y cualquier
efecto financiero. E3.4 no los calcula ni los presenta como propios.

Pendiente AC-25: la aplicabilidad física de esta representación a v5.11(7), incluida la
clasificación, `Fuera presupuesto`, `Reposición`, importe firmado, `Estado`/`Referencia
reposición` y la relación con la compra. No se declara equivalencia.

Las propuestas A/B/C y la formulación anterior quedan como historia; no son reglas
vigentes. AC-10 deja de estar bloqueado en la parte `Detalle`+`Entrada` por este delta.

## Exclusions

No implementación, SQL/DDL/migración ejecutada, datos reales ni Excel. No se incluye:

- financiación, Recursos comida, agregación por ciclo, reconciliación, compensaciones,
  `Parcial`/`Completada`, Falta por reponer, conciliación de saldo inicial ni arrastre de
  saldo inicial (E3.5);
- creación de Ingresos/Gastos ficticios, saldo paralelo o segundo ledger económico;
- reparto técnico de Gastos centrales entre operaciones bancarias;
- vínculos inferidos por fecha, importe, concepto o Saldo;
- `detalleOrigenId` o cualquier FK devolución–compra en este delta;
- filtros de referencia/cobertura por evidencia bancaria, relación con compra o vínculo;
- vínculos de compra a `Transferencia` de financiación; agregados con conciliación de
  importes o reparto;
- importación de extractos, conciliación bancaria automática o integración externa;
- nuevas Partidas/Categorías/Subcategorías/Referencias para clasificar Comida;
- subtipos nuevos de Ingreso, Exterior/D5 o tratamiento analítico de devoluciones
  presentado como decidido; el neteo, periodo y fórmula pertenecen a E3.5;
- recálculos, estados o motores de E3.5/E4 presentados como instalados;
- cambios estructurales en Movimientos, Terminal o la representación bancaria;
- cierres, fotografías inmutables, congelación E4, bloqueo transversal de cierre;
- Base B, D5/Exterior, Vehículos, B3/Dev32, desarrollo, tests, deploy o merge.

## Acceptance checks

**Previstos, no ejecutados.** No autorizan desarrollo ni declaran PASS. `C` = condicional
a la existencia de históricos con ambas columnas informadas (AC-12, AC-31); no queda
ningún AC condicionado a D-01-R. El resto queda sujeto a la aprobación de esta
specification.

Grupos para separar alcance:

| Grupo | AC | Verificable en dev16 |
| --- | --- | --- |
| E3.4 | AC-01–AC-11, AC-13–AC-22, AC-24, AC-26, AC-28–AC-30, AC-32, AC-33, AC-35, AC-37 | Sí, cuando se autorice |
| Integración/visualización E3.5 | AC-27, AC-34, AC-36 | No; contrato futuro |
| Histórico | AC-12, AC-31 | No; solo si existe evidencia |
| Documental | AC-23, AC-25 | No; gate de aprobación/migración |

Solo el grupo E3.4 es verificable en la entrega E3.4. Los grupos futuros no se declaran
PASS ni se simulan. AC-04 queda dentro de E3.4 como vínculo agregado de Terminal; AC-10
deja de estar bloqueado por PD-01.

| ID | Acción / precondiciones | Resultado observable esperado | Verificación prevista | Estado |
| --- | --- | --- | --- | --- |
| AC-01 | Guardar una operación bancaria de detalle con ID, fecha, concepto, importe, dirección, clasificación, `esDevolucion` y evidencia bancaria | Se crea un ID estable; no se crea ni modifica ningún Movimiento; no aparece saldo paralelo | Bun/API/SQLite | Previsto |
| AC-02 | Guardar una operación sin Movimiento | Es válida, queda `Sin vínculo`; no suma a Movimientos/Saldos ni crea Gasto; sí forma parte de la cobertura de Revisión Comida y de la lectura de E3.5; no se inventa vínculo | Bun/API/UI | Previsto |
| AC-03 | Vincular una operación a un Movimiento con `evidenciaVinculo`, incluyendo varias operaciones al mismo Movimiento | Se guarda el vínculo como trazabilidad; no copia fecha/importe ni altera el Movimiento; una operación no apunta a varios Movimientos; no se infiere por fecha/importe/concepto | Bun/API/UI | Previsto |
| AC-04 | Vincular una operación a un `Gasto` agregado de Terminal con `evidenciaVinculo` | Se guarda `tipoVinculo=Agregado terminal` y se muestra **sin conciliación de importes**; no hay reparto, suma acotada, Gasto nuevo ni doble efecto | Bun/API/UI | Previsto |
| AC-05 | Repetir el mismo alta o simular respuesta perdida | Un solo ID y una sola fila; la coincidencia legítima de dos operaciones iguales se advierte sin UNIQUE económica | Bun/API | Previsto |
| AC-06 | Operación con fecha distinta de la fecha del Movimiento vinculado | Se conserva y muestra la fecha de operación; no se sustituye por la del Movimiento | Bun/API/UI | Previsto |
| AC-07 | Consultar referencia con operación válida, con `Sin vínculo`, con reposición, sin registros y con lector fallido | Máximo válido de operaciones vigentes (incluidas `Sin vínculo` y `Sin evidencia`), `sin_referencia` y `error` diferenciados; no se filtra por evidencia; anulada no participa; `tblCiclos` sigue siendo el único maestro temporal | Bun/API/UI | Previsto |
| AC-08 | Consultar un periodo anterior al primer registro y un periodo sin operaciones dentro del rango observado | «Sin cobertura histórica» frente a «Sin operaciones»; no se rellena con cero, no se extrapola y el rango observado no se presenta como cobertura completa | Bun/API/UI | Previsto |
| AC-09 | Introducir importe vacío, cero, negativo, float o tercer decimal | Rechazo; EUR exacto en céntimos y string; no se normaliza a cero | Bun/API | Previsto |
| AC-10 | Validar matriz tipo/dirección: `Detalle`+`Salida`, `Reposicion`+`Entrada`, `Reposicion`+`Salida`, `Detalle`+`Entrada`, y el discriminador `esDevolucion` | Las dos primeras son válidas; `Reposicion`+`Salida` se rechaza; `Detalle`+`Entrada` es válido solo con `esDevolucion=true` y no se infiere por dirección; `Detalle`+`Salida` y `Reposicion` exigen `esDevolucion=false`; no se invierte signo | Bun/API | Previsto |
| AC-11 | Guardar `Fuera presupuesto` junto a `Comida`/`Ocio`/etc. | Rechazo en escritura nueva; la clasificación es exclusiva y conserva la restricción documentada en v5.10, con aplicabilidad a v5.11(7) pendiente | Bun/API | Previsto |
| AC-12 | Leer un histórico con ambas columnas informadas, si existiera | Se preservan ambos datos en lectura sin normalizar ni perder información; no se permite repetir la combinación | Bun/API/UI | C |
| AC-13 | Verificar en el contrato de lectura que `Ocio`+`Niños`+`Otros` son los únicos componentes de `Compensable` y que `Fuera presupuesto` no se incluye | El contrato no incluye `Fuera presupuesto` en Compensable y conserva su operación bancaria; el cálculo del agregado pertenece a E3.5 | Bun/API | Previsto |
| AC-14 | Registrar reposición con operación bancaria real y con/sin Movimiento vinculado; probar ausencia de operación y de evidencia bancaria | Sin operación bancaria real → rechazo; sin Movimiento → permitido `Sin vínculo`; sin `evidenciaBancaria` → rechazo; con operación y evidencia → `Vigente`; `Sin asignación` si no hay compensación; E3.4 no emite `Parcial`/`Completada` | Bun/API/UI | Previsto |
| AC-15 | Intentar duplicar una reposición por mismo ID, misma operación real o misma evidencia/reintento | Una sola reposición y un solo ID; la reutilización de un Movimiento no es duplicado (AC-26); no se crea Movimiento ficticio | Bun/API | Previsto |
| AC-16 | Reclasificar una operación con revisión y motivo | Mismo ID, antes/después y auditoría; E3.4 no instala ni simula recálculo de E3.5/E4; snapshots inmutables no se modifican | Bun/API/UI | Previsto |
| AC-17 | Rectificar o anular el Movimiento vinculado | El vínculo conserva historia, pasa a `Revisar` y no se reasigna; la operación bancaria sigue siendo válida | Bun/API/UI | Previsto |
| AC-18 | Intentar borrar físicamente una operación o reposición | Rechazo; anulación lógica, historia y auditoría conservadas | Bun/API/SQLite | Previsto |
| AC-19 | Acceder sin MFA, mutar sin Origin/CSRF, enviar payload malformado/sobredimensionado o campos calculados no escribibles (payload derivado) | Rechazo con protecciones existentes; no se acepta un derivado como entrada; sin SQL, importes ni datos sensibles en logs | API | Previsto |
| AC-20 | Consultar 390/1440, teclado y estados vacío/carga/error/409/422; incluir devolución con `esDevolucion=true`, `Sin vínculo`, `Sin evidencia` y vínculo agregado | Tabla/tarjetas legibles; capas `Revisión Comida` y `Movimientos` diferenciadas; devolución no se infiere de `Entrada`; agregado se muestra sin conciliación; sin importes ficticios ni «Completado» falso | Playwright/UI | Previsto |
| AC-21 | Reiniciar y restaurar una copia con operaciones, devoluciones, reposiciones y vínculos | IDs, `esDevolucion`, fechas, vínculos, los tres campos de evidencia, auditoría, cobertura y referencia se conservan; intentos revocados no resucitan | Bun/API/SQLite | Previsto |
| AC-22 | Consultar cálculos propios de E3.4 | No calcula ni emite como propio Recursos, Gasto comida, Compensable, financiación, Falta por reponer, saldo inicial, arrastre, neteo de devoluciones, `Parcial` ni `Completada`; AC-27 permite visualizarlos atribuidos a E3.5; no promete motores futuros | API/UI | Previsto |
| AC-23 | Intentar aprobar cobertura completa sin cerrar la aplicabilidad de D-01-R a v5.11(7) o sin contrastar AC-25 | La specification se declara incompleta; no se crean vínculos artificiales ni se asume cardinalidad | Documental/QA | Previsto |
| AC-24 | Enviar vínculo inexistente, no vigente, anulado, inferido o una revisión obsoleta | Rechazo/409 sin escritura parcial; el vínculo histórico válido se conserva en `Revisar` | Bun/API | Previsto |
| AC-25 | Contrastar la estructura física de v5.11(7) con la evidencia histórica v5.10, incluida la clasificación/`Fuera presupuesto`, `Reposición`, el importe firmado, `Estado`/`Referencia reposición` y la relación devolución–compra | El libro existe, pero no hay contraste físico acreditado; se registra si se mantienen la ausencia de FK/cardinalidad y la aplicabilidad de D-01-R; se distingue cada campo físico de la representación app; si difiere, se actualiza el contrato; no se declara equivalencia ni se presenta v5.10 como vigente | Documental/QA | Pendiente |
| AC-26 | Vincular varias operaciones o reposiciones al mismo Movimiento o `Gasto` agregado de Terminal con evidencia | Cada vínculo conserva su ID y su evidencia; no se considera duplicación ni reparto; el agregado no concilia importes; no se crea Gasto ni se altera el Movimiento | Bun/API/UI | Previsto |
| AC-27 | Mostrar un estado `Parcial`/`Completada` aportado por E3.5, con tratamientos analíticos pendientes | Se muestra atribuido a E3.5, sin cálculo ni promesa de motor instalado; si E3.5 no está, no se simula; con tratamientos pendientes no se presentan totales afectados como completos | API/UI | Futuro E3.5 |
| AC-28 | Crear, rectificar y anular una reposición | ID estable, revisión/auditoría, anulación lógica que no computa, idempotencia y trazabilidad; sin DELETE ni reutilización de ID | Bun/API/SQLite | Previsto |
| AC-29 | Operar acciones responsive y errores en 390/1440 | Nueva/editar/anular/vincular/asignar/ver reposiciones y registrar devolución con foco y teclado; estados vacío/carga/error/404/409/422/401; devolución/agregado/relación con compra visibles sin overflow ni datos ficticios | Playwright/UI | Previsto |
| AC-30 | Intentar reutilizar un ID de operación o reposición, o duplicar su identidad | ID estable y no reutilizable; el duplicado se rechaza o se resuelve por idempotencia; no se renumera el histórico | Bun/API/SQLite | Previsto |
| AC-31 | Leer históricos con clasificación física `Reposición`, importe firmado o `Estado`/`Referencia reposición` | Se preservan valores originales en lectura, sin normalizar ni descartar; no se declaran equivalentes; mapping en AC-25 | Bun/API/UI | C |
| AC-32 | Consultar operación antes del primer ciclo, en hueco, fuera del ciclo filtrado, en ciclo abierto y con cobertura parcial | `Sin ciclo asignable`, `Fuera de ciclo`, `Ciclo abierto` y `Cobertura parcial` diferenciados; no se inventa `Fin` ni se convierte ausencia en cero; spec07 | Bun/API/UI | Previsto |
| AC-33 | Vincular operación `Fuera presupuesto` a Gasto con Partida | La Partida/ejecución central no cambia; solo el análisis auxiliar la excluye; sin doble exclusión ni modificación silenciosa | Bun/API | Previsto |
| AC-34 | Consumir una reposición vinculada en E3.5 | Se cuenta una sola vez como reposición/trazabilidad; no se suma además como ingreso/recurso; E3.5 decide la capa | Futuro E3.5 | Futuro E3.5 |
| AC-35 | Vincular `Detalle`/`Reposicion` a un Movimiento no elegible, `Transferencia` de financiación o Exterior/D5 | `Detalle` solo a `Gasto` individual o `Gasto` agregado de Terminal; `Reposicion` solo a Transferencia interna o Ingreso existente elegible; vínculo nuevo no elegible → rechazo; histórico en conflicto → `Revisar`; sin Movimiento elegible → `Sin vínculo`; no se crea Subtipo, no se habilita Exterior/D5 ni se infiere relación con la compra original sin evidencia | Bun/API | Previsto |
| AC-36 | Recalcular en E3.5 tras una reclasificación | E3.5, cuando exista, recalcula resultados vivos; E3.4 no lo simula; snapshots inmutables no se modifican | Futuro E3.5 | Futuro E3.5 |
| AC-37 | Guardar operación sin `evidenciaBancaria`, con relación de compra incompleta o con evidencia de vínculo incompleta | Sin `evidenciaBancaria` el estado es `Sin evidencia`, no se presenta como verificada; `evidenciaRelacionCompra` es opcional, no exige que la compra exista y no penaliza cobertura; si se aporta incompleta se rechaza (422) y no se crea estado de relación; `evidenciaVinculo` es obligatoria para `Verificado` (sin ella, 422; no se degrada a `Sin vínculo`); reposición sin evidencia bancaria se rechaza | Bun/API/UI | Previsto |

### Trazabilidad a E3.4

| Roadmap | AC |
| --- | --- |
| E3.4-AC1: guardar detalle no crea Gasto adicional | AC-01, AC-02, AC-03, AC-04, AC-05 |
| E3.4-AC2: Fuera presupuesto excluye análisis y conserva efecto bancario | AC-11, AC-12, AC-13, AC-33 |
| E3.4-AC3: no presentar compensación/reposición ausente como completada | AC-14, AC-15, AC-26, AC-27, AC-34 |
| Q1/Q2: operación propia, vínculo opcional, fecha y referencia | AC-01–AC-08, AC-23, AC-25, AC-26, AC-32 |
| Q3: importe y dirección | AC-09, AC-10, AC-35 |
| Q4: clasificación y fuera presupuesto | AC-11, AC-12, AC-13, AC-33 |
| Q5: reposiciones y parcialidad E3.5 | AC-14, AC-15, AC-26, AC-27, AC-28, AC-34 |
| Q6: rectificación e historia | AC-16, AC-17, AC-18, AC-28, AC-36 |
| Q7: frontera E3.4/E3.5 | AC-01, AC-02, AC-13, AC-14, AC-22, AC-27, AC-34, AC-36 |
| API/wireframes de reposiciones | AC-28, AC-29, AC-35 |
| Devolución explícita y evidencia | AC-10, AC-37 |
| Vínculo agregado de Terminal | AC-04, AC-26, AC-35 |
| DT2/DT7 e identidad histórica | AC-25, AC-30, AC-31 |
| Procedencia v5.10 vs v5.11(7) | AC-25 |

## Approval gate

El usuario aprobó el candidato documental y sus wireframes el 2026-10-26 con los hashes
originales. El delta de cierre E3.4 tiene QA independiente PASS (2026-10-26) y queda pendiente de
aprobación final.
Los pendientes expresos que no se cierran con este delta son: efecto analítico E3.5 de
PD-01, D-01-R(v5.11(7)) y AC-25. No se acredita cierre completo ni preparación para
desarrollo. El concepto de devolución/reposición ya está confirmado; no se reabre.

1. Confirmar que Revisión Comida conserva operaciones bancarias propias sin dependencia
   estructural de Movimientos.
2. Confirmar la distinción Excel/app: Excel sin relación formal; app con FK opcional
   operación 0..1 Movimiento y Movimiento 0..N referencias, sin reparto económico.
3. Confirmar que el vínculo a Movimientos es opcional, solo verificado y sin reparto ni
   suma acotada; el vínculo agregado solo admite `Gasto` de Terminal y es sin conciliación
   de importes; no se admite financiación por `Transferencia` ni Exterior/D5.
4. Confirmar que no se crea saldo paralelo, segundo ledger económico ni Gasto adicional.
5. Confirmar que E3.5 es la capa de agregación/conciliación por ciclo, que determina
   `Parcial`/`Completada` y que no suma `Revisión Comida` y `Movimientos` como hechos
   independientes; E3.4 no calcula neteo, periodo ni fórmula.
6. Mantener AC-25 abierto: contrastar la aplicabilidad de la evidencia histórica v5.10 a
   la estructura física de v5.11(7), incluida la clasificación/`Fuera presupuesto`,
   `Reposición`, el importe firmado, `Estado`/`Referencia reposición` y la relación
   devolución–compra; no presentar v5.10 como estructura vigente confirmada ni declarar
   equivalencia.
7. PD-01: representación E3.4 propuesta como `Detalle`+`Entrada` con `esDevolucion=true`,
   clasificación aprobada y evidencia separada; no se infiere por dirección. El efecto
   analítico, el neteo y el periodo quedan pendientes de E3.5. No volver a pedir B, A o C
   ni convertir toda `Entrada` en Reposición.

La línea no se declara preparada para desarrollo hasta la aprobación final del delta y la
autorización DEV16 separada. AC-25 sigue abierto y no se autoriza migración ni datos reales.
Si se autoriza DEV16, se ejecutará solo con datos ficticios; no se usarán datos reales ni
Excel, y las pruebas no sustituirán datos reales por ficticios.

La aprobación de esta specification no autorizará desarrollo, SQL, cambios estructurales,
tests, push ni merge.


## COMIDA-UNICO-01 — candidato de refinamiento, revisión 1 (2026-10-30)

**Estado: decisiones funcionales D1–D5, representación P1, identidad P2, atribución P4 y criterios P5/P6/P7 y enmienda P7a aprobados; especificación completa y wireframes
PENDIENTES de aprobación. Sin implementación de este refactor.** Este apartado propone
el régimen futuro; el contrato auxiliar anterior sigue describiendo el runtime de
`main` hasta implementar y activar un cambio autorizado. No se reinterpreta su QA.

### Autoridad, aprobación y límites

Fuente: mensaje directo del usuario de 2026-10-30: «COMIDA-UNICO-01 — Aprobamos las
cinco decisiones funcionales recogidas en el mensaje 0006». El usuario autoriza
«consolidar estas decisiones en la especificación candidata y continuar con el análisis
técnico». No autoriza migraciones reales, activación ni merges. Esa aprobación inicial no decidió
representación técnica de devoluciones, identidad de ING Comida ni fecha/saldo real.
P1 queda aprobada posteriormente por mensaje directo del usuario de 2026-10-30:
«Apruebo P1: nuevo tipo Devolución de gasto».
El encargo inicial autoriza implementación una vez resueltas las decisiones materiales;
este candidato no supera por sí solo el gate de spec completa.

| ID | Decisión aprobada |
| --- | --- |
| D1 | Conservar histórico agregado y auxiliar consultables; no migrar compras antiguas individualmente ni reconocerlas de nuevo. |
| D2 | Devolución bancaria explícita: entrada real, sin Ingreso artificial ni anulación de una compra real. |
| D3 | Partida real existente obligatoria para contabilizar gastos nuevos; etiqueta de revisión no la sustituye. |
| D4 | Transición al Inicio de un ciclo financiado, condicionada a cobertura y ausencia de solapamiento. |
| D5 | Separar gasto bruto, devoluciones y neto; financiación interna sigue siendo Transferencia. |

La fuente de aprobación es el mensaje humano, no el relay. Respuesta asesora:
[0005](https://github.com/jmartinlabs/myfinanzas-app/blob/1c5bcbc303e165700a7ca8868a99bae9ba116feb/relay.md)
y síntesis/acuse de Codex
[0006](https://github.com/jmartinlabs/myfinanzas-app/blob/603365b35b65fb64c088efe22d9e37c1674b0b70/relay.md).
Las recomendaciones más detalladas de Álex no aprobadas explícitamente conservan ese estado.

### Auditoría técnica y dependencias

Base remota contrastada: `454d21a8793265a44051034e926db8f139eb279c`, esquema v18.
PR abiertas al preflight: #50/#51 (anteriores), #131/#132 (auditorías propuestas).
No son dependencias aprobadas de esta entrega. El Excel físico no se ha inspeccionado;
AC-25 sigue abierto. Sin bases reales abiertas ni pruebas funcionales nuevas.

| Área | Runtime / contrato comprobado | Consecuencia para el refactor |
| --- | --- | --- |
| Movimientos | `movement-ledger.ts`, `movimientos.ts`: cuatro tipos, importe positivo, Partida para Gasto, revisión/idempotencia/auditoría | Devolución requiere contrato nuevo; no reutilizar Ingreso o signo negativo por inferencia. |
| Financiación | SPEC05 y Transferencia: no genera Gasto automáticamente | Eliminar duplicidad operativa no significa corregir una creación automática de Gasto inexistente. |
| Saldos | `positionCents` suma todos los hechos vigentes; Terminal sin posición; `updateSaldo` bloquea cambio histórico | No basta cambiar Control ni Fecha apertura; hace falta régimen explícito o sucesor. |
| Revisión | `revision_comida` conserva fecha/importe/dirección y vínculos independientes, incluso Sin vínculo | Preservar legado; nuevas operaciones deben leer hechos centrales, sin copia económica editable. |
| Ciclos | SPEC07 y `ciclos.ts` leen ambas fuentes para impacto y referencia | Evitar duplicar la fuente temporal de nuevos hechos; mantener legado y anulados consultables. |
| Plan mensual | `planes-ciclo.ts:executionFacts`: Gasto real por Partida; Aportación por Transferencia elegible | No sumar financiación y consumo; neteo de devolución necesita definición pendiente. |
| Anual | `plan-anual.ts:annualExecution`: Gastos vigentes por Partida/ejercicio | Conservar funcionamiento y columnas; no introducir neteo anual silencioso. |
| Flujo | SPEC12/`flujo-mensual.ts`: gasto bruto; netos Comida no disponibles | Mostrar procedencia/cobertura; no insertar devolución como ingreso ordinario para cuadrar flujo. |
| Anticipos / Compartidos | Referencias y relaciones propias sobre Movimientos | Recuperación de Anticipo sigue Transferencia inversa, sin doble descuento; devolución comercial no es recuperación compartida por defecto. |
| Histórico / conciliación / fotos | SPEC20/21/26/27 documentales; no prueba de runtime de cierre/conciliación | No afirmar bloqueo de cierre o conciliación ya implementados; incorporar contratos cuando existan. |
| Esquema y copias | Contrato estricto v18; FK de auditoría, Anticipos, Nómina y Revisión; reconstrucción precedente en v17 | Futuro upgrade debe conservar relaciones, auditorías, identidad y backup/restore; no asignar versión nueva aún. |
| E3.5 | SPEC18/FIN_NETA no integrados; DEV18 STOP | No reutilizar ni reanudar candidato local. Delimitar futura enmienda R4 y consumidores antes de implementarlos. |

### Contrato funcional candidato

Una compra nueva se registra una vez en Movimientos: fecha real, importe positivo,
ING Comida como origen, Exterior como destino y Partida existente. Revisión muestra
ese ID y sus campos centrales; solo guarda metadatos de clasificación analítica,
estado y evidencia. Edición económica redirige al procedimiento de impacto y
rectificación de Movimientos. Anulación conserva ID/auditoría y se refleja en ambas
vistas, sin borrado. Reintento del mismo intento no crea otro hecho; coincidencias
económicas legítimas siguen el contrato de advertencia y confirmación, no una
unicidad por fecha/importe.

Partida determina clasificación económica; Comida/Pendiente revisar/Ocio/Niños/Otros/
Fuera presupuesto son etiquetas de revisión. Nunca eliminan efecto bancario ni
suprimen el Gasto central. No ampliar a cuentas Ocio/Niños por compartir etiquetas.
Sin Partida no se contabiliza el nuevo Gasto, sin Partida puente automática.

Financiación y reposiciones se consultan desde Transferencias reales elegibles, con
evidencia/metadatos cuando corresponda. No crear transferencia por clasificar o
aprobar una revisión. Recuperación de Anticipo conserva Referencia y no se resta
dos veces de Recursos. R4 documentada conserva sus significados de Gasto comida,
Compensable y Falta por reponer; fórmulas netas nuevas y sus entradas quedan
pendientes de enmienda aprobada, sin simular FIN_NETA ausente.

Devoluciones se muestran separadas del bruto. Propuesta pendiente de detalle:
fecha bancaria determina ciclo receptor; compra/ciclo original no se reescriben,
incluida compra histórica agregada. Neto negativo es representable analíticamente.
La aprobación D2/D5 no aprueba todavía reglas de atribución, excesos o neteo de
ejecución presupuestaria.

### Transición propuesta y controles de activación

C es el Inicio de un ciclo elegido y B la apertura bancaria acreditada al comienzo
de C, antes de sus operaciones. No se fija aquí fecha ni importe. B no es el Saldo
inicial comida de Ciclos: éste sigue confirmado manualmente sin arrastre automático.

Antes de C: Movimientos agregados y auxiliar se conservan con su origen y cobertura.
Sus totales de consulta se derivan sin crear Movimientos resumen ni sumar detalle
legado al agregado reconocido. Desde C: compras individuales y devoluciones reales;
ningún agregado nuevo puede representar esas mismas compras.

Posición objetivo desde C = B + entradas vigentes desde C − salidas vigentes desde C.
Transferencias anteriores ya incluidas en B no se vuelven a sumar. Este cálculo
es un contrato candidato para ING Comida, no un filtro global por Fecha apertura.

Un agregado que atraviese C bloquea activación hasta acreditar su cobertura o elegir
otro corte: sin prorrateo inventado. Alta tardía con fecha anterior conserva su periodo;
si ya cubierta por agregado no crea Gasto nuevo. Una omisión demostrada requiere
rectificación histórica explícita, nunca fecha artificial del ciclo nuevo.

Gate de activación: corte/apertura aprobados específicamente, evidencia bancaria,
cobertura íntegra posterior, inventario de transferencias, ausencia de solapamientos
y conciliación de consumidores. Sin cobertura se informa parcial/no disponible,
nunca conciliado. Evidencia de saldo aislada no demuestra cobertura completa.
Ejemplo ficticio objetivo: B=100; financiación=800; compra=45; devolución=10:
posición=865, bruto=45, devoluciones=10, neto=35. Legado: agregado=300 y detalle=300
conservan gasto reconocido=300, nunca 600.

Reversibilidad propuesta: versión/configuración auditada y copia restaurable aislada;
no volver automáticamente a Terminal tras hechos individuales ni borrar hechos para
revertir. Rollback técnico y recuperación financiera son procedimientos distintos;
su prueba exige candidato y autorización correspondiente, no datos reales.

### P1 — representación aprobada (2026-10-30)

Tipo explícito `Devolución de gasto` en Movimientos, importe positivo y entrada al
Saldo bancario receptor. Representa reembolsos comerciales totales o parciales de
una compra/gasto real; bruto, devoluciones y neto permanecen separados. No es Ingreso
ordinario ni anulación de la compra; no se usa para devolución de Anticipo,
recuperación de Compartidos o Transferencia interna, que conservan sus contratos.
La alternativa de ampliar Gasto con discriminador no se adopta. La implementación
requerirá enmendar CHECK, DTO, filtros, preview, referencias, consumidores y contrato
estricto de esquema, conservando la tabla, identidad y auditoría de Movimientos.
P1 no aprueba los casos de atribución P4, neteo presupuestario P5, identidad P2,
apertura real P3 ni la especificación completa. No se ejecuta cambio de esquema.

### P2 — continuidad del Saldo aprobada (2026-10-30)

Fuente: mensaje directo del usuario: «Apruebo P2: mantener ING Comida como el mismo
Saldo, con régimen fechado sujeto a verificación».
ING Comida conserva su ID técnico y representa la misma cuenta bancaria. No se migran
compras históricas ni se reasignan hechos, relaciones o presupuestos anteriores.
Antes de C conserva lectura Terminal sin posición convencional; desde C, posición
centralizada B + entradas vigentes con fecha >= C − salidas vigentes con fecha >= C.
B se acredita antes de las operaciones de C; las transferencias anteriores no vuelven
a sumarse a B y mantienen íntegro su efecto en la otra cuenta. B no sustituye S0 manual
de Ciclos. Consultas que crucen C distinguen régimen y cobertura.

La verificación debe cubrir Saldos, Movimientos/preview/rectificación/anulación,
Revisión, Ciclos/referencia temporal, plan mensual, flujo, Anticipos/Compartidos,
lecturas anuales y contratos futuros de conciliación/cierre. Sin filtros locales
dispersos ni filtro global por Fecha apertura. HISTORY_LOCKED se mantiene; la
transición requiere procedimiento explícito auditado y revalidación de operaciones
que atraviesen C. Apertura, cobertura, ausencia de solapes y recuperación deben
probarse con fixtures antes de cualquier activación autorizada.

Si no se demuestra seguridad, se bloquea el régimen y se presenta una cuenta sucesora
como alternativa a decidir; no se crea automáticamente ni se simula Transferencia de
apertura. P2 no fija fecha C, importe B, evidencia bancaria ni autorización operativa;
P3 y spec/wireframes completos siguen pendientes; P5 se aprueba posteriormente en su apartado. No se modifica el esquema.

### P4 — atribución de devoluciones aprobada (2026-10-30)

Fuente: mensaje directo del usuario: «Apruebo P4: compra y Partida opcionales con
evidencia y revisión; vínculo íntegro sin reparto parcial».
Una devolución comercial acreditada se registra aunque no exista compra individual
vinculable o no pueda acreditarse aún su Partida. Compra y Partida son opcionales;
no inventar compras históricas, Partidas puente ni Ingresos ordinarios. Sin Partida,
queda Pendiente revisar; sigue afectando al banco y no presenta análisis clasificado
como completo. Esta excepción solo corresponde a Devolución de gasto: D3 conserva
Partida obligatoria para todo Gasto nuevo.

Evidencia mínima: fecha bancaria real, importe exacto positivo, Saldo receptor real,
identificador/referencia de operación en extracto y descripción/motivo comercial.
Clasificación y vínculo se acreditan separadamente; su ausencia no elimina una
entrada real. Evidencias privadas solo en persistencia/API autenticadas, no en Git,
logs ni artefactos; fixtures sintéticas para desarrollo.

Cada devolución puede vincularse a una compra y una compra recibir varias devoluciones.
Estados de vínculo: Sin vínculo, Verificado, Revisar. Solo se verifica íntegramente
si la suma de devoluciones verificadas no supera el importe vigente elegible de la
compra. No hay importe asignado parcialmente ni reparto entre compras en esta fase.
Compra 20, devoluciones 12 y 13: posición bancaria +25; vínculo de 12 verificable;
el de 13 queda Revisar si no cabe íntegro. Diferencia potencial 5 informativa bajo
esa hipótesis, sin afirmar que 8 de 13 están atribuidos. No inferir otra compra.
Partida acreditada puede existir sin compra vinculada; vínculo y clasificación son
dimensiones distintas y auditadas. Cuenta receptora distinta de la compra es válida,
sin Transferencia ficticia.

Alta/reintento conserva la idempotencia de Movimientos. Coincidencias legítimas de
fecha/importe reciben advertencia, sin deduplicación ciega. Elegibilidad y suma de
vínculos se revalidan en la misma transacción IMMEDIATE bajo concurrencia.
Rectificar/anular compra o devolución recalcula elegibilidad y marca Revisar cuando
corresponda, preservando historia; no borra una entrada bancaria legítima. Anulación
solo corrige un hecho que no sucedió, no representa un reembolso comercial.

Sin clasificación se muestra importe sin atribuir y cobertura parcial/no disponible
en netos por Partida y ejecución afectada, nunca cero o completo por omisión. P4 no
autoriza netear automáticamente ejecutados ni decide P5. El importe/fecha económico
solo existe en Movimientos; metadata de vínculo/evidencia no crea otro ledger.

### P5 — Ejecutado mensual neto aprobado (2026-10-30)

Fuente: respuesta directa del usuario «Apruebo P5» a la solicitud inmediata y única:
Ejecutado mensual neto, con devoluciones de compras de ciclos anteriores separadas sin
liberar presupuesto actual; cálculo anual vigente conservado. La preferencia transmitida
por Álex en relay 0015 sustituye su recomendación previa de bruto de 0014; la aprobación
procede de este mensaje humano, no del relay. No autoriza implementación ni activación.

Para fuente Gasto real: Ejecutado mensual = Gastos elegibles por Partida/ciclo −
devoluciones comerciales elegibles del mismo ciclo de compra, cobradas en ese ciclo.
Bruto y devoluciones siguen visibles por separado. Pendiente/Desviación/porcentajes y
estado usan este Ejecutado neto, conservando el contrato de plan sin informar y plan 0;
no introducir divisiones por cero ni convertir falta de plan en cero.
Para fuente Aportación a saldo, Ejecutado conserva Transferencias elegibles a destino;
una devolución comercial no financia ni reduce aportaciones. No aplica conserva su
semántica. No sumar ejecución por provisión y por consumo como si fueran la misma cifra.

Evidencia de origen temporal y Partida son dimensiones distintas. Partida acreditada
por sí sola no demuestra ciclo de compra. Puede acreditarse temporalidad sin FK a una
compra individual (por ejemplo, documentación de la compra histórica), sin crear esa
compra. La evidencia debe justificar fecha/ciclo de origen y clasificación; no inferir
origen por nombre, fecha de devolución o etiqueta. El contrato técnico de evidencia y
su revalidación debe concretarse antes de cerrar la spec completa.

Devolución de compra de ciclo anterior: entra al banco en su fecha real y se muestra
separada como devolución de gasto anterior. No reduce Ejecutado del ciclo receptor,
no amplía Pendiente y no reescribe Ejecutado histórico. El gasto neto observado del
ciclo receptor sí resta esa devolución y puede ser negativo: es una magnitud distinta
del Ejecutado presupuestario neto elegible.
Sin Partida u origen temporal acreditable, registrar el hecho según P4, excluirlo
provisionalmente del neteo presupuestario por ciclo y mostrar reembolso por atribuir
con cobertura pendiente. No presentarlo como cero o neto completo. Si el vínculo
está Revisar, no inferir ni elegibilidad ni invalidez de una Partida acreditada por
otra evidencia; temporalidad y elegibilidad requieren comprobación propia. P4 mantiene
vínculo íntegro sin reparto parcial; P5 no autoriza verificar 8 de una devolución 13.

| Ejemplo ficticio | Banco / neto observado | Ejecutado y lectura presupuestaria |
| --- | --- | --- |
| Plan 100, compra 50 y devolución acreditada 15 del mismo ciclo/Partida | Bruto 50, devoluciones 15, neto 35 | Ejecutado 35, Pendiente 65; estados/porcentajes basados en 35. |
| Sin compras actuales, devolución 40 de compra de ciclo anterior | Entrada 40; bruto 0, devolución anterior 40, neto observado −40 | Ejecutado actual 0, sin liberar 40; anterior intacto. |
| Devolución sin Partida o sin ciclo de origen acreditado | Entrada real; importe pendiente visible | No netear provisionalmente; métricas afectadas parciales/no disponibles, con motivo. |
| Fuente Aportación a saldo: transferencia 800 y devolución comercial 15 | Ambos hechos bancarios conservados | Ejecutado de aportación 800; devolución no se incorpora a financiación. |

Plan Anual conserva annualExecution y columnas/cálculo por Partida/año natural, bruto.
Etiquetar la diferencia de semántica frente al mensual neto y no comparar sus totales
como homogéneos ni introducir sincronización. Sin rediseño anual.
SPEC12 conserva S = ingresos − gasto bruto − amortización extraordinaria, PARCIAL y
sin devoluciones; explicitar su cobertura. No incorporar devolución como Ingreso ni
modificar S o crear un indicador ajustado sin enmienda expresa. FIN_NETA/E3.5 runtime
no se presume instalado. Bruto, devolución y neto registrados deben conservar origen,
cobertura y régimen; legado agregado y detalle nunca se suman como doble gasto.

### P6 — métricas de Comida y reposición aprobadas (2026-10-30)

Fuente: mensaje humano directo «Apruebo P6», respuesta a la solicitud única de
bruto/devoluciones/neto en Comida y Compensable, y Falta por reponer basada en
compensable neto del mismo ciclo menos reposiciones reales asignadas, mínimo cero.
La aprobación no cubre fórmulas completas de Recursos ni cierre analítico pendientes.

Grupos conservados: Gasto comida = Comida + Pendiente revisar; Compensable = Ocio +
Niños + Otros. Mostrar bruto, devoluciones y neto separados por grupo. Para obligación
de reposición del ciclo: compensable neto elegible = bruto compensable − devoluciones
comerciales acreditadas de compras de ese mismo ciclo. Falta por reponer =
máx(compensable neto elegible − reposiciones reales asignadas a esa obligación, 0).
Exceso permanece visible; no crear transferencias ni borrar hechos para cuadrarlo.

Ejemplo sintético: Ocio 50, devolución de esa compra/ciclo 15, reposición real asignada
20: compensable bruto 50, devoluciones 15, neto 35, Falta por reponer 15. Sin devolución,
Falta sería 30. La reposición no es devolución comercial ni Gasto adicional.
Devolución de compra anterior entra en fecha real y se muestra separada en neto
bancario observado; no reduce obligación del ciclo actual ni reescribe el de origen.
Sin origen/etiqueta acreditados no atribuir grupo o ciclo por inferencia: métricas
Parcial/No disponible con motivo, sin conciliación ficticia.

Pendiente revisar es una clasificación analítica válida que cuenta como Comida,
no el estado genérico de una devolución con Partida NULL de P4. Deben distinguirse
en DTO/UI. Fuera presupuesto conserva efecto bancario, pero se excluye del análisis
auxiliar. Partida y etiqueta de revisión conservan responsabilidades distintas.
Reposiciones exigen Transferencia real y asignación acreditada a la obligación, sin
duplicados ni reparto monetario nuevo implícito. Devolución de Anticipo conserva
Transferencia inversa referenciada y financiación neta sin segundo descuento.
P4 sigue imponiendo vínculo íntegro sin reparto parcial; P6 no habilita repartir
una devolución entre compras ni clasificar excesos sin evidencia.

### Fuente aportada — fórmulas de Recursos y cierre, 2026-10-30

El usuario confirma «Si la proporcione yo el excel». Se utiliza como evidencia el
archivo que facilitó a Álex, `MyFinanzas2026_v5.11(20261030-155958).xlsx`, conservando
nombre y procedencia. No se declara sustitución ni identidad binaria con v5.11(7).
Extracción física comunicada por Álex en relay
[0020](https://github.com/jmartinlabs/myfinanzas-app/blob/699418aae7b7392a3c35636dcbebe223e63849dc/relay.md)
y [0021](https://github.com/jmartinlabs/myfinanzas-app/blob/a0b54df0d554a7a23743346c9a7cd483ebfa1fce/relay.md).
Codex verifica los mensajes, no ha abierto el libro ni reejecutado esa extracción.
La evidencia v5.10 de 0019 queda histórica; no es fuente equivalente por inferencia.

Tabla/ubicación reportada: hoja Revisión Comida, tblRevisionComidaCiclos, fila 14;
Criterios T3.l/T3.m/T5.f y T5.m/F5.m. Fórmulas sanitizadas, sin importes personales:

| Columna | Cálculo reportado del archivo aportado | Precisión |
| --- | --- | --- |
| F | S0 manual desde tblCiclos | No es B bancario; sin arrastre automático. |
| G / H | G = financiación ordinaria + devolución Anticipo firmada negativa; H = esa devolución en positivo | H informa, no vuelve a restarse. |
| N / O | N = Ocio + Niños + Otros; O = Reposiciones firmadas | Fuente histórica auxiliar; no sumar además Movimientos. |
| I | Recursos = F + G + O − N | No descuenta Comida una segunda vez. |
| J / P | J = consumo Comida + Pendiente revisar; P = max(N−O,0) | P6 modifica explícitamente elegibilidad y neto en el nuevo régimen. |
| R | Cierre auxiliar = F + suma de todas las operaciones firmadas del intervalo | Incluye Fuera presupuesto; no acredita saldo bancario real. |
| S / T / U | Ritmo semanal = J/días transcurridos×7; Recursos equivalentes = I×días transcurridos/días ciclo; Margen = T−J | Duración total no se inventa en un ciclo abierto. |

Intervalo inclusivo Inicio <= Fecha <= Fecha corte desde Ciclos. En abierto, corte
es referencia financiera; Fin sigue vacío. La función Excel N() trata vacíos como
cero; no trasladar esa conducta a una cobertura incompleta. No se cierra AC-25 global
ni se declara equivalencia completa del libro por esta extracción parcial.

### Observaciones 0022 — resueltas documentalmente, 2026-10-30

Álex revisó 581d36c; la solicitud de aprobación de revisión2 quedó suspendida.
Primera observación: Falta por reponer se aclara como obligación económica, no dinero
para restaurar ING, con ejemplo numérico abajo. Segunda: duración provisional del
ciclo abierto contrastada en relay0024 y enmienda P7a aprobada directamente por usuario.
La revisión3 incorpora ambos cambios para nueva aprobación completa; la revisión2 no
se aprueba retroactivamente. No se revocan ni amplían otras decisiones.

### P7 — Recursos y cierre para régimen individual aprobados (2026-10-30)

Preparación autorizada por «vamos». Aprobación posterior directa del usuario:
«Apruebo P7», respuesta a la propuesta identificada en 96a07d1. Se aprueba el contrato
analítico de este apartado, incluida adaptación del ritmo, sin datos reales ni activación.
Se conserva el significado analítico de Recursos y se separa de la posición bancaria.
La fórmula es candidata para ING Comida; no modifica otras cuentas ni reanuda DEV18.

Para ciclo con Inicio A y corte T, ambos derivados del maestro:

| Símbolo | Fuente única y significado en la propuesta |
| --- | --- |
| S0 | Saldo inicial comida manual del ciclo. Ausente no equivale a 0. |
| F | Financiación ordinaria real recibida por ING Comida en [A,T], menos devolución de Anticipo real elegible saliente en [A,T]. Excluir reposiciones ya identificadas como tales; cada hecho tiene una función de financiación como máximo. Sin inferir rol por nombre. |
| R_caja | Reposiciones reales acreditadas cobradas en ING Comida en [A,T], una vez por Movimiento, como O del archivo aportado. Excluirlas de F aunque tengan forma Transferencia. |
| R_obl | Reposiciones reales acreditadas y asignadas a la obligación compensable de este ciclo, según P6, hasta T. No confundir con toda entrada bancaria o con el total de reposiciones cobradas en [A,T] para otras obligaciones. La fecha bancaria real no se cambia por asignación. |
| C_n | Compensable neto elegible de compras de este ciclo fechadas en [A,T]: bruto Ocio/Niños/Otros menos devolución comercial acreditada de esas compras cobrada en [A,T], según P6. |
| J_n | Comida neta elegible de compras de este ciclo fechadas en [A,T]: bruto Comida/Pendiente revisar menos devolución comercial acreditada de esas compras cobrada en [A,T]. Neto observado incluye por separado devoluciones antiguas, sin reducir obligación actual. |
| D | Suma firmada de TODOS los Movimientos vigentes que afectan ING Comida en [A,T]: entradas − salidas, incluidos Fuera presupuesto, devoluciones antiguas o sin clasificación, reposiciones y demás transferencias reales. Un único hecho/ID, sin sumar auxiliar legado. |
| B_A | Posición bancaria derivada al inicio de A, antes de sus operaciones, a partir de B acreditado del corte C y Movimientos [C,A). Solo disponible si A>=C y hay cobertura; no copiarlo a S0. |

**Recursos propuestos = S0 + F + R_caja − C_n.**
**Falta por reponer = max(C_n − R_obl,0)** conserva P6.
Falta por reponer expresa la obligación económica compensable pendiente; NO es la
cantidad de dinero necesaria para devolver ING Comida a una posición objetivo ni
un resultado de conciliación bancaria. UI: «Falta por reponer · obligación económica»
y enlace a posición/cierre y desglose de efectos externos. No crear una métrica de
restauración a S0/objetivo ni una Transferencia de regularización por inferencia.
Ejemplo: S0=B_A=100, Ocio pagado desde ING 50, devolución comercial 15 recibida en otra
cuenta, reposición real a ING 20. C_n=35, R_caja=R_obl=20, Falta=15; D de ING=−30,
Banco/cierre analítico=70, Recursos=85 y otros efectos=−15 por reembolso externo.
La comparación ilustrativa con 100 daría una diferencia de 30, pero no convierte
Falta en 30 ni crea una obligación/reposición nueva; son preguntas distintas.
Sin apertura/cobertura, banco sigue parcial/no disponible aunque Falta sea verificable.

R_caja responde a cuándo entró dinero; R_obl a qué obligación se acredita. No se suman
entre sí. Cobro actual asignado a una obligación antigua entra en Recursos actuales,
como en O histórico, pero no reduce Falta actual. Reposición anterior ya incluida en
S0 no vuelve a sumarse a R_caja; su asignación solo afecta la obligación acreditada.
La devolución de Anticipo ya está dentro de F; su importe informativo no se resta
otra vez. Las compras Comida consumen J_n, no se restan también de Recursos.

**Cierre analítico del ciclo = S0 + D.** Mantiene el significado del cierre auxiliar,
pero D procede solo de Movimientos nuevos. No es una foto de cierre financiero ni
prueba de conciliación. Para periodos anteriores al régimen, conservar el contrato
legado y su procedencia; si falta cobertura, mostrar subtotal parcial/no disponible.
No recalcular histórico mezclando agregados centrales con detalle auxiliar.

**Posición bancaria al corte = B_A + D** (si hay apertura y cobertura acreditadas).
Diferencia analítico−banco = S0−B_A cuando ambos tienen igual intervalo y cobertura.
Una diferencia se explica y se avisa, sin alterar S0, B, hechos ni crear ajustes.
No presentar cierre analítico como saldo bancario verificado por coincidir numéricamente.

Puente visible de explicación, no hecho económico nuevo:
- Base analítica = Recursos − J_n.
- Otros efectos bancarios = D − (F + R_caja − C_n − J_n).
- Cierre analítico = Base analítica + Otros efectos bancarios.

El puente se calcula, no se guarda como Movimiento ni ajuste contable. Debe desglosar
los hechos que lo explican: Fuera presupuesto, devoluciones
antiguas/no atribuibles, transferencias no financiadoras y otras entradas/salidas sin rol
analítico. La diferencia R_caja/R_obl se explica separadamente en la obligación. Un residual sin explicación no
acredita cobertura ni conciliación. No se usa el puente para ocultar un dato ausente.
Si una devolución no tiene clasificación/origen suficiente, D y banco siguen incluyendo
el dinero; Recursos/J_n/C_n afectados se presentan parciales/no disponibles, no completos.

| Ejemplo ficticio, cobertura completa | Resultado candidato |
| --- | --- |
| S0=100; financiación 800; devolución Anticipo saliente 100; reposición 20 asignada al ciclo; Ocio 50; devolución de esa compra/ciclo 15; Comida 200; Fuera presupuesto 5 | F=700, R_caja=R_obl=20, C_n=35, Recursos=785, J_n=200, Falta=15; D=480; cierre analítico=580. Base=585 y otros efectos=−5. |
| Añadir devolución 40 de compra de ciclo anterior | D=520, cierre analítico=620; Recursos=785 y Falta=15 sin cambio; otros efectos=35 (=40−5), reembolso antiguo visible. |
| En el caso anterior B_A=250 en vez de S0=100 | Banco al corte=770; cierre analítico=620; diferencia −150, explicada por S0−B_A, sin corrección automática. |
| Reposición real 20 cobrada hoy y asignada a obligación antigua | R_caja=20 aumenta Recursos actuales; R_obl actual=0, no reduce Falta actual. No contar como financiación adicional. |
| Falta S0 pero B_A y cobertura bancaria están acreditados | Banco disponible; Recursos y cierre analítico no disponibles por falta S0. |
| Existe S0 pero no hay B/cobertura bancaria acreditadas | No afirmar posición bancaria conciliable; analítica solo con su propia cobertura acreditada, o parcial/no disponible. |

Ritmo propuesto: usar J_n para consumo del ciclo y conservar bruto/devoluciones visibles.
Ritmo semanal=J_n/días transcurridos×7 con denominador positivo y conocido.
Recursos equivalentes=Recursos×días transcurridos/duración total; Margen=equivalentes−J_n.
La restricción original de P7 a duración derivada del siguiente Inicio queda
sustituida expresamente por P7a a continuación; se preserva su procedencia en el
brainstorming y la revisión de relay0022/24. No es una corrección silenciosa.

### P7a — duración provisional y horizonte vencido aprobados (2026-10-30)

Fuente humana: «Apruebo P7a», respuesta a la única propuesta: Recursos equivalentes y
Margen provisionales con duración/cobertura acreditadas y No disponible al vencer el
horizonte. La confirmación incluye ese comportamiento de vencimiento, presentado en
la solicitud inmediatamente anterior; no autoriza activación, schema ni merge.

Fuente física reportada por Álex en
[relay0024](https://github.com/jmartinlabs/myfinanzas-app/blob/25d014d9ace73c6fd65688f94c7bf794ac4177dd/relay.md),
archivo de usuario v5.11(20261030-155958), no equivalencia certificada con (7):
tblCiclos[E5 Días ciclo] usa Fin−Inicio+1 si existe siguiente Inicio; si Fin vacío,
EOMONTH(Ciclo financiado,0)−Inicio+1. Ciclo financiado procede del Inicio según maestro.
El denominador provisional es fin del mes FINANCIADO, no fin del mes del Inicio ni
Fecha corte; no crea un Fin ni un siguiente Inicio provisional. tblRevisionComidaCiclos
D14 lee ese valor del maestro; días transcurridos=corte−Inicio+1, inclusivo.

| Situación | Duración / salida de la propuesta aprobada |
| --- | --- |
| Hay siguiente Inicio válido | Duración real=Fin−Inicio+1, Fin=siguiente Inicio−1; métricas según corte/cobertura central. |
| Ciclo abierto, Inicio/mes financiado/corte válidos, duración positiva y transcurridos<=duración provisional | Duración provisional=fin de mes financiado−Inicio+1; equivalentes y Margen calculados con esa duración y etiqueta Provisional, si Recursos/J_n y cobertura suficientes. Fin sigue vacío. |
| Ciclo abierto, corte posterior al horizonte provisional | Estado Horizonte provisional vencido; equivalentes y Margen null/No disponible con motivo. No extrapolar, no recortar días ni inventar Fin. |
| Duración/origen/corte no acreditables, corte anterior al Inicio o métricas sin cobertura | Equivalentes/Margen no disponibles o parciales según fuente; nunca cero por omisión. No sustituir corte por reloj. |

El ritmo semanal observado J_n/transcurridos×7 no necesita duración total y puede
seguir disponible con días positivos/cobertura acreditados aunque venza el horizonte;
se etiqueta observado y no se presenta como proyección válida. Un total parcial puede
mostrarse separado, sin transformar Recursos/Margen completos en una cifra aparente.
Duración/estado son derivados centrales del maestro Ciclos, no entradas manuales ni
otra tabla de fechas. Rectificar/añadir Inicio invalida huellas y recalcula duración,
provisionalidad y métricas; no reescribe ni autocorrige hechos/cierres históricos.

Ejemplo ficticio: Inicio 2026-10-28; ciclo financiado noviembre; Fin vacío; corte
2026-10-30. Horizonte=2026-11-30, duración provisional34, transcurridos3. Recursos340,
J_n30: equivalentes30, Margen0, ritmo semanal70; equivalentes/Margen Provisionales.
Si corte=2026-12-02 sin siguiente Inicio, transcurridos36>34: equivalentes/Margen
No disponibles por horizonte vencido. No extrapolar a360 ni afirmar un Fin real.

P7a conserva el denominador provisional de la fuente, pero la política al vencer el
horizonte es una enmienda explícita aprobada: no copiar la extrapolación que permitía
Excel sin guarda. Con cobertura ausente tampoco se copian ceros de N().


No aprobar implícitamente un arrastre automático, una nueva financiación, compensación
virtual o reparto monetario parcial. La aprobación P7 cubre el contrato
analítico descrito; no aprueba datos reales, C/B, activación ni merge. Contratos de
schema/API y spec/wireframes completos siguen necesitando revisión antes de implementar.

### Decisiones materiales pendientes — apertura operativa separada

| ID | Alternativas | Recomendación y consecuencias |
| --- | --- | --- |
| P3: corte/apertura reales | Seleccionar C/B con evidencia; o diferir activación | Diferir fecha/importe hasta contar con cobertura y extractos autorizados. Desarrollo ficticio no necesita datos reales; activación sí necesita autorización separada. |

### Contrato técnico candidato — revisión 3, 2026-10-30

Este contrato es propuesta técnica dentro del alcance; no implementado. La aprobación
completa solicitada debe identificar COMIDA-UNICO-01 revisión 3 y su SHA final, junto
con los wireframes. Los apartados anteriores a COMIDA-UNICO-01 describen el runtime
legado; cuando contradigan el régimen individual, esta enmienda solo lo sustituirá
tras implementación autorizada. Los AC legados no transfieren sus PASS a CU01–24.

#### Fuentes, persistencia y relaciones

| Objeto propuesto | Datos propios | Restricción |
| --- | --- | --- |
| movimientos | Tipo nuevo, importe/fecha/origen/destino/Partida opcional en devolución; mismo ID y auditoría central | Devolución positiva Exterior→Saldo receptor; compra Gasto conserva Partida; no nuevas tablas de hechos económicos. |
| Metadatos de revisión por Movimiento | FK única movimiento; etiqueta analítica, evidencia bancaria/comercial, estado de revisión y revisión técnica | Sin fecha/importe económico duplicados ni ciclo alternativo persistido. Auditoría append-only de metadata; desasignar evidencia no borra el hecho. |
| Atribución de devolución por Movimiento | FK única devolución; compra opcional; evidencia de relación/origen temporal, estado Sin vínculo/Verificado/Revisar, revisiones observadas | Compra debe ser Gasto elegible existente, nunca agregado como si fuera compra individual. Evidencia externa puede acreditar origen sin FK. Sin columna de importe asignado ni reparto parcial. |
| Rol analítico de Transferencia | FK movimiento y evidencia del rol financiación/reposición/devolución Anticipo y, para reposición, obligación/ciclo acreditado | No importe/fecha nuevos. Cada hecho tiene un rol de entrada en F/R_caja como máximo; Referencia de Anticipo sigue canónica. Sin asignación acreditada no se presume R_obl. No se introduce reparto monetario nuevo entre obligaciones. |
| Régimen de ING Comida | FK Saldo existente; corte referido a Inicio de Ciclo; apertura acreditada B, fuente/evidencia de cobertura, revisión y auditoría | Configuración histórica explícita, no otro Saldo ni ledger. Migración de esquema no instala C/B reales ni activa el régimen. |
| revision_comida legado | Todas sus filas, IDs, importes, fechas, auditorías y vínculos originales | Sin convertirlas a Movimientos, sin DELETE ni reutilizar ID como ID central. Consultas etiquetan fuente; nuevas operaciones individuales no se escriben aquí. |

Nombres físicos definitivos de tablas/índices son decisión de implementación, no nuevas
entidades financieras. Apertura B es dato de configuración autorizado, distinto del
importe de un Movimiento y de S0. Huellas incluyen régimen, metadata, evidencias y
revisiones de compra/devolución, junto con catálogos/Ciclos/Movimientos ya protegidos.
No almacenar como verdad paralela totales, posición, Recursos ni netos calculados.

El nuevo Tipo se entrega inicialmente para operaciones del ámbito Comida identificado
por configuración/ID y evidencia, no por nombre. P4 permite recibir la devolución en
otro Saldo real: esto no se bloquea por ser distinto de ING Comida ni se crea una
Transferencia ficticia. No habilitar por analogía compras generales de otras cuentas.
Lectores genéricos reconocen el Tipo sin clasificarlo como Ingreso ni Gasto bruto;
la UI especializada ofrece el contexto autorizado y el receptor bancario real.

Partida informada se valida por catálogo; con compra vinculada no se cambia por
inferencia la Partida de ninguno de los dos hechos. Evidencia de Partida, etiqueta y
origen temporal se valida separadamente; una incompatibilidad invalida atribución y
cobertura, no borra la realidad bancaria. Estado Pendiente revisar de atribución y
etiqueta analítica Pendiente revisar se exponen en campos distintos.

Para neteo mensual/P6, elegibilidad exige evidencia suficiente de clasificación,
periodo de compra y correspondencia del reembolso. Vínculo Revisar nunca prueba por
sí solo elegibilidad; ausencia de FK no impide acreditación externa según P4/P5.
Cambio de fecha, importe, Partida, etiqueta o evidencia invalida preview y revalida
vínculos/métricas. Dos verificaciones concurrentes usan misma transacción de escritura;
si la segunda excede importe elegible, no queda Verificada por una lectura anterior.

#### API y flujo de escritura propuestos

- Mantener GET/POST de Movimientos, opciones, impacto, rectificación y anulación.
  Su DTO añade el Tipo y un bloque de atribución de devolución opcional. El importe y
  fecha solo se reciben en el payload económico central; el bloque no los acepta.
- Alta compra/devolución desde Revisión abre el formulario común de Movimientos con
  contexto Comida; la devolución permite receptor real distinto según P4. Preview→confirmación escribe hecho y metadata inicial en una
  transacción/idempotencia. Si falla metadata obligatoria, rollback íntegro; sin huérfano.
- GET de Revisión acepta intervalo/ciclo y régimen Histórico/Individual; devuelve
  referencias a hechos, metadata, procedencia, cobertura por métrica y paginación.
  Totales se calculan sobre conjunto completo, no solo página ni filtro visual.
- Para Individual, escritura de etiqueta/evidencia usa recurso de metadata identificado
  por ID de Movimiento y revisión. Reutilizar prefijo /api/revision-comida con rutas
  diferenciadas del ID auxiliar legado; no resolver IDs ambiguos por coincidencia.
  No aceptar actualización económica en esa ruta: error 422, con enlace al Movimiento.
- Vínculo/desvínculo/revisión de compra requiere preview e incluye revisiones centrales;
  confirma bajo IMMEDIATE con auditoría e idempotencia. Desvincular no anula devolución.
  Sin reparto nuevo; historial de vínculos permanece consultable. Si la devolución se
  recibe fuera de ING Comida, el otro Saldo recibe el efecto bancario; D de ING no
  contiene esa entrada. Métricas analíticas mantienen la elegibilidad P4–P7 y el
  puente identifica expresamente ese efecto externo, sin fingir entrada en ING.
- El régimen se prepara mediante operación dedicada de impacto y confirmación, nunca
  PATCH ordinario de Control/apertura. Revisa cobertura, solapes, consumidores, corte y
  diferencia S0/B. Sin autorización operativa ni C/B acreditados no se activa. Las
  pruebas ficticias pueden preparar/activar fixtures, sin habilitar datos reales.
- Authentication/Origin/CSRF, límites JSON, no-store y errores seguros existentes siguen
  en todas las rutas. 409 por versión/preview obsoleto, 422 por dato inválido, 404 por
  identidad ausente; fallo de fuente produce error/no disponible, no lista vacía o cero.

DTO por métrica: valor decimal string o null, unidad, estado de cobertura, motivo,
intervalo/corte, régimen y fuente. Datos faltantes no se codifican como 0. Subtotal
registrado puede mostrarse con etiqueta Parcial distinta de resultado verificable.
Cierre analítico no emite un estado de cierre financiero ni sustituye SPEC26/27.

#### Upgrade, protección y verificación

Upgrade técnico desde v18 en la transacción de apertura existente, sin reseed ni
modificación económica de filas/auditorías. Reconstruir CHECK de Movimientos y
relaciones dependientes si es necesario; verificar FK, identidad, contrato estricto
y preservación exacta de JSON de auditoría. Versión/identificador de contrato se fijan
al implementar sobre main entonces vigente, sin asumir que la siguiente será v19.
Conservar fixture genuina v18 y pruebas de continuidad de versiones soportadas.

Backup/restore reconoce el esquema nuevo, conserva legado/metadata/régimen y revoca
accesos/intentos según contrato vigente. Fallo inyectado revierte DDL/filas/versión.
Restauración es aislada a destino nuevo, nunca rollback destructivo de una base real.
Un upgrade no acredita cobertura bancaria ni activa una transición financiera.

Guard central protege cambios que cruzan C, agregados solapados, revisión de Ciclos y
atribuciones. No se retira HISTORY_LOCKED ni se agrega filtro global Fecha apertura.
Todos los consumidores usan posición central del régimen. Hasta completar una fuente
instalada, la métrica afectada queda no disponible; no se entrega el refactor como
completo con consumidores esenciales o conciliación pendientes.

Plan de implementación posterior a aprobación completa: (1) esquema/Tipo y regresión
v18; (2) escritura central + metadatos/atribución; (3) Revisión vista dual legado/nuevo;
(4) régimen/posición por corte y guards; (5) netos mensual/P6/P7 y consumidores; (6)
E2E, restore, QA independiente y CI Linux por candidato. Solo datos ficticios. No se
reanuda DEV18; el nuevo alcance mantiene sus fuentes y aprobaciones propias.

### Interfaces propuestas, todavía no aprobadas

Reutilizar rutas de Movimientos para hechos económicos
y limitar escritura de Revisión a metadatos conforme al contrato técnico candidato.
Nombres físicos y organización interna no alteran los contratos funcionales. Sin API financiera paralela. MFA, Origin/CSRF,
no-store, revisiones, huellas e idempotencia se mantienen; servidor revalida bajo
transacción IMMEDIATE, no solo UI.

Escritorio (1440):
```text
Revisión Comida | Ciclo [maestro Ciclos] | Régimen [Histórico / Individual]
Cobertura [Parcial / Verificable / No disponible] · procedencia visible
Recursos analíticos [...] · Cierre analítico [...] · Banco al corte [...]
Diferencia S0/apertura [...] · Otros efectos [Ver desglose]
Bruto [...]  Devoluciones [...]  Neto [...]  Financiación [...]
Falta por reponer · obligación económica [...] (no conciliación bancaria)
Ritmo observado [...] · Equivalentes/Margen [Provisional / Real / No disponible]
Fecha | Movimiento | Concepto | Partida | Revisión | Importe | Estado
[Registrar compra en Movimientos] [Ver financiación] [Evidencias]
Histórico: agregado reconocido [...] · detalle disponible [...] (no se suman)
```
Móvil (390): mismos datos en tarjetas; acciones con etiquetas y teclado; ficha enlaza
Movimiento. Sin segunda fecha/importe editable. Vacío con cobertura acreditada difiere
de Sin cobertura; fallo de fuente no devuelve cero. Conflicto 409 conserva borrador y
exige refrescar impacto; 422 identifica campo, 401 exige acceso, 404 conserva contexto.
Operaciones anuladas consultables sin contribuir a totales; pendientes y duplicados
no se presentan como conciliados. No usar color como único estado.
Wireframes y formulación de métricas requieren revisión final de spec, no se afirman aprobados.

### Aceptación del refactor — IDs CU, sin sustituir los AC legados

Todos los casos siguientes son **UNRUN**; no heredan PASS de DEV16.

| ID / encargo | Acción con fixtures ficticias | Resultado exigido |
| --- | --- | --- |
| CU-01 / AC01 | Transferir 800 de cuenta ordinaria a ING Comida en régimen individual | Origen −800, destino +800, ningún Gasto creado. |
| CU-02 / AC02 | Registrar compra de 45 con Partida | Una fila económica, posición −45 y mismo ID en Revisión. |
| CU-03 / AC03 | Consultar plan/informes de esa compra | Una contribución por consumidor; financiación no sumada a consumo. |
| CU-04 / AC04 | Registrar en Inicio/Fin y fuera de intervalos | Ciclo derivado del maestro; Sin ciclo cuando proceda, sin fecha alternativa. |
| CU-05 / AC05 | Cambiar etiqueta/evidencia y abrir rectificación | Metadatos no crean hechos; cambio económico usa Movimientos. |
| CU-06 / AC06 | Devolver 10, incluso de compra anterior al corte | Entrada bancaria una vez, bruto separado, sin Ingreso artificial; atribución según P4; neteo presupuestario según P5, distinguiendo origen temporal y cobertura. |
| CU-07 / AC07 | B=100, +800, −45, +10 con cobertura demostrada | Posición 865; ocultar prueba de cobertura cambia disponibilidad, no inventa conciliación. |
| CU-08 / AC08 | Conservar agregado 300 y detalles antiguos 300 | Gasto reconocido 300; no copia individual; origen y cobertura visibles. |
| CU-09 / AC09 | Recuperación de Anticipo, reposición, Compartidos y plan/flujo/anual | Significados previos preservados, sin doble descuento ni modificación anual. |
| CU-10 / AC10 | Reintento, coincidencia legítima, anulación, falta de Partida, solape y fuente fallida | Idempotencia, auditoría y errores verificables; solape bloquea activación, incompleto no concilia. |
| CU-11 / AC11 | Upgrade ficticio, reapertura y restore más E2E 390/1440 | Identidad, relaciones, auditoría y autenticación preservadas; QA independiente y CI requeridas. |
| CU-12 / AC12 | Revisar escrituras/lecturas y SQL | Sin segundo ledger nuevo, sin importes/fechas duplicados editables en metadatos. |
| CU-13 / P5 | Plan 100, compra 50 y devolución 15 acreditadas del mismo ciclo | Ejecutado 35, Pendiente 65; bruto 50/devolución 15 visibles; estado/desviación/% usan neto. |
| CU-14 / P5 | Devolución 40 de compra de ciclo anterior, sin compras nuevas | Banco +40, neto observado −40; Ejecutado actual 0, sin liberar presupuesto ni rectificar ciclo anterior. |
| CU-15 / P4–P5 | Partida conocida sin temporalidad, Partida NULL y vínculo Revisar | Banco conserva devolución; neteo presupuestario solo con elegibilidad acreditada, resto pendiente y cobertura parcial; sin reparto implícito. |
| CU-16 / P5 | Aportación 800 y devolución comercial 15; comparar anual/flujo | Aportación ejecutada 800; anual bruto y S bruto PARCIAL conservados y explicados frente al mensual neto. |
| CU-17 / P6 | Ocio 50, devolución misma compra/ciclo 15 y reposición asignada 20 | Compensable bruto 50, devoluciones 15, neto 35 y Falta 15; exceso visible y sin segundo hecho. |
| CU-18 / P6 | Devolución de compra anterior o etiqueta/origen desconocidos | Entrada conservada; obligación actual intacta o cobertura pendiente; neto observado separado. |
| CU-19 / P4/P6 | Etiqueta Pendiente revisar, devolución Partida NULL y Fuera presupuesto | Etiqueta cuenta como Comida; estado de atribución no la asigna automáticamente; Fuera presupuesto no borra banco. |
| CU-20 / P6 | Transferencia de reposición reintentada/asignación duplicada y recuperación Anticipo | Mismo hecho una vez; asignación acreditada, sin doble descuento ni reposición ficticia. |
| CU-21 / P7 aprobado | Aplicar ejemplo completo con S0 100 y D 480 | Recursos 785, Falta 15, cierre analítico 580; puente −5, sin duplicar reposición/Anticipo/Comida. |
| CU-22 / P7 aprobado | Añadir devolución antigua 40 y B_A 250 | Recursos/Falta no cambian; cierre 620, banco 770, diferencia −150 explicada; sin ajustes. |
| CU-23 / P7 aprobado | Omitir S0, apertura, clasificación o cobertura; cruzar C | Disponibilidad por métrica y régimen; nunca cero implícito ni falso conciliado. |
| CU-24 / P7–P7a aprobados | Ciclo abierto con duración provisional acreditada, duración desconocida, corte vencido, corte anterior al Inicio y siguiente Inicio real | Ejemplo34/3/340/30=>equivalentes30/Margen0 Provisionales; 36>34=>No disponibles; desconocido/futuro inválido no inventa datos; al existir siguiente Inicio usar duración real y revalidar huella. Fin abierto siempre vacío. |

### Exclusiones y siguiente gate

Sin Excel/datos reales, migración retrospectiva individual, activación, despliegue o
merge. Sin Pockets/reservas globales, cambios de jerarquías, presupuesto anual ni
extensión del régimen a otras cuentas. No reanudar DEV18.
Siguiente gate: aprobar spec/wireframes completos revisión3; P3 y activación
siguen gate operativo separado. Después implementar por incrementos con testplan y
QA independiente; esta consolidación documental no declara el refactor completado.
