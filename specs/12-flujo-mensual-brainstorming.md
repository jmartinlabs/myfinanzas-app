# 12 — E2.6 Flujo mensual base y cobertura explícita: Brainstorming

Status: APPROVED rev3 — Q1–Q4, documento completo, wireframes y56AC aprobados.
Roadmap/context: [E2.6](roadmap.md#e26--flujo-mensual-base-y-cobertura-explícita),
[R3](functional-reference-v5.11.md#r3--planificación-ciclos-y-nómina-secciones-56),
[spec09](09-plan-ciclo-specification.md), [spec10](10-plan-anual-specification.md),
[spec11](11-nomina-prevision-specification.md).
Next action: verificación/publicación documental por política Git; dev12 y merge separados.

## Autorización y preflight

Usuario autoriza mejoras del piloto local y «seguir» con la preparación documental
propuesta de spec12. Main verificado `ed4a272`, dev11 integrada PR63; el piloto
operativo está propuesto en PR64, rama `codex/pilot-spec12-efficiency`. Este borrador
local no forma parte de PR64 ni supone su merge. No publicar como spec aprobada.
Bun1.4.3/Python3.12 disponibles; entorno reutilizado. Sin instalar dependencias,
levantar aplicación ni lanzar suites funcionales por esta ronda. Un ejecutor documental;
QA independiente al candidato. [Cobertura provisional](12-flujo-mensual-testplan.md).
Fuente financiera única v5.11(7), no estable; libro no inspeccionado por Codex.

## Decisiones existentes que no se reabren

- Ciclos es maestro único: Inicio/Fin/corte y referencia financiera vigentes; no mes
  natural ni reloj como sustituto del periodo financiado.
- Realidad bancaria por Movimientos vigentes; Neto histórico/documentado y pronóstico
  no añaden ingresos. N:M de Nómina no duplica un abono ni mueve su fecha al mes salarial.
- Cuota ordinaria conserva su Gasto completo; amortización extraordinaria se muestra
  separada. Partidas sin plan no pierden su ejecución real.
- Plan del ciclo y anual conservan fuentes R3, vacío/0 y ejecución derivada; no duplicar
  ejecución de una aportación con el gasto posterior de su provisión.
- Liquidez depende del atributo Liquidez, no de Finalidad. Consumir motores existentes,
  sin otro maestro, fórmulas o históricos inventados.
- E2.6 es flujo base con cobertura explícita. Neto Compartido, Comida y flujo completo
  se integran en E3.6/E4.7; no simular consumidores ausentes ni anticipar cierres/fotos.

## Round 1 — apertura tras autorización del piloto

Q1. ¿Qué indicadores y fórmulas físicas exactas forman este flujo base, distinguiendo
Ingresos, Gastos, amortización extraordinaria y ahorro/márgenes?
- [x] Propuesta: confirmar con evidencia de tablas/Criterios las fórmulas y fuentes de
  cada indicador antes de diseñar sus agregados; mostrar ejecución separada de plan/pronóstico.
- [ ] Alternativa: acordar un subconjunto inicial explícito y diferir las métricas sin definición.
Confirmed answer: PENDING; source/date: PENDING. La recomendación marcada no es respuesta.

Q2. ¿Qué indicador de liquidez entra en E2.6 y a qué fecha se refiere para ciclos pasados?
- [x] Propuesta: corte/procedencia visibles y resultado no disponible cuando el motor
  no permita acreditar la posición requerida; no reconstruir fotos ni usar el actual como histórico.
- [ ] Alternativa: presentar solo posición actual claramente separada del periodo, si se aprueba ese alcance.
Confirmed answer: PENDING; source/date: PENDING. No cambia las reglas vigentes de Saldos.

Q3. Con consumidores futuros ausentes, ¿qué subtotales parciales pueden mostrarse y qué
resultados globales quedan no disponibles?
- [x] Propuesta: declarar cobertura por componente, mostrar subtotal verificable como
  parcial y conservar motivos de ausencia; no completar con cero ni afirmar flujo completo.
- [ ] Alternativa: diferir expresamente los indicadores que dependan de fuentes todavía ausentes.
Confirmed answer: PENDING; source/date: PENDING. No se propone duplicar Neto Compartido.

## Coverage

Preparación de matriz antes del candidato: periodos, fuente/identidad, cobros múltiples,
cuota/amortización, partidas sin plan, liquidez/corte, cobertura parcial, errores y
concurrencia de lectura. Casos/comandos definitivos tras respuestas y spec aprobada.
Datos de consulta, API/DTO, diseño y límites numéricos sin decidir no se implementan.
No se presupone nueva persistencia por ser una entrega nueva.

## Wireframes

Pendientes de las métricas/cobertura y su primera propuesta. No hay diseño aprobado.

## Append-only clarifications

Nuevas respuestas se incorporarán con procedencia; no reescribir Q1–Q3 ni marcar
conformidad parcial como aprobación completa. Sin desarrollo, SQL, Excel, deploy o merge.


## Resolución posterior Q1–Q3 — fuente usuario, contraste de Álex

El mensaje «Spec12 — E2.6 Flujo mensual: decisiones funcionales Q1–Q3» aprueba las
propuestas con precisiones. Álex atribuye el contraste a Cálculos, Presupuesto Mensual,
Saldos, Resumen y Criterios v5.11(7), R3/R6 y roadmap. Codex no inspecciona el libro.
Las respuestas PENDING de la ronda1 quedan resueltas por este registro posterior;
no se reabren. No se autoriza desarrollar, SQL/Excel, crear PR ni hacer merge.

Q1 confirmada: periodo/corte solo Ciclos y hechos vigentes del intervalo verificable.
Nómina cobrada=Ingresos Subtipo Nómina; Bonus=Ingresos Bonus; Otros=resto de Ingresos,
incluyendo Intereses (desglose opcional sin duplicarlos); Total=suma de los tres.
No Histórico/Documentado/Pronóstico como cobros. Parte del Excel usa tblNominaIRPF:
diferencia explícita respecto a la verdad bancaria de app, sin segunda fuente ejecutada.
Gasto bruto=todos los Gastos elegibles: cuota ordinaria íntegra, sin presupuesto,
compartidos brutos y terminal una vez. No Transferencias ni extraordinarias.
Cuotas pagadas=subconjunto Gasto con ID Deuda válido. Extraordinaria=Amortización deuda.
Total pagado deudas=Cuotas+Extraordinaria, desglose informativo que no se resta otra vez.
Capital/Intereses solo del motor Deudas disponible/verificable.
Saldo operativo bruto observado=Total ingresos−Gasto bruto−Extraordinaria, siempre
PARCIAL y solo con tres componentes verificables; no Ahorro real/Margen definitivo/
variación total de Saldos/flujo patrimonial completo.
Margen frente a nómina real=Nómina real verificable del ciclo−SUM(Del mes planificado).
Margen estructural=Media válida de Ordinarias estructurales referencia−SUM(Base planificada).
Físico informado: B8=C49−B5 condicionado a nómina informada; G8=C48−G5; C48 media de
Neto estructural Ordinarias últimos12meses; B5 suma Del mes; G5 suma Base.
Sin referencias antiguas por posición/último valor ni margen definitivo de plan vacío/
incompleto. Márgenes de plan, no ahorro realizado; ahorro residual no deducido de
Transferencias propias. Definición operativa de la ventana/media se eleva en Q4.

Q2 confirmada: Liquidez actual=SUM(Saldo actual de activos con Liquidez=Sí), motor
Saldos único. No deriva de Finalidad/Mostrar como bolsa/Entidad/nombre. Posición no
verificable excluida del subtotal conocido, ausencia no convertida a0 ni total completo
con cobertura insuficiente. Fecha/corte real soportado por motor. Para ciclos antiguos,
actual solo como contexto independiente con fecha; histórica al corte solo por
reconstrucción verificable o fotografía válida compatible, si no No disponible. No
mes natural como corte financiado. Objetivos/meses cubiertos/umbrales quedan para R6/E4.6.

Q3 confirmada: mostrar componentes disponibles con fuente y alcance. Pendientes Neto
Compartido/recuperaciones, Comida/compensaciones, netos E3, ahorro generado no verificable,
patrimonio/histórico no verificado y flujo/márgenes netos/cierre definitivos. Reutilizar
futuros motores E3.6/E4.7; no cálculos alternativos. Cero verificado exige periodo y
fuentes válidos sin hechos; No disponible=falta dato/motor; Parcial=subtotal comprobable
con ausencias; Completo=todas las fuentes requeridas de ESA métrica verificadas.
No disponible no se transforma en cero al sumar. Integridad y trazabilidad intactas,
sin histórico anterior al control inventado.

## Ronda2 — Q4 material nueva: referencia estructural de12meses

La fórmula aprobada no fija todavía anclaje exacto de la ventana ni unidad/denominador
cuando hay varias Ordinarias distintas del mismo mes o faltan meses/datos. Spec11
permite esas pagas y no instala un motor de media12meses. Su referencia única de
pronóstico no sirve como selección automática de todas las pagas de una media.

Q4. Precisar con fórmula física/Criterios: mes de anclaje para el ciclo seleccionado,
extremos de la ventana12meses, si se promedian pagas o totales mensuales y denominador,
y tratamiento de meses ausentes/pagas incompletas o discrepantes. No completar con0,
sumar pagas distintas ni elegir una por orden sin contrato explícito.
- [x] Propuesta: conservar la fórmula física contrastada y documentar esas selecciones;
  hasta resolver, margen estructural No disponible con motivo y Base conocida aparte.
- [ ] Alternativa: diferir expresamente ese indicador hasta una entrega aprobada posterior.
Confirmed answer: PENDING. La propuesta no es una respuesta ni reapertura Q1–Q3.

## Candidato documental rev1 y wireframes

[Especificación rev1](12-flujo-mensual-specification.md) y
[cobertura diseñada](12-flujo-mensual-testplan.md). Q1–Q3 incorporadas con cuatro
niveles de autoridad. Read model propuesto sin nueva persistencia, fórmulas explícitas,
propagación de cobertura, wireframes escritorio/móvil y AC estables de revisión.
Q4 impide cerrar el contrato del margen estructural. Aprobación completa y visual
pendientes, sin pruebas funcionales ejecutadas, código/SQL/Excel/PR/merge.


## Revisión documental independiente rev1

SPEC12-DOC-QA:PASS por lectura de los tres borradores, sin hallazgos materiales.
Fórmulas/cobertura Q1–Q3, deuda sin doble resta, S parcial y separación temporal de
liquidez conformes;40AC mapeados y propuestas visuales/técnicas identificadas.
No suites ni contraste físico del libro. Q4 mantiene abierto AC24/margen estructural;
no se declara especificación completa aprobada. Verificaciones locales de estructura,
enlaces, whitespace y40IDs únicos PASS. Candidato specification SHA256:
`46a70b42a679d97872bc0262cb6b692f2119ad1bb5973dc0fba91047b4a7ada6`.
Siguiente acción: respuesta Q4 y revisión completa/wireframes. Sin PR/merge ni dev12.


## Precisiones definitivas posteriores de Q1–Q3

Fuente: respuestas del usuario a las tres preguntas originales, con contraste físico
atribuido a Álex. Complementan las decisiones ya registradas; no reabren Q1–Q3 ni
resuelven todavía Q4. Solo documentación/wireframes; no código, SQL/Excel, PR o merge.

Q1, físico tblCalculosFlujoMensual: D primera Ordinaria tblNominaIRPF por Fecha ingreso
dentro de ciclo y Neto; E suma de Netos Bonus por Fecha ingreso; F Ingresos Movimientos
sin Nómina/Bonus; G=D+E+F. H Gastos excluyendo Tipo referencia Gasto compartido más Neto
tblGastosCompartidos por Fecha inicio del ciclo. I Variación ahorro=Ahorro cierre actual
menos anterior; primera fila contra aperturas de Saldos Finalidad Ahorro. J Gastos
ordinarios con ID Deuda D* más Amortización deuda con ID Deuda D*. K suma de posiciones
de columna mensual tblSaldos Finalidad Ahorro; L suma de posiciones mensuales con
Liquidez=Si. No todos aptos para traslado literal a E2.6; no equivalencia entre H y
Gasto bruto de app ni entre columnas mensuales y corte financiado verificable.

App: todos los ingresos ejecutados solo banco. Extraordinaria exige ID Deuda válido;
no inferir validez solo de prefijo ni meter histórico anual precontrol Cálculos!B54:B59
al ciclo sin cobertura específica. C49 físico consulta Nómina del último ciclo con
Inicio; app usa Nómina verificable del ciclo seleccionado. C48 sigue media estructural
Ordinarias12meses, sin Bonus excepcional o margen puntual que redefina presupuesto.

Ahorros distintos: variación entre posiciones verificadas en cortes consecutivos;
residual ejecutado por Presupuesto de Ahorro según R3; generado anual del Excel=flujos
netos a Finalidad Ahorro excluyendo S015 del subtotal general, más bloque Ahorro Niños
y compras de inversión. No fusionar ni tratar reubicación de capital como ahorro
nuevo. S015 es excepción física del subtotal anual, no exclusión de Liquidez actual.
Solo mostrar métrica de ahorro con todas sus fuentes/posiciones verificadas; sin
histórico, Variación ahorro/Ahorro cierre histórico No disponible. No nuevos motores
inversión, ahorro neto alternativo o flujo E3.6/E4.7.

Q2: elegibilidad/estado del maestro Saldos vigentes y fecha/corte verificable del motor;
no liquidez deducida ni posiciones por mes natural inferidas. Actual contextual
independiente de ciclo antiguo; histórica No disponible sin fuente/foto válida.
Estados Verificado/Parcial/No disponible/Cero verificado; no transferencias automáticas
ni objetivos/meses cubiertos/umbrales/dashboard R6 anticipados.

Q3: fuentes/periodo/corte/motivos por indicador; mostrar conocidos sin ocultarlos por
otras fuentes ausentes. Gasto neto Compartidos, flujo ajustado por casos, Comida,
ahorro económico generado, patrimonio y resultado global definitivo no disponibles
hasta motores correspondientes. No ajustes improvisados. E3.6 casos/conciliaciones y
E4.7 flujo completo/comparaciones mantienen alcance. Revisión Comida no crea otro
Gasto, devoluciones Anticipo no se descuentan dos veces, Neto Compartido no se añade
al bruto sin sustitución/ajuste aprobado. Verificado significa completo para alcance
de esa métrica, no flujo global completo. Ausencia histórica de registros no prueba
inexistencia de operaciones.

Rev2 amplía procedencia física, fronteras de ahorro y cobertura diseñada conservando
AC01–40; agrega AC41–47 para nuevas precisiones. Q4 sigue siendo el único pendiente
material: anclaje, unidad/denominador y ausencias de la media estructural12meses.


## Revisión independiente rev2 — 2026-10-25

SPEC12-DOC-QA PASS del delta, sin conflictos materiales: correspondencia D–L física,
Deuda válida en extraordinarias, ahorros separados/S015 anual, estados/wireframes y
AC41–47 mapeados. Solo lectura documental, sin pruebas, edición o aprobación de spec.
Candidato specification rev2 SHA256:
`3172e9e26990bfa93b1f192e47f7701c18b0b4fe79ea3f3b54d7fd4e8c559240`.
Q1–Q3 cerradas; Q4 sigue pendiente. No desarrollo, SQL/Excel, PR o merge. Siguiente:
resolver Q4 y someter documento completo/wireframes a revisión final del usuario.


## Resolución posterior Q4 — 2026-10-25

Fuente: usuario «Spec12 / E2.6 — Q4: Media de Neto estructural de Ordinarias», contraste
físico atribuido a Álex sobre Presupuesto Mensual!C48 v5.11(7); no inspección de Codex.
Q4 resuelta. Las menciones pendientes anteriores son historia y quedan sustituidas
por este registro. La decisión autoriza incorporación documental, no código/Excel/merge.
Se mantienen las restricciones de publicación/desarrollo de Q1–Q3.

Físico: ancla MAXIFS(Mes nómina,Tipo,Ordinaria); inicio EDATE(ancla,-11), final ancla
incluida; numerador SUMIFS de Neto estructural Ordinarias del intervalo y denominador
COUNTIFS de filas Ordinaria del intervalo. Denominador0→vacío. Promedia registros,
no meses; varias Ordinarias cuentan varias veces y filas con Neto estructural vacío
pueden incrementar el denominador. Se documenta la limitación, no se traslada a app.

App: ancla última Ordinaria válida con Mes nómina no posterior al corte financiero
del ciclo, sin futuras; ventana ancla y11meses previos. Consolidar por mes Netos
estructurales de Ordinarias distintas/verificadas evitando duplicados documentales.
Media de totales mensuales válidos, denominador número de meses válidos, no12 fijo.
Sin Ordinaria o sin información suficiente: no0 ni mes válido; mostrar ausencias/
incompletitud. Discrepancia salarial distinta de parcialidad de banco: falta de
conciliación por sí sola no invalida documentación salarial válida. N=0→No disponible;
N<12→Parcial y N/12, no referencia plenamente cubierta. Margen=Media−SUM(Base),
consumiendo exclusivamente motor central Nómina, sin otra media en E2.6.

Propuestas de integridad concretadas en rev3 para revisión completa: si una paga
necesaria del mes no es verificable, no presentar suma de las otras como total mensual
válido; si duplicidad documental no se resuelve con identidad/evidencia, mes pendiente,
sin descartar pagas distintas por compartir Mes/Tipo/importe. Motor Nómina expone
referencia estructural documental coherente sin promover neto bancario parcial ni
cambiar automáticamente el derivado Neto histórico o el pronóstico de E2.5. Con
media Parcial y Base completa, margen calculable solo como Parcial; Base incompleta
mantiene margen No disponible. Ninguna propuesta ejecuta cambios estructurales.


## Revisión independiente rev3 y presentación completa — 2026-10-25

SPEC12-DOC-QA PASS del delta Q4, sin contradicciones materiales: físico por filas
separado de consolidación mensual app/N, referencia documental distinta de parcialidad
bancaria, extensión central de Nómina identificada como propuesta y sin cambiar
forecast E2.5 por inferencia. AC24–25/36/48–56 cubiertos por vectores M1–M10, cobertura
propagada en wireframes. Q1–Q4 cerradas. No pruebas ni aprobación de spec/desarrollo.
Candidato specification rev3 SHA256:
`d0455fe20725864a85a6b63be3a31327669210b33fd324984f4cb3189d70a1ba`.
Estructura/enlaces/whitespace y56IDs consecutivos comprobados, no suites funcionales.
Siguiente gate: revisión/aprobación de spec12 completa y wireframes, incluidas las
propuestas de integridad/exposición documental del motor central; desarrollo separado.
Sin SQL/Excel, PR o merge. Los estados anteriores se preservan como historia.


## Aprobación completa rev3 — 2026-10-25

Solicitud única inmediatamente anterior: «¿Apruebas la especificación completa de
spec12 rev3 y sus wireframes, incluidos sus56 criterios de aceptación? La aprobación
es documental; no autoriza desarrollo ni merge». Respuesta real: «si aprobada».
Aprueba todo el contrato rev3, incluidas integridad mensual y exposición documental
del motor Nómina descritas como propuestas; Q1–Q4 cerradas y wireframes aprobados.
Candidato previo a ajustes administrativos SHA256:
`d0455fe20725864a85a6b63be3a31327669210b33fd324984f4cb3189d70a1ba`.
SPEC12-DOC-QA PASS sin conflictos materiales; estructura/enlaces/56AC PASS, no pruebas
funcionales ni equivalencia física demostradas. Solo se actualiza el estado de
aprobación de la specification, conservando fórmulas/casos/diseño mediante comprobación
reversible del texto. Las restricciones de PR de las decisiones funcionales previas
no autorizaban su publicación entonces; el documento ya aprobado sigue ahora la
política Git del proyecto. No desarrollo, SQL/Excel, merge o despliegue. Fuente y
aprobación completa posteriores resuelven los pendientes históricos superiores.
Siguiente: commit/PR documental y sus checks; merge y dev12 requieren autorización propia.
