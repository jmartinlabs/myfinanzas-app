# 20 — E4.5 Histórico precontrol y transición de ejercicio: Progress

Specification: [20-historico-precontrol-specification.md](20-historico-precontrol-specification.md)

## Current checkpoint

Current state: **candidato documental con QA independiente PASS, pendiente de commit,
verificación canónica y aprobación; sin desarrollo.**

- Autorizado: preparar brainstorming, specification, wireframes, testplan, progress y
  QA documental independiente de E4.5, exclusivamente con datos ficticios. No autoriza
  desarrollo, aplicación, SQL, migración, importación real, Excel, PR, merge ni deploy.
- Base: `origin/main` `1d539a8cb9c38b3a8d2e3921a3651197105ce282` (2026-10-27).
- Checkout: worktree aislado temporal; rama `codex/spec20-e45-historico-precontrol`,
  creada desde `origin/main`. El checkout principal y sus cambios ajenos se preservan.
- Reserva documental: `20`; `13`–`19` están reservados por otras ramas. Antes de crear
  este checkout no se encontró rama, PR, worktree ni checkpoint de E4.5; no hay otro
  ejecutor conocido.
- E4.4 está integrada en `main` `1d539a8` (#85); su frontera se usa como fuente, sin
  reabrirla. Ownership: solo documentos `20-historico-precontrol-*`. No se modifican
  `epic-board`, `project`, `setup-progress`, `session-handoff` ni documentos de otras
  entregas.
- Cliente/ejecutor: coordinador DeepSeek en esta sesión. QA independiente: subagente
  real `ses_e856908a8ffeAnHab97HGCHHun`, sin delegación recursiva. Tres rondas:
  FAIL documental inicial (B1–B4/M1–M11), FAIL de corrección (N1–N11) y **PASS
  documental final** tras N17/N18. No es PASS funcional.
- Estado Git: documentos sin commit; sin push ni PR. Codex gestiona la publicación y
  el único responsable del push.
- Checks: `python3 scripts/validate-template` PASS; `git diff --check` PASS; enlaces,
  IDs AC y testplan 38/38 PASS. `python3 scripts/verify` pendiente del commit candidato.
  No hay pruebas funcionales.
- PR/CI/merge: no hay PR, CI ni merge. No se declara PASS funcional.
- Siguiente acción segura: commit local, `python3 scripts/verify --base 1d539a8 --head
  <candidato>` y handoff a Codex. Después, resolver Q1–Q9/DT7 y aprobar (o rechazar)
  spec/wireframes antes de cualquier desarrollo separado.

## Tasks

| Task | Status | Evidence |
| --- | --- | --- |
| Preflight Git/main/ownership/reserva documental | done | `origin/main` 1d539a8cb9c38b3a8d2e3921a3651197105ce282; rama/worktree propios; 20 libre |
| Brainstorming con fuentes y Q1–Q9 | done (propuesta) | [brainstorming](20-historico-precontrol-brainstorming.md) |
| Specification, wireframes y AC | done (propuesta) | [specification](20-historico-precontrol-specification.md) |
| Testplan con casos ficticios | done (diseño) | [testplan](20-historico-precontrol-testplan.md) |
| QA documental independiente | done | Subagente `ses_e856908a8ffeAnHab97HGCHHun`; PASS documental final, sin delegación recursiva |
| Correcciones de QA | done | B1–B4/M1–M11, N1–N18 y m1–m7 resueltos; 38/38 AC |
| Verificación canónica documental | pending | `python3 scripts/verify --base 1d539a8cb9c38b3a8d2e3921a3651197105ce282 --head <candidato>` |
| Commit local y handoff a Codex | pending | Sin push/PR/merge |

## Verified increments

Ninguno funcional. La fase es documental.

- QA independiente `SES-QA-E45` (subagente real `ses_e856908a8ffeAnHab97HGCHHun`):
  ronda 1 FAIL documental (B1–B4, M1–M11); ronda 2 FAIL de corrección (N1–N11);
  ronda 3 final **PASS documental**, sin hallazgos nuevos. Corregidos, entre otros:
  F2/subtotal y `conflictos[]`, cobertura por fuente/Partida, precontrol vinculado/
  no vinculado, regularización por identidad/origen, apertura sin falso cero, estados
  `estadoCobertura`/`estadoTotal`, mapping sin nombre-clave, dinero céntimos/DTO,
  snapshot que recalcula cobertura, 38 AC y testplan 38/38, wireframes 390/1440.
- Comprobaciones documentales: `python3 scripts/validate-template` PASS;
  `git diff --check` PASS; enlaces/estructura PASS; AC/testplan 38/38 sin huérfanos.
- `python3 scripts/verify` y CI: **UNRUN** hasta el commit candidato. No se atribuye
  PASS de implementación, navegador, CI, migración ni equivalencia con el Excel.

## Decisions

- Decisiones heredadas: [brainstorming §Decisiones heredadas](20-historico-precontrol-brainstorming.md#decisiones-heredadas-que-no-se-reabren).
- Q1–Q9 y DT7: abiertas; no se convierten en aprobadas. Ver
  [brainstorming](20-historico-precontrol-brainstorming.md) y
  [roadmap DT7](roadmap.md#decisiones-abiertas-y-puntos-de-autorización).
- No se reabren P1–P7, E1/E2.4/E4.4, la regularización 2026 como excepción ni las
  fronteras de cierre/foto.

## Errors, regressions and blockers

- **Bloqueo material:** no hay evidencia suficiente sobre el grano exacto del archivo,
  el universo (Gastos/Ingresos), el corte por fuente, el mapping real, la naturaleza/
  signo/inclusión de la regularización 2026, la deduplicación entre fuentes y el
  tratamiento de aperturas. Se registran como Q1–Q9; no se rellenan con reglas
  inventadas.
- **Límite de autorización:** no se abre Excel, base, extracto ni archivo financiero;
  no se implementa importador ni herramienta definitiva de carga.
- No hay fallos de aplicación ni CI que registrar: no se ejecutó código.
- La aprobación de spec/wireframes, el merge documental y la autorización de desarrollo
  siguen siendo gates separados.

## Next action

Ver [Current checkpoint](#current-checkpoint). Codex debe revisar el candidato, resolver
Q1–Q9/DT7 y decidir la aprobación documental. No desarrollar E4.5 por inferencia.
