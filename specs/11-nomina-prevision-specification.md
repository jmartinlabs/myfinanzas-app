# 11 — E2.5 Nómina histórica y previsión separada: Specification

Status: APPROVED rev3 — especificación completa, relación técnica N:M y wireframes aprobados.
Approval source/date: usuario «Aprobadas», 2026-10-24, respuesta inmediata a la solicitud
única de aprobar spec11 rev3 completa, relación técnica N:M y wireframes.
Sin autorización de desarrollo, SQL, migración, Excel o merge.
Context and brainstorming: [decisiones11 y resolución M1](11-nomina-prevision-brainstorming.md),
[roadmap E2.5](roadmap.md#e25--nómina-histórica-y-previsión-separada),
[referencia](functional-reference-v5.11.md#e25--precisión-de-nómina-q1q3-2026-10-24).
Fuentes físicas atribuidas al contraste de Álex, no inspección independiente de Codex.
Las ampliaciones descritas como propuestas de app quedan aprobadas documentalmente
en esta revisión; no se atribuyen al Excel ni autorizan implementación.

## Functionality

Preservar la paga documentada y sus originales, sin confundirla con abono bancario,
ciclo financiado o pronóstico. Una paga tiene ID estable, Mes nómina y Tipo Ordinaria/
Bonus; varias pagas distintas del mismo Mes/Tipo son válidas con evidencia. Guardia
es atributo de Ordinaria, no ingreso/paga adicional automático. Los hechos realizados
proceden solo de Movimientos; un pronóstico o registro futuro/incompleto no los crea.
No se entregan motor fiscal nuevo, calendario de Ciclos o importador de Excel real.

## Autoridad: físico, limitaciones y ampliaciones

| Ámbito | Regla / procedencia | Tratamiento |
| --- | --- | --- |
| Excel comprobado por Álex | Originales, fórmulas salariales, prioridades de Neto, MINIFS/SUMIFS y LOOKUP; escenario+0,27pp sin ROUND explícitos | Conservar procedencia y fórmulas, sin afirmar contraste numérico propio |
| Limitaciones Excel | Asociación por mes/Subtipo; XLOOKUP primera Ordinaria; LOOKUP última fila física y agregación mensual | No trasladarlas como relaciones inequívocas, unicidades o selección de negocio |
| Criterios C176 | Una paga real por un Ingreso, según evidencia transmitida | Límite del modelo físico; no afirmar equivalencia con N:M |
| App, concepto aprobado Q4 | N:M por IDs e importe asignado, varias pagas/abonos/meses y mixtos | Diseño técnico aprobado documentalmente; sin cambiar Excel |
| App propuesta Q5/Q6 | Referencias por mes/identidad/evidencia; exactitud decimal y validaciones | Diferencias explícitas, no nuevas fórmulas fiscales ni equivalencia aún demostrada |

## Data model and contracts

Modelo lógico, no DDL ni aprobación implícita de modificación estructural.

| Concepto | Datos / fuente | Invariante |
| --- | --- | --- |
| Paga documentada | ID estable, Mes nómina, Tipo, Guardia, Devengo, Base IRPF, IRPF%, Variable, Neto histórico, Nota, procedencia | Originales preservados; Mes/Tipo no únicos; sin PK por nombre/fecha bancaria |
| Neto documentado (€) | Dato manual opcional, evidencia salarial identificable, procedencia y auditoría | Campo independiente de Neto histórico; vacío≠0; nunca obtenido del banco |
| Derivados | Retención total, Neto, Deducciones no IRPF, Neto estructural, Origen neto y estado de completitud | No sobrescriben originales; fuente y carácter parcial visibles |
| Movimiento real | ID, Tipo/Subtipo, Fecha, Importe, Destino y revisión del ledger | Un solo hecho bancario, no copiado ni dividido por la asociación |
| Asociación N:M propuesta | ID paga+ID Movimiento, importe asignado, revisión y evidencia/motivo; auditoría | Una pareja vigente; importe positivo; suma global por Movimiento≤importe real |
| Pronóstico | Variable prevista€, Ajuste IRPF pp, escenario, periodo/contexto y referencia por ID/revisión | Informativo, sin escrituras a banco, histórico, presupuesto o Ciclos |

Neto documentado€ es dato manual opcional aceptado por el usuario: evidencia salarial
identificable y procedencia, sin copiarlo de Movimientos ni calcularlo desde lo cobrado.
Neto histórico conserva su propio valor/procedencia. No completar uno desde el otro
silenciosamente ni sobrescribir originales. Vacío y0 informado son distintos.
Al informar/corregir Neto documentado, auditar valor anterior/posterior, referencia de
evidencia, actor/motivo aplicable y revisión; no adjuntar documentación personal a Git
ni añadir aquí un sistema de subida/almacenamiento de documentos no especificado.

Preflight de arquitectura del futuro dev:comprobar si existe campo con semántica
idéntica; reutilizarlo en tal caso, sin mezclar dato documental con importe bancario.
Inspección documental actual del código:no existe entidad Nómina/Neto documentado,
solo subtipos de Ingreso y menciones de Ciclos. No hay cambio de esquema autorizado.
Que un campo se llame Neto en otro módulo no demuestra identidad semántica.

### Asociaciones N:M — contrato técnico aprobado documentalmente

Una paga admite varios abonos parciales y un abono admite varias pagas. No hay condición
de igualdad de meses. El importe asignado describe reparto documental; no es otro
Movimiento ni modifica Fecha/Importe/Destino/Subtipo bancarios. Asociar requiere IDs
y evidencia explícitos, sin automatismo por proximidad, Concepto o igualdad de importe.

La unión elegible parte de Movimientos vigentes Tipo Ingreso/Subtipo Nómina o Bonus.
Intereses/Promoción quedan fuera. En abonos ordinarios se presenta correspondencia
habitual Ordinaria/Nómina y Bonus/Bonus; un abono documental mixto puede repartirse
entre tipos conservando el Subtipo original. La diferencia de tipos se hace visible
y exige desglose/evidencia; no se rechaza automáticamente un mixto autorizado ni se
crean dos ingresos para hacerlo encajar. No nuevo Subtipo o maestro bancario.

Antes de confirmar, mostrar todas las asignaciones del Movimiento, incluidas las de
otras pagas/meses: importe real, total asignado antes/después y resto. Validar importes
finitos, positivos y exactos a la unidad monetaria bancaria, sin exceder globalmente
el importe del hecho; no solo limitar cada pareja. Doble envío idempotente y dos
procesos no pueden reservar el mismo remanente. Revalidar revisiones de paga/hecho/
conjunto de asignaciones, evidencia y protecciones en la misma transacción.

Una modificación/desvinculación conserva auditoría, no borra paga/hecho. Correcciones
de Importe/Subtipo/anulación de Movimiento deben informar su impacto; si dejan vínculos
inconsistentes, no seguir contándolos como asignaciones bancarias verificadas ni moverlos
a otra paga automáticamente. Movimiento real y su propia corrección siguen siendo la
verdad bancaria. Conservar trazabilidad/aviso de revisión y protecciones financieras.
No fabricar un hecho ni borrar historia para cuadrar el reparto.

### Importes, conciliación y fechas

Total cobrado de una paga=suma de sus asignaciones vigentes verificables. Número de
ingresos=número de IDs bancarios distintos vinculados válidos, no número de ediciones.
Remanente de un Movimiento=importe real−suma de asignaciones válidas. Sin evidencia,
remanente «Pendiente de asociación», manteniendo el hecho real ya ejecutado.

Referencia documental para conciliar: Neto documentado válido o, cuando corresponda,
Neto histórico original válido. Resolver con procedencias y revisiones visibles:

- Un único candidato informado, válido y acreditado, sin fuente discrepante: usarlo
  indicando origen;0 informado es candidato real, no ausencia.
- Ambos informados y coincidentes: conservar ambos originales/procedencias, sin copia
  ni generar un abono. Coincidencia monetaria no acredita asociación o cobro completo.
- Ambos informados y discrepantes: «Discrepancia documental»; no elegir por prioridad
  silenciosa, por coincidir con el banco o por proximidad. Propuesta de resolución:
  revisión explícita de fuentes y selección justificada de la referencia válida con
  evidencia/motivo y revisiones de ambos originales. Hasta resolver, Diferencia/Fecha
  completa no disponibles; los cobros/fechas reales siguen visibles.
- Sin referencia suficientemente válida o con fuente informada pendiente de verificar:
  no disponible con motivo. No fallback silencioso que oculte una discrepancia.

Diferencia=referencia documental válida−Total cobrado real asociado verificable.
Positiva:resta por conciliar; negativa:exceso, sin truncarlo ni fabricar ingresos para
cuadrar. Sin referencia válida o cobertura suficiente, no cifra definitiva, aunque haya
Ingresos. No inferir que una paga no se cobró por carecer de vínculos; «Sin cobros
asociados» es distinto de «No cobrada». No convertir igualdad de cantidades en vínculo
verificado ni en evidencia salarial.

La resolución de referencia de conciliación no cambia automáticamente la prioridad de
Neto salarial descrita en Q5 ni sus originales: es un contrato separado del importe
bancario y del pronóstico. Si la discrepancia afecta datos necesarios de referencia
fiscal, no declararlos suficientemente verificables por haber conciliado una cantidad.
Toda fuente seleccionada para pronóstico conserva su propio contexto/procedencia.

Mostrar primera y última Fecha bancaria reales, lista de abonos, total, número y
diferencia. MINIFS del mismo mes se conserva como descripción Excel, no como filtro
que pierda pagos fuera de mes. Fecha de cobro completo solo desde abonos bancarios
asociados suficientes y referencia válida, con conciliación acreditada; nunca desde
Fecha documental, previsión o coincidencia monetaria aislada. Propuesta conservadora: con diferencia0 demostrada,
fecha del abono que completa el acumulado ordenado por Fecha real; sin prueba suficiente,
fecha vacía y motivo. No deducir una fecha por tener un importe, ni por Fecha documental.
Un neto documentado0 sin abonos no inventa fecha de cobro. La política de conciliación
es propuesta de app; no se atribuye como nueva fórmula física de Excel.

El flujo computa cada Movimiento una sola vez en el ciclo de su Fecha bancaria por
maestro Ciclos, aunque reparta entre varias pagas o tipos. Asignaciones no añaden ingreso
al ledger. Histórico, documentado y estimado no se suman otra vez al total bancario.
Fuentes salariales del flujo no usan XLOOKUP de primera Ordinaria ni SUMIFS mensual
para decidir a qué paga pertenece un abono. No recalcular cierres/fotografías inmutables.

### Casos completos de vínculo propuesto — datos ficticios

| Caso | Asociación / observación | Efecto en realidad bancaria |
| --- | --- | --- |
| PagaA junio; abonos600 y300 en julio | Dos IDs, asignación600+300 aA; fechas julio; Mes salarial junio | Dos ingresos reales, cada uno en su ciclo real; no fusión |
| PagasA/B mismo Mes/Tipo | IDs de paga independientes; vínculos según evidencia | No selección de primera fila ni unicidad artificial |
| Abono1500 pagaA1000+pagaB500 | Dos asociaciones al mismo ID; remanente0 | Un ingreso1500, no1500 por cada paga |
| Abono1000 asignado600 | Remanente400 pendiente de asociación | Ingreso1000 permanece realizado, no solo600 |
| Abono agrupado Ordinaria/Bonus de distintos meses | Reparto por IDs/importes y evidencia de desglose | Mantener un hecho y su Subtipo original |
| Sin evidencia de paga | Abono sin atribución salarial definitiva | Movimiento intacto y contabilizado por su Fecha real |
| Neto histórico0 y abono positivo | Histórico0 intacto; candidato de conciliación si válido, sin discrepancia oculta | No reemplazar original ni duplicar ingreso |
| Documentado1000 e histórico900 | Discrepancia y revisión explícita, sin elegir por cobrado | Movimiento/ambos originales intactos; sin diferencia definitiva hasta referencia válida |
| Documento neto desconocido, abonos parciales vinculados | Se conoce lo asignado; conciliación completa/diferencia no demostrables | No elevar cobrado a documentado ni inventar fecha completa |

### Derivados físicos comprobados por Álex

Usar tasas con unidad inequívoca. IRPF porcentual15% equivale a tasa0,15; pp no es
porcentaje relativo. No se indican estos números como valores personales.

```text
Retención IRPF total = Base IRPF × IRPF
Deducciones no IRPF = Devengo − Retención IRPF total − Neto

Neto estructural:
  Bonus: vacío
  Ordinaria, Guardia no es Sí: Neto
  Ordinaria, Guardia es Sí:
    (Devengo − Variable) − (Base IRPF − Variable) × IRPF
    − (Devengo − Retención IRPF total − Neto)
```

Prioridad Excel de Neto: histórico informado (incluido0), si falta SUMIFS Ingresos
por mes natural/Subtipo, sin valores vacío. Origen:Histórico/Movimientos/vacío según
fuente. Fecha ingreso física:primera por MINIFS del mes/Subtipo. No sobrescribir estos
originales con cálculos o clasificaciones posteriores. Guardia no informada se conserva
como tal, sin convertir el atributo a No; la rama física «no es Sí» se documenta separada
de cualquier comprobación de completitud exigida a una referencia futura.

### Adaptación explícita del Neto a la app — contrato documental aprobado

Para el derivado salarial Neto, histórico informado conserva prioridad y origen
Histórico según el contrato transcrito; informar Neto documentado no lo reemplaza
automáticamente. La referencia de conciliación se resuelve por su protocolo separado.
Sin histórico, Neto con origen
Movimientos usa la suma atribuida a la paga por asociaciones verificables, no todos
los Ingresos del mismo mes/Subtipo. Sin datos atribuibles, vacío; no suma vacía0 como
prueba de pago. Se muestra junto a total cobrado y completitud, sin sumar ambos.

Si esas asignaciones son parciales o falta importe documental, el resultado bancario
no se etiqueta como Neto documentado completo. Deducciones/Neto estructural calculados
con un Neto parcial propagan esa limitación; no constituyen deducciones definitivas
ni referencia salarial/fiscal verificable para pronóstico. No completar la parte no
cobrada con histórico inventado. Q5 confirmó fórmulas físicas; este cambio de fallback
para admitir N:M es ampliación propuesta de app y queda identificado como tal.

### Referencia de pronóstico — propuesta concreta de desempate

Elegibles:Ordinarias documentadas con los datos necesarios completos y verificables,
no pagas futuras/incompletas. Mes salarial más reciente elegible en el contexto/corte
consultado. Si hay varias en ese mes, pedir selección explícita de ID con evidencia;
no elegir mayor ID, última inserción o sumar sus importes. Mantener la selección/revisión
visible; si cambia la fuente, exigir revisión de contexto, sin recalcular historia.

Propuesta de coherencia:todos los operandos de una referencia proceden de una misma
paga elegida y su contexto de Neto verificable, no mezclar último Devengo deA/Base deB.
Si no existe fuente suficientemente verificable, pronóstico no disponible/incompleto.
El LOOKUP físico busca última fila Ordinaria con Base>0,IRPF>0,Retención>0 y agrega por
mes posteriormente:registrar esa limitación, no perpetuarla. Un0 explícito no es un dato
faltante; no excluir una referencia solo por ser0 sin evaluar significado/completitud.

### Pronóstico y escenario prudente

Entradas manuales nuevas del escenario:Variable prevista€=0 y Ajuste IRPF pp=0
inicialmente, visibles/editables. Esos defaults no rellenan datos históricos/fiscales
ausentes. Mantener Devengo, Base IRPF, Deducciones y tasa de referencia inalterados al
comparar escenarios; no cambiar originales ni parámetros para forzar coincidencia.

```text
IRPF estimado = Último IRPF + Ajuste IRPF esperado
Retención estimada = (Base IRPF ref. + Variable prevista) × IRPF estimado
Neto estimado = (Devengo ref. + Variable prevista)
                − Deducciones no IRPF ref. − Retención estimada

IRPF prudente = Último IRPF + 0,0027  [tasa; +0,27 puntos porcentuales]
Neto prudente = (Devengo ref. + Variable prevista) − Deducciones no IRPF ref.
               − (Base IRPF ref. + Variable prevista) × IRPF prudente
Diferencia prudente = Neto prudente − Neto estimado
```

+0,27pp es parámetro del escenario existente, no banda de Ajuste manual ni incremento
sobre IRPF estimado ya ajustado. Si el ajuste manual es superior a+0,27pp, la diferencia
prudente puede ser positiva: no forzar un signo o una relación universal entre escenarios.
Escenario prudente sigue siendo simulación, nunca pronóstico ejecutado/cobro bancario.

Propuestas de validación app:aritmética decimal precisa, entradas finitas, IRPF estimado
entre0% y100%. Variable prevista no negativa por defecto, sin máximo financiero
arbitrario; no usarla para absorber ajustes salariales negativos de otra naturaleza.
Conservar ajustes históricos documentados sin transformarlos; si se necesita operar
ajustes negativos nuevos, su representación se especificará separadamente, no se
rechaza/elimina historia por una regla del forecast. Ajuste IRPF± permitido sin banda
arbitraria mientras la tasa resultante sea válida. No recortar/clamp silencioso.

Validar escenarios por separado:propuesta de app, si tasa prudente supera100% o faltan
operandos, ese escenario no disponible con motivo; un escenario base válido no se
borra ni se altera para hacerlo pasar. No completar faltantes con0.

### Precisión y equivalencia económica — propuesta y gate de verificación

El Excel no usa ROUND explícitos en estas fórmulas ni validaciones numéricas en las
entradas. La app propone mantener tasas/componentes/resultados exactos sin redondeos
intermedios y formatear monetarios a2 decimales solo al final. No reutilizar valores
visuales redondeados para deducir retención, Neto, diferencias o escenarios.

Antes de afirmar equivalencia, pruebas con vectores sanitizados contrastarán normales,
empates de medio céntimo, tasas largas, Variable0 y ajustes±. Propuesta técnica de
formato final: redondeo decimal al céntimo más cercano, empate alejándose de cero
(1,005→1,01;−1,005→−1,01), solo al presentar cada resultado final. Calcular Diferencia
prudente desde netos exactos antes de formatearla, no restar los dos netos visuales.
Esta propuesta queda aprobada con el documento completo, sin afirmar que
reproduzca cada artefacto binario/formato del Excel. No se ejecuta esa batería ni se declara equivalencia
comprobada durante esta elaboración documental. La elección del punto de redondeo
no cambia la fórmula confirmada; no guardar componentes redondeados como originales.

## Screens and interfaces

Wireframes rev3 aprobados el2026-10-24, datos ficticios; no prueba de UI implementada. Tabla escritorio,
tarjetas móvil390, fuentes y unidades visibles. Cabecera Ciclos separada del Mes salarial.

```text
Nómina                         [Histórico] [Cobros/asociaciones] [Pronóstico]
Mes nómina [2026-06 v] Tipo [Todas v] [Añadir paga documentada]
PagaID Mes/Tipo        Neto histórico  Neto documentado      Cobrado asignado
PAGA-A junio/Ord.      [original]      [manual con evidencia / —] 900,00€ (2 ingresos)
PAGA-B junio/Ord.      [original]      [manual con evidencia / —] Sin asociaciones
[Originales/procedencia] [Derivados y origen] [Revisar cobros]
[Documentar neto]:Neto documentado€ [      ] · Evidencia [identificador]
Histórico [solo lectura en esta acción] · Vacío≠0 · No autocompletar desde cobros.
[Revisar corrección documental] [Confirmar] · Procedencia y auditoría conservadas.
Estimado, Documentado y Cobrado no se suman como entradas reales.
```

```text
Reparto de Movimiento #101 · Ingreso Nómina · 05/07/2026 · Destino Sxxx
Importe bancario real:1.500,00€ [Solo lectura] · Ciclo por Fecha real
PagaID / Mes / Tipo      Asignado antes → Después      Evidencia
PAGA-A / junio / Ord.    0,00 →1.000,00€               [motivo/fuente]
PAGA-B / mayo / Bonus    0,00 →  500,00€               [desglose mixto]
Total asignado:1.500,00€ · Pendiente de asociación:0,00€
! Desglose documental mixto:no cambia Subtipo ni crea dos Ingresos.
[Revisar todas las asignaciones y protecciones] [Confirmar]
```

```text
Cobros PAGA-A · Mes salarial junio
Neto documentado [valor/fuente/—] · Neto histórico [valor/fuente/—]
Referencia conciliación [origen/valor válido / No disponible]
Si discrepan:! Discrepancia documental → [Revisar fuentes y justificar selección]
Primer abono:05/07/2026 · Último:20/07/2026 · Ingresos distintos:2
#101 Asignado600,00€ (Ver Movimiento original) · #108 Asignado300,00€
Cobrado asignado:900,00€ · Diferencia contra referencia válida:[valor verificable / —]
Fecha de cobro completo:[fecha demostrable / No conciliación demostrada]
[Consultar evidencia] [Revisar asociación] — no cambia fechas bancarias.
```

```text
Pronóstico [Estimado] · Mes/corte consultado [selección visible]
Referencias:mes elegible más reciente · [ID elegido y evidencia]
Si empate:[Seleccionar Ordinaria documentada] — no sumar candidatas.
Variable prevista (€) [0]   Ajuste IRPF esperado (pp) [0]
IRPF estimado [tasa] · Retención estimada [importe] · Neto estimado [importe/motivo]
Prudente:+0,27pp sobre Último IRPF · Neto prudente [importe/motivo]
Diferencia prudente [Neto prudente−Neto estimado]
Original/documentado [fuente] · Cobrado [asociaciones] · Sin modificar presupuesto.
```

Móvil:tarjeta por paga con originales, importes/procedencia y panel independiente de
cobros; reparto como lista editable con total bancario/asignado/remanente siempre
visibles y acción de revisión. Pronóstico en bloque Estimado con referencias completas.
No depender solo del color para pendiente/incompleto/mixto/protección/conflicto.

## Empty, loading and error states

Sin pagas:no histórico, no nómina0. Sin evidencia:no asociaciones inventadas. Sin
referencia documental válida:no diferencia o fecha completa ficticia, aunque exista
cobrado. Discrepancia entre originales requiere revisión visible; no selección automática. Sin referencia salarial:
pronóstico no disponible, aunque inputs iniciales0. Banco ya realizado no pasa a
pendiente de ejecución por faltar asociación. Mostrar importes/orígenes incompatibles
como pendientes de revisar, sin ocultar el hecho real.
Carga/error/reintento conservan periodo/filtros/borrador. Respuesta antigua no reemplaza
el mes nuevo. Contexto obsoleto permite revisar cambios sin doble envío o reparto excesivo.
Ausencia,0 informado, importe parcial, decisión pendiente y fallo de red son distintos.

## API behavior and external dependencies

Propuesta lógica:salarial/derivados, lectura de Movimientos elegibles, revisión/confirmación
de conjunto de asignaciones, originales documentados, captura/corrección de Neto
documentado y resolución de referencia conciliatoria, parámetros/referencia de escenario.
Sin rutas/DDL/migración ejecutados; el modelo N:M se aprueba con el documento completo.
EUR/porcentajes exactos en strings y fechas civiles; ID/revisión/evidencia por fuente.
Autenticación/CSRF/idempotencia y límites técnicos conforme servicios existentes.

Al confirmar, revalidar suma por Movimiento en todas las pagas/meses, importe/revisión/
Tipo/Subtipo/estado real, datos/evidencias documentales y sus revisiones, selección
explícita de referencia si existe discrepancia, revisiones de asociación, fuentes y
protecciones aplicables. Auditoría atómica; sin maestro de abonos paralelo ni snapshots
completos por edición. Corrección histórica conserva identidad/relaciones/fotos y
requiere revisión de impacto/motivo/confirmación cuando aplique. No implementar ni
simular proveedores de cierre/importación futuros para poder afirmar esa protección.

## Validation and edge cases

Mes/Tipo repetidos no son duplicado técnico. Abono entre meses y mixto con evidencia
no se vincula por proximidad. Un Movimiento con dos asociaciones no son dos entradas.
No sustituir histórico0 por cobrado, no usar tasa0 como falta de fuente, no sumar
referencias distintas, no calcular estructuras fiscales definitivas con netos parciales.
No completar incompletos con defaults del forecast ni con SUMIFS de todo el mes.
M1 resuelto por aceptación de Neto documentado opcional con evidencia. No nuevas
preguntas funcionales Q1–Q6/M1; formato final, protocolos y relación técnica N:M son
contratos documentales aprobados con el documento completo y wireframes, sin permiso de desarrollo.

## Exclusions

Código/SQL/Excel real/importación/despliegue/merge, motor fiscal nuevo, modificaciones
bancarias para encajar documentos, vínculos inferidos, previsión ejecutada, cambio de
Ciclos o presupuesto, histórico reescrito, modelos de ajuste negativo inventados,
fuentes ficticias y cambios de plantilla. No afirmar equivalencia de N:M con C176.

## Acceptance checks

Futuros, NO ejecutados. Reglas físicas y concepto N:M recibidos Q1–Q6; ampliaciones
concretas y aprobación completa/visual otorgadas el2026-10-24; M1 resuelto. IDs AC01–24 conservados.
E2.5-AC1→AC01–06/28/30/37/38/40; AC2→AC07–16/25–29/35–36; AC3→AC17–24/31–34/39–40.

| ID | Acción / precondiciones | Resultado esperado |
| --- | --- | --- |
| AC-01 | Dos pagas documentadas del mismo Mes/Tipo | IDs distintos; no restricción única artificial |
| AC-02 | Cambiar referencias/escenario actuales | Originales/procedencia histórica intactos |
| AC-03 | Base y tasa informadas o ausencia | Producto solo con operandos;0 informado no es falta |
| AC-04 | Ordinaria con Guardia | Atributo original; fórmula confirmada, sin paga/ingreso extra |
| AC-05 | Bonus | Neto estructural vacío, no cero ni fórmula de Ordinaria |
| AC-06 | Sin Guardia=Sí frente a con Guardia=Sí | Neto o fórmula completa según rama física; completitud propagada |
| AC-07 | Una paga con dos abonos parciales | Dos IDs/asignaciones/fechas conservados; suma sin fusión |
| AC-08 | Dos Ordinarias mismo mes | IDs/evidencia explíctos; no primera fila arbitraria |
| AC-09 | Junio salarial cobrado en julio | Mes original intacto; ciclo por Fecha real |
| AC-10 | Abono sin evidencia | Remanente pendiente; Movimiento vigente intacto |
| AC-11 | Intereses/Promoción | No candidatos salariales ni ingresos de Nómina por coincidencia |
| AC-12 | Un abono para varias pagas | N:M, cada importe asignado; un solo Movimiento real |
| AC-13 | Revisión y cambio de Movimiento | Contexto obsoleto rechazado sin pérdida de borrador |
| AC-14 | Dos procesos asignan mismo remanente/doble envío | Suma global nunca excede el banco; idempotencia y rollback |
| AC-15 | Anular/rectificar hecho con asignaciones | Revisión de coherencia/trazabilidad; no contabilizar vínculo inválido como verificado |
| AC-16 | Consultar flujo del ciclo | Movimiento una vez, no Neto histórico+asignaciones+abono |
| AC-17 | Variable/Ajuste pp | Tres fórmulas confirmadas, unidades exactas y fuentes visibles |
| AC-18 | Editar pronóstico | No escribe histórico/banco/presupuesto/Ciclos |
| AC-19 | Sin elegibles o empate de mes | No disponible o selección explícita con evidencia, sin orden físico |
| AC-20 | Paga futura/incompleta | No referencia de hecho confirmado ni nuevo cobro |
| AC-21 | Estimado/documentado/cobrado mismo periodo | Tres magnitudes separadas, sin triple ingreso |
| AC-22 | Prudente vs base | +0,27pp sobre Último IRPF, no sobre tasa ya ajustada; resta con signo |
| AC-23 | Ajuste± y tasa fuera0–100 | Sin banda arbitraria; escenario inválido con motivo, no clamp |
| AC-24 | Móvil/escritorio/errores/conflictos | Diseño aprobado y posterior evidencia390/1440; no PASS funcional ahora |
| AC-25 | Abono1500 asignado1000+500 | Remanente0 y flujo1500, no3000 |
| AC-26 | Abono1000 asignado600 | Remanente400, hecho real1000 conservado |
| AC-27 | Importe del banco baja por debajo de lo asignado | Inconsistencia visible y revisión; no alterar abono para cuadrar |
| AC-28 | Neto histórico0 y banco positivo | Histórico0/origenHistórico preservados; cobrado/diferencia separados |
| AC-29 | Múltiples abonos y conciliación desconocida | Primera/última/lista/número visibles; fecha completa vacía con motivo |
| AC-30 | Candidatas mismo mes con valores diferentes | Seleccionar por ID/evidencia una paga coherente, no sumar/mezclar operandos |
| AC-31 | Variable inicial0 y Ajuste0 con/sin referencias | Cálculo solo con fuentes válidas; defaults no fabrican datos faltantes |
| AC-32 | Ajuste manual mayor que+0,27pp | Diferencia prudente puede ser positiva; no forzar signo |
| AC-33 | Prudente inválido pero base válido | Estados por escenario separados; base conservado |
| AC-34 | Tasas largas/medio céntimo/cálculo compuesto | Sin redondeo intermedio; equivalencia final a verificar, no declarada ahora |
| AC-35 | Abono mixto Ordinaria/Bonus de meses distintos | Desglose con evidencia y Subtipo original, sin dos ingresos artificiales |
| AC-36 | Abonos de misma paga en ciclos distintos | Cada abono en ciclo real, no mover fechas a Mes salarial |
| AC-37 | No existe referencia documental válida, aunque haya Ingresos | Cobrado/fechas reales visibles; Diferencia/Fecha completa no disponibles, sin cifra inventada |
| AC-38 | Neto bancario parcial disponible | No se eleva a documentado ni a referencia fiscal definitiva |
| AC-39 | Variable prevista negativa/ajuste salarial histórico negativo | Política app no negativa del forecast diferenciada de preservación del histórico |
| AC-40 | Referencia0 fiscal informado y completo | No se sustituye por ausencia ni se aplica LOOKUP físico como regla universal |
| AC-41 | Informar/corregir Neto documentado con evidencia | Dato manual opcional/procedencia/auditoría; Histórico intacto; no se obtiene del banco |
| AC-42 | Documentado e Histórico discrepan | Aviso y resolución explícita; no elegir por prioridad ni coincidencia con banco |
| AC-43 | Cambia un original tras revisar referencia/conciliación | Revalidación del contexto; no confirmar selección obsoleta ni perder trazabilidad |
| AC-44 | Vacío frente a0 documentado; ninguno conocido | Ausencia/0 distintos; no llenar con total cobrado ni fecha de forecast |
| AC-45 | Referencias coinciden monetariamente con un abono no vinculado | No asociación automática ni conciliación demostrada por mera igualdad |
| AC-46 | Preparar diseño físico antes de futuro dev | Comprobar campo semánticamente idéntico; reutilizar si existe, sin duplicar banco/documento |
