# 14 — Gasto compartido: Progress (Base B)

Specification: [14-compartidos-specification.md](14-compartidos-specification.md) —
base B aprobada en §14 (usuario, 2026-10-26). Brainstorming:
[14-compartidos-brainstorming.md](14-compartidos-brainstorming.md).
Test plan y mapa completo: [14-compartidos-testplan.md](14-compartidos-testplan.md).

## Current checkpoint — Base B v15 compatible con main/DEV15 — 2026-10-26
Continuación autorizada por el usuario sobre PR75, sin merge ni despliegue.
Estado vigente: **CANDIDATE FOR INDEPENDENT QA / CI LINUX PENDIENTE**.

- Authorized scope / approval source: Task `EXT-OPENCODE-DEV14-BASEB`; usuario,
  2026-10-26: «Autorizo continuar el trabajo existente de Base B de Compartidos,
  resolver su compatibilidad con main y DEV15 integrado, corregir defectos dentro
  del alcance aprobado, completar QA independiente y publicar las actualizaciones
  necesarias en PR75. No autorizo merge ni despliegue.» División B aprobada en
  specification §14; PR74/main `f0a5219b2193283a4e3254d13c87c75c9254e845`.
- Repository / checkout / branch / candidate SHA: PR75
  `https://github.com/josemartin2000/myfinanzas-app/pull/75`, rama
  `codex/dev14-base-b`. Checkout aislado
  `/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/dev14-baseb`.
  Merge de compatibilidad `e205ba4` (`origin/main` `f5bf032`/DEV15 con Base B
  `fce1107`), correcciones QA `935dee9` y `e4ff2df`; el SHA de código final es
  `e4ff2df`. El commit documental posterior fija el SHA publicado.
- Ownership / previous executor: el progress anterior acredita un único escritor y
  HANDOFF completado; el checkout original `/private/tmp/myfinanzas-dev14-base-b`
  ya no existe. No había worktree activo de `codex/dev14-base-b`; el nuevo
  checkout es exclusivo del coordinador. Codex conserva revisión final, CI y
  operaciones GitHub que requieran API.
- Compatibility contract: main/DEV15 ya ocupa **v14** con `fichas_vehiculo`.
  Base B avanza a **v15**; desde v13 se ejecuta `vehicleSchema` (v14) y después
  `compartidoSchema` (v15). Una base v14 sin `fichas_vehiculo` se rechaza como
  variante desconocida. La migración v15 reconstruye también `fichas_vehiculo`,
  conserva matrícula/fechas/auditoría/triggers/FK y los tipos `Vehículo` y
  `Gasto compartido`. Backup distingue `e3.3-v14` y `e3.2-v15`.
- Checks / QA evidence: typecheck/build PASS; focal Compartidos 10/10 PASS/180
  assertions; Vehículos+cierre+Anticipos 37/37; migraciones/regresiones
  históricas 62 PASS y 4 FAIL de plataforma en el lote focal; suite API completa
  191 PASS/46 FAIL macOS (todas las observadas de plataforma `libc.so.6` o B3
  heredado); E2E Compartidos 1/1 PASS (incluye nombre de 120 y no overflow),
  Vehículos vacío 1/1, Vehículos completo 1/1 y Anticipos 1/1. Capturas
  390/1440 inspeccionadas. QA independiente: APTO tras cerrar H1/O1/H2-1.
  Detalle en el testplan.
- PR / CI / merge state: PR75 abierta; sin CI Linux del candidato verificable
  desde este entorno (no hay `gh`/API). Sin merge ni deploy. El push actualizará
  la PR; la comprobación de Actions queda para Codex si no hay acceso API.
- Next safe action: repetir E2E Vehículos, QA independiente sobre el SHA fijado y
  CI Linux. No reanudar D5/B3/Dev32 ni declarar E3.2 completo.
- Manual task states: ver tabla de Tasks y sección de compatibilidad.

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
| Compatibilidad con main/DEV15 y esquema v15 | done (local) | `e205ba4`; v13→v14→v15, v14 preservado, variante v14 rechazada |
| QA independiente del candidato fusionado | pending | Requiere SHA final y revisión de contexto nuevo |
| CI Linux de backup/restore v15 y suite completa | pending | No verificable sin API/Actions; handoff a Codex |
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


## Compatibilidad con main/DEV15 — 2026-10-26

Main `f5bf032` (PR81, DEV15 integrado) ocupa la versión **v14** con
`fichas_vehiculo`, `vehicle-rules.ts`, `vehiculos.ts` y sus rutas/UI. Base B partió
de v13 y también declaraba v14, por lo que un merge textual habría marcado como
actualizada una base con tablas o invariantes ausentes. Solución aplicada:

- `database-identity.schemaVersion` y la lista admitida pasan a **15**.
- `prepareSchema` ejecuta, por orden, `vehicleSchema` cuando la versión es <14 y
  `compartidoSchema` cuando es <15. Una v13 recorre ambos; una v14 de Vehículos
  solo ejecuta Compartidos; una instalación limpia crea ambos contratos.
- `compartidoSchema` (v14→v15) incluye `fichas_vehiculo` en la reconstrucción
  transaccional, amplía el CHECK de Referencias con `Vehículo` y
  `Gasto compartido`, y reaplica índices/triggers de ambos contratos.
- Si una base se declara v14 pero no tiene `fichas_vehiculo`, se rechaza como
  variante desconocida, se cierra y no se modifica.
- Backup identifica `e3.3-v14` para Vehículos y `e3.2-v15` para Base B; restore
  admite ambas y solo revoca `compartido_attempts` desde v15.
- `operationalReferenceTypes`, validación de Referencias, gates por operación y
  UI admiten simultáneamente `Vehículo` y `Gasto compartido`, sin abrir S000,
  D5, Exterior ni metadata de aportación.

Pruebas añadidas/actualizadas: migración v13→v15 con preservación de filas,
auditorías, identidad y FK; migración v14→v15 con ficha/matrícula/fechas de
Vehículos y auditoría; rechazo de variante v14 sin contrato; matriz de backups
con fixture v14 explícita y v15; E2E de Vehículos como regresión. El fallo de UI
detectado en esa regresión fue un cierre `}` perdido al resolver el conflicto CSS
del bloque móvil; corregido, no un defecto de producto previo.

Evidencia local macOS arm64/Bun 1.4.3 sobre `e205ba4`:

- `bun run typecheck` PASS; `bun run build` PASS (35 módulos).
- `bun test apps/api/src/compartidos.test.ts` → 10 PASS/0 FAIL/180 assertions.
- `bun test apps/api/src/vehiculos.test.ts apps/api/src/database-schema.test.ts`
  → 15 PASS/0 FAIL.
- `bun test apps/api/src/anticipos.test.ts` → 22 PASS/0 FAIL.
- Lote ciclos/nómina/planes/plan anual/concurrencia → 62 PASS/4 FAIL, los cuatro
  por `libc.so.6` en publicación/restore (plataforma).
- Suite API completa → 191 PASS/46 FAIL, todas las observadas por `libc.so.6`
  o por B3 heredado (`SQLITE_BUSY` temprano); no se relabelan como PASS.
- `playwright tests/e2e/compartidos.spec.ts` → 1/1 PASS; Vehículos vacío → 1/1
  PASS; Vehículos completo → 1/1 PASS tras la corrección CSS.
- `python3.12 scripts/verify --base origin/main --head HEAD` → baseline PASS,
  typecheck/build PASS, API 191 PASS/46 FAIL macOS (plataforma/B3), E2E UNRUN
  al detenerse la fase API; salida global FAIL, no se relabela.
- `scripts/verify` canónico y CI Linux del SHA final: pendientes en este entorno.

## QA independiente y correcciones — 2026-10-26

QA de contexto nuevo revisó primero `ad2edfe` y emitió **APTO CON RESERVAS** con
tres hallazgos dentro del alcance:

- **H1 (media):** con todos los Gastos anulados, el Bruto se presentaba como
  `0,00 Verificada` aunque no hubiera Gastos elegibles, contradiciendo «no
  inventar 0,00». Corregido: Bruto `No disponible` cuando no hay elegibles ni
  incidencias; regresión de «todos anulados».
- **O1 (baja):** sin Titular activo el estado era `Reparto parcial` pese a la
  decisión registrada «Sin repartir». Corregido: el reparto válido exige Titular;
  no se fabrican asignaciones ni coste propio. Regresión de caso solo Tercero.
- **H2 (baja):** la tabla de participantes 1440 partía palabras. Corregido con
  `overflow-wrap: normal` en métricas. La primera corrección desbordaba con
  nombres de 120 caracteres (H2-1 de la re-revisión); se limita `anywhere` a la
  celda de nombre y se añade E2E con nombre largo y aserción de no overflow.

Re-revisión independiente sobre `e4ff2df`: **APTO** en el alcance acotado.
H1/O1/H2-1 PASS, focal 10/10, typecheck PASS, E2E Compartidos 1/1, Vehículos+
Anticipos+esquema 37/37 y E2E de regresión 3/3. El E2E nuevo falla si se retira
el CSS de contención, por lo que no es tautológico. No se declara CI Linux,
suite completa ni backup/restore real: **UNRUN** en macOS.

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
- **B3 heredado:** la prueba R6 de `referencias.test.ts` volvió a observar
  `SQLITE_BUSY` temprano en `database.ts:44` sobre el candidato local. No se
  investiga, no se cambian guardas/timeouts ni se relanza a ciegas; queda como
  evidencia para Codex junto al SHA. No se atribuye a la compatibilidad v15 sin
  demostración causal.
- Sin datos reales, Excel, VPS, D5, merge ni deploy.

## Next action
See current checkpoint.
