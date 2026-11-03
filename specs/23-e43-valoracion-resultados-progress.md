# 23 — E4.3 Valoración y resultados: Progress

Status: **DEV E4.3-A y DEV43-B implementados, con CI Linux verde en `9f5e059` (PR #184
draft, sin merge). DEV43-C sin empezar. Ningún AC/TP en PASS.**
Task ID: `SPEC23-E4.3` — Valoración y resultados de posiciones.
Fecha: 2026-11-03.
Fuentes: [specification](23-e43-valoracion-resultados-specification.md),
[testplan](23-e43-valoracion-resultados-testplan.md), DT2 (`24f3efb`, PR #174),
wireframes (`bb076f1`, PR #177) y handoff de sesión de 2026-11-03 (no versionado).

## Checkpoint A — esquema v24, migración, C24 y backup

- **Autorización:** usuario 2026-11-03, DEV E4.3 A/B/C con v24 reservada, fixtures,
  API/UI/pruebas y QA; sin merge funcional ni despliegue.
- **Base y aislamiento:** `main` `7bfb5a2` (v23); rama `feat/e43-valoracion`, worktree
  `dev43-e43`; sin datos reales.
- **Commits de A:** `ec79eec` (esquema v24, migración y contrato C24), `88e202b`
  (alineación del contrato y fixture Manual), `15d9675` (rollback parcial del DDL) y
  `0427c59` (expectativa del contador v24 en la continuidad v7/v8).
- **Esquema v24:** tabla `valoracion_inversion` con ID `VAL-` estable, FK a la posición,
  fecha de vigencia, tipo Manual/Automática, EUR, precio/cambio/cantidad con precisión
  DT2, procedencia, cobertura, revisión, motivo y auditoría append-only; unicidad
  `(saldo_inversion,instrumento,fecha_vigencia)`; sin `ciclo_id`, sin DELETE y sin backfill.
  Contador `valoraciones_inversion` creado por la migración.
- **Contrato:** `C24-E43-VALORACION`, **284 objetos**, SHA-256
  `35caf6cca151bd1fd25cb18a6c34cc7bd906e9e581253819ce36eb4fd867162d`; C14–C23 intactos.
- **Backup/restore:** etiqueta `e4.3-v24`; se limpia `valoracion_attempts`; las pruebas de
  backup/restore completas son Linux.
- **QA-A:** **APTO CON RESERVAS**. F1 (contrato v24), F2 (Manual con divisa/cambio NULL)
  y F3 (rollback parcial real) cerrados. **F4/F5 quedan como obligaciones de B**; según el
  PR #184 corresponden a fecha de vigencia no futura y consistencia de cantidad, pero la
  etiqueta no consta en el repositorio.
- **CI:** run Linux `41713369261` (`required`) **PASS**, 630/630 tests en 52 ficheros.
  `bun run typecheck` limpio en `0427c59`.
- **Corrección de CI:** el run previo `41711265814` falló de forma determinista porque la
  lista esperada de contadores de `cycle-operations.test.ts` no incluía
  `valoraciones_inversion`; `0427c59` añade esa expectativa. No fue un defecto de producto
  ni el flake conocido de `sqlite-opening`.

### Evidencia de A (no convierte AC/TP en PASS)

| Comprobación | Candidato | Entorno | Resultado |
| --- | --- | --- | --- |
| `e43-migration.test.ts` + `e43-schema-contract.test.ts` | `0427c59` | macOS | 59 pass / 3 skip (backup/restore Linux) / 0 fail |
| `bun run typecheck` | `0427c59` | macOS | PASS |
| CI Linux `required` (`41713369261`) | `0427c59` | Ubuntu CI | 630/630 PASS |
| Contrato C24 | `0427c59` | — | 284 objetos, SHA `35caf6cc…` |

macOS no acredita las guardas Linux (`renameat2`, `libc.so.6`) del backup/restore; el gate
canónico es CI Linux. No se declara ningún criterio funcional E4.3 como PASS.

## Checkpoint B — read model y API (candidato)

- **Estado:** implementado en `feat/e43-valoracion` (`9f5e059`), PR #184 draft; sin UI.
- **Ownership:** `apps/api/src/e43.ts`, `apps/api/src/e43-api.test.ts` y las rutas E4.3 en
  `apps/api/src/app.ts`. Sin DDL, sin v25, sin web/UI.
- **Alcance entregado:** `GET /api/e43/corte`, detalle de posición, serie y ficha/auditoría;
  `POST` de alta y rectificación con idempotencia, revisión, procedencia y fecha no futura;
  DTOs de cobertura, resultado, elegibilidad por fecha exacta, efectivo separado y errores
  401/404/409/422; sin escritura de totales, `e43`, `valoracion` ni la foto de SPEC27.
- **F4/F5:** fecha de vigencia no futura y consistencia cantidad base/cantidad al corte
  implementadas y cubiertas por pruebas.
- **Fuera de alcance:** UI/E2E (C), cambios de esquema v24, v25, E4.9/E4.6/E4.7/E4.5,
  datos reales, migración operativa, despliegue y merge.
- **Pruebas:** `e43-api.test.ts` 9/9 en macOS; `bun run typecheck` limpio; CI Linux
  `required` run `41717745009` **639/639**. Los fallos de backup/restore macOS son los mismos
  de `main` y no acreditan el gate Linux.
- **Límite:** QA-B independiente pendiente; ningún AC/TP funcional se declara PASS todavía.

## Próxima acción segura

1. QA-B independiente sobre el candidato `9f5e059` (API/read model, sin UI).
2. Tras QA-B, preparar C (UI/E2E) con wireframes ya integrados; sin merge de #184.
3. No merge funcional, ni C, ni v25, ni datos reales sin aprobación específica.
