# 16 — E3.4 Revisión bancaria de Comida: Specification

Status: Aprobación documental del candidato y wireframes registrada el 2026-10-26;
cierre completo pendiente de PD-01 analítica, D-01-R y AC-25.
Approval source/date: usuario «los aprobamos», 2026-10-26, tras dictamen QA D1–D7
PASS sin defectos corregibles demostrables. Candidato aprobado: specification SHA-256
`a8a278d2dba9ed31a5e7b0606764991698b762c214997ff83b9bf386ee82e4d4`;
brainstorming SHA-256 `bb6397f438b7ed236d944c8fcfc591d061f011bb63291e2257508e350affb385`.
La aprobación cubre el contenido documental y los wireframes revisados con sus pendientes
explícitos; no resuelve representación, clasificación ni efecto analítico de PD-01,
no cierra D-01-R ni AC-25 y no declara equivalencia con v5.11(7).
Sin autorización de desarrollo, SQL, migración, despliegue ni merge.
Context and brainstorming: [16-revision-comida-brainstorming.md](16-revision-comida-brainstorming.md)
(propuestas rev1 derogadas conservadas en §2 y §9.4), [E3.4/E3.5](roadmap.md),
[R1/R3/R4/P6](functional-reference-v5.11.md),
[spec04](04-movimientos-specification.md), [spec05](05-transferencias-referencias-specification.md),
[spec07](07-ciclos-operacion-specification.md), [spec12](12-flujo-mensual-specification.md).

Next action: DETENIDA hasta disponer del contenido vigente de v5.11(7) y resolver PD-01.
No se abren nuevas rondas sobre D-01-R/v5.11(7); PD-01 es la única ronda breve pendiente.
No se cierra D-01-R.

### Dependencias DT2/DT7

- **DT2:** identidad/IDs, constraints, precisión monetaria, fechas, concurrencia,
  idempotencia y límites no documentados. Este DRAFT propone identidad numérica y EUR
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

1. Alta, consulta y rectificación auditada de operaciones bancarias de Revisión Comida.
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

### Límite D-01-R — vínculo opcional, no dependencia estructural

Procedencia: evidencia histórica v5.10; la estructura de v5.11(7) no ha sido inspeccionada.
La aplicabilidad de D-01-R a v5.11(7) sigue pendiente de contraste.

- Revisión Comida **no depende** de que cada operación tenga un Movimiento.
- Un detalle sin vínculo es un registro operativo válido; se muestra `Sin vínculo`, no
  como error ni como Gasto faltante.
- Un vínculo verificado es trazabilidad, no una asignación económica: no copia fecha ni
  importe, no cambia el Movimiento, no crea Gasto y no acota el importe del detalle.
- La propuesta D-01-R está pendiente de aprobación expresa y de contraste con v5.11(7).
  La specification no se considera completa ni aprobable hasta ambos pasos.

### Contraste pendiente de campos físicos v5.10

Este retorno se registra como evidencia histórica de v5.10, no como estructura vigente ni
como equivalencia con v5.11(7). AC-25 permanece pendiente para contrastar, al menos:

| Campo físico v5.10 | Evidencia histórica | Representación propuesta para la app | Estado |
| --- | --- | --- | --- |
| Clasificación `Reposición` | Clasificación física de reposición | Reposición como registro propio, separada de la clasificación de detalle | Pendiente; no equivalente |
| Importe firmado | Importe firmado en la tabla física | Importe positivo + `dirección` `Entrada`/`Salida` | Pendiente; no equivalente |
| `Estado` / `Referencia reposición` | Campos físicos de estado y referencia | `estadoRegistro` y trazabilidad a compensación | Pendiente; no equivalente |

No se convierten estos campos en reglas de app ni se cierra D-01-R. La línea documental se
detiene hasta disponer del contenido vigente de v5.11(7).

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
| ID | Identidad numérica estable, única, no reutilizable; independiente del ID de Movimiento; visible e inmutable |
| Fecha de operación | Fecha civil ISO de la operación bancaria real; propia; no se sustituye por la fecha de un Movimiento |
| Concepto | Texto libre de la operación; no es clasificador ni crea catálogo |
| Importe | EUR exacto en céntimos, serializado como string; estrictamente positivo; sin float ni redondeo |
| Dirección | `Salida` o `Entrada`, explícita; el signo se deriva; no se almacena un segundo signo contradictorio |
| Clasificación | Un valor exclusivo: `Comida`, `Pendiente revisar`, `Ocio`, `Niños`, `Otros` o `Fuera presupuesto`; la representación de una devolución de compra **no está decidida** |
| Representación de devolución | No decidida (PD-01); no se adopta `null`, `Pendiente PD-01` ni “no computa” por defecto ni una clasificación operativa nueva |
| Excepción histórica | Si un registro legacy tuviera ambas columnas informadas, se expone en lectura con clasificación y marca de fuera presupuesto, sin normalizar ni perder datos; no se permite en escrituras nuevas |
| Evidencia | Referencia de la operación/fuente bancaria; no se publican datos reales en el repositorio |
| Estado de evidencia | `Con evidencia` o `Sin evidencia`; sin evidencia no se presenta como verificada; reposición sin evidencia se rechaza |
| Cuenta/origen | Dato descriptivo de la operación; no crea un Saldo paralelo ni se usa para calcular posiciones |
| Vínculo | FK opcional a Movimiento; `estadoVinculo` `Verificado`, `Sin vínculo` o `Revisar`; sin reparto ni suma acotada |
| Cardinalidad | Excel: sin relación formal. App: cada operación apunta a 0..1 Movimiento; un Movimiento puede recibir 0..N operaciones referenciadas; no es una relación económica |
| Evidencia del vínculo | Motivo/documento que justifica la correspondencia; sin inferencia por fecha/importe/concepto |
| Estado | Vigente o Anulado lógico; sin DELETE físico; conserva historia y vínculo |
| Revisión/auditoría | `revision`, actor, UTC, motivo y antes/después; los metadatos UTC no son fecha financiera |
| Idempotencia | Clave de intento y payload; reintento no crea otra fila |

Reglas de clasificación:

- `Fuera presupuesto` es semánticamente exclusivo: no se combina con `Comida`, `Ocio`,
  `Niños`, `Otros` ni `Pendiente revisar` en escrituras nuevas.
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
- Varias operaciones pueden referenciar el mismo Movimiento si la evidencia lo justifica;
  una operación puede no referenciar ninguno. No hay obligación de que un Movimiento tenga
  operaciones ni de que una operación tenga Movimiento.
- El vínculo no reparte el importe del Movimiento ni acota el importe de la operación. No
  se valida una suma contra el hecho; esa restricción no representa el modelo histórico
  ni se asume para v5.11(7).
- Un vínculo verificado no copia fecha ni importe, no modifica el Movimiento, no crea
  Gasto y no cambia su efecto bancario central.
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
| `Detalle` | `Salida` | Válido; clasificación confirmada obligatoria |
| `Reposicion` | `Entrada` | Válido; evidencia y hecho real obligatorios |
| `Reposicion` | `Salida` | Rechazo |
| `Detalle` | `Entrada` | **Bloqueado PD-01:** la operación real se preserva; no se decide representación, clasificación ni efecto; no se adopta `null`/“no computa” por defecto |

Elegibilidad del vínculo:

| Tipo | Movimiento elegible | Límite |
| --- | --- | --- |
| `Detalle` | `Gasto` individual; agregado solo si D-01-R lo habilita | No `Ingreso`/`Transferencia` para una compra |
| `Reposicion` | `Transferencia` interna elegible o `Ingreso` existente cuyo Subtipo R2 y evidencia correspondan | No `Gasto`; no Subtipo nuevo; Transferencia con Exterior queda pendiente D5 |

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
| Hecho real | Operación bancaria real de `Entrada`; vínculo opcional verificado a `Ingreso`/`Transferencia` con evidencia; no se inventa un Movimiento |
| Fecha | Fecha civil de la operación bancaria real; no se sustituye por la de un Movimiento |
| Importe | EUR exacto positivo; `Entrada`; sin float ni redondeo |
| Evidencia | Referencia de la operación/fuente; obligatoria para una reposición real; no se publican datos reales |
| Trazabilidad | Referencia futura a la compensación si E3.5 la aporta y, si aplica, a las operaciones compensadas; E3.4 no acredita compensación por inferencia |
| Estado del registro | `Vigente` o `Anulada`; E3.4 no emite `Parcial` ni `Completada` |
| Estado de trazabilidad | `Asignada` o `Sin asignación`; no confundir con validez del registro |
| Cobertura de compensación | La determina E3.5; E3.4 solo muestra el dato si E3.5 lo aporta, sin calcularlo |
| Revisión/auditoría | `revision`, actor, UTC, motivo y antes/después; mismo ID en corrección |
| Vigencia | `Vigente` o `Anulada` lógica; una anulada no computa; sin DELETE y sin reutilizar ID |
| Idempotencia | Clave de intento y payload; reintento no crea otra reposición |
| Historia | Sin DELETE; una devolución de Anticipo no se convierte por inferencia en reposición de Comida |

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

Varias reposiciones pueden referenciar el mismo Movimiento si la evidencia lo justifica;
eso no las duplica ni crea un Movimiento ficticio. La duplicación se evalúa por identidad,
evidencia y reintento, no por reutilización del vínculo.

No toda `Entrada` es una Reposición. Las devoluciones de compra no se convierten por
inferencia en Reposición ni en subtipo de Ingreso; su tratamiento queda en PD-01.

### Fechas, referencia y cobertura histórica

- `fechaOperacion` es la fecha financiera de la operación y participa en la fuente
  `Revisión Comida` de la referencia central.
- La fuente devuelve `disponible` con la máxima fecha de operaciones vigentes con fecha
  válida, incluidas las `Sin vínculo`; la cobertura del vínculo se informa por separado.
  Devuelve `sin_referencia` si no hay operaciones vigentes, o `error` si el lector falla.
  Una operación anulada no participa. No usa reloj, `createdAt`, fecha de importación ni
  fecha de un Movimiento.
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

- La operación y la reposición conservan ID, fecha, importe, clasificación/vínculo,
  evidencia y auditoría; la anulación es lógica y no reutiliza identidad.
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
- ID, revisión, fecha de operación, concepto, importe, dirección y clasificación (si es
  detalle). La necesidad de informar tratamiento analítico pendiente se expresa como
  cobertura/motivo, sin crear un campo, estado ni clasificación nuevos.
- `fueraPresupuesto`/equivalente exclusivo e indicador de combinación histórica, si
  existiera.
- Vínculo opcional, estado `Verificado`/`Sin vínculo`/`Revisar`, evidencia y estado del
  Movimiento.
- Reposiciones registradas con ID, fecha, importe, evidencia, revisión, estado,
  vigencia y trazabilidad.
- Cobertura de la fuente (`disponible`/`sin_referencia`/`error`) y rango histórico real.

E3.5 sigue siendo responsable de asignar por ciclo, agregar, conciliar, calcular Recursos
comida, financiación, compensaciones y métricas de cierre. También determina `Parcial`,
`Completada`, `Falta por reponer` y la cobertura de reposición; E3.4 no emite esos
resultados. E3.5 debe distinguir la capa `Revisión Comida` de `Movimientos` y no sumar
ambas como hechos económicos independientes. E3.4 no expone esas cifras como resultado
propio.

Requisito de integración futura: si existen operaciones con tratamiento PD-01 pendiente,
E3.5 debe marcar cobertura incompleta y no presentar los totales afectados como completos.
No se decide aquí la fórmula ni el tratamiento de esas operaciones.

## Screens and interfaces

Wireframes propuestos; no aprobados. Reutilizan shell, tokens, tabla/tarjetas, foco y
mensajes existentes. No introducen otro tema ni librería.

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
├───────────────────────────────────────────────────────────────────────────────────┤
│ Revisión Comida: operaciones bancarias individuales.                              │
│ Movimientos: reconocimiento económico central. E3.5 concilia por ciclo.           │
│ No se suman ambas capas como hechos independientes.                                │
│ [Nueva operación] [Ver reposiciones]                                              │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### W2 — Ficha de operación, móvil 390

```text
┌ Revisión Comida · Operación 101 ───────────┐
│ Fecha operación  03/10/2026                │
│ Concepto         Supermercado              │
│ Importe          42,10 € · Salida          │
│ Clasificación    Comida                    │
│ Evidencia        Operación bancaria        │
│ Vínculo          Sin vínculo (normal)      │
│ Efecto           Operación bancaria        │
│ Reconocimiento   Movimientos: no vinculado │
│ Auditoría (UTC)  Rev. 3 · 24/10/2026 10:14│
│ [Editar] [Anular] [Vincular] [Volver]      │
└────────────────────────────────────────────┘
```

Si existe vínculo verificado, se muestra `Vínculo verificado: G-204` y su evidencia. No
se muestra “Completo x de y” ni una suma contra el Movimiento.

### W3 — Reposiciones y estados, móvil 390

```text
┌ Reposiciones · Ciclo 01/10 → 31/10/2026 ───┐
│ Registradas                                │
│ 105 · 12/10/2026 · 20,00 € · Entrada       │
│   Evidencia: operación bancaria E-08       │
│   Trazabilidad: C-02 (futuro E3.5) · Sin asignación│
│   Estado: Vigente · Rev. 2                 │
│   [Ver] [Editar] [Anular] [Vincular]       │
│                                            │
│ 106 · 20/10/2026 · 10,00 € · Entrada       │
│   Evidencia: operación bancaria E-09       │
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
│ │ Evidencia: operación bancaria        │
│ │ Vínculo: Sin vínculo                 │
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
│ Clasificación: Comida · Evidencia: operación bancaria · Estado: Vigente · Rev.3  │
│ Vínculo: Sin vínculo · Efecto: operación bancaria · Movimientos: no vinculado     │
│ Auditoría (UTC): 24/10/2026 10:14                                                  │
│ [Editar] [Anular] [Vincular] [Volver]                                              │
├────────────────────────────────────────────────────────────────────────────────────┤
│ REPOSICIONES                                                                      │
│ ID  | Fecha      | Importe  | Evidencia | Trazabilidad | Estado/Rev | Acciones    │
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
  y ficha, con filtros por fecha, clasificación, vínculo, fuera presupuesto y estado;
  `404` si el ID no existe.
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
- Clasificación desconocida o combinación `Fuera presupuesto` + otra clasificación:
  rechazo en escritura nueva; históricos conservados en lectura.
- Fecha inválida, no civil o futura según el límite vigente: rechazo; sin desplazamiento
  por zona horaria.
- Vínculo a Movimiento inexistente, no vigente o anulado: rechazo de vínculo nuevo; el
  vínculo histórico se conserva en `Revisar`; no se reasigna.
- Vínculo inferido por fecha/importe/concepto/Saldo: rechazo; se exige evidencia.
- Varias operaciones con el mismo Movimiento: permitido si hay evidencia; la cardinalidad
  técnica de la app es operación 0..1 / Movimiento 0..N referencias y no se reparte el
  importe. No se aplica ningún límite de importe ni suma acotada contra el Movimiento.
- Operación sin vínculo: válida; no es error ni cobertura incompleta.
- Reposición sin operación bancaria real, duplicada o sin evidencia: rechazo; no se crea
  un Movimiento ficticio. La reposición conserva ID, revisión, auditoría, vigencia e
  idempotencia; su anulación es lógica y no reutiliza ID.
- Toda `Entrada` no es Reposición: una devolución de compra no se clasifica por inferencia
  y queda en PD-01. No se crean subtipos de Ingreso ni se habilita Exterior/D5.
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

No hay una regla confirmada que convierta toda `Entrada` en Reposición. Una devolución de
compra no se clasifica por inferencia ni se modela como subtipo de Ingreso. La decisión se
separa en dos preguntas; **B, A y C son propuestas, no definiciones confirmadas**.

Concepto confirmado (2026-10-26):

- **Devolución:** reintegro total o parcial de una compra anterior.
- **Reposición:** aportación para restituir fondos, sin anular la compra.
- No son equivalentes por dirección, importe o fecha.
- Compra y devolución se conservan como operaciones independientes.
- Relacionarlas exige evidencia; no se exige coincidencia exacta de fecha o importe.
- No se acredita compensación por inferencia.

La operación bancaria real se conserva; no se crea una clasificación operativa nueva; no se
adopta `null` ni “no computa” por defecto; la clasificación y los efectos analíticos siguen
pendientes. Conservar el efecto bancario real no autoriza sumar el auxiliar a Saldos
centrales ni fabricar Movimientos individuales. La relación con la compra original requiere
evidencia y su estructura técnica no queda aprobada por esta aclaración.

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
automáticamente ni se descarta la operación**. No se decide todavía su clasificación ni su
efecto en E3.5. La formulación anterior de A/B/C excluyentes y la adopción implícita de C
quedan como historia y quedan sustituidas por esta precisión.

## Exclusions

No implementación, SQL/DDL/migración ejecutada, datos reales ni Excel. No se incluye:

- financiación, Recursos comida, agregación por ciclo, reconciliación, compensaciones,
  `Parcial`/`Completada`, Falta por reponer, conciliación de saldo inicial ni arrastre de
  saldo inicial (E3.5);
- creación de Ingresos/Gastos ficticios, saldo paralelo o segundo ledger económico;
- reparto técnico de Gastos centrales entre operaciones bancarias;
- vínculos inferidos por fecha, importe, concepto o Saldo;
- importación de extractos, conciliación bancaria automática o integración externa;
- nuevas Partidas/Categorías/Subcategorías/Referencias para clasificar Comida;
- subtipos nuevos de Ingreso, Exterior/D5 o tratamiento analítico no confirmado de
  devoluciones de compra (PD-01); la operación bancaria real se preserva;
- recálculos, estados o motores de E3.5/E4 presentados como instalados;
- cambios estructurales en Movimientos, Terminal o la representación bancaria;
- cierres, fotografías inmutables, congelación E4, bloqueo transversal de cierre;
- Base B, D5/Exterior, Vehículos, B3/Dev32, desarrollo, tests, deploy o merge.

## Acceptance checks

**Previstos, no ejecutados.** No autorizan desarrollo ni declaran PASS. `C` = condicional
a D-01-R o a la existencia de históricos con ambas columnas, según el AC; el resto queda
sujeto a la aprobación de esta specification.

Grupos para separar alcance:

| Grupo | AC | Verificable en dev16 |
| --- | --- | --- |
| E3.4 | AC-01–AC-03, AC-05–AC-09, AC-11, AC-13–AC-22, AC-24, AC-26, AC-28–AC-30, AC-32, AC-33, AC-35, AC-37 | Sí, cuando se autorice |
| Parcial PD-01 | AC-10 (solo `Detalle`+`Entrada`) | No hasta PD-01 |
| Integración/visualización E3.5 | AC-27, AC-34, AC-36 | No; contrato futuro |
| Condicional D-01-R | AC-04 | No hasta D-01-R |
| Histórico | AC-12, AC-31 | No; solo si existe evidencia |
| Documental | AC-23, AC-25 | No; gate de aprobación |

Solo el grupo E3.4 es verificable en la entrega E3.4. Los grupos futuros no se declaran
PASS ni se simulan.

| ID | Acción / precondiciones | Resultado observable esperado | Verificación prevista | Estado |
| --- | --- | --- | --- | --- |
| AC-01 | Guardar una operación bancaria de detalle con ID, fecha, concepto, importe, dirección, clasificación y evidencia | Se crea un ID estable; no se crea ni modifica ningún Movimiento; no aparece saldo paralelo | Bun/API/SQLite | Previsto |
| AC-02 | Guardar una operación sin Movimiento | Es válida, queda `Sin vínculo`; no suma a Movimientos/Saldos ni crea Gasto; sí forma parte de la cobertura de Revisión Comida y de la lectura de E3.5; no se inventa vínculo | Bun/API/UI | Previsto |
| AC-03 | Vincular una operación a un Movimiento con evidencia verificable, incluyendo varias operaciones al mismo Movimiento | Se guarda el vínculo como trazabilidad; no copia fecha/importe ni altera el Movimiento; una operación no apunta a varios Movimientos; no se infiere por fecha/importe/concepto | Bun/API/UI | Previsto |
| AC-04 | Vincular una operación a un Movimiento agregado de Terminal/financiación con evidencia | Se conserva como trazabilidad, sin reparto de importes ni suma acotada; no hay doble efecto ni Gasto nuevo | Bun/API/UI | C |
| AC-05 | Repetir el mismo alta o simular respuesta perdida | Un solo ID y una sola fila; la coincidencia legítima de dos operaciones iguales se advierte sin UNIQUE económica | Bun/API | Previsto |
| AC-06 | Operación con fecha distinta de la fecha del Movimiento vinculado | Se conserva y muestra la fecha de operación; no se sustituye por la del Movimiento | Bun/API/UI | Previsto |
| AC-07 | Consultar referencia con operación válida, con `Sin vínculo`, con reposición, sin registros y con lector fallido | Máximo válido de operaciones vigentes (incluidas `Sin vínculo`), `sin_referencia` y `error` diferenciados; anulada no participa; `tblCiclos` sigue siendo el único maestro temporal | Bun/API/UI | Previsto |
| AC-08 | Consultar un periodo anterior al primer registro y un periodo sin operaciones dentro del rango observado | «Sin cobertura histórica» frente a «Sin operaciones»; no se rellena con cero, no se extrapola y el rango observado no se presenta como cobertura completa | Bun/API/UI | Previsto |
| AC-09 | Introducir importe vacío, cero, negativo, float o tercer decimal | Rechazo; EUR exacto en céntimos y string; no se normaliza a cero | Bun/API | Previsto |
| AC-10 | Validar matriz tipo/dirección: `Detalle`+`Salida`, `Reposicion`+`Entrada`, `Reposicion`+`Salida`, `Detalle`+`Entrada` | Las dos primeras son válidas; `Reposicion`+`Salida` se rechaza; `Detalle`+`Entrada` queda **bloqueado PD-01**: se preserva la operación real, pero no se decide representación/clasificación/efecto ni se adopta `null`/“no computa”; no se invierte signo | Bun/API | Bloqueado PD-01 |
| AC-11 | Guardar `Fuera presupuesto` junto a `Comida`/`Ocio`/etc. | Rechazo en escritura nueva; la clasificación es exclusiva y conserva la restricción documentada en v5.10, con aplicabilidad a v5.11(7) pendiente | Bun/API | Previsto |
| AC-12 | Leer un histórico con ambas columnas informadas, si existiera | Se preservan ambos datos en lectura sin normalizar ni perder información; no se permite repetir la combinación | Bun/API/UI | C |
| AC-13 | Verificar en el contrato de lectura que `Ocio`+`Niños`+`Otros` son los únicos componentes de `Compensable` y que `Fuera presupuesto` no se incluye | El contrato no incluye `Fuera presupuesto` en Compensable y conserva su operación bancaria; el cálculo del agregado pertenece a E3.5 | Bun/API | Previsto |
| AC-14 | Registrar reposición con operación bancaria real y con/sin Movimiento vinculado; probar ausencia de operación y de evidencia | Sin operación bancaria real → rechazo; sin Movimiento → permitido `Sin vínculo`; sin evidencia → rechazo; con operación y evidencia → `Vigente`; `Sin asignación` si no hay compensación; E3.4 no emite `Parcial`/`Completada` | Bun/API/UI | Previsto |
| AC-15 | Intentar duplicar una reposición por mismo ID, misma operación real o misma evidencia/reintento | Una sola reposición y un solo ID; la reutilización de un Movimiento no es duplicado (AC-26); no se crea Movimiento ficticio | Bun/API | Previsto |
| AC-16 | Reclasificar una operación con revisión y motivo | Mismo ID, antes/después y auditoría; E3.4 no instala ni simula recálculo de E3.5/E4; snapshots inmutables no se modifican | Bun/API/UI | Previsto |
| AC-17 | Rectificar o anular el Movimiento vinculado | El vínculo conserva historia, pasa a `Revisar` y no se reasigna; la operación bancaria sigue siendo válida | Bun/API/UI | Previsto |
| AC-18 | Intentar borrar físicamente una operación o reposición | Rechazo; anulación lógica, historia y auditoría conservadas | Bun/API/SQLite | Previsto |
| AC-19 | Acceder sin MFA, mutar sin Origin/CSRF, enviar payload malformado/sobredimensionado o campos calculados no escribibles (payload derivado) | Rechazo con protecciones existentes; no se acepta un derivado como entrada; sin SQL, importes ni datos sensibles en logs | API | Previsto |
| AC-20 | Consultar 390/1440, teclado y estados vacío/carga/error/409/422 | Tabla/tarjetas legibles; capas `Revisión Comida` y `Movimientos` diferenciadas; sin importes ficticios ni «Completado» falso | Playwright/UI | Previsto |
| AC-21 | Reiniciar y restaurar una copia con operaciones y reposiciones | IDs, fechas, vínculos, auditoría, cobertura y referencia se conservan; intentos revocados no resucitan | Bun/API/SQLite | Previsto |
| AC-22 | Consultar cálculos propios de E3.4 | No calcula ni emite como propio Recursos, Gasto comida, Compensable, financiación, Falta por reponer, saldo inicial, arrastre, `Parcial` ni `Completada`; AC-27 permite visualizarlos atribuidos a E3.5; no promete motores futuros | API/UI | Previsto |
| AC-23 | Intentar aprobar cobertura completa sin aprobar D-01-R o sin contrastar v5.11(7) | La specification se declara incompleta; no se crean vínculos artificiales ni se asume cardinalidad | Documental/QA | Previsto |
| AC-24 | Enviar vínculo inexistente, no vigente, anulado, inferido o una revisión obsoleta | Rechazo/409 sin escritura parcial; el vínculo histórico válido se conserva en `Revisar` | Bun/API | Previsto |
| AC-25 | Contrastar la estructura física de v5.11(7) con la evidencia histórica v5.10, incluida la clasificación `Reposición`, el importe firmado y `Estado`/`Referencia reposición` | Se registra si se mantienen la ausencia de FK/cardinalidad y la aplicabilidad de D-01-R; se distingue cada campo físico de la representación app; si difiere, se actualiza el contrato; no se declara equivalencia ni se presenta v5.10 como vigente | Documental/QA | Pendiente |
| AC-26 | Vincular varias operaciones o reposiciones al mismo Movimiento con evidencia | Cada vínculo conserva su ID y su evidencia; no se considera duplicación ni reparto; no se crea Gasto ni se altera el Movimiento | Bun/API/UI | Previsto |
| AC-27 | Mostrar un estado `Parcial`/`Completada` aportado por E3.5, con operaciones PD-01 pendientes | Se muestra atribuido a E3.5, sin cálculo ni promesa de motor instalado; si E3.5 no está, no se simula; con PD-01 pendiente no se presentan totales afectados como completos | API/UI | Futuro E3.5 |
| AC-28 | Crear, rectificar y anular una reposición | ID estable, revisión/auditoría, anulación lógica que no computa, idempotencia y trazabilidad; sin DELETE ni reutilización de ID | Bun/API/SQLite | Previsto |
| AC-29 | Operar acciones responsive y errores en 390/1440 | Nueva/editar/anular/vincular/asignar/ver reposiciones con foco y teclado; estados vacío/carga/error/404/409/422/401; sin overflow ni datos ficticios | Playwright/UI | Previsto |
| AC-30 | Intentar reutilizar un ID de operación o reposición, o duplicar su identidad | ID estable y no reutilizable; el duplicado se rechaza o se resuelve por idempotencia; no se renumera el histórico | Bun/API/SQLite | Previsto |
| AC-31 | Leer históricos con clasificación física `Reposición`, importe firmado o `Estado`/`Referencia reposición` | Se preservan valores originales en lectura, sin normalizar ni descartar; no se declaran equivalentes; mapping en AC-25 | Bun/API/UI | C |
| AC-32 | Consultar operación antes del primer ciclo, en hueco, fuera del ciclo filtrado, en ciclo abierto y con cobertura parcial | `Sin ciclo asignable`, `Fuera de ciclo`, `Ciclo abierto` y `Cobertura parcial` diferenciados; no se inventa `Fin` ni se convierte ausencia en cero; spec07 | Bun/API/UI | Previsto |
| AC-33 | Vincular operación `Fuera presupuesto` a Gasto con Partida | La Partida/ejecución central no cambia; solo el análisis auxiliar la excluye; sin doble exclusión ni modificación silenciosa | Bun/API | Previsto |
| AC-34 | Consumir una reposición vinculada en E3.5 | Se cuenta una sola vez como reposición/trazabilidad; no se suma además como ingreso/recurso; E3.5 decide la capa | Futuro E3.5 | Futuro E3.5 |
| AC-35 | Vincular `Detalle`/`Reposicion` a un Movimiento no elegible o Exterior/D5 | Vínculo nuevo no elegible → rechazo; histórico en conflicto → `Revisar`; sin Movimiento elegible → `Sin vínculo`; no se crea Subtipo, no se habilita Exterior/D5 ni se infiere relación con la compra original sin evidencia; su estructura técnica no se asume | Bun/API | Previsto |
| AC-36 | Recalcular en E3.5 tras una reclasificación | E3.5, cuando exista, recalcula resultados vivos; E3.4 no lo simula; snapshots inmutables no se modifican | Futuro E3.5 | Futuro E3.5 |
| AC-37 | Guardar operación sin evidencia o con evidencia incompleta | Queda `Sin evidencia`, no se presenta como verificada; reposición sin evidencia se rechaza | Bun/API/UI | Previsto |

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
| DT2/DT7 e identidad histórica | AC-25, AC-30, AC-31 |
| Procedencia v5.10 vs v5.11(7) | AC-25 |

## Approval gate

El usuario aprobó el candidato documental y sus wireframes el 2026-10-26.
Los siguientes gates conservan los pendientes expresos del candidato aprobado:
D-01-R, PD-01 analítica y AC-25. No se acredita cierre completo ni preparación
para desarrollo. El concepto de devolución/reposición ya está confirmado; no se reabre.

1. Confirmar que Revisión Comida conserva operaciones bancarias propias sin dependencia
   estructural de Movimientos.
2. Confirmar la distinción Excel/app: Excel sin relación formal; app con FK opcional
   operación 0..1 Movimiento y Movimiento 0..N referencias, sin reparto económico.
3. Confirmar que el vínculo a Movimientos es opcional, solo verificado y sin reparto ni
   suma acotada.
4. Confirmar que no se crea saldo paralelo, segundo ledger económico ni Gasto adicional.
5. Confirmar que E3.5 es la capa de agregación/conciliación por ciclo, que determina
   `Parcial`/`Completada` y que no suma `Revisión Comida` y `Movimientos` como hechos
   independientes.
6. Contrastar la aplicabilidad de la evidencia histórica v5.10 a la estructura física de
   v5.11(7), incluida la clasificación `Reposición`, el importe firmado y
   `Estado`/`Referencia reposición`; no presentar v5.10 como estructura vigente confirmada
   ni declarar equivalencia.
7. PD-01: concepto confirmado. Queda pendiente definir representación, clasificación y
   efecto analítico, preservando la operación real, su evidencia y su histórico. No volver
   a pedir B, A o C ni convertir toda `Entrada` en Reposición.

La línea queda **detenida** hasta disponer del contenido vigente de v5.11(7) y de la
decisión PD-01. No se abren nuevas rondas documentales sobre la misma incertidumbre.

La aprobación de esta specification no autorizará desarrollo, SQL, cambios estructurales,
tests, push ni merge.
