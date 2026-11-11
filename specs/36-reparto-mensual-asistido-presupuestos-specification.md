# 36 — REPARTO-MENSUAL: reparto mensual asistido de presupuestos — Specification

Status: **APROBADA PARA DESARROLLO — 2026-11-11.** D1–D10 aprobadas con las
precisiones D8/D3; autorizados los incrementos 1 (mecanismo compartido de Transferencia
pendiente) y 2 (reparto mensual asistido). SPEC37 sigue sin autorización de DEV. La
aprobación no convierte cada `[PROPUESTA]` en contrato cerrado ni autoriza datos reales,
migraciones operativas o despliegue.
Approval source/date: **2026-11-11 — usuario**, aprobación explícita e identificable de
D1–D10 y autorización de los incrementos 1–2 (texto en §0). v28/C28 autorizados
condicionalmente y confirmados por la comprobación física.
Context and brainstorming: [backlog de reparto mensual](backlog/reparto-mensual-asistido-presupuestos.md),
[backlog de registro coordinado](backlog/registro-coordinado-gastos.md),
[SPEC09 Plan del ciclo](09-plan-ciclo-specification.md),
[SPEC10 Plan anual](10-plan-anual-specification.md),
[SPEC08 Presupuestos](08-presupuestos-specification.md),
[SPEC05 Transferencias](05-transferencias-referencias-specification.md),
[SPEC04 Movimientos](04-movimientos-specification.md) y
[SPEC21 Pendientes y conciliación](21-pendientes-conciliacion-specification.md).
Base documental: `test` `82b9dc3`; redacción exclusivamente documental, sin código.

Las marcas `[CONFIRMADO]`, `[PROPUESTA]` y `[PENDIENTE]` distinguen contratos vigentes,
diseño propuesto y cuestiones sin decisión. Ninguna marca convierte una propuesta en
autorización. Este documento no reabre decisiones de las specs base, no cambia sus AC,
no crea tablas ni rutas por sí mismo y no declara ninguna prueba ejecutada.

## 0. Registro de aprobación — 2026-11-11

`[CONFIRMADO]` El usuario aprobó el **2026-11-11** las decisiones D1–D10 de esta SPEC y
autorizó el desarrollo incremental. Texto sustantivo de la aprobación:

> «Apruebo las decisiones **D1–D10 de SPEC36**, con las siguientes precisiones:
> - D8: se permite conservar o mostrar una línea manual histórica de presupuesto inactivo
>   con aviso, pero nunca generar una Transferencia pendiente nueva hacia un destino
>   inactivo o no elegible.
> - D3: apruebo la persistencia de borradores y Transferencias pendientes. Autorizo **v28,
>   migración y C28** si la comprobación de la estructura física confirma que no puede
>   resolverse reutilizando correctamente las entidades existentes. No duplicar maestros
>   ni motores.
>
> **Autorizo iniciar el desarrollo incremental de SPEC36:**
> 1. Implementar primero el mecanismo operativo compartido de Transferencia pendiente, con
>    persistencia mínima, estados, idempotencia, concurrencia, auditoría y confirmación
>    atómica mediante Movimiento real.
> 2. Incorporar después el reparto mensual asistido, reutilizando E2.3 sin recalcular sus
>    métricas.
> 3. Preparar SPEC37 como siguiente consumidor. Sus decisiones propias D1–D10 siguen
>    pendientes de aprobación; no iniciar su DEV todavía.»

`[CONFIRMADO]` La comprobación física concluyó que no existe entidad reutilizable y que
procede v28 con C28; el esquema se entregó en el incremento 1 (PR #388). Límites de esta
aprobación: sin datos reales, sin despliegue, sin migración operativa, sin SPEC37 y sin
convertir la aceptación con fixtures en aceptación funcional.

## 1. Objetivo y alcance

`[PROPUESTA]` Permitir que el usuario prepare, una vez por Ciclo, un **reparto asistido**
de las Transferencias que financian el plan mensual. El reparto parte exclusivamente del
**equivalente mensual de E2.3 («Del mes») por Presupuesto**, no del Plan anual completo ni
de un prorrateo de E2.4. Genera registros operativos de **Transferencia pendiente** que el
usuario confirma individualmente cuando verifica su ejecución bancaria. La realidad
financiera ejecutada sigue siendo exclusivamente la de Movimientos.

Incluye:

1. Una acción «Preparar reparto del ciclo» dentro del Plan del ciclo.
2. La lectura de las líneas del plan E2.3 y de la configuración E2.2, sin recalcularlas.
3. La propuesta de importes para Presupuestos de fuente Aportación a saldo.
4. La edición de un borrador, la generación atómica de pendientes y su seguimiento.
5. El mecanismo compartido de Transferencia pendiente que también consume
   [SPEC37](37-registro-coordinado-gastos-specification.md).
6. La confirmación individual con fecha bancaria real y la cancelación con motivo.

No incluye:

- Ejecutar Transferencias bancarias ni integración bancaria.
- Crear Gastos, Ingresos, Partidas, Presupuestos, Referencias, Anticipos o maestros
  paralelos.
- Modificar Del mes, Base, Esencial, fuente, destino o vínculos del Presupuesto.
- Crear una segunda lógica de plan mensual o anual.
- Convertir un pendiente en liquidez, reserva, ejecución presupuestaria, hecho de cierre
  o dato de informes.
- Implementar API, SQLite, migraciones o UI en esta fase.

`[CONFIRMADO 2026-11-11]` La interpretación de E2.3 que permite «preparar» sin
«automatizar Transferencias» ni «ejecutar el plan» fue aprobada explícitamente como D1
(§0 y §17). Preparar pendientes no ejecuta pagos ni da el plan por ejecutado.

## 2. Autoridad y dependencias

| Materia | Documento propietario | Uso en esta spec | No se reabre |
| --- | --- | --- | --- |
| Saldos y posiciones | [SPEC01](01-saldos-control-specification.md) | Origen, destino y posición calculada | Terminal/No controlado sin posición convencional |
| Movimientos | [SPEC04](04-movimientos-specification.md) | Único hecho financiero real; auditoría y correcciones | Tipos, fechas no futuras, rectificación/anulación |
| Transferencias | [SPEC05](05-transferencias-referencias-specification.md) | Dos Saldos activos distintos; sin S000/Exterior; idempotencia | Reglas de alta y duplicados |
| Ciclos | [SPEC07](07-ciclos-operacion-specification.md) | Maestro temporal único; fecha real asigna Ciclo | Intervalo y corte |
| Presupuestos | [SPEC08](08-presupuestos-specification.md) | Fuente, destino obligatorio y unicidad de Aportación | Dominio de fuente y destino |
| Plan del ciclo | [SPEC09](09-plan-ciclo-specification.md) | Del mes, Ejecutado, Pendiente y Estado | Motor R3 y sus fórmulas |
| Plan anual | [SPEC10](10-plan-anual-specification.md) | Relación conceptual; no se lee para calcular líneas ni importes del reparto | Presupuesto anual por Partida; conserva su equivalente esencial mensual |
| Nómina | [SPEC11](11-nomina-prevision-specification.md) | Propuesta opcional de cuenta receptora | Vínculos de nómina |
| Anticipos | [SPEC13](13-anticipos-specification.md) | Distinción pendiente de realizar / pendiente de recuperación | Motor de Anticipos |
| Pendientes transversales | [SPEC21](21-pendientes-conciliacion-specification.md) | Bandeja de pendientes y taxonomía de cobertura | Read model E3.6 |
| Cierres y fotos | [SPEC27](27-e49-cierre-financiero-specification.md), [SPEC26](26-e48-precierre-specification.md) | Bloqueo de escrituras y exclusión de pendientes | `HISTORY_LOCKED` y foto |

`[CONFIRMADO]` El motor E2.3 calcula `Pendiente = Del mes − Ejecutado` solo con fuente
comparable, periodo/corte verificable y Del mes informado. Sin esas condiciones no hay
importe ni Estado. Un Ciclo futuro no iniciado no produce ejecución verificable.

`[CONFIRMADO]` E2.4 es un plan anual por Partida y ejercicio, independiente del plan
mensual. No se divide entre doce, no se prorratea por Ciclo y no crea líneas Del mes.
Esta spec no introduce un consumidor que convierta el plan anual en reparto.

## 3. Conceptos y modelo operativo

| Concepto | Naturaleza | Identidad | Efecto financiero |
| --- | --- | --- | --- |
| Reparto | Preparación operativa por Ciclo | ID estable de reparto; único por ID de Ciclo | Ninguno |
| Línea de reparto | Decisión de financiación | ID estable dentro del reparto | Ninguno |
| Transferencia pendiente | Registro operativo compartido | ID estable de pendiente | Ninguno |
| Transferencia real | Movimiento E1.5 | ID de Movimiento | Posición y ejecución según motores |
| Confirmación | Acto del usuario | Evidencia de actor, momento y revisión | Crea el Movimiento real |

`[PROPUESTA]` Un reparto puede estar en uno de tres estados operativos:

| Estado | Significado | Líneas |
| --- | --- | --- |
| **Borrador** | Preparación iniciada y todavía no generada | Editables; sin pendientes |
| **Generado** | Se generaron uno o más pendientes | Pendientes, confirmadas o canceladas |
| **Completado** | Todas las líneas generadas están en estado terminal | Sin Pendiente de realizar |

«Excluida» no es un estado: una línea excluida antes de generar no crea pendiente.
Después de generar, se cancela con motivo. «No confirmada» describe el estado
Pendiente de realizar y no añade un cuarto estado.

`[PROPUESTA]` La preparación previa a la generación es un borrador operativo. Su
persistencia concreta se decide junto con el mecanismo compartido (§6.4). No es un hecho
financiero ni aparece en informes, fotos o ejecución.

## 4. Entradas y lectura del plan

Para cada Presupuesto del plan del Ciclo se muestra, cuando sea verificable:

- ID y nombre estable del Presupuesto.
- Fuente de ejecución: Gasto real, Aportación a saldo o No aplica.
- Destino configurado, solo lectura.
- Del mes.
- Ejecutado.
- Pendiente y Estado E2.3.
- Cobertura y motivo cuando falte un dato.

`[CONFIRMADO]` No se muestran cifras derivadas si falta el periodo/corte verificable, el
Del mes o la cobertura de la fuente. Se muestra el motivo, nunca un cero sustitutivo.
«Sin plan» no inventa líneas ni importes.

`[PROPUESTA]` La lista se ordena por ID de Presupuesto y conserva los filtros de la
pantalla de plan. Un Presupuesto inactivo con línea histórica permanece visible y se
marca como no elegible para nuevas propuestas.

## 5. Reglas de reparto propuestas

Las cifras de los ejemplos son sintéticas y no representan datos reales.

### 5.1 Aportación a saldo

`[PROPUESTA]` Para una línea de fuente Aportación a saldo:

1. Proponer una Transferencia ordinaria hacia el Saldo destino exacto del Presupuesto.
2. Sugerir el **Pendiente positivo verificable** de E2.3: `Del mes − Ejecutado`, solo si
   la fuente es comparable, el periodo/corte es verificable, el Del mes está informado y
   el resultado es mayor que cero.
3. Permitir editar el importe. Un importe superior al Pendiente puede producir Estado
   Excedido; se muestra el efecto y no se trunca el Pendiente negativo a cero.
4. Permitir varias Transferencias parciales hacia la misma línea presupuestaria como
   líneas distintas decididas por el usuario. La interfaz muestra el efecto acumulado y
   no las presenta como una única Transferencia duplicada.
5. Mantener la Transferencia como ordinaria: sin Referencia y sin origen Exterior. Si el
   usuario añade una Referencia operativa admitida (D10) o cambia el destino, la línea deja
   de ejecutar esa Aportación a saldo; se explica antes de confirmar. No se admite
   Referencia de Anticipo en esta mejora.
6. Obtener el destino del Presupuesto, sin editarlo en la línea. Si el destino está
   inactivo o ya no es elegible, no se propone automáticamente y se muestra el motivo.
7. No modificar Del mes, Base, Esencial, Fuente, destino ni vínculos del Presupuesto.

### 5.2 Gasto real

`[PROPUESTA]` Para una línea de fuente Gasto real:

- Mostrar por defecto «Mantener en origen», normalmente la cuenta receptora de la nómina
  cuando pueda identificarse de forma fiable.
- No crear Transferencia automática.
- No presentar el Saldo destino obligatorio del Presupuesto como reserva, objetivo de
  financiación o dinero que deba enviarse. La ejecución se imputa por Partida.
- Si el usuario decide añadir una línea manual hacia ese destino, será una Transferencia
  ordinaria adicional; no ejecutará la fuente Gasto real ni alterará su Ejecutado.
- Si no hay un único candidato fiable de cuenta de nómina, exigir selección explícita de
  origen. No inferir por nombre del Saldo, banco ni última Transferencia sin mostrar la
  base de la propuesta.

### 5.3 No aplica

`[PROPUESTA]` Mostrar la línea sin propuesta automática de financiación. No calcular
Pendiente ni Estado comparables. Conservar los importes de plan sin convertirlos en
ejecución.

### 5.4 Reglas comunes de importe

- El importe de una línea es positivo, en euros con céntimos exactos.
- Cero o negativo no genera pendiente.
- Pendiente cero o negativo no genera propuesta automática; se muestra Completo o
  Excedido cuando sea verificable.
- Sin Del mes, sin periodo/corte verificable o con Ejecutado no verificable, no se
  inventa importe sugerido. Se permite la decisión manual mostrando que no hay pendiente
  verificable.
- El Pendiente presupuestario no demuestra liquidez en el Saldo de origen. No se usa para
  bloquear ni para afirmar disponibilidad.
- No se redondea a euros ni se usan pasos de barra para alterar el importe exacto.

### 5.5 Origen y líneas adicionales

`[PROPUESTA]`

- Selector común de Saldo de origen, con propuesta de la cuenta receptora de la nómina
  solo si hay un candidato único fiable y su base es visible.
- El selector común actúa como valor por defecto; cada línea conserva el origen
  finalmente resuelto. Cambiar el valor común no reescribe líneas ya configuradas.
- El destino de las líneas presupuestarias procede del Presupuesto y no es editable.
- «Añadir transferencia» permite origen, destino, importe, fecha prevista y
  descripción o contexto. Se reutilizan Concepto/Nota de E1.5; no se crea un maestro de
  descripciones.
- Las líneas adicionales son Transferencias internas entre Saldos activos, distintos y
  elegibles. No se admite S000 ni Exterior en ningún extremo.
- Si una línea adicional usa el destino de una Aportación a saldo y es una Transferencia
  ordinaria, ejecutará ese Presupuesto al confirmarse, aunque no se haya generado desde
  su línea de plan. La interfaz debe mostrarlo; la línea no es financieramente neutral.
- Si usa el destino de un Gasto real, no ejecutará su fuente.
- Una Referencia admitida en una línea adicional se rige por E1.5 y no convierte la línea
  en ejecución de Aportación a saldo. En esta primera propuesta no se habilitan Anticipos
  ni Gastos compartidos.
- Fuera de alcance: Anticipos, Gastos compartidos, Vehículo, Deuda, inversión,
  Transferencias con Exterior y cualquier operación especial que requiera ficha propia.

## 6. Mecanismo compartido de Transferencia pendiente

Esta sección es la definición canónica de la pieza única que consumen SPEC36 y
[SPEC37](37-registro-coordinado-gastos-specification.md). Ningún flujo crea un segundo
registro, estado, alerta o confirmación paralela.

### 6.1 Contrato vigente identificado

`[CONFIRMADO]` Antes de esta propuesta no existe una Transferencia pendiente persistida:

1. **E1.5** define la Transferencia como un único Movimiento real. No hay borrador ni
   estado «no realizada» dentro del motor de Movimientos.
2. **E3.6 / SPEC21 §5** define una bandeja transversal de pendientes de casos, en modo
   lectura, con taxonomía de estado, cobertura y severidad. No persiste casos, importes
   ni transferencias y no es un formulario de alta.
3. **E3.1** distingue el «pendiente de recuperación» de un Anticipo real del «pendiente
   de realizar» de una Transferencia que aún no existe.
4. El esquema y el código consultados en la base `82b9dc3` no contienen tabla, endpoint
   ni estado de Transferencia pendiente.

`[PROPUESTA]` Por tanto, la pieza única se construye reutilizando la **bandeja E3.6** como
vista consumidora y el **servicio E1.5** como único escritor de la Transferencia real. La
extensión mínima es un registro operativo de Transferencia pendiente que alimenta esa
bandeja. La bandeja E3.6 sigue siendo de solo lectura; el registro operativo es una fuente
de entrada, no una escritura en su modelo. Si el coordinador consideraba existente otro
contrato, debe identificarse antes de aprobar; esta spec no lo presupone ni duplica.

### 6.2 Registro lógico mínimo

Sin prescribir tabla, DDL ni migración:

| Dato | Regla |
| --- | --- |
| ID estable e inmutable | Identidad del pendiente; no se reutiliza |
| Estado operativo | Pendiente de realizar, Confirmada o Cancelada |
| Importe | EUR exacto, estrictamente positivo |
| Saldo origen y destino | IDs resueltos; elegibles en la confirmación |
| Fecha prevista | Separada de la fecha efectiva; puede ser futura |
| Concepto/Nota | Texto libre reutilizado de E1.5 |
| Origen del pendiente | Reparto/línea o registro coordinado de Gasto |
| Vínculo al reparto y Ciclo de origen | Trazabilidad operativa, no imputación |
| Vínculo a la línea presupuestaria o adicional | Obligatorio si procede de reparto |
| Vínculo al Gasto relacionado | Solo para el flujo de SPEC37 |
| Referencia de Anticipo prevista | Solo para el flujo de SPEC37; no crea el Anticipo |
| Vínculo al Movimiento confirmado | Cuando exista; inmutable para la lectura vigente |
| Auditoría | Creación, cambios, confirmación, cancelación y actor |
| Revisión y clave de intento | Concurrencia e idempotencia |

### 6.3 Estados y transiciones

| Estado | Significado | Efecto | Acciones permitidas | Salidas |
| --- | --- | --- | --- | --- |
| **Pendiente de realizar** | Preparada, no ejecutada | Ninguno | Revisar, editar datos permitidos, confirmar, cancelar, vincular un hecho existente | Confirmada o Cancelada |
| **Confirmada** | El usuario confirma que se realizó; existe un Movimiento vinculado | El del Movimiento vigente | Consultar; corregir por E1.4 | Terminal para el pendiente |
| **Cancelada** | Descartada antes de ejecutar | Ninguno | Consultar motivo y trazabilidad | Terminal |

Precisiones:

- «No confirmada» no es un estado; describe Pendiente de realizar.
- «Excluida» se resuelve antes de generar o como cancelación con motivo.
- «Requiere revisión» es una **condición calculada o marcada** con motivo, no un cuarto
  estado. Bloquea la confirmación hasta que el usuario edite, vincule o cancele.
- «Pendientes de confirmar» es el filtro de todos los pendientes en estado Pendiente de
  realizar. «Requieren atención» es un filtro más amplio para pendientes con
  `requiere revisión` o alertas de la bandeja E3.6; no es un estado.
- Una línea Pendiente no caduca por tiempo.
- Una Confirmada no se desmarca libremente. La corrección del hecho se realiza en
  Movimientos con auditoría.
- La anulación del Movimiento vinculado no devuelve el pendiente a Pendiente por sí sola.

### 6.4 Persistencia, idempotencia y atomicidad

`[PROPUESTA]` La persistencia física queda sujeta a autorización separada. Debe
justificarse primero si la bandeja E3.6 y las tablas de idempotencia existentes bastan.
Si hace falta una entidad nueva, será **una sola** para ambos flujos y requerirá
aprobación; no se crea un maestro financiero ni un estado ficticio en Movimientos.

- Generación: atómica para el conjunto seleccionado. O se crean todos los pendientes o
  ninguno.
- Reintento de generación: misma clave y payload devuelve el mismo resultado; payload
  distinto con la misma clave se rechaza con conflicto.
- Confirmación: atómica entre Movimiento real, resolución del pendiente, efectos
  derivados y auditoría. Un fallo no deja un Movimiento sin pendiente resuelto ni un
  pendiente marcado sin Movimiento.
- Concurrencia: dos confirmaciones simultáneas producen un único Movimiento y una única
  resolución.
- La idempotencia técnica no es unicidad económica: dos Transferencias reales idénticas
  pueden existir si el usuario las confirma como hechos distintos, con la advertencia
  revisable de E1.5.
- Un pendiente nunca aporta fondos ni exime de una validación vigente.

## 7. Ciclo de vida del reparto

`[PROPUESTA]`

1. **Inicio manual.** Abrir, iniciar o cerrar un Ciclo, cambiar el plan o modificar un
   Presupuesto no crea un reparto automáticamente.
2. **Un reparto por ID de Ciclo.** La unicidad es técnica, por Ciclo, no por contenido.
3. **Borrador reabrible.** Mientras no se genere, el usuario puede cerrar y continuar.
   Si ya existen pendientes, las líneas nuevas generan solo sus propios pendientes; no se
   regeneran los existentes.
4. **Generación.** Crea los pendientes seleccionados y conserva el vínculo con el reparto,
   el Ciclo y la línea de origen.
5. **Seguimiento.** El reparto mantiene lectura de líneas, estados, vínculos y Ciclo de
   origen después de completarse.
6. **Finalización.** Se completa cuando todas las líneas generadas están Confirmadas o
   Canceladas. Las líneas excluidas antes de generar no cuentan como pendientes.
7. **Sin segundo reparto.** Un reparto completado no crea otro automáticamente. Las
   Transferencias posteriores usan el procedimiento ordinario salvo decisión expresa de
   ampliación (D5).
8. **Sin plan.** Un Ciclo sin plan no inventa líneas ni importes. Solo podrá usar líneas
   adicionales si el usuario las decide; no se crean Presupuestos ni Partidas.

## 8. Confirmación individual

`[PROPUESTA]` El usuario revisa origen, destino, importe, fecha bancaria real, fecha
prevista, descripción y efecto presupuestario conocido. El control «Transferencia
realizada» confirma expresamente que la operación ya se ejecutó en el banco. No se marca
automáticamente por el paso del tiempo ni por la confirmación de otras líneas.

Al confirmar:

1. Validar datos y fecha efectiva. La fecha real no puede ser futura según el día civil
   de España; no se usa la fecha prevista como fecha efectiva.
2. Revalidar contexto, Saldos elegibles, destino, configuración del Presupuesto,
   Referencia cuando corresponda, advertencia de duplicados y revisión/concurrencia.
3. Registrar la Transferencia como Movimiento financiero ejecutado mediante los
   contratos de E1.4/E1.5, con su fecha real.
4. Reflejar el efecto en las posiciones calculadas de los Saldos; no escribir un saldo
   acumulado paralelo.
5. Recalcular la ejecución de los Presupuestos afectados según su Fuente. Para
   Aportación a saldo, solo si la Transferencia es ordinaria, sin Referencia, sin origen
   Exterior y hacia el destino exacto.
6. Mantener evidencia de confirmación, actor y momento, y resolver el pendiente en la
   misma transacción.

La confirmación de una línea es independiente del resto. Una Transferencia no realizada
continúa Pendiente aunque hayan pasado días o se hayan confirmado las demás. No caduca.

### 8.1 Fecha real, Ciclo y vínculo de origen

La fecha real determina el Ciclo y la ejecución presupuestaria conforme a E2.1/E2.3. El
vínculo con el reparto de origen es trazabilidad operativa, no una imputación
retroactiva.

Si la fecha real cae en un Ciclo distinto del Ciclo del reparto:

- El Movimiento pertenece al Ciclo de su fecha real.
- La Aportación a saldo se ejecuta en ese Ciclo, no en el de origen.
- El reparto de origen conserva el vínculo y muestra el efecto real, sin recalcular un
  Ciclo cerrado ni forzar una línea de plan en el Ciclo de destino.
- La interfaz avisa antes de confirmar.

### 8.2 Correcciones posteriores

Los registros confirmados no se desmarcan libremente para borrar su efecto. Las
correcciones usan la rectificación o anulación auditada de E1.4. La línea del reparto
conserva el vínculo con el Movimiento. Si el Movimiento se rectifica o anula, la línea no
vuelve automáticamente a Pendiente ni genera una Transferencia sustitutiva. El efecto
financiero vigente se lee siempre del Movimiento. La presentación propuesta es
«Confirmada · hecho anulado», con vínculo de solo lectura y condición «Requiere revisión»;
no es un cuarto estado, no reabre la línea y no duplica el hecho.

## 9. Relación con E2.3, el Plan anual y los Ciclos

`[PROPUESTA]`

- **Fuente mensual E2.3.** El reparto parte del «Del mes» de cada Presupuesto en el Plan
  del ciclo, que es el equivalente mensual aprobado. No parte del Plan anual completo. El
  reparto no divide ni prorratea el anual; SPEC10 conserva su equivalente esencial mensual.
  Sin Del mes no hay importe sugerido.
- **Plan anual E2.4.** Es una decisión anual por Partida y ejercicio, independiente del
  reparto. No se usa como fuente, objetivo ni importe de respaldo; el reparto no lo lee
  para calcular líneas. Esta relación no contradice SPEC10 ni crea una segunda lógica de
  plan.
- **Ciclo único.** El reparto se ancla a un ID de Ciclo. No se crea un Ciclo por reparto
  ni se usa el mes natural como sustituto.
- **Ciclo futuro no iniciado.** Si no hay periodo/corte verificable, no se sugiere
  importe automático. Se permite preparar el borrador con importes manuales; la
  generación queda condicionada a la decisión D4.
- **Ciclo cerrado.** No se inicia un reparto nuevo. Los pendientes preexistentes no se
  convierten en hechos por el cierre y no entran en la foto. Una confirmación con fecha
  real dentro de la ventana cerrada se rechaza con `HISTORY_LOCKED`; una confirmación con
  fecha real en un Ciclo abierto posterior crea el Movimiento allí.
- **Precierre.** El aviso de precierre no convierte pendientes en hechos ni los incluye
  en la foto; solo advierte de su existencia. La decisión de bloquear o solo avisar queda
  en D6.
- **Reapertura.** No se infiere ni se reanuda por esta propuesta; se rige por
  [SPEC28](28-e410-reapertura-specification.md).

## 10. Pantallas e interacción

`[PROPUESTA]` Se reutilizan los componentes y tokens vigentes de
[UI](guidelines/ui.md), con 390 px de referencia móvil y 1440 px de escritorio.

### 10.1 Plan del ciclo

```text
PLAN DEL CICLO — C1 (01/01/2026–31/01/2026)        [Preparar reparto del ciclo]
Presupuesto        Fuente               Del mes    Ejecutado   Pendiente E2.3  Estado
PRE-A · Provisión  Aportación a saldo   100,00 €    40,00 €     60,00 €         Pendiente
PRE-G · Gastos     Gasto real           200,00 €   120,00 €     80,00 €         Pendiente
PRE-N · Reserva    No aplica            50,00 €    —           —               —
[Origen común: S001 · Cta principal]  [Añadir transferencia]
[ ] PRE-A  S001 → S002  60,00 €  prevista 05/01  [Excluir]
[ ] PRE-G  mantener en origen · sin transferencia automática
[Generar pendientes seleccionados]   [Guardar borrador]
```

- La columna «Pendiente E2.3» es el derivado presupuestario de SPEC09; no es una
  Transferencia pendiente ni implica una propuesta de financiación para Gasto real.
- La cifra de Pendiente E2.3 solo aparece con cobertura verificable; en otro caso se
  muestra el motivo.
- El origen propuesto muestra su base y exige confirmación.
- Las líneas adicionales se distinguen de las presupuestarias.
- El botón de generación indica cuántos pendientes creará y no afirma que se haya
  ejecutado ningún pago.

### 10.2 Movimientos

- Los pendientes aparecen en una fila o sección diferenciada, con icono y texto
  «Pendiente de realizar»; no se presentan como Movimientos ejecutados.
- Filtro «Pendientes de confirmar» y contador «Requieren atención».
- La fecha prevista se muestra separada de la fecha efectiva.
- No contaminan balances, ejecución presupuestaria, informes ni fotos.
- La vista combinada es de presentación; las colecciones y totales financieros
  permanecen separados.

### 10.3 Confirmación y accesibilidad

- Revisión previa con origen, destino, importe, fecha real, fecha prevista, efecto
  presupuestario y aviso de Ciclo distinto.
- Error de fecha, Saldo inactivo o conflicto con foco asociado; nunca solo color.
- Teclado, foco visible, etiquetas y contraste conforme a UI; sin scroll horizontal a
  390 px.
- «No disponible» explícito; no se usa 0 ni guion para una ausencia.

## 11. API, persistencia y límites técnicos

`[PROPUESTA]` Esta spec no autoriza abrir API ni SQLite. Solo describe operaciones
lógicas, sin fijar rutas, verbos, payloads ni DDL:

1. Consultar el reparto de un Ciclo y sus líneas.
2. Guardar o reabrir el borrador.
3. Generar los pendientes seleccionados.
4. Consultar, editar, confirmar, cancelar o vincular un pendiente.
5. Consultar la bandeja y sus filtros.

Condiciones técnicas propuestas:

- Reutilizar el servicio de Movimientos y el de Transferencias; no escribir tablas
  financieras desde el reparto.
- Reutilizar autenticación, MFA, Origin/CSRF, revisión de contexto, idempotencia y
  auditoría existentes.
- Servidor valida y deriva todo importe, estado y vínculo; el cliente no envía derivados.
- Errores genéricos con `requestId`, sin SQL, datos personales ni payload bancario.
- Sin integración bancaria ni servicio externo.

## 12. Estados vacíos, carga y errores

| Situación | Comportamiento observable |
| --- | --- |
| Ciclo sin plan | «Sin plan»; no se inventan líneas ni importes |
| Sin presupuestos elegibles | Explicar la causa; no usar S000 ni destinos inactivos |
| Sin cobertura de periodo/corte | Mantener Del mes visible si existe; Ejecutado/Pendiente/Estado con motivo |
| Sin candidato único de nómina | Exigir selección explícita de origen; mostrar la base de la propuesta |
| Destino inactivo o no elegible | No proponer automáticamente; motivo visible |
| Carga fallida | Reintento sin perder borrador ni filtros |
| Conflicto de revisión | 409; conservar borrador; exigir releer y revisar |
| `HISTORY_LOCKED` | Rechazo sin escritura; explicar la ventana cerrada |
| Sesión caducada | Flujo MFA existente; conservar borrador en memoria; sin bypass |
| Reintento de red tras confirmar | Misma clave y payload; mismo resultado; sin doble Movimiento |

Nunca se sustituye una ausencia por cero, una fecha desconocida por hoy ni un error por
una lista vacía.

## 13. Permisos y seguridad

`[PROPUESTA]` Aplicación privada de un único usuario, con los controles vigentes:

- Acceso autenticado y MFA para escrituras.
- Validación de Origin/CSRF y de sesión en servidor.
- Validación de dominio en servidor; no confiar en el cliente.
- Auditoría de actor, momento, revisión y cambios.
- Sin secretos, credenciales, datos reales ni bases en Git.
- Sin despliegue, cambios de permisos ni operaciones destructivas.
- Errores sin datos sensibles; logs sin payload financiero.

## 14. Exclusiones

- Implementación, código, API, SQLite, migraciones, UI o despliegue.
- Ejecución de Transferencias bancarias o integración con banco.
- Nuevos Tipos de Movimiento, estados ficticios en Movimientos o maestros paralelos.
- Cálculo de liquidez, reservas, objetivos de financiación o límites de fondos.
- Anticipos, Gastos compartidos, Vehículo, Deuda, inversión y Exterior en esta mejora.
- Automatización del plan, botón de ejecutar plan o pago desde la aplicación.
- Modificación de AC de specs base, del roadmap o del tablero.
- Datos reales, Excel, bases reales o información privada.

## 15. Fixtures sintéticos previstos

Los fixtures son ficticios y se usarán solo en pruebas futuras autorizadas.

| Código | Contenido |
| --- | --- |
| F36-CIC | Ciclo C1 abierto 01–31/01/2026; C2 abierto 01–28/02/2026; C3 con cierre financiero |
| F36-SAL | S001 origen; S002 destino Aportación; S003 destino Gasto real; S004 Terminal |
| F36-PRE | PRE-A Aportación a S002; PRE-G Gasto real a S003; PRE-N No aplica |
| F36-PAR | PAR-1 vinculada a PRE-A; PAR-2 vinculada a PRE-G |
| F36-PLAN | Líneas Del mes 100,00 / 200,00 / 50,00; Ejecutado 40,00 / 120,00 / — |
| F36-NOM | Ingreso Nómina ficticio en S001 con una única cuenta receptora |
| F36-USR | Usuario único ficticio con MFA |

## 16. Criterios de aceptación

Criterios documentales, no ejecutados. Cada uno es observable y trazable. Los importes son
sintéticos.

| ID | Acción / precondiciones | Resultado observable esperado | Fixture | Trazabilidad |
| --- | --- | --- | --- | --- |
| AC-01 | Preparar un reparto con líneas Aportación, Gasto real y No aplica | No cambian Saldos, Ejecutado, Pendiente, Estado, plan, Presupuestos ni Movimientos | F36-CIC, F36-PRE, F36-PLAN | Backlog reparto AC1; SPEC09 |
| AC-02 | Generar pendientes y abrir Movimientos | Filas diferenciadas con icono y texto; no suman en totales, balances ni ejecución | F36-SAL, F36-PRE | Backlog AC2; SPEC21 §5 |
| AC-03 | Confirmar solo una de varias Transferencias | Una Confirmada con Movimiento; las demás siguen Pendiente sin caducar | F36-PLAN | Backlog AC3; §8 |
| AC-04 | Reintentar la confirmación con la misma clave y payload | Un único Movimiento y una única resolución; sin duplicado ni éxito parcial | F36-PLAN | Backlog AC4; SPEC05 |
| AC-05 | Confirmar con fecha bancaria distinta de la prevista | Se usa la fecha real; la prevista nunca se convierte en efectiva | F36-CIC | Backlog AC5; SPEC04 |
| AC-06 | Cancelar un pendiente con motivo | Sin efecto financiero; motivo y trazabilidad conservados; alerta retirada | F36-PLAN | Backlog AC6; §6.3 |
| AC-07 | Confirmar una Aportación con fecha real en otro Ciclo abierto | Ejecuta en el Ciclo de la fecha; el Ciclo cerrado no se recalcula; vínculo visible | F36-CIC | Backlog AC7; SPEC09/SPEC07 |
| AC-08 | Preparar una línea de Gasto real | Se muestra «Mantener en origen»; no se crea Transferencia automática ni se presenta el destino como financiación necesaria | F36-PRE | Backlog AC8; SPEC08 |
| AC-09 | Preparar una línea No aplica | Sin propuesta automática; sin Pendiente ni Estado comparables | F36-PRE | Backlog AC9; SPEC09 |
| AC-10 | Faltar Del mes, cobertura o Ejecutado verificable; Pendiente cero o negativo | No se inventa importe, cero, Estado ni propuesta; motivo visible | F36-PLAN | Backlog AC10; SPEC09 |
| AC-11 | Origen Terminal o sin posición calculable | No se inventan déficit, mínimo, máximo ni saldo restante; se permite importe manual | F36-SAL | Backlog AC11; SPEC05 |
| AC-12 | Destino inactivo o no elegible | Sin propuesta automática; motivo visible; no se sustituye el destino | F36-PRE | Backlog AC12; SPEC08 |
| AC-13 | Cambiar Fuente, destino, plan o contexto entre preparación y confirmación | Conflicto 409; no se confirma con datos obsoletos; borrador conservado | F36-PRE | Backlog AC13; §7 |
| AC-14 | Añadir una línea manual | No se crea Partida ni Presupuesto; si el destino es Aportación se muestra que ejecutará ese Presupuesto; si es Gasto real, que no lo hará | F36-PRE | Backlog AC14; §5.5 |
| AC-15 | Un pendiente coincide con una Transferencia ya registrada por otro flujo | Se resuelve sin crear un segundo Movimiento, según D7 | F36-SAL | Backlog AC15; SPEC05 |
| AC-16 | Ciclo con cierre financiero | No se inicia reparto nuevo; no se confirma dentro de la ventana cerrada; el pendiente no entra en la foto; cancelar no produce efecto | F36-CIC | Backlog AC16; SPEC27 |
| AC-17 | Reintentar la generación y añadir líneas nuevas | Sin duplicar pendientes; solo se crean los nuevos; un único reparto por Ciclo | F36-PLAN | Backlog AC17; §6.4 |
| AC-18 | Rectificar o anular el Movimiento confirmado | Se conserva el vínculo; la línea no vuelve automáticamente a Pendiente; no se duplica el efecto | F36-PLAN | Backlog AC18; SPEC04 |
| AC-19 | Revisar el filtro y la alerta en 390 y 1440 | Texto e icono, no solo color; teclado y foco correctos; sin scroll horizontal | F36-SAL | Backlog AC19; UI |
| AC-20 | Escrituras sin MFA, sin Origin/CSRF o con payload inválido | Rechazo en servidor; auditoría de actor y momento; error sin datos sensibles | F36-USR | Backlog AC20; seguridad |
| AC-21 | Completar un reparto y cambiar el plan después | No se crea otro reparto automáticamente; la vía es el registro ordinario salvo D5 | F36-PLAN | Backlog AC21; §7 |
| AC-22 | Inspeccionar la aplicación y los mensajes | No ejecuta Transferencias bancarias ni afirma haberlas ejecutado; solo registra hechos confirmados | F36-USR | Backlog AC22; §1 |
| AC-23 | Revisar estados y transiciones del pendiente | Solo tres estados; «Requiere revisión» es condición; ambos flujos consumen el mismo registro y confirmación | F36-PLAN | Backlog §7 Estados; §11.3 T10; §6 |
| AC-24 | Comparar el reparto con E2.3 y con el Plan anual | El reparto parte del «Del mes» mensual de E2.3, no del Plan anual completo; el reparto no divide ni prorratea el anual; SPEC10 conserva su equivalente esencial mensual; no hay segunda lógica de plan | F36-PLAN | SPEC09/SPEC10; §9 |
| AC-25 | Cerrar y reabrir un borrador antes de generar | Conserva líneas, origen, importe y fecha prevista; no crea pendientes ni efectos; tras generar, reabrir y añadir solo crea los pendientes nuevos | F36-PLAN | §7; AC-17 |

## 17. Decisiones aprobadas

`[CONFIRMADO 2026-11-11]` D1–D10 fueron aprobadas por el usuario con las precisiones D8 y
D3 registradas en §0. La columna «Gate» se conserva como referencia histórica del momento
en que cada decisión estaba pendiente; no describe el estado actual.

| # | Decisión | Propuesta de esta spec | Gate |
| --- | --- | --- | --- |
| D1 | Límite de E2.3: «no automatizar Transferencias» y «no botón de ejecutar plan» | Preparar pendientes no ejecuta pagos ni da por ejecutado el plan; sin esta lectura, se requiere enmienda aprobada de E2.3 | Bloqueante antes de desarrollo |
| D2 | Mecanismo compartido | Una sola pieza lógica para ambos flujos; reutiliza bandeja E3.6 y servicio E1.5 | Aprobación de §6 y de la persistencia mínima |
| D3 | Persistencia del borrador | Borrador operativo persistido o solo en memoria; no es hecho financiero | Aprobación técnica separada |
| D4 | Ciclo futuro no iniciado | Permitir borrador y líneas manuales sin importe sugerido; generar solo con importes explícitos | Aprobación funcional |
| D5 | Ampliación de un reparto completado | No automática; Transferencias posteriores por el procedimiento ordinario | Aprobación funcional |
| D6 | Precierre y pendientes | Avisar, no convertir ni incluir en la foto; decidir si además bloquea | Aprobación con E4.8/E4.9 |
| D7 | Pendiente ya registrado por otro flujo | Vincular explícitamente o cancelar con motivo; nunca segundo Movimiento | Aprobación funcional |
| D8 | Presupuesto inactivo | Sin propuesta automática; decidir si se admite línea manual histórica | Aprobación funcional |
| D9 | Origen de nómina | Solo candidato único fiable y con base visible; sin inferencia por nombre o banco | Aprobación funcional |
| D10 | Referencias en líneas adicionales | No habilitar Anticipos ni Compartidos en esta mejora; decidir Viaje/Evento | Aprobación funcional |

## 18. Trazabilidad y próximo gate

- Backlog de origen: [reparto mensual asistido](backlog/reparto-mensual-asistido-presupuestos.md),
  casos §13 y tensiones §11.3.
- Specs base: [SPEC04](04-movimientos-specification.md), [SPEC05](05-transferencias-referencias-specification.md),
  [SPEC08](08-presupuestos-specification.md), [SPEC09](09-plan-ciclo-specification.md),
  [SPEC10](10-plan-anual-specification.md), [SPEC13](13-anticipos-specification.md) y
  [SPEC21](21-pendientes-conciliacion-specification.md).
- Mecanismo compartido: §6 de este documento, consumido por
  [SPEC37](37-registro-coordinado-gastos-specification.md).
- Roadmap y tablero: sin cambios; esta spec no crea entrega ni estado de tablero.
- Gate superado el 2026-11-11: D1–D10 aprobadas y desarrollo incremental 1–2 autorizado
  (§0). El incremento 1 entrega esquema, servicio y API del mecanismo compartido; el
  incremento 2 entrega el reparto asistido y su UI.
- Siguiente gate: aprobación de las decisiones D1–D10 de SPEC37 antes de su DEV. Sin esa
  aprobación, SPEC37 no se inicia.

Este documento queda aprobado para el desarrollo incremental 1–2 en el alcance del §0. No
autoriza SPEC37, datos reales, migraciones operativas ni despliegue, y no declara ninguna
prueba ejecutada ni aceptación funcional.
