# 38 — Cierre de validación operativa con recálculo vivo: Progress

Status: **I1 en revisión (PR #553) e I2 implementado con pruebas, pendiente de PR y QA.** SPEC38 v7
([aprobada](38-e49b-cierre-validacion-specification.md) el 2026-11-20, 57 AC) y su
[anexo de interfaces](38-e49b-cierre-validacion-interfaces.md) aprobados el mismo día, con la
sustitución de SPEC26/27/28/29 registrada. PR:
[#553](https://github.com/jmartinlabs/myfinanzas-app/pull/553).

Base medida: `test` `aa50a6eb`, esquema **v31** → **v32** tras I1. Rama
`feat/547-i1-esquema-v32`. Datos reales fuera de alcance.

| Incremento | Estado | Evidencia |
| --- | --- | --- |
| **I1 · Esquema v32 + DTO + importación conservadora + metadatos §7.3** | **corregido / en revisión** | `cierre-validacion-{dto,schema,migracion,metadatos,revision}.ts`, contrato `C32-SPEC38-VALIDACION-CIERRE`, `cierre-validacion-{dto,schema,adversarial}.test.ts` |
| **I2 · Lectores, escritores, UI y guardas** | **implementado con pruebas / sin PR** | estado, impacto, operaciones, rectificaciones y retirada `410`; 5 suites nuevas y paso A cerrado |
| **I3 · Retirada física (#548)** | **no iniciado** | bloqueado por G1 (esta Issue implantada y aceptada) y por la enmienda de SPEC30 |
| **I4 · Documentación** | **no iniciado** | — |

## I1 · correcciones de la revisión

Tres defectos funcionales y un hueco de alcance. No se amplía a I2 ni se rehace I1: se
corrige lo entregado y se cubre lo que §7.1 ya exigía.

1. **Identificadores reales de Referencia.** `IdExistente` validaba sólo decimal canónico,
   pero `referencias.id` es `REF` + dígitos (`CHECK(id GLOB 'REF[0-9]*' AND substr(id,4) NOT
   GLOB '*[^0-9]*' AND length(id)>=6)`). El dominio se deriva del esquema: `REF` en mayúsculas,
   mínimo tres dígitos, longitud acotada al tope técnico de identificadores de §2.3. Cada
   `EntidadPermitida` valida **su** formato —`movimiento` sigue decimal, `referencia` exige
   `REF`— tanto en el constructor como en el trigger de `hechos`; no hay formato compartido ni
   relajación del decimal para el resto.
2. **La revisión humana no reutiliza evidencia anterior.** `cierre_validacion_revision.ts`
   añade la guarda de servicio y la escritura transaccional de la confirmación; el esquema
   añade `cierre_validacion_confirmacion` y `cierre_validacion_referencia_nueva`. Confirmar
   exige: (a) `huella_validacion`/`version_conjunto` del conjunto vigente —una referencia
   existente no se reapunta a otra versión de conjunto—, (b) `revision_instante` estrictamente
   posterior a `dirty_ultimo`, a `dirty_desde` y a la revisión humana anterior, y (c)
   `revision=revision_anterior+1`. Reutilizar actor+instante+huella de la validación previa
   falla; la huella sí puede repetirse cuando el conjunto volvió a la referencia
   (`pendienteSinDelta`), porque lo que no se repite es la evidencia, no la cifra.
3. **Recibos con validación estricta en SQL y sin importes.** El trigger
   `validacion_attempts_recibo` (y su gemelo de `UPDATE`) comprueba en la base la forma exacta
   del recibo: claves de lista blanca en sobre, `ciclos`, `cierresDirty` y `rango`; tipos;
   arrays acotados y sin repetidos (`ids`, `auditIds`, `ciclo`); `rango` con fechas ISO reales
   y `hasta>=desde`; cero `number` JSON en todo el árbol; cero claves que nombren un importe
   (`importe`, `total`, `saldo`, `cantidad`, `centimo`, `monto`, `cifra`, `precio`, `suma`,
   `coste`, `bruto`, `neto` y variantes) y cero textos con separador decimal/millar o símbolo
   de moneda. IDs, revisiones y versiones viajan como texto decimal canónico, también en el
   recibo de E1b.

### Hueco de alcance · §7.3 metadatos

`cierre_validacion_metadatos.ts` migra, **antes de cualquier borrado y sin tocar las tablas de
origen**, lo que §7.3 exige y §7.1 incluye en I1:

| Origen | Destino |
| --- | --- |
| `reapertura_activa` | evento `legado_reapertura_activa` con ciclo, id de reapertura, `activa:true`, actor y fecha originales, `motivo=null`, y la fila del ciclo **Pendiente por transición** (`dirty_origen='ReaperturaActiva'`) |
| `cierre_vinculos` | evento `legado_cierre_vinculo` con versiones origen/destino, `reapertura_id` y correlación exactas (no se supone reconstruible) |
| `reaperturas` | evento `legado_reapertura` con identidad, actor, fecha y motivo originales |
| `cierre_audit` | evento `legado_cierre_audit` con identidad, actor, fecha y motivo; la acción legada se conserva tipada en el manifiesto y en `procedencia.correlacion` |
| `fotos_periodo`, `foto_periodo_componentes` | **manifiesto de migración** `cierre_validacion_manifiesto` tipado por tabla+PK: identidad, versiones técnicas, ciclos componentes, procedencia y `observado_utc`; sin eventos forzados, sin cifras y sin estado validado de periodo |

El manifiesto es append-only, con PK `(tabla, pk)`, huella SHA-256 de la identidad y trigger de
forma por tabla: repetir es un no-op y una identidad distinta bajo la misma PK se rechaza en vez
de sobrescribirse. Los originales quedan intactos hasta I3 (#548).

## Evidencia ejecutada

Medida sobre `feat/547-i1-esquema-v32` y sobre la base `aa50a6eb`, en worktrees separados con
`bun install --frozen-lockfile`.

| Check | Resultado |
| --- | --- |
| `bun run typecheck` | **PASS** (exit 0) |
| `bun test apps/api/src/cierre-validacion-{dto,schema,adversarial}.test.ts` | **40 pass · 0 fail · 440 aserciones** (12 tests adversariales nuevos) |
| `bun test apps/api` (rama) | 1281 pass · 11 skip · **58 fail** · 1350 tests |
| `bun test apps/api` (base `aa50a6eb`) | 1239 pass · 11 skip · **60 fail** · 1310 tests |
| Diferencia | **+42 pass, +40 tests** (28 de I1 + 12 adversariales); **ningún nombre de fallo nuevo**; dos fallos instrumentales de la base no se reprodujeron en la rama |
| `bun run build` · `bun test apps/web` (perfil `fast` del PR) | **PASS** · **198 pass · 0 fail** |
| Migración v31→v32 sobre copia | contrato `C32` verificado, `foreign_key_check` vacío, `integrity_check=ok`, 2 filas de manifiesto, 3 eventos (`migracion`, `legado_reapertura`, `legado_reapertura_activa`) |
| Repetición de la migración | `importarCierresLegados` creados `[]`/preservados `["1"]`; `migrarMetadatosLegados` creados `[]`, eventos `0`; estado byte a byte idéntico; FK e integridad limpios |

Los fallos restantes son **preexistentes y ambientales** (ancestros de root, `process.getuid` en
Bun, `restore-server` con `libc.so.6`, puerto de salud ocupado). Se reprodujeron en la base y se
confirmó que el conjunto de nombres no crece.

## Pruebas adversariales

`cierre-validacion-adversarial.test.ts` intenta romper cada corrección y comprueba, en cada
caso, que se rechaza **sin persistir nada**:

- Referencia con minúsculas, prefijo alterado/duplicado, sufijo inventado, longitud excesiva,
  separadores, espacios, sin dígitos y decimal de otra entidad; y el intento de usar un decimal
  como Referencia o un `REF` como movimiento.
- Confirmación con el mismo instante que la marca de pendiente; reutilización de
  actor+instante+huella de la validación anterior (servicio y SQL directo); cambio de versión
  de conjunto; salto de revisión.
- Recibo con importe bajo clave permitida y desconocida, importe como fecha, número suelto y
  anidado, cifra dentro de un string de campo técnico, arrays inflados, rango incompleto y
  booleano como texto; también por `UPDATE`.
- Metadatos migrados dos veces, metadato con otra identidad bajo la misma PK, identidad de
  manifiesto con cifras/claves extra/pk incoherente, edición o borrado del manifiesto, y
  comparación fila a fila de las tablas de origen antes/después.

## Lo que este incremento NO acredita

Los 57 AC de SPEC38 siguen **UNRUN**: I1 entrega esquema, DTO, guarda de revisión y migración,
no las rutas, informes vivos, preview/confirmación expuesta ni la retirada funcional legacy.
`confirmarRevisionValidacion` es la guarda y el escritor mínimo que I2 expone; no hay endpoint.
Ningún AC se declara cumplido por este incremento.

## I2 · lectores, escritores, UI y guardas

Rama `feat/547-i2-lectores-escritores`, apilada sobre `feat/547-i1-esquema-v32` @ `80efbcfc`.
WIP anterior `a8062b73`; paso A (suites) y correcciones de revisión cerrados en esta rama.

### Implementado

- `cierre-validacion-estado.ts`: proyección `SinValidar|Validada|Pendiente`,
  `divergenciaValidacion`, `pendienteSinDelta`, `revalidacionSugerida`, y sustituto que
  **falla cerrado** (503 si falta tabla o contrato).
- `cierre-validacion-impacto.ts`: universo canónico de §3.1, `H_v` por sha256 de JSON
  canónico, comparación antes/después separada de la divergencia con la referencia, motivos
  cerrados y candidatos por fecha real.
- `cierre-validacion-operaciones.ts`: preview con `SAVEPOINT`, confirmación con
  `BEGIN IMMEDIATE` y `busy_timeout`, idempotencia por clave completada, precedencia de
  errores del anexo, `409 IMPACT_CHANGED`, recibo sin cifras validado por el trigger de I1.
- `cierre-validacion-servicio.ts`, `cierre-validacion-rectificaciones.ts` (Inicio y S0),
  `cierre-anticipo-apertura.ts` (clases A/B y orden de §4.3),
  `cierre-validacion-retirada.ts` (410 por ruta).
- **Retirada funcional**: `e49-guards.ts` eliminado; `closedWindows`, `hasClosures`,
  `assert*Closure*`, `informativeFields`, `closedFieldDecision` y `HISTORY_LOCKED` de cierre
  fuera de sus consumidores; precierre sin backup bloqueante ni contraste de fotos.

### Corrección de materialidad (hallazgo de revisión, bloqueante)

`huellaUniverso` hasheaba el universo completo (`atribucion[].revision`, `cobertura`,
`noMedido` y `versionConjunto`) mientras `compararUniverso` los excluía: una errata podía dar
`material=true` con `motivos=[]`. Ahora:

- `universoMaterial(u)` = `M_v` de §3.1 (ventana, S0, flujo bruto/devolución/ingreso, Comida
  neta, efectivo, posiciones, atribución por IDs/signo/neto/ciclo, reparto). Sin revisión,
  cobertura, `noMedido` ni versión.
- `huellaUniverso(u) = sha256(JSONcanónico(M_v))` es `H_v` y la huella que se guarda como
  `huella_validacion`; una errata que sólo sube `movimientos.revision` ya no la mueve.
- `material = motivos.length > 0`, coherencia garantizada por construcción (misma proyección
  para hash y comparador).
- `noDisponible` se calcula desde la cobertura por grupo (efectivo, posiciones, plan,
  movimientos): una fuente caída no se declara igualdad y no aporta motivo (AC-17).
- `impactRevision` sigue hasheando el universo completo a propósito: es el token de estado y
  debe invalidarse con cualquier cambio de revisión o cobertura.

### Otras correcciones de la revisión

- `revalidacionSugerida` (§2.2/AC-07) se calcula literalmente: `true` sólo si existe
  referencia humana y su `version_conjunto` no es la vigente. Una huella distinta con el mismo
  conjunto es divergencia diagnóstica y no sugiere revalidar; sin referencia no hay nada que
  revalidar.
- `fingerprint` de validar/revalidar/confirmar revisión identifica el payload confirmado (el
  ciclo), no el estado: un hecho nuevo entre preview y confirmación responde `IMPACT_CHANGED`
  y no un `VALIDATION` de estructura (ANEXO §1); una clave completada se resuelve antes de
  revalidar contexto (§3.4/AC-10).
- Recibo: `cierresDirty[].dirtyPrevio` refleja el estado anterior real, no un `true` fijo.
- Reparto: retirado `assertOpenCycle` (`CICLO_PENDIENTE_REVISION`) y los flags
  `puedeEditar`/`puedeAnadirLineas`/`puedeGenerar` dejan de depender del cierre o de `dirty`
  (G2); el aviso `cicloCerrado` se conserva como información y la UI deja de presentarlo como
  bloqueo. Hallado por el QA independiente (la UI deshabilitaba la edición en `Pendiente`).

### Paso A · adaptación de las suites

Todas cargan y pasan. **Ningún fichero con contrato vivo perdió tests**: los recuentos de
`e49-api`, `e410-*`, `e411*` y `spec37-i4` son idénticos a `80efbcfc`, y sus aserciones de
retirada (`410` + código + sustituto + `no-store` + cero escrituras) son más estrictas que el
`409` retirado.

| Suite | Antes | Ahora | Contrato |
| --- | --- | --- | --- |
| `e410-cross-regression` | no carga | 3 pass | T1 sustituido por escritura real y persistida |
| `e49-api` | 3 pass / 24 fail | 27 pass | Rutas de cierre/foto/reapertura → `410` |
| `e49-guards` | no carga (31) | 9 pass | Cierre no bloquea + materialidad medida |
| `e410-guards` | no carga (7) | retirado | Sujeto eliminado; cubierto por `e49-guards` y retirada |
| `e410-cancelacion` | no carga (21) | retirado | Rutas retiradas; cubierto por `cierre-validacion-retirada` |
| `e410-i8-regresion`, `e410-recierre`, `e410-reopen`, `e410-revalidacion`, `e411-periodo`, `e411` | 14 fail | 133 pass | Rutas retiradas → `410`; resto intacto |
| `spec37-i4` AC-33/AC-42 | 2 fail | 22 pass | Fecha futura rechaza; ventana cerrada ya no |
| `repartos` R-06 | 1 fail | 26 pass | `dirty` no bloquea; aviso conservado |

`e49-guards.test.ts`, `e410-guards.test.ts` y `e410-cancelacion.test.ts` se sustituyen/
retiran **con su contenido íntegro en `80efbcfc`** porque su sujeto —las guardas de ventana
cerrada y la cancelación de reapertura— está retirado por §7.6: `e410-guards` y
`e410-cancelacion` sólo se borran, y `e49-guards` se reescribe con 9 pruebas del contrato
nuevo (escritura aceptada, huella material, `dirty`, `410`). La cobertura de esas rutas vive
en `cierre-validacion-retirada.test.ts` (8 pruebas con 18 rutas) y en `e49-api`.

### Pruebas nuevas de I2

`cierre-validacion-impacto.test.ts` (9), `cierre-validacion-estado.test.ts` (12),
`cierre-validacion-retirada.test.ts` (8), `cierre-validacion-operaciones.test.ts` (24) y
`cierre-validacion-rectificaciones.test.ts` (11): materialidad negativa/positiva, `NoDisponible`,
preview sin efectos, atomicidad, idempotencia, `IMPACT_CHANGED`, AC-11/12/17/19/20/21/22/24,
rectificación de Inicio/S0 y `410`/`503`.

### Medición real (`bun test apps/api`, macOS)

| | I2 (esta rama) | Base I1 `80efbcfc` |
| --- | --- | --- |
| pass | **1296** | 1281 |
| fail | **58** | 58 |
| skip | 11 | 11 |
| tests | **1365** | 1350 |
| ficheros | 98 | 95 |

Los 58 fallos son **los mismos** que en la base (spec31/32, backups, restore, loopback): el
conjunto de nombres no cambia y ninguno pertenece a validación, cierre ni reparto. `bun run
typecheck` PASS, `bun run build` PASS, `bun test apps/web` 198 pass.

### Gate canónico · E2E (DEMOSTRADO: FAIL, retirada UI pendiente)

`python3.12 scripts/verify all --base feat/547-i1-esquema-v32 --head de286db0`: unitarias,
typecheck y build PASS; **`test:e2e` 80 pass · 26 fail**. Clasificación medida:

| Causa | Casos | Estado |
| --- | --- | --- |
| UI de cierre/reapertura/fotos todavía implementada (espera «Listo», «Gates del cierre», reabrir, foto v1/v2) | 23 (`cierre.spec` 12, `fotos.spec` 7, `ui-dev07` 3, `graphite-g5f` 1) | **Pendiente real de I2**: el API ya responde `410`, la UI no se ha retirado |
| `restore-server` (libc/entorno macOS) | 2 (`catalog`, `movimientos`) | Ambiental, igual que en la base |
| Botón «Confirmar Neto de apertura» habilitado donde la prueba espera deshabilitado | 1 (`anticipos.spec`) | A verificar contra la base |

Conclusión: el incremento está completo en esquema, servicios y pruebas de API, pero **no**
en la superficie web: la retirada funcional `410` deja pantallas y E2E que ejercitan la vía
fotográfica retirada. Antes de declarar I2 revisable hay que retirar esas pantallas, exponer
el estado de validación y adaptar sus E2E.

### Pendiente

1. **UI de la retirada** (#555, `Backlog`): retirar cierre/reapertura/fotos de la web y exponer
   estado de validación, preview y confirmación; adaptar `tests/e2e/{cierre,fotos,ui-dev07,graphite-g5f}.spec.ts`.
   Es el trabajo que falta para que el gate canónico quede verde.
2. Verificar `anticipos.spec` contra la base para separar regresión de ambiente.
3. PR de I2 **contra `feat/547-i1-esquema-v32`** (no contra `test`), con I1 mergeado antes.
4. Los 57 AC siguen **UNRUN** como aceptación: esta entrega acredita comportamiento medido y
   sus propias pruebas, no la aceptación funcional de la SPEC.

### Fuera de alcance, por decisión

Informes vivos por ciclo/trimestre/año con **gasto neto al ciclo de la compra**: dependen de
#538, cuya SPEC no está aprobada. **AC-15, AC-31, AC-32 y AC-34** quedan fuera de I2; el
sustituto de `/api/fotos/contraste` apunta al estado de validación, no a un informe vivo.

### Reconciliación acotada · SPEC13 AC-36 frente a SPEC38

Decisión de Álex (2026-11-21, #547 `7052975797`): la cláusula de SPEC13 AC-36 que exigía un
proveedor verificable de cierres/fotos **financieros** queda **sustituida** por SPEC38 §7.6 y el
bloqueo genérico «protección de cierres/fotos no verificable» **no se restaura**. No se declara
superada la AC-36 completa: siguen vigentes las garantías de negocio de Anticipos —declaración
`fotos_neto_apertura` con evidencia, procedencia y cobertura, motivo de corrección excepcional,
revisión vigente y conflicto, auditoría con valor anterior, un único registro por REF+ciclo,
idempotencia y `protectAnticipoChange` (`409 ANTICIPO_PHOTO_PROTECTED`) para movimientos que
alteren una apertura confirmada—. La aceptación de la AC-36 no se acredita por adaptar su
prueba: exige la evidencia de esas garantías. Esta nota anota la reconciliación; no modifica la
SPEC aprobada.
