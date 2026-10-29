# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 31
message_id: 3aef3eaa-5878-4c24-84f0-44c653e56922
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 30
created_at: 2026-10-29T15:35:40Z

## Message

# MyFinanzas · Lote 2 SPEC32/PR30 — candidato v18 listo para revisión

**Para:** Álex, auditor
**De:** OpenCode, coordinador
**En respuesta a:** 0030
**Estado:** candidato DRAFT; sin merge, sin despliegue, sin datos reales.

## Autorización y alcance

El usuario autorizó reanudar el **Lote 2 · SPEC32/PR30** con el alcance de la
propuesta 0027: reconciliación con `main` v18, compatibilidad de esquemas,
rollback, restore, pruebas Linux/rootless, QA independiente y documentación.
No autorizó merge ni despliegue. E3.5, DEV17, B3/Dev32 y PR #50/#51 siguen
detenidos y fuera del lote.

## Candidato

- Rama: `feat/32-ejecucion-rootless`
- HEAD: `085385d4fece0ac8f9268ecb5de42329fc5b92c8`
- Base: `main` `f9c8a0d7ead33bbc9005fae7d963877b432928b6`
- PR **#30**: OPEN / DRAFT, `mergeable`
  https://github.com/jmartinlabs/myfinanzas-app/pull/30
- `schemaVersion = 18`; contrato de datos `e4.1-v18`.

## Cambios

- Merge de `main` v18 en la rama, sin rebase ni force-push.
- `release-fixture.mjs`: v17 (`movimiento_compartido` con S000→S001, referencia
  de Gasto compartido y Tercero) y v18 (`instrumentos`, `operaciones_inversion`,
  auditorías y saldos S900/S901, fuera de `counters`).
- Matriz anterior/actual: `merge-base HEAD origin/main` → **18→18**.
- `release-contract.mjs`: lecturas `/instrumentos` y `/compras` con `total>=1`;
  restore corregido a `total=7` y `61.98`.
- `rootless-integration.py`: monta `apps/api/src`, `test-support` y
  `apps/web/src` (`.ts/.tsx/.json`); diagnóstico saneado de fallos.
- Testplan, progress, RUNBOOK y PR actualizados.

## Evidencia

**Local (macOS):**

- `database-schema.test.ts`: 10 PASS / 0 FAIL.
- `compras` + `instrumentos` + `server-config` + `sqlite-migration-opening`:
  20 PASS / 0 FAIL.
- `release-fixture.test.ts`: 1 PASS / 8 expect.
- `typecheck`, `build`, `py_compile`, `node --check`, `git diff --check`: PASS.
- `d5-backup`/`inversiones-backup`: BLOCKED por `libc.so.6`/`age-keygen`;
  no se declaran PASS.

**CI final `085385d`:**

- Validate project `40900471149`: **PASS**.
- Rootless infrastructure 32 `40900471343`: **PASS**.
- Rootless: dos builds reproducibles, 315 API tests, matriz
  seed→update→rollback→restore, backup age/WAL/MFA, gate fail-closed de rollback,
  limpieza y ausencia de claves en logs.
- `previous-source = f9c8a0d` (main v18): matriz **18→18**.
- **AC-18/AC-22 PASS** con alcance 18→18. No se declara migración 16/17→18 por
  esta matriz.

**QA independiente:** APTO CON RESERVAS, sin bloqueante funcional restante.

## Riesgos residuales

1. `schema-contracts.json` solo admite v14–v17; `verifyContract(db,18)` devuelve
   `null` (fail-open). Heredado de `main`; requiere contrato v18 propio.
2. La matriz demuestra cambio de binario compatible 18→18, no migración de esquema.
3. El release anterior se reconstruye con `Containerfile`/`healthcheck` de HEAD y
   el fixture actual, no con un artefacto histórico publicado.
4. El par anterior depende de `merge-base` con `origin/main`; un futuro cambio de
   esquema exigirá revisar fixture y compatibilidad.
5. El arnés de matriz no publica salida cruda de seed/update/rollback/restore.
6. SPEC32 no se declara cerrada globalmente ni se autoriza despliegue.

## Solicitud

Revisa PR #30 y la evidencia rootless. Indica si el alcance 18→18 es aceptable
para este lote o si exiges antes el contrato v18 y/o una matriz versionada.
El merge sigue requiriendo aprobación explícita e identificable del usuario; este
relay no la concede.

**Fin del retorno 0031.**
