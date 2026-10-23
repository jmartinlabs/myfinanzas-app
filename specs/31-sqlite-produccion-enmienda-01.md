# 31 — SQLite segura: enmienda 31-E1 (verificación con conexión convencional)

Status: APPROVED — enmienda aprobada por el usuario el 2026-10-23 («Apruebo enmienda 31-E1»). Implementación NO autorizada.
Fecha: 2026-10-23 (Europe/Madrid). Afecta a la [especificación 31](31-sqlite-produccion-specification.md),
aprobada el 2026-10-21; su texto vigente **no se modifica** hasta aprobar esta enmienda.
Autorización: el usuario pide preparar una enmienda acotada (garantía lógica en lugar de
bytes de WAL/SHM, conexión convencional con transacción de lectura) como propuesta
documental, sin código. Aprobarla **no** autoriza implementarla: el desarrollo requiere
autorización aparte. No reanuda dev07, no investiga B4 y no reactiva Dev32.

## Motivo

La verificación previa de identidad usa `persistentIdentity()` con `?mode=ro&immutable=1`,
que lee el archivo principal sin bloqueos ni WAL. Durante migraciones concurrentes reales
esa lectura produce `SQLITE_CORRUPT` (errno 11) e identidades incoherentes; una conexión
convencional con bloqueos no falla. Evidencia: diagnóstico AC23 en
`specs/investigations/ac23-immutable-probe.md` (PR #46, pendiente de integración).

La sonda existe para cumplir una restricción de spec31 que exige dejar **byte a byte**
intactos DB, WAL y SHM en un rechazo. Una conexión SQLite convencional no puede garantizarlo
porque su protocolo WAL crea o actualiza `-wal`/`-shm` y hace checkpoint de transacciones ya
confirmadas. Esa restricción no protege datos: la enmienda la sustituye por una garantía
**lógica** y elimina la sonda.

**Prevalencia:** esta enmienda es la solución definitiva aprobada. Prevalece sobre la
«corrección mínima propuesta» del diagnóstico AC23 (sustituir `immutable=1` por una lectura
de solo lectura con bloqueos), que la evaluación posterior descartó porque falla con
`SQLITE_CANTOPEN` en bases sin sidecars y en la recuperación de B2. Ese diagnóstico y sus
resultados se conservan íntegros como evidencia histórica; no se reescriben ni se borran.

## Clasificación de las garantías de spec31

| Tipo | Garantía | Tras la enmienda |
| --- | --- | --- |
| Seguridad necesaria | No migrar, sembrar, convertir ni promover una base del origen equivocado | Sin cambios |
| Seguridad necesaria | No aceptar otra pareja DB/clave (huella SHA-256); no regenerar la clave | Sin cambios |
| Seguridad necesaria | Producción nunca crea una base en un arranque ordinario | Sin cambios |
| Seguridad necesaria | Rutas canónicas, sin enlaces ni alias; directorios 0700 y archivos 0600 del UID efectivo | Sin cambios |
| Seguridad necesaria | Publicación atómica del conjunto inicializado; ningún conjunto parcial aceptado | Sin cambios |
| Seguridad necesaria | Fallo cerrado sin secretos; backup/restore con identidad, huella y manifiesto coherentes | Sin cambios |
| Restricción propia | Rechazo con DB, **WAL y SHM idénticos byte a byte** | **Sustituida** por garantía lógica |
| Restricción propia | Verificar origen y clave **antes de abrir cualquier conexión** que pueda tocar WAL/SHM (sonda `immutable=1`) | **Sustituida** por verificación en transacción de lectura antes de cualquier escritura |
| Comportamiento normal de SQLite | Crear `-wal`/`-shm` al abrir (permisos copiados de la base: 0600) | Admitido |
| Comportamiento normal de SQLite | Marcas de lectura y recuperación del índice en `-shm` | Admitido |
| Comportamiento normal de SQLite | Checkpoint de transacciones ya confirmadas, o rollback de un journal pendiente, al abrir o cerrar | Admitido: no cambia el contenido lógico |

## Cambios exactos propuestos

### 1. «Rutas, publicación y concurrencia» — orden de validación

Texto vigente:

> En aperturas validar antes de PRAGMA mutables, chmod o migración; revalidar
> identidad/versión en la conexión efectiva bajo el bloqueo de escritura antes de
> migrar. Conservar WAL, FK, synchronous FULL y busy_timeout actual de 3 s.

Texto propuesto:

> En aperturas validar rutas y permisos sin SQLite; después abrir una conexión
> convencional (en producción, sin crear la base) con busy_timeout de 3 s y, dentro de
> una transacción de lectura, verificar esquema sin versión, versión, origen e identidad,
> y en producción la huella de la clave. Solo entonces ejecutar PRAGMA que persistan en la
> base (journal_mode, synchronous), chmod o migración. Revalidar identidad/versión en la
> conexión efectiva bajo el bloqueo de escritura antes de migrar. Prohibido abrir SQLite
> con `immutable=1` u otra lectura sin bloqueos sobre una base que pueda tener escritores.
> Conservar WAL, FK, synchronous FULL y busy_timeout actual de 3 s.

### 2. «Empty, loading and error states» — efectos de un rechazo

Texto vigente:

> Rechazos de origen/versión/rutas/permisos dejan inalterados archivos preexistentes,
> incluidos DB, WAL/SHM y clave. La evidencia comparará contenido/hash en fixtures
> cerrados o con escritor suspendido: no atribuir al rechazo cambios de un escritor
> legítimo concurrente ni exigir que atime nunca cambie en una lectura del sistema.

Texto propuesto:

> Rechazos de rutas/permisos ocurren antes de abrir SQLite y dejan inalterados todos los
> archivos. Rechazos de origen/versión/identidad/huella no ejecutan transacciones de
> escritura, migraciones, siembras ni PRAGMA persistentes, y dejan sin cambios el
> **contenido lógico** de la base (esquema, versión, identidad y filas) y el archivo de clave
> **byte a byte**. El protocolo WAL de SQLite puede crear o actualizar `-wal`/`-shm` con los
> permisos de la base y consolidar transacciones ya confirmadas; eso no cuenta como
> mutación. La evidencia comparará contenido lógico y bytes de la clave en fixtures cerrados
> o con escritor suspendido, y bytes de DB/WAL cuando el escritor siga abierto (no hay
> checkpoint de cierre); no exigir que atime ni `-shm` permanezcan idénticos.

### 3. Criterios de aceptación modificados

| ID | Resultado vigente | Resultado propuesto |
| --- | --- | --- |
| AC-05 | Rechazo sin cambios de DB/WAL/clave; mismo resultado tras eliminar filas demo en fixture | Rechazo sin escritura ni cambios lógicos de la DB; clave idéntica byte a byte; mismo resultado tras eliminar filas demo en fixture |
| AC-06 | Rechazo sin cambios; no escritura ni reetiquetado | Rechazo sin escritura, cambios lógicos ni reetiquetado; clave idéntica |
| AC-17 | Espera acotada/serialización o rechazo limpio; sin corrupción; regresión del bloqueo IMMEDIATE conservada | Igual, y además ninguna apertura concurrente devuelve `SQLITE_CORRUPT` ni identidad incoherente por la verificación previa |

### 4. Criterios de aceptación nuevos

| ID | Acción / precondición | Resultado esperado |
| --- | --- | --- |
| AC-34 | Dos procesos migran a la vez una v3 genuina mientras un tercero abre la misma base repetidamente (escena del diagnóstico AC23) | Cero `SQLITE_CORRUPT` e identidades incoherentes; la regresión falla con la sonda anterior y pasa con la verificación nueva |
| AC-35 | Abrir una base de origen ajeno en modo rollback, o con journal/WAL pendiente, en cada contexto | Rechazo sin convertirla a WAL ni ejecutar PRAGMA persistentes antes de la verificación; contenido lógico y clave intactos |
| AC-36 | Producción con clave de otra pareja, con y sin escritor abierto | Rechazo dentro de la transacción de lectura, antes de cualquier escritura; ningún PRAGMA persistente ni migración; clave intacta |
| AC-37 | Revisar código y ejecución | Ninguna apertura usa `immutable=1` ni lecturas sin bloqueos sobre bases potencialmente mutables |

AC-01–04 y AC-07–33 no cambian. D1–D4, la matriz de apertura, la publicación, las claves,
el backup/restore y la trazabilidad D→AC se mantienen; AC-34–37 se trazan a D1.

## Riesgos que se aceptan

- Un proceso del mismo UID con el origen equivocado puede crear o actualizar `-wal`/`-shm`
  (0600) o consolidar transacciones ya confirmadas en la base ajena. Otro UID no puede abrirla
  (directorios 0700).
- Un rechazo puede esperar hasta 3 s por bloqueos de un escritor legítimo.
- Se pierde la conservación forense byte a byte de `-wal`/`-shm`, que no era un objetivo de
  seguridad declarado.
- En un sistema de archivos de solo lectura, la apertura falla cerrada (`CANTOPEN`).

Riesgos que se eliminan: `SQLITE_CORRUPT` e identidades incoherentes en aperturas
concurrentes, la sonda propia y la dependencia del modo `immutable=1`.

## Evidencia experimental de apoyo (sin código del repositorio)

macOS, Bun 1.4.3, SQLite 3.51.0, datos ficticios, cada apertura en su propio proceso:

| Estado | Lectura/escritura convencional + transacción de lectura | Solo lectura (`mode=ro`) |
| --- | --- | --- |
| Base publicada sin sidecars | Identidad correcta; crea `-wal` vacío y `-shm` 0600 | `SQLITE_CANTOPEN` |
| Escritor abierto en otro proceso | Identidad correcta; solo cambia `-shm` | Identidad correcta; solo cambia `-shm` |
| WAL con frames y sin `-shm` (forma de B2) | Identidad correcta; consolida frames ya confirmados | Identidad correcta; crea `-shm` |
| Solo `-shm` | Identidad correcta; crea `-wal` vacío | `SQLITE_CANTOPEN` |
| Escena AC23, 150 rondas | — | 0 errores (sonda `immutable=1`: 21 `CORRUPT`, 73 identidad incoherente) |

Por eso la verificación debe usar la conexión convencional de lectura/escritura: la de
solo lectura no abre una base recién publicada. La escena AC23 se midió con el lector de
solo lectura; la variante de lectura/escritura con transacción de lectura no se ha medido
en esa escena (los procesos que migran ya usan conexiones convencionales, y en una tanda
uno falló con «Identidad ausente.» por leer sin transacción, lo que la transacción de lectura
corrige). AC-34 y la CI de Linux deberán demostrarlo en la implementación.

## Impacto en pruebas existentes (para el desarrollo futuro)

- `31 S7` (`security-review.test.ts:279`): conservar las comprobaciones de bytes de DB y
  WAL con el escritor abierto; sustituir la de `-shm` por contenido lógico y bytes de la clave.
- `SQLite B1` (`sqlite-opening.test.ts:35`): su título y aserciones sobre la sonda inmutable
  pasan a comprobar que no existe; el resto (timeout como primera SQL) se mantiene.
- Comparaciones de bytes de DB en fixtures cerradas sin WAL pendiente (`production.test.ts`
  116, 203, 814, 830; `app.test.ts` 845) deberían seguir cumpliéndose; si alguna cambia,
  revisarla contra la nueva garantía, no relajarla en bloque.
- `SQLite B2` usa `immutable=1` solo como herramienta de inspección dentro de la prueba;
  no es lectura del producto y puede mantenerse.
- `31 P1–P18`, `S1–S6` y las suites de migración, backup/restore y MFA deben pasar sin
  modificar sus aserciones de seguridad.

## Fuera de alcance

Código, `$dev`, merge, despliegue, reanudación de dev07 o de su esquema v9, B4, Dev32,
etiqueta de cabecera y marcador externo (alternativas evaluadas y no elegidas).

## Aprobación

Aprobada por el usuario el 2026-10-23 (Europe/Madrid), mensaje literal: «Apruebo enmienda
31-E1.». La aprobación cubre el
contenido de este documento. No autoriza implementarla, aplicarla al código, ni hacer merge
de la PR que la contiene: el merge requiere «Apruebo PR #N» y el desarrollo una
autorización expresa y separada. El texto de spec31 se actualizará con estos cambios en la
entrega que la implemente.
