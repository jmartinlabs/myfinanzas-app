# 12 — E2.6 Flujo mensual base y cobertura explícita: Specification

Status: APPROVED rev3 — especificación completa, wireframes y56AC aprobados.
Approval source/date: usuario «si aprobada», 2026-10-25, respuesta a la solicitud
única de aprobar spec12 rev3 completa, sus wireframes y56 criterios de aceptación.
Las propuestas técnicas/UX e integridad de esta revisión quedan aprobadas documentalmente;
no se atribuyen al Excel ni autorizan desarrollo, SQL/Excel, merge o despliegue.
Context and brainstorming: [registro12](12-flujo-mensual-brainstorming.md),
[roadmap E2.6](roadmap.md#e26--flujo-mensual-base-y-cobertura-explícita),
[R3/R6](functional-reference-v5.11.md). Cobertura: [testplan12](12-flujo-mensual-testplan.md).
Solo alcance documental. Publicación de documentación conforme a política Git;
sin autorización de implementación, SQL/Excel, merge o despliegue.

## Functionality

Consultar hechos bancarios y gastos del ciclo financiado, desglosar deuda sin duplicar
su gasto, presentar márgenes del plan y liquidez actual con su propio contexto. Mostrar
fuentes y cobertura por indicador: completo para su definición acotada no equivale a
flujo financiero completo. Ninguna cifra documental/prevista se convierte en ejecutada.

### Autoridad de cada regla

| Nivel | Fuente / alcance | Tratamiento |
| --- | --- | --- |
| Fórmulas físicas contrastadas por Álex | B8=C49−B5 condicionado a nómina informada; G8=C48−G5; C48 media de Ordinarias estructurales12meses; B5 Del mes/G5 Base | Procedencia atribuida al usuario, sin inspección propia ni equivalencia numérica afirmada |
| Contratos app ya aprobados | Ciclos/fechas centrales, Movimientos bancarios, Deudas/Saldos, planes y Nómina E2.5 | Reutilizar motores; originales, IDs y ausencias preservados |
| Adaptaciones confirmadas Q1–Q3 | Nómina/Bonus reales solo Movimientos, compartidos brutos con cobertura, saldo operativo parcial, liquidez actual separada | Diferencias respecto a fórmulas/limitaciones Excel declaradas, sin cambiarlo |
| Propuesta técnica/UX rev3 | Read model de consulta, DTO de cobertura, composición trazable, pantallas, precisión y consistencia | Sujeta a revisión del documento completo, no capacidades ya ejecutadas |
| Pendientes E3/E4 | Neto Compartido, Comida, netos E3, patrimonio/fotos/cierre definitivo, R6 global | Señalar ausencia y consumir futuro motor, no sustituirlo |

### Correspondencia física contrastada por Álex

| Columna de tblCalculosFlujoMensual | Fórmula/fuente física informada | Adaptación o límite de E2.6 |
| --- | --- | --- |
| D Nómina | Primera Ordinaria tblNominaIRPF con Fecha ingreso en ciclo; toma Neto | Sumar Ingresos bancarios Nómina, no primera paga ni Neto documental |
| E Bonus | Suma Netos Bonus con Fecha ingreso en ciclo | Sumar Ingresos bancarios Bonus; cada hecho una vez |
| F Otros ingresos | SUMIFS Ingresos excluyendo Nómina/Bonus | Mismo criterio por hechos vigentes/periodo verificable |
| G Total ingresos | D+E+F | Mismas magnitudes separadas, fuentes ejecutadas solo Movimientos |
| H Gasto | Gastos sin Tipo referencia Gasto compartido + Neto tblGastosCompartidos por Fecha inicio | Gasto bruto app NO equivale a H; neto ajustado No disponible hasta motor |
| I Variación ahorro | Ahorro cierre actual−anterior; primera fila contra aperturas Finalidad Ahorro | Exige posiciones/cortes/cobertura verificables; no inferir historia ni copiar fallback de primera fila |
| J Pagado deudas | Gastos ordinarios con ID deuda D* + Amortización deuda con ID deuda D* | Relación Deuda válida del motor; prefijo por sí solo no acredita validez |
| K Ahorro cierre | Suma posiciones columna mensual tblSaldos con Finalidad Ahorro | No convertir mes natural en corte del ciclo ni actual en histórico |
| L Liquidez cierre | Suma posiciones columna mensual con Liquidez=Si | Actual independiente; histórica solo con fuente/foto verificable compatible |

Presupuesto Mensual: C49 físico consulta la Nómina del último ciclo con Inicio informado;
la app debe sustituir esa selección por la Nómina verificable del ciclo seleccionado.
C48 físico es SUMIFS de Neto estructural dividido por COUNTIFS de filas Ordinaria
en ventana12meses, según Q4; su adaptación mensual se detalla abajo. B8=C49−B5 condicionado a nómina informada y G8=C48−G5 se conservan
como referencias físicas; B5 suma Del mes, G5 Base. Bonus excepcional y margen real
puntual no redefinen automáticamente el presupuesto estructural. Cálculos!B54:B59 es
histórico precontrol del resumen anual: no se incorpora al ciclo automáticamente.

Q4 distingue el comportamiento físico del Excel de la adaptación mensual aprobada
conceptualmente para la app. La aprobación funcional no equivale a aprobar el documento
completo o autorizar el desarrollo. No quedan preguntas Q1–Q4 abiertas.

## Data model and contracts

Read model propuesto, no tablas nuevas ni migración por defecto. Consulta con ID de
Ciclo y lectura de motores instalados. No admite edición de hechos, plan o Nómina.

| Fuente única | Aporte a E2.6 | Frontera |
| --- | --- | --- |
| Ciclos y referencia financiera central | Inicio, Fin temporal, corte efectivo, mes financiado y verificabilidad | No mes natural/reloj como ventana; no inferir cierre financiero |
| Movimientos vigentes | Ingreso/Gasto/Amortización por Fecha bancaria real e ID | No sumas desde Nómina ni duplicar Transferencias |
| Deudas y relaciones por ID | Elegibilidad de cuota/extraordinaria, capital/intereses verificables | No reconstruir desglose ni exigir activo a una Deuda histórica válida |
| Plan del ciclo | Líneas/IDs y Base/Del mes, cobertura independiente por campo | Esencial no sustituye Base; anual no se suma otra vez al plan mensual |
| Nómina E2.5 | Neto estructural/documentación verificables para referencia de media | No banco alternativo; último pronóstico no sustituye media12meses |
| Saldos | Posición actual y atributo Liquidez/estado, procedencia | No segunda implementación de posición; actual no es cierre histórico |
| Motores E3/E4 futuros | Netos/compensaciones/historia/fotos compatibles | Contratos de integración, no fuentes instaladas ficticias |

### Periodo y verificabilidad

Inicio/Fin/corte se obtienen del maestro y contratos temporales vigentes. Incluir
Fecha>=Inicio y Fecha<=corte efectivo central, sin extenderlo a Fin futuro. En abierto,
Fin sigue vacío y corte según referencia central. Ciclo futuro no iniciado o sin corte/
fuentes verificables no devuelve ejecución0 ficticia. Mostrar límites y motivo, incluso
cuando solo el contexto actual de Saldos pueda consultarse.

Una tabla instalada o consulta vacía no prueban por sí solas cobertura histórica. La
métrica exige periodo verificable y fuentes válidas para ese intervalo; si faltan,
No disponible. No añadir fecha de inicio de control ni inventar historia para rellenar.
Si el contrato acredita intervalo/fuentes y no hay hechos elegibles,0 verificado.
Todo hecho anulado queda excluido; relaciones históricas por ID no se borran por
inactividad o renombre actual. Sin alterar cierres/fotos ni crear snapshots de consulta.

### Ingresos ejecutados

Para el intervalo verificable, definir I como Movimientos vigentes Tipo Ingreso:

```text
Nómina cobrada = SUM(Importe de I con Subtipo Nómina)
Bonus cobrado = SUM(Importe de I con Subtipo Bonus)
Otros ingresos = SUM(Importe de I de todos los demás Subtipos)
Total ingresos = Nómina cobrada + Bonus cobrado + Otros ingresos
```

Intereses puede desglosarse dentro de Otros: Intereses+Resto de otros=Otros, nunca
Total+Intereses de nuevo. Conservar subtipos actuales sin catálogo salarial paralelo.
Un Ingreso sin asociación a paga sigue siendo un hecho real del ciclo; asociación
pendiente no equivale a banco pendiente de ejecución. N:M cuenta un Movimiento una
vez, aunque pague varias Ordinarias/Bonus o meses salariales. Varios abonos mantienen
IDs y ciclos reales distintos. Neto histórico/documentado/estructural y pronóstico no
se añaden ni sustituyen el cobro. No usar SUMIFS/XLOOKUP salarial por mes para vincular
banco a ciclo; esa limitación del Excel no es la verdad bancaria aprobada de app.

### Gastos y deuda

```text
Gasto bruto registrado = SUM(Importe de Movimientos Tipo Gasto elegibles)
Cuotas ordinarias pagadas = SUM(Importe del subconjunto Gasto con ID Deuda válido)
Amortización extraordinaria = SUM(Importe de Movimientos Tipo Amortización deuda con ID Deuda válido)
Total pagado deudas = Cuotas ordinarias pagadas + Amortización extraordinaria
```

Todos vigentes dentro del intervalo, manteniendo el Gasto ordinario completo, incluida
su parte de intereses. Incluye Partidas sin presupuesto/línea de plan, compartidos por
bruto y gastos de terminales una vez. No se filtra Gasto por fuente R3 del presupuesto,
Referencia o financiación interna. Transferencias y Amortización no son Gasto bruto.
Financiar un terminal no añade gasto; una Transferencia propia no genera ahorro.
Mencionar flujos Exterior no habilita operaciones hoy rechazadas por el motor ni
cambia validaciones de Transferencias vigentes.

La elegibilidad de extraordinarias también exige ID Deuda válido, no solo texto D*
o Concepto. Si una fuente contiene relaciones inválidas/incompletas, declarar el
problema de cobertura, no presentar un subtotal que las omite como completo. No
importar al ciclo importes precontrol del resumen anual sin cobertura específica.

Cuotas son subconjunto de Gasto, no gasto adicional. Total deudas es informativo, no
se resta otra vez del Gasto ni del resultado operativo. Un ID Deuda válido se obtiene
de relaciones del motor, sin inferir por nombre/Concepto. Capital amortizado e Intereses
solo si el motor único ofrece desglose verificable del mismo alcance/periodo; no derivar
uno como resto supuesto ni sumar importes de apertura como pagos del ciclo. Si falta
ese desglose, mostrar No disponible sin borrar la cuota/extraordinaria verificables.
Antes del futuro dev, comprobar el alcance temporal expuesto por Deudas; capital
pendiente actual no sustituye capital amortizado/intereses del intervalo consultado.
La ausencia de fuentes netas E3 no excluye el Gasto bruto ya registrado ni lo convierte
en gasto compartido neto. La futura integración no sustituye silenciosamente esta definición.

### Saldo operativo bruto observado

```text
S = Total ingresos − Gasto bruto registrado − Amortización extraordinaria
```

Solo calcular cuando los tres componentes sean verificables. S siempre lleva etiqueta
PARCIAL: deja fuera netos/ajustes y consumidores aún ausentes. Signo negativo y0 válidos,
sin clamp ni semáforo que lo declare ahorro. Si un componente falta, S No disponible;
mostrar sus componentes conocidos aparte, no restar un subtotal incompleto como si fuera
el componente entero. No denominar S «Ahorro real», «Margen definitivo» o «Flujo patrimonial
completo», ni identificarlo con variación total de Saldos. Transferencias internas,
flujos hacia/desde Exterior y registros patrimoniales tienen tratamientos propios.

Ejemplo exclusivamente ficticio: Nómina2000+Bonus200+Otros50=Ingresos2250;
Gasto bruto1800 (incluye Cuotas300); Extraordinaria100; Total deudas400 informativo;
S=350 PARCIAL, no−50 por volver a restar deudas. Gasto puede incluir compartido bruto
sin motor neto. Sin Gasto verificable, S no se convierte en2250−0−100.
Gasto neto ajustado por Compartidos permanece No disponible hasta integración; no
identificar Gasto bruto con H del Excel ni sumar Neto Compartido al bruto sin el
modelo de sustitución/ajuste correspondiente. Revisión Comida no añade segundo Gasto
económico; devolución de Anticipo no se descuenta dos veces. Esas integraciones quedan
a E3.6, y el flujo completo/comparaciones temporales a E4.7.

### Márgenes de planificación

```text
Margen frente a nómina real = Nómina real verificable del ciclo − SUM(Del mes)
Margen estructural / frente a nómina media = Media válida estructural12meses − SUM(Base)
```

Nómina real usa el subtotal bancario Nómina del ciclo, sin Bonus/Otros salvo otra
modificación financiera expresamente aprobada. No reemplazar ausencia por última paga
conocida, Neto histórico/documentado o pronóstico. Distinguir ausencia de información de
un0 bancario verificado en periodo/fuentes válidos; los0 informados no se descartan como
faltantes. La restricción física «nómina informada» no habilita fallback a otro ciclo.

Sumar importes de líneas planificadas existentes por ID, conservando inactivas históricas
válidas. Cobertura independiente para Base y Del mes: un campo informado no completa
otro. No usar Esencial ni repartir automáticamente presupuesto anual. Sin líneas: Sin
plan, no objetivo0. Con líneas y algún importe requerido vacío: cobertura incompleta,
subtotal conocido visible como Parcial y margen No disponible, no cifra definitiva.
Cero explícito se suma; importes negativos del margen se conservan. Presupuestos con
hechos sin línea siguen señalados Sin planificar según contrato E2.3 (ejecución positiva
comparable); no crear líneas ni asumir su objetivo0. La completitud se refiere al plan
registrado y campo mostrado, no afirma que cada necesidad financiera tenga un objetivo.

Ejemplo ficticio: Nómina2000, Del mes1900 → Margen frente a nómina real100 del PLAN.
Con Del mes=0 explícito →2000; con Del mes vacío →No disponible. No es ahorro ejecutado.
Base1800 se conserva aunque margen estructural quede No disponible por referencia.

### Motor central de media estructural — resolución Q4

**Fórmula física C48 contrastada por Álex:**

```text
anclaExcel = MAXIFS(tblNominaIRPF[Mes nómina], tblNominaIRPF[Tipo], "Ordinaria")
inicioExcel = EDATE(anclaExcel, -11)
numeradorExcel = SUMIFS(Netos estructurales de Ordinarias en [inicioExcel, anclaExcel])
denominadorExcel = COUNTIFS(filas Ordinaria en [inicioExcel, anclaExcel])
mediaExcel = numeradorExcel / denominadorExcel; si denominadorExcel=0, vacío
```

Es media de registros: varias Ordinarias del mes cuentan por separado; una fila sin
Neto estructural puede contar en el denominador. El ancla física no se restringe al
ciclo consultado. Estas son limitaciones identificadas, no reglas trasladadas literalmente.

**Adaptación funcional Q4 para app:**

```text
corte = corte financiero verificable del ciclo seleccionado (motor Ciclos)
ancla = último Mes nómina de Ordinaria válida cuyo mes no sea posterior a corte
ventana = mes ancla y sus 11 meses anteriores, incluidos
T(m) = SUM(Neto estructural de Ordinarias distintas, documentadas y verificadas del mes m)
V = meses de esa ventana con total mensual estructural válido
N = número de meses de V
mediaEstructural = SUM(T(m), m en V) / N; si N=0, No disponible
cobertura = N/12; si 0<N<12, media Parcial; si N=12, Verificada para esa ventana
margenEstructural = mediaEstructural − SUM(Base de las líneas del plan)
```

No reloj, última fila, paga futura ni último ciclo global como ancla alternativa.
Aplicar Mes nómina al corte del ciclo, no Fecha de ingreso o conciliación. Ciclo sin
corte verificable→No disponible; no construir ventana supuesta. Un cambio de mes cruza
año correctamente. No ampliar hacia atrás para reunir doce meses válidos ni mover
el ancla para ocultar ausencias. Si hay filas más recientes incompletas, no fijan el
ancla; presentar el ancla válida usada y su cobertura, con avisos relevantes de fuentes.

Consolidar todas las Ordinarias distintas y verificadas del mismo mes; no elegir una
sola por el desempate del pronóstico ni promediar pagas individuales. Deduplicar
representaciones de la misma paga mediante ID/evidencia y revisión; Mes/Tipo/importe
coincidentes no demuestran duplicidad. Varias pagas legítimas iguales se conservan.
Sin evidencia suficiente para resolver una posible duplicación, mostrar revisión
pendiente sin eliminar originales o sumar dos veces el mismo documento.

Propuesta conservadora de completitud para revisión: si una paga conocida necesaria
hace indeterminado el total mensual, ese mes no es válido aunque otra Ordinaria del
mes sea completa. Mostrar el importe conocido separado como parcial, sin introducirlo
en el numerador ni denominador de meses válidos. Igual para duplicidad documental o
incoherencia salarial no resuelta que impidan determinar el total. Ausencia de mes
no aporta0 ni cuenta; Neto estructural mensual0 documentado/verificado sí cuenta.
Se preservan importes documentales originales negativos legítimos y sus validaciones,
sin imponer aquí otra regla del forecast sobre el histórico.

**Documentación salarial y banco separados.** Cobro parcial/no asociado/diferencia
bancaria no invalidan por sí solos una paga documental válida. A la inversa, cobro
coincidente no valida documentación incoherente. Cada referencia requiere operandos
salariales/fiscales suficientes, fuente válida y revisión; una discrepancia entre
originales exige su revisión explícita, no elección automática de lo que cuadre con
el banco. Seleccionar referencia conciliatoria no verifica automáticamente operandos
fiscales ni elimina una incoherencia salarial pendiente.

El motor central Nómina es dueño de la elegibilidad documental, el Neto estructural,
consolidación mensual y media. Propuesta de contrato de aplicación a revisar con este
documento: exponer una referencia estructural documental verificable por paga y sus
operandos/fuente, además del resumen mensual. Si el Neto estructural existente es
parcial por proceder de abonos parciales, no promoverlo a completo: usar únicamente
una referencia documental válida y coherente con las fórmulas salariales E2.5 dentro
del mismo motor. Si no existe, informar incompleto. Esto no sobrescribe Neto histórico,
Neto documentado ni la prioridad del derivado Neto instalado, ni cambia el contrato de
pronóstico o banco de E2.5 por inferencia. No aplicar mecánicamente el filtro del
pronóstico para declarar inválida toda paga con banco sin conciliar. Es una extensión
lógica documental, no código, DDL o nueva persistencia autorizados.

E2.6 consume valor exacto, N/12, ancla/ventana, meses incluidos/excluidos y motivos,
IDs/procedencias/revisiones del motor Nómina. No reconstruye esa media en su read model.
No completar ausencias con0 ni usar meses calendario como si fueran ciclos financiados:
la ventana salarial pertenece a la referencia, el banco sigue por fechas del ciclo.

N=0: media y margen No disponible. N entre1y11: media Parcial; con Base completa, el
margen derivado se muestra «Margen estructural parcial», nunca referencia plenamente
cubierta. N=12 y Base completa: margen Verificado para el alcance registrado. Base
vacía/incompleta o Sin plan mantiene margen No disponible, aunque la media sea válida;
los subtotales conocidos siguen visibles. No elevar cobertura al pasar por una fórmula.
Calcular sobre totales exactos, dividir una vez y restar Base antes de formatear a2
decimales; no redondear cada paga/mes ni restar una media visual ya redondeada.

Ejemplo ficticio: dos Ordinarias distintas de un mes con estructurales1000y500 y otra
Ordinaria de otro mes con2000 → totales1500y2000, N=2, media1750 Parcial2/12, no
1166,67 por promediar tres pagas ni291,67 por divisor12. Base1600 completa→margen150
Parcial. Mes ausente no cuenta; mes adicional válido0 sí cuenta (N=3, media exacta3500/3).

### Ahorro: tres definiciones que no se fusionan

| Métrica | Definición / fuente | Condición de presentación E2.6 |
| --- | --- | --- |
| Variación de ahorro | Diferencia entre posiciones verificables de ahorro en cortes de periodos consecutivos | Solo con ambas posiciones, cortes y cobertura compatibles; si falta reconstrucción, No disponible |
| Ahorro cierre histórico | Posición de ahorro verificable al corte del periodo | No disponible sin fuente histórica compatible; no usar actual o columna de mes natural como prueba |
| Ahorro residual ejecutado | Ejecución del ID de Presupuesto de Ahorro conforme a R3 | Consumir resultado/fuente/periodo del motor Presupuestos; sin identidad o ejecución verificables, No disponible |
| Ahorro generado anual del Excel | Flujos netos a Saldos Finalidad Ahorro excluyendo S015 del subtotal general + bloque separado Ahorro Niños + compras de inversión | Descripción física del anual; no motor nuevo ni fórmula alternativa de E2.6 |

Ahorro cierre es posición; variación es diferencia de posiciones; residual es ejecución
de un presupuesto; generado anual del Excel integra otras fuentes. No tratarlos como
sinónimos ni presentar Transferencias entre Saldos propios como ahorro económico nuevo.
La excepción S015 corresponde al subtotal anual físico, no modifica la elegibilidad
de Liquidez actual ni crea una exclusión transversal de Saldos o Gastos.

Consumir R3 por ID estable del presupuesto pertinente y su fuente, sin detectar un
presupuesto por nombre ni recalcular todas las Transferencias en un motor paralelo.
No dar por disponible ese dato si identidad/cobertura no están acreditadas. Si existe
y es verificable puede mostrarse como «Ejecución del Presupuesto de Ahorro», separado
del ahorro económico generado, sin prometer que sean el mismo resultado. No se crean
objetivos/líneas de plan automáticamente para obtenerlo.

No se introducen ahorro neto alternativo, motor de inversión o aperturas históricas
inferidas. La primera fila física de I contra aperturas se documenta como tal, sin
adoptarla como reconstrucción financiera de un ciclo de la app. Una métrica de ahorro
solo se calcula si todas las fuentes/posiciones de su definición están disponibles;
no sustituir las ausentes por ajustes parciales. La ausencia de registros con historia
incompleta no prueba que no existieran operaciones. R6/E3.6/E4.7 conservan sus consumidores.

### Liquidez y temporalidad independiente

```text
Liquidez actual = SUM(Saldo actual de Saldos activos con Liquidez = Sí)
```

Consumir resultados del motor Saldos, no reproducir apertura+entradas−salidas ni sus
reglas por Tipo/Control. Finalidad, Mostrar como bolsa, Entidad y nombre no seleccionan
la métrica. Mantener ausencias de atributos sin convertirlas a false por presentación.

Si posiciones elegibles no son verificables: excluirlas de la suma conocida y mostrar
cobertura (incluidos/excluidos y motivos), subtotal conocido Parcial; no total completo.
Si ninguna posición requerida es verificable, No disponible, no0 por suma vacía. Solo
universo elegible/posiciones verificados sin importe distinto de0 permite0 completo.
Si la pertenencia no puede verificarse por atributo histórico ausente, advertirlo sin
inventar pertenencia ni normalizarlo; la propuesta conservadora no afirma total completo.

Fecha/corte indica lo realmente soportado por motor, junto al momento de consulta si
es útil. Un timestamp de respuesta no se presenta como fecha de valoración bancaria.
El periodo seleccionado y la fecha de Liquidez actual son contextos separados. Para
ciclo antiguo, puede mostrarse actual como contexto independiente etiquetado y fechado;
no usarla para S, margen o variación del ciclo. Liquidez histórica al corte solo si hay
reconstrucción verificable o fotografía válida compatible con ese corte financiado,
fuentes, identidades y cobertura. No usar fotografía de mes natural por coincidencia
de nombre ni fabricar foto/reconstrucción. Sin proveedor instalado verificable:
«Liquidez al corte del ciclo: No disponible». Integración futura distinta del actual.
Objetivos, meses cubiertos y umbrales globales R6/E4.6 permanecen fuera de E2.6.
El indicador no ordena Transferencias automáticas ni representa saldo presupuestario,
ahorro o patrimonio por equivalencia nominal.

### Cobertura por métrica

| Estado | Condición | Presentación |
| --- | --- | --- |
| Verificado (completo para su alcance) | Periodo/contexto y todas las fuentes de esa definición acotada verificadas | Importe y fuente/fecha; no implica flujo global completo |
| Cero verificado | Condiciones anteriores y sin hechos elegibles o resultado0 demostrado |0 explícito, sin confundirlo con falta de fuente |
| Parcial | Subtotal comprobable y fuentes/completitud faltantes; o S por definición | Etiqueta icono+texto PARCIAL, alcance y ausencias; no total definitivo |
| No disponible | Falta dato/motor/contexto indispensable o cálculo material pendiente | Sin cifra calculada, motivo y componentes conocidos aparte |

No convertir null a0 al sumar. Una métrica real completa no vuelve completo todo el
flujo; no usar porcentaje global ficticio. Mostrar lista explícita pendiente: gasto
Compartido neto/recuperaciones, Comida/compensaciones, netos E3, ahorro generado si
requiere fuentes ausentes, variación patrimonial, liquidez histórica no verificable,
flujo completo/márgenes netos/cierre definitivo. Futuros E3.6/E4.7 consumen motores
centrales, sin fórmula alternativa persistida aquí. Confirmar fuentes instaladas al
futuro desarrollo y no declarar ausente un motor que entonces sí exista.

## Screens and interfaces

Wireframes rev3 aprobados el2026-10-25, datos ficticios; no UI implementada. Identidad clara MyFinanzas, tabla compacta
1440 y bloques/tarjetas390. No colores sin icono/texto ni gráficos que oculten ausencias.
Consulta principal por Ciclo/ID; mes financiado del maestro, no selector de mes natural
que sustituya sus fechas. Plan/pronóstico/documentación separados de cobros reales.

```text
Flujo mensual BASE                        Ciclo [ID / Mes financiado v]
Inicio20/06 · Fin19/07 · Corte19/07 [Fuente:Ciclos / referencia central]
! Cobertura parcial del modelo · [Ver fuentes y pendientes]

EJECUCIÓN BANCARIA DEL CICLO            Estado de esta métrica   [Ver hechos]
Nómina cobrada             2.000,00 €   Verificado · Movimientos
Bonus cobrado               200,00 €   Verificado
Otros ingresos               50,00 €   [Intereses / Resto]
Total ingresos            2.250,00 €   Verificado
Gasto bruto registrado    1.800,00 €   Verificado como Gasto bruto
  Incluye cuotas300; compartidos brutos; terminal; sin plan [Ver detalle]
Amortización extraordinaria 100,00 €   Verificado
! Saldo operativo bruto observado350,00 € · PARCIAL
  No representa ahorro real ni variación patrimonial completa.

DEUDA — DESGLOSE INFORMATIVO
Cuotas300,00 € + Extraordinaria100,00 € = Total pagado400,00 €
Capital / Intereses [motor Deudas / No disponible con motivo]
No se resta este total otra vez.
```

```text
PLAN Y REFERENCIAS                     Importe       Cobertura / fuente
Del mes del plan                       1.900,00 €    4/4 líneas informadas
Nómina real del ciclo                   2.000,00 €    Movimientos, mismo corte
Margen frente a nómina real               100,00 €    Margen del PLAN
Base del plan                          1.800,00 €    Base informada
Media estructural12meses              1.750,00 €     ! PARCIAL · 2/12 meses válidos
Ancla [Mes válido ≤ corte] · Ventana [ancla−11meses .. ancla]
MesA:1.500,00 €(2 pagas distintas) · MesB:2.000,00 €(1 paga)
[Ver meses incluidos, ausentes/incompletos, duplicados y fuentes]
Margen estructural                     −50,00 €     ! PARCIAL (Base1.800,00 €)
No es una referencia estructural plenamente cubierta.
Alternativas:0/12→No disponible;12/12→Verificado si Base completa;
Base incompleta→Margen No disponible aunque la media esté informada.
[Consultar plan] [Consultar referencias salariales / procedencia]
Pronóstico informativo [Ver Nómina] — no añade cobros a esta tabla.

Estado alternativo:Del mes2/4 informado → Subtotal conocido Parcial;
Margen frente a nómina real:No disponible. Sin líneas:Sin plan.
```

```text
CONTEXTO ACTUAL — INDEPENDIENTE DEL CICLO ANTIGUO SELECCIONADO
Liquidez actual:PARCIAL · Subtotal verificable2.400,00 €
Posiciones verificadas2/3 · 1 excluida [Ver Saldo/motivo]
Fecha/corte soportado:[fuente real del motor] · Consulta:[momento]
No es la liquidez al cierre del ciclo.
Liquidez al corte19/07:No disponible — sin reconstrucción/foto verificable.

COBERTURA DEL MODELO
[✓] Banco/periodo verificados para cifras marcadas completas
[!] Pendiente:Neto Compartido/recuperaciones · Comida · netos E3
[—] Gasto neto Compartidos / Comida / flujo ajustado:No disponible
[—] Variación ahorro / Ahorro cierre histórico:No disponible (sin posiciones históricas)
[?] Ejecución Presupuesto de Ahorro:R3 verificado por ID / No disponible con motivo
[—] Ahorro económico generado / patrimonio / resultado global definitivo:No disponible
[Ver fuentes y alcance por indicador]
```

Móvil:selector/fechas arriba, bloque de estado+importe+fuente por métrica, detalle de
hechos mediante enlace y deuda informativa separada. Plan y contexto actual en bloques
propios; el aviso de Parcial y su motivo permanece visible sin depender de tooltips.
Ausencia numérica se expresa «No disponible», no guion ambiguo ni0. Consultar Ciclo
histórico no cambia la fecha del bloque actual. Se propone mantener el filtro al volver
del detalle de una fuente por ID, sin introducir datos financieros en URLs o logs.

## Empty, loading and error states

Sin ciclos:sin periodo seleccionado, no tablas de ejecución0. Sin referencia/corte o
fuente:No disponible con motivo; no completar con reloj. Periodo verificable sin hechos:
0 verificado por métrica aplicable, S0 aún PARCIAL; sin plan permanece Sin plan.
Carga, error y reintento conservan Ciclo/filtros; respuesta antigua no sustituye la
selección nueva. Error de una fuente no borra contexto de otras ni se trata como0:
mostrar alcance/estado y bloquear solo agregados dependientes. Un dato previo retenido
se marca desactualizado; no se anuncia completo para un contexto distinto. Sesión
expirada conserva selección y pide volver a autenticar sin exponer información bancaria.

## API behavior and external dependencies

Propuesta de consulta protegida por ID Ciclo, sin endpoints financieros de escritura.
Reutilizar autenticación y controles existentes para todo método; no rutas de fixtures
ni bypass. DTO EUR exacto como string, fechas civiles ISO y metadatos por métrica:
valor/null, estado, definición/fuente, periodo o momento soportado, cobertura/motivos,
IDs/procedencias/revisiones y desgloses sin duplicar hechos. Estado/error no se deduce
solo de HTTP200. No exponer SQL, factores ni payload bancario en logs públicos.

Composición propuesta coherente por snapshot de lectura/revisiones de motores. El
periodo, plan, banco y fuentes de referencia no se mezclan de revisiones incompatibles;
si cambia contexto, descartar/reintentar lectura y conservar la selección. Liquidez
actual lleva su contexto propio aunque sea parte de la misma respuesta. Paginación de
hechos no trunca agregados; consultas de catálogos/posiciones abarcan todos los IDs
relevantes y conteos, no solo primera página. Sin mutaciones, fotos, reserva financiera
ni nuevas tablas por cachear resultados de consulta.

## Validation and edge cases

Aritmética exacta compatible con motores: importes y sumas sin Number binario/overflow
silencioso, signo y0 conservados. Medias mensuales de Q4
con precisión decimal/racional y sin redondeo prematuro; presentación EUR2decimales
según contrato común, sin reutilizar valores visuales para calcular otras métricas.
No declarar equivalencia con artefactos de Excel sin vectores sanitizados contrastados.
Validar ID/periodo, fuentes/cobertura, relaciones históricas y revisión; no imponer
límites financieros arbitrarios o reglas de nombres nuevos.

Q1–Q4 resueltas. Comprobar trazabilidad documental, consolidación y cobertura de la
media en el futuro desarrollo autorizado. El documento completo y sus wireframes
quedan aprobados documentalmente; no se infiere autorización de implementación.

## Exclusions

Desarrollo, SQL/Excel, merge/deploy por esta revisión; motor fiscal/bancario paralelo,
Neto Compartido o Comida simulados, dashboard/objetivos R6, cierres/fotos reconstruidos,
importación de histórico real, planes/ingresos inventados y ahorro por Transferencias
propias. No duplicar gasto terminal, cuota, abono N:M o presupuesto anual/mensual.

## Acceptance checks

Diseñados y aprobados documentalmente, NO ejecutados. IDs estables; sin desarrollo autorizado.
Mapeo roadmap:E2.6-AC1→AC01–06/19–26/35–38; AC2→AC07–15; AC3→AC16–18/27–34/39–40.
AC01–47 conservados/precisados; AC48–56 cubren Q4. Cobertura diseñada antes del
candidato en testplan12. No resultados funcionales ejecutados ni desarrollo autorizado.

| ID | Acción / precondiciones | Resultado observable esperado |
| --- | --- | --- |
| AC-01 | Hechos en Inicio/corte y fuera del intervalo | Incluir solo vigentes dentro de ventana central, límites incluidos |
| AC-02 | Ciclo abierto/cerrado, referencia central cambia | Corte del maestro, no reloj o fin/mes natural supuesto |
| AC-03 | Sin periodo/fuente verificables o ciclo futuro | No disponible con motivo, no ejecución0 fabricada |
| AC-04 | Ingresos Nómina y Bonus en distintos meses salariales | Sumar por Subtipo/Fecha del ciclo, identidades preservadas |
| AC-05 | Otros e Intereses separados | Otros contiene Intereses; desgloses suman Otros sin doble ingreso |
| AC-06 | N:M, cobro sin asociar, Histórico/Documentado/Pronóstico | Banco una vez aunque sin vínculo; importes documentales/previstos no se suman |
| AC-07 | Gasto de Partida sin presupuesto o plan | Incluido en Gasto bruto, sin crear línea automática |
| AC-08 | Cuota ordinaria capital+interés | Gasto bruto incluye cuota íntegra una vez |
| AC-09 | Gasto terminal y Transferencia de financiación | Un Gasto, sin financiación añadida ni déficit supuesto |
| AC-10 | Compartido bruto sin motor neto | Incluido bruto, cobertura neta pendiente visible |
| AC-11 | Transferencia propia/Exterior y amortización | No Ingreso/Gasto por reclasificación; extraordinaria separada, sin ahorro inventado |
| AC-12 | Gasto con Deuda válida hoy inactiva | Cuota informativa por ID válido, historia preservada |
| AC-13 | Amortización extraordinaria vigente/anulada e ID Deuda válido/inválido | Solo vigente con relación válida en intervalo; relación no verificable impide completitud |
| AC-14 | Cuotas300/extra100/Gasto1800/Ingreso2250 | Total deudas400 informativo; S350, no−50 por restar dos veces |
| AC-15 | Capital/Intereses disponibles frente a desconocidos | Solo motor Deudas verificable; desconocidos no se calculan por diferencia |
| AC-16 | Tres componentes S verificables y netos futuros ausentes | S calculado siempre PARCIAL, nunca Ahorro real/flujo completo |
| AC-17 | S negativo o0 verificado | Valor con signo/0, sin truncar; etiqueta PARCIAL |
| AC-18 | Un componente S no verificable | S No disponible, conocidos aparte sin null→0 |
| AC-19 | Nómina2000 y Del mes1900 completos | Margen del plan100 del mismo ciclo; no Bonus/histórico/forecast añadidos |
| AC-20 | No existen líneas de plan | Sin plan; no suma0 o margen definitivo automático |
| AC-21 | Base completa/Del mes incompleto y viceversa | Cobertura por campo; margen dependiente no disponible, subtotal Parcial |
| AC-22 | Del mes0 explícito frente a vacío |0 decidido se suma; vacío conserva falta de información |
| AC-23 | Plan anual/Esencial y hecho sin línea | No doble plan ni Esencial como Base; Sin planificar según E2.3, sin nueva línea |
| AC-24 | Media estructural12meses con varias Ordinarias/meses ausentes | Totales mensuales verificados, ancla válida al corte y divisorN, nunca filas o12 fijo |
| AC-25 | Fuente salarial futura/incompleta/incoherente frente a banco parcial | Excluir incoherencia no resuelta; documentación válida no se invalida solo por cobro parcial |
| AC-26 | Periodo y fuentes válidos sin hechos frente a fuente desconocida |0 verificado distinto de ausencia; nunca nómina antigua trasladada al ciclo |
| AC-27 | Saldos activos/inactivos y Liquidez Sí/No | Sumar solo activos Sí con posición verificable del motor |
| AC-28 | Cambiar Finalidad/bolsa/Entidad/nombre | Sin sustituir atributo Liquidez ni derivar pertenencia por esos campos |
| AC-29 | Posiciones o pertenencia no verificables | Subtotal conocido Parcial con exclusiones; todo desconocido No disponible, no total0 |
| AC-30 | Seleccionar ciclo antiguo y consultar actual | Liquidez actual independiente, fecha/fuente reales; no cierre histórico supuesto |
| AC-31 | Histórico sin proveedor o foto incompatible de mes natural | No disponible; solo fuente verificable compatible permite cifra histórica |
| AC-32 | Consultar liquidez/contexto R6 | Sin objetivos, meses cubiertos, umbrales o dashboard anticipado |
| AC-33 | Componente completo y modelo global parcial | Estados por definición; no completo global ni porcentaje de cobertura ficticio |
| AC-34 | Motores E3/E4 ausentes | Pendientes visibles y sin ceros, netos o cálculos paralelos |
| AC-35 | Consultar y volver de fuente | Sin modificar hechos/planes/documentos/cierres/fotos; IDs y relaciones históricos intactos |
| AC-36 | Sumas grandes/tasas medias/medio céntimo | Exactitud sin redondeo intermedio ni overflow silencioso; media mensual exacta conforme Q4 |
| AC-37 | Cambio de Ciclo/contexto durante carga o paginación | Sin mezcla de revisiones ni respuesta antigua; total no truncado por página |
| AC-38 | Consulta anónima/sesión expirada/error servidor | Acceso protegido, errores sin SQL/datos sensibles; selección conservada |
| AC-39 |390/1440, teclado/contraste/ausencias | Wireframes por aprobar; posterior UI real legible con icono+texto y fuentes |
| AC-40 | Ciclo histórico y catálogos renombrados/inactivos | Periodos/IDs preservados, sin inventar datos precontrol ni reescribir historia |
| AC-41 | Comparar Gasto bruto con H física y futuro Neto Compartido | Diferencia explícita; bruto no se presenta como H ni se suma de nuevo el Neto |
| AC-42 | Variación ahorro/Ahorro cierre con posiciones históricas ausentes o incompatibles | No disponible, sin mes natural/actual/apertura inferida como histórico del ciclo |
| AC-43 | Presupuesto de Ahorro con ID/R3 verificables frente a identidad/ejecución ausente | Resultado de R3 separado de ahorro generado; desconocido No disponible, sin cálculo por nombre |
| AC-44 | Regla anual física con S015, Niños e inversión | Procedencia anual explícita, sin excluir S015 de Liquidez ni adelantar motor anual/inversión |
| AC-45 | C49 física apunta al último ciclo distinto del seleccionado | Nómina real del ciclo seleccionado; no fallback a último ciclo/paga ni presupuesto redefinido por Bonus |
| AC-46 | Histórico anual precontrol Cálculos!B54:B59 disponible | No incorporarlo automáticamente al ciclo ni inventar cobertura anterior al control |
| AC-47 | Integración futura Compartidos/Comida/Anticipos | No doble Neto+bruto, segundo Gasto Comida o doble descuento Anticipo; estados pendientes hasta motores aprobados |
| AC-48 | Ciclo histórico, Ordinaria posterior al corte y ancla válida anterior | Ancla por Mes salarial válido≤corte, ventana incluida ancla−11meses; no futura/reloj/último global |
| AC-49 | Dos Ordinarias distintas1000+500 de un mes y2000 de otro | T(m)=1500/2000, N2, media1750 Parcial2/12; no promedio por tres filas |
| AC-50 | Representaciones duplicadas de una paga y pagas legítimas iguales | Una paga por identidad/evidencia; no descartar distinta por Mes/Tipo/importe; duplicidad no resuelta pendiente |
| AC-51 | Mes sin Ordinaria o con una paga suficiente y otra indeterminada | No0 ni denominador; mes indeterminado excluido de media válida y motivo/importe conocido parcial visibles |
| AC-52 | Documentación salarial válida y abono parcial frente a incoherencia documental | Falta conciliación sola no excluye; no promover neto bancario parcial ni validar documento por coincidencia |
| AC-53 | Mes válido0, meses ausentes y N0 |0 documentado cuenta en N; ausencia no; N0→Media/Margen No disponible |
| AC-54 | N1–11/N12 con Base completa, vacía o incompleta | Cobertura N/12; media parcial propaga margen parcial; sin Base completa margen No disponible |
| AC-55 | Consumir media/cambiar fuentes documentales | Un motor Nómina con IDs/revisiones/meses/motivos; E2.6 no calcula otra media ni reescribe históricos |
| AC-56 | Comparar C48 física COUNTIFS de filas con vacío y consolidación app | Diferencia de denominador/ancla explícita, sin afirmar equivalencia literal Excel/app |
