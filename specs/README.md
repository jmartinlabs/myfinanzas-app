# Document ownership and workflow
MyFinanzas App is a derived project in initialization. Product context and technology
are confirmed in [project.md](project.md) and [architecture](guidelines/architecture.md).
The initial plan is approved and STEP 1 is implemented; see [setup progress](setup-progress.md)
and [bootstrap evidence](bootstrap.md). STEP 2 context is documented in
[context files](context-files.md). STEP 1/2 and [STEP 3 controls](automated-checks.md)
are merged. The current functional reference and confirmed stable baseline are recorded
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
Wait for authorization before any next delivery; no E1.2 or deployment. Historical STEP 5 approval records remain attributed
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
