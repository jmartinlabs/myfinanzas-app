# 31 — SQLite producción: Test plan
Specification: [contrato aprobado](31-sqlite-produccion-specification.md)

| Acceptance ID | Preconditions and action | Expected result | Automated/manual method and command | Actual result / status | Run date / evidence |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Invocar main, setup, backup e inicializador con entorno ausente/desconocido según su interfaz directa; respetar defaults demo documentados de scripts | Rechazo antes de crear/mutar estado; ningún script explícitamente production cae a development | P1/P7; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-02 | Arrancar production sin DB o sin configuración explícita completa | Exit no cero; no directorios/DB/clave ni fallback | P1/P7/P11; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-03 | Inicializar production en destino nuevo válido | v6 production coherente, solo S000 y contadores técnicos, clave de 32 bytes y tablas de negocio/acceso vacías | P1/P11; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-04 | Crear primer Saldo mediante API autenticada de fixture limpio | S001; no fixtures ni salto artificial a S006; S000 sigue protegido | P5; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-05 | Abrir demo v6 en production desde cada interfaz | Rechazo sin cambios de DB/WAL/clave; mismo resultado tras eliminar filas demo en fixture | P1; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-06 | Abrir production v6 en development/test desde cada interfaz | Rechazo sin cambios; no escritura ni reetiquetado | P1; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-07 | Abrir v1–v5 legítimas sin marcador en production | Rechazo sin migrar, sembrar ni generar clave | P2; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-08 | Abrir v1–v5 genuinas en development/test | Upgrade transaccional a v6 demo; conserva datos, IDs, auditoría, usuario, factores y sesiones; no resembra | P2 + suites históricas; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-09 | Forzar fallo en upgrade y probar versiones/marcadores inválidos, incluida variante #22 | Rollback íntegro o rechazo previo; no adopción ni conversión silenciosa | P2/P9 + rollback histórico; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-10 | Reabrir demo y production válidas repetidas veces | Identidad, contadores, datos y credenciales estables; no fixtures/token nuevos | P1/P11; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-11 | Inicializar sobre destino existente, vacío o con archivos ajenos | Rechazo sin sustituir, borrar ni reparar nada | P1/P4; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-12 | Usar rutas relativas/default, memoria, escape de raíz o DB/clave coincidentes | Rechazo antes de tocar destino | P3; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-13 | Probar symlinks en componentes/archivos y hardlink DB/clave | Rechazo sin escritura a destinos enlazados; test no limitado a comparar strings | P3/P10; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-14 | Crear en raíz privada válida y probar raíz/archivos con permisos/UID inválidos | Estado nuevo 0700/0600 desde su creación; configuración insegura rechazada sin chmod reparador | P3/P10 (UID inyectado); `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-15 | Dos procesos reales inicializan el mismo destino | Un único conjunto válido, un ganador, otro rechaza; sin sobrescritura ni doble clave | P4 (dos procesos); `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-16 | Inyectar fallo de escritura/espacio/cierre/publicación y caída en puntos controlados | Ningún conjunto parcial aceptado; estado previo intacto; temporales privados no utilizables ni limpieza ajena | P4/P8/P10 (SIGKILL/ENOSPC); `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-17 | Arranques/upgrades concurrentes con escritor y WAL | Espera acotada/serialización o rechazo limpio; sin corrupción; regresión del bloqueo IMMEDIATE conservada | P10 + concurrencia histórica; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-18 | Quitar/cambiar/truncar clave productiva, con y sin propietario | Arranque/alta/backup rechazan; nunca regeneran ni sustituyen clave | P3/P5; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-19 | Pedir alta privada sin propietario en production válida | Token solo en archivo nuevo 0600, hash/caducidad de 10 min; stdout/stderr/artefactos sin factores | P5/P7; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-20 | Fallar entrega privada o usar archivo existente/enlazado | Exit no cero, sin token activo inaccesible ni sobrescritura; limpieza limitada a archivo propio | P5/P7/P10; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-21 | Completar token→contraseña→TOTP en fixture production y probar vencimiento/replay | Alta única con MFA real; inválidos denegados; usuario activo no se reinicia por CLI | P5/P7 + acceso histórico; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-22 | Consultar/mutar sin MFA, con Origin/CSRF incorrectos; verificar respuesta de sesión HTTPS sintética | Protección financiera, rate limit, cookies Secure/host-only y no-store conservados; ningún bypass | P5/P11 + seguridad histórica; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-23 | Servir fixture limpio tras alta y realizar operaciones E1.4/E1.5 por API | Vacíos coherentes al inicio; maestros explícitos y movimientos/transferencias válidos conservan contratos aprobados | P5 (API productiva) + E2E; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-24 | Copiar production v6 con age, con WAL activo y escrituras controladas | Snapshot consistente, identidad/huella correctas; DB/clave cifradas y sin plaintext en artefactos compartidos | P6/P9 + WAL histórico; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-25 | Restaurar esa copia a nuevo destino productivo aislado y usar API con MFA | Datos/IDs/auditoría/origen conservados; pareja de clave válida y permisos privados | P6 (API/MFA restaurada); `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-26 | Reutilizar sesiones/códigos/desafíos previos al restore y entrar con contraseña+TOTP | Accesos anteriores revocados; nuevos códigos emitidos por política existente | P6 + recuperación histórica; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-27 | Restaurar copias genuinas v1–v5 y v6 demo en contexto demo | Compatibilidad histórica, integridad/FK/checksum y upgrade posterior conservados; nunca producción inferida | R10 referencias (v1–v6 genuinos); `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-28 | Cruzar copia production→demo, demo/legacy→production o manipular identidad/huella/checksum/esquema | Rechazo antes de publicar destino; copia y estado previos intactos | P1/P6/P9; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-29 | Restore a destino existente o copia >24 h sin aceptación; ensayar aceptación explícita de antigüedad | Rechazo sin sobrescribir; solo antigüedad aceptada habilita continuar, manteniendo demás validaciones | P9 + backup histórico; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-30 | Ejecutar suite de API completa con regresiones históricas y nuevas | Todos los tests actuales pasan; rechazo y no mutación se verifican aunque cambien mensajes; no tests omitidos | suite completa Bun; `bun run test` | PASS local | 2026-10-21; 65 Bun PASS / 1134 assertions |
| AC-31 | Ejecutar Playwright existente a 390/1440 con MFA, catálogos, movimientos, transferencias y restore | Ambas regresiones pasan; capturas ficticias revisadas, sin factores/trazas sensibles | Playwright catalog/movimientos | PASS local | 2026-10-21; 2 E2E PASS / 45.8 s |
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
Resultados anteriores son históricos; validación final actual: **73 Bun PASS / 1210
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
