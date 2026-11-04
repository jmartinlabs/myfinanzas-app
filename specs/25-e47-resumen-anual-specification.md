# 25 — E4.7 Resumen anual y flujo completo trazable: Specification

Status: **DRAFT — no aprobada; no autoriza DEV25, merges, datos reales ni migración.**
No hay aprobación formal del usuario ni del coordinador. Ningún AC está en PASS; E4.7-AC3
solo alcanza cumplimiento parcial. Este documento no implementa código, API, SQLite, DDL,
migración, snapshots ni tablas nuevas.

Approval source/date: **ninguna aprobación formal**. El dictamen funcional de Álex
(relay 0142, 2026-11-04) es favorable a M-A / Z-A / F-A / N-A con precisiones, pero es una
**recomendación funcional**: no equivale a aprobación de DT8 ni de esta spec, y no autoriza
DEV25, merge ni datos reales. El paquete `E4.7 · SPEC` solo autoriza redactar esta
especificación y su testplan.
Context and sources:
[inventario anual E4.7 2026-11-03/2026-11-04](investigations/e47-annual-inventory-2026-11-03.md),
[roadmap E4.7](roadmap.md),
[SPEC10/E2.4](10-plan-anual-specification.md),
[SPEC12/E2.6](12-flujo-mensual-specification.md),
[SPEC21/E3.6](21-pendientes-conciliacion-specification.md),
[SPEC23/E4.3](23-e43-valoracion-resultados-specification.md),
[SPEC24/E4.6](24-e46-resumen-inicio-specification.md),
[SPEC27/E4.9](27-e49-cierre-financiero-specification.md),
[SPEC20/E4.5](20-historico-precontrol-specification.md),
[dictamen funcional de Álex, relay 0142](https://github.com/jmartinlabs/myfinanzas-app/commit/6af0df5),
[arquitectura](guidelines/architecture.md), [UI](guidelines/ui.md),
[calidad](guidelines/quality.md) y [seguridad](guidelines/security.md).
Base de contenido: `main` `b3f4ed9` (2026-11-04), esquema SQLite vigente en esa base.
Rama documental: `docs/e47-candidate`, base `main` `b3f4ed9`; esta spec no reaudita el
contenido de otras ramas, no reabre ninguna spec aprobada y no cambia el alcance de ninguna
entrega.
Test design: [25-e47-resumen-anual-testplan.md](25-e47-resumen-anual-testplan.md).

**Leyenda.** `[CONFIRMADO]` = regla ya aprobada o hecho verificado en el código/documento
citado. `[PROPUESTA]` = criterio técnico candidato de esta spec, no aprobado. `[PENDIENTE]` =
decisión del usuario, de Álex o dependencia externa. `[DICTAMEN ÁLEX — recomendación, no
aprobación]` = opinión funcional registrada en el relay 0142; no es aprobación de DT8 ni de la
spec. La recomendación de DT8 es una `[PROPUESTA]` y **no** una decisión.

## Functionality

E4.7 ofrece una vista **de solo lectura** del ejercicio natural que compone, sin recalcular,
lo que ya publican los motores propietarios: plan anual, previsión (si existe contrato
consumible), realidad por Ciclo, archivo histórico E4.5, márgenes E2.6 y, solo si el alcance
lo incluye, contexto patrimonial E4.3/E4.4 al corte.

La vista responde a cuatro preguntas separadas:

1. **Plan:** qué se presupuestó por Partida y ejercicio, con su ejecución y cobertura.
2. **Previsión:** qué simulación existe, sin convertirla en hecho ni en realidad anual.
3. **Realidad:** qué métricas publica E2.6 por Ciclo y qué ajuste publica E3.6, sin agregar
   un año natural que ningún motor certifica.
4. **Archivo:** qué histórico de Gastos publica E4.5 por ejercicio/Partida, con su cobertura,
   sin sumarlo al Ciclo ni al plan mensual.

E4.7 **no produce un total anual**. Su contrato no tiene `totalAnual`; cualquier importe es
`valor` o `subtotal` del motor propietario, con `estado`, `cobertura`, `fuente`, `ids` y
`contexto`. La vista puede rotularse «Resumen anual» porque el **ejercicio** organiza la
consulta, no porque exista una cifra anual certificada.

### Incluye

- Selección de ejercicio natural y declaración del corte, la referencia y la cobertura.
- Carriles separados de plan, previsión, realidad y archivo.
- Lectura de `margenEstructural` y `margen frente a nómina real` de E2.6, por Ciclo, con
  etiqueta inequívoca de **márgenes del plan** y cobertura; no son ahorro ejecutado. Los
  márgenes sin definición aprobada se publican `No disponible`.
- Lectura del ajuste `G_n`/`S_aj` de E3.6 en su propio bloque, sin fusionarlo con E2.6.
- Enlaces de trazabilidad a cada motor/ficha por ID, sin importes en la URL.
- Estado explícito «cálculo vivo, sin foto» mientras no exista E4.9/E4.11 consumible.

### No incluye

- Cálculo de plan, flujo, márgenes, archivo, valoración, deuda, pendientes o patrimonio.
- Un motor de suma anual, una tabla de resultados anuales, snapshots, cachés persistidas ni
  migración.
- Cierre financiero, foto, precierre, reapertura o certificación de un ejercicio (E4.8–E4.11).
- Comparación interanual (año contra año), variaciones interanuales o series históricas no
  publicadas.
- Ingresos históricos: E4.5 solo cubre Gastos (Q2=A); E4.7 no los reconstruye.
- Patrimonio global, patrimonio neto o suma de valoración + deuda + flujo.
- Fórmulas nuevas de «margen medio», «margen real puntual» o cualquier ratio anual.
- Exportación CSV/PDF o informe oficial en el primer DEV mientras D8-F no lo autorice.

## Frontera y autoridad

`[PROPUESTA]` E4.7 **compone y enlaza**, no reimplementa. Cada magnitud tiene un único
motor propietario; E4.7 conserva su estado, motivo y cobertura.

| Ámbito | Autoridad | Papel de E4.7 |
| --- | --- | --- |
| Ejercicio, Ciclo, corte y referencia | E1.3 / `ciclos.cycleContext`, `cycleMaster` | Consume fechas y corte; no elige por reloj ni reasigna hechos |
| Plan anual, Presupuesto, Esencial, Ejecutado y cobertura | E2.4 / `annualEquivalent`, `annualExecution` | Lee `total`, `estadoTotal`, `estadoCobertura`, `alcanceTotal`, `subtotalConocido`, `corte`, `motivo`; no suma Partidas |
| Flujo del Ciclo, `S`, `margenReal`, `margenEstructural` | E2.6 / `monthlyFlow` | Lee métricas y cobertura; no recompone Gasto, Ingresos ni márgenes |
| `G_n`, `S_aj`, pendientes y conciliación | E3.6 / read model de pendientes | Lee `G_n` y `S_aj` por Ciclo; no crea un Neto paralelo ni un total monetario |
| Archivo histórico de Gastos, combinación y cobertura | E4.5 / combinador | Lee por ejercicio/Partida; no recombina archivo+detalle ni deduce cobertura |
| Valoración y resultado de posiciones | E4.3 | Solo contexto al corte si el alcance lo incluye; no calcula ni suma patrimonio |
| Deuda viva | E4.4 | Solo contexto patrimonial separado; no la resta del flujo |
| Previsión de nómina | E2.5 | Solo simulación; no crea hechos ni se suma como año |
| Cierre y foto | E4.9 / E4.11 | Fuera de esta entrega; E4.7 no certifica un año ni simula una foto |
| Resumen de inicio y ciclo actual | E4.6 | Consumidor distinto; E4.7 no acopla su DTO/UI ni usa `mesFinanciado` como año del hecho |

### Regla de una magnitud, un motor

`[PROPUESTA]` La vista no publica una segunda cifra para la misma magnitud. Si el motor
propietario no publica `valor`, E4.7 no lo fabrica; si publica `subtotal`, E4.7 lo muestra
como subtotal conocido, nunca como total. Las únicas sumas permitidas son las que ya ejecuta
el propietario dentro de su propio contrato.

## Principios de composición

| ID | Principio | Consecuencia verificable |
| --- | --- | --- |
| P-01 | Solo lectura | La consulta no escribe hechos, planes, cierres, auditoría, configuración ni `schema_version`; no hay POST/PATCH/DELETE de E4.7 |
| P-02 | Sin motores nuevos | E4.7 no implementa fórmulas económicas; solo compone respuestas de E2.4/E2.6/E3.6/E4.5/E4.3/E4.4 |
| P-03 | Sin tablas ni migración | No hay DDL, tabla de resumen, snapshot, caché persistida ni migración |
| P-04 | Sin snapshots | La lectura es viva; no se congela el año ni se presenta como foto/cierre |
| P-05 | Una magnitud = un motor | Cada cifra declara `fuente.motor`, IDs y revisión; no se recalcula en el cliente |
| P-06 | `null ≠ 0` | `null` es `No disponible`; `0` solo es válido con `Cero verificado` y cobertura aplicable |
| P-07 | Cobertura explícita | Cada métrica y cada carril declaran estado, fuentes y motivo; un parcial no se presenta como total |
| P-08 | Año natural ≠ Ciclo | El año es la fecha civil del hecho; el Ciclo es la ventana de `tblCiclos`; se muestran ambos sin prorrateo ni copia |
| P-09 | Carriles separados | Plan, previsión, realidad y archivo no se suman entre sí ni comparten un total |
| P-10 | Sin total anual | El DTO no tiene `totalAnual`; un agregado solo existe donde su propietario lo certifica |
| P-11 | Enlaces sin datos financieros | Las rutas llevan IDs y filtros, nunca importes ni datos personales |
| P-12 | Degradación por fuente | Si un motor falla, solo su carril pasa a `No disponible`; los demás conservan su lectura y su revisión |

## Definiciones

| Término | Definición | Límite |
| --- | --- | --- |
| **Ejercicio natural** | Año civil de la fecha del hecho (`YYYY`) | No es el año de `mesFinanciado`, del corte ni del Ciclo |
| **Ciclo** | Ventana de `tblCiclos` con Inicio, Fin derivado/abierto y corte por referencia central | Puede cruzar diciembre/enero; no se prorratea |
| **Corte** | Fecha efectiva publicada por el motor/contexto; límite de la evidencia | No se sustituye por el reloj; un corte abierto no es cierre |
| **Cobertura** | Qué fuentes, intervalos y registros están acreditados para una métrica | No se infiere por tabla vacía, ausencia de filas o arranque del proceso |
| **Subtotal** | Importe conocido de los hechos registrados, sin certificar el total de la magnitud | No es total del Ciclo ni del año |
| **Total verificado** | Importe que el propietario certifica con cobertura completa y sin conflictos | Solo existe si el propietario lo publica; E4.7 no lo crea |
| **`HastaCorte`** | Alcance verificado hasta el corte, sin afirmar el resto del ejercicio | No se etiqueta como anual |
| **Archivo** | Fuente histórica E4.5, separada de los hechos detallados y solo de Gastos | No es foto ni cierre |
| **Foto** | Instantánea persistida de E4.9/E4.11 | Fuera de E4.7; no se simula |
| **Cálculo vivo** | Lectura actual de los motores, sin foto ni cierre | Se etiqueta «cálculo vivo, sin foto» |
| **Carril** | Bloque de una misma naturaleza: plan, previsión, realidad o archivo | No se suma a otro carril |

### Año natural y Ciclo

`[CONFIRMADO]` Un Gasto de diciembre puede pertenecer a un Ciclo que termina en enero; su
año natural y su Ciclo difieren y se muestran ambos (`SPEC21 §4.6`). Un Ciclo que cruza año
aparece en los dos ejercicios con sus fechas y su `cicloId`; no se prorratea, no se copia el
archivo de un año a otro y no se reasigna el hecho.

`[PROPUESTA]` E4.7 no usa el año de `mesFinanciado` de E4.6 como año del hecho. Si muestra el
coste esencial como contexto, declara que procede de E2.4/E4.6 y que su ejercicio es el del
plan, no el del flujo.

### Cálculo vivo y foto

`[CONFIRMADO]` Sin E4.9/E4.11 no hay cierre ni foto disponible. `[PROPUESTA]` E4.7 se rotula
«cálculo vivo, sin foto» y no certifica el ejercicio. Un Fin temporal no es cierre; una
consulta anual no crea una foto. Si en el futuro existe una foto, E4.7 no la mezcla con la
lectura viva ni recalcula sus valores.

### Primer alcance vivo y gate E4.5/DT7

`[DICTAMEN ÁLEX — recomendación, no aprobación]` El primer alcance de E4.7 es una vista viva de
solo lectura, **desacoplada de la finalización de E4.9**. Sin E4.5 desarrollado y sin DT7
aprobado no existe archivo anual verificado ni total anual acreditado: los checks AC10–AC15
quedan `UNRUN`/`BLOCKED` según la evidencia disponible y **no se declara E4.7 completa ni PASS
del roadmap**. La spec puede revisarse o aprobarse documentalmente antes; el DEV25 necesita
autorización separada del usuario. Sin fotos E4.9/E4.11, la cabecera mantiene «cálculo vivo,
sin foto».

## Contrato real de E2.6 (decisión de 2026-11-04)

`[CONFIRMADO]` El motor E2.6 no publica `valor` cuando la cobertura histórica del intervalo
no está acreditada. Publica el importe registrado como `subtotal` y marca la métrica
`Parcial`. La decisión está registrada en el PR #201 y el comportamiento ya existe en
`main` `b3f4ed9`. Fuente: inventario E4.7, A.2; `apps/api/src/flujo-mensual.ts`.

| Métrica E2.6 | DTO real | Estado | Lectura correcta |
| --- | --- | --- | --- |
| `ingresos` | `valor: null`, `subtotal` con hechos registrados, `motivo` de cobertura | `Parcial` | El subtotal es conocido, no certificado; no es total del Ciclo ni del año |
| `gasto` | `valor: null`, `subtotal` con hechos registrados, `motivo` | `Parcial` | No es Gasto total del Ciclo ni Gasto anual |
| `extraordinaria` | `valor: null`, `subtotal` con hechos registrados, `motivo` | `Parcial` | No se suma al Gasto ni se convierte en total |
| `nómina` | `valor: null`, `subtotal` con la nómina registrada, `motivo` | `Parcial` | No es nómina anual ni nómina completa del Ciclo |
| `operativo` (`S`) | `valor: null`, `subtotal: null` | `No disponible` | Sus tres componentes tienen `valor:null`; no se fabrica la resta |
| `margenReal` | `valor: null` | `No disponible` | Es «Margen frente a nómina real» y depende de `nómina.valor`; no es resultado real ni ahorro ejecutado |
| `margenEstructural` | Puede tener `valor` si media y Base son verificables; `Parcial` si la media lo es | `Verificado` / `Parcial` / `No disponible` | Es un margen del plan; no se anualiza ni se convierte en margen real |
| `S_aj` de E3.6 | Derivado de `G_b − R_adj`; siempre `Parcial` cuando es calculable | `Parcial` / `No disponible` | No es margen ni ahorro real; no se suma a los márgenes de E2.6 |

### Qué implica para E4.7

1. `[CONFIRMADO]` Un anual que sume `valor` no tiene operandos: E2.6 no publica `valor` en
   ingresos, gasto, extraordinaria ni nómina.
2. `[CONFIRMADO]` `subtotal` no es total. Si E4.7 mostrara una suma de subtotales de Ciclo,
   sería un **subtotal de subtotales** con la peor cobertura; se publicaría como
   `subtotalConocido` + estado + motivo, nunca como «total anual».
3. `[CONFIRMADO]` `operativo` y `margenReal` no se pueden anualizar mientras sean
   `No disponible`; se muestran como ND con motivo y nunca se rellenan con una cifra distinta
   ni con la aritmética de los subtotales.
4. `[CONFIRMADO]` `margenEstructural` sigue siendo un margen del plan; no autoriza un
   «margen medio anual» ni un «margen real puntual».
5. `[CONFIRMADO]` El DTO anual no debe tener un campo `totalAnual` incondicional. Todo
   agregado del propietario lleva `alcance`, `estado`, `subtotalConocido` y `motivo`.
6. `[CONFIRMADO]` La cobertura se declara por Ciclo y por año natural; no se mezclan para
   completar una cifra.
7. `[CONFIRMADO]` Los ingresos históricos siguen `No disponible` (E4.5 Q2=A); no se
   reconstruyen desde el plan ni desde E2.6.

> **Nota de deriva documental resuelta.** En `main` `b3f4ed9`, tras el merge del PR #201, los
> ejemplos DTO de SPEC24 ya muestran `valor:null`, `subtotal` y `Parcial` para las métricas
> E2.6. La fuente vigente sigue siendo el código de E2.6 y la decisión de 2026-11-04; esta spec
> no reabre SPEC24.

## Matriz fuente/magnitud/propietario

`[PROPUESTA]` Las rutas y funciones citadas son las fuentes; E4.7 no mantiene una segunda
implementación. Los nombres de campos se conservan; la adaptación de presentación no cambia
su semántica.

| Magnitud / bloque | Motor propietario | Dato consumido | E4.7 no hace |
| --- | --- | --- | --- |
| Ejercicio, Ciclos y corte | E1.3 / `cycleContext`, `cycleMaster` | `ejercicio`, `cicloId`, `inicio`, `fin`, `corte`, `estado` | No elige por reloj ni crea Ciclos |
| Plan por Partida/ejercicio | E2.4 / `annualExecution` | `total`, `estadoTotal`, `estadoCobertura`, `alcanceTotal`, `subtotalConocido`, `corte`, `motivo`, `fechaEjecutada` | No suma Partidas ni reconstruye Ejecutado |
| Equivalente esencial | E2.4 / `annualEquivalent` | `total` racional, `estado`, `parcial`, `importesSinInformar` | No divide por 12 ni sustituye la fuente |
| Flujo del Ciclo | E2.6 / `monthlyFlow` | `ingresos`, `gasto`, `extraordinaria`, `nomina`, `operativo`, `margenReal`, `margenEstructural`, `liquidez` | No recompone Gasto ni Ingresos; no anualiza |
| Ajuste compartido | E3.6 / read model | `G_n`, `S_aj`, `estado`, `motivo`, `cobertura` | No crea un Neto paralelo ni suma al bruto |
| Archivo histórico | E4.5 | `archivo`, `detalleControl`, `detallePrecontrol`, `total`, `alcanceTotal`, `subtotalConocido`, `estadoCobertura`, `estadoTotal`, `cobertura`, `corte`, `fuentes`, `procedencia`, `motivoCodigo`, `motivo`, `sinClasificar` | No recombina archivo+detalle, no deduplica, no crea total anual |
| Valoración y resultado | E4.3 | `agregado.valorEur`, `coberturaValoracion`, `resultadoEur`, `coberturaResultado`, `posiciones[]` | No valora, no reescala, no calcula patrimonio |
| Deuda viva | E4.4 | `capitalPendiente`, `capital.calculable`, `motivoNoCalculable`, `tipoDeuda`, `estado` | No reconstruye capital ni resta deuda del flujo |
| Previsión | E2.5 | Simulación por paga/mes, si existe contrato consumible | No crea hechos ni la suma como año |
| Cierre / foto | E4.9 / E4.11 | Estado y foto, si existen | No lee ni simula foto; no certifica el año |

## Composición anual

### Contexto, ejercicio y cobertura

`[PROPUESTA]` La consulta se identifica por `ejercicio.natural` y por un `contexto` con la
fecha de consulta, el corte, su fuente y el estado `Vivo`/`Foto`. El `ejercicio` declara el
rango civil y los Ciclos que lo tocan, incluidos los que cruzan diciembre/enero. La
`cobertura` se declara por carril y por métrica; el estado global es el más restrictivo
aplicable y `NoAcreditada` prevalece. Un corte `null` no se sustituye por la fecha de consulta.

### Qué se puede componer

`[PROPUESTA]` E4.7 compone **respuestas**, no importes nuevos. Cada carril muestra lo que su
propietario ya calculó para el mismo contexto.

| Operación | ¿Permitida en E4.7? | Regla |
| --- | --- | --- |
| Leer `total` de E2.4 por Partida/ejercicio | Sí | Solo si `estadoTotal=Verificado`; si no, `total:null` + `subtotalConocido` + motivo |
| Leer `Ejecutado`/`Diferencia` de E2.4 | Sí | Con su cobertura; si `Ejecutado` no es verificable, `Diferencia:null` |
| Leer métricas E2.6 por Ciclo | Sí | Se muestran con `valor`, `subtotal`, `estado` y `motivo` reales |
| Leer `G_n`/`S_aj` de E3.6 por Ciclo | Sí | En bloque separado; `S_aj` siempre `Parcial` cuando es calculable |
| Leer archivo E4.5 por ejercicio/Partida | Sí | Se muestra el DTO de E4.5; no se recombina |
| Sumar subtotales de varios Ciclos para un año | **No** | E2.6 no publica año natural y un Ciclo puede cruzar año; se listan los Ciclos, sin total anual |
| Sumar archivo + detalle | **No** | Lo hace E4.5; E4.7 no lo repite |
| Sumar archivo + Ciclo | **No** | Son carriles y fuentes distintas; el archivo no entra en el flujo del Ciclo |
| Sumar plan + realidad | **No** | Son carriles distintos; el plan no es ejecución |
| Sumar previsión + realidad | **No** | La previsión no crea hechos |
| Sumar valoración + deuda | **No** | Si el patrimonio entra, se muestran bloques separados; no hay patrimonio neto |
| Sumar/averiguar márgenes entre Ciclos | **No** | No hay fórmula anual aprobada; se muestran por Ciclo o `No disponible` |
| Crear un `totalAnual` | **No** | No existe en el DTO ni en la UI |

### Plan

`[CONFIRMADO]` El plan anual se organiza por Partida y ejercicio natural. `[PROPUESTA]` E4.7
muestra Presupuesto, Esencial, Ejecutado, Diferencia y cobertura tal como los publica E2.4. No
suma Presupuestos de Partidas ni crea un objetivo anual propio.

- Un `Ejecutado` con `alcanceTotal=HastaCorte` no se etiqueta como anual.
- Un `Ejecutado` `NoAcreditada` no certifica `Diferencia` ni `Fecha ejecutada`.
- `Presupuesto` vacío no borra hechos; `0` informado se conserva y es distinto de ausencia.
- Una Partida sin línea de plan no se inventa; la ejecución conocida se muestra como consulta.

### Previsión

`[CONFIRMADO]` E2.5 simula por paga/mes y no crea hechos. `[PROPUESTA]` E4.7 solo muestra una
previsión si existe un contrato consumible para el ejercicio; si no, el carril es `No
disponible` con motivo. La previsión no se suma al año, no se compara como realidad y no se
usa para rellenar el plan ni el flujo.

### Flujo y realidad

`[CONFIRMADO]` E2.6 publica métricas por Ciclo, no por año natural. `[PROPUESTA]` E4.7 lista
los Ciclos que tocan el ejercicio (incluidos los que cruzan diciembre/enero) con sus fechas,
`cicloId` y métricas. No prorratea, no reasigna hechos y no convierte un subtotal de Ciclo en
total anual.

`[PROPUESTA]` El carril de realidad declara `agregadoAnual: { estado: "No aplica", motivo }`
para hacer explícita la ausencia. No se publica una cifra anual de flujo. Si en el futuro se
quiere un agregado por fecha natural, su fórmula y cobertura deben nacer en el motor
propietario y aprobarse en una spec separada.

### Archivo

`[CONFIRMADO]` E4.5 es la única fuente de archivo y solo cubre Gastos. `[PROPUESTA]` E4.7
muestra su DTO por ejercicio/Partida, incluidos `estadoCobertura`, `estadoTotal`, `alcanceTotal`,
`subtotalConocido` y `motivo`. No suma archivo al flujo del Ciclo ni al plan mensual; no
recombina archivo y detalle; no deduce cobertura por su cuenta.

- `total` solo se presenta como verificado si E4.5 devuelve `estadoTotal=Verificado` y
  `alcanceTotal=Anual`.
- Un `total` con `alcanceTotal=HastaCorte` es un total verificado hasta corte, no anual.
- `NoAcreditada` prevalece y no se degrada a `Parcial`; no se convierte en `0`.
- `NoDisponible` de una Partida no se propaga automáticamente al global.
- Un `0` verificado solo es válido con cobertura completa, intervalo acreditado y ausencia de
  hechos elegibles; nunca por ausencia de tabla o de fuente.

### Patrimonio (solo si entra)

`[PENDIENTE]` El alcance del patrimonio no está aprobado. `[DICTAMEN ÁLEX — recomendación, no
aprobación]` Se recomienda **incluir contexto separado** de valoración/resultados E4.3 y deuda
E4.4 **solo al mismo corte verificable**, cada uno con su estado y cobertura. E4.7 no calcula
patrimonio neto, no suma valoración + deuda + flujo y no oculta la indisponibilidad. Si no hay
un corte comparable, el bloque se marca `No disponible`; no se fabrica la cifra. Si el usuario
decide excluirlo, el bloque se omite o se declara `No aplica` con motivo; nunca se publica una
cifra global.

### Márgenes

`[PROPUESTA]` Solo se publican los márgenes que E2.6 ya define:

```text
Margen frente a nómina real = Nómina real verificable del Ciclo − SUM(Del mes)
Margen estructural          = Media válida estructural 12 meses − SUM(Base)
```

Ambos son márgenes del **plan**, no ahorro ejecutado ni resultado real. E4.7 conserva su
etiqueta, su cobertura y su `estado`. No los suma entre Ciclos, no los promedia y no los
convierte en un margen anual. `margenes.publicados` y las métricas de margen del carril
realidad son la misma respuesta de E2.6; no se calculan dos veces.

`[PENDIENTE]` «Margen medio» y «margen real puntual» no tienen fórmula aprobada. E4.7 los
publica como `No disponible` con motivo «Definición pendiente DT8» y no los calcula. Si el
usuario quiere una fórmula, debe nacer en el motor propietario (E2.6/E3.6), no en E4.7.

## Contrato de lectura (DTO conceptual)

`[PROPUESTA]` El siguiente DTO es conceptual y de solo lectura; no es un contrato cerrado ni
autoriza implementación. Conserva los nombres reales de E2.6/E4.5 y los tipos auxiliares de
E4.6. **No existe `totalAnual`.**

```ts
type EstadoMetrica =
  | "Verificado"
  | "Cero verificado"
  | "Parcial"
  | "No disponible"
  | "No aplica"
  | "Sin datos";

type EstadoCobertura =
  | "Completa"
  | "Parcial"
  | "NoAcreditada"
  | "NoDisponible"
  | "Solapada";

type EstadoTotal = "Verificado" | "NoVerificable" | "NoDisponible";

type Fuente = {
  motor: string;
  ids: string[];
  revision: string | null;
  intervalo?: { desde: string | null; hasta: string | null };
};

type Cobertura = {
  estado: EstadoMetrica | EstadoCobertura;
  fuente: string;
  detalle: string;
  incluidos: number | null;
  excluidos: number | null;
  motivos: string[];
};

type ContextoMetrica =
  | { tipo: "ciclo"; cicloId: string; corte: string | null }
  | { tipo: "ejercicio"; ejercicio: number; corte: string | null }
  | { tipo: "corte"; fecha: string | null; fuente: string };

type Enlace = {
  etiqueta: string;
  ruta: string;
  ids: string[];
};

type Metrica = {
  clave: string;
  etiqueta: string;
  clase: "plan" | "real" | "archivo" | "informativo" | "patrimonio";
  valor: string | null;       // decimal exacto; null ≠ 0
  subtotal: string | null;    // conocido, no certificado
  estado: EstadoMetrica;
  unidad: "EUR" | "meses" | "conteo";
  motivo: string;
  cobertura: Cobertura;
  fuente: Fuente;
  contexto: ContextoMetrica;
  alcance: "Ciclo" | "Ejercicio" | "HastaCorte" | "No aplica";
  enlace: Enlace | null;
};

type CicloRef = {
  cicloId: string;
  inicio: string;
  fin: string | null;
  corte: string | null;
  ejercicios: number[];       // puede incluir dos años
};

type CarrilPlan = {
  estado: EstadoMetrica;
  motivo: string;
  items: {
    partidaId: string;
    presupuesto: string | null;
    esencial: "Sí" | "No" | "Pendiente" | null;
    ejecutado: Metrica;
    diferencia: Metrica | null;
    cobertura: Cobertura;
  }[];
  enlace: Enlace;
};

type CarrilPrevision = {
  estado: EstadoMetrica;
  motivo: string;
  simulacion: Metrica | null;
  enlace: Enlace | null;
};

type CarrilRealidad = {
  estado: EstadoMetrica;
  motivo: string;
  ciclos: {
    cicloId: string;
    inicio: string;
    fin: string | null;
    corte: string | null;
    ejercicios: number[];
    ingresos: Metrica;
    gasto: Metrica;
    extraordinaria: Metrica;
    nomina: Metrica;
    operativo: Metrica;
    margenReal: Metrica;
    margenEstructural: Metrica;
    ajusteCompartidos: {
      gNeto: string | null;
      sAjustado: string | null;
      estado: EstadoMetrica;
      motivo: string;
      fuente: Fuente;
    };
  }[];
  agregadoAnual: {
    estado: "No aplica";
    motivo: string;
  };
  enlace: Enlace;
};

type ArchivoItem = {
  partidaId: string | null;
  archivo: string | null;
  detalleControl: string | null;
  detallePrecontrol: string | null;
  total: string | null;
  alcanceTotal: "Anual" | "HastaCorte";
  subtotalConocido: string | null;
  estadoCobertura: EstadoCobertura;
  estadoTotal: EstadoTotal;
  cobertura: Cobertura;
  corte: string | null;
  fuentes: Fuente[];
  procedencia: string[];
  motivoCodigo: string;
  motivo: string;
  sinClasificar: {
    importe: string | null;
    motivo: string;
  }[];
};

type CarrilArchivo = {
  estado: EstadoMetrica;
  motivo: string;
  items: ArchivoItem[];
  enlace: Enlace;
};

type MargenPublicado = {
  clave: "margenEstructural" | "margenReal";
  etiqueta: string;
  clase: "plan";
  valor: string | null;
  subtotal: string | null;
  estado: EstadoMetrica;
  motivo: string;
  cobertura: Cobertura;
  fuente: Fuente;
  cicloId: string;
  alcance: "Ciclo";
};

type Margenes = {
  estado: "Pendiente DT8" | "Parcial" | "No disponible";
  etiqueta: "Márgenes del plan";   // no son ahorro ejecutado
  publicados: MargenPublicado[];   // solo margenEstructural y margen frente a nómina real, por Ciclo
  noDefinidos: {
    clave: "margenMedio" | "margenRealPuntual";
    etiqueta: string;
    estado: "No disponible";
    motivo: "Definición pendiente DT8";
  }[];
  nota: "Sin agregación anual ni margen medio; AC3 parcial";
};

type Patrimonio = {
  incluido: true;
  corte: {
    fecha: string | null;              // mismo corte para E4.3 y E4.4
    estado: EstadoMetrica;             // No disponible si no hay corte comparable
    motivo: string;
  };
  valoracion: {
    valorEur: string | null;
    estado: EstadoMetrica;
    coberturaValoracion: string;
    resultadoEur: string | null;
    coberturaResultado: string;
    fuente: Fuente;
    enlace: Enlace;
  } | null;                     // E4.3, solo contexto
  deuda: {
    total: string | null;
    subtotal: string | null;
    estado: EstadoMetrica;
    cobertura: Cobertura;
    fuente: Fuente;
    enlace: Enlace;
  } | null;                     // E4.4, solo contexto
  nota: "Bloques separados al mismo corte; sin patrimonio neto, sin suma de valoración + deuda + flujo";
};

type ResumenAnual = {
  contexto: {
    consulta: string;
    corte: {
      fecha: string | null;
      fuente: string;
      estado: "disponible" | "parcial" | "no_disponible";
    };
    calculo: "Vivo" | "Foto";
    fotoId: string | null;       // null mientras no exista E4.9/E4.11
    etiqueta: "Cálculo vivo, sin foto" | "Foto";
  };
  ejercicio: {
    natural: number;
    desde: string;
    hasta: string;
    ciclos: CicloRef[];
  };
  cobertura: {
    estado: EstadoCobertura;
    fuentes: Fuente[];
    motivos: string[];
    porCarril: {
      plan: Cobertura;
      prevision: Cobertura;
      realidad: Cobertura;
      archivo: Cobertura;
    };
  };
  carriles: {
    plan: CarrilPlan;
    prevision: CarrilPrevision;
    realidad: CarrilRealidad;
    archivo: CarrilArchivo;
  };
  margenes: Margenes;
  patrimonio: Patrimonio | null;  // null si el alcance no lo incluye
  enlaces: Enlace[];
  pendientesDelModelo: string[];
};
```

### Reglas del DTO

- `[PROPUESTA]` No hay `totalAnual`, `totalGeneral`, `patrimonioNeto` ni `flujoCompleto`
  como importe. `CarrilRealidad.agregadoAnual` es un objeto `No aplica`, no una cifra.
- `[PROPUESTA]` Los importes son cadenas decimales exactas; `null` es `No disponible`.
- `[PROPUESTA]` `Cobertura.estado` conserva el vocabulario de su fuente; la UI puede mostrar
  la etiqueta humana, pero no sustituye `NoAcreditada` por `Parcial` ni `No disponible` por
  `0`.
- `[PROPUESTA]` El estado global de cobertura es el más restrictivo aplicable a los carriles;
  `NoAcreditada` prevalece. `NoDisponible` de una Partida no se propaga automáticamente al
  global (SPEC20).
- `[PROPUESTA]` `fuente.ids` identifica los hechos/registros; `revision` es la huella de la
  lectura cuando el motor la publica. No se inventa una revisión.
- `[PROPUESTA]` Los enlaces solo contienen IDs, rutas y filtros; nunca importes.
- `[PROPUESTA]` `No aplica` significa que la magnitud no existe en el alcance/diseño;
  `No disponible` significa que existe pero falta fuente o verificación. Ambos llevan motivo
  visible; ninguno se sustituye por `0`, celda vacía o solo color.
- `[PROPUESTA]` El bloque patrimonio solo existe con un corte común verificable para E4.3 y
  E4.4; cada bloque conserva su estado/cobertura. Si no hay corte comparable, ambos quedan
  `No disponible` con motivo; no se calcula patrimonio neto ni se suma valoración + deuda +
  flujo.
- `[PROPUESTA]` Los dos decimales de presentación (importes y meses) no redondean el valor de
  origen; el DTO conserva el decimal exacto del motor.

## Márgenes y DT8 agrupado

DT8 no es una única decisión. Para E4.7 se agrupa en cuatro bloques. Ninguna opción de esta
sección está aprobada: Álex ya emitió su dictamen funcional (relay 0142) y la aprobación
corresponde al usuario.

### D8-M — Márgenes medio, estructural, real puntual y plan

`[PENDIENTE]` Faltan fórmula, denominador y agregación anual de «margen medio» y «margen real
puntual». `margenEstructural` y `margen frente a nómina real` ya existen, pero son del plan.

`[DICTAMEN ÁLEX — recomendación, no aprobación]` M-A es recomendable para el primer alcance:
consumir **únicamente** `margenEstructural` y `margen frente a nómina real` existentes en E2.6,
por Ciclo, con estado/cobertura y etiqueta inequívoca de **márgenes del plan**; no son ahorro
ejecutado. `margen medio` y `margen real puntual` quedan `No disponible` con motivo DT8: sin
fórmula ni motor propietario aprobado, no se calculan ni se anualizan. **E4.7-AC3 no puede
declararse PASS completo** solo por representar esas dos magnitudes como ND: se registra
cumplimiento parcial y dependencia explícita de una definición futura.

| Opción | Contenido | Efecto en E4.7 |
| --- | --- | --- |
| **M-A** | Publicar solo los dos márgenes existentes de E2.6, por Ciclo, con etiqueta de plan y cobertura; `margenMedio` y `margenRealPuntual` como `No disponible — DT8`; sin agregación anual | Mínimo riesgo; no requiere fórmula nueva; E4.7-AC3 queda **PARCIAL** hasta que se acepte que los no definidos sean ND y exista definición futura |
| **M-B** | Definir una agregación anual de márgenes existentes (suma, media o margen de agregados) solo con Ciclos completos | Requiere decisión financiera y una regla de cobertura; no se implementa en E4.7 sin aprobación |
| **M-C** | Definir «margen medio» y «margen real puntual» en E2.6/E3.6, con numerador, denominador y tratamiento de Bonus/extraordinaria/Recuperado/meses parciales | Requiere spec/motor propietario; E4.7 solo consumiría el resultado |

**Recomendación** `[PROPUESTA — avalada funcionalmente por Álex; pendiente de aprobación del
usuario]`: **M-A**. Publicar `margenEstructural` y `margen frente a nómina real` con su
cobertura y etiqueta `plan`; mostrar `margen medio` y `margen real puntual` como `No disponible
— definición pendiente DT8`; no sumar, promediar ni anualizar márgenes. E4.7-AC3 se registra
como **PARCIAL**, nunca PASS. Si se aprueba M-C, la fórmula debe nacer en el motor propietario,
no en E4.7.

### D8-Z — Coste esencial nulo y cocientes

`[CONFIRMADO]` Coste esencial verificado `0` → `mesesCubiertos` `No disponible`, nunca `0` ni
infinito; coste parcial o incompleto → `No disponible`; no se divide un subtotal
(`SPEC24:150-163`, AC-16). Un `0` anual sigue siendo una decisión explícita, no una ausencia
(`SPEC10`).

`[DICTAMEN ÁLEX — recomendación, no aprobación]` **Z-A**: no crear cocientes anuales. Si se
solicita `mesesCubiertos` con coste esencial verificado `0`, el resultado es `No disponible`
(no `0`, no infinito). Los dos decimales de meses son **solo presentación**: nunca se redondea
el valor del origen. Una magnitud que el alcance no publica se declara `No aplica` con motivo,
no `0`.

| Opción | Contenido | Efecto en E4.7 |
| --- | --- | --- |
| **Z-A** | No introducir cocientes anuales nuevos; conservar la regla confirmada de coste 0; formato de meses a 2 decimales como presentación, sin redondear el origen | No hay división nueva; E4.7 muestra el contexto de E2.4/E4.6 con su fuente |
| **Z-B** | Definir un ratio anual nuevo (por ejemplo, cobertura en meses del año) | Requiere fórmula, denominador y tratamiento de meses parciales; no se implementa sin decisión |
| **Z-C** | No mostrar ningún contexto de coste esencial en E4.7 | Evita el problema, pero pierde trazabilidad con R6; no recomendado |

**Recomendación** `[PROPUESTA — avalada funcionalmente por Álex; pendiente de aprobación del
usuario]`: **Z-A**. Sin cocientes anuales nuevos; coste `0` verificado → `mesesCubiertos` `No
disponible`; formato de meses a 2 decimales solo como presentación, sin alterar ni redondear el
valor de origen. Si E4.7 no publica un cociente, se declara `No aplica` con motivo, no `0`.

### D8-F — Formato, filtros y salida

`[PENDIENTE]` Faltan columnas exactas, orden, exportación y salida (pantalla, PDF u otra). La
identidad visual y los tokens existentes no se reabren.

`[DICTAMEN ÁLEX — recomendación, no aprobación]` **F-A** es recomendable, con una precisión:
F-A **sí incluye filtros funcionales**, no es una pantalla sin filtros. Filtros principales:
ejercicio y cobertura. Filtros secundarios: Ciclo y Partida. Si F-B conserva esos mismos
filtros, su diferencia real respecto de F-A es añadir **exportación CSV con contrato definido**;
F-C introduce además **PDF/informe**. En el primer DEV no hay CSV ni PDF. La UI es de solo
lectura: 1440 tabla compacta y 390 tarjetas; la QA visual/responsive es un gate separado.

| Opción | Contenido | Efecto en E4.7 |
| --- | --- | --- |
| **F-A** | Pantalla de solo lectura con filtros funcionales: principales ejercicio y cobertura; secundarios Ciclo y Partida; sin exportación ni PDF en el primer DEV; 1440 tabla compacta y 390 tarjetas | Menor alcance; reutiliza shell/tokens; revisión visual posterior |
| **F-B** | F-A + exportación CSV con contrato definido (mismos filtros) | Requiere definir columnas, orden, importes y cobertura exportada; más superficie de prueba |
| **F-C** | F-B + PDF o informe imprimible oficial | Requiere decisión de formato, firma/versión y posiblemente otra spec; no recomendado para el primer DEV |

**Recomendación** `[PROPUESTA — avalada funcionalmente por Álex; pendiente de aprobación del
usuario]`: **F-A** para el primer DEV; filtros principales ejercicio/cobertura y secundarios
Ciclo/Partida; columnas por carril, estado y fuente visibles; sin exportación ni PDF hasta una
decisión posterior. La revisión visual 1440/390 sigue siendo un gate separado.

### D8-N — Datos no aplicables

`[PENDIENTE]` Hay magnitudes que no existen por diseño (por ejemplo, total anual de flujo,
total de efectivo del bróker o patrimonio neto global) y otras que existen pero no están
disponibles (por ejemplo, ingresos históricos o archivo sin DT7). No deben confundirse.

`[DICTAMEN ÁLEX — recomendación, no aprobación]` **N-A**: `No aplica` cuando la magnitud **no
existe en el alcance o en el diseño**; `No disponible` cuando **existe pero falta fuente o
verificación**. Ambos con motivo visible, sin `0` ficticio ni celda vacía, y distinguibles sin
depender solo del color.

| Opción | Contenido | Efecto en E4.7 |
| --- | --- | --- |
| **N-A** | Estado explícito `No aplica` con motivo por magnitud; `No disponible` para fuente ausente; nunca `0` ni celda vacía | Lectura sin ambigüedad; requiere copy y pruebas de estados |
| **N-B** | Omitir la fila cuando no aplica | Menos ruido, pero puede parecer que el dato no existe o que se ha perdido |

**Recomendación** `[PROPUESTA — avalada funcionalmente por Álex; pendiente de aprobación del
usuario]`: **N-A**. `No aplica` para lo que no existe por diseño y `No disponible` para lo que
existe pero no se puede acreditar; ambos con motivo visible. Ningún estado se representa solo
con color.

## Cobertura histórica y archivo E4.5

`[CONFIRMADO]` Sin E4.5 desarrollado y sin DT7 aprobado no hay universo histórico acreditado.
E4.7 no puede certificar un total anual; solo puede mostrar `NoAcreditada`, el motivo y, si
existe, el subtotal conocido separado.

### Qué publica E4.5 y consume E4.7

- Por Partida y ejercicio: `archivo`, `detalleControl`, `detallePrecontrol`, `total` (solo si
  procede), `alcanceTotal`, `subtotalConocido`, `estadoCobertura`, `estadoTotal`, `cobertura`,
  `corte`, `fuentes`, `procedencia`, `motivoCodigo`, `motivo` y `sinClasificar`.
- `total` solo si `estadoCobertura=Completa`, no hay conflictos y todos los registros son
  atribuibles; `alcanceTotal=Anual` solo con corte 31/12.
- `subtotalConocido` + motivo + cobertura cuando no hay total certificable.
- `0` verificado solo con cobertura completa, intervalo acreditado y sin hechos elegibles.
- `NoAcreditada` prevalece; no se degrada a `Parcial`, no se convierte en `0` y no se sustituye
  por detalle ni por otra fuente.

### Qué nunca se publica como total anual

- Un total con `estadoCobertura=NoAcreditada`, `Parcial`, `NoDisponible` o `Solapada`.
- Un total con huecos, fuente ausente, solapamiento, mapping pendiente, duplicado ambiguo o
  registro no atribuible al corte.
- Un `HastaCorte` presentado como anual; un año futuro presentado como `0`.
- Archivo + detalle sin deduplicación; archivo agregado sin desglose separable; aperturas
  históricas; ingresos, Transferencias, Amortización o deuda sumados al total de Gastos.
- Inversión, Comida o patrimonio como parte del total anual de Gastos.
- Un cálculo vivo etiquetado como foto o cierre.

### Ingresos históricos

`[CONFIRMADO]` E4.5 solo cubre Gastos (Q2=A). `[PROPUESTA]` E4.7 muestra los ingresos
históricos como `No disponible` con motivo; no los reconstruye desde el plan, desde E2.6 ni
desde el archivo. Un `0` de ingresos históricos no es válido sin cobertura específica.

## Screens and interfaces

**UX conceptual, no aprobada.** Reutiliza shell, tipografía, tokens, cabecera y componentes
existentes; no introduce tema, librería, tokens ni wireframes HTML nuevos. Los textos entre
corchetes son etiquetas, no cifras.

### 1440 px — resumen anual

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ RESUMEN ANUAL · Ejercicio [2026]                         Cálculo vivo, sin foto · Solo lectura │
│ Corte [fecha] · Fuente [referencia central] · Cobertura [estado] · [Cómo se calcula y qué falta]│
├───────────────────────────────────────────────┬──────────────────────────────────────────────┤
│ CARRIL PLAN · E2.4                            │ CARRIL PREVISIÓN · E2.5                       │
│ [Estado] · [Cobertura] · [Ver plan anual]     │ [Estado] · [Motivo si ND] · [Ver nómina]      │
│ Partida · Presupuesto · Esencial · Ejecutado  │ [Sin total anual de previsión]                │
│ [Diferencia] · [Cobertura por Partida]        │                                              │
├───────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ CARRIL REALIDAD · E2.6 + E3.6                 │ CARRIL ARCHIVO · E4.5                         │
│ Ciclo [ID] · [inicio]–[fin] · corte [fecha]   │ [Estado] · [Cobertura] · [Ver archivo]        │
│ Ingresos [subtotal/valor] · Gasto [... ]      │ Partida · Archivo · Detalle · Total           │
│ Extraordinaria [...] · Nómina [...]           │ [HastaCorte] · [Subtotal] · [Motivo]          │
│ Operativo [ND/Parcial] · Márgenes [plan]      │ [Sin total anual si NoAcreditada/Solapada]    │
│ [Ajuste G_n / S_aj] · [Ver flujo]             │                                              │
├───────────────────────────────────────────────┴──────────────────────────────────────────────┤
│ MÁRGENES DEL PLAN                                                                            │
│ Margen estructural [valor/ND] · Margen frente a nómina real [valor/ND] · cobertura visible     │
│ Margen medio: No disponible — definición pendiente DT8                                       │
│ Margen real puntual: No disponible — definición pendiente DT8                                │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ PATRIMONIO AL CORTE · solo si el alcance lo incluye                                          │
│ Valoración E4.3 [valor/cobertura] · Deuda E4.4 [total/subtotal/cobertura]                    │
│ Bloques separados; sin patrimonio neto ni suma al flujo                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 390 px — resumen anual

```text
┌──────────────────────────────────────────────┐
│ RESUMEN ANUAL                               │
│ Ejercicio [selector 2026]                   │
│ Cálculo vivo, sin foto · Solo lectura        │
│ Corte [fecha] · Cobertura [estado]           │
│ [Cómo se calcula y qué falta]                │
├──────────────────────────────────────────────┤
│ PLAN · E2.4                    [Estado]      │
│ Partida [ID] · Presupuesto [...]             │
│ Esencial [Sí/No/Pendiente]                   │
│ Ejecutado [...] · Diferencia [...]           │
│ [Ver plan anual]                             │
├──────────────────────────────────────────────┤
│ PREVISIÓN · E2.5               [Estado]      │
│ [Motivo si No disponible]                    │
│ [Ver nómina]                                 │
├──────────────────────────────────────────────┤
│ REALIDAD · E2.6 + E3.6          [Estado]     │
│ Ciclo [ID] · [inicio]–[fin]                  │
│ Ingresos [...] · Gasto [...]                 │
│ Extraordinaria [...] · Nómina [...]          │
│ Operativo [ND/Parcial]                       │
│ Márgenes del plan [...]                      │
│ [Ajuste G_n / S_aj] · [Ver flujo]            │
├──────────────────────────────────────────────┤
│ ARCHIVO · E4.5                 [Estado]      │
│ Partida [ID] · Archivo [...]                 │
│ Detalle [...] · Total [HastaCorte]           │
│ [Subtotal] · [Motivo]                        │
│ [Ver archivo]                                │
├──────────────────────────────────────────────┤
│ MÁRGENES DEL PLAN                            │
│ Estructural [...] · Frente a nómina [...]    │
│ Medio: ND — DT8                              │
│ Real puntual: ND — DT8                       │
├──────────────────────────────────────────────┤
│ PATRIMONIO AL CORTE · si aplica              │
│ Valoración [...] · Deuda [...]               │
│ Sin patrimonio neto ni suma al flujo         │
└──────────────────────────────────────────────┘
```

### Reglas UX

- `[PROPUESTA]` 1440 usa tabla compacta por carril; 390 usa tarjetas apiladas. No hay scroll
  horizontal ni tablas que oculten el estado.
- El estado `Parcial`, `No disponible`, `NoAcreditada`, `Solapada` y `No aplica` se muestra con
  icono **y** texto, nunca solo con color.
- El motivo y la fuente se ven sin depender de tooltip; el detalle se abre con enlaces por ID.
- La cabecera declara ejercicio, corte, cobertura y «cálculo vivo, sin foto».
- Los filtros principales son ejercicio y cobertura; los secundarios, Ciclo y Partida. La
  selección se conserva al volver de un enlace y nunca se pone un importe en la URL.
- No se muestra un «total anual» ni una cifra grande que sugiera un cierre.
- Los importes se formatean en `es-ES` con dos decimales visuales, sin redondear el valor
  almacenado; la UI no calcula.

## Empty, loading and error states

| Estado | Condición | Presentación |
| --- | --- | --- |
| Carga | Consulta en curso | Esqueleto con «Cargando…»; no se muestran cifras de otra revisión; se conserva el ejercicio |
| Sin datos | Ejercicio sin plan, sin Ciclos, sin archivo y sin hechos | «Sin datos para este ejercicio»; no `0`, no filas inventadas |
| Vacío verificado | Cobertura completa y sin hechos elegibles | `0,00` con `Cero verificado`; no `Sin datos` |
| Parcial | Una fuente o Parte no verificable | Etiqueta `Parcial`, subtotal conocido, incluidos/excluidos y motivo |
| No aplica | Magnitud inexistente en el alcance/diseño | Etiqueta `No aplica` con motivo visible; sin `0` ni celda vacía |
| No disponible | Motor/dato/contexto ausente, o existe pero falta fuente/verificación | Sin cifra; motivo, fuente y componentes conocidos aparte |
| No acreditada | E4.5 sin universo DT7 | «Universo no acreditado»; subtotal separado si existe; no total |
| Solapada | E4.5 con solapamiento no separable | Componentes visibles; total/subtotal `null`; motivo; no suma |
| Error de fuente | Un motor falla o timeout | Solo ese carril `No disponible` con motor y motivo; los demás siguen; reintento |
| Sin E4.5 | Archivo no desarrollado / DT7 pendiente | Carril archivo `No disponible` con motivo; no se simula archivo |
| Sin E4.9/E4.11 | No hay cierre/foto | Cabecera «cálculo vivo, sin foto»; no se certifica el año |

## Validation and edge cases

- Un año futuro sin hechos no produce `0`; produce `Sin datos`/`No disponible` con motivo.
- Un Ciclo que cruza diciembre/enero se muestra en los dos ejercicios; no se prorratea ni se
  copia el archivo de un año a otro.
- Un Gasto de diciembre en un Ciclo que termina en enero conserva su año natural; el plan
  anual usa el año del Gasto y el flujo usa el Ciclo.
- Un archivo con solapamiento no se suma; `Solapada`/`NoVerificable`, no `1500` ni `1520`.
- Un `HastaCorte` no se rotula como anual; un `NoAcreditada` no se degrada a `Parcial`.
- `null` no se convierte en `0`; un `0` verificado se conserva y se distingue de la ausencia.
- Coste esencial `0` no produce división; `mesesCubiertos` es `No disponible`.
- Los dos decimales de presentación no redondean el valor de origen.
- `No aplica` y `No disponible` se distinguen por su motivo; ninguno se representa con `0`,
  celda vacía o solo color.
- E4.3 y E4.4 solo se comparan al mismo corte verificable; si no coincide, ambos `No disponible`
  y no se suman con el flujo.
- Un margen negativo se conserva con signo; no se trunca ni se convierte en ahorro.
- Una Partida inactiva conserva su historia; no se borra ni se reasigna.
- Un renombre de Partida no rompe la línea; se usa el ID y se conserva el nombre de origen
  cuando E4.5 lo publica.
- Un plan sin líneas es `Sin plan`, no `0`; un Presupuesto vacío no borra la ejecución.
- Un cambio de fuente entre carga y reintento no mezcla revisiones; la respuesta antigua se
  descarta.
- Una lista larga no trunca un total; se muestran IDs y enlace.
- Un fallo de una fuente no invalida las demás; la degradación es por carril.
- La consulta no escribe ni cambia `schema_version`; no hay POST/PATCH/DELETE de E4.7.

## Exclusions

- Implementación de E4.7, endpoints, UI, DDL, migración, datos reales, Excel o despliegue.
- Motores nuevos de suma anual, flujo completo, márgenes, patrimonio o cobertura.
- Tablas, snapshots, cachés persistidas, fotos o cierres.
- Cierre/precierre/reapertura E4.8–E4.11; certificación de un ejercicio.
- Ingresos históricos reconstruidos; archivo distinto de E4.5.
- Patrimonio global o patrimonio neto; suma de valoración, deuda y flujo.
- Fórmulas nuevas de «margen medio»/«margen real puntual»; cualquier ratio anual no aprobado.
- Exportación CSV/PDF o informe oficial en el primer DEV mientras D8-F no lo autorice.
- Aprobar DT8, aprobar esta spec o autorizar DEV25, merge, datos reales o migración.

## Acceptance checks

`[PROPUESTA]` Criterios candidatos, **no aprobados y no ejecutados**. Cada uno es verificable
con un DTO, una respuesta API o una captura futura; ninguno declara PASS por inspección. La
matriz de ejecución está en el testplan. Estado de partida: **E4.7-AC3 = PARCIAL** (márgenes no
definidos en DT8); **AC10–AC15 = UNRUN/BLOCKED** por E4.5/DT7; el resto `UNRUN`. Ningún check
se declara PASS.

| ID | Precondición / acción | Resultado esperado verificable |
| --- | --- | --- |
| E4.7-AC01 | Consultar el resumen antes/después y probar POST/PATCH/DELETE | Sin cambios en hechos, planes, cierres, auditoría, configuración ni `schema_version`; solo GET; no existe ruta de escritura |
| E4.7-AC02 | Abrir cada cifra y su detalle | Cada cifra declara `fuente.motor`, IDs, contexto, estado y cobertura; la UI no calcula ni rellena |
| E4.7-AC03 | Comparar cada bloque con su motor al mismo contexto | Igualdad exacta al céntimo con el propietario de cada bloque incluido (E2.4/E2.6/E3.6/E4.5/E4.3/E4.4); ninguna cifra se reimplementa. **Estado PARCIAL**: `margen medio`/`margen real puntual` no tienen definición DT8, por lo que AC3 no puede PASS completo |
| E4.7-AC04 | Consultar un ejercicio con cobertura parcial | El DTO no contiene `totalAnual`; no hay etiqueta «total anual»; todo agregado monetario del propietario lleva `alcance`, `estado`, `subtotalConocido` y `motivo` |
| E4.7-AC05 | Fixture C007 con el contrato real de E2.6 | `ingresos`, `gasto`, `extraordinaria` y `nomina` tienen `valor:null`, `subtotal` conocido y `Parcial`; `operativo` y `margenReal` son `No disponible`; E4.7 no rellena ni anualiza |
| E4.7-AC06 | Dos Ciclos del mismo ejercicio, ambos `Parcial` | El carril realidad lista los Ciclos y sus subtotales; no publica un total anual ni una suma de subtotales como año; `agregadoAnual.estado=No aplica` |
| E4.7-AC07 | Una fuente devuelve `null` y otra `0.00` verificado | `null` se muestra `No disponible`; `0,00` se muestra `Cero verificado`; no se sustituyen |
| E4.7-AC08 | Ciclo C008 con hechos en 2026 y 2027 | Aparece en ambos ejercicios con el mismo `cicloId`, fechas y métricas de Ciclo; sin prorrateo ni copia; el plan usa el año natural |
| E4.7-AC09 | Gasto 28/12/2026 en Ciclo 20/12–19/01 y aportación 25/01/2027 | El plan anual usa 2026; el flujo usa el Ciclo; ambos visibles; no se reasigna el hecho |
| E4.7-AC10 | E4.5 devuelve `alcanceTotal=HastaCorte` | La UI dice «hasta corte» y no «anual»; no se publica total anual; el total hasta corte conserva su estado |
| E4.7-AC11 | E4.5 devuelve `estadoCobertura=NoAcreditada` | No certifica Ejecutado/Diferencia/total; muestra «Universo no acreditado», motivo y subtotal separable si existe; no `0`, no `Parcial` |
| E4.7-AC12 | E4.5 combina archivo 1.200,00 + detalle 300,00 sin solape | E4.7 muestra el total 1.500,00 de E4.5 una vez; no suma componentes; no duplica amortización |
| E4.7-AC13 | E4.5 devuelve `Solapada`/`NoVerificable` por solape no separable | Componentes visibles; total/subtotal `null`; no 1.500 ni 1.520 como total; motivo visible |
| E4.7-AC14 | Archivo anual y flujo del Ciclo en el mismo ejercicio | Se muestran en carriles separados; no se suman; el archivo no entra en el plan mensual ni en el flujo |
| E4.7-AC15 | Consultar ingresos históricos | `No disponible` con motivo; no se reconstruyen desde plan/E2.6/archivo; no `0` |
| E4.7-AC16 | Existe una simulación E2.5 y un flujo real | La previsión se muestra aparte; no se suma al año ni al Ciclo; no se etiqueta como realidad |
| E4.7-AC17 | E3.6 publica `G_n`/`S_aj` para un Ciclo | Se muestran en bloque propio, con estado y motivo; `S_aj` es `Parcial`; no se suman al bruto E2.6 ni se convierten en margen |
| E4.7-AC18 | E2.6 publica `margenEstructural` y `margenReal` | Se muestran por Ciclo con etiqueta inequívoca de **márgenes del plan** (no ahorro ejecutado) y cobertura; `margenReal` sin `valor` es `No disponible`; `margen medio` y `margen real puntual` son ND «DT8»; no hay margen anual ni promedio |
| E4.7-AC19 | Si E4.7 muestra el contexto de coste esencial: coste verificado `0` o cociente no definido | `mesesCubiertos` `No disponible`; no se divide por cero; sin ratio anual nuevo; los dos decimales no redondean el origen; si el alcance no publica el cociente, `No aplica` con motivo |
| E4.7-AC20 | Alcance con y sin patrimonio | Si entra: E4.3 y E4.4 **al mismo corte verificable**, separados y cada uno con estado/cobertura; sin patrimonio neto ni suma de valoración + deuda + flujo. Sin corte comparable: `No disponible`, sin cifra fabricada. Si no entra: bloque ausente o `No aplica` con motivo |
| E4.7-AC21 | Activar cada enlace y volver | Ruta/ID correctos; se conserva el ejercicio y los filtros; la URL no contiene importes ni datos personales |
| E4.7-AC22 | 1440×1000 y 390×844, teclado y foco | Cuatro carriles legibles, sin scroll horizontal; estado icono+texto; foco visible; contraste; sin tema/tokens nuevos |
| E4.7-AC23 | Forzar vacío, carga, parcial, ND, error de una fuente y reintento | Estados diferenciados; solo el carril afectado degrada; no `0`; el reintento conserva la selección |
| E4.7-AC24 | Acceso anónimo, sesión expirada, error 500 e intento de escritura | 401/reautenticación sin datos; errores genéricos sin SQL ni importes; `no-store`; no hay métodos de escritura |
| E4.7-AC25 | Cambiar una fuente entre carga y reintento; dos consultas concurrentes | No se mezclan revisiones; la respuesta antigua se descarta; la selección se conserva |
| E4.7-AC26 | Inspeccionar tablas, `schema_version` y artefactos antes/después | Sin tabla, snapshot, caché persistida ni migración; `schema_version` igual; no se persiste el resumen |
| E4.7-AC27 | Consultar sin E4.9/E4.11 | Cabecera «cálculo vivo, sin foto»; no hay cierre/foto ni certificación anual; no se simula una foto |

### Trazabilidad al roadmap

| Criterio roadmap | Checks candidatos |
| --- | --- |
| E4.7-AC1 — integrar histórico válido y Gastos sin duplicar amortizaciones | AC10–AC15, AC27 |
| E4.7-AC2 — flujo con todas las fuentes temporales y Neto compartido del mismo motor | AC03, AC05, AC16, AC17 |
| E4.7-AC3 — distinguir margen medio/estructural/real puntual y plan con cobertura visible | AC18, AC19; **AC3 queda PARCIAL**: con M-A solo se publican los dos márgenes existentes; «medio» y «real puntual» dependen de una definición futura y no pueden PASS completo |
| Año natural vs Ciclo | AC08, AC09 |
| Sin total anual / cobertura explícita | AC04–AC07, AC10, AC11, AC13 |
| Solo lectura, seguridad y UX | AC01, AC02, AC21–AC26 |

## Dependencies and gates

| Dependencia | Estado 2026-11-04 | Efecto en E4.7 |
| --- | --- | --- |
| E4.5 / DT7 | SPEC20 aprobada; **sin DEV**; DT7 abierto | Sin archivo anual verificado no hay total anual; AC10–AC15 quedan `UNRUN`/`BLOCKED`. El primer alcance vivo de E4.7 puede prepararse desacoplado de E4.9 |
| D8-M | `[PENDIENTE]`; dictamen de Álex favorable a M-A | E4.7-AC3 queda **PARCIAL**: los dos márgenes ND dependen de una definición futura; no hay PASS completo |
| D8-Z | `[PENDIENTE]`; dictamen de Álex favorable a Z-A | Sin aprobación no se publica ratio anual nuevo; coste 0 sigue la regla confirmada; 2 decimales solo presentación |
| D8-F | `[PENDIENTE]`; dictamen de Álex favorable a F-A con filtros funcionales | Sin aprobación no hay CSV/PDF; 1440 tabla y 390 tarjetas; QA visual separada |
| D8-N | `[PENDIENTE]`; dictamen de Álex favorable a N-A | Sin aprobación, el tratamiento `No aplica`/`No disponible` con motivo visible no se considera aprobado |
| E4.3 | Integrado v24; QA 15 PASS / 2 PARCIAL; sin PASS de aceptación | Solo contexto patrimonial al mismo corte verificable; no calcula patrimonio global |
| E4.4 | Integrado DEV17 / `024b348` | Solo contexto patrimonial separado y al mismo corte; no se resta del flujo |
| E3.6 | MERGED `a26fffb` | Disponible para `G_n`/`S_aj`; no hay total económico |
| E4.6 | SPEC/testplan aprobados; DEV24 en PR #201 OPEN | No es fuente ni dependencia de contrato; E4.7 consume E2.6/E2.4/E3.6 directamente |
| E4.9 | DEV en PR #200 OPEN; sin merge; QA con reservas | No hay cierre/foto; no bloquea el primer alcance vivo; E4.7 sigue «sin foto» |
| E4.11 | SPEC29 en `main` `b3f4ed9`; sin DEV conocido | No hay foto anual; no se simula |
| E2.6 | Contrato real 2026-11-04 en `b3f4ed9` | `valor:null` + `subtotal` + `Parcial`; E4.7 no fabrica totales |

## Seis decisiones para aprobación del usuario

`[PENDIENTE]` Ninguna decisión está tomada por esta spec ni por el dictamen de Álex. El
dictamen funcional de Álex (relay 0142) **recomienda** las opciones indicadas, pero no sustituye
la aprobación del usuario ni autoriza DEV25, merge, datos reales ni migración. Aprobar esta spec
tampoco autoriza DEV25: el desarrollo requiere una autorización separada.

1. **D8-M — márgenes.** ¿Se aprueba **M-A**: publicar únicamente `margenEstructural` y `margen
   frente a nómina real` de E2.6, por Ciclo, con estado/cobertura y etiqueta inequívoca de
   **márgenes del plan** (no ahorro ejecutado), dejando `margen medio` y `margen real puntual`
   como `No disponible` por DT8, sin agregación anual? Con M-A, **E4.7-AC3 queda PARCIAL** y
   depende de una definición futura; no puede PASS completo. Alternativas: M-B (agregación
   anual) o M-C (definir los márgenes en E2.6/E3.6).
2. **D8-Z — coste esencial 0 y cocientes.** ¿Se aprueba **Z-A**: sin cocientes anuales nuevos;
   coste esencial verificado `0` → `mesesCubiertos` `No disponible` (no `0`, no infinito); dos
   decimales solo presentación, sin redondear el origen; magnitud no publicada por el alcance →
   `No aplica` con motivo? Alternativa: Z-B (ratio anual nuevo) o Z-C (no mostrar contexto).
3. **D8-F — formato, filtros y salida.** ¿Se aprueba **F-A** para el primer DEV: pantalla de
   solo lectura con filtros funcionales principales de ejercicio y cobertura, y secundarios de
   Ciclo y Partida; sin CSV ni PDF; 1440 tabla compacta y 390 tarjetas; QA visual/responsive
   como gate separado? F-B añade CSV con contrato; F-C añade PDF/informe.
4. **D8-N — datos no aplicables.** ¿Se aprueba **N-A**: `No aplica` cuando la magnitud no existe
   en el alcance/diseño y `No disponible` cuando existe pero falta fuente o verificación, ambos
   con motivo visible, nunca `0` ni celda vacía y sin depender solo del color? Alternativa:
   N-B (omitir la fila).
5. **Patrimonio.** ¿Se aprueba incluir **contexto separado** de valoración/resultados E4.3 y
   deuda E4.4 **solo al mismo corte verificable**, cada uno con estado/cobertura, sin calcular
   patrimonio neto, sin sumar valoración + deuda + flujo y sin ocultar indisponibilidad? Si no
   hay corte comparable, el bloque queda `No disponible`, sin cifra fabricada. Alternativa:
   excluirlo del primer alcance como `No aplica`.
6. **Gate E4.5/DT7 y primer alcance.** ¿Se acepta un **primer alcance vivo de solo lectura**,
   desacoplado de la finalización de E4.9? Sin E4.5 desarrollado y sin DT7 aprobado no hay
   archivo anual verificado ni total anual: **AC10–AC15 quedan `UNRUN`/`BLOCKED`** según la
   evidencia y **no se declara E4.7 completa** ni PASS del roadmap. Sin fotos E4.9/E4.11 se
   mantiene «cálculo vivo, sin foto». La aprobación de esta spec es documental y no autoriza
   DEV25, merge, datos reales ni migración.
