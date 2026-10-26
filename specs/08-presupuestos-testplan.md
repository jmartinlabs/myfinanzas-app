# 08 — E2.2 Presupuestos: plan de pruebas y evidencia

Fecha: 2026-10-23 (Europe/Madrid). Evidencia por SHA; la CI de Linux es la fuente
autoritativa. Las ejecuciones locales en macOS no cubren las suites que dependen de Linux
(`libc.so.6`) ni de `age`: main `ca5de20` también falla ahí ~35 pruebas por entorno.

## CI de Linux por SHA

| SHA | Run | API | E2E | Nota |
| --- | --- | --- | --- | --- |
| `010b8fa` | 39875156224 | 104/1 | no ejecutado | B7: fixture v7 sin 0600 |
| `d57fb0a` | 39875505260 | 105/0 | 2 FAIL | Texto «Sin asignación» y select sin `aria-label` |
| `a112b6d` | 39910404965 | 105/0 | 2 PASS | Primer candidato con E2E verde |
| `f82064b` | 39910564007 | 105/0 | 2 PASS | Candidato revisado por QA08-1 |
| `84078b2` | 39911604222 | 106/0 | 2 PASS | Delta revisado por QA08-2 |
| `2880f98` | 39912703886 | 106/0 | 2 PASS | Regla de fuente con destino inactivo; QA08-3 NO_BLOCKERS |

## Cobertura de criterios

| Pruebas | Criterios |
| --- | --- |
| B1 fuentes, destinos y compartición | AC-01–04, 08, 09, 20, 23, 24 |
| B2 nombres, Estado, idempotencia y revisión | AC-10–12, 15–17 |
| B3 Partida/Deuda e historia bloqueada | AC-05–07, 11, 13, 14 |
| B4 vista previa, huella y rollback | AC-13, 14, 17 |
| B5 procesos reales concurrentes | AC-17, 23 |
| B6 HTTP Effect, MFA, CSRF y errores | AC-18–20, 24 |
| B7 continuidad v7 genuina demo/producción | AC-22 |
| B8 backup/restore v8 y rechazo de v8 ajena | AC-22 |
| B9 destino inactivo: renombrar conserva, cambiar fuente exige activo | AC-04, 15 |
| E2E `presupuestos.ts` dentro de `movimientos.spec.ts` (390/1440, teclado, contraste, vacío, carga, error, bloqueo, restore MFA) | AC-06, 07, 13, 19–22, 24 |

QA independiente (subagente `qa-review`, sin participación en la implementación):
QA08-1 sobre `f82064b` NO_BLOCKERS con los 24 criterios PASS (AC-19 parcial en UI,
corregido en `84078b2`; AC-21 visual cubierto por la inspección del coordinador);
QA08-2 sobre el delta `84078b2` NO_BLOCKERS; QA08-3 sobre el delta `2880f98` NO_BLOCKERS
(su hallazgo menor de UI —destino no válido oculto en el select— corregido después:
se muestra como opción deshabilitada «no válido para esta fuente», sin vaciarlo).
Inspección visual del coordinador sobre capturas 390/1440 (listado, formulario,
revisión de impacto, bloqueo por historia): sin desbordamiento.

## Limitaciones conocidas

- Sin prueba propia de rollback de la migración v7→v8 (corre en la transacción
  IMMEDIATE existente) ni de restore directo de un paquete v8 ajeno (comparte `valid()`).
- La v8 ajena se simula retirando `budget_contract`, no con el esquema8 real de dev07.
- Sin prueba de renombrados concurrentes (misma transacción serializada que el alta).
- Tras «Actualizar contexto» la UI no muestra qué cambió; un renombrado posterior puede
  sobrescribir el nombre de otra sesión (fuente/destino siguen exigiendo revisión).
- `database-schema.ts` no cierra la conexión si falla `assertBudgetContract`; observado
  por QA y no modificado por quedar en la ruta de apertura SQLite (fuera de alcance).
- F-01/F-02 contratos futuros; AC23/E2.1 bloqueo independiente, no resuelto aquí.
