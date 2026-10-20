# Security guidelines

## Modelo actual y límites
Repositorio privado por cambio manual del usuario; aplicación de un único usuario. El bootstrap es exclusivamente
local, con fixtures deterministas sin importes. El esquema técnico no contiene datos reales.
Fuente: instrucciones del usuario de inicialización y política Git/GitHub, 2026-10-20.
La política operativa de publicación y aprobación vive solo en [AGENTS](../../AGENTS.md).

## Datos y configuración
Originales financieros, documentos privados, exports y bases con datos reales permanecen
fuera del repositorio y del historial. Los documentos financieros se entregarán de manera
controlada para revisión, no se incorporarán automáticamente al repositorio, aunque ahora sea privado.
No importar el Excel financiero real ni inferir reglas de datos no recibidos.
La referencia vigente y su estado de revisión pertenecen a [project.md](../project.md).

.local, bases SQLite y journals, .env, claves privadas y formatos financieros comunes
están ignorados. Esa cobertura no detecta contenido privado renombrado o ya versionado;
no equivale a un mecanismo de prevención exhaustivo. Mantener datos de prueba ficticios
y mínimos. Antes de compartir capturas, logs o evidencia revisar su contenido.

DATABASE_PATH es el único ajuste de aplicación actual; es una ruta local de confianza
que debe apuntar exclusivamente a una base ficticia. No es una credencial ni proviene
de peticiones HTTP. No se necesita secreto para ejecutar el bootstrap. Futuros secretos:
configuración segura del entorno, nunca valores en documentación, chat, logs o Git.

## Superficie actual y amenazas
| Riesgo | Medida implementada / límite |
| --- | --- |
| Exposición de la app sin login | API y Vite solo en loopback; sin autorización para publicarlos |
| Filtración de errores SQL | API responde 500 genérico; prueba existente |
| Inyección en semilla | Valores mediante parámetros preparados; lectura fija sin entradas del usuario |
| Datos privados en pruebas | Fixtures deterministas; SQLite aislado en pruebas; sin importadores |
| Acceso al archivo desde frontend | SQLite exclusivamente en backend; la UI recibe JSON |
| Paquetes no reproducibles | Versiones directas exactas y lockfile; instalación congelada |

Loopback no proporciona autenticación frente a otros procesos o usuarios locales.
No existen controles de sesiones, CSRF, rate limiting, MFA ni auditoría de acceso.
El endpoint es de lectura y no procesa datos aportados por usuarios. La UI comprueba
la forma mínima del JSON; no hay validación runtime del dominio financiero implementada.
Bun Test verifica algunos límites técnicos, no certifica la seguridad de producción.

## Requisitos confirmados antes del uso real online
Autenticación robusta y segundo factor, sin registro público; HTTPS obligatorio.
Destino: VPS Linux con Docker Compose y Caddy. La arquitectura de sesiones, recuperación,
protección de acceso, backups/restauración, permisos del archivo SQLite, cifrado/retención,
logs y migraciones requiere diseño y validación antes de introducir datos reales.
No se considera desplegable a producción el build estático de este bootstrap.

Mantener TLS, firmas y checksums durante instalaciones. No suprimir verificaciones para
resolver fallos. No hay auditoría de vulnerabilidades de dependencias ejecutada ni garantía
de ausencia total de secretos por pasar el validador. STEP 3 incorpora check-repository:
revisa nombres sensibles, firmas de SQLite y patrones comunes de credenciales en los
commits alcanzables desde HEAD, sus mensajes, el índice y los archivos versionados
del árbol de trabajo. Exige historial completo y oculta los valores en los informes.
No analiza archivos nuevos sin añadir al índice, no reconoce todas las credenciales
ni identifica semánticamente cualquier dato financiero real; la revisión manual sigue
siendo obligatoria según AGENTS. Pruebas con secretos sintéticos y repositorios Git
temporales demuestran detección de contenido borrado, staged y mensajes de commit.
