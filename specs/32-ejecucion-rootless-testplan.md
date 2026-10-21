# 32 — Ejecución rootless: Test plan
Specification: [contrato aprobado](32-ejecucion-rootless-specification.md)

| Acceptance ID | Preconditions and action | Expected result | Automated/manual method and command | Actual result / status | Run date / evidence |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Revisar release y reconstruir desde commit limpio con inputs fijados | Manifiesto fuente/lock/base/Bun/age/OS/plataforma completo; ningún latest ni apt no fijado | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-02 | Repetir dos builds limpios sin caché con inputs/plataforma iguales | Hashes de payload iguales; diferencias de metadatos OCI explícitas, ninguna diferencia de contenido sin explicar | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-03 | Inspeccionar contexto, capas, history, entorno y archivos de imagen/artefactos | Sin secretos, DB/sidecars, Excel, datos reales ni directorios de desarrollo; comprobación con canarios sintéticos que detecte inclusión accidental | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-04 | Ejecutar imagen por digest/ID verificado y servir CLI/API | Bun fijado, glibc/renameat2/age compatibles; runtime sin Vite ni watch; dist exportado coincide con manifiesto | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-05 | Ensayar UID host distinto de 10001 con keep-id y stat desde ambos lados | Compatibilidad real UID 10001/keep-id y volúmenes demostrada; si es incompatible, alternativa segura justificada y probada, proceso no root y state 0700/archivos 0600 del efectivo; sin elevar privilegios, relajar permisos, chown/chmod automático ni :U | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-06 | Crear estado mediante CLI 31 efímera y reabrir runtime | Inicialización explícita única DB+clave coherente; no fixtures; S000 únicamente, sin usuario; runtime no inicializa | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-07 | Arrancar sin DB/clave, con demo/legacy, clave errónea o permisos/enlaces inválidos | Exit no cero sin regenerar/fallback/sembrar/reparar; archivos previos intactos | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-08 | Reiniciar contenedor con rootfs readonly y mounts mínimos | Escritura solo en state/tmpfs previstos; sin socket Podman/privilegios/caps extra; límites efectivos y sin OOM en smoke | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-09 | Comprobar bind default y opt-in, e inyectar configuración inválida | Local permanece 127.0.0.1; contenedor 0.0.0.0 solo explícito; inválido rechaza antes de abrir DB | NODE_ENV=test bun test apps/api/src/server-config.test.ts | PARTIAL: bind de proceso verificado; contenedor pendiente | 2026-10-22; progress 32 |
| AC-10 | Iniciar imagen API real en Podman rootless con opt-in de bind y publicación 127.0.0.1:18081:3001; enviar HTTP desde el host al puerto publicado; inspeccionar sockets y probar desde otra red | GET /api/health devuelve 200 y JSON esperado a través del puerto publicado; ruta financiera sin sesión devuelve 401; detener contenedor corta comunicación. Sin API pública/IPv6 wildcard ni host network; no basta podman exec, mocks o inspección de configuración | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-11 | Validar configuración y canarios en logs/inspect/env/history | Solo valores no secretos; clave auth por archivo, identidades de recuperación fuera de API permanente; canarios secretos ausentes | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-12 | Arrancar health válido, estado sin propietario y simular caída | Salud sin datos/factores; no acceso financiero sin MFA; timeout/restart y start-limit observables y acotados | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-13 | Generar y ejecutar Quadlet en systemd de usuario aislado; stop/start de sesión/servicio | Unidad real rootless reproducible, dependencia/linger documentados; no root service; baseline Podman/systemd registrada | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-14 | Escribir fixture con WAL sin checkpoint y recrear contenedor | DB/WAL/SHM en mismo volumen; datos confirmados/IDs/auditoría/clave persisten; integrity/FK correctos | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-15 | Parar con SIGTERM durante uso y repetir tras SIGKILL con commit confirmado | Cierre scoped, puerto liberado y reapertura íntegra; sin perder commits confirmados ni borrar sidecars a mano | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-16 | Dos arranques/inicializadores compiten en entorno rootless | Garantías 31 conservadas, sin sobrescritura ni doble clave; único servicio escritor activo según runbook | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-17 | Inyectar ENOSPC y fallo fsync antes/después de publicación | Error sin aceptar pareja parcial; post-rename preserva conjunto válido y declara durabilidad incierta, sin borrar/recrear | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-18 | Demostrar compatibilidad de esquema SQLite, contrato de datos y autenticación entre versiones; actualizar release y volver a anterior compatible tras nuevas escrituras confirmadas | Mantenimiento controlado, único escritor, frontend/API emparejados; todas las escrituras confirmadas conservadas, contratos de datos y autenticación comprobados en ambas versiones; no rollback/restauración automática incompatible | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-19 | Intentar rollback incompatible/manifiesto corrupto o restore sobre destino existente | Bloqueo sin modificar estado; recuperación solo explícita a destino nuevo conforme a 31 | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-20 | Crear backup con WAL y restaurar en conjunto nuevo mediante imagen/UID acordados | Integridad/identidad/clave/MFA válidos, revocaciones 31 y no restauración parcial; no copias externas alegadas | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-21 | Ejecutar pruebas infraestructura en runner/VM rootless + systemd real | Evidencia de comandos/versiones/resultados, sin omisiones ocultas ni equivalencia de mocks; limpieza limitada a fixtures propios | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-22 | Ejecutar suites existentes, tipos/build y controles del proyecto | Todo PASS; R6 falla de forma visible si reaparece; no retries/omisión ni cambio financiero para ocultarlo | bun run typecheck/build/test/test:e2e y controles documentales/repositorio | PASS local: 86 API / 1319 assertions; 2 E2E, tipos/build/controles; CI en PR | 2026-10-22; progress 32 |
| AC-23 | Revisar runbook de inicio/parada/update/rollback y límites de datos | Operaciones deliberadas, paths/UID/mount coherentes, secretos fuera de argumentos y pasos no destructivos ante fallo | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |
| AC-24 | Revisar matriz de gates con A/B/activación y riesgos R6/fsync | 32 no declara VPS listo; HTTPS, offsite, custodia, recuperación y autorización de despliegue permanecen explícitos | Ensayo futuro real según acción; sin ejecutar ni sustituir por mocks | UNRUN / BLOCKED: entorno rootless+systemd pendiente | 2026-10-22; progress 32 |

## Regression checks
2026-10-22: typecheck/build PASS, API completa 86 PASS / 1319 assertions,
sin omisiones ni retries para conseguir verde. Pruebas nuevas: 3 PASS / 28 assertions.
Playwright 2/2 PASS (47.0s), secuencial tras API. CI del SHA definitivo en PR de implementación.
Las CI de spec a4de2e1 son SUCCESS pero no acreditan implementación posterior.

## Functional verification
Procesos API reales default y 0.0.0.0: health 200/{ok:true}, financiero sin sesión
401, rechazo de bind inseguro sin crear SQLite y conexión cerrada tras SIGTERM.
No comunicación mediante puerto publicado Podman: AC-10 sigue bloqueado.

## Browser verification (web only)
Regresión Playwright existente 2/2 PASS (47.0s), 390/1440. Inspeccionadas capturas
artifacts/e1-5/transfer-form-mobile.png y reference-list-desktop.png (ignoradas):
jerarquía/etiquetas legibles, foco visible, sin overflow horizontal. Contraste y
teclado según assertions existentes; no nueva auditoría WCAG. Sin pantallas nuevas.

## Visual improvements (visual apps only)
Ninguna: incremento de bind sin cambios UI/CSS. No se justifican cinco mejoras
cosméticas ajenas al alcance ni nuevas afirmaciones de accesibilidad por este cambio.

## Limitations and next action
No aceptación completa de 32: se necesitan Podman rootless, namespaces/subuids,
systemd de usuario y cgroup delegado para imagen/UID/volúmenes/publicación/Quadlet,
fallos y rollback cruzado de datos/autenticación. Ver diagnóstico en progress.
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
