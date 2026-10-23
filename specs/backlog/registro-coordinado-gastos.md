# Registro coordinado de gastos con transferencia o anticipo

Estado: propuesta funcional futura; pendiente de especificación.
Procedencia: solicitud del usuario del 2026-10-23, mejora acordada con Álex.
No autoriza desarrollo, cambios del roadmap, PR, merge ni modificaciones del Excel.

Registro documental autorizado por el usuario el 2026-10-23 mediante «Autorizado»,
en respuesta a la propuesta de crear únicamente este documento. Esta autorización
no equivale a aprobación de una especificación ni de sus criterios de aceptación.

Los apartados 1–8 siguientes conservan íntegramente el texto aportado por el usuario.

## 1. Objetivo de la mejora

Simplificar el proceso de registrar un Gasto cuando:

- El Saldo habitual no tiene suficiente dinero.
- La Partida o Presupuesto está agotado.
- El usuario decide pagar desde otro Saldo.
- El usuario necesita financiar el Gasto mediante un Anticipo recuperable.
- El usuario quiere transferir un importe superior al estrictamente necesario y conservar un remanente.

Actualmente estas situaciones pueden requerir registrar manualmente un Gasto y una Transferencia.

La mejora permitirá realizar el registro desde un único formulario, mediante una operación coordinada.

**Principio innegociable: siempre se registra un único pago real desde un único Saldo pagador, y un único Movimiento de tipo Gasto por el importe íntegro.**

La Transferencia asociada será un Movimiento independiente cuando realmente corresponda.

No dividir artificialmente un Gasto entre varios Saldos ni generar hechos bancarios inexistentes.

## 2. Modalidades funcionales

El formulario mantendrá el registro de Gasto normal como comportamiento predeterminado.

Incorporará dos modalidades adicionales:

### Modalidad A — Pago directo desde otro Saldo

Definiciones:

- Cuenta 1: Saldo habitual o Saldo desde el que se desea aportar dinero.
- Cuenta 2: Saldo desde el que realmente se paga el Gasto.

El pago completo se realiza desde Cuenta 2.

Movimientos:

1. **Gasto obligatorio:** Cuenta 2 → Exterior, por el importe íntegro.
2. **Transferencia ordinaria opcional:** Cuenta 1 → Cuenta 2, por el importe seleccionado.

La Transferencia puede ser cero/no existir si Cuenta 2 ya dispone de fondos suficientes.

Si Cuenta 2 necesita recibir fondos para cubrir el Gasto, la Transferencia deberá cubrir como mínimo el déficit real.

Se permite transferir más que el déficit para mantener un remanente en Cuenta 2, siempre que la transferencia sea real y cumpla las reglas financieras vigentes.

La Transferencia ordinaria no genera por sí misma un Anticipo recuperable ni requiere Referencia de Anticipo.

Si se registra únicamente el Gasto, no crear Transferencia ficticia.

**Ejemplo A1 — Sin transferencia**

- Gasto de 100 €.
- Se paga desde Cuenta 2, con fondos suficientes.
- Resultado: un único Gasto de 100 € desde Cuenta 2.

**Ejemplo A2 — Con transferencia real**

- Gasto de 100 €.
- Se paga desde Cuenta 2.
- El usuario también transfiere 30 € desde Cuenta 1 a Cuenta 2.
- Resultado: Transferencia ordinaria de 30 € + Gasto de 100 € desde Cuenta 2.
- No queda Anticipo pendiente.

### Modalidad B — Financiación mediante Anticipo recuperable

Definiciones:

- Cuenta 1: Saldo habitual desde el que realmente se paga el Gasto.
- Cuenta 2: Saldo que adelanta temporalmente los fondos.

Movimientos:

1. **Transferencia de Anticipo obligatoria:** Cuenta 2 → Cuenta 1, por el importe seleccionado.
2. **Gasto obligatorio:** Cuenta 1 → Exterior, por el importe íntegro.

El importe adelantado puede superar el déficit real del Saldo pagador.

**Ejemplo B**

- Gasto: 100 €.
- Disponible en Cuenta 1: 40 €.
- Disponible suficiente en Cuenta 2.
- Anticipo mínimo necesario: 60 €.
- El usuario elige adelantar 80 €.

Resultado:

- Transferencia de Anticipo: 80 € de Cuenta 2 a Cuenta 1.
- Gasto: 100 € desde Cuenta 1 a Exterior.
- Disponible posterior estimado en Cuenta 1: 20 €.
- Anticipo recuperable registrado: 80 €.

Los 20 € restantes son dinero real del Saldo, no un incremento automático del presupuesto asignado a la Partida.

El Anticipo queda pendiente de recuperación según las reglas vigentes del caso.

---

## 3. Referencia obligatoria para Anticipos

**Decisión funcional: toda Transferencia de Anticipo debe disponer de una Referencia válida de tipo Anticipo.**

El formulario debe ofrecer:

- Seleccionar una Referencia de Anticipo existente.
- Crear una nueva Referencia de Anticipo desde el propio flujo, cuando E3.1 permita esta operación.

No utilizar una Referencia de Viaje, Evento, Gasto compartido u otro tipo.

### Si se selecciona una Referencia existente

Validar:

- Existencia e identidad por ID estable.
- Tipo Anticipo.
- Estado elegible para nuevas operaciones.
- Coherencia con los Saldos que adelantan y reciben.
- Compatibilidad con las reglas y el estado del caso.

No reutilizar silenciosamente una Referencia incompatible.

### Si se crea una nueva Referencia

Reutilizar los maestros únicos del modelo:

- Referencia, equivalente funcional de `tblReferencias`.
- Ficha de Anticipo, equivalente funcional de `tblAnticipos`.

La aplicación debe orquestar su creación coherente junto con el registro de la operación, sin Referencias huérfanas, fichas duplicadas ni IDs reutilizados.

No crear un segundo maestro de Anticipos ni duplicar sus métricas.

### Vinculación

- La Transferencia de Anticipo incorpora su ID de Referencia.
- El Gasto conserva su Partida, de la que derivan Subcategoría, Categoría y Presupuesto.
- No imponer al Gasto la Referencia de Anticipo: el Anticipo identifica la financiación, no reclasifica económicamente el Gasto.

La vinculación técnica de los movimientos creados mediante una misma operación de formulario podrá apoyarse en los mecanismos existentes de auditoría/idempotencia o en una relación de operación compuesta si realmente fuera necesaria. Justificarla antes de introducir una entidad nueva.

### Recuperación posterior

Una devolución real requiere:

- Tipo Transferencia.
- Misma Referencia de Anticipo.
- Origen: Saldo que recibió los fondos.
- Destino: Saldo que los adelantó.
- Importe realmente devuelto.

Permitir devoluciones parciales o completas conforme al motor único de Anticipos de E3.1.

No considerar recuperado el Anticipo por un ajuste presupuestario, una simulación o una transferencia inexistente.

No alterar automáticamente `Neto apertura ciclo` ni recalcular fotografías históricas.

---

## 4. Interfaz de usuario

Integrar en el futuro formulario «Nuevo gasto», reutilizando los componentes de MyFinanzas.

### Datos generales

- Fecha real del Gasto.
- Importe total.
- Partida.
- Concepto o descripción.
- Saldo habitual.
- Saldo desde el que realmente se realiza el pago.
- Disponibilidad real de los Saldos implicados.
- Información presupuestaria disponible cuando exista el motor correspondiente.

Distinguir siempre el disponible real de un Saldo y la disponibilidad presupuestaria de una Partida.

El déficit presupuestario no implica automáticamente falta de dinero en el Saldo.

### Presentación de modalidades

Por defecto, mostrar Gasto normal.

Cuando el Saldo pagador no alcance a cubrir el Gasto, ofrecer las modalidades de pago alternativo/financiación.

También permitir seleccionar manualmente estas modalidades cuando exista una necesidad legítima de transferir o adelantar dinero aunque el Saldo disponga de fondos suficientes.

### Barra deslizante de importe

**Queremos conservar expresamente el control visual de barra deslizante.**

La barra aparece cuando el usuario elige registrar una Transferencia asociada.

Debe incorporar:

1. Barra deslizante para elegir el importe.
2. Campo numérico editable en euros y céntimos, sincronizado con la barra.
3. Mínimo necesario calculado automáticamente.
4. Máximo permitido según los fondos y reglas reales del Saldo que transfiere.
5. Vista previa del disponible estimado tras los movimientos.
6. Indicación separada del dinero adicional que permanecerá en el Saldo pagador.

No imponer un máximo monetario arbitrario.

La barra puede usar pasos prácticos para facilitar el desplazamiento, pero el campo numérico debe permitir importes exactos con dos decimales.

### Mínimo de transferencia

Para ambas modalidades, cuando corresponda cubrir un déficit real:

`Mínimo = MAX(0, Importe del Gasto − Disponible real en el Saldo pagador)`

En Pago directo, la Transferencia puede omitirse cuando no es necesaria y no se ha realizado.

En Financiación mediante Anticipo, debe existir una Transferencia real de importe positivo; aunque el déficit sea cero, el usuario puede decidir adelantar fondos.

Nunca autorizar un registro compuesto que incumpla las reglas aplicables de disponibilidad financiera.

No modificar presupuestos para conseguir artificialmente que cuadren los importes.

---

## 5. Vista previa y confirmación

Antes de guardar, mostrar:

- Modalidad elegida.
- Saldo que realiza el Gasto real.
- Importe del Gasto.
- Transferencia asociada, si existe.
- Dirección de la Transferencia.
- Importe transferido.
- Referencia de Anticipo, cuando corresponda.
- Disponible anterior y posterior estimado en cada Saldo.
- Impacto presupuestario conocido, sin inventar cálculos de módulos pendientes.

El usuario confirma una única operación desde el formulario.

**Atomicidad:** cuando se registren dos Movimientos ya ejecutados, guardar ambos como una sola transacción de aplicación. Si uno falla, no confirmar parcialmente el otro.

La aplicación no debe afirmar que ha realizado una transferencia bancaria. En esta mejora estamos registrando hechos reales, no ejecutando pagos mediante una API bancaria.

Si la Transferencia todavía no se ha realizado, no registrarla como ejecutada ni utilizarla para presentar liquidez ficticia.

Conservar las fechas reales si el Gasto y la Transferencia ocurrieron en momentos diferentes.

---

## 6. Reglas económicas y técnicas

### Movimientos

Reutilizar los Tipos existentes:

- Gasto.
- Transferencia.

No introducir tipos nuevos como «Gasto financiado» o «Pago directo especial».

No generar dos Gastos para una misma compra.

### Saldos

- El Saldo pagador debe permitir salida directa a Exterior.
- La Transferencia interna utiliza dos Saldos distintos y elegibles.
- Comprobar disponibilidad cuando corresponda.
- Preservar las restricciones de terminales y estados.
- No inferir el banco físico únicamente por el nombre del Saldo.

### Partidas y Presupuestos

- El Gasto se imputa a su Partida.
- El Presupuesto se deriva de la Partida según el modelo vigente.
- El Anticipo permanece desacoplado del Presupuesto.
- No aumentar automáticamente el presupuesto por adelantar fondos.
- No duplicar el gasto ejecutado.
- Las Transferencias con Referencia de Anticipo no ejecutan un Presupuesto de fuente `Aportación a saldo`.

**Punto que requiere comprobación funcional futura:** una Transferencia ordinaria opcional en Pago directo puede afectar al ejecutado de un Presupuesto con fuente `Aportación a saldo`, según su Saldo destino y las reglas R3. No crear exclusiones artificiales; documentar y mostrar este efecto antes de cerrar la especificación de la mejora.

### Integridad

Aplicar:

- IDs técnicos estables.
- Validaciones de dominio en servidor.
- Idempotencia para reintentos.
- Concurrencia y revisión de contexto.
- Auditoría de todos los hechos creados.
- Rollback íntegro.
- Protección de historial.
- Autenticación y seguridad vigentes.

No crear capas de cálculo adicionales para sustituir motores existentes.

---

## 7. Casos de aceptación que deberá cubrir la futura especificación

Preparar posteriormente una matriz formal de aceptación que cubra, como mínimo:

1. Gasto normal sin financiación.
2. Pago directo desde otro Saldo sin Transferencia.
3. Pago directo con Transferencia ordinaria real.
4. Pago directo con Transferencia que cubre exactamente el déficit.
5. Transferencia ordinaria superior al déficit.
6. Financiación con Anticipo por el mínimo necesario.
7. Anticipo superior al déficit y remanente positivo.
8. Anticipo cuando el Saldo pagador ya tiene fondos suficientes.
9. Creación de Referencia y ficha de Anticipo coherentes.
10. Reutilización válida de una Referencia existente.
11. Rechazo de Referencia inexistente, inactiva o de tipo incompatible.
12. Rechazo de dirección incompatible con la Referencia.
13. Devolución parcial y completa mediante Transferencia inversa.
14. Exclusión de Anticipos de la ejecución presupuestaria ordinaria.
15. Exactitud del Gasto imputado a Partida/Presupuesto.
16. Saldo pagador sin permiso de salida a Exterior.
17. Fondos insuficientes para la operación elegida.
18. Sincronización barra/campo numérico e importes decimales.
19. Cancelación sin escritura.
20. Fallo parcial, rollback y reintento idempotente.
21. Dos confirmaciones concurrentes sin duplicados.
22. Cambios de contexto entre vista previa y confirmación.
23. Datos históricos, rectificación/anulación y efectos sobre el Anticipo.
24. Revisión visual y accesibilidad en móvil y escritorio.
25. Respeto de las reglas específicas de terminales.
26. Transferencia aún no ejecutada: prohibición de registrarla como hecho real.
27. Disponibilidad presupuestaria distinta de disponibilidad real.
28. Impacto de una Transferencia ordinaria sobre presupuestos de Aportación a saldo.

Estos son casos de cobertura propuestos, no pruebas ya realizadas ni criterios aprobados de una nueva fase.

---

## 8. Encaje en el roadmap

Evaluar esta mejora como una capa de **orquestación de operaciones existentes**, no como un nuevo motor contable.

Dependencias funcionales a revisar:

- E1.4 — Movimientos.
- E1.5 — Transferencias y Referencias básicas.
- E2.2/E2.3 — Presupuestos y ejecución cuando sea necesario mostrar su impacto.
- E3.1 — Anticipos, Referencia, ficha y recuperaciones.
- Reglas de Ciclos y consumidores transversales que correspondan.

No forzar su implementación antes de disponer de las capacidades necesarias.

No modificar retrospectivamente criterios aprobados de otras fases para introducir esta mejora.

---

## Encaje propuesto y dependencias

Entrada independiente del backlog, sin número de entrega asignado y sin modificar
las 30 entregas del [roadmap aprobado](../roadmap.md). Nombre sugerido:
**Registro coordinado de gastos con transferencia o anticipo**.

Planificar después de E3.1, como capa de orquestación de capacidades existentes,
cuando estén disponibles y verificadas:

| Dependencia | Uso |
| --- | --- |
| E1.4/E1.5 | Gasto, Transferencia, Referencias y validaciones existentes |
| E2.2/E2.3 | Imputación por Partida y ejecución presupuestaria |
| E3.1 | Referencia, ficha, financiación y recuperación de Anticipos |
| E2.1 y consumidores transversales aplicables | Fechas, ciclos e integridad histórica |

La futura especificación comprobará estas dependencias. El desarrollo requerirá
una autorización separada. No adelantar esta mejora para completar módulos pendientes.

## Reglas vigentes y decisiones de la propuesta

Reglas vigentes: R3/R4 de la [referencia funcional](../functional-reference-v5.11.md),
Tipos existentes, maestros únicos y protección histórica. Reutilizar los contratos
aprobados de [E1.4](../04-movimientos-specification.md),
[E1.5](../05-transferencias-referencias-specification.md) y
[E2.2](../08-presupuestos-specification.md).

Decisiones nuevas conservadas como propuesta: modalidades coordinadas, barra deslizante
con campo exacto sincronizado, vista previa y creación de Referencia/ficha desde el flujo.
No se presentan como funcionalidad ya aprobada o implementada.

El Gasto conserva su Partida y sus requisitos propios de Referencia. La financiación
no le impone la Referencia del Anticipo ni sustituye las validaciones de su clasificación.

## Cuestiones materiales para la futura especificación

1. **Disponibilidad no calculable.** E1.5 establece que Terminal no tiene posición
   convencional. La propuesta de tratamiento se concreta en «Ajuste conceptual —
   Saldos terminales» más abajo. La futura especificación debe desarrollar ese contrato
   y su UX sin aplicar a terminales déficit, mínimos o remanentes basados en una posición
   inexistente ni máximos derivados de un disponible desconocido.
2. **Impacto R3.** La Transferencia ordinaria de la modalidad A puede ejecutar
   «Aportación a saldo». Mostrar ese efecto y comprobar la ausencia de doble ejecución
   conforme al modelo, sin exclusiones artificiales.
3. **Fechas diferentes.** Precisar cómo se verifica la disponibilidad y el contexto
   histórico cuando Transferencia y Gasto ocurrieron en momentos distintos.
4. **Contrato E3.1.** Concretar elegibilidad, dirección, altas coherentes y efectos de
   rectificaciones/anulaciones sobre recuperaciones y fotografías históricas.
5. **Contrato técnico compuesto.** Justificar si basta reutilizar auditoría/idempotencia
   o hace falta una relación adicional; no introducirla por anticipado.

## Ampliación conceptual — Transferencias pendientes de confirmar

Fuente: solicitud expresa del usuario del 2026-10-23 para actualizar este mismo
backlog. Autoriza el registro documental de la ampliación, no desarrollo ni aprobación
de una especificación. Revisar durante la futura especificación, después de disponer
de E3.1 — Anticipos. Los apartados 1–8 originales se conservan como procedencia;
esta ampliación añade el tratamiento explícito de una Transferencia aún no realizada.

### Fecha independiente y confirmación de realización

El formulario permite editar la fecha de la Transferencia asociada independientemente
de la fecha real del Gasto. Distinguir fecha prevista de fecha efectiva: una fecha
prevista nunca es la fecha de un Movimiento ejecutado.

Incorporar el control **☐ Transferencia realizada**:

- **Sin marcar:** conservar como pendiente el importe, la dirección, la Referencia
  cuando corresponda y la fecha prevista. No registrar un Movimiento ejecutado ni
  alterar Saldos, Presupuestos o Anticipos. Permitir confirmar posteriormente con
  la fecha real.
- **Marcado:** validar datos financieros y fecha efectiva; registrar la Transferencia
  real mediante el motor de Movimientos, resolver el pendiente sin duplicados y
  actualizar los motores correspondientes conforme a sus reglas vigentes.

Aplicar a Transferencias ordinarias opcionales y de Anticipo. En Pago directo sin
Transferencia asociada no crear ningún pendiente. Un pendiente de Transferencia de
Anticipo no genera por sí mismo un Anticipo recuperable: este nace del hecho real
registrado conforme a E3.1. No confundir «pendiente de realizar» con «pendiente de
recuperación» de un Anticipo efectivamente adelantado.

### Alertas y gestión posterior

Mostrar icono de admiración rojo acompañado del texto **«Pendiente de realizar»**;
no depender exclusivamente del color. Incluir la alerta en:

- Lista general de Movimientos, mediante fila o representación diferenciada de
  pendientes, sin presentarlos como Movimientos financieros ejecutados.
- Vista/lista de Transferencias.
- Detalle del Gasto relacionado, cuando corresponda.

Incluir contador o filtro **«Requieren atención»**. La alerta desaparece al confirmar
la realización o cancelar válidamente el pendiente.

Desde el pendiente permitir consultar el Gasto relacionado, modificar importe y
fecha prevista antes de ejecutar con las validaciones correspondientes, confirmar
realización indicando fecha bancaria real y cancelar conservando trazabilidad.
La confirmación debe ser idempotente y segura frente a concurrencia. Si se modifica
o anula el Gasto vinculado, revisar el pendiente para evitar operaciones incoherentes;
la futura especificación concretará la revisión y su resolución, sin cancelación ni
Transferencia automática inferidas.

### Impacto previsto en UX, API y persistencia

| Área | Impacto conceptual; diseño técnico pendiente |
| --- | --- |
| UX | Fechas separadas, control de realización, preview que distingue hechos y pendientes, alertas accesibles, contador/filtro y acciones de seguimiento en las tres superficies indicadas. La previsión no se suma al disponible real. |
| API | Operaciones para consultar, conservar, editar, confirmar y cancelar pendientes; autenticación, validaciones de dominio en servidor, revisión de contexto, auditoría y protección ante reintentos y concurrencia. No fijar rutas ni contratos de payload en el backlog. |
| Persistencia | Estudiar primero si existe una capacidad reutilizable de borradores o pendientes. Si no existe, proponer y justificar el mínimo mecanismo persistente para datos previstos, identidad estable, vínculo al Gasto y, al confirmar, al Movimiento real, con trazabilidad de cambios/cancelación. No se afirma que esa capacidad exista ni se aprueba una tabla o entidad nueva. |
| Motores financieros | Mantener separados Gasto real, Transferencia pendiente, Transferencia realizada y Anticipo recuperable efectivamente generado. Un pendiente no afecta cálculos ni ejecución presupuestaria; la Transferencia confirmada reutiliza los motores existentes. |

No introducir estados de ejecución ficticios dentro del motor de Movimientos reales
ni duplicar motores o maestros. Cuando ambos hechos ya estén ejecutados y se registren
juntos, mantener la atomicidad del registro compuesto. La confirmación posterior debe
registrar el hecho y resolver el pendiente sin duplicados ni éxito parcial; concretar
su transacción y recuperación de fallos durante la especificación.

Preservar validaciones vigentes de disponibilidad, terminales, fechas, Referencias y
presupuesto. Un pendiente no aporta liquidez para autorizar un Gasto que incumpla esas
validaciones. La futura especificación resolverá el caso de Gasto ya realizado cuyo
Saldo no admite registrarlo sin una financiación todavía pendiente, sin inventar
fondos ni excepciones. En modalidad B, la Transferencia real positiva sigue siendo
necesaria para materializar el Anticipo; conservar una intención pendiente no equivale
a completar la financiación.

Determinar también cuándo crear o reutilizar Referencia y ficha de Anticipo si la
Transferencia queda pendiente, evitando huérfanos, métricas ficticias y duplicados.
Precisar el alcance del contador/filtro y cómo se relaciona una Transferencia ya
registrada por otro flujo con su pendiente para evitar duplicar el mismo hecho.

### Cobertura adicional para la futura matriz de aceptación

Casos propuestos, complementarios a los 28 originales; no criterios aprobados ni
pruebas ejecutadas:

29. Fechas reales diferentes para Gasto y Transferencia; edición independiente y
    separación inequívoca entre fecha prevista y efectiva.
30. Transferencia ordinaria pendiente: conservar datos y vínculo sin Movimiento real
    ni efectos en Saldos, Presupuestos o Anticipos.
31. Transferencia de Anticipo pendiente: conservar Referencia cuando corresponda sin
    generar adelantado ni pendiente de recuperación antes de su realización.
32. Pago directo sin Transferencia asociada: no crear pendiente ni alerta.
33. Confirmar realización con fecha bancaria real válida: crear una sola Transferencia,
    resolver el pendiente y aplicar exclusivamente los efectos de los motores vigentes.
34. Reintento y confirmaciones concurrentes: un único Movimiento y una única resolución;
    fallo durante confirmación sin efectos parciales.
35. Modificar importe y fecha prevista antes de ejecutar; revalidar contexto, elegibilidad,
    disponibilidad y Referencia al confirmar, sin utilizar validaciones antiguas como garantía.
36. Cancelar pendiente conservando trazabilidad, sin efecto financiero y retirando alerta.
37. Icono de admiración rojo y texto «Pendiente de realizar» en lista general, Transferencias
    y detalle del Gasto; contador/filtro «Requieren atención», móvil, escritorio y accesibilidad.
38. Modificación/anulación del Gasto vinculado: revisión del pendiente para evitar incoherencias.
39. Transferencia pendiente sin liquidez ficticia ni ejecución presupuestaria; rechazo de
    fecha prevista usada como efectiva y respeto de terminales y fechas vigentes.
40. Ambos hechos ya realizados: atomicidad del registro compuesto con fechas reales propias.
41. Referencia/ficha coherentes durante el ciclo pendiente–confirmación/cancelación, sin
    huérfanos, duplicados ni Anticipos ficticios.
42. Transferencia real registrada por otro flujo: resolver su relación con el pendiente
    sin duplicar el hecho, conforme al mecanismo que se apruebe en la especificación.

## Ajuste conceptual — Saldos terminales

Fuente: solicitud expresa del usuario del 2026-10-23 para registrar esta decisión
como propuesta de backlog. Sin autorización de implementación ni aprobación de
una especificación. Distinguir Saldos terminales de Saldos con disponibilidad real
calculable; esta precisión acota las referencias generales a disponibilidad, déficit,
mínimos y remanentes de los apartados originales, que se conservan íntegros.

Para terminales:

- Permitir registrar Gastos conforme a **Permite salida a Exterior** y las demás
  reglas vigentes aplicables.
- Conservar las Transferencias internas reales de financiación y los Anticipos con
  Referencia válida, sin duplicar el Gasto ni crear financiación ficticia.
- No calcular déficit, mínimo de financiación ni saldo restante a partir de una
  posición convencional inexistente. No presentar cero como disponible desconocido.
- Permitir seleccionar manualmente el importe de la Transferencia, manteniendo el
  campo editable y la barra cuando proceda. Concretar en la futura especificación
  el comportamiento de la barra cuando no pueda calcularse un límite, sin inventar
  máximos monetarios ni disponibilidad del terminal.
- No bloquear automáticamente por insuficiencia de fondos no verificable. Esta
  ausencia de bloqueo no declara fondos suficientes ni sustituye otras validaciones.
- Conservar las reglas actuales de terminales. Si otro Saldo implicado dispone de
  disponibilidad calculable, mantener las comprobaciones que le correspondan sin
  extenderle la excepción del terminal.

La distinción aplica tanto al registro conjunto de hechos realizados como a la
confirmación posterior de pendientes. Una Transferencia pendiente sigue sin alterar
Saldos, Presupuestos o Anticipos; su existencia no demuestra financiación real.

Impacto propuesto: UX distingue disponibilidad no calculable y selección manual;
API aplica validaciones según las capacidades de cada Saldo; persistencia reutiliza
la identificación y reglas vigentes del terminal, sin proponer un saldo acumulado
ni un motor o maestro adicional. Diseño técnico y visual pendiente de especificación
después de E3.1.

### Cobertura adicional propuesta para terminales

43. Gasto desde terminal permitido o rechazado conforme a **Permite salida a Exterior**
    y demás reglas aplicables, sin bloqueo por insuficiencia no verificable.
44. Terminal sin posición convencional: no mostrar déficit, mínimo ni saldo restante
    calculados; selección manual exacta con campo editable y barra cuando proceda.
45. Financiación interna real y Anticipo con Referencia conservan sus hechos y efectos;
    pendiente sin efectos financieros y sin financiación ficticia.
46. Operación entre terminal y Saldo con disponibilidad calculable: comprobar este
    último cuando corresponda, sin inventar disponibilidad ni límites para el terminal.

Casos de cobertura futura, no criterios aprobados ni pruebas ejecutadas. Los demás
puntos abiertos de disponibilidad histórica y fechas permanecen pendientes.

## Estado y próximo gate

Comprobación al preparar esta propuesta: main local y remoto en `8fae7a4`, con árbol
limpio; Dev08 integrado mediante [PR #44](https://github.com/josemartin2000/myfinanzas-app/pull/44),
squash `255bf61`. Las referencias del texto original a su continuidad conservan su
procedencia y no sustituyen este estado verificado. AC23 y Dev32 mantienen sus estados
independientes; este documento no los reanuda ni los resuelve.

Próximo gate: autorización específica para preparar su especificación tras verificar
las dependencias. Los casos enumerados son cobertura propuesta, no criterios formalmente
aprobados ni pruebas ejecutadas. Esta entrada no modifica especificaciones integradas
ni los estados independientes de Dev08, E2.1/AC23 y Dev32.
