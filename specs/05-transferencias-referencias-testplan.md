# 05 — Transferencias y Referencias: Test plan
Specification: [APPROVED](05-transferencias-referencias-specification.md).
Status: IN PROGRESS — ninguna declaración de aceptación final hasta pruebas UI completas.
Fecha: 2026-10-21. Solo local/ficticio; 30 AC actuales, AC-31–33 futuros.

## Matriz de pruebas previstas
| ID | Acción / precondición | Resultado esperado | Prueba prevista | Clase | Estado actual |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Alta Transferencia entre dos Saldos elegibles distintos | Un hecho/ID, sin Partida/Subtipo ni ingreso/gasto económico | Bun/API + UI | I  PENDING |
| AC-02 | Banco A/B 100/20; transferir 30 | Posiciones 70/50, suma120, sin doble asiento ni acumulado persistido | Bun exactitud + E2E | I  PENDING |
| AC-03 | Origen=destino; ID inexistente/inactivo/Manual; payload derivado | Rechazo íntegro; S000 bloqueado en ambos lados aun sin REF; Terminal/No controlado no excluidos automáticamente | Bun/API | I  PENDING |
| AC-04 | Transferir30 a terminal; Gasto12 desde terminal | Banco reduce solo30, gasto12; terminal no muestra posición convencional ni compra bancaria duplicada | Bun + UI | I  PENDING |
| AC-05 | Gasto terminal sin permiso Exterior; transferencia interna | Gasto bloqueado; Transferencia interna admisible sin permiso Exterior, si ambos extremos elegibles | Bun/API | I  PENDING |
| AC-06 | Cero/negativo/tercer decimal/null, importes límite | Rechazo exacto, sin float/default/redondeo; positivo válido | Bun/API | I  PENDING |
| AC-07 | Aportar fondos a saldo con otro motor | Efecto de hecho válido sin presentar saldo incompleto como posición calculada | Bun/UI | I  PENDING |
| AC-08 | Fecha anterior a apertura/primer ciclo; límites Inicio/Fin | Saldo sin filtro apertura, ciclo maestro o Sin ciclo asignable | Bun + UI | I  PENDING |
| AC-09 | Hoy/mañana y medianoche Madrid/DST | Hoy permitido/mañana rechazado en cliente/servidor Europe/Madrid, también en medianoche/DST; Ciclos futuros y referencia intactos | Bun servidor/UI | I  PENDING |
| AC-10 | Rectificar/anular Transferencia de fecha máxima | Recalcula máximo y cabecera desde vigentes, puede retroceder/null | Bun + E2E | I  PENDING |
| AC-11 | Crear Viaje y Evento; intentar tipo E3 o Navidad | REF estable habilitada solo para los dos tipos, sin ficha huérfana | Bun/API/UI | I  PENDING |
| AC-12 | Dos altas concurrentes y después de REF999 | IDs distintos atómicos/no reutilizados, REF1000, fallo sin hueco por commit parcial | Bun procesos | I  PENDING |
| AC-13 | Renombrar REF utilizada y consultar hechos/auditoría | Mismo ID/enlaces, nombre vigente en consulta, evidencia previa intacta; homónimos identificables por ID | Bun + UI | I  PENDING |
| AC-14 | Desactivar/reactivar REF usada | Historia intacta, sin DELETE; no nuevas selecciones inactivas, no creación de hechos al reactivar | Bun/API/UI | I  PENDING |
| AC-15 | Cambiar Tipo de REF con/sin uso, incluido anulado | Contrato app aprobado: permitir sin uso; bloquear usada, sin reclasificación silenciosa/versionado | Bun/API | I  PENDING |
| AC-16 | Gasto CAT011 obligatorio: sin REF, inexistente, Evento o Viaje existente | Ausente/inexistente/Evento bloqueados; Viaje válido por ID, sin depender de nombre Categoría/REF | Bun/API/UI | I  PENDING |
| AC-17 | CAT014/CAT009 y No/vacío histórico: sin REF, inexistente y REF operativa de otro Tipo; Ingreso/Transferencia con REF opcional | Sin REF válido; inexistente rechazado; REF Viaje/Evento existente no se rechaza por mapping opcional; sin Categoría inventada ni vacío→false | Bun/API | I  PENDING |
| AC-18 | CAT012/CAT013 obligatorias; intentar Anticipo/Compartido/Vehículo también opcionales | Casos que dependen de E3 bloqueados en UI/API; CAT009 sin REF sigue válido; no fichas de relleno | Bun/UI | I  PENDING |
| AC-19 | Consultar REF y filtrar Movimientos | Solo hechos por ese ID, paginación/estado/anulados correctos, sin sumatorio económico mixto | API/E2E | I  PENDING |
| AC-20 | Rectificar importe/dirección/REF o Tipo del hecho con motivo | Mismo ID, reglas completas nuevo Tipo, impacto ambos lados/referencia/ciclo y auditoría atómica | Bun/API/UI | I  PENDING |
| AC-21 | Anular error que no representa hecho real y reintentar | Mismo ID sin cómputo; ambos lados revertidos en cálculo, consultable, no DELETE ni transferencia compensatoria | Bun/E2E | I  PENDING |
| AC-22 | Dos hechos idénticos genuinos; respuesta perdida tras commit | Advertencia aceptable genera dos IDs; reintento técnico del mismo intento genera solo uno | Bun procesos/E2E | I  PENDING |
| AC-23 | Catálogo/mapping/hecho cambia tras preview; fallo auditoría | 409 o rollback total, sin enlace incompatible ni mitad de efectos | Bun concurrencia/API/UI | I  PENDING |
| AC-24 | Rectificar categoría para exigir Tipo REF incompatible con hechos | Dependencias reales y bloqueo/impacto comprobable, no solo catálogo ni consumidores simulados | Bun/API | I  PENDING |
| AC-25 | Acceder sin MFA o mutar sin Origin/CSRF, manipular campos | Rechazo servidor, sin fuga SQL/factores ni ruta alternativa | Bun HTTP/regresiones | I  PENDING |
| AC-26 | Recorrer listado/ficha/formularios/preview a390/1440 y teclado | Tabla/tarjetas, foco, labels, contraste y sin overflow; capturas reales inspeccionadas solo en dev | Playwright/revisión visual | I  PENDING |
| AC-27 | Vacío/carga/error/404/422/409/401 y reintento | Estados distintos, borrador preservado y sin datos ficticios como sustitución | E2E/API | I  PENDING |
| AC-28 | Upgrade base genuina v4, fallo DDL, dos arranques | Conserva datos/IDs/auditoría/intentos/acceso, rollback íntegro, versión desconocida intacta, sin reseed | Bun integración/procesos | I  PENDING |
| AC-29 | Snapshot age del nuevo esquema y restore aislado | Datos/posiciones/REF coherentes; MFA/login reales, sesiones revocadas según política; no dependencia externa | Bun + E2E | I  PENDING |
| AC-30 | Ejecutar suite E1.1–E1.4 tras extensión | Sin regresiones de identidad/seguridad/fecha/saldos/ciclos, 29 AC E1.4 conservados salvo dependencia ahora satisfecha explícitamente | Bun + Playwright | I  PENDING |
| AC-31 | Entrega posterior habilita Transferencias Exterior y fichas E3 | Exterior ordinario y especial fuera de E1.5; Anticipo solo Transferencia; Compartido Gasto o Transferencia con origen Exterior y Quién paga; REF–ficha/participantes coherentes, sin huérfanos | Pruebas futuras de ampliación Exterior/E3.1–E3.3 | C  CONTRATO FUTURO |
| AC-32 | Consumidores plan/inversión/deuda/Comida | Efectos según su motor, sin doble ejecución ni cambiar Tipo económico; AC-31/33 E1.4 no completos por E1.5 | Pruebas futuras E2/E3/E4/E1.6 | C  CONTRATO FUTURO |
| AC-33 | Cierre/foto/migración autorizada reales | Protección transversal y fotos inmutables, mapping auditado nombres→IDs, sin reescribir Excel | Pruebas futuras E4/P6/P7 | C  CONTRATO FUTURO |

## Incremento backend
Bun: 51 PASS / 843 assertions, incluidos R1–R7 en referencias.test.ts y 44 regresiones.
Typecheck PASS. Evidencia UI y aceptación definitiva pendientes; no hay motores E3.
