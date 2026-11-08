# 34 — INFRA-TEST-01: entorno TEST reproducible con datos ficticios — Specification

Status: **APPROVED — SPEC y test plan aprobados por el usuario el 2026-11-04; D1–D6
aprobadas; D7 aprobada el 2026-11-05. Reconciliación documental a v27/C27 y al flujo
`feature/* → test → main` (2026-11-07), sin reabrir D1–D7 ni rebajar AC o semántica.**
No autoriza DEV, acceso al VPS, DNS, Caddy, despliegue, datos reales, migraciones operativas
ni merge.
Approval source/date: usuario, 2026-11-04 («Apruebo SPEC34/testplan y D1–D6»); D7:
usuario, 2026-11-05 (decisión registrada en el cierre del PR #229, CLOSED sin merge).
Base: `origin/test` `0d25be9a1ae97d1dc7e2d94dcf004641973b4b8c` (2026-11-07), igual que
`origin/main`; `schemaVersion=27`, contrato `C27-E411-FOTOS-PERIODO`. Esta rama solo
modifica documentación; no cambia la aplicación.
Documentos relacionados: [antecedente histórico cancelado de vps-infra, PR #7](https://github.com/jmartinlabs/vps-infra/pull/7) (CLOSED, no mergeado),
[runbook de operación](../infra/RUNBOOK.md), [preparación de despliegue](../infra/README.md),
[29 — fotografías consultables](29-e411-fotografias-specification.md),
[31 — SQLite en producción](31-sqlite-produccion-specification.md),
[32 — ejecución rootless](32-ejecucion-rootless-specification.md),
[35 — despliegue mediante tags](35-deploy-tags-01-specification.md),
[seguridad](guidelines/security.md), [calidad](guidelines/quality.md) y
[tablero de épicas](epic-board.md).
Test plan: [34 — test plan](34-infra-test-01-testplan.md).

Las marcas `[CONFIRMADO]`, `[PROPUESTA]` y `[PENDIENTE]` distinguen hechos comprobados en
el repositorio o por consulta de solo lectura, diseño sometido a aprobación y cuestiones
sin decisión. Ninguna marca convierte una propuesta en autorización.

`[CONFIRMADO]` Revisión 2026-11-07: la base documental es la rama de integración `test`
(`0d25be9`), no `main`; `schemaVersion=27` y contrato `C27-E411-FOTOS-PERIODO`.
E4.9, E4.10 y E4.11 están integrados en la base y sus módulos se excluyen de `FT-1` por
alcance (D5/D7), no por ausencia. El flujo adoptado es `feature/* → test → main`: TEST
consume un SHA de `origin/test` y PROD futuro solo consume un commit promovido a
`origin/main` tras el gate TEST→main. Esta revisión no crea el seed, no fija el candidato
de despliegue y no autoriza ninguna fase.

## 1. Objetivo y alcance

`[CONFIRMADO]` El objetivo es disponer de un entorno **TEST** accesible por
`https://test.myfinanzas.pp.ua` con **datos exclusivamente ficticios y reproducibles**,
sin PROD, sin exponer la API ni SQLite a Internet y sin interferir con el sitio
`myfinanzas.pp.ua` ni con el desarrollo en curso.

Esta especificación:

- define **el contrato de MyFinanzas** (imagen, runtime, estado, autenticación, copias y
  mecanismo de datos ficticios) y la **interfaz** que `vps-infra` consume;
- **no** repite la arquitectura interna del host, que pertenece al entregable host de
  `vps-infra` (PR #9, MERGED `901204c`); el PR #7 está cerrado y solo es antecedente;
- **no** implementa nada: ni herramienta de seed, ni imagen TEST, ni cambios en el release;
- **no** toca `vps-infra`, el VPS, DNS, Caddy, UFW ni ningún servicio remoto.

`[PENDIENTE]` La aprobación de esta spec no autoriza su desarrollo. Cada fase del
[test plan](34-infra-test-01-testplan.md) exige autorización propia, incluida la auditoría
de solo lectura.

### 1.1 Resultado esperado

1. Un candidato de MyFinanzas congelado por SHA de 40 caracteres, con imagen y frontend
   verificados por manifiesto.
2. Un artefacto de seed **test-only** separado del runtime de producción.
3. Un dataset ficticio fijo, determinista, idempotente y verificable por manifiesto.
4. Un despliegue TEST que responde por HTTPS, autentica con contraseña + TOTP y no expone
   API ni base de datos.
5. Copia cifrada local y externa, restauración ensayada y rollback bloqueado sin prueba.
6. Evidencia de que el sitio raíz y los datos reales permanecen intactos.

## 2. Estado verificado y contrato de partida

`[CONFIRMADO]` Consulta de solo lectura del repositorio local y de la API de GitHub el
2026-11-07. No se ha accedido al VPS, ni a su DNS, ni a su Caddy. No se ha ejecutado
ninguna prueba de aplicación ni de infraestructura para esta spec.

| Hecho | Evidencia | Consecuencia para TEST |
| --- | --- | --- |
| `origin/test` y `origin/main` en `0d25be9a1ae97d1dc7e2d94dcf004641973b4b8c` | `git rev-parse` local y API de GitHub | Base documental; `test` es el origen de TEST y `main` el de PROD. No es por sí sola el candidato de despliegue. |
| E4.6 integrado (`cfbedb0`, PR #201) | [tablero](epic-board.md) | El resumen de inicio existe en la base. |
| E4.9 integrado (`0176ffc`, PR #200) | [tablero](epic-board.md) | Los cierres existen en la base; se excluyen de `FT-1` por D7. |
| E4.10 integrado I1–I8 (`70fa7c0`…`5ea79b9`) | [tablero](epic-board.md) y Git | Reapertura y re-cierre existen; se excluyen de `FT-1` por D5/D7. |
| E4.11 integrado I1–I6 (`a658803`…`4da1516`); aceptación pendiente | [tablero](epic-board.md) y Git | Fotografías de periodo existen en v27/C27; se excluyen de `FT-1` por D5/D7. |
| `schemaVersion = 27` / `C27-E411-FOTOS-PERIODO` (320 objetos, `sha256=ecc4306bfaa6e27cf41ed15d30f612684051ef53bdf557eb8535187bf1a57e23`) | `apps/api/src/database-identity.ts`, `schema-contracts.json` | La base, `FT-1` y su manifiesto se anclan a v27/C27; `data_contract=e4.11-v27`. |
| C25–C27 son aditivos: +11 tablas, 0 eliminadas | `schema-contracts.json` | `FT-1` no crea cierres, reaperturas ni fotografías; esas tablas quedan vacías y se verifican en AC08/AC09. |
| E4.5 con documentación/QA integradas (`a806fd9`), DT7 abierto y DEV no autorizado; E4.7 integrado (`0e89562`) | [tablero](epic-board.md) | Sin históricos E4.5; E4.7 fuera de `FT-1` por D5. |
| Runtime descrito en `infra/` | `Containerfile`, `runtime.py`, `release.py`, `RUNBOOK.md`, `migrations/`, `compatibility.py` | Contrato reutilizable, con las salvedades de §3 y §6. |
| API en `3001`, bind explícito `127.0.0.1`/`0.0.0.0` | `apps/api/src/main.ts`, `server-config.ts` | TEST publica en loopback del host y `0.0.0.0` solo dentro del namespace. |
| Esquema/estado productivo con pareja DB+clave y permisos estrictos | `private-state.ts`, `production-state.ts`, `database.ts` | Reutilizar tal cual; no crear estado desde el entrypoint. |
| `production-init`, `setup`, `backup-cli` como CLIs deliberadas | `production-init.ts`, `setup.ts`, `backup-cli.ts` | TEST los invoca como tareas efímeras, nunca como arranque normal. |
| `release.py` construye imagen + frontend con manifiesto y `--expected-commit` | `infra/release.py` | El candidato se verifica; no se usa etiqueta móvil. |
| `runtime.py:render` fija `18081` y `APP_ORIGIN=https://myfinanzas.pp.ua` | `infra/runtime.py` | **No** se usa sin cambios para TEST; ver D6. |
| `vps-infra` PR #7 **CLOSED** el 2026-11-04, sin merge y con rama eliminada | API de GitHub | Solo antecedente histórico; sustituido por el contrato host de §11. |
| `vps-infra` PR #9 **MERGED** `901204c` el 2026-11-05 (host TEST) | API de GitHub | Contrato host vigente; su operación y autorizaciones siguen fuera de esta spec (§11). |

`[CONFIRMADO]` A 2026-11-07, `origin/test` y `origin/main` apuntan al mismo SHA. `test` es
el origen autorizado de TEST y `main` el de PROD. La promoción `test → main` es un merge
explícito y aprobado, no automático; un tag o un despliegue TEST no la sustituyen. El
detalle de tags y del gate está en [SPEC35 §6](35-deploy-tags-01-specification.md). La
protección efectiva de `test` se verifica antes de habilitar tags; esta spec no la presume.

`[CONFIRMADO]` El antecedente cerrado usaba `origin/main` `0b8aade` y proponía
`D6: estado productivo limpio; datos ficticios manuales`. Esa formulación **no** cumple el
requisito de reproducibilidad de esta entrega; se recoge en §11 para el contrato host,
sin editar el repositorio ajeno.

`[CONFIRMADO]` El runbook de MyFinanzas mantiene el despliegue como **NOT deployable** y
exige el [gate Rootless](../infra/RUNBOOK.md#gate-obligatorio-de-rootless-previo-al-despliegue)
sobre el SHA exacto. Esta spec no rebaja ni sustituye ese gate.

## 3. Requisitos de MyFinanzas para TEST

`[CONFIRMADO]` Salvo donde se indique `[PROPUESTA]`, estos requisitos se derivan del código
en la base declarada. TEST añade restricciones, no relaja ninguna existente.

### 3.1 Imagen y release

- Base `oven/bun:1.4.3-debian` fijada por digest en `infra/Containerfile`; `bun.lock`
  congelado; sin `latest` ni actualizaciones implícitas.
- El paquete de release contiene `image.oci.tar`, `frontend/`, `manifest.json` y
  `manifest.sha256`; la imagen se selecciona por **ID inmutable**, nunca por etiqueta.
- `python3 infra/release.py verify` con `--expected-commit` y
  `--expected-manifest-sha256`; un rebuild desde otro SHA invalida la verificación.
- Backend y frontend viajan como conjunto; no se mezcla `dist` de otra release.
- `[PROPUESTA]` El paquete TEST añade un artefacto de seed con su propio manifiesto e ID
  inmutable (§4.2). El manifiesto de la app registra el par app+seed y el SHA del dataset.

### 3.2 Runtime, red y UID

| Requisito | Valor | Evidencia |
| --- | --- | --- |
| Proceso | Bun 1.4.3, `apps/api/src/main.ts` | `Containerfile`, `main.ts` |
| Puerto interno | `3001` | `main.ts` |
| Bind interno | `API_BIND_HOST=0.0.0.0` solo dentro del namespace | `server-config.ts` |
| Publicación host | `127.0.0.1:18082:3001` | Propuesta del packet y §5; a fijar en el contrato host §11 |
| UID/GID interno | `10001:10001` con `keep-id:uid=10001,gid=10001` | `Containerfile`, `runtime.py`, RUNBOOK |
| Rootfs | solo lectura, `TMPDIR=/tmp/private`, tmpfs 64 MiB noexec | `Containerfile`, RUNBOOK |
| Límites | 1 GiB RAM, 1 CPU, 128 pids | RUNBOOK, plantilla Quadlet |
| Privilegios | `cap-drop=all`, `no-new-privileges`, sin socket Podman, sin `:U` | RUNBOOK |
| Frontend | estático desde `frontend/` del paquete; Vite `5173` **no** se publica | `vite.config.ts`, README |

`[CONFIRMADO]` El proceso no debe crear, migrar ni sembrar estado al arrancar: si falta la
pareja DB+clave, la configuración es inválida o el esquema no es compatible, falla y queda
en `start-limit`.

### 3.3 Estado, clave y migraciones

- `DATABASE_PATH` y `AUTH_KEY_PATH` absolutos, canónicos, en el **mismo** directorio;
  directorio `0700` y archivos `0600` del UID efectivo; sin symlinks ni hardlinks.
- Se monta la **raíz de datos completa** en `/var/lib/myfinanzas`; nunca solo el archivo
  SQLite (se perderían WAL/SHM y la publicación conjunta).
- Migraciones solo mediante el código de la imagen y sobre un estado compatible; TEST no
  ejecuta migraciones operativas ni downgrades forzados.
- `production-init` se ejecuta como tarea efímera sobre un `state` **inexistente**. Crea
  DB+clave juntas, sin usuario, sin fixtures y con `saldos=1` (S000). No es entrypoint.
- `setup.ts` se ejecuta como tarea efímera con archivo de entrega nuevo `0600`; el token
  nunca aparece en stdout, entorno, argv, chat ni logs.

### 3.4 Salud, autenticación y cookies

- `GET /api/health` → `200` y JSON exacto `{"ok":true}`; el healthcheck interno usa timeout
  de 2 s y no acredita backup, HTTPS ni recuperación.
- Una ruta protegida sin sesión (por ejemplo `GET /api/saldos`) → `401`.
- Contraseña + TOTP; sin registro público ni recuperación administrativa.
- Con `APP_ORIGIN=https://test.myfinanzas.pp.ua`, la cookie de sesión es `__Host-mf_session`
  con `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/` y sin `Domain`.
- Toda mutación valida `Origin` exacto y CSRF; un `Origin` ajeno → `403`. No se añade CORS
  comodín en Caddy.
- Los límites de intentos de la app son de cuenta/origen lógico, **no** un rate limit de
  borde; la exposición pública se decide en D5 de vps-infra.

### 3.5 Copias y restauración

- `backup-cli.ts create DESTINO NUEVO DESTINATARIO_AGE` cifra un snapshot SQLite coherente
  (`VACUUM INTO`) más la clave TOTP; no se copian DB/WAL por separado.
- `backup-cli.ts restore COPIA DESTINO_NUEVO IDENTIDAD_AGE` restaura solo a un directorio
  nuevo, verifica pareja/identidad/integridad/FK y revoca sesiones, desafíos y códigos.
- El estado activo no se sobrescribe; una restauración fallida preserva origen, copia y
  destino y escala.
- `[PROPUESTA]` TEST exige copia local y copia externa cifrada antes de habilitar Caddy,
  con al menos la copia actual y la anterior, y un simulacro de restauración registrado.

## 4. Mecanismo reproducible de datos ficticios (núcleo)

`[PROPUESTA]` Esta sección define el contrato del seed. No existe todavía ninguna
herramienta, dataset ni manifiesto ejecutado.

### 4.1 Principios

1. **Test-only y separado del runtime.** El seed no es un endpoint, no se importa desde
   `main.ts`, no se copia a la imagen de producción y no se activa por el entrypoint.
2. **Semántica de la aplicación.** La creación usa los servicios y validaciones existentes
   (`createSaldo`, `createClassification`, `createCycle`, `writeMovement`, …), no `INSERT`
   crudos que salten invariantes, auditoría, contadores, idempotencia o triggers.
3. **Determinista.** IDs, fechas, importes, relaciones y orden son fijos; no hay
   aleatoriedad, reloj de pared ni datos del entorno en el dataset. Los instantes de
   auditoría y la disposición física de SQLite no forman parte de la huella lógica.
4. **Idempotente.** Repetir el seed sobre el mismo estado y manifiesto no crea ni modifica
   nada: termina con «ya sembrado». Un estado parcial o ajeno se rechaza.
5. **Verificable.** Un manifiesto no secreto y checksums lógicos permiten comprobar el
   dataset por SQL de solo lectura, por API autenticada y por UI.
6. **Reversible sin tocar PROD.** El reset solo archiva y recrea el estado TEST; no borra,
   renombra ni escribe nada fuera de la raíz de datos TEST.

### 4.2 Componentes

| Componente | Propuesta | Verificación |
| --- | --- | --- |
| Herramienta | `tools/test-seed/` con CLI (`cli.ts`), dataset fijo y cálculo de manifiesto; importa servicios de `apps/api/src` | No referenciada por `apps/api/src/main.ts` ni por `infra/Containerfile` de producción |
| Artefacto | Imagen test-only desde el **mismo commit** (`Containerfile.seed` o etapa equivalente), base/digest y Bun idénticos | ID inmutable y manifiesto propio; el manifiesto de release registra ambos |
| Dataset | `FT-1`, versión 1, fichero TypeScript/JSON legible con IDs, fechas e importes fijos | `dataset_sha256` en el manifiesto; revisión de diff |
| Manifiesto | `seed-manifest.json`: formato, dataset/versión, commit, `schema=27`, `schema_contract=C27-E411-FOTOS-PERIODO` y su checksum, `data_contract=e4.11-v27`, origen, lista de IDs, checksums lógicos, `created_at` fuera de la huella | `seed verify` compara manifiesto, marcador y estado |
| Marcador | `<data-root>/test-instance.json` `0600`, escrito por la primera ejecución autorizada: `environment=test`, `public_origin`, `seed_manifest_sha256`, `schema_version`, `schema_contract` | Guard de entorno y de ruta (§4.4) |
| Registro privado | Resultado de cada seed/reset/verify en el expediente del operador, sin secretos | Evidencia del test plan |

`[CONFIRMADO]` D1 fija la imagen test-only. Hereda el pin de Bun/dependencias, el rootfs
endurecido y la trazabilidad del manifiesto, y evita depender de un Bun instalado en el VPS.

### 4.3 Interfaz CLI propuesta

Los nombres exactos son `[PROPUESTA]`; los códigos de salida son parte del contrato.

| Comando | Efecto | Rechaza / requisitos |
| --- | --- | --- |
| `seed init --data-root RUTA` | Valida entorno, ruta, permisos y esquema; escribe el marcador TEST si no existe | Ruta no canónica, symlink, propietario/modo incorrectos, origen distinto, marcador existente con otro contenido |
| `seed apply --data-root RUTA` | Aplica `FT-1` con servicios de la app y publica `seed-manifest.json` | Estado no vacío, propietario existente, datos ajenos, esquema distinto, fallo previo marcado |
| `seed verify --data-root RUTA [--expected-manifest-sha256 SHA]` | Recalcula checksums lógicos y compara marcador/manifiesto/estado | Drift, manifiesto ajeno o ausente, ruta/origen no TEST |
| `seed status --data-root RUTA` | Informe no secreto de estado (`seeded`, `empty`, `partial`, `drift`) | Solo lectura; no modifica |
| `seed reset --data-root RUTA --confirm reset-test` | Archiva el `state` TEST actual y deja instrucciones para recrearlo | Unidad activa, origen no TEST, marcador ausente, ruta no canónica, confirmación ausente |

Códigos: `0` éxito/no-op idempotente; `2` rechazo de guarda; `3` drift o verificación
fallida; `1` error técnico. Ningún comando imprime rutas privadas completas, claves,
tokens ni contenido financiero.

### 4.4 Guardas y orden de comprobación

El seed se ejecuta con el **mismo UID/mount** que la app, con una imagen derivada del mismo
commit (D1) y con `--network=none`. Antes de tocar datos comprueba, en este orden:

| # | Guarda | Condición de rechazo |
| --- | --- | --- |
| 1 | Entorno explícito | `NODE_ENV=production` y `APP_ORIGIN=https://test.myfinanzas.pp.ua` exactos; otro origen (incluido `https://myfinanzas.pp.ua`) se rechaza |
| 2 | Marcador TEST | `test-instance.json` existe, es regular `0600`, su `public_origin` coincide y su `environment` es `test` |
| 3 | Ruta canónica | `--data-root` y `DATABASE_PATH`/`AUTH_KEY_PATH` coinciden con `<root>` y `<root>/state/...`; sin symlinks, `0700`/`0600`, UID efectivo |
| 4 | Esquema | Inspección en solo lectura: `schemaVersion=27` y contrato `C27-E411-FOTOS-PERIODO`; cualquier otra versión se rechaza con `2` y no se migra |
| 5 | Sin propietario | En el primer seed, `owner` vacío; un propietario existente implica entorno reclamado o real → rechazo |
| 6 | Base vacía | `saldos=1` (solo S000), `movimientos=0`, `audit=0` y sin `seed-manifest.json` previo |
| 7 | Sin importación | No acepta ficheros, stdin, `--from`, Excel, SQL externo ni datos de entorno |

`seed init` es la única orden que crea el marcador; el resto exige que ya exista. La
comprobación de idempotencia (marcador + `seed-manifest.json` + checksums coincidentes)
precede a las guardas 5–6: un entorno ya sembrado y reclamado por su propietario es un
**no-op** `0`, no un rechazo. Las guardas 5–6 solo se aplican a un seed nuevo.

`[CONFIRMADO]` D3 fija el orden **production-init → seed → setup**. Sembrar antes del alta
permite exigir «sin propietario» como prueba de que el entorno no está reclamado; el alta
posterior crea la cuenta del propietario sobre datos ficticios ya verificados.

Si en cualquier momento aparece un dato real, un estado parcial, un propietario inesperado
o una ruta fuera de TEST: **detener, preservar y escalar**. No borrar, no reintentar a
ciegas y no convertir una base demo o de producción en TEST.

### 4.5 Dataset `FT-1`

`[PROPUESTA]` Conjunto fijo, pequeño y revisable, limitado a funcionalidades presentes en
la base declarada de `origin/test` (v27/C27). Los nombres incluyen `TEST`; no se usan
nombres, importes, fechas ni identificadores de personas reales.

| Área | Contenido fijo | Motivo |
| --- | --- | --- |
| Saldos | S000 del sistema + 4 altas ficticias (Efectivo/Movimientos, Efectivo/Terminal, Efectivo/No controlado, Inversión/Inversiones) | Cubre controles y posiciones |
| Clasificación | 2 categorías, 3 subcategorías y 4 partidas ficticias | Base de imputación |
| Ciclos | 1 ciclo con `Inicio` fijo en el pasado y saldo de comida explícito | Maestro único, sin cierres |
| Movimientos | Ingreso, Gasto, Transferencia y Amortización de deuda, fechas fijas | Cuatro tipos vigentes |
| Referencias | 1 referencia ficticia asociada a un gasto | E1.5 |
| Deudas | 1 deuda con apertura y 1 pago | E1.6, sin conciliaciones avanzadas |
| Presupuesto | 1 presupuesto mensual | E2.2 |
| Nómina | 1 previsión ficticia | E3.1 |
| Vehículo | 1 vehículo ficticio | E3.3 |
| Inversión | 1 instrumento y 1 compra ficticia | E4.1, sin ventas ni valoraciones E4.3 salvo que el servicio lo exija |
| Compartido / anticipo | 1 ficha ficticia de cada uno si el servicio lo admite sin dependencias no entregadas | E3.2/E3.4 |

Exclusiones por alcance (D5/D7): cierres E4.9 y primera fotografía, reaperturas E4.10 y
fotografías de periodo E4.11. Quedan fuera de `FT-1` el resumen anual E4.7 (integrado,
pero excluido por D5) y los históricos E4.5 (DEV no autorizado; DT7 abierto). No se
simulan módulos no integrados. Si un módulo no puede sembrarse con su servicio sin
cambios de esquema, se omite y se registra la omisión; **no** se crea por SQL crudo ni se
declara cubierto. La aplicación literal de `FT-1` sobre v27 no se ha ejecutado; cualquier
ajuste del dataset exige enmienda aprobada (D5) y no se infiere aquí.

`[CONFIRMADO]` D5 fija `FT-1` como dataset único de esta entrega. D7 mantiene `FT-1 v1`
sin cierres ni fotografías y reserva `FT-2` para una ampliación independiente. Ampliar
`FT-1` exige nueva versión del dataset y revisión de manifiesto; no se amplía «al vuelo»
en el VPS.

### 4.6 Determinismo e idempotencia

- IDs deterministas por los contadores de la app al partir de un estado limpio; claves de
  idempotencia fijas derivadas del dataset (por ejemplo `seed-ft1-<entidad>-<n>`), no
  aleatorias.
- Fechas civiles y de hechos fijas; ninguna fecha futura respecto al día de ejecución, para
  no depender del reloj ni de las guardas de Movimientos.
- El manifiesto incluye checksums lógicos por tabla sobre columnas seleccionadas, excluyendo
  `audit.instante`, sesiones, desafíos, intentos, idempotencia y marcas de tiempo de fila.
  **No** se promete igualdad byte a byte del archivo SQLite: WAL, orden físico y auditoría
  cambian legítimamente.
- Un segundo `apply` con el mismo manifiesto y checksums → `0` sin escrituras. Marcador
  ausente con datos → rechazo. Checksums distintos → `drift`, sin reparación automática.
- `[PROPUESTA]` Atomicidad: si Bun/`bun:sqlite` no demuestra transacciones anidadas seguras
  entre servicios, el seed **no** afirma atomicidad total. En fallo escribe un marcador de
  fallo con el paso alcanzado y exige `reset`; nunca declara éxito parcial.

### 4.7 Secuencia de creación

1. Operador autorizado detiene cualquier unidad TEST y confirma que el `state` no existe.
2. `production-init` crea DB+clave limpias (sin usuario, sin fixtures).
3. `seed init` valida y escribe el marcador TEST.
4. `seed apply` crea `FT-1` con servicios, escribe `seed-manifest.json` y verifica.
5. `seed verify` compara manifiesto y estado; el resultado se registra en el expediente.
6. `setup` crea el propietario; el token se entrega por archivo `0600` y se elimina tras uso.
7. Se crea la copia cifrada de línea base y se copia fuera del VPS.
8. Solo entonces se publica frontend y se habilita Caddy/DNS.

### 4.8 Reset reproducible

`[PROPUESTA]` `seed reset`:

1. Vuelve a validar entorno, marcador, ruta y permisos; rechaza si el health de
   `127.0.0.1:18082` responde o si el operador no confirma que la unidad está parada.
2. Renombra `<data-root>/state` a `<data-root>/reset/state-<UTC>` (creación exclusiva, sin
   sobrescribir) y sincroniza el directorio padre. El archivo es evidencia, no se borra
   automáticamente.
3. **No** recrea ni siembra por sí mismo: imprime la secuencia `production-init → seed →
   setup` para ejecutarla como tareas separadas y autorizadas.

Nunca toca una ruta fuera de `<data-root>`, nunca borra copias cifradas y nunca reutiliza
un `state` archivado. La retirada de `reset/` requiere inventario e autorización.

`[EXCEPCIÓN APROBADA 2026-11-08]` El usuario aprueba **aplazar `seed reset` para después de
la primera activación de TEST**. Consecuencias vinculantes:

- `seed reset` **no** se implementa en el primer incremento de FT-1/`I2`, y `AC07` queda
  **`UNRUN`**, no exento ni sustituido.
- El primer `seed apply` solo se ejecuta sobre un estado limpio, vacío y verificado; si el
  marcador no está limpio o el estado es parcial/ajeno, el CLI **rechaza** y no repara.
- Queda prohibido sustituir `reset` por scripts destructivos improvisados, borrado manual
  de estado o reutilización de un `state` archivado.
- La ausencia de `reset` impide declarar SPEC34 aceptada en su totalidad; el resto de AC
  conserva su estado propio.
- El reset seguro (archivado con preflight de unidad parada) se prepara como incremento
  posterior, sin bloquear el bootstrap de TEST.

### 4.9 Verificación posterior

| Nivel | Comprobación |
| --- | --- |
| Manifiesto | `seed verify --expected-manifest-sha256` → `0`; sin drift |
| SQL de solo lectura | `PRAGMA integrity_check=ok`, `foreign_key_check` vacío, `schema_version=27`, contrato `C27-E411-FOTOS-PERIODO`, conteos e IDs del manifiesto y tablas C25–C27 vacías |
| API | Con sesión MFA: `GET /api/saldos`, `/api/movimientos`, `/api/ciclos`, `/api/deudas`, `/api/presupuestos` devuelven los IDs ficticios esperados; sin sesión, `401` |
| UI | Saldos, Movimientos, Ciclos, Deudas y Presupuesto muestran `FT-1` sin errores ni datos ajenos |
| Aislamiento | Sin datos reales, sin Excel, sin bases importadas; `owner` solo existe tras `setup` |

La verificación **puede** usar SQL de solo lectura. La creación **no** puede usar SQL crudo
para saltarse servicios.

### 4.10 Prohibiciones explícitas

- Endpoint HTTP de seed, ruta oculta, flag de arranque o «modo demo» en producción.
- Inclusión de `tools/test-seed` o del dataset en la imagen de producción o en el frontend.
- Importación del Excel, de una base real, de un volcado o de cualquier fichero externo.
- Uso de `INSERT`/`UPDATE` crudos para crear entidades, contadores, auditoría o
  idempotencia, o desactivación de triggers/FK.
- Reutilizar el estado de PROD, copiarlo, montarlo o «limpiarlo» para TEST.
- Declarar PASS sin manifiesto, checksums y evidencia de ejecución.

## 5. Contrato de despliegue con vps-infra (solo interfaz)

`[CONFIRMADO]` La arquitectura del host, el usuario, las rutas, Caddy, DNS, UFW y el aprovisionamiento
pertenecen a `vps-infra`, cuyo contrato host vigente es el PR #9 (MERGED `901204c`,
`INFRA-TEST-01-HOST`). El PR #7 está cerrado y solo se conserva como antecedente. Esta
sección solo fija
la **interfaz** que MyFinanzas consume y entrega; no duplica detalles internos ni afirma
que existan en el VPS.

| Campo | Valor | Origen / estado |
| --- | --- | --- |
| `public_origin` | `https://test.myfinanzas.pp.ua` | Contrato del packet |
| `public_host` | `test.myfinanzas.pp.ua` | Contrato del packet |
| `caddy_upstream` | `127.0.0.1:18082` | Propuesta del packet; a fijar en el contrato host §11 |
| `api_container_port` | `3001` | `main.ts` |
| `api_bind_host` | `0.0.0.0` solo dentro del namespace | `server-config.ts` |
| `static_root` | `frontend/` del paquete verificado | `release.py` |
| `health_path` | `/api/health` → `200` `{"ok":true}` | `app.ts` |
| `protected_probe` | `GET /api/saldos` → `401` sin sesión | `app.ts` |
| `container_uid_gid` | `10001:10001`, `keep-id:uid=10001,gid=10001` | `Containerfile`, `runtime.py` |
| `data_mount` | raíz de datos completa → `/var/lib/myfinanzas:rw` | RUNBOOK |
| `state` | `state/database.sqlite` + `state/auth.key` | `private-state.ts` |
| `env` | `NODE_ENV=production`, `APP_ORIGIN`, `DATABASE_PATH`, `AUTH_KEY_PATH`, `API_BIND_HOST` | `main.ts`, `database.ts` |
| `image` | `sha256:<ID inmutable del manifiesto>`; `Pull=never` | `release.py` |
| `seed_image` | ID inmutable propio, solo tareas de seed; nunca en la unidad permanente | §4.2 `[PROPUESTA]` |
| `resources` | 1 GiB, 1 CPU, 128 pids, tmpfs 64 MiB | RUNBOOK |
| `secrets` | Ninguno en Git/PR/logs; `auth.key` solo archivo `0600`; identidad `age` fuera del VPS | RUNBOOK |
| `backup` | CLI de la misma imagen/UID, `age`, montaje separado; restore a destino nuevo | §3.5 |
| `rollback` | Solo al par exacto con prueba; si no, bloqueo y preservación | RUNBOOK, `compatibility.py` |

`[CONFIRMADO]` `infra/runtime.py:render` **no** es reutilizable tal cual para TEST: fija
`18081` y `APP_ORIGIN=https://myfinanzas.pp.ua`. La unidad TEST pertenece al contrato host
`vps-infra` PR #9 (MERGED `901204c`); la §6.3 del antecedente cerrado es solo referencia. Si
el contrato host requiere una CLI parametrizada, se aborda en su propio ciclo, no en esta
spec.

Obligaciones de MyFinanzas en la interfaz:

- Entregar imagen app, frontend y artefacto de seed verificados por manifiesto, con el
  mismo SHA y evidencia Rootless.
- No exigir al host que reconstruya, parchee o migre la aplicación.
- Documentar cualquier cambio de contrato (rutas, env, puertos, health, CLI) antes de que
  vps-infra actualice su unidad.
- No declarar desplegable un candidato sin los gates del RUNBOOK.

Obligaciones de vps-infra (referenciadas, no repetidas aquí):

- DNS `test`, TLS, cabeceras, backup de Caddy, recarga y rollback del sitio, UFW y usuario
  rootless, `linger`, rutas y permisos del host, montaje del estado, unidad y activación.
- No modificar `myfinanzas.pp.ua` ni su placeholder; no abrir `18082`, `3001` ni SQLite.
- Cargar el artefacto de seed solo para tareas efímeras y nunca referenciarlo en la unidad.

## 6. Separación de responsabilidades

| Elemento | Responsable | Límite |
| --- | --- | --- |
| Código, servicios, esquema, migraciones, `production-init`, `setup`, backup/restore | myfinanzas-app | No se reimplementan en vps-infra |
| Herramienta de seed, dataset `FT-1`, manifiesto y verificación | myfinanzas-app | Test-only; no se incluye en la imagen de producción |
| Release, SHA, manifiesto, Rootless, compatibilidad y rollback de aplicación | myfinanzas-app | Asociados al SHA exacto |
| Host, usuario, rutas, permisos, UFW, `linger`, Caddy, TLS, DNS | vps-infra | Requiere acceso autorizado y ruta administrativa |
| Unidad TEST, puerto `18082`, activación y logs operativos | vps-infra | Revisada contra el contrato de §5 en cada release |
| Frontend servido | myfinanzas-app (artefacto) + vps-infra (copia) | Solo el `frontend/` verificado; nunca Vite |
| Aprobación de spec, auditoría, provisioning, DNS, Caddy, deploy, seed, backup, reset y retirada | Usuario | Cada autorización es independiente |
| Revisión independiente de seguridad/arquitectura | Álex / QA | Recomendación, no autorización |

## 7. Criterios de aceptación

Todos son **documentales** hasta que se ejecuten en la fase indicada del
[test plan](34-infra-test-01-testplan.md). Estado inicial: `UNRUN`.

| ID | Criterio verificable |
| --- | --- |
| `INFRA-TEST-01-AC01` | La rama solo añade esta spec y su test plan; clasifica como `docs`; no toca código, workflow, `infra/`, VPS ni `vps-infra`; no hay merge ni deploy. |
| `INFRA-TEST-01-AC02` | El candidato es un SHA de 40 caracteres alcanzable desde `origin/test` (base de referencia `0d25be9`), con E4.6, E4.7 y E4.9–E4.11 integrados y esquema 27/C27; `FT-1` excluye sus módulos por D5/D7. La promoción a `main` es un merge explícito aprobado y no se deduce de este AC; cualquier cambio de base se registra. |
| `INFRA-TEST-01-AC03` | Existe un artefacto de seed test-only con manifiesto y checksum propios, construido desde el mismo SHA, y `tools/test-seed` **no** aparece en la imagen de producción. |
| `INFRA-TEST-01-AC04` | El seed rechaza origen distinto de TEST, marcador ausente/ajeno, ruta no canónica, symlink, permisos incorrectos, esquema no admitido, propietario existente y estado no vacío. |
| `INFRA-TEST-01-AC05` | Dos ejecuciones independientes desde estado limpio producen los mismos IDs, fechas, importes y checksums lógicos de `FT-1`. |
| `INFRA-TEST-01-AC06` | Un segundo `seed apply` con el mismo manifiesto termina en no-op sin escrituras; un estado parcial se rechaza sin reparación automática. |
| `INFRA-TEST-01-AC07` | `seed reset` archiva solo `<data-root>/state` de TEST, no toca PROD, no borra copias y deja una secuencia reproducible de recreación. |
| `INFRA-TEST-01-AC08` | `FT-1` solo usa funcionalidades presentes en la base v27; no crea cierres E4.9, históricos E4.5, resumen anual E4.7, reaperturas E4.10 ni fotografías E4.11; las tablas añadidas por C25–C27 quedan vacías. |
| `INFRA-TEST-01-AC09` | La verificación por manifiesto, SQL de solo lectura, API autenticada y UI coincide con `FT-1`; la creación pasó por servicios, no por SQL crudo. |
| `INFRA-TEST-01-AC10` | `release.py verify` pasa con commit y manifiesto esperados; imagen y frontend son del mismo SHA; se usa ID inmutable, nunca etiqueta móvil. |
| `INFRA-TEST-01-AC11` | La unidad TEST está `active`, salud 200, ruta protegida 401, UID 10001, bind correcto y límites 1 GiB/1 CPU/128 pids. |
| `INFRA-TEST-01-AC12` | HTTPS válido, HTTP→HTTPS, cookies `__Host-` Secure/HttpOnly/SameSite=Strict, `Origin` ajeno 403 y cabeceras CSP/noindex/nosniff/HSTS corto. |
| `INFRA-TEST-01-AC13` | `18082` solo escucha en loopback; `3001`, SQLite y la API no son accesibles desde fuera; Vite no está publicado; UFW no abre puertos nuevos. |
| `INFRA-TEST-01-AC14` | Copia cifrada local y externa verificadas; restauración aislada con MFA en destino nuevo; estado activo intacto; RTO observado registrado. |
| `INFRA-TEST-01-AC15` | El rollback de aplicación sin prueba del par exacto se bloquea y preserva datos; el rollback de Caddy vuelve al backup sin afectar al sitio raíz. |
| `INFRA-TEST-01-AC16` | No hay Excel, bases reales, exportaciones, credenciales ni datos personales en host, repo, logs o copias; solo `FT-1` identificable. |
| `INFRA-TEST-01-AC17` | El sitio `myfinanzas.pp.ua` y su registro DNS siguen respondiendo igual antes y después; solo se añadió el registro `test`. |
| `INFRA-TEST-01-AC18` | TEST respeta el presupuesto de disco acordado y mantiene los márgenes de espacio libre e inodos definidos por vps-infra. |
| `INFRA-TEST-01-AC19` | La retirada autorizada detiene la unidad, retira Caddy/DNS de TEST, deshabilita `linger` y preserva datos/copias; el dominio raíz queda intacto. |

`[CONFIRMADO]` AC01 describe la entrega documental original de SPEC34. La reconciliación de
2026-11-07 añade SPEC35 y la corrección documental de RUNBOOK; no altera AC01. AC02 y AC08
actualizan solo el anclaje de esquema/estado (v27/C27, E4.9–E4.11 integrados y exclusión
D5/D7), conservan su semántica y siguen `UNRUN`; ningún AC se convierte en `PASS`.

## 8. Fases, autorización y rollback

`[PENDIENTE]` Cada fase exige autorización **separada y explícita**; ninguna se deduce de
la anterior. El detalle operativo, la evidencia y el owner están en el
[test plan](34-infra-test-01-testplan.md).

| Fase | Contenido | Autorización |
| --- | --- | --- |
| 0 | Aprobación de esta spec y del test plan; D7 | **Aprobada 2026-11-04; D7 2026-11-05** |
| 1 | Auditoría de solo lectura del host, Caddy, DNS, Podman, puertos y disco | Usuario |
| 2 | Aprovisionamiento de usuario/rutas/`linger`/UFW | Usuario |
| 3 | Congelar SHA de `test`; construir y verificar release + seed; gate Rootless sobre el SHA | Usuario / CI |
| 4 | Inicializar estado, `seed init/apply/verify`, alta del propietario | Usuario |
| 5 | Cargar imagen, instalar y activar la unidad; publicar frontend | Usuario |
| 6 | DNS y Caddy; verificación HTTPS y aislamiento | Usuario |
| 7 | Smoke funcional con `FT-1`, backup local y externo | Usuario |
| 8 | Restauración aislada, rollback ensayado y bloqueo sin prueba | Usuario |
| 9 | Actualización y retirada | Usuario |

Rollback: si falla la app, se vuelve al par exacto release/imagen/esquema **solo** con
prueba reproducible; si no existe, se detiene, se preserva el estado y se decide entre una
release compatible o una reconstrucción de TEST con estado nuevo. Nunca se revierte el
esquema a la fuerza ni se reemplaza el estado activo por una copia.

## 9. Dependencias, riesgos y decisiones pendientes

### 9.1 Dependencias

| Dependencia | Estado | Efecto |
| --- | --- | --- |
| E4.9 / v25 | Integrado (`0176ffc`, #200) | Fuera de `FT-1` por D7; no se prueban cierres |
| E4.10 / v26 | Integrado I1–I8 (`70fa7c0`…`5ea79b9`) | Fuera de `FT-1` por D5/D7 |
| E4.11 / v27 | Integrado I1–I6 (`a658803`…`4da1516`); aceptación pendiente | Fuera de `FT-1` por D5/D7; `FT-2` reservado |
| E4.7 | Integrado (`0e89562`) | Fuera de `FT-1` por D5 |
| E4.5 / DT7 | Documentación/QA integradas (`a806fd9`); DEV no autorizado | Sin históricos ni transición de ejercicio |
| Flujo `feature/* → test → main` | Adoptado; `origin/test` y `origin/main` en `0d25be9`; `test` sin ruleset propio verificado | TEST consume `test`; promoción a `main` explícita y aprobada; verificar protección antes de habilitar tags |
| DT6 / T-BKP | Abierto para cierre real | Afecta a la activación productiva; TEST exige copia externa mínima |
| Flake SQLite **B3** | Investigado sin reproducción; pendiente Linux | Puede aparecer en el ensayo; no se oculta como PASS |
| Gate Rootless | Obligatorio por RUNBOOK | Sin SUCCESS sobre el SHA exacto no se despliega |
| Caddy real | Desconocido hasta auditoría | Sujeto a backup, `caddy validate` y rollback |
| DNS | Controlado por el usuario | Sin registro `test` no hay TLS ni entorno operativo |
| Datos ficticios | Diseño de esta spec | Sin seed reproducible no se activa Caddy |

### 9.2 Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Semilla que salta invariantes | Datos incoherentes o auditoría falsa | Usar servicios; verificar con manifiesto y SQL de solo lectura |
| Seed en entorno equivocado | Contaminación o pérdida | Marcador + origen + ruta + propietario + base vacía; fallo cerrado |
| Reset sobre PROD | Pérdida irreversible | Solo `<data-root>/state`; marcador TEST; archivado, nunca borrado |
| Deriva entre imagen app y seed | Dataset no reproducible | Mismo SHA, manifiesto conjunto, IDs inmutables |
| Imagen de seed en la unidad permanente | Superficie innecesaria | Unidad solo con la imagen app; verificación de inventario |
| VPS 2 vCPU/4 GB/40 GB | Disco o contención | Límites 1 GiB/1 CPU/128 pids y presupuesto de vps-infra |
| Login TEST público | Fuerza bruta | MFA, límites de app, `noindex`; allowlist de borde si D5 lo decide |
| Configuración real de Caddy | Interrupción del sitio raíz | Auditoría, backup, validación y rollback |
| Copia externa inexistente | Sin recuperación real | Bloqueo de activación hasta destino aprobado |
| Promoción `test → main` sin protección de rama | Un commit no probado alcanza `main` | Gate explícito, CI `required` y aprobación de merge; verificar ruleset de `test` antes de habilitar tags |
| Deriva documental con vps-infra | Unidad incoherente | §11 y revisión campo a campo por release |

### 9.3 Decisiones pendientes

| ID | Decisión | Recomendación | Estado |
| --- | --- | --- | --- |
| D1 | Entrega del seed: imagen test-only vs herramienta en host con Bun fijado | Imagen test-only desde el mismo commit | `[APROBADA 2026-11-04]` |
| D2 | Identificación de TEST: solo `APP_ORIGIN`/env vs marcador + origen + manifiesto | Marcador `test-instance.json` + origen exacto | `[APROBADA 2026-11-04]` |
| D3 | Orden seed/alta: seed antes de `setup` vs después | Antes del alta, para exigir ausencia de propietario | `[APROBADA 2026-11-04]` |
| D4 | Reset: truncado lógico vs archivar `state` y recrear | Archivar y recrear con `production-init` | `[APROBADA 2026-11-04]` |
| D5 | Alcance del dataset: `FT-1` fijo vs ampliación por módulos | `FT-1` fijo; ampliar exige versión nueva | `[APROBADA 2026-11-04]` |
| D6 | Unidad TEST: nuevo entregable host de vps-infra vs parametrizar `runtime.py:render` | Nuevo entregable host mientras `render` siga fijando PROD/18081; cubierto hoy por el contrato host PR #9 (`901204c`) | `[APROBADA 2026-11-04]` |
| D7 | Cobertura de E4.9: `FT-1` sin cierres/fotos vs `FT-2` | Mantener `FT-1 v1` sin cierres ni fotografías; tablas C25–C27 vacías; compatibilidad con v27 a verificar por AC08/AC09; `FT-2` reservado a una ampliación independiente con E3.5/FIN_NETA y DT6/backup resueltos | `[APROBADA 2026-11-05; PR #229 CLOSED]` |

## 10. Fuera de alcance

- Cualquier cambio de código, tests, esquema, migraciones, `apps/`, infraestructura
  ejecutable de `infra/` o workflows.
- DEV del seed, de la imagen test-only o de la parametrización de `render`.
- Acceso al VPS (incluida auditoría), DNS, Caddy, UFW, SSH, Podman o systemd reales.
- Despliegue, activación, actualización, reinicio o retirada reales.
- PROD, promoción `test`→`main` o de TEST a PROD, datos reales, Excel, importación o
  migración operativa.
- Merge de esta spec o de cualquier PR derivada.
- Multiusuario, registro público, recuperación administrativa o bypass de MFA.
- Rate limit de borde, allowlist o Basic Auth (decisión D5 de vps-infra).
- Monitorización residente nueva, scheduler, retención 7/4/3 o SLA/RPO/RTO de producción.
- Certificación de seguridad, WCAG, carga o alta disponibilidad.

## 11. Coordinación con vps-infra y contrato host

`[CONFIRMADO]` `vps-infra` PR #7 está **CLOSED** desde el 2026-11-04T18:20Z, sin merge y con
la rama remota eliminada. Se conserva únicamente como **antecedente histórico cancelado**; no
es contrato vigente, dependencia activa ni aprobación.

`[CONFIRMADO]` El contrato host de TEST es `vps-infra` PR #9 (**MERGED** `901204c`, 2026-11-05,
`INFRA-TEST-01-HOST`). Su ciclo SPEC → revisión → aprobación → operaciones y la autorización
de cada operación en el VPS pertenecen a `vps-infra`; este repositorio no los ejecuta ni los
infiere. El contrato host recoge, y debe mantenerse alineado con:

1. **D6 — datos ficticios reproducibles.** Artefacto test-only, dataset `FT-1`, marcador
   TEST, manifiesto/checksums, guardas, reset archivado y verificación; enlazar esta spec.
2. **Estado de partida.** Base `origin/test` `0d25be9`; esquema 27/C27; E4.9, E4.10 y
   E4.11 integrados; `FT-1` excluye sus módulos por D5/D7; el seed no está implementado.
3. **Secuencia.** `production-init → seed init/apply/verify → setup`.
4. **Rutas y estado.** `<data-root>/test-instance.json` y
   `<data-root>/reset/state-<UTC>` con `0600`/`0700` y su efecto en disco.
5. **Artefacto de release.** Segundo ID inmutable de seed, solo tareas efímeras y prohibido
   en la unidad permanente.
6. **AC de datos ficticios.** `seed verify` y checksums, no solo inspección visual.
7. **AC nuevos.** Guardas, determinismo, idempotencia y reset sin tocar PROD, mapeados a
   `INFRA-TEST-01-AC04…AC09`.
8. **`render-unit`.** No usar la CLI de la app para TEST mientras fije `18081` y el origen de
   PROD; la parametrización, si procede, es trabajo posterior del contrato host.
9. **Test plan host.** El suyo propio, con autorizaciones por fase; no sustituye este test
   plan documental.

## 12. Trazabilidad y límites de las afirmaciones

- `[CONFIRMADO]` Los hechos de §2 proceden del checkout local y de la API de GitHub; no de
  una inspección del VPS.
- `[PROPUESTA]` El seed, `FT-1`, el marcador, el manifiesto, el reset y el artefacto
  test-only son diseño, no implementación.
- `[CONFIRMADO]` D1–D7, la spec y el test plan están aprobados; cada fase conserva
  autorización separada y ninguna se ejecutó.
- Ningún PASS se hereda de otras entregas. `UNRUN` no es PASS ni FAIL.
- Las rutas de host citadas (`/srv/myfinanzas-test`, `/var/www/myfinanzas-test`) son
  propuestas heredadas del antecedente cerrado; no son directorios verificados ni un contrato vigente.
- La aprobación de esta spec no autoriza DEV, VPS, DNS, Caddy, deploy, datos reales ni merge.
- La reconciliación de 2026-11-07 es documental: no crea tags, workflows, credenciales,
  releases ni seed, y no declara TEST operativo.
