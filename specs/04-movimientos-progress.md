# 04 — Movimientos: Progress
Specification: [aprobada](04-movimientos-specification.md).
Current state: COMPLETED AND INTEGRATED — PR #15 aprobada por usuario tras auditoría favorable de Álex sobre 423c8ee.
Squash integrado en main: b51b89bd111eab310581d9d401102ca0f95d7a42 (2026-10-21).
Base: main 5fa4ace; rama feat/e1-4-movimientos. Fecha: 2026-10-21.
Solo local/ficticio; Excel v5.11 maestro, intacto y fuera del repositorio.

| Task | Status | Commit / evidence |
| --- | --- | --- |
| SQLite v4, ledger, validación y APIs con auditoría | verified | bee7f42; Bun + HTTP |
| Integración real Saldos/Clasificación/Ciclos | verified | Posición/guards/referencia reales, sin motores futuros |
| Listado/ficha/alta/rectificación/anulación responsive | verified | Playwright, teclado y capturas 390/1440 |
| 29 AC actuales, regresiones, upgrade/concurrencia/age | verified | [Testplan](04-movimientos-testplan.md), 44 Bun PASS |
| Capturas e inspección, controles documentales | verified | 26 PNG, cinco mejoras justificadas |
| Publicación PR y ambas CI del HEAD definitivo | verified | PR #15; runs 39609359322 y 39609396669 SUCCESS sobre 423c8ee |
| Aprobación de Álex/usuario y merge de implementación | integrated | Autorización expresa del usuario; PR #15 MERGED, squash b51b89b |

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

## Integration evidence
[PR #15](https://github.com/josemartin2000/myfinanzas-app/pull/15) MERGED mediante squash,
HEAD auditado 423c8ee sin cambios adicionales. Árbol del squash idéntico al HEAD aprobado.
CI posterior de implementación: [run 39629917978](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39629917978).
La matriz del testplan mantiene 29 criterios actuales PASS y AC-30–33 CONTRATO FUTURO.
Este cierre solo cambia documentación; no añade funcionalidades ni amplía cobertura.

## Next action
E1.4 completada e integrada. Esperar autorización de la siguiente entrega; no iniciar
E1.5, importar datos reales, modificar Excel maestro ni desplegar. Solo local/ficticio.
