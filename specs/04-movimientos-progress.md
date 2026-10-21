# 04 — Movimientos: Progress
Specification: [aprobada](04-movimientos-specification.md).
Current state: IN PROGRESS — dev 04 autorizado, sin integrar.
Base: main 5fa4ace; rama feat/e1-4-movimientos. Solo local/ficticio.

| Task | Status | Commit / evidence |
| --- | --- | --- |
| SQLite v4, ledger, validación y APIs con auditoría | verified | 43 Bun tests PASS, types/build PASS |
| Integración real Saldos/Clasificación/Ciclos | verified backend | Guards/posición/referencia reales; motores futuros pendientes |
| Listado/ficha/alta/rectificación/anulación responsive | in progress | Playwright en ejecución |
| 29 AC actuales, regresiones, upgrade/concurrencia/age | pending | testplan |
| Capturas 390/1440 e inspección, controles y PR | pending | Sin merge autorizado |

## Verified increments
Pendientes. [Plan de aceptación](04-movimientos-testplan.md).
## Decisions
Q1–Q6 aprobadas, no reabrir; stack/guidelines existentes. SQL local versionado autorizado
por usuario tras integrar PR #14; sus exclusiones de desarrollo describen la fase spec.
## Errors, regressions and blockers
Primera regresión detectó 6 expectativas históricas de motor pendiente/esquema v3.
Actualizadas solo para contrato ahora entregado, conservando comparación completa de
filas previas y pruebas de otros motores no calculables. Error de tipo en DTO de
auditoría corregido; types/build pasan. AC-30–33 siguen contratos futuros.
## Next action
Completar recorridos Playwright y revisión real de capturas; actualizar matriz de resultados.
