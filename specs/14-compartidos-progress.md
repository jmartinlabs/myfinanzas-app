# 14 — Gasto compartido: Progress (Base B)

Specification: [14-compartidos-specification.md](14-compartidos-specification.md) —
base B aprobada en §14 (usuario, 2026-10-26). Brainstorming:
[14-compartidos-brainstorming.md](14-compartidos-brainstorming.md).
Test plan y mapa completo: [14-compartidos-testplan.md](14-compartidos-testplan.md).

## Current checkpoint
Current state: CANDIDATE FOR INDEPENDENT QA — Base B implementada y verificada
localmente en lo posible; gate local PARCIAL por límites de plataforma macOS
(backup/restore y suite completa Linux pendientes). No es aceptación de E3.2.

- Authorized scope / approval source: Task `EXT-OPENCODE-DEV14-BASEB`; usuario,
  2026-10-26: «Autorizo desarrollo de base B conforme a la división integrada en
  PR74, sin D5 ni despliegue». PR74/main `f0a5219b2193283a4e3254d13c87c75c9254e845`.
- Repository / checkout / branch / candidate SHA and pending changes:
  `/private/tmp/myfinanzas-dev14-base-b`, rama `codex/dev14-base-b`. Código
  `06cf1d85f52c`; ajuste E2E autorizado `7cefaf662837`; resultados documentales en
  el commit posterior. Sin cambios pendientes tras ese commit.
- Client(s) / worker IDs / start-stop owners / uncontrolled workers: OpenCode,
  sesión funcional DEV14-BASEB; versión/ID técnico/modelo no verificables desde el
  entorno. Un solo escritor; sin subdelegación. Codex conserva publicación/PR/CI;
  Antigravity solo QA de lectura.
- Preflight / permission-sensitive operation owners / blockers: Bun 1.4.3,
  Python 3.12, age 1.3.2 (`/tmp/myfinanzas-runtime/age`) y Chrome del sistema.
  Dependencias frozen ya instaladas. `TMPDIR=/private/tmp`. macOS no permite
  `libc.so.6`: backup/restore/producción y el cierre E2E con restauración quedan
  UNRUN/FAIL de plataforma; CI Linux es obligatorio.
- Checks / QA evidence / environment: focal Compartidos 9/9 PASS; typecheck/build
  PASS; entry `scripts/verify` baseline PASS y API 174 PASS/45 FAIL de plataforma;
  E2E propio PASS; E2E completo 6 PASS/2 FAIL (Liquidez no relacionado y
  restauración macOS). Detalle y capturas en el testplan.
- PR / CI / merge state, source and last verified time: sin push, PR, CI remoto,
  merge ni deploy por este ejecutor. No se reclama estado remoto.
- Next safe action: QA independiente revisa candidato/diff; Codex ejecuta CI Linux
  para backup/restore v14, API completa y E2E. No reanudar D5/B3/Dev32.
- Manual task states, one per task with provenance: ver tabla de Tasks.

## Scope lock (Base B)
Incluido: ficha 1:1 + participantes, alta atómica Referencia CAT013/ficha, Gasto
CAT013 con Partida e importe reales, Transferencia interna con REF y ficha sin
acreditación, motor base exacto (Bruto/Asignado/Coste propio/Pendiente estructural),
estados B, impacto/historia append-only, API/UI 390/1440, migración v13→v14 con
rollback y copias, pruebas B-T01–B-T10.

Excluido: D5/Exterior, `movimiento_compartido`, formulario/endpoint de aportación,
Quién paga acreditado, Recuperado real, Exceso positivo, atribución R-MP,
`movimiento_compartido`, informes/E3.6 (B-T11), S000 en Transferencias, datos reales,
deploy y aceptación E3.2.

## Tasks

| Task | Status | Commit / evidence |
| --- | --- | --- |
| Verificar checkout, autorización, contrato y guías | done | Base `f0a5219`; PR74 §14; guías leídas |
| Crear progress + testplan con 39 AC y B-T01–B-T11 antes de código | done | `48ca6d6`; matriz previa a código |
| Esquema v14 + migración desde v13 ficticia + backup/restore | partial | `06cf1d8`; migración/rollback/versión desconocida PASS; backup/restore v14 UNRUN macOS |
| Alta atómica CAT013 + ficha, Referencias y gates por operación | done | `06cf1d8`; B-T02/B-T04/B-T09 focales PASS |
| Participantes hijos, revisión, baja lógica y auditoría | done | `06cf1d8`; B-T03 focal PASS |
| Motor exacto y DTO/read model central sin fuente inventada | done | `06cf1d8`; B-T05/B-T06 focales PASS; D5 UNRUN |
| Impacto/historia sin reescritura bancaria | done | `06cf1d8`; B-T07 focal PASS |
| API protegida + UI 390/1440 + navegación | done | `06cf1d8`; B-T08 HTTP/E2E PASS; capturas inspeccionadas |
| Regresiones, typecheck/build, verify y capturas | partial | `06cf1d8`; tipos/build/baseline PASS; API/E2E Linux UNRUN; Liquidez ajeno registrado |
| Ajuste autorizado E2E CAT013 + recuentos | done | `7cefaf6`; Movimientos alcanza restauración macOS |
| HANDOFF → CODEX | done | Commit documental de resultados y respuesta final |

## Verified increments
2026-10-26, cwd `/private/tmp/myfinanzas-dev14-base-b`, código `06cf1d8` y ajuste
E2E `7cefaf6`:
- `bun test apps/api/src/compartidos.test.ts` → 9 PASS / 0 FAIL, 160 assertions.
  Cubre motor exacto, alta atómica/replay/rollback, participantes/revisión/baja,
  gates CAT013/S000/D5, estados/métricas sin 0 inventado, P-F6 y recálculo,
  impacto/historia, migración v13→v14 y HTTP protegido.
- `bun run typecheck` → PASS. `bun run build` → PASS (34 módulos).
- `scripts/verify --base f0a5219 --head HEAD` → baseline PASS (repository, project,
  template, checks, validator, usage, verification, whitespace), typecheck/build
  PASS; API 174 PASS / 45 FAIL de plataforma macOS (`libc.so.6`); E2E canónico
  UNRUN por detenerse antes.
- E2E `tests/e2e/compartidos.spec.ts` → 1/1 PASS con MFA real, 8 PNG 390/1440
  inspeccionadas, sin overflow, foco de impacto y contraste real ≥4,5:1.
- E2E completo → 6 PASS / 2 FAIL: `catalog` (Liquidez, ajeno) y `movimientos`
  (restauración macOS). El recorrido Movimientos/E1.5 completo hasta restauración
  pasa, incluido Gasto CAT013 con ficha compartida; el servidor 3004 falla al
  publicar/restaurar por `libc.so.6`.
- Ajustes visuales aplicados y recapturados: tabla de participantes 1440 sin
  solapamiento, tabla de impacto apilada 390, listado 1440 con anchos correctos.


## Decisions
- Se reutiliza el patrón de ficha 1:1 y auditoría de E3.1, sin copiar metadatos de
  aportación: base B no tiene fuente de Recuperado.
- La ficha conserva `revision` para concurrencia; cada cambio de participante la
  incrementa y la auditoría es append-only.
- Se admite como máximo un Titular activo por ficha (integridad estructural del rol
  único de F3); no es una regla financiera nueva. Sin Titular activo el caso queda
  «Sin repartir».
- Un Gasto vinculado a CAT013 cuya Partida no pertenece a CAT013, o cuya ficha no
  existe, se presenta «Revisar» y excluye del Bruto (P-F6); no se corrige ni se
  convierte en devolución. La resolución usa los procedimientos vigentes.
- Con terceros con cuota, Recuperado/Neto/Cobertura/Exceso/Pendiente de tercero son
  `No disponible`; nunca 0 verificado. Sin terceros con cuota, Recuperado/Exceso/
  Cobertura son `No aplica`; Neto = Bruto solo con reparto 100% Titular verificable.
- «Revisar» se expone como estado de presentación que bloquea Cerrado (W5, AC-39),
  manteniendo `estadoReparto` subyacente y sin persistir estado manual.
- La refactorización del CHECK de Referencias migra v13→v14 reconstruyendo tablas
  dependientes con copias TEMP, sin desactivar FK ni reseed.
- No se añade `Pendiente máximo`, aportación, Exterior ni informe.

## Errors, regressions and blockers
- **PLATAFORMA macOS:** `publishNewDirectory` requiere `libc.so.6`; backup/restore,
  producción y restauración E2E no se ejecutan en macOS. Afecta a B-T01 (backup/
  restore), B-T10 (API/E2E completos). Evidencia: `ERR_DLOPEN_FAILED` en
  `private-state.ts:216`, reproducido por `restore-server.ts` y por `scripts/verify`.
  CI Linux obligatorio; no se ha debilitado ni omitido ninguna guarda.
- **E2E catalog / Liquidez:** tras el primer `Space`, el switch sigue
  `aria-checked="true"` y el segundo `Space` no lo devuelve a `false`
  (`catalog.spec.ts:98`). Ocurre antes de cualquier ruta de Compartidos; `Switch` y
  `SaldoForm` no se han modificado en este candidato. Se registra como fallo ajeno,
  no se corrige para no ampliar alcance; requiere revisión/CI.
- **E2E movimientos:** el recorrido funcional pasa hasta la restauración; el
  servidor de restore no arranca por el bloqueo `libc.so.6`. Se registra UNRUN de
  plataforma, no PASS.
- Sin datos reales, Excel, VPS, D5, push, PR, merge ni deploy.

## Next action
See current checkpoint.
