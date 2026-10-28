# Reparto mensual asistido de presupuestos

**Status: PROPUESTA FUNCIONAL — PENDIENTE DE APROBACIÓN; NO AUTORIZA DESARROLLO.**
Procedencia: documento consolidado aportado por el usuario el 2026-10-28.
Relación: E2.3 — Plan del ciclo. Entrada independiente del backlog, sin número de entrega.
Alcance de esta entrada: exclusivamente documentación. No modifica el roadmap, las
especificaciones aprobadas, el esquema, el código, el tablero ni el Excel.
Base de redacción: `origin/main` `da93682` (2026-10-28); contrastar antes de publicar.

Registro documental autorizado por el usuario el 2026-10-28 con alcance exclusivamente
documental. Esta autorización no aprueba la propuesta, no autoriza su especificación ni su
desarrollo y no modifica decisiones aprobadas. El cuerpo conserva la propuesta funcional
aportada; §0 y §11 añaden la revisión de coherencia solicitada, sin convertirla en spec.

Esta propuesta no ejecuta transferencias bancarias ni autoriza integración bancaria. Prepara
registros operativos de Transferencias pendientes que el usuario confirma individualmente
cuando verifica su ejecución real. La realidad financiera ejecutada sigue siendo exclusivamente
la de Movimientos.

## 0. Resumen de la revisión de coherencia

La propuesta es compatible con el modelo vigente si se aplican estas precisiones, que no
introducen motores ni maestros nuevos:

1. **Un único mecanismo de Transferencias pendientes**, compartido con
   [registro-coordinado-gastos.md](registro-coordinado-gastos.md). No se crea un segundo
   estado, tabla financiera o flujo de confirmación para el reparto.
2. **Tres estados operativos**: Pendiente de realizar, Confirmada y Cancelada. «No confirmada»
   es una etiqueta explicativa, no un estado distinto. «Excluida» se resuelve antes de generar
   el pendiente o como cancelación con motivo, no como un cuarto estado.
3. **Un pendiente no es un Movimiento.** Puede mostrarse en la pantalla de Movimientos, pero
   como colección diferenciada, sin sumar en Saldos, ejecución presupuestaria, informes ni
   fotos de cierre.
4. **Aportación a saldo** solo se ejecuta con Transferencias ordinarias reales, sin Referencia
   y sin origen Exterior, hacia el Saldo destino exacto del Presupuesto. El importe sugerido
   es el Pendiente positivo verificable de E2.3, no una medida de liquidez.
5. **Gasto real** no genera Transferencia automática. El Saldo destino obligatorio de E2.2 no
   es una reserva ni un objetivo de financiación; la imputación sigue siendo por Partida.
6. **La fecha prevista no es la fecha económica.** Puede ser futura; la confirmación exige una
   fecha bancaria real no futura y respeta la protección de cierres.
7. **La fecha real determina el Ciclo financiero.** El vínculo con el reparto de origen es
   trazabilidad operativa, no una imputación retroactiva al Ciclo de origen.
8. **La confirmación actualiza derivados, no saldos persistidos.** Posiciones, Ejecutado,
   Pendiente y Estado se recalculan desde el Movimiento real y los motores vigentes.
9. **La idempotencia técnica no es unicidad económica.** El reparto evita duplicar sus propios
   pendientes; E1.5 mantiene la advertencia revisable de duplicados, no un veto por contenido.
10. **Existe una tensión explícita con E2.3**, que excluye «automatizar Transferencias» y
    «botón de ejecutar plan». La futura especificación debe acotar que esta mejora no ejecuta
    pagos ni da por ejecutado el plan; si no se acepta esa lectura, requiere una enmienda
    aprobada de E2.3. Este documento no la aprueba ni la modifica.

## 1. Objetivo

Permitir preparar una vez por Ciclo las Transferencias necesarias para distribuir el dinero
presupuestado, generando registros pendientes que el usuario confirmará individualmente desde
Movimientos cuando verifique su ejecución bancaria.

No se ejecutan Transferencias bancarias desde la aplicación. No se crean Gastos, Ingresos,
Partidas, Presupuestos, Referencias, Anticipos ni maestros paralelos. El reparto no altera los
importes de planificación.

## 2. Acceso y ciclo de vida del reparto

Incorporar «Preparar reparto del ciclo» en la pantalla de Plan del ciclo / Presupuesto Mensual,
junto a las acciones existentes de consulta y edición del plan.

- **Un único reparto por ID de Ciclo.** La unicidad es técnica, por Ciclo; no por contenido de
  las líneas.
- **Inicio siempre por el usuario.** Abrir, iniciar o cerrar un Ciclo, cambiar el plan o
  modificar un Presupuesto no crea un reparto automáticamente.
- **Preparación incompleta.** Mientras el reparto no esté completado, el usuario puede
  reabrirlo para continuar. Si ya se generaron pendientes, las líneas nuevas generan solo sus
  propios pendientes; no se regeneran los existentes.
- **Consulta y seguimiento.** El reparto conserva acceso de lectura a sus líneas, sus estados,
  sus vínculos y su Ciclo de origen después de completarse.
- **Sin duplicación.** La generación y la confirmación son idempotentes. Un reintento del mismo
  intento no crea un segundo pendiente ni un segundo Movimiento.
- **Protección de cierres.** No se inicia un reparto nuevo para un Ciclo con cierre financiero.
  Las líneas pendientes preexistentes se rigen por la protección de cierres descrita en §6,
  §11.2 y §12; no se convierten en hechos por el mero cierre.
- **Sin plan.** Un Ciclo sin plan no inventa líneas presupuestarias ni importes. La posibilidad
  de añadir líneas adicionales en ese caso se decidirá en la especificación.

La preparación previa a la generación es un borrador operativo, no un hecho financiero. Su
persistencia concreta se decidirá junto con el mecanismo compartido de pendientes; este
documento no prescribe tabla, estado de Movimiento ni migración.

## 3. Líneas presupuestarias

Mostrar los Presupuestos del plan del Ciclo con, cuando sean verificables:

- Presupuesto e identidad estable.
- Fuente de ejecución: Gasto real, Aportación a saldo o No aplica.
- Del mes.
- Ejecutado.
- Pendiente y Estado según E2.3.

No se muestran cifras derivadas si falta el periodo/corte verificable, el Del mes o la
cobertura de la fuente. Se muestra el motivo, nunca un cero sustitutivo.

### Aportación a saldo

- Proponer una Transferencia hacia el Saldo destino del maestro Presupuestos.
- Sugerir el **Pendiente positivo verificable** de E2.3: `Del mes − Ejecutado`, solo si la
  fuente es comparable, el periodo/corte es verificable, el Del mes está informado y el
  resultado es mayor que cero.
- Permitir modificar el importe. Un importe superior al Pendiente puede producir Estado
  Excedido; mostrar el efecto y no truncar el Pendiente negativo a cero.
- La Transferencia propuesta debe ser ordinaria: sin Referencia y sin origen Exterior. Si se
  añade una Referencia o se cambia el destino, puede dejar de ejecutar esa Aportación a saldo;
  la interfaz debe explicarlo antes de confirmar.
- El destino se obtiene del Presupuesto y no se edita en la línea presupuestaria. Si el destino
  está inactivo o ya no es elegible para nuevas Transferencias, no se propone automáticamente
  y se muestra el motivo.
- Un Presupuesto inactivo no recibe propuesta automática. La especificación decidirá si una
  línea adicional manual puede usar su destino.
- El reparto no modifica Del mes, Base, Esencial, Fuente, destino ni vínculos del Presupuesto.

### Gasto real

- Mostrar por defecto **«Mantener en origen»**, normalmente la cuenta receptora de la nómina
  cuando pueda identificarse de forma fiable.
- No crear Transferencia automática.
- El Saldo destino obligatorio del Presupuesto de Gasto real no es una reserva ni un objetivo
  de financiación: la ejecución se imputa por Partida. La interfaz no debe presentarlo como
  dinero que haya que enviar a ese Saldo.
- Si el usuario decide expresamente añadir una línea manual hacia ese destino, será una
  Transferencia ordinaria adicional; no ejecutará la fuente Gasto real ni alterará su
  Ejecutado.
- Si no hay un único candidato fiable de cuenta de nómina, exigir selección explícita de
  origen. No inferir por nombre del Saldo, banco ni por la última Transferencia sin mostrar la
  base de la propuesta.

### No aplica

- Mostrar sin propuesta automática de financiación.
- No calcular Pendiente ni Estado comparables.
- Conservar los importes de plan sin convertirlos en ejecución.

### Reglas comunes de importe

- El importe de una línea es positivo, en euros con céntimos exactos. Cero o negativo no genera
  pendiente.
- Pendiente cero o negativo no genera propuesta automática; se muestra Completo o Excedido
  cuando sea verificable.
- Sin Del mes, sin periodo/corte verificable o con Ejecutado no verificable, no se inventa un
  importe sugerido. Se permite la decisión manual si la especificación la autoriza, mostrando
  que no hay pendiente verificable.
- El Pendiente presupuestario no demuestra liquidez en el Saldo de origen. No se usa para
  bloquear ni para afirmar disponibilidad.

## 4. Origen y líneas adicionales

- **Selector común del Saldo de origen**, con propuesta de la cuenta receptora de la nómina si
  puede identificarse de manera fiable. La propuesta debe mostrar su base y exigir confirmación.
- **Cambio de origen por línea.** El selector común actúa como valor por defecto; cada línea
  conserva el origen finalmente resuelto. Cambiar el valor común no reescribe líneas ya
  configuradas.
- **Destino de líneas presupuestarias:** el del Presupuesto, no editable en la línea.
- **Líneas adicionales:** botón «Añadir transferencia» con origen, destino, importe, fecha
  prevista y descripción o contexto. Se reutilizan Concepto/Nota de E1.5; no se crea un maestro
  de descripciones.
- Las líneas adicionales no crean Partidas ni Presupuestos nuevos.
- Son Transferencias internas entre Saldos activos, distintos y elegibles. No se admite S000
  ni Exterior en ningún extremo, conforme a E1.5.
- Si una línea adicional usa el destino de un Presupuesto de fuente Aportación a saldo y es una
  Transferencia ordinaria, **ejecutará ese Presupuesto** al confirmarse, aunque la línea no se
  haya generado desde su línea de plan. Mostrar el efecto; la línea no es financieramente
  neutral.
- Si usa el destino de un Presupuesto de Gasto real, no ejecutará su fuente.
- Una Referencia admitida en una línea adicional se rige por E1.5 y no convierte la línea en
  ejecución de Aportación a saldo. La primera mejora no habilita Anticipos ni Gastos
  compartidos; la procedencia de Referencias Viaje/Evento en este flujo queda como decisión de
  la especificación.
- **Fuera de esta primera mejora:** Anticipos, Gastos compartidos, Vehículo, Deuda, inversión,
  Transferencias con Exterior y cualquier operación especial que requiera ficha propia.

## 5. Generación de Transferencias pendientes

Al confirmar la preparación del reparto:

- Crear los registros operativos de Transferencias pendientes seleccionados.
- Mostrarlos en la pantalla general de Movimientos, claramente diferenciados.
- Incluir el control de confirmación «Transferencia realizada».
- Estado inicial obligatorio: **Pendiente de realizar**. «No confirmada» puede mostrarse como
  explicación, pero no como estado adicional.
- No generar Movimientos financieros ejecutados ni modificar Saldos, Ejecutado, Pendiente,
  Estado, métricas, informes o fotos de cierre.
- Conservar el vínculo con el reparto y el Ciclo que originaron la propuesta.
- Conservar el vínculo con la línea presupuestaria o adicional que originó cada pendiente.
- Aplicar auditoría, revisión/contexto e idempotencia.

La generación es atómica para el conjunto seleccionado: o se crean todos los pendientes
seleccionados o no se crea ninguno. Si ya existen pendientes de una generación anterior, la
nueva operación solo crea los que falten y no duplica los existentes.

### Contenido lógico mínimo del pendiente

Sin prescribir tabla ni esquema:

- ID estable e inmutable.
- Estado operativo.
- Importe exacto.
- Saldo origen y Saldo destino resueltos.
- Fecha prevista, separada de cualquier fecha efectiva.
- Concepto/Nota.
- Vínculo al reparto y al Ciclo de origen.
- Vínculo a la línea presupuestaria o adicional.
- Vínculo al Movimiento confirmado, cuando exista.
- Auditoría de creación, cambios, confirmación y cancelación.
- Revisión/contexto y clave de intento para concurrencia e idempotencia.

La ubicación física del estado pendiente se diseñará posteriormente. Debe estudiarse primero si
existe una capacidad reutilizable de borradores o pendientes; si no existe, se propondrá y
justificará el mínimo mecanismo persistente. No se crea un estado de ejecución ficticio dentro
del motor de Movimientos reales ni un segundo maestro financiero.

## 6. Confirmación individual desde Movimientos

El usuario accede a la Transferencia pendiente y revisa:

- Origen.
- Destino.
- Importe.
- Fecha bancaria real.
- Fecha prevista, como referencia separada.
- Descripción o contexto.
- Efecto presupuestario conocido, si existe.

El control «Transferencia realizada» permite confirmar expresamente que la operación ya se
ejecutó en el banco. No se marca automáticamente por el paso del tiempo ni por la confirmación
de otras líneas.

Al confirmar:

1. Validar datos y fecha efectiva. La fecha real no puede ser futura según el día civil de
   España; no se usa la fecha prevista como fecha efectiva.
2. Revalidar contexto, Saldos elegibles, destino, configuración del Presupuesto, Referencia
   cuando corresponda, advertencia de duplicados y revisión/concurrencia.
3. Registrar la Transferencia como Movimiento financiero ejecutado mediante los contratos de
   E1.4/E1.5, con su fecha real.
4. Reflejar el efecto en las posiciones calculadas de los Saldos; no escribir un saldo
   acumulado paralelo.
5. Recalcular la ejecución de los Presupuestos afectados según su Fuente. Para Aportación a
   saldo, solo si la Transferencia es ordinaria, sin Referencia, sin origen Exterior y hacia el
   destino exacto.
6. Mantener evidencia de confirmación, actor y momento, y resolver el pendiente en la misma
   transacción.

La confirmación de una línea es independiente del resto del reparto. Una Transferencia todavía
no realizada continúa Pendiente aunque hayan pasado varios días o se hayan confirmado las demás.
No caduca automáticamente.

La confirmación es atómica: Movimiento, resolución del pendiente y auditoría se confirman juntos
o no se confirman. Un fallo no deja un Movimiento sin pendiente resuelto ni un pendiente
marcado sin Movimiento. Un reintento con la misma clave y payload devuelve el mismo resultado;
un payload distinto con la misma clave se rechaza.

### Fecha real, Ciclo y vínculo de origen

La fecha real de la Transferencia determina su Ciclo y su ejecución presupuestaria conforme a
E2.1/E2.3. El vínculo con el reparto de origen es trazabilidad operativa, no una imputación
retroactiva.

Si la fecha real cae en un Ciclo distinto del Ciclo del reparto:

- El Movimiento pertenece al Ciclo de su fecha real.
- La Aportación a saldo se ejecuta en ese Ciclo, no en el de origen.
- El reparto de origen conserva el vínculo y muestra el efecto real, sin recalcular un Ciclo
  cerrado ni forzar una línea de plan en el Ciclo de destino.
- La interfaz debe avisarlo antes de confirmar.

### Correcciones posteriores

Los registros confirmados no se desmarcan libremente para borrar su efecto. Las correcciones
posteriores utilizan la rectificación o anulación auditada de Movimientos de E1.4.

La línea del reparto conserva el vínculo con el Movimiento. Si el Movimiento se rectifica o
anula, la línea no vuelve automáticamente a Pendiente ni genera una Transferencia sustitutiva.
El efecto financiero vigente se lee siempre del Movimiento; la especificación futura concretará
la presentación de ese vínculo sin crear un estado financiero nuevo ni duplicar el hecho.

## 7. Estados

Cada línea tendrá uno de estos estados operativos:

| Estado | Significado | Efecto financiero | Acciones |
| --- | --- | --- | --- |
| **Pendiente de realizar** | Preparada, todavía no ejecutada | Ninguno | Revisar, editar datos permitidos, confirmar, cancelar |
| **Confirmada** | El usuario confirma que se realizó; existe un Movimiento vinculado | El del Movimiento vigente | Consultar Movimiento; corregir por E1.4 |
| **Cancelada** | Descartada antes de ejecutar | Ninguno | Consultar motivo y trazabilidad |

Precisiones:

- «No confirmada» no es un cuarto estado; describe el estado Pendiente de realizar.
- «Excluida» no es un cuarto estado. Antes de generar, una línea puede excluirse del reparto y
  no crea pendiente. Después de generar, se cancela con motivo.
- Una línea Pendiente no caduca por tiempo.
- Una línea Confirmada no se desmarca libremente. La corrección del hecho se realiza en
  Movimientos con auditoría.
- La anulación del Movimiento vinculado no convierte la línea en Pendiente por sí sola. La
  especificación decidirá cómo se muestra la pérdida de efecto sin inventar un nuevo estado
  financiero.

## 8. Seguimiento en Movimientos

Añadir una indicación visible y un filtro **«Pendientes de confirmar»**.

Las Transferencias pendientes deberán:

- Aparecer en la pantalla de Movimientos en una fila, sección o representación diferenciada.
- Mostrar advertencia explícita, con icono y texto; no depender solo del color.
- Permitir revisar, confirmar o cancelar.
- Mantener la fecha prevista separada de la fecha efectiva.
- No contaminar balances, ejecución presupuestaria, informes financieros ni fotos de cierre.

La pantalla podrá combinar visualmente registros ejecutados y pendientes, pero distinguirá
inequívocamente sus naturalezas. **Un pendiente no se devuelve como Movimiento ni comparte su
identidad, estado o cómputo.** La vista combinada es de presentación; las colecciones y los
totales financieros permanecen separados.

Reutilizar la alerta y el tratamiento del mecanismo compartido de
[registro-coordinado-gastos.md](registro-coordinado-gastos.md). «Pendientes de confirmar» es el
filtro específico de Transferencias pendientes. «Requieren atención» puede ser un contador más
amplio de pendientes con incidencias, pero no un segundo estado ni un segundo motor. La
especificación definirá una única taxonomía de filtros y alertas.

## 9. Finalización del reparto

El reparto se considera completado cuando todas sus líneas están en estado terminal:

- Confirmada.
- Cancelada.

No queda ninguna línea en Pendiente de realizar. Las líneas excluidas antes de generar no
cuentan como pendientes; las que ya se generaron y no deban ejecutarse se cancelan con motivo.

Una sesión completada no crea automáticamente otra para el mismo Ciclo. Las nuevas
Transferencias independientes podrán registrarse mediante el procedimiento ordinario,
respetando los controles de duplicados.

Este documento no autoriza ampliar un reparto completado ni crear un segundo reparto. Si el
plan cambia después de completarlo, la vía prevista es el registro ordinario de Transferencias.
La especificación futura decidirá si hace falta una ampliación explícita y justificada.

## 10. Integridad y reutilización

Reutilizar los motores y reglas existentes:

- **Movimientos** como fuente única de realidad ejecutada.
- **Ciclos** como maestro temporal único.
- **Presupuestos y Partidas** sin nuevos maestros paralelos.
- **Fuente Aportación a saldo** basada únicamente en Transferencias reales elegibles:
  ordinarias, sin Referencia, sin origen Exterior y hacia el destino configurado.
- **Saldos** con posición calculada, sin saldo acumulado paralelo.
- **Protección de cierres financieros** y de historial.
- **Auditoría, idempotencia, concurrencia y control de acceso** conforme a E1.4/E1.5.

No duplicar motores financieros para gestionar el estado de preparación. No crear estados de
ejecución ficticios en Movimientos. No usar el pendiente como liquidez, reserva, ejecución
presupuestaria, hecho de cierre ni dato de informes.

La generación y la confirmación respetan las reglas vigentes de Saldos, terminales, fechas,
Referencias, Presupuestos y cierres. Un pendiente no aporta fondos para autorizar una operación
que incumpla esas reglas ni exime de ninguna validación.

## 11. Revisión de coherencia con las especificaciones existentes

### 11.1 Trazabilidad

| Ámbito | Contrato vigente | Lectura consolidada |
| --- | --- | --- |
| Movimientos | [E1.4](../04-movimientos-specification.md) | Solo hechos reales; sin estado de borrador en el motor; rectificación/anulación auditadas; fecha no futura; duplicado revisable |
| Transferencias | [E1.5](../05-transferencias-referencias-specification.md) | Dos Saldos activos distintos; sin S000/Exterior; fecha no futura; idempotencia; sin límite de fondos |
| Presupuestos | [E2.2](../08-presupuestos-specification.md) | Fuente y destino obligatorios; destino único entre Aportaciones; Gasto real se imputa por Partida; destino no es reserva |
| Plan del Ciclo | [E2.3](../09-plan-ciclo-specification.md) | `Pendiente = Del mes − Ejecutado`; Aportación solo Transferencias ordinarias elegibles; sin importe no hay Estado; no automatizar Transferencias |
| Ciclos | [E2.1](../07-ciclos-operacion-specification.md) | Periodo/corte único; la fecha real asigna el Ciclo; un ciclo futuro no iniciado no produce ejecución verificable |
| Cierre financiero | [E4.8/E4.9](../27-e49-cierre-financiero-specification.md) | T1 bloquea escrituras de Movimientos en ventana cerrada; un pendiente no es fuente financiera y no se captura en la foto |
| Nómina | [E2.5](../11-nomina-prevision-specification.md) | El ingreso se vincula a un Movimiento Nómina/Bonus y su Saldo receptor; puede haber más de una cuenta o paga |
| Mecanismo compartido | [Backlog de registro coordinado](registro-coordinado-gastos.md) | Un solo estado de Transferencia pendiente, una sola confirmación y una sola alerta; extiende su alcance, no lo duplica |
| Referencia funcional | [R3/R4](../functional-reference-v5.11.md) | Aportación a saldo suma Transferencias ordinarias al destino; excluye Referencias y Exterior; Gasto posterior no vuelve a ejecutar |

### 11.2 Precisiones aplicadas al texto consolidado

1. **Estados unificados.** El texto original usa «No confirmada / Pendiente de realizar» y
   «excluido justificadamente». Se consolidan en tres estados y se elimina la ambigüedad de un
   cuarto estado. Es una precisión de coherencia, no una nueva decisión funcional.
2. **Pendiente no es Movimiento.** El texto pide mostrarlo en Movimientos. Se concreta que la
   vista puede combinarlo visualmente, pero la API, la identidad, los totales y los motores
   financieros lo mantienen separado. Así se preserva E1.4.
3. **Aportación elegible.** Se explicita que la Transferencia pendiente de una Aportación debe
   ser ordinaria, sin Referencia, sin origen Exterior y hacia el destino exacto. Es la regla R3
   ya aprobada, no una exclusión nueva.
4. **Gasto real sin financiación automática.** Se aclara que el destino obligatorio de E2.2 no
   es una reserva. «Mantener en origen» no contradice E2.2; evita presentar una Transferencia
   como necesaria para ejecutar un Presupuesto que se imputa por Partida.
5. **Fechas separadas.** La fecha prevista puede ser futura porque no es la fecha económica. La
   confirmación vuelve a validar la fecha real no futura. No se modifica el bloqueo de E1.5.
6. **Ciclo por fecha real.** El vínculo al Ciclo de origen no es una imputación financiera. Si
   la confirmación cae en otro Ciclo, la ejecución se calcula allí; no se reescribe el Ciclo
   cerrado ni se fuerza una línea de plan.
7. **Derivados, no saldos persistidos.** «Actualizar los Saldos» y «recalcular Presupuestos» se
   interpretan como recalcular posiciones y ejecución desde el Movimiento, no como escribir
   saldos o ejecutados paralelos.
8. **Cierre protegido.** No se inicia un reparto nuevo en un Ciclo cerrado. Un pendiente no
   entra en la foto. Una confirmación con fecha real dentro de la ventana cerrada se rechaza
   con `HISTORY_LOCKED`; una confirmación con fecha real en un Ciclo abierto posterior crea el
   Movimiento allí. La reapertura E4.10 no se infiere ni se reanuda por esta propuesta; se rige
   por su propia especificación.
9. **Duplicados.** La idempotencia del reparto es técnica, por reparto/línea/intento. La
   advertencia económica de E1.5 sigue siendo revisable y no se convierte en unicidad. Dos
   líneas idénticas pueden representar dos Transferencias reales distintas.
10. **Línea adicional y Aportación.** Cualquier Transferencia ordinaria al destino de una
    Aportación ejecuta ese Presupuesto, aunque la línea se haya añadido manualmente. La
    interfaz debe mostrar el efecto para que la línea no se perciba como neutral.
11. **Origen de nómina.** La propuesta de cuenta receptora solo es válida si hay un candidato
    único y fiable. Con varias cuentas, pagas o bonus, se exige selección explícita; no se
    infiere por nombre ni por banco.
12. **Corrección posterior.** La línea Confirmada apunta al Movimiento; la realidad vigente se
    lee de Movimientos. Una rectificación o anulación no devuelve la línea a Pendiente por
    inferencia ni crea un reemplazo automático.
13. **Modelo físico compartido.** No se crea tabla, estado de Movimiento ni maestro en este
    documento. El mecanismo compartido definirá el registro lógico mínimo y su persistencia.
14. **Un reparto y finalización.** Se conserva un único reparto por Ciclo y la prohibición de
    crear otro automáticamente. La ampliación de un reparto completado queda fuera de esta
    propuesta y se decide en la especificación.

### 11.3 Tensiones que requieren decisión

| # | Tensión | Lectura propuesta | Gate |
| --- | --- | --- | --- |
| T1 | E2.3 excluye «automatizar Transferencias» y «botón de ejecutar plan»; esta mejora añade «Preparar reparto» | No se ejecuta el plan ni se paga desde la app; solo se preparan pendientes sin efecto. La exclusión se refiere a ejecutar o dar por ejecutado, no a preparar | La especificación debe acotarlo expresamente; si no se acepta, enmienda aprobada de E2.3 antes de desarrollar |
| T2 | E1.5 prohíbe fechas futuras; la fecha prevista puede ser futura | La fecha prevista no es un Movimiento; la confirmación valida la fecha real | Mantener E1.5 intacto; probar que la fecha prevista nunca se usa como efectiva |
| T3 | E2.3 imputa por fecha real; el reparto se vincula al Ciclo de origen | El vínculo es trazabilidad; la ejecución se calcula en el Ciclo de la fecha real | Mostrar el efecto antes de confirmar; no recalcular Ciclos cerrados |
| T4 | E4.9 bloquea Movimientos en ventana cerrada; puede haber pendientes de ese Ciclo | No se confirma dentro de la ventana; se cancela o se confirma con fecha de un Ciclo abierto | Decidir si el precierre avisa o bloquea; la foto no incluye pendientes |
| T5 | Un reparto completado y un plan que cambia después | No se crea otro automáticamente; la vía prevista es el registro ordinario | Decidir si se admite ampliación explícita; no inferirla |
| T6 | E1.5 usa advertencia de duplicados, no unicidad | Idempotencia técnica del reparto; advertencia económica al confirmar | Decidir cómo resolver un pendiente cuya Transferencia ya se registró por otro flujo |
| T7 | E2.3 no calcula Pendiente en un Ciclo futuro no iniciado | No hay importe automático; se muestra el motivo | Decidir si se permite preparación manual antes del inicio |
| T8 | Varias cuentas o pagas de nómina | Solo se propone origen si hay un candidato único fiable | Definir «fiable» y la base visible de la propuesta |
| T9 | Referencias Viaje/Evento ya existen en E1.5 | Una Referencia no ejecuta Aportación; no se habilitan Anticipos ni Compartidos | Decidir si se admiten en líneas adicionales de esta mejora |
| T10 | «Pendientes de confirmar» y «Requieren atención» | Son vistas del mismo mecanismo, no estados distintos | Definir una taxonomía única de filtros y alertas |

## 12. Decisiones abiertas para la futura especificación

1. **Alcance de E2.3.** Redactar la interpretación de «no automatizar Transferencias» y
   «no botón de ejecutar plan» que permita preparar pendientes sin ejecutar pagos. Si no se
   aprueba, no desarrollar.
2. **Mecanismo compartido.** Especificar una sola vez el registro de Transferencia pendiente,
   sus estados, su confirmación, su cancelación, su alerta y su persistencia, de forma que lo
   consuman tanto este reparto como el registro coordinado de gastos. No implementar dos
   mecanismos en paralelo.
3. **Ampliación de un reparto completado.** Decidir si se permite añadir líneas a un reparto ya
   completado o si toda Transferencia posterior va por el procedimiento ordinario.
4. **Ciclo futuro no iniciado.** Decidir si se puede preparar un reparto antes del inicio y con
   qué cobertura, sin inventar Pendiente ni ejecución.
5. **Cierre y pendientes.** Decidir el aviso de precierre, el tratamiento de la cancelación
   después del cierre y la confirmación con fecha real en un Ciclo abierto posterior.
6. **Pendiente ya registrado por otro flujo.** Decidir si se vincula a un Movimiento existente,
   se cancela con motivo o se muestra una advertencia; nunca crear un segundo Movimiento.
7. **Rectificación o anulación del Movimiento confirmado.** Definir la presentación de la línea
   y su vínculo sin devolverla automáticamente a Pendiente ni duplicar el hecho.
8. **Presupuesto inactivo o cambio de configuración.** Definir si una línea histórica inactiva
   puede generar propuesta manual y cómo se revalida un cambio de Fuente/destino antes de
   confirmar.
9. **Origen de nómina.** Definir el criterio de candidato fiable y cómo se muestra su base.
10. **Referencias en líneas adicionales.** Decidir si se admiten Viaje/Evento y cómo se avisa de
    que no ejecutan Aportación.
11. **Persistencia.** Estudiar la capacidad existente de borradores/pendientes y justificar el
    mínimo mecanismo si no existe. Sin SQL, tabla ni migración en esta entrada.
12. **API y UI.** Definir rutas, payloads, filtros, accesibilidad y estados de carga/error en la
    especificación; este documento no fija contratos técnicos.

## 13. Criterios de aceptación futuros

Propuestos, no aprobados ni ejecutados. La futura matriz formal los trazará a pruebas.

1. Preparar un reparto con líneas de Aportación, Gasto real y No aplica sin alterar Saldos,
   Ejecutado, Pendiente, Estado, plan, Presupuestos ni Movimientos.
2. Mostrar los pendientes en Movimientos como registros diferenciados, sin sumarlos a totales ni
   balances.
3. Confirmar solo una de varias Transferencias y mantener las demás Pendientes.
4. Reflejar el efecto financiero de una confirmación una sola vez; el reintento no duplica el
   Movimiento ni el pendiente.
5. Confirmar con fecha bancaria distinta de la prevista; la fecha prevista nunca se usa como
   fecha efectiva.
6. Cancelar una Transferencia pendiente sin generar efectos y conservando motivo y trazabilidad.
7. Recalcular correctamente una Aportación a saldo confirmada; si la fecha real cae en otro
   Ciclo, ejecutar allí sin recalcular el Ciclo cerrado.
8. No crear Transferencia automática para un Presupuesto de Gasto real ni presentar su destino
   como financiación necesaria.
9. No generar propuesta automática para No aplica.
10. Sin Del mes, sin periodo/corte verificable, con Ejecutado no verificable, con Pendiente cero
    o negativo: no inventar importe, cero, Estado ni propuesta.
11. Con origen terminal o sin posición calculable: no inventar déficit, mínimo, máximo ni saldo
    restante; permitir importe manual cuando proceda.
12. Con destino inactivo o no elegible: no proponer automáticamente y mostrar el motivo.
13. Cambiar Fuente, destino, plan o contexto entre preparación y confirmación: rechazar con
    conflicto y exigir revisión; no confirmar con datos obsoletos.
14. Añadir una línea manual sin crear Partida ni Presupuesto; si su destino es una Aportación,
    mostrar que ejecutará ese Presupuesto; si es Gasto real, mostrar que no lo ejecutará.
15. Resolver una Transferencia ya registrada por otro flujo sin crear un segundo Movimiento,
    conforme a la decisión que se apruebe.
16. En un Ciclo con cierre financiero: no iniciar un reparto nuevo; no confirmar con fecha real
    dentro de la ventana cerrada; no incluir pendientes en la foto; cancelar sin efecto.
17. Reintentar la generación del mismo reparto sin duplicar pendientes; añadir líneas nuevas sin
    regenerar las existentes; un solo reparto por Ciclo.
18. Rectificar o anular el Movimiento confirmado: conservar el vínculo, no devolver
    automáticamente la línea a Pendiente y no duplicar el efecto.
19. Filtro y alerta «Pendientes de confirmar» accesibles, con texto e icono, no solo color;
    revisión en móvil y escritorio.
20. Acceso con MFA, Origin/CSRF en escrituras, validación en servidor, auditoría de actor y
    momento, errores sin datos sensibles.
21. Un reparto completado no crea otro automáticamente; las Transferencias posteriores usan el
    procedimiento ordinario salvo decisión expresa de ampliación.
22. La aplicación no ejecuta Transferencias bancarias ni afirma haberlas ejecutado; solo registra
    hechos que el usuario confirma.

## 14. Encaje y dependencias

Entrada independiente del backlog, sin número de entrega y sin modificar las 30 entregas del
[roadmap aprobado](../roadmap.md).

| Dependencia | Uso | Estado de referencia |
| --- | --- | --- |
| E1.1 Saldos | Origen, destino y posiciones | Integrada |
| E1.4 Movimientos | Transferencia real, auditoría y correcciones | Integrada |
| E1.5 Transferencias | Reglas internas, fechas, duplicados e idempotencia | Integrada |
| E2.1 Ciclos | Periodo/corte y asignación por fecha real | Integrada |
| E2.2 Presupuestos | Fuente, destino y unicidad de Aportación | Integrada |
| E2.3 Plan del Ciclo | Pendiente/Estado y ejecución R3 | Integrada |
| E2.5 Nómina | Propuesta opcional de cuenta receptora | Integrada |
| E4.8/E4.9 | Precierre, cierre, T1 y foto | Especificadas; implementación no autorizada |
| Mecanismo compartido de pendientes | Estado único y confirmación | Propuesta en backlog; sin especificar |
| E3.1 Anticipos | Variante de pendiente con Referencia; no necesaria para Transferencias ordinarias | Integrada; AC36 parcial |
| E3.6 Conciliación | Consumidor de pendientes; no se modifica aquí | Documentación aprobada; DEV no autorizado |

Secuencia recomendada:

1. Aprobar esta entrada de backlog y resolver T1 (límite de E2.3).
2. Especificar una sola vez el mecanismo compartido de Transferencias pendientes, junto con el
   backlog de registro coordinado.
3. Especificar este reparto como consumidor de ese mecanismo.
4. Integrar la protección de cierres cuando E4.8/E4.9 estén disponibles.
5. Autorizar desarrollo en una fase separada, con QA independiente y sin despliegue.

No se adelanta E3.1, E3.2, E3.6, E4.8 ni E4.9 por esta propuesta. No se modifican sus contratos.
La variante de pendiente con Anticipo del registro coordinado sigue dependiendo de E3.1; el
reparto de Transferencias ordinarias no la necesita, pero no debe implementar un mecanismo
paralelo antes de que el compartido esté especificado.

## 15. Estado y próximo gate

- **Documento:** propuesta funcional registrada; no es una especificación aprobada.
- **Código, esquema, migraciones, API y UI:** no autorizados, no diseñados aquí.
- **Roadmap y especificaciones aprobadas:** sin cambios.
- **Próximo gate:** revisión del usuario. Si se aprueba la entrada, autorización separada para
  preparar la especificación, previa resolución de T1 y del mecanismo compartido.
- **Merge:** requiere aprobación explícita e identificable del usuario; no se auto-fusiona.

Los casos de §13 son cobertura propuesta, no criterios formalmente aprobados ni pruebas
ejecutadas. Este documento no autoriza desarrollo, cambios de arquitectura ni modificaciones del
roadmap aprobado.
