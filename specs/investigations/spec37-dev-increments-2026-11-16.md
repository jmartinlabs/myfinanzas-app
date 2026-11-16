# SPEC37 · Incrementos de desarrollo y gate de esquema v30 (2026-11-16)

**Estado: propuesta de la fase `Specification` de #484. Este documento no aprueba nada, no
autoriza desarrollo y no toca el esquema.** Prepara la secuencia de incrementos de
[SPEC37](../37-registro-coordinado-gastos-specification.md), cuyo contrato D1–D10 y cuyos
`AC-42`/`AC-43` fueron aprobados el 2026-11-16 (SPEC37 §0), y el paquete del gate `v30`.

- **Base medida:** `test` `0e1f34d` (2026-11-16), esquema **`v29`**.
- **No autoriza:** DEV, API, UI, SQLite, `v30`, migración, datos reales, Excel, importación, VPS
  ni merge. Aprobar este documento no autoriza el primero de los incrementos.
- **No reabre:** las decisiones D1–D10, AC-42/AC-43, el mecanismo compartido de SPEC36 §6 ni el
  análisis de #412.
- **Etiquetas:** `DEMOSTRADO` = leído en el código de la base indicada; `DOCUMENTADO` = spec o
  aprobación registrada; `UNRUN` = no ejecutado.

## 1. Paridad con `test` `0e1f34d`

`[DEMOSTRADO]` Lo que SPEC37 necesita ya existe en buena parte. La tabla separa contrato
existente, contrato que hay que **extender** y contrato que **no existe**.

| Contrato | Qué cubre de SPEC37 | Estado real | Evidencia |
| --- | --- | --- | --- |
| **E1.4** Movimientos | Gasto real e íntegro, Partida, fecha no futura, salida a Exterior, rectificación y anulación, `movement_audit` inmutable | **Existe** | `apps/api/src/movimientos.ts` (`revision=revision+1`, validación de `permiteSalidaExterior`), `movement-schema.ts` (`movement_audit`, triggers de inmutabilidad) |
| **E1.5** Transferencias | Transferencia interna real, dos Saldos, sin `S000`/`Exterior`, idempotencia del Movimiento | **Existe** | `movimientos.ts` (validaciones de origen/destino), `movement_attempts` |
| **E3.1** Anticipos | Referencia de Anticipo, ficha, Adelantado/Recuperado/Neto; `validateAnticipo` exige ficha existente | **Existe el motor; falta composición** | `apps/api/src/anticipos.ts`: `createAnticipo` abre su propia transacción y no hay variante `InTransaction` |
| **SPEC36 §6** Transferencia pendiente (incremento 1) | Registro, tres estados, confirmación atómica, idempotencia, vínculo a Gasto y a Referencia | **Existe para `Reparto`** | `spec36-schema.ts` (`transferencia_pendiente`, `CHECK` de `origen_tipo`), `transferencias-pendientes.ts` (alta escribe `'Reparto'`) |
| Pending: `anticipo_previsto`, `gasto_revision`, `modalidad` | D2 y D6 | **No existe** | Las tres columnas no aparecen en el `CREATE TABLE` de `spec36-schema.ts` |
| Unicidad de pendiente activo por Gasto | D6 | **No existe** | `transferencia_pendiente_gasto` es un índice **no único** |
| Intento de operación coordinada | D7 | **No existe** | `movement_attempts` es por Movimiento; `transferencia_pendiente_attempts` es por operación del pendiente |
| Motivos de revisión de `RegistroCoordinado` | D6 | **No existe** | `conditions()` solo ramifica para `origen_tipo === "Reparto"` |
| `vincular` con Referencia | D5 | **Bloqueado a propósito** | `vincularTransferenciaPendiente` rechaza toda Transferencia con Referencia |
| Bandeja E3.6 | AC-29/AC-38 | **No incluye transferencias pendientes** | `pendientes.ts` compone casos desde motores propietarios; su catálogo no tiene tipo de transferencia pendiente y el módulo no consulta `transferencia_pendiente` |
| UI del pendiente | AC-38 | **Parcial** | `apps/web/src/TransferenciaPendienteFicha.tsx` (ficha) y `RepartoMensual.tsx`; no hay formulario coordinado ni lista con alerta |
| Precierre E4.8 | D10 | **Sin avisos de pendientes** | `precierre.ts` no consulta `transferencia_pendiente` |

`[DEMOSTRADO]` Consecuencia: **no hay que reimplementar ningún motor**. El trabajo nuevo es
extensión del pendiente + una operación coordinada + UI; el resto son contratos ya entregados que
solo necesitan regresión.

## 2. Gate `G-v30` — propuesta de esquema

`[PROPUESTA]` Un único gate de esquema, previo a los incrementos que lo consumen, con su propia
PR y su propia autorización. **No se ejecuta aquí.**

### 2.1 Contenido mínimo

| Elemento | Propuesta | Por qué |
| --- | --- | --- |
| `transferencia_pendiente.anticipo_previsto TEXT NULL` | `CHECK` con el formato ya vigente de Referencia: `GLOB 'REF[0-9]*' AND substr(…,4) NOT GLOB '*[^0-9]*' AND length(…)>=6` | D2: guardar la intención sin crear ficha; hoy solo hay `anticipo` con `FK` a ficha existente |
| `transferencia_pendiente.gasto_revision INTEGER NULL` | `CHECK(gasto_revision IS NULL OR gasto_revision>0)` | D6: línea base verificable del Gasto |
| `transferencia_pendiente.modalidad TEXT NULL` | `CHECK(modalidad IN ('A','B'))` | D6: modalidad del pendiente, persistida |
| Índice `transferencia_pendiente_gasto_activo` | `UNIQUE ... (gasto) WHERE gasto IS NOT NULL AND estado='Pendiente de realizar'` | D6: un solo pendiente activo por Gasto |
| Tabla `operacion_coordinada_attempts(key, hash, response, expires)` | Patrón idéntico a `movement_attempts` | D7: idempotencia de la operación compuesta sin entidad de negocio |
| Trigger `transferencia_pendiente_modalidad_inmutable` | `BEFORE UPDATE OF modalidad … WHEN NEW.modalidad!=OLD.modalidad RAISE(ABORT)` | AC-43: la inmutabilidad no depende solo del servicio |
| `CHECK` de coherencia por origen | `RegistroCoordinado` → `gasto NOT NULL`, `modalidad NOT NULL`, `reparto_linea NULL`; `Reparto` → `modalidad NULL`, `gasto_revision NULL`, `anticipo_previsto NULL` | Evitar estados imposibles y no romper las filas existentes |

`[PROPUESTA]` `anticipo` (la `FK` a ficha existente) **se conserva**: la referencia prevista va en
`anticipo_previsto` y la real se escribe al confirmar. No se duplica la referencia con dos
significados en la misma columna.

### 2.2 Compatibilidad y migración

- `[DEMOSTRADO]` La migración es **aditiva** (columnas `NULL`, un índice y una tabla): no
  reconstruye tablas ni reescribe filas. Las filas `Reparto` existentes quedan con `NULL` en las
  columnas nuevas y satisfacen los `CHECK` por la rama `Reparto`.
- `[PROPUESTA]` **Preflight obligatorio antes del índice único**: consulta que cuente pendientes
  activos duplicados por Gasto. Hoy la columna existe pero **nadie escribe** `RegistroCoordinado`
  (`DEMOSTRADO`: el alta solo inserta `'Reparto'` y `gasto` va `NULL`), así que el resultado
  esperado es 0; si no fuera 0, el gate se detiene y se decide con el usuario, sin crear el índice
  a la fuerza.
- `[PROPUESTA]` Rollback: copia `v29` previa (backup preflight) y restauración verificada. No se
  plantea `DROP COLUMN` como rollback: el proyecto ya tiene el procedimiento de restore y una
  migración aditiva no necesita deshacerse en caliente.
- `[DEMOSTRADO]` Al crear `v30` hay que mover el centinela de «esquema desconocido»: cinco
  pruebas fijan hoy `v30` como versión no admitida (`e410-schema.test.ts`,
  `e411-schema.test.ts`, `e43-schema-contract.test.ts`, `e49-schema-contract.test.ts`,
  `spec36-schema.test.ts`), además de la lista de versiones admitidas en `database-schema.ts` y
  `schemaVersion` en `database-identity.ts`. También la etiqueta del manifiesto de backup
  (`backup.ts`, hoy `e36.3-v29` para 29) necesita su entrada para 30.

### 2.3 Pruebas que el gate debe acreditar

`[PROPUESTA]` Contrato de esquema, migración y restore, siguiendo el patrón ya usado en
`spec36-schema.test.ts` y `deudas-v23-migration.test.ts`:

1. `v29 → v30` aditiva: IDs, auditoría, MFA y filas existentes intactas.
2. `v30` rechaza filas imposibles: `RegistroCoordinado` sin `gasto` o sin `modalidad`, `Reparto`
   con `modalidad`, dos pendientes activos del mismo Gasto, `anticipo_previsto` mal formado.
3. Trigger de modalidad inmutable: `UPDATE` de `modalidad` aborta; el resto de `UPDATE`s del
   pendiente sigue funcionando.
4. Centinela: `v31` (no `v30`) es ahora la versión desconocida.
5. Backup/restore `v30` con un pendiente `RegistroCoordinado` y su auditoría.
6. No regresión: la suite de pendientes y de Reparto sigue en verde.

## 3. Incrementos propuestos

`[PROPUESTA]` Un incremento por PR, con su propio gate de autorización y su propia evidencia. El
orden no es estético: cada uno consume lo que el anterior deja estable.

| # | Incremento | Depende de | Alcance | AC |
| --- | --- | --- | --- | --- |
| **I1** | **Gate `G-v30`** | — | Solo esquema, migración, triggers, centinelas, backup/restore y contrato de esquema. Sin API ni UI | — (habilita I2–I4) |
| **I2** | **Registro del pendiente coordinado** | I1 | Alta `origen_tipo='RegistroCoordinado'` con `gasto`, `modalidad`, `anticipo_previsto`, `gasto_revision`; motivos de revisión nuevos; unicidad de activo; modalidad inmutable en servicio y trigger; sin crear Movimiento ni ficha | AC-26, AC-29, AC-30, AC-32, AC-39, AC-43 |
| **I3** | **Operación coordinada atómica** | I2 (+ variante `InTransaction` de alta de ficha) | Gasto + Transferencia ordinaria, Gasto + Transferencia de Anticipo, Gasto + pendiente; una transacción; tabla de intentos; rollback íntegro; alta de ficha en transacción | AC-03, AC-06, AC-09, AC-14, AC-15, AC-20, AC-21, AC-34, AC-40, AC-41 |
| **I4** | **Confirmación, vínculo y cancelación** | I3 | Confirmar con fecha real y `HISTORY_LOCKED` por esa fecha; vincular con Referencia condicional por `origen_tipo`; cancelar con motivo; condiciones de revisión | AC-10, AC-11, AC-12, AC-13, AC-31, AC-33, AC-35, AC-36, AC-37, AC-42 |
| **I5** | **UI coordinada, bandeja y alertas** | I4 | Formulario con modalidades, barra y campo exacto sincronizados, vista previa, 409 con borrador conservado, ficha del pendiente, alerta «Pendiente de realizar» en lista, Transferencias y detalle del Gasto, accesibilidad 390/1440 | AC-04, AC-05, AC-07, AC-08, AC-17, AC-18, AC-22, AC-24, AC-25, AC-27, AC-28, AC-38 |
| **I6** | **Regresión y E2E** | I5 | Concurrencia real, regresión de Reparto, casos base (Gasto normal, A sin Transferencia, cancelar) y E2E de los recorridos críticos | AC-01, AC-02, AC-19, AC-23 |

`[PROPUESTA]` `I3` es el incremento de mayor riesgo: toca dos motores en una transacción y estrena
la idempotencia compuesta. Se propone **no** partirlo, porque partir la atomicidad produciría un
estado intermedio que el contrato prohíbe.

`[DEMOSTRADO]` Frontera técnica que `I3` hereda: `createAnticipo` abre su propia transacción y no
existe variante `InTransaction` en `anticipos.ts`; `writeMovementInTransaction` y
`crearTransferenciaPendiente` sí existen y son las únicas del proyecto. Extraer esa variante es
trabajo de `I3`, con la misma forma que ya usa `movimientos.ts`.

## 4. Matriz AC → incremento

`[PROPUESTA]` Cobertura completa de §16 (43 criterios, ninguno ejecutado: todos siguen `UNRUN`).
`I1` no tiene AC propios: su evidencia es el contrato de esquema.

| AC | Incremento | AC | Incremento | AC | Incremento |
| --- | --- | --- | --- | --- | --- |
| AC-01 | I6 | AC-16 | I6 (regresión E1.4) | AC-31 | I4 |
| AC-02 | I6 | AC-17 | I5 | AC-32 | I2 |
| AC-03 | I3 | AC-18 | I5 | AC-33 | I4 |
| AC-04 | I5 | AC-19 | I6 | AC-34 | I3 |
| AC-05 | I5 | AC-20 | I3 | AC-35 | I4 |
| AC-06 | I3 | AC-21 | I3 | AC-36 | I4 |
| AC-07 | I5 | AC-22 | I5 | AC-37 | I4 |
| AC-08 | I5 | AC-23 | I6 (regresión E1.4/E3.1) | AC-38 | I5 |
| AC-09 | I3 | AC-24 | I5 | AC-39 | I2 |
| AC-10 | I4 | AC-25 | I5 | AC-40 | I3 |
| AC-11 | I4 | AC-26 | I2 | AC-41 | I3/I4 (rutas nuevas con los controles vigentes) |
| AC-12 | I4 | AC-27 | I5 | AC-42 | I4 |
| AC-13 | I4 | AC-28 | I5 | AC-43 | I2 |
| AC-14 | I3 | AC-29 | I2 | | |
| AC-15 | I3 | AC-30 | I2 | | |

`[PROPUESTA]` Los AC de regresión (`AC-01`, `AC-02`, `AC-16`, `AC-19`, `AC-23`) no requieren
código nuevo: se acreditan con pruebas sobre los motores existentes, y por eso viven en `I6` y no
en un incremento funcional propio.

## 5. Frontera D10

`[DOCUMENTADO]` D10 quedó aprobada en lo que le corresponde: los pendientes no forman parte de
fotografías ni cierres, no caducan y no bloquean el cierre por su sola existencia. El **aviso en
el precierre** es `E4.8-AC-17`, que **no** está aprobado ni existe en SPEC26.

`[PROPUESTA]` Por tanto: ningún incremento de esta secuencia toca `precierre.ts`. El aviso entra
cuando SPEC26 lo apruebe, en su propia PR, y con `AC-38` (alerta en las tres superficies) como
cobertura inmediata dentro de `I5`.

## 6. Riesgos

| Riesgo | Efecto | Mitigación propuesta |
| --- | --- | --- |
| Índice único parcial sobre datos existentes | La migración falla a mitad | Preflight de duplicados antes de crearlo; abortar con informe si no es 0 |
| Atomicidad de tres escrituras (REF + ficha + Transferencia) | Ficha huérfana o Movimiento sin ficha | Transacción única + variante `InTransaction` + prueba de fallo en la tercera escritura |
| Ampliación de `vincular` | Regresión silenciosa en Reparto | Condición por `origen_tipo` + prueba de no regresión del flujo de Reparto en `I4` |
| Trigger de modalidad inmutable | Bloquea correcciones legítimas del pendiente | Trigger limitado a `UPDATE OF modalidad`; el resto del pendiente sigue editable |
| UI de dos modalidades en un formulario | Complejidad y errores de estado | Vista previa y 409 con borrador conservado (AC-22) antes de la confirmación |
| PR grande en `I3` | Revisión costosa | Packet cerrado con contrato de `I3` y pruebas por AC; sin ampliar a UI |

## 7. Paquete de decisión para el usuario

`[PROPUESTA]` Autorizar **en este orden**, cada uno con su gate:

1. **`I1` · Gate `G-v30`** — es el único que bloquea a los demás. Autorizarlo significa aceptar el
   contenido de §2.1 y sus pruebas; no autoriza todavía ningún incremento funcional.
2. **`I2`** después de `I1` verificado en `test`.
3. **`I3`** después de `I2`, y **`I4`** después de `I3`.
4. **`I5`** después de `I4`; **`I6`** como cierre, con la regresión completa.

`[PROPUESTA]` Si se prefiere reducir el número de gates, la única agrupación defendible es
`I2+I3` en una sola entrega (el pendiente y la operación que lo crea), nunca `I3` partido por la
mitad. Cualquier otra agrupación mezcla esquema con comportamiento y rompe la trazabilidad de AC.

**Lo que este paquete no decide:** qué incremento se autoriza, cuándo, ni con qué alcance; eso es
del usuario. Aprobar este documento no mueve el `Status` a `Ready Development`.

## 8. Próximo gate

Decisión del usuario sobre el paquete de §7. Hasta entonces: DT7 no interviene aquí, SPEC37 sigue
aprobada en sus decisiones y sin DEV, `v30` no existe y los 43 AC siguen `UNRUN`.