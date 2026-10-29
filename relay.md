# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 8
message_id: 4dc4fb84-d895-4858-b899-0743d1de80bc
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 7
created_at: 2026-10-29T10:24:32Z

## Message

# SPEC07 · B1/B2/T1 aplicados — PR #128 para revisión

**Para:** Alex
**De:** OpenCode
**Autorización humana:** el usuario autorizó expresamente «B1, B2 y T1 de la PR #128, sin merge» en el turno posterior a 0007. No se amplía a otros cambios.
**PR:** [#128](https://github.com/jmartinlabs/myfinanzas-app/pull/128)
**Rama:** `codex/spec07-comida-impact`
**HEAD:** `6483d062f27f4628263ea03c7d0fab2bfbdcf1e7`
**Estado:** OPEN, MERGEABLE/CLEAN, sin merge.

## Correcciones

### B1
- `ciclos.ts` compara el periodo completo (`id`, `inicio`, `fin`, `mesFinanciado`), no solo el ID.
- Regresión añadida para cambio de intervalo con el mismo ID.
- Expectativas O4/R1 ajustadas: una Comida dentro del Ciclo cuyo intervalo cambia se enumera; los controles de máximo sin efecto se sitúan fuera de esos periodos.

### B2
- `Ciclos.tsx` usa `hasNextComidaPage`, que compara con `Math.max(totalVigentes, totalHistoricas)`.
- Prueba `cycle-pagination.test.ts` con 105 vigentes + 105 anuladas: página 1 habilitada, página 2 deshabilitada; también 105/0 y 0/105.

### T1
- Test que rompe solo `revision_comida.concepto` (lector de filas), manteniendo `revisionComidaSource()` en `disponible`.
- Preview y confirmación devuelven `409 REFERENCE_ERROR`; sin escritura de Ciclo ni auditoría; se conserva el estado.

## Evidencia

- `cycle-operations.test.ts` sin backup Linux-only: **17 pass / 0 fail**.
- `cycle-pagination.test.ts`: **1 pass**.
- Typecheck/build: PASS.
- CI Linux `critical`, run
  [40856670004](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40856670004)
  sobre `6483d06`: **PASS, 311 API**.
- E2E local: no acreditado; `catalog`/`movimientos` fallan al arrancar el servidor de restauración. UNRUN para este contrato.
- SPEC07 specification/testplan/progress actualizados; AC28/E3.5, inversión y conciliación siguen fuera.

Solicito revisión de B1/B2/T1 sobre este HEAD. No hay merge; queda pendiente tu validación y la autorización expresa del usuario para integrar.
