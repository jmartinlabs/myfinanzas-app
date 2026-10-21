# 04 — Movimientos: Test plan
Specification: [aprobada](04-movimientos-specification.md).
Status: IN PROGRESS — criterios actuales sin ejecutar; AC-30–33 futuros.

| Acceptance ID | Prueba prevista | Estado |
| --- | --- | --- |
| AC-01 | S000→receptor, Subtipo obligatorio, sin Partida; API/SQLite | unrun |
| AC-02 | Salida a S000, permitido sin Presupuesto, clasificación desde IDs; API/UI | unrun |
| AC-03 | No omite comprobación de salida; motivo, sin inferir ni convertir atributo histórico; API | unrun |
| AC-04 | Reglas Origen/Destino, activos y permiso; No controlado admitido, sin filtro general extra por Tipo/Control; API/UI | unrun |
| AC-05 | Rechazo exacto, sin default cero ni redondeo; Bun | unrun |
| AC-06 | Rechaza 0/negativos; permite céntimo positivo, no Ingreso artificial ni importe absoluto automático para devolución; Bun/API | unrun |
| AC-07 | Bloquea Gasto y explica dependencia, sin texto/REF de relleno; API/UI | unrun |
| AC-08 | Rechaza fuente paralela, ausencia de jerarquía válida bloquea; API | unrun |
| AC-09 | 130 EUR exactos; sin escribir posición acumulada; Bun/API | unrun |
| AC-10 | Cuenta en Saldo actual, independiente de filtros; histórico mensual no implementado; Bun | unrun |
| AC-11 | Solo Control Movimientos: sin hechos 0,00 EUR; con Ingreso 50/Gasto 20, 30,00 EUR; null persiste y no cambia otros controles; Bun/API | unrun |
| AC-12 | No presenta posición incompleta de inversiones/Terminal/Exterior/No controlado como completa ni habilita Manual; Bun/UI | unrun |
| AC-13 | Ciclo correcto por intervalo, maestro completo; Bun/API | unrun |
| AC-14 | Guarda sin ciclo como Sin ciclo asignable; hoy español válido, mañana bloqueado en UI/servidor; medianoche UTC/Madrid y DST; Ciclos futuros siguen válidos; Bun/API/UI | unrun |
| AC-15 | Fuente Movimientos disponible con máximo o vacía; otras dos pendientes, cabecera por referencia; Bun/UI | unrun |
| AC-16 | Excluye anulados y recalcula máximo/actual/corte desde hechos vigentes, incluso retroceso o referencia null al anular el último; Bun/API/UI | unrun |
| AC-17 | Texto/nombre no cambia Tipo/IDs/clasificación ni genera catálogos; API/UI | unrun |
| AC-18 | No nuevas selecciones inactivas; enlaces históricos preservados, sin reactivar al consultar; API/UI | unrun |
| AC-19 | Mismo ID, motivo/fecha/antes/después, reglas del Tipo y relaciones revalidadas; posición/ciclo/referencia coherentes, sin cambio silencioso; Bun/API/UI | unrun |
| AC-20 | Vista previa/confirmación/motivo, mismo ID y auditoría; no contribuye a posiciones/referencia, consultable como Anulado, reintento no duplica; sin DELETE ni falsa devolución; Bun/E2E | unrun |
| AC-21 | Guard de uso real activo; bloqueo ordinario o rectificación con movimientos/ciclos afectados y revalidación, no solo catálogo; Bun/API | unrun |
| AC-22 | 409/rollback íntegro, sin mitad de efectos; concurrencia dos clientes/procesos | unrun |
| AC-23 | Una sola alta, ID numérico único/estable/no reutilizado, lectura tras reinicio; Bun/E2E | unrun |
| AC-24 | Advierte coincidencia por firma documentada; permite confirmar hecho distinto con otro ID, sin unicidad de contenido; reintento conserva un solo ID; Bun/E2E | unrun |
| AC-25 | Rechazo con protección existente, sin exponer datos/factores/SQL; API | unrun |
| AC-26 | Wireframes revisados, tabla/tarjetas, foco y mensajes, capturas reales solo tras dev | unrun |
| AC-27 | Estados distintos, borrador conservado y sin ceros financieros ficticios; E2E | unrun |
| AC-28 | Datos completos/acceso/ciclos preservados, atomicidad, desconocido intacto, sin resemilla; Bun | unrun |
| AC-29 | Hechos/posiciones/referencia coherentes, MFA tras política de restore, sin servicio externo; Bun/E2E | unrun |
| AC-30 | Existencia/Tipo/mapping y restricciones reales, sin bypass de obligación | contrato futuro, no implementado |
| AC-31 | Efectos integrados en sus motores, no falsamente cubiertos por Ingreso/Gasto | contrato futuro, no implementado |
| AC-32 | Bloqueo real transversal y fotografías inmutables, fallo atómico; no probado con módulos ausentes | contrato futuro, no implementado |
| AC-33 | Reglas de Fecha apertura, ejecución y conciliación correspondientes, sin adelanto en E1.4 | contrato futuro, no implementado |

## Regression checks
Bun Test E1.1–E1.3, typecheck/build, plantilla/controles, Playwright. Pendientes.
## Functional verification
API/SQLite real, EUR, fechas Madrid, guards, concurrencia, idempotencia, v3→v4 y age.
## Browser verification
Recorridos reales con MFA, capturas 390/1440 e inspección visual pendientes.
## Visual improvements
Registrar cinco mejoras justificadas o explicar menos al inspeccionar las capturas.
## Limitations and next action
No reclamar criterios aprobados como probados antes de ejecutar evidencia. Sin E1.5, datos reales ni despliegue.
