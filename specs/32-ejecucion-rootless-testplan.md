# 32 — Ejecución rootless: Test plan
Specification: [contrato aprobado](32-ejecucion-rootless-specification.md)

| Acceptance ID | Preconditions and action | Expected result | Automated/manual method and command | Actual result / status | Run date / evidence |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Revisar release y reconstruir desde commit limpio con inputs fijados | Manifiesto fuente/lock/base/Bun/age/OS/plataforma completo; ningún latest ni apt no fijado | release.py build: inputs Git/digest/lock/age/OS + ejecución de versiones | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-02 | Repetir dos builds limpios sin caché con inputs/plataforma iguales | Hashes de payload iguales; diferencias de metadatos OCI explícitas, ninguna diferencia de contenido sin explicar | release.py build: dos builds --no-cache, inventory normalizado y frontend | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-03 | Inspeccionar contexto, capas, history, entorno y archivos de imagen/artefactos | Sin secretos, DB/sidecars, Excel, datos reales ni directorios de desarrollo; comprobación con canarios sintéticos que detecte inclusión accidental | check_context + canarios + inventory/inspect_layers + history/env/logs | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-04 | Ejecutar imagen por digest/ID verificado y servir CLI/API | Bun fijado, glibc/renameat2/age compatibles; runtime sin Vite ni watch; dist exportado coincide con manifiesto | podman load OCI + CLI/init/API reales + verify checksums dist | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-05 | Ensayar UID host distinto de 10001 con keep-id y stat desde ambos lados | Compatibilidad real UID 10001/keep-id y volúmenes demostrada; si es incompatible, alternativa segura justificada y probada, proceso no root y state 0700/archivos 0600 del efectivo; sin elevar privilegios, relajar permisos, chown/chmod automático ni :U | rootless-integration.py: stat host/container + escritura TMPDIR | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-06 | Crear estado mediante CLI 31 efímera y reabrir runtime | Inicialización explícita única DB+clave coherente; no fixtures; S000 únicamente, sin usuario; runtime no inicializa | CLI production-init real + suite API P1/P7 en imagen final | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-07 | Arrancar sin DB/clave, con demo/legacy, clave errónea o permisos/enlaces inválidos | Exit no cero sin regenerar/fallback/sembrar/reparar; archivos previos intactos | suite API completa en imagen final: orígenes, clave, permisos/enlaces | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-08 | Reiniciar contenedor con rootfs readonly y mounts mínimos | Escritura solo en state/tmpfs previstos; sin socket Podman/privilegios/caps extra; límites efectivos y sin OOM en smoke | rootless-integration.py: CapEff/NNP, rootfs/noexec y cgroup límites reales | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-09 | Comprobar bind default y opt-in, e inyectar configuración inválida | Local permanece 127.0.0.1; contenedor 0.0.0.0 solo explícito; inválido rechaza antes de abrir DB | server-config.test.ts dentro de suite final: procesos reales | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-10 | Iniciar imagen API real en Podman rootless con opt-in de bind y publicación 127.0.0.1:18081:3001; enviar HTTP desde el host al puerto publicado; inspeccionar sockets y probar desde otra red | GET /api/health devuelve 200 y JSON esperado a través del puerto publicado; ruta financiera sin sesión devuelve 401; detener contenedor corta comunicación. Sin API pública/IPv6 wildcard ni host network; no basta podman exec, mocks o inspección de configuración | rootless-integration.py: HTTP desde host, 200/401, IPv6/external negativas | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-11 | Validar configuración y canarios en logs/inspect/env/history | Solo valores no secretos; clave auth por archivo, identidades de recuperación fuera de API permanente; canarios secretos ausentes | rootless-integration.py: inspect/logs/history sin clave; allowlist y canarios | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-12 | Arrancar health válido, estado sin propietario y simular caída | Salud sin datos/factores; no acceso financiero sin MFA; timeout/restart y start-limit observables y acotados | health real + SIGSTOP/SIGKILL + NRestarts/failed estable 3/60s/5s | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-13 | Generar y ejecutar Quadlet en systemd de usuario aislado; stop/start de sesión/servicio | Unidad real rootless reproducible, dependencia/linger documentados; no root service; baseline Podman/systemd registrada | runtime.render + Quadlet real start/restart/stop; runbook linger pendiente VPS | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-14 | Escribir fixture con WAL sin checkpoint y recrear contenedor | DB/WAL/SHM en mismo volumen; datos confirmados/IDs/auditoría/clave persisten; integrity/FK correctos | WAL/SHM retenidos + matrix snapshots datos/IDs/auditoría/clave | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-15 | Parar con SIGTERM durante uso y repetir tras SIGKILL con commit confirmado | Cierre scoped, puerto liberado y reapertura íntegra; sin perder commits confirmados ni borrar sidecars a mano | procesos SIGTERM y SIGKILL reales, health y reapertura integrity/FK | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-16 | Dos arranques/inicializadores compiten en entorno rootless | Garantías 31 conservadas, sin sobrescritura ni doble clave; único servicio escritor activo según runbook | suite API P4/P5/P8 concurrentes en namespace rootless, runbook único escritor | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-17 | Inyectar ENOSPC y fallo fsync antes/después de publicación | Error sin aceptar pareja parcial; post-rename preserva conjunto válido y declara durabilidad incierta, sin borrar/recrear | suite API fallos ENOSPC/fsync/publicación antes/después en imagen final | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-18 | Demostrar compatibilidad de esquema SQLite, contrato de datos y autenticación entre versiones; actualizar release y volver a anterior compatible tras nuevas escrituras confirmadas | Mantenimiento controlado, único escritor, frontend/API emparejados; todas las escrituras confirmadas conservadas, contratos de datos y autenticación comprobados en ambas versiones; no rollback/restauración automática incompatible | release-contract.mjs: anterior seed → actual update → anterior rollback | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-19 | Intentar rollback incompatible/manifiesto corrupto o restore sobre destino existente | Bloqueo sin modificar estado; recuperación solo explícita a destino nuevo conforme a 31 | verify frontend/OCI/pin corruptos + require_rollback negativos + restore existente | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-20 | Crear backup con WAL y restaurar en conjunto nuevo mediante imagen/UID acordados | Integridad/identidad/clave/MFA válidos, revocaciones 31 y no restauración parcial; no copias externas alegadas | release-contract.mjs restore: WAL confirmado, age, key/integrity/revocación/MFA | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-21 | Ejecutar pruebas infraestructura en runner/VM rootless + systemd real | Evidencia de comandos/versiones/resultados, sin omisiones ocultas ni equivalencia de mocks; limpieza limitada a fixtures propios | preflight + integración completos, versiones/UID registrados y cleanup verificado | PASS — imagen final; suite integral sin tests omitidos | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-22 | Ejecutar suites existentes, tipos/build y controles del proyecto | Todo PASS; R6 falla de forma visible si reaparece; no retries/omisión ni cambio financiero para ocultarlo | validate push/PR + tipos/build/90 API/2 E2E + 22/18 controles | BLOCKED — 77e4982: 89 PASS/1 FAIL concurrencia E1.4; 9a1dc5d verde no cierra causa | 2026-10-22; run39734977613 FAILURE; run39735182627 SUCCESS sin atribución causal |
| AC-23 | Revisar runbook de inicio/parada/update/rollback y límites de datos | Operaciones deliberadas, paths/UID/mount coherentes, secretos fuera de argumentos y pasos no destructivos ante fallo | revisión infra/RUNBOOK.md + render-unit/rollback-check, sin efectos de despliegue | PASS — runner real, imagen final y revisión de runbook/gates | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |
| AC-24 | Revisar matriz de gates con A/B/activación y riesgos R6/fsync | 32 no declara VPS listo; HTTPS, offsite, custodia, recuperación y autorización de despliegue permanecen explícitos | revisión gates A/B/activación y riesgos R6/fsync/API histórico sin diagnóstico | PASS — runner real, imagen final y revisión de runbook/gates | 2026-10-22; 3094563 / run 39734037872; validate 39734037875 + 39734032852 |

**Estado vigente: 23/24 verificados; AC-22 bloqueado por regresión E1.4.**
La tabla es el estado vigente; los bloques inferiores conservan la historia de
fallos/ensayos y no sustituyen esta aceptación. CI del HEAD documental final se
vincula en PR #30, sin inferir aprobación de merge ni despliegue.

## Regression checks
2026-10-22: typecheck/build PASS, API completa 86 PASS / 1319 assertions,
sin omisiones ni retries para conseguir verde. Pruebas nuevas: 3 PASS / 28 assertions.
Playwright 2/2 PASS (47.0s), secuencial tras API. CI del SHA definitivo en PR de implementación.
Las CI de spec a4de2e1 son SUCCESS pero no acreditan implementación posterior.

## Functional verification
Procesos API reales default y 0.0.0.0: health 200/{ok:true}, financiero sin sesión
401, rechazo de bind inseguro sin crear SQLite y conexión cerrada tras SIGTERM.
Comunicación por puerto publicado rootless confirmada en run 39689862600 con imagen de ensayo; repetir con imagen final.

## Browser verification (web only)
Regresión Playwright existente 2/2 PASS (47.0s), 390/1440. Inspeccionadas capturas
artifacts/e1-5/transfer-form-mobile.png y reference-list-desktop.png (ignoradas):
jerarquía/etiquetas legibles, foco visible, sin overflow horizontal. Contraste y
teclado según assertions existentes; no nueva auditoría WCAG. Sin pantallas nuevas.

## Visual improvements (visual apps only)
Ninguna: incremento de bind sin cambios UI/CSS. No se justifican cinco mejoras
cosméticas ajenas al alcance ni nuevas afirmaciones de accesibilidad por este cambio.

## Limitations and next action
No aceptación completa de 32: capacidad rootless/systemd y ensayo de imagen/API
ya confirmados. Pendientes release final reproducible/OCI+frontend, resto de fallos
y rollback cruzado de datos/autenticación. Ver diagnóstico/evidencias en progress.
R6 y fsync siguen abiertos; sin VPS, infraestructura activa, publicación de imagen,
Excel/datos reales ni merge. Continuar con runner/VM aislado, no usar Docker como
prueba equivalente ni dar PASS a checks no ejecutados.

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

## Gate de infraestructura en runner autorizado — 2026-10-22
Workflow Rootless infrastructure 32, ubuntu-24.04 efímero, contents:read,
sin secretos de producción/VPS ni self-hosted. Comando:
`python3 infra/tests/rootless-preflight.py`. Requiere éxito real de namespaces,
subuid/subgid, Podman rootless/cgroup systemd y ejecución de unidad de usuario
transitoria; no mocks. Localmente BLOCKED esperado por capacidades ausentes.
Solo versiones/booleanos saneados en logs y job summary, ningún artifact sensible.
Resultado remoto pendiente; AC-05/10/13/21 no pasan por publicar el workflow.
Si falla el user manager del runner, detener y proponer VM temporal Debian 13.
La CI API fallida anterior permanece abierta sin atribución de test/causa.

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

## Resultado confirmado con limpieza — 2026-10-22
[Run 39690471643 SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39690471643)
sobre f1b66e68af4c9bec05163e05fd6437a34a9ed0be: gate y suite rootless reales
PASS, incluida cleanup-own-resources=true. UID/GID host 1001, interno 10001;
Podman 4.9.3, systemd 255 (255.4-1ubuntu8.18), kernel 7.0.0-1017-azure,
uidmap 1:4.13+dfsg1-4ubuntu3.2. Imagen únicamente de ensayo
sha256:0b3d1825bcc05e49630d3cf16fe46ade4fc3db298ab81f0f89c4390c3d2c7bf0.
No hace falta proponer VM por ausencia de user manager: funciona en este runner.
Revalidar baseline e imagen final antes de aceptación completa. CI general y
estado final del HEAD documental se consultan por SHA en #30. El fallo API
histórico no queda diagnosticado ni corregido por estas ejecuciones satisfactorias.

## Nuevo paquete definitivo en verificación — 2026-10-22
Comando runner: `python3 infra/tests/rootless-integration.py` tras preflight real.
Ahora construye dos imágenes sin caché, exige payload/frontend iguales, verifica
archivo OCI y manifiesto, rechaza frontend corrupto y repite pruebas rootless.
Se añade regresión API en runtime final y matriz real anterior/actual/anterior con
backup/restore/MFA y preservación de escrituras. Pendiente de CI: ningún AC cambia
a PASS por preparar este código. Fixture local seed/update/rollback/restore PASS
con datos ficticios; no prueba imágenes, UID ni systemd. Riesgos previos vigentes.

Run 39731758544 / 103bf7e: FAIL en regresión API de imagen final. No se atribuye
sin logs a un test concreto. CI general push y PR SUCCESS. Se conserva el fallo;
los nuevos tests #31 necesitan Python/fcntl real en el harness. El helper se copia
con su loader/stdlib/dependencias al montaje readonly de pruebas, nunca a runtime.
Prueba local inicial del helper FAIL: se detectó colisión de bibliotecas al
inspeccionar extensiones ajenas de site-packages. Se excluye ese árbol, que tampoco
se copia al harness. Resultado corregido pendiente de ejecución. La próxima CI ejecutará todos los tests sin excluir #31.
Reejecución local tras excluir site-packages de la inspección: PASS, Python
3.12.14 con loader copiado importa fcntl/os; sin modificar imagen ni tests API.
Run 39732364245 / 0ad8deb FAIL: observación de start-limit no alcanzada en 25s.
Se observa ahora la ventana contractual completa de 60s + margen, manteniendo
exactamente 3/60s y backoff 5s; propiedades systemd saneadas en caso de fallo.
No acredita todavía AC-12. Local 90 API / 1409 aserciones, tipos/build y controles
22+18 PASS; imagen/rollback/restauración finales siguen pendientes de CI.

## Regresión local y revisión visual actual — 2026-10-22
Tipos/build PASS; `bun run test`: 90 PASS, 0 FAIL, 1409 aserciones, sin reintentos.
`bun run test:e2e`: 2 PASS en 43.0s, Chromium real /usr/bin/chromium; flujos
existentes ficticios E1.1–E1.5, auth, accesibilidad y responsive. Capturas locales
`artifacts/e1-1/list-mobile.png` (390) y `list-desktop.png` (1440) inspeccionadas:
sin desbordamientos, jerarquía legible, navegación/controles y foco visibles.
Colores reales comprobados por E2E: botón rgb(36,50,14) sobre rgb(141,187,46),
contraste 6.04:1; texto rgb(43,43,43) sobre blanco, 14.16:1.
No se justifican mejoras visuales dentro de infraestructura: no hay interfaz nueva;
modificar pantallas, espaciado, colores, navegación o formularios financieros
excedería responsabilidad y diseño aprobado del otro agente. Sin cambios UI.
Controles check-repository/check-project/validate-template y 22+18 regresiones PASS.
Estos resultados no sustituyen CI/rootless del SHA final ni cierran R6/API histórico.
Run 39732833232 / 72233d6 FAIL, diagnóstico: servicio failed con NRestarts=3 y
configuración contractual exacta, Result=exit-code conservado por systemd 255.
Nueva aserción verifica estado terminal estable y contador congelado durante
11s (más de dos backoffs), no depende de etiqueta Result. No se cambia 3/60s/5s.
Próximo ensayo añade health real bloqueando Bun PID1 (SIGSTOP), tres health
fallidos y recuperación por systemd, con gracia 30s/timeout3s intactos; rootfs
readonly/capabilities/NNP/tmpfs noexec y backup con WAL confirmado explícito.
Run 39733300336 / 9b4f757 FAIL: 88 PASS, 2 FAIL (semilla demo / 31 P7).
Se conservan ambos; paquete de harness ahora incluye package.json/lock originales
para ejecutar scripts CLI. Batch de tests 2CPU/2GiB/512pids, sin cambiar límites
operativos 1CPU/1GiB/128 ni aserciones/timeout. Diagnósticos solo nombres/fuentes y
booleano timeout, nunca factores. Rootless/health/límite de reinicios previos pasan
sus etapas, pero la aceptación de conjunto y matriz posterior sigue pendiente.

## Evidencia integral actual — 2026-10-22
SHA **3094563c466873fc5d2519a328b6109d30f13c41**:
- [Rootless completo SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39734037872).
- [Validate PR SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39734037875),
  [validate push SUCCESS](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39734032852).
- 90 API PASS dentro de la imagen final, sin excluir fcntl/P7/semilla ni modificar
  timeouts/aserciones. API/CLI operativos y matriz: 1CPU/1GiB/128; ejecutor del
  conjunto multiproceso: 2CPU/2GiB/512, helper Python 3.12.3 readonly fuera de imagen.
- Dos builds --no-cache por versión, payload/frontend iguales; OCI load roundtrip,
  manifiesto/canarios/capas y frontend/OCI/pin corruptos rechazados.
- UID/GID host 1001 frente a interno 10001; state/TMPDIR 0700 y DB/clave/WAL/SHM
  0600. Rootfs readonly/noexec EACCES, CapEff=0/NNP=1 y cgroup memoria/CPU/pids
  efectivos comprobados. HTTP host 200/401, sin IPv6/no-loopback, stop corta puerto.
- Quadlet/systemd --user reales: restart/WAL integrity/FK, SIGKILL, tres health
  fallidos tras SIGSTOP→kill→restart; configuración inválida termina failed con
  NRestarts=3, 3/60s y backoff5s, estable dos backoffs, estado sin modificaciones.
- b0bc5a7 anterior → actual → anterior: esquema v6/identidad productiva reales,
  snapshots de hechos/auditoría/IDs/counters y clave estables, sesiones heredadas,
  password/TOTP/recovery, tres escrituras confirmadas y saldo sintético final60.00.
- Backup con commit real retenido en WAL, solo dos archivos age cifrados; restore
  a conjunto nuevo con datos/clave/integridad, sesiones/challenges/bootstrap y
  recovery antiguos revocados, login contraseña/TOTP y diez códigos nuevos.
- Gate rollback rechaza esquema/datos/auth incompatibles, par ajeno y prueba
  incompleta sin abrir ni cambiar estado. Destino restore existente rechazado
  en suite 31. Limpieza de nombres/unidad/directorio propios confirmada.
- AC-23/24: runbook/render-unit/rollback-check revisados, init deliberado sin
  entrypoint reparador, único escritor, binarios/frontend emparejados y rechazo
  sin prueba; gates A/B/activación/datos reales separados.

| Identificador no secreto | Valor del ensayo 3094563 |
| --- | --- |
| Imagen actual | sha256:28f754d6187a1cc770530b177fb27d17acaab5fb972ed5c6942e39d4a15c3f16 |
| Digest manifiesto OCI | sha256:97ab080e68acbbdfdd8142125738bbb991024b7f9515a26373175d3a5a09b22e |
| SHA manifiesto del paquete | 9b523c8a6d922e410ad30a255479f9c2321a9890f1f45d23ff4226c45ae9efef |
| SHA payload normalizado | b8af916a24947d48a8e2d572ba695f64630a6117fa474ec4ad9caf1961b2bf05 |
| Imagen anterior b0bc5a7 | sha256:d8a85d453e1a34807ce3584f5e802d16287184b02da877510bd60e2059b74196 |
| Runtime | Debian 13 / Bun1.4.3 / age1.3.2 / linux amd64 |
| Herramientas host | Podman4.9.3 / systemd255 (255.4-1ubuntu8.17) / kernel6.17.0-1022-azure / uidmap1:4.13+dfsg1-4ubuntu3.2 |

La reproducibilidad comprobada es de payload/frontend normalizados. No afirmar
identidad bit a bit de archivo OCI: se excluyen timestamps, hardlinks normalizados
a contenido y archivos host generados/pseudo-filesystems. No se admiten diferencias
de contenido inexplicadas. Manifiestos/OCI se generan/verifican privadamente y se
eliminan al limpiar el ensayo; no hay paquete distribuido ni imagen publicada.
Se reconstruirá y verificará el paquete revisado en la futura fase autorizada.
No es prueba de VPS real, reboot/logout, Caddy/HTTPS ni recuperación externa.
AC-13 acredita ciclo de servicio real y revisión de linger como requisito futuro,
sin activarlo. AC-24 acredita gates documentados, no implementación de fases A/B.
R6/fsync/API histórico siguen abiertos aunque esta suite y CI estén verdes.

Revisión final adicional — 2026-10-22: se desactiva explícitamente herencia de
proxy host en Podman run/build/create con --http-proxy=false, incluida unidad
Quadlet. Nueva prueba con proxy exclusivamente ficticio compara control por
defecto y runtime protegido, sin emitir valores. No cambia el contrato aprobado;
refuerza AC-11 (sin herencia accidental de credenciales/config global). La evidencia
3094563 sigue válida para su SHA; este refuerzo requiere nueva CI íntegra antes
de entregar PR #30 como lista.

## Incidencia actual que impide cerrar AC-22
Run39734977613 / 77e4982 FAILURE: 89 PASS/1 FAIL, timeout_present=false.
Test E1.4 «04 AC22/23/28…», movimientos.test.ts:885:16 / :910:21, hijo de
upgrade v3 con exit no cero. No hay todavía código/causa técnica extraíble de
las anotaciones originales; logs descargables no disponibles en este entorno.
No afirmar relación causal con R6/API histórico ni cierre por CI posterior verde.

9a1dc5d: rootless39735182627 + validate39735182819/39735175707 SUCCESS.
90 API y matriz completa, sin retry. Se inició para probar proxy antes de conocer
el fallo anterior; no constituye su corrección. Imagen actual del run:
sha256:c68706f63c078e1a2acd8295c4f2f8df74b7fe90cb6e8380f8c0ab09f23bda39;
OCI sha256:6201b3cb6525b803626645bcead975e539f870fcf21ae9e380929d4b29053892;
manifiesto b44efae7092013a3bf33568fb8c6eaf8bde077371ba55bd2a858618e04298e06.
Podman4.9.3/systemd255(255.4-1ubuntu8.18)/kernel7.0.0-1017-azure/uidmap1:4.13+dfsg1-4ubuntu3.2.
Canario proxy: se hereda por defecto y queda ausente con --http-proxy=false, PASS.

Observabilidad nueva de infra: reporter E1.4 existente filtrado a operación,
exit, fase, code/errno y fuente permitidos. Se descartan mensajes, stack/argv,
stdout real y campos desconocidos. Filtro probado localmente con canario privado,
PASS. No se modifican tests/lógica financiera, retries ni timeouts. CI posterior
valida ese filtro/documentación, pero no se usa un verde como cierre de la causa.
Requiere diagnóstico/revisión por el agente financiero o autorización técnica
acotada antes de cambiar código fuera de alcance. PR #30 permanece Draft.
