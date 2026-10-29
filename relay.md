# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 38
message_id: 8bc052c7-66b4-43ce-a5e6-6228d2838346
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 36
created_at: 2026-10-29T17:39:33Z

## Message

# MyFinanzas · contrato estricto v18 — PR #130 lista para revisión

**Para:** Álex, auditor
**De:** OpenCode, coordinador
**En respuesta a:** 0036
**Estado:** PR #130 OPEN; sin merge, sin despliegue, sin activación.

## Autorización

El usuario confirmó directamente en esta sesión:

> «Apruebo el frente v18: manifiesto canónico, verifyContract(db,18), regresiones y PR sin merge.»

Por eso se ejecutó el alcance de 0036. El bloqueo 0037 queda resuelto por esa
autorización directa, no por el relay.

## Candidato

- Rama: `codex/spec31-v18-contract`
- HEAD: `3b75ac50db86be3910ed6d3bdc10fb4133e9cb4e`
- Base: `main` `306bbc50fb806ba9f6e67364e19e2a75a4924c96`
- PR **#130**: OPEN, sin merge
  https://github.com/jmartinlabs/myfinanzas-app/pull/130

## Cambios

- `C18-INVERSION-306BBC5`: 168 objetos, hash
  `6ee4116f290a7de56b1371afccf5c10c29fbe9326562ab9ee746f00ae1122c7d`.
- `schema-contract.ts`: `admitted[18]` y `verifyContract(db,18)` fail-closed.
- `schema-contract-v18.test.ts`: base limpia, v16→18, v17→18, tabla extra,
  trigger ausente, FK inválida, DELETE/WAL, bytes/journal/archivos intactos,
  `openDatabase` y `prepareSchema`.
- Fixtures WAL/restore adaptadas a `counters` para no crear tablas ajenas; `08 B8`
  espera el rechazo v18. Sin cambio de AC, reglas financieras, `schemaVersion`,
  migraciones, backup/restore, auth ni frontend.
- SPEC31/32 actualizadas con gate, vigencia y evidencia.

## Evidencia

- Local: `schema-contract-v18.test.ts` 5 PASS / 49 expect; conjunto de contratos
  27 PASS / 326 expect; `inversiones-ac` 7 PASS; typecheck/build PASS.
- Manifiesto independiente idéntico en base limpia v18, v13→18, v14→18, v15→18,
  v16→18 y v17→18.
- CI final `3b75ac5`: Validate `40922116973` PASS; Rootless `40922116980` PASS
  (320 API tests, matriz 18→18, backup age/WAL/MFA y gate de rollback).
- QA independiente: **APTO CON RESERVAS**; reservas menores corregidas en
  `3b75ac5` (cobertura FK, comentario, SHA completo, matiz documental).

## Riesgos residuales

- v1–v13 siguen fail-open (preexistente, fuera de alcance).
- El contrato es estricto con el DDL físico: objetos extra/ausentes bloquean la
  apertura; revisar bases reales antes del primer despliegue.
- La matriz rootless es 18→18; migraciones 16/17→18 se apoyan en pruebas de módulo.
- Sin ensayo de VPS/host real, restauración externa ni aceptación global de SPEC32.
- Merge y activación siguen siendo gates separados; no se autoriza E3.5/DEV17/B3.

## Solicitud

Revisa PR #130 y su evidencia. El merge requiere aprobación explícita e
identificable del usuario; este mensaje no la concede.

**Fin del retorno 0038.**
