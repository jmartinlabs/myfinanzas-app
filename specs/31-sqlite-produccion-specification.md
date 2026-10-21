# 31 — Inicialización segura de SQLite: Specification
Status: IN REVIEW — propuesta técnica completa, sin aprobar ni implementar.
Approval source/date: PENDING; solicitud de especificación del usuario, 2026-10-21.
Publicación provisional: el usuario autorizó expresamente una excepción al paso 6
de `$spec` para commit/push de estos dos documentos y PR en borrador hacia main,
solo para revisión de Álex. Esta autorización no aprueba el contrato, no permite
merge y no autoriza `$dev 31`; la aprobación de la especificación sigue PENDING.
Context and brainstorming: [decisiones y diagnóstico](31-sqlite-produccion-brainstorming.md),
[contexto](project.md), [roadmap](roadmap.md), [infraestructura](../infra/README.md).
Base inspeccionada: main `0d6cfc0e4622e00e1084aefb35987b1954c5e3ef`, esquema 5.
31 identifica una capacidad técnica transversal; no es E1.6 ni una entrega financiera nueva.

## Functionality

Preparar un contrato de persistencia productiva sin fixtures, distinto del entorno
demo y compatible con E1.1–E1.5. Comprende inicialización explícita DB+clave,
apertura protegida, alta privada con MFA y copia/restauración cifrada verificable.
Todo desarrollo y ensayo posterior de esta entrega se hará en la máquina aislada
con datos ficticios. Aprobar este documento no autoriza tocar el VPS ni desplegar.

Se reutilizan Bun/Effect/SQLite directo, Argon2id, OTPAuth y age. No ORM, proveedor
de identidad, registro público, motor financiero o dependencia nueva propuestos.
Se separan creación del esquema técnico y siembra demo; no se mantienen dos
copias divergentes del esquema ni se habilita producción quitando un guard global.

### Contratos recomendados pendientes de aprobación

| Decisión | Contrato | Fuente |
| --- | --- | --- |
| Separación y ausencia de fixtures | Nunca convertir demo a productiva, ni por ruta, NODE_ENV, borrado de filas o restore | Solicitud del usuario; refuerzo simétrico D1 propuesto |
| S000 | Único Saldo inicial, técnico, Exterior protegido; ningún hecho, apertura personal, catálogo o usuario ficticio | Invariante existente; concreción D2 propuesta |
| Primera alta | Contador Saldo comienza en 1; primera alta S001, sin reservar los cinco fixtures | D2 propuesta; no autorización de carga/importación real |
| Alta privada | Mismo token de un uso/10 min, contraseña 15–128, TOTP y diez códigos; entrega local privada | Seguridad existente; canal productivo D3 propuesto |
| Recuperación | age, destino nuevo, integridad/FK/checksum y revocación de accesos | Contrato existente; extensión de identidad D4 propuesta |
| Maestro y operación | Excel v5.11 maestro; no acceso al VPS, deploy ni datos reales | Solicitud confirmada |

### Operaciones y estados

1. **Inicialización productiva explícita:** validar entorno, rutas y raíz privada;
   crear en área privada exclusiva DB limpia y clave aleatoria de 32 bytes;
   completar esquema, identidad y comprobaciones antes de publicar el conjunto.
   Sin usuario, token o credenciales predefinidos. Repetir sobre destino existente
   es rechazo sin cambios, incluso si está vacío o parece incompleto.
2. **Arranque productivo:** exige configuración explícita, conjunto publicado y
   coherente. No crea directorios, DB, clave, propietario ni fixtures. Abre solo
   después de validar origen, versión, permisos y clave; nunca repara por su cuenta.
3. **Alta privada:** operación local deliberada sobre base válida sin propietario
   activo. Genera token por el mecanismo existente y lo entrega a archivo privado
   exclusivo. El operador completa la UI existente; solo MFA completa da acceso.
4. **Reinicio/upgrade:** conserva identidad, datos, IDs, auditoría, factores y clave.
   Un upgrade soportado es transaccional; no es una reinstalación ni un reset.
5. **Restore:** solo a destino nuevo, preservando origen; revoca accesos conforme
   a la política vigente. No cambia producción a demo para poder inspeccionarla.

## Data model and contracts

### Versionado e identidad

Se propone **esquema 6** para añadir metadatos técnicos sin cambiar el significado
de ninguna tabla financiera. Una única identidad persistente indica versión de
contrato y origen `demo` o `production`. Para producción vincula la clave externa
con una huella SHA-256 de sus 32 bytes. La clave no entra en SQLite; la huella
evita aceptar otra pareja DB/clave incluso antes de existir propietario. No es
una firma contra un administrador malicioso ni una certificación de datos reales.

El origen no es editable por API/CLI ordinaria. No habrá comando de promoción,
flag público equivalente a `openDatabase(path, true)` ni heurística por nombre,
cantidad de filas o presencia/ausencia de S001–S005. El DDL exacto se concretará
en `$dev` manteniendo estas invariantes. Ningún secreto en los metadatos.

| Contexto de apertura | Base inexistente | v1–v5 sin identidad | v6 demo | v6 production |
| --- | --- | --- | --- | --- |
| development/test ordinario | Crea demo marcada con fixtures actuales | Migra transaccionalmente a v6 demo, conservando contenido | Admite sin resembrar | Rechaza antes de mutar |
| production ordinario | Rechaza sin crear | Rechaza sin migrar | Rechaza sin mutar | Admite solo con configuración/clave válidas |
| Inicializador production | Solo destino nuevo bajo raíz validada | Rechaza | Rechaza | Rechaza; nunca sobrescribe |
| Entorno ausente/desconocido | Rechaza | Rechaza | Rechaza | Rechaza |

Una v5 con tabla de origen procedente de #22 es una variante no aprobada: rechazar
en ambos modos, sin reinterpretarla como demo legacy ni promoverla. Identidad
malformada, duplicada o contradictoria y versión desconocida también se rechazan.
Las v1–v5 legítimas carecen de ese marcador; aceptarlas localmente conserva el
contrato histórico, sin afirmar que el software pueda detectar datos personales.

Las migraciones v1→v2→v3→v4→v5 existentes se reutilizan y luego añaden identidad v6
en la misma transacción. No resembrar filas, cambiar importes, consumir IDs,
revocar accesos ni alterar auditoría por migrar. Mantener fixtures históricos
genuinos como evidencia; no rebautizar una v6 nueva como base antigua.

### Rutas, publicación y concurrencia

Producción exige DATABASE_PATH, AUTH_KEY_PATH y APP_ORIGIN explícitos, iguales
en main, alta y backup. No defaults `.local`, `:memory:` ni rutas relativas.
DB y clave deben ser archivos distintos dentro de un mismo directorio de estado
dedicado. APP_ORIGIN debe ser un origen HTTPS canónico sin credenciales, ruta,
query ni fragmento; destino previsto `https://myfinanzas.pp.ua`.

La raíz privada ya puede existir (como los directorios preparados por el usuario);
la inicialización publica un **subdirectorio de estado nuevo**. En `$dev` se
documentarán las rutas de contenedor coherentes sin activar ni copiar Quadlet.
No exigir vaciar un directorio existente ni eliminar archivos de otra operación.

Validar rutas canónicas, componentes y pertenencia a la raíz efectiva; rechazar
enlaces simbólicos en rutas de estado y archivos, archivos no regulares, alias
DB/clave por hardlink, escapes y permisos incompatibles. Directorio de estado
0700 y archivos sensibles 0600, propietario UID efectivo (compatible con rootless
mediante su mapeo); ningún permiso de grupo/otros. No corregir silenciosamente
permisos/propietarios ajenos en arranque. La raíz y sus ancestros relevantes no
pueden ser modificables por usuarios ajenos al operador de confianza.

Crear con exclusividad, máscara privada desde el primer byte y reserva que
serialice inicializadores; `existsSync` no basta. Publicar sin reemplazar un
destino ganado por otro proceso. DB, clave y metadatos deben quedar durables
con cierre/checkpoint, fsync de archivos/directorios y publicación del conjunto.
Una caída puede dejar un área temporal privada identificable, pero jamás una
base parcial aceptable por el runtime. Su recuperación/limpieza será explícita,
limitada a archivos propios; no borrar locks ajenos ni reutilizar parcialmente
un destino. No se promete transacción distribuida frente a daño físico del disco.

En aperturas validar antes de PRAGMA mutables, chmod o migración; revalidar
identidad/versión en la conexión efectiva bajo el bloqueo de escritura antes de
migrar. Conservar WAL, FK, synchronous FULL y busy_timeout actual de 3 s. Dos
procesos contra el mismo destino tienen un solo ganador al crear; los upgrades
concurrentes se serializan o fallan sin corrupción, sin elevar reintentos sin límite.

### Claves y acceso

La clave nace solo con inicialización explícita; producción nunca usa `loadKey`
para regenerarla, tampoco si todavía no hay usuario. Ausencia, longitud incorrecta,
huella distinta o fallo de descifrado detienen arranque/alta/backup sin tocar datos.
Una restauración requiere la pareja cifrada correspondiente. Rotación de claves
y rescate administrativo nuevos quedan fuera de esta entrega.

## Screens and interfaces

No nuevas pantallas ni wireframes: reutilizar las pantallas de acceso aprobadas.
Los siguientes son contratos de CLI a implementar y documentar en `$dev`, no
comandos operativos existentes que deban ejecutarse hoy:

| Interfaz | Entradas no secretas | Salida / resultado |
| --- | --- | --- |
| Inicialización privada | NODE_ENV=production, rutas absolutas y APP_ORIGIN; destino nuevo | Estado técnico de éxito; ningún token ni contenido financiero |
| Alta privada productiva | Misma configuración y ruta de archivo de entrega nuevo bajo directorio privado | Token solo en ese archivo 0600 exclusivo; stdout/stderr sin secretos |
| Runtime API | Conjunto existente y configuración validada | API existente; fallo de configuración impide servir operaciones financieras |
| Backup create/restore | Rutas, destinatario público age o ruta de identidad privada | Estado técnico; nunca identidad privada ni valores descifrados |

Contraseñas, OTP, token y clave no se aceptan como argumentos ni variables nuevas
para logs/CI. La entrega privada del token se crea sin seguir enlaces ni reemplazar
archivos. Un fallo al escribir invalida el token emitido; la operación tiene exit
no cero y no deja un token activo inaccesible. El archivo tiene la misma caducidad
operativa de 10 min; tras uso/caducidad se retira por el flujo local documentado,
sin prometer borrado físico seguro. No se incorpora a Git, snapshots de pruebas
ni artefactos compartidos. Regenerar token no reinicia un usuario activo.

El enrolado mantiene consumo único, contraseña Argon2id, secreto TOTP cifrado,
anti-replay, rate limit, CSRF/Origin y entrega única de códigos. No hay auto-login,
cuenta semilla, registro abierto ni endpoint privilegiado de inicialización.

## Empty, loading and error states

Base productiva nueva: S000 técnico protegido, contadores técnicos y tablas vacías;
no Saldos personales, catálogos, Ciclos, Referencias, Movimientos ni propietario.
La UI mantiene sus estados existentes de vacío y «No disponible» donde corresponda;
no insertar datos para facilitar que una pantalla aparezca poblada.

Sin alta: solo salud/estado de configuración y flujo de acceso existentes; datos
financieros siguen protegidos. Durante CLI basta resultado final sin progreso con
payload sensible. Toda validación fallida retorna exit no cero y categoría técnica
accionable sin stack/payload/secretos en salidas productivas. No intentar fallback
a demo, borrar datos ni continuar como si el arranque estuviera listo.

Rechazos de origen/versión/rutas/permisos dejan inalterados archivos preexistentes,
incluidos DB, WAL/SHM y clave. La evidencia comparará contenido/hash en fixtures
cerrados o con escritor suspendido: no atribuir al rechazo cambios de un escritor
legítimo concurrente ni exigir que atime nunca cambie en una lectura del sistema.

## API behavior and external dependencies

No cambia el contrato financiero E1.4/E1.5 ni añade endpoints. Main, setup y backup
deben compartir política de apertura; no validar solo el comando nuevo. El setup
demo conserva su uso en development/test y no sirve de bypass productivo.
No inferir origen desde Host/X-Forwarded-* ni aceptar un origen HTTP para production.

Las cookies Secure/host-only, Origin exacto y protecciones existentes se ensayarán
localmente con solicitudes sintéticas. El bind de contenedor, Caddy real, SPA,
certificados, imagen y publicación de puertos siguen como bloqueos separados de
infraestructura; esta entrega no declara verificado un despliegue por probar SQLite.

Backup mantiene VACUUM INTO, cifrado age separado de DB/clave, integridad, FK,
checksum, versión, antigüedad >24 h con aceptación y destino nuevo sin sobrescritura.
Para snapshots v6 el manifest cifrado incorpora origen y debe coincidir con el
marcador de la DB; huella y paquete de clave deben coincidir antes de publicar.
El formato actual admite extensión aditiva: campos de identidad obligatorios
para v6, ausencia compatible para v1–v5 legítimas. Contradicciones son error;
no se fabrica una identidad production para copias antiguas.

Restore valida el modo de destino antes de publicar. Copias v1–v5 históricas y v6
demo solo se restauran como demo; production solo desde v6 production válida y
en contexto production explícito. Un restore de prueba productivo se hace aislado
con datos ficticios y el mismo origen production; no se lo convierte a test/demo.
Se valida en el área temporal; destino final sigue ausente si falla. Mantener la
pareja DB/clave y permisos; permitir el nombre histórico del archivo restaurado
solo mediante ruta explícita, sin inferir origen de ese nombre.

Restaurar revoca sesiones, desafíos, bootstrap, recovery, límites e intentos según
la política vigente, incluidos los de Referencias. Conserva contraseña/TOTP y
datos; siguiente identificación MFA emite códigos nuevos. Migrar en sitio no
revoca esos accesos. Backup o arranque no regeneran claves ante pérdida.

## Validation and edge cases

La matriz de entornos se prueba para memoria, disco, bases cerradas y bases con
WAL. Cubrir inexistencia, archivo vacío, esquema sin versión, versiones 1–5
genuinas, v6 y desconocida; marcador inválido/duplicado; key ausente/cambiada;
permisos inicialmente amplios; enlaces/aliases; falta de espacio, caída antes
y después de publicación y dos procesos reales. No basta un PID o puerto abierto.

Todas las comprobaciones AC de esta entrega deberán quedar trazadas y aprobadas
en `$dev 31`. Su ejecución está pendiente: este documento no acredita producción.
No actualizar fixtures históricos ni eliminar assertions para resolver el fallo
de #22: adaptar las expectativas al contrato aprobado conservando comprobaciones
de rechazo, no mutación y cobertura de todos los modos, aunque cambie un mensaje.

## Exclusions

Acceso/modificación del VPS; deploy; modificar Caddy/UFW/SSH/Quadlet activos;
imagen/puertos/bind productivo; scheduler, retención automática, copias offsite,
cifrado de disco o SLA/RPO/RTO demostrados; importación del Excel/datos reales;
traspaso de maestro; nuevas reglas económicas; E1.6 o motores futuros; conversión
demo→production; adopción de bases experimentales #22; rotación/rescate de factores.

No integrar, cerrar, reescribir ni modificar #21/#22. Podrán aportar antecedentes
revisados, pero no constituyen base aprobada de código. Nueva implementación
independiente después de aprobar la especificación y autorizar `$dev 31`.

## Acceptance checks

Todos son criterios actuales para la futura implementación 31, pendientes de
ejecución. Las exclusiones operativas anteriores no son criterios que se puedan
marcar como pasados con mocks o mediante estas pruebas locales.

| ID | Action / preconditions | Expected observable result |
| --- | --- | --- |
| AC-01 | Invocar main, setup, backup e inicializador con entorno ausente/desconocido según su interfaz directa; respetar defaults demo documentados de scripts | Rechazo antes de crear/mutar estado; ningún script explícitamente production cae a development |
| AC-02 | Arrancar production sin DB o sin configuración explícita completa | Exit no cero; no directorios/DB/clave ni fallback |
| AC-03 | Inicializar production en destino nuevo válido | v6 production coherente, solo S000 y contadores técnicos, clave de 32 bytes y tablas de negocio/acceso vacías |
| AC-04 | Crear primer Saldo mediante API autenticada de fixture limpio | S001; no fixtures ni salto artificial a S006; S000 sigue protegido |
| AC-05 | Abrir demo v6 en production desde cada interfaz | Rechazo sin cambios de DB/WAL/clave; mismo resultado tras eliminar filas demo en fixture |
| AC-06 | Abrir production v6 en development/test desde cada interfaz | Rechazo sin cambios; no escritura ni reetiquetado |
| AC-07 | Abrir v1–v5 legítimas sin marcador en production | Rechazo sin migrar, sembrar ni generar clave |
| AC-08 | Abrir v1–v5 genuinas en development/test | Upgrade transaccional a v6 demo; conserva datos, IDs, auditoría, usuario, factores y sesiones; no resembra |
| AC-09 | Forzar fallo en upgrade y probar versiones/marcadores inválidos, incluida variante #22 | Rollback íntegro o rechazo previo; no adopción ni conversión silenciosa |
| AC-10 | Reabrir demo y production válidas repetidas veces | Identidad, contadores, datos y credenciales estables; no fixtures/token nuevos |
| AC-11 | Inicializar sobre destino existente, vacío o con archivos ajenos | Rechazo sin sustituir, borrar ni reparar nada |
| AC-12 | Usar rutas relativas/default, memoria, escape de raíz o DB/clave coincidentes | Rechazo antes de tocar destino |
| AC-13 | Probar symlinks en componentes/archivos y hardlink DB/clave | Rechazo sin escritura a destinos enlazados; test no limitado a comparar strings |
| AC-14 | Crear en raíz privada válida y probar raíz/archivos con permisos/UID inválidos | Estado nuevo 0700/0600 desde su creación; configuración insegura rechazada sin chmod reparador |
| AC-15 | Dos procesos reales inicializan el mismo destino | Un único conjunto válido, un ganador, otro rechaza; sin sobrescritura ni doble clave |
| AC-16 | Inyectar fallo de escritura/espacio/cierre/publicación y caída en puntos controlados | Ningún conjunto parcial aceptado; estado previo intacto; temporales privados no utilizables ni limpieza ajena |
| AC-17 | Arranques/upgrades concurrentes con escritor y WAL | Espera acotada/serialización o rechazo limpio; sin corrupción; regresión del bloqueo IMMEDIATE conservada |
| AC-18 | Quitar/cambiar/truncar clave productiva, con y sin propietario | Arranque/alta/backup rechazan; nunca regeneran ni sustituyen clave |
| AC-19 | Pedir alta privada sin propietario en production válida | Token solo en archivo nuevo 0600, hash/caducidad de 10 min; stdout/stderr/artefactos sin factores |
| AC-20 | Fallar entrega privada o usar archivo existente/enlazado | Exit no cero, sin token activo inaccesible ni sobrescritura; limpieza limitada a archivo propio |
| AC-21 | Completar token→contraseña→TOTP en fixture production y probar vencimiento/replay | Alta única con MFA real; inválidos denegados; usuario activo no se reinicia por CLI |
| AC-22 | Consultar/mutar sin MFA, con Origin/CSRF incorrectos; verificar respuesta de sesión HTTPS sintética | Protección financiera, rate limit, cookies Secure/host-only y no-store conservados; ningún bypass |
| AC-23 | Servir fixture limpio tras alta y realizar operaciones E1.4/E1.5 por API | Vacíos coherentes al inicio; maestros explícitos y movimientos/transferencias válidos conservan contratos aprobados |
| AC-24 | Copiar production v6 con age, con WAL activo y escrituras controladas | Snapshot consistente, identidad/huella correctas; DB/clave cifradas y sin plaintext en artefactos compartidos |
| AC-25 | Restaurar esa copia a nuevo destino productivo aislado y usar API con MFA | Datos/IDs/auditoría/origen conservados; pareja de clave válida y permisos privados |
| AC-26 | Reutilizar sesiones/códigos/desafíos previos al restore y entrar con contraseña+TOTP | Accesos anteriores revocados; nuevos códigos emitidos por política existente |
| AC-27 | Restaurar copias genuinas v1–v5 y v6 demo en contexto demo | Compatibilidad histórica, integridad/FK/checksum y upgrade posterior conservados; nunca producción inferida |
| AC-28 | Cruzar copia production→demo, demo/legacy→production o manipular identidad/huella/checksum/esquema | Rechazo antes de publicar destino; copia y estado previos intactos |
| AC-29 | Restore a destino existente o copia >24 h sin aceptación; ensayar aceptación explícita de antigüedad | Rechazo sin sobrescribir; solo antigüedad aceptada habilita continuar, manteniendo demás validaciones |
| AC-30 | Ejecutar suite de API completa con regresiones históricas y nuevas | Todos los tests actuales pasan; rechazo y no mutación se verifican aunque cambien mensajes; no tests omitidos |
| AC-31 | Ejecutar Playwright existente a 390/1440 con MFA, catálogos, movimientos, transferencias y restore | Ambas regresiones pasan; capturas ficticias revisadas, sin factores/trazas sensibles |
| AC-32 | Ejecutar instalación congelada, typecheck, build y controles documentales/repositorio | Checks pasan sin desactivar firmas, guardas ni assertions; lockfile no cambia sin necesidad aprobada |
| AC-33 | Revisar diff/historial, README/guidelines/infra de la futura implementación | Documenta comandos reales, migración v6, canales privados, estados y límites; sin secretos/bases; PR revisable sin deploy |

### Trazabilidad y transición

D1 → AC-01/02/05–10/27/28; D2 → AC-03/04/11–18;
D3 → AC-19–23; D4 → AC-24–29. Calidad y continuidad → AC-30–33.
E1.4/E1.5 conservan sus reglas y regresiones; futuras entregas reutilizarán el
mismo esquema/migrador y política de origen, sin declararse implementadas aquí.

Próximo paso: revisión y aprobación expresa de este contrato completo. Registrar
fuente/fecha y crear commit documental solo después; después solicitar/recibir
autorización para `$dev 31`. En `$dev` crear progress/testplan desde sus plantillas,
mapear AC-01–33, implementar por incrementos (identidad/migración; publicación y
apertura; alta privada; backup/restore; regresión/documentación) y preparar PR
independiente. Merge y despliegue requieren autorizaciones separadas.
