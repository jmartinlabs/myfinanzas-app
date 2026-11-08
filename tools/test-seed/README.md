# FT-1 · seed TEST mínimo (v27)

Herramienta **test-only**. No se importa desde `apps/api/src/main.ts`, `apps/api/src/app.ts`,
ni desde el `Containerfile` de producción, y no expone endpoints. Crea datos ficticios con
los servicios y validaciones existentes de la aplicación; no escribe entidades, contadores,
auditoría ni idempotencia con SQL crudo.

## Estado de esta entrega

- Base: esquema **27** y contrato **C27-E411-FOTOS-PERIODO**.
- Contrato de datos declarado: **e4.11-v27**.
- Dataset: `FT-1`, versión `1`, fichero `dataset/ft1.json`.
- Comandos: `init`, `apply`, `verify` y `status`.
- Imagen test-only `infra/Containerfile.seed`, construida por `infra/release.py` desde el
  mismo commit, base y lock que la app; `source.seed_image` registra su ID inmutable.
- **No** incluye `reset` (H11) ni backup/restore.
- Los tests viven en `apps/api/src/test-seed-ft1.test.ts` para que el comando canónico
  `bun test apps/api` los ejecute.

## Requisitos previos

1. Estado productivo limpio creado por `production-init` (identidad `production`, usuario
   vacío, solo `S000`).
2. `NODE_ENV=production`.
3. `APP_ORIGIN` exacto: `https://test.myfinanzas.pp.ua`.
4. `DATABASE_PATH=<data-root>/state/database.sqlite` y
   `AUTH_KEY_PATH=<data-root>/state/auth.key`, ambos absolutos y canónicos.
5. `<data-root>` y `<data-root>/state` en `0700`, DB y clave en `0600`, mismo UID efectivo,
   sin symlinks. La comprobación no repara permisos.
6. El esquema debe ser exactamente 27. El seed **no migra** versiones 24/25/26/28 ni repara
   una base desconocida.

## Operación

```sh
export NODE_ENV=production
export APP_ORIGIN=https://test.myfinanzas.pp.ua
export DATABASE_PATH=/var/lib/myfinanzas/state/database.sqlite
export AUTH_KEY_PATH=/var/lib/myfinanzas/state/auth.key

# 1. Validar y escribir test-instance.json (no escribe datos financieros)
bun tools/test-seed/cli.ts init \
  --data-root /var/lib/myfinanzas \
  --seed-commit "$SEED_COMMIT" \
  --seed-image "$SEED_IMAGE"

# 2. Aplicar FT-1 con servicios; publica seed-manifest.json
bun tools/test-seed/cli.ts apply \
  --data-root /var/lib/myfinanzas \
  --seed-commit "$SEED_COMMIT" \
  --seed-image "$SEED_IMAGE"

# 3. Recalcular checksums y comparar marcador/manifiesto/estado
bun tools/test-seed/cli.ts verify \
  --data-root /var/lib/myfinanzas \
  --expected-manifest-sha256 "$SEED_MANIFEST_SHA256" \
  --seed-image "$SEED_IMAGE"

# 4. Informe no secreto (sin rutas completas)
bun tools/test-seed/cli.ts status --data-root /var/lib/myfinanzas
```

`init` y `apply` reciben `--seed-commit` (SHA-40) para la procedencia del manifiesto. No
aceptan ficheros, stdin, `--from`, Excel, SQL externo ni datos de entorno para el dataset.

En un contexto de release, el operador debe pasar `--seed-image sha256:<64 hex>` con el ID
inmutable del manifiesto de release. `init` lo guarda en el marcador, `apply` en
`source.seed_image` y `verify` lo compara; si el manifiesto declara imagen seed, `verify`
exige el flag y rechaza cualquier ID distinto. Sin release (uso local/unitario) el flag es
opcional y el manifiesto registra `null`.

Con la imagen test-only, el `ENTRYPOINT` es `bun`, así que los argumentos del CLI se pasan
como comando del contenedor:

```sh
podman run --rm --pull=never --http-proxy=false --network=none \
  --userns=keep-id:uid=10001,gid=10001 --user=10001:10001 \
  --cap-drop=all --security-opt=no-new-privileges --read-only \
  --volume=/ruta/privada/data:/var/lib/myfinanzas:rw \
  --env=NODE_ENV=production --env=APP_ORIGIN=https://test.myfinanzas.pp.ua \
  --env=DATABASE_PATH=/var/lib/myfinanzas/state/database.sqlite \
  --env=AUTH_KEY_PATH=/var/lib/myfinanzas/state/auth.key \
  "$SEED_IMAGE" tools/test-seed/cli.ts verify \
  --data-root /var/lib/myfinanzas --seed-image "$SEED_IMAGE"
```

### Códigos de salida

| Código | Significado |
| --- | --- |
| `0` | Éxito, no-op idempotente o informe de estado |
| `2` | Rechazo de guarda (entorno, marcador, ruta, permisos, esquema, propietario, estado no vacío) |
| `3` | Drift, estado parcial, manifiesto ajeno/ausente o verificación fallida |
| `1` | Error técnico o fallo durante `apply` (se registra `seed-failure.json`) |

`status` imprime JSON estable. `verify`/`apply`/`init` no imprimen rutas privadas completas,
claves, tokens ni contenido financiero.

## Idempotencia y estado

- `init` es no-op `0` si `test-instance.json` ya existe con el mismo contenido. Rechaza un
  marcador ajeno o un estado ya aplicado.
- `apply` comprueba primero marcador + manifiesto + checksums. Si coinciden, termina `0`
  **sin abrir conexión de escritura ni comprobar propietario**. Si no coinciden, devuelve `3`
  sin reparar.
- Un estado parcial (solo marcador, solo manifiesto, manifiesto ausente o hash distinto) se
  rechaza con `3` y permanece intacto.
- Un `seed-failure.json` previo detiene cualquier reintento con `3`. En esta entrega no hay
  `reset`; la recuperación exige una operación autorizada posterior o el archivado manual
  por el operador. No se borra ni se repara automáticamente.
- `verify` y `status` abren la base en solo lectura. Las comprobaciones de estructura y
  checksums usan `SELECT`/`PRAGMA`; la creación pasa únicamente por servicios.

## Dataset FT-1 v1

Resumen (nombres y fechas ficticios; todos los importes son EUR):

| Área | Contenido |
| --- | --- |
| Saldos | `S000` técnico + `S001`…`S005`; incluye `S002` Efectivo/Inversiones y `S005` Inversión/Inversiones |
| Clasificación | `CAT001`, `CAT002`; `SUB001`…`SUB003`; `PAR001`…`PAR004` |
| Presupuesto | `PRE001` (Gasto real → `S001`) |
| Deuda | `D001` (apertura 1200.00, TIN 5.000000, TAE 5.116190, cuota 150.00) |
| Ciclo | `1`, inicio `2025-01-20`, comida inicial 300.00; sin cierres |
| Referencias | `REF001` Anticipo y `REF002` Vehículo, con fichas 1:1 |
| Movimientos | `1` Ingreso, `2` Gasto, `3` Transferencia, `4` Amortización, `5` Gasto, `6` Transferencia de Anticipo |
| Inversión | `I1001` instrumento; compra `1` el `2025-02-25` por 100.00 desde `S002` a `S005` |
| Nómina | omitida (H2) |
| Gasto compartido | omitido (H6) |

Todas las fechas de hecho son ≤ `2025-12-31`. El ancla lógica es
`2025-12-31T12:00:00.000Z`; no se usa el reloj de pared ni aleatoriedad. Las claves de
idempotencia son fijas (`seed-ft1-<entidad>-<n>`).

## Decisiones de alcance de este incremento

### H1 — cinco Saldos

Se crean cinco altas, no cuatro. Una Compra exige un Saldo `Efectivo/Inversiones` y otro
`Inversión/Inversiones`; `S002` y `S005` satisfacen esa validación. `S000` permanece intacto
y solo actúa como contraparte técnica de Ingreso/Gasto.

### H2 — Nómina omitida

`confirmPayroll` genera un ID `PAGA-<randomUUID>`, incompatible con el determinismo. En esta
entrega se omite la nómina; el movimiento 1 (Ingreso con subtipo `Nómina`) no tiene
asignación de nómina. **Cobertura parcial E3.1**, sin SQL crudo ni ID inventado.

### H6 — Gasto compartido retirado

La opción menos invasiva es retirar la ficha compartida: añadir `CAT013` exige que el
contador de categorías llegue a 13, lo que obligaría a crear once categorías ficticias
adicionales. Se omite `CAT013`, la ficha compartida, sus participantes y la referencia del
movimiento 5. **Cobertura parcial E1.5/E3.2**; el movimiento 5 sigue siendo un Gasto normal
bajo `PAR003`. Consecuencia de IDs: al no crearse la ficha compartida, las referencias
generadas son `REF001` (Anticipo) y `REF002` (Vehículo); el slug «REF001 compartido» del
paquete anterior no existe.

### H11 — `reset` aplazado (excepción aprobada 2026-11-08)

`seed reset` se aplaza a después de la primera activación de TEST (ver SPEC34 §4.8). El CLI
solo expone `init`, `apply`, `verify` y `status`; no se inventan health checks ni se consulta
`127.0.0.1:18082`. El primer seed solo se aplica sobre un estado limpio, vacío y verificado;
un estado parcial, ajeno o con marcador inválido se rechaza sin reparar. Un fallo deja
`seed-failure.json` y exige una decisión operativa posterior; no se sustituye por scripts
destructivos ni por borrado manual del estado.

### v27

El preflight verifica identidad productiva, pareja DB/clave y contrato admitido antes de
abrir la conexión de escritura. La versión debe ser exactamente 27; el seed no migra. El
manifiesto declara `schema=27`, `schema_contract=C27-E411-FOTOS-PERIODO` con su SHA-256 y
`data_contract=e4.11-v27`.

## Manifiesto, marcador y checksums

`seed-manifest.json` (0600) contiene:

- dataset, versión, SHA-256 del fichero y hash lógico canónico;
- commit, esquema, contrato y SHA del contrato, contrato de datos, Bun e ID inmutable
  `source.seed_image`;
- entorno TEST con rutas relativas `state/database.sqlite` y `state/auth.key`;
- IDs congelados, conteos, tablas vacías y checksums lógicos por tabla;
- reglas de exclusión y `created_at` fijado al ancla del dataset.

La forma completa, con valores de ejemplo no autoritativos, está en
[`seed-manifest.example.json`](seed-manifest.example.json).

`test-instance.json` (0600) identifica el entorno TEST y guarda el SHA-256 del manifiesto
efectivo. `apply` lo actualiza después de publicar el manifiesto; `init` lo crea con
`seed_manifest_sha256=null`. Esta es una desviación consciente de la idea de calcular en
`init` el hash del manifiesto efectivo: los checksums dependen del estado y se publican en
`apply`. El marcador y el manifiesto no contienen secretos.

Los checksums excluyen `owner`, autenticación, sesiones, desafíos, `idempotency`, todas las
`*_attempts`, `database_origin.key_hash`, marcas de tiempo (`instante`, `creado`,
`actualizado`, `creado_en`, `actualizado_en`) y los payloads de auditoría `anterior`/`posterior`.
Incluyen contadores, versión de esquema, origen de base y auditoría proyectada sin instantes,
incluido `audit.campos`: los arrays de campos auditados entran completos y los payloads de
presupuesto/deuda se normalizan eliminando recursivamente `creado`/`actualizado`, para que la
huella no dependa de marcas de tiempo. Manipular la auditoría cambia la huella y `verify`
falla con `Drift`. El manifiesto declara además las exclusiones de `audit.id`, `*_audit.id` y
los payloads `anterior`/`posterior`. La exclusión `*_audit.id` se aplica a las tablas
`*_audit`; **no** aplica a `movement_audit`, cuyo `id` sí entra en la huella (junto con
`revision`, `accion`, `motivo` y `actor`). No se promete igualdad byte a byte de SQLite.

## Qué falta para release

- `reset` (H11) y la resolución de H5 (backup/restore de manifiesto/marcador).
- Ejecutar `infra/smoke.py` sobre el par release+seed verificado en un host rootless
  autorizado; la evidencia local no sustituye CI ni el gate Rootless.
- Cobertura pendiente: E3.1 (H2), E1.5/E3.2 (H6), E2.1/E2.3/E2.4, E3.5/FIN_NETA y módulos
  excluidos por D5/D7.
- Autorizaciones G2–G7 y QA independiente. Esta entrega no declara PASS de release.
