# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 111
message_id: 5ccc51eb-4636-4475-9e4c-da62aa442910
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-11-03T14:17:52Z

## Message

# ESTADO — DEV17 bloque A y SPEC23 (OpenCode → Alex)

## Tarea y estado

DEV17/E4.4 autorizado A/B/C el 2026-11-03. Bloque A (esquema v23, migración, C23, backup y read model) entregado y en QA-1. SPEC23/testplan aprobados y registrados. Sin merges, despliegue, datos reales ni DEV E4.3.

## SPEC23/E4.3

- Aprobación del usuario sobre `acc2d98`; registro de estado en **PR #175**, HEAD `5c6ea18`, CI `required` SUCCESS, `MERGEABLE`/`CLEAN`. **Merge no autorizado.**
- A-02, A-03, cobertura `n_r/m_r` y rectificación de `fecha_vigencia` ratificados.
- DEV E4.3 sigue sin autorizar; v24 solo planificada.

## DEV17/E4.4 — bloque A

| Paso | SHA | Contenido | Evidencia |
| --- | --- | --- | --- |
| A1 | `9151d0d` + `a36ca54` | Esquema v23 aditivo, conciliaciones con auditoría, C23 (`11514c49…`, 270 objetos), backup/restore v23 | 6 pass / 2 skip / 0 fail; `tsc` limpio |
| A2 | `98fb1f3` + `4b74aa1` | Read model, rutas GET de listado/ficha/corte/conciliaciones, 977 líneas de pruebas | 426 pass / 2 skip / 56 fail baseline; sin delta |

- **PR #176** draft, HEAD `4b74aa1`, base `5d903f4`, CI en curso.
- Desviaciones mínimas aceptadas: `deudas.ts` solo lista explícita de columnas del INSERT (sin tocar `getDebt`/`debtPeriod`); `movimientos.test.ts` solo expectativas de versión 22→23.
- Correcciones en revisión: `precontrol_cuotas >= 0` (la spec lo exige) y pago con capital `0` válido en el read model.
- Los 2 skip son backup/restore por `libc`/`renameat2` en macOS; CI Linux debe ejecutarlos.

## QA y siguiente

- **QA-1 lanzada** sobre `4b74aa1` (esquema, migración, C23, backup, read model, m8, `null ≠ 0`, conciliación, rutas, seguridad). Sin PASS declarado.
- Bloque B (escrituras de metadatos/condiciones y conciliación) no iniciado hasta el dictamen.
- Bloque C (UI 1440/390) después de B; QA-2 final.
- Merge de #175 y #176 requieren aprobación explícita e identificable por PR y SHA.

## Consulta

¿Ves algún riesgo material en el read model o en el DDL v23 que deba corregir antes de abrir B (escrituras de conciliación con idempotencia/revisión)? Sin datos reales ni despliegue.
