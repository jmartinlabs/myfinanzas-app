# 10 — E2.4 Plan anual por Partida y ejercicio: Specification

Status: APPROVED rev2 — especificación completa y wireframes aprobados.
Approval source/date: usuario «Aprobadas», 2026-10-24, respuesta a la solicitud única
de aprobación de spec10 rev2 y sus wireframes. Desarrollo NO autorizado.
Context and brainstorming: [decisiones10](10-plan-anual-brainstorming.md),
[roadmap E2.4](roadmap.md#e24--plan-anual-por-partida-y-ejercicio),
[R3/R6 y precisión anual](functional-reference-v5.11.md#e24--precisión-del-plan-anual-y-esenciales-2026-10-24).
Las decisiones Q1–Q6 gobiernan esta revisión. Los contratos técnicos y wireframes
son propuesta de aplicación; no atribuirlos como capacidades físicas del Excel.

## Functionality

Consultar y editar el plan de un ejercicio natural por ID estable de Partida. Una
única línea por Partida/ejercicio, aunque Periodo previsto exprese varios periodos.
El plan no nace cada mes ni desde una ejecución: Presupuesto anual es una decisión
manual, nullable, no negativa;0 es decisión explícita. No autocompletar ni copiar
el año anterior. La apertura de un ejercicio no crea líneas o importes de oficio.
No existe un segundo importe esencial anual. Esencial es clasificación de la línea,
no atributo maestro de Partida ni el importe Esencial del plan del ciclo.

Q1–Q6 confirmadas por el usuario el2026-10-24. La evidencia Excel se atribuye a Álex;
no afirmar equivalencia anual completa, histórico importado ni inspección física propia.
La aprobación es documental/visual; no autoriza implementación, migración ni SQL.

## Data model and contracts

Modelo lógico documental; sin DDL ni versión de esquema asignada.

| Dato | Contrato |
| --- | --- |
| Ejercicio | Año natural seleccionado; no ID de Ciclo ni mes financiado |
| Partida | ID PAR estable; nombre y jerarquía desde catálogo, no claves por nombre |
| Presupuesto (€) | Único importe manual; null y0 distintos; exacto, no negativo |
| Periodo previsto | Texto opcional editable; conserva expresiones y no produce calendario |
| Esencial | Enum manual Sí/No/Pendiente; No y Pendiente distintos; elección explícita propuesta en alta |
| Revisión/auditoría | Patrón existente para concurrencia, actor, motivo aplicable y cambios; no snapshots por edición |
| Ejecutado/Diferencia/Fecha ejecutada | Derivados, no entradas editables ni fuentes paralelas persistidas |
| Cobertura/corte | Procedencia y límites verificables de datos; no sello de cierre financiero |

Una colisión Partida/ejercicio se rechaza atómicamente, incluidos dos procesos.
Renombrar una Partida no rompe la línea; no duplicar importes en el maestro.
No hay copia entre ejercicios en esta propuesta; una eventual copia explícita requerirá
alcance propio. Conservar líneas históricas de Partidas inactivas; no permitir nuevas
líneas para inactivas. Sus ediciones respetan el impacto y las protecciones siguientes.
No sustituir contratos de corrección de clasificación ni crear cierres futuros ficticios.

### Ejecución anual y cobertura — propuesta de integración

Reutilizar el ledger real: Gastos vigentes por ID de Partida y Fecha real en la
intersección del ejercicio natural con el periodo de control/corte verificable. Una
compra de diciembre no pasa a enero por su ciclo financiado.
Anulación excluye el hecho y rectificación reevalúa su atribución sin duplicarlo.
No sumar Ingresos, Transferencias o Amortización deuda. Cuota ordinaria de tipo Gasto
conserva su importe económico íntegro según R2, sin convertir capital en gasto nuevo.
Presupuesto/fuente del plan del ciclo no determina esta suma anual por Partida.

Separar universo temporal solicitado, corte verificable y cobertura de fuentes.
Mostrar Gastos registrados elegibles consultables aunque falte planificación. No crear
líneas por ejecución. No aplicar automáticamente el aviso del ciclo «Sin planificar»;
el diseño muestra ejecución sin línea como sección de consulta, sin objetivo inventado.

El histórico transitorio válido procede del contrato de E4.5/E4.7, con Partida,
ejercicio, procedencia y cobertura verificables; importe y Fecha histórica no son
entradas del formulario anual. Ejecutado suma histórico válido y Gastos elegibles,
únicamente sin solapamiento/doble cómputo. Un dato histórico ya representado en
Movimientos no se suma dos veces. Si la fuente o la separación no se pueden verificar,
no inventar importes ni declarar completo el agregado; conservar el motivo y la
consulta separada de datos conocidos. No simular un proveedor histórico instalado.

La API declara fuentes disponibles, intervalo de control y cobertura hasta el corte.
Cobertura verificable al corte no significa que el resto de un año abierto se haya
ejecutado. Sin cobertura del intervalo exigible no presentar un total anual verificado:
mostrar motivo y, si hay hechos conocidos, subtotal registrado separado del total.
No mostrar0 anual comprobado por ausencia de histórico o en un año futuro sin corte.
Un intervalo verificable sin hechos elegibles puede producir0 para ese intervalo;
no acredita automáticamente cobertura de todo el ejercicio. Presupuesto no informado
no borra hechos verificables ni los convierte en0.

Derivados confirmados Q4:

- Diferencia=ROUND(Presupuesto−Ejecutado,2), con aritmética decimal exacta. Para los
  operandos monetarios en céntimos de la app, la resta ya es exacta a dos decimales;
  no redondear cada hecho ni reutilizar importes visuales. Mantener negativos si excede
  el presupuesto. Sin Presupuesto o Ejecutado verificable, null con motivo; no presentar
  una diferencia parcial como definitiva. Ejecutado0 verificado da Diferencia=Presupuesto;
  Presupuesto0 informado permite diferencia negativa con ejecución positiva.
- Fecha ejecutada=máxima fecha conocida válida entre Fecha histórica y fechas de los
  Gastos elegibles por Partida/ejercicio/periodo de control. El histórico conserva su
  propio intervalo aprobado: no descartarlo por anteceder al inicio del control de
  Movimientos, ni incluir datos de otro ejercicio/corte sin validación de origen.
  La fecha histórica no necesita convertirse en un Movimiento para participar.
- Fecha ejecutada es una fecha conocida, no prueba de que la cobertura sea completa.
  Con datos parciales puede mostrarse acompañada de cobertura/procedencia. Un importe
  histórico positivo sin fecha no autoriza inventarla; si hay fechas de Gastos elegibles,
  usar la máxima conocida, y si no hay ninguna fecha conocida, null. Importe0 tampoco
  determina por sí mismo existencia o ausencia de fecha. Periodo previsto y reloj no
  son candidatos al máximo.

### Edición pasada, cierres y fotografías

Fin del ejercicio no equivale a cierre financiero. Editar un plan de ejercicio anterior
exige revisión de impacto, motivo obligatorio y confirmación, solo si no existe protección
financiera aplicable. Analizar dependencias por ID, incluyendo ciclos cerrados contenidos
en el ejercicio y sus fotografías: ausencia de cierre anual no demuestra editabilidad.
La protección se comprueba en cualquier ejercicio, incluido el actual; el flujo de
impacto/motivo/confirmación es obligatorio además para edición de ejercicios anteriores.
Las líneas de inactivos siguen visibles; su estado no borra historia ni permite saltar
el procedimiento. Una nueva relación con Partida inactiva se rechaza.

El preview indica cambios de entradas/derivados, relaciones afectadas y protección
aplicable. Al confirmar revalidar revisión, estado del catálogo, cobertura/contexto y
cierres/fotografías dentro del mismo límite transaccional de escritura. Si aparece un
cierre/protección desde el preview, rechazar como contexto obsoleto/protegido sin escritura
parcial, conservando borrador. No alterar fotografías ni reescribir Gastos para aceptar
una edición; no generar históricos o snapshots completos por cada cambio de plan.

No se crea un motor de cierre en E2.4. El contrato consulta capacidades y protecciones
realmente instaladas; no inventa flags de cerrado ni considera automáticamente libre un
contexto con referencias a protecciones que no puede verificar. Ausencia de proveedor
futuro no acredita su integración: su conexión y regresiones se incorporarán al entregarlo.
Si existen protecciones vinculadas no verificables, no confirmar una edición que pueda
afectarlas. El permiso de lectura y preservación histórica se mantiene.

### Equivalente esencial y compatibilidad R3/R6

Regla confirmada: sumar importes anuales de líneas Esencial=Sí y después dividir por12.
No y Pendiente no contribuyen; se conserva su clasificación manual. No redondear
contribuciones individuales. Mantener precisión exacta de la suma en céntimos y del
cociente para consumidores; el formato visual no se convierte en otra fuente de cálculo.
No emplear float ni valores visuales redondeados como entrada de agregados.
Ejemplo ficticio: dos importes esenciales de0,03€ suman0,06€ antes de dividir por12;
no se suman dos resultados mensuales redondeados por separado.

La disponibilidad del equivalente depende de planificación, no del Ejecutado ni de
la cobertura de Movimientos. Esencial=Sí con importe vacío conserva la ausencia.
Completitud confirmada Q5: si hay alguna línea Esencial=Sí con Presupuesto vacío,
mostrar el total «Incompleto», sin importe total cerrado. Mostrar «Parcial» para la
suma conocida/12 y contar los importes esenciales sin informar. El subtotal conserva
la misma fórmula y precisión; no completa los vacíos ni los convierte en decisiones0.
Un subtotal conocido0 con importes faltantes sigue parcial, no un coste completo0.
Esencial=Pendiente permanece excluido y tiene un contador/aviso de clasificación por
resolver distinto del contador de importes Sí vacíos. Con importes Sí todos informados,
la suma/12 puede ser verificable para las líneas Sí; las clasificaciones pendientes
siguen visibles y no se consideran decisiones No. Sin líneas: «Sin plan anual», no plan
esencial decidido de0. No confundir estos motivos con cobertura de ejecución parcial.

Cadena semántica única: plan anual → equivalente mensual anual → Importe esencial
mensual de Gastos anuales → Coste esencial mensual global → consumidores R6.
El global suma esenciales mensuales y no vuelve a añadir el equivalente anual.
R6 mantiene mínimo objetivo=Coste esencial global×Meses objetivo y meses cubiertos=
Liquidez/Coste esencial global. No sustituir el global por el anual aislado, ni dividir
por0 o publicar métricas completas desde una fuente incompleta. Propagar la marca
«Parcial/Incompleto» y sus motivos al consumidor; el parcial no genera silenciosamente
un objetivo definitivo de liquidez ni se etiqueta como coste esencial global completo.

Spec09 conserva Base/Esencial/Del mes manuales e independientes; esta entrega no
sobrescribe su Esencial al editar el anual, no altera A transferir=Del mes ni
modifica su ejecución R3. El contrato de consumo futuro debe identificar ejercicio,
Presupuesto mensual por ID y procedencia; no buscar el nombre «Gastos anuales» como
clave ni sumar simultáneamente fuente y destino. No se añade aquí vinculación o
sincronización persistente. El punto de integración automática, si se solicita, necesita
especificación/autorización propias. Resumen de liquidez E4.6 y flujos globales son futuros.

## Screens and interfaces

Wireframes rev2 aprobados por el usuario el2026-10-24, datos ficticios.
La aprobación visual del diseño no acredita una UI implementada ni pruebas de navegador. Reutilizar shell,
tabla escritorio y tarjetas móvil, foco, borrador y controles accesibles existentes.
Selector de ejercicio separado de la cabecera del ciclo. Filtros Partida/Esencial,
indicador de cobertura y acceso a Gastos elegibles. No presentar futuro como ejecutado0.

```text
Plan anual                         Ejercicio [2026 v] [+ Añadir Partida]
Corte mostrado:[30/06/2026] · control:[01/04–30/06] · cobertura por Partida:mixta
Histórico válido anterior al control: disponible · [Ver cobertura/procedencia]

Partida          Presupuesto  Periodo previsto   Esencial  Ejecutado  Diferencia  Fecha ejecutada
PAR101 · Seguro   1.200,00 €   Mayo - Octubre    Sí          300,00 €   900,00 €   15/06/2026
PAR102 · Reserva          —   Julio - Agosto    Sí                —          —            —
PAR103 · Otros        0,00 €   —                 Pendiente    20,00 €   -20,00 €   20/06/2026
[Detalle] [Editar / Revisar impacto / Protegido: ver motivo]

Equivalente esencial mensual anual: ! Incompleto
Parcial conocido:100,00 €/mes · Importes esenciales sin informar:1
Clasificaciones Esencial pendientes:1 (excluida de la suma; no convertida a No)
No es el Coste esencial mensual global ni un objetivo definitivo de liquidez.
[Consultar ejecución registrada sin línea] — no crea planificación
```

La fila PAR102 muestra un escenario de cobertura/fecha no verificables para esa
Partida; el detalle expone el motivo. El indicador global de cobertura se desglosa
por Partida: nunca implica que todas las filas tengan Ejecutado verificable.

```text
Móvil · Plan anual        Ejercicio [2026 v]
Cobertura parcial · Histórico de esta Partida no verificable
PAR102 · Reserva [Inactiva]
Presupuesto:Sin informar  | Esencial:Sí
Periodo previsto:Julio - Agosto
Ejecutado:— · Diferencia:— (cobertura no verificable)
Fecha ejecutada:15/06/2026 · Más reciente conocida; no prueba cobertura completa
[Detalle] [Revisar impacto / Protegido: ver motivo]
! Equivalente esencial total:Incompleto · Parcial:100,00 €/mes
Importes sin informar:1 · Clasificaciones pendientes:1
```

Son estados ficticios independientes: la tarjeta ilustra que una fecha conocida
puede mantenerse aunque el importe ejecutado completo no sea verificable.

```text
Añadir / editar línea · Ejercicio2026
Partida [PAR101 · Seguro v] (ID fijo en edición; nueva línea solo activa)
Presupuesto (€) [              ]  Vacío ≠0
Periodo previsto [Mayo - Octubre                         ] (opcional)
Esencial [Elegir / Sí / No / Pendiente]
Ejecutado, Diferencia y Fecha ejecutada:solo lectura en el detalle
[Cancelar] [Guardar / Revisar impacto]

Revisión de ejercicio pasado
Antes → Después · Equivalente/advertencias afectados · Relaciones por ID
Cierres de ciclos/fotografías aplicables:[Ver resultado y motivos]
Motivo obligatorio [                                         ]
[Volver al borrador] [Confirmar, solo si no hay protección aplicable]
Si aparece un cierre concurrente:rechazo sin guardar; fotos intactas.
```

Los agregados incompletos y estados usan icono/texto, no exclusivamente color.
No se confunde Esencial=Pendiente con una Transferencia pendiente de ejecutar.

## Empty, loading and error states

Sin líneas: «Sin plan anual», acción explícita Añadir, no siembra automática.
Línea con importe vacío: «Sin informar», diferente de0,00€. Mantener ejecución real
si está disponible. Carga visible; error con Reintentar conserva ejercicio/filtros y
borrador. Una respuesta antigua no reemplaza el ejercicio recién seleccionado.
Conflicto de revisión/contexto: reconsultar y revisar diferencias sin perder borrador.
Sin cobertura/fecha: null y motivo; no rellenar con0, reloj o Periodo previsto.
Cierre no es fin de año. Protección de ciclo/fotografía aplicable bloquea la edición
y muestra motivo, incluso sin cierre anual; un fallo al comprobarla no autoriza guardar.

## API behavior and external dependencies

Propuesta reutilizando servicios, autenticación/CSRF y convenciones JSON existentes:
lectura del plan por ejercicio y detalle por ID; alta/edición de entradas explícitas,
preview/confirmación de edición pasada con motivo e impacto, y consulta de hechos por Partida.
DTO distingue null de0, cobertura/corte/intervalos, procedencia histórica, subtotal
registrado, fecha conocida, revisiones y protecciones. Equivalente esencial expone
completitud, parcial y contadores de importes faltantes/clasificaciones pendientes.
Esencial enum y Periodo previsto texto viajan sin reinterpretación de periodicidad.
EUR exactos en strings; sin importes JS number ni SQL al navegador. Parseo, límites
técnicos de texto, revisión e idempotencia conforme patrones vigentes, sin dependencias
nuevas. Rutas/esquema físicos siguen decisiones técnicas del futuro desarrollo autorizado,
no cambios ejecutables de esta entrega documental.

Revalidar catálogo/estado, ejercicio, unicidad, revisión y contexto al confirmar dentro
de transacción, incluidas protecciones de ciclos/fotografías aplicables; rechazar
duplicados/concurrencia/protección sin escritura parcial. Auditoría de
entradas, sin duplicar derivados ni crear versiones completas por cada edición.
Backups/migración y compatibilidad de consumidores serán gates del futuro dev autorizado.

## Validation and edge cases

Texto «Mayo - Octubre» no duplica filas ni genera operaciones futuras. No negativos;
PATCH omite=conserva, null explícito vacía solo campo nullable,0 informado se conserva.
Nuevo importe no deriva de Ejecutado. Fecha de Gasto gobierna el año, no el ciclo.
Duplicados por ID/año, cambios de nombre, anulaciones, fuente incompleta, presupuesto0,
Esencial Pendiente y Esencial Sí con importe vacío tienen casos explícitos.
No filtrar por nombre ni convertir presencias históricas en valores por defecto.

## Exclusions

Desarrollo/SQL, Excel real, datos personales, implementación del importador/transitorios2026, motor de
periodicidad, creación automática de líneas/presupuestos y copias entre ejercicios.
Sin edición de Movimientos desde el plan, transferencias de financiación, snapshots por
edición, cierre/reapertura o cambio de reglas de liquidez/global. No integrar de oficio
sincronización del Esencial del ciclo ni dar equivalencia física anual por comprobada.

## Acceptance checks

Criterios documentales para el futuro desarrollo; NO ejecutados. Q1–Q6 están resueltas;
la aprobación completa/visual fue otorgada el2026-10-24. E2.4-AC1→AC01–07; E2.4-AC2→AC08–11;
E2.4-AC3→AC12–15/25–29. Esenciales y protección histórica:AC16–21/30–34.

| ID | Acción / precondiciones | Resultado esperado |
| --- | --- | --- |
| AC-01 | Crear dos líneas con misma Partida/año, incluso dos procesos | Una sola línea; duplicado rechazado sin parcialidad |
| AC-02 | Misma Partida en dos ejercicios y renombrar catálogo | Líneas independientes por ID/año; identidad conservada |
| AC-03 | Guardar Presupuesto vacío y después0 | Ausencia y decisión0 distintas; no negativos ni relleno |
| AC-04 | Abrir otro mes/ejercicio con plan previo o ejecución | No reconstruir ni copiar presupuestos automáticamente |
| AC-05 | Introducir Mayo - Octubre / Julio - Agosto | Texto opcional conservado; una fila; no calendario ni fechas impuestas |
| AC-06 | Cambiar Periodo previsto | Ejecución y fecha real no alteradas |
| AC-07 | Intentar editar derivados o añadir otro importe esencial anual | Rechazo/ausencia de esos inputs; solo Presupuesto manual |
| AC-08 | Gasto diciembre en Ciclo financiado de enero | Ejecución atribuida al ejercicio de diciembre |
| AC-09 | Ingreso, Transferencia, Amortización y cuota ordinaria Gasto | Solo el Gasto contribuye por su importe vigente, sin duplicación |
| AC-10 | Anular/rectificar Gasto | Consulta reevalúa año/Partida/importe; sin copias del hecho |
| AC-11 | Cambiar fuente mensual del Presupuesto | No cambia la regla anual por Partida; R3 mensual se conserva |
| AC-12 | Falta histórico o corte verificable | Cobertura/motivo visibles; no total anual0 ficticio |
| AC-13 | Intervalo verificable sin hechos |0 de ese intervalo, sin afirmar cobertura anual no demostrada |
| AC-14 | Año futuro o ninguna línea anual | Sin ejecución0 ficticia; sin creación automática de líneas |
| AC-15 | Ejecución conocida sin línea o Presupuesto vacío | Hechos consultables; no objetivo ni línea inventados |
| AC-16 | Sí, No y Pendiente con igual importe | Solo Sí contribuye; Pendiente permanece distinto de No |
| AC-17 | Dos importes Sí de0,03€ | Sumar0,06 antes de dividir12; sin redondeo individual |
| AC-18 | Sí vacío frente a Sí con0 | Solo el vacío produce importe pendiente; total Incompleto, Parcial y contador;0 no se trata como ausencia |
| AC-19 | Consumidor mensual/global incorpora el equivalente | No duplicar anual y esencial mensual; no sobrescribir entradas manuales |
| AC-20 | Presupuesto100; Ejecutado0 verificado, luego120; después Presupuesto vacío | Diferencia100,00;−20,00;vacía, con ROUND de la resta a2 decimales |
| AC-21 | Línea histórica inactiva y alta nueva para inactiva | Existente conservada/visible; alta rechazada; edición respeta protección/impacto |
| AC-22 | Conflicto/contexto obsoleto/doble envío | Revalidación, idempotencia y rollback sin perder borrador |
| AC-23 | Error/carga/cambio rápido de ejercicio | Reintento funcional; respuesta antigua descartada; estados accesibles |
| AC-24 | Revisar móvil/escritorio, nulos y cobertura | Wireframes aprobados y luego evidencia real390/1440; sin afirmar PASS hoy |
| AC-25 | Histórico100 fechado10/03 y Gasto40 fechado15/06, intervalos válidos no solapados | Ejecutado140; Fecha ejecutada15/06, con procedencia verificable |
| AC-26 | Fecha histórica más reciente que la de Gastos elegibles | Fecha ejecutada conserva la histórica válida; no forzar fecha del último Movimiento |
| AC-27 | Importe histórico positivo sin fecha y sin fechas elegibles | Fecha ejecutada vacía; no inferida del importe ni Periodo previsto |
| AC-28 | Falta cobertura ejecutada, pero hay fecha conocida válida | Diferencia no definitiva/null con motivo; fecha conocida visible con advertencia |
| AC-29 | Histórico duplicado/solapado con Movimientos o de otro ejercicio sin validación | No doble suma ni fecha impropia; cobertura/motivo explícitos si no verificable |
| AC-30 | Dos líneas Sí vacías y una Pendiente con importe | Contador importes2 y clasificación1 separados; Pendiente excluida, sin convertir a No |
| AC-31 | Consumidor recibe equivalente Parcial | No generar objetivo definitivo ni coste global completo con ese parcial |
| AC-32 | Año pasado sin protección aplicable; editar con/sin motivo | Preview+motivo+confirmación obligatorios; sin motivo no guardar; sin reescribir hechos |
| AC-33 | Sin cierre anual pero con ciclo/fotografía protegidos aplicables | Edición rechazada por protección; IDs, relaciones y fotografías intactos |
| AC-34 | Cierre/protección aparece entre preview y confirmación | Revalidación rechaza sin escritura parcial; borrador conservado y contexto actualizado |
