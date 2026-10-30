# Consulta de arquitectura: clasificación y planificación

Estado: **BORRADOR PARA REVISIÓN — no aprobado**. Fecha: 2026-10-30.
Autor del diagnóstico independiente: Codex; pendiente de contraste con Álex y decisión
expresa del usuario. Base documental: `454d21a` (main).

Este documento consolida dos borradores de la misma consulta: conserva el marco y la
recomendación gradual del primero y añade la evidencia de esquema, las alternativas
comparadas y los controles de histórico del segundo. No es una especificación, no aprueba
una alternativa y no autoriza implementación, migración ni merge.

## Alcance y autoridad

Solicitud: evaluar críticamente Categorías, Subcategorías, Partidas y Presupuestos,
sin defender decisiones anteriores por estar implementadas. El usuario solicita después
una PR draft para revisar el diagnóstico. Esta publicación no aprueba una alternativa,
no cambia reglas vigentes y no autoriza implementación, migración ni merge.

Este documento es una consulta comparativa, no una especificación nueva ni un ADR
aceptado. Las reglas vigentes siguen en sus specs propietarias. No modifica código,
esquema, planes, catálogo, roadmap ni tablero. No afecta a COMIDA-UNICO-01/SPEC16,
no reabre sus decisiones ni depende de su PR.

Fuentes internas contrastadas:

- [Clasificación, SPEC02](../02-clasificacion-specification.md).
- [Presupuestos, SPEC08](../08-presupuestos-specification.md).
- [Plan de ciclo, SPEC09](../09-plan-ciclo-specification.md).
- [Plan anual, SPEC10](../10-plan-anual-specification.md).
- [Referencia funcional](../functional-reference-v5.11.md).
- Esquema y código vigentes: `apps/api/src/schema-contracts.json`,
  `apps/api/src/planes-ciclo.ts`, `apps/api/src/plan-anual.ts`,
  `apps/api/src/movimiento-impact.ts`.

No se ha inspeccionado físicamente el Excel ni consultado datos financieros reales.
Las conclusiones evalúan coherencia conceptual; no demuestran qué niveles del catálogo
se utilizan realmente ni cuantifican el coste de implementación. El estado de entrega
se consulta en los checkpoints propietarios, no se infiere de cabeceras históricas.

## Resumen ejecutivo

No hay cuatro niveles. Hay **tres niveles de clasificación** (`Categoría →
Subcategoría → Partida`) y **un eje ortogonal de financiación** (`Presupuesto`)
que se ha convertido en la clave del plan mensual. La complejidad excesiva no
está en la profundidad del árbol: está en que el eje de financiación se presenta
como si fuera un cuarto nivel y en que el sistema tiene **dos unidades de
planificación sin un puente explícito**.

Diagnóstico en cinco frases:

1. `Presupuesto` no contiene presupuesto: es una regla de financiación
   (`fuente` + `saldo destino`). Los importes viven en otras tablas.
2. El plan anual se cuelga de la Partida; el mensual, del Presupuesto. No hay
   relación de datos entre ambos.
3. El fondo de un gasto histórico se deriva del vínculo **actual**
   `Partida → Presupuesto`; si cambia el catálogo, cambia la historia.
4. La restricción de destino único entre “Aportación a saldo” es un parche de
   atribución, no una ley económica.
5. Varios atributos de Categoría no tienen consumidor real y el `Esencial` está
   duplicado en dos planes con semánticas distintas.

Recomendación: **no fusionar Partida y Presupuesto en caliente**. Desde cero,
separaría clasificación, gasto previsto y objetivos de financiación. En el
sistema existente, evolucionaría gradualmente: vocabulario, evidencia, puente
explícito si se demuestra necesario y snapshot de financiación en el hecho,
sin reescribir la historia.

## Modelo observado

### Entidades y responsabilidades

| Entidad | Qué es hoy | Qué no es | Problema principal |
| --- | --- | --- | --- |
| Categoría | Nodo de taxonomía + política de Referencia + configuración de cálculo anual/mensual | No es un plan | `anual`/`mensual` sin consumidor; `grupo` sin uso |
| Subcategoría | Nodo de agrupación con nombre, padre y estado | No aporta semántica económica propia | Nivel heredado, coste de mantenimiento |
| Partida | Hoja de clasificación + enlace opcional a Presupuesto + enlace opcional a Deuda | No es un plan | Dos relaciones temporales modeladas como atributos estáticos |
| Presupuesto | Regla de financiación: fuente, destino, estado | No contiene importe ni planificación | Nombre engañoso; fuente heterogénea; destino obligatorio |
| Plan anual | Importe manual por Partida/ejercicio, periodo y Esencial | No financia | Sin vínculo explícito al plan mensual |
| Plan del ciclo | Base/Esencial/Del mes por Presupuesto/ciclo | No clasifica | Sujeto distinto; ejecución por fuente |

### La colisión de nombre “presupuesto”

La palabra se usa con cuatro significados distintos:

| Dónde | Qué significa |
| --- | --- |
| Tabla `presupuestos` | Maestro de financiación |
| `partidas.presupuesto` | FK al maestro |
| `cycle_plan_lines.presupuesto` | FK al maestro |
| `annual_plan_lines.presupuesto` | **Importe anual en céntimos**, no una FK |

Esto no es solo estética. Indica que el dominio mezcla la entidad que financia,
la relación que la asigna y el importe que se planifica. Cualquier lector nuevo
—o cualquier informe— tiene que conocer el contexto de la tabla para saber qué
significa el mismo nombre.

### Por qué existen dos planes

El plan anual responde “¿cuánto espero que cueste esto este año, por Partida?”.
El plan del ciclo responde “¿cuánto asigno este ciclo a este fondo y con qué
fuente?”. Son preguntas distintas.

Hay además una razón estructural: en `movimientos`, una `Transferencia` **no
puede llevar Partida** y un `Ingreso` **tampoco**. Por tanto, una provisión o
una aportación a saldo no puede planificarse sobre la Partida. Necesita otro
sujeto: el Presupuesto. Eso explica el diseño actual, pero no lo hace explícito.

## Diagnóstico

### H1 — No son cuatro niveles; son tres + un eje

`Categoría → Subcategoría → Partida` es una taxonomía. `Presupuesto` no es un
nivel jerárquico: es una regla de financiación. La confusión aparece al usarlo
como clave del plan mensual y al presentarlo como una cuarta entidad del mismo
tipo.

### H2 — “Presupuesto” no es un presupuesto

La tabla `presupuestos` guarda `id`, `nombre`, `fuente`, `destino`, `estado` y
metadatos. No tiene importe. Los importes están en `annual_plan_lines` y
`cycle_plan_lines`.

Además, `Presupuesto.fuente` mezcla tres comportamientos:

- `Gasto real`: ejecuta sumando Gastos por Partidas vinculadas.
- `Aportación a saldo`: ejecuta sumando Transferencias al destino.
- `No aplica`: no tiene ejecución comparable.

No es una propiedad de un fondo; es un discriminador de reglas de ejecución.

### H3 — Dos unidades de planificación sin puente explícito

- Anual: `(ejercicio, partida) → importe`.
- Mensual: `(ciclo, presupuesto) → base/esencial/del mes`.

No existe FK entre una línea anual y un fondo mensual. El único puente es la
cadena del Esencial: anual esencial /12 → Esencial del Presupuesto mensual
“Gastos anuales” → coste esencial global. Es una convención semántica, no una
relación de datos. El propio `spec10` prohíbe buscar por nombre y no autoriza
sincronización automática.

Consecuencia: el sistema no puede responder por ID “¿qué fondo cubre esta línea
anual?” ni “¿esta provisión está financiando este gasto anual?”.

### H4 — La historia se atribuye con el catálogo actual

`movimientos` solo guarda `partida`. La ejecución mensual deriva el Presupuesto
del vínculo actual:

```ts
relations.filter((p) => p.presupuesto === budget.id)
```

Si se cambia `Partida → Presupuesto`, los gastos pasados cambian de fondo. Lo
mismo ocurre con `Partida → Deuda`. La spec lo mitiga con preview de impacto y
motivo, pero el hecho no conserva la financiación que tenía en el momento de
ocurrir.

Para un sistema que prioriza integridad histórica, esto es una debilidad
estructural, no solo de experiencia de usuario.

### H5 — La restricción de destino único delata el problema

El índice `budget_contribution_destination` impide que dos Presupuestos de
fuente “Aportación a saldo” compartan Saldo destino. Es necesario porque la
ejecución de una Transferencia se atribuye por destino y el modelo no tiene otra
forma de repartirla.

Pero no es una ley económica: dos propósitos distintos en la misma cuenta de
ahorro son legítimos y hoy no se pueden representar. Es un parche de atribución.

### H6 — El plan mensual es un plan de caja, no un presupuesto de gastos

Incluye Gastos (`Gasto real`) y Transferencias (`Aportación a saldo`), pero no
Ingresos: un Ingreso no lleva Partida y no tiene fuente de presupuesto. Por
tanto, el “plan mensual” es una asignación de salidas, no un presupuesto
completo. Compararlo con el plan anual de gastos es comparar dos objetos
distintos.

### H7 — Atributos que no pagan su coste

- `Categoría.anual` y `Categoría.mensual`: se guardan y se muestran, pero no
  tienen consumidor runtime. `AC-26` de `spec02` lo declara expresamente.
- `Categoría.grupo`: texto libre sin consumidor.
- `Esencial`: está en la línea anual y en la línea del ciclo, con reglas
  distintas y una cadena convencional entre ambas.
- `Partida.presupuesto` y `Partida.deuda`: relaciones temporales modeladas como
  atributos estáticos.
- `Presupuesto.destino` en `Gasto real`: es obligatorio, pero la propia spec
  dice que no imputa; la imputación va por Partida. Es una relación de contexto
  que puede ser artificial.

## Respuestas a las preguntas planteadas

### Partida vs Presupuesto

No, pero tampoco son pares. Partida responde “¿para qué?”; Presupuesto responde
“¿con qué se financia?”. Son ejes distintos.

Se pueden unificar solo creando una **tercera entidad**: una línea planificable
con naturaleza (gasto, provisión, ingreso) y un fondo. Eso no es fusionar las dos
actuales; es sustituirlas como sujetos de planificación.

- **Ganarías:** una sola clave de plan, un solo ciclo de vida, financiación
  explícita en la línea e informes más simples.
- **Perderías:** la separación “para qué / con qué”, la bolsa compartida como
  objeto de primera clase (varias Partidas con un mismo techo mensual) y
  posiblemente IDs/contratos históricos.

En el sistema actual no lo haría. En un diseño desde cero, sí.

### Plan anual y mensual

No por decreto; deben compartir contrato y un puente explícito.

- El anual es un objetivo económico por Partida.
- El mensual es una asignación de caja por fondo.

Si se fuerzan en una sola tabla sin un discriminador, aparecen nulos y reglas
condicionales. Si se mantienen separados sin puente, aparecen dos verdades.

La solución intermedia es mantener ambos planes con sus claves naturales y
añadir, **solo si responde a una pregunta concreta y verificable**, una relación
de cobertura entre línea anual y fondo mensual (N:M, con reparto opcional). La
cobertura dice “este fondo cubre esta línea”, no “este importe es el mismo”. No
se copian importes automáticamente.

### Categorías y Subcategorías

Subcategoría no aporta semántica financiera: no tiene atributos propios, solo
nombre, padre y estado. Es un nodo de agrupación, navegación y unicidad.
Categoría es el único nivel con atributos reales.

Por tanto, la jerarquía efectiva es “Categoría → grupo → Partida”. En el sistema
actual no eliminaría Subcategoría: los IDs `SUBxxx`, los informes y el histórico
son contractuales. La congelaría: no añadir más atributos ni más niveles.

Desde cero usaría un árbol autorreferenciado o dos niveles + etiquetas, no tres
niveles fijos. Tres niveles solo si los informes los exigen de verdad.

### Atributos y responsabilidades

| Atributo | Dónde está | Dónde debería estar |
| --- | --- | --- |
| Cálculo anual/mensual | Categoría | Configuración de informes, no clasificación; hoy sin consumidor |
| Grupo | Categoría | Etiqueta descriptiva o eliminarse |
| Referencia obligatoria | Categoría | Política de validación; aceptable si es uniforme por categoría, pero es política, no taxonomía |
| Partida → Presupuesto | Partida | Asignación temporal o snapshot en el hecho |
| Partida → Deuda | Partida | Snapshot en el hecho o intervalo de vigencia |
| Fuente de ejecución | Presupuesto | Tipo de línea de plan o regla de ejecución |
| Esencial | Línea anual y línea de ciclo | Un único sitio canónico; si se encadena, con relación explícita |

### Casos difíciles

| Caso | Cómo lo resuelve hoy | Dónde duele |
| --- | --- | --- |
| **Provisiones** | Presupuesto con fuente “Aportación a saldo” y destino único; el plan mensual ejecuta Transferencias al destino; el Gasto posterior no vuelve a ejecutar | La provisión y el Gasto final no están vinculados. No se puede responder “¿qué provisión cubre qué Partida?” sin mirar nombres |
| **Gastos anuales financiados mensualmente** | Línea anual por Partida + Presupuesto de aportación; cadena del Esencial por convención | No hay vínculo explícito entre la línea anual y el fondo que la financia; el Esencial mensual se rellena a mano o por nombre |
| **Varias Partidas comparten financiación** | N Partidas → 1 Presupuesto; ejecución agregada por Presupuesto | No se puede repartir el objetivo mensual entre Partidas; el pool es todo o nada |
| **Gastos sin presupuesto** | `partida.presupuesto = NULL`; el Gasto es válido; aviso “sin planificar” | No distingue “no planificado” de “pendiente de asignar”; un gasto recurrente puede quedar invisible al control mensual |
| **Transferencias que financian saldos** | Transferencia sin Partida; Presupuesto de aportación; ejecución por destino; el Gasto posterior no duplica | El destino único impide dos propósitos en la misma cuenta; una Transferencia con Referencia no ejecuta; no se atribuye a Partida |
| **Deuda** | Partida → Deuda; cuota = Gasto; amortización extra = Amortización sin ejecución presupuestaria | La relación es estática en el catálogo; cambiarla está bloqueada; la deuda no se puede planificar como tal |

## Alternativas

| Alternativa | Ventajas | Inconvenientes | Coste relativo de migración |
| --- | --- | --- | --- |
| A. Conservar y aclarar | Menor riesgo; preserva contratos e identidades; admite provisiones y agrupaciones actuales | Mantiene dos unidades de planificación y un maestro con significados heterogéneos | Bajo para nombres/vistas; medio si cambian requisitos o relaciones |
| B. Unificar Partida y Presupuesto | Una unidad para registrar, planificar y consultar; sencilla en relaciones uno a uno | Financiación compartida y ahorro sin gasto requieren excepciones o nuevos agrupadores | Alto: varias Partidas por Presupuesto no tienen conversión directa |
| C. Separar clasificación, gasto previsto y financiación | Responsabilidades explícitas; clasificación común para gasto anual/ciclo; financiación agrupada sin reclasificar | Adaptación transversal y dos perspectivas de planificación que deben explicarse bien | Medio-alto, abordable por fases preservando hechos |

Los costes son relativos, no estimaciones de semanas. Requieren inventario de consumidores,
contratos, datos y validaciones antes de fijar un esfuerzo o calendario.

### A. Conservar el modelo actual con ajustes

Mantener Categoría/Subcategoría/Partida, maestro Presupuestos y planes actuales.
Distinguir en interfaz control de gasto y objetivo de aportación; separar ejecuciones
por magnitud y revisar vocabulario equívoco. No presentar destino como dinero reservado.

| Área | Impacto |
| --- | --- |
| Movimientos | Sin cambios estructurales; gasto por Partida y transferencias independientes |
| Planes | Se mantienen anual por Partida y ciclo por Presupuesto; explicitar su distinta finalidad |
| Saldos | Misma posición derivada de hechos; sin reservas nuevas |
| Informes | Mejor separación de gasto y aportaciones; evitar totales de ejecuciones heterogéneas |
| Histórico | Mínima transformación; conservar identidades y significado de cálculos previos |

Es la alternativa de menor riesgo inmediato. Reduce confusión, pero no elimina el
solapamiento estructural ni la necesidad de entender dos unidades de planificación.

### B. Unificar Partida y Presupuesto

Cada Partida tendría líneas de plan anual y por ciclo. La ausencia de planificación se
expresaría mediante ausencia de línea, sin impedir registrar gasto.

Funciona para supermercado, alquiler o suministros. Para un fondo común de seguro,
impuestos y mantenimiento, obliga a fusionar Partidas, repetir financiación o introducir
un agrupador. Fusionar pierde detalle; repetir duplica objetivos; introducir un agrupador
recupera la separación que se pretendía eliminar. El ahorro sin gasto tampoco debería
convertirse en una clasificación de gasto artificial.

| Área | Impacto |
| --- | --- |
| Movimientos | Conservar imputación a Partida si es posible; evitar reclasificar hechos para encajar financiación |
| Planes | Migrar planes de ciclo a la unidad unificada; resolver manualmente relaciones varias-a-una y objetivos sin gasto |
| Saldos | No precisan cambiar, pero asociar financiación a una Partida no acredita una reserva |
| Informes | Más sencillos en casos uno a uno; conciliación compleja para agrupaciones y aportaciones |
| Histórico | Mapping explícito y reconciliación; no repartir objetivos antiguos por porcentajes inventados |

No recomendada: simplifica el caso sencillo a costa de deformar los casos difíciles.

### C. Separar responsabilidades

| Concepto propuesto | Responsabilidad |
| --- | --- |
| Partida | Clasificación económica del gasto, con ID estable |
| Agrupaciones | Organizar y agregar Partidas sin imponer niveles vacíos |
| Línea de plan de gasto | Importe previsto para una Partida en un ejercicio o ciclo |
| Objetivo de financiación | Aportación prevista a un Saldo durante un periodo |
| Movimiento | Hecho real; única base operativa para gasto y transferencias, respetando fuentes históricas acreditadas |

No añadir un maestro Fondo separado del Saldo sin necesidad demostrada de reservas y
repartos internos. Tampoco imponer una relación permanente entre Partida y objetivo de
financiación: solo introducirla si responde a una pregunta concreta y verificable.

| Área | Impacto |
| --- | --- |
| Movimientos | Preservar Partidas, IDs, fechas e importes; transferencias conservan origen/destino y su naturaleza |
| Planes | Plan de gasto sobre Partidas; objetivos de aportación separados; migrar Presupuestos según fuente |
| Saldos | Posición derivada de hechos; objetivos no crean dinero ni exclusividad |
| Informes | Separar gasto previsto/real, aportación prevista/real y posición; nunca sumarlos como una sola magnitud |
| Histórico | Preservar interpretación anterior de planes/ejecuciones y procedencia; comparar resultados antes/después sin reescribir hechos |

Los Presupuestos de Gasto real que agrupen varias Partidas requieren una resolución
explícita: conservar su objetivo agregado o desglosarlo mediante decisión del usuario.
No distribuir importes automáticamente ni duplicar el total en cada Partida. Las líneas
No aplica deben conservar su importe y falta de comparabilidad hasta decidir su destino;
no convertirlas en cero ni asignarles una ejecución ficticia.

### Opción intermedia para el sistema existente

Antes de un rediseño completo, se puede conservar el modelo y añadir dos piezas
quirúrgicas, solo si se demuestra su necesidad:

1. **Cobertura explícita** entre línea anual y fondo/objetivo de financiación, con
   reparto opcional. Resolvería “¿qué aportación cubre este gasto anual?” sin
   depender de nombres.
2. **Snapshot de financiación en el hecho**: `fondo_id` y `deuda_id` en
   `movimientos`, con backfill y corte documentado. La historia dejaría de
   reinterpretarse cuando cambie el catálogo.

No es una cuarta alternativa cerrada ni una autorización. Es una fase posible
de C, y requiere reglas propias, análisis de impacto y migración aprobada. La
cobertura no debe imponer una relación permanente Partida–financiación ni
repartir importes automáticamente.

## Planificación anual y por ciclo

Compartiría Partida para planificar **gasto** anual y por ciclo. No obligaría a planificar
por Partida toda **financiación**.

Ejemplo ficticio: seguro anual 600 € y mantenimiento anual 600 €; objetivo de aportación
100 € por ciclo a un Saldo común. Los 1.200 € son gasto previsto; los 100 € son aportación
periódica. No son importes sumables entre sí. El número de ciclos financiados y los
vencimientos deben conocerse para afirmar que la financiación cubre el gasto.

Si existe desglose completo del mismo gasto por ciclos, el total anual puede derivarse de
él con una regla temporal explícita. Si solo se conoce el total anual, conservarlo sin
inventar calendario. No mantener dos importes independientes y editables para la misma
previsión. Un ciclo puede cruzar ejercicios: no atribuir automáticamente todo el gasto al
año del ciclo financiado. Los hechos conservan su fecha real y el anual su año natural.

No imponer financiación = anual/12: puede haber dinero previo, vencimientos cercanos o
ciclos distintos del mes natural. Compartir Saldo no prueba cuánto está reservado para
cada Partida. Una relación de cobertura, si se necesita, exige reglas propias aprobadas.

## Jerarquía y ubicación de atributos

Tres niveles obligatorios no tienen una necesidad económica demostrada. Pueden aportar
navegación e informes; su valor real requiere revisar el catálogo autorizado.
Desde cero: Partida como hoja, agrupaciones opcionales, un nivel visible por defecto y
un segundo cuando aporte información. Evitar árbol ilimitado y niveles artificiales.
En el sistema existente: conservar IDs y relaciones hasta comprobar redundancias.
Una Subcategoría con una sola Partida no es automáticamente inútil.

| Atributo | Responsabilidad propuesta para revisión |
| --- | --- |
| Cálculo anual/mensual | Métricas e informes, separando periodo y magnitud económica |
| Referencia obligatoria | Validación del caso/operación; agrupación como ámbito solo si todos los descendientes comparten la regla |
| Fuente de ejecución | Tipo explícito del objetivo: gasto, financiación o ausencia de comparabilidad |
| Saldo destino | Objetivo de financiación; en control de gasto, contexto opcional si aporta utilidad demostrable |
| Base, Esencial y Del mes | Decisiones del plan y periodo; no atributos del catálogo |

No eliminar Cálculo anual por ausencia de consumidor directo acreditado: eso no demuestra
que sea prescindible. Tampoco inventar un consumidor para justificarlo. Las magnitudes
bruto, coste propio y financiación requieren conservar las reglas de sus specs propietarias.
Si cambiar una validación obliga a mover una Partida de agrupación, clasificación y
comportamiento están excesivamente acoplados.

## Casos difíciles y controles que deben conservarse

- **Provisiones:** aportación como financiación y gasto como hecho económico distinto;
  una provisión doméstica no implica por sí sola una provisión contable.
- **Gastos anuales financiados por ciclo:** previsión de gasto separada de aportaciones;
  pagar después no vuelve a ejecutar el objetivo de aportación.
- **Varias Partidas con financiación común:** un objetivo de aportación al Saldo y gasto
  separado por Partida; sin reparto ficticio del dinero acumulado.
- **Gasto sin presupuesto:** Movimiento válido con Partida; ejecución visible sin crear
  línea ni objetivo cero automáticamente.
- **Transferencias:** redistribuyen dinero y pueden ejecutar financiación; no generan
  gasto. Mantener elegibilidad vigente hasta aprobar expresamente otra regla.
- **Saldo compartido:** posición conocida no equivale a reservas exclusivas. Necesitarlas
  sería una ampliación funcional, no una consecuencia de simplificar nombres.
- **Historia:** preservar null frente a cero, ausencia frente a No aplica, cobertura y
  procedencia; una migración no acredita importes desconocidos ni completa datos parciales.

## Recomendación y decisiones abiertas

**Desde cero elegiría C:** clasificación sencilla por Partida y agrupaciones opcionales,
plan de gasto anual y por ciclo sobre esas Partidas y objetivos de financiación separados
por Saldo. Evitaría el maestro universal que mezcla consumo y aportaciones.

**En el sistema existente evolucionaría gradualmente hacia C empezando por A:**

1. Distinguir gasto y financiación en vistas y contratos; revisar vocabulario.
2. Evaluar destino obligatorio de Gasto real y utilidad de cada vínculo Partida–Presupuesto.
3. Inventariar consumidores y datos; resolver objetivos agregados y No aplica sin repartos
   automáticos. Definir conservación y reconciliación histórica antes de migrar.
4. Si se demuestra necesario, añadir cobertura explícita y snapshot de financiación en el
   hecho, con reglas propias y corte de backfill documentado.
5. Simplificar jerarquía solo donde se demuestre redundancia y exista mapping aprobado.

No fusionar Partidas ni recalcular retrospectivamente el histórico para adaptarlo al
vocabulario. La arquitectura elegida debe reducir decisiones cotidianas y relaciones
artificiales, no solo el número de tablas.

### Puntos concretos para contrastar con Álex

1. ¿El negocio necesita **dos propósitos en un mismo Saldo destino**? Si sí, la
   unicidad de “Aportación a saldo” es una limitación y la cobertura debe admitir
   reparto explícito.
2. ¿El **Esencial anual** debe alimentar automáticamente el Esencial mensual, o
   son decisiones independientes? Si son independientes, la cadena actual es una
   convención peligrosa; si se alimentan, debe ser por relación explícita.
3. ¿La **atribución histórica** debe congelarse en el hecho? Para este análisis
   es un sí: es la diferencia entre conservar historia y reinterpretarla.
4. ¿La **bolsa compartida** es un objeto de negocio real o solo una agregación
   de informe? Si es lo segundo, C es viable antes; si es lo primero, hay que
   modelarla explícitamente.

Pendiente: contraste de Álex y decisión del usuario sobre alternativa y alcance.
Después, si se decide avanzar, los cambios deben especificarse en sus documentos
propietarios y obtener autorización separada de desarrollo. Esta PR no adopta C.

## Evidencia y límites

Evidencia consultada:

- `specs/02-clasificacion-specification.md`, incluido `AC-26`.
- `specs/08-presupuestos-specification.md`, reglas 1–5 y contrato de nombres.
- `specs/09-plan-ciclo-specification.md`, motor R3 y matriz de estados.
- `specs/10-plan-anual-specification.md`, ejecución anual y cadena del equivalente esencial.
- `apps/api/src/schema-contracts.json`: tablas `presupuestos`, `partidas`,
  `annual_plan_lines`, `cycle_plan_lines`, `movimientos` e índices.
- `apps/api/src/planes-ciclo.ts`, `plan-anual.ts` y `movimiento-impact.ts`.

Límites:

- No se ha inspeccionado el Excel físico ni se han usado datos financieros reales.
- No se ha ejecutado una migración ni una prueba de equivalencia.
- Las alternativas son hipótesis de arquitectura, no especificaciones aprobadas.
  Cualquier cambio requiere su propia spec, análisis de impacto y autorización.
- Este documento no reabre decisiones aprobadas de `spec02`, `spec08`, `spec09`
  ni `spec10`; identifica tensiones y propone líneas de contraste.

## Referencias

- [Clasificación](../02-clasificacion-specification.md)
- [Presupuestos](../08-presupuestos-specification.md)
- [Plan del ciclo](../09-plan-ciclo-specification.md)
- [Plan anual](../10-plan-anual-specification.md)
- [Referencia funcional](../functional-reference-v5.11.md)
- [Arquitectura](../guidelines/architecture.md)
