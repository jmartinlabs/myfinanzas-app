# 32 — Ejecución segura con Podman rootless: Specification
Status: APPROVED — D1–D3 y AC-01–AC-24 aprobados; implementación pendiente
Approval source/date: aprobación expresa íntegra del usuario en este chat, 2026-10-22 (Europe/Madrid), tras revisión con Álex de PR #29: D1–D3 y AC-01–AC-24, con precisiones UID/keep-id y rollback incorporadas. Autoriza dev 32 tras cerrar spec; no merge, VPS ni despliegue.
Context and brainstorming: [ronda 1](32-ejecucion-rootless-brainstorming.md),
[roadmap](roadmap.md), [arquitectura](guidelines/architecture.md),
[calidad](guidelines/quality.md), [seguridad](guidelines/security.md), [infra](../infra/README.md).
Base: main 62662e974eb6b9e6724f42ea1f385b569a905714, cierre #28.
Documento completo aprobado en la fecha indicada. No hay evidencia de implementación 32 ejecutada; la publicación provisional siguiente es historia previa a esta aprobación.
Publicación provisional: el usuario autoriza excepcionalmente commit/push de estos
dos documentos y PR en borrador, solo para revisión de Álex. Excepción puntual al
paso 6 del skill spec, sin modificarlo; no autoriza dev 32, merge, VPS ni despliegue.

## Functionality

### Diagnóstico del estado existente

| Evidencia del repositorio | Diagnóstico / consecuencia |
| --- | --- |
| main.ts: BunHttpServer con hostname 127.0.0.1 y port 3001 constantes | Correcto para desarrollo; inaccesible desde publicación NAT del contenedor. Necesita configuración explícita validada, sin ampliar exposición host |
| package.json, .bun-version, bun.lock | Bun 1.4.3 y dependencias directas exactas; falta receta OCI. build genera frontend, no imagen API |
| private-state.ts, production-state.ts, database.ts | Dev 31: v6 production, pareja DB/clave privada, arranque sin CREATE ni regeneración; Linux/glibc/renameat2. Se conserva, no se sustituye por script de arranque |
| infra/myfinanzas-api.container.example | Boceto no activable: digest pendiente, rutas antiguas sin subdirectorio state y sin contrato UID/health/tmpfs/stop; no copiar directamente |
| infra/Caddyfile.example | Boceto SPA y proxy /api; no acredita configuración real, headers ni validación TLS |
| CI validate.yml | API, E2E, tipos/build/controles; no prueba Podman, Quadlet, red ni imagen. Ubuntu CI no acredita VPS Debian |
| infra/README.md | Bloqueo bootstrap histórico resuelto por 31; bind, imagen, UID, HTTPS y operación siguen abiertos. Referencias antiguas Compose/VPS no contratado son historia, prevalece contexto actual rootless |
| investigación R6 y testplan 31 | Causa de fallo concurrente histórico no atribuida. fsync tras rename puede fallar con conjunto completo publicado: no borrar/recrear automáticamente |

Se han leído especificaciones existentes, contexto, roadmap, guidelines y plantillas;
no se han ejecutado pruebas de nueva infraestructura, consultado el VPS ni inspeccionado
sus versiones/UID/filesystem reales. El estado remoto descrito procede del usuario.

### Alcance y división confirmada (D1)

| Fase | Entrega verificable | Gate y límites |
| --- | --- | --- |
| 32 actual | Imagen API + build estático versionados, runtime rootless, Quadlet revisable, ensayos reproducibles en host aislado | Sin instalar unidad remota, publicar imagen ni servir la app en VPS |
| Posterior A, ID por asignar | Release frontend/API coherente, Caddy/HTTPS, SPA/headers/cookies/Origin/CSRF y exposición real | Nueva spec/dev y autorización independiente antes de tocar servidor; validar primero entorno aislado |
| Posterior B, ID por asignar | Backup age externo automatizado, retención, custodia, alertas y simulacro de recuperación | Puede diseñarse independientemente de A; debe completarse antes de uso real. RPO 24h/RTO 2h como objetivos a medir, no SLA probado |
| Activación | Revisión conjunta de A+B, compatibilidad y riesgos operativos, despliegue controlado ficticio | Autorización expresa separada; datos reales/migración requieren otro gate P7 |

32 es técnica transversal, no E1.6 ni cambio al roadmap financiero de 30 entregas.
Dev futuro por incrementos: imagen/build; red y configuración; UID/persistencia;
Quadlet/ciclo de vida; fallos y evidencias. Cada incremento mantiene progress/testplan.

## Data model and contracts

Sin DDL ni cambios al significado financiero. Estado de host de diseño:
`%h/myfinanzas/data/state/{database.sqlite,auth.key}`; mount de la raíz
`data` en `/var/lib/myfinanzas`, con state inicialmente inexistente solo para el
inicializador deliberado de 31. Montar solo DB perdería WAL/SHM y publicación conjunta:
se monta la raíz del estado completa. Respaldos en raíz distinta, no montada rw en API.
Rutas son contrato propuesto, no directorios creados. Evitar ancestros mutables,
symlinks/hardlinks y permisos compartidos; conservar 0700/0600 y propietario efectivo.
No autochown/chmod, flags :U, limpieza destructiva ni inicialización en entrypoint.

Propuesta UID: proceso no root con UID/GID interno fijo 10001 y user namespace
keep-id mapeando al operador host (mfadmin). El número host no se supone 1000;
se registra durante validación autorizada. La sintaxis keep-id:uid/gid y Quadlet
se validarán contra una baseline explícita de Podman/systemd; incompatibilidad es
bloqueo para ese mecanismo, no fallback a root, privilegios o permisos 0777.
Si keep-id con UID 10001 resulta incompatible, documentar evidencia y justificar
una alternativa segura con mapeo explícito al operador, proceso no root y mismos
0700/0600, sin elevar privilegios ni relajar permisos. Verificarla realmente antes
de aceptarla; no dar keep-id por válido solo por sintaxis. Probar stat desde ambos
namespaces y reinicio; no basta que archivos parezcan correctos desde el host.
Los ancestros internos deben pasar las guardas de 31, incluido root del namespace.

Manifiesto no secreto por release: commit fuente, arquitectura objetivo medida,
versiones de Bun/age/OS y digests base, lockfile hash, digest OCI, checksums del
frontend estático, configuración de runtime compatible y esquema soportado (v6).
No contiene rutas personales de datos, tokens ni contenido de DB. API y frontend
son un conjunto: no mezclar dist de otra release durante actualización/rollback.

### Imagen y reproducibilidad

Build multietapa desde Debian/glibc con base por digest y Bun 1.4.3 verificado;
no Alpine/musl, latest ni actualizaciones apt sin fijación. Todas las entradas externas
identificadas (snapshot/paquetes OS, age y checksums) y arquitectura explícita.
Instalación bun.lock congelada; fuentes de commit limpio. Excluir por allowlist de
contexto y revisión .local, DB/WAL/SHM, .env, claves, Excel, artefactos, .git y tests
no necesarios en runtime. No secretos en ARG/ENV/capas ni build con datos.
Runtime con dependencias de producción; no Vite dev/watch. Frontend generado y
exportado como artefacto estático, para posterior servicio por Caddy host.
CLI age en la imagen fijada para tareas deliberadas de backup/restore, no scheduler.

Dos builds limpios con mismos inputs y plataforma deben producir iguales hashes
de aplicación/dist/dependencias y rootfs normalizado. Registrar herramienta,
SOURCE_DATE_EPOCH y metadatos OCI: si digest de imagen difiere por timestamp o
provenance, justificar exactamente esa diferencia sin afirmar identidad bit a bit.
Diferencias no explicadas en payload bloquean aceptación. Cambiar un input exige
nueva release y validación; no conservar etiquetas mutables como identificador operativo.
D3 confirma archivo OCI privado, imagen versionada y manifiesto verificable que empareja backend/frontend; no registro, publicación de imágenes ni despliegue automático.

## Screens and interfaces

N/A nuevas pantallas/wireframes. Interfaz de operador: build/export/inspect, inicializar
explícitamente mediante CLI 31 en un contenedor efímero y misma imagen/UID/mount,
arrancar/parar/status/logs saneados y seleccionar release. El runtime nunca inicializa.
Alta privada con CLI 31 y archivo 0600; no tokens por exec stdout, env ni argumentos.

Quadlet futuro de usuario: imagen por digest/ID inmutable verificado al cargar OCI,
red rootless aislada, PublishPort=127.0.0.1:18081:3001, sin host network ni podman
socket, privileged, capabilities extra, dispositivos o mounts de host amplios.
Rootfs readonly, NoNewPrivileges, capabilities drop-all, seccomp por defecto,
mount persistente mínimo rw; tmpfs privado acotado para temporales, propietario
correcto y sin ejecución si la compatibilidad queda probada. Límites propuestos:
MemoryMax 1 GiB, CPUQuota 100%, TasksMax 128, tmpfs 64 MiB; verificar Argon2 y
operación real, sin OOM aceptado ni promesa de dimensionamiento final del VPS.
No mover claves a tmpfs ni claves de recuperación a contenedor API.

Contrato propuesto de bind: API_BIND_HOST admite solo 127.0.0.1 (default local) o
0.0.0.0 (opt-in para namespace de contenedor); vacío/desconocido/hostname ajeno
rechaza antes de abrir DB o servir. Puerto interno 3001 constante. Opt-in no expone
host: publicación solo IPv4 loopback; IPv6/exposición externa debe resultar ausente.
Nunca derivar bind/origen desde headers. No usar host network para evitar esta regla.

Interfaz de integración posterior, incluida en 32 (D1): HTTP host
`127.0.0.1:18081` → puerto publicado de Podman rootless → API `3001` del
contenedor con bind explícito `0.0.0.0`. La prueba futura deberá iniciar el proceso
API real y solicitar desde el host `http://127.0.0.1:18081/api/health`: comprobar
200 y JSON del contrato existente, y 401 en ruta financiera sin sesión. Registrar
versiones, mapeo de puerto y resultados saneados; al parar el contenedor la petición
debe fallar. No sirve una petición mediante podman exec o directamente a la IP
interna, porque eludiría la publicación que debe verificarse. Comprobar también
que desde una red externa al loopback host no es accesible. Esta prueba resuelve
el defecto de bind en dev futuro, sin ejecutar Podman ni modificar main.ts en spec.
No acredita Caddy, TLS, cookies HTTPS ni despliegue real, reservados a otra fase.


Variables no secretas explícitas: NODE_ENV=production, APP_ORIGIN HTTPS,
DATABASE_PATH y AUTH_KEY_PATH acordadas, API_BIND_HOST. Config de operador privada,
no generada desde env global accidental. Clave auth solo archivo persistente 0600;
secreto age de restore solo acceso efímero mínimo, no ENV/argv ni imagen ni mount
permanente de API. Logs/inspect/health no muestran secretos ni payload financiero.
No introducir APIs administrativas, cuenta demo ni health autenticado con credencial.

## Empty, loading and error states

Estado no inicializado: runtime falla sin crear DB/clave/directorios. Estado inicializado
sin propietario: health disponible tras abrir conjunto válido; no concede acceso financiero.
Health existente /api/health solo acredita proceso HTTP, no backup, HTTPS o recuperación;
readiness exige además apertura validada en arranque y prueba funcional protegida.
Health interno mediante cliente Bun fijado, timeout y reintentos acotados; no instalar
curl sin necesidad ni consultar frontend como salud API. Propuesta: intervalo 30s,
timeout 3s, tres fallos, gracia inicial 30s. Reinicio on-failure con backoff 5s y
start-limit 3/60s; comprobar interacción real de health con systemd, sin restart loop
infinito ni borrar estado. Logs técnicos con categorías/correlación, sin SQL/factores.
Fallo de configuración/clave/versión bloquea servicio; no reparar ni fallback demo.

## API behavior and external dependencies

No cambios API financieros, MFA, CSRF ni UI. Solo configuración de arranque técnica.
Parada: Bun/Effect recibe SIGTERM como PID principal (exec, sin shell que lo oculte),
cierre scoped SQLite; timeout propuesto 30s antes de SIGKILL. Verificar proceso,
puerto y reapertura; no afirmar durabilidad frente a pérdida física del disco.
Quadlet/systemd de usuario con linger sería requisito operativo para arranque sin
sesión, sujeto a revisión y permiso remoto; no se activa ahora.

D2: mantenimiento y único escritor; detener/verificar instancia anterior antes de
activar nueva. No auto-update, nunca dos versiones activas sobre mismo estado.
Validar imagen/manifiesto/salud antes de declarar release; conservar anterior.
Rollback de binario exclusivamente con compatibilidad demostrada del esquema
SQLite, contrato de datos y autenticación entre la versión anterior y la nueva.
La matriz de versiones y pruebas cruzadas deben cubrir lectura/escritura, invariantes
de datos, cifrado/clave, contraseña/TOTP y sesiones/revocaciones según sus contratos,
preservando las escrituras confirmadas tras actualizar. Usar estado actual sin
perder escrituras. Si incompatible: detener y pedir recuperación explícita; no
abrir con imagen antigua a la fuerza ni sustituir DB por copia anterior automáticamente.
Restore 31 a destino nuevo, con comprobación de identidad/clave, revocación de accesos
y aceptación explícita del corte/pérdida potencial; conservar original sin sobrescritura.

Caddy/HTTPS posterior: frontend estático emparejado, /api sin SPA fallback, cookies
Secure/host-only, Origin/CSRF, no-store, CSP/headers, rate limit borde y puerto API
no alcanzable externamente. Página placeholder intacta hasta autorización de activación.
Backups posteriores: age coherente con WAL, copia externa independiente, retención
7 diarias/4 semanales/3 mensuales, custodia off VPS, alertas sin secretos, prueba de
restauración/lectura+MFA y medición RPO/RTO. Scheduler/cifrado de disco/proveedor
externo y costes requieren concretar esa fase; aprobar 32 no los decide.

## Validation and edge cases

Ensayos futuros en Linux aislado con rootless Podman y systemd de usuario real:
si el entorno/CI no ofrece esa capacidad, registrar bloqueo, usar runner/VM aislado
aprobado o pedir capacidad; mocks/lint no sustituyen prueba Quadlet/reinicio.
CI conserva todas las comprobaciones actuales y añade pruebas de imagen/rootless;
no privilegios del workflow general ni ejecución privilegiada de PR no confiable.
Si se necesita runner dedicado, revisar aislamiento/permisos y limpieza antes de usarlo.
Pruebas sintéticas no financial reales, claves efímeras no publicadas, logs saneados.

Probar WAL con transacción confirmada y checkpoint deshabilitado; comparar filas
tras restart/kill, integridad/FK y pareja de clave, no asumir correcto por health.
No copiar DB abierta a ciegas ni eliminar WAL/SHM para facilitar arranque.
Symlink/hardlink/permisos inválidos deben seguir rechazándose dentro del namespace.
Fallo fsync posterior a rename: preservar conjunto, salir con error y pedir inspección;
no retry automático destructivo. R6 sigue abierto hasta evidencia de causa/solución;
si falla suite, analizar diagnóstico y detener, sin suavizar assertions/retries.

## Exclusions

Durante spec: solo estos borradores; no Containerfile, scripts, Quadlet activable,
CI nueva, cambios a main.ts ni flags de producción. En dev futuro: no VPS ni Caddy
activo, publicación de imagen, backups externos automatizados o migración de esquema,
importación Excel/datos reales, lógica financiera, Dev 31 reabierto sin incompatibilidad,
E1.6, PR #21/#22 ni despliegue. Otras fases necesitan su propia spec/aprobación/dev.
No alta disponibilidad, cero downtime ni garantía contra root/UID malicioso.

## Acceptance checks
Todos **PENDING / NO EJECUTADOS** para 32. Son resultados futuros exigidos, no
cobertura ya aportada por 31. D1–D3 y el conjunto de esta especificación aprobados; pruebas pendientes de dev.

| ID | Action / preconditions | Expected observable result |
| --- | --- | --- |
| AC-01 | Revisar release y reconstruir desde commit limpio con inputs fijados | Manifiesto fuente/lock/base/Bun/age/OS/plataforma completo; ningún latest ni apt no fijado |
| AC-02 | Repetir dos builds limpios sin caché con inputs/plataforma iguales | Hashes de payload iguales; diferencias de metadatos OCI explícitas, ninguna diferencia de contenido sin explicar |
| AC-03 | Inspeccionar contexto, capas, history, entorno y archivos de imagen/artefactos | Sin secretos, DB/sidecars, Excel, datos reales ni directorios de desarrollo; comprobación con canarios sintéticos que detecte inclusión accidental |
| AC-04 | Ejecutar imagen por digest/ID verificado y servir CLI/API | Bun fijado, glibc/renameat2/age compatibles; runtime sin Vite ni watch; dist exportado coincide con manifiesto |
| AC-05 | Ensayar UID host distinto de 10001 con keep-id y stat desde ambos lados | Compatibilidad real UID 10001/keep-id y volúmenes demostrada; si es incompatible, alternativa segura justificada y probada, proceso no root y state 0700/archivos 0600 del efectivo; sin elevar privilegios, relajar permisos, chown/chmod automático ni :U |
| AC-06 | Crear estado mediante CLI 31 efímera y reabrir runtime | Inicialización explícita única DB+clave coherente; no fixtures; S000 únicamente, sin usuario; runtime no inicializa |
| AC-07 | Arrancar sin DB/clave, con demo/legacy, clave errónea o permisos/enlaces inválidos | Exit no cero sin regenerar/fallback/sembrar/reparar; archivos previos intactos |
| AC-08 | Reiniciar contenedor con rootfs readonly y mounts mínimos | Escritura solo en state/tmpfs previstos; sin socket Podman/privilegios/caps extra; límites efectivos y sin OOM en smoke |
| AC-09 | Comprobar bind default y opt-in, e inyectar configuración inválida | Local permanece 127.0.0.1; contenedor 0.0.0.0 solo explícito; inválido rechaza antes de abrir DB |
| AC-10 | Iniciar imagen API real en Podman rootless con opt-in de bind y publicación 127.0.0.1:18081:3001; enviar HTTP desde el host al puerto publicado; inspeccionar sockets y probar desde otra red | GET /api/health devuelve 200 y JSON esperado a través del puerto publicado; ruta financiera sin sesión devuelve 401; detener contenedor corta comunicación. Sin API pública/IPv6 wildcard ni host network; no basta podman exec, mocks o inspección de configuración |
| AC-11 | Validar configuración y canarios en logs/inspect/env/history | Solo valores no secretos; clave auth por archivo, identidades de recuperación fuera de API permanente; canarios secretos ausentes |
| AC-12 | Arrancar health válido, estado sin propietario y simular caída | Salud sin datos/factores; no acceso financiero sin MFA; timeout/restart y start-limit observables y acotados |
| AC-13 | Generar y ejecutar Quadlet en systemd de usuario aislado; stop/start de sesión/servicio | Unidad real rootless reproducible, dependencia/linger documentados; no root service; baseline Podman/systemd registrada |
| AC-14 | Escribir fixture con WAL sin checkpoint y recrear contenedor | DB/WAL/SHM en mismo volumen; datos confirmados/IDs/auditoría/clave persisten; integrity/FK correctos |
| AC-15 | Parar con SIGTERM durante uso y repetir tras SIGKILL con commit confirmado | Cierre scoped, puerto liberado y reapertura íntegra; sin perder commits confirmados ni borrar sidecars a mano |
| AC-16 | Dos arranques/inicializadores compiten en entorno rootless | Garantías 31 conservadas, sin sobrescritura ni doble clave; único servicio escritor activo según runbook |
| AC-17 | Inyectar ENOSPC y fallo fsync antes/después de publicación | Error sin aceptar pareja parcial; post-rename preserva conjunto válido y declara durabilidad incierta, sin borrar/recrear |
| AC-18 | Demostrar compatibilidad de esquema SQLite, contrato de datos y autenticación entre versiones; actualizar release y volver a anterior compatible tras nuevas escrituras confirmadas | Mantenimiento controlado, único escritor, frontend/API emparejados; todas las escrituras confirmadas conservadas, contratos de datos y autenticación comprobados en ambas versiones; no rollback/restauración automática incompatible |
| AC-19 | Intentar rollback incompatible/manifiesto corrupto o restore sobre destino existente | Bloqueo sin modificar estado; recuperación solo explícita a destino nuevo conforme a 31 |
| AC-20 | Crear backup con WAL y restaurar en conjunto nuevo mediante imagen/UID acordados | Integridad/identidad/clave/MFA válidos, revocaciones 31 y no restauración parcial; no copias externas alegadas |
| AC-21 | Ejecutar pruebas infraestructura en runner/VM rootless + systemd real | Evidencia de comandos/versiones/resultados, sin omisiones ocultas ni equivalencia de mocks; limpieza limitada a fixtures propios |
| AC-22 | Ejecutar suites existentes, tipos/build y controles del proyecto | Todo PASS; R6 falla de forma visible si reaparece; no retries/omisión ni cambio financiero para ocultarlo |
| AC-23 | Revisar runbook de inicio/parada/update/rollback y límites de datos | Operaciones deliberadas, paths/UID/mount coherentes, secretos fuera de argumentos y pasos no destructivos ante fallo |
| AC-24 | Revisar matriz de gates con A/B/activación y riesgos R6/fsync | 32 no declara VPS listo; HTTPS, offsite, custodia, recuperación y autorización de despliegue permanecen explícitos |
