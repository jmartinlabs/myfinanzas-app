# 32 — Ejecución rootless: Progress
Specification: [contrato aprobado](32-ejecucion-rootless-specification.md)
Current state: RECOVERY CANDIDATE v18 — merge de `main` `f9c8a0d`; schema 18/e4.1-v18;
AC-18/AC-22 pendientes de CI Linux/rootless y QA final. Sin cierre, merge ni deploy.

| Task | Status | Commit / evidence |
| --- | --- | --- |
| Cerrar spec aprobada, precisiones UID y rollback | done | a9e0fdbe241189548e45591d46edaaf3ad5842a6; PR #29 reconciliada con main b60def1; aprobada, sin merge |
| Bind explícito validado antes de SQLite | verified | Tres pruebas de procesos reales dentro de imagen final; 90 API PASS |
| Imagen reproducible y manifiesto privado OCI/backend/frontend | verified | 39734037872 / 3094563: dos builds sin caché, payload/frontend iguales, OCI y manifiesto verificados; Bun 1.4.3/age 1.3.2/Debian 13 |
| UID 10001/keep-id y volúmenes | verified final image | Host 1001 → interno 10001, state/TMPDIR 0700, DB/clave/sidecars 0600; 39734037872 |
| Publicación de puerto Podman / AC-10 | verified final image | API real vía 127.0.0.1:18081, 200/401; sin IPv6 ni acceso externo; stop desconecta |
| Quadlet y WAL/SHM | verified final image | systemd --user real, health→kill→restart, SIGTERM/SIGKILL, 3/60s/5s estable, WAL íntegro; sin reboot/logout remoto |
| Fallos/update/rollback cruzado | verified | 39734037872: b0bc5a7→3094563→b0bc5a7, datos/auth/escrituras conservados; restore age con WAL/MFA y negativos incompatibles PASS |
| Regresión local y PR independiente | candidate preserved / review pending | B5 antes FAIL/después PASS; 91 API/1415 aserciones y 2 E2E (47.5s) PASS; corrección de snapshot sin reglas financieras |
| Reconciliación con main y adaptación al esquema vigente | verified candidate / CI pending | f0b685c sobre merge 582846c (a090112 + main 26b6f0c); B5 deriva schemaVersion 16; contratos release 16/e3.4-v16; QA independiente APPROVE FOR CI |

## Reconciliación v18 — Lote 2 (2026-10-29)

Fuente: autorización expresa del usuario para reanudar el Lote 2 (SPEC32/PR30),
reconciliar con `main` v18, ampliar compatibilidad/rollback/restore, ejecutar
Linux/rootless, QA independiente y documentación, sin merge ni despliegue.

- Merge de `main` `f9c8a0d` en `feat/32-ejecucion-rootless`; `schemaVersion = 18`,
  contrato de datos `e4.1-v18`, ambos derivados por `infra/release.py`.
- Matriz anterior/actual: merge-base con `origin/main` (`f9c8a0d`) → candidato;
  **18→18**, sin fingir rollback 18→16. La migración 16→17→18 queda cubierta por
  pruebas de esquema/backup de módulos.
- `release-fixture.mjs`: añade v17 (`movimiento_compartido` con transferencia
  S000→S001, referencia compartida y Tercero) y v18 (`instrumentos`,
  `operaciones_inversion`, auditorías y saldos S002/S003).
- `release-contract.mjs`: añade lecturas `/instrumentos` y `/compras`.
- `rootless-integration.py`: el release anterior se obtiene con `git merge-base HEAD
  origin/main`, no con un SHA fijo; se registra en evidencia.
- Validación local: fixture v17/v18 en SQLite v18 (2 filas por tabla nueva), funciones
  `listInstrumentos`/`listPurchases` y opciones con datos; typecheck y build PASS;
  `py_compile` y `node --check` PASS. Pruebas focales de esquema/compras/instrumentos/
  server-config/migración PASS con `TMPDIR=/private/tmp`; backup age/libc en macOS
  **BLOCKED** por el entorno, no PASS.
- CI `Validate project` run `40889566377`: **SUCCESS** sobre `2c11e1d`.
- CI rootless inicial run `40889566563`: **FAILURE** en
  `explicit-production-fixture-initialization` (exit 1). Causa localizada:
  `infra/release.py` copiaba solo `.ts` de `apps/api/src` y omitía
  `schema-contracts.json`, importado por `schema-contract.ts`; la imagen no podía
  cargar el contrato. Corregido para incluir `.json` de runtime; prueba local de
  `context` OK (90 archivos, JSON incluido).
- CI rootless run `40890495769`: producción inicializada; falló después en
  `final-image-api-regressions` (5 PASS / 36 FAIL). Causa: el montaje read-only de
  fuentes de prueba copiaba solo `.ts` y omitía `schema-contracts.json`; los tests
  que importan `schema-contract.ts` no resolvían el JSON. Corregido para copiar
  `.ts` y `.json`; rerun pendiente.
- `Validate project` run `40890495695`: **SUCCESS** sobre `e881476`.
- CI rootless run `40891410721`: **314 PASS / 1 FAIL**; el extractor no identificó
  la etiqueta del único fallo. Se añade salida saneada de líneas `(fail)` para
  diagnosticarlo; rerun pendiente.
- **AC-18/AC-22 PENDING** hasta CI Linux/rootless del SHA candidato. No se reutiliza
  el PASS histórico 3094563.

## Recuperación DEV32 — reconciliación con main (2026-10-27, histórico)

Fuente: autorización expresa del usuario en este chat para continuar DEV32,
reconciliar el candidato conservado con main, preservar las protecciones SQLite,
adaptar los ensayos al esquema vigente y completar AC-22 mediante QA independiente
y CI Linux/rootless. Sin merge, VPS, despliegue, datos reales ni publicación.

- Checkout aislado `.../T/opencode/dev32-recovery`; rama `feat/32-ejecucion-rootless`.
  Base previa a090112, main 26b6f0c, merge 582846c, candidato de código f0b685c.
- `apps/api/src/database.ts` es idéntico a main 26b6f0c: se conserva el snapshot de
  lectura `db.transaction(() => inspectIdentity(db))()` antes de `prepareSchema` y
  la verificación de pareja efectiva en producción. No se restaura la sonda antigua
  `persistentIdentity`/`existsSync` ni ninguna ruta de identidad alternativa.
- El esquema real es v16 (`schemaVersion`). B5 y los contratos de release lo derivan
  del código en vez de fijar v6; `e3.4-v16` procede de `backup.ts`. No se crea ni
  modifica ninguna migración financiera.
- Matriz de rollback: baseline anterior main 26b6f0c (16→16), compatible en
  esquema/datos/autenticación. `release-fixture.mjs` crea filas sintéticas por
  módulo v7–v16, auditoría, foto y enlace, añade una segunda escritura tras la
  actualización y `release-contract.mjs` compara snapshots exactos y consulta las
  diez rutas GET de módulo en ambas imágenes. La ejecución en Linux/rootless sigue
  pendiente y no se apoya en el PASS histórico 3094563.
- AC-18 se contrasta cláusula por cláusula en testplan: esquema/datos/autenticación,
  actualizar y volver a anterior tras escrituras, escrituras conservadas y
  comprobadas en ambas versiones, sin rollback/restauración automática incompatible.
  La matriz no se presenta como prueba de único escritor ni de frontend/API
  emparejados; esas cláusulas dependen de runbook/AC-16 y del manifiesto de release.
  Publicación de puerto/Quadlet no aparece en AC-18 (AC-10/13); si se exige rollback
  de servicio por el bind nuevo, el baseline main no lo permite y queda como residual
  explícito, no como reducción del criterio ni como PASS de este candidato.
- QA independiente (subagente distinto del autor, sin escritura): APPROVE FOR CI
  para el candidato base y la ampliación de cobertura. PASS locales: B5 1/0
  (6 aserciones), typecheck/build, `py_compile`, `node --check`, contratos
  schema16/e3.4-v16 para HEAD y 26b6f0c. Suite API local 216/47, mismo conjunto de
  fallos que main 212/47 por límites del entorno macOS (libc.so.6, age-keygen,
  rutas /private y cascadas de producción); no es PASS de aceptación.
  `python3 scripts/verify` UNRUN local por Python 3.9.6; Linux/rootless UNRUN. La
  matriz ampliada se validó localmente en demo: 32 tablas, filas por módulo núcleo
  más auditoría/foto/enlace, `integrity_check=ok`, FK vacío y las diez rutas GET
  con 200. Las tablas de intentos y semántica específica siguen cubiertas por las
  pruebas de módulo.
- Hallazgos resueltos: cobertura limitada a seis tablas y exclusión del rollback de
  servicio por interpretación; se amplía el fixture y se contrasta AC-18 por
  cláusulas, con CI pendiente. Residuales: el baseline main no incluye
  API_BIND_HOST (rollback de servicio por bind/Quadlet no demostrado), contrato de
  auth no derivado y barrera B5 dependiente del SQL literal. Se corrigen las
  referencias documentales propias y el resto queda como riesgo explícito.
- Estado: AC-22 sigue ABIERTO. El push/CI de PR #30 se coordina con Codex con un
  único responsable; la aprobación de merge sigue siendo del usuario. No se
  reutiliza el PASS histórico 3094563 para este candidato.


## Verified increments
2026-10-22 Europe/Madrid, raíz del repositorio. Validación de API_BIND_HOST solo
127.0.0.1 (default ausente) o 0.0.0.0 explícito, rechazo de vacío, hostnames,
espacios y direcciones ajenas antes de crear directorio/DB. Dos subprocesos main
reales responden health {ok:true}, deniegan /api/saldos anónimo con 401 y dejan
de responder tras SIGTERM. Fixtures exclusivamente ficticios, sin claves en logs.
No implica Podman/publicación, UID, rootfs readonly o durabilidad verificados.
Typecheck/build PASS; suite API completa 86 PASS / 0 FAIL / 1319 assertions.
Playwright 2 PASS (47.0s), ejecutado después de Bun sin colisión de puerto.

## Decisions
Aprobación fuente/fecha en specification y brainstorming; se preservan main #27,
Dev 31 y sus guardas. Rama feat/32-ejecucion-rootless depende de spec PR #29,
aún sin integrar; su diff efectivo se revisa contra spec/32-ejecucion-rootless (56407e0). No merge autorizado.

## Errors, regressions and blockers
Primer ensayo del incremento falló por tipado de env en test y expectativa de JSON
health equivocada; corregidos contra contrato existente {ok:true}, sin modificar API.
Ambos fallos resueltos antes de publicar; no son fallos de negocio ni de rootless.

Sondeo local no destructivo: unshare -Ur falla en sandbox por uid_map readonly;
fuera del sandbox funciona. Podman y newuidmap no instalados; systemctl --user
is-system-running devuelve offline. systemd --user --test falla al obtener
RuntimeDirectory (No such device or address); PID1 es tail y cgroup no escribible.
Docker disponible no es rootless Podman y no sustituye AC-05/10/13/21. No se ha
creado contenedor privilegiado ni relajado seccomp/permisos para ocultarlo.
Necesario runner/VM aislado con rootless Podman, subuid/gid y systemd de usuario
y cgroup delegados antes de completar estos AC; nunca el VPS prohibido.
R6 sigue sin cierre causal; fsync tras rename puede dejar conjunto válido con
durabilidad incierta. No borrar/recrear ni restaurar datos automáticamente.

## Next action
PAUSA solicitada por el usuario el 2026-10-22 en «Checkpoint de Dev 32 y preparación
del traspaso a Orchestrator». No continuar diagnóstico ni corrección de AC-22.
Cuando se apruebe la metodología, el coordinador leerá este checkpoint, testplan y
la investigación existente; contrastará candidato/evidencias y asignará la revisión
pendiente antes de decidir reanudar Dev 32. No cerrar por una CI posterior verde.
Se conserva #29 → #30, sin merge, VPS ni despliegue autorizados.

## Incidencia de CI del incremento — 2026-10-22

SHA de código 5a748c039630b8b56c4d7da6b46cba335e769bc6: CI
[push SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39687638211),
pero [pull_request FAILURE](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39687644407)
en Run bun run test (job 119525659541). Los resultados locales anteriores se
conservan, sin convertir el fallo remoto en PASS. Las anotaciones solo indican
exit 1; descarga de logs detallados no disponible desde este entorno (HTTP 403).
No se conoce todavía el test fallido ni su causa: no atribuirlo a R6, #27 o al
bind sin evidencia. No rerun para conseguir verde, assertions relajadas ni cambio
financiero. Dev 32 se detiene para diagnóstico/consulta y capacidad rootless real.
La actualización documental de esta incidencia no corrige el fallo de código ni
lo cierra aunque dispare otra CI. Spec #29 conserva sus CI SUCCESS en a4de2e1.

## Continuación autorizada — runner efímero GitHub Actions — 2026-10-22
Fuente: respuesta expresa del usuario en este chat. Autoriza ubuntu-24.04 efímero,
independiente del VPS y sin self-hosted existente. Primero gate real de Podman
rootless, subuid/subgid, cgroup v2/delegación y systemd --user; si no es funcional,
detenerse y proponer VM temporal Debian 13. Sin contenedor privilegiado, secretos
productivos o artefactos sensibles. Se reanuda exclusivamente ese diagnóstico;
el fallo API anterior sigue abierto y no se cierra por otras ejecuciones verdes.

Se añade workflow separado contents:read, PR normal (no pull_request_target),
checkout fijado sin credenciales persistidas y tooling instalado solo en runner
nuevo. El gate ejecuta realmente systemd-run --user y podman info; no crea un
gestor alternativo ni usa sudo para Podman/app. Solo publica booleanos/versiones
seleccionadas en log/summary; sin env, info completa, DB/claves ni artefactos.
El primer incremento prueba capacidad antes de escribir/ejecutar imagen/volúmenes.
Sondeo local falla de forma esperada, sin declarar PASS de infraestructura.
Pendiente resultado del runner para AC-05/10/13/21; el resto sigue sin validar.

### Primer resultado del runner y corrección del sondeo — 2026-10-22
[Run 39688358428](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39688358428),
SHA feef838, termina FAILURE únicamente por el comando genérico unshare.
Las demás comprobaciones pasan: systemd --user real y unidad transitoria,
cgroup delegado, Podman rootless/cgroup v2/systemd y mapeos subuid/subgid.
Versiones: Podman 4.9.3; systemd 255 (255.4-1ubuntu8.17);
kernel 6.17.0-1022-azure; uidmap 1:4.13+dfsg1-4ubuntu3.2.
No se ha demostrado un fallo de Podman: el sondeo debe comprobar el namespace
mediante podman unshare true, no exigir que un binario distinto esté autorizado.
Se corrige ese método sin tocar AppArmor/seccomp/sysctl ni elevar privilegios.
Se conserva el fallo anterior; nuevo resultado pendiente. Solo continuar si
Podman demuestra el namespace y se mantienen todas las demás condiciones.

### Gate real aprobado y ensayo siguiente — 2026-10-22
[Run 39688519229 SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39688519229)
sobre d681156: todas las comprobaciones pasan mediante Podman real, incluyendo
namespace, subuid/gid, cgroup delegado y systemd-run --user. Versiones anteriores
confirmadas por anotación. Las dos CI validate de ese SHA también pasan; el fallo
API histórico de 5a748c0 sigue sin diagnóstico/cierre causal, no se borra.

Se continúa con imagen SOLO DE ENSAYO, base Bun 1.4.3 Debian por digest
923bedb355f7746666659f71e724998159a5c8c54bd1cb1030e1975a0698415b,
contexto por allowlist sin tests/DB/claves/env y dependencias congeladas production.
No es todavía la receta final reproducible ni la distribución OCI+frontend.
Ensayo previsto: inicializador 31 explícito, UID interno 10001 frente a UID host
no coincidente, permisos de volumen, WAL con commit técnico ficticio retenido,
Quadlet temporal real, health/401 vía puerto publicado 18081, no acceso desde
otro namespace a interfaz no-loopback, reinicio y parada. Solo unidades/nombres
aleatorios propios; limpieza incluso en fallo, ningún artifact de DB/claves.
AC-05/10/13/21 siguen pendientes hasta ese resultado; no basta el gate de capacidad.

Ensayo complementario local de construcción con Docker (no evidencia rootless):
la base fijada se descarga, pero bun install falla al resolver DNS de registry.npmjs.org
(DNSResolveFailed, fast-check 3.23.2). No se cambia la dependencia, DNS del host o
política de red para ocultarlo. La ejecución rootless autorizada del runner será
la evidencia necesaria; el fallo de este entorno queda registrado por separado.

### Ensayo real inicial — fallo previo a aplicación — 2026-10-22
Run 39689141747 / SHA 569ad0b: gate PASS y construcción rootless de imagen PASS;
primer podman run del inicializador devuelve 125 antes de ejecutar aplicación.
UID/volumen/red/Quadlet/reinicio NO verificados todavía. Se instrumenta únicamente
stderr técnico acotado del rechazo 125 previo a aplicación para diagnosticarlo;
no stdout, entorno, claves o datos. No se relajan permisos/privilegios ni se
atribuye el fallo al mecanismo keep-id sin evidencia.
Versiones de ese runner: Podman 4.9.3, systemd 255 (255.4-1ubuntu8.18),
kernel 7.0.0-1017-azure, uidmap 1:4.13+dfsg1-4ubuntu3.2. Registrar por ejecución:
la etiqueta ubuntu-24.04 no fija kernel/patch de paquetes entre runners.

### Compatibilidad tmpfs Podman 4.9.3 — 2026-10-22
Run 39689349891 / 738a179 identifica rechazo técnico exacto previo a aplicación:
unknown mount option uid=10001. No demuestra incompatibilidad de keep-id.
Se elimina esa opción no admitida y se usa tmpcopyup (mecanismo Podman 4.9),
con /tmp de imagen preparado 0700/UID 10001 durante construcción, no mediante
chmod/chown de estado en arranque. Se deshabilitan tmpfs automáticos de rootfs
readonly; se conserva tmpfs explícito 64 MiB, noexec/nosuid/nodev y 0700.
La prueba exige stat de propietario/mode y escritura/unlink real con UID 10001;
si no conserva permisos/propietario, falla. Sin 0777, root o seccomp relajado.
Referencia de implementación: Podman v4.9.3 pkg/specgen/generate/storage.go usa
tmpcopyup para montajes readonly; la aceptación depende del ensayo, no de esa lectura.

### Área temporal privada dentro del tmpfs — 2026-10-22
Run 39689590035 / 79cfe0a: inicializador productivo y permisos/UID host del
volumen pasan; falla la escritura de la prueba de temporales. No se marca AC-05
completo. tmpcopyup no debe suponerse que cambie el propietario de la raíz montada.
Se conserva el propietario root del namespace para la raíz tmpfs sin datos,
0711 (solo traversal para el proceso, sin listado/escritura), y se copia un
subdirectorio private UID 10001/0700 desde imagen, con TMPDIR apuntando a él.
El temporal sensible sigue 0700, state 0700 y archivos 0600; ningún 0777 ni
chown/chmod del estado en arranque. tmpfs sigue limitado a 64 MiB y noexec,
nosuid/nodev; raíz del filesystem readonly y sin tmpfs automáticos amplios.
La nueva prueba exige owner/mode de padre e hijo y escritura real en TMPDIR,
con diagnóstico solo de números UID/modos/booleanos, nunca contenido de clave.

## Resultado real del runner — 2026-10-22
[Run 39689862600 SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39689862600)
SHA 6a2ce9dae5b07bc26240ade74b2bf394dd3ef9cb; imagen SOLO DE ENSAYO
sha256:0701a4d46c664b735b5c8abc3777e13cafdfa91854907904ec0306e24183b05b.
Anotaciones comprobadas: gate real PASS y rootless integration PASS.
Podman 4.9.3, systemd 255 (255.4-1ubuntu8.18), kernel 7.0.0-1017-azure,
uidmap 1:4.13+dfsg1-4ubuntu3.2. Se confirman:
- UID interno 10001, keep-id y propietario del volumen frente al UID host no coincidente;
  state 0700, DB/clave 0600 y temporales de trabajo 0700 realmente escribibles.
- HTTP real host → puerto publicado Podman 127.0.0.1:18081 → API; health 200 y
  JSON {ok:true}; /api/saldos sin sesión 401. No acceso por IP host no-loopback
  desde un segundo contenedor, sin host network ni privilegios de aplicación.
- Quadlet efímero generado/arrancado por systemd --user; restart conserva commit
  técnico ficticio en WAL retenido, con integrity/FK correctos y sidecars privados.
- Stop deja inaccesible el puerto; limpieza limitada a nombres/unidad/temporales
  creados por este ensayo. Sin publicar DB, clave, imagen ni artifacts sensibles.

Esta evidencia desbloquea el runner, no la entrega completa: no release final
reproducible/OCI+frontend, backup/restore cruzado ni rollback datos/autenticación,
logout/reboot, HTTPS/Caddy o VPS validados. AC-05/10 pasan para esta imagen de
ensayo; AC-13/14/21 tienen evidencia parcial y requieren cierre final del alcance.
Se añade comprobación negativa explícita de ::1:18081 y UID host al reporte siguiente.
El fallo API histórico 39687644407 sigue sin diagnóstico causal, aunque otras CI pasen.
R6 y durabilidad fsync permanecen documentados; ningún merge ni despliegue.

## Evidencia ampliada del ensayo — 2026-10-22
[Run 39690157698 SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39690157698)
sobre e778ad4aafd5adb48862655d3f3359bb81e2def1. Confirma lo anterior y ausencia
de publicación en ::1:18081. UID/GID host 1001 frente a interno 10001;
Podman 4.9.3, systemd 255 (255.4-1ubuntu8.18), kernel 7.0.0-1017-azure,
uidmap 1:4.13+dfsg1-4ubuntu3.2. Imagen de ensayo
sha256:2bc097f19c68a3d7088a7c4da5fae4e7d52ef9b098931fb1033cbd4df010342c.
Se refuerza además el final del harness: solo emite PASS tras comprobar ausencia
de sus contenedores, unidad y directorio privado; no basta intentar la limpieza.
Los resultados finales de ese refuerzo/CI general se vinculan al SHA en PR #30.
Sin artefactos sensibles, secretos reales, VPS, publicación de imagen ni merge.
La evidencia del runner no acredita los contratos todavía no implementados de 32.

Cierre de este incremento de ensayo: run 39690471643 / f1b66e6 SUCCESS, incluida
limpieza verificada (contenedores/unidad/directorio ausentes). Evidencia y límites
actualizados en testplan 32; no se declara la entrega completa ni cierre causal del fallo API.

## Continuación autorizada — 2026-10-22
Fuente: mensaje expreso del usuario «Continuación Dev 32», tras revisión con Álex
sobre PR #30. Autoriza completar AC-01–24 en runner efímero ubuntu-24.04; no merge,
VPS, despliegue, publicación de imágenes ni datos reales. Secuencia #29 → #30.
Reconciliación sin conflictos con main ad9442669468968d0ab82a9613522c7205b242c1:
PR #29 conserva exclusivamente los dos documentos aprobados y la corrección ajena
#31 permanece intacta. No se reabre Dev 31 ni se modifica código financiero.

Incremento en verificación: receta multistage con base Bun por digest, dependencias
locked sin scripts, age 1.3.2 verificado por SHA256, frontend pareado y archivo OCI
privado. Dos builds sin caché deben coincidir en payload normalizado y frontend;
no se acepta una diferencia de contenido inexplicada. El runner repetirá UID,
volúmenes, WAL, red y Quadlet con esta imagen y ejecutará la regresión API usando
las dependencias de runtime. Matriz anterior b0bc5a7 → actual → anterior, con
escrituras ficticias confirmadas, sesión/contraseña/TOTP/recovery y backup/restore.
Ensayo local de la fixture sintética seed/update/rollback/restore PASS contra el
código actual y age local; no sustituye la matriz entre imágenes ni acredita AC.
Resultados remotos del nuevo incremento pendientes. R6, fsync y el fallo API
histórico sin causa diagnosticada permanecen abiertos y visibles.

Primer ensayo del paquete final: run 39731758544 / 103bf7e FAIL en
`final-image-api-regressions`; la compilación doble, manifiesto, UID, API publicada,
WAL y Quadlet previos a esa etapa sí alcanzaron su comprobación, pero no existe
PASS global. CI general push/PR PASS en ese SHA. No se reintenta el run ni se omite
la suite. La regresión #31 incorporada desde main requiere Python/fcntl como
holder de bloqueo real, no dependencia de producción; se prepara ese helper del
runner en mount de pruebas privado readonly (intérprete/stdlib/loader), sin
instalar Python en imagen final ni ampliar mounts del host. Se añaden diagnósticos
solo de nombres literales de tests revisados, nunca payloads/factores. El diagnóstico
concreto del fallo anterior sigue limitado por indisponibilidad de logs remotos.

Run 39732364245 / 0ad8deb: FAIL en observación de start-limit (ningún PASS global).
El observador de la nueva prueba duraba 25s, inferior a la ventana de 60s del
contrato; se corrige a esa ventana más margen de scheduling y se añaden propiedades
systemd no secretas para diagnosticar si vuelve a fallar. No se altera 3/60s,
backoff 5s, límites productivos ni aserciones de aplicación. Health, reinicio real
tras SIGKILL y conservación WAL alcanzaron sus checks previos. Regresión local
actual: 90 API / 1409 aserciones PASS, tipos/build y 22+18 controles PASS.

Run 39732833232 / 72233d6 FAIL por aserción literal Result=start-limit-hit.
Diagnóstico seguro disponible: systemd 255 declara ActiveState/SubState=failed,
NRestarts=3, ExecMainStatus=1, StartLimitBurst=3, ventana 1min y RestartUSec=5s,
pero conserva Result=exit-code. El servicio sí quedó detenido; se sustituye la
etiqueta específica por comprobación funcional más fuerte: fallo estable tras
3 reinicios, parámetros efectivos y ninguna reanudación durante dos backoffs.
Se conserva este fallo y no se cambia el contrato ni la configuración productiva.
Se añade prueba real health→kill→systemd (Bun detenido con SIGSTOP, health ejecutado
independientemente con gracia/timeout/fallos productivos), no solo SIGKILL manual.

Run 39733300336 / 9b4f757: FAIL, 88 API PASS/2 FAIL dentro de imagen final.
Fallos visibles por nombres: «semilla demo solo…» y «31 P7…». Health real,
SIGKILL, límites estables y demás etapas previas ya superaron sus aserciones,
pero no se declara PASS global. El paquete de pruebas montado omitía package.json,
por lo que `bun run setup` no podía comprobar el mensaje del CLI real: se añaden
manifiestos y lock originales de HEAD, sin alterar tests ni código. El ejecutor
de la suite multiproceso dispone de 2 CPU/2GiB/512 pids; servicio, CLI y matriz
operativa conservan 1 CPU/1GiB/128. No se modifican timeouts/aserciones ni se
excluye ningún test. Se añaden solo clasificación timeout y ubicaciones fuente
saneadas para distinguir el segundo fallo si persiste; su causa sigue pendiente.
La receta/healthcheck se materializan también desde Git HEAD y se rechaza checkout
sucio; Bun/age se verifican ejecutando sus binarios, no solo leyendo etiquetas.

## Aceptación integral demostrada — 2026-10-22
[Rootless 39734037872 SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39734037872),
[validate PR 39734037875 SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39734037875)
y [validate push 39734032852 SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39734032852),
todos sobre **3094563c466873fc5d2519a328b6109d30f13c41**. Sin retry de ningún run.
90 API PASS dentro de la imagen final, incluida toda la regresión #31 con fcntl
real; las dos fallas del harness anterior no reaparecen. Se conserva su historial
y no se atribuye causa única a P7 sin diagnóstico del fallo original. No cambia
código financiero, tests existentes, timeouts ni aserciones. Servicio y matriz
operativa mantienen 1CPU/1GiB/128; batch de regresión 2CPU/2GiB/512 por sus hijos.

AC-01–24 verificados según testplan: reproducibilidad de payload/frontend,
canarios/capas/OCI, UID/permisos/noexec/cgroups/NNP/caps, API publicada y negativas,
health real (tres fallos)→kill→restart, SIGTERM/SIGKILL/WAL, start-limit estable,
fallos/concurrencia/guardas de 31, matriz real de datos/auth/escrituras y
backup cifrado con WAL/restauración nueva/clave/integridad/revocaciones/MFA.
Runbook y gates posteriores revisados. No se ejecuta un rollback de datos;
negativos bloquean sin abrir/modificar DB. Limpieza de contenedores/unidad/raíz
privada propia comprobada antes de PASS; runner efímero desecha imágenes/cachés
locales. No imágenes, claves, DB o paquetes publicados/retendidos como artifact.

La baseline anterior es b0bc5a7 reconstruida con la receta actual: evidencia
válida solo para ese par exacto, no promesa de compatibilidad con futuras releases.
Imagen verificada actual sha256:28f754d6187a1cc770530b177fb27d17acaab5fb972ed5c6942e39d4a15c3f16,
anterior sha256:d8a85d453e1a34807ce3584f5e802d16287184b02da877510bd60e2059b74196.
Hashes/manifiesto y versiones completos en testplan. El commit documental final
se vuelve a probar en CI; su SHA y resultados definitivos constarán en PR #30.

Riesgos residuales: R6 y fallo API histórico 39687644407 sin causa diagnosticada;
fsync post-rename puede dejar pareja válida con durabilidad incierta. No se
prueba pérdida física de energía/disco. No se acredita reboot/logout del VPS,
configuración Debian real, HTTPS/Caddy, copia externa/retención/custodia ni RPO/RTO.
La fase A deberá especificar integración HTTPS; B, backup externo/custodia y
simulacro. Activación y datos reales siguen gates independientes; Excel maestro.
#29 reconciliada/CI SUCCESS, solo dos documentos; #30 contiene diff propio sin
duplicidades al comparar contra 56407e0. Ninguna PR integrada ni #21/#22 modificadas.

Revisión final adicional — 2026-10-22: se desactiva explícitamente herencia de
proxy host en Podman run/build/create con --http-proxy=false, incluida unidad
Quadlet. Nueva prueba con proxy exclusivamente ficticio compara control por
defecto y runtime protegido, sin emitir valores. No cambia el contrato aprobado;
refuerza AC-11 (sin herencia accidental de credenciales/config global). La evidencia
3094563 sigue válida para su SHA; este refuerzo requiere nueva CI íntegra antes
de entregar PR #30 como lista.

## Bloqueo vigente de regresión — 2026-10-22
La sección de aceptación integral de 3094563 registra ese ensayo concreto; no es
cierre actual de Dev 32. **23/24 actuales; AC-22 abierto.**
[Run 39734977613 / 77e4982 FAILURE](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39734977613):
89 API PASS / 1 FAIL, sin timeout. Test «04 AC22/23/28: dos procesos actualizan
v3, reintentan alta y compiten en rectificación». Ubicaciones saneadas:
movimientos.test.ts:885:16 (exit de hijo esperado cero), :910:21 (Promise.all de
la fase upgrade). No se conoce todavía código/causa del error del hijo: no
atribuirlo a SQLITE_BUSY, R6 ni a la incidencia API histórica sin evidencia.
No modificar timeouts, concurrencia, aserciones o código financiero para ocultarlo.

9a1dc5df8da680ec557438499d0c27079ad0a6a3 tiene [rootless39735182627 SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39735182627),
[validate PR39735182819 SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39735182819)
y [push39735175707 SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39735175707).
Ese run ya se había iniciado antes de conocer el fallo 77e4982 para verificar
la protección de proxies; no fue un retry. Confirma 90 API, todos los checks
rootless y matriz/restore completos, incluida herencia de proxy ficticio por
defecto y bloqueo explícito. **No diagnostica ni resuelve el fallo anterior.**

Para no perder el diagnóstico financiero ya instrumentado, el harness de infra
ahora exporta solo los enums/códigos/errno/fuente del reporter E1.4 existente a
anotaciones cuando falla. No se modifica movimientos.test.ts ni implementación
financiera. Prueba local del filtro: conserva SQLITE_BUSY sintético y elimina
mensajes/payloads/sentinelas secretos; PASS. No se reintenta ningún run ni se
ejecutan bucles hasta verde. La siguiente CI valida este cambio de observabilidad
y documentación; aunque pase, AC-22 permanece abierto hasta diagnóstico/revisión.

Alternativas antes de tocar código fuera de alcance: agente financiero cierra la
incidencia con su evidencia; o usuario autoriza investigación/corrección técnica
acotada a la ruta demostrada. No se cambia contrato aprobado ni se integra nada.
R6/fsync/API histórico siguen documentados de forma independiente.

## Corrección técnica autorizada de apertura — 2026-10-22
El usuario autoriza expresamente investigar/corregir únicamente apertura/migración
SQLite, sin reglas financieras. [Análisis y B5](investigations/32-sqlite-identity-snapshot.md).
Se reproduce determinísticamente una carrera entre consultas de identidad: lector
ve marcador ausente v3, escritor migra a v6, lector ve versión6 y falla con
IDENTITY_ABSENT. No se afirma que sea el mensaje perdido del run77; sí es una
incompatibilidad real de la misma ruta. Control sobre código anterior: 0/1 FAIL.
Cambio mínimo demo/memoria: una transacción de lectura para validar identidad,
cerrada antes del BEGIN IMMEDIATE de migración. Sin SQL financiero, retries,
timeouts nuevos, cambios al probe immutable ni a la rama productiva/guardas31.
B5 corregido 1 PASS/6 aserciones; suite91 API/1415 aserciones, tipos/build PASS.
El cierre de AC-22 queda pendiente de ejecutar la corrección en la imagen final
con CI completa; no se cierra por los verdes previos. PR30 sigue Draft mientras.

Regresión posterior al fix: 2 E2E PASS (47.5s), tipos/build y controles22+18 PASS.
Control negativo exacto de B5 con snapshot retirado temporalmente: vuelve a
IDENTITY_ABSENT/FAIL; restaurado inmediatamente, PASS/6 aserciones. No se publica
el código de control sin corrección. FIFO abierta antes del aviso ready y escritor
no bloqueante evitan que un hijo muerto deje colgado el harness. No hay retries.

## Checkpoint para el futuro Orchestrator — 2026-10-22

Esta sección sustituye las siguientes acciones de los registros históricos, que se
conservan como evidencia. Fuente: solicitud expresa del usuario de pausar y traspasar;
no se adopta aquí la metodología ni se crean subagentes.

- PR [#30](https://github.com/josemartin2000/myfinanzas-app/pull/30), OPEN/DRAFT,
  rama `feat/32-ejecucion-rootless`, HEAD de implementación preservado
  `b8a68d8a6bef49968f80c516ef3099c40d953f8d`, GitHub MERGEABLE.
  El commit documental que contiene este checkpoint es su sucesor; su SHA y CI
  se registran en la PR para evitar una referencia circular dentro del propio commit.
- Base ya reconciliada: main `b60def124e95d692b6021eff9c1049652e21ded0`;
  spec PR #29 `a9e0fdbe241189548e45591d46edaaf3ad5842a6`, OPEN, sin integrar.
  Se preservaron los cambios financieros ajenos; no se modifica main en esta transición.
- D1–D3 y AC-01–24 aprobados en los documentos de spec: runtime separado de
  Caddy/HTTPS y recuperación externa; mantenimiento/un escritor y rollback con
  compatibilidad de esquema, datos y autenticación; OCI privado emparejado con frontend.
  UID10001/keep-id probado realmente, sin elevar privilegios ni relajar permisos.
- Completados: imagen reproducible, frontend/manifiesto, UID/permisos/volúmenes,
  WAL/SHM, puerto loopback/API real, Quadlet/fallos/reinicio, actualización/rollback
  con escrituras conservadas, restore cifrado con claves/MFA y runbook. Los 23 AC
  verificados conservan su mapa individual y evidencias en testplan.
- AC-22 sigue PENDING por orden de pausa y revisión pendiente. Candidato técnico
  anterior a esta pausa: `86b15701aa36580321a2b43e53832beca78112d3`, incluido en b8.
  No se ha corregido código ni ejecutado una nueva investigación durante el checkpoint.

### Hechos, hipótesis y trabajo restante de AC-22

**Hechos:** run39734977613 sobre77e4982 falló (89 PASS/1 FAIL, sin timeout),
E1.4 «04 AC22/23/28…», movimientos.test.ts:885:16/:910:21: hijo no cero al abrir/
actualizar v3 con dos procesos. El error interno original no está disponible;
la descarga de logs detallados está bloqueada. Existe además el fallo API histórico
39687644407 sin test/causa diagnosticados; no se elimina por éxitos posteriores.

La investigación ya realizada en
[investigación32](investigations/32-sqlite-identity-snapshot.md) demuestra otra
intercalación concreta: leer ausencia de identidad v3, migrar desde otro proceso,
y leer versión6 fuera de una única instantánea. B5 usa procesos/FIFO reales:
antes FAIL/IDENTITY_ABSENT; candidato de snapshot de lectura antes del writer
IMMEDIATE PASS/6 aserciones; control negativo quitando solo el snapshot vuelve a
fallar. Local: 91 API/1415 aserciones, tipos/build y 2 E2E PASS. Rama productiva y
pruebas/reglas financieras sin cambios por ese candidato.

**Hipótesis no demostrada:** esa intercalación explica el fallo original E1.4.
No está probado que lo explique, ni que sea la causa de R6 o del fallo API histórico.
CI íntegra b8 verde valida una ejecución del candidato, no esa atribución causal.

**Pendiente:** revisión independiente del candidato y límites transaccionales;
contrastar la evidencia histórica y decidir qué reproducción/observabilidad falta
sin repetir a ciegas la investigación existente; decidir con el coordinador la
suficiencia de AC-22 y las pruebas adicionales necesarias. Si cambia código después,
congelar nuevo SHA y repetir las suites afectadas y CI completa sin reintentos que
oculten fallos. Ninguna prueba nueva de esta revisión se ha ejecutado en la pausa.

### Evidencia CI y límites del checkpoint

HEAD b8: rootless [39739135407](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39739135407),
Validate PR [39739135378](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39739135378)
y push [39739131767](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39739131767):
SUCCESS. No rerun manual. Los fallos previos permanecen en testplan; no se
recalifican como aprobados. La CI del sucesor documental se consulta en la PR;
no equivale a cerrar AC-22. No pruebas VPS, reboot/logout real, Caddy/HTTPS ni
recuperación externa: fuera de esta entrega, no ejecutadas ni aceptadas por inferencia.

Riesgos residuales: R6 sin cierre causal; fsync posterior a rename puede dejar
estado válido con durabilidad incierta (preservar e inspeccionar, no recrear/restaurar
automáticamente); fallo API histórico sin diagnóstico. No distribuir artefactos
sensibles ni importar Excel/datos reales. Caddy/HTTPS y backups externos requieren
sus fases, custodia de claves, retención y simulacro/RPO/RTO aprobados; solo se ha
validado la interfaz loopback y el restore local sintético de32.

### Propuesta conceptual de delegación futura (no ejecutada)

| Tarea | Objetivo y archivos de referencia/posible alcance | Finalización | Dependencias y conflictos |
| --- | --- | --- | --- |
| Diagnóstico AC-22 | Partir de B5 e investigación32; database.ts, database-identity.ts, sqlite-migration-opening.test.ts y movimientos.test.ts solo como referencia; recuperar diagnóstico histórico si disponible | Separar mecanismo demostrado de causa histórica; propuesta reproducible sin relajar pruebas ni reglas financieras | Puede coexistir con revisión solo lectura; cambios SQLite reservados a un único responsable autorizado |
| Revisión independiente | Leer candidato86 y rutas de apertura/identidad/migración/private-state; comprobar snapshot, liberación antes de writer y guardas producción | Informe reproducible con hallazgos y límites, sin afirmar que verde prueba causalidad | En paralelo al diagnóstico sobre SHA fijo, sin editar sus archivos; decisión final conjunta del coordinador |
| QA/regresión | testplan, suites API/B5/E2E e infra/tests/rootless-integration.py y workflows existentes | Evidencias por SHA de API, UID/red/Quadlet, rollback datos/auth/escrituras y restore/MFA; fallos y no ejecutados explícitos | QA final depende de revisión/candidato congelado; no modificar implementación mientras se certifica; sin mocks sustitutos ni retries ocultos |
| Preparación de fases posteriores | Lectura de infra/RUNBOOK.md, infra/ y spec32; identificar contrato Caddy/HTTPS, backups cifrados externos, retención, claves y recuperación | Propuesta acotada de siguientes specs y gates; ninguna activación ni acceso al VPS | Análisis documental paralelo; implementación/despliegue exige aprobación posterior y cierre de dependencias runtime |

El coordinador futuro será responsable de secuenciar decisiones, consolidar seguimiento
y evitar escritores Git simultáneos. El agente financiero conserva reglas/pantallas/
contratos; no modificarlos para resolver infra sin incompatibilidad justificada y
autorización. La adopción v2.3.1 y PR24 pertenecen al otro agente: AGENTS.md/Skills
quedan fuera. Reservar propietario para archivos compartidos (setup-progress, roadmap,
guidelines) y coordinar SHA/base antes de reconciliar ramas; no sobrescribir avances
ajenos. Este checkpoint solo modifica los dos documentos canónicos de Dev32.
