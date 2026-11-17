# 37 — Registro coordinado de gastos: Test plan

Specification: [aprobada](37-registro-coordinado-gastos-specification.md) (D1–D10, AC-42/AC-43,
2026-11-16). Incrementos: [expediente](investigations/spec37-dev-increments-2026-11-16.md) (#484).

Estado (2026-11-17, I6): **I1–I6 ejecutados y los 43 criterios verificados**. Recuento: **43 `PASS`
/ 0 `FAIL` / 0 `UNRUN`**. Los seis criterios de navegador (AC-17, AC-18, AC-22, AC-24, AC-27, AC-38) se
acreditaron ejecutando `tests/e2e/spec37-i5-ui-coordinada.spec.ts` en **entorno aislado** —build de
este árbol servido en 5281, `APP_ORIGIN` alineado, sin interrumpir ningún proceso ajeno— y **AC-28** se
cerró midiendo el motor real (`cycleExecution`), que ya atribuye la Aportación a saldo por
Transferencia ordinaria hacia el destino y no por línea de Reparto. Matriz completa en
[§Matriz AC-01…AC-43](#matriz-ac-01ac-43--prueba-y-resultado).

## Comandos y evidencia (I1)

Bun 1.4.3, macOS 15.5. Sin datos reales, sin Excel y sin migrar ninguna base real.

| Comando | Resultado |
| --- | --- |
| `bun test apps/api/src/spec37-schema.test.ts` | 9 pass / 1 skip / 0 fail |
| `bun test apps/api` | ver §Suite completa |
| `bun run typecheck` | PASS |
| `python3.12 scripts/check-project` | PASS |

El único `skip` local es la prueba de **backup/restore cifrado**: `backup` exige un árbol privado
de confianza y el `TMPDIR` de este entorno no lo es (`Ancestro no confiable.`). La misma prueba
se ejecuta en Linux CI, donde el árbol temporal sí es de confianza. No se declara PASS local.

## Trazabilidad de I1 (gate `G-v30`)

| Comprobación | Acción / precondición | Resultado esperado | Prueba |
| --- | --- | --- | --- |
| Migración aditiva | Base `v29` genuina (reconstruida y verificada contra `C29`), filas, identidad y auditoría | Versión vigente, `C29` sin objetos perdidos, único SQL modificado: la tabla extendida, filas intactas y columnas nuevas `NULL` | `v29 → v31 is additive…` |
| No regresión de Reparto | Pendiente `Reparto` heredado de `v29` | Se confirma con su Transferencia real después de migrar | `a migrated v30 keeps Reparto pendientes working` |
| Preflight de duplicados | Base `v29` con dos pendientes activos del mismo Gasto | Aborta antes de escribir: versión sigue `29`, sin índice nuevo, filas intactas | `the preflight rejects duplicate active pendientes…` |
| Inmutabilidad de `modalidad` | Fila con `NULL` y fila con `'A'` | `NULL→A`, `A→NULL`, `A→B` abortan con «modalidad inmutable»; el resto del pendiente sigue editable | `modalidad is immutable…` |
| Coherencia por origen | `RegistroCoordinado` sin modalidad; `Reparto` con modalidad | Abortan en `INSERT` y en `UPDATE`; valores fuera de catálogo y formatos inválidos rechazados | `coherence by origin…` |
| Un activo por Gasto | Dos altas para el mismo Gasto | La segunda aborta; otro Gasto permitido; al cancelar el primero se libera | `one active pendiente per Gasto` |
| Tabla de intentos | Clave `(operacion,key)`, `response` JSON | Duplicado y `response` no JSON rechazados | `operacion_coordinada_attempts is keyed…` |
| Centinela `v32` | Base con `schema_version=32` (centinela movido por `G-v31`) | Rechazo sin escrituras; manifiesto y versión intactos | `v32 is rejected before mutating` |
| Backup/restore | Base `v30` con pendiente `RegistroCoordinado` | Restaura `v30`, conserva columnas nuevas y mantiene el trigger | `encrypted backup/restore…` (**skip local**, CI Linux) |
| Contrato determinista | Dos bases nuevas | Manifiesto idéntico; contrato vigente `C31` con 384 objetos y `C30` congelado con 380 | `the v31 manifest is deterministic` |

## Trazabilidad de I2 (pendiente coordinado)

| AC | Acción / precondición | Resultado esperado | Prueba |
| --- | --- | --- | --- |
| AC-26 | Alta de pendiente coordinado sobre un Gasto real | Solo fila operativa y auditoría: `saldos`, `movimientos`, `movement_audit`, `fichas_anticipos`, `movimiento_anticipo`, `fotos_neto_apertura` y `counters` idénticos | `AC-26: el alta coordinada no crea Movimiento, ficha ni liquidez` |
| AC-32 | Modalidad B antes de confirmar | Sin ficha, Adelantado, Recuperado ni Neto; E3.1 vacío | `AC-32: modalidad B no crea ficha…` |
| AC-30 | Gasto anulado / con otra revisión | `requiereRevision`, motivo, confirmación bloqueada (`409 REVIEW_REQUIRED`), `gastoRevision` no se reescribe | `AC-30: Gasto anulado…`, `AC-30: Gasto con otra revisión…` |
| AC-39 | Referencia prevista deja de ser elegible | Motivo, bloqueo de confirmación, sin sustitución automática; se puede editar o cancelar | `AC-39: Referencia no elegible…` |
| AC-43 | Cambiar la modalidad | `422 MODALIDAD_INMUTABLE` antes de escribir; el trigger cubre también `NULL`; vía válida = cancelar y volver a crear | `AC-43: la modalidad es inmutable…` |
| AC-29 | Recorrer estados | Solo tres estados; el filtro por «Requiere revisión» no es un estado | `AC-29: tres estados…` |
| Negativos | Alta inválida | 19 rechazos de dominio y segundo activo → `409 GASTO_YA_GENERADO`, sin filas residuales | `validaciones del alta coordinada` |

Evidencia: Linux (Debian 13, bun 1.4.3) `bun test apps/api` → **1232 pass / 0 fail / 0 omitidas**.

## Trazabilidad de I3 (operación atómica)

| AC | Acción / precondición | Resultado esperado | Prueba |
| --- | --- | --- | --- |
| AC-03 | Gasto + Transferencia reales | Ambos hechos, fechas propias, posiciones 960/440 y el flujo ve el Gasto una sola vez | `AC-03` |
| AC-06 | Modalidad B con Referencia existente | E3.1 adelantado/neto 60,00, par y atribución correctos | `AC-06` |
| AC-09 | Ficha y Referencia nuevas en la misma transacción; fechas hoy/límites | Sin huérfanos; no futuras y límites de Ciclo por fecha real | `AC-09` |
| AC-14/AC-15 | Gasto con Partida | `budgetUsage` del Gasto = 1 fila; Aportación a saldo = 0; sin doble imputación | `AC-14/15` |
| AC-20/AC-34 | Fallo forzado en la última escritura | Snapshot de 15 tablas idéntico; 0 movimientos, fichas ni pendientes | `AC-20/34` |
| AC-21 | Dos procesos con la misma clave | Un Gasto, una Transferencia y un intento | `AC-21` |
| AC-34/AC-40 | Replay y conflicto de hash | Misma respuesta y misma foto; otro payload → 409 sin escritura | `AC-34/40` |
| AC-41 | Ruta sin sesión / Origin no confiable / sin clave | 401, 403, 422; con todo → 201 | `AC-41` |
| D4/AC-26 | Gasto + pendiente sin compañero financiero | Solo el Gasto mueve liquidez; ni ficha ni Movimiento de Transferencia | `D4/AC-26` |

Evidencia: Linux (Debian 13, bun 1.4.3) `bun test apps/api` → **1248 pass / 0 fail / 0 omitidas**.

## Trazabilidad de I4 (confirmación, vínculo y cancelación)

| AC | Acción / precondición | Resultado esperado | Prueba |
| --- | --- | --- | --- |
| AC-35 | Confirmar un pendiente A en `Pendiente de realizar` con fecha real válida | Una única Transferencia con la fecha bancaria (no la prevista), Gasto intacto, posiciones 960/440, alerta retirada y auditoría `alta`+`confirmacion` | `AC-35/AC-10: confirmar modalidad A…` |
| AC-33 | Fecha real futura y fecha real en ventana cerrada | `422 VALIDATION` y `409 HISTORY_LOCKED` en vista previa y confirmación, sin escritura y con el pendiente conservado | `AC-33: fecha futura y ventana cerrada…` |
| AC-42 | Ciclo original del Gasto cerrado + fecha real de un Ciclo abierto; misma clase con fecha real cerrada | Se confirma sin `HISTORY_LOCKED`, el Movimiento pertenece al Ciclo de su fecha, `ciclo_origen` y cierres sin cambios; en ventana cerrada `409 HISTORY_LOCKED` sin escritura | `AC-42: el Ciclo original cerrado no bloquea…` |
| AC-10 | Reutilizar una Referencia de Anticipo existente en modalidad B | Identidad, tipo y estado revalidados; la Transferencia lleva la Referencia y la atribución E3.1 (adelantado/neto 60,00); sin Referencia ni ficha nuevas | `AC-10: la Referencia de Anticipo existente…` |
| AC-11 | Referencia inexistente, de tipo Viaje o inactiva | `REFERENCIA_NO_ELEGIBLE` → `409 REVIEW_REQUIRED`, sin Movimiento, sin Referencia ni ficha nuevas y sin sustitución; salida por cancelación motivada | `AC-11: Referencia inexistente, inactiva o de otro tipo…` |
| AC-12 | Dirección declarada incompatible con el par del pendiente | `422 DIRECCION_INCOMPATIBLE` sin escritura; el par correcto se admite sin inversión | `AC-12: una dirección incompatible…` |
| AC-13 | Devolución parcial (20,00) y completa (40,00) con la misma Referencia | E3.1: recuperado 20,00/neto 40,00 («Recuperación parcial») y luego 60,00/0,00 («Recuperado»); el pendiente confirmado no se reabre | `AC-13: devolución parcial y completa…` |
| AC-31 | Vincular una Transferencia real ya registrada | Coincidencia exacta de dirección e importe, sin Movimiento nuevo y con la fila del hecho intacta; importe o dirección distintos → `422`; ya vinculado → `409` | `AC-31: vínculo con coincidencia exacta…` |
| AC-31/D5 | Modalidad B y no regresión de Reparto | En B solo vale la Referencia exacta (`REFERENCIA_NO_COINCIDE`); el pendiente `Reparto` sigue rechazando toda Referencia (`REFERENCIA_NO_ADMITIDA`) y vincula la ordinaria | `AC-31: modalidad B solo vincula la Referencia exacta…` |
| AC-36 | Editar importe y fecha prevista antes de ejecutar; Gasto rectificado | Sin Movimiento al editar, huella anterior → `409 IMPACT_CHANGED`, confirmación con el importe vigente; revisión distinta → `GASTO_NO_COINCIDE` y `409 REVIEW_REQUIRED` en confirmar y vincular | `AC-36: editar antes de ejecutar revalida…` |
| AC-37 | Cancelar con motivo | Motivo obligatorio y no vacío (`422`), auditoría de pendiente y de sistema con el motivo, cero efecto financiero, alerta retirada y transiciones cerradas | `AC-37: cancelación motivada…` |

Evidencia local (macOS 15.5, bun 1.4.3): `bun test apps/api/src/spec37-i4-confirmacion-vinculo.test.ts`
→ **11 pass / 0 fail / 174 expect() calls**. `bun test apps/api` → **1192 pass / 11 skip / 56 fail**
de 1259 pruebas: los 56 fallos son los de entorno preexistentes (backup/restore y frontera de
producción, `Ancestro no confiable.`), verificados por **nombre** contra la lista de base y ninguno en
SPEC36/SPEC37/`transferencias-pendientes`. No se declara PASS remoto: la evidencia CI queda ligada al
SHA de la PR.

## Trazabilidad de I4.5 (gate `G-v31`: intención de Referencia)

| Comprobación | Acción / precondición | Resultado esperado | Prueba |
| --- | --- | --- | --- |
| Migración `v30`→`v31` aditiva | Base `v30` genuina (reconstruida retirando triggers y columnas de `v31` y verificada contra `C30`), con un pendiente B y su REF prevista | `v31` y `C31`; ningún objeto de `C30` desaparece; el único SQL distinto es `transferencia_pendiente`; filas, Movimientos e identidad intactos; las tres columnas nuevas `NULL` | `v30 → v31 es aditiva y conserva filas e identidad` |
| Base `v30` real sigue operando | La misma base migrada | El trigger de inmutabilidad de `v30` sigue vigente; la REF prevista heredada convive con la forma XOR y las dos formas juntas se rechazan | `una base v30 genuina migra y sigue confirmando su Referencia prevista` |
| AC-26/AC-32 | Alta con intención (nombre+apertura+evidencia) | Sin `referencias`, `fichas_anticipos`, `movimiento_anticipo` ni consumo de `counters`; foto financiera idéntica; la intención no se edita (`422 VALIDATION`) | `AC-26/AC-32: guardar la intención no crea Referencia, ficha, atribución ni contador` |
| Intención mínima | Nombre solo; nombre+apertura+evidencia | Ambas formas válidas y persistidas tal cual en el DTO (`anticipoIntencion`) | `la intención admite nombre solo y con apertura+evidencia` |
| XOR y coherencia (dominio) | B con REF e intención; B sin ninguna; evidencia sin apertura; A con intención | `422 VALIDATION` ×3 y `422 REFERENCIA_NO_ADMITIDA`; ningún pendiente ni hecho escrito | `los cuatro rechazos del alta` |
| XOR y coherencia (esquema) | `INSERT` directo por SQL | B con ambas formas, B sin ninguna, A con intención, `Reparto` con intención, evidencia sin apertura y apertura sin nombre abortan; una sola forma se acepta; `CHECK` de columna rechaza nombre en blanco, apertura no `AAAA-MM-DD` y evidencia vacía | `el esquema impone el XOR y la coherencia también por SQL directo` |
| D2 · confirmación atómica | Confirmar un pendiente con intención | Referencia nueva (`Anticipo`, `Activa`) con ID del sistema, ficha con apertura y evidencia, Movimiento con esa Referencia y atribución E3.1, un solo consumo de `counters`, pendiente confirmado con la intención intacta | `confirmar con intención crea Referencia, ficha y Movimiento juntos` |
| D2 · rollback | Fallo forzado en la escritura del Movimiento (guardia que bloquea cuando la ficha ya existe) | `409 HISTORY_LOCKED` y nada sobrevive: ni Referencia, ni ficha, ni Movimiento, ni atribución, ni contador, ni intentos; pendiente y auditoría intactos | `un fallo al escribir el Movimiento revierte Referencia, ficha e intentos` |
| AC-39 · el nombre no es identidad | Referencia preexistente con el mismo nombre que la intención | Se confirma y crea una Referencia **nueva** (dos filas con ese nombre); la preexistente y su ficha quedan intactas y la Transferencia usa la nueva | `un nombre repetido no bloquea ni reutiliza; crea una Referencia nueva` |
| §9.1 · vínculo cerrado | Pendiente B con intención y una Transferencia ordinaria de dirección e importe exactos | Sin candidatos; `vincular` → `422 REFERENCIA_NO_COINCIDE` sin vínculo ni escritura; la salida es confirmar (crea su Referencia) o cancelar | `con intención no hay candidatos ni vínculo posible` |

Evidencia local (macOS 15.5, bun 1.4.3):

| Comando | Resultado |
| --- | --- |
| `bun test ./apps/api/src/spec37-i45-intencion-referencia.test.ts` | 10 pass / 0 fail / 469 expect() |
| `bun test` de I2+I3+I4+esquema+`I4.5` | 55 pass / 1 skip / 0 fail / 1445 expect() |
| `bun test ./apps/api` | 1201 pass / 11 skip / 56 fail de 1268 — **mismos 56 fallos de entorno por nombre** que la base `91c32f5` (0 nuevos, 0 resueltos) |
| `bun run typecheck` | PASS |
| `python3 scripts/check-project` | PASS |

El `skip` es la prueba de backup/restore cifrado de I1 (árbol privado de confianza ausente en este
`TMPDIR`); se ejecuta en Linux CI y no se declara PASS local.

**No ejecutado en macOS (`UNRUN`, no PASS):** la etiqueta de backup `e37.2-v31`, la conservación de
`e37.1-v30` y las dos listas de versiones admitidas del módulo de copia sólo se ejercitan donde la
publicación atómica de la copia funciona: `private-state.ts` carga `libc.so.6` por FFI y en macOS esa
ruta no existe, así que toda la familia backup/restore cae en los 56 fallos de entorno. Su evidencia
queda ligada a la CI Linux y al SHA de la PR.

## Trazabilidad de I5 (UI, bandeja y alertas)

Los AC de I5 son de **pantalla**: su evidencia de referencia es el E2E
[`tests/e2e/spec37-i5-ui-coordinada.spec.ts`](../tests/e2e/spec37-i5-ui-coordinada.spec.ts), **ejecutado
en entorno aislado: 1 passed** (build de este árbol servido en 5281 con `APP_ORIGIN` alineado, sin
interrumpir procesos ajenos; la config del repo sigue sin poder arrancar por los puertos ocupados).
Se ejecutó también la suite unitaria de la UI y las pruebas de motor que cita la matriz.

| Comando | Resultado |
| --- | --- |
| `bun test apps/web/test/spec37-i5-coordinado.test.tsx` | **11 pass / 0 fail / 100 expect()** |
| `bun test apps/web` | **317 pass / 0 fail / 30266 expect()** en 47 ficheros |

## Trazabilidad de I6 (regresión y E2E)

Ficheros nuevos: `apps/api/src/spec37-i6-regresion.test.ts` (955 líneas, 10 pruebas),
`tests/e2e/spec37-i6-regresion.spec.ts` (282 líneas, 1 recorrido) y el servidor aislado
`apps/api/test-support/spec37-i6-server.ts` (27 líneas, puerto 3030, MFA real, SQLite propia). No se
modificó ninguna suite de I1–I5.

| AC | Acción / precondición | Resultado esperado | Prueba |
| --- | --- | --- | --- |
| AC-01 | Gasto normal desde el Saldo pagador | Un único Gasto íntegro; sin Transferencia, pendiente ni alerta (bandeja en 0) | `AC-01: un Gasto normal es un único hecho íntegro…` |
| AC-02 | Modalidad A sin Transferencia, con Cuenta 1 existente | Sólo el Gasto desde Cuenta 2; sin pendiente; Cuenta 1 intacta; la operación coordinada no inventa un pendiente | `AC-02: la modalidad A sin Transferencia…` |
| AC-07/AC-08 | Modalidad B con Saldo pagador con fondos y anticipo superior al déficit | La Transferencia positiva se escribe igualmente; el sobrante es dinero real; la Partida no amplía su Presupuesto | `AC-07/AC-08: en modalidad B el sobrante del Anticipo…` |
| AC-16 | Saldo pagador sin «Permite salida a Exterior» | `422 EXTERIOR_PERMISSION` sin escritura y sin sustituir el Saldo, también por la vía coordinada | `AC-16: un Saldo pagador sin salida a Exterior…` |
| AC-17 (motor) | Importe superior al disponible calculado | Se registra sin bloqueo nuevo por posición (1.200,00 sobre 1.000,00 → posición −200,00) | `AC-17: un importe superior al disponible…` |
| AC-19 | Abandonar el alta | Cero escrituras: ni Gasto, ni Transferencia, ni pendiente | `AC-19: abandonar el alta no escribe…` (API) y el E2E `:54` (formulario real, botón «Cancelar») |
| AC-21 | Dos confirmaciones concurrentes del mismo pendiente | Una única Transferencia, una única resolución y una única auditoría `confirmacion`; el perdedor no escribe | `AC-21: dos confirmaciones concurrentes…` |
| AC-23 | Rectificar y anular el Gasto de un pendiente confirmado | `movement_audit` alta/rectificación/anulación, sin Movimiento nuevo, sin devolución inventada y con el vínculo intacto | `AC-23: rectificar y anular el Gasto…` |
| AC-23 | Anular la Transferencia de Anticipo | E3.1 vuelve a 0,00 sin devolución ni Movimiento compensatorio y la ficha no se borra | `AC-23: anular la Transferencia de Anticipo…` |
| AC-25 | Operar con un Saldo Terminal | Sin posición convencional (`NULL`, `no_aplica`); Gasto permitido o rechazado sólo por `Permite salida a Exterior` | `AC-25: un Terminal no publica posición…` |

Evidencia local (macOS 15.5, bun 1.4.3):

| Comando | Resultado |
| --- | --- |
| `bun test ./apps/api/src/spec37-i6-regresion.test.ts` | **10 pass / 0 fail / 89 expect()** |
| `bun test` de las 6 suites de SPEC37 | **66 pass / 1 skip / 0 fail / 1545 expect()** en 6 ficheros |
| `bunx playwright test --config=.local/pw-i6.config.ts spec37-i6` | **1 passed (7,1 s)** — ver §Entorno y bloqueos |
| `bun run build` | PASS (exit 0) |

## Matriz AC-01…AC-43 — prueba y resultado

Leyenda de comandos:

- **api** = `bun test ./apps/api` (incluye la suite citada).
- **web** = `bun test apps/web`.
- **e2e-i6** = `bunx playwright test --config=.local/pw-i6.config.ts spec37-i6`.
- **e2e-i5** = `bunx playwright test spec37-i5`. Ejecutado en **entorno aislado** (§Entorno y
  bloqueos): `1 passed`, con su build servido en 5281. La config del repo sigue bloqueada por los
  puertos ocupados, y eso se declara —la prueba es la misma, cambia el servidor que la sirve—.

`PASS` exige una prueba ejecutada en este incremento que afirme el resultado observable del criterio.
Si una parte material del criterio sólo se demuestra en navegador y el E2E no se ha ejecutado, el
criterio queda `UNRUN` aunque su aritmética o su motor estén cubiertos.

| AC | Precondición | Resultado esperado | Prueba concreta (archivo:test) | Comando | Estado |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Gasto normal desde el Saldo pagador | Un único Gasto por el importe íntegro; sin Transferencia, pendiente ni alerta | `apps/api/src/spec37-i6-regresion.test.ts:332`; `tests/e2e/spec37-i6-regresion.spec.ts:54` | api + e2e-i6 | **PASS** |
| AC-02 | Modalidad A sin Transferencia (Cuenta 1 existe) | Sólo el Gasto desde Cuenta 2; no se crea pendiente | `apps/api/src/spec37-i6-regresion.test.ts:363`; `tests/e2e/spec37-i6-regresion.spec.ts:54` | api + e2e-i6 | **PASS** |
| AC-03 | Modalidad A con Transferencia real | Transferencia ordinaria + Gasto en una transacción; hechos y fechas conservados | `apps/api/src/spec37-i3-operacion-atomica.test.ts:314` | api | **PASS** |
| AC-04 | Modalidad A con Transferencia igual al déficit | Importe exacto; mínimo informativo correcto; sin remanente | `apps/web/test/spec37-i5-coordinado.test.tsx:96` (mínimo) y `:105` (remanente 0,00); exactitud de céntimos en `:88` | web | **PASS** |
| AC-05 | Modalidad A con Transferencia superior al déficit | Remanente positivo; importe real intacto | `apps/web/test/spec37-i5-coordinado.test.tsx:105` (remanente 20,00); `apps/api/src/spec37-i6-regresion.test.ts:407` (el importe declarado no se recorta) | web + api | **PASS** |
| AC-06 | Modalidad B con Anticipo mínimo y Referencia existente | Transferencia de Anticipo + Gasto; E3.1 refleja el mínimo | `apps/api/src/spec37-i3-operacion-atomica.test.ts:362` | api | **PASS** |
| AC-07 | Modalidad B con Anticipo superior al déficit | Remanente positivo; no aumenta el Presupuesto de la Partida | `apps/api/src/spec37-i6-regresion.test.ts:407` (`budgetUsage` = 1 fila, Aportación a saldo = 0); `apps/web/test/spec37-i5-coordinado.test.tsx:105` | api + web | **PASS** |
| AC-08 | Modalidad B con Saldo pagador con fondos suficientes | La Transferencia positiva sigue siendo necesaria; no se omite | `apps/api/src/spec37-i6-regresion.test.ts:407` (pagador con 1.000,00 y anticipo de 80,00 igualmente escritos); `apps/api/src/spec37-i45-intencion-referencia.test.ts:577` (B sin ninguna forma de Referencia → 422) | api | **PASS** |
| AC-09 | Crear Referencia y ficha de Anticipo desde el flujo | Altas coherentes y atómicas; sin huérfanos ni duplicados | `apps/api/src/spec37-i3-operacion-atomica.test.ts:418` y `:669` | api | **PASS** |
| AC-10 | Reutilizar una Referencia de Anticipo existente | Se valida identidad, tipo, estado y dirección; se vincula | `apps/api/src/spec37-i4-confirmacion-vinculo.test.ts:621` y `:442` | api | **PASS** |
| AC-11 | Referencia inexistente, inactiva o de tipo no Anticipo | Rechazo con motivo; sin sustitución ni creación silenciosa | `apps/api/src/spec37-i4-confirmacion-vinculo.test.ts:712` | api | **PASS** |
| AC-12 | Referencia con dirección incompatible | Rechazo; no se invierte ni se reinterpreta | `apps/api/src/spec37-i4-confirmacion-vinculo.test.ts:772` | api | **PASS** |
| AC-13 | Devolución parcial y completa del Anticipo | Transferencia inversa con la misma Referencia; E3.1 actualizado | `apps/api/src/spec37-i4-confirmacion-vinculo.test.ts:819` | api | **PASS** |
| AC-14 | Anticipo registrado junto al Gasto | El Anticipo no ejecuta el Presupuesto de fuente Aportación a saldo | `apps/api/src/spec37-i3-operacion-atomica.test.ts:461`; `apps/api/src/spec37-i6-regresion.test.ts:407` | api | **PASS** |
| AC-15 | Gasto con Partida y Presupuesto | Imputación exacta por Partida; sin doble Gasto | `apps/api/src/spec37-i3-operacion-atomica.test.ts:461`; `apps/api/src/spec37-i6-regresion.test.ts:407` | api | **PASS** |
| AC-16 | Saldo pagador sin permiso de salida a Exterior | Rechazo con motivo; no se elige otro Saldo automáticamente | `apps/api/src/spec37-i6-regresion.test.ts:520` | api | **PASS** |
| AC-17 | Importe superior al disponible calculado | Déficit y máximo informativos; confirmación explícita; sin bloqueo nuevo; sólo bloquean E1.4/E1.5 | Motor: `apps/api/src/spec37-i6-regresion.test.ts` (PASS). Pantalla: `tests/e2e/spec37-i5-ui-coordinada.spec.ts` — **ejecutado: 1 passed** (12,6 s) con el build de este árbol en 5281 y `APP_ORIGIN` alineado; ningún proceso ajeno interrumpido | api / e2e-i5 | **PASS** |
| AC-18 | Mover la barra y editar el campo numérico | Sincronización exacta en euros y céntimos; dos decimales; sin redondeo | Aritmética y atributos: `apps/web/test/spec37-i5-coordinado.test.tsx` (PASS). Sincronización en navegador: `tests/e2e/spec37-i5-ui-coordinada.spec.ts` — **ejecutado: 1 passed** (12,6 s) con el build de este árbol en 5281 y `APP_ORIGIN` alineado; ningún proceso ajeno interrumpido | web / e2e-i5 | **PASS** |
| AC-19 | Cancelar el formulario | Sin escritura de Gasto, Transferencia ni pendiente | `tests/e2e/spec37-i6-regresion.spec.ts:54` (botón «Cancelar», 0 POST y contadores idénticos); `apps/api/src/spec37-i6-regresion.test.ts:575` | e2e-i6 + api | **PASS** |
| AC-20 | Fallo en la segunda escritura | Rollback íntegro; sin hechos parciales; reintento idempotente | `apps/api/src/spec37-i3-operacion-atomica.test.ts:501` y `:542` | api | **PASS** |
| AC-21 | Dos confirmaciones concurrentes | Un único Gasto, una única Transferencia o pendiente y una única resolución | `apps/api/src/spec37-i6-regresion.test.ts:906` (confirmación, multiproceso); `apps/api/src/spec37-i3-operacion-atomica.test.ts:1053` (alta, multiproceso) | api | **PASS** |
| AC-22 | Cambiar contexto entre vista previa y confirmación | 409; no se guarda con datos obsoletos; borrador conservado | `tests/e2e/spec37-i5-ui-coordinada.spec.ts` — **ejecutado: 1 passed** (12,6 s) con el build de este árbol en 5281 y `APP_ORIGIN` alineado; ningún proceso ajeno interrumpido | e2e-i5 | **PASS** |
| AC-23 | Rectificar o anular el Gasto o el Anticipo | Efectos coherentes; sin duplicar ni inventar devoluciones | `apps/api/src/spec37-i6-regresion.test.ts:622` y `:737` | api | **PASS** |
| AC-24 | Revisar a 390 y 1440 | Modalidades, barra, alertas y errores accesibles; sin scroll horizontal | `tests/e2e/spec37-i5-ui-coordinada.spec.ts` — **ejecutado: 1 passed** (12,6 s) con el build de este árbol en 5281 y `APP_ORIGIN` alineado; ningún proceso ajeno interrumpido; `expectNoOverflow()` en ambos anchos | e2e-i5 | **PASS** |
| AC-25 | Operar con Terminal | Gasto permitido o rechazado por «Permite salida a Exterior»; sin déficit, mínimo ni restante inventados | `apps/api/src/spec37-i6-regresion.test.ts:834` | api | **PASS** |
| AC-26 | Transferencia aún no realizada | Se conserva como pendiente sin Movimiento real ni liquidez ficticia | `apps/api/src/spec37-i2-pendiente-coordinado.test.ts:246`; `apps/api/src/spec37-i45-intencion-referencia.test.ts:497` | api | **PASS** |
| AC-27 | Comparar disponibilidad real y presupuestaria | Se muestran separadas; el déficit presupuestario no se presenta como falta de dinero | Aritmética separable: `apps/web/test/spec37-i5-coordinado.test.tsx` (PASS). Presentación: `tests/e2e/spec37-i5-ui-coordinada.spec.ts` — **ejecutado: 1 passed** (12,6 s) con el build de este árbol en 5281 y `APP_ORIGIN` alineado; ningún proceso ajeno interrumpido | web / e2e-i5 | **PASS** |
| AC-28 | Transferencia ordinaria hacia destino de Aportación a saldo | La ordinaria ejecuta ese Presupuesto; el Anticipo con Referencia no; el pendiente no ejecuta hasta confirmar | `apps/api/src/spec37-i6-regresion.test.ts` (3 pruebas nuevas contra `cycleExecution`: A → 30,00; B con Referencia → 0,00; pendiente → 0,00 y 60,00 al confirmar) y `spec37-i5-efecto-aportacion.test.ts` | api | **PASS** |
| AC-29 | Recorrer estados del pendiente | Sólo tres estados; «Requiere revisión» es condición; una sola alerta y filtro | `apps/api/src/spec37-i2-pendiente-coordinado.test.ts:586` | api | **PASS** |
| AC-30 | Modificar o anular el Gasto vinculado | Pasa a «Requiere revisión»; cancelar con motivo o nueva vinculación válida; nunca confirmar contra el anulado | `apps/api/src/spec37-i2-pendiente-coordinado.test.ts:334` y `:394` | api | **PASS** |
| AC-31 | Vincular una Transferencia real ya registrada | Se vincula sin duplicar; si no coincide, se cancela con motivo | `apps/api/src/spec37-i4-confirmacion-vinculo.test.ts:873` y `:935` | api | **PASS** |
| AC-32 | Pendiente de Anticipo antes de confirmar | Sin ficha, Adelantado, Recuperado, Neto ni pendiente de recuperación ficticios | `apps/api/src/spec37-i2-pendiente-coordinado.test.ts:279`; `apps/api/src/spec37-i45-intencion-referencia.test.ts:497` | api | **PASS** |
| AC-33 | Confirmar con fecha real en ventana cerrada | `HISTORY_LOCKED`; sin escritura; se conserva el pendiente | `apps/api/src/spec37-i4-confirmacion-vinculo.test.ts:494` | api | **PASS** |
| AC-34 | Orden y atomicidad en ambos escenarios | Una transacción; sin éxito parcial; orden que no altera fechas | `apps/api/src/spec37-i3-operacion-atomica.test.ts:501`, `:542`, `:569` | api | **PASS** |
| AC-35 | Confirmar un pendiente en «Pendiente de realizar» con fecha real válida | Una sola Transferencia, pendiente resuelto, efectos de los motores y alerta retirada | `apps/api/src/spec37-i4-confirmacion-vinculo.test.ts:442` | api | **PASS** |
| AC-36 | Editar importe y fecha prevista antes de ejecutar | Se revalidan contexto, elegibilidad y Referencia; sin Movimiento hasta confirmar | `apps/api/src/spec37-i4-confirmacion-vinculo.test.ts:1031` | api | **PASS** |
| AC-37 | Cancelar un pendiente con motivo | Sin efecto financiero; motivo y trazabilidad; alerta retirada; sin Transferencia | `apps/api/src/spec37-i4-confirmacion-vinculo.test.ts:1149` | api | **PASS** |
| AC-38 | Alerta en lista general, Transferencias y detalle, a 390 y 1440 | Icono y texto en las tres superficies; contador/filtro; no sólo color | Estructura icono+texto: `apps/web/test/spec37-i5-coordinado.test.tsx` (PASS). Las tres superficies y dos anchuras: `tests/e2e/spec37-i5-ui-coordinada.spec.ts` — **ejecutado: 1 passed** (12,6 s) con el build de este árbol en 5281 y `APP_ORIGIN` alineado; ningún proceso ajeno interrumpido | web / e2e-i5 | **PASS** |
| AC-39 | La Referencia deja de ser elegible antes de confirmar | «Requiere revisión»; confirmación bloqueada; sin sustitución automática | `apps/api/src/spec37-i2-pendiente-coordinado.test.ts:459`; `apps/api/src/spec37-i45-intencion-referencia.test.ts:881` | api | **PASS** |
| AC-40 | Error de red tras el commit y reintento con la misma clave y payload | Mismo resultado; un único Movimiento y una única resolución | `apps/api/src/spec37-i3-operacion-atomica.test.ts:569` y `:1019` | api | **PASS** |
| AC-41 | Confirmar, editar o cancelar sin MFA o sin Origin/CSRF | Rechazo 401/403 en servidor; sin escritura; auditoría; error sin datos sensibles | `apps/api/src/spec37-i3-operacion-atomica.test.ts:899` | api | **PASS** |
| AC-42 | Ciclo original cerrado con fecha real de Ciclo abierto; y fecha real en Ciclo cerrado | Una Transferencia con la fecha real, en el Ciclo de esa fecha, `ciclo_origen` intacto; en ventana cerrada `HISTORY_LOCKED` | `apps/api/src/spec37-i4-confirmacion-vinculo.test.ts:561` | api | **PASS** |
| AC-43 | Intentar cambiar la modalidad de un pendiente | Rechazo con motivo, sin escritura; sólo cancelar y crear otro | `apps/api/src/spec37-i2-pendiente-coordinado.test.ts:522`; `apps/api/src/spec37-schema.test.ts:425` | api | **PASS** |

Recuento: **43 `PASS` / 0 `FAIL` / 0 `UNRUN`**.

## Cómo se cerraron los siete criterios que estaban `UNRUN`

| AC | Cómo se acreditó |
| --- | --- |
| AC-17, AC-18, AC-22, AC-24, AC-27, AC-38 | `tests/e2e/spec37-i5-ui-coordinada.spec.ts` — **ejecutado: 1 passed** (12,6 s) con el build de este árbol en 5281 y `APP_ORIGIN` alineado, sin interrumpir procesos ajenos. Cubre déficit y máximo informativos, sincronización barra↔campo, 409 con borrador, `expectNoOverflow()` a 390 y 1440, disponibilidad real frente a presupuestaria y las tres superficies de alerta. |
| AC-28 | **Corregido el diagnóstico**: no hace falta tocar E2/SPEC09. El motor `cycleExecution` → `executionFacts` ya atribuye «Aportación a saldo» por **Transferencia real cuyo destino es el del Presupuesto y sin Referencia**. Medido con tres pruebas nuevas en `apps/api/src/spec37-i6-regresion.test.ts`: A ordinaria → `ejecutado` 30,00; B con Referencia → 0,00; pendiente → 0,00 y 60,00 tras confirmar. |

### Corrección de un diagnóstico previo

En la primera entrega de I6 dejé AC-28 `UNRUN` afirmando que «el motor atribuye por línea de Reparto,
no por destino». **Eso era falso**: la medición citada usaba `budgetUsage`, que es otra consulta; el
motor de ejecución del ciclo (`executionFacts`) sí atribuye por destino y exige ausencia de
Referencia, que es exactamente lo que el usuario indicó. La medición correcta está arriba y no se
modificó ningún motor.

## Entorno y bloqueos

- **E2E del repo bloqueado**: `bunx playwright test` (config del repo) **no arranca** en esta máquina.
  Los puertos **3001** y **5173** están ocupados por otro checkout en marcha
  (otro checkout del proyecto con su demo en marcha, PIDs 14980 y 14981, padre
  `bun tools/demo/cli.ts`) y el config usa `reuseExistingServer: false`. Mensaje exacto:
  `Error: http://127.0.0.1:3001/api/health is already used, make sure that nothing is running on the
  port/url or set reuseExistingServer:true in config.webServer.` No se ha matado ningún proceso ajeno
  ni se ha modificado el config del repo.
- **Cómo se ejecutó el E2E de I6 igualmente**: el spec nuevo levanta su **propio** servidor de API
  aislado (puerto 3030, MFA real, SQLite en `.local/e2e-spec37-i6`) y todas las llamadas `/api/**` se
  redirigen allí. Para la web se sirvió el **build real de este árbol** (`bun run build` →
  `apps/web/dist`) en el puerto 5180 con `.local/serve-dist.ts` y `.local/pw-i6.config.ts` (ambos
  ignorados por Git; no forman parte de la entrega). `E2E_APP_ORIGIN` permite al spec declarar ese
  origen; por defecto usa `http://127.0.0.1:5173`, el del config del repo.
- **Consecuencia**: las suites E2E de I5 y de temas **no se han re-ejecutado** aquí. Los AC que sólo
  ellas demuestran quedan `UNRUN`; no se cita ninguna cifra de una ejecución ajena.

## Suite completa

`bun test ./apps/api` — run final de I6 (base `438acd5` + I6): **1211 pass / 11 skip / 58 fail** de
1280 pruebas en 88 ficheros (163,9 s). Los 58 fallos son de entorno y su conjunto **por nombre es
idéntico** al medido en la base `438acd5` antes de tocar nada (**0 nuevos, 0 resueltos**); ninguno está
en SPEC36/SPEC37/`transferencias-pendientes` ni en las suites de migración. Son 58 y no los 56
registrados en I4.5 porque el demo en marcha ocupa el puerto 3001 y rompe las dos pruebas
`32 actual API serves via host loopback…` (esperan el puerto libre); el resto es la clase ya conocida
(`Ancestro no confiable.`, FFI de `libc.so.6` y frontera de producción en macOS).

`bun test apps/web` → **317 pass / 0 fail / 30266 expect()** en 47 ficheros.
`bun run typecheck` → PASS. `bun run build` → PASS.

## I5 · UI unificada, Transferencia realizada o pendiente y aviso presupuestario

| Comprobación | Acción / precondición | Resultado esperado | Prueba |
| --- | --- | --- | --- |
| §10.1 · entrada unificada | «Nuevo gasto» con la modalidad predeterminada | Tres opciones en la misma pantalla (Gasto normal, A, B); sin modalidad no hay Transferencia, barra ni pendiente; el Gasto normal se registra por `POST /api/movimientos` | `SPEC37 I5: alta unificada…` (e2e) y `§10.1 el alta ofrece Gasto normal, A y B…` (unitaria) |
| §4 · Transferencia ya realizada | Modalidad A con «Transferencia ya realizada» | Gasto + Transferencia real en una transacción, sin pendiente; ambos hechos consultables | `SPEC37 I5: alta unificada…` (bloque 3) |
| §4 · Transferencia pendiente | Modalidad A sin marcar la casilla | Gasto + pendiente con modalidad A, `anticipoPrevisto` nulo y `movimiento` nulo | `SPEC37 I5: alta unificada…` (bloque 2) |
| AC-28 · aviso (no el AC) | Vista previa con modalidad A y con modalidad B | A: el servidor informa de que la Transferencia ordinaria ejecuta la Aportación a saldo de su destino. B: informa de que una Transferencia con Referencia no la ejecuta. El alta no estima importes ejecutados | `efectoAportacion distingue la Transferencia con Referencia…` y `el pendiente coordinado B no declara ejecución…` (API); e2e `previa-a`/`previa-b` |
| Aviso en la ficha | Confirmación de un pendiente B con un Presupuesto «Aportación a saldo» hacia el destino | `efectoPresupuestario.aplica = false` con motivo de Referencia de Anticipo | `el pendiente coordinado B no declara ejecución…` |
| Payload de las dos formas | `payloadCoordinado` con modo pendiente y realizado, A y B | `pendiente` XOR `transferencia`; B real lleva Referencia o alta nueva **más** atribución E3.1; A real no lleva atribución | `payloadCoordinado: …` (dos pruebas) |
| Validación local mínima | Importe vacío en modalidad B | Se bloquea antes de llamar al servidor con «Indica un importe exacto mayor que cero»; no se genera vista previa | e2e bloque B |
| AC-22 · 409 | Coincidencia creada entre la vista previa y el registro | 409 con las coincidencias, borrador intacto (importe, concepto, modalidad, Saldo) y registro posible tras marcarlas | e2e `conflicto-409` |
| AC-24 · apariencias y anchos | Alta con A y con B en las seis apariencias | Misma estructura; sin scroll horizontal a 390 ni 1440 | e2e (cada captura) y capturas por tema |

Evidencia local (macOS 15.5, bun 1.4.3):

| Comando | Resultado |
| --- | --- |
| `bun test apps/web` | 170 pass / 0 fail en 24 ficheros |
| `bun test ./apps/api/src/spec37-i5-efecto-aportacion.test.ts` | 2 pass / 0 fail / 9 expect() |
| `bun test ./apps/api` | 1204 pass / 11 skip / 58 fail de 1273 — mismos 58 nombres que la base sin estos cambios (1271 pruebas, 58 fail): 0 nuevos, 0 resueltos |
| `bunx playwright test tests/e2e/spec37-i5-ui-coordinada.spec.ts` | 1 pass |
| `bunx playwright test tests/e2e/theme*.spec.ts` | 8 pass |
| `bun run build` | PASS |

**Bloqueo de entorno:** 3001 y 5173 estaban ocupados por otra sesión de otro checkout, así que el E2E
se ejecutó con el front de este worktree en 5273 y `APP_ORIGIN` alineado; no se mató ningún proceso
ajeno ni se modificó el valor por defecto (5173).

**AC-28 medido contra el motor del ciclo:** la Transferencia ordinaria hacia el destino incrementa el
`ejecutado` del Presupuesto de Aportación a saldo (30,00), la de Anticipo con Referencia no lo toca
(0,00) y el pendiente no ejecuta hasta confirmar (0,00 → 60,00). Tres pruebas en
`apps/api/src/spec37-i6-regresion.test.ts`, sin lógica financiera nueva.

## Contratos revisados, no ejecutados

- Los 43 AC de SPEC37: matriz completa arriba; **43 `PASS`**, cada uno con prueba ejecutada y su
  comando. Ninguna asignación de alcance se presenta como prueba.
- Backup/restore cifrado y etiquetas de copia `e37.1-v30` / `e37.2-v31`: `UNRUN` local, ligado a CI
  Linux (§I4.5).
- `E4.8-AC-17` (aviso en precierre): fuera de esta spec; requiere su propio gate en SPEC26.