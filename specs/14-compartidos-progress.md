# 14 — Gasto compartido: Progress (Base B)

Specification: [14-compartidos-specification.md](14-compartidos-specification.md) —
base B aprobada en §14 (usuario, 2026-10-26). Brainstorming:
[14-compartidos-brainstorming.md](14-compartidos-brainstorming.md).
Test plan y mapa completo: [14-compartidos-testplan.md](14-compartidos-testplan.md).

## Current checkpoint
Current state: IN PROGRESS — implementación Base B autorizada; D5, informes/E3.6 y
despliegue excluidos. Este archivo se actualiza al cerrar cada hito.

- Authorized scope / approval source: Task `EXT-OPENCODE-DEV14-BASEB`; usuario,
  2026-10-26: «Autorizo desarrollo de base B conforme a la división integrada en
  PR74, sin D5 ni despliegue». PR74/main `f0a5219b2193283a4e3254d13c87c75c9254e845`.
  No autoriza E3.2 completa, D5, merge ni deploy.
- Repository / checkout / branch / candidate SHA and pending changes:
  `/private/tmp/myfinanzas-dev14-base-b`, rama `codex/dev14-base-b`, HEAD inicial
  limpio `f0a5219b2193283a4e3254d13c87c75c9254e845`. Sin commits de implementación
  todavía. Remoto real `github`; `origin` es clon local y no se publica.
- Client(s) / worker IDs / start-stop owners / uncontrolled workers: OpenCode,
  sesión funcional DEV14-BASEB; versión/ID técnico/modelo no verificables desde el
  entorno. Un solo escritor de código; sin subdelegación. Codex conserva
  publicación/PR/CI; Antigravity solo QA de lectura.
- Preflight / permission-sensitive operation owners / blockers: Bun 1.4.3, Python
  3.12, age 1.3.2 y Chrome disponibles según el paquete. Dependencias frozen ya
  instaladas; no se reinstalan. `TMPDIR=/private/tmp`. Sin datos reales, Excel,
  VPS, B3/Dev32 ni D5.
- Checks / QA evidence / environment: ver resultados vigentes en el testplan. Los
  tests del autor no sustituyen QA independiente.
- PR / CI / merge state, source and last verified time: sin push, PR, CI remoto ni
  merge por este ejecutor. No se reclama estado remoto.
- Next safe action: implementar por incrementos, ejecutar focales y `scripts/verify`
  según guía quality; devolver HANDOFF → CODEX con PASS/FAIL/UNRUN reales.
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
| Crear progress + testplan con 39 AC y B-T01–B-T11 antes de código | done | Este commit documental |
| Esquema v14 + migración desde v13 ficticia + backup/restore | pending | B-T01 |
| Alta atómica CAT013 + ficha, Referencias y gates por operación | pending | B-T02/B-T04/B-T09 |
| Participantes hijos, revisión, baja lógica y auditoría | pending | B-T03 |
| Motor exacto y DTO/read model central sin fuente inventada | pending | B-T05/B-T06 |
| Impacto/historia sin reescritura bancaria | pending | B-T07 |
| API protegida + UI 390/1440 + navegación | pending | B-T08/B-T09 |
| Regresiones, typecheck/build, verify y capturas | pending | B-T10 + quality |
| HANDOFF → CODEX | pending | Al cierre |

## Verified increments
Se registran aquí comandos, cwd, fecha, resultado y SHA. Sin resultados todavía.

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
Sin bloqueos al inicio. Se distinguirán FAIL, SKIP, BLOCKED y UNRUN en el testplan.
Cualquier incumplimiento obligatorio se devuelve como PARTIAL/BLOCKED con evidencia.

## Next action
See current checkpoint.
