# 31 — SQLite producción: Test plan
Specification: [contrato aprobado](31-sqlite-produccion-specification.md)

| Acceptance ID | Preconditions and action | Expected result | Automated/manual method and command | Actual result / status | Run date / evidence |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Invocar main, setup, backup e inicializador con entorno ausente/desconocido según su interfaz directa; respetar defaults demo documentados de scripts | Rechazo antes de crear/mutar estado; ningún script explícitamente production cae a development | P1/P7; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-02 | Arrancar production sin DB o sin configuración explícita completa | Exit no cero; no directorios/DB/clave ni fallback | P1/P7/P11; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-03 | Inicializar production en destino nuevo válido | v6 production coherente, solo S000 y contadores técnicos, clave de 32 bytes y tablas de negocio/acceso vacías | P1/P11; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-04 | Crear primer Saldo mediante API autenticada de fixture limpio | S001; no fixtures ni salto artificial a S006; S000 sigue protegido | P5; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-05 | Abrir demo v6 en production desde cada interfaz | Rechazo sin cambios de DB/WAL/clave; mismo resultado tras eliminar filas demo en fixture | P1; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-06 | Abrir production v6 en development/test desde cada interfaz | Rechazo sin cambios; no escritura ni reetiquetado | P1; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-07 | Abrir v1–v5 legítimas sin marcador en production | Rechazo sin migrar, sembrar ni generar clave | P2; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-08 | Abrir v1–v5 genuinas en development/test | Upgrade transaccional a v6 demo; conserva datos, IDs, auditoría, usuario, factores y sesiones; no resembra | P2 + suites históricas; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-09 | Forzar fallo en upgrade y probar versiones/marcadores inválidos, incluida variante #22 | Rollback íntegro o rechazo previo; no adopción ni conversión silenciosa | P2/P9 + rollback histórico; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-10 | Reabrir demo y production válidas repetidas veces | Identidad, contadores, datos y credenciales estables; no fixtures/token nuevos | P1/P11; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-11 | Inicializar sobre destino existente, vacío o con archivos ajenos | Rechazo sin sustituir, borrar ni reparar nada | P1/P4; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-12 | Usar rutas relativas/default, memoria, escape de raíz o DB/clave coincidentes | Rechazo antes de tocar destino | P3; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-13 | Probar symlinks en componentes/archivos y hardlink DB/clave | Rechazo sin escritura a destinos enlazados; test no limitado a comparar strings | P3/P10; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-14 | Crear en raíz privada válida y probar raíz/archivos con permisos/UID inválidos | Estado nuevo 0700/0600 desde su creación; configuración insegura rechazada sin chmod reparador | P3/P10 (UID inyectado); `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-15 | Dos procesos reales inicializan el mismo destino | Un único conjunto válido, un ganador, otro rechaza; sin sobrescritura ni doble clave | P4 (dos procesos); `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-16 | Inyectar fallo de escritura/espacio/cierre/publicación y caída en puntos controlados | Ningún conjunto parcial aceptado; estado previo intacto; temporales privados no utilizables ni limpieza ajena | P4/P8/P10 (SIGKILL/ENOSPC); `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-17 | Arranques/upgrades concurrentes con escritor y WAL | Espera acotada/serialización o rechazo limpio; sin corrupción; regresión del bloqueo IMMEDIATE conservada | P10 + concurrencia histórica; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-18 | Quitar/cambiar/truncar clave productiva, con y sin propietario | Arranque/alta/backup rechazan; nunca regeneran ni sustituyen clave | P3/P5; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-19 | Pedir alta privada sin propietario en production válida | Token solo en archivo nuevo 0600, hash/caducidad de 10 min; stdout/stderr/artefactos sin factores | P5/P7; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-20 | Fallar entrega privada o usar archivo existente/enlazado | Exit no cero, sin token activo inaccesible ni sobrescritura; limpieza limitada a archivo propio | P5/P7/P10; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-21 | Completar token→contraseña→TOTP en fixture production y probar vencimiento/replay | Alta única con MFA real; inválidos denegados; usuario activo no se reinicia por CLI | P5/P7 + acceso histórico; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-22 | Consultar/mutar sin MFA, con Origin/CSRF incorrectos; verificar respuesta de sesión HTTPS sintética | Protección financiera, rate limit, cookies Secure/host-only y no-store conservados; ningún bypass | P5/P11 + seguridad histórica; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-23 | Servir fixture limpio tras alta y realizar operaciones E1.4/E1.5 por API | Vacíos coherentes al inicio; maestros explícitos y movimientos/transferencias válidos conservan contratos aprobados | P5 (API productiva) + E2E; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-24 | Copiar production v6 con age, con WAL activo y escrituras controladas | Snapshot consistente, identidad/huella correctas; DB/clave cifradas y sin plaintext en artefactos compartidos | P6/P9 + WAL histórico; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-25 | Restaurar esa copia a nuevo destino productivo aislado y usar API con MFA | Datos/IDs/auditoría/origen conservados; pareja de clave válida y permisos privados | P6 (API/MFA restaurada); `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-26 | Reutilizar sesiones/códigos/desafíos previos al restore y entrar con contraseña+TOTP | Accesos anteriores revocados; nuevos códigos emitidos por política existente | P6 + recuperación histórica; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-27 | Restaurar copias genuinas v1–v5 y v6 demo en contexto demo | Compatibilidad histórica, integridad/FK/checksum y upgrade posterior conservados; nunca producción inferida | R10 referencias (v1–v6 genuinos); `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-28 | Cruzar copia production→demo, demo/legacy→production o manipular identidad/huella/checksum/esquema | Rechazo antes de publicar destino; copia y estado previos intactos | P1/P6/P9; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-29 | Restore a destino existente o copia >24 h sin aceptación; ensayar aceptación explícita de antigüedad | Rechazo sin sobrescribir; solo antigüedad aceptada habilita continuar, manteniendo demás validaciones | P9 + backup histórico; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-30 | Ejecutar suite de API completa con regresiones históricas y nuevas | Todos los tests actuales pasan; rechazo y no mutación se verifican aunque cambien mensajes; no tests omitidos | suite completa Bun; `bun run test` | PASS local | 2026-10-21; 82 Bun PASS / 1243 assertions |
| AC-31 | Ejecutar Playwright existente a 390/1440 con MFA, catálogos, movimientos, transferencias y restore | Ambas regresiones pasan; capturas ficticias revisadas, sin factores/trazas sensibles | Playwright catalog/movimientos | PASS local | 2026-10-21; 2 E2E PASS / 41.5 s |
| AC-32 | Ejecutar instalación congelada, typecheck, build y controles documentales/repositorio | Checks pasan sin desactivar firmas, guardas ni assertions; lockfile no cambia sin necesidad aprobada | instalación/tipos/build/controles | PASS local | 2026-10-21; controles y revisión manual PASS |
| AC-33 | Revisar diff/historial, README/guidelines/infra de la futura implementación | Documenta comandos reales, migración v6, canales privados, estados y límites; sin secretos/bases; PR revisable sin deploy | revisión diff/historial y docs | PASS local | 2026-10-21; controles y revisión manual PASS |

## Regression checks
Record relevant suites, counts, command exit status and failures separately.
## Functional verification
Record actual API/CLI/integration outcomes; process startup alone does not pass.
## Browser verification (web only)
Use Playwright to operate every browser acceptance flow. Capture and inspect screenshots
at 390px and 1440px, recording evidence paths. Record accessibility/responsive findings.
## Visual improvements (visual apps only)
List the five most valuable improvements or justify fewer; record corrections and rechecks.
## Limitations and next action
No acceptance completion claim until every required check passes.

## Evidencia de regresión — 2026-10-21

Bun 1.4.3; age 1.2.1 desde Debian, Chromium del sistema. Instalación congelada
sin cambios de lockfile; typecheck y build PASS. Suite completa: **65 PASS / 0 FAIL,
1134 assertions**, seis archivos (54 tests previos y 11 nuevos P1–P11). Ningún
skip/expected-failure se contabiliza como PASS. El caso de rechazo de fixture es
una assertion de prueba positiva, no un test de producción fallido ocultado.

Primer ensayo: 45 pass/9 fail por UID del filesystem raíz mapeado y texto de setup.
Después: 60 pass; ampliación de aceptación hasta 65 pass. E2E inicial falló al
importar Bun desde Node; se corrigió cargando Bun perezosamente, sin cambiar UI.
Resultado posterior: **2/2 PASS**, 45.8 s, con 390/1440 y restore/MFA. Los fallos
iniciales están resueltos; esta historia no sustituye el resultado final.

## Evidencia funcional y límites de los ensayos

P5 registra Ingreso y Transferencia por API/MFA en base limpia production: primer
Saldo S001 y posición 30.00 tras 50.00 de ingreso y 20.00 de transferencia. P6
restaura con age, compara tablas de negocio/auditoría/contadores, verifica revocación
y accede por API con contraseña/TOTP, nuevos códigos, dos hechos y una Referencia.
P11 inicia main real: health/status correctos, datos anónimos 401/no-store y reapertura.
P4/P8 usan procesos reales, un único ganador, ENOSPC y SIGKILL antes/después de
publicación. No se acepta pareja parcial. P10 cubre escritor concurrente, alias y
UID ajeno inyectado en stat; no se afirma un ensayo de Podman/rootless en el VPS.
P2 conserva fixtures genuinos v1–v5; R10 conserva copias/restores v1–v6 y etiquetas.

## Inspección del navegador y mejoras visuales

Se revisaron capturas nuevas ignoradas por Git:
`artifacts/e1-5/transfer-impact-desktop.png` (1440),
`artifacts/e1-5/transfer-form-mobile.png` (390),
`artifacts/e1-5/restored-mobile.png` (390),
`artifacts/e1-5/reference-list-desktop.png` (1440).
Jerarquía, etiquetas, espaciado y acciones legibles; foco visible, sin desbordamiento
horizontal. El formulario largo conserva scroll vertical intencionado. Suite existente
verifica teclado, modo claro y contraste real de controles (acción verde/texto oscuro,
ratio aproximadamente 6.04:1). No se afirma auditoría WCAG completa.

**Cero mejoras visuales aplicadas**: entrega de persistencia sin cambios de pantallas,
CSS o diseño aprobado; no se justifican cinco modificaciones cosméticas para esta
capacidad técnica. Se corrigió exclusivamente la regresión de importación Node/Bun.

## Riesgos operativos pendientes

Publicación sin reemplazo requiere Linux/glibc/renameat2; probada localmente, no
se ha validado en macOS, Windows, Alpine ni en la imagen/UID definitiva del VPS.
Marcador y huella evitan accidentes, no un administrador host malicioso. SIGKILL
prueba interrupción de proceso, no pérdida física de almacenamiento. Un área
privada temporal puede sobrevivir a caída y exige recuperación local deliberada.
Persisten gates de imagen/bind/Caddy/HTTPS, copias offsite/retención/monitorización,
cifrado de disco/custodia externa y ensayo operativo. Sin VPS/deploy/datos reales.

La implementación requiere revisión de Álex y autorización de merge; PR #23 aprobada
pero no integrada sigue como dependencia documental de la PR independiente 31.

## Cierre local de aceptación

AC-01–33 PASS local. Controles documentales, 18 regresiones de validador y 22
regresiones de controles PASS; diff, historial y archivos revisados sin secretos,
bases ni claves. Se preservan los cambios de main y no se integra #21/#22.
La CI remota se identificará por SHA/enlace en la PR, sin atribuirle estos
resultados locales ni modificar el commit solo para registrar el enlace.

## Revisión final de seguridad — 2026-10-21
Validación histórica del incremento remoto 9362158: **73 Bun PASS / 1210
assertions**, con R11 de main y P12–P18 nuevos, sin omitir casos. Typecheck/build PASS.
Las comprobaciones reproducen efectos reales en el filesystem; las ventanas de carrera
se fuerzan con hooks fs controlados (sin sleeps/retries añadidos), no son solo análisis.

| Caso nuevo | Antes de corregir | Después / aceptación reforzada |
| --- | --- | --- |
| P12, hardlink de clave entre lstat y open | Se acepta descriptor sustituido | fstat/dev/ino/nlink/UID/modo y revalidación; rechazo, AC13/14/18 |
| P13, symlinks/hardlinks WAL/SHM/journal | SHM symlink no rechazado | Validación previa/posterior; sentinel ajeno intacto, AC13/14 |
| P14, handle A con configuración de pareja B | loadKey devuelve clave de B | Archivo/huella y descifrado de conexión efectiva comprobados, AC18/24 |
| P15, backup en padre inseguro | VACUUM empieza antes del rechazo | Rechazo antes de snapshot/cifrado, ningún temporal, AC14/24 |
| P16, DB desaparece después de validarla | Riesgo adicional por fallback CREATE de opciones Bun | READWRITE explícito/strict sin CREATE; rechaza y no crea DB, AC02/18 |
| P17, padre cambiado antes de publicación | Resolución de rutas no anclada | Dirfd validado + renameat2 relativo sin reemplazo/fsync/revalidación, AC13/15/16 |
| P18, token sustituido por archivo de otra operación y fallo de entrega | Limpieza borra el reemplazo | Solo se retira inode propio; bootstrap revocado/rollback, AC20 |

Se rechazan nombres/rutas que colisionan con el temporal de restore (`bundle.tmp`),
espacios finales que Bun recorta y salida de token sobre sidecars SQLite. No precisión,
IDs, cálculos o reglas financieras nuevos. No se publican stdout brutos ni factores.
P12–P15/P18 tuvieron fallos negativos esperados antes del arreglo; no son skips ni
se convierten en contratos futuros. P16/P17 añaden regresión de la solución endurecida.

Límite de confianza: filesystem privado y UID operador/root confiables, conforme contrato.
Estas pruebas cubren sustituciones simples inyectadas y concurrencia ordinaria, NO
ofrecen aislamiento frente a un administrador o proceso malicioso con el mismo UID
que pueda reescribir código/DB/clave o hacer sustituciones ABA arbitrarias. SQLite se
abre con strict y READWRITE/READONLY explícitos; no se afirma usar openat2/RESOLVE_BENEATH
para toda operación. Los demás UID quedan excluidos por ancestros/modos/propietario.
SIGKILL no equivale a caída física del almacenamiento; sin ensayo de imagen/UID del VPS,
servicios reales, offsite/custodia ni despliegue. Causa original R6 aún no identificada.

## Revisión crítica final solicitada por usuario — 2026-10-21

La aprobación favorable de Álex no autorizó merge. La revisión adicional detectó
fallos reproducibles y corrigió sus causas, sin alterar D1–D4 ni reglas financieras.
`security-review.test.ts` añade **9 pruebas S1–S7** (S3 tiene tres parametrizaciones).

| Hallazgo / prueba | Antes de corrección | Corrección y comprobación |
| --- | --- | --- |
| S1, conexión distinta entre preflight y apertura | La comprobación de clave consultaba otra conexión por ruta; sustitución de conexión por otra production no era rechazada | Validar nombre, identidad, huella y descifrado en la conexión efectiva, antes de PRAGMA y bajo bloqueo; loadKey/backup comprueban también la huella efectiva. Se inyecta la resolución de conexión usando dos DB privadas reales |
| S2/S4, clave sustituida o enlazada tras lstat | Validación previa obsoleta: un archivo reemplazado podía leerse | O_NOFOLLOW y fstat del descriptor, mismo dev/ino, archivo regular 0600/UID/nlink=1; sustitución con mismos bytes/permisos y creación tardía de hardlink rechazadas |
| S3, nombres válidos bundle.tmp | Restore fallaba para DB o clave llamadas bundle.tmp | Se conserva reserva remota de bundle.tmp y rechazo antes de I/O; roundtrip age real para nombres válidos con espacios/#/? |
| S5, destino creado tras validación | No había un defecto observado en RENAME_NOREPLACE | Inyección crea directorio competidor entre validación y rename: no se reemplaza y stage conserva contenido |
| S6, fallos de fsync al restaurar | Contrato de error necesitaba evidencia del punto de publicación | Antes de rename: destino ausente. Después de rename: puede existir pareja completa válida aunque falle fsync del padre; no se elimina ni sobrescribe. Ambos casos probados, temporales ordinarios limpiados |
| S7, rechazo con WAL vivo | Una apertura SQLite readonly modificaba read marks de SHM antes del rechazo | Preflight de identidad persistente con URI SQLite readonly+immutable, sin WAL/SHM. La identidad production se checkpointa antes de publicar y es inmutable. No se usa ese probe para datos: conexión real relee WAL, origen y clave. Se comparan bytes de DB/WAL/SHM en ambos cruces |

Ejecutar desde raíz, con Bun/age en PATH:

```sh
NODE_ENV=test bun test apps/api/src/security-review.test.ts
bun run typecheck
bun run build
bun run test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e
```

Ejecutar suites secuencialmente y con puertos 3001/5173 libres: P11 inicia main
real. Un ensayo lanzado por el agente en paralelo dio 73 PASS/1 FAIL por colisión
con el servidor E2E; no se atribuye al código ni se oculta como skip. Repetición
secuencial: **74 PASS / 0 FAIL / 1170 assertions**, siete archivos; pruebas nuevas
S1–S7 también verificadas por separado después de reforzar S2 a reemplazo 0600.
Playwright **2/2 PASS**, 47.5 s. Typecheck/build PASS. CI final por SHA en PR #25.

### Dependencia e integración sin efectuar merges

Orden: **#23 primero, #25 después**. #23 aprobado: f064935f97beef879074adb2264539dec1fc51bf;
main inspeccionado: 9336fdd301231191509b6371ffb05a54b33d61ed. #23 es ancestro
de la rama de implementación; `git diff f064935..HEAD` no modifica brainstorming
ni specification. El diff restante corresponde a implementación, pruebas y docs.

La simulación del squash inicial encontró conflicto en setup-progress.md. Se
corrigió moviendo únicamente el bloque de seguimiento de implementación al final
del documento, conservando exactamente el contenido aprobado de #23. No se cambió #23.
Para reproducir en el HEAD final de #25:

```sh
git merge-base --is-ancestor f064935f97beef879074adb2264539dec1fc51bf HEAD
git diff --name-status f064935f97beef879074adb2264539dec1fc51bf HEAD
git merge-tree --write-tree --merge-base=9336fdd301231191509b6371ffb05a54b33d61ed f064935f97beef879074adb2264539dec1fc51bf HEAD
git rev-parse HEAD^{tree}
```

Merge-tree es cálculo de árboles, sin merge de rama, sin commit de merge ni
cambio del checkout/main/PR. Exit 0 y árbol resultado idéntico a HEAD^{tree}
comprueban integración limpia también si #23 se squash integra. La simulación
sobre 0fb5ad1 produjo f44d0b73863d5feed8611686b5685c1458f38133, idéntico al árbol
implementado. Se revalida sobre el commit documental final antes del push.

### Alcance de la garantía y riesgos residuales

Los ancestros y el UID del servicio son de confianza; ningún control de rutas
promete aislar un proceso/root malicioso con capacidad de escribir ese estado.
La inyección de carreras valida defensas concretas, no demuestra ausencia absoluta
de TOCTOU bajo un host comprometido. El probe immutable es solo de identidad
persistente; nunca se utiliza para leer negocio ni sustituye WAL/validación real.
No hay conversión de origen ni regeneración de claves en production: P1–P11 y S7
conservan rechazos cruzados, clave ausente/cambiada y revocación tras restore.

Un fallo de fsync después de publicación es resultado de durabilidad incierta,
no autorización de borrar un destino: detenerse, inspeccionar/verificar la pareja
y preservar copias. SIGKILL no simula daño físico del disco. Linux/glibc requerido;
VPS, imagen/UID real, bind/Caddy/HTTPS, almacenamiento/custodia y copias offsite
siguen fuera de esta revisión. Sin datos reales, Excel, deploy ni merge.

Ensayo inicial de las nuevas reproducciones: 0 PASS/4 FAIL antes de las correcciones
de conexión, descriptor y nombres. Reejecución S1–S7: 9 PASS/0 FAIL. Los archivos
de salida locales de diagnóstico no se publican ni contienen evidencia de datos reales.

Reconciliación de cambios concurrentes: se preservan main 68b0624 (R6) y el
endurecimiento remoto 9362158 (P12–P18, dirfd, sidecars, READWRITE sin CREATE,
limpieza por inode y raíz de backup validada). Estos avances ya resuelven varios
hallazgos del ensayo inicial. La solución local adicional conserva dichas
protecciones, añade preflight de identidad sin SHM y nueve regresiones S1–S7.
Se mantiene bundle.tmp como nombre reservado, sin ampliar rutas aceptadas ni
introducir otro espacio temporal innecesario. Los conteos anteriores son historia
local previa a la reconciliación; el resultado combinado se registra al validar.

## Cierre combinado definitivo de revisión — 2026-10-21

Se conservaron íntegros los commits remotos ab6f6db/9362158 y main
68b0624695a47e01f78dee4cc02de48752543f88, incluida instrumentación R6. Solo se
reaplicaron commits locales todavía no publicados, sin force push ni merge de PR.
P12–P18 conservan sus assertions y garantías. S3 conserva la reserva remota de
bundle.tmp; S1 verifica inyección efectiva en el proveedor Bun usado por la fábrica.

Resultado local combinado: **82 PASS / 0 FAIL / 1243 assertions**, siete archivos;
**2/2 Playwright PASS**, 41.5 s; typecheck/build PASS. Suites secuenciales, sin
servidores ajenos. Controles documentales y 18+22 regresiones se ejecutan sobre
este estado. Los 33 AC siguen PASS; no se declara eliminación de la causa histórica
R6, que la instrumentación de main todavía no atribuye.

### Orden comprobado contra main más reciente

#23 sigue en f064935f97beef879074adb2264539dec1fc51bf, sin cambios. Con main
68b0624, el árbol hipotético tras integrar #23 es
115dc61d88e1723334681fdd4920fc1bb4206679. Cálculo reproducible sin commits de merge:

```sh
# Resultado: 115dc61d88e1723334681fdd4920fc1bb4206679, exit 0
git merge-tree --write-tree 68b0624695a47e01f78dee4cc02de48752543f88 f064935f97beef879074adb2264539dec1fc51bf
# Se admite el árbol hipotético como entrada; representa también el squash de #23
git merge-tree --write-tree --merge-base=68b0624695a47e01f78dee4cc02de48752543f88 115dc61d88e1723334681fdd4920fc1bb4206679 HEAD
git rev-parse HEAD^{tree}
git diff --name-status 115dc61d88e1723334681fdd4920fc1bb4206679 HEAD
```

Las dos salidas de árbol deben ser idénticas, con exit 0 y sin conflictos. El diff
residual contiene solo implementación, regresiones de versión y documentación 31;
no duplica specification/brainstorming ni la investigación R6 ya integrada en main.
Se revalida sobre HEAD definitivo antes del push; SHA/CI definitivos en PR #25.
#23 → #25 es el orden de revisión/integración, no una autorización de merge.

## Estado remoto comprobado — 2026-10-21

GitHub registra #23 integrada por jmartinlabs a las 21:51:50 UTC mediante
squash 13f19f6add82ff24be5040674528bdad4b96c75f (head aprobado f064935).
Su árbol coincide exactamente con el árbol hipotético 115dc61 ya comprobado.
La sincronización concurrente de la rama de implementación se preserva en
619710b438da52fd321181b701fa9ee4f6d01398; su árbol es idéntico al estado probado
f9bdc951153a62fdbf1adb39fc8f45580ce0011e. No se ha ejecutado merge de una PR
por este agente. Main es ancestro de la rama: el diff GitHub contiene únicamente
26 archivos de implementación/pruebas/documentación, sin specification ni
brainstorming duplicados y sin conflictos. El orden #23 → #25 queda respetado;
#25 continúa pendiente de autorización de integración. Resultados locales:
82 API PASS / 1243 assertions y 2 E2E PASS; CI definitiva vinculada al SHA en #25.
Sin VPS, despliegue ni datos financieros reales. Riesgos/límites vigentes:
UID/root confiables, Linux/glibc, fallo fsync posterior a rename puede dejar un
conjunto válido cuya durabilidad requiere inspección; causa histórica R6 sin atribuir.

## Cierre de dev 31 integrado — 2026-10-22 (Europe/Madrid)

Fuente: autorización expresa del usuario en este chat tras revisión con Álex,
limitada a integrar PR #25 con HEAD 6c68b5ed217bc1c435b66ab093489760ec8597e2.
Preflight: #23 MERGED en 13f19f6; HEAD autorizado sin cambios posteriores,
diff de 26 archivos revisado sin secretos/bases/datos reales, CI push y PR
COMPLETED/SUCCESS y sin conflictos. Integración squash verificada en GitHub:
**511fcbad4bb0418af5bc06284ac30abb645cd604**, PR #25 MERGED el 2026-10-22
00:09:18 CEST. Checkout main sincronizado, limpio y árbol idéntico al HEAD aprobado.

Los 33 AC quedan verificados: 82 pruebas API / 1243 assertions y 2 E2E,
tipos/build/controles correctos según evidencia anterior. CI del HEAD aprobado:
[push SUCCESS](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39682614034),
[PR SUCCESS](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39682619693).
CI posterior al squash: [ejecución](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39684386599);
COMPLETED/SUCCESS sobre 511fcbad4bb0418af5bc06284ac30abb645cd604,
incluidos API, tipos/build/controles y Playwright. Entrega técnica integrada;
despliegue no autorizado.

Riesgos conservados: causa histórica R6 sin atribuir (una CI verde no demuestra
su eliminación); fsync fallido tras rename puede dejar DB+clave válidas con
durabilidad incierta, que deben preservarse e inspeccionarse sin sobrescribir;
UID/root confiables, Linux/glibc/renameat2 y ensayo de pérdida física no realizado.
Antes de desplegar: configuración validada de bind, imagen fijada/UID/volúmenes y
WAL, Caddy/HTTPS/cookies, copias externas/retención/custodia y simulacro de restore,
monitorización/actualizaciones/cifrado y autorización específica. Ver infra/README.md.
No acceso al VPS, infraestructura activa, Excel ni datos reales. PR #21/#22 intactas.
Este registro documental se propone aparte, sin autorización de integrar otra PR.

## Enmienda 31-E1 — evidencia — 2026-10-23

Rama `fix/ac23-persistent-identity`, base main `c8cb72d`. La CI de Linux es la referencia: en
macOS las suites de producción no se ejecutan (FFI `libc.so.6`, `age`); main falla allí ~35
pruebas por entorno.

| Criterio | Prueba | Resultado |
| --- | --- | --- |
| AC-34 (concurrente) | `31 AC34: concurrent…`: 40 rondas, dos migraciones reales de v3 genuina + tercer proceso reabriendo con `openDatabase` | Código de main (local): **FAIL**, 2 «Identidad ausente.» en 40 rondas. Corregido: **PASS** local y CI. Detecta con fuerza la falta de la transacción de lectura (QA: 4/4 fallos al quitarla) |
| AC-34 (determinista) | `31 AC34: demo opening…` y `31 AC34: production opening…`: identidad vigente confirmada solo en el WAL; el archivo principal conserva otra (construcción de prueba con triggers retirados y restaurados) | **PASS** CI. Mutación en copia de scratch con la sonda `immutable=1` reintroducida (transacción conservada): **FAIL 3/3**; control sin mutar **PASS**. Cierra el hallazgo F1 de QA |
| AC-35 | `31 AC35`: base de origen ajeno en modo rollback, ambos sentidos | **PASS** CI: rechazo, cabecera sigue en rollback, sin `-wal`, contenido lógico y clave intactos |
| AC-36 | `31 AC36`: clave de otra pareja, con y sin escritor | **PASS** CI: rechazo antes de PRAGMA persistentes; DB (y WAL con escritor) y clave intactos |
| AC-37 | `31 AC37`: ningún módulo de aplicación con `immutable=`, `nolock=` ni `readonly_shm=` | **PASS** local y CI |
| AC-05/06 | `31 S7` actualizada + P1 | **PASS** CI: DB/WAL idénticos con escritor abierto; contenido lógico y clave intactos |
| AC-17 | AC34 + `04 AC22/23/28` + B2–B4 | **PASS** CI; `04 AC22/23/28` también **PASS** local |
| B1 | `SQLite B1` actualizada: toda conexión empieza con `busy_timeout` y lee identidad antes de cualquier PRAGMA persistente | **PASS** CI |
| P16 | Sin cambios | **PASS** CI tras conservar `verifyProductionFiles` |

| SHA | CI | API | E2E | Nota |
| --- | --- | --- | --- | --- |
| `58015a1` | [39941271047](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39941271047) | 108/2 | no ejecutado | P16 (montaje) y AC35 (montaje); corregido |
| `7b571ef` | [39941586636](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39941586636) | **110/0** | **2 PASS** | Candidato revisado por QA31E1-1 |
| `e4bddfa` | [39943120470](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39943120470) | **112/0** | **2 PASS** | Hallazgos menores F2–F5 (QA31E1-2) |
| `07e0369` | [39957909451](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39957909451) | **114/0** | **2 PASS** | AC-34 determinista (F1, QA31E1-3) |

Typecheck y build PASS (local y CI). Controles documentales en la PR.

QA independiente (`qa-review`, sin participación en la implementación):
- QA31E1-1 sobre `7b571ef`: sin defectos de código; reglas de 31-E1 y garantías de spec31
  cumplidas. Hallazgo F1 (AC-34 no detectaba la sonda reintroducida) y menores F2–F5.
- QA31E1-2 sobre `e4bddfa`: F2–F5 resueltos, sin bloqueos.
- QA31E1-3 sobre `07e0369`: sin bloqueos, F1 cerrado. Verificación propia en copias de
  scratch: sonda reintroducida **FAIL 4/4** en el caso determinista; código actual PASS 3/3;
  sin transacción de lectura falla la escena concurrente. Construcción de prueba válida (un
  archivo principal anterior a un commit sin checkpoint es un estado normal de SQLite); el
  caso de producción habría fallado con la sonda anterior.

Limitaciones:
- La escena concurrente de AC34 es probabilística; el caso determinista cubre la regresión
  de la sonda. Ninguna prueba demuestra ausencia absoluta de carreras.
- Los casos deterministas de AC34 construyen el estado retirando y restaurando triggers de
  identidad: simulan un archivo principal desactualizado frente a un WAL confirmado.
- B1 registra la creación de la transacción, no que cada lectura ocurra dentro de ella.
- AC37 no detecta flags de apertura numéricos ni cadenas construidas por partes.
- El `-shm` puede cambiar en un rechazo, conforme a 31-E1; no se compara byte a byte.
- B4 (fallo intermitente previo) queda fuera de alcance.
