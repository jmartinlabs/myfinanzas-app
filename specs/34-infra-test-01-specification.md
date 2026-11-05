# 34 — INFRA-TEST-01: entorno TEST reproducible con datos ficticios — Specification

Status: **APPROVED UPDATE 2026-11-05 — esquema 25/C25 y D7 aprobados; D1–D6 siguen vigentes.**
No autoriza DEV, implementación del seed, construcción de releases, acceso al VPS, DNS, Caddy,
despliegue, datos reales, migraciones operativas ni merge.
Approval source/date: usuario, 2026-11-05 («Apruebo la actualización de SPEC34 y su test plan
para el esquema 25/C25, así como la decisión D7»); aprobación original 2026-11-04.
Base: `main` `a8e526b4d8a9115af985c4c05905bca25f76c938` (2026-11-05); E4.9 mergeado
(`0176ffc`, PR #200); `schemaVersion=25` (`C25-E49-CIERRE-FINANCIERO`).
Documentos relacionados: [antecedente histórico cancelado de vps-infra, PR #7](https://github.com/jmartinlabs/vps-infra/pull/7) (CLOSED, no mergeado),
[runbook de operación](../infra/RUNBOOK.md), [preparación de despliegue](../infra/README.md),
[27 — E4.9 cierre financiero](27-e49-cierre-financiero-specification.md),
[host TEST vps-infra PR #9](https://github.com/jmartinlabs/vps-infra/pull/9),
[31 — SQLite en producción](31-sqlite-produccion-specification.md),
[32 — ejecución rootless](32-ejecucion-rootless-specification.md),
[seguridad](guidelines/security.md), [calidad](guidelines/quality.md) y
[tablero de épicas](epic-board.md).
Test plan: [34 — test plan](34-infra-test-01-testplan.md).

Las marcas `[CONFIRMADO]`, `[PROPUESTA]` y `[PENDIENTE]` distinguen hechos comprobados en
el repositorio o por consulta de solo lectura, diseño sometido a aprobación y cuestiones
sin decisión. Ninguna marca convierte una propuesta en autorización.

## 0. Resumen de la actualización (2026-11-05)

- **Base:** `main` `a8e526b`; E4.9 integrado y esquema 25/C25.
- **Cambio de esquema:** C25 es aditivo (4 tablas y 9 triggers); no modifica tablas previas.
- **Dataset:** `FT-1 v1` no cambia; sigue sin cierres/fotos y exige las tablas v25 vacías.
- **Seed:** manifiesto, guardas y verificación se anclan a v25/C25 y a esas cuatro tablas a 0.
- **Release/Rootless:** release e imagen se reconstruyen desde el SHA con E4.9 y el gate se
  repite sobre ese SHA.
- **Fuera de alcance:** implementar el seed, migrar TEST desde 24, desplegar o tocar el VPS.
- **D7 aprobada:** mantener FT-1 v1 sin cierres; FT-2 solo para una ampliación independiente.

## 1. Objetivo y alcance

`[CONFIRMADO]` El objetivo es disponer de un entorno **TEST** accesible por
`https://test.myfinanzas.pp.ua` con **datos exclusivamente ficticios y reproducibles**,
sin PROD, sin exponer la API ni SQLite a Internet y sin interferir con el sitio
`myfinanzas.pp.ua` ni con el desarrollo en curso: E4.9/E4.7 integrados, E4.10 con SPEC28
ratificada sin DEV y E4.11 en borrador.

Esta especificación:

- define **el contrato de MyFinanzas** (imagen, runtime, estado, autenticación, copias y
  mecanismo de datos ficticios) y la **interfaz** que `vps-infra` consume;
- **no** repite la arquitectura interna del host, que pertenece a
  el nuevo entregable host de `vps-infra`; el PR #7 está cerrado y solo es antecedente;
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
2026-11-05. No se ha accedido al VPS, ni a su DNS, ni a su Caddy para esta spec. No se ha
ejecutado ninguna prueba de aplicación ni de infraestructura para esta spec.

| Hecho | Evidencia | Consecuencia para TEST |
| --- | --- | --- |
| `main` en `a8e526b4d8a9115af985c4c05905bca25f76c938` | `git rev-parse` local | Base documental; no es por sí sola el candidato de despliegue. |
| E4.6 integrado (`cfbedb0`, PR #201) | [tablero](epic-board.md) | El resumen de inicio existe en `main`. |
| E4.9 integrado (`0176ffc`, PR #200) | [tablero](epic-board.md) | Los cierres existen en la base; TEST puede usar el esquema 25. |
| `schemaVersion = 25` / contrato `C25-E49-CIERRE-FINANCIERO` | `apps/api/src/database-identity.ts`, `e49-schema-contract.test.ts` | La base y el seed se anclan a v25/C25. |
| C25 añade 4 tablas (`cierres`, `fotos_cierre`, `cierre_audit`, `cierre_attempts`) y 9 triggers; no modifica tablas previas | `e49-schema-contract.test.ts` («C25 only adds…») | FT-1 puede seguir sin cierres; las tablas nuevas deben quedar vacías y verificarse. |
| E4.5 QA APTO con DT7 abierto y DEV no autorizado; E4.7 integrado; E4.10 SPEC28 ratificada sin DEV; E4.11 en borrador | [tablero](epic-board.md) | Exclusión del dataset por D5, no por estado de desarrollo. |
| Runtime descrito en `infra/` | `Containerfile`, `runtime.py`, `release.py`, `RUNBOOK.md`, `migrations/`, `compatibility.py` | Contrato reutilizable, con las salvedades de §3 y §6. |
| API en `3001`, bind explícito `127.0.0.1`/`0.0.0.0` | `apps/api/src/main.ts`, `server-config.ts` | TEST publica en loopback del host y `0.0.0.0` solo dentro del namespace. |
| Esquema/estado productivo con pareja DB+clave y permisos estrictos | `private-state.ts`, `production-state.ts`, `database.ts` | Reutilizar tal cual; no crear estado desde el entrypoint. |
| `production-init`, `setup`, `backup-cli` como CLIs deliberadas | `production-init.ts`, `setup.ts`, `backup-cli.ts` | TEST los invoca como tareas efímeras, nunca como arranque normal. |
| `release.py` construye imagen + frontend con manifiesto y `--expected-commit` | `infra/release.py` | El candidato se verifica; no se usa etiqueta móvil. |
| `runtime.py:render` fija `18081` y `APP_ORIGIN=https://myfinanzas.pp.ua` | `infra/runtime.py` | **No** se usa sin cambios para TEST; ver D6. |
| `vps-infra` PR #9 con la spec host TEST, actualizada y en revisión | GitHub | Contrato host vigente propuesto; no autoriza despliegue. |
| `vps-infra` PR #7 **CLOSED** el 2026-11-04, sin merge y con rama eliminada | API de GitHub | Solo antecedente histórico. |

`[CONFIRMADO]` El antecedente cerrado usaba `origin/main` `0b8aade` y proponía
`D6: estado productivo limpio; datos ficticios manuales`. Esa formulación **no** cumple el
requisito de reproducibilidad de esta entrega; se recoge en §11 para el nuevo entregable host,
sin editar el repositorio ajeno.

`[CONFIRMADO]` El runbook de MyFinanzas mantiene el despliegue como **NOT deployable** y
exige el [gate Rootless](../infra/RUNBOOK.md#gate-obligatorio-de-rootless-previo-al-despliegue)
sobre el SHA exacto. Esta spec no rebaja ni sustituye ese gate.

`[CONFIRMADO]` El contrato funcional de E4.9/C25 pertenece a
[SPEC27](27-e49-cierre-financiero-specification.md); su cabecera conserva una base y un
esquema históricos y no se edita aquí. La reconciliación de esa cabecera corresponde al flujo
E4.9.

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
  inmutable (§4.2). El manifiesto de la app registra el par app+seed y el SHA del dataset;
  `release.py` aún no implementa ese campo y no se convierte en AC implícito.
- `[CONFIRMADO]` El candidato debe incluir E4.9 y el contrato C25; la release y el seed se
  reconstruyen desde el SHA exacto y el gate Rootless se ejecuta sobre ese SHA. No se reutiliza
  una release anterior a E4.9.

### 3.2 Runtime, red y UID

| Requisito | Valor | Evidencia |
| --- | --- | --- |
| Proceso | Bun 1.4.3, `apps/api/src/main.ts` | `Containerfile`, `main.ts` |
| Puerto interno | `3001` | `main.ts` |
| Bind interno | `API_BIND_HOST=0.0.0.0` solo dentro del namespace | `server-config.ts` |
| Publicación host | `127.0.0.1:18082:3001` | Propuesta del packet y §5; pendiente de la nueva spec host |
| UID/GID interno | `10001:10001` con `keep-id:uid=10001,gid=10001` | `Containerfile`, `runtime.py`, RUNBOOK |
| Rootfs | solo lectura, `TMPDIR=/tmp/private`, tmpfs 64 MiB noexec | `Containerfile`, RUNBOOK |
| Límites | 1 GiB RAM, 1 CPU, 128 pids | RUNBOOK, plantilla Quadlet |
| Privilegios | `cap-drop=all`, `no-new-privileges`, sin socket Podman, sin `:U` | RUNBOOK |
| Frontend | estático desde `frontend/` del paquete; Vite `5173` **no** se publica | `vite.config.ts`, README |

`[CONFIRMADO]` La app aplica migraciones versionadas del código al abrir un esquema admitido
(incluida 24→25); no crea estado si falta la pareja DB+clave, no siembra fixtures y falla en
`start-limit` si el esquema no es compatible. El **seed** evita ese camino en 24/26 mediante
inspección de solo lectura antes de abrir la conexión de la app.

### 3.3 Estado, clave y migraciones

- `DATABASE_PATH` y `AUTH_KEY_PATH` absolutos, canónicos, en el **mismo** directorio;
  directorio `0700` y archivos `0600` del UID efectivo; sin symlinks ni hardlinks.
- Se monta la **raíz de datos completa** en `/var/lib/myfinanzas`; nunca solo el archivo
  SQLite (se perderían WAL/SHM y la publicación conjunta).
- Migraciones solo mediante el código de la imagen y sobre un estado compatible; TEST no
  ejecuta migraciones operativas ni downgrades forzados.
- `[CONFIRMADO]` `production-init` crea una base v25/C25; el seed exige v25 y rechaza 24 o 26;
  no migra ni «arregla» el esquema. La comprobación se hace **antes** de abrir la conexión de
  la app: lectura en solo lectura de `schema_version`/contrato C25 y salida `2` si no coincide;
  nunca se llama a `openDatabase`/`prepareSchema` sobre una base 24/26.
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
- `[CONFIRMADO]` La copia incluye las tablas de cierre/foto de v25; el restore verifica
  integridad/FK y limpia intentos. La vacuidad de `cierres`, `fotos_cierre` y `cierre_audit`
  la comprueba `seed verify`/AC09, no el restore por sí solo.

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
| Manifiesto | `seed-manifest.json`: formato, dataset/versión, commit, `schema_version=25`, `schema_contract=C25-E49-CIERRE-FINANCIERO`, origen, lista de IDs, `empty_tables` (cierres/fotos/audit/attempts), checksums lógicos, `created_at` fuera de la huella | `seed verify` compara manifiesto, marcador y estado |
| Marcador | `<data-root>/test-instance.json` `0600`, escrito por la primera ejecución autorizada: `environment=test`, `public_origin`, `seed_manifest_sha256`, `schema_version` | Guard de entorno y de ruta (§4.4) |
| Registro privado | Resultado de cada seed/reset/verify en el expediente del operador, sin secretos | Evidencia del test plan |

`[CONFIRMADO]` D1 está aprobada: imagen test-only, porque hereda el pin de
Bun/dependencias, el rootfs endurecido y la trazabilidad del manifiesto, y evita depender de
un Bun instalado en el VPS. La implementación del artefacto sigue pendiente.

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
| 4 | Esquema | Inspección **en solo lectura** antes de abrir la app: `schemaVersion=25` y contrato `C25-E49-CIERRE-FINANCIERO`; 24/26 se rechazan con `2` sin migrar ni escribir |
| 5 | Sin propietario | En el primer seed, `owner` vacío; un propietario existente implica entorno reclamado o real → rechazo |
| 6 | Base vacía | `saldos=1` (solo S000), `movimientos=0`, `audit=0`, `cierres=0`, `fotos_cierre=0`, `cierre_audit=0`, `cierre_attempts=0` y sin `seed-manifest.json` previo |
| 7 | Sin importación | No acepta ficheros, stdin, `--from`, Excel, SQL externo ni datos de entorno |

`seed init` es la única orden que crea el marcador; el resto exige que ya exista. La
comprobación de idempotencia (marcador + `seed-manifest.json` + checksums coincidentes)
precede a las guardas 5–6: un entorno ya sembrado y reclamado por su propietario es un
**no-op** `0`, no un rechazo. Las guardas 5–6 solo se aplican a un seed nuevo.

`[PROPUESTA]` D3 fija el orden **production-init → seed → setup**. Sembrar antes del alta
permite exigir «sin propietario» como prueba de que el entorno no está reclamado; el alta
posterior crea la cuenta del propietario sobre datos ficticios ya verificados.

Si en cualquier momento aparece un dato real, un estado parcial, un propietario inesperado
o una ruta fuera de TEST: **detener, preservar y escalar**. No borrar, no reintentar a
ciegas y no convertir una base demo o de producción en TEST.

### 4.5 Dataset `FT-1`

`[PROPUESTA]` Conjunto fijo, pequeño y revisable, limitado a funcionalidades presentes en la
base `a8e526b`. Los nombres incluyen `TEST`; no se usan nombres, importes, fechas ni
identificadores de personas reales.

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

Exclusiones del dataset: cierres E4.9, primera fotografía, reaperturas E4.10, fotografías
consultables E4.11, históricos precontrol E4.5 y resumen anual E4.7. Tampoco se simulan
módulos futuros. Si un módulo no puede sembrarse con su servicio sin cambios de esquema,
se omite y se registra la omisión; **no** se crea por SQL crudo ni se declara cubierto.

`[CONFIRMADO]` C25 solo añade objetos de esquema: no altera tablas ni columnas previas. Pero
E4.9 **sí modificó servicios existentes** (guardas T1/T2/T3 en movimientos, compras, ventas,
saldos, referencias, deudas, clasificación, compartidos, instrumentos, planes, presupuestos y
`app.ts`). `FT-1` no crea cierres/fotos, por lo que las guardas deberían ser inertes, pero la
compatibilidad es `[PROPUESTA]` hasta ejecutar el seed con los servicios v25 y verificar que
las cuatro tablas quedan vacías (AC08/AC09). Incluir cierres/fotos exigiría `FT-2` y otra
aprobación; no se hace aquí.

`[PROPUESTA]` D5 fija `FT-1` como dataset único de esta entrega. Ampliarlo exige nueva
versión del dataset y revisión de manifiesto; no se amplía «al vuelo» en el VPS.

### 4.6 Determinismo e idempotencia

- IDs deterministas por los contadores de la app al partir de un estado limpio; claves de
  idempotencia fijas derivadas del dataset (por ejemplo `seed-ft1-<entidad>-<n>`), no
  aleatorias.
- Fechas civiles y de hechos fijas; ninguna fecha futura respecto al día de ejecución, para
  no depender del reloj ni de las guardas de Movimientos.
- El manifiesto incluye checksums lógicos por tabla sobre columnas seleccionadas, excluyendo
  `audit.instante`, sesiones, desafíos, intentos, idempotencia y marcas de tiempo de fila.
  Incluye las tablas v25 como vacías (`empty_tables`) y **no** promete igualdad byte a byte del
  archivo SQLite: WAL, orden físico y auditoría cambian legítimamente.
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

### 4.9 Verificación posterior

| Nivel | Comprobación |
| --- | --- |
| Manifiesto | `seed verify --expected-manifest-sha256` → `0`; sin drift |
| SQL de solo lectura | `PRAGMA integrity_check=ok`, `foreign_key_check` vacío, `schema_version=25`, conteos e IDs del manifiesto; `cierres`, `fotos_cierre`, `cierre_audit` y `cierre_attempts` a 0 |
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

### 4.11 Impacto del esquema 25 en TEST

`[CONFIRMADO]` El salto 24→25 es **aditivo a nivel de esquema**: añade las tablas `cierres`,
`fotos_cierre`, `cierre_audit` y `cierre_attempts`, y 9 triggers; no modifica tablas previas.
E4.9 también cambió servicios existentes con guardas T1/T2/T3, así que la compatibilidad de
FT-1 no se deduce solo del esquema. Consecuencias:

- `production-init` crea v25; el seed inspecciona en solo lectura antes de abrir la app y
  rechaza 24/26 con código `2`, sin migrar. Si se abriera la app sobre 24, la migraría; por eso
  el seed no usa `openDatabase`/`prepareSchema` en ese caso.
- `FT-1` no cambia: sigue excluyendo cierres/fotos y no usa SQL crudo para llenarlos.
- El manifiesto y la verificación incluyen `schema_version=25`, `schema_contract` y las
  cuatro tablas nuevas vacías.
- Release e imagen se reconstruyen desde el SHA que incluye E4.9; el gate Rootless se repite
  sobre ese SHA.
- No se usa el seed para migrar una base TEST desde 24: se crea nueva con `production-init`.
  La app sí migraría al abrir 24; el seed lo evita inspeccionando antes.

## 5. Contrato de despliegue con vps-infra (solo interfaz)

`[CONFIRMADO]` La arquitectura del host, el usuario, las rutas, Caddy, DNS, UFW y el
aprovisionamiento pertenecen a `vps-infra`. El contrato host propuesto está en
[vps-infra PR #9](https://github.com/jmartinlabs/vps-infra/pull/9), en revisión; no autoriza
despliegue. El PR #7 está cerrado y solo se conserva como antecedente. Esta sección solo fija
la **interfaz** que MyFinanzas consume y entrega; no duplica detalles internos ni afirma
que existan en el VPS.

| Campo | Valor | Origen / estado |
| --- | --- | --- |
| `public_origin` | `https://test.myfinanzas.pp.ua` | Contrato del packet |
| `public_host` | `test.myfinanzas.pp.ua` | Contrato del packet |
| `caddy_upstream` | `127.0.0.1:18082` | Propuesta del packet y de la spec host (PR #9) |
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
| `seed_image` | ID inmutable propio, solo tareas de seed; nunca en la unidad permanente | §4.2 `[PROPUESTA]`; contrato v25/C25 |
| `resources` | 1 GiB, 1 CPU, 128 pids, tmpfs 64 MiB | RUNBOOK |
| `secrets` | Ninguno en Git/PR/logs; `auth.key` solo archivo `0600`; identidad `age` fuera del VPS | RUNBOOK |
| `backup` | CLI de la misma imagen/UID, `age`, montaje separado; restore a destino nuevo | §3.5; incluye tablas v25 |
| `rollback` | Solo al par exacto con prueba; si no, bloqueo y preservación | RUNBOOK, `compatibility.py` |

`[CONFIRMADO]` `infra/runtime.py:render` **no** es reutilizable tal cual para TEST: fija
`18081` y `APP_ORIGIN=https://myfinanzas.pp.ua`. La unidad TEST debe definirla el nuevo
entregable host de `vps-infra` (la §6.3 del antecedente cerrado es solo referencia) o una CLI
parametrizada que aún no existe. D6 lo decide.

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
| `INFRA-TEST-01-AC01` | La rama solo modifica esta spec, su test plan y la fila `INFRA-TEST-01` del tablero; clasifica como `docs`; no toca código, workflow, `infra/`, VPS ni `vps-infra`; no hay merge ni deploy. |
| `INFRA-TEST-01-AC02` | El candidato es un SHA de 40 caracteres de `main` con E4.6 y E4.9 integrados, esquema 25/C25 y sin v26; E4.5/E4.7/E4.10/E4.11 fuera del dataset. Cualquier cambio de base se registra. |
| `INFRA-TEST-01-AC03` | Existe un artefacto de seed test-only con manifiesto y checksum propios, construido desde el mismo SHA, declara `schema_version=25`/C25 y `tools/test-seed` **no** aparece en la imagen de producción. |
| `INFRA-TEST-01-AC04` | El seed rechaza origen distinto de TEST, marcador ausente/ajeno, ruta no canónica, symlink, permisos incorrectos, esquema no admitido, propietario existente y estado no vacío. Un fichero v24 se inspecciona en solo lectura, se rechaza con `2` y **sigue en v24** sin escrituras. |
| `INFRA-TEST-01-AC05` | Dos ejecuciones independientes desde estado limpio producen los mismos IDs, fechas, importes y checksums lógicos de `FT-1`. |
| `INFRA-TEST-01-AC06` | Un segundo `seed apply` con el mismo manifiesto termina en no-op sin escrituras; un estado parcial se rechaza sin reparación automática. |
| `INFRA-TEST-01-AC07` | `seed reset` archiva solo `<data-root>/state` de TEST, no toca PROD, no borra copias y deja una secuencia reproducible de recreación. |
| `INFRA-TEST-01-AC08` | `FT-1` solo usa funcionalidades presentes en la base declarada; no crea cierres/fotos E4.9, históricos E4.5, resumen anual E4.7, reaperturas E4.10 ni fotografías E4.11; las cuatro tablas v25 quedan vacías. |
| `INFRA-TEST-01-AC09` | La verificación por manifiesto, SQL de solo lectura (`schema_version=25`, tablas v25 vacías), API autenticada y UI coincide con `FT-1`; la creación pasó por servicios, no por SQL crudo. |
| `INFRA-TEST-01-AC10` | `release.py verify` pasa con commit y manifiesto esperados; imagen y frontend son del mismo SHA (con E4.9/C25); se usa ID inmutable y el gate Rootless se ejecuta sobre ese SHA. |
| `INFRA-TEST-01-AC11` | La unidad TEST está `active`, salud 200, ruta protegida 401, UID 10001, bind correcto y límites 1 GiB/1 CPU/128 pids. |
| `INFRA-TEST-01-AC12` | HTTPS válido, HTTP→HTTPS, cookies `__Host-` Secure/HttpOnly/SameSite=Strict, `Origin` ajeno 403 y cabeceras CSP/noindex/nosniff/HSTS corto. |
| `INFRA-TEST-01-AC13` | `18082` solo escucha en loopback; `3001`, SQLite y la API no son accesibles desde fuera; Vite no está publicado; UFW no abre puertos nuevos. |
| `INFRA-TEST-01-AC14` | Copia cifrada local y externa verificadas; restauración aislada con MFA en destino nuevo; estado activo intacto; RTO observado registrado. |
| `INFRA-TEST-01-AC15` | El rollback de aplicación sin prueba del par exacto se bloquea y preserva datos; el rollback de Caddy vuelve al backup sin afectar al sitio raíz. |
| `INFRA-TEST-01-AC16` | No hay Excel, bases reales, exportaciones, credenciales ni datos personales en host, repo, logs o copias; solo `FT-1` identificable. |
| `INFRA-TEST-01-AC17` | El sitio `myfinanzas.pp.ua` y su registro DNS siguen respondiendo igual antes y después; solo se añadió el registro `test`. |
| `INFRA-TEST-01-AC18` | TEST respeta el presupuesto de disco acordado y mantiene los márgenes de espacio libre e inodos definidos por vps-infra. |
| `INFRA-TEST-01-AC19` | La retirada autorizada detiene la unidad, retira Caddy/DNS de TEST, deshabilita `linger` y preserva datos/copias; el dominio raíz queda intacto. |

## 8. Fases, autorización y rollback

`[PENDIENTE]` Cada fase exige autorización **separada y explícita**; ninguna se deduce de
la anterior. El detalle operativo, la evidencia y el owner están en el
[test plan](34-infra-test-01-testplan.md).

| Fase | Contenido | Autorización |
| --- | --- | --- |
| 0 | Aprobación de esta spec y del test plan | Aprobada 2026-11-04; **actualización 2026-11-05 aprobada** |
| 1 | Auditoría de solo lectura del host, Caddy, DNS, Podman, puertos y disco | Usuario; parcial en vps-infra 2026-11-05 |
| 2 | Aprovisionamiento de usuario/rutas/`linger`/UFW | Usuario |
| 3 | Construir y verificar release + seed; gate Rootless sobre el SHA | Usuario / CI |
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
| E4.9 / v25 | **Integrado** (`0176ffc`, PR #200); contrato C25 | TEST se ancla a v25/C25; FT-1 excluye cierres y verifica tablas vacías |
| E4.7 | Integrado (`0e89562`, #210) | Fuera del dataset por D5; no se prueba en TEST |
| E4.10 / E4.11 | E4.10 SPEC28 ratificada, DEV no autorizado; E4.11 borrador | Fuera del dataset y del smoke |
| E4.5 / DT7 | QA APTO; DT7 abierto; DEV no autorizado | Sin históricos ni transición de ejercicio |
| DT6 / T-BKP | Abierto para cierre real | Afecta a la activación productiva; TEST exige copia externa mínima |
| Flake SQLite **B3** | Investigado sin reproducción; pendiente Linux | Puede aparecer en el ensayo; no se oculta como PASS |
| Gate Rootless | Obligatorio por RUNBOOK | Sin SUCCESS sobre el SHA exacto no se despliega |
| Caddy real | 2.11.9 auditado, `hold`; bloque TEST pendiente (según vps-infra PR #9) | Sujeto a backup, `caddy validate` y rollback |
| DNS | Apex A/TTL 14400 conocido; `test` NXDOMAIN (según vps-infra PR #9) | Sin registro `test` no hay TLS ni entorno operativo |
| Datos ficticios | Diseño de esta spec | Sin seed reproducible no se activa Caddy |
| Actualización de SPEC34 | **Aprobada 2026-11-05** (`APPROVED UPDATE`) | Contrato v25 vigente; implementación pendiente |

### 9.2 Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Semilla que salta invariantes | Datos incoherentes o auditoría falsa | Usar servicios; verificar con manifiesto y SQL de solo lectura |
| Seed en entorno equivocado | Contaminación o pérdida | Marcador + origen + ruta + propietario + base vacía; fallo cerrado |
| Reset sobre PROD | Pérdida irreversible | Solo `<data-root>/state`; marcador TEST; archivado, nunca borrado |
| Deriva entre imagen app y seed | Dataset no reproducible | Mismo SHA, manifiesto conjunto, IDs inmutables |
| Tablas v25 no vacías por error del seed | FT-1 deja de ser mínimo y reproducible | Guarda 6 y verificación de las cuatro tablas a 0 |
| Guardas E4.9 en servicios usados por FT-1 | El seed puede fallar o cambiar datos | Ejecutar seed con servicios v25 y AC08/AC09; no asumir que son inertes |
| Release/Rootless anteriores a E4.9 | Imagen sin C25 | Reconstruir y ejecutar el gate sobre el SHA exacto |
| Imagen de seed en la unidad permanente | Superficie innecesaria | Unidad solo con la imagen app; verificación de inventario |
| VPS 2 vCPU/3,8 GiB/40 GB, 35 GB libres, inodos 3 % (según vps-infra PR #9) | Disco o contención | Límites 1 GiB/1 CPU/128 pids y presupuesto de vps-infra |
| Login TEST público | Fuerza bruta | MFA, límites de app, `noindex`; allowlist de borde si D5 lo decide |
| Configuración real de Caddy | Interrupción del sitio raíz | Auditoría, backup, validación y rollback |
| Copia externa inexistente | Sin recuperación real | Bloqueo de activación hasta destino aprobado |
| Deriva documental con vps-infra | Unidad incoherente | §11 y revisión campo a campo por release |

### 9.3 Decisiones

| ID | Decisión | Recomendación | Estado |
| --- | --- | --- | --- |
| D1 | Entrega del seed: imagen test-only vs herramienta en host con Bun fijado | Imagen test-only desde el mismo commit | `[APROBADA 2026-11-04]` |
| D2 | Identificación de TEST: solo `APP_ORIGIN`/env vs marcador + origen + manifiesto | Marcador `test-instance.json` + origen exacto | `[APROBADA 2026-11-04]` |
| D3 | Orden seed/alta: seed antes de `setup` vs después | Antes del alta, para exigir ausencia de propietario | `[APROBADA 2026-11-04]` |
| D4 | Reset: truncado lógico vs archivar `state` y recrear | Archivar y recrear con `production-init` | `[APROBADA 2026-11-04]` |
| D5 | Alcance del dataset: `FT-1` fijo vs ampliación por módulos | `FT-1` fijo; ampliar exige versión nueva | `[APROBADA 2026-11-04]` |
| D6 | Unidad TEST: nuevo entregable host de vps-infra vs parametrizar `runtime.py:render` | Nuevo entregable host mientras `render` siga fijando PROD/18081 | `[APROBADA 2026-11-04]` |
| D7 | Cobertura de E4.9 en FT-1: mantener FT-1 v1 sin cierres/fotos vs crear FT-2 | FT-1 v1 sin cierres ni fotografías; tablas C25 vacías; compatibilidad con servicios v25 a verificar por AC08/AC09; guardas rechazan esquemas ≠25 sin migrar; FT-2 reservado a una ampliación independiente con E3.5/FIN_NETA y DT6/backup resueltos | `[APROBADA 2026-11-05]` |

## 10. Fuera de alcance

- Cualquier cambio de código, tests, esquema, migraciones, `apps/`, `infra/` o workflows.
- DEV del seed, de la imagen test-only o de la parametrización de `render`.
- Acceso al VPS (incluida auditoría), DNS, Caddy, UFW, SSH, Podman o systemd reales.
- Despliegue, activación, actualización, reinicio o retirada reales.
- PROD, promoción de TEST, datos reales, Excel, importación o migración operativa.
- Merge de esta spec o de cualquier PR derivada.
- Multiusuario, registro público, recuperación administrativa o bypass de MFA.
- Rate limit de borde, allowlist o Basic Auth (decisión D5 de vps-infra).
- Monitorización residente nueva, scheduler, retención 7/4/3 o SLA/RPO/RTO de producción.
- Certificación de seguridad, WCAG, carga o alta disponibilidad.

## 11. Coordinación con vps-infra y nuevo entregable host

`[CONFIRMADO]` La parte host de TEST está en
[vps-infra PR #9](https://github.com/jmartinlabs/vps-infra/pull/9), actualizada y en revisión;
no está mergeada ni desplegada. El PR #7 de `vps-infra` está **CLOSED** desde el
2026-11-04T18:20Z y se conserva solo como antecedente histórico.

`[PROPUESTA]` El contrato host de PR #9 mantiene su propio ciclo SPEC → revisión →
aprobación → operaciones; este repositorio **no abre** esa tarea por inferencia. Debe recoger:

1. **D6 — datos ficticios reproducibles.** Artefacto test-only, dataset `FT-1` v1, marcador
   TEST, manifiesto/checksums con `schema_version=25`, guardas, reset archivado y verificación;
   enlazar esta spec.
2. **Estado de partida.** Base `main` `a8e526b` o candidato aprobado; E4.9/C25 integrado y
   esquema vigente 25.
3. **Secuencia.** `production-init → seed init/apply/verify → setup`.
4. **Rutas y estado.** `<data-root>/test-instance.json` y
   `<data-root>/reset/state-<UTC>` con `0600`/`0700` y su efecto en disco.
5. **Artefacto de release.** Segundo ID inmutable de seed, solo tareas efímeras y prohibido
   en la unidad permanente.
6. **AC de datos ficticios.** `seed verify` y checksums, no solo inspección visual.
7. **AC nuevos.** Guardas, determinismo, idempotencia y reset sin tocar PROD, mapeados a
   `INFRA-TEST-01-AC04…AC09`.
8. **`render-unit`.** No usar la CLI de la app para TEST mientras fije `18081` y el origen de
   PROD; D6 decide si se parametriza en un trabajo posterior.
9. **Test plan host.** El suyo propio, con autorizaciones por fase; no sustituye este test
   plan documental.

## 12. Trazabilidad y límites de las afirmaciones

- `[CONFIRMADO]` Los hechos de §2 proceden del checkout local y de la API de GitHub; no de
  una inspección del VPS. La auditoría y Caddy se documentan en `vps-infra` (PR #9 y cierre
  VPS-CADDY-UPGRADE-01).
- `[PROPUESTA]` El seed, `FT-1`, el marcador, el manifiesto, el reset y el artefacto
  test-only son diseño, no implementación.
- `[CONFIRMADO]` E4.9/C25 está integrado en `a8e526b`; la actualización de esta spec fue
  aprobada el 2026-11-05 (`APPROVED UPDATE`).
- `[CONFIRMADO]` La actualización y D7 fueron aprobadas el 2026-11-05; D1–D6 siguen aprobadas.
- `[PENDIENTE]` La implementación del seed, la construcción de release, el gate Rootless y
  todas las autorizaciones de fase. La aprobación documental no autoriza nada de eso.
- Ningún PASS se hereda de otras entregas. `UNRUN` no es PASS ni FAIL.
- Las rutas de host citadas (`/srv/myfinanzas-test`, `/var/www/myfinanzas-test`) son
  propuestas heredadas del antecedente cerrado; no son directorios verificados ni un contrato vigente.
- La aprobación de esta spec no autoriza DEV, VPS, DNS, Caddy, deploy, datos reales ni merge.
