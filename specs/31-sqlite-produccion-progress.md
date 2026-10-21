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

## Revisión crítica final previa al merge — 2026-10-21
Usuario autoriza revisión real y correcciones de seguridad; no merge/VPS/despliegue.
Main sincronizado con PR #26 integrada (68b0624), sin alterar su instrumentación R6.
Se reprodujeron y corrigieron: sustitución de clave por hardlink tras lstat, symlink
SHM aceptado, lectura de clave de otra conexión, snapshot antes de validar destino y
borrado de un archivo de entrega reemplazado por otra operación tras fallo de escritura.
P12–P18 verifican esos casos y apertura sin CREATE tras desaparición del archivo,
publicación mediante descriptor del padre y sustitución concurrente del directorio.
Typecheck/build y suite completa: **73 PASS / 1210 assertions**, incluyendo R11 integrada;
ningún test omitido ni reglas financieras modificadas. Navegador/CI final en PR.
La simulación local detectó solapamiento documental en setup-progress al squash de #23;
se traslada únicamente el bloque de seguimiento de implementación al final para
mantener intacta la aprobación #23 y evitar esa duplicidad/conflicto. Repetir simulación
sobre el commit definitivo; no supone merge real de #23/#25.

## Revisión de seguridad posterior — 2026-10-21

Usuario solicita revisión real y orden #23 → #25, sin merge. Ensayo local previo a incorporar los avances remotos:
conexión efectiva vinculada a clave, fstat/O_NOFOLLOW tras apertura, restore sin
colisiones de nombres y preflight inmutable sin modificar SHM en rechazos. Nueve
pruebas adicionales S1–S7; resultados locales 74 API PASS / 1170 assertions y 2
E2E PASS (47.5 s). Los 33 AC conservan PASS con cobertura reforzada. Ver testplan.

Resuelto conflicto hipotético de squash moviendo el seguimiento de implementación
al final de setup-progress; #23 y sus documentos aprobados permanecen idénticos.
Simulación de árboles limpia, sin ejecutar merge. Pendiente CI del SHA definitivo
y revisión con Álex para autorización; ni #23 ni #25 integradas.

Reconciliación de cambios concurrentes: se preservan main 68b0624 (R6) y el
endurecimiento remoto 9362158 (P12–P18, dirfd, sidecars, READWRITE sin CREATE,
limpieza por inode y raíz de backup validada). Estos avances ya resuelven varios
hallazgos del ensayo inicial. La solución local adicional conserva dichas
protecciones, añade preflight de identidad sin SHM y nueve regresiones S1–S7.
Se mantiene bundle.tmp como nombre reservado, sin ampliar rutas aceptadas ni
introducir otro espacio temporal innecesario. Los conteos anteriores son historia
local previa a la reconciliación; el resultado combinado se registra al validar.

## Resultado combinado para revisión

Main 68b0624 y endurecimiento ajeno 9362158 preservados. Nueve pruebas S1–S7
refuerzan P1–P18 sin eliminar garantías. Resultado: 82 Bun PASS / 1243 assertions,
2 E2E PASS (41.5s), tipos/build correctos. #23 primero, luego #25; simulación de
árboles tras main actualizado y squash limpia, sin duplicar documentos aprobados.
Pendiente aprobación expresa de merge tras CI del SHA final; no VPS/deploy/datos.
La causa histórica R6 sigue sin atribuir; no se afirma resolverla por una CI verde.

## Estado remoto comprobado — 2026-10-21

GitHub registra #23 integrada por josemartin2000 a las 21:51:50 UTC mediante
squash 13f19f6add82ff24be5040674528bdad4b96c75f (head aprobado f064935).
Su árbol coincide exactamente con el árbol hipotético 115dc61 ya comprobado.
La sincronización concurrente de la rama de implementación se preserva en
619710b438da52fd321181b701fa9ee4f6d01398; su árbol es idéntico al estado probado
f9bdc951153a62fdbf1adb39fc8f45580ce0011e. No se ha ejecutado merge de una PR
por este agente. Main es ancestro de la rama: el diff GitHub contiene únicamente
26 archivos de implementación/pruebas/documentación, sin specification ni
brainstorming duplicados y sin conflictos. El orden #23 → #25 queda respetado;
#25 continúa pendiente de autorización de integración. Resultados locales:
82 API PASS / 1243 assertions y 2 E2E PASS; CI definitiva vinculada al SHA en #25.
Sin VPS, despliegue ni datos financieros reales. Riesgos/límites vigentes:
UID/root confiables, Linux/glibc, fallo fsync posterior a rename puede dejar un
conjunto válido cuya durabilidad requiere inspección; causa histórica R6 sin atribuir.
