# 32 — Ejecución rootless: Progress
Specification: [contrato aprobado](32-ejecucion-rootless-specification.md)
Current state: VERIFIED — AC-01–AC-24 PASS en runner efímero; revisión/integración pendientes, sin merge/deploy

| Task | Status | Commit / evidence |
| --- | --- | --- |
| Cerrar spec aprobada, precisiones UID y rollback | done | 56407e0; PR #29 reconciliada con main ad94426, CI push/PR SUCCESS; sin merge |
| Bind explícito validado antes de SQLite | verified | Tres pruebas de procesos reales dentro de imagen final; 90 API PASS |
| Imagen reproducible y manifiesto privado OCI/backend/frontend | verified | 39734037872 / 3094563: dos builds sin caché, payload/frontend iguales, OCI y manifiesto verificados; Bun 1.4.3/age 1.3.2/Debian 13 |
| UID 10001/keep-id y volúmenes | verified final image | Host 1001 → interno 10001, state/TMPDIR 0700, DB/clave/sidecars 0600; 39734037872 |
| Publicación de puerto Podman / AC-10 | verified final image | API real vía 127.0.0.1:18081, 200/401; sin IPv6 ni acceso externo; stop desconecta |
| Quadlet y WAL/SHM | verified final image | systemd --user real, health→kill→restart, SIGTERM/SIGKILL, 3/60s/5s estable, WAL íntegro; sin reboot/logout remoto |
| Fallos/update/rollback cruzado | verified | 39734037872: b0bc5a7→3094563→b0bc5a7, datos/auth/escrituras conservados; restore age con WAL/MFA y negativos incompatibles PASS |
| Regresión local y PR independiente | verified / review pending | 90 API PASS / 1409 assertions; 2 E2E PASS (43.0s); tipos/build/controles PASS |

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
Verificar CI del commit documental final y entregar PR #30 para revisión; la
evidencia del HEAD final se registra también en su descripción para evitar
autorreferencia de SHA en este documento. Esperar autorización expresa antes
de cualquier merge, en orden #29 → #30; no avanzar a acceso/despliegue.
No VPS, deploy, datos reales, PR #21/#22 ni otras fases; no afirmar dev 32 completo.

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
