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
