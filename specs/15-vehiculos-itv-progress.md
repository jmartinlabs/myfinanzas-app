# E3.3 — Vehículos y control ITV: progreso DEV15

Estado: **CANDIDATO VALIDADO — QA INDEPENDIENTE APTO CON OBSERVACIONES; SIN PUBLICAR** · rama `codex/pilot-dev15-deepseek`
Base autorizada: `e408b1da5ae9f45c9bfd139d11f362216b5bce26` (`origin/main`, PR78 integrada).
HEAD final local de código: `90c28a7cfc15bfd31af4dc327769553147914ddf`.
Spec: [15-vehiculos-itv-specification.md](15-vehiculos-itv-specification.md) rev5,
aprobada sobre `15c2ff1e59d36e3fb5ca99790d9774d204c35129`.
Evidencia de pruebas: [15-vehiculos-itv-testplan.md](15-vehiculos-itv-testplan.md).

## Autorización de desarrollo

El usuario emitió el 2026-10-26, en respuesta al gate de entrada del piloto:

> Autorizo dev15 conforme a spec15 rev5

Objeto inequívoco: desarrollo de E3.3 conforme a la revisión 5 aprobada. La autorización
se limita a implementación, pruebas, QA y commits locales; **no** autoriza push, PR,
merge, despliegue, datos reales ni cambios de visibilidad. PR78 no se modifica.

## Checkout y ownership

- Worktree aislado: `.../T/opencode/pilot-dev15-deepseek`.
- Rama: `codex/pilot-dev15-deepseek`, creada desde `origin/main` `e408b1d`.
- Checkout principal `codex/dev12-flujo-mensual` intacto; no se reanuda DEV12/14,
  B3, PR75, D5/Exterior, Comida/spec16 ni Dev32.
- Solo el coordinador escribe `specs/epic-board.md`; esta entrega mantiene su detalle
  en este archivo y en el testplan. No se sobrescriben tableros ajenos.

## Decisiones técnicas ordinarias

- Esquema v14: `referencias` admite `Vehículo` y se añade `fichas_vehiculo` 1:1 sin
  maestros ni totales persistidos. La migración reconstruye las tablas dependientes de
  `referencias` dentro del `BEGIN IMMEDIATE` existente, conservando filas, auditorías,
  índices, FK y triggers; rollback íntegro ante fallo.
- Alta y edición siguen exclusivamente por `POST/PATCH /api/referencias`; no se crea
  `/api/vehiculos` de escritura. `/api/vehiculos` es read model de ficha, integridad y
  gasto anual.
- La conversión Q3 exige `confirmarConversion: true` y crea la ficha en la misma
  transacción; una REF con ficha no cambia de Tipo y una REF usada queda bloqueada.
- Duplicados: nombre y matrícula se comparan por dimensión con clave efímera
  `trim + minúsculas`, excluyendo la propia REF. El servidor emite hashes ligados a
  operación/REF/revisiones/valor/candidatos y los revalida bajo el writer lock.
- Gasto anual: read model derivado de `ledgerRows` + `annualExecution` de E2.4, una
  fila por Partida con Gastos elegibles de la REF. No hay tabla de totales ni segunda
  fórmula. Sin proveedor anual instalado la cobertura es parcial y los totales
  anuales quedan `null`; las pruebas inyectan `AnnualProvider` ficticio para los
  casos verificables.
- Fechas ISO civiles; `null` limpia, omitido conserva, vacío rechazado. Fechas pasadas
  válidas. Importes solo en DTO string decimal.
- UI reutiliza shell, tokens, PageHead/Tag/Alert y tablas/tarjetas existentes. Se añaden
  rutas `/vehiculos`, `/vehiculos/nuevo`, `/vehiculos/integridad`, ficha/edición y la
  conversión explícita desde Referencias.

## Hitos

- [x] Gate de entrada, PR78 y autorización verificados.
- [x] Worktree y rama aislados; plan y matriz AC creados.
- [x] Esquema v14 y migración/backup.
- [x] Servicio de fichas, duplicados, conversión y auditoría.
- [x] Read model de gasto anual/cobertura/integridad y API protegida.
- [x] UI responsive, integración Referencias y pruebas Playwright.
- [x] Suite focal, typecheck/build.
- [ ] Verificación canónica y gates Linux/CI.
- [ ] QA independiente sobre SHA candidato y correcciones.
- [ ] HANDOFF → CODEX.

## Bloqueos y límites

- Sin push/PR/merge ni despliegue.
- macOS no acredita las guardas exclusivas de Linux/CI; se registrarán como UNRUN.
- No se reutilizan datos reales; todos los fixtures son ficticios.

## Implementación y evidencia local

- Esquema `apps/api/src/vehicle-schema.ts` v14; fixture genuina v13 en
  `apps/api/test-support/database-v13.ts` y prueba de actualización con Referencias,
  Movimientos y ficha de Anticipo preservados.
- Dominio `apps/api/src/vehicle-rules.ts` + `referencias.ts`; read model en
  `apps/api/src/vehiculos.ts`; rutas en `apps/api/src/app.ts`.
- UI `apps/web/src/Vehiculos.tsx`, integración en `Referencias.tsx` y navegación.
- Pruebas focales `apps/api/src/vehiculos.test.ts` (11 tests, 164 assertions) y
  `tests/e2e/vehiculos.spec.ts` (PASS, capturas 1440/390). Incluye regresión de
  conversión de Anticipo con y sin ficha y comprobación del indicador.
- `bun run typecheck` PASS; `bun run build` PASS.
- Suite API completa (QA final): 177 PASS / 46 FAIL / 223 tests. Los fallos son
  guardas Linux de publicación/restore (`libc.so.6`) en macOS, la prueba real de
  backup/restore v14 UNRUN y dos flakes preexistentes de diagnóstico (R11/04). No hay
  fallo funcional nuevo de E3.3. CI Linux sigue UNRUN.
- E2E completo: 6 PASS / 2 FAIL; fallos en servidores de restauración aislada de
  catalog/movimientos por la misma guarda Linux. E2E de vehículos PASS.
- Verificación canónica: baseline PASS (57/24/8/15 regresiones, whitespace); full
  FAIL en la fase API por las guardas Linux y E2E UNRUN en macOS. No se declara PASS.
- QA independiente final sobre `90c28a7`: **APTO CON OBSERVACIONES**. Defecto
  bloqueante de Anticipo corregido (con y sin ficha histórica): indicador
  `disponible=false`, PATCH 409 `HISTORY_LOCKED`, sin `fichas_vehiculo`, conservando
  `fichas_anticipos`. AC-04 y AC-29 completados con pruebas dinámicas: alta concurrente
  real en dos procesos y carrera de segunda ficha; listado vacío y carga reales sin
  filas ni importes ficticios. **45/45 AC con PASS local; 0 FAIL funcionales.**
  Residuales R-02/R-03 menores. Linux/CI y backup/restore v14 siguen UNRUN.
- Prueba focal nueva `apps/api/src/vehiculos-backup.test.ts`: UNRUN en macOS por
  `libc.so.6`; debe ejecutarse en Linux/CI.

## Revisión externa y corrección del defecto de Anticipo

La revisión independiente del usuario encontró que la conversión de un Anticipo sin
movimientos conservaba su ficha de Anticipo y creaba otra de Vehículo. Causa: el
servicio comprobaba solo `fichas_vehiculo` y el indicador de Referencias replicaba esa
comprobación incompleta. Corrección en `referencias.ts`, `app.ts` y `vehicle-rules.ts`:
se comprueba `fichas_anticipos` y se protege todo Tipo Anticipo, con o sin ficha
histórica. Regresión API (`vehiculos.test.ts`) y E2E con fixture Anticipo. QA
independiente confirmó 409/estado sin doble ficha para ambos casos.

El handoff anterior declaró 43/45 porque AC-04 y AC-29 aún no tenían prueba dinámica
completa. Esa cobertura se añadió en `c0e0cd2` y se endureció en `90c28a7`: alta
concurrente real de dos procesos, carrera de segunda ficha con motivo de rechazo
verificado, y listado vacío/carga reales sin filas ni importes ficticios. El estado
local pasa a **45/45 AC**, pero Linux/CI y backup/restore v14 siguen UNRUN y no
acreditan un PASS completo.
