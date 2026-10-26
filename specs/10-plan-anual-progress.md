# 10 — Plan anual: Progress
Specification: [spec10](10-plan-anual-specification.md)
Current state: candidato local verificado; QA y navegador PASS; gate global Linux pendiente.

Desarrollo autorizado por el usuario «Autorizo» el 2026-10-24, tras integración
spec10 rev2/PR60. Rama `codex/dev10-plan-anual`, base `72833b9`. La aprobación
funcional Q1–Q6 permanece en [brainstorming](10-plan-anual-brainstorming.md).
Sin merge, despliegue, Excel real, B3 ni Dev32. El coordinador conserva publicación/Git.

| Task | Status | Commit / evidence |
| --- | --- | --- |
| Migración v10→v11 e identidad/backup | implementada; gate restore Linux pendiente | annual-plan-schema.ts, database-schema.ts, backup.ts; continuidad/rollback focal PASS |
| Motor anual por ID/Fecha real y fuentes honestas | implementado; focal PASS | plan-anual.ts / plan-anual.test.ts |
| Equivalente exacto suma céntimos/12, ausencias y contadores | implementado; focal PASS | DTO racional sin float ni consumidor global ficticio |
| API/seguridad/preview/confirm/auditoría/concurrencia | implementadas; focal PASS | ocho pruebas, dos procesos reales y Effect HTTP autenticado |
| UI anual y navegación | implementadas; navegador pendiente | PlanAnual.tsx / plan-anual.spec.ts |
| Evidencia 390/1440 y revisión visual | pendiente de ejecución por coordinador | artifacts/e2-4/plan-anual-390.png y plan-anual-1440.png previstos; todavía no generados |
| QA independiente y verificación única | pendientes | coordinador; no afirmar entrega aceptada/integrada |

## Verified increments
2026-10-24, raíz del repositorio, Bun1.4.3 disponible localmente; dependencias existentes,
sin instalación ni cambios de harness/Skills/apertura SQLite.

- `PATH=/tmp/myfinanzas-runtime/bun-darwin-aarch64:/tmp/myfinanzas-runtime/age:$PATH TMPDIR=/private/tmp NODE_ENV=test bun test apps/api/src/plan-anual.test.ts`: **8 PASS, 0 FAIL,83 assertions**, última ejecución sobre candidato formateado.
- `PATH=/tmp/myfinanzas-runtime/bun-darwin-aarch64:$PATH bun run typecheck`: PASS.
- `PATH=/tmp/myfinanzas-runtime/bun-darwin-aarch64:$PATH bun run build`: PASS, Vite30módulos; sin deploy.
- Prettier3.6.2 desde caché local aplicado a archivos nuevos y fuentes modificadas.
- `git diff --check`: PASS en revisión del incremento; repetir antes de publicación.

## Decisions
[Arquitectura](guidelines/architecture.md#e24--plan-anual-candidato-dev10) describe los
límites. No existe un proveedor runtime de histórico, inicio de control verificable
ni cierres futuros: leer el primer hecho/ciclo no demuestra cobertura. El runtime
mantiene Ejecutado/Diferencia null, subtotal registrado y fecha conocida consultables.
Los contratos internos de intervalos/histórico/protecciones se prueban con inyección
ficticia aislada; no se instala una API/tablas de relleno. Ningún consumidor global
ni sincronización del Esencial del ciclo se adelanta.

## Errors, regressions and blockers
Playwright inicial no pudo iniciar config.webServer dentro del sandbox (exit1).
La llamada con escalación no llegó a ejecutarse y fue interrumpida por el coordinador;
este ejecutará navegador/inspección/capturas. No existe PASS de E2E todavía.

Regresión focal `clasificacion.test.ts`:8 PASS/1 FAIL. Primer intento sin TMPDIR
falló el guard de ancestros del temporal macOS; reintento con TMPDIR=/private/tmp
alcanzó backup y falló por `libc.so.6` ausente. No se han relajado guardas ni se ha
intentado la suite API completa en macOS. La restauración exige gate Linux.
El P11 existente de planes-ciclo se amplió explícitamente con dos revisiones del
anual, preservación de auditoría/identidad/MFA y revocación de intentos anuales tras
restore para demo/production; **preparado, no ejecutado por este agente**.

## Next action
Coordinador: ejecutar E2E, inspeccionar capturas y contraste efectivo, resolver hallazgos,
QA independiente y `python3 scripts/verify` según clasificación. Revisar toda la
salida/historial antes de commit/push/PR. Merge solo con aprobación explícita de esa PR.

## Revisión QA10 P2 — 2026-10-24
Corregido el preview: derivados antes/después con ejecución, diferencia, fecha conocida,
cobertura, motivo y subtotal; equivalentes muestran importes y racional exacto, no solo
cambio de etiqueta. Relaciones por ID muestran únicamente ciclos cuyo intervalo real
intersecta el ejercicio, reutilizando `cycleMaster`; excluye ciclos completamente anteriores.
Regresión nueva con ciclos 2025/2026/2027, diferencia −20→80 y equivalente 10000/12→20000/12.
Focal anual actualizado: **9 PASS, 0 FAIL, 91 assertions**; typecheck y diff-check PASS.

Primer E2E ejecutado por coordinador: FAIL tras MFA (6,2s), porque la shell navega a Saldos
al terminar acceso y el recorrido asumía conservar la ruta inicial. Corregido el test para
usar el enlace real Plan anual después de MFA, sin cambiar autenticación/shell. Se añaden
assertions de derivados/equivalentes/relaciones en preview. Reejecución E2E e inspección
visual pendientes del coordinador; no se ejecutó navegador ni se solicitaron permisos aquí.

## Cierre local del coordinador — 2026-10-24

QA independiente QA10 P2 corregido y cerrado mediante probe SQLite propio7 assertions:
derivados/equivalentes antes/después y ciclos afectados por intervalo real. Revisión
final del delta CSS/E2E/allowlistPNG sin nuevos hallazgos; sin repetir batería del autor.
E2E B final: **1 PASS, recorrido2,1s / ejecución3,4s**, MFA/Effect/SQLite/Chromium reales.
Intentos anteriores: heading tras MFA6,2s, selector Completo6,4s, selector Esencial11,5s,
segundo selector Completo7,0s; cuatro FAIL de fixture antes de la corrección. Se usaron
navegación real y nombres accesibles, sin relajar controles financieros ni autenticación.

Capturas actuales generadas e inspeccionadas por coordinador:
`artifacts/e2-4/plan-anual-1440.png`, `artifacts/e2-4/plan-anual-390.png`.
Inspección detectó columnas anuales comprimidas por anchuras CSS heredadas; corregidas
con ocho anchos, fecha en una línea y botones44px. Regresión mide anchuras≥64px,
fecha sin fragmentación, viewport sin overflow y contraste DOM de cabeceras/acciones:
mínimo **5,81:1**. Cinco decisiones visuales del testplan revisadas; no auditoría WCAG.
Para conservar esta evidencia funcional en CI se amplía exclusivamente la allowlist
PNG e2-4 en workflow/receta/validador estructural; no se cambia lógica de selección,
eventos, gates, permisos ni plantilla. Ningún factor/DB/traza se sube como artifact.

Focales finales9PASS/91assertions del autor, tipos/build locales PASS anteriores al
delta visual; CI verificará el candidato final completo. Baseline canónico PASS
en una ejecución previa a publicar. API/E2E globales y P11 demo/production Linux UNRUN;
no declarar aceptación global, integración de histórico/cierres ni merge todavía.

Este cierre local es evidencia fechada previa a publicación, no estado remoto cacheado.
El resultado global Linux del candidato se consulta en checks de la PR de esta rama;
el coordinador incorporará run/SHA/resultados al resumen de PR sin provocar un nuevo
CI completo únicamente para registrar su propio resultado. No hay merge autorizado.
