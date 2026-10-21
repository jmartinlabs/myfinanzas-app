# 32 — Ejecución rootless: Progress
Specification: [contrato aprobado](32-ejecucion-rootless-specification.md)
Current state: IN PROGRESS / BLOCKED para infraestructura real; no entrega completa

| Task | Status | Commit / evidence |
| --- | --- | --- |
| Cerrar spec aprobada, precisiones UID y rollback | done | a4de2e1; PR #29 lista, CI push/PR SUCCESS; sin merge |
| Bind explícito validado antes de SQLite | verified local | server-config.ts y tres pruebas de procesos reales; AC-09 parcial |
| Imagen reproducible y manifiesto privado OCI/backend/frontend | blocked | Falta entorno de ensayo rootless+systemd validado; no receta declarada verificada |
| UID 10001/keep-id y volúmenes | blocked | No Podman/newuidmap ni user manager/cgroup delegable disponibles aquí |
| Publicación de puerto Podman / AC-10 | blocked | HTTP de proceso local no acredita mapeo rootless |
| Quadlet, WAL/SHM, fallos, update/rollback cruzado | blocked | Necesitan ejecución real en runner/VM aislado; no mocks como evidencia |
| Regresión local y PR independiente | local verified / CI pendiente | 86 API PASS / 1319 assertions; 2 E2E PASS (47.0s); tipos/build/controles PASS |

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
aún sin integrar; su diff efectivo se revisa contra a4de2e1. No merge autorizado.

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
Habilitar entorno aislado de ensayo compatible y continuar imagen/UID/publicación/
Quadlet/rollback cruzado. La PR de implementación debe seguir Draft e incompleta.
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
