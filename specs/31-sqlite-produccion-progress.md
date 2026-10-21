# 31 — SQLite producción: Progress
Specification: [contrato aprobado](31-sqlite-produccion-specification.md)
Current state: IN PROGRESS — `$dev 31` autorizado por usuario el 2026-10-21.

| Task | Status | Commit / evidence |
| --- | --- | --- |
| Identidad v6 / migración demo | in progress | Primera regresión detecta ajustes de compatibilidad |
| Publicación privada DB+clave / apertura | in progress | Linux renameat2 sin reemplazo |
| Alta privada sin secretos en stdout | in progress | Token a archivo 0600, transacción |
| Backup/restore de identidad | in progress | Extensión aditiva manifest v6 |
| AC-01–33, navegador y documentación | pending | Testplan; todas las AC siguen abiertas |

## Verified increments
Primer incremento — 2026-10-21: typecheck PASS y Bun 60 PASS / 1010 assertions
(54 históricas + P1–P6). Identidad v6, inicialización/clave, setup privado y
backup/restore implementados. Cierre de aceptación aún pendiente de casos
adicionales, build, navegador y revisión final. Evidencia: pruebas versionadas
production.test.ts y regresiones existentes, sin secretos en artefactos.

## Decisions
[Contrato aprobado](31-sqlite-produccion-specification.md), D1–D4.

## Errors, regressions and blockers
Primer ensayo local: 45 pass/9 fail. Se diagnostica propiedad UID del filesystem
raíz mapeado en Codex y expectativa del mensaje de setup. Correcciones en curso;
no se eliminan assertions. Esta evidencia no es resultado final.

## Next action
Completar pruebas de producción, repetir regresión y mapear AC-01–33.
Base: f064935; PR #23 documental aprobada y no integrada. Implementación en
feat/31-sqlite-produccion, PR independiente dependiente de #23. Sin merge/VPS/deploy/datos reales.
