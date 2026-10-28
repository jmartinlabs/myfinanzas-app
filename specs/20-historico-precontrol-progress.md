# 20 — E4.5 Histórico precontrol y transición de ejercicio: Progress

Specification: [20-historico-precontrol-specification.md](20-historico-precontrol-specification.md)

## Current checkpoint

Current state: **PR87 Draft, rama reconciliada con `main` `7073864` mediante el merge
`4ffeb1c`; 59 AC documentales tras la enmienda D4/D14. CI `40646751271` SUCCESS sobre
`b09a372`; la reconciliación y este progress requieren una nueva ejecución CI.
Spec/wireframes pendientes de aprobación integral; DT7 independiente; sin desarrollo.**

- **Autorizado:** preparar brainstorming, specification, wireframes, testplan, progress
  y QA documental independiente de E4.5, exclusivamente con datos ficticios; aplicar la
  enmienda D4/D14 autorizada el 2026-10-28. No autoriza desarrollo, SQL, migración,
  importación real, Excel, PR, merge ni deploy.
- **Base:** `main` `7073864` (2026-10-28, esquema 18). La rama nació en `1d539a8` y se
  reconcilió con `main` mediante el merge `4ffeb1c`; no se reescribe historia.
- **Checkout:** worktree aislado `codex/spec20-e45-historico-precontrol`; el checkout
  principal y sus cambios ajenos se preservan.
- **Ownership:** solo `specs/20-historico-precontrol-*`. No se modifican `epic-board`,
  `project`, `setup-progress`, `session-handoff` ni otras entregas.
- **Ejecutor/QA histórica:** coordinador DeepSeek, sesión real
  `ses_e8571d99effev1a1aeyemjMuZ3`. QA independiente: subagente real
  `ses_e856908a8ffeAnHab97HGCHHun`, sin delegación recursiva. Cuatro rondas base sobre
  38 AC y cinco revisiones focales; PASS documental de 47 AC en `d7c36a6`, no PASS
  funcional.
- **D4/D14:** aceptadas funcionalmente por el usuario el 2026-10-28 y aplicadas en
  `302a5fe`; añaden AC-48…AC-59 y actualizan AC-04/08/29/32/36/46. Sin código. La QA
  independiente de los 12 AC nuevos no se ha ejecutado; la matriz queda UNRUN.
- **Estado Git:** PR87 Draft; sin merge; solo el usuario aprueba spec/wireframes; DT7
  sigue abierto. El head de este checkpoint es el commit de este progress.
- **Checks:** `validate-template` PASS; `test-validator` 26 tests PASS; `git diff
  --check` PASS. `verify` no se ejecutó aquí (Python 3.9.6 < 3.10): UNRUN, no FAIL. CI
  `40646751271` PASS sobre `b09a372`; nueva CI pendiente tras la reconciliación.
- **Siguiente:** aprobación de la SPEC20 completa y del testplan; después, aprobación
  expresa de merge. No desarrollar E4.5 por inferencia.

## Tasks

| Task | Status | Evidence |
| --- | --- | --- |
| Preflight Git/main/ownership/reserva documental | done | `origin/main` 1d539a8cb9c38b3a8d2e3921a3651197105ce282; rama/worktree propios; 20 libre |
| Brainstorming con fuentes y Q1–Q10 | done (confirmadas) | Q1–Q10=A y precisiones Q5; [brainstorming](20-historico-precontrol-brainstorming.md) |
| Specification, wireframes y AC | done (propuesta) | [specification](20-historico-precontrol-specification.md); 59 AC tras D4/D14 |
| Testplan con casos ficticios | done (diseño) | [testplan](20-historico-precontrol-testplan.md); 59 AC, todos UNRUN |
| QA documental independiente | done (histórica) | Subagente `ses_e856908a8ffeAnHab97HGCHHun`; PASS de 38 AC, focales 43/45 AC y PASS 47 AC (`d7c36a6`) |
| Correcciones de QA | done (histórica) | B1–B4/M1–M11, N1–N18, P1–P7, F1–F3, D1 y m1–m7; 47/47 AC |
| Enmienda D4/D14 | done (aplicada) | `302a5fe`; AC-48…AC-59; aceptada funcionalmente el 2026-10-28; sin código |
| QA independiente de 59 AC | pending | 12 AC nuevos UNRUN; no hay PASS de QA para la enmienda |
| Reconciliación con main | done | merge `4ffeb1c` con `main` `7073864`; CI nueva pendiente |
| Verificación canónica documental | done (histórica) | `verify --head 1d6d7e4` PASS docs; app checks skipped/UNRUN |
| Commit local y handoff a Codex | done (histórico) | Publicado `1d6d7e4` en PR87 Draft; sin merge |

## Verified increments

Ninguno funcional. La fase es documental.

- **Enmienda D4/D14 (2026-10-28):** aplicada en `302a5fe`; AC-48…AC-59 y ajustes de AC-04/08/29/32/36/46; `validate-template` PASS, `test-validator` 26 PASS, `git diff --check` PASS; sin QA independiente nueva y sin PASS funcional.
- **Reconciliación (2026-10-28):** merge `4ffeb1c` con `main` `7073864`; resuelve el `BEHIND` de PR87; CI nueva pendiente.
- **Revisión funcional 2026-10-27:** 47 AC (AC-46/47 nuevos; AC-32/42 actualizados); QA focal PASS en `cc201c5`/`d7c36a6`; `verify` docs PASS; no es PASS funcional.
- QA independiente `SES-QA-E45` (subagente real `ses_e856908a8ffeAnHab97HGCHHun`):
  cuatro rondas sobre 38 AC (FAIL B1–B4/M1–M11, FAIL N1–N11, FAIL N12/N15/N2/N13/N16,
  PASS N17/N18) y cuatro revisiones focales: 43 AC `7e2c10d` PASS P1–P4; 45 AC
`c7e9d6a` FAIL P5/P7; 45 AC `d8b9449` **PASS** con jerarquía/procedencia y 409 como
ejemplo; decisiones `d261af8` **PASS** con D1 corregido en `806232a`. Sin hallazgos
pendientes. Resueltos: F2/subtotal y
  `conflictos[]`, cobertura por fuente/Partida, precontrol vinculado/no vinculado,
  regularización por identidad/origen, apertura sin falso cero, versiones/renombrado/
  reclasificación, fecha E2.4, aperturas de Deuda fuera de E4.5, estados
  `estadoCobertura`/`estadoTotal`, mapping sin nombre-clave, dinero céntimos/DTO,
  snapshot que recalcula cobertura, 45 AC y testplan 45/45, wireframes 390/1440.
- Comprobaciones documentales: `python3 scripts/validate-template` PASS;
  `git diff --check` PASS; enlaces/estructura PASS; AC/testplan 45/45 sin huérfanos.
- **Q1–Q10=A confirmadas** por el usuario el 2026-10-27, con precisiones Q5; Q5-A es
  modelo documental, no autorización para una regularización concreta sin evidencia.
  DT7 sigue independiente.
- Candidato publicado `1d6d7e47851684fa3aa0a2bdc1406055548c043c` (47 AC): `python3
  scripts/verify --base 1d539a8cb9c38b3a8d2e3921a3651197105ce282 --head
  1d6d7e47851684fa3aa0a2bdc1406055548c043c` **PASS** docs; app checks intentionally
  skipped, not reported as passed. CI remoto `40502943691` FAIL por desfase de base,
  no por los documentos. Candidatos históricos `a1a1c70` (38 AC), `7e2c10d` (43 AC),
  `d8b9449`/`806232a` (45 AC) y `d7c36a6` (47 AC) conservan sus PASS docs. No hay CI
  PASS, pruebas funcionales, migración ni equivalencia con Excel.

## Decisions

- Decisiones heredadas: [brainstorming §Decisiones heredadas](20-historico-precontrol-brainstorming.md#decisiones-heredadas-que-no-se-reabren).
- **Q1–Q10=A confirmadas por el usuario el 2026-10-27**, con las precisiones Q5. Q5-A
  es modelo documental, no autorización para una regularización concreta sin evidencia.
  DT7 sigue abierto. **Solo el usuario** aprueba spec/wireframes; Codex revisa y
  publica; el merge y el desarrollo son gates separados. Ver
  [brainstorming](20-historico-precontrol-brainstorming.md) y
  [roadmap DT7](roadmap.md#decisiones-abiertas-y-puntos-de-autorización).
- **D4/D14 aceptadas funcionalmente el 2026-10-28** y aplicadas en `302a5fe`; no se
  reabren sin contradicción material documentada. La aprobación de la spec completa
  sigue pendiente.
- No se reabren P1–P7, E1/E2.4/E4.4, la regularización 2026 como excepción ni las
  fronteras de cierre/foto.

## Errors, regressions and blockers

- **Gate material pendiente:** DT7 y la evidencia concreta de mapping/corte/
  regularización 2026 siguen sin aprobarse. Q1–Q10 ya están confirmadas; no se
  rellenan datos ausentes ni se incorpora una regularización concreta sin evidencia.
- **QA de la enmienda:** los 12 AC nuevos (AC-48…AC-59) siguen UNRUN y no tienen QA
  independiente; no se declaran PASS. La QA histórica cubre 47 AC.
- **Límite de autorización:** no se abre Excel, base, extracto ni archivo financiero;
  no se implementa importador ni herramienta definitiva de carga.
- No hay fallos de aplicación: no se ejecutó código. La CI nueva tras el merge está
  pendiente; la última CI verde fue `40646751271` sobre `b09a372`.
- La aprobación de spec/wireframes, el merge documental y la autorización de desarrollo
  siguen siendo gates separados.

## Next action

Ver [Current checkpoint](#current-checkpoint). Falta la aprobación de la SPEC20
completa y del testplan; después, la aprobación expresa del merge de PR87 con el head
vigente. El desarrollo y DT7 siguen independientes. No desarrollar E4.5 por inferencia.
