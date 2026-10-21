# Security guidelines

## Alcance y datos
Aplicación privada monousuario, **solo loopback y datos ficticios**. Ningún Excel, registro
personal, DB, factor o clave se publica. `.local`, bases/journals, `.env`, claves y `.age`
están ignorados; esto no sustituye revisión de historial/índice según [AGENTS](../../AGENTS.md).
Excel estable y originales no incorporados ni inspeccionados en Codex; únicamente
referencia sanitizada y evidencias aportadas por el usuario.

## Acceso implementado E1.1
- Alta única mediante token CLI local aleatorio, hash persistido, 10 min/uso único;
  el usuario activo no puede reiniciarse con setup. Sin registro público ni rescate administrativo.
- Contraseña 15–128 caracteres, Argon2id Bun con 64 MiB/3 pasadas. No truncar ni registrar.
  Calibración del equipo destino queda para su preparación.
- OTPAuth 9.5.2, TOTP SHA1/6 dígitos/30 s/ventana ±1, consumo del paso atómico y anti-replay.
  Secreto AES-256-GCM con nonce aleatorio, clave 32 bytes fuera de DB y de Git, permisos 0600.
  Se entrega secreto de enrolado solo tras token local o contraseña válida; no hace de sesión.
- Desafío 5 min/5 intentos; sesión opaca 256 bits solo hash persistido, CSRF ligado a sesión.
  30 min de inactividad, máximo 12 h. Cookies host-only HttpOnly/SameSite=Strict/Path=/.
  HTTPS usa Secure/prefijo __Host-; HTTP solo loopback y cookie de nombre distinto.
- Todas las rutas financieras requieren sesión MFA completa; acceso/status/health mínimos
  públicos. Mutaciones verifican Origin exacto y CSRF; sin CORS comodín ni localStorage de tokens.
- Diez códigos 128 bits, hashes, una sola exhibición. Recuperar exige contraseña+código,
  consume y revoca códigos/sesiones anteriores, reenrola TOTP antes de autorizar datos.
  No email, IdP, recuperación remota alternativa ni CLI de administración general.
- Cinco fallos en 15 min disparan espera exponencial de 1–60 s. Contador SQLite de tamaño
  fijo, resistente a reinicio, ventana reiniciada al vencer. En este origen local único,
  el bucket representa cuenta+origen admitido; no confiar IP/X-Forwarded-For. Eventos
  mínimos sin payload/IP, 24 h y máximo 1.000. Desafíos/sesiones máximo 20 activos.
  Límite por origen/IP frente a internet deberá revisarse al preparar proxy/producción.

No inventar factor perdido: la pérdida total de contraseña/factores requiere decisión
local excepcional justificada, no un bypass ya implementado. TOTP no resiste phishing.
Clave externa protege copia de DB aislada, no compromiso del host completo.

## Persistencia, API y copias
JSON 16 KiB, validación estructural Effect Schema y reglas financieras explícitas,
SQL parametrizado, revisiones, idempotencia y transacciones; sin filtros nuevos por Fecha
apertura. Errores 500 genéricos con requestId; no-store/nosniff/referrer-policy/frame deny.
No se registran contraseñas, cookies, tokens, OTP, importes ni payload de requests.

SQLite/directorios privados, WAL/foreign_keys, backups por conexión CLI dedicada.
VACUUM INTO, integrity/FK/esquema, manifest cifrado (versión/id/instante/checksum), age y
paquete cifrado de clave TOTP separado; publicación por rename tras cifrado/fsync.
Fallo limpia temporales y no reemplaza copia buena. Temporal plaintext tiene 0600 dentro
0700; caída abrupta/SSD no garantizan borrado seguro: volumen cifrado necesario en destino.
Restaurar solo a destino nuevo; verificar hash/esquema/clave y revocar sesiones/desafíos/
códigos. Nuevo login real emite códigos nuevos; códigos antiguos no resucitan.
Copia >24h requiere aceptación explícita; comando nunca reemplaza una base en servicio.

Objetivos de operación aceptados: RPO24h/RTO2h, 7 diarias/4 semanales/3 mensuales.
No scheduler, poda, almacenamiento externo ni SLA implementados; ensayo reproducible
local en testplan. Custodia definitiva de identidad/rotación, monitorización y destino
externo independiente antes de despliegue. Misma máquina no cubre pérdida del disco.

## Límites antes de producción
La apertura/inicialización E1.1 solo admite NODE_ENV=development/test; producción,
valores desconocidos o ausencia fallan antes de tocar el sistema de archivos/SQLite.
Los scripts locales establecen un default explícito sin sobreescribir NODE_ENV existente.
El guard de entorno evita una semilla accidental; no identifica datos personales ni
permite introducirlos en desarrollo. El uso real requiere inicialización limpia sin
fixtures y migración autorizada del maestro, todavía no implementadas.
No se autoriza exponer Vite/HTTP local ni usar datos reales. Pendientes HTTPS/Caddy,
CSP para HTML (Vite desarrollo requiere su política propia), headers del proxy, pruebas
sobre dominio real, hardening/calibración/clock, custodia/rotación y ensayo de recuperación
operativo. No afirmar certificación de seguridad, auditoría WCAG ni ausencia total de
vulnerabilidades por pasar pruebas. Revisar avisos de versiones exactas y dependencias
transitivas; versión/licencia/compatibilidad documentadas en [arquitectura](architecture.md).
Los controles automáticos de repositorio son heurísticos; no identifican semánticamente
todo dato privado y necesitan revisión manual del contenido antes de cada push.


## Continuidad E1.2
Rutas de clasificación pasan por la sesión MFA/Origin/CSRF existente; sin bypass.
Esquemas v2/v3/v4 conservan tablas de acceso y clave externa al actualizar v1/v2/v3, sin reset.
Copias v1/v2/v3/v4 verificadas; restauración sigue revocando sesiones/códigos por política
E1.1, a diferencia de actualizar esquema in situ. Guarda de entorno development/test
intacta y clasificación vacía al iniciar: no datos ni maestros financieros reales.


## E1.4 local
Rutas de hechos reutilizan sesión MFA, Origin/CSRF y controles de JSON/errores. No
nuevos proveedores, dependencias o recuperación administrativa. Datos de hechos y
before/after solo en DB/API autenticada, nunca logs públicos, repo ni artifact de claves.
Upgrade v3→v4 preserva sesiones/clave; restore age revoca acceso/intentos existentes.
Fechas/importe/permisos/relaciones se revalidan bajo transacción; huella no sustituye
MFA ni protecciones financieras. Cierres reales ausentes: contrato futuro, sin afirmar
protección de módulos no entregados. Entorno demo development/test y barrera productiva
intactos; sin inicialización real, copia externa, scheduler, deploy ni RPO/RTO operativos.


## E1.5 local/ficticia
Referencias/Transferencias heredan sesión MFA, CSRF, Origin, límites y errores sin SQL.
No tokens ni payload financieros en logs/artifacts. Sin rutas de administración, acceso
remoto alternativo o nuevas dependencias. Relaciones por FK y validación bajo IMMEDIATE;
no validar solo en selector. REF informada siempre existente; compatibilidad solo por
obligación confirmada, tipos con fichas ausentes no operativos. Transferencias S000
rechazadas en servicio y CHECK, incluidas ordinarias; no permisos implícitos para Exterior.
Upgrade v4→v5 no altera contraseña/clave/TOTP/sesiones previas ni auditoría histórica;
restore age sigue revocando acceso/intentos. Producción rechazada antes de abrir/sembrar
por el guard existente. Copia externa, automatización, operación real y migración limpia
siguen pendientes; datos exclusivamente ficticios, sin despliegue ni RPO/RTO productivo probado.


## Contrato aprobado 31 — separación de persistencia

La apertura production exige configuración HTTPS y DB v6 production con clave
externa existente y huella válida. Desarrollo/test rechazan production; producción
rechaza demo y legacy, sin promoción ni adopción de la variante #22. Migraciones
legacy solo en demo, transaccionales y sin reset de acceso. No inferir origen por
nombres ni por filas. El marcador/huella previenen accidentes, no administradores
maliciosos del host. La raíz y sus ancestros deben ser de confianza, con protección
sticky de /tmp admitida en ensayos; estado 0700 y archivos 0600 del UID efectivo.
Crear/publicar conjunto completo sin reemplazo; pérdida de clave nunca regenera.
Token inicial productivo solo en archivo exclusivo 0600, caducidad/consumo vigente,
rollback de hash si falla entrega; retirar archivo por canal local privado tras uso.
Copias y restauración conservan identidad; restaurar revoca accesos, migrar no.
Estas garantías técnicas locales sustituyen el bloqueo demo-only histórico en la
rama 31, sin autorizar VPS, exposición de Vite, datos reales ni despliegue. Permanecen
pendientes los gates HTTPS/proxy, rate limit de borde, cifrado de disco, copias
offsite/retención/monitorización, custodia externa y ensayo operativo antes del uso real.

Ver [contrato 31](../31-sqlite-produccion-specification.md) y
[evidencia](../31-sqlite-produccion-testplan.md).

Revisión final 31: clave validada también por fstat/dev/ino/nlink del descriptor;
sidecars SQLite rechazan symlinks/hardlinks/permisos ajenos. La conexión efectiva
comprueba identidad y huella antes de PRAGMA mutables; READWRITE explícito impide
CREATE accidental tras desaparición de la DB. Publicación con dirfd privado y
renameat2 relativo sin reemplazo; backup valida el padre antes de crear snapshot.
Fallo de entrega solo limpia el inode propio, preservando reemplazos de otra operación.
El UID operador/root sigue siendo frontera de confianza: no se promete aislamiento
contra procesos host maliciosos con ese UID ni contra sustituciones ABA arbitrarias.
Ver regresiones P12–P18 en testplan 31; ninguna autorización de VPS o datos reales.

### Revisión crítica 31

La identidad/huella y el descifrado se verifican en la conexión SQLite efectiva,
no solo en otra conexión por ruta. La clave se valida con fstat del descriptor
O_NOFOLLOW, dev/ino, modo 0600, UID y nlink; no basta un lstat previo. El preflight
de identidad persistente usa SQLite URI readonly+immutable para no modificar SHM
al rechazar cruces. Producción se checkpointa antes de publicar y su origen es
inmutable; el runtime real sigue leyendo WAL y revalidando bajo bloqueo.
Restaurar conserva la reserva explícita del nombre bundle.tmp para evitar colisiones.
Fallo fsync posterior a rename puede dejar conjunto completo con durabilidad
incierta: preservar e inspeccionar, sin borrar ni reintentar sobrescribiendo.
La raíz y el UID del servicio siguen siendo de confianza; no se ofrece aislamiento
frente a root/proceso malicioso con acceso de escritura al estado privado.

Reconciliación de cambios concurrentes: se preservan main 68b0624 (R6) y el
endurecimiento remoto 9362158 (P12–P18, dirfd, sidecars, READWRITE sin CREATE,
limpieza por inode y raíz de backup validada). Estos avances ya resuelven varios
hallazgos del ensayo inicial. La solución local adicional conserva dichas
protecciones, añade preflight de identidad sin SHM y nueve regresiones S1–S7.
Se mantiene bundle.tmp como nombre reservado, sin ampliar rutas aceptadas ni
introducir otro espacio temporal innecesario. Los conteos anteriores son historia
local previa a la reconciliación; el resultado combinado se registra al validar.
