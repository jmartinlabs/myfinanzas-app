# 05 — Transferencias y Referencias: Test plan
Specification: [APPROVED](05-transferencias-referencias-specification.md).
Status: VERIFIED LOCAL — 30 criterios actuales PASS; AC-31–33 contratos futuros. Implementación no integrada, pendiente auditoría/merge autorizado.
Fecha: 2026-10-21; main base a586fa7, rama feat/e1-5-transferencias-referencias.
Solo datos ficticios/local. Excel v5.11 sigue maestro; 30 AC actuales, AC-31–33 futuros.

## Comandos y evidencia
Desde raíz, Bun 1.4.3, age/age-keygen y Chromium del sistema disponibles.
- `bun run typecheck`, `bun run build`: PASS, sin despliegue ni dependencias nuevas.
- `bun run test`: **54 PASS / 908 assertions / 0 fallos**, R1–R10 nuevas + 44 regresiones.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e`:
  **2 PASS / 0 fallos**: E1.1–E1.3 y E1.4–E1.5. E5=tests/e2e/transferencias.ts, reutilizado desde movimientos.spec.ts.
- `./scripts/validate-template`, `./scripts/test-validator` (18 regresiones),
  `./scripts/check-project`, `./scripts/test-checks` (22 regresiones),
  `./scripts/check-repository`, `git diff --check` y `git show --check`: PASS.
No equiparar validación de documentos o estado de servidor con funcionamiento financiero.

## Trazabilidad actual
Bun/API/E2E se complementan por criterio; cada comprobación de UI usa servidor real salvo
estados transitorios de presentación explícitos. Suites finales PASS el 2026-10-21.
| ID | Acción / precondición | Resultado esperado | Suite / evidencia | Resultado |
| --- | --- | --- | --- | --- |
| AC-01 | Alta Transferencia entre dos Saldos elegibles distintos | Un hecho/ID, sin Partida/Subtipo ni ingreso/gasto económico | R1/R7 + E5 | PASS |
| AC-02 | Banco A/B 100/20; transferir 30 | Posiciones 70/50, suma120, sin doble asiento ni acumulado persistido | R1 + E5 | PASS |
| AC-03 | Origen=destino; ID inexistente/inactivo/Manual; payload derivado | Rechazo íntegro; S000 bloqueado en ambos lados aun sin REF; Terminal/No controlado no excluidos automáticamente | R1/R9 + E5 (S000 no seleccionable) | PASS |
| AC-04 | Transferir30 a terminal; Gasto12 desde terminal | Banco reduce solo30, gasto12; terminal no muestra posición convencional ni compra bancaria duplicada | R1 + E5 (financiación y gasto) | PASS |
| AC-05 | Gasto terminal sin permiso Exterior; transferencia interna | Gasto bloqueado; Transferencia interna admisible sin permiso Exterior, si ambos extremos elegibles | R1 + E5 (Origen sin permiso) | PASS |
| AC-06 | Cero/negativo/tercer decimal/null, importes límite | Rechazo exacto, sin float/default/redondeo; positivo válido | R1/R9 + regresión monetaria E1.1/E1.4 | PASS |
| AC-07 | Aportar fondos a saldo con otro motor | Efecto de hecho válido sin presentar saldo incompleto como posición calculada | R1 + E5 (Terminal/No controlado) | PASS |
| AC-08 | Fecha anterior a apertura/primer ciclo; límites Inicio/Fin | Saldo sin filtro apertura, ciclo maestro o Sin ciclo asignable | R1/R9 + E4/E5 | PASS |
| AC-09 | Hoy/mañana y medianoche Madrid/DST | Hoy permitido/mañana rechazado en cliente/servidor Europe/Madrid, también en medianoche/DST; Ciclos futuros y referencia intactos | R1/R9 + E5 cliente/servidor y regresión DST E1.4 | PASS |
| AC-10 | Rectificar/anular Transferencia de fecha máxima | Recalcula máximo y cabecera desde vigentes, puede retroceder/null | R1 + regresión máximo E1.4 | PASS |
| AC-11 | Crear Viaje y Evento; intentar tipo E3 o Navidad | REF estable habilitada solo para los dos tipos, sin ficha huérfana | R2/R8 + E5 | PASS |
| AC-12 | Dos altas concurrentes y después de REF999 | IDs distintos atómicos/no reutilizados, REF1000, fallo sin hueco por commit parcial | R3/R6/R8 | PASS |
| AC-13 | Renombrar REF utilizada y consultar hechos/auditoría | Mismo ID/enlaces, nombre vigente en consulta, evidencia previa intacta; homónimos identificables por ID | R2/R4 + E5 | PASS |
| AC-14 | Desactivar/reactivar REF usada | Historia intacta, sin DELETE; no nuevas selecciones inactivas, no creación de hechos al reactivar | R2/R9 + E5 | PASS |
| AC-15 | Cambiar Tipo de REF con/sin uso, incluido anulado | Contrato app aprobado: permitir sin uso; bloquear usada, sin reclasificación silenciosa/versionado | R2/R8/R9 + E5 Tipo protegido | PASS |
| AC-16 | Gasto CAT011 obligatorio: sin REF, inexistente, Evento o Viaje existente | Ausente/inexistente/Evento bloqueados; Viaje válido por ID, sin depender de nombre Categoría/REF | R2 + E5 Gasto CAT011 | PASS |
| AC-17 | CAT014/CAT009 y No/vacío histórico: sin REF, inexistente y REF operativa de otro Tipo; Ingreso/Transferencia con REF opcional | Sin REF válido; inexistente rechazado; REF Viaje/Evento existente no se rechaza por mapping opcional; sin Categoría inventada ni vacío→false | R2/R3 + E5 CAT014 con Viaje | PASS |
| AC-18 | CAT012/CAT013 obligatorias; intentar Anticipo/Compartido/Vehículo también opcionales | Casos que dependen de E3 bloqueados en UI/API; CAT009 sin REF sigue válido; no fichas de relleno | R2 + E5 CAT012 bloqueada | PASS |
| AC-19 | Consultar REF y filtrar Movimientos | Solo hechos por ese ID, paginación/estado/anulados correctos, sin sumatorio económico mixto | R3/R8 + E5 búsqueda/Tipo y hechos por REF | PASS |
| AC-20 | Rectificar importe/dirección/REF o Tipo del hecho con motivo | Mismo ID, reglas completas nuevo Tipo, impacto ambos lados/referencia/ciclo y auditoría atómica | R1/R3/R6 + E5 rectificación | PASS |
| AC-21 | Anular error que no representa hecho real y reintentar | Mismo ID sin cómputo; ambos lados revertidos en cálculo, consultable, no DELETE ni transferencia compensatoria | R1/R2 + E5 anulación | PASS |
| AC-22 | Dos hechos idénticos genuinos; respuesta perdida tras commit | Advertencia aceptable genera dos IDs; reintento técnico del mismo intento genera solo uno | R3/R6/R8 + E4/E5 coincidencias | PASS |
| AC-23 | Catálogo/mapping/hecho cambia tras preview; fallo auditoría | 409 o rollback total, sin enlace incompatible ni mitad de efectos | R3/R6/R8 + E5 409 contexto | PASS |
| AC-24 | Rectificar categoría para exigir Tipo REF incompatible con hechos | Dependencias reales y bloqueo/impacto comprobable, no solo catálogo ni consumidores simulados | R2/R8 impacto real compatible/incompatible | PASS |
| AC-25 | Acceder sin MFA o mutar sin Origin/CSRF, manipular campos | Rechazo servidor, sin fuga SQL/factores ni ruta alternativa | R7 + regresiones de acceso E1.1/E1.4 | PASS |
| AC-26 | Recorrer listado/ficha/formularios/preview a390/1440 y teclado | Tabla/tarjetas, foco, labels, contraste y sin overflow; capturas reales inspeccionadas solo en dev | E5 + inspección directa PNG 390/1440 y teclado | PASS |
| AC-27 | Vacío/carga/error/404/422/409/401 y reintento | Estados distintos, borrador preservado y sin datos ficticios como sustitución | R7 + E4/E5 carga/error/404/422/409/401 | PASS |
| AC-28 | Upgrade base genuina v4, fallo DDL, dos arranques | Conserva datos/IDs/auditoría/intentos/acceso, rollback íntegro, versión desconocida intacta, sin reseed | R4/R5/R6 + regresiones upgrade anteriores | PASS |
| AC-29 | Snapshot age del nuevo esquema y restore aislado | Datos/posiciones/REF coherentes; MFA/login reales, sesiones revocadas según política; no dependencia externa | R4/R10 + E4/E5 age/restore/MFA reales | PASS |
| AC-30 | Ejecutar suite E1.1–E1.4 tras extensión | Sin regresiones de identidad/seguridad/fecha/saldos/ciclos, 29 AC E1.4 conservados salvo dependencia ahora satisfecha explícitamente | 54 Bun + 2 recorridos Playwright completos | PASS |
| AC-31 | Entrega posterior habilita Transferencias Exterior y fichas E3 | Exterior ordinario y especial fuera de E1.5; Anticipo solo Transferencia; Compartido Gasto o Transferencia con origen Exterior y Quién paga; REF–ficha/participantes coherentes, sin huérfanos | Pruebas futuras de ampliación Exterior/E3.1–E3.3 | CONTRATO FUTURO |
| AC-32 | Consumidores plan/inversión/deuda/Comida | Efectos según su motor, sin doble ejecución ni cambiar Tipo económico; AC-31/33 E1.4 no completos por E1.5 | Pruebas futuras E2/E3/E4/E1.6 | CONTRATO FUTURO |
| AC-33 | Cierre/foto/migración autorizada reales | Protección transversal y fotos inmutables, mapping auditado nombres→IDs, sin reescribir Excel | Pruebas futuras E4/P6/P7 | CONTRATO FUTURO |

## Persistencia, recuperación e integridad
R4 usa inicializador v4 genuino congelado de a586fa7, sin versión renombrada. Compara
filas anteriores completas, JSON histórico byte a byte por columnas, contadores y acceso;
solo schema_version y FK referencia nueva/null son diferencias previstas. Contraseña,
TOTP y sesión previa funcionan tras upgrade; no reset. Restauraciones age v4 y v5 en
ubicaciones nuevas conservan hechos/auditorías y revocan sesiones/intentos según política.
Reabrir es idempotente, con integrity/FK; no resemilla ni importa datos personales.
R5 introduce conflicto DDL después de crear parte del nuevo esquema y eliminar tabla hija:
rollback recupera tablas/triggers/versión/filas. Esquema desconocido intacto.
R6 ejecuta dos procesos sobre v4, reserva REF atómica, reintentos simultáneos de una
Transferencia y dos rectificaciones competidoras; un único ID/efecto, revisión obsoleta 409.
R3 fuerza fallo de auditoría en hecho y catálogo: transacción/counter/intento se revierten.
No posicion acumulada ni transacción independiente por extremo; motor central suma bigint.

## Navegador y capturas reales
E1.5 usa onboarding normal heredado, sesión MFA, Effect HTTP y SQLite reales, sin fixture
HTTP de éxito ni bypass. Fixture financiero exclusivamente ficticio por APIs protegidas.
Se crea Viaje/Evento, se renombra y protege Tipo usado, desactiva/reactiva con teclado;
filtra catálogo y hechos, comprueba posiciones 100/20→70/50, duplicado genuino, rectifica,
anula, financia terminal y registra Gasto sin segundo cargo bancario. Verifica CAT011
obligatoria, CAT014 opcional con REF Viaje válida, E3 bloqueado y conservación de borrador
al crear caso; fecha futura bloqueada en cliente/servidor y 409 tras cambio real de REF.
Backup/restore age real comparte recorrido E1.4: compara lista completa de hechos,
auditorías/ID/posiciones y consulta la Referencia restaurada tras login/TOTP normal.
Los mocks solo representan error temporal de consulta y presentación 401/red en regresión;
la carga se retiene con promesa y se libera al backend real. No sleeps ni retries extras.
Sin claves, factores, bases, trazas o storageState en capturas. No auditoría WCAG completa.

Capturas: artifacts/e1-5/<nombre>.png, ignoradas por Git; CI adjunta solo PNG al artifact
heredado e1-1-screenshots, carpeta e1-5, retención 7 días. **32 PNG inspeccionados directamente**; listado exacto debajo.
A 1440×1000 y 390×844; fullPage puede ser más alto. Input date nativo depende de SO/browser;
Fecha prevista y fichas usan dd/mm/aaaa, sin introducir datepicker ni ambigüedad económica.

## Cinco mejoras visuales aplicadas
1. Contexto de Transferencia nombra ambos extremos y muestra la posición de cada motor,
   eliminando instrucciones heredadas de un único Saldo; desconocido no se pinta como cero.
2. Notas de motor en bloque específico sin aplicar borde inline de help sobre el importe.
   Antes/después en dos columnas solo en escritorio; omite campos no aplicables en alta Transferencia.
3. Filtros de Referencias apilados a 390, etiquetas accesibles explícitas y nombres/IDs
   distinguen casos homónimos; tabla y tarjetas mantienen las mismas capacidades.
4. Ficha REF separa paneles de identidad/usos/Estado; foco al título cargado y a confirmación
   de Estado, teclado real; Tipo usado deshabilitado con motivo, sin recategorizar historia.
5. Errores asociados a campos, limpieza al corregir, 404 sin falso spinner perpetuo y
   borrador de ida/vuelta en memoria; conflicto preserva campos y exige revisar contexto.
Color oscuro sobre #8DBB2E e identidad clara preservados; regresión comprueba pares reales,
sin afirmar certificación de accesibilidad. Inspección de imágenes, no solo sus dimensiones.

## Incidencias resueltas y límites
Expectativas de esquema actual, etiquetas de snapshot y mensaje de dependencia E3 se
actualizan sin quitar comprobaciones de filas/IDs ni pruebas antiguas. Se mantienen backups
v1/v2/v3 y se añade v4 genuino; las copias generadas hoy se identifican como v5.
Primeros ensayos tuvieron timeouts locales de recursos, y dos bucles antiguos apuntaban
al nombre previo del snapshot: corregido sin aumentar timeouts. Al ampliar el E2E se
corrigió una variable de snapshot usada antes de declarar (solo test).
Selects de filtros REF necesitaban nombre accesible explícito, corregido en UI sin relajar
la selección exacta. La navegación antigua de Clasificación podía actuar mientras la ficha
y el foco del shell aún se estaban asentando: helper ahora espera h1 y dos frames de
renderizado antes de interactuar; mismos asserts, sin sleeps/timeouts/retries aumentados.
El fallo antiguo se produjo en desactivar/reactivar, con button visible en el snapshot;
no se atribuye a un defecto financiero no demostrado. Regresión aislada y suite final
completa PASS tras sincronización. Sin fallos/skip/bloqueos locales pendientes.

AC-31–33 no implementados ni probados con consumidores futuros. Exterior ordinario y
especial fuera; entrega responsable aún por asignar. Fichas E3/Quién paga/participantes,
Amortización E1.6, presupuestos, cierres, inversión y Comida no se adelantan.
E1.4 AC-30 se satisface parcialmente para tipos operativos y mapping demostrado; AC-31
solo incorpora Transferencia interna. No declarar esos contratos globales completos.
Backups externos/scheduler y producción pendientes, sin RPO/RTO operativo certificado.
No datos reales, Excel modificado, dependencias nuevas o despliegue.

## Estado de entrega y siguiente acción
Suites finales y capturas PASS; publicar PR funcional para Álex y comprobar
ambas CI del SHA definitivo. Evidencia remota canónica en descripción de PR, sin alterar
el commit validado por registrar sus enlaces. Sin merge automático ni inicio de E1.6.


## Inventario de capturas revisadas
- 1440 px: empty-desktop, movement-list-desktop, reference-detail-desktop, reference-form-desktop, reference-list-desktop, required-reference-desktop, transfer-form-desktop, transfer-impact-desktop.
- 390 px: annulment-mobile, conflict-mobile, draft-return-mobile, duplicate-mobile, e3-blocked-mobile, empty-mobile, error-mobile, future-date-mobile, loading-mobile, movement-list-mobile, not-found-mobile, rectification-mobile, reference-edit-mobile, reference-filter-mobile, reference-form-mobile, reference-inactive-mobile, reference-list-mobile, required-reference-mobile, restored-mobile, terminal-impact-mobile, transfer-detail-mobile, transfer-form-mobile, transfer-impact-mobile, validation-mobile.

Todas las pruebas son de esta rama local. Los controles y CI remotas se registran en la
PR del SHA definitivo; no atribuirle un run anterior. No se publica la base restaurada.

## Revisión final de backup (PR #18)
Auditoría de Álex sobre d5a424d: corregida únicamente la etiqueta del manifiesto de
SQLite v5 a `e1.5-v5`; v1–v4 conservan sus etiquetas anteriores. R10 reproduce el
fallo anterior y verifica versión/etiqueta del manifiesto realmente cifrado con age,
además de restaurar los cinco esquemas genuinos sin actualizar su versión y comprobar
Saldos e integridad referencial. No expone claves ni contenido descifrado en evidencia.
Se mantienen los 30 AC actuales y AC-31–33 futuros; sin cambios económicos o de UI.
CI del nuevo SHA y enlaces de ejecución se registran en la PR, sin merge autorizado.
