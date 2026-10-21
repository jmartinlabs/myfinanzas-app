# 31 — SQLite producción: Test plan
Specification: [contrato aprobado](31-sqlite-produccion-specification.md)

| Acceptance ID | Preconditions and action | Expected result | Automated/manual method and command | Actual result / status | Run date / evidence |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Invocar main, setup, backup e inicializador con entorno ausente/desconocido según su interfaz directa; respetar defaults demo documentados de scripts | Rechazo antes de crear/mutar estado; ningún script explícitamente production cae a development | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-02 | Arrancar production sin DB o sin configuración explícita completa | Exit no cero; no directorios/DB/clave ni fallback | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-03 | Inicializar production en destino nuevo válido | v6 production coherente, solo S000 y contadores técnicos, clave de 32 bytes y tablas de negocio/acceso vacías | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-04 | Crear primer Saldo mediante API autenticada de fixture limpio | S001; no fixtures ni salto artificial a S006; S000 sigue protegido | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-05 | Abrir demo v6 en production desde cada interfaz | Rechazo sin cambios de DB/WAL/clave; mismo resultado tras eliminar filas demo en fixture | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-06 | Abrir production v6 en development/test desde cada interfaz | Rechazo sin cambios; no escritura ni reetiquetado | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-07 | Abrir v1–v5 legítimas sin marcador en production | Rechazo sin migrar, sembrar ni generar clave | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-08 | Abrir v1–v5 genuinas en development/test | Upgrade transaccional a v6 demo; conserva datos, IDs, auditoría, usuario, factores y sesiones; no resembra | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-09 | Forzar fallo en upgrade y probar versiones/marcadores inválidos, incluida variante #22 | Rollback íntegro o rechazo previo; no adopción ni conversión silenciosa | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-10 | Reabrir demo y production válidas repetidas veces | Identidad, contadores, datos y credenciales estables; no fixtures/token nuevos | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-11 | Inicializar sobre destino existente, vacío o con archivos ajenos | Rechazo sin sustituir, borrar ni reparar nada | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-12 | Usar rutas relativas/default, memoria, escape de raíz o DB/clave coincidentes | Rechazo antes de tocar destino | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-13 | Probar symlinks en componentes/archivos y hardlink DB/clave | Rechazo sin escritura a destinos enlazados; test no limitado a comparar strings | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-14 | Crear en raíz privada válida y probar raíz/archivos con permisos/UID inválidos | Estado nuevo 0700/0600 desde su creación; configuración insegura rechazada sin chmod reparador | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-15 | Dos procesos reales inicializan el mismo destino | Un único conjunto válido, un ganador, otro rechaza; sin sobrescritura ni doble clave | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-16 | Inyectar fallo de escritura/espacio/cierre/publicación y caída en puntos controlados | Ningún conjunto parcial aceptado; estado previo intacto; temporales privados no utilizables ni limpieza ajena | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-17 | Arranques/upgrades concurrentes con escritor y WAL | Espera acotada/serialización o rechazo limpio; sin corrupción; regresión del bloqueo IMMEDIATE conservada | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-18 | Quitar/cambiar/truncar clave productiva, con y sin propietario | Arranque/alta/backup rechazan; nunca regeneran ni sustituyen clave | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-19 | Pedir alta privada sin propietario en production válida | Token solo en archivo nuevo 0600, hash/caducidad de 10 min; stdout/stderr/artefactos sin factores | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-20 | Fallar entrega privada o usar archivo existente/enlazado | Exit no cero, sin token activo inaccesible ni sobrescritura; limpieza limitada a archivo propio | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-21 | Completar token→contraseña→TOTP en fixture production y probar vencimiento/replay | Alta única con MFA real; inválidos denegados; usuario activo no se reinicia por CLI | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-22 | Consultar/mutar sin MFA, con Origin/CSRF incorrectos; verificar respuesta de sesión HTTPS sintética | Protección financiera, rate limit, cookies Secure/host-only y no-store conservados; ningún bypass | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-23 | Servir fixture limpio tras alta y realizar operaciones E1.4/E1.5 por API | Vacíos coherentes al inicio; maestros explícitos y movimientos/transferencias válidos conservan contratos aprobados | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-24 | Copiar production v6 con age, con WAL activo y escrituras controladas | Snapshot consistente, identidad/huella correctas; DB/clave cifradas y sin plaintext en artefactos compartidos | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-25 | Restaurar esa copia a nuevo destino productivo aislado y usar API con MFA | Datos/IDs/auditoría/origen conservados; pareja de clave válida y permisos privados | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-26 | Reutilizar sesiones/códigos/desafíos previos al restore y entrar con contraseña+TOTP | Accesos anteriores revocados; nuevos códigos emitidos por política existente | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-27 | Restaurar copias genuinas v1–v5 y v6 demo en contexto demo | Compatibilidad histórica, integridad/FK/checksum y upgrade posterior conservados; nunca producción inferida | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-28 | Cruzar copia production→demo, demo/legacy→production o manipular identidad/huella/checksum/esquema | Rechazo antes de publicar destino; copia y estado previos intactos | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-29 | Restore a destino existente o copia >24 h sin aceptación; ensayar aceptación explícita de antigüedad | Rechazo sin sobrescribir; solo antigüedad aceptada habilita continuar, manteniendo demás validaciones | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-30 | Ejecutar suite de API completa con regresiones históricas y nuevas | Todos los tests actuales pasan; rechazo y no mutación se verifican aunque cambien mensajes; no tests omitidos | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-31 | Ejecutar Playwright existente a 390/1440 con MFA, catálogos, movimientos, transferencias y restore | Ambas regresiones pasan; capturas ficticias revisadas, sin factores/trazas sensibles | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-32 | Ejecutar instalación congelada, typecheck, build y controles documentales/repositorio | Checks pasan sin desactivar firmas, guardas ni assertions; lockfile no cambia sin necesidad aprobada | Bun integración production + regresiones según AC | unrun | pendiente |
| AC-33 | Revisar diff/historial, README/guidelines/infra de la futura implementación | Documenta comandos reales, migración v6, canales privados, estados y límites; sin secretos/bases; PR revisable sin deploy | Bun integración production + regresiones según AC | unrun | pendiente |

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
