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
