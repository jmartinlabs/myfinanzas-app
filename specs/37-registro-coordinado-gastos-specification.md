# 37 — REGISTRO-COORDINADO: registro coordinado de gastos con transferencia o anticipo — Specification

Status: **APROBADA EN SUS DECISIONES D1–D10 Y EN LOS AC-42/AC-43 — 2026-11-16.
NO AUTORIZA DESARROLLO, API, SQLITE NI MIGRACIÓN.** La aprobación cubre las diez decisiones
con las precisiones del expediente de análisis y los dos criterios nuevos; el resto de marcas
`[PROPUESTA]` sigue siendo diseño no cerrado (ver §0).
Approval source/date: **2026-11-16 — usuario**, aprobación explícita e identificable de D1–D10 y
de la incorporación de AC-42 y AC-43 en §16, tras las revisiones supervisoras 1 y 2 del
expediente. Texto y alcance en §0.
Context and brainstorming: [backlog de registro coordinado](backlog/registro-coordinado-gastos.md),
[backlog de reparto mensual](backlog/reparto-mensual-asistido-presupuestos.md),
[SPEC36 y mecanismo compartido](36-reparto-mensual-asistido-presupuestos-specification.md#6-mecanismo-compartido-de-transferencia-pendiente),
[SPEC04 Movimientos](04-movimientos-specification.md),
[SPEC05 Transferencias](05-transferencias-referencias-specification.md),
[SPEC08 Presupuestos](08-presupuestos-specification.md),
[SPEC13 Anticipos](13-anticipos-specification.md),
[SPEC21 Pendientes](21-pendientes-conciliacion-specification.md) y
[SPEC27 Cierre financiero](27-e49-cierre-financiero-specification.md).
Base documental: `test` `82b9dc3`; redacción exclusivamente documental, sin código.

Las marcas `[CONFIRMADO]`, `[PROPUESTA]` y `[PENDIENTE]` distinguen contratos vigentes,
diseño propuesto y cuestiones sin decisión. Ninguna marca convierte una propuesta en
autorización. Este documento no reabre las specs base, no cambia sus AC, no crea tablas ni
rutas y no declara ninguna prueba ejecutada.

## 0. Registro de aprobación — 2026-11-16

**Decisión del usuario (2026-11-16)**, tras las revisiones supervisoras 1 y 2 del
[expediente de análisis](investigations/spec37-d1-d10-decision-dossier-2026-11-16.md). Aprobación
explícita e identificable; no se infiere de ningún otro acto.

**Texto de la aprobación (usuario, dos mensajes del 2026-11-16):** «Tras revisar las observaciones
de Álex y las correcciones de la revisión 2, APRUEBO formalmente D1–D10 de SPEC37, con todas las
precisiones incluidas en el expediente actualizado.» […] «APRUEBO incorporar a SPEC37 §16 los
nuevos AC-42 y AC-43, conforme a la revisión 2 […] Mantener los restantes criterios de aceptación
y sus dependencias.» Los `[…]` omiten enumeraciones literales que se recogen en §0.1 y §0.2.

### 0.1 Decisiones aprobadas

| # | Decisión aprobada | Precisión incorporada |
| --- | --- | --- |
| D1 | Reutilizar el mecanismo compartido de Transferencias pendientes de [SPEC36 §6](36-reparto-mensual-asistido-presupuestos-specification.md#6-mecanismo-compartido-de-transferencia-pendiente); no crear un segundo motor | SPEC37 extiende el registro existente del incremento 1, ya aprobado el 2026-11-11 |
| D2 | Crear la Referencia y ficha de Anticipo nuevas **solo al confirmar** la Transferencia real, de forma atómica; reutilizar la existente cuando corresponda | Guardar la Referencia **prevista**; revalidar al confirmar; `ciclo_origen` es trazabilidad **histórica e inmutable** del Gasto; `HISTORY_LOCKED` se determina por la **fecha real del nuevo Movimiento**, no por el cierre del Ciclo original del Gasto |
| D3 | Máximo y disponibilidad posterior estimada **exclusivamente informativos**; sin nuevos bloqueos por posiciones calculadas | Solo bloquean las reglas vigentes de E1.4/E1.5 |
| D4 | Registrar siempre el Gasto real e íntegro desde el Saldo pagador | Una financiación pendiente no constituye liquidez ni altera los motores financieros |
| D5 | Vincular Transferencias reales únicamente con coincidencia exacta de dirección, importe y Referencia cuando proceda | Sin regresiones en el flujo de Reparto: la admisión de Referencia es condicional por `origen_tipo` |
| D6 | Usar `gasto_revision` y `movement_audit` para detectar cambios del Gasto; un único pendiente activo por Gasto | La modalidad pertenece al pendiente y es **inmutable**: cambiarla exige cancelar con motivo y crear otro pendiente, conservando la trazabilidad |
| D7 | No crear entidad de negocio de operación compuesta | Clave y **tabla técnica de intentos** para garantizar idempotencia |
| D8 | No inventar posiciones ni límites calculados para Saldos terminales | Aplicar las validaciones vigentes |
| D9 | Limitar la modalidad B a Referencias de Anticipo | Viaje y Evento quedan fuera del alcance |
| D10 | Los pendientes no forman parte de fotografías ni cierres, no caducan por el paso del tiempo y no bloquean el cierre por su sola existencia; se muestran como avisos | Su incorporación al precierre queda condicionada al contrato propietario [SPEC26/E4.8](26-e48-precierre-specification.md) mediante `E4.8-AC-17`, que **no** se aprueba ni implementa automáticamente por esta decisión |

### 0.2 Criterios incorporados

`AC-42` y `AC-43` se añaden a §16 con la redacción de la revisión 2 del expediente. Los
criterios AC-01…AC-41 y sus dependencias **no cambian**.

### 0.3 Coste técnico previsto del esquema v30

`[CONFIRMADO]` La aprobación fija el contrato, **no** ejecuta el esquema. El desarrollo, si se
autoriza, requiere una versión `v30` con, como mínimo: `anticipo_previsto` (referencia prevista
validada por formato), `gasto_revision` (línea base verificable del Gasto), `modalidad` persistida
con su `CHECK`, índice **único parcial** de pendiente activo por Gasto, tabla técnica de intentos
de la operación coordinada y una variante en transacción del alta de ficha de Anticipo. Sin esas
piezas, AC-09, AC-32, AC-39, AC-40, AC-42 y AC-43 no son implementables. Se detalla en §11.1.

### 0.4 Exclusiones de esta aprobación

No autoriza desarrollo, API, SQLite, migración, datos reales, Excel, importación, UI,
despliegue, cambios operativos ni merge. No modifica SPEC36, SPEC26/SPEC27 ni las specs base.
No abre `E4.8-AC-17`. No declara ninguna prueba ejecutada.

### 0.5 Qué sigue siendo propuesta

Los detalles de interacción y composición de §10, los fixtures de §15 y cualquier texto no
alcanzado por D1–D10 o por AC-42/AC-43 conservan `[PROPUESTA]`: la aprobación de las decisiones
no convierte cada propuesta del documento en contrato cerrado.

## 1. Objetivo y alcance

`[CONFIRMADO]` (2026-11-16) Simplificar el registro de un Gasto cuando el pago se realiza desde otro
Saldo o se financia temporalmente mediante un Anticipo, usando un único formulario
coordinado. La operación coordina hechos existentes; no crea un motor contable nuevo.

Principio innegociable:

- Siempre se registra **un único pago real desde un único Saldo pagador**.
- Siempre se registra **un único Movimiento de tipo Gasto por el importe íntegro**.
- La Transferencia asociada es un Movimiento independiente y solo existe cuando
  realmente corresponde.
- No se divide artificialmente un Gasto entre varios Saldos ni se generan hechos
  bancarios inexistentes.
- La aplicación no ejecuta pagos ni transferencias bancarias: registra hechos que el
  usuario confirma.

Incluye:

1. Gasto normal como comportamiento predeterminado.
2. Modalidad A: Pago directo desde otro Saldo, con Transferencia ordinaria opcional.
3. Modalidad B: Financiación mediante Anticipo recuperable con Referencia obligatoria.
4. Barra deslizante y campo numérico exacto para el importe de la Transferencia.
5. Vista previa, confirmación atómica y conservación de fechas reales distintas.
6. Transferencia pendiente de realizar, reutilizando la pieza única de SPEC36 §6.
7. Conciliación explícita y errores sin duplicar Movimientos ni Anticipos.

No incluye:

- Nuevos Tipos de Movimiento, nuevos maestros ni un segundo motor de Anticipos.
- Un Gasto pendiente: el Gasto es siempre un hecho real cuando se registra.
- Ejecución bancaria, integración con banco o promesa de pago.
- Cambios de presupuesto para cuadrar importes.
- Implementación, API, SQLite, migraciones, UI o despliegue en esta fase.

## 2. Autoridad y reglas reutilizadas

| Materia | Documento propietario | Uso en esta spec | No se reabre |
| --- | --- | --- | --- |
| Movimientos | [SPEC04](04-movimientos-specification.md) | Gasto real, Partida, fecha no futura, auditoría y corrección | Tipos y motor de posiciones |
| Transferencias | [SPEC05](05-transferencias-referencias-specification.md) | Transferencia interna real, dos Saldos, sin S000/Exterior, idempotencia | Altas, duplicados y límites |
| Clasificación | [SPEC02](02-clasificacion-specification.md) | Partida, jerarquía y Presupuesto derivado | Cadena y conservación histórica |
| Presupuestos | [SPEC08](08-presupuestos-specification.md) | Fuente, destino y ejecución por Partida | Fuente y destino |
| Plan del ciclo | [SPEC09](09-plan-ciclo-specification.md) | Impacto presupuestario conocido | Motor R3 |
| Anticipos | [SPEC13](13-anticipos-specification.md) | Referencia, ficha, adelantado, recuperado y devolución | Motor único de Anticipos |
| Pendientes | [SPEC21](21-pendientes-conciliacion-specification.md) | Bandeja, cobertura y alertas | Read model E3.6 |
| Cierres | [SPEC27](27-e49-cierre-financiero-specification.md) | `HISTORY_LOCKED` y protección histórica | Reglas de cierre |
| Mecanismo compartido | [SPEC36 §6](36-reparto-mensual-asistido-presupuestos-specification.md#6-mecanismo-compartido-de-transferencia-pendiente) | Registro, estados y confirmación de Transferencia pendiente | No se duplica |

`[CONFIRMADO]` E1.4/E1.5 no imponen un límite de fondos por posición calculada. Las
validaciones que bloquean son las vigentes: Saldos activos y distintos, permiso de salida
a Exterior en el Gasto, importe positivo, fecha no futura, Referencia válida cuando
corresponde y protección de cierres. Un déficit calculado es información, no una
autorización ni una prohibición nueva.

`[CONFIRMADO]` E3.1 exige Referencia de tipo Anticipo para toda Transferencia de Anticipo
y calcula el caso solo desde Transferencias reales. Un pendiente no genera Adelantado,
Recuperado, Neto ni una ficha con métricas ficticias.

## 3. Modalidades

### 3.1 Gasto normal

Comportamiento predeterminado. Un único Gasto desde el Saldo pagador a Exterior, con
Partida e importe íntegro. Sin Transferencia, sin pendiente y sin alerta.

### 3.2 Modalidad A — Pago directo desde otro Saldo

Definiciones:

- **Cuenta 1:** Saldo habitual o Saldo desde el que se aporta dinero.
- **Cuenta 2:** Saldo desde el que realmente se paga el Gasto.

Hechos:

1. **Gasto obligatorio:** Cuenta 2 → Exterior, por el importe íntegro.
2. **Transferencia ordinaria opcional:** Cuenta 1 → Cuenta 2, por el importe decidido.

Reglas:

- El Gasto se registra siempre desde Cuenta 2.
- La Transferencia puede no existir si el usuario no la realiza.
- Si existe, debe ser real y cumplir E1.5: dos Saldos activos distintos, sin S000 ni
  Exterior en ningún extremo, importe positivo y fecha no futura.
- Se permite transferir más que el déficit para conservar un remanente en Cuenta 2,
  siempre que la Transferencia sea real.
- La Transferencia ordinaria no genera un Anticipo recuperable ni requiere Referencia de
  Anticipo.
- Si la Transferencia aún no se ha realizado, se conserva como pendiente; el Gasto ya
  registrado sigue siendo el hecho real.

### 3.3 Modalidad B — Financiación mediante Anticipo recuperable

Definiciones:

- **Cuenta 1:** Saldo desde el que realmente se paga el Gasto.
- **Cuenta 2:** Saldo que adelanta temporalmente los fondos.

Hechos:

1. **Transferencia de Anticipo obligatoria:** Cuenta 2 → Cuenta 1, con Referencia de tipo
   Anticipo, por el importe decidido.
2. **Gasto obligatorio:** Cuenta 1 → Exterior, por el importe íntegro.

Reglas:

- El importe adelantado puede superar el déficit real del Saldo pagador.
- La Transferencia de Anticipo debe tener importe positivo. Si todavía no se ha realizado,
  se conserva como pendiente positivo y el Anticipo no se materializa hasta su confirmación.
  Una intención pendiente no sustituye al hecho real.
- El Anticipo recuperable solo nace de la Transferencia real confirmada, conforme a E3.1.
- Los fondos sobrantes son dinero real del Saldo; no incrementan automáticamente el
  presupuesto de la Partida.
- La devolución posterior es una Transferencia inversa con la misma Referencia y la
  dirección que determine E3.1; no se simula con un ajuste presupuestario.

## 4. Orden de operaciones, atomicidad e idempotencia

`[CONFIRMADO]` (D2, D7, 2026-11-16) El formulario confirma una única operación de aplicación. El orden lógico
no altera la atribución económica ni la fecha de cada hecho.

| Escenario | Hechos que se escriben | Orden y atomicidad |
| --- | --- | --- |
| Gasto normal | Un Gasto | Una transacción; sin Transferencia |
| A, sin Transferencia | Un Gasto | Una transacción; no se crea pendiente |
| A, ambos ya realizados | Transferencia ordinaria + Gasto | Una transacción; Transferencia primero en la creación lógica, Gasto después; rollback de ambos |
| A, Gasto real y Transferencia pendiente | Gasto + pendiente | Una transacción; no se escribe Transferencia; la confirmación posterior crea el Movimiento y resuelve el pendiente |
| B, ambos ya realizados | Transferencia de Anticipo + Gasto | Una transacción; Transferencia primero, Gasto después; Referencia y ficha coherentes; rollback de todo |
| B, Gasto real y Transferencia pendiente | Gasto + pendiente con referencia prevista | Una transacción; no se crea ficha ni métricas de Anticipo; la confirmación posterior crea Referencia/ficha si procede, la Transferencia y resuelve |
| Cualquier modalidad sin Gasto | No se permite | El Gasto es obligatorio; no existe un pendiente de Gasto |

Reglas de integridad:

- Si falla cualquier escritura, no se confirma parcialmente la otra.
- Las fechas reales del Gasto y de la Transferencia son independientes. El orden de
  creación no las iguala ni las reordena.
- La operación usa una clave de intento y una huella de payload. El mismo intento con el
  mismo payload devuelve el mismo resultado; un payload distinto con la misma clave se
  rechaza con 409.
- Dos envíos concurrentes producen un único Gasto y, si corresponde, una única
  Transferencia o un único pendiente.
- Un error de red tras el commit no duplica hechos al reintentar.
- No se introduce una entidad de «operación compuesta» por anticipado. La correlación se
  apoya en la clave de intento, la auditoría y los vínculos existentes; si se demuestra
  insuficiente, se justificará antes de crear una relación nueva (D7).
- `[CONFIRMADO]` (D2, D7) La idempotencia se resuelve con una **tabla técnica de intentos** de la
  operación coordinada —clave, huella de payload, respuesta y caducidad, con el patrón ya vigente
  en el proyecto—, no con una entidad de negocio. Esa tabla es la que hace cumplir AC-20, AC-21 y
  AC-40, y **no** sustituye a la auditoría de los hechos.

## 5. Referencia y ficha de Anticipo

`[CONFIRMADO]` (D2, D9, 2026-11-16) En modalidad B, la Referencia es obligatoria y de tipo Anticipo.

### 5.1 Referencia existente

Validar:

- Existencia e identidad por ID estable.
- Tipo Anticipo.
- Estado elegible para nuevas operaciones.
- Coherencia con los Saldos que adelantan y reciben.
- Compatibilidad con las reglas y el estado del caso.

No se reutiliza silenciosamente una Referencia incompatible, inactiva, de Viaje, Evento,
Gasto compartido u otro tipo.

### 5.2 Referencia nueva

- Reutilizar los maestros únicos de Referencia y ficha de Anticipo de E3.1.
- Crear Referencia y ficha de forma atómica y coherente, sin huérfanos, duplicados ni IDs
  reutilizados.
- No crear un segundo maestro de Anticipos ni duplicar métricas.

### 5.3 Momento de creación si la Transferencia queda pendiente

`[CONFIRMADO]` (D2, 2026-11-16) El pendiente conserva solo una **referencia prevista**: un ID existente o
una intención de alta con nombre y datos mínimos. La Referencia y la ficha reales no se
crean al guardar el pendiente. Se crean atómicamente al confirmar la Transferencia de
Anticipo, junto con el Movimiento. Así se evitan Referencias huérfanas, fichas vacías y
métricas ficticias.

Si el usuario selecciona una Referencia existente, el pendiente guarda su ID y la
revalida al confirmar. Si la Referencia dejó de ser elegible, el pendiente pasa a
«Requiere revisión» y no se confirma hasta resolverlo.

### 5.4 Vinculación y recuperación

- La Transferencia de Anticipo incorpora su ID de Referencia.
- El Gasto conserva su Partida; de ella derivan Subcategoría, Categoría y Presupuesto.
- No se impone al Gasto la Referencia del Anticipo: el Anticipo identifica la
  financiación, no reclasifica económicamente el Gasto.
- La devolución real usa Transferencia, misma Referencia, origen en el Saldo que recibió
  y destino en el que adelantó, por el importe realmente devuelto. Se permiten
  devoluciones parciales o completas conforme al motor E3.1.
- No se considera recuperado el Anticipo por un ajuste presupuestario, una simulación o
  una Transferencia inexistente.
- No se alteran automáticamente `Neto apertura ciclo` ni fotografías históricas.

## 6. Disponibilidad, barra e importes

`[CONFIRMADO]` (D3, 2026-11-16)

- Distinguir siempre disponibilidad real de un Saldo y disponibilidad presupuestaria de
  una Partida. El déficit presupuestario no implica falta de dinero en el Saldo.
- Para Saldos con posición calculable, mostrar disponible anterior y posterior estimado.
- Para Terminal o Saldos sin posición convencional, no calcular déficit, mínimo ni saldo
  restante. Mostrar «No disponible» y permitir selección manual del importe; no presentar
  cero como disponible desconocido.
- La barra aparece cuando el usuario decide registrar una Transferencia asociada.
- La barra y el campo numérico están sincronizados. El campo admite euros y céntimos
  exactos con dos decimales; los pasos prácticos de la barra no alteran el importe exacto.
- Mínimo informativo cuando exista déficit verificable:
  `MAX(0, Importe del Gasto − Disponible real en el Saldo pagador)`.
- En modalidad A, la Transferencia puede omitirse si no es necesaria y no se realiza.
- En modalidad B, debe existir una Transferencia real positiva aunque el déficit sea cero.
- El máximo calculable es una referencia de interfaz, no una nueva regla de bloqueo. Si el
  usuario introduce un importe superior al disponible calculado, se muestra el efecto y se
  exige confirmación explícita; el servidor no rechaza por saldo calculado porque E1.4/E1.5
  no imponen límite de fondos (D3). Sí rechaza por Saldo inactivo, no elegible, Terminal no
  permitido, importe no positivo, fecha futura, S000/Exterior o Referencia inválida.
- No se modifica ningún presupuesto para conseguir que los importes cuadren.

## 7. Transferencia pendiente: reutilización del mecanismo único

`[CONFIRMADO]` (D1, 2026-11-16) Esta spec **no define un segundo mecanismo**. Consume
íntegramente la pieza de
[SPEC36 §6](36-reparto-mensual-asistido-presupuestos-specification.md#6-mecanismo-compartido-de-transferencia-pendiente):
mismo registro lógico, mismos tres estados, misma confirmación atómica, misma bandeja y
misma alerta.

La única extensión específica del flujo de Gasto es:

| Extensión | Uso | Límite |
| --- | --- | --- |
| Vínculo al Gasto relacionado | Trazabilidad y conciliación | No altera el Gasto ni el motor |
| Modalidad A o B, persistida e **inmutable** tras el alta | Presentación y validación de Referencia | No crea un estado nuevo; cambiarla exige cancelar con motivo y crear otro pendiente (D6, AC-43) |
| Referencia de Anticipo **prevista** | Solo modalidad B | No crea ficha ni métricas hasta confirmar (D2) |
| Regla de revisión por cambio del Gasto | Conciliación | Es una condición, no un cuarto estado |
| Un único pendiente **activo** por Gasto | Evitar doble financiación del mismo hecho | Los pendientes resueltos no cuentan para el límite (D6) |

Estados y transiciones: los definidos en [SPEC36 §6.3](36-reparto-mensual-asistido-presupuestos-specification.md#63-estados-y-transiciones);
esta spec no los repite ni añade ninguno. «Requiere revisión» sigue siendo una condición
con motivo y los filtros/alertas no son estados.

`[CONFIRMADO]` (D2, D6) Un pendiente de modalidad A no genera Referencia. Un pendiente de
modalidad B conserva la referencia **prevista**, pero no genera Anticipo recuperable mientras no
exista la Transferencia real. No se confunde «pendiente de realizar» con «pendiente de
recuperación» de E3.1. La modalidad se fija al crear el pendiente y no se edita; sus cambios se
resuelven cancelando con motivo y creando otro pendiente.

## 8. Confirmación, fechas y Ciclo

`[CONFIRMADO]` (D2, 2026-11-16) La confirmación de la Transferencia pendiente:

1. Revalida importe, dirección, Saldos elegibles, Referencia, vínculo al Gasto y revisión,
   contra el estado vigente y dentro de la transacción.
2. Exige una fecha bancaria real no futura según el día civil de España. La fecha prevista
   nunca se usa como fecha efectiva.
3. Registra la Transferencia por el servicio E1.5, resuelve el pendiente y audita en una
   única transacción. En modalidad B con Referencia nueva, la Referencia, la ficha y la
   Transferencia se crean en esa misma transacción; con Referencia existente se reutiliza.
4. Aplica solo los efectos de los motores vigentes: posición calculada, ejecución
   presupuestaria según fuente y, en modalidad B, motor E3.1.
5. Si la fecha real cae en otro Ciclo, el Movimiento pertenece al Ciclo de esa fecha; el
   vínculo con el Gasto y con el pendiente es trazabilidad, no imputación retroactiva.
   `ciclo_origen` es el Ciclo **histórico e inmutable** del Gasto y no condiciona la escritura.
6. Si la fecha real cae en una ventana cerrada, se rechaza con `HISTORY_LOCKED` sin
   escritura. Se puede cancelar el pendiente o confirmar con una fecha real de un Ciclo
   abierto, si el usuario lo decide expresamente. La protección histórica se decide por la
   **fecha real del nuevo Movimiento**, nunca por el cierre del Ciclo original del Gasto
   (AC-42).

La confirmación es independiente por pendiente. No caduca por tiempo y no se marca por el
paso del tiempo ni por otros hechos.

## 9. Conciliación

`[CONFIRMADO]` (D5, D6, 2026-11-16) La conciliación es explícita; no hay emparejamiento automático por importe,
fecha o proximidad.

### 9.1 Transferencia ya registrada por otro flujo

Si existe una Transferencia real que podría corresponder al pendiente:

- Se muestra el hecho candidato con ID, fecha, importe, origen y destino.
- El usuario decide **vincular** o **cancelar con motivo**.
- Vincular exige coincidencia exacta de dirección, importe y, en modalidad B, Referencia.
  Si el importe difiere, se cancela el pendiente y se usa el procedimiento ordinario; no
  se ajusta el hecho ni se crea un segundo Movimiento.
- Nunca se crea un Movimiento sustitutivo ni se modifica el existente.

### 9.2 Gasto modificado, rectificado o anulado

`[CONFIRMADO]` (D6, 2026-11-16) La detección se apoya en `gasto_revision` —la revisión del Gasto
en el alta del pendiente— y en `movement_audit`: la revisión dice *si* cambió y la auditoría
explica *qué* cambió. El pendiente no copia los valores del Movimiento.

- Si cambia el importe, la fecha, la Partida o el Saldo pagador del Gasto, el pendiente pasa a
  «Requiere revisión» con motivo.
- La confirmación queda bloqueada hasta que el usuario edite el pendiente o lo cancele.
- Si el Gasto se anula, el pendiente no se cancela ni se confirma automáticamente. Se
  muestra «Gasto anulado — revisar» y el usuario decide explícitamente entre cancelar con
  motivo o resolver una nueva vinculación válida con otro Gasto real. Nunca se confirma
  contra un Gasto anulado.
- La **modalidad** pertenece al pendiente, no al Gasto, y es **inmutable** tras el alta:
  cambiarla exige cancelar con motivo y crear otro pendiente (AC-43). `gasto_revision` y
  `movement_audit` no la cubren porque no está en el Movimiento.
- Solo puede existir **un pendiente activo** por Gasto; los resueltos no cuentan.
- No se infiere una Transferencia sustitutiva ni una devolución.

### 9.3 Transferencia confirmada y corregida después

La Transferencia confirmada se corrige por E1.4. El pendiente conserva el vínculo con el
Movimiento; no vuelve a Pendiente ni se duplica el efecto. La realidad vigente se lee del
Movimiento.

### 9.4 Anticipo y recuperación

- El pendiente de Anticipo no computa en el motor E3.1 hasta que la Transferencia es real.
- Una devolución posterior es otro hecho real con la misma Referencia; no se concilia
  contra el pendiente.
- Una Referencia inactiva o un par incompatible bloquean la confirmación y muestran el
  motivo, sin autocorrección.

## 10. Pantallas e interacción

`[PROPUESTA]` Se reutilizan los componentes, tokens y reglas de
[UI](guidelines/ui.md); referencias 390 px móvil y 1440 px escritorio.

### 10.1 Formulario «Nuevo gasto»

```text
NUEVO GASTO
Fecha real [__/__/____]   Importe total [____,__ €]   Partida [PAR-1]
Concepto [______________________________]
Saldo habitual [S001]   Saldo pagador [S002]
Disponibilidad real S002: 40,00 €   Presupuesto PAR-1: 60,00 € (si existe)
Modalidad: (•) Gasto normal  ( ) Pago directo desde otro Saldo  ( ) Financiación mediante Anticipo
[ ] Registrar Transferencia asociada
  Origen [S001] → Destino [S002]   Importe [30,00 €]   Fecha prevista [__/__/____]
  Mínimo informativo 60,00 € · Disponible posterior estimado 10,00 €
  [====|===============]  campo exacto sincronizado
  [ ] Transferencia realizada   (si no se marca, quedará pendiente)
[Vista previa]  [Cancelar]  [Registrar operación]
```

- La modalidad normal es la predeterminada.
- Las etiquetas visibles conservan los nombres de §3: «Pago directo desde otro Saldo» y
  «Financiación mediante Anticipo».
- Las modalidades alternativas se ofrecen cuando el Saldo pagador no cubre el Gasto o
  cuando el usuario decide manualmente transferir o adelantar.
- En modalidad B, la Referencia de Anticipo es obligatoria y se puede seleccionar o
  proponer un alta.
- El disponible no calculable se muestra como «No disponible», nunca como 0.

### 10.2 Vista previa

Antes de guardar se muestra: modalidad, Saldo que paga, importe del Gasto, Transferencia
asociada, dirección, importe, Referencia cuando corresponda, disponible anterior y
posterior estimado, e impacto presupuestario conocido. No se inventan cálculos de módulos
pendientes.

### 10.3 Alertas y seguimiento

- Icono de admiración y texto «Pendiente de realizar» en la lista general de Movimientos,
  en la vista de Transferencias y en el detalle del Gasto relacionado.
- No depender solo del color.
- Contador o filtro «Requieren atención».
- La alerta desaparece al confirmar o cancelar válidamente.
- Desde el pendiente se puede consultar el Gasto, editar importe y fecha prevista,
  confirmar con fecha bancaria real o cancelar con trazabilidad.
- Accesibilidad: teclado, foco, etiquetas, contraste y sin scroll horizontal a 390 px.

## 11. API, persistencia y límites técnicos

`[CONFIRMADO]` (D7, 2026-11-16) Esta spec no autoriza abrir API ni SQLite. Solo describe
operaciones lógicas, sin fijar rutas, verbos, payloads ni DDL:

1. Consultar opciones y disponibilidad informativa de Saldos y Partidas.
2. Previsualizar la operación coordinada.
3. Registrar la operación: Gasto solo, Gasto + Transferencia, o Gasto + pendiente.
4. Consultar, editar, confirmar, cancelar o vincular el pendiente.
5. Consultar el impacto presupuestario conocido.

Condiciones técnicas confirmadas:

- Un único servicio de Movimientos para el Gasto y un único servicio de Transferencias
  para la Transferencia. No se duplican motores.
- El pendiente usa el mecanismo de SPEC36 §6; no una tabla o confirmación paralela.
- Idempotencia y revisión de contexto reutilizadas; auditoría de todos los hechos.
- Servidor valida y deriva; el cliente no envía cálculos, estados ni posiciones.
- Sin integración bancaria; sin afirmar ejecución de pagos.
- No se crea entidad de negocio de operación compuesta: la idempotencia usa una tabla técnica de
  intentos (D7).

### 11.1 Alcance físico mínimo previsto — esquema v30

`[CONFIRMADO]` (D2, D6, D7) El contrato aprobado **no** ejecuta el esquema. Si se autoriza el
desarrollo, la entrega necesita una versión de esquema `v30` con estos elementos, y sin todos
ellos los criterios indicados no son implementables:

| Elemento | Para qué | AC afectados |
| --- | --- | --- |
| `anticipo_previsto` en el pendiente (`RegistroCoordinado`) | Guardar la referencia prevista sin crear ficha | AC-09, AC-10, AC-32, AC-39 |
| `gasto_revision` en el pendiente | Línea base verificable del Gasto | AC-23, AC-30 |
| `modalidad` persistida con `CHECK` e inmutable en el servicio | Modalidad del pendiente, no del Gasto | AC-43 |
| Índice **único parcial** de pendiente activo por Gasto | Un solo pendiente `Pendiente de realizar` por Gasto | AC-30 |
| Tabla técnica de intentos de la operación coordinada | Idempotencia de Gasto + Transferencia | AC-20, AC-21, AC-40 |
| Variante en transacción del alta de ficha de Anticipo | Atomicidad de Referencia + ficha + Transferencia | AC-09, AC-34 |

`[CONFIRMADO]` `ciclo_origen` ya existe y no requiere columna nueva: su semántica aprobada es la
del Ciclo histórico del Gasto, inmutable, y no gobierna `HISTORY_LOCKED` (AC-42).

Esta sección describe el coste del contrato, no una autorización: la creación de `v30` requiere
autorización de desarrollo separada y su propia verificación.

## 12. Estados vacíos, carga y errores

| Situación | Comportamiento observable |
| --- | --- |
| Sin Saldos elegibles | Explicar dependencia o configuración; no usar S000 ni crear Saldos |
| Saldo pagador sin salida a Exterior | Rechazo con campo y motivo; no se elige otro Saldo automáticamente |
| Terminal sin posición | Sin déficit, mínimo ni restante; importe manual |
| Referencia inexistente, inactiva o de tipo incorrecto | Rechazo con motivo; no se sustituye ni se crea silenciosamente |
| Dirección incompatible con la Referencia | Rechazo; no se invierte automáticamente |
| Cambio de contexto entre vista previa y confirmación | 409; conservar borrador; releer y revisar |
| Fallo parcial | Rollback íntegro; sin Gasto, Transferencia o pendiente parciales |
| Reintento tras error de red | Misma clave y payload; mismo resultado; sin duplicado |
| Confirmación en ventana cerrada | `HISTORY_LOCKED`; sin escritura; explicar el motivo |
| Carga fallida | Reintento sin perder borrador, modalidad ni importes |
| Sesión caducada | Flujo MFA existente; conservar borrador en memoria; sin bypass |

Nunca se convierte una ausencia en cero, un error en lista vacía ni una fecha desconocida
en hoy.

## 13. Permisos y seguridad

`[PROPUESTA]` Aplicación privada de un único usuario, con los controles vigentes:

- Acceso autenticado y MFA para escrituras.
- Origin/CSRF y validación de sesión en servidor.
- Validación de dominio en servidor; no confiar en el cliente.
- Auditoría de actor, momento, revisión y cambios.
- Sin secretos, credenciales, datos reales ni bases en Git.
- Sin despliegue, cambios de permisos ni operaciones destructivas.
- Errores sin datos sensibles; logs sin payload financiero.

## 14. Exclusiones

- Implementación, código, API, SQLite, migraciones, UI o despliegue.
- Ejecución bancaria o integración con banco.
- Nuevos Tipos de Movimiento, maestros o motores de Gasto financiado.
- Gasto pendiente o Transferencia presentada como hecho antes de confirmarse.
- División del Gasto entre varios Saldos.
- Cambios de presupuesto para cuadrar importes.
- Anticipos sin Referencia válida, Referencias de otro tipo o devoluciones simuladas.
- Modificación de AC de specs base, del roadmap o del tablero.
- Datos reales, Excel, bases reales o información privada.

## 15. Fixtures sintéticos previstos

Los fixtures son ficticios y se usarán solo en pruebas futuras autorizadas.

| Código | Contenido |
| --- | --- |
| F37-SAL | S001 habitual; S002 pagador; S003 adelanta; S004 Terminal; S005 sin salida a Exterior |
| F37-CIC | Ciclo C1 abierto 01–31/01/2026; C2 abierto 01–28/02/2026; C3 cerrado |
| F37-PAR | PAR-1 con Presupuesto PRE-G Gasto real; PAR-2 con PRE-A Aportación a S001 |
| F37-REF | REF-A Anticipo activa; REF-X inactiva; REF-V Viaje; REF-D dirección incompatible |
| F37-GAS | Gasto ficticio de 100,00 € pagado desde S002 |
| F37-USR | Usuario único ficticio con MFA |

## 16. Criterios de aceptación

Criterios documentales, no ejecutados. Cada uno es observable y trazable. Los importes son
sintéticos.

| ID | Acción / precondiciones | Resultado observable esperado | Fixture | Trazabilidad |
| --- | --- | --- | --- | --- |
| AC-01 | Registrar un Gasto normal | Un único Gasto por el importe íntegro; sin Transferencia, pendiente ni alerta | F37-GAS | Backlog 1; SPEC04 |
| AC-02 | Modalidad A sin Transferencia | Solo el Gasto desde Cuenta 2; no se crea pendiente | F37-GAS | Backlog 2; §3.2 |
| AC-03 | Modalidad A con Transferencia real | Transferencia ordinaria + Gasto en una transacción; ambos hechos y fechas conservados | F37-SAL | Backlog 3; §4 |
| AC-04 | Modalidad A con Transferencia igual al déficit | Importe exacto; mínimo informativo correcto; sin remanente | F37-GAS | Backlog 4; §6 |
| AC-05 | Modalidad A con Transferencia superior al déficit | Remanente positivo mostrado; importe real intacto | F37-GAS | Backlog 5; §6 |
| AC-06 | Modalidad B con Anticipo mínimo | Transferencia de Anticipo + Gasto; motor E3.1 refleja el mínimo | F37-REF | Backlog 6; SPEC13 |
| AC-07 | Modalidad B con Anticipo superior al déficit | Remanente positivo; no aumenta el presupuesto de la Partida | F37-REF | Backlog 7; §3.3 |
| AC-08 | Modalidad B con Saldo pagador con fondos suficientes | La Transferencia positiva sigue siendo necesaria; no se omite | F37-REF | Backlog 8; §3.3 |
| AC-09 | Crear Referencia y ficha de Anticipo desde el flujo | Altas coherentes y atómicas; sin huérfanos ni duplicados | F37-REF | Backlog 9; SPEC13 |
| AC-10 | Reutilizar una Referencia de Anticipo existente | Se valida identidad, tipo, estado y dirección; se vincula | F37-REF | Backlog 10; SPEC13 |
| AC-11 | Usar Referencia inexistente, inactiva o de tipo no Anticipo | Rechazo con motivo; sin sustitución ni creación silenciosa | F37-REF | Backlog 11; SPEC13 |
| AC-12 | Usar una Referencia con dirección incompatible | Rechazo; no se invierte ni se reinterpreta la dirección | F37-REF | Backlog 12; SPEC13 |
| AC-13 | Devolución parcial y completa del Anticipo | Transferencia inversa con la misma Referencia; motor E3.1 actualizado | F37-REF | Backlog 13; SPEC13 |
| AC-14 | Anticipo registrado junto al Gasto | El Anticipo no ejecuta el Presupuesto de fuente Aportación a saldo | F37-PAR | Backlog 14; SPEC09 |
| AC-15 | Gasto con Partida y Presupuesto | Imputación exacta por Partida; sin doble Gasto | F37-PAR | Backlog 15; SPEC02/SPEC09 |
| AC-16 | Saldo pagador sin permiso de salida a Exterior | Rechazo con motivo; no se elige otro Saldo automáticamente | F37-SAL | Backlog 16; SPEC04 |
| AC-17 | Importe superior al disponible calculado | Déficit y máximo informativos; confirmación explícita; sin bloqueo nuevo por saldo calculado; D3 sigue pendiente; solo bloquean las reglas E1.4/E1.5 | F37-GAS | Backlog 17; D3 |
| AC-18 | Mover barra y editar campo numérico | Sincronización exacta en euros y céntimos; dos decimales; sin redondeo del importe | F37-GAS | Backlog 18; §6 |
| AC-19 | Cancelar el formulario | Sin escritura de Gasto, Transferencia ni pendiente | F37-GAS | Backlog 19 |
| AC-20 | Fallo en la segunda escritura | Rollback íntegro; sin hechos parciales; reintento idempotente | F37-SAL | Backlog 20; §4 |
| AC-21 | Dos confirmaciones concurrentes | Un único Gasto, una única Transferencia o pendiente y una única resolución | F37-SAL | Backlog 21; §4 |
| AC-22 | Cambiar contexto entre vista previa y confirmación | 409; no se guarda con datos obsoletos; borrador conservado | F37-GAS | Backlog 22; §12 |
| AC-23 | Rectificar o anular el Gasto o el Anticipo | Efectos coherentes; sin duplicar ni inventar devoluciones | F37-REF | Backlog 23; SPEC04/SPEC13 |
| AC-24 | Revisar a 390 y 1440 | Modalidades, barra, alertas y errores accesibles; sin scroll horizontal | F37-USR | Backlog 24; UI |
| AC-25 | Operar con Terminal | Gasto permitido o rechazado por «Permite salida a Exterior»; sin déficit, mínimo ni restante inventados | F37-SAL | Backlog 43–46; §6 |
| AC-26 | Transferencia aún no realizada | Se conserva como pendiente sin Movimiento real ni liquidez ficticia | F37-SAL | Backlog 26/30; §7 |
| AC-27 | Comparar disponibilidad real y presupuestaria | Se muestran separadas; el déficit presupuestario no se presenta como falta de dinero | F37-PAR | Backlog 27; §6 |
| AC-28 | Transferencia ordinaria hacia destino de Aportación a saldo | Se muestra que ejecutará ese Presupuesto; sin doble ejecución | F37-PAR | Backlog 28; SPEC09 |
| AC-29 | Recorrer estados del pendiente | Solo tres estados; «Requiere revisión» es condición; una sola alerta y filtro; sin segundo mecanismo | F37-SAL | Backlog 29–37; SPEC36 §6 |
| AC-30 | Modificar o anular el Gasto vinculado | El pendiente pasa a «Requiere revisión»; se permite cancelar con motivo o una nueva vinculación válida con otro Gasto real; nunca se confirma contra el Gasto anulado; sin automatismo | F37-GAS | Backlog 38; §9.2; D6 |
| AC-31 | Vincular una Transferencia real ya registrada | Se vincula sin duplicar el hecho; si no coincide, se cancela con motivo | F37-SAL | Backlog 42; §9.1 |
| AC-32 | Pendiente de Anticipo antes de confirmar | Sin ficha, Adelantado, Recuperado, Neto ni pendiente de recuperación ficticios | F37-REF | Backlog 31/41; §5.3 |
| AC-33 | Confirmar con fecha real en ventana cerrada | `HISTORY_LOCKED`; sin escritura; se conserva el pendiente | F37-CIC | Backlog 39; SPEC27 |
| AC-34 | Revisar orden y atomicidad en ambos escenarios | Hechos ya realizados o mixtos: una transacción, sin éxito parcial ni orden que altere fechas | F37-SAL | Backlog 40; §4 |
| AC-35 | Confirmar un pendiente en estado Pendiente de realizar con fecha real válida | Se crea una sola Transferencia, se resuelve el pendiente, se aplican los efectos de los motores y la alerta desaparece; sin duplicados | F37-SAL, F37-GAS | Backlog 33; §8 |
| AC-36 | Editar importe y fecha prevista antes de ejecutar | Se revalidan contexto, elegibilidad y Referencia; no se usan validaciones antiguas como garantía; sin Movimiento hasta confirmar | F37-REF | Backlog 35; §8 |
| AC-37 | Cancelar un pendiente con motivo | Sin efecto financiero; motivo y trazabilidad conservados; alerta retirada; sin Transferencia | F37-GAS | Backlog 36; §7 |
| AC-38 | Revisar la alerta en lista general, Transferencias y detalle del Gasto, a 390 y 1440 | Icono y texto «Pendiente de realizar» en las tres superficies; contador/filtro; no solo color; accesible | F37-USR | Backlog 37; §10.3 |
| AC-39 | La Referencia seleccionada deja de ser elegible antes de confirmar | El pendiente pasa a «Requiere revisión»; confirmación bloqueada; se permite editar, cancelar o elegir otra REF válida; sin sustitución automática | F37-REF | Backlog 35/41; §7/§9.4 |
| AC-40 | Error de red después del commit y reintento con la misma clave y payload | Mismo resultado; un único Movimiento y una única resolución; sin duplicado ni éxito parcial | F37-SAL | Backlog 34; §4/§8 |
| AC-41 | Confirmar, editar o cancelar sin MFA o sin Origin/CSRF | Rechazo 401/403 en servidor; sin escritura; auditoría; error sin datos sensibles | F37-USR | Backlog 20/34; seguridad |
| AC-42 | Confirmar un pendiente cuyo Ciclo original del Gasto está cerrado, con fecha bancaria real de un Ciclo abierto; y el mismo caso con fecha real en un Ciclo cerrado | Con fecha real de un Ciclo abierto: una única Transferencia con esa fecha, perteneciente al Ciclo de la fecha real, `ciclo_origen` sin cambios, sin `HISTORY_LOCKED` y sin imputación retroactiva al Ciclo original. Con fecha real en una ventana cerrada: `HISTORY_LOCKED`, sin escritura y pendiente conservado | F37-CIC, F37-SAL | D2; §8.5/§8.6; revisión 2 del expediente |
| AC-43 | Intentar cambiar la modalidad de un pendiente después del alta | Rechazo con motivo, sin escritura y sin cambios en importe, dirección ni Referencia; la única vía es cancelar con motivo y crear otro pendiente; la cancelación y el alta nueva conservan su auditoría y no reinterpretan el pendiente original | F37-SAL | D6; §3; revisión 2 del expediente |

## 17. Decisiones aprobadas — 2026-11-16

Todas quedan `APROBADA` por el usuario el 2026-11-16, con las precisiones de la revisión 2 del
expediente. La aprobación no autoriza desarrollo (§0.4).

| # | Decisión | Texto aprobado | Precisión y gate |
| --- | --- | --- | --- |
| D1 | Mecanismo compartido | Reutilizar SPEC36 §6; no crear un segundo motor | Registro del incremento 1, aprobado el 2026-11-11 |
| D2 | Alta de Referencia y ficha de Anticipo | Crear solo al confirmar, de forma atómica; reutilizar la existente cuando corresponda | Referencia prevista persistida, revalidación al confirmar, `ciclo_origen` histórico inmutable y `HISTORY_LOCKED` por la fecha real (AC-42) |
| D3 | «Máximo permitido» de la barra | Informativo, sin bloqueos nuevos por posiciones calculadas | Solo bloquean E1.4/E1.5 |
| D4 | Gasto real con financiación pendiente | Gasto real e íntegro desde el Saldo pagador; el pendiente no es liquidez | Sin cambio en los motores financieros |
| D5 | Vinculación de Transferencia existente | Coincidencia exacta de dirección, importe y Referencia cuando proceda | Admisión de Referencia condicional por `origen_tipo`, sin regresión de Reparto |
| D6 | Gasto anulado o modificado con pendiente | `gasto_revision` + `movement_audit` para detectar cambios; un solo pendiente activo por Gasto | Modalidad inmutable, en el pendiente (AC-43) |
| D7 | Entidad de operación compuesta | No crear entidad de negocio | Clave y tabla técnica de intentos |
| D8 | Terminales | Sin posiciones ni límites calculados | Validaciones vigentes |
| D9 | Referencias en el flujo | Solo Anticipo en modalidad B | Viaje y Evento fuera de alcance |
| D10 | Precierre y pendientes | No forman parte de fotografías ni cierres; no caducan; no bloquean por su existencia; se muestran como avisos | Incorporación al precierre condicionada a [SPEC26/E4.8](26-e48-precierre-specification.md) vía `E4.8-AC-17`, **no** aprobado por esta decisión |

## 18. Trazabilidad y próximo gate

- Backlog de origen: [registro coordinado](backlog/registro-coordinado-gastos.md),
  casos §7 (1–28), ampliación de pendientes (29–42) y terminales (43–46).
- Specs base: [SPEC02](02-clasificacion-specification.md),
  [SPEC04](04-movimientos-specification.md),
  [SPEC05](05-transferencias-referencias-specification.md),
  [SPEC08](08-presupuestos-specification.md),
  [SPEC09](09-plan-ciclo-specification.md) y
  [SPEC13](13-anticipos-specification.md).
- Mecanismo compartido: [SPEC36 §6](36-reparto-mensual-asistido-presupuestos-specification.md#6-mecanismo-compartido-de-transferencia-pendiente).
- Roadmap y tablero: sin cambios; esta spec no crea entrega ni estado de tablero.
- Decisiones: **D1–D10 aprobadas el 2026-11-16** (§0), con AC-42 y AC-43 incorporados a §16.
- Preparación de desarrollo: los incrementos y el paquete del gate `v30` están en
  [incrementos de desarrollo de SPEC37](investigations/spec37-dev-increments-2026-11-16.md)
  (#484). El **desarrollo de I1–I6 está autorizado globalmente** por decisión del usuario del
  2026-11-16 (registrada en #484), con `I1` antes de `I2–I6` y una PR de código por incremento.
- Próximo gate: el **merge de la PR documental #485** y, después, `I1` (`G-v30`). Cada PR de código
  necesita su propia autorización de merge; el desarrollo autorizado no es aceptación funcional.
- Gate ajeno: la incorporación del aviso de pendientes al precierre corresponde a
  [SPEC26/E4.8](26-e48-precierre-specification.md) mediante `E4.8-AC-17`, no aprobado aquí.

Este documento está aprobado en sus decisiones D1–D10 y en los criterios AC-42 y AC-43. No autoriza
merge ni despliegue, no ejecuta pruebas y no modifica las specs base; los criterios permanecen
`UNRUN` hasta su ejecución real.
