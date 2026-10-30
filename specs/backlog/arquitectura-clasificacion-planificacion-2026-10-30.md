# Arquitectura de clasificación y planificación: revisión crítica

**Status: ANÁLISIS — NO APROBADO; NO AUTORIZA DESARROLLO, MIGRACIÓN NI CAMBIOS.**
Procedencia: consulta del usuario del 2026-10-30.
Base contrastada: `main` `454d21a8793265a44051034e926db8f139eb279c`.
Alcance: documento de análisis. No modifica código, esquema, SQL, datos, Excel,
roadmap, tablero ni especificaciones aprobadas. No abre una entrega ni sustituye
las decisiones de las specs propietarias.
Relación: tercera lectura de la auditoría del modelo financiero. Las PR draft
#131 y #132 se conservan como antecedentes; este documento se centra en
Categorías, Subcategorías, Partidas, Presupuestos y planes.

## 0. Resumen ejecutivo

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

Recomendación: **no fusionar Partida y Presupuesto en caliente**. Conservar las
identidades, pero separar los dos ejes y añadir un puente explícito de cobertura
y un snapshot de financiación en el hecho. Desde cero, sí rediseñaría hacia una
sola línea de planificación con ámbito (`anual | ciclo`), sujeto y fondo.

## 1. Modelo observado

### 1.1 Entidades y responsabilidades

| Entidad | Qué es hoy | Qué no es | Problema principal |
| --- | --- | --- | --- |
| Categoría | Nodo de taxonomía + política de Referencia + configuración de cálculo anual/mensual | No es un plan | `anual`/`mensual` sin consumidor; `grupo` sin uso |
| Subcategoría | Nodo de agrupación con nombre, padre y estado | No aporta semántica económica propia | Nivel heredado, coste de mantenimiento |
| Partida | Hoja de clasificación + enlace opcional a Presupuesto + enlace opcional a Deuda | No es un plan | Dos relaciones temporales modeladas como atributos estáticos |
| Presupuesto | Regla de financiación: fuente, destino, estado | No contiene importe ni planificación | Nombre engañoso; fuente heterogénea; destino obligatorio |
| Plan anual | Importe manual por Partida/ejercicio, periodo y Esencial | No financia | Sin vínculo explícito al plan mensual |
| Plan del ciclo | Base/Esencial/Del mes por Presupuesto/ciclo | No clasifica | Sujeto distinto; ejecución por fuente |

### 1.2 La colisión de nombre “presupuesto”

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

### 1.3 Por qué existen dos planes

El plan anual responde “¿cuánto espero que cueste esto este año, por Partida?”.
El plan del ciclo responde “¿cuánto asigno este ciclo a este fondo y con qué
fuente?”. Son preguntas distintas.

Hay además una razón estructural: en `movimientos`, una `Transferencia` **no
puede llevar Partida** y un `Ingreso` **tampoco**. Por tanto, una provisión o
una aportación a saldo no puede planificarse sobre la Partida. Necesita otro
sujeto: el Presupuesto. Eso explica el diseño actual, pero no lo hace explícito.

## 2. Hallazgos

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

## 3. Respuestas a las preguntas planteadas

### 3.1 ¿Partida y Presupuesto son la misma entidad?

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

### 3.2 ¿Plan anual y mensual deben compartir la misma unidad?

No por decreto; deben compartir contrato y un puente explícito.

- El anual es un objetivo económico por Partida.
- El mensual es una asignación de caja por fondo.

Si se fuerzan en una sola tabla sin un discriminador, aparecen nulos y reglas
condicionales. Si se mantienen separados sin puente, aparecen dos verdades.

La solución intermedia es mantener ambos planes con sus claves naturales y
añadir una relación de **cobertura** entre línea anual y fondo mensual (N:M, con
reparto opcional). La cobertura dice “este fondo cubre esta línea”, no “este
importe es el mismo”. No se copian importes automáticamente.

### 3.3 ¿Categorías y Subcategorías aportan valor?

Subcategoría no aporta semántica financiera: no tiene atributos propios, solo
nombre, padre y estado. Es un nodo de agrupación, navegación y unicidad.
Categoría es el único nivel con atributos reales.

Por tanto, la jerarquía efectiva es “Categoría → grupo → Partida”. En el sistema
actual no eliminaría Subcategoría: los IDs `SUBxxx`, los informes y el histórico
son contractuales. La congelaría: no añadir más atributos ni más niveles.

Desde cero usaría un árbol autorreferenciado o dos niveles + etiquetas, no tres
niveles fijos. Tres niveles solo si los informes los exigen de verdad.

### 3.4 ¿Hay atributos en la entidad equivocada?

Sí:

| Atributo | Dónde está | Dónde debería estar |
| --- | --- | --- |
| Cálculo anual/mensual | Categoría | Configuración de informes, no clasificación; hoy sin consumidor |
| Grupo | Categoría | Etiqueta descriptiva o eliminarse |
| Referencia obligatoria | Categoría | Política de validación; aceptable si es uniforme por categoría, pero es política, no taxonomía |
| Partida → Presupuesto | Partida | Asignación temporal o snapshot en el hecho |
| Partida → Deuda | Partida | Snapshot en el hecho o intervalo de vigencia |
| Fuente de ejecución | Presupuesto | Tipo de línea de plan o regla de ejecución |
| Esencial | Línea anual y línea de ciclo | Un único sitio canónico; si se encadena, con relación explícita |

### 3.5 Casos difíciles

| Caso | Cómo lo resuelve hoy | Dónde duele |
| --- | --- | --- |
| **Provisiones** | Presupuesto con fuente “Aportación a saldo” y destino único; el plan mensual ejecuta Transferencias al destino; el Gasto posterior no vuelve a ejecutar | La provisión y el Gasto final no están vinculados. No se puede responder “¿qué provisión cubre qué Partida?” sin mirar nombres |
| **Gastos anuales financiados mensualmente** | Línea anual por Partida + Presupuesto de aportación; cadena del Esencial por convención | No hay vínculo explícito entre la línea anual y el fondo que la financia; el Esencial mensual se rellena a mano o por nombre |
| **Varias Partidas comparten financiación** | N Partidas → 1 Presupuesto; ejecución agregada por Presupuesto | No se puede repartir el objetivo mensual entre Partidas; el pool es todo o nada |
| **Gastos sin presupuesto** | `partida.presupuesto = NULL`; el Gasto es válido; aviso “sin planificar” | No distingue “no planificado” de “pendiente de asignar”; un gasto recurrente puede quedar invisible al control mensual |
| **Transferencias que financian saldos** | Transferencia sin Partida; Presupuesto de aportación; ejecución por destino; el Gasto posterior no duplica | El destino único impide dos propósitos en la misma cuenta; una Transferencia con Referencia no ejecuta; no se atribuye a Partida |
| **Deuda** | Partida → Deuda; cuota = Gasto; amortización extra = Amortización sin ejecución presupuestaria | La relación es estática en el catálogo; cambiarla está bloqueada; la deuda no se puede planificar como tal |

## 4. Alternativas

### A. Conservar el modelo actual, con higiene

Mantener CAT/SUB/PAR/PRE, los dos planes y las dos claves. Solo renombrar en UI,
documentar los dos ejes, retirar atributos muertos y aceptar las limitaciones.

**Ventajas**

- Cero migración conceptual; conserva IDs, Excel, contratos y pruebas.
- Riesgo mínimo y coste inmediato casi nulo.
- No bloquea los frentes en curso.

**Inconvenientes**

- Mantiene el puente implícito y la atribución histórica retroactiva.
- Mantiene la restricción de destino único como parche.
- El “Presupuesto” sigue siendo una entidad mal nombrada y sobrecargada.
- Los informes que crucen anual y mensual seguirán dependiendo de convenciones.

**Impacto**

- Movimientos: ninguno.
- Planes: ninguno.
- Saldos: ninguno.
- Informes: ninguno; siguen igual de frágiles en el cruce anual/mensual.
- Histórico: se conserva, pero se sigue reinterpretando con el catálogo actual.

**Coste:** bajo. Una entrega documental/técnica menor; como mucho una migración
aditiva.

**Cuándo:** si la prioridad es entregar y el dolor actual es tolerable. No lo
elegiría como arquitectura objetivo.

### B. Simplificar sin romper identidades: dos ejes y un puente explícito

Conservar CAT/SUB/PAR y la tabla `presupuestos` con sus IDs, pero:

1. Renombrar el concepto `Presupuesto` a **Fondo / Bolsa de financiación** en
   dominio y UI. La tabla y los IDs no cambian.
2. Añadir una relación explícita de **cobertura** entre línea anual y fondo
   (N:M, con reparto opcional).
3. Guardar en `movimientos` un **snapshot** de `fondo_id` y `deuda_id` en el
   momento del hecho. La relación `Partida → Fondo/Deuda` queda como valor por
   defecto para nuevos hechos, no como fuente de verdad histórica.
4. Un único `Esencial` canónico; si el anual alimenta el mensual, que sea por
   relación explícita, no por nombre.
5. Retirar `Categoría.anual/mensual` y `Grupo` si no tienen consumidor; si se
   quedan, definir su consumidor en la misma entrega.

**Ventajas**

- Resuelve los tres problemas reales: puente anual/mensual, atribución
  histórica y casos de provisión.
- Conserva IDs, Excel, informes existentes y el modelo de saldos.
- Es incremental: no obliga a un big-bang ni a reescribir todos los motores.
- Permite responder por ID: “esta línea anual está cubierta por este fondo”,
  “este gasto se financió con este fondo”.

**Inconvenientes**

- Sigue habiendo dos tablas de plan y dos claves.
- Añade una tabla de cobertura y columnas de snapshot; más validación en
  escritura.
- Duplica parcialmente la financiación (catálogo + hecho), aunque con semántica
  distinta: valor por defecto vs. hecho consumado.
- El backfill de movimientos antiguos exige una decisión de corte y documentarla.

**Impacto**

- Movimientos: columnas nuevas y backfill; la ejecución pasa a leer el snapshot.
  Los hechos antiguos se congelan con el vínculo vigente en la migración.
- Planes: la línea anual gana cobertura; la línea mensual sigue por fondo. No se
  copian importes.
- Saldos: sin cambios; las Transferencias siguen siendo Transferencias.
- Informes: los actuales siguen funcionando; se pueden añadir cruces por
  cobertura.
- Histórico: se conserva y deja de reinterpretarse; el corte de backfill queda
  explícito.

**Coste:** medio-alto. Una o dos migraciones, cambios en `planes-ciclo`,
`plan-anual`, `movimientos`, `movement-impact`, impacto de clasificación,
informes, backup y contrato estricto. Orden de magnitud: 3–5 entregas con
regresión completa. No es un cambio de una tarde.

**Cuándo:** es la opción que elegiría para el sistema existente.

### C. Rediseñar: dos ejes y una sola línea de plan

Modelo nuevo con tres piezas:

1. **Clasificación:** árbol autorreferenciado (2–3 niveles) o dos niveles +
   etiquetas. Sin `Subcategoría` como entidad obligatoria.
2. **Fondo:** catálogo pequeño de fuente/destino (gasto, transferencia, deuda,
   etc.). Sin maestro “Presupuesto” con plan propio.
3. **PlanLine:** una sola tabla con `scope` (`anual | ciclo`), `subject`
   (Partida), `fund`, `kind` (gasto, provisión, ingreso) e importes. Los hechos
   guardan `partida_id` y `fund_id` como snapshot.

**Ventajas**

- Una sola unidad de planificación; el puente anual/mensual es una propiedad de
  la línea, no una convención.
- Elimina el cuarto nivel artificial y el nombre equívoco.
- La financiación y la atribución histórica quedan explícitas por diseño.
- Informes y coberturas se simplifican.

**Inconvenientes**

- Rompe IDs/contratos de `PRE` y probablemente de `SUB`.
- Obliga a reescribir los dos motores de plan, impacto, informes, flujo, deuda,
  vehículos, compartidos y backup.
- La “bolsa compartida” deja de ser una entidad y hay que modelarla como fondo
  o línea padre.
- Las provisiones necesitan un `kind` y reglas de ejecución propias.
- Riesgo alto de regresión y de cambiar semántica histórica.

**Impacto**

- Movimientos: FK/snapshot de fondo y backfill; el resto del ledger no cambia.
- Planes: se sustituyen las dos tablas por una; reescritura completa.
- Saldos: sin cambios.
- Informes: reescritura de los que consumen planes.
- Histórico: se puede mapear, pero la semántica de atribución cambia; requiere
  conciliación y periodo de doble lectura.

**Coste:** alto. Nueva versión de esquema, migración de CAT/SUB/PAR/PRE,
reescritura de motores y UI, conciliación. Orden de magnitud: 8–12 entregas. No
lo haría ahora.

**Cuándo:** si se hiciera un rediseño integral o si el modelo actual bloqueara
funciones clave. Es la respuesta correcta a “si diseñara MyFinanzas hoy desde
cero”, no a “qué cambio mañana”.

## 5. Comparación rápida

| Criterio | A. Conservar | B. Simplificar | C. Rediseñar |
| --- | --- | --- | --- |
| Unidad de planificación | 2 claves | 2 claves + puente | 1 clave con `scope` |
| Vínculo anual ↔ mensual | Implícito | Explícito | Inherente a la línea |
| Atribución histórica | Catálogo actual | Snapshot en el hecho | Snapshot en el hecho |
| Conserva IDs/Excel | Total | Total | Parcial |
| Complejidad conceptual | Alta | Media | Baja |
| Coste | Bajo | Medio-alto | Alto |
| Riesgo | Bajo | Medio | Alto |

## 6. Recomendación

### 6.1 Si se diseñara MyFinanzas hoy desde cero

Elegiría **C**, con una precisión: no eliminaría la Subcategoría por moda;
usaría un árbol autorreferenciado y etiquetas, y mantendría tres niveles solo si
los informes lo exigieran. La pieza central sería una sola `PlanLine` con
`scope`, `subject`, `fund` y `kind`, y los hechos llevarían `partida_id` +
`fund_id` como snapshot. No habría un maestro “Presupuesto” con plan propio;
habría un catálogo de fondos y una línea de plan.

### 6.2 Qué cambiaría realmente en el sistema existente

**B, no C.** Y en este orden:

1. **Puente explícito:** relación de cobertura línea anual ↔ fondo, con reparto
   opcional. Resuelve provisiones, gastos anuales financiados mensualmente y
   varias Partidas compartiendo financiación.
2. **Snapshot en el hecho:** `fondo_id` y `deuda_id` en `movimientos`, con
   backfill y corte documentado. La historia deja de depender del catálogo
   actual.
3. **Limpieza de atributos:** retirar `Categoría.anual/mensual` y `Grupo` si no
   tienen consumidor; un único `Esencial` canónico.
4. **Renombrado conceptual:** `Presupuesto` → `Fondo/Bolsa` en dominio y UI. Sin
   cambiar IDs ni tablas.
5. **Congelar la taxonomía:** no añadir niveles ni atributos a CAT/SUB/PAR hasta
   que el puente esté estable.
6. **No añadir más fuentes al enum:** los casos nuevos se modelan como fondos o
   tipos de línea, no como valores de `fuente`.

### 6.3 Lo que no haría

- Fusionar Partida y Presupuesto en caliente: perderías la bolsa compartida y
  abrirías un frente de migración enorme.
- Añadir un cuarto nivel o más atributos a Categoría para “ordenar” el problema.
- Usar nombres como claves (“Gastos anuales”, “Ahorro”) para conectar plan anual
  y mensual.
- Derivar la financiación histórica del vínculo actual del catálogo.
- Convertir el snapshot en una segunda verdad: el snapshot es el hecho; el
  vínculo del catálogo es el valor por defecto para hechos nuevos.

## 7. Puntos concretos para contrastar con Álex

1. ¿El negocio necesita **dos propósitos en un mismo Saldo destino**? Si sí, la
   unicidad de “Aportación a saldo” es una limitación y B debe relajarla con
   reparto explícito.
2. ¿El **Esencial anual** debe alimentar automáticamente el Esencial mensual, o
   son decisiones independientes? Si son independientes, la cadena actual es una
   convención peligrosa; si se alimentan, debe ser por relación explícita.
3. ¿La **atribución histórica** debe congelarse en el hecho? Para este análisis
   es un sí: es la diferencia entre conservar historia y reinterpretarla.
4. ¿La **bolsa compartida** es un objeto de negocio real o solo una agregación
   de informe? Si es lo segundo, C es viable antes; si es lo primero, B es el
   camino.

## 8. Evidencia y límites

Evidencia consultada:

- `specs/02-clasificacion-specification.md`, incluido `AC-26`.
- `specs/08-presupuestos-specification.md`, reglas 1–5 y contrato de nombres.
- `specs/09-plan-ciclo-specification.md`, motor R3 y matriz de estados.
- `specs/10-plan-anual-specification.md`, ejecución anual y cadena del
  equivalente esencial.
- `apps/api/src/schema-contracts.json`: tablas `presupuestos`, `partidas`,
  `annual_plan_lines`, `cycle_plan_lines`, `movimientos` e índices.
- `apps/api/src/planes-ciclo.ts`, `plan-anual.ts` y `movimiento-impact.ts`.

Límites:

- No se ha inspeccionado el Excel físico ni se han usado datos financieros
  reales.
- No se ha ejecutado una migración ni una prueba de equivalencia.
- Las alternativas son hipótesis de arquitectura, no especificaciones
  aprobadas. Cualquier cambio requiere su propia spec, análisis de impacto y
  autorización.
- Este documento no reabre decisiones aprobadas de `spec02`, `spec08`, `spec09`
  ni `spec10`; identifica tensiones y propone líneas de contraste.

## 9. Referencias

- [Clasificación](../02-clasificacion-specification.md)
- [Presupuestos](../08-presupuestos-specification.md)
- [Plan del ciclo](../09-plan-ciclo-specification.md)
- [Plan anual](../10-plan-anual-specification.md)
- [Referencia funcional](../functional-reference-v5.11.md)
- [Arquitectura](../guidelines/architecture.md)
