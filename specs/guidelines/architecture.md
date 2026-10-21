# Architecture guidelines

## Stack y límites confirmados
React + TypeScript + Vite; Bun + Effect TS/Effect HTTP; SQLite mediante bun:sqlite y
SQL directo, sin ORM. Bun Workspaces, CSS propio/tokens, Bun Test y Playwright.
E1.1 local y ficticio autorizada en STEP 7; Excel v5.11 sigue maestro. Especificación
[aprobada](../01-saldos-control-specification.md) conserva la autoridad financiera;
no es un modelo definitivo de todos los módulos.

## Estructura implementada
| Ruta | Responsabilidad |
| --- | --- |
| apps/web/src | Shell/navegación, acceso, API client, listado/ficha/formulario y controles reutilizables |
| apps/api/src/main.ts | Recurso SQLite scoped Effect y servidor Effect HTTP loopback |
| apps/api/src/app.ts | Router Effect HTTP, guard de acceso, límite JSON y errores públicos |
| apps/api/src/saldos.ts | Validación Effect Schema + reglas explícitas, consultas/transacciones y DTO |
| apps/api/src/auth.ts | Argon2id nativo Bun, TOTP, desafíos, sesiones y recuperación |
| apps/api/src/database.ts | Esquema local versión 1 y seis registros ficticios deterministas |
| apps/api/src/backup.ts | Snapshot consistente, age y restauración aislada; nunca endpoint de copia |
| apps/api/test-support y tests/e2e | Fixtures locales y recorrido real de navegador, sin bypass en app |
| .local y artifacts | Estado y evidencia generados, ignorados por Git |

Vite sirve loopback 5173 y redirige /api a Effect HTTP loopback 3001. SQLite nunca
se importa al navegador. Las páginas usan History API y enlaces reales; no se añadió
router ni librería UI. Backend devuelve JSON no-store y errores correlacionados sin SQL.
La cabecera muestra No disponible porque el maestro Ciclos todavía no existe.

## Persistencia E1.1
Semilla exclusivamente demo: openDatabase exige NODE_ENV=development/test antes de
mkdir/apertura/PRAGMA. El proceso se rechaza en producción, entorno desconocido o ausente;
las pruebas incluyen una base existente que queda idéntica tras el rechazo. No hay
inicialización productiva: antes de datos reales se necesita un arranque limpio sin
fixtures y una migración autorizada, no convertir o reutilizar automáticamente una demo.
Esquema técnico v1 en inicialización transaccional BEGIN IMMEDIATE, STRICT, FK activas, WAL y FULL,
busy_timeout 3 s. Existen comprobaciones previas de versión fuera de la transacción.
BEGIN IMMEDIATE adquiere el bloqueo de escritura antes de inicializar el esquema
dentro de la transacción, evitando allí el upgrade diferido con otro escritor; [incidencia y regresión](../sqlite-startup-concurrency.md).
Las versiones desconocidas fallan antes de mutar. No hay migraciones
financieras, importador ni tablas de motores posteriores. La antigua tabla demo del
bootstrap no se usa ni se transforma en registros financieros; base local nueva recomendada.

Sxxx es PK inmutable; contador reservado dentro de BEGIN IMMEDIATE, sin reutilización,
continúa S1000. No DELETE, también protegido con trigger; S000 no se modifica.
Saldos persiste configuración, revisión técnica y UTC; la posición es DTO derivado,
no un campo calculado almacenado. EUR INTEGER firmado 64 bits, parsing bigint y CAST
TEXT al leer: JSON decimal en string, nunca number para importes. Fechas civiles ISO.
Ausencias de atributos históricos se conservan; false por omisión solo en alta ordinaria.

PATCH exige revisión, valida impacto y audita en la misma transacción; rollback íntegro.
El guard de impacto se inyecta para futuras fuentes; la app actual no tiene operaciones
históricas que consultar. Tests usan FK/impacto ficticios aislados. Al entregar esas
fuentes deberán conectarse al guard: no se afirma protección de módulos inexistentes.
Idempotencia POST ligada a payload durante 24 h. Auditoría conserva actor único, campos,
revisión previa/nueva y UTC, sin duplicar cifras. Catálogo filtrado en memoria tras lectura
ordenada por ID, con páginas de 100; suficiente para catálogo personal, sin motor de búsqueda.

## Dependencias y versiones
Bun 1.4.3, React/DOM 19.3.1, Vite 8.3.4, TypeScript 7.0.2, Playwright 1.64.1;
Effect 3.22.3, platform 0.97.2, platform-bun 0.91.3. Exactas y bun.lock congelado.
Única dependencia runtime nueva: **otpauth 9.5.2 (MIT)**, mantenida y compatible con Bun,
para TOTP estándar/replay/ventana, evitando algoritmos OTP propios. Hash Argon2id y
cifrado AES-GCM usan APIs nativas. Sin ORM, framework de identidad, correo ni servicio.
`age` CLI externo ya previsto por DT6, instalado localmente v1.3.2 desde release oficial
con SHA-256 publicado verificado; CI usa paquete de Ubuntu. No se versiona el binario.
Prettier 3.6.2 se utilizó como herramienta efímera de formato, sin dependencia de proyecto.
Revisión de advisories `bun audit --json`: sin entradas en la ejecución documentada;
no equivale a auditoría de seguridad completa. Evidencia vigente en testplan.

## Destino posterior
VPS UE todavía sin contratar, Docker Compose/Caddy y dominio previsto myfinanzas.pp.ua;
HTTPS obligatorio. No hay deploy ni servicios configurados. Seguridad/custodia y backups
externos operativos se revisarán antes de datos reales. E1.2/motores/histórico/ciclos quedan
fuera: [roadmap](../roadmap.md), [seguridad](security.md), [calidad](quality.md).
