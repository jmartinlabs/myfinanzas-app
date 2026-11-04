# 23 — E4.3 Valoración y resultados: Progress

Status: **E4.3 A+B+C y QA final integrados en `main` `dd56553` (squash de #184, #187 y #189); CI post-merge `41796526278` verde. 15 AC PASS de cobertura, 2 PARCIAL; 409 con sobrescritura explícita. Aceptación funcional final de Álex pendiente; sin PASS de aceptación.**
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

- **Estado:** integrado en `main` `3b9be46` (squash de #184); sin UI.
- **Ownership:** `apps/api/src/e43.ts`, `apps/api/src/e43-api.test.ts` y las rutas E4.3 en
  `apps/api/src/app.ts`. Sin DDL adicional, sin v25, sin web/UI.
- **Alcance entregado:** `GET /api/e43/corte`, detalle de posición, serie y ficha/auditoría;
  `POST` de alta y rectificación con idempotencia, revisión, procedencia y fecha no futura;
  DTOs de cobertura, resultado, elegibilidad por fecha exacta, efectivo separado y errores
  401/404/409/422; sin escritura de totales, `e43`, `valoracion` ni la foto de SPEC27.
- **F4/F5:** fecha de vigencia no futura y consistencia cantidad base/cantidad al corte
  implementadas y cubiertas por pruebas.
- **Fuera de alcance:** UI/E2E (C), cambios de esquema v24, v25, E4.9/E4.6/E4.7/E4.5,
  datos reales, migración operativa, despliegue y merge.
- **Pruebas:** `e43-api.test.ts` 14/14 en macOS; `bun run typecheck` limpio; CI Linux
  `required` run `41721208556` **644/644** y post-merge `41722741566` verde. Los fallos de
  backup/restore macOS son los mismos de `main` y no acreditan el gate Linux.
- **QA-B (independiente):** **APTO CON RESERVAS**, sin bloqueantes. R1 (Manual >2⁵³−1
  devolvía 500 en vez de 422) y R2 (`cantidadBase` declarada en Automática) corregidos en
  `464341b`; R3 reforzado con instantánea de todas las tablas antes/después de las lecturas.
  Quedan como reservas menores AC-07/AC-17 y concurrencia real, y la UI (C).
- **Límite en el hito B:** no se declaraba ningún AC/TP funcional como PASS; C/UI quedaba pendiente.

## Checkpoint C — UI/E2E

- **Estado:** integrado en `main` `8552d4a` (squash de #187), base `349370a`; sin cambios de
  backend de producción.
- **Entregado:** pestaña Valoración en Inversiones; listado de corte con agregado/cobertura,
  elegibilidad, tabla 1440 y tarjetas 390, efectivo separado; detalle con serie y valoración
  usada; alta Manual/Automática con idempotencia y previsualización; rectificación auditada;
  ficha/auditoría. Rutas bajo `/inversiones/valoracion`.
- **Evidencia:** `bun run typecheck` y `bun run build` PASS; `tests/e2e/valoracion.spec.ts`
  1/1 y `tests/e2e/inversiones.spec.ts` 1/1 en macOS; CI de PR `41728978112` 644/644
  (perfil critical, sin Playwright) y CI post-merge `41730772524` verde. Fixture E2E aislado
  en `apps/api/test-support/valoracion-server.ts`; capturas en `artifacts/e4-3/` (ignoradas).
- **QA-C (independiente):** **APTO CON RESERVAS**, sin bloqueantes. R1 (detalle de posición
  cerrada mostraba `null`/`No disponible` en vez de `No aplica`) y R3 (409 de revisión
  simulado) corregidos en `c022f88`; O1/O2 corregidos. Re-QA confirmó R1/R3 cerrados.
- **Reservas:** cobertura E2E pendiente de cantidad modificada/A-01, Manual 0,00, resultado
  negativo, serie vacía, sin efectivo, 403 CSRF e idempotencia en reintento; la sesión
  expirada global no conserva el corte; aceptación visual final de wireframes pendiente.
- **Límite en el hito C:** no se declaraba ningún AC/TP como PASS antes de la QA final; la aceptación visual corresponde al usuario.

## QA final — 2026-11-04

- **Candidato:** PR #189, rama `fix/e43-qa-final`, HEAD `57a86aa`; merged `dd56553`; CI Linux `required`
  644/644; `typecheck`, `build`, Playwright Valoración 1/1 y regresión Inversiones 1/1.
- **Corregido:** R5 (contexto `/inversiones` y corte consultado), O3 (singular/plural),
  recaptura del 390 parcial antes de mutar y **409 sin sobrescritura inadvertida** (diferencias
  visibles, guardado bloqueado, descarte seguro o confirmación explícita con casilla).
- **Evidencia añadida:** A-01 (base 10 → corte 8), Manual 0,00, resultado negativo −120,25 €,
  serie vacía y sesión expirada con retorno al corte.
- **Clasificación:** 15 AC PASS de cobertura (API+UI), 2 PARCIAL, 0 UNRUN/BLOCKED. Reservas menores: 403
  CSRF/idempotencia solo API, sin efectivo en fixture, concurrencia real, reapertura
  explícita, formato nativo de fecha y detalle sin sumandos. Detalle en
  [QA final](23-e43-qa-final.md) y capturas en [`23-e43-captures/`](23-e43-captures/).
- **Límite:** sin merge; revisión funcional final de Álex y aprobación pendientes.

## Próxima acción segura

1. Presentar a Álex la revisión funcional final con las capturas y el informe QA.
2. Agrupar la aprobación del merge de #189 con las decisiones materiales pendientes.
3. No abrir E4.9/E4.6/E4.5, v25, datos reales ni despliegue sin aprobación específica.
