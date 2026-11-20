# 38 — Cierre de validación operativa con recálculo vivo: Progress

Status: **I1 corregido tras revisión, pendiente de re-revisión.** SPEC38 v7
([aprobada](38-e49b-cierre-validacion-specification.md) el 2026-11-20, 57 AC) y su
[anexo de interfaces](38-e49b-cierre-validacion-interfaces.md) aprobados el mismo día, con la
sustitución de SPEC26/27/28/29 registrada. PR:
[#553](https://github.com/jmartinlabs/myfinanzas-app/pull/553).

Base medida: `test` `aa50a6eb`, esquema **v31** → **v32** tras I1. Rama
`feat/547-i1-esquema-v32`. Datos reales fuera de alcance.

| Incremento | Estado | Evidencia |
| --- | --- | --- |
| **I1 · Esquema v32 + DTO + importación conservadora + metadatos §7.3** | **corregido / en revisión** | `cierre-validacion-{dto,schema,migracion,metadatos,revision}.ts`, contrato `C32-SPEC38-VALIDACION-CIERRE`, `cierre-validacion-{dto,schema,adversarial}.test.ts` |
| **I2 · Lectores, escritores, UI y guardas** | **no iniciado** | requiere preview/confirmación expuesta, informes vivos y retirada funcional legacy |
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

## I2 · estado a 2026-11-20 (incompleto, sin PR)

Rama `feat/547-i2-lectores-escritores`, commit **`a8062b73`** (WIP), apilada sobre
`feat/547-i1-esquema-v32` @ `80efbcfc`. Typecheck **PASS**. **No hay PR ni SHA de entrega.**

### Implementado (sin pruebas de I2)

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
  fuera de sus 14 consumidores; precierre sin backup bloqueante ni contraste de fotos.

### Medición real (coordinador, `bun test apps/api`)

| | I2 `a8062b73` | Base I1 `80efbcfc` |
| --- | --- | --- |
| pass | 1042 | 1281 |
| fail | **61** | 58 |
| tests | **1113** | 1350 |
| ficheros | **81** | 95 |

**Faltan 237 tests**: 14 ficheros de suite dejan de cargar tras retirar `e49-guards.ts`, con
**3 fallos netos nuevos** sobre los 58 ambientales.

### Pendiente para dejarlo revisable

1. Recuperar la carga de las 14 suites adaptando imports y aserciones, sin relajar lo que prueban.
2. Cerrar `spec37-i4` AC-33/AC-42 (esperan `HISTORY_LOCKED` por ventana cerrada).
3. Escribir las pruebas de I2: estado, impacto, operaciones con concurrencia/idempotencia/atomicidad, rectificaciones y retirada `410`/`503`.
4. Medición final contra `80efbcfc` y PR **contra `feat/547-i1-esquema-v32`**, no contra `test`.

### Fuera de alcance, por decisión

Informes vivos por ciclo/trimestre/año con **gasto neto al ciclo de la compra**: dependen de
#538, cuya SPEC no está aprobada. **AC-15, AC-31, AC-32 y AC-34** quedan fuera de I2; el
sustituto de `/api/fotos/contraste` apunta al estado de validación, no a un informe vivo.
