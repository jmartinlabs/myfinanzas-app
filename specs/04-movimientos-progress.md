# 04 — Movimientos: Progress
Specification: [aprobada](04-movimientos-specification.md).
Current state: IMPLEMENTED — verificado localmente, pendiente revisión/merge de PR funcional.
Base: main 5fa4ace; rama feat/e1-4-movimientos. Fecha: 2026-10-21.
Solo local/ficticio; Excel v5.11 maestro, intacto y fuera del repositorio.

| Task | Status | Commit / evidence |
| --- | --- | --- |
| SQLite v4, ledger, validación y APIs con auditoría | verified | bee7f42; Bun + HTTP |
| Integración real Saldos/Clasificación/Ciclos | verified | Posición/guards/referencia reales, sin motores futuros |
| Listado/ficha/alta/rectificación/anulación responsive | verified | Playwright, teclado y capturas 390/1440 |
| 29 AC actuales, regresiones, upgrade/concurrencia/age | verified | [Testplan](04-movimientos-testplan.md), 44 Bun PASS |
| Capturas e inspección, controles documentales | verified | 26 PNG, cinco mejoras justificadas |
| Publicación PR y ambas CI del HEAD definitivo | follow-up | Evidencia canónica en descripción de PR |
| Aprobación de Álex/usuario y merge de implementación | waiting | No autorizado; no integrar automáticamente |

## Verified increments
Backend bee7f42: SQLite v4 transaccional desde versiones previas, 43 Bun PASS iniciales,
semántica Q1–Q6 y guards conectados. Test adicional de anulación heredada/IDs >2^53:
44 PASS / 680 assertions; otros controles no calculables y null persistente conservados.
UI: dos recorridos Playwright PASS, snapshots age/restauración con MFA en servidores
Effect reales; inspección 390/1440 y cinco ajustes. Types/build y controles locales PASS.
Comandos/evidencia por criterio y diferencias frente a contratos futuros en testplan.

## Decisions
Q1–Q6 aprobadas, sin reabrir. Usuario autoriza dev 04/SQL local versionado después de
PR #14: sus exclusiones anteriores describen fase spec. Sin dependencias nuevas.
Cierres, referencias y motores AC-30–33 siguen futuros. E1.3 AC-11 solo incorpora ahora
fuente Movimientos; Comida/inversión pendientes. AC-23 cubierto solo para estos hechos,
no todos los consumidores. No declarar las entregas posteriores completadas.

## Errors, regressions and blockers
Primera ejecución: 6 expectativas antiguas de motor pendiente/esquema v3, actualizadas
solo al contrato entregado preservando comparación de tablas/IDs/datos previos y demás
controles. Un tipo de DTO de auditoría corregido. Proceso E2E inicialmente fuera del
workspace API no resolvía Effect: movido a test-support existente, sin nueva dependencia.
Recorrido nuevo ahora respeta redirección existente a Saldos tras MFA; no cambio del
flujo de acceso. Todo corregido/reverificado; ningún fallo/skip/bloqueo pendiente local.

## Next action
Publicar PR, comprobar ambas CI del commit final y registrar sus enlaces en la PR;
después esperar revisión/aprobación expresa. Sin merge automático, E1.5, datos reales,
Excel, servicios contratados ni despliegue. Repositorio limpio al entregar.
