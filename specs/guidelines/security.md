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
No se autoriza exponer Vite/HTTP local ni usar datos reales. Pendientes HTTPS/Caddy,
CSP para HTML (Vite desarrollo requiere su política propia), headers del proxy, pruebas
sobre dominio real, hardening/calibración/clock, custodia/rotación y ensayo de recuperación
operativo. No afirmar certificación de seguridad, auditoría WCAG ni ausencia total de
vulnerabilidades por pasar pruebas. Revisar avisos de versiones exactas y dependencias
transitivas; versión/licencia/compatibilidad documentadas en [arquitectura](architecture.md).
Los controles automáticos de repositorio son heurísticos; no identifican semánticamente
todo dato privado y necesitan revisión manual del contenido antes de cada push.
