# 20 — E4.5 Histórico precontrol y transición de ejercicio: Progress

Specification: [20-historico-precontrol-specification.md](20-historico-precontrol-specification.md)

## Current checkpoint

Current state: **candidato documental `d8b94490359bdb8065c1ce3fdc9578080c51e23e`
(45 AC) con QA focal independiente PASS y verificación canónica PASS (docs); pendiente
de aprobación del usuario y publicación por Codex; sin desarrollo.**

- Autorizado: preparar brainstorming, specification, wireframes, testplan, progress y
  QA documental independiente de E4.5, exclusivamente con datos ficticios. No autoriza
  desarrollo, aplicación, SQL, migración, importación real, Excel, PR, merge ni deploy.
- Base: `origin/main` `1d539a8cb9c38b3a8d2e3921a3651197105ce282` (2026-10-27).
- Checkout: worktree aislado temporal; rama `codex/spec20-e45-historico-precontrol`,
  creada desde `origin/main`. El checkout principal y sus cambios ajenos se preservan.
- Reserva documental: `20`; `13`–`19` están reservados por otras ramas. Antes de crear
  este checkout no se encontró rama, PR, worktree ni checkpoint de E4.5; no hay otro
  ejecutor conocido.
- E4.4 está integrada **documentalmente** en `main` `1d539a8` (#85), pero su propia
  cabecera mantiene spec/wireframes pendientes: integración no equivale a aprobación.
  Su frontera se usa como fuente, sin reabrirla. Ownership: solo documentos
  `20-historico-precontrol-*`. No se modifican `epic-board`, `project`,
  `setup-progress`, `session-handoff` ni documentos de otras entregas.
- Cliente/ejecutor: coordinador DeepSeek, sesión real
  `ses_e8571d99effev1a1aeyemjMuZ3`. QA independiente: subagente real
  `ses_e856908a8ffeAnHab97HGCHHun`, sin delegación recursiva. **Cuatro rondas base
  sobre 38 AC** (FAIL B1–B4/M1–M11, FAIL N1–N11, FAIL N12/N15/N2/N13/N16, PASS
  N17/N18) y **tres revisiones focales**: 43 AC `7e2c10d` PASS; 45 AC `c7e9d6a` FAIL
  P5/P7; 45 AC `d8b9449` PASS. Informe final vinculado a `d8b9449`; no es PASS
  funcional.
- Estado Git: candidato `d8b94490359bdb8065c1ce3fdc9578080c51e23e` sobre `main`
  `1d539a8`; sin push ni PR. Codex tiene autorización separada para publicar rama/PR;
  el merge exige aprobación propia. Solo el usuario aprueba spec/wireframes/DT7.
- Checks: `python3 scripts/verify --base 1d539a8cb9c38b3a8d2e3921a3651197105ce282
  --head d8b94490359bdb8065c1ce3fdc9578080c51e23e` **PASS** (docs; application checks
  intentionally skipped, not reported as passed). `validate-template`, `git diff
  --check`, enlaces e IDs 45/45 PASS. No hay pruebas funcionales.
- PR/CI/merge: no hay PR, CI ni merge desde OpenCode. Codex puede publicar; no se
  declara PASS funcional.
- Siguiente acción segura: Codex revisa/publica; el usuario aprueba o rechaza
  Q1–Q10/DT7 y spec/wireframes. No desarrollar E4.5 por inferencia.

## Tasks

| Task | Status | Evidence |
| --- | --- | --- |
| Preflight Git/main/ownership/reserva documental | done | `origin/main` 1d539a8cb9c38b3a8d2e3921a3651197105ce282; rama/worktree propios; 20 libre |
| Brainstorming con fuentes y Q1–Q10 | done (propuesta) | [brainstorming](20-historico-precontrol-brainstorming.md) |
| Specification, wireframes y AC | done (propuesta) | [specification](20-historico-precontrol-specification.md) |
| Testplan con casos ficticios | done (diseño) | [testplan](20-historico-precontrol-testplan.md) |
| QA documental independiente | done | Subagente `ses_e856908a8ffeAnHab97HGCHHun`; PASS de 38 AC + focales 43 AC y 45 AC (`d8b9449`) |
| Correcciones de QA | done | B1–B4/M1–M11, N1–N18, P1–P7 y m1–m7; 45/45 AC |
| Verificación canónica documental | done | `verify --head d8b9449` PASS docs; app checks skipped/UNRUN |
| Commit local y handoff a Codex | done | Candidato `d8b9449`; sin push/PR/merge |

## Verified increments

Ninguno funcional. La fase es documental.

- QA independiente `SES-QA-E45` (subagente real `ses_e856908a8ffeAnHab97HGCHHun`):
  cuatro rondas sobre 38 AC (FAIL B1–B4/M1–M11, FAIL N1–N11, FAIL N12/N15/N2/N13/N16,
  PASS N17/N18) y tres revisiones focales: 43 AC `7e2c10d` PASS P1–P4; 45 AC `c7e9d6a` FAIL P5/P7;
45 AC `d8b9449` **PASS** con jerarquía/procedencia y 409 como ejemplo. Sin hallazgos
pendientes. Resueltos: F2/subtotal y
  `conflictos[]`, cobertura por fuente/Partida, precontrol vinculado/no vinculado,
  regularización por identidad/origen, apertura sin falso cero, versiones/renombrado/
  reclasificación, fecha E2.4, aperturas de Deuda fuera de E4.5, estados
  `estadoCobertura`/`estadoTotal`, mapping sin nombre-clave, dinero céntimos/DTO,
  snapshot que recalcula cobertura, 45 AC y testplan 45/45, wireframes 390/1440.
- Comprobaciones documentales: `python3 scripts/validate-template` PASS;
  `git diff --check` PASS; enlaces/estructura PASS; AC/testplan 45/45 sin huérfanos.
- Candidato `d8b94490359bdb8065c1ce3fdc9578080c51e23e` (45 AC): `python3 scripts/verify
  --base 1d539a8cb9c38b3a8d2e3921a3651197105ce282 --head
  d8b94490359bdb8065c1ce3fdc9578080c51e23e` **PASS** (allowlisted documentation only;
  application checks intentionally skipped and **not reported as passed**). Candidatos
  históricos `a1a1c70` (38 AC) y `7e2c10d` (43 AC) conservan sus PASS docs. No hay CI
  remoto, pruebas funcionales, migración ni equivalencia con Excel.

## Decisions

- Decisiones heredadas: [brainstorming §Decisiones heredadas](20-historico-precontrol-brainstorming.md#decisiones-heredadas-que-no-se-reabren).
- Q1–Q10 y DT7: abiertas; no se convierten en aprobadas. **Solo el usuario** aprueba
  spec/wireframes/DT7; Codex revisa y publica; el merge y el desarrollo son gates
  separados. Ver [brainstorming](20-historico-precontrol-brainstorming.md) y
  [roadmap DT7](roadmap.md#decisiones-abiertas-y-puntos-de-autorización).
- No se reabren P1–P7, E1/E2.4/E4.4, la regularización 2026 como excepción ni las
  fronteras de cierre/foto.

## Errors, regressions and blockers

- **Bloqueo material:** no hay evidencia suficiente sobre el grano exacto del archivo,
  el universo (Gastos/Ingresos), el corte por fuente, el mapping real, la naturaleza/
  signo/inclusión de la regularización 2026, la deduplicación entre fuentes, el
  tratamiento de aperturas y la preferencia ante un solapamiento no separable. Se
  registran como Q1–Q10; no se rellenan con reglas inventadas.
- **Límite de autorización:** no se abre Excel, base, extracto ni archivo financiero;
  no se implementa importador ni herramienta definitiva de carga.
- No hay fallos de aplicación ni CI que registrar: no se ejecutó código.
- La aprobación de spec/wireframes, el merge documental y la autorización de desarrollo
  siguen siendo gates separados.

## Next action

Ver [Current checkpoint](#current-checkpoint). Codex revisa y puede publicar; solo el
usuario aprueba Q1–Q10/DT7 y spec/wireframes. El merge y el desarrollo son gates
separados. No desarrollar E4.5 por inferencia.
