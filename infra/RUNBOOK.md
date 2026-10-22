# Operación rootless 32 — preparación, sin activación

Este documento no autoriza ejecutar comandos en el VPS. La validación se realiza
en runner efímero ubuntu-24.04; Debian 13, Caddy y almacenamiento reales requieren
otra fase y autorización. No copiar plantillas al servidor ni cambiar su página.

## Paquete privado y confianza

Con checkout limpio, commit revisado y Podman rootless compatible:
`python3 infra/release.py build --ref COMMIT --output /ruta/privada/release-nueva`.
El destino debe ser nuevo, absoluto y bajo un ancestro privado controlado. No usar
sudo, registros, secretos, Excel ni estado de aplicación como contexto. El builder
materializa solo fuentes permitidas desde Git, no el directorio de trabajo.

Bun 1.4.3/Debian se fija por digest; bun.lock congela dependencias y se deshabilitan
scripts de instalación. age 1.3.2 linux/amd64 tiene checksum fijado. El manifiesto
registra fuente, receta, lock, base, plataforma, OS, versiones, imagen, digest OCI,
checksums de frontend y dos builds sin caché. El payload normalizado excluye tiempos
y archivos host generados por Podman; diferencias inexplicadas bloquean aceptación.
No equivale a prometer archivo OCI idéntico byte a byte ni disponibilidad perpetua
de descargas. No ampliar arquitectura sin nueva validación.

La carpeta contiene `image.oci.tar`, `frontend/`, `manifest.json` y
`manifest.sha256`; permanece privada y no se publica como artifact de CI.
Transportar solo por canal privado autorizado en una fase posterior. Obtener el
SHA del manifiesto y commit esperado de una fuente revisada independiente:
`python3 infra/release.py verify /ruta/privada/release --expected-commit COMMIT --expected-manifest-sha256 SHA`.
Un checksum recibido junto a archivos manipulados no autentica a su autor.
Verificar antes de `podman load --input /ruta/privada/release/image.oci.tar`;
seleccionar después el ID inmutable del manifiesto, nunca una etiqueta mutable.
Conservar backend y frontend como conjunto, también al volver a versión anterior.

## Preflight y almacenamiento

Ejecutar `python3 infra/tests/rootless-preflight.py` únicamente en host de ensayo
autorizado: UID no root, subuid/subgid, namespaces Podman reales, cgroup v2 y
manager systemd --user operativo/delegado. Registrar versiones. Ubuntu efímero no
acredita Debian 13 del VPS. En la futura instalación revisar linger con
`loginctl show-user USUARIO -p Linger`; habilitarlo requiere autorización de esa fase.
No confundir restart de servicio con reboot o logout real del servidor.

Contrato: UID/GID interno 10001, `keep-id:uid=10001,gid=10001` mapea al operador
host aunque su UID sea distinto. La raíz de datos del operador es 0700; el mount
completo es `/var/lib/myfinanzas`, con `state/` 0700 y DB/clave/WAL/SHM 0600.
No montar solo el archivo SQLite. Ancestros seguros y propietario efectivo según
las guardas de Dev 31. No :U, chmod/chown reparadores, symlinks/hardlinks, permisos
compartidos, socket Podman, dispositivos o privilegios. Si el mapeo no funciona,
detenerse: ninguna alternativa está autorizada sin demostración y revisión.

En destino nuevo, la inicialización es una tarea deliberada y efímera con la misma
imagen/UID/mount y `NODE_ENV=production`, `APP_ORIGIN`, `DATABASE_PATH` y
`AUTH_KEY_PATH` explícitos. Ejecutar `bun apps/api/src/production-init.ts` como
comando del contenedor endurecido; no es entrypoint. `state` debe ser inexistente;
no borrar uno previo para que funcione. La publicación conjunta DB/clave es la de
31. El arranque normal nunca crea estado, demo ni claves. Alta del propietario:
CLI `setup.ts` con archivo privado 0600, nunca mostrar token en stdout/env/argv.
Custodiar su archivo y seguir el procedimiento de alta HTTPS en la fase A.

## Unidad y salud

`infra/runtime.py:render` genera texto revisable, no instala ni arranca unidades.
`infra/myfinanzas-api.container.example` muestra el contrato. La instalación
posterior deberá sustituir ID y ruta con un manifiesto verificado y llamar a
`render` sobre la raíz privada validada. Revisar el texto antes de activar.

Quadlet de usuario: red aislada, publicación solo `127.0.0.1:18081:3001`, bind
interno explícito `0.0.0.0`. Caddy futuro consume HTTP en loopback, no IP interna.
No hay listener IPv6 ni wildcard host. Rootfs readonly, cap-drop-all,
no-new-privileges, seccomp por defecto, memoria 1 GiB, CPU 1, pids 128. `/tmp` es
0711 de root del namespace, no escribible por la aplicación; tmpcopyup conserva
`/tmp/private` 0700 del UID 10001, TMPDIR allí, tmpfs 64 MiB noexec/nosuid/nodev.
No permitir ejecución ni ampliar permisos para arreglar temporales.

Solo variables no secretas explícitas en unidad/configuración privada: NODE_ENV,
APP_ORIGIN HTTPS, rutas DB/clave y bind. No heredar env global accidentalmente.
Clave auth solo archivo persistente; identidades age nunca en API permanente.
No añadir passwords, factores, secretos en ENV/ARG/history ni logs. Logs técnicos
se inspeccionan de forma privada/saneada, nunca publicando objetos financieros.

Health usa Bun fijado: GET /api/health, 200 y JSON `{ "ok": true }`, timeout
interno 2s, health timeout 3s, intervalo 30s, tres fallos, gracia 30s.
HealthOnFailure kill se integra con Restart=on-failure, backoff 5s y máximo tres
arranques por 60s. Startup/configuración inválida debe terminar en start-limit,
sin reparar estado. Salud no acredita backup, HTTPS ni recuperación. Readiness:
arranque valida pareja productiva, petición host al puerto publicado y 401 en
ruta protegida sin sesión. Mantenimiento debe impedir tráfico antes de parar.

## Parada, actualización y rollback

En instalación futura autorizada, usar `systemctl --user stop UNIDAD` y comprobar
inactive, ausencia del contenedor/puerto y ningún escritor antes de tareas offline.
SIGTERM llega a Bun como PID principal; TimeoutStopSec=30, después SIGKILL.
Nunca borrar WAL/SHM manualmente ni copiar solo DB activa. No auto-update.

1. Seleccionar paquete íntegro, revisar cambios y matriz de compatibilidad del par
   exacto de imágenes. Verificar esquema **y** contratos de datos y autenticación.
2. Activar mantenimiento y parar/verificar escritor anterior. Preparar backup
   cifrado deliberado conforme a 31, sin sobrescribir copias ni montar identidad
   age permanentemente. Registrar corte; conservar imagen, frontend y estado.
3. Revisar nueva unidad por ID; cambiar backend/frontend juntos. Arrancar y validar
   salud, autenticación y escrituras sintéticas acordadas. No abrir una segunda
   versión simultáneamente sobre ese estado. Ante fallo: detener y diagnosticar.
4. Rollback solo al par exacto con prueba cruzada reproducible: escrituras de la
   versión nueva legibles y conservadas en anterior, invariantes y auditoría,
   clave/cifrado, contraseña/TOTP, sesiones y recovery compatibles. La coincidencia
   de schema_version o un nombre de contrato no son prueba suficiente. Usar estado
   **actual**, sin reemplazarlo por backup y sin revertir migraciones a la fuerza.
5. Sin evidencia, esquema/datos/auth incompatibles o manifiesto corrupto: bloquear
   antes de abrir DB y solicitar decisión. No rollback automático ni restauración
   automática. El ensayo b0bc5a7→release actual solo vale para ese par; no habilita
   versiones futuras por coincidencia de etiquetas.

## Backup, restauración y fallos parciales

Usar CLI backup/restore de la misma imagen y UID en tareas efímeras endurecidas,
con los mounts mínimos necesarios. Destinatario age público revisado; identidad
privada solo archivo 0600 en mount temporal readonly separado. No transportarla
en env ni imprimirla. Backup cifra snapshot SQLite coherente y clave en paquete
nuevo; nunca copiar DB/WAL por separado ni incluir recovery/session en evidencia.

Restore es explícito a directorio nuevo, con pareja/identidad/integridad/FK
verificadas y revocación de sesiones/challenges/recovery/bootstrap. Verificar
contraseña+MFA y nuevos recovery codes de forma privada. Conservar original;
no sobrescribir estado. La aceptación de un corte con posible pérdida de datos
requiere autorización propia, no la da un rollback de binarios.

ENOSPC/fsync previos a publicar deben fallar sin aceptar estado parcial. Si falla
fsync **después** de rename puede quedar conjunto completo válido publicado con
durabilidad incierta: preservar, inspeccionar y escalar; no borrar/recrear/reintentar
ciegamente. Ningún ensayo prueba supervivencia a pérdida física de energía/disco.
R6 permanece residual; el fallo API histórico de run 39687644407 sigue sin causa
diagnosticada. No atribuirlo a #31 ni cerrarlo porque otras CI pasen. Sin reintentos,
omisiones o relajación de pruebas para obtener verde.

## Gates posteriores, independientes de 32

| Fase | Evidencia exigida antes de activar | Restricción |
| --- | --- | --- |
| A: Caddy/HTTPS | Frontend emparejado, proxy /api sin SPA fallback, CSP/headers/cache, Origin/CSRF/cookies Secure y prueba navegador HTTPS; puerto privado real | Nueva spec/dev y autorización antes de tocar VPS/Caddy; placeholder intacto |
| B: recuperación externa | Backup age externo independiente, scheduler/alertas, retención 7 diarias/4 semanales/3 mensuales, custodia off-VPS, simulacro con MFA y RPO24h/RTO2h medidos | Nueva spec/dev, proveedor/coste/custodia decididos; cifrado no sustituye copia externa |
| Activación | A+B, preflight Debian/UID/filesystem reales, compatibilidad y riesgos aceptados, ensayo ficticio y plan de corte | Autorización expresa separada para acceso y despliegue |
| Datos reales | Migración/validación financiera P7 y autorización específica | Excel sigue maestro; este agente no importa ni modifica funcionalidad financiera |

Comandos solo de preparación:
`python3 infra/release.py render-unit /release --expected-commit COMMIT --expected-manifest-sha256 SHA --data /racine/privee`
imprime la unidad sin instalarla. El control
`python3 infra/release.py rollback-check --previous /ancienne --previous-commit ANCIEN --previous-manifest-sha256 SHA1 --current /nouvelle --current-commit NOUVEAU --current-manifest-sha256 SHA2 --proof /preuve-revue.json`
rechaza pares no demostrados sin abrir DB. La prueba no secreta debe contener
previous_source/current_source/previous_image/current_image exactos y
schema/data/authentication/confirmed_writes=true, obtenidos del ensayo real y
revisados en CI; ese JSON no es una firma ni sustituye revisar los resultados.
Ningún control ejecuta un rollback.

## Ejemplo de tarea deliberada (solo futuro host de ensayo autorizado)

No ejecutar en VPS ni sobre un estado previo. Tras verificar paquete, ID y raíz
privada nueva, el comando de inicialización equivalente al probado es:

```sh
MF32_IMAGE=sha256:ID_VERIFICADO_DE_64_HEX
MF32_DATA=/ruta/privada/data
podman run --rm --pull=never --http-proxy=false --network=none \
  --userns=keep-id:uid=10001,gid=10001 --user=10001:10001 \
  --cap-drop=all --security-opt=no-new-privileges \
  --read-only --read-only-tmpfs=false --memory=1g --cpus=1 --pids-limit=128 \
  --tmpfs=/tmp:rw,noexec,nosuid,nodev,tmpcopyup,mode=0711,size=64m \
  --volume="$MF32_DATA:/var/lib/myfinanzas:rw" \
  --env=NODE_ENV=production --env=APP_ORIGIN=https://myfinanzas.pp.ua \
  --env=DATABASE_PATH=/var/lib/myfinanzas/state/database.sqlite \
  --env=AUTH_KEY_PATH=/var/lib/myfinanzas/state/auth.key \
  "$MF32_IMAGE" apps/api/src/production-init.ts
```

Mismos flags/imagen para `apps/api/src/setup.ts /var/lib/myfinanzas/state/alta.txt`:
archivo nuevo, privado, nunca mostrar su contenido ni versionarlo. Para backup,
`apps/api/src/backup-cli.ts create /backup/COPIA_NUEVA DESTINATARIO_PUBLICO_AGE`,
con raíz de backups privada adicional montada rw en `/backup` solo en esa tarea.
Para restore, `apps/api/src/backup-cli.ts restore /backup/COPIA /var/lib/myfinanzas/NUEVO /run/keys/identity`,
montar la copia readonly, identidad 0600 readonly solo en `/run/keys/identity` y
configurar DATABASE_PATH/AUTH_KEY_PATH bajo `NUEVO`; ese directorio debe no existir.
No reutilizar rutas de ejemplo como si fueran destinos verificados. Nunca montar
la identidad ni raíz de backups en la API permanente. Los comandos CLI de 31 no
han cambiado; revisar también [instrucciones de persistencia](../README.md).

En instalación posterior autorizada, `systemctl --user daemon-reload`,
`systemctl --user start myfinanzas-api.service`,
`systemctl --user show myfinanzas-api.service -p ActiveState -p NRestarts -p Result`
y `systemctl --user stop myfinanzas-api.service` operan la unidad revisada.
Comprobar HTTP host `/api/health` y 401 en ruta protegida, y puerto inaccesible tras
stop. No ejecutar `reset-failed` repetidamente para eludir un start-limit: primero
diagnosticar y corregir la causa sin modificar ni regenerar el estado.

La unidad y tareas deshabilitan explícitamente `--http-proxy=false`: Podman
hereda proxies del host por defecto y podrían contener credenciales. El ensayo
inyecta solo un proxy ficticio en el entorno host, observa el comportamiento por
defecto y exige ausencia del canario con el flag. No se imprimen variables ni
valores; no se utiliza un proxy real. Build/create y tareas de inspección también
desactivan esa herencia. Si una red futura necesita proxy, parar y definir su
tratamiento seguro antes de introducir credenciales en ARG/ENV/capas/logs.
