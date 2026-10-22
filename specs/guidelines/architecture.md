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
| apps/api/src/database.ts | Apertura local y actualización v1/v2/v3/v4→v5 sin resemilla de bases existentes |
| apps/api/src/classification-schema.ts y clasificacion.ts | Esquema v2 y catálogo con validación/relaciones/rectificación |
| apps/api/src/backup.ts | Snapshot consistente, age y restauración aislada; nunca endpoint de copia |
| apps/api/test-support y tests/e2e | Fixtures locales y recorrido real de navegador, sin bypass en app |
| .local y artifacts | Estado y evidencia generados, ignorados por Git |

Vite sirve loopback 5173 y redirige /api a Effect HTTP loopback 3001. SQLite nunca
se importa al navegador. Las páginas usan History API y enlaces reales; no se añadió
router ni librería UI. Backend devuelve JSON no-store y errores correlacionados sin SQL.
La cabecera consulta el maestro Ciclos y la referencia financiera central. Solo Movimientos
es una fuente instalada en E1.4; no usa el reloj para seleccionar el ciclo actual.

## Persistencia E1.1
Semilla exclusivamente demo: openDatabase exige NODE_ENV=development/test antes de
mkdir/apertura/PRAGMA. El proceso se rechaza en producción, entorno desconocido o ausente;
las pruebas incluyen una base existente que queda idéntica tras el rechazo. No hay
inicialización productiva: antes de datos reales se necesita un arranque limpio sin
fixtures y una migración autorizada, no convertir o reutilizar automáticamente una demo.
Esquema técnico v5 (extiende v1/v2/v3/v4 preservando E1.1–E1.4) en inicialización transaccional BEGIN IMMEDIATE, STRICT, FK activas, WAL y FULL,
busy_timeout 3 s. Existen comprobaciones previas de versión fuera de la transacción.
BEGIN IMMEDIATE adquiere el bloqueo de escritura antes de inicializar el esquema
dentro de la transacción, evitando allí el upgrade diferido con otro escritor; [incidencia y regresión](../sqlite-startup-concurrency.md).
Las versiones desconocidas fallan antes de mutar. No hay migraciones
financieras reales, importador ni tablas de motores posteriores. Bases E1.1 v1 se
actualizan sin borrar ni recrear; esquema anterior al E1.1 sin versión se rechaza,
sin convertirlo en datos financieros.

Sxxx es PK inmutable; contador reservado dentro de BEGIN IMMEDIATE, sin reutilización,
continúa S1000. No DELETE, también protegido con trigger; S000 no se modifica.
Saldos persiste configuración, revisión técnica y UTC; la posición es DTO derivado,
no un campo calculado almacenado. EUR INTEGER firmado 64 bits, parsing bigint y CAST
TEXT al leer: JSON decimal en string, nunca number para importes. Fechas civiles ISO.
Ausencias de atributos históricos se conservan; false por omisión solo en alta ordinaria.

PATCH exige revisión, valida impacto y audita en la misma transacción; rollback íntegro.
E1.4 conecta el guard a uso real en Movimientos; las fuentes futuras se integrarán
al entregarse. Las pruebas aisladas de FK/protocolo no afirman protección de motores
inexistentes; evidencia vigente en testplan 04.
Idempotencia POST ligada a payload durante 24 h. Auditoría conserva actor único, campos,
revisión previa/nueva y UTC, sin duplicar cifras. Catálogo filtrado en memoria tras lectura
ordenada por ID, con páginas de 100; suficiente para catálogo personal, sin motor de búsqueda.

## Clasificación E1.2 local — completada e integrada PR #11
Categorías, Subcategorías y Partidas STRICT con PK CAT/SUB/PAR, FK padre obligatorio,
triggers de identidad/no DELETE e índices de padre. Counters por entidad con reserva
IMMEDIATE, idempotencia separada por catálogo e intento durante 24h. Estado en padres
es contrato app. No tablas adelantadas de Presupuesto/Deuda ni campos económicos
superiores redundantes. Control de Subcategoría es lectura/validación, no columna.
Unicidad de nombre SUB global mediante toLowerCase Unicode en chequeo+escritura
IMMEDIATE; acentos/espacios/literales conservados, incluyendo inactivos. Comparación
Unicode en servidor sin clave derivada persistida; SQLite NOCASE cubre solo ASCII.
Escrituras solo por el servicio validado; SQL externo
no es una API admitida. Tests prueban colisión entre dos procesos/categorías.
Vista de rectificación lee descendientes reales y huella de revisiones/configuración
del catálogo; confirmar revalida dentro de transacción. Huella no es una firma de
impacto financiero. Movimientos está instalado en E1.4 con hechos/periodos reales; otros consumidores
aportarán sus comprobaciones al entregarse, sin atribuirles consistencia probada.
Backups identifican esquema desde el snapshot, admiten v1/v2/v3/v4/v5 y verifican coincidencia
con manifest. Restaurar revoca acceso como E1.1; actualizar in situ no lo revoca.
No cambia algoritmo de autenticación, dependencias ni RPO/RTO operativo.

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
externos operativos se revisarán antes de datos reales. Motores financieros/histórico/cierre quedan
fuera: [roadmap](../roadmap.md), [seguridad](security.md), [calidad](quality.md).


## Ciclos E1.3 — integrado PR #13; consumidor Movimientos en E1.4
SQLite v3 incorpora ciclos e intentos, sin semillas de ciclos. Upgrade v1→v2→v3 o
v2→v3 bajo el mismo IMMEDIATE, conserva filas previas y autenticación; rollback de DDL.
Inicio único, mes financiado único como columna generada virtual desde Inicio,
EUR INTEGER 64 bits leído como texto; solo Inicio/saldo son entradas financieras.
ID técnico TEXT desde contador atómico; trigger impide UPDATE/DELETE e inserción no
posterior. Rectificaciones necesitan el procedimiento de E2.1, no un atajo de API.
Fin/estado/corte/contexto se derivan del maestro completo antes de filtrar/paginar.
GET /api/ciclos, /api/ciclos/:id, /api/ciclos/contexto; POST /api/ciclos con
idempotency-key y contextRevision. Sin PATCH/DELETE ni endpoint de fecha alternativa.
La huella de contexto protege alta concurrente; no es un cierre ni firma financiera.
Servicio puro de referencia/intervalos probado con fechas ficticias aisladas; runtime
con lector de Movimientos desde E1.4; Comida/inversión permanecen pendientes. Sin
hechos vigentes la referencia es null, sin tablas simuladas ni fallback al reloj. Cabecera compartida
React consume ese contexto en las tres entregas. [Trazabilidad](../03-ciclos-financiados-testplan.md).
Copias age admiten manifest v3 y prueban restauración aislada; no cambia custodia externa.


## Movimientos E1.4 — integrado PR #15/#16; base de E1.5
SQL v4, STRICT/FK y transacción IMMEDIATE. Tabla movimientos: ID decimal TEXT exacto
(contador INTEGER atómico, sin otra identidad), fecha civil, Tipo, EUR INTEGER positivo,
Origen/Destino por FK, Subtipo o Partida, Concepto/Nota, anulado, revisión y UTC.
CHECK de dirección y tipado: Ingreso S000→Saldo sin Partida; Gasto Saldo→S000 con
Partida. Sin tablas/columnas de Referencias, presupuestos, deudas o inversión de relleno.
Triggers: ID inmutable, sin DELETE, anulado inmutable. movement_audit append-only
con motivo, UTC, actor y anterior/posterior JSON exactos. movement_attempts conserva
respuesta privada 24h para reintentos; restauración la revoca como intentos existentes.
Sin saldos acumulados, clasificación superior ni Ciclo persistidos como fuentes paralelas.

movement-ledger centraliza filas vigentes, posición bigint y máxima Fecha. Suma en
bigint desde INTEGER leído como TEXT: admite agregado superior a int64 sin float ni
desbordamiento, respetando rango individual previo. Solo Control Movimientos calcula
apertura null→0 sin mutar null ni aplicar Fecha apertura; otros controles mantienen su
semántica/disponibilidad. Lecturas financieras de API usan snapshot transaccional.
Ciclos deriva intervalos desde maestro completo; referencia Movimientos disponible
vacía/con hechos, otras fuentes pendientes. Rectificar/anular recalcula máximo real.
Europe/Madrid limita Fecha económica de Ingreso/Gasto al día actual en servidor; no
convierte reloj en referencia ni restringe Ciclos futuros.

movimientos.ts valida y compone preview→confirmación, coincidencia por firma aprobada,
revisión/huella de hechos+catálogos+ciclos+saldos y auditoría atómica. Huella es control
de coherencia, no autorización de seguridad ni firma de cierre. Sesión MFA/CSRF siguen
obligatorias. Guarda de futuras protecciones inyectable solo por servidor; sin proveedor
simulado en runtime. Anulación valida operación/impacto, preservando enlaces inactivos.
Saldo usado bloquea edición ordinaria de Tipo/Control/apertura/fecha/permiso que afecte
historia. Clasificación conecta movimientos reales, cambios indirectos de ancestros,
periodos y obligaciones; huella incluye hechos y nueva obligación no verificable bloquea.
Posición por Saldo no depende de clasificación; indicadores no instalados siguen pendientes.

API autenticada: GET /api/movimientos, /:id, /opciones; POST /impacto, alta en raíz;
POST /:id/impacto, /rectificar, /impacto-anulacion, /anular. Sin PATCH/DELETE ni fecha
financiera manual. Respuestas y auditoría nunca se guardan en artifacts de CI; solo PNG.
GET opciones lee catálogos completos para selección/filtros, no primera página truncada.
No dependencias nuevas. [Resultados y límites](../04-movimientos-testplan.md).


## E1.5 — implementación local en revisión
reference-schema.ts actualiza v4→v5 bajo el BEGIN IMMEDIATE existente. Crea referencias
STRICT/FK, solo Viaje/Evento, contador REF y reference_attempts. Reconstruye el CHECK
Movimientos para Transferencia y FK referencia opcional; copia filas con referencia NULL,
conserva JSON de movement_audit verbatim y reinstala tablas/índices/triggers. La copia
transitoria de auditorías es TEMP dentro de la transacción, no fuente paralela. No desactiva
FK ni resemilla datos; un fallo revierte también DDL/versión. Inicializador genuino v4
congelado en test-support/database-v4.ts prueba continuidad, no un v5 rebautizado.

referencias.ts gestiona catálogo con revisiones, reserva atómica sin reutilizar REF,
continuación REF1000 e idempotencia 24 h del alta; no DELETE. Tipo usado por cualquier
hecho, incluso anulado, protegido en servicio y trigger. Estado y nombre no cambian
identidad, hechos ni evidencia anterior; edición audita antes/después en audit existente.
reference-rules.ts contiene la única matriz confirmada por IDs y validador compartido:
existencia para toda REF; compatibilidad solo si obligatoria; fichas E3 no habilitadas.
La matriz no crea Categorías ni deriva nada de nombres. No editor de políticas nuevo.

Movimientos añade Transferencia interna y REF opcional por FK; sin tabla de hechos ni
contador de transferencias. Misma transacción/huella/auditoría y retry previo al chequeo
obsoleto. La firma de coincidencia usa Fecha/Tipo/importe/origen/destino/Subtipo/Partida/REF,
no Concepto/Nota como clasificadores. Coincidencias reales confirmables sin rechazo por
contenido. Reintentos antiguos conservan response/hash almacenados, sin conversión.
FinanceRevision incluye catálogo REF; cambios invalidan preview. La clasificación usada
revalida Referencias reales, permitiendo correcciones compatibles y bloqueando inválidas.

Motor positionCents ya suma entradas y resta salidas: Transferencia participa una vez
en cada extremo sin saldo persistido. Terminal/No controlado/Inversiones siguen sin
posición convencional de este motor. Ciclos y máximo de fecha usan los mismos hechos.
MFA/Origin/CSRF heredados para /api/referencias (GET/POST), /:id (GET/PATCH) y acciones
POST desactivar/reactivar; no DELETE ni bypass del registro. Sin dependencias nuevas.
Backups identifican v1–v5 desde snapshot; restore borra también reference_attempts,
revoca acceso según política existente, sin modificar el origen ni operar producción.


## Contrato vigente en implementación 31

La especificación 31 aprobada añade identidad v6 a las migraciones existentes.
`database-schema.ts` comparte DDL y separa fixtures; `database-identity.ts` valida
contrato/origen. `database.ts` aplica la matriz de entornos antes de mutar y bajo
bloqueo. `private-state.ts` valida rutas/UID/permisos, huella y publicación Linux
glibc sin reemplazo. La identidad del filesystem raíz se interpreta en el namespace
actual (incluido rootless), manteniendo los archivos privados en el UID efectivo.
`production-state.ts` crea DB+clave en estado nuevo; startup nunca crea producción.
`setup.ts` entrega token productivo a archivo privado, con rollback si falla.
Backup/restore preservan identidad v6 y compatibilidad de snapshots genuinos v1–v5.
El código Bun se carga perezosamente en helpers para conservar uso de TOTP desde
Node/Playwright. No se alteran motores financieros, bind de contenedor ni frontend.
Esta sección sustituye límites demo-only antiguos únicamente en la rama 31;
no acredita integración, operación remota ni autorización de datos reales.

Ver [contrato 31](../31-sqlite-produccion-specification.md) y
[evidencia](../31-sqlite-produccion-testplan.md).

## E1.6 — Deuda mínima, candidato local
Esquema7 añade deudas, intentos y relación opcional Partida→Deuda; capital/intereses en el hecho Movimiento único. La migración preserva filas/auditorías/FK/índices/triggers sin reseed/backfill y se ejecuta dentro de IMMEDIATE. En origen production se invoca únicamente después de verificar la pareja efectiva y guardas existentes. Desarrollo autorizado el 2026-10-22, exclusivamente fixtures locales; sin ejecución operativa ni despliegue.

`deudas.ts` centraliza maestro/posición derivada desde apertura y capital aplicable; `debt-schema.ts` mantiene la extensión versionada. Movimientos incorpora el cuarto Tipo y revisión banco/capital/Gasto, huella con entradas Deuda y contexto técnico para rechazar confirmación obsoleta; no API paralela de pagos ni acumulados persistidos. Backup admite manifiesto7/e1.6-v7/origen y restore revoca también intentos Deuda. [Evidencia06](../06-deuda-testplan.md); E2/E4/cierres siguen pendientes.
