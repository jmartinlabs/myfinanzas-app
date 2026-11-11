# 35 — DEPLOY-TAGS-01: despliegue mediante tags de GitHub — Specification

Status: **DISEÑO ACTUALIZADO 2026-11-11 — D3 CERRADA; IMPLEMENTACIÓN DEL DESPLIEGUE NO
AUTORIZADA.** Solo el preflight de crédito QA de §3 se implementa por la autorización del
2026-11-11; las fases 1–6 siguen sin autorización.
Decisión definitiva 2026-11-08: la creación de un tag `deploy-test-v*` o `deploy-prod-v*`
por un actor autorizado **es la orden de despliegue**. No hay aprobación por GitHub
Environments ni segunda aprobación, tampoco en PROD. Un Environment sin Required reviewers
puede usarse solo como frontera de secretos y reglas de tags. Los merges a `test` o `main` no despliegan. Se mantienen
protección e inmutabilidad de tags, restricción de actores, validación estricta de formato,
origen, commit y SHA, CI/QA/Rootless, compatibilidad de contratos, copias y smoke/rollback.
Reconciliación documental de origen y SHA (2026-11-07): `test` para TEST, `main` para PROD
futuro, gate TEST→main y SHA congelado de la base documental `0d25be9` (no candidato de
despliegue); no cambia las decisiones D1–D11 ni el formato/inmutabilidad de tags; actualiza el origen de TEST y añade la regla de SHA congelado. No autoriza crear
tags operativos, activar workflows de despliegue,
configurar credenciales o accesos al VPS, cambiar servicios, DNS, Caddy, Podman o firewall,
desplegar ni fusionar.
Approval source/date: usuario, 2026-11-05 (diseño de despliegue mediante tags; alcance
limitado a documentación y revisión técnica).
Base: `origin/test` `0d25be9a1ae97d1dc7e2d94dcf004641973b4b8c` (2026-11-07), igual que
`origin/main`; estado verificado `schemaVersion=27`/`C27-E411-FOTOS-PERIODO`. El diseño se
preparó sobre `baa673e`; desde entonces se integraron E4.10 (v26) y E4.11 (v27). Este
documento no posee el contrato de esquema ni fija el SHA de despliegue: ambos se declaran
por SHA y D11 sigue abierta para el seed y la release.
Documentos relacionados: [SPEC34 — entorno TEST](34-infra-test-01-specification.md),
[31 — SQLite en producción](31-sqlite-produccion-specification.md),
[32 — ejecución rootless](32-ejecucion-rootless-specification.md),
[RUNBOOK de release y operación](../infra/RUNBOOK.md),
[seguridad](guidelines/security.md), [calidad](guidelines/quality.md) y
[tablero de épicas](epic-board.md).

Las marcas `[CONFIRMADO]`, `[PROPUESTA]` y `[PENDIENTE]` distinguen hechos comprobados,
diseño derivado y cuestiones sin decisión. Ninguna marca convierte una propuesta en
autorización.

## 1. Objetivo y alcance

`[CONFIRMADO]` El objetivo es que la publicación de un tag de GitHub sea el disparador
controlado de un despliegue, preservando los gates existentes de CI, QA independiente,
Rootless, esquema, copia y recuperación. Se distinguen dos entornos:

- `deploy-test-v*` → TEST, automático solo cuando el sistema esté habilitado y hayan pasado
  todos los controles.
- `deploy-prod-v*` → PROD, automático solo cuando el sistema esté habilitado y hayan pasado
  todos los controles; sin aprobación adicional.

`[CONFIRMADO]` Esta spec posee la convención de tags, la validación de origen, la
orquestación de comprobaciones, la construcción o recuperación de la release, la promoción
TEST→PROD, el smoke de aplicación y la evidencia de aceptación. No posee el contrato del
host, que pertenece a `vps-infra`, ni la documentación de un patrón reutilizable para otros
repositorios, que es opcional y no forma parte de esta entrega.

`[PENDIENTE]` La aprobación de este diseño no autoriza su implementación. No existe ningún
tag operativo, workflow de despliegue, credencial, acceso al VPS ni automatización
habilitada por esta spec.

### 1.1 No objetivos

- Sustituir CI, QA, Rootless, backup/restore, aceptación funcional o autorización de merge.
- Convertir `main` en producción o declarar TEST operativo.
- Crear u operar la rama `test` ni cambiar su protección; la rama existe y el flujo
  adoptado se documenta en §6.
- Diseñar el host, sus usuarios, rutas, unidades, Caddy, DNS o copias.
- Importar datos reales, el Excel o migrar producción.
- Publicar secretos, claves, cookies, TOTP, bases o información financiera.

## 2. Estado de partida y relación con otros documentos

| Materia | Documento propietario | Relación con esta spec |
| --- | --- | --- |
| Entorno TEST, dataset `FT-1`, seed test-only, host TEST | [SPEC34](34-infra-test-01-specification.md) y su [test plan](34-infra-test-01-testplan.md) | Define qué se despliega en TEST y sus guardas; esta spec define cómo se dispara y promociona |
| Persistencia SQLite, identidad y copias | [SPEC31](31-sqlite-produccion-specification.md) | Conserva el contrato de estado, copia y restauración; no se duplica |
| Rootless, imagen, UID y gate previo | [SPEC32](32-ejecucion-rootless-specification.md) y [RUNBOOK](../infra/RUNBOOK.md) | El gate Rootless sigue siendo obligatorio; esta spec lo comprueba, no lo rebaja |
| Release, manifiesto, parada, rollback y copias | [RUNBOOK](../infra/RUNBOOK.md) | Fuente de la secuencia operativa; esta spec solo añade el disparador y la promoción |
| Recepción y activación en el host | `vps-infra` (contrato que mantenga su agente) | Interfaz de entrada/salida, aislamiento TEST/PROD, permisos y recuperación; esta spec no depende de una PR concreta |
| Patrón reutilizable (opcional) | Repositorio que decida adoptarlo; no es dependencia de esta entrega | Documentación opcional; no altera la orquestación de MyFinanzas |

`[CONFIRMADO]` El flujo adoptado es `feature/* → test → main`. `origin/test` y
`origin/main` apuntan a `0d25be9` (2026-11-07); `test` es el origen autorizado de TEST y
`main` el de PROD futuro. La base no tiene MyFinanzas desplegada, no hay datos reales y el
esquema se declara por SHA. El contrato del host pertenece a `vps-infra`; esta spec define
la interfaz esperada y no depende de una PR concreta de ese repositorio. Este diseño prepara
la activación automática cuando se habilite expresamente: sustituirá solo el disparador, no
los gates del host.

`[PENDIENTE]` **Dependencia de TEST.** [SPEC34](34-infra-test-01-specification.md) y su
[test plan](34-infra-test-01-testplan.md) se reconcilian documentalmente a v27/C27 y a
`origin/test` en esta misma entrega. El seed `FT-1` v27 no existe y el SHA de TEST no está
congelado. D11 sigue abierta: el primer tag de TEST no podrá habilitarse hasta que exista
el seed correspondiente al SHA congelado, la release verificada y la evidencia de prueba.
Este diseño no fija ese SHA ni sustituye la reconciliación.

`[PENDIENTE]` A 2026-11-07, `test` no tiene ruleset de protección propio (consulta de solo
lectura a la API de rulesets: solo `main-required`, id `25952058`, `enforcement` `active`);
el gate TEST→main no se presume impuesto
por GitHub hasta verificar y, en su caso, configurar la protección de `test` (D1).

## 3. Convención de tags

`[CONFIRMADO]` Se usan dos espacios de nombres:

```text
deploy-test-v0.1.0   → entorno TEST
deploy-prod-v0.1.0   → entorno PROD
```

`[PROPUESTA]` La validación, cuando se implemente, aceptará exactamente el formato SemVer
estable:

```text
^deploy-(test|prod)-v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$
```

No se admiten prefijos, sufijos, versiones incompletas, `latest`, metadatos de build ni
pre-releases sin una decisión separada (D10). El nombre del tag y la versión declarada en la
anotación/contrato de despliegue deben coincidir. El manifiesto actual de `release.py` no
declara versión de aplicación; la definición exacta de ese campo queda en D3.

Reglas:

- **Inmutabilidad.** Un tag publicado no se mueve, no se sobrescribe, no se borra y no se
  reutiliza. La protección efectiva se verifica en GitHub; no basta con documentarla.
- **Origen.** `deploy-test-v*` apunta a un commit concreto de `test`; `deploy-prod-v*`, a un
  commit concreto de `main` promovido desde `test`. Nunca a una rama móvil, un merge ref, un
  fork o un commit no alcanzable desde el origen autorizado del entorno.
- **SHA congelado.** El tag fija el SHA completo de 40 caracteres y el digest del manifiesto;
  un rebuild o una promoción debe conservar ambos. Un SHA de `test` no promovido a `main` no
  puede recibir un tag PROD.
- **Autor.** Solo un publicador autorizado crea tags. La protección de GitHub y la allowlist
  del workflow (`MYFINANZAS_DEPLOY_ACTORS`) se comprueban; ninguna de las dos se presume.
- **Sin aprobación duplicada.** La creación del tag por un actor autorizado es la
  autorización operativa. No se usan Required reviewers; un Environment `test` sin revisores
  puede aislar secretos y restringir el despliegue a tags autorizados.
- **Reintentos.** `[PROPUESTA]` Un fallo de validación antes de mutar puede reintentarse
  sobre el mismo tag, SHA y artefacto, aumentando el intento. Un artefacto distinto, un
  commit distinto o un cambio de gates exige un nuevo tag de versión, normalmente un patch.
- **Un despliegue exitoso por versión y entorno.** `[PROPUESTA]` No se vuelve a desplegar la
  misma versión ya activada; un redespliegue exige decisión y una versión nueva.
- **Anotación.** `[CONFIRMADO 2026-11-11]` El tag se crea anotado con un bloque no secreto
  que incluye versión, SHA, digest del manifiesto, contrato de esquema y, en TEST, el
  manifiesto de seed, además de
  `qa_reference=reviewed=<SHA40> integration=<SHA40> pr=<N> qa=<URL>`. `reviewed` es el
  commit revisado por QA independiente; `integration` es el commit del tag; `qa` enlaza la
  evidencia real (review, comentario de PR o comentario de commit) ligada a ambos. La
  evidencia debe acreditar un resultado favorable —review `APPROVED` o cuerpo con
  `qa=APTO`—; en comentarios de PR, además `reviewed=<SHA40>`. El workflow valida `sha=`,
  los campos de `qa_reference` y la equivalencia antes de construir la release; versión,
  digest, contrato de esquema y seed se verifican en las fases de release y esquema. La
  autoría de la evidencia se registra, pero la independencia sigue siendo un gate de
  proceso (D3, cerrada 2026-11-11).

`[CONFIRMADO 2026-11-11]` La creación del tag no es la autorización de merge ni la
aceptación funcional. Es una atestación del publicador; el workflow comprueba que el árbol
del commit del tag se compone exactamente del contenido revisado sobre su primer padre
(identidad de árbol o merge limpio) y que la referencia QA resuelve a un artefacto de
GitHub del PR y del commit revisado. La identidad de árbol no exime de las guardas: el
commit del tag debe cambiar el árbol y el commit revisado no puede estar ya contenido en la
base. La equivalencia de árbol no acredita la calidad de la QA ni sustituye
su aprobación: una divergencia, un conflicto resuelto, un cambio extra, un commit de
integración sin cambio de árbol, un `reviewed` ya contenido en la base de integración o una
evidencia no verificable exigen QA nueva. (D3 cerrada 2026-11-11.)

## 4. Flujo TEST

### 4.1 Disparador y validaciones previas

1. Publicación de un tag `deploy-test-v*` en el repositorio de la aplicación.
2. Validar nombre, repositorio, autor autorizado, objeto del tag y commit destino. Un valor
   ausente, ambiguo o no reconocido detiene el proceso.
3. Resolver el SHA completo de 40 caracteres y comprobar que es alcanzable desde
   `origin/test` para TEST (y desde `origin/main` para PROD). El SHA debe coincidir con el
   declarado en el tag. No se usa `HEAD` de una rama móvil ni un merge ref.
4. Comprobar que no existe un despliegue exitoso previo de la misma versión en TEST y que no
   hay otro despliegue activo en el entorno.

### 4.2 Gates obligatorios

| Gate | Comprobación | Si falta |
| --- | --- | --- |
| CI | Check requerido `SUCCESS` sobre el SHA exacto; no se hereda de otro commit | Detener; ejecutar la CI sobre ese SHA y reanudar el mismo run |
| QA | `qa_reference` con `reviewed=<SHA40>`, `pr=<N>` y `qa=<URL>`; la URL resuelve a una review, comentario de PR o comentario de commit ligado al commit revisado, y `scripts/check-evidence --qa-equivalence` demuestra que el árbol del tag es ese contenido | Detener; publicar la evidencia real del SHA revisado o repetir la revisión independiente |
| Rootless | Run `SUCCESS` del gate Rootless sobre el SHA exacto y coincidencia con la release | Detener; lanzar `Rootless infrastructure 32` sobre el SHA y reanudar |
| Release | Manifiesto verificado con `--expected-commit` y `--expected-manifest-sha256`; ID/digest inmutable; frontend del mismo paquete | Detener; no reconstruir silenciosamente otro artefacto |
| Esquema y seed | Contrato declarado por el manifiesto compatible con el estado TEST; manifiesto de seed y marcador TEST verificados (ver D11) | Detener antes de abrir la base |
| Copia y recuperación | Copia válida y plan de restauración aplicables; sin copia no se activa si existe estado | Detener |
| Entorno | Interruptor de TEST habilitado, credenciales TEST disponibles, bloqueo exclusivo adquirido | No tocar el VPS |

`[CONFIRMADO]` El gate Rootless se conserva tal como lo define el
[RUNBOOK](../infra/RUNBOOK.md#gate-obligatorio-de-rootless-previo-al-despliegue): SHA
completo, ejecución asociada, `SUCCESS` enlazado y coincidencia con la release. Que no sea
un check requerido del repositorio no lo hace opcional.

`[PROPUESTA]` Si falta una ejecución de CI o Rootless, el workflow puede solicitarla por
`workflow_dispatch` sobre el mismo SHA y esperar. Si no puede hacerlo con permisos mínimos,
se detiene y el operador la ejecuta; después reanuda el mismo run. No se crea un tag nuevo
para corregir una validación.

### 4.3 Construcción o recuperación del artefacto

- Si no existe un paquete verificado para el SHA, se construye desde ese SHA con
  `python3 infra/release.py build --ref <SHA40> --output <DIR_PRIVADO_NUEVO>` en un entorno
  de construcción controlado.
- Si ya existe, se recupera y se verifica; no se reconstruye por comodidad ni se acepta un
  paquete sin manifiesto.
- Se registran SHA, digest del manifiesto, ID de imagen, checksum o mapa de checksums del
  frontend (`frontend_files`) y contrato de esquema. Se selecciona la imagen por ID/digest
  inmutable, nunca por etiqueta.
- El paquete es privado y no se publica como artifact de CI sin una decisión que revise la
  política del [RUNBOOK](../infra/RUNBOOK.md) (D2). PROD no reconstruye un artefacto distinto
  del aprobado.

### 4.4 Despliegue y smoke

1. Comprobar el interruptor de habilitación de TEST. Desactivado significa no desplegar,
   aunque el tag sea válido.
2. Adquirir el bloqueo exclusivo del entorno; un segundo despliegue se rechaza.
3. Entregar al host el contrato de §3 de `vps-infra` (entorno, versión, SHA, digest,
   manifiesto, seed, esquema, copia y smoke). No se incluyen secretos en el contrato, la
   anotación del tag ni los logs; el workflow libera las credenciales del almacén autorizado
   solo después de validar tag, actor, origen, SHA y gates.
4. Ejecutar el perfil de smoke acordado: salud, ruta protegida sin sesión, frontend, `seed
   verify` y una lectura/escritura sintética autorizada. La autenticación completa se incluye
   solo si el perfil dispone de un usuario de prueba y un canal seguro para el TOTP; nunca se
   imprime el secreto.
5. Registrar resultado, SHA, digest, versión, copia, smoke y estado final en el run de GitHub
   y en el expediente privado existente. No se crea un registro público paralelo.
6. Un fallo antes de mutar deja el VPS intacto. Un fallo después de mutar detiene el proceso,
   preserva estado, copia y logs, y sigue el procedimiento de recuperación autorizado; no
   reintenta ni restaura automáticamente.

## 5. Flujo PROD

### 5.1 Disparador y promoción

1. Publicación de un tag `deploy-prod-v*`; mismas validaciones de nombre, autor, objeto y
   SHA que TEST; el origen autorizado es `main`, no `test`.
2. Verificar que la **misma versión, SHA y digest de manifiesto** superaron TEST con smoke
   correcto y evidencia registrada, y que el SHA está promovido a `main` desde `test` con
   aprobación explícita de merge. Si el artefacto de TEST no está disponible o difiere,
   detener; no reconstruir en PROD.
3. Verificar los controles específicos de producción: autorización de datos reales,
   DT6/T-BKP, copia y restauración ensayadas, migración autorizada si cambia el esquema,
   aceptación funcional aplicable y plan de rollback al par exacto. Los detalles siguen en
   [31](31-sqlite-produccion-specification.md), [32](32-ejecucion-rootless-specification.md),
   [RUNBOOK](../infra/RUNBOOK.md) y [seguridad](guidelines/security.md); esta spec no los
   duplica.
4. Preparar y revisar el plan de actualización y recuperación: release, esquema, copia,
   mantenimiento, smoke y vuelta atrás.

### 5.2 Ejecución automática

5. No hay aprobación por Environment. La creación del tag por un actor autorizado, con
   protección e inmutabilidad verificadas, es la orden de despliegue. Un Environment `test`
   sin Required reviewers solo aísla secretos y restringe el ref a los tags autorizados.
6. Antes de liberar credenciales de PROD se validan tag, actor, SHA, promoción, artefacto
   idéntico a TEST, backup/restore y contrato. Cualquier fallo detiene sin mutar.
7. Las credenciales PROD son distintas de TEST y se leen del almacén autorizado solo en la
   ejecución validada.
8. Se verifica el resultado, se ejecuta el smoke de producción y se registran evidencias.

`[CONFIRMADO]` La creación del tag constituye la autorización operativa de esa ejecución,
una vez que el sistema esté habilitado. No autoriza merges, desarrollo nuevo, importación de
datos reales ni una versión posterior. El actor queda registrado en el run y en el host.

### 5.3 Rollback y copias (reconciliado con el receptor)

- **TEST.** La release solo cambia imagen y frontend con el mismo contrato; el estado
  persistente no se toca. El par de rollback es unidad + enlace `current`, y se aplica
  automáticamente si el smoke falla. Si el smoke del rollback también falla, la unidad se
  detiene y se preserva todo para revisión.
- **PROD.** Antes de activar se exige copia cifrada e integridad verificada, y una
  restauración ensayada según SPEC31. La release app-only se revierte igual que TEST; una
  migración de esquema o datos no se revierte automáticamente y exige restaurar la copia con
  autorización separada.
- El receptor TEST implementado en `vps-infra` materializa el primer caso. El receptor PROD
  reutiliza la misma verificación y añade el gate de copia/restore antes de mutar.


## 6. Estrategia de ramas

`[CONFIRMADO]` Se adopta `feature/* → test → main`. `test` es la rama de integración y el
origen autorizado de TEST; `main` es el origen autorizado de PROD. Los tags
`deploy-test-v*` apuntan a commits de `test`; los `deploy-prod-v*`, a commits de `main`
promovidos desde `test`. **No se crea ninguna rama adicional.**

`[CONFIRMADO]` El gate TEST→main es un merge explícito de `test` a `main`, con aprobación de
merge separada y los checks requeridos sobre el SHA exacto; no es automático y no lo concede
un tag, un despliegue TEST ni este documento. La protección efectiva de `test` se verifica
antes de habilitar tags (D1). El commit promovido conserva SHA y digest; PROD no reconstruye
otro artefacto. La convención, la inmutabilidad y los controles de artefacto no cambian.

## 7. Seguridad y controles

| Requisito aprobado | Control de diseño | Evidencia esperada (UNRUN) |
| --- | --- | --- |
| Proteger tags y restringir creación/modificación | Ruleset/tag protection con actores autorizados, sin update/delete; comprobar la regla efectiva y los bypass | Consulta de solo lectura a GitHub y prueba negativa |
| Verificar SHA, procedencia y artefactos inmutables | Ancestro del origen autorizado (`test` o `main`), manifiesto, checksums e ID/digest; sin etiquetas móviles | Salida de verificación y manifiesto |
| Impedir despliegues concurrentes | Un lock por entorno y `cancel-in-progress: false`; rechazo del segundo | Run bloqueado y registro |
| Credenciales separadas y de mínimos privilegios | Principal TEST/PROD distinto, sin root, secreto en el almacén autorizado, no en Git | Configuración revisada y prueba de alcance |
| Sin aprobaciones duplicadas | Tag protegido e inmutable + allowlist de actores + validación estricta; Environment solo como frontera de secretos, sin revisores | Reglas efectivas y prueba negativa con actor no autorizado |
| No guardar claves ni secretos en repositorios o artefactos | Revisión de diff, manifiesto y logs; secretos efímeros; sin identidad privada `age` ni secreto TOTP en la release (el binario `age` verificado sí forma parte de la imagen) | Auditoría de contenido y permisos |
| No desplegar sin backup y recuperación validados | Precondición bloqueante; copia y restauración ensayadas; PROD con datos reales sujeto a DT6/T-BKP | Copia, restore y plan revisados |
| No reconstruir en PROD un artefacto distinto | Promoción por SHA y digest; si no coincide, se detiene | Comparación TEST/PROD |
| Un error de validación detiene sin modificar el VPS | Fase de preflight de solo lectura; fallo cerrado; sin reparación automática | Estado del host antes/después y logs |

Controles adicionales de implementación `[PROPUESTA]`:

- Permisos mínimos del workflow (`contents: read`, `actions: read`, `deployments: write` y
  `id-token` solo si se usa OIDC); nunca `write-all`.
- Acciones fijadas por SHA completo, `persist-credentials: false` y ningún
  `pull_request_target` en el flujo de despliegue.
- El nombre del tag y el SHA se tratan como datos no confiables: se validan con regex y se
  pasan por variables de entorno, nunca por interpolación directa en un shell.
- El token de GitHub no puede crear tags ni modificar reglas desde el workflow de despliegue.
- Los logs no incluyen cookies, TOTP, claves, rutas privadas, IPs internas ni datos
  financieros; la evidencia se conserva en el expediente privado.
- La release, el frontend y el seed viajan como conjunto; no se mezcla un `dist` de otra
  versión.

## 8. Distribución de responsabilidades

| Repositorio | Posee | Documentos/artefactos |
| --- | --- | --- |
| `myfinanzas-app` | Convención y validación de tags, workflows, verificaciones, release, promoción y aceptación; contrato de esquema del SHA | Esta spec, `infra/release.py`, `infra/RUNBOOK.md`, `validate.yml`, workflows de despliegue y contrato por SHA |
| `vps-infra` | Recepción y activación seguras, aislamiento TEST/PROD, privilegios, rutas, servicios, copias y recuperación | Contrato host que mantenga su agente; esta spec no depende de una PR concreta |

Los cambios de interfaz —campos del contrato, puertos, rutas, nombres de entorno o
credenciales— se revisan conjuntamente y se registran en el documento propietario. Este
repositorio no duplica el contrato del host. La documentación del patrón en otros
repositorios es opcional y no forma parte de esta entrega.

## 9. Decisiones pendientes

| ID | Decisión | Recomendación | Bloquea |
| --- | --- | --- | --- |
| D1 | Mecanismo de protección de tags, actores autorizados, bypass y firma de tags | Ruleset o tag protection verificada; sin bypass ordinario; firma solo si se acuerda su custodia | Fase 2 |
| D2 | Almacenamiento y transporte privado del paquete de release | Almacén privado direccionado por digest, con manifiesto y retención; revisar la prohibición de artifact de CI del RUNBOOK | Fase 1 |
| D3 | Formato de la referencia QA y de la anotación del tag | **CERRADA 2026-11-11:** `reviewed`/`integration`/`pr`/`qa`; verificación de árbol y de evidencia GitHub en el preflight (§3) | — |
| D4 | Lugar de ejecución y credenciales (runner dedicado, SSH restringido u OIDC) | Mínimos privilegios, sin root, sin comandos arbitrarios; evaluar el modelo de amenaza del host | Fase 2 |
| D5 | Interruptor de TEST y primera versión | Estado inicial desactivado; habilitar solo con contrato host y copia/restore ensayados | Fase 4 |
| D6 | Actores autorizados y separación de funciones | Ruleset de tags con allowlist + comprobación `MYFINANZAS_DEPLOY_ACTORS`; sin Required reviewers; Environment opcional solo para secretos (decisión 2026-11-08) | Fase 2 |
| D7 | Identidad de promoción y retención de la evidencia TEST | Mismo SHA y digest; si la evidencia o el artefacto caducan, bloquear hasta nuevo TEST | Fases 4–5 |
| D8 | Autorización de migración y prueba de backup/restore | Reutilizar `compatibility.py` y el RUNBOOK; una autorización por par de esquema y datos | Fase 5 |
| D9 | Perfil de smoke y comportamiento ante fallo posterior | Perfil fijo y mínimo; recuperación manual con estado preservado, sin rollback automático | Fases 4–5 |
| D10 | Pre-releases, metadatos de build y futura rama `test` | Solo SemVer estable ahora; la rama futura cambia únicamente el origen de tags | Futuro |
| D11 | Reconciliación de SPEC34/seed con el SHA elegido para TEST | No habilitar TEST hasta que el contrato de esquema/seed acepte el SHA y el seed correspondiente; `main` está en v26, el seed propuesto es v25 y el PR #229 se cerró sin merge: nueva propuesta o reapertura autorizada | Fase 1 |

`[CONFIRMADO]` D6 se actualiza el 2026-11-08: no hay revisores; la autorización es el tag
creado por un actor permitido. Un Environment sin revisores puede aislar secretos. El resto
de D1–D2 y D4–D11 conserva su redacción; D3 se cierra el 2026-11-11 con la autorización del
usuario («Apruebo implementar la solución propuesta mediante una única PR pequeña contra
`test`… incluyendo el cierre de D3 en SPEC35»), limitada al preflight de crédito QA: no
habilita las fases 1–6 ni ningún despliegue. D10 se redactó cuando
`test` era futura; la rama existe y el origen vigente se define en §6, sin cambiar la
decisión sobre pre-releases y metadatos. La referencia de D11 a v26/v25 y al PR #229 es
histórica: el estado verificado es v27/C27, SPEC34/testplan reconciliados y seed `FT-1` v27
no implementado; D11 sigue abierta.

## 10. Fases propuestas para implementar y habilitar

| Fase | Objetivo | Evidencia de salida | Autorización |
| --- | --- | --- | --- |
| 0 | Documentar el diseño y revisarlo | Esta spec; QA y CI documentales | **Actual; sin implementación** |
| 1 | Cerrar D1–D11 y el contrato entre repositorios | Decisiones registradas y documentos reconciliados; sin cambios operativos | Separada |
| 2 | Configurar protección de tags, allowlist y Environment de secretos | Reglas efectivas verificadas; sin Required reviewers; sin tags operativos ni credenciales | Separada |
| 3 | Implementar el workflow en dry-run | Solo `workflow_dispatch`, sin `push` de tags y sin credenciales de VPS; casos negativos y positivos; host intacto | Separada |
| 4 | Habilitar TEST | Primer `deploy-test-vX` sobre SHA congelado de `test`; smoke, copia/restore y evidencia; PROD intacto | Separada |
| 5 | Habilitar PROD | Backup/restore, aceptación y primer `deploy-prod-vX` sobre el SHA promovido a `main` | Separada |
| 6 | Verificar protección y promoción `test`→`main` | Reglas efectivas, gate y prueba negativa; sin tags operativos | Separada |

Cada fase conserva sus propios criterios y no se deduce de la anterior. La fase 3 no usa un
tag operativo; la fase 4 es la primera que publica un tag `deploy-test-v*`, y solo después de
su autorización. Ninguna fase se declara completada por un merge documental.

## 11. Verificación de esta entrega documental

- El diff de esta entrega se limita a documentos y enlaces; no crea tags, workflows,
  credenciales, secretos ni cambios en `apps/`, `infra/` ejecutable o `.github/workflows/`.
- Se ejecuta la entrada canónica `python3 scripts/verify` sobre el candidato y la
  clasificación aplicable. Un resultado `UNRUN` no se convierte en PASS.
- La QA independiente revisa el alcance, los enlaces, la coherencia con SPEC34/31/32 y
  RUNBOOK, la ausencia de duplicación y la ausencia de secretos o datos privados.
- La CI del PR debe pasar antes de solicitar el merge. El merge sigue siendo una autorización
  separada y no está incluido en esta entrega.
- Ningún criterio de implementación de las fases 1–6 se marca como PASS en este documento.

## 12. Fuera de alcance

- Crear tags operativos, moverlos, borrarlos o reutilizarlos.
- Activar workflows de despliegue o publicar la primera release.
- Configurar credenciales, accesos al VPS, runners o secretos. El Environment `test`, si se
  usa, no lleva Required reviewers ni aprobación.
- Cambiar servicios, DNS, Caddy, Podman, firewall, usuarios, rutas o copias del VPS.
- Realizar despliegues, migraciones, restauraciones, rollbacks o merges.
- Importar datos reales, el Excel o información financiera.
- Crear u operar la rama `test`, modificar su protección o la estrategia
  `feature/* → test → main`; esta spec solo documenta el origen y no la ejecuta.

## 13. Referencias

- [SPEC34 — entorno TEST](34-infra-test-01-specification.md)
- [SPEC31 — SQLite en producción](31-sqlite-produccion-specification.md)
- [SPEC32 — ejecución rootless](32-ejecucion-rootless-specification.md)
- [RUNBOOK — release, gate Rootless, actualización y rollback](../infra/RUNBOOK.md)
- [Preparación de despliegue](../infra/README.md)
- [Seguridad](guidelines/security.md) y [calidad](guidelines/quality.md)
- [Tablero de épicas](epic-board.md)
- El contrato host y la eventual documentación reutilizable pertenecen a sus respectivos
  repositorios; esta spec no depende de su integración ni de una PR concreta.
