# 31 — SQLite producción: Progress
Specification: [contrato aprobado](31-sqlite-produccion-specification.md)
Current state: IMPLEMENTED / VERIFIED LOCAL — en revisión, no integrado — `$dev 31` autorizado por usuario el 2026-10-21.

| Task | Status | Commit / evidence |
| --- | --- | --- |
| Identidad v6 / migración demo | verified | P1/P2 + suites históricas |
| Publicación privada DB+clave / apertura | verified | P3/P4/P8/P10/P11 |
| Alta privada sin secretos en stdout | verified | P5/P7/P10 |
| Backup/restore de identidad | verified | P6/P9 + R10 histórico |
| AC-01–33, navegador y documentación | verified | AC01–33 PASS local; testplan y revisión final |

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
Publicar PR independiente dependiente de #23, comprobar CI del SHA final y esperar revisión/aprobación; no merge.
Base: f064935; PR #23 documental aprobada y no integrada. Implementación en
feat/31-sqlite-produccion, PR independiente dependiente de #23. Sin merge/VPS/deploy/datos reales.

Segundo incremento: P1–P11 cubren aceptación productiva; 65 Bun PASS, 1134 assertions,
2 E2E PASS (45.8s), capturas 390/1440 inspeccionadas. Readiness de main productivo
real ensayada localmente. Build/tipos/lockfile correctos; Node/Bun corregido sin UI.
Documentación de interfaces, fallos y límites actualizada. Ningún dato real.

Cierre local: 65 API PASS / 1134 assertions, 2 E2E PASS y 40 pruebas de controles
PASS; 33 AC trazados y verificados. Linux/glibc necesario para publicación, sin
ensayo del VPS ni gates operativos resueltos por inferencia. Áreas temporales
reservadas no admitidas por runtime incluso tras caída con pareja completa.
El historial de fallos iniciales se conserva; todos están corregidos.
