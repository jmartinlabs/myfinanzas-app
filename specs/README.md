# Document ownership and workflow

Estado vigente 2026-10-22: aplicación existente, ocho etapas cerradas, E1.1–E1.5
integradas junto a E1.6 (PR34, cb9ba3b), con QA independiente y CI de rama SUCCESS.
Spec07 E2.1 y wireframes aprobados documentalmente; PR de integración pendiente,
sin autorización de implementación.
Referencia única v5.11(7) candidata, no estable. La cronología inferior es histórica.
Coordinación v2.3.1 integrada PR32, autonomía operativa actualizada PR33: [$orchestrate](../.agents/skills/orchestrate/SKILL.md),
[contrato local](methodology/myfinanzas-coordination.md), [tablero](epic-board.md),
[evidencia/procedencia](methodology/orchestration-adoption.md). No reinicializar.

## Cronología conservada
MyFinanzas App is a derived project in initialization. Product context and technology
are confirmed in [project.md](project.md) and [architecture](guidelines/architecture.md).
The initial plan is approved and STEP 1 is implemented; see [setup progress](setup-progress.md)
and [bootstrap evidence](bootstrap.md). STEP 2 context is documented in
[context files](context-files.md). STEP 1/2 and [STEP 3 controls](automated-checks.md)
are merged. The functional reference and its current candidate/stable status are recorded
in [project.md](project.md). The workbook and original associated documentation remain
outside the repository and have not been inspected by Codex. The functional specification
attachment has been read; its [sanitized reference](functional-reference-v5.11.md) informs
the [approved STEP 4 roadmap](roadmap.md): four epics and 30 functional increments,
not necessarily 30 sprints or PRs. STEP 4 is complete. STEP 5 E1.1 is approved and merged (PR #6, main ebfe75b).
Handoff is complete; the reusable spec Skill covers STEP 6. STEP 7 `$dev 01` E1.1 is implemented and integrated via approved PR #7
for local fictional Saldos only; later financial engines remain pending. Follow [progress](01-saldos-control-progress.md) and
[43 acceptance checks](01-saldos-control-testplan.md). PR #7 was expressly approved after review of 4f7cdda on 2026-10-21.
STEP 8 is complete and integrated via approved PR #8: [dev Skill consolidation and eight-step closure](dev-skill-consolidation.md).
All eight initialization steps are closed; existing spec/dev Skills are ready for reuse.
E1.2 spec/design approved via PR #10 (0c7a87e); dev 02 local/fictional authorized.
See [progress 02](02-clasificacion-progress.md) and [testplan 02](02-clasificacion-testplan.md);
E1.2 implementation approved on 58b51f9 and integrated through PR #11;
27 current acceptance checks verified, 4 future financial contracts pending.
E1.3 spec approved and integrated via PR #12 (179942e); dev 03 authorized locally.
See [progress 03](03-ciclos-financiados-progress.md) and [testplan 03](03-ciclos-financiados-testplan.md).
E1.3 integrated via PR #13 (ff9d18d). Spec 04 approved/integrated PR #14 (5fa4ace);
dev 04 authorized locally. [Progress](04-movimientos-progress.md) / [acceptance](04-movimientos-testplan.md):
29 current criteria, AC-30–33 future. E1.4 integrated PR #15/#16; spec 05 approved PR #17
(a586fa7); dev 05 local/fictional authorized. See [progress 05](05-transferencias-referencias-progress.md)
and [tests 05](05-transferencias-referencias-testplan.md): 30 current/3 future; no E1.6 or deployment. Historical STEP 5 approval records remain attributed
in [brainstorming](01-saldos-control-brainstorming.md); no decisions reopened.

| Document | Owns | Created/updated by |
| --- | --- | --- |
| `project.md` | Purpose, users, problem, scope and references | init-project stage 1 |
| `dev-skill-consolidation.md` | STEP 8 lessons, retained behavior and eight-step closure proposal | STEP 8 |
| `setup-progress.md` | Stage status, decision links, pending questions, next action | init-project |
| `guidelines/architecture.md` | Canonical approved technology and boundary decisions with rationale | init-project / dev |
| `guidelines/ui.md` | Applicable interface conventions or explicit not-applicable reason | init-project / dev |
| `guidelines/quality.md` | Commands, checks, review and Definition of Done | bootstrap / dev |
| `guidelines/security.md` | Threats, safeguards and authorization boundaries | init-project / dev |
| `epic-board.md` | Estado/cola/gates/evidencias, nunca aprobación canónica | orchestrate, coordinador único |
| `methodology/` | Coordinación, roles, validación y procedencia de adopción | adopción / coordinador |
| `roadmap.md` | Product outcomes, proposed increments, dependencies, acceptance and approval status | roadmap |
| `functional-reference-v5.11.md` | Sanitized source provenance, financial rules and confirmed P1–P7 | STEP 4 source review |
| `NN-slug-brainstorming.md` | Append-only questions and confirmed answers | spec |
| `NN-slug-specification.md` | Approved behavior, contracts and acceptance checks | spec |
| `NN-slug-progress.md` | Implementation tasks, evidence and next action | dev |
| `NN-slug-testplan.md` | Acceptance-to-verification mapping and current results | dev |

Use two-digit identifiers (01–99) and lowercase hyphenated slugs. Allocate the next
unused number; never overwrite a document belonging to another feature. Beyond 99,
ask for an agreed migration rather than silently changing the naming scheme.
Templates live in [templates](../templates); copy them without overwriting existing work.
Recommendations are proposals, not approvals. Record approval source/date at its canonical
location. Setup progress links to decisions instead of duplicating their text.

Eight steps: bootstrap → context files → enforceable rules → roadmap → specification
→ reusable spec Skill → build → reusable dev Skill. Skills implement these repeatable
processes; the initialization walkthrough coordinates the first four steps.
