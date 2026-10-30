# Consulta de arquitectura: clasificación y planificación

Estado: **BORRADOR PARA REVISIÓN — no aprobado**. Fecha: 2026-10-30.
Autor del diagnóstico independiente: Codex; pendiente de contraste con Álex y decisión
expresa del usuario. Base documental: `454d21a` (main).

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

No se ha inspeccionado físicamente el Excel ni consultado datos financieros reales.
Las conclusiones evalúan coherencia conceptual; no demuestran qué niveles del catálogo
se utilizan realmente ni cuantifican el coste de implementación. El estado de entrega
se consulta en los checkpoints propietarios, no se infiere de cabeceras históricas.

## Diagnóstico independiente

Hay complejidad innecesaria, pero fusionar Partida y Presupuesto no resuelve su causa
principal. Clasificación económica y financiación son necesidades diferentes.

Partida responde a «¿en qué he gastado?» y debe existir aunque nunca se planifique ese
gasto. El actual Presupuesto mezcla objetivos distintos:

- **Gasto real:** controlar el gasto de un conjunto de Partidas.
- **Aportación a saldo:** controlar transferencias elegibles hacia un destino.
- **No aplica:** conservar planificación sin ejecución comparable.

Comparten un importe objetivo y un periodo, pero no la misma magnitud económica.
Presupuesto tampoco es un cuarto nivel de clasificación: es una agrupación transversal,
con relación opcional desde Partida y posibilidad de agrupar varias Partidas.

La diferencia anual/ciclo tiene una finalidad defendible: detallar obligaciones anuales
y financiar conjuntamente varias de ellas durante los ciclos. Lo cuestionable es hacer
que el horizonte temporal determine la entidad utilizada, en lugar de explicitar qué
se planifica: gasto o financiación.

Dos síntomas concretos merecen revisión:

1. SPEC08 exige destino para Gasto real, pero ese destino no determina su ejecución ni
   constituye reserva exclusiva. Su necesidad no se deduce del cálculo.
2. SPEC09 define «A transferir = Del mes» incluso para Gasto real. El nombre sugiere una
   acción bancaria que el importe y su fuente no implican.

Estas observaciones son propuestas de revisión, no correcciones autorizadas de las specs.

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
4. Simplificar jerarquía solo donde se demuestre redundancia y exista mapping aprobado.

No fusionar Partidas ni recalcular retrospectivamente el histórico para adaptarlo al
vocabulario. La arquitectura elegida debe reducir decisiones cotidianas y relaciones
artificiales, no solo el número de tablas.

Pendiente: contraste de Álex y decisión del usuario sobre alternativa y alcance.
Después, si se decide avanzar, los cambios deben especificarse en sus documentos
propietarios y obtener autorización separada de desarrollo. Esta PR no adopta C.
