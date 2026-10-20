# 01 — E1.1 Saldos: Progress
Specification: [especificación aprobada](01-saldos-control-specification.md)
Current state: in-progress — STEP 7 autorizado 2026-10-21

| Task | Status | Commit / evidence |
| --- | --- | --- |
| Handoff, estado y mapeo 43 AC | complete | main ebfe75b y autorización del usuario |
| SQLite/acceso protegido/copias | in-progress | 11 pruebas Bun / 144 aserciones y tipos: pasan; age 1.3.2 local. UI/recuperación visual pendientes. |
| Primer recorrido y gestión completa | pending | |
| Restauración/UI/QA | pending | |
| Revisión de historia, push, PR | pending | |

## Verified increments
Baseline main ebfe75b: CI success, 40 regresiones de plantilla/controles pasan.
## Decisions
[Arquitectura](guidelines/architecture.md), [UI](guidelines/ui.md), [seguridad](guidelines/security.md).
Sin cambios a decisiones financieras o diseño aprobados.
## Errors, regressions and blockers
Ninguno confirmado. Resultados de E1.1 aún no ejecutados; no equivalen al bootstrap.
## Next action
Conectar las pantallas aprobadas a la API y ampliar restauración desde archivo y navegador.
