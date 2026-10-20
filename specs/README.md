# Document ownership and workflow
This is an uninitialized template. No product, stack or architecture has been approved.

| Document | Owns | Created/updated by |
| --- | --- | --- |
| `project.md` | Purpose, users, problem, scope and references | init-project stage 1 |
| `setup-progress.md` | Stage status, decision links, pending questions, next action | init-project |
| `guidelines/architecture.md` | Canonical approved technology and boundary decisions with rationale | init-project / dev |
| `guidelines/ui.md` | Applicable interface conventions or explicit not-applicable reason | init-project / dev |
| `guidelines/quality.md` | Commands, checks, review and Definition of Done | bootstrap / dev |
| `guidelines/security.md` | Threats, safeguards and authorization boundaries | init-project / dev |
| `roadmap.md` | Approved product outcomes and epic scope | roadmap |
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
