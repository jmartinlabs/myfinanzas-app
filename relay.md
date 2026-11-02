# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 79
message_id: 23e60603-4db6-4855-8777-d95a5af8c738
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 78
created_at: 2026-11-02T15:46:07Z

## Message

# Retorno 0079 — auditoría read-only de las 11 SPEC sin acta ratificada

**De:** OpenCode · **Para:** Álex
**Base:** `main` `8b551c5`. **Sin ediciones, PR, merges, DEV, datos reales ni despliegue.**

## 1. Tabla de las 11 SPEC

Leyenda residual: **DEF** defecto real · **DEV** desarrollo futuro · **DATOS** fuente real ·
**INFRA** backup/rootless/VPS · **QA** aceptación/evidencia pendiente.

| SPEC | Auditoría | Evidencia funcional | Residual | ¿Cerrar auditoría? |
|---|---|---|---|---|
| 04 | Completa; 3 hallazgos resueltos #125 | 29 AC PASS `b51b89b`; E2E propio UNRUN; full `766ea6b` sobre código idéntico | QA / DEV AC-30–33 | **Sí**, con nota |
| 06 | Diferida (`acta:18`) | 30 AC locales; PR #34 `cb9ba3b`; sin full | DEV (M1/E4.4); sin DEF acreditado | **No** (decisión vigente) |
| 09 | Completa; H-SPEC09-01 = ambigüedad | PR #57 `7422d23`; UI/E2E pendiente | QA / ratificar semántica | **Sí**, con nota |
| 16 | Pendiente de aclaración | #160 `30a832c` API PASS (`41455159383`); AC-25/P3 UNRUN | DATOS / DEV E3.5 | **Condicionado** |
| 17 | Completa; M1/M2/m8 aplicados #163 | Ningún AC ejecutado | DEV (spec/wireframes + DEV17) | **Sí** |
| 20 | Completa con reserva; H-SPEC20-01 resuelto | 59 AC UNRUN; PR87 `3d70fd6` | DEV E4.5 / DATOS DT7 / QA opcional | **Sí** |
| 21 | Completa; H-SPEC21-01 resuelto | 31 AC UNRUN; PR97 `2364d9c` | DEV E3.6 / QA opcional | **Sí**, tras nota de merge |
| 22 | Completa; clasificación D obsoleta | #157 `fd2e21c`; 45 AC PASS; full `766ea6b` run `41435723276` / `494f59f` run `41434662965` | QA aceptación / E4.3 | **Sí** |
| 26 | Completa; H-SPEC26-02 resuelto #161 | #150 `e608bbb`; 13 PASS + AC-04 parcial + AC-11/16 condicionados; `41456569310` | QA full / DT6 | **Sí**, con reserva |
| 27 | Completa; #161 ya provee `positionsAtDate` | Todos los AC UNRUN | DEV E4.9 / DT6 / E3.5 | **Sí** |
| 32 | Diferida (`acta:105`) | AC-18 PASS; AC-22 parcial `87f9c5b`/`40898403837` | INFRA rootless/Debian13 + QA E2E | **No** (decisión vigente) |

**Conclusión:** ningún **DEF acreditado** en las 11. Resultado propuesto: **23/25 auditorías
cerradas** (3 previas + 11 ratificadas + 9 propuestas), **2 diferidas** (06, 32), **0 nuevas
SPEC funcionalmente cerradas**; balance funcional 3/22 sin cambios. Ninguna AC PARCIAL/UNRUN
declarada PASS.

## 2. Hallazgos materiales abiertos

1. **SPEC16 — aprobación contradictoria.** `16-spec:3` dice delta «pendiente de aprobación
   final»; `:1425` registra «Apruebo especificaciones»; `board:173` da rev3 aprobada. Requiere
   aclaración humana del alcance de la aprobación del 2026-10-31.
2. **SPEC06 — M1 latente, no defecto demostrado.** `deudas.ts:38` usa `BigInt(m.capital ??
   "0")`; la validación de `movimientos.ts` impide capital nulo en altas nuevas, así que solo
   afectaría a historia importada. Reserva DEV E4.4, no bug acreditado.
3. **SPEC04 — PASS histórico sin atribución propia.** Los 29 AC son de `b51b89b`, anterior a
   #125; `766ea6b` sí ejecutó `movimientos.spec.ts` sobre código idéntico, pero no es candidato
   SPEC04. Falta aceptación/atribución, no cobertura.
4. **SPEC20 — QA AC48–59 opcional** (`20-progress:8-9,32`). No bloquea si el acta lo registra.
5. **Tracker/resumen/tablero obsoletos frente a `8b551c5`:** `tracker:561` (SPEC32 sin
   testplan/progress), `:600-604` (22/26/27/32), `board:565` (PR87 Draft/FAIL), `:738` (17
   aprobado), `:743` (22 merge pendiente), `:747-748` (26/27 no iniciada); `resume:60-85`
   titula «pendientes» a H-SPEC26-02/H-SPEC16-02 ya integrados y afirma que `positionsFor` no
   acepta fecha (`investment-engine.ts:591-596`, `precierre.ts:296`).
6. **Recuentos cruzados:** `board:6` «13/3/2/4» vs `resume:48` «11/5/2/4». Falta fijar uno.
7. **SPEC32 AC-22:** parcial correctamente declarado; `766ea6b` no se usa como evidencia.

## 3. Gates independientes

Aceptación/QA (04, 06, 09, 16, 22, 26) · aprobación spec/wireframes (17) · DEV (17, 20, 21, 27)
· datos reales (16, 20) · DT6 backup/restore (26, 27, 31) · E3.5/FIN_NETA (16, 27) · rootless
real/Debian13/VPS (32) · E4.3 valoración (22). Ninguno debe bloquear el cierre documental.

## 4. Acta global final (propuesta)

`specs/investigations/audit-closure-global-2026-11-02.md`: alcance 25 SPEC; evidencia (tracker,
resume, 11 actas, PRs #115–#163, runs); hallazgos resueltos (04/05/06/07/09/11/16-02/20/21/26-01-02/32-01,
M1/M2/m8, D7); **estado dual** auditoría vs funcional; reservas; registro estable de pendientes;
declaración expresa «auditoría documental finalizada ≠ 25 SPEC funcionalmente cerradas» y no
autorización de DEV/datos/migración/despliegue/merge.

**Para declarar terminada la auditoría formal falta:** aclarar SPEC16, ratificar el acta global
y las 9 actas (04, 09, 16, 17, 20, 21, 22, 26, 27), decidir sobre 06/32, alinear
tracker/resumen/tablero y pasar la verificación documental en checkout limpio. **No** hace
falta esperar DEV, E2E rootless, DT6 ni datos reales.

## 5. Ediciones propuestas (no ejecutadas)

- `spec-audit-tracker.md`: cabecera (cierre global propuesto, 23/25, base `8b551c5`), `:561`
  SPEC32 `Y/N/N/Y`→`Y/Y/Y/Y`, filas `:583,585,595,596,598,599,600,601,602,604`.
- `audit-spec-resume-2026-11-02.md`: base y merges; filas 09/16/17/22/26/32; recuento único
  (propuesta A14/B5/C0/D3 con nota); retitular «Correcciones integradas»; corregir `positionsFor`.
- `epic-board.md`: cabecera y recuento dual; `:565` PR87 MERGED `3d70fd6`; `:738` SPEC17 en
  revisión; `:743` SPEC22 MERGED `fd2e21c`; `:747-748` SPEC26 integrada / SPEC27 DEV no autorizado.
- Notas de vigencia de una línea (opcionales): 04 progress/testplan, 06 testplan, 16 spec,
  21 progress, 22 spec/progress/testplan.

## 6. Pruebas documentales

`git diff --check` PASS; `check-project` PASS; `validate-template` exit 0 (warning por
`specs/session-handoff.md`, residuo untracked ajeno al repo). `test-validator` da 5 FAIL
provocados únicamente por ese archivo untracked; en worktree limpio debe dar 31/31. Para el
lote: `test-validator`, `validate-template`, `check-project`, `verify --base 8b551c5 --head <rama>`
(perfil docs) y `gh pr checks`. No requiere `--full`.

## 7. Decisión humana solicitada

> «Ratifico el acta global de auditoría documental de 2026-11-02; autorizo la PR documental
> limitada a tracker, resumen, tablero, acta global y notas de vigencia; mantengo SPEC06 y
> SPEC32 diferidas; acepto las reservas funcionales enumeradas; no autorizo DEV, datos reales,
> migración, despliegue ni merge de código.»

Si se prefiere 25/25 auditorías: añadir «y encargo cerrar la auditoría de SPEC06 con reserva M1
y la de SPEC32 con AC-22 parcial», sin convertir ningún AC en PASS.

## 8. Prioridad tras consolidar

Preparar **E3.5/FIN_NETA** adaptado a Comida de registro único, sin reanudar DEV18 antiguo y
sin autorizar desarrollo. Queda como recomendación, no como autorización.
