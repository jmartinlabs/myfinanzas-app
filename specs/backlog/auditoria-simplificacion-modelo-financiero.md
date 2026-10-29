# Auditoría crítica y propuesta de simplificación del modelo financiero

Fecha: 2026-10-29. Estado: propuesta de auditoría independiente para discusión;
no es una especificación aprobada ni autoriza desarrollo o migración.
Documento trasladado de la respuesta de auditoría a petición del usuario.

## Recomendación principal

Recomiendo simplificar, pero no convertir cada Partida en una reserva ligada
obligatoriamente a un banco. Esa asociación origina buena parte del problema de
compensaciones que se quiere resolver.

La propuesta es mantener tres conceptos separados, presentados en una misma pantalla:

- **Saldo:** dónde está el dinero.
- **Partida:** para qué se gasta.
- **Reserva:** cuánto dinero existente queda apartado para una finalidad.

El presupuesto expresa una intención futura; la reserva expresa dinero apartado;
el gasto expresa consumo realizado. Pueden convivir en una interfaz sin convertirse
en una sola magnitud.

## 1. Qué existe realmente

Auditoría de lectura sobre `main` **`454d21a`**, coincidente con el remoto de
`jmartinlabs/myfinanzas-app` al realizar la auditoría. Las PR abiertas #50 y #51 no
forman parte de esta base. La auditoría original no modificó archivos ni ejecutó
pruebas o abrió bases de datos; esta entrega publica únicamente el documento.

La referencia documental vigente es **v5.11(7), candidata, no estable**. No se ha
inspeccionado el Excel físico ni se afirma equivalencia con él.

| Área | Implementado en la base auditada | Límites relevantes |
| --- | --- | --- |
| Saldos y Movimientos | Posiciones calculadas según control; ingresos, gastos, transferencias y amortización extraordinaria | Terminales sin posición monetaria convencional; cobertura bancaria completa no acreditada |
| Clasificación | Categoría → Subcategoría → Partida; vínculo opcional a Presupuesto y Deuda | Partida es imputación económica; no existe una reserva monetaria por Partida |
| Maestro Presupuestos | Fuentes Gasto real, Aportación a saldo, No aplica | Dos presupuestos de aportación no pueden compartir destino; el destino no representa una reserva exclusiva |
| Plan del ciclo | Importes planificados, ejecución, pendientes y copia explícita | «Ejecutado» significa gasto o transferencia según la fuente |
| Plan anual | Líneas por Partida y ejercicio; consulta de gastos registrados | Sin proveedores completos de histórico/control, los totales verificados mantienen límites de cobertura |
| Anticipos | Motor sobre transferencias reales acreditadas, recuperaciones y fotos de apertura | No representa el adelanto virtual entre reservas ahora planteado |
| Revisión Comida | Registros bancarios propios, clasificación y vínculos a Movimientos | No crea otro gasto central, pero mantiene datos monetarios separados que hay que relacionar |
| Conciliación e informes completos | Flujo mensual base implementado | Comida por ciclo/E3.5 sigue pendiente; conciliación transversal, resúmenes completos y cierres tienen desarrollo pendiente |

Estas conclusiones se apoyan especialmente en el [cálculo del plan del ciclo](../../apps/api/src/planes-ciclo.ts),
el [maestro Presupuestos](../../apps/api/src/budget-schema.ts), el
[registro de Comida](../../apps/api/src/revision-comida-ledger.ts) y el
[motor anual](../../apps/api/src/plan-anual.ts). También se contrastaron las
[reglas de Saldos](../01-saldos-control-specification.md),
[Clasificación](../02-clasificacion-specification.md),
[Presupuestos](../08-presupuestos-specification.md),
[Plan anual](../10-plan-anual-specification.md),
[Anticipos](../13-anticipos-specification.md) y
[Revisión Comida](../16-revision-comida-specification.md), sus notas de progreso y
la [referencia funcional y su procedencia](../functional-reference-v5.11.md).

Hay cabeceras documentales antiguas que todavía dicen «sin desarrollo» o «sin merge»
pese a existir implementación integrada. Se han priorizado código, notas de vigencia
y Git; **implementado no equivale a aceptación funcional completa**.

## 2. Diagnóstico crítico

Los principales problemas son:

1. **Una misma columna compara cosas distintas.** En unos presupuestos, ejecutar
   significa gastar; en otros, transferir dinero a una cuenta. Esto evita ciertos
   dobles cómputos, pero dificulta responder cuánto se ha previsto, apartado y consumido.
2. **La cuenta bancaria sirve como sustituto imperfecto de una reserva.** La unicidad
   de destino para aportaciones impide atribuir una transferencia dos veces, pero
   también dificulta mantener varias provisiones independientes dentro del mismo banco.
3. **Comida necesita relacionar dos representaciones del mismo ámbito bancario.** El
   diseño actual evita duplicar el gasto económico por contrato; aun así, introduce
   trabajo de vinculación, cobertura y conciliación. No se ha encontrado evidencia
   para afirmar que actualmente todos esos importes se sumen dos veces.
4. **Los terminales sacrifican control de posición.** Si se quiere registrar cada
   compra y cuadrar ING Comida con el banco, mantenerlo como terminal pierde utilidad.
   Eliminar el concepto solo es seguro cuando se pueda reconstruir su posición con
   apertura y operaciones completas.
5. **La propuesta padre/hija une dos jerarquías diferentes:** clasificación del gasto
   y financiación compartida. «Seguro coche» es una finalidad económica; «Gastos
   Anuales» puede ser una bolsa de financiación que agrupa finalidades de categorías
   distintas.

La propuesta acierta al eliminar registros repetidos y separar transferencias de
gastos. Su punto débil es exigir que las reservas pertenezcan a un único Saldo:
cada pago desde otro banco pasa a necesitar una decisión sobre quién adelanta dinero,
aunque todo pertenezca a la misma persona.

## 3. Alternativas

| Alternativa | Ventajas | Desventajas |
| --- | --- | --- |
| A. Partidas como reservas por Saldo, con simples, padres e hijas | Control preciso de qué dinero está apartado en cada banco; árbol intuitivo al principio | Complejidad técnica alta: adelantos, compensaciones parciales, bloqueos y devoluciones; mezcla clasificación y financiación; conciliación adicional |
| B. Reservas globales sobre efectivo elegible, independientes del banco | Menos decisiones por gasto; trazabilidad sencilla; bancos y reservas se comprueban por separado; cambiar de cuenta no genera deuda interna | Hay que mostrar la liquidez del banco pagador aparte; no garantiza que cada reserva esté depositada en una cuenta concreta |
| C. Presupuesto sin reservas | Menor complejidad técnica y de uso; una única ejecución económica | No permite afirmar cuánto dinero está realmente apartado; insuficiente para el objetivo de proteger provisiones |

**Se recomienda B.** Conserva control financiero sin introducir compensaciones
internas en cada pago.

Se elegiría A únicamente si se necesita una garantía operativa concreta: «El dinero
de esta finalidad debe permanecer respaldado en este banco y cualquier uso desde
otro banco debe restituirse». Esa capacidad tiene un coste real de funcionamiento
y mantenimiento.

En extensibilidad, B permite añadir finalidades o cambiar bancos sin multiplicar
relaciones de compensación; A requiere mantener esas relaciones y sus reglas conforme
crezcan los casos. En ambas, la trazabilidad exige vincular el consumo de reserva al
hecho económico único, sin mantener un segundo gasto editable.

## 4. Arquitectura recomendada

Se mantendrían las Partidas como clasificación y se añadirían **reservas opcionales**:

- Una Partida simple puede usar su propia reserva.
- Varias Partidas pueden consumir una reserva común: Seguro coche, IBI y Seguro
  hogar → Gastos Anuales.
- Una Partida puede existir sin reserva.
- La agrupación de financiación no sustituye a Categoría/Subcategoría.

La pantalla de presupuesto podría mostrar el árbol propuesto, con columnas separadas:

| Previsión del periodo | Aportación prevista | Apartado realmente | Gasto realizado | Reserva restante |
| --- | --- | --- | --- | --- |
| Intención de gasto | Intención de financiación | Dinero asignado | Consumo registrado | Dinero todavía apartado |

El total de aportaciones suma las reservas una sola vez. El total de gastos suma
los hechos imputados a las Partidas una sola vez. **No se suman ambas columnas para
obtener «gasto total».**

El «Presupuesto Mensual» puede ser una vista, pero sus decisiones editables por ciclo
siguen necesitando persistencia. Del mismo modo, eliminar la pantalla anual no
elimina la necesidad de conservar previsiones por ejercicio.

El divisor requiere precisión:

- 1.200 € previstos para un año ÷ 12 aportaciones = 100 €.
- 300 € previstos para un trimestre ÷ 3 aportaciones = 100 €.

**1.200 € anuales ÷ 3 no significa automáticamente provisión trimestral.** Hace
falta conocer qué periodo cubre el importe y cuántas aportaciones quedan antes del
pago. Si se empieza a reservar dos meses antes del vencimiento, dividir entre doce
puede dejar la obligación sin cubrir.

## 5. Ejemplos completos

### Asignación inicial y financiación

Hay 2.000 € en OpenBank y 1.000 € en Trade Republic: **3.000 € reales**.

Se asignan:

- Gastos Anuales: 1.000 €.
- Comida: 300 €.
- Colchón: 1.200 €.
- Sin asignar: 500 €.

No existe ingreso ni transferencia: solo se distribuye dinero que ya estaba.

Después entra una nómina de 2.000 € en OpenBank. El efectivo total pasa a 5.000 €;
esos 2.000 € quedan sin asignar hasta repartirlos. Apartar 100 € para Gastos Anuales
deja esa reserva en 1.100 € y reduce lo no asignado en 100 €.

Una transferencia real de 100 € de OpenBank a Trade Republic cambia dónde está el
efectivo, **sin volver a financiar la reserva**.

### Gasto desde otro Saldo, con el modelo recomendado

Continuando el ejemplo, se paga el seguro de 350 € desde OpenBank:

- Un único Gasto: OpenBank → Exterior.
- Partida: Seguro coche.
- Reserva consumida: Gastos Anuales.
- Efectivo total: 4.650 €.
- Reserva Gastos Anuales: 750 €.

No nace una compensación obligatoria: la reserva está respaldada por el efectivo
conjunto. Puede proponerse una transferencia para recuperar el nivel deseado de
OpenBank; hasta realizarla, solo es una intención.

### Si se exigen reservas por banco: compensación real y pendiente

Este ejemplo independiente demuestra la complejidad adicional de A:

| Estado inicial | Trade Republic | OpenBank |
| --- | --- | --- |
| Dinero real | 1.200 € | 500 € |
| Reserva Gastos Anuales | 1.000 € | — |
| Reserva que adelanta: Colchón | — | 500 € |
| Libre | 200 € | 0 € |

OpenBank paga el seguro de 350 €. Si el usuario acepta la compensación:

- El gasto económico es **350 €**, una sola vez.
- OpenBank queda en 150 €.
- Gastos Anuales queda en 650 €.
- En Trade Republic se inmovilizan 350 € para compensar.
- Colchón tiene 150 € disponibles y 350 € pendientes de restitución.

Los 350 € pendientes **no son otro activo del hogar ni dinero disponible en
OpenBank**. En Trade Republic: 650 € reservados + 350 € comprometidos para
compensar + 200 € libres = 1.200 € reales.

Después se realiza y registra una transferencia de 350 € Trade Republic → OpenBank,
vinculada al pendiente:

- Trade Republic: 850 € = 650 € de reserva + 200 € libres.
- OpenBank: 500 € de Colchón.
- Pendiente: cero.
- Gasto acumulado: sigue siendo 350 €.

Una transferencia parcial de 200 € solo resolvería 200 €; quedarían 150 €. Una
transferencia ya registrada debe poder vincularse sin crear otra.

**Rechazar la compensación no puede dejar el gasto sin financiar dentro del reparto.**
Habría que aceptar expresamente que Colchón soporta el coste de forma definitiva,
o elegir otra reasignación válida. El seguro conserva su clasificación económica.

## 6. Casos difíciles e invariantes

| Caso | Tratamiento recomendado |
| --- | --- |
| Mover dinero entre reservas | Reasignación interna con origen, destino e importe; sin Movimiento bancario ni gasto |
| Pago anual/trimestral | Previsión y vencimiento; aportaciones separadas del gasto; reserva acumulable entre ciclos |
| Presupuesto suficiente, reserva insuficiente | Mostrar falta de financiación; no afirmar que lo previsto está apartado |
| Reserva suficiente, banco pagador insuficiente | Falta liquidez local; una reserva global no autoriza un pago bancario imposible |
| Gasto ya realizado con fondos insuficientes en la app | Registrar la realidad y señalar la discrepancia, descubierto o información ausente; no inventar financiación para cuadrar |
| Devolución comercial | Un hecho bancario de entrada vinculado al gasto; reduce gasto neto y restaura reserva o libera fondos según decisión explícita |
| Devolución tras compensación | No resucitar automáticamente una compensación ya liquidada; tratar el nuevo dinero recibido y revisar pendientes abiertos |

Las reglas mínimas serían:

1. **Posición bancaria = apertura acreditada + entradas reales − salidas reales**,
   con conciliación contra extracto. Diferencias y datos ausentes deben quedar visibles.
2. Una transferencia entre cuentas propias no cambia el efectivo total ni el gasto.
3. En el modelo recomendado: **reservas financiadas + dinero sin asignar = efectivo
   elegible**. Cualquier déficit debe aparecer explícito.
4. Una asignación a reservas nunca crea patrimonio ni ingreso.
5. Presupuestar no reserva dinero; reservar no ejecuta gasto.
6. Un gasto se reconoce una vez; el consumo de su reserva es un efecto vinculado,
   no otro gasto editable independiente.
7. Pendientes de transferencia no alteran bancos. Compensaciones internas no aumentan
   patrimonio.
8. Reservas respaldadas por efectivo disponible, sin sumar otra vez posiciones de
   inversión o importes desconocidos.
9. Importes exactos en céntimos; correcciones, devoluciones y anulaciones trazables,
   sin borrar historia.
10. Conciliación bancaria y suficiencia de reservas son controles distintos.

El motor central actual no ofrece una devolución comercial general equivalente a
la de Comida. Ese caso exige refinamiento explícito; no debe forzarse como Nómina,
Intereses o una transferencia interna.

## 7. Qué conservar, fusionar o retirar

| Elemento | Recomendación |
| --- | --- |
| Movimientos | Conservar como fuente de hechos monetarios; ampliar conceptualmente el tratamiento de devoluciones |
| Saldos | Conservar; separar efectivo bancario de valoración de inversiones |
| Partidas | Conservar como imputación económica, con reserva opcional |
| Maestro Presupuestos | Retirar su configuración actual de fuente/destino; trasladar las capacidades útiles al plan y a las reservas |
| Presupuesto Mensual | Integrar su interfaz con reservas y gasto; conservar decisiones por ciclo |
| Presupuesto Anual | Integrar como horizonte del mismo plan; conservar objetivos anuales independientes cuando sean necesarios |
| Revisión Comida | Convertir en vista de Movimientos con clasificación y estado de revisión; mantener extractos importados como evidencia si hacen falta |
| Terminales | Retirar para cuentas bancarias con detalle completo; preservar historia y límites de cobertura |
| Ciclos | Conservar como periodos de planificación e informes; las reservas continúan entre ciclos |
| Anticipos | Conservar para sus casos de transferencias reales; no reutilizarlos automáticamente para compensaciones virtuales |
| Informes | Separar gasto bruto/neto, aportación a reservas, liquidez y previsión; mantener deuda e inversión con sus motores propios |

El saldo inicial manual de Comida dejaría de ser necesario para el cálculo ordinario
si su cuenta se reconstruye de forma continua. Su evidencia histórica debe preservarse.

## 8. Riesgos, decisiones y orden de refinamiento

La decisión principal es **si una reserva protege una finalidad o también exige una
ubicación bancaria concreta**. Resolver ambas cosas a la vez multiplica pendientes
y conciliaciones.

También quedan por decidir: efectivo elegible, tratamiento de déficits, restauración
de reservas tras devoluciones, vencimientos y aportaciones variables, y transición
desde gastos terminales agregados hacia detalle individual.

Se refinaría en este orden:

1. Acordar las preguntas que debe responder la aplicación: cuánto tengo, cuánto está
   apartado, cuánto puedo gastar y cuánto falta por financiar.
2. Elegir reserva global o por banco usando ejemplos completos como el anterior.
3. Resolver asignación inicial, insuficiencias y devoluciones.
4. Unificar planificación mensual/anual, distinguiendo objetivo y financiación.
5. Rediseñar Comida y estudiar la retirada de terminales sin solapar históricos.
6. Revisar impactos en Ciclos, Anticipos e informes.
7. Solo entonces preparar una especificación y una estrategia de migración.

**La mayor simplificación consiste en que cambiar el banco pagador no obligue a crear
una deuda entre las propias reservas.** Se mantendría esa capacidad fuera del modelo
básico salvo que se compruebe que aporta un control realmente necesario.
