# 35 — DEPLOY-TAGS-01: despliegue mediante tags de GitHub — Specification

Status: **DISEÑO APROBADO PARA DOCUMENTACIÓN 2026-11-05 — IMPLEMENTACIÓN NO AUTORIZADA.**
No autoriza crear tags operativos, activar workflows de despliegue, configurar credenciales
o accesos al VPS, cambiar servicios, DNS, Caddy, Podman o firewall, desplegar ni fusionar.
Approval source/date: usuario, 2026-11-05 (diseño de despliegue mediante tags; alcance
limitado a documentación y revisión técnica).
Base: `main` `baa673e778f8489369824e533c3e0caaabe00c1a` (2026-11-05).
Documentos relacionados: [SPEC34 — entorno TEST](34-infra-test-01-specification.md),
[31 — SQLite en producción](31-sqlite-produccion-specification.md),
[32 — ejecución rootless](32-ejecucion-rootless-specification.md),
[RUNBOOK de release y operación](../infra/RUNBOOK.md),
[seguridad](guidelines/security.md), [calidad](guidelines/quality.md),
[tablero de épicas](epic-board.md) y el
[contrato host de despliegue por tags](https://github.com/jmartinlabs/vps-infra/pull/18)
de `vps-infra` (documentación en revisión).

Las marcas `[CONFIRMADO]`, `[PROPUESTA]` y `[PENDIENTE]` distinguen hechos comprobados,
diseño derivado y cuestiones sin decisión. Ninguna marca convierte una propuesta en
autorización.

## 1. Objetivo y alcance

`[CONFIRMADO]` El objetivo es que la publicación de un tag de GitHub sea el disparador
controlado de un despliegue, preservando los gates existentes de CI, QA independiente,
Rootless, esquema, copia y recuperación. Se distinguen dos entornos:

- `deploy-test-v*` → TEST, automático solo cuando el sistema esté habilitado y hayan pasado
  todos los controles.
- `deploy-prod-v*` → PROD, detenido hasta la aprobación de un GitHub Environment protegido.

`[CONFIRMADO]` Esta spec posee la convención de tags, la validación de origen, la
orquestación de comprobaciones, la construcción o recuperación de la release, la promoción
TEST→PROD, el smoke de aplicación y la evidencia de aceptación. No posee el contrato del
host, que pertenece a `vps-infra`, ni el patrón reutilizable, que pertenece a
`agent-project-template`.

`[PENDIENTE]` La aprobación de este diseño no autoriza su implementación. No existe ningún
tag operativo, workflow de despliegue, credencial, acceso al VPS ni automatización
habilitada por esta spec.

### 1.1 No objetivos

- Sustituir CI, QA, Rootless, backup/restore, aceptación funcional o autorización de merge.
- Convertir `main` en producción o declarar TEST operativo.
- Crear la rama `test` ni adoptar ahora `feature/* → test → main`.
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
| Recepción y activación en el host | `vps-infra`, [contrato de despliegue por tags](https://github.com/jmartinlabs/vps-infra/pull/18) | Interfaz de entrada/salida, aislamiento TEST/PROD, permisos y recuperación |
| Patrón reutilizable | `agent-project-template`, [`docs/DEPLOYMENT_TAGS.md`](https://github.com/jmartinlabs/agent-project-template/pull/48) | Documentación opcional; no impone el patrón ni cambia la orquestación |

`[CONFIRMADO]` El flujo vigente es `feature/* → main`; no hay rama `test`. La base no tiene
MyFinanzas desplegada, no hay datos reales y el esquema vigente se declara por SHA, no se
fija aquí. El PR #9 de `vps-infra` (host TEST) sigue abierto y no mergeado; su §11.1
describe el despliegue como manual. Este diseño prepara la activación automática cuando se
habilite expresamente: sustituirá solo el disparador, no los gates del host.

## 3. Convención de tags

`[CONFIRMADO]` Se usan dos espacios de nombres:

```text
deploy-test-v0.1.0   → entorno TEST
deploy-prod-v0.1.0   → entorno PROD
```

`[PROPUESTA]` La validación implementada aceptará exactamente el formato SemVer estable:

```text
^deploy-(test|prod)-v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$
```

No se admiten prefijos, sufijos, versiones incompletas, `latest`, metadatos de build ni
pre-releases sin una decisión separada (D10). El nombre del tag y la versión del manifiesto
deben coincidir.

Reglas:

- **Inmutabilidad.** Un tag publicado no se mueve, no se sobrescribe, no se borra y no se
  reutiliza. La protección efectiva se verifica en GitHub; no basta con documentarla.
- **Origen.** El tag apunta a un commit concreto de `main` (política vigente), nunca a una
  rama móvil, un merge ref, un fork o un commit no alcanzable desde el origen autorizado.
- **Autor.** Solo un publicador autorizado crea tags. La comprobación de permisos se hace en
  el workflow además de la protección de GitHub; ninguna de las dos se presume.
- **Reintentos.** Un fallo de validación antes de mutar puede reintentarse sobre el mismo
  tag, SHA y artefacto, aumentando el intento. Un artefacto distinto, un commit distinto o
  un cambio de gates exige un nuevo tag de versión, normalmente un patch.
- **Un despliegue exitoso por versión y entorno.** No se vuelve a desplegar la misma versión
  ya activada; un redespliegue exige decisión y una versión nueva.
- **Anotación.** `[PROPUESTA]` El tag se crea anotado con un bloque no secreto que incluye
  versión, SHA, digest del manifiesto, contrato de esquema, referencia de QA y, en TEST, el
  manifiesto de seed. La forma exacta se decide en D3; el workflow no debe interpretar texto
  libre sin validación estricta.

La creación del tag no es la autorización de merge ni la aceptación funcional. Es una
atestación del publicador de que la QA aplicable terminó para ese SHA; el workflow registra
al actor y la referencia, pero no puede demostrar por sí mismo la calidad de la QA.

## 4. Flujo TEST

### 4.1 Disparador y validaciones previas

1. Publicación de un tag `deploy-test-v*` en el repositorio de la aplicación.
2. Validar nombre, repositorio, autor autorizado, objeto del tag y commit destino. Un valor
   ausente, ambiguo o no reconocido detiene el proceso.
3. Resolver el SHA completo de 40 caracteres y comprobar que es ancestro del origen
   autorizado (`origin/main` hoy). No se usa `HEAD` de una rama móvil ni un merge ref.
4. Comprobar que no existe un despliegue exitoso previo de la misma versión en TEST y que no
   hay otro despliegue activo en el entorno.

### 4.2 Gates obligatorios

| Gate | Comprobación | Si falta |
| --- | --- | --- |
| CI | Check requerido `SUCCESS` sobre el SHA exacto; no se hereda de otro commit | Detener; ejecutar la CI sobre ese SHA y reanudar el mismo run |
| QA | Referencia de QA independiente del SHA, revisable y sin secretos | Detener; no convertir un archivo autoemitido en PASS |
| Rootless | Run `SUCCESS` del gate Rootless sobre el SHA exacto y coincidencia con la release | Detener; lanzar `Rootless infrastructure 32` sobre el SHA y reanudar |
| Release | Manifiesto verificado con `--expected-commit` y `--expected-manifest-sha256`; ID/digest inmutable; frontend del mismo paquete | Detener; no reconstruir silenciosamente otro artefacto |
| Esquema y seed | Contrato declarado por el manifiesto compatible con el estado TEST; manifiesto de seed y marcador TEST verificados | Detener antes de abrir la base |
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
- Se registran SHA, digest del manifiesto, ID de imagen, checksum del frontend y contrato de
  esquema. Se selecciona la imagen por ID/digest inmutable, nunca por etiqueta.
- El paquete es privado y no se publica como artifact de CI sin una decisión que revise la
  política de SPEC34 (D2). PROD no reconstruye un artefacto distinto del aprobado.

### 4.4 Despliegue y smoke

1. Comprobar el interruptor de habilitación de TEST. Desactivado significa no desplegar,
   aunque el tag sea válido.
2. Adquirir el bloqueo exclusivo del entorno; un segundo despliegue se rechaza.
3. Entregar al host el contrato de §3 de `vps-infra` (entorno, versión, SHA, digest,
   manifiesto, seed, esquema, copia, smoke). No se envían secretos al workflow ni a los logs.
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

1. Publicación de un tag `deploy-prod-v*`; mismas validaciones de nombre, autor, objeto,
   SHA y origen que TEST.
2. Verificar que la **misma versión, SHA y digest de manifiesto** superaron TEST con smoke
   correcto y evidencia registrada. Si el artefacto de TEST no está disponible o difiere,
   detener; no reconstruir en PROD.
3. Verificar los controles específicos de producción: autorización de datos reales,
   DT6/T-BKP, copia y restauración ensayadas, migración autorizada si cambia el esquema,
   aceptación funcional aplicable y plan de rollback al par exacto. Los detalles siguen en
   [31](31-sqlite-produccion-specification.md), [32](32-ejecucion-rootless-specification.md),
   [RUNBOOK](../infra/RUNBOOK.md) y [seguridad](guidelines/security.md); esta spec no los
   duplica.
4. Preparar y revisar el plan de actualización y recuperación: release, esquema, copia,
   mantenimiento, smoke y vuelta atrás.

### 5.2 Aprobación y ejecución

5. El workflow se detiene en el GitHub Environment `production`.
6. La aprobación se concede mediante **Required reviewers**. `[PROPUESTA]` El autor del tag
   no puede ser el único aprobador; se configura separación de funciones cuando GitHub lo
   permita y se verifica la configuración efectiva.
7. Solo después de **Approve and deploy** se liberan las credenciales de PROD y se ejecuta
   la activación.
8. Se verifica el resultado, se ejecuta el smoke de producción y se registran evidencias.

`[CONFIRMADO]` La aprobación de GitHub constituye la autorización operativa de esa ejecución,
una vez que el procedimiento haya sido implementado, revisado y habilitado expresamente. No
autoriza merges, desarrollo nuevo, importación de datos reales ni una versión posterior.

## 6. Estrategia de ramas

`[CONFIRMADO]` Se mantiene `feature/* → main`. Los tags apuntan a commits concretos de
`main`. **No se crea ninguna rama adicional ahora.**

`[PROPUESTA]` Si en el futuro se adopta `feature/* → test → main`, se actualizará únicamente
la política de origen de los tags: TEST podrá consumir el origen de integración y PROD el
commit promovido a `main`. La convención, la inmutabilidad y los controles de artefacto no
cambian. Ninguna propuesta abierta en otro repositorio se interpreta como adopción vigente.

## 7. Seguridad y controles

| Requisito confirmado | Control de diseño | Evidencia |
| --- | --- | --- |
| Proteger tags y restringir creación/modificación | Ruleset/tag protection con actores autorizados, sin update/delete; comprobar la regla efectiva y los bypass | Consulta de solo lectura a GitHub y prueba negativa |
| Verificar SHA, procedencia y artefactos inmutables | Ancestro del origen, manifiesto, checksums e ID/digest; sin etiquetas móviles | Salida de verificación y manifiesto |
| Impedir despliegues concurrentes | Un lock por entorno y `cancel-in-progress: false`; rechazo del segundo | Run bloqueado y registro |
| Credenciales separadas y de mínimos privilegios | Principal TEST/PROD distinto, sin root, secreto en el Environment o almacén autorizado, no en Git | Configuración revisada y prueba de alcance |
| No guardar claves ni secretos en repositorios o artefactos | Revisión de diff, manifiesto y logs; secretos efímeros; sin TOTP ni `age` en la release | Auditoría de contenido y permisos |
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
| `vps-infra` | Recepción y activación seguras, aislamiento TEST/PROD, privilegios, rutas, servicios, copias y recuperación | [Contrato de despliegue por tags](https://github.com/jmartinlabs/vps-infra/pull/18), host TEST PR #9 y `docs/operaciones.md` |
| `agent-project-template` | Patrón reutilizable como opción, sin imponerlo ni alterar la orquestación | [`docs/DEPLOYMENT_TAGS.md`](https://github.com/jmartinlabs/agent-project-template/pull/48) y enlace en su README |

Los cambios de interfaz —campos del contrato, puertos, rutas, nombres de entorno o
credenciales— se revisan conjuntamente y se registran en el documento propietario. Este
repositorio no duplica el contrato del host; `vps-infra` no duplica la convención de tags.

## 9. Decisiones pendientes

| ID | Decisión | Recomendación | Bloquea |
| --- | --- | --- | --- |
| D1 | Mecanismo de protección de tags, actores autorizados, bypass y firma de tags | Ruleset o tag protection verificada; sin bypass ordinario; firma solo si se acuerda su custodia | Fase 2 |
| D2 | Almacenamiento y transporte privado del paquete de release | Almacén privado direccionado por digest, con manifiesto y retención; revisar la prohibición de artifact de CI de SPEC34 | Fase 1 |
| D3 | Formato de la referencia QA y de la anotación del tag | Bloque estructurado y validado; la QA se revisa fuera del workflow y el actor queda registrado | Fase 3 |
| D4 | Lugar de ejecución y credenciales (runner dedicado, SSH restringido u OIDC) | Mínimos privilegios, sin root, sin comandos arbitrarios; evaluar el modelo de amenaza del host | Fase 2 |
| D5 | Interruptor de TEST y primera versión | Estado inicial desactivado; habilitar solo con contrato host y copia/restore ensayados | Fase 4 |
| D6 | Revisores de PROD y separación de funciones | Required reviewers; autor del tag distinto del aprobador | Fase 5 |
| D7 | Identidad de promoción y retención de la evidencia TEST | Mismo SHA y digest; si la evidencia o el artefacto caducan, bloquear hasta nuevo TEST | Fases 4–5 |
| D8 | Autorización de migración y prueba de backup/restore | Reutilizar `compatibility.py` y el RUNBOOK; una autorización por par de esquema y datos | Fase 5 |
| D9 | Perfil de smoke y comportamiento ante fallo posterior | Perfil fijo y mínimo; recuperación manual con estado preservado, sin rollback automático | Fases 4–5 |
| D10 | Pre-releases, metadatos de build y futura rama `test` | Solo SemVer estable ahora; la rama futura cambia únicamente el origen de tags | Futuro |

## 10. Fases propuestas para implementar y habilitar

| Fase | Objetivo | Evidencia de salida | Autorización |
| --- | --- | --- | --- |
| 0 | Documentar el diseño y revisarlo | Esta spec, el contrato host y el patrón del template; QA y CI documentales | **Actual; sin implementación** |
| 1 | Cerrar D1–D10 y el contrato entre repositorios | Decisiones registradas y documentos reconciliados; sin cambios operativos | Separada |
| 2 | Configurar protección de tags y Environments | Reglas efectivas verificadas; sin tags operativos ni credenciales de despliegue | Separada |
| 3 | Implementar el workflow en dry-run | Solo `workflow_dispatch`, sin `push` de tags y sin credenciales de VPS; casos negativos y positivos; host intacto | Separada |
| 4 | Habilitar TEST | Primer `deploy-test-vX`; smoke, copia/restore y evidencia; PROD intacto | Separada |
| 5 | Habilitar PROD | Backup/restore, aceptación, revisores y primer `deploy-prod-vX` aprobado y verificado | Separada |
| 6 | Adoptar una rama de integración, si se decide | Solo cambia la política de origen de los tags | Separada |

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
- Configurar credenciales, accesos al VPS, runners, secretos o GitHub Environments.
- Cambiar servicios, DNS, Caddy, Podman, firewall, usuarios, rutas o copias del VPS.
- Realizar despliegues, migraciones, restauraciones, rollbacks o merges.
- Importar datos reales, el Excel o información financiera.
- Crear la rama `test` o modificar la estrategia de ramas vigente.

## 13. Referencias

- [SPEC34 — entorno TEST](34-infra-test-01-specification.md)
- [SPEC31 — SQLite en producción](31-sqlite-produccion-specification.md)
- [SPEC32 — ejecución rootless](32-ejecucion-rootless-specification.md)
- [RUNBOOK — release, gate Rootless, actualización y rollback](../infra/RUNBOOK.md)
- [Preparación de despliegue](../infra/README.md)
- [Seguridad](guidelines/security.md) y [calidad](guidelines/quality.md)
- [Tablero de épicas](epic-board.md)
- [Contrato host de despliegue por tags](https://github.com/jmartinlabs/vps-infra/pull/18)
  (`vps-infra`, PR de documentación en revisión)
- Patrón reutilizable de `agent-project-template`
  ([PR #48](https://github.com/jmartinlabs/agent-project-template/pull/48))
