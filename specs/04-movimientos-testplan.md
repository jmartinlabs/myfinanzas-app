# 04 — Movimientos: Test plan
Specification: [aprobada](04-movimientos-specification.md).
Status: COMPLETED AND INTEGRATED — 29 criterios actuales PASS; AC-30–33 contratos futuros.
PR #15 aprobada sobre 423c8ee; squash main b51b89bd111eab310581d9d401102ca0f95d7a42.
Fecha: 2026-10-21. Rama feat/e1-4-movimientos, base main 5fa4ace.

## Suites y comandos
Desde raíz con Bun 1.4.3, age/age-keygen y Chromium disponibles.
- `bun run typecheck`, `bun run build`: PASS.
- `bun run test`: **44 PASS / 680 assertions / 0 fallos**, 11 pruebas nuevas y 33 regresiones.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e`: **2 PASS**,
  recorrido E1.1–E1.3 y recorrido E1.4 aislado. Ambos usan MFA/SQLite/Effect reales.
- `./scripts/validate-template`, `./scripts/test-validator`: PASS, 18 regresiones.
- `./scripts/check-project`, `./scripts/test-checks`: PASS, 22 regresiones.
- `./scripts/check-repository`, whitespace: PASS; revisión manual complementaria de
  todos los commits salientes, mensajes/rutas/contenidos e índice/diff final.
- Sin nuevas dependencias runtime ni modificación de bun.lock.

B1–B11: en orden, tests de apps/api/src/movimientos.test.ts. E4:
tests/e2e/movimientos.spec.ts. Cada fila conserva acción/resultado de especificación,
identifica suites (comandos anteriores) y distingue ejecución actual de contrato futuro.

| Acceptance ID | Precondición / acción | Resultado esperado | Método / evidencia | Resultado |
| --- | --- | --- | --- | --- |
| AC-01 | Crear los cuatro subtipos de Ingreso | S000→receptor, Subtipo obligatorio, sin Partida; API/SQLite | B1/B9 + E4 (Ingreso) | PASS |
| AC-02 | Crear Gasto con Partida sin Presupuesto | Salida a S000, permitido sin Presupuesto, clasificación desde IDs; API/UI | B1 + E4 (Gasto) | PASS |
| AC-03 | Saldo con permiso No/ausente y manipular payload | No omite comprobación de salida; motivo, sin inferir ni convertir atributo histórico; API | B1/B9 + E4 | PASS |
| AC-04 | Probar cada par Tipo/Control como receptor/origen | Reglas Origen/Destino, activos y permiso; No controlado admitido, sin filtro general extra por Tipo/Control; API/UI | B1 + E4 (No controlado) | PASS |
| AC-05 | Importe vacío/null/float/tercer decimal/exceso técnico | Rechazo exacto, sin default cero ni redondeo; Bun | B1 + regresión monetaria E1.1 | PASS |
| AC-06 | Probar signo/cero y devolución | Rechaza 0/negativos; permite céntimo positivo, no Ingreso artificial ni importe absoluto automático para devolución; Bun/API | B1 + E4 (validación) | PASS |
| AC-07 | Categoría exige Referencia y maestro aún no disponible | Bloquea Gasto y explica dependencia, sin texto/REF de relleno; API/UI | B1/B5 + E4 (Referencia bloqueada) | PASS |
| AC-08 | Derivados de clasificación aportados por cliente o Ingreso con Partida | Rechaza fuente paralela, ausencia de jerarquía válida bloquea; API | B1/B9 + E4 (jerarquía derivada) | PASS |
| AC-09 | Consultar posición Movimientos con apertura 100, Ingreso 50 y Gasto 20 ficticios | 130 EUR exactos; sin escribir posición acumulada; Bun/API | B2 + E4 (150→130) | PASS |
| AC-10 | Hecho anterior a Fecha apertura; filtrar/paginar su consulta | Cuenta en Saldo actual, independiente de filtros; histórico mensual no implementado; Bun | B2 + E4 (Fecha apertura 20/10, hechos 12–13/10) | PASS |
| AC-11 | Apertura ausente, con y sin hechos | Solo Control Movimientos: sin hechos 0,00 EUR; con Ingreso 50/Gasto 20, 30,00 EUR; null persiste y no cambia otros controles; Bun/API | B2 (0,00 y 30,00 sin mutar null) | PASS |
| AC-12 | Consultar otros controles tras registrar hechos | No presenta posición incompleta de inversiones/Terminal/Exterior/No controlado como completa ni habilita Manual; Bun/UI | B1/B2 + E4 (No controlado sin posición) | PASS |
| AC-13 | Hechos exactamente en Inicio/Fin y fuera del mes natural financiado | Ciclo correcto por intervalo, maestro completo; Bun/API | B3 + E4 (ciclo octubre desde Inicio septiembre) | PASS |
| AC-14 | Maestro vacío/hecho anterior al primer Inicio/fecha futura | Guarda sin ciclo como Sin ciclo asignable; hoy español válido, mañana bloqueado en UI/servidor; medianoche UTC/Madrid y DST; Ciclos futuros siguen válidos; Bun/API/UI | B3/B9 + E4 (mañana rechazado) | PASS |
| AC-15 | Registrar hechos, comparar máximas fechas y consulta sin hechos | Fuente Movimientos disponible con máximo o vacía; otras dos pendientes, cabecera por referencia; Bun/UI | B3 + E4 (cabecera real) | PASS |
| AC-16 | Rectificar/anular el hecho de fecha máxima | Excluye anulados y recalcula máximo/actual/corte desde hechos vigentes, incluso retroceso o referencia null al anular el último; Bun/API/UI | B3 + E4 (máxima fecha anulada) | PASS |
| AC-17 | Cambiar Concepto/Nota y renombrar maestro sin cambio económico | Texto/nombre no cambia Tipo/IDs/clasificación ni genera catálogos; API/UI | B1/B2/B5 + E4 (Concepto libre) | PASS |
| AC-18 | Seleccionar maestros inactivos frente a consultar histórico | No nuevas selecciones inactivas; enlaces históricos preservados, sin reactivar al consultar; API/UI | B1/B11 + E4 (histórico conservado) | PASS |
| AC-19 | Rectificar campos permitidos con motivo/vista previa | Mismo ID, motivo/fecha/antes/después, reglas del Tipo y relaciones revalidadas; posición/ciclo/referencia coherentes, sin cambio silencioso; Bun/API/UI | B4 + E4 (rectificar) | PASS |
| AC-20 | Anular un movimiento registrado por error que no representa un hecho económico real | Vista previa/confirmación/motivo, mismo ID y auditoría; no contribuye a posiciones/referencia, consultable como Anulado, reintento no duplica; sin DELETE ni falsa devolución; Bun/E2E | B4/B11 + E4 (anular) | PASS |
| AC-21 | Cambiar Saldo usado o jerarquía/Referencia obligatoria de ancestro usado | Guard de uso real activo; bloqueo ordinario o rectificación con movimientos/ciclos afectados y revalidación, no solo catálogo; Bun/API | B2/B5 + E4 (impacto de ancestro) | PASS |
| AC-22 | Cambiar maestro/hechos después de vista previa, fallo de auditoría | 409/rollback íntegro, sin mitad de efectos; concurrencia dos clientes/procesos | B4/B5/B8 + E4 (otro cliente) | PASS |
| AC-23 | Doble envío/reintento tras respuesta perdida | Una sola alta, ID numérico único/estable/no reutilizado, lectura tras reinicio; Bun/E2E | B4/B8/B11 + E4 (respuesta perdida) | PASS |
| AC-24 | Dos hechos genuinos idénticos o copia accidental | Advierte coincidencia por firma documentada; permite confirmar hecho distinto con otro ID, sin unicidad de contenido; reintento conserva un solo ID; Bun/E2E | B4 + E4 (dos hechos idénticos) | PASS |
| AC-25 | Acceso sin MFA, mutar sin Origin/CSRF y enviar derivados/tipos futuros | Rechazo con protección existente, sin exponer datos/factores/SQL; API | B9 + regresiones seguridad E1.1 + E4 (MFA) | PASS |
| AC-26 | Listado/ficha/alta/rectificación a 390/1440 y teclado | Wireframes revisados, tabla/tarjetas, foco y mensajes, capturas reales solo tras dev | E4 + inspección directa PNG 390/1440 y teclado | PASS |
| AC-27 | Vacío/carga/error/404/422/409/401/reintento | Estados distintos, borrador conservado y sin ceros financieros ficticios; E2E | B9 + E4 (vacío/carga/error/404/422/409/401/reintento) | PASS |
| AC-28 | Upgrade desde base E1.3 genuina existente, error y dos aperturas | Datos completos/acceso/ciclos preservados, atomicidad, desconocido intacto, sin resemilla; Bun | B6/B7/B8 + regresiones upgrade E1.1–E1.3 | PASS |
| AC-29 | Copia age y restauración aislada del nuevo estado | Hechos/posiciones/referencia coherentes, MFA tras política de restore, sin servicio externo; Bun/E2E | B6 + E4 (age/restore/MFA) | PASS |
| AC-30 | Integrar Referencias y tipos/fichas en E1.5/E3 | Existencia/Tipo/mapping y restricciones reales, sin bypass de obligación | Revisión de contrato, implementación pendiente | CONTRATO FUTURO |
| AC-31 | Entregar Transferencias/Deuda/inversión | Efectos integrados en sus motores, no falsamente cubiertos por Ingreso/Gasto | Revisión de contrato, implementación pendiente | CONTRATO FUTURO |
| AC-32 | Instalar cierres y fuentes DT5 | Bloqueo real transversal y fotografías inmutables, fallo atómico; no probado con módulos ausentes | Revisión de contrato, implementación pendiente | CONTRATO FUTURO |
| AC-33 | Entregar histórico mensual/planificación/Comida | Reglas de Fecha apertura, ejecución y conciliación correspondientes, sin adelanto en E1.4 | Revisión de contrato, implementación pendiente | CONTRATO FUTURO |

## Cobertura financiera y límites de contratos
Los 29 criterios son actuales y tienen evidencia, sin relabel de fallos como contratos.
AC-30–33 **no implementados ni probados con consumidores reales**: Referencias/E1.5/E3,
Transferencias/Deuda/inversión, cierres/DT5 y planificación/histórico/Comida.
La guarda inyectable de cierre se ejercita aisladamente como protocolo de bloqueo;
no es prueba de cierre financiero instalado. No tablas de módulos ni proveedores simulados.
E1.3 AC-11 integra ahora solo fuente Movimientos; las otras dos fuentes siguen pendientes.

## Persistencia, integridad y recuperación
B6 usa inicializador **v3 genuino congelado** en test-support/database-v3.ts. Antes/después
compara tablas completas y counters previos, prueba contraseña/TOTP/sesión existentes,
nueva apertura idempotente, FK y snapshots age v3/v4 restaurados en destinos nuevos.
Los backup tests anteriores siguen comprobando versiones previas genuinas; etiquetas
de snapshots generados por implementación actual se actualizaron a su versión real v4.
B7 fuerza conflicto de DDL después de crear parte del esquema: rollback íntegro, versión
v3/datos intactos y esquema desconocido sin mutación. B8 abre v3 con dos procesos y
compite en reintento/rectificación: un solo ID/commit y 409 para revisión obsoleta.
B4 falla auditoría y comprueba rollback de ledger/counters/intentos. B11 prueba IDs
>2^53 exactos y anulación sin sustituir enlaces históricos inactivos/Referencia no verificable.
La posición suma bigint fuera de límite int64 agregado sin float; rango individual int64
validado. Apertura null persiste null; se interpreta como cero solo por motor Movimientos.

## Navegador y capturas inspeccionadas
26 PNG ficticios en artifacts/e1-4, ignorados por Git. CI adjunta solo PNG al artifact
heredado e1-1-screenshots (incluye cuatro entregas), retención 7 días.
- 1440 px: empty-desktop, form-desktop, detail-desktop, duplicate-desktop, list-desktop,
  rectification-desktop, classification-impact-desktop, annulment-desktop.
- 390 px: empty-mobile, validation-mobile, form-mobile, detail-mobile, position-mobile,
  reference-blocked-mobile, duplicate-mobile, list-mobile, filters-mobile, rectification-mobile,
  annulment-mobile, annulled-mobile, future-date-mobile, conflict-mobile, error-mobile,
  loading-mobile, session-draft-mobile, restored-mobile.
Rutas completas: artifacts/e1-4/<nombre>.png; inspección directa de imágenes, no solo tamaño.
Se prueba navegación/foco/teclado, tabla/tarjetas sin overflow, selects/filtros encadenados,
maestro único, impacto real de ancestro, coincidencias revisables y anulado consultable.
La fecha máxima procede del servidor; input date nativo puede verse mm/dd/yyyy según
Chromium/SO: Fecha prevista y fichas muestran dd/mm/aaaa, sin introducir datepicker.
Escrituras/consulta de éxito son reales. Solo se interceptan latencia, error de red,
respuesta perdida tras commit real y presentación 401; caducidad real de sesión se
mantiene en pruebas Auth previas. Restore usa login/TOTP reales, sin bypass.
Sin factores en capturas, trazas o storageState. No auditoría WCAG completa.

## Cinco mejoras visuales/UX aplicadas y reverificadas
1. Antes/después compacto muestra campos cambiados; evita repetir todo el formulario.
   Anulación identifica ciclo histórico conservado y ausencia de cómputo, sin falsa reasignación.
2. Tabla de seis columnas con proporciones propias e importes alineados/números tabulares;
   tarjetas y filtros apilados conservan capacidades a 390 px.
3. Fecha prevista dd/mm/aaaa y mes financiado en español, sin ambigüedad del control nativo.
4. Posición real calculada con texto oscuro de contraste; botón #8DBB2E mantiene texto oscuro.
   Ratios de paleta compartida >=4,5:1 comprobados en regresión; color real de posición probado.
5. Errores asociados por aria-describedby, foco al error/impacto/detalle asíncrono,
   teclado en filtros y acciones; paneles de ficha separados y confirmaciones legibles.
Capturas devueltas a scroll inicial antes de fullPage para no desplazar sidebar sticky
al enfocar el impacto; se conserva el foco funcional. Sin rediseño del estilo aprobado.

## Incidencias y alcance de validación
Se corrigieron expectativas anteriores de pendiente_motor/esquema v3 para Movimientos
ahora instalado; comparación íntegra de tablas previas y otros motores preservada.
Tipo de auditoría y ubicación del servidor test en workspace API corregidos. El recorrido
nuevo respeta redirección a Saldos existente tras MFA, sin cambiar el flujo de acceso.
Reejecuciones afectadas pasan; ningún fallo/skip/bloqueo local pendiente. No se añadieron
reglas financieras ni se modificó el Excel; exclusiones de fase spec sustituidas solo
por autorización explícita de desarrollo. Sin E1.5, real migration, datos reales o deploy.
Backups externos/automatización, inicialización productiva y RPO/RTO de producción pendientes.

## Estado remoto y cierre autorizado — 2026-10-21
Usuario autoriza squash tras auditoría favorable de Álex sobre 423c8ee. HEAD confirmado
sin cambios, sin conflictos y ambas CI SUCCESS antes del merge:
- [Push 39609359322](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39609359322).
- [PR 39609396669](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39609396669).
[PR #15](https://github.com/josemartin2000/myfinanzas-app/pull/15) MERGED; integración
b51b89bd111eab310581d9d401102ca0f95d7a42, árbol idéntico al commit auditado.
[CI main posterior 39629917978](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39629917978)
verifica el squash integrado. Cierre documental sin cambios funcionales; la evidencia
local y la matriz anterior conservan su alcance y trazabilidad. AC-30–33 siguen futuros,
sin afirmar sus motores implementados. Esperar autorización, sin E1.5 ni despliegue.
