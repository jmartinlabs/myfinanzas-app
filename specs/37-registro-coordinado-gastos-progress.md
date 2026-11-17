# 37 — Registro coordinado de gastos: Progress

Status: **I1–I4.5 implementados, en revisión.** SPEC37 [aprobada](37-registro-coordinado-gastos-specification.md)
en D1–D10 y AC-42/AC-43 (2026-11-16). Incrementos y paquete de esquema:
[incrementos de desarrollo](investigations/spec37-dev-increments-2026-11-16.md) (#484), con
autorización global I1–I6 del 2026-11-16. Test plan: [testplan](37-registro-coordinado-gastos-testplan.md).

Base medida: `test` `91c32f5` (I4), esquema `v31`. Datos reales fuera de alcance.

| Incremento | Estado | Evidencia |
| --- | --- | --- |
| **I1 · Gate `G-v30`** | **implementado / en revisión** | `apps/api/src/spec37-schema.ts`, contrato `C30-SPEC37-COORDINADO-0E1F34D`, `spec37-schema.test.ts` |
| **I2 · Registro del pendiente coordinado** | **implementado / en revisión** | `transferencias-pendientes.ts` (`crearPendienteCoordinado`) + `spec37-i2-pendiente-coordinado.test.ts` |
| **I3 · Operación coordinada atómica** | **implementado / en revisión** | `registro-coordinado.ts` + `createAnticipoInTransaction` + `spec37-i3-operacion-atomica.test.ts` |
| **I4 · Confirmación, vínculo y cancelación** | **implementado / en revisión** | `transferencias-pendientes.ts` (`confirmar`, `vincular`, `candidatos`, `atribucionAnticipo`) + `spec37-i4-confirmacion-vinculo.test.ts` |
| **I4.5 · Gate `G-v31` (intención de Referencia)** | **implementado / en revisión** | `spec37-schema-v31.ts` + `transferencias-pendientes.ts` (`intencionAnticipo`, `confirmar`) + `spec37-i45-intencion-referencia.test.ts`, contrato `C31-SPEC37-INTENCION-91C32F5` |
| I5 · UI, bandeja y alertas | **implementado / en revisión** | `GastoCoordinado.tsx`, `TransferenciaPendienteFicha.tsx`, `Movimientos.tsx` + `spec37-i5-coordinado.test.tsx` (11) y `tests/e2e/spec37-i5-ui-coordinada.spec.ts` |
| I6 · Regresión y E2E de los 43 AC | pendiente | depende de I5; los AC siguen `UNRUN` |

## I1 · contenido entregado

- Migración **aditiva** `v29 → v30` sobre `transferencia_pendiente`: columnas
  `anticipo_previsto`, `gasto_revision` y `modalidad`, con `CHECK` de columna.
- Índice único parcial `transferencia_pendiente_gasto_activo`: un pendiente activo por Gasto.
- Tabla técnica `operacion_coordinada_attempts` para la idempotencia de I3.
- Triggers: inmutabilidad de `modalidad` con `IS NOT` (cubre `NULL → valor`) y coherencia por
  `origen_tipo` en `INSERT` y `UPDATE`, porque SQLite no admite `ALTER TABLE … ADD CONSTRAINT`.
- Preflight de duplicados: si ya hubiera dos pendientes activos del mismo Gasto, la migración
  aborta **antes** de escribir.
- Centinela desplazado a `v31`; manifiesto de backup `e37.1-v30`; contrato `C30` registrado.
- Sin API, sin UI y sin consumidores de las columnas nuevas: eso es I2–I6.

## Incidencias y ajustes

- Las pruebas de contrato de versiones anteriores comparaban el manifiesto **exacto** de `C29`
  contra una base nueva; ahora la base nueva es `v30` y se comparan contra `C30`, conservando
  además la comprobación de que ningún objeto de `C29` desaparece.
- Las pruebas de `SPEC36` que creaban `RegistroCoordinado` sin `modalidad` y dos pendientes
  activos del mismo Gasto se adaptaron al contrato v30: se aporta `modalidad` y se cancela el
  pendiente anterior antes de crear el siguiente. No se retiró ninguna aserción.
- El trigger de modalidad se prueba con los cuatro pasos (`NULL→A`, `A→NULL`, `A→B` abortan;
  el resto del pendiente sigue editable) aislando los triggers de coherencia, y se documenta por
  qué: con ellos activos ningún cambio de modalidad es posible por origen.

## I2 · contenido entregado

- Alta de pendiente `origen_tipo='RegistroCoordinado'`: Gasto real no anulado, `modalidad` A/B,
  `anticipo_previsto` (obligatoria en B, rechazada en A), `gasto_revision` como línea base e
  importe/origen/destino/fecha/concepto/nota. **No crea Movimiento, ficha, Adelantado,
  Recuperado, Neto ni liquidez** (AC-26, AC-32).
- `ciclo_origen` = Ciclo histórico de la **fecha real del Gasto** (D2); un Gasto fuera de Ciclo
  se rechaza porque la columna es `NOT NULL`.
- Motivos de revisión del origen coordinado: `GASTO_NO_DISPONIBLE`, `GASTO_ANULADO`,
  `GASTO_NO_COINCIDE`, `REFERENCIA_NO_ELEGIBLE`. «Requiere revisión» sigue siendo condición y no
  un cuarto estado (AC-29).
- Un único pendiente activo por Gasto: comprobación de dominio y traducción del índice único
  parcial a `409 GASTO_YA_GENERADO`, sin filtrar el constraint.
- `modalidad` inmutable: `editar` la rechaza antes de escribir y el trigger de v30 la cubre.
- El camino `Reparto` no cambia: sus 17 pruebas siguen intactas.

## Contrato pendiente de decisión (no bloquea I2)

§5.3 admite como referencia prevista «un ID existente **o una intención de alta con nombre y datos
mínimos**», pero el `CHECK` de v30 solo acepta `REF` + dígitos. Hoy I2 solo admite una Referencia
existente; representar la intención con nombre exigiría columna o formato nuevo y es una decisión
material para el usuario (I3/I4), no una inferencia del implementador.


## I3 · contenido entregado

- `registrarOperacionCoordinada` escribe **en una sola transacción IMMEDIATE**: ficha de Anticipo
  (solo modalidad B nueva), Transferencia, Gasto y pendiente, en ese orden (§4). El Gasto siempre se
  registra íntegro desde el Saldo pagador (D4).
- `createAnticipoInTransaction`: el alta de ficha deja de ser dueña de la transacción; `createAnticipo`
  conserva su comportamiento público envolviéndola. Sin cambios en sus errores ni en sus intentos.
- Idempotencia con `operacion_coordinada_attempts`: replay devuelve la respuesta guardada; el mismo
  payload con otra clave es `409 IDEMPOTENCY_CONFLICT`; dos procesos con la misma clave dejan un Gasto,
  una Transferencia y un intento.
- Ruta `POST /api/operaciones-coordinadas` autenticada, con CSRF y `movementGuard`.
- Decisiones interpretativas documentadas en la cabecera del módulo, no en la spec: la operación exige
  exactamente un acompañante (no duplica el alta simple de `/api/movimientos`); la dirección se valida
  contra el Saldo pagador del Gasto (422 si no coincide); en modalidad B el `rol` es siempre `Adelanto`
  y las devoluciones son otro hecho (§5.4).

## I4 · contenido entregado

- **Confirmar** (`confirmarTransferenciaPendiente`) escribe una única Transferencia real con la
  **fecha bancaria** recibida (§8.2), por el servicio E1.5 y dentro de la transacción del intento. La
  fecha prevista nunca se usa como fecha efectiva y el Movimiento pertenece al Ciclo de su fecha; el
  `ciclo_origen` del pendiente no se reimputa (§8.5).
- **`HISTORY_LOCKED` por la fecha real (AC-42)**: no se añadió ningún mecanismo. `assertDatesWritable`
  de E4.9 ya bloquea por la fecha del Movimiento nuevo, así que un Gasto con el Ciclo original cerrado
  se confirma con una fecha real de un Ciclo abierto, y se rechaza `409 HISTORY_LOCKED`, sin escritura
  y conservando el pendiente, cuando la fecha real cae en una ventana cerrada. El cierre del Ciclo del
  Gasto no participa en la decisión.
- **Modalidad B en la confirmación (D2/D9)**: la Referencia prevista se revalida en la transacción
  (existencia, tipo Anticipo, estado y ficha) y la Transferencia lleva su ID y la atribución E3.1. No se
  crea Referencia, ficha ni métrica nueva al confirmar: la reutilización es literal y el motor E3.1
  refleja el adelanto. AC-11 (inexistente, inactiva o de otro tipo) sigue pasando por
  `REFERENCIA_NO_ELEGIBLE` → «Requiere revisión», sin sustitución automática.
- **Vinculación (D5, §9.1)**: `candidatos` y `vincular` admiten Referencia **condicional por
  `origen_tipo`**. `Reparto` conserva el contrato de I1 (solo Transferencias sin Referencia, mismo
  código `REFERENCIA_NO_ADMITIDA`); `RegistroCoordinado` de modalidad B exige exactamente la Referencia
  prevista (`REFERENCIA_NO_COINCIDE` si falta o es otra) y la A solo admite Transferencias sin
  Referencia. Dirección e importe siguen siendo de coincidencia exacta y el hecho existente no se
  modifica ni se duplica.
- **Cancelación (AC-37)**: se mantiene el contrato de I1 —motivo obligatorio y no vacío, auditoría de
  pendiente y de sistema con el motivo, y ningún efecto financiero— verificado ahora también sobre el
  origen coordinado y con la foto completa de hechos, posiciones y fichas.
- **«Requiere revisión» bloquea la resolución** (§9.2): `confirmar` ya lo hacía; en I4 se aplica también
  a `vincular`, **solo para el origen coordinado**, para que el camino Reparto no cambie de contrato.
- Decisiones interpretativas de payload, no de contrato (§11 no fija payloads): en modalidad B la
  confirmación recibe `anticipo: { evidencia, procedencia, origen?, destino? }` porque E3.1 exige una
  atribución explícita del hecho real y `v30` no la persiste en el pendiente. El servidor **deriva** el
  `rol` (`Adelanto`, §5.4) y el par, y rechaza con `422 DIRECCION_INCOMPATIBLE` una dirección declarada
  distinta de la del pendiente, sin invertirla (AC-12).
- `anticipo` **no** se escribe al confirmar ni al vincular: es identidad inmutable del pendiente desde
  SPEC36 §6 (trigger `transferencia_pendiente_identidad_immutable`). La Referencia real vive en el
  Movimiento confirmado, que es la trazabilidad que exige §5.4; `anticipo_previsto` permanece como la
  referencia prevista validada.
- Sin cambios en `precierre.ts`, SPEC26, el esquema (`spec37-schema.ts`), `registro-coordinado.ts` ni la
  UI: I4 es API de resolución sobre el mecanismo único.

## I4.5 · contenido entregado (gate `G-v31`, autorizado el 2026-11-17)

- **Esquema `v31` aditivo** (`spec37-schema-v31.ts`): `anticipo_nombre`, `anticipo_apertura` y
  `anticipo_evidencia` en `transferencia_pendiente`, `NULL` por defecto, con `CHECK` de columna
  (nombre no vacío ≤120; apertura `AAAA-MM-DD`; evidencia no vacía) y dos pares de triggers
  `BEFORE INSERT`/`BEFORE UPDATE`: forma de Referencia prevista (B con `anticipo_previsto` XOR
  `anticipo_nombre`; A sin ninguna; `Reparto` sin las columnas nuevas) y coherencia de los datos
  mínimos (la regla de `fichas_anticipos`: sin apertura no hay evidencia, y sin nombre no hay
  apertura ni evidencia). La DDL de `v30` no se tocó.
- **Alta con intención** (`crearPendienteCoordinado`): acepta `anticipoNombre` y, opcionalmente,
  `anticipoApertura`/`anticipoEvidencia` como alternativa a `anticipoPrevisto`. Rechaza las dos
  formas juntas (422 `VALIDATION`), ninguna en B (422 `VALIDATION`), la A con intención (422
  `REFERENCIA_NO_ADMITIDA`) y evidencia sin apertura (422 `VALIDATION`). No escribe
  `referencias`, `fichas_anticipos`, `movimiento_anticipo` ni `counters` (AC-26/AC-32).
- **Confirmación** (`confirmarTransferenciaPendiente`): si el pendiente lleva intención, crea
  Referencia y ficha con `createAnticipoInTransaction` **dentro de la transacción del intento** y
  usa esa Referencia en la Transferencia real (D2). Un fallo posterior revierte Referencia, ficha,
  intentos y Movimiento. La proyección previa no puede llevar la Referencia —no existe—, así que
  la huella del cliente cubre el Movimiento sin ella y el plan real se recalcula ya con el ID
  creado.
- **El nombre no es identidad**: una intención que repite el nombre de una Referencia existente
  crea una Referencia nueva con su ID; la preexistente queda intacta, sin reutilización, renombrado
  ni bloqueo (AC-39 se cumple por ID).
- **Vínculo cerrado con intención (§9.1)**: sin Referencia real no hay candidatos y `vincular`
  responde `422 REFERENCIA_NO_COINCIDE`. Antes de I4.5 el pendiente B siempre llevaba
  `anticipo_previsto`, así que el filtro de candidatos nunca veía `NULL`; con intención ese `NULL`
  habría admitido una Transferencia ordinaria como vínculo. La salida sigue siendo confirmar (crea
  Referencia y ficha) o cancelar con motivo.
- **Bump completo**: `schemaVersion=31`, contrato `C31-SPEC37-INTENCION-91C32F5` (384 objetos),
  despachador `<31`/`>=31`, listas de versiones admitidas con `30` explícito, etiqueta
  `e37.2-v31` conservando `e37.1-v30`, centinelas movidos a `32` y `tools/test-seed` con
  `SEED_DATA_CONTRACT=e37.2-v31` (deriva versión, contrato y SHA; la etiqueta de datos es literal).
- Sin UI, sin tocar `precierre.ts` ni SPEC26, y sin cambios en `registro-coordinado.ts`.

## I5 · contenido entregado

- **Formulario coordinado** (`apps/web/src/GastoCoordinado.tsx`, ruta `/movimientos/coordinado`): Gasto real
  (fecha no futura, importe exacto con céntimos, Saldo pagador, Partida, concepto y nota) + modalidad A/B
  con las etiquetas de §3 y Transferencia **prevista** (Saldo que aporta/adelanta, importe con barra
  sincronizada y fecha prevista). En B, Referencia de Anticipo **existente o intención** (nombre y,
  opcionalmente, apertura y evidencia).
- **Vista previa de impacto** (§10.2) antes de registrar: modalidad, Saldo que paga, importe del Gasto,
  dirección e importe de la Transferencia, Referencia prevista, disponible anterior y posterior estimado,
  Ciclo y Gasto íntegro del ciclo, todo desde el plan de `/movimientos/impacto` o una resta explícita
  sobre la posición publicada. No se inventan cálculos de módulos pendientes.
- **Déficit, mínimo y remanente** (§6): `MAX(0, Gasto − Disponible real)` y remanente positivo, con
  «No disponible» cuando la posición no es calculable (nunca 0). Disponibilidad real y presupuestaria
  se muestran separadas.
- **Registro atómico** por `POST /api/operaciones-coordinadas`: Gasto y pendiente en una transacción;
  el formulario envía `pendiente.modalidad`, dirección, importes y la forma de Referencia, sin cálculos
  ni estados.
- **Ficha del pendiente** ampliada: modalidad, Gasto vinculado con su revisión, Referencia prevista
  (existente o intención), motivos de revisión del origen coordinado y acciones **confirmar**,
  **editar importe y fecha prevista**, **vincular** (candidatos con coincidencia exacta) y **cancelar con motivo**.
- **Confirmación de modalidad B** exige `evidencia` y `procedencia` (campos obligatorios y botón de
  revisión bloqueado sin ellos); el API ya las validaba y el formulario no las deduce.
- **Alerta «Pendiente de realizar»** con icono y texto en las tres superficies: lista general de
  Movimientos, bandeja de pendientes y detalle del Gasto. La bandeja muestra además modalidad, Gasto y
  el contador «Requieren atención».
- **409 sin perder el borrador** (AC-22): el conflicto de coincidencia (y cualquier 409/422 de la
  operación) conserva campos, modalidad, vista previa y clave de intento; los `code` del API se mapean a
  mensajes legibles sin inventar códigos.
- **Ajuste de API mínimo y aditivo** (`registro-coordinado.ts`): la operación coordinada acepta y
  propaga `anticipoNombre`, `anticipoApertura` y `anticipoEvidencia` del bloque `pendiente`. Sin esto no
  era posible expresar por la ruta atómica la intención que `I2`/`I4.5` ya soportan en el mecanismo
  único. No cambia el contrato de `Reparto`, ni el esquema, ni ninguna regla financiera; cubierto por
  una prueba nueva en `spec37-i3-operacion-atomica.test.ts`.
- **Correcciones encontradas al conectar la UI** (comportamiento previo, no contrato nuevo): las acciones
  de la ficha responden `{ item }` y ahora se desenvuelven antes de actualizar la pantalla; el aviso de
  éxito sobrevive a la revisión nueva del mismo pendiente; la bandeja mostraba sus filas solo por debajo
  de 760 px y ahora se ve en todos los anchos (es la única superficie de esos registros).

### Límites y materias pendientes de decisión

- **AC-28 no se cubre en I5**: la ejecución de un Presupuesto de «Aportación a saldo» por una
  Transferencia ordinaria depende del vínculo presupuestario del hecho real, que el pendiente coordinado
  no tiene (`budgetEffect` solo mira la línea de reparto). No se añadió lógica para simularlo; la vista
  previa declara que la Transferencia prevista no ejecuta presupuesto y la confirmación muestra el
  `efectoPresupuestario` que el servidor publique.
- **Dónde vive el formulario**: §10.1 describe el alta dentro de «Nuevo gasto», pero la operación
  coordinada exige exactamente un acompañante (Transferencia real o pendiente). Se implementó como
  pantalla propia `/movimientos/coordinado`, enlazada desde Movimientos; el Gasto sin Transferencia sigue
  en el formulario ordinario. Es una decisión de ubicación, no de semántica, y requiere confirmación del
  usuario si se prefiere integrarlo en el formulario existente.
- **«Vista de Transferencias»** (§10.3) no existe como pantalla en la aplicación: la bandeja de
  pendientes de Movimientos es la superficie donde vive el registro y donde se ejercen las acciones.
- Las capturas `fullPage` a 1440 muestran la cabecera y el menú fijos en mitad de la página; es un
  artefacto de la captura completa, no del layout (las comprobaciones de scroll horizontal pasan en 390
  y 1440).
