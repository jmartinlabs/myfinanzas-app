# 37 — Registro coordinado de gastos: Test plan

Specification: [aprobada](37-registro-coordinado-gastos-specification.md) (D1–D10, AC-42/AC-43,
2026-11-16). Incrementos: [expediente](investigations/spec37-dev-increments-2026-11-16.md) (#484).
Estado: **I1 e I2 fusionados en `test`; I3, I4 e I4.5 ejecutados, en revisión**; I5–I6 y los 43 AC siguen `UNRUN`.

Ámbito de este documento ahora: **I1–I4.5**. Los 43 AC se incorporarán a la tabla de trazabilidad al
implementarse su incremento; no se declaran ejecutados por adelantado.

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

## Suite completa

`bun test ./apps/api` — run final de I4.5: **1202 pass / 11 skip / 56 fail** de 1269 pruebas en 87
ficheros. Los 56 fallos son los de entorno preexistentes (rutas de producción bajo directorios no
confiables, `Ancestro no confiable.`) y su conjunto **por nombre es idéntico** al de la base
`91c32f5` (0 nuevos, 0 resueltos); ninguno está en SPEC36/SPEC37/`transferencias-pendientes` ni en
las suites de migración. `bun test apps/api` (sin `./`) barre también el worktree ajeno
`wt-i4fix/`, así que el run de atribución se invoca con ruta relativa explícita.

## Contratos revisados, no ejecutados

- I5–I6: alcance y AC asignados en el expediente (§3 y §4). Sin implementación ni pruebas.
- Los 43 AC de SPEC37: `UNRUN`. La tabla de trazabilidad AC-01…AC-43 se completará en I6, con
  evidencia real por criterio; ninguna asignación de alcance se presenta como prueba.
- `E4.8-AC-17` (aviso en precierre): fuera de esta spec; requiere su propio gate en SPEC26.