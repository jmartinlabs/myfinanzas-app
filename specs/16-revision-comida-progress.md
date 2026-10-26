# 16 — E3.4 Revisión bancaria de Comida: progreso DEV16

Status: DEV16 autorizado por el usuario el 2026-10-26 («autorizo dev16 en opencode»).
Implementación y QA independiente del contrato integrado; sin merge, despliegue, Excel
ni datos reales. Cobertura por AC en
[16-revision-comida-testplan.md](16-revision-comida-testplan.md).

## Autorización y preflight

- Paquete: DEV16 — E3.4 Revisión bancaria de Comida.
- Base documental: PR79 + PR80; `origin/main` verificado
  `dc48f42dcee9acd0abb07fca3f80544a018d6dc9`.
- Spec integrada: [16-revision-comida-specification.md](16-revision-comida-specification.md)
  (delta E3.4 con QA independiente PASS, AC-25 abierto).
- Leídos: `AGENTS.md`, `$orchestrate`, `$dev`, reglas locales de coordinación,
  la spec 16 y las secciones aplicables de roadmap/arquitectura/UI/calidad/seguridad.
- Sin ejecución DEV16 previa: no existía `codex/dev16-*`, ni worktree asociado, ni PR
  abierta. Ramas y worktrees ajenos preservados.
- Checkout aislado:
  `/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/dev16`;
  rama `codex/dev16-revision-comida`; base `dc48f42`.
- Bun 1.4.3 (`~/.bun/bin/bun`). Python local 3.9.6; la verificación canónica exige
  3.10+ y `age`/Chromium: se registra el bloqueo o se resuelve antes de declarar PASS.
- Datos exclusivamente ficticios. Sin acceso a Excel, bases reales ni secretos.

## Alcance implementado

- Esquema técnico v14: tabla `revision_comida` (Detalle/Reposicion en una identidad
  numérica compartida), auditoría append-only, intentos24h, contador atómico y la
  posibilidad de preservar en lectura una marca histórica de doble columna
  (`fuera_presupuesto_historico`) sin campo escribible `fueraPresupuesto`.
- API autenticada MFA/Origin/CSRF con `no-store`: consulta/ficha de operaciones,
  alta, rectificación, anulación lógica y vínculo/desvínculo; consulta/ficha de
  reposiciones y las mismas mutaciones. Idempotencia y revisión obligatorias.
- Fuente `Revisión Comida` integrada en la referencia temporal central como máximo de
  operaciones vigentes; nunca usa reloj, `createdAt` ni fecha del Movimiento.
- UI `Revisión Comida`: consulta con filtros, tabla 1440 y tarjetas 390, ficha,
  formularios de alta/rectificación, anulación y vínculo; reposiciones con evidencia y
  trazabilidad `Sin asignación` (E3.5 no instalado). Sin cálculos de E3.5.
- No se crean Gastos, Movimientos, saldos paralelos, ejecución presupuestaria ni
  efectos adicionales en Saldos centrales.

## Incrementos

| # | Incremento | Estado |
| --- | --- | --- |
| I1 | Testplan/progress y matriz AC inicial | completado |
| I2 | Esquema v14, continuidad v13→v14, backup/restore y contador | completado |
| I3 | Dominio/validación/auditoría/idempotencia y fuente temporal | completado |
| I4 | API y permisos | completado |
| I5 | UI 390/1440, teclado, foco y estados | completado |
| I6 | Pruebas API/SQLite/HTTP y E2E | completado local (ver testplan) |
| I7 | Verificación canónica y QA independiente | pendiente / ver checkpoint |
| I8 | Publicación de rama y PR | pendiente |

## Checkpoints

### 2026-10-26 · I1 preflight y plan

- Base `dc48f42`; rama `codex/dev16-revision-comida`.
- Sin `progress16`/`testplan16` previos; se crean sin reutilizar documentos ajenos.
- Plan: esquema v14, fuente temporal, dominio, API, UI y pruebas; conservar los 37 AC
  y sus grupos. AC-27/34/36 no se simulan; AC-12/31 condicionales; AC-23/25 documentales.

### 2026-10-26 · I2–I6 candidato local

- Archivos principales: `apps/api/src/revision-comida-schema.ts`,
  `revision-comida-ledger.ts`, `revision-comida.ts`, `revision-comida.test.ts`,
  `apps/api/test-support/database-v13.ts` y `revision-comida-fixture.ts`,
  `apps/web/src/RevisionComida.tsx`, `tests/e2e/revision-comida.spec.ts` y
  `tests/e2e/revision-comida-server.ts`.
- Cambios de integración: `database-schema.ts`, `database-identity.ts`, `backup.ts`,
  `ciclos.ts`, `app.ts`, `main.tsx`, `Ciclos.tsx` (texto de cobertura) y `style.css`.
- Evidencia y resultados por AC en el testplan. Los contratos futuros E3.5 y los
  documentales se mantienen sin PASS.

## Pendientes y límites

- AC-25 abierto: no hay contraste físico acreditado de v5.11(7). DEV16 implementa el
  contrato de app con fixtures ficticios; no declara equivalencia, cobertura histórica
  completa ni migración.
- AC-27/34/36: E3.5 futuro; no simulados ni declarados PASS.
- AC-12/31: históricos condicionales; solo se prueba preservación con fixture sintético,
  sin presentarla como evidencia real.
- Sin merge, despliegue, Excel, datos reales ni operaciones destructivas.
- QA independiente sobre candidato fijo; si no puede activarse, se devuelve candidato y
  paquete al coordinador.

### 2026-10-26 · Candidato local verificado (I2–I6)

Base y rama:

- Worktree: `/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/dev16`.
- Rama: `codex/dev16-revision-comida`, base `dc48f42` (sin commits de otra ejecución).
- Bun 1.4.3; Python 3.12.16 y `age` 1.3.2 se usaron solo como herramientas locales de
  verificación, sin añadirlos al repositorio.

Cambios:

- Esquema v14 en `revision-comida-schema.ts`; identidad/versión actualizadas en
  `database-identity.ts` y `database-schema.ts`; backup/restore reconoce
  `e3.4-v14` y revoca `revision_comida_attempts`.
- `revision-comida-ledger.ts` y `revision-comida.ts`: lectura, fuente temporal,
  validación, matriz, evidencias, vínculo opcional, auditoría, anulación lógica,
  idempotencia, concurrencia y consulta.
- Fuente `Revisión Comida` integrada en `ciclos.ts`; `tblCiclos` sigue siendo el único
  maestro temporal y las operaciones anuladas no participan.
- API en `app.ts` con rutas de operaciones y reposiciones; MFA/Origin/CSRF, JSON 16 KiB,
  errores seguros y `no-store` heredados.
- UI `RevisionComida.tsx`, navegación y estilos; tabla 1440/tarjetas 390, ficha,
  formularios, vínculo, anulación, reposiciones, estados vacío/carga/error/409/422/404 y
  foco/teclado. `Asignar (E3.5)` visible pero deshabilitado, sin simular E3.5.
- Fixture v13 genuina para continuidad; fixture y servidor E2E ficticios.

Evidencia:

- API focal: **14 PASS / 0 FAIL / 191 expectativas**.
- Typecheck y build: **PASS**.
- E2E propio: **PASS** (MFA real, escrituras reales, 390/1440, teclado, error/conflicto,
  sin overflow). Capturas en `artifacts/e3-4/`.
- Baseline canónica: **PASS** con Python 3.12.16.
- `scripts/verify --full`: baseline/typecheck/build PASS; API **FAIL platform** por
  `libc.so.6` (publicación atómica/restore Linux) y e2e canónico UNRUN. El mismo worktree
  base `dc48f42` presenta los mismos 45 fallos, por lo que no son regresiones DEV16.
- CI Linux y restore cifrado del candidato: **UNRUN**; no se declaran PASS.
- AC-21 queda parcial (migración/reapertura PASS; restore cifrado local UNRUN).
- AC-25 sigue abierto; AC-27/34/36 no se simulan; AC-12 se prueba solo con fixture
  sintético y AC-31 sigue UNRUN/C.

## QA independiente

Pendiente de activar sobre candidato fijo. Si no se dispone de permisos/cuota para una
sesión independiente, se devuelve al coordinador el candidato, la matriz y esta evidencia;
no se autodeclara QA independiente.
